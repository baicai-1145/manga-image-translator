import type { TranslationSettings, FinishedImage } from "@/types";

const SETTINGS_KEY = "manga-translator-settings";
const FINISHED_IMAGES_KEY = "manga-translator-finished-images";

export const loadSettings = (): Partial<TranslationSettings> => {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.warn("Failed to load settings from localStorage:", error);
    return {};
  }
};

export const saveSettings = (settings: TranslationSettings): void => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.warn("Failed to save settings to localStorage:", error);
  }
};

const sanitizeFinishedImage = (image: unknown): FinishedImage | null => {
  if (!image || typeof image !== "object") {
    return null;
  }
  const record = image as Record<string, unknown>;
  const id = typeof record.id === "string" ? record.id : null;
  const originalName =
    typeof record.originalName === "string" ? record.originalName : null;
  const settings =
    record.settings && typeof record.settings === "object"
      ? (record.settings as TranslationSettings)
      : null;
  if (!id || !originalName || !settings) {
    return null;
  }
  const sanitizedResult =
    typeof Blob !== "undefined" && record.result instanceof Blob
      ? (record.result as Blob)
      : null;
  const finishedAtValue = record.finishedAt;
  const finishedAt =
    finishedAtValue instanceof Date
      ? finishedAtValue
      : new Date(
          typeof finishedAtValue === "string" || typeof finishedAtValue === "number"
            ? finishedAtValue
            : Date.now()
        );
  return {
    id,
    originalName,
    result: sanitizedResult,
    finishedAt,
    settings,
  };
};

export const loadFinishedImages = (): FinishedImage[] => {
  try {
    const stored = localStorage.getItem(FINISHED_IMAGES_KEY);
    if (!stored) {
      return [];
    }
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .map(sanitizeFinishedImage)
      .filter((item): item is FinishedImage => Boolean(item));
  } catch (error) {
    console.warn("Failed to load finished images from localStorage:", error);
    return [];
  }
};

export const saveFinishedImages = (images: FinishedImage[]): void => {
  try {
    // Keep only the last 50 images to prevent localStorage from getting too large
    const limitedImages = images.slice(-50);
    localStorage.setItem(FINISHED_IMAGES_KEY, JSON.stringify(limitedImages));
  } catch (error) {
    console.warn("Failed to save finished images to localStorage:", error);
  }
};

export const addFinishedImage = (image: FinishedImage): void => {
  try {
    const existing = loadFinishedImages();
    const updated = [image, ...existing]; // Add new image at the top
    saveFinishedImages(updated);
  } catch (error) {
    console.warn("Failed to add finished image to localStorage:", error);
  }
};
