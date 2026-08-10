const { Router } = require('express');
const ExcelJS = require('exceljs');
const db = require('../db');
const router = Router();

router.get('/', async (req, res) => {
  const { fecha, departamento } = req.query;
  if (!fecha) return res.status(400).json({ error: 'fecha requerida' });

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

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Asistencia Comedor');

  ws.columns = [
    { header: 'Nombre',          key: 'nombre',        width: 28 },
    { header: '# Empleado',      key: 'num_empleado',  width: 14 },
    { header: 'Departamento',    key: 'departamento',  width: 18 },
    { header: 'Fecha',           key: 'fecha',         width: 12 },
    { header: 'Hora Salida',     key: 'hora_salida',   width: 14 },
    { header: 'Hora Regreso',    key: 'hora_regreso',  width: 14 },
    { header: 'Duración (min)',  key: 'duracion',      width: 16 },
  ];

  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = {
    type: 'pattern', pattern: 'solid',
    fgColor: { argb: 'FF0A1828' }
  };
  ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

  for (const r of rows) {
    let duracion = '';
    if (r.hora_salida && r.hora_regreso) {
      const toSec = t => t.split(':').reduce((a, v, i) => a + Number(v) * [3600, 60, 1][i], 0);
      duracion = Math.round((toSec(r.hora_regreso) - toSec(r.hora_salida)) / 60);
    }
    ws.addRow({
      nombre: r.nombre,
      num_empleado: r.num_empleado,
      departamento: r.departamento,
      fecha: r.fecha,
      hora_salida: r.hora_salida || '—',
      hora_regreso: r.hora_regreso || '—',
      duracion,
    });
  }

  const deptoLabel = (departamento && departamento !== 'Todos') ? `_${departamento.replace(/\s/g,'_')}` : '';
  const filename = `comedor_${fecha}${deptoLabel}.xlsx`;

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  await wb.xlsx.write(res);
  res.end();
});

module.exports = router;
