const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DB_PATH || './data/comedor.db';
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new DatabaseSync(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS colaboradores (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre        TEXT NOT NULL,
    num_empleado  TEXT NOT NULL,
    departamento  TEXT NOT NULL,
    nfc_uid       TEXT NOT NULL UNIQUE,
    creado_en     TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS registros (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    colaborador_id   INTEGER NOT NULL REFERENCES colaboradores(id) ON DELETE CASCADE,
    fecha            TEXT NOT NULL,
    hora_salida      TEXT,
    hora_regreso     TEXT,
    editado_salida   INTEGER NOT NULL DEFAULT 0,
    editado_regreso  INTEGER NOT NULL DEFAULT 0,
    UNIQUE(colaborador_id, fecha)
  );
`);

module.exports = db;
