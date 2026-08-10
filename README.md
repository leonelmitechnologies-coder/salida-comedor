# Comedor NFC — Sistema de Asistencia

Control de salida y regreso al comedor mediante tags NFC. Diseño mobile-first, paleta azul oscuro.

## Requisitos

- Node.js 22+ (usa `node:sqlite` integrado)
- Chrome para Android con NFC activo (para escanear tags)
- Tags NFC tipo NDEF (NTAG213/215/216 o MIFARE Ultralight)

## Instalación

```bash
cd server
npm install
```

## Configuración

Edita `server/.env`:

```
PORT=3000
ADMIN_PIN=1234      # Cambia este PIN
DB_PATH=./data/comedor.db
```

## Correr en local (PC)

```bash
cd server
npm start
```

Abre http://localhost:3000 en el navegador.

> **Nota:** Web NFC no funciona en desktop. Para probar el escaneo NFC necesitas un teléfono Android con Chrome.

## Probar NFC en teléfono (ngrok)

Web NFC requiere HTTPS. ngrok crea un túnel HTTPS a tu servidor local:

1. Instala ngrok: https://ngrok.com/download
2. Levanta el servidor: `cd server && npm start`
3. En otra terminal: `ngrok http 3000`
4. Copia la URL `https://xxxx.ngrok-free.app`
5. Ábrela en Chrome Android
6. Edita `public/js/app.js` línea 1: reemplaza la URL de producción con la de ngrok temporalmente, o simplemente accede por la URL de ngrok (el servidor sirve el frontend también)

## Estructura

```
SalidaComedor/
├── server/
│   ├── index.js          # Servidor Express
│   ├── db.js             # SQLite + migraciones
│   ├── routes/
│   │   ├── auth.js       # POST /api/auth/pin
│   │   ├── colaboradores.js
│   │   ├── scan.js       # POST /api/scan
│   │   ├── registros.js  # GET/PUT /api/registros
│   │   └── export.js     # GET /api/export (.xlsx)
│   ├── data/             # comedor.db (gitignored)
│   └── .env              # gitignored
└── public/               # Frontend SPA
    ├── index.html
    ├── css/style.css
    └── js/
        ├── app.js        # Router + utilidades
        ├── scan.js       # Tab Escaneo
        ├── historial.js  # Tab Historial
        └── personal.js   # Tab Personal (PIN)
```

## API

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/auth/pin` | Valida PIN `{ pin }` |
| `POST` | `/api/scan` | Escaneo NFC `{ nfc_uid }` |
| `GET`  | `/api/scan/ultimos` | Últimos 5 movimientos del día |
| `GET`  | `/api/colaboradores` | Lista todos |
| `POST` | `/api/colaboradores` | Agrega `{ nombre, num_empleado, departamento, nfc_uid }` |
| `DELETE` | `/api/colaboradores/:id` | Elimina colaborador |
| `GET`  | `/api/registros?fecha=YYYY-MM-DD&departamento=` | Registros del día |
| `PUT`  | `/api/registros/:id` | Edita hora `{ campo, valor }` (una vez) |
| `GET`  | `/api/export?fecha=YYYY-MM-DD&departamento=` | Descarga Excel |

## Deploy

### Railway (backend)
1. Sube el repositorio a GitHub
2. Crea proyecto en railway.app
3. Conecta el repo, selecciona directorio `server/`
4. Agrega variables de entorno: `ADMIN_PIN`, `DB_PATH=/app/data/comedor.db`
5. Railway asigna HTTPS automáticamente

### GitHub Pages (frontend)
1. Edita `public/js/app.js` → actualiza `API_BASE` con la URL de Railway
2. En GitHub: Settings → Pages → Branch: main, folder: `/public`

## Notas

- El PIN se configura solo en `.env`. No hay UI para cambiarlo.
- Web NFC funciona únicamente en Chrome para Android 89+. No funciona en iOS.
- Cada registro de asistencia permite editar la hora de salida y la de regreso **una vez** cada una.
- Los departamentos disponibles son: Incoming, Sorting, FFT Lineas, FFT Paletizado, Shipping.
