const Scan = (() => {
  let nfcReader = null;

  const SVG_SIGNAL = `
    <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round">
      <circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none"/>
      <path d="M8 12a4 4 0 0 1 8 0"/>
      <path d="M4.5 12a7.5 7.5 0 0 1 15 0"/>
    </svg>`;

  function render() {
    document.getElementById('view').innerHTML = `
      <div id="scan-view">
        <div id="scan-zone">
          <div id="scan-ring" class="scan-ring">
            <div class="scan-inner" id="scan-icon-wrap">${SVG_SIGNAL}</div>
          </div>
          <p id="scan-label" class="scan-label">Acercar tarjeta NFC</p>
          <p id="scan-sub"   class="scan-sub">Chrome en Android con NFC activo</p>
        </div>

        <div id="scan-result" class="scan-result hidden"></div>

        <div id="scan-list-wrap">
          <div class="section-mini-header">Movimientos de hoy</div>
          <div id="scan-list"><div class="spinner"></div></div>
        </div>
      </div>
    `;
    _injectStyles();
    _startNFC();
    _loadUltimos();
  }

  async function _startNFC() {
    if (!('NDEFReader' in window)) {
      _setStatus('NFC no disponible', 'Usa Chrome en Android con NFC activo', true);
      return;
    }
    try {
      nfcReader = new NDEFReader();
      await nfcReader.scan();
      nfcReader.onreading      = (e) => _processScan(e.serialNumber || _extractUID(e.message));
      nfcReader.onreadingerror = ()  => App.toast('Error al leer la tarjeta', 'error');
    } catch (e) {
      _setStatus(
        e.name === 'NotAllowedError' ? 'Permiso denegado' : 'NFC no disponible',
        e.name === 'NotAllowedError' ? 'Permite el acceso NFC en el navegador' : e.message,
        true
      );
    }
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
    if (!uid) return;
    const ring = document.getElementById('scan-ring');
    ring?.classList.add('pulse');
    try {
      const data = await App.apiJSON('/api/scan', { method: 'POST', body: { nfc_uid: uid } });
      _showResult(data);
      setTimeout(_loadUltimos, 300);
    } catch (e) {
      App.toast(e.message, 'error');
    } finally {
      setTimeout(() => ring?.classList.remove('pulse'), 600);
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

  function _setStatus(label, sub, warn) {
    document.getElementById('scan-label').textContent = label;
    document.getElementById('scan-sub').textContent   = sub;
    if (warn) {
      const ring = document.getElementById('scan-ring');
      if (ring) ring.style.borderColor = 'var(--border2)';
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
        transition:border-color 0.3s;
      }
      .scan-ring::before {
        content:'';
        position:absolute; inset:-10px;
        border-radius:50%;
        border:1px solid var(--border);
      }
      .scan-ring.pulse { border-color: var(--accent); animation: ring-pulse 0.5s ease; }
      @keyframes ring-pulse {
        0%   { box-shadow: 0 0 0 0   rgba(13,47,90,0.2); }
        100% { box-shadow: 0 0 0 18px rgba(13,47,90,0); }
      }

      .scan-inner {
        width:96px; height:96px;
        border-radius:50%;
        background:var(--surface);
        border:1px solid var(--border);
        display:flex; align-items:center; justify-content:center;
        color: var(--accent);
      }

      .scan-label { font-size:16px; font-weight:600; color:var(--text); }
      .scan-sub   { font-size:12px; color:var(--text-muted); text-align:center; }

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
