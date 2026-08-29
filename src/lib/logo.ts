/**
 * Quita el fondo plano de un logo.
 *
 * La mayoria de las marcas mandan su logo sobre un rectangulo blanco. Sobre el
 * cordura negro de la mochila eso se ve como una calcomania pegada, no como un
 * parche. Aqui se detecta si el borde de la imagen es de un color uniforme y,
 * si lo es, se vuelve transparente.
 *
 * El relleno arranca desde los bordes hacia adentro, no por color global: asi
 * un logo con blanco en su interior (el ojo de un personaje, un contorno) lo
 * conserva, y solo desaparece el fondo que de verdad rodea la marca.
 *
 * Todo ocurre en el navegador, antes de subir nada.
 */

export interface CleanedLogo {
  dataUrl: string;
  /** true si se detecto y quito un fondo plano */
  removed: boolean;
  /** luminancia media de lo que queda visible, 0 = negro, 255 = blanco */
  luminance: number;
}

/** Debajo de esto el logo se pierde sobre el cordura negro. */
export const DARK_LOGO_THRESHOLD = 70;

/** Luminancia media de los pixeles que se van a ver. */
function visibleLuminance(d: Uint8ClampedArray): number {
  let sum = 0;
  let n = 0;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 128) continue;
    sum += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    n++;
  }
  return n ? sum / n : 255;
}

/** Distancia de color aceptada para considerar dos pixeles "el mismo fondo". */
const TOLERANCE = 42;
/** Que porcentaje del borde debe compartir color para darlo por fondo plano. */
const BORDER_AGREEMENT = 0.85;

function distance(
  d: Uint8ClampedArray,
  i: number,
  r: number,
  g: number,
  b: number
): number {
  return Math.abs(d[i] - r) + Math.abs(d[i + 1] - g) + Math.abs(d[i + 2] - b);
}

export async function removeFlatBackground(file: File): Promise<CleanedLogo> {
  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx)
    return { dataUrl: await fileToDataUrl(file), removed: false, luminance: 255 };

  ctx.drawImage(bitmap, 0, 0);
  bitmap.close?.();

  const image = ctx.getImageData(0, 0, width, height);
  const d = image.data;

  // Color de referencia: la esquina superior izquierda.
  const r0 = d[0];
  const g0 = d[1];
  const b0 = d[2];
  if (d[3] < 250) {
    // Ya venia con transparencia: no hay nada que limpiar.
    return {
      dataUrl: canvas.toDataURL("image/png"),
      removed: false,
      luminance: visibleLuminance(d),
    };
  }

  // ¿El borde entero comparte ese color?
  let border = 0;
  let matching = 0;
  const check = (x: number, y: number) => {
    const i = (y * width + x) * 4;
    border++;
    if (distance(d, i, r0, g0, b0) < TOLERANCE) matching++;
  };
  for (let x = 0; x < width; x++) {
    check(x, 0);
    check(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    check(0, y);
    check(width - 1, y);
  }
  if (matching / border < BORDER_AGREEMENT) {
    return {
      dataUrl: canvas.toDataURL("image/png"),
      removed: false,
      luminance: visibleLuminance(d),
    };
  }

  // Relleno desde los bordes hacia adentro.
  const seen = new Uint8Array(width * height);
  const queue: number[] = [];
  const push = (x: number, y: number) => {
    const p = y * width + x;
    if (seen[p]) return;
    if (distance(d, p * 4, r0, g0, b0) >= TOLERANCE) return;
    seen[p] = 1;
    queue.push(p);
  };
  for (let x = 0; x < width; x++) {
    push(x, 0);
    push(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    push(0, y);
    push(width - 1, y);
  }

  while (queue.length) {
    const p = queue.pop()!;
    d[p * 4 + 3] = 0;
    const x = p % width;
    const y = (p - x) / width;
    if (x > 0) push(x - 1, y);
    if (x < width - 1) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y < height - 1) push(x, y + 1);
  }

  // Suaviza el filo: un pixel opaco pegado al fondo queda a media opacidad,
  // si no el recorte se ve dentado.
  const alpha = new Uint8ClampedArray(width * height);
  for (let p = 0; p < width * height; p++) alpha[p] = d[p * 4 + 3];
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const p = y * width + x;
      if (alpha[p] === 0) continue;
      let empty = 0;
      if (alpha[p - 1] === 0) empty++;
      if (alpha[p + 1] === 0) empty++;
      if (alpha[p - width] === 0) empty++;
      if (alpha[p + width] === 0) empty++;
      if (empty) d[p * 4 + 3] = Math.round(255 * (1 - empty / 6));
    }
  }

  ctx.putImageData(image, 0, 0);
  return {
    dataUrl: canvas.toDataURL("image/png"),
    removed: true,
    luminance: visibleLuminance(d),
  };
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
