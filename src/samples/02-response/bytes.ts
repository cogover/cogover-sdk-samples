import type { BinaryResponseInit } from "@cogover/sdk";
import type { SampleHandler, SampleInfo } from "../../sample.js";

/**
 * `response.bytes()` sends binary data with a content type of your choice; the body must be a
 * `Uint8Array`. The sandbox has no `TextEncoder`, so this sample builds ASCII bytes by hand.
 */
const ascii = (text: string): Uint8Array => Uint8Array.from(text, character => character.charCodeAt(0));

export default {
    id: "response.bytes",
    method: "GET",
    path: "/response/bytes",
    summary: "response.bytes(): binary body (here a CSV download) with a custom content type.",
    sdk: ["response.bytes", "BinaryResponseInit"],
    file: "src/samples/02-response/bytes.ts",
    curl: `curl -s -i "$BASE/response/bytes"`,
} satisfies SampleInfo;

export const responseBytes: SampleHandler = ({ response }) => {
    const init: BinaryResponseInit = {
        contentType: "text/csv; charset=utf-8",
        headers: { "content-disposition": "attachment; filename=\"orders.csv\"" },
    };
    return response.bytes(ascii("id,name,total\nORD-1,Laptop,1500\nORD-2,Mouse,25\n"), init);
};
