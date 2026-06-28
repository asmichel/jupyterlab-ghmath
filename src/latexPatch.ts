import type { ILatexTypesetter } from "@jupyterlab/rendermime";
import * as katex from "katex";

/**
 * PATCH_MARKER prevents wrapping the same ILatexTypesetter object more than once.
 */
const PATCH_MARKER = Symbol("jupyterlab-ghmath.latexPatch");

/**
 * IGNORED_TAGS mirrors the tags ignored by the installed JupyterLab KaTeX typesetter.
 */
const IGNORED_TAGS = new Set(["script", "noscript", "style", "textarea", "pre", "code"]);

/**
 * BEGIN_PREFIX is the TeX environment marker normalized before the KaTeX pass.
 */
const BEGIN_PREFIX = "\\begin{";

/**
 * PatchedLatexTypesetter is an ILatexTypesetter with a local idempotency marker.
 */
type PatchedLatexTypesetter = ILatexTypesetter & {
  /**
   * PATCH_MARKER records whether installGitHubMathPatch has patched this object.
   */
  [PATCH_MARKER]?: true;
};

/**
 * MathTextPart is one text or math segment split out of a DOM text node.
 */
interface MathTextPart {
  /**
   * content stores plain text or the TeX body to render.
   */
  content: string;

  /**
   * display selects KaTeX display mode for math segments.
   */
  display?: boolean;

  /**
   * kind distinguishes raw text from TeX math.
   */
  kind: "text" | "math";
}

/**
 * LocatedMath records a matched GitHub or TeX environment segment in text.
 */
interface LocatedMath {
  /**
   * content is the TeX string passed to KaTeX.
   */
  content: string;

  /**
   * display selects KaTeX display mode for the matched segment.
   */
  display: boolean;

  /**
   * end is the exclusive offset of the matched source segment.
   */
  end: number;

  /**
   * start is the inclusive offset of the matched source segment.
   */
  start: number;
}

/**
 * installGitHubMathPatch makes an existing KaTeX typesetter understand GitHub math spans.
 *
 * @param latexTypesetter - The JupyterLab LaTeX typesetter service to patch.
 */
export function installGitHubMathPatch(latexTypesetter: ILatexTypesetter): void {
  const patchedTypesetter = latexTypesetter as PatchedLatexTypesetter;
  if (patchedTypesetter[PATCH_MARKER]) {
    return;
  }

  const originalTypeset = latexTypesetter.typeset.bind(latexTypesetter);
  patchedTypesetter.typeset = (host: HTMLElement): void | Promise<void> => {
    renderGitHubMathDelimiters(host);
    return originalTypeset(host);
  };
  patchedTypesetter[PATCH_MARKER] = true;
}

/**
 * renderGitHubMathDelimiters renders delimiters not handled by JupyterLab's KaTeX extension.
 *
 * @param host - The element that will receive the normal JupyterLab KaTeX pass afterward.
 */
export function renderGitHubMathDelimiters(host: HTMLElement): void {
  renderGitHubMathInNode(host);
}

/**
 * renderGitHubMathInNode recursively replaces matching text-node segments with KaTeX spans.
 *
 * @param node - The DOM node being inspected.
 */
function renderGitHubMathInNode(node: Node): void {
  if (node.nodeType === Node.TEXT_NODE) {
    replaceTextNodeMath(node as Text);
    return;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return;
  }

  const element = node as Element;
  if (IGNORED_TAGS.has(element.tagName.toLowerCase())) {
    return;
  }

  for (const child of Array.from(element.childNodes)) {
    renderGitHubMathInNode(child);
  }
}

/**
 * replaceTextNodeMath replaces a text node when it contains GitHub math delimiters.
 *
 * @param node - The text node to split and replace.
 */
function replaceTextNodeMath(node: Text): void {
  const parts = splitMathText(node.textContent ?? "");
  if (parts.every(part => part.kind === "text")) {
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const part of parts) {
    if (part.kind === "text") {
      fragment.appendChild(document.createTextNode(part.content));
      continue;
    }

    fragment.appendChild(renderKatexSpan(part.content, part.display ?? false));
  }

  node.replaceWith(fragment);
}

/**
 * splitMathText separates GitHub inline math and bare TeX environments from text.
 *
 * @param text - The DOM text content to split.
 * @returns Ordered text and math segments.
 */
function splitMathText(text: string): MathTextPart[] {
  const parts: MathTextPart[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    const match = findNextMath(text, cursor);
    if (!match) {
      parts.push({ kind: "text", content: text.slice(cursor) });
      break;
    }

    if (match.start > cursor) {
      parts.push({ kind: "text", content: text.slice(cursor, match.start) });
    }
    parts.push({ kind: "math", content: match.content, display: match.display });
    cursor = match.end;
  }

  if (parts.length === 0) {
    parts.push({ kind: "text", content: "" });
  }

  return parts;
}

/**
 * findNextMath locates the next GitHub inline span or bare TeX environment.
 *
 * @param text - The text being scanned.
 * @param start - The inclusive scan offset.
 * @returns The next matched math segment, if one exists.
 */
function findNextMath(text: string, start: number): LocatedMath | null {
  for (let index = start; index < text.length; index++) {
    const githubMath = findGitHubInlineMath(text, index);
    if (githubMath) {
      return githubMath;
    }

    const beginEndMath = findBeginEndMath(text, index);
    if (beginEndMath) {
      return beginEndMath;
    }
  }

  return null;
}

/**
 * findGitHubInlineMath matches GitHub's `$`...`$` inline syntax.
 *
 * @param text - The text being scanned.
 * @param start - The candidate match offset.
 * @returns The matched inline math segment, if present.
 */
function findGitHubInlineMath(text: string, start: number): LocatedMath | null {
  if (!text.startsWith("$`", start)) {
    return null;
  }

  const end = text.indexOf("`$", start + 2);
  if (end === -1) {
    return null;
  }

  return {
    start,
    end: end + 2,
    content: text.slice(start + 2, end),
    display: false
  };
}

/**
 * findBeginEndMath matches bare `\\begin{env}...\\end{env}` environments.
 *
 * @param text - The text being scanned.
 * @param start - The candidate match offset.
 * @returns The matched display math segment, if present.
 */
function findBeginEndMath(text: string, start: number): LocatedMath | null {
  if (!text.startsWith(BEGIN_PREFIX, start)) {
    return null;
  }

  const environmentEnd = text.indexOf("}", start + BEGIN_PREFIX.length);
  if (environmentEnd === -1) {
    return null;
  }

  const environment = text.slice(start + BEGIN_PREFIX.length, environmentEnd);
  if (!environment) {
    return null;
  }

  const rightDelimiter = `\\end{${environment}}`;
  const end = text.indexOf(rightDelimiter, environmentEnd + 1);
  if (end === -1) {
    return null;
  }

  return {
    start,
    end: end + rightDelimiter.length,
    content: text.slice(start, end + rightDelimiter.length),
    display: true
  };
}

/**
 * renderKatexSpan renders a TeX segment into a detached span.
 *
 * @param content - The TeX source to render.
 * @param display - Whether KaTeX should render in display mode.
 * @returns A span containing rendered KaTeX or the original source on failure.
 */
function renderKatexSpan(content: string, display: boolean): HTMLSpanElement {
  const span = document.createElement("span");
  try {
    katex.render(content, span, {
      displayMode: display,
      throwOnError: false
    });
  } catch {
    span.textContent = content;
  }
  return span;
}

