import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function checkCnpj() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "129.146.31.117",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "nRGboHgFC7PkD9",
    database: process.env.DB_NAME || "encheotanque",
  });
  
  const [rows] = await connection.execute('SELECT nu_cnpjposto FROM tb_postos LIMIT 5');
  console.log("CNPJ Sample:", rows);

  await connection.end();
}

checkCnpj().catch(console.error);
