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
        # 缓存上一次的参数签名，避免重复重建
        self._engine_params_sig: Optional[tuple] = None
        self._ensure_backend()

    def _ensure_backend(self, params: Optional[dict] = None):
        try:
            from rapidocr import RapidOCR  # type: ignore
        except Exception as e:
            raise RuntimeError(
                "RapidOCR backend not available for OCR. Please install: pip install rapidocr (and onnxruntime)."
            ) from e
        if self._engine is None or params is not None:
            self._engine = RapidOCR(params=params or {})
            if params:
                self.logger.info(f'RapidOCR engine initialized with params: {list(params.keys())}')
            else:
                self.logger.info('RapidOCR engine initialized for OCR.')

    def _build_params_from_config(self, cfg: OcrConfig) -> tuple[dict, tuple]:
        """
        将 OcrConfig 中的 rapidocr_* 字段转换为 RapidOCR 可接受的 params。
        同时返回可比较的签名，用于判断是否需要重建引擎。
        """
        try:
            # RapidOCR v3+ 提供的识别枚举
            from rapidocr import LangRec, ModelType, OCRVersion  # type: ignore
        except Exception:
            # 如版本过旧，直接回退到默认配置
            return {}, (None, None, None)

        model = (cfg.rapidocr_model_type or '').strip().lower() or None
        lang = (cfg.rapidocr_lang_type or '').strip().lower() or None
        ver = (cfg.rapidocr_ocr_version or '').strip().upper() or None

        if not (model and lang and ver):
            return {}, (None, None, None)

        # 规范化版本：只支持 v4/v5
        if 'V5' in ver:
            ver_enum = OCRVersion.PPOCRV5
        elif 'V4' in ver:
            ver_enum = OCRVersion.PPOCRV4
        else:
            ver_enum = OCRVersion.PPOCRV5

        # 语言映射（覆盖你贴的模型列表）
        lang_map = {
            'ch': 'CH',
            'en': 'EN',
            'th': 'TH',
            'el': 'EL',
            'latin': 'LATIN',
            'eslav': 'ESLAV',
            'korean': 'KOREAN',
            'ch_doc': 'CH_DOC',
            'chinese_cht': 'CHINESE_CHT',
            'ar': 'AR',
            'cyrillic': 'CYRILLIC',
            'devanagari': 'DEVANAGARI',
            'japan': 'JAPAN',
            'ka': 'KA',
            'ta': 'TA',
            'te': 'TE'
        }
        enum_name = lang_map.get(lang)
        if not enum_name or not hasattr(LangRec, enum_name):
            # 不支持的语种直接回退默认
            return {}, (None, None, None)
        lang_enum = getattr(LangRec, enum_name)

        model_enum = ModelType.MOBILE if model == 'mobile' else ModelType.SERVER

        params: dict = {
            'Rec.lang_type': lang_enum,
            'Rec.model_type': model_enum,
            'Rec.ocr_version': ver_enum
        }
        sig = (lang_enum, model_enum, ver_enum)
        return params, sig

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
        # 根据配置重建/初始化 RapidOCR 引擎
        try:
            params, sig = self._build_params_from_config(config)
        except Exception as e:
            # 任意映射问题直接回落默认引擎，不中断流程
            self.logger.debug(f'Build RapidOCR params failed, fallback default: {e}')
            params, sig = {}, self._engine_params_sig or (None, None, None, None)
        if self._engine is None or sig != self._engine_params_sig:
            self._ensure_backend(params if params else None)
            self._engine_params_sig = sig

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
