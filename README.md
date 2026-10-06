![GitHub License](https://img.shields.io/github/license/prettyleaf/openwrt-exodus?style=for-the-badge&logo=github)

[Русский](README.RU.md) | English
[Documentation](https://prettyleaf.github.io/OpenWrt-exodus/en/install/asuswrt/)

# Exodus for Asuswrt-Merlin

Proxy with [Mihomo](https://github.com/MetaCubeX/mihomo) for Asus routers with [Asuswrt-Merlin](https://www.asuswrt-merlin.net/) and Entware. This is the `asuswrt` branch of the [IKitKatt fork](https://github.com/IKitKatt/openwrt-exodus/tree/asuswrt) of [Exodus](https://github.com/prettyleaf/openwrt-exodus): the OpenWrt version lives in the original project's `main` branch, the Keenetic one in `keenetic`.

It borrows ideas from [XKeen](https://github.com/jameszeroX/XKeen).

## Requirements

The installer installs `curl`, `jq`, `ca-bundle` and `coreutils-base64` through Entware. It checks Base64 encoding and decoding before replacing Exodus; cache generation failures abort activation and trigger rollback.

- Asuswrt-Merlin **384.15 or newer** on the `3004` family (`384/386/388`), or **3006.102.1 or newer** on the `3006` family, with Addons API (`am_addons`), `/usr/sbin/helper.sh` and writable `/jffs/addons`. **3004.388.12_2 on RT-AX86U passes the version check.** Stock firmware and unsupported versions are rejected before installation changes. Addons API has been available since 384.15; see the [Merlin documentation](https://github.com/RMerl/asuswrt-merlin.ng/wiki/Addons-API).
- The installer selects the core build for the router CPU. The router model must support the minimum firmware version above.
- Entware on a USB drive, installed with [amtm](https://github.com/decoderman/amtm) (`amtm` → `ep`), and about 70 MB free on it: the Mihomo core is about 40 MB, yq about 15 MB.
- Other transparent proxies (XRAYUI and similar addons) must be stopped and removed from autostart, they intercept the same traffic.
- UDP through the proxy needs the TPROXY module of the firmware. Without it UDP goes directly, the app log tells about it.

### Before the installation

1. **SSH.** Administration → System → Enable SSH: LAN only.
2. **Entware.** Run `amtm` in the SSH console and install Entware (`ep`) on a USB drive formatted as ext4.
3. **JFFS custom scripts and configs** (Administration → System) must be on. The installer turns it on when it is off.

## Install & Update

In the SSH console of the router:

```shell
curl -fsSL https://raw.githubusercontent.com/IKitKatt/openwrt-exodus/asuswrt/install.sh | sh
```

At the end it prints the Web Admin URL of the allocated `userN.asp` page. Sign in to the router and open **VPN → Exodus**. Exodus uses the router administrator session and its HTTP/HTTPS port; a separate listener on port 9099 and the `PASSWORD` option are no longer used.

Options can be passed as environment variables before `sh`:

```shell
curl -fsSL https://raw.githubusercontent.com/IKitKatt/openwrt-exodus/asuswrt/install.sh | CORE=alpha sh
```

| Variable | Meaning |
| --- | --- |
| `CORE` | `meta` (stable Mihomo), `alpha` (Mihomo Alpha) or `prizrak` ([Prizrak-Core](https://github.com/legiz-ru/Prizrak-Core)), asked otherwise |
| `GH_PROXY` | download from GitHub through [gh-proxy](https://github.com/prettyleaf/gh-proxy): `https://example.com/ghproxy/TOKEN` |
| `LOW_SPACE=1` | remove the current core before writing the new one |
| `ALLOW_RUNNING_MIHOMO=1` | explicitly allow installation with another Mihomo running when no terminal is available |
| `REF` | another branch or tag; default: `asuswrt` |
| `REPOSITORY` | application fork as `owner/repo`; default: `IKitKatt/openwrt-exodus` |

When another Mihomo is running, the installer asks whether to continue. Yes continues; No or Enter cancels before dependency checks or downloads. Exodus's own core does not trigger this warning. Terminal output highlights stages, success, warnings and errors. Update logs stay plain; `NO_COLOR=1` disables terminal colors too.

### Versions

Exodus has one version for all routers, the version of the [releases](https://github.com/prettyleaf/openwrt-exodus/releases) of the project: it is in `/opt/share/exodus/VERSION`, on the **Updates** page and in the build info. The **Updates** page offers an update when the code of the `asuswrt` branch changes, a change of the readme does not count.

## Migrating from Another Proxy

Two transparent proxies can not intercept the same traffic.

1. Stop the other addon (XRAYUI, a Clash or sing-box addon) and turn off its autostart, or remove it by its instructions.
2. Install Exodus, see [Install & Update](#install--update).
3. **Profiles**: add the subscription of your provider. A Mihomo (Clash Meta) config of the other addon can be uploaded as a profile as it is: Exodus sets its ports, the DNS listener, the API and the dashboard over it, TUN of the profile is turned off. An Xray config does not fit, Exodus needs a subscription or a config for Mihomo.
4. **Status → Devices**: choose the devices that go through the proxy, then **Save & Apply**.

## How To Use

1. Sign in to Merlin Web Admin and open **VPN → Exodus**. The interface follows the firmware styling and supports English and Russian.
2. **Profiles**: add a subscription or upload a profile.
3. **Status**: turn on **Autostart**, choose the profile, choose the mode and the devices / Wi-Fi networks / segments in the Devices section, then **Save & Apply**. Device names come from the client list of the router, DHCP and its network map.
4. **Settings** holds only what makes sense to change on the router: proxy modes, ports and exclusions, DSCP, a few Mihomo options, your own rules, the service. Everything else (DNS servers, hosts, sniffer, rule providers) goes to the profile or to the mixin file on the **Editor** page, it is merged into the profile on every start.

The **Dashboard** button opens Zashboard, the core downloads it on the first start.

## How It Works

1. The settings are merged into the profile; a subscription is downloaded when its interval passed. `router.asus.com` resolves to the router, names of the local domain are asked from the router.
2. Mihomo starts and is restarted if it crashes. The memory limit is set on Settings → Mihomo: `GOMEMLIMIT` is half of the RAM by default, the file limit is 40000 on arm64 and 10000 on other models.
3. When the core listens on its ports, the iptables and ipset rules and the TPROXY route are turned on. They use iptables and ipset of the firmware, they match its kernel.
4. The firmware restores its iptables tables without the rules of addons on every restart of the firewall: a reconnect of the WAN, a change in the web interface. The rules are restored by a line in `/jffs/scripts/firewall-start` and `/jffs/scripts/nat-start`, and every 15 seconds they are checked by the watcher (`watch`), which also syncs the clients of the chosen Wi-Fi networks, updates the subscription, runs the scheduled restart and clears the logs over the size limit.
5. The proxied traffic goes to the router itself, past the filtering of forwarded traffic. With **Respect parental control** on, it is checked by the parental control chain of the firmware (`PControls`), so blocked devices and time scheduling apply to it too.
6. `/jffs/scripts/unmount` stops the proxy before its USB drive is unmounted: the rules must not stay without the core.

## Native Web Admin migration

Updating an existing installation keeps profiles, subscriptions, mixin, API/proxy secrets and device ID. Legacy `.web.port` and `web.auth` are retained for a possible manual downgrade; they do not control native Web Admin. The installer stops only the verified Exodus Lighttpd process and no longer installs Lighttpd packages. Registration failure restores the previous Exodus code and settings instead of reporting success.

The `services-start` recovery stub waits for Entware in the background, and `S99exodus` registers the page when USB storage becomes available. Status and logs refresh from RAM every five seconds. Navigation also reads RAM caches; WebUI writes refresh them before confirming completion, and CLI changes appear within about 30 seconds. Network update checks run separately. Stopping the proxy leaves administration available; `exodus web stop` stops both workers and removes the Exodus page. Request IDs, chunk acknowledgements and stable workers preserve responses while an update replaces scripts.

Cache freshness uses the router's HTTP clock rather than the computer's clock. A stale or missing cache triggers one recovery event: it starts a stopped cache worker and restarts a verified worker whose heartbeat has not advanced for over a minute of router uptime. Recovery does not write Addons API settings or restart Mihomo. Cache refresh errors appear in the App and Web logs. If recovery fails, run `exodus web restart` over SSH and save these logs before rebooting the router.

Exodus uses English unless Merlin's interface language is Russian (`preferred_lang=RU`). There is no separate language selector. Its gray canvas extends to the sidebar and viewport height, including loading and error states.

Uploaded profiles and editor files are limited to **8 MiB of UTF-8 data** (complete request: 16 MiB). Native forms transfer small acknowledged chunks with progress; keep the tab open for large files. Navigation and frequent status/log reads do not write JFFS. Write operations use the shared Addons API settings file. Before each packet, a native event returns a fresh, complete base64 snapshot in RAM, preserving spaces and empty values without writing shared settings. Snapshot records are separate from upload buffers; unrelated incomplete transfers do not block a new upload, with a limit of four unfinished transfers. Simultaneous writes from an unrelated addon are not atomic with Exodus. The final `exodus_packet` chunk remains there until the next submission or uninstall.

If the router session expires, the tab retains the unsaved draft and pauses requests. Sign in to Web Admin in another tab, then use the resume button. Reloading the page discards an unsaved draft.

For a manual downgrade, back up `/opt/etc/exodus`, run `exodus web stop`, remove only Exodus's marked lines from `services-start` and `service-event`, and remove `/jffs/addons/exodus`. Fetch the **installer from the selected older commit**, and run it with `REF` set to that same commit. The current native installer requires native registration helpers and cannot install an arbitrary legacy revision. Restore the backup if needed; a legacy first-time password may need to be set by the older installer.

CI checks use isolated firmware fixtures: `python3 -m unittest discover -s tests -v` and `node --test tests/merlin.test.mjs`. They require Linux, Python 3, Node.js, jq and standard Unix utilities. Before deployment, verify Web Admin session protection of the Exodus page and response URLs, service restart, routing, reboot recovery and removal on a router. These hardware checks have not been performed in this environment.

## Uninstall

The installed version includes an uninstaller that requires no download:

```shell
KEEP_CONFIG=1 sh /opt/share/exodus/uninstall.sh
```

If the installed CLI is damaged, download `uninstall.sh` using the command below. It runs independently of the CLI. Omitting `KEEP_CONFIG=1` also deletes Exodus data. Installation and removal share an exclusive lock. Cleanup failures return a nonzero status rather than reporting success.

```shell
curl -fsSL https://raw.githubusercontent.com/IKitKatt/openwrt-exodus/asuswrt/uninstall.sh | sh
```

The lines of Exodus are removed from `/jffs/scripts`, the lines of other addons are kept. With `KEEP_CONFIG=1` the settings, profiles and subscriptions in `/opt/etc/exodus` are kept. Entware packages are not removed, other applications may use them.

## Command Line

```shell
exodus start | stop | restart | status
exodus update_subscription <id>   # download a subscription, the running core gets it when it is in use
exodus hard_update     # remove downloaded providers, update the subscription and restart
exodus debug           # report for an issue, server addresses and passwords are hidden
exodus web start | stop | restart | status | url
exodus passwd          # points to Administration → System for the router password
```

## Files

| Path | Purpose |
| --- | --- |
| `/opt/etc/exodus/config.json` | settings |
| `/opt/etc/exodus/mixin.yaml` | mixin file, merged into the profile on every start |
| `/opt/etc/exodus/profiles/` | uploaded profiles |
| `/opt/etc/exodus/subscriptions/` | subscriptions and what the provider told about them |
| `/opt/etc/exodus/run/` | working directory of the core: profile for startup, providers, dashboard |
| `/opt/share/exodus/` | scripts and the web UI |
| `/opt/libexec/exodus/` | `mihomo` and `yq` |
| `/opt/etc/init.d/S99exodus` | start with Entware |
| `/jffs/scripts/firewall-start`, `nat-start`, `unmount`, `services-start`, `service-event` | one line marked `# exodus` in each |
| `/jffs/addons/exodus/` | persistent ASP page and boot recovery stub |
| `/tmp/exodus/run/webui/` | request staging, response envelopes, status/log caches and cache worker PID |
| `/www/user/exodus/` (`/ext/exodus/` in Web Admin) | authenticated static resources and RAM response/cache links |
| `/tmp/exodus/log/` | logs of the app, the core and the update |

## Special Thanks

- [OpenWrt-nikki](https://github.com/nikkinikki-org/OpenWrt-nikki) and its [contributors](https://github.com/nikkinikki-org/OpenWrt-nikki/graphs/contributors)
- [XKeen](https://github.com/jameszeroX/XKeen) for the transparent proxy on iptables and the DSCP marks
- [Asuswrt-Merlin](https://github.com/RMerl/asuswrt-merlin.ng) for the user scripts and [amtm](https://github.com/decoderman/amtm) for Entware
- [Prizrak-Core](https://github.com/legiz-ru/Prizrak-Core) and its [contributors](https://github.com/legiz-ru/Prizrak-Core/graphs/contributors)
