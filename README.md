# mypack.lol — My Pack. Your Brand.

Un walking billboard. Seis zonas de una mochila negra tipo travel/tech se subastan
en vivo: la marca que más paga camina conmigo por la ciudad.

## Stack

- **Next.js 15** (App Router) + TypeScript
- **Tailwind CSS** — dark mode premium (#0a0a0a) con acento verde lima
- **React Three Fiber + Three.js** — mochila 3D interactiva con 6 hotspots
- **Neon (PostgreSQL)** + **Drizzle ORM**
- **Wompi** — El Salvador (OAuth2 App ID + API Secret, USD) o Colombia (llaves `pub_`/`prv_`, COP)
- **Vercel Blob** para logos HD, con fallback automático a base64

## Zonas subastadas

| Zona | `name` | Base USD | Base COP |
|---|---|---|---|
| Solapa Superior *(premium)* | `top_flap` | $50 | $200.000 |
| Panel Frontal *(premium)* | `main_front` | $75 | $300.000 |
| Bolsillo Frontal | `front_pocket` | $30 | $120.000 |
| Lateral Izquierdo | `left_side` | $20 | $80.000 |
| Lateral Derecho | `right_side` | $20 | $80.000 |
| Zona del Asa | `top_handle` | $12 | $50.000 |

Los precios se guardan siempre en **centavos enteros**; la moneda activa la define
`NEXT_PUBLIC_CURRENCY` (`USD` para Wompi SV, `COP` para Wompi CO), así el esquema de
base de datos no cambia entre países. Para tomar una zona ocupada se paga
`current_price + incremento_mínimo` ($5 USD / $20.000 COP). Si una marca ya había
estado en esa zona y la sacaron, se le acredita lo que pagó y solo cubre la diferencia.

## Puesta en marcha local

```bash
npm install
cp .env.example .env.local     # completa las variables
npm run db:push                # crea las tablas en Neon
npm run db:seed                # siembra las 6 zonas
npm run dev
```

### Variables de entorno

| Variable | Para qué |
|---|---|
| `DATABASE_URL` | Cadena de conexión de Neon (pooled) |
| `WOMPI_COUNTRY` | `SV` (por defecto) o `CO` |
| `NEXT_PUBLIC_CURRENCY` | `USD` con `SV`, `COP` con `CO` |
| `NEXT_PUBLIC_SITE_URL` | `https://mypack.lol` |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob (opcional; sin él se usa base64) |

**Wompi El Salvador** (`WOMPI_COUNTRY=SV`):

| Variable | Para qué |
|---|---|
| `WOMPI_APP_ID` | App ID del panel de Wompi (`client_id`) |
| `WOMPI_API_SECRET` | API Secret del panel (`client_secret`) |
| `WOMPI_WEBHOOK_TOKEN` | Secreto propio que viaja en la URL del webhook |
| `WOMPI_ALLOW_TEST_TRANSACTIONS` | `true` para aceptar pagos con `esReal=false` |

**Wompi Colombia** (`WOMPI_COUNTRY=CO`): `WOMPI_ENV`, `WOMPI_PUBLIC_KEY`,
`WOMPI_PRIVATE_KEY`, `WOMPI_INTEGRITY_SECRET`, `WOMPI_EVENTS_SECRET`.

## Flujo de pago

`src/lib/wompi/` tiene un cliente por país detrás de una fachada común
(`startCheckout()` / `resolveEvent()`), así el resto de la app no sabe en qué país
está corriendo.

1. `POST /api/bids` — valida los datos, crea/actualiza la marca y registra la puja en
   estado `pending` con una referencia única.
2. Se genera el cobro:
   - **SV** → `POST /EnlacePago` con el token OAuth; la referencia viaja como
     `identificadorEnlaceComercio`, el monto en dólares decimales, y el enlace se
     configura con `urlRedirect` y `urlWebhook`. Se redirige a `urlEnlace`.
   - **CO** → checkout alojado firmado con
     `SHA256(referencia + monto + moneda + secreto_integridad)`.
3. El usuario paga y vuelve a `/gracias?ref=…`, que consulta el estado.
4. `POST /api/webhook/wompi` — normaliza el evento y **reconsulta la transacción
   contra la API de Wompi** en vez de confiar en el cuerpo del webhook. Solo con el
   pago aprobado marca las pujas anteriores como `is_outbid`, aprueba la nueva y
   actualiza la zona con el logo, el precio y los datos de la marca.

### Autenticación Wompi SV

OAuth 2.0 *client credentials* contra `https://id.wompi.sv/connect/token` con
`grant_type=client_credentials`, `audience=wompi_api`, `client_id` = App ID y
`client_secret` = API Secret. El token dura una hora y se cachea en memoria.

### Seguridad del webhook en SV

Wompi SV **no firma** sus notificaciones, así que se usan dos defensas:

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
3. Crea la base en **Neon** y corre `npm run db:push && npm run db:seed` una vez
   apuntando a la base de producción.
4. El webhook se registra solo: cada enlace de pago se crea con
   `urlWebhook = https://mypack.lol/api/webhook/wompi?token=WOMPI_WEBHOOK_TOKEN`.
   (En Colombia sí hay que registrarlo a mano en el panel, evento `transaction.updated`.)
5. Apunta el dominio `mypack.lol` al proyecto en *Settings → Domains*.
