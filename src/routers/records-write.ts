import { createRouter } from "@cogover/sdk";
import { recordsBatchInsert } from "../samples/05-records-write/batch-insert.js";
import { recordsBatchUpdate } from "../samples/05-records-write/batch-update.js";
import { recordsCreate } from "../samples/05-records-write/create.js";
import { recordsDeleteMany } from "../samples/05-records-write/delete-many.js";
import { recordsFieldValues } from "../samples/05-records-write/field-values.js";
import { recordsLookupReference } from "../samples/05-records-write/lookup-reference.js";
import { recordsParallelWrites } from "../samples/05-records-write/parallel-writes.js";
import { recordsUpdate } from "../samples/05-records-write/update.js";
import { recordsUpsert } from "../samples/05-records-write/upsert.js";

/** Samples of `src/samples/05-records-write/`, mounted by `src/main.ts` under `/records`. */
export const recordsWriteRoutes = createRouter();
recordsWriteRoutes.post("/create", recordsCreate);
recordsWriteRoutes.patch("/update/:recordId", recordsUpdate);
recordsWriteRoutes.post("/batch-insert", recordsBatchInsert);
recordsWriteRoutes.post("/batch-update", recordsBatchUpdate);
recordsWriteRoutes.post("/upsert", recordsUpsert);
recordsWriteRoutes.delete("/delete-many", recordsDeleteMany);
recordsWriteRoutes.post("/lookup-reference", recordsLookupReference);
recordsWriteRoutes.post("/field-values", recordsFieldValues);
recordsWriteRoutes.post("/parallel-writes", recordsParallelWrites);
