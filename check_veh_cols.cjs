
const mysql = require('mysql2/promise');
require('dotenv').config();

async function check() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || "129.146.31.117",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "nRGboHgFC7PkD9",
    database: process.env.DB_NAME || "encheotanque",
  });

  try {
    const [rows] = await pool.execute("SHOW COLUMNS FROM tb_veiculo");
    console.log("Columns in tb_veiculo:", rows.map(r => r.Field));
  } catch (e) {
    console.error("Error checking tb_veiculo:", e.message);
  } finally {
    await pool.end();
  }
}

check();
