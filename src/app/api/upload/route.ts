import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(request: Request) {
  try {
    const data = await request.formData();
    const file: File | null = data.get("file") as unknown as File;

    if (!file) {
      return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save to public/materials directory
    const uploadDir = path.join(process.cwd(), "public", "materials");
    
    // Ensure directory exists
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (err) {
      // Ignore if exists
    }

    // Create a safe, unique filename
    // We preserve the extension and use a timestamp to avoid collisions
    const ext = path.extname(file.name);
    const baseName = path.basename(file.name, ext);
    // Replace only problematic characters like slashes, but keep unicode/Arabic
    const sanitizedBase = baseName.replace(/[\/\\]/g, "").replace(/\s+/g, "-") || "file";
    const safeName = `${Date.now()}-${sanitizedBase}${ext}`;
    const filepath = path.join(uploadDir, safeName);
    
    await writeFile(filepath, buffer);

    return NextResponse.json({ 
      success: true, 
      path: `/materials/${safeName}` 
    });

  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ success: false, error: "Upload failed" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get("file");

    if (!fileName) {
      return NextResponse.json({ success: false, error: "No file name provided" }, { status: 400 });
    }

    const filePath = path.join(process.cwd(), "public", "materials", fileName);
    
    // Check if file exists before deleting
    const { unlink } = await import("fs/promises");
    await unlink(filePath);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json({ success: false, error: "Delete failed" }, { status: 500 });
  }
}
