import { createRouter } from "@cogover/sdk";
import { secretsGet } from "../samples/17-secrets/get.js";

/** Samples of `src/samples/17-secrets/`, mounted by `src/main.ts` under `/secrets`. */
export const secretsRoutes = createRouter();
secretsRoutes.get("/get/:name", secretsGet);
