const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  const [cols] = await pool.query("DESCRIBE tb_abastecimentos");
  console.log("tb_abastecimentos:", cols.map(c => c.Field));

  const [postos] = await pool.query("DESCRIBE tb_postos");
  console.log("tb_postos:", postos.map(c => c.Field));

  process.exit(0);
}
run();
