import type { InboundInvocationContext } from "@cogover/sdk";
import { defineSample } from "../../sample.js";

/**
 * A webhook route. An administrator creates an inbound access (`cogover-dev inbound create ping`)
 * and the external system calls `https://<workspace>/api/v1/ts-projects/<slug>/hooks/<inboundId>/ping`
 * with the inbound key or an HMAC signature. Cogover verifies it before any code runs; the handler
 * sees `request.path === "/hooks/ping"` and `invocation.identity === "inbound"`. Register webhook
 * routes under `/hooks/`. Called through the normal project URL (or the local server), the identity
 * is a user, and this sample answers 403 to show the guard.
 */
export default defineSample({
    id: "inbound.hooks-ping",
    method: "POST",
    path: "/hooks/ping",
    summary: "A webhook route under /hooks/: accept only inbound calls and echo invocation.inbound and the raw body.",
    sdk: ["InboundInvocationContext", "invocation.inbound", "request.rawBody", "request.contentType"],
    file: "src/samples/19-inbound/hooks-ping.ts",
    curl: `curl -s -i -X POST "$BASE/hooks/ping" -H "Content-Type: application/json" --data '{"hello":"webhook"}'   # 403 here; 200 through /hooks/<inboundId>/ping with the inbound key`,
    handler: ({ invocation, request, response }) => {
        if (invocation.identity !== "inbound") {
            return response.json({
                r: 403,
                msg: "This route accepts inbound webhook calls only: use the /hooks/{inboundId}/ping URL with the inbound key.",
                identity: invocation.identity,
            }, { status: 403 });
        }
        const inbound: InboundInvocationContext = invocation;
        return {
            received: true,
            inbound: inbound.inbound,
            contentType: request.contentType ?? null,
            rawBodyLength: request.rawBody?.length ?? 0,
            body: request.body,
        };
    },
});
