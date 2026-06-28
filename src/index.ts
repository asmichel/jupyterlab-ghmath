import type { JupyterFrontEnd, JupyterFrontEndPlugin } from "@jupyterlab/application";
import { IMarkdownParser, IRenderMimeRegistry } from "@jupyterlab/rendermime";

import { createMarkdownParser } from "./parser";
import { githubMarkdownRendererFactory } from "./renderer";

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
 * markdownRendererPlugin registers sanitizer-safe Markdown math rendering.
 */
const markdownRendererPlugin: JupyterFrontEndPlugin<void> = {
  id: "jupyterlab-ghmath:markdown-renderer",
  description: "Renders Markdown math after Jupyter sanitizes placeholder HTML.",
  autoStart: true,
  requires: [IRenderMimeRegistry],
  activate: (_app: JupyterFrontEnd, rendermime: IRenderMimeRegistry): void => {
    rendermime.addFactory(githubMarkdownRendererFactory, githubMarkdownRendererFactory.defaultRank);
  }
};

/**
 * plugins is the JupyterLab prebuilt extension entrypoint.
 */
const plugins: JupyterFrontEndPlugin<unknown>[] = [markdownParserPlugin, markdownRendererPlugin];

export default plugins;
