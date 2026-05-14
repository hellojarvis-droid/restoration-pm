import {
  constants as cryptoConstants,
  createCipheriv,
  createDecipheriv,
  createHash,
  publicEncrypt,
  randomBytes,
} from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { gunzipSync, inflateRawSync, inflateSync } from "node:zlib";
import { request } from "undici";
import {
  API_BASE,
  API_SALT,
  CLIENT_TYPE,
  CLIENT_VERSION,
  ENCRYPTED_ENDPOINTS,
  ENDPOINTS,
  PEM_PUBLIC_KEY,
  SIGNED_ENDPOINTS,
} from "./endpoints.js";
import type {
  HSEnvelope,
  HouseSigmaConfig,
  SessionState,
  HSAddressSearchHit,
  HSListingDetail,
  HSListingHistoryEntry,
} from "./types.js";

const DEFAULT_HEADERS: Record<string, string> = {
  "accept": "application/json, text/plain, */*",
  "accept-language": "en-US,en;q=0.9",
  "content-type": "application/json",
  "origin": "https://housesigma.com",
  "referer": "https://housesigma.com/",
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "HS-Client-Type": CLIENT_TYPE,
  "HS-Client-Version": CLIENT_VERSION,
};

export class HouseSigmaError extends Error {
  constructor(
    message: string,
    readonly code?: string | number,
    readonly status?: number,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = "HouseSigmaError";
  }
}

export class HouseSigmaClient {
  private session: SessionState | null = null;
  private guestToken: string | null = null;
  private secretKey: string | null = null;

  constructor(private readonly cfg: HouseSigmaConfig) {}

  async ensureSession(): Promise<SessionState> {
    if (this.session?.token) return this.session;

    if (this.cfg.token) {
      // Token override: we still need a fresh secret_key for encrypted
      // endpoints, since each accesstoken/new mints a new key. Bootstrap
      // to pull one, but use the supplied token for user auth.
      await this.ensureGuestToken();
      this.session = { token: this.cfg.token, secretKey: this.secretKey ?? undefined };
      return this.session;
    }

    if (this.cfg.sessionFile) {
      const loaded = await this.loadSession(this.cfg.sessionFile);
      if (loaded) {
        this.session = loaded;
        if (loaded.secretKey) this.secretKey = loaded.secretKey;
        return loaded;
      }
    }

    if (!this.cfg.email || !this.cfg.password) {
      throw new HouseSigmaError(
        "No HouseSigma session available. Set HOUSESIGMA_TOKEN, or provide " +
          "HOUSESIGMA_EMAIL and HOUSESIGMA_PASSWORD.",
      );
    }

    const session = await this.login(this.cfg.email, this.cfg.password);
    this.session = session;
    if (this.cfg.sessionFile) {
      await this.saveSession(this.cfg.sessionFile, session);
    }
    return session;
  }

  private async ensureGuestToken(): Promise<string> {
    if (this.guestToken) return this.guestToken;
    const env = await this.requestJson<{
      access_token?: string;
      secret?: { secret_key?: string };
    }>(
      "POST",
      this.buildUrl(ENDPOINTS.initAccessToken),
      {},
      undefined,
    );
    const tok = env.data?.access_token;
    if (!tok) {
      throw new HouseSigmaError(
        "init/accesstoken/new did not return access_token",
        env.code,
        undefined,
        env,
      );
    }
    this.guestToken = tok;
    this.secretKey = env.data?.secret?.secret_key ?? null;
    return tok;
  }

  async login(email: string, password: string): Promise<SessionState> {
    // HouseSigma's signin doesn't mint a new bearer token; it server-side
    // upgrades the existing access_token from /init/accesstoken/new to a
    // logged-in session. So we reuse the guest token as the user token.
    const guest = await this.ensureGuestToken();
    const env = await this.requestJson<{
      user?: { user_id?: number; lang?: string; province?: string };
      registered?: boolean;
    }>(
      "POST",
      this.buildUrl(ENDPOINTS.signin),
      { email, pass: password, login_type: "normal", token: guest },
      guest,
    );
    if (!env.data?.user) {
      throw new HouseSigmaError(
        "Signin succeeded but no user object in response. HouseSigma may " +
          "have changed the signin payload shape - re-capture from DevTools.",
        env.code,
        undefined,
        env,
      );
    }
    return {
      token: guest,
      userId: env.data.user.user_id?.toString(),
      secretKey: this.secretKey ?? undefined,
    };
  }

  async searchAddress(query: string): Promise<HSAddressSearchHit[]> {
    const env = await this.post<unknown>(ENDPOINTS.searchAddress, {
      province: "ON",
      search_term: query,
      lang: "en_US",
    });
    return normaliseSearchHits(env.data);
  }

  async getListing(idListing: string): Promise<HSListingDetail> {
    const env = await this.post<unknown>(ENDPOINTS.listingDetail, {
      id_listing: idListing,
      lang: "en_US",
      province: "ON",
    });
    return normaliseListingDetail(idListing, env.data);
  }

  async getListingHistory(idListing: string): Promise<HSListingHistoryEntry[]> {
    // HouseSigma embeds listing history inside the detail_v2 response under
    // data.listing_history. No separate endpoint exists.
    const env = await this.post<unknown>(ENDPOINTS.listingDetail, {
      id_listing: idListing,
      lang: "en_US",
      province: "ON",
    });
    return normaliseHistory(env.data);
  }

  async getComparables(idListing: string): Promise<unknown> {
    const [sold, sale] = await Promise.all([
      this.post<unknown>(ENDPOINTS.nearbySold, {
        id_listing: idListing,
        lang: "en_US",
      }),
      this.post<unknown>(ENDPOINTS.nearbySale, {
        id_listing: idListing,
        lang: "en_US",
      }),
    ]);
    return { sold: sold.data, sale: sale.data };
  }

  private async post<T>(
    path: string,
    body: Record<string, unknown>,
  ): Promise<HSEnvelope<T>> {
    const session = await this.ensureSession();
    const url = this.buildUrl(path);

    const needsSign = SIGNED_ENDPOINTS.has(path) || ENCRYPTED_ENDPOINTS.has(path);
    const signed = needsSign ? signBody(body) : body;

    if (ENCRYPTED_ENDPOINTS.has(path)) {
      if (!this.secretKey) {
        throw new HouseSigmaError(
          "Encrypted endpoint called but no secret_key cached from " +
            "/init/accesstoken/new. This is a client bug.",
        );
      }
      const ts = Math.floor(Date.now() / 1000).toString();
      const { ctr, et_payload, counter } = encryptPayload(
        { ...signed, hs_request_timestamp: ts },
        this.secretKey,
      );
      const env = await this.requestJson<unknown>(
        "POST",
        url,
        { ctr, et_payload },
        session.token,
        { "Hs-Request-Timestamp": ts },
      );
      const decryptedData = decryptPayload(env.data, this.secretKey, counter);
      return { ...env, data: decryptedData } as HSEnvelope<T>;
    }

    return this.requestJson<T>("POST", url, signed, session.token);
  }

  private async requestJson<T>(
    method: "GET" | "POST",
    url: string,
    body: unknown,
    token: string | undefined,
    extraHeaders?: Record<string, string>,
  ): Promise<HSEnvelope<T>> {
    const headers: Record<string, string> = {
      ...DEFAULT_HEADERS,
      ...(extraHeaders ?? {}),
    };
    if (token) headers["authorization"] = `Bearer ${token}`;

    if (this.cfg.debug) {
      process.stderr.write(`[housesigma] ${method} ${url}\n`);
    }

    const res = await request(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const text = await res.body.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new HouseSigmaError(
        `Non-JSON response (HTTP ${res.statusCode}). First 200 chars: ` +
          text.slice(0, 200),
        undefined,
        res.statusCode,
        text,
      );
    }

    const env = parsed as HSEnvelope<T> & {
      error?: { code?: number; message?: string };
    };
    const errMsg = env.error?.message ?? env.message;
    if (res.statusCode >= 400 || env.status === false) {
      throw new HouseSigmaError(
        errMsg || `Request failed (HTTP ${res.statusCode})`,
        env.error?.code ?? env.code,
        res.statusCode,
        env,
      );
    }
    return env;
  }

  private buildUrl(path: string): string {
    return new URL(API_BASE + path, this.cfg.baseUrl).toString();
  }

  private async loadSession(file: string): Promise<SessionState | null> {
    try {
      const raw = await readFile(file, "utf8");
      const parsed = JSON.parse(raw) as SessionState;
      if (!parsed.token) return null;
      if (parsed.expiresAt && parsed.expiresAt * 1000 < Date.now()) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  private async saveSession(file: string, session: SessionState): Promise<void> {
    await writeFile(file, JSON.stringify(session, null, 2), "utf8");
  }
}

// ---- request signing -------------------------------------------------------
// Mirrors the bundle's Dm() function:
//   qs = keys sorted DESC, encodeURIComponent(k)=encodeURIComponent(v),
//        joined by &, then toLowerCase()
//   ts = unix seconds (10-char prefix of Date.now())
//   signature = md5(qs + ts + apiSalt)

function signBody(body: Record<string, unknown>): Record<string, unknown> {
  const ts = Math.floor(Date.now() / 1000).toString();
  const qs = Object.keys(body)
    .sort()
    .reverse()
    .map((k) => {
      const v = body[k];
      if (v === undefined || v === null) return null;
      if (typeof v !== "string" && typeof v !== "number") return null;
      if (typeof v === "number" && Number.isNaN(v)) return null;
      return `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`;
    })
    .filter((x): x is string => x !== null)
    .join("&")
    .toLowerCase();
  const signature = createHash("md5")
    .update(qs + ts + API_SALT)
    .digest("hex");
  return { ...body, ts, signature };
}

// ---- normalisers -----------------------------------------------------------

function normaliseSearchHits(data: unknown): HSAddressSearchHit[] {
  if (!data) return [];
  // /search/address_v2/suggest returns
  //   { house_list: [...], place_list: [...], community_list: [...] }
  // house_list is the most useful - each entry already has id_listing,
  // address, price, ml_count_text, rooms_text, brokerage_text, etc.
  const list = pickArray(data, [
    "house_list",
    "list",
    "results",
    "items",
    "suggest",
    "suggestions",
    "address",
    "listings",
  ]);
  return list.map((item) => {
    const it = item as Record<string, unknown>;
    const location = it.location as { lat?: number; lon?: number } | undefined;
    return {
      id_listing: asString(it.id_listing ?? it.id),
      id: asString(it.id),
      text: asString(it.text ?? it.address_search ?? it.label),
      address: asString(it.address),
      city: asString(it.city ?? it.municipality_name),
      province: asString(it.province ?? it.province_abbr),
      postal_code: asString(it.postal_code ?? it.postcode),
      lat: asNumber(it.lat ?? location?.lat),
      lng: asNumber(it.lng ?? it.lon ?? location?.lon),
      raw: item,
    };
  });
}

function normaliseListingDetail(
  idListing: string,
  data: unknown,
): HSListingDetail {
  const d = (data ?? {}) as Record<string, unknown>;
  const house = (d.house ?? d.listing ?? d) as Record<string, unknown>;
  return {
    id_listing: idListing,
    mls_num: asString(house.mls_num ?? house.ml_num),
    address: asString(house.address ?? house.address_search),
    list_price: asNumber(house.price ?? house.list_price),
    status: asString(house.status ?? house.house_status),
    bedrooms: (house.bedroom ?? house.bedrooms) as number | string | undefined,
    bathrooms: (house.washroom ?? house.bathrooms) as
      | number
      | string
      | undefined,
    sqft: asString(house.sqft ?? house.house_area),
    property_type: asString(house.house_type ?? house.property_type),
    list_date: asString(house.list_date ?? house.date_start),
    description: asString(house.description ?? house.remark),
    brokerage: asString(house.brokerage ?? house.brokerage_name),
    raw: data,
  };
}

function normaliseHistory(data: unknown): HSListingHistoryEntry[] {
  if (!data) return [];
  const d = data as Record<string, unknown>;
  const list = pickArray(d.listing_history ?? d, [
    "listing_history",
    "transaction",
    "history",
    "list",
    "items",
  ]);
  return list.map((item) => {
    const it = item as Record<string, unknown>;
    const start = asString(it.date_start ?? it.list_date);
    const end = asString(it.date_end ?? it.end_date);
    const priceDisp = asString(it.price ?? it.list_price);
    const soldDisp = asString(it.price_sold ?? it.sold_price);
    const blurFlag = it.blur_price === true || it.blur_price === 1;
    const listPriceNum = asNumber(priceDisp);
    const soldPriceNum = asNumber(soldDisp);
    return {
      id_listing: asString(it.id_listing) ?? "",
      mls_num: asString(it.ml_num ?? it.mls_num),
      list_date: start,
      end_date: end,
      status: asString(it.status ?? it.house_status),
      list_price: listPriceNum,
      list_price_display: priceDisp,
      sold_price: soldPriceNum,
      sold_price_display: soldDisp,
      price_gated:
        blurFlag ||
        (priceDisp !== undefined && listPriceNum === undefined) ||
        (soldDisp !== undefined && soldDisp !== null && soldPriceNum === undefined),
      days_on_market: computeDOM(start, end),
      price_changes: extractPriceChanges(it),
      raw: item,
    };
  });
}

function computeDOM(start?: string, end?: string): number | undefined {
  if (!start) return undefined;
  const a = Date.parse(start);
  const b = end ? Date.parse(end) : Date.now();
  if (Number.isNaN(a) || Number.isNaN(b)) return undefined;
  return Math.max(0, Math.floor((b - a) / (24 * 3600 * 1000)));
}

function extractPriceChanges(
  it: Record<string, unknown>,
): Array<{ date: string; price: number }> | undefined {
  const arr = it.price_history ?? it.price_changes;
  if (!Array.isArray(arr)) return undefined;
  return arr
    .map((p) => {
      const pp = p as Record<string, unknown>;
      const date = asString(pp.date) ?? "";
      const price = asNumber(pp.price);
      if (!date || price === undefined) return null;
      return { date, price };
    })
    .filter((x): x is { date: string; price: number } => x !== null);
}

function pickArray(obj: unknown, keys: string[]): unknown[] {
  if (Array.isArray(obj)) return obj;
  if (!obj || typeof obj !== "object") return [];
  const o = obj as Record<string, unknown>;
  for (const k of keys) {
    if (Array.isArray(o[k])) return o[k] as unknown[];
  }
  return [];
}

function asString(v: unknown): string | undefined {
  if (v === undefined || v === null) return undefined;
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return undefined;
}

function asNumber(v: unknown): number | undefined {
  if (v === undefined || v === null) return undefined;
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = Number(v.replace(/[,$\s]/g, ""));
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

// ---- payload encryption (for endpoints in ENCRYPTED_ENDPOINTS) -----------
// Mirrors the bundle's Zr() (encrypt) and Im()+pu() (decrypt+inflate).
//
// Request:
//   counter = 16 random bytes
//   et_payload = AES-128-CTR(key=secret_key padded/truncated to 16 bytes,
//                            iv=counter, JSON.stringify(body))
//   ctr        = RSA-OAEP-SHA1(public_key, counter)
//   body       = { ctr: base64(ctr), et_payload: base64(et_payload) }
//   header     = Hs-Request-Timestamp: <unix_secs>
//
// Response data:
//   base64 -> AES-CTR(same key, same counter) -> gunzip -> JSON.parse

function aesKey(secretKey: string): Buffer {
  return Buffer.from((secretKey + "*".repeat(16)).slice(0, 16), "utf8");
}

function encryptPayload(
  body: Record<string, unknown>,
  secretKey: string,
): { ctr: string; et_payload: string; counter: Buffer } {
  const counter = randomBytes(16);
  const plaintext = Buffer.from(JSON.stringify(body), "utf8");
  const cipher = createCipheriv("aes-128-ctr", aesKey(secretKey), counter);
  const et = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const rsaCtr = publicEncrypt(
    {
      key: PEM_PUBLIC_KEY,
      padding: cryptoConstants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha1",
    },
    counter,
  );
  return {
    ctr: rsaCtr.toString("base64"),
    et_payload: et.toString("base64"),
    counter,
  };
}

function decryptPayload(
  encoded: unknown,
  secretKey: string,
  counter: Buffer,
): unknown {
  if (typeof encoded !== "string") return encoded;
  const raw = Buffer.from(encoded, "base64");
  const decipher = createDecipheriv("aes-128-ctr", aesKey(secretKey), counter);
  const pt = Buffer.concat([decipher.update(raw), decipher.final()]);
  for (const fn of [gunzipSync, inflateRawSync, inflateSync]) {
    try {
      return JSON.parse(fn(pt).toString("utf8"));
    } catch {
      // try next algorithm
    }
  }
  try {
    return JSON.parse(pt.toString("utf8"));
  } catch {
    throw new HouseSigmaError(
      "Failed to decompress/parse decrypted response body",
    );
  }
}
