import React from "react";
import type { TranslatorKey } from "@/types";
import { validTranslators } from "@/types";
import { getTranslatorName } from "@/utils/getTranslatorName";
import {
  languageOptions,
  detectionResolutions,
  textDetectorOptions,
  inpaintingSizes,
  inpainterOptions,
} from "@/config";
import { LabeledInput } from "@/components/LabeledInput";
import { LabeledSelect } from "@/components/LabeledSelect";
import { useI18n } from "@/i18n";

type Props = {
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

  setDetectionResolution: (val: string) => void;
  setTextDetector: (val: string) => void;
  setRenderTextDirection: (val: string) => void;
  setTranslator: (val: TranslatorKey) => void;
  setTargetLanguage: (val: string) => void;
  setInpaintingSize: (val: string) => void;
  setCustomUnclipRatio: (val: number) => void;
  setCustomBoxThreshold: (val: number) => void;
  setMaskDilationOffset: (val: number) => void;
  setInpainter: (val: string) => void;
};

export const OptionsPanel: React.FC<Props> = ({
  detectionResolution,
  textDetector,
  renderTextDirection,
  translator,
  targetLanguage,
  inpaintingSize,
  customUnclipRatio,
  customBoxThreshold,
  maskDilationOffset,
  inpainter,
  setDetectionResolution,
  setTextDetector,
  setRenderTextDirection,
  setTranslator,
  setTargetLanguage,
  setInpaintingSize,
  setCustomUnclipRatio,
  setCustomBoxThreshold,
  setMaskDilationOffset,
  setInpainter,
}) => {
  const { t } = useI18n();

  return (
    <>
      {/* 1段目のセクション */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {/* Detection Resolution */}
        <LabeledSelect
          id="detectionResolution"
          label={t("options.detectionResolution.label")}
          icon="carbon:fit-to-screen"
          title={t("options.detectionResolution.title")}
          value={detectionResolution}
          onChange={setDetectionResolution}
          options={detectionResolutions.map((res) => ({
            label: `${res}px`,
            value: String(res),
          }))}
        />

        {/* Text Detector */}
        <LabeledSelect
          id="textDetector"
          label={t("options.textDetector.label")}
          icon="carbon:search-locate"
          title={t("options.textDetector.title")}
          value={textDetector}
          onChange={setTextDetector}
          options={textDetectorOptions.map((opt) => ({
            value: opt.value,
            label: t(`options.textDetector.option.${opt.value}`),
          }))}
        />

        {/* Render text direction */}
        <LabeledSelect
          id="renderTextDirection"
          label={t("options.renderDirection.label")}
          icon="carbon:text-align-left"
          title={t("options.renderDirection.title")}
          value={renderTextDirection}
          onChange={setRenderTextDirection}
          options={[
            { value: "auto", label: t("options.renderDirection.option.auto") },
            {
              value: "horizontal",
              label: t("options.renderDirection.option.horizontal"),
            },
            {
              value: "vertical",
              label: t("options.renderDirection.option.vertical"),
            },
          ]}
        />

        {/* Translator */}
        <LabeledSelect
          id="translator"
          label={t("options.translator.label")}
          icon="carbon:operations-record"
          title={t("options.translator.title")}
          value={translator}
          onChange={(val) => setTranslator(val as TranslatorKey)}
          options={validTranslators.map((key) => ({
            value: key,
            label: key === "none" ? t("translator.none") : getTranslatorName(key),
          }))}
        />

        {/* Target Language */}
        <LabeledSelect
          id="targetLanguage"
          label={t("options.targetLanguage.label")}
          icon="carbon:language"
          title={t("options.targetLanguage.title")}
          value={targetLanguage}
          onChange={setTargetLanguage}
          options={languageOptions}
        />
      </div>

      {/* 2段目のセクション */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mt-4">
        {/* Inpainting Size */}
        <LabeledSelect
          id="inpaintingSize"
          label={t("options.inpaintingSize.label")}
          icon="carbon:paint-brush"
          title={t("options.inpaintingSize.title")}
          value={inpaintingSize}
          onChange={setInpaintingSize}
          options={inpaintingSizes.map((size) => ({
            label: `${size}px`,
            value: String(size),
          }))}
        />

        {/* Unclip Ratio */}
        <LabeledInput
          id="unclipRatio"
          label={t("options.unclipRatio.label")}
          icon="weui:max-window-filled"
          title={t("options.unclipRatio.title")}
          step={0.01}
          value={customUnclipRatio}
          onChange={setCustomUnclipRatio}
        />

        {/* Box Threshold */}
        <LabeledInput
          id="boxThreshold"
          label={t("options.boxThreshold.label")}
          icon="weui:photo-wall-outlined"
          title={t("options.boxThreshold.title")}
          step={0.01}
          value={customBoxThreshold}
          onChange={setCustomBoxThreshold}
        />

        {/* Mask Dilation Offset */}
        <LabeledInput
          id="maskDilationOffset"
          label={t("options.maskDilationOffset.label")}
          icon="material-symbols:adjust-outline"
          title={t("options.maskDilationOffset.title")}
          step={1}
          value={maskDilationOffset}
          onChange={setMaskDilationOffset}
        />

        {/* Inpainter */}
        <LabeledSelect
          id="inpainter"
          label={t("options.inpainter.label")}
          icon="carbon:paint-brush"
          title={t("options.inpainter.title")}
          value={inpainter}
          onChange={setInpainter}
          options={inpainterOptions.map((opt) => ({
            value: opt.value,
            label: t(`options.inpainter.option.${opt.value}`),
          }))}
        />
      </div>
    </>
  );
};
