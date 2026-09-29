import type { ActionDefinition, ActionEffect, ActionExposure, ActionManifest } from "@cogover/sdk";
import { scoreCustomerAction } from "./score-customer.js";
import { setOrderStatusAction } from "./set-order-status.js";

/**
 * Custom Module Actions are not HTTP routes. Cogover reads them from the named `actions` export of
 * `src/main.ts` when a version is published; Process Builder then offers each action exposed to "process" as
 * a Custom Module Action node, and AI Agent Builder each action exposed to "agent" as a tool. Both always call
 * the active version, so keep the keys stable. A project declares at most 50 actions.
 *
 * Each `ActionDefinition` carries `key`, the normalized `config` (`ActionManifest`: every default applied, the
 * input and output as JSON Schema) and a handler reserved for Cogover. The local server does not run actions:
 * try the shared logic through `GET /actions/score-customer/:customerId`, then publish to call the actions
 * from a Process or an AI Agent.
 */
export const actions: readonly ActionDefinition[] = [scoreCustomerAction, setOrderStatusAction];

export const actionManifests: readonly ActionManifest[] = actions.map(action => action.config);

/** The part of a manifest shown by the catalog route (`GET /`); `GET /actions/manifests` returns the rest. */
export interface ActionSummary {
    readonly key: string;
    readonly label: string;
    readonly exposeTo: readonly ActionExposure[];
    readonly effect: ActionEffect;
    readonly timeoutMs: number;
}

export const actionSummaries: readonly ActionSummary[] = actionManifests.map(manifest => ({
    key: manifest.key,
    label: manifest.label,
    exposeTo: manifest.exposeTo,
    effect: manifest.effect,
    timeoutMs: manifest.timeoutMs,
}));
