import type { SampleHandler, SampleInfo } from "../../sample.js";

/**
 * The smallest route. A handler returns any JSON-serializable value and Cogover answers
 * `200 application/json`. Routes are registered with `router.get(...)`/`router.addRoute(...)`
 * on a router created with `createRouter()`: here the router of this area, `src/routers/router.ts`, which
 * `src/main.ts` mounts under `/router` and turns into the project handler with `router.toHandler()`.
 */
export default {
    id: "router.hello",
    method: "GET",
    path: "/router/hello",
    summary: "The smallest route: return a plain object and Cogover sends it as JSON with status 200.",
    sdk: ["createRouter", "router.get", "router.addRoute", "router.toHandler", "ScriptHandler"],
    file: "src/samples/01-router/hello.ts",
    curl: `curl -s "$BASE/router/hello"`,
} satisfies SampleInfo;

export const routerHello: SampleHandler = () => ({ message: "Hello from @cogover/sdk", sentAt: new Date().toISOString() });
