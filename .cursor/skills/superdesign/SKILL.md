---
name: superdesign
description: >
  Superdesign is a design agent for frontend UI/UX. Use before implementing any UI that requires design thinking. Handles repo init and UI context (.superdesign/init/), design drafts and iterations, design system setup, and component extraction. Requires @superdesign/cli and login. Fetches fresh guidelines from superdesign-skill repo. Commands include create-project, create-design-draft, iterate-design-draft, execute-flow-pages, create-component, update-component, list-components. Use when designing features, pages, flows, or improving existing designs. Triggers on "help me design", "design X", "design system", "improve design".
metadata:
  author: superdesign
  version: "0.0.2"
---

# Superdesign

Superdesign helps (1) find design inspirations/styles and (2) generate/iterate design drafts on an infinite canvas.

## Core scenarios

1. **superdesign init** — Analyze the repo and build UI context to `.superdesign/init/`
2. **Help me design X** (feature/page/flow)
3. **Set design system**
4. **Help me improve design of X**

---

## Init: Repo analysis

When `.superdesign/init/` does not exist or is empty, automatically:

1. Create `.superdesign/init/`
2. Fetch the init prompt:  
   `https://raw.githubusercontent.com/superdesigndev/superdesign-skill/main/skills/superdesign/INIT.md`
3. Follow that prompt to analyze the repo and write context files.

Do not ask the user to do this manually.

---

## Mandatory init files

If `.superdesign/init/` exists, read **all** of these files first before any design task:

| File | Purpose |
|------|---------|
| `components.md` | Shared UI primitives with full source |
| `layouts.md` | Shared layout components (nav, sidebar, header, footer) |
| `routes.md` | Page/route mapping |
| `theme.md` | Design tokens, CSS variables, Tailwind config |
| `pages.md` | Page component dependency trees |
| `extractable-components.md` | Components that can be extracted as reusable DraftComponents |

**When designing for an existing page:** Check `pages.md` for that page’s dependency tree. Pass every file in that tree as `--context-file`. Also include `globals.css`, `tailwind.config`, and `design-system.md`.

---

## CLI: Install and login (required before any command)

Do these steps in order; do not skip.

1. **Check installation**
   ```bash
   superdesign --version
   ```
   - If it fails (not found), install:
     ```bash
     npm install -g @superdesign/cli@latest
     ```

2. **Check login**  
   Run any command (e.g. `superdesign --help`). If you see an auth/login error:
   ```bash
   superdesign login
   ```
   Wait until login completes successfully.

3. Only after login succeeds, run the intended superdesign commands.

Never assume the user is already logged in; verify first.

---

## Command reference

| Command | Purpose |
|---------|--------|
| `superdesign create-project --title "X"` | Set up project |
| `superdesign create-design-draft --project-id <id> --title "Current UI" -p "Faithfully reproduce..." --context-file src/Component.tsx` | Faithful reproduction |
| `superdesign iterate-design-draft --draft-id <id> -p "dark theme" -p "minimal" --mode branch --context-file src/Component.tsx` | Design variations |
| `superdesign execute-flow-pages --draft-id <id> --pages '[...]' --context-file src/Component.tsx` | Extend to more pages |
| `superdesign create-component --project-id <id> --name "NavBar" --html-file /tmp/navbar.html --props '[...]'` | Extract reusable component |
| `superdesign update-component --component-id <id> --html-file /tmp/navbar.html` | Update existing component |
| `superdesign list-components --project-id <id>` | List project components |

Line ranges: `--context-file path:startLine:endLine`

---

## Fresh guidelines (mandatory)

Before acting on design tasks, fetch the current guidelines:

```
https://raw.githubusercontent.com/superdesigndev/superdesign-skill/main/skills/superdesign/SUPERDESIGN.md
```

Follow the instructions in `SUPERDESIGN.md`.
