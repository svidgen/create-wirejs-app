// ../../packages/create-wirejs-app/packages/wirejs-resources/lib/services/file.js
import process from "process";
import fs from "fs";
import path from "path";

// ../../packages/create-wirejs-app/packages/wirejs-resources/lib/resource.js
var Resource = class {
  /**
   * @type {Resource | string}
   */
  scope;
  /**
   * @type {string}
   */
  id;
  /**
   * 
   * @param {Resource | string} scope
   * @param {string} id 
   */
  constructor(scope, id) {
    this.scope = scope;
    this.id = id;
  }
  get absoluteId() {
    const sanitizedId = encodeURIComponent(this.id);
    if (typeof this.scope === "string") {
      return `${encodeURIComponent(this.scope)}/${sanitizedId}`;
    } else if (typeof this.scope?.id === "string") {
      return `${this.scope.absoluteId}/${sanitizedId}`;
    } else {
      throw new Error("Resources must defined within a scope. Provide either a namespace string or parent resource.");
    }
  }
};

// ../../packages/create-wirejs-app/packages/wirejs-resources/lib/services/file.js
var CWD = process.cwd();
var ALREADY_EXISTS_CODE = "EEXIST";
var FileService = class extends Resource {
  /**
   * @param {Resource | string} scope
   * @param {string} id
   */
  constructor(scope, id) {
    super(scope, id);
  }
  /**
   * @param {string} filename 
   * @returns 
   */
  #fullNameFor(filename) {
    const sanitizedId = this.absoluteId.replace("~", "-").replace(/\.+/g, ".");
    const sanitizedName = filename.replace("~", "-").replace(/\.+/g, ".");
    return path.join(CWD, "temp", "wirejs-services", sanitizedId, sanitizedName);
  }
  /**
   * @param {string} filename
   * @param {BufferEncoding} [encoding]
   * @return {Promise<string>} file data as a string
   */
  async read(filename, encoding = "utf8") {
    return fs.promises.readFile(this.#fullNameFor(filename), { encoding });
  }
  /**
   * 
   * @param {string} filename 
   * @param {string} data
   * @param {{
   * 	onlyIfNotExists?: boolean;
   * }} [options]
   */
  async write(filename, data, { onlyIfNotExists = false } = {}) {
    const fullname = this.#fullNameFor(filename);
    const flag = onlyIfNotExists ? "wx" : "w";
    await fs.promises.mkdir(path.dirname(fullname), { recursive: true });
    return fs.promises.writeFile(fullname, data, { flag });
  }
  /**
   * 
   * @param {string} filename 
   */
  async delete(filename) {
    return fs.promises.unlink(this.#fullNameFor(filename));
  }
  /**
   * 
   * @param {{
   * 	prefix?: string
   * }} [options]
   */
  async *list({ prefix = "" } = {}) {
    const all = await fs.promises.readdir(CWD, { recursive: true });
    for (const name of all) {
      if (prefix === void 0 || name.startsWith(prefix)) yield name;
    }
  }
  isAlreadyExistsError(error) {
    return error.code === ALREADY_EXISTS_CODE;
  }
};

// ../../packages/create-wirejs-app/packages/wirejs-resources/lib/services/authentication.js
import { scrypt, randomBytes } from "crypto";

// ../../packages/create-wirejs-app/node_modules/jose/dist/node/esm/runtime/base64url.js
import { Buffer as Buffer2 } from "node:buffer";

// ../../packages/create-wirejs-app/node_modules/jose/dist/node/esm/lib/buffer_utils.js
var encoder = new TextEncoder();
var decoder = new TextDecoder();
var MAX_INT32 = 2 ** 32;
function concat(...buffers) {
  const size = buffers.reduce((acc, { length }) => acc + length, 0);
  const buf = new Uint8Array(size);
  let i = 0;
  for (const buffer of buffers) {
    buf.set(buffer, i);
    i += buffer.length;
  }
  return buf;
}

// ../../packages/create-wirejs-app/node_modules/jose/dist/node/esm/runtime/base64url.js
function normalize(input) {
  let encoded = input;
  if (encoded instanceof Uint8Array) {
    encoded = decoder.decode(encoded);
  }
  return encoded;
}
var encode = (input) => Buffer2.from(input).toString("base64url");
var decode = (input) => new Uint8Array(Buffer2.from(normalize(input), "base64url"));

// ../../packages/create-wirejs-app/node_modules/jose/dist/node/esm/util/errors.js
var JOSEError = class extends Error {
  static code = "ERR_JOSE_GENERIC";
  code = "ERR_JOSE_GENERIC";
  constructor(message2, options) {
    super(message2, options);
    this.name = this.constructor.name;
    Error.captureStackTrace?.(this, this.constructor);
  }
};
var JWTClaimValidationFailed = class extends JOSEError {
  static code = "ERR_JWT_CLAIM_VALIDATION_FAILED";
  code = "ERR_JWT_CLAIM_VALIDATION_FAILED";
  claim;
  reason;
  payload;
  constructor(message2, payload, claim = "unspecified", reason = "unspecified") {
    super(message2, { cause: { claim, reason, payload } });
    this.claim = claim;
    this.reason = reason;
    this.payload = payload;
  }
};
var JWTExpired = class extends JOSEError {
  static code = "ERR_JWT_EXPIRED";
  code = "ERR_JWT_EXPIRED";
  claim;
  reason;
  payload;
  constructor(message2, payload, claim = "unspecified", reason = "unspecified") {
    super(message2, { cause: { claim, reason, payload } });
    this.claim = claim;
    this.reason = reason;
    this.payload = payload;
  }
};
var JOSEAlgNotAllowed = class extends JOSEError {
  static code = "ERR_JOSE_ALG_NOT_ALLOWED";
  code = "ERR_JOSE_ALG_NOT_ALLOWED";
};
var JOSENotSupported = class extends JOSEError {
  static code = "ERR_JOSE_NOT_SUPPORTED";
  code = "ERR_JOSE_NOT_SUPPORTED";
};
var JWSInvalid = class extends JOSEError {
  static code = "ERR_JWS_INVALID";
  code = "ERR_JWS_INVALID";
};
var JWTInvalid = class extends JOSEError {
  static code = "ERR_JWT_INVALID";
  code = "ERR_JWT_INVALID";
};
var JWSSignatureVerificationFailed = class extends JOSEError {
  static code = "ERR_JWS_SIGNATURE_VERIFICATION_FAILED";
  code = "ERR_JWS_SIGNATURE_VERIFICATION_FAILED";
  constructor(message2 = "signature verification failed", options) {
    super(message2, options);
  }
};

// ../../packages/create-wirejs-app/node_modules/jose/dist/node/esm/runtime/is_key_object.js
import * as util from "node:util";
var is_key_object_default = (obj) => util.types.isKeyObject(obj);

// ../../packages/create-wirejs-app/node_modules/jose/dist/node/esm/runtime/webcrypto.js
import * as crypto from "node:crypto";
import * as util2 from "node:util";
var webcrypto2 = crypto.webcrypto;
var webcrypto_default = webcrypto2;
var isCryptoKey = (key) => util2.types.isCryptoKey(key);

// ../../packages/create-wirejs-app/node_modules/jose/dist/node/esm/lib/crypto_key.js
function unusable(name, prop = "algorithm.name") {
  return new TypeError(`CryptoKey does not support this operation, its ${prop} must be ${name}`);
}
function isAlgorithm(algorithm, name) {
  return algorithm.name === name;
}
function getHashLength(hash2) {
  return parseInt(hash2.name.slice(4), 10);
}
function getNamedCurve(alg) {
  switch (alg) {
    case "ES256":
      return "P-256";
    case "ES384":
      return "P-384";
    case "ES512":
      return "P-521";
    default:
      throw new Error("unreachable");
  }
}
function checkUsage(key, usages) {
  if (usages.length && !usages.some((expected) => key.usages.includes(expected))) {
    let msg = "CryptoKey does not support this operation, its usages must include ";
    if (usages.length > 2) {
      const last = usages.pop();
      msg += `one of ${usages.join(", ")}, or ${last}.`;
    } else if (usages.length === 2) {
      msg += `one of ${usages[0]} or ${usages[1]}.`;
    } else {
      msg += `${usages[0]}.`;
    }
    throw new TypeError(msg);
  }
}
function checkSigCryptoKey(key, alg, ...usages) {
  switch (alg) {
    case "HS256":
    case "HS384":
    case "HS512": {
      if (!isAlgorithm(key.algorithm, "HMAC"))
        throw unusable("HMAC");
      const expected = parseInt(alg.slice(2), 10);
      const actual = getHashLength(key.algorithm.hash);
      if (actual !== expected)
        throw unusable(`SHA-${expected}`, "algorithm.hash");
      break;
    }
    case "RS256":
    case "RS384":
    case "RS512": {
      if (!isAlgorithm(key.algorithm, "RSASSA-PKCS1-v1_5"))
        throw unusable("RSASSA-PKCS1-v1_5");
      const expected = parseInt(alg.slice(2), 10);
      const actual = getHashLength(key.algorithm.hash);
      if (actual !== expected)
        throw unusable(`SHA-${expected}`, "algorithm.hash");
      break;
    }
    case "PS256":
    case "PS384":
    case "PS512": {
      if (!isAlgorithm(key.algorithm, "RSA-PSS"))
        throw unusable("RSA-PSS");
      const expected = parseInt(alg.slice(2), 10);
      const actual = getHashLength(key.algorithm.hash);
      if (actual !== expected)
        throw unusable(`SHA-${expected}`, "algorithm.hash");
      break;
    }
    case "EdDSA": {
      if (key.algorithm.name !== "Ed25519" && key.algorithm.name !== "Ed448") {
        throw unusable("Ed25519 or Ed448");
      }
      break;
    }
    case "ES256":
    case "ES384":
    case "ES512": {
      if (!isAlgorithm(key.algorithm, "ECDSA"))
        throw unusable("ECDSA");
      const expected = getNamedCurve(alg);
      const actual = key.algorithm.namedCurve;
      if (actual !== expected)
        throw unusable(expected, "algorithm.namedCurve");
      break;
    }
    default:
      throw new TypeError("CryptoKey does not support this operation");
  }
  checkUsage(key, usages);
}

// ../../packages/create-wirejs-app/node_modules/jose/dist/node/esm/lib/invalid_key_input.js
function message(msg, actual, ...types4) {
  types4 = types4.filter(Boolean);
  if (types4.length > 2) {
    const last = types4.pop();
    msg += `one of type ${types4.join(", ")}, or ${last}.`;
  } else if (types4.length === 2) {
    msg += `one of type ${types4[0]} or ${types4[1]}.`;
  } else {
    msg += `of type ${types4[0]}.`;
  }
  if (actual == null) {
    msg += ` Received ${actual}`;
  } else if (typeof actual === "function" && actual.name) {
    msg += ` Received function ${actual.name}`;
  } else if (typeof actual === "object" && actual != null) {
    if (actual.constructor?.name) {
      msg += ` Received an instance of ${actual.constructor.name}`;
    }
  }
  return msg;
}
var invalid_key_input_default = (actual, ...types4) => {
  return message("Key must be ", actual, ...types4);
};
function withAlg(alg, actual, ...types4) {
  return message(`Key for the ${alg} algorithm must be `, actual, ...types4);
}

// ../../packages/create-wirejs-app/node_modules/jose/dist/node/esm/runtime/is_key_like.js
var is_key_like_default = (key) => is_key_object_default(key) || isCryptoKey(key);
var types3 = ["KeyObject"];
if (globalThis.CryptoKey || webcrypto_default?.CryptoKey) {
  types3.push("CryptoKey");
}

// ../../packages/create-wirejs-app/node_modules/jose/dist/node/esm/lib/is_disjoint.js
var isDisjoint = (...headers) => {
  const sources = headers.filter(Boolean);
  if (sources.length === 0 || sources.length === 1) {
    return true;
  }
  let acc;
  for (const header of sources) {
    const parameters = Object.keys(header);
    if (!acc || acc.size === 0) {
      acc = new Set(parameters);
      continue;
    }
    for (const parameter of parameters) {
      if (acc.has(parameter)) {
        return false;
      }
      acc.add(parameter);
    }
  }
  return true;
};
var is_disjoint_default = isDisjoint;

// ../../packages/create-wirejs-app/node_modules/jose/dist/node/esm/lib/is_object.js
function isObjectLike(value) {
  return typeof value === "object" && value !== null;
}
function isObject(input) {
  if (!isObjectLike(input) || Object.prototype.toString.call(input) !== "[object Object]") {
    return false;
  }
  if (Object.getPrototypeOf(input) === null) {
    return true;
  }
  let proto = input;
  while (Object.getPrototypeOf(proto) !== null) {
    proto = Object.getPrototypeOf(proto);
  }
  return Object.getPrototypeOf(input) === proto;
}

// ../../packages/create-wirejs-app/node_modules/jose/dist/node/esm/runtime/get_named_curve.js
import { KeyObject } from "node:crypto";

// ../../packages/create-wirejs-app/node_modules/jose/dist/node/esm/lib/is_jwk.js
function isJWK(key) {
  return isObject(key) && typeof key.kty === "string";
}
function isPrivateJWK(key) {
  return key.kty !== "oct" && typeof key.d === "string";
}
function isPublicJWK(key) {
  return key.kty !== "oct" && typeof key.d === "undefined";
}
function isSecretJWK(key) {
  return isJWK(key) && key.kty === "oct" && typeof key.k === "string";
}

// ../../packages/create-wirejs-app/node_modules/jose/dist/node/esm/runtime/get_named_curve.js
var namedCurveToJOSE = (namedCurve) => {
  switch (namedCurve) {
    case "prime256v1":
      return "P-256";
    case "secp384r1":
      return "P-384";
    case "secp521r1":
      return "P-521";
    case "secp256k1":
      return "secp256k1";
    default:
      throw new JOSENotSupported("Unsupported key curve for this operation");
  }
};
var getNamedCurve2 = (kee, raw) => {
  let key;
  if (isCryptoKey(kee)) {
    key = KeyObject.from(kee);
  } else if (is_key_object_default(kee)) {
    key = kee;
  } else if (isJWK(kee)) {
    return kee.crv;
  } else {
    throw new TypeError(invalid_key_input_default(kee, ...types3));
  }
  if (key.type === "secret") {
    throw new TypeError('only "private" or "public" type keys can be used for this operation');
  }
  switch (key.asymmetricKeyType) {
    case "ed25519":
    case "ed448":
      return `Ed${key.asymmetricKeyType.slice(2)}`;
    case "x25519":
    case "x448":
      return `X${key.asymmetricKeyType.slice(1)}`;
    case "ec": {
      const namedCurve = key.asymmetricKeyDetails.namedCurve;
      if (raw) {
        return namedCurve;
      }
      return namedCurveToJOSE(namedCurve);
    }
    default:
      throw new TypeError("Invalid asymmetric key type for this operation");
  }
};
var get_named_curve_default = getNamedCurve2;

// ../../packages/create-wirejs-app/node_modules/jose/dist/node/esm/runtime/check_key_length.js
import { KeyObject as KeyObject2 } from "node:crypto";
var check_key_length_default = (key, alg) => {
  let modulusLength;
  try {
    if (key instanceof KeyObject2) {
      modulusLength = key.asymmetricKeyDetails?.modulusLength;
    } else {
      modulusLength = Buffer.from(key.n, "base64url").byteLength << 3;
    }
  } catch {
  }
  if (typeof modulusLength !== "number" || modulusLength < 2048) {
    throw new TypeError(`${alg} requires key modulusLength to be 2048 bits or larger`);
  }
};

// ../../packages/create-wirejs-app/node_modules/jose/dist/node/esm/runtime/jwk_to_key.js
import { createPrivateKey, createPublicKey } from "node:crypto";
var parse = (key) => {
  if (key.d) {
    return createPrivateKey({ format: "jwk", key });
  }
  return createPublicKey({ format: "jwk", key });
};
var jwk_to_key_default = parse;

// ../../packages/create-wirejs-app/node_modules/jose/dist/node/esm/key/import.js
async function importJWK(jwk, alg) {
  if (!isObject(jwk)) {
    throw new TypeError("JWK must be an object");
  }
  alg ||= jwk.alg;
  switch (jwk.kty) {
    case "oct":
      if (typeof jwk.k !== "string" || !jwk.k) {
        throw new TypeError('missing "k" (Key Value) Parameter value');
      }
      return decode(jwk.k);
    case "RSA":
      if (jwk.oth !== void 0) {
        throw new JOSENotSupported('RSA JWK "oth" (Other Primes Info) Parameter value is not supported');
      }
    case "EC":
    case "OKP":
      return jwk_to_key_default({ ...jwk, alg });
    default:
      throw new JOSENotSupported('Unsupported "kty" (Key Type) Parameter value');
  }
}

// ../../packages/create-wirejs-app/node_modules/jose/dist/node/esm/lib/check_key_type.js
var tag = (key) => key?.[Symbol.toStringTag];
var jwkMatchesOp = (alg, key, usage) => {
  if (key.use !== void 0 && key.use !== "sig") {
    throw new TypeError("Invalid key for this operation, when present its use must be sig");
  }
  if (key.key_ops !== void 0 && key.key_ops.includes?.(usage) !== true) {
    throw new TypeError(`Invalid key for this operation, when present its key_ops must include ${usage}`);
  }
  if (key.alg !== void 0 && key.alg !== alg) {
    throw new TypeError(`Invalid key for this operation, when present its alg must be ${alg}`);
  }
  return true;
};
var symmetricTypeCheck = (alg, key, usage, allowJwk) => {
  if (key instanceof Uint8Array)
    return;
  if (allowJwk && isJWK(key)) {
    if (isSecretJWK(key) && jwkMatchesOp(alg, key, usage))
      return;
    throw new TypeError(`JSON Web Key for symmetric algorithms must have JWK "kty" (Key Type) equal to "oct" and the JWK "k" (Key Value) present`);
  }
  if (!is_key_like_default(key)) {
    throw new TypeError(withAlg(alg, key, ...types3, "Uint8Array", allowJwk ? "JSON Web Key" : null));
  }
  if (key.type !== "secret") {
    throw new TypeError(`${tag(key)} instances for symmetric algorithms must be of type "secret"`);
  }
};
var asymmetricTypeCheck = (alg, key, usage, allowJwk) => {
  if (allowJwk && isJWK(key)) {
    switch (usage) {
      case "sign":
        if (isPrivateJWK(key) && jwkMatchesOp(alg, key, usage))
          return;
        throw new TypeError(`JSON Web Key for this operation be a private JWK`);
      case "verify":
        if (isPublicJWK(key) && jwkMatchesOp(alg, key, usage))
          return;
        throw new TypeError(`JSON Web Key for this operation be a public JWK`);
    }
  }
  if (!is_key_like_default(key)) {
    throw new TypeError(withAlg(alg, key, ...types3, allowJwk ? "JSON Web Key" : null));
  }
  if (key.type === "secret") {
    throw new TypeError(`${tag(key)} instances for asymmetric algorithms must not be of type "secret"`);
  }
  if (usage === "sign" && key.type === "public") {
    throw new TypeError(`${tag(key)} instances for asymmetric algorithm signing must be of type "private"`);
  }
  if (usage === "decrypt" && key.type === "public") {
    throw new TypeError(`${tag(key)} instances for asymmetric algorithm decryption must be of type "private"`);
  }
  if (key.algorithm && usage === "verify" && key.type === "private") {
    throw new TypeError(`${tag(key)} instances for asymmetric algorithm verifying must be of type "public"`);
  }
  if (key.algorithm && usage === "encrypt" && key.type === "private") {
    throw new TypeError(`${tag(key)} instances for asymmetric algorithm encryption must be of type "public"`);
  }
};
function checkKeyType(allowJwk, alg, key, usage) {
  const symmetric = alg.startsWith("HS") || alg === "dir" || alg.startsWith("PBES2") || /^A\d{3}(?:GCM)?KW$/.test(alg);
  if (symmetric) {
    symmetricTypeCheck(alg, key, usage, allowJwk);
  } else {
    asymmetricTypeCheck(alg, key, usage, allowJwk);
  }
}
var check_key_type_default = checkKeyType.bind(void 0, false);
var checkKeyTypeWithJwk = checkKeyType.bind(void 0, true);

// ../../packages/create-wirejs-app/node_modules/jose/dist/node/esm/lib/validate_crit.js
function validateCrit(Err, recognizedDefault, recognizedOption, protectedHeader, joseHeader) {
  if (joseHeader.crit !== void 0 && protectedHeader?.crit === void 0) {
    throw new Err('"crit" (Critical) Header Parameter MUST be integrity protected');
  }
  if (!protectedHeader || protectedHeader.crit === void 0) {
    return /* @__PURE__ */ new Set();
  }
  if (!Array.isArray(protectedHeader.crit) || protectedHeader.crit.length === 0 || protectedHeader.crit.some((input) => typeof input !== "string" || input.length === 0)) {
    throw new Err('"crit" (Critical) Header Parameter MUST be an array of non-empty strings when present');
  }
  let recognized;
  if (recognizedOption !== void 0) {
    recognized = new Map([...Object.entries(recognizedOption), ...recognizedDefault.entries()]);
  } else {
    recognized = recognizedDefault;
  }
  for (const parameter of protectedHeader.crit) {
    if (!recognized.has(parameter)) {
      throw new JOSENotSupported(`Extension Header Parameter "${parameter}" is not recognized`);
    }
    if (joseHeader[parameter] === void 0) {
      throw new Err(`Extension Header Parameter "${parameter}" is missing`);
    }
    if (recognized.get(parameter) && protectedHeader[parameter] === void 0) {
      throw new Err(`Extension Header Parameter "${parameter}" MUST be integrity protected`);
    }
  }
  return new Set(protectedHeader.crit);
}
var validate_crit_default = validateCrit;

// ../../packages/create-wirejs-app/node_modules/jose/dist/node/esm/lib/validate_algorithms.js
var validateAlgorithms = (option, algorithms) => {
  if (algorithms !== void 0 && (!Array.isArray(algorithms) || algorithms.some((s) => typeof s !== "string"))) {
    throw new TypeError(`"${option}" option must be an array of strings`);
  }
  if (!algorithms) {
    return void 0;
  }
  return new Set(algorithms);
};
var validate_algorithms_default = validateAlgorithms;

// ../../packages/create-wirejs-app/node_modules/jose/dist/node/esm/runtime/verify.js
import * as crypto3 from "node:crypto";
import { promisify as promisify2 } from "node:util";

// ../../packages/create-wirejs-app/node_modules/jose/dist/node/esm/runtime/dsa_digest.js
function dsaDigest(alg) {
  switch (alg) {
    case "PS256":
    case "RS256":
    case "ES256":
    case "ES256K":
      return "sha256";
    case "PS384":
    case "RS384":
    case "ES384":
      return "sha384";
    case "PS512":
    case "RS512":
    case "ES512":
      return "sha512";
    case "EdDSA":
      return void 0;
    default:
      throw new JOSENotSupported(`alg ${alg} is not supported either by JOSE or your javascript runtime`);
  }
}

// ../../packages/create-wirejs-app/node_modules/jose/dist/node/esm/runtime/node_key.js
import { constants, KeyObject as KeyObject3 } from "node:crypto";
var ecCurveAlgMap = /* @__PURE__ */ new Map([
  ["ES256", "P-256"],
  ["ES256K", "secp256k1"],
  ["ES384", "P-384"],
  ["ES512", "P-521"]
]);
function keyForCrypto(alg, key) {
  let asymmetricKeyType;
  let asymmetricKeyDetails;
  let isJWK2;
  if (key instanceof KeyObject3) {
    asymmetricKeyType = key.asymmetricKeyType;
    asymmetricKeyDetails = key.asymmetricKeyDetails;
  } else {
    isJWK2 = true;
    switch (key.kty) {
      case "RSA":
        asymmetricKeyType = "rsa";
        break;
      case "EC":
        asymmetricKeyType = "ec";
        break;
      case "OKP": {
        if (key.crv === "Ed25519") {
          asymmetricKeyType = "ed25519";
          break;
        }
        if (key.crv === "Ed448") {
          asymmetricKeyType = "ed448";
          break;
        }
        throw new TypeError("Invalid key for this operation, its crv must be Ed25519 or Ed448");
      }
      default:
        throw new TypeError("Invalid key for this operation, its kty must be RSA, OKP, or EC");
    }
  }
  let options;
  switch (alg) {
    case "EdDSA":
      if (!["ed25519", "ed448"].includes(asymmetricKeyType)) {
        throw new TypeError("Invalid key for this operation, its asymmetricKeyType must be ed25519 or ed448");
      }
      break;
    case "RS256":
    case "RS384":
    case "RS512":
      if (asymmetricKeyType !== "rsa") {
        throw new TypeError("Invalid key for this operation, its asymmetricKeyType must be rsa");
      }
      check_key_length_default(key, alg);
      break;
    case "PS256":
    case "PS384":
    case "PS512":
      if (asymmetricKeyType === "rsa-pss") {
        const { hashAlgorithm, mgf1HashAlgorithm, saltLength } = asymmetricKeyDetails;
        const length = parseInt(alg.slice(-3), 10);
        if (hashAlgorithm !== void 0 && (hashAlgorithm !== `sha${length}` || mgf1HashAlgorithm !== hashAlgorithm)) {
          throw new TypeError(`Invalid key for this operation, its RSA-PSS parameters do not meet the requirements of "alg" ${alg}`);
        }
        if (saltLength !== void 0 && saltLength > length >> 3) {
          throw new TypeError(`Invalid key for this operation, its RSA-PSS parameter saltLength does not meet the requirements of "alg" ${alg}`);
        }
      } else if (asymmetricKeyType !== "rsa") {
        throw new TypeError("Invalid key for this operation, its asymmetricKeyType must be rsa or rsa-pss");
      }
      check_key_length_default(key, alg);
      options = {
        padding: constants.RSA_PKCS1_PSS_PADDING,
        saltLength: constants.RSA_PSS_SALTLEN_DIGEST
      };
      break;
    case "ES256":
    case "ES256K":
    case "ES384":
    case "ES512": {
      if (asymmetricKeyType !== "ec") {
        throw new TypeError("Invalid key for this operation, its asymmetricKeyType must be ec");
      }
      const actual = get_named_curve_default(key);
      const expected = ecCurveAlgMap.get(alg);
      if (actual !== expected) {
        throw new TypeError(`Invalid key curve for the algorithm, its curve must be ${expected}, got ${actual}`);
      }
      options = { dsaEncoding: "ieee-p1363" };
      break;
    }
    default:
      throw new JOSENotSupported(`alg ${alg} is not supported either by JOSE or your javascript runtime`);
  }
  if (isJWK2) {
    return { format: "jwk", key, ...options };
  }
  return options ? { ...options, key } : key;
}

// ../../packages/create-wirejs-app/node_modules/jose/dist/node/esm/runtime/sign.js
import * as crypto2 from "node:crypto";
import { promisify } from "node:util";

// ../../packages/create-wirejs-app/node_modules/jose/dist/node/esm/runtime/hmac_digest.js
function hmacDigest(alg) {
  switch (alg) {
    case "HS256":
      return "sha256";
    case "HS384":
      return "sha384";
    case "HS512":
      return "sha512";
    default:
      throw new JOSENotSupported(`alg ${alg} is not supported either by JOSE or your javascript runtime`);
  }
}

// ../../packages/create-wirejs-app/node_modules/jose/dist/node/esm/runtime/get_sign_verify_key.js
import { KeyObject as KeyObject4, createSecretKey } from "node:crypto";
function getSignVerifyKey(alg, key, usage) {
  if (key instanceof Uint8Array) {
    if (!alg.startsWith("HS")) {
      throw new TypeError(invalid_key_input_default(key, ...types3));
    }
    return createSecretKey(key);
  }
  if (key instanceof KeyObject4) {
    return key;
  }
  if (isCryptoKey(key)) {
    checkSigCryptoKey(key, alg, usage);
    return KeyObject4.from(key);
  }
  if (isJWK(key)) {
    if (alg.startsWith("HS")) {
      return createSecretKey(Buffer.from(key.k, "base64url"));
    }
    return key;
  }
  throw new TypeError(invalid_key_input_default(key, ...types3, "Uint8Array", "JSON Web Key"));
}

// ../../packages/create-wirejs-app/node_modules/jose/dist/node/esm/runtime/sign.js
var oneShotSign = promisify(crypto2.sign);
var sign2 = async (alg, key, data) => {
  const k = getSignVerifyKey(alg, key, "sign");
  if (alg.startsWith("HS")) {
    const hmac = crypto2.createHmac(hmacDigest(alg), k);
    hmac.update(data);
    return hmac.digest();
  }
  return oneShotSign(dsaDigest(alg), data, keyForCrypto(alg, k));
};
var sign_default = sign2;

// ../../packages/create-wirejs-app/node_modules/jose/dist/node/esm/runtime/verify.js
var oneShotVerify = promisify2(crypto3.verify);
var verify2 = async (alg, key, signature, data) => {
  const k = getSignVerifyKey(alg, key, "verify");
  if (alg.startsWith("HS")) {
    const expected = await sign_default(alg, k, data);
    const actual = signature;
    try {
      return crypto3.timingSafeEqual(actual, expected);
    } catch {
      return false;
    }
  }
  const algorithm = dsaDigest(alg);
  const keyInput = keyForCrypto(alg, k);
  try {
    return await oneShotVerify(algorithm, data, keyInput, signature);
  } catch {
    return false;
  }
};
var verify_default = verify2;

// ../../packages/create-wirejs-app/node_modules/jose/dist/node/esm/jws/flattened/verify.js
async function flattenedVerify(jws, key, options) {
  if (!isObject(jws)) {
    throw new JWSInvalid("Flattened JWS must be an object");
  }
  if (jws.protected === void 0 && jws.header === void 0) {
    throw new JWSInvalid('Flattened JWS must have either of the "protected" or "header" members');
  }
  if (jws.protected !== void 0 && typeof jws.protected !== "string") {
    throw new JWSInvalid("JWS Protected Header incorrect type");
  }
  if (jws.payload === void 0) {
    throw new JWSInvalid("JWS Payload missing");
  }
  if (typeof jws.signature !== "string") {
    throw new JWSInvalid("JWS Signature missing or incorrect type");
  }
  if (jws.header !== void 0 && !isObject(jws.header)) {
    throw new JWSInvalid("JWS Unprotected Header incorrect type");
  }
  let parsedProt = {};
  if (jws.protected) {
    try {
      const protectedHeader = decode(jws.protected);
      parsedProt = JSON.parse(decoder.decode(protectedHeader));
    } catch {
      throw new JWSInvalid("JWS Protected Header is invalid");
    }
  }
  if (!is_disjoint_default(parsedProt, jws.header)) {
    throw new JWSInvalid("JWS Protected and JWS Unprotected Header Parameter names must be disjoint");
  }
  const joseHeader = {
    ...parsedProt,
    ...jws.header
  };
  const extensions = validate_crit_default(JWSInvalid, /* @__PURE__ */ new Map([["b64", true]]), options?.crit, parsedProt, joseHeader);
  let b64 = true;
  if (extensions.has("b64")) {
    b64 = parsedProt.b64;
    if (typeof b64 !== "boolean") {
      throw new JWSInvalid('The "b64" (base64url-encode payload) Header Parameter must be a boolean');
    }
  }
  const { alg } = joseHeader;
  if (typeof alg !== "string" || !alg) {
    throw new JWSInvalid('JWS "alg" (Algorithm) Header Parameter missing or invalid');
  }
  const algorithms = options && validate_algorithms_default("algorithms", options.algorithms);
  if (algorithms && !algorithms.has(alg)) {
    throw new JOSEAlgNotAllowed('"alg" (Algorithm) Header Parameter value not allowed');
  }
  if (b64) {
    if (typeof jws.payload !== "string") {
      throw new JWSInvalid("JWS Payload must be a string");
    }
  } else if (typeof jws.payload !== "string" && !(jws.payload instanceof Uint8Array)) {
    throw new JWSInvalid("JWS Payload must be a string or an Uint8Array instance");
  }
  let resolvedKey = false;
  if (typeof key === "function") {
    key = await key(parsedProt, jws);
    resolvedKey = true;
    checkKeyTypeWithJwk(alg, key, "verify");
    if (isJWK(key)) {
      key = await importJWK(key, alg);
    }
  } else {
    checkKeyTypeWithJwk(alg, key, "verify");
  }
  const data = concat(encoder.encode(jws.protected ?? ""), encoder.encode("."), typeof jws.payload === "string" ? encoder.encode(jws.payload) : jws.payload);
  let signature;
  try {
    signature = decode(jws.signature);
  } catch {
    throw new JWSInvalid("Failed to base64url decode the signature");
  }
  const verified = await verify_default(alg, key, signature, data);
  if (!verified) {
    throw new JWSSignatureVerificationFailed();
  }
  let payload;
  if (b64) {
    try {
      payload = decode(jws.payload);
    } catch {
      throw new JWSInvalid("Failed to base64url decode the payload");
    }
  } else if (typeof jws.payload === "string") {
    payload = encoder.encode(jws.payload);
  } else {
    payload = jws.payload;
  }
  const result = { payload };
  if (jws.protected !== void 0) {
    result.protectedHeader = parsedProt;
  }
  if (jws.header !== void 0) {
    result.unprotectedHeader = jws.header;
  }
  if (resolvedKey) {
    return { ...result, key };
  }
  return result;
}

// ../../packages/create-wirejs-app/node_modules/jose/dist/node/esm/jws/compact/verify.js
async function compactVerify(jws, key, options) {
  if (jws instanceof Uint8Array) {
    jws = decoder.decode(jws);
  }
  if (typeof jws !== "string") {
    throw new JWSInvalid("Compact JWS must be a string or Uint8Array");
  }
  const { 0: protectedHeader, 1: payload, 2: signature, length } = jws.split(".");
  if (length !== 3) {
    throw new JWSInvalid("Invalid Compact JWS");
  }
  const verified = await flattenedVerify({ payload, protected: protectedHeader, signature }, key, options);
  const result = { payload: verified.payload, protectedHeader: verified.protectedHeader };
  if (typeof key === "function") {
    return { ...result, key: verified.key };
  }
  return result;
}

// ../../packages/create-wirejs-app/node_modules/jose/dist/node/esm/lib/epoch.js
var epoch_default = (date) => Math.floor(date.getTime() / 1e3);

// ../../packages/create-wirejs-app/node_modules/jose/dist/node/esm/lib/secs.js
var minute = 60;
var hour = minute * 60;
var day = hour * 24;
var week = day * 7;
var year = day * 365.25;
var REGEX = /^(\+|\-)? ?(\d+|\d+\.\d+) ?(seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)(?: (ago|from now))?$/i;
var secs_default = (str) => {
  const matched = REGEX.exec(str);
  if (!matched || matched[4] && matched[1]) {
    throw new TypeError("Invalid time period format");
  }
  const value = parseFloat(matched[2]);
  const unit = matched[3].toLowerCase();
  let numericDate;
  switch (unit) {
    case "sec":
    case "secs":
    case "second":
    case "seconds":
    case "s":
      numericDate = Math.round(value);
      break;
    case "minute":
    case "minutes":
    case "min":
    case "mins":
    case "m":
      numericDate = Math.round(value * minute);
      break;
    case "hour":
    case "hours":
    case "hr":
    case "hrs":
    case "h":
      numericDate = Math.round(value * hour);
      break;
    case "day":
    case "days":
    case "d":
      numericDate = Math.round(value * day);
      break;
    case "week":
    case "weeks":
    case "w":
      numericDate = Math.round(value * week);
      break;
    default:
      numericDate = Math.round(value * year);
      break;
  }
  if (matched[1] === "-" || matched[4] === "ago") {
    return -numericDate;
  }
  return numericDate;
};

// ../../packages/create-wirejs-app/node_modules/jose/dist/node/esm/lib/jwt_claims_set.js
var normalizeTyp = (value) => value.toLowerCase().replace(/^application\//, "");
var checkAudiencePresence = (audPayload, audOption) => {
  if (typeof audPayload === "string") {
    return audOption.includes(audPayload);
  }
  if (Array.isArray(audPayload)) {
    return audOption.some(Set.prototype.has.bind(new Set(audPayload)));
  }
  return false;
};
var jwt_claims_set_default = (protectedHeader, encodedPayload, options = {}) => {
  let payload;
  try {
    payload = JSON.parse(decoder.decode(encodedPayload));
  } catch {
  }
  if (!isObject(payload)) {
    throw new JWTInvalid("JWT Claims Set must be a top-level JSON object");
  }
  const { typ } = options;
  if (typ && (typeof protectedHeader.typ !== "string" || normalizeTyp(protectedHeader.typ) !== normalizeTyp(typ))) {
    throw new JWTClaimValidationFailed('unexpected "typ" JWT header value', payload, "typ", "check_failed");
  }
  const { requiredClaims = [], issuer, subject, audience, maxTokenAge } = options;
  const presenceCheck = [...requiredClaims];
  if (maxTokenAge !== void 0)
    presenceCheck.push("iat");
  if (audience !== void 0)
    presenceCheck.push("aud");
  if (subject !== void 0)
    presenceCheck.push("sub");
  if (issuer !== void 0)
    presenceCheck.push("iss");
  for (const claim of new Set(presenceCheck.reverse())) {
    if (!(claim in payload)) {
      throw new JWTClaimValidationFailed(`missing required "${claim}" claim`, payload, claim, "missing");
    }
  }
  if (issuer && !(Array.isArray(issuer) ? issuer : [issuer]).includes(payload.iss)) {
    throw new JWTClaimValidationFailed('unexpected "iss" claim value', payload, "iss", "check_failed");
  }
  if (subject && payload.sub !== subject) {
    throw new JWTClaimValidationFailed('unexpected "sub" claim value', payload, "sub", "check_failed");
  }
  if (audience && !checkAudiencePresence(payload.aud, typeof audience === "string" ? [audience] : audience)) {
    throw new JWTClaimValidationFailed('unexpected "aud" claim value', payload, "aud", "check_failed");
  }
  let tolerance;
  switch (typeof options.clockTolerance) {
    case "string":
      tolerance = secs_default(options.clockTolerance);
      break;
    case "number":
      tolerance = options.clockTolerance;
      break;
    case "undefined":
      tolerance = 0;
      break;
    default:
      throw new TypeError("Invalid clockTolerance option type");
  }
  const { currentDate } = options;
  const now = epoch_default(currentDate || /* @__PURE__ */ new Date());
  if ((payload.iat !== void 0 || maxTokenAge) && typeof payload.iat !== "number") {
    throw new JWTClaimValidationFailed('"iat" claim must be a number', payload, "iat", "invalid");
  }
  if (payload.nbf !== void 0) {
    if (typeof payload.nbf !== "number") {
      throw new JWTClaimValidationFailed('"nbf" claim must be a number', payload, "nbf", "invalid");
    }
    if (payload.nbf > now + tolerance) {
      throw new JWTClaimValidationFailed('"nbf" claim timestamp check failed', payload, "nbf", "check_failed");
    }
  }
  if (payload.exp !== void 0) {
    if (typeof payload.exp !== "number") {
      throw new JWTClaimValidationFailed('"exp" claim must be a number', payload, "exp", "invalid");
    }
    if (payload.exp <= now - tolerance) {
      throw new JWTExpired('"exp" claim timestamp check failed', payload, "exp", "check_failed");
    }
  }
  if (maxTokenAge) {
    const age = now - payload.iat;
    const max = typeof maxTokenAge === "number" ? maxTokenAge : secs_default(maxTokenAge);
    if (age - tolerance > max) {
      throw new JWTExpired('"iat" claim timestamp check failed (too far in the past)', payload, "iat", "check_failed");
    }
    if (age < 0 - tolerance) {
      throw new JWTClaimValidationFailed('"iat" claim timestamp check failed (it should be in the past)', payload, "iat", "check_failed");
    }
  }
  return payload;
};

// ../../packages/create-wirejs-app/node_modules/jose/dist/node/esm/jwt/verify.js
async function jwtVerify(jwt, key, options) {
  const verified = await compactVerify(jwt, key, options);
  if (verified.protectedHeader.crit?.includes("b64") && verified.protectedHeader.b64 === false) {
    throw new JWTInvalid("JWTs MUST NOT use unencoded payload");
  }
  const payload = jwt_claims_set_default(verified.protectedHeader, verified.payload, options);
  const result = { payload, protectedHeader: verified.protectedHeader };
  if (typeof key === "function") {
    return { ...result, key: verified.key };
  }
  return result;
}

// ../../packages/create-wirejs-app/node_modules/jose/dist/node/esm/jws/flattened/sign.js
var FlattenedSign = class {
  _payload;
  _protectedHeader;
  _unprotectedHeader;
  constructor(payload) {
    if (!(payload instanceof Uint8Array)) {
      throw new TypeError("payload must be an instance of Uint8Array");
    }
    this._payload = payload;
  }
  setProtectedHeader(protectedHeader) {
    if (this._protectedHeader) {
      throw new TypeError("setProtectedHeader can only be called once");
    }
    this._protectedHeader = protectedHeader;
    return this;
  }
  setUnprotectedHeader(unprotectedHeader) {
    if (this._unprotectedHeader) {
      throw new TypeError("setUnprotectedHeader can only be called once");
    }
    this._unprotectedHeader = unprotectedHeader;
    return this;
  }
  async sign(key, options) {
    if (!this._protectedHeader && !this._unprotectedHeader) {
      throw new JWSInvalid("either setProtectedHeader or setUnprotectedHeader must be called before #sign()");
    }
    if (!is_disjoint_default(this._protectedHeader, this._unprotectedHeader)) {
      throw new JWSInvalid("JWS Protected and JWS Unprotected Header Parameter names must be disjoint");
    }
    const joseHeader = {
      ...this._protectedHeader,
      ...this._unprotectedHeader
    };
    const extensions = validate_crit_default(JWSInvalid, /* @__PURE__ */ new Map([["b64", true]]), options?.crit, this._protectedHeader, joseHeader);
    let b64 = true;
    if (extensions.has("b64")) {
      b64 = this._protectedHeader.b64;
      if (typeof b64 !== "boolean") {
        throw new JWSInvalid('The "b64" (base64url-encode payload) Header Parameter must be a boolean');
      }
    }
    const { alg } = joseHeader;
    if (typeof alg !== "string" || !alg) {
      throw new JWSInvalid('JWS "alg" (Algorithm) Header Parameter missing or invalid');
    }
    checkKeyTypeWithJwk(alg, key, "sign");
    let payload = this._payload;
    if (b64) {
      payload = encoder.encode(encode(payload));
    }
    let protectedHeader;
    if (this._protectedHeader) {
      protectedHeader = encoder.encode(encode(JSON.stringify(this._protectedHeader)));
    } else {
      protectedHeader = encoder.encode("");
    }
    const data = concat(protectedHeader, encoder.encode("."), payload);
    const signature = await sign_default(alg, key, data);
    const jws = {
      signature: encode(signature),
      payload: ""
    };
    if (b64) {
      jws.payload = decoder.decode(payload);
    }
    if (this._unprotectedHeader) {
      jws.header = this._unprotectedHeader;
    }
    if (this._protectedHeader) {
      jws.protected = decoder.decode(protectedHeader);
    }
    return jws;
  }
};

// ../../packages/create-wirejs-app/node_modules/jose/dist/node/esm/jws/compact/sign.js
var CompactSign = class {
  _flattened;
  constructor(payload) {
    this._flattened = new FlattenedSign(payload);
  }
  setProtectedHeader(protectedHeader) {
    this._flattened.setProtectedHeader(protectedHeader);
    return this;
  }
  async sign(key, options) {
    const jws = await this._flattened.sign(key, options);
    if (jws.payload === void 0) {
      throw new TypeError("use the flattened module for creating JWS with b64: false");
    }
    return `${jws.protected}.${jws.payload}.${jws.signature}`;
  }
};

// ../../packages/create-wirejs-app/node_modules/jose/dist/node/esm/jwt/produce.js
function validateInput(label, input) {
  if (!Number.isFinite(input)) {
    throw new TypeError(`Invalid ${label} input`);
  }
  return input;
}
var ProduceJWT = class {
  _payload;
  constructor(payload = {}) {
    if (!isObject(payload)) {
      throw new TypeError("JWT Claims Set MUST be an object");
    }
    this._payload = payload;
  }
  setIssuer(issuer) {
    this._payload = { ...this._payload, iss: issuer };
    return this;
  }
  setSubject(subject) {
    this._payload = { ...this._payload, sub: subject };
    return this;
  }
  setAudience(audience) {
    this._payload = { ...this._payload, aud: audience };
    return this;
  }
  setJti(jwtId) {
    this._payload = { ...this._payload, jti: jwtId };
    return this;
  }
  setNotBefore(input) {
    if (typeof input === "number") {
      this._payload = { ...this._payload, nbf: validateInput("setNotBefore", input) };
    } else if (input instanceof Date) {
      this._payload = { ...this._payload, nbf: validateInput("setNotBefore", epoch_default(input)) };
    } else {
      this._payload = { ...this._payload, nbf: epoch_default(/* @__PURE__ */ new Date()) + secs_default(input) };
    }
    return this;
  }
  setExpirationTime(input) {
    if (typeof input === "number") {
      this._payload = { ...this._payload, exp: validateInput("setExpirationTime", input) };
    } else if (input instanceof Date) {
      this._payload = { ...this._payload, exp: validateInput("setExpirationTime", epoch_default(input)) };
    } else {
      this._payload = { ...this._payload, exp: epoch_default(/* @__PURE__ */ new Date()) + secs_default(input) };
    }
    return this;
  }
  setIssuedAt(input) {
    if (typeof input === "undefined") {
      this._payload = { ...this._payload, iat: epoch_default(/* @__PURE__ */ new Date()) };
    } else if (input instanceof Date) {
      this._payload = { ...this._payload, iat: validateInput("setIssuedAt", epoch_default(input)) };
    } else if (typeof input === "string") {
      this._payload = {
        ...this._payload,
        iat: validateInput("setIssuedAt", epoch_default(/* @__PURE__ */ new Date()) + secs_default(input))
      };
    } else {
      this._payload = { ...this._payload, iat: validateInput("setIssuedAt", input) };
    }
    return this;
  }
};

// ../../packages/create-wirejs-app/node_modules/jose/dist/node/esm/jwt/sign.js
var SignJWT = class extends ProduceJWT {
  _protectedHeader;
  setProtectedHeader(protectedHeader) {
    this._protectedHeader = protectedHeader;
    return this;
  }
  async sign(key, options) {
    const sig = new CompactSign(encoder.encode(JSON.stringify(this._payload)));
    sig.setProtectedHeader(this._protectedHeader);
    if (Array.isArray(this._protectedHeader?.crit) && this._protectedHeader.crit.includes("b64") && this._protectedHeader.b64 === false) {
      throw new JWTInvalid("JWTs MUST NOT use unencoded payload");
    }
    return sig.sign(key, options);
  }
};

// ../../packages/create-wirejs-app/packages/wirejs-resources/lib/adapters/cookie-jar.js
var CookieJar = class {
  /**
   * @type {Record<string, Cookie>}
   */
  #cookies = {};
  /**
   * The list of cookies that have been set with `set()` which need to be
   * sent to the client.
   * 
   * @type {Set<string>}
   */
  #setCookies = /* @__PURE__ */ new Set();
  /**
   * Initialize
   * 
   * @param {string | undefined} cookie
   */
  constructor(cookie) {
    this.#cookies = Object.fromEntries(
      (cookie || "").split(/;/g).map((c) => {
        const [k, v] = c.split("=").map((p) => decodeURIComponent(p.trim()));
        return [k, {
          name: k,
          value: v
        }];
      })
    );
  }
  /**
   * @param {Cookie} cookie 
   */
  set(cookie) {
    this.#cookies[cookie.name] = { ...cookie };
    this.#setCookies.add(cookie.name);
  }
  /**
   * 
   * @param {string} name 
   * @returns {Cookie | undefined}
   */
  get(name) {
    return this.#cookies[name] ? { ...this.#cookies[name] } : void 0;
  }
  /**
   * 
   * @param {string} name 
   */
  delete(name) {
    if (this.#cookies[name]) {
      this.#cookies[name].value = "-- deleted --";
      this.#cookies[name].maxAge = 0;
      this.#setCookies.add(name);
    }
  }
  /**
   * Gets a copy of all cookies.
   * 
   * Changes made to this copy are not reflected
   * 
   * @returns {Record<string, string>}
   */
  getAll() {
    const all = {};
    for (const cookie of Object.values(this.#cookies)) {
      all[cookie.name] = cookie.value;
    }
    return all;
  }
  getSetCookies() {
    const all = [];
    for (const name of this.#setCookies) {
      all.push({ ...this.#cookies[name] });
    }
    return all;
  }
};

// ../../packages/create-wirejs-app/packages/wirejs-resources/lib/resources/secret.js
import crypto4 from "crypto";
var FILENAME = "secret";
var Secret = class extends Resource {
  /**
   * @type {FileService}
   */
  #fileService;
  /**
   * @type {Promise<any>}
   */
  #initPromise;
  /**
   * @param {Resource | string}
   * @param {string} id 
   */
  constructor(scope, id) {
    super(scope, id);
    this.#fileService = new registry.FileService(this, "files");
    this.#initPromise = this.#fileService.write(
      FILENAME,
      JSON.stringify(crypto4.randomBytes(64).toString("base64url")),
      { onlyIfNotExists: true }
    ).catch((error) => {
      if (!this.#fileService.isAlreadyExistsError(error)) throw error;
    });
  }
  /**
   * @returns {any}
   */
  async read() {
    await this.#initPromise;
    return JSON.parse(await this.#fileService.read(FILENAME));
  }
  /**
   * @param {any} data 
   */
  async write(data) {
    await this.#initPromise;
    await this.#fileService.write(FILENAME, JSON.stringify(data));
  }
};

// ../../packages/create-wirejs-app/packages/wirejs-resources/lib/registry.js
var registry = (
  /** @type {const} **/
  {
    Context,
    CookieJar,
    Secret,
    AuthenticationService,
    FileService
  }
);

// ../../packages/create-wirejs-app/packages/wirejs-resources/lib/adapters/context.js
var contextWrappers = /* @__PURE__ */ new Set();
function withContext(contextWrapper, path2 = []) {
  const fnOrNs = new Proxy(function() {
  }, {
    apply(_target, _thisArg, args) {
      const [context, ...remainingArgs] = args;
      let functionOrNamespaceObject = contextWrapper(context);
      console.log({ context, args, functionOrNamespaceObject, path: path2 });
      for (const k of path2) {
        functionOrNamespaceObject = functionOrNamespaceObject[k];
      }
      return functionOrNamespaceObject(...remainingArgs);
    },
    get(_target, prop) {
      return withContext(contextWrapper, [...path2, prop]);
    }
  });
  contextWrappers.add(fnOrNs);
  return fnOrNs;
}
function requiresContext(fnOrNS) {
  return contextWrappers.has(fnOrNS);
}
var Context = class {
  /**
   * @type {typeof registry['CookieJar']} cookies
   */
  cookies;
  /**
   * @type {URL} location
   */
  location;
  /**
   * @param {{
   * 	cookies: typeof registry['CookieJar'];
   * 	location: URL;
   * }}
   */
  constructor({ cookies, location }) {
    this.cookies = cookies;
    this.location = location;
  }
};

// ../../packages/create-wirejs-app/packages/wirejs-resources/lib/services/authentication.js
function hash(password, salt) {
  return new Promise((resolve, reject) => {
    const finalSalt = salt || randomBytes(16).toString("hex");
    scrypt(password, finalSalt, 64, (err, key) => {
      if (err) {
        reject(err);
      } else {
        resolve(`${finalSalt}$${key.toString("hex")}`);
      }
    });
  });
}
async function verifyHash(password, passwordHash) {
  const [saltPart, _hashPart] = passwordHash.split("$");
  const rehashed = await hash(password, saltPart);
  return rehashed === passwordHash;
}
var ONE_WEEK = 7 * 24 * 60 * 60;
var AuthenticationService = class extends Resource {
  #duration;
  #keepalive;
  #cookieName;
  /**
   * @type {typeof registry['Secret']}
   */
  #rawSigningSecret;
  /**
   * @type {Promise<Uint8Array<ArrayBufferLike>> | undefined}
   */
  #signingSecret;
  #users;
  /**
   * 
   * @param {Resource | string} scope
   * @param {string} id 
   * @param {AuthenticationServiceOptions} [options]
   */
  constructor(scope, id, { duration, keepalive, cookie } = {}) {
    super(scope, id);
    this.#duration = duration || ONE_WEEK;
    this.#keepalive = !!keepalive;
    this.#cookieName = cookie ?? "identity";
    this.#rawSigningSecret = new registry.Secret(this, "jwt-signing-secret");
    const fileService = new registry.FileService(this, "files");
    this.#users = {
      id,
      /**
       * 
       * @param {string} username
       */
      async get(username) {
        try {
          const data = await fileService.read(this.filenameFor(username));
          return JSON.parse(data);
        } catch {
          return void 0;
        }
      },
      /**
       * @param {string} username
       * @param {User} user
       */
      async set(username, details) {
        await fileService.write(this.filenameFor(username), JSON.stringify(details));
      },
      /**
       * @param {string} username
       */
      async has(username) {
        const user = await this.get(username);
        return !!user;
      },
      /**
       * @param {string} username 
       * @returns 
       */
      filenameFor(username) {
        return `${username}.json`;
      }
    };
  }
  async getSigningSecret() {
    const secretAsString = await this.#rawSigningSecret.read();
    return new TextEncoder().encode(secretAsString);
  }
  /**
   * @type {Promise<Uint8Array<ArrayBufferLike>>}
   */
  get signingSecret() {
    if (!this.#signingSecret) {
      this.#signingSecret = this.getSigningSecret();
    }
    return this.#signingSecret;
  }
  /**
   * @param {typeof registry['CookieJar']} cookies
   * @returns {Promise<AuthenticationBaseState>}
   */
  async getBaseState(cookies) {
    let idCookie, idPayload, user;
    try {
      idCookie = cookies.get(this.#cookieName)?.value;
      idPayload = idCookie ? await jwtVerify(idCookie, await this.signingSecret) : void 0;
      user = idPayload ? idPayload.payload.sub : void 0;
    } catch (err) {
      console.error(err);
    }
    if (user) {
      return {
        state: "authenticated",
        user
      };
    } else {
      return {
        state: "unauthenticated",
        user: void 0
      };
    }
  }
  /**
   * @param {typeof registry['CookieJar']} cookies
   * @returns {Promise<AuthenticationState>}
   */
  async getState(cookies) {
    const state = await this.getBaseState(cookies);
    if (state.state === "authenticated") {
      if (this.#keepalive) this.setBaseState(state);
      return {
        state,
        actions: {
          changepassword: {
            name: "Change Password",
            inputs: {
              existingPassword: {
                label: "Old Password",
                type: "password"
              },
              newPassword: {
                label: "New Password",
                type: "password"
              }
            },
            buttons: ["Change Password"]
          },
          signout: {
            name: "Sign out"
          }
        }
      };
    } else {
      return {
        state,
        actions: {
          signin: {
            name: "Sign In",
            inputs: {
              username: {
                label: "Username",
                type: "text"
              },
              password: {
                label: "Password",
                type: "password"
              }
            },
            buttons: ["Sign In"]
          },
          signup: {
            name: "Sign Up",
            inputs: {
              username: {
                label: "Username",
                type: "text"
              },
              password: {
                label: "Password",
                type: "password"
              }
            },
            buttons: ["Sign Up"]
          }
        }
      };
    }
  }
  /**
   * 
   * @param {typeof registry['CookieJar']} cookies 
   * @param {string | undefined} [user]
   */
  async setBaseState(cookies, user) {
    if (!user) {
      cookies.delete(this.#cookieName);
    } else {
      const jwt = await new SignJWT({}).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setSubject(user).setExpirationTime(`${this.#duration}s`).sign(await this.signingSecret);
      cookies.set({
        name: this.#cookieName,
        value: jwt,
        httpOnly: true,
        secure: true,
        maxAge: this.#duration
      });
    }
  }
  /**
   * 
   * @param {Record<string, string>} input 
   * @param {string[]} fields 
   * @returns {AuthenticationError[] | undefined}
   */
  missingFieldErrors(input, fields) {
    const errors = [];
    for (const field of fields) {
      if (!input[field]) errors.push({
        field,
        message: "Field is required."
      });
    }
    return errors.length > 0 ? errors : void 0;
  }
  /**
   * @param {typeof registry['CookieJar']} cookies
   * @param {PerformActionParameter} params
   * @returns {Promise<AuthenticationState | { errors: AuthenticationError[] }>}
   */
  async setState(cookies, { key, inputs, verb: _verb }) {
    if (key === "signout") {
      await this.setBaseState(cookies, void 0);
      return this.getState(cookies);
    } else if (key === "signup") {
      const errors = this.missingFieldErrors(inputs, ["username", "password"]);
      if (errors) {
        return { errors };
      } else if (await this.#users.has(inputs.username)) {
        return {
          errors: [{
            field: "username",
            message: "User already exists."
          }]
        };
      } else {
        await this.#users.set(inputs.username, {
          id: inputs.username,
          password: await hash(inputs.password)
        });
        await this.setBaseState(cookies, inputs.username);
        return this.getState(cookies);
      }
    } else if (key === "signin") {
      const user = await this.#users.get(inputs.username);
      if (!user) {
        return {
          errors: [{
            field: "username",
            message: `User doesn't exist.`
          }]
        };
      } else if (await verifyHash(inputs.password, user.password)) {
        await this.setBaseState(cookies, inputs.username);
        return this.getState(cookies);
      } else {
        return {
          errors: [{
            field: "password",
            message: "Incorrect password."
          }]
        };
      }
    } else if (key === "changepassword") {
      const state = await this.getBaseState(cookies);
      const user = await this.#users.get(state.user);
      if (!user) {
        return {
          errors: [{
            field: "username",
            message: `You're not signed in as a recognized user.`
          }]
        };
      } else if (await verifyHash(inputs.existingPassword, user.password)) {
        await this.#users.set(user.id, {
          ...user,
          password: await hash(inputs.newPassword)
        });
        return {
          message: "Password updated.",
          ...await this.getState(cookies)
        };
      } else {
        return {
          errors: [{
            field: "existingPassword",
            message: "The provided existing password is incorrect."
          }]
        };
      }
    } else {
      return {
        errors: [{
          message: "Unrecognized authentication action."
        }]
      };
    }
  }
  buildApi() {
    return withContext((context) => ({
      getState: () => this.getState(context.cookies),
      /**
       * 
       * @param {Parameters<typeof this['setState']>[1]} options 
       * @returns 
       */
      setState: (options) => this.setState(context.cookies, options)
    }));
  }
};

// ../../packages/create-wirejs-app/packages/wirejs-deploy-amplify-basic/wirejs-resources-overrides/index.js
var FileService2 = class extends Resource {
  constructor(scope, id) {
    super(scope, id);
    addResource("FileService", { absoluteId: this.absoluteId });
  }
  async write(...args) {
    console.log('"writing secret" ... :/ ... ');
  }
};
registry.FileService = FileService2;
globalThis.wirejsResources = [];
function addResource(type, options) {
  wirejsResources.push({
    type,
    options
  });
}
export {
  AuthenticationService,
  Context,
  CookieJar,
  FileService2 as FileService,
  Resource,
  registry,
  requiresContext,
  withContext
};
