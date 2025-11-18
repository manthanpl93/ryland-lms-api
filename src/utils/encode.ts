import path from "path";
import fs from "fs";
import axios from "axios";
import ffmpeg from "fluent-ffmpeg";
import * as AWS from "aws-sdk";
import configuration from "@feathersjs/configuration";
const { aws } = configuration()();

AWS.config.update({ region: "us-east-2" });
const s3 = new AWS.S3();

const getResolutionBandwidth = (resolution: string) => {
  if (resolution == "720p") return "5605600";
  if (resolution == "480p") return "1000000";
  if (resolution == "360p") return "600000";
};

const resolutionsMap: any = {
  "720p": "1280x720",
  "480p": "854x480",
  "360p": "640x360",
};

const getVideoAndEncode = async (inputVideoUrl: string, videoId: string) => {
  return new Promise(async (resolve, reject) => {
    try {
      let resolutionEncodedTrack = 0;
      const resolutions = ["720p", "480p", "360p"];
      const outputDirectory = `${__dirname}/encodeVideos/${videoId}`;
      const outputMasterM3u8 = `${outputDirectory}/${videoId}.m3u8`;

      if (!fs.existsSync(outputDirectory)) {
        fs.mkdirSync(outputDirectory, { recursive: true });
        fs.mkdirSync(`${outputDirectory}/originalVideo`, { recursive: true });
      }

      const masterPlaylist = ["#EXTM3U"];

      const response = await axios({
        method: "get",
        url: inputVideoUrl,
        responseType: "stream",
      });
      // Pipe the response stream to a file
      const filePath = path.join(
        outputDirectory,
        `originalVideo/${videoId}.mp4`,
      );
      response.data.pipe(fs.createWriteStream(filePath));

      response.data.on("end", () => {
        // Process the downloaded video file
        resolutions.forEach((resolution) => {
          const outputPath = `${outputDirectory}`;
          const outputFileName = `${videoId}_${resolution}.m3u8`;

          // Create resolution-specific subdirectory
          if (!fs.existsSync(outputPath)) {
            fs.mkdirSync(outputPath, { recursive: true });
          }

          // Generate HLS stream for each resolution
          const resolutionValue = resolutionsMap[resolution];
          ffmpeg(filePath)
            .outputOptions(`-vf scale=${resolutionValue}`)
            .output(`${outputPath}/${outputFileName}`)
            .addOptions(["-hls_playlist_type", "vod"]) // Specify VOD playlist type
            .on("end", () => {
              console.log(`Processing for ${resolution} finished`);
              resolutionEncodedTrack = resolutionEncodedTrack + 1;
              if (resolutionEncodedTrack === 3) {
                resolve(true);
              }
            })
            .on("error", (err, stdout, stderr) => {
              console.error("Error: ", err);
              console.error("FFmpeg stdout: ", stdout);
              console.error("FFmpeg stderr: ", stderr);
            })
            .run();

          // Add a reference to the resolution-specific playlist in the master playlist
          masterPlaylist.push(
            `#EXT-X-STREAM-INF:BANDWIDTH=${getResolutionBandwidth(
              resolution,
            )},RESOLUTION=${resolutionsMap[resolution]}\n${outputFileName}`,
          );
        });

        // Write the master playlist to the output file
        fs.writeFileSync(outputMasterM3u8, masterPlaylist.join("\n"));

        console.log(`Master HLS playlist created at: ${outputMasterM3u8}`);
      });
    } catch (error) {
      reject(error);
    }
  });
};
const isFile = (filePath: any) => {
  try {
    const stats = fs.statSync(filePath);
    return stats.isFile();
  } catch (error) {
    return false; // Ignore errors (e.g., if the path doesn't exist)
  }
};
async function uploadFiles(folderPath: any) {
  try {
    let files = fs.readdirSync(folderPath);
    files = files.filter((file) => {
      const filePath = path.join(folderPath, file);
      return isFile(filePath);
    });
    const uploadPromises = files.map(async (file) => {
      const filePath = path.join(folderPath, file);

      const fileStream = fs.createReadStream(filePath);
      const params = {
        Bucket: aws.s3BucketName,
        Key: file,
        Body: fileStream,
        // ACL: "public-read",
      };

      // Use the `upload` method of the S3 SDK to upload files
      await s3.upload(params).promise();
      console.log(`File ${filePath} uploaded successfully.`);
    });

    await Promise.all(uploadPromises);

    fs.rmdir(folderPath, { recursive: true }, (err) => {
      console.log(err);
    });

    console.log("All files in the folder uploaded successfully.");
  } catch (error) {
    console.error("Error:", error);
  }
}

const encode = async (inputVideoUrl: string, videoId: string) => {
  // getVideoAndEncode(inputVideoUrl, videoId)
  //   .then(() => {
  //     const encodedVideosPath = `${__dirname}/encodeVideos/${videoId}`;
  //     uploadFiles(encodedVideosPath);
  //   })
  //   .catch((error) => {
  //     throw error;
  //   });
  await getVideoAndEncode(inputVideoUrl, videoId);
  const encodedVideosPath = `${__dirname}/encodeVideos/${videoId}`;
  await uploadFiles(encodedVideosPath);
};

export default encode;
