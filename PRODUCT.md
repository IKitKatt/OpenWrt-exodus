# Exodus for Asuswrt-Merlin

Exodus manages proxy device selection, existing Mihomo profiles, subscriptions, routing settings, logs and updates on a router. Its native WebUI serves the administrator who already uses Merlin Web Admin. Choosing which devices use the proxy is the most frequent task and leads the workspace.

Supported firmware is Asuswrt-Merlin 384.15 or newer on the 3004 family, including 384/386/388, or 3006.102.1 or newer on the 3006 family. Installation also requires native Addons API support, its registration helpers, writable JFFS and Entware. Open Exodus from VPN → Exodus using the router's authenticated session.

The addon uses its own dark, Dracula-inspired operations workspace: readable task surfaces, device search and selection, contextual help, searchable settings and explicit draft actions. The firmware retains its header, sidebar, VPN tabs and footer. The former Merlin screenshot no longer governs the addon's visual system; DESIGN.md records the shipped replacement.

All six routes remain available: Devices (`#/status`), Profiles, Settings, Editor, Logs and Updates. Devices comes first and keeps service state, current profile and service actions available after selection. A profile can be chosen where it is listed; choosing it changes the draft and requires explicit saving or applying. Settings search spans categories and returns to the prior tab when cleared. Existing configuration semantics and proxy routing remain authoritative.

English is the default. Russian is used only when Merlin's `preferred_lang` is `RU`; browser language and a previously saved addon language are ignored. There is no separate addon language switch.

Success means completing existing Exodus operations without a separate listener, password or login screen. Feedback distinguishes accepting a service command from the core actually running. An expired session keeps the draft in the open tab and allows recovery after the firmware session resumes. Upload and editor failures retain useful context. Browser fixtures and simulated native transport demonstrate frontend behavior; physical router integration requires the router smoke checklist and is not established by preview captures.
