import { InspirationImage, MoodBoard } from '../types';

export const EMPTY_COVER_URL = '';

/** 封面始终取图片列表中第一张“有效”图片，没有有效图片时返回空串。 */
export function resolveCoverImageUrl(imageIds: string[], imageById: (id: string) => InspirationImage | undefined): string {
  for (const id of imageIds) {
    const image = imageById(id);
    if (image) return image.imageUrl;
  }
  return EMPTY_COVER_URL;
}

/** 基于图片查找表重算封面。 */
export function withResolvedCover(board: MoodBoard, imageById: (id: string) => InspirationImage | undefined): MoodBoard {
  return { ...board, coverImageUrl: resolveCoverImageUrl(board.imageIds, imageById) };
}

/** 从图片 id 列表中移除无效引用（找不到对应图片的 id）。 */
export function pruneInvalidImageIds(imageIds: string[], imageById: (id: string) => InspirationImage | undefined): string[] {
  return imageIds.filter((id) => Boolean(imageById(id)));
}
