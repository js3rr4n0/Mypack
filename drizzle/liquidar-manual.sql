-- Liquidación manual de una puja ya pagada.
--
-- Úsalo solo si tienes el correo de Wompi confirmando el cobro y la página
-- /thanks?ref=… no logró cerrarla sola. Compatible con el SQL Editor de Neon.
--
-- Reemplaza los DOS valores de abajo por los tuyos antes de correrlo.

-- 1. Ver qué hay ahora (no cambia nada).
SELECT b.id, b.status, b.amount, b.previous_price, b.wompi_link_id,
       s.name AS spot, s.current_price, br.name AS brand,
       (br.logo_url IS NOT NULL OR br.logo_base64 IS NOT NULL) AS tiene_logo
FROM bids b
JOIN spots s   ON s.id  = b.spot_id
JOIN brands br ON br.id = b.brand_id
WHERE b.wompi_reference = 'PON-AQUI-TU-REFERENCIA';

-- 2. Liquidar: supera las pujas anteriores de esa zona, aprueba esta,
--    y le entrega la zona a la marca.
WITH target AS (
  SELECT id, spot_id, brand_id,
         (COALESCE(previous_price, 0) + amount) AS new_price
  FROM bids
  WHERE wompi_reference = 'PON-AQUI-TU-REFERENCIA' AND status = 'pending'
),
outbid AS (
  UPDATE bids SET is_outbid = true
  WHERE spot_id = (SELECT spot_id FROM target)
    AND status  = 'approved'
    AND id     <> (SELECT id FROM target)
  RETURNING 1
),
approve AS (
  UPDATE bids
  SET status = 'approved',
      is_outbid = false,
      settled_via = 'manual',
      wompi_transaction_id = 'PON-AQUI-EL-ID-DE-TRANSACCION'
  WHERE id = (SELECT id FROM target)
  RETURNING 1
)
UPDATE spots s
SET current_brand_id = (SELECT brand_id  FROM target),
    current_price    = (SELECT new_price FROM target)
WHERE s.id = (SELECT spot_id FROM target);

-- 3. Comprobar que quedó publicada.
SELECT s.display_name, br.name AS brand, (s.current_price/100.0)::money AS precio,
       b.status, b.settled_via
FROM spots s
JOIN brands br ON br.id = s.current_brand_id
JOIN bids b    ON b.spot_id = s.id
WHERE b.wompi_reference = 'PON-AQUI-TU-REFERENCIA';
