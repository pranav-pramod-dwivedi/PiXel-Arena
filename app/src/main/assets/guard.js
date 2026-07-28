(function () {
  'use strict';

  var KEY = '_pa_sec';

  function isDevTools() {
    try {
      var e = new Error();
      if (!e.stack) return false;
      var lines = e.stack.split('\n');
      for (var i = 0; i < lines.length; i++) {
        if (lines[i].indexOf('debugger') !== -1) return true;
      }
    } catch (_) {}
    return false;
  }

  var DEBOUNCE = 0;
  document.addEventListener('keydown', function (e) {
    if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'C' || e.key === 'J')) || (e.ctrlKey && e.key === 'U')) {
      e.preventDefault();
      e.stopPropagation();
      var now = Date.now();
      if (now - DEBOUNCE > 500) {
        DEBOUNCE = now;
        try {
          var body = document.body;
          body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#05060E;color:#eef2ff;font-family:sans-serif;font-size:18px;font-weight:700">Access Denied</div>';
        } catch (_) {}
      }
      return false;
    }
  }, true);

  var checkInterval = setInterval(function () {
    if (isDevTools()) {
      clearInterval(checkInterval);
      try {
        document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#05060E;color:#eef2ff;font-family:sans-serif;font-size:18px;font-weight:700">DevTools Detected — Session Terminated</div>';
      } catch (_) {}
      try {
        if (window.NovaPay) { window.NovaPay.setBalanceCents(0); }
      } catch (_) {}
      try { sessionStorage.clear(); } catch (_) {}
      try { window.location.replace('login.html'); } catch (_) {}
    }
  }, 1200);

  if (document.hidden !== undefined) {
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        try { sessionStorage.setItem(KEY + '_away', Date.now()); } catch (_) {}
      } else {
        try {
          var away = parseInt(sessionStorage.getItem(KEY + '_away') || '0', 10);
          if (away && Date.now() - away > 120000) {
            try { sessionStorage.clear(); } catch (_) {}
            try { window.location.replace('login.html'); } catch (_) {}
          }
        } catch (_) {}
      }
    });
  }

  try {
    var noop = function () {};
    var noopFactory = function () { return noop; };
    var props = {
      configurable: false,
      enumerable: false,
      writable: false,
      value: noop
    };
    var g = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null);
    if (g) {
      if (g.console) {
        Object.defineProperty(g.console, 'log', props);
        Object.defineProperty(g.console, 'warn', props);
        Object.defineProperty(g.console, 'error', props);
        Object.defineProperty(g.console, 'debug', props);
        Object.defineProperty(g.console, 'info', props);
        Object.defineProperty(g.console, 'trace', props);
        Object.defineProperty(g.console, 'dir', props);
        Object.defineProperty(g.console, 'table', props);
      }
      try { Object.defineProperty(g, 'eval', { configurable: false, writable: false, value: noop }); } catch (_) {}
    }
  } catch (_) {}

  var origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function () {
    if (arguments[1] && typeof arguments[1] === 'string' && arguments[1].indexOf('firestore.googleapis.com') !== -1) {
      this._isFirestore = true;
    }
    return origOpen.apply(this, arguments);
  };

  var origSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function () {
    if (this._isFirestore) {
      var self = this;
      var origOnReady = this.onreadystatechange;
      this.onreadystatechange = function () {
        if (self.readyState === 4 && self.status === 200) {
          try {
            Object.defineProperty(self, 'responseText', {
              get: function () { return ''; },
              configurable: false
            });
            Object.defineProperty(self, 'response', {
              get: function () { return ''; },
              configurable: false
            });
          } catch (_) {}
        }
        if (origOnReady) origOnReady.apply(self, arguments);
      };
    }
    return origSend.apply(this, arguments);
  };

  try {
    var s = document.createElement('style');
    s.textContent = '::selection{background:transparent!important}::-webkit-scrollbar{width:0!important}';
    document.head.appendChild(s);
  } catch (_) {}

})();
