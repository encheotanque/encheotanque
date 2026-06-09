import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "129.146.31.117",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "nRGboHgFC7PkD9",
    database: process.env.DB_NAME || "encheotanque",
  });
  
  const [cols] = await connection.execute('DESCRIBE tb_veiculo');
  console.log("tb_veiculo COLS:", cols);
  
  await connection.end();
}
check().catch(console.error);
