const { Router } = require('express');
const { pool } = require('../db');
const router = Router();

const DEPTOS = ['Incoming','Sorting','FFT Lineas','FFT Paletizado','Shipping'];

router.get('/', async (_req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM colaboradores ORDER BY nombre');
    res.json(rows);
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  const { nombre, num_empleado, departamento, nfc_uid } = req.body;
  if (!nombre || !num_empleado || !departamento || !nfc_uid)
    return res.status(400).json({ error: 'Todos los campos son requeridos' });
  if (!DEPTOS.includes(departamento))
    return res.status(400).json({ error: 'Departamento inválido' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO colaboradores (nombre, num_empleado, departamento, nfc_uid)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [nombre.trim(), num_empleado.trim(), departamento, nfc_uid.trim()]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'El tag NFC ya está registrado a otro colaborador' });
    next(e);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM colaboradores WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Colaborador no encontrado' });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
