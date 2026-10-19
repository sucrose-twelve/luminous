# HeroUI v3 — UI components

The UI component library is **HeroUI v3** (`@heroui/react` + `@heroui/styles`, 3.2.x). It is **not** HeroUI v2
and **not** NextUI: v3 was rewritten on React Aria + Tailwind v4 with a compound-component API, so almost
every v2 snippet (from memory or old blog posts) is wrong here. When unsure, check the v3 docs or the
installed types in `node_modules/@heroui/react/dist/components/<name>/` instead of guessing.

- **MCP server (preferred):** `heroui-react` in `.mcp.json` (`@heroui/react-mcp`, v3 only). Before using a
  component you haven't used in this project, call `get_component_docs`; also `list_components`,
  `get_component_source_code`, `get_component_source_styles`, `get_theme_variables`, `get_docs`.
- Docs: `https://heroui.com/docs/react/components/<kebab-name>` (e.g. `button`, `text-field`, `list-box`).
  Getting started: `https://heroui.com/docs/react/getting-started/quick-start`.
- LLM text: `https://heroui.com/react/llms.txt`, `/react/llms-full.txt`, `/react/llms-components.txt`,
  `/react/llms-patterns.txt`.
- v2 docs live at `v2.heroui.com` — never use them.

## Setup (already done)

```css
/* src/styles/globals.css — order matters: tailwindcss first, then HeroUI */
@import "tailwindcss";
@import "@heroui/styles";
```

- **No Provider.** There is no `HeroUIProvider` in v3; don't wrap the app.
- **No Tailwind plugin.** No `heroui()` plugin, no `hero.ts`, no `tailwind.config.js`, no `@heroui/theme`.
- **No per-component packages.** Import everything from `@heroui/react`; variant functions (`buttonVariants`,
  `cardVariants`, …) also come from `@heroui/react` (re-exported from `@heroui/styles`).
- HeroUI components are interactive React Aria components: files that pass `onPress`, render functions, or use
  `useOverlayState` need `"use client"`. Keep them in leaf client components, not in pages.

## v2 → v3: what you will get wrong

| v2 / NextUI (don't write)                                      | v3 (write this)                                                                                    |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `<HeroUIProvider>`, `heroui()` plugin, `@heroui/theme`         | Nothing — just the CSS import                                                                      |
| `onClick` on `Button`                                          | `onPress` (React Aria `PressEvent`)                                                                |
| `isLoading`                                                    | `isPending` + render your own `<Spinner size='sm' color='current' />`                              |
| `color="primary"`, `radius`, `startContent` / `endContent`     | `variant`; icons as children; round with `className`                                               |
| `classNames={{ base, label, … }}`                              | `className` on each compound part (or a BEM override in CSS)                                       |
| `<Input label errorMessage description />`                     | `<TextField>` + `<Label>` + `<Input>` + `<Description>` / `<FieldError>`                           |
| `ModalContent`, `ModalHeader`, `ModalBody`, `useDisclosure`    | `Modal.Backdrop > Modal.Container > Modal.Dialog > Modal.Header/Body/Footer`, `useOverlayState()`  |
| `selectedKeys` / `onSelectionChange` on `Select`               | `value` / `onChange`                                                                               |
| `SelectItem`, `ListboxItem` with `key` as identity             | `ListBox.Item id="…" textValue="…"` (keep React `key` only for list rendering)                     |
| `asChild`                                                      | `render={(domProps) => <el {...domProps} />}`                                                      |
| Divider, Listbox, NumberInput, DateInput, Progress, Text       | Separator, ListBox, NumberField, DateField, ProgressBar, Typography                                |
| Navbar, Image, Spacer, User, Code, Snippet                     | Removed — build with plain elements (`next/image` for images)                                      |
| Tokens `primary`, `primary-50…900`, `content1…4`, `text-small` | `accent` (+ `-soft`, `-hover`), `surface` / `surface-secondary` / `overlay`, normal Tailwind sizes |

Boolean props keep the `is*` prefix: `isDisabled`, `isPending`, `isIconOnly`, `isRequired`, `isInvalid`,
`isReadOnly`, `isOpen`, `isDismissable` (exception: `fullWidth`). Field `onChange` receives the **value**, not
an event.

## Compound components

Use dot notation without `.Root`: `<Card>`, `<Card.Header>`, `<Card.Title>`. For prop types use
`import type { ButtonProps } from "@heroui/react"` or `Button["Props"]`.

```tsx
"use client"

import { Button, Card } from "@heroui/react"

export function ContinueCard({ title, onResume }: Readonly<{ title: string; onResume: () => void }>) {
  return (
    <Card className='w-full max-w-sm'>
      <Card.Header>
        <Card.Title>{title}</Card.Title>
        <Card.Description>Pick up where you left off</Card.Description>
      </Card.Header>
      <Card.Footer>
        <Button variant='primary' onPress={onResume}>
          Resume
        </Button>
      </Card.Footer>
    </Card>
  )
}
```

- **Button** `variant`: `primary | secondary | tertiary | outline | ghost | danger | danger-soft`; `size`:
  `sm | md | lg`. Icon-only: `<Button isIconOnly aria-label='…'><HugeiconsIcon … /></Button>`. Button defaults
  to `w-fit`; use `fullWidth` when needed.
- **Card** `variant`: `transparent | default | secondary | tertiary`. Parts: `Header`, `Title`, `Description`,
  `Content`, `Footer`.

## Modal

```tsx
"use client"

import { Button, Modal, useOverlayState } from "@heroui/react"

export function ConfirmDialog() {
  const state = useOverlayState()

  return (
    <Modal>
      <Button variant='secondary' onPress={state.open}>
        Open
      </Button>
      <Modal.Backdrop isOpen={state.isOpen} onOpenChange={state.setOpen}>
        <Modal.Container size='sm'>
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>Remove from list?</Modal.Heading>
            </Modal.Header>
            <Modal.Body>…</Modal.Body>
            <Modal.Footer>
              <Button slot='close' variant='ghost'>
                Cancel
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  )
}
```

- Uncontrolled: put the trigger `Button` directly inside `<Modal>` and skip `useOverlayState`.
- `Modal.Container`: `size` (`xs | sm | md | lg | cover | full`), `placement`
  (`auto | center | top | bottom`), `scroll` (`inside | outside`). `Modal.Backdrop`: `variant`
  (`opaque | blur | transparent`), `isDismissable`.
- `slot='close'` on a Button inside the dialog closes it. `Modal.Dialog` children may be `({ close }) => …`.
- Also available: `AlertDialog` (confirmations), `Drawer`, `Popover`, `Tooltip`, `Toast`.

## Forms

Fields are composed. They work with react-hook-form through `Controller` (pass `value`, `onChange`, `onBlur`,
`isInvalid`, and render `<FieldError>` with the RHF message) — see
[libraries.md](libraries.md#react-hook-form-v7).

```tsx
import { FieldError, Input, Label, TextField } from "@heroui/react"

;<TextField isRequired isInvalid={!!error} name='email' type='email' value={value} onChange={onChange}>
  <Label>Email</Label>
  <Input placeholder='user@luminous.co' />
  <FieldError>{error?.message}</FieldError>
</TextField>
```

```tsx
import { Label, ListBox, Select } from "@heroui/react"

;<Select placeholder='Sort by' value={sort} onChange={setSort}>
  <Label>Sort</Label>
  <Select.Trigger>
    <Select.Value />
    <Select.Indicator />
  </Select.Trigger>
  <Select.Popover>
    <ListBox>
      <ListBox.Item id='popular' textValue='Popular'>
        Popular
        <ListBox.ItemIndicator />
      </ListBox.Item>
    </ListBox>
  </Select.Popover>
</Select>
```

- `TextArea` replaces `Input` for multi-line. `InputGroup` adds prefix/suffix. `SearchField`, `NumberField`,
  `Checkbox`, `RadioGroup`, `Switch`, `InputOTP` follow the same composed pattern.
- Fields inside a `Surface`/`Card` use `variant='secondary'`.
- Multi-select: `selectionMode='multiple'` on both `Select` and `ListBox`; value is `Key[]`.

## Links and navigation

Navigation goes through the project's `Link` (`@/components/link`, wraps `next/link` and starts the route
loader). To make a link look like a button, style it with the variant function — don't nest a `Button` in a
link or a link in a `Button`:

```tsx
import { buttonVariants } from "@heroui/react"

import { Link } from "@/components/link"

;<Link href='/browse' className={buttonVariants({ variant: "primary" })}>
  Browse
</Link>
```

## Styling and theming

- Style with `className` (merge with `cls()` when conditional). Many parts accept `className` as a function of
  render state. Target states with data attributes: `data-[hovered=true]:`, `data-[pressed=true]:`,
  `data-[focus-visible=true]:`, `data-[invalid=true]:`, `data-[pending=true]:`.
- Global overrides use HeroUI's BEM classes inside `@layer components` (e.g. `.button--primary`,
  `.card__title`, `.modal__dialog`) in `src/styles/` — not `!important`.
- Theme tokens are CSS variables in OKLCH: `--background`, `--foreground`, `--surface`, `--overlay`,
  `--muted`, `--accent` / `--accent-foreground`, `--default`, `--success`, `--warning`, `--danger`,
  `--border`, `--focus`, `--field-*`, `--radius`. Utilities: `bg-surface`, `bg-overlay`, `text-muted`,
  `bg-accent`, `bg-accent-soft`, `bg-field`, `shadow-surface`, `rounded-field`. Override in CSS
  (`:root { --accent: … }`), never with a Tailwind config.
- Dark mode is CSS-driven: HeroUI's dark tokens apply under `.dark` or `[data-theme="dark"]` on `<html>`.
  `style={{ colorScheme: "dark" }}` alone does **not** switch HeroUI to dark. Luminous is dark-only, so set
  the class/attribute statically on `<html>` — don't add `next-themes` or `useTheme` unless asked.
- Icons: use Hugeicons (see [libraries.md](libraries.md#hugeicons)), not `@gravity-ui/icons` or
  `@iconify/react` from the HeroUI docs examples.
- HeroUI no longer depends on framer-motion; animations are CSS. Don't add framer-motion to animate HeroUI
  parts.

## Components available (3.2.x)

| Group       | Components                                                                                                                                                              |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Buttons     | Button, ButtonGroup, CloseButton, ToggleButton, ToggleButtonGroup                                                                                                       |
| Collections | Dropdown, ListBox, Menu, TagGroup                                                                                                                                       |
| Data        | Badge, Chip, Table, EmptyState                                                                                                                                          |
| Date/Time   | Calendar, RangeCalendar, DateField, DatePicker, DateRangePicker, TimeField                                                                                              |
| Feedback    | Alert, Meter, ProgressBar, ProgressCircle, Skeleton, Spinner                                                                                                            |
| Forms       | TextField, Input, InputGroup, InputOTP, TextArea, SearchField, NumberField, Checkbox(Group), RadioGroup, Switch, Slider, Form, Fieldset, Label, Description, FieldError |
| Layout      | Card, Surface, Separator, Toolbar, ScrollShadow                                                                                                                         |
| Media       | Avatar, AvatarGroup                                                                                                                                                     |
| Navigation  | Accordion, Breadcrumbs, Disclosure(Group), Link, Pagination, Tabs                                                                                                       |
| Overlays    | Modal, AlertDialog, Drawer, Popover, Tooltip, Toast                                                                                                                     |
| Pickers     | Select, ComboBox, Autocomplete                                                                                                                                          |
| Typography  | Typography, Kbd                                                                                                                                                         |
| Colors      | ColorArea, ColorField, ColorPicker, ColorSlider, ColorSwatch, ColorSwatchPicker                                                                                         |

Reach for a HeroUI component before hand-building an interactive widget (menus, selects, dialogs, tabs,
tooltips) — it brings keyboard, focus, and screen-reader behavior. Plain layout and media (poster grids, the
video player surface) stay plain elements + Tailwind.
