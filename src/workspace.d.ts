/**
 * Workspace declarations for the two demo Objects used by every sample. They match `setup/objects.md`.
 *
 * Without this file every object slug is a string and every field value is `unknown`. Regenerate it for
 * a different Workspace with `npx cogover-generate-workspace-types objects.json src/workspace.d.ts`.
 */
import type { FileValue, RecordReference, UrlValue } from "@cogover/sdk";

declare module "@cogover/sdk" {
    interface WorkspaceObjects {
        sample_customer: {
            name: string;
            email: string | null;
            phone: string | null;
            tier: "bronze" | "silver" | "gold" | null;
            is_active: boolean | null;
            website: UrlValue | null;
            credit_limit: number | null;
            note: string | null;
        };

        sample_order: {
            name: string;
            customer: RecordReference<"sample_customer"> | null;
            status: "new" | "confirmed" | "shipped" | "cancelled" | null;
            subtotal: number | null;
            discount: number | null;
            total: number | null;
            ordered_at: number | null;
            tags: readonly ("rush" | "gift" | "wholesale")[] | null;
            files: readonly FileValue[] | null;
            note: string | null;
        };
    }
}

export {};
