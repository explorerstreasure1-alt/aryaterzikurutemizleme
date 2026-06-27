/**
 * Arya Terzi Kuru Temizleme - Helper Utilities
 */

// Synthesize professional sound effects using the browser's Web Audio API
export function playSound(type: "tick" | "success") {
  if (typeof window === "undefined") return;
  
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    
    if (type === "tick") {
      // Short click sound for wheel ticks
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.08);
      
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.09);
    } else if (type === "success") {
      // Triumphant fanfare/chime chords
      const now = ctx.currentTime;
      const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99]; // C major arpeggio
      
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);
        
        // Add frequency modulation / vibrato
        osc.frequency.setValueAtTime(freq, now + idx * 0.1 + 0.05);
        
        gain.gain.setValueAtTime(0, now + idx * 0.1);
        gain.gain.linearRampToValueAtTime(0.15, now + idx * 0.1 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.6);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.7);
      });
    }
  } catch (error) {
    console.error("Audio context play failed:", error);
  }
}

// Ensure or fetch unique visitor tracking cookie
export function getOrCreateVisitorId(): string {
  if (typeof window === "undefined") return "server-side";
  
  const cookieName = "arya_campaign_visitor_id";
  const match = document.cookie.match(new RegExp("(^| )" + cookieName + "=([^;]+)"));
  
  if (match) {
    return match[2];
  }
  
  // Generate a cryptographically secure random id or fallback
  const array = new Uint32Array(4);
  let randomId = "";
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(array);
    randomId = Array.from(array, dec => dec.toString(16)).join("");
  } else {
    randomId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
  
  // Set cookie for 1 year
  const expires = new Date();
  expires.setFullYear(expires.getFullYear() + 1);
  document.cookie = `${cookieName}=${randomId}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
  
  return randomId;
}

// Generate pre-filled WhatsApp URLs
export function getWhatsAppUrl(phone: string, text: string): string {
  const cleanPhone = phone.replace(/\D/g, "");
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
}

// Standard Turkish WhatsApp phone number for Arya Terzi
export const ARYA_WHATSAPP_PHONE = "905551823776";
