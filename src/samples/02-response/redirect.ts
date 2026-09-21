import { defineSample } from "../../sample.js";

/** `response.redirect(location, status?)` sets the `location` header; the status defaults to 302. */
export default defineSample({
    id: "response.redirect",
    method: "GET",
    path: "/response/redirect",
    summary: "response.redirect(): a 302 (or 301/303/307/308) redirect to an absolute or relative location.",
    sdk: ["response.redirect"],
    file: "src/samples/02-response/redirect.ts",
    curl: `curl -s -i "$BASE/response/redirect"   # add ?permanent=true for a 301`,
    handler: ({ request, response }) => {
        const permanent = request.query.permanent === "true";
        return response.redirect("https://www.npmjs.com/package/@cogover/sdk", permanent ? 301 : 302);
    },
});
