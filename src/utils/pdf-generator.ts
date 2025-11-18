import fs from "fs";
import PDFDocument from "pdfkit";
import sizeOf from "image-size";

export const generatePDF = async (imagePath: string) => {
  return new Promise((resolve, reject) => {
    const pdfPath = imagePath.replace(".png", ".pdf");

    // Get the dimensions of the image
    const { width, height }: any = sizeOf(imagePath);

    // Create a PDF document
    const doc = new PDFDocument({ size: [width, height] });

    // Embed the image into the PDF
    doc.image(imagePath, 0, 0);

    // Pipe the PDF content to a writable stream
    const stream = fs.createWriteStream(pdfPath);
    doc.pipe(stream);

    // Finalize the PDF document
    doc.end();

    // Handle errors
    stream.on("error", (err) => {
      console.error("Error creating PDF:", err);
      reject();
    });

    stream.on("finish", () => {
      // console.log("PDF saved:", pdfPath);
      resolve({ absolutePath: pdfPath });
    });
  });
  // Path to the output PDF file
};
