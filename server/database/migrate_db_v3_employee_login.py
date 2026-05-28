import hashlib
import os
import re
import secrets
import sys
import uuid
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent))
from database import get_db_connection

DEFAULT_ADMIN_USERNAME = "admin"
DEFAULT_ADMIN_PASSWORD = "123456"
DEFAULT_ADMIN_NAME = "Administrator"


def default_employee_password(username: str) -> str:
    digits = re.sub(r"\D", "", username or "")
    if len(digits) >= 6:
        return digits[-6:]
    return digits or (username or "123456")[-6:] or "123456"


def hash_password(password: str, salt: str) -> str:
    return hashlib.sha256(f"{salt}:{password}".encode("utf-8")).hexdigest()


def column_exists(cursor, table_name: str, column_name: str) -> bool:
    cursor.execute(f"SHOW COLUMNS FROM {table_name} LIKE %s", (column_name,))
    return cursor.fetchone() is not None


def index_exists(cursor, table_name: str, index_name: str) -> bool:
    cursor.execute(
        """
        SELECT COUNT(1) AS total
        FROM information_schema.statistics
        WHERE table_schema = DATABASE()
          AND table_name = %s
          AND index_name = %s
        """,
        (table_name, index_name),
    )
    row = cursor.fetchone()
    return bool(row and (row["total"] if isinstance(row, dict) else row[0]))


def ensure_employee_columns(cursor) -> None:
    additions = [
        ("email", "ALTER TABLE employee_accounts ADD COLUMN email VARCHAR(255) NULL AFTER username"),
        ("password_reset_token", "ALTER TABLE employee_accounts ADD COLUMN password_reset_token VARCHAR(128) NULL AFTER password_salt"),
        ("password_reset_expires_at", "ALTER TABLE employee_accounts ADD COLUMN password_reset_expires_at TIMESTAMP NULL AFTER password_reset_token"),
        ("must_change_password", "ALTER TABLE employee_accounts ADD COLUMN must_change_password TINYINT(1) NOT NULL DEFAULT 1 AFTER password_reset_expires_at"),
    ]
    for column_name, statement in additions:
        if not column_exists(cursor, "employee_accounts", column_name):
            cursor.execute(statement)

    indexes = [
        ("idx_employee_email", "CREATE INDEX idx_employee_email ON employee_accounts (email)"),
        ("idx_employee_reset_token", "CREATE INDEX idx_employee_reset_token ON employee_accounts (password_reset_token)"),
    ]
    for index_name, statement in indexes:
        if not index_exists(cursor, "employee_accounts", index_name):
            cursor.execute(statement)


def ensure_recognition_log_columns(cursor) -> None:
    additions = [
        ("status", "ALTER TABLE recognition_logs ADD COLUMN status ENUM('success', 'unknown', 'error') DEFAULT 'unknown' AFTER person_id"),
        ("confidence", "ALTER TABLE recognition_logs ADD COLUMN confidence DECIMAL(5, 2) NULL AFTER status"),
        ("camera", "ALTER TABLE recognition_logs ADD COLUMN camera VARCHAR(100) NULL AFTER confidence"),
        ("action", "ALTER TABLE recognition_logs ADD COLUMN action ENUM('Vao', 'Ra', 'Tu choi', 'Loi') DEFAULT 'Vao' AFTER camera"),
        ("created_at", "ALTER TABLE recognition_logs ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER action"),
    ]
    for column_name, statement in additions:
        if not column_exists(cursor, "recognition_logs", column_name):
            cursor.execute(statement)

    indexes = [
        ("idx_recognition_person_status_created", "CREATE INDEX idx_recognition_person_status_created ON recognition_logs (person_id, status, created_at)"),
        ("idx_recognition_created", "CREATE INDEX idx_recognition_created ON recognition_logs (created_at)"),
    ]
    for index_name, statement in indexes:
        if not index_exists(cursor, "recognition_logs", index_name):
            cursor.execute(statement)


def ensure_attendance_notification_columns(cursor) -> None:
    additions = [
        ("recognition_log_id", "ALTER TABLE attendance_notifications ADD COLUMN recognition_log_id VARCHAR(36) NULL AFTER person_id"),
        ("title", "ALTER TABLE attendance_notifications ADD COLUMN title VARCHAR(255) NULL AFTER recognition_log_id"),
        ("message", "ALTER TABLE attendance_notifications ADD COLUMN message TEXT NULL AFTER title"),
        ("status", "ALTER TABLE attendance_notifications ADD COLUMN status ENUM('unread', 'read') DEFAULT 'unread' AFTER message"),
        ("attendance_time", "ALTER TABLE attendance_notifications ADD COLUMN attendance_time TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP AFTER status"),
        ("read_at", "ALTER TABLE attendance_notifications ADD COLUMN read_at TIMESTAMP NULL AFTER attendance_time"),
        ("created_at", "ALTER TABLE attendance_notifications ADD COLUMN created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP AFTER read_at"),
    ]
    for column_name, statement in additions:
        if not column_exists(cursor, "attendance_notifications", column_name):
            cursor.execute(statement)

    cursor.execute(
        """
        UPDATE attendance_notifications
        SET title = COALESCE(title, 'Da diem danh xong'),
            message = COALESCE(message, 'He thong da ghi nhan diem danh thanh cong.'),
            status = COALESCE(status, 'unread'),
            attendance_time = COALESCE(attendance_time, created_at, NOW())
        """
    )

    indexes = [
        ("idx_notification_person_status", "CREATE INDEX idx_notification_person_status ON attendance_notifications (person_id, status)"),
        ("idx_notification_attendance_time", "CREATE INDEX idx_notification_attendance_time ON attendance_notifications (attendance_time)"),
        ("idx_notification_person_time", "CREATE INDEX idx_notification_person_time ON attendance_notifications (person_id, attendance_time)"),
        ("idx_notification_log", "CREATE INDEX idx_notification_log ON attendance_notifications (recognition_log_id)"),
        ("idx_notification_person_status_time", "CREATE INDEX idx_notification_person_status_time ON attendance_notifications (person_id, status, attendance_time)"),
    ]
    for index_name, statement in indexes:
        if not index_exists(cursor, "attendance_notifications", index_name):
            cursor.execute(statement)


def ensure_performance_indexes(cursor) -> None:
    indexes = [
        ("persons", "idx_person_status_name", "CREATE INDEX idx_person_status_name ON persons (status, name)"),
        ("persons", "idx_person_status_registered", "CREATE INDEX idx_person_status_registered ON persons (status, registered_at)"),
        ("face_embeddings", "idx_face_person_created", "CREATE INDEX idx_face_person_created ON face_embeddings (person_id, created_at)"),
        ("citizen_ids", "idx_citizen_person_id_number", "CREATE INDEX idx_citizen_person_id_number ON citizen_ids (person_id, id_number)"),
    ]
    for table_name, index_name, statement in indexes:
        if not index_exists(cursor, table_name, index_name):
            cursor.execute(statement)


def migrate():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    tables = [
        """
        CREATE TABLE IF NOT EXISTS employee_accounts (
            id VARCHAR(36) PRIMARY KEY,
            person_id VARCHAR(36) NOT NULL UNIQUE,
            username VARCHAR(100) NOT NULL UNIQUE,
            email VARCHAR(255) NULL,
            password_hash VARCHAR(64) NOT NULL,
            password_salt VARCHAR(32) NOT NULL,
            password_reset_token VARCHAR(128) NULL,
            password_reset_expires_at TIMESTAMP NULL,
            must_change_password TINYINT(1) NOT NULL DEFAULT 1,
            status ENUM('active', 'inactive') DEFAULT 'active',
            last_login_at TIMESTAMP NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE CASCADE,
            KEY idx_employee_username (username),
            KEY idx_employee_email (email),
            KEY idx_employee_reset_token (password_reset_token),
            KEY idx_employee_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """,
        """
        CREATE TABLE IF NOT EXISTS employee_sessions (
            id VARCHAR(36) PRIMARY KEY,
            account_id VARCHAR(36) NOT NULL,
            token VARCHAR(128) NOT NULL UNIQUE,
            expires_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (account_id) REFERENCES employee_accounts(id) ON DELETE CASCADE,
            KEY idx_session_token (token),
            KEY idx_session_expires (expires_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """,
        """
        CREATE TABLE IF NOT EXISTS admin_accounts (
            id VARCHAR(36) PRIMARY KEY,
            username VARCHAR(100) NOT NULL UNIQUE,
            password_hash VARCHAR(64) NOT NULL,
            password_salt VARCHAR(32) NOT NULL,
            display_name VARCHAR(255) DEFAULT 'Administrator',
            status ENUM('active', 'inactive') DEFAULT 'active',
            last_login_at TIMESTAMP NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            KEY idx_admin_username (username),
            KEY idx_admin_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """,
        """
        CREATE TABLE IF NOT EXISTS admin_sessions (
            id VARCHAR(36) PRIMARY KEY,
            admin_id VARCHAR(36) NOT NULL,
            token VARCHAR(128) NOT NULL UNIQUE,
            expires_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (admin_id) REFERENCES admin_accounts(id) ON DELETE CASCADE,
            KEY idx_admin_session_token (token),
            KEY idx_admin_session_expires (expires_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """,
        """
        CREATE TABLE IF NOT EXISTS attendance_notifications (
            id VARCHAR(36) PRIMARY KEY,
            person_id VARCHAR(36) NOT NULL,
            recognition_log_id VARCHAR(36),
            title VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            status ENUM('unread', 'read') DEFAULT 'unread',
            attendance_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            read_at TIMESTAMP NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE CASCADE,
            FOREIGN KEY (recognition_log_id) REFERENCES recognition_logs(id) ON DELETE SET NULL,
            KEY idx_notification_person_status (person_id, status),
            KEY idx_notification_attendance_time (attendance_time)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """,
    ]

    for query in tables:
        cursor.execute(query)
    ensure_employee_columns(cursor)
    ensure_recognition_log_columns(cursor)
    ensure_attendance_notification_columns(cursor)
    ensure_performance_indexes(cursor)

    admin_username = DEFAULT_ADMIN_USERNAME
    admin_password = DEFAULT_ADMIN_PASSWORD
    admin_name = DEFAULT_ADMIN_NAME
    admin_salt = secrets.token_hex(16)
    admin_hash = hash_password(admin_password, admin_salt)
    cursor.execute("SELECT id FROM admin_accounts WHERE username=%s LIMIT 1", (admin_username,))
    if cursor.fetchone():
        cursor.execute(
            """
            UPDATE admin_accounts
            SET password_hash=%s, password_salt=%s, display_name=%s, status='active'
            WHERE username=%s
            """,
            (admin_hash, admin_salt, admin_name, admin_username),
        )
    else:
        cursor.execute(
            """
            INSERT INTO admin_accounts
              (id, username, password_hash, password_salt, display_name, status)
            VALUES (%s, %s, %s, %s, %s, 'active')
            """,
            (
                str(uuid.uuid4()),
                admin_username,
                admin_hash,
                admin_salt,
                admin_name,
            ),
        )

    cursor.execute(
        """
        SELECT p.id AS person_id, c.id_number
        FROM persons p
        JOIN citizen_ids c ON c.person_id = p.id
        LEFT JOIN employee_accounts a ON a.person_id = p.id
        WHERE p.status = 'active'
          AND c.id_number IS NOT NULL
          AND c.id_number <> ''
          AND a.id IS NULL
        """
    )

    for row in cursor.fetchall():
        salt = secrets.token_hex(16)
        username = row["id_number"].strip()
        cursor.execute(
            """
            INSERT INTO employee_accounts
              (id, person_id, username, password_hash, password_salt, status)
            VALUES (%s, %s, %s, %s, %s, 'active')
            """,
            (
                str(uuid.uuid4()),
                row["person_id"],
                username,
                hash_password(default_employee_password(username), salt),
                salt,
            ),
        )

    conn.commit()
    cursor.close()
    conn.close()
    print("Migration complete: employee login and attendance notifications")


if __name__ == "__main__":
    migrate()
