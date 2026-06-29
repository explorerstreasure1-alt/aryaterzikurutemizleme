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
