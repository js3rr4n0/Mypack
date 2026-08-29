# mypack.lol — My Pack. Your Brand.

Un walking billboard en San Salvador. Seis zonas de una mochila negra tipo
travel/tech se subastan en vivo: la marca que más paga camina conmigo por la ciudad.

## Stack

- **Next.js 15** (App Router) + TypeScript
- **Tailwind CSS** — dark mode premium (#0a0a0a) con acento verde lima
- **React Three Fiber + Three.js** — mochila 3D interactiva con 6 hotspots
- **Neon (PostgreSQL)** + **Drizzle ORM**
- **Wompi El Salvador** — OAuth2 (App ID + API Secret), enlaces de pago en USD
- **Vercel Blob** para logos HD, con fallback automático a base64

## Zonas subastadas

| Zona | `name` | Precio base |
|---|---|---|
| Panel Frontal *(premium)* | `main_front` | $75 |
| Solapa Superior *(premium)* | `top_flap` | $50 |
| Bolsillo Frontal | `front_pocket` | $30 |
| Lateral Izquierdo | `left_side` | $20 |
| Lateral Derecho | `right_side` | $20 |
| Zona del Asa | `top_handle` | $12 |

Los precios se guardan en **centavos enteros de USD** para no arrastrar errores de
punto flotante. Para tomar una zona ocupada se paga `current_price + $5`. Si una
marca ya había estado en esa zona y la sacaron, se le acredita lo que pagó y solo
cubre la diferencia.

## Base de datos

Hay dos caminos; con cualquiera queda igual.

**A. Desde el navegador (sin instalar nada).** Abre tu proyecto en Neon →
*SQL Editor* → pega el contenido de [`drizzle/setup.sql`](drizzle/setup.sql) → Run.
Crea las tres tablas y siembra las 6 zonas. Es idempotente: se puede correr las
veces que quieras. Al final imprime las 6 filas como comprobación.

**B. Desde la terminal.**

```bash
cp .env.example .env.local     # pon aquí tu DATABASE_URL
npm run db:push                # crea las tablas
npm run db:seed                # siembra las 6 zonas
```

Si cambias las zonas o los precios en `src/lib/spots.ts`, regenera el SQL con
`npm run db:sql`.

## Puesta en marcha local

```bash
npm install
cp .env.example .env.local     # completa las variables
npm run db:sql                 # (opcional) regenera drizzle/setup.sql
npm run dev
```

### Variables de entorno

| Variable | Para qué |
|---|---|
| `DATABASE_URL` | Cadena de conexión de Neon (pooled) |
| `WOMPI_APP_ID` | App ID del panel de Wompi (`client_id`) |
| `WOMPI_API_SECRET` | API Secret del panel (`client_secret`) |
| `WOMPI_WEBHOOK_TOKEN` | Secreto propio que viaja en la URL del webhook |
| `WOMPI_ALLOW_TEST_TRANSACTIONS` | `true` para aceptar pagos con `esReal=false` |
| `NEXT_PUBLIC_SITE_URL` | `https://mypack.lol`. Si se deja vacía se usa la URL de Vercel |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob (opcional; sin él se usa base64) |

## Flujo de pago

1. `POST /api/bids` — valida los datos, crea/actualiza la marca y registra la puja en
   estado `pending` con una referencia única.
2. `POST /EnlacePago` con el token OAuth: la referencia viaja como
   `identificadorEnlaceComercio`, el monto en dólares decimales, y el enlace se
   configura con `urlRedirect` y `urlWebhook`. Se redirige al comprador a `urlEnlace`.
3. El usuario paga y vuelve a `/gracias?ref=…`, que consulta el estado.
4. `POST /api/webhook/wompi` — normaliza la notificación y **reconsulta la transacción
   contra la API de Wompi** en vez de confiar en el cuerpo del webhook. Solo con el
   pago aprobado marca las pujas anteriores como `is_outbid`, aprueba la nueva y
   actualiza la zona con el logo, el precio y los datos de la marca.

### Autenticación

OAuth 2.0 *client credentials* contra `https://id.wompi.sv/connect/token` con
`grant_type=client_credentials`, `audience=wompi_api`, `client_id` = App ID y
`client_secret` = API Secret. El token dura una hora y se cachea en memoria.

### Seguridad del webhook

Wompi **no firma** sus notificaciones, así que se usan dos defensas:

1. La URL registrada lleva `?token=WOMPI_WEBHOOK_TOKEN`, que se compara en el servidor.
2. El estado real se confirma con `GET /TransaccionCompra/{idTransaccion}` usando
   nuestro propio token OAuth. `esAprobada` decide, y `esReal=false` (transacción de
   prueba) solo se acepta si `WOMPI_ALLOW_TEST_TRANSACTIONS=true`.

## Rutas de API

| Ruta | Descripción |
|---|---|
| `GET /api/spots` | Estado de las 6 zonas (degrada a datos estáticos sin DB) |
| `POST /api/bids` | Inicia una puja y devuelve el checkout de Wompi |
| `GET /api/bids/status?ref=` | Estado de una puja |
| `POST /api/upload` | Sube el logo (Blob o base64), máx 5MB, PNG/SVG |
| `POST /api/webhook/wompi` | Webhook `transaction.updated` |

## Despliegue en Vercel

1. Importa el repo en Vercel (framework detectado: Next.js).
2. Carga todas las variables de entorno del `.env.example` en *Settings → Environment
   Variables* (Production y Preview).
3. Crea la base en **Neon** y corre `drizzle/setup.sql` en su SQL Editor (ver
   [Base de datos](#base-de-datos)).
4. El webhook no se registra a mano: cada enlace de pago se crea con
   `urlWebhook = https://mypack.lol/api/webhook/wompi?token=WOMPI_WEBHOOK_TOKEN`.
5. Apunta el dominio `mypack.lol` al proyecto en *Settings → Domains*.
