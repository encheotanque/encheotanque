const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || "129.146.31.117",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "nRGboHgFC7PkD9",
    database: process.env.DB_NAME || "encheotanque",
  });

  try {
    const [postos] = await pool.query("SELECT COUNT(*) as c FROM tb_postos");
    console.log("Postos count:", postos[0].c);

    const [abast] = await pool.query("SELECT COUNT(*) as c FROM tb_abastecimentos");
    console.log("Abastecimentos count:", abast[0].c);
    
    if (abast[0].c > 0) {
      const [sample] = await pool.query("SELECT * FROM tb_abastecimentos ORDER BY id_abastecimento DESC LIMIT 2");
      console.log("Amostra abast:", sample);
    }
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}
run();
