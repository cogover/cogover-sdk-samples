import { createRouter } from "@cogover/sdk";
import { errorsCatchApiError } from "../samples/13-errors/catch-api-error.js";
import { errorsMapping } from "../samples/13-errors/error-mapping.js";
import { errorsNotFound } from "../samples/13-errors/not-found.js";
import { errorsValidation } from "../samples/13-errors/validation.js";

/** Samples of `src/samples/13-errors/`, mounted by `src/main.ts` under `/errors`. */
export const errorsRoutes = createRouter();
errorsRoutes.get("/catch/:recordId", errorsCatchApiError);
errorsRoutes.get("/not-found/:recordId", errorsNotFound);
errorsRoutes.post("/validation", errorsValidation);
errorsRoutes.get("/mapping/:name", errorsMapping);
