import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/upload
 * Uploads a file (image or audio) to Vercel Blob storage (production) or returns a base64 data URL (dev).
 * Accepts multipart/form-data with field name "file".
 * Returns the public URL / data URL of the uploaded file.
 *
 * GET /api/upload?prefix=campaigns
 * Lists uploaded files from Vercel Blob storage by prefix.
 * Returns array of { url, pathname, uploadedAt, size }.
 *
 * DELETE /api/upload
 * Deletes a file from Vercel Blob storage.
 * Accepts JSON body with { url: string }.
 * Base64 data URLs are simply removed from the array client-side, no server action needed.
 */

/** Dynamically import @vercel/blob functions */
async function getBlobModule() {
  try {
    return await import("@vercel/blob");
  } catch {
    return null;
  }
}

/** Allowed image MIME types */
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/** Allowed audio MIME types */
const AUDIO_TYPES = ["audio/mpeg", "audio/wav", "audio/ogg", "audio/mp3", "audio/x-wav"];

/** Determine upload folder prefix based on file type */
function getUploadPrefix(fileType: string): string {
  if (AUDIO_TYPES.includes(fileType)) return "music";
  return "campaigns"; // images
}

export async function GET(req: NextRequest) {
  try {
    const prefix = req.nextUrl.searchParams.get("prefix") || "campaigns";

    const blobModule = await getBlobModule();
    if (!blobModule || !blobModule.list) {
      return NextResponse.json({
        blobs: [],
        message: "Blob listeleme kullanılamıyor (token yok veya modül eksik).",
      });
    }

    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    if (!blobToken) {
      return NextResponse.json({
        blobs: [],
        message: "Blob depolama yapılandırılmamış. Dosyalar base64 olarak saklanıyor.",
      });
    }

    const { blobs } = await blobModule.list({ prefix });
    const mapped = blobs.map((b: any) => ({
      url: b.url,
      pathname: b.pathname,
      uploadedAt: b.uploadedAt,
      size: b.size,
    }));

    return NextResponse.json({ blobs: mapped });
  } catch (error: any) {
    console.error("[ARYA BLOB] List error:", error);
    return NextResponse.json({ blobs: [], error: error.message });
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Dosya bulunamadı." }, { status: 400 });
    }

    const ALLOWED_TYPES = [...IMAGE_TYPES, ...AUDIO_TYPES];

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      const errMsg = file.type.startsWith("audio/")
        ? "Sadece MP3, WAV ve OGG dosyaları kabul edilir."
        : "Sadece JPEG, PNG, WebP ve GIF dosyaları kabul edilir.";
      return NextResponse.json({ error: errMsg }, { status: 400 });
    }

    // Size limit: 5MB for images, 15MB for audio
    const isAudio = AUDIO_TYPES.includes(file.type);
    const maxSize = isAudio ? 15 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSize) {
      const label = isAudio ? "15MB" : "5MB";
      return NextResponse.json(
        { error: `Dosya boyutu ${label}'dan büyük olamaz.` },
        { status: 400 }
      );
    }

    // Check if BLOB_READ_WRITE_TOKEN is configured
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;

    if (!blobToken) {
      // Fallback: Base64 data URL (for dev / no Blob environment)
      const buffer = Buffer.from(await file.arrayBuffer());
      const base64 = buffer.toString("base64");
      const dataUrl = `data:${file.type};base64,${base64}`;

      console.log(`[ARYA UPLOAD] Base64 data URL oluşturuldu: ${file.name} (${(base64.length / 1024).toFixed(0)} KB)`);
      return NextResponse.json({
        url: dataUrl,
        devMode: true,
        message: `Dosya base64 data URL olarak döndürüldü (Blob token yok).`,
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
    const prefix = getUploadPrefix(file.type);
    const timestamp = Date.now();
    const ext = file.name.split(".").pop() || (isAudio ? "mp3" : "jpg");
    const filename = `${prefix}/${timestamp}-${Math.random().toString(36).substring(2, 8)}.${ext}`;

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
    console.error("[ARYA UPLOAD] Upload error:", error);
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
 * Base64 data URL'ler client'ta array'den çıkarılır, sunucuda işlem gerekmez.
 */
export async function DELETE(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) {
      return NextResponse.json({ error: "Silinecek görsel URL'si gerekli." }, { status: 400 });
    }

    // Base64 data URL'ler client tarafında zaten kaldırılır
    if (url.startsWith("data:")) {
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
