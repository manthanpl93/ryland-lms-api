import * as AWS from "aws-sdk";
import configuration from "@feathersjs/configuration";
import { AWSConstants } from "./constants";
const { aws } = configuration()();

AWS.config.update({ region: aws.s3BucketRegion });
const s3 = new AWS.S3();
const generatePresignedUrl = async (key: string): Promise<any> => {
  const params = {
    Bucket: aws.s3BucketName,
    Key: key,
    Expires: 60 * 60,
    // ACL: "public-read",
  };

  return new Promise((resolve, reject) => {
    const replaceS3WithCouldFront = (s3Url: string) => {
      const s3HostName = `${aws.s3BucketName}.s3.${aws.s3BucketRegion}.${AWSConstants.AWS_DOMAIN}`;
      return s3Url.replace(s3HostName, aws.cloudFrontUrl);
    };
    s3.getSignedUrl("putObject", params, (error, signedUrl) => {
      if (error) {
        reject(error);
      } else {
        const url = signedUrl.substring(0, signedUrl.indexOf("?"));
        resolve({
          signedUrl,
          objectUrl: replaceS3WithCouldFront(
            signedUrl.substring(0, signedUrl.indexOf("?")),
          ),
        });
      }
    });
  });
};

export { generatePresignedUrl };
