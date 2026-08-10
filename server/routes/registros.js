const { Router } = require('express');
const db = require('../db');
const router = Router();

router.get('/', (req, res) => {
  const { fecha, departamento } = req.query;
  if (!fecha) return res.status(400).json({ error: 'fecha requerida (YYYY-MM-DD)' });

  let query = `
    SELECT r.*, c.nombre, c.num_empleado, c.departamento
    FROM registros r
    JOIN colaboradores c ON c.id = r.colaborador_id
    WHERE r.fecha = ?
  `;
  const params = [fecha];

  if (departamento && departamento !== 'Todos') {
    query += ' AND c.departamento = ?';
    params.push(departamento);
  }
  query += ' ORDER BY COALESCE(r.hora_salida, r.hora_regreso) ASC';

  const rows = db.prepare(query).all(...params);
  res.json(rows);
});

router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { campo, valor } = req.body; // campo: 'hora_salida' | 'hora_regreso'

  if (!['hora_salida', 'hora_regreso'].includes(campo)) {
    return res.status(400).json({ error: 'campo inválido' });
  }
  if (!valor || !/^\d{2}:\d{2}(:\d{2})?$/.test(valor)) {
    return res.status(400).json({ error: 'formato de hora inválido (HH:MM o HH:MM:SS)' });
  }

  const registro = db.prepare('SELECT * FROM registros WHERE id = ?').get(id);
  if (!registro) return res.status(404).json({ error: 'Registro no encontrado' });

  const flagCol = campo === 'hora_salida' ? 'editado_salida' : 'editado_regreso';
  if (registro[flagCol] === 1) {
    return res.status(409).json({ error: 'Este campo ya fue editado una vez y no puede modificarse de nuevo' });
  }

  const hora = valor.length === 5 ? valor + ':00' : valor;
  db.prepare(`UPDATE registros SET ${campo} = ?, ${flagCol} = 1 WHERE id = ?`).run(hora, id);
  const actualizado = db.prepare('SELECT * FROM registros WHERE id = ?').get(id);
  res.json(actualizado);
});

module.exports = router;
