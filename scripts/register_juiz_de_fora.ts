import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const URL_CSV = "https://www.gov.br/anp/pt-br/centrais-de-conteudo/dados-abertos/arquivos/arquivos-dados-cadastrais-dos-revendedores-varejistas-de-combustiveis-automotivos/dados-cadastrais-revendedores-varejistas-combustiveis-automoveis.csv";

async function main() {
    console.log("Connecting to the database...");
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST || '129.146.31.117',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'nRGboHgFC7PkD9',
        database: process.env.DB_NAME || 'encheotanque'
    });

    try {
        console.log("Fetching active products from tb_tipoproduto...");
        const [products]: any = await conn.execute("SELECT id_produto FROM tb_tipoproduto");
        const productIds = products.map((p: any) => p.id_produto);
        console.log(`Loaded ${productIds.length} products:`, productIds);

        console.log("Downloading ANP registration CSV (approx. 40-50MB)...");
        const response = await fetch(URL_CSV);
        if (!response.ok) {
            throw new Error(`Failed to download ANP CSV: ${response.statusText}`);
        }

        console.log("Reading CSV data text...");
        const csvText = await response.text();
        console.log("Parsing CSV lines...");

        // Split text by lines (handles both \r\n and \n)
        const lines = csvText.split(/\r?\n/);
        console.log(`Total rows downloaded: ${lines.length}`);

        if (lines.length < 2) {
            throw new Error("CSV has no rows or is invalid.");
        }

        const headerLine = lines[0];
        // Splitting header with delimiter ';' or ','
        const delimiter = headerLine.includes(';') ? ';' : ',';
        const headers = headerLine.split(delimiter).map(h => h.trim().toUpperCase());
        console.log("CSV Header columns:", headers);

        const colIndex = (name: string) => headers.indexOf(name);
        const idxCnpj = colIndex("CNPJ");
        const idxMun = colIndex("MUNICIPIO");
        const idxUf = colIndex("UF");
        const idxAutorizacao = colIndex("AUTORIZACAO");
        const idxRazao = colIndex("RAZAOSOCIAL");
        const idxEndereco = colIndex("ENDERECO");
        const idxComplemento = colIndex("COMPLEMENTO");
        const idxBairro = colIndex("BAIRRO");
        const idxCep = colIndex("CEP");
        const idxBandeira = colIndex("BANDEIRA");

        if (idxCnpj === -1 || idxMun === -1 || idxUf === -1) {
            throw new Error("Required columns (CNPJ, MUNICIPIO, UF) not found in header.");
        }

        let enteredCount = 0;
        let relationCount = 0;

        console.log("Filtering and importing stations for Juiz de Fora / MG...");
        
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const row = line.split(delimiter).map(val => val.replace(/^"|"$/g, '').trim());
            if (row.length < Math.max(idxCnpj, idxMun, idxUf)) continue;

            const mun = row[idxMun]?.toUpperCase();
            const uf = row[idxUf]?.toUpperCase();

            if (mun === 'JUIZ DE FORA' && uf === 'MG') {
                const cnpjDigitOnly = row[idxCnpj]?.replace(/\D/g, '') || '';
                if (!cnpjDigitOnly) continue;
                const cnpj = cnpjDigitOnly.padStart(14, '0');

                let autorizacao = 'PENDENTE';
                if (idxAutorizacao !== -1 && row[idxAutorizacao]) {
                    autorizacao = row[idxAutorizacao];
                }

                const name = idxRazao !== -1 ? row[idxRazao]?.slice(0, 100) : 'Posto Sem Razao';
                const endereco = idxEndereco !== -1 ? row[idxEndereco]?.slice(0, 200) : 'Sem Endereco';
                const complemento = (idxComplemento !== -1 && row[idxComplemento]) ? row[idxComplemento].slice(0, 500) : '';
                const bairro = (idxBairro !== -1 && row[idxBairro]) ? row[idxBairro].slice(0, 50) : '';
                const cep = idxCep !== -1 ? row[idxCep]?.replace(/\D/g, '').slice(0, 8) : '';
                const bandeira = (idxBandeira !== -1 && row[idxBandeira]) ? row[idxBandeira].slice(0, 50) : 'BANDEIRA BRANCA';

                // Locate existing station by CNPJ
                const [existing]: any = await conn.execute(
                    "SELECT id_posto FROM tb_postos WHERE nu_cnpjposto = ? LIMIT 1",
                    [cnpj]
                );

                let idPosto: number;
                if (existing && existing.length > 0) {
                    idPosto = existing[0].id_posto;
                    // Keep existing
                } else {
                    // Newly register gas station
                    const [resInsert]: any = await conn.execute(`
                        INSERT INTO tb_postos 
                        (nu_cnpjposto, nu_autorizacaoanp, nm_posto, ds_endereco, ds_complemento, nm_bairro, nu_cep, sg_ufposto, nm_municipio, geo_latitude, geo_longitude, nm_bandeira, fl_ativo)
                        VALUES (?, ?, ?, ?, ?, ?, ?, 'MG', 'Juiz de Fora', '0', '0', ?, 1)
                    `, [cnpj, autorizacao, name, endereco, complemento, bairro, cep, bandeira]);
                    
                    idPosto = resInsert.insertId;
                    enteredCount++;
                    console.log(`[+] Registered Posto [ID: ${idPosto}] - ${name}`);
                }

                // Associate full fuels in tb_precos_combustiveis (no price, no updates)
                for (const productId of productIds) {
                    const [resRel]: any = await conn.execute(`
                        INSERT IGNORE INTO tb_precos_combustiveis (id_posto, id_produto, vl_preco_venda, dt_ultima_atualizacao, ds_origem_dado)
                        VALUES (?, ?, NULL, NULL, 'ANP_INITIAL')
                    `, [idPosto, productId]);

                    if (resRel.affectedRows > 0) {
                        relationCount++;
                    }
                }
            }
        }

        console.log("\n==============================================");
        console.log("Juiz de Fora/MG stations imported successfully!");
        console.log(`New postos inserted: ${enteredCount}`);
        console.log(`New fuel relationships mapped: ${relationCount}`);
        console.log("==============================================");

    } catch (e) {
        console.error("Fatal exception during import process:", e);
    } finally {
        await conn.end();
    }
}

main().catch(console.error);
