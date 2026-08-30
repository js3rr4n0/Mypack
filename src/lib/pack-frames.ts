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
    // Costado izquierdo, foto real: los tirantes quedan a la izquierda.
    src: "/pack/360/01.jpg",
    label: "Left side",
    zones: {
      left_top: { x: 53, y: 35.6, w: 18.3, h: 14.5, rotate: 1, skew: 1 },
      left_mid: { x: 53, y: 49.5, w: 18.3, h: 14.5, rotate: 1, skew: 1 },
      left_bottom: { x: 55.6, y: 76, w: 23.2, h: 20.6, rotate: 1, skew: 1 },
    },
  },
  {
    // Frente plano.
    src: "/pack/360/02.jpg",
    label: "Front",
    zones: {
      main_front: { x: 50.6, y: 46, w: 40.1, h: 22.4 },
      front_pocket: { x: 50.6, y: 69.4, w: 40.1, h: 22.8 },
    },
  },
  {
    // Costado derecho, foto real: los tirantes quedan a la derecha.
    src: "/pack/360/03.jpg",
    label: "Right side",
    zones: {
      right_top: { x: 46.9, y: 23, w: 16, h: 12, rotate: -1, skew: -1 },
      right_mid: { x: 42, y: 65, w: 20.4, h: 15.5, rotate: -1, skew: -1 },
      right_bottom: { x: 42.9, y: 82, w: 22.2, h: 14, rotate: -1, skew: -1 },
    },
  },
];

/** Relacion de aspecto de las fotos. Las tres comparten encuadre y escala. */
export const FRAME_RATIO = "2 / 3";
