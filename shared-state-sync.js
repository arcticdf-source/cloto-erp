(function() {
  var config = window.__sharedStateConfig || null;
  if (!config) return;

  var exactKeys = Array.isArray(config.keys) ? config.keys.map(String) : [];
  var prefixes = Array.isArray(config.prefixes) ? config.prefixes.map(String) : [];
  if (!exactKeys.length && !prefixes.length) return;

  var exactMap = {};
  exactKeys.forEach(function(key) {
    exactMap[key] = true;
  });
  var apiBase = window.location.origin;

  function matchesKey(key) {
    if (!key) return false;
    if (exactMap[key]) return true;
    return prefixes.some(function(prefix) {
      return key.indexOf(prefix) === 0;
    });
  }

  function syncRequest(method, key, value) {
    if (!matchesKey(key)) return;

    var body = method !== "DELETE" ? JSON.stringify({ value: String(value == null ? "" : value) }) : undefined;
    var options = {
      method: method,
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      keepalive: !body || body.length < 48000
    };

    if (body !== undefined) {
      options.body = body;
    }

    fetch(apiBase + "/api/shared-state/" + encodeURIComponent(key), options).catch(function() {});
  }

  function fetchRemoteItems() {
    try {
      var xhr = new XMLHttpRequest();
      xhr.open("GET", apiBase + "/api/shared-state", false);
      xhr.setRequestHeader("Accept", "application/json");
      xhr.send(null);
      if (xhr.status < 200 || xhr.status >= 300) return {};
      var payload = JSON.parse(xhr.responseText || "{}");
      return payload && payload.items && typeof payload.items === "object" ? payload.items : {};
    } catch (error) {
      return {};
    }
  }

  var originalSetItem = localStorage.setItem.bind(localStorage);
  var originalRemoveItem = localStorage.removeItem.bind(localStorage);
  var remoteItems = fetchRemoteItems();

  Object.keys(remoteItems).forEach(function(key) {
    if (matchesKey(key)) {
      originalSetItem(key, String(remoteItems[key] == null ? "" : remoteItems[key]));
    }
  });

  exactKeys.forEach(function(key) {
    if (Object.prototype.hasOwnProperty.call(remoteItems, key)) return;
    var localValue = localStorage.getItem(key);
    if (localValue != null) {
      syncRequest("PUT", key, localValue);
    }
  });

  for (var index = 0; index < localStorage.length; index += 1) {
    var localKey = localStorage.key(index);
    if (!matchesKey(localKey)) continue;
    if (Object.prototype.hasOwnProperty.call(remoteItems, localKey)) continue;
    syncRequest("PUT", localKey, localStorage.getItem(localKey));
  }

  try {
    var storageProto = window.Storage && window.Storage.prototype;
    if (storageProto) {
      var protoSetItem = storageProto.setItem;
      var protoRemoveItem = storageProto.removeItem;

      storageProto.setItem = function(key, value) {
        protoSetItem.call(this, String(key), String(value));
        if (this === window.localStorage) {
          syncRequest("PUT", String(key), String(value));
        }
      };

      storageProto.removeItem = function(key) {
        protoRemoveItem.call(this, String(key));
        if (this === window.localStorage) {
          syncRequest("DELETE", String(key));
        }
      };
    }
  } catch (error) {}

  window.__sharedStateReady = true;
})();
