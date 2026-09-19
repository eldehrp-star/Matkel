# Caja Matkel

Sistema sencillo de apertura/cierre de caja para la cafetería, pensado para
usarse **solo desde el celular** del personal (no requiere computadora ni
tablet). Se conecta a Clip para que las ventas que se cobran ahí aparezcan
automáticamente en el sistema.

## Qué hace

- Tu personal inicia sesión con **usuario + PIN** desde el celular.
- Al empezar el turno, **abren la caja** indicando cuánto efectivo dejaron.
- Pueden registrar **entradas y salidas de efectivo** (fondos, compras,
  retiros) durante el turno.
- Las **ventas de Clip llegan solas** al sistema (vía webhook) y se muestran
  junto a la caja del turno en el que ocurrieron.
- Al terminar el turno, **cierran la caja** contando el efectivo físico; el
  sistema muestra el efectivo esperado y la diferencia contra lo contado.
- Hay un **historial** de cajas cerradas y un panel de **administrador**
  para dar de alta al personal.

**Importante sobre Clip:** Clip no ofrece una API de catálogo/inventario, así
que tu inventario sigue viviendo en Clip. Lo que sí trae este sistema son las
**transacciones/ventas** de Clip en tiempo real (vía su Transactions API +
webhooks), que es lo necesario para cuadrar la caja.

## Cómo está armado

- `server/`: API en Node.js + Express + PostgreSQL (Prisma). Aquí vive la
  lógica de caja, personal, y el webhook que recibe las notificaciones de Clip.
- `web/`: App web (PWA) en React, optimizada para celular. Se puede "instalar"
  en la pantalla de inicio de Android o iPhone como si fuera una app, sin pasar
  por ninguna tienda de aplicaciones.

No es una app nativa: es una página web que funciona perfecto desde el
navegador del celular y se ve/comporta como una app al instalarla.

---

## 1. Correrlo en tu computadora (para probar antes de publicarlo)

Necesitas Node.js 18+ y Docker (o un PostgreSQL local).

```bash
# 1. Levanta una base de datos local
docker compose up -d

# 2. Backend
cd server
cp .env.example .env
# Edita .env: DATABASE_URL="postgresql://matkel:matkel@localhost:5432/matkel"
npm install
npx prisma migrate dev --name init
npm run seed        # crea el usuario admin (usuario: admin, pin: 1234 por defecto)
npm run dev          # queda escuchando en http://localhost:4000

# 3. Frontend (en otra terminal)
cd web
npm install
echo 'VITE_API_URL=http://localhost:4000' > .env
npm run dev          # abre http://localhost:5173 en tu navegador o celular en la misma red
```

Entra con `admin` / `1234`, cambia el PIN, y crea a tu personal desde la
pestaña **Personal**.

---

## 2. Publicarlo para que tu personal lo use desde su celular

Vas a necesitar, en este orden:

### Paso 1 — Base de datos: Neon (gratis)

1. Crea una cuenta en [neon.tech](https://neon.tech).
2. Crea un proyecto nuevo (elige la región más cercana a México).
3. Copia el **connection string** que te dan (empieza con `postgresql://...`).
   Ese valor va en la variable `DATABASE_URL`.

### Paso 2 — Backend + Frontend: Render (gratis para empezar)

1. Sube este código a un repositorio de GitHub (o usa el que ya tienes).
2. Crea una cuenta en [render.com](https://render.com) y conéctala a tu GitHub.
3. Usa **"New +" → "Blueprint"** y apunta al repo: Render va a leer el archivo
   `render.yaml` de la raíz y va a crear automáticamente dos servicios:
   - `matkel-server` (la API)
   - `matkel-web` (la app web para el celular)
4. Cuando te pida las variables marcadas como secretas, ingresa:
   - `DATABASE_URL`: el connection string de Neon.
   - `CORS_ORIGIN`: la URL que Render le va a asignar a `matkel-web` (algo
     como `https://matkel-web.onrender.com`). Puedes dejarlo pendiente y
     actualizarlo cuando Render te dé la URL final.
   - `SEED_ADMIN_PIN`: el PIN inicial del administrador (cámbialo luego desde
     la app).
   - `CLIP_API_KEY` y `CLIP_WEBHOOK_SECRET`: los ves en el Paso 3.
5. En `matkel-web`, configura `VITE_API_URL` con la URL de `matkel-server`
   (algo como `https://matkel-server.onrender.com`).
6. Una vez desplegado, entra a la Shell de `matkel-server` en Render y corre
   una vez: `npm run seed` (esto crea tu usuario administrador).

> El plan gratuito de Render "duerme" el servicio si no se usa por un rato y
> tarda unos segundos en despertar con la primera visita del día. Si eso te
> molesta, puedes pasar el backend a un plan pagado más adelante — el resto
> de la configuración no cambia.

### Paso 3 — Conectar con Clip

1. Entra a [developer.clip.mx](https://developer.clip.mx) e inicia sesión con
   tu cuenta de Clip (la misma con la que ya cobras). Si no tienes acceso de
   desarrollador, busca la opción para solicitarlo o escribe a soporte de
   Clip Developers desde ese portal — la doc indica que responden en menos de
   1 hora hábil.
2. Genera tu **API key** — va en la variable `CLIP_API_KEY`.
3. Busca la sección de **Webhooks / Postback Webhook** y registra esta URL:
   `https://matkel-server.onrender.com/api/clip/webhook`
   (cambia el dominio por el que te haya dado Render).
4. Configura ahí mismo un **secreto compartido** para verificar que las
   llamadas son realmente de Clip, y pon ese mismo valor en la variable
   `CLIP_WEBHOOK_SECRET` del backend.
5. **Revisa el formato exacto** que Clip usa para el webhook (nombre del
   header de firma y los campos del JSON) y compáralo con
   `server/src/routes/clip.routes.js`. Ya dejé el código preparado para leer
   los campos más comunes (`amount`/`monto`, `receipt_number`/`folio`, etc.)
   y para aceptar la firma como HMAC-SHA256 o como secreto compartido en un
   header — pero como Clip pide cuenta de desarrollador para ver la doc
   completa, confírmalo con tu cuenta ya activa y ajusta esa función si hace
   falta. El sistema siempre guarda el mensaje completo que manda Clip, así
   que ningún dato se pierde aunque haya que afinar el mapeo de campos.
6. Como respaldo (por si un webhook no llega), hay un botón/endpoint de
   sincronización manual (`POST /api/clip/sync`) que jala las transacciones
   de los últimos días directamente desde la API de Clip.

### Paso 4 — Instalar la app en los celulares del personal

1. Desde el navegador del celular (Chrome en Android, Safari en iPhone),
   abre la URL de `matkel-web` (ej. `https://matkel-web.onrender.com`).
2. **Android (Chrome):** menú (⋮) → "Agregar a pantalla de inicio" /
   "Instalar app".
3. **iPhone (Safari):** botón de compartir (▢↑) → "Agregar a pantalla de
   inicio".
4. Queda un ícono como cualquier app; al abrirlo no se ve la barra del
   navegador.

---

## Seguridad — antes de usarlo en serio

- Cambia `JWT_SECRET`, `CLIP_WEBHOOK_SECRET` y el PIN del administrador por
  valores propios (no dejes los de ejemplo).
- Los PINs del personal son de 4 a 6 dígitos; siéntete libre de exigir 6 si
  quieres más seguridad.
- Cada persona debería tener su propio usuario (no compartir el PIN de
  admin), para que el historial refleje quién abrió/cerró cada caja.

## Estructura del proyecto

```
server/   API (Express + Prisma + PostgreSQL)
web/      App web para celular (React + Vite, instalable como PWA)
render.yaml       Config para desplegar ambos servicios en Render
docker-compose.yml Postgres local para desarrollo
```
