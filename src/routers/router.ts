import { createRouter } from "@cogover/sdk";
import { routerBody } from "../samples/01-router/body.js";
import { routerHeaders } from "../samples/01-router/headers.js";
import { routerHello } from "../samples/01-router/hello.js";
import { routerInputVsBody } from "../samples/01-router/input-vs-body.js";
import { routerPathParams } from "../samples/01-router/path-params.js";
import { routerQuery } from "../samples/01-router/query.js";

/** Samples of `src/samples/01-router/`, mounted by `src/main.ts` under `/router`. */
export const routerRoutes = createRouter();
routerRoutes.get("/hello", routerHello);
routerRoutes.get("/path-params/:orderId/:lineNo", routerPathParams);
routerRoutes.get("/query", routerQuery);
routerRoutes.get("/headers", routerHeaders);
routerRoutes.post("/body", routerBody);
routerRoutes.post("/input-vs-body", routerInputVsBody);
