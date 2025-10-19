import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  type StatusKey,
  processingStatuses,
  type TranslatorKey,
  type FileStatus,
  type ChunkProcessingResult,
  type QueuedImage,
  type TranslationSettings,
  type FinishedImage,
  type TaskRecord,
} from "@/types";
import { imageMimeTypes } from "@/config";
import { OptionsPanel } from "@/components/OptionsPanel";
import { ImageHandlingArea } from "@/components/ImageHandlingArea";
import { ImageQueue } from "@/components/ImageQueue";
import { ResultGallery } from "@/components/ResultGallery";
import { Header } from "@/components/Header";
import { TaskHistory } from "@/components/TaskHistory";
import {
  loadSettings,
  saveSettings,
  loadFinishedImages,
  addFinishedImage,
} from "@/utils/localStorage";
import { useI18n } from "@/i18n";

const USER_ID_STORAGE_KEY = "mit-user-id";

const generateUserId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `user-${crypto.randomUUID().slice(0, 8)}`;
  }
  return `user-${Math.random().toString(36).slice(2, 10)}`;
};

export const App: React.FC = () => {
  const { t } = useI18n();
  // State Hooks
  const [fileStatuses, setFileStatuses] = useState<Map<string, FileStatus>>(
    new Map()
  );
  const [shouldTranslate, setShouldTranslate] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  const [userId, setUserId] = useState<string>(() => {
    if (typeof window === "undefined") {
      return "";
    }
    const stored = window.localStorage.getItem(USER_ID_STORAGE_KEY);
    if (stored && stored.trim().length > 0) {
      return stored;
    }
    const generated = generateUserId();
    window.localStorage.setItem(USER_ID_STORAGE_KEY, generated);
    return generated;
  });
  const [taskHistory, setTaskHistory] = useState<TaskRecord[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [taskError, setTaskError] = useState<string | null>(null);

  // New state for improved UI features
  const [queuedImages, setQueuedImages] = useState<QueuedImage[]>([]);
  const [finishedImages, setFinishedImages] = useState<FinishedImage[]>([]);
  const [currentProcessingImage, setCurrentProcessingImage] = useState<QueuedImage | null>(null);

  // Translation Options State Hooks
  const [detectionResolution, setDetectionResolution] = useState("1536");
  const [textDetector, setTextDetector] = useState("default");
  const [renderTextDirection, setRenderTextDirection] = useState("auto");
  const [translator, setTranslator] = useState<TranslatorKey>("openai");
  const [targetLanguage, setTargetLanguage] = useState("CHS");

  const [inpaintingSize, setInpaintingSize] = useState("2048");
  const [customUnclipRatio, setCustomUnclipRatio] = useState<number>(2.3);
  const [customBoxThreshold, setCustomBoxThreshold] = useState<number>(0.7);
  const [maskDilationOffset, setMaskDilationOffset] = useState<number>(30);
  const [inpainter, setInpainter] = useState("default");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (!userId) {
      const generated = generateUserId();
      setUserId(generated);
      window.localStorage.setItem(USER_ID_STORAGE_KEY, generated);
    }
  }, [userId]);

  const handleUserIdChange = useCallback((value: string) => {
    setUserId(value);
    if (typeof window !== "undefined") {
      if (value && value.trim().length > 0) {
        window.localStorage.setItem(USER_ID_STORAGE_KEY, value);
      } else {
        window.localStorage.removeItem(USER_ID_STORAGE_KEY);
      }
    }
  }, []);

  const fetchTaskHistory = useCallback(async () => {
    if (typeof window === "undefined") {
      return;
    }
    if (!userId) {
      setTaskHistory([]);
      return;
    }
    setTasksLoading(true);
    try {
      const response = await fetch(`/api/tasks?limit=100`, {
        headers: {
          "X-User-Id": userId,
        },
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const payload: TaskRecord[] = await response.json();
      setTaskHistory(payload);
      setTaskError(null);
    } catch (error) {
      setTaskError(error instanceof Error ? error.message : String(error));
    } finally {
      setTasksLoading(false);
    }
  }, [userId]);

  // Computed State (useMemo)
  const isProcessing = useMemo(() => {
    // If there are no files or no statuses, we're not processing
    if (files.length === 0 || fileStatuses.size === 0) return false;

    // Check if any file has a processing status
    return Array.from(fileStatuses.values()).some((fileStatus) => {
      if (!fileStatus || fileStatus.status === null) return false;
      return processingStatuses.includes(fileStatus.status);
    });
  }, [files, fileStatuses]);

  const isProcessingAllFinished = useMemo(() => {
    // If there are no files or no statuses, we're not finished
    if (files.length === 0 || fileStatuses.size === 0) return false;

    // Check if all files are finished
    return Array.from(fileStatuses.values()).every((status) => {
      if (!status || status.status === null) return false;
      return status.status === "finished";
    });
  }, [files, fileStatuses]);

  // Effects
  useEffect(() => {
    fetchTaskHistory();
  }, [fetchTaskHistory]);

  /** Load saved settings and finished images from localStorage */
  useEffect(() => {
    const savedSettings = loadSettings();
    if (savedSettings.detectionResolution) setDetectionResolution(savedSettings.detectionResolution);
    if (savedSettings.textDetector) setTextDetector(savedSettings.textDetector);
    if (savedSettings.renderTextDirection) setRenderTextDirection(savedSettings.renderTextDirection);
    if (savedSettings.translator) setTranslator(savedSettings.translator);
    if (savedSettings.targetLanguage) setTargetLanguage(savedSettings.targetLanguage);
    if (savedSettings.inpaintingSize) setInpaintingSize(savedSettings.inpaintingSize);
    if (savedSettings.customUnclipRatio) setCustomUnclipRatio(savedSettings.customUnclipRatio);
    if (savedSettings.customBoxThreshold) setCustomBoxThreshold(savedSettings.customBoxThreshold);
    if (savedSettings.maskDilationOffset) setMaskDilationOffset(savedSettings.maskDilationOffset);
    if (savedSettings.inpainter) setInpainter(savedSettings.inpainter);

    const savedFinishedImages = loadFinishedImages();
    setFinishedImages(savedFinishedImages);
  }, []);

  /** Save settings to localStorage whenever they change */
  useEffect(() => {
    const settings: TranslationSettings = {
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
    };
    saveSettings(settings);
  }, [
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
  ]);

  /** クリップボード ペースト対応 */
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items || [];
      for (const item of items) {
        if (item.kind === "file") {
          const pastedFile = item.getAsFile();
          if (pastedFile && imageMimeTypes.includes(pastedFile.type)) {
            setFiles((prev) => [...prev, pastedFile]);
            break;
          }
        }
      }
    };

    window.addEventListener("paste", handlePaste as EventListener);
    return () =>
      window.removeEventListener("paste", handlePaste as EventListener);
  }, []);

  useEffect(() => {
    if (shouldTranslate) {
      processTranslation();
      setShouldTranslate(false);
    }
  }, [fileStatuses]);

  // Event Handlers
  /** フォーム再セット */
  const clearForm = () => {
    setFiles([]);
    setFileStatuses(() => new Map());
  };

  /** ドラッグ＆ドロップ対応 */
  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer?.files || []);
    const validFiles = droppedFiles.filter((file) =>
      imageMimeTypes.includes(file.type)
    );
    setFiles((prev) => [...prev, ...validFiles]);
  };

  /** ファイル選択時 */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const validFiles = selectedFiles.filter((file) =>
      imageMimeTypes.includes(file.type)
    );
    setFiles((prev) => [...prev, ...validFiles]);
  };

  // Remove file handler
  const removeFile = (fileName: string) => {
    setFiles((prev) => prev.filter((file) => file.name !== fileName));
    setFileStatuses((prev) => {
      const newStatuses = new Map(prev);
      newStatuses.delete(fileName);
      return newStatuses;
    });
  };

  // Queue management functions
  const addToQueue = (newFiles: File[]) => {
    const newQueuedImages: QueuedImage[] = newFiles.map(file => ({
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      file,
      addedAt: new Date(),
      status: 'queued' as const,
    }));
    setQueuedImages(prev => [...prev, ...newQueuedImages]);
  };

  const removeFromQueue = (id: string) => {
    setQueuedImages(prev => prev.filter(img => img.id !== id));
  };

  const clearGallery = () => {
    setFinishedImages([]);
    localStorage.removeItem('manga-translator-finished-images');
  };

  /**
   * フォーム送信 (翻訳リクエスト)
   */
  const handleSubmit = () => {
    if (files.length === 0) return;

    resetFileStatuses();
    setShouldTranslate(true);
  };

  // Translation Processing - Configeration
  const buildTranslationConfig = (): string => {
    return JSON.stringify({
      detector: {
        detector: textDetector,
        detection_size: detectionResolution,
        box_threshold: customBoxThreshold,
        unclip_ratio: customUnclipRatio,
      },
      render: {
        direction: renderTextDirection,
      },
      translator: {
        translator: translator,
        target_lang: targetLanguage,
      },
      inpainter: {
        inpainter: inpainter,
        inpainting_size: inpaintingSize,
      },
      mask_dilation_offset: maskDilationOffset,
    });
  };

  // Translation Processing - Network Request
  const requestTranslation = async (file: File, config: string) => {
    const formData = new FormData();
    formData.append("image", file);
    formData.append("config", config);

    const headers: Record<string, string> = {};
    if (userId && userId.trim().length > 0) {
      headers["X-User-Id"] = userId;
    }

    const response = await fetch(`/api/translate/with-form/image/stream`, {
      method: "POST",
      body: formData,
      headers,
    });

    if (response.status !== 200) {
      throw new Error(t("status.errorUpload"));
    }

    return response;
  };

  // Translation Processing - Chunk Processing
  const processChunk = async (
    value: Uint8Array,
    fileId: string,
    currentBuffer: Uint8Array
  ): Promise<ChunkProcessingResult> => {
    // Check for existing errors first
    if (fileStatuses.get(fileId)?.error) {
      throw new Error(t("status.error"));
    }

    // Combine buffers
    const newBuffer = new Uint8Array(currentBuffer.length + value.length);
    newBuffer.set(currentBuffer);
    newBuffer.set(value, currentBuffer.length);
    let processedBuffer = newBuffer;

    // Process all complete messages in buffer
    while (processedBuffer.length >= 5) {
      const dataSize = new DataView(processedBuffer.buffer).getUint32(1, false);
      const totalSize = 5 + dataSize;
      if (processedBuffer.length < totalSize) break;

      const statusCode = processedBuffer[0];
      const data = processedBuffer.slice(5, totalSize);
      const decodedData = new TextDecoder("utf-8").decode(data);

      processStatusUpdate(statusCode, decodedData, fileId, data);
      processedBuffer = processedBuffer.slice(totalSize);
    }

    return { updatedBuffer: processedBuffer };
  };

  // Translation Processing - Single File Stream Processing
  const processSingleFileStream = async (file: File, config: string) => {
    try {
      const response = await requestTranslation(file, config);
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error(t("status.errorDisconnect"));
      }

      let fileBuffer = new Uint8Array();

      while (true) {
        const { done, value } = await reader.read();
        if (done || !value) break;

        try {
          const result = await processChunk(value, file.name, fileBuffer);
          fileBuffer = result.updatedBuffer;
        } catch (error) {
          console.error(`Error processing chunk for ${file.name}:`, error);
          updateFileStatus(file.name, {
            status: "error",
            error:
              error instanceof Error ? error.message : t("status.error"),
          });
        }
      }
    } catch (err) {
      console.error("Error processing file: ", file.name, err);
      updateFileStatus(file.name, {
        status: "error",
        error: err instanceof Error ? err.message : t("status.error"),
      });
    }
  };

  // Translation Processing - Overall Translation Batch Process
  const processTranslation = async () => {
    const config = buildTranslationConfig();

    // Process all files in parallel
    try {
      await Promise.all(
        files.map((file) => processSingleFileStream(file, config))
      );
    } catch (err) {
      console.error("Translation process failed:", err);
    } finally {
      await fetchTaskHistory();
    }
  };

  // Helper to reset file statuses
  const resetFileStatuses = () => {
    // Initialize status for all files
    const newStatuses = new Map();
    files.forEach((file) => {
      newStatuses.set(file.name, {
        status: null,
        progress: null,
        queuePos: null,
        result: null,
        error: null,
      });
    });
    setFileStatuses(newStatuses);
  };

  // Helper to update status for a specific file
  const updateFileStatus = (fileId: string, update: Partial<FileStatus>) => {
    setFileStatuses((prev) => {
      const newStatuses = new Map(prev);
      const currentStatus = newStatuses.get(fileId) || {
        status: null,
        progress: null,
        queuePos: null,
        result: null,
        error: null,
      };
      const updatedStatus = { ...currentStatus, ...update };
      newStatuses.set(fileId, updatedStatus);
      return newStatuses;
    });
  };

  // Helper to process status updates
  const processStatusUpdate = (
    statusCode: number,
    decodedData: string,
    fileId: string,
    data: Uint8Array
  ): void => {
    switch (statusCode) {
      case 0: // 結果が返ってきた
        const resultBlob = new Blob([data], { type: "image/png" });
        updateFileStatus(fileId, {
          status: "finished",
          result: resultBlob,
        });
        
        // Add to finished images gallery
        const settings: TranslationSettings = {
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
        };
        
        const finishedImage: FinishedImage = {
          id: `${fileId}-${Date.now()}`,
          originalName: fileId,
          result: resultBlob,
          finishedAt: new Date(),
          settings,
        };
        
        setFinishedImages(prev => [finishedImage, ...prev]);
        addFinishedImage(finishedImage);
        void fetchTaskHistory();
        break;
      case 1: // 翻訳中
        const newStatus = decodedData as StatusKey;
        updateFileStatus(fileId, { status: newStatus });
        break;
      case 2: // エラー
        updateFileStatus(fileId, {
          status: "error",
          error: decodedData,
        });
        void fetchTaskHistory();
        break;
      case 3: // キューに追加された
        updateFileStatus(fileId, {
          status: "pending",
          queuePos: decodedData,
        });
        break;
      case 4: // キューがクリアされた
        updateFileStatus(fileId, {
          status: "pending",
          queuePos: null,
        });
        break;
      default: // 未知のステータスコード
        console.warn(`Unknown status code ${statusCode} for file ${fileId}`);
        break;
    }
  };

  return (
    <div>
      <Header userId={userId} onUserIdChange={handleUserIdChange} />
      <div className="bg-gray-100 min-h-screen flex flex-col pt-10 items-center">
        <div className="bg-white shadow-md rounded-lg p-6 w-full max-w-6xl space-y-6">
          <OptionsPanel
            detectionResolution={detectionResolution}
            textDetector={textDetector}
            renderTextDirection={renderTextDirection}
            translator={translator}
            targetLanguage={targetLanguage}
            inpaintingSize={inpaintingSize}
            customUnclipRatio={customUnclipRatio}
            customBoxThreshold={customBoxThreshold}
            maskDilationOffset={maskDilationOffset}
            inpainter={inpainter}
            setDetectionResolution={setDetectionResolution}
            setTextDetector={setTextDetector}
            setRenderTextDirection={setRenderTextDirection}
            setTranslator={setTranslator}
            setTargetLanguage={setTargetLanguage}
            setInpaintingSize={setInpaintingSize}
            setCustomUnclipRatio={setCustomUnclipRatio}
            setCustomBoxThreshold={setCustomBoxThreshold}
            setMaskDilationOffset={setMaskDilationOffset}
            setInpainter={setInpainter}
          />
          
          {/* Image Queue Section */}
          <div className="border-t pt-6">
            <ImageQueue
              queuedImages={queuedImages}
              onRemoveFromQueue={removeFromQueue}
              onAddToQueue={addToQueue}
              isProcessing={isProcessing}
            />
          </div>

          {/* Main Image Handling Area */}
          <div className="border-t pt-6">
            <ImageHandlingArea
              files={files}
              fileStatuses={fileStatuses}
              isProcessing={isProcessing}
              isProcessingAllFinished={isProcessingAllFinished}
              handleFileChange={handleFileChange}
              handleDrop={handleDrop}
              handleSubmit={handleSubmit}
              clearForm={clearForm}
              removeFile={removeFile}
            />
          </div>

          {/* Results Gallery */}
          <div className="border-t pt-6">
            <ResultGallery
              finishedImages={finishedImages}
              onClearGallery={clearGallery}
            />
          </div>

          {/* Task History */}
          <div className="border-t pt-6">
            <TaskHistory
              tasks={taskHistory}
              isLoading={tasksLoading}
              error={taskError}
              onRefresh={fetchTaskHistory}
              userId={userId}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
