import { createRouter } from "@cogover/sdk";
import { catalog } from "../catalog.js";

/** The catalog, mounted by `src/main.ts` under `/`: its route `/` answers at the project URL itself. */
export const catalogRoutes = createRouter();
catalogRoutes.get("/", catalog);
