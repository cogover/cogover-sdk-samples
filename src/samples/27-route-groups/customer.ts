import { NotFoundError } from "@cogover/sdk";
import type { FieldSelection, WorkspaceObjects } from "@cogover/sdk";
import type { SampleHandler, SampleInfo } from "../../sample.js";

type CustomerFields = WorkspaceObjects["sample_customer"];

const CUSTOMER_FIELDS = ["name", "tier", "email"] as const satisfies FieldSelection<CustomerFields>;

/**
 * The route `/` of the child router `routeGroupsRoutes` (`src/routers/route-groups.ts`). `src/main.ts` mounts it with
 * `router.route("/route-groups/customers/:customerId", routeGroupsRoutes)`, so this route answers at the prefix itself.
 * The prefix parameter `customerId` arrives in `request.params` like a parameter of the route.
 *
 * `router.route()` needs `@cogover/sdk` 0.18.0 or later and a Workspace whose Runtime supports it: a Workspace builds
 * the project with the SDK of its own Runtime, so publishing to a Workspace that does not support it yet fails.
 */
export default {
    id: "routeGroups.customer",
    method: "GET",
    path: "/route-groups/customers/:customerId",
    summary: "router.route(prefix, childRouter): the child route `/` answers at the prefix, whose :customerId is in request.params.",
    sdk: ["router.route", "createRouter", "request.params", "records.get"],
    file: "src/samples/27-route-groups/customer.ts",
    curl: `curl -s "$BASE/route-groups/customers/<customerId>"`,
} satisfies SampleInfo;

export const routeGroupsCustomer: SampleHandler = async ({ request, data }) => {
    const customerId = request.params.customerId ?? "";
    const customer = await data.object("sample_customer").records.get(customerId, { fields: CUSTOMER_FIELDS });
    if (customer === null) throw new NotFoundError("sample_customer", customerId);
    return {
        id: customer.id,
        fields: customer.fields,
        // The full path, prefix included: mounting changes where a route answers, not what the handler sees.
        path: request.path,
        params: request.params,
        orders: `${request.path}/orders`,
    };
};
