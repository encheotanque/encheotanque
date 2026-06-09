import os
from playwright.sync_api import sync_playwright

def exportar_tancagem(estado="RJ", municipio="PETROPOLIS"):
    print(f"==================================================")
    print(f" Extrator ANP (Com Tancagem) - {estado} / {municipio} ")
    print(f"==================================================")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Necessário aceitar downloads
        context = browser.new_context(accept_downloads=True)
        page = context.new_page()
        
        url = "https://cdp.anp.gov.br/ords/r/cdp_apex/consulta-dados-publicos-cdp/consulta-de-postos-lista"
        print(" [~] Acessando sistema Oracle APEX da ANP...")
        page.goto(url, timeout=60000)
        page.wait_for_load_state('networkidle')
        
        # Preenchendo Estado e Município usando a API nativa do APEX (ignora popups)
        print(" [~] Injetando localização no formulário...")
        page.evaluate(f"apex.item('P7_ESTADO').setValue('{estado}', '{estado}')")
        page.evaluate(f"apex.item('P7_LOCALIDADE').setValue('{municipio}', '{municipio}')")
        
        # Opcional: focar e sair do campo para registrar os eventos de mudança do Oracle
        page.locator('#P7_ESTADO').focus()
        page.locator('#P7_ESTADO').blur()
        
        page.locator('#P7_LOCALIDADE').focus()
        page.locator('#P7_LOCALIDADE').blur()
        
        # Monitora possíveis alertas em Javascript para avisar de forma clara no terminal
        page.on("dialog", lambda dialog: print(f" [ALERTA ANP]: {dialog.message}") or dialog.dismiss())
        
        # Capturar o CAPTCHA
        captcha_path = "captcha_anp.png"
        page.locator('#anp_p7_captcha_1').screenshot(path=captcha_path)
        
        print("\n [!] ATENÇÃO: O Sistema da ANP exige verificação humana via CAPTCHA.")
        print(f"     Abra o arquivo recém-criado '{captcha_path}' na sua pasta.")
        
        codigo = input("     -> Digite as 5 letras do CAPTCHA e aperte Enter: ").strip()
        
        # Preenche o captcha
        page.fill("#P7_CAPTCHA_1", codigo)
        
        # Inicia escuta do download oficial
        print("\n [~] Solicitando Arquivo CSV de Postos COM Tancagem...")
        try:
            with page.expect_download(timeout=60000) as download_info:
                # Dispara a função exata do botão do APEX
                page.evaluate("apex.submit({request:'Exportar_Tancagem',validate:true});")
            
            download = download_info.value
            
            # Verifica se deu erro de captcha
            if "error" in page.url or page.locator('.a-Form-error').count() > 0:
                print(" [ERRO] CAPTCHA incorreto ou rejeitado pela ANP. Tente novamente.")
                # Tenta capturar a msg se existir
                try: print("Detalhe:", page.locator('.a-Form-error').first.text_content()) 
                except: pass
                return
            
            # Salva o arquivo final
            caminho_final = f"ANP_Postos_{municipio}_Tancagem.csv"
            download.save_as(caminho_final)
            print(f" [OK] Sucesso! Base de postos exportada para: {caminho_final}")
            
        except Exception as e:
            print(f" [ERRO] Falha ao processar o download. Verifique se o Captcha estava correto. Detalhe: {e}")
            
        finally:
            browser.close()

if __name__ == "__main__":
    exportar_tancagem("RJ", "PETROPOLIS")
