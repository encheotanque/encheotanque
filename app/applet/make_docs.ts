import fs from 'fs';
import path from 'path';

const htmlString = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Documentação Escopo - Enche o Tanque</title>
    <style>
        body {
            font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Arial, sans-serif;
            line-height: 1.6;
            color: #333333;
            max-width: 850px;
            margin: 0 auto;
            padding: 40px 20px;
            background-color: #f9fdfa;
        }
        .container {
            background-color: #ffffff;
            padding: 40px 50px;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.05);
            border-top: 6px solid #22c55e;
        }
        h1 {
            color: #14532d;
            font-size: 2.2em;
            margin-bottom: 5px;
            text-align: center;
        }
        .subtitle {
            text-align: center;
            color: #16a34a;
            font-weight: bold;
            margin-bottom: 40px;
            font-size: 1.1em;
        }
        h2 {
            color: #166534;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 10px;
            margin-top: 40px;
            font-size: 1.5em;
        }
        h3 {
            color: #15803d;
            margin-top: 25px;
        }
        p {
            margin-bottom: 15px;
            text-align: justify;
        }
        ul, ol {
            margin-bottom: 20px;
            padding-left: 25px;
        }
        li {
            margin-bottom: 10px;
        }
        .highlight {
            background-color: #f0fdf4;
            border-left: 4px solid #22c55e;
            padding: 15px 20px;
            margin: 20px 0;
            border-radius: 0 8px 8px 0;
        }
        .pitch-box {
            background-color: #fffbeb;
            border: 1px solid #fcd34d;
            padding: 25px;
            border-radius: 12px;
            margin-top: 20px;
        }
        .pitch-box h3 {
            color: #b45309;
            margin-top: 0;
        }
        code {
            background-color: #f1f5f9;
            padding: 2px 6px;
            border-radius: 4px;
            font-family: 'Courier New', Courier, monospace;
            color: #0f172a;
            font-size: 0.9em;
        }
        .pre-box {
            background-color: #1e293b;
            color: #f8fafc;
            padding: 20px;
            border-radius: 8px;
            font-family: monospace;
            white-space: pre-line;
            line-height: 1.8;
        }
        @media print {
            body { background: white; padding: 0; }
            .container { box-shadow: none; padding: 0; }
        }
    </style>
</head>
<body>

    <div class="container">
        <h1>Documentação Técnica e Histórica</h1>
        <div class="subtitle">Projeto "Enche o Tanque" | Atualizado em Abril de 2026</div>

        <h2>1. Histórico do Projeto</h2>
        <p>O desenvolvimento iniciou-se a partir da importação de mockups e wireframes de telas projetadas para criar uma aplicação robusta de busca e registro de preços de combustíveis. A aplicação consolidou-se unindo uma Stack Node.js/React no front-end com um back-end Express e um banco de dados relacional MySQL na Oracle Cloud (BaaS).</p>

        <h3>1.1. Principais Desafios e Resoluções</h3>
        <ul>
            <li><strong>Autenticação do Google Maps:</strong> Inicialmente, a API Key sofria restrições de Referrer. Contornamos adicionando tratamento de erro visual educacional na interface e garantindo a listagem de URLs liberadas (CORS e Cloud Console).</li>
            <li><strong>Problemas de Parsing de Coordenadas Geomagnéticas:</strong> O Banco de Dados MySQL (<code>tb_postos</code>) armazenava latitude e longitude no formato <em>Graus:Minutos:Segundos</em> (ex: <code>-22:30:58.591</code>), o que quebrava as funções matemáticas embutidas. <br><em>Solução:</em> Implementou-se um algoritmo nativo customizado no Backend Node.js que converte em tempo real as coordenadas da BD para decimais (float) e aplica a complexa <strong>Fórmula de Haversine</strong> via Javascript para desenhar o raio perfeito.</li>
            <li><strong>Permissões de Iframe e Geolocalização de Browser:</strong> Navegadores bloqueavam a captura por timeout de segurança absoluto imposto por Iframes e Policies de arquiteturas Mobile. <br><em>Solução:</em> Criou-se um sistema com <em>fallback (resiliência)</em>. Se o GPS falhar (negação ou timeout), o App assume estaticamente como "Petrópolis-RJ (Padrão)" centralizado, avisa o usuário e destrava a aplicação sem causar crash no JS.</li>
        </ul>

        <h2>2. Premissas e Características do App</h2>
        <ul>
            <li><strong>Crowdsourcing Inovador de Preços:</strong> A base é retroalimentada constantemente através de notas fiscais (NFC-e / NFe).</li>
            <li><strong>Interpolação Matemática Visual (RGB):</strong> Os pinos se moldam fluidamente do Verde Esmeralda (abaixo da média) ao Vermelho Escarlate (acima da média) através de interpolação estrita em tempo real baseada no (Min, Máx e Avg) do raio selecionado.</li>
            <li><strong>Troféu Absoluto (Top 1 🏆):</strong> Algoritmos validam qual o posto estritamente mais barato com pino Dourado vibrante e letreiros, dando o gatilho de urgência ao usuário.</li>
            <li><strong>Mobile Experience (MX):</strong> Cards interativos limpos e sobrepostos em bottom-sheets, suporte multi-toque e integração deep-link instantânea ("Como Chegar") com aplicativos nativos de GPS e navegação.</li>
        </ul>

        <h2>3. Passo-a-Passo Funcional</h2>
        <ol>
            <li>O usuário acessa o PWA pelo Celular.</li>
            <li>Ao escanear Nota Fiscal, os dados vão à Tabela de Entrada (<code>tb_qrcode</code>) e um Worker externo processa no site da SEFAZ para evitar sobrecarga.</li>
            <li>Dados integram na <code>tb_abastecimentos</code> vinculando o valor ao ID numérico dos postos mapeados.</li>
            <li>No Painel Cidadão, usuário valida seu Local (GPS Nativo ou Fallback).</li>
            <li>Seleciona o Raio Radial em Quilômetros e escolhe o Combustível Filtrado.</li>
            <li>O Motor de renderização processa as últimas vigências, gerando a resposta topológica no Cartão Mobile.</li>
            <li>Acesso imediato ao Melhor Preço + Rota automática.</li>
        </ol>

        <h2>4. Diagrama Lógico e Operacional Simplificado</h2>
        <div class="pre-box">
[ APLICATIVO WEB CELULAR / BROWSER ]
 ├── Requisita Localização (GeoLocation API)
 └── Envia GET Request p/ Backend (/api/search-stations)

[ BACKEND MIDDLEWARE (Node.js Express) ]
 ├── Conecta via Pool ao Oracle Cloud
 ├── Une (JOIN) Tabelas Postos e Abastecimentos (Máx DH)
 └── Filtra Topologia (Haversine JS) cruzando com Raio KM

[ BANCO DE DADOS (Oracle MySQL) ]
 └── Retro-Alimentado assincronamente por Robôs Python (Processador NFC-e de URLs estatais).
        </div>

        <h2>5. Roadmap e O Futuro: Fase Frotas (Embarque B2B)</h2>
        <div class="highlight">
            <p>Para a próxima meta (Terça-feira), a projeção arquitetural vira a chave do mercado Cidadão (B2C) para o <strong>Modelo Empresarial B2B - Soluções Logísticas</strong>.</p>
            <p><strong>Novas Estruturas Relacionais Injetadas:</strong></p>
            <ul>
                <li><code>tb_empresas</code>: Gestor Master com dashboard e contas de controle logístico (Caixa Econômico das frotas).</li>
                <li><code>tb_veiculos</code>: Relatório de Frotas acopladas (Placas, Consumo Médio Esperado, Quota de Combustível Mensal).</li>
                <li><code>tb_motoristas</code>: Ligação do funcionário ao carro da empresa, usando o nosso App como <strong>Auditoria Contínua de Gasto</strong> na Bomba via QR Code.</li>
            </ul>
            <p><em>Sinergia de Mercado:</em> O frotista master obriga e incentiva seus mais de 100 caminhoneiros a procurarem o "pino dourado" reportando o NFC-e em cada ida ao posto. Isso não só economiza o dinheiro da transportadora, como <strong>alimenta a nossa nuvem de dados com milhares de preços novos de graça</strong> todos os dias, beneficiando inclusive os usuários comuns na ponta.</p>
        </div>

        <hr style="margin: 50px 0; border: none; border-top: 1px dashed #cbd5e1;">

        <div class="pitch-box">
            <h3>🎤 ROTEIRO DE APRESENTAÇÃO (Pitch Guideline)</h3>
            <p><em>(Sugestão de Fala, Dinâmica e Estrutura para os Coordenadores/Avaliadores)</em></p>

            <p><strong>[Parte 1: Abertura e "A Dor" - 1min]</strong><br>
            "Boa noite a todos! Todo mundo aqui já sofreu pra achar um posto barato que não tivesse combustível adulterado, ou abasteceu num valor alto e logo na rua de baixo viu um mais barato. A dor é clara: não enxergamos o mercado da gasolina. Nossa solução? O 'Enche o Tanque'. Não somos um app de listinha com logo dos postos, nós construímos um <strong>radar financeiro</strong> da cidade em tempo real."</p>

            <p><strong>[Parte 2: A Solução Tecnológica Cidadão - 1.5min]</strong><br>
            "Através de QR Codes - o quadradinho que já vem nas Notas Fiscais que todos nós jogamos no lixo - o cidadão abastece nossa base com seu celular. O Back-end absorve de forma invisível essa carga nos servidores de notas de estado, transformando um papel em Dados Vivos no nosso Oracle MySQL."</p>

            <p><strong>[Parte 3: Apresentando o Produto (Demo) - 1.5min]</strong><br>
            <em>(Momento da equipe mostrar o mapa na aba de 5 a 20km, mexendo no Combustível GNV/Aditivada)</em><br>
            "E como a gente entrega essa inteligência? Com Matemática. Nós renderizamos a cidade inteira aplicando uma interpolação RGB. Ao redor de você, os postos reagem de cor: do Escarlate pro posto mais caro e ganancioso da região, pro Verde Esmeralda dos melhores preços. E claro, o nosso radar coroa o posto absolutamente menor da cidade brilhando em Ouro com um Troféu. Você clica na placa dele, e com 1 botão, manda seu app nativo do Google abrir com a rota calculada para economizar nos próximos 5 minutos."</p>

            <p><strong>[Parte 4: Escalabilidade para 100.000 usuários (Pitch Frotas) - 1.5min]</strong><br>
            "Tudo isso é lindo para mim e pra você. Mas como a gente escala esse negócio pra base enriquecer brutalmente em semanas? É o que faremos terça-feira migrando a base para FROTAS (B2B). Criamos a arquitetura de Empresas e Frotas de Caminhão. O Frotista vai exigir que sua trupe de 300 Motoristas batam a NFC-e no enche o tanque a cada parada pra que a empresa re-embolse. De uma vez só: salvamos o lucro da Transportadora, forçamos os motoristas a abrirem o App, e em troca, recebemos milhares de preços atualizados pra rede inteira sem muito esforço. Conectividade direta de logística, resolvendo problemas de mercado. Muito Obrigado."</p>
        </div>

        <div style="text-align: center; margin-top: 40px; color: #64748b; font-size: 0.9em;">
            &copy; 2026 Equipe Enche o Tanque · Stack Node.js / React
        </div>
    </div>

</body>
</html>
`;

async function makeHtml() {
    try {
        const publicDir = path.join(process.cwd(), 'public');
        if (!fs.existsSync(publicDir)){
            fs.mkdirSync(publicDir, { recursive: true });
        }

        const outPath = path.join(publicDir, 'documentos', 'doc.html');
        fs.writeFileSync(outPath, htmlString);
        console.log("HTML generated successfully at", outPath);
    } catch (e) {
        console.error("Error generating html:", e);
    }
}

makeHtml();
