import assert from "node:assert/strict";
import test, { after, before, describe } from "node:test";
import type { InvocationContext } from "@cogover/sdk";
import handler, { triggers } from "../src/main.js";
import { samples } from "../src/samples/index.js";
import { startLocalServer, type StartedLocalServer } from "./local-server.js";

/**
 * Exercises the catalog and every sample that needs no Development Session (router, response,
 * invocation, error mapping, legacy helper). Samples that call Cogover capabilities need
 * `cogover-dev run` and are covered by README.md, not by this test.
 */
const invocation: InvocationContext = Object.freeze({
    identity: "user",
    workspace: { id: "WS1", name: "Sample Workspace", language: "en" },
    user: { accountId: "AC1", email: "ada@example.com", firstName: "Ada", lastName: "Lovelace", membership: { personnelId: "PER1" } },
});

describe("sample catalog", () => {
    test("ids, routes and files are unique", () => {
        const ids = samples.map(sample => sample.id);
        const routes = samples.map(sample => `${sample.method} ${sample.path}`);
        const files = samples.map(sample => sample.file);
        assert.equal(new Set(ids).size, ids.length, "duplicate sample id");
        assert.equal(new Set(routes).size, routes.length, "duplicate route");
        assert.equal(new Set(files).size, files.length, "duplicate file");
    });

    test("every sample documents SDK APIs, its file and a curl", () => {
        for (const sample of samples) {
            assert.ok(sample.sdk.length > 0, `${sample.id} lists no SDK API`);
            assert.match(sample.file, /^src\/samples\/\d\d-[a-z-]+\/[a-z-]+\.ts$/, `${sample.id} has an unexpected file path`);
            assert.ok(sample.curl.includes("$BASE"), `${sample.id} curl must use $BASE`);
            assert.ok(sample.summary.length > 20, `${sample.id} summary is too short`);
            assert.ok(sample.path.startsWith("/") && sample.path !== "/", `${sample.id} path must be a child route`);
        }
    });

    test("triggers have unique keys and target the demo Object", () => {
        const keys = triggers.map(trigger => trigger.key);
        assert.equal(new Set(keys).size, keys.length);
        for (const trigger of triggers) assert.equal(trigger.config.object, "sample_order");
    });
});

describe("routes that need no Development Session", () => {
    let local: StartedLocalServer;
    let base: string;
    const errors: unknown[] = [];

    before(async () => {
        local = await startLocalServer({
            handler,
            triggers,
            projectSlug: "sdk_samples",
            port: 0,
            invocation,
            readRecord: async () => null,
            onUnexpectedScriptError: error => { errors.push(error); },
        });
        base = local.url;
    });
    after(async () => {
        await local.close();
    });

    const json = async (response: Response): Promise<Record<string, unknown>> => {
        const body = await response.json() as unknown;
        assert.ok(body !== null && typeof body === "object", "expected a JSON object");
        return body as Record<string, unknown>;
    };
    const post = (path: string, body: unknown, method = "POST"): Promise<Response> => fetch(`${base}${path}`, {
        method, headers: { "content-type": "application/json" }, body: JSON.stringify(body),
    });

    test("GET / returns the catalog", async () => {
        const response = await fetch(base);
        assert.equal(response.status, 200);
        const catalog = await json(response);
        assert.equal(catalog.name, "cogover-sdk-samples");
        assert.equal(catalog.sampleCount, samples.length);
        const listed = catalog.samples as { id: string; curl: string; register?: unknown }[];
        assert.equal(listed.length, samples.length);
        assert.equal(listed[0]?.id, "router.hello");
        assert.equal(listed[0]?.register, undefined, "functions must not leak into the catalog");
        assert.deepEqual((catalog.triggers as { key: string }[]).map(trigger => trigger.key), triggers.map(trigger => trigger.key));
    });

    test("router samples", async () => {
        const hello = await json(await fetch(`${base}/router/hello`));
        assert.equal(hello.message, "Hello from @cogover/sdk");

        const params = await json(await fetch(`${base}/router/path-params/ORD%201/2`));
        assert.equal(params.orderId, "ORD 1");
        assert.equal(params.lineNo, 2);

        const query = await json(await fetch(`${base}/router/query?q=laptop&tag=rush&tag=gift&limit=5`));
        assert.equal(query.q, "laptop");
        assert.deepEqual(query.tags, ["rush", "gift"]);
        assert.equal(query.limit, 5);

        const headers = await json(await fetch(`${base}/router/headers`, {
            headers: { "accept-language": "vi", authorization: "Bearer hidden" },
        }));
        assert.equal(headers.acceptLanguage, "vi");
        assert.equal(headers.authorization, "(never exposed to project code)");

        const body = await json(await post("/router/body", { name: "Laptop", quantity: 2, unitPrice: 1500 }));
        assert.deepEqual(body, { name: "Laptop", quantity: 2, lineTotal: 3000 });
        const invalid = await post("/router/body", { name: "", quantity: 0 });
        assert.equal(invalid.status, 400);
        assert.equal((await json(invalid)).code, "VALIDATION_ERROR");

        const inputVsBody = await json(await post("/router/input-vs-body", { orderId: "ORD-1", note: "x" }));
        assert.equal(inputVsBody.method, "POST");
        assert.equal(inputVsBody.path, "/router/input-vs-body");
        assert.deepEqual(inputVsBody.bodyKeys, ["orderId", "note"]);
        assert.ok((inputVsBody.inputKeys as string[]).includes("orderId"));
    });

    test("response samples", async () => {
        const created = await post("/response/json", {});
        assert.equal(created.status, 201);
        assert.equal(created.headers.get("location"), "/response/json/ORD-1");
        assert.equal(created.headers.get("x-sample-tags"), "sample, json");
        assert.deepEqual(await created.json(), { id: "ORD-1", created: true });

        const text = await fetch(`${base}/response/text`);
        assert.equal(text.status, 200);
        assert.match(text.headers.get("content-type") ?? "", /^text\/plain/);
        assert.equal(await text.text(), "Plain text from a Cogover route.\n");

        const bytes = await fetch(`${base}/response/bytes`);
        assert.equal(bytes.status, 200);
        assert.match(bytes.headers.get("content-type") ?? "", /^text\/csv/);
        assert.match(bytes.headers.get("content-disposition") ?? "", /orders\.csv/);
        assert.equal(await bytes.text(), "id,name,total\nORD-1,Laptop,1500\nORD-2,Mouse,25\n");

        const empty = await fetch(`${base}/response/empty`, { method: "DELETE" });
        assert.equal(empty.status, 204);
        assert.equal(empty.headers.get("x-sample-deleted"), "1");
        const nullResult = await fetch(`${base}/response/empty?mode=null`, { method: "DELETE" });
        assert.equal(nullResult.status, 200);
        assert.equal(await nullResult.json(), null);

        const redirect = await fetch(`${base}/response/redirect`, { redirect: "manual" });
        assert.equal(redirect.status, 302);
        assert.equal(redirect.headers.get("location"), "https://www.npmjs.com/package/@cogover/sdk");
        const permanent = await fetch(`${base}/response/redirect?permanent=true`, { redirect: "manual" });
        assert.equal(permanent.status, 301);
    });

    test("invocation sample", async () => {
        const snapshot = await json(await fetch(`${base}/invocation`));
        assert.equal(snapshot.identity, "user");
        assert.deepEqual(snapshot.workspace, { id: "WS1", name: "Sample Workspace", domain: null, language: "en", timezone: null });
        assert.deepEqual(snapshot.user, { accountId: "AC1", email: "ada@example.com", fullName: "Ada Lovelace", personnelId: "PER1", language: null });
    });

    test("error samples map to HTTP statuses", async () => {
        const validation = await post("/errors/validation", { email: "nope", age: -1 });
        assert.equal(validation.status, 400);

        const table = await fetch(`${base}/errors/mapping/list`);
        const entries = await table.json() as { name: string; httpStatus: number }[];
        assert.equal(entries.length, 9);
        for (const entry of entries) {
            const response = await fetch(`${base}/errors/mapping/${entry.name}`);
            assert.equal(response.status, entry.httpStatus, `${entry.name} should answer ${entry.httpStatus}`);
            const body = await json(response);
            assert.equal(body.r, entry.httpStatus);
            assert.equal(typeof body.code, "string");
        }
        const unknown = await fetch(`${base}/errors/mapping/unknown-name`);
        assert.equal(unknown.status, 400);
    });

    test("legacy sample and unknown routes", async () => {
        const greeting = await json(await fetch(`${base}/legacy/create-greeting?name=Ada`));
        assert.equal(greeting.greeting, "Hello Ada");

        const missing = await fetch(`${base}/no/such/route`);
        assert.equal(missing.status, 404);
        const wrongMethod = await fetch(`${base}/router/hello`, { method: "DELETE" });
        assert.equal(wrongMethod.status, 404);
    });

    test("trigger manifests are served by the local tooling route", async () => {
        const listed = await json(await fetch(`http://${local.host}:${local.port}/__cogover/triggers`));
        const manifests = listed.triggers as { key: string; runWhen: string; writableFields: string[] }[];
        assert.deepEqual(manifests.map(manifest => manifest.key), triggers.map(trigger => trigger.key));
        assert.equal(manifests.find(manifest => manifest.key === "sample_order_note_when_shipped")?.runWhen, "onEnter");
        assert.deepEqual(manifests.find(manifest => manifest.key === "sample_order_compute_total")?.writableFields, ["total"]);
    });

    test("no unexpected script errors were reported", () => {
        assert.deepEqual(errors, []);
    });
});
