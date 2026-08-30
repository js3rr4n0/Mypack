import type { SpotName } from "./spots";

export interface BrandView {
  id: number;
  name: string;
  logo: string | null;
  website: string | null;
  twitter: string | null;
  instagram: string | null;
}

export interface SpotView {
  id: number;
  name: SpotName;
  displayName: string;
  description: string | null;
  positionOrder: number;
  minBid: number;
  currentPrice: number;
  isActive: boolean | null;
  nextBid: number;
  brand: BrandView | null;
}

export interface RecentClaim {
  spot: string | null;
  brand: string | null;
  amount: number | null;
  at: string | Date | null;
}
