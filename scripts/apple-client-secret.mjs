#!/usr/bin/env node
/**
 * Apple "Sign in with Apple" client secret üretici.
 *
 * Apple, OAuth client secret olarak sabit bir metin değil, ES256 ile imzalanmış
 * bir JWT ister. Bu JWT en fazla 6 ay geçerlidir; süresi dolunca yeniden üretip
 * GOTRUE_EXTERNAL_APPLE_SECRET değerini güncellemeniz gerekir.
 *
 * Kullanım:
 *   node scripts/apple-client-secret.mjs \
 *     --team-id   ABCDE12345 \
 *     --key-id    XYZ9876543 \
 *     --client-id org.cocuktribunu.web \
 *     --key       ./AuthKey_XYZ9876543.p8
 *
 * Ek bağımlılık gerektirmez, yalnızca Node.js crypto kullanır.
 */

import { createSign, createPrivateKey } from "node:crypto";
import { readFileSync } from "node:fs";

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

const teamId = arg("team-id");
const keyId = arg("key-id");
const clientId = arg("client-id");
const keyPath = arg("key");
const months = Number(arg("months") ?? 6);

if (!teamId || !keyId || !clientId || !keyPath) {
  console.error(`Eksik parametre.

  --team-id     Apple Developer hesabınızın Team ID'si (Membership sayfasında)
  --key-id      Oluşturduğunuz anahtarın Key ID'si
  --client-id   Services ID (App ID DEĞİL, örn: org.cocuktribunu.web)
  --key         AuthKey_XXXXXX.p8 dosyasının yolu
  --months      Geçerlilik süresi, varsayılan 6 (Apple'ın üst sınırı)
`);
  process.exit(1);
}

const b64url = (input) =>
  Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

/** Node'un ürettiği DER imzasını JWT'nin beklediği ham (r||s) biçime çevirir */
function derToJose(der) {
  let offset = 2;
  if (der[1] & 0x80) offset += der[1] & 0x7f;

  const readInt = () => {
    if (der[offset++] !== 0x02) throw new Error("Geçersiz DER imzası");
    let len = der[offset++];
    let val = der.subarray(offset, offset + len);
    offset += len;
    while (val.length > 32 && val[0] === 0x00) val = val.subarray(1);
    return Buffer.concat([Buffer.alloc(32 - val.length, 0), val]);
  };

  return Buffer.concat([readInt(), readInt()]);
}

const now = Math.floor(Date.now() / 1000);
const exp = now + months * 30 * 24 * 60 * 60;

const header = { alg: "ES256", kid: keyId, typ: "JWT" };
const payload = {
  iss: teamId,
  iat: now,
  exp,
  aud: "https://appleid.apple.com",
  sub: clientId,
};

const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;

const privateKey = createPrivateKey({ key: readFileSync(keyPath, "utf8"), format: "pem" });
const signer = createSign("SHA256");
signer.update(signingInput);
signer.end();

const signature = derToJose(signer.sign({ key: privateKey, dsaEncoding: "der" }));
const token = `${signingInput}.${b64url(signature)}`;

console.log("\n=== GOTRUE_EXTERNAL_APPLE_SECRET ===\n");
console.log(token);
console.log(`\nGeçerlilik bitişi: ${new Date(exp * 1000).toLocaleString("tr-TR")}`);
console.log("Bu tarihten önce yeniden üretmeyi unutmayın.\n");
