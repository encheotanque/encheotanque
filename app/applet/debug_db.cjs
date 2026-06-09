const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
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
    
    // Test the specific query
    const [testQuery] = await pool.query(`
      SELECT p.id_posto, p.geo_latitude, p.geo_longitude 
      FROM tb_postos p 
      WHERE p.geo_latitude IS NOT NULL 
      LIMIT 1
    `);
    console.log("Posto com lat/lng:", testQuery[0]);
    
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}
run();
