import assert from "node:assert/strict";
import test, { after, before, describe } from "node:test";
import type { InvocationContext } from "@cogover/sdk";
import handler, { actions, jobs, triggers } from "../src/main.js";
import { samples } from "../src/samples/index.js";
import { startLocalServer, type StartedLocalServer } from "./local-server.js";

/**
 * Exercises the catalog and every sample that needs no Development Session (router, response,
 * invocation, error mapping, legacy helper). Samples that call Cogover capabilities need
 * `cogover-dev run` and are covered by README.md; the record read samples are also run here against a
 * simulated capability bridge, which checks the requests the SDK sends, not Cogover's answers.
 */
const invocation: InvocationContext = Object.freeze({
    identity: "user",
    workspace: { id: "WS1", name: "Sample Workspace", language: "en" },
    user: {
        accountId: "AC1", email: "ada@example.com", firstName: "Ada", lastName: "Lovelace",
        membership: {
            personnelId: "PER1",
            isSuperAdmin: false,
            roles: [{ id: "RO-APPROVER", name: "Order approver" }, { id: "RO-SALES", name: "Sales" }],
        },
    },
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
            assert.match(sample.file, /^src\/samples\/\d\d-[a-z-]+\/[a-z0-9-]+\.ts$/, `${sample.id} has an unexpected file path`);
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

    test("actions have unique keys and normalized manifests", () => {
        const keys = actions.map(action => action.key);
        assert.deepEqual(keys, ["sample_score_customer", "sample_set_order_status"]);
        for (const action of actions) {
            const manifest = action.config;
            assert.equal(manifest.key, action.key);
            if (manifest.exposeTo.includes("agent")) assert.ok(manifest.description.length > 0, `${action.key} needs a description for agents`);
            assert.equal(manifest.inputSchema.type, "object");
            assert.equal(manifest.inputSchema.additionalProperties, false);
            assert.equal(manifest.outputSchema.type, "object");
            assert.equal(typeof action.__cogoverActionHandler, "function");
        }
        const score = actions.find(action => action.key === "sample_score_customer")?.config;
        assert.equal(score?.effect, "read");
        assert.equal(score?.timeoutMs, 5000);
        assert.deepEqual(score?.inputSchema.required, ["customerId"]);
        assert.deepEqual((score?.inputSchema.properties as Record<string, Record<string, unknown>>).customerId,
            { type: "string", "x-cogover-object": "sample_customer", description: "ID of the sample_customer record to score" });
        const status = actions.find(action => action.key === "sample_set_order_status")?.config;
        assert.equal(status?.effect, "write");
        assert.deepEqual(status?.exposeTo, ["process", "agent"]);
    });

    test("jobs have unique keys and normalized manifests", () => {
        const keys = jobs.map(job => job.key);
        assert.equal(new Set(keys).size, keys.length);
        const scheduled = jobs.find(job => job.key === "sample_cancel_stale_orders");
        assert.deepEqual(scheduled?.config.schedule, { cron: "0 2 * * *", timezone: "Asia/Ho_Chi_Minh" });
        const enqueued = jobs.find(job => job.key === "sample_recount_orders");
        assert.equal(enqueued?.config.maxAttempts, 3);
        assert.equal(enqueued?.config.schedule, undefined);
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
        assert.deepEqual((catalog.jobs as { key: string }[]).map(job => job.key), jobs.map(job => job.key));
        assert.deepEqual(catalog.actions, [
            { key: "sample_score_customer", label: "Sample: score customer", exposeTo: ["process", "agent"], effect: "read", timeoutMs: 5000 },
            { key: "sample_set_order_status", label: "Sample: set order status", exposeTo: ["process", "agent"], effect: "write", timeoutMs: 6000 },
        ]);
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
        assert.deepEqual(snapshot.user, {
            accountId: "AC1", email: "ada@example.com", fullName: "Ada Lovelace", personnelId: "PER1", language: null,
            isSuperAdmin: false, roles: [{ id: "RO-APPROVER", name: "Order approver" }, { id: "RO-SALES", name: "Sales" }],
        });
    });

    test("role-check sample compares role ids and lets Super Admins through", async () => {
        const holder = await json(await fetch(`${base}/invocation/role-check?roleId=RO-APPROVER`));
        assert.deepEqual(holder, {
            allowed: true, reason: 'Holds role "Order approver"', roleId: "RO-APPROVER",
            isSuperAdmin: false, roles: ["RO-APPROVER", "RO-SALES"],
        });
        const other = await json(await fetch(`${base}/invocation/role-check?roleId=RO-FINANCE`));
        assert.equal(other.allowed, false);
        assert.equal(other.reason, "Role not held");
        // Names are not identifiers: a role name never matches.
        assert.equal((await json(await fetch(`${base}/invocation/role-check?roleId=Sales`))).allowed, false);
        const missing = await fetch(`${base}/invocation/role-check`);
        assert.equal(missing.status, 400);
        assert.equal((await missing.json() as { code: string }).code, "ROLE_ID_REQUIRED");

        const admin = await startLocalServer({
            handler, triggers, projectSlug: "sdk_samples", port: 0, readRecord: async () => null,
            invocation: { ...invocation, user: { accountId: "AC2", membership: { isSuperAdmin: true, roles: [] } } },
        });
        try {
            const result = await json(await fetch(`${admin.url}/invocation/role-check?roleId=RO-FINANCE`));
            assert.equal(result.allowed, true);
            assert.equal(result.reason, "Super Admin");
        } finally {
            await admin.close();
        }
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

    test("inbound webhook routes refuse non-inbound callers", async () => {
        const ping = await post("/hooks/ping", { hello: "webhook" });
        assert.equal(ping.status, 403);
        assert.equal((await json(ping)).identity, "user");
        const events = await post("/hooks/order-events", { id: "evt-1", type: "order.paid", orderId: "ORD-1" });
        assert.equal(events.status, 403);
    });

    test("constant-time comparison runs without a capability call", async () => {
        const same = await json(await post("/crypto/timing-safe-equal", { a: "token-1", b: "token-1" }));
        assert.equal(same.equal, true);
        const different = await json(await post("/crypto/timing-safe-equal", { a: "token-1", b: "token-2" }));
        assert.equal(different.equal, false);
        const lengths = await json(await post("/crypto/timing-safe-equal", { a: "short", b: "longer value" }));
        assert.equal(lengths.equal, false);
    });

    test("legacy sample and unknown routes", async () => {
        const greeting = await json(await fetch(`${base}/legacy/create-greeting?name=Ada`));
        assert.equal(greeting.greeting, "Hello Ada");

        const missing = await fetch(`${base}/no/such/route`);
        assert.equal(missing.status, 404);
        const wrongMethod = await fetch(`${base}/router/hello`, { method: "DELETE" });
        assert.equal(wrongMethod.status, 404);
    });

    test("action manifests and the schema builder need no capability", async () => {
        const all = await json(await fetch(`${base}/actions/manifests`));
        assert.equal(all.count, 2);
        const one = await json(await fetch(`${base}/actions/manifests?key=sample_score_customer`));
        const manifests = one.actions as Record<string, unknown>[];
        assert.equal(manifests.length, 1);
        assert.deepEqual(manifests[0]?.inputProperties, ["customerId", "since", "strict"]);
        assert.equal((await fetch(`${base}/actions/manifests?key=unknown_action`)).status, 404);

        const schema = await json(await fetch(`${base}/actions/schema-builder`));
        assert.equal(schema.sameAsStringify, true);
        const jsonSchema = schema.jsonSchema as { properties: Record<string, Record<string, unknown>>; required: string[] };
        assert.deepEqual(jsonSchema.required, ["code", "carrier", "weightKg", "parcels", "shipOn", "orderId", "lines"]);
        assert.deepEqual(jsonSchema.properties.pickedUpAt, {
            type: "integer", format: "x-epoch-ms", description: "Unix milliseconds, like a date_time field",
        });
        assert.equal((jsonSchema.properties.lines?.items as Record<string, unknown>).additionalProperties, false);
        assert.equal(schema.codeCheck, "valid");
        for (const [name, message] of Object.entries(schema.invalidOptions as Record<string, string>)) {
            assert.notEqual(message, "accepted", `${name} should be rejected`);
            assert.notEqual(message, "unexpected error", `${name} should throw ValidationError`);
        }
        const invalidCode = await json(await fetch(`${base}/actions/schema-builder?code=ship-1`));
        assert.equal(invalidCode.codeCheck, "code must look like SHP-1024");
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

/** A capability request as the SDK sends it through the bridge. */
interface BridgeRequest {
    readonly operation: string;
    readonly payload: Record<string, unknown>;
}

const CUSTOMER_FIELDS: Readonly<Record<string, unknown>> = { tier: "gold", credit_limit: 1000, email: "ada@example.com" };
const CUSTOMER_RECORD: Readonly<Record<string, unknown>> = { name: "Ada Ltd", ...CUSTOMER_FIELDS, is_active: true, note: null };

/** Thrown by `simulatedAnswer` to answer a capability request with this bridge error. */
class SimulatedFailure extends Error {
    constructor(readonly code: string, readonly details: Record<string, unknown>) {
        super(code);
    }
}

/** Answers the record reads of the samples like Cogover would, for a project policy that does not grant `note`. */
function simulatedAnswer(request: BridgeRequest): unknown {
    const payload = request.payload;
    const system = (expand: unknown) => ({ createdAt: 1, updatedAt: 2, createdBy: { id: "PER1", name: expand === undefined ? "" : "Ada Lovelace" } });
    const order = (id: string, fields: unknown, expand: unknown) => {
        const linked = expand === true ? CUSTOMER_FIELDS
            : typeof expand === "object" && expand !== null && Array.isArray((expand as { customer?: unknown }).customer)
                ? Object.fromEntries(((expand as { customer: string[] }).customer).map(slug => [slug, CUSTOMER_FIELDS[slug] ?? null]))
                : undefined;
        const all: Record<string, unknown> = {
            name: `Order ${id}`,
            customer: linked === undefined
                ? { id: "CUS1", name: "", objectSlug: "sample_customer" }
                : { id: "CUS1", name: "Ada Ltd", objectSlug: "sample_customer", fields: linked },
            status: "new", subtotal: 1500, discount: 0, total: 1500, ordered_at: 1_700_000_000_000, tags: [], files: [], note: "hidden",
        };
        const granted = fields === "*" ? Object.keys(all).filter(slug => slug !== "note") : fields as string[];
        return { id, fields: Object.fromEntries(granted.map(slug => [slug, all[slug] ?? null])), system: system(expand) };
    };
    switch (request.operation) {
        case "records.get": {
            const identity = payload.identity as { personnelId?: string } | undefined;
            if (String(payload.id).endsWith("-MISSING") || identity?.personnelId === "PER-NO-ACCESS") return null;
            if (payload.objectSlug !== "sample_customer") return order(String(payload.id), payload.fields, payload.expandLookups);
            const granted = payload.fields === "*" ? Object.keys(CUSTOMER_RECORD) : payload.fields as string[];
            return { id: payload.id, fields: Object.fromEntries(granted.map(slug => [slug, CUSTOMER_RECORD[slug] ?? null])), system: system(undefined) };
        }
        case "records.update":
            return null;
        case "processes.start":
            if (payload.processInfoId === "PI-NOT-ALLOWED") throw new SimulatedFailure("PERMISSION_DENIED", { reason: "PROCESSES_NOT_ALLOWED" });
            if (payload.onComplete !== undefined && payload.processInfoId === "PI-LOCAL") throw new SimulatedFailure("NOT_SUPPORTED", {});
            return { instanceId: "PINS1", duplicate: false };
        case "processes.get":
            if (payload.instanceId === "PINS-OTHER") throw new SimulatedFailure("NOT_FOUND", { resource: "process_instance", resourceId: "PINS-OTHER" });
            return { instanceId: payload.instanceId, processId: "PRC1", processInfoId: "PI1", state: "COMPLETED", startedAt: 10, finishedAt: 20 };
        case "agents.start":
            if (payload.agentId === "AG-NOT-ALLOWED") throw new SimulatedFailure("PERMISSION_DENIED", { reason: "AGENTS_NOT_ALLOWED" });
            return { runId: "AGR1", duplicate: false };
        case "agents.get":
            return {
                runId: payload.runId, status: "COMPLETED", text: "Call Ada this week.",
                result: { summary: "Three orders, all paid.", nextStep: "call", confidence: 0.8 }, error: null,
            };
        case "records.getMany": {
            const ids = payload.ids as string[];
            return {
                records: ids.filter(id => id !== "CUS-HIDDEN").map(id => ({ id, fields: { name: `Customer ${id}` }, system: system(undefined) })),
                missingIds: ids.filter(id => id === "CUS-HIDDEN"),
            };
        }
        case "records.list":
            return { items: ["ORD1", "ORD2"].map(id => order(id, payload.fields, payload.expandLookups)), total: 2 };
        case "records.aggregate": {
            const metrics = payload.metrics as Record<string, { op: string }>;
            const values = Object.fromEntries(Object.entries(metrics).map(([name, metric]) => [
                name, metric.op === "count" || metric.op === "countDistinct" ? 3 : metric.op === "min" ? null : 4500,
            ]));
            return payload.groupBy === undefined
                ? { values }
                : { groups: [{ key: { customer: "CUS1" }, values }, { key: { customer: "CUS-HIDDEN" }, values }], truncated: true };
        }
        case "records.create":
            return "ORD-NEW";
        default:
            throw new Error(`unexpected capability ${request.operation}`);
    }
}

describe("record read samples with a simulated capability bridge", () => {
    type BridgeHost = typeof globalThis & { __cogoverBridgeCall?: (requestJson: string) => Promise<string> };
    let local: StartedLocalServer;
    let base: string;
    const calls: BridgeRequest[] = [];
    const errors: unknown[] = [];

    before(async () => {
        (globalThis as BridgeHost).__cogoverBridgeCall = async requestJson => {
            const request = JSON.parse(requestJson) as BridgeRequest;
            calls.push(request);
            try {
                return JSON.stringify({ ok: true, data: simulatedAnswer(request) });
            } catch (error) {
                if (error instanceof SimulatedFailure) {
                    return JSON.stringify({ ok: false, error: { code: error.code, message: `Simulated ${error.code}`, details: error.details } });
                }
                return JSON.stringify({ ok: false, error: { code: "VALIDATION_ERROR", message: String(error) } });
            }
        };
        local = await startLocalServer({
            handler, triggers, projectSlug: "sdk_samples", port: 0, invocation, readRecord: async () => null,
            onUnexpectedScriptError: error => { errors.push(error); },
        });
        base = local.url;
    });
    after(async () => {
        await local.close();
        delete (globalThis as BridgeHost).__cogoverBridgeCall;
    });

    /** Calls one route and returns its JSON body and the capability requests it made. */
    const call = async (path: string, init?: RequestInit): Promise<{ body: Record<string, unknown>; requests: BridgeRequest[] }> => {
        const start = calls.length;
        const response = await fetch(`${base}${path}`, init);
        assert.equal(response.status, 200, `${path} answered ${response.status}`);
        return { body: await response.json() as Record<string, unknown>, requests: calls.slice(start) };
    };

    test("records.get sends the listed fields and does not expand lookups", async () => {
        const { body, requests } = await call("/records/get/ORD1");
        assert.deepEqual(requests.map(request => request.payload), [{
            objectSlug: "sample_order", id: "ORD1", fields: ["name", "status", "total", "customer", "note", "files"],
        }]);
        assert.equal(body.customerId, "CUS1");
        assert.deepEqual((body.fields as Record<string, unknown>).customer, { id: "CUS1", name: "", objectSlug: "sample_customer" });
    });

    test('fields: "*" returns what the policy grants', async () => {
        const { body, requests } = await call("/records/fields-all/ORD1");
        assert.equal(requests[0]?.payload.fields, "*");
        assert.deepEqual(body.notGranted, ["note"]);
        assert.equal((body.returnedFields as string[]).length, 9);
    });

    test("expandLookups: true fills in the customer and createdBy names", async () => {
        const { body, requests } = await call("/records/expand-lookups?limit=2");
        assert.equal(requests.length, 1);
        assert.equal(requests[0]?.operation, "records.list");
        assert.deepEqual(requests[0]?.payload.fields, ["name", "total", "customer"]);
        assert.equal(requests[0]?.payload.expandLookups, true);
        assert.equal(requests[0]?.payload.limit, 2);
        const first = (body.items as Record<string, unknown>[])[0];
        assert.deepEqual(first?.customer, { id: "CUS1", name: "Ada Ltd", tier: "gold", email: "ada@example.com", expanded: true });
        assert.deepEqual(first?.createdBy, { id: "PER1", name: "Ada Lovelace" });
    });

    test("expandLookups by lookup reads only the named linked fields", async () => {
        const { body, requests } = await call("/records/expand-lookups/fields");
        assert.deepEqual(requests[0]?.payload.expandLookups, { customer: ["tier", "credit_limit"] });
        assert.deepEqual(requests[0]?.payload.where, {
            kind: "condition", field: "status", operator: "in", value: ["new", "confirmed"],
        });
        assert.equal(body.overLimit, 2);
        assert.deepEqual((body.rows as Record<string, unknown>[])[0], {
            id: "ORD1", name: "Order ORD1", total: 1500, customer: "Ada Ltd", tier: "gold", creditLimit: 1000, overLimit: true,
        });
    });

    test("records.aggregate without groups sends { op, field } metrics", async () => {
        const { body, requests } = await call("/records/aggregate?status=confirmed");
        assert.deepEqual(requests.map(request => request.payload), [{
            objectSlug: "sample_order",
            where: { kind: "condition", field: "status", operator: "=", value: "confirmed" },
            metrics: {
                orders: { op: "count", field: "id" },
                withCustomer: { op: "count", field: "customer" },
                customers: { op: "countDistinct", field: "customer" },
                revenue: { op: "sum", field: "total" },
                averageOrder: { op: "avg", field: "total" },
                firstOrderedAt: { op: "min", field: "ordered_at" },
                lastOrderedAt: { op: "max", field: "ordered_at" },
            },
        }]);
        assert.equal((body.values as Record<string, unknown>).firstOrderedAt, null);
        assert.equal(body.summary, "3 orders, revenue 4500, average 4500");

        const invalid = await fetch(`${base}/records/aggregate?status=paid`);
        assert.equal(invalid.status, 400);
    });

    test("records.aggregate with groupBy returns truncated groups and resolves customer names", async () => {
        const { body, requests } = await call("/records/aggregate/by-customer?limit=2");
        assert.equal(requests.length, 2);
        assert.deepEqual(requests[0]?.payload.groupBy, ["customer"]);
        assert.equal(requests[0]?.payload.limit, 2);
        assert.deepEqual(requests[1]?.payload, { objectSlug: "sample_customer", ids: ["CUS1", "CUS-HIDDEN"], fields: ["name"] });
        assert.equal(body.truncated, true);
        assert.deepEqual((body.customers as Record<string, unknown>[]).map(row => [row.customerId, row.name, row.orders]), [
            ["CUS1", "Customer CUS1", 3],
            ["CUS-HIDDEN", null, 3],
        ]);
        assert.equal((await fetch(`${base}/records/aggregate/by-customer?limit=0`)).status, 400);
    });

    test("asUser reads as the delegated person", async () => {
        const { body, requests } = await call("/identity/as-user/PER9");
        assert.deepEqual(requests.map(request => [request.operation, request.payload.identity]), [
            ["records.list", { kind: "user", personnelId: "PER9" }],
        ]);
        assert.equal(body.visibleTotal, 2);
    });

    test("asUser aggregates with the metrics allowed for a delegated person", async () => {
        const { body, requests } = await call("/identity/as-user/PER9/aggregate");
        assert.deepEqual(requests.map(request => request.payload), [{
            identity: { kind: "user", personnelId: "PER9" },
            objectSlug: "sample_order",
            where: { kind: "condition", field: "status", operator: "!=", value: "cancelled" },
            metrics: {
                orders: { op: "count", field: "id" },
                withTotal: { op: "count", field: "total" },
                revenue: { op: "sum", field: "total" },
                averageOrder: { op: "avg", field: "total" },
                smallestOrder: { op: "min", field: "total" },
                largestOrder: { op: "max", field: "total" },
            },
        }]);
        assert.deepEqual(body, {
            personnelId: "PER9", orders: 3, withTotal: 3, revenue: 4500, averageOrder: 4500, smallestOrder: null, largestOrder: 4500,
        });
    });

    test("a lookup written by ID reads back with an empty name unless expanded", async () => {
        const { body, requests } = await call("/records/lookup-reference", {
            method: "POST", headers: { "content-type": "application/json" },
            body: JSON.stringify({ customerId: "CUS1", name: "Order for Ada" }),
        });
        assert.deepEqual(requests.map(request => request.operation), ["records.get", "records.create", "records.get", "records.get"]);
        assert.equal(requests[2]?.payload.expandLookups, undefined);
        assert.deepEqual(requests[3]?.payload.expandLookups, { customer: ["tier"] });
        assert.deepEqual(body.customer, { id: "CUS1", name: "", objectSlug: "sample_customer" });
        assert.deepEqual(body.customerExpanded, { id: "CUS1", name: "Ada Ltd", objectSlug: "sample_customer", fields: { tier: "gold" } });
        assert.equal(body.sameCustomer, true);
    });

    test("the score route shares the action's logic: one customer read and one aggregate", async () => {
        const { body, requests } = await call("/actions/score-customer/CUS1?since=2026-01-01&strict=true");
        assert.deepEqual(requests.map(request => request.payload), [
            { objectSlug: "sample_customer", id: "CUS1", fields: ["name", "tier", "is_active"] },
            {
                objectSlug: "sample_order",
                where: {
                    kind: "group", operator: "and", expressions: [
                        { kind: "condition", field: "customer", operator: "=", value: "CUS1" },
                        { kind: "condition", field: "status", operator: "!=", value: "cancelled" },
                        { kind: "condition", field: "ordered_at", operator: ">=", value: Date.parse("2026-01-01T00:00:00Z") },
                    ],
                },
                metrics: {
                    orders: { op: "count", field: "id" },
                    revenue: { op: "sum", field: "total" },
                    lastOrderedAt: { op: "max", field: "ordered_at" },
                },
            },
        ]);
        assert.deepEqual(body, {
            found: true, score: 68, tier: "B", breakdown: { customerTier: 40, revenue: 16, activity: 12 },
            orders: 3, revenue: 4500, lastOrderedAt: 4500,
            reasons: ["Tier gold: +40", "Revenue 4500: +16", "3 orders: +12"],
        });
        const missing = await call("/actions/score-customer/CUS-MISSING");
        assert.equal(missing.body.found, false);
        assert.equal(missing.requests.length, 1);
        assert.equal((await fetch(`${base}/actions/score-customer/CUS1?since=01-01-2026`)).status, 400);
    });

    /** Calls an action the way Cogover does; the envelope is internal to Cogover and used here only as a test fixture. */
    const runAction = async (key: string, input: Record<string, unknown>, actionSource: Record<string, unknown>) => {
        const definition = actions.find(action => action.key === key);
        assert.ok(definition, `action ${key} is exported`);
        const start = calls.length;
        const envelope = {
            input,
            __context: {
                workspaceId: "WS1",
                workspace: invocation.workspace,
                executionIdentity: "user",
                user: invocation.user,
                action: { key, runId: "RUN1", effect: definition.config.effect },
                actionSource,
            },
        };
        const answer = JSON.parse(await definition.__cogoverActionHandler(JSON.stringify(envelope))) as { output: Record<string, unknown> };
        return { output: answer.output, requests: calls.slice(start) };
    };
    const agentSource = (initiatorPersonnelId: string | null) => ({
        type: "agent", agentId: "AG1", sessionId: "SES1", runId: null, interactive: true, initiatorPersonnelId,
    });
    const processSource = { type: "process", processId: "PRC1", processInfoId: "PI1", instanceId: "PINS1", nodeId: "Activity_1", runAs: "PROCESS_STARTER" };

    test("the read action scores a customer for a Process node", async () => {
        const { output, requests } = await runAction("sample_score_customer", { customerId: "CUS1" }, processSource);
        assert.equal(output.tier, "B");
        assert.equal(output.score, 68);
        assert.deepEqual(requests.map(request => request.operation), ["records.get", "records.aggregate"]);
    });

    test("the write action checks what the agent's user may see, then updates the order", async () => {
        const updated = await runAction("sample_set_order_status", { orderId: "ORD1", status: "confirmed", reason: "Paid" }, agentSource("PER1"));
        assert.deepEqual(updated.requests.map(request => [request.operation, request.payload.identity ?? null]), [
            ["records.get", { kind: "user", personnelId: "PER1" }],
            ["records.get", null],
            ["records.update", null],
        ]);
        const fields = updated.requests[2]?.payload.fields as Record<string, string>;
        assert.equal(fields.status, "confirmed");
        assert.match(fields.note ?? "", /^hidden\n.* new -> confirmed by agent AG1: Paid \(run RUN1\)$/);
        assert.equal(updated.output.outcome, "updated");
        assert.equal(updated.output.previousStatus, "new");
        assert.equal(typeof updated.output.changedAt, "number");

        const anonymous = await runAction("sample_set_order_status", { orderId: "ORD1", status: "confirmed" }, agentSource(null));
        assert.deepEqual(anonymous.output, { outcome: "not_allowed", previousStatus: "none", status: "none" });
        assert.equal(anonymous.requests.length, 0);
        const hidden = await runAction("sample_set_order_status", { orderId: "ORD1", status: "confirmed" }, agentSource("PER-NO-ACCESS"));
        assert.equal(hidden.output.outcome, "not_allowed");

        const skipped = await runAction("sample_set_order_status", { orderId: "ORD1", status: "shipped" }, processSource);
        assert.deepEqual(skipped.output, { outcome: "invalid_transition", previousStatus: "new", status: "new" });
        assert.deepEqual(skipped.requests.map(request => request.operation), ["records.get"]);
        const missing = await runAction("sample_set_order_status", { orderId: "ORD-MISSING", status: "cancelled" }, processSource);
        assert.equal(missing.output.outcome, "not_found");
    });

    const postJson = (path: string, body: unknown) => call(path, {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
    });

    test("processes.start sends input, instanceName, idempotencyKey and the onComplete job", async () => {
        const { body, requests } = await postJson("/processes/start", { processInfoId: "PI1", orderId: "ORD1", idempotencyKey: "order-approval:ORD1" });
        assert.deepEqual(requests.map(request => request.operation), ["records.get", "processes.start"]);
        assert.deepEqual(requests[1]?.payload, {
            processInfoId: "PI1",
            input: { order_id: "ORD1" },
            instanceName: "Approve Order ORD1",
            idempotencyKey: "order-approval:ORD1",
            onComplete: { job: "sample_process_completed", payload: { orderId: "ORD1", orderName: "Order ORD1" } },
        });
        assert.deepEqual(body, { instanceId: "PINS1", duplicate: false, next: "GET /processes/get/PINS1" });

        const local = await postJson("/processes/start", { processInfoId: "PI-LOCAL", orderId: "ORD1", onComplete: false, input: { amount: 5 } });
        assert.equal(local.requests[1]?.payload.onComplete, undefined);
        assert.deepEqual(local.requests[1]?.payload.input, { amount: 5 });
        assert.equal((await postJson("/processes/start", { processInfoId: "PI-LOCAL", orderId: "ORD1" })).body.r, 1014);
        const denied = await postJson("/processes/start", { processInfoId: "PI-NOT-ALLOWED", orderId: "ORD1" });
        assert.deepEqual(denied.body, { r: 1003, msg: "This project or caller may not start the Process.", reason: "PROCESSES_NOT_ALLOWED" });
    });

    test("processes.get reads the instance state", async () => {
        const { body } = await call("/processes/get/PINS1");
        assert.deepEqual(body, {
            instanceId: "PINS1", processId: "PRC1", processInfoId: "PI1", state: "COMPLETED", startedAt: 10, finishedAt: 20, finished: true,
        });
        assert.equal((await call("/processes/get/PINS-OTHER")).body.r, 1004);
    });

    test("agents.start sends the record, the result schema and the onResult job", async () => {
        const { body, requests } = await postJson("/agents/start", { agentId: "AG1", customerId: "CUS1", idempotencyKey: "advice:CUS1" });
        assert.deepEqual(requests.map(request => request.operation), ["records.get", "agents.start"]);
        const payload = requests[1]?.payload as Record<string, unknown>;
        assert.deepEqual(payload.records, [{ objectSlug: "sample_customer", recordId: "CUS1", withActivities: true }]);
        assert.deepEqual(payload.variables, { customerName: "Ada Ltd", tier: "gold" });
        assert.equal(payload.runAs, "caller");
        assert.equal(payload.approvalPolicy, "deny");
        assert.equal(payload.timeoutSeconds, 120);
        assert.deepEqual((payload.resultSchema as { required: string[] }).required, ["summary", "nextStep", "confidence"]);
        assert.deepEqual(payload.onResult, { job: "sample_agent_result", payload: { customerId: "CUS1" } });
        assert.deepEqual(body, { runId: "AGR1", duplicate: false, next: "GET /agents/get/AGR1" });

        const denied = await postJson("/agents/start", { agentId: "AG-NOT-ALLOWED", customerId: "CUS1", onResult: false });
        assert.equal(denied.requests[1]?.payload.onResult, undefined);
        assert.equal(denied.body.reason, "AGENTS_NOT_ALLOWED");
    });

    test("agents.get reads the typed result", async () => {
        const { body } = await call("/agents/get/AGR1");
        assert.equal(body.finished, true);
        assert.equal(body.nextStep, "call");
        assert.deepEqual(body.error, null);
    });

    test("no unexpected script errors were reported", () => {
        assert.deepEqual(errors, []);
    });
});
