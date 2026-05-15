import sys
sys.path.append('.')
from database import get_db_connection

def migrate():
    conn = get_db_connection()
    cursor = conn.cursor()

    print("Checking schema for new base64 columns...")

    # Check and add front_img_base64 to citizen_ids
    cursor.execute("""
        SELECT COUNT(*) as cnt FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'citizen_ids' AND COLUMN_NAME = 'front_img_base64'
    """)
    if not cursor.fetchone()[0]:
        print("  Adding front_img_base64 to citizen_ids...")
        cursor.execute("ALTER TABLE citizen_ids ADD COLUMN front_img_base64 LONGTEXT")
        
    # Check and add back_img_base64 to citizen_ids
    cursor.execute("""
        SELECT COUNT(*) as cnt FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'citizen_ids' AND COLUMN_NAME = 'back_img_base64'
    """)
    if not cursor.fetchone()[0]:
        print("  Adding back_img_base64 to citizen_ids...")
        cursor.execute("ALTER TABLE citizen_ids ADD COLUMN back_img_base64 LONGTEXT")
        
    # Check and add img_base64 to face_embeddings
    cursor.execute("""
        SELECT COUNT(*) as cnt FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'face_embeddings' AND COLUMN_NAME = 'img_base64'
    """)
    if not cursor.fetchone()[0]:
        print("  Adding img_base64 to face_embeddings...")
        cursor.execute("ALTER TABLE face_embeddings ADD COLUMN img_base64 LONGTEXT")

    conn.commit()
    cursor.close()
    conn.close()
    print("Migration complete!")

if __name__ == "__main__":
    migrate()
