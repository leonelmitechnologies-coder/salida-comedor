# SalidaComedor — Diseño del Sistema

**Fecha:** 2026-08-10  
**Estado:** Aprobado

---

## Resumen

Sistema de control de asistencia al comedor mediante NFC. Los colaboradores acercan su tarjeta NFC para registrar salida y regreso. El personal de supervisión administra colaboradores desde un panel protegido por PIN. Los registros se consultan y exportan por fecha y departamento.

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | HTML + CSS + JS vanilla (mobile-first) |
| NFC | Web NFC API (Chrome Android 89+) |
| Backend | Node.js + Express |
| Base de datos | SQLite (`better-sqlite3`) |
| Exportación | `exceljs` (genera `.xlsx`) |
| Dev local | ngrok (túnel HTTPS para NFC en celular real) |
| Deploy frontend | GitHub Pages |
| Deploy backend | Railway |

---

## Estructura de la app

Tres tabs en barra inferior fija:

```
[ 📡 Escaneo ]   [ 📊 Historial ]   [ 👥 Personal ]
```

Paleta: azul oscuro (`#06101f`, `#0a1828`), blanco, negro. Diseño minimalista.

---

## Sección 1 — Escaneo

**Pantalla principal.** Visible sin autenticación.

- Zona central de escaneo NFC (círculo animado)
- Al leer un tag NFC:
  - Busca colaborador por `nfc_uid`
  - **Tag desconocido:** muestra toast rojo "Tag no registrado"
  - **Sin registro hoy:** crea registro con `hora_salida = now` → muestra confirmación azul con nombre y hora
  - **Con `hora_salida`, sin `hora_regreso`:** actualiza `hora_regreso = now` → muestra confirmación verde con duración calculada
  - **Ciclo completo (ya salió y regresó):** muestra toast gris "Registro completo por hoy"
- Lista de los últimos 5 movimientos del día debajo de la zona de escaneo (nombre, estado, hora)

---

## Sección 2 — Historial

**Visible sin autenticación.**

- Navegación por día: flechas `‹ Lun 10 agosto 2026 ›`
- Contador resumen: `X salieron · Y regresaron`
- Filtro por departamento: chips horizontales (Todos / Incoming / Sorting / FFT Lineas / FFT Paletizado / Shipping)
- Tabla de registros:
  - Avatar (inicial) · Nombre · Departamento · Hora salida · Hora regreso · Duración
  - Ícono ✏️ por fila → abre modal para editar hora de salida **o** regreso
  - Cada campo (salida / regreso) solo es editable **una vez** (flag `editado_salida`, `editado_regreso`)
- Botón **Exportar Excel** → descarga `.xlsx` con registros del día y filtro activo

---

## Sección 3 — Personal

**Protegida por PIN de 4 dígitos.**

- Al tocar el tab se muestra teclado numérico de PIN
- PIN correcto → accede al panel; se mantiene desbloqueado durante la sesión (hasta cerrar/recargar)
- PIN incorrecto → shake + contador de intentos (sin bloqueo en v1)

### Lista de colaboradores
- Nombre · Número de empleado · Departamento · indicador NFC (vinculado / sin vincular)
- Botón eliminar con diálogo de confirmación

### Agregar colaborador
- Formulario: Nombre completo + Número de empleado + Departamento (dropdown) + escaneo NFC
- Departamentos disponibles: `Incoming`, `Sorting`, `FFT Lineas`, `FFT Paletizado`, `Shipping`
- Flujo NFC al registrar:
  1. Se muestra zona de escaneo al llegar al campo NFC
  2. Al leer el tag → muestra UID capturado con check verde
  3. Si el UID ya está asignado a otro colaborador → error "Tag ya registrado"
- Al guardar: POST `/api/colaboradores`

---

## Base de datos (SQLite)

```sql
CREATE TABLE colaboradores (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre      TEXT NOT NULL,
  num_empleado TEXT NOT NULL,
  departamento TEXT NOT NULL,
  nfc_uid     TEXT NOT NULL UNIQUE,
  creado_en   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE registros (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  colaborador_id   INTEGER NOT NULL REFERENCES colaboradores(id) ON DELETE CASCADE,
  fecha            TEXT NOT NULL,        -- 'YYYY-MM-DD'
  hora_salida      TEXT,                 -- 'HH:MM:SS'
  hora_regreso     TEXT,
  editado_salida   INTEGER DEFAULT 0,    -- 0 = no editado, 1 = ya editado
  editado_regreso  INTEGER DEFAULT 0,
  UNIQUE(colaborador_id, fecha)
);
```

---

## API REST

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/scan` | Procesa escaneo NFC (`{ nfc_uid }`) |
| `GET`  | `/api/registros?fecha=YYYY-MM-DD&departamento=` | Lista registros del día con filtro |
| `PUT`  | `/api/registros/:id` | Edita hora de salida o regreso (respeta flags) |
| `GET`  | `/api/export?fecha=YYYY-MM-DD&departamento=` | Descarga `.xlsx` |
| `GET`  | `/api/colaboradores` | Lista todos |
| `POST` | `/api/colaboradores` | Agrega colaborador con NFC |
| `DELETE` | `/api/colaboradores/:id` | Elimina colaborador y sus registros |
| `POST` | `/api/auth/pin` | Valida PIN (`{ pin }`) |

---

## Configuración

`server/.env`:
```
PORT=3000
ADMIN_PIN=1234
DB_PATH=./data/comedor.db
```

El PIN se configura una sola vez en el servidor. No hay UI para cambiarlo en v1.

---

## Estructura de archivos

```
SalidaComedor/
├── server/
│   ├── index.js          # Entry point Express
│   ├── db.js             # Setup SQLite + migraciones
│   ├── routes/
│   │   ├── scan.js
│   │   ├── registros.js
│   │   ├── colaboradores.js
│   │   ├── export.js
│   │   └── auth.js
│   ├── data/             # comedor.db (gitignored)
│   └── package.json
├── public/
│   ├── index.html        # Shell de la SPA
│   ├── css/
│   │   └── style.css
│   └── js/
│       ├── app.js        # Router de tabs
│       ├── scan.js       # Lógica Web NFC + UI escaneo
│       ├── historial.js  # UI historial + exportar
│       └── personal.js   # UI admin + PIN
├── docs/
│   └── superpowers/specs/
│       └── 2026-08-10-salida-comedor-design.md
├── .gitignore
└── README.md
```

---

## Notas de despliegue

- **Dev local con NFC:** levantar server en `localhost:3000`, luego `ngrok http 3000` → abrir URL HTTPS en Chrome Android
- **GitHub Pages:** sirve la carpeta `public/` (frontend estático); la URL del backend se configura en `public/js/app.js` como constante `API_BASE`
- **Railway:** deploy del directorio `server/`, variable de entorno `ADMIN_PIN` y `DB_PATH`
- **`.gitignore`:** incluir `server/data/`, `server/.env`, `.superpowers/`
