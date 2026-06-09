const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

async function run() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || "129.146.31.117",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "nRGboHgFC7PkD9",
    database: process.env.DB_NAME || "encheotanque",
  });

  console.log("--- tb_tipoproduto ---");
  const [products] = await pool.query("SELECT * FROM tb_tipoproduto");
  console.log(JSON.stringify(products, null, 2));

  console.log("\n--- tb_postos (sample) ---");
  const [postos] = await pool.query("SELECT id_posto, nm_posto, nu_cnpj FROM tb_postos LIMIT 5");
  console.log(JSON.stringify(postos, null, 2));

  process.exit(0);
}
run();
