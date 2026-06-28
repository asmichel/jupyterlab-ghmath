# jupyterlab-ghmath Status

Last checked: 2026-06-28.

## Package Snapshot

- Package name: `jupyterlab-ghmath`
- Version: `0.1.0`
- Repository path: `/home/asmichel.guest/src/jupyterlab-ghmath`
- JupyterLab target: JupyterLab `4.6.0`
- Package type: prebuilt JupyterLab extension
- Main TypeScript entrypoint: `src/index.ts`
- Built JavaScript entrypoint: `lib/index.js`
- Labextension output directory: `jupyterlab_ghmath/labextension`

The package currently provides two JupyterLab plugins:

- `jupyterlab-ghmath:markdown-parser`, which provides `IMarkdownParser`.
- `jupyterlab-ghmath:markdown-renderer`, which registers a custom
  `text/markdown` rendermime factory.

The package no longer provides a local `ILatexTypesetter`.

## Markdown Math Pipeline

Markdown math is parsed by `markdown-it` plus `markdown-it-texmath`, using these
delimiter modes:

- `gitlab`
- `dollars`
- `brackets`
- `beg_end`

The parser emits sanitizer-safe placeholder spans with classes such as
`jp-ghmath-math`, `jp-ghmath-inline`, and `jp-ghmath-display`. It does not emit
full KaTeX HTML before Jupyter sanitizes Markdown.

The custom Markdown renderer then:

1. renders Markdown to placeholder HTML;
2. calls Jupyter's `renderHTML(...)` with `shouldTypeset: false`;
3. renders each sanitized placeholder with `katex.render(...)`;
4. restores Jupyter-compatible heading anchors.

This is intended to avoid Jupyter's default Markdown math preprocessing and to
avoid a DOM text-node delimiter scanner.

## Local JupyterLab Install

The active JupyterLab application directory is:

```text
/home/asmichel.guest/.local/share/uv/tools/jupyterlab/share/jupyter/lab
```

The installed `jupyterlab-ghmath` labextension is located at:

```text
/home/asmichel.guest/.local/share/uv/tools/jupyterlab/share/jupyter/labextensions/jupyterlab-ghmath
```

`jupyter labextension list` currently reports:

- `jupyterlab-ghmath v0.1.0` enabled and OK.
- `jupyterlab_pygments v0.3.0` enabled and OK.
- `@jupyterlab/katex-extension v3.4.0` enabled and OK from
  `jupyterlab-katex`.

Disabled extension plugins currently include:

- `@jupyterlab/markedparser-extension:plugin`
- `@jupyterlab/mathjax-extension:plugin`

The local install no longer disables `@jupyterlab/katex-extension:plugin`, so
Jupyter's KaTeX extension remains available for non-Markdown LaTeX rendering.

## Installed Bundle Check

The installed labextension package metadata points at:

```text
static/remoteEntry.28d8dee41afcd5454e5f.js
```

The installed JavaScript bundle contains `jupyterlab-ghmath:markdown-renderer`
and `jp-ghmath` placeholder handling. The previous stale installed bundle
contained `jupyterlab-ghmath:katex-typesetter`; that old plugin is no longer
present in the installed package.

If JupyterLab still appears to use old behavior in an already-open browser tab,
clear the browser cache for the tab or do a hard reload. The useful network
check is that JupyterLab should load the current `jupyterlab-ghmath` remote
entry and chunk `403...js`, not the old stale `949...js` chunk.

## Source Tree Notes

The sanitizer-safe Markdown renderer rewrite is implemented across these source
files:

- `src/parser.ts`: placeholder-emitting Markdown parser.
- `src/renderer.ts`: custom Markdown renderer and post-sanitization KaTeX
  rendering.
- `src/index.ts`: JupyterLab plugin registration.
- `src/markdown-it-texmath.d.ts`: local type declaration for the texmath
  engine contract.

Removed source/test files:

- `src/katexTypesetter.ts`
- `tests/katexTypesetter.test.ts`

Renderer tests are in:

- `tests/renderer.test.ts`

## Build And Install Commands

Common verification and build commands:

```sh
npm test
npm run build:prod
uv pip check \
  --python /home/asmichel.guest/.local/share/uv/tools/jupyterlab/bin/python
```

Install the current package into the uv-managed JupyterLab tool with:

```sh
uv pip install \
  --python /home/asmichel.guest/.local/share/uv/tools/jupyterlab/bin/python \
  /home/asmichel.guest/src/jupyterlab-ghmath
```
