# import os
# import sys
# import threading # <-- Đã thêm thư viện threading
# from pathlib import Path

# # ─── 1. CẤU HÌNH ĐƯỜNG DẪN TUYỆT ĐỐI (TRÁNH LẠC ĐƯỜNG) ──────────────────────
# # Lấy đường dẫn của thư mục 'controllers' hiện tại
# current_dir = os.path.dirname(os.path.abspath(__file__))
# # Lấy đường dẫn của thư mục gốc 'server'
# root_dir = os.path.dirname(current_dir)

# # Đưa các thư mục vào tầm ngắm của Python
# sys.path.insert(0, current_dir)
# sys.path.insert(0, os.path.join(current_dir, 'DetecInfoBoxes'))
# if root_dir not in sys.path:
#     sys.path.insert(0, root_dir)

# # ─── 2. BIẾN MÔI TRƯỜNG ───────────────────────────────────────────────────────
# os.environ["FLAGS_use_mkldnn"] = "0"
# os.environ["FLAGS_use_onednn"] = "0"

# import uuid, json, time, logging
# import cv2
# import numpy as np
# from contextlib import asynccontextmanager
# from datetime import date
# from dotenv import load_dotenv

# # ─── 3. IMPORT CHUẨN (KHÔNG CÒN LỖI MODULE) ───────────────────────────────────
# from readInfoIdCard import ReadInfo,ReadBackInfo  
# from DetecInfoBoxes.GetBoxes import Detect
# from Vocr.tool.predictor import Predictor
# from Vocr.tool.config import Cfg as Cfg_vietocr
# from config import opt

# # ─── 4. KHỞI TẠO FASTAPI & DATABASE ───────────────────────────────────────────
# load_dotenv(dotenv_path=Path(root_dir) / ".env")

# from fastapi import FastAPI, UploadFile, File, Form, BackgroundTasks
# from fastapi.middleware.cors import CORSMiddleware
# from fastapi.responses import JSONResponse
# from fastapi.staticfiles import StaticFiles
# from pydantic import BaseModel

# from database.database import get_db_connection, init_database
# from service.face_service import face_ai_service, face_memory_store, UPLOAD_DIR

# logging.basicConfig(level=logging.INFO)
# logger = logging.getLogger(__name__)


# # ─── KHỞI TẠO AI CHẠY NGẦM ───────────────────────────────────────────────────
# ocr_predictor = None
# read_info = None
# read_back = None 
# is_ai_ready = False
#        # ← THÊM DÒNG NÀY

# def load_ai_background():
#     global ocr_predictor, read_info, read_back, is_ai_ready 
#     try:
#         logger.info("[AI_LOADER] Bắt đầu nạp mô hình AI chạy ngầm (Chống sập Render)...")
        
#         # Nạp VietOCR
#         vocr_config_path = os.path.join(current_dir, 'Vocr', 'config', 'vgg-seq2seq.yml')
#         config_vietocr = Cfg_vietocr.load_config_from_file(vocr_config_path)
#         config_vietocr['weights'] = os.path.join(current_dir, 'Models', 'seq2seqocr.pth')
#         config_vietocr['device']  = 'cpu'
#         ocr_predictor = Predictor(config_vietocr)

#         # Nạp YOLOv7
#         get_dictionary = Detect(opt)
#         scan_weight = os.path.join(current_dir, 'Models', 'cccdYoloV7.pt')
#         imgsz, stride, device, half, model, names = get_dictionary.load_model(scan_weight)
        
#         read_info = ReadInfo(imgsz, stride, device, half, model, names, ocr_predictor)
#         read_back = ReadBackInfo(ocr_predictor)
        
#         is_ai_ready = True
#         logger.info("[AI_LOADER] HOÀN TẤT! Hệ thống YOLO + VietOCR đã sẵn sàng nhận diện.")
#     except Exception as e:
#         logger.error(f"[AI_LOADER] Lỗi khi nạp AI: {e}")


# # ─── Startup (Vượt qua vòng kiểm duyệt của Render) ────────────────────────────
# @asynccontextmanager
# async def lifespan(app: FastAPI):
#     logger.info("[Startup] Khởi tạo cấu trúc Database (nếu chưa có)...")
#     init_database()
    
#     logger.info("[Startup] Nạp embedding vào RAM...")
#     _load_embeddings_to_ram()
#     logger.info(f"[Startup] {face_memory_store.count} khuôn mặt trên RAM")

#     # BẬT LUỒNG CHẠY NGẦM: Server mở cổng ngay lập tức, AI từ từ nạp
#     threading.Thread(target=load_ai_background, daemon=True).start()
    
#     yield
#     logger.info("[Shutdown] Bye!")

# def _load_embeddings_to_ram():
#     conn = None
#     cursor = None
#     try:
#         conn   = get_db_connection()
#         cursor = conn.cursor(dictionary=True)
#         cursor.execute("""
#             SELECT e.person_id, p.name, p.role, p.img_path,
#                    p.work_expiry_date, e.embedding_vector
#             FROM face_embeddings e
#             JOIN persons p ON e.person_id = p.id
#             WHERE p.status = 'active'
#         """)
#         rows = cursor.fetchall()
#         parsed = []
#         for row in rows:
#             try:
#                 parsed.append({
#                     "person_id":        row["person_id"],
#                     "name":             row["name"],
#                     "role":             row.get("role", ""),
#                     "img_path":         row.get("img_path", ""),
#                     "work_expiry_date": str(row["work_expiry_date"]) if row.get("work_expiry_date") else None,
#                     "embedding_vector": json.loads(row["embedding_vector"]),
#                 })
#             except Exception as e:
#                 logger.warning(f"[Startup] Bỏ qua khuôn mặt lỗi: {e}")
                
#         face_memory_store.load_all(parsed)
        
#     except Exception as e:
#         logger.error(f"[Startup] Lỗi kết nối DB khi nạp dữ liệu: {e}")
#         face_memory_store.load_all([]) 
        
#     finally:
#         if cursor: cursor.close()
#         if conn and conn.is_connected(): conn.close()


# # ─── App ──────────────────────────────────────────────────────────────────────
# app = FastAPI(lifespan=lifespan)

# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# class PersonUpdate(BaseModel):
#     name: str
#     role: str
#     department: str

# def save_log_to_db(log_queries: list) -> None:
#     if not log_queries:
#         return
#     try:
#         conn   = get_db_connection()
#         cursor = conn.cursor()
#         cursor.executemany(
#             "INSERT INTO recognition_logs (id,person_id,status,confidence,camera,action) VALUES (%s,%s,%s,%s,%s,%s)",
#             log_queries,
#         )
#         conn.commit()
#         cursor.close()
#         conn.close()
#     except Exception as e:
#         logger.error(f"[Log] {e}")


# @app.post("/api/face/ocr")
# async def extract_ocr_local(file: UploadFile = File(...), side: str = Form(...)):
#     # BẢO VỆ: Chặn request nếu AI chưa nạp xong
#     if not is_ai_ready:
#         return {"success": False, "message": "Hệ thống AI đang khởi động, vui lòng thử lại sau 1-2 phút!"}

#     temp_path = ""
#     try:
#         temp_filename = f"temp_cccd_{uuid.uuid4().hex}.jpg"
#         temp_path = os.path.join(UPLOAD_DIR, temp_filename)
#         file_bytes = await file.read()
#         with open(temp_path, "wb") as f:
#             f.write(file_bytes)

#         logger.info(f"[OCR] Phân tích mặt {side} bằng YOLOv7 + VietOCR...")

#         if side == "front":
#             raw = read_info.get_all_info(temp_path)
#             logger.info(f"[OCR] Mặt trước raw: {raw}")
#             mapped_data = {
#                 "id_number":        raw.get("id", ""),
#                 "full_name":        raw.get("full_name", ""),
#                 "dob":              raw.get("date_of_birth", ""),
#                 "gender":           raw.get("sex", ""),
#                 "nationality":      raw.get("nationality", ""),
#                 "hometown":         raw.get("place_of_origin", ""),
#                 "address":          raw.get("place_of_residence", ""),
#                 "expiry_date":      raw.get("date_of_expiry", ""),
#             }

#         else:  # back
#             raw = read_back.get_back_info(temp_path)
#             logger.info(f"[OCR] Mặt sau raw: {raw}")
#             mapped_data = {
#                 "issue_date":       raw.get("issue_date", ""),
#                 "issued_by":        raw.get("issued_by", ""),
#                 "special_features": raw.get("special_features", ""),
#             }

#         if os.path.exists(temp_path):
#             os.remove(temp_path)

#         logger.info(f"[OCR] Trả về React: {mapped_data}")
#         return {"success": True, "data": mapped_data}

#     except Exception as e:
#         logger.error(f"[OCR] Lỗi: {e}", exc_info=True)
#         if os.path.exists(temp_path):
#             os.remove(temp_path)
#         return {"success": False, "message": str(e), "data": {}}


# # ═════════════════════════════════════════════════════════════════════════════
# # NHẬN DIỆN KHUÔN MẶT
# # ═════════════════════════════════════════════════════════════════════════════
# @app.post("/api/face/recognize")
# async def recognize(
#     background_tasks: BackgroundTasks,
#     image: UploadFile = File(...),
# ):
#     t0         = time.time()
#     file_bytes = await image.read()
#     detections = face_ai_service.extract_faces(file_bytes)

#     if not detections:
#         return {"success": True, "data": {"detected": False, "faces": []}}

#     results, log_queries = [], []
#     today = date.today()

#     for face in detections:
#         bbox  = face["box"]
#         match = face_memory_store.find_best_match(np.array(face["descriptor"], dtype=np.float32))

#         if match:
#             # ── Kiểm tra hết hạn làm việc ────────────────────────────
#             expiry_str = match.get("work_expiry_date")
#             if expiry_str:
#                 if date.fromisoformat(expiry_str) < today:
#                     logger.info(f"[Recognize]  {match['name']} — HẾT HẠN {expiry_str}")
#                     results.append({
#                         "id": match["person_id"], "name": match["name"],
#                         "role": match["role"], "img": "",
#                         "status": "expired", "confidence": 0, "bbox": bbox,
#                         "expired": True, "expiry_date": expiry_str,
#                     })
#                     log_queries.append((str(uuid.uuid4()), match["person_id"], "unknown", 0, "Cổng Chính", "Từ chối"))
#                     continue

#             confidence = round(max(0.0, (1.0 - match["distance"]) * 100.0), 2)
#             img_url    = f"/uploads/{Path(match['img_path']).name}" if match.get("img_path") else ""
#             logger.info(f"[Recognize]  {match['name']} dist={match['distance']:.4f} conf={confidence:.1f}%")
#             results.append({
#                 "id": match["person_id"], "name": match["name"],
#                 "role": match["role"], "img": img_url,
#                 "status": "success", "confidence": confidence,
#                 "bbox": bbox, "expiry_date": expiry_str,
#             })
#             log_queries.append((str(uuid.uuid4()), match["person_id"], "success", confidence, "Cổng Chính", "Vào"))
#         else:
#             results.append({
#                 "id": None, "name": "Người Lạ", "role": "", "img": "",
#                 "status": "unknown", "confidence": 0, "bbox": bbox,
#             })
#             log_queries.append((str(uuid.uuid4()), None, "unknown", 0, "Cổng Chính", "Từ chối"))

#     background_tasks.add_task(save_log_to_db, log_queries)
#     return {
#         "success": True,
#         "data": {
#             "detected":    True,
#             "faces":       results,
#             "processTime": int((time.time() - t0) * 1000),
#             "model":       "InsightFace-buffalo_sc-RAM",
#             "ramCount":    face_memory_store.count,
#         },
#     }

# # ═════════════════════════════════════════════════════════════════════════════
# # ĐĂNG KÝ
# # ═════════════════════════════════════════════════════════════════════════════
# @app.post("/api/face/register")
# async def register(
#     name:             str = Form(...),
#     role:             str = Form(""),
#     department:       str = Form(""),
#     work_expiry_date: str = Form(""),    # YYYY-MM-DD hoặc ""
#     cccd_info:        str = Form("{}"),  # JSON string từ StepCCCD
#     images:      list[UploadFile] = File(...),
#     cccd_front:  UploadFile = File(None),
#     cccd_back:   UploadFile = File(None),
# ):
#     conn      = get_db_connection()
#     cursor    = conn.cursor()
#     person_id = str(uuid.uuid4())
#     new_encodings: list[tuple] = []
#     avatar_path = ""
#     saved_files = [] # Lưu danh sách file đã tạo để xóa nếu có lỗi
#     COSINE_THRESHOLD = 0.5 # Bổ sung biến ngưỡng vì thấy bạn nhắc tới trong code

#     try:
#         cccd       = json.loads(cccd_info) if cccd_info else {}
#         expiry_val = work_expiry_date or None
#         cccd_number = cccd.get("id_number")

#         # ── 1. CHECK TRÙNG CCCD ─────────────────────────────────────────────
#         if cccd_number:
#             cursor.execute("SELECT id FROM citizen_ids WHERE id_number = %s", (cccd_number,))
#             if cursor.fetchone():
#                 raise Exception("Số CCCD này đã được đăng ký trong hệ thống!")

#         # ── 2. XỬ LÝ ẢNH KHUÔN MẶT WEBCAM/UPLOAD ────────────────────────────
#         user_descriptor = None
#         for i, img_file in enumerate(images):
#             img_bytes  = await img_file.read()
#             detections = face_ai_service.extract_faces(img_bytes)
            
#             if len(detections) == 0:
#                 raise Exception(f"Không tìm thấy khuôn mặt trong ảnh mẫu thứ {i + 1}.")
#             if len(detections) > 1:
#                 raise Exception(f"Ảnh mẫu thứ {i + 1} có nhiều hơn 1 khuôn mặt.")

#             descriptor = detections[0]["descriptor"]
#             emb_id     = str(uuid.uuid4())
            
#             if i == 0:
#                 user_descriptor = descriptor # Lưu ảnh đầu tiên để so sánh với CCCD

#             # Lưu file cứng
#             saved_path = face_ai_service.save_image(img_bytes, person_id, index=i)
#             saved_files.append(saved_path)
            
#             if i == 0:
#                 avatar_path = saved_path
#                 cursor.execute(
#                     """INSERT INTO persons 
#                           (id, name, role, department, status, img_path, work_expiry_date)
#                         VALUES (%s, %s, %s, %s, 'active', %s, %s)""",
#                     (person_id, name, role, department, avatar_path, expiry_val),
#                 )

#             cursor.execute(
#                 "INSERT INTO face_embeddings (id, person_id, embedding_vector) VALUES (%s, %s, %s)",
#                 (emb_id, person_id, json.dumps(descriptor)),
#             )
#             new_encodings.append((person_id, name, role, avatar_path, expiry_val, descriptor))

#         # ── 3. XỬ LÝ CCCD VÀ SO SÁNH KHUÔN MẶT ──────────────────────────────
#         front_path, back_path = "", ""

#         if cccd_front:
#             fb_bytes = await cccd_front.read()
#             if fb_bytes:
#                 # Trích xuất khuôn mặt từ ảnh mặt trước CCCD
#                 cccd_detections = face_ai_service.extract_faces(fb_bytes)
#                 if len(cccd_detections) == 0:
#                     raise Exception("Không tìm thấy khuôn mặt trên ảnh mặt trước CCCD.")
                
#                 cccd_descriptor = cccd_detections[0]["descriptor"]

#                 # So sánh độ tương đồng (Cosine Similarity)
#                 q = face_memory_store._norm(np.array(user_descriptor, dtype=np.float32))
#                 c = face_memory_store._norm(np.array(cccd_descriptor, dtype=np.float32))
#                 score = float(np.dot(q, c))

#                 # Nếu nhỏ hơn ngưỡng -> Không phải cùng một người
#                 if score < COSINE_THRESHOLD:
#                     logger.warning(f"Cảnh báo giả mạo: Score {score} < {COSINE_THRESHOLD}")
#                     raise Exception("Cảnh báo: Khuôn mặt trên thẻ CCCD KHÔNG KHỚP với ảnh chụp trực tiếp!")

#                 front_path = face_ai_service.save_image(fb_bytes, f"cccd_front_{person_id}", index=0)
#                 saved_files.append(front_path)

#         if cccd_back:
#             bb_bytes = await cccd_back.read()
#             if bb_bytes:
#                 back_path = face_ai_service.save_image(bb_bytes, f"cccd_back_{person_id}", index=0)
#                 saved_files.append(back_path)

#         cursor.execute("""
#             INSERT INTO citizen_ids
#               (id, person_id, front_img_path, back_img_path, 
#                id_number, full_name, dob, gender, nationality, 
#                hometown, address, expiry_date, issue_date, special_features)
#             VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
#         """, (
#             str(uuid.uuid4()), person_id,
#             front_path or None, back_path or None,
#             cccd.get("id_number"),          cccd.get("full_name"),
#             cccd.get("dob"),                cccd.get("gender"),
#             cccd.get("nationality", "Việt Nam"),
#             cccd.get("hometown"),           cccd.get("address"),
#             cccd.get("expiry_date"),        cccd.get("issue_date"),
#             cccd.get("special_features"),
#         ))

#         conn.commit()

#         # ── 4. CẬP NHẬT RAM NGAY LẬP TỨC ─────────────────────────────────
#         for pid, pname, prole, pimg, pexpiry, enc in new_encodings:
#             face_memory_store.add(pid, pname, prole, pimg, enc, work_expiry_date=pexpiry)

#         logger.info(f"[Register]  {name} | {len(new_encodings)} mẫu | RAM: {face_memory_store.count}")
#         return {
#             "success":  True,
#             "message":  f"Đã đăng ký {name} với {len(new_encodings)} mẫu.",
#             "img_url":  f"/uploads/{Path(avatar_path).name}" if avatar_path else "",
#             "ramCount": face_memory_store.count,
#         }

#     except Exception as e:
#         conn.rollback()
#         logger.error(f"[Register Lỗi]  {e}")
#         # Rollback: Xóa các file ảnh vừa tạo nếu có lỗi xảy ra
#         for path in saved_files:
#             p = Path(path)
#             if p.exists():
#                 p.unlink()
#         return JSONResponse(status_code=400, content={"success": False, "error": str(e)})
#     finally:
#         cursor.close()
#         conn.close()

# # ═════════════════════════════════════════════════════════════════════════════
# # DANH SÁCH NGƯỜI DÙNG
# # ═════════════════════════════════════════════════════════════════════════════
# @app.get("/api/face/persons")
# async def get_persons():
#     conn   = get_db_connection()
#     cursor = conn.cursor(dictionary=True)
#     try:
#         cursor.execute("""
#             SELECT p.id, p.name, p.role, p.department, p.status,
#                    p.img_path, p.work_expiry_date,
#                    p.registered_at AS registered,
#                    (SELECT COUNT(*) FROM face_embeddings e WHERE e.person_id = p.id) AS embeddings,
#                    (SELECT COUNT(*) FROM recognition_logs l WHERE l.person_id = p.id AND l.status = 'success') AS recognitions,
#                    c.id_number, c.full_name AS cccd_name, c.dob, c.gender, c.nationality,
#                    c.hometown, c.address, c.expiry_date AS cccd_expiry,
#                    c.front_img_path, c.back_img_path
#             FROM persons p
#             LEFT JOIN citizen_ids c ON c.person_id = p.id
#             ORDER BY p.registered_at DESC
#         """)
#         rows  = cursor.fetchall()
#         today = str(date.today())
#         for row in rows:
#             raw = row.get("img_path") or ""
#             row["img"]        = f"/uploads/{Path(raw).name}" if raw else ""
#             exp               = row.get("work_expiry_date")
#             row["is_expired"] = bool(exp and str(exp) < today)
#         return {"success": True, "data": rows, "total": len(rows), "ramCount": face_memory_store.count}
#     finally:
#         cursor.close()
#         conn.close()


# # ═════════════════════════════════════════════════════════════════════════════
# # CẬP NHẬT & XÓA & LOGS & THỐNG KÊ
# # ═════════════════════════════════════════════════════════════════════════════
# @app.put("/api/face/persons/{id}")
# async def update_person(id: str, person_data: PersonUpdate):
#     conn   = get_db_connection()
#     cursor = conn.cursor()
#     try:
#         cursor.execute(
#             "UPDATE persons SET name=%s, role=%s, department=%s WHERE id=%s",
#             (person_data.name, person_data.role, person_data.department, id),
#         )
#         conn.commit()
#         if cursor.rowcount == 0:
#             return JSONResponse(status_code=404, content={"success": False, "error": "Không tìm thấy"})
#         face_memory_store.update_info(id, person_data.name, person_data.role)
#         return {"success": True, "message": "Cập nhật thành công"}
#     finally:
#         cursor.close()
#         conn.close()

# @app.delete("/api/face/persons/{id}")
# async def delete_person(id: str):
#     conn   = get_db_connection()
#     cursor = conn.cursor(dictionary=True)
#     try:
#         cursor.execute("SELECT img_path FROM persons WHERE id=%s", (id,))
#         row   = cursor.fetchone()
#         cur2  = conn.cursor()
#         cur2.execute("DELETE FROM persons WHERE id=%s", (id,))
#         conn.commit()
#         if cur2.rowcount == 0:
#             return JSONResponse(status_code=404, content={"success": False, "error": "Không tìm thấy"})
#         if row and row.get("img_path"):
#             p = Path(row["img_path"])
#             if p.exists():
#                 p.unlink()
#         removed = face_memory_store.remove_by_person(id)
#         return {"success": True, "message": "Đã xóa", "removedFromRam": removed}
#     finally:
#         cursor.close()
#         conn.close()

# @app.get("/api/face/logs")
# async def get_logs():
#     conn   = get_db_connection()
#     cursor = conn.cursor(dictionary=True)
#     try:
#         cursor.execute("""
#             SELECT l.id, COALESCE(p.name, 'Người lạ') AS name,
#                    DATE_FORMAT(l.created_at, '%H:%i:%s') AS time,
#                    DATE_FORMAT(l.created_at, '%d/%m/%Y') AS date,
#                    l.status, l.confidence, l.camera, l.action,
#                    p.img_path AS img_raw
#             FROM recognition_logs l
#             LEFT JOIN persons p ON l.person_id = p.id
#             ORDER BY l.created_at DESC LIMIT 100
#         """)
#         rows = cursor.fetchall()
#         for row in rows:
#             raw = row.pop("img_raw", "") or ""
#             row["img"] = f"/uploads/{Path(raw).name}" if raw else ""
#         return {"success": True, "data": rows, "total": len(rows)}
#     finally:
#         cursor.close()
#         conn.close()

# @app.get("/api/face/statistics")
# async def get_statistics():
#     conn   = get_db_connection()
#     cursor = conn.cursor(dictionary=True)
#     try:
#         cursor.execute("SELECT status, created_at FROM recognition_logs ORDER BY created_at DESC LIMIT 1000")
#         all_logs = cursor.fetchall()
#         hourly = {f"{i:02d}:00": {"nhận_diện": 0, "từ_chối": 0, "lạ": 0} for i in range(24)}
#         days   = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"]
#         weekly = {d: 0 for d in days}
#         for log in all_logs:
#             h = f"{log['created_at'].hour:02d}:00"
#             d = days[log["created_at"].weekday()]
#             if log["status"] == "success":
#                 hourly[h]["nhận_diện"] += 1
#                 weekly[d] += 1
#             elif log["status"] == "unknown":
#                 hourly[h]["lạ"] += 1
#         return {
#             "success": True,
#             "data": {
#                 "hourlyData": [{"time": t, **v} for t, v in hourly.items()],
#                 "weeklyData": [{"day": d, "value": v} for d, v in weekly.items()],
#             },
#         }
#     finally:
#         cursor.close()
#         conn.close()

# @app.get("/api/face/memory-status")
# async def memory_status():
#     return {
#         "success":  True,
#         "loaded":   face_memory_store.is_loaded,
#         "ramCount": face_memory_store.count,
#     }

# @app.post("/api/face/reload-memory")
# async def reload_memory():
#     _load_embeddings_to_ram()
#     return {"success": True, "ramCount": face_memory_store.count}

# if __name__ == "__main__":
#     import uvicorn
#     uvicorn.run(app, host="0.0.0.0", port=3001)

import os
import sys
import threading
from pathlib import Path

# ─── 1. CẤU HÌNH ĐƯỜNG DẪN TUYỆT ĐỐI ──────────────────────────────────────
current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(current_dir)

sys.path.insert(0, current_dir)
sys.path.insert(0, os.path.join(current_dir, 'DetecInfoBoxes'))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

# ─── 2. BIẾN MÔI TRƯỜNG ───────────────────────────────────────────────────────
os.environ["FLAGS_use_mkldnn"] = "0"
os.environ["FLAGS_use_onednn"] = "0"

import uuid, json, time, logging, cv2, numpy as np, re
from PIL import Image
from contextlib import asynccontextmanager
from datetime import date
from dotenv import load_dotenv

# ─── 3. IMPORT ───────────────────────────────────────────────────────────────
from readInfoIdCard import ReadInfo
from util import correct_skew
from DetecInfoBoxes.GetBoxes import Detect
from Vocr.tool.predictor import Predictor
from Vocr.tool.config import Cfg as Cfg_vietocr
from config import opt

# ─── 4. FASTAPI & DATABASE ───────────────────────────────────────────────────
load_dotenv(dotenv_path=Path(root_dir) / ".env")

from fastapi import FastAPI, UploadFile, File, Form, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from database.database import get_db_connection, init_database
from service.face_service import face_ai_service, face_memory_store, UPLOAD_DIR

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════════════════
# 🆕 CLASS MỚI: CCCDBackSimpleExtractor (Template Matching + Fixed Coords)
# ═══════════════════════════════════════════════════════════════════════════

class CCCDBackSimpleExtractor:
    """
    Trích xuất thông tin mặt sau CCCD bằng cách:
    1. Căn chỉnh ảnh thực theo ảnh mẫu (Feature Matching + Homography)
    2. Crop theo tọa độ cố định trên ảnh mẫu
    3. OCR từng vùng bằng VietOCR
    """
    
    def __init__(self, template_path, ocr_predictor):
        self.ocr = ocr_predictor
        self.template = None
        self.regions = {}
        self._load_template(template_path)
        
    def _load_template(self, template_path):
        """Load và chuẩn hóa ảnh mẫu"""
        self.template = cv2.imread(template_path)
        if self.template is None:
            raise ValueError(f"Không tìm thấy ảnh mẫu: {template_path}")
            
        # Resize template về kích thước chuẩn để dễ tính toán tọa độ
        target_w = 800
        h, w = self.template.shape[:2]
        scale = target_w / w
        target_h = int(h * scale)
        self.template = cv2.resize(self.template, (target_w, target_h))
        
        # 📍 ĐỊNH NGHĨA TỌA ĐỘ CÁC VÙNG (x1, y1, x2, y2) theo pixel
        # ⚠️ BẠN CẦN ĐIỀU CHỈNH CÁC GIÁ TRỊ NÀY CHO KHỚP VỚI ẢNH MẪU CỦA BẠN
        # Dùng script print_template_coords() ở dưới để lấy chính xác
        self.regions = {
            "special_features": (40, 25, 550, 85),
            "issue_date":       (40, 95, 450, 135),
            "issued_by":        (40, 145, 650, 230),
            "holder_name":      (40, 310, 750, 355),
            "mrz_line1":        (30, 385, 770, 430),
            "mrz_line2":        (30, 435, 770, 480),
            "mrz_line3":        (30, 485, 770, 530),
        }
        
        logger.info(f"[BackSimple] Đã load template {self.template.shape[1]}x{self.template.shape[0]}")

    def _align_image(self, img):
        """Căn chỉnh ảnh thực theo ảnh mẫu bằng Feature Matching"""
        gray_template = cv2.cvtColor(self.template, cv2.COLOR_BGR2GRAY)
        gray_img = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Tiền xử lý để tăng độ tương phản cho matching
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        gray_template = clahe.apply(gray_template)
        gray_img = clahe.apply(gray_img)
        
        # Dùng AKAZE thay ORB vì ổn định hơn trên ảnh có texture phức tạp
        detector = cv2.AKAZE_create()
        kp1, des1 = detector.detectAndCompute(gray_template, None)
        kp2, des2 = detector.detectAndCompute(gray_img, None)
        
        if des1 is None or des2 is None or len(des1) < 10 or len(des2) < 10:
            logger.warning("[BackSimple] Không đủ feature để matching")
            return None
            
        # Matching
        bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
        matches = bf.match(des1, des2)
        matches = sorted(matches, key=lambda x: x.distance)
        
        # Lấy top matches tốt nhất
        good_matches = matches[:min(50, len(matches))]
        
        if len(good_matches) < 10:
            logger.warning("[BackSimple] Ít match tốt (<10), có thể ảnh khác biệt lớn")
            return None
            
        src_pts = np.float32([kp1[m.queryIdx].pt for m in good_matches]).reshape(-1, 1, 2)
        dst_pts = np.float32([kp2[m.trainIdx].pt for m in good_matches]).reshape(-1, 1, 2)
        
        # Tìm Homography
        M, mask = cv2.findHomography(src_pts, dst_pts, cv2.RANSAC, 5.0)
        if M is None:
            logger.warning("[BackSimple] Không tìm được Homography")
            return None
            
        # Warp ảnh
        h_t, w_t = self.template.shape[:2]
        img_aligned = cv2.warpPerspective(img, M, (w_t, h_t))
        
        return img_aligned

    def _ocr_region(self, img_crop, field_name):
        """OCR một vùng với tiền xử lý phù hợp"""
        if img_crop.size == 0:
            return ""
            
        # Resize nếu quá nhỏ
        h, w = img_crop.shape[:2]
        if h < 20:
            scale = 30 / h
            img_crop = cv2.resize(img_crop, (int(w * scale), 30), interpolation=cv2.INTER_CUBIC)
            
        # Tiền xử lý riêng cho MRZ và text thường
        if "mrz" in field_name:
            gray = cv2.cvtColor(img_crop, cv2.COLOR_BGR2GRAY)
            _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            img_crop = cv2.cvtColor(thresh, cv2.COLOR_GRAY2BGR)
        else:
            gray = cv2.cvtColor(img_crop, cv2.COLOR_BGR2GRAY)
            img_crop = cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR)
            
        rgb = cv2.cvtColor(img_crop, cv2.COLOR_BGR2RGB)
        text = self.ocr.predict(Image.fromarray(rgb)).strip()
        return text

    def extract(self, img_path):
        """Hàm chính: Trích xuất thông tin mặt sau"""
        img = cv2.imread(img_path)
        if img is None:
            logger.error(f"[BackSimple] Không đọc được ảnh: {img_path}")
            return {}
            
        # Correct skew (giữ từ code cũ)
        try:
            img = correct_skew(img)
        except Exception as e:
            logger.warning(f"[BackSimple] correct_skew lỗi: {e}")
            
        # Căn chỉnh ảnh
        img_aligned = self._align_image(img)
        
        if img_aligned is None:
            logger.warning("[BackSimple] Alignment thất bại, dùng fallback fixed-ratio")
            return self._extract_fallback(img)
            
        # OCR từng vùng
        results = {}
        for field, (x1, y1, x2, y2) in self.regions.items():
            crop = img_aligned[y1:y2, x1:x2]
            text = self._ocr_region(crop, field)
            results[field] = text
            
        # Parse MRZ nếu có đủ 3 dòng
        mrz_lines = [results.get(f"mrz_line{i}", "") for i in range(1, 4)]
        if all(mrz_lines):
            results["mrz_parsed"] = self._parse_mrz(mrz_lines)
            
        return results

    def _extract_fallback(self, img):
        """Fallback: Dùng tỉ lệ cố định của thẻ nếu matching thất bại"""
        h, w = img.shape[:2]
        
        fallback_regions = {
            "special_features": (0.05, 0.05, 0.70, 0.17),
            "issue_date":       (0.05, 0.19, 0.55, 0.27),
            "issued_by":        (0.05, 0.29, 0.80, 0.45),
            "holder_name":      (0.05, 0.62, 0.95, 0.71),
            "mrz_line1":        (0.04, 0.77, 0.96, 0.86),
            "mrz_line2":        (0.04, 0.87, 0.96, 0.96),
            "mrz_line3":        (0.04, 0.97, 0.96, 1.00),
        }
        
        results = {}
        for field, (x1_pct, y1_pct, x2_pct, y2_pct) in fallback_regions.items():
            x1, y1 = int(w * x1_pct), int(h * y1_pct)
            x2, y2 = int(w * x2_pct), int(h * y2_pct)
            crop = img[y1:y2, x1:x2]
            results[field] = self._ocr_region(crop, field)
            
        return results

    @staticmethod
    def _parse_mrz(lines):
        """Parse 3 dòng MRZ thành dict (giữ logic cũ)"""
        result = {
            "mrz_raw": "", "mrz_doc_type": "", "mrz_country": "",
            "mrz_id": "", "mrz_dob": "", "mrz_gender": "",
            "mrz_expiry": "", "mrz_name": "",
        }
        if len(lines) < 3:
            return result

        def _clean_mrz_line(raw):
            cleaned = raw.upper()
            result["mrz_dob"] = f"{dd}/{mm}/{cc}{yy}"

        result["mrz_gender"] = {"M": "Nam", "F": "Nữ", "<": "Không xác định"}.get(gender_raw, gender_raw)

        if re.fullmatch(r'\d{6}', exp_raw):
            yy, mm, dd = exp_raw[0:2], exp_raw[2:4], exp_raw[4:6]
            cc = "19" if int(yy) >= 30 else "20"
            result["mrz_expiry"] = f"{dd}/{mm}/{cc}{yy}"

        name_field = l3.strip("<")
        if "<<" in name_field:
            parts = name_field.split("<<", 1)
            last = parts[0].replace("<", " ").strip()
            first = parts[1].replace("<", " ").strip() if len(parts) > 1 else ""
            result["mrz_name"] = f"{first} {last}".strip()
        else:
            result["mrz_name"] = name_field.replace("<", " ").strip()

        return result


# ═══════════════════════════════════════════════════════════════════════════
# KHỞI TẠO AI CHẠY NGẦM
# ═══════════════════════════════════════════════════════════════════════════

ocr_predictor = None
read_info = None
read_back = None 
back_simple_extractor = None  # 🆕 Mới thêm
is_ai_ready = False

def load_ai_background():
    global ocr_predictor, read_info, read_back, back_simple_extractor, is_ai_ready 
    try:
        logger.info("[AI_LOADER] Bắt đầu nạp mô hình AI chạy ngầm...")
        
        # Nạp VietOCR
        vocr_config_path = os.path.join(current_dir, 'Vocr', 'config', 'vgg-seq2seq.yml')
        config_vietocr = Cfg_vietocr.load_config_from_file(vocr_config_path)
        config_vietocr['weights'] = os.path.join(current_dir, 'Models', 'seq2seqocr.pth')
        config_vietocr['device'] = 'cpu'
        ocr_predictor = Predictor(config_vietocr)

        # Nạp YOLOv7 cho mặt trước
        get_dictionary = Detect(opt)
        scan_weight = os.path.join(current_dir, 'Models', 'cccdYoloV7.pt')
        imgsz, stride, device, half, model, names = get_dictionary.load_model(scan_weight)
        
        read_info = ReadInfo(imgsz, stride, device, half, model, names, ocr_predictor)
        
        # 🆕 Khởi tạo extractor đơn giản cho mặt sau
        template_path = os.path.join(current_dir, 'templates', 'cccd_back_sample.jpg')
        if os.path.exists(template_path):
            back_simple_extractor = CCCDBackSimpleExtractor(template_path, ocr_predictor)
            logger.info("[AI_LOADER] Đã khởi tạo CCCDBackSimpleExtractor")
        else:
            # Fallback về ReadBackInfo cũ nếu không có template
            read_back = ReadBackInfo(ocr_predictor)
            logger.warning("[AI_LOADER] Không tìm thấy template, dùng ReadBackInfo cũ")
        
        is_ai_ready = True
        logger.info("[AI_LOADER] HOÀN TẤT! Hệ thống AI đã sẵn sàng.")
    except Exception as e:
        logger.error(f"[AI_LOADER] Lỗi khi nạp AI: {e}", exc_info=True)


# ─── Startup ────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("[Startup] Khởi tạo Database...")
    init_database()
    
    logger.info("[Startup] Nạp embedding vào RAM...")
    _load_embeddings_to_ram()
    logger.info(f"[Startup] {face_memory_store.count} khuôn mặt trên RAM")

    threading.Thread(target=load_ai_background, daemon=True).start()
    
    yield
    logger.info("[Shutdown] Bye!")


def _load_embeddings_to_ram():
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
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
                    "person_id": row["person_id"],
                    "name": row["name"],
                    "role": row.get("role", ""),
                    "img_path": row.get("img_path", ""),
                    "work_expiry_date": str(row["work_expiry_date"]) if row.get("work_expiry_date") else None,
                    "embedding_vector": json.loads(row["embedding_vector"]),
                })
            except Exception as e:
                logger.warning(f"[Startup] Bỏ qua khuôn mặt lỗi: {e}")
        face_memory_store.load_all(parsed)
    except Exception as e:
        logger.error(f"[Startup] Lỗi kết nối DB: {e}")
        face_memory_store.load_all([]) 
    finally:
        if cursor: cursor.close()
        if conn and conn.is_connected(): conn.close()


# ─── App ────────────────────────────────────────────────────────────────────
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
        conn = get_db_connection()
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


# ═══════════════════════════════════════════════════════════════════════════
# 🆕 API OCR - ĐÃ CẬP NHẬT DÙNG CCCDBackSimpleExtractor CHO MẶT SAU
# ═══════════════════════════════════════════════════════════════════════════

@app.post("/api/face/ocr")
async def extract_ocr_local(file: UploadFile = File(...), side: str = Form(...)):
    if not is_ai_ready:
        return {"success": False, "message": "Hệ thống AI đang khởi động, vui lòng thử lại sau 1-2 phút!"}

    temp_path = ""
    try:
        temp_filename = f"temp_cccd_{uuid.uuid4().hex}.jpg"
        temp_path = os.path.join(UPLOAD_DIR, temp_filename)
        file_bytes = await file.read()
        with open(temp_path, "wb") as f:
            f.write(file_bytes)

        logger.info(f"[OCR] Phân tích mặt {side}...")

        if side == "front":
            raw = read_info.get_all_info(temp_path)
            logger.info(f"[OCR] Mặt trước raw: {raw}")
            mapped_data = {
                "id_number": raw.get("id", ""),
                "full_name": raw.get("full_name", ""),
                "dob": raw.get("date_of_birth", ""),
                "gender": raw.get("sex", ""),
                "nationality": raw.get("nationality", ""),
                "hometown": raw.get("place_of_origin", ""),
                "address": raw.get("place_of_residence", ""),
                "expiry_date": raw.get("date_of_expiry", ""),
            }
        else:  
            raw = read_info.get_back_info(temp_path)
            logger.info(f"[OCR] Mặt sau raw: {raw}")
            mapped_data = {
                # 3 trường cũ — giữ nguyên để React không bị lỗi
                "id_number":        raw.get("mrz_id", ""),
                "full_name":        raw.get("mrz_name", ""),
                "dob":              raw.get("mrz_dob", ""),
                "gender":           raw.get("mrz_gender", ""),
                "expiry_date":      raw.get("mrz_expiry", ""),
                "issue_date":       raw.get("issue_date", ""),
                "issued_by":        raw.get("issued_by", ""),
                "special_features": raw.get("special_features", ""),
 
                # 5 trường MRZ mới — thêm vào
                "mrz_id":           raw.get("mrz_id", ""),
                "mrz_dob":          raw.get("mrz_dob", ""),
                "mrz_gender":       raw.get("mrz_gender", ""),
                "mrz_expiry":       raw.get("mrz_expiry", ""),
                "mrz_name":         raw.get("mrz_name", ""),
            }

        if os.path.exists(temp_path):
            os.remove(temp_path)

        logger.info(f"[OCR] Trả về: {mapped_data}")
        return {"success": True, "data": mapped_data}

    except Exception as e:
        logger.error(f"[OCR] Lỗi: {e}", exc_info=True)
        if os.path.exists(temp_path):
            os.remove(temp_path)
        return {"success": False, "message": str(e), "data": {}}
# ═══════════════════════════════════════════════════════════════════════════

ocr_predictor = None
read_info = None
read_back = None 
back_simple_extractor = None  # 🆕 Mới thêm
is_ai_ready = False

def load_ai_background():
    global ocr_predictor, read_info, read_back, back_simple_extractor, is_ai_ready 
    try:
        logger.info("[AI_LOADER] Bắt đầu nạp mô hình AI chạy ngầm...")
        
        # Nạp VietOCR
        vocr_config_path = os.path.join(current_dir, 'Vocr', 'config', 'vgg-seq2seq.yml')
        config_vietocr = Cfg_vietocr.load_config_from_file(vocr_config_path)
        config_vietocr['weights'] = os.path.join(current_dir, 'Models', 'seq2seqocr.pth')
        config_vietocr['device'] = 'cpu'
        ocr_predictor = Predictor(config_vietocr)

        # Nạp YOLOv7 cho mặt trước
        get_dictionary = Detect(opt)
        scan_weight = os.path.join(current_dir, 'Models', 'cccdYoloV7.pt')
        imgsz, stride, device, half, model, names = get_dictionary.load_model(scan_weight)
        
        read_info = ReadInfo(imgsz, stride, device, half, model, names, ocr_predictor)
        
        # 🆕 Khởi tạo extractor đơn giản cho mặt sau
        template_path = os.path.join(current_dir, 'templates', 'cccd_back_sample.jpg')
        if os.path.exists(template_path):
            back_simple_extractor = CCCDBackSimpleExtractor(template_path, ocr_predictor)
            logger.info("[AI_LOADER] Đã khởi tạo CCCDBackSimpleExtractor")
        else:
            # Fallback về ReadBackInfo cũ nếu không có template
            read_back = ReadBackInfo(ocr_predictor)
            logger.warning("[AI_LOADER] Không tìm thấy template, dùng ReadBackInfo cũ")
        
        is_ai_ready = True
        logger.info("[AI_LOADER] HOÀN TẤT! Hệ thống AI đã sẵn sàng.")
    except Exception as e:
        logger.error(f"[AI_LOADER] Lỗi khi nạp AI: {e}", exc_info=True)


# ─── Startup ────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("[Startup] Khởi tạo Database...")
    init_database()
    
    logger.info("[Startup] Nạp embedding vào RAM...")
    _load_embeddings_to_ram()
    logger.info(f"[Startup] {face_memory_store.count} khuôn mặt trên RAM")

    threading.Thread(target=load_ai_background, daemon=True).start()
    
    yield
    logger.info("[Shutdown] Bye!")


def _load_embeddings_to_ram():
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
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
                    "person_id": row["person_id"],
                    "name": row["name"],
                    "role": row.get("role", ""),
                    "img_path": row.get("img_path", ""),
                    "work_expiry_date": str(row["work_expiry_date"]) if row.get("work_expiry_date") else None,
                    "embedding_vector": json.loads(row["embedding_vector"]),
                })
            except Exception as e:
                logger.warning(f"[Startup] Bỏ qua khuôn mặt lỗi: {e}")
        face_memory_store.load_all(parsed)
    except Exception as e:
        logger.error(f"[Startup] Lỗi kết nối DB: {e}")
        face_memory_store.load_all([]) 
    finally:
        if cursor: cursor.close()
        if conn and conn.is_connected(): conn.close()


# ─── App ────────────────────────────────────────────────────────────────────
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
        conn = get_db_connection()
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


# ═══════════════════════════════════════════════════════════════════════════
# 🆕 API OCR - ĐÃ CẬP NHẬT DÙNG CCCDBackSimpleExtractor CHO MẶT SAU
# ═══════════════════════════════════════════════════════════════════════════

@app.post("/api/face/ocr")
async def extract_ocr_local(file: UploadFile = File(...), side: str = Form(...)):
    if not is_ai_ready:
        return {"success": False, "message": "Hệ thống AI đang khởi động, vui lòng thử lại sau 1-2 phút!"}

    temp_path = ""
    try:
        temp_filename = f"temp_cccd_{uuid.uuid4().hex}.jpg"
        temp_path = os.path.join(UPLOAD_DIR, temp_filename)
        file_bytes = await file.read()
        with open(temp_path, "wb") as f:
            f.write(file_bytes)

        logger.info(f"[OCR] Phân tích mặt {side}...")

        if side == "front":
            raw = read_info.get_all_info(temp_path)
            logger.info(f"[OCR] Mặt trước raw: {raw}")
            mapped_data = {
                "id_number": raw.get("id", ""),
                "full_name": raw.get("full_name", ""),
                "dob": raw.get("date_of_birth", ""),
                "gender": raw.get("sex", ""),
                "nationality": raw.get("nationality", ""),
                "hometown": raw.get("place_of_origin", ""),
                "address": raw.get("place_of_residence", ""),
                "expiry_date": raw.get("date_of_expiry", ""),
            }

        else:  
            if back_simple_extractor is not None:
                raw = back_simple_extractor.extract(temp_path)
            elif read_back is not None:
                raw = read_back.get_back_info(temp_path)
            else:
                raw = read_info.get_back_info(temp_path)
            
            logger.info(f"[OCR] Mặt sau raw: {raw}")
            mapped_data = {
                # 3 trường cũ — giữ nguyên để React không bị lỗi
                "id_number":        raw.get("mrz_id", ""),
                "full_name":        raw.get("mrz_name", ""),
                "dob":              raw.get("mrz_dob", ""),
                "gender":           raw.get("mrz_gender", ""),
                "expiry_date":      raw.get("mrz_expiry", ""),
                "issue_date":       raw.get("issue_date", ""),
                "issued_by":        raw.get("issued_by", ""),
                "special_features": raw.get("special_features", ""),
 
                # 5 trường MRZ mới — thêm vào
                "mrz_id":           raw.get("mrz_id", ""),
                "mrz_dob":          raw.get("mrz_dob", ""),
                "mrz_gender":       raw.get("mrz_gender", ""),
                "mrz_expiry":       raw.get("mrz_expiry", ""),
                "mrz_name":         raw.get("mrz_name", ""),
            }

        if os.path.exists(temp_path):
            os.remove(temp_path)

        logger.info(f"[OCR] Trả về: {mapped_data}")
        return {"success": True, "data": mapped_data}

    except Exception as e:
        logger.error(f"[OCR] Lỗi: {e}", exc_info=True)
        if os.path.exists(temp_path):
            os.remove(temp_path)
        return {"success": False, "message": str(e), "data": {}}


# ═══════════════════════════════════════════════════════════════════════════
# NHẬN DIỆN KHUÔN MẶT (giữ nguyên)
# ═══════════════════════════════════════════════════════════════════════════

@app.post("/api/face/recognize")
async def recognize(background_tasks: BackgroundTasks, image: UploadFile = File(...)):
    t0 = time.time()
    file_bytes = await image.read()
    detections = face_ai_service.extract_faces(file_bytes)

    if not detections:
        return {"success": True, "data": {"detected": False, "faces": []}}

    results, log_queries = [], []
    today = date.today()

    for face in detections:
        bbox = face["box"]
        match = face_memory_store.find_best_match(np.array(face["descriptor"], dtype=np.float32))

        if match:
            expiry_str = match.get("work_expiry_date")
            if expiry_str and date.fromisoformat(expiry_str) < today:
                logger.info(f"[Recognize] {match['name']} — HẾT HẠN {expiry_str}")
                results.append({
                    "id": match["person_id"], "name": match["name"],
                    "role": match["role"], "img": "",
                    "status": "expired", "confidence": 0, "bbox": bbox,
                    "expired": True, "expiry_date": expiry_str,
                })
                log_queries.append((str(uuid.uuid4()), match["person_id"], "unknown", 0, "Cổng Chính", "Từ chối"))
                continue

            confidence = round(max(0.0, (1.0 - match["distance"]) * 100.0), 2)
            img_url = f"/uploads/{Path(match['img_path']).name}" if match.get("img_path") else ""
            logger.info(f"[Recognize] {match['name']} dist={match['distance']:.4f} conf={confidence:.1f}%")
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
            "detected": True,
            "faces": results,
            "processTime": int((time.time() - t0) * 1000),
            "model": "InsightFace-buffalo_sc-RAM",
            "ramCount": face_memory_store.count,
        },
    }


# ═══════════════════════════════════════════════════════════════════════════
# ĐĂNG KÝ (giữ nguyên)
# ═══════════════════════════════════════════════════════════════════════════

@app.post("/api/face/register")
async def register(
    name: str = Form(...),
    role: str = Form(""),
    department: str = Form(""),
    work_expiry_date: str = Form(""),
    cccd_info: str = Form("{}"),
    images: list[UploadFile] = File(...),
    cccd_front: UploadFile = File(None),
    cccd_back: UploadFile = File(None),
):
    conn = get_db_connection()
    cursor = conn.cursor()
    person_id = str(uuid.uuid4())
    new_encodings: list[tuple] = []
    avatar_path = ""
    saved_files = []
    COSINE_THRESHOLD = 0.5

    try:
        cccd = json.loads(cccd_info) if cccd_info else {}
        expiry_val = work_expiry_date or None
        cccd_number = cccd.get("id_number")

        if cccd_number:
            cursor.execute("SELECT id FROM citizen_ids WHERE id_number = %s", (cccd_number,))
            if cursor.fetchone():
                raise Exception("Số CCCD này đã được đăng ký trong hệ thống!")

        user_descriptor = None
        for i, img_file in enumerate(images):
            img_bytes = await img_file.read()
            detections = face_ai_service.extract_faces(img_bytes)
            
            if len(detections) == 0:
                raise Exception(f"Không tìm thấy khuôn mặt trong ảnh mẫu thứ {i + 1}.")
            if len(detections) > 1:
                raise Exception(f"Ảnh mẫu thứ {i + 1} có nhiều hơn 1 khuôn mặt.")

            descriptor = detections[0]["descriptor"]
            emb_id = str(uuid.uuid4())
            
            if i == 0:
                user_descriptor = descriptor

            saved_path = face_ai_service.save_image(img_bytes, person_id, index=i)
            saved_files.append(saved_path)
            
            if i == 0:
                avatar_path = saved_path
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

        front_path, back_path = "", ""

        if cccd_front:
            fb_bytes = await cccd_front.read()
            if fb_bytes:
                cccd_detections = face_ai_service.extract_faces(fb_bytes)
                if len(cccd_detections) == 0:
                    raise Exception("Không tìm thấy khuôn mặt trên ảnh mặt trước CCCD.")
                
                cccd_descriptor = cccd_detections[0]["descriptor"]
                q = face_memory_store._norm(np.array(user_descriptor, dtype=np.float32))
                c = face_memory_store._norm(np.array(cccd_descriptor, dtype=np.float32))
                score = float(np.dot(q, c))

                if score < COSINE_THRESHOLD:
                    logger.warning(f"Cảnh báo giả mạo: Score {score} < {COSINE_THRESHOLD}")
                    raise Exception("Cảnh báo: Khuôn mặt trên thẻ CCCD KHÔNG KHỚP với ảnh chụp trực tiếp!")

                front_path = face_ai_service.save_image(fb_bytes, f"cccd_front_{person_id}", index=0)
                saved_files.append(front_path)

        if cccd_back:
            bb_bytes = await cccd_back.read()
            if bb_bytes:
                back_path = face_ai_service.save_image(bb_bytes, f"cccd_back_{person_id}", index=0)
                saved_files.append(back_path)

        cursor.execute("""
            INSERT INTO citizen_ids
              (id, person_id, front_img_path, back_img_path, 
               id_number, full_name, dob, gender, nationality, 
               hometown, address, expiry_date, issue_date, special_features)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        """, (
            str(uuid.uuid4()), person_id,
            front_path or None, back_path or None,
            cccd.get("id_number"), cccd.get("full_name"),
            cccd.get("dob"), cccd.get("gender"),
            cccd.get("nationality", "Việt Nam"),
            cccd.get("hometown"), cccd.get("address"),
            cccd.get("expiry_date"), cccd.get("issue_date"),
            cccd.get("special_features"),
        ))

        conn.commit()

        for pid, pname, prole, pimg, pexpiry, enc in new_encodings:
            face_memory_store.add(pid, pname, prole, pimg, enc, work_expiry_date=pexpiry)

        logger.info(f"[Register] {name} | {len(new_encodings)} mẫu | RAM: {face_memory_store.count}")
        return {
            "success": True,
            "message": f"Đã đăng ký {name} với {len(new_encodings)} mẫu.",
            "img_url": f"/uploads/{Path(avatar_path).name}" if avatar_path else "",
            "ramCount": face_memory_store.count,
        }

    except Exception as e:
        conn.rollback()
        logger.error(f"[Register Lỗi] {e}")
        for path in saved_files:
            p = Path(path)
            if p.exists():
                p.unlink()
        return JSONResponse(status_code=400, content={"success": False, "error": str(e)})
    finally:
        cursor.close()
        conn.close()


# ═══════════════════════════════════════════════════════════════════════════
# CÁC API KHÁC (giữ nguyên)
# ═══════════════════════════════════════════════════════════════════════════

@app.get("/api/face/persons")
async def get_persons():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT p.id, p.name, p.role, p.department, p.status,
                   p.work_expiry_date, p.img_url, p.img_path,
                   p.registered_at, p.updated_at,
                   (SELECT COUNT(*) FROM face_embeddings e WHERE e.person_id = p.id) AS embeddings,
                   (SELECT COUNT(*) FROM recognition_logs l WHERE l.person_id = p.id AND l.status = 'success') AS recognitions,
                   c.id AS citizen_id_record_id,
                   c.front_img_path, c.back_img_path,
                   c.id_number, c.full_name, c.dob, c.gender, c.nationality,
                   c.hometown, c.address, c.expiry_date, c.issue_date,
                   c.special_features, c.created_at AS citizen_created_at,
                   c.updated_at AS citizen_updated_at
            FROM persons p
            LEFT JOIN citizen_ids c ON c.person_id = p.id
            ORDER BY p.registered_at DESC
        """)
        rows = cursor.fetchall()
        today = str(date.today())
        for row in rows:
            raw_avatar = row.get("img_path") or ""
            raw_front = row.get("front_img_path") or ""
            raw_back = row.get("back_img_path") or ""

            row["img"] = row.get("img_url") or (f"/uploads/{Path(raw_avatar).name}" if raw_avatar else "")
            row["cccd_front_img"] = f"/uploads/{Path(raw_front).name}" if raw_front else ""
            row["cccd_back_img"] = f"/uploads/{Path(raw_back).name}" if raw_back else ""
            row["registered"] = row.get("registered_at")

            exp = row.get("work_expiry_date")
            row["is_expired"] = bool(exp and str(exp) < today)
        return {"success": True, "data": rows, "total": len(rows), "ramCount": face_memory_store.count}
    finally:
        cursor.close()
        conn.close()


@app.put("/api/face/persons/{id}")
async def update_person(id: str, person_data: PersonUpdate):
    conn = get_db_connection()
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
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT img_path FROM persons WHERE id=%s", (id,))
        row = cursor.fetchone()
        cur2 = conn.cursor()
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
    conn = get_db_connection()
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
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT status, created_at FROM recognition_logs ORDER BY created_at DESC LIMIT 1000")
        all_logs = cursor.fetchall()
        hourly = {f"{i:02d}:00": {"nhận_diện": 0, "từ_chối": 0, "lạ": 0} for i in range(24)}
        days = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"]
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
    return {"success": True, "loaded": face_memory_store.is_loaded, "ramCount": face_memory_store.count}


@app.post("/api/face/reload-memory")
async def reload_memory():
    _load_embeddings_to_ram()
    return {"success": True, "ramCount": face_memory_store.count}


# ═══════════════════════════════════════════════════════════════════════════
# 🆕 SCRIPT HỖ TRỢ: In tọa độ để điền vào regions
# ═══════════════════════════════════════════════════════════════════════════

def print_template_coords(template_path):
    """
    Chạy hàm này để xem ảnh mẫu với grid, giúp bạn lấy tọa độ chính xác.
    Ví dụ: python main.py --print-coords templates/cccd_back_sample.jpg
    """
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--print-coords', type=str, help='Path to template image')
    args = parser.parse_args()
    
    if args.print_coords:
        img = cv2.imread(args.print_coords)
        if img is None:
            print(f"❌ Không đọc được ảnh: {args.print_coords}")
            return
            
        h, w = img.shape[:2]
        print(f" Kích thước ảnh mẫu: {w}x{h}")
        print(" Hãy mở ảnh trong Paint/Photoshop và ghi lại tọa độ (x,y) của:")
        print("   - Góc trên-trái và dưới-phải của từng vùng cần OCR")
        print("\n Các vùng cần xác định:")
        print("   - special_features: Đặc điểm nhận dạng")
        print("   - issue_date: Ngày cấp")
        print("   - issued_by: Nơi cấp")
        print("   - holder_name: Tên chủ thẻ")
        print("   - mrz_line1/2/3: 3 dòng MRZ")
        
        # Vẽ grid để dễ ước lượng
        for i in range(0, w, 100):
            cv2.line(img, (i, 0), (i, h), (0, 255, 0), 1)
        for i in range(0, h, 50):
            cv2.line(img, (0, i), (w, i), (0, 255, 0), 1)
            
        cv2.imshow("Template Grid - Click để đóng", img)
        cv2.waitKey(0)
        cv2.destroyAllWindows()
        return
        
    # Chạy server bình thường nếu không có arg --print-coords
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3001)


if __name__ == "__main__":
    print_template_coords(None)  # Chạy server mặc định
