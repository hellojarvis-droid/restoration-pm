import { chromium } from "playwright";

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1100, height: 1400 },
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();
await page.goto("http://127.0.0.1:8765/index.html", { waitUntil: "networkidle" });
// Wait for Chart.js to load AND both canvases to have drawn pixels
await page.waitForFunction(() => typeof window.Chart === "function", { timeout: 30000 });
await page.waitForFunction(() => {
  for (const c of document.querySelectorAll("canvas")) {
    if (c.width === 0 || c.height === 0) return false;
  }
  return document.querySelectorAll("canvas").length >= 2;
}, { timeout: 30000 });
await page.waitForTimeout(2500); // allow animation to settle

// Save a full-page screenshot AND a PDF
await page.screenshot({ path: "/home/user/restoration-pm/pitch/preview-full.png", fullPage: true });
console.log("[+] wrote preview-full.png");

await page.emulateMedia({ media: "print" });
await page.pdf({
  path: "/home/user/restoration-pm/pitch/35-jonathan-offer.pdf",
  format: "Letter",
  printBackground: true,
  margin: { top: "0.4in", right: "0.4in", bottom: "0.4in", left: "0.4in" },
});
console.log("[+] wrote 35-jonathan-offer.pdf");

// Also page-by-page screenshots for inline preview (max ~1500px tall each)
const h = await page.evaluate(() => document.body.scrollHeight);
const PER = 1400;
const pages = Math.ceil(h / PER);
console.log(`[+] full height: ${h}px -> ${pages} preview slices`);

// Resize viewport tall enough for each slice, scroll, then screenshot viewport
for (let i = 0; i < pages; i++) {
  const yOffset = i * PER;
  const sliceHeight = Math.min(PER, h - yOffset);
  await page.setViewportSize({ width: 1100, height: sliceHeight });
  await page.evaluate((y) => window.scrollTo(0, y), yOffset);
  await page.waitForTimeout(200);
  await page.screenshot({
    path: `/home/user/restoration-pm/pitch/preview-${String(i+1).padStart(2,"0")}.png`,
    fullPage: false,
  });
}
console.log(`[+] wrote ${pages} preview slices`);

await browser.close();
