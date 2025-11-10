import numpy as np
from typing import List, Tuple, Optional
import cv2

from .common import CommonOCR
from ..config import OcrConfig
from ..utils import Quadrilateral, get_logger


class ModelRapidOCR(CommonOCR):
    """
    RapidOCR-based recognizer using the new `rapidocr` package.
    仅做识别：对传入检测框逐一识别并回填文本。
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._engine = None
        self.logger = get_logger('manga-translator.ocr.rapidocr')
        self._ensure_backend()

    def _ensure_backend(self):
        if self._engine is not None:
            return
        try:
            from rapidocr import RapidOCR  # type: ignore
        except Exception as e:
            raise RuntimeError(
                "RapidOCR backend not available for OCR. Please install: pip install rapidocr (and onnxruntime)."
            ) from e
        self._engine = RapidOCR()
        self.logger.info('RapidOCR engine initialized for OCR.')

    def _recognize_roi(self, roi: np.ndarray) -> Tuple[str, float]:
        """
        对单个ROI进行识别，返回 (text, prob)
        """
        # RapidOCR 接受 RGB 或 BGR；此处统一为 BGR 以兼容某些预处理
        if roi.ndim == 3 and roi.shape[2] == 3:
            bgr = cv2.cvtColor(roi, cv2.COLOR_RGB2BGR)
        else:
            bgr = roi
        try:
            rec_out = self._engine(bgr, use_det=False, use_cls=False, use_rec=True)  # type: ignore
        except Exception as e:
            self.logger.debug(f'RapidOCR rec failed on ROI: {e}')
            return '', 0.0

        if rec_out is None:
            return '', 0.0

        # 兼容不同输出风格：优先 txts/scores 字段
        text = ''
        score = 0.0
        if hasattr(rec_out, 'txts') and getattr(rec_out, 'txts'):
            first = rec_out.txts[0]
            # 可能是字符串或 (text, score)
            if isinstance(first, (list, tuple)) and len(first) >= 1:
                text = str(first[0])
            else:
                text = str(first)
        if hasattr(rec_out, 'scores') and getattr(rec_out, 'scores'):
            try:
                score = float(rec_out.scores[0])
            except Exception:
                pass
        if not text and hasattr(rec_out, 'text'):
            text = str(getattr(rec_out, 'text'))
        if not score and hasattr(rec_out, 'score'):
            try:
                score = float(getattr(rec_out, 'score'))
            except Exception:
                pass
        return text, score if score else 1.0

    async def _recognize(
        self,
        image: np.ndarray,
        textlines: List[Quadrilateral],
        config: OcrConfig,
        verbose: bool = False
    ) -> List[Quadrilateral]:
        quads_with_dir = list(self._generate_text_direction(textlines))
        out: List[Quadrilateral] = []
        for q, direction in quads_with_dir:
            text_height = max(int(getattr(q, 'font_size', 48)), 16)
            region = q.get_transformed_region(image, 'h' if direction == 'h' else 'v', text_height)
            txt, prob = self._recognize_roi(region)
            q.text = txt or ''
            q.prob = float(prob) if prob is not None else 0.0
            out.append(q)
        return out
