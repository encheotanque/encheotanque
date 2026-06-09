import os
import re
from bs4 import BeautifulSoup

def process_offline():
    # Simula o HTML enviado pelo usuário (o mesmo do print PDF)
    html = """
    <html><head></head><body>
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
    </body></html>
    """
    
    # Executa a mesma lógica programada
    soup = BeautifulSoup(html, 'html.parser')
    
    qtd_total_itens = 0
    valor_total_nota = 0.0
    labels = soup.find_all('label')
    for label in labels:
        text = label.text.strip().lower()
        if 'qtd. total de itens' in text:
            span = label.find_next_sibling('span', class_='totalNumb')
            if span:
                qtd_total_itens = int(span.text.strip())
        elif 'valor a pagar' in text:
            span = label.find_next_sibling('span', class_=re.compile('totalNumb'))
            if span:
                valor_total_nota = float(span.text.strip().replace(',', '.'))
                
    items = []
    table = soup.find('table', id='tabResult')
    if table:
        rows = table.find_all('tr', id=re.compile(r'^Item'))
        for row in rows:
            desc_tag = row.find('span', class_='txtTit')
            desc = desc_tag.text.strip() if desc_tag else "Sem descrição"
            
            qtd = 0.0
            qtd_tag = row.find('span', class_='Rqtd')
            if qtd_tag:
                qtd_str = qtd_tag.text.replace('Qtde.:', '').strip().replace(',', '.')
                try: qtd = float(qtd_str)
                except ValueError: pass
            
            unit = 0.0
            unit_tag = row.find('span', class_='RvlUnit')
            if unit_tag:
                unit_str = re.sub(r'[^\d,]', '', unit_tag.text.replace('Vl. Unit.:', ''))
                try: unit = float(unit_str.replace(',', '.'))
                except ValueError: pass
            
            total = 0.0
            total_tag = row.find('span', class_='valor')
            if total_tag:
                try: total = float(total_tag.text.strip().replace(',', '.'))
                except ValueError: pass
                
            items.append({
                'descricao': desc,
                'quantidade': qtd,
                'valor_unitario': unit,
                'valor_total': total
            })
            
    print("==================================================")
    print(" Iniciando Teste Mock (Parseamento NFe RJ)")
    print("==================================================\n")
    print("\n================== RESUMO DA NOTA ==================")
    print(f" Itens Totais.: {qtd_total_itens}")
    print(f" Valor Final..: R$ {valor_total_nota:.2f}")
    print("------------------ ITENS (PRODUTOS) ----------------")
    for idx, item in enumerate(items, 1):
        print(f"\n   [{idx}] {item['descricao']}")
        print(f"       Quantidade..: {item['quantidade']:.3f} Litros/UN")
        print(f"       Preço Unit..: R$ {item['valor_unitario']:.3f}")
        print(f"       Total Item..: R$ {item['valor_total']:.2f}")
    print("\n====================================================")

if __name__ == '__main__':
    process_offline()
