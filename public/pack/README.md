# Fotos de la mochila

## Vista 360

Las fotos de la secuencia van en `public/pack/360/`, numeradas en el orden en
que gira la mochila:

- `01.jpg` — costado izquierdo
- `02.jpg` — frente
- `03.jpg` — costado derecho

Con tres cuadros el giro es corto pero funciona. Para un 360 real, fotografía la
mochila sobre una base giratoria cada 15° (24 cuadros) o cada 30° (12 cuadros),
numéralos `01.jpg`, `02.jpg`, … y agrégalos al arreglo `FRAMES` de
`src/lib/pack-frames.ts`.

Requisitos para que el giro se vea limpio:

- **Todas las fotos con la misma relación de aspecto** (2:3 vertical) y el mismo
  encuadre — la mochila debe ocupar el mismo espacio en todas, o "salta" al girar.
- Mismo fondo, misma luz, mismo lente. Trípode fijo, gira la mochila, no la cámara.
- JPG, lado largo 1600px, bajo 400KB cada una.

Si falta alguna, la web no se rompe: muestra un marcador diciendo cuál falta.

## Alinear los logos

Cada cuadro declara dónde cae cada zona en esa foto, porque el panel frontal no
está en el mismo sitio de frente que en tres cuartos.

Abre la home con `?zones=1`: se dibuja el recuadro de cada zona con su nombre
encima de la foto. Ajusta los valores `{ x, y, w, h, rotate }` del cuadro
correspondiente en `src/lib/pack-frames.ts` — todo en % del tamaño de la foto —
hasta que calcen, y quita el parámetro.
