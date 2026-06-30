import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";

/** GET /api/admin/settings?key=musicVolume — get a setting value by key */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");
    if (!key) {
      return NextResponse.json({ error: "key parametresi gereklidir." }, { status: 400 });
    }

    const rows = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
    if (rows.length === 0) {
      return NextResponse.json({ key, value: null });
    }
    return NextResponse.json({ key: rows[0].key, value: rows[0].value });
  } catch (err) {
    console.error("Settings GET error:", err);
    return NextResponse.json({ error: "Ayar okunamadı." }, { status: 500 });
  }
}

/** POST /api/admin/settings — upsert a setting { key, value } */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { key, value } = body;

    if (!key || value === undefined || value === null) {
      return NextResponse.json({ error: "key ve value gereklidir." }, { status: 400 });
    }

    // Upsert: try insert, on conflict update
    await db
      .insert(settings)
      .values({ key, value: String(value) })
      .onConflictDoUpdate({ target: settings.key, set: { value: String(value) } });

    return NextResponse.json({ success: true, key, value: String(value) });
  } catch (err) {
    console.error("Settings POST error:", err);
    return NextResponse.json({ error: "Ayar kaydedilemedi." }, { status: 500 });
  }
}
