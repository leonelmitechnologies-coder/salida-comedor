const { Router } = require('express');
const { pool } = require('../db');
const router = Router();

function horaActual() {
  return new Date().toLocaleTimeString('es-MX', { hour12: false, timeZone: 'America/Mexico_City' });
}

function fechaActual() {
  return new Date().toLocaleDateString('es-MX', { timeZone: 'America/Mexico_City' })
    .split('/').reverse().map(p => p.padStart(2,'0')).join('-');
}

router.post('/', async (req, res, next) => {
  const { nfc_uid } = req.body;
  if (!nfc_uid) return res.status(400).json({ error: 'nfc_uid requerido' });

  try {
    const { rows: cols } = await pool.query('SELECT * FROM colaboradores WHERE nfc_uid = $1', [nfc_uid.trim()]);
    if (!cols.length) return res.status(404).json({ estado: 'desconocido', mensaje: 'Tag no registrado' });

    const colaborador = cols[0];
    const fecha = fechaActual();
    const hora  = horaActual();

    const { rows: regs } = await pool.query(
      'SELECT * FROM registros WHERE colaborador_id = $1 AND fecha = $2',
      [colaborador.id, fecha]
    );
    let registro = regs[0];

    if (!registro) {
      const { rows } = await pool.query(
        'INSERT INTO registros (colaborador_id, fecha, hora_salida) VALUES ($1, $2, $3) RETURNING *',
        [colaborador.id, fecha, hora]
      );
      registro = rows[0];
      return res.json({ estado: 'salida', mensaje: 'Salida registrada', colaborador, registro });
    }

    if (registro.hora_salida && !registro.hora_regreso) {
      const { rows } = await pool.query(
        'UPDATE registros SET hora_regreso = $1 WHERE id = $2 RETURNING *',
        [hora, registro.id]
      );
      registro = rows[0];
      const toSec = t => t.split(':').reduce((a, v, i) => a + Number(v) * [3600, 60, 1][i], 0);
      const duracion_minutos = Math.round((toSec(hora) - toSec(registro.hora_salida)) / 60);
      return res.json({ estado: 'regreso', mensaje: 'Regreso registrado', duracion_minutos, colaborador, registro });
    }

    res.json({ estado: 'completo', mensaje: 'Ciclo completo por hoy', colaborador, registro });
  } catch (e) { next(e); }
});

router.get('/ultimos', async (_req, res, next) => {
  try {
    const fecha = fechaActual();
    const { rows } = await pool.query(`
      SELECT r.*, c.nombre, c.departamento
      FROM registros r
      JOIN colaboradores c ON c.id = r.colaborador_id
      WHERE r.fecha = $1
      ORDER BY COALESCE(r.hora_regreso, r.hora_salida) DESC
      LIMIT 5
    `, [fecha]);
    res.json(rows);
  } catch (e) { next(e); }
});

module.exports = router;
