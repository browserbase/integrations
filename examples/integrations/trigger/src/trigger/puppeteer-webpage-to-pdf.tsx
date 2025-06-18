import { logger, task } from "@trigger.dev/sdk/v3";
import puppeteer from "puppeteer";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

// Initialize S3 client
const s3Client = new S3Client({
  region: "auto",
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
  },
});

export const puppeteerWebpageToPDF = task({
  id: "puppeteer-webpage-to-pdf",
  run: async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    const response = await page.goto("https://google.com");
    const url = response?.url() ?? "No URL found";

    // Generate PDF from the webpage
    const generatePdf = await page.pdf();

    logger.info("PDF generated from URL", { url });

    await browser.close();

    // Upload to R2
    const s3Key = `pdfs/test.pdf`;
    const uploadParams = {
      Bucket: process.env.S3_BUCKET,
      Key: s3Key,
      Body: generatePdf,
      ContentType: "application/pdf",
    };

    logger.log("Uploading to R2 with params", uploadParams);

    // Upload the PDF to R2 and return the URL.
    await s3Client.send(new PutObjectCommand(uploadParams));
    const s3Url = `https://${process.env.S3_BUCKET}.s3.amazonaws.com/${s3Key}`;
    logger.log("PDF uploaded to R2", { url: s3Url });
    return { pdfUrl: s3Url };
  },
});
