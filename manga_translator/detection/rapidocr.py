import numpy as np
import cv2
from typing import List, Tuple

from .common import CommonDetector
from ..utils import Quadrilateral, get_logger


class RapidOCRDetector(CommonDetector):
    """
    RapidOCR-based detector using the new `rapidocr` package.
    仅做文本检测，返回四边形与二值原始掩码(raw_mask)。
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._engine = None
        self.logger = get_logger('manga-translator.det.rapidocr')
        self._engine_sig = None

    def _build_params(self) -> tuple[dict, tuple]:
        """
        根据 DetectorConfig 构造 RapidOCR 检测参数。
        - PP-OCRv5: lang_type 仅限 ch，model_type mobile/server
        - PP-OCRv4: lang_type 可为 ch / en / multi，multi 仅支持 mobile
        """
        try:
            # RapidOCR >=3.3.0 提供的枚举类型
            from rapidocr import LangDet, ModelType, OCRVersion  # type: ignore
        except Exception:
            # 如果库版本不匹配，直接回退到默认配置
            return {}, (None, None, None)

        cfg = getattr(self, "config", None)
        # 默认走 v5 + ch
        version = (getattr(cfg, "rapidocr_ocr_version", None) or "PP-OCRv5").upper()
        lang = (getattr(cfg, "rapidocr_lang_type", None) or "ch").lower()
        model = (getattr(cfg, "rapidocr_model_type", None) or "mobile").lower()

        # 规范化
        if version not in ("PP-OCRV4", "PP-OCRV5"):
            version = "PP-OCRV5"
        if version == "PP-OCRV5":
            # v5 检测：只有 ch
            lang = "ch"
            if model not in ("mobile", "server"):
                model = "mobile"
        else:
            # v4 检测：ch/en/multi
            if lang not in ("ch", "en", "multi"):
                lang = "ch"
            if lang == "multi":
                model = "mobile"
            elif model not in ("mobile", "server"):
                model = "mobile"

        params: dict = {}
        # 映射到 RapidOCR Enum
        lang_enum_map = {
            "ch": LangDet.CH,
            "en": getattr(LangDet, "EN", LangDet.CH),
            "multi": getattr(LangDet, "MULTI", LangDet.CH),
        }
        lang_enum = lang_enum_map.get(lang, LangDet.CH)
        model_enum = ModelType.MOBILE if model == "mobile" else ModelType.SERVER
        ver_enum = OCRVersion.PPOCRV5 if version == "PP-OCRV5" else OCRVersion.PPOCRV4

        params["Det.lang_type"] = lang_enum
        params["Det.model_type"] = model_enum
        params["Det.ocr_version"] = ver_enum
        sig = (lang_enum, model_enum, ver_enum)
        return params, sig

    def _ensure_backend(self):
        try:
            from rapidocr import RapidOCR  # type: ignore
        except Exception as e:
            raise RuntimeError(
                "RapidOCR backend not available. Please install: pip install rapidocr (and onnxruntime)."
            ) from e
        params, sig = self._build_params()
        if self._engine is None or sig != self._engine_sig:
            self._engine = RapidOCR(params=params)
            self._engine_sig = sig
            self.logger.info(f'RapidOCR detector initialized with params: {params}')

    async def _detect(
        self,
        image: np.ndarray,
        detect_size: int,
        text_threshold: float,
        box_threshold: float,
        unclip_ratio: float,
        verbose: bool = False,
    ) -> Tuple[List[Quadrilateral], np.ndarray, np.ndarray]:
        """
        返回: (textlines, raw_mask, mask)
        - textlines: List[Quadrilateral]
        - raw_mask: HxW uint8，文本区域为255
        - mask: None（留给后续mask_refinement生成）
        """
        self._ensure_backend()

        h, w = image.shape[:2]
        try:
            det_out = self._engine(image, use_det=True, use_cls=False, use_rec=False)  # type: ignore
        except Exception as e:
            self.logger.error(f'RapidOCR detection failed: {e}')
            det_out = None

        textlines: List[Quadrilateral] = []
        raw_mask = np.zeros((h, w), dtype=np.uint8)

        # 统一提取 boxes/scores
        boxes = None
        scores = None
        if det_out is not None:
            res = det_out[0] if isinstance(det_out, (list, tuple)) and len(det_out) == 2 else det_out
            if hasattr(res, 'boxes'):
                boxes = getattr(res, 'boxes')
                scores = getattr(res, 'scores', None)
            elif isinstance(res, (list, tuple)):
                tmp_boxes = []
                tmp_scores = []
                for item in res:
                    if isinstance(item, (list, tuple)):
                        if len(item) >= 3:
                            pts_like, _, sc = item[0], item[1], item[2]
                        elif len(item) == 2:
                            pts_like, sc = item[0], item[1]
                        elif len(item) == 1:
                            pts_like, sc = item[0], 1.0
                        else:
                            continue
                        tmp_boxes.append(np.asarray(pts_like))
                        try:
                            tmp_scores.append(float(sc) if sc is not None else 1.0)
                        except Exception:
                            tmp_scores.append(1.0)
                if tmp_boxes:
                    boxes = tmp_boxes
                    scores = tmp_scores

        # 遍历 boxes（兼容 list 或 np.ndarray）
        if boxes is not None:
            if isinstance(boxes, np.ndarray):
                iterable = [boxes[i] for i in range(len(boxes))]
            else:
                iterable = list(boxes)
            for i, pts in enumerate(iterable):
                quad = np.asarray(pts, dtype=np.float32).reshape(-1, 2)
                if quad.shape != (4, 2):
                    # 防御：取最小外接矩形
                    rect = cv2.minAreaRect(quad.astype(np.float32))
                    quad = cv2.boxPoints(rect).astype(np.float32)
                quad_i64 = quad.astype(np.int64)
                sc = 1.0
                if scores is not None:
                    try:
                        sc = float(scores[i])
                    except Exception:
                        sc = 1.0
                q = Quadrilateral(quad_i64, '', sc)
                q.clip(w, h)
                textlines.append(q)
                cv2.fillPoly(raw_mask, [q.pts.astype(np.int32)], 255)

        return textlines, raw_mask, None
