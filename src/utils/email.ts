import nodemailer from "nodemailer";
import configuration from "@feathersjs/configuration";
const { email: emailConfig } = configuration()();

type MailOptions = {
  to: string[];
  cc?: string[];
  subject: string;
  attachments?: Object[];
  html: string;
};

export const sendEmail = async ({ to, subject, message, attachments }: any) => {
  const from = emailConfig.from;
  const host = emailConfig.host;
  const port = emailConfig.port;
  const user = emailConfig.auth.user;
  const password = emailConfig.auth.password;
  const transporter = nodemailer.createTransport({
    host: host,
    port: port,
    secure: false, // true for 465, false for other ports
    auth: {
      user: user,
      pass: password,
    },
  });
  try {
    console.log("to emails =-=== ", to);
    const toEmails = to;
    const result = await transporter.sendMail({
      from,
      to: toEmails,
      subject,
      html: message,
      attachments,
    });
    console.log(
      "Email sent ---- email: ",
      JSON.stringify(toEmails),
      " --- subject: ",
      subject,
    );
    return result;
  } catch (error) {
    console.log("email error===>", error);
    return error;
  }
};
