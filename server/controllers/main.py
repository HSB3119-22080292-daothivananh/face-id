import os
import sys
import threading
from pathlib import Path
current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir    = os.path.dirname(current_dir)

sys.path.insert(0, current_dir)
sys.path.insert(0, os.path.join(current_dir, "DetecInfoBoxes"))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

# ─── 2. BIẾN MÔI TRƯỜNG ─────────────────────────────────────────────────────
os.environ["FLAGS_use_mkldnn"] = "0"
os.environ["FLAGS_use_onednn"] = "0"

import uuid, json, time, logging, cv2, numpy as np, re, hashlib, secrets, smtplib, unicodedata, html, socket, requests
from email.message import EmailMessage
from PIL import Image
from contextlib import asynccontextmanager
from datetime import date, datetime, timedelta, timezone
from dotenv import load_dotenv

# ─── 3. IMPORT ──────────────────────────────────────────────────────────────
from readInfoIdCard import ReadInfo          # YOLO front + Gemini back
from DetecInfoBoxes.GetBoxes import Detect
from Vocr.tool.predictor import Predictor
from Vocr.tool.config import Cfg as Cfg_vietocr
from config import opt

# ─── 4. FASTAPI & DATABASE ──────────────────────────────────────────────────
load_dotenv(dotenv_path=Path(root_dir) / ".env")

APP_TIME_ZONE = timezone(timedelta(hours=7), "Asia/Ho_Chi_Minh")
os.environ["TZ"] = os.getenv("APP_TIMEZONE", "Asia/Ho_Chi_Minh")
if hasattr(time, "tzset"):
    time.tzset()


def _now_vietnam() -> datetime:
    return datetime.now(APP_TIME_ZONE).replace(tzinfo=None)


def _today_vietnam() -> date:
    return datetime.now(APP_TIME_ZONE).date()


def _iso_vietnam(value) -> str:
    if isinstance(value, datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=APP_TIME_ZONE)
        else:
            value = value.astimezone(APP_TIME_ZONE)
    return value.isoformat()

from fastapi import FastAPI, UploadFile, File, Form, BackgroundTasks, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from database.database import get_db_connection, init_database
from service.face_service import face_ai_service, face_memory_store, UPLOAD_DIR

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════════════════
# KHỞI TẠO AI CHẠY NGẦM
# ═══════════════════════════════════════════════════════════════════════════

ocr_predictor = None
read_info     = None
is_ai_ready   = False


def load_ai_background():
    global ocr_predictor, read_info, is_ai_ready
    try:
        logger.info("[AI_LOADER] Bắt đầu nạp mô hình AI chạy ngầm...")

        # Nạp VietOCR (chỉ dùng cho mặt TRƯỚC)
        vocr_config_path = os.path.join(current_dir, "Vocr", "config", "vgg-seq2seq.yml")
        config_vietocr   = Cfg_vietocr.load_config_from_file(vocr_config_path)
        config_vietocr["weights"] = os.path.join(current_dir, "Models", "seq2seqocr.pth")
        config_vietocr["device"]  = "cpu"
        ocr_predictor = Predictor(config_vietocr)

        # Nạp YOLOv7 (chỉ dùng cho mặt TRƯỚC)
        get_dictionary = Detect(opt)
        scan_weight    = os.path.join(current_dir, "Models", "cccdYoloV7.pt")
        imgsz, stride, device, half, model, names = get_dictionary.load_model(scan_weight)

        read_info = ReadInfo(imgsz, stride, device, half, model, names, ocr_predictor)

        # Mặt SAU dùng Gemini Vision — không cần nạp thêm model
        logger.info("[AI_LOADER] Mặt sau sẽ dùng Gemini Vision API (không cần model local)")

        is_ai_ready = True
        logger.info("[AI_LOADER] ✅ HOÀN TẤT! YOLO + VietOCR (mặt trước) | Gemini (mặt sau)")
    except Exception as e:
        logger.error(f"[AI_LOADER] ❌ Lỗi: {e}", exc_info=True)


# ─── Startup ─────────────────────────────────────────────────────────────────
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
    conn = cursor = None
    try:
        conn   = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT e.person_id, p.name, p.role, p.img_url,
                   p.work_expiry_date, e.embedding_vector
            FROM face_embeddings e
            JOIN persons p ON e.person_id = p.id
            WHERE p.status = 'active'
        """)
        rows   = cursor.fetchall()
        parsed = []
        for row in rows:
            try:
                parsed.append({
                    "person_id":        row["person_id"],
                    "name":             row["name"],
                    "role":             row.get("role", ""),
                    "img_path":         row.get("img_url", ""),
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


# ─── App ─────────────────────────────────────────────────────────────────────
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
    name:       str
    role:       str
    department: str


class EmployeeLoginRequest(BaseModel):
    identifier: str
    password: str


class NotificationReadRequest(BaseModel):
    notification_ids: list[str] | None = None


class ResetPasswordRequest(BaseModel):
    token: str
    password: str


def _default_employee_password(username: str) -> str:
    digits = re.sub(r"\D", "", username or "")
    if len(digits) >= 6:
        return digits[-6:]
    return digits or (username or "123456")[-6:] or "123456"


def _hash_password(password: str, salt: str) -> str:
    return hashlib.sha256(f"{salt}:{password}".encode("utf-8")).hexdigest()


def _strip_vietnamese_accents(value: str) -> str:
    value = (value or "").replace("Đ", "D").replace("đ", "d")
    normalized = unicodedata.normalize("NFD", value)
    return "".join(ch for ch in normalized if unicodedata.category(ch) != "Mn")


def _name_tokens(full_name: str) -> list[str]:
    ascii_name = _strip_vietnamese_accents(full_name).lower()
    return re.findall(r"[a-z0-9]+", ascii_name)


def _generate_employee_username(cursor, full_name: str) -> str:
    tokens = _name_tokens(full_name)
    if tokens:
        base = f"{tokens[-1]}{''.join(token[0] for token in tokens[:-1])}"
    else:
        base = "user"

    base = re.sub(r"[^a-z0-9]", "", base)[:24] or "user"
    for _ in range(200):
        candidate = f"{base}{secrets.randbelow(100):02d}"
        cursor.execute("SELECT id FROM employee_accounts WHERE username=%s LIMIT 1", (candidate,))
        if not cursor.fetchone():
            return candidate
    return f"{base}{secrets.token_hex(2)}"


def _generate_employee_password() -> str:
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"
    return "".join(secrets.choice(alphabet) for _ in range(10))


def _client_url(path: str = "") -> str:
    base_url = (os.getenv("CLIENT_URL") or os.getenv("FRONTEND_URL") or "http://localhost:5173").strip()
    base_url = base_url.rstrip("/")
    if not path:
        return base_url
    return f"{base_url}/{path.lstrip('/')}"


def _env_first(*names: str, default: str = "") -> str:
    for name in names:
        value = os.getenv(name)
        if value is not None and str(value).strip() != "":
            return str(value).strip()
    return default


def _env_bool(*names: str, default: bool = False) -> bool:
    value = _env_first(*names, default="true" if default else "false").lower()
    return value not in {"0", "false", "no", "off"}


def _format_mailbox(name: str, email: str) -> str:
    email = (email or "").strip()
    if not email:
        return ""
    if "<" in email and ">" in email:
        return email
    name = (name or "").strip() or "Face ID"
    return f"{name} <{email}>"


def _system_email_address() -> str:
    return _env_first(
        "EMAIL_SYSTEM_ADDRESS",
        "SYSTEM_EMAIL",
        "SMTP_USER",
        "spring.mail.username",
        "SPRING_MAIL_USERNAME",
    )


def _create_ipv4_socket(host: str, port: int, timeout: float):
    last_error = None
    for family, socktype, proto, _, address in socket.getaddrinfo(host, port, socket.AF_INET, socket.SOCK_STREAM):
        sock = None
        try:
            sock = socket.socket(family, socktype, proto)
            sock.settimeout(timeout)
            sock.connect(address)
            return sock
        except OSError as exc:
            last_error = exc
            if sock:
                sock.close()
    if last_error:
        raise last_error
    raise OSError(f"Khong tim thay dia chi IPv4 cho SMTP host {host}")


class SMTPIPv4(smtplib.SMTP):
    def _get_socket(self, host, port, timeout):
        if self.debuglevel > 0:
            self._print_debug("connect:", (host, port), "IPv4")
        return _create_ipv4_socket(host, port, timeout)


def _email_button(url: str, label: str) -> str:
    return (
        f'<a href="{html.escape(url)}" '
        'style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;'
        'font-weight:800;border-radius:10px;padding:13px 22px;box-shadow:0 12px 24px rgba(37,99,235,.22)">'
        f"{html.escape(label)}</a>"
    )


def _employee_email_html(account: dict, *, include_password: bool) -> str:
    name = html.escape(account.get("name") or "nhan vien")
    username = html.escape(account.get("username") or "")
    password = html.escape(account.get("temporary_password") or "")
    login_link = html.escape(account.get("login_link") or _client_url("/#/login"))
    reset_link = account.get("reset_link") or ""
    reset_button = _email_button(reset_link, "Doi mat khau ngay") if reset_link else ""
    credential_rows = f"""
      <tr>
        <td style="padding:12px 0;color:#64748b;font-size:13px">Username</td>
        <td style="padding:12px 0;text-align:right;font-family:Consolas,Monaco,monospace;font-weight:800;color:#0f172a">{username}</td>
      </tr>
    """
    if include_password:
        credential_rows += f"""
      <tr>
        <td style="padding:12px 0;color:#64748b;font-size:13px;border-top:1px solid #e2e8f0">Mat khau tam</td>
        <td style="padding:12px 0;text-align:right;font-family:Consolas,Monaco,monospace;font-weight:800;color:#0f172a;border-top:1px solid #e2e8f0">{password}</td>
      </tr>
        """

    title = "Tai khoan Face ID da san sang" if include_password else "Yeu cau doi mat khau Face ID"
    subtitle = (
        "Thong tin dang nhap va lien ket doi mat khau cua ban nam ben duoi."
        if include_password
        else "Nhan nut ben duoi de dat lai mat khau moi cho tai khoan cua ban."
    )

    return f"""\
<!doctype html>
<html>
  <body style="margin:0;background:#eef2f7;padding:28px;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
    <div style="max-width:620px;margin:0 auto;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #dbe3ef;box-shadow:0 22px 50px rgba(15,23,42,.12)">
      <div style="background:linear-gradient(135deg,#0f172a,#1d4ed8);padding:30px 32px;color:#ffffff">
        <div style="font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:#bfdbfe;font-weight:800">Face ID Attendance</div>
        <h1 style="margin:10px 0 0;font-size:26px;line-height:1.25">{title}</h1>
        <p style="margin:10px 0 0;color:#dbeafe;font-size:14px;line-height:1.6">{subtitle}</p>
      </div>

      <div style="padding:30px 32px">
        <p style="margin:0 0 18px;font-size:15px;line-height:1.7">Xin chao <strong>{name}</strong>,</p>

        <div style="border:1px solid #e2e8f0;border-radius:14px;padding:4px 18px;background:#f8fafc">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse">
            {credential_rows}
          </table>
        </div>

        <div style="margin:26px 0 8px;text-align:center">
          {reset_button}
        </div>

        <p style="margin:18px 0 0;text-align:center;font-size:13px;color:#64748b;line-height:1.7">
          Dang nhap he thong: <a href="{login_link}" style="color:#2563eb;font-weight:700;text-decoration:none">{login_link}</a>
        </p>

        <div style="margin-top:24px;padding:14px 16px;border-radius:12px;background:#eff6ff;color:#1e3a8a;font-size:13px;line-height:1.6">
          Vi ly do bao mat, vui long doi mat khau sau lan dang nhap dau tien. Link doi mat khau co thoi han 7 ngay.
        </div>
      </div>
    </div>
  </body>
</html>
"""


def _mail_subject(include_password: bool) -> str:
    return "Tai khoan Face ID cua ban" if include_password else "Doi mat khau Face ID"


def _mail_text(account: dict, *, include_password: bool) -> str:
    reset_link = account.get("reset_link") or ""
    plain_lines = [
        f"Xin chao {account.get('name') or ''},",
        "",
        "Thong tin tai khoan Face ID:",
        f"Username: {account.get('username')}",
    ]
    if include_password:
        plain_lines.append(f"Mat khau tam: {account.get('temporary_password')}")
    if reset_link:
        plain_lines.append(f"Doi mat khau: {reset_link}")
    plain_lines.append(f"Dang nhap: {account.get('login_link') or _client_url('/#/login')}")
    return "\n".join(plain_lines)


def _send_email_resend(to_email: str, subject: str, text_body: str, html_body: str) -> bool | None:
    api_key = _env_first("RESEND_API_KEY")
    provider = _env_first("EMAIL_PROVIDER", "MAIL_PROVIDER", default="auto").lower()
    if not api_key:
        if provider == "resend":
            logger.warning("[Mail] EMAIL_PROVIDER=resend nhung thieu RESEND_API_KEY.")
            return False
        return None

    from_name = _env_first("EMAIL_FROM_NAME", default="Face ID")
    from_email = _env_first(
        "EMAIL_FROM",
        "MAIL_FROM",
        "RESEND_FROM",
        default="Face ID <onboarding@resend.dev>",
    )
    reply_to = _env_first("EMAIL_REPLY_TO", "REPLY_TO", default=_system_email_address())
    payload = {
        "from": from_email,
        "to": [to_email],
        "subject": subject,
        "text": text_body,
        "html": html_body,
    }
    if reply_to:
        payload["reply_to"] = _format_mailbox(from_name, reply_to)
    try:
        response = requests.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=float(_env_first("EMAIL_API_TIMEOUT", default="20")),
        )
        if 200 <= response.status_code < 300:
            return True
        logger.warning(f"[Mail] Resend API loi {response.status_code}: {response.text[:500]}")
        return False
    except Exception as exc:
        logger.warning(f"[Mail] Khong gui duoc email qua Resend HTTPS den {to_email}: {exc}")
        return False


def _send_email_smtp(to_email: str, subject: str, text_body: str, html_body: str) -> bool:
    smtp_host = _env_first("SMTP_HOST", "spring.mail.host", "SPRING_MAIL_HOST")
    if not smtp_host:
        logger.warning("[Mail] Chua cau hinh SMTP_HOST hoac RESEND_API_KEY.")
        return False

    smtp_port = int(_env_first("SMTP_PORT", "spring.mail.port", "SPRING_MAIL_PORT", default="587"))
    smtp_user = _env_first("SMTP_USER", "spring.mail.username", "SPRING_MAIL_USERNAME")
    smtp_password = _env_first("SMTP_PASSWORD", "spring.mail.password", "SPRING_MAIL_PASSWORD")
    from_name = _env_first("EMAIL_FROM_NAME", default="Face ID")
    smtp_from = _env_first("SMTP_FROM", "EMAIL_FROM", "MAIL_FROM", default=_format_mailbox(from_name, _system_email_address() or smtp_user or "no-reply@face-id.local"))
    use_tls = _env_bool("SMTP_TLS", "spring.mail.properties.mail.smtp.starttls.enable", "SPRING_MAIL_PROPERTIES_MAIL_SMTP_STARTTLS_ENABLE", default=True)
    use_auth = _env_bool("SMTP_AUTH", "spring.mail.properties.mail.smtp.auth", "SPRING_MAIL_PROPERTIES_MAIL_SMTP_AUTH", default=bool(smtp_user))
    force_ipv4 = _env_bool("SMTP_FORCE_IPV4", default=True)
    smtp_timeout = float(_env_first("SMTP_TIMEOUT", default="20"))

    if use_auth and (not smtp_user or not smtp_password):
        logger.warning("[Mail] SMTP yeu cau auth nhung thieu username/password.")
        return False

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = smtp_from
    message["To"] = to_email
    message.set_content(text_body)
    message.add_alternative(html_body, subtype="html")

    try:
        smtp_class = SMTPIPv4 if force_ipv4 else smtplib.SMTP
        with smtp_class(smtp_host, smtp_port, timeout=smtp_timeout) as smtp:
            if use_tls:
                smtp.starttls()
            if use_auth:
                smtp.login(smtp_user, smtp_password)
            smtp.send_message(message)
        return True
    except OSError as exc:
        hint = "Server khong ket noi duoc SMTP. Tren Hugging Face hay dung RESEND_API_KEY de gui mail qua HTTPS."
        logger.warning(f"[Mail] Khong gui duoc email den {to_email}: {exc}. {hint}")
        return False
    except Exception as exc:
        logger.warning(f"[Mail] Khong gui duoc email den {to_email}: {exc}")
        return False


def _send_employee_email(account: dict, *, include_password: bool) -> bool:
    email = (account.get("email") or "").strip()
    if not email:
        return False

    subject = _mail_subject(include_password)
    text_body = _mail_text(account, include_password=include_password)
    html_body = _employee_email_html(account, include_password=include_password)
    provider = _env_first("EMAIL_PROVIDER", "MAIL_PROVIDER", default="auto").lower()

    if provider in {"resend", "https", "api", "auto"}:
        api_result = _send_email_resend(email, subject, text_body, html_body)
        if api_result is not None:
            return api_result

    if provider in {"smtp", "auto"}:
        return _send_email_smtp(email, subject, text_body, html_body)

    logger.warning(f"[Mail] EMAIL_PROVIDER khong hop le: {provider}")
    return False


def _send_employee_welcome_email(account: dict) -> bool:
    return _send_employee_email(account, include_password=True)


def create_employee_account_for_registration(cursor, person_id: str, full_name: str, email: str) -> dict:
    username = _generate_employee_username(cursor, full_name)
    temporary_password = _generate_employee_password()
    salt = secrets.token_hex(16)
    reset_token = secrets.token_urlsafe(32)
    reset_expires_at = _now_vietnam() + timedelta(days=7)

    cursor.execute(
        """
        INSERT INTO employee_accounts
          (id, person_id, username, email, password_hash, password_salt,
           password_reset_token, password_reset_expires_at, must_change_password, status)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 1, 'active')
        """,
        (
            str(uuid.uuid4()),
            person_id,
            username,
            email or None,
            _hash_password(temporary_password, salt),
            salt,
            reset_token,
            reset_expires_at,
        ),
    )

    return {
        "person_id": person_id,
        "name": full_name,
        "username": username,
        "email": email,
        "temporary_password": temporary_password,
        "login_link": _client_url("/#/login"),
        "reset_link": _client_url(f"/#/reset-password?token={reset_token}"),
        "reset_expires_at": _iso_vietnam(reset_expires_at),
        "email_sent": False,
    }


def ensure_employee_account(cursor, person_id: str, username: str) -> None:
    username = (username or "").strip()
    if not username:
        return

    cursor.execute(
        "SELECT id FROM employee_accounts WHERE person_id=%s OR username=%s LIMIT 1",
        (person_id, username),
    )
    if cursor.fetchone():
        return

    salt = secrets.token_hex(16)
    cursor.execute(
        """
        INSERT INTO employee_accounts
          (id, person_id, username, password_hash, password_salt, must_change_password, status)
        VALUES (%s, %s, %s, %s, %s, 1, 'active')
        """,
        (
            str(uuid.uuid4()),
            person_id,
            username,
            _hash_password(_default_employee_password(username), salt),
            salt,
        ),
    )


def _employee_payload(row: dict) -> dict:
    return {
        "person_id": row["person_id"],
        "name": row.get("name") or "",
        "role": row.get("role") or "",
        "department": row.get("department") or "",
        "username": row.get("username") or "",
        "email": row.get("email") or "",
    }


def _admin_payload(row: dict) -> dict:
    return {
        "admin_id": row["admin_id"],
        "name": row.get("display_name") or row.get("username") or "Admin",
        "username": row.get("username") or "",
    }


def create_employee_session(cursor, account: dict) -> tuple[str, datetime]:
    token = secrets.token_urlsafe(48)
    expires_at = _now_vietnam() + timedelta(days=30)
    cursor.execute(
        """
        INSERT INTO employee_sessions (id, account_id, token, expires_at)
        VALUES (%s, %s, %s, %s)
        """,
        (str(uuid.uuid4()), account["account_id"], token, expires_at),
    )
    cursor.execute(
        "UPDATE employee_accounts SET last_login_at=NOW() WHERE id=%s",
        (account["account_id"],),
    )
    return token, expires_at


def _get_employee_from_token(authorization: str | None) -> dict:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Chua dang nhap")

    token = authorization.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Token khong hop le")

    conn = cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            """
            SELECT a.id AS account_id, a.person_id, a.username, a.email,
                   p.name, p.role, p.department
            FROM employee_sessions s
            JOIN employee_accounts a ON a.id = s.account_id
            JOIN persons p ON p.id = a.person_id
            WHERE s.token=%s
              AND s.expires_at > NOW()
              AND a.status='active'
              AND p.status='active'
            LIMIT 1
            """,
            (token,),
        )
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=401, detail="Phien dang nhap da het han")
        return row
    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()


def _get_auth_from_token(authorization: str | None) -> dict:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Chua dang nhap")

    token = authorization.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Token khong hop le")

    conn = cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            """
            SELECT a.id AS admin_id, a.username, a.display_name
            FROM admin_sessions s
            JOIN admin_accounts a ON a.id = s.admin_id
            WHERE s.token=%s
              AND s.expires_at > NOW()
              AND a.status='active'
            LIMIT 1
            """,
            (token,),
        )
        admin = cursor.fetchone()
        if admin:
            return {"role": "admin", "user": _admin_payload(admin)}

        cursor.execute(
            """
            SELECT a.id AS account_id, a.person_id, a.username, a.email,
                   p.name, p.role, p.department
            FROM employee_sessions s
            JOIN employee_accounts a ON a.id = s.account_id
            JOIN persons p ON p.id = a.person_id
            WHERE s.token=%s
              AND s.expires_at > NOW()
              AND a.status='active'
              AND p.status='active'
            LIMIT 1
            """,
            (token,),
        )
        employee = cursor.fetchone()
        if employee:
            return {"role": "employee", "user": _employee_payload(employee)}

        raise HTTPException(status_code=401, detail="Phien dang nhap da het han")
    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()


def _get_admin_from_token(authorization: str | None) -> dict:
    auth = _get_auth_from_token(authorization)
    if auth.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Chi admin moi co quyen truy cap")
    return auth["user"]


ATTENDANCE_CACHE_TTL_SECONDS = 15
_attendance_cache: dict[str, tuple[float, dict]] = {}


def _attendance_cache_get(key: str) -> dict | None:
    cached = _attendance_cache.get(key)
    if not cached:
        return None
    expires_at, payload = cached
    if expires_at <= time.time():
        _attendance_cache.pop(key, None)
        return None
    return payload


def _attendance_cache_set(key: str, payload: dict, ttl: int = ATTENDANCE_CACHE_TTL_SECONDS) -> dict:
    _attendance_cache[key] = (time.time() + ttl, payload)
    if len(_attendance_cache) > 500:
        now = time.time()
        for item_key, (expires_at, _) in list(_attendance_cache.items()):
            if expires_at <= now:
                _attendance_cache.pop(item_key, None)
    return payload


def _attendance_cache_clear_person(person_id: str) -> None:
    marker = f":{person_id}:"
    suffix = f":{person_id}"
    for key in list(_attendance_cache.keys()):
        if marker in key or key.endswith(suffix):
            _attendance_cache.pop(key, None)


def _serialize_notification_rows(rows: list[dict]) -> list[dict]:
    for row in rows:
        for field in ("attendance_time", "created_at", "read_at"):
            value = row.get(field)
            if value and hasattr(value, "isoformat"):
                row[field] = _iso_vietnam(value)
        day_key = row.get("day_key")
        if day_key and hasattr(day_key, "isoformat"):
            row["day_key"] = day_key.isoformat()
        if row.get("confidence") is not None:
            row["confidence"] = float(row["confidence"])
        row["title"] = row.get("title") or "Da diem danh xong"
        row["message"] = row.get("message") or "He thong da ghi nhan diem danh thanh cong."
        row["status"] = row.get("status") or "unread"
    return rows


def _fetch_attendance_notifications(
    cursor,
    person_id: str,
    *,
    start_date: date | None = None,
    end_date: date | None = None,
    include_day_key: bool = False,
    limit: int | None = None,
    order: str = "DESC",
) -> list[dict]:
    order_sql = "ASC" if order.upper() == "ASC" else "DESC"
    limit_sql = f"LIMIT {max(1, min(int(limit), 500))}" if limit else ""

    notification_filters = ["n.person_id=%s"]
    notification_params: list = [person_id]
    if start_date is not None and end_date is not None:
        notification_filters.append("n.attendance_time >= %s")
        notification_filters.append("n.attendance_time < %s")
        notification_params.extend([start_date, end_date])
    notification_day_select = "DATE(n.attendance_time) AS day_key," if include_day_key else ""
    notification_where_sql = " AND ".join(notification_filters)

    log_filters = ["l.person_id=%s", "l.status='success'"]
    log_params: list = [person_id]
    if start_date is not None and end_date is not None:
        log_filters.append("l.created_at >= %s")
        log_filters.append("l.created_at < %s")
        log_params.extend([start_date, end_date])
    log_day_select = "DATE(l.created_at) AS day_key," if include_day_key else ""
    log_where_sql = " AND ".join(log_filters)

    notification_sql = f"""
        SELECT n.id, n.title, n.message, n.status,
               CAST(TIME(n.attendance_time) AS CHAR) AS time,
               CONCAT(LPAD(DAY(n.attendance_time), 2, '0'), '/', LPAD(MONTH(n.attendance_time), 2, '0'), '/', YEAR(n.attendance_time)) AS date,
               {notification_day_select}
               n.attendance_time, n.created_at, n.read_at,
               l.camera, l.action, l.confidence, l.status AS recognition_status
        FROM attendance_notifications n
        LEFT JOIN recognition_logs l ON l.id = n.recognition_log_id
        WHERE {notification_where_sql}
        ORDER BY n.attendance_time {order_sql}
        {limit_sql}
    """

    log_join_sql = f"""
        SELECT COALESCE(n.id, l.id) AS id,
               COALESCE(n.title, 'Da diem danh xong') AS title,
               COALESCE(n.message, 'He thong da ghi nhan diem danh thanh cong.') AS message,
               COALESCE(n.status, 'read') AS status,
               CAST(TIME(l.created_at) AS CHAR) AS time,
               CONCAT(LPAD(DAY(l.created_at), 2, '0'), '/', LPAD(MONTH(l.created_at), 2, '0'), '/', YEAR(l.created_at)) AS date,
               {log_day_select}
               COALESCE(n.attendance_time, l.created_at) AS attendance_time,
               COALESCE(n.created_at, l.created_at) AS created_at,
               n.read_at,
               l.camera, l.action, l.confidence, l.status AS recognition_status
        FROM recognition_logs l
        LEFT JOIN attendance_notifications n ON n.recognition_log_id = l.id
        WHERE {log_where_sql}
        ORDER BY l.created_at {order_sql}
        {limit_sql}
    """
    log_plain_sql = f"""
        SELECT l.id,
               'Da diem danh xong' AS title,
               'He thong da ghi nhan diem danh thanh cong.' AS message,
               'read' AS status,
               CAST(TIME(l.created_at) AS CHAR) AS time,
               CONCAT(LPAD(DAY(l.created_at), 2, '0'), '/', LPAD(MONTH(l.created_at), 2, '0'), '/', YEAR(l.created_at)) AS date,
               {log_day_select}
               l.created_at AS attendance_time,
               l.created_at AS created_at,
               NULL AS read_at,
               l.camera, l.action, l.confidence, l.status AS recognition_status
        FROM recognition_logs l
        WHERE {log_where_sql}
        ORDER BY l.created_at {order_sql}
        {limit_sql}
    """

    try:
        cursor.execute(log_join_sql, tuple(log_params))
    except Exception as exc:
        logger.warning(f"[Attendance] Fallback query without notification join: {exc}")
        cursor.execute(log_plain_sql, tuple(log_params))
    log_rows = cursor.fetchall()
    if log_rows:
        return _serialize_notification_rows(log_rows)

    try:
        cursor.execute(notification_sql, tuple(notification_params))
        return _serialize_notification_rows(cursor.fetchall())
    except Exception as exc:
        logger.warning(f"[Attendance] Notification query failed after empty recognition logs: {exc}")
        return []


ATTENDANCE_NOTIFICATION_DEDUP_SECONDS = int(os.getenv("ATTENDANCE_NOTIFICATION_DEDUP_SECONDS", "45"))


def save_log_to_db(log_queries: list) -> None:
    if not log_queries:
        return
    conn = cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.executemany(
            "INSERT INTO recognition_logs (id,person_id,status,confidence,camera,action) VALUES (%s,%s,%s,%s,%s,%s)",
            log_queries,
        )
        conn.commit()
        for _, person_id, status, *_ in log_queries:
            if person_id and status == "success":
                _attendance_cache_clear_person(person_id)

        notification_queries = []
        for log_id, person_id, status, confidence, camera, action in log_queries:
            if status != "success" or not person_id:
                continue

            cursor.execute(
                """
                SELECT id
                FROM attendance_notifications
                WHERE person_id=%s AND attendance_time >= %s
                LIMIT 1
                """,
                (person_id, _now_vietnam() - timedelta(seconds=ATTENDANCE_NOTIFICATION_DEDUP_SECONDS)),
            )
            if cursor.fetchone():
                continue

            notification_queries.append((
                str(uuid.uuid4()),
                person_id,
                log_id,
                "Đã điểm danh xong",
                "Hệ thống đã ghi nhận điểm danh thành công.",
            ))

        if notification_queries:
            cursor.executemany(
                """
                INSERT INTO attendance_notifications
                  (id, person_id, recognition_log_id, title, message)
                VALUES (%s, %s, %s, %s, %s)
                """,
                notification_queries,
            )

        conn.commit()
    except Exception as e:
        logger.error(f"[Log] {e}", exc_info=True)
    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()


# ═══════════════════════════════════════════════════════════════════════════
# API OCR  ─  YOLO cho mặt trước / Gemini cho mặt sau
# ═══════════════════════════════════════════════════════════════════════════

@app.post("/api/face/ocr")
async def extract_ocr_local(file: UploadFile = File(...), side: str = Form(...)):
    if not is_ai_ready:
        return {
            "success": False,
            "message": "Hệ thống AI đang khởi động, vui lòng thử lại sau 1-2 phút!",
        }

    temp_path = ""
    try:
        temp_filename = f"temp_cccd_{uuid.uuid4().hex}.jpg"
        temp_path     = os.path.join(UPLOAD_DIR, temp_filename)
        file_bytes    = await file.read()
        with open(temp_path, "wb") as f:
            f.write(file_bytes)

        logger.info(f"[OCR] Phân tích mặt {side}...")

        if side == "front":
            # ── YOLO + VietOCR ─────────────────────────────────────────────
            raw = read_info.get_all_info(temp_path)
            logger.info(f"[OCR] Mặt trước raw: {raw}")
            mapped_data = {
                "id_number":   raw.get("id", ""),
                "full_name":   raw.get("full_name", ""),
                "dob":         raw.get("date_of_birth", ""),
                "gender":      raw.get("sex", ""),
                "nationality": raw.get("nationality", ""),
                "hometown":    raw.get("place_of_origin", ""),
                "address":     raw.get("place_of_residence", ""),
                "expiry_date": raw.get("date_of_expiry", ""),
            }

        else:
            # ── Gemini Vision ───────────────────────────────────────────────
            raw = read_info.get_back_info(temp_path)
            logger.info(f"[OCR] Mặt sau raw: {raw}")
            mapped_data = {
                "issue_date":       raw.get("issue_date", ""),
                "issued_by":        raw.get("issued_by", ""),
                "special_features": raw.get("special_features", ""),
                # MRZ
                "mrz_id":           raw.get("mrz_id", ""),
                "mrz_dob":          raw.get("mrz_dob", ""),
                "mrz_gender":       raw.get("mrz_gender", ""),
                "mrz_expiry":       raw.get("mrz_expiry", ""),
                "mrz_name":         raw.get("mrz_name", ""),
                # Alias cho React (tránh break UI cũ)
                "id_number":        raw.get("mrz_id", ""),
                "full_name":        raw.get("mrz_name", ""),
                "dob":              raw.get("mrz_dob", ""),
                "gender":           raw.get("mrz_gender", ""),
                "expiry_date":      raw.get("mrz_expiry", ""),
            }

        if os.path.exists(temp_path):
            os.remove(temp_path)

        logger.info(f"[OCR] Trả về React: {mapped_data}")
        return {"success": True, "data": mapped_data}

    except Exception as e:
        logger.error(f"[OCR] Lỗi: {e}", exc_info=True)
        if os.path.exists(temp_path):
            os.remove(temp_path)
        return {"success": False, "message": str(e), "data": {}}


# ═══════════════════════════════════════════════════════════════════════════
# NHẬN DIỆN KHUÔN MẶT
# ═══════════════════════════════════════════════════════════════════════════

@app.post("/api/face/recognize")
async def recognize(background_tasks: BackgroundTasks, image: UploadFile = File(...)):
    t0         = time.time()
    file_bytes = await image.read()
    detections = face_ai_service.extract_faces(file_bytes)

    if not detections:
        return {"success": True, "data": {"detected": False, "faces": []}}

    results, log_queries = [], []
    today = _today_vietnam()

    for face in detections:
        bbox  = face["box"]
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
                log_queries.append((str(uuid.uuid4()), match["person_id"], "unknown", 0, "Cổng Chính", "Tu choi"))
                continue

            confidence = round(max(0.0, (1.0 - match["distance"]) * 100.0), 2)
            img_url    = f"/uploads/{Path(match['img_path']).name}" if match.get("img_path") else ""
            logger.info(f"[Recognize] {match['name']} dist={match['distance']:.4f} conf={confidence:.1f}%")
            results.append({
                "id": match["person_id"], "name": match["name"],
                "role": match["role"], "img": img_url,
                "status": "success", "confidence": confidence,
                "bbox": bbox, "expiry_date": expiry_str,
                "attendance_message": "Đã điểm danh xong",
            })
            log_queries.append((str(uuid.uuid4()), match["person_id"], "success", confidence, "Cổng Chính", "Vao"))
        else:
            results.append({
                "id": None, "name": "Người Lạ", "role": "", "img": "",
                "status": "unknown", "confidence": 0, "bbox": bbox,
            })
            log_queries.append((str(uuid.uuid4()), None, "unknown", 0, "Cổng Chính", "Tu choi"))

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


# ═══════════════════════════════════════════════════════════════════════════
# ĐĂNG KÝ
# ═══════════════════════════════════════════════════════════════════════════

@app.post("/api/face/register")
async def register(
    name:             str = Form(...),
    email:            str = Form(""),
    role:             str = Form(""),
    department:       str = Form(""),
    work_expiry_date: str = Form(""),
    cccd_info:        str = Form("{}"),
    images:           list[UploadFile] = File(...),
    cccd_front:       UploadFile = File(None),
    cccd_back:        UploadFile = File(None),
    authorization:    str | None = Header(default=None),
):
    _get_admin_from_token(authorization)
    conn      = get_db_connection()
    cursor    = conn.cursor()
    person_id = str(uuid.uuid4())
    new_encodings: list[tuple] = []
    avatar_path  = ""
    saved_files  = []
    COSINE_THRESHOLD = 0.3

    try:
        cccd        = json.loads(cccd_info) if cccd_info else {}
        expiry_val  = work_expiry_date or None
        cccd_number = cccd.get("id_number")
        email_value = (email or "").strip().lower()
        account_name = (cccd.get("full_name") or name or "").strip()

        if not email_value or not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email_value):
            raise Exception("Vui long nhap email nhan vien hop le.")

        if cccd_number:
            cursor.execute("SELECT id FROM citizen_ids WHERE id_number = %s", (cccd_number,))
            if cursor.fetchone():
                raise Exception("Số CCCD này đã được đăng ký trong hệ thống!")

        user_descriptor = None
        avatar_b64 = ""
        sample_errors = []
        for i, img_file in enumerate(images):
            img_bytes  = await img_file.read()
            detections = face_ai_service.extract_faces(img_bytes)

            if len(detections) == 0:
                sample_errors.append(f"Anh mau {i + 1}: khong tim thay khuon mat.")
                continue
                raise Exception(f"Không tìm thấy khuôn mặt trong ảnh mẫu thứ {i + 1}.")
            if len(detections) > 1:
                sample_errors.append(f"Anh mau {i + 1}: co nhieu hon 1 khuon mat.")
                continue
                raise Exception(f"Ảnh mẫu thứ {i + 1} có nhiều hơn 1 khuôn mặt.")

            descriptor = detections[0]["descriptor"]
            emb_id     = str(uuid.uuid4())
            img_b64    = face_ai_service.bytes_to_base64(img_bytes)

            if user_descriptor is None:
                user_descriptor = descriptor
                avatar_b64      = img_b64
                cursor.execute(
                    """INSERT INTO persons
                          (id, name, role, department, status, img_url, img_path, work_expiry_date)
                        VALUES (%s, %s, %s, %s, 'active', %s, '', %s)""",
                    (person_id, name, role, department, avatar_b64, expiry_val),
                )

            cursor.execute(
                "INSERT INTO face_embeddings (id, person_id, embedding_vector, img_base64) VALUES (%s, %s, %s, %s)",
                (emb_id, person_id, json.dumps(descriptor), img_b64),
            )
            new_encodings.append((person_id, name, role, avatar_b64, expiry_val, descriptor))

        if user_descriptor is None:
            detail = " ".join(sample_errors[:3])
            raise Exception(f"Khong tim thay khuon mat hop le trong cac anh mau. {detail}".strip())

        front_b64 = back_b64 = ""

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

                front_b64 = face_ai_service.bytes_to_base64(fb_bytes)

        if cccd_back:
            bb_bytes = await cccd_back.read()
            if bb_bytes:
                back_b64 = face_ai_service.bytes_to_base64(bb_bytes)

        cursor.execute("""
            INSERT INTO citizen_ids
              (id, person_id, front_img_path, back_img_path, front_img_base64, back_img_base64,
               id_number, full_name, dob, gender, nationality,
               hometown, address, expiry_date, issue_date, special_features)
            VALUES (%s,%s,'','',%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        """, (
            str(uuid.uuid4()), person_id,
            front_b64 or None, back_b64 or None,
            cccd.get("id_number"),           cccd.get("full_name"),
            cccd.get("dob"),                 cccd.get("gender"),
            cccd.get("nationality", "Việt Nam"),
            cccd.get("hometown"),            cccd.get("address"),
            cccd.get("expiry_date"),         cccd.get("issue_date"),
            cccd.get("special_features"),
        ))

        account_info = create_employee_account_for_registration(
            cursor,
            person_id,
            account_name or name,
            email_value,
        )

        conn.commit()
        account_info["email_sent"] = _send_employee_welcome_email(account_info)

        for pid, pname, prole, pimg, pexpiry, enc in new_encodings:
            face_memory_store.add(pid, pname, prole, pimg, enc, work_expiry_date=pexpiry)

        logger.info(f"[Register] {name} | {len(new_encodings)} mẫu | RAM: {face_memory_store.count}")
        return {
            "success":  True,
            "message":  f"Đã đăng ký {name} với {len(new_encodings)} mẫu.",
            "img_url":  f"/uploads/{Path(avatar_path).name}" if avatar_path else "",
            "ramCount": face_memory_store.count,
            "account":  account_info,
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
# CÁC API KHÁC
# ═══════════════════════════════════════════════════════════════════════════

@app.post("/api/auth/login")
async def auth_login(payload: EmployeeLoginRequest):
    identifier = (payload.identifier or "").strip()
    password = payload.password or ""
    if not identifier or not password:
        return JSONResponse(
            status_code=400,
            content={"success": False, "error": "Vui long nhap tai khoan va mat khau"},
        )

    conn = cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT id AS admin_id, username, password_hash, password_salt, display_name
            FROM admin_accounts
            WHERE username=%s AND status='active'
            LIMIT 1
            """,
            (identifier,),
        )
        admin = cursor.fetchone()
        if admin:
            expected_hash = _hash_password(password, admin["password_salt"])
            if not secrets.compare_digest(expected_hash, admin["password_hash"]):
                return JSONResponse(status_code=401, content={"success": False, "error": "Sai tai khoan hoac mat khau"})

            token = secrets.token_urlsafe(48)
            expires_at = _now_vietnam() + timedelta(days=30)
            cursor.execute(
                """
                INSERT INTO admin_sessions (id, admin_id, token, expires_at)
                VALUES (%s, %s, %s, %s)
                """,
                (str(uuid.uuid4()), admin["admin_id"], token, expires_at),
            )
            cursor.execute("UPDATE admin_accounts SET last_login_at=NOW() WHERE id=%s", (admin["admin_id"],))
            conn.commit()

            return {
                "success": True,
                "role": "admin",
                "token": token,
                "user": _admin_payload(admin),
                "expires_at": _iso_vietnam(expires_at),
            }

        cursor.execute(
            """
            SELECT a.id AS account_id, a.person_id, a.username, a.email,
                   a.password_hash, a.password_salt,
                   p.name, p.role, p.department
            FROM employee_accounts a
            JOIN persons p ON p.id = a.person_id
            WHERE a.username=%s
              AND a.status='active'
              AND p.status='active'
            LIMIT 1
            """,
            (identifier,),
        )
        account = cursor.fetchone()

        if not account:
            cursor.execute(
                """
                SELECT p.id AS person_id
                FROM citizen_ids c
                JOIN persons p ON p.id = c.person_id
                WHERE c.id_number=%s AND p.status='active'
                LIMIT 1
                """,
                (identifier,),
            )
            person = cursor.fetchone()
            if person:
                ensure_employee_account(cursor, person["person_id"], identifier)
                cursor.execute(
                    """
                    SELECT a.id AS account_id, a.person_id, a.username, a.email,
                           a.password_hash, a.password_salt,
                           p.name, p.role, p.department
                    FROM employee_accounts a
                    JOIN persons p ON p.id = a.person_id
                    WHERE a.username=%s
                      AND a.status='active'
                      AND p.status='active'
                    LIMIT 1
                    """,
                    (identifier,),
                )
                account = cursor.fetchone()

        if not account:
            return JSONResponse(status_code=401, content={"success": False, "error": "Sai tai khoan hoac mat khau"})

        expected_hash = _hash_password(password, account["password_salt"])
        if not secrets.compare_digest(expected_hash, account["password_hash"]):
            return JSONResponse(status_code=401, content={"success": False, "error": "Sai tai khoan hoac mat khau"})

        token = secrets.token_urlsafe(48)
        expires_at = _now_vietnam() + timedelta(days=30)
        cursor.execute(
            """
            INSERT INTO employee_sessions (id, account_id, token, expires_at)
            VALUES (%s, %s, %s, %s)
            """,
            (str(uuid.uuid4()), account["account_id"], token, expires_at),
        )
        cursor.execute("UPDATE employee_accounts SET last_login_at=NOW() WHERE id=%s", (account["account_id"],))
        conn.commit()

        return {
            "success": True,
            "role": "employee",
            "token": token,
            "user": _employee_payload(account),
            "expires_at": _iso_vietnam(expires_at),
        }
    except Exception as e:
        if conn:
            conn.rollback()
        logger.error(f"[Auth Login] {e}", exc_info=True)
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})
    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()


@app.get("/api/auth/me")
async def auth_me(authorization: str | None = Header(default=None)):
    auth = _get_auth_from_token(authorization)
    return {"success": True, **auth}


@app.post("/api/auth/reset-password")
async def reset_password(payload: ResetPasswordRequest):
    token = (payload.token or "").strip()
    password = payload.password or ""
    if not token or len(password) < 6:
        return JSONResponse(
            status_code=400,
            content={"success": False, "error": "Token hoac mat khau khong hop le"},
        )

    conn = cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            """
            SELECT id
            FROM employee_accounts
            WHERE password_reset_token=%s
              AND password_reset_expires_at > NOW()
              AND status='active'
            LIMIT 1
            """,
            (token,),
        )
        account = cursor.fetchone()
        if not account:
            return JSONResponse(status_code=400, content={"success": False, "error": "Link doi mat khau da het han"})

        salt = secrets.token_hex(16)
        cursor.execute(
            """
            UPDATE employee_accounts
            SET password_hash=%s,
                password_salt=%s,
                password_reset_token=NULL,
                password_reset_expires_at=NULL,
                must_change_password=0
            WHERE id=%s
            """,
            (_hash_password(password, salt), salt, account["id"]),
        )
        conn.commit()
        return {"success": True, "message": "Da doi mat khau thanh cong"}
    except Exception as e:
        if conn:
            conn.rollback()
        logger.error(f"[Reset Password] {e}", exc_info=True)
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})
    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()


@app.post("/api/auth/face-login")
async def auth_face_login(image: UploadFile = File(...)):
    file_bytes = await image.read()
    detections = face_ai_service.extract_faces(file_bytes)

    if not detections:
        return JSONResponse(status_code=400, content={"success": False, "error": "Khong tim thay khuon mat"})
    if len(detections) > 1:
        return JSONResponse(status_code=400, content={"success": False, "error": "Chi de mot khuon mat trong khung hinh"})

    match = face_memory_store.find_best_match(np.array(detections[0]["descriptor"], dtype=np.float32))
    if not match:
        return JSONResponse(status_code=401, content={"success": False, "error": "Khuon mat chua duoc dang ky"})

    expiry_str = match.get("work_expiry_date")
    if expiry_str and date.fromisoformat(expiry_str) < _today_vietnam():
        return JSONResponse(status_code=403, content={"success": False, "error": "Ho so nhan vien da het han"})

    conn = cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            """
            SELECT a.id AS account_id, a.person_id, a.username, a.email,
                   p.name, p.role, p.department
            FROM employee_accounts a
            JOIN persons p ON p.id = a.person_id
            WHERE a.person_id=%s
              AND a.status='active'
              AND p.status='active'
            LIMIT 1
            """,
            (match["person_id"],),
        )
        account = cursor.fetchone()

        if not account:
            cursor.execute(
                """
                SELECT id_number
                FROM citizen_ids
                WHERE person_id=%s
                ORDER BY created_at DESC
                LIMIT 1
                """,
                (match["person_id"],),
            )
            citizen = cursor.fetchone()
            username = (citizen or {}).get("id_number") or match["person_id"]
            ensure_employee_account(cursor, match["person_id"], username)
            cursor.execute(
                """
                SELECT a.id AS account_id, a.person_id, a.username, a.email,
                       p.name, p.role, p.department
                FROM employee_accounts a
                JOIN persons p ON p.id = a.person_id
                WHERE a.person_id=%s
                  AND a.status='active'
                  AND p.status='active'
                LIMIT 1
                """,
                (match["person_id"],),
            )
            account = cursor.fetchone()

        if not account:
            return JSONResponse(status_code=403, content={"success": False, "error": "Tai khoan nhan vien chua san sang"})

        token, expires_at = create_employee_session(cursor, account)
        conn.commit()

        confidence = round(max(0.0, (1.0 - match["distance"]) * 100.0), 2)
        return {
            "success": True,
            "role": "employee",
            "token": token,
            "user": _employee_payload(account),
            "expires_at": _iso_vietnam(expires_at),
            "confidence": confidence,
        }
    except Exception as e:
        if conn:
            conn.rollback()
        logger.error(f"[Face Login] {e}", exc_info=True)
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})
    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()


@app.post("/api/employee/login")
async def employee_login(payload: EmployeeLoginRequest):
    identifier = (payload.identifier or "").strip()
    password = payload.password or ""
    if not identifier or not password:
        return JSONResponse(
            status_code=400,
            content={"success": False, "error": "Vui long nhap tai khoan va mat khau"},
        )

    conn = cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            """
            SELECT a.id AS account_id, a.person_id, a.username, a.email,
                   a.password_hash, a.password_salt,
                   p.name, p.role, p.department
            FROM employee_accounts a
            JOIN persons p ON p.id = a.person_id
            WHERE a.username=%s
              AND a.status='active'
              AND p.status='active'
            LIMIT 1
            """,
            (identifier,),
        )
        account = cursor.fetchone()

        if not account:
            cursor.execute(
                """
                SELECT p.id AS person_id
                FROM citizen_ids c
                JOIN persons p ON p.id = c.person_id
                WHERE c.id_number=%s AND p.status='active'
                LIMIT 1
                """,
                (identifier,),
            )
            person = cursor.fetchone()
            if person:
                ensure_employee_account(cursor, person["person_id"], identifier)
                cursor.execute(
                    """
                    SELECT a.id AS account_id, a.person_id, a.username, a.email,
                           a.password_hash, a.password_salt,
                           p.name, p.role, p.department
                    FROM employee_accounts a
                    JOIN persons p ON p.id = a.person_id
                    WHERE a.username=%s
                      AND a.status='active'
                      AND p.status='active'
                    LIMIT 1
                    """,
                    (identifier,),
                )
                account = cursor.fetchone()

        if not account:
            return JSONResponse(status_code=401, content={"success": False, "error": "Sai tai khoan hoac mat khau"})

        expected_hash = _hash_password(password, account["password_salt"])
        if not secrets.compare_digest(expected_hash, account["password_hash"]):
            return JSONResponse(status_code=401, content={"success": False, "error": "Sai tai khoan hoac mat khau"})

        token = secrets.token_urlsafe(48)
        expires_at = _now_vietnam() + timedelta(days=30)
        cursor.execute(
            """
            INSERT INTO employee_sessions (id, account_id, token, expires_at)
            VALUES (%s, %s, %s, %s)
            """,
            (str(uuid.uuid4()), account["account_id"], token, expires_at),
        )
        cursor.execute(
            "UPDATE employee_accounts SET last_login_at=NOW() WHERE id=%s",
            (account["account_id"],),
        )
        conn.commit()

        return {
            "success": True,
            "token": token,
            "employee": _employee_payload(account),
            "expires_at": _iso_vietnam(expires_at),
        }
    except Exception as e:
        if conn:
            conn.rollback()
        logger.error(f"[Employee Login] {e}", exc_info=True)
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})
    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()


@app.get("/api/employee/me")
async def employee_me(authorization: str | None = Header(default=None)):
    employee = _get_employee_from_token(authorization)
    return {"success": True, "employee": _employee_payload(employee)}


@app.get("/api/employee/notifications")
async def employee_notifications(authorization: str | None = Header(default=None)):
    employee = _get_employee_from_token(authorization)
    cache_key = f"employee_notifications:{employee['person_id']}"
    cached = _attendance_cache_get(cache_key)
    if cached:
        return cached
    conn = cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        rows = _fetch_attendance_notifications(
            cursor,
            employee["person_id"],
            limit=50,
            order="DESC",
        )
        unread = sum(1 for row in rows if row.get("status") == "unread")
        return _attendance_cache_set(cache_key, {"success": True, "data": rows, "unread": unread})
    except Exception as e:
        logger.error(f"[Employee Notifications] {employee.get('person_id')}: {e}", exc_info=True)
        return {
            "success": True,
            "data": [],
            "unread": 0,
            "warning": "Khong the tai thong bao diem danh, da tra ve danh sach rong.",
        }
    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()


@app.get("/api/employee/attendance")
async def employee_attendance_calendar(
    year: int | None = None,
    month: int | None = None,
    authorization: str | None = Header(default=None),
):
    employee = _get_employee_from_token(authorization)
    today = _today_vietnam()
    target_year = year or today.year
    target_month = month or today.month
    if target_month < 1 or target_month > 12:
        return JSONResponse(status_code=400, content={"success": False, "error": "Thang khong hop le"})

    cache_key = f"employee_attendance:{employee['person_id']}:{target_year}:{target_month}"
    cached = _attendance_cache_get(cache_key)
    if cached:
        return cached

    start_date = date(target_year, target_month, 1)
    if target_month == 12:
        end_date = date(target_year + 1, 1, 1)
    else:
        end_date = date(target_year, target_month + 1, 1)

    conn = cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        rows = _fetch_attendance_notifications(
            cursor,
            employee["person_id"],
            start_date=start_date,
            end_date=end_date,
            include_day_key=True,
            order="ASC",
        )
        return _attendance_cache_set(cache_key, {"success": True, "data": rows, "year": target_year, "month": target_month})
    except Exception as e:
        logger.error(f"[Employee Attendance] {employee.get('person_id')}: {e}", exc_info=True)
        return {
            "success": True,
            "data": [],
            "year": target_year,
            "month": target_month,
            "warning": "Khong the tai lich diem danh, da tra ve lich rong.",
        }
    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()


@app.post("/api/employee/notifications/read")
async def mark_employee_notifications_read(
    payload: NotificationReadRequest,
    authorization: str | None = Header(default=None),
):
    employee = _get_employee_from_token(authorization)
    conn = cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        ids = [item for item in (payload.notification_ids or []) if item]

        if ids:
            placeholders = ",".join(["%s"] * len(ids))
            cursor.execute(
                f"""
                UPDATE attendance_notifications
                SET status='read', read_at=NOW()
                WHERE person_id=%s AND id IN ({placeholders})
                """,
                (employee["person_id"], *ids),
            )
        else:
            cursor.execute(
                """
                UPDATE attendance_notifications
                SET status='read', read_at=NOW()
                WHERE person_id=%s AND status='unread'
                """,
                (employee["person_id"],),
            )

        conn.commit()
        _attendance_cache_clear_person(employee["person_id"])
        return {"success": True, "updated": cursor.rowcount}
    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()


@app.get("/api/admin/employees")
async def admin_employees(authorization: str | None = Header(default=None)):
    _get_admin_from_token(authorization)
    conn = cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        query_with_attendance = """
            SELECT p.id AS person_id, p.name, p.role, p.department, p.status,
                   p.work_expiry_date,
                   a.username, a.email, a.last_login_at, a.must_change_password,
                   c.id_number,
                   (
                       SELECT MAX(l.created_at)
                       FROM recognition_logs l
                       WHERE l.person_id = p.id AND l.status='success'
                   ) AS last_attendance_time,
                   (
                       SELECT COUNT(*)
                       FROM attendance_notifications n
                       WHERE n.person_id = p.id AND n.status='unread'
                   ) AS unread
            FROM persons p
            LEFT JOIN employee_accounts a ON a.person_id = p.id
            LEFT JOIN citizen_ids c ON c.person_id = p.id
            WHERE p.status='active'
            ORDER BY p.name ASC
            """
        query_without_notifications = """
            SELECT p.id AS person_id, p.name, p.role, p.department, p.status,
                   p.work_expiry_date,
                   a.username, a.email, a.last_login_at, a.must_change_password,
                   c.id_number,
                   (
                       SELECT MAX(l.created_at)
                       FROM recognition_logs l
                       WHERE l.person_id = p.id AND l.status='success'
                   ) AS last_attendance_time,
                   0 AS unread
            FROM persons p
            LEFT JOIN employee_accounts a ON a.person_id = p.id
            LEFT JOIN citizen_ids c ON c.person_id = p.id
            WHERE p.status='active'
            ORDER BY p.name ASC
            """
        query_without_logs = """
            SELECT p.id AS person_id, p.name, p.role, p.department, p.status,
                   p.work_expiry_date,
                   a.username, a.email, a.last_login_at, a.must_change_password,
                   c.id_number,
                   NULL AS last_attendance_time,
                   0 AS unread
            FROM persons p
            LEFT JOIN employee_accounts a ON a.person_id = p.id
            LEFT JOIN citizen_ids c ON c.person_id = p.id
            WHERE p.status='active'
            ORDER BY p.name ASC
            """
        try:
            cursor.execute(query_with_attendance)
        except Exception as e:
            logger.warning(f"[Admin Employees] Fallback list without notification stats: {e}")
            try:
                cursor.execute(query_without_notifications)
            except Exception as inner_e:
                logger.warning(f"[Admin Employees] Fallback list without attendance logs: {inner_e}")
                cursor.execute(query_without_logs)
        rows = cursor.fetchall()
        for row in rows:
            for field in ("work_expiry_date", "last_login_at", "last_attendance_time"):
                if row.get(field):
                    row[field] = _iso_vietnam(row[field])
            row["unread"] = int(row.get("unread") or 0)
            row["must_change_password"] = bool(row.get("must_change_password"))
        return {"success": True, "data": rows}
    except Exception as e:
        logger.error(f"[Admin Employees] {e}", exc_info=True)
        return {
            "success": True,
            "data": [],
            "warning": "Khong the tai danh sach nhan vien, da tra ve danh sach rong.",
        }
    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()


@app.get("/api/admin/employees/{person_id}/notifications")
async def admin_employee_notifications(
    person_id: str,
    authorization: str | None = Header(default=None),
):
    _get_admin_from_token(authorization)
    cache_key = f"admin_notifications:{person_id}"
    cached = _attendance_cache_get(cache_key)
    if cached:
        return cached
    conn = cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        rows = _fetch_attendance_notifications(
            cursor,
            person_id,
            limit=100,
            order="DESC",
        )
        unread = sum(1 for row in rows if row.get("status") == "unread")
        return _attendance_cache_set(cache_key, {"success": True, "data": rows, "unread": unread})
    except Exception as e:
        logger.error(f"[Admin Employee Notifications] {person_id}: {e}", exc_info=True)
        return {
            "success": True,
            "data": [],
            "unread": 0,
            "warning": "Khong the tai thong bao diem danh, da tra ve danh sach rong.",
        }
    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()


@app.get("/api/admin/employees/{person_id}/attendance")
async def admin_employee_attendance_calendar(
    person_id: str,
    year: int | None = None,
    month: int | None = None,
    authorization: str | None = Header(default=None),
):
    _get_admin_from_token(authorization)
    today = _today_vietnam()
    target_year = year or today.year
    target_month = month or today.month
    if target_month < 1 or target_month > 12:
        return JSONResponse(status_code=400, content={"success": False, "error": "Thang khong hop le"})

    cache_key = f"admin_attendance:{person_id}:{target_year}:{target_month}"
    cached = _attendance_cache_get(cache_key)
    if cached:
        return cached

    start_date = date(target_year, target_month, 1)
    end_date = date(target_year + 1, 1, 1) if target_month == 12 else date(target_year, target_month + 1, 1)

    conn = cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        rows = _fetch_attendance_notifications(
            cursor,
            person_id,
            start_date=start_date,
            end_date=end_date,
            include_day_key=True,
            order="ASC",
        )
        return _attendance_cache_set(cache_key, {"success": True, "data": rows, "year": target_year, "month": target_month})
    except Exception as e:
        logger.error(f"[Admin Employee Attendance] {person_id}: {e}", exc_info=True)
        return {
            "success": True,
            "data": [],
            "year": target_year,
            "month": target_month,
            "warning": "Khong the tai lich diem danh, da tra ve lich rong.",
        }
    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()


@app.get("/api/face/persons")
async def get_persons():
    conn   = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT p.id, p.name, p.role, p.department, p.status,
                   p.work_expiry_date, p.img_url, p.img_path,
                   p.registered_at, p.updated_at,
                   (SELECT COUNT(*) FROM face_embeddings e WHERE e.person_id = p.id) AS embeddings,
                   (SELECT COUNT(*) FROM recognition_logs l WHERE l.person_id = p.id AND l.status = 'success') AS recognitions,
                   c.id AS citizen_id_record_id,
                   c.front_img_path, c.back_img_path, c.front_img_base64, c.back_img_base64,
                   c.id_number, c.full_name, c.dob, c.gender, c.nationality,
                   c.hometown, c.address, c.expiry_date, c.issue_date,
                   c.special_features, c.created_at AS citizen_created_at
            FROM persons p
            LEFT JOIN citizen_ids c ON c.person_id = p.id
            ORDER BY p.registered_at DESC
        """)
        rows  = cursor.fetchall()
        today = str(_today_vietnam())
        for row in rows:
            raw_avatar = row.get("img_path") or ""
            raw_front  = row.get("front_img_path") or ""
            raw_back   = row.get("back_img_path") or ""
            row["img"]           = row.get("img_url") or (f"/uploads/{Path(raw_avatar).name}" if raw_avatar else "")
            row["cccd_front_img"] = row.get("front_img_base64") or (f"/uploads/{Path(raw_front).name}" if raw_front else "")
            row["cccd_back_img"]  = row.get("back_img_base64") or (f"/uploads/{Path(raw_back).name}" if raw_back else "")
            row["registered"]    = row.get("registered_at")
            exp = row.get("work_expiry_date")
            row["is_expired"]    = bool(exp and str(exp) < today)
        return {"success": True, "data": rows, "total": len(rows), "ramCount": face_memory_store.count}
    finally:
        cursor.close()
        conn.close()


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
        row  = cursor.fetchone()
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
    conn   = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT l.id, COALESCE(p.name, 'Người lạ') AS name,
                   DATE_FORMAT(l.created_at, '%H:%i:%s') AS time,
                   DATE_FORMAT(l.created_at, '%d/%m/%Y') AS date,
                   l.status, l.confidence, l.camera,
                   CASE l.action
                       WHEN 'Vao' THEN 'Vào'
                       WHEN 'Ra' THEN 'Ra'
                       WHEN 'Tu choi' THEN 'Từ chối'
                       WHEN 'Loi' THEN 'Lỗi'
                       ELSE l.action
                   END AS action,
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
        hourly   = {f"{i:02d}:00": {"nhận_diện": 0, "từ_chối": 0, "lạ": 0} for i in range(24)}
        days     = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"]
        weekly   = {d: 0 for d in days}
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
