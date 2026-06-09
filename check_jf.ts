import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || "129.146.31.117",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "nRGboHgFC7PkD9",
    database: process.env.DB_NAME || "encheotanque",
  });

  try {
    const [postos]: any = await conn.execute(
      "SELECT COUNT(*) as count FROM tb_postos WHERE LOWER(nm_municipio) = 'juiz de fora'"
    );
    console.log("Total postos in Juiz de Fora:", postos[0].count);

    const [prices]: any = await conn.execute(`
      SELECT COUNT(*) as count FROM tb_precos_combustiveis pc
      JOIN tb_postos p ON pc.id_posto = p.id_posto
      WHERE LOWER(p.nm_municipio) = 'juiz de fora'
    `);
    console.log("Total price rows in Juiz de Fora:", prices[0].count);

    const [distinctProds]: any = await conn.execute(`
      SELECT pc.id_produto, tp.ds_produto, COUNT(*) as count 
      FROM tb_precos_combustiveis pc
      JOIN tb_postos p ON pc.id_posto = p.id_posto
      JOIN tb_tipoproduto tp ON pc.id_produto = tp.id_produto
      WHERE LOWER(p.nm_municipio) = 'juiz de fora'
      GROUP BY pc.id_produto, tp.ds_produto
    `);
    console.log("Distinct products in Juiz de Fora price rows:", distinctProds);

  } catch (err) {
    console.error(err);
  } finally {
    await conn.end();
  }
}
run();
