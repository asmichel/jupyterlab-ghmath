import type { JupyterFrontEnd, JupyterFrontEndPlugin } from "@jupyterlab/application";
import { ILatexTypesetter, IMarkdownParser } from "@jupyterlab/rendermime";

import { installGitHubMathPatch } from "./latexPatch";
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
 * latexPatchPlugin extends the current KaTeX typesetter with GitHub inline spans.
 */
const latexPatchPlugin: JupyterFrontEndPlugin<void> = {
  id: "jupyterlab-ghmath:latex-patch",
  description: "Adds GitHub `$`...`$` inline math handling before KaTeX typesetting.",
  autoStart: true,
  requires: [ILatexTypesetter],
  activate: (_app: JupyterFrontEnd, latexTypesetter: ILatexTypesetter): void => {
    installGitHubMathPatch(latexTypesetter);
  }
};

/**
 * plugins is the JupyterLab prebuilt extension entrypoint.
 */
const plugins: JupyterFrontEndPlugin<unknown>[] = [markdownParserPlugin, latexPatchPlugin];

export default plugins;

