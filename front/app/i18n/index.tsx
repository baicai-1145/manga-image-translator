import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type SupportedLanguage = "en" | "zh";

type TranslationDictionary = Record<string, string>;

export type TranslationParams = Record<string, string | number>;
export type TranslateFn = (key: string, params?: TranslationParams) => string;

type I18nContextValue = {
  language: SupportedLanguage;
  setLanguage: (language: SupportedLanguage) => void;
  t: TranslateFn;
  languages: { code: SupportedLanguage; label: string }[];
};

const LANGUAGE_STORAGE_KEY = "mit-ui-language";

const translationTable: Record<SupportedLanguage, TranslationDictionary> = {
  en: {
    "app.title": "Manga Translator",
    "header.language": "Language",
    "header.userId": "User ID",
    "header.userIdPlaceholder": "Enter or generate ID",
    "options.detectionResolution.label": "Detection Resolution",
    "options.detectionResolution.title": "Detection resolution",
    "options.textDetector.label": "Text Detector",
    "options.textDetector.title": "Text detector",
    "options.textDetector.option.default": "Default",
    "options.textDetector.option.ctd": "CTD",
    "options.textDetector.option.paddle": "Paddle",
    "options.renderDirection.label": "Render Direction",
    "options.renderDirection.title": "Render text orientation",
    "options.renderDirection.option.auto": "Auto",
    "options.renderDirection.option.horizontal": "Horizontal",
    "options.renderDirection.option.vertical": "Vertical",
    "options.translator.label": "Translator",
    "options.translator.title": "Translator",
    "options.targetLanguage.label": "Target Language",
    "options.targetLanguage.title": "Target language",
    "options.inpaintingSize.label": "Inpainting Size",
    "options.inpaintingSize.title": "Inpainting size",
    "options.unclipRatio.label": "Unclip Ratio",
    "options.unclipRatio.title": "Unclip ratio",
    "options.boxThreshold.label": "Box Threshold",
    "options.boxThreshold.title": "Box threshold",
    "options.maskDilationOffset.label": "Mask Dilation Offset",
    "options.maskDilationOffset.title": "Mask dilation offset",
    "options.inpainter.label": "Inpainter",
    "options.inpainter.title": "Inpainter",
    "options.inpainter.option.default": "Default",
    "options.inpainter.option.lama_large": "Lama Large",
    "options.inpainter.option.lama_mpe": "Lama MPE",
    "options.inpainter.option.sd": "SD",
    "options.inpainter.option.none": "None",
    "options.inpainter.option.original": "Original",
    "imageHandling.uploadHint":
      "Drop images here or click to select and upload images",
    "imageHandling.translateAll": "Translate All Images",
    "imageHandling.startOver": "Start Over",
    "imageHandling.removeFile": "Remove file",
    "queue.title": "Translation Queue ({{count}})",
    "queue.processingBadge": "Processing...",
    "queue.addDuringProcessing": "Add more images to queue while processing",
    "queue.addPrompt": "Add images to queue",
    "queue.dragDropHint": "Drag & drop or click to select",
    "queue.addedAt": "Added: {{time}}",
    "queue.size": "Size: {{size}} MB",
    "queue.status.queued": "Queued",
    "queue.status.processing": "Processing",
    "queue.status.finished": "Finished",
    "queue.status.error": "Error",
    "queue.remove": "Remove from queue",
    "result.empty.title": "No finished translations yet",
    "result.empty.subtitle": "Completed translations will appear here",
    "result.title": "Translation Results ({{count}})",
    "result.clearAll": "Clear All",
    "result.completedAt": "Completed: {{time}}",
    "result.translator": "Translator: {{translator}}",
    "result.navigationHint":
      "Use ← → arrow keys or click arrows to navigate",
    "result.viewer.previous": "Previous image",
    "result.viewer.next": "Next image",
    "result.viewer.close": "Close",
    "result.viewer.infoTitle": "Translated: {{name}}",
    "translator.none": "No Text",
    "status.upload": "Uploading",
    "status.uploadWithProgress": "Uploading ({{progress}})",
    "status.pendingWithQueue": "Queuing, your position is {{position}}",
    "status.pending": "Processing",
    "status.detection": "Detecting texts",
    "status.ocr": "Running OCR",
    "status.maskGeneration": "Generating text mask",
    "status.inpainting": "Running inpainting",
    "status.upscaling": "Running upscaling",
    "status.translating": "Translating",
    "status.rendering": "Rendering translated texts",
    "status.finished": "Downloading image",
    "status.error": "Something went wrong, please try again",
    "status.errorUpload": "Upload failed, please try again",
    "status.errorLang":
      "Your target language is not supported by the chosen translator",
    "status.errorTranslating":
      "No text returned from the text translation service",
    "status.errorTooLarge":
      "Image size too large (greater than 8000x8000 px)",
    "status.errorDisconnect": "Lost connection to server",
    "generic.error": "Error",
    "errorBoundary.title": "Oops!",
    "errorBoundary.message": "An unexpected error occurred.",
    "errorBoundary.404.title": "404",
    "errorBoundary.404.message": "The requested page could not be found.",
    "errorBoundary.generic": "Error",
    "tasks.title": "Task History",
    "tasks.currentUser": "Current user: {{userId}}",
    "tasks.anonymous": "anonymous",
    "tasks.refresh": "Refresh",
    "tasks.loading": "Loading tasks...",
    "tasks.empty": "No tasks have been submitted yet.",
    "tasks.status": "Status",
    "tasks.mode": "Mode",
    "tasks.queue": "Queue",
    "tasks.createdAt": "Created",
    "tasks.finishedAt": "Finished",
    "tasks.result": "Result",
    "tasks.error": "Error",
    "tasks.errorMessage": "Failed to load tasks: {{message}}",
    "tasks.viewResult": "View result",
  },
  zh: {
    "app.title": "漫画翻译器",
    "header.language": "语言",
    "header.userId": "用户标识",
    "header.userIdPlaceholder": "输入或生成标识",
    "options.detectionResolution.label": "检测分辨率",
    "options.detectionResolution.title": "文本检测使用的分辨率",
    "options.textDetector.label": "文本检测器",
    "options.textDetector.title": "选择文本检测模型",
    "options.textDetector.option.default": "默认",
    "options.textDetector.option.ctd": "CTD",
    "options.textDetector.option.paddle": "Paddle",
    "options.renderDirection.label": "排版方向",
    "options.renderDirection.title": "渲染文本时的方向",
    "options.renderDirection.option.auto": "自动",
    "options.renderDirection.option.horizontal": "横排",
    "options.renderDirection.option.vertical": "竖排",
    "options.translator.label": "翻译器",
    "options.translator.title": "选择翻译服务",
    "options.targetLanguage.label": "目标语言",
    "options.targetLanguage.title": "翻译后的目标语言",
    "options.inpaintingSize.label": "修复尺寸",
    "options.inpaintingSize.title": "文本修复处理尺寸",
    "options.unclipRatio.label": "扩展比例",
    "options.unclipRatio.title": "文本框扩展比例",
    "options.boxThreshold.label": "文本置信度阈值",
    "options.boxThreshold.title": "检测框置信度阈值",
    "options.maskDilationOffset.label": "掩膜膨胀偏移",
    "options.maskDilationOffset.title": "掩膜膨胀偏移像素",
    "options.inpainter.label": "修复模型",
    "options.inpainter.title": "选择图像修复模型",
    "options.inpainter.option.default": "默认",
    "options.inpainter.option.lama_large": "Lama Large",
    "options.inpainter.option.lama_mpe": "Lama MPE",
    "options.inpainter.option.sd": "SD",
    "options.inpainter.option.none": "无",
    "options.inpainter.option.original": "仅原图",
    "imageHandling.uploadHint":
      "拖拽图片到这里，或点击选择图片上传",
    "imageHandling.translateAll": "翻译全部图片",
    "imageHandling.startOver": "重新开始",
    "imageHandling.removeFile": "移除文件",
    "queue.title": "翻译队列（{{count}}）",
    "queue.processingBadge": "处理中…",
    "queue.addDuringProcessing": "处理时也可以继续添加图片到队列",
    "queue.addPrompt": "添加图片到队列",
    "queue.dragDropHint": "拖拽或点击选择文件",
    "queue.addedAt": "加入时间：{{time}}",
    "queue.size": "大小：{{size}} MB",
    "queue.status.queued": "排队中",
    "queue.status.processing": "处理中",
    "queue.status.finished": "已完成",
    "queue.status.error": "错误",
    "queue.remove": "从队列移除",
    "result.empty.title": "暂时没有完成的翻译",
    "result.empty.subtitle": "完成的图片会显示在这里",
    "result.title": "翻译结果（{{count}}）",
    "result.clearAll": "清空全部",
    "result.completedAt": "完成时间：{{time}}",
    "result.translator": "翻译器：{{translator}}",
    "result.navigationHint": "使用方向键或点击箭头切换图片",
    "result.viewer.previous": "上一张",
    "result.viewer.next": "下一张",
    "result.viewer.close": "关闭",
    "result.viewer.infoTitle": "翻译结果：{{name}}",
    "translator.none": "不渲染文本",
    "status.upload": "正在上传",
    "status.uploadWithProgress": "正在上传（{{progress}}）",
    "status.pendingWithQueue": "排队中，当前位置 {{position}}",
    "status.pending": "处理中",
    "status.detection": "正在检测文本",
    "status.ocr": "正在执行 OCR",
    "status.maskGeneration": "正在生成文本掩膜",
    "status.inpainting": "正在修复图像",
    "status.upscaling": "正在放大图像",
    "status.translating": "正在翻译",
    "status.rendering": "正在渲染翻译文本",
    "status.finished": "正在下载图片",
    "status.error": "发生错误，请重试",
    "status.errorUpload": "上传失败，请重试",
    "status.errorLang": "所选翻译器不支持该目标语言",
    "status.errorTranslating": "翻译服务没有返回文本",
    "status.errorTooLarge": "图片尺寸过大（大于 8000x8000 像素）",
    "status.errorDisconnect": "与服务器的连接已断开",
    "generic.error": "错误",
    "errorBoundary.title": "哎呀！",
    "errorBoundary.message": "发生了意外错误。",
    "errorBoundary.404.title": "404",
    "errorBoundary.404.message": "未找到请求的页面。",
    "errorBoundary.generic": "错误",
    "tasks.title": "任务记录",
    "tasks.currentUser": "当前用户：{{userId}}",
    "tasks.anonymous": "匿名",
    "tasks.refresh": "刷新",
    "tasks.loading": "正在加载任务...",
    "tasks.empty": "暂无任务记录。",
    "tasks.status": "状态",
    "tasks.mode": "模式",
    "tasks.queue": "队列位置",
    "tasks.createdAt": "创建时间",
    "tasks.finishedAt": "完成时间",
    "tasks.result": "结果",
    "tasks.error": "错误信息",
    "tasks.errorMessage": "获取任务失败：{{message}}",
    "tasks.viewResult": "查看结果",
  },
};

const LANGUAGES: { code: SupportedLanguage; label: string }[] = [
  { code: "en", label: "English" },
  { code: "zh", label: "简体中文" },
];

const FALLBACK_LANGUAGE: SupportedLanguage = "zh";

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

const replaceParams = (template: string, params?: TranslationParams) => {
  if (!params) {
    return template;
  }
  return template.replace(/\{\{(\w+)\}\}/g, (_, token: string) => {
    const value = params[token];
    return value === undefined ? "" : String(value);
  });
};

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [language, setLanguageState] =
    useState<SupportedLanguage>(FALLBACK_LANGUAGE);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const stored = window.localStorage.getItem(
      LANGUAGE_STORAGE_KEY
    ) as SupportedLanguage | null;
    if (stored && translationTable[stored]) {
      setLanguageState(stored);
      return;
    }
    const browserLang = window.navigator.language.toLowerCase();
    if (browserLang.startsWith("zh")) {
      setLanguageState("zh");
    }
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = language;
    }
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    }
  }, [language]);

  const t = useCallback(
    (key: string, params?: TranslationParams) => {
      const dict = translationTable[language] || translationTable[FALLBACK_LANGUAGE];
      const fallbackDict = translationTable[FALLBACK_LANGUAGE];
      const template = dict[key] ?? fallbackDict[key] ?? key;
      return replaceParams(template, params);
    },
    [language]
  );

  const setLanguage = useCallback((lang: SupportedLanguage) => {
    setLanguageState(lang);
  }, []);

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      setLanguage,
      t,
      languages: LANGUAGES,
    }),
    [language, setLanguage, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = (): I18nContextValue => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
};
