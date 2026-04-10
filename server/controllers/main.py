import os
import sys
from pathlib import Path

# ─── 1. CẤU HÌNH ĐƯỜNG DẪN TUYỆT ĐỐI (TRÁNH LẠC ĐƯỜNG) ──────────────────────
# Lấy đường dẫn của thư mục 'controllers' hiện tại
current_dir = os.path.dirname(os.path.abspath(__file__))
# Lấy đường dẫn của thư mục gốc 'server'
root_dir = os.path.dirname(current_dir)

# Đưa các thư mục vào tầm ngắm của Python
sys.path.insert(0, current_dir)
sys.path.insert(0, os.path.join(current_dir, 'DetecInfoBoxes'))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

# ─── 2. BIẾN MÔI TRƯỜNG ───────────────────────────────────────────────────────
os.environ["FLAGS_use_mkldnn"] = "0"
os.environ["FLAGS_use_onednn"] = "0"

import uuid, json, time, logging
import cv2
import numpy as np
from contextlib import asynccontextmanager
from datetime import date
from dotenv import load_dotenv

# ─── 3. IMPORT CHUẨN (KHÔNG CÒN LỖI MODULE) ───────────────────────────────────
from readInfoIdCard import ReadInfo
from DetecInfoBoxes.GetBoxes import Detect
from Vocr.tool.predictor import Predictor
from Vocr.tool.config import Cfg as Cfg_vietocr
from config import opt

# ─── 4. KHỞI TẠO FASTAPI & DATABASE ───────────────────────────────────────────
load_dotenv(dotenv_path=Path(root_dir) / ".env")

from fastapi import FastAPI, UploadFile, File, Form, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from database.database import get_db_connection, init_database
from service.face_service import face_ai_service, face_memory_store, UPLOAD_DIR

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ─── KHỞI TẠO AI: YOLOv7 + VietOCR ────────────────────────────────────────────
logger.info("[Startup] Nạp mô hình VietOCR (VGG-seq2seq)...")
vocr_config_path = os.path.join(current_dir, 'Vocr', 'config', 'vgg-seq2seq.yml')
config_vietocr = Cfg_vietocr.load_config_from_file(vocr_config_path)

config_vietocr['weights'] = os.path.join(current_dir, 'Models', 'seq2seqocr.pth')
config_vietocr['device']  = 'cpu'  # Đổi thành 'cuda:0' nếu máy có Card rời NVIDIA
ocr_predictor = Predictor(config_vietocr)

logger.info("[Startup] Nạp mô hình YOLOv7 (Phát hiện vùng thông tin)...")
get_dictionary = Detect(opt)
scan_weight = os.path.join(current_dir, 'Models', 'cccdYoloV7.pt')
imgsz, stride, device, half, model, names = get_dictionary.load_model(scan_weight)

read_info = ReadInfo(imgsz, stride, device, half, model, names, ocr_predictor)
logger.info("[Startup] Hệ thống YOLO + VietOCR đã sẵn sàng!")


# ─── Startup ──────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("[Startup] Khởi tạo cấu trúc Database (nếu chưa có)...")
    init_database()
    logger.info("[Startup] Nạp embedding vào RAM...")
    _load_embeddings_to_ram()
    logger.info(f"[Startup] {face_memory_store.count} khuôn mặt trên RAM")
    yield
    logger.info("[Shutdown] Bye!")
def _load_embeddings_to_ram():
    conn = None
    cursor = None
    try:
        conn   = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT e.person_id, p.name, p.role, p.img_path,
                   p.work_expiry_date, e.embedding_vector
            FROM face_embeddings e
            JOIN persons p ON e.person_id = p.id
            WHERE p.status = 'active'
        """)
        rows = cursor.fetchall()
        parsed = []
        for row in rows:
            try:
                parsed.append({
                    "person_id":        row["person_id"],
                    "name":             row["name"],
                    "role":             row.get("role", ""),
                    "img_path":         row.get("img_path", ""),
                    "work_expiry_date": str(row["work_expiry_date"]) if row.get("work_expiry_date") else None,
                    "embedding_vector": json.loads(row["embedding_vector"]),
                })
            except Exception as e:
                logger.warning(f"[Startup] Bỏ qua khuôn mặt lỗi: {e}")
                face_memory_store.load_all(parsed)
        
    except Exception as e:
        logger.error(f"[Startup]  Lỗi kết nối DB khi nạp dữ liệu: {e}")
        face_memory_store.load_all([]) 
        
    finally:
        if cursor: cursor.close()
        if conn and conn.is_connected(): conn.close()


# ─── App ──────────────────────────────────────────────────────────────────────
app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


class PersonUpdate(BaseModel):
    name: str
    role: str
    department: str


def save_log_to_db(log_queries: list) -> None:
    if not log_queries:
        return
    try:
        conn   = get_db_connection()
        cursor = conn.cursor()
        cursor.executemany(
            "INSERT INTO recognition_logs (id,person_id,status,confidence,camera,action) VALUES (%s,%s,%s,%s,%s,%s)",
            log_queries,
        )
        conn.commit()
        cursor.close()
        conn.close()
    except Exception as e:
        logger.error(f"[Log] {e}")


@app.post("/api/face/ocr")
async def extract_ocr_local(file: UploadFile = File(...), side: str = Form(...)):
    temp_path = ""
    try:
        temp_filename = f"temp_cccd_{uuid.uuid4().hex}.jpg"
        temp_path = os.path.join(UPLOAD_DIR, temp_filename)
        file_bytes = await file.read()
        with open(temp_path, "wb") as f:
            f.write(file_bytes)

        logger.info(f"[OCR] Phân tích mặt {side} bằng YOLOv7 + VietOCR...")

        if side == "front":
            raw = read_info.get_all_info(temp_path)
            logger.info(f"[OCR] Mặt trước raw: {raw}")
            mapped_data = {
                "id_number":        raw.get("id", ""),
                "full_name":        raw.get("full_name", ""),
                "dob":              raw.get("date_of_birth", ""),
                "gender":           raw.get("sex", ""),
                "nationality":      raw.get("nationality", ""),
                "hometown":         raw.get("place_of_origin", ""),
                "address":          raw.get("place_of_residence", ""),
                "expiry_date":      raw.get("date_of_expiry", ""),
            }

        else:  # back — ĐÃ NÂNG CẤP: dùng get_back_info như mặt trước
            raw = read_info.get_back_info(temp_path)
            logger.info(f"[OCR] Mặt sau raw: {raw}")
            mapped_data = {
                "issue_date":       raw.get("issue_date", ""),
                "issued_by":        raw.get("issued_by", ""),
                "special_features": raw.get("special_features", ""),
            }

        if os.path.exists(temp_path):
            os.remove(temp_path)

        logger.info(f"[OCR] Trả về React: {mapped_data}")
        return {"success": True, "data": mapped_data}

    except Exception as e:
        logger.error(f"[OCR] Lỗi: {e}", exc_info=True)
        if os.path.exists(temp_path):
            os.remove(temp_path)
        return {"success": True, "data": {}}


# ═════════════════════════════════════════════════════════════════════════════
# NHẬN DIỆN KHUÔN MẶT
# ═════════════════════════════════════════════════════════════════════════════
@app.post("/api/face/recognize")
async def recognize(
    background_tasks: BackgroundTasks,
    image: UploadFile = File(...),
):
    t0         = time.time()
    file_bytes = await image.read()
    detections = face_ai_service.extract_faces(file_bytes)

    if not detections:
        return {"success": True, "data": {"detected": False, "faces": []}}

    results, log_queries = [], []
    today = date.today()

    for face in detections:
        bbox  = face["box"]
        match = face_memory_store.find_best_match(np.array(face["descriptor"], dtype=np.float32))

        if match:
            # ── Kiểm tra hết hạn làm việc ────────────────────────────
            expiry_str = match.get("work_expiry_date")
            if expiry_str:
                if date.fromisoformat(expiry_str) < today:
                    logger.info(f"[Recognize]  {match['name']} — HẾT HẠN {expiry_str}")
                    results.append({
                        "id": match["person_id"], "name": match["name"],
                        "role": match["role"], "img": "",
                        "status": "expired", "confidence": 0, "bbox": bbox,
                        "expired": True, "expiry_date": expiry_str,
                    })
                    log_queries.append((str(uuid.uuid4()), match["person_id"], "unknown", 0, "Cổng Chính", "Từ chối"))
                    continue

            confidence = round(max(0.0, (1.0 - match["distance"]) * 100.0), 2)
            img_url    = f"/uploads/{Path(match['img_path']).name}" if match.get("img_path") else ""
            logger.info(f"[Recognize]  {match['name']} dist={match['distance']:.4f} conf={confidence:.1f}%")
            results.append({
                "id": match["person_id"], "name": match["name"],
                "role": match["role"], "img": img_url,
                "status": "success", "confidence": confidence,
                "bbox": bbox, "expiry_date": expiry_str,
            })
            log_queries.append((str(uuid.uuid4()), match["person_id"], "success", confidence, "Cổng Chính", "Vào"))
        else:
            results.append({
                "id": None, "name": "Người Lạ", "role": "", "img": "",
                "status": "unknown", "confidence": 0, "bbox": bbox,
            })
            log_queries.append((str(uuid.uuid4()), None, "unknown", 0, "Cổng Chính", "Từ chối"))

    background_tasks.add_task(save_log_to_db, log_queries)
    return {
        "success": True,
        "data": {
            "detected":    True,
            "faces":       results,
            "processTime": int((time.time() - t0) * 1000),
            "model":       "InsightFace-buffalo_sc-RAM",
            "ramCount":    face_memory_store.count,
        },
    }


# ═════════════════════════════════════════════════════════════════════════════
# ĐĂNG KÝ
# ═════════════════════════════════════════════════════════════════════════════
@app.post("/api/face/register")
async def register(
    name:             str = Form(...),
    role:             str = Form(""),
    department:       str = Form(""),
    work_expiry_date: str = Form(""),    # YYYY-MM-DD hoặc ""
    cccd_info:        str = Form("{}"),  # JSON string từ StepCCCD
    images:      list[UploadFile] = File(...),
    cccd_front:  UploadFile = File(None),
    cccd_back:   UploadFile = File(None),
):
    conn      = get_db_connection()
    cursor    = conn.cursor()
    person_id = str(uuid.uuid4())
    new_encodings: list[tuple] = []
    avatar_path = ""

    try:
        cccd       = json.loads(cccd_info) if cccd_info else {}
        expiry_val = work_expiry_date or None

        # ── 1. Lưu ảnh khuôn mặt + tạo embedding ────────────────────────
        for i, img_file in enumerate(images):
            img_bytes  = await img_file.read()
            saved_path = face_ai_service.save_image(img_bytes, person_id, index=i)
            if i == 0:
                avatar_path = saved_path

            detections = face_ai_service.extract_faces(img_bytes)
            if len(detections) == 0:
                raise Exception(f"Không tìm thấy khuôn mặt trong ảnh thứ {i + 1}.")
            if len(detections) > 1:
                raise Exception(f"Ảnh thứ {i + 1} có nhiều hơn 1 khuôn mặt.")

            descriptor = detections[0]["descriptor"]
            emb_id     = str(uuid.uuid4())

            if i == 0:
                cursor.execute(
                    """INSERT INTO persons
                         (id, name, role, department, status, img_path, work_expiry_date)
                       VALUES (%s, %s, %s, %s, 'active', %s, %s)""",
                    (person_id, name, role, department, avatar_path, expiry_val),
                )

            cursor.execute(
                "INSERT INTO face_embeddings (id, person_id, embedding_vector) VALUES (%s, %s, %s)",
                (emb_id, person_id, json.dumps(descriptor)),
            )
            new_encodings.append((person_id, name, role, avatar_path, expiry_val, descriptor))

        # ── 2. Lưu ảnh CCCD + ghi bảng citizen_ids ──────────────────────
        front_path, back_path = "", ""

        if cccd_front:
            fb = await cccd_front.read()
            if fb:
                front_path = face_ai_service.save_image(fb, f"cccd_front_{person_id}", index=0)

        if cccd_back:
            bb = await cccd_back.read()
            if bb:
                back_path = face_ai_service.save_image(bb, f"cccd_back_{person_id}", index=0)

        cursor.execute("""
            INSERT INTO citizen_ids
              (id, person_id, front_img_path, back_img_path,
               id_number, full_name, dob, gender, nationality,
               hometown, address, expiry_date, issue_date, special_features)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        """, (
            str(uuid.uuid4()), person_id,
            front_path or None, back_path or None,
            cccd.get("id_number"),          cccd.get("full_name"),
            cccd.get("dob"),                cccd.get("gender"),
            cccd.get("nationality", "Việt Nam"),
            cccd.get("hometown"),           cccd.get("address"),
            cccd.get("expiry_date"),        cccd.get("issue_date"),
            cccd.get("special_features"),
        ))

        conn.commit()

        # ── 3. Cập nhật RAM ngay ─────────────────────────────────────────
        for pid, pname, prole, pimg, pexpiry, enc in new_encodings:
            face_memory_store.add(pid, pname, prole, pimg, enc, work_expiry_date=pexpiry)

        logger.info(f"[Register]  {name} | {len(new_encodings)} mẫu | RAM: {face_memory_store.count}")
        return {
            "success":  True,
            "message":  f"Đã đăng ký {name} với {len(new_encodings)} mẫu.",
            "img_url":  f"/uploads/{Path(avatar_path).name}" if avatar_path else "",
            "ramCount": face_memory_store.count,
        }

    except Exception as e:
        conn.rollback()
        logger.error(f"[Register]  {e}")
        for i in range(len(images)):
            p = Path(UPLOAD_DIR) / f"{person_id}_{i}.jpg"
            if p.exists():
                p.unlink()
        return JSONResponse(status_code=400, content={"success": False, "error": str(e)})
    finally:
        cursor.close()
        conn.close()


# ═════════════════════════════════════════════════════════════════════════════
# DANH SÁCH NGƯỜI DÙNG
# ═════════════════════════════════════════════════════════════════════════════
@app.get("/api/face/persons")
async def get_persons():
    conn   = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT p.id, p.name, p.role, p.department, p.status,
                   p.img_path, p.work_expiry_date,
                   p.registered_at AS registered,
                   (SELECT COUNT(*) FROM face_embeddings e WHERE e.person_id = p.id) AS embeddings,
                   (SELECT COUNT(*) FROM recognition_logs l WHERE l.person_id = p.id AND l.status = 'success') AS recognitions,
                   c.id_number, c.full_name AS cccd_name, c.dob, c.gender, c.nationality,
                   c.hometown, c.address, c.expiry_date AS cccd_expiry,
                   c.front_img_path, c.back_img_path
            FROM persons p
            LEFT JOIN citizen_ids c ON c.person_id = p.id
            ORDER BY p.registered_at DESC
        """)
        rows  = cursor.fetchall()
        today = str(date.today())
        for row in rows:
            raw = row.get("img_path") or ""
            row["img"]        = f"/uploads/{Path(raw).name}" if raw else ""
            exp               = row.get("work_expiry_date")
            row["is_expired"] = bool(exp and str(exp) < today)
        return {"success": True, "data": rows, "total": len(rows), "ramCount": face_memory_store.count}
    finally:
        cursor.close()
        conn.close()


# ═════════════════════════════════════════════════════════════════════════════
# CẬP NHẬT & XÓA & LOGS & THỐNG KÊ (Giữ nguyên)
# ═════════════════════════════════════════════════════════════════════════════
@app.put("/api/face/persons/{id}")
async def update_person(id: str, person_data: PersonUpdate):
    conn   = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "UPDATE persons SET name=%s, role=%s, department=%s WHERE id=%s",
            (person_data.name, person_data.role, person_data.department, id),
        )
        conn.commit()
        if cursor.rowcount == 0:
            return JSONResponse(status_code=404, content={"success": False, "error": "Không tìm thấy"})
        face_memory_store.update_info(id, person_data.name, person_data.role)
        return {"success": True, "message": "Cập nhật thành công"}
    finally:
        cursor.close()
        conn.close()

@app.delete("/api/face/persons/{id}")
async def delete_person(id: str):
    conn   = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT img_path FROM persons WHERE id=%s", (id,))
        row   = cursor.fetchone()
        cur2  = conn.cursor()
        cur2.execute("DELETE FROM persons WHERE id=%s", (id,))
        conn.commit()
        if cur2.rowcount == 0:
            return JSONResponse(status_code=404, content={"success": False, "error": "Không tìm thấy"})
        if row and row.get("img_path"):
            p = Path(row["img_path"])
            if p.exists():
                p.unlink()
        removed = face_memory_store.remove_by_person(id)
        return {"success": True, "message": "Đã xóa", "removedFromRam": removed}
    finally:
        cursor.close()
        conn.close()

@app.get("/api/face/logs")
async def get_logs():
    conn   = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT l.id, COALESCE(p.name, 'Người lạ') AS name,
                   DATE_FORMAT(l.created_at, '%H:%i:%s') AS time,
                   DATE_FORMAT(l.created_at, '%d/%m/%Y') AS date,
                   l.status, l.confidence, l.camera, l.action,
                   p.img_path AS img_raw
            FROM recognition_logs l
            LEFT JOIN persons p ON l.person_id = p.id
            ORDER BY l.created_at DESC LIMIT 100
        """)
        rows = cursor.fetchall()
        for row in rows:
            raw = row.pop("img_raw", "") or ""
            row["img"] = f"/uploads/{Path(raw).name}" if raw else ""
        return {"success": True, "data": rows, "total": len(rows)}
    finally:
        cursor.close()
        conn.close()

@app.get("/api/face/statistics")
async def get_statistics():
    conn   = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT status, created_at FROM recognition_logs ORDER BY created_at DESC LIMIT 1000")
        all_logs = cursor.fetchall()
        hourly = {f"{i:02d}:00": {"nhận_diện": 0, "từ_chối": 0, "lạ": 0} for i in range(24)}
        days   = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"]
        weekly = {d: 0 for d in days}
        for log in all_logs:
            h = f"{log['created_at'].hour:02d}:00"
            d = days[log["created_at"].weekday()]
            if log["status"] == "success":
                hourly[h]["nhận_diện"] += 1
                weekly[d] += 1
            elif log["status"] == "unknown":
                hourly[h]["lạ"] += 1
        return {
            "success": True,
            "data": {
                "hourlyData": [{"time": t, **v} for t, v in hourly.items()],
                "weeklyData": [{"day": d, "value": v} for d, v in weekly.items()],
            },
        }
    finally:
        cursor.close()
        conn.close()

@app.get("/api/face/memory-status")
async def memory_status():
    return {
        "success":  True,
        "loaded":   face_memory_store.is_loaded,
        "ramCount": face_memory_store.count,
    }

@app.post("/api/face/reload-memory")
async def reload_memory():
    _load_embeddings_to_ram()
    return {"success": True, "ramCount": face_memory_store.count}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3001)