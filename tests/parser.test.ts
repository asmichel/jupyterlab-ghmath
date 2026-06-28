import assert from "node:assert/strict";
import test from "node:test";

import { createMarkdownParser, extractHeadingTokens } from "../src/parser";

/**
 * KATEX_CLASS_PATTERN checks that a rendered snippet contains KaTeX markup.
 */
const KATEX_CLASS_PATTERN = /class="katex/;

/**
 * parser renders Markdown and math delimiter cases through markdown-it-texmath.
 */
test("parser renders Markdown and supported math delimiters", async () => {
  const parser = createMarkdownParser();
  const html = await parser.render(`# Heading

Inline dollar math $E = mc^2$.

Display dollar math:

$$
\\int_0^1 x^2\\,dx
$$

Bracket inline \\(a^2+b^2=c^2\\).

Bracket display:

\\[
e^{i\\pi}+1=0
\\]

GitHub inline $\`\\sqrt{3x-1}\`$.

\`\`\`math
\\sum_{n=1}^{\\infty} n^{-2} = \\frac{\\pi^2}{6}
\`\`\`

\\begin{equation}
x + y = z
\\end{equation}
`);

  assert.match(html, /<h1>Heading<\/h1>/);
  assert.match(html, KATEX_CLASS_PATTERN);
  assert.doesNotMatch(html, /\$`\\sqrt/);
  assert.doesNotMatch(html, /```math/);
});

/**
 * parser leaves ordinary Markdown code fences as code rather than math.
 */
test("parser leaves non-math fenced code blocks intact", async () => {
  const parser = createMarkdownParser();
  const html = await parser.render(`\`\`\`js
const x = 1;
\`\`\`
`);

  assert.match(html, /<pre><code class="language-js">/);
  assert.match(html, /const x = 1;/);
});

/**
 * extractHeadingTokens preserves JupyterLab outline line metadata.
 */
test("extractHeadingTokens returns raw heading text and line numbers", () => {
  const headings = extractHeadingTokens(`# First

Paragraph

## Second

<h3>Third</h3>
`);

  assert.deepEqual(headings, [
    { line: 0, raw: "# First" },
    { line: 4, raw: "## Second" },
    { line: 6, raw: "<h3>Third</h3>" }
  ]);
});
