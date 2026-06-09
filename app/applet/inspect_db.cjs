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
    const [tables] = await pool.query("SHOW TABLES");
    console.log("=== TABLES ===");
    for (const row of tables) {
      const tableName = Object.values(row)[0];
      console.log(`\nTable: ${tableName}`);
      const [cols] = await pool.query(`DESCRIBE ${tableName}`);
      cols.forEach(c => {
        console.log(`  - ${c.Field}: ${c.Type} (${c.Null}, ${c.Key}, ${c.Default})`);
      });
    }
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
run();
