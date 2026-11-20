import { createRouter } from "@cogover/sdk";
import { routeGroupsCustomer } from "../samples/27-route-groups/customer.js";
import { routeGroupsCustomerOrder } from "../samples/27-route-groups/customer-order.js";
import { routeGroupsCustomerOrders } from "../samples/27-route-groups/customer-orders.js";

/**
 * Samples of `src/samples/27-route-groups/`, mounted by `src/main.ts` under a prefix with a parameter:
 *
 *   GET /                  -> GET /route-groups/customers/:customerId
 *   GET /orders            -> GET /route-groups/customers/:customerId/orders
 *   GET /orders/:orderId   -> GET /route-groups/customers/:customerId/orders/:orderId
 *
 * `:customerId` of the prefix is in `request.params` together with the parameters of the route.
 */
export const routeGroupsRoutes = createRouter();
routeGroupsRoutes.get("/", routeGroupsCustomer);
routeGroupsRoutes.get("/orders", routeGroupsCustomerOrders);
routeGroupsRoutes.get("/orders/:orderId", routeGroupsCustomerOrder);
