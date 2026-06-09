import os
import shutil
import re

HEADER_HTML = """<div class="brand-header-nav" style="background: #000000; border: 1px solid #1f2937; border-bottom: 3px solid #ccff00; padding: 15px 24px; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 15px; border-radius: 12px; margin-bottom: 30px; font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; box-shadow: 0 4px 15px rgba(0,0,0,0.15); max-width: 100%; box-sizing: border-box; color: #f8fafc; text-align: left;">
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
</div>"""

def main():
    source_rules = 'BUSINESS_RULES.html'
    target_rules = 'public/documentos/BUSINESS_RULES.html'
    
    # 1. Copy BUSINESS_RULES.html to public/documentos/BUSINESS_RULES.html if source exists
    if os.path.exists(source_rules):
        print(f"Moving {source_rules} to {target_rules}")
        shutil.copyfile(source_rules, target_rules)
    else:
        print(f"Warning: {source_rules} not found in workspace root.")
        
    documents = [
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
    ]

    clean_map = {
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
    }
    
    for doc in documents:
        if not os.path.exists(doc):
            print(f"Warning: Document {doc} does not exist.")
            continue
            
        print(f"Deep cleaning & syncing header for: {doc}...")
        with open(doc, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()

        filename = os.path.basename(doc)
        if filename not in clean_map:
            print(f"Warning: No clean map entry for {filename}. Skipping.")
            continue

        bound_str = clean_map[filename]
        content_pos = content.find(bound_str)

        if content_pos == -1:
            print(f"Error: Could not find content boundary '{bound_str}' in {doc}. Skipping.")
            continue

        # Look for container divs or body tags to find starting insertion point
        container_pattern = re.compile(r'<div\s+class=["\']container["\']\s*>', re.IGNORECASE)
        container_match = container_pattern.search(content)

        if container_match:
            insert_pos = container_match.end()
            insert_type = "container context"
        else:
            body_pattern = re.compile(r'<body[^>]*>', re.IGNORECASE)
            body_match = body_pattern.search(content)
            if body_match:
                insert_pos = body_match.end()
                insert_type = "body context"
            else:
                print(f"Error: Could not find container or body tag in {doc}.")
                continue

        # Keep everything before insert_pos, append the clean HEADER_HTML, and append everything from content_pos
        prefix = content[:insert_pos]
        suffix = content[content_pos:]
        
        new_content = prefix + "\n" + HEADER_HTML + "\n" + suffix
        print(f"Successfully cleaned all cascading/dangling/old menus and cleanly injected new brand header under {insert_type} into {doc}.")

        with open(doc, 'w', encoding='utf-8') as f:
            f.write(new_content)

    print("Formatting and header sync complete!")

if __name__ == '__main__':
    main()
