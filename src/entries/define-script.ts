import { defineScript, ValidationError } from "@cogover/sdk";
import type { SandboxHandler, ScriptContext } from "@cogover/sdk";

/**
 * Alternative entry point for a project with a single endpoint: `defineScript` instead of a router.
 * It answers only the project URL itself (`/`); a child path throws `NotFoundError` before the handler
 * runs. The handler receives the same context as a route handler.
 *
 * Try it on the local server:
 *   COGOVER_LOCAL_PORT=3100 cogover-dev run --profile <slug> -- \
 *     node --import tsx local/cli.ts --entry ./src/entries/define-script.ts
 *   curl -s -X POST "$BASE" -H "Content-Type: application/json" --data '{"name": "Ada"}'
 */
interface Input {
    readonly name?: unknown;
}

interface Output {
    readonly greeting: string;
    readonly method: string;
    readonly identity: "user" | "system";
}

const handler: SandboxHandler = defineScript<Input, Output>(({ request, invocation, log }: ScriptContext<Input>) => {
    const name = request.body.name ?? "Cogover";
    if (typeof name !== "string" || name.trim().length === 0) {
        throw new ValidationError("name must be a non-empty string");
    }
    log.info("defineScript entry point invoked", { method: request.method });
    return {
        greeting: `Hello ${name.trim()}`,
        method: request.method,
        identity: invocation.identity,
    };
});

export default handler;
