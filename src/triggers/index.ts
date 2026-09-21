import type {
    TriggerDefinition, TriggerManifest, TriggerOperation, TriggerRunWhen, TriggerSandboxHandler, TriggerTiming,
} from "@cogover/sdk";
import { noteWhenShipped } from "./after-change-note-when-shipped.js";
import { blockDeleteShipped } from "./before-change-block-delete.js";
import { computeTotal } from "./before-change-compute-total.js";
import { validateAmounts } from "./before-change-validate.js";

/**
 * Record triggers are not HTTP routes. Cogover discovers them through the named `triggers` export of
 * `src/main.ts` when a project version is published, and applies them while that version is active.
 *
 * Each `TriggerDefinition` carries `key`, the normalized `config` (`TriggerManifest`, every default
 * applied) and `__cogoverTriggerHandler`, a `TriggerSandboxHandler` reserved for Cogover.
 *
 * Locally, `POST /__cogover/triggers/<key>` runs one trigger with real records read through the
 * Development Session; `GET /__cogover/triggers` lists these manifests.
 */
export const triggers: readonly TriggerDefinition[] = [
    validateAmounts,
    computeTotal,
    blockDeleteShipped,
    noteWhenShipped,
];

export const triggerManifests: readonly TriggerManifest[] = triggers.map(trigger => trigger.config);

/** The reserved sandbox entry stored in `TriggerDefinition.__cogoverTriggerHandler`; project code never calls it. */
export type TriggerEntry = TriggerSandboxHandler;

/** The part of a manifest shown by the catalog route (`GET /`). */
export interface TriggerSummary {
    readonly key: string;
    readonly object: string;
    readonly timing: TriggerTiming;
    readonly operations: readonly TriggerOperation[];
    readonly runWhen: TriggerRunWhen;
    readonly writableFields: readonly string[];
}

export const triggerSummaries: readonly TriggerSummary[] = triggerManifests.map(manifest => ({
    key: manifest.key,
    object: manifest.object,
    timing: manifest.timing,
    operations: manifest.operations,
    runWhen: manifest.runWhen,
    writableFields: manifest.writableFields,
}));
