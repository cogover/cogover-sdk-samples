import type { RequestMethod, ScriptHandler, ScriptRouter } from "@cogover/sdk";

/** Catalog entry of one sample. Serialized as-is by `GET /`. */
export interface SampleInfo {
    /** Stable identifier used in the catalog, for example `records.get`. */
    readonly id: string;
    readonly method: RequestMethod;
    /** Route path relative to the project URL. */
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

/** One sample is exactly one HTTP route of this project. */
export interface Sample extends SampleInfo {
    /** Registers the route on the project router; called once by `src/main.ts`. */
    register(router: ScriptRouter): void;
}

export interface SampleSpec<TInput, TOutput> extends SampleInfo {
    /** An ordinary route handler; it receives the same context as `router.get(...)` handlers. */
    readonly handler: ScriptHandler<TInput, TOutput>;
}

/**
 * Declares a sample. `TInput` types `request.body` and `TOutput` the returned value, exactly like
 * `router.addRoute<TInput, TOutput>(method, path, handler)`.
 */
export function defineSample<TInput = unknown, TOutput = unknown>(spec: SampleSpec<TInput, TOutput>): Sample {
    const { handler, ...info } = spec;
    return Object.freeze({
        ...info,
        register(router: ScriptRouter): void {
            router.addRoute<TInput, TOutput>(info.method, info.path, handler);
        },
    });
}

/**
 * A sample served by a child router that `src/main.ts` mounts with `router.route(prefix, childRouter)`
 * (`@cogover/sdk` 0.18.0). Its router file registers `handler`; `path` is the full path the route answers at.
 */
export interface MountedSample<TInput = unknown, TOutput = unknown> extends Sample {
    readonly handler: ScriptHandler<TInput, TOutput>;
}

/**
 * Declares a sample whose route lives in a child router (see `src/routers/`). It is listed in the catalog like
 * any sample, but `register` adds nothing to the main router: the router file registers `handler` under its
 * prefix, and registering it on the main router as well would make a duplicate route.
 */
export function defineMountedSample<TInput = unknown, TOutput = unknown>(
    spec: SampleSpec<TInput, TOutput>,
): MountedSample<TInput, TOutput> {
    return Object.freeze({
        ...spec,
        register(): void {
            // Registered by the child router of the group, mounted by src/main.ts.
        },
    });
}
