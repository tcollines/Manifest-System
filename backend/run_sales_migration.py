import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()
url = os.environ.get("DATABASE_URL")
print(f"Connecting to {url}")
try:
    conn = psycopg2.connect(url)
    conn.autocommit = True
    cursor = conn.cursor()
    with open('../frontend/database/28_fix_sales_rls.sql', 'r') as f:
        sql = f.read()
    cursor.execute(sql)
    print("Migration executed successfully!")
    conn.close()
except Exception as e:
    print(f"Error: {e}")
