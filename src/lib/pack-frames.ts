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
    // Perfil izquierdo: se ve el costado completo, no el panel frontal.
    src: "/pack/360/01.jpg",
    label: "Left side",
    zones: {
      left_top: { x: 30, y: 37, w: 17, h: 6, rotate: 2, skew: 2 },
      left_mid: { x: 38, y: 46, w: 16, h: 6, rotate: 2, skew: 2 },
      left_bottom: { x: 37, y: 69, w: 17, h: 6, rotate: 2, skew: 2 },
    },
  },
  {
    // Frente plano.
    src: "/pack/360/02.jpg",
    label: "Front",
    zones: {
      main_front: { x: 49, y: 50, w: 30, h: 10 },
      front_pocket: { x: 49, y: 72, w: 24, h: 6 },
    },
  },
  {
    // Perfil derecho.
    src: "/pack/360/03.jpg",
    label: "Right side",
    zones: {
      right_top: { x: 36, y: 28, w: 17, h: 6, rotate: -1, skew: -2 },
      right_mid: { x: 38, y: 48, w: 16, h: 6, rotate: -1, skew: -2 },
      right_bottom: { x: 39, y: 75, w: 17, h: 6, rotate: -1, skew: -2 },
    },
  },
];

/** Relacion de aspecto de las fotos. Las tres comparten encuadre y escala. */
export const FRAME_RATIO = "2 / 3";
