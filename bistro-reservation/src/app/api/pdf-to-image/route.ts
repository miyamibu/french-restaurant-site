import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer";
import * as path from "path";
import * as fs from "fs";
import { isAuthorized } from "@/lib/basic-auth";

export async function POST(request: NextRequest) {
  let browser;
  try {
    // ⚠️ CRITICAL: Require authentication
    if (!isAuthorized(request)) {
      return NextResponse.json(
        { error: "Unauthorized - authentication required" },
        { status: 401 }
      );
    }

    const { filePath } = await request.json();

    if (!filePath) {
      return NextResponse.json(
        { error: "filePath is required" },
        { status: 400 }
      );
    }

    // ⚠️ CRITICAL: Path Traversal Prevention
    // 1. Define allowed base directory (should be restricted to a specific folder)
    const allowedBaseDir = path.resolve(process.cwd(), "public", "photos");
    const resolvedFilePath = path.resolve(filePath);

    // 2. Verify the resolved path is within allowed directory
    if (!resolvedFilePath.startsWith(allowedBaseDir)) {
      console.warn(`Attempted path traversal: ${filePath} -> ${resolvedFilePath}`);
      return NextResponse.json(
        { error: "Invalid file path - access denied" },
        { status: 403 }
      );
    }

    // 3. Verify file exists, is a PDF, and is not a symlink
    if (!fs.existsSync(resolvedFilePath)) {
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      );
    }

    const stats = fs.statSync(resolvedFilePath);
    
    // Prevent symlink traversal
    if (stats.isSymbolicLink()) {
      console.warn(`Attempted symlink access: ${resolvedFilePath}`);
      return NextResponse.json(
        { error: "Symlinks are not allowed" },
        { status: 403 }
      );
    }

    // Verify it's a regular file and a PDF
    if (!stats.isFile() || !resolvedFilePath.endsWith(".pdf")) {
      return NextResponse.json(
        { error: "Invalid file - must be a PDF file" },
        { status: 400 }
      );
    }

    // ⚠️ CRITICAL: File size limit (prevent DoS - Puppeteer uses significant memory)
    const MAX_PDF_SIZE = 50 * 1024 * 1024; // 50 MB
    if (stats.size > MAX_PDF_SIZE) {
      return NextResponse.json(
        {
          error: "File too large",
          details: `Maximum file size is ${MAX_PDF_SIZE / (1024 * 1024)}MB`,
        },
        { status: 413 }
      );
    }

    // Create output directory
    const outputDir = path.join(process.cwd(), "public", "converted-images");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Generate unique filename
    const baseFileName = path.basename(resolvedFilePath, ".pdf");
    const fileName = `${Date.now()}-${baseFileName}`;

    // Launch browser
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    // ⚠️ CRITICAL: Use validated/resolved path only
    // Ensure absolute path is used with file:// protocol
    const fileUrl = `file://${resolvedFilePath}`;
    
    // Set a timeout for the PDF loading to prevent DoS
    try {
      await page.goto(fileUrl, { 
        waitUntil: "networkidle0",
        timeout: 30000, // 30 second timeout
      });
    } catch (navigationError) {
      console.error(`Failed to load PDF: ${resolvedFilePath}`, navigationError);
      return NextResponse.json(
        { error: "Failed to load PDF - may be corrupted or invalid" },
        { status: 400 }
      );
    }

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
