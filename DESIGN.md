---
name: Exodus for Asuswrt-Merlin
description: A dark Dracula-inspired workspace for choosing proxy devices and managing router configuration.
colors:
  surface: "#282a36"
  surface-raised: "#30323f"
  surface-subtle: "#383b4d"
  text: "#f8f8f2"
  muted: "#b3b1c4"
  line: "#44475a"
  control-line: "#8588a2"
  accent: "#bd93f9"
  accent-hover: "#caa7fc"
  accent-soft: "#3c344f"
  success: "#50fa7b"
  success-soft: "#243c32"
  warning: "#ffb86c"
  warning-soft: "#433a31"
  danger: "#ff7979"
  danger-soft: "#462f38"
  surface-input: "#242631"
  on-accent: "#282a36"
  accent-line: "#9c82bd"
  link: "#8be9fd"
  code: "#ff79c6"
typography:
  headline:
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "24px"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-.025em"
  identity:
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "20px"
    fontWeight: 700
    lineHeight: 1.5
    letterSpacing: "-.02em"
  title:
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "17px"
    fontWeight: 650
    lineHeight: 1.35
    letterSpacing: "-.015em"
  body:
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.5
  action:
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.4
  description:
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
  metadata:
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.5
  code:
    fontFamily: 'ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", monospace'
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.65
rounded:
  badge: "5px"
  navigation: "6px"
  control: "8px"
  panel: "12px"
spacing:
  tight: "4px"
  compact: "8px"
  item: "12px"
  group: "16px"
  inset: "20px"
  section: "24px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    typography: "{typography.action}"
    rounded: "{rounded.control}"
    padding: "8px 14px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
  button-secondary:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.text}"
    typography: "{typography.action}"
    rounded: "{rounded.control}"
    padding: "8px 14px"
  button-destructive:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.on-accent}"
    typography: "{typography.action}"
    rounded: "{rounded.control}"
    padding: "8px 14px"
  input:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "8px 12px"
  navigation-active:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent-hover}"
    typography: "{typography.label}"
    rounded: "{rounded.navigation}"
    padding: "8px 12px"
  panel:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.text}"
    rounded: "{rounded.panel}"
  badge-success:
    backgroundColor: "{colors.success-soft}"
    textColor: "{colors.success}"
    rounded: "{rounded.badge}"
    padding: "3px 8px"
  tag:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent-hover}"
    typography: "{typography.description}"
    rounded: "{rounded.navigation}"
    padding: "2px 8px"
  device-selected:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    padding: "12px"
  draft-toolbar:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent-hover}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "12px 16px"
---

# Design System: Exodus for Asuswrt-Merlin

## Overview

**Creative North Star: "Operations Runbook Workspace"**

Exodus gives router administrators a clear workspace for device selection and configuration. A charcoal canvas, dark task surfaces, ivory text and violet actions organize everyday network work. The firmware still owns the ASUS header, sidebar, VPN navigation and footer; the addon owns the visual system inside its content region.

The shipped desktop interface starts with Service, then Selected, then full-width Networks and Devices discovery panels in that order. Flat task panels, stacked labeled fields and restrained state feedback support dense configuration. Icon-only contextual help opens on hover or keyboard focus. Explicit draft actions keep selection, saving and applying understandable. The addon header carries identity and navigation; service status and version details stay in their relevant panels.

**Key Characteristics:**

- Charcoal canvas and flat dark task surfaces.
- Dracula-purple actions and readable ivory text.
- System UI utility typography and monospace configuration.
- Stacked fields, discoverable lists and wrapping action groups.
- Firmware-owned chrome and addon-scoped styling.
- Explicit drafts, observed service state and recoverable errors.

## Colors

Dracula-inspired dark surfaces carry the content; violet identifies actions and selection, cyan marks links and pink marks inline code. The palette follows the [Dracula reference](https://draculatheme.com/contribute); secondary text and red states are lightened for small-label contrast.

### Primary

- **Dracula Purple** (`accent`): primary buttons, links, checkbox accents and keyboard focus.
- **Lavender Hover** (`accent-hover`): primary hover fills and text on selected dark-violet surfaces.
- **Violet Selection** (`accent-soft`): active navigation, selected devices, tags and the draft toolbar.
- **Cyan** (`link`): text links.
- **Pink** (`code`): inline configuration identifiers.
- **Dark Ink** (`on-accent`): labels on filled primary and destructive actions.

### Neutral

- **Charcoal** (`surface`): the addon canvas, including short, loading and error routes.
- **Raised Charcoal** (`surface-raised`): task panels, fields, device rows and dialogs.
- **Smoky Slate** (`surface-subtle`): disabled controls, neutral badges and loading skeletons.
- **Ivory** (`text`): body content, labels and ordinary field values.
- **Light Lilac Gray** (`muted`): descriptions, metadata and secondary navigation.
- **Soft Divider** (`line`): thin structural boundaries between groups and rows.
- **Control Lilac** (`control-line`): visible input and secondary-action boundaries.

Success, warning and danger pair dark semantic foregrounds with their corresponding dark tinted surfaces. They describe service, validation and destructive states rather than branding.

**The State Color Rule.** Pair status color with readable text; selected, running, warning and error states must remain understandable without color.

## Typography

**Body Font:** System UI, with the platform fallbacks recorded in the frontmatter.
**Code Font:** UI monospace, with SFMono-Regular, Consolas and Liberation Mono fallbacks.

**Character:** Readable administration typography. Headings identify tasks; labels and descriptions explain controls. This is a utility hierarchy, with no separate display-font role.

### Hierarchy

- **Headline:** page task heading.
- **Identity:** the compact Exodus name. Dialog titles share the size with weight (650) and line-height (1.3).
- **Title:** task-panel heading and settings result-group title.
- **Body / Label:** ordinary content and controls share the same system UI family and (14px) size; headings and action emphasis provide hierarchy.
- **Description:** supporting field help, search summaries and editor/log status use the same (13px) role across routes.
- **Metadata:** addresses, profile details and status badges use the same (12px) role across routes.
- **Code:** configuration and log textareas. Inline identifiers use the monospace family while retaining their contextual size.

Descriptions are capped at (70ch); empty-state descriptions at (65ch). Numeric content uses tabular figures. Body text, labels and control values share the system UI family and (14px) size; descriptions and metadata keep their consistent supporting roles throughout the desktop workspace. Headings balance their wrapping, while body paragraphs use pretty wrapping where supported.

**The Utility Type Rule.** Keep task headings, labels and metadata in a readable utility hierarchy; reserve monospace for configuration, paths and technical identifiers.

## Layout

The addon targets the desktop firmware content slot at (740px) and (760px), fills that slot and synchronizes its minimum canvas height with the sidebar and available viewport. Long routes grow naturally. Native form controls and scrollbars use a dark color scheme scoped to Exodus. Its inset uses `clamp(12px, 4%, 24px)`. A mobile layout is outside the current scope. Styling does not reshape the firmware layout.

Fields stack their labels above controls. Task surfaces have header insets (16px 20px 12px), content insets (0 20px 20px), and recurring vertical section spacing. Titles, navigation and action groups wrap; all flexible tracks permit a zero minimum width. Long host names, paths and URLs wrap within their assigned space.

The first route keeps Service above Selected. Selected groups access mode, chosen values and manual address entry in one panel. Networks and Devices occupy consecutive full-width rows below it, with Networks first. Flexible tracks allow long values to wrap within their panel. Desktop dialogs and help popovers stay within the available viewport. Help remains anchored when scrolling a hovered or focused marker into view.

Editable rule tables retain usable columns in their own horizontal scroll region; the rules table has a minimum width of (640px). Device lists have bounded local scrolling (360px), with a shorter list variant (220px). List sections remain flat inside the task panel. The sticky draft toolbar occupies normal document space above the route content and stays near the top (8px) while scrolling.

**The Firmware Boundary Rule.** Scope every Exodus visual selector to its root; preserve firmware-owned header, sidebar, VPN tabs and footer.

## Elevation & Depth

Resting task surfaces are flat dark panels separated from the charcoal canvas by tone and thin borders. Device list sections use headers, row dividers and selected tint inside their task surface. Dialogs and temporary feedback carry elevation; the draft toolbar has only a slight shadow to mark its sticky position.

### Shadow Vocabulary

- **Dialog:** `0 16px 56px rgb(0 0 0 / 36%)`, above a functional viewport scrim (`rgb(0 0 0 / 64%)`).
- **Toast:** `0 6px 24px rgb(0 0 0 / 34%)`, above route content and firmware layers.
- **Sticky Draft:** `0 4px 12px rgb(0 0 0 / 20%)`, for the sticky toolbar only.

**The Flat Work Surface Rule.** Keep ordinary task panels flat and list sections open; reserve shadows for overlays, feedback and the sticky draft toolbar.

## Shapes

Task panels and dialogs use the panel radius. Fields, actions and the draft toolbar use the control radius. Navigation and removable tags use the smaller navigation radius; badges use the badge radius. Thin boundaries (1px), inline SVG icons and circular status dots provide structure and state without ornaments. Device rows remain rectangular within open list sections.

## Components

### Buttons

Clear, comfortably sized actions. Primary actions use violet with dark text; secondary and outline actions use a dark surface with a visible boundary. Destructive actions use danger color. Controls have a desktop minimum size (40px), a stronger label weight and centered text that can wrap. Hover styling applies only to hover-capable devices. Keyboard focus uses a violet outline (3px) with offset (3px). Disabled states use muted text and the subtle surface rather than reduced opacity.

Button color transitions last (140ms) with `ease-out` when reduced motion is not requested. The same preference gates loading-spinner rotation (`exodus-spin 1s linear infinite`). Refresh actions use an arrow icon, disable while pending and expose their busy state. Icon-only actions retain an accessible name and inline SVG.

### Inputs / Fields

Native selects retain browser keyboard behavior. Their chevron is inset 12px from the trailing edge, with 40px reserved for it. Forced colors restores the native arrow.

Dark inset fields with a control-lilac boundary, violet caret and the control radius. Shared field padding and the body role come from the frontmatter. An icon with an accessible name opens contextual help beside the relevant setting on hover or keyboard focus; Escape dismisses it. Invalid fields use the danger boundary with an extra thin outline. Configuration and log textareas resize vertically, retain local overflow and have minimum heights (220px) and (380px) respectively. Read-only textareas use the inset surface (`#242631`). Native checkboxes retain visible checked state.

### Cards / Containers

One flat dark surface groups a task. Header and body spacing establish the hierarchy; footers use a thin divider. Field groups and list sections remain open within that surface. Loading skeletons use the same dark surface and subtle-tone lines.

### Navigation

Six local choices wrap across the available width. The current choice uses lavender text on a dark-violet surface and `aria-current="page"`. Settings tabs use the same type and selected treatment, with an additional selected boundary. Hover and focus remain visible. The firmware VPN navigation stays outside the addon system.

### Chips / Status

Removable selections use dark-violet tags with explicit remove actions. Small status badges pair text with an optional circular state dot. Success, warning and destructive variants use their semantic foreground/surface pair. Alerts include a title and useful explanation; modal dialogs retain contained scrolling, a visible close action and trailing action groups.

### Device List

Service uses 17px headings at weight 650 for Core and Proxy. Core type and version use regular 13px text on separate lines. Proxy status shares the Updates status block: 168px wide, at least 72px tall, with an 8px radius. Core details and Proxy status share their top edge and height; the Proxy column aligns with Autostart.

Selected contains access mode, removable chosen values and manual addresses above discovery. Networks appears first across the full width, followed by Devices. Each panel has its own heading and list. Device rows have a minimum height (56px), a checkbox, a clear name and metadata in its consistent supporting role without italic styling for offline records. Related statuses stay grouped at the trailing edge. Selected rows use dark violet. Search fields and refresh actions stay with their discovery panel; bounded lists prevent large inventories from extending the whole page. Counts use the interface locale, and a single device has singular English copy.

### Updates

Exodus, Core and Downloads headings share the 17px size and weight 650. The core type follows its heading inline as `Core | Mihomo Meta` with the same typography and color. Status blocks are centered on the complete Installed/Latest label-and-value groups. Architecture follows the same lower label-and-value arrangement. The free-space label is available to screen readers only, and its block is centered on the Architecture group. Status blocks share a 168px trailing column and a 48px minimum height with the neutral free-space block; long content expands the blocks without clipping.

Versions are presented as two flat component rows for Exodus and the core. Each has a clear component name, a trailing semantic status and equally sized Installed/Latest fields. Version values share the body family at 14px and regular weight; optional commits appear separately as supporting text. Static versions do not force tabular numeral shapes. Long releases wrap without losing their suffix. Download source, architecture and free space use a compact definition list, with normal-weight values. The low-space explanation belongs to its help icon. Missing metadata uses an explicit placeholder or omits an optional line, without orphan labels. The check action keeps its circular arrow and busy feedback without shifting its size.

### Logs

Logs renders actual router text. A loading placeholder and status precede the first read; a successful empty read shows “No log entries yet.” A failed read shows the error and retains previous entries. A response without string log content is an error. Hidden panes stay idle, selecting a pane starts its read, and pause and follow controls preserve the existing polling and scroll behavior.

### Draft Toolbar

A dark-violet toolbar appears only when the draft differs from saved configuration. Save, Save & Apply and discard actions stay explicit and fit the desktop content slot. Its sticky top position reserves space in the document. Choosing devices or a profile changes the draft; it does not imply saving. Session-expiry feedback keeps the open-tab draft recoverable.

## Do's and Don'ts

### Do:

- **Do** keep addon styling scoped to the Exodus root and preserve firmware-owned chrome.
- **Do** use flat dark task surfaces, stacked fields and open list sections.
- **Do** preserve wrapping, bounded device scrolling and local overflow for editable tables.
- **Do** retain readable state labels, visible keyboard focus and explicit draft actions.
- **Do** use monospace for configuration and technical identifiers within the utility type hierarchy.
- **Do** distinguish a service command being accepted from the observed service state.

### Don't:

- **Don't** add a separate addon login, sidebar or standalone page shell inside the firmware page.
- **Don't** restore gray-blue gradient headers or compact native form-table styling inside Exodus.
- **Don't** nest bordered cards around ordinary device list sections or elevate resting task panels.
- **Don't** replace status text with color alone or remove the keyboard focus treatment.
- **Don't** treat simulated browser captures as evidence of physical router behavior or firmware authentication.
