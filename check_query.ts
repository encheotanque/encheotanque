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
    const [rows]: any = await pool.query(
      "SELECT id_motorista, ds_email, nm_mot FROM tb_motorista WHERE ds_email LIKE '%marcio%'"
    );
    console.log("Drivers with 'marcio' in their email:", rows);

    const [vehs]: any = await pool.query(
      `SELECT v.id_veiculo, v.id_placa, v.nm_modelo, m.id_motorista, m.ds_email, m.nm_mot 
       FROM tb_veiculo v 
       JOIN tb_motorista m ON v.id_motorista = m.id_motorista
       WHERE m.ds_email LIKE '%marcio%'`
    );
    console.log("Vehicles for 'marcio' drivers:", vehs);
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}
run();













