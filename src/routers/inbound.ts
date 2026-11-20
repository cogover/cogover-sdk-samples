import { createRouter } from "@cogover/sdk";
import { inboundHooksOrderEvents } from "../samples/19-inbound/hooks-order-events.js";
import { inboundHooksPing } from "../samples/19-inbound/hooks-ping.js";

/** Samples of `src/samples/19-inbound/`, mounted by `src/main.ts` under `/hooks`. */
export const inboundRoutes = createRouter();
inboundRoutes.post("/ping", inboundHooksPing);
inboundRoutes.post("/order-events", inboundHooksOrderEvents);
