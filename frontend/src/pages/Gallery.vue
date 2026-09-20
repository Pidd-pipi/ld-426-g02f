<template>
  <section class="space-y-7">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p class="text-sm font-semibold uppercase tracking-[0.25em] text-clay">Gallery</p>
        <h1 class="page-title mt-3">按风格和空间筛选灵感</h1>
      </div>
      <div class="space-y-3">
        <FilterTabs v-model="styleValue" :items="styleItems" />
        <FilterTabs v-model="roomValue" :items="roomItems" />
      </div>
    </div>
    <div v-if="store.filteredImages.length" class="columns-1 gap-5 md:columns-2 xl:columns-3">
      <ImageCard v-for="image in store.filteredImages" :key="image.id" :image="image" :board-name="boardNameOf(image.id)" @collect="openPicker" />
    </div>
    <EmptyState v-else text="当前筛选下没有灵感图片" />
    <BoardPickerDialog
      v-if="pickerImage"
      :boards="boards.boards"
      :current-board-id="pickerCurrentBoardId"
      :busy="pickerBusy"
      :error="pickerError"
      @confirm="handleConfirm"
      @create="handleCreate"
      @close="closePicker"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import BoardPickerDialog from '../components/common/BoardPickerDialog.vue';
import EmptyState from '../components/common/EmptyState.vue';
import FilterTabs from '../components/common/FilterTabs.vue';
import ImageCard from '../components/common/ImageCard.vue';
import { useInspirationStore } from '../stores/inspirationStore';
import { useMoodboardStore } from '../stores/moodboardStore';
import { DecorStyle, InspirationImage, RoomType } from '../types';

const store = useInspirationStore();
const boards = useMoodboardStore();
const styleItems = Object.values(DecorStyle);
const roomItems = Object.values(RoomType);
const styleValue = computed({ get: () => store.styleFilter, set: (value) => (store.styleFilter = value as DecorStyle | undefined) });
const roomValue = computed({ get: () => store.roomFilter, set: (value) => (store.roomFilter = value as RoomType | undefined) });

const pickerImage = ref<InspirationImage | null>(null);
const pickerBusy = ref(false);
const pickerError = ref('');

const boardNameByImageId = computed(() => {
  const map = new Map<string, string>();
  for (const board of boards.boards) {
    for (const imageId of board.imageIds) {
      if (!map.has(imageId)) map.set(imageId, board.name);
    }
  }
  return map;
});
const pickerCurrentBoardId = computed(() => (pickerImage.value ? boards.ownership.get(pickerImage.value.id) : undefined));

function boardNameOf(imageId: string) {
  return boardNameByImageId.value.get(imageId);
}

function openPicker(image: InspirationImage) {
  pickerError.value = '';
  pickerImage.value = image;
}

function closePicker() {
  if (pickerBusy.value) return;
  pickerImage.value = null;
}

async function runPickerAction(action: () => Promise<void>) {
  pickerBusy.value = true;
  pickerError.value = '';
  try {
    await action();
    pickerImage.value = null;
  } catch (error) {
    pickerError.value = error instanceof Error ? error.message : '操作失败，请重试';
  } finally {
    pickerBusy.value = false;
  }
}

function handleConfirm(boardId: string) {
  const image = pickerImage.value;
  if (!image) return;
  void runPickerAction(async () => {
    await store.collect(image);
    await boards.assignImage(image.id, boardId);
  });
}

function handleCreate(payload: { name: string; description: string }) {
  const image = pickerImage.value;
  if (!image) return;
  void runPickerAction(async () => {
    const board = await boards.createBoard(payload.name, payload.description);
    await store.collect(image);
    await boards.assignImage(image.id, board.id);
  });
}

onMounted(async () => {
  await store.seed();
  await boards.load();
});
</script>
