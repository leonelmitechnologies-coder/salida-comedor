const Historial = (() => {
  const DEPTOS = ['Todos','Incoming','Sorting','FFT Lineas','FFT Paletizado','Shipping'];
  let _fecha   = App.fechaHoy();
  let _depto   = 'Todos';
  let _datos   = [];

  const SVG_EDIT = `
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/>
    </svg>`;

  function render() {
    document.getElementById('view').innerHTML = `
      <div id="hist-view">
        <div class="section-header" style="padding-bottom:0;border-bottom:none">
          <div class="date-nav">
            <button class="date-btn" onclick="Historial.prevDay()">&#8249;</button>
            <span id="date-label" class="date-label">${App.formatFechaDisplay(_fecha)}</span>
            <button class="date-btn" id="next-btn" onclick="Historial.nextDay()">&#8250;</button>
          </div>
        </div>

        <div class="chips" id="depto-chips">
          ${DEPTOS.map(d => `<button class="chip ${d===_depto?'active':''}" onclick="Historial.setDepto('${d}')">${d}</button>`).join('')}
        </div>

        <div id="hist-summary" class="hist-summary"></div>
        <div id="hist-list"><div class="spinner"></div></div>

        <div style="padding:16px 20px 28px">
          <button class="btn btn-ghost btn-full" onclick="Historial.exportar()">
            Exportar Excel
          </button>
        </div>
      </div>
    `;
    _injectStyles();
    _load();
  }

  async function _load() {
    const list    = document.getElementById('hist-list');
    const summary = document.getElementById('hist-summary');
    const nextBtn = document.getElementById('next-btn');
    if (nextBtn) nextBtn.disabled = _fecha >= App.fechaHoy();
    list.innerHTML = '<div class="spinner"></div>';

    try {
      const params = new URLSearchParams({ fecha: _fecha });
      if (_depto !== 'Todos') params.set('departamento', _depto);
      _datos = await App.apiJSON('/api/registros?' + params);

      const total  = _datos.length;
      const fuera  = _datos.filter(r => r.hora_salida && !r.hora_regreso).length;
      const regres = _datos.filter(r => r.hora_regreso).length;

      summary.innerHTML = `
        <div class="stat-box">
          <span class="stat-num">${total}</span>
          <span class="stat-lbl">Total</span>
        </div>
        <div class="stat-box">
          <span class="stat-num" style="color:var(--accent)">${fuera}</span>
          <span class="stat-lbl">En comedor</span>
        </div>
        <div class="stat-box">
          <span class="stat-num" style="color:var(--green)">${regres}</span>
          <span class="stat-lbl">Regresaron</span>
        </div>
      `;

      if (!_datos.length) {
        list.innerHTML = `<div class="empty"><div class="empty-icon">—</div><p>Sin registros este día</p></div>`;
        return;
      }

      list.innerHTML = _datos.map((r, i) => {
        const dur   = App.calcDuracion(r.hora_salida, r.hora_regreso);
        const badge = !r.hora_regreso
          ? `<span class="badge badge-out">En comedor</span>`
          : `<span class="badge badge-back">Regresó</span>`;

        const editS = !r.editado_salida  && r.hora_salida
          ? `<button class="edit-btn" title="Editar hora de salida" onclick="Historial.editarHora(${i},'hora_salida')">${SVG_EDIT}</button>`
          : (r.editado_salida ? `<span class="edited-mark">editado</span>` : '');

        const editR = !r.editado_regreso && r.hora_regreso
          ? `<button class="edit-btn" title="Editar hora de regreso" onclick="Historial.editarHora(${i},'hora_regreso')">${SVG_EDIT}</button>`
          : (r.editado_regreso ? `<span class="edited-mark">editado</span>` : '');

        return `
          <div class="list-row" style="align-items:flex-start;gap:12px">
            <div class="avatar">${r.nombre.charAt(0)}</div>
            <div style="flex:1;min-width:0">
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                <span style="font-size:14px;font-weight:600;color:var(--text)">${r.nombre}</span>
                ${badge}
              </div>
              <div style="font-size:12px;color:var(--text-muted);margin-top:2px">${r.departamento} &middot; #${r.num_empleado}</div>
              <div style="display:flex;gap:16px;margin-top:7px;flex-wrap:wrap">
                <div class="time-cell">
                  <span class="time-lbl">Salida</span>
                  <span class="time-val">${App.formatHora(r.hora_salida)}</span>
                  ${editS}
                </div>
                <div class="time-cell">
                  <span class="time-lbl">Regreso</span>
                  <span class="time-val">${App.formatHora(r.hora_regreso)}</span>
                  ${editR}
                </div>
                ${dur != null ? `<div class="time-cell"><span class="time-lbl">Duración</span><span class="time-val">${dur} min</span></div>` : ''}
              </div>
            </div>
          </div>`;
      }).join('');
    } catch (e) {
      list.innerHTML = `<div class="empty"><p style="color:var(--red)">${e.message}</p></div>`;
    }
  }

  function editarHora(idx, campo) {
    const r = _datos[idx];
    const actual = App.formatHora(r[campo]);
    App.openModal(`
      <div class="modal-title">Editar hora &mdash; ${campo === 'hora_salida' ? 'Salida' : 'Regreso'}</div>
      <p style="font-size:13px;color:var(--text-muted);margin-bottom:16px">
        ${r.nombre}. Solo se puede editar una vez por campo.
      </p>
      <div class="input-group">
        <label class="input-label">Nueva hora</label>
        <input id="edit-hora-input" type="time" value="${actual !== '—' ? actual : ''}">
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost" style="flex:1" onclick="App.closeModal()">Cancelar</button>
        <button class="btn btn-primary" style="flex:1" onclick="Historial._confirmarEdicion(${r.id},'${campo}')">Guardar</button>
      </div>
    `);
  }

  async function _confirmarEdicion(id, campo) {
    const val = document.getElementById('edit-hora-input')?.value;
    if (!val) { App.toast('Ingresa una hora válida', 'error'); return; }
    try {
      await App.apiJSON(`/api/registros/${id}`, { method:'PUT', body:{ campo, valor:val } });
      App.closeModal();
      App.toast('Hora actualizada', 'scan-back');
      _load();
    } catch (e) {
      App.toast(e.message, 'error');
    }
  }

  function prevDay() {
    const d = new Date(_fecha + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    _fecha = d.toISOString().slice(0, 10);
    _updateDateLabel();
    _load();
  }

  function nextDay() {
    if (_fecha >= App.fechaHoy()) return;
    const d = new Date(_fecha + 'T00:00:00');
    d.setDate(d.getDate() + 1);
    _fecha = d.toISOString().slice(0, 10);
    _updateDateLabel();
    _load();
  }

  function _updateDateLabel() {
    const el = document.getElementById('date-label');
    if (el) el.textContent = App.formatFechaDisplay(_fecha);
    const nb = document.getElementById('next-btn');
    if (nb) nb.disabled = _fecha >= App.fechaHoy();
  }

  function setDepto(d) {
    _depto = d;
    document.querySelectorAll('#depto-chips .chip').forEach(c => c.classList.toggle('active', c.textContent === d));
    _load();
  }

  function exportar() {
    const params = new URLSearchParams({ fecha: _fecha });
    if (_depto !== 'Todos') params.set('departamento', _depto);
    const a = document.createElement('a');
    a.href = `/api/export?${params}`;
    a.click();
  }

  function _injectStyles() {
    if (document.getElementById('hist-styles')) return;
    const s = document.createElement('style');
    s.id = 'hist-styles';
    s.textContent = `
      #hist-view { display:flex; flex-direction:column; min-height:calc(100dvh - 60px); }

      .date-nav {
        display:flex; align-items:center; justify-content:space-between;
        padding:10px 4px 14px;
      }
      .date-btn {
        background:none; border:1px solid var(--border); border-radius:6px;
        color:var(--accent); font-size:22px; cursor:pointer;
        padding:2px 12px; line-height:1.4;
        -webkit-tap-highlight-color:transparent;
        transition:background 0.1s;
      }
      .date-btn:active   { background:var(--surface); }
      .date-btn:disabled { color:var(--text-dim); border-color:var(--border); cursor:default; }
      .date-label        { font-size:15px; font-weight:600; color:var(--text); }

      .hist-summary {
        display:flex;
        border-bottom:1px solid var(--border);
        flex-shrink:0;
      }
      .stat-box {
        flex:1; display:flex; flex-direction:column; align-items:center;
        padding:12px 0; gap:2px;
        border-right:1px solid var(--border);
      }
      .stat-box:last-child { border-right:none; }
      .stat-num { font-size:22px; font-weight:700; color:var(--text); }
      .stat-lbl { font-size:10px; color:var(--text-dim); text-transform:uppercase; letter-spacing:0.4px; font-weight:600; }

      .time-cell  { display:flex; align-items:center; gap:5px; }
      .time-lbl   { font-size:11px; color:var(--text-dim); font-weight:600; text-transform:uppercase; letter-spacing:0.3px; }
      .time-val   { font-size:13px; color:var(--text-muted); font-weight:500; font-variant-numeric:tabular-nums; }
      .edit-btn   {
        background:none; border:none; cursor:pointer;
        color:var(--accent-md); padding:0 2px;
        display:inline-flex; align-items:center;
        opacity:0.6; transition:opacity 0.1s;
        -webkit-tap-highlight-color:transparent;
      }
      .edit-btn:active  { opacity:1; }
      .edited-mark      { font-size:10px; color:var(--text-dim); font-style:italic; }
      #hist-list        { flex:1; }
    `;
    document.head.appendChild(s);
  }

  return { render, prevDay, nextDay, setDepto, editarHora, _confirmarEdicion, exportar };
})();
