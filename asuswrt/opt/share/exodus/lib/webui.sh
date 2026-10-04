#!/bin/sh
# shellcheck shell=sh disable=SC2034
# Caller sources common.sh. Only files marked page:exodus belong to us.
webui_preflight() {
	local firm build ext
	[ -r "$EXODUS_HELPER" ] && have nvram || return 1
	[ "$(nvram get '3rd-party')" = merlin ] || return 1
	nvram get rc_support | grep -qw am_addons || return 1
	[ -d "$EXODUS_JFFS/addons" ] && [ -w "$EXODUS_JFFS/addons" ] || return 1
	firm=$(nvram get firmver | tr -d '.')
	build=$(nvram get buildno)
	ext=$(nvram get extendno | sed 's/[^0-9].*//')
	case "$firm:$build:$ext" in *[!0-9:]*|:*|*::*|*:) return 1 ;; esac
	[ "$firm" -gt 3006 ] || { [ "$firm" -eq 3006 ] && { [ "$build" -gt 102 ] || { [ "$build" -eq 102 ] && [ "$ext" -ge 1 ]; }; }; }
}

webui_owned_page() {
	local file
	for file in "$EXODUS_WWW"/user/user*.asp; do
		[ -f "$file" ] && grep -q 'page:exodus' "$file" && { echo "${file##*/}"; return 0; }
	done
	return 1
}

webui_menu() {
	local page target
	page="$1"
	target="$EXODUS_WWW/require/modules/menuTree.js"
	[ -f "$EXODUS_MENU" ] || cp "$target" "$EXODUS_MENU" || return 1
	awk -v page="$page" '
		/exodus:menu/ { next }
		/index:[[:space:]]*"menu_VPN"/ { vpn=1 }
		/index:/ && !/"menu_VPN"/ { vpn=0 }
		vpn && /url:[[:space:]]*"NULL"/ && page != "" {
			print "    { url: \"" page "\", tabName: \"Exodus\" }, // exodus:menu"; added=1
		}
		{ print }
		END { if(page != "" && !added) exit 1 }
	' "$EXODUS_MENU" > "$EXODUS_MENU.exodus" || { rm -f "$EXODUS_MENU.exodus"; return 1; }
	mv -f "$EXODUS_MENU.exodus" "$EXODUS_MENU" || return 1
	umount "$target" 2> /dev/null || :
	mount -o bind "$EXODUS_MENU" "$target"
}

webui_mount() (
	local page file
	webui_preflight || { echo 'Exodus requires Merlin 3006.102.1+ with Addons API and writable JFFS.' >&2; exit 1; }
	[ -r "$SHARE_DIR/www/Exodus.asp" ] || exit 1
	mkdir -p "$WEBUI_DIR" "$WEBUI_ADDON" "$WEBUI_PUBLIC" || exit 1
	# Serialize Exodus registrations; always edit the current shared menu.
	lock_acquire webui || exit 1
	trap 'lock_release webui' EXIT
	page=$(webui_owned_page)
	if [ -z "$page" ]; then
		. "$EXODUS_HELPER"
		am_get_webui_page "$SHARE_DIR/www/Exodus.asp"
		page="$am_webui_page"
	fi
	case "$page" in user[1-9].asp|user1[0-9].asp|user20.asp) ;; *) exit 1 ;; esac
	file="$EXODUS_WWW/user/$page"
	[ ! -e "$file" ] || grep -q 'page:exodus' "$file" || exit 1
	cp "$SHARE_DIR/www/Exodus.asp" "$WEBUI_ADDON/Exodus.asp.new" && mv -f "$WEBUI_ADDON/Exodus.asp.new" "$WEBUI_ADDON/Exodus.asp" || exit 1
	ln -sf "$WEBUI_ADDON/Exodus.asp" "$file" || exit 1
	printf 'Exodus\n' > "$EXODUS_WWW/user/${page%.asp}.title"
	if ! webui_menu "$page"; then
		rm -f "$file" "$EXODUS_WWW/user/${page%.asp}.title"
		exit 1
	fi
	for file in app.js merlin.js i18n.js style.css favicon.svg; do
		[ ! -f "$SHARE_DIR/www/$file" ] || ln -sf "$SHARE_DIR/www/$file" "$WEBUI_PUBLIC/$file" || exit 1
	done
	mkdir -p "$WEBUI_DIR/responses" "$WEBUI_DIR/cache"
	chmod 700 "$WEBUI_DIR"
	ln -sf "$WEBUI_DIR/responses" "$WEBUI_PUBLIC/responses"
	ln -sf "$WEBUI_DIR/cache" "$WEBUI_PUBLIC/cache"
	printf '%s\n' "$page" > "$WEBUI_DIR/page"
	cat > "$WEBUI_ADDON/boot.sh" <<'BOOT'
#!/bin/sh
# Exodus boot recovery: Entware can mount after services-start.
case "$1" in
 event) [ -x /opt/share/exodus/exodus ] && /opt/share/exodus/exodus web event "$2" "$3"; exit ;;
esac
mkdir /tmp/exodus-webui-boot.lock 2>/dev/null || exit 0
trap 'rmdir /tmp/exodus-webui-boot.lock' EXIT
i=0
while [ "$i" -lt 120 ]; do
 if [ -x /opt/share/exodus/exodus ]; then /opt/share/exodus/exodus web start && exit 0; fi
 i=$((i + 1)); sleep 5
done
BOOT
	chmod 755 "$WEBUI_ADDON/boot.sh"
)

webui_unmount() (
	local page
	lock_acquire webui || exit 1
	trap 'lock_release webui' EXIT
	page=$(webui_owned_page)
	if [ -n "$page" ]; then rm -f "$EXODUS_WWW/user/$page" "$EXODUS_WWW/user/${page%.asp}.title"; fi
	[ ! -f "$EXODUS_MENU" ] || webui_menu '' || exit 1
	rm -f "$WEBUI_DIR/page"
	rm -rf "$WEBUI_PUBLIC"
)

webui_status() {
	local page
	page=$(cat "$WEBUI_DIR/page" 2> /dev/null)
	[ -n "$page" ] && [ -r "$EXODUS_WWW/user/$page" ] && grep -q 'page:exodus' "$EXODUS_WWW/user/$page" && grep -q 'exodus:menu' "$EXODUS_MENU"
}

webui_url() {
	local scheme port host page
	page=$(cat "$WEBUI_DIR/page" 2> /dev/null)
	[ -n "$page" ] || return 1
	host=$(nvram get lan_ipaddr)
	case "$(nvram get http_enable)" in
		1|2) scheme=https; port=$(nvram get https_lanport); [ "$port" = 443 ] && port= ;;
		*) scheme=http; port=$(nvram get http_lanport); [ "$port" = 80 ] && port= ;;
	esac
	[ -z "$port" ] || port=":$port"
	printf '%s://%s%s/%s\n' "$scheme" "$host" "$port" "$page"
}
