import { createRouter } from "@cogover/sdk";
import { recordsAggregate } from "../samples/04-records-read/aggregate.js";
import { recordsAggregateGroup } from "../samples/04-records-read/aggregate-group.js";
import { recordsExpandLookups } from "../samples/04-records-read/expand-lookups.js";
import { recordsExpandLookupsFields } from "../samples/04-records-read/expand-lookups-fields.js";
import { recordsFieldsAll } from "../samples/04-records-read/fields-all.js";
import { recordsGet } from "../samples/04-records-read/get.js";
import { recordsGetMany } from "../samples/04-records-read/get-many.js";
import { recordsList } from "../samples/04-records-read/list.js";
import { recordsListPaging } from "../samples/04-records-read/list-paging.js";

/** Samples of `src/samples/04-records-read/`, mounted by `src/main.ts` under `/records`. */
export const recordsReadRoutes = createRouter();
recordsReadRoutes.get("/get/:recordId", recordsGet);
recordsReadRoutes.post("/get-many", recordsGetMany);
recordsReadRoutes.get("/list", recordsList);
recordsReadRoutes.get("/list-paging", recordsListPaging);
recordsReadRoutes.get("/fields-all/:recordId", recordsFieldsAll);
recordsReadRoutes.get("/expand-lookups", recordsExpandLookups);
recordsReadRoutes.get("/expand-lookups/fields", recordsExpandLookupsFields);
recordsReadRoutes.get("/aggregate", recordsAggregate);
recordsReadRoutes.get("/aggregate/by-customer", recordsAggregateGroup);
