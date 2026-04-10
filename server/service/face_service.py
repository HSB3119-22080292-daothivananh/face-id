# import cv2
# import numpy as np
# import io
# import os
# import threading
# import logging
# import urllib.request
# from dataclasses import dataclass
# from typing import Optional
# from PIL import Image
# logger = logging.getLogger(__name__)
# MODEL_DIR   = "models"
# UPLOAD_DIR  = "uploads"
# YUNET_PATH  = os.path.join(MODEL_DIR, "face_detection_yunet_2023mar.onnx")
# SFACE_PATH  = os.path.join(MODEL_DIR, "face_recognition_sface_2021dec.onnx")
# YUNET_URL = "https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx"
# SFACE_URL  = "https://github.com/opencv/opencv_zoo/raw/main/models/face_recognition_sface/face_recognition_sface_2021dec.onnx"
# COSINE_THRESHOLD = 0.40
# os.makedirs(MODEL_DIR,  exist_ok=True)
# os.makedirs(UPLOAD_DIR, exist_ok=True)
# def _download_model(url: str, path: str, name: str) -> None:
#     """Tải model nếu chưa có, hiển thị tiến trình."""
#     if os.path.exists(path):
#         return
#     logger.info(f"[Model] Đang tải {name}... (~{url.split('/')[-1]})")

#     def _progress(count, block_size, total_size):
#         pct = int(count * block_size * 100 / total_size) if total_size > 0 else 0
#         print(f"\r  [{name}] {min(pct, 100)}%", end="", flush=True)

#     urllib.request.urlretrieve(url, path, _progress)
#     print()
#     logger.info(f" {name} đã tải xong → {path}")


# # ═════════════════════════════════════════════════════════════════════════════
# # FaceMemoryStore — In-Memory RAM, thread-safe
# # ═════════════════════════════════════════════════════════════════════════════
# @dataclass
# class CachedFace:
#     person_id: str
#     name:      str
#     role:      str
#     img_path:  str
#     encoding:  np.ndarray   # 128-dim SFace feature (L2-normalized)


# class FaceMemoryStore:
#     """Toàn bộ encoding lưu trên RAM. Nhận diện không cần đụng DB."""

#     def __init__(self):
#         self._faces:  list[CachedFace] = []
#         self._lock    = threading.RLock()
#         self._loaded  = False

#     @property
#     def is_loaded(self) -> bool:
#         return self._loaded

#     @property
#     def count(self) -> int:
#         with self._lock:
#             return len(self._faces)

#     # ── Startup: nạp từ DB ────────────────────────────────────────────────
#     def load_all(self, rows: list[dict]) -> None:
#         with self._lock:
#             self._faces = []
#             for row in rows:
#                 try:
#                     enc = np.array(row["embedding_vector"], dtype=np.float32)
#                     enc = self._normalize(enc)
#                     self._faces.append(CachedFace(
#                         person_id=row["person_id"],
#                         name=row["name"],
#                         role=row.get("role", ""),
#                         img_path=row.get("img_path", ""),
#                         encoding=enc,
#                     ))
#                 except Exception as e:
#                     logger.warning(f"[RAM] Bỏ qua {row.get('name')}: {e}")
#             self._loaded = True
#         logger.info(f" {len(self._faces)} khuôn mặt")

#     # ── CRUD real-time ────────────────────────────────────────────────────
#     def add(self, person_id: str, name: str, role: str, img_path: str, encoding: list[float]) -> None:
#         enc = self._normalize(np.array(encoding, dtype=np.float32))
#         with self._lock:
#             self._faces.append(CachedFace(person_id, name, role, img_path, enc))
#         logger.info(f" {name} | Tổng: {self.count}")

#     def remove_by_person(self, person_id: str) -> int:
#         with self._lock:
#             before = len(self._faces)
#             self._faces = [f for f in self._faces if f.person_id != person_id]
#             return before - len(self._faces)

#     def update_info(self, person_id: str, name: str, role: str) -> None:
#         with self._lock:
#             for f in self._faces:
#                 if f.person_id == person_id:
#                     f.name = name
#                     f.role = role

#     # ── Nhận diện vectorized cosine ───────────────────────────────────────
#     def find_best_match(
#         self,
#         query_enc: np.ndarray,
#         threshold: float = COSINE_THRESHOLD,
#     ) -> Optional[dict]:
#         """
#         Cosine similarity = dot product (đã normalize).
#         Numpy matrix multiply → tính tất cả N embedding cùng lúc.
#         """
#         with self._lock:
#             if not self._faces:
#                 return None

#             q = self._normalize(query_enc)
#             matrix = np.stack([f.encoding for f in self._faces])  # (N, 128)
#             scores  = matrix @ q                                    # (N,) cosine sim

#             idx   = int(np.argmax(scores))
#             score = float(scores[idx])

#             if score >= threshold:
#                 best = self._faces[idx]
#                 return {
#                     "person_id": best.person_id,
#                     "name":      best.name,
#                     "role":      best.role,
#                     "img_path":  best.img_path,
#                     "score":     score,
#                     "distance":  1.0 - score,
#                 }
#             return None

#     @staticmethod
#     def _normalize(v: np.ndarray) -> np.ndarray:
#         n = np.linalg.norm(v)
#         return v / n if n > 0 else v


# # ═════════════════════════════════════════════════════════════════════════════
# # FaceAiService — OpenCV YuNet detector + SFace recognizer
# # ═════════════════════════════════════════════════════════════════════════════
# class FaceAiService:

#     def __init__(self):
#         # Tải model nếu chưa có
#         _download_model(YUNET_URL, YUNET_PATH, "YuNet (detection)")
#         _download_model(SFACE_URL,  SFACE_PATH,  "SFace (recognition)")

#         logger.info("[AI] Đang khởi tạo YuNet + SFace...")

#         # YuNet: phát hiện khuôn mặt, det_size sẽ update khi gọi
#         self._detector = cv2.FaceDetectorYN.create(
#             YUNET_PATH,
#             "",
#             (320, 240),       # input size mặc định (sẽ update theo ảnh thực)
#             score_threshold=0.6,
#             nms_threshold=0.3,
#             top_k=5,
#         )

#         # SFace: trích xuất embedding 128-dim
#         self._recognizer = cv2.FaceRecognizerSF.create(
#             SFACE_PATH, ""
#         )

#         logger.info("[AI]  YuNet + SFace sẵn sàng")

#     # ── Decode ảnh bytes → BGR numpy ──────────────────────────────────────
#     @staticmethod
#     def _decode(file_bytes: bytes) -> Optional[np.ndarray]:
#         try:
#             nparr = np.frombuffer(file_bytes, np.uint8)
#             img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
#             if img is not None:
#                 return img
#         except Exception:
#             pass
#         try:
#             pil = Image.open(io.BytesIO(file_bytes)).convert("RGB")
#             return cv2.cvtColor(np.array(pil), cv2.COLOR_RGB2BGR)
#         except Exception as e:
#             logger.error(f"[AI] Không đọc ảnh: {e}")
#             return None

#     def extract_faces(self, file_bytes: bytes) -> list[dict]:
#         """
#         Nhận bytes ảnh → list { box, descriptor }.
#         Tổng thời gian: ~25–50ms trên CPU.
#         """
#         img = self._decode(file_bytes)
#         if img is None:
#             return []

#         h, w = img.shape[:2]

#         # Update input size cho YuNet theo kích thước ảnh thực
#         self._detector.setInputSize((w, h))

#         # ── Detect ────────────────────────────────────────────────────────
#         _, faces_raw = self._detector.detect(img)

#         if faces_raw is None or len(faces_raw) == 0:
#             logger.info("[AI] Không phát hiện khuôn mặt")
#             return []

#         logger.info(f"[AI] Phát hiện {len(faces_raw)} khuôn mặt")

#         results = []
#         for face_data in faces_raw:
#             # face_data: [x, y, w, h, lm_x0, lm_y0, ..., score]
#             x, y, fw, fh = [int(v) for v in face_data[:4]]
#             det_score = float(face_data[-1])

#             # Đảm bảo bbox nằm trong ảnh
#             x  = max(0, x)
#             y  = max(0, y)
#             fw = min(fw, w - x)
#             fh = min(fh, h - y)

#             # ── Encode ────────────────────────────────────────────────────
#             # alignCrop: crop + align theo landmark → embedding chuẩn hơn
#             aligned = self._recognizer.alignCrop(img, face_data)
#             feature = self._recognizer.feature(aligned)   # shape (1, 128)
#             encoding = feature.flatten().tolist()          # list[float] 128 phần tử

#             results.append({
#                 "box": {
#                     "x":      x,
#                     "y":      y,
#                     "width":  fw,
#                     "height": fh,
#                 },
#                 "descriptor": encoding,
#                 "det_score":  det_score,
#             })

#         return results

#     @staticmethod
#     def save_image(file_bytes: bytes, person_id: str, index: int = 0) -> str:
#         """Lưu ảnh vào uploads/, trả về đường dẫn."""
#         filename = f"{person_id}_{index}.jpg"
#         filepath = os.path.join(UPLOAD_DIR, filename)
#         nparr = np.frombuffer(file_bytes, np.uint8)
#         img   = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
#         if img is not None:
#             cv2.imwrite(filepath, img, [cv2.IMWRITE_JPEG_QUALITY, 90])
#         else:
#             with open(filepath, "wb") as f:
#                 f.write(file_bytes)
#         return filepath


# # ─── Singleton ────────────────────────────────────────────────────────────────
# face_ai_service   = FaceAiService()
# face_memory_store = FaceMemoryStore()


import cv2, numpy as np, io, os, threading, logging, urllib.request
from dataclasses import dataclass, field
from typing import Optional
from PIL import Image

logger = logging.getLogger(__name__)

MODEL_DIR  = "models"
UPLOAD_DIR = "uploads"
YUNET_PATH = os.path.join(MODEL_DIR, "face_detection_yunet_2023mar.onnx")
SFACE_PATH = os.path.join(MODEL_DIR, "face_recognition_sface_2021dec.onnx")
YUNET_URL  = "https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx"
SFACE_URL  = "https://github.com/opencv/opencv_zoo/raw/main/models/face_recognition_sface/face_recognition_sface_2021dec.onnx"
COSINE_THRESHOLD = 0.40

os.makedirs(MODEL_DIR,  exist_ok=True)
os.makedirs(UPLOAD_DIR, exist_ok=True)


def _download_model(url, path, name):
    if os.path.exists(path): return
    logger.info(f"[Model] Tải {name}...")
    urllib.request.urlretrieve(url, path)
    logger.info(f"[Model]  {name} → {path}")


@dataclass
class CachedFace:
    person_id:        str
    name:             str
    role:             str
    img_path:         str
    encoding:         np.ndarray
    work_expiry_date: Optional[str] = None   # "YYYY-MM-DD" hoặc None


class FaceMemoryStore:
    def __init__(self):
        self._faces:  list[CachedFace] = []
        self._lock    = threading.RLock()
        self._loaded  = False

    @property
    def is_loaded(self): return self._loaded

    @property
    def count(self):
        with self._lock: return len(self._faces)

    def load_all(self, rows: list[dict]):
        with self._lock:
            self._faces = []
            for row in rows:
                try:
                    enc = self._norm(np.array(row["embedding_vector"], dtype=np.float32))
                    self._faces.append(CachedFace(
                        person_id=row["person_id"],
                        name=row["name"],
                        role=row.get("role",""),
                        img_path=row.get("img_path",""),
                        encoding=enc,
                        work_expiry_date=row.get("work_expiry_date"),
                    ))
                except Exception as e:
                    logger.warning(f"[RAM] Skip {row.get('name')}: {e}")
            self._loaded = True
        logger.info(f"[RAM]  {len(self._faces)} khuôn mặt")

    def add(self, person_id, name, role, img_path, encoding, work_expiry_date=None):
        enc = self._norm(np.array(encoding, dtype=np.float32))
        with self._lock:
            self._faces.append(CachedFace(person_id, name, role, img_path, enc, work_expiry_date))
        logger.info(f"[RAM]  {name} | Tổng: {self.count}")

    def remove_by_person(self, person_id):
        with self._lock:
            before = len(self._faces)
            self._faces = [f for f in self._faces if f.person_id != person_id]
            return before - len(self._faces)

    def update_info(self, person_id, name, role):
        with self._lock:
            for f in self._faces:
                if f.person_id == person_id:
                    f.name = name; f.role = role

    def find_best_match(self, query_enc: np.ndarray, threshold=COSINE_THRESHOLD) -> Optional[dict]:
        with self._lock:
            if not self._faces: return None
            q       = self._norm(query_enc)
            matrix  = np.stack([f.encoding for f in self._faces])
            scores  = matrix @ q
            idx     = int(np.argmax(scores))
            score   = float(scores[idx])
            if 1.0 - score < threshold:
                best = self._faces[idx]
                return {
                    "person_id":        best.person_id,
                    "name":             best.name,
                    "role":             best.role,
                    "img_path":         best.img_path,
                    "score":            score,
                    "distance":         1.0 - score,
                    "work_expiry_date": best.work_expiry_date,
                }
            return None

    @staticmethod
    def _norm(v: np.ndarray) -> np.ndarray:
        n = np.linalg.norm(v)
        return v / n if n > 0 else v


class FaceAiService:
    def __init__(self):
        _download_model(YUNET_URL, YUNET_PATH, "YuNet")
        _download_model(SFACE_URL, SFACE_PATH, "SFace")
        logger.info("[AI] Khởi tạo YuNet + SFace...")
        self._detector   = cv2.FaceDetectorYN.create(YUNET_PATH, "", (320,240), score_threshold=0.6, nms_threshold=0.3, top_k=5)
        self._recognizer = cv2.FaceRecognizerSF.create(SFACE_PATH, "")
        logger.info("[AI]  Sẵn sàng")

    @staticmethod
    def _decode(file_bytes: bytes):
        try:
            arr = np.frombuffer(file_bytes, np.uint8)
            img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
            if img is not None: return img
        except Exception: pass
        try:
            pil = Image.open(io.BytesIO(file_bytes)).convert("RGB")
            return cv2.cvtColor(np.array(pil), cv2.COLOR_RGB2BGR)
        except Exception as e:
            logger.error(f"[AI] Không đọc ảnh: {e}"); return None

    def extract_faces(self, file_bytes: bytes) -> list[dict]:
        img = self._decode(file_bytes)
        if img is None: return []
        h, w = img.shape[:2]
        self._detector.setInputSize((w, h))
        _, faces_raw = self._detector.detect(img)
        if faces_raw is None or len(faces_raw) == 0: return []
        results = []
        for fd in faces_raw:
            x,y,fw,fh = [int(v) for v in fd[:4]]
            x=max(0,x); y=max(0,y); fw=min(fw,w-x); fh=min(fh,h-y)
            aligned  = self._recognizer.alignCrop(img, fd)
            feature  = self._recognizer.feature(aligned)
            results.append({
                "box": {"x":x,"y":y,"width":fw,"height":fh},
                "descriptor": feature.flatten().tolist(),
                "det_score": float(fd[-1]),
            })
        logger.info(f"[AI] {len(results)} khuôn mặt")
        return results

    @staticmethod
    def save_image(file_bytes: bytes, person_id: str, index: int = 0) -> str:
        filename = f"{person_id}_{index}.jpg"
        filepath = os.path.join(UPLOAD_DIR, filename)
        arr = np.frombuffer(file_bytes, np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if img is not None:
            cv2.imwrite(filepath, img, [cv2.IMWRITE_JPEG_QUALITY, 90])
        else:
            with open(filepath, "wb") as f: f.write(file_bytes)
        return filepath


face_ai_service   = FaceAiService()
face_memory_store = FaceMemoryStore()