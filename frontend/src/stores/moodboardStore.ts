import { defineStore } from 'pinia';
import { InspirationImage, MoodBoard } from '../types';
import { db } from '../utils/db';
import { firstValidImageUrl, isPermutation, partitionBoardImages } from '../utils/moodboardUtils';

async function imageMapFor(imageIds: string[]): Promise<Map<string, InspirationImage>> {
  const images = await db.images.bulkGet(imageIds);
  const map = new Map<string, InspirationImage>();
  for (const image of images) {
    if (image) map.set(image.id, image);
  }
  return map;
}

export const useMoodboardStore = defineStore('moodboards', {
  state: () => ({ boards: [] as MoodBoard[] }),
  getters: {
    /** 图片ID -> 所属灵感板ID（同一图片最多属于一个灵感板） */
    ownership(state): Map<string, string> {
      const map = new Map<string, string>();
      for (const board of state.boards) {
        for (const imageId of board.imageIds) {
          if (!map.has(imageId)) map.set(imageId, board.id);
        }
      }
      return map;
    }
  },
  actions: {
    async refresh() {
      this.boards = await db.moodboards.orderBy('createdAt').reverse().toArray();
    },
    async load() {
      await this.refresh();
    },
    async createBoard(name: string, description: string, imageIds: string[] = [], tags: string[] = []): Promise<MoodBoard> {
      const imageMap = await imageMapFor(imageIds);
      const board: MoodBoard = {
        id: crypto.randomUUID(),
        name: name.trim() || '未命名灵感板',
        description,
        createdAt: new Date().toISOString(),
        coverImageUrl: firstValidImageUrl(imageIds, imageMap),
        imageIds: [...imageIds],
        tags
      };
      await db.moodboards.put(board);
      await this.refresh();
      return board;
    },
    /**
     * 把图片归档到目标灵感板：同一图片只能属于一个灵感板。
     * 移除旧板与写入新板在同一个事务里完成，任一步失败整体回滚，保持原归属。
     */
    async assignImage(imageId: string, targetBoardId: string) {
      await db.transaction('rw', db.moodboards, db.images, async () => {
        const target = await db.moodboards.get(targetBoardId);
        if (!target) throw new Error('目标灵感板不存在，请刷新后重试');
        const image = await db.images.get(imageId);
        if (!image) throw new Error('图片数据不存在，无法收藏');

        const all = await db.moodboards.toArray();
        const source = all.find((board) => board.id !== targetBoardId && board.imageIds.includes(imageId));

        if (source) {
          const nextSourceIds = source.imageIds.filter((id) => id !== imageId);
          const sourceMap = await imageMapFor(nextSourceIds);
          await db.moodboards.put({ ...source, imageIds: nextSourceIds, coverImageUrl: firstValidImageUrl(nextSourceIds, sourceMap) });
        }
        if (!target.imageIds.includes(imageId)) {
          const nextTargetIds = [...target.imageIds, imageId];
          const targetMap = await imageMapFor(nextTargetIds);
          await db.moodboards.put({ ...target, imageIds: nextTargetIds, coverImageUrl: firstValidImageUrl(nextTargetIds, targetMap) });
        }
      });
      await this.refresh();
    },
    /** 按拖拽后的真实顺序保存有效图片，失效引用保留在原相对顺序的末尾 */
    async reorderBoard(boardId: string, orderedImageIds: string[]) {
      const board = await db.moodboards.get(boardId);
      if (!board) throw new Error('灵感板不存在，请刷新后重试');
      const imageMap = await imageMapFor(board.imageIds);
      const { validImages, missingIds } = partitionBoardImages(board.imageIds, imageMap);
      if (!isPermutation(validImages.map((image) => image.id), orderedImageIds)) {
        throw new Error('拖拽结果与当前图片不一致，请刷新后重试');
      }
      const nextIds = [...orderedImageIds, ...missingIds];
      await db.moodboards.put({ ...board, imageIds: nextIds, coverImageUrl: firstValidImageUrl(nextIds, imageMap) });
      await this.refresh();
    }
  }
});
