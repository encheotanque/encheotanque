import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function cleanJuizDeFora() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || "129.146.31.117",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "nRGboHgFC7PkD9",
    database: process.env.DB_NAME || "encheotanque",
  });

  try {
    console.log("[CLEANUP] Fetching Juiz de Fora posts IDs from tb_postos...");
    const [postos]: any = await pool.execute(
      "SELECT id_posto, nm_posto FROM tb_postos WHERE LOWER(nm_municipio) = 'juiz de fora'"
    );

    if (postos.length === 0) {
      console.log("[CLEANUP] Juiz de Fora stations not found in tb_postos.");
      return;
    }

    const idPostos = postos.map((p: any) => p.id_posto);
    console.log(`[CLEANUP] Found ${idPostos.length} stations in Juiz de Fora.`);

    console.log("[CLEANUP] Deleting rows in tb_precos_combustiveis without tancagem and without price...");
    const placeholders = idPostos.map(() => '?').join(',');
    const [res]: any = await pool.execute(`
      DELETE FROM tb_precos_combustiveis 
      WHERE id_posto IN (${placeholders}) 
        AND (nu_tancagem IS NULL OR nu_tancagem = 0)
        AND vl_preco_venda IS NULL
    `, idPostos);

    console.log(`[CLEANUP] Successfully deleted ${res.affectedRows} stale price rows.`);

    // Also verify how many active coverage rows remain for Juiz de Fora
    const [activeRows]: any = await pool.execute(`
      SELECT COUNT(*) as count 
      FROM tb_precos_combustiveis 
      WHERE id_posto IN (${placeholders})
    `, idPostos);

    console.log(`[CLEANUP] Remaining price rows in tb_precos_combustiveis for Juiz de Fora: ${activeRows[0].count}`);

  } catch (error) {
    console.error("[CLEANUP] Error during cleanup:", error);
  } finally {
    await pool.end();
  }
}

cleanJuizDeFora().catch(console.error);
