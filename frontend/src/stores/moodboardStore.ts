import { defineStore } from 'pinia';
import { AppError } from '../types/errors';
import { InspirationImage, MoodBoard } from '../types';
import { pruneInvalidImageIds, withResolvedCover } from '../utils/boardArchive';
import { db } from '../utils/db';

const DEFAULT_COVER = 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=900&q=80';

/** 批量加载图片并组装成 id -> 图片 的查找函数。 */
async function loadImageLookup(ids: string[]): Promise<(id: string) => InspirationImage | undefined> {
  const unique = [...new Set(ids)];
  const images = await db.images.bulkGet(unique);
  const map = new Map<string, InspirationImage>();
  unique.forEach((id, index) => {
    const image = images[index];
    if (image) map.set(id, image);
  });
  return (id: string) => map.get(id);
}

export const useMoodboardStore = defineStore('moodboards', {
  state: () => ({ boards: [] as MoodBoard[] }),
  getters: {
    boardById(state) {
      return (id: string) => state.boards.find((board) => board.id === id);
    },
    /** 图片当前归属的灵感板 id；未归档时返回 undefined。 */
    boardIdOfImage(state) {
      return (imageId: string) => state.boards.find((board) => board.imageIds.includes(imageId))?.id;
    }
  },
  actions: {
    async load() {
      this.boards = await db.moodboards.orderBy('createdAt').reverse().toArray();
    },
    async ensureDefaultBoard() {
      if (this.boards.length) return;
      const board: MoodBoard = {
        id: crypto.randomUUID(),
        name: '安静木色家',
        description: '低饱和木色、自然光和轻收纳',
        createdAt: new Date().toISOString(),
        coverImageUrl: DEFAULT_COVER,
        imageIds: [],
        tags: ['木色', '自然光']
      };
      await db.moodboards.put(board);
      await this.load();
    },
    async createBoard(name: string, description: string, imageIds: string[] = [], tags: string[] = ['木色', '自然光']) {
      const board: MoodBoard = {
        id: crypto.randomUUID(),
        name,
        description,
        createdAt: new Date().toISOString(),
        coverImageUrl: DEFAULT_COVER,
        imageIds: [],
        tags
      };
      await db.moodboards.put(board);
      await this.load();
      if (imageIds.length) {
        for (const imageId of imageIds) {
          await this.assignImage(imageId, board.id);
        }
      }
      return board;
    },
    /**
     * 把图片归档到指定灵感板（同一图片只属于一个灵感板）。
     * 移除旧归属与写入新归属在同一个 IndexedDB 事务里完成，
     * 任一步失败整个事务回滚，图片保持原归属。
     */
    async assignImage(imageId: string, targetBoardId: string) {
      const image = await db.images.get(imageId);
      if (!image) throw new AppError('IMAGE_NOT_FOUND', `图片不存在：${imageId}`);
      const target = await db.moodboards.get(targetBoardId);
      if (!target) throw new AppError('BOARD_NOT_FOUND', `灵感板不存在：${targetBoardId}`);

      const sourceBoards = await db.moodboards.filter((board) => board.imageIds.includes(imageId)).toArray();
      const involvedIds = [imageId, ...sourceBoards.flatMap((board) => board.imageIds), ...target.imageIds];
      const imageById = await loadImageLookup(involvedIds);

      const touched = new Map<string, MoodBoard>();
      for (const board of sourceBoards) {
        touched.set(board.id, withResolvedCover({ ...board, imageIds: board.imageIds.filter((id) => id !== imageId) }, imageById));
      }
      const currentTarget = touched.get(targetBoardId) ?? target;
      const nextIds = currentTarget.imageIds.includes(imageId) ? currentTarget.imageIds : [...currentTarget.imageIds, imageId];
      touched.set(targetBoardId, withResolvedCover({ ...currentTarget, imageIds: nextIds }, imageById));

      try {
        await db.transaction('rw', db.moodboards, db.images, async () => {
          await db.moodboards.bulkPut([...touched.values()]);
          await db.images.put({ ...image, collectedAt: new Date().toISOString() });
        });
      } catch {
        throw new AppError('PERSISTENCE_FAILED', '归档写入失败，图片保持原归属');
      }
      await this.load();
    },
    /** 把图片从所属灵感板移除（归档闭环的逆向操作）。 */
    async removeImage(imageId: string) {
      const sources = await db.moodboards.filter((board) => board.imageIds.includes(imageId)).toArray();
      if (!sources.length) return;
      const imageById = await loadImageLookup(sources.flatMap((board) => board.imageIds));
      const next = sources.map((board) =>
        withResolvedCover({ ...board, imageIds: board.imageIds.filter((id) => id !== imageId) }, imageById)
      );
      try {
        await db.transaction('rw', db.moodboards, async () => {
          await db.moodboards.bulkPut(next);
        });
      } catch {
        throw new AppError('PERSISTENCE_FAILED', '移除失败，图片保持原归属');
      }
      await this.load();
    },
    /** 按拖拽结果整序保存；无效引用在保存前剔除，保证刷新后顺序一致。 */
    async reorderBoard(boardId: string, orderedImageIds: string[]) {
      const board = await db.moodboards.get(boardId);
      if (!board) throw new AppError('BOARD_NOT_FOUND', `灵感板不存在：${boardId}`);
      const imageById = await loadImageLookup(board.imageIds);
      const seen = new Set<string>();
      const kept: string[] = [];
      for (const id of orderedImageIds) {
        if (board.imageIds.includes(id) && !seen.has(id)) {
          seen.add(id);
          kept.push(id);
        }
      }
      for (const id of board.imageIds) {
        if (!seen.has(id)) kept.push(id);
      }
      const next = withResolvedCover({ ...board, imageIds: pruneInvalidImageIds(kept, imageById) }, imageById);
      try {
        await db.moodboards.put(next);
      } catch {
        throw new AppError('PERSISTENCE_FAILED', '顺序保存失败，保持原有排列');
      }
      await this.load();
    },
    /** 打开灵感板详情前清理无效引用，保证封面取首张有效图片。 */
    async sanitizeBoard(boardId: string) {
      const board = await db.moodboards.get(boardId);
      if (!board) return;
      const imageById = await loadImageLookup(board.imageIds);
      const pruned = pruneInvalidImageIds(board.imageIds, imageById);
      const next = withResolvedCover({ ...board, imageIds: pruned }, imageById);
      if (pruned.length !== board.imageIds.length || next.coverImageUrl !== board.coverImageUrl) {
        await db.moodboards.put(next);
        await this.load();
      }
    },
    async renameBoard(boardId: string, name: string, description: string) {
      const board = await db.moodboards.get(boardId);
      if (!board) throw new AppError('BOARD_NOT_FOUND', `灵感板不存在：${boardId}`);
      await db.moodboards.put({ ...board, name, description });
      await this.load();
    }
  }
});
