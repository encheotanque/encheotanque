import fetch from 'node-fetch';

async function run() {
  const url = "https://consultadfe.fazenda.rj.gov.br/consultaNFCe/QRCode?p=33260303481706000100650660003803211744023048|2|1|2|5AC4318706949A1A611432112735F0464714FD05";
  const res = await fetch(url.replace(/^\uFEFF/, ''));
  const html = await res.text();
  console.log(html.substring(0, 1500));
}

run();
