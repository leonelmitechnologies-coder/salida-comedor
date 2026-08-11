const Scan = (() => {
  let abortController = null;
  let timeoutId       = null;
  let isScanning      = false;
  const NFC_AVAILABLE = 'NDEFReader' in window;

  const SVG_NFC = `
    <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
      <rect x="2" y="5" width="14" height="14" rx="2"/>
      <path d="M19 8a5 5 0 0 1 0 8"/>
      <path d="M22 5a9 9 0 0 1 0 14"/>
      <path d="M9 9v6l3-2"/>
    </svg>`;

  const SVG_SPIN = `
    <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round">
      <circle cx="12" cy="12" r="9" stroke-dasharray="30 56" stroke-dashoffset="0"/>
    </svg>`;

  function render() {
    document.getElementById('view').innerHTML = `
      <div id="scan-view">
        <div id="scan-zone">
          <button id="scan-btn" class="scan-ring ${NFC_AVAILABLE ? 'scan-idle' : 'scan-disabled'}" ${NFC_AVAILABLE ? '' : 'disabled'}>
            <div class="scan-inner" id="scan-icon-wrap">${SVG_NFC}</div>
          </button>
          <p id="scan-label" class="scan-label">${NFC_AVAILABLE ? 'Tocar para escanear' : 'NFC no disponible'}</p>
          <p id="scan-sub"   class="scan-sub">${NFC_AVAILABLE ? 'Presiona y acerca la tarjeta NFC' : 'Usa Chrome en Android con NFC activo'}</p>
          <button id="scan-cancel" class="scan-cancel hidden">Cancelar</button>
        </div>

        <div id="scan-result" class="scan-result hidden"></div>

        <div id="scan-list-wrap">
          <div class="section-mini-header">Movimientos de hoy</div>
          <div id="scan-list"><div class="spinner"></div></div>
        </div>
      </div>
    `;
    _injectStyles();

    document.getElementById('scan-btn').addEventListener('click', _onTap);
    document.getElementById('scan-cancel').addEventListener('click', _cancelScan);

    _loadUltimos();
  }

  async function _onTap() {
    if (isScanning) return;
    isScanning = true;
    _setReady();

    try {
      abortController = new AbortController();
      const reader = new NDEFReader();
      await reader.scan({ signal: abortController.signal });

      reader.onreading = (e) => {
        const uid = e.serialNumber || _extractUID(e.message);
        _stopScan();
        _processScan(uid);
      };

      reader.onreadingerror = () => {
        App.toast('Error al leer la tarjeta', 'error');
        _stopScan();
        _setIdle();
      };

      // Auto-cancel after 30 s
      timeoutId = setTimeout(() => {
        _stopScan();
        _setIdle();
        App.toast('Tiempo agotado. Toca de nuevo para escanear.', 'info');
      }, 30000);

    } catch (e) {
      isScanning = false;
      if (e.name === 'AbortError') { _setIdle(); return; }
      App.toast(
        e.name === 'NotAllowedError' ? 'Permite el acceso NFC en el navegador' : 'Error al iniciar NFC',
        'error'
      );
      _setIdle();
    }
  }

  function _cancelScan() {
    _stopScan();
    _setIdle();
  }

  function _stopScan() {
    clearTimeout(timeoutId);
    timeoutId = null;
    if (abortController) { abortController.abort(); abortController = null; }
    isScanning = false;
  }

  function _setIdle() {
    const btn    = document.getElementById('scan-btn');
    const label  = document.getElementById('scan-label');
    const sub    = document.getElementById('scan-sub');
    const cancel = document.getElementById('scan-cancel');
    const icon   = document.getElementById('scan-icon-wrap');
    if (!btn) return;
    btn.className    = 'scan-ring scan-idle';
    if (icon)   icon.innerHTML = SVG_NFC;
    if (label)  label.textContent = 'Tocar para escanear';
    if (sub)    sub.textContent   = 'Presiona y acerca la tarjeta NFC';
    if (cancel) cancel.classList.add('hidden');
  }

  function _setReady() {
    const btn    = document.getElementById('scan-btn');
    const label  = document.getElementById('scan-label');
    const sub    = document.getElementById('scan-sub');
    const cancel = document.getElementById('scan-cancel');
    const icon   = document.getElementById('scan-icon-wrap');
    if (!btn) return;
    btn.className    = 'scan-ring scan-active';
    if (icon)   icon.innerHTML = SVG_SPIN;
    if (label)  label.textContent = 'Acercar tarjeta NFC';
    if (sub)    sub.textContent   = 'Escaneo activo — toca para cancelar';
    if (cancel) cancel.classList.remove('hidden');
  }

  function _extractUID(msg) {
    for (const rec of msg.records) {
      if (rec.recordType === 'text') {
        return new TextDecoder(rec.encoding || 'utf-8').decode(rec.data);
      }
    }
    return null;
  }

  async function _processScan(uid) {
    if (!uid) { _setIdle(); return; }
    const btn = document.getElementById('scan-btn');
    btn?.classList.add('pulse');
    try {
      const data = await App.apiJSON('/api/scan', { method: 'POST', body: { nfc_uid: uid } });
      _showResult(data);
      setTimeout(_loadUltimos, 300);
    } catch (e) {
      App.toast(e.message, 'error');
    } finally {
      setTimeout(() => { btn?.classList.remove('pulse'); _setIdle(); }, 600);
    }
  }

  function _showResult(data) {
    const wrap = document.getElementById('scan-result');
    if (!wrap) return;

    let cls, indicator, name, sub;

    if (data.estado === 'salida') {
      cls       = 'result-out';
      indicator = 'SALIDA';
      name      = data.colaborador.nombre;
      sub       = `${App.formatHora(data.registro.hora_salida)} &mdash; ${data.colaborador.departamento}`;
    } else if (data.estado === 'regreso') {
      const dur = App.calcDuracion(data.registro.hora_salida, data.registro.hora_regreso);
      cls       = 'result-back';
      indicator = 'REGRESO';
      name      = data.colaborador.nombre;
      sub       = `${App.formatHora(data.registro.hora_regreso)}${dur != null ? ' &mdash; ' + dur + ' min' : ''}`;
    } else if (data.estado === 'completo') {
      cls       = 'result-done';
      indicator = 'COMPLETO';
      name      = data.colaborador.nombre;
      sub       = 'Ciclo registrado por hoy';
    } else {
      cls       = 'result-error';
      indicator = 'DESCONOCIDO';
      name      = 'Tag no registrado';
      sub       = 'Registra el colaborador en Personal';
    }

    wrap.className = `scan-result ${cls}`;
    wrap.innerHTML = `
      <div class="result-indicator">${indicator}</div>
      <div class="result-info">
        <strong>${name}</strong>
        <span>${sub}</span>
      </div>
    `;
    wrap.classList.remove('hidden');
    setTimeout(() => wrap.classList.add('hidden'), 4500);
  }

  async function _loadUltimos() {
    const list = document.getElementById('scan-list');
    if (!list) return;
    try {
      const rows = await App.apiJSON('/api/scan/ultimos');
      if (!rows.length) {
        list.innerHTML = '<div class="empty"><p>Sin movimientos hoy</p></div>';
        return;
      }
      list.innerHTML = rows.map(r => {
        const regreso = !!r.hora_regreso;
        const hora    = App.formatHora(regreso ? r.hora_regreso : r.hora_salida);
        const badge   = regreso
          ? `<span class="badge badge-back">Regresó</span>`
          : `<span class="badge badge-out">En comedor</span>`;
        return `
          <div class="list-row">
            <div class="avatar">${r.nombre.charAt(0)}</div>
            <div style="flex:1;min-width:0">
              <div style="font-size:14px;color:var(--text);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${r.nombre}</div>
              <div style="font-size:12px;color:var(--text-muted)">${r.departamento}</div>
            </div>
            ${badge}
            <div style="font-size:12px;color:var(--text-dim);flex-shrink:0;font-variant-numeric:tabular-nums">${hora}</div>
          </div>`;
      }).join('');
    } catch (_) {
      list.innerHTML = '<div class="empty"><p>Error cargando movimientos</p></div>';
    }
  }

  function _injectStyles() {
    if (document.getElementById('scan-styles')) return;
    const s = document.createElement('style');
    s.id = 'scan-styles';
    s.textContent = `
      #scan-view { display:flex; flex-direction:column; min-height:calc(100dvh - 60px); }

      #scan-zone {
        flex:0 0 auto;
        display:flex; flex-direction:column; align-items:center; justify-content:center;
        padding:44px 24px 28px;
        gap:14px;
      }

      .scan-ring {
        width:136px; height:136px;
        border-radius:50%;
        border:1.5px solid var(--border2);
        display:flex; align-items:center; justify-content:center;
        position:relative;
        cursor:pointer;
        background:transparent;
        transition:border-color 0.25s, transform 0.15s;
        -webkit-tap-highlight-color: transparent;
      }
      .scan-ring::before {
        content:'';
        position:absolute; inset:-10px;
        border-radius:50%;
        border:1px solid var(--border);
        transition: border-color 0.25s;
      }
      .scan-idle { border-color:var(--border2); }
      .scan-idle:active { transform:scale(0.95); }

      .scan-active {
        border-color:var(--accent);
        animation: ring-rotate 2s linear infinite;
      }
      .scan-active::before { border-color:var(--accent-md); opacity:0.3; }
      @keyframes ring-rotate {
        0%   { box-shadow: 0 0 0 0   rgba(13,47,90,0.15); }
        50%  { box-shadow: 0 0 0 12px rgba(13,47,90,0.06); }
        100% { box-shadow: 0 0 0 0   rgba(13,47,90,0); }
      }

      .scan-disabled { border-color:var(--border); cursor:not-allowed; opacity:0.5; }
      .scan-disabled::before { border-color:var(--border); }

      .scan-ring.pulse { animation: ring-pulse 0.5s ease forwards; }
      @keyframes ring-pulse {
        0%   { box-shadow: 0 0 0 0   rgba(13,47,90,0.25); }
        100% { box-shadow: 0 0 0 22px rgba(13,47,90,0); }
      }

      .scan-inner {
        width:96px; height:96px;
        border-radius:50%;
        background:var(--surface);
        border:1px solid var(--border);
        display:flex; align-items:center; justify-content:center;
        color: var(--accent);
        pointer-events:none;
      }
      .scan-active .scan-inner svg { animation: icon-spin 1.5s linear infinite; }
      @keyframes icon-spin { to { stroke-dashoffset: 86; } }

      .scan-label { font-size:16px; font-weight:600; color:var(--text); }
      .scan-sub   { font-size:12px; color:var(--text-muted); text-align:center; }

      .scan-cancel {
        margin-top:4px;
        padding:6px 20px;
        border:1px solid var(--border2);
        border-radius:20px;
        background:transparent;
        font-size:13px;
        color:var(--text-muted);
        cursor:pointer;
      }
      .scan-cancel.hidden { display:none; }

      .scan-result {
        margin:0 16px 16px;
        border-radius:var(--radius);
        padding:14px 16px;
        display:flex; align-items:center; gap:14px;
        border:1px solid var(--border);
        box-shadow: var(--shadow);
      }
      .scan-result.hidden { display:none; }
      .result-out   { background:var(--accent-lt); border-color:#c0cfdf; }
      .result-back  { background:var(--green-bg);  border-color:var(--green-bd); }
      .result-done  { background:var(--surface);   border-color:var(--border); }
      .result-error { background:var(--red-bg);    border-color:var(--red-bd); }

      .result-indicator {
        font-size:10px; font-weight:800; letter-spacing:1.2px;
        flex-shrink:0;
        padding:4px 8px;
        border-radius:4px;
        background:rgba(0,0,0,0.05);
        color:inherit;
        opacity:0.7;
      }
      .result-info { display:flex; flex-direction:column; gap:2px; }
      .result-info strong { font-size:15px; color:var(--text); font-weight:600; }
      .result-info span   { font-size:12px; color:var(--text-muted); }

      #scan-list-wrap { flex:1; display:flex; flex-direction:column; }
      .section-mini-header {
        padding:10px 20px 8px;
        font-size:11px; text-transform:uppercase; letter-spacing:0.6px;
        color:var(--text-dim); font-weight:600;
        border-top:1px solid var(--border);
      }
      #scan-list { flex:1; }
    `;
    document.head.appendChild(s);
  }

  return { render };
})();
