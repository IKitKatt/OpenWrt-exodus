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
