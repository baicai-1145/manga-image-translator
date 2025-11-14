<template>
  <section class="card" v-if="task">
    <header class="row">
      <h3>任务详情</h3>
      <div class="actions">
        <button class="ghost" @click="showDebug = !showDebug">{{ showDebug ? '隐藏调试' : '调试信息' }}</button>
        <button class="ghost" @click="refresh">刷新</button>
        <button class="ghost" @click="$emit('close')">返回</button>
      </div>
    </header>
    <div class="grid">
      <!-- Batch gallery -->
      <div class="gallery" v-if="isBatch && batchImages.length">
        <div class="hint">共 {{ batchImages.length }} 张</div>
        <div class="thumbs">
          <button
            v-for="(u,i) in batchImages"
            :key="i"
            class="thumb"
            @click="openViewer(i)"
            :aria-label="`预览第 ${i+1} 张`"
          >
            <img :src="u" alt="page" />
          </button>
        </div>
        <div class="actions">
          <button class="ghost" v-if="batchZip" @click="downloadZip">下载 ZIP</button>
        </div>
      </div>
      <!-- Single image preview -->
      <div class="preview" v-else-if="folder && imgUrl">
        <img :src="imgUrl" alt="result" @click="openViewer(0)" @error="imgError=true" />
        <div class="actions">
          <a :href="imgUrl" download="final.png">下载</a>
        </div>
      </div>
      <div class="preview placeholder" v-else>
        <p v-if="!folder">尚无结果目录，可在任务完成后点击“刷新”。</p>
        <p v-else-if="imgError">图片暂不可用，请稍后点击“刷新”。</p>
      </div>
      <!-- Move task info after preview/gallery -->
      <div class="info">
        <p><b>ID：</b><span class="mono">{{ task.id }}</span></p>
        <p><b>状态：</b>{{ task.status }}</p>
        <p><b>模式：</b>{{ task.mode ?? '-' }}</p>
        <p><b>队列：</b>{{ task.queue_position ?? '-' }}</p>
        <p><b>创建：</b>{{ task.created_at }}</p>
        <p><b>完成：</b>{{ task.finished_at ?? '-' }}</p>
        <p v-if="task.error" class="error"><b>错误：</b>{{ task.error }}</p>
        <p v-if="folder"><b>结果目录：</b><span class="mono">{{ folder }}</span></p>
      </div>
      <details v-if="showDebug" class="debug" open>
        <summary>调试信息（点击收起）</summary>
        <div class="kv"><b>result_path:</b><code>{{ task.result_path ?? '-' }}</code></div>
        <div class="kv"><b>meta.debug_folder:</b><code>{{ (task.meta as any)?.debug_folder ?? '-' }}</code></div>
        <div class="kv" v-if="folder"><b>folder:</b><code>{{ folder }}</code></div>
        <div class="kv" v-if="imgUrl"><b>imgUrl:</b><code>{{ imgUrl }}</code></div>
        <div class="kv col"><b>meta 原始值:</b></div>
        <pre class="json">{{ formattedMeta }}</pre>
      </details>
    </div>
    <!-- Lightbox Viewer -->
    <div v-if="viewerOpen" class="lightbox" @click.self="closeViewer">
      <div class="toolbar">
        <span class="counter">{{ viewerIndex + 1 }} / {{ allImages.length }}</span>
        <div class="spacer" />
        <button class="ghost" @click.stop="fitOriginal">原尺寸</button>
        <button class="ghost" @click.stop="fitWidth">适配宽度</button>
        <button class="ghost" @click.stop="toggleCompare">{{ compareMode ? '退出对照' : '对照模式' }}</button>
        <button class="ghost" @click.stop="zoomOut">-</button>
        <button class="ghost" @click.stop="resetZoom">100%</button>
        <button class="ghost" @click.stop="zoomIn">+</button>
        <button class="ghost" @click.stop="closeViewer">关闭</button>
      </div>
      <div class="nav left" @click.stop="prevImage" aria-label="上一张">‹</div>
      <div class="nav right" @click.stop="nextImage" aria-label="下一张">›</div>
      <div class="viewer" ref="viewerRef">
        <template v-if="compareMode">
          <div class="compare">
            <div class="col">
              <img :src="currentOriginal" :style="compareLeftStyle" ref="origImgEl" @load="onCompareLoad" alt="original" />
            </div>
            <div class="col">
              <img :src="currentImage" :style="compareRightStyle" ref="transImgEl" @load="onCompareLoad" alt="translated" />
            </div>
          </div>
        </template>
        <template v-else>
          <img
            v-if="currentImage"
            :src="currentImage"
            ref="imgEl"
            :style="imgStyle"
            alt="preview"
            @load="onImageLoad"
          />
        </template>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import type { TaskRecord } from '@/services/api';
import { getResultImageUrl, listResultDirectories, getResultFileUrl } from '@/services/api';
import { useTaskStore } from '@/stores/taskStore';
import { useBatchStore } from '@/stores/batchStore';

const props = defineProps<{ task: TaskRecord | null }>();
defineEmits<{ (e: 'close'): void }>();
const taskStore = useTaskStore();
const batchStore = useBatchStore();
const imgError = ref(false);
const showDebug = ref(false);
const resolving = ref(false);

function normalizeFolder(value?: string | null): string | null {
  if (!value) return null;
  const clean = value.trim();
  if (!clean) return null;
  // try to extract from any path containing /result/<folder>/
  const m = clean.replace(/\\/g, '/').match(/\/result\/([^\/]+)(?:\/|$)/i);
  if (m && m[1]) return m[1];
  // otherwise take the last non-empty segment
  const segs = clean.replace(/\\/g, '/').split('/').filter(Boolean);
  const last = segs[segs.length - 1];
  if (!last || last.toLowerCase() === 'result' || last === '..') return null;
  return last;
}

const folder = computed(() => {
  // 1) 优先使用流式/兜底解析得到的缓存映射（与任务强绑定）
  if (props.task?.id) {
    const cached = taskStore.fallbackFolders[props.task.id];
    if (cached) return cached;
  }
  // 2) 服务端直接返回的目录字段
  const metaFolder = normalizeFolder((props.task?.meta as any)?.debug_folder as string | undefined);
  if (metaFolder) return metaFolder;
  const byPath = normalizeFolder(props.task?.result_path ?? '');
  if (byPath) return byPath;
  // 3) 其它情况返回空（不再错误地退化为 taskId）
  return null;
});

const imgUrl = computed(() => {
  const f = folder.value;
  imgError.value = false;
  // 使用稳定地址，不追加查询参数
  return f ? getResultImageUrl(f) : '';
});

const isBatch = computed(() => (props.task?.mode ?? '').toLowerCase() === 'batch');
const batchImagesFromStore = computed(() => (props.task?.id ? batchStore.previews[props.task.id] ?? [] : []));
const batchPagesFromMeta = computed<string[]>(() => {
  const pages = (props.task?.meta as any)?.pages as string[] | undefined;
  return Array.isArray(pages) ? pages : [];
});
const batchImages = computed(() => {
  if (batchImagesFromStore.value.length) return batchImagesFromStore.value;
  const f = folder.value;
  if (isBatch.value && f && batchPagesFromMeta.value.length) {
    return batchPagesFromMeta.value.map(name => getResultFileUrl(f, name));
  }
  return [];
});
const batchZip = computed(() => (props.task?.id ? batchStore.zips[props.task.id] : undefined));

// lightbox
const viewerOpen = ref(false);
const viewerIndex = ref(0);
const zoom = ref(1);
const viewerRef = ref<HTMLElement | null>(null);
const imgEl = ref<HTMLImageElement | null>(null);
const naturalW = ref(0);
const naturalH = ref(0);
const viewerReady = ref(false); // 防止初始闪动：就绪后再显示图片
const imgWidthPx = ref(0);      // 直接以像素宽控制显示，避免 transform 与 CSS 叠加
const compareMode = ref(false);
const origImgEl = ref<HTMLImageElement | null>(null);
const transImgEl = ref<HTMLImageElement | null>(null);
const origNatW = ref(0), origNatH = ref(0);
const transNatW = ref(0), transNatH = ref(0);
const compareLeftPx = ref(0), compareRightPx = ref(0);
const allImages = computed(() => (isBatch.value ? batchImages.value : (imgUrl.value ? [imgUrl.value] : [])));
const currentImage = computed(() => (viewerIndex.value >= 0 && viewerIndex.value < allImages.value.length ? allImages.value[viewerIndex.value] : ''));
const currentOriginal = computed(() => {
  if (!folder.value) return '';
  if (isBatch.value) {
    const pages = batchPagesFromMeta.value;
    const idx = viewerIndex.value;
    const origName = pages[idx]?.replace(/^translated_/, 'original_');
    return origName ? getResultFileUrl(folder.value, origName) : '';
  }
  return getResultFileUrl(folder.value, 'original.png');
});
function toggleCompare() {
  compareMode.value = !compareMode.value;
  nextTick(() => adjustCompareSize());
}
function onCompareLoad() {
  if (origImgEl.value) { origNatW.value = origImgEl.value.naturalWidth || 0; origNatH.value = origImgEl.value.naturalHeight || 0; }
  if (transImgEl.value) { transNatW.value = transImgEl.value.naturalWidth || 0; transNatH.value = transImgEl.value.naturalHeight || 0; }
  adjustCompareSize();
}
function adjustCompareSize() {
  const WIN_W = window.innerWidth;
  const MAX_W = Math.floor(WIN_W * 0.95);
  const gap = 24; // px between columns and paddings
  const half = Math.max(1, Math.floor((MAX_W - gap) / 2));
  if (!origNatW.value || !transNatW.value) return;
  // 同一缩放倍数 S，保证两图等比缩放
  const sByWidth = Math.min(half / origNatW.value, half / transNatW.value, 4);
  const s = Math.max(0.25, sByWidth);
  compareLeftPx.value = Math.round(origNatW.value * s);
  compareRightPx.value = Math.round(transNatW.value * s);
}
const compareLeftStyle = computed(() => ({ width: compareLeftPx.value ? `${compareLeftPx.value}px` : 'auto', height: 'auto', maxHeight: 'none' }));
const compareRightStyle = computed(() => ({ width: compareRightPx.value ? `${compareRightPx.value}px` : 'auto', height: 'auto', maxHeight: 'none' }));

function openViewer(i: number) {
  if (!allImages.value.length) return;
  viewerIndex.value = Math.max(0, Math.min(i, allImages.value.length - 1));
  zoom.value = 1;
  viewerOpen.value = true;
  viewerReady.value = false;
}
function closeViewer() { viewerOpen.value = false; }
function nextImage() {
  if (!allImages.value.length) return;
  viewerIndex.value = (viewerIndex.value + 1) % allImages.value.length;
  zoom.value = 1;
  viewerReady.value = false;
}
function prevImage() {
  if (!allImages.value.length) return;
  viewerIndex.value = (viewerIndex.value - 1 + allImages.value.length) % allImages.value.length;
  zoom.value = 1;
  viewerReady.value = false;
}
function zoomIn() { zoom.value = Math.min(4, +(zoom.value + 0.25).toFixed(2)); }
function zoomOut() { zoom.value = Math.max(0.25, +(zoom.value - 0.25).toFixed(2)); }
function resetZoom() { zoom.value = 1; }
function fitOriginal() {
  const rect = viewerRef.value?.getBoundingClientRect();
  const MAX_W = Math.floor(rect?.width ?? window.innerWidth);
  imgWidthPx.value = Math.min(naturalW.value, MAX_W);
}
function fitWidth() {
  const MAX_W = Math.floor(viewerRef.value?.getBoundingClientRect().width || window.innerWidth);
  imgWidthPx.value = MAX_W;
}
function onKeydown(e: KeyboardEvent) {
  if (!viewerOpen.value) return;
  if (e.key === 'Escape') closeViewer();
  else if (e.key === 'ArrowRight') nextImage();
  else if (e.key === 'ArrowLeft') prevImage();
  else if (e.key === '+') zoomIn();
  else if (e.key === '-') zoomOut();
}
onMounted(() => window.addEventListener('keydown', onKeydown));
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown));

function onImageLoad() {
  const el = imgEl.value;
  if (el) {
    naturalW.value = el.naturalWidth || 0;
    naturalH.value = el.naturalHeight || 0;
  }
  adjustZoomToMinWidth();
  // 完整计算后再显示，避免“放大又缩小”的闪动
  viewerReady.value = true;
  // 确保长图从顶部开始显示
  try { viewerRef.value?.scrollTo({ top: 0, left: 0, behavior: 'auto' }); } catch {}
  // 控制台输出尺寸信息
  const rect = viewerRef.value?.getBoundingClientRect();
  const maxW = Math.floor((rect?.width ?? window.innerWidth));
  console.info(
    `[Lightbox] onload: natural=${naturalW.value}x${naturalH.value}, containerW=${maxW}, widthPx=${imgWidthPx.value}`
  );
}

function adjustZoomToMinWidth() {
  const container = viewerRef.value;
  const img = imgEl.value;
  if (!container || !img) return;
  // 规则（以“可视容器”作为基准，更贴近真实显示区域）：
  // 最小宽 = 容器宽的 30%，最小高 = 容器高的 50%；最大宽 = 容器宽；高度不限（容器滚动）
  const rect = viewerRef.value?.getBoundingClientRect();
  const WIN_W = window.innerWidth;
  const MAX_W = Math.floor(WIN_W * 0.95);               // 最大 = 窗口宽 95%
  const MIN_W = Math.floor(WIN_W * 0.30);               // 最小 = 窗口宽 30%
  const MIN_H = Math.floor(window.innerHeight * 0.5);   // 最小高 = 窗口高 50%
  const natW = img.naturalWidth || 0;
  const natH = img.naturalHeight || 0;
  if (natW <= 0 || natH <= 0) return;

  // A) 原图在 [最小, 最大] 范围并且宽小于窗口宽 → 按原分辨率显示
  if (natW >= MIN_W && natH >= MIN_H && natW < MAX_W) {
    imgWidthPx.value = natW;
    return;
  }
  // B) 原图宽超过容器宽 → 交由 CSS 限制贴合容器宽，不叠加 transform（避免双重缩放）
  if (natW >= MAX_W) { imgWidthPx.value = MAX_W; return; }
  // C) 原图小于最小可读尺寸 → 放大到不小于最小，并且不超过窗口宽
  const scaleToMin = Math.max(MIN_W / natW, MIN_H / natH);
  const capByMaxW = MAX_W / natW;
  const scale = Math.min(scaleToMin, capByMaxW);
  imgWidthPx.value = Math.round(natW * Math.max(0.25, Math.min(4, +scale.toFixed(2))));
}

const imgStyle = computed(() => {
  // 高不限（容器内滚动），只限制最大宽到视窗宽
  return {
    maxHeight: 'none',
    width: imgWidthPx.value ? `${imgWidthPx.value}px` : 'auto',
    height: 'auto',
    maxWidth: '100%', // 相对于容器宽
    opacity: viewerReady.value ? 1 : 0
  } as Record<string, string>;
});
const formattedMeta = computed(() => {
  try {
    return JSON.stringify(props.task?.meta ?? null, null, 2);
  } catch {
    return String(props.task?.meta ?? null);
  }
});

function refresh() {
  if (props.task?.id) {
    taskStore.loadTaskDetail(props.task.id);
  }
}

function downloadZip() {
  const z = batchZip.value;
  if (!z) return;
  const url = URL.createObjectURL(z);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'translated_images.zip';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// If folder is missing but task completed, as a last resort query /results/list
async function resolveByListing() {
  if (!props.task) return;
  if (folder.value) return; // 已解析到目录，无需兜底
  try {
    resolving.value = true;
    const dirs = await listResultDirectories();
    // choose the most recent by lexicographic order (timestamp prefix)
    const candidate = dirs.sort().reverse()[0];
    if (candidate && props.task.id) {
      taskStore.setFallbackFolder(props.task.id, candidate);
    }
  } finally {
    resolving.value = false;
  }
}

// attempt to resolve once when mounted and when task changes
watch(
  () => props.task?.id + ':' + (props.task?.status ?? ''),
  () => resolveByListing(),
  { immediate: true }
);
</script>

<style scoped>
.card {
  background: var(--bg-primary, #fff);
  color: var(--text-primary, #0f172a);
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 0.75rem;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.row { display: flex; justify-content: space-between; align-items: center; }
.actions { display: flex; gap: 0.5rem; }
.grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}
.mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
.error { color: #dc2626; }
.preview img {
  width: 100%;
  height: auto;
  border-radius: 0.5rem;
  border: 1px solid #e2e8f0;
}
.gallery {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.thumbs {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 0.5rem;
}
.thumb {
  height: 160px;
  background: var(--bg-hover);
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: zoom-in;
}
.thumb img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 0.35rem;
}
.preview.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
}
.actions { margin-top: 0.5rem; text-align: right; }
.actions a { color: var(--accent, #22d3ee); text-decoration: none; }
.debug { grid-column: 1 / -1; margin-top: 0.5rem; color: var(--text-muted); }
.debug summary { cursor: pointer; }
.debug .kv { font-size: 0.85rem; word-break: break-all; }
.debug code { background: var(--bg-hover); padding: 0.1rem 0.35rem; border-radius: 0.35rem; }
.debug .json {
  background: var(--bg-hover);
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  padding: 0.5rem;
  font-size: 0.85rem;
  overflow: auto;
  max-height: 30vh;
}
@media (max-width: 900px) {
  .grid { grid-template-columns: 1fr; }
}

/* Lightbox */
.lightbox {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3000;
}
.viewer {
  /* 居中显示，最大不超过视窗宽度 */
  width: 100vw;
  max-height: 90vh;
  overflow: auto;
  border-radius: 0.5rem;
  background: #111;
  border: 1px solid #333;
  box-shadow: 0 24px 60px rgba(0,0,0,0.5);
  display: flex;
  align-items: flex-start; /* 顶部对齐，避免长图初始显示在中间 */
  justify-content: center;
  margin: 0 auto;
}
.compare {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  width: 95vw;
  align-items: start;
}
.compare .col img {
  height: auto;
  max-height: none !important;
}
.viewer img {
  display: block;
  max-width: 100%;
  max-height: 90vh;
  transform-origin: center center;
}
.toolbar {
  position: fixed;
  top: 12px;
  left: 12px;
  right: 12px;
  display: flex;
  gap: 0.4rem;
  align-items: center;
  z-index: 3100;
}
.toolbar .spacer { flex: 1; }
.toolbar .counter {
  background: rgba(0,0,0,0.4);
  color: #fff;
  padding: 0.25rem 0.5rem;
  border-radius: 999px;
  font-size: 0.85rem;
}
.lightbox button.ghost {
  border: 1px solid #555;
  color: #fff;
}
.nav {
  position: fixed;
  top: 50%;
  transform: translateY(-50%);
  font-size: 2.5rem;
  color: #fff;
  background: rgba(0,0,0,0.3);
  width: 44px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  cursor: pointer;
  user-select: none;
  z-index: 3100;
}
.nav.left { left: 12px; }
.nav.right { right: 12px; }

@media (max-width: 640px) {
  .viewer {
    min-width: 90vw; /* 小屏幕下尽可能占满宽度 */
  }
}
</style>
