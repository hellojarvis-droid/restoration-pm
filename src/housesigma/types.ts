export interface HouseSigmaConfig {
  baseUrl: string;
  email?: string;
  password?: string;
  token?: string;
  sessionFile?: string;
  debug: boolean;
}

export interface SessionState {
  token: string;
  userId?: string;
  expiresAt?: number;
  secretKey?: string;
}

export interface HSEnvelope<T> {
  status: boolean;
  data?: T;
  message?: string;
  code?: string | number;
}

export interface HSAddressSearchHit {
  id_listing?: string;
  id?: string;
  text?: string;
  address?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  lat?: number;
  lng?: number;
  raw: unknown;
}

export interface HSListingHistoryEntry {
  id_listing: string;
  mls_num?: string;
  list_date?: string;
  end_date?: string;
  status?: string;
  list_price?: number;
  list_price_display?: string;
  sold_price?: number;
  sold_price_display?: string;
  price_gated?: boolean;
  days_on_market?: number;
  price_changes?: Array<{
    date: string;
    price: number;
  }>;
  raw: unknown;
}

export interface HSListingDetail {
  id_listing: string;
  mls_num?: string;
  address?: string;
  list_price?: number;
  status?: string;
  bedrooms?: number | string;
  bathrooms?: number | string;
  sqft?: string;
  property_type?: string;
  list_date?: string;
  description?: string;
  brokerage?: string;
  raw: unknown;
}
