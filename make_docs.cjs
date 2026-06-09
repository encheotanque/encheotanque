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
        <li><strong>Problemas de Parsing de Coordenadas:</strong> O Banco de Dados MySQL (tb_postos) armazenava latitude e longitude no formato "Graus:Minutos:Segundos" (ex: -22:30:58.591), o que quebrava as funções matemáticas e relatórias. <em>Solução:</em> Implementou-se um algoritmo nativo customizado no Backend Node.js que converte em tempo real as coordenadas da DB para decimais float e aplica a Fórmula de Haversine via Javascript.</li>
        <li><strong>Permissões de Iframe e Geolocalização:</strong> Navegadores bloqueavam a captura por timeout de segurança imposto por Iframes e Policies Mobile. <em>Solução:</em> Criou-se um sistema com fallback amigável. Se o GPS falhar, o App assume estaticamente como "Petrópolis-RJ" centralizado e avisa o usuário.</li>
    </ul>

    <h2>2. Premissas e Características do App</h2>
    <ul>
        <li><strong>Crowdsourcing Inovador de Preços:</strong> A base é retroalimentada através de notas fiscais (NFC-e / NFe).</li>
        <li><strong>Interpolação Matemática Visual (RGB):</strong> Os pinos se moldam do Esmeralda ao Escarlate através de interpolação estrita em tempo real baseada no (Min, Máx e Avg) do momento e local puxado.</li>
        <li><strong>Troféu Absoluto (Top 1):</strong> Pinos Dourados sinalizam Ouro Absoluto (o Top 1 ou empatados).</li>
        <li><strong>Interface Mobile Experience (MX):</strong> Cards interativos limpos e sobrepostos em bottom-sheets, suporte multi-toque e integração deep-link instantânea ("Como Chegar") com GPS nativo de celulares do Google.</li>
    </ul>

    <h2>3. Passo-a-Passo Funcional</h2>
    <ol>
        <li>O usuário acessa o sistema visual.</li>
        <li>Ao escanear Nota Fiscal, os dados vão à Tabela de Entrada (tb_qrcode) e um Worker externo processa no SEFAZ.</li>
        <li>Dados integram na tb_abastecimentos vinculando valor aos postos mapeados.</li>
        <li>No Painel Cidadão, usuário valida seu Local (GPS Nativo Autorizado).</li>
        <li>Seleciona o Raio Radial em Quilômetros e escolhe o Combustível.</li>
        <li>Motor processa as últimas vigências, gerando a resposta topológica cartográfica.</li>
        <li>Acesso ao Melhor Preço + Botão Navegação Direta.</li>
    </ol>

    <h2>4. Diagrama Lógico e Operacional Simplificado</h2>
    <p>
    [ APLICATIVO WEB CELULAR (React + Tailwind + Vite)]<br>
    ---> Requisita Localização -> Envia Get p/ Backend (/api/search-stations)<br>
    <br>
    [ BACKEND MIDDLEWARE (Node.js Express)]<br>
    ---> Conecta MySQL<br>
    ---> Une (JOIN) Tabelas Postos e Abastecimentos pelo ID da bomba<br>
    ---> Filtra Topológica (Haversine Formula JS) usando Raio recebido<br>
    <br>
    [ BANCO ORACLE MYSQL ]<br>
    --- Alimentado assincronamente por Robôs (Python Processador NFC-e) que devoram as urls e gravam os valores unitários e carimbos de Data/Hora (Timestamps).
    </p>

    <h2>5. Roadmap e O Futuro: Fase Frotas (Embarque B2B)</h2>
    <p>Para a reunião de terça-feira, a projeção arquitetural vira a chave de B2C para <strong>Modelo Empresarial B2B - Soluções Logísticas</strong>.</p>
    <p>Novas Estruturas Prontas para serem criadas:</p>
    <ul>
        <li><code>tb_empresas</code>: Gestor Master com contas de controle logístico.</li>
        <li><code>tb_veiculos</code>: Relatório de Frotas acopladas (Placas, Consumo Médio, Quota Limite).</li>
        <li><code>tb_motoristas</code>: Ligação do funcionário ao caminhão/carro da empresa, usando o APP como prova de fidelidade empresarial (Auditores de Gasto de Bomba via QR Code).</li>
    </ul>
    <p>A sinergia é perfeita: O frotista obriga e incentiva que seus mais de 1000 motoristas procurem o pino verde ou dourado utilizando NFCe. Isso alimenta e engorda absurdamente a qualidade de dados do sistema principal da aplicação.</p>

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

        const publicDir = path.join(process.cwd(), 'public');
        if (!fs.existsSync(publicDir)){
            fs.mkdirSync(publicDir, { recursive: true });
        }

        fs.writeFileSync(path.join(publicDir, 'Documentacao_EncheOTanque.docx'), fileBuffer);
        console.log("DOCX generated successfully at /public/Documentacao_EncheOTanque.docx");
    } catch (e) {
        console.error("Error generating docx:", e);
    }
}

convert();
