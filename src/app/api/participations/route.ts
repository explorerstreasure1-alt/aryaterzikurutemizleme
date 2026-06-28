import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { participations, campaigns } from "@/db/schema";
import { eq, and, or, sql } from "drizzle-orm";
import { headers } from "next/headers";

export async function GET() {
  try {
    const list = await db.select().from(participations).orderBy(sql`${participations.id} DESC`);
    return NextResponse.json(list);
  } catch (error: any) {
    console.error("GET participations error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { campaignId, firstName, lastName, fullPhone, phoneLastFour, cookieId } = body;

    if (!campaignId || !firstName || !lastName || !phoneLastFour) {
      return NextResponse.json({ error: "Lütfen tüm zorunlu alanları doldurun." }, { status: 400 });
    }

    // If fullPhone is not provided (simplified join), use phoneLastFour as placeholder
    const resolvedFullPhone = fullPhone || `*******${phoneLastFour}`;

    // Get IP address
    const headersList = await headers();
    const ipAddress = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                      headersList.get("x-real-ip")?.trim() || 
                      "127.0.0.1";

    const parsedCampaignId = parseInt(campaignId.toString());

    // 1. Fetch Campaign
    const campaignList = await db.select().from(campaigns).where(eq(campaigns.id, parsedCampaignId));
    if (campaignList.length === 0) {
      return NextResponse.json({ error: "Kampanya bulunamadı." }, { status: 404 });
    }
    const campaign = campaignList[0];

    // Check if active
    if (!campaign.active) {
      return NextResponse.json({ error: "Bu kampanya şu anda aktif değil." }, { status: 400 });
    }

    // Check dates
    const now = new Date();
    if (now < campaign.startDate) {
      return NextResponse.json({ error: "Bu kampanya henüz başlamadı." }, { status: 400 });
    }
    if (now > campaign.endDate) {
      return NextResponse.json({ error: "Bu kampanyanın süresi dolmuştur." }, { status: 400 });
    }

    // Check quota
    if (campaign.quotaUsed >= campaign.quota) {
      return NextResponse.json({ error: "Kontenjan Dolu! Bu kampanya için katılım sınırı aşılmıştır." }, { status: 400 });
    }

    // 2. Anti-cheat check: IP & Cookie & Phone check
    // We search if this IP address, or this cookieId, or this phone combination has already registered for this campaign.
    const existing = await db.select()
      .from(participations)
      .where(
        and(
          eq(participations.campaignId, parsedCampaignId),
          or(
            eq(participations.ipAddress, ipAddress),
            eq(participations.cookieId, cookieId || "never_matches"),
            eq(participations.fullPhone, resolvedFullPhone)
          )
        )
      );

    if (existing.length > 0) {
      return NextResponse.json({ 
        error: "Zaten Katıldınız!", 
        message: "Bu kampanyaya daha önce katılım sağladınız. Adaletli dağıtım için her kampanyaya yalnızca 1 kez katılabilirsiniz." 
      }, { status: 400 });
    }

    // 3. Register and update quota
    await db.update(campaigns)
      .set({ quotaUsed: campaign.quotaUsed + 1 })
      .where(eq(campaigns.id, parsedCampaignId));

    const newParticipation = await db.insert(participations).values({
      campaignId: parsedCampaignId,
      firstName: firstName.trim().toUpperCase(),
      lastName: lastName.trim().toUpperCase(),
      fullPhone: resolvedFullPhone.trim(),
      phoneLastFour: phoneLastFour.trim(),
      ipAddress,
      cookieId: cookieId || "unknown_cookie",
    }).returning();

    return NextResponse.json({
      success: true,
      data: newParticipation[0],
      message: "Tebrikler, başarıyla katıldınız!"
    });
  } catch (error: any) {
    console.error("POST participation error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
