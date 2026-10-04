#!/bin/sh

# Exodus for Asuswrt-Merlin uninstaller
# KEEP_CONFIG=1 keeps /opt/etc/exodus (settings, profiles and subscriptions)
# packages of entware (curl, jq, lighttpd) are kept, other applications may use them

EXODUS_OPT="${EXODUS_OPT:-/opt}"
EXODUS_JFFS="${EXODUS_JFFS:-/jffs}"
EXODUS_WWW="${EXODUS_WWW:-/www}"
EXODUS_TMP="${EXODUS_TMP:-/tmp/exodus}"
EXODUS_MENU="${EXODUS_MENU:-/tmp/menuTree.js}"
export PATH="$EXODUS_OPT/bin:$EXODUS_OPT/sbin:/sbin:/bin:/usr/sbin:/usr/bin"

# stop the proxy first, it removes the rules and the routes
if [ -x "$EXODUS_OPT/share/exodus/exodus" ]; then
	"$EXODUS_OPT/share/exodus/exodus" stop
	"$EXODUS_OPT/share/exodus/exodus" web stop
fi

# Marker-based cleanup also works when the installed CLI is broken.
for page in "$EXODUS_WWW"/user/user*.asp; do
	if [ ! -f "$page" ] || ! grep -q 'page:exodus' "$page"; then continue; fi
	rm -f "$page" "${page%.asp}.title"
done
if [ -f "$EXODUS_MENU" ] && grep -q 'exodus:menu' "$EXODUS_MENU"; then
	grep -v 'exodus:menu' "$EXODUS_MENU" > "$EXODUS_MENU.exodus"
	mv -f "$EXODUS_MENU.exodus" "$EXODUS_MENU"
	umount "$EXODUS_WWW/require/modules/menuTree.js" 2> /dev/null || :
	mount -o bind "$EXODUS_MENU" "$EXODUS_WWW/require/modules/menuTree.js"
fi
settings="$EXODUS_JFFS/addons/custom_settings.txt"
if [ -f "$settings" ] && grep -q '^exodus_packet ' "$settings"; then
	grep -v '^exodus_packet ' "$settings" > "$settings.exodus"
	mv -f "$settings.exodus" "$settings"
fi
rm -rf "$EXODUS_WWW/user/exodus" "$EXODUS_JFFS/addons/exodus"

# the rules once more, also when the stop failed or exodus is broken: rules without the core cut the internet of the network
# the same as fw_clean in lib/firewall.sh, with the iptables and ipset of the firmware
for name in iptables ip6tables; do
	ipt="/usr/sbin/$name"
	[ -x "$ipt" ] || ipt="/sbin/$name"
	[ -x "$ipt" ] || continue
	for table in nat mangle filter; do
		rules=$("$ipt-save" -t "$table" 2> /dev/null) || continue
		echo "$rules" | grep -E '^-A (PREROUTING|INPUT|OUTPUT) .*-j EXODUS_[A-Z_]+ *$' | sed 's/^-A //' | while read -r rule; do
			# shellcheck disable=SC2086
			"$ipt" -t "$table" -D $rule > /dev/null 2>&1
		done
		chains=$(echo "$rules" | grep -o -E '^:EXODUS_[A-Z_]+' | tr -d ':')
		for chain in $chains; do
			"$ipt" -t "$table" -F "$chain" > /dev/null 2>&1
		done
		for chain in $chains; do
			"$ipt" -t "$table" -X "$chain" > /dev/null 2>&1
		done
	done
done
for family in 4 6; do
	while ip -"$family" rule del table 7892 > /dev/null 2>&1; do :; done
	ip -"$family" route flush table 7892 > /dev/null 2>&1
done
ipset="/usr/sbin/ipset"
[ -x "$ipset" ] || ipset=ipset
for set in exodus_mac exodus_src4 exodus_src6 exodus_rsv4 exodus_rsv6 exodus_local4 exodus_local6; do
	"$ipset" destroy "$set" > /dev/null 2>&1
	"$ipset" destroy "${set}_new" > /dev/null 2>&1
done

# the lines of exodus in the user scripts, the lines of other addons are kept
for name in firewall-start nat-start unmount services-start service-event; do
	file="$EXODUS_JFFS/scripts/$name"
	[ -f "$file" ] || continue
	grep -v '# exodus$' "$file" > "$file.new"
	mv -f "$file.new" "$file"
	chmod 755 "$file"
done

rm -f "$EXODUS_OPT/etc/init.d/S99exodus"
rm -f "$EXODUS_OPT/bin/exodus"
rm -rf "$EXODUS_OPT/share/exodus"
rm -rf "$EXODUS_OPT/libexec/exodus"
rm -rf "$EXODUS_TMP"
if [ "$KEEP_CONFIG" != 1 ]; then
	rm -rf "$EXODUS_OPT/etc/exodus"
fi

echo "success"
