# Cogover SDK Samples

[English](README.md) | [Tiếng Việt](README.vi.md)

Runnable samples for every public API of [`@cogover/sdk`](https://www.npmjs.com/package/@cogover/sdk),
the TypeScript SDK of Cogover Custom Backend Modules. **One file is one HTTP route**: run the project
locally, open the catalog at the project URL and `curl` any sample. Record triggers live next to the
routes. Use the repository to try an API before using it, or as a lookup index: every sample names
the SDK APIs it demonstrates.

The project is built from the
[Custom Backend Module starter](https://github.com/cogover/custom-backend-module-starter-project),
so local development, testing and publishing work exactly as in the starter. It covers the
`@cogover/sdk` version pinned in `package.json`.

## What is inside

- `src/samples/<area>/<name>.ts`: one sample per file, one route per sample, grouped by SDK area
  (router, response, records, filters, identity, state, locks, fetch, schema, logging, errors, push,
  jobs, secrets, crypto, inbound webhooks, organization, notifications, email).
- `src/triggers/`: before-change and after-change record triggers on the demo Object `sample_order`.
- `src/jobs/`: an enqueued background job and a scheduled one, declared with `defineJob`.
- `GET /`: the catalog. It lists every sample with its route, the SDK APIs it shows, its source file
  and a ready-to-run `curl`.
- `src/entries/define-script.ts`: the single-endpoint entry style (`defineScript`) as an alternative
  to the router.
- `src/workspace.d.ts`: typed declarations of the two demo Objects, so every record call is
  type-checked.
- `npm run coverage`: fails when a public export of the installed SDK has no sample.

## Requirements

- Node.js 20 or later and the Cogover Dev CLI 0.13 or later (`npm install --global @cogover/dev-cli`).
- A Cogover Workspace where you can create Objects and a Custom Backend Module Project.
- A Project key for local Development Sessions, and a Workspace API key if you publish.

## Quick start

1. Install the dependencies:

   ```bash
   git clone https://github.com/cogover/cogover-sdk-samples.git
   cd cogover-sdk-samples
   npm install
   ```

2. Create the two demo Objects `sample_customer` and `sample_order` in the Workspace. Import
   [`setup/sdk-sample-objects.xlsx`](setup/sdk-sample-objects.xlsx) or follow
   [`setup/objects.md`](setup/objects.md). Enable **Unique** on `sample_customer.email`.

3. Create a Custom Backend Module Project in the Workspace, then configure the local project:

   ```bash
   cp cogover.example.json cogover.json
   ```

   Fill in `runtimeUrl` (the Workspace HTTPS origin), `projectId` and `projectSlug`. The identity
   policy of the Project decides what the samples may do; see the permissions section of
   `setup/objects.md`.

4. Log in with the Project key and check the setup:

   ```bash
   cogover-dev login --profile <project-slug>
   cogover-dev doctor --profile <project-slug>
   ```

5. Start the local server through a Development Session:

   ```bash
   COGOVER_LOCAL_PORT=3100 cogover-dev run --profile <project-slug> -- npm run dev
   ```

6. Open the catalog and try a sample. Every `curl` in the catalog uses `$BASE`. The catalog is
   served at the project URL itself, without a trailing slash:

   ```bash
   BASE=http://127.0.0.1:3100/api/v1/ts-projects/<project-slug>
   curl -s "$BASE" | jq '.samples[] | {id, method, path}'
   curl -s "$BASE/router/hello"
   curl -s -X POST "$BASE/records/create" -H "Content-Type: application/json" --data '{"name":"Laptop order","subtotal":1500}'
   ```

The local server always needs a Development Session, even for samples that never call Cogover:
it reads the invocation snapshot from the session. `npm test` exercises the session-free samples
(router, responses, invocation, errors) without one.

## Sample index

The tables are generated from the catalog by `npm run catalog -- --write`.

<!-- catalog:start -->

### Router and request context

| Route | File | SDK APIs | Summary |
|---|---|---|---|
| `GET /router/hello` | [01-router/hello.ts](src/samples/01-router/hello.ts) | `createRouter`, `router.get`, `router.addRoute`, `router.toHandler`, `ScriptHandler` | The smallest route: return a plain object and Cogover sends it as JSON with status 200. |
| `GET /router/path-params/:orderId/:lineNo` | [01-router/path-params.ts](src/samples/01-router/path-params.ts) | `request.params`, `ScriptPathParams` | Dynamic segments `:orderId` and `:lineNo` arrive percent-decoded in request.params. |
| `GET /router/query` | [01-router/query.ts](src/samples/01-router/query.ts) | `request.query`, `ScriptQuery` | request.query: single values are strings, repeated names become readonly arrays. |
| `GET /router/headers` | [01-router/headers.ts](src/samples/01-router/headers.ts) | `request.headers`, `ScriptHeaders` | request.headers: lower-case, allowlisted by Cogover; credentials are never exposed. |
| `POST /router/body` | [01-router/body.ts](src/samples/01-router/body.ts) | `request.body`, `ScriptRequest`, `ValidationError` | A typed JSON body via request.body, validated at runtime; invalid input throws ValidationError (HTTP 400). |
| `POST /router/input-vs-body` | [01-router/input-vs-body.ts](src/samples/01-router/input-vs-body.ts) | `context.input`, `request.method`, `request.path`, `RequestMethod` | The difference between context.input (whole invocation input) and request.body (business payload). |

### HTTP responses

| Route | File | SDK APIs | Summary |
|---|---|---|---|
| `POST /response/json` | [02-response/json-status.ts](src/samples/02-response/json-status.ts) | `response.json`, `ResponseApi`, `ResponseInit`, `ResponseHeaderValue`, `ScriptResponse` | response.json() with a custom status (201) and response headers. |
| `GET /response/text` | [02-response/text.ts](src/samples/02-response/text.ts) | `response.text` | response.text(): a plain-text body with an optional status and headers. |
| `GET /response/bytes` | [02-response/bytes.ts](src/samples/02-response/bytes.ts) | `response.bytes`, `BinaryResponseInit` | response.bytes(): binary body (here a CSV download) with a custom content type. |
| `DELETE /response/empty` | [02-response/empty.ts](src/samples/02-response/empty.ts) | `response.empty` | response.empty() (204, no body) versus returning null (200 with a JSON null). |
| `GET /response/redirect` | [02-response/redirect.ts](src/samples/02-response/redirect.ts) | `response.redirect` | response.redirect(): a 302 (or 301/303/307/308) redirect to an absolute or relative location. |

### Invocation identity

| Route | File | SDK APIs | Summary |
|---|---|---|---|
| `GET /invocation` | [03-invocation/invocation.ts](src/samples/03-invocation/invocation.ts) | `context.invocation`, `InvocationContext`, `UserInvocationContext`, `SystemInvocationContext`, `InboundInvocationContext`, `CurrentWorkspace`, `CurrentUser`, `CurrentWorkspaceMembership`, `CurrentWorkspaceRole` | context.invocation: who is calling (user, system or inbound webhook) and which workspace, without a data request. |
| `GET /invocation/role-check` | [03-invocation/role-check.ts](src/samples/03-invocation/role-check.ts) | `CurrentWorkspaceMembership.isSuperAdmin`, `CurrentWorkspaceMembership.roles`, `CurrentWorkspaceRole` | membership.isSuperAdmin and membership.roles: allow an action for Super Admins or holders of one role, compared by id. |

### Records: read

| Route | File | SDK APIs | Summary |
|---|---|---|---|
| `GET /records/get/:recordId` | [04-records-read/get.ts](src/samples/04-records-read/get.ts) | `data.object`, `records.get`, `GetRecordOptions`, `CogoverRecord`, `ObjectClient`, `FileValue` | records.get(id, { fields }): read one record; null when missing or not visible to the caller. |
| `POST /records/get-many` | [04-records-read/get-many.ts](src/samples/04-records-read/get-many.ts) | `records.getMany`, `GetManyOptions`, `GetManyResult` | records.getMany(ids, { fields }): read up to 200 records in one call and index them by ID. |
| `GET /records/list` | [04-records-read/list.ts](src/samples/04-records-read/list.ts) | `records.list`, `ListOptions`, `RecordPage`, `RecordsApi` | records.list({ fields, orderBy, limit, cursor }): one page of records with total and nextCursor. |
| `GET /records/list-paging` | [04-records-read/list-paging.ts](src/samples/04-records-read/list-paging.ts) | `records.list`, `RecordPage.nextCursor`, `CogoverRecordId` | Follow records.list() cursors page by page until nextCursor is absent (bounded by maxPages). |

### Records: write

| Route | File | SDK APIs | Summary |
|---|---|---|---|
| `POST /records/create` | [05-records-write/create.ts](src/samples/05-records-write/create.ts) | `records.create`, `CreateFields`, `CogoverRecordId`, `WriteObjectClient`, `RecordWritesApi` | records.create(fields): create one record and get its CogoverRecordId. |
| `PATCH /records/update/:recordId` | [05-records-write/update.ts](src/samples/05-records-write/update.ts) | `records.update`, `UpdateFields`, `CogoverRecordId` | records.update(id, fields): change some fields of one record; null clears a field. |
| `POST /records/batch-insert` | [05-records-write/batch-insert.ts](src/samples/05-records-write/batch-insert.ts) | `records.batchInsert`, `BatchWriteResponse`, `BatchWriteRowResult` | records.batchInsert(records): create up to 200 records; inspect the per-row results. |
| `POST /records/batch-update` | [05-records-write/batch-update.ts](src/samples/05-records-write/batch-update.ts) | `records.batchUpdate`, `BatchUpdateItem` | records.batchUpdate(items): set a status on up to 200 records in one call. |
| `POST /records/upsert` | [05-records-write/upsert.ts](src/samples/05-records-write/upsert.ts) | `records.upsertByUniqueField`, `UpsertFields`, `UpsertResult` | records.upsertByUniqueField("email", fields): update the matching customer or create it. |
| `DELETE /records/delete-many` | [05-records-write/delete-many.ts](src/samples/05-records-write/delete-many.ts) | `records.deleteMany`, `DeleteResult`, `CogoverApiError.r` | records.deleteMany(ids): delete orders (or customers with object: "sample_customer"); compare deleted with the request. |
| `POST /records/lookup-reference` | [05-records-write/lookup-reference.ts](src/samples/05-records-write/lookup-reference.ts) | `RecordReference`, `records.create`, `records.get` | Write a lookup field with an ID and read it back as a RecordReference { id, name, objectSlug }. |
| `POST /records/field-values` | [05-records-write/field-values.ts](src/samples/05-records-write/field-values.ts) | `UrlValue`, `CreateFields`, `UpdateFields`, `records.create`, `records.update`, `records.get`, `records.deleteMany` | Value formats per field type (text, boolean, choice, UrlValue, number) and clearing with null. |

### Filters and sorting

| Route | File | SDK APIs | Summary |
|---|---|---|---|
| `GET /filters/operators` | [06-filters/operators.ts](src/samples/06-filters/operators.ts) | `object.fields`, `FieldReferences`, `FieldReference`, `FilterCondition`, `FilterOperator`, `records.list` | All FieldReference operators (eq, neq, gt, gte, lt, lte, like, notLike, startsWith, endsWith, in, notIn, isNull, notNull, between) plus tagsIn on an array field; run one with ?op=. |
| `GET /filters/and-or` | [06-filters/and-or.ts](src/samples/06-filters/and-or.ts) | `and`, `or`, `FilterGroup`, `FilterExpression` | and()/or(): combine conditions into nested FilterGroup expressions. |
| `GET /filters/sort` | [06-filters/sort.ts](src/samples/06-filters/sort.ts) | `FieldReference.asc`, `FieldReference.desc`, `SortExpression`, `ListOptions.orderBy` | orderBy with several SortExpressions (asc/desc), including the system field updated. |
| `GET /filters/system-fields` | [06-filters/system-fields.ts](src/samples/06-filters/system-fields.ts) | `FieldReferences (id, created, updated, created_by)` | Filter by the system fields id, created, updated and created_by. |
| `POST /filters/raw-expression` | [06-filters/raw-expression.ts](src/samples/06-filters/raw-expression.ts) | `FilterCondition`, `FilterGroup`, `FilterExpression`, `FilterOperator` | Build FilterCondition/FilterGroup objects from request data instead of the typed field helpers. |

### Execution identities

| Route | File | SDK APIs | Summary |
|---|---|---|---|
| `GET /identity/as-user/:personnelId` | [07-identity/as-user.ts](src/samples/07-identity/as-user.ts) | `data.asUser`, `AsUserDataApi`, `PermissionDeniedError` | data.asUser(personnelId): read records with another person's permissions (needs identity approval). |
| `GET /identity/as-system` | [07-identity/as-system.ts](src/samples/07-identity/as-system.ts) | `data.asSystem`, `DataApi`, `data.object` | data.asSystem(): compare the records visible to the caller with those visible to the system. |

### Project state

| Route | File | SDK APIs | Summary |
|---|---|---|---|
| `GET /state/get/:key` | [08-state/get.ts](src/samples/08-state/get.ts) | `context.state`, `ProjectState`, `state.namespace`, `namespace.get`, `StateNamespace`, `StateEntry` | state.namespace(name).get(key): read a durable JSON entry (value, version, timestamps) or null. |
| `PUT /state/set/:key` | [08-state/set.ts](src/samples/08-state/set.ts) | `namespace.set`, `StateWriteOptions` | namespace.set(key, value, { ttlSeconds }): upsert a JSON value with an optional expiry. |
| `DELETE /state/delete/:key` | [08-state/delete.ts](src/samples/08-state/delete.ts) | `namespace.delete`, `StateDeleteOptions`, `StateConflictError` | namespace.delete(key, { expectedVersion }): delete an entry, optionally only at a known version. |
| `POST /state/counter/:key` | [08-state/counter.ts](src/samples/08-state/counter.ts) | `namespace.get`, `namespace.set`, `StateWriteOptions.expectedVersion`, `StateConflictError` | Increment a counter safely with expectedVersion (compare-and-set) and retry on StateConflictError. |

### Distributed locks

| Route | File | SDK APIs | Summary |
|---|---|---|---|
| `POST /locks/with-lock/:key` | [09-locks/with-lock.ts](src/samples/09-locks/with-lock.ts) | `context.locks`, `DistributedLocks`, `locks.withLock`, `LockOptions`, `LockUnavailableError` | locks.withLock(key, options, callback): run a protected section and release automatically. |
| `POST /locks/acquire/:key` | [09-locks/acquire-release.ts](src/samples/09-locks/acquire-release.ts) | `locks.acquire`, `LockLease`, `lease.renew`, `lease.release`, `LockLostError` | locks.acquire() / lease.renew() / lease.release(): manual lease control, null when busy. |

### Outbound HTTP fetch

| Route | File | SDK APIs | Summary |
|---|---|---|---|
| `GET /fetch/get-json` | [10-fetch/get-json.ts](src/samples/10-fetch/get-json.ts) | `fetch`, `CogoverFetchResponse`, `CogoverFetchHeaders`, `response.json` | fetch(url): GET a public HTTPS resource and read the JSON body (latest @cogover/sdk version). |
| `POST /fetch/post-json` | [10-fetch/post-json.ts](src/samples/10-fetch/post-json.ts) | `fetch`, `CogoverFetchInit` | fetch(url, { method: "POST", headers, body, timeoutMs }): send JSON to an external HTTPS API. |
| `GET /fetch/errors` | [10-fetch/error-handling.ts](src/samples/10-fetch/error-handling.ts) | `fetch`, `CogoverApiError`, `RateLimitError`, `ValidationError` | Catch fetch failures: CogoverApiError codes (FETCH_TIMEOUT, FETCH_BLOCKED, ...), RateLimitError, ValidationError. |
| `GET /fetch/credential` | [10-fetch/credential.ts](src/samples/10-fetch/credential.ts) | `fetch`, `CogoverFetchInit.credential` | fetch(url, { credential }): let Cogover attach a stored credential; the code never sees the value. |

### Schema

| Route | File | SDK APIs | Summary |
|---|---|---|---|
| `GET /schema/object` | [11-schema/object-metadata.ts](src/samples/11-schema/object-metadata.ts) | `context.schema`, `SchemaApi`, `schema.object`, `ObjectMetadata` | schema.object(slug): fields, types, flags and choice options of an Object. |

### Logging

| Route | File | SDK APIs | Summary |
|---|---|---|---|
| `POST /log/levels` | [12-logging/levels.ts](src/samples/12-logging/levels.ts) | `context.log`, `ScriptLogger`, `log.debug`, `log.info`, `log.warn`, `log.error` | log.debug/info/warn/error(message, details): write structured entries to the project log. |

### Errors

| Route | File | SDK APIs | Summary |
|---|---|---|---|
| `GET /errors/catch/:recordId` | [13-errors/catch-api-error.ts](src/samples/13-errors/catch-api-error.ts) | `CogoverApiError`, `CogoverApiError.code`, `CogoverApiError.r`, `NotFoundError`, `PermissionDeniedError` | Catch CogoverApiError (and subclasses) from a data call and return a custom { r, msg } response. |
| `GET /errors/not-found/:recordId` | [13-errors/not-found.ts](src/samples/13-errors/not-found.ts) | `NotFoundError` | Throw NotFoundError when a record is missing: Cogover answers HTTP 404 with code NOT_FOUND. |
| `POST /errors/validation` | [13-errors/validation.ts](src/samples/13-errors/validation.ts) | `ValidationError` | Throw ValidationError for bad input: Cogover answers HTTP 400 with code VALIDATION_ERROR. |
| `GET /errors/mapping/:name` | [13-errors/error-mapping.ts](src/samples/13-errors/error-mapping.ts) | `CogoverApiError`, `NotFoundError`, `ValidationError`, `PermissionDeniedError`, `RateLimitError`, `RetryableError`, `StateConflictError`, `LockUnavailableError`, `LockLostError` | Throw each public error class to see its HTTP status; /errors/mapping/list shows the table. |

### Push messages

| Route | File | SDK APIs | Summary |
|---|---|---|---|
| `POST /push/refresh-records` | [14-push/refresh-records.ts](src/samples/14-push/refresh-records.ts) | `context.push`, `PushApi`, `push.refreshRecords`, `PushOptions` | push.refreshRecords(object, recordIds, options): make open record pages reload. |
| `POST /push/toast` | [14-push/toast.ts](src/samples/14-push/toast.ts) | `push.toast`, `ToastMessage`, `ToastLink`, `ToastPosition`, `ToastSize`, `PushRecipients` | push.toast(message, options): show a notification to record viewers or to specific people. |
| `POST /push/message` | [14-push/message.ts](src/samples/14-push/message.ts) | `push.message`, `BackgroundMessage`, `BackgroundContentType` | push.message({ content, contentType, object, recordIds }): a silent message for custom components. |

### Compatibility

| Route | File | SDK APIs | Summary |
|---|---|---|---|
| `GET /legacy/create-greeting` | [15-legacy/create-greeting.ts](src/samples/15-legacy/create-greeting.ts) | `createGreeting` | createGreeting(name): the SDK 0.1.x compatibility helper. |

### Background jobs

| Route | File | SDK APIs | Summary |
|---|---|---|---|
| `POST /jobs/enqueue` | [16-jobs/enqueue.ts](src/samples/16-jobs/enqueue.ts) | `context.jobs`, `JobsApi`, `jobs.enqueue`, `EnqueueOptions`, `EnqueueResult`, `defineJob` | jobs.enqueue(key, payload, { idempotencyKey }): start a background job run; duplicate keys return the existing run. |
| `POST /jobs/enqueue-delayed` | [16-jobs/enqueue-delayed.ts](src/samples/16-jobs/enqueue-delayed.ts) | `jobs.enqueue`, `EnqueueOptions.delayMs`, `EnqueueOptions.runAt`, `JobSchedule` | jobs.enqueue(key, null, { delayMs } \| { runAt }): run a job later instead of as soon as possible. |

### Secrets

| Route | File | SDK APIs | Summary |
|---|---|---|---|
| `GET /secrets/get/:name` | [17-secrets/get.ts](src/samples/17-secrets/get.ts) | `context.secrets`, `SecretsApi`, `secrets.get` | secrets.get(name): read a project secret without ever exposing its value. |

### Cryptography

| Route | File | SDK APIs | Summary |
|---|---|---|---|
| `POST /crypto/sha256` | [18-crypto/sha256.ts](src/samples/18-crypto/sha256.ts) | `crypto`, `context.crypto`, `CryptoApi`, `crypto.sha256` | crypto.sha256(data, encoding): SHA-256 of a string or bytes as hex or base64. |
| `POST /crypto/hmac` | [18-crypto/hmac.ts](src/samples/18-crypto/hmac.ts) | `crypto.hmacSha256` | crypto.hmacSha256(key \| { secret }, data): sign data with a key or with a project secret you never read. |
| `POST /crypto/verify` | [18-crypto/verify-signature.ts](src/samples/18-crypto/verify-signature.ts) | `crypto.hmacSha256`, `crypto.timingSafeEqual` | Recompute an HMAC and compare it with crypto.timingSafeEqual() to verify a signature. |
| `POST /crypto/timing-safe-equal` | [18-crypto/timing-safe-equal.ts](src/samples/18-crypto/timing-safe-equal.ts) | `crypto.timingSafeEqual` | crypto.timingSafeEqual(a, b): compare tokens or signatures in constant time. |
| `GET /crypto/random` | [18-crypto/random.ts](src/samples/18-crypto/random.ts) | `crypto.randomBytes`, `crypto.randomUUID` | crypto.randomBytes(length) and crypto.randomUUID(): secure tokens, nonces and IDs. |
| `POST /crypto/aes/encrypt` | [18-crypto/aes-encrypt.ts](src/samples/18-crypto/aes-encrypt.ts) | `crypto.aesEncrypt`, `AesKey`, `AesMode`, `AesEncryptOptions`, `AesEncryptResult`, `BinaryEncoding` | crypto.aesEncrypt(key \| { secret }, data, options): AES-GCM or AES-CBC with a new random IV. |
| `POST /crypto/aes/decrypt` | [18-crypto/aes-decrypt.ts](src/samples/18-crypto/aes-decrypt.ts) | `crypto.aesDecrypt`, `AesDecryptOptions`, `DecryptOutput` | crypto.aesDecrypt(key \| { secret }, ciphertext, { iv, tag?, aad?, output? }): decrypt and authenticate. |
| `POST /crypto/rsa/encrypt` | [18-crypto/rsa-encrypt.ts](src/samples/18-crypto/rsa-encrypt.ts) | `crypto.rsaEncrypt`, `AsymmetricKey`, `RsaEncryptOptions`, `RsaPadding` | crypto.rsaEncrypt(publicKey, data, { padding? }): encrypt a small value with an RSA public key. |
| `POST /crypto/rsa/decrypt` | [18-crypto/rsa-decrypt.ts](src/samples/18-crypto/rsa-decrypt.ts) | `crypto.rsaDecrypt`, `SecretKeyReference`, `RsaDecryptOptions`, `DecryptOutput` | crypto.rsaDecrypt({ secret }, ciphertext, { padding?, output? }): decrypt with a private key kept in a secret. |
| `POST /crypto/sign` | [18-crypto/sign.ts](src/samples/18-crypto/sign.ts) | `crypto.sign`, `SignatureAlgorithm`, `SignatureOptions` | crypto.sign(algorithm, { secret }, data, options): RSA, RSA-PSS or ECDSA signature with a private key kept in a secret. |
| `POST /crypto/verify-public-key` | [18-crypto/verify-public-key.ts](src/samples/18-crypto/verify-public-key.ts) | `crypto.verify`, `AsymmetricKey`, `SignatureAlgorithm`, `SignatureOptions` | crypto.verify(algorithm, publicKey, data, signature, options): check an RSA or ECDSA signature. |
| `POST /crypto/jwt/verify` | [18-crypto/jwt-verify.ts](src/samples/18-crypto/jwt-verify.ts) | `crypto.verify`, `AsymmetricKey`, `SignatureAlgorithm`, `SignatureOptions` | Verify an RS256, PS256 or ES256 JWT with crypto.verify() and base64url signatures, then check exp and nbf. |

### Inbound webhooks

| Route | File | SDK APIs | Summary |
|---|---|---|---|
| `POST /hooks/ping` | [19-inbound/hooks-ping.ts](src/samples/19-inbound/hooks-ping.ts) | `InboundInvocationContext`, `invocation.inbound`, `request.rawBody`, `request.contentType` | A webhook route under /hooks/: accept only inbound calls and echo invocation.inbound and the raw body. |
| `POST /hooks/order-events` | [19-inbound/hooks-order-events.ts](src/samples/19-inbound/hooks-order-events.ts) | `invocation.identity`, `request.rawBody`, `crypto.hmacSha256`, `crypto.timingSafeEqual`, `jobs.enqueue` | Webhook receiver: verify an HMAC signature over request.rawBody with a secret, then enqueue a job keyed by the event ID. |

### Organization structure

| Route | File | SDK APIs | Summary |
|---|---|---|---|
| `GET /org/me` | [20-org/me.ts](src/samples/20-org/me.ts) | `org.me`, `OrgApi`, `OrgPersonnel`, `OrgMembership`, `OrgPersonnelDisplay`, `OrgReadOptions` | org.me: the caller's departments, positions and manager level, with names when ?display=true. |
| `GET /org/personnel` | [20-org/personnel-many.ts](src/samples/20-org/personnel-many.ts) | `org.personnel.getMany`, `OrgPersonnelApi`, `OrgGetManyResult` | org.personnel.getMany: names and departments of up to 200 personnel, with the IDs that are not active personnel. |
| `GET /org/departments/tree` | [20-org/department-tree.ts](src/samples/20-org/department-tree.ts) | `org.departments.tree`, `OrgDepartmentsApi`, `OrgTreeOptions`, `OrgDepartmentNode`, `OrgNameDisplay` | org.departments.tree: the department tree with names, from every root or ?rootId=, limited by ?depth=. |
| `GET /org/departments/:departmentId/members` | [20-org/department-members.ts](src/samples/20-org/department-members.ts) | `org.departments.members`, `org.departments.ancestors`, `OrgDepartmentMembersOptions`, `OrgPageOptions`, `OrgPage`, `OrgMember`, `OrgDepartment` | org.departments.members and ancestors: a page of members with names, the breadcrumb, and cursor paging. |
| `GET /org/positions` | [20-org/positions.ts](src/samples/20-org/positions.ts) | `org.positions.list`, `org.positions.get`, `org.positions.members`, `OrgPositionsApi`, `OrgPosition`, `OrgPositionMembersOptions` | org.positions.list, get and members: the position catalog, where a position applies, and who holds it. |
| `GET /org/personnel/:personnelId/managers` | [20-org/manager-chain.ts](src/samples/20-org/manager-chain.ts) | `org.personnel.managerChain`, `org.departments.managers`, `OrgPersonnelChainOptions`, `OrgManagerOptions`, `OrgManagerChain`, `OrgManagerTier` | org.personnel.managerChain and departments.managers: approvers nearest first, plus the heads of the start department. |
| `POST /org/approval-check` | [20-org/approval-check.ts](src/samples/20-org/approval-check.ts) | `org.isManagerOf`, `org.isInDepartment`, `OrgIsManagerOfOptions`, `OrgIsInDepartmentOptions` | org.isManagerOf and org.isInDepartment: allow an approval for the owner's managers or a finance department. |

### Notifications

| Route | File | SDK APIs | Summary |
|---|---|---|---|
| `POST /notifications/send` | [21-notifications/send.ts](src/samples/21-notifications/send.ts) | `context.notifications`, `NotificationsApi`, `notifications.send`, `NotificationMessage`, `NotificationResult`, `NotificationContentType`, `NotificationDisplay` | notifications.send(message): notify people in their notification list, with an email copy per channel. |
| `POST /notifications/order-approval/:orderId` | [21-notifications/order-approval.ts](src/samples/21-notifications/order-approval.ts) | `notifications.send`, `NotificationLink`, `NotificationLinkTarget`, `NotificationSender`, `idempotencyKey` | notifications.send with sender, link and idempotencyKey: ask approvers to review an order exactly once. |

### Email

| Route | File | SDK APIs | Summary |
|---|---|---|---|
| `GET /email/senders` | [22-email/senders.ts](src/samples/22-email/senders.ts) | `context.email`, `EmailApi`, `email.senders`, `EmailSenderInfo`, `EmailSenderKind` | email.senders(): list the mailboxes the Project policy lets this execution send from. |
| `POST /email/send` | [22-email/send.ts](src/samples/22-email/send.ts) | `email.send`, `EmailMessage`, `EmailSender`, `EmailRecipient`, `EmailSendResult`, `EmailDelivery`, `PermissionDeniedError` | email.send(message): send an email from a granted Workspace or personal mailbox. |
| `POST /email/customers/:customerId` | [22-email/customer-email.ts](src/samples/22-email/customer-email.ts) | `email.send`, `EmailRecordLink`, `EmailAttachment`, `recordEmailFields`, `appendSignature` | email.send with record, recordEmailFields and attachments: email a customer and log it on the timeline. |

### Record triggers

| Key | Timing | Operations | File |
|---|---|---|---|
| `sample_order_validate_amounts` | beforeChange | create, update | [before-change-validate.ts](src/triggers/before-change-validate.ts) |
| `sample_order_compute_total` | beforeChange | create, update | [before-change-compute-total.ts](src/triggers/before-change-compute-total.ts) |
| `sample_order_block_delete_shipped` | beforeChange | delete | [before-change-block-delete.ts](src/triggers/before-change-block-delete.ts) |
| `sample_order_note_when_shipped` | afterChange | create, update | [after-change-note-when-shipped.ts](src/triggers/after-change-note-when-shipped.ts) |

### Background jobs

| Key | Schedule | File |
|---|---|---|
| `sample_recount_orders` | on enqueue | [recount-orders.ts](src/jobs/recount-orders.ts) |
| `sample_cancel_stale_orders` | `0 2 * * *` (Asia/Ho_Chi_Minh) | [cancel-stale-orders.ts](src/jobs/cancel-stale-orders.ts) |

Total: 81 routes, 4 record triggers and 2 background jobs.
<!-- catalog:end -->

## Record triggers on the local server

Cogover runs triggers only for the active published version. Locally, the runner of the starter
executes one trigger with real records read through the Development Session:

```bash
curl -s "http://127.0.0.1:3100/__cogover/triggers"
curl -s -X POST "http://127.0.0.1:3100/__cogover/triggers/sample_order_compute_total" \
  -H "Content-Type: application/json" \
  --data '{"operation":"update","recordId":"<sample_order id>","changes":{"subtotal":1000,"discount":100}}'
```

The response shows the `changes` and `errors` each trigger produced. Start the session with
`cogover-dev run --allow-writes=false` while testing before-change triggers, so that a write in a
handler fails locally as it would on Cogover. The after-change trigger writes a note and pushes a
refresh, so it needs a session that allows writes.

## Background jobs, secrets and inbound webhooks

These three areas are declared in code but configured on Cogover, so their samples answer with an
explicit `r`/`msg` object instead of failing when the configuration is missing:

- **Jobs** (`src/jobs/`, `POST /jobs/enqueue`, `POST /jobs/enqueue-delayed`): Cogover accepts an
  enqueue only for job keys declared by the active published version, and the local server does
  not execute jobs. Publish and activate this project, then enqueue from the route or with the CLI,
  and follow the run:

  ```bash
  cogover-dev jobs enqueue sample_recount_orders
  cogover-dev jobs runs
  cogover-dev jobs schedules
  ```

  The enqueued job stores its result under `GET /state/get/order-count`.
- **Secrets** (`GET /secrets/get/:name`, `POST /crypto/hmac` with `secret`, `GET /fetch/credential`):
  store a readable secret and a credential for the project, then read or use them:

  ```bash
  cogover-dev secrets set sample_erp_token
  cogover-dev secrets set sample_webhook_secret
  cogover-dev secrets set sample_httpbin --kind bearer --allowed-host httpbin.org
  ```

  The encryption and signature samples (`/crypto/aes/*`, `/crypto/rsa/*`, `/crypto/sign`,
  `/crypto/verify-public-key`, `/crypto/jwt/verify`) keep their keys in secrets. Generate test keys
  with OpenSSL and store the PEM files; delete the local files afterwards:

  ```bash
  openssl rand -base64 32 | cogover-dev secrets set sample_aes_key --value-stdin
  openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out sample-rsa.pem
  openssl pkey -in sample-rsa.pem -pubout -out sample-rsa.pub.pem
  cogover-dev secrets set sample_rsa_private_key --value-file sample-rsa.pem
  cogover-dev secrets set sample_rsa_public_key --value-file sample-rsa.pub.pem
  openssl genpkey -algorithm EC -pkeyopt ec_paramgen_curve:P-256 -out sample-ec.pem
  openssl pkey -in sample-ec.pem -pubout -out sample-ec.pub.pem
  cogover-dev secrets set sample_signing_key --value-file sample-ec.pem
  cogover-dev secrets set sample_signing_public_key --value-file sample-ec.pub.pem
  rm sample-rsa.pem sample-rsa.pub.pem sample-ec.pem sample-ec.pub.pem
  ```

  A local Development Session may use secrets only when its administrator allowed it; otherwise
  the samples answer with reason `SECRETS_NOT_ALLOWED` (or `FETCH_BLOCKED` for a credential).
- **Inbound webhooks** (`POST /hooks/ping`, `POST /hooks/order-events`): create an inbound access
  and call the printed webhook URL with the inbound key. Through the normal project URL or the
  local server the identity is a user and both routes answer 403 on purpose.

  ```bash
  cogover-dev inbound create ping
  curl -s -X POST "https://<workspace>/api/v1/ts-projects/<slug>/hooks/<inboundId>/ping" \
    -H "X-Cogover-Inbound-Key: <inbound key>" -H "Content-Type: application/json" --data '{"hello":"webhook"}'
  ```

`crypto` hashing, HMAC with an explicit key, and random values work in every context, including the
local server. AES encryption also works without secrets when the request passes a `key`; a failed
decryption answers `r: 1011` with code `DECRYPTION_FAILED`.

## Notifications and email

Both reach real people, so run them in a test Workspace and in a Development Session that allows
writes. A read-only session and a before-change trigger refuse both; `GET /email/senders` only reads
and works everywhere.

- **Notifications** (`POST /notifications/send`, `POST /notifications/order-approval/:orderId`): the
  Workspace needs its notification channels. Pass a channel record ID in `channel` to let the channel
  decide which deliveries (in-app, web push, mobile push, email copy) are used; without it all of
  them are. Personnel without a user account are returned in `skippedPersonnelIds`.
- **Email** (`GET /email/senders`, `POST /email/send`, `POST /email/customers/:customerId`): add the
  mailboxes to the `email` section of the Project identity policy and approve it for the version:

  ```json
  "email": { "workspaceMailboxIds": ["<mailboxId>"], "allowActorMailbox": true }
  ```

  `POST /email/send` sends directly from the mailbox. `POST /email/customers/:customerId` sends to the
  customer's `email` field, logs the email on the customer's timeline and attaches the files of an
  order (`orderId`). Success means Cogover accepted the email; a delivery failure later is not
  reported back to the script. Both email routes and the approval notification use an
  `idempotencyKey`, so repeating a call does not send twice.

## Single-endpoint entry point

`src/entries/define-script.ts` shows `defineScript`, the entry style for a project with one
endpoint. Run it instead of the router:

```bash
COGOVER_LOCAL_PORT=3100 cogover-dev run --profile <project-slug> -- \
  node --import tsx local/cli.ts --entry ./src/entries/define-script.ts
curl -s -X POST "$BASE" -H "Content-Type: application/json" --data '{"name":"Ada"}'
```

## Publish and activate

```bash
npm run build
cogover-dev publish
cogover-dev activate <version-id>
```

Read this before publishing to a Workspace with real data: the write samples create, update and
delete records of the demo Objects, `identity/as-system` reads without the caller's record
permissions, the push, notification and email samples reach real people, the triggers run for every write to
`sample_order`, and the scheduled job cancels stale `sample_order` records every night while the
version is active. Publish to a test Workspace, or remove the samples you do not want from
`src/samples/index.ts` and `src/triggers/index.ts`.

## Keeping up with SDK releases

Each `@cogover/sdk` release is followed by an update of this repository:

1. `npm install @cogover/sdk@<version>` and commit the lockfile.
2. Add a sample for every new export or behavior, register it in `src/samples/index.ts`, and fix
   samples affected by breaking changes.
3. `npm run check` runs the type checker, the tests and the coverage check; the coverage check lists
   every export of the installed SDK that no sample mentions.
4. `npm run catalog -- --write` refreshes the sample tables in `README.md` and `README.vi.md`.

## Tests

```bash
npm test
```

`local/samples.test.ts` starts the local server without a Development Session and exercises the
catalog and every sample that needs no Cogover capability (router, responses, invocation, error
mapping, compatibility helper). The other tests belong to the starter's local tooling.

## Project layout

```text
.
├── cogover.example.json
├── local/                    # local HTTP runner and trigger runner (from the starter)
│   └── samples.test.ts       # tests of the catalog and session-free samples
├── scripts/
│   ├── check-coverage.mjs    # every SDK export must be mentioned by a sample
│   └── print-catalog.ts      # renders the README tables from the catalog
├── setup/
│   ├── objects.md            # the demo Objects, field by field
│   └── sdk-sample-objects.xlsx
└── src/
    ├── main.ts               # registers every sample; GET / is the catalog
    ├── sample.ts             # defineSample(): one route per sample
    ├── workspace.d.ts        # typed declarations of the demo Objects
    ├── entries/define-script.ts
    ├── jobs/                 # defineJob(): one enqueued job, one scheduled job
    ├── samples/<area>/<name>.ts
    └── triggers/
```

## License

MIT
