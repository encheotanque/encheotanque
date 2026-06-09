const { chromium } = require('playwright');

async function testApexBehavior() {
  const browser = await chromium.launch({headless: true});
  const page = await browser.newPage();
  
  page.on('dialog', dialog => {
    console.log("DIALOG TRIGGERED:", dialog.message());
    dialog.accept();
  });
  
  await page.goto('https://cdp.anp.gov.br/ords/r/cdp_apex/consulta-dados-publicos-cdp/consulta-de-postos-lista');
  await page.waitForLoadState('networkidle');
  
  console.log("Setting State parameters directly in Oracle APEX format...");
  // Try directly using apex item syntax to pass correctly hidden values
  await page.evaluate(() => {
    window.apex.item('P7_ESTADO').setValue('RJ', 'RIO DE JANEIRO');
    window.apex.item('P7_LOCALIDADE').setValue('PETROPOLIS', 'PETROPOLIS');
  });
  
  const estadoHidden = await page.$eval('#P7_ESTADO_HIDDENVALUE', el => el.value);
  const locHidden = await page.$eval('#P7_LOCALIDADE_HIDDENVALUE', el => el.value);
  
  console.log("Hidden State:", estadoHidden);
  console.log("Hidden City:", locHidden);
  
  await browser.close();
}
testApexBehavior();
