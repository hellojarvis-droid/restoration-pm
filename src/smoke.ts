import { loadConfig } from "./config.js";
import { HouseSigmaClient } from "./housesigma/client.js";

async function main() {
  const cfg = loadConfig();
  const client = new HouseSigmaClient(cfg);

  const query = process.argv[2] ?? "35 Jonathan Street Uxbridge";
  process.stderr.write(`[smoke] searching: ${query}\n`);
  const hits = await client.searchAddress(query);
  process.stderr.write(`[smoke] got ${hits.length} hits\n`);
  console.log(JSON.stringify({ hits }, null, 2));

  const top = hits.find((h) => h.id_listing);
  if (!top?.id_listing) {
    process.stderr.write("[smoke] no id_listing on top hit; stopping.\n");
    return;
  }
  const detail = await client.getListing(top.id_listing);
  const history = await client.getListingHistory(top.id_listing);
  console.log(JSON.stringify({ detail, history }, null, 2));
}

main().catch((err) => {
  process.stderr.write(`[smoke] error: ${err?.message ?? err}\n`);
  process.exit(1);
});
