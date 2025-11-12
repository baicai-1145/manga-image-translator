<template>
  <section class="card">
    <header class="row">
      <h3>上传图片</h3>
      <div class="user">
        <label>
          用户ID（可选）
          <input v-model.trim="userId" placeholder="用于区分任务归属" @change="persistUserId" />
        </label>
      </div>
    </header>
    <div class="uploader" @dragover.prevent @drop.prevent="onDrop">
      <input ref="fileInput" type="file" accept="image/*" multiple @change="onChange" hidden />
      <input ref="dirInput" type="file" multiple webkitdirectory directory @change="onDirChange" hidden />
      <button class="accent" @click="choose">选择图片</button>
      <button class="accent" @click="chooseDir">选择文件夹</button>
      <label class="batch">
        <input type="checkbox" v-model="batchMode" />
        合并为单任务（ZIP）
      </label>
      <button class="ghost" :disabled="!files.length || uploading" @click="start">开始解析</button>
    </div>
    <details class="advanced">
      <summary>高级配置（点击展开）</summary>
      <AdvancedOptions />
      <p class="hint">配置来自原 front 的参数集合，提交时随表单发送。</p>
    </details>
    <ul class="file-list" v-if="files.length">
      <li v-for="f in files" :key="f.name" class="file-item">
        <span class="name">{{ f.name }}</span>
        <span class="status" v-if="states[f.name]?.queuePos">队列：{{ states[f.name]?.queuePos }}</span>
        <span class="status" v-if="states[f.name]?.progress">{{ states[f.name]?.progress }}</span>
        <span class="status error" v-if="states[f.name]?.error">{{ states[f.name]?.error }}</span>
        <span class="status ok" v-if="states[f.name]?.done">完成</span>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { uploadAndStream } from '@/services/stream';
import { useUiStore } from '@/stores/uiStore';
import { getUserId, setUserId } from '@/utils/session';
import { useSettingsStore } from '@/stores/settingsStore';
import AdvancedOptions from '@/components/AdvancedOptions.vue';
import { useTaskStore } from '@/stores/taskStore';
import { createBatchZip } from '@/services/api';

const ui = useUiStore();
const settings = useSettingsStore();
const taskStore = useTaskStore();
const fileInput = ref<HTMLInputElement | null>(null);
const dirInput = ref<HTMLInputElement | null>(null);
const files = ref<File[]>([]);
const userId = ref<string>(getUserId() ?? '');
const uploading = ref(false);
const batchMode = ref(false);

function persistUserId() {
  setUserId(userId.value || null);
}

function choose() {
  fileInput.value?.click();
}
function chooseDir() {
  dirInput.value?.click();
}
function onChange(e: Event) {
  const input = e.target as HTMLInputElement;
  if (!input.files) return;
  handleFileList(input.files);
  input.value = '';
}
function onDirChange(e: Event) {
  const input = e.target as HTMLInputElement;
  if (!input.files) return;
  handleFileList(input.files);
  input.value = '';
}
function handleFileList(list: FileList) {
  const arr = Array.from(list);
  const acceptedExt = ['.png', '.jpg', '.jpeg', '.bmp', '.webp'];
  const accepted = arr.filter(f => {
    const name = f.name.toLowerCase();
    return acceptedExt.some(ext => name.endsWith(ext));
  });
  files.value = [...files.value, ...accepted];
}
function onDrop(e: DragEvent) {
  const list = e.dataTransfer?.files;
  if (!list) return;
  handleFileList(list);
}

type FileState = { queuePos: string | null; progress: string | null; error: string | null; done: boolean };
const states = reactive<Record<string, FileState>>({});

function resetStates() {
  states && Object.keys(states).forEach((k) => delete states[k]);
  files.value.forEach((f) => (states[f.name] = { queuePos: null, progress: null, error: null, done: false }));
}

async function start() {
  if (!files.value.length || uploading.value) return;
  resetStates();
  uploading.value = true;
  ui.setUploading(true);
  const config = settings.buildConfig;
  const headers: Record<string, string> = {};
  if (userId.value.trim().length) headers['X-User-Id'] = userId.value.trim();

  try {
    if (batchMode.value && files.value.length > 1) {
      const startTs = Date.now();
      const { blob, taskId } = await createBatchZip(files.value, config, { batch_size: 4 });
      let urls: string[] = [];
      try {
        const zip = await JSZip.loadAsync(blob);
        const entries = Object.values(zip.files).filter(f => !f.dir && /\.(png|jpg|jpeg|bmp|webp)$/i.test(f.name));
        entries.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
        for (const f of entries) {
          const b = await f.async('blob');
          const u = URL.createObjectURL(b);
          urls.push(u);
        }
      } catch (e) {
        console.warn('解析ZIP失败，将提供直接下载', e);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'translated_images.zip';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      }
      if (urls.length) {
        if (taskId) {
          batchStore.setBatchData(taskId, urls, blob);
          taskStore.setCurrentTask(taskId);
        } else {
          // Fallback: 刚创建的 batch 任务ID可能未通过响应头返回，尝试在列表里匹配最近的 batch 任务
          await taskStore.loadTasks();
          const candidate = taskStore.tasks
            .filter(t => (t.mode ?? '').toLowerCase() === 'batch')
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
          if (candidate) {
            batchStore.setBatchData(candidate.id, urls, blob);
            taskStore.setCurrentTask(candidate.id);
          }
        }
        // 解析成功也触发一次下载，避免浏览器拦截或用户找不到按钮
        try {
          const linkUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = linkUrl;
          a.download = 'translated_images.zip';
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(linkUrl);
        } catch {}
      }
    } else {
      await Promise.all(
        files.value.map(async (file) => {
          await uploadAndStream(
            file,
            config,
            (ev) => {
              const st = (states[file.name] ??= { queuePos: null, progress: null, error: null, done: false });
              if (ev.type === 'queue') st.queuePos = ev.position;
              if (ev.type === 'progress') st.progress = ev.message;
              if (ev.type === 'waiting') st.progress = '等待执行器…';
              if (ev.type === 'error') st.error = ev.message;
              if (ev.type === 'complete') {
                st.done = true;
              }
              if (ev.type === 'folder' && ev.taskId) {
                taskStore.setFallbackFolder(ev.taskId, ev.folder);
              }
            },
            { headers }
          );
        })
      );
    }
  } catch (err: any) {
    ui.setError(err?.message ?? '上传失败');
  } finally {
    uploading.value = false;
    ui.setUploading(false);
    // 更新任务列表，用户可点击查看详情并预览图片
    await taskStore.loadTasks();
  }
}
</script>

<style scoped>
.card {
  background: var(--bg-primary, #fff);
  color: var(--text-primary, #0f172a);
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 1rem;
  padding: 0.9rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.row h3 {
  margin: 0;
  font-size: 1.05rem;
  letter-spacing: 0.02em;
}
.user label {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  font-size: 0.85rem;
}
.user input {
  padding: 0.35rem 0.55rem;
  border: 1px solid #cbd5e1;
  border-radius: 0.5rem;
  width: 220px;
  height: 34px;
  font-size: 0.9rem;
}
.uploader {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
}
.batch {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  color: var(--text-muted);
  font-size: 0.9rem;
  user-select: none;
}
button.ghost {
  border: 1px solid #cbd5e1;
  background: transparent;
  border-radius: 0.6rem;
  padding: 0.45rem 0.85rem;
  cursor: pointer;
}
.accent {
  border: none;
  background: var(--accent);
  color: var(--accent-text);
  border-radius: 0.6rem;
  padding: 0.5rem 0.95rem;
  cursor: pointer;
  font-weight: 600;
}
.hint {
  color: #64748b;
  margin-top: 0.25rem;
  font-size: 0.85rem;
}
.advanced {
  border-top: 1px dashed var(--border-color);
  padding-top: 0.5rem;
}
.advanced > summary {
  cursor: pointer;
  font-weight: 700;
  font-size: 0.9rem;
  color: var(--text-primary);
}
.file-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.92rem;
}
.file-item {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}
.file-item .name {
  font-weight: 600;
}
.status {
  color: #475569;
  }
.status.ok {
  color: #16a34a;
}
.status.error {
  color: #dc2626;
}
</style>
