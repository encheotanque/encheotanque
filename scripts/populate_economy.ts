import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

async function populateEconomy() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || "129.146.31.117",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "nRGboHgFC7PkD9",
    database: process.env.DB_NAME || "encheotanque",
    waitForConnections: true,
    connectionLimit: 1,
    queueLimit: 0,
  });

  console.log("[MIGRATION] Starting population of vl_economia...");

  try {
    // 1. Get all abastecimentos that don't have nu_litros or vl_economia populated (or all if we want to refresh)
    const [rows]: any = await pool.execute(`
      SELECT a.id_posto, a.id_combustivel, a.vl_preco_unitario, a.dh_coleta, a.nu_litros, p.nm_municipio
      FROM tb_abastecimentos a
      JOIN tb_postos p ON a.id_posto = p.id_posto
    `);

    console.log(`[MIGRATION] Found ${rows.length} records to process.`);

    for (const row of rows) {
      if (!row.nm_municipio) {
        console.warn(`[MIGRATION] Skipping record: No municipality for station ${row.id_posto}`);
        continue;
      }

      // Find average price in the same municipality for the same fuel in the 7-day window
      const [avgRows]: any = await pool.execute(`
        SELECT AVG(vl_preco_unitario) as avg_price 
        FROM tb_abastecimentos a 
        JOIN tb_postos p ON a.id_posto = p.id_posto 
        WHERE a.id_combustivel = ? 
          AND p.nm_municipio = ? 
          AND a.dh_coleta >= DATE_SUB(?, INTERVAL 7 DAY)
          AND a.dh_coleta <= ?
      `, [row.id_combustivel, row.nm_municipio, row.dh_coleta, row.dh_coleta]);

      const avgPrice = avgRows[0]?.avg_price;
      if (avgPrice && row.nu_litros) {
        const vl_economia = (parseFloat(avgPrice) - parseFloat(row.vl_preco_unitario)) * parseFloat(row.nu_litros);
        
        await pool.execute(
          "UPDATE tb_abastecimentos SET vl_economia = ? WHERE id_posto = ? AND id_combustivel = ? AND dh_coleta = ?",
          [vl_economia, row.id_posto, row.id_combustivel, row.dh_coleta]
        );
        console.log(`[MIGRATION] Updated economy to R$ ${vl_economia.toFixed(2)} for Posto ${row.id_posto} (Avg: ${parseFloat(avgPrice).toFixed(3)})`);
      } else {
        console.log(`[MIGRATION] Could not calculate economy for Posto ${row.id_posto} (Avg: ${avgPrice}, Litros: ${row.nu_litros})`);
      }
    }

    console.log("[MIGRATION] Done!");
  } catch (err) {
    console.error("[MIGRATION] Error:", err);
  } finally {
    await pool.end();
  }
}

populateEconomy();
