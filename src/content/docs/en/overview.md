---
title: Overview
description: What Exodus is, which routers it runs on and how it works.
---

Exodus is a transparent proxy with the [Mihomo](https://github.com/MetaCubeX/mihomo) core for routers. Devices of the network go through the proxy without any setup on them: the router intercepts their traffic and hands it to the core, and the core decides by the rules of the profile what goes through the proxy and what goes directly.

The OpenWrt version is a fork of [OpenWrt-nikki](https://github.com/nikkinikki-org/OpenWrt-nikki). The Keenetic and Asus versions run in Entware and borrow ideas from [XKeen](https://github.com/jameszeroX/XKeen).

## Platforms

| Platform | Branch | UI | Replaces |
| --- | --- | --- | --- |
| [OpenWrt](/en/install/openwrt/) 24.10+ | `main` | LuCI: Services → Exodus | Nikki |
| [Keenetic / Netcraze](/en/install/keenetic/) | `keenetic` | [own web UI](/en/usage/web-ui/), port 9099 | XKeen |
| [Asus with Asuswrt-Merlin](/en/install/asuswrt/) | `asuswrt` | [own web UI](/en/usage/web-ui/), port 9099 | XRAYUI and similar addons |

Exodus has one version for all routers, the version of the [release](https://github.com/prettyleaf/openwrt-exodus/releases).

## Features

- TCP through Redirect or TPROXY, UDP through TPROXY, IPv4 and IPv6. TUN on OpenWrt as well.
- Device selection: proxy all except the selected devices, or only the selected ones. On Keenetic and Asus also network segments and Wi-Fi networks.
- [Subscriptions](/en/usage/subscriptions/) updated by the interval of the provider, provider headers (title, announce, logo, traffic) and HWID for panels with a device limit.
- Your own rules and a mixin file over the profile, an editor of the files on the router.
- DSCP marks to choose the route per application (Keenetic, Asus).
- Choice of the core: Mihomo Meta, Mihomo Alpha or Prizrak-Core.
- Updates from the UI and installation through your own [gh-proxy](/en/install/options/#if-github-is-blocked) when the provider blocks GitHub.
- The Zashboard dashboard (or MetaCubeXD, YACD) to choose proxies and watch connections.

## How it works

1. On start the profile (a subscription or an uploaded file) is merged with the settings of Exodus and the mixin file. A subscription is downloaded again when its interval has passed.
2. Mihomo starts. If the core crashes, it is restarted.
3. When the core listens on its ports, the interception rules are turned on: nftables on OpenWrt, iptables and ipset on Keenetic and Asus.
4. On Keenetic and Asus a watcher checks the rules every 15 seconds (the firmware resets them), updates the subscription, runs the scheduled restart and clears the logs.

The specifics of each firmware are on its installation page.
