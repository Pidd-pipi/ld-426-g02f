<template>
  <section class="space-y-7">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p class="text-sm font-semibold uppercase tracking-[0.25em] text-clay">Gallery</p>
        <h1 class="page-title mt-3">按风格和空间筛选灵感</h1>
        <p class="mt-2 text-sm text-ink/60">双击或长按图片，选择灵感板收藏；同一图片只会归属于一个灵感板。</p>
      </div>
      <div class="space-y-3">
        <FilterTabs v-model="styleValue" :items="styleItems" />
        <FilterTabs v-model="roomValue" :items="roomItems" />
      </div>
    </div>
    <div v-if="store.filteredImages.length" class="columns-1 gap-5 md:columns-2 xl:columns-3">
      <div
        v-for="image in store.filteredImages"
        :key="image.id"
        class="mb-5 break-inside-avoid select-none"
        @click="handleClick"
        @dblclick.prevent="openPicker(image)"
        @mousedown="pressStart(image)"
        @mouseup="pressEnd"
        @mouseleave="pressEnd"
        @touchstart.passive="pressStart(image)"
        @touchend="pressEnd"
        @touchcancel="pressEnd"
        @contextmenu.prevent
      >
        <ImageCard :image="image" />
        <p v-if="ownerBoardName(image.id)" class="mt-2 inline-block bg-moss/10 px-2 py-1 text-xs text-moss">
          已归档：{{ ownerBoardName(image.id) }}
        </p>
      </div>
    </div>
    <EmptyState v-else text="当前筛选下没有灵感图片" />

    <BoardPickerDialog v-model="pickerOpen" :image="pickerImage" @archived="onArchived" />

    <Transition name="toast">
      <div v-if="toast" class="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 bg-ink px-5 py-3 text-sm text-paper shadow-lg">
        {{ toast }}
      </div>
    </Transition>
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

const LONG_PRESS_MS = 550;

const store = useInspirationStore();
const boards = useMoodboardStore();
const styleItems = Object.values(DecorStyle);
const roomItems = Object.values(RoomType);
const styleValue = computed({ get: () => store.styleFilter, set: (value) => (store.styleFilter = value as DecorStyle | undefined) });
const roomValue = computed({ get: () => store.roomFilter, set: (value) => (store.roomFilter = value as RoomType | undefined) });

const pickerOpen = ref(false);
const pickerImage = ref<InspirationImage | null>(null);
const toast = ref('');

let pressTimer: number | undefined;
let pressTriggered = false;
let toastTimer: number | undefined;

function showToast(message: string) {
  toast.value = message;
  if (toastTimer) window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => (toast.value = ''), 2400);
}

function openPicker(image: InspirationImage) {
  pickerImage.value = image;
  pickerOpen.value = true;
}

function pressStart(image: InspirationImage) {
  pressTriggered = false;
  pressTimer = window.setTimeout(() => {
    pressTriggered = true;
    openPicker(image);
  }, LONG_PRESS_MS);
}

function pressEnd() {
  if (pressTimer) {
    window.clearTimeout(pressTimer);
    pressTimer = undefined;
  }
}

function handleClick() {
  if (pressTriggered) {
    pressTriggered = false;
    return;
  }
  showToast('双击或长按图片，选择灵感板收藏');
}

function ownerBoardName(imageId: string) {
  const boardId = boards.boardIdOfImage(imageId);
  return boardId ? boards.boardById(boardId)?.name : undefined;
}

async function onArchived(payload: { boardName: string }) {
  await store.refresh();
  showToast(`已收藏到「${payload.boardName}」`);
}

onMounted(async () => {
  await store.seed();
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
