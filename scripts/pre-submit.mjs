#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let failed = 0;
const check = (ok, name, extra = "") => {
  console.log(`${ok ? "ok" : "FAIL"}  ${name}${extra ? " — " + extra : ""}`);
  if (!ok) failed++;
};

for (const f of ["README.md", "LICENSE", "SECURITY.md", ".gitignore", ".env.example", "package.json", "mcp/server.mjs", "gateway/server.mjs", "public/index.html", "public/shop.html", "snippet/agentpay.js"]) {
  check(fs.existsSync(path.join(ROOT, f)), `file ${f}`);
}

const envEx = fs.readFileSync(path.join(ROOT, ".env.example"), "utf8");
check(!/BEGIN (RSA )?PRIVATE KEY|sk-|B402_PRIVATE_KEY=.+[=/]{10}/.test(envEx), ".env.example has no live secrets");

const gitignore = fs.readFileSync(path.join(ROOT, ".gitignore"), "utf8");
check(gitignore.includes(".env") && gitignore.includes("gateway/outbox") && gitignore.includes("gateway/data") && gitignore.includes("orders.json"), ".gitignore covers secrets/data");

const readme = fs.readFileSync(path.join(ROOT, "README.md"), "utf8");
check(/Track A/i.test(readme) && /x402/i.test(readme) && /Agent OS/i.test(readme), "README names Track A + Agent OS + x402");
check(/pay\.shangdian\.me/.test(readme), "README links live gateway");

const leak = spawnSync("rg", ["-n", "BEGIN (RSA )?PRIVATE KEY|sk-ant-|B402_PRIVATE_KEY=.+[A-Za-z0-9+/=]{40}", ROOT, "-g", "!.git"], { encoding: "utf8" });
check(!leak.stdout?.trim(), "no private keys in tree", leak.stdout?.trim()?.split("\n")[0]);

const tests = spawnSync(process.execPath, [path.join(ROOT, "tests/run.mjs")], { encoding: "utf8" });
process.stdout.write(tests.stdout || "");
process.stderr.write(tests.stderr || "");
check(tests.status === 0, "tests/run.mjs");

console.log(failed ? `\npre-submit FAILED (${failed})` : "\npre-submit OK");
process.exit(failed ? 1 : 0);
