import type { ILatexTypesetter } from "@jupyterlab/rendermime";
import * as katex from "katex";

/**
 * IGNORED_TAGS are DOM element names whose text must not be parsed as math.
 */
const IGNORED_TAGS = new Set(["script", "noscript", "style", "textarea", "pre", "code"]);

/**
 * IGNORED_CLASSES are KaTeX-owned elements that should not be rendered again.
 */
const IGNORED_CLASSES = new Set(["katex", "katex-display"]);

/**
 * BEGIN_PREFIX is the TeX environment marker handled as display math.
 */
const BEGIN_PREFIX = "\\begin{";

/**
 * DEFAULT_KATEX_OPTIONS are the local defaults for JupyterLab Markdown math rendering.
 */
const DEFAULT_KATEX_OPTIONS: katex.KatexOptions = {
  errorColor: "#CC0000",
  throwOnError: false
};

/**
 * MathDelimiter describes a non-environment text delimiter pair.
 */
interface MathDelimiter {
  /**
   * display selects KaTeX display mode for this delimiter.
   */
  display: boolean;

  /**
   * left is the opening delimiter to match.
   */
  left: string;

  /**
   * right is the closing delimiter to match.
   */
  right: string;
}

/**
 * MATH_DELIMITERS is ordered so specific forms win before ordinary dollars.
 */
const MATH_DELIMITERS: MathDelimiter[] = [
  { left: "$`", right: "`$", display: false },
  { left: "$$", right: "$$", display: true },
  { left: "\\[", right: "\\]", display: true },
  { left: "\\(", right: "\\)", display: false },
  { left: "$", right: "$", display: false }
];

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
 * LocatedMath records a matched math segment in text.
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
 * GitHubKatexTypesetter renders Markdown math text nodes with KaTeX.
 */
export class GitHubKatexTypesetter implements ILatexTypesetter {
  /**
   * options are forwarded to KaTeX for each rendered math segment.
   */
  private readonly options: katex.KatexOptions;

  /**
   * constructor stores the KaTeX options used for all future typeset calls.
   *
   * @param options - KaTeX options merged over DEFAULT_KATEX_OPTIONS.
   */
  constructor(options: katex.KatexOptions = {}) {
    this.options = { ...DEFAULT_KATEX_OPTIONS, ...options };
  }

  /**
   * typeset renders math delimiters inside host and returns synchronously.
   *
   * @param host - The rendered Markdown host element from JupyterLab.
   */
  typeset(host: HTMLElement): void {
    renderKatexMath(host, this.options);
  }
}

/**
 * createKatexTypesetter creates the ILatexTypesetter service for JupyterLab.
 *
 * @param options - KaTeX options merged over DEFAULT_KATEX_OPTIONS.
 * @returns A KaTeX-backed JupyterLab LaTeX typesetter.
 */
export function createKatexTypesetter(options: katex.KatexOptions = {}): ILatexTypesetter {
  return new GitHubKatexTypesetter(options);
}

/**
 * renderKatexMath recursively renders supported math delimiters in host.
 *
 * @param host - The element whose text nodes are scanned.
 * @param options - KaTeX options used for each render call.
 */
export function renderKatexMath(host: HTMLElement, options: katex.KatexOptions = {}): void {
  renderKatexInNode(host, { ...DEFAULT_KATEX_OPTIONS, ...options });
}

/**
 * renderKatexInNode recursively replaces matching text-node segments with KaTeX spans.
 *
 * @param node - The DOM node being inspected.
 * @param options - KaTeX options used for each render call.
 */
function renderKatexInNode(node: Node, options: katex.KatexOptions): void {
  if (node.nodeType === Node.TEXT_NODE) {
    replaceTextNodeMath(node as Text, options);
    return;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return;
  }

  const element = node as Element;
  if (shouldIgnoreElement(element)) {
    return;
  }

  for (const child of Array.from(element.childNodes)) {
    renderKatexInNode(child, options);
  }
}

/**
 * shouldIgnoreElement identifies DOM subtrees that should not be math-rendered.
 *
 * @param element - The DOM element being checked.
 * @returns True when the element subtree should be skipped.
 */
function shouldIgnoreElement(element: Element): boolean {
  if (IGNORED_TAGS.has(element.tagName.toLowerCase())) {
    return true;
  }

  return Array.from(IGNORED_CLASSES).some(className => {
    return element.classList.contains(className);
  });
}

/**
 * replaceTextNodeMath replaces a text node when it contains supported math delimiters.
 *
 * @param node - The text node to split and replace.
 * @param options - KaTeX options used for each render call.
 */
function replaceTextNodeMath(node: Text, options: katex.KatexOptions): void {
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

    fragment.appendChild(renderKatexSpan(part.content, part.display ?? false, options));
  }

  node.replaceWith(fragment);
}

/**
 * splitMathText separates supported math delimiters from ordinary text.
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
 * findNextMath locates the next supported math segment.
 *
 * @param text - The text being scanned.
 * @param start - The inclusive scan offset.
 * @returns The next matched math segment, if one exists.
 */
function findNextMath(text: string, start: number): LocatedMath | null {
  for (let index = start; index < text.length; index++) {
    const delimitedMath = findDelimitedMath(text, index);
    if (delimitedMath) {
      return delimitedMath;
    }

    const beginEndMath = findBeginEndMath(text, index);
    if (beginEndMath) {
      return beginEndMath;
    }
  }

  return null;
}

/**
 * findDelimitedMath matches the ordered delimiter list at start.
 *
 * @param text - The text being scanned.
 * @param start - The candidate match offset.
 * @returns The matched math segment, if present.
 */
function findDelimitedMath(text: string, start: number): LocatedMath | null {
  for (const delimiter of MATH_DELIMITERS) {
    if (!text.startsWith(delimiter.left, start)) {
      continue;
    }

    const contentStart = start + delimiter.left.length;
    const end = text.indexOf(delimiter.right, contentStart);
    if (end === -1) {
      continue;
    }

    return {
      start,
      end: end + delimiter.right.length,
      content: text.slice(contentStart, end),
      display: delimiter.display
    };
  }

  return null;
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
 * @param options - KaTeX options used for the render call.
 * @returns A span containing rendered KaTeX or the original source on failure.
 */
function renderKatexSpan(
  content: string,
  display: boolean,
  options: katex.KatexOptions
): HTMLSpanElement {
  const span = document.createElement("span");
  try {
    katex.render(content, span, {
      ...options,
      displayMode: display
    });
  } catch {
    span.textContent = content;
  }
  return span;
}

