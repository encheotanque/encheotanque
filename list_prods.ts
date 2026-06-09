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
  
  const [prods] = await connection.execute('SELECT * FROM tb_tipoproduto');
  console.log("Produtos:", JSON.stringify(prods, null, 2));

  await connection.end();
}

run();
