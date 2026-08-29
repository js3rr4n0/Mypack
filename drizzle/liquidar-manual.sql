-- Liquidación manual de una puja pagada.
--
-- Úsalo SOLO si tienes el correo de Wompi confirmando el cobro y la página
-- /thanks?ref=… sigue diciendo "Confirming your payment" — es decir, cuando
-- ni el webhook ni la reconciliación automática lograron cerrarla.
--
-- Reemplaza la referencia en los TRES lugares donde aparece abajo por la tuya
-- y corre todo junto en el SQL Editor de Neon.
--
-- (Antes usaba \set, que solo funciona en la terminal psql, no en Neon.)

-- 1. Mirar qué hay antes de tocar nada.
SELECT b.id, b.status, b.amount, b.previous_price, b.needs_refund,
       s.name AS spot, s.current_price, br.name AS brand, br.email,
       (br.logo_url IS NOT NULL OR br.logo_base64 IS NOT NULL) AS tiene_logo
FROM bids b
JOIN spots s  ON s.id  = b.spot_id
JOIN brands br ON br.id = b.brand_id
WHERE b.wompi_reference = 'PON-AQUI-TU-REFERENCIA';

-- 2. Liquidar: marca las pujas anteriores de esa zona como superadas,
--    aprueba esta, y le entrega la zona a la marca.
WITH target AS (
  SELECT b.id, b.spot_id, b.brand_id,
         (COALESCE(b.previous_price, 0) + b.amount) AS new_price
  FROM bids b
  WHERE b.wompi_reference = 'PON-AQUI-TU-REFERENCIA' AND b.status = 'pending'
),
outbid AS (
  UPDATE bids SET is_outbid = true
  WHERE spot_id = (SELECT spot_id FROM target)
    AND status = 'approved'
    AND id <> (SELECT id FROM target)
  RETURNING 1
),
approve AS (
  UPDATE bids
  SET status = 'approved', is_outbid = false, settled_via = 'manual'
  WHERE id = (SELECT id FROM target)
  RETURNING 1
)
UPDATE spots s
SET current_brand_id = (SELECT brand_id FROM target),
    current_price    = (SELECT new_price FROM target)
WHERE s.id = (SELECT spot_id FROM target);

-- 3. Comprobar que quedó publicada.
SELECT s.name, br.name AS brand, s.current_price, b.status, b.settled_via
FROM spots s
JOIN brands br ON br.id = s.current_brand_id
JOIN bids b    ON b.wompi_reference = 'PON-AQUI-TU-REFERENCIA'
WHERE s.id = b.spot_id;
