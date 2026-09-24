/**
 * Renders the sample catalog as the Markdown tables embedded in README.md (English) and
 * README.vi.md (Vietnamese) between the `<!-- catalog:start -->` / `<!-- catalog:end -->` markers.
 *
 * Usage:
 *   node --import tsx scripts/print-catalog.ts [--lang en|vi]   # print one language
 *   node --import tsx scripts/print-catalog.ts --write           # update both README files
 */
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { jobs } from "../src/jobs/index.js";
import { samples } from "../src/samples/index.js";
import { triggers } from "../src/triggers/index.js";

type Lang = "en" | "vi";

const GROUP_TITLES: Readonly<Record<string, Readonly<Record<Lang, string>>>> = {
    "01-router": { en: "Router and request context", vi: "Router và request context" },
    "02-response": { en: "HTTP responses", vi: "HTTP response" },
    "03-invocation": { en: "Invocation identity", vi: "Danh tính của invocation" },
    "04-records-read": { en: "Records: read", vi: "Record: đọc" },
    "05-records-write": { en: "Records: write", vi: "Record: ghi" },
    "06-filters": { en: "Filters and sorting", vi: "Filter và sắp xếp" },
    "07-identity": { en: "Execution identities", vi: "Danh tính thực thi" },
    "08-state": { en: "Project state", vi: "Project state" },
    "09-locks": { en: "Distributed locks", vi: "Distributed lock" },
    "10-fetch": { en: "Outbound HTTP fetch", vi: "HTTP fetch ra ngoài" },
    "11-schema": { en: "Schema", vi: "Schema" },
    "12-logging": { en: "Logging", vi: "Logging" },
    "13-errors": { en: "Errors", vi: "Lỗi" },
    "14-push": { en: "Push messages", vi: "Push message" },
    "15-legacy": { en: "Compatibility", vi: "Tương thích" },
    "16-jobs": { en: "Background jobs", vi: "Background job" },
    "17-secrets": { en: "Secrets", vi: "Secret" },
    "18-crypto": { en: "Cryptography", vi: "Mật mã" },
    "19-inbound": { en: "Inbound webhooks", vi: "Inbound webhook" },
    "20-org": { en: "Organization structure", vi: "Cơ cấu tổ chức" },
    "21-notifications": { en: "Notifications", vi: "Thông báo" },
    "22-email": { en: "Email", vi: "Email" },
};

const JOB_FILES: Readonly<Record<string, string>> = {
    sample_recount_orders: "src/jobs/recount-orders.ts",
    sample_cancel_stale_orders: "src/jobs/cancel-stale-orders.ts",
};

const TRIGGER_FILES: Readonly<Record<string, string>> = {
    sample_order_validate_amounts: "src/triggers/before-change-validate.ts",
    sample_order_compute_total: "src/triggers/before-change-compute-total.ts",
    sample_order_block_delete_shipped: "src/triggers/before-change-block-delete.ts",
    sample_order_note_when_shipped: "src/triggers/after-change-note-when-shipped.ts",
};

const escape = (value: string): string => value.replace(/\|/g, "\\|");

function render(lang: Lang): string {
    const vi = lang === "vi";
    const lines: string[] = [];
    const groups = new Map<string, (typeof samples)[number][]>();
    for (const sample of samples) {
        const group = sample.file.split("/")[2] ?? "other";
        groups.set(group, [...(groups.get(group) ?? []), sample]);
    }
    for (const [group, entries] of groups) {
        const title = GROUP_TITLES[group];
        lines.push("", `### ${title === undefined ? group : title[lang]}`, "");
        lines.push(vi ? "| Route | File | SDK API | Tóm tắt |" : "| Route | File | SDK APIs | Summary |", "|---|---|---|---|");
        for (const sample of entries) {
            const file = `[${sample.file.split("/").slice(2).join("/")}](${sample.file})`;
            lines.push(`| \`${sample.method} ${escape(sample.path)}\` | ${file} | ${sample.sdk.map(api => `\`${escape(api)}\``).join(", ")} | ${escape(sample.summary)} |`);
        }
    }
    lines.push("", vi ? "### Record trigger" : "### Record triggers", "");
    lines.push(vi ? "| Key | Timing | Operation | File |" : "| Key | Timing | Operations | File |", "|---|---|---|---|");
    for (const trigger of triggers) {
        const file = TRIGGER_FILES[trigger.key] ?? "src/triggers/index.ts";
        lines.push(`| \`${trigger.key}\` | ${trigger.config.timing} | ${trigger.config.operations.join(", ")} | [${file.replace("src/triggers/", "")}](${file}) |`);
    }
    lines.push("", vi ? "### Background job" : "### Background jobs", "");
    lines.push(vi ? "| Key | Lịch | File |" : "| Key | Schedule | File |", "|---|---|---|");
    for (const job of jobs) {
        const file = JOB_FILES[job.key] ?? "src/jobs/index.ts";
        const schedule = job.config.schedule === undefined
            ? (vi ? "theo enqueue" : "on enqueue")
            : `\`${job.config.schedule.cron}\` (${job.config.schedule.timezone})`;
        lines.push(`| \`${job.key}\` | ${schedule} | [${file.replace("src/jobs/", "")}](${file}) |`);
    }
    lines.push("", vi
        ? `Tổng cộng: ${samples.length} route, ${triggers.length} record trigger và ${jobs.length} background job.`
        : `Total: ${samples.length} routes, ${triggers.length} record triggers and ${jobs.length} background jobs.`, "");
    return lines.join("\n");
}

async function writeInto(path: string, lang: Lang): Promise<void> {
    const start = "<!-- catalog:start -->";
    const end = "<!-- catalog:end -->";
    const original = await readFile(path, "utf8");
    const from = original.indexOf(start);
    const to = original.indexOf(end);
    if (from === -1 || to === -1 || to < from) throw new Error(`${path} has no catalog markers`);
    const updated = `${original.slice(0, from + start.length)}\n${render(lang)}${original.slice(to)}`;
    await writeFile(path, updated, "utf8");
    console.log(`updated ${path}`);
}

const root = fileURLToPath(new URL("..", import.meta.url));
if (process.argv.includes("--write")) {
    await writeInto(`${root}README.md`, "en");
    await writeInto(`${root}README.vi.md`, "vi");
} else {
    const index = process.argv.indexOf("--lang");
    const lang: Lang = index !== -1 && process.argv[index + 1] === "vi" ? "vi" : "en";
    console.log(render(lang));
}
