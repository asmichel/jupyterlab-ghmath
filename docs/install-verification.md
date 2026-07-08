# Install Verification Notes

## Build A Portable Wheel

Build the prebuilt extension wheel once:

```sh
npm run test
npm run build:prod
uvx --from build pyproject-build --wheel
```

The resulting `dist/jupyterlab_ghmath-0.1.0-py3-none-any.whl` is the release
artifact to use on x86_64 and ARM Linux.

## Fresh uv Tool Install

To install a clean JupyterLab tool environment from a release wheel:

```sh
uv tool install 'jupyterlab==4.6.0' \
  --with 'jupyterlab-ghmath @ https://github.com/asmichel/jupyterlab-ghmath/releases/download/v0.1.0/jupyterlab_ghmath-0.1.0-py3-none-any.whl'
jupyter-labextension list
jupyter-lab --version
```

For a local wheel smoke test before publishing the release:

```sh
uvx --from 'jupyterlab==4.6.0' \
  --with ./dist/jupyterlab_ghmath-0.1.0-py3-none-any.whl \
  jupyter-labextension list
```

## Existing uv Tool Install

Use the existing uv-managed JupyterLab Python without reinstalling JupyterLab:

```sh
uv pip install \
  --python "$(uv tool dir)/jupyterlab/bin/python" \
  'jupyterlab-ghmath @ https://github.com/asmichel/jupyterlab-ghmath/releases/download/v0.1.0/jupyterlab_ghmath-0.1.0-py3-none-any.whl'
uv pip check --python "$(uv tool dir)/jupyterlab/bin/python"
jupyter-labextension list
```

For local development from this checkout, keep using:

```sh
uv pip install --dry-run --python /home/asmichel.guest/.local/share/uv/tools/jupyterlab/bin/python /home/asmichel.guest/src/jupyterlab-ghmath
uv pip install --python /home/asmichel.guest/.local/share/uv/tools/jupyterlab/bin/python /home/asmichel.guest/src/jupyterlab-ghmath
uv pip check --python /home/asmichel.guest/.local/share/uv/tools/jupyterlab/bin/python
jupyter-labextension list
```

Open `/home/asmichel.guest/jupyter-ghmath-smoke.md` in JupyterLab Markdown
Preview and confirm that math, headings, links, lists, tables, inline code, and
non-math code fences render correctly.

`jupyter-labextension list` should show `jupyterlab-ghmath` enabled,
`@jupyterlab/markedparser-extension:plugin` disabled, and
`@jupyterlab/katex-extension:plugin` still enabled for non-Markdown LaTeX.
