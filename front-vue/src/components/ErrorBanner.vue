<template>
  <div v-if="message" class="error-banner">
    <span>{{ message }}</span>
    <button class="close" @click="$emit('close')" aria-label="关闭">×</button>
  </div>
</template>

<script setup lang="ts">
defineProps<{ message: string | null }>();
defineEmits<{ (e: 'close'): void }>();
</script>

<style scoped>
.error-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  background: #fee2e2;
  color: #7f1d1d;
  border: 1px solid #fecaca;
}
.close {
  background: transparent;
  border: none;
  color: #7f1d1d;
  font-size: 1.25rem;
  cursor: pointer;
}
</style>

