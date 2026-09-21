import { NotFoundError } from "@cogover/sdk";
import { defineSample } from "../../sample.js";

/**
 * An SDK error that escapes the handler becomes an HTTP error with `r` equal to the status, the
 * SDK `code` and a safe `msg`; Cogover never returns internal details. (The local server of this
 * repository echoes the message of unknown codes to help debugging.) `NotFoundError` maps to 404.
 */
export default defineSample({
    id: "errors.not-found",
    method: "GET",
    path: "/errors/not-found/:recordId",
    summary: "Throw NotFoundError when a record is missing: Cogover answers HTTP 404 with code NOT_FOUND.",
    sdk: ["NotFoundError"],
    file: "src/samples/13-errors/not-found.ts",
    curl: `curl -s -i "$BASE/errors/not-found/missing-id"`,
    handler: async ({ request, data }) => {
        const recordId = request.params.recordId ?? "";
        const order = await data.object("sample_order").records.get(recordId, { fields: ["name"] });
        if (order === null) throw new NotFoundError("sample_order", recordId, "The requested order does not exist.");
        return { id: order.id, name: order.fields.name };
    },
});
