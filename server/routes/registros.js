const { Router } = require('express');
const { pool } = require('../db');
const router = Router();

router.get('/', async (req, res, next) => {
  const { fecha, departamento } = req.query;
  if (!fecha) return res.status(400).json({ error: 'fecha requerida (YYYY-MM-DD)' });

  try {
    let query = `
      SELECT r.*, c.nombre, c.num_empleado, c.departamento
      FROM registros r
      JOIN colaboradores c ON c.id = r.colaborador_id
      WHERE r.fecha = $1
    `;
    const params = [fecha];

    if (departamento && departamento !== 'Todos') {
      params.push(departamento);
      query += ` AND c.departamento = $${params.length}`;
    }
    query += ' ORDER BY COALESCE(r.hora_salida, r.hora_regreso) ASC';

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (e) { next(e); }
});

router.put('/:id', async (req, res, next) => {
  const { campo, valor } = req.body;
  if (!['hora_salida', 'hora_regreso'].includes(campo))
    return res.status(400).json({ error: 'campo inválido' });
  if (!valor || !/^\d{2}:\d{2}(:\d{2})?$/.test(valor))
    return res.status(400).json({ error: 'formato de hora inválido (HH:MM o HH:MM:SS)' });

  try {
    const { rows } = await pool.query('SELECT * FROM registros WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Registro no encontrado' });
    const registro = rows[0];

    const flagCol = campo === 'hora_salida' ? 'editado_salida' : 'editado_regreso';
    if (Number(registro[flagCol]) === 1)
      return res.status(409).json({ error: 'Este campo ya fue editado una vez y no puede modificarse de nuevo' });

    const hora = valor.length === 5 ? valor + ':00' : valor;
    const { rows: updated } = await pool.query(
      `UPDATE registros SET ${campo} = $1, ${flagCol} = 1 WHERE id = $2 RETURNING *`,
      [hora, req.params.id]
    );
    res.json(updated[0]);
  } catch (e) { next(e); }
});

module.exports = router;
