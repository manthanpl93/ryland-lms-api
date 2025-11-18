import { readFileSync, writeFile } from "fs";
import nodeHtmlToImage from "node-html-to-image";
import path from "path";
const generateCertificate = async (data: {
  studentName?: string;
  firstName?: string;
  lastName?: string;
  courseName?: string;
  date?: string;
  courseDuration?: string;
  instructorName?: string;
  courseDetails?: string;
  leftLogo?: string;
  centerLogo?: string;
  designationTitle?: string;
  designationSubTitle?: string;
  courseTitle?: string;
}) => {
  console.log("Generate Certificate", data);
  const {
    firstName,
    lastName,
    courseName,
    date,
    instructorName,
    courseDetails,
    courseDuration,
    leftLogo,
    centerLogo,
    designationTitle,
    designationSubTitle,
    courseTitle,
  } = data;
  const projectRoot = path.resolve(__dirname, "../..");
  const IMAGE_TEMPLATE_PATH = `${projectRoot}/certificate.png`;

  // const latoBoldBase64 = "";
  // const konigsbergBase64 = "";
  const fontsDirectory = path.resolve(__dirname, "../../fonts");

  const fontFamily4 = readFileSync(
    fontsDirectory + "/GoodVibrationsScript.ttf"
  ).toString("base64");

  const fontFamily5 = readFileSync(
    fontsDirectory + "/CertificateNameFont.otf"
  ).toString("base64");

  const style = `
  @font-face {
    font-family: "GoodVibrationsScript";
    src: url("data:font/truetype;charset=utf-8;base64,${fontFamily4}") format('truetype');
  }
  @font-face {
    font-family: "CertificateNameFont";
    src: url("data:font/truetype;charset=utf-8;base64,${fontFamily5}") format('opentype');
  }

  body {
    color: #414143
  }
  .certificate-container {
    position: relative;
  }
  .child-name-container {
    position: absolute;
    top: 736px;
    left: 1028px;
    /* background-color: yellow; */
    width: 860px;
    height: 80px;
    display: table;
  }
  .child-name {
    font-size: 48px;
    font-family: sans-serif;
    /* background-color: green; */
    text-align: center;
    justify-content: center;
    display: table-cell;
    vertical-align: middle;
    color: dimgray;
    letter-spacing: 2px;
    text-transform: capitalize;
  }


  .duration-container {
    position: absolute;
    top: 890px;
    left: 600px;
    width: 1700px;
    /* background-color: red; */
    justify-content:center;
    height: 50px;
    display: flex;
  
    align-items: center;
    font-family: sans-serif;
  }
  .duration {
    font-size: 40px;
    color: gray;
  }

  .course-name-container {
    position: absolute;
    top: 940px;
    left: 620px;
    /* background-color: green; */
    width: 1700px;
    height: 140px;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  .course-name {
    font-size: 86px;
    font-weight: bold;
    color: dimgray;
    font-family: CertificateNameFont;
  }

  .course-details-container {
    position: absolute;
    top: 1122px;
    left: 500px;
    /* background-color: blue; */
    width: 1910px;
    height: 220px;
    display: flex;
    justify-content: center;
  }
  .course-details {
    font-size: 42px;
    text-align: center;
    color: dimgray;
    font-family: sans-serif;
    letter-spacing: 2px;
  }

  .course-date-container {
    position: absolute;
    top: 1450px;
    left: 1038px;
    /* background-color: cyan; */
    width: 828px;
    height: 50px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .course-date {
    font-size: 46px;
    color: dimgray;
    font-family: sans-serif;
    letter-spacing: 2px;
  }

.instructor-name-container {
    height: 180px;
    position: absolute;
    bottom: 275px;
    left: 1770px;
    width: 780px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
}
  .instructor-name {
    font-size: 72px;
    font-weight: bold;
    font-family: GoodVibrationsScript;
    color: dimgray;
  }

  .left-logo {
      height: 300px;
      position: absolute;
      bottom: 200px;
      left: 500px;
      object-fit: cover;
  }

  .center-logo {
      position: absolute;
      width: 220px;
      bottom: 230px;
      left: 1350px;
      border-radius: 110px;
      height: 220px;
      object-fit: cover;
  }

  .designation-subtitle {
      position: absolute;
      top: 1820px;
      font-size: 50px;
      left: 1810px;
      width: 700px;
      background: #ffffff;
      text-align: center;
  }

  .designation-title  {
    /* position: absolute; */
    // bottom: 200px;
    font-size: 50px;
    // left: 2050px;
    /* width: 300px; */
    /* background: white; */
    text-align: center;
    margin-left: 22px;
}
  `;

  const template = `
  <html>
    <head>
      <title>Page Title</title>
      <style>
        ${style}
      </style>
    </head>
    <body>
      <div id="main" class="certificate-container">
        <div class="child-name-container">
          <div class="child-name">${firstName} ${lastName}</div>
        </div>

        <div class="duration-container">
          <div class="duration">For Successfully completing ${courseDuration} hours of ${courseTitle} covering the following topics:</div>
        </div>

        <div class="course-name-container">
          <div class="course-name">${courseName}</div>
        </div>

        <div class="course-details-container">
          <div class="course-details">${courseDetails}</div>
        </div>

        <div class="course-date-container">
          <div class="course-date">${date}</div>
        </div>

        <div class="instructor-name-container">
          <div class="instructor-name">${instructorName}</div>
          <div class="designation-title">${designationTitle}</div>
        </div>

       <div class="designation-subtitle">${designationSubTitle}</div>

        <div>
          <img  class="left-logo" src=${leftLogo} alt="course">
        </div>

         <div>
           <img class="center-logo" src=${centerLogo} alt="course">
        </div>

        <img class="certificate-image" src="data:image/jpeg;base64,${readFileSync(
    IMAGE_TEMPLATE_PATH
  ).toString("base64")}" />
      </div>
    </body>
  </html>
  `;

  const publicDir = path.resolve(__dirname, "../../public");
  const certificatesDir = publicDir + "/certificates";
  const fileName = `${new Date().getTime()}-${`${firstName}_${lastName}`
    ?.replace(/[^\w\s]/gi, "_")
    .replace(/\s+/g, "_")}.png`;
  const filePath = `${certificatesDir}/${fileName}`;

  // writeFile(filePath + ".html", template, "utf8", function (err) {
  //   if (err) {
  //     console.log("An error occurred while generating certificate.");
  //     return console.log(err);
  //   }
  //   console.log("Certificate generated");
  // });

  await nodeHtmlToImage({
    output: filePath,
    html: template,
    puppeteerArgs: {
      defaultViewport: {
        width: 2932,
        height: 1945,
      },
      args: ["--no-sandbox"],
    },
  });

  return { path: filePath.split("/public/")[1], absolutePath: filePath };
};

export default generateCertificate;
