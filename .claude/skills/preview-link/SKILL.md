---
name: preview-link
description: Push the current branch and give the raw.githack preview links of the pages that changed, so they can be checked on a phone. Use it at the end of any session that changed a page, after the commit.
---

# Preview link

Marco checks the work on his phone, through raw.githack, which serves a
branch of the repository as a website.

## Steps

1. Check the branch name has no `/`: raw.githack can't serve
   `claude/xyz`. If it has one, tell me and propose a name with `_`
   instead (e.g. `page_2_1`); don't rename it without asking.
2. Make sure the checks pass (`npm run check`) and everything is committed.
3. Push the branch: `git push -u origin <branch>`.
4. Find the pages that changed against the branch it started from:
   `git diff --name-only <base>...HEAD`. A change in `shared/` touches
   every page: then give the hub and every page that is `ready: true` in
   `shared/site-map.js`.
5. Give one link per page, in this form:
   `https://raw.githack.com/marcobarb00/astronomy/<branch>/<path>`
   e.g. `https://raw.githack.com/marcobarb00/astronomy/page_2_1/act2-sun/01-uneven-year/index.html`.
   Link to the section that changed when there is one (`#model`).
6. Under the links, one line per page saying what to look at: the
   figure, the section or the control that changed.

## Notes

- raw.githack caches files. If a page looks old right after a push, the
  fix is to wait a minute and reload, not to push again.
- The links work only once the push has gone through. Check with
  `git status -sb` that the branch is not ahead of origin.
