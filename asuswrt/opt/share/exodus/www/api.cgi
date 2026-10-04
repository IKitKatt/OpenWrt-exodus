#!/bin/sh

# backend of the web ui: POST json {"action": "...", ...}, answers json
# a session cookie is required for everything except login, the X-Exodus header keeps other sites out

# lighttpd runs cgi with a clean environment, the tree is found from the path of the script
case "$SCRIPT_FILENAME" in
	*/share/exodus/www/api.cgi) [ -n "$EXODUS_OPT" ] || EXODUS_OPT="${SCRIPT_FILENAME%/share/exodus/www/api.cgi}" ;;
esac

. "${EXODUS_OPT:-/opt}/share/exodus/lib/common.sh"

SESSION_TTL=43200
cookie=

reply() {
	printf 'Status: %s\r\nContent-Type: application/json\r\nCache-Control: no-store\r\nX-Content-Type-Options: nosniff\r\n' "$1"
	[ -n "$cookie" ] && printf 'Set-Cookie: %s; Path=/; HttpOnly; SameSite=Strict\r\n' "$cookie"
	printf '\r\n'
	cat
}

ok() {
	reply "200 OK"
}

fail() {
	jq -n --arg error "$2" '{error: $error}' | reply "$1"
	cleanup
	exit 0
}

cleanup() {
	rm -f "$req"
}

# field of the request as raw text
arg() {
	jq -j --arg key "$1" '.[$key] // "" | tostring' "$req"
}

session_token() {
	echo "$HTTP_COOKIE" | tr ';' '\n' | sed -n 's/^ *exodus_session=\([0-9a-f]\{32\}\) *$/\1/p' | head -n 1
}

session_valid() {
	local token expires now
	token=$(session_token)
	[ -n "$token" ] && [ -f "$SESSIONS_DIR/$token" ] || return 1
	expires=$(cat "$SESSIONS_DIR/$token" 2> /dev/null)
	now=$(date +%s)
	if [ -z "$expires" ] || [ "$expires" -lt "$now" ] 2> /dev/null; then
		rm -f "$SESSIONS_DIR/$token"
		return 1
	fi
	echo "$((now + SESSION_TTL))" > "$SESSIONS_DIR/$token"
}

password_valid() {
	local stored salt hash
	stored=$(cat "$AUTH_PATH" 2> /dev/null)
	[ -n "$stored" ] || return 1
	salt="${stored%%:*}"
	hash="${stored#*:}"
	# an empty hash would match the empty output of a missing sha256sum
	[ -n "$hash" ] || return 1
	[ "$( { printf '%s' "$salt"; jq -j ".$1 // \"\"" "$req"; } | sha256sum | cut -d ' ' -f 1)" = "$hash" ]
}

action_password() {
	local salt hash
	password_valid old || { sleep 2; fail "403 Forbidden" "wrong password"; }
	[ "$(jq -r '.new // "" | length' "$req")" -ge 4 ] || fail "400 Bad Request" "the password is too short"
	salt=$(random_hex 8)
	hash=$( { printf '%s' "$salt"; jq -j '.new' "$req"; } | sha256sum | cut -d ' ' -f 1)
	{ [ -n "$salt" ] && [ -n "$hash" ]; } || fail "500 Internal Server Error" "sha256sum is not found"
	umask 077
	echo "$salt:$hash" > "$AUTH_PATH"
	# other sessions end, this one stays
	token=$(session_token)
	find "$SESSIONS_DIR" -type f ! -name "$token" -exec rm -f {} + 2> /dev/null
	echo '{"success": true}' | ok
}

[ "$REQUEST_METHOD" = "POST" ] || { echo '{"error": "method not allowed"}' | reply "405 Method Not Allowed"; exit 0; }
[ "$HTTP_X_EXODUS" = "1" ] || { echo '{"error": "forbidden"}' | reply "403 Forbidden"; exit 0; }

mkdir -p "$SESSIONS_DIR" "$LOG_DIR"
req="$RUN_TMP/request.$$"
trap cleanup EXIT
head -c "${CONTENT_LENGTH:-0}" > "$req"
jq -e 'type == "object"' "$req" > /dev/null 2>&1 || fail "400 Bad Request" "invalid request"
action=$(arg action)

case "$action" in
	login)
		[ -f "$AUTH_PATH" ] || fail "403 Forbidden" "no password is set, run exodus passwd on the router"
		if ! password_valid password; then
			sleep 2
			fail "403 Forbidden" "wrong password"
		fi
		token=$(random_hex 16) || fail "500 Internal Server Error" "sha256sum is not found"
		echo "$(($(date +%s) + SESSION_TTL))" > "$SESSIONS_DIR/$token"
		cookie="exodus_session=$token"
		echo '{"success": true}' | ok
		exit 0
		;;
esac

session_valid || fail "401 Unauthorized" "unauthorized"

case "$action" in
	logout)
		token=$(session_token)
		rm -f "$SESSIONS_DIR/$token"
		cookie="exodus_session=; Max-Age=0"
		echo '{"success": true}' | ok ;;
	password) action_password ;;
	*)
		. "$LIB_DIR/api.sh"
		response="$RUN_TMP/cgi-response.$$"
		api_run "$req" "$response" || fail "500 Internal Server Error" "internal error"
		status=$(jq -r .status "$response")
		jq .data "$response" | reply "$status"
		rm -f "$response" ;;
esac
