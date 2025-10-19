import type { StatusKey } from "@/types";
import type { TranslateFn } from "@/i18n";

export const fetchStatusText = (
  status: StatusKey | null,
  progress: string | null,
  queuePos: string | null,
  error: string | null,
  t: TranslateFn
) => {
  switch (status) {
    case "upload":
      return progress
        ? t("status.uploadWithProgress", { progress })
        : t("status.upload");
    case "pending":
      return queuePos
        ? t("status.pendingWithQueue", { position: queuePos })
        : t("status.pending");
    case "detection":
      return t("status.detection");
    case "ocr":
      return t("status.ocr");
    case "mask-generation":
      return t("status.maskGeneration");
    case "inpainting":
      return t("status.inpainting");
    case "upscaling":
      return t("status.upscaling");
    case "translating":
      return t("status.translating");
    case "rendering":
      return t("status.rendering");
    case "finished":
      return t("status.finished");
    case "error":
      return error || t("status.error");
    case "error-upload":
      return t("status.errorUpload");
    case "error-lang":
      return t("status.errorLang");
    case "error-translating":
      return t("status.errorTranslating");
    case "error-too-large":
      return t("status.errorTooLarge");
    case "error-disconnect":
      return t("status.errorDisconnect");
    default:
      return "";
  }
};
