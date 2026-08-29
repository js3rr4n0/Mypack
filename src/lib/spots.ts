import { MIN_INCREMENT, formatMoney } from "./money";

export type SpotName =
  | "main_front"
  | "front_pocket"
  | "left_top"
  | "left_mid"
  | "left_bottom"
  | "right_top"
  | "right_mid"
  | "right_bottom";

/** Foto sobre la que se dibuja el logo en la seccion "Asi se veria". */
export type PhotoView = "front" | "angle";

export interface PhotoPlacement {
  view: PhotoView;
  /** centro del logo, en % del ancho/alto de la foto */
  x: number;
  y: number;
  /** ancho maximo del logo, en % del ancho de la foto */
  w: number;
  /** alto maximo del logo, en % del alto de la foto */
  h: number;
  /** inclinacion para acompañar la perspectiva de la foto */
  rotate?: number;
}

export interface SpotConfig {
  name: SpotName;
  displayName: string;
  description: string;
  positionOrder: number;
  /** precio base en centavos de USD */
  minBid: number;
  premium: boolean;
  /** posicion del hotspot en el modelo 3D (metros) */
  hotspot: [number, number, number];
  /** cara de la mochila, para orientar el logo */
  face: "front" | "left" | "right";
  /** tamano del logo sobre la superficie (ancho, alto) en metros */
  size: [number, number];
  photo: PhotoPlacement;
}

export const SPOTS: SpotConfig[] = [
  {
    name: "main_front",
    displayName: "Panel Frontal",
    description:
      "El billboard. El panel más grande y el que más tiempo pasa a la altura de los ojos.",
    positionOrder: 1,
    minBid: 7_500,
    premium: true,
    hotspot: [0, 0.16, 0.19],
    face: "front",
    size: [0.24, 0.14],
    photo: { view: "front", x: 50, y: 45, w: 30, h: 12 },
  },
  {
    name: "front_pocket",
    displayName: "Bolsillo Frontal",
    description: "Justo bajo el panel principal, sobre el sistema MOLLE.",
    positionOrder: 2,
    minBid: 3_000,
    premium: false,
    hotspot: [0, -0.16, 0.2],
    face: "front",
    size: [0.16, 0.08],
    photo: { view: "front", x: 50, y: 66, w: 22, h: 8 },
  },

  // --- Lateral izquierdo (tres franjas) ---
  {
    name: "left_top",
    displayName: "Lateral Izquierdo · Superior",
    description: "A la altura del hombro. Lo primero que se ve al pasar por un lado.",
    positionOrder: 3,
    minBid: 2_500,
    premium: false,
    hotspot: [-0.325, 0.3, 0],
    face: "left",
    size: [0.15, 0.1],
    photo: { view: "angle", x: 33, y: 33, w: 15, h: 7, rotate: -6 },
  },
  {
    name: "left_mid",
    displayName: "Lateral Izquierdo · Medio",
    description: "El centro del costado. Se ve todo el tiempo en el microbús y el ascensor.",
    positionOrder: 4,
    minBid: 2_000,
    premium: false,
    hotspot: [-0.325, 0.03, 0],
    face: "left",
    size: [0.15, 0.1],
    photo: { view: "angle", x: 32, y: 46, w: 15, h: 7, rotate: -6 },
  },
  {
    name: "left_bottom",
    displayName: "Lateral Izquierdo · Inferior",
    description: "Sobre el MOLLE, junto al bolsillo de botella.",
    positionOrder: 5,
    minBid: 1_800,
    premium: false,
    hotspot: [-0.325, -0.25, 0],
    face: "left",
    size: [0.15, 0.09],
    photo: { view: "angle", x: 35, y: 62, w: 15, h: 7, rotate: -6 },
  },

  // --- Lateral derecho (tres franjas) ---
  {
    name: "right_top",
    displayName: "Lateral Derecho · Superior",
    description: "A la altura del hombro, del lado de la calle.",
    positionOrder: 6,
    minBid: 2_500,
    premium: false,
    hotspot: [0.325, 0.3, 0],
    face: "right",
    size: [0.15, 0.1],
    photo: { view: "angle", x: 67, y: 33, w: 15, h: 7, rotate: 6 },
  },
  {
    name: "right_mid",
    displayName: "Lateral Derecho · Medio",
    description: "El centro del costado derecho. Visible al caminar por la acera.",
    positionOrder: 7,
    minBid: 2_000,
    premium: false,
    hotspot: [0.325, 0.03, 0],
    face: "right",
    size: [0.15, 0.1],
    photo: { view: "angle", x: 68, y: 46, w: 15, h: 7, rotate: 6 },
  },
  {
    name: "right_bottom",
    displayName: "Lateral Derecho · Inferior",
    description: "Sobre el MOLLE del lado del bolsillo de botella.",
    positionOrder: 8,
    minBid: 1_800,
    premium: false,
    hotspot: [0.325, -0.25, 0],
    face: "right",
    size: [0.15, 0.09],
    photo: { view: "angle", x: 65, y: 62, w: 15, h: 7, rotate: 6 },
  },
];

/** Zonas que existieron antes y ya no se venden. La base las limpia al sembrar. */
export const RETIRED_SPOTS = ["top_flap", "top_handle", "left_side", "right_side"];

export const SPOT_BY_NAME = Object.fromEntries(
  SPOTS.map((s) => [s.name, s])
) as Record<SpotName, SpotConfig>;

/** Lo que hay que pagar para tomar una zona ahora mismo. */
export function nextBidAmount(currentPrice: number, minBid: number): number {
  if (!currentPrice || currentPrice <= 0) return minBid;
  return currentPrice + MIN_INCREMENT;
}

export { MIN_INCREMENT };
export { formatMoney };
