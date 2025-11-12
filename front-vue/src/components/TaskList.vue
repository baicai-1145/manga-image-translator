<template>
  <section class="task-list">
    <header class="task-list__header">
      <h2>任务列表</h2>
      <button class="refresh" @click="refresh" :disabled="loading">刷新</button>
    </header>

    <div v-if="loading" class="empty">加载中…</div>
    <p v-else-if="!tasks.length" class="empty">暂无任务</p>

    <div v-else class="task-list__items">
      <article
        v-for="task in tasks"
        :key="task.id"
        :class="['task-card', { active: task.id === currentTaskId }]"
        @click="$emit('select', task.id)"
      >
        <div class="task-card__row">
          <span class="task-card__id">{{ task.id.slice(0, 8) }}</span>
          <span class="task-card__status" :data-status="statusKey(task)">{{ statusLabel(task) }}</span>
        </div>
        <div class="task-card__meta">
          <span v-if="task.queue_position != null">队列: {{ task.queue_position }}</span>
          <span>{{ createdLabel(task.created_at) }}</span>
        </div>
        <p v-if="task.error" class="task-card__error">{{ task.error }}</p>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { TaskRecord } from '@/services/api';
import { useTaskStore } from '@/stores/taskStore';
import { computed } from 'vue';
defineProps<{ tasks: TaskRecord[]; loading?: boolean }>();
const emit = defineEmits<{ (e: 'refresh'): void; (e: 'select', id: string): void }>();

function refresh() {
  emit('refresh');
}

const taskStore = useTaskStore();
const currentTaskId = computed(() => taskStore.currentTaskId);

function statusKey(t: TaskRecord) {
  const v = (t.status ?? '').toLowerCase();
  if (v.includes('queued') || t.queue_position != null) return 'queued';
  if (v.includes('processing') || v.includes('running')) return 'running';
  if (v.includes('completed') || v.includes('success')) return 'success';
  if (v.includes('failed') || v.includes('cancelled') || v.includes('error')) return 'failed';
  return v || 'unknown';
}
function statusLabel(t: TaskRecord) {
  switch (statusKey(t)) {
    case 'queued': return '排队中';
    case 'running': return '运行中';
    case 'success': return '完成';
    case 'failed': return '失败';
    default: return t.status ?? '-';
  }
}
function createdLabel(value: string) {
  return `开始于 ${new Date(value).toLocaleString()}`;
}
</script>

<style scoped>
.task-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.task-list__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.task-list__header h2 {
  margin: 0;
  font-size: 1rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
}
.refresh {
  background: transparent;
  border: 1px solid var(--accent);
  color: var(--accent);
  padding: 0.5rem 1rem;
  border-radius: 999px;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;
}
.refresh:hover {
  background: var(--accent);
  color: #111;
}
.task-list__items {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-height: 60vh;
  overflow: auto;
  padding-right: 2px;
}
.task-card {
  padding: 1rem;
  border-radius: 0.75rem;
  border: 1px solid var(--border-color);
  background: var(--bg-hover);
  cursor: pointer;
  transition: border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
  box-shadow: none;
}
.task-card:hover {
  border-color: var(--accent);
  transform: translateY(-3px);
  box-shadow: var(--card-shadow);
}
.task-card.active {
  border-color: var(--accent);
  box-shadow: var(--card-shadow);
}
.task-card__row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}
.task-card__id {
  font-weight: 600;
  letter-spacing: 0.1em;
}
.task-card__status[data-status='running'] { color: var(--info); }
.task-card__status[data-status='success'] { color: var(--success); }
.task-card__status[data-status='failed'] { color: var(--danger); }
.task-card__status[data-status='queued'] { color: var(--text-muted); }
.task-card__meta {
  display: flex;
  gap: 0.75rem;
  color: var(--text-muted);
  font-size: 0.85rem;
}
.task-card__error {
  margin: 0.5rem 0 0;
  color: var(--danger);
  font-size: 0.85rem;
}
.empty {
  text-align: center;
  color: var(--text-muted);
}
</style>
