import time
from playwright.sync_api import sync_playwright

url = "https://cdp.anp.gov.br/ords/r/cdp_apex/consulta-dados-publicos-cdp/consulta-de-postos-lista"

def analyze_anp_page():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        print("Acessando a página da ANP (APEX)...")
        page.goto(url, timeout=60000)
        
        # Wait for the page to load
        page.wait_for_load_state("networkidle")
        
        # Take a look at the HTML structure to find input IDs for State/City
        html = page.content()
        with open("anp_debug.html", "w", encoding="utf-8") as f:
            f.write(html)
            
        print("Página carregada. Extraindo IDs de campos de input...")
        
        # We can find potential inputs
        inputs = page.locator('input').all()
        for i in inputs:
            try:
                name = i.get_attribute('name')
                id_ = i.get_attribute('id')
                tipo = i.get_attribute('type')
                print(f"Input: id={id_}, name={name}, type={tipo}")
            except:
                pass
                
        selects = page.locator('select').all()
        for s in selects:
            try:
                id_ = s.get_attribute('id')
                name = s.get_attribute('name')
                print(f"Select: id={id_}, name={name}")
            except:
                pass

        browser.close()

if __name__ == "__main__":
    analyze_anp_page()
