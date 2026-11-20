import { createRouter } from "@cogover/sdk";
import { schemaObjectMetadata } from "../samples/11-schema/object-metadata.js";

/** Samples of `src/samples/11-schema/`, mounted by `src/main.ts` under `/schema`. */
export const schemaRoutes = createRouter();
schemaRoutes.get("/object", schemaObjectMetadata);
