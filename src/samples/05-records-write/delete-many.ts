import { ValidationError } from "@cogover/sdk";
import type { CogoverRecordId, DeleteResult } from "@cogover/sdk";
import { defineSample } from "../../sample.js";

const OBJECTS = ["sample_order", "sample_customer"] as const;
type DemoObject = (typeof OBJECTS)[number];
const isDemoObject = (value: unknown): value is DemoObject => (OBJECTS as readonly unknown[]).includes(value);

interface Input {
    readonly ids?: unknown;
    readonly object?: unknown;
}

/**
 * Deletes records by ID. `deleted` lists what was removed; `notDeleted` lists IDs the caller could
 * not delete, for example records refused by a before-change trigger such as
 * `src/triggers/before-change-block-delete.ts`. An ID that does not exist may appear in neither
 * list, so compare `deleted` with the request instead of relying on `notDeleted` alone.
 * `object` defaults to `sample_order`; pass `sample_customer` to clean up customers.
 */
export default defineSample<Input>({
    id: "records.delete-many",
    method: "DELETE",
    path: "/records/delete-many",
    summary: "records.deleteMany(ids): delete orders (or customers with object: \"sample_customer\"); compare deleted with the request.",
    sdk: ["records.deleteMany", "DeleteResult"],
    file: "src/samples/05-records-write/delete-many.ts",
    curl: `curl -s -X DELETE "$BASE/records/delete-many" -H "Content-Type: application/json" --data '{"ids":["<recordId1>","<recordId2>"],"object":"sample_order"}'`,
    handler: async ({ request, data, log }) => {
        const { ids, object } = request.body;
        if (!Array.isArray(ids) || ids.length === 0 || !ids.every((id): id is string => typeof id === "string" && id.trim().length > 0)) {
            throw new ValidationError("ids must be a non-empty array of record IDs");
        }
        const target: DemoObject = object === undefined ? "sample_order" : isDemoObject(object) ? object : (() => {
            throw new ValidationError(`object must be one of ${OBJECTS.join(", ")}`);
        })();

        const result: DeleteResult = await data.object(target).records.deleteMany(ids as CogoverRecordId[]);
        const reported = new Set<string>([...result.deleted, ...result.notDeleted]);
        const unknown = ids.filter(id => !reported.has(id));
        if (result.notDeleted.length > 0) log.warn("Some records were not deleted", { object: target, ids: result.notDeleted });
        return { object: target, requested: ids.length, deleted: result.deleted, notDeleted: result.notDeleted, unknown };
    },
});
