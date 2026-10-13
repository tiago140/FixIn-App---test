// Reduz a foto no próprio navegador (lado maior 1600px, JPEG): envio rápido e economia de dados do celular.
export async function reduzirImagem(arquivo, maxLado = 1600, qualidade = 0.82) {
  const bmp = await createImageBitmap(arquivo);
  const escala = Math.min(1, maxLado / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bmp.width * escala));
  canvas.height = Math.max(1, Math.round(bmp.height * escala));
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', qualidade));
  if (!blob) throw new Error('falha ao reduzir');
  return blob;
}

// Envia várias fotos, uma por vez. Devolve { enviadas, erro }.
export async function enviarFotos(url, arquivos, camposExtras = {}, aoProgredir = () => {}) {
  let enviadas = 0;
  for (let i = 0; i < arquivos.length; i++) {
    aoProgredir(i + 1, arquivos.length);
    let blob;
    try { blob = await reduzirImagem(arquivos[i]); } catch (e) { return { enviadas, erro: 'Não consegui ler uma das fotos. Tente de novo.' }; }
    const fd = new FormData();
    fd.append('arquivo', blob, `foto-${Date.now()}-${i}.jpg`);
    Object.entries(camposExtras).forEach(([k, v]) => fd.append(k, v));
    let res;
    try { res = await fetch(url, { method: 'POST', body: fd }); } catch (e) { return { enviadas, erro: 'Sem conexão. Confira a internet e tente de novo.' }; }
    if (!res.ok) { const d = await res.json().catch(() => ({})); return { enviadas, erro: d.error || 'Não foi possível enviar a foto.' }; }
    enviadas++;
  }
  return { enviadas, erro: null };
}
