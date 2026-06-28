import type { JupyterFrontEnd, JupyterFrontEndPlugin } from "@jupyterlab/application";
import { ILatexTypesetter, IMarkdownParser } from "@jupyterlab/rendermime";

import { createKatexTypesetter } from "./katexTypesetter";
import { createMarkdownParser } from "./parser";

import "../style/index.css";

/**
 * markdownParserPlugin replaces JupyterLab's default Markdown parser service.
 */
const markdownParserPlugin: JupyterFrontEndPlugin<IMarkdownParser> = {
  id: "jupyterlab-ghmath:markdown-parser",
  description: "Provides a Markdown parser with GitHub-style KaTeX math delimiters.",
  autoStart: true,
  provides: IMarkdownParser,
  activate: (_app: JupyterFrontEnd): IMarkdownParser => {
    return createMarkdownParser();
  }
};

/**
 * katexTypesetterPlugin provides the KaTeX typesetter with GitHub delimiter support.
 */
const katexTypesetterPlugin: JupyterFrontEndPlugin<ILatexTypesetter> = {
  id: "jupyterlab-ghmath:katex-typesetter",
  description: "Provides a KaTeX typesetter with GitHub `$`...`$` inline math support.",
  autoStart: true,
  provides: ILatexTypesetter,
  activate: (_app: JupyterFrontEnd): ILatexTypesetter => {
    return createKatexTypesetter();
  }
};

/**
 * plugins is the JupyterLab prebuilt extension entrypoint.
 */
const plugins: JupyterFrontEndPlugin<unknown>[] = [markdownParserPlugin, katexTypesetterPlugin];

export default plugins;
