import { CogoverApiError, PermissionDeniedError, ValidationError } from "@cogover/sdk";
import type { SecretsApi } from "@cogover/sdk";
import { defineSample } from "../../sample.js";

const isRecord = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object";

/**
 * Reads a secret an administrator stored for the project (`cogover-dev secrets set <name>`). The
 * value must never reach a log, a record, state or a response, so this sample only reports that it
 * could be read and how long it is. A credential (a secret that only `fetch` may use) cannot be read.
 * A local Development Session reads secrets only when its administrator allowed it.
 */
export default defineSample({
    id: "secrets.get",
    method: "GET",
    path: "/secrets/get/:name",
    summary: "secrets.get(name): read a project secret without ever exposing its value.",
    sdk: ["context.secrets", "SecretsApi", "secrets.get"],
    file: "src/samples/17-secrets/get.ts",
    curl: `curl -s "$BASE/secrets/get/sample_erp_token"`,
    handler: async ({ request, secrets }) => {
        const api: SecretsApi = secrets;
        const name = request.params.name ?? "";
        try {
            const value = await api.get(name);
            return { name, available: true, length: value.length, note: "The value itself is never returned, logged or stored." };
        } catch (error) {
            if (error instanceof ValidationError) {
                // "Secret '<name>' is not available" or "Secret '<name>' is a credential and cannot be read".
                return { r: 1006, msg: "This secret cannot be read.", detail: error.message };
            }
            if (error instanceof PermissionDeniedError) {
                // SECRETS_NOT_ALLOWED in a Development Session; TRIGGER_READ_ONLY in a before-change trigger.
                return { r: 1003, msg: "Secrets are not readable in this context.", reason: isRecord(error.details) ? error.details.reason ?? null : null };
            }
            if (error instanceof CogoverApiError && error.code === "SECRETS_DISABLED") {
                return { r: 1030, msg: "Secrets are not enabled for this Workspace.", code: error.code };
            }
            throw error;
        }
    },
});
