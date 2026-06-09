const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  
  const [cols] = await connection.execute('DESCRIBE tb_postos');
  console.log("Colunas tb_postos:\n", JSON.stringify(cols, null, 2));

  const [postos] = await connection.execute('SELECT * FROM tb_postos LIMIT 2');
  console.log("Amostra tb_postos:\n", JSON.stringify(postos, null, 2));

  await connection.end();
}

run();
