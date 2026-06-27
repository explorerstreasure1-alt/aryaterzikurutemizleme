import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { campaigns, participations, spinners } from "@/db/schema";
import { sql, eq, desc } from "drizzle-orm";

export async function GET() {
  try {
    // 1. Get total counts
    const campaignList = await db.select().from(campaigns).orderBy(desc(campaigns.id));
    const participationList = await db.select().from(participations).orderBy(desc(participations.id));
    const spinnerList = await db.select().from(spinners).orderBy(desc(spinners.id));

    // Calculate Today's counts
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayParticipations = participationList.filter((p: { createdAt: Date }) => p.createdAt >= today).length;
    const todaySpinners = spinnerList.filter((s: { createdAt: Date }) => s.createdAt >= today).length;

    // Calculate most won prize
    const prizeCounts: Record<string, number> = {};
    spinnerList.forEach((s: { prizeWon: string; createdAt: Date }) => {
      prizeCounts[s.prizeWon] = (prizeCounts[s.prizeWon] || 0) + 1;
    });

    let mostWonPrize = "Yok";
    let maxCount = 0;
    Object.entries(prizeCounts).forEach(([prize, count]) => {
      if (count > maxCount) {
        maxCount = count;
        mostWonPrize = prize;
      }
    });
    if (maxCount > 0) {
      mostWonPrize = `${mostWonPrize} (${maxCount} kez)`;
    }

    const stats = {
      todayParticipations,
      todaySpinners,
      totalParticipations: participationList.length,
      totalSpinners: spinnerList.length,
      mostWonPrize,
      activeCampaignsCount: campaignList.filter((c: { active: boolean; createdAt: Date }) => c.active).length,
      campaigns: campaignList,
      participations: participationList,
      spinners: spinnerList,
    };

    return NextResponse.json(stats);
  } catch (error: any) {
    console.error("GET admin stats error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
