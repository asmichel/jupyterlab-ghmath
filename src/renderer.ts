import type { IRenderMime } from "@jupyterlab/rendermime";
import { renderHTML, renderMarkdown } from "@jupyterlab/rendermime/lib/renderers.js";
import { RenderedHTMLCommon } from "@jupyterlab/rendermime/lib/widgets.js";
import * as katex from "katex";
import type MarkdownIt from "markdown-it";

import {
  createMarkdownIt,
  MATH_DISPLAY_CLASS,
  MATH_PLACEHOLDER_SELECTOR
} from "./parser";

/**
 * DEFAULT_KATEX_OPTIONS are used when rendering sanitized Markdown placeholders.
 */
const DEFAULT_KATEX_OPTIONS: katex.KatexOptions = {
  errorColor: "#CC0000",
  throwOnError: false
};

/**
 * HEADER_TAG_NAMES are the Markdown heading elements that receive Jupyter anchors.
 */
const HEADER_TAG_NAMES = ["h1", "h2", "h3", "h4", "h5", "h6"] as const;

/**
 * RenderSanitizedMarkdownOptions configures the sanitizer-safe Markdown render path.
 */
export interface RenderSanitizedMarkdownOptions {
  /**
   * host receives sanitized HTML and post-sanitization KaTeX output.
   */
  host: HTMLElement;

  /**
   * source is the raw Markdown text from the mime model.
   */
  source: string;

  /**
   * trusted controls whether Jupyter's sanitizer is applied by renderHTML.
   */
  trusted: boolean;

  /**
   * sanitizer is Jupyter's active HTML sanitizer service.
   */
  sanitizer: IRenderMime.ISanitizer;

  /**
   * resolver rewrites local URLs after sanitized HTML insertion.
   */
  resolver: IRenderMime.IResolver | null;

  /**
   * linkHandler handles local path anchors after sanitized HTML insertion.
   */
  linkHandler: IRenderMime.ILinkHandler | null;

  /**
   * markdownIt parses Markdown and math delimiters into placeholder HTML.
   */
  markdownIt?: MarkdownIt;

  /**
   * katexOptions are merged over DEFAULT_KATEX_OPTIONS for placeholder rendering.
   */
  katexOptions?: katex.KatexOptions;

  /**
   * translator is forwarded to Jupyter's renderHTML messages.
   */
  translator?: IRenderMime.IRendererOptions["translator"];
}

/**
 * githubMarkdownRendererFactory replaces Jupyter's default text/markdown renderer.
 */
export const githubMarkdownRendererFactory: IRenderMime.IRendererFactory = {
  safe: true,
  mimeTypes: ["text/markdown"],
  defaultRank: 40,
  createRenderer: options => new GitHubMarkdownRenderer(options)
};

/**
 * GitHubMarkdownRenderer renders Markdown math through sanitizer-safe placeholders.
 */
export class GitHubMarkdownRenderer extends RenderedHTMLCommon {
  /**
   * markdownIt parses Markdown and math delimiters for each model render.
   */
  private readonly markdownIt: MarkdownIt;

  /**
   * katexOptions are forwarded to KaTeX after sanitizer insertion.
   */
  private readonly katexOptions: katex.KatexOptions;

  /**
   * constructor stores parser and KaTeX options for future renderModel calls.
   *
   * @param options - The Jupyter renderer options supplied by the rendermime registry.
   * @param markdownIt - The Markdown parser to use, primarily for focused tests.
   * @param katexOptions - KaTeX options merged over DEFAULT_KATEX_OPTIONS.
   */
  constructor(
    options: IRenderMime.IRendererOptions,
    markdownIt: MarkdownIt = createMarkdownIt(),
    katexOptions: katex.KatexOptions = {}
  ) {
    super(options);
    this.markdownIt = markdownIt;
    this.katexOptions = { ...DEFAULT_KATEX_OPTIONS, ...katexOptions };
    this.addClass("jp-RenderedMarkdown");
  }

  /**
   * render sends Markdown through renderHTML, then renders math placeholders.
   *
   * @param model - The mime model carrying text/markdown data.
   * @returns A promise that resolves after sanitized HTML and KaTeX are installed.
   */
  render(model: IRenderMime.IMimeModel): Promise<void> {
    return renderSanitizedMarkdown({
      host: this.node,
      source: String(model.data[this.mimeType]),
      trusted: model.trusted,
      sanitizer: this.sanitizer,
      resolver: this.resolver,
      linkHandler: this.linkHandler,
      markdownIt: this.markdownIt,
      katexOptions: this.katexOptions,
      translator: this.translator
    });
  }

  /**
   * renderModel mirrors Jupyter's Markdown renderer content replacement behavior.
   *
   * @param model - The mime model carrying text/markdown data.
   * @returns A promise that resolves after render completes.
   */
  async renderModel(model: IRenderMime.IMimeModel): Promise<void> {
    await super.renderModel(model, true);
  }
}

/**
 * renderSanitizedMarkdown parses Markdown, sanitizes HTML, then renders math.
 *
 * @param options - Render options containing source, sanitizer, and host.
 */
export async function renderSanitizedMarkdown(
  options: RenderSanitizedMarkdownOptions
): Promise<void> {
  const markdownIt = options.markdownIt ?? createMarkdownIt();
  const html = markdownIt.render(options.source);

  await renderHTML({
    host: options.host,
    source: html,
    trusted: options.trusted,
    sanitizer: options.sanitizer,
    resolver: options.resolver,
    linkHandler: options.linkHandler,
    shouldTypeset: false,
    latexTypesetter: null,
    translator: options.translator
  });

  renderPlaceholderMath(options.host, options.katexOptions);
  applyHeaderAnchors(options.host, options.sanitizer.allowNamedProperties ?? false);
}

/**
 * renderPlaceholderMath renders each sanitized placeholder with KaTeX.
 *
 * @param host - The sanitized HTML host containing placeholder elements.
 * @param options - KaTeX options merged over DEFAULT_KATEX_OPTIONS.
 */
export function renderPlaceholderMath(
  host: HTMLElement,
  options: katex.KatexOptions = {}
): void {
  const katexOptions = { ...DEFAULT_KATEX_OPTIONS, ...options };
  const placeholders = Array.from(host.querySelectorAll<HTMLElement>(MATH_PLACEHOLDER_SELECTOR));

  for (const placeholder of placeholders) {
    const tex = placeholder.textContent ?? "";
    const displayMode = placeholder.classList.contains(MATH_DISPLAY_CLASS);
    placeholder.textContent = "";

    try {
      katex.render(tex, placeholder, {
        ...katexOptions,
        displayMode
      });
    } catch {
      placeholder.textContent = tex;
    }
  }
}

/**
 * applyHeaderAnchors adds Jupyter-compatible anchors to rendered Markdown headings.
 *
 * @param host - The rendered Markdown host.
 * @param allowNamedProperties - Whether to use id instead of data-jupyter-id.
 */
function applyHeaderAnchors(host: HTMLElement, allowNamedProperties: boolean): void {
  for (const headerType of HEADER_TAG_NAMES) {
    const headers = host.getElementsByTagName(headerType);
    for (const header of Array.from(headers)) {
      const headerId = renderMarkdown.createHeaderId(header);
      if (allowNamedProperties) {
        header.id = headerId;
      } else {
        header.setAttribute("data-jupyter-id", headerId);
      }

      const anchor = document.createElement("a");
      anchor.target = "_self";
      anchor.textContent = "¶";
      anchor.href = `#${headerId}`;
      anchor.classList.add("jp-InternalAnchorLink");
      header.appendChild(anchor);
    }
  }
}
