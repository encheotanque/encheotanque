import os
import time
import random

os.environ['TZ'] = 'America/Sao_Paulo'
try:
    time.tzset()
except AttributeError:
    pass
import re
from datetime import datetime
from bs4 import BeautifulSoup
import pymysql
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError
from dotenv import load_dotenv

load_dotenv()

def extract_chave_and_cnpj(url):
    match = re.search(r'p=([0-9]{44})', url)
    if match:
        chave = match.group(1)
        cnpj = chave[6:20]
        return chave, cnpj
    return None, None

def read_db_config():
    return {
        'host': os.environ.get('DB_HOST'),
        'user': os.environ.get('DB_USER'),
        'password': os.environ.get('DB_PASSWORD'),
        'database': os.environ.get('DB_NAME'),
        'cursorclass': pymysql.cursors.DictCursor
    }

def mapear_id_produto(descricao_str):
    desc = descricao_str.lower()
    
    # GNV
    if 'gnv' in desc or 'gas natural' in desc:
        return 11
        
    # ETANOL
    if 'etanol' in desc or 'alcool' in desc:
        if 'adit' in desc or 'grid' in desc or 'v-power' in desc or 'v power' in desc:
            return 1
        return 2 # Comum
        
    # GASOLINA
    if 'gasolina' in desc:
        if 'premium' in desc or 'podium' in desc or 'octapro' in desc:
            if 'adit' in desc:
                return 6
            return 5
        if 'adit' in desc or 'grid' in desc or 'v-power' in desc or 'v power' in desc or 'dt clean' in desc:
            return 4
        return 3 # Comum
        
    # DIESEL
    if 'diesel' in desc:
        if 's10' in desc or 's-10' in desc or 's 10' in desc:
            if 'adit' in desc or 'grid' in desc:
                return 7
            return 8 # S10 Comum
        else: # S500 ou default
            if 'adit' in desc or 'grid' in desc:
                return 9
            return 10 # S500 Comum
            
    return None # Não é combustível tabelado ou não reconhecido

def formatar_data_mysql(emissao_str):
    if not emissao_str:
        return None
    # Converte '25/03/2026 12:33:39-03:00' ou '25/03/2026 12:33' para '2026-03-25 12:33:39'
    try:
        # Pega a parte antes do fuso ou traços
        dt_base = emissao_str.split('-')[0].strip()
        parts = dt_base.split()
        if len(parts) >= 2:
            dt_base = f"{parts[0]} {parts[1]}"
        else:
            dt_base = parts[0]
            
        try:
            dt_obj = datetime.strptime(dt_base, '%d/%m/%Y %H:%M:%S')
            return dt_obj.strftime('%Y-%m-%d %H:%M:%S')
        except Exception:
            dt_obj = datetime.strptime(dt_base, '%d/%m/%Y %H:%M')
            return dt_obj.strftime('%Y-%m-%d %H:%M:00')
    except Exception:
        return None

def fetch_nfe_data(url):
    if url.startswith('\ufeff'):
        url = url[1:]
        
    with sync_playwright() as p:
        # A SEFAZ-RJ possui um desafio JavaScript anti-bot da F5 (TSPD). 
        # Precisamos de um navegador real rodando em background para processar o JS e obter a nota.
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            viewport={"width": 1280, "height": 800}
        )
        page = context.new_page()
        
        try:
            # Entra na url e aguarda estabilizar de forma tolerante a redes lentas
            try:
                page.goto(url, timeout=30000, wait_until="domcontentloaded")
            except Exception as e_goto:
                # Caso ocorra timeout (por trackers ou imagens lentas na SEFAZ), verificamos o html atual
                if "timeout" in str(e_goto).lower():
                    try:
                        html_temp = page.content()
                        if html_temp and len(html_temp) > 1000 and ("myTable" in html_temp or "tabResult" in html_temp or "Chave" in html_temp):
                            pass
                        else:
                            page.goto(url, timeout=20000, wait_until="commit")
                    except Exception:
                        pass
                else:
                    raise e_goto
            
            # Detecta se é de MG (UF 31 ou domínio mg.gov.br) para adaptar o tempo de espera e seletores
            chave, cnpj = extract_chave_and_cnpj(url)
            uf_code = chave[0:2] if chave else None
            is_mg = (uf_code == "31") or ("mg.gov.br" in url) or ("portalnfce" in url)
            
            if is_mg:
                # Sistemas de MG não possuem o WAF anti-bot rígido da F5, carregando diretamente
                try:
                    page.wait_for_selector("text=Chave de Acesso, text=Chave, table, .ui-datatable", timeout=15000)
                except Exception:
                    pass
                try:
                    page.wait_for_load_state("networkidle", timeout=3000)
                except Exception:
                    pass
            else:
                # Aguarda o JavaScript de desafio da F5 rodar, possivelmente recarregar a página,
                # e só libera o script quando a bendita tabela E PEO MENOS UM PRODUTO surgir no HTML
                page.wait_for_selector("#tabResult .txtTit", timeout=20000)
            
            # Captura de conteúdo em loop para lidar com redirecionamentos ativos e evitar erro de navegação
            html = ""
            for x in range(15):  # Aumentado para até 15 tentativas para lidar com redirecionamentos e navegações ativas
                try:
                    html = page.content()
                    if html and len(html) > 1000 and "navigating" not in html.lower():
                        break
                except Exception:
                    pass
                page.wait_for_timeout(1000)
            
            if not html:
                try:
                    html = page.content()
                except Exception as e_final:
                    page.wait_for_timeout(2000)
                    try:
                        html = page.content()
                    except Exception:
                        raise Exception(f"Erro persistente de navegacao na SEFAZ: {e_final}")
            return html
        except Exception as e:
            # Caso ocorra qualquer erro de Playwright (como timeout ou navegação), tentamos uma última vez com carinho
            try:
                page.wait_for_timeout(2000)
                html = page.content()
                if html and len(html) > 1000:
                    return html
            except Exception:
                pass
            raise e
        finally:
            browser.close()

def parse_nfe_html(html):
    soup = BeautifulSoup(html, 'html.parser')
    
    items = []
    qtd_total_itens = 0
    valor_total_nota = 0.0
    dh_emissao = None

    # --- 1. TENTA ESTRUTURA DE MINAS GERAIS (MG) ---
    tbody_mytable = (
        soup.find('tbody', id='myTable') or 
        soup.find('tbody', id=re.compile(r'myTable', re.I)) or
        soup.find('table', class_=re.compile(r'table-striped', re.I)) or
        soup.find(id=re.compile(r'compraTable_data|itensTable|myTable', re.I))
    )
    
    mg_rows = []
    if tbody_mytable:
        mg_rows = tbody_mytable.find_all('tr')
        
    if not mg_rows:
        # Se não achou por ID de tabela, procura por qualquer linha de tabela contendo indicadores de MG
        for r in soup.find_all('tr'):
            r_text = r.get_text()
            if 'un:' in r_text.lower() and ('qtde total' in r_text.lower() or 'qtd' in r_text.lower() or 'valor total' in r_text.lower() or 'l' in r_text.lower()):
                mg_rows.append(r)
                
    if mg_rows:
        for row in mg_rows:
            tds = row.find_all('td')
            if len(tds) >= 3:
                desc_tag = tds[0].find('h7') or tds[0].find('h6') or tds[0].find('span') or tds[0]
                desc = desc_tag.text.strip()
                desc = re.sub(r'\(Código:.*?\)', '', desc).strip()
                
                if not desc or len(desc) < 3:
                    continue
                
                # Encontra TD de Quantidade
                qtd_td = None
                for td in tds:
                    if any(kw in td.text.lower() for kw in ['qtde', 'qtd', 'quantidade', 'qtde total']):
                        qtd_td = td
                        break
                if not qtd_td and len(tds) > 1:
                    qtd_td = tds[1]
                
                qtd = 0.0
                if qtd_td:
                    qtd_text = qtd_td.text.strip()
                    qtd_raw = re.sub(r'[^\d,.]', '', qtd_text).replace(',', '.')
                    try:
                        qtd = float(qtd_raw)
                    except ValueError:
                        pass
                
                # Valor Total
                total_td = tds[-1] if len(tds) > 2 else tds[1]
                total_text = total_td.text.strip()
                total_raw = re.sub(r'[^\d,.]', '', total_text).replace(',', '.')
                total = 0.0
                try:
                    total = float(total_raw)
                except ValueError:
                    pass
                
                # Unitário calculado
                unit = 0.0
                if qtd > 0.0:
                    unit = round(total / qtd, 4)
                    
                items.append({
                    'descricao': desc,
                    'quantidade': qtd,
                    'valor_unitario': unit,
                    'valor_total': total
                })

    # --- 2. TENTA ESTRUTURA DO RIO DE JANEIRO (RJ) SE MG NÃO TROUXE ITENS ---
    if not items:
        table = soup.find('table', id='tabResult')
        if table:
            rows = table.find_all('tr')
            for row in rows:
                desc_tag = row.find('span', class_='txtTit')
                if not desc_tag:
                    continue
                desc = desc_tag.text.strip()
                
                qtd = 0.0
                qtd_tag = row.find('span', class_='Rqtd')
                if qtd_tag:
                    qtd_raw = qtd_tag.text.replace('Qtde.:', '').strip()
                    qtd_clean = re.sub(r'[^\d,.]', '', qtd_raw).replace(',', '.')
                    try: qtd = float(qtd_clean)
                    except ValueError: pass
                
                unit = 0.0
                unit_tag = row.find('span', class_='RvlUnit')
                if unit_tag:
                    unit_raw = unit_tag.text.replace('Vl. Unit.:', '').strip()
                    unit_clean = re.sub(r'[^\d,.]', '', unit_raw).replace(',', '.')
                    try: unit = float(unit_clean)
                    except ValueError: pass
                
                total = 0.0
                total_tag = row.find('span', class_='valor')
                if total_tag:
                    total_raw = total_tag.text.strip()
                    total_clean = re.sub(r'[^\d,.]', '', total_raw).replace(',', '.')
                    try: total = float(total_clean)
                    except ValueError: pass
                    
                items.append({
                    'descricao': desc,
                    'quantidade': qtd,
                    'valor_unitario': unit,
                    'valor_total': total
                })

    # --- 3. SE AINDA NÃO ACHOU PRODUTOS, CORES/CLASSES GENÉRICAS COMO FALLBACK ---
    if not items:
        item_rows = soup.find_all(id=re.compile(r'rowAncor|tabResult')) or soup.find_all('tr', class_=re.compile(r'txtLinha|impar|par|ui-widget-content|grid-row'))
        for row in item_rows:
            cols = row.find_all('td')
            if len(cols) < 3:
                continue
                
            desc_tag = row.find(class_=re.compile(r'txtTit|txtTitulo|nom-prod|prod-desc|descricao')) or row.find('span', class_='txtTit') or cols[0]
            if not desc_tag:
                continue
                
            desc = desc_tag.text.strip()
            desc = re.sub(r'\(Código:.*?\)', '', desc).strip()
            
            if desc.isdigit() and len(cols) > 1:
                desc_tag = cols[1]
                desc = desc_tag.text.strip()
                desc = re.sub(r'\(Código:.*?\)', '', desc).strip()
                
            if not desc or len(desc) < 3:
                continue
                
            qtd = 0.0
            qtd_tag = row.find(class_=re.compile(r'Rqtd|quantidade|qtd')) or row.find('span', class_='Rqtd')
            if qtd_tag:
                qtd_raw = qtd_tag.text.replace('Qtde.:', '').strip()
                qtd_clean = re.sub(r'[^\d,.]', '', qtd_raw).replace(',', '.')
                try: qtd = float(qtd_clean)
                except ValueError: pass
            else:
                for col in cols:
                    col_text = col.text.strip().lower()
                    if 'qtd' in col_text or 'qtde' in col_text:
                        qtd_raw = re.sub(r'[^\d,.]', '', col_text).replace(',', '.')
                        try: qtd = float(qtd_raw); break
                        except ValueError: pass
                        
            unit = 0.0
            unit_tag = row.find(class_=re.compile(r'RvlUnit|vlUnit|vl-unit')) or row.find('span', class_='RvlUnit')
            if unit_tag:
                unit_raw = unit_tag.text.replace('Vl. Unit.:', '').strip()
                unit_clean = re.sub(r'[^\d,.]', '', unit_raw).replace(',', '.')
                try: unit = float(unit_clean)
                except ValueError: pass
            else:
                for col in cols:
                    col_text = col.text.strip().lower()
                    if 'vl.' in col_text or 'unit' in col_text:
                        unit_raw = re.sub(r'[^\d,.]', '', col_text).replace(',', '.')
                        try: unit = float(unit_raw); break
                        except ValueError: pass
                        
            total = 0.0
            total_tag = row.find(class_=re.compile(r'valor|total|vTotal|RvalRec')) or row.find('span', class_='valor')
            if total_tag:
                total_raw = total_tag.text.strip()
                total_clean = re.sub(r'[^\d,.]', '', total_raw).replace(',', '.')
                try: total = float(total_clean)
                except ValueError: pass
            else:
                total_raw = cols[-1].text.strip()
                total_clean = re.sub(r'[^\d,.]', '', total_raw).replace(',', '.')
                try: total = float(total_clean)
                except ValueError: pass
                
            if qtd == 0.0 and unit > 0.0 and total > 0.0:
                qtd = round(total / unit, 3)
            elif unit == 0.0 and qtd > 0.0 and total > 0.0:
                unit = round(total / qtd, 3)
                
            items.append({
                'descricao': desc,
                'quantidade': qtd,
                'valor_unitario': unit,
                'valor_total': total
            })

    # --- 4. ÚLTIMO FALLBACK SEM TABELA EXPLÍCITA (LAYOUTS MOBILE ETC) ---
    if not items:
        name_tags = soup.find_all(class_=re.compile(r'txtTit|txtTitulo|nom-prod|prod-desc|descricao'))
        for name_tag in name_tags:
            name = name_tag.text.strip()
            name = re.sub(r'\(Código:.*?\)', '', name).strip()
            if not name or len(name) < 3:
                continue
            container = name_tag.find_parent('tr') or name_tag.find_parent('div') or name_tag.find_parent()
            if container:
                qty_tag = container.find(class_=re.compile(r'Rqtd|quantidade|qtd'))
                qty = 1.0
                if qty_tag:
                    try: qty = float(re.sub(r'[^\d,.]', '', qty_tag.text).replace(',', '.'))
                    except ValueError: pass
                    
                tot_tag = container.find(class_=re.compile(r'valor|total|vTotal|RvalRec'))
                total = 0.0
                if tot_tag:
                    try: total = float(re.sub(r'[^\d,.]', '', tot_tag.text).replace(',', '.'))
                    except ValueError: pass
                    
                unit_tag = container.find(class_=re.compile(r'RvlUnit|vlUnit|vl-unit'))
                unit = 0.0
                if unit_tag:
                    try: unit = float(re.sub(r'[^\d,.]', '', unit_tag.text).replace(',', '.'))
                    except ValueError: pass
                    
                if total == 0.0 and unit > 0.0:
                    total = round(qty * unit, 2)
                elif unit == 0.0 and total > 0.0:
                    unit = round(total / qty, 3)
                    
                items.append({
                    'descricao': name,
                    'quantidade': qty,
                    'valor_unitario': unit,
                    'valor_total': total
                })

    # --- 5. DETECÇÃO E RESGATE DE ATRIBUTOS DA NOTA (DATA EMISSÃO) ---
    # Tenta obter Data de Emissão (tabelas de MG)
    for tab in soup.find_all('table'):
        headers = [th.text.strip().lower() for th in tab.find_all('th')]
        if 'data emissão' in headers or 'data de emissão' in headers:
            try:
                col_idx = headers.index('data emissão')
            except ValueError:
                col_idx = headers.index('data de emissão')
            tbody = tab.find('tbody')
            if tbody:
                tr = tbody.find('tr')
                if tr:
                    tds = tr.find_all('td')
                    if len(tds) > col_idx:
                        dh_emissao = tds[col_idx].text.strip()
                        break

    # Tenta obter Data de Emissão (Layout RJ)
    if not dh_emissao:
        strongs = soup.find_all('strong')
        for st in strongs:
            if 'Emissão:' in st.text:
                emissao_text = st.next_sibling
                if emissao_text and isinstance(emissao_text, str):
                    dh_emissao = emissao_text.split('- Via')[0].strip()
                break

    # Fallback frouxo para qualquer data/hora via regex
    if not dh_emissao:
        all_text = soup.get_text()
        date_match = re.search(r'(\d{2}/\d{2}/\d{4}\s+\d{2}:\d{2}:\d{2})', all_text)
        if not date_match:
            date_match = re.search(r'(\d{2}/\d{2}/\d{4}\s+\d{2}:\d{2})', all_text)
        if date_match:
            dh_emissao = date_match.group(1)

    # --- 6. DETECÇÃO E RESGATE DE ATRIBUTOS DA NOTA (TOTAIS) ---
    # Tenta obter por estruturas de Strongs (MG)
    strongs_all = soup.find_all('strong')
    for idx, st in enumerate(strongs_all):
        text = st.text.strip().lower()
        if any(kw in text for kw in ['qtde total de íte', 'quantidade total de íte', 'total de itens']):
            for next_st in strongs_all[idx+1:idx+4]:
                val_str = next_st.text.strip()
                if val_str.isdigit():
                    qtd_total_itens = int(val_str)
                    break
        elif any(kw in text for kw in ['valor total r$', 'valor pago r$', 'total r$']):
            for next_st in strongs_all[idx+1:idx+4]:
                val_str = next_st.text.strip()
                val_str_clean = re.sub(r'[^\d,.]', '', val_str).replace(',', '.')
                if val_str_clean:
                    try:
                        val_float = float(val_str_clean)
                        if val_float > 0.0 and (valor_total_nota == 0.0 or 'total r$' in text):
                            valor_total_nota = val_float
                            break
                    except ValueError:
                        pass

    # Tenta obter por estruturas de Labels (RJ / Outros)
    labels = soup.find_all('label')
    for label in labels:
        text = label.text.strip().lower()
        if 'qtd. total de itens' in text or 'total de itens' in text:
            span = label.find_next_sibling('span', class_='totalNumb') or label.find_next()
            if span:
                try: 
                    clean_num = re.sub(r'[^\d]', '', span.text.strip())
                    if clean_num: qtd_total_itens = int(clean_num)
                except ValueError: pass
        elif 'valor a pagar' in text or 'valor total' in text or 'total a pagar' in text:
            span = label.find_next_sibling('span', class_=re.compile('totalNumb')) or label.find_next()
            if span:
                try: 
                    clean_val = re.sub(r'[^\d,.]', '', span.text.strip()).replace(',', '.')
                    if clean_val: valor_total_nota = float(clean_val)
                except ValueError: pass

    # Sincroniza e corrige caso estejam ausentes/zerados
    if valor_total_nota == 0.0 and items:
        valor_total_nota = sum(item['valor_total'] for item in items)
    if qtd_total_itens == 0 and items:
        qtd_total_itens = len(items)

    return {
        'qtd_total_itens': qtd_total_itens,
        'valor_total_nota': valor_total_nota,
        'dh_emissao': dh_emissao,
        'itens': items
    }

def main():
    print("==================================================")
    print(" Iniciando Rotina de Scrapping NFe (SEFAZ RJ / MG) ")
    print("==================================================\n")
    
    try:
        conn = pymysql.connect(**read_db_config())
    except Exception as e:
        print(f"Erro ao conectar ao banco de dados: {e}")
        return

    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT id_qrcode, url_qrcode, dt_qrcode, id_veiculo FROM tb_qrcode WHERE fl_processado = 0 LIMIT 5")
            qrcodes = cursor.fetchall()

            if not qrcodes:
                print("Nenhum QR Code encontrado.")
                return

            print(f"Encontradas {len(qrcodes)} NFCe(s) para processamento...\n")

            for qr in qrcodes:
                id_qr = qr['id_qrcode']
                url = qr['url_qrcode']
                id_veiculo = qr.get('id_veiculo')
                now_str = datetime.now().strftime('%H:%M:%S')
                print(f"[{now_str}] --- Processando ID_QRCODE {id_qr} ---")
                
                chave, cnpj = extract_chave_and_cnpj(url)
                if cnpj:
                    print(f" Chave...: {chave}")
                    print(f" CNPJ....: {cnpj}")
                    cursor.execute("SELECT id_posto, nm_posto, geo_latitude, geo_longitude, nm_municipio FROM tb_postos WHERE nu_cnpjposto = %s", (cnpj,))
                    posto = cursor.fetchone()
                    if posto:
                        print(f" Posto...: {posto['nm_posto']} (ID: {posto['id_posto']}) Município: {posto.get('nm_municipio')}")
                    else:
                        now_proc = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                        print(f" [{now_proc}] Aviso: Posto CNPJ {cnpj} não localizado no banco.")
                        cursor.execute("UPDATE tb_qrcode SET fl_processado = 2, dh_processamento = NOW() WHERE id_qrcode = %s", (id_qr,))
                        conn.commit()
                        print(f" [{now_proc}] [REJEITADA] QR Code {id_qr} marcado como fl_processado = 2 (Posto não cadastrado).")
                        continue
                else:
                    now_proc = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                    print(f" [{now_proc}] Aviso: Não foi possível extrair a chave a partir da URL.")
                    cursor.execute("UPDATE tb_qrcode SET fl_processado = 2, dh_processamento = NOW() WHERE id_qrcode = %s", (id_qr,))
                    conn.commit()
                    print(f" [{now_proc}] [REJEITADA] QR Code {id_qr} marcado como fl_processado = 2 (Não foi possível extrair chave/CNPJ).")
                    continue

                try:
                    # Check if we already have it in tb_abastecimentos with liters
                    # If we just want to populate liters, maybe skip if already present?
                    # The user said "ignorando o fl_processado para ler de novo todos", so we fetch anyway.

                    print(" Acessando link da SEFAZ...")
                    
                    # Pausa humana aleatória (de 50 a 90 segundos) antes de bater no site de novo
                    # para evitar que o Firewall/WAF F5 identifique rajada de bot
                    tempo_espera = random.uniform(50.0, 90.0)
                    print(f" [Aguardando {tempo_espera:.1f}s...]")
                    time.sleep(tempo_espera)
                    
                    html = fetch_nfe_data(url)
                    
                    dados_nfe = parse_nfe_html(html)
                    
                    print("\n================== RESUMO DA NOTA ==================")
                    print(f" Data Emissão.: {dados_nfe.get('dh_emissao', 'Não identificada')}")
                    print(f" Itens Totais.: {dados_nfe['qtd_total_itens']}")
                    print(f" Valor Final..: R$ {dados_nfe['valor_total_nota']:.2f}")
                    print("------------------ ITENS (PRODUTOS) ----------------")
                    
                    tem_produto = False
                    if not dados_nfe['itens']:
                        print(" (Aviso: Tabela de itens 'tabResult' vazia ou não encontrada no HTML.)")
                        debug_path = f"debug_html_{id_qr}.html"
                        with open(debug_path, "w", encoding='utf-8') as f:
                            f.write(html)
                        print(f" [DEBUG] HTML salvo em {debug_path} para inspecao.")
                    else:
                        for idx, item in enumerate(dados_nfe['itens'], 1):
                            print(f"\n   [{idx}] {item['descricao']}")
                            print(f"       Quantidade..: {item['quantidade']:.3f} Litros/UN")
                            print(f"       Preço Unit..: R$ {item['valor_unitario']:.3f}")
                            print(f"       Total Item..: R$ {item['valor_total']:.2f}")
                            
                            if not posto:
                                print("       [!] Posto não cadastrado, ignorando inserção no BD.")
                                continue
                                
                            id_combustivel = mapear_id_produto(item['descricao'])
                            if id_combustivel:
                                tem_produto = True
                                dh_banco = formatar_data_mysql(dados_nfe.get('dh_emissao', ''))
                                dh_coleta_final = dh_banco if dh_banco else time.strftime('%Y-%m-%d %H:%M:%S')
                                
                                # ECONOMY CALCULATION
                                vl_economia = 0.0
                                try:
                                    if posto and posto.get('nm_municipio'):
                                        # Compare with average in the municipality within 7 days
                                        cursor.execute("""
                                            SELECT AVG(vl_preco_unitario) as avg_price 
                                            FROM tb_abastecimentos a 
                                            JOIN tb_postos p ON a.id_posto = p.id_posto 
                                            WHERE a.id_combustivel = %s 
                                              AND p.nm_municipio = %s 
                                              AND a.dh_emissao_nfe >= DATE_SUB(%s, INTERVAL 7 DAY)
                                              AND a.dh_emissao_nfe <= %s
                                        """, (id_combustivel, posto['nm_municipio'], dh_coleta_final, dh_coleta_final))
                                        row_avg = cursor.fetchone()
                                        if row_avg and row_avg['avg_price']:
                                            avg_p = float(row_avg['avg_price'])
                                            vl_economia = (avg_p - float(item['valor_unitario'])) * float(item['quantidade'])
                                            print(f"       [*] Economia calculada: R$ {vl_economia:.2f} (Baseado no preço médio de R$ {avg_p:.3f} em {posto['nm_municipio']})")
                                except Exception as e_econ:
                                    print(f"       [!] Erro ao calcular economia: {e_econ}")

                                try:
                                    # CHECK IF EXISTS
                                    cursor.execute("SELECT id_qrcode FROM tb_abastecimentos WHERE id_qrcode = %s AND id_combustivel = %s", (id_qr, id_combustivel))
                                    existing = cursor.fetchone()

                                    if existing:
                                        print(f"       [~] Registro existente para QR Code {id_qr} e Combustível {id_combustivel}. Atualizando litros, economia e veículo...")
                                        cursor.execute(
                                            "UPDATE tb_abastecimentos SET nu_litros = %s, vl_economia = %s, id_veiculo = %s WHERE id_qrcode = %s AND id_combustivel = %s",
                                            (item['quantidade'], vl_economia, id_veiculo, id_qr, id_combustivel)
                                        )
                                    else:
                                        cursor.execute(
                                            """
                                            INSERT INTO tb_abastecimentos 
                                            (id_posto, id_combustivel, login, vl_preco_unitario, nu_litros, vl_economia, dh_emissao_nfe, tp_fonte, geo_latitude, geo_longitude, id_qrcode, id_veiculo) 
                                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                                            """,
                                            (
                                                posto['id_posto'], 
                                                id_combustivel, 
                                                'ROBO_NFCE', 
                                                item['valor_unitario'],
                                                item['quantidade'],
                                                vl_economia,
                                                dh_coleta_final, 
                                                'NFC-e',
                                                posto.get('geo_latitude'),
                                                posto.get('geo_longitude'),
                                                id_qr,
                                                id_veiculo
                                            )
                                        )
                                        print(f"       [+] Salvo em tb_abastecimentos (ID_Comb:{id_combustivel})")

                                    # Update/Insert in tb_precos_combustiveis if NFe is more recent
                                    try:
                                        cursor.execute(
                                            "SELECT dt_ultima_atualizacao, vl_preco_venda FROM tb_precos_combustiveis WHERE id_posto = %s AND id_produto = %s",
                                            (posto['id_posto'], id_combustivel)
                                        )
                                        price_record = cursor.fetchone()

                                        should_update = False
                                        if not price_record:
                                            # Record does not exist, insert it
                                            cursor.execute(
                                                """
                                                INSERT INTO tb_precos_combustiveis 
                                                (id_posto, id_produto, vl_preco_venda, dt_ultima_atualizacao, ds_origem_dado) 
                                                VALUES (%s, %s, %s, %s, 'NOTA FISCAL')
                                                """,
                                                (posto['id_posto'], id_combustivel, item['valor_unitario'], dh_coleta_final)
                                            )
                                            print(f"       [+] Inserido novo preco em tb_precos_combustiveis: R$ {item['valor_unitario']} (NOTA FISCAL)")
                                        else:
                                            # Record exists, compare update timestamps
                                            current_dt = price_record['dt_ultima_atualizacao']
                                            nfe_dt_parsed = datetime.strptime(dh_coleta_final, '%Y-%m-%d %H:%M:%S')

                                            if isinstance(current_dt, datetime):
                                                existing_dt_parsed = current_dt
                                            elif isinstance(current_dt, str):
                                                try:
                                                    existing_dt_parsed = datetime.strptime(current_dt, '%Y-%m-%d %H:%M:%S')
                                                except ValueError:
                                                    existing_dt_parsed = datetime.strptime(current_dt.split('.')[0], '%Y-%m-%d %H:%M:%S') if '.' in current_dt else None
                                            else:
                                                existing_dt_parsed = None

                                            if existing_dt_parsed is None or nfe_dt_parsed > existing_dt_parsed:
                                                should_update = True

                                            if should_update:
                                                cursor.execute(
                                                    """
                                                    UPDATE tb_precos_combustiveis 
                                                    SET vl_preco_venda = %s, dt_ultima_atualizacao = %s, ds_origem_dado = 'NOTA FISCAL' 
                                                    WHERE id_posto = %s AND id_produto = %s
                                                    """,
                                                    (item['valor_unitario'], dh_coleta_final, posto['id_posto'], id_combustivel)
                                                )
                                                print(f"       [^] Atualizado preco em tb_precos_combustiveis: R$ {item['valor_unitario']} (Mais recente: {dh_coleta_final})")
                                            else:
                                                print("       [~] Preco em tb_precos_combustiveis ja esta mais atualizado.")
                                    except Exception as e_price:
                                        print(f"       [-] Erro ao atualizar preco de combustivel: {e_price}")

                                except Exception as e_db:
                                    print(f"       [-] Erro ao salvar/atualizar item no banco: {e_db}")
                            else:
                                print(f"       [~] Ignorado: não é um combustível (descrição '{item['descricao']}' não mapeada).")
                    
                    # Marca como processado e registra data de processamento
                    try:
                        now_proc = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                        if tem_produto:
                            cursor.execute("UPDATE tb_qrcode SET fl_processado = 1, dh_processamento = NOW() WHERE id_qrcode = %s", (id_qr,))
                            conn.commit()
                            print(f"\n [{now_proc}] [OK] NF {id_qr} finalizada!")
                        else:
                            cursor.execute("UPDATE tb_qrcode SET fl_processado = 2, dh_processamento = NOW() WHERE id_qrcode = %s", (id_qr,))
                            conn.commit()
                            print(f"\n [{now_proc}] [REJEITADA] QR Code {id_qr} marcado como fl_processado = 2 (Nenhum abastecimento inserido).")
                    except Exception as e_upd:
                        print(f" [ERRO] Falha ao atualizar tb_qrcode: {e_upd}")
                    
                    print("====================================================\n")
                    
                except Exception as ex:
                    now_proc = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                    print(f" [{now_proc}] [ERRO SEFAZ]: {ex}\n")
                    try:
                        cursor.execute("UPDATE tb_qrcode SET fl_processado = 2, dh_processamento = NOW() WHERE id_qrcode = %s", (id_qr,))
                        conn.commit()
                        print(f" [{now_proc}] [REJEITADA] QR Code {id_qr} marcado como fl_processado = 2 devido a erro na SEFAZ.")
                    except Exception as e_upd_err:
                        print(f" [{now_proc}] [ERRO] Falha ao marcar QR Code como erro: {e_upd_err}")
                
    finally:
        conn.close()

if __name__ == '__main__':
    main()
