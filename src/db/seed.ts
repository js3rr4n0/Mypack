import "dotenv/config";
import { db, spots } from "./index";
import { SPOTS, RETIRED_SPOTS } from "../lib/spots";

async function main() {
  for (const spot of SPOTS) {
    await db
      .insert(spots)
      .values({
        name: spot.name,
        displayName: spot.displayName,
        description: spot.description,
        positionOrder: spot.positionOrder,
        minBid: spot.minBid,
        currentPrice: 0,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: spots.name,
        set: {
          displayName: spot.displayName,
          description: spot.description,
          positionOrder: spot.positionOrder,
          minBid: spot.minBid,
        },
      });
    console.log(`✓ ${spot.name}`);
  }
  // Las zonas retiradas se desactivan, no se borran: pueden tener pujas
  // historicas apuntando a ellas y el FK lo impediria.
  if (RETIRED_SPOTS.length) {
    const { inArray } = await import("drizzle-orm");
    const removed = await db
      .update(spots)
      .set({ isActive: false })
      .where(inArray(spots.name, RETIRED_SPOTS))
      .returning({ name: spots.name });
    for (const r of removed) console.log(`- ${r.name} (retirada)`);
  }

  console.log(`Listo: ${SPOTS.length} zonas sembradas.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
