// HouseSigma endpoint catalog.
//
// These paths come from publicly-observable network traffic against
// housesigma.com. They are NOT a documented public API and may change.
// If a call starts returning 404 / 401 / "status: false", re-capture
// the matching request from your logged-in browser DevTools and update
// the path here. See README "Network capture" for the procedure.

export const ENDPOINTS = {
  // POST { email, password } -> { data: { token, id_user, ... } }
  login: "/bkv2/api/user/login_email",

  // GET ?lang=en_US -> verifies token, returns user profile
  userInfo: "/bkv2/api/user/info",

  // GET ?lang=en_US&q=<query>
  // Universal search box. Returns mixed address/listing/agent hits.
  search: "/bkv2/api/search/address",

  // GET ?lang=en_US&id_listing=<id>
  // Single listing detail.
  listingDetail: "/bkv2/api/listing/info",

  // GET ?lang=en_US&id_listing=<id>
  // Listing history block - prior MLS entries, price changes, status.
  listingHistory: "/bkv2/api/listing/history",

  // GET ?lang=en_US&id_listing=<id>
  // Sold/active comparables surrounding a given listing.
  comparables: "/bkv2/api/listing/comparables",
} as const;

export type EndpointKey = keyof typeof ENDPOINTS;
