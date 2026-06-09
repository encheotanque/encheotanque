import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function checkMetadata() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "129.146.31.117",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "nRGboHgFC7PkD9",
    database: process.env.DB_NAME || "encheotanque",
  });
  
  const [postos] = await connection.execute('DESCRIBE tb_postos');
  console.log("TB_POSTOS COLS:", postos);
  
  const [fuels] = await connection.execute('SELECT * FROM tb_tipoproduto');
  console.log("FUELS:", fuels);
  
  const [prices] = await connection.execute('DESCRIBE tb_precos_combustiveis');
  console.log("PRICES COLS:", prices);

  await connection.end();
}

checkMetadata().catch(console.error);
