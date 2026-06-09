import fs from 'fs';

async function fetchFromGov() {
  const url = "https://dados.gov.br/api/publico/conjuntos-dados/postos-revendedores-de-combustiveis";
  console.log("Fetching: " + url);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }});
    const text = await res.text();
    console.log("Status:", res.status);
    console.log(text.substring(0, 500));
  } catch(e) {
    console.log("Error:", e);
  }
}
fetchFromGov();
