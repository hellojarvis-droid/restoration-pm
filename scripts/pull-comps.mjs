import { createCipheriv, createDecipheriv, createHash, publicEncrypt, randomBytes, constants } from "node:crypto";
import { gunzipSync, inflateRawSync, inflateSync } from "node:zlib";
import { readFileSync, writeFileSync } from "node:fs";
import { request } from "undici";

const env = readFileSync("/home/user/restoration-pm/.env", "utf8");
for (const line of env.split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}

const API_BASE = "https://housesigma.com/bkv2/api";
const SALT = "ZckdTeV3kGyZd80q";
const ENCRYPTED = new Set([
  "/listing/info/detail_v2",
  "/listing/info/popularity",
  "/listing/preview/many",
  "/search/mapsearchv3/list",
  "/stats/trend/trendHouseList",
  "/search/homepage/recommendlist_v2",
]);
const SIGNED = new Set([...ENCRYPTED, "/search/mapsearchv3/listing"]);
const PEM = `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDQlOcjEbqprurl2xjoEP0QdjGI
rZhLVn5vzwCorG4+2AtSi4AAHjghSXM//ljqE5rA13gfTc58JvM6I75Dmqr5r5Vv
o57CAbxBXHsXu5ojtgvb5rOd2lrZeckwJL0Z7euvRsA/FjbFdGMcGeSJ8JoePq+H
0RFOt285bSb8hVq0LQIDAQAB
-----END PUBLIC KEY-----`;
const H = {
  "content-type":"application/json","HS-Client-Type":"desktop_v7","HS-Client-Version":"7.22.2",
  "user-agent":"Mozilla/5.0","origin":"https://housesigma.com","referer":"https://housesigma.com/",
};

function aesKey(s){return Buffer.from((s+"*".repeat(16)).slice(0,16),"utf8")}
function signBody(b){
  const ts=Math.floor(Date.now()/1000).toString();
  const qs=Object.keys(b).sort().reverse()
    .filter(k=>b[k]!=null && (typeof b[k]==="string"||typeof b[k]==="number"))
    .map(k=>`${encodeURIComponent(k)}=${encodeURIComponent(String(b[k]))}`).join("&").toLowerCase();
  return {...b,ts,signature:createHash("md5").update(qs+ts+SALT).digest("hex")};
}
function encBody(b,sk){
  const c=randomBytes(16);
  const cph=createCipheriv("aes-128-ctr",aesKey(sk),c);
  const et=Buffer.concat([cph.update(Buffer.from(JSON.stringify(b),"utf8")),cph.final()]);
  const rsa=publicEncrypt({key:PEM,padding:constants.RSA_PKCS1_OAEP_PADDING,oaepHash:"sha1"},c);
  return [{ctr:rsa.toString("base64"),et_payload:et.toString("base64")},c];
}
function decResp(b64,sk,c){
  const raw=Buffer.from(b64,"base64");
  const dec=createDecipheriv("aes-128-ctr",aesKey(sk),c);
  const pt=Buffer.concat([dec.update(raw),dec.final()]);
  for(const fn of [gunzipSync,inflateRawSync,inflateSync]){try{return JSON.parse(fn(pt).toString("utf8"))}catch{}}
  try{return JSON.parse(pt.toString("utf8"))}catch{return null}
}

let guestToken, secretKey;
async function rawPost(path, body, extra={}) {
  const headers={...H,...extra};
  if(guestToken) headers["authorization"]=`Bearer ${guestToken}`;
  const r=await request(API_BASE+path,{method:"POST",headers,body:JSON.stringify(body)});
  return JSON.parse(await r.body.text());
}
async function call(path, body) {
  let b=body??{};
  if(SIGNED.has(path)) b=signBody(b);
  if(ENCRYPTED.has(path)) {
    const ts=Math.floor(Date.now()/1000).toString();
    const [enc,counter]=encBody({...b,hs_request_timestamp:ts},secretKey);
    const r=await rawPost(path,enc,{"Hs-Request-Timestamp":ts});
    if(r.status && typeof r.data==="string") r.data=decResp(r.data,secretKey,counter);
    return r;
  }
  return rawPost(path,b);
}

const init = await rawPost("/init/accesstoken/new", {});
guestToken = init.data.access_token;
secretKey = init.data.secret.secret_key;
const signin = await rawPost("/auth/user/signin", {email:process.env.HOUSESIGMA_EMAIL,pass:process.env.HOUSESIGMA_PASSWORD,login_type:"normal",token:guestToken});
if (!signin.status) { console.error("signin failed", signin); process.exit(1); }
console.error("[+] logged in as", signin.data.user.name);

const ID_TARGET = "eVbOYENpbBGyx2P0";

const detail = await call("/listing/info/detail_v2", {id_listing:ID_TARGET, lang:"en_US", province:"ON"});
console.error("[+] target detail status:", detail.status, "top keys:", detail.data ? Object.keys(detail.data).slice(0,15) : "(no data)");

const sold = await call("/listing/nearby/sold", {id_listing:ID_TARGET, lang:"en_US", province:"ON"});
console.error("[+] nearby/sold status:", sold.status, "keys:", sold.data && typeof sold.data==="object" ? Object.keys(sold.data).slice(0,10) : typeof sold.data);

const sale = await call("/listing/nearby/sale", {id_listing:ID_TARGET, lang:"en_US", province:"ON"});
console.error("[+] nearby/sale status:", sale.status);

const idCommunity = detail.data?.house?.community?.id_community || detail.data?.house?.id_community || 752;
console.error("[+] community id:", idCommunity);
const commStats = await call("/community/soldpricestats", {id_community:idCommunity, lang:"en_US", province:"ON"});
console.error("[+] community/soldpricestats status:", commStats.status);

writeFileSync("/home/user/restoration-pm/data/target-detail.json", JSON.stringify(detail.data, null, 2));
writeFileSync("/home/user/restoration-pm/data/nearby-sold.json", JSON.stringify(sold.data, null, 2));
writeFileSync("/home/user/restoration-pm/data/nearby-sale.json", JSON.stringify(sale.data, null, 2));
writeFileSync("/home/user/restoration-pm/data/community-stats.json", JSON.stringify(commStats.data, null, 2));
console.error("[+] wrote data/*.json");

function describe(obj, label) {
  if (!obj) { console.error(`[${label}] no data`); return; }
  if (Array.isArray(obj)) {
    console.error(`[${label}] array of ${obj.length}`);
    if (obj[0]) console.error(`  keys[0]:`, Object.keys(obj[0]).slice(0,20));
  } else if (typeof obj === "object") {
    console.error(`[${label}] object keys:`, Object.keys(obj).slice(0,15));
    for (const k of Object.keys(obj).slice(0,15)) {
      const v = obj[k];
      if (Array.isArray(v)) console.error(`    .${k}: array(${v.length})`);
    }
  }
}
describe(sold.data, "sold");
describe(sale.data, "sale");
describe(commStats.data, "commStats");
