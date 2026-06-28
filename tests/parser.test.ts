import assert from "node:assert/strict";
import test from "node:test";

import {
  createMarkdownParser,
  extractHeadingTokens,
  MATH_DISPLAY_CLASS,
  MATH_INLINE_CLASS,
  MATH_PLACEHOLDER_CLASS
} from "../src/parser";

/**
 * MATH_PLACEHOLDER_PATTERN checks that raw parser output contains placeholders.
 */
const MATH_PLACEHOLDER_PATTERN = new RegExp(`class="${MATH_PLACEHOLDER_CLASS}`);

/**
 * parser renders Markdown and math delimiter cases as safe placeholders.
 */
test("parser emits placeholders for supported math delimiters", async () => {
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
  assert.match(html, MATH_PLACEHOLDER_PATTERN);
  assert.match(html, new RegExp(MATH_INLINE_CLASS));
  assert.match(html, new RegExp(MATH_DISPLAY_CLASS));
  assert.doesNotMatch(html, /\$`\\sqrt/);
  assert.doesNotMatch(html, /‘/);
  assert.doesNotMatch(html, /```math/);
  assert.doesNotMatch(html, /<math\b/);
  assert.doesNotMatch(html, /<svg\b/);
  assert.doesNotMatch(html, /class="katex/);
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
 * parser leaves math-looking text inside ordinary code fences untouched.
 */
test("parser does not emit math placeholders inside code fences", async () => {
  const parser = createMarkdownParser();
  const html = await parser.render("```txt\n$x$ and $`y`$\n```\n");

  assert.match(html, /<pre><code class="language-txt">/);
  assert.match(html, /\$x\$/);
  assert.doesNotMatch(html, MATH_PLACEHOLDER_PATTERN);
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
