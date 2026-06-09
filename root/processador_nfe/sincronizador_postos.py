import os
import csv
import urllib.request
import pymysql
from dotenv import load_dotenv

load_dotenv()

URL_CSV = "https://www.gov.br/anp/pt-br/centrais-de-conteudo/dados-abertos/arquivos/arquivos-dados-cadastrais-dos-revendedores-varejistas-de-combustiveis-automotivos/dados-cadastrais-revendedores-varejistas-combustiveis-automoveis.csv"
ARQUIVO_LOCAL = "postos_brasil.csv"

def read_db_config():
    return {
        'host': os.environ.get('DB_HOST'),
        'user': os.environ.get('DB_USER'),
        'password': os.environ.get('DB_PASSWORD'),
        'database': os.environ.get('DB_NAME'),
        'cursorclass': pymysql.cursors.DictCursor
    }

def processar_comparacao(municipio_alvo="PETROPOLIS", estado_alvo="RJ"):
    print(f"==================================================")
    print(f" Sincronizador de Postos ANP x BD - {estado_alvo} / {municipio_alvo} ")
    print(f"==================================================")
    
    print(" [~] Baixando a base completa de dados abertos da ANP...")
    try:
        req = urllib.request.Request(URL_CSV, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response, open(ARQUIVO_LOCAL, 'wb') as out_file:
            out_file.write(response.read())
        print(" [OK] CSV baixado com sucesso.")
    except Exception as e:
        print(f" [ERRO] Falha ao baixar o arquivo: {e}")
        return

    # Parse CSV for Petrópolis
    postos_csv = {} # format: { 'cnpj_limpo': { dados } }
    
    print(f" [~] Lendo e filtrando os postos de '{municipio_alvo}' no CSV...")
    # Typically encoded in latin1 or utf8 with ; as delimiter
    encodings = ['utf-8-sig', 'utf-8', 'latin1', 'iso-8859-1']
    linhas_lidas = 0
    
    for enc in encodings:
        try:
            with open(ARQUIVO_LOCAL, 'r', encoding=enc) as f:
                reader = csv.DictReader(f, delimiter=';')
                header = reader.fieldnames
                
                # Check actual column names
                # usually CNPJ, NOME DA EMPRESA, MUNICIPIO, UF, BANDEIRA, SITUACAO
                col_cnpj = next((col for col in header if 'CNPJ' in col.upper()), None)
                col_mun = next((col for col in header if 'MUNIC' in col.upper()), None)
                col_uf = next((col for col in header if 'UF' in col.upper() or 'ESTADO' in col.upper()), None)
                col_nome = next((col for col in header if 'RAZ' in col.upper() or 'EMPRESA' in col.upper()), None)
                col_fantasia = next((col for col in header if 'FANTASIA' in col.upper()), None)
                col_bandeira = next((col for col in header if 'BANDEIRA' in col.upper()), None)
                col_situacao = next((col for col in header if 'SITUA' in col.upper()), None)
                
                for row in reader:
                    linhas_lidas += 1
                    mun_val = str(row.get(col_mun, '')).strip().upper()
                    uf_val = str(row.get(col_uf, '')).strip().upper()
                    
                    # Remover acentos pra comparar (PETRÓPOLIS vs PETROPOLIS)
                    mun_val = mun_val.replace('Õ', 'O').replace('Ó', 'O')
                    
                    if mun_val == municipio_alvo.upper() and uf_val == estado_alvo.upper():
                        cnpj_bruto = row.get(col_cnpj, '')
                        cnpj_num = ''.join(filter(str.isdigit, cnpj_bruto))
                        if cnpj_num:
                            postos_csv[cnpj_num] = {
                                'cnpj': cnpj_num,
                                'cnpj_formatado': cnpj_bruto,
                                'nome': row.get(col_nome, '').strip(),
                                'fantasia': row.get(col_fantasia, '').strip(),
                                'bandeira': row.get(col_bandeira, '').strip(),
                                'status': row.get(col_situacao, '').strip(),
                                'endereco': str(row.get('ENDERECO', repr(row))).strip() # fallback simplista
                            }
            # if we survived without decode errors, we break
            break
        except UnicodeDecodeError:
            continue
            
    print(f" [OK] Filtro finalizado. {len(postos_csv)} postos locais encontrados no arquivo oficial.")

    # Conectar ao banco e pegar postos do município
    print(" [~] Recuperando postos cadastrados no seu Banco de Dados...")
    postos_bd = {} # { 'cnpj_limpo': { ... } }
    try:
        conn = pymysql.connect(**read_db_config())
        cursor = conn.cursor()
        
        # Pode ter uma clausula limitando à cidade, mas como Petrópolis é  cenário teste
        cursor.execute("SELECT id_posto, nm_posto, nu_cnpjposto, nm_bandeira FROM tb_postos")
        linhas = cursor.fetchall()
        for linha in linhas:
            cnpj_num = ''.join(filter(str.isdigit, str(linha['nu_cnpjposto'])))
            if cnpj_num:
                postos_bd[cnpj_num] = {
                    'id_posto': linha['id_posto'],
                    'nome': linha.get('nm_posto', ''),
                    'bandeira': linha.get('nm_bandeira', ''),
                    'cnpj_bd': cnpj_num
                }
        conn.close()
        print(f" [OK] {len(postos_bd)} postos recuperados do banco.\n")
    except Exception as db_e:
        print(f" [ERRO] Falha ao ler o banco: {db_e}")
        return

    # Iniciar Comparação
    print("================== RELATÓRIO DE ALTERAÇÕES ==================")
    
    csv_cnpjs = set(postos_csv.keys())
    bd_cnpjs = set(postos_bd.keys())
    
    # 1. POSTOS INCLUÍDOS (Estão no CSV da ANP mas não no seu BD)
    novos = csv_cnpjs - bd_cnpjs
    if novos:
        print(f" [+] IDENTIFICADOS {len(novos)} POSTOS NOVOS A INCLUIR:")
        for c in novos:
            p = postos_csv[c]
            print(f"     NOME: {p['nome'][:35]:<36} | UF: {estado_alvo} | CNPJ: {p['cnpj_formatado']} | BANDEIRA: {p['bandeira']}")
    
    # 2. POSTOS DESATIVADOS (Estão no seu BD, mas não no CSV ou com status 'Cancelado')
    print(f"\n [-] IDENTIFICADOS POSTOS DESATIVADOS / REMOVIDOS:")
    desativados_count = 0
    
    # A) Missing entirely from ANP active list
    faltantes_csv = bd_cnpjs - csv_cnpjs
    for c in faltantes_csv:
        p = postos_bd[c]
        print(f"     [AUSENTE NA ANP] BD-ID: {p['id_posto']} | {p['nome'][:35]:<36} | CNPJ: {p['cnpj_bd']}")
        desativados_count += 1
        
    # B) Present but status is not Active (e.g. Autorização Revogada/Cancelada)
    for c in bd_cnpjs.intersection(csv_cnpjs):
        p_csv = postos_csv[c]
        p_bd = postos_bd[c]
        status = p_csv['status'].upper()
        if 'REVOGAD' in status or 'CANCELAD' in status or 'INATIV' in status or 'SUSPENS' in status:
            print(f"     [ANP INATIVO]    BD-ID: {p_bd['id_posto']} | {p_csv['nome'][:35]:<36} | STATUS ANP: {p_csv['status']}")
            desativados_count += 1
            
    if desativados_count == 0:
         print("     Nenhum posto inativo encontrado.")
            
    # 3. MUDANÇA DE BANDEIRA/NOME E INVESTIGAÇÃO DE MUDANÇA DE CNPJ
    print(f"\n [!] IDENTIFICADOS POSTOS ALTERADOS (Sinal Roxo):")
    alterados_count = 0
    
    # Verifica mudanças nominais nos que já deram match de CNPJ
    for c in bd_cnpjs.intersection(csv_cnpjs):
        p_csv = postos_csv[c]
        p_bd = postos_bd[c]
        
        mudou = False
        detalhes = []
        if str(p_bd['bandeira']).upper().strip() != str(p_csv['bandeira']).upper().strip():
             mudou = True
             detalhes.append(f"BAND: '{p_bd['bandeira']}' -> '{p_csv['bandeira']}'")
        
        # Pode fazer validacao de nome aqui, se quiser
             
        if mudou:
            alterados_count += 1
            print(f"     [ALTERADO] BD-ID: {p_bd['id_posto']} CNPJ {c} -> {', '.join(detalhes)}")

    # HEURISTICA: Detectar Postos que só mudaram o CNPJ (Mesmo Endereço/Nome, porém NOVO no CSV e AUSENTE no ANP antigo)
    for c_bd in faltantes_csv:
        nome_antigo = postos_bd[c_bd]['nome'].upper()[:15]
        
        # Procurar algum posto NOVO que tenha parte do nome similar (ex: apenas mudou de razao matriz pra filial)
        for c_csv in novos:
            nome_novo = postos_csv[c_csv]['nome'].upper()
            if nome_antigo in nome_novo or nome_novo in nome_antigo:
                 alterados_count += 1
                 print(f"     [SUSPEITA DE TROCA CNPJ] Posto ID {postos_bd[c_bd]['id_posto']} ({nome_antigo}) pode ser o novo CNPJ {c_csv} na ANP.")
                 
    if alterados_count == 0:
        print("     Nenhuma alteração cadastral mapeada.")
        
    print("\n======================= FIM (Apenas Leitura) =======================")


if __name__ == "__main__":
    processar_comparacao()
