const { Router } = require('express');
const db = require('../db');
const router = Router();

function horaActual() {
  const now = new Date();
  return now.toTimeString().slice(0, 8); // HH:MM:SS
}

function fechaActual() {
  const now = new Date();
  return now.toISOString().slice(0, 10); // YYYY-MM-DD
}

router.post('/', (req, res) => {
  const { nfc_uid } = req.body;
  if (!nfc_uid) return res.status(400).json({ error: 'nfc_uid requerido' });

  const colaborador = db.prepare('SELECT * FROM colaboradores WHERE nfc_uid = ?').get(nfc_uid.trim());
  if (!colaborador) {
    return res.status(404).json({ estado: 'desconocido', mensaje: 'Tag no registrado' });
  }

  const fecha = fechaActual();
  const hora = horaActual();

  let registro = db.prepare(
    'SELECT * FROM registros WHERE colaborador_id = ? AND fecha = ?'
  ).get(colaborador.id, fecha);

  if (!registro) {
    db.prepare(
      'INSERT INTO registros (colaborador_id, fecha, hora_salida) VALUES (?, ?, ?)'
    ).run(colaborador.id, fecha, hora);
    registro = db.prepare(
      'SELECT * FROM registros WHERE colaborador_id = ? AND fecha = ?'
    ).get(colaborador.id, fecha);
    return res.json({
      estado: 'salida',
      mensaje: 'Salida registrada',
      colaborador,
      registro
    });
  }

  if (registro.hora_salida && !registro.hora_regreso) {
    db.prepare(
      'UPDATE registros SET hora_regreso = ? WHERE id = ?'
    ).run(hora, registro.id);
    registro = db.prepare('SELECT * FROM registros WHERE id = ?').get(registro.id);
    const [h, m, s] = registro.hora_salida.split(':').map(Number);
    const [rh, rm, rs] = hora.split(':').map(Number);
    const durMin = Math.round(((rh * 3600 + rm * 60 + rs) - (h * 3600 + m * 60 + s)) / 60);
    return res.json({
      estado: 'regreso',
      mensaje: 'Regreso registrado',
      duracion_minutos: durMin,
      colaborador,
      registro
    });
  }

  return res.json({
    estado: 'completo',
    mensaje: 'Ciclo completo por hoy',
    colaborador,
    registro
  });
});

router.get('/ultimos', (_req, res) => {
  const fecha = fechaActual();
  const rows = db.prepare(`
    SELECT r.*, c.nombre, c.departamento
    FROM registros r
    JOIN colaboradores c ON c.id = r.colaborador_id
    WHERE r.fecha = ?
    ORDER BY COALESCE(r.hora_regreso, r.hora_salida) DESC
    LIMIT 5
  `).all(fecha);
  res.json(rows);
});

module.exports = router;
