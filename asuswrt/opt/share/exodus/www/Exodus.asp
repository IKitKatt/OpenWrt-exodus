<!DOCTYPE html>
<!-- page:exodus -->
<html><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ASUS Wireless Router — Exodus</title>
<link rel="stylesheet" href="/index_style.css"><link rel="stylesheet" href="/form_style.css">
<link rel="stylesheet" href="/ext/exodus/style.css">
<script src="/state.js"></script><script src="/general.js"></script>
<script src="/popup.js"></script><script src="/help.js"></script>
<script src="/js/jquery.js"></script><script src="/js/httpApi.js"></script>
<script>window.ExodusBootstrap = {lang: '<% nvram_get("preferred_lang"); %>'};</script>
</head><body onload="show_menu();">
<div id="TopBanner"></div><div id="Loading" class="popup_bg"></div>
<iframe name="exodus_apply_frame" id="exodus_apply_frame" hidden></iframe>
<form id="exodus_apply" method="post" action="/start_apply.htm" target="exodus_apply_frame">
<input type="hidden" name="action_mode" value="apply">
<input type="hidden" name="action_script" value="restart_exodus_ui">
<input type="hidden" name="action_wait" value="1">
<input type="hidden" name="current_page"><input type="hidden" name="next_page">
<input type="hidden" name="amng_custom">
</form>
<table class="content" align="center" cellpadding="0" cellspacing="0"><tr>
<td width="17" valign="top"></td><td width="202" valign="top"><div id="mainMenu"></div><div id="subMenu"></div></td>
<td valign="top"><div id="tabMenu" class="submenuBlock"></div>
<main id="exodus-root" class="FormTitle">
<div class="exodus-heading"><strong>Exodus</strong><button id="lang-toggle" type="button">RU / EN</button><button id="about" type="button">About</button></div>
<nav id="menu" aria-label="Exodus"></nav><div id="content"></div>
<div id="save-bar" hidden></div><div id="toasts" aria-live="polite"></div>
<div id="dialog" hidden><div id="dialog-box" role="dialog" aria-modal="true"><button id="dialog-close" type="button" aria-label="Close">×</button><div id="dialog-content"></div></div></div>
</main></td><td width="10"></td></tr></table><div id="footer"></div>
<script src="/ext/exodus/i18n.js"></script><script src="/ext/exodus/merlin.js"></script><script src="/ext/exodus/app.js"></script>
</body></html>
