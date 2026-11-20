import { createRouter } from "@cogover/sdk";
import { emailCustomerEmail } from "../samples/22-email/customer-email.js";
import { emailSend } from "../samples/22-email/send.js";
import { emailSenders } from "../samples/22-email/senders.js";

/** Samples of `src/samples/22-email/`, mounted by `src/main.ts` under `/email`. */
export const emailRoutes = createRouter();
emailRoutes.get("/senders", emailSenders);
emailRoutes.post("/send", emailSend);
emailRoutes.post("/customers/:customerId", emailCustomerEmail);
