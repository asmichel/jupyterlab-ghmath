import assert from "node:assert/strict";
import test from "node:test";

import type { IRenderMime } from "@jupyterlab/rendermime";
import { JSDOM } from "jsdom";

import { MATH_PLACEHOLDER_CLASS, MATH_PLACEHOLDER_SELECTOR } from "../src/parser";

/**
 * installDomGlobals exposes JSDOM globals used by Jupyter renderHTML and KaTeX.
 */
function installDomGlobals(): Document {
  const dom = new JSDOM("<!doctype html><body></body>");
  globalThis.window = dom.window as unknown as Window & typeof globalThis;
  globalThis.document = dom.window.document;
  globalThis.DragEvent = dom.window.DragEvent ?? dom.window.MouseEvent;
  globalThis.Element = dom.window.Element;
  globalThis.HTMLElement = dom.window.HTMLElement;
  globalThis.Node = dom.window.Node;
  return dom.window.document;
}

/**
 * createHost returns a detached JSDOM host for renderer tests.
 *
 * @returns A detached div element owned by a JSDOM document.
 */
function createHost(): HTMLDivElement {
  const document = installDomGlobals();
  return document.createElement("div");
}

/**
 * createSanitizer returns Jupyter's default sanitizer without loading UI modules.
 *
 * @returns A promise for a default Jupyter sanitizer.
 */
async function createSanitizer(): Promise<IRenderMime.ISanitizer> {
  const { Sanitizer } = await import("@jupyterlab/apputils/src/sanitizer.ts");
  return new Sanitizer();
}

/**
 * sanitizer keeps placeholder classes and text but removes unsafe script tags.
 */
test("Jupyter sanitizer preserves placeholder classes and TeX text", async () => {
  installDomGlobals();
  const sanitizer = await createSanitizer();
  const sanitized = sanitizer.sanitize(
    `<p><span class="${MATH_PLACEHOLDER_CLASS} jp-ghmath-inline">\\sqrt{3x-1}</span><script>alert(1)</script></p>`
  );

  assert.match(sanitized, new RegExp(MATH_PLACEHOLDER_CLASS));
  assert.match(sanitized, /\\sqrt\{3x-1\}/);
  assert.doesNotMatch(sanitized, /<script\b/);
  assert.doesNotMatch(sanitized, /alert\(1\)/);
});

/**
 * renderSanitizedMarkdown removes scripts before injecting KaTeX output.
 */
test("renderer sanitizes untrusted Markdown before rendering KaTeX placeholders", async () => {
  const host = createHost();
  const { renderSanitizedMarkdown } = await import("../src/renderer");

  await renderSanitizedMarkdown({
    host,
    source: "Inline $`\\sqrt{3x-1}`$.\n\n<script>alert(1)</script>",
    trusted: false,
    sanitizer: await createSanitizer(),
    resolver: null,
    linkHandler: null
  });

  assert.doesNotMatch(host.innerHTML, /<script\b/);
  assert.doesNotMatch(host.innerHTML, /alert\(1\)/);
  assert.equal(host.querySelectorAll(MATH_PLACEHOLDER_SELECTOR).length, 1);
  assert.ok(host.querySelector(".katex"));
  assert.ok(host.querySelector("math"));
  assert.ok(host.querySelector(".katex-html"));
});

/**
 * renderer factory bypasses Jupyter ILatexTypesetter for Markdown rendering.
 */
test("renderer factory does not call a fake ILatexTypesetter during Markdown rendering", async () => {
  installDomGlobals();
  const { githubMarkdownRendererFactory } = await import("../src/renderer");
  let typesetCalls = 0;
  const fakeTypesetter: IRenderMime.ILatexTypesetter = {
    typeset: () => {
      typesetCalls += 1;
    }
  };
  const renderer = githubMarkdownRendererFactory.createRenderer({
    mimeType: "text/markdown",
    sanitizer: await createSanitizer(),
    resolver: null,
    linkHandler: null,
    latexTypesetter: fakeTypesetter
  });
  const model: IRenderMime.IMimeModel = {
    data: {
      "text/markdown": "$`x^2`$"
    },
    metadata: {},
    trusted: false,
    setData: () => undefined
  };

  await renderer.renderModel(model);

  assert.equal(renderer.node.querySelectorAll(".katex").length, 1);
  assert.equal(typesetCalls, 0);
});
