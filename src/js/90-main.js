/* 90-main.js — запуск. Lead. */
(function(){
'use strict';
var G = window.G = window.G || {};
function boot(){
  try { G.boot(); }
  catch(e){ console.error('[boot]', e); }
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
})();
