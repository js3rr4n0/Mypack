import "dotenv/config";
import { db, spots } from "./index";
import { SPOTS, minBidOf } from "../lib/spots";

async function main() {
  for (const spot of SPOTS) {
    await db
      .insert(spots)
      .values({
        name: spot.name,
        displayName: spot.displayName,
        description: spot.description,
        positionOrder: spot.positionOrder,
        minBid: minBidOf(spot),
        currentPrice: 0,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: spots.name,
        set: {
          displayName: spot.displayName,
          description: spot.description,
          positionOrder: spot.positionOrder,
          minBid: minBidOf(spot),
        },
      });
    console.log(`✓ ${spot.name}`);
  }
  console.log("Listo: 6 zonas sembradas.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
