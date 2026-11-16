# Upstream PR preparation

## Approved scope

- Merge `prettyleaf/OpenWrt-exodus:asuswrt` at `16ffddd` (1.30.4) into `asuswrt-native`.
- Prepare `fix/asuswrt-popup-layout` and `feat/asuswrt-miboard` independently from `16ffddd`; do not include unpublished native changes.
- Use `IKitKatt <20ni0ki0ta02@gmail.com>` for this task's commits without changing global Git configuration.

## Approaches

1. Full Dashboard port: default-panel migration, embedded tab, versions/update UI and hideMode. Not selected.
2. Add only the new panel to the existing selector. Selected by the user: preserve the default and all existing behavior.

## Popup PR

Port the CSS fix from `ac36a25`: vertically center the toast icon, message and close button; remove conflicting offsets. Port its browser regression test, adapting it only where the current upstream requires. Check short/long messages, save success/error, links, keyboard dismissal, en/ru, desktop/tablet/mobile.

## Dashboard PR

Add `MIBoard` with `https://github.com/blagodaren/miboard/releases/latest/download/dist.zip` to `DASHBOARDS` in `asuswrt/opt/share/exodus/www/app.js`, following the current upstream Keenetic/Mikrotik version. Reuse existing configuration persistence, core download, dashboard opening and update mechanisms. Keep Zashboard as the default; preserve existing panels and custom URLs. Add a focused regression test for selection, persistence and connection parameters. No new dependencies or bundled panel build.

## Integration and limitations

After independent verification, merge the MIBoard branch into `asuswrt-native`; popup changes are already present there. Prepare English PR descriptions with source commits and checks. Publishing branches/PRs is outside preparation and requires confirmation. Router hardware checks are unavailable unless a device is provided.
