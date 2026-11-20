import type { FieldSelection, FilterCondition, WorkspaceObjects } from "@cogover/sdk";
import type { SampleHandler, SampleInfo } from "../../sample.js";

type OrderFields = WorkspaceObjects["sample_order"];

const ORDER_FIELDS = ["name", "status", "total"] as const satisfies FieldSelection<OrderFields>;

/**
 * The route `/orders` of `routeGroupsRoutes`, mounted under `/route-groups/customers/:customerId`: the orders of the
 * customer named by the prefix. A handler of a mounted router is an ordinary route handler; it gets the same
 * `data`, `request` and identity as a route registered on the main router, and no extra permission.
 */
export default {
    id: "routeGroups.customer-orders",
    method: "GET",
    path: "/route-groups/customers/:customerId/orders",
    summary: "A route of the mounted router: list the orders of the customer named by the prefix parameter :customerId.",
    sdk: ["router.route", "request.params", "records.list", "FilterCondition"],
    file: "src/samples/27-route-groups/customer-orders.ts",
    curl: `curl -s "$BASE/route-groups/customers/<customerId>/orders?limit=5"`,
} satisfies SampleInfo;

export const routeGroupsCustomerOrders: SampleHandler = async ({ request, data }) => {
    const customerId = request.params.customerId ?? "";
    const rawLimit = typeof request.query.limit === "string" ? Number(request.query.limit) : 10;
    const limit = Number.isInteger(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 50) : 10;

    const orders = data.object("sample_order");
    const ofCustomer: FilterCondition = { kind: "condition", field: "customer", operator: "=", value: customerId };
    const page = await orders.records.list({
        fields: ORDER_FIELDS,
        where: ofCustomer,
        orderBy: [orders.fields.created.desc()],
        limit,
    });
    return {
        customerId,
        total: page.total,
        count: page.items.length,
        items: page.items.map(item => ({ id: item.id, ...item.fields })),
    };
};
