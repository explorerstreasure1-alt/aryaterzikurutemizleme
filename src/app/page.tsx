"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
  getOrCreateVisitorId, 
  playSound, 
  getWhatsAppUrl, 
  ARYA_WHATSAPP_PHONE 
} from "./utils";
import { 
  Sparkles, 
  Clock, 
  User, 
  Phone, 
  Share2, 
  Info, 
  Gift, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  Moon, 
  Sun, 
  ChevronLeft, 
  ChevronRight, 
  Flame, 
  Layers, 
  Calendar,
  Lock,
  ExternalLink
} from "lucide-react";

interface Campaign {
  id: number;
  name: string;
  description: string;
  startDate: string | Date;
  endDate: string | Date;
  images: string; // JSON array of string URLs
  quota: number;
  quotaUsed: number;
  badge: string;
  prizes: string; // JSON array of prizes
  active: boolean;
}

interface Prize {
  id: number;
  text: string;
  probability: number;
  codePrefix: string;
}

export default function UserHomePage() {
  const [campaignsList, setCampaignsList] = useState<Campaign[]>([]);
  const [filter, setFilter] = useState<"all" | "ongoing" | "ending_soon">("all");
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [visitorId, setVisitorId] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  // Carousel slider indexes
  const [carouselIndexes, setCarouselIndexes] = useState<Record<number, number>>({});

  // Countdown timers
  const [timeRemaining, setTimeRemaining] = useState<Record<number, {
    days: number; hours: number; minutes: number; seconds: number; totalSeconds: number; status?: string;
  }>>({});

  // Modals state
  const [activeJoinCampaign, setActiveJoinCampaign] = useState<Campaign | null>(null);
  const [activeLearnDetails, setActiveLearnDetails] = useState<Campaign | null>(null);
  const [activeWheelCampaign, setActiveWheelCampaign] = useState<Campaign | null>(null);
  
  // High-urgency alert popup state (ending in < 1 hour)
  const [urgencyAlert, setUrgencyAlert] = useState<{ campaign: Campaign; timeString: string } | null>(null);
  // Use ref instead of state to avoid useEffect dependency cycle
  const hasShownUrgencyRef = useRef<Record<number, boolean>>({});

  // State for form registrations
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [fullPhone, setFullPhone] = useState("");
  const [phoneLastFour, setPhoneLastFour] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<boolean>(false);
  const [registeredPromoCode, setRegisteredPromoCode] = useState<string | null>(null);

  // Wheel specific state
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedPrize, setSelectedPrize] = useState<Prize | null>(null);
  const [spinPromoCode, setSpinPromoCode] = useState<string | null>(null);
  const [spinError, setSpinError] = useState<string | null>(null);
  const [rotationDegrees, setRotationDegrees] = useState(0);
  const [spinState, setSpinState] = useState<"idle" | "drawn" | "claimed">("idle");
  const [shareBonusCode, setShareBonusCode] = useState<string | null>(null);

  // Fetch all campaigns and register visitor cookie
  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/campaigns");
      if (res.ok) {
        const data = await res.json();
        setCampaignsList(data);
      }
    } catch (err) {
      console.error("Kampanyalar yüklenirken hata oluştu:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
    const vid = getOrCreateVisitorId();
    setVisitorId(vid);

    // Read dark mode preferences
    const isDark = localStorage.getItem("arya_theme") === "dark";
    setDarkMode(isDark);
  }, []);

  // Theme toggle
  const toggleTheme = () => {
    const nextTheme = !darkMode;
    setDarkMode(nextTheme);
    localStorage.setItem("arya_theme", nextTheme ? "dark" : "light");
  };

  // Calculate countdown timers for all campaigns
  const calculateTimers = useCallback(() => {
    const newTimers: Record<number, any> = {};
    let hasNewUrgency = false;
    let urgencyCampaign: Campaign | null = null;
    let urgencyMinutes = 0;

    campaignsList.forEach((c) => {
      const end = new Date(c.endDate).getTime();
      const start = new Date(c.startDate).getTime();
      const now = Date.now();

      // Kampanya henüz başlamadıysa
      if (now < start) {
        newTimers[c.id] = { days: 0, hours: 0, minutes: 0, seconds: 0, totalSeconds: -1, status: "Başlamadı" };
        return;
      }

      // end date geçersizse (NaN) hata koruması
      if (isNaN(end) || isNaN(start)) {
        newTimers[c.id] = { days: 0, hours: 0, minutes: 0, seconds: 0, totalSeconds: 0, status: "Hatalı Tarih" };
        return;
      }

      const diffMs = end - now;
      const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));

      if (totalSeconds === 0) {
        newTimers[c.id] = { days: 0, hours: 0, minutes: 0, seconds: 0, totalSeconds: 0, status: "Bitti" };
        return;
      }

      const days = Math.floor(totalSeconds / (24 * 3600));
      const hours = Math.floor((totalSeconds % (24 * 3600)) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      newTimers[c.id] = { days, hours, minutes, seconds, totalSeconds, status: "Devam Ediyor" };

      // Aciliyet uyarısı: 1 saatten az kaldıysa ve daha gösterilmediyse
      if (totalSeconds > 0 && totalSeconds <= 3600 && !hasShownUrgencyRef.current[c.id]) {
        hasShownUrgencyRef.current[c.id] = true;
        hasNewUrgency = true;
        urgencyCampaign = c;
        urgencyMinutes = Math.ceil(totalSeconds / 60);
      }
    });

    setTimeRemaining(newTimers);
    if (hasNewUrgency && urgencyCampaign) {
      setUrgencyAlert({
        campaign: urgencyCampaign,
        timeString: `${urgencyMinutes} dakika`
      });
    }
  }, [campaignsList]);

  // Timer interval to tick countdowns
  useEffect(() => {
    if (campaignsList.length === 0) return;

    // Hemen ilk hesaplamayı yap — "Zaman hesaplanıyor..." beklemesi olmaz
    calculateTimers();

    const interval = setInterval(calculateTimers, 1000);
    return () => clearInterval(interval);
  }, [campaignsList, calculateTimers]);

  // Automatic carousel image rotation (20 seconds)
  useEffect(() => {
    if (campaignsList.length === 0) return;

    const interval = setInterval(() => {
      setCarouselIndexes((prev) => {
        const updated = { ...prev };
        campaignsList.forEach((c) => {
          let imgs: string[] = [];
          try {
            imgs = JSON.parse(c.images);
          } catch (e) {
            imgs = [];
          }
          if (imgs.length > 1) {
            const currentIdx = prev[c.id] || 0;
            updated[c.id] = (currentIdx + 1) % imgs.length;
          }
        });
        return updated;
      });
    }, 20000);

    return () => clearInterval(interval);
  }, [campaignsList]);

  // Filter campaigns
  const filteredCampaigns = campaignsList.filter((c) => {
    if (!c.active) return false;
    const timer = timeRemaining[c.id];
    if (!timer) return true; // Show until timers resolve

    if (filter === "ongoing") {
      return timer.totalSeconds > 0;
    }
    if (filter === "ending_soon") {
      // Ending soon if total seconds is greater than 0 but less than 48 hours (172800 seconds)
      return timer.totalSeconds > 0 && timer.totalSeconds <= 172800;
    }
    return true; // "all"
  });

  // Action: Open join campaign modal
  const handleOpenJoin = (campaign: Campaign) => {
    setActiveJoinCampaign(campaign);
    setFirstName("");
    setLastName("");
    setFullPhone("");
    setPhoneLastFour("");
    setActionError(null);
    setActionSuccess(false);
  };

  // Submit join form
  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeJoinCampaign) return;
    setActionError(null);

    // Validations
    if (!firstName.trim() || !lastName.trim()) {
      setActionError("Lütfen isim ve soyisminizi giriniz.");
      return;
    }
    if (fullPhone.replace(/\D/g, "").length < 10) {
      setActionError("Lütfen geçerli bir telefon numarası giriniz (en az 10 hane).");
      return;
    }
    if (phoneLastFour.replace(/\D/g, "").length !== 4) {
      setActionError("Telefon numaranızın son 4 hanesi doğrulamak için zorunludur.");
      return;
    }

    try {
      const res = await fetch("/api/participations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId: activeJoinCampaign.id,
          firstName,
          lastName,
          fullPhone,
          phoneLastFour,
          cookieId: visitorId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setActionError(data.message || data.error || "Bir hata oluştu.");
      } else {
        setActionSuccess(true);
        // Refresh campaign to show updated quotas
        fetchCampaigns();
      }
    } catch (err) {
      setActionError("İletişim hatası oluştu, lütfen tekrar deneyin.");
    }
  };

  // Action: Wheel Spin initiation
  const handleOpenWheel = (campaign: Campaign) => {
    setActiveWheelCampaign(campaign);
    setIsSpinning(false);
    setSelectedPrize(null);
    setSpinPromoCode(null);
    setSpinError(null);
    setSpinState("idle");
    setShareBonusCode(null);
    setFirstName("");
    setLastName("");
    setFullPhone("");
    setPhoneLastFour("");
  };

  // Trigger spin on server & animate on client
  const triggerWheelSpin = async () => {
    if (!activeWheelCampaign || isSpinning) return;
    setIsSpinning(true);
    setSpinError(null);

    try {
      // 1. Fetch server-side predetermined winner
      const res = await fetch("/api/spin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId: activeWheelCampaign.id,
          cookieId: visitorId,
          action: "draw"
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setSpinError(data.message || data.error || "Çark çevirme işlemi başlatılamadı.");
        setIsSpinning(false);
        return;
      }

      const { prize, promoCode } = data;
      setSpinPromoCode(promoCode);
      
      // Determine rotation angle
      let prizesList: Prize[] = [];
      try {
        prizesList = JSON.parse(activeWheelCampaign.prizes);
      } catch (e) {
        prizesList = [];
      }

      const prizeIndex = prizesList.findIndex(p => p.id === prize.id);
      if (prizeIndex === -1) {
        setSpinError("Ödül eşleştirmesi yapılamadı.");
        setIsSpinning(false);
        return;
      }

      // 360 / length of prizes
      const segmentDegrees = 360 / prizesList.length;
      // Center of that prize segment
      const prizeCenterAngle = (prizeIndex * segmentDegrees) + (segmentDegrees / 2);
      
      // Calculate rotation. Pointer is at 0/360 degrees (the top). 
      // So to land on prizeCenterAngle, we rotate wheel by:
      const landingAngle = 360 - prizeCenterAngle;
      // Let's do 5 full rotations + landing angle
      const finalRotation = (360 * 6) + landingAngle;

      // Spin audio tick loops simulation
      let tickCount = 0;
      const totalTicks = 45;
      const tickInterval = setInterval(() => {
        if (tickCount < totalTicks) {
          playSound("tick");
          tickCount++;
        } else {
          clearInterval(tickInterval);
        }
      }, 90);

      // Animate rotation
      setRotationDegrees(finalRotation);

      setTimeout(() => {
        setIsSpinning(false);
        setSelectedPrize(prize);
        setSpinState("drawn");
        playSound("success");
      }, 5000); // 5 seconds spin animation

    } catch (err) {
      setSpinError("Çark çevrilirken ağ bağlantısı hatası oluştu.");
      setIsSpinning(false);
    }
  };

  // Submit prize claim form
  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWheelCampaign || !selectedPrize || !spinPromoCode) return;
    setSpinError(null);

    if (!firstName.trim() || !lastName.trim() || !fullPhone.trim() || !phoneLastFour.trim()) {
      setSpinError("Lütfen ödülünüzü kaydetmek için tüm alanları doldurun.");
      return;
    }

    try {
      const res = await fetch("/api/spin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId: activeWheelCampaign.id,
          firstName,
          lastName,
          fullPhone,
          phoneLastFour,
          cookieId: visitorId,
          action: "claim",
          selectedPrizeText: selectedPrize.text,
          promoCodeOverride: spinPromoCode
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setSpinError(data.message || data.error || "Ödül kaydedilemedi.");
      } else {
        setSpinState("claimed");
      }
    } catch (err) {
      setSpinError("Ödülünüz kaydedilirken ağ hatası oluştu.");
    }
  };

  // Scroll-lock + esc-close for modals
  const anyModalOpen = activeJoinCampaign !== null || activeWheelCampaign !== null;
  const modalRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    const body = document.body;
    if (anyModalOpen) {
      const scrollbarWidth = window.innerWidth - body.clientWidth;
      body.style.setProperty("--scrollbar-width", `${scrollbarWidth}px`);
      body.classList.add("scroll-locked");
    } else {
      body.classList.remove("scroll-locked");
    }
    return () => body.classList.remove("scroll-locked");
  }, [anyModalOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (activeWheelCampaign && !isSpinning) {
          setActiveWheelCampaign(null);
        } else if (activeJoinCampaign) {
          setActiveJoinCampaign(null);
        }
      }
    };
    if (anyModalOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [activeJoinCampaign, activeWheelCampaign, isSpinning, anyModalOpen]);

  // Social trigger for Paylaş & Kazan
  const handleShareAndGainBonus = async () => {
    if (!activeWheelCampaign) return;
    
    // Construct WhatsApp share link to friend
    const shareText = `Arya Terzi Kuru Temizleme'de harika bir kampanya keşfettim! "${activeWheelCampaign.name}" kampanyasına hemen katıl, çarkı çevirip sürpriz indirimler ve ücretsiz hizmetler kazan! 🎁👇\n\nSiteyi ziyaret et: ${window.location.origin}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    
    // Open share link
    window.open(whatsappUrl, "_blank");

    // Simulated network call to register bonus
    try {
      const res = await fetch("/api/spin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId: activeWheelCampaign.id,
          firstName,
          lastName,
          fullPhone,
          phoneLastFour,
          cookieId: visitorId,
          action: "share-bonus"
        })
      });

      if (res.ok) {
        const data = await res.json();
        setShareBonusCode(data.promoCode);
        playSound("success");
      }
    } catch (err) {
      console.error("Referral bonus failed:", err);
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? "bg-slate-950 text-slate-100" : "bg-[#FEFCF5] text-teal-950 rose-pattern-bg"}`}>
      
      {/* HEADER SECTION */}
      <header className={`sticky top-0 z-40 backdrop-blur-md border-b transition-all ${darkMode ? "bg-slate-900/90 border-teal-900" : "bg-white/90 border-teal-100"}`}>
        <div className="max-w-6xl mx-auto px-3 md:px-4 py-3 md:py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2 md:space-x-3 min-w-0">
            <div className="bg-teal-600 text-white p-2 md:p-2.5 rounded-2xl shadow-md flex items-center justify-center needle-logo shrink-0">
              {/* Needle/Pin Logo */}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5 md:w-6 md:h-6">
                <path d="M10 6L20 16L8 22L6 20L2 18L10 6Z" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M10 6L16 2L20 6L18 10" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="8" cy="18" r="1.5" fill="currentColor" stroke="none"/>
              </svg>
            </div>
            <div className="min-w-0">
              <h1 className="text-base md:text-xl lg:text-2xl font-black tracking-tight flex flex-wrap items-center gap-1 text-teal-600">
                ARYA TERZİ <span className="text-amber-500 font-medium text-[10px] md:text-xs bg-amber-500/10 px-1.5 md:px-2 py-0.5 rounded-full border border-amber-500/20 whitespace-nowrap">KURU TEMİZLEME</span>
              </h1>
              <p className="text-[9px] md:text-xs font-bold opacity-80 tracking-wider uppercase">Süper Kampanya Makinesi</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 md:space-x-3 shrink-0">
            <a 
              href="/admin" 
              className="px-2.5 md:px-3.5 py-1.5 rounded-xl text-[10px] md:text-xs font-bold border border-teal-500/30 text-teal-600 hover:bg-teal-500 hover:text-white transition-all flex items-center gap-1"
            >
              <Lock className="w-2.5 h-2.5 md:w-3 md:h-3" /> <span className="hidden xs:inline">Admin</span>
            </a>
            
            <button 
              onClick={toggleTheme}
              className={`p-2 md:p-2.5 rounded-xl border transition-all btn-base ${darkMode ? "bg-slate-800 border-slate-700 hover:bg-slate-700 text-amber-400" : "bg-teal-50/50 border-teal-100 hover:bg-teal-100/50 text-teal-600"}`}
              title={darkMode ? "Aydınlık Mod" : "Karanlık Mod"}
            >
              {darkMode ? <Sun className="w-3.5 h-3.5 md:w-4 md:h-4" /> : <Moon className="w-3.5 h-3.5 md:w-4 md:h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* HERO HERO SÜPER BANNER */}
      <section className={`relative overflow-hidden py-10 md:py-20 border-b ${darkMode ? "bg-gradient-to-br from-slate-950 via-teal-950/20 to-slate-950 border-slate-900" : "bg-gradient-to-br from-[#FEFCF5] via-teal-50/30 to-[#f8f4e8] border-teal-50"}`}>
        <div className="max-w-4xl mx-auto text-center px-3 md:px-4 relative z-10">
          <div className="inline-flex items-center gap-1.5 md:gap-2 bg-teal-500/10 text-teal-600 px-2 md:px-3 py-1 md:py-1.5 rounded-full text-[10px] md:text-xs font-bold mb-3 md:mb-4 border border-teal-500/20">
            <Flame className="w-3 h-3 md:w-3.5 md:h-3.5 text-amber-500 animate-bounce" /> %100 GERÇEK VE ANLIK HEDİYELİ ÇARK OYUNU
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-black tracking-tight mb-3 md:mb-4 text-teal-600 leading-tight">
            Kuru Temizlemede <br />
            <span className="text-teal-900 dark:text-teal-100 bg-gradient-to-r from-teal-500 to-emerald-500 bg-clip-text text-transparent">Süper Fırsat Banner&rsquo;ları</span>
          </h2>
          <p className="text-sm sm:text-base md:text-xl opacity-85 max-w-2xl mx-auto mb-6 md:mb-8 leading-relaxed">
            Arya Terzi&rsquo;den kaçırılmayacak fırsatlar! Geri sayım bitmeden kampanyaya katılın, şans çarkını çevirin ve anında indirim kodları ile hediyeler kazanın!
          </p>

          {/* FILTER TABS */}
          <div className="flex flex-wrap items-center justify-center gap-2 max-w-md mx-auto p-1.5 rounded-2xl bg-white dark:bg-slate-900 shadow-xl border border-teal-500/10">
            <button
              onClick={() => setFilter("all")}
              className={`flex-1 px-4 py-2 rounded-xl text-xs font-bold transition-all btn-base ${filter === "all" ? "bg-teal-600 text-white shadow-md" : "text-slate-500 hover:text-teal-600 dark:text-slate-400"}`}
            >
              Tüm Kampanyalar
            </button>
            <button
              onClick={() => setFilter("ongoing")}
              className={`flex-1 px-4 py-2 rounded-xl text-xs font-bold transition-all btn-base ${filter === "ongoing" ? "bg-teal-600 text-white shadow-md" : "text-slate-500 hover:text-teal-600 dark:text-slate-400"}`}
            >
              Aktif Olanlar
            </button>
            <button
              onClick={() => setFilter("ending_soon")}
              className={`flex-1 px-4 py-2 rounded-xl text-xs font-bold transition-all btn-base flex items-center justify-center gap-1 ${filter === "ending_soon" ? "bg-amber-500 text-white shadow-md" : "text-slate-500 hover:text-amber-500 dark:text-slate-400"}`}
            >
              <Clock className="w-3 h-3 animate-spin" /> Son 48 Saat!
            </button>
          </div>
        </div>

        {/* Decorative background grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
      </section>

      {/* CAMPAIGN BANNER FLOW */}
      <main className="max-w-5xl mx-auto px-4 py-12">
        {loading ? (
          <div className="text-center py-24 space-y-4">
            <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-sm font-semibold opacity-75">Kampanyalar ve Çark Hazırlanıyor...</p>
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-teal-200 dark:border-teal-900 p-8 shadow-xl">
            <Gift className="w-16 h-16 text-amber-500 mx-auto mb-4 animate-bounce" />
            <h3 className="text-xl font-bold mb-2 text-teal-800 dark:text-teal-200">Aradığınız Kritere Uygun Kampanya Bulunmuyor</h3>
            <p className="text-sm opacity-75 max-w-sm mx-auto mb-6">
              Şu anda aktif veya bitmek üzere olan kampanya kaydı bulunamadı. Lütfen filtreyi değiştirin ya da daha sonra tekrar ziyaret edin.
            </p>
            <button 
              onClick={() => setFilter("all")} 
              className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition-all btn-base"
            >
              Tümünü Göster
            </button>
          </div>
        ) : (
          <div className="space-y-16">
            {filteredCampaigns.map((campaign) => {
              // Parse images
              let imagesList: string[] = [];
              try {
                imagesList = JSON.parse(campaign.images);
              } catch (e) {
                imagesList = [];
              }
              if (imagesList.length === 0) {
                imagesList = ["https://images.unsplash.com/photo-1545127398-14699f92334b?auto=format&fit=crop&w=1200&q=80"];
              }

              const currentImgIdx = carouselIndexes[campaign.id] || 0;
              const timer = timeRemaining[campaign.id];
              const isQuotaFull = campaign.quotaUsed >= campaign.quota;

              // Generate custom pre-filled WhatsApp link for this specific campaign details
              const learnMoreMsg = `Merhaba Arya Terzi, web sitenizdeki "${campaign.name}" kampanyası hakkında detaylı bilgi alabilir miyim?`;
              const learnMoreUrl = getWhatsAppUrl(ARYA_WHATSAPP_PHONE, learnMoreMsg);

              return (
                <div 
                  key={campaign.id}
                  className={`relative overflow-hidden rounded-3xl transition-all duration-300 border shadow-2xl group ${darkMode ? "bg-slate-900 border-teal-900/60 hover:border-teal-500/40" : "bg-white border-teal-100 hover:border-teal-300"}`}
                >
                  
                  {/* TOP BADGE BANNER */}
                  <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                    <span className="bg-red-500 text-white text-[11px] font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-md shadow-red-500/20">
                      {campaign.badge || "Flaş Fırsat"}
                    </span>

                    {/* Quota indicator */}
                    <span className={`text-[11px] font-bold px-3 py-1 rounded-full shadow-md ${isQuotaFull ? "bg-slate-600 text-white" : "bg-amber-500 text-slate-950"}`}>
                      {isQuotaFull ? "Kontenjan Dolu!" : `İlk ${campaign.quota} Kişiye Özel (Kalan: ${campaign.quota - campaign.quotaUsed})`}
                    </span>
                  </div>

                  {/* DOUBLE IMAGE CAROUSEL OR STATIC BANNER IMAGE */}
                  <div className="relative h-52 sm:h-72 md:h-[450px] w-full overflow-hidden bg-slate-100 dark:bg-slate-950">
                    <img 
                      src={imagesList[currentImgIdx]} 
                      alt={campaign.name}
                      className="w-full h-full object-cover transition-all duration-700 group-hover:scale-105"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1545127398-14699f92334b?auto=format&fit=crop&w=1200&q=80";
                      }}
                    />

                    {/* Gradient Overlay for modern legibility */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>

                    {/* Left/Right Carousel Controls (Only if > 1 image) */}
                    {imagesList.length > 1 && (
                      <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 flex items-center justify-between z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => {
                            setCarouselIndexes(prev => ({
                              ...prev,
                              [campaign.id]: (currentImgIdx - 1 + imagesList.length) % imagesList.length
                            }));
                          }}
                          className="bg-black/60 hover:bg-black/80 text-white p-2 rounded-full backdrop-blur-sm transition-all"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => {
                            setCarouselIndexes(prev => ({
                              ...prev,
                              [campaign.id]: (currentImgIdx + 1) % imagesList.length
                            }));
                          }}
                          className="bg-black/60 hover:bg-black/80 text-white p-2 rounded-full backdrop-blur-sm transition-all"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </div>
                    )}

                    {/* Carousel dots indicators */}
                    {imagesList.length > 1 && (
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex space-x-1.5 bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-sm">
                        {imagesList.map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setCarouselIndexes(prev => ({ ...prev, [campaign.id]: i }))}
                            className={`w-2 h-2 rounded-full transition-all ${i === currentImgIdx ? "bg-teal-400 w-4" : "bg-white/50 hover:bg-white"}`}
                          ></button>
                        ))}
                      </div>
                    )}

                    {/* FLOATING COUNTDOWN TIMER ON TOP OF BANNER */}
                    <div className="absolute right-2 sm:right-4 bottom-2 sm:bottom-4 z-20 bg-black/80 backdrop-blur-md p-2 sm:p-3 md:p-4 rounded-xl sm:rounded-2xl border border-white/10 text-white shadow-2xl">
                      <p className="text-[9px] md:text-[10px] uppercase font-bold tracking-wider text-teal-400 mb-1 md:mb-1.5 flex items-center gap-1">
                        <Clock className="w-3 h-3 md:w-3.5 md:h-3.5 animate-spin text-amber-400" /> Kalan Zaman:
                      </p>
                      
                      {timer ? (
                        timer.totalSeconds < 0 ? (
                          <span className="text-[10px] md:text-xs font-bold text-slate-300">{timer.status || "BAŞLAMADI"}</span>
                        ) : timer.totalSeconds === 0 ? (
                          <span className="text-xs md:text-sm font-black text-rose-500 uppercase">{timer.status || "SÜRE DOLDU!"}</span>
                        ) : (
                          <div className="flex items-center space-x-1 sm:space-x-2 font-mono">
                            <div className="text-center">
                              <span className="text-xs sm:text-sm md:text-xl font-black bg-white/10 px-1.5 sm:px-2 py-0.5 rounded text-amber-300 block">{String(timer.days).padStart(2, "0")}</span>
                              <span className="text-[7px] md:text-[8px] uppercase font-bold text-white/85">Gün</span>
                            </div>
                            <span className="text-[10px] md:text-xs font-bold animate-pulse text-white/70">:</span>
                            <div className="text-center">
                              <span className="text-xs sm:text-sm md:text-xl font-black bg-white/10 px-1.5 sm:px-2 py-0.5 rounded text-white block">{String(timer.hours).padStart(2, "0")}</span>
                              <span className="text-[7px] md:text-[8px] uppercase font-bold text-white/85">Saat</span>
                            </div>
                            <span className="text-[10px] md:text-xs font-bold animate-pulse text-white/70">:</span>
                            <div className="text-center">
                              <span className="text-xs sm:text-sm md:text-xl font-black bg-white/10 px-1.5 sm:px-2 py-0.5 rounded text-white block">{String(timer.minutes).padStart(2, "0")}</span>
                              <span className="text-[7px] md:text-[8px] uppercase font-bold text-white/85">Dk</span>
                            </div>
                            <span className="text-[10px] md:text-xs font-bold animate-pulse text-white/70">:</span>
                            <div className="text-center">
                              <span className="text-xs sm:text-sm md:text-xl font-black bg-white/10 px-1.5 sm:px-2 py-0.5 rounded text-red-400 block">{String(timer.seconds).padStart(2, "0")}</span>
                              <span className="text-[7px] md:text-[8px] uppercase font-bold text-white/85">Sn</span>
                            </div>
                          </div>
                        )
                      ) : (
                        <span className="text-[10px] md:text-xs text-white/70">Zaman hesaplanıyor...</span>
                      )}
                    </div>
                  </div>

                  {/* BANNER DESCRIPTION AND CTA ACTIONS */}
                  <div className="p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6">
                    <div className="space-y-1.5 sm:space-y-2">
                      <h3 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-teal-600 dark:text-teal-400">
                        {campaign.name}
                      </h3>
                      <p className="text-xs sm:text-sm md:text-base leading-relaxed text-slate-700 dark:text-slate-300">
                        {campaign.description}
                      </p>
                    </div>

                    {/* URGENCY ALERT BAR */}
                    {timer && timer.totalSeconds > 0 && timer.totalSeconds <= 3600 && (
                      <div className="flex items-center gap-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl text-[11px] sm:text-xs font-bold border border-amber-500/20 animate-pulse">
                        <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 shrink-0" />
                        <span>AMAN KAÇIRMA! Bu kampanyanın bitmesine {Math.ceil(timer.totalSeconds / 60)} dakika kaldı! Acele edin!</span>
                      </div>
                    )}

                    {/* THE THREE POWERFUL ACTIONS */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                      {/* 1. KAMPANYAYA KATIL */}
                      <button
                        onClick={() => handleOpenJoin(campaign)}
                        disabled={isQuotaFull || (timer && timer.totalSeconds <= 0)}
                        className={`py-3 sm:py-4 px-4 sm:px-6 rounded-xl sm:rounded-2xl font-black text-[11px] sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg btn-base ${
                          isQuotaFull || (timer && timer.totalSeconds <= 0)
                            ? "bg-slate-300 text-slate-500 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed"
                            : "bg-teal-600 hover:bg-teal-700 text-white hover:scale-[1.02] shadow-teal-600/20"
                        }`}
                      >
                        <User className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                        {isQuotaFull ? "Kontenjan Dolu" : "Kampanyaya Katıl"}
                      </button>

                      {/* 2. DETAYLARI ÖĞREN */}
                      <a
                        href={learnMoreUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-3 sm:py-4 px-4 sm:px-6 rounded-xl sm:rounded-2xl font-black text-[11px] sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg bg-emerald-600 hover:bg-emerald-700 text-white hover:scale-[1.02] shadow-emerald-600/20 text-center btn-base"
                      >
                        <Phone className="w-4 h-4 sm:w-4.5 sm:h-4.5 animate-bounce" />
                        Detayları Öğren
                      </a>

                      {/* 3. ÇARKI ÇEVİR */}
                      <button
                        onClick={() => handleOpenWheel(campaign)}
                        disabled={timer && timer.totalSeconds <= 0}
                        className={`py-3 sm:py-4 px-4 sm:px-6 rounded-xl sm:rounded-2xl font-black text-[11px] sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg btn-base ${
                          timer && timer.totalSeconds <= 0
                            ? "bg-slate-300 text-slate-500 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed"
                            : "bg-amber-500 hover:bg-amber-600 text-slate-950 hover:scale-[1.02] shadow-amber-500/20"
                        }`}
                      >
                        <Gift className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-red-700" />
                        Çarkı Çevir!
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className={`py-12 border-t mt-24 text-center text-xs text-slate-600 dark:text-slate-400 ${darkMode ? "bg-slate-900 border-slate-800" : "bg-teal-50/50 border-teal-100"}`}>
        <div className="max-w-4xl mx-auto px-4 space-y-4">
          <p className="font-extrabold text-teal-600 text-sm">ARYA TERZİ KURU TEMİZLEME</p>
          <p className="max-w-md mx-auto leading-relaxed">
            Halı, yorgan, battaniye, perde, mont, kaban ve tüm hassas giysileriniz için profesyonel kuru temizleme ve ütüleme çözümleri.
          </p>
          <p>
            Müşteri Destek Hattı: <a href={`https://wa.me/${ARYA_WHATSAPP_PHONE}`} className="underline font-bold text-teal-600">0555 182 37 76</a>
          </p>
          <p className="text-[10px] opacity-50">
            &copy; {new Date().getFullYear()} Arya Terzi Kuru Temizleme. Tüm hakları saklıdır. Bu portal tam yetkili pazarlama canavarıdır.
          </p>
        </div>
      </footer>


      {/* MODAL 1: KAMPANYAYA KATIL */}
      {activeJoinCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 modal-backdrop animate-fade-in overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 text-slate-950 dark:text-slate-100 rounded-2xl sm:rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-teal-500/20 relative my-4 sm:my-8">
            <button 
              onClick={() => setActiveJoinCampaign(null)} 
              className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:opacity-80 transition-all text-slate-600 dark:text-slate-300 z-10 btn-base"
            >
              <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            <div className="p-4 sm:p-6 md:p-8">
              <div className="inline-flex items-center gap-1.5 sm:gap-2 bg-teal-500/10 text-teal-600 px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold mb-3 sm:mb-4">
                <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Kampanya Kayıt Formu
              </div>

              <h3 className="text-lg sm:text-xl md:text-2xl font-black tracking-tight text-teal-600 mb-1.5 sm:mb-2">
                {activeJoinCampaign.name}
              </h3>
              <p className="text-[11px] sm:text-xs opacity-80 mb-4 sm:mb-6">
                Aşağıdaki alanları doldurarak bu kampanyadaki hakkınızı hemen rezerve edebilirsiniz. İndirim hakkınız anında sisteme tanımlanır.
              </p>

              {!actionSuccess ? (
                <form onSubmit={handleJoinSubmit} className="space-y-4">
                  {actionError && (
                    <div className="p-4 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold border border-rose-500/20 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{actionError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-black uppercase tracking-wider mb-1.5 opacity-80">Adınız</label>
                      <input 
                        type="text" 
                        required
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="Örn. Ahmet"
                        className="w-full px-4 py-3 rounded-xl border border-teal-500/10 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none text-sm font-bold input-field"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-black uppercase tracking-wider mb-1.5 opacity-80">Soyadınız</label>
                      <input 
                        type="text" 
                        required
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Örn. Yılmaz"
                        className="w-full px-4 py-3 rounded-xl border border-teal-500/10 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none text-sm font-bold input-field"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider mb-1.5 opacity-80">Telefon Numaranız</label>
                    <input 
                      type="tel" 
                      required
                      value={fullPhone}
                      onChange={(e) => setFullPhone(e.target.value)}
                      placeholder="Örn. 0555 123 45 67"
                      className="w-full px-4 py-3 rounded-xl border border-teal-500/10 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none text-sm font-bold input-field"
                    />
                    <p className="text-[10px] opacity-60 mt-1">İletişime geçmek ve WhatsApp doğrulaması için gereklidir.</p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider mb-1.5 opacity-80">Telefonun Son 4 Hanesi (Güvenlik)</label>
                    <input 
                      type="text" 
                      required
                      maxLength={4}
                      value={phoneLastFour}
                      onChange={(e) => setPhoneLastFour(e.target.value.replace(/\D/g, ""))}
                      placeholder="Örn. 4567"
                      className="w-full px-4 py-3 rounded-xl border border-teal-500/10 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none text-sm font-mono font-black text-center text-lg tracking-widest input-field"
                    />
                    <p className="text-[10px] opacity-60 mt-1">Çift katılımları ve hileyi önlemek amacıyla teyit amaçlı istenir.</p>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-4 bg-teal-600 hover:bg-teal-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-lg hover:scale-[1.01] btn-base"
                  >
                    Katılımı Kaydet ve Rezervasyon Yap!
                  </button>
                </form>
              ) : (
                <div className="text-center py-6 space-y-6">
                  <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
                    <CheckCircle2 className="w-10 h-10 animate-bounce" />
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="text-2xl font-black text-emerald-600">Tebrikler, Katıldınız!</h4>
                    <p className="text-sm opacity-85 leading-relaxed px-4">
                      Kaydınız başarıyla veritabanımıza eklenmiştir. WhatsApp üzerinden detaylı bilgi edinmek ve haklarınızı doğrulamak için aşağıdaki butonu kullanarak direkt yazabilirsiniz.
                    </p>
                  </div>

                  <div className="p-4 bg-teal-50 dark:bg-slate-800 rounded-2xl border border-teal-100 dark:border-teal-900">
                    <p className="text-[11px] uppercase font-bold opacity-75">Kampanya Detayı</p>
                    <p className="text-base font-black text-teal-600">{activeJoinCampaign.name}</p>
                    <p className="text-xs font-semibold mt-1 opacity-75">İsim: {firstName} {lastName}</p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <a
                      href={getWhatsAppUrl(ARYA_WHATSAPP_PHONE, `Merhaba Arya Terzi, "${activeJoinCampaign.name}" kampanyasına katıldım. Bilgilerimi doğrulayıp haklarımı almak istiyorum. İsim: ${firstName} ${lastName}, Tel son 4 hane: ${phoneLastFour}`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-4 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-lg text-center flex items-center justify-center gap-2 btn-base"
                    >
                      <Phone className="w-4 h-4" /> Hemen WhatsApp'tan Yaz
                    </a>
                    
                    <button
                      onClick={() => setActiveJoinCampaign(null)}
                      className="py-3 px-6 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 font-bold text-xs uppercase rounded-2xl transition-all btn-base"
                    >
                      Kapat
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}


      {/* MODAL 2: INTERACTIVE WHEEL SPINNER */}
      {activeWheelCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 modal-backdrop overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 text-slate-950 dark:text-slate-100 rounded-2xl sm:rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-amber-500/20 relative my-4 sm:my-8">
            <button 
              onClick={() => setActiveWheelCampaign(null)} 
              className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:opacity-80 transition-all text-slate-600 dark:text-slate-300 z-10 btn-base"
              disabled={isSpinning}
            >
              <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            <div className="p-4 sm:p-6 md:p-8 flex flex-col items-center">
              <div className="inline-flex items-center gap-1.5 sm:gap-2 bg-amber-500/10 text-amber-600 px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold mb-3 sm:mb-4">
                <Gift className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-red-500 animate-bounce" /> Arya Şans Çarkı Makinesi
              </div>

              <h3 className="text-lg sm:text-xl md:text-2xl font-black tracking-tight text-teal-600 mb-1 text-center">
                {activeWheelCampaign.name}
              </h3>
              <p className="text-[11px] sm:text-xs opacity-80 mb-4 sm:mb-6 text-center max-w-md">
                Admin tarafından tanımlanmış gerçek kazanç oranlı çarkımızı çevirin, indirim ve bedava hizmetleri anında yakalayın!
              </p>

              {spinError && (
                <div className="w-full p-4 mb-4 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-2xl text-xs font-bold border border-rose-500/20 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <div>
                    <span className="font-black">Çark Hatası: </span>
                    <span>{spinError}</span>
                  </div>
                </div>
              )}

              {/* SPINNING WHEEL SHIFT STATES */}
              {spinState === "idle" && (
                <div className="flex flex-col items-center space-y-8 w-full">
                  
                  {/* Dynamic SVG Wheel Graphic */}
                  <div className="relative w-56 h-56 sm:w-72 sm:h-72 md:w-80 md:h-80">
                    {/* Arrow Pointer */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -mt-2 sm:-mt-4 z-20 w-0 h-0 border-l-[10px] sm:border-l-[15px] border-l-transparent border-r-[10px] sm:border-r-[15px] border-r-transparent border-t-[18px] sm:border-t-[25px] border-t-red-600 drop-shadow-md"></div>
                    
                    {/* Rotating Wheel Container */}
                    <div 
                      style={{ 
                        transform: `rotate(${rotationDegrees}deg)`,
                        transition: isSpinning ? "transform 5s cubic-bezier(0.15, 0.85, 0.35, 1)" : "none"
                      }}
                      className="w-full h-full rounded-full border-8 border-teal-600 shadow-2xl relative overflow-hidden bg-white dark:bg-slate-800"
                    >
                      {/* SVG representation of segmented wheel */}
                      <svg viewBox="0 0 100 100" className="w-full h-full">
                        {(() => {
                          let prizesList: Prize[] = [];
                          try {
                            prizesList = JSON.parse(activeWheelCampaign.prizes);
                          } catch (e) {
                            prizesList = [];
                          }
                          const len = prizesList.length || 1;
                          const angle = 360 / len;

                          const colors = [
                            "#0d9488", "#f59e0b", "#14b8a6", "#10b981", 
                            "#f43f5e", "#6366f1", "#8b5cf6", "#ec4899"
                          ];

                          return prizesList.map((p, idx) => {
                            const startAngle = idx * angle;
                            const endAngle = (idx + 1) * angle;
                            
                            // SVG polar to cartesian helper
                            const rad = (degree: number) => (degree - 90) * Math.PI / 180;
                            const x1 = 50 + 50 * Math.cos(rad(startAngle));
                            const y1 = 50 + 50 * Math.sin(rad(startAngle));
                            const x2 = 50 + 50 * Math.cos(rad(endAngle));
                            const y2 = 50 + 50 * Math.sin(rad(endAngle));
                            
                            const d = `M 50 50 L ${x1} ${y1} A 50 50 0 0 1 ${x2} ${y2} Z`;
                            const color = colors[idx % colors.length];

                            // Label angle
                            const textAngle = startAngle + angle / 2;
                            const textRad = (textAngle - 90) * Math.PI / 180;
                            const tx = 50 + 32 * Math.cos(textRad);
                            const ty = 50 + 32 * Math.sin(textRad);

                            return (
                              <g key={p.id}>
                                <path d={d} fill={color} stroke="#ffffff" strokeWidth="0.5" />
                                <text 
                                  x={tx} 
                                  y={ty} 
                                  fill="#ffffff" 
                                  fontSize="3" 
                                  fontWeight="bold" 
                                  textAnchor="middle"
                                  transform={`rotate(${textAngle}, ${tx}, ${ty})`}
                                  className="select-none font-sans"
                                >
                                  {p.text.length > 12 ? p.text.substring(0, 11) + ".." : p.text}
                                </text>
                              </g>
                            );
                          });
                        })()}
                        {/* Center hub */}
                        <circle cx="50" cy="50" r="10" fill="#ffffff" stroke="#0d9488" strokeWidth="2" />
                        <circle cx="50" cy="50" r="6" fill="#f59e0b" />
                      </svg>
                    </div>
                  </div>

                  <button
                    onClick={triggerWheelSpin}
                    disabled={isSpinning}
                    className={`w-full max-w-sm py-4 rounded-2xl font-black text-sm uppercase tracking-wider transition-all shadow-xl btn-base ${
                      isSpinning 
                        ? "bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed" 
                        : "bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 text-slate-950 hover:scale-[1.02]"
                    }`}
                  >
                    {isSpinning ? "ÇARK DÖNÜYOR..." : "ŞİMDİ ÇARKIVER!"}
                  </button>
                </div>
              )}

              {spinState === "drawn" && selectedPrize && (
                <div className="w-full max-w-md space-y-6 animate-scale-up">
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-3xl p-6 text-center space-y-3">
                    <span className="text-5xl">🎉</span>
                    <h4 className="text-lg font-bold opacity-75 uppercase">Tebrikler! Kazandınız!</h4>
                    <p className="text-3xl font-black text-amber-500 tracking-tight">
                      {selectedPrize.text}
                    </p>
                    <p className="text-xs opacity-75 max-w-xs mx-auto">
                      Bu ödülü adınıza tescilleyip benzersiz promosyon kodunuzu almak için lütfen bilgilerinizi eksiksiz girin.
                    </p>
                  </div>

                  <form onSubmit={handleClaimSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-black uppercase mb-1">Adınız</label>
                        <input 
                          type="text" 
                          required
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder="Ahmet"
                          className="w-full px-4 py-3 rounded-xl border border-teal-500/10 bg-slate-50 dark:bg-slate-800 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-teal-500 input-field"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase mb-1">Soyadınız</label>
                        <input 
                          type="text" 
                          required
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          placeholder="Yılmaz"
                          className="w-full px-4 py-3 rounded-xl border border-teal-500/10 bg-slate-50 dark:bg-slate-800 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-teal-500 input-field"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase mb-1">Telefon Numaranız</label>
                      <input 
                        type="tel" 
                        required
                        value={fullPhone}
                        onChange={(e) => setFullPhone(e.target.value)}
                        placeholder="0555 123 45 67"
                        className="w-full px-4 py-3 rounded-xl border border-teal-500/10 bg-slate-50 dark:bg-slate-800 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-teal-500 input-field"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase mb-1">Telefonun Son 4 Hanesi (Doğrulama)</label>
                      <input 
                        type="text" 
                        required
                        maxLength={4}
                        value={phoneLastFour}
                        onChange={(e) => setPhoneLastFour(e.target.value.replace(/\D/g, ""))}
                        placeholder="4567"
                        className="w-full px-4 py-3 rounded-xl border border-teal-500/10 bg-slate-50 dark:bg-slate-800 text-center font-mono font-black text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-teal-500 input-field"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-4 bg-teal-600 hover:bg-teal-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-xl hover:scale-[1.01] btn-base"
                    >
                      Ödülümü Adıma Kaydet!
                    </button>
                  </form>
                </div>
              )}

              {spinState === "claimed" && selectedPrize && spinPromoCode && (
                <div className="w-full max-w-md text-center space-y-6 animate-scale-up">
                  <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
                    <CheckCircle2 className="w-10 h-10 animate-bounce" />
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-2xl font-black text-emerald-600">Ödülünüz Rezerve Edildi!</h4>
                    <p className="text-sm opacity-80 leading-relaxed px-4">
                      Tebrikler! Kazandığınız ödül telefon numaranızla sisteme kaydedilmiştir.
                    </p>
                  </div>

                  {/* PROMO CODE DISPLAY */}
                  <div className="p-6 bg-amber-500/10 border-2 border-dashed border-amber-500/50 rounded-2xl space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">BENZERSİZ İNDİRİM KUPON KODUNUZ</p>
                    <p className="text-3xl font-black tracking-widest text-slate-800 dark:text-amber-300 font-mono select-all">
                      {spinPromoCode}
                    </p>
                    <p className="text-[11px] font-semibold opacity-75 mt-2">Ödül: {selectedPrize.text}</p>
                    <p className="text-[9px] opacity-60">Bu kodu kasada göstererek indirimden veya ödülünüzden anında yararlanabilirsiniz.</p>
                  </div>

                  {/* SOSYAL PAYLAŞ & KAZAN (EXTRA POWER) */}
                  <div className="bg-teal-500/5 border border-teal-500/15 rounded-2xl p-5 space-y-3.5">
                    <div className="flex items-center gap-2 text-teal-600 font-extrabold text-xs">
                      <Share2 className="w-4 h-4 animate-pulse text-amber-500" />
                      <span>SÜPER SOSYAL GÜÇ: PAYLAŞ & KAZAN!</span>
                    </div>
                    <p className="text-xs opacity-80 leading-relaxed text-left">
                      Bu kampanyayı WhatsApp üzerinden arkadaşına gönder, anında ekstradan mağazamızda geçerli <b>%10 ekstra indirim kodu</b> daha kazan!
                    </p>

                    {!shareBonusCode ? (
                      <button
                        onClick={handleShareAndGainBonus}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow flex items-center justify-center gap-2 btn-base"
                      >
                        <Share2 className="w-4 h-4" /> Arkadaşına WhatsApp'tan Gönder & Kazan!
                      </button>
                    ) : (
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center space-y-1 animate-scale-up">
                        <p className="text-[9px] font-black uppercase tracking-wider text-emerald-600">PAYLAŞMA EKSTRA HEDİYE KODUNUZ</p>
                        <p className="text-xl font-mono font-black text-emerald-600 select-all">{shareBonusCode}</p>
                        <p className="text-[10px] opacity-75 font-semibold">Tebrikler! Ekstra %10 indirim kodunuz tanımlandı!</p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <a
                      href={getWhatsAppUrl(ARYA_WHATSAPP_PHONE, `Merhaba Arya Terzi, şans çarkından "${selectedPrize.text}" ödülü kazandım! Kupon kodum: ${spinPromoCode}. İsim: ${firstName} ${lastName}`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-4 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-lg text-center flex items-center justify-center gap-2 btn-base"
                    >
                      <Phone className="w-4 h-4" /> Ödülü Doğrulamak İçin WhatsApp'tan Yaz
                    </a>

                    <button
                      onClick={() => setActiveWheelCampaign(null)}
                      className="py-3 px-6 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 font-bold text-xs uppercase rounded-2xl transition-all btn-base"
                    >
                      Pencereyi Kapat
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* URGENCY DETECTED HIGH CONVERTING POP-UP */}
      {urgencyAlert && (
        <div className="fixed bottom-3 sm:bottom-6 right-3 sm:right-6 left-3 sm:left-auto z-50 max-w-sm w-auto sm:w-full bg-red-600 text-white p-3 sm:p-5 rounded-2xl sm:rounded-3xl shadow-2xl border border-red-500 animate-fade-in sm:animate-slide-in flex flex-col gap-2 sm:gap-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-amber-300 animate-bounce" />
              <h5 className="font-extrabold tracking-tight text-sm">FIRSATI KAÇIRMA ALERTI!</h5>
            </div>
            <button 
              onClick={() => setUrgencyAlert(null)}
              className="text-white/80 hover:text-white bg-black/20 p-1.5 rounded-full transition-all btn-base"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          
          <div className="space-y-1">
            <p className="text-xs font-bold">{urgencyAlert.campaign.name}</p>
            <p className="text-[11px] opacity-90 leading-relaxed">
              Bu kampanyanın bitmesine sadece <b>{urgencyAlert.timeString}</b> kaldı! Kontenjan dolmadan veya süre tükenmeden hemen çarkı çevirin veya katılın!
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                handleOpenWheel(urgencyAlert.campaign);
                setUrgencyAlert(null);
              }}
              className="flex-1 py-2 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-[10px] uppercase rounded-xl transition-all text-center btn-base"
            >
              Çarkı Çevir!
            </button>
            <button
              onClick={() => {
                handleOpenJoin(urgencyAlert.campaign);
                setUrgencyAlert(null);
              }}
              className="flex-1 py-2 bg-black/40 hover:bg-black/60 text-white font-black text-[10px] uppercase rounded-xl transition-all text-center btn-base"
            >
              Katıl!
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
