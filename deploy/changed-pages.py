#!/usr/bin/env python3
"""Print the route of every page that changed between a base commit and HEAD, one per line.

Usage: deploy/changed-pages.py <base-commit>   (run from the repo root; used by deploy/aws-deploy.sh)

A page is a <Route path="/x" element={<X />} /> in frontend/src/App.tsx whose component is imported from
./pages/. It counts as changed when its route is new since the base, or when a file of that page
(frontend/src/pages/X.tsx, or anything under frontend/src/pages/X/) changed. Prints nothing if none did.
"""

import re
import subprocess
import sys

APP = "frontend/src/App.tsx"
IMPORT = re.compile(r"^import (\w+) from '\./pages/([\w/]+)'", re.M)
ROUTE = re.compile(r'<Route path="(/[^"*]*)" element=\{<(\w+)\s*/>\}')


def git(*args: str) -> str:
    return subprocess.run(["git", *args], check=True, capture_output=True, text=True).stdout


def routes(rev: str) -> list[tuple[str, str]]:
    try:
        return ROUTE.findall(git("show", f"{rev}:{APP}"))
    except subprocess.CalledProcessError:
        return []


def main(base: str) -> None:
    app = git("show", f"HEAD:{APP}")
    page_file = {name: f"frontend/src/pages/{path}" for name, path in IMPORT.findall(app)}
    changed = git("diff", "--name-only", base, "HEAD").splitlines()
    old_paths = {path for path, _ in routes(base)}
    for path, component in routes("HEAD"):
        stem = page_file.get(component)
        if stem is None:
            continue
        touched = any(f == f"{stem}.tsx" or f.startswith(f"{stem}/") for f in changed)
        if touched or path not in old_paths:
            print(path)


if __name__ == "__main__":
    main(sys.argv[1])
