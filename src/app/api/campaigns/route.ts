import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { campaigns } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

// 3 Default high-converting campaigns for seed data
const DEFAULT_CAMPAIGNS = [
  {
    name: "Arya Süper Bahar Kampanyası",
    description: "Tüm kaban, mont, kürk ve yorganlarda %30'a varan dev indirim başladı! Ücretsiz adresten alım ve adrese teslimat ayrıcalığıyla, giysileriniz ilk günkü canlılığına kavuşsun.",
    startDate: new Date(),
    // 7 days from now
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1545127398-14699f92334b?auto=format&fit=crop&w=1200&q=80", // Dry cleaning clothes hanging
      "https://images.unsplash.com/photo-1489274495757-95c7c837b101?auto=format&fit=crop&w=1200&q=80", // Ironing steaming
      "https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?auto=format&fit=crop&w=1200&q=80"  // Neatly folded garments
    ]),
    quota: 300,
    quotaUsed: 47,
    badge: "Flaş",
    prizes: JSON.stringify([
      { id: 1, text: "%10 İndirim", probability: 40, codePrefix: "ARYA10" },
      { id: 2, text: "%20 İndirim", probability: 25, codePrefix: "ARYA20" },
      { id: 3, text: "Ücretsiz 2 Parça Ütü", probability: 15, codePrefix: "UTUBEDAVA" },
      { id: 4, text: "1 Adet Mont Temizleme Bedava", probability: 5, codePrefix: "MONTBEDAVA" },
      { id: 5, text: "Hediye Temizlik Cüzdanı", probability: 10, codePrefix: "CUZDAN" },
      { id: 6, text: "%50 SÜPER İNDİRİM!", probability: 5, codePrefix: "ARYA50" }
    ]),
    active: true,
  },
  {
    name: "Haftalık Takım Elbise Fırsatı",
    description: "İş hayatının yoğun temposunda şıklığınızı şansa bırakmayın. 3 adet takım elbise kuru temizleme sadece 2 adet fiyatına! Üstelik özel askı poşeti ve parfüm hediyeli.",
    startDate: new Date(),
    // 3 days from now
    endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1593030103066-0093718efeb9?auto=format&fit=crop&w=1200&q=80", // Men's suits row
      "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1200&q=80"  // Tailored suit detail
    ]),
    quota: 150,
    quotaUsed: 112,
    badge: "Haftalık",
    prizes: JSON.stringify([
      { id: 1, text: "%15 İndirim", probability: 50, codePrefix: "TAKIM15" },
      { id: 2, text: "%25 İndirim", probability: 30, codePrefix: "TAKIM25" },
      { id: 3, text: "Hediye Gömlek Temizleme", probability: 15, codePrefix: "GOMLEK" },
      { id: 4, text: "Ücretsiz Premium Askı Seti", probability: 5, codePrefix: "PREMASKI" }
    ]),
    active: true,
  },
  {
    name: "Özel Gün Gelinlik & Abiye Bakımı",
    description: "En özel anılarınızın en değerli kıyafetleri! Gelinlik, damatlık ve abiyeleriniz için özel elyaf korumalı temizleme tekniği. Sararmalara karşı 5 yıl garantili koruma.",
    startDate: new Date(),
    // 12 days from now
    endDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1594552072238-b8a33785b261?auto=format&fit=crop&w=1200&q=80"  // Wedding dress hanger
    ]),
    quota: 100,
    quotaUsed: 12,
    badge: "Özel Gün",
    prizes: JSON.stringify([
      { id: 1, text: "%10 İndirim", probability: 40, codePrefix: "OZEL10" },
      { id: 2, text: "%20 Gelinlik İndirimi", probability: 30, codePrefix: "OZEL20" },
      { id: 3, text: "Hediye Şal / Kravat Temizleme", probability: 20, codePrefix: "AKSESUAR" },
      { id: 4, text: "%40 Dev İndirim", probability: 10, codePrefix: "OZEL40" }
    ]),
    active: true,
  }
];

export async function GET() {
  try {
    let list = await db.select().from(campaigns).orderBy(desc(campaigns.id));
    
    // Seed database if empty
    if (list.length === 0) {
      for (const campaignData of DEFAULT_CAMPAIGNS) {
        await db.insert(campaigns).values(campaignData);
      }
      list = await db.select().from(campaigns).orderBy(desc(campaigns.id));
    }
    
    return NextResponse.json(list);
  } catch (error: any) {
    console.error("GET campaigns error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description, startDate, endDate, images, quota, badge, prizes, active } = body;
    
    if (!name || !description || !startDate || !endDate || !prizes) {
      return NextResponse.json({ error: "Eksik kampanya bilgileri girdiniz." }, { status: 400 });
    }

    // Default prizes if not properly configured
    const formattedPrizes = typeof prizes === "string" ? prizes : JSON.stringify(prizes);
    const formattedImages = typeof images === "string" ? images : JSON.stringify(images || []);

    const newCampaign = await db.insert(campaigns).values({
      name,
      description,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      images: formattedImages,
      quota: parseInt(quota?.toString() || "100"),
      quotaUsed: 0,
      badge: badge || "Haftalık",
      prizes: formattedPrizes,
      active: active !== undefined ? active : true,
    }).returning();

    return NextResponse.json(newCampaign[0]);
  } catch (error: any) {
    console.error("POST campaign error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
