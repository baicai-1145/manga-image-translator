import { defineStore } from 'pinia';
import type { TranslatorKey } from '@/types';

export const detectionResolutions = [1024, 1536, 2048, 2560];
export const inpaintingSizes = [516, 1024, 2048, 2560];
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
  { value: 'paddle', label: 'Paddle' }
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
          unclip_ratio: state.customUnclipRatio
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
