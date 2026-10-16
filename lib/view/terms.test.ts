import assert from "node:assert/strict";
import test from "node:test";
import { termParts } from "./terms.ts";

test("gearbox codes and market words link into the glossary", () => {
  const parts = termParts("Коробка 6F35 и вариатор. Медиана с резервом.");
  assert.deepEqual(
    parts.filter((part) => part.href).map((part) => [part.text.toLowerCase(), part.href]),
    [
      ["вариатор", "/guide/glossary#cvt"],
      ["медиана", "/guide/glossary#median"],
      ["резервом", "/guide/glossary#reserve"],
    ],
  );
});
