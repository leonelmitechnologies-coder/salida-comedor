const { Router } = require('express');
const db = require('../db');
const router = Router();

router.get('/', (_req, res) => {
  const rows = db.prepare('SELECT * FROM colaboradores ORDER BY nombre').all();
  res.json(rows);
});

router.post('/', (req, res) => {
  const { nombre, num_empleado, departamento, nfc_uid } = req.body;
  if (!nombre || !num_empleado || !departamento || !nfc_uid) {
    return res.status(400).json({ error: 'Todos los campos son requeridos' });
  }
  const deptos = ['Incoming','Sorting','FFT Lineas','FFT Paletizado','Shipping'];
  if (!deptos.includes(departamento)) {
    return res.status(400).json({ error: 'Departamento inválido' });
  }
  try {
    const result = db.prepare(
      'INSERT INTO colaboradores (nombre, num_empleado, departamento, nfc_uid) VALUES (?, ?, ?, ?)'
    ).run(nombre.trim(), num_empleado.trim(), departamento, nfc_uid.trim());
    const nuevo = db.prepare('SELECT * FROM colaboradores WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(nuevo);
  } catch (e) {
    if (e.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'El tag NFC ya está registrado a otro colaborador' });
    }
    throw e;
  }
});

router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const col = db.prepare('SELECT id FROM colaboradores WHERE id = ?').get(id);
  if (!col) return res.status(404).json({ error: 'Colaborador no encontrado' });
  db.prepare('DELETE FROM colaboradores WHERE id = ?').run(id);
  res.json({ ok: true });
});

module.exports = router;
