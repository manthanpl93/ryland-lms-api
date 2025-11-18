import { tmpdir } from "os";
import app from "../app";
import createCoursesModel from "../models/courses.model";
import createApprovedCoursesModel from "../models/approved-courses.model";
import { generateRandomString } from "../utils/utilities";
import fs from "fs";
import axios from "axios";
import ffmpeg from "fluent-ffmpeg";
import * as AWS from "aws-sdk";
import configuration from "@feathersjs/configuration";
import path from "path";
const { aws } = configuration()();
import RedisSubscriber from "./RedisSubscriber";
import RedisPublisher from "./RedisPublisher";

AWS.config.update({ region: aws.s3BucketRegion });
const s3 = new AWS.S3();

const subscriber = RedisSubscriber.getInstance();
const publisher = RedisPublisher.getInstance();

const VIDEO_SUBMITTED_TOPIC = "videoSubmitted";
const VIDEO_PROCESSED_TOPIC = "videoProcessed";

const VIDEO_RESOLUTIONS = ["720p", "480p", "360p"];

const RESOLUTION_MAP: any = {
  "720p": "1280x720",
  "480p": "854x480",
  "360p": "640x360",
};

const getResolutionBandwidth = (resolution: string) => {
  if (resolution == "720p") return "5605600";
  if (resolution == "480p") return "1000000";
  if (resolution == "360p") return "600000";
};

subscriber.subscribe(VIDEO_PROCESSED_TOPIC);

export const processVideosOfCourse = async (courseId: string) => {
  console.log("----- read from db ");
  const coursesModel = createCoursesModel(app);
  const approvedCoursesModel = createApprovedCoursesModel(app);
  const approvedCourse = await approvedCoursesModel
    .findOne({
      mainCourse: courseId,
    })
    .lean();
  if (!approvedCourse) return;

  try {
    await approvedCoursesModel.findByIdAndUpdate(approvedCourse._id, {
      videoProcessing: "started",
    });

    const { outline } = approvedCourse;
    
    // Helper function to process a single lesson
    const processLesson = async (lesson: any, lessonIdx: number, outlineIdx: number, isStandalone: boolean = false) => {
      try {
        if (
          typeof lesson?.resource?.fileType == "string" &&
          lesson?.resource?.fileType.includes("video")
        ) {
          let convertedVideosDirectoryPath;
          let { videoProcessingData } = lesson;
          const { objectUrl, playlistUrl } = lesson.resource;

          console.log(
            "videoProcessingData ---- ",
            videoProcessingData,
            "----- playlistUrl --- ",
            playlistUrl,
          );
          if (!videoProcessingData && playlistUrl) {
            console.log("new code =====");
            const videoId = playlistUrl.slice(
              playlistUrl.lastIndexOf("/") + 1,
              playlistUrl.indexOf(".m3u8"),
            );

            videoProcessingData = {
              videoId,
              resolutions: ["720p", "480p", "360p"],
            };
            lesson.videoProcessingData = videoProcessingData;
          } else {
            console.log("old code ====");
            const isNewVideo = !playlistUrl;
            if (!videoProcessingData) {
              videoProcessingData = {};
              lesson.videoProcessingData = videoProcessingData;
            }
            let { videoId, resolutions } = videoProcessingData;
            if (!videoId || isNewVideo) {
              videoId = generateRandomString(16);
              videoProcessingData.videoId = videoId;
            }
            if (!resolutions || isNewVideo) {
              resolutions = [];
              videoProcessingData.resolutions = resolutions;
            }
            const missingResolution = VIDEO_RESOLUTIONS.filter(
              (r) => !resolutions.includes(r),
            );

            if (missingResolution.length) {
              console.log("publishing for conversion ==== ");
              await publisher.publish(
                VIDEO_SUBMITTED_TOPIC,
                JSON.stringify({
                  videoId,
                  objectUrl,
                  courseId,
                  missingResolution,
                  lessonIdx,
                  moduleIdx: outlineIdx,
                }),
              );
              console.log("published ----- waiting");
              const waitTillVideoConverted = async () => {
                return new Promise((resolve, reject) => {
                  subscriber.on("message", (channel: any, message: any) => {
                    if (channel !== VIDEO_PROCESSED_TOPIC) return;

                    console.log("complete by worker ", message);
                    const msg = JSON.parse(message);
                    const { videoId: convertedVideoId, status } = msg;
                    if (videoId === convertedVideoId) {
                      resolve(status);
                    }
                  });
                });
              };
              const converted = await waitTillVideoConverted();
              console.log("received ----- done --- ", converted);
              if (!converted) return;

              const playlistS3Url = `https://${aws.cloudFrontUrl}/${videoId}.m3u8`;
              lesson.resource.playlistUrl = playlistS3Url;
              resolutions.push(...missingResolution);
            }
          }

          // Update the lesson in the database
          const updatePath = isStandalone 
            ? `outline.${outlineIdx}`
            : `outline.${outlineIdx}.lessons.${lessonIdx}`;
            
          const updated = await createApprovedCoursesModel(app)
            .findByIdAndUpdate(
              approvedCourse._id,
              {
                $set: {
                  [updatePath]: lesson,
                },
              },
              {
                returnDocument: "after",
              },
            )
            .lean();

          // Update in courses model so, when update, old videos do not need to be converted
          await createCoursesModel(app).findByIdAndUpdate(courseId, {
            $set: {
              [updatePath]: lesson,
            },
          });
        }
      } catch (err) {
        console.log(
          `error occurred while converting course ${courseId} outline ${outlineIdx} lesson ${lessonIdx}`,
          err,
        );
      }
    };

    // Process all outline items
    for (const [outlineIdx, outlineItem] of outline.entries()) {
      if (outlineItem.category === "module") {
        // Process lessons within modules
        const { lessons }: { lessons: any } = outlineItem;
        for (const [lessonIdx, lesson] of lessons.entries()) {
          await processLesson(lesson, lessonIdx, outlineIdx, false);
        }
      } else if (outlineItem.category === "lesson") {
        // Process standalone lesson
        await processLesson(outlineItem, 0, outlineIdx, true);
      }
    }

    await approvedCoursesModel.findByIdAndUpdate(
      approvedCourse._id,
      { outline, videoProcessing: "finished" },
      {
        returnDocument: "after",
      },
    );
  } catch (e) {
    console.log("error while processing approved course", e);
    await approvedCoursesModel.findByIdAndUpdate(
      approvedCourse._id,
      { videoProcessing: "error" },
      {
        returnDocument: "after",
      },
    );
  }
};

export const convertVideoToResolutions = async (
  videoId: string,
  resolutions: string[] = VIDEO_RESOLUTIONS,
  originalVideoURL: string,
) => {
  const originalVideoPath: string = await downloadOriginalVideo(
    videoId,
    originalVideoURL,
  );
  const saveToPath = originalVideoPath.slice(
    0,
    originalVideoPath.lastIndexOf("/originalVideo"),
  );
  console.log("path ====== ", saveToPath);

  for (const resolution of resolutions) {
    await convertToResolution({
      videoId,
      resolution,
      videoPath: originalVideoPath,
      saveToPath,
    });
  }
  createMasterPlaylist(videoId, saveToPath);
  return saveToPath;
};

const convertToResolution = async ({
  videoId,
  resolution,
  videoPath,
  saveToPath,
}: {
  videoId: string;
  resolution: string;
  videoPath: string;
  saveToPath: string;
}) => {
  const playlistFilePath = `${saveToPath}/${videoId}_${resolution}.m3u8`;
  const resolutionValue = RESOLUTION_MAP[resolution];

  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .outputOptions(`-vf scale=${resolutionValue}`)
      .output(playlistFilePath)
      .addOptions(["-hls_playlist_type", "vod"]) // Specify VOD playlist type
      .on("end", () => {
        console.log("conversion finished ==== ");
        resolve(true);
      })
      .on("error", (err, stdout, stderr) => {
        console.error("Error: ", err);
        console.error("FFmpeg stdout: ", stdout);
        console.error("FFmpeg stderr: ", stderr);
      })
      .run();
  });
};

const createMasterPlaylist = (videoId: string, saveToPath: string) => {
  const masterPlaylist = ["#EXTM3U"];
  for (const [resolution, value] of Object.entries(RESOLUTION_MAP)) {
    masterPlaylist.push(
      `#EXT-X-STREAM-INF:BANDWIDTH=${getResolutionBandwidth(
        resolution,
      )},RESOLUTION=${value}`,
    );
    masterPlaylist.push(`${videoId}_${resolution}.m3u8`);
  }
  fs.writeFileSync(`${saveToPath}/${videoId}.m3u8`, masterPlaylist.join("\n"));
};

const downloadOriginalVideo = async (
  videoId: string,
  videoURL: string,
): Promise<string> => {
  const tempDir = tmpdir();
  const videoProcessingDir = tempDir + "/" + videoId;
  const originalVideoDir = videoProcessingDir + "/" + "originalVideo";

  if (!fs.existsSync(originalVideoDir)) {
    fs.mkdirSync(originalVideoDir, { recursive: true });
  }

  const videoFilePath = `${originalVideoDir}/${videoId}${videoURL.slice(videoURL.lastIndexOf("."))}`;

  return new Promise(async (resolve: any, reject: any) => {
    const response = await axios({
      method: "get",
      url: videoURL,
      responseType: "stream",
    });
    response.data.pipe(fs.createWriteStream(videoFilePath));
    response.data.on("end", () => {
      resolve(videoFilePath);
    });
  });
};

export const uploadConvertedVideos = async (directory: string) => {
  const directoryContents = fs.readdirSync(directory);
  const files = directoryContents.filter((f) =>
    isFile(path.join(directory, f)),
  );
  const promises = files.map(async (file) => {
    const filePath = path.join(directory, file);
    const fileStream = fs.createReadStream(filePath);
    const params = {
      Bucket: aws.s3BucketName,
      Key: file,
      Body: fileStream,
      // ACL: "public-read",
    };
    await s3.upload(params).promise();
    console.log(`File ${filePath} uploaded successfully.`);
  });
  await Promise.all(promises);
};

const isFile = (filePath: any) => {
  try {
    const stats = fs.statSync(filePath);
    return stats.isFile();
  } catch (error) {
    return false; // Ignore errors (e.g., if the path doesn't exist)
  }
};
