import assert from "node:assert/strict";
import test from "node:test";

import { JSDOM } from "jsdom";

import { createKatexTypesetter, renderKatexMath } from "../src/katexTypesetter";

/**
 * installDomGlobals exposes the JSDOM globals used by katexTypesetter.
 */
function installDomGlobals(): Document {
  const dom = new JSDOM("<!doctype html><body></body>");
  globalThis.document = dom.window.document;
  globalThis.Node = dom.window.Node;
  return dom.window.document;
}

/**
 * createHost returns a detached JSDOM element with text content.
 *
 * @param text - The host text content to install.
 * @returns A detached div element for typesetting tests.
 */
function createHost(text: string): HTMLDivElement {
  const document = installDomGlobals();
  const host = document.createElement("div");
  host.textContent = text;
  return host;
}

/**
 * renderKatexMath renders GitHub inline math before ordinary dollar math.
 */
test("renderKatexMath renders GitHub inline spans without backtick glyphs", () => {
  const host = createHost("GitHub math: $`\\sqrt{3x-1}`$.");

  renderKatexMath(host);

  assert.match(host.innerHTML, /class="katex/);
  assert.doesNotMatch(host.innerHTML, /\$`/);
  assert.doesNotMatch(host.innerHTML, /‘/);
});

/**
 * renderKatexMath renders standard Markdown math delimiters.
 */
test("renderKatexMath renders standard dollar and bracket delimiters", () => {
  const host = createHost("$E=mc^2$ $$x+y$$ \\(a+b\\) \\[c+d\\]");

  renderKatexMath(host);

  assert.equal(host.querySelectorAll(".katex").length, 4);
  assert.equal(host.querySelectorAll(".katex-display").length, 2);
});

/**
 * renderKatexMath renders bare TeX environments in display mode.
 */
test("renderKatexMath renders bare begin-end environments", () => {
  const host = createHost("\\begin{align}x&=1\\\\y&=2\\end{align}");

  renderKatexMath(host);

  assert.ok(host.querySelector(".katex-display"));
});

/**
 * renderKatexMath leaves code and preformatted text untouched.
 */
test("renderKatexMath skips code and pre tags", () => {
  const document = installDomGlobals();
  const host = document.createElement("div");
  host.innerHTML = "<code>$x$</code><pre>$y$</pre><p>$z$</p>";

  renderKatexMath(host);

  assert.equal(host.querySelector("code")?.textContent, "$x$");
  assert.equal(host.querySelector("pre")?.textContent, "$y$");
  assert.ok(host.querySelector("p .katex"));
});

/**
 * createKatexTypesetter exposes the JupyterLab ILatexTypesetter behavior.
 */
test("createKatexTypesetter returns a working ILatexTypesetter", () => {
  const host = createHost("$`x^2`$");
  const typesetter = createKatexTypesetter();

  typesetter.typeset(host);

  assert.match(host.innerHTML, /class="katex/);
});

