const fs = require('fs');
const path = require('path');
const HTMLtoDOCX = require('html-to-docx');

const htmlString = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Documentação do Projeto - Enche o Tanque</title>
</head>
<body>
    <h1>Documentação Técnica e Histórica: Projeto "Enche o Tanque"</h1>
    <p><strong>Data de Geração:</strong> Abril de 2026</p>

    <h2>1. Histórico do Projeto</h2>
    <p>O desenvolvimento iniciou-se a partir da importação de mockups e wireframes de telas projetadas para criar uma aplicação robusta de busca e registro de preços de combustíveis. A aplicação consolidou-se unindo uma Stack Node.js/React no front-end com um back-end Express e um banco de dados relacional MySQL na Oracle Cloud.</p>

    <h3>1.1. Principais Desafios e Resoluções</h3>
    <ul>
        <li><strong>Autenticação do Google Maps:</strong> Inicialmente, a API Key sofria restrições de Referrer. Contornamos adicionando tratamento de erro visual e garantindo a listagem de URLs liberadas (CORS e Cloud Console).</li>
        <li><strong>Problemas de Parsing de Coordenadas:</strong> O Banco de Dados MySQL (tb_postos) armazenava latitude e longitude no formato "Graus:Minutos:Segundos" (ex: -22:30:58.591), o que quebrava as funções matemáticas de Raio. <em>Solução:</em> Implementou-se um parser customizado no Backend Node.js que converte em tempo real as coordenadas da DB para decimais e aplica a Fórmula de Haversine via Javascript antes de enviar ao cliente.</li>
        <li><strong>Permissões de Iframe e Geolocalização:</strong> Navegadores bloqueavam a captura por timeout no mobile dependendo do contexto. <em>Solução:</em> Criou-se um sistema com fallback de Timeout. Se o GPS falhar (timeout ou permissão negada), o App assume como "Petrópolis-RJ" para que o mapa ainda renderize perfeitamente.</li>
    </ul>

    <h2>2. Premissas e Características do App</h2>
    <ul>
        <li><strong>Crowdsourcing de Preços:</strong> A base de dados principal é retroalimentada constantemente por notas fiscais (NFC-e e NFe - SEFAZ).</li>
        <li><strong>Interpolação Matemática Visual:</strong> Os pinos no mapa se moldam do Verde ao Vermelho através de interpolação matemática de RGB baseada no balanço de mínimo, média e máximo dos preços dos postos que existem dentro do raio puxado.</li>
        <li><strong>Troféu Absoluto (Top 1):</strong> Algoritmos validam constantemente qual o posto estritamente mais barato com pino Dourado, dando gatilho de urgência ("Mais Barato, Vale a Pena!").</li>
        <li><strong>Interface Mobile First:</strong> Cards interativos limpos e sobrepostos, suporte multi-toque e deep-link ("Como Chegar") direto via roteamento no app nativo do Google Maps.</li>
    </ul>

    <h2>3. Passo-a-Passo Funcional</h2>
    <ol>
        <li>O usuário acessa o sistema pelo Celular.</li>
        <li>Ao escolher a Opção de <strong>Escanear Nota</strong>, a URL via QR Code é levada ao DB (tb_qrcode). Um Worker em Python/cron parseia essa nota valendo-se dos dados no site oficial do governo.</li>
        <li>O preço entra limpo na <strong>tb_abastecimentos</strong> atrelado ao registro do Posto.</li>
        <li>Quando o usuário entra na Aba <strong>Abastecer</strong>, ele providencia seu Local Atual de GPS.</li>
        <li>Seleciona o Raio em KM e a Categoria de Combustível (Ex: GNV, Gasolina Aditivada).</li>
        <li>A aplicação varre o SQL trazendo a <em>última</em> cotação reportada naquele raio, gerando o degradê de cores no mapa.</li>
        <li>Usuário toca no posto, visualiza os dados (data e avaliação do preço) e clica em GPS ("Como Chegar").</li>
    </ol>

    <h2>4. Diagrama Lógico e Operacional</h2>
    <p>
    <strong>[ Dispositivo Mobile do Usuário ]</strong><br>
    |-- Front-End (React + Vite, TailwindCSS)<br>
    |-- API Google Maps SDK (Roteiro e Pins)<br>
    |<br>
    <strong>[ Server-Side (Node.js/Express) ]</strong><br>
    |-- /api/search-stations (Haversine Logic)<br>
    |-- /api/history<br>
    |<br>
    <strong>[ Cloud DB (MySQL Oracle) ]</strong><br>
    |-- tb_postos (Lista estática de postos geolocalizados)<br>
    |-- tb_abastecimentos (Histórico temporal de transações e preços)<br>
    |<br>
    <strong>[ Background Worker ]</strong><br>
    |-- Processador Python (SEFAZ Scraping)
    </p>

    <h2>5. Roadmap e Implementação Backlog (FROTAS)</h2>
    <p>O foco da próxima etapa (Terça-feira) é a ampliação do Business Model de B2C para <strong>B2B</strong>. O modelo de dados será expandido para incorporar as seguintes ramificações operacionais:</p>
    <ul>
        <li><code>tb_empresas</code>: Organizações que controlam dezenas de veículos e tem conta master com dashboard.</li>
        <li><code>tb_veiculos</code>: A frota alocada à empresa. (Placa, Tipo de Veículo, Autonomia Média, Meta de Gasto).</li>
        <li><code>tb_motoristas</code>: Vínculo do usuário mobile atual, que agora reporta ativamente suas frotas e valida gastos corporativos através do App.</li>
    </ul>
    <p>Isto criará o ciclo onde Empresas gerenciam custos logísticos forçando Motoristas a usarem o nosso Radar de Preço, barateando toda a ponta da cadeia e engordando nossa base de dados de NFe incrivelmente rápido e com consistência empresarial.</p>

    <hr>
    
    <h2>6. ROTEIRO DE APRESENTAÇÃO (Pitch Script)</h2>
    <p><em>(Sugestão de Fala e Estrutura para os Coordenadores/Demais Grupos)</em></p>

    <p><strong>[Parte 1: Abertura e "A Dor" - 1min]</strong></p>
    <p>"Boa noite a todos! Todo mundo aqui já sofreu pra achar um posto barato que confiasse, ou abasteceu e logo na outra quadra viu o preço muito menor. A dor é clara: oscilações invisíveis de preço na nossa cidade. Nossa solução? O 'Enche o Tanque'. Muito mais do que um listador, nós criamos um agregador de mercado alimentado pelo próprio usuário."</p>

    <p><strong>[Parte 2: A Solução Tecnológica - 2min]</strong></p>
    <p>"Através de QR Codes normais emitidos fisicamente nas Notas Fiscais (NFC-e), o usuário alimenta nossa base via scanner (Demonstrar botão Escanear da Home). No Back-end, bots parseiam os sistemas da Fazenda e transformam um simples papel em Dados Vivos e Qualificados de Valor no MySQL Oracle."</p>

    <p><strong>[Parte 3: O 'Show' e o Algoritmo - 1.5min]</strong></p>
    <p>"Mas o ouro está no consumo desses dados. Peço que olhem para este mapa renderizado. Desenvolvemos matematicamente um cruzamento geográfico que, ao invés de listar tabelas chatas, renderiza na rua do usuário as cores de inteligência: Do verde para valores econômicos ao vermelho absoluto para preços abusivos e desregulados. Tudo calculado no backend com algoritmos Haversine e cor RGB Interpolada em tempo real... E, claro, esse pino Dourado vibrando aqui diz pra você matematicamente onde você precisa largar tudo e ir encher o tanque hoje."</p>

    <p><strong>[Parte 4: O Próximo Passo Certo (O Pulo do Gato) - 1.5min]</strong></p>
    <p>"Nossa estratégia não para no consumidor final. Terça-feira pivotaremos e escalaremos para o Mercado B2B (Frotas). Já engatilhamos as tabelas para ingressar Empresas e suas Frotas. Com isso, frotistas gigantes exigirão o nosso App de seus milhares de caminhoneiros e motoristas para cortar gastos, enquanto esses motoristas atuam como nossos sensores varrendo a cidade inteira pra popular 24h as cotações de preços."</p>
    
    <p>"Conectividade direta inteligente. Tecnologia React com Back-end Oracle Node. Essa é nossa entrega. Obrigado!"</p>

</body>
</html>
`;

async function convert() {
    try {
        const fileBuffer = await HTMLtoDOCX(htmlString, null, {
            table: { row: { cantSplit: true } },
            footer: true,
            pageNumber: true,
        });

        const publicDir = path.join(process.cwd(), 'public', 'docs');
        if (!fs.existsSync(publicDir)){
            fs.mkdirSync(publicDir, { recursive: true });
        }

        fs.writeFileSync(path.join(publicDir, 'Documentacao_EncheOTanque.docx'), fileBuffer);
        console.log("DOCX generated successfully at /public/docs/Documentacao_EncheOTanque.docx");
    } catch (e) {
        console.error("Error generating docx:", e);
    }
}

convert();
