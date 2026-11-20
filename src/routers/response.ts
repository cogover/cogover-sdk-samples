import { createRouter } from "@cogover/sdk";
import { responseBytes } from "../samples/02-response/bytes.js";
import { responseEmpty } from "../samples/02-response/empty.js";
import { responseJsonStatus } from "../samples/02-response/json-status.js";
import { responseRedirect } from "../samples/02-response/redirect.js";
import { responseText } from "../samples/02-response/text.js";

/** Samples of `src/samples/02-response/`, mounted by `src/main.ts` under `/response`. */
export const responseRoutes = createRouter();
responseRoutes.post("/json", responseJsonStatus);
responseRoutes.get("/text", responseText);
responseRoutes.get("/bytes", responseBytes);
responseRoutes.delete("/empty", responseEmpty);
responseRoutes.get("/redirect", responseRedirect);
