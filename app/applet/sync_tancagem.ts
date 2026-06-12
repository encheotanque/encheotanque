import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

process.env.TZ = "America/Sao_Paulo";

// Configuração de Mapeamento e Apelidos de Combustíveis
const PRODUCT_MAPPING: Record<string, number> = {
  'ETANOL HIDRATADO ADITIVADO': 1,
  'ETANOL HIDRATADO COMUM': 2,
  'GASOLINA C COMUM': 3,
  'GASOLINA C COMUM ADITIVADA': 4,
  'GASOLINA C PREMIUM': 5,
  'GASOLINA C PREMIUM ADITIVADA': 6,
  'ÓLEO DIESEL B S10 - ADITIVADO': 7,
  'ÓLEO DIESEL B S10 - COMUM': 8,
  'ÓLEO DIESEL B S500 - ADITIVADO': 9,
  'ÓLEO DIESEL B S500 - COMUM': 10,
  'GÁS NATURAL VEICULAR': 11,
};

const PRODUCT_ALIASES: Record<string, string> = {
  "GASOLINA": "GASOLINA C COMUM",
  "GASOLINA COMUM": "GASOLINA C COMUM",
  "GASOLINA C COMUM": "GASOLINA C COMUM",
  "GASOLINA ADITIVADA": "GASOLINA C COMUM ADITIVADA",
  "GASOLINA C ADITIVADA": "GASOLINA C COMUM ADITIVADA",
  "ETANOL": "ETANOL HIDRATADO COMUM",
  "ETANOL HIDRATADO": "ETANOL HIDRATADO COMUM",
  "ETANOL HIDRATADO COMUM": "ETANOL HIDRATADO COMUM",
  "ETANOL ADITIVADO": "ETANOL HIDRATADO ADITIVADO",
  "ETANOL HIDRATADO ADITIVADO": "ETANOL HIDRATADO ADITIVADO",
  "DIESEL S10": "ÓLEO DIESEL B S10 - COMUM",
  "DIESEL B S10": "ÓLEO DIESEL B S10 - COMUM",
  "OLEO DIESEL B S10": "ÓLEO DIESEL B S10 - COMUM",
  "ÓLEO DIESEL B S10 - COMUM": "ÓLEO DIESEL B S10 - COMUM",
  "DIESEL S10 ADITIVADO": "ÓLEO DIESEL B S10 - ADITIVADO",
  "ÓLEO DIESEL B S10 - ADITIVADO": "ÓLEO DIESEL B S10 - ADITIVADO",
  "DIESEL S500": "ÓLEO DIESEL B S500 - COMUM",
  "DIESEL B S500": "ÓLEO DIESEL B S500 - COMUM",
  "OLEO DIESEL B S500": "ÓLEO DIESEL B S500 - COMUM",
  "ÓLEO DIESEL B S500 - COMUM": "ÓLEO DIESEL B S500 - COMUM",
  "GNV": "GÁS NATURAL VEICULAR",
  "GAS NATURAL VEICULAR": "GÁS NATURAL VEICULAR",
  "GÁS NATURAL VEICULAR": "GÁS NATURAL VEICULAR"
};

const removeAccents = (str: string) => {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

const normalizeStr = (str: string) => {
  if (!str) return "";
  return removeAccents(str).toUpperCase().trim();
};

// Resolução de ID do Produto correspondente ao nome da ANP
function resolveProductId(anpProductName: string): number | null {
  const norm = normalizeStr(anpProductName);
  const mappedName = PRODUCT_ALIASES[norm] || norm;
  const mappedNorm = normalizeStr(mappedName);

  // Busca exata no PRODUCT_MAPPING
  for (const [key, val] of Object.entries(PRODUCT_MAPPING)) {
    if (normalizeStr(key) === mappedNorm) {
      return val;
    }
  }

  // Busca parcial/aproximada por inclusão
  for (const [key, val] of Object.entries(PRODUCT_MAPPING)) {
    const keyNorm = normalizeStr(key);
    if (keyNorm.includes(mappedNorm) || mappedNorm.includes(keyNorm)) {
      return val;
    }
  }

  return null;
}

export async function runAnpTancagemSync(dryRun: boolean = false) {
  console.log(`[TANCAGEM_SYNC] Iniciando processamento de postos e tancagem às ${new Date().toISOString()}`);
  if (dryRun) {
    console.log("[TANCAGEM_SYNC] MODO DRY-RUN INTRODUZIDO. NENHUMA ALTERAÇÃO DE BANCO SERÁ EXECUTADA.");
  }

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "129.146.31.117",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "nRGboHgFC7PkD9",
    database: process.env.DB_NAME || "encheotanque",
    timezone: "-03:00",
  });

  const logsToEmail: string[] = [];
  const stats = {
    citiesProcessed: 0,
    postosProcessed: 0,
    postosInserted: 0,
    postosUpdated: 0,
    tancagemInserted: 0,
    tancagemUpdated: 0,
    tancagemDisabled: 0,
    duplicatesAvoided: 0,
    errorsOccurred: 0,
  };

  try {
    // 1. Inicializar tabelas e colunas necessárias
    console.log("[TANCAGEM_SYNC] Verificando e alinhando estrutura do banco...");

    // Se NÃO for dryRun, garantimos de forma persistente a migração de nomenclatura para fl_ativo
    if (!dryRun) {
      // Garantir coluna fl_ativo na tabela tb_precos_combustiveis
      try {
        await connection.execute(`ALTER TABLE tb_precos_combustiveis ADD COLUMN fl_ativo TINYINT(1) DEFAULT 1`);
        console.log("[TANCAGEM_SYNC] Coluna 'fl_ativo' garantida em tb_precos_combustiveis.");
      } catch (e: any) {
        if (!e.message.includes('Duplicate column name')) {
          console.warn("[TANCAGEM_SYNC] Aviso ao criar 'fl_ativo' em tb_precos_combustiveis:", e.message);
        }
      }

      // Migrar dados de fg_ativo -> fl_ativo se fg_ativo existir
      try {
        await connection.execute(`UPDATE tb_precos_combustiveis SET fl_ativo = fg_ativo WHERE fg_ativo IS NOT NULL`);
        console.log("[TANCAGEM_SYNC] Sincronizados dados de fg_ativo legado para fl_ativo em tb_precos_combustiveis.");
      } catch (e: any) {}

      // Dropar a coluna legada fg_ativo em tb_precos_combustiveis para deixar o banco limpo
      try {
        await connection.execute(`ALTER TABLE tb_precos_combustiveis DROP COLUMN fg_ativo`);
        console.log("[TANCAGEM_SYNC] Coluna legada fg_ativo descontinuada com sucesso em tb_precos_combustiveis.");
      } catch (e: any) {}

      // Garantir coluna fl_ativo na tabela tb_postos
      try {
        await connection.execute(`ALTER TABLE tb_postos ADD COLUMN fl_ativo TINYINT(1) DEFAULT 1`);
        console.log("[TANCAGEM_SYNC] Coluna 'fl_ativo' garantida em tb_postos.");
      } catch (e: any) {
        if (!e.message.includes('Duplicate column name')) {
          console.warn("[TANCAGEM_SYNC] Aviso ao criar 'fl_ativo' em tb_postos:", e.message);
        }
      }

      // Migrar dados de fg_ativo -> fl_ativo se fg_ativo existir em tb_postos
      try {
        await connection.execute(`UPDATE tb_postos SET fl_ativo = fg_ativo WHERE fg_ativo IS NOT NULL`);
      } catch (e: any) {}

      // Dropar a coluna legada fg_ativo em tb_postos
      try {
        await connection.execute(`ALTER TABLE tb_postos DROP COLUMN fg_ativo`);
      } catch (e: any) {}

      // Criar tabela de logs de sincronização
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS tb_log_sincronizacao_anp (
          id INT AUTO_INCREMENT PRIMARY KEY,
          dt_evento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          tp_operacao VARCHAR(35) NOT NULL,
          ds_cnpj VARCHAR(14) NOT NULL,
          nm_posto VARCHAR(150),
          ds_detalhes TEXT
        )
      `);
      console.log("[TANCAGEM_SYNC] Tabela de logs garantida.");
    }

    // Identifica qual coluna ativo usar no SELECT (fl_ativo é a padrão, mas se for dry Run e ainda não migrou, toleramos fg_ativo)
    let activeColName = 'fl_ativo';
    try {
      const [cols] = await connection.execute("SHOW COLUMNS FROM tb_precos_combustiveis LIKE 'fl_ativo'");
      if ((cols as any[]).length === 0) {
        activeColName = 'fg_ativo';
      }
    } catch (e) {
      activeColName = 'fl_ativo';
    }

    // Função para registrar logs estruturados
    const logAction = async (operation: string, cnpj: string, nmPosto: string, details: string) => {
      const dryPrefix = dryRun ? "[SIMULAÇÃO-TESTE] " : "";
      const line = `${dryPrefix}[${operation}] CNPJ: ${cnpj} | Posto: "${nmPosto}" | ${details}`;
      console.log(`[TANCAGEM_SYNC] ${line}`);
      logsToEmail.push(line);

      if (!dryRun) {
        try {
          await connection.execute(
            `INSERT INTO tb_log_sincronizacao_anp (tp_operacao, ds_cnpj, nm_posto, ds_detalhes) VALUES (?, ?, ?, ?)`,
            [operation, cnpj, nmPosto, details]
          );
        } catch (e: any) {
          console.error(`[TANCAGEM_SYNC] Falha ao persistir log operacional: ${e.message}`);
        }
      }
    };

    // 2. Coletar e Sincronizar Cidades Oficiais
    const syncCities = [
      { uf: 'MG', municipio: 'Juiz de Fora' },
      { uf: 'RJ', municipio: 'Petrópolis' }
    ];

    for (const city of syncCities) {
      const { uf, municipio } = city;
      console.log(`\n[TANCAGEM_SYNC] Sincronizando município: ${municipio} - ${uf}...`);
      stats.citiesProcessed++;

      let page = 1;
      let hasMore = true;

      // Sanitizar valores para a API da ANP
      const sg_ufposto = uf.toUpperCase().substring(0, 2);
      const nm_municipio = municipio.trim();

      while (hasMore) {
        try {
          const url = `https://it-anp-api.onrender.com/api/postos?uf=${encodeURIComponent(sg_ufposto)}&municipio=${encodeURIComponent(nm_municipio)}&page=${page}&limit=50`;
          console.log(`[TANCAGEM_SYNC] Obtendo página ${page}: ${url}`);

          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`Código de status HTTP inválido: ${response.status}`);
          }

          const responseData = await response.json();
          const list = responseData.data || [];
          const totalPages = responseData.pagination?.totalPages || page;

          if (list.length === 0 || page > totalPages) {
            hasMore = false;
            break;
          }

          console.log(`[TANCAGEM_SYNC] Processando ${list.length} postos da página ${page}...`);

          for (const anpPosto of list) {
            stats.postosProcessed++;

            const rawCnpj = anpPosto.cnpj ? anpPosto.cnpj.replace(/\D/g, '').padStart(14, '0') : '';
            if (!rawCnpj) {
              console.warn(`[TANCAGEM_SYNC] Posto com CNPJ nulo/inválido ignorado: ${JSON.stringify(anpPosto)}`);
              continue;
            }

            const cleanAutorizacao = (anpPosto.autorizacao || 'PENDENTE').trim();
            const cleanNmPosto = (anpPosto.razaoSocial || 'POSTO AUTOMÁTICO').trim().toUpperCase();
            const cleanEndereco = (anpPosto.endereco || '').trim().toUpperCase();
            const cleanComplemento = (anpPosto.complemento || '').trim().toUpperCase();
            const cleanBairro = (anpPosto.bairro || 'CENTRO').trim().toUpperCase();
            const cleanCep = (anpPosto.cep || '').replace(/\D/g, '').padEnd(8, '0').substring(0, 8);
            const cleanBandeira = (anpPosto.distribuidora || 'BRANCA').trim().toUpperCase();

            // Verificar se o posto já existe no banco local de postes
            const [dbPostosRows] = await connection.execute(
              `SELECT id_posto, nu_cnpjposto, nu_autorizacaoanp, nm_posto, ds_endereco, ds_complemento, nm_bairro, nu_cep, nm_bandeira FROM tb_postos WHERE nu_cnpjposto = ? LIMIT 1`,
              [rawCnpj]
            );
            const dbPostosList = dbPostosRows as any[];

            let id_posto: number;
            const anpProductIds: number[] = [];

            if (dbPostosList.length === 0) {
              // Posto novo
              stats.postosInserted++;
              
              if (!dryRun) {
                const [insResult] = await connection.execute(
                  `INSERT INTO tb_postos 
                   (nu_cnpjposto, nu_autorizacaoanp, nm_posto, ds_endereco, ds_complemento, nm_bairro, nu_cep, sg_ufposto, nm_municipio, geo_latitude, geo_longitude, nm_bandeira, fl_ativo)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '0', '0', ?, 1)`,
                  [
                    rawCnpj,
                    cleanAutorizacao,
                    cleanNmPosto.substring(0, 100),
                    cleanEndereco.substring(0, 200),
                    cleanComplemento.substring(0, 500),
                    cleanBairro.substring(0, 50),
                    cleanCep,
                    sg_ufposto,
                    nm_municipio,
                    cleanBandeira.substring(0, 50)
                  ]
                );
                id_posto = (insResult as any).insertId;
              } else {
                id_posto = 900000 + stats.postosInserted; // ID fictício para dryRun
              }

              await logAction(
                'INSERCAO_POSTO_NOVO',
                rawCnpj,
                cleanNmPosto,
                `Posto novo importado e cadastrado com ID fictício/real ${id_posto}. Município: ${nm_municipio}. Bandeira: ${cleanBandeira}.`
              );

              // Cadastrar combustíveis e tancagem informados pela API
              if (anpPosto.produtos && Array.isArray(anpPosto.produtos)) {
                for (const prod of anpPosto.produtos) {
                  const id_produto = resolveProductId(prod.produto);
                  if (!id_produto) {
                    await logAction(
                      'TANCAGEM_ALERTA',
                      rawCnpj,
                      cleanNmPosto,
                      `Não foi possível mapear produto ANP "${prod.produto}" para inserção de tancagem.`
                    );
                    continue;
                  }

                  anpProductIds.push(id_produto);
                  const tancagemVal = Number(prod.tancagem) || 0;
                  const bicosVal = Number(prod.qtdeBicos) || 0;

                  stats.tancagemInserted++;

                  if (!dryRun) {
                    await connection.execute(
                      `INSERT INTO tb_precos_combustiveis 
                       (id_posto, id_produto, vl_preco_venda, dt_ultima_atualizacao, ds_origem_dado, nu_tancagem, qt_bicos, fl_ativo)
                       VALUES (?, ?, NULL, NOW(), ?, ?, ?, 1)`,
                      [id_posto, id_produto, 'ANP_TANC_SYNC', tancagemVal, bicosVal]
                    );
                  }

                  await logAction(
                    'INSERCAO_TANCAGEM',
                    rawCnpj,
                    cleanNmPosto,
                    `Cadastrado combustível "${prod.produto}" (ID ${id_produto}) com Tancagem: ${tancagemVal} m³, Bicos: ${bicosVal}.`
                  );
                }
              }

            } else {
              // Posto já existe: ATUALIZE apenas metadados divergentes
              const localPosto = dbPostosList[0];
              id_posto = localPosto.id_posto;

              const upFields: string[] = [];
              const upParams: any[] = [];

              if (localPosto.nu_autorizacaoanp !== cleanAutorizacao) {
                upFields.push('nu_autorizacaoanp = ?');
                upParams.push(cleanAutorizacao);
              }
              const localBand = (localPosto.nm_bandeira || '').trim().toUpperCase();
              if (localBand !== cleanBandeira && !(localBand === 'BANDEIRA BRANCA' && cleanBandeira === 'BRANCA')) {
                upFields.push('nm_bandeira = ?');
                upParams.push(cleanBandeira);
              }
              if (localPosto.ds_endereco !== cleanEndereco) {
                upFields.push('ds_endereco = ?');
                upParams.push(cleanEndereco);
              }
              if (localPosto.ds_complemento !== cleanComplemento) {
                upFields.push('ds_complemento = ?');
                upParams.push(cleanComplemento);
              }
              if (localPosto.nm_bairro !== cleanBairro) {
                upFields.push('nm_bairro = ?');
                upParams.push(cleanBairro);
              }
              if (localPosto.nu_cep !== cleanCep) {
                upFields.push('nu_cep = ?');
                upParams.push(cleanCep);
              }

              if (upFields.length > 0) {
                stats.postosUpdated++;
                
                if (!dryRun) {
                  upParams.push(id_posto);
                  await connection.execute(
                    `UPDATE tb_postos SET ${upFields.join(', ')} WHERE id_posto = ?`,
                    upParams
                  );
                }

                await logAction(
                  'ATUALIZACAO_POSTO_CADASTRO',
                  rawCnpj,
                  cleanNmPosto,
                  `Campos passíveis de atualização: ${upFields.map(f => f.split(' ')[0]).join(', ')}`
                );
              }

              // Sincronizar tancagem / bicos / combustíveis ativos
              const [localPricesRows] = await connection.execute(
                `SELECT id_produto, nu_tancagem, qt_bicos, ${activeColName} AS fl_ativo FROM tb_precos_combustiveis WHERE id_posto = ?`,
                [id_posto]
              );
              const localPricesList = localPricesRows as any[];
              const localPricesByProd: Record<number, any> = {};
              for (const pr of localPricesList) {
                localPricesByProd[pr.id_produto] = pr;
              }

              if (anpPosto.produtos && Array.isArray(anpPosto.produtos)) {
                for (const prod of anpPosto.produtos) {
                  const id_produto = resolveProductId(prod.produto);
                  if (!id_produto) continue;

                  anpProductIds.push(id_produto);
                  const tancagemANP = Number(prod.tancagem) || 0;
                  const bicosANP = Number(prod.qtdeBicos) || 0;

                  const localRecord = localPricesByProd[id_produto];

                  if (!localRecord) {
                    // Produto novo para posto existente: INSIRA
                    stats.tancagemInserted++;

                    if (!dryRun) {
                      await connection.execute(
                        `INSERT INTO tb_precos_combustiveis 
                         (id_posto, id_produto, vl_preco_venda, dt_ultima_atualizacao, ds_origem_dado, nu_tancagem, qt_bicos, fl_ativo)
                         VALUES (?, ?, NULL, NOW(), ?, ?, ?, 1)`,
                        [id_posto, id_produto, 'ANP_TANC_SYNC', tancagemANP, bicosANP]
                      );
                    }

                    await logAction(
                      'INSERCAO_TANCAGEM',
                      rawCnpj,
                      cleanNmPosto,
                      `Produto novo associado: "${prod.produto}" (ID ${id_produto}) com Tancagem: ${tancagemANP} m³, Bicos: ${bicosANP}.`
                    );
                  } else {
                    // Produto já existe localmente: ATUALIZE se houver divergência de volume de tancagem, bicos ou se estava desativado
                    const localTanc = localRecord.nu_tancagem !== null ? Number(localRecord.nu_tancagem) : null;
                    const localBicos = localRecord.qt_bicos !== null ? Number(localRecord.qt_bicos) : null;
                    const localAtivo = localRecord.fl_ativo !== null ? Number(localRecord.fl_ativo) : 1;

                    if (localTanc !== tancagemANP || localBicos !== bicosANP || localAtivo !== 1) {
                      stats.tancagemUpdated++;

                      if (!dryRun) {
                        await connection.execute(
                          `UPDATE tb_precos_combustiveis 
                           SET nu_tancagem = ?, qt_bicos = ?, fl_ativo = 1, dt_ultima_atualizacao = NOW()
                           WHERE id_posto = ? AND id_produto = ?`,
                          [tancagemANP, bicosANP, id_posto, id_produto]
                        );
                      }

                      await logAction(
                        'ATUALIZACAO_TANCAGEM',
                        rawCnpj,
                        cleanNmPosto,
                        `Atualizada tancagem para "${prod.produto}" (ID ${id_produto}): Tancagem (Local=${localTanc} m³ -> ANP=${tancagemANP} m³), Bicos (Local=${localBicos} -> ANP=${bicosANP}). Definição: Ativado.`
                      );
                    } else {
                      stats.duplicatesAvoided++;
                    }
                  }
                }
              }

              // Decomissionar combustíveis antigos do posto que NÃO vieram na listagem da API ANP
              for (const localPr of localPricesList) {
                // Se o produto está ativo localmente, mas não veio na lista de produtos ativos da ANP
                if (localPr.fl_ativo !== 0 && !anpProductIds.includes(localPr.id_produto)) {
                  stats.tancagemDisabled++;

                  if (!dryRun) {
                    await connection.execute(
                      `UPDATE tb_precos_combustiveis SET fl_ativo = 0, vl_preco_venda = NULL, dt_ultima_atualizacao = NOW() WHERE id_posto = ? AND id_produto = ?`,
                      [id_posto, localPr.id_produto]
                    );
                  }
                  
                  // Recupera descrição do produto para log legível
                  let pDesc = `Produto ID ${localPr.id_produto}`;
                  for (const [key, val] of Object.entries(PRODUCT_MAPPING)) {
                    if (val === localPr.id_produto) {
                      pDesc = key;
                      break;
                    }
                  }

                  await logAction(
                    'DESABILITACAO_TANCAGEM',
                    rawCnpj,
                    cleanNmPosto,
                    `Combustível desativado pois não é mais listado para este posto pela ANP: "${pDesc}" (ID ${localPr.id_produto}).`
                  );
                }
              }
            }
          }

          // Segue para a próxima página do município
          page++;

        } catch (pageErr: any) {
          console.error(`[TANCAGEM_SYNC] Erro ao obter dados para ${nm_municipio} na pág ${page}: ${pageErr.message}`);
          stats.errorsOccurred++;
          break;
        }
      }
    }

    // 3. Compilar relatório estatístico consolidado
    console.log("[TANCAGEM_SYNC] Transações simuladas/concluídas com sucesso. Gerando relatório...");
    
    const flagTeste = dryRun ? " [TESTE SIMULADO]" : "";
    const emailSubject = `[Enche o Tanque]${flagTeste} Relatório Sincronização e Tancagem ANP - ${new Date().toLocaleDateString('pt-BR')}`;
    
    // Obter totais atuais do banco de dados
    let localPostosTotal = 0;
    let localTancagensTotal = 0;
    try {
      const [[rawPostos]]: any = await connection.execute("SELECT COUNT(*) as total FROM tb_postos");
      const [[rawTancagens]]: any = await connection.execute(`SELECT COUNT(*) as total FROM tb_precos_combustiveis WHERE ${activeColName} = 1`);
      
      localPostosTotal = rawPostos.total;
      localTancagensTotal = rawTancagens.total;
    } catch (e) {
      console.warn("[TANCAGEM_SYNC] Falha ao coletar dados acumuladores de volume total:", e);
    }

    // Ajustar estatísticas finais no e-mail para refletir a simulação se for dryRun
    const finalPostosValue = localPostosTotal + (dryRun ? stats.postosInserted : 0);
    const finalTancagensValue = localTancagensTotal + (dryRun ? (stats.tancagemInserted - stats.tancagemDisabled) : 0);

    const emailHtml = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f1f5f9; padding: 40px; color: #1e293b; line-height: 1.6; font-size: 14px;">
        <div style="max-width: 800px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
          
          ${dryRun ? `
            <!-- Alerta Amarelo de Simulação / Dry-Run -->
            <div style="background-color: #fef3c7; color: #92400e; padding: 16px; text-align: center; border-bottom: 1px solid #fcd34d; font-weight: bold; font-family: sans-serif; font-size: 13px;">
              ⚠️ ATENÇÃO: ESTE É UM E-MAIL DE TESTE (DRY-RUN). NENHUMA ALTERAÇÃO EFETIVA FOI PERSISTIDA NO BANCO DE DADOS.
            </div>
          ` : ''}

          <!-- Header elegante com tom verde esmeralda de alto contraste -->
          <div style="background-color: #065f46; color: #ffffff; padding: 32px; text-align: center;">
            <p style="margin: 0; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; color: #34d399;">
              PROCESSO DIÁRIO • SISTEMA ${dryRun ? '(SIMULAÇÃO DE TESTE)' : ''}
            </p>
            <h1 style="margin: 8px 0 0 0; font-size: 26px; font-weight: 800; font-family: system-ui, sans-serif; letter-spacing: -0.5px;">Sincronização de Tancagem ANP</h1>
            <p style="margin: 6px 0 0 0; opacity: 0.9; font-size: 14px; font-weight: 500;">Rotina Executada às ${new Date().toLocaleTimeString('pt-BR')} (Horário de Brasília)</p>
          </div>

          <div style="padding: 35px;">
            <p style="font-size: 16px; font-weight: bold; margin-top: 0; color: #0f172a;">Prezados Administradores,</p>
            <p style="margin-bottom: 25px;">
              A rotina automática de consolidação e sincronização estrutural de postos de combustível e tancagem junto aos servidores da **ANP (Agência Nacional do Petróleo, Gás Natural e Biocombustíveis)** foi executada de forma autônoma ${dryRun ? 'como um teste simulado' : ''}. Abaixo encontram-se os indicadores de desempenho e o registro completo do lote processado:
            </p>

            <!-- Dashboard de Indicadores em Grid Bento -->
            <div style="margin-bottom: 35px;">
              <h3 style="margin: 0 0 15px 0; color: #0f172a; font-size: 15px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #f1f5f9; padding-bottom: 6px; font-weight: bold;">📊 Estatísticas Consolidadas</h3>
              
              <div style="display: flex; flex-wrap: wrap; margin: -8px;">
                <div style="flex: 1; min-width: 140px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 15px; margin: 8px; text-align: center;">
                  <span style="display: block; font-size: 22px; font-weight: 800; color: #0f172a;">${stats.citiesProcessed}</span>
                  <span style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 700;">Cidades Cobertas</span>
                </div>
                <div style="flex: 1; min-width: 140px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 15px; margin: 8px; text-align: center;">
                  <span style="display: block; font-size: 22px; font-weight: 800; color: #0284c7;">${stats.postosProcessed}</span>
                  <span style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 700;">Postos Verificados</span>
                </div>
                <div style="flex: 1; min-width: 140px; background-color: #ecfdf5; border: 1px solid #10b981; border-radius: 10px; padding: 15px; margin: 8px; text-align: center;">
                  <span style="display: block; font-size: 22px; font-weight: 800; color: #047857;">+${stats.postosInserted}</span>
                  <span style="font-size: 11px; color: #047857; text-transform: uppercase; font-weight: 700;">Novos Postos</span>
                </div>
                <div style="flex: 1; min-width: 140px; background-color: #eff6ff; border: 1px solid #3b82f6; border-radius: 10px; padding: 15px; margin: 8px; text-align: center;">
                  <span style="display: block; font-size: 22px; font-weight: 800; color: #1d4ed8;">${stats.postosUpdated}</span>
                  <span style="font-size: 11px; color: #1d4ed8; text-transform: uppercase; font-weight: 700;">Postos Atualizados</span>
                </div>
              </div>

              <div style="display: flex; flex-wrap: wrap; margin: 8px -8px -8px -8px;">
                <div style="flex: 1; min-width: 140px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 15px; margin: 8px; text-align: center;">
                  <span style="display: block; font-size: 22px; font-weight: 800; color: #059669;">+${stats.tancagemInserted}</span>
                  <span style="font-size: 11px; color: #059669; text-transform: uppercase; font-weight: 700;">Novas Tancagens</span>
                </div>
                <div style="flex: 1; min-width: 140px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 15px; margin: 8px; text-align: center;">
                  <span style="display: block; font-size: 22px; font-weight: 800; color: #d97706;">${stats.tancagemUpdated}</span>
                  <span style="font-size: 11px; color: #d97706; text-transform: uppercase; font-weight: 700;">Tancagens Mudadas</span>
                </div>
                <div style="flex: 1; min-width: 140px; background-color: #fef2f2; border: 1px solid #ef4444; border-radius: 10px; padding: 15px; margin: 8px; text-align: center;">
                  <span style="display: block; font-size: 22px; font-weight: 800; color: #b91c1c;">-${stats.tancagemDisabled}</span>
                  <span style="font-size: 11px; color: #b91c1c; text-transform: uppercase; font-weight: 700;">Combustíveis Off</span>
                </div>
                <div style="flex: 1; min-width: 140px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 15px; margin: 8px; text-align: center;">
                  <span style="display: block; font-size: 22px; font-weight: 800; color: #64748b;">${stats.duplicatesAvoided}</span>
                  <span style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 700;">Sincronizados</span>
                </div>
              </div>
            </div>

            <!-- Dados Totais da Plataforma -->
            <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0; margin-bottom: 35px;">
              <h4 style="margin: 0 0 8px 0; color: #0f172a; font-size: 14px; font-weight: bold;">🎯 Situação Projetada da Plataforma</h4>
              <div style="font-family: monospace; font-size: 13px; color: #334155;">
                • Total de postos cadastrados e em operação: <strong>${finalPostosValue}</strong> ${dryRun ? '*(projetado)*' : ''}<br>
                • Total de matrizes de combustíveis ativas monitoradas: <strong>${finalTancagensValue}</strong> ${dryRun ? '*(projetado)*' : ''}
              </div>
            </div>

            <!-- Listagem de transações detalhadas executadas -->
            <h3 style="margin: 0 0 15px 0; color: #0f172a; font-size: 15px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #f1f5f9; padding-bottom: 6px; font-weight: bold;">🧾 Extrato Detalhado de Operações ${dryRun ? '(Simulado)' : '(Lote)'}</h3>
            
            ${logsToEmail.length > 0 ? `
              <div style="background-color: #1e293b; border-radius: 12px; padding: 20px; overflow-x: auto; max-height: 400px; overflow-y: auto; border: 1px solid #0f172a;">
                <pre style="margin: 0; color: #34d399; font-family: 'Consolas', 'Fira Code', 'Courier New', monospace; font-size: 11px; line-height: 1.5; white-space: pre-wrap; word-break: break-all;">
${logsToEmail.join('\n')}
                </pre>
              </div>
            ` : `
              <div style="text-align: center; color: #64748b; font-style: italic; padding: 30px; border: 1px dashed #cbd5e1; border-radius: 12px;">
                Nenhuma divergência constatada ou simulada neste lote. Todos os postos e tancagens estão perfeitamente sincronizados com a ANP.
              </div>
            `}

            <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center;">
              Este e-mail foi disparado de forma automatizada pelo servidor central do projeto **Enche o Tanque** para testes e homologação.<br>
              © 2026 Enche o Tanque • Inteligência Coletiva para Economia.
            </div>
          </div>
        </div>
      </div>
    `;

    // 4. Buscar e compilar emails de destino de administradores (tb_empresa_contato com tipo 'A' e lista padrão)
    const adminEmails = new Set<string>([
      "marcio.vasconcellos@gmail.com",
      "afonsogwinter@gmail.com",
      "encheotanqueucp@gmail.com"
    ]);

    try {
      const [contatosRows] = await connection.execute(
        "SELECT ds_email FROM tb_empresa_contato WHERE fl_ativo = 1 AND tp_contato = 'A'"
      );
      const contacts = contatosRows as Array<{ ds_email: string }>;
      for (const row of contacts) {
        if (row.ds_email) {
          adminEmails.add(row.ds_email.toLowerCase().trim());
        }
      }
    } catch (e: any) {
      console.error("[TANCAGEM_SYNC] Erro ao carregar e-mails de admins no banco:", e.message);
    }

    if (process.env.SMTP_USER && process.env.SMTP_PASS && adminEmails.size > 0) {
      const transporter = nodemailer.createTransport({
        service: !process.env.SMTP_HOST ? 'gmail' : undefined,
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '465'),
        secure: process.env.SMTP_SECURE !== 'false',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

      console.log(`[TANCAGEM_SYNC] Enviando relatório por e-mail para ${adminEmails.size} administradores...`);
      await transporter.sendMail({
        from: `"Enche o Tanque" <${process.env.SMTP_USER}>`,
        to: Array.from(adminEmails).join(', '),
        subject: emailSubject,
        html: emailHtml
      });
      console.log("[TANCAGEM_SYNC] E-mail de relatório enviado com sucesso!");
    } else {
      console.log("[TANCAGEM_SYNC] Serviço de SMTP não configurado. Exibindo relatório de console apenas.");
    }

    return {
      success: true,
      stats
    };

  } catch (err: any) {
    console.error(`[TANCAGEM_SYNC] Erro crucial durante execução: ${err.message}`);
    stats.errorsOccurred++;
    return {
      success: false,
      error: err.message,
      stats
    };
  } finally {
    await connection.end();
  }
}

// Se o script for disparado diretamente por linha de comando
const isMain = process.argv[1] && (
  process.argv[1].endsWith('sync_tancagem.ts') || 
  process.argv[1].endsWith('sync_tancagem.js')
);

if (isMain) {
  const isDryRunArg = process.argv.includes('--dry-run') || process.argv.includes('-d');
  runAnpTancagemSync(isDryRunArg)
    .then((res) => {
      console.log("[TANCAGEM_SYNC] Processamento via CLI finalizado. Estatísticas:", res.stats);
      process.exit(res.success ? 0 : 1);
    })
    .catch((err) => {
      console.error("[TANCAGEM_SYNC] Falha ao finalizar CLI:", err);
      process.exit(1);
    });
}
