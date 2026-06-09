async function getANPData() {
  try {
    const res = await fetch("https://dados.gov.br/api/publico/conjuntos-dados/postos-revendedores-de-combustiveis-automotivos");
    const data = await res.json();
    for (const resource of data.resources || []) {
      if (resource.format.toLowerCase().includes('csv')) {
        console.log(`Title: ${resource.title}\nURL: ${resource.url}\n`);
      }
    }
  } catch(e) {
    console.error(e);
  }
}
getANPData();
