# Demo Objects used by the samples

Every sample reads and writes two Objects: `sample_customer` and `sample_order`. Create them in
the Workspace before running the samples, either by importing `sdk-sample-objects.xlsx` with the
Cogover Object import, or by hand from the tables below. `src/workspace.d.ts` declares exactly
these Objects, fields and option slugs; if your Workspace ends up with different slugs, regenerate
the declaration (`npx cogover-generate-workspace-types objects.json src/workspace.d.ts`) and
search the samples for the old slug.

## `sample_customer` (Sample customer)

| Field | Slug | Type | Notes |
|---|---|---|---|
| Name | `name` | Short text, required | Record name |
| Email | `email` | Email | **Enable Unique** on this field: `records.upsertByUniqueField("email", ...)` matches on it |
| Phone | `phone` | Phone | |
| Tier | `tier` | Single choice | Options `bronze`, `silver`, `gold` |
| Is active | `is_active` | Boolean | Default `true` |
| Website | `website` | URL | Read and written as `UrlValue` `{ url, alias }` |
| Credit limit | `credit_limit` | Decimal | |
| Note | `note` | Long text | |

## `sample_order` (Sample order)

| Field | Slug | Type | Notes |
|---|---|---|---|
| Name | `name` | Short text, required | Record name |
| Customer | `customer` | Lookup to `sample_customer` | Read as `RecordReference<"sample_customer">` |
| Status | `status` | Single choice | Options `new` (default), `confirmed`, `shipped`, `cancelled` |
| Subtotal | `subtotal` | Decimal | |
| Discount | `discount` | Decimal | Amount, not a percentage |
| Total | `total` | Decimal | Kept equal to `subtotal - discount` by the before-change trigger |
| Ordered at | `ordered_at` | Date time | Unix milliseconds in the SDK |
| Tags | `tags` | Multi choices | Options `rush`, `gift`, `wholesale` |
| Files | `files` | File, multiple (0 to 10) | Read as `readonly FileValue[]`; the samples never upload files |
| Note | `note` | Long text | Written by the after-change trigger |

## Permissions

The Project's approved identity policy decides what the samples may do:

- Read and write both Objects with the caller's identity (`data.object(...)`).
- `data.asUser(personnelId)` and `data.asSystem()` need explicit approval; without it the two
  identity samples answer with `IDENTITY_NOT_GRANTED` instead of failing.
- Outbound `fetch` needs the destinations `registry.npmjs.org` and `httpbin.org` to be allowed.
- Push messages must be enabled for the deployment; otherwise every push sample throws `PUSH_DISABLED`.
- Background jobs run only for the active published version: `POST /jobs/enqueue` answers `r: 1005`
  until this project is published and activated. The scheduled job `sample_cancel_stale_orders`
  then runs nightly as the system identity and needs `allowInternalSystem: true`.
- Secrets: create `sample_erp_token` and `sample_webhook_secret` (readable) and the credential
  `sample_httpbin` (BEARER, allowed host `httpbin.org`) with `cogover-dev secrets set`. A local
  Development Session uses them only when its administrator allowed secrets.
- Inbound webhooks: `cogover-dev inbound create <name>` prints the webhook URL; the `/hooks/` routes
  answer 403 to any other caller.
