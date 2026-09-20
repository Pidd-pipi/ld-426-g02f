<template>
  <VueDraggable v-model="localImages" class="grid grid-cols-2 gap-4 md:grid-cols-4" :animation="200" filter="button" :prevent-on-filter="false">
    <ImageCard v-for="image in localImages" :key="image.id" :image="image" mode="board" @remove="$emit('remove', $event)" />
  </VueDraggable>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { VueDraggable } from 'vue-draggable-plus';
import { InspirationImage } from '../../types';
import ImageCard from './ImageCard.vue';

const props = defineProps<{ images: InspirationImage[] }>();
const emit = defineEmits<{ reorder: [images: InspirationImage[]]; remove: [image: InspirationImage] }>();
const localImages = computed({
  get: () => props.images,
  set: (value) => emit('reorder', value)
});
</script>
