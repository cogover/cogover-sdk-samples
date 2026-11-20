import type { RequestMethod, ScriptHandler } from "@cogover/sdk";

/**
 * Catalog entry of one sample, serialized as-is by `GET /`. A sample file default-exports it as a plain object
 * literal (`satisfies SampleInfo`) and exports its route handler by name (`SampleHandler`); the router of its area
 * (`src/routers/<area>.ts`) registers that handler. Only the catalog route imports every catalog entry.
 */
export interface SampleInfo {
    /** Stable identifier used in the catalog, for example `records.get`. */
    readonly id: string;
    readonly method: RequestMethod;
    /** Full route path relative to the project URL, prefix of the area router included. */
    readonly path: string;
    /** One sentence: what the sample shows. */
    readonly summary: string;
    /** SDK APIs demonstrated, named as in the `@cogover/sdk` API reference. */
    readonly sdk: readonly string[];
    /** Source file, relative to the repository root. */
    readonly file: string;
    /** A curl command to try the route; `$BASE` is the project URL. */
    readonly curl: string;
}

/**
 * The route handler of a sample: an ordinary `ScriptHandler`, with the same context as `router.get(...)` handlers.
 * `TInput` types `request.body` and `TOutput` the returned value, exactly like
 * `router.addRoute<TInput, TOutput>(method, path, handler)`.
 */
export type SampleHandler<TInput = unknown, TOutput = unknown> = ScriptHandler<TInput, TOutput>;
