import type { IMarkdownHeadingToken, IMarkdownParser } from "@jupyterlab/rendermime";
import * as katex from "katex";
import MarkdownIt from "markdown-it";
import type Token from "markdown-it/lib/token.mjs";
import texmath from "markdown-it-texmath";

/**
 * TEXMATH_DELIMITERS covers the GitHub, GitLab, and TeX delimiters needed here.
 */
const TEXMATH_DELIMITERS = ["dollars", "brackets", "gitlab", "beg_end"] as const;

/**
 * HEADING_TAG_REGEX detects raw HTML heading blocks for outline metadata.
 */
const HEADING_TAG_REGEX = /^<h[1-6]\b[^>]*>/i;

/**
 * createMarkdownIt constructs the markdown-it parser used by the JupyterLab token.
 *
 * @returns A configured markdown-it parser with KaTeX math rendering enabled.
 */
export function createMarkdownIt(): MarkdownIt {
  const markdownIt = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: false
  });

  markdownIt.use(texmath, {
    delimiters: [...TEXMATH_DELIMITERS],
    engine: katex,
    katexOptions: {
      throwOnError: false
    }
  });

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

