# Exodus for Asuswrt-Merlin

Exodus manages existing Mihomo profiles, subscriptions, routing settings, logs and updates on a router. Its native WebUI is for the router administrator who already uses Merlin Web Admin.

The target is Merlin 3006.102.1 or newer with Addons API, Entware and writable JFFS. Open Exodus from VPN → Exodus using the router's own authenticated session. Keep the six existing sections and their draft/save behavior. Proxy configuration and routing behavior are outside this migration.

The visual authority is the supplied Merlin X-RAY screenshot: ASUS header and sidebar, VPN tabs, dense gray-blue form tables, restrained section headers and compact controls. Match that established firmware UI. The addon canvas fills the firmware sidebar and available viewport height, including loading and error states; long content grows naturally. English is the default. Russian is used only when Merlin's `preferred_lang` is `RU`; browser language and a previously saved addon language are ignored. There is no separate addon language switch.

Success means completing existing Exodus operations without a separate listener, password or login screen. Feedback must distinguish accepting a service command from the core actually running. An expired session keeps the draft in the open tab. A simulated preview demonstrates the frontend; real firmware integration requires the router smoke checklist.
