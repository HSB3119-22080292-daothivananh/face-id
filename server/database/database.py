import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv()
db_config = {
    "host": os.getenv("DB_HOST", "autorack.proxy.rlwy.net"),
    "port": int(os.getenv("DB_PORT", 52808)),
    "user": os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASSWORD", "VRcZNIXbTinjXojkweDCgFtpicPlWYvI"),
    "database": os.getenv("DB_NAME", "railway"),
    "pool_name": "mypool",
    "pool_size": 5,
    "ssl_disabled": False
}
# Tao pool ket noi
try:
    connection_pool = mysql.connector.pooling.MySQLConnectionPool(**db_config)
    print("[OK] Da khoi tao Pool ket noi MySQL thanh cong!")
except Exception as e:
    print(f"[LOI] Loi khoi tao Pool MySQL: {e}")

def get_db_connection():
    return connection_pool.get_connection()

def init_database():
    """Tu dong tao Schema theo chuan MySQL ban cung cap"""
    
    tables = [
        """
        CREATE TABLE IF NOT EXISTS persons (
            id VARCHAR(36) PRIMARY KEY COMMENT 'UUID identifier',
            name VARCHAR(255) NOT NULL COMMENT 'Person name',
            role VARCHAR(100) COMMENT 'Job role',
            department VARCHAR(100) COMMENT 'Department',
            work_expiry_date DATE NULL COMMENT 'Ngay het han lam viec',
            status ENUM('active', 'inactive') DEFAULT 'active' COMMENT 'Active status',
            img_url LONGTEXT COMMENT 'Profile image URL',
            img_path VARCHAR(255) DEFAULT '' COMMENT 'Duong dan file anh avatar',
            registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Registration date',
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last update',
            
            KEY idx_name (name),
            KEY idx_status (status),  
            KEY idx_registered_at (registered_at),
            KEY idx_work_expiry (work_expiry_date),
            KEY idx_status_expiry (status, work_expiry_date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """,
        
        """
        CREATE TABLE IF NOT EXISTS citizen_ids (
            id VARCHAR(36) PRIMARY KEY,
            person_id VARCHAR(36) NOT NULL,
            front_img_path VARCHAR(255),
            back_img_path VARCHAR(255),
            id_number VARCHAR(20),
            full_name VARCHAR(255),
            dob VARCHAR(20),
            gender VARCHAR(10),
            nationality VARCHAR(50) DEFAULT 'Viet Nam',
            hometown VARCHAR(500),
            address VARCHAR(500),
            expiry_date VARCHAR(20),
            issue_date VARCHAR(20),
            special_features TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE CASCADE,
            KEY idx_citizen_person (person_id),
            KEY idx_citizen_id_number (id_number)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """,
        
        """
        CREATE TABLE IF NOT EXISTS face_embeddings (
            id VARCHAR(36) PRIMARY KEY,
            person_id VARCHAR(36) NOT NULL,
            embedding_vector LONGTEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE CASCADE,
            KEY idx_person_id (person_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """,
        
        """
        CREATE TABLE IF NOT EXISTS recognition_logs (
            id VARCHAR(36) PRIMARY KEY,
            person_id VARCHAR(36),
            status ENUM('success', 'unknown', 'error') DEFAULT 'unknown',
            confidence DECIMAL(5, 2),
            camera VARCHAR(100),
            action ENUM('Vao', 'Ra', 'Tu choi', 'Loi') DEFAULT 'Vao',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE SET NULL,
            KEY idx_person_id (person_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """
    ]

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        for query in tables:
            cursor.execute(query)
        conn.commit()
        print("[OK] Da kiem tra va khoi tao cau truc CSDL thanh cong tren Railway!")
    except mysql.connector.Error as err:
        print(f"[LOI] Loi SQL khi khoi tao bang: {err}")
    except Exception as e:
        print(f"[LOI] Loi he thong khi khoi tao bang: {e}")
    finally:
        if 'cursor' in locals(): cursor.close()
        if 'conn' in locals() and conn.is_connected(): conn.close()