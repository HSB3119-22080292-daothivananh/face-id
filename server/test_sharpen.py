
import cv2
import time
import re
import os
import numpy as np
from PIL import Image
from DetecInfoBoxes.GetBoxes import Detect
from util import correct_skew
from config import opt

get_dictionary = Detect(opt)

DEBUG     = True
DEBUG_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "debug_back")
if DEBUG:
    os.makedirs(DEBUG_DIR, exist_ok=True)

def _dbg(name, img):
    if DEBUG and img is not None and img.size > 0:
        cv2.imwrite(os.path.join(DEBUG_DIR, f"{name}.jpg"), img)


# ===========================================================================
# WARP THE: Tim the bang nhieu phuong phap, fallback thong minh
# ===========================================================================

def _find_card_contour(gray, iw, ih):
    passes = [
        (7, 20, 100, 7, 3, 0.08),
        (5, 10,  80, 5, 2, 0.06),
        (9, 30, 120, 9, 4, 0.05),
        (5,  5,  50, 7, 5, 0.04),
        (11,10,  60,11, 4, 0.03),
    ]
    for bk, clo, chi, dk, di, mr in passes:
        blur  = cv2.GaussianBlur(gray, (bk, bk), 0)
        edges = cv2.Canny(blur, clo, chi)
        kernel= cv2.getStructuringElement(cv2.MORPH_RECT, (dk, dk))
        edges = cv2.dilate(edges, kernel, iterations=di)
        cnts, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        cnts = sorted(cnts, key=cv2.contourArea, reverse=True)
        for cnt in cnts[:20]:
            if cv2.contourArea(cnt) < iw * ih * mr:
                continue
            peri = cv2.arcLength(cnt, True)
            for eps in [0.02, 0.03, 0.04, 0.05]:
                approx = cv2.approxPolyDP(cnt, eps * peri, True)
                if len(approx) == 4:
                    return approx
    return None


def _find_card_bbox(gray, iw, ih):
    """
    Fallback: Tim bounding box cua the bang cach tim vung sang nhat
    co ti le giong the CCCD (1.58:1).
    """
    # Threshold de tim vung the (sang hon nen)
    blurred = cv2.GaussianBlur(gray, (21, 21), 0)

    # Thu nhieu nguong
    for thresh_val in [180, 160, 140, 120]:
        _, binary = cv2.threshold(blurred, thresh_val, 255, cv2.THRESH_BINARY)
        cnts, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        cnts = sorted(cnts, key=cv2.contourArea, reverse=True)

        for cnt in cnts[:5]:
            area = cv2.contourArea(cnt)
            if area < iw * ih * 0.05:
                continue
            x, y, w, h = cv2.boundingRect(cnt)
            ratio = w / max(h, 1)
            # The CCCD co ti le 1.3 - 1.9
            if 1.2 <= ratio <= 2.0 and w > iw * 0.3:
                return x, y, w, h

    # Neu khong tim duoc, dung 80% trung tam
    margin_x = int(iw * 0.08)
    margin_y = int(ih * 0.08)
    return margin_x, margin_y, iw - 2*margin_x, ih - 2*margin_y


def warp_card(img):
    W, H = 800, 500
    orig = img.copy()
    ih, iw = img.shape[:2]
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Thu contour 4 goc truoc
    card_pts = _find_card_contour(gray, iw, ih)

    if card_pts is not None:
        pts  = card_pts.reshape(4,2).astype(np.float32)
        s    = pts.sum(axis=1); diff = np.diff(pts, axis=1)
        rect = np.zeros((4,2), dtype=np.float32)
        rect[0]=pts[np.argmin(s)];    rect[2]=pts[np.argmax(s)]
        rect[1]=pts[np.argmin(diff)]; rect[3]=pts[np.argmax(diff)]
        cw = int(max(np.linalg.norm(rect[1]-rect[0]), np.linalg.norm(rect[2]-rect[3])))
        ch = int(max(np.linalg.norm(rect[3]-rect[0]), np.linalg.norm(rect[2]-rect[1])))

        if ch > cw:
            dst = np.array([[0,0],[ch-1,0],[ch-1,cw-1],[0,cw-1]], dtype=np.float32)
            M   = cv2.getPerspectiveTransform(rect, dst)
            out = cv2.warpPerspective(orig, M, (ch, cw))
        else:
            dst = np.array([[0,0],[W-1,0],[W-1,H-1],[0,H-1]], dtype=np.float32)
            M   = cv2.getPerspectiveTransform(rect, dst)
            out = cv2.warpPerspective(orig, M, (W, H))

        out = cv2.resize(out, (W, H))
        print("[Warp] Contour 4 goc OK")

    else:
        # Fallback: tim bbox cua the
        x, y, w, h = _find_card_bbox(gray, iw, ih)
        print(f"[Warp] Fallback bbox: x={x} y={y} w={w} h={h}")
        # Dam bao trong anh
        x  = max(0, x);  y  = max(0, y)
        x2 = min(iw, x+w); y2 = min(ih, y+h)
        cropped = orig[y:y2, x:x2]
        out = cv2.resize(cropped, (W, H))

    # Flip 180 neu can
    t = float(cv2.cvtColor(out[0:120,:],   cv2.COLOR_BGR2GRAY).mean())
    b = float(cv2.cvtColor(out[380:500,:], cv2.COLOR_BGR2GRAY).mean())
    if t < b - 10:
        out = cv2.rotate(out, cv2.ROTATE_180)
        print("[Warp] Flip 180")

    _dbg("05_card_final", out)
    print(f"[Warp] Final 800x500  top={t:.0f} bot={b:.0f}")
    return out


def preprocess_line(crop, is_mrz=False):
    h, w = crop.shape[:2]
    sc = max(1.0, 64/h)
    if sc > 1.0:
        crop = cv2.resize(crop, (int(w*sc), int(h*sc)), interpolation=cv2.INTER_CUBIC)
    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
    if is_mrz:
        _, out = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY+cv2.THRESH_OTSU)
    else:
        out = cv2.adaptiveThreshold(gray, 255,
                                    cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                    cv2.THRESH_BINARY, 31, 8)
        out = cv2.medianBlur(out, 3)
    return Image.fromarray(cv2.cvtColor(out, cv2.COLOR_GRAY2RGB))


# ===========================================================================
# SCAN ADAPTIVE - Tim vung text tu dong
# ===========================================================================

def _ocr_strip(crop, ocr_fn, is_mrz=False):
    if crop is None or crop.size == 0:
        return ""
    return ocr_fn(crop, is_mrz=is_mrz).strip()


def _scan_rows(card, ocr_fn, n_slices=30, x0_pct=0.04, x1_pct=0.66):
    """Quet tung dai ngang vung trai the (tranh vung van tay ben phai)."""
    H, W = card.shape[:2]
    x0 = int(W * x0_pct)
    x1 = int(W * x1_pct)
    step = max(1, H // n_slices)
    rows = []
    for i in range(n_slices):
        y0 = i * step
        y1 = min((i+1)*step, H)
        crop = card[y0:y1, x0:x1]
        if crop.size == 0:
            continue
        text = _ocr_strip(crop, ocr_fn, is_mrz=False)
        if text:
            rows.append((y0, y1, text))
    return rows


def _parse_date_from_text(text):
    m = re.search(r'(\d{1,2})[./\-\s]+(\d{1,2})[./\-\s]+(\d{4})', text)
    if m:
        d, mo, y = m.groups()
        if 1990 <= int(y) <= 2099:
            return f"{d.zfill(2)}/{mo.zfill(2)}/{y}"
    # Fallback: 8 so lien tiep
    digs = re.sub(r'\D', '', text)
    if len(digs) >= 8:
        for start in range(min(3, len(digs)-7)):
            chunk = digs[start:start+8]
            yr = int(chunk[4:8])
            if 1990 <= yr <= 2099:
                return f"{chunk[0:2]}/{chunk[2:4]}/{chunk[4:8]}"
    return ""


def _is_mrz_text(text):
    if not text or len(text) < 6:
        return False
    clean = re.sub(r'[^A-Z0-9<]', '', text.upper())
    return len(clean) / max(len(text), 1) >= 0.75


def _find_issue_date(rows):
    for y0, y1, text in rows:
        d = _parse_date_from_text(text)
        if d:
            return y0, y1, d
    return None


def _find_issued_by(rows, date_y1):
    SKIP = ["director","administrative","police","social","general","for ",
            "department","left","right","finger","index","ngon","tro",
            "date","month","year","personal","identification",
            "ngay","thang","nam","noi","place","issue"]
    result = []
    for y0, y1, text in rows:
        if y0 < date_y1:
            continue
        low = text.lower()
        if any(kw in low for kw in SKIP):
            continue
        if _is_mrz_text(text):
            break  # Da den vung MRZ, dung lai
        if re.fullmatch(r'[\d\s<./\-]+', text):
            continue
        if len(text) > 4:
            result.append((y0, y1, text))
        if len(result) >= 3:
            break
    return result


def _find_mrz_rows(card, ocr_fn):
    """Tim 3 dong MRZ o cuoi the."""
    H, W = card.shape[:2]
    x0 = int(W * 0.01); x1 = int(W * 0.99)
    n = 30
    step = max(1, H // n)
    scores = []
    for i in range(n):
        y0 = i*step; y1 = min((i+1)*step, H)
        crop = card[y0:y1, x0:x1]
        if crop.size == 0:
            scores.append((y0, y1, 0.0, ""))
            continue
        text = _ocr_strip(crop, ocr_fn, is_mrz=True).upper()
        if not text:
            scores.append((y0, y1, 0.0, ""))
            continue
        mrz_chars = sum(1 for c in text if c in '<0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ')
        score = mrz_chars / max(len(text), 1)
        scores.append((y0, y1, score, text))

    # Tim 3 dai lien tiep co score cao nhat
    best_start = -1; best_avg = 0.0
    for threshold in [0.80, 0.65, 0.50]:
        for i in range(len(scores)-2):
            s1,s2,s3 = scores[i][2], scores[i+1][2], scores[i+2][2]
            avg = (s1+s2+s3)/3
            if s1 > threshold and s2 > threshold and avg > best_avg:
                best_avg = avg; best_start = i
        if best_start != -1:
            break

    if best_start == -1:
        print("[MRZ] Khong tim duoc")
        return ["", "", ""]

    lines = []
    for j in range(3):
        idx = best_start + j
        y0 = max(0, scores[idx][0]-2)
        y1 = min(H, scores[idx][1]+2)
        crop = card[y0:y1, x0:x1]
        text = _ocr_strip(crop, ocr_fn, is_mrz=True)
        lines.append(text)
        print(f"   [mrz_r{j+1} y={y0}-{y1} score={scores[idx][2]:.2f}] -> '{text}'")
    return lines


# ===========================================================================
# CLASS CHINH
# ===========================================================================

class ReadInfo:
    def __init__(self, imgsz, stride, device, half, model, names, ocr_predictor):
        self.imgsz=imgsz; self.stride=stride; self.device=device
        self.half=half; self.model=model; self.names=names
        self.opt=opt; self.ocrPredictor=ocr_predictor

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
        x_min = info[0]-int(info[2]/2); y_min = info[1]-int(info[3]/2)
        crop  = img[max(0,y_min):y_min+info[3], max(0,x_min):x_min+info[2]]
        return self.ocrPredictor.predict(
            Image.fromarray(cv2.cvtColor(crop, cv2.COLOR_BGR2RGB)))

    def _ocr_raw(self, crop, is_mrz=False):
        """OCR truc tiep tren numpy array."""
        if crop is None or crop.size == 0:
            return ""
        return self.ocrPredictor.predict(preprocess_line(crop, is_mrz)).strip()

    def _ocr_crop(self, img, y0, y1, x0, x1, is_mrz=False, tag=""):
        crop = img[y0:y1, x0:x1]
        if crop.size == 0:
            return ""
        _dbg(f"crop_{tag}", crop)
        text = self._ocr_raw(crop, is_mrz)
        print(f"   [{tag:14s}] -> '{text}'")
        return text

    # -- MAT TRUOC -- KHONG DOI -----------------------------------------------
    def get_all_info(self, img_path):
        st  = time.time()
        img = cv2.imread(img_path)
        if img is None: return {}
        img        = correct_skew(img)
        page_boxes = get_dictionary.prediction(img, self.imgsz, self.stride,
                                               self.device, self.half, self.model, self.names)
        page_boxes = get_dictionary.dict_processing(page_boxes)
        print("\n--- [YOLO MAT TRUOC] ---")
        fields = ["id","full_name","date_of_birth","sex","nationality",
                  "place_of_origin","place_of_residence","date_of_expiry"]
        result = {}
        for f in fields:
            infos = page_boxes.get(f)
            if infos:
                if len(infos) != 1:
                    infos = self.arrange_info(infos)
                    text  = ''.join(self.ocr_info(img,i)+' ' for i in infos)
                else:
                    text  = self.ocr_info(img, infos[0])
                result[f] = text.strip()
                print(f" [*] {f.upper():<22}: {text.strip()}")
            else:
                result[f] = ''
                print(f" [!] {f.upper():<22}: (Khong tim thay)")
        print(f'[Front] {time.time()-st:.2f}s')
        return result

    # -- MAT SAU --------------------------------------------------------------
    def get_back_info(self, img_path):
        st  = time.time()
        img = cv2.imread(img_path)
        if img is None: return {}

        result = {
            "special_features":"", "issue_date":"", "issued_by":"",
            "mrz_line1":"", "mrz_line2":"", "mrz_line3":"",
            "mrz_id":"", "mrz_dob":"", "mrz_gender":"",
            "mrz_expiry":"", "mrz_name":"",
        }

        # Warp the
        card = warp_card(img)
        H, W = card.shape[:2]

        # Kiem tra huong
        def _mrz_density(strip):
            t = self._ocr_raw(strip, is_mrz=True).upper()
            if not t: return 0.0
            return sum(1 for c in t if c in '<0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ') / max(len(t),1)

        top_d = _mrz_density(card[10:int(H*0.18),  5:W-5])
        bot_d = _mrz_density(card[int(H*0.82):H-5, 5:W-5])
        print(f"[BackOCR] MRZ density top={top_d:.2f} bot={bot_d:.2f}")
        if top_d > bot_d + 0.15:
            card = cv2.rotate(card, cv2.ROTATE_180)
            _dbg("05_card_final_flipped", card)
            print("[BackOCR] Xoay 180")

        # Scan adaptive
        print("\n[BackOCR] --- Scan adaptive ---")
        rows = _scan_rows(card, self._ocr_raw, n_slices=30)
        for y0, y1, t in rows:
            print(f"   [y={y0:3d}-{y1:3d}] '{t}'")

        # Dac diem nhan dang: dong dau tien co chu (truoc ngay cap)
        print("\n[BackOCR] --- Dac diem nhan dang ---")
        date_result = _find_issue_date(rows)
        date_y0 = date_result[0] if date_result else H

        feat_rows = []
        for y0, y1, text in rows:
            if y0 >= date_y0:
                break
            if _is_mrz_text(text):
                continue
            if re.fullmatch(r'[\d\s<./\-]+', text):
                continue
            if len(text) > 3:
                feat_rows.append(text)

        # Loc bo label bilingual
        FEAT_SKIP = ["personal identification", "dac diem", "nhan dang"]
        feat_clean = []
        for t in feat_rows:
            if not any(kw in t.lower() for kw in FEAT_SKIP):
                feat_clean.append(t)

        result["special_features"] = " ".join(feat_clean).strip()
        print(f" [*] SPECIAL_FEATURES : {result['special_features']}")

        # Ngay cap
        print("\n[BackOCR] --- Ngay cap ---")
        date_y1 = 0
        if date_result:
            dy0, date_y1, date_str = date_result
            result["issue_date"] = date_str
            print(f" [*] ISSUE_DATE  : {date_str}  (y={dy0}-{date_y1})")
        else:
            print(" [!] Khong tim thay ngay cap")

        # Noi cap
        print("\n[BackOCR] --- Noi cap ---")
        by_lines = _find_issued_by(rows, date_y1)
        result["issued_by"] = " ".join(t for _,_,t in by_lines).strip()
        for y0, y1, t in by_lines:
            print(f"   [y={y0}-{y1}] '{t}'")
        print(f" [*] ISSUED_BY   : {result['issued_by']}")

        # MRZ
        print("\n[BackOCR] --- MRZ ---")
        mrz_raw = _find_mrz_rows(card, self._ocr_raw)

        def clean_mrz(s):
            s = s.upper().replace(' ','<').replace('|','<')
            s = re.sub(r'[^A-Z0-9<]','<',s)
            return (s+'<'*30)[:30]

        l1 = clean_mrz(mrz_raw[0]) if len(mrz_raw)>0 else ''
        l2 = clean_mrz(mrz_raw[1]) if len(mrz_raw)>1 else ''
        l3 = clean_mrz(mrz_raw[2]) if len(mrz_raw)>2 else ''
        result.update({"mrz_line1":l1,"mrz_line2":l2,"mrz_line3":l3})
        print(f" [*] MRZ_LINE1   : {l1}")
        print(f" [*] MRZ_LINE2   : {l2}")
        print(f" [*] MRZ_LINE3   : {l3}")

        # Parse MRZ
        if l1 and len(l1) >= 14:
            id_raw = l1[5:14].replace('<','')
            if re.match(r'\d{9}', id_raw):
                result["mrz_id"] = id_raw[:9]

        if l2 and len(l2) >= 14:
            dob=l2[0:6]; sex=l2[7] if len(l2)>7 else ''; exp=l2[8:14]
            if re.fullmatch(r'\d{6}', dob):
                yy,mm,dd=dob[0:2],dob[2:4],dob[4:6]
                result["mrz_dob"]=f"{dd}/{mm}/{'19' if int(yy)>=30 else '20'}{yy}"
            result["mrz_gender"]={"M":"Nam","F":"Nu"}.get(sex,"")
            if re.fullmatch(r'\d{6}', exp):
                yy,mm,dd=exp[0:2],exp[2:4],exp[4:6]
                result["mrz_expiry"]=f"{dd}/{mm}/{'19' if int(yy)>=30 else '20'}{yy}"

        if l3:
            name_raw = l3.strip('<')
            if '<<' in name_raw:
                last,first=name_raw.split('<<',1)
                result["mrz_name"]=f"{first.replace('<',' ').strip()} {last.replace('<',' ').strip()}".strip()
            else:
                result["mrz_name"]=name_raw.replace('<',' ').strip()

        print(f"\n [*] MRZ_ID     : {result['mrz_id']}")
        print(f" [*] MRZ_DOB    : {result['mrz_dob']}")
        print(f" [*] MRZ_GENDER : {result['mrz_gender']}")
        print(f" [*] MRZ_EXPIRY : {result['mrz_expiry']}")
        print(f" [*] MRZ_NAME   : {result['mrz_name']}")
        print(f'\n[Back] {time.time()-st:.2f}s\n')
        return result
