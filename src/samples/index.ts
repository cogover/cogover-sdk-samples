import type { Sample } from "../sample.js";

import routerHello from "./01-router/hello.js";
import routerPathParams from "./01-router/path-params.js";
import routerQuery from "./01-router/query.js";
import routerHeaders from "./01-router/headers.js";
import routerBody from "./01-router/body.js";
import routerInputVsBody from "./01-router/input-vs-body.js";

import responseJsonStatus from "./02-response/json-status.js";
import responseText from "./02-response/text.js";
import responseBytes from "./02-response/bytes.js";
import responseEmpty from "./02-response/empty.js";
import responseRedirect from "./02-response/redirect.js";

import invocationSnapshot from "./03-invocation/invocation.js";

import recordsGet from "./04-records-read/get.js";
import recordsGetMany from "./04-records-read/get-many.js";
import recordsList from "./04-records-read/list.js";
import recordsListPaging from "./04-records-read/list-paging.js";

import recordsCreate from "./05-records-write/create.js";
import recordsUpdate from "./05-records-write/update.js";
import recordsBatchInsert from "./05-records-write/batch-insert.js";
import recordsBatchUpdate from "./05-records-write/batch-update.js";
import recordsUpsert from "./05-records-write/upsert.js";
import recordsDeleteMany from "./05-records-write/delete-many.js";
import recordsLookupReference from "./05-records-write/lookup-reference.js";
import recordsFieldValues from "./05-records-write/field-values.js";

import filtersOperators from "./06-filters/operators.js";
import filtersAndOr from "./06-filters/and-or.js";
import filtersSort from "./06-filters/sort.js";
import filtersSystemFields from "./06-filters/system-fields.js";
import filtersRawExpression from "./06-filters/raw-expression.js";

import identityAsUser from "./07-identity/as-user.js";
import identityAsSystem from "./07-identity/as-system.js";

import stateGet from "./08-state/get.js";
import stateSet from "./08-state/set.js";
import stateDelete from "./08-state/delete.js";
import stateCounter from "./08-state/counter.js";

import locksWithLock from "./09-locks/with-lock.js";
import locksAcquireRelease from "./09-locks/acquire-release.js";

import fetchGetJson from "./10-fetch/get-json.js";
import fetchPostJson from "./10-fetch/post-json.js";
import fetchErrorHandling from "./10-fetch/error-handling.js";

import schemaObjectMetadata from "./11-schema/object-metadata.js";

import loggingLevels from "./12-logging/levels.js";

import errorsCatchApiError from "./13-errors/catch-api-error.js";
import errorsNotFound from "./13-errors/not-found.js";
import errorsValidation from "./13-errors/validation.js";
import errorsMapping from "./13-errors/error-mapping.js";

import pushRefreshRecords from "./14-push/refresh-records.js";
import pushToast from "./14-push/toast.js";
import pushMessage from "./14-push/message.js";

import legacyCreateGreeting from "./15-legacy/create-greeting.js";

/**
 * Every sample, in catalog order. The list is static on purpose: the Cogover compiler produces one
 * self-contained bundle and does not allow dynamic imports, so a new sample is added here by hand.
 */
export const samples: readonly Sample[] = [
    routerHello,
    routerPathParams,
    routerQuery,
    routerHeaders,
    routerBody,
    routerInputVsBody,

    responseJsonStatus,
    responseText,
    responseBytes,
    responseEmpty,
    responseRedirect,

    invocationSnapshot,

    recordsGet,
    recordsGetMany,
    recordsList,
    recordsListPaging,

    recordsCreate,
    recordsUpdate,
    recordsBatchInsert,
    recordsBatchUpdate,
    recordsUpsert,
    recordsDeleteMany,
    recordsLookupReference,
    recordsFieldValues,

    filtersOperators,
    filtersAndOr,
    filtersSort,
    filtersSystemFields,
    filtersRawExpression,

    identityAsUser,
    identityAsSystem,

    stateGet,
    stateSet,
    stateDelete,
    stateCounter,

    locksWithLock,
    locksAcquireRelease,

    fetchGetJson,
    fetchPostJson,
    fetchErrorHandling,

    schemaObjectMetadata,

    loggingLevels,

    errorsCatchApiError,
    errorsNotFound,
    errorsValidation,
    errorsMapping,

    pushRefreshRecords,
    pushToast,
    pushMessage,

    legacyCreateGreeting,
];
