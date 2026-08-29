import type { SpotName } from "./spots";

/**
 * Vista 360 de la mochila: una secuencia de fotos reales que el usuario gira
 * arrastrando. Funciona con cualquier cantidad de cuadros — con 3 es un giro
 * corto, con 24 seria un giro completo.
 *
 * Cada cuadro declara donde cae cada zona EN ESA FOTO, porque el panel frontal
 * no esta en el mismo sitio de frente que en tres cuartos, y ademas se ve mas
 * pequeno cuando esta escorzado. Todo va en % del tamano de la foto.
 *
 * Las coordenadas de abajo estan medidas sobre las fotos ya normalizadas
 * (1200x1800). Para reajustarlas: abre la home con ?zones=1 y se dibujan los
 * recuadros con su nombre sobre cada cuadro.
 */
export interface FrameZone {
  /** centro del logo, en % del ancho/alto de la foto */
  x: number;
  y: number;
  /** tamano maximo del logo, en % de la foto */
  w: number;
  h: number;
  /** inclinacion para acompanar la perspectiva de esa cara */
  rotate?: number;
  /** cizallado vertical: da la sensacion de que el logo esta sobre el plano */
  skew?: number;
  /** atenuacion para las caras que en ese angulo se ven escorzadas */
  opacity?: number;
}

export interface PackFrame {
  src: string;
  label: string;
  zones: Partial<Record<SpotName, FrameZone>>;
}

export const FRAMES: PackFrame[] = [
  {
    // Frente en tres cuartos: se ve el panel frontal y el costado izquierdo.
    src: "/pack/360/01.jpg",
    label: "Left side",
    zones: {
      main_front: { x: 28, y: 51, w: 24, h: 8, rotate: 8, skew: 6, opacity: 0.95 },
      left_top: { x: 62, y: 42, w: 13, h: 5.5, rotate: -3, skew: -4 },
      left_mid: { x: 63, y: 54, w: 13, h: 5.5, rotate: -3, skew: -4 },
      left_bottom: { x: 68, y: 66, w: 12, h: 5, rotate: -3, skew: -4 },
    },
  },
  {
    // Frente plano: el panel frontal a tamano completo.
    src: "/pack/360/02.jpg",
    label: "Front",
    zones: {
      main_front: { x: 50, y: 49, w: 28, h: 10 },
      front_pocket: { x: 50, y: 66, w: 20, h: 5.5 },
    },
  },
  {
    // Tres cuartos del otro lado: panel frontal y costado derecho.
    src: "/pack/360/03.jpg",
    label: "Right side",
    zones: {
      right_top: { x: 39, y: 33, w: 14, h: 5.5, rotate: -6, skew: -5 },
      right_mid: { x: 39, y: 51, w: 14, h: 5.5, rotate: -6, skew: -5 },
      right_bottom: { x: 39, y: 61, w: 14, h: 5.5, rotate: -6, skew: -5 },
      main_front: { x: 75, y: 49, w: 23, h: 8, rotate: 6, skew: 5, opacity: 0.95 },
    },
  },
];

/** Relacion de aspecto de las fotos. Las tres comparten encuadre y escala. */
export const FRAME_RATIO = "2 / 3";
