# UI components — shadcn/ui (Base UI) + Animate UI

The UI layer is **shadcn/ui on Base UI** (`components.json`: style `base-nova`), with
**Animate UI** animating the primitives under it. HeroUI was removed: don't bring it (or
NextUI) back, and don't write its API (`onPress`, `isDisabled`, `Key` / `Selection`,
compound `Modal.Backdrop`) from memory.

## How the pieces fit

- `@base-ui/react`: headless primitives (Dialog, Menu, Select, …). **Not Radix**: there is
  no `asChild`; a part renders as another element through `render={<Link href='…' />}` (or
  `render={(props) => <a {...props} />}`).
- shadcn/ui: styled components copied into `src/components/ui/<name>.tsx`. They are
  project code: restyle them freely, but add new ones with the CLI, never by hand or from
  memory.
- `@animate-ui/react`: animated versions of the Base UI primitives with exactly their API,
  built on `motion`. Its CLI swaps a shadcn file's primitive import
  (`@base-ui/react/dialog` → `@animate-ui/react/primitives/base-ui/dialog`) and strips the
  `tw-animate-css` classes it replaces.

Docs: `https://ui.shadcn.com/docs/components/<name>` (Base UI variant),
`https://base-ui.com/react/components/<name>`, `https://animate-ui.com/docs` (full index:
`https://animate-ui.com/llms.txt`). MCP: `shadcn` in `.mcp.json`.

## Adding a component

```sh
bunx --bun shadcn@latest add <name>
sed -i 's#from "cn"#from "@/libs/utils"#' src/components/ui/*.tsx
bunx --bun @animate-ui/cli@latest animate <name> --dry-run   # review, then run without --dry-run
bunx prettier --write src/components/ui/<name>.tsx
```

- **The `sed` is required.** shadcn v4 imports `cn` from the `cn` npm package and ignores
  the `utils` alias. The project keeps one class merger: `@/libs/utils` exports `cn` as an
  alias of `cls`. Don't install `cn`. Project code writes `cls`; `cn` is only for the
  generated components.
- Run `animate` after every `add`. `bunx --bun @animate-ui/cli@latest audit` lists what is
  still unanimated. Pagination, Badge, Input and the other static parts have no animation;
  that's expected.
- Animate UI extras (animated Hugeicons, buttons, backgrounds) come from its registry:
  `bunx --bun shadcn@latest add @animate-ui/<name>`.
- A component that brings `cssVars` gets them appended to `globals.css`. Move them into
  the token block in `theme.css`.
- A generated component that calls Base UI's `useRender` (it uses `useRef`) needs
  `"use client"` to render in a Server Component; `badge.tsx` and `breadcrumb.tsx` have
  it. `buttonVariants` stays callable on the server (`button.tsx` has no directive);
  `badgeVariants` doesn't.
- shadcn's `drawer` is a bottom sheet (Vaul-style). A side panel is `sheet`. Don't add
  `drawer.tsx` while `components/ui/drawer/` exists: `@/components/ui/drawer` would
  resolve to the new file.

## Installed components

| `components/ui/` file                                          | Used for                                    | Animated |
| -------------------------------------------------------------- | ------------------------------------------- | -------- |
| `button`                                                       | Buttons, and `buttonVariants` for links     | —        |
| `badge`                                                        | Chips on cards (kind, status, genre, audio) | —        |
| `dialog`                                                       | Sign-in modal, `ModalComponent`             | ✓        |
| `alert-dialog`                                                 | Confirmations (Remove from history)         | ✓        |
| `sheet`                                                        | `DrawerComponent` (filter drawer)           | ✓        |
| `dropdown-menu`                                                | Account menu, mobile nav                    | ✓        |
| `select`                                                       | Sort and kind selects                       | ✓        |
| `tooltip`                                                      | Header icon links, truncated breadcrumb     | ✓        |
| `toggle`, `toggle-group`                                       | Tabs and segments, filter tags              | ✓        |
| `checkbox`                                                     | Keep me signed in                           | ✓        |
| `progress`                                                     | Watch progress                              | ✓        |
| `pagination`                                                   | Pager layout                                | —        |
| `field`, `input`, `input-group`, `label`, `textarea`           | Sign-in form, header search                 | —        |
| `spinner`, `kbd`, `alert`, `avatar`, `separator`, `breadcrumb` | As named                                    | —        |

- Button `variant`: `default | outline | secondary | ghost | destructive | link`; `size`:
  `default | xs | sm | lg | icon | icon-xs | icon-sm | icon-lg`.
- The project's own pieces in the same folder: `modal/` (`ModalComponent`), `drawer/`
  (`DrawerComponent`) and `shared.tsx` (`ContentHeader` / `ContentFooter`), the layout of
  form-like panels. Both overlays close only from inside: `disablePointerDismissal`, and
  `onOpenChange` ignores `reason === "escape-key"`.
- Project edits to the generated files (keep them when re-adding one with `--overwrite`):
  - Overlays are `bg-black/60` (the dark design), not shadcn's `bg-black/10`.
    `DialogContent` also takes `overlayClassName`.
  - `button`, `toggle` and `badge` use `transition`, not `transition-all`, which also
    animated width and padding, so a button visibly grew while the page settled. Don't put
    `transition-all` back on anything sized by its content.
  - `SelectItem` highlights with `focus:bg-accent/50`. Animate UI's gliding
    `data-slot="item-highlight"` copies the focused item's background, so that class sets
    its colour.
- Buttons (and `[role=button]`) get `cursor: pointer` from `globals.css`; Tailwind's
  preflight leaves them on the arrow.
- `Tooltip` works without a provider. `TooltipProvider` only shares the open delay between
  neighbouring tooltips: wrap those, not the root layout, despite what the CLI suggests.

## Patterns

- **Open state**: `useOverlayState()` from `@/hooks` gives `isOpen`, `open`, `close`,
  `setOpen`, all stable: `<Dialog open={state.isOpen} onOpenChange={state.setOpen}>`.
- **Triggers** render the project's button:
  `<DropdownMenuTrigger render={<Button variant='ghost' size='icon' />}>`. A tooltip on a
  link: `<TooltipTrigger render={<Link href='…' />}>`; `@/components/link` passes `ref`
  and extra props through for this.
- **A link styled as a button** stays a `Link` with `className={buttonVariants()}`. Don't
  nest a `Button` in a link.
- **Select** shows the raw value unless the root gets `items` (a `Record<value, label>` or
  `{ value, label }[]`). `onValueChange` receives `value | null`.
  `alignItemWithTrigger={false}` opens the list below the trigger instead of over it.
- **ToggleGroup** values are strings: convert numbers with `String()` and map back through
  the options. A single-choice group empties when its pressed item is pressed again; when
  one must stay selected, ignore an empty `onValueChange`. Style the pressed state with
  `aria-pressed:` (add `aria-pressed:hover:` to beat the base `hover:`).
- **Overriding a generated class** works only with the same variant prefix, because
  tailwind-merge replaces a class only within the same variants and anything else loses on
  specificity: `data-[size=default]:h-10` (select height), `dark:bg-…` (fills, since
  `dark:` is always on), `has-[[data-slot=input-group-control]:focus-visible]:…` (input
  group focus), `data-[side=right]:sm:…` (sheet).
- **Icons** in Button, Select, InputGroup and Toggle are resized by the base
  `[&_svg:not([class*='size-'])]:size-4`. For another size give the icon a `size-*` class;
  the `size` prop alone is overridden.
- **Forms**: `register` for `Input` / `InputGroupInput` with `aria-invalid` for the error
  state; `Controller` with `checked` / `onCheckedChange` / `inputRef` for `Checkbox`. Name
  fields with `Field` + `FieldLabel htmlFor` (ids from `useId`) and show errors in
  `FieldError`.
- A prop that is a function (Progress `getAriaValueText`) can't cross from a Server
  Component, so that leaf is a Client Component.
- `PaginationLink` renders an `<a>`. The pager changes page through a callback, so it uses
  `Button`s inside `PaginationItem`.
- `AlertDialog` doesn't close on an outside click, by design; `Esc` and Cancel do.

## Theme

- Tokens live in `src/styles/theme.css`, in the shadcn convention: one dark palette on
  `:root`, mapped to utilities by `@theme inline`. Luminous is dark-only; the `dark:`
  variant is always on (custom variant on `.dark *` in `globals.css`), so don't write
  light styles.
- **Primary is white.** There is no brand hue (the old `--color-theme*` scale is gone).
  Emphasis is `text-primary` / `bg-primary text-primary-foreground`; muted text is zinc or
  `text-muted-foreground`. `text-primary` is barely brighter than `text-foreground`, so a
  hover on white text needs another cue (underline, opacity).
- `accent` is a hover surface (dark grey), not a brand colour. Errors are `destructive`.
  Other utilities: `bg-secondary`, `bg-muted`, `bg-popover`, `bg-card`, `border-border`,
  `bg-input`, `ring-ring`.
- Radius: Tailwind's scale is kept as is; `--radius` equals `--radius-lg`.

## Motion and the player

- Animate UI renders `motion.*` components, not `m.*`, so a page with an animated
  component ships `motion` in its first-load JS. That's accepted for the site chrome;
  check the `bun run build` output when adding one to a new route.
- Animate UI primitives honour `prefers-reduced-motion` themselves
  (`ReducedMotionConfig`); don't wrap them in another `MotionConfig`.
- **Never use Animate UI or shadcn components inside the player (`lmp/`).** LMP wraps
  itself in `<LazyMotion strict>`, which throws on `motion.*`, and it has its own controls
  (see [video-streaming.md](video-streaming.md)).

## Icons

- shadcn components use Hugeicons (`iconLibrary: "hugeicons"` in `components.json`), like
  the rest of the site.
- The player uses `@keyline-icons/react/fill` (`PlayIcon`, `PauseIcon`, …; `size` prop,
  default 24). The only exceptions are the 10-second seek icons, `Backward10sIcon` /
  `Forward10sIcon` in `lmp/icons/`.
