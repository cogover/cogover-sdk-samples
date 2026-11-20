import { createRouter } from "@cogover/sdk";
import { pushMessage } from "../samples/14-push/message.js";
import { pushRefreshRecords } from "../samples/14-push/refresh-records.js";
import { pushToast } from "../samples/14-push/toast.js";

/** Samples of `src/samples/14-push/`, mounted by `src/main.ts` under `/push`. */
export const pushRoutes = createRouter();
pushRoutes.post("/refresh-records", pushRefreshRecords);
pushRoutes.post("/toast", pushToast);
pushRoutes.post("/message", pushMessage);
