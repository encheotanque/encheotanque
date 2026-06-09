import os
import pymysql
from dotenv import load_dotenv

load_dotenv()

def read_db_config():
    return {
        'host': os.environ.get('DB_HOST'),
        'user': os.environ.get('DB_USER'),
        'password': os.environ.get('DB_PASSWORD'),
        'database': os.environ.get('DB_NAME'),
        'cursorclass': pymysql.cursors.DictCursor
    }

conn = pymysql.connect(**read_db_config())
cursor = conn.cursor()
cursor.execute("DESCRIBE tb_abastecimentos")
columns = cursor.fetchall()
print("tb_abastecimentos columns:")
for col in columns:
    print(f"- {col['Field']}: {col['Type']} (Null: {col['Null']})")

cursor.execute("SELECT * FROM tb_abastecimentos LIMIT 1")
sample = cursor.fetchone()
print("\nSample row:")
print(sample)

conn.close()
