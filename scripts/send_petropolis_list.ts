import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

// Função resiliente para converter coordenadas DMS (Graus:Minutos:Segundos) ou decimais para graus decimais reais
function parseDmsToDecimal(dmsStr: string): number | null {
  if (!dmsStr) return null;
  const trimmed = dmsStr.trim();
  if (trimmed === '0' || trimmed === '') return 0;
  
  // Se já estiver no formato decimal correto (número ou número com ponto)
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return parseFloat(trimmed);
  }

  // Se for formato DMS com ":" separados, por exemplo: "-22:16:04.248" ou "-22:16:04"
  const parts = trimmed.split(':');
  if (parts.length >= 3) {
    const deg = Math.abs(parseFloat(parts[0]));
    const min = parseFloat(parts[1]) || 0;
    const sec = parseFloat(parts[2]) || 0;
    let decimal = deg + min / 60 + sec / 3600;
    if (parts[0].startsWith('-')) {
      decimal = -decimal;
    }
    return parseFloat(decimal.toFixed(7));
  }

  // Tenta conversões alternativas limpando caracteres indesejados
  const clean = trimmed.replace(',', '.');
  const val = parseFloat(clean);
  return isNaN(val) ? null : val;
}

// Interface auxiliar para os postos processados
interface PostoAuditado {
  id_posto: number;
  nm_posto: string;
  nu_cnpjposto: string;
  ds_endereco: string;
  nm_bairro: string;
  nm_bandeira: string;
  geo_latitude: string;
  geo_longitude: string;
  missingGasolina: boolean;
  missingEtanol: boolean;
}

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "129.146.31.117",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "nRGboHgFC7PkD9",
    database: process.env.DB_NAME || "encheotanque",
    timezone: "-03:00"
  });

  try {
    console.log("[REPORT] Carregando todos os postos de Petrópolis com bairro...");
    
    // Buscar postos em Petrópolis (usando LIKE por segurança de acentuação)
    const [postosRows]: any = await connection.execute(
      `SELECT id_posto, nm_posto, nu_cnpjposto, ds_endereco, nm_bairro, nm_bandeira, geo_latitude, geo_longitude 
       FROM tb_postos 
       WHERE (nm_municipio LIKE 'Petropolis' OR nm_municipio LIKE 'Petrópolis')`
    );

    console.log(`[REPORT] Encontrados ${postosRows.length} postos em Petrópolis.`);

    const postosNoPrices: PostoAuditado[] = [];

    for (const posto of postosRows) {
      // Verificar se possui preço de Gasolina C Comum (ID 3) e Etanol Hidratado Comum (ID 2)
      const [pricesRows]: any = await connection.execute(
        `SELECT id_produto, vl_preco_venda 
         FROM tb_precos_combustiveis 
         WHERE id_posto = ? AND id_produto IN (2, 3) AND vl_preco_venda IS NOT NULL AND vl_preco_venda > 0`,
        [posto.id_posto]
      );

      // Mapeia se possui cada combustível
      const hasEtanol = pricesRows.some((p: any) => p.id_produto === 2);
      const hasGasolina = pricesRows.some((p: any) => p.id_produto === 3);

      // Se faltar algum dos dois preços, inclui na lista de auditoria
      if (!hasGasolina || !hasEtanol) {
        postosNoPrices.push({
          id_posto: posto.id_posto,
          nm_posto: posto.nm_posto,
          nu_cnpjposto: posto.nu_cnpjposto,
          ds_endereco: posto.ds_endereco,
          nm_bairro: (posto.nm_bairro || 'CENTRO').trim().toUpperCase(),
          nm_bandeira: posto.nm_bandeira,
          geo_latitude: posto.geo_latitude,
          geo_longitude: posto.geo_longitude,
          missingGasolina: !hasGasolina,
          missingEtanol: !hasEtanol
        });
      }
    }

    console.log(`[REPORT] Total de ${postosNoPrices.length} postos sem preços de Gasolina Comum e/ou Etanol.`);

    // Agrupar os postos por bairro
    const postosPorBairro: Record<string, PostoAuditado[]> = {};
    for (const p of postosNoPrices) {
      const bairro = p.nm_bairro || 'CENTRO';
      if (!postosPorBairro[bairro]) {
        postosPorBairro[bairro] = [];
      }
      postosPorBairro[bairro].push(p);
    }

    // Ordenar os bairros em ordem alfabética para facilitar
    const bairrosOrdenados = Object.keys(postosPorBairro).sort();

    const destinationEmail = "encheotanqueucp@gmail.com";
    const emailSubject = `[Enche o Tanque] Auditoria e Roteiro de Pesquisa: Cobertura Petrópolis - RJ`;

    let contentHtml = "";

    if (bairrosOrdenados.length === 0) {
      contentHtml = `
        <div style="background-color: #ecfdf5; border: 1px solid #10b981; border-radius: 12px; padding: 24px; text-align: center; color: #065f46; font-weight: bold; font-size: 15px;">
          🎉 Excelente notícia! Todos os postos registrados em Petrópolis já contam com preços ativos para Gasolina Comum e Etanol!
        </div>
      `;
    } else {
      // Gerar blocos de bairro com tabelas e rota correspondentes
      for (const bairro of bairrosOrdenados) {
        const postosBairro = postosPorBairro[bairro];
        
        // Obter coordenadas decimais válidas para criar o link de Rota Integrada/Otimizada no Google Maps
        const linkCoordenadas: string[] = [];
        for (const p of postosBairro) {
          const latDec = parseDmsToDecimal(p.geo_latitude);
          const lngDec = parseDmsToDecimal(p.geo_longitude);
          if (latDec !== null && lngDec !== null && latDec !== 0 && lngDec !== 0) {
            linkCoordenadas.push(`${latDec},${lngDec}`);
          }
        }

        // Criar link de rota unindo todos os pontos do respectivo bairro
        let routeHtml = "";
        if (linkCoordenadas.length > 0) {
          // Exemplo de link de direções do google maps: https://www.google.com/maps/dir/-22.5029,-43.1772/-22.5034,-43.1782
          const mapsDirLink = `https://www.google.com/maps/dir/${linkCoordenadas.join('/')}`;
          routeHtml = `
            <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px; margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between;">
              <span style="font-size: 13px; color: #166534; font-weight: 500;">
                🚗 <strong>Rota recomendada para este bairro:</strong> ${postosBairro.length} postos a serem visitados.
              </span>
              <a href="${mapsDirLink}" target="_blank" style="background-color: #10b981; color: #ffffff; text-decoration: none; padding: 6px 14px; border-radius: 6px; font-weight: bold; font-size: 12px; display: inline-block; box-shadow: 0 2px 4px rgba(16,185,129,0.15);">
                Iniciar Rota Completa no Google Maps 🗺️
              </a>
            </div>
          `;
        } else {
          routeHtml = `
            <div style="background-color: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; padding: 12px; margin-bottom: 12px; font-size: 12px; color: #92400e; font-style: italic;">
              ⚠️ Coordenadas dos postos deste bairro precisam ser atualizadas antes de gerar rotas integradas do Maps.
            </div>
          `;
        }

        // Gerar linhas da tabela de postos do bairro
        let tableRows = "";
        for (const [idx, p] of postosBairro.entries()) {
          const bgStyle = idx % 2 === 0 ? "#ffffff" : "#f8fafc";
          const latDec = parseDmsToDecimal(p.geo_latitude);
          const lngDec = parseDmsToDecimal(p.geo_longitude);
          
          let mapsSingleLink = "";
          let coordsCell = "";

          if (latDec !== null && lngDec !== null && latDec !== 0 && lngDec !== 0) {
            mapsSingleLink = `https://www.google.com/maps/search/?api=1&query=${latDec},${lngDec}`;
            coordsCell = `
              <a href="${mapsSingleLink}" target="_blank" style="color: #0284c7; font-weight: bold; text-decoration: underline; font-family: monospace; font-size: 11px; white-space: nowrap;">
                📍 Abrir Maps (${latDec.toFixed(4)}, ${lngDec.toFixed(4)})
              </a>
            `;
          } else {
            coordsCell = `<span style="color: #94a3b8; font-style: italic; font-size: 11px;">Indisponível</span>`;
          }

          let missingDesc = "";
          if (p.missingGasolina && p.missingEtanol) {
            missingDesc = `<span style="display:inline-block; background-color: #fef2f2; color: #991b1b; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: bold;">Gasolina & Etanol</span>`;
          } else if (p.missingGasolina) {
            missingDesc = `<span style="display:inline-block; background-color: #fffbeb; color: #92400e; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: bold;">Gasolina Comum</span>`;
          } else {
            missingDesc = `<span style="display:inline-block; background-color: #eff6ff; color: #1e40af; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: bold;">Etanol Comum</span>`;
          }

          tableRows += `
            <tr style="background-color: ${bgStyle}; border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 12px; font-weight: bold; color: #0f172a; width: 35%;">
                ${p.nm_posto}<br>
                <span style="font-size: 10px; color: #64748b; font-weight: normal; font-family: monospace;">CNPJ: ${p.nu_cnpjposto}</span>
              </td>
              <td style="padding: 12px; color: #334155; font-size: 12px; width: 15%;">
                ${p.nm_bandeira || '<span style="color: #94a3b8; font-style: italic;">Bandeira Branca</span>'}
              </td>
              <td style="padding: 12px; color: #475569; font-size: 11px; width: 30%;">
                ${p.ds_endereco}
              </td>
              <td style="padding: 12px; text-align: center; width: 10px;">
                ${missingDesc}
              </td>
              <td style="padding: 12px; text-align: center; width: 10px;">
                ${coordsCell}
              </td>
            </tr>
          `;
        }

        contentHtml += `
          <div style="margin-bottom: 35px; background-color: #ffffff; border: 1px solid #cbd5e1; border-radius: 12px; padding: 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);">
            <div style="border-bottom: 2px solid #065f46; padding-bottom: 8px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
              <h3 style="margin: 0; color: #065f46; font-size: 16px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">🏘️ Bairro: ${bairro}</h3>
              <span style="background-color: #f1f5f9; color: #334155; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: bold;">
                ${postosBairro.length} postos pendentes
              </span>
            </div>
            
            ${routeHtml}

            <div style="overflow-x: auto; border: 1px solid #e2e8f0; border-radius: 8px;">
              <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 12px;">
                <thead>
                  <tr style="background-color: #f8fafc; border-bottom: 2px solid #cbd5e1; color: #475569; font-weight: bold;">
                    <th style="padding: 12px;">Posto / CNPJ</th>
                    <th style="padding: 12px;">Bandeira</th>
                    <th style="padding: 12px;">Endereço</th>
                    <th style="padding: 12px; text-align: center;">Preço Ausente</th>
                    <th style="padding: 12px; text-align: center;">Localização</th>
                  </tr>
                </thead>
                <tbody>
                  ${tableRows}
                </tbody>
              </table>
            </div>
          </div>
        `;
      }
    }

    const emailHtml = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f1f5f9; padding: 40px; color: #1e293b; line-height: 1.6; font-size: 14px;">
        <div style="max-width: 950px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
          <!-- Header premium esmeralda -->
          <div style="background-color: #065f46; color: #ffffff; padding: 32px; text-align: center;">
            <p style="margin: 0; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; color: #34d399;">MATRIZ DE PENDÊNCIAS • PETRÓPOLIS</p>
            <h1 style="margin: 8px 0 0 0; font-size: 26px; font-weight: 800; font-family: system-ui, sans-serif; letter-spacing: -0.5px;">Roteiro de Cobertura de Preços</h1>
            <p style="margin: 6px 0 0 0; opacity: 0.9; font-size: 14px; font-weight: 500;">Postos Agrupados por Bairro com Rotas Integradas para o Google Maps</p>
          </div>

          <div style="padding: 35px;">
            <p style="font-size: 16px; font-weight: bold; margin-top: 0; color: #0f172a;">Prezados Administradores,</p>
            <p style="margin-bottom: 25px;">
              Geramos o relatório tático completo para Petrópolis. Os postos que no momento estão sem preços cadastrados para **Gasolina Comum** e/ou **Etanol Comum** foram mapeados e organizados de forma regionalizada por **Bairros**.
            </p>

            <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 20px; margin-bottom: 30px; display: flex; align-items: center; justify-content: space-between;">
              <div style="font-family: inherit; font-size: 13px; color: #1e3a8a;">
                📢 <strong>Estatísticas de Apoio à Cobertura:</strong><br>
                • Total de postos registrados em Petrópolis: <strong>${postosRows.length}</strong><br>
                • Postos pendentes de atualização: <strong style="color: #b91c1c;">${postosNoPrices.length}</strong><br>
                • Total de bairros com pendências de cobertura: <strong>${bairrosOrdenados.length}</strong>
              </div>
              <div style="background-color: #3b82f6; color: #ffffff; padding: 10px 16px; border-radius: 8px; text-align: center; font-size: 12px; font-weight: bold;">
                GPS Ajustado (Decimal) ✔️
              </div>
            </div>

            <h3 style="margin: 0 0 15px 0; color: #0f172a; font-size: 15px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #cbd5e1; padding-bottom: 6px; font-weight: bold;">🗺️ Segmentação Territorial e Rotas</h3>
            
            ${contentHtml}

            <p style="font-size: 11px; color: #64748b; line-height: 1.5; margin-top: 30px; text-align: right;">
              Rotina sob demanda processada em: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })} (Horário de Brasília)
            </p>

            <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center;">
              Disparado sob demanda para fins de homologação e pesquisa de campo do projeto **Enche o Tanque**.<br>
              © 2026 Enche o Tanque • Economia Inteligente Coletiva.
            </div>
          </div>
        </div>
      </div>
    `;

    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
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

      console.log(`[REPORT] Enviando e-mail consolidado e otimizado para ${destinationEmail}...`);
      await transporter.sendMail({
        from: `"Enche o Tanque - Roteirizador" <${process.env.SMTP_USER}>`,
        to: destinationEmail,
        subject: emailSubject,
        html: emailHtml
      });
      console.log("[REPORT] E-mail enviado com sucesso!");
    } else {
      console.error("[REPORT] SMTP_USER e SMTP_PASS não configurados. Encerrando.");
    }

  } catch (err: any) {
    console.error("[REPORT] Erro ao executar auditoria e roteamento de Petrópolis:", err);
  } finally {
    await connection.end();
  }
}

run();
