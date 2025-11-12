import { defineStore } from 'pinia';
import type { TaskRecord } from '@/services/api';
import { fetchTask, fetchTasks } from '@/services/api';

interface TaskState {
  tasks: TaskRecord[];
  currentTaskId: string | null;
  taskDetail: TaskRecord | null;
  logs: Record<string, string[]>;
  isLoading: boolean;
  fallbackFolders: Record<string, string>;
}

export const useTaskStore = defineStore('tasks', {
  state: (): TaskState => ({
    tasks: [],
    currentTaskId: null,
    taskDetail: null,
    logs: {},
    isLoading: false,
    fallbackFolders: {}
  }),
  actions: {
    async loadTasks() {
      this.isLoading = true;
      try {
        const list = await fetchTasks();
        this.tasks = list;
      } finally {
        this.isLoading = false;
      }
    },
    async loadTaskDetail(id: string) {
      this.isLoading = true;
      try {
        this.taskDetail = await fetchTask(id);
        this.currentTaskId = id;
      } finally {
        this.isLoading = false;
      }
    },
    setCurrentTask(id: string | null) {
      this.currentTaskId = id;
    },
    appendLog(id: string, line: string) {
      const arr = (this.logs[id] ??= []);
      arr.push(line);
    },
    upsertTask(next: TaskRecord) {
      const idx = this.tasks.findIndex((t) => t.id === next.id);
      if (idx >= 0) this.tasks[idx] = next;
      else this.tasks.unshift(next);
    },
    setFallbackFolder(taskId: string, folder: string) {
      if (!taskId || !folder) return;
      this.fallbackFolders[taskId] = folder;
    }
  }
});
