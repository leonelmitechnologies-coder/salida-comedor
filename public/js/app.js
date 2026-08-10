const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? `http://${window.location.hostname}:3000`
  : '';   // mismo origen en producción Railway

const App = (() => {
  let _tab = 'scan';

  const TABS = {
    scan:     () => typeof Scan     !== 'undefined' && Scan.render(),
    historial:() => typeof Historial!== 'undefined' && Historial.render(),
    personal: () => typeof Personal !== 'undefined' && Personal.render(),
  };

  function setTab(name) {
    if (!TABS[name]) return;
    _tab = name;
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
    TABS[name]();
  }

  async function api(path, opts = {}) {
    const res = await fetch(API_BASE + path, {
      headers: { 'Content-Type': 'application/json' },
      ...opts,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Error de red' }));
      throw new Error(err.error || 'Error desconocido');
    }
    return res;
  }

  async function apiJSON(path, opts = {}) {
    const res = await api(path, opts);
    return res.json();
  }

  function toast(msg, type = 'info', duration = 3000) {
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.textContent = msg;
    document.getElementById('toast-container').appendChild(el);
    setTimeout(() => el.remove(), duration);
  }

  function openModal(html) {
    document.getElementById('modal-content').innerHTML = html;
    document.getElementById('modal-overlay').classList.remove('hidden');
  }

  function closeModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
    document.getElementById('modal-content').innerHTML = '';
  }

  function formatHora(t) {
    if (!t) return '—';
    return t.slice(0, 5);
  }

  function calcDuracion(salida, regreso) {
    if (!salida || !regreso) return null;
    const toSec = t => t.split(':').reduce((a, v, i) => a + Number(v) * [3600, 60, 1][i], 0);
    return Math.round((toSec(regreso) - toSec(salida)) / 60);
  }

  function fechaHoy() {
    return new Date().toISOString().slice(0, 10);
  }

  function formatFechaDisplay(iso) {
    const [y, m, d] = iso.split('-');
    const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
    const dias  = ['dom','lun','mar','mié','jue','vie','sáb'];
    const dt = new Date(y, m - 1, d);
    return `${dias[dt.getDay()]} ${d} ${meses[m - 1]} ${y}`;
  }

  document.addEventListener('DOMContentLoaded', () => setTab('scan'));

  return { setTab, api, apiJSON, toast, openModal, closeModal, formatHora, calcDuracion, fechaHoy, formatFechaDisplay };
})();
