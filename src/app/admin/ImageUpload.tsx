"use client";

import React, { useState, useRef, useCallback } from "react";
import { Upload, X, Image as ImageIcon, Check, Link, Camera, AlertTriangle, ExternalLink } from "lucide-react";

interface ImageUploadProps {
  selectedImages: string[];
  onImagesChange: (images: string[]) => void;
  maxImages?: number;
}

/** Check if URL points to a valid reachable image */
async function validateImageUrl(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(5000) });
    const contentType = res.headers.get("content-type") || "";
    return res.ok && contentType.startsWith("image/");
  } catch {
    // Try full GET if HEAD fails (some CDNs block HEAD)
    try {
      const res = await fetch(url, { method: "GET", signal: AbortSignal.timeout(5000) });
      const contentType = res.headers.get("content-type") || "";
      return res.ok && contentType.startsWith("image/");
    } catch {
      return false;
    }
  }
}

export default function ImageUpload({
  selectedImages,
  onImagesChange,
  maxImages = 5,
}: ImageUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [customUrl, setCustomUrl] = useState("");
  const [validatingUrl, setValidatingUrl] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deletingUrls, setDeletingUrls] = useState<Set<string>>(new Set());
  const [brokenImages, setBrokenImages] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Preset images as fallback (clearly labeled as "Hazır")
  const PRESET_IMAGES = [
    {
      id: 1,
      url: "https://images.unsplash.com/photo-1545127398-14699f92334b?auto=format&fit=crop&w=1200&q=80",
      title: "Asılı Elbiseler",
    },
    {
      id: 2,
      url: "https://images.unsplash.com/photo-1489274495757-95c7c837b101?auto=format&fit=crop&w=1200&q=80",
      title: "Ütüleme",
    },
    {
      id: 3,
      url: "https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?auto=format&fit=crop&w=1200&q=80",
      title: "Temiz Giysiler",
    },
    {
      id: 4,
      url: "https://images.unsplash.com/photo-1582735689369-4fe89db7114c?auto=format&fit=crop&w=1200&q=80",
      title: "Çamaşırhane",
    },
    {
      id: 5,
      url: "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=1200&q=80",
      title: "Mont Temizliği",
    },
  ];

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  /** Upload files to server → Blob storage */
  const uploadFiles = async (files: FileList | File[]) => {
    setUploadError(null);
    const fileArray = Array.from(files);
    const remaining = maxImages - selectedImages.length;

    if (fileArray.length > remaining) {
      setUploadError(`En fazla ${remaining} dosya daha yükleyebilirsiniz.`);
      return;
    }

    // Validate files
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    const maxSize = 5 * 1024 * 1024;

    for (const file of fileArray) {
      if (!allowedTypes.includes(file.type)) {
        setUploadError("Sadece JPEG, PNG, WebP ve GIF dosyaları kabul edilir.");
        return;
      }
      if (file.size > maxSize) {
        setUploadError("Dosya boyutu 5MB'dan büyük olamaz.");
        return;
      }
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const uploadedUrls: string[] = [];
      const total = fileArray.length;

      for (let i = 0; i < total; i++) {
        const file = fileArray[i];
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Yükleme başarısız");
        }

        const data = await res.json();
        if (data.url) {
          uploadedUrls.push(data.url);
        }
        setUploadProgress(Math.round(((i + 1) / total) * 100));
      }

      if (uploadedUrls.length > 0) {
        onImagesChange([...selectedImages, ...uploadedUrls]);
      }
    } catch (err: any) {
      setUploadError(err.message || "Dosya yüklenirken hata oluştu.");
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setDragOver(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      uploadFiles(e.dataTransfer.files);
    }
  }, [selectedImages]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadFiles(e.target.files);
    }
    // Reset so same file can be re-selected
    e.target.value = "";
  };

  /** Validate and add custom URL */
  const handleAddCustomUrl = async () => {
    const url = customUrl.trim();
    if (!url) return;

    if (selectedImages.length >= maxImages) {
      setUploadError(`En fazla ${maxImages} adet görsel ekleyebilirsiniz.`);
      return;
    }

    // Check for duplicate
    if (selectedImages.includes(url)) {
      setUploadError("Bu görsel zaten eklenmiş.");
      return;
    }

    setValidatingUrl(true);
    setUploadError(null);

    const isValid = await validateImageUrl(url);
    if (!isValid) {
      setUploadError("Geçersiz görsel bağlantısı. Lütfen geçerli bir resim URL'si girin.");
      setValidatingUrl(false);
      return;
    }

    onImagesChange([...selectedImages, url]);
    setCustomUrl("");
    setValidatingUrl(false);
  };

  /** Remove image and optionally delete from Blob */
  const removeImage = async (url: string) => {
    // Optimistically remove from UI
    onImagesChange(selectedImages.filter((img) => img !== url));

    // If it's a Blob storage URL, try to delete from server
    if (url.includes("blob.vercel-storage.com") || url.includes(".public.blob.")) {
      setDeletingUrls((prev) => new Set(prev).add(url));
      try {
        await fetch("/api/upload", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
      } catch {
        // Silent fail — Blob delete is best-effort
      } finally {
        setDeletingUrls((prev) => {
          const next = new Set(prev);
          next.delete(url);
          return next;
        });
      }
    }
  };

  const togglePreset = (url: string) => {
    if (selectedImages.includes(url)) {
      onImagesChange(selectedImages.filter((img) => img !== url));
    } else {
      if (selectedImages.length >= maxImages) {
        setUploadError(`En fazla ${maxImages} adet görsel seçebilirsiniz.`);
        return;
      }
      onImagesChange([...selectedImages, url]);
      setUploadError(null);
    }
  };

  const handleImageError = (url: string) => {
    setBrokenImages((prev) => new Set(prev).add(url));
  };

  const isBlobUrl = (url: string) =>
    url.includes("blob.vercel-storage.com") || url.includes(".public.blob.") || url.includes("blob.core");

  return (
    <div className="space-y-4">
      <label className="block text-[11px] font-black uppercase opacity-80">
        Kampanya Görselleri
      </label>
      <p className="text-[10px] opacity-75">
        Görsel yükleyin, URL yapıştırın veya hazır görsellerden seçin. Maksimum {maxImages} görsel. Birden fazla görsel otomatik slayt oluşturur.
      </p>

      {/* Upload Error */}
      {uploadError && (
        <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-xs font-bold flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Drag & Drop Zone - mobile friendly */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        onTouchEnd={(e) => {
          // Prevent double-firing on mobile (click also fires)
          if (!fileInputRef.current) return;
          e.preventDefault();
          fileInputRef.current.click();
        }}
        className={`drop-zone p-6 sm:p-8 text-center transition-all cursor-pointer select-none touch-manipulation min-h-[120px] flex items-center justify-center ${
          dragOver ? "drag-over scale-[1.02]" : ""
        } ${uploading ? "opacity-60 pointer-events-none" : ""}`}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click(); }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
        />

        {uploading ? (
          <div className="space-y-3 w-full max-w-xs mx-auto">
            <div className="w-10 h-10 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-sm font-bold text-teal-600">Yükleniyor... %{uploadProgress}</p>
            <div className="w-full bg-teal-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-teal-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto">
              <Upload className="w-7 h-7 text-teal-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-teal-700">
                Görsel sürükleyip bırakın
              </p>
              <p className="text-xs text-slate-500 mt-1">
                veya tıklayarak dosya seçin &bull; mobilde kamerayı açar
              </p>
            </div>
            <p className="text-[10px] text-slate-400">
              JPEG, PNG, WebP, GIF - Maks. 5MB
            </p>
          </div>
        )}
      </div>

      {/* Custom URL Input with validation */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <input
            type="text"
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
            placeholder="Görsel linki yapıştırın..."
            className="input-field w-full px-4 py-2.5 border border-teal-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs font-semibold pr-10"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddCustomUrl();
              }
            }}
            disabled={validatingUrl}
          />
          {validatingUrl && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={handleAddCustomUrl}
          disabled={validatingUrl || !customUrl.trim()}
          className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 btn-base shrink-0"
        >
          {validatingUrl ? (
            <>Doğrulanıyor...</>
          ) : (
            <><Link className="w-3.5 h-3.5" /> Ekle</>
          )}
        </button>
      </div>

      {/* Selected Images Preview (User uploaded/pasted images only, NOT presets) */}
      {selectedImages.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Yüklenen / Eklenen Görseller ({selectedImages.length}/{maxImages}):
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {selectedImages.map((url, idx) => {
              const isDeleting = deletingUrls.has(url);
              const isBroken = brokenImages.has(url);
              const isBlob = isBlobUrl(url);

              return (
                <div
                  key={`${url}-${idx}`}
                  className={`relative group rounded-xl overflow-hidden h-20 sm:h-24 border transition-all ${
                    isBroken ? "border-rose-200 bg-rose-50" : "border-teal-200"
                  }`}
                >
                  {isBroken ? (
                    <div className="w-full h-full flex flex-col items-center justify-center text-rose-400 p-2">
                      <AlertTriangle className="w-5 h-5" />
                      <span className="text-[8px] font-bold mt-1 text-center">Görsel yüklenemedi</span>
                    </div>
                  ) : (
                    <img
                      src={url}
                      alt={`Görsel ${idx + 1}`}
                      className="w-full h-full object-cover"
                      onError={() => handleImageError(url)}
                    />
                  )}

                  {/* Delete overlay */}
                  {!isBroken && (
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeImage(url);
                        }}
                        disabled={isDeleting}
                        className="opacity-0 group-hover:opacity-100 bg-rose-600 hover:bg-rose-700 text-white p-1.5 rounded-full transition-all hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed min-w-[32px] min-h-[32px] flex items-center justify-center"
                        title={isBlob ? "Görseli sil (Blob'dan da kaldır)" : "Görseli kaldır"}
                      >
                        {isDeleting ? (
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <X className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  )}

                  {/* Index badge */}
                  <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[8px] px-1.5 py-0.5 rounded font-bold">
                    {idx + 1}
                  </div>

                  {/* Blob indicator */}
                  {isBlob && !isBroken && (
                    <div className="absolute top-1 right-1 bg-teal-600/80 text-white text-[6px] px-1 py-0.5 rounded-full font-bold uppercase">
                      Yüklendi
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Preset Images - clearly separated as "Hazır Görseller" */}
      <div className="bg-amber-50/50 rounded-2xl p-4 border border-amber-200/30">
        <p className="text-[10px] font-bold text-amber-700 mb-2 uppercase tracking-wider flex items-center gap-1.5">
          <ImageIcon className="w-3 h-3" /> Hazır Görseller (Tek Tıkla Seç)
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {PRESET_IMAGES.map((img) => {
            const isSelected = selectedImages.includes(img.url);
            return (
              <div
                key={img.id}
                onClick={() => togglePreset(img.url)}
                className={`relative cursor-pointer rounded-xl overflow-hidden h-16 border-2 transition-all touch-manipulation ${
                  isSelected
                    ? "border-teal-600 scale-95 ring-2 ring-teal-600/20"
                    : "border-transparent opacity-70 hover:opacity-100 hover:border-amber-300"
                }`}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") togglePreset(img.url); }}
              >
                <img
                  src={img.url}
                  alt={img.title}
                  className="w-full h-full object-cover pointer-events-none"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center pointer-events-none">
                  <span className="text-[8px] text-white font-bold px-1 text-center leading-tight">
                    {img.title}
                  </span>
                </div>
                {isSelected && (
                  <div className="absolute top-1 right-1 bg-teal-600 text-white p-0.5 rounded-full pointer-events-none">
                    <Check className="w-2.5 h-2.5" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
