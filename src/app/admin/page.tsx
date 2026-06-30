"use client";

import React, { useState, useEffect } from "react";
import { 
  Sparkles, 
  Trash2, 
  Edit3, 
  Plus, 
  Check, 
  User, 
  Phone, 
  FileSpreadsheet, 
  ExternalLink, 
  RefreshCw, 
  ToggleLeft, 
  ToggleRight, 
  Calendar, 
  Grid, 
  Users, 
  Gift, 
  Percent, 
  Lock, 
  ArrowLeft,
  Settings,
  HelpCircle,
  AlertCircle,
  Music,
  Image
} from "lucide-react";
import { getWhatsAppUrl, ARYA_WHATSAPP_PHONE } from "../utils";
import ImageUpload from "./ImageUpload";
import MusicUpload from "./MusicUpload";
import AdminCharts from "./AdminCharts";
import AdminImageManager from "./AdminImageManager";

// Types
interface Campaign {
  id: number;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  images: string; // JSON array of string URLs
  quota: number;
  quotaUsed: number;
  badge: string;
  prizes: string; // JSON string of prize options
  active: boolean;
  createdAt: string;
}

interface Participation {
  id: number;
  campaignId: number;
  firstName: string;
  lastName: string;
  fullPhone: string;
  phoneLastFour: string;
  ipAddress: string;
  cookieId: string;
  createdAt: string;
}

interface SpinnerWinner {
  id: number;
  campaignId: number;
  firstName: string;
  lastName: string;
  fullPhone: string;
  phoneLastFour: string;
  prizeWon: string;
  promoCode: string;
  used: boolean;
  ipAddress: string;
  cookieId: string;
  createdAt: string;
}

interface PrizeConfig {
  id: number;
  text: string;
  probability: number;
  codePrefix: string;
}

// Preset Dry-cleaning stock Unsplash images
const PRESET_IMAGES = [
  { id: 1, url: "https://images.unsplash.com/photo-1545127398-14699f92334b?auto=format&fit=crop&w=1200&q=80", title: "Asılı Elbiseler" },
  { id: 2, url: "https://images.unsplash.com/photo-1489274495757-95c7c837b101?auto=format&fit=crop&w=1200&q=80", title: "Ütüleme / Buharlama" },
  { id: 3, url: "https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?auto=format&fit=crop&w=1200&q=80", title: "Katlanmış Temiz Giysiler" },
  { id: 4, url: "https://images.unsplash.com/photo-1582735689369-4fe89db7114c?auto=format&fit=crop&w=1200&q=80", title: "Modern Çamaşırhane" },
  { id: 5, url: "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=1200&q=80", title: "Mont ve Kaban Temizliği" }
];

const DEFAULT_PRIZES: PrizeConfig[] = [
  { id: 1, text: "%10 İndirim", probability: 40, codePrefix: "ARYA10" },
  { id: 2, text: "%20 İndirim", probability: 25, codePrefix: "ARYA20" },
  { id: 3, text: "Ücretsiz 2 Parça Ütü", probability: 15, codePrefix: "UTU" },
  { id: 4, text: "Hediye Temizlik Cüzdanı", probability: 10, codePrefix: "CUZDAN" },
  { id: 5, text: "1 Mont Temizleme Bedava", probability: 5, codePrefix: "MONT" },
  { id: 6, text: "%50 SÜPER İNDİRİM!", probability: 5, codePrefix: "ARYA50" }
];

export default function AdminControlCenter() {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [passcode, setPasscode] = useState<string>("");
  const [authError, setAuthError] = useState<string | null>(null);

  // Tab management
  const [activeTab, setActiveTab] = useState<"dashboard" | "campaigns" | "participations" | "winners" | "music" | "images">("dashboard");

  // Data logs state
  const [campaignsList, setCampaignsList] = useState<Campaign[]>([]);
  const [participationsList, setParticipationsList] = useState<Participation[]>([]);
  const [winnersList, setWinnersList] = useState<SpinnerWinner[]>([]);
  
  // Stats aggregated
  const [stats, setStats] = useState({
    todayParticipations: 0,
    todaySpinners: 0,
    totalParticipations: 0,
    totalSpinners: 0,
    mostWonPrize: "Yok",
    activeCampaignsCount: 0
  });

  // Create Campaign State
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [badge, setBadge] = useState("Flaş");
  const [quota, setQuota] = useState<number>(300);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [customImageLink, setCustomImageLink] = useState("");
  const [prizes, setPrizes] = useState<PrizeConfig[]>(JSON.parse(JSON.stringify(DEFAULT_PRIZES)));
  const [campaignError, setCampaignError] = useState<string | null>(null);
  
  // Edit Campaign State
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);

  // Filter lists inside dashboard tables
  const [searchQuery, setSearchQuery] = useState("");

  // Music management state
  const [musicList, setMusicList] = useState<{ id: number; name: string; url: string; active: boolean; createdAt: string }[]>([]);
  const [musicName, setMusicName] = useState("");
  const [musicUrl, setMusicUrl] = useState("");
  const [addingMusic, setAddingMusic] = useState(false);
  const [musicError, setMusicError] = useState<string | null>(null);

  const fetchMusic = async () => {
    try {
      const res = await fetch("/api/admin/music");
      if (res.ok) {
        const data = await res.json();
        setMusicList(data);
      }
    } catch (err) {
      console.error("Müzik listesi yüklenemedi:", err);
    }
  };

  const handleAddMusic = async (e: React.FormEvent) => {
    e.preventDefault();
    setMusicError(null);
    if (!musicName.trim() || !musicUrl.trim()) {
      setMusicError("Müzik adı ve URL gereklidir.");
      return;
    }
    setAddingMusic(true);
    try {
      const res = await fetch("/api/admin/music", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: musicName.trim(), url: musicUrl.trim() })
      });
      if (!res.ok) {
        const data = await res.json();
        setMusicError(data.error || "Müzik eklenemedi.");
      } else {
        setMusicName("");
        setMusicUrl("");
        fetchMusic();
      }
    } catch (err) {
      setMusicError("Bağlantı hatası.");
    } finally {
      setAddingMusic(false);
    }
  };

  /** Called by MusicUpload after file upload completes */
  const handleMusicFileUploaded = (name: string, url: string) => {
    // Auto-fill name if empty
    if (!musicName.trim()) {
      setMusicName(name);
    }
    setMusicUrl(url);
    // Auto-submit the form
    setAddingMusic(true);
    setMusicError(null);
    fetch("/api/admin/music", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name, url: url })
    }).then(async (res) => {
      if (!res.ok) {
        const data = await res.json();
        setMusicError(data.error || "Müzik eklenemedi.");
      } else {
        setMusicName("");
        setMusicUrl("");
        fetchMusic();
      }
    }).catch(() => {
      setMusicError("Bağlantı hatası.");
    }).finally(() => {
      setAddingMusic(false);
    });
  };

  const handleDeleteMusic = async (id: number) => {
    if (!confirm("Bu müziği silmek istediğinize emin misiniz?")) return;
    try {
      const res = await fetch(`/api/admin/music/${id}`, { method: "DELETE" });
      if (res.ok) fetchMusic();
    } catch (err) {
      console.error("Müzik silinemedi:", err);
    }
  };

  const handleToggleMusic = async (id: number, currentActive: boolean) => {
    try {
      const res = await fetch(`/api/admin/music/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !currentActive })
      });
      if (res.ok) fetchMusic();
    } catch (err) {
      console.error("Müzik durumu değiştirilemedi:", err);
    }
  };

  // Loading state
  const [loading, setLoading] = useState<boolean>(true);

  // Verification helper for password login
  useEffect(() => {
    const savedAuth = localStorage.getItem("arya_admin_authenticated") === "true";
    if (savedAuth) {
      setIsAuthenticated(true);
      fetchDashboardData();
      fetchMusic();
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode === "arya1998") {
      setIsAuthenticated(true);
      localStorage.setItem("arya_admin_authenticated", "true");
      setAuthError(null);
      fetchDashboardData();
      fetchMusic();
    } else {
      setAuthError("Geçersiz şifre girdiniz. Lütfen tekrar deneyin.");
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem("arya_admin_authenticated");
  };

  // Fetch Dashboard Stats and Lists
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/stats");
      if (res.ok) {
        const data = await res.json();
        setCampaignsList(data.campaigns);
        setParticipationsList(data.participations);
        setWinnersList(data.spinners);
        setStats({
          todayParticipations: data.todayParticipations,
          todaySpinners: data.todaySpinners,
          totalParticipations: data.totalParticipations,
          totalSpinners: data.totalSpinners,
          mostWonPrize: data.mostWonPrize,
          activeCampaignsCount: data.activeCampaignsCount
        });
      }
    } catch (err) {
      console.error("Dashboard stats failed to load:", err);
    } finally {
      setLoading(false);
    }
  };

  // Toggle active campaign
  const handleToggleActive = async (campaign: Campaign) => {
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !campaign.active })
      });

      if (res.ok) {
        fetchDashboardData();
      }
    } catch (err) {
      console.error("Campaign status toggle error:", err);
    }
  };

  // Delete Campaign
  const handleDeleteCampaign = async (id: number) => {
    if (!confirm("Bu kampanyayı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.")) return;

    try {
      const res = await fetch(`/api/campaigns/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchDashboardData();
      }
    } catch (err) {
      console.error("Campaign deletion failed:", err);
    }
  };

  // Toggle Winner Promo Code Claim/Used State
  const handleTogglePromoUsed = async (id: number, currentUsed: boolean) => {
    try {
      const res = await fetch("/api/admin/promo-codes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, used: !currentUsed })
      });

      if (res.ok) {
        fetchDashboardData();
      }
    } catch (err) {
      console.error("Promo code update failed:", err);
    }
  };

  // Manage presets in Create Form
  const togglePresetImage = (url: string) => {
    if (selectedImages.includes(url)) {
      setSelectedImages(selectedImages.filter(img => img !== url));
    } else {
      if (selectedImages.length >= 5) {
        alert("En fazla 5 adet görsel seçebilirsiniz.");
        return;
      }
      setSelectedImages([...selectedImages, url]);
    }
  };

  // Add custom URL
  const addCustomImageLink = () => {
    if (!customImageLink) return;
    if (selectedImages.length >= 5) {
      alert("En fazla 5 adet görsel seçebilirsiniz.");
      return;
    }
    setSelectedImages([...selectedImages, customImageLink]);
    setCustomImageLink("");
  };

  // Real-time prize probability validation
  const totalProbability = prizes.reduce((sum, item) => sum + (parseFloat(item.probability.toString()) || 0), 0);

  // Submit Create Campaign
  const handleCreateCampaignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCampaignError(null);

    if (!name.trim() || !description.trim() || !startDate || !endDate) {
      setCampaignError("Lütfen kampanya adı, açıklaması ve başlangıç/bitiş tarihlerini doldurun.");
      return;
    }

    if (totalProbability !== 100) {
      setCampaignError(`Çark ödüllerinin olasılık yüzdeleri toplamı tam olarak %100 olmalıdır. Şu anki Toplam: %${totalProbability}`);
      return;
    }

    if (selectedImages.length === 0) {
      setCampaignError("Lütfen kampanya için en az 1 adet görsel seçin veya özel bağlantı girin.");
      return;
    }

    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate).toISOString(),
          badge,
          quota,
          images: selectedImages,
          prizes: prizes
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setCampaignError(data.error || "Kampanya oluşturulurken bir hata meydana geldi.");
      } else {
        setIsCreating(false);
        // Reset form
        setName("");
        setDescription("");
        setStartDate("");
        setEndDate("");
        setBadge("Flaş");
        setQuota(300);
        setSelectedImages([]);
        setPrizes(JSON.parse(JSON.stringify(DEFAULT_PRIZES)));
        fetchDashboardData();
      }
    } catch (err) {
      setCampaignError("Bağlantı hatası oluştu.");
    }
  };

  // Handle Edit click
  const openEditModal = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    setName(campaign.name);
    setDescription(campaign.description);
    
    // Format dates to datetime-local compatible format
    const formatToDatetimeLocal = (dateStr: string) => {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "";
      const pad = (num: number) => String(num).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    setStartDate(formatToDatetimeLocal(campaign.startDate));
    setEndDate(formatToDatetimeLocal(campaign.endDate));
    setBadge(campaign.badge);
    setQuota(campaign.quota);
    
    try {
      setSelectedImages(JSON.parse(campaign.images));
    } catch (e) {
      setSelectedImages([campaign.images]);
    }

    try {
      setPrizes(JSON.parse(campaign.prizes));
    } catch (e) {
      setPrizes(JSON.parse(JSON.stringify(DEFAULT_PRIZES)));
    }
  };

  // Submit Edit Campaign
  const handleEditCampaignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCampaign) return;
    setCampaignError(null);

    if (totalProbability !== 100) {
      setCampaignError(`Çark ödüllerinin olasılık yüzdeleri toplamı tam olarak %100 olmalıdır. Şu anki Toplam: %${totalProbability}`);
      return;
    }

    try {
      const res = await fetch(`/api/campaigns/${editingCampaign.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate).toISOString(),
          badge,
          quota,
          images: selectedImages,
          prizes: prizes
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setCampaignError(data.error || "Kampanya güncellenirken hata oluştu.");
      } else {
        setEditingCampaign(null);
        // Reset form
        setName("");
        setDescription("");
        setStartDate("");
        setEndDate("");
        setSelectedImages([]);
        setPrizes(JSON.parse(JSON.stringify(DEFAULT_PRIZES)));
        fetchDashboardData();
      }
    } catch (err) {
      setCampaignError("Bağlantı hatası oluştu.");
    }
  };

  // EXPORT LOGS TO CSV DIRECTLY
  const exportToCSV = (type: "participations" | "winners") => {
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    
    if (type === "participations") {
      csvContent += "ID;Kampanya ID;Isim;Soyisim;Telefon;Telefon Son 4;IP Adresi;Tarih\n";
      participationsList.forEach((p) => {
        const campaign = campaignsList.find(c => c.id === p.campaignId);
        const campName = campaign ? campaign.name.replace(/;/g, ",") : p.campaignId;
        csvContent += `${p.id};${campName};${p.firstName};${p.lastName};${p.fullPhone};${p.phoneLastFour};${p.ipAddress};${new Date(p.createdAt).toLocaleString("tr-TR")}\n`;
      });
    } else {
      csvContent += "ID;Kampanya ID;Isim;Soyisim;Telefon;Telefon Son 4;Kazanilan Odul;Kupon Kodu;Durum;IP Adresi;Tarih\n";
      winnersList.forEach((w) => {
        const campaign = campaignsList.find(c => c.id === w.campaignId);
        const campName = campaign ? campaign.name.replace(/;/g, ",") : w.campaignId;
        const status = w.used ? "Kullanildi" : "Kullanilmadi";
        csvContent += `${w.id};${campName};${w.firstName};${w.lastName};${w.fullPhone};${w.phoneLastFour};${w.prizeWon};${w.promoCode};${status};${w.ipAddress};${new Date(w.createdAt).toLocaleString("tr-TR")}\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `arya_terzi_${type}_${new Date().toLocaleDateString("tr-TR")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#FEFCF5] rose-pattern-bg flex items-center justify-center p-4 text-teal-950 font-sans">
        <div className="bg-white rounded-3xl border border-teal-100 shadow-2xl w-full max-w-md overflow-hidden relative">
          
          <div className="bg-gradient-to-br from-teal-600 to-teal-800 p-8 text-white text-center space-y-2">
            <div className="bg-white/20 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-2 backdrop-blur-sm">
              {/* Needle/Pin Logo */}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7 text-white">
                <path d="M10 6L20 16L8 22L6 20L2 18L10 6Z" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M10 6L16 2L20 6L18 10" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="8" cy="18" r="1.5" fill="currentColor" stroke="none"/>
              </svg>
            </div>
            <h2 className="text-2xl font-black tracking-tight">Arya Kontrol Merkezi</h2>
            <p className="text-xs opacity-90 font-medium">Lütfen yetkili erişim şifresini giriniz</p>
          </div>

          <div className="p-8">
            <form onSubmit={handleLogin} className="space-y-6">
              {authError && (
                <div className="p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl text-xs font-bold flex items-start gap-2">
                  <AlertCircle className="w-4.5 h-4.5 shrink-0 text-rose-500" />
                  <span>{authError}</span>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider mb-2 text-teal-700">YÖNETİCİ ŞİFRE (PASSCODE)</label>
                <input 
                  type="password" 
                  required
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Yönetici Şifrenizi Girin"
                  className="w-full px-4 py-3 border border-teal-100 rounded-xl bg-slate-50 focus:ring-2 focus:ring-teal-600 focus:outline-none font-bold text-center text-lg tracking-widest text-teal-900 input-field"
                />
              </div>

              {/* TIPS CARD */}
              <div className="p-4 bg-amber-50 border border-amber-200/60 rounded-2xl flex items-start gap-2.5">
                <HelpCircle className="w-5 h-5 text-amber-500 shrink-0" />
                <div className="text-xs space-y-1">
                  <p className="font-extrabold text-amber-800">Yönetici Girişi:</p>
                  <p className="opacity-90 leading-relaxed text-amber-900">
                    Sisteme giriş için şifrenizi giriniz. Yetkili kişiler tarafından belirlenmiştir.
                  </p>
                </div>
              </div>

              <button 
                type="submit"
                className="w-full py-4 bg-teal-600 hover:bg-teal-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-lg hover:scale-[1.01] btn-base"
              >
                KONTROL PANELİNE GİRİŞ YAP
              </button>
            </form>

            <a 
              href="/" 
              className="mt-6 flex items-center justify-center gap-1.5 text-xs font-bold text-teal-600 hover:underline"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Ana Sayfaya Geri Dön
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FEFCF5] text-slate-900 font-sans pb-16 rose-pattern-bg">
      
      {/* NAVBAR */}
      <header className="bg-teal-900 text-white sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="bg-teal-600 p-2 rounded-xl flex items-center justify-center">
              {/* Needle/Pin Logo */}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5 text-white">
                <path d="M10 6L20 16L8 22L6 20L2 18L10 6Z" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M10 6L16 2L20 6L18 10" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="8" cy="18" r="1.5" fill="currentColor" stroke="none"/>
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight">ARYA TERZİ SÜPER KAMPANYA</h1>
              <p className="text-[10px] uppercase font-bold text-teal-300 tracking-wider">Gelişmiş Yönetim Kontrol Merkezi</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button 
              onClick={fetchDashboardData}
              className="p-2 bg-teal-800 hover:bg-teal-700 rounded-xl text-teal-200 transition-all hover:text-white btn-base"
              title="Yenile"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            
            <a 
              href="/" 
              target="_blank"
              className="px-4 py-2 bg-teal-800 hover:bg-teal-700 rounded-xl text-xs font-bold transition-all text-teal-200 hover:text-white flex items-center gap-1 btn-base"
            >
              Ana Sayfayı Gör <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <button 
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-xl text-xs font-bold transition-all btn-base"
            >
              Güvenli Çıkış
            </button>
          </div>
        </div>
      </header>

      {/* ADMIN CONTENT CONTAINER */}
      <div className="max-w-7xl mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* LEFT COLUMN: TABS NAVIGATION */}
        <aside className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-2xl p-4 border border-teal-100 shadow-sm space-y-1.5">
            <p className="text-[10px] font-black uppercase text-teal-600 tracking-wider px-3 mb-2">MENÜ DİZİNİ</p>
            
            <button
              onClick={() => { setActiveTab("dashboard"); setIsCreating(false); }}
              className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center gap-2.5 btn-base ${activeTab === "dashboard" ? "bg-teal-600 text-white shadow-md shadow-teal-600/10" : "text-slate-600 hover:bg-teal-50"}`}
            >
              <Grid className="w-4 h-4" /> Gösterge Tablosu
            </button>

            <button
              onClick={() => { setActiveTab("campaigns"); setIsCreating(false); }}
              className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center gap-2.5 btn-base ${activeTab === "campaigns" ? "bg-teal-600 text-white shadow-md shadow-teal-600/10" : "text-slate-600 hover:bg-teal-50"}`}
            >
              <Calendar className="w-4 h-4" /> Kampanyaları Yönet
            </button>

            <button
              onClick={() => { setActiveTab("participations"); setIsCreating(false); }}
              className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center gap-2.5 btn-base ${activeTab === "participations" ? "bg-teal-600 text-white shadow-md shadow-teal-600/10" : "text-slate-600 hover:bg-teal-50"}`}
            >
              <Users className="w-4 h-4" /> Kampanya Katılımcıları
            </button>

            <button
              onClick={() => { setActiveTab("winners"); setIsCreating(false); }}
              className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center gap-2.5 btn-base ${activeTab === "winners" ? "bg-teal-600 text-white shadow-md shadow-teal-600/10" : "text-slate-600 hover:bg-teal-50"}`}
            >
              <Gift className="w-4 h-4" /> Çark Kazananları
            </button>

            <button
              onClick={() => { setActiveTab("music"); setIsCreating(false); }}
              className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center gap-2.5 btn-base ${activeTab === "music" ? "bg-teal-600 text-white shadow-md shadow-teal-600/10" : "text-slate-600 hover:bg-teal-50"}`}
            >
              <Music className="w-4 h-4" /> Müzik Yönetimi
            </button>

            <button
              onClick={() => { setActiveTab("images"); setIsCreating(false); }}
              className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center gap-2.5 btn-base ${activeTab === "images" ? "bg-teal-600 text-white shadow-md shadow-teal-600/10" : "text-slate-600 hover:bg-teal-50"}`}
            >
              <Image className="w-4 h-4" /> Görseller
            </button>
          </div>

          <div className="bg-amber-50 rounded-2xl p-5 border border-amber-200/50 space-y-3">
            <h4 className="text-xs font-extrabold text-amber-800 flex items-center gap-1.5 uppercase">
              <Sparkles className="w-4 h-4 text-amber-500 animate-spin" /> Pazarlama Gücü!
            </h4>
            <p className="text-xs text-amber-900/80 leading-relaxed">
              Katılımcılara özel promosyon kodlarını, kasada teyit ederken yandaki tablodan <b>kullanıldı</b> olarak işaretleyebilirsiniz.
            </p>
          </div>
        </aside>

        {/* RIGHT COLUMN: MAIN PANEL VIEWS */}
        <main className="lg:col-span-3 space-y-6">
          
          {/* VIEW 1: DASHBOARD OVERVIEW */}
          {activeTab === "dashboard" && !isCreating && (
            <div className="space-y-6">
              {/* STATS TILES */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                <div className="bg-white p-5 rounded-2xl border border-teal-50 shadow-sm flex items-center space-x-4">
                  <div className="bg-teal-50 p-3 rounded-xl text-teal-600">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-500">Bugün Katılanlar</p>
                    <p className="text-2xl font-black text-teal-900">{stats.todayParticipations}</p>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-teal-50 shadow-sm flex items-center space-x-4">
                  <div className="bg-teal-50 p-3 rounded-xl text-teal-600">
                    <Gift className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-500">Bugün Çark Çevirenler</p>
                    <p className="text-2xl font-black text-teal-900">{stats.todaySpinners}</p>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-teal-50 shadow-sm flex items-center space-x-4">
                  <div className="bg-amber-50 p-3 rounded-xl text-amber-600">
                    <Percent className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-500">En Çok Kazanan Ödül</p>
                    <p className="text-xs font-bold text-teal-900 truncate max-w-[130px]">{stats.mostWonPrize}</p>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-teal-50 shadow-sm flex items-center space-x-4">
                  <div className="bg-emerald-50 p-3 rounded-xl text-emerald-600">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-500">Aktif Kampanyalar</p>
                    <p className="text-2xl font-black text-teal-900">{stats.activeCampaignsCount}</p>
                  </div>
                </div>

              </div>

              {/* CHARTS SECTION */}
              <AdminCharts
                participations={participationsList}
                spinners={winnersList}
                campaigns={campaignsList}
              />

              {/* RECENT NOTIFICATIONS SIMULATOR (TELEGRAM DETECTED) */}
              <div className="bg-slate-900 rounded-3xl p-6 text-white border border-slate-800 space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                    <h3 className="font-extrabold text-sm tracking-tight text-emerald-400">TELEGRAM BİLDİRİM MERKEZİ (SİMÜLATÖR)</h3>
                  </div>
                  <span className="text-[10px] font-bold bg-white/10 px-2.5 py-1 rounded text-teal-300 uppercase">Aktif</span>
                </div>
                <p className="text-xs text-white/70 leading-relaxed">
                  Çarkta yüksek tutarlı ödüller (örneğin %30, %40 veya %50 indirim, hediye cüzdan ya da bedava mont temizliği) kazanıldığında cep telefonunuza anında gönderilen Telegram mesajlarının simüle edilmiş akışı aşağıdadır:
                </p>
                
                <div className="space-y-2 max-h-40 overflow-y-auto font-mono text-[10px] bg-black/50 p-4 rounded-xl text-teal-200">
                  {winnersList.filter(w => /30%|40%|50%|%30|%40|%50|bedava|hediye|ücretsiz|super|süper/i.test(w.prizeWon)).slice(0, 5).map((w, idx) => (
                    <div key={idx} className="border-b border-white/5 pb-2 last:border-none">
                      <p className="text-emerald-400 font-bold">✔ [TELEGRAM DISPATCHED] - {new Date(w.createdAt).toLocaleString("tr-TR")}</p>
                      <p>Müşteri: {w.firstName} {w.lastName} ({w.fullPhone}) - Ödül: {w.prizeWon} - Kod: {w.promoCode}</p>
                    </div>
                  ))}
                  {winnersList.filter(w => /30%|40%|50%|%30|%40|%50|bedava|hediye|ücretsiz|super|süper/i.test(w.prizeWon)).length === 0 && (
                    <p className="text-slate-500 italic text-center py-2">Henüz yüksek tutarlı (Telegram uyarı sınırlı) ödül kazanılmadı. Çark döndürüldükçe burası tetiklenir.</p>
                  )}
                </div>
              </div>

              {/* QUICK TABLES */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* LATEST REGISTRANTS */}
                <div className="bg-white rounded-3xl p-6 border border-teal-50 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-sm tracking-tight">En Son Kayıt Olanlar</h4>
                    <button onClick={() => setActiveTab("participations")} className="text-xs font-bold text-teal-600 hover:underline btn-base">Tümünü Gör</button>
                  </div>
                  <div className="divide-y divide-slate-100 text-xs">
                    {participationsList.slice(0, 5).map((p, idx) => {
                      const c = campaignsList.find(camp => camp.id === p.campaignId);
                      return (
                        <div key={idx} className="py-3 flex justify-between items-center">
                          <div>
                            <p className="font-black">{p.firstName} {p.lastName}</p>
                            <p className="text-[10px] opacity-60 font-medium">Kampanya: {c ? c.name : "Bilinmeyen"}</p>
                          </div>
                          <span className="text-[10px] font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600">{p.phoneLastFour}****</span>
                        </div>
                      );
                    })}
                    {participationsList.length === 0 && (
                      <p className="text-slate-400 text-center py-4">Henüz katılım kaydı bulunmuyor.</p>
                    )}
                  </div>
                </div>

                {/* LATEST WHEEL WINNERS */}
                <div className="bg-white rounded-3xl p-6 border border-teal-50 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-sm tracking-tight">Son Kazananlar</h4>
                    <button onClick={() => setActiveTab("winners")} className="text-xs font-bold text-teal-600 hover:underline btn-base">Tümünü Gör</button>
                  </div>
                  <div className="divide-y divide-slate-100 text-xs">
                    {winnersList.slice(0, 5).map((w, idx) => (
                      <div key={idx} className="py-3 flex justify-between items-center">
                        <div>
                          <p className="font-black">{w.firstName} {w.lastName}</p>
                          <p className="text-[10px] text-amber-600 font-extrabold">{w.prizeWon}</p>
                        </div>
                        <span className="font-mono text-[10px] font-black tracking-wider text-teal-600 bg-teal-50 px-2 py-0.5 rounded">{w.promoCode}</span>
                      </div>
                    ))}
                    {winnersList.length === 0 && (
                      <p className="text-slate-400 text-center py-4">Henüz ödül kazanan bulunmuyor.</p>
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}


          {/* VIEW 2: CAMPAIGNS MANAGEMENT */}
          {activeTab === "campaigns" && (
            <div className="space-y-6">
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-black text-slate-800">Kampanyalar ve Afişler</h3>
                  <p className="text-xs opacity-70">Sitede alt alta gösterilecek büyük banner'ları ve çark içeriğini buradan yönetebilirsiniz.</p>
                </div>
                <button
                  onClick={() => {
                    setIsCreating(true);
                    setEditingCampaign(null);
                    setName("");
                    setDescription("");
                    setStartDate("");
                    setEndDate("");
                    setBadge("Flaş");
                    setQuota(300);
                    setCampaignError(null);
                    setSelectedImages([]);
                    setPrizes(JSON.parse(JSON.stringify(DEFAULT_PRIZES)));
                  }}
                  className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow flex items-center gap-1.5 btn-base"
                >
                  <Plus className="w-4 h-4" /> Yeni Kampanya Oluştur
                </button>
              </div>

              {/* CREATE / EDIT FORM PANEL */}
              {(isCreating || editingCampaign) && (
                <div className="bg-white rounded-3xl p-6 border border-teal-100 shadow-xl space-y-6">
                  <div className="flex items-center justify-between border-b pb-4">
                    <h4 className="font-black text-sm uppercase text-teal-700">
                      {editingCampaign ? `Kampanyayı Düzenle: ${editingCampaign.name}` : "Yeni Kampanya Detayları"}
                    </h4>
                    <button 
                      onClick={() => { setIsCreating(false); setEditingCampaign(null); }}
                      className="text-xs font-bold text-slate-500 hover:text-slate-700 btn-base"
                    >
                      Kapat
                    </button>
                  </div>

                  <form onSubmit={editingCampaign ? handleEditCampaignSubmit : handleCreateCampaignSubmit} className="space-y-5">
                    {campaignError && (
                      <div className="p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl text-xs font-bold flex items-start gap-2">
                        <AlertCircle className="w-4.5 h-4.5 shrink-0 text-rose-500" />
                        <span>{campaignError}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-black uppercase mb-1.5 opacity-80">Kampanya Adı</label>
                        <input 
                          type="text" 
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Örn. Arya Süper Kış Sezonu Kampanyası"
                          className="input-field w-full px-4 py-2.5 border rounded-xl bg-slate-50 focus:ring-2 focus:ring-teal-600 text-sm font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-black uppercase mb-1.5 opacity-80">Kampanya Rozeti (Badge)</label>
                        <select 
                          value={badge}
                          onChange={(e) => setBadge(e.target.value)}
                          className="input-field w-full px-4 py-2.5 border rounded-xl bg-slate-50 focus:ring-2 focus:ring-teal-600 text-sm font-bold"
                        >
                          <option value="Flaş">Flaş</option>
                          <option value="Haftalık">Haftalık</option>
                          <option value="Özel Gün">Özel Gün</option>
                          <option value="Sınırlı Kontenjan">Sınırlı Kontenjan</option>
                          <option value="Arya Özel">Arya Özel</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-black uppercase mb-1.5 opacity-80">Kampanya Açıklaması</label>
                      <textarea
                        required
                        rows={3}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Müşteriyi çekecek, dev indirimi ve detayları anlatan reklam metni..."
                        className="input-field w-full px-4 py-2.5 border rounded-xl bg-slate-50 focus:ring-2 focus:ring-teal-600 text-sm font-bold"
                      ></textarea>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[11px] font-black uppercase mb-1.5 opacity-80">Başlangıç Tarihi</label>
                        <input 
                          type="datetime-local" 
                          required
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="input-field w-full px-4 py-2.5 border rounded-xl bg-slate-50 focus:ring-2 focus:ring-teal-600 text-sm font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-black uppercase mb-1.5 opacity-80">Bitiş Tarihi (Saniyeye Kadar)</label>
                        <input 
                          type="datetime-local" 
                          required
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="input-field w-full px-4 py-2.5 border rounded-xl bg-slate-50 focus:ring-2 focus:ring-teal-600 text-sm font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-black uppercase mb-1.5 opacity-80">Kontenjan (Kota Miktarı)</label>
                        <input 
                          type="number" 
                          required
                          value={quota}
                          onChange={(e) => setQuota(parseInt(e.target.value) || 100)}
                          placeholder="Örn. 500"
                          className="input-field w-full px-4 py-2.5 border rounded-xl bg-slate-50 focus:ring-2 focus:ring-teal-600 text-sm font-bold"
                        />
                      </div>
                    </div>

                    {/* DRAG & DROP IMAGE UPLOAD */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                      <ImageUpload
                        selectedImages={selectedImages}
                        onImagesChange={setSelectedImages}
                        maxImages={5}
                      />
                    </div>

                    {/* WHEEL PRIZE LISTS WITH PROBABILITY */}
                    <div className="space-y-4 bg-amber-500/5 p-5 rounded-3xl border border-amber-500/10">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="block text-[11px] font-black uppercase text-amber-800">ÇARK ÖDÜLLERİ VE ORAN KONFİGÜRASYONU</label>
                          <p className="text-[10px] opacity-75">
                            Kullanıcılara verilecek çark ödüllerini ve her ödülün çıkma olasılığını ayarlayın.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPrizes(JSON.parse(JSON.stringify(DEFAULT_PRIZES)))}
                          className="text-[10px] bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 px-3 py-1.5 rounded-lg border border-amber-500/20 font-black uppercase btn-base"
                        >
                          Varsayılan Paket Yükle
                        </button>
                      </div>

                      <div className="space-y-3">
                        {prizes.map((p, idx) => (
                          <div key={p.id} className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-center bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                            <div className="sm:col-span-2">
                              <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold mr-1.5">Sektör {idx + 1}</span>
                              <input 
                                type="text" 
                                required
                                value={p.text}
                                onChange={(e) => {
                                  const updated = [...prizes];
                                  updated[idx].text = e.target.value;
                                  setPrizes(updated);
                                }}
                                placeholder="Ödül Başlığı (örn. %10 İndirim)"
                                className="input-field px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-black inline-block w-40"
                              />
                            </div>
                            <div>
                              <label className="inline text-[10px] opacity-75 mr-1.5 font-bold">Olasılık (%):</label>
                              <input 
                                type="number" 
                                required
                                min={0}
                                max={100}
                                value={p.probability}
                                onChange={(e) => {
                                  const updated = [...prizes];
                                  updated[idx].probability = parseFloat(e.target.value) || 0;
                                  setPrizes(updated);
                                }}
                                className="input-field px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-black w-16"
                              />
                            </div>
                            <div>
                              <label className="inline text-[10px] opacity-75 mr-1.5 font-bold">Kod Öneki:</label>
                              <input 
                                type="text" 
                                required
                                value={p.codePrefix}
                                onChange={(e) => {
                                  const updated = [...prizes];
                                  updated[idx].codePrefix = e.target.value.replace(/[^A-Z0-9]/gi, "").toUpperCase();
                                  setPrizes(updated);
                                }}
                                placeholder="KOD"
                                className="input-field px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-bold w-20"
                              />
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center justify-between border-t border-amber-500/20 pt-3">
                        <span className={`text-xs font-black ${totalProbability === 100 ? "text-teal-600" : "text-rose-600"}`}>
                          Toplam Olasılık Yüzdesi: %{totalProbability}
                        </span>
                        {totalProbability !== 100 && (
                          <span className="text-[10px] font-bold text-rose-500 flex items-center gap-1">
                            ⚠️ HATA: Toplam tam olarak %100 olmalıdır!
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t">
                      <button
                        type="button"
                        onClick={() => { setIsCreating(false); setEditingCampaign(null); }}
                        className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-extrabold btn-base"
                      >
                        Vazgeç
                      </button>
                      <button
                        type="submit"
                        className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-black uppercase tracking-wider btn-base"
                      >
                        {editingCampaign ? "Güncelle ve Kaydet" : "Kampanyayı Yayınla"}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* LIST CAMPAIGNS TABLE */}
              <div className="bg-white rounded-3xl border border-teal-50 shadow-sm overflow-hidden">
                <div className="p-5 border-b flex flex-wrap items-center justify-between gap-4">
                  <h4 className="font-extrabold text-sm tracking-tight text-slate-800">Kayıtlı Kampanyalar Listesi</h4>
                  <span className="text-xs bg-teal-50 text-teal-600 px-3 py-1 rounded-full font-bold">
                    Toplam: {campaignsList.length} adet
                  </span>
                </div>

                <div className="responsive-table overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-extrabold border-b">
                        <th className="p-4">Görsel</th>
                        <th className="p-4">Kampanya Adı</th>
                        <th className="p-4">Başlangıç - Bitiş</th>
                        <th className="p-4">Rozet</th>
                        <th className="p-4 text-center">Kota / Katılım</th>
                        <th className="p-4 text-center">Durum</th>
                        <th className="p-4 text-right">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {campaignsList.map((c) => {
                        let imgs: string[] = [];
                        try { imgs = JSON.parse(c.images); } catch (e) { imgs = [c.images]; }
                        const mainImg = imgs[0] || "https://images.unsplash.com/photo-1545127398-14699f92334b?auto=format&fit=crop&w=120&q=80";

                        return (
                          <tr key={c.id} className="hover:bg-slate-50/50">
                            <td className="p-4">
                              <img src={mainImg} alt="" className="w-12 h-12 object-cover rounded-lg border shadow-sm" />
                            </td>
                            <td className="p-4">
                              <div className="max-w-[200px]">
                                <p className="font-black text-slate-800 truncate">{c.name}</p>
                                <p className="opacity-60 text-[10px] line-clamp-1">{c.description}</p>
                              </div>
                            </td>
                            <td className="p-4 text-[10px]">
                              <p>Bşl: {new Date(c.startDate).toLocaleString("tr-TR")}</p>
                              <p>Btş: {new Date(c.endDate).toLocaleString("tr-TR")}</p>
                            </td>
                            <td className="p-4">
                              <span className="bg-teal-50 text-teal-700 font-black px-2 py-0.5 rounded text-[10px]">{c.badge}</span>
                            </td>
                            <td className="p-4 text-center">
                              <p className="font-bold">{c.quotaUsed} / {c.quota}</p>
                              <div className="w-16 bg-slate-100 h-1.5 rounded-full mx-auto mt-1 overflow-hidden">
                                <div 
                                  style={{ width: `${Math.min(100, (c.quotaUsed / c.quota) * 100)}%` }}
                                  className="bg-teal-600 h-full"
                                ></div>
                              </div>
                            </td>
                            <td className="p-4 text-center">
                              <button
                                onClick={() => handleToggleActive(c)}
                                className={`px-2.5 py-1 rounded-full font-bold text-[10px] transition-all btn-base ${
                                  c.active 
                                    ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100" 
                                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                }`}
                              >
                                {c.active ? "Aktif" : "Pasif"}
                              </button>
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end space-x-1">
                              <button 
                                onClick={() => openEditModal(c)}
                                className="p-1.5 hover:bg-teal-50 text-teal-600 rounded-lg btn-base"
                                title="Düzenle"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleDeleteCampaign(c.id)}
                                className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg btn-base"
                                title="Sil"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {campaignsList.length === 0 && (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-slate-400">Henüz kampanya eklenmemiş. "Yeni Kampanya Oluştur" butonuyla ekleyebilirsiniz.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}


          {/* VIEW 3: CAMPAIGN PARTICIPATIONS */}
          {activeTab === "participations" && (
            <div className="space-y-6">
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-black text-slate-800">Kampanyaya Katılanlar Günlüğü</h3>
                  <p className="text-xs opacity-75">Ön yüzde "Kampanyaya Katıl" formunu dolduran gerçek kişilerin kayıt listesi.</p>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => exportToCSV("participations")}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase rounded-xl transition-all shadow flex items-center gap-1.5 btn-base"
                  >
                    <FileSpreadsheet className="w-4 h-4" /> Excel / CSV Aktar
                  </button>
                </div>
              </div>

              {/* SEARCH FILTER */}
              <div className="bg-white p-4 rounded-2xl border border-teal-50 shadow-sm">
                <input 
                  type="text"
                  placeholder="İsim, soyisim veya telefon son 4 hanesine göre listeyi filtreleyin..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-field w-full px-4 py-2.5 border rounded-xl bg-slate-50 focus:ring-2 focus:ring-teal-600 text-sm font-bold"
                />
              </div>

              {/* PARTICIPANTS LOG LIST TABLE */}
              <div className="bg-white rounded-3xl border border-teal-50 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-extrabold border-b">
                        <th className="p-4">Müşteri Adı Soyadı</th>
                        <th className="p-4">Tam Telefon</th>
                        <th className="p-4 text-center">Son 4 Hane</th>
                        <th className="p-4">Hangi Kampanya?</th>
                        <th className="p-4 text-center">Güvenlik (IP / Cookie)</th>
                        <th className="p-4">Katılma Tarihi</th>
                        <th className="p-4 text-right">WhatsApp Takip</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                      {(() => {
                        const filtered = participationsList.filter((p) => {
                          const query = searchQuery.toLowerCase();
                          const campaign = campaignsList.find(c => c.id === p.campaignId);
                          const campName = campaign ? campaign.name.toLowerCase() : "";
                          return p.firstName.toLowerCase().includes(query) || 
                                 p.lastName.toLowerCase().includes(query) || 
                                 p.phoneLastFour.includes(query) ||
                                 p.fullPhone.includes(query) ||
                                 campName.includes(query);
                        });

                        return filtered.map((p) => {
                          const campaign = campaignsList.find(c => c.id === p.campaignId);
                          
                          // WhatsApp direct follow-up shortcut link
                          const followupText = `Merhaba ${p.firstName} ${p.lastName}, Arya Terzi Kuru Temizleme'den yazıyoruz. Katıldığınız "${campaign ? campaign.name : 'Kampanyamız'}" hakkında detaylı bilgi ve teslim alma randevusu için size yardımcı olabiliriz. Ne zaman müsaitsiniz?`;
                          const whatsappDirectUrl = getWhatsAppUrl(p.fullPhone, followupText);

                          return (
                            <tr key={p.id} className="hover:bg-slate-50/50">
                              <td className="p-4">
                                <span className="font-black text-slate-900">{p.firstName} {p.lastName}</span>
                              </td>
                              <td className="p-4">
                                <span className="font-mono text-slate-600 bg-slate-100 px-2 py-1 rounded font-bold">{p.fullPhone}</span>
                              </td>
                              <td className="p-4 text-center font-mono text-xs font-black bg-amber-500/10 text-amber-800 rounded">
                                {p.phoneLastFour}
                              </td>
                              <td className="p-4">
                                <span className="text-teal-600 font-extrabold max-w-[150px] truncate block">{campaign ? campaign.name : `ID: ${p.campaignId}`}</span>
                              </td>
                              <td className="p-4 text-[10px] text-slate-500">
                                <p>IP: {p.ipAddress}</p>
                                <p className="opacity-65 truncate max-w-[100px]">ID: {p.cookieId}</p>
                              </td>
                              <td className="p-4 text-slate-500">
                                {new Date(p.createdAt).toLocaleString("tr-TR")}
                              </td>
                              <td className="p-4 text-right">
                                <a
                                  href={whatsappDirectUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 font-bold px-3 py-1.5 rounded-lg border border-emerald-100 transition-all text-[10px] btn-base"
                                >
                                  WhatsApp Mesajı <ExternalLink className="w-3 h-3" />
                                </a>
                              </td>
                            </tr>
                          );
                        });
                      })()}
                      {participationsList.length === 0 && (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-slate-400">Henüz kampanya katılımı rezerve edilmedi.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}


          {/* VIEW 4: WHEEL SPINNER WINNERS LOGS */}
          {activeTab === "winners" && (
            <div className="space-y-6">
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-black text-slate-800">Şans Çarkı Ödül Kazananları Günlüğü</h3>
                  <p className="text-xs opacity-75">Ön yüzde "Çarkı Çevir" sonrasında ödül kazananların benzersiz kupon bilgileri.</p>
                </div>

                <button
                  onClick={() => exportToCSV("winners")}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase rounded-xl transition-all shadow flex items-center gap-1.5 btn-base"
                >
                  <FileSpreadsheet className="w-4 h-4" /> Excel / CSV Aktar
                </button>
              </div>

              {/* SEARCH FILTER */}
              <div className="bg-white p-4 rounded-2xl border border-teal-50 shadow-sm">
                <input 
                  type="text"
                  placeholder="İsim, soyisim, ödül veya kupon koduna göre listeyi filtreleyin..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-field w-full px-4 py-2.5 border rounded-xl bg-slate-50 focus:ring-2 focus:ring-teal-600 text-sm font-bold"
                />
              </div>

              {/* WINNERS LOGS LIST TABLE */}
              <div className="bg-white rounded-3xl border border-teal-50 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-extrabold border-b">
                        <th className="p-4">Kazanan Müşteri</th>
                        <th className="p-4">Kazanılan Ödül</th>
                        <th className="p-4">Kupon Kodu</th>
                        <th className="p-4 text-center">Kupon Geçerlilik (Kasada)</th>
                        <th className="p-4">Kampanya Adı</th>
                        <th className="p-4">Tarih</th>
                        <th className="p-4 text-right">İletişime Geç</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                      {(() => {
                        const filtered = winnersList.filter((w) => {
                          const query = searchQuery.toLowerCase();
                          const campaign = campaignsList.find(c => c.id === w.campaignId);
                          const campName = campaign ? campaign.name.toLowerCase() : "";
                          return w.firstName.toLowerCase().includes(query) || 
                                 w.lastName.toLowerCase().includes(query) || 
                                 w.prizeWon.toLowerCase().includes(query) ||
                                 w.promoCode.toLowerCase().includes(query) ||
                                 campName.includes(query);
                        });

                        return filtered.map((w) => {
                          const campaign = campaignsList.find(c => c.id === w.campaignId);
                          
                          // WhatsApp direct communication for winners
                          const followupText = `Merhaba ${w.firstName} ${w.lastName}, Arya Terzi Kuru Temizleme'den yazıyoruz. Çarktan kazandığınız "${w.prizeWon}" ödülünü tebrik ederiz! ${w.promoCode} kupon kodunuzu doğrulamak ve mağazamızda indirimli hizmetlerinizi rezerve etmek için size yardımcı olabiliriz. Ne zaman kıyafetlerinizi almamızı istersiniz?`;
                          const whatsappDirectUrl = getWhatsAppUrl(w.fullPhone, followupText);

                          return (
                            <tr key={w.id} className="hover:bg-slate-50/50">
                              <td className="p-4">
                                <p className="font-black text-slate-900">{w.firstName} {w.lastName}</p>
                                <p className="text-[10px] text-slate-500 font-mono font-bold">{w.fullPhone}</p>
                              </td>
                              <td className="p-4">
                                <span className="bg-amber-100 text-amber-800 font-extrabold px-2.5 py-1 rounded text-[10px] inline-block">{w.prizeWon}</span>
                              </td>
                              <td className="p-4">
                                <span className="font-mono text-teal-600 font-black tracking-wider bg-teal-50 px-2 py-1 rounded border border-teal-100 text-[11px] block text-center max-w-[130px]">
                                  {w.promoCode}
                                </span>
                              </td>
                              <td className="p-4 text-center">
                                <button
                                  onClick={() => handleTogglePromoUsed(w.id, w.used)}
                                  className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border btn-base ${
                                    w.used 
                                      ? "bg-slate-100 text-slate-400 border-slate-200" 
                                      : "bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-500 shadow-sm"
                                  }`}
                                >
                                  {w.used ? "Kullanıldı" : "Kullanılmadı"}
                                </button>
                              </td>
                              <td className="p-4 text-slate-500 max-w-[120px] truncate">
                                {campaign ? campaign.name : `Kampanya ID: ${w.campaignId}`}
                              </td>
                              <td className="p-4 text-slate-400 text-[10px]">
                                {new Date(w.createdAt).toLocaleString("tr-TR")}
                              </td>
                              <td className="p-4 text-right">
                                <a
                                  href={whatsappDirectUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 font-bold px-3 py-1.5 rounded-lg border border-emerald-100 transition-all text-[10px] btn-base"
                                >
                                  Kazananı Ara/Yaz <ExternalLink className="w-3 h-3" />
                                </a>
                              </td>
                            </tr>
                          );
                        });
                      })()}
                      {winnersList.length === 0 && (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-slate-400">Henüz çark kazananı bulunmuyor.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}


          {/* VIEW 5: MUSIC MANAGEMENT */}
          {activeTab === "music" && (
            <div className="space-y-6">

              <div>
                <h3 className="text-xl font-black text-slate-800">Müzik Yönetimi</h3>
                <p className="text-xs opacity-75">Ana sayfada 15 saniyede bir dönecek arka plan müziklerini ekleyin.</p>
              </div>

              {/* ADD MUSIC FORM */}
              <div className="bg-white rounded-2xl border border-teal-50 shadow-sm p-6 space-y-4">
                <h4 className="text-sm font-black text-teal-600 uppercase tracking-wider">Yeni Müzik Ekle</h4>
                {musicError && (
                  <div className="p-3 bg-rose-500/10 text-rose-600 rounded-xl text-xs font-bold flex items-center gap-2 border border-rose-500/20">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{musicError}</span>
                  </div>
                )}
                <form onSubmit={handleAddMusic} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider mb-1 opacity-80">Müzik Adı</label>
                    <input
                      type="text"
                      required
                      value={musicName}
                      onChange={(e) => setMusicName(e.target.value)}
                      placeholder="Örn: Yaz Melodileri"
                      className="w-full px-4 py-2.5 rounded-xl border border-teal-500/10 bg-slate-50 focus:ring-2 focus:ring-teal-500 focus:outline-none text-sm font-bold input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider mb-1 opacity-80">Müzik Dosyası Yükle (mp3, wav, ogg)</label>
                    <MusicUpload onUploadComplete={handleMusicFileUploaded} />
                    {musicUrl && (
                      <p className="text-[10px] text-teal-600 font-semibold mt-1 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Dosya yüklendi
                      </p>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={addingMusic}
                    className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow btn-base ${
                      addingMusic
                        ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                        : "bg-teal-600 hover:bg-teal-700 text-white"
                    }`}
                  >
                    {addingMusic ? "Ekleniyor..." : "Müzik Ekle"}
                  </button>
                </form>
              </div>

              {/* MUSIC LIST */}
              <div className="bg-white rounded-3xl border border-teal-50 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-extrabold border-b">
                        <th className="p-4">ID</th>
                        <th className="p-4">Müzik Adı</th>
                        <th className="p-4">URL</th>
                        <th className="p-4">Durum</th>
                        <th className="p-4">Eklenme Tarihi</th>
                        <th className="p-4 text-right">İşlem</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                      {musicList.map((track) => (
                        <tr key={track.id} className="hover:bg-slate-50/50">
                          <td className="p-4 text-slate-400">{track.id}</td>
                          <td className="p-4 font-black text-slate-900">{track.name}</td>
                          <td className="p-4 max-w-[200px] truncate text-teal-600">
                            <a href={track.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                              {track.url}
                            </a>
                          </td>
                          <td className="p-4">
                            <button
                              onClick={() => handleToggleMusic(track.id, track.active)}
                              className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold transition-all cursor-pointer btn-base ${
                                track.active
                                  ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                              }`}
                              title={track.active ? "Pasif Yap" : "Aktif Yap"}
                            >
                              {track.active ? "Aktif" : "Pasif"}
                            </button>
                          </td>
                          <td className="p-4 text-slate-400 text-[10px]">
                            {new Date(track.createdAt).toLocaleString("tr-TR")}
                          </td>
                          <td className="p-4 text-right">
                            <button
                              onClick={() => handleDeleteMusic(track.id)}
                              className="p-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-500 transition-all btn-base"
                              title="Sil"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {musicList.length === 0 && (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-slate-400">Henüz müzik eklenmemiş.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* VIEW 6: IMAGE MANAGEMENT */}
          {activeTab === "images" && (
            <AdminImageManager />
          )}

        </main>

      </div>
    </div>
  );
}
