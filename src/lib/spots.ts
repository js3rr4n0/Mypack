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
    displayName: "Front Panel",
    description:
      "The billboard. The biggest panel, and the one that spends the most time at eye level.",
    positionOrder: 1,
    minBid: 7_500,
    premium: true,
    hotspot: [0, 0.15, 0.21],
    face: "front",
    size: [0.34, 0.26],
  },
  {
    name: "front_pocket",
    displayName: "Front Pocket",
    description: "Right below the main panel, dead center of the front.",
    positionOrder: 2,
    minBid: 3_000,
    premium: false,
    hotspot: [0, -0.15, 0.21],
    face: "front",
    size: [0.34, 0.26],
  },

  // --- Lateral izquierdo (tres franjas) ---
  {
    name: "left_top",
    displayName: "Left Side · Top",
    description: "Shoulder height. The first thing you see walking past me.",
    positionOrder: 3,
    minBid: 2_500,
    premium: false,
    hotspot: [-0.325, 0.3, 0],
    face: "left",
    size: [0.19, 0.18],
  },
  {
    name: "left_mid",
    displayName: "Left Side · Middle",
    description: "Dead center of the flank. On show all day in the bus and the elevator.",
    positionOrder: 4,
    minBid: 2_000,
    premium: false,
    hotspot: [-0.325, 0.03, 0],
    face: "left",
    size: [0.19, 0.18],
  },
  {
    name: "left_bottom",
    displayName: "Left Side · Bottom",
    description: "On the MOLLE, next to the bottle pocket.",
    positionOrder: 5,
    // Precio de prueba: $1 para poder hacer un pago real de punta a punta.
    // Subir a 1_800 ($18) cuando la prueba este hecha.
    minBid: 100,
    premium: false,
    hotspot: [-0.325, -0.25, 0],
    face: "left",
    size: [0.19, 0.18],
  },

  // --- Lateral derecho (tres franjas) ---
  {
    name: "right_top",
    displayName: "Right Side · Top",
    description: "Shoulder height, on the street side.",
    positionOrder: 6,
    minBid: 2_500,
    premium: false,
    hotspot: [0.325, 0.3, 0],
    face: "right",
    size: [0.19, 0.18],
  },
  {
    name: "right_mid",
    displayName: "Right Side · Middle",
    description: "Center of the right flank. In full view on the sidewalk.",
    positionOrder: 7,
    minBid: 2_000,
    premium: false,
    hotspot: [0.325, 0.03, 0],
    face: "right",
    size: [0.19, 0.18],
  },
  {
    name: "right_bottom",
    displayName: "Right Side · Bottom",
    description: "On the MOLLE, bottle-pocket side.",
    positionOrder: 8,
    minBid: 1_800,
    premium: false,
    hotspot: [0.325, -0.25, 0],
    face: "right",
    size: [0.19, 0.18],
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
