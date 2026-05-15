import cv2
import time
import re
import os
import base64
import json
import warnings
import numpy as np
from PIL import Image
import google.generativeai as genai

from DetecInfoBoxes.GetBoxes import Detect
from util import correct_skew
from config import opt

# Tắt cảnh báo FutureWarning từ google.generativeai (tạm thời)
warnings.filterwarnings("ignore", category=FutureWarning, module="google.generativeai")

get_dictionary = Detect(opt)

# ===========================================================================
# GEMINI CONFIG - Lấy API key từ biến môi trường (bắt buộc)
# ===========================================================================
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
if not GEMINI_API_KEY:
    # Fallback cứng (không khuyến khích, chỉ để debug)
    GEMINI_API_KEY = "AIzaSyBwZJ2OhnX6pVk2YWOPekJeym9p-SxCZb4"
    print("[WARN] Dùng API key mặc định – hãy set biến môi trường GEMINI_API_KEY")

genai.configure(api_key=GEMINI_API_KEY)

_gemini_model = None

def _get_gemini_model():
    global _gemini_model
    if _gemini_model is None:
        # Dùng model ổn định, nếu muốn dùng gemini-2.0-flash có thể đổi
        _gemini_model = genai.GenerativeModel("gemini-flash-latest")
    return _gemini_model


# ===========================================================================
# GEMINI OCR MẶT SAU CCCD
# ===========================================================================
_BACK_PROMPT = """Bạn là hệ thống OCR chuyên nghiệp đọc mặt sau thẻ Căn Cước Công Dân (CCCD) Việt Nam.

Hãy đọc ảnh và trích xuất CHÍNH XÁC các thông tin sau, trả về JSON thuần túy (không có markdown, không có ```):

{
  "special_features": "Đặc điểm nhận dạng (ví dụ: Sẹo 2cm trên mắt phải)",
  "issue_date": "Ngày cấp định dạng DD/MM/YYYY",
  "issued_by": "Nơi cấp (ví dụ: CỤC TRƯỞNG CỤC CẢNH SÁT QUẢN LÝ HÀNH CHÍNH VỀ TRẬT TỰ XÃ HỘI)",
  "mrz_line1": "Dòng MRZ thứ 1 gồm 30 ký tự",
  "mrz_line2": "Dòng MRZ thứ 2 gồm 30 ký tự",
  "mrz_line3": "Dòng MRZ thứ 3 gồm 30 ký tự"
}

Lưu ý quan trọng:
- MRZ (Machine Readable Zone) là 3 dòng ký tự đặc biệt ở cuối thẻ, gồm chữ in hoa A-Z, số 0-9 và dấu <
- Nếu không đọc được trường nào, để giá trị rỗng ""
- Chỉ trả về JSON, không giải thích gì thêm
"""

def _encode_cv2_to_base64(img_cv2) -> str:
    """Encode ảnh OpenCV (numpy array) sang base64 JPEG."""
    _, buffer = cv2.imencode(".jpg", img_cv2, [cv2.IMWRITE_JPEG_QUALITY, 85])
    return base64.b64encode(buffer).decode("utf-8")


def _parse_mrz_fields(l1: str, l2: str, l3: str) -> dict:
    """Parse 3 dòng MRZ thành các trường thông tin."""
    result = {
        "mrz_id": "",
        "mrz_dob": "",
        "mrz_gender": "",
        "mrz_expiry": "",
        "mrz_name": "",
    }

    def _clean(s):
        s = s.upper().replace(" ", "<").replace("|", "<")
        s = re.sub(r"[^A-Z0-9<]", "<", s)
        return (s + "<" * 30)[:30]

    l1 = _clean(l1)
    l2 = _clean(l2)
    l3 = _clean(l3)

    # Line 1: doc_type(2) + country(3) + id(9) + check + ...
    if len(l1) >= 14:
        id_raw = l1[5:14].replace("<", "")
        if re.match(r"\d{9}", id_raw):
            result["mrz_id"] = id_raw[:9]

    # Line 2: dob(6) + check(1) + sex(1) + expiry(6) + ...
    if len(l2) >= 14:
        dob = l2[0:6]
        sex = l2[7] if len(l2) > 7 else ""
        exp = l2[8:14]

        if re.fullmatch(r"\d{6}", dob):
            yy, mm, dd = dob[0:2], dob[2:4], dob[4:6]
            cc = "19" if int(yy) >= 30 else "20"
            result["mrz_dob"] = f"{dd}/{mm}/{cc}{yy}"

        result["mrz_gender"] = {"M": "Nam", "F": "Nữ"}.get(sex, "")

        if re.fullmatch(r"\d{6}", exp):
            yy, mm, dd = exp[0:2], exp[2:4], exp[4:6]
            cc = "19" if int(yy) >= 30 else "20"
            result["mrz_expiry"] = f"{dd}/{mm}/{cc}{yy}"

    # Line 3: name (LAST<<FIRST<MIDDLE)
    name_raw = l3.strip("<")
    if "<<" in name_raw:
        last, first = name_raw.split("<<", 1)
        result["mrz_name"] = (
            f"{first.replace('<', ' ').strip()} {last.replace('<', ' ').strip()}".strip()
        )
    else:
        result["mrz_name"] = name_raw.replace("<", " ").strip()

    return result


def extract_back_with_gemini(img_path: str) -> dict:
    """
    Dùng Gemini Vision để đọc mặt sau CCCD.
    Trả về dict với đầy đủ các trường thông tin.
    """
    result = {
        "special_features": "",
        "issue_date": "",
        "issued_by": "",
        "mrz_line1": "",
        "mrz_line2": "",
        "mrz_line3": "",
        "mrz_id": "",
        "mrz_dob": "",
        "mrz_gender": "",
        "mrz_expiry": "",
        "mrz_name": "",
    }

    try:
        img = cv2.imread(img_path)
        if img is None:
            print(f"[Gemini] Không đọc được ảnh: {img_path}")
            return result

        try:
            img = correct_skew(img)
        except Exception as e:
            print(f"[Gemini] correct_skew lỗi (bỏ qua): {e}")

        img_b64 = _encode_cv2_to_base64(img)

        print("[Gemini] Đang gọi Gemini Vision API cho mặt sau...")
        t0 = time.time()

        model = _get_gemini_model()
        response = model.generate_content(
            [
                _BACK_PROMPT,
                {
                    "mime_type": "image/jpeg",
                    "data": img_b64,
                },
            ]
        )

        elapsed = time.time() - t0
        print(f"[Gemini] API trả về sau {elapsed:.2f}s")

        raw_text = response.text.strip()
        print(f"[Gemini] Raw response:\n{raw_text}")

        # Làm sạch markdown JSON
        raw_text = re.sub(r"^```(?:json)?\s*", "", raw_text)
        raw_text = re.sub(r"\s*```$", "", raw_text)

        gemini_data = json.loads(raw_text)

        result["special_features"] = gemini_data.get("special_features", "").strip()
        result["issue_date"]        = gemini_data.get("issue_date", "").strip()
        result["issued_by"]         = gemini_data.get("issued_by", "").strip()
        result["mrz_line1"]         = gemini_data.get("mrz_line1", "").strip()
        result["mrz_line2"]         = gemini_data.get("mrz_line2", "").strip()
        result["mrz_line3"]         = gemini_data.get("mrz_line3", "").strip()

        # Parse MRZ fields
        if result["mrz_line1"] or result["mrz_line2"] or result["mrz_line3"]:
            mrz_parsed = _parse_mrz_fields(
                result["mrz_line1"],
                result["mrz_line2"],
                result["mrz_line3"],
            )
            result.update(mrz_parsed)

        print(f"\n[Gemini] ✅ Kết quả mặt sau:")
        for k, v in result.items():
            print(f"   {k:<20}: {v}")

    except json.JSONDecodeError as e:
        raw_text = locals().get("raw_text", "Không có response text")
        print(f"[Gemini] ❌ Lỗi parse JSON: {e}")
        print(f"[Gemini] Response gốc: {raw_text}")
    except Exception as e:
        print(f"[Gemini] ❌ Lỗi API: {e}")

    return result


# ===========================================================================
# CLASS CHÍNH - Mặt trước dùng YOLO + VietOCR
# ===========================================================================

class ReadInfo:
    def __init__(self, imgsz, stride, device, half, model, names, ocr_predictor):
        self.imgsz       = imgsz
        self.stride      = stride
        self.device      = device
        self.half        = half
        self.model       = model
        self.names       = names
        self.opt         = opt
        self.ocrPredictor = ocr_predictor

    @staticmethod
    def get_the_most_confident_bbox(page_boxes):
        for key in page_boxes:
            v = page_boxes.get(key)
            if v:
                page_boxes[key] = [sorted(v, key=lambda x: x[4])[-1]]
        return page_boxes

    @staticmethod
    def arrange_info(infos):
        return sorted(infos, key=lambda x: x[1])

    def ocr_info(self, img, info):
        x_min = info[0] - int(info[2] / 2)
        y_min = info[1] - int(info[3] / 2)
        crop  = img[max(0, y_min):y_min + info[3], max(0, x_min):x_min + info[2]]
        return self.ocrPredictor.predict(
            Image.fromarray(cv2.cvtColor(crop, cv2.COLOR_BGR2RGB))
        )

    def get_all_info(self, img_path: str) -> dict:
        """Trích xuất thông tin mặt trước CCCD bằng YOLO + VietOCR"""
        st  = time.time()
        img = cv2.imread(img_path)
        if img is None:
            return {}

        img        = correct_skew(img)
        page_boxes = get_dictionary.prediction(
            img, self.imgsz, self.stride,
            self.device, self.half, self.model, self.names
        )
        page_boxes = get_dictionary.dict_processing(page_boxes)

        print("\n--- [YOLO MẶT TRƯỚC] ---")
        fields = [
            "id", "full_name", "date_of_birth", "sex", "nationality",
            "place_of_origin", "place_of_residence", "date_of_expiry",
        ]
        result = {}
        for f in fields:
            infos = page_boxes.get(f)
            if infos:
                if len(infos) != 1:
                    infos = self.arrange_info(infos)
                    text  = "".join(self.ocr_info(img, i) + " " for i in infos)
                else:
                    text  = self.ocr_info(img, infos[0])
                result[f] = text.strip()
                print(f"   ✅ {f.upper():<22}: {text.strip()}")
            else:
                result[f] = ""
                print(f"   ❌ {f.upper():<22}: (Không tìm thấy)")

        print(f"[Front] Xong trong {time.time() - st:.2f}s")
        return result

    def get_back_info(self, img_path: str) -> dict:
        """Trích xuất thông tin mặt sau CCCD bằng Gemini Vision"""
        st = time.time()
        print("\n--- [GEMINI MẶT SAU] ---")
        result = extract_back_with_gemini(img_path)
        print(f"[Back] Xong trong {time.time() - st:.2f}s\n")
        return result