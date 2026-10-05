---
name: Exodus for Asuswrt-Merlin
description: Native router administration within the Merlin VPN interface.
colors:
  surface: "#4d595d"
  label-surface: "#303b3f"
  control: "#576f77"
  line: "#253337"
  text: "#fff"
  muted: "#e0e8ea"
  accent: "#ffd941"
  focus: "#b9e4f6"
  link: "#c3e8ff"
  navigation: "#303f45"
  navigation-active: "#62777e"
  panel: "#475c63"
  header-light: "#879ba3"
  header-dark: "#55696f"
  section: "#35494f"
  button-light: "#374c53"
  button-dark: "#14242b"
  button-border: "#15252c"
  button-secondary: "#3a4f57"
  hover: "#506a75"
  destructive: "#7d2e33"
  control-border: "#98acb3"
  invalid: "#ffb2b2"
  tag: "#2f434a"
  success: "#075f08"
  success-border: "#a1d6a3"
  warning-text: "#fff2ac"
  selected: "#2d617a"
typography:
  title:
    fontFamily: "Arial, Helvetica, sans-serif"
    fontSize: "18px"
    fontWeight: 700
    lineHeight: 1.5
  headline:
    fontFamily: "Arial, Helvetica, sans-serif"
    fontSize: "16px"
    fontWeight: 700
    lineHeight: 1.3
  body:
    fontFamily: "Arial, Helvetica, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Arial, Helvetica, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.5
  description:
    fontFamily: "Arial, Helvetica, sans-serif"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.5
  code:
    fontFamily: "Consolas, 'Courier New', monospace"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  square: "0"
  badge: "2px"
  button: "4px"
  dialog: "5px"
spacing:
  tight: "4px"
  compact: "6px"
  row: "8px"
  inset: "10px"
  text: "12px"
  section: "14px"
  dialog-inset: "18px"
components:
  button-primary:
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.button}"
    padding: "4px 10px"
  button-secondary:
    backgroundColor: "{colors.button-secondary}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.button}"
    padding: "4px 10px"
  button-destructive:
    backgroundColor: "{colors.destructive}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.button}"
    padding: "4px 10px"
  input:
    backgroundColor: "{colors.control}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.square}"
    padding: "3px 6px"
  navigation:
    backgroundColor: "{colors.navigation}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    padding: "5px 12px"
  panel:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.text}"
    rounded: "{rounded.square}"
  badge-success:
    backgroundColor: "{colors.success}"
    textColor: "{colors.text}"
    typography: "{typography.description}"
    rounded: "{rounded.badge}"
    padding: "1px 5px"
---

# Design System: Exodus for Asuswrt-Merlin

## Overview

**Creative North Star: "Native Merlin Administration"**

Exodus belongs inside the router administrator's existing Merlin session. The visual authority is the user-supplied ASUSWRT-Merlin admin screenshot: dense gray-blue forms, compact controls and restrained gradient section headers. The firmware owns the ASUS header, sidebar, VPN tabs and footer; Exodus styles only its own content region.

The shipped system favors readable labels, predictable table rows and explicit state over ornamental space. Primary content uses flat, square panels. Small rounded buttons and gradient headers follow the native firmware vocabulary. Arial is the native interface face here; it is an established integration choice, not a display-font recommendation for unrelated products.

**Key Characteristics:**
- Dense gray-blue administration forms.
- Compact Arial type with white foregrounds.
- Square panel and field geometry with rounded action buttons.
- Firmware-owned chrome and addon-scoped styling.
- Explicit drafts, save controls and service feedback.

## Colors

The palette uses cool gray-blue surfaces, pale readable foregrounds and state-specific warning, success and destructive colors.

### Primary
- **Warning Yellow** (`accent`): warning borders and attention states, rather than a general action fill.
- **Pale Ice** (`focus`): keyboard focus outlines and the active navigation lower edge.
- **Link Ice** (`link`): text links and link-style controls.

### Neutral
- **Merlin Gray** (`surface`): the addon canvas and dialogs.
- **Label Charcoal** (`label-surface`): table labels, table headings, toast surfaces and the save bar.
- **Control Blue Gray** (`control`): editable fields and tag-input containers.
- **Panel Blue Gray** (`panel`): form panels, picker rows and select options.
- **Deep Divider** (`line`): thin form-row, panel and navigation boundaries.
- **White** (`text`) and **Muted Ice Gray** (`muted`): primary content and supporting descriptions.
- **Header Light / Header Dark**: the compact native section-header gradient.
- **Navigation / Navigation Active**: separate the current local section from adjacent sections.
- **Button Light / Button Dark**, **Button Secondary** and **Hover**: action fills, with a dark button outline.
- **Control Border**: readable control and feedback boundaries.
- **Section**, **Tag** and **Selected**: secondary grouping, removable values and chosen picker rows.

Success uses a green fill and pale green border. Destructive states use muted red with a pale red boundary; warning text uses pale yellow. These are semantic state colors, not extra brand accents.

**The State Color Rule.** Preserve text labels alongside status color; the running badge, warnings and errors communicate their meaning in words.

## Typography

**Body Font:** Arial, with Helvetica and sans-serif fallbacks.
**Code Font:** Consolas, with Courier New and monospace fallbacks.

**Character:** Compact native administration typography. Size changes identify the addon, page and descriptive text without introducing a marketing hierarchy.

### Hierarchy
- **Title:** the Exodus identity in the addon heading.
- **Headline:** page headings; dialog titles also use the headline size, with their inherited native weight.
- **Body / Label:** ordinary form values, labels, navigation and controls; labels retain normal weight.
- **Description:** compact supporting text and status badges; field descriptions are capped at 70ch.
- **Code:** editable configuration, logs, technical identifiers and inline code.

Bold body-size section titles and cell titles mark local groups. Numeric text uses tabular figures. At the narrow container breakpoint, editable controls use a larger size (16px) for readable mobile input.

**The Native Type Rule.** Keep the compact Arial hierarchy inside Exodus and let the firmware retain its own typography outside the addon.

## Layout

The addon fills the firmware's content slot, with an inset (10px) and no independent page-width framework. Rows and action groups wrap; vertical sections use the section spacing token. Former multi-column summary grids render as stacked native form groups.

Desktop form rows use a label track of `minmax(140px, 34%)` and a remaining value track of `minmax(0, 1fr)`. Labels have compact insets (7px 9px); value areas use (5px 8px). Information lists follow the same label/value proportions. Tables span the available content width and use an overflow wrapper when needed. Service status, service actions, the profile selector and device selection stay within this compact row vocabulary.

The responsive boundary is the addon container width (480px), not a replacement firmware viewport layout. Ordinary fields and checkbox rows become one column. Checkbox descriptions stay beside their controls in the value area, while the label occupies its own row. Picker columns and build tiles become one column; information lists use a smaller label minimum (110px) and a label share (38%). Buttons and local navigation receive a larger minimum height (36px). Long values can wrap without expanding the addon slot.

Form rows span the panel, while free content uses explicit insets: toolbars (8px 10px), text surfaces (8px 10px), and device pickers (10px). Action groups, titles and counts use gaps rather than adjacent inline boxes. The manual address field is stacked even within a desktop picker column. Datalist wrappers fill the value track. Nested tabs use one section gap. Editable rules keep usable columns in a locally scrollable table; table headers and standalone status badges remain on one line.

**The Firmware Boundary Rule.** Scope every Exodus visual selector to its root; preserve firmware-owned header, sidebar, VPN tabs and footer.

## Elevation & Depth

Resting form panels are flat, bounded by dark rules and differentiated by tone. Gradient headers and buttons are native material cues. Elevation is reserved for dialogs and temporary toast feedback; it does not lift ordinary sections.

### Shadow Vocabulary
- **Dialog:** `0 8px 24px rgb(0 0 0 / 45%)`, above the existing viewport overlay (`rgb(0 0 0 / 65%)`). This functional scrim is not a form surface color.
- **Toast:** `0 4px 12px rgb(0 0 0 / 30%)`, for transient feedback above content.

**The Flat Form Rule.** Keep form sections flat; use elevation for the shipped modal and toast layers.

## Shapes

Panel, input and navigation boundaries are square. Action buttons use a modest curve, badges a smaller curve and dialogs a slightly larger curve, as defined in the frontmatter. Circular status dots and native checkbox geometry are purposeful state details. Borders are thin (1px) and stay visible against the gray-blue surfaces.

## Components

### Buttons

Compact native actions. Primary actions use a dark vertical gradient, a thin dark border and the button radius. Secondary actions use the solid secondary fill; destructive actions use the destructive fill. Hover uses the shared hover tone only on devices that support hover. Keyboard focus uses the pale ice outline (2px) with an offset (2px). Disabled controls use reduced opacity (.55). Icon-only actions retain accessible labels and inline SVG icons.

### Inputs / Fields

Square, visibly bounded fields. Inputs, selects and textareas share the control surface, control border and compact padding. Their desktop minimum height is (28px). Invalid fields use the pale red border and an additional thin outline. Editor and log textareas use the code face and resize vertically. Tag inputs share the field container; removable values use a darker tag surface with explicit remove actions.

### Cards / Containers

Native table-form sections. Panels use square boundaries without shadows; section headers use the two-tone native gradient and compact insets (5px 9px). Row dividers organize labels and controls. Footers use a divider and compact action spacing.

### Navigation

Exodus owns six local section choices: status, profiles, settings, editor, logs and updates. They use compact rectangular tabs, wrapped when necessary. The current section uses the active tone and pale lower edge. Secondary tab groups retain the same vocabulary. Firmware VPN navigation remains outside this system's ownership.

### Status / Feedback

Small bordered badges pair text with optional circular status dots. Running uses the success state; errors and warnings have explicit boundaries. Alerts span their content area. Dialogs use contained scrolling, a titled header and trailing actions. Temporary toasts occupy the lower trailing corner.

### Draft Save Bar

A charcoal bar in normal document flow appears after the content when the configuration draft differs from the saved state. Explicit save, apply and discard operations wrap on narrow surfaces. The bar occupies its own space, so its actions do not cover form controls during scrolling. Session-expiry feedback preserves the open draft rather than presenting a separate Exodus login surface.

## Do's and Don'ts

### Do:
- **Do** keep addon styling scoped to the Exodus root and preserve firmware-owned chrome.
- **Do** use compact label/value form rows, with 34% desktop label tracks and one-column narrow fields.
- **Do** retain readable state labels, keyboard focus outlines and explicit draft save controls.
- **Do** use the shipped Arial and monospace roles with the existing gray-blue surface hierarchy.
- **Do** distinguish a service command being accepted from the observed service state.

### Don't:
- **Don't** add a standalone header, sidebar, hero or login shell inside the native Merlin page.
- **Don't** turn ordinary form sections into lifted dashboard cards.
- **Don't** use state colors without readable text or remove the pale keyboard focus treatment.
- **Don't** treat simulated browser captures as evidence of firmware authentication or live router behavior.
