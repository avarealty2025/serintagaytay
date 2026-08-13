import { getDbUnitPhotos } from "./db.ts";
import { getUnitPhotos, getUnitCover, getUnitCoverThumb } from "./unit-photos.ts";
import type { UnitPhoto } from "./unit-photos.ts";

export async function getUnitPhotosWithDb(unitId: string): Promise<UnitPhoto[]> {
  try {
    const dbPhotos = await getDbUnitPhotos(unitId);
    if (dbPhotos && dbPhotos.length > 0) {
      return dbPhotos.map((p) => ({
        type: p.type || "photo",
        url: p.url,
        thumb: p.thumb,
        youtubeId: p.youtubeId,
      }));
    }
  } catch {}
  return getUnitPhotos(unitId);
}

export async function getUnitCoverWithDb(unitId: string): Promise<string | null> {
  try {
    const dbPhotos = await getDbUnitPhotos(unitId);
    if (dbPhotos && dbPhotos.length > 0) {
      const cover = dbPhotos.find((p) => p.isCover) ?? dbPhotos[0];
      return cover!.url;
    }
  } catch {}
  return getUnitCover(unitId);
}

export async function getUnitCoverThumbWithDb(unitId: string): Promise<string | null> {
  try {
    const dbPhotos = await getDbUnitPhotos(unitId);
    if (dbPhotos && dbPhotos.length > 0) {
      const cover = dbPhotos.find((p) => p.isCover) ?? dbPhotos[0];
      return cover!.thumb;
    }
  } catch {}
  return getUnitCoverThumb(unitId);
}
