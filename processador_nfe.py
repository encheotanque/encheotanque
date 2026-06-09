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
    # Converte '25/03/2026 12:33:39-03:00' para '2026-03-25 12:33:39'
    try:
        # Pega a parte antes do timezone (fuso)
        dt_base = emissao_str.split('-')[0].strip()
        dt_obj = datetime.strptime(dt_base, '%d/%m/%Y %H:%M:%S')
        return dt_obj.strftime('%Y-%m-%d %H:%M:%S')
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
            # Entra na url e aguarda estabilizar
            page.goto(url, timeout=30000)
            
            # Aguarda o JavaScript de desafio da F5 rodar, possivelmente recarregar a página,
            # e só libera o script quando a bendita tabela E PEO MENOS UM PRODUTO surgir no HTML
            page.wait_for_selector("#tabResult .txtTit", timeout=20000)
            
            html = page.content()
            return html
        except PlaywrightTimeoutError:
            html = page.content()
            if "OuvERJ" in html or "endereços IP usados" in html:
               raise Exception("Acesso bloqueado pelo Firewall da SEFAZ (IP bloqueado).")
            raise Exception("Timeout aguardando a nota carregar. Provavelmente a SEFAZ está instável ou o anti-bot bloqueou.")
        finally:
            browser.close()

def parse_nfe_html(html):
    soup = BeautifulSoup(html, 'html.parser')
    
    qtd_total_itens = 0
    valor_total_nota = 0.0
    
    dh_emissao = None
    
    labels = soup.find_all('label')
    for label in labels:
        text = label.text.strip().lower()
        if 'qtd. total de itens' in text:
            span = label.find_next_sibling('span', class_='totalNumb')
            if span:
                try: qtd_total_itens = int(span.text.strip())
                except ValueError: pass
        elif 'valor a pagar' in text:
            span = label.find_next_sibling('span', class_=re.compile('totalNumb'))
            if span:
                try: valor_total_nota = float(span.text.strip().replace(',', '.'))
                except ValueError: pass
                
    # Extrair Data e Hora da Emissão
    # Ex: <strong> Emissão: </strong>25/03/2026 12:33:39-03:00
    strongs = soup.find_all('strong')
    for st in strongs:
        if 'Emissão:' in st.text:
            # O texto da data fica "solto" como elemento(TextNode) ao lado do <strong>
            emissao_text = st.next_sibling
            if emissao_text and isinstance(emissao_text, str):
                # Limpa traço de "- Via Consumidor" e captura a data ISO/BR
                dh_emissao = emissao_text.split('- Via')[0].strip()
            break
                
    items = []
    table = soup.find('table', id='tabResult')
    if table:
        # Pega todas as TRs da tabela. Em vez de depender do "id=Item", verificamos se ela tem
        # a classe de produto ou se possui a tag com a classe txtTit (Descrição do produto).
        rows = table.find_all('tr')
        for row in rows:
            desc_tag = row.find('span', class_='txtTit')
            if not desc_tag:
                continue # Se não tem título, não é uma linha de produto (pode ser cabeçalho/total)
                
            desc = desc_tag.text.strip()
            
            qtd = 0.0
            qtd_tag = row.find('span', class_='Rqtd')
            if qtd_tag:
                # Remove common prefixes and non-numeric junk, handle comma to dot
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
    
    return {
        'qtd_total_itens': qtd_total_itens,
        'valor_total_nota': valor_total_nota,
        'dh_emissao': dh_emissao,
        'itens': items
    }

def main():
    print("==================================================")
    print(" Iniciando Rotina de Scrapping NFe (SEFAZ RJ) ")
    print("==================================================\n")
    
    try:
        conn = pymysql.connect(**read_db_config())
    except Exception as e:
        print(f"Erro ao conectar ao banco de dados: {e}")
        return

    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT id_qrcode, url_qrcode, dt_qrcode FROM tb_qrcode WHERE fl_processado = 0 LIMIT 5")
            qrcodes = cursor.fetchall()

            if not qrcodes:
                print("Nenhum QR Code encontrado.")
                return

            print(f"Encontradas {len(qrcodes)} NFCe(s) para processamento...\n")

            for qr in qrcodes:
                id_qr = qr['id_qrcode']
                url = qr['url_qrcode']
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
                        print(f" Aviso: Posto CNPJ {cnpj} não localizado no banco.")
                        cursor.execute("UPDATE tb_qrcode SET fl_processado = 2, dh_processamento = NOW() WHERE id_qrcode = %s", (id_qr,))
                        conn.commit()
                        print(f" [Aviso] QR Code {id_qr} marcado como fl_processado = 2 (Posto não cadastrado).")
                        continue
                else:
                    print(" Aviso: Não foi possível extrair a chave a partir da URL.")
                    cursor.execute("UPDATE tb_qrcode SET fl_processado = 2, dh_processamento = NOW() WHERE id_qrcode = %s", (id_qr,))
                    conn.commit()
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
                                        print(f"       [~] Registro existente para QR Code {id_qr} e Combustível {id_combustivel}. Atualizando litros e economia...")
                                        cursor.execute(
                                            "UPDATE tb_abastecimentos SET nu_litros = %s, vl_economia = %s WHERE id_qrcode = %s AND id_combustivel = %s",
                                            (item['quantidade'], vl_economia, id_qr, id_combustivel)
                                        )
                                    else:
                                        cursor.execute(
                                            """
                                            INSERT INTO tb_abastecimentos 
                                            (id_posto, id_combustivel, login, vl_preco_unitario, nu_litros, vl_economia, dh_emissao_nfe, tp_fonte, geo_latitude, geo_longitude, id_qrcode) 
                                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
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
                                                id_qr
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
                        cursor.execute("UPDATE tb_qrcode SET fl_processado = 1, dh_processamento = NOW() WHERE id_qrcode = %s", (id_qr,))
                        conn.commit()
                        print(f"\n [OK] NF {id_qr} finalizada!")
                    except Exception as e_upd:
                        print(f" [ERRO] Falha ao atualizar tb_qrcode: {e_upd}")
                    
                    print("====================================================\n")
                    
                except Exception as ex:
                    print(f" [ERRO SEFAZ]: {ex}\n")
                    try:
                        cursor.execute("UPDATE tb_qrcode SET fl_processado = 2, dh_processamento = NOW() WHERE id_qrcode = %s", (id_qr,))
                        conn.commit()
                        print(f" [Aviso] QR Code {id_qr} marcado como fl_processado = 2 devido a erro na SEFAZ.")
                    except Exception as e_upd_err:
                        print(f" [ERRO] Falha ao marcar QR Code como erro: {e_upd_err}")
                
    finally:
        conn.close()

if __name__ == '__main__':
    main()
