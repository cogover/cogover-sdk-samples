import { defineSample } from "../../sample.js";

/**
 * The smallest route. A handler returns any JSON-serializable value and Cogover answers
 * `200 application/json`. Routes are registered with `router.get(...)`/`router.addRoute(...)`
 * on the router created in `src/main.ts`.
 */
export default defineSample({
    id: "router.hello",
    method: "GET",
    path: "/router/hello",
    summary: "The smallest route: return a plain object and Cogover sends it as JSON with status 200.",
    sdk: ["createRouter", "router.get", "router.addRoute", "router.toHandler", "ScriptHandler"],
    file: "src/samples/01-router/hello.ts",
    curl: `curl -s "$BASE/router/hello"`,
    handler: () => ({ message: "Hello from @cogover/sdk", sentAt: new Date().toISOString() }),
});
