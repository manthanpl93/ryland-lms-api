const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.sendgrid.net",
  port: 587,
  auth: {
    user: "apikey",
    pass: process.env.SENDGRID_API_KEY || "YOUR_SENDGRID_API_KEY_HERE",
  },
});

async function sendTestEmail() {
  try {
    await transporter.sendMail({
      from: "your-email@example.com",
      to: "recipient@example.com",
      subject: "SendGrid SMTP Test",
      text: "This is a test email from SendGrid SMTP.",
    });
    console.log("Email sent successfully!");
  } catch (error) {
    console.error("Error sending email:", error);
  }
}

sendTestEmail();





