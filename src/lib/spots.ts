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
