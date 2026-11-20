import { createRouter } from "@cogover/sdk";
import { notificationsCategories } from "../samples/21-notifications/categories.js";
import { notificationsOrderApproval } from "../samples/21-notifications/order-approval.js";
import { notificationsSend } from "../samples/21-notifications/send.js";

/** Samples of `src/samples/21-notifications/`, mounted by `src/main.ts` under `/notifications`. */
export const notificationsRoutes = createRouter();
notificationsRoutes.post("/send", notificationsSend);
notificationsRoutes.post("/order-approval/:orderId", notificationsOrderApproval);
notificationsRoutes.post("/categories", notificationsCategories);
