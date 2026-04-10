import mysql.connector
from mysql.connector import pooling
import os
from dotenv import load_dotenv

load_dotenv()

db_config = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": int(os.getenv("DB_PORT", 3306)), 
    "user": "root",
    "password": "vananh123", 
    "database": "face_recognitionface_embeddings",
    "pool_name": "mypool",
    "pool_size": 5,
}

# Tạo pool kết nối
connection_pool = mysql.connector.pooling.MySQLConnectionPool(**db_config)

def get_db_connection():
    return connection_pool.get_connection()