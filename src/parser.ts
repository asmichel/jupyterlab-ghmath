import type { IMarkdownHeadingToken, IMarkdownParser } from "@jupyterlab/rendermime";
import MarkdownIt from "markdown-it";
import type { RenderRule } from "markdown-it/lib/renderer.mjs";
import type Token from "markdown-it/lib/token.mjs";
import texmath from "markdown-it-texmath";

/**
 * TEXMATH_DELIMITERS puts GitHub/GitLab forms before ordinary dollar parsing.
 */
const TEXMATH_DELIMITERS = ["gitlab", "dollars", "brackets", "beg_end"] as const;

/**
 * MATH_PLACEHOLDER_CLASS identifies TeX placeholders that survive sanitization.
 */
export const MATH_PLACEHOLDER_CLASS = "jp-ghmath-math";

/**
 * MATH_INLINE_CLASS marks placeholders that should render with inline KaTeX.
 */
export const MATH_INLINE_CLASS = "jp-ghmath-inline";

/**
 * MATH_DISPLAY_CLASS marks placeholders that should render with display KaTeX.
 */
export const MATH_DISPLAY_CLASS = "jp-ghmath-display";

/**
 * MATH_PLACEHOLDER_SELECTOR finds sanitizer-safe math placeholders in rendered HTML.
 */
export const MATH_PLACEHOLDER_SELECTOR = `.${MATH_PLACEHOLDER_CLASS}`;

/**
 * HEADING_TAG_REGEX detects raw HTML heading blocks for outline metadata.
 */
const HEADING_TAG_REGEX = /^<h[1-6]\b[^>]*>/i;

/**
 * PLACEHOLDER_TEXMATH_ENGINE prevents markdown-it-texmath from loading KaTeX.
 */
const PLACEHOLDER_TEXMATH_ENGINE = {
  renderToString: (tex: string, options: { displayMode?: boolean } = {}): string => {
    return renderMathPlaceholderHTML(tex, options.displayMode === true);
  }
};

/**
 * createMarkdownIt constructs the markdown-it parser used by JupyterLab services.
 *
 * @returns A configured markdown-it parser that emits sanitizer-safe math placeholders.
 */
export function createMarkdownIt(): MarkdownIt {
  const markdownIt = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: false
  });

  markdownIt.use(texmath, {
    delimiters: [...TEXMATH_DELIMITERS],
    engine: PLACEHOLDER_TEXMATH_ENGINE,
    katexOptions: {
      throwOnError: false
    }
  });
  installMathPlaceholderRenderers(markdownIt);

  return markdownIt;
}

/**
 * createMarkdownParser returns the IMarkdownParser service for JupyterLab rendermime.
 *
 * @returns A parser that renders Markdown and exposes heading token metadata.
 */
export function createMarkdownParser(): IMarkdownParser {
  const markdownIt = createMarkdownIt();

  return {
    render: async (source: string): Promise<string> => {
      return markdownIt.render(source);
    },
    getHeadingTokens: async (source: string): Promise<IMarkdownHeadingToken[]> => {
      return extractHeadingTokens(source, markdownIt);
    }
  };
}

/**
 * extractHeadingTokens reads markdown-it token maps into JupyterLab heading metadata.
 *
 * @param source - The Markdown source string being parsed.
 * @param markdownIt - The parser instance used to tokenize source.
 * @returns Heading raw text and 0-based line numbers for JupyterLab outline features.
 */
export function extractHeadingTokens(
  source: string,
  markdownIt: MarkdownIt = createMarkdownIt()
): IMarkdownHeadingToken[] {
  const lines = source.split(/\r\n?|\n/);
  const tokens = markdownIt.parse(source, {});
  const headings: IMarkdownHeadingToken[] = [];

  for (const token of tokens) {
    if (token.type === "heading_open" && token.map) {
      headings.push(rawHeadingFromMap(lines, token.map));
      continue;
    }

    if (token.map && token.type === "html_block" && HEADING_TAG_REGEX.test(token.content.trimStart())) {
      headings.push(rawHeadingFromMap(lines, token.map));
      continue;
    }

    if (token.map && token.type === "inline" && containsInlineHeading(token)) {
      headings.push(rawHeadingFromMap(lines, token.map));
    }
  }

  return headings;
}

/**
 * renderMathPlaceholderHTML serializes a TeX token as sanitizer-safe HTML.
 *
 * @param tex - The TeX source parsed by markdown-it-texmath.
 * @param display - Whether the placeholder should render in display mode.
 * @returns A placeholder span whose text content stores tex until post-sanitization rendering.
 */
export function renderMathPlaceholderHTML(tex: string, display: boolean): string {
  const modeClass = display ? MATH_DISPLAY_CLASS : MATH_INLINE_CLASS;
  return `<span class="${MATH_PLACEHOLDER_CLASS} ${modeClass}">${escapeHtml(tex)}</span>`;
}

/**
 * installMathPlaceholderRenderers overrides texmath render rules with placeholders.
 *
 * @param markdownIt - The parser whose math token renderers should be replaced.
 */
function installMathPlaceholderRenderers(markdownIt: MarkdownIt): void {
  const inlineRule: RenderRule = (tokens, index) => {
    return renderMathPlaceholderHTML(tokens[index].content, false);
  };
  const inlineDisplayRule: RenderRule = (tokens, index) => {
    return renderMathPlaceholderHTML(tokens[index].content, true);
  };
  const blockRule: RenderRule = (tokens, index) => {
    return `<section>${renderMathPlaceholderHTML(tokens[index].content, true)}</section>\n`;
  };
  const blockWithEquationNumberRule: RenderRule = (tokens, index) => {
    const token = tokens[index];
    return `<section class="eqno">${renderMathPlaceholderHTML(token.content, true)}<span>(${escapeHtml(
      token.info
    )})</span></section>\n`;
  };

  markdownIt.renderer.rules.math_inline = inlineRule;
  markdownIt.renderer.rules.math_inline_double = inlineDisplayRule;
  markdownIt.renderer.rules.math_block = blockRule;
  markdownIt.renderer.rules.math_block_eqno = blockWithEquationNumberRule;
}

/**
 * escapeHtml encodes TeX text for placeholder element content.
 *
 * @param text - The raw TeX or equation-number text to encode.
 * @returns HTML-safe text that decodes back through textContent.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * rawHeadingFromMap converts a markdown-it source map to JupyterLab heading metadata.
 *
 * @param lines - Source split into logical Markdown lines.
 * @param map - The markdown-it start and end line range.
 * @returns Heading metadata with raw Markdown text.
 */
function rawHeadingFromMap(lines: string[], map: [number, number]): IMarkdownHeadingToken {
  return {
    line: map[0],
    raw: lines.slice(map[0], map[1]).join("\n")
  };
}

/**
 * containsInlineHeading detects inline HTML heading tags inside paragraph tokens.
 *
 * @param token - The markdown-it token whose children may contain inline HTML.
 * @returns True when token contains an HTML heading tag.
 */
function containsInlineHeading(token: Token): boolean {
  return (
    token.children?.some(child => {
      return child.type === "html_inline" && HEADING_TAG_REGEX.test(child.content.trimStart());
    }) ?? false
  );
}
