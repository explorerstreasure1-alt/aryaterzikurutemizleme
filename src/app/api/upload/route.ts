import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/upload
 * Uploads an image to Vercel Blob storage.
 * Accepts multipart/form-data with field name "file".
 * Returns the public URL of the uploaded image.
 */
export async function POST(req: NextRequest) {
  try {
    // Check if BLOB_READ_WRITE_TOKEN is configured
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      // Fallback: return a mock response for development without Blob
      const formData = await req.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return NextResponse.json({ error: "Dosya bulunamadı." }, { status: 400 });
      }

      // In dev without blob, return a placeholder URL
      // In production, BLOB_READ_WRITE_TOKEN must be set
      console.log("[DEV] Blob token not configured. Using placeholder for:", file.name);
      return NextResponse.json({
        url: `https://images.unsplash.com/photo-1545127398-14699f92334b?auto=format&fit=crop&w=1200&q=80`,
        devMode: true,
      });
    }

    // Dynamically import @vercel/blob (only when token is present)
    const { put } = await import("@vercel/blob");

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

    // Generate unique filename
    const timestamp = Date.now();
    const ext = file.name.split(".").pop() || "jpg";
    const filename = `campaigns/${timestamp}-${Math.random().toString(36).substring(2, 8)}.${ext}`;

    // Upload to Vercel Blob
    const blob = await put(filename, file, {
      access: "public",
      addRandomSuffix: false,
    });

    return NextResponse.json({
      url: blob.url,
      devMode: false,
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error.message || "Dosya yüklenirken hata oluştu." },
      { status: 500 }
    );
  }
}
