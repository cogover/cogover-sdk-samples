import { createRouter } from "@cogover/sdk";
import { fetchCredential } from "../samples/10-fetch/credential.js";
import { fetchErrorHandling } from "../samples/10-fetch/error-handling.js";
import { fetchGetJson } from "../samples/10-fetch/get-json.js";
import { fetchPostJson } from "../samples/10-fetch/post-json.js";

/** Samples of `src/samples/10-fetch/`, mounted by `src/main.ts` under `/fetch`. */
export const fetchRoutes = createRouter();
fetchRoutes.get("/get-json", fetchGetJson);
fetchRoutes.post("/post-json", fetchPostJson);
fetchRoutes.get("/errors", fetchErrorHandling);
fetchRoutes.get("/credential", fetchCredential);
