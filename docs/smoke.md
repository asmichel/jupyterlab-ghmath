# jupyterlab-ghmath Smoke Fixture

Inline dollar math: $E = mc^2$.

Display dollar math:

$$
\int_0^1 x^2\,dx = \frac{1}{3}
$$

Bracket inline math: \(a^2+b^2=c^2\).

Bracket display math:

\[
e^{i\pi}+1=0
\]

GitHub inline math: $`\sqrt{3x-1}`$.

Fenced math:

```math
\sum_{n=1}^{\infty} n^{-2} = \frac{\pi^2}{6}
```

Begin-end math:

\begin{equation}
x + y = z
\end{equation}

## Normal Markdown

- A list item with `inline code`.
- A [JupyterLab link](https://jupyterlab.readthedocs.io/).

| Syntax | Expected |
| --- | --- |
| table | still renders |

```python
print("not math")
```

