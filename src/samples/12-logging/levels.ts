import type { ScriptLogger } from "@cogover/sdk";
import { defineSample } from "../../sample.js";

interface Input {
    readonly message?: unknown;
}

/**
 * `context.log` writes to the project log at four levels. The optional `details` value is logged
 * separately from the message. Never log credentials, tokens or personal data.
 */
export default defineSample<Input>({
    id: "logging.levels",
    method: "POST",
    path: "/log/levels",
    summary: "log.debug/info/warn/error(message, details): write structured entries to the project log.",
    sdk: ["context.log", "ScriptLogger", "log.debug", "log.info", "log.warn", "log.error"],
    file: "src/samples/12-logging/levels.ts",
    curl: `curl -s -X POST "$BASE/log/levels" -H "Content-Type: application/json" --data '{"message":"hello from curl"}'`,
    handler: ({ request, log, invocation }) => {
        const logger: ScriptLogger = log;
        const message = typeof request.body.message === "string" ? request.body.message : "sample log entry";
        logger.debug("Debug details for developers", { message, path: request.path });
        logger.info("Business event", { message, identity: invocation.identity });
        logger.warn("Something unusual but handled", { message });
        logger.error("Something failed (no exception thrown here)", { message, retryable: false });
        return { logged: ["debug", "info", "warn", "error"], message };
    },
});
