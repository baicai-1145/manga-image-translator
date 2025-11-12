<template>
  <div class="grid">
    <label>
      检测分辨率
      <select v-model="s.detectionResolution">
        <option v-for="r in detectionResolutions" :key="r" :value="String(r)">{{ r }}px</option>
      </select>
    </label>
    <label>
      文本检测
      <select v-model="s.textDetector">
        <option v-for="opt in textDetectorOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
      </select>
    </label>
    <label>
      文本方向
      <select v-model="s.renderTextDirection">
        <option value="auto">自动</option>
        <option value="horizontal">水平</option>
        <option value="vertical">垂直</option>
      </select>
    </label>
    <label>
      翻译引擎
      <select v-model="s.translator">
        <option v-for="t in validTranslators" :key="t" :value="t">{{ formatTranslator(t) }}</option>
      </select>
    </label>
    <label>
      目标语言
      <select v-model="s.targetLanguage">
        <option v-for="opt in languageOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
      </select>
    </label>

    <label>
      修复尺寸
      <select v-model="s.inpaintingSize">
        <option v-for="r in inpaintingSizes" :key="r" :value="String(r)">{{ r }}px</option>
      </select>
    </label>
    <label>
      Unclip Ratio
      <input type="number" step="0.01" v-model.number="s.customUnclipRatio" />
    </label>
    <label>
      Box Threshold
      <input type="number" step="0.01" v-model.number="s.customBoxThreshold" />
    </label>
    <label>
      Mask Dilation Offset
      <input type="number" step="1" v-model.number="s.maskDilationOffset" />
    </label>
    <label>
      修复模型
      <select v-model="s.inpainter">
        <option v-for="opt in inpainterOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
      </select>
    </label>
  </div>
</template>

<script setup lang="ts">
import { useSettingsStore, detectionResolutions, inpaintingSizes, languageOptions, textDetectorOptions, inpainterOptions, validTranslators } from '@/stores/settingsStore';

const s = useSettingsStore();
function formatTranslator(key: string) {
  if (key === 'none') return 'No Text';
  return key[0].toUpperCase() + key.slice(1);
}
</script>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem 0.9rem;
  margin: 0.5rem 0;
}
label {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  font-size: 0.85rem;
  color: var(--text-primary);
  font-weight: 600;
}
select,
input {
  height: 36px;
  font-size: 0.9rem;
  padding: 0.35rem 0.65rem;
  border-radius: 0.65rem;
  border: 1px solid var(--border-color);
  background: var(--bg-hover);
  color: var(--text-primary);
}
@media (max-width: 900px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>
