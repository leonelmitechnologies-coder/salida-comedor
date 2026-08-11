const Personal = (() => {
  const DEPTOS  = ['Incoming','Sorting','FFT Lineas','FFT Paletizado','Shipping'];
  let _unlocked = false;
  let _pin      = '';
  let _nfcCapture = null;

  const SVG_LOCK = `
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
      <rect x="3" y="11" width="18" height="11" rx="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>`;

  const SVG_NFC = `
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
      <circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none"/>
      <path d="M8 12a4 4 0 0 1 8 0"/>
      <path d="M4.5 12a7.5 7.5 0 0 1 15 0"/>
    </svg>`;

  const SVG_CHECK = `
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>`;

  function render() {
    document.getElementById('view').innerHTML = _unlocked ? _renderPanel() : _renderPin();
    _injectStyles();
    if (_unlocked) setTimeout(_loadColaboradores, 50);
  }

  /* ── PIN ────────────────────────────────────── */
  function _renderPin() {
    return `
      <div id="pin-view">
        <div id="pin-header">
          <div class="pin-lock-icon" style="color:var(--accent)">${SVG_LOCK}</div>
          <h2>Acceso restringido</h2>
          <p>Ingresa el PIN de administrador</p>
        </div>
        <div id="pin-dots">
          <span class="dot" id="dot0"></span>
          <span class="dot" id="dot1"></span>
          <span class="dot" id="dot2"></span>
          <span class="dot" id="dot3"></span>
        </div>
        <div id="pin-error" class="hidden" style="color:var(--red);font-size:13px;text-align:center;height:18px"></div>
        <div id="numpad">
          ${[1,2,3,4,5,6,7,8,9,'','0','<'].map(k => `
            <button class="numpad-btn ${k===''?'numpad-empty':''}" onclick="Personal._numpad('${k}')">${k === '<' ? '&larr;' : k}</button>
          `).join('')}
        </div>
      </div>`;
  }

  function _numpad(key) {
    if (key === '<') {
      _pin = _pin.slice(0, -1);
    } else if (key !== '' && _pin.length < 4) {
      _pin += key;
    }
    _updateDots();
    if (_pin.length === 4) setTimeout(_checkPin, 120);
  }

  function _updateDots() {
    for (let i = 0; i < 4; i++) {
      document.getElementById(`dot${i}`)?.classList.toggle('filled', i < _pin.length);
    }
  }

  async function _checkPin() {
    try {
      await App.apiJSON('/api/auth/pin', { method:'POST', body:{ pin:_pin } });
      _unlocked = true;
      render();
    } catch (_) {
      const err = document.getElementById('pin-error');
      if (err) { err.textContent = 'PIN incorrecto'; err.classList.remove('hidden'); }
      document.getElementById('pin-dots')?.classList.add('shake');
      setTimeout(() => {
        _pin = '';
        _updateDots();
        document.getElementById('pin-dots')?.classList.remove('shake');
        document.getElementById('pin-error')?.classList.add('hidden');
      }, 700);
    }
  }

  /* ── Panel ──────────────────────────────────── */
  function _renderPanel() {
    return `
      <div id="personal-view">
        <div class="section-header" style="display:flex;align-items:center;justify-content:space-between">
          <div>
            <h2>Personal</h2>
            <p>Colaboradores registrados</p>
          </div>
          <button class="btn btn-primary" style="font-size:13px;padding:8px 16px" onclick="Personal.mostrarAgregar()">+ Agregar</button>
        </div>
        <div id="personal-list"><div class="spinner"></div></div>
      </div>`;
  }

  async function _loadColaboradores() {
    const list = document.getElementById('personal-list');
    if (!list) return;
    try {
      const cols = await App.apiJSON('/api/colaboradores');
      if (!cols.length) {
        list.innerHTML = `<div class="empty"><p>Sin colaboradores registrados</p></div>`;
        return;
      }
      list.innerHTML = cols.map(c => `
        <div class="list-row" style="gap:12px">
          <div class="avatar">${c.nombre.charAt(0)}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:14px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${c.nombre}</div>
            <div style="font-size:12px;color:var(--text-muted)">#${c.num_empleado} &middot; ${c.departamento}</div>
            <div style="font-size:11px;color:var(--text-dim);margin-top:2px;font-family:monospace">${c.nfc_uid}</div>
          </div>
          <button class="btn btn-danger" style="font-size:12px;padding:7px 12px;flex-shrink:0"
            onclick="Personal.eliminar(${c.id},'${c.nombre.replace(/'/g,"\\'")}')">Eliminar</button>
        </div>`).join('');
    } catch (e) {
      list.innerHTML = `<div class="empty"><p style="color:var(--red)">${e.message}</p></div>`;
    }
  }

  function mostrarAgregar() {
    App.openModal(`
      <div class="modal-title">Agregar colaborador</div>
      <div class="form-stack">
        <div class="input-group">
          <label class="input-label">Nombre completo</label>
          <input id="f-nombre" type="text" placeholder="Ej. Juan Sánchez" autocomplete="off">
        </div>
        <div class="input-group">
          <label class="input-label">Número de empleado</label>
          <input id="f-num" type="text" placeholder="Ej. EMP-0042" autocomplete="off">
        </div>
        <div class="input-group">
          <label class="input-label">Departamento</label>
          <select id="f-depto">
            <option value="">— Seleccionar —</option>
            ${DEPTOS.map(d => `<option value="${d}">${d}</option>`).join('')}
          </select>
        </div>
        <div class="input-group">
          <label class="input-label">Tag NFC</label>
          <div id="nfc-capture-zone" class="nfc-zone" onclick="Personal._iniciarCapturaNFC()">
            <div id="nfc-zone-content" class="nfc-zone-content">
              <span id="nfc-zone-icon" style="color:var(--accent)">${SVG_NFC}</span>
              <span id="nfc-zone-label">Tocar para escanear tag</span>
            </div>
          </div>
          <input id="f-nfc" type="hidden">
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost" style="flex:1" onclick="Personal._cancelarAgregar()">Cancelar</button>
        <button class="btn btn-primary" style="flex:1" onclick="Personal._guardarColaborador()">Guardar</button>
      </div>
    `);
  }

  async function _iniciarCapturaNFC() {
    if (!('NDEFReader' in window)) {
      document.getElementById('nfc-zone-label').textContent = 'NFC no disponible en este dispositivo';
      return;
    }
    const label = document.getElementById('nfc-zone-label');
    const icon  = document.getElementById('nfc-zone-icon');
    if (label) label.textContent = 'Acercando tag NFC...';

    try {
      _nfcCapture = new NDEFReader();
      await _nfcCapture.scan();
      _nfcCapture.onreading = (e) => {
        const uid = e.serialNumber || '';
        document.getElementById('f-nfc').value = uid;
        if (icon)  icon.innerHTML = `<span style="color:var(--green)">${SVG_CHECK}</span>`;
        if (label) label.textContent = uid || 'Tag capturado';
        const zone = document.getElementById('nfc-capture-zone');
        if (zone) zone.style.borderColor = 'var(--green)';
        _nfcCapture = null;
      };
      _nfcCapture.onreadingerror = () => {
        if (label) label.textContent = 'Error al leer. Intenta de nuevo.';
      };
    } catch (e) {
      if (label) label.textContent = e.name === 'NotAllowedError' ? 'Permiso NFC denegado' : e.message;
    }
  }

  function _cancelarAgregar() {
    try { _nfcCapture?.stop?.(); } catch(_) {}
    _nfcCapture = null;
    App.closeModal();
  }

  async function _guardarColaborador() {
    const nombre       = document.getElementById('f-nombre')?.value.trim();
    const num_empleado = document.getElementById('f-num')?.value.trim();
    const departamento = document.getElementById('f-depto')?.value;
    const nfc_uid      = document.getElementById('f-nfc')?.value.trim();

    if (!nombre)       { App.toast('Ingresa el nombre',             'error'); return; }
    if (!num_empleado) { App.toast('Ingresa el número de empleado', 'error'); return; }
    if (!departamento) { App.toast('Selecciona el departamento',    'error'); return; }
    if (!nfc_uid)      { App.toast('Escanea la tarjeta NFC',        'error'); return; }

    try {
      await App.apiJSON('/api/colaboradores', { method:'POST', body:{ nombre, num_empleado, departamento, nfc_uid } });
      App.closeModal();
      App.toast('Colaborador agregado', 'scan-back');
      _loadColaboradores();
    } catch (e) {
      App.toast(e.message, 'error');
    }
  }

  function eliminar(id, nombre) {
    App.openModal(`
      <div class="modal-title">Confirmar eliminación</div>
      <p style="font-size:14px;color:var(--text-muted);margin-bottom:20px">
        Se eliminará a <strong style="color:var(--text)">${nombre}</strong> y todos sus registros de asistencia.
        Esta acción no se puede deshacer.
      </p>
      <div class="modal-actions">
        <button class="btn btn-ghost"  style="flex:1" onclick="App.closeModal()">Cancelar</button>
        <button class="btn btn-danger" style="flex:1" onclick="Personal._confirmarEliminar(${id})">Eliminar</button>
      </div>
    `);
  }

  async function _confirmarEliminar(id) {
    try {
      await App.api(`/api/colaboradores/${id}`, { method:'DELETE' });
      App.closeModal();
      App.toast('Colaborador eliminado', 'info');
      _loadColaboradores();
    } catch (e) {
      App.toast(e.message, 'error');
    }
  }

  function _injectStyles() {
    if (document.getElementById('personal-styles')) return;
    const s = document.createElement('style');
    s.id = 'personal-styles';
    s.textContent = `
      #pin-view {
        display:flex; flex-direction:column; align-items:center; justify-content:center;
        min-height:calc(100dvh - 60px);
        padding:32px 24px; gap:28px;
      }
      #pin-header { text-align:center; display:flex; flex-direction:column; align-items:center; gap:10px; }
      .pin-lock-icon { width:52px; height:52px; background:var(--accent-lt); border-radius:50%; display:flex; align-items:center; justify-content:center; }
      #pin-header h2 { font-size:20px; font-weight:700; color:var(--text); }
      #pin-header p  { font-size:13px; color:var(--text-muted); }

      #pin-dots { display:flex; gap:18px; }
      .dot {
        width:13px; height:13px;
        border-radius:50%;
        border:1.5px solid var(--border2);
        background:none;
        transition:background 0.15s, border-color 0.15s;
      }
      .dot.filled { background:var(--accent); border-color:var(--accent); }

      @keyframes shake {
        0%,100%{transform:translateX(0)}
        20%,60%{transform:translateX(-7px)}
        40%,80%{transform:translateX(7px)}
      }
      .shake { animation:shake 0.45s ease; }

      #numpad {
        display:grid;
        grid-template-columns:repeat(3, 76px);
        gap:10px;
      }
      .numpad-btn {
        height:66px;
        background:var(--surface);
        border:1px solid var(--border);
        border-radius:var(--radius);
        color:var(--text);
        font-size:22px; font-weight:400;
        cursor:pointer;
        -webkit-tap-highlight-color:transparent;
        transition:background 0.1s;
      }
      .numpad-btn:active  { background:var(--surface2); }
      .numpad-empty       { background:none; border:none; pointer-events:none; }

      #personal-view { min-height:calc(100dvh - 60px); }

      .nfc-zone {
        border:1.5px dashed var(--border2);
        border-radius:var(--radius);
        padding:20px;
        display:flex; align-items:center; justify-content:center;
        cursor:pointer; transition:border-color 0.2s, background 0.15s;
        -webkit-tap-highlight-color:transparent;
      }
      .nfc-zone:active { background:var(--surface); }
      .nfc-zone-content { display:flex; flex-direction:column; align-items:center; gap:8px; }
      #nfc-zone-label   { font-size:13px; color:var(--text-muted); }
    `;
    document.head.appendChild(s);
  }

  return {
    render,
    _numpad, _checkPin,
    mostrarAgregar, _iniciarCapturaNFC, _cancelarAgregar, _guardarColaborador,
    eliminar, _confirmarEliminar
  };
})();
