#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { loadConfig } from "./config.js";
import { HouseSigmaClient, HouseSigmaError } from "./housesigma/client.js";

const cfg = loadConfig();
const client = new HouseSigmaClient(cfg);

const tools: Tool[] = [
  {
    name: "search_address",
    description:
      "Search HouseSigma for a property by free-text address, partial street, " +
      "or postal code. Returns a list of candidate hits, each with an " +
      "`id_listing` you can pass to `get_listing` / `get_listing_history`.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Address fragment, full address, or postal code.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_listing",
    description:
      "Fetch full detail for a single HouseSigma listing by its internal " +
      "`id_listing`. Returns price, beds/baths, sqft, status, MLS number, " +
      "description, brokerage, and the raw payload.",
    inputSchema: {
      type: "object",
      properties: {
        id_listing: { type: "string", description: "HouseSigma listing id." },
      },
      required: ["id_listing"],
    },
  },
  {
    name: "get_listing_history",
    description:
      "Fetch the full listing history for a property by its HouseSigma " +
      "`id_listing`. Returns every prior MLS record with list date, end date, " +
      "status (Sold/Terminated/Expired), list price, sold price, days on " +
      "market, and price changes.",
    inputSchema: {
      type: "object",
      properties: {
        id_listing: { type: "string", description: "HouseSigma listing id." },
      },
      required: ["id_listing"],
    },
  },
  {
    name: "get_comparables",
    description:
      "Fetch HouseSigma's comparables (recently sold and active listings near " +
      "the target property) for a given `id_listing`. Returns the raw " +
      "comparables payload.",
    inputSchema: {
      type: "object",
      properties: {
        id_listing: { type: "string", description: "HouseSigma listing id." },
      },
      required: ["id_listing"],
    },
  },
  {
    name: "lookup_property",
    description:
      "Convenience tool: takes a free-text address, picks the top search hit, " +
      "and returns its detail + full listing history in a single call. Use " +
      "this when you want the answer in one shot.",
    inputSchema: {
      type: "object",
      properties: {
        address: {
          type: "string",
          description: "Full or partial property address.",
        },
      },
      required: ["address"],
    },
  },
];

const SearchInput = z.object({ query: z.string().min(1) });
const ListingInput = z.object({ id_listing: z.string().min(1) });
const LookupInput = z.object({ address: z.string().min(1) });

const server = new Server(
  { name: "housesigma-mcp", version: "0.1.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;
  try {
    switch (name) {
      case "search_address": {
        const { query } = SearchInput.parse(args);
        const hits = await client.searchAddress(query);
        return toolResult({ count: hits.length, hits });
      }
      case "get_listing": {
        const { id_listing } = ListingInput.parse(args);
        const detail = await client.getListing(id_listing);
        return toolResult(detail);
      }
      case "get_listing_history": {
        const { id_listing } = ListingInput.parse(args);
        const history = await client.getListingHistory(id_listing);
        return toolResult({ count: history.length, history });
      }
      case "get_comparables": {
        const { id_listing } = ListingInput.parse(args);
        const data = await client.getComparables(id_listing);
        return toolResult(data);
      }
      case "lookup_property": {
        const { address } = LookupInput.parse(args);
        const hits = await client.searchAddress(address);
        const top = hits.find((h) => h.id_listing) ?? hits[0];
        if (!top?.id_listing) {
          return toolResult({
            matched: false,
            search_hits: hits,
            note: "No id_listing found on top hit. Inspect search_hits to pick one manually.",
          });
        }
        const [detail, history] = await Promise.all([
          client.getListing(top.id_listing),
          client.getListingHistory(top.id_listing),
        ]);
        return toolResult({
          matched: true,
          top_hit: top,
          detail,
          history,
        });
      }
      default:
        return toolError(`Unknown tool: ${name}`);
    }
  } catch (err) {
    return toolError(formatError(err));
  }
});

function toolResult(value: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
  };
}

function toolError(message: string) {
  return {
    isError: true,
    content: [{ type: "text" as const, text: message }],
  };
}

function formatError(err: unknown): string {
  if (err instanceof HouseSigmaError) {
    const parts = [`HouseSigmaError: ${err.message}`];
    if (err.status) parts.push(`http=${err.status}`);
    if (err.code !== undefined) parts.push(`code=${err.code}`);
    return parts.join(" ");
  }
  if (err instanceof z.ZodError) {
    return `Invalid arguments: ${err.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ")}`;
  }
  if (err instanceof Error) return `${err.name}: ${err.message}`;
  return String(err);
}

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write("[housesigma-mcp] ready on stdio\n");
}

main().catch((err) => {
  process.stderr.write(`[housesigma-mcp] fatal: ${formatError(err)}\n`);
  process.exit(1);
});
