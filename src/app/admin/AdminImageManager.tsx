"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Image, Trash2, ExternalLink, RefreshCw, AlertTriangle, Search, Copy } from "lucide-react";

interface BlobItem {
  url: string;
  pathname: string;
  uploadedAt: string;
  size: number;
}

export default function AdminImageManager() {
  const [blobs, setBlobs] = useState<BlobItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const fetchBlobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/upload?prefix=campaigns");
      const data = await res.json();
      if (data.blobs) {
        setBlobs(data.blobs);
      }
      if (data.message && data.blobs.length === 0) {
        setMessage(data.message);
      }
    } catch (err) {
      setError("Blob listesi alınamadı.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBlobs();
  }, [fetchBlobs]);

  const handleDelete = async (url: string) => {
    if (!confirm("Bu görseli silmek istediğinize emin misiniz? Bu işlem geri alınamaz.")) return;
    setDeleting(url);
    try {
      const res = await fetch("/api/upload", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (res.ok) {
        setBlobs((prev) => prev.filter((b) => b.url !== url));
      } else {
        const data = await res.json();
        alert(data.error || "Silme başarısız.");
      }
    } catch {
      alert("Bağlantı hatası.");
    } finally {
      setDeleting(null);
    }
  };

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      const btn = document.activeElement;
      if (btn) (btn as HTMLButtonElement).innerText = "Kopyalandı!";
      setTimeout(() => {
        if (btn) (btn as HTMLButtonElement).innerText = "Kopyala";
      }, 2000);
    });
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const filteredBlobs = search
    ? blobs.filter((b) => b.pathname.toLowerCase().includes(search.toLowerCase()))
    : blobs;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-black text-slate-800">Yüklenen Görseller</h3>
          <p className="text-xs opacity-75">
            Kampanyalara eklenen tüm görseller. Silme işlemi geri alınamaz.
          </p>
        </div>
        <button
          onClick={fetchBlobs}
          disabled={loading}
          className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 btn-base"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Yenile
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Görsel ara (dosya adı)..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-teal-500/10 bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none text-sm font-bold input-field"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl text-xs font-bold flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Message (no blobs / dev mode) */}
      {message && !loading && (
        <div className="bg-amber-50 border border-amber-200/60 rounded-2xl p-6 text-center">
          <Image className="w-10 h-10 text-amber-400 mx-auto mb-3" />
          <p className="text-sm font-bold text-amber-700">{message}</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-bold text-teal-600 mt-3">Görseller yükleniyor...</p>
        </div>
      )}

      {/* Image Grid */}
      {!loading && filteredBlobs.length > 0 && (
        <>
          <p className="text-xs font-bold text-slate-500">
            {filteredBlobs.length} görsel bulundu
            {search && ` ("${search}" için)`}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {filteredBlobs.map((blob) => (
              <div
                key={blob.url}
                className="bg-white rounded-2xl border border-teal-50 shadow-sm overflow-hidden group"
              >
                <div className="relative aspect-square bg-slate-100">
                  <img
                    src={blob.url}
                    alt={blob.pathname}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  {/* Hover overlay actions */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                    <a
                      href={blob.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-white/90 hover:bg-white rounded-lg text-slate-700 transition-all"
                      title="Yeni sekmede aç"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => handleCopyUrl(blob.url)}
                      className="p-2 bg-white/90 hover:bg-white rounded-lg text-slate-700 transition-all"
                      title="URL Kopyala"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(blob.url)}
                      disabled={deleting === blob.url}
                      className="p-2 bg-red-500/90 hover:bg-red-600 rounded-lg text-white transition-all disabled:opacity-50"
                      title="Sil"
                    >
                      {deleting === blob.url ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="p-2.5 space-y-1">
                  <p className="text-[10px] font-bold text-slate-700 truncate" title={blob.pathname}>
                    {blob.pathname.split("/").pop()}
                  </p>
                  <p className="text-[8px] text-slate-400">{formatSize(blob.size)}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Empty state */}
      {!loading && !message && filteredBlobs.length === 0 && (
        <div className="bg-white rounded-3xl border border-teal-50 shadow-sm p-12 text-center">
          <Image className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-sm font-bold text-slate-400">
            {search ? "Aramanızla eşleşen görsel bulunamadı." : "Henüz görsel yüklenmemiş."}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Kampanya oluştururken yüklenen görseller burada listelenir.
          </p>
        </div>
      )}
    </div>
  );
}
