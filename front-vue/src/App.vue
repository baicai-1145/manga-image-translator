<template>
  <div class="app-shell">
    <header class="app-header">
      <div class="brand">
        <span class="brand-mark">MINERU</span>
        <span class="brand-subtitle">Web Console</span>
      </div>
      <div class="header-actions">
        <nav class="header-nav">
          <a href="https://github.com/baicai-1145/MinerU" target="_blank" rel="noopener">GITHUB</a>
          <a href="https://opendatalab.github.io/MinerU/zh/quick_start/index.html" target="_blank" rel="noopener">文档</a>
        </nav>
        <button class="ghost" @click="toggleTheme">{{ themeLabel }}</button>
        <button class="accent" @click="refresh">刷新任务</button>
      </div>
    </header>
    <main class="app-main">
      <aside class="app-sidebar">
        <UploadPanel />
        <TaskList :tasks="tasks" :loading="taskStore.isLoading" @refresh="refresh" @select="openDetail" />
      </aside>
      <section class="content">
        <template v-if="currentTask">
          <TaskDetail :task="currentTask" @close="closeDetail" />
        </template>
        <template v-else>
          <div class="placeholder">请选择左侧任务查看详情</div>
        </template>
      </section>
    </main>
    <ErrorBanner :message="ui.errorMessage" @close="ui.clearError" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import ErrorBanner from '@/components/ErrorBanner.vue';
import UploadPanel from '@/components/UploadPanel.vue';
import TaskList from '@/components/TaskList.vue';
import TaskDetail from '@/components/TaskDetail.vue';
import { useUiStore } from '@/stores/uiStore';
import { useTaskStore } from '@/stores/taskStore';

const ui = useUiStore();
const taskStore = useTaskStore();

const tasks = computed(() => taskStore.tasks);
const currentTask = computed(() => taskStore.taskDetail);

const theme = ref(localStorage.getItem('mineru-webui-theme') ?? 'light');
const themeLabel = computed(() => (theme.value === 'dark' ? '亮色模式' : '暗色模式'));

function refresh() {
  taskStore.loadTasks();
}
function openDetail(id: string) {
  taskStore.loadTaskDetail(id);
}
function closeDetail() {
  taskStore.taskDetail = null;
  taskStore.currentTaskId = null;
}

onMounted(() => {
  refresh();
});

watch(
  () => theme.value,
  value => {
    const body = document.body;
    if (value === 'light') body.classList.add('theme-light');
    else body.classList.remove('theme-light');
    localStorage.setItem('mineru-webui-theme', value);
  },
  { immediate: true }
);

function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark';
}
</script>

<style scoped>
.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
  color: var(--text-primary);
}
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.75rem;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-elevated);
}
.brand {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
}
.brand-mark {
  font-weight: 800;
  letter-spacing: 0.08em;
}
.brand-subtitle {
  color: var(--text-muted);
  font-size: 0.9rem;
}
.header-actions {
  display: flex;
  gap: 0.6rem;
  align-items: center;
}
.header-nav {
  display: flex;
  gap: 1rem;
  margin-right: 0.5rem;
}
.header-nav a {
  color: var(--text-muted);
}
.ghost {
  border: 1px solid var(--border-color);
  background: transparent;
  color: var(--text-primary);
  border-radius: 999px;
  padding: 0.4rem 0.9rem;
  cursor: pointer;
}
.accent {
  border: none;
  background: var(--accent);
  color: var(--accent-text);
  border-radius: 999px;
  padding: 0.5rem 1rem;
  cursor: pointer;
}
.app-main {
  display: grid;
  grid-template-columns: 330px 1fr;
  gap: 1rem;
  padding: 1rem 1.5rem 2rem;
}
.app-sidebar {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.content {
  background: var(--bg-elevated);
  border: 1px solid var(--border-color);
  border-radius: 1rem;
  min-height: 60vh;
  padding: 1rem;
  box-shadow: var(--card-shadow);
}
.placeholder {
  height: 100%;
  justify-content: space-between;
  align-items: center;
  display: flex;
  color: var(--text-muted);
}
h2 { margin: 0; font-size: 1.4rem; }
</style>
