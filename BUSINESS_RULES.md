# Regras de Negócio - Fuel Community App

Este documento descreve as lógicas e restrições que regem o ecossistema do aplicativo, focando no incentivo à colaboração e na veracidade dos dados de preços de combustíveis.

---

## 1. Controle de Acesso e Colaboração (Give-to-Get)

O coração do aplicativo é o modelo colaborativo. Para usufruir dos dados da comunidade, o usuário deve ser um contribuinte ativo.

### 1.1. Regra de Acesso à Busca (Quero Abastecer)
O acesso à funcionalidade de busca de postos e preços é dinâmico e depende do histórico de capturas do motorista:
- **Acesso Ativo:** O motorista tem acesso total se realizou ao menos uma captura de QR Code de Nota Fiscal nos últimos **7 dias**.
- **Renovação:** Cada nova captura válida estende o prazo de acesso por mais 7 dias a partir da data do abastecimento/registro.
- **Acesso Expirado:** Caso o motorista não contribua por mais de 7 dias, a função de busca é bloqueada, sendo exibido um alerta solicitando o escaneamento de uma nova nota para liberar o acesso.

### 1.2. Exceções e Período de Graça
- **Novos Usuários (Trial):** Para que o novo motorista possa experimentar o app, o sistema libera acesso total nas primeiras **24 horas** após a criação da conta, independentemente de capturas.
- **Flag de Primeira Busca:** A primeira tentativa de busca de um motorista recém-cadastrado é sempre permitida para evitar atrito inicial no "onboarding".

---

## 2. Captura e Processamento de Dados (QR Code)

### 2.1. Unicidade de Dados
- Cada URL de QR Code (chave de acesso da NF-e) é processada para extrair: Posto, Combustível, Valor Unitário e Data/Hora.
- O sistema evita duplicidade de registros para a mesma nota fiscal no cálculo de economia do motorista.

### 2.2. Associação de Veículo
- Toda captura de nota deve ser vinculada a um dos veículos cadastrados no perfil do motorista. Isso permite que o sistema organize os dados por tipo de combustível (ex: Diesel vs. Gasolina) e calcule a autonomia/economia corretamente.

---

## 3. Inteligência de Busca e Geolocalização

### 3.1. Raio de Busca
- A busca de preços é realizada em um raio dinâmico (parâmetro de sistema, ex: 10km a 50km) a partir da posição GPS atual do motorista.

### 3.2. Atualização de Preços
- O sistema prioriza a exibição de preços coletados nas últimas 24h a 72h. Preços mais antigos são sinalizados ou omitidos para garantir que o motorista não se desloque para um posto com preços muito defasados.

---

## 4. Gestão de Motoristas e Veículos

### 4.1. Cadastro Obrigatório
- É mandatório o cadastro do **CPF**, **CNH** (com validade) e **Nome Completo** para que o usuário seja considerado um motorista apto a operar no sistema.
- **Status de Atividade:** Motoristas podem ter seu acesso suspenso administrativamente caso sejam detectadas práticas fraudulentas (ex: envio de QR Codes falsos ou repetidos de terceiros).

---

## 5. Cálculos de Performance (Dashboard)

### 5.1. Economia Acumulada
- A economia é calculada comparando o `vl_preco_unitario` da nota capturada com o preço médio (ou maior preço) praticado na região na mesma data.
- **Total Gasto:** Soma de todos os abastecimentos registrados via QR Code.

---

## 6. Futuras Implementações Éticas (Prevenção de Cartel)
*(Em definição)*
- O sistema monitora variações de preços em tempo real. Padrões de preços idênticos em postos de bandeiras diferentes em um curto espaço de tempo e raio geográfico serão sinalizados em relatórios administrativos para análise de possível prática de cartel.
