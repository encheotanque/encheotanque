#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Rotina em Python para extração e sincronização mensal/semanal dos preços de combustíveis da ANP 
para os municípios do Rio de Janeiro, Petrópolis e Niterói.

Requisitos de execução:
pip install PyMySQL cryptography

Descrição do Fluxo:
1. Baixa os dois CSVs atualizados semanalmente pela ANP.
2. Identifica automaticamente o delimitador de cada arquivo (, ou ;).
3. Lê apenas os dados dos municípios: Rio de Janeiro, Petrópolis e Niterói.
4. Agrupa os preços mais recentes de cada posto (CNPJ) e combustível dentro do próprio CSV.
5. Busca o id_posto pelo CNPJ na tabela 'tb_postos'.
6. Busca o id_produto pela descrição do produto na tabela 'tb_tipoproduto'.
7. Sincroniza APENAS a tabela 'tb_precos_combustiveis', atualizando (ou inserindo) o preço 
   apenas se a data coletada for estritamente mais recente que a registrada.
8. Aplica 'CSV_TANKAGE_SYNC' no campo ds_origem_dado sempre que houver sincronização.
"""

import os
import re
import csv
import sys
import json
import urllib.request
import unicodedata
import time
from datetime import datetime

os.environ['TZ'] = 'America/Sao_Paulo'
try:
    time.tzset()
except AttributeError:
    pass

# Detect CLI flag to run in JSON only mode (avoids PyMySQL dependency entirely)
JSON_ONLY = "--json-only" in sys.argv or "-j" in sys.argv
real_stdout = sys.stdout

if JSON_ONLY:
    # Redirect all stdout to stderr so logs do not corrupt the generated JSON
    sys.stdout = sys.stderr

# Instalação automática de dependências se rodar num ambiente limpo (ex: Cloud Run / Docker)
if not JSON_ONLY:
    try:
        import pymysql
    except ImportError:
        print("[*] Biblioteca 'PyMySQL' não encontrada. Instalando automaticamente...")
        import subprocess
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", "pymysql", "cryptography"])
            import pymysql
            print("[OK] 'PyMySQL' e 'cryptography' instaladas com sucesso!")
        except Exception as e:
            print(f"[!] Erro ao tentar instalar dependências de banco via pip programaticamente: {e}")


# URLs fornecidas pelo cliente
CSV_URL_GASOLINA_ETANOL = "https://www.gov.br/anp/pt-br/centrais-de-conteudo/dados-abertos/arquivos/shpc/qus/ultimas-4-semanas-gasolina-etanol.csv"
CSV_URL_DIESEL_GNV = "https://www.gov.br/anp/pt-br/centrais-de-conteudo/dados-abertos/arquivos/shpc/qus/ultimas-4-semanas-diesel-gnv.csv"

# Municípios alvo da busca
TARGET_MUNICIPIOS = {"RIO DE JANEIRO", "PETROPOLIS", "NITEROI", "JUIZ DE FORA"}

# Mapeamento auxiliar de apelidos do CSV para os nomes oficiais que costumam estar no banco
PRODUCT_ALIASES = {
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
}


def remove_accents(input_str):
    """Remove acentos de uma string, normalizando-a."""
    if not input_str:
        return ""
    nfkd_form = unicodedata.normalize('NFKD', input_str)
    return "".join([c for c in nfkd_form if not unicodedata.combining(c)])


def normalize_str(val):
    """Normaliza string para comparação (sem acentos, caixa alta, sem espaços extras)."""
    return remove_accents(str(val)).upper().strip()


def parse_price(price_str):
    """Converte o preço obtido do CSV em float (trabalha com formatos 'X.YY' ou 'X,YY')."""
    if not price_str:
        return None
    try:
        clean_str = price_str.replace(',', '.').strip()
        return float(clean_str)
    except Exception:
        return None


def parse_date(date_str):
    """Converte data string do CSV em objeto datetime."""
    if not date_str:
        return None
    for fmt in ("%d/%m/%Y", "%d/%m/%y", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d", "%d-%m-%Y", "%d-%m-%y"):
        try:
            return datetime.strptime(date_str.strip(), fmt)
        except ValueError:
            continue
    return None


def load_env_or_config():
    """Carrega as variáveis de ambiente lendo o arquivo .env se estiver disponível."""
    config = {
        "host": "129.146.31.117",
        "user": "root",
        "password": "",
        "database": "encheotanque"
    }

    # Tentativa de ler o .env caso exista no diretório raiz ou adjacente
    for env_path in [".env", "../.env", "/app/applet/.env"]:
        if os.path.exists(env_path):
            try:
                with open(env_path, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if not line or line.startswith("#"):
                            continue
                        parts = line.split("=", 1)
                        if len(parts) == 2:
                            key = parts[0].strip()
                            val = parts[1].strip().strip('"').strip("'")
                            if key == "DB_HOST":
                                config["host"] = val
                            elif key == "DB_USER":
                                config["user"] = val
                            elif key == "DB_PASSWORD":
                                config["password"] = val
                            elif key == "DB_NAME":
                                config["database"] = val
                break
            except Exception as e:
                print(f"[!] Erro ao tentar ler o arquivo .env: {e}")

    # Sobrescreve com as variáveis do sistema operacional direta se disponíveis
    config["host"] = os.environ.get("DB_HOST", config["host"])
    config["user"] = os.environ.get("DB_USER", config["user"])
    config["password"] = os.environ.get("DB_PASSWORD", config["password"])
    config["database"] = os.environ.get("DB_NAME", config["database"])

    return config


def connect_database(db_config):
    """Retorna uma conexão aberta com o banco de dados MySQL usando PyMySQL ou mysql.connector."""
    try:
        import pymysql
        conn = pymysql.connect(
            host=db_config["host"],
            user=db_config["user"],
            password=db_config["password"],
            database=db_config["database"],
            autocommit=True
        )
        return conn, "PyMySQL"
    except ImportError:
        try:
            import mysql.connector
            conn = mysql.connector.connect(
                host=db_config["host"],
                user=db_config["user"],
                password=db_config["password"],
                database=db_config["database"]
            )
            return conn, "mysql.connector"
        except ImportError:
            print("[CRITICAL] Necessário instalar uma biblioteca para MySQL! Instale PyMySQL ou mysql-connector-python:")
            print("  pip install PyMySQL")
            print("  ou")
            print("  pip install mysql-connector-python")
            sys.exit(1)


def download_csv_to_local(url, temp_filename):
    """Faz o download do arquivo CSV ANP e salva localmente com cabeçalhos apropriados."""
    print(f"[*] Fazendo o download de {url}...")
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'
    }
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=60) as response, open(temp_filename, 'wb') as out_file:
            # Copiar em pedaços pequenos para evitar uso excessivo de memória
            chunk_size = 1024 * 624
            while True:
                chunk = response.read(chunk_size)
                if not chunk:
                    break
                out_file.write(chunk)
        print(f"[OK] Download finalizado: {temp_filename}")
        return True
    except Exception as e:
        print(f"[!] Erro ao realizar o download de {url}: {e}")
        return False


def detect_dialect(filepath):
    """Detecta se o arquivo usa vírgula ou ponto-e-vírgula como delimitador e sua codificação."""
    encodings = ["utf-8", "latin-1", "utf-16", "utf-8-sig"]
    for enc in encodings:
        try:
            with open(filepath, "r", encoding=enc) as f:
                first_lines = [f.readline() for _ in range(5)]
                sample_text = "".join(first_lines)
                if not sample_text:
                    continue
                # Se encontrar ponto-e-vírgula, assume ';'
                if ";" in sample_text:
                    return ";", enc
                elif "," in sample_text:
                    return ",", enc
                return ";", enc  # padrão ANP costuma ser ';'
        except UnicodeDecodeError:
            continue
    return ";", "utf-8"


def parse_and_group_csv_data(filepath, delimiter, encoding):
    """
    Lê o CSV, filtra pelos municípios alvo, descobre as colunas necessárias e 
    retorna um dicionário acumulando APENAS o preço coletado mais recente 
    dentro do próprio arquivo CSV para cada combinação de (CNPJ, Produto).
    
    Retorna: {(cnpj_num_14: string, produto_nome: string): (preco: float, data_coleta: datetime, municipio_original: string)}
    """
    grouped_prices = {}

    def get_col(row, idx, default=""):
        if idx >= 0 and idx < len(row):
            return row[idx].strip()
        return default

    with open(filepath, mode="r", encoding=encoding) as f:
        reader = csv.reader(f, delimiter=delimiter)
        try:
            headers = next(reader)
        except StopIteration:
            return grouped_prices

        # Normalizar cabeçalhos para encontrar os índices dinamicamente
        norm_headers = [normalize_str(h) for h in headers]

        idx_cnpj = -1
        idx_municipio = -1
        idx_produto = -1
        idx_data = -1
        idx_preco = -1
        idx_revenda = -1
        idx_rua = -1
        idx_numero = -1
        idx_complemento = -1
        idx_bairro = -1
        idx_cep = -1
        idx_uf = -1
        idx_bandeira = -1

        for i, h in enumerate(norm_headers):
            if "CNPJ" in h:
                idx_cnpj = i
            elif "MUNICIPIO" in h:
                idx_municipio = i
            elif "PRODUTO" in h:
                idx_produto = i
            elif "DATA" in h:
                idx_data = i
            elif "VALOR" in h or "VENDA" in h or "PRECO" in h:
                if idx_preco == -1 or "VENDA" in h:  # prioriza campo de Venda
                    idx_preco = i
            elif "REVENDA" in h:
                idx_revenda = i
            elif "NOME DA RUA" in h or "LOGRADOURO" in h or "RUA" in h:
                if idx_rua == -1 or "LOGRADOURO" in h:
                    idx_rua = i
            elif "NUMERO" in h:
                idx_numero = i
            elif "COMPLEMENTO" in h:
                idx_complemento = i
            elif "BAIRRO" in h:
                idx_bairro = i
            elif "CEP" in h:
                idx_cep = i
            elif "ESTADO" in h or "UF" in h:
                idx_uf = i
            elif "BANDEIRA" in h:
                idx_bandeira = i

        # Se não achou colunas básicas, tenta indexação padrão
        if idx_cnpj == -1 or idx_municipio == -1 or idx_produto == -1 or idx_data == -1 or idx_preco == -1:
            print("[!] Aviso: Alguns cabeçalhos não foram detectados perfeitamente. Usando índices padrões conhecidos.")
            # Geralmente ANP usa: CNPJ da Revenda (CNPJ), Municipio, Produto, Data da Coleta, Valor de Venda
            # Vamos tentar inferir pelos nomes comuns
            for i, h in enumerate(headers):
                h_clean = h.strip().lower()
                if "cnpj" in h_clean:
                    idx_cnpj = i
                elif "municipio" in h_clean:
                    idx_municipio = i
                elif "produto" in h_clean:
                    idx_produto = i
                elif "data" in h_clean:
                    idx_data = i
                elif "valor" in h_clean or "venda" in h_clean:
                    idx_preco = i

        # Fallbacks finais se falhar tudo
        if idx_cnpj == -1: idx_cnpj = 4
        if idx_municipio == -1: idx_municipio = 10
        if idx_produto == -1: idx_produto = 13
        if idx_data == -1: idx_data = 11
        if idx_preco == -1: idx_preco = 12

        if idx_revenda == -1: idx_revenda = 3
        if idx_rua == -1: idx_rua = 5
        if idx_numero == -1: idx_numero = 6
        if idx_complemento == -1: idx_complemento = 7
        if idx_bairro == -1: idx_bairro = 8
        if idx_cep == -1: idx_cep = 9
        if idx_uf == -1: idx_uf = 1
        if idx_bandeira == -1: idx_bandeira = 15

        print(f"[*] Índices mapeados -> CNPJ: {idx_cnpj}, Município: {idx_municipio}, Produto: {idx_produto}, Data: {idx_data}, Preço: {idx_preco}")

        count_total = 0
        count_filtered = 0

        for row in reader:
            if not row or len(row) <= max(idx_cnpj, idx_municipio, idx_produto, idx_data, idx_preco):
                continue
            
            count_total += 1
            municipio_raw = row[idx_municipio]
            municipio_norm = normalize_str(municipio_raw)

            # Filtra apenas os municípios alvo (Rio de Janeiro, Petrópolis, Niterói)
            if municipio_norm in TARGET_MUNICIPIOS:
                count_filtered += 1
                
                cnpj_raw = row[idx_cnpj]
                cnpj_clean = re.sub(r"\D", "", cnpj_raw).zfill(14)
                
                prod_raw = row[idx_produto]
                prod_clean = prod_raw.strip()
                
                price_val = parse_price(row[idx_preco])
                date_val = parse_date(row[idx_data])

                if price_val is None or date_val is None:
                    continue

                # Chave única para acumulação (CNPJ, Produto)
                key = (cnpj_clean, prod_clean)

                revenda = get_col(row, idx_revenda)
                rua = get_col(row, idx_rua)
                numero = get_col(row, idx_numero)
                complemento = get_col(row, idx_complemento)
                bairro = get_col(row, idx_bairro)
                cep = get_col(row, idx_cep)
                uf = get_col(row, idx_uf)
                bandeira = get_col(row, idx_bandeira)

                val_tuple = (price_val, date_val, municipio_raw, revenda, rua, numero, complemento, bairro, cep, uf, bandeira)

                # Mantém apenas o preço cuja data de coleta seja a mais recente dentro do próprio CSV
                if key in grouped_prices:
                    existing_date = grouped_prices[key][1]
                    if date_val > existing_date:
                        grouped_prices[key] = val_tuple
                else:
                    grouped_prices[key] = val_tuple

        print(f"[+] Total de linhas no arquivo: {count_total} | Filtro cidades: {count_filtered} | Distintos (CNPJ, Prod) agregados: {len(grouped_prices)}")
        
    return grouped_prices


def sync_prices_with_db(grouped_csv_data, db_config):
    """
    Sincroniza os dados coletados com a tabela 'tb_precos_combustiveis'. Only if the collected date
    is newer than the stored one.
    """
    conn, driver_name = connect_database(db_config)
    print(f"[*] Conectado ao banco de dados [{db_config['host']}] via {driver_name}")
    cursor = conn.cursor()

    # 1. Carregar tabela de tipo produto para termos o mapa reverso de ID
    print("[*] Carregando tipos de combustíveis (tb_tipoproduto)...")
    try:
        cursor.execute("SELECT id_produto, ds_produto FROM tb_tipoproduto")
        db_prods_raw = cursor.fetchall()
    except Exception as e:
        print(f"[CRITICAL] Falha ao carregar tb_tipoproduto: {e}")
        conn.close()
        sys.exit(1)

    # db_products representará {ds_produto_normalizado: id_produto}
    db_products = {}
    for id_p, ds_p in db_prods_raw:
        db_products[normalize_str(ds_p)] = id_p
        # Indexar variações comuns também
        ds_normalized = normalize_str(ds_p)
        if ds_normalized in PRODUCT_ALIASES:
            # Também indexa o alias
            db_products[normalize_str(PRODUCT_ALIASES[ds_normalized])] = id_p

    print(f"[OK] {len(db_products)} mapeamentos de combustíveis carregados.")

    # 2. Cache para evitar consultar a tabela tb_postos repetidamente por CNPJ
    # Chave: CNPJ mapeado | Valor: id_posto
    postos_cache = {}
    
    # Contadores do processo de sincronização
    inserted_count = 0
    updated_count = 0
    ignored_older_count = 0
    ignored_missing_posto = 0
    ignored_missing_prod = 0

    print("[*] Iniciando a sincronização com 'tb_precos_combustiveis'...")

    for (cnpj, product), val in grouped_csv_data.items():
        csv_price = val[0]
        csv_date = val[1]
        original_mun = val[2]
        
        # A. Obter o id_posto pelo CNPJ
        id_posto = None
        if cnpj in postos_cache:
            id_posto = postos_cache[cnpj]
        else:
            try:
                # Na tabela tb_postos, o CNPJ está no campo nu_cnpjposto ou nu_cnpj
                # Buscamos pelas duas possibilidades comuns para garantir retrocompatibilidade das frotas
                cursor.execute(
                    "SELECT id_posto FROM tb_postos WHERE nu_cnpjposto = %s OR nu_cnpj = %s LIMIT 1",
                    (cnpj, cnpj)
                )
                res = cursor.fetchone()
                if res:
                    id_posto = res[0]
                    postos_cache[cnpj] = id_posto
                else:
                    postos_cache[cnpj] = None
            except Exception as e:
                # Se der erro de coluna, tenta buscar apenas por nu_cnpjposto
                try:
                    cursor.execute("SELECT id_posto FROM tb_postos WHERE nu_cnpjposto = %s LIMIT 1", (cnpj,))
                    res = cursor.fetchone()
                    if res:
                        id_posto = res[0]
                        postos_cache[cnpj] = id_posto
                except Exception as ex:
                    print(f"[!] Erro ao buscar posto: {ex}")
                    postos_cache[cnpj] = None

        if not id_posto:
            # AUTO-INSERT missing posto!
            try:
                revenda = val[3] if len(val) > 3 else "POSTO NÃO IDENTIFICADO"
                rua = val[4] if len(val) > 4 else ""
                numero = val[5] if len(val) > 5 else ""
                complemento = val[6] if len(val) > 6 else ""
                bairro = val[7] if len(val) > 7 else ""
                cep = (val[8] if len(val) > 8 else "").replace("-", "").strip()[:8]
                uf = val[9] if len(val) > 9 else "RJ"
                bandeira = val[10] if len(val) > 10 else "BRANCA"

                ds_endereco = f"{rua}, {numero}".strip(", ")
                nu_cep = cep.zfill(8)
                nm_municipio = original_mun.title()

                cursor.execute(
                    """
                    INSERT INTO tb_postos 
                    (nu_cnpjposto, nu_autorizacaoanp, nm_posto, ds_endereco, ds_complemento, nm_bairro, nu_cep, sg_ufposto, nm_municipio, geo_latitude, geo_longitude, nm_bandeira, fg_ativo)
                    VALUES (%s, 'PENDENTE', %s, %s, %s, %s, %s, %s, %s, '0', '0', %s, 1)
                    """,
                    (cnpj, revenda, ds_endereco, complemento, bairro, nu_cep, uf, nm_municipio, bandeira)
                )
                id_posto = cursor.lastrowid
                postos_cache[cnpj] = id_posto
                print(f"[+] Auto-inserido posto CNPJ {cnpj}: {revenda} ({nm_municipio})")
            except Exception as e_insert:
                print(f"[!] Erro ao auto-inserir posto CNPJ {cnpj}: {e_insert}")
                ignored_missing_posto += 1
                continue

        # B. Descobrir id_combustivel (referência a tb_tipoproduto)
        prod_norm = normalize_str(product)
        
        # Tenta mapear o produto do CSV primeiro com aliases
        mapped_name = PRODUCT_ALIASES.get(prod_norm, prod_norm)
        id_combustivel = db_products.get(normalize_str(mapped_name))

        if not id_combustivel:
            # Tenta busca parcial simples
            for norm_key, id_p in db_products.items():
                if norm_key in prod_norm or prod_norm in norm_key:
                    id_combustivel = id_p
                    break

        if not id_combustivel:
            ignored_missing_prod += 1
            print(f"[WARN] Combustível do CSV '{product}' não possui ID correspondente em 'tb_tipoproduto'. Ignorado.")
            continue

        # C. Verificar preço atual gravado no banco
        try:
            cursor.execute(
                "SELECT dt_ultima_atualizacao, vl_preco_venda FROM tb_precos_combustiveis WHERE id_posto = %s AND id_produto = %s",
                (id_posto, id_combustivel)
            )
            db_row = cursor.fetchone()
        except Exception as e:
            print(f"[!] Erro ao checar preço existente: {e}")
            continue

        should_update = False
        is_new_entry = False

        if db_row:
            db_date, db_price = db_row
            # Tratar db_date para comparação
            if db_date:
                # Alguns drives retornam datetime.datetime, outros strings ou timestamps
                if isinstance(db_date, str):
                    parsed_db_date = parse_date(db_date)
                else:
                    parsed_db_date = db_date
                
                # Conversão robusta para evitar TypeError entre datetime e date
                import datetime as dt_mod
                comp_csv_date = csv_date.replace(tzinfo=None) if isinstance(csv_date, datetime) else csv_date
                comp_db_date = parsed_db_date
                if isinstance(comp_db_date, dt_mod.date) and not isinstance(comp_db_date, datetime):
                    comp_db_date = datetime(comp_db_date.year, comp_db_date.month, comp_db_date.day)
                elif isinstance(comp_db_date, datetime):
                    comp_db_date = comp_db_date.replace(tzinfo=None)

                # Se a data coletada do CSV for mais recente, atualiza
                if comp_csv_date is None:
                    should_update = False
                elif comp_db_date is None or comp_csv_date > comp_db_date:
                    should_update = True
                else:
                    ignored_older_count += 1
            else:
                # Sem data registrada, atualiza
                should_update = True
        else:
            # Não existe registro para essa combinação, insere novo
            should_update = True
            is_new_entry = True

        # D. Executa o UPDATE ou INSERT correspondente
        if should_update:
            try:
                if is_new_entry:
                    cursor.execute(
                        """
                        INSERT INTO tb_precos_combustiveis 
                        (id_posto, id_produto, vl_preco_venda, dt_ultima_atualizacao, ds_origem_dado)
                        VALUES (%s, %s, %s, %s, %s)
                        """,
                        (id_posto, id_combustivel, csv_price, csv_date, 'CSV_TANKAGE_SYNC')
                    )
                    inserted_count += 1
                else:
                    cursor.execute(
                        """
                        UPDATE tb_precos_combustiveis
                        SET vl_preco_venda = %s, dt_ultima_atualizacao = %s, ds_origem_dado = %s
                        WHERE id_posto = %s AND id_produto = %s
                        """,
                        (csv_price, csv_date, 'CSV_TANKAGE_SYNC', id_posto, id_combustivel)
                    )
                    updated_count += 1
            except Exception as e:
                print(f"[!] Erro ao realizar escrita no banco (id_posto: {id_posto}, id_comb: {id_combustivel}): {e}")

    cursor.close()
    conn.close()

    print("\n" + "="*50)
    print("           RELATÓRIO DE SINCRONIZAÇÃO")
    print("="*50)
    print(f" Novos registros inseridos:      {inserted_count}")
    print(f" Registros atualizados (novos):  {updated_count}")
    print(f" Ignorados (preço DB mais novo): {ignored_older_count}")
    print(f" Ignorados (posto não cadastrado): {ignored_missing_posto}")
    print(f" Ignorados (combustível sem ID):  {ignored_missing_prod}")
    print("="*50 + "\n")


def main():
    print(f"[*] Executando Sincronizador de Preços ANP às {datetime.now().isoformat()}")
    
    # 1. Carregar credenciais
    db_config = load_env_or_config()
    print(f"[*] Configurações de Banco -> Host: {db_config['host']}, Banco: {db_config['database']}")

    # Arquivos temporários locais para processamento
    file_gasolina = "temp_gasolina_etanol.csv"
    file_diesel = "temp_diesel_gnv.csv"

    grouped_data = {}

    # 2. Processar primeiro link (Gasolina e Etanol)
    success = download_csv_to_local(CSV_URL_GASOLINA_ETANOL, file_gasolina)
    if success:
        delim, encoding = detect_dialect(file_gasolina)
        print(f"[*] Dialeto Detectado -> Delimitador: '{delim}' | Codificação: {encoding}")
        data = parse_and_group_csv_data(file_gasolina, delim, encoding)
        grouped_data.update(data)
        # Limpar arquivo temporário de forma segura
        try:
            os.remove(file_gasolina)
        except Exception:
            pass

    # 3. Processar segundo link (Diesel e GNV)
    success2 = download_csv_to_local(CSV_URL_DIESEL_GNV, file_diesel)
    if success2:
        delim, encoding = detect_dialect(file_diesel)
        print(f"[*] Dialeto Detectado -> Delimitador: '{delim}' | Codificação: {encoding}")
        data = parse_and_group_csv_data(file_diesel, delim, encoding)
        
        # Atualiza o dicionário acumulado de preços
        for key, value in data.items():
            if key in grouped_data:
                # Compara as datas para garantir que fica o mais novo se houver colisão de chave
                existing_date = grouped_data[key][1]
                csv_date = value[1]
                if csv_date > existing_date:
                    grouped_data[key] = value
            else:
                grouped_data[key] = value

        # Limpar arquivo temporário de forma segura
        try:
            os.remove(file_diesel)
        except Exception:
            pass

    # 4. Sincronizar dados acumulados com o Banco de Dados
    if grouped_data:
        if JSON_ONLY:
            output_list = []
            for (cnpj, product), val in grouped_data.items():
                price = val[0]
                dt = val[1]
                original_mun = val[2]
                revenda = val[3] if len(val) > 3 else ""
                rua = val[4] if len(val) > 4 else ""
                numero = val[5] if len(val) > 5 else ""
                complemento = val[6] if len(val) > 6 else ""
                bairro = val[7] if len(val) > 7 else ""
                cep = val[8] if len(val) > 8 else ""
                uf = val[9] if len(val) > 9 else ""
                bandeira = val[10] if len(val) > 10 else ""

                output_list.append({
                    "cnpj": cnpj,
                    "product": product,
                    "price": price,
                    "date": dt.strftime("%Y-%m-%d"),
                    "municipio": original_mun,
                    "revenda": revenda,
                    "endereco_rua": rua,
                    "numero_rua": numero,
                    "complemento": complemento,
                    "bairro": bairro,
                    "cep": cep,
                    "uf": uf,
                    "bandeira": bandeira
                })
            real_stdout.write(json.dumps(output_list, indent=2, ensure_ascii=False) + "\n")
        else:
            sync_prices_with_db(grouped_data, db_config)
    else:
        print("[!] Nenhuma informação útil foi coletada dos arquivos CSV fornecidos.")


if __name__ == "__main__":
    main()
