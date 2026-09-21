import { defineSample } from "../../sample.js";

/** `response.text()` sends `text/plain; charset=utf-8`; the body must be a string. */
export default defineSample({
    id: "response.text",
    method: "GET",
    path: "/response/text",
    summary: "response.text(): a plain-text body with an optional status and headers.",
    sdk: ["response.text"],
    file: "src/samples/02-response/text.ts",
    curl: `curl -s -i "$BASE/response/text"`,
    handler: ({ response }) => response.text("Plain text from a Cogover route.\n", {
        headers: { "cache-control": "no-store" },
    }),
});
