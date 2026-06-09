import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

async function syncPastAbastecimentos() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || "129.146.31.117",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "nRGboHgFC7PkD9",
    database: process.env.DB_NAME || "encheotanque",
    waitForConnections: true,
    connectionLimit: 1,
    queueLimit: 0,
  });

  console.log("[SYNC] Starting historical sync from tb_abastecimentos to tb_precos_combustiveis...");

  try {
    // 1. Get the latest price per station and product from tb_abastecimentos
    const [latestAbastRows]: any = await pool.execute(`
      SELECT id_posto, id_combustivel, vl_preco_unitario, dh_emissao_nfe
      FROM (
        SELECT id_posto, id_combustivel, vl_preco_unitario, dh_emissao_nfe,
               ROW_NUMBER() OVER (PARTITION BY id_posto, id_combustivel ORDER BY dh_emissao_nfe DESC) as rn
        FROM tb_abastecimentos
        WHERE dh_emissao_nfe IS NOT NULL
      ) t
      WHERE rn = 1
    `);

    console.log(`[SYNC] Found ${latestAbastRows.length} unique station-product pairs in tb_abastecimentos.`);

    let insertedCount = 0;
    let updatedCount = 0;
    let ignoredCount = 0;

    for (const row of latestAbastRows) {
      const { id_posto, id_combustivel, vl_preco_unitario, dh_emissao_nfe } = row;

      // 2. Query the existing record in tb_precos_combustiveis
      const [priceRows]: any = await pool.execute(
        "SELECT dt_ultima_atualizacao, vl_preco_venda FROM tb_precos_combustiveis WHERE id_posto = ? AND id_produto = ?",
        [id_posto, id_combustivel]
      );

      const abastDate = new Date(dh_emissao_nfe);

      if (priceRows.length === 0) {
        // Does not exist, let's insert it
        await pool.execute(
          `INSERT INTO tb_precos_combustiveis 
           (id_posto, id_produto, vl_preco_venda, dt_ultima_atualizacao, ds_origem_dado) 
           VALUES (?, ?, ?, ?, 'NOTA FISCAL')`,
          [id_posto, id_combustivel, vl_preco_unitario, dh_emissao_nfe]
        );
        insertedCount++;
        console.log(`[INSERT] Posto ${id_posto} / Prod ${id_combustivel} -> R$ ${vl_preco_unitario} (${dh_emissao_nfe})`);
      } else {
        // Exists, compare the date
        const existingUpdate = priceRows[0].dt_ultima_atualizacao;
        const existingDate = existingUpdate ? new Date(existingUpdate) : null;

        if (!existingDate || abastDate > existingDate) {
          // The NFe date is indeed more recent, let's update it
          await pool.execute(
            `UPDATE tb_precos_combustiveis 
             SET vl_preco_venda = ?, dt_ultima_atualizacao = ?, ds_origem_dado = 'NOTA FISCAL' 
             WHERE id_posto = ? AND id_produto = ?`,
            [vl_preco_unitario, dh_emissao_nfe, id_posto, id_combustivel]
          );
          updatedCount++;
          console.log(`[UPDATE] Posto ${id_posto} / Prod ${id_combustivel} -> R$ ${vl_preco_unitario} (Newer: ${dh_emissao_nfe} vs existing: ${existingUpdate})`);
        } else {
          ignoredCount++;
        }
      }
    }

    console.log("[SYNC] Sync execution finished!");
    console.log(`- Inserted new price cards: ${insertedCount}`);
    console.log(`- Updated based on more recent NFes: ${updatedCount}`);
    console.log(`- Ignored (existing is already newer/same): ${ignoredCount}`);

  } catch (error) {
    console.error("[SYNC] Error during syncing:", error);
  } finally {
    await pool.end();
  }
}

syncPastAbastecimentos();
