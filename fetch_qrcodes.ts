import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  
  const [rows] = await connection.execute('SELECT * FROM tb_qrcode LIMIT 5');
  console.log(JSON.stringify(rows, null, 2));
  
  await connection.end();
}

run();
