<template>
  <section class="space-y-7">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p class="text-sm font-semibold uppercase tracking-[0.25em] text-clay">Moodboards</p>
        <h1 class="page-title mt-3">{{ detailBoard ? detailBoard.name : '把收藏重排成方案线索' }}</h1>
        <p v-if="detailBoard" class="mt-2 text-sm text-ink/60">{{ detailBoard.description }}</p>
      </div>
      <button v-if="detailBoard" class="border border-ink/15 px-5 py-3 font-semibold text-ink" @click="closeDetail">返回灵感板列表</button>
      <button v-else class="bg-ink px-5 py-3 font-semibold text-paper" @click="showCreate = !showCreate">新建灵感板</button>
    </div>

    <div v-if="showCreate && !detailBoard" class="space-y-3 bg-paper p-5 ring-1 ring-ink/10">
      <input v-model.trim="newName" type="text" maxlength="30" placeholder="灵感板名称（必填）" class="w-full border border-ink/15 bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-clay" />
      <input v-model.trim="newDescription" type="text" maxlength="80" placeholder="描述（可选）" class="w-full border border-ink/15 bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-clay" />
      <p v-if="createError" class="text-sm text-clay">{{ createError }}</p>
      <button class="bg-clay px-5 py-2 text-sm font-semibold text-paper" @click="create">创建灵感板</button>
    </div>

    <template v-if="!detailBoard">
      <div v-if="boards.boards.length" class="grid gap-5 lg:grid-cols-3">
        <MoodBoardCard v-for="board in boards.boards" :key="board.id" :board="board" @open="openDetail" />
      </div>
      <EmptyState v-else text="还没有灵感板，点击右上角新建一个" />
    </template>

    <template v-else>
      <div class="flex flex-wrap items-center gap-3 bg-paper px-5 py-4 ring-1 ring-ink/10">
        <span class="text-sm text-ink/70">{{ validImages.length }} 张有效图片</span>
        <span v-if="invalidIds.length" class="bg-ochre/15 px-2 py-1 text-xs text-ochre">{{ invalidIds.length }} 个无效图片引用</span>
        <span class="text-xs text-ink/50">拖拽排序会自动保存，封面始终取首张有效图片</span>
      </div>

      <EmptyState v-if="!detailBoard.imageIds.length" text="灵感板还是空的，去灵感图集双击或长按图片收藏到这里" />

      <div v-else class="bg-paper p-6 ring-1 ring-ink/10">
        <h2 class="font-display text-3xl text-ink">拖拽排列</h2>
        <DraggableGrid v-if="validImages.length" class="mt-5" :images="validImages" @reorder="onReorder" @remove="onRemove" />
        <div v-if="invalidIds.length" class="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
          <div v-for="id in invalidIds" :key="id" class="flex aspect-square items-center justify-center border border-dashed border-ink/20 bg-ink/5 p-3 text-center text-xs text-ink/50">
            图片引用无效<br />（{{ id }}）
          </div>
        </div>
        <EmptyState v-if="!validImages.length" class="mt-5" text="板内图片引用均已失效，请重新收藏" />
      </div>
    </template>

    <Transition name="toast">
      <div v-if="toast" class="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 bg-ink px-5 py-3 text-sm text-paper shadow-lg">
        {{ toast }}
      </div>
    </Transition>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import DraggableGrid from '../components/common/DraggableGrid.vue';
import EmptyState from '../components/common/EmptyState.vue';
import MoodBoardCard from '../components/common/MoodBoardCard.vue';
import { useInspirationStore } from '../stores/inspirationStore';
import { useMoodboardStore } from '../stores/moodboardStore';
import { AppError } from '../types/errors';
import { InspirationImage, MoodBoard } from '../types';

const boards = useMoodboardStore();
const inspirations = useInspirationStore();

const detailBoardId = ref<string | null>(null);
const showCreate = ref(false);
const newName = ref('');
const newDescription = ref('');
const createError = ref('');
const toast = ref('');
let toastTimer: number | undefined;

const detailBoard = computed(() => boards.boards.find((board) => board.id === detailBoardId.value) ?? null);
const imageMap = computed(() => new Map(inspirations.images.map((image) => [image.id, image])));
const validImages = computed(() => {
  if (!detailBoard.value) return [] as InspirationImage[];
  return detailBoard.value.imageIds.map((id) => imageMap.value.get(id)).filter((image): image is InspirationImage => Boolean(image));
});
const invalidIds = computed(() => (detailBoard.value ? detailBoard.value.imageIds.filter((id) => !imageMap.value.has(id)) : []));

function showToast(message: string) {
  toast.value = message;
  if (toastTimer) window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => (toast.value = ''), 2400);
}

async function create() {
  if (!newName.value) {
    createError.value = '请先填写灵感板名称';
    return;
  }
  createError.value = '';
  await boards.createBoard(newName.value, newDescription.value || '手动整理的灵感方向');
  newName.value = '';
  newDescription.value = '';
  showCreate.value = false;
}

async function openDetail(board: MoodBoard) {
  await boards.sanitizeBoard(board.id);
  detailBoardId.value = board.id;
}

function closeDetail() {
  detailBoardId.value = null;
}

async function onReorder(images: InspirationImage[]) {
  if (!detailBoardId.value) return;
  try {
    await boards.reorderBoard(detailBoardId.value, images.map((image) => image.id));
  } catch (error) {
    showToast(error instanceof AppError ? error.message : '顺序保存失败，保持原有排列');
  }
}

async function onRemove(image: InspirationImage) {
  try {
    await boards.removeImage(image.id);
    showToast(`已将「${image.sourceDescription}」移出灵感板`);
  } catch (error) {
    showToast(error instanceof AppError ? error.message : '移除失败，请重试');
  }
}

onMounted(async () => {
  await inspirations.seed();
  await boards.load();
  await boards.ensureDefaultBoard();
});
</script>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.25s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
}
</style>
