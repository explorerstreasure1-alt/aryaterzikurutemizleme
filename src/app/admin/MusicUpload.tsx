"use client";

import React, { useState, useRef, useCallback } from "react";
import { Upload, Music, FileAudio, AlertTriangle, Check, X } from "lucide-react";

interface MusicUploadProps {
  onUploadComplete: (name: string, url: string) => void;
}

/** Allowed audio MIME types */
const ALLOWED_AUDIO_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/ogg",
];

const ALLOWED_EXTENSIONS = [".mp3", ".wav", ".ogg"];

export default function MusicUpload({ onUploadComplete }: MusicUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<{
    name: string;
    size: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const validateAndUpload = async (file: File) => {
    setUploadError(null);

    // Validate type
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!ALLOWED_AUDIO_TYPES.includes(file.type) && !ALLOWED_EXTENSIONS.includes(ext)) {
      setUploadError("Sadece MP3, WAV ve OGG dosyaları kabul edilir.");
      return;
    }

    // Validate size (max 15MB)
    if (file.size > 15 * 1024 * 1024) {
      setUploadError("Dosya boyutu 15MB'dan büyük olamaz.");
      return;
    }

    setPreviewFile({ name: file.name, size: file.size });
    setUploading(true);
    setUploadProgress(0);

    try {
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
        onUploadComplete(file.name.replace(/\.[^/.]+$/, ""), data.url);
        setPreviewFile(null);
      }
    } catch (err: any) {
      setUploadError(err.message || "Dosya yüklenirken hata oluştu.");
      setPreviewFile(null);
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
      validateAndUpload(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndUpload(e.target.files[0]);
    }
    e.target.value = "";
  };

  return (
    <div className="space-y-3">
      {/* Upload Error */}
      {uploadError && (
        <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-xs font-bold flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Drag & Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        onTouchEnd={(e) => {
          if (!fileInputRef.current) return;
          e.preventDefault();
          fileInputRef.current.click();
        }}
        className={`drop-zone p-6 sm:p-8 text-center transition-all cursor-pointer select-none touch-manipulation min-h-[100px] flex items-center justify-center ${
          dragOver ? "drag-over scale-[1.02]" : ""
        } ${uploading ? "opacity-60 pointer-events-none" : ""}`}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ")
            fileInputRef.current?.click();
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".mp3,.wav,.ogg,audio/mpeg,audio/wav,audio/ogg"
          onChange={handleFileSelect}
          className="hidden"
        />

        {uploading ? (
          <div className="space-y-3 w-full max-w-xs mx-auto">
            <div className="w-10 h-10 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-sm font-bold text-teal-600">
              Yükleniyor... %{uploadProgress}
            </p>
            <div className="w-full bg-teal-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-teal-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            {previewFile && (
              <p className="text-[10px] text-slate-500">
                {previewFile.name} ({formatSize(previewFile.size)})
              </p>
            )}
          </div>
        ) : previewFile ? (
          <div className="space-y-2">
            <div className="w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto">
              <FileAudio className="w-7 h-7 text-teal-600" />
            </div>
            <p className="text-sm font-bold text-teal-700">{previewFile.name}</p>
            <p className="text-xs text-slate-500">{formatSize(previewFile.size)}</p>
            <p className="text-[10px] text-teal-500 font-semibold">
              Yüklemek için tekrar tıklayın veya başka bir dosya seçin
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto">
              <Music className="w-7 h-7 text-teal-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-teal-700">
                Müzik dosyası sürükleyip bırakın
              </p>
              <p className="text-xs text-slate-500 mt-1">
                veya tıklayarak dosya seçin
              </p>
            </div>
            <p className="text-[10px] text-slate-400">
              MP3, WAV, OGG - Maks. 15MB
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
