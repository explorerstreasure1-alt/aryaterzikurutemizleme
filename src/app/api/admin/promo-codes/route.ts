import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { spinners } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, used } = body;

    if (id === undefined || used === undefined) {
      return NextResponse.json({ error: "Eksik parametreler (id, used)." }, { status: 400 });
    }

    const updated = await db
      .update(spinners)
      .set({ used: !!used })
      .where(eq(spinners.id, parseInt(id.toString())))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json({ error: "Kupon bulunamadı." }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated[0] });
  } catch (error: any) {
    console.error("PATCH promo-codes error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
