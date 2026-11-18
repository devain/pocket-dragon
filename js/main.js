/* Pocket Dragon — bootstrap. */
(function () {
  'use strict';
  function start() {
    window.PD.game = new window.PD.Game();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
