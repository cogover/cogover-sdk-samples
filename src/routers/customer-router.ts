import { createRouter } from "@cogover/sdk";
import customer from "../samples/27-route-groups/customer.js";
import customerOrder from "../samples/27-route-groups/customer-order.js";
import customerOrders from "../samples/27-route-groups/customer-orders.js";

/**
 * A group of routes in its own router (`@cogover/sdk` 0.18.0). `src/main.ts` mounts it with
 * `router.route("/route-groups/customers/:customerId", customerRouter)`:
 *
 *   GET /                  -> GET /route-groups/customers/:customerId
 *   GET /orders            -> GET /route-groups/customers/:customerId/orders
 *   GET /orders/:orderId   -> GET /route-groups/customers/:customerId/orders/:orderId
 *
 * The file only creates the router and registers routes; the handlers live in `src/samples/27-route-groups/` and
 * only `src/main.ts` imports this file. That is the shape the SDK usage guide asks for in "Keep the module fast to
 * load". This repository does not set `entryPointParts`: its other routes are registered on the main router, which
 * loads the whole module anyway.
 *
 * `router.route()` needs a Workspace whose Runtime supports it. A Workspace builds the project with the SDK of its
 * own Runtime, so publishing this project to a Workspace that does not support it yet fails.
 */
export const customerRouter = createRouter();
customerRouter.get("/", customer.handler);
customerRouter.get("/orders", customerOrders.handler);
customerRouter.get("/orders/:orderId", customerOrder.handler);
