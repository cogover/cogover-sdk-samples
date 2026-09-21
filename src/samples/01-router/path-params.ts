import type { ScriptPathParams } from "@cogover/sdk";
import { defineSample } from "../../sample.js";

/**
 * Dynamic path segments. `:orderId` and `:lineNo` are matched after safe route matching and arrive
 * percent-decoded in `request.params`. Static routes take precedence over dynamic ones.
 */
export default defineSample({
    id: "router.path-params",
    method: "GET",
    path: "/router/path-params/:orderId/:lineNo",
    summary: "Dynamic segments `:orderId` and `:lineNo` arrive percent-decoded in request.params.",
    sdk: ["request.params", "ScriptPathParams"],
    file: "src/samples/01-router/path-params.ts",
    curl: `curl -s "$BASE/router/path-params/ORD-1/2"`,
    handler: ({ request }) => {
        const params: ScriptPathParams = request.params;
        // With `noUncheckedIndexedAccess` every parameter is `string | undefined`; matched routes always set them.
        const lineNo = Number(params.lineNo ?? "0");
        return {
            orderId: params.orderId ?? null,
            lineNo: Number.isInteger(lineNo) ? lineNo : null,
            params,
        };
    },
});
