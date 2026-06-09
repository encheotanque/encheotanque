import HTMLtoDOCX from 'html-to-docx';
import * as fs from 'fs';
import * as path from 'path';
import { JSDOM } from 'jsdom';

async function generateDocx() {
  const htmlPath = path.join(process.cwd(), 'public', 'documentos', 'Relatorio_Atividades_Semestre.html');
  const docxOutputPath = path.join(process.cwd(), 'public', 'documentos', 'Relatorio_Atividades_Semestre.docx');

  if (!fs.existsSync(htmlPath)) {
    console.error(`Error: HTML file not found at ${htmlPath}`);
    process.exit(1);
  }

  console.log(`Reading HTML file from ${htmlPath}...`);
  const rawHtml = fs.readFileSync(htmlPath, 'utf8');

  // Use JSDOM to clean up and format the document
  const dom = new JSDOM(rawHtml);
  const document = dom.window.document;

  // 1. Remove the web navigation header if present
  const webNav = document.querySelector('.brand-header-nav');
  if (webNav) {
    console.log('Removing web navigation header...');
    webNav.remove();
  }

  // 2. Base64-encode images so they embed perfectly in DOCX
  const images = document.querySelectorAll('img');
  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    const src = img.getAttribute('src') || '';

    // Let's resolve the path
    let imgPath = '';
    if (src.includes('cropped-Logo-UCP-Vetorizada-2024.png')) {
      imgPath = path.join(process.cwd(), 'public', 'documentos', 'cropped-Logo-UCP-Vetorizada-2024.png');
    } else if (src.includes('logo-enche-o-tanque.svg') || src.includes('enche_o_tanque_logo.png')) {
      // Use the PNG version for better compatibility with Word
      imgPath = path.join(process.cwd(), 'public', 'enche_o_tanque_logo.png');
    }

    if (imgPath && fs.existsSync(imgPath)) {
      console.log(`Embedding image ${src} from ${imgPath}...`);
      const fileBuffer = fs.readFileSync(imgPath);
      const ext = path.extname(imgPath).substring(1);
      const mimeType = ext === 'svg' ? 'image/svg+xml' : `image/${ext}`;
      const base64Data = fileBuffer.toString('base64');
      img.setAttribute('src', `data:${mimeType};base64,${base64Data}`);
    } else {
      console.warn(`Warning: Image not found at path ${imgPath} for src ${src}`);
    }
  }

  // Extract the HTML content we want to convert
  const container = document.querySelector('.container') || document.body;
  
  // Create a minimal HTML body suited for html-to-docx to preserve basic styles
  const cleanHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Relatório de Atividades do Semestre</title>
      <style>
        body { font-family: 'Arial', sans-serif; }
        h1 { color: #0f172a; font-size: 24pt; margin-bottom: 5pt; }
        h2 { color: #0f172a; font-size: 16pt; border-bottom: 1px solid #e2e8f0; padding-bottom: 3pt; margin-top: 20pt; }
        h3 { color: #0f172a; font-size: 13pt; }
        p { color: #334155; font-size: 10.5pt; line-height: 1.5; }
        table { width: 100%; border-collapse: collapse; margin-top: 10pt; }
        th { background-color: #f8fafc; border: 1px solid #cbd5e1; padding: 8px; font-weight: bold; text-align: left; font-size: 10pt; }
        td { border: 1px solid #cbd5e1; padding: 8px; font-size: 9.5pt; color: #334155; }
        .timeline { margin-left: 10pt; border-left: 2px solid #cbd5e1; padding-left: 10pt; }
        .timeline-item { margin-bottom: 15pt; }
        .timeline-title { font-weight: bold; font-size: 11pt; color: #0f172a; }
        .timeline-desc { font-size: 10pt; color: #475569; }
        .grid { margin-top: 10pt; margin-bottom: 20pt; }
        .card { padding: 12pt; border: 1px solid #e2e8f0; margin-bottom: 10pt; background-color: #fafbfc; }
        .card h3 { margin-top: 0; }
        .badge { display: inline-block; padding: 3px 8px; background-color: #f1f5f9; color: #475569; font-size: 8pt; font-weight: bold; text-transform: uppercase; border-radius: 4px; }
        .sig-container { margin-top: 50pt; width: 100%; display: table; }
        .sig-block { display: table-cell; width: 50%; text-align: center; border-top: 1px solid #cbd5e1; padding-top: 10pt; }
        .sig-name { font-weight: bold; font-size: 10pt; }
        .sig-title { font-size: 9pt; color: #475569; }
      </style>
    </head>
    <body>
      ${container.innerHTML}
    </body>
    </html>
  `;

  try {
    console.log('Converting HTML to DOCX using html-to-docx...');
    const fileBuffer = await HTMLtoDOCX(cleanHtml, null, {
      table: { row: { cantSplit: true } },
      footer: true,
      pageNumber: true,
    });

    console.log(`Writing DOCX file to ${docxOutputPath}...`);
    fs.writeFileSync(docxOutputPath, fileBuffer);
    console.log('SUCCESS: DOCX file successfully generated!');
  } catch (error) {
    console.error('Error during conversion:', error);
    process.exit(1);
  }
}

generateDocx();
