import { NotFoundError } from "@cogover/sdk";
import type { FieldSelection, WorkspaceObjects } from "@cogover/sdk";
import { defineMountedSample } from "../../sample.js";

type OrderFields = WorkspaceObjects["sample_order"];

const ORDER_FIELDS = ["name", "status", "total", "customer"] as const satisfies FieldSelection<OrderFields>;

/**
 * The route `/orders/:orderId` of `customerRouter`. `request.params` holds the parameter of the prefix
 * (`customerId`) and the one of the route (`orderId`) together, which is why the two must have different names.
 * An order of another customer answers 404, so the URL cannot reach it through the wrong customer.
 */
export default defineMountedSample({
    id: "routeGroups.customer-order",
    method: "GET",
    path: "/route-groups/customers/:customerId/orders/:orderId",
    summary: "Prefix and route parameters together: read one order of the customer; 404 when it belongs to another customer.",
    sdk: ["router.route", "request.params", "records.get", "NotFoundError"],
    file: "src/samples/27-route-groups/customer-order.ts",
    curl: `curl -s "$BASE/route-groups/customers/<customerId>/orders/<orderId>"`,
    handler: async ({ request, data }) => {
        const customerId = request.params.customerId ?? "";
        const orderId = request.params.orderId ?? "";
        const order = await data.object("sample_order").records.get(orderId, { fields: ORDER_FIELDS });
        if (order === null || order.fields.customer?.id !== customerId) throw new NotFoundError("sample_order", orderId);
        return {
            params: request.params,
            path: request.path,
            order: { id: order.id, name: order.fields.name, status: order.fields.status, total: order.fields.total },
        };
    },
});
