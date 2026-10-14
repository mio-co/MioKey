// @ts-expect-error Tests run with Bun, while this project intentionally omits Bun's global type package.
import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// On Cloudflare Workers, Telefunc's getContext() throws "Cannot access context object"
// once the telefunction has awaited anything. Every context read must come first.
const CONTEXT_READ = /getContext\s*(<[^>]*>)?\s*\(|\brequire(Database|User|Admin|PaymentFlowService)\(\)/g;

function telefuncFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return telefuncFiles(path);
    return path.endsWith(".telefunc.ts") ? [path] : [];
  });
}

function functionBodies(source: string) {
  const bodies: Array<{ name: string; body: string }> = [];
  const starts = /async function (\w+)\([^)]*\)[^{]*\{|telefuncAction\(async \([^)]*\)\s*=>\s*\{/g;
  for (let match = starts.exec(source); match; match = starts.exec(source)) {
    let depth = 1;
    let index = match.index + match[0].length;
    const start = index;
    while (depth > 0 && index < source.length) {
      if (source[index] === "{") depth += 1;
      else if (source[index] === "}") depth -= 1;
      index += 1;
    }
    bodies.push({ name: match[1] ?? "telefuncAction", body: source.slice(start, index) });
  }
  return bodies;
}

describe("telefunc context access", () => {
  test("no telefunction reads the Telefunc context after its first await", () => {
    const offenders: string[] = [];
    for (const file of telefuncFiles("server")) {
      for (const { name, body } of functionBodies(readFileSync(file, "utf-8"))) {
        const firstAwait = body.search(/\bawait\b/);
        if (firstAwait < 0) continue;
        for (const read of body.matchAll(CONTEXT_READ)) {
          if ((read.index ?? 0) > firstAwait) offenders.push(`${file}:${name}:${read[0]}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
