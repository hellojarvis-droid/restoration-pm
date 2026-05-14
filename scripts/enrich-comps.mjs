import { createCipheriv, createDecipheriv, createHash, publicEncrypt, randomBytes, constants } from "node:crypto";
import { gunzipSync, inflateRawSync, inflateSync } from "node:zlib";
import { readFileSync, writeFileSync } from "node:fs";
import { request } from "undici";

const env = readFileSync("/home/user/restoration-pm/.env", "utf8");
for (const line of env.split("\n")) { const m = line.match(/^([A-Z_]+)=(.*)$/); if (m) process.env[m[1]] = m[2]; }

const API_BASE = "https://housesigma.com/bkv2/api";
const SALT = "ZckdTeV3kGyZd80q";
const PEM = `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDQlOcjEbqprurl2xjoEP0QdjGI
rZhLVn5vzwCorG4+2AtSi4AAHjghSXM//ljqE5rA13gfTc58JvM6I75Dmqr5r5Vv
o57CAbxBXHsXu5ojtgvb5rOd2lrZeckwJL0Z7euvRsA/FjbFdGMcGeSJ8JoePq+H
0RFOt285bSb8hVq0LQIDAQAB
-----END PUBLIC KEY-----`;
const H = { "content-type":"application/json","HS-Client-Type":"desktop_v7","HS-Client-Version":"7.22.2","user-agent":"Mozilla/5.0","origin":"https://housesigma.com","referer":"https://housesigma.com/"};

function aesKey(s){return Buffer.from((s+"*".repeat(16)).slice(0,16),"utf8")}
function signBody(b){const ts=Math.floor(Date.now()/1000).toString();const qs=Object.keys(b).sort().reverse().filter(k=>b[k]!=null&&(typeof b[k]==="string"||typeof b[k]==="number")).map(k=>`${encodeURIComponent(k)}=${encodeURIComponent(String(b[k]))}`).join("&").toLowerCase();return {...b,ts,signature:createHash("md5").update(qs+ts+SALT).digest("hex")}}
function encBody(b,sk){const c=randomBytes(16);const cph=createCipheriv("aes-128-ctr",aesKey(sk),c);const et=Buffer.concat([cph.update(Buffer.from(JSON.stringify(b),"utf8")),cph.final()]);const rsa=publicEncrypt({key:PEM,padding:constants.RSA_PKCS1_OAEP_PADDING,oaepHash:"sha1"},c);return [{ctr:rsa.toString("base64"),et_payload:et.toString("base64")},c]}
function decResp(b64,sk,c){const raw=Buffer.from(b64,"base64");const dec=createDecipheriv("aes-128-ctr",aesKey(sk),c);const pt=Buffer.concat([dec.update(raw),dec.final()]);for(const fn of [gunzipSync,inflateRawSync,inflateSync]){try{return JSON.parse(fn(pt).toString("utf8"))}catch{}}try{return JSON.parse(pt.toString("utf8"))}catch{return null}}

let guestToken, secretKey;
async function rawPost(path, body, extra={}) { const headers={...H,...extra}; if(guestToken) headers["authorization"]=`Bearer ${guestToken}`; const r=await request(API_BASE+path,{method:"POST",headers,body:JSON.stringify(body)}); return JSON.parse(await r.body.text()) }
async function callDetail(idListing) {
  const ts=Math.floor(Date.now()/1000).toString();
  const signed = signBody({id_listing:idListing, lang:"en_US", province:"ON"});
  const [enc, counter] = encBody({...signed, hs_request_timestamp:ts}, secretKey);
  const r = await rawPost("/listing/info/detail_v2", enc, {"Hs-Request-Timestamp":ts});
  if(r.status && typeof r.data==="string") r.data=decResp(r.data, secretKey, counter);
  return r;
}

const init = await rawPost("/init/accesstoken/new", {});
guestToken = init.data.access_token;
secretKey = init.data.secret.secret_key;
await rawPost("/auth/user/signin", {email:process.env.HOUSESIGMA_EMAIL,pass:process.env.HOUSESIGMA_PASSWORD,login_type:"normal",token:guestToken}, guestToken);
console.error("[+] signed in");

const sold = JSON.parse(readFileSync("/home/user/restoration-pm/data/nearby-sold.json","utf8"));
const sale = JSON.parse(readFileSync("/home/user/restoration-pm/data/nearby-sale.json","utf8"));
const allComps = [
  ...sold.nearby.map(h => ({...h, _set:"SOLD"})),
  ...sale.nearby.map(h => ({...h, _set:"FOR_SALE"})),
];
console.error(`[+] inspecting ${allComps.length} comps for sqft`);

const enriched = [];
for (const c of allComps) {
  try {
    const d = await callDetail(c.id_listing);
    const house = d?.data?.house ?? {};
    const sqft = house.house_area?.area ?? null;
    const yearBuilt = house.year_built ?? null;
    const ageBracket = d?.data?.property_detail?.building?.value?.find(v=>v.name==="Building Age")?.value ?? null;
    const style = d?.data?.property_detail?.property?.value?.find(v=>v.name==="Style")?.value ?? null;
    const bedrooms = house.bedroom_string ?? house.bedroom ?? null;
    const washroom = house.washroom ?? null;
    const lot = house.land?.text ?? null;
    const dateEnd = house.date_end ?? house.date_sold ?? null;
    enriched.push({
      seo: c.seo_address,
      addr: c.address,
      set: c._set,
      marker: c.marker_label,
      sqft, yearBuilt, ageBracket, style, bedrooms, washroom, lot, dateEnd,
      gated: typeof sqft === "string" && (sqft.includes("*") || sqft.includes("Agreement")),
    });
    console.error(`  ${c.seo_address.padEnd(35)} sqft=${sqft} style=${style} age=${ageBracket} dateEnd=${dateEnd}`);
  } catch (e) {
    console.error(`  ${c.seo_address}: ERROR ${e.message}`);
  }
}
writeFileSync("/home/user/restoration-pm/data/comps-enriched.json", JSON.stringify(enriched, null, 2));
console.error(`[+] wrote data/comps-enriched.json`);
