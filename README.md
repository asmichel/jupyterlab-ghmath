# jupyterlab-ghmath

`jupyterlab-ghmath` is a local JupyterLab 4 prebuilt extension that replaces
JupyterLab's default Markdown parser with a `markdown-it` parser configured for
GitHub-style KaTeX math delimiters.

The parser supports `$...$`, `$$...$$`, `\\(...\\)`, `\\[...\\]`, GitLab-style
`$`...`$` spans, fenced `math` blocks, and `\\begin{...}` environments through
`markdown-it-texmath`.

## Build

```sh
npm install
npm run test
npm run build:prod
```

## Install Into The Existing JupyterLab Tool

```sh
uv pip install --dry-run --python /home/asmichel.guest/.local/share/uv/tools/jupyterlab/bin/python /home/asmichel.guest/src/jupyterlab-ghmath
uv pip install --python /home/asmichel.guest/.local/share/uv/tools/jupyterlab/bin/python /home/asmichel.guest/src/jupyterlab-ghmath
```

## Verify

```sh
jupyter labextension list
uv pip check --python /home/asmichel.guest/.local/share/uv/tools/jupyterlab/bin/python
jupyter lab --version
```

