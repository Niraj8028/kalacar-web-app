// Runs the Kalacar regression suites against the local dev servers: `npm run qa` (or `npm run qa -- orders colours`).
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { readdirSync } from "node:fs";
const dir = fileURLToPath(new URL("./suites/", import.meta.url));
const wanted = process.argv.slice(2);
const suites = readdirSync(dir).filter(f => f.endsWith(".mjs")).map(f => f.replace(".mjs", "")).filter(n => !wanted.length || wanted.includes(n));
const summary = [];
for (const name of suites) {
  console.log(`\n=== ${name}`);
  let out = "", failed = false;
  try { out = execFileSync(process.execPath, ["--env-file=.env.local", dir + name + ".mjs"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 600000 }); }
  catch (error) { out = String(error.stdout ?? "") + String(error.stderr ?? ""); failed = true; }
  process.stdout.write(out);
  const m = out.match(/(\d+) passed, (\d+) failed/);
  // A suite that exits with an error but reports no failures still crashed (e.g. setup threw before any check).
  const crashed = failed && (!m || Number(m[2]) === 0);
  summary.push({ suite: name, passed: m ? Number(m[1]) : 0, failed: m ? Number(m[2]) : 1, crashed });
}
console.log("\n=== summary"); console.table(summary);
process.exitCode = summary.some(s => s.failed || s.crashed) ? 1 : 0;
