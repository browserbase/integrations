import { NextResponse } from "next/server";
import { exec } from "child_process";
import util from "util";
import fs from "fs";
import path from "path";

const execPromise = util.promisify(exec);

export async function GET() {
  const pdfUrl = "https://pdfobject.com/pdf/sample.pdf";
  const documentId = "unique-document-id";

  try {
    // Create temp directory
    const tempDir = path.join(process.cwd(), "temp");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }

    // Download PDF
    const pdfPath = path.join(tempDir, `${documentId}.pdf`);
    await execPromise(`curl -o ${pdfPath} ${pdfUrl}`);

    // Convert PDF to images
    const outputDir = path.join(tempDir, documentId);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }
    await execPromise(`mutool convert -o ${outputDir}/page-%d.png ${pdfPath}`);

    // List generated images
    const images = fs.readdirSync(outputDir);

    // Clean up
    fs.unlinkSync(pdfPath);
    images.forEach((img) => fs.unlinkSync(path.join(outputDir, img)));
    fs.rmdirSync(outputDir);

    return NextResponse.json({
      message: "PDF converted to images successfully",
      imageCount: images.length,
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Failed to convert PDF" },
      { status: 500 }
    );
  }
}
