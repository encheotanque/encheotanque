import * as fs from 'fs';
import * as path from 'path';

const HEADER_HTML = `<div class="brand-header-nav" style="background: #000000; border: 1px solid #1f2937; border-bottom: 3px solid #ccff00; padding: 15px 24px; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 15px; border-radius: 12px; margin-bottom: 30px; font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; box-shadow: 0 4px 15px rgba(0,0,0,0.15); max-width: 100%; box-sizing: border-box; color: #f8fafc; text-align: left;">
    <div style="display: flex; align-items: center; gap: 12px;">
        <img src="/Logo_maker_project.png" alt="Logo Enche o Tanque" style="width: 48px; height: 48px; object-fit: contain;" referrerpolicy="no-referrer">
        <div>
            <div style="font-size: 1.15rem; font-weight: 800; tracking: tight; color: #ffffff; line-height: 1.2;">ENCHE O <span style="color: #ccff00;">TANQUE</span></div>
            <div style="font-size: 0.7rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; line-height: 1.2;">Ecossistema Inteligente de Combustíveis</div>
        </div>
    </div>
    <nav style="display: flex; flex-wrap: wrap; gap: 10px; align-items: center;">
        <a href="https://app.encheotanque.net.br" style="font-size: 0.8rem; font-weight: 700; color: #ccff00; text-decoration: none; padding: 5px 12px; border: 1px solid rgba(204, 255, 0, 0.4); border-radius: 6px; transition: all 0.2s; white-space: nowrap;" onmouseover="this.style.background='rgba(204,255,0,0.15)'" onmouseout="this.style.background='transparent'">IR PARA O APP ➔</a>
        <a href="./RELATORIO_PROJETO.html" style="font-size: 0.78rem; font-weight: 600; color: #e2e8f0; text-decoration: none; padding: 5px 8px; border-radius: 4px; transition: color 0.15s; white-space: nowrap;" onmouseover="this.style.color='#ccff00'" onmouseout="this.style.color='#e2e8f0'">Relatório</a>
        <a href="./Relatorio_Atividades_Semestre.html" style="font-size: 0.78rem; font-weight: 600; color: #e2e8f0; text-decoration: none; padding: 5px 8px; border-radius: 4px; transition: color 0.15s; white-space: nowrap;" onmouseover="this.style.color='#ccff00'" onmouseout="this.style.color='#e2e8f0'">Atividades</a>
        <a href="./doc.html" style="font-size: 0.78rem; font-weight: 600; color: #e2e8f0; text-decoration: none; padding: 5px 8px; border-radius: 4px; transition: color 0.15s; white-space: nowrap;" onmouseover="this.style.color='#ccff00'" onmouseout="this.style.color='#e2e8f0'">Escopo</a>
        <a href="./Analise_Concorrencia.html" style="font-size: 0.78rem; font-weight: 600; color: #e2e8f0; text-decoration: none; padding: 5px 8px; border-radius: 4px; transition: color 0.15s; white-space: nowrap;" onmouseover="this.style.color='#ccff00'" onmouseout="this.style.color='#e2e8f0'">Concorrência</a>
        <a href="./Analise_Expansao_Rede.html" style="font-size: 0.78rem; font-weight: 600; color: #e2e8f0; text-decoration: none; padding: 5px 8px; border-radius: 4px; transition: color 0.15s; white-space: nowrap;" onmouseover="this.style.color='#ccff00'" onmouseout="this.style.color='#e2e8f0'">Expansão</a>
        <a href="./Gestao_Seguranca_Veiculos.html" style="font-size: 0.78rem; font-weight: 600; color: #e2e8f0; text-decoration: none; padding: 5px 8px; border-radius: 4px; transition: color 0.15s; white-space: nowrap;" onmouseover="this.style.color='#ccff00'" onmouseout="this.style.color='#e2e8f0'">Segurança</a>
        <a href="./Status_Arquitetura.html" style="font-size: 0.78rem; font-weight: 600; color: #e2e8f0; text-decoration: none; padding: 5px 8px; border-radius: 4px; transition: color 0.15s; white-space: nowrap;" onmouseover="this.style.color='#ccff00'" onmouseout="this.style.color='#e2e8f0'">Arquitetura</a>
        <a href="./BUSINESS_RULES.html" style="font-size: 0.78rem; font-weight: 600; color: #e2e8f0; text-decoration: none; padding: 5px 8px; border-radius: 4px; transition: color 0.15s; white-space: nowrap;" onmouseover="this.style.color='#ccff00'" onmouseout="this.style.color='#e2e8f0'">Regras</a>
        <a href="./backlog.html" style="font-size: 0.78rem; font-weight: 600; color: #e2e8f0; text-decoration: none; padding: 5px 8px; border-radius: 4px; transition: color 0.15s; white-space: nowrap;" onmouseover="this.style.color='#ccff00'" onmouseout="this.style.color='#e2e8f0'">Roadmap</a>
        <a href="./apresentacao_radar.html" style="font-size: 0.78rem; font-weight: 700; color: #ccff00; text-decoration: none; padding: 4px 8px; background: rgba(204, 255, 0, 0.1); border: 1px solid rgba(204, 255, 0, 0.3); border-radius: 4px; transition: color 0.15s; white-space: nowrap;" onmouseover="this.style.color='#ffffff'; this.style.background='rgba(204,255,0,0.2)'" onmouseout="this.style.color='#ccff00'; this.style.background='rgba(204,255,0,0.1)'">📺 Apresentação</a>
        <a href="./mapa-implantacao-sudeste.html" style="font-size: 0.78rem; font-weight: 600; color: #e2e8f0; text-decoration: none; padding: 5px 8px; border-radius: 4px; transition: color 0.15s; white-space: nowrap;" onmouseover="this.style.color='#ccff00'" onmouseout="this.style.color='#e2e8f0'">Sudeste</a>
    </nav>
</div>`;

function processDocs() {
  const sourceRules = 'BUSINESS_RULES.html';
  const targetRules = 'public/documentos/BUSINESS_RULES.html';

  if (fs.existsSync(sourceRules)) {
    console.log(`Copying ${sourceRules} to ${targetRules}`);
    fs.copyFileSync(sourceRules, targetRules);
  } else {
    console.log(`Warning: ${sourceRules} not found in workspace root.`);
  }

  const documents = [
    'public/documentos/RELATORIO_PROJETO.html',
    'public/documentos/Relatorio_Atividades_Semestre.html',
    'public/documentos/doc.html',
    'public/documentos/Analise_Concorrencia.html',
    'public/documentos/Analise_Expansao_Rede.html',
    'public/documentos/Gestao_Seguranca_Veiculos.html',
    'public/documentos/Status_Arquitetura.html',
    'public/documentos/backlog.html',
    'public/documentos/BUSINESS_RULES.html',
    'public/documentos/apresentacao_radar.html',
    'public/documentos/mapa-implantacao-sudeste.html'
  ];

  const cleanMap: { [key: string]: string } = {
    'RELATORIO_PROJETO.html': '<header style="display: flex;',
    'Relatorio_Atividades_Semestre.html': '<div class="university-header">',
    'doc.html': '<h1>Documentação Técnica e Histórica</h1>',
    'Analise_Concorrencia.html': '<h1>Análise de Concorrência Estratégica</h1>',
    'Analise_Expansao_Rede.html': '<h1>Análise de Expansão de Rede</h1>',
    'Gestao_Seguranca_Veiculos.html': '<h1>🛡️ Protocolos de Exceção: Ouro & Segurança</h1>',
    'Status_Arquitetura.html': '<h1>Status de Arquitetura & Microserviços</h1>',
    'backlog.html': '<main class="max-w',
    'BUSINESS_RULES.html': '<h1 class="text-5xl',
    'apresentacao_radar.html': '<h1>ENCHE O <span>TANQUE</span></h1>',
    'mapa-implantacao-sudeste.html': '<div class="topbar">'
  };

  for (const doc of documents) {
    if (!fs.existsSync(doc)) {
      console.log(`Warning: Document ${doc} does not exist.`);
      continue;
    }

    console.log(`Deep cleaning & syncing header for: ${doc}...`);
    let content = fs.readFileSync(doc, 'utf8');

    const filename = path.basename(doc);
    const boundStr = cleanMap[filename];
    if (!boundStr) {
      console.log(`Warning: No clean map entry for ${filename}. Skipping.`);
      continue;
    }

    const contentPos = content.indexOf(boundStr);
    if (contentPos === -1) {
      console.log(`Error: Could not find content boundary '${boundStr}' in ${doc}. Skipping.`);
      continue;
    }

    // Look for container context
    const containerMatch = content.match(/<div\s+class=["']container["']\s*>/i);
    let insertPos = -1;
    let insertType = "";

    if (containerMatch && containerMatch.index !== undefined) {
      insertPos = containerMatch.index + containerMatch[0].length;
      insertType = "container context";
    } else {
      const bodyMatch = content.match(/<body[^>]*>/i);
      if (bodyMatch && bodyMatch.index !== undefined) {
        insertPos = bodyMatch.index + bodyMatch[0].length;
        insertType = "body context";
      } else {
        console.log(`Error: Could not find container or body tag in ${doc}.`);
        continue;
      }
    }

    const prefix = content.slice(0, insertPos);
    const suffix = content.slice(contentPos);
    
    const newContent = prefix + "\n" + HEADER_HTML + "\n" + suffix;
    console.log(`Successfully cleaned and injected new brand header under ${insertType} into ${doc}.`);

    fs.writeFileSync(doc, newContent, 'utf8');
  }

  console.log("Formatting and header sync complete!");
}

processDocs();
