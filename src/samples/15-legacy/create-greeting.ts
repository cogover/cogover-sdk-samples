import { createGreeting } from "@cogover/sdk";
import { defineSample } from "../../sample.js";

/** Compatibility helper kept from SDK 0.1.x; it is not part of the data APIs. */
export default defineSample({
    id: "legacy.create-greeting",
    method: "GET",
    path: "/legacy/create-greeting",
    summary: "createGreeting(name): the SDK 0.1.x compatibility helper.",
    sdk: ["createGreeting"],
    file: "src/samples/15-legacy/create-greeting.ts",
    curl: `curl -s "$BASE/legacy/create-greeting?name=Ada"`,
    handler: ({ request }) => ({
        greeting: createGreeting(typeof request.query.name === "string" ? request.query.name : "Cogover"),
    }),
});
