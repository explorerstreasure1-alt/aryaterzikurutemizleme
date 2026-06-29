import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { spinners, campaigns } from "@/db/schema";
import { eq, and, or, sql, gt, gte } from "drizzle-orm";
import { headers } from "next/headers";

// Helper to send Telegram Notification if token is set
async function triggerTelegramNotification(prize: string, name: string, phone: string, campaignName: string, promoCode: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  const text = `🚨 *ARYA TERZİ - BÜYÜK ÖDÜL KAZANILDI!* 🚨\n\n` +
               `👤 *Müşteri:* ${name}\n` +
               `📞 *Telefon:* ${phone}\n` +
               `🎯 *Kampanya:* ${campaignName}\n` +
               `🎁 *Kazanılan Ödül:* ${prize}\n` +
               `🎫 *Kod:* ${promoCode}\n\n` +
               `⚡ *Hemen iletişime geçip ilgilenebilirsiniz!*`;

  console.log("🔔 [BİLDİRİM SİMÜLASYONU]:", text);

  if (token && chatId) {
    try {
      const url = `https://api.telegram.org/bot${token}/sendMessage`;
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: "Markdown"
        })
      });
      console.log("Telegram notification sent successfully!");
    } catch (err) {
      console.error("Failed to send Telegram notification:", err);
    }
  }
}

// Generate random code suffix
function generateCodeSuffix() {
  const chars = "ABCDEFGHJKLMNOPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function GET() {
  try {
    const list = await db.select().from(spinners).orderBy(sql`${spinners.id} DESC`);
    return NextResponse.json(list);
  } catch (error: any) {
    console.error("GET spinners error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      campaignId, 
      firstName, 
      lastName, 
      fullPhone, 
      phoneLastFour, 
      cookieId, 
      action, // "draw" or "claim"
      selectedPrizeText,
      promoCodeOverride // for "Paylaş & Kazan"
    } = body;

    if (!campaignId) {
      return NextResponse.json({ error: "Kampanya ID bulunamadı." }, { status: 400 });
    }

    const parsedCampaignId = parseInt(campaignId.toString());

    // Fetch Campaign
    const campaignList = await db.select().from(campaigns).where(eq(campaigns.id, parsedCampaignId));
    if (campaignList.length === 0) {
      return NextResponse.json({ error: "Kampanya bulunamadı." }, { status: 404 });
    }
    const campaign = campaignList[0];

    // Check dates and active
    if (!campaign.active) {
      return NextResponse.json({ error: "Bu kampanya şu anda aktif değil." }, { status: 400 });
    }
    const now = new Date();
    if (now < campaign.startDate || now > campaign.endDate) {
      return NextResponse.json({ error: "Kampanya süresi aktif değil." }, { status: 400 });
    }

    // Get IP address
    const headersList = await headers();
    const ipAddress = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                      headersList.get("x-real-ip")?.trim() || 
                      "127.0.0.1";

    // Today's start boundary for once-per-day checks
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // 1. ACTION: "draw" -> Pre-determine the prize server-side to prevent cheating
    if (action === "draw") {
      // Rate limiting: max 5 spin tries per IP per minute
      const oneMinuteAgo = new Date(Date.now() - 60000);
      const recentDraws = await db.select({ count: sql`count(*)` })
        .from(spinners)
        .where(
          and(
            eq(spinners.ipAddress, ipAddress),
            gt(spinners.createdAt, oneMinuteAgo)
          )
        );
      const recentDrawCount = Number(recentDraws[0]?.count || 0);
      if (recentDrawCount >= 5) {
        return NextResponse.json({ 
          error: "Çok fazla çark çevirme denemesi!", 
          message: "Ard arda çok fazla deneme yaptınız. Lütfen 1 dakika bekleyip tekrar deneyin." 
        }, { status: 429 });
      }

      // Once-per-day check: already spun any campaign today?
      const existingSpinToday = await db.select()
        .from(spinners)
        .where(
          and(
            gte(spinners.createdAt, todayStart),
            or(
              eq(spinners.ipAddress, ipAddress),
              eq(spinners.cookieId, cookieId || "never_matches")
            )
          )
        );

      if (existingSpinToday.length > 0) {
        return NextResponse.json({ 
          error: "Günde 1 Defa!", 
          message: "Çark çevirme hakkınızı bugün zaten kullandınız. Yarına kadar bekleyin!" 
        }, { status: 400 });
      }

      // Parse prizes
      let prizeOptions: any[] = [];
      try {
        prizeOptions = JSON.parse(campaign.prizes);
      } catch (e) {
        return NextResponse.json({ error: "Kampanya ödül listesi hatalı düzenlenmiş." }, { status: 500 });
      }

      if (!prizeOptions || prizeOptions.length === 0) {
        return NextResponse.json({ error: "Kampanyaya tanımlı ödül bulunamadı." }, { status: 400 });
      }

      // Filter out zero-probability items for the draw
      const drawPool = prizeOptions.filter((p: any) => (parseFloat(p.probability) || 0) > 0);
      if (drawPool.length === 0) {
        return NextResponse.json({ error: "Hiçbir ödülün olasılığı 0'dan büyük değil. Lütfen admin panelinden ödülleri kontrol edin." }, { status: 400 });
      }

      // Weighted random draw using only items with >0 probability
      const totalProbability = drawPool.reduce((acc: number, curr: any) => acc + (parseFloat(curr.probability) || 0), 0);
      const randomValue = Math.random() * (totalProbability || 100);

      let accumulated = 0;
      let chosenPrize = drawPool[0];

      for (const p of drawPool) {
        accumulated += parseFloat(p.probability) || 0;
        if (randomValue <= accumulated) {
          chosenPrize = p;
          break;
        }
      }

      // Generate a potential promo code
      const prefix = chosenPrize.codePrefix || "ARYA";
      const code = `${prefix}-${generateCodeSuffix()}`;

      return NextResponse.json({
        success: true,
        prize: chosenPrize,
        promoCode: code
      });
    }

    // 2. ACTION: "claim" -> Lock the won prize into database with user registration details
    if (action === "claim") {
      if (!firstName || !lastName || !phoneLastFour || !selectedPrizeText) {
        return NextResponse.json({ error: "Lütfen tüm talep bilgilerini giriniz." }, { status: 400 });
      }

      // If fullPhone is not provided (simplified claim), use phoneLastFour as placeholder
      const resolvedFullPhone = fullPhone || `*******${phoneLastFour}`;

      // Final double check: already claimed a prize today?
      const existingClaimToday = await db.select()
        .from(spinners)
        .where(
          and(
            gte(spinners.createdAt, todayStart),
            or(
              eq(spinners.ipAddress, ipAddress),
              eq(spinners.cookieId, cookieId || "never_matches"),
              eq(spinners.fullPhone, resolvedFullPhone)
            )
          )
        );

      if (existingClaimToday.length > 0) {
        return NextResponse.json({ 
          error: "Günde 1 Defa!", 
          message: "Bugün zaten bir ödül kazanmışsınız. Yarına kadar bekleyin!" 
        }, { status: 400 });
      }

      const generatedPromoCode = promoCodeOverride || `ARYA-WIN-${generateCodeSuffix()}`;

      // Insert winner
      const newWin = await db.insert(spinners).values({
        campaignId: parsedCampaignId,
        firstName: firstName.trim().toUpperCase(),
        lastName: lastName.trim().toUpperCase(),
        fullPhone: resolvedFullPhone.trim(),
        phoneLastFour: phoneLastFour.trim(),
        prizeWon: selectedPrizeText,
        promoCode: generatedPromoCode,
        used: false,
        ipAddress,
        cookieId: cookieId || "unknown_cookie",
      }).returning();

      // Check if it's a premium high-value prize to trigger notifications
      // %30, %40, %50, Bedava, Hediye, Ücretsiz, Özel, SÜPER
      const isHighValue = /30%|40%|50%|%30|%40|%50|bedava|hediye|ücretsiz|super|süper/i.test(selectedPrizeText);
      if (isHighValue) {
        await triggerTelegramNotification(
          selectedPrizeText,
          `${firstName} ${lastName}`,
          resolvedFullPhone,
          campaign.name,
          generatedPromoCode
        );
      }

      return NextResponse.json({
        success: true,
        data: newWin[0],
        message: "Ödülünüz başarıyla tanımlandı! Mağazamızda kodu göstererek indirimden yararlanabilirsiniz."
      });
    }

    // 3. ACTION: "share-bonus" -> User clicked share and gets a special bonus discount code
    if (action === "share-bonus") {
      const bonusCode = `ARYA-PAYLAS-${generateCodeSuffix()}`;
      const bonusPrize = "%10 Paylaş & Kazan Ekstra İndirimi";

      // Insert bonus prize to database so admin sees it!
      const bonusWin = await db.insert(spinners).values({
        campaignId: parsedCampaignId,
        firstName: firstName || "WhatsApp",
        lastName: lastName || "Paylaşanı",
        fullPhone: fullPhone || "Paylaşım-Aktif",
        phoneLastFour: phoneLastFour || "0000",
        prizeWon: bonusPrize,
        promoCode: bonusCode,
        used: false,
        ipAddress,
        cookieId: cookieId || "unknown_cookie",
      }).returning();

      return NextResponse.json({
        success: true,
        promoCode: bonusCode,
        prize: bonusPrize
      });
    }

    return NextResponse.json({ error: "Geçersiz aksiyon türü." }, { status: 400 });
  } catch (error: any) {
    console.error("POST spin error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
