/**
 * The markdown-it-texmath module declaration describes the untyped CommonJS plugin.
 */
declare module "markdown-it-texmath" {
  import type MarkdownIt from "markdown-it";
  import type * as Katex from "katex";

  /**
   * TexmathDelimiter is a delimiter mode accepted by markdown-it-texmath.
   */
  type TexmathDelimiter =
    | "dollars"
    | "brackets"
    | "doxygen"
    | "gitlab"
    | "julia"
    | "kramdown"
    | "beg_end";

  /**
   * TexmathOptions configures delimiter handling and the KaTeX renderer.
   */
  export interface TexmathOptions {
    /**
     * delimiters selects the markdown-it-texmath delimiter grammars to merge.
     */
    delimiters?: TexmathDelimiter | TexmathDelimiter[];

    /**
     * engine is the KaTeX-compatible renderer object used by markdown-it-texmath.
     */
    engine?: typeof Katex;

    /**
     * katexOptions are forwarded to KaTeX renderToString calls.
     */
    katexOptions?: Katex.KatexOptions;

    /**
     * macros are forwarded to KaTeX for backwards compatibility with texmath.
     */
    macros?: Katex.KatexOptions["macros"];

    /**
     * outerSpace asks dollar inline parsing to require surrounding whitespace.
     */
    outerSpace?: boolean;
  }

  /**
   * texmath registers inline and block math rules on a MarkdownIt parser.
   */
  export default function texmath(
    markdownIt: MarkdownIt,
    options?: TexmathOptions
  ): void;
}
