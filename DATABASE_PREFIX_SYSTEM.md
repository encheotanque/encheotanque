# Sistema de Prefixos e Nomenclatura — Banco de Dados "Enche o Tanque"

Este documento descreve os padrões estruturais de nomenclatura de tabelas e colunas adotados no banco de dados do projeto **Enche o Tanque**. Sempre que novos campos ou tabelas forem idealizados, eles devem aderir estritamente a estas diretrizes.

---

## 1. Padrão de Nomenclatura das Tabelas (`tb_*`)

Todas as tabelas físicas do banco de dados utilizam caixa baixa (`lowercase`), separadas por sublinhado (`snake_case`) e são obrigatoriamente precedidas pelo prefixo **`tb_`**:
*   Exemplos: `tb_postos`, `tb_veiculo`, `tb_empresa_contato`, `tb_precos_combustiveis`, `tb_log_sincronizacao_anp`.

---

## 2. Sistema de Prefixos para Colunas

Para manter consistência de tipos e semântica de dados, todas as colunas das tabelas seguem rigidamente os seguintes prefixos de duas letras (seguidos de sublinhado):

| Prefixo | Significado | Tipo de Dado Predominante | Descrição / Exemplo Real no Banco |
| :--- | :--- | :--- | :--- |
| **`id_`** | Identificador / Chave | `INT` / `BIGINT` / `SERIAL` | Chaves primárias e estrangeiras auto-incrementais. ex: `id_posto`, `id_combustivel`, `id_empresa`, `id_status`. |
| **`nm_`** | Nome | `VARCHAR` | Nomes próprios, marcas, e descritores textuais curtos. ex: `nm_posto`, `nm_municipio`, `nm_bairro`, `nm_bandeira`, `nm_contato`, `nm_marca`, `nm_modelo`. |
| **`ds_`** | Descrição / Texto longo | `VARCHAR` / `TEXT` / `MEDIUMTEXT` | Textos livres, caminhos de arquivo, e descrições estruturais/unstructured. ex: `ds_endereco`, `ds_complemento`, `ds_email`, `ds_origem_dado`, `ds_observations`, `ds_foto`. |
| **`nu_`** | Número / Código fixo | `VARCHAR` / `INT` / `DECIMAL` | Códigos numéricos representados como string (como CNPJ ou CEP) ou métricas de capacidade absoluta (como tancagem). ex: `nu_cnpjposto`, `nu_autorizacaoanp`, `nu_cep`, `nu_tancagem`, `nu_renavam`, `nu_litros`. |
| **`vl_`** | Valor monetário / Moeda | `DECIMAL` | Valores flutuantes financeiros ou frações exatas de custo ou economia. ex: `vl_preco_venda`, `vl_economia`. |
| **`fl_`** | Flag / Estado binário | `TINYINT(1)` (0 ou 1) | Estados booleanos ativos, inativos ou binários em geral. ex: `fl_ativo` (padrão de ativação de registro), `fl_status`. |
| **`qt_`** | Quantidade | `INT` | Contadores ou quantificadores numéricos inteiros. ex: `qt_bicos`, `qt_atendimentos`. |
| **`sg_`** | Sigla | `VARCHAR(2)` / `VARCHAR(5)` | Siglas e abreviações geográficas ou organizacionais. ex: `sg_ufposto`. |
| **`dt_`** / **`dh_`** | Data / Data-Hora (Timestamp) | `DATE` / `TIMESTAMP` / `DATETIME` | Registros cronológicos de eventos. ex: `dt_ultima_atualizacao`, `dt_cadastro`, `dt_contratacao`, `dt_ultimo_aso`, `dh_cadastro`. |
| **`geo_`**| Geolocalização | `VARCHAR` | Coordenadas em latitude/longitude. ex: `geo_latitude`, `geo_longitude`. |

---

## 3. Regra de Conformidade para Criação de Novos Campos

1.  **Validação Automática**: Sempre que o assistente AI for criar ou modificar tabelas, ele deve ler este arquivo para se autopoliciar e adequar todas as chaves ao padrão.
2.  **Tratamento de Booleans**: Nunca use `is_` ou `has_` para estados booleanos. Utilize sempre o prefixo **`fl_`** seguido pela qualidade do estado (ex: `fl_ativo`, `fl_pago`, `fl_verificado`).
3.  **Dúvidas**: Caso algum campo proposto não se encaixe perfeitamente em nenhum dos prefixos acima, **o assistente interromperá o processo e solicitará sua aprovação antes de persistir no banco de dados**.
