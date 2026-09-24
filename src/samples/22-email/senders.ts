import { CogoverApiError } from "@cogover/sdk";
import type { EmailApi, EmailSenderInfo, EmailSenderKind } from "@cogover/sdk";
import { defineSample } from "../../sample.js";

/**
 * Lists the mailboxes this execution may send from: the shared Workspace mailboxes named in the
 * `email` section of the Project's identity policy (`kind: "workspace"`, used as `{ mailbox: id }`),
 * and the caller's default personal mailbox when the policy allows it (`kind: "actor"`, used as
 * `from: "actor"`). It sends nothing, so it also works in a read-only session.
 */
export default defineSample({
    id: "email.senders",
    method: "GET",
    path: "/email/senders",
    summary: "email.senders(): list the mailboxes the Project policy lets this execution send from.",
    sdk: ["context.email", "EmailApi", "email.senders", "EmailSenderInfo", "EmailSenderKind"],
    file: "src/samples/22-email/senders.ts",
    curl: `curl -s "$BASE/email/senders"`,
    handler: async ({ email }) => {
        const api: EmailApi = email;
        try {
            const senders: readonly EmailSenderInfo[] = await api.senders();
            const count = (kind: EmailSenderKind) => senders.filter(sender => sender.kind === kind).length;
            return {
                senders,
                workspaceMailboxes: count("workspace"),
                actorMailbox: count("actor") > 0,
                hint: senders.length === 0
                    ? "Add mailbox IDs to the email section of the Project identity policy and approve it for this version."
                    : "Send with { mailbox: id } for a Workspace mailbox, or from: \"actor\" for the caller's own mailbox.",
            };
        } catch (error) {
            if (error instanceof CogoverApiError && error.code === "EMAIL_DISABLED") {
                return { r: 1030, msg: "Email is not enabled for this Workspace.", code: error.code };
            }
            throw error;
        }
    },
});
