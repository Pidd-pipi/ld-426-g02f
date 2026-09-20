<template>
  <div class="fixed inset-0 z-30 flex items-center justify-center bg-ink/40 p-4" @click.self="emit('close')">
    <div class="w-full max-w-md bg-paper p-6 shadow-xl ring-1 ring-ink/10">
      <h2 class="font-display text-2xl text-ink">收藏到灵感板</h2>
      <p class="mt-1 text-sm text-ink/60">一张图片只能属于一个灵感板，改选会整体从旧板移出并写入新板。</p>

      <div v-if="boards.length && !creating" class="mt-5 space-y-3">
        <div class="max-h-60 space-y-2 overflow-y-auto">
          <label
            v-for="board in boards"
            :key="board.id"
            class="flex cursor-pointer items-center justify-between gap-3 border px-3 py-2 transition"
            :class="selectedId === board.id ? 'border-clay bg-clay/5' : 'border-ink/10 hover:border-clay/60'"
          >
            <span class="flex items-center gap-2">
              <input v-model="selectedId" type="radio" name="board" :value="board.id" />
              <span class="text-sm font-semibold text-ink">{{ board.name }}</span>
            </span>
            <span class="text-xs text-ink/50">{{ board.imageIds.length }} 张<template v-if="board.id === currentBoardId"> · 当前所在</template></span>
          </label>
        </div>
        <button type="button" class="text-sm font-semibold text-clay" @click="creating = true">+ 新建灵感板</button>
      </div>

      <div v-else class="mt-5 space-y-3">
        <p v-if="!boards.length" class="border border-dashed border-ink/20 bg-ink/5 p-3 text-sm text-ink/70">还没有可选灵感板，先创建一个再收藏。</p>
        <input v-model="newName" type="text" placeholder="灵感板名称（必填）" class="w-full border border-ink/20 bg-paper px-3 py-2 text-sm text-ink" />
        <input v-model="newDescription" type="text" placeholder="描述（可选）" class="w-full border border-ink/20 bg-paper px-3 py-2 text-sm text-ink" />
        <button v-if="boards.length" type="button" class="text-sm text-ink/60 underline" @click="creating = false">返回选择已有灵感板</button>
      </div>

      <p v-if="error" class="mt-3 text-sm text-red-700">{{ error }}</p>

      <div class="mt-6 flex justify-end gap-3">
        <button type="button" class="border border-ink/20 px-4 py-2 text-sm text-ink disabled:opacity-50" :disabled="busy" @click="emit('close')">取消</button>
        <button type="button" class="bg-ink px-4 py-2 text-sm font-semibold text-paper transition hover:bg-clay disabled:opacity-50" :disabled="busy || !canSubmit" @click="submit">
          {{ busy ? '保存中…' : creating ? '创建并收藏' : '确认收藏' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { MoodBoard } from '../../types';

const props = defineProps<{ boards: MoodBoard[]; currentBoardId?: string; busy: boolean; error: string }>();
const emit = defineEmits<{
  confirm: [boardId: string];
  create: [payload: { name: string; description: string }];
  close: [];
}>();

const selectedId = ref<string | undefined>(props.currentBoardId);
const creating = ref(!props.boards.length);
const newName = ref('');
const newDescription = ref('');

const canSubmit = computed(() => (creating.value ? newName.value.trim().length > 0 : Boolean(selectedId.value)));

function submit() {
  if (creating.value) {
    const name = newName.value.trim();
    if (name) emit('create', { name, description: newDescription.value.trim() });
  } else if (selectedId.value) {
    emit('confirm', selectedId.value);
  }
}
</script>
