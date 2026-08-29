import { MIN_INCREMENT, formatMoney } from "./money";

export type SpotName =
  | "top_flap"
  | "main_front"
  | "front_pocket"
  | "left_side"
  | "right_side"
  | "top_handle";

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
  /** normal de la superficie, para orientar el decal del logo */
  face: "front" | "back" | "left" | "right" | "top";
  /** tamano del logo sobre la superficie (ancho, alto) en metros */
  size: [number, number];
}

export const SPOTS: SpotConfig[] = [
  {
    name: "top_flap",
    displayName: "Solapa Superior",
    description:
      "La primera cosa que ve alguien detras de mi en la fila del cafe. Visibilidad maxima.",
    positionOrder: 1,
    minBid: 5_000,
    premium: true,
    hotspot: [0, 0.62, 0.17],
    face: "front",
    size: [0.2, 0.09],
  },
  {
    name: "main_front",
    displayName: "Panel Frontal",
    description:
      "El billboard. El panel mas grande y el que mas tiempo pasa a la altura de los ojos.",
    positionOrder: 2,
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
    positionOrder: 3,
    minBid: 3_000,
    premium: false,
    hotspot: [0, -0.16, 0.2],
    face: "front",
    size: [0.16, 0.08],
  },
  {
    name: "left_side",
    displayName: "Lateral Izquierdo",
    description: "Se ve todo el tiempo en el bus, el metro y el ascensor.",
    positionOrder: 4,
    minBid: 2_000,
    premium: false,
    hotspot: [-0.16, 0.1, 0],
    face: "left",
    size: [0.14, 0.09],
  },
  {
    name: "right_side",
    displayName: "Lateral Derecho",
    description: "El lado del bolsillo de botella. Visible al caminar por la calle.",
    positionOrder: 5,
    minBid: 2_000,
    premium: false,
    hotspot: [0.16, 0.1, 0],
    face: "right",
    size: [0.14, 0.09],
  },
  {
    name: "top_handle",
    displayName: "Zona del Asa",
    description: "Pequena pero se ve en cada foto y cada vez que levanto la mochila.",
    positionOrder: 6,
    minBid: 1_200,
    premium: false,
    hotspot: [0, 0.78, 0.02],
    face: "top",
    size: [0.1, 0.045],
  },
];

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
