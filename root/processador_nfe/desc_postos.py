import os
import pymysql
from dotenv import load_dotenv

load_dotenv()

conn = pymysql.connect(
    host=os.environ.get('DB_HOST'),
    user=os.environ.get('DB_USER'),
    password=os.environ.get('DB_PASSWORD'),
    database=os.environ.get('DB_NAME'),
    cursorclass=pymysql.cursors.DictCursor
)

cursor = conn.cursor()
cursor.execute("DESCRIBE tb_postos")
cols = cursor.fetchall()
print("Colunas tb_postos:")
for c in cols:
    print(c['Field'])

cursor.execute("SELECT * FROM tb_postos LIMIT 1")
print("\nAmostra tb_postos:", cursor.fetchone())
