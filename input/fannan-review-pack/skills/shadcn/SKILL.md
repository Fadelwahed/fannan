---
name: shadcn
description: Manages shadcn components and projects — adding, searching, fixing, debugging, styling, and composing UI, including chat interfaces. Provides project context, component docs, and usage examples. Applies when working with shadcn/ui, component registries, presets, --preset codes, or any project with a components.json file. Also triggers for "shadcn init", "create an app with --preset", "switch to --preset", and for applying an existing DESIGN.md to shadcn/ui only in a project that has components.json. Never writes DESIGN.md.
user-invocable: false
allowed-tools: Read
---

## Fannan local overrides (added at install; these win over anything else in this skill)
- **Desktop only.** Design desktop (1440 wide) only. Never create or adapt mobile or tablet layouts until the project's approver approves the desktop design, per the brief, and the brief's current step allows mobile.
- **Write only to the design-output folder** `/workspace/design-output/<project>/`, and run `readonly-precheck.sh <path> <project>` before every write (mandatory). Never write, edit or run tools inside a project repo. Report problems in source code to the project's engineer; never fix them.
- **Precedence:** project rules > accessibility > DESIGN.md (Google spec) > impeccable > frontend-design > tool defaults. **WCAG 2.2 AA is a floor:** no rule, including a project rule, may lower it.
- **No invented copy, facts or client details.** Copy comes from the project's writer; mark placeholders. Never keep project facts in memory; read the project's files each time.
- **Gates.** Nothing is shared, published, spent, sent, deleted, installed or changed on the system without Fadel's written yes in Fannan's own chat.

> **Local rule: guidance only.** Do not run the shadcn CLI (`npx/pnpm dlx/bunx shadcn ...`) unless Fadel explicitly approves. Use this skill for component conventions, and map DESIGN.md tokens with a layer (`--primary: var(--color-primary)`) without renaming source tokens. Visual choices follow the precedence rule: project rules > accessibility > DESIGN.md > impeccable > frontend-design > shadcn defaults.

# shadcn/ui

A framework for building ui, components and design systems. Components are added as source code to the user's project via the CLI.

> **Fannan: the CLI commands below are reference only. Never run them.** They are pinned to 4.21.5 in case Fadel ever approves the CLI.

## Current Project Context

Read the project's `components.json` with the Read tool (read-only). Do not run any command to get project context. For component docs, read https://ui.shadcn.com/docs/components with web fetch.

## Principles

1. **Use existing components first.** Check the component docs (web fetch) before specifying custom UI.  _(reference only: Fannan never runs this)_
2. **Compose, don't reinvent.** Settings page = Tabs + Card + form controls. Dashboard = Sidebar + Card + Chart + Table.
3. **Use built-in variants before custom styles.** `variant="outline"`, `size="sm"`, etc.
4. **Use semantic colors.** `bg-primary`, `text-muted-foreground` — never raw values like `bg-blue-500`.

## Critical Rules

These rules are **always enforced**. Each links to a file with Incorrect/Correct code pairs.

### Styling & Tailwind → [styling.md](./rules/styling.md)

- **`className` for layout, not styling.** Never override component colors or typography.
- **No `space-x-*` or `space-y-*`.** Use `flex` with `gap-*`. For vertical stacks, `flex flex-col gap-*`.
- **Use `size-*` when width and height are equal.** `size-10` not `w-10 h-10`.
- **Use `truncate` shorthand.** Not `overflow-hidden text-ellipsis whitespace-nowrap`.
- **No manual `dark:` color overrides.** Use semantic tokens (`bg-background`, `text-muted-foreground`).
- **Use `cn()` for conditional classes.** Don't write manual template literal ternaries.
- **No manual `z-index` on overlay components.** Dialog, Sheet, Popover, etc. handle their own stacking.

### Forms & Inputs → [forms.md](./rules/forms.md)

- **Forms use `FieldGroup` + `Field`.** Never use raw `div` with `space-y-*` or `grid gap-*` for form layout.
- **`InputGroup` uses `InputGroupInput`/`InputGroupTextarea`.** Never raw `Input`/`Textarea` inside `InputGroup`.
- **Buttons inside inputs use `InputGroup` + `InputGroupAddon`.**
- **Option sets (2–7 choices) use `ToggleGroup`.** Don't loop `Button` with manual active state.
- **`FieldSet` + `FieldLegend` for grouping related checkboxes/radios.** Don't use a `div` with a heading.
- **Field validation uses `data-invalid` + `aria-invalid`.** `data-invalid` on `Field`, `aria-invalid` on the control. For disabled: `data-disabled` on `Field`, `disabled` on the control.

### Component Structure → [composition.md](./rules/composition.md)

- **Items always inside their Group.** `SelectItem` → `SelectGroup`. `DropdownMenuItem` → `DropdownMenuGroup`. `CommandItem` → `CommandGroup`.
- **Use `asChild` (radix) or `render` (base) for custom triggers.** Check `base` field from `npx shadcn@4.21.5 info`. → [base-vs-radix.md](./rules/base-vs-radix.md)  _(reference only: Fannan never runs this)_
- **Dialog, Sheet, and Drawer always need a Title.** `DialogTitle`, `SheetTitle`, `DrawerTitle` required for accessibility. Use `className="sr-only"` if visually hidden.
- **Use full Card composition.** `CardHeader`/`CardTitle`/`CardDescription`/`CardContent`/`CardFooter`. Don't dump everything in `CardContent`.
- **Button has no `isPending`/`isLoading`.** Compose with `Spinner` + `data-icon` + `disabled`.
- **`TabsTrigger` must be inside `TabsList`.** Never render triggers directly in `Tabs`.
- **`Avatar` always needs `AvatarFallback`.** For when the image fails to load.

### Use Components, Not Custom Markup → [composition.md](./rules/composition.md)

- **Use existing components before custom markup.** Check if a component exists before writing a styled `div`.
- **Callouts use `Alert`.** Don't build custom styled divs.
- **Empty states use `Empty`.** Don't build custom empty state markup.
- **Toast follows the project base.** Use `toast` from the `toast` component for
  Base UI projects. Use `toast()` from `sonner` for Radix and React Aria
  projects.
- **Use `Separator`** instead of `<hr>` or `<div className="border-t">`.
- **Use `Skeleton`** for loading placeholders. No custom `animate-pulse` divs.
- **Use `Badge`** instead of custom styled spans.

### Icons → [icons.md](./rules/icons.md)

- **Icons in `Button` use `data-icon`.** `data-icon="inline-start"` or `data-icon="inline-end"` on the icon.
- **No sizing classes on icons inside components.** Components handle icon sizing via CSS. No `size-4` or `w-4 h-4`.
- **Pass icons as objects, not string keys.** `icon={CheckIcon}`, not a string lookup.

### Chat & Messaging → [chat.md](./rules/chat.md)

- **Chat UI composes the chat primitives.** Conversations use `MessageScroller`, rows use `Message`, surfaces use `Bubble`. Never hand-rolled bubble `div`s or a raw scroll container.
- **`MessageScroller` owns scroll behavior.** Streaming follow, anchoring, and jump-to-latest (`MessageScrollerButton`) are built in. Don't write a `useStickToBottom`/`ResizeObserver` hook.
- **Attachments use `Attachment`; system notes and dividers use `Marker`.** Not `Item` cards or `Separator` + a label.
- **Assistant activity uses `Trace`.** Reasoning, tool calls, sources and steps are `TraceLine`s in a `Trace`, one `Trace` per run of message parts. Behavior wraps the line: `TraceCollapsible`, a sheet trigger or a link. Not a hand-rolled `Collapsible` or a `Marker`.

### CLI

- **Never decode preset codes or build preset URLs manually.** Use `npx shadcn@4.21.5 preset decode <code>`, `preset url <code>`, or `preset open <code>`. For project-aware preset detection, use `npx shadcn@4.21.5 preset resolve`.  _(reference only: Fannan never runs this)_
- **Apply preset codes directly with the CLI.** Use `npx shadcn@4.21.5 apply <code>` for existing projects, or `npx shadcn@4.21.5 init --preset <code>` when initializing.  _(reference only: Fannan never runs this)_

## Key Patterns

These are the most common patterns that differentiate correct shadcn/ui code. For edge cases, see the linked rule files above.

```tsx
// Form layout: FieldGroup + Field, not div + Label.
<FieldGroup>
  <Field>
    <FieldLabel htmlFor="email">Email</FieldLabel>
    <Input id="email" />
  </Field>
</FieldGroup>

// Validation: data-invalid on Field, aria-invalid on the control.
<Field data-invalid>
  <FieldLabel>Email</FieldLabel>
  <Input aria-invalid />
  <FieldDescription>Invalid email.</FieldDescription>
</Field>

// Icons in buttons: data-icon, no sizing classes.
<Button>
  <SearchIcon data-icon="inline-start" />
  Search
</Button>

// Spacing: gap-*, not space-y-*.
<div className="flex flex-col gap-4">  // correct
<div className="space-y-4">           // wrong

// Equal dimensions: size-*, not w-* h-*.
<Avatar className="size-10">   // correct
<Avatar className="w-10 h-10"> // wrong

// Status colors: Badge variants or semantic tokens, not raw colors.
<Badge variant="secondary">+20.1%</Badge>    // correct
<span className="text-emerald-600">+20.1%</span> // wrong
```

## Component Selection

| Need                       | Use                                                                                                 |
| -------------------------- | --------------------------------------------------------------------------------------------------- |
| Button/action              | `Button` with appropriate variant                                                                   |
| Form inputs                | `Input`, `Select`, `Combobox`, `Switch`, `Checkbox`, `RadioGroup`, `Textarea`, `InputOTP`, `Slider` |
| Toggle between 2–5 options | `ToggleGroup` + `ToggleGroupItem`                                                                   |
| Data display               | `Table`, `Card`, `Badge`, `Avatar`                                                                  |
| Navigation                 | `Sidebar`, `NavigationMenu`, `Breadcrumb`, `Tabs`, `Pagination`                                     |
| Overlays                   | `Dialog` (modal), `Sheet` (side panel), `Drawer` (bottom sheet), `AlertDialog` (confirmation)       |
| Feedback                   | `toast` (Base UI), `sonner` (Radix/Aria), `Alert`, `Progress`, `Skeleton`, `Spinner`                 |
| Command palette            | `Command` inside `Dialog`                                                                           |
| Charts                     | `Chart` (wraps Recharts)                                                                            |
| Layout                     | `Card`, `Separator`, `Resizable`, `ScrollArea`, `Accordion`, `Collapsible`                          |
| Empty states               | `Empty`                                                                                             |
| Menus                      | `DropdownMenu`, `ContextMenu`, `Menubar`                                                            |
| Tooltips/info              | `Tooltip`, `HoverCard`, `Popover`                                                                   |
| Chat / conversation UI     | `MessageScroller`, `Message`, `Bubble`, `Attachment`, `Marker`, `Trace`                             |

## Key Fields

The injected project context contains these key fields:

- **`aliases`** → use the actual alias prefix for imports (e.g. `@/`, `~/`), never hardcode.
- **`isRSC`** → when `true`, components using `useState`, `useEffect`, event handlers, or browser APIs need `"use client"` at the top of the file. Always reference this field when advising on the directive.
- **`tailwindVersion`** → `"v4"` uses `@theme inline` blocks; `"v3"` uses `tailwind.config.js`.
- **`tailwindCssFile`** → the global CSS file where custom CSS variables are defined. (Fannan never edits it; it lists token mappings in the handoff spec for the engineer.)
- **`style`** → component visual treatment (e.g. `nova`, `vega`).
- **`base`** → primitive library (`radix` or `base`). Affects component APIs and available props.
- **`iconLibrary`** → determines icon imports. Use `lucide-react` for `lucide`, `@tabler/icons-react` for `tabler`, etc. Never assume `lucide-react`.
- **`resolvedPaths`** → exact file-system destinations for components, utils, hooks, etc.
- **`framework`** → routing and file conventions (e.g. Next.js App Router vs Vite SPA).
- **`packageManager`** → use this for any non-shadcn dependency installs (e.g. `pnpm add date-fns` vs `npm install date-fns`).
- **`preset`** → resolved preset code and values for the current project. Use `npx shadcn@4.21.5 preset resolve --json` when you only need preset information.  _(reference only: Fannan never runs this)_

See [cli.md — `info` command](./cli.md) for the full field reference.

## Component Docs, Examples, and Usage

Run `npx shadcn@4.21.5 docs <component>` to get the URLs for a component's documentation, examples, and API reference. Fetch these URLs to get the actual content.  _(reference only: Fannan never runs this)_

```bash
npx shadcn@4.21.5 docs button dialog select
```

**When specifying a component, read its docs page first (web fetch, no CLI).** This ensures you're working with the correct API and usage patterns rather than guessing.

## Workflow

1. **Get project context** — read `components.json` (Read tool only).
2. **Check installed components first** — before running `add`, always check the `components` list from project context or list the `resolvedPaths.ui` directory. Don't import components that haven't been added, and don't re-add ones already installed.
3. **Find components** — `npx shadcn@4.21.5 search`.  _(reference only: Fannan never runs this)_
4. **Get docs and examples** — run `npx shadcn@4.21.5 docs <component>` to get URLs, then fetch them. Use `npx shadcn@4.21.5 view` to browse registry items you haven't installed. To preview changes to installed components, use `npx shadcn@4.21.5 add --diff`.  _(reference only: Fannan never runs this)_
5. **Install or update** — `npx shadcn@4.21.5 add`. When updating existing components, use `--dry-run` and `--diff` to preview changes first (see [Updating Components](#updating-components) below).  _(reference only: Fannan never runs this)_
6. **Fix imports in third-party components** — After adding components from community registries (e.g. `@bundui`, `@magicui`), check the added non-UI files for hardcoded import paths like `@/components/ui/...`. These won't match the project's actual aliases. Use `npx shadcn@4.21.5 info` to get the correct `ui` alias (e.g. `@workspace/ui/components`) and rewrite the imports accordingly. The CLI rewrites imports for its own UI files, but third-party registry components may use default paths that don't match the project.  _(reference only: Fannan never runs this)_
7. **Review added components** — After adding a component or block from any registry, **always read the added files and verify they are correct**. Check for missing sub-components (e.g. `SelectItem` without `SelectGroup`), missing imports, incorrect composition, or violations of the [Critical Rules](#critical-rules). Also replace any icon imports with the project's `iconLibrary` from the project context (e.g. if the registry item uses `lucide-react` but the project uses `hugeicons`, swap the imports and icon names accordingly). Report all issues in the handoff spec; never edit the files.
8. **Registry must be explicit** — When the user asks to add a block or component, **do not guess the registry**. If no registry is specified (e.g. user says "add a login block" without specifying `@shadcn`, `@tailark`, `owner/repo`, etc.), ask which registry to use. Never default to a registry on behalf of the user.
9. **Switching presets** — Ask the user first: **overwrite**, **partial**, **merge**, or **skip**?
   - **Inspect current preset**: `npx shadcn@4.21.5 preset resolve`. Use `--json` when you need structured values.  _(reference only: Fannan never runs this)_
   - **Inspect incoming preset**: `npx shadcn@4.21.5 preset decode <code>`. Use `preset url <code>` or `preset open <code>` to share or open the preset builder.  _(reference only: Fannan never runs this)_
   - **Overwrite**: `npx shadcn@4.21.5 apply <code>`. Overwrites detected components, fonts, and CSS variables.  _(reference only: Fannan never runs this)_
   - **Partial**: `npx shadcn@4.21.5 apply <code> --only theme,font`. Updates only the selected preset parts without reinstalling UI components. Supported values are `theme` and `font`; comma-separated combinations are allowed. `icon` is intentionally not supported, because icon changes may require full component reinstall and transforms.  _(reference only: Fannan never runs this)_
   - **Merge**: `npx shadcn@4.21.5 init --preset <code> --force --no-reinstall`, then run `npx shadcn@4.21.5 info` to list installed components, then for each installed component use `--dry-run` and `--diff` to [smart merge](#updating-components) it individually.  _(reference only: Fannan never runs this)_
   - **Skip**: `npx shadcn@4.21.5 init --preset <code> --force --no-reinstall`. Only updates config and CSS, leaves components as-is.  _(reference only: Fannan never runs this)_
   - **Important**: Always run preset commands inside the user's project directory. `apply` only works in an existing project with a `components.json` file. The CLI automatically preserves the current base (`base` vs `radix`) from `components.json`. If you must use a scratch/temp directory (e.g. for `--dry-run` comparisons), pass `--base <current-base>` explicitly — preset codes do not encode the base.

## Design Systems from DESIGN.md

When the user asks for a design system from a `DESIGN.md` (or a brand spec), with or without a preset, follow [design-system.md](./design-system.md) end to end:

1. `init --preset <code> --template <vite|next> --name <app> --no-monorepo -y`. Without a preset code, pick the closest style and pass `--base base --preset <style>`. Then `add --all -y`.
2. Read the DESIGN.md frontmatter, Do's and Don'ts, and Known Gaps before editing.
3. Map its tokens onto the shadcn variables in `tailwindCssFile`. Pin the radius scale, shadows, fonts and `type-*` utilities.
4. Restyle components by editing their `cva` variants. Change control heights together.
5. Build the design system page per [design-system-page.md](./design-system-page.md): contrast-checked color roles, type specimens, pinned state matrices, edge cases, do/don't pairs, recipes. Check coverage with `scripts/showcase-coverage.mjs`.
6. Verify in a browser: typecheck, no console errors, loads at the top, no horizontal overflow, dark mode.

## Updating Components

When the user asks to update a component from upstream while keeping their local changes, use `--dry-run` and `--diff` to intelligently merge. **NEVER fetch raw files from GitHub manually — always use the CLI.**

1. Run `npx shadcn@4.21.5 add <component> --dry-run` to see all files that would be affected.  _(reference only: Fannan never runs this)_
2. For each file, run `npx shadcn@4.21.5 add <component> --diff <file>` to see what changed upstream vs local.  _(reference only: Fannan never runs this)_
3. Decide per file based on the diff:
   - No local changes → safe to overwrite.
   - Has local changes → read the local file, analyze the diff, and apply upstream updates while preserving local modifications.
   - User says "just update everything" → use `--overwrite`, but confirm first.
4. **Never use `--overwrite` without the user's explicit approval.**

## Quick Reference

```bash
# Create a new project.
npx shadcn@4.21.5 init --name my-app --preset base-nova
npx shadcn@4.21.5 init --name my-app --preset a2r6bw --template vite

# Create a design system app (then follow design-system.md).
npx shadcn@4.21.5 init --name my-ds --preset b0 --template vite --no-monorepo -y
npx shadcn@4.21.5 init --name my-ds --base base --preset maia --template vite --no-monorepo -y
npx shadcn@4.21.5 add --all -y

# Create a monorepo project.
npx shadcn@4.21.5 init --name my-app --preset base-nova --monorepo
npx shadcn@4.21.5 init --name my-app --preset base-nova --template next --monorepo

# Initialize existing project.
npx shadcn@4.21.5 init --preset base-nova
npx shadcn@4.21.5 init --defaults  # shortcut: --template=next --preset=nova (base style implied)

# Apply a preset to an existing project.
npx shadcn@4.21.5 apply a2r6bw
npx shadcn@4.21.5 apply a2r6bw --only theme
npx shadcn@4.21.5 apply a2r6bw --only font
npx shadcn@4.21.5 apply a2r6bw --only theme,font

# Inspect preset codes and project preset state.
npx shadcn@4.21.5 preset decode a2r6bw
npx shadcn@4.21.5 preset url a2r6bw
npx shadcn@4.21.5 preset open a2r6bw
npx shadcn@4.21.5 preset resolve
npx shadcn@4.21.5 preset resolve --json

# Add components.
npx shadcn@4.21.5 add button card dialog
npx shadcn@4.21.5 add @magicui/shimmer-button
npx shadcn@4.21.5 add owner/repo/item
npx shadcn@4.21.5 add --all

# Preview changes before adding/updating.
npx shadcn@4.21.5 add button --dry-run
npx shadcn@4.21.5 add button --diff button.tsx
npx shadcn@4.21.5 add @acme/form --view button.tsx
npx shadcn@4.21.5 add owner/repo/item --dry-run

# Search registries.
npx shadcn@4.21.5 search @shadcn -q "sidebar"
npx shadcn@4.21.5 search @tailark -q "stats"
npx shadcn@4.21.5 search owner/repo -q "login"
npx shadcn@4.21.5 search                          # all configured registries
npx shadcn@4.21.5 search @shadcn -q "menu" -t ui  # filter by item type

# Get component docs and example URLs.
npx shadcn@4.21.5 docs button dialog select

# View registry item details (for items not yet installed).
npx shadcn@4.21.5 view @shadcn/button
npx shadcn@4.21.5 view owner/repo/item
```

**Named presets:** `nova`, `vega`, `maia`, `lyra`, `mira`, `luma`
**Templates:** `next`, `vite`, `start`, `react-router`, `astro` (all support `--monorepo`) and `laravel` (not supported for monorepo)
**Preset codes:** Version-prefixed base62 strings (e.g. `a2r6bw` or `b0`), from [ui.shadcn.com](https://ui.shadcn.com).

## Detailed References

- [rules/forms.md](./rules/forms.md) — FieldGroup, Field, InputGroup, ToggleGroup, FieldSet, validation states
- [rules/composition.md](./rules/composition.md) — Groups, overlays, Card, Tabs, Avatar, Alert, Empty, Toast, Separator, Skeleton, Badge, Button loading
- [rules/chat.md](./rules/chat.md) — MessageScroller, Message, Bubble, Attachment, Marker, Trace; streaming, anchoring, jump-to-latest, assistant activity rows
- [rules/icons.md](./rules/icons.md) — data-icon, icon sizing, passing icons as objects
- [rules/styling.md](./rules/styling.md) — Semantic colors, variants, className, spacing, size, truncate, dark mode, cn(), z-index
- [rules/base-vs-radix.md](./rules/base-vs-radix.md) — asChild vs render, Select, ToggleGroup, Slider, Accordion
- [cli.md](./cli.md) — Commands, flags, presets, templates
- [registry.md](./registry.md) — Authoring source registries, `include`, item definitions, dependencies, GitHub registry rules
- [customization.md](./customization.md) — Theming, CSS variables, extending components
- [design-system.md](./design-system.md): DESIGN.md (with or without a preset) to a themed app: style picking, token mapping, radius, fonts, type scale, control heights, showcase traps, verification
- [design-system-page.md](./design-system-page.md): What goes on a design system page and how: foundations, component tiers, pinned state matrices, contrast pairs, edge cases, do/don't, recipes
