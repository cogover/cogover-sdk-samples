# Cogover SDK Samples

[English](README.md) | [Tiếng Việt](README.vi.md)

Bộ sample chạy được cho mọi public API của [`@cogover/sdk`](https://www.npmjs.com/package/@cogover/sdk),
TypeScript SDK dành cho Cogover Custom Backend Module. **Mỗi file là một HTTP route**: chạy project
trên máy local, mở catalog tại URL của project và `curl` bất kỳ sample nào. Record trigger nằm ngay
cạnh các route. Dùng repository này để thử một API trước khi dùng thật, hoặc làm chỉ mục tra cứu:
mỗi sample ghi rõ những SDK API mà nó minh họa.

Project được dựng từ
[Custom Backend Module starter](https://github.com/cogover/custom-backend-module-starter-project),
nên phát triển local, kiểm thử và publish hoạt động giống hệt starter. Bộ sample bám theo version
`@cogover/sdk` được ghim trong `package.json`.

## Có gì bên trong

- `src/samples/<nhóm>/<tên>.ts`: mỗi file một sample, mỗi sample một route, gom theo nhóm API của
  SDK (router, response, record, filter, danh tính, state, lock, fetch, schema, logging, lỗi, push,
  job, secret, mật mã, inbound webhook).
- `src/triggers/`: record trigger before-change và after-change trên Object demo `sample_order`.
- `src/jobs/`: một background job chạy khi enqueue và một job chạy theo lịch, khai báo bằng `defineJob`.
- `GET /`: catalog. Liệt kê mọi sample kèm route, các SDK API được minh họa, file nguồn và một lệnh
  `curl` chạy ngay được.
- `src/entries/define-script.ts`: kiểu entry point một endpoint (`defineScript`) thay cho router.
- `src/workspace.d.ts`: khai báo kiểu của hai Object demo, nhờ đó mọi lời gọi record đều được
  kiểm tra kiểu.
- `npm run coverage`: báo lỗi khi một public export của SDK đang cài chưa có sample.

## Yêu cầu

- Node.js 20 trở lên và Cogover Dev CLI 0.13 trở lên (`npm install --global @cogover/dev-cli`).
- Một Workspace Cogover mà bạn có quyền tạo Object và tạo Project Custom Backend Module.
- Project key để tạo Development Session khi phát triển local, và Workspace API key nếu publish.

## Bắt đầu nhanh

1. Cài dependency:

   ```bash
   git clone https://github.com/cogover/cogover-sdk-samples.git
   cd cogover-sdk-samples
   npm install
   ```

2. Tạo hai Object demo `sample_customer` và `sample_order` trong Workspace. Import
   [`setup/sdk-sample-objects.xlsx`](setup/sdk-sample-objects.xlsx) hoặc làm theo
   [`setup/objects.md`](setup/objects.md). Bật **Unique** cho `sample_customer.email`.

3. Tạo một Project Custom Backend Module trong Workspace, rồi cấu hình project local:

   ```bash
   cp cogover.example.json cogover.json
   ```

   Điền `runtimeUrl` (HTTPS origin của Workspace), `projectId` và `projectSlug`. Identity policy
   của Project quyết định các sample được làm gì; xem mục quyền trong `setup/objects.md`.

4. Đăng nhập bằng Project key và kiểm tra cấu hình:

   ```bash
   cogover-dev login --profile <project-slug>
   cogover-dev doctor --profile <project-slug>
   ```

5. Khởi chạy local server thông qua Development Session:

   ```bash
   COGOVER_LOCAL_PORT=3100 cogover-dev run --profile <project-slug> -- npm run dev
   ```

6. Mở catalog và thử một sample. Mọi lệnh `curl` trong catalog dùng biến `$BASE`. Catalog nằm
   ngay tại URL của project, không có dấu `/` ở cuối:

   ```bash
   BASE=http://127.0.0.1:3100/api/v1/ts-projects/<project-slug>
   curl -s "$BASE" | jq '.samples[] | {id, method, path}'
   curl -s "$BASE/router/hello"
   curl -s -X POST "$BASE/records/create" -H "Content-Type: application/json" --data '{"name":"Laptop order","subtotal":1500}'
   ```

Local server luôn cần Development Session, kể cả với các sample không gọi tới Cogover: server
đọc snapshot invocation từ session. `npm test` kiểm tra các sample không cần session (router,
response, invocation, lỗi) mà không cần đăng nhập.

## Danh mục sample

Các bảng dưới đây được sinh từ catalog bằng `npm run catalog -- --write`.

<!-- catalog:start -->

### Router và request context

| Route | File | SDK API | Tóm tắt |
|---|---|---|---|
| `GET /router/hello` | [01-router/hello.ts](src/samples/01-router/hello.ts) | `createRouter`, `router.get`, `router.addRoute`, `router.toHandler`, `ScriptHandler` | The smallest route: return a plain object and Cogover sends it as JSON with status 200. |
| `GET /router/path-params/:orderId/:lineNo` | [01-router/path-params.ts](src/samples/01-router/path-params.ts) | `request.params`, `ScriptPathParams` | Dynamic segments `:orderId` and `:lineNo` arrive percent-decoded in request.params. |
| `GET /router/query` | [01-router/query.ts](src/samples/01-router/query.ts) | `request.query`, `ScriptQuery` | request.query: single values are strings, repeated names become readonly arrays. |
| `GET /router/headers` | [01-router/headers.ts](src/samples/01-router/headers.ts) | `request.headers`, `ScriptHeaders` | request.headers: lower-case, allowlisted by Cogover; credentials are never exposed. |
| `POST /router/body` | [01-router/body.ts](src/samples/01-router/body.ts) | `request.body`, `ScriptRequest`, `ValidationError` | A typed JSON body via request.body, validated at runtime; invalid input throws ValidationError (HTTP 400). |
| `POST /router/input-vs-body` | [01-router/input-vs-body.ts](src/samples/01-router/input-vs-body.ts) | `context.input`, `request.method`, `request.path`, `RequestMethod` | The difference between context.input (whole invocation input) and request.body (business payload). |

### HTTP response

| Route | File | SDK API | Tóm tắt |
|---|---|---|---|
| `POST /response/json` | [02-response/json-status.ts](src/samples/02-response/json-status.ts) | `response.json`, `ResponseApi`, `ResponseInit`, `ResponseHeaderValue`, `ScriptResponse` | response.json() with a custom status (201) and response headers. |
| `GET /response/text` | [02-response/text.ts](src/samples/02-response/text.ts) | `response.text` | response.text(): a plain-text body with an optional status and headers. |
| `GET /response/bytes` | [02-response/bytes.ts](src/samples/02-response/bytes.ts) | `response.bytes`, `BinaryResponseInit` | response.bytes(): binary body (here a CSV download) with a custom content type. |
| `DELETE /response/empty` | [02-response/empty.ts](src/samples/02-response/empty.ts) | `response.empty` | response.empty() (204, no body) versus returning null (200 with a JSON null). |
| `GET /response/redirect` | [02-response/redirect.ts](src/samples/02-response/redirect.ts) | `response.redirect` | response.redirect(): a 302 (or 301/303/307/308) redirect to an absolute or relative location. |

### Danh tính của invocation

| Route | File | SDK API | Tóm tắt |
|---|---|---|---|
| `GET /invocation` | [03-invocation/invocation.ts](src/samples/03-invocation/invocation.ts) | `context.invocation`, `InvocationContext`, `UserInvocationContext`, `SystemInvocationContext`, `InboundInvocationContext`, `CurrentWorkspace`, `CurrentUser`, `CurrentWorkspaceMembership` | context.invocation: who is calling (user, system or inbound webhook) and which workspace, without a data request. |

### Record: đọc

| Route | File | SDK API | Tóm tắt |
|---|---|---|---|
| `GET /records/get/:recordId` | [04-records-read/get.ts](src/samples/04-records-read/get.ts) | `data.object`, `records.get`, `GetRecordOptions`, `CogoverRecord`, `ObjectClient`, `FileValue` | records.get(id, { fields }): read one record; null when missing or not visible to the caller. |
| `POST /records/get-many` | [04-records-read/get-many.ts](src/samples/04-records-read/get-many.ts) | `records.getMany`, `GetManyOptions`, `GetManyResult` | records.getMany(ids, { fields }): read up to 200 records in one call and index them by ID. |
| `GET /records/list` | [04-records-read/list.ts](src/samples/04-records-read/list.ts) | `records.list`, `ListOptions`, `RecordPage`, `RecordsApi` | records.list({ fields, orderBy, limit, cursor }): one page of records with total and nextCursor. |
| `GET /records/list-paging` | [04-records-read/list-paging.ts](src/samples/04-records-read/list-paging.ts) | `records.list`, `RecordPage.nextCursor`, `CogoverRecordId` | Follow records.list() cursors page by page until nextCursor is absent (bounded by maxPages). |

### Record: ghi

| Route | File | SDK API | Tóm tắt |
|---|---|---|---|
| `POST /records/create` | [05-records-write/create.ts](src/samples/05-records-write/create.ts) | `records.create`, `CreateFields`, `CogoverRecordId`, `WriteObjectClient`, `RecordWritesApi` | records.create(fields): create one record and get its CogoverRecordId. |
| `PATCH /records/update/:recordId` | [05-records-write/update.ts](src/samples/05-records-write/update.ts) | `records.update`, `UpdateFields`, `CogoverRecordId` | records.update(id, fields): change some fields of one record; null clears a field. |
| `POST /records/batch-insert` | [05-records-write/batch-insert.ts](src/samples/05-records-write/batch-insert.ts) | `records.batchInsert`, `BatchWriteResponse`, `BatchWriteRowResult` | records.batchInsert(records): create up to 200 records; inspect the per-row results. |
| `POST /records/batch-update` | [05-records-write/batch-update.ts](src/samples/05-records-write/batch-update.ts) | `records.batchUpdate`, `BatchUpdateItem` | records.batchUpdate(items): set a status on up to 200 records in one call. |
| `POST /records/upsert` | [05-records-write/upsert.ts](src/samples/05-records-write/upsert.ts) | `records.upsertByUniqueField`, `UpsertFields`, `UpsertResult` | records.upsertByUniqueField("email", fields): update the matching customer or create it. |
| `DELETE /records/delete-many` | [05-records-write/delete-many.ts](src/samples/05-records-write/delete-many.ts) | `records.deleteMany`, `DeleteResult` | records.deleteMany(ids): delete orders (or customers with object: "sample_customer"); compare deleted with the request. |
| `POST /records/lookup-reference` | [05-records-write/lookup-reference.ts](src/samples/05-records-write/lookup-reference.ts) | `RecordReference`, `records.create`, `records.get` | Write a lookup field with an ID and read it back as a RecordReference { id, name, objectSlug }. |
| `POST /records/field-values` | [05-records-write/field-values.ts](src/samples/05-records-write/field-values.ts) | `UrlValue`, `CreateFields`, `UpdateFields`, `records.create`, `records.update`, `records.get`, `records.deleteMany` | Value formats per field type (text, boolean, choice, UrlValue, number) and clearing with null. |

### Filter và sắp xếp

| Route | File | SDK API | Tóm tắt |
|---|---|---|---|
| `GET /filters/operators` | [06-filters/operators.ts](src/samples/06-filters/operators.ts) | `object.fields`, `FieldReferences`, `FieldReference`, `FilterCondition`, `FilterOperator`, `records.list` | All FieldReference operators (eq, neq, gt, gte, lt, lte, like, notLike, startsWith, endsWith, in, notIn, isNull, notNull, between) plus tagsIn on an array field; run one with ?op=. |
| `GET /filters/and-or` | [06-filters/and-or.ts](src/samples/06-filters/and-or.ts) | `and`, `or`, `FilterGroup`, `FilterExpression` | and()/or(): combine conditions into nested FilterGroup expressions. |
| `GET /filters/sort` | [06-filters/sort.ts](src/samples/06-filters/sort.ts) | `FieldReference.asc`, `FieldReference.desc`, `SortExpression`, `ListOptions.orderBy` | orderBy with several SortExpressions (asc/desc), including the system field updated. |
| `GET /filters/system-fields` | [06-filters/system-fields.ts](src/samples/06-filters/system-fields.ts) | `FieldReferences (id, created, updated, created_by)` | Filter by the system fields id, created, updated and created_by. |
| `POST /filters/raw-expression` | [06-filters/raw-expression.ts](src/samples/06-filters/raw-expression.ts) | `FilterCondition`, `FilterGroup`, `FilterExpression`, `FilterOperator` | Build FilterCondition/FilterGroup objects from request data instead of the typed field helpers. |

### Danh tính thực thi

| Route | File | SDK API | Tóm tắt |
|---|---|---|---|
| `GET /identity/as-user/:personnelId` | [07-identity/as-user.ts](src/samples/07-identity/as-user.ts) | `data.asUser`, `AsUserDataApi`, `PermissionDeniedError` | data.asUser(personnelId): read records with another person's permissions (needs identity approval). |
| `GET /identity/as-system` | [07-identity/as-system.ts](src/samples/07-identity/as-system.ts) | `data.asSystem`, `DataApi`, `data.object` | data.asSystem(): compare the records visible to the caller with those visible to the system. |

### Project state

| Route | File | SDK API | Tóm tắt |
|---|---|---|---|
| `GET /state/get/:key` | [08-state/get.ts](src/samples/08-state/get.ts) | `context.state`, `ProjectState`, `state.namespace`, `namespace.get`, `StateNamespace`, `StateEntry` | state.namespace(name).get(key): read a durable JSON entry (value, version, timestamps) or null. |
| `PUT /state/set/:key` | [08-state/set.ts](src/samples/08-state/set.ts) | `namespace.set`, `StateWriteOptions` | namespace.set(key, value, { ttlSeconds }): upsert a JSON value with an optional expiry. |
| `DELETE /state/delete/:key` | [08-state/delete.ts](src/samples/08-state/delete.ts) | `namespace.delete`, `StateDeleteOptions`, `StateConflictError` | namespace.delete(key, { expectedVersion }): delete an entry, optionally only at a known version. |
| `POST /state/counter/:key` | [08-state/counter.ts](src/samples/08-state/counter.ts) | `namespace.get`, `namespace.set`, `StateWriteOptions.expectedVersion`, `StateConflictError` | Increment a counter safely with expectedVersion (compare-and-set) and retry on StateConflictError. |

### Distributed lock

| Route | File | SDK API | Tóm tắt |
|---|---|---|---|
| `POST /locks/with-lock/:key` | [09-locks/with-lock.ts](src/samples/09-locks/with-lock.ts) | `context.locks`, `DistributedLocks`, `locks.withLock`, `LockOptions`, `LockUnavailableError` | locks.withLock(key, options, callback): run a protected section and release automatically. |
| `POST /locks/acquire/:key` | [09-locks/acquire-release.ts](src/samples/09-locks/acquire-release.ts) | `locks.acquire`, `LockLease`, `lease.renew`, `lease.release`, `LockLostError` | locks.acquire() / lease.renew() / lease.release(): manual lease control, null when busy. |

### HTTP fetch ra ngoài

| Route | File | SDK API | Tóm tắt |
|---|---|---|---|
| `GET /fetch/get-json` | [10-fetch/get-json.ts](src/samples/10-fetch/get-json.ts) | `fetch`, `CogoverFetchResponse`, `CogoverFetchHeaders`, `response.json` | fetch(url): GET a public HTTPS resource and read the JSON body (latest @cogover/sdk version). |
| `POST /fetch/post-json` | [10-fetch/post-json.ts](src/samples/10-fetch/post-json.ts) | `fetch`, `CogoverFetchInit` | fetch(url, { method: "POST", headers, body, timeoutMs }): send JSON to an external HTTPS API. |
| `GET /fetch/errors` | [10-fetch/error-handling.ts](src/samples/10-fetch/error-handling.ts) | `fetch`, `CogoverApiError`, `RateLimitError`, `ValidationError` | Catch fetch failures: CogoverApiError codes (FETCH_TIMEOUT, FETCH_BLOCKED, ...), RateLimitError, ValidationError. |
| `GET /fetch/credential` | [10-fetch/credential.ts](src/samples/10-fetch/credential.ts) | `fetch`, `CogoverFetchInit.credential` | fetch(url, { credential }): let Cogover attach a stored credential; the code never sees the value. |

### Schema

| Route | File | SDK API | Tóm tắt |
|---|---|---|---|
| `GET /schema/object` | [11-schema/object-metadata.ts](src/samples/11-schema/object-metadata.ts) | `context.schema`, `SchemaApi`, `schema.object`, `ObjectMetadata` | schema.object(slug): fields, types, flags and choice options of an Object. |

### Logging

| Route | File | SDK API | Tóm tắt |
|---|---|---|---|
| `POST /log/levels` | [12-logging/levels.ts](src/samples/12-logging/levels.ts) | `context.log`, `ScriptLogger`, `log.debug`, `log.info`, `log.warn`, `log.error` | log.debug/info/warn/error(message, details): write structured entries to the project log. |

### Lỗi

| Route | File | SDK API | Tóm tắt |
|---|---|---|---|
| `GET /errors/catch/:recordId` | [13-errors/catch-api-error.ts](src/samples/13-errors/catch-api-error.ts) | `CogoverApiError`, `CogoverApiError.code`, `CogoverApiError.r`, `NotFoundError`, `PermissionDeniedError` | Catch CogoverApiError (and subclasses) from a data call and return a custom { r, msg } response. |
| `GET /errors/not-found/:recordId` | [13-errors/not-found.ts](src/samples/13-errors/not-found.ts) | `NotFoundError` | Throw NotFoundError when a record is missing: Cogover answers HTTP 404 with code NOT_FOUND. |
| `POST /errors/validation` | [13-errors/validation.ts](src/samples/13-errors/validation.ts) | `ValidationError` | Throw ValidationError for bad input: Cogover answers HTTP 400 with code VALIDATION_ERROR. |
| `GET /errors/mapping/:name` | [13-errors/error-mapping.ts](src/samples/13-errors/error-mapping.ts) | `CogoverApiError`, `NotFoundError`, `ValidationError`, `PermissionDeniedError`, `RateLimitError`, `RetryableError`, `StateConflictError`, `LockUnavailableError`, `LockLostError` | Throw each public error class to see its HTTP status; /errors/mapping/list shows the table. |

### Push message

| Route | File | SDK API | Tóm tắt |
|---|---|---|---|
| `POST /push/refresh-records` | [14-push/refresh-records.ts](src/samples/14-push/refresh-records.ts) | `context.push`, `PushApi`, `push.refreshRecords`, `PushOptions` | push.refreshRecords(object, recordIds, options): make open record pages reload. |
| `POST /push/toast` | [14-push/toast.ts](src/samples/14-push/toast.ts) | `push.toast`, `ToastMessage`, `ToastLink`, `ToastPosition`, `ToastSize`, `PushRecipients` | push.toast(message, options): show a notification to record viewers or to specific people. |
| `POST /push/message` | [14-push/message.ts](src/samples/14-push/message.ts) | `push.message`, `BackgroundMessage`, `BackgroundContentType` | push.message({ content, contentType, object, recordIds }): a silent message for custom components. |

### Tương thích

| Route | File | SDK API | Tóm tắt |
|---|---|---|---|
| `GET /legacy/create-greeting` | [15-legacy/create-greeting.ts](src/samples/15-legacy/create-greeting.ts) | `createGreeting` | createGreeting(name): the SDK 0.1.x compatibility helper. |

### Background job

| Route | File | SDK API | Tóm tắt |
|---|---|---|---|
| `POST /jobs/enqueue` | [16-jobs/enqueue.ts](src/samples/16-jobs/enqueue.ts) | `context.jobs`, `JobsApi`, `jobs.enqueue`, `EnqueueOptions`, `EnqueueResult`, `defineJob` | jobs.enqueue(key, payload, { idempotencyKey }): start a background job run; duplicate keys return the existing run. |
| `POST /jobs/enqueue-delayed` | [16-jobs/enqueue-delayed.ts](src/samples/16-jobs/enqueue-delayed.ts) | `jobs.enqueue`, `EnqueueOptions.delayMs`, `EnqueueOptions.runAt`, `JobSchedule` | jobs.enqueue(key, null, { delayMs } \| { runAt }): run a job later instead of as soon as possible. |

### Secret

| Route | File | SDK API | Tóm tắt |
|---|---|---|---|
| `GET /secrets/get/:name` | [17-secrets/get.ts](src/samples/17-secrets/get.ts) | `context.secrets`, `SecretsApi`, `secrets.get` | secrets.get(name): read a project secret without ever exposing its value. |

### Mật mã

| Route | File | SDK API | Tóm tắt |
|---|---|---|---|
| `POST /crypto/sha256` | [18-crypto/sha256.ts](src/samples/18-crypto/sha256.ts) | `crypto`, `context.crypto`, `CryptoApi`, `crypto.sha256` | crypto.sha256(data, encoding): SHA-256 of a string or bytes as hex or base64. |
| `POST /crypto/hmac` | [18-crypto/hmac.ts](src/samples/18-crypto/hmac.ts) | `crypto.hmacSha256` | crypto.hmacSha256(key \| { secret }, data): sign data with a key or with a project secret you never read. |
| `POST /crypto/verify` | [18-crypto/verify-signature.ts](src/samples/18-crypto/verify-signature.ts) | `crypto.hmacSha256`, `crypto.timingSafeEqual` | Recompute an HMAC and compare it with crypto.timingSafeEqual() to verify a signature. |
| `POST /crypto/timing-safe-equal` | [18-crypto/timing-safe-equal.ts](src/samples/18-crypto/timing-safe-equal.ts) | `crypto.timingSafeEqual` | crypto.timingSafeEqual(a, b): compare tokens or signatures in constant time. |
| `GET /crypto/random` | [18-crypto/random.ts](src/samples/18-crypto/random.ts) | `crypto.randomBytes`, `crypto.randomUUID` | crypto.randomBytes(length) and crypto.randomUUID(): secure tokens, nonces and IDs. |

### Inbound webhook

| Route | File | SDK API | Tóm tắt |
|---|---|---|---|
| `POST /hooks/ping` | [19-inbound/hooks-ping.ts](src/samples/19-inbound/hooks-ping.ts) | `InboundInvocationContext`, `invocation.inbound`, `request.rawBody`, `request.contentType` | A webhook route under /hooks/: accept only inbound calls and echo invocation.inbound and the raw body. |
| `POST /hooks/order-events` | [19-inbound/hooks-order-events.ts](src/samples/19-inbound/hooks-order-events.ts) | `invocation.identity`, `request.rawBody`, `crypto.hmacSha256`, `crypto.timingSafeEqual`, `jobs.enqueue` | Webhook receiver: verify an HMAC signature over request.rawBody with a secret, then enqueue a job keyed by the event ID. |

### Record trigger

| Key | Timing | Operation | File |
|---|---|---|---|
| `sample_order_validate_amounts` | beforeChange | create, update | [before-change-validate.ts](src/triggers/before-change-validate.ts) |
| `sample_order_compute_total` | beforeChange | create, update | [before-change-compute-total.ts](src/triggers/before-change-compute-total.ts) |
| `sample_order_block_delete_shipped` | beforeChange | delete | [before-change-block-delete.ts](src/triggers/before-change-block-delete.ts) |
| `sample_order_note_when_shipped` | afterChange | create, update | [after-change-note-when-shipped.ts](src/triggers/after-change-note-when-shipped.ts) |

### Background job

| Key | Lịch | File |
|---|---|---|
| `sample_recount_orders` | theo enqueue | [recount-orders.ts](src/jobs/recount-orders.ts) |
| `sample_cancel_stale_orders` | `0 2 * * *` (Asia/Ho_Chi_Minh) | [cancel-stale-orders.ts](src/jobs/cancel-stale-orders.ts) |

Tổng cộng: 61 route, 4 record trigger và 2 background job.
<!-- catalog:end -->

## Chạy record trigger trên local server

Cogover chỉ chạy trigger cho version đã publish và đang active. Trên local, runner của starter chạy
một trigger với record thật được đọc qua Development Session:

```bash
curl -s "http://127.0.0.1:3100/__cogover/triggers"
curl -s -X POST "http://127.0.0.1:3100/__cogover/triggers/sample_order_compute_total" \
  -H "Content-Type: application/json" \
  --data '{"operation":"update","recordId":"<id của sample_order>","changes":{"subtotal":1000,"discount":100}}'
```

Response cho thấy `changes` và `errors` mà mỗi trigger tạo ra. Khi thử trigger before-change, khởi
chạy session bằng `cogover-dev run --allow-writes=false` để một lệnh ghi trong handler cũng thất bại
trên local như trên Cogover. Trigger after-change ghi ghi chú và push refresh nên cần session cho
phép ghi.

## Background job, secret và inbound webhook

Ba nhóm này khai báo trong code nhưng được cấu hình trên Cogover, nên khi thiếu cấu hình các sample
trả về object `r`/`msg` giải thích thay vì lỗi:

- **Job** (`src/jobs/`, `POST /jobs/enqueue`, `POST /jobs/enqueue-delayed`): Cogover chỉ nhận
  enqueue cho job key mà version đang active khai báo, và local server không chạy job. Publish và
  activate project này, rồi enqueue từ route hoặc bằng CLI và theo dõi run:

  ```bash
  cogover-dev jobs enqueue sample_recount_orders
  cogover-dev jobs runs
  cogover-dev jobs schedules
  ```

  Job enqueue lưu kết quả tại `GET /state/get/order-count`.
- **Secret** (`GET /secrets/get/:name`, `POST /crypto/hmac` với `secret`, `GET /fetch/credential`):
  tạo một secret đọc được và một credential cho project, rồi đọc hoặc dùng chúng:

  ```bash
  cogover-dev secrets set sample_erp_token
  cogover-dev secrets set sample_webhook_secret
  cogover-dev secrets set sample_httpbin --kind BEARER --allowed-hosts httpbin.org
  ```

  Development Session local chỉ dùng được secret khi quản trị viên cho phép; nếu không, sample trả
  về reason `SECRETS_NOT_ALLOWED` (hoặc `FETCH_BLOCKED` với credential).
- **Inbound webhook** (`POST /hooks/ping`, `POST /hooks/order-events`): tạo inbound access rồi gọi
  URL webhook được in ra kèm inbound key. Gọi qua URL project thường hoặc local server thì danh tính
  là user và cả hai route chủ động trả 403.

  ```bash
  cogover-dev inbound create ping
  curl -s -X POST "https://<workspace>/api/v1/ts-projects/<slug>/hooks/<inboundId>/ping" \
    -H "X-Cogover-Inbound-Key: <inbound key>" -H "Content-Type: application/json" --data '{"hello":"webhook"}'
  ```

Băm, HMAC với key tường minh và giá trị ngẫu nhiên của `crypto` chạy được ở mọi ngữ cảnh, kể cả
local server.

## Entry point một endpoint

`src/entries/define-script.ts` minh họa `defineScript`, kiểu entry point cho project chỉ có một
endpoint. Chạy nó thay cho router:

```bash
COGOVER_LOCAL_PORT=3100 cogover-dev run --profile <project-slug> -- \
  node --import tsx local/cli.ts --entry ./src/entries/define-script.ts
curl -s -X POST "$BASE" -H "Content-Type: application/json" --data '{"name":"Ada"}'
```

## Publish và activate

```bash
npm run build
cogover-dev publish
cogover-dev activate <version-id>
```

Đọc kỹ trước khi publish lên Workspace có dữ liệu thật: các sample ghi sẽ tạo, sửa và xóa record
của Object demo, `identity/as-system` đọc mà không áp quyền record của người gọi, các sample push
gửi thông báo tới người dùng thật, các trigger chạy cho mọi lần ghi vào `sample_order`, và job theo
lịch hủy các `sample_order` cũ mỗi đêm trong lúc version còn active. Hãy
publish lên Workspace thử nghiệm, hoặc bỏ những sample không muốn khỏi `src/samples/index.ts` và
`src/triggers/index.ts`.

## Cập nhật theo mỗi bản phát hành SDK

Sau mỗi bản phát hành `@cogover/sdk`, repository này được cập nhật theo các bước:

1. `npm install @cogover/sdk@<version>` và commit lockfile.
2. Thêm sample cho mỗi export hoặc behavior mới, đăng ký trong `src/samples/index.ts`, và sửa các
   sample bị ảnh hưởng bởi thay đổi không tương thích.
3. `npm run check` chạy type checker, test và kiểm tra coverage; bước coverage liệt kê mọi export
   của SDK đang cài mà chưa có sample nào nhắc tới.
4. `npm run catalog -- --write` làm mới bảng sample trong `README.md` và `README.vi.md`.

## Kiểm thử

```bash
npm test
```

`local/samples.test.ts` khởi chạy local server không cần Development Session và kiểm tra catalog
cùng mọi sample không cần capability của Cogover (router, response, invocation, ánh xạ lỗi, helper
tương thích). Các test còn lại thuộc bộ công cụ local của starter.

## Cấu trúc project

```text
.
├── cogover.example.json
├── local/                    # HTTP runner và trigger runner local (từ starter)
│   └── samples.test.ts       # test của catalog và các sample không cần session
├── scripts/
│   ├── check-coverage.mjs    # mọi export của SDK phải được một sample nhắc tới
│   └── print-catalog.ts      # sinh bảng README từ catalog
├── setup/
│   ├── objects.md            # mô tả từng field của hai Object demo
│   └── sdk-sample-objects.xlsx
└── src/
    ├── main.ts               # đăng ký mọi sample; GET / là catalog
    ├── sample.ts             # defineSample(): mỗi sample một route
    ├── workspace.d.ts        # khai báo kiểu của Object demo
    ├── entries/define-script.ts
    ├── jobs/                 # defineJob(): một job enqueue, một job theo lịch
    ├── samples/<nhóm>/<tên>.ts
    └── triggers/
```

## Giấy phép

MIT
