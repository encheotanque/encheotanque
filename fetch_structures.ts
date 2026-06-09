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
  
  const [postos] = await connection.execute('SELECT * FROM tb_postos LIMIT 2');
  console.log("Postos (colunas):", Object.keys((postos as any)[0] || {}));
  console.log(JSON.stringify(postos, null, 2));

  const [prods] = await connection.execute('SELECT * FROM tb_tipoproduto LIMIT 5');
  console.log("Produtos (colunas):", Object.keys((prods as any)[0] || {}));
  console.log(JSON.stringify(prods, null, 2));
  
  await connection.end();
}

run();
