import { createRouter } from "@cogover/sdk";
import { cryptoAesDecrypt } from "../samples/18-crypto/aes-decrypt.js";
import { cryptoAesEncrypt } from "../samples/18-crypto/aes-encrypt.js";
import { cryptoHmac } from "../samples/18-crypto/hmac.js";
import { cryptoJwtVerify } from "../samples/18-crypto/jwt-verify.js";
import { cryptoRandom } from "../samples/18-crypto/random.js";
import { cryptoRsaDecrypt } from "../samples/18-crypto/rsa-decrypt.js";
import { cryptoRsaEncrypt } from "../samples/18-crypto/rsa-encrypt.js";
import { cryptoSha256 } from "../samples/18-crypto/sha256.js";
import { cryptoSign } from "../samples/18-crypto/sign.js";
import { cryptoTimingSafeEqual } from "../samples/18-crypto/timing-safe-equal.js";
import { cryptoVerifyPublicKey } from "../samples/18-crypto/verify-public-key.js";
import { cryptoVerifySignature } from "../samples/18-crypto/verify-signature.js";

/** Samples of `src/samples/18-crypto/`, mounted by `src/main.ts` under `/crypto`. */
export const cryptoRoutes = createRouter();
cryptoRoutes.post("/sha256", cryptoSha256);
cryptoRoutes.post("/hmac", cryptoHmac);
cryptoRoutes.post("/verify", cryptoVerifySignature);
cryptoRoutes.post("/timing-safe-equal", cryptoTimingSafeEqual);
cryptoRoutes.get("/random", cryptoRandom);
cryptoRoutes.post("/aes/encrypt", cryptoAesEncrypt);
cryptoRoutes.post("/aes/decrypt", cryptoAesDecrypt);
cryptoRoutes.post("/rsa/encrypt", cryptoRsaEncrypt);
cryptoRoutes.post("/rsa/decrypt", cryptoRsaDecrypt);
cryptoRoutes.post("/sign", cryptoSign);
cryptoRoutes.post("/verify-public-key", cryptoVerifyPublicKey);
cryptoRoutes.post("/jwt/verify", cryptoJwtVerify);
