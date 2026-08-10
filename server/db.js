const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS colaboradores (
      id            SERIAL PRIMARY KEY,
      nombre        TEXT NOT NULL,
      num_empleado  TEXT NOT NULL,
      departamento  TEXT NOT NULL,
      nfc_uid       TEXT NOT NULL UNIQUE,
      creado_en     TEXT NOT NULL DEFAULT TO_CHAR(NOW() AT TIME ZONE 'America/Mexico_City', 'YYYY-MM-DD HH24:MI:SS')
    );

    CREATE TABLE IF NOT EXISTS registros (
      id               SERIAL PRIMARY KEY,
      colaborador_id   INTEGER NOT NULL REFERENCES colaboradores(id) ON DELETE CASCADE,
      fecha            TEXT NOT NULL,
      hora_salida      TEXT,
      hora_regreso     TEXT,
      editado_salida   INTEGER NOT NULL DEFAULT 0,
      editado_regreso  INTEGER NOT NULL DEFAULT 0,
      UNIQUE(colaborador_id, fecha)
    );
  `);
}

module.exports = { pool, initDB };
