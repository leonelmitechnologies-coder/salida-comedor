require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const { initDB } = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth',          require('./routes/auth'));
app.use('/api/colaboradores', require('./routes/colaboradores'));
app.use('/api/scan',          require('./routes/scan'));
app.use('/api/registros',     require('./routes/registros'));
app.use('/api/export',        require('./routes/export'));

app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

initDB()
  .then(() => {
    if (require.main === module) {
      const PORT = process.env.PORT || 3000;
      app.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`));
    }
  })
  .catch(err => { console.error('Error iniciando DB:', err); process.exit(1); });

module.exports = app;
