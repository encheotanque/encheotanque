import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || "129.146.31.117",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "nRGboHgFC7PkD9",
    database: process.env.DB_NAME || "encheotanque",
  });

  try {
    const [abast] = await pool.query("SELECT COUNT(*) as c FROM tb_abastecimentos");
    console.log("Abastecimentos count:", abast[0].c);
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}
run();
