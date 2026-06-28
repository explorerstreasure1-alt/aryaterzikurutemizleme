import { NextRequest, NextResponse } from "next/server";
import { writeFile, unlink, mkdir } from "fs/promises";
import path from "path";

/**
 * POST /api/upload
 * Uploads an image to Vercel Blob storage (production) or local filesystem (dev).
 * Accepts multipart/form-data with field name "file".
 * Returns the public URL of the uploaded image.
 *
 * DELETE /api/upload
 * Deletes an image from Vercel Blob storage or local filesystem.
 * Accepts JSON body with { url: string }.
 */

/** Ensure the local uploads directory exists */
const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");
async function ensureUploadsDir() {
  try {
    await mkdir(UPLOADS_DIR, { recursive: true });
  } catch {
    // directory already exists
  }
}

/** Dynamically import @vercel/blob functions */
async function getBlobModule() {
  try {
    return await import("@vercel/blob");
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Dosya bulunamadı." }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Sadece JPEG, PNG, WebP ve GIF dosyaları kabul edilir." },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "Dosya boyutu 5MB'dan büyük olamaz." },
        { status: 400 }
      );
    }

    // Check if BLOB_READ_WRITE_TOKEN is configured
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;

    if (!blobToken) {
      // Fallback: Vercel Blob yoksa dosyayı local public/uploads/ klasörüne kaydet
      await ensureUploadsDir();
      const timestamp = Date.now();
      const ext = file.name.split(".").pop() || "jpg";
      const filename = `${timestamp}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
      const filepath = path.join(UPLOADS_DIR, filename);

      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(filepath, buffer);

      console.log(`[ARYA UPLOAD] Local kaydedildi: ${filename}`);
      return NextResponse.json({
        url: `/uploads/${filename}`,
        devMode: true,
        message: "Görsel yerel diske kaydedildi (Blob token yok).",
      });
    }

    const blobModule = await getBlobModule();
    if (!blobModule) {
      return NextResponse.json(
        { error: "Blob depolama modülü yüklenemedi." },
        { status: 500 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const ext = file.name.split(".").pop() || "jpg";
    const filename = `campaigns/${timestamp}-${Math.random().toString(36).substring(2, 8)}.${ext}`;

    // Upload to Vercel Blob
    const blob = await blobModule.put(filename, file, {
      access: "public",
      addRandomSuffix: false,
    });

    return NextResponse.json({
      url: blob.url,
      devMode: false,
    });
  } catch (error: any) {
    console.error("[ARYA BLOB] Upload error:", error);
    return NextResponse.json(
      { 
        error: error.message || "Dosya yüklenirken hata oluştu.",
        fallback: "https://images.unsplash.com/photo-1545127398-14699f92334b?auto=format&fit=crop&w=1200&q=80"
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/upload
 * Deletes an image from Vercel Blob storage by URL.
 */
export async function DELETE(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) {
      return NextResponse.json({ error: "Silinecek görsel URL'si gerekli." }, { status: 400 });
    }

    // Local file deletion
    if (url.startsWith("/uploads/")) {
      const filename = path.basename(url);
      const filepath = path.join(UPLOADS_DIR, filename);
      try {
        await unlink(filepath);
        console.log(`[ARYA UPLOAD] Local dosya silindi: ${filename}`);
      } catch {
        // file already deleted or doesn't exist — no-op
      }
      return NextResponse.json({ success: true });
    }

    // Vercel Blob deletion
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    if (!blobToken) {
      return NextResponse.json({ error: "Blob depolama yapılandırılmamış." }, { status: 400 });
    }

    const blobModule = await getBlobModule();
    if (!blobModule || !blobModule.del) {
      return NextResponse.json({ error: "Blob silme modülü yüklenemedi." }, { status: 500 });
    }

    await blobModule.del(url);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[ARYA BLOB] Delete error:", error);
    return NextResponse.json(
      { error: error.message || "Görsel silinirken hata oluştu." },
      { status: 500 }
    );
  }
}
