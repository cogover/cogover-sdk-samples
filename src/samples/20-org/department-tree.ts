import type { OrgDepartmentNode, OrgDepartmentsApi, OrgNameDisplay, OrgTreeOptions } from "@cogover/sdk";
import { defineSample } from "../../sample.js";

/**
 * The department tree for an org chart: every root department, or `?rootId=` alone, down to `?depth=`.
 * Below the requested depth `children` is empty while `childIds` still lists the sub-departments, so a
 * client can load more on demand.
 */
export default defineSample({
    id: "org.departments.tree",
    method: "GET",
    path: "/org/departments/tree",
    summary: "org.departments.tree: the department tree with names, from every root or ?rootId=, limited by ?depth=.",
    sdk: ["org.departments.tree", "OrgDepartmentsApi", "OrgTreeOptions", "OrgDepartmentNode", "OrgNameDisplay"],
    file: "src/samples/20-org/department-tree.ts",
    curl: `curl -s "$BASE/org/departments/tree?depth=2"`,
    handler: async ({ org, request }) => {
        const options: OrgTreeOptions = {
            ...(typeof request.query.rootId === "string" ? { rootId: request.query.rootId } : {}),
            ...(typeof request.query.depth === "string" ? { depth: Number(request.query.depth) } : {}),
        };
        const departments: OrgDepartmentsApi = org.departments;
        const roots = await departments.tree({ ...options, withDisplay: true });
        return { roots: roots.map(toChart) };
    },
});

interface ChartNode {
    readonly id: string;
    readonly name: string;
    readonly hasMore: boolean;
    readonly children: readonly ChartNode[];
}

function toChart(node: OrgDepartmentNode<true>): ChartNode {
    const display: OrgNameDisplay | null = node.display;
    return {
        id: node.id,
        name: display?.name ?? node.id,
        hasMore: node.children.length === 0 && node.childIds.length > 0,
        children: node.children.map(toChart),
    };
}
