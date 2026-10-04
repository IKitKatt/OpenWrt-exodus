#!/bin/sh

# Exodus for Asuswrt-Merlin uninstaller
# KEEP_CONFIG=1 keeps /opt/etc/exodus (settings, profiles and subscriptions)
# packages of entware (curl, jq, lighttpd) are kept, other applications may use them

export PATH="/opt/bin:/opt/sbin:/sbin:/bin:/usr/sbin:/usr/bin"

# stop the proxy first, it removes the rules and the routes
if [ -x /opt/share/exodus/exodus ]; then
	/opt/share/exodus/exodus stop
	/opt/share/exodus/exodus web stop
fi

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
for file in /jffs/scripts/firewall-start /jffs/scripts/nat-start /jffs/scripts/unmount; do
	[ -f "$file" ] || continue
	grep -v '# exodus$' "$file" > "$file.new"
	mv -f "$file.new" "$file"
	chmod 755 "$file"
done

rm -f /opt/etc/init.d/S99exodus
rm -f /opt/bin/exodus
rm -rf /opt/share/exodus
rm -rf /opt/libexec/exodus
rm -rf /tmp/exodus
if [ "$KEEP_CONFIG" != 1 ]; then
	rm -rf /opt/etc/exodus
fi

echo "success"
