import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { campaigns } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const campaignId = parseInt(id);
    if (isNaN(campaignId)) {
      return NextResponse.json({ error: "Geçersiz ID" }, { status: 400 });
    }

    const body = await req.json();
    const updateData: any = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.startDate !== undefined) updateData.startDate = new Date(body.startDate);
    if (body.endDate !== undefined) updateData.endDate = new Date(body.endDate);
    if (body.images !== undefined) {
      updateData.images = typeof body.images === "string" ? body.images : JSON.stringify(body.images);
    }
    if (body.quota !== undefined) updateData.quota = parseInt(body.quota.toString());
    if (body.quotaUsed !== undefined) updateData.quotaUsed = parseInt(body.quotaUsed.toString());
    if (body.badge !== undefined) updateData.badge = body.badge;
    if (body.prizes !== undefined) {
      updateData.prizes = typeof body.prizes === "string" ? body.prizes : JSON.stringify(body.prizes);
    }
    if (body.active !== undefined) updateData.active = body.active;

    const updated = await db
      .update(campaigns)
      .set(updateData)
      .where(eq(campaigns.id, campaignId))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json({ error: "Kampanya bulunamadı." }, { status: 404 });
    }

    return NextResponse.json(updated[0]);
  } catch (error: any) {
    console.error("PATCH campaign error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const campaignId = parseInt(id);
    if (isNaN(campaignId)) {
      return NextResponse.json({ error: "Geçersiz ID" }, { status: 400 });
    }

    await db.delete(campaigns).where(eq(campaigns.id, campaignId));
    return NextResponse.json({ success: true, message: "Kampanya başarıyla silindi." });
  } catch (error: any) {
    console.error("DELETE campaign error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
