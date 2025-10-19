import React, { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import type { FinishedImage } from "@/types";
import { useI18n } from "@/i18n";

interface ResultGalleryProps {
  finishedImages: FinishedImage[];
  onClearGallery: () => void;
}

export const ResultGallery: React.FC<ResultGalleryProps> = ({
  finishedImages,
  onClearGallery,
}) => {
  const { t } = useI18n();
  const validImages = finishedImages.filter(
    (image) => image.result instanceof Blob
  );
  const thumbnailItems = useMemo(
    () =>
      validImages.map((image) => ({
        image,
        url: URL.createObjectURL(image.result as Blob),
      })),
    [validImages]
  );
  const [selectedImage, setSelectedImage] = useState<FinishedImage | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(
    () => () => {
      thumbnailItems.forEach((item) => URL.revokeObjectURL(item.url));
    },
    [thumbnailItems]
  );

  const selectedImageUrl = useMemo(() => {
    if (!selectedImage || !(selectedImage.result instanceof Blob)) {
      return null;
    }
    return URL.createObjectURL(selectedImage.result);
  }, [selectedImage]);

  useEffect(() => {
    if (!selectedImageUrl) {
      return;
    }
    return () => {
      URL.revokeObjectURL(selectedImageUrl);
    };
  }, [selectedImageUrl]);

  const openImageModal = (image: FinishedImage) => {
    setSelectedImage(image);
    setIsModalOpen(true);
  };

  const closeImageModal = () => {
    setIsModalOpen(false);
    setSelectedImage(null);
  };

  const navigateImage = (direction: 'prev' | 'next') => {
    if (!selectedImage) return;

    const currentIndex = validImages.findIndex(
      (img) => img.id === selectedImage.id
    );
    if (currentIndex === -1) return;

    let newIndex: number;
    if (direction === 'prev') {
      newIndex = currentIndex === 0 ? validImages.length - 1 : currentIndex - 1;
    } else {
      newIndex = currentIndex === validImages.length - 1 ? 0 : currentIndex + 1;
    }

    setSelectedImage(validImages[newIndex]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isModalOpen) return;
    
    switch (e.key) {
      case 'Escape':
        closeImageModal();
        break;
      case 'ArrowLeft':
        navigateImage('prev');
        break;
      case 'ArrowRight':
        navigateImage('next');
        break;
    }
  };

  if (validImages.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Icon icon="carbon:image" className="w-12 h-12 mx-auto mb-4 text-gray-300" />
        <p>{t("result.empty.title")}</p>
        <p className="text-sm">{t("result.empty.subtitle")}</p>
      </div>
    );
  }

  return (
    <>
      {/* Gallery Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-800">
          {t("result.title", { count: validImages.length })}
        </h3>
        <button
          onClick={onClearGallery}
          className="px-3 py-1 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
        >
          {t("result.clearAll")}
        </button>
      </div>

      {/* Image Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {thumbnailItems.map(({ image, url }) => (
          <div
            key={image.id}
            className="group cursor-pointer bg-white rounded-lg border hover:border-blue-400 hover:shadow-md transition-all duration-200"
            onClick={() => openImageModal(image)}
          >
            <div className="relative aspect-square overflow-hidden rounded-t-lg">
              <img
                src={url}
                alt={t("result.viewer.infoTitle", { name: image.originalName })}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                <Icon
                  icon="carbon:view"
                  className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                />
              </div>
            </div>
            <div className="p-2">
              <div className="text-xs text-gray-600 truncate" title={image.originalName}>
                {image.originalName}
              </div>
              <div className="text-xs text-gray-400">
                {image.finishedAt.toLocaleDateString()}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Image Modal */}
      {isModalOpen && selectedImage && selectedImageUrl && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
          onClick={closeImageModal}
          onKeyDown={handleKeyDown}
          tabIndex={0}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]">
            {/* Navigation Arrows */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigateImage("prev");
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition-all z-10"
              title={t("result.viewer.previous")}
              aria-label={t("result.viewer.previous")}
            >
              <Icon icon="carbon:chevron-left" className="w-6 h-6" />
            </button>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigateImage("next");
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition-all z-10"
              title={t("result.viewer.next")}
              aria-label={t("result.viewer.next")}
            >
              <Icon icon="carbon:chevron-right" className="w-6 h-6" />
            </button>

            {/* Close Button */}
            <button
              onClick={closeImageModal}
              className="absolute top-4 right-4 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition-all z-10"
              title={t("result.viewer.close")}
              aria-label={t("result.viewer.close")}
            >
              <Icon icon="carbon:close" className="w-6 h-6" />
            </button>

            {/* Image */}
            <img
              src={selectedImageUrl}
              alt={t("result.viewer.infoTitle", {
                name: selectedImage.originalName,
              })}
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />

            {/* Image Info */}
            <div className="absolute bottom-4 left-4 right-4 bg-black bg-opacity-50 text-white p-3 rounded-lg">
              <div className="text-sm font-medium">{selectedImage.originalName}</div>
              <div className="text-xs text-gray-300">
                {t("result.completedAt", {
                  time: selectedImage.finishedAt.toLocaleString(),
                })}
              </div>
              <div className="text-xs text-gray-300">
                {t("result.translator", {
                  translator: selectedImage.settings.translator,
                })}
              </div>
            </div>

            {/* Navigation Hint */}
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-xs">
              {t("result.navigationHint")}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
