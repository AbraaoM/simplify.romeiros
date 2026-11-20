import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

// O Next só aceita funções async exportadas em arquivos "use server".
// Valores (const, objetos) só quebram em runtime, no POST, e o build não avisa.
describe("arquivos use server", () => {
  const files = walk("src").filter(
    (f) => /\.(ts|tsx)$/.test(f) && /^\s*["']use server["']/.test(readFileSync(f, "utf8")),
  );

  it("encontra ao menos um arquivo use server", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    it(`${file} só exporta funções async e tipos`, () => {
      const bad = readFileSync(file, "utf8")
        .split("\n")
        .filter((l) => /^export\s/.test(l))
        .filter((l) => !/^export\s+async\s+function\s/.test(l))
        .filter((l) => !/^export\s+(type|interface)\s/.test(l))
        .filter((l) => !/^export\s+type\s*\{/.test(l));
      expect(bad).toEqual([]);
    });
  }
});
