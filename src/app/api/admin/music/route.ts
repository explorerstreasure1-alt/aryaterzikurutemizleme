import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { musicTracks } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export async function GET() {
  try {
    const list = await db.select().from(musicTracks).orderBy(desc(musicTracks.id));
    return NextResponse.json(list);
  } catch (error: any) {
    console.error("GET music error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, url } = body;

    if (!name || !url) {
      return NextResponse.json({ error: "Müzik adı ve URL gereklidir." }, { status: 400 });
    }

    const newTrack = await db.insert(musicTracks).values({
      name,
      url,
      active: true,
    }).returning();

    return NextResponse.json(newTrack[0]);
  } catch (error: any) {
    console.error("POST music error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
