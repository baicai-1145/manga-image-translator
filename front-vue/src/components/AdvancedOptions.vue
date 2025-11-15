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
    <!-- RapidOCR 文本检测模型选择，仅当 Detector=RapidOCR 时显示 -->
    <template v-if="s.textDetector === 'rapidocr'">
      <label>
        检测版本（RapidOCR Det）
        <select v-model="s.detRapidocrOcrVersion">
          <option v-for="opt in rapidocrVersions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
      </label>
      <label>
        检测语种（RapidOCR Det）
        <select v-model="s.detRapidocrLangType">
          <option v-for="opt in detLangOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
      </label>
      <label>
        检测模型类型（RapidOCR Det）
        <select v-model="s.detRapidocrModelType">
          <option v-for="opt in detModelOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
      </label>
    </template>
    <label>
      OCR 引擎
      <select v-model="s.ocrEngine">
        <option v-for="opt in ocrOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
      </select>
    </label>
    <!-- RapidOCR 文本识别模型选择，仅当 OCR 引擎为 RapidOCR 时显示。
         组合严格遵循 RapidOCR 模型列表，避免 lang_type / model_type / ocr_version 冲突。 -->
    <template v-if="s.ocrEngine === 'rapidocr'">
      <label>
        RapidOCR 版本
        <select v-model="s.rapidocrOcrVersion">
          <option v-for="opt in rapidocrVersions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
      </label>
      <label>
        原图语种（RapidOCR）
        <select v-model="s.rapidocrLangType">
          <option v-for="opt in rapidLangOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
      </label>
      <label>
        RapidOCR 模型类型
        <select v-model="s.rapidocrModelType">
          <option v-for="opt in rapidModelOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
      </label>
    </template>
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
  import { computed, watch } from 'vue';
  import {
    useSettingsStore,
    detectionResolutions,
    inpaintingSizes,
    languageOptions,
    textDetectorOptions,
    inpainterOptions,
    validTranslators,
    ocrOptions,
    rapidocrVersions,
    getRapidocrLangOptions,
    getRapidocrModelOptions,
    getRapidocrDetLangOptions,
    getRapidocrDetModelOptions
  } from '@/stores/settingsStore';

  const s = useSettingsStore();

  const rapidVersion = computed(() => s.rapidocrOcrVersion ?? 'PP-OCRv5');
  const rapidLangOptions = computed(() => getRapidocrLangOptions(rapidVersion.value));
  const rapidModelOptions = computed(() => getRapidocrModelOptions(rapidVersion.value, s.rapidocrLangType));

  const detVersion = computed(() => s.detRapidocrOcrVersion ?? 'PP-OCRv5');
  const detLangOptions = computed(() => getRapidocrDetLangOptions(detVersion.value));
  const detModelOptions = computed(() => getRapidocrDetModelOptions(detVersion.value, s.detRapidocrLangType));

  function ensureRapidocrConsistency() {
    // 识别模型参数联动
    const vRec = rapidVersion.value;
    const langsRec = getRapidocrLangOptions(vRec);
    if (!langsRec.some(o => o.value === s.rapidocrLangType)) {
      s.rapidocrLangType = langsRec[0]?.value ?? null;
    }
    const modelsRec = getRapidocrModelOptions(vRec, s.rapidocrLangType);
    if (!modelsRec.some(o => o.value === s.rapidocrModelType)) {
      s.rapidocrModelType = modelsRec[0]?.value ?? null;
    }
    // 检测模型参数联动
    const vDet = detVersion.value;
    const langsDet = getRapidocrDetLangOptions(vDet);
    if (!langsDet.some(o => o.value === s.detRapidocrLangType)) {
      s.detRapidocrLangType = langsDet[0]?.value ?? null;
    }
    const modelsDet = getRapidocrDetModelOptions(vDet, s.detRapidocrLangType);
    if (!modelsDet.some(o => o.value === s.detRapidocrModelType)) {
      s.detRapidocrModelType = modelsDet[0]?.value ?? null;
    }
  }

  // 初始化与联动校验，确保不会选到无效组合
  ensureRapidocrConsistency();
  watch(() => [s.rapidocrOcrVersion, s.rapidocrLangType, s.detRapidocrOcrVersion, s.detRapidocrLangType], () => ensureRapidocrConsistency());

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
