-- Revisión del estado. Solo lee, no cambia nada. Correlo cuando quieras.

\echo '=== 1. ZONAS: quién ocupa qué, y si tiene logo cargado ==='
SELECT s.position_order AS n,
       s.name,
       s.display_name,
       COALESCE(br.name, '— libre —')            AS marca,
       (s.current_price / 100.0)::money          AS precio_actual,
       (s.min_bid / 100.0)::money                AS precio_base,
       CASE
         WHEN br.id IS NULL THEN ''
         WHEN br.logo_url   IS NOT NULL THEN 'logo por URL'
         WHEN br.logo_base64 IS NOT NULL THEN 'logo en base64'
         ELSE 'SIN LOGO (revisar)'
       END AS logo
FROM spots s
LEFT JOIN brands br ON br.id = s.current_brand_id
WHERE s.is_active
ORDER BY s.position_order;

\echo ''
\echo '=== 2. PAGOS: los últimos 10, y cómo se cerró cada uno ==='
SELECT b.created_at::timestamp(0) AS fecha,
       s.name                     AS zona,
       br.name                    AS marca,
       (b.amount / 100.0)::money  AS pagado,
       b.status,
       COALESCE(b.settled_via, '—') AS cerrado_por,
       b.needs_refund             AS devolver,
       b.wompi_reference
FROM bids b
JOIN spots s   ON s.id  = b.spot_id
JOIN brands br ON br.id = b.brand_id
ORDER BY b.id DESC
LIMIT 10;

\echo ''
\echo '=== 3. PENDIENTES: pagos que no se cerraron (deberían ser 0) ==='
SELECT b.wompi_reference, br.email, (b.amount/100.0)::money AS monto,
       b.created_at::timestamp(0) AS desde
FROM bids b JOIN brands br ON br.id = b.brand_id
WHERE b.status = 'pending' AND b.created_at < now() - interval '30 minutes';

\echo ''
\echo '=== 4. DEVOLUCIONES pendientes (deberían ser 0) ==='
SELECT b.wompi_reference, b.wompi_transaction_id, (b.amount/100.0)::money AS monto,
       br.email, br.name
FROM bids b JOIN brands br ON br.id = b.brand_id
WHERE b.needs_refund;

\echo ''
\echo '=== 5. WEBHOOK: ¿Wompi ha llamado alguna vez? ==='
SELECT created_at::timestamp(0) AS fecha, outcome, reference
FROM webhook_events ORDER BY id DESC LIMIT 5;

\echo ''
\echo '=== 6. VISITAS ==='
SELECT count(*) AS total_visitas FROM visits;
