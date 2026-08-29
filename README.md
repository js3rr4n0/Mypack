# mypack.lol — My Pack. Your Brand.

Un walking billboard. Seis zonas de una mochila negra tipo travel/tech se subastan
en vivo: la marca que más paga camina conmigo por la ciudad.

## Stack

- **Next.js 15** (App Router) + TypeScript
- **Tailwind CSS** — dark mode premium (#0a0a0a) con acento verde lima
- **React Three Fiber + Three.js** — mochila 3D interactiva con 6 hotspots
- **Neon (PostgreSQL)** + **Drizzle ORM**
- **Wompi** (Colombia) — checkout + webhook `transaction.updated`
- **Vercel Blob** para logos HD, con fallback automático a base64

## Zonas subastadas

| Zona | `name` | Precio base |
|---|---|---|
| Solapa Superior *(premium)* | `top_flap` | $200.000 |
| Panel Frontal *(premium)* | `main_front` | $300.000 |
| Bolsillo Frontal | `front_pocket` | $120.000 |
| Lateral Izquierdo | `left_side` | $80.000 |
| Lateral Derecho | `right_side` | $80.000 |
| Zona del Asa | `top_handle` | $50.000 |

Los precios se guardan en **centavos COP**. Para tomar una zona ocupada se paga
`current_price + incremento_mínimo` ($20.000). Si una marca ya había estado en esa
zona y la sacaron, se le acredita lo que pagó y solo cubre la diferencia.

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
| `WOMPI_ENV` | `sandbox` o `production` |
| `WOMPI_PUBLIC_KEY` | Llave pública (`pub_test_…` / `pub_prod_…`) |
| `WOMPI_PRIVATE_KEY` | Llave privada, solo servidor |
| `WOMPI_INTEGRITY_SECRET` | Secreto de integridad, firma la transacción |
| `WOMPI_EVENTS_SECRET` | Secreto de eventos, valida el webhook |
| `NEXT_PUBLIC_SITE_URL` | `https://mypack.lol` |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob (opcional; sin él se usa base64) |

## Flujo de pago

1. `POST /api/bids` — valida los datos, crea/actualiza la marca, registra la puja en
   estado `pending` con una referencia única y devuelve la URL de checkout de Wompi
   firmada con `SHA256(referencia + monto + moneda + secreto_integridad)`.
2. El usuario paga en Wompi y vuelve a `/gracias?ref=…`, que consulta el estado.
3. `POST /api/webhook/wompi` — verifica el checksum del evento, reconsulta la
   transacción contra la API de Wompi y **solo con `APPROVED`** marca las pujas
   anteriores como `is_outbid`, aprueba la nueva y actualiza la zona con el logo,
   el precio y los datos de la marca. `DECLINED` / `VOIDED` / `ERROR` → `declined`.

`src/lib/wompi.ts` también expone `createTransaction()` para el flujo directo
`POST /v1/transactions` con `acceptance_token` y `accept_personal_auth`, por si se
tokeniza la tarjeta en el front en vez de usar el checkout alojado.

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
4. En el dashboard de Wompi registra el webhook:
   `https://mypack.lol/api/webhook/wompi` (evento `transaction.updated`).
5. Apunta el dominio `mypack.lol` al proyecto en *Settings → Domains*.
