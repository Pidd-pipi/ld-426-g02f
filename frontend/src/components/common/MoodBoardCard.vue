<template>
  <article class="cursor-pointer overflow-hidden bg-paper ring-1 ring-ink/10 transition hover:-translate-y-1 hover:shadow-lg" @click="$emit('open', board)">
    <img v-if="board.coverImageUrl && !coverFailed" :src="board.coverImageUrl" :alt="board.name" class="h-44 w-full object-cover" @error="coverFailed = true" />
    <div v-else class="flex h-44 w-full items-center justify-center bg-ink/5 text-sm text-ink/50">空灵感板 · 暂无封面</div>
    <div class="space-y-3 p-5">
      <div class="flex items-center justify-between gap-3">
        <h3 class="font-display text-2xl text-ink">{{ board.name }}</h3>
        <span class="shrink-0 text-xs text-ink/50">{{ board.imageIds.length }} 张图片</span>
      </div>
      <p class="text-sm text-ink/70">{{ board.description }}</p>
      <div class="flex gap-2">
        <span v-for="tag in board.tags" :key="tag" class="bg-moss/10 px-2 py-1 text-xs text-moss">{{ tag }}</span>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { MoodBoard } from '../../types';

defineProps<{ board: MoodBoard }>();
defineEmits<{ open: [board: MoodBoard] }>();
const coverFailed = ref(false);
</script>
