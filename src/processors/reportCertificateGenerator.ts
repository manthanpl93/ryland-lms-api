import RedisSubscriber from "./RedisSubscriber";
import RedisPublisher from "./RedisPublisher";
import app from "../app";
import fs from "fs";
import { sendEmail } from "../utils/email";
import { getWorkerSocket } from "../socket/sockets";
import path from "path";

const GENERATE_REPORT_TOPIC = "generateReport";
const REPORT_GENERATED_TOPIC = "reportGenerated";

const subscriber = RedisSubscriber.getInstance();
const publisher = RedisPublisher.getInstance();

subscriber.subscribe(REPORT_GENERATED_TOPIC);

export const generateReportCertificate = async (data: any) => {
  console.log("publishing for generation data", data);
  const { socketId: requestBySocketId } = data;

  let workerSocketDisconnected = false;
  try {
    const workerSocket = getWorkerSocket();
    if (!workerSocket || !workerSocket.connected) {
      workerSocketDisconnected = true;
      const socket = app.io.sockets.sockets[requestBySocketId];
      socket.emit("certificateDownloadReady", {
        isError: true,
      });
    }
  } catch (e) {
    console.log(e);
  } finally {
    if (workerSocketDisconnected) return;
  }

  publisher.publish(GENERATE_REPORT_TOPIC, JSON.stringify(data));
};

subscriber.on("message", async (channel: any, message: any) => {
  if (channel !== REPORT_GENERATED_TOPIC) return;
  await sendGenerateReport(message);
});

const sendGenerateReport = async (message: string) => {
  console.log("report generated message ========== ", message);
  const msg = JSON.parse(message);
  const { emails, socketId, success, fileLink } = msg;

  const socket = app.io.sockets.sockets[socketId];

  console.log("succes ==== ", success, " --- email --- ", emails);
  if (success) {
    try {
      socket.emit("certificateDownloadReady", {
        isReady: true,
        // data: pdfFile.toString("base64"),
        fileLink,
      });
    } catch (err) {
      console.log("socket issue while sending report to client", err);
    }

    if (emails?.length && fileLink) {
      try {
        const projectRoot = path.resolve(__dirname, "../..");
        const HTML_TEMPLATE_PATH = `${projectRoot}/report-email-template.html`;
        const file = fs.readFileSync(HTML_TEMPLATE_PATH);

        const message = file
          .toString()
          .replace("__report_link_here__", fileLink);

        await sendEmail({
          to: emails,
          subject: "Course Certificates",
          message,
        });
      } catch (err) {
        console.log("error while sending report email", err);
      }
    }
  } else {
    try {
      socket.emit("certificateDownloadReady", {
        isError: true,
      });
    } catch (e) {
      console.log(e);
    }
  }
};
