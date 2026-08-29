# Fotos de la mochila

Pon aquí las dos fotos reales, con estos nombres exactos:

- `front.jpg` — vista frontal, la mochila de frente y centrada.
- `angle.jpg` — vista en ángulo, mostrando un costado con el MOLLE.

Recomendado: JPG, lado largo de 1600px, relación 2:3 (vertical), bajo 400KB cada una.

Si falta alguna, la web no se rompe: muestra un marcador en su lugar.

Para alinear los logos sobre las fotos, abre la página con `?zonas=1`: se dibuja
el recuadro de cada zona con su nombre encima de la foto. Ajusta los valores
`photo: { x, y, w, h, rotate }` de cada zona en `src/lib/spots.ts` (todo en % del
tamaño de la foto) hasta que calcen, y quita el parámetro.
