import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/upload
 * Uploads an image to Vercel Blob storage (production) or returns a base64 data URL (dev).
 * Accepts multipart/form-data with field name "file".
 * Returns the public URL / data URL of the uploaded image.
 *
 * DELETE /api/upload
 * Deletes an image from Vercel Blob storage.
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
      // Fallback: Vercel Blob yoksa base64 data URL döndür.
      // Bu yöntem hem local'de hem Vercel serverless'da sorunsuz çalışır.
      const buffer = Buffer.from(await file.arrayBuffer());
      const base64 = buffer.toString("base64");
      const dataUrl = `data:${file.type};base64,${base64}`;

      console.log(`[ARYA UPLOAD] Base64 data URL oluşturuldu: ${file.name} (${(base64.length / 1024).toFixed(0)} KB)`);
      return NextResponse.json({
        url: dataUrl,
        devMode: true,
        message: "Görsel base64 data URL olarak döndürüldü (Blob token yok).",
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
