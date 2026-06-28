"use client";

import React, { useState, useRef, useCallback } from "react";
import { Upload, X, Image as ImageIcon, Check, Link } from "lucide-react";

interface ImageUploadProps {
  selectedImages: string[];
  onImagesChange: (images: string[]) => void;
  maxImages?: number;
}

export default function ImageUpload({
  selectedImages,
  onImagesChange,
  maxImages = 5,
}: ImageUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [customUrl, setCustomUrl] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Preset images as fallback
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

    try {
      const uploadedUrls: string[] = [];

      for (const file of fileArray) {
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
        uploadedUrls.push(data.url);
      }

      onImagesChange([...selectedImages, ...uploadedUrls]);
    } catch (err: any) {
      setUploadError(err.message || "Dosya yüklenirken hata oluştu.");
    } finally {
      setUploading(false);
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
  };

  const handleAddCustomUrl = () => {
    if (!customUrl.trim()) return;
    if (selectedImages.length >= maxImages) {
      setUploadError(`En fazla ${maxImages} adet görsel ekleyebilirsiniz.`);
      return;
    }
    onImagesChange([...selectedImages, customUrl.trim()]);
    setCustomUrl("");
    setUploadError(null);
  };

  const removeImage = (url: string) => {
    onImagesChange(selectedImages.filter((img) => img !== url));
  };

  const togglePreset = (url: string) => {
    if (selectedImages.includes(url)) {
      removeImage(url);
    } else {
      if (selectedImages.length >= maxImages) {
        setUploadError(`En fazla ${maxImages} adet görsel seçebilirsiniz.`);
        return;
      }
      onImagesChange([...selectedImages, url]);
      setUploadError(null);
    }
  };

  return (
    <div className="space-y-4">
      <label className="block text-[11px] font-black uppercase opacity-80">
        Kampanya Görselleri
      </label>
      <p className="text-[10px] opacity-75">
        Görselleri sürükleyip bırakın veya tıklayarak seçin. Maksimum {maxImages} görsel. Birden fazla görsel otomatik slayt oluşturur.
      </p>

      {/* Upload Error */}
      {uploadError && (
        <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-xs font-bold">
          {uploadError}
        </div>
      )}

      {/* Drag & Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`drop-zone p-8 text-center transition-all ${
          dragOver ? "drag-over scale-[1.02]" : ""
        } ${uploading ? "opacity-60 pointer-events-none" : ""}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

        {uploading ? (
          <div className="space-y-3">
            <div className="w-10 h-10 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-sm font-bold text-teal-600">Yükleniyor...</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto">
              <Upload className="w-7 h-7 text-teal-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-teal-700">
                Görsel sürükleyip bırakın
              </p>
              <p className="text-xs text-slate-500 mt-1">
                veya tıklayarak dosya seçin
              </p>
            </div>
            <p className="text-[10px] text-slate-400">
              JPEG, PNG, WebP, GIF - Maks. 5MB
            </p>
          </div>
        )}
      </div>

      {/* Custom URL Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={customUrl}
          onChange={(e) => setCustomUrl(e.target.value)}
          placeholder="Görsel linki yapıştırın..."
          className="input-field flex-1 px-4 py-2.5"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAddCustomUrl();
            }
          }}
        />
        <button
          type="button"
          onClick={handleAddCustomUrl}
          className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 btn-base"
        >
          <Link className="w-3.5 h-3.5" /> Ekle
        </button>
      </div>

      {/* Preset Images Grid */}
      <div>
        <p className="text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-wider">
          Hazır Görseller:
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {PRESET_IMAGES.map((img) => {
            const isSelected = selectedImages.includes(img.url);
            return (
              <div
                key={img.id}
                onClick={() => togglePreset(img.url)}
                className={`relative cursor-pointer rounded-xl overflow-hidden h-16 border-2 transition-all ${
                  isSelected
                    ? "border-teal-600 scale-95 ring-2 ring-teal-600/20"
                    : "border-transparent opacity-70 hover:opacity-100"
                }`}
              >
                <img
                  src={img.url}
                  alt={img.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <span className="text-[8px] text-white font-bold px-1 text-center leading-tight">
                    {img.title}
                  </span>
                </div>
                {isSelected && (
                  <div className="absolute top-1 right-1 bg-teal-600 text-white p-0.5 rounded-full">
                    <Check className="w-2.5 h-2.5" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Images Preview */}
      {selectedImages.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Seçilen Görseller ({selectedImages.length}/{maxImages}):
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {selectedImages.map((url, idx) => (
              <div key={idx} className="relative group rounded-xl overflow-hidden h-20 border border-teal-200">
                <img
                  src={url}
                  alt={`Görsel ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeImage(url);
                    }}
                    className="opacity-0 group-hover:opacity-100 bg-rose-600 text-white p-1.5 rounded-full transition-all hover:scale-110"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[8px] px-1.5 py-0.5 rounded font-bold">
                  {idx + 1}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
