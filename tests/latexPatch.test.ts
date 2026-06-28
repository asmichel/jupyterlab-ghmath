import assert from "node:assert/strict";
import test from "node:test";

import { JSDOM } from "jsdom";

import { installGitHubMathPatch, renderGitHubMathDelimiters } from "../src/latexPatch";

/**
 * installDomGlobals exposes the JSDOM globals used by latexPatch.
 */
function installDomGlobals(): Document {
  const dom = new JSDOM("<!doctype html><body></body>");
  globalThis.document = dom.window.document;
  globalThis.Node = dom.window.Node;
  return dom.window.document;
}

/**
 * renderGitHubMathDelimiters renders GitHub inline math before the normal KaTeX pass.
 */
test("renderGitHubMathDelimiters renders GitHub inline spans", () => {
  const document = installDomGlobals();
  const host = document.createElement("div");
  host.textContent = "GitHub math: $`\\sqrt{3x-1}`$.";

  renderGitHubMathDelimiters(host);

  assert.match(host.innerHTML, /class="katex/);
  assert.doesNotMatch(host.textContent ?? "", /\$`/);
});

/**
 * renderGitHubMathDelimiters renders bare TeX environments in display mode.
 */
test("renderGitHubMathDelimiters renders bare begin-end environments", () => {
  const document = installDomGlobals();
  const host = document.createElement("div");
  host.textContent = "\\begin{align}x&=1\\\\y&=2\\end{align}";

  renderGitHubMathDelimiters(host);

  assert.match(host.innerHTML, /class="katex-display"/);
  assert.ok(host.querySelector(".katex-display"));
});

/**
 * installGitHubMathPatch invokes the original typesetter after delimiter rendering.
 */
test("installGitHubMathPatch wraps an existing typesetter once", () => {
  const document = installDomGlobals();
  const calls: string[] = [];
  const latexTypesetter = {
    typeset: (host: HTMLElement): void => {
      calls.push(host.innerHTML);
    }
  };
  const host = document.createElement("div");
  host.textContent = "$`x^2`$";

  installGitHubMathPatch(latexTypesetter);
  installGitHubMathPatch(latexTypesetter);
  latexTypesetter.typeset(host);

  assert.equal(calls.length, 1);
  assert.match(calls[0], /class="katex/);
});
