import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { musicTracks } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const trackId = parseInt(id);
    if (isNaN(trackId)) {
      return NextResponse.json({ error: "Geçersiz ID" }, { status: 400 });
    }

    await db.delete(musicTracks).where(eq(musicTracks.id, trackId));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE music error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const trackId = parseInt(id);
    if (isNaN(trackId)) {
      return NextResponse.json({ error: "Geçersiz ID" }, { status: 400 });
    }

    const body = await req.json();
    const { active } = body;

    const updated = await db.update(musicTracks)
      .set({ active: active })
      .where(eq(musicTracks.id, trackId))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json({ error: "Müzik bulunamadı." }, { status: 404 });
    }

    return NextResponse.json(updated[0]);
  } catch (error: any) {
    console.error("PATCH music error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
