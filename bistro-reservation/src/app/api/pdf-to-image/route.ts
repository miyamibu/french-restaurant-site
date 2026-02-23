import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer";
import * as path from "path";
import * as fs from "fs";

export async function POST(request: NextRequest) {
  let browser;
  try {
    const { filePath } = await request.json();

    if (!filePath) {
      return NextResponse.json(
        { error: "filePath is required" },
        { status: 400 }
      );
    }

    // Validate file exists and is a PDF
    if (!fs.existsSync(filePath) || !filePath.endsWith(".pdf")) {
      return NextResponse.json(
        { error: "Invalid file path or not a PDF" },
        { status: 400 }
      );
    }

    // Create output directory
    const outputDir = path.join(process.cwd(), "public", "converted-images");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Generate unique filename
    const baseFileName = path.basename(filePath, ".pdf");
    const fileName = `${Date.now()}-${baseFileName}`;

    // Launch browser
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    // Open PDF file
    const fileUrl = `file://${filePath}`;
    await page.goto(fileUrl, { waitUntil: "networkidle0" });

    // Set viewport
    await page.setViewport({ width: 1200, height: 1600 });

    // Take screenshot
    const imagePath = path.join(outputDir, `${fileName}.png`);
    await page.screenshot({
      path: imagePath,
      fullPage: true,
    });

    await browser.close();

    // Return the image path
    const webImagePath = `/converted-images/${fileName}.png`;

    return NextResponse.json(
      {
        success: true,
        imagePath: webImagePath,
        message: "PDF converted successfully"
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("PDF conversion error:", error);
    return NextResponse.json(
      { error: "Failed to convert PDF to image", details: String(error) },
      { status: 500 }
    );
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}
