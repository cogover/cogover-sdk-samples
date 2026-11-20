import { createRouter } from "@cogover/sdk";
import { legacyCreateGreeting } from "../samples/15-legacy/create-greeting.js";

/** Samples of `src/samples/15-legacy/`, mounted by `src/main.ts` under `/legacy`. */
export const legacyRoutes = createRouter();
legacyRoutes.get("/create-greeting", legacyCreateGreeting);
