-- Revisión del estado de mypack.lol. Solo lee, no cambia nada.
-- Compatible con el SQL Editor de Neon: pégalo completo y dale Run.
-- Devuelve seis tablas, una por bloque.

-- 1. ZONAS: quién ocupa qué y si tiene logo cargado.
SELECT '1. ZONAS' AS bloque,
       s.position_order AS n,
       s.display_name,
       COALESCE(br.name, '-- libre --')      AS marca,
       (s.current_price / 100.0)::money      AS precio_actual,
       (s.min_bid / 100.0)::money            AS precio_base,
       CASE
         WHEN br.id IS NULL              THEN ''
         WHEN br.logo_url    IS NOT NULL THEN 'logo por URL'
         WHEN br.logo_base64 IS NOT NULL THEN 'logo en base64'
         ELSE 'SIN LOGO (revisar)'
       END AS logo
FROM spots s
LEFT JOIN brands br ON br.id = s.current_brand_id
WHERE s.is_active
ORDER BY s.position_order;

-- 2. PAGOS: los últimos 10 y cómo se cerró cada uno.
SELECT '2. PAGOS' AS bloque,
       b.created_at::timestamp(0)   AS fecha,
       s.name                       AS zona,
       br.name                      AS marca,
       (b.amount / 100.0)::money    AS pagado,
       b.status,
       COALESCE(b.settled_via, '-') AS cerrado_por,
       b.needs_refund               AS devolver,
       b.wompi_reference
FROM bids b
JOIN spots s   ON s.id  = b.spot_id
JOIN brands br ON br.id = b.brand_id
ORDER BY b.id DESC
LIMIT 10;

-- 3. PENDIENTES de más de 30 minutos. Debería salir vacío.
SELECT '3. PENDIENTES' AS bloque,
       b.wompi_reference,
       br.email,
       (b.amount / 100.0)::money  AS monto,
       b.created_at::timestamp(0) AS desde
FROM bids b
JOIN brands br ON br.id = b.brand_id
WHERE b.status = 'pending'
  AND b.created_at < now() - interval '30 minutes';

-- 4. DEVOLUCIONES pendientes. Debería salir vacío.
SELECT '4. DEVOLUCIONES' AS bloque,
       b.wompi_reference,
       b.wompi_transaction_id,
       (b.amount / 100.0)::money AS monto,
       br.email,
       br.name
FROM bids b
JOIN brands br ON br.id = b.brand_id
WHERE b.needs_refund;

-- 5. WEBHOOK: ¿Wompi ha llamado alguna vez?
SELECT '5. WEBHOOK' AS bloque,
       created_at::timestamp(0) AS fecha,
       outcome,
       reference
FROM webhook_events
ORDER BY id DESC
LIMIT 5;

-- 6. VISITAS al sitio.
SELECT '6. VISITAS' AS bloque, count(*) AS total FROM visits;
