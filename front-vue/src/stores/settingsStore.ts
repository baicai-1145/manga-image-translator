import { defineStore } from 'pinia';
import type { TranslatorKey } from '@/types';

export const detectionResolutions = [1024, 1536, 2048, 2560];
export const inpaintingSizes = [516, 1024, 2048, 2560];

export const rapidocrVersions = [
  { value: 'PP-OCRv5', label: 'PP-OCRv5' },
  { value: 'PP-OCRv4', label: 'PP-OCRv4' }
];

// 文本识别模型语言/版本/模型类型组合，严格依据 RapidOCR 官方模型列表
export const rapidocrLangOptionsV5 = [
  // 文本识别 v5
  { value: 'ch', label: '中英日混合 (ch, v5)', modelTypes: ['mobile', 'server'] as const },
  { value: 'en', label: '英文 (en, v5)', modelTypes: ['mobile'] as const },
  { value: 'th', label: '泰文+英文 (th, v5)', modelTypes: ['mobile'] as const },
  { value: 'el', label: '希腊文+英文 (el, v5)', modelTypes: ['mobile'] as const },
  { value: 'latin', label: '拉丁语种混合 (latin, v5)', modelTypes: ['mobile'] as const },
  { value: 'eslav', label: '俄/白俄/乌克兰 (eslav, v5)', modelTypes: ['mobile', 'server'] as const },
  { value: 'korean', label: '韩文 (korean, v5)', modelTypes: ['mobile'] as const }
];

export const rapidocrLangOptionsV4 = [
  { value: 'korean', label: '韩文 (korean, v4)', modelTypes: ['mobile'] as const },
  { value: 'ch_doc', label: '中文文档 (ch_doc, v4)', modelTypes: ['server'] as const },
  { value: 'ch', label: '中文 (ch, v4)', modelTypes: ['mobile', 'server'] as const },
  { value: 'chinese_cht', label: '中文繁体 (chinese_cht, v4)', modelTypes: ['mobile', 'server'] as const },
  { value: 'en', label: '英文 (en, v4)', modelTypes: ['mobile'] as const },
  { value: 'ar', label: '阿拉伯文 (ar, v4)', modelTypes: ['mobile'] as const },
  { value: 'cyrillic', label: '塞尔维亚文 (cyrillic, v4)', modelTypes: ['mobile'] as const },
  { value: 'devanagari', label: '梵文 (devanagari, v4)', modelTypes: ['mobile'] as const },
  { value: 'japan', label: '日文 (japan, v4)', modelTypes: ['mobile'] as const },
  { value: 'ka', label: '卡纳达语 (ka, v4)', modelTypes: ['mobile'] as const },
  { value: 'latin', label: '拉丁文 (latin, v4)', modelTypes: ['mobile'] as const },
  { value: 'ta', label: '泰米尔文 (ta, v4)', modelTypes: ['mobile'] as const },
  { value: 'te', label: '泰卢固文 (te, v4)', modelTypes: ['mobile'] as const }
];

export function getRapidocrLangOptions(version: string | null | undefined) {
  return (version ?? 'PP-OCRv5') === 'PP-OCRv4' ? rapidocrLangOptionsV4 : rapidocrLangOptionsV5;
}

export function getRapidocrModelOptions(version: string | null | undefined, lang: string | null | undefined) {
  const base = (version ?? 'PP-OCRv5') === 'PP-OCRv4' ? rapidocrLangOptionsV4 : rapidocrLangOptionsV5;
  const entry = base.find(o => o.value === lang);
  const types = entry?.modelTypes ?? [];
  return types.map(t => ({ value: t, label: t === 'mobile' ? 'Mobile' : 'Server' }));
}

// 文本检测模型语言/版本/模型类型组合（RapidOCR）
export const rapidocrDetLangOptionsV5 = [
  // v5 检测：仅 ch
  { value: 'ch', label: '中文 / 中英日 (ch, v5)', modelTypes: ['mobile', 'server'] as const }
];

export const rapidocrDetLangOptionsV4 = [
  // v4 检测：ch / en / multi
  { value: 'ch', label: '中文 / 中英 (ch, v4)', modelTypes: ['mobile', 'server'] as const },
  { value: 'en', label: '英文+拉丁 (en, v4)', modelTypes: ['mobile', 'server'] as const },
  { value: 'multi', label: '多语种 (multi, v4)', modelTypes: ['mobile'] as const }
];

export function getRapidocrDetLangOptions(version: string | null | undefined) {
  return (version ?? 'PP-OCRv5') === 'PP-OCRv4' ? rapidocrDetLangOptionsV4 : rapidocrDetLangOptionsV5;
}

export function getRapidocrDetModelOptions(version: string | null | undefined, lang: string | null | undefined) {
  const base = (version ?? 'PP-OCRv5') === 'PP-OCRv4' ? rapidocrDetLangOptionsV4 : rapidocrDetLangOptionsV5;
  const entry = base.find(o => o.value === lang);
  const types = entry?.modelTypes ?? [];
  return types.map(t => ({ value: t, label: t === 'mobile' ? 'Mobile' : 'Server' }));
}
export const languageOptions = [
  { value: 'CHS', label: '简体中文' },
  { value: 'CHT', label: '繁體中文' },
  { value: 'ENG', label: 'English' },
  { value: 'JPN', label: '日本語' },
  { value: 'KOR', label: '한국어' }
];
export const textDetectorOptions = [
  { value: 'default', label: 'Default' },
  { value: 'ctd', label: 'CTD' },
  { value: 'paddle', label: 'Paddle' },
  { value: 'rapidocr', label: 'RapidOCR' }
];
export const ocrOptions = [
  { value: '32px', label: 'OCR 32px' },
  { value: '48px', label: 'OCR 48px' },
  { value: '48px_ctc', label: 'OCR 48px CTC' },
  { value: 'mocr', label: 'Manga OCR' },
  { value: 'rapidocr', label: 'RapidOCR' }
];
export const inpainterOptions = [
  { value: 'default', label: 'Default' },
  { value: 'lama_large', label: 'Lama Large' },
  { value: 'lama_mpe', label: 'Lama MPE' },
  { value: 'sd', label: 'SD' },
  { value: 'none', label: 'None' },
  { value: 'original', label: 'Original' }
];
export const validTranslators: TranslatorKey[] = [
  'youdao','baidu','deepl','papago','caiyun','sakura','offline',
  'openai','deepseek','groq','gemini','custom_openai','nllb','nllb_big',
  'sugoi','jparacrawl','jparacrawl_big','m2m100','m2m100_big','mbart50','qwen2','qwen2_big','none'
];

interface SettingsState {
  detectionResolution: string;
  textDetector: string;
  ocrEngine: string;
  detRapidocrModelType: string | null;
  detRapidocrLangType: string | null;
  detRapidocrOcrVersion: string | null;
  rapidocrModelType: string | null;
  rapidocrLangType: string | null;
  rapidocrOcrVersion: string | null;
  renderTextDirection: string;
  translator: TranslatorKey;
  targetLanguage: string;
  inpaintingSize: string;
  customUnclipRatio: number;
  customBoxThreshold: number;
  maskDilationOffset: number;
  inpainter: string;
}

export const useSettingsStore = defineStore('settings', {
  state: (): SettingsState => ({
    // Align defaults with original front (React) App.tsx
    detectionResolution: '1536',
    textDetector: 'default',
    detRapidocrModelType: 'mobile',
    detRapidocrLangType: 'ch',
    detRapidocrOcrVersion: 'PP-OCRv5',
    // 默认回到 OCR 48px CTC，与原 front 体验一致
    ocrEngine: '48px_ctc',
    rapidocrModelType: 'mobile',
    rapidocrLangType: 'ch',       // 由用户按源语言调整，如日文可切换 'japan'
    rapidocrOcrVersion: 'PP-OCRv5',
    renderTextDirection: 'auto',
    translator: 'openai',
    targetLanguage: 'CHS',
    inpaintingSize: '2048',
    customUnclipRatio: 2.3,
    customBoxThreshold: 0.7,
    maskDilationOffset: 30,
    inpainter: 'default'
  }),
  getters: {
    buildConfig(state) {
      return {
        detector: {
          detector: state.textDetector,
          detection_size: Number(state.detectionResolution),
          box_threshold: state.customBoxThreshold,
          unclip_ratio: state.customUnclipRatio,
          // RapidOCR 文本检测模型选择，仅在 detector=rapidocr 时生效
          rapidocr_model_type: state.textDetector === 'rapidocr' ? state.detRapidocrModelType : null,
          rapidocr_lang_type: state.textDetector === 'rapidocr' ? state.detRapidocrLangType : null,
          rapidocr_ocr_version: state.textDetector === 'rapidocr' ? state.detRapidocrOcrVersion : null
        },
        ocr: {
          ocr: state.ocrEngine,
          // 仅当使用 RapidOCR 时提供这些字段，其它 OCR 后端会忽略
          rapidocr_model_type: state.ocrEngine === 'rapidocr' ? state.rapidocrModelType : null,
          rapidocr_lang_type: state.ocrEngine === 'rapidocr' ? state.rapidocrLangType : null,
          rapidocr_ocr_version: state.ocrEngine === 'rapidocr' ? state.rapidocrOcrVersion : null
        },
        render: {
          direction: state.renderTextDirection
        },
        translator: {
          translator: state.translator,
          target_lang: state.targetLanguage
        },
        inpainter: {
          inpainter: state.inpainter,
          inpainting_size: Number(state.inpaintingSize)
        },
        mask_dilation_offset: state.maskDilationOffset
      };
    }
  }
});
