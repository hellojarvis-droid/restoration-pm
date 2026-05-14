// HouseSigma endpoint catalog.
//
// These paths and the auth flow were derived from the public web bundle at
// https://housesigma.com/assets/index.*.js (axios baseURL = base_url + "/api"
// where base_url = "https://housesigma.com/bkv2").
//
// NOT a documented public API. Update here if any call starts returning
// {"error":{"message":"API endpoint Not Found"}} or HTTP 404.

export const API_BASE = "/bkv2/api";

export const ENDPOINTS = {
  // POST {} -> { data: { access_token, secret: { secret_key, ... } } }
  // First call from a fresh client; gives you a guest token that's required
  // as Bearer auth on signin and as the body `token` field.
  initAccessToken: "/init/accesstoken/new",

  // POST { email, password, token: <guest_access_token> }
  // Requires Bearer <guest_access_token>. Returns
  // { data: { token, user: { ... } } } on success.
  signin: "/auth/user/signin",

  // POST {} -> nukes the user token server-side.
  signout: "/auth/user/signout",

  // POST { q } -> address suggestions list.
  searchAddress: "/search/address_v2/suggest",

  // POST { id_listing, ... } -> full listing detail incl. history block.
  // NEEDS SIGNING: include signature + ts (see client.signRequest).
  listingDetail: "/listing/info/detail_v2",

  // POST { id_listing } -> photos.
  listingPhotos: "/listing/info/photos",

  // POST { id_listing } -> nearby sold.
  nearbySold: "/listing/nearby/sold",

  // POST { id_listing } -> nearby for-sale.
  nearbySale: "/listing/nearby/sale",
} as const;

// Endpoints listed in the web bundle's `needSignApi` config that require
// signature + ts fields in the request body.
export const SIGNED_ENDPOINTS: ReadonlySet<string> = new Set([
  ENDPOINTS.listingDetail,
  "/search/mapsearchv3/list",
  "/search/mapsearchv3/listing",
]);

// Header values pulled from the desktop web bundle.
export const CLIENT_TYPE = "desktop_v7";
export const CLIENT_VERSION = "7.22.2";

// API salt used in the md5 signing. Extracted from window.Ke.apiSalt in the
// production bundle. Rotates rarely; check the bundle if signed calls start
// failing.
export const API_SALT = "ZckdTeV3kGyZd80q";

export type EndpointKey = keyof typeof ENDPOINTS;
