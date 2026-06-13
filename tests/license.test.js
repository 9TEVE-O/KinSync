import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LICENSE_PATH = resolve(__dirname, "..", "LICENSE");
const licenseText = existsSync(LICENSE_PATH)
  ? readFileSync(LICENSE_PATH, "utf8")
  : null;

describe("LICENSE file", () => {
  it("exists at the repository root", () => {
    assert.ok(existsSync(LICENSE_PATH), "LICENSE file must exist at the repository root");
  });

  it("is not empty", () => {
    assert.ok(licenseText && licenseText.trim().length > 0, "LICENSE file must not be empty");
  });

  it("is identified as MIT License in the first line", () => {
    const firstLine = licenseText.split("\n")[0].trim();
    assert.equal(firstLine, "MIT License");
  });

  it("contains a copyright notice with the year 2026", () => {
    assert.match(licenseText, /Copyright \(c\) 2026/);
  });

  it("contains the correct copyright holder name", () => {
    assert.match(licenseText, /Copyright \(c\) 2026 9TEVE-O/);
  });

  it("contains the full copyright line in the correct format", () => {
    assert.ok(
      licenseText.includes("Copyright (c) 2026 9TEVE-O"),
      "COPYRIGHT line must read exactly: Copyright (c) 2026 9TEVE-O"
    );
  });

  it("grants permission to use, copy, modify, and distribute the software", () => {
    assert.match(
      licenseText,
      /Permission is hereby granted, free of charge, to any person obtaining a copy/
    );
  });

  it("explicitly grants sublicensing rights", () => {
    assert.match(licenseText, /sublicense/);
  });

  it("explicitly grants the right to sell copies", () => {
    assert.match(licenseText, /sell\s+copies/);
  });

  it("requires the copyright notice to be included in all copies", () => {
    assert.match(
      licenseText,
      /The above copyright notice and this permission notice shall be included in all/
    );
  });

  it("includes the AS IS warranty disclaimer in uppercase", () => {
    assert.match(licenseText, /THE SOFTWARE IS PROVIDED "AS IS"/);
  });

  it("disclaims warranty of merchantability", () => {
    assert.match(licenseText, /WARRANTIES OF MERCHANTABILITY/i);
  });

  it("disclaims warranty of fitness for a particular purpose", () => {
    assert.match(licenseText, /FITNESS FOR A PARTICULAR PURPOSE/i);
  });

  it("includes a non-infringement disclaimer", () => {
    assert.match(licenseText, /NONINFRINGEMENT/i);
  });

  it("limits liability for claims, damages, and other liability", () => {
    assert.match(licenseText, /BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER/i);
  });

  it("covers liability arising from the Software", () => {
    assert.match(
      licenseText,
      /ARISING FROM,\s+OUT OF OR IN CONNECTION WITH THE SOFTWARE/i
    );
  });

  it("covers dealings in the software", () => {
    assert.match(licenseText, /DEALINGS IN THE\s+SOFTWARE/i);
  });

  it("does not reference the GPL license", () => {
    assert.doesNotMatch(
      licenseText,
      /GNU General Public License|GNU GPL|GPLv[0-9]/i
    );
  });

  it("does not reference the Apache license", () => {
    assert.doesNotMatch(licenseText, /Apache License/i);
  });

  it("does not reference the BSD license", () => {
    assert.doesNotMatch(licenseText, /BSD License/i);
  });

  it("contains the word SOFTWARE as the final word (MIT closing clause)", () => {
    const trimmed = licenseText.trimEnd();
    assert.ok(
      trimmed.endsWith("SOFTWARE."),
      `LICENSE must end with "SOFTWARE." but ends with: "${trimmed.slice(-20)}"`
    );
  });

  it("has the expected number of substantive sections (≥4)", () => {
    // MIT license always has: header, copyright, permission grant, warranty disclaimer
    const nonEmptyLines = licenseText
      .split("\n")
      .filter((line) => line.trim().length > 0);
    assert.ok(
      nonEmptyLines.length >= 4,
      "LICENSE must have at least 4 non-empty lines for a valid MIT license"
    );
  });

  it("contains exactly one copyright statement", () => {
    const matches = licenseText.match(/Copyright \(c\)/gi) || [];
    assert.equal(
      matches.length,
      1,
      "LICENSE must contain exactly one copyright notice"
    );
  });

  it("does not contain placeholder or template text", () => {
    assert.doesNotMatch(licenseText, /\[year\]|\[fullname\]|\[author\]/i);
  });
});
