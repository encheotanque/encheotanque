const fs = require('fs');
const path = require('path');

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
            .container { box-shadow: none; padding: 0; border: none; }
            .pitch-box { border: 1px solid #000; break-inside: avoid; }
        }
    </style>
</head>
<body>

    <div class="container">
        <h1>Documentação Técnica e Histórica</h1>
        <div class="subtitle">Projeto "Enche o Tanque" | Atualizado em Abril de 2026</div>

        <h2>1. Histórico do Projeto</h2>
        <p>O desenvolvimento iniciou-se a partir da importação de mockups e wireframes de telas projetadas para criar uma aplicação robusta de busca e registro de preços de combustíveis. A aplicação consolidou-se unindo uma Stack Node.js/React no front-end com um back-end Express e um banco de dados relacional MySQL na Oracle Cloud.</p>

        <h3>1.1. Principais Desafios e Resoluções</h3>
        <ul>
            <li><strong>Autenticação do Google Maps:</strong> Inicialmente, a API Key sofria restrições de Referrer. Contornamos adicionando tratamento de erro educacional e listagem de URLs liberadas (CORS e Cloud Console).</li>
            <li><strong>Problemas Geomagnéticos de DB:</strong> O Banco de Dados MySQL (<code>tb_postos</code>) armazenava latitude e longitude no formato <em>Graus/Minutos</em> (ex: <code>-22:30:58.591</code>). <br><em>Solução:</em> Implementou-se um algoritmo nativo customizado no Backend Node.js que converte silenciosamente as coordenadas da BD para decimais (float) e aplica a <strong>Fórmula de Haversine</strong> para desenhar o perímetro do mapa baseada em geodiversidade.</li>
            <li><strong>Bloqueio de Geolocalização (Timeout):</strong> Navegadores bloqueavam capturas por timeout em Iframes restritos no Mobile.<br><em>Solução:</em> Criou-se um fluxo amigável de <em>fallback</em>. Se o GPS falhar, o App assume "Petrópolis-RJ (Padrão)" centralizado para evitar crashes.</li>
        </ul>

        <h2>2. Premissas Vencedoras do App</h2>
        <ul>
            <li><strong>Crowdsourcing:</strong> Base retroalimentada pelo consumidor através de Notas (NFC-e / NFe).</li>
            <li><strong>Interpolação de Colorimetria (RGB):</strong> Pinos desenhados em HTML5 SVG se auto-formatam do Verde Esmeralda (abaixo da média) ao Vermelho (acima da média), baseando-se no contexto de variação temporal (Min, Máx, Avg).</li>
            <li><strong>Troféu Absoluto (🏆):</strong> Carga lógica garante exibição de Ouro incondicional ao Posto Top 1, guiando o gasto no painel inferior.</li>
            <li><strong>UX/MX Deep-Linked:</strong> Bottom cards touch-responsivos, acúmulo de feedback e interligação imediata à DeepLinks do GPS de Viagem.</li>
        </ol>

        <h2>3. Fluxo Funcional Operacional</h2>
        <ol>
            <li>O cidadão acessa o PWA pelo Celular.</li>
            <li>Escanear uma Nota fiscal (QR) aloca os dados à <code>tb_qrcode</code>, sendo depois ingeridos pelo Robô Extrator SEFAZ (Web Scraping / API).</li>
            <li>Toda operação limpa engorda a <code>tb_abastecimentos</code> e vincula id/datetime id_posto.</li>
            <li>No Painel Cidadão, a busca local dispara via filtro de Km + Tipo combustível.</li>
            <li>A resposta alimenta as coordenadas visuais da interface, já tratada pelo motor matemático do App.</li>
        </ol>

        <h2>4. Diagrama Lógico de Pilha Tecnológica</h2>
        <div class="pre-box">
[ APP WEB (React + Tailwind + Vite) ]
 ├── GET Location Coordinates (GPS)
 └── GET Fetch /api/search-stations (Params)

[ CLOUD MIDDLEWARE (Node.js Express) ]
 ├── Abre Pool c/ Oracle 
 ├── INNER JOIN \`tb_postos\` & \`tb_abastecimentos\`
 └── Extrai Sub-List com "Fórmula de Haversine" 

[ DATA VAULT (Oracle MySQL) ]
 └── Absorve Data Stream do Robô Py/Sefaz
        </div>

        <h2>5. Roadmap Próx. Semana: FASE FROTAS (B2B)</h2>
        <div class="highlight">
            <p>O foco na próxima apresentação será mudar a chave do modelo B2C para <strong>Modelo B2B</strong> - o "Gold-mine" logístico.</p>
            <p><strong>Novos Modelos de Tabelas:</strong></p>
            <ul>
                <li><code>tb_empresas</code>: Gestor Frotista.</li>
                <li><code>tb_veiculos</code>: (Placas, Consumo Médio, Quota Mensal de Litros).</li>
                <li><code>tb_motoristas</code>: O app se torna Auditor Oficial da Bomba de Gasolina.</li>
            </ul>
            <p><strong>O Ciclo:</strong> O Frotista obriga os funcionários dos Caminhões a usar nosso painel e bater NF para receberem Diária. De uma vez só: economizamos % mensal de Transportadoras colossais e, de tabela, ganhamos os motoristas preenchendo as notas e engordando o banco de dados do Cidadão comum todos os dias.</p>
        </div>

        <hr style="margin: 50px 0; border: none; border-top: 1px dashed #cbd5e1;">

        <div class="pitch-box">
            <h3>🎤 ROTEIRO DE APRESENTAÇÃO AVALIATIVA (O PITCH)</h3>
            <p><strong>[Parte 1: A "Dor" - 1min]</strong><br>
            "Boa noite a todos. Todo mercado é exposto, exceto o de combustível: só descobrimos que fomos roubados na quadra seguinte. Nossa arquitetura corta isso hoje. Mas não somos uma listinha estática: o 'Enche o Tanque' é um <strong>radar financeiro em tempo real</strong>."</p>

            <p><strong>[Parte 2: A Solução Backend - 1min]</strong><br>
            "Tudo nasce no QR Code das Notas Fiscais antigas que jogamos fora. Nossa infraestrutura extrai o código do usuário, manda um bot aos servidores do Estado e transforma Papel em Relational Data na Nuvem Oracle Node.js de ponta a ponta de forma autônoma."</p>

            <p><strong>[Parte 3: Apresentando o Frontend (A Magia) - 1.5min]</strong><br>
            <em>(Mostrem a tela e o degrade de postos)</em><br>
            "O Cidadão de casa recebe nossa entrega de dados como um verdadeiro painel tático. Por manipulação da Fórmula de Haversine cruzada a cores RGBs da matriz estendida, todos os postos brilham pra você no mapa interpolando: O Absurdo estelar vermelho, e os Justos vibrando na Esmeralda... Mas claro, aquele ali reinando no topo em Dourado com Troféu, a matemática te aponta o lugar mais barato absoluto do município. Basta ele tocar o dedo e clicar e mandá-lo pro navegador nativo abrir seu GPS do veículo."</p>

            <p><strong>[Parte 4: A Dinâmica Escalonável Econômica (Fechamento Frotas) - 1.5min]</strong><br>
            "Onde fica o lucro bilionário? Essa foi a entrega Social. A Terça-feira é a entrega <strong>Frotista Logística.</strong> Transformaremos o Painel pra acolher Empresas e seus 500 caminhões cada. O dono gerencia meta, e nós viramos a ferramenta <strong>obrigatória</strong> de auditoria do caminhoneiro rodoviário na Bomba. Ganhamos mercado de SaaS empresarial, a empresa corta % gigante do lucro suado dela... e nós usamos o fluxo massivo deles para ganhar 10 Mil novas NFs preenchendo todos os dados do munícipio na base inteira. Todo mundo traciona pra cima. Nós somos a plataforma inteira."</p>
        </div>
        
        <div style="text-align: center; margin-top: 40px; color: #64748b; font-size: 0.9em;">
            &copy; 2026 Equipe Enche o Tanque / Oracle Web Stack Serverless
        </div>

    </div>

</body>
</html>
`;

fs.writeFileSync('/app/applet/public/documentos/doc.html', htmlString);
console.log('Feito');
