---
title: Обзор
description: Что такое Exodus, на каких роутерах он работает и как устроен.
---

Exodus — прокси на ядре [Mihomo](https://github.com/MetaCubeX/mihomo) для роутеров. Устройства сети ходят через прокси без настройки на них самих: роутер перехватывает их трафик и отдаёт ядру, а ядро решает по правилам профиля, что пустить через прокси, а что напрямую.

Версия для OpenWrt — форк [OpenWrt-nikki](https://github.com/nikkinikki-org/OpenWrt-nikki). Версии для Keenetic и Asus работают в Entware и берут идеи из [XKeen](https://github.com/jameszeroX/XKeen).

## Платформы

| Платформа | Ветка | Интерфейс | Заменяет |
| --- | --- | --- | --- |
| [OpenWrt](/install/openwrt/) 24.10+ | `main` | LuCI: «Службы» → «Exodus» | Nikki |
| [Keenetic / Netcraze](/install/keenetic/) | `keenetic` | [свой веб-интерфейс](/usage/web-ui/), порт 9099 | XKeen |
| [Asus с Asuswrt-Merlin](/install/asuswrt/) | `asuswrt` | [свой веб-интерфейс](/usage/web-ui/), порт 9099 | XRAYUI и подобные |

У Exodus одна версия для всех роутеров — версия [релиза](https://github.com/prettyleaf/openwrt-exodus/releases).

## Возможности

- TCP через Redirect или TPROXY, UDP через TPROXY, IPv4 и IPv6. На OpenWrt также режим TUN.
- Выбор устройств: проксировать все, кроме выбранных, или только выбранные. На Keenetic и Asus — ещё сегменты сети и сети Wi-Fi.
- [Подписки](/usage/subscriptions/) с автообновлением по интервалу провайдера, заголовки провайдера (название, анонс, логотип, трафик) и HWID для панелей с лимитом устройств.
- Свои правила и mixin-файл поверх профиля, редактор файлов на роутере.
- Метки DSCP для выбора маршрута отдельными приложениями (Keenetic, Asus).
- Выбор ядра: Mihomo Meta, Mihomo Alpha или Prizrak-Core.
- Обновление из интерфейса и установка через свой [gh-proxy](/install/options/#если-github-заблокирован), если провайдер блокирует GitHub.
- Панель Zashboard (или MetaCubeXD, YACD) для выбора прокси и просмотра соединений.

Особенности каждой прошивки — на странице установки для неё.
