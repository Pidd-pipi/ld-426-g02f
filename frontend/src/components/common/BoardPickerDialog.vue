<template>
  <Teleport to="body">
    <div v-if="modelValue && image" class="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4" @click.self="cancel">
      <div class="w-full max-w-md bg-paper p-6 shadow-xl ring-1 ring-ink/10" role="dialog" aria-modal="true">
        <p class="text-sm font-semibold uppercase tracking-[0.25em] text-clay">收藏到灵感板</p>
        <h2 class="mt-2 font-display text-2xl text-ink">{{ image.sourceDescription }}</h2>

        <template v-if="boards.length">
          <p class="mt-4 text-sm text-ink/60">同一图片只能属于一个灵感板，改选会整体移动。</p>
          <ul class="mt-3 max-h-56 space-y-2 overflow-y-auto">
            <li v-for="board in boards" :key="board.id">
              <label class="flex cursor-pointer items-center gap-3 border border-ink/10 px-3 py-2 transition hover:border-clay" :class="{ 'border-clay bg-clay/10': selectedBoardId === board.id }">
                <input v-model="selectedBoardId" type="radio" name="board-picker" :value="board.id" class="accent-clay" />
                <img v-if="board.coverImageUrl" :src="board.coverImageUrl" :alt="board.name" class="h-10 w-10 shrink-0 object-cover" />
                <span v-else class="flex h-10 w-10 shrink-0 items-center justify-center bg-ink/10 text-xs text-ink/50">空</span>
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-sm font-semibold text-ink">{{ board.name }}</span>
                  <span class="block text-xs text-ink/50">{{ board.imageIds.length }} 张图片</span>
                </span>
                <span v-if="currentBoardId === board.id" class="shrink-0 text-xs text-moss">当前所在</span>
              </label>
            </li>
          </ul>
          <button class="mt-3 text-sm font-semibold text-clay underline underline-offset-4" @click="showCreate = !showCreate">
            {{ showCreate ? '收起新建' : '新建灵感板' }}
          </button>
        </template>
        <p v-else class="mt-4 border border-dashed border-ink/20 bg-ink/5 px-4 py-3 text-sm text-ink/70">
          还没有可选择的灵感板，请先新建一个。
        </p>

        <div v-if="showCreate || !boards.length" class="mt-3 space-y-2">
          <input v-model.trim="newBoardName" type="text" maxlength="30" placeholder="灵感板名称（必填）" class="w-full border border-ink/15 bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-clay" />
          <button class="w-full border border-ink/15 px-3 py-2 text-sm font-semibold text-ink transition hover:border-clay hover:text-clay" :disabled="busy" @click="createAndArchive">
            新建并收藏到此板
          </button>
        </div>

        <p v-if="errorMessage" class="mt-3 bg-clay/10 px-3 py-2 text-sm text-clay">{{ errorMessage }}</p>

        <div class="mt-5 flex justify-end gap-3">
          <button class="border border-ink/15 px-4 py-2 text-sm text-ink" :disabled="busy" @click="cancel">取消</button>
          <button v-if="boards.length" class="bg-ink px-4 py-2 text-sm font-semibold text-paper transition hover:bg-clay disabled:opacity-50" :disabled="busy || !selectedBoardId" @click="confirm">
            {{ busy ? '归档中…' : '确认收藏' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { AppError } from '../../types/errors';
import { InspirationImage } from '../../types';
import { useMoodboardStore } from '../../stores/moodboardStore';

const props = defineProps<{ modelValue: boolean; image: InspirationImage | null }>();
const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  archived: [payload: { imageId: string; boardId: string; boardName: string }];
}>();

const store = useMoodboardStore();
const boards = computed(() => store.boards);
const selectedBoardId = ref('');
const newBoardName = ref('');
const showCreate = ref(false);
const busy = ref(false);
const errorMessage = ref('');

const currentBoardId = computed(() => (props.image ? store.boardIdOfImage(props.image.id) : undefined));

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return;
    selectedBoardId.value = currentBoardId.value ?? boards.value[0]?.id ?? '';
    newBoardName.value = '';
    showCreate.value = boards.value.length === 0;
    busy.value = false;
    errorMessage.value = '';
  }
);

function cancel() {
  if (busy.value) return;
  emit('update:modelValue', false);
}

function fail(error: unknown) {
  errorMessage.value = error instanceof AppError ? error.message : '归档失败，图片保持原归属，请重试';
}

async function confirm() {
  if (!props.image || !selectedBoardId.value) {
    errorMessage.value = '请先选择一个灵感板';
    return;
  }
  busy.value = true;
  errorMessage.value = '';
  try {
    await store.assignImage(props.image.id, selectedBoardId.value);
    const board = store.boardById(selectedBoardId.value);
    emit('archived', { imageId: props.image.id, boardId: selectedBoardId.value, boardName: board?.name ?? '' });
    emit('update:modelValue', false);
  } catch (error) {
    fail(error);
  } finally {
    busy.value = false;
  }
}

async function createAndArchive() {
  if (!props.image) return;
  if (!newBoardName.value) {
    errorMessage.value = '请先填写灵感板名称';
    return;
  }
  busy.value = true;
  errorMessage.value = '';
  try {
    const board = await store.createBoard(newBoardName.value, '手动整理的灵感方向', [props.image.id]);
    emit('archived', { imageId: props.image.id, boardId: board.id, boardName: board.name });
    emit('update:modelValue', false);
  } catch (error) {
    fail(error);
  } finally {
    busy.value = false;
  }
}
</script>
