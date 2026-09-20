<template>
  <section class="space-y-7">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p class="text-sm font-semibold uppercase tracking-[0.25em] text-clay">Moodboards</p>
        <h1 class="page-title mt-3">把收藏重排成方案线索</h1>
      </div>
      <form class="flex gap-2" @submit.prevent="create">
        <input v-model="newBoardName" type="text" placeholder="新灵感板名称" class="border border-ink/20 bg-paper px-3 py-2 text-sm text-ink" />
        <button type="submit" class="bg-ink px-5 py-3 font-semibold text-paper disabled:opacity-50" :disabled="!newBoardName.trim()">新建灵感板</button>
      </form>
    </div>

    <EmptyState v-if="!boards.boards.length" text="还没有灵感板，先新建一个，或在灵感图集收藏图片时创建" />
    <div v-else class="grid gap-5 lg:grid-cols-3">
      <button
        v-for="board in boards.boards"
        :key="board.id"
        type="button"
        class="text-left ring-2 ring-offset-2 ring-offset-paper transition"
        :class="board.id === selectedBoard?.id ? 'ring-clay' : 'ring-transparent hover:ring-ink/20'"
        @click="selectedId = board.id"
      >
        <MoodBoardCard :board="board" :cover-url="coverOf(board)" />
      </button>
    </div>

    <div v-if="selectedBoard" class="bg-paper p-6 ring-1 ring-ink/10">
      <div class="flex flex-wrap items-baseline justify-between gap-2">
        <h2 class="font-display text-3xl text-ink">{{ selectedBoard.name }}</h2>
        <p class="text-sm text-ink/60">
          {{ detail.validImages.length }} 张有效图片<template v-if="detail.missingIds.length"> · {{ detail.missingIds.length }} 个失效引用</template>
        </p>
      </div>

      <EmptyState v-if="!selectedBoard.imageIds.length" class="mt-5" text="这块灵感板还是空的，去灵感图集收藏图片后会出现在这里" />
      <template v-else>
        <EmptyState v-if="!detail.validImages.length" class="mt-5" text="板内图片引用已全部失效，没有可展示的有效图片" />
        <DraggableGrid v-else class="mt-5" :images="orderedImages" @reorder="onReorder" />
        <div v-if="detail.missingIds.length" class="mt-5">
          <p class="text-sm font-semibold text-ink/70">失效图片引用（仍保留在板内顺序末尾）</p>
          <div class="mt-2 grid grid-cols-2 gap-3 md:grid-cols-4">
            <div v-for="id in detail.missingIds" :key="id" class="flex aspect-square flex-col items-center justify-center gap-1 border border-dashed border-ink/30 bg-ink/5 p-2 text-center text-xs text-ink/50">
              <span>图片已失效</span>
              <span class="break-all">{{ id }}</span>
            </div>
          </div>
        </div>
      </template>
      <p v-if="reorderError" class="mt-3 text-sm text-red-700">{{ reorderError }}</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import DraggableGrid from '../components/common/DraggableGrid.vue';
import EmptyState from '../components/common/EmptyState.vue';
import MoodBoardCard from '../components/common/MoodBoardCard.vue';
import { useInspirationStore } from '../stores/inspirationStore';
import { useMoodboardStore } from '../stores/moodboardStore';
import { InspirationImage, MoodBoard } from '../types';
import { firstValidImageUrl, partitionBoardImages } from '../utils/moodboardUtils';

const boards = useMoodboardStore();
const inspirations = useInspirationStore();
const selectedId = ref('');
const newBoardName = ref('');
const orderedImages = ref<InspirationImage[]>([]);
const reorderError = ref('');

const imageMap = computed(() => new Map(inspirations.images.map((image) => [image.id, image])));
const selectedBoard = computed(() => boards.boards.find((board) => board.id === selectedId.value) ?? boards.boards[0]);
const detail = computed(() =>
  selectedBoard.value ? partitionBoardImages(selectedBoard.value.imageIds, imageMap.value) : { validImages: [] as InspirationImage[], missingIds: [] as string[] }
);

watch(
  detail,
  (value) => {
    orderedImages.value = [...value.validImages];
  },
  { immediate: true }
);

function coverOf(board: MoodBoard) {
  return firstValidImageUrl(board.imageIds, imageMap.value);
}

async function create() {
  const name = newBoardName.value.trim();
  if (!name) return;
  const board = await boards.createBoard(name, '手动整理的风格方向');
  newBoardName.value = '';
  selectedId.value = board.id;
}

async function onReorder(images: InspirationImage[]) {
  const board = selectedBoard.value;
  if (!board) return;
  orderedImages.value = images;
  reorderError.value = '';
  try {
    await boards.reorderBoard(board.id, images.map((image) => image.id));
  } catch (error) {
    reorderError.value = error instanceof Error ? error.message : '顺序保存失败，请重试';
  }
}

onMounted(async () => {
  await inspirations.seed();
  await boards.load();
  selectedId.value = boards.boards[0]?.id ?? '';
});
</script>
