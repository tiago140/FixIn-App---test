'use client';
// Sinal sonoro dos avisos (feito no próprio navegador, sem arquivo de áudio).
// Navegadores só liberam som depois de o usuário clicar/tocar na página uma vez; por isso o "destravar" abaixo.
let ctx = null;

function contexto() {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { ctx = new AC(); } catch (e) { return null; }
  }
  return ctx;
}

export function destravarSom() {
  if (typeof window === 'undefined') return;
  const liberar = () => {
    const c = contexto();
    if (c && c.state === 'suspended') c.resume().catch(() => {});
  };
  ['pointerdown', 'keydown', 'touchstart'].forEach((ev) => window.addEventListener(ev, liberar, { once: true, passive: true }));
}

export function somLigado() {
  try { return localStorage.getItem('fixin_som_avisos') !== '0'; } catch (e) { return true; }
}

export function definirSom(ligado) {
  try { localStorage.setItem('fixin_som_avisos', ligado ? '1' : '0'); } catch (e) {}
}

// "ding-dong" curto e discreto
export function tocarSomAviso() {
  if (!somLigado()) return;
  const c = contexto();
  if (!c || c.state !== 'running') return;
  const agora = c.currentTime;
  [[880, 0], [1175, 0.16]].forEach(([freq, atraso]) => {
    const osc = c.createOscillator();
    const ganho = c.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    ganho.gain.setValueAtTime(0.0001, agora + atraso);
    ganho.gain.exponentialRampToValueAtTime(0.25, agora + atraso + 0.02);
    ganho.gain.exponentialRampToValueAtTime(0.0001, agora + atraso + 0.45);
    osc.connect(ganho).connect(c.destination);
    osc.start(agora + atraso);
    osc.stop(agora + atraso + 0.5);
  });
}
