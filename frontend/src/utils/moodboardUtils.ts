import { InspirationImage } from '../types';

export interface BoardImagePartition {
  validImages: InspirationImage[];
  missingIds: string[];
}

/** 按灵感板保存的 imageIds 顺序，分出有效图片与失效引用（保持原有相对顺序） */
export function partitionBoardImages(imageIds: string[], imageMap: Map<string, InspirationImage>): BoardImagePartition {
  const validImages: InspirationImage[] = [];
  const missingIds: string[] = [];
  for (const id of imageIds) {
    const image = imageMap.get(id);
    if (image) validImages.push(image);
    else missingIds.push(id);
  }
  return { validImages, missingIds };
}

/** 封面始终取 imageIds 顺序中第一张仍存在的图片 */
export function firstValidImageUrl(imageIds: string[], imageMap: Map<string, InspirationImage>): string {
  for (const id of imageIds) {
    const url = imageMap.get(id)?.imageUrl;
    if (url) return url;
  }
  return '';
}

/** 判断两个 id 列表是否互为排列（同一集合、同一长度） */
export function isPermutation(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const counts = new Map<string, number>();
  for (const id of a) counts.set(id, (counts.get(id) ?? 0) + 1);
  for (const id of b) {
    const left = counts.get(id);
    if (!left) return false;
    counts.set(id, left - 1);
  }
  return true;
}
