# Changelog - Projeto Enche o Tanque

Todas as alterações relevantes para este projeto serão documentadas neste arquivo.

## [1.9.0] - 2026-05-30

### 🚀 Expansão de Cobertura para Minas Gerais & GPS Inteligente
- **Nova Cidade Coberta (Juiz de Fora - MG)**: Importação e cruzamento de 84 postos de combustíveis ativos de Juiz de Fora do Cadastro da ANP, mapeados por CNPJ, com suas latitudes e longitudes geoespaciais reais em banco de dados (`tb_postos`).
- **Raios Concentricos de Radar**: No radar de busca do "Quero Abastecer", adicionamos marcadores flutuantes e anéis de medição no mapa (ex: 2km, 4km, 10km, etc. até o raio limite da busca), projetando visualmente a exata distância em relação à origem do motorista.

## [1.8.0] - 2026-05-29

### 🔄 Sincronização Diária ANP & Expansão de Fontes
- **Rotina Diária Automatizada**: O aplicativo agora atualiza os preços de combustíveis diariamente direto da pesquisa semanal da ANP, permitindo capturar dados e planilhas fora do cronograma tradicional.
- **Multifontes de Dados**: Expansão e hibridização das fontes de atualização de preços através do processamento combinado de escaneamento de NFes e dados da pesquisa oficial da ANP.
- **Saneamento de Base**: Remoção do município de Teresópolis de nossa base de monitoramento ativa, uma vez que esta localidade não é coberta pelas pesquisas semanais oficiais da ANP.

## [1.7.0] - 2026-05-18

### 📊 Painel de Análises & Insights
- **Novo Botão ANÁLISES**: Consolidação dos Rankings e das métricas de economia em um único local no menu inferior.
- **Insights do Tanque**: Visualização detalhada de evolução de preços, gastos mensais por combustível e economia acumulada.
- **Gráficos Interativos**: Gráficos de barra, pizza e linha para acompanhamento visual da rotina de abastecimento.

## [1.6.0] - 2026-05-18

### 🏆 Rankings de Preços
- **Lançamento de Rankings**: Nova área dedicada para visualizar os preços mais baixos e mais altos da região.
- **Categorização Inteligente**: Rankings segmentados por **Postos**, **Bairros** e **Bandeiras**, facilitando a escolha do melhor local para abastecer.
- **Top 3 de Destaque**: Visualização focada nos 3 melhores (mais baratos) e 3 piores (mais caros) preços por categoria e tipo de combustível.
- **Filtro de Combustível**: Alternância rápida entre Gasolina Comum, Aditivada, Etanol e Diesel para dados precisos.

### 🍱 Navegação e UX
- **Menu Reorganizado**: O ícone de Feedback foi movido para o topo, enquanto o acesso ao Ranking agora ocupa um lugar de destaque no menu inferior.
- **Acesso Rápido**: Navegação otimizada para consulta instantânea de preços médios municipais e destaques de economia.

## [1.5.1] - 2026-05-17

### 🛠️ Correções & Melhorias
- **Recadastro de Veículos**: Corrigido bug na Atualização Obrigatória que impedia o acesso ao aplicativo após o salvamento dos dados de marca e modelo vinculados à padronização FIPE.

## [1.5.0] - 2026-05-15

### ⛽ Expansão de Cobertura de Postos
- **Novos Municípios Habilitados**: Integração e ativação da base de postos de combustíveis oficial da ANP para os municípios de **Rio de Janeiro**, **Niterói** e **Teresópolis**.
- **Sincronização Automática**: Implementado motor de cruzamento de dados via CNPJ para vincular postos autorizados aos produtos (combustíveis) e capacidades de tancagem informadas.

## [1.4.0] - 2026-05-03

### 🛡️ Sistema de Integridade de Dados (Data Lock)
- **Bloqueio de Conformidade**: Implementada detecção automática de veículos com nomenclatura antiga (fora do padrão FIPE). O acesso às funcionalidades principais agora é bloqueado até que os dados sejam validados.
- **Alertas de Integridade**: Novo alerta explicativo exibido na abertura do app informando a necessidade de atualização, seguindo a regra de exibição única diária (Produção) ou contínua (Dev).

### 🔔 Exibição Inteligente de Alertas e Novidades
- **Changelog Automático**: O resumo de novidades agora é exibido organicamente no primeiro acesso do dia, garantindo que o motorista esteja sempre a par das evoluções do projeto.
- **Contexto de Ambiente (Dev vs Prod)**: Lógica refinada para exibir alertas em todos os acessos durante o desenvolvimento (facilitando testes) e respeitar rigorosamente a frequência diária em ambiente produtivo.

### 🚗 Integração FIPE Robusta
- **Cobertura Total de Frota**: Busca em tempo real e padronização para Carros, Motos e Caminhões via API FIPE oficial.
- **UX de Edição Aprimorada**: O fluxo de troca de marca e modelo foi otimizado para permitir atualizações completas dentro do mesmo formulário, sem perda de progresso.

### 🎨 Refinamento de Interface "Tech-Dark"
- **Padronização de Modais**: Todos os modais do sistema agora seguem a nova estética dark, com botões de alto contraste (tipografia preta sobre fundo neon) para usabilidade máxima em qualquer condição de luz.
- **Feedback Visual de Ações**: Melhoria na velocidade de resposta e transição dos modais de sucesso e erro.

### ⚙️ Melhorias Técnicas
- **Endpoint de Sincronização**: Nova API `/api/vehicle/update` para consolidação segura de dados.
- **Acesso Rápido**: Edição de veículos habilitada via clique direto sobre a Placa na aba de Perfil.

### 🛠️ Correções & Melhorias
- **Persistência de Dados**: Correção no reset de estado ao adicionar novos veículos, garantindo que o tipo de veículo (`type`) seja limpo corretamente.
- **Responsividade SweetAlert2**: Ajuste no arredondamento (`border-radius`) e bordas dos popups para alinhar com o design geral do app.

---
*Última atualização em: 29/05/2026*
