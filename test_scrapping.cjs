const { JSDOM } = require('jsdom');

const html = `<html><head></head><body>
    <table data-filter="true" id="tabResult" cellspacing="0" cellpadding="0" align="center" border="0">
    <tr id="Item + 1">
        <td valign="top">
            <span class="txtTit">GASOLINA COMUM</span>
            <span class="RCod">(Código: 1)</span><br>
            <span class="Rqtd"><strong>Qtde.:</strong>5</span>
            <span class="RUN"><strong>UN: </strong>LT</span>
            <span class="RvlUnit"><strong>Vl. Unit.:</strong> &nbsp; 7,29</span>
        </td>
        <td class="txtTit noWrap" valign="top" align="right">
            Vl. Total<br>
            <span class="valor">36,45</span>
        </td>
    </tr>
    <tr id="Item + 2">
        <td valign="top">
            <span class="txtTit">ETANOL GRID</span>
            <span class="RCod">(Código: 3)</span><br>
            <span class="Rqtd"><strong>Qtde.:</strong>5</span>
            <span class="RUN"><strong>UN: </strong>LT</span>
            <span class="RvlUnit"><strong>Vl. Unit.:</strong> &nbsp; 5,59</span>
        </td>
        <td class="txtTit noWrap" valign="top" align="right">
            Vl. Total<br>
            <span class="valor">27,95</span>
        </td>
    </tr>
    </table>
    <div class="txtRight" id="totalNota">
        <div id="linhaTotal">
            <label>Qtd. total de itens:</label><span class="totalNumb">2</span>
        </div>
        <div class="linhaShade" id="linhaTotal">
            <label>Valor a pagar R$:</label><span class="totalNumb txtMax">64,40</span>
        </div>
    </div>
    </body></html>`;

const dom = new JSDOM(html);
const document = dom.window.document;

let qtdTotal = 0;
let valTotal = 0;

Array.from(document.querySelectorAll('label')).forEach(label => {
    const text = label.textContent.toLowerCase().trim();
    if (text.includes('qtd. total de itens')) {
        const span = label.nextElementSibling;
        if (span && span.classList.contains('totalNumb')) {
            qtdTotal = parseInt(span.textContent.trim(), 10) || 0;
        }
    } else if (text.includes('valor a pagar')) {
        const span = label.nextElementSibling;
        if (span && span.classList.contains('totalNumb')) {
            valTotal = parseFloat(span.textContent.trim().replace(',', '.')) || 0;
        }
    }
});

let items = [];
const table = document.getElementById('tabResult');
if (table) {
    const rows = table.querySelectorAll('tr[id^="Item"]');
    rows.forEach(row => {
        const descTag = row.querySelector('span.txtTit');
        const desc = descTag ? descTag.textContent.trim() : "N/A";
        
        const qtdTag = row.querySelector('span.Rqtd');
        let qtd = 0;
        if (qtdTag) {
            qtd = parseFloat(qtdTag.textContent.replace('Qtde.:', '').trim().replace(',', '.')) || 0;
        }
        
        const unitTag = row.querySelector('span.RvlUnit');
        let unit = 0;
        if (unitTag) {
            const unitStr = unitTag.textContent.replace('Vl. Unit.:', '').trim().replace(',', '.');
            unit = parseFloat(unitStr.replace(/[^0-9.]/g, '')) || 0;
        }
        
        const totalTag = row.querySelector('span.valor');
        let total = 0;
        if (totalTag) {
            total = parseFloat(totalTag.textContent.trim().replace(',', '.')) || 0;
        }
        
        items.push({desc, qtd, unit, total});
    });
}

console.log("================== RESUMO DA NOTA ==================");
console.log(" Itens Totais.:", qtdTotal);
console.log(" Valor Final..: R$", valTotal.toFixed(2));
console.log("------------------ ITENS (PRODUTOS) ----------------");
items.forEach((item, idx) => {
    console.log(`\n   [${idx+1}] ${item.desc}`);
    console.log(`       Quantidade..: ${item.qtd.toFixed(3)} Litros/UN`);
    console.log(`       Preço Unit..: R$ ${item.unit.toFixed(3)}`);
    console.log(`       Total Item..: R$ ${item.total.toFixed(2)}`);
});
