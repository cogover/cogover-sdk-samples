import type { CogoverRecordId } from "@cogover/sdk";
import { defineSample } from "../../sample.js";

/**
 * Walks through several pages with the opaque cursor. Every page is one capability call, so keep
 * `maxPages` small in production code and stop when `nextCursor` is absent. The last page may come
 * back empty: a cursor does not promise more records.
 */
export default defineSample({
    id: "records.list-paging",
    method: "GET",
    path: "/records/list-paging",
    summary: "Follow records.list() cursors page by page until nextCursor is absent (bounded by maxPages).",
    sdk: ["records.list", "RecordPage.nextCursor", "CogoverRecordId"],
    file: "src/samples/04-records-read/list-paging.ts",
    curl: `curl -s "$BASE/records/list-paging?pageSize=2&maxPages=3"`,
    handler: async ({ request, data, log }) => {
        const pageSize = Math.min(Math.max(Number(request.query.pageSize ?? "2") || 2, 1), 200);
        const maxPages = Math.min(Math.max(Number(request.query.maxPages ?? "3") || 3, 1), 10);

        const orders = data.object("sample_order");
        const ids: CogoverRecordId[] = [];
        let cursor: string | undefined;
        let pages = 0;
        do {
            const page = await orders.records.list({
                fields: ["name"],
                orderBy: [orders.fields.created.asc()],
                limit: pageSize,
                ...(cursor === undefined ? {} : { cursor }),
            });
            pages += 1;
            ids.push(...page.items.map(item => item.id));
            cursor = page.nextCursor;
            log.debug("Fetched a page", { page: pages, items: page.items.length, hasMore: cursor !== undefined });
        } while (cursor !== undefined && pages < maxPages);

        return { pages, pageSize, collected: ids.length, ids, stoppedBecause: cursor === undefined ? "no more pages" : "maxPages reached" };
    },
});
