<template>
  <article class="overflow-hidden bg-paper ring-1 ring-ink/10">
    <img v-if="cover && !coverFailed" :src="cover" :alt="board.name" class="h-44 w-full object-cover" @error="coverFailed = true" />
    <div v-else class="flex h-44 items-center justify-center bg-ink/5 text-sm text-ink/50">暂无封面</div>
    <div class="space-y-3 p-5">
      <div class="flex items-baseline justify-between gap-3">
        <h3 class="font-display text-2xl text-ink">{{ board.name }}</h3>
        <span class="shrink-0 text-xs text-ink/50">{{ board.imageIds.length }} 张</span>
      </div>
      <p class="text-sm text-ink/70">{{ board.description || '暂无描述' }}</p>
      <div class="flex gap-2">
        <span v-for="tag in board.tags" :key="tag" class="bg-moss/10 px-2 py-1 text-xs text-moss">{{ tag }}</span>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { MoodBoard } from '../../types';

const props = defineProps<{ board: MoodBoard; coverUrl?: string }>();
const cover = computed(() => props.coverUrl ?? props.board.coverImageUrl);
const coverFailed = ref(false);
watch(cover, () => (coverFailed.value = false));
</script>
