import numpy as np

from .default import DefaultDetector
from .dbnet_convnext import DBConvNextDetector
from .ctd import ComicTextDetector
from .craft import CRAFTDetector
from .paddle_rust import PaddleDetector
from .rapidocr import RapidOCRDetector
from .none import NoneDetector
from .common import CommonDetector, OfflineDetector
from ..config import Detector

DETECTORS = {
    Detector.default: DefaultDetector,
    Detector.dbconvnext: DBConvNextDetector,
    Detector.ctd: ComicTextDetector,
    Detector.craft: CRAFTDetector,
    Detector.paddle: PaddleDetector,
    Detector.rapidocr: RapidOCRDetector,
    Detector.none: NoneDetector,
}
detector_cache = {}

def get_detector(key: Detector, *args, **kwargs) -> CommonDetector:
    if key not in DETECTORS:
        raise ValueError(f'Could not find detector for: "{key}". Choose from the following: %s' % ','.join(DETECTORS))
    if not detector_cache.get(key):
        detector = DETECTORS[key]
        detector_cache[key] = detector(*args, **kwargs)
    return detector_cache[key]

async def prepare(detector_key: Detector):
    detector = get_detector(detector_key)
    if isinstance(detector, OfflineDetector):
        await detector.download()

async def dispatch(detector_key: Detector, image: np.ndarray, detect_size: int, text_threshold: float, box_threshold: float, unclip_ratio: float,
                   invert: bool, gamma_correct: bool, rotate: bool, auto_rotate: bool = False, device: str = 'cpu', verbose: bool = False,
                   config=None):
    """
    通用检测入口。对于 RapidOCRDetector，会将最新的 DetectorConfig 挂在 detector.config 上，
    以便选择正确的 RapidOCR 检测模型（lang_type / model_type / ocr_version 组合）。
    """
    detector = get_detector(detector_key)
    # 将配置对象挂到实例上，供诸如 RapidOCRDetector 使用
    if config is not None:
        try:
            setattr(detector, "config", config)
        except Exception:
            pass
    if isinstance(detector, OfflineDetector):
        await detector.load(device)
    return await detector.detect(image, detect_size, text_threshold, box_threshold, unclip_ratio, invert, gamma_correct, rotate, auto_rotate, verbose)

async def unload(detector_key: Detector):
    detector_cache.pop(detector_key, None)
