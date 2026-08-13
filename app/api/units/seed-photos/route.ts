import { NextResponse } from "next/server";
import { getDbSettings, saveDbSettings } from "../../../../src/data/db.ts";
import { getUnitPhotos } from "../../../../src/data/unit-photos.ts";
import { UNITS } from "../../../../src/data/units.ts";

export async function POST() {
  const settings = await getDbSettings();
  let seeded = 0;

  for (const unit of UNITS) {
    const key = `unit_photos:${unit.id}`;
    const existing = settings?.[key] as unknown[] | undefined;
    if (existing && existing.length > 0) continue;

    const hardcoded = getUnitPhotos(unit.id);
    if (hardcoded.length === 0) continue;

    const photos = hardcoded.map((p, i) => ({
      url: p.url,
      thumb: p.thumb,
      caption: "",
      isCover: i === 0,
    }));

    const { error } = await saveDbSettings(key, photos);
    if (!error) seeded++;
  }

  return NextResponse.json({ ok: true, seeded });
}
