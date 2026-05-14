import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { request } from "undici";
import {
  API_BASE,
  API_SALT,
  CLIENT_TYPE,
  CLIENT_VERSION,
  ENDPOINTS,
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

  constructor(private readonly cfg: HouseSigmaConfig) {}

  async ensureSession(): Promise<SessionState> {
    if (this.session?.token) return this.session;

    if (this.cfg.token) {
      this.session = { token: this.cfg.token };
      return this.session;
    }

    if (this.cfg.sessionFile) {
      const loaded = await this.loadSession(this.cfg.sessionFile);
      if (loaded) {
        this.session = loaded;
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
    const env = await this.requestJson<{ access_token?: string }>(
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
    return tok;
  }

  async login(email: string, password: string): Promise<SessionState> {
    const guest = await this.ensureGuestToken();
    const env = await this.requestJson<{
      token?: string;
      user?: { id_user?: string; lang?: string; province?: string };
    }>(
      "POST",
      this.buildUrl(ENDPOINTS.signin),
      { email, password, token: guest },
      guest,
    );
    const userToken = env.data?.token;
    if (!userToken) {
      throw new HouseSigmaError(
        "Signin succeeded but no user token returned. HouseSigma may have " +
          "changed the signin payload shape - re-capture from DevTools.",
        env.code,
        undefined,
        env,
      );
    }
    return { token: userToken, userId: env.data?.user?.id_user };
  }

  async searchAddress(query: string): Promise<HSAddressSearchHit[]> {
    const env = await this.post<unknown>(ENDPOINTS.searchAddress, {
      q: query,
      lang: "en_US",
    });
    return normaliseSearchHits(env.data);
  }

  async getListing(idListing: string): Promise<HSListingDetail> {
    const env = await this.post<unknown>(ENDPOINTS.listingDetail, {
      id_listing: idListing,
      lang: "en_US",
    });
    return normaliseListingDetail(idListing, env.data);
  }

  async getListingHistory(idListing: string): Promise<HSListingHistoryEntry[]> {
    // HouseSigma embeds listing history inside the detail_v2 response.
    // No separate endpoint exists in the public bundle.
    const env = await this.post<unknown>(ENDPOINTS.listingDetail, {
      id_listing: idListing,
      lang: "en_US",
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
    const signedBody = SIGNED_ENDPOINTS.has(path) ? signBody(body) : body;
    return this.requestJson<T>("POST", url, signedBody, session.token);
  }

  private async requestJson<T>(
    method: "GET" | "POST",
    url: string,
    body: unknown,
    token: string | undefined,
  ): Promise<HSEnvelope<T>> {
    const headers: Record<string, string> = { ...DEFAULT_HEADERS };
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
  const list = pickArray(data, [
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
    return {
      id_listing: asString(it.id_listing ?? it.id),
      id: asString(it.id),
      text: asString(it.text ?? it.address_search ?? it.label),
      address: asString(it.address),
      city: asString(it.city ?? it.municipality_name),
      province: asString(it.province),
      postal_code: asString(it.postal_code ?? it.postcode),
      lat: asNumber(it.lat),
      lng: asNumber(it.lng ?? it.lon),
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
  const source = (d.transaction ?? d.history ?? d) as unknown;
  const list = pickArray(source, [
    "transaction",
    "history",
    "list",
    "items",
  ]);
  return list.map((item) => {
    const it = item as Record<string, unknown>;
    return {
      id_listing: asString(it.id_listing) ?? "",
      mls_num: asString(it.mls_num ?? it.ml_num),
      list_date: asString(it.list_date ?? it.date_start),
      end_date: asString(it.end_date ?? it.date_end),
      status: asString(it.status ?? it.house_status),
      list_price: asNumber(it.list_price ?? it.price),
      sold_price: asNumber(it.sold_price ?? it.price_sold),
      days_on_market: asNumber(it.dom ?? it.days_on_market),
      price_changes: extractPriceChanges(it),
      raw: item,
    };
  });
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
