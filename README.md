# jupyterlab-ghmath

`jupyterlab-ghmath` is a local JupyterLab 4 prebuilt extension that replaces
JupyterLab's default Markdown parser and Markdown renderer with GitHub-style
math delimiter handling.

The parser supports `$...$`, `$$...$$`, `\\(...\\)`, `\\[...\\]`, GitLab-style
`$`...`$` spans, fenced `math` blocks, and `\\begin{...}` environments through
`markdown-it-texmath`. Markdown math is emitted as sanitizer-safe placeholders
and rendered with KaTeX after Jupyter sanitizes the Markdown HTML.

## Build

```sh
npm install
npm run test
npm run build:prod
uvx --from build pyproject-build --wheel
```

The wheel is pure Python metadata plus prebuilt JupyterLab assets, so the same
`dist/jupyterlab_ghmath-0.1.0-py3-none-any.whl` installs on x86_64 and ARM
Linux.

## Portable Install

After attaching the wheel to a GitHub release, another machine can create a
fresh JupyterLab tool environment with:

```sh
uv tool install 'jupyterlab==4.6.0' \
  --with 'jupyterlab-ghmath @ https://github.com/asmichel/jupyterlab-ghmath/releases/download/v0.1.0/jupyterlab_ghmath-0.1.0-py3-none-any.whl'
```

For a one-shot launch without permanently installing the tool:

```sh
uvx --from 'jupyterlab==4.6.0' \
  --with 'jupyterlab-ghmath @ https://github.com/asmichel/jupyterlab-ghmath/releases/download/v0.1.0/jupyterlab_ghmath-0.1.0-py3-none-any.whl' \
  jupyter-lab
```

If the package is published to PyPI, the persistent install shortens to:

```sh
uv tool install 'jupyterlab==4.6.0' --with 'jupyterlab-ghmath==0.1.0'
```

Installing directly from `git+https://...` is not the same as using the release
wheel unless the source package also builds or commits
`jupyterlab_ghmath/labextension`. Use the wheel URL when the target machine
should not need Node or a frontend build.

## Install Into The Existing JupyterLab Tool

For an existing `uv tool install jupyterlab` environment, install the release
wheel into that tool's Python:

```sh
uv pip install \
  --python "$(uv tool dir)/jupyterlab/bin/python" \
  'jupyterlab-ghmath @ https://github.com/asmichel/jupyterlab-ghmath/releases/download/v0.1.0/jupyterlab_ghmath-0.1.0-py3-none-any.whl'
```

For local development from this checkout, keep using:

```sh
uv pip install --dry-run --python /home/asmichel.guest/.local/share/uv/tools/jupyterlab/bin/python /home/asmichel.guest/src/jupyterlab-ghmath
uv pip install --python /home/asmichel.guest/.local/share/uv/tools/jupyterlab/bin/python /home/asmichel.guest/src/jupyterlab-ghmath
```

## Verify

```sh
jupyter-labextension list
uv pip check --python /home/asmichel.guest/.local/share/uv/tools/jupyterlab/bin/python
jupyter-lab --version
```
