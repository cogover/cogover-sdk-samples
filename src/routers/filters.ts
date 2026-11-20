import { createRouter } from "@cogover/sdk";
import { filtersAndOr } from "../samples/06-filters/and-or.js";
import { filtersOperators } from "../samples/06-filters/operators.js";
import { filtersRawExpression } from "../samples/06-filters/raw-expression.js";
import { filtersSort } from "../samples/06-filters/sort.js";
import { filtersSystemFields } from "../samples/06-filters/system-fields.js";

/** Samples of `src/samples/06-filters/`, mounted by `src/main.ts` under `/filters`. */
export const filtersRoutes = createRouter();
filtersRoutes.get("/operators", filtersOperators);
filtersRoutes.get("/and-or", filtersAndOr);
filtersRoutes.get("/sort", filtersSort);
filtersRoutes.get("/system-fields", filtersSystemFields);
filtersRoutes.post("/raw-expression", filtersRawExpression);
