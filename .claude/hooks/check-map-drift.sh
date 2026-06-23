#!/usr/bin/env bash
# Stop hook: warn when files were added/renamed/deleted under app|lib|components
# but CLAUDE.md (the navigation map) wasn't updated in the same working tree.
# Loop-breaker: once CLAUDE.md shows up in `git status`, this stays silent.
cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || exit 0
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || exit 0

status="$(git status --porcelain 2>/dev/null)"
[ -z "$status" ] && exit 0

# CLAUDE.md already touched? -> map is being maintained, say nothing.
echo "$status" | grep -q 'CLAUDE\.md' && exit 0

# Structural change = index/worktree code A(dd) D(el) R(ename) C(opy) or untracked (??),
# path under app/ lib/ components/. Plain modifications (M) are ignored.
drift="$(echo "$status" | grep -E '^(\?\?|.[ADRC]|[ADRC].) ' \
  | sed -E 's/^.{3}//; s/.* -> //' \
  | grep -E '^(app|lib|components)/' | head -5)"
[ -z "$drift" ] && exit 0

files="$(echo "$drift" | paste -sd ', ' -)"
reason="Structural change in the Bloom tree (added/renamed/deleted: ${files}) but CLAUDE.md was not updated. Update the navigation map in CLAUDE.md — the 'Which file do I change?' table and the relevant section — to reflect these file(s), then stop. If the change is intentionally not map-worthy, say so in one line and stop."
printf '{"decision":"block","reason":%s}\n' "$(printf '%s' "$reason" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')"
