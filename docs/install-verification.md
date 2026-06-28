# Install Verification Notes

Use the existing uv-managed JupyterLab Python without reinstalling JupyterLab:

```sh
npm run test
npm run build:prod
uv pip install --dry-run --python /home/asmichel.guest/.local/share/uv/tools/jupyterlab/bin/python /home/asmichel.guest/src/jupyterlab-ghmath
uv pip install --python /home/asmichel.guest/.local/share/uv/tools/jupyterlab/bin/python /home/asmichel.guest/src/jupyterlab-ghmath
jupyter labextension list
uv pip check --python /home/asmichel.guest/.local/share/uv/tools/jupyterlab/bin/python
jupyter lab --version
```

Open `/home/asmichel.guest/jupyter-ghmath-smoke.md` in JupyterLab Markdown
Preview and confirm that math, headings, links, lists, tables, inline code, and
non-math code fences render correctly.

`jupyter labextension list` should show `jupyterlab-ghmath` enabled,
`@jupyterlab/markedparser-extension:plugin` disabled, and
`@jupyterlab/katex-extension:plugin` still enabled for non-Markdown LaTeX.
