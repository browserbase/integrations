import { logger, task } from "@trigger.dev/sdk/v3";
import { Document, Page, Text, View } from "@react-pdf/renderer";
import { renderToBuffer } from "@react-pdf/renderer";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  region: "auto",
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
  },
});

export const generateResumePDF = task({
  id: "generate-resume-pdf",
  run: async (payload: { text: string }) => {
    logger.log("Generating PDF resume", payload);

    const pdfBuffer = await renderToBuffer(
      <Document>
        <Page size="A4">
          <View>
            <Text>{payload.text}</Text>
          </View>
        </Page>
      </Document>
    );

    const s3Key = "resumes/my-resume.pdf";
    const uploadParams = {
      Bucket: process.env.S3_BUCKET,
      Key: s3Key,
      Body: pdfBuffer,
      ContentType: "application/pdf",
    };

    logger.log("Uploading to R2 with params", uploadParams);

    await s3Client.send(new PutObjectCommand(uploadParams));
    const s3Url = `https://${process.env.S3_BUCKET}.s3.amazonaws.com/${s3Key}`;
    logger.log("PDF uploaded to R2", { url: s3Url });
    return { pdfUrl: s3Url };
  },
});
