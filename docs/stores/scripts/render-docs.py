#!/usr/bin/env python3
"""
Render every README.md inside docs/stores/ into a sibling HTML wrapper that
loads marked.js (CDN) and applies the Stitch Export purple theme.

Source of truth = the .md files. Regenerate any time:

    python3 docs/stores/scripts/render-docs.py

Handles:
  docs/stores/ChromeWebStore/README.md          → README.html
  docs/stores/ChromeWebStore/STATUS.md          → STATUS.html
  docs/stores/ChromeWebStore/NN-slug/README.md  → NN-slug/index.html
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]  # → stitch-export/
STORES = REPO / "docs/stores"
TREES = [STORES / "ChromeWebStore"]

CSS = r"""
:root {
  --bg: #0b0c10;
  --bg-elev: #15171f;
  --bg-card: #1c1f2a;
  --border: #2a2e3d;
  --text: #e8eaed;
  --muted: #9aa0a6;
  --accent: #8D6A8A;
  --accent-soft: #8D6A8A33;
  --accent-deep: #50384E;
  --accent-hover: #745472;
  --good: #4ade80;
  --warn: #fbbf24;
  --bad: #ef4444;
  --info: #60a5fa;
  --ref: #c084fc;
}
@media (prefers-color-scheme: light) {
  :root {
    --bg: #fafafa;
    --bg-elev: #ffffff;
    --bg-card: #ffffff;
    --border: #e5e7eb;
    --text: #0f172a;
    --muted: #64748b;
    --accent: #8D6A8A;
    --accent-soft: #8D6A8A22;
    --accent-deep: #50384E;
  }
}
* { box-sizing: border-box; }
html, body {
  margin: 0; padding: 0;
  background: var(--bg);
  color: var(--text);
  font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif;
  font-size: 15px;
  line-height: 1.65;
}
a { color: var(--accent); text-decoration: none; }
a:hover { text-decoration: underline; }
.wrap { max-width: 860px; margin: 0 auto; padding: 32px 24px 96px; }
.back {
  display: inline-block;
  margin-bottom: 20px;
  padding: 6px 12px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--bg-elev);
  color: var(--muted);
  font-size: 12px;
  letter-spacing: 0.04em;
}
.back:hover { border-color: var(--accent); color: var(--accent); text-decoration: none; }

article h1 { font-size: 32px; line-height: 1.2; letter-spacing: -0.02em; margin: 24px 0 16px; }
article h2 { font-size: 22px; letter-spacing: -0.01em; margin: 36px 0 12px; padding-bottom: 8px; border-bottom: 1px solid var(--border); }
article h3 { font-size: 17px; margin: 28px 0 10px; color: var(--text); }
article h4 { font-size: 14px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); margin: 24px 0 8px; }

article p { margin: 12px 0; }
article blockquote {
  margin: 16px 0;
  padding: 12px 16px;
  border-left: 3px solid var(--accent);
  background: var(--accent-soft);
  color: var(--text);
  border-radius: 0 8px 8px 0;
}
article blockquote p { margin: 0; }
article ul, article ol { padding-left: 24px; margin: 12px 0; }
article li { margin: 6px 0; }
article hr { border: 0; height: 1px; background: var(--border); margin: 32px 0; }
article code {
  background: var(--bg-elev);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 2px 6px;
  font-family: ui-monospace, "SF Mono", Menlo, monospace;
  font-size: 13px;
}
article pre {
  background: var(--bg-elev);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 14px 16px;
  overflow-x: auto;
  font-size: 13px;
  line-height: 1.5;
}
article pre code {
  background: transparent;
  border: 0;
  padding: 0;
}
article table {
  border-collapse: collapse;
  width: 100%;
  margin: 16px 0;
  font-size: 14px;
}
article thead { background: var(--bg-elev); }
article th, article td {
  text-align: left;
  padding: 10px 12px;
  border: 1px solid var(--border);
  vertical-align: top;
}
article th { font-weight: 600; color: var(--muted); }
article img { max-width: 100%; border-radius: 8px; border: 1px solid var(--border); }
article strong { color: var(--text); }
article input[type=checkbox] { accent-color: var(--accent); margin-right: 6px; }

.meta-foot {
  margin-top: 56px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
  color: var(--muted);
  font-size: 12px;
}
.meta-foot code { background: var(--bg-elev); padding: 2px 6px; border-radius: 4px; }
"""

HTML_TEMPLATE = """<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>{title} · Stitch Export</title>
<style>{css}</style>
</head>
<body>
<div class="wrap">
<a class="back" href="{back_href}">← {back_label}</a>
<article id="content"></article>
<div class="meta-foot">
  Source: <code>{rel_md}</code> · rendered via marked.js CDN
</div>
</div>
<script type="text/markdown" id="md">
{md_safe}
</script>
<script src="https://cdn.jsdelivr.net/npm/marked@12/marked.min.js"></script>
<script>
const raw = document.getElementById('md').textContent;
marked.setOptions({{ gfm: true, breaks: false }});
document.getElementById('content').innerHTML = marked.parse(raw);
// Rewrite <a href="something.md"> → ".html" / "index.html" so links between
// docs continue to work after the static render.
document.querySelectorAll('article a[href$=".md"]').forEach((a) => {{
  const h = a.getAttribute('href');
  if (h.endsWith('README.md')) {{
    a.setAttribute('href', h.replace(/README\\.md$/, 'index.html'));
  }} else {{
    a.setAttribute('href', h.replace(/\\.md$/, '.html'));
  }}
}});
// GitHub-style task list rendering for "- [ ]" / "- [x]" items
document.querySelectorAll('article li').forEach((li) => {{
  const txt = li.firstChild;
  if (txt && txt.nodeType === 3) {{
    const m = txt.nodeValue.match(/^\\s*\\[( |x|X)\\]\\s+(.*)/);
    if (m) {{
      const box = document.createElement('input');
      box.type = 'checkbox'; box.disabled = true; box.checked = m[1].toLowerCase() === 'x';
      txt.nodeValue = ' ' + m[2];
      li.insertBefore(box, txt);
      li.style.listStyleType = 'none';
      li.style.marginLeft = '-20px';
    }}
  }}
}});
</script>
</body>
</html>
"""


def title_of(md_text: str, fallback: str) -> str:
    for line in md_text.splitlines():
        if line.startswith("# "):
            return line[2:].strip()
    return fallback


def safe_markdown(md_text: str) -> str:
    # `<script type="text/markdown">` is just a script tag — the browser
    # parser stops at any literal `</script>`, even inside the embedded
    # markdown. Escape the closing tag the same way HTML5 does.
    return md_text.replace("</script>", "<\\/script>")


def render(md_path: Path, repo: Path) -> Path:
    md = md_path.read_text(encoding="utf-8")
    title = title_of(md, md_path.stem)
    is_phase_readme = (
        md_path.name == "README.md"
        and re.match(r"^\d{2}-", md_path.parent.name)
    )
    if is_phase_readme:
        out = md_path.parent / "index.html"
        back_href = "../index.html"
        back_label = "back to hub"
    elif md_path.name == "README.md":
        out = md_path.parent / "README.html"
        back_href = "index.html"
        back_label = "back to hub"
    else:
        out = md_path.with_suffix(".html")
        back_href = "index.html"
        back_label = "back to hub"

    rel_md = md_path.relative_to(repo).as_posix()
    out.write_text(
        HTML_TEMPLATE.format(
            title=title,
            css=CSS,
            back_href=back_href,
            back_label=back_label,
            rel_md=rel_md,
            md_safe=safe_markdown(md),
        ),
        encoding="utf-8",
    )
    return out


def main() -> int:
    rendered: list[Path] = []
    for tree in TREES:
        if not tree.exists():
            print(f"skip: {tree} (missing)", file=sys.stderr)
            continue
        for md in sorted(tree.rglob("*.md")):
            try:
                out = render(md, REPO)
                rendered.append(out)
            except Exception as e:
                print(f"FAIL: {md} → {e}", file=sys.stderr)
                return 1

    print(f"OK — rendered {len(rendered)} pages")
    for p in rendered:
        print(f"  {p.relative_to(REPO)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
