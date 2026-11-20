/* OpenCode bridge for CEP: talks to the OpenCode background service over
   Node's http module (no CORS, no browser fetch) and manages the service. */
(function (global) {
  "use strict";

  var nodeRequire = (function () {
    if (typeof require === "function") {
      try {
        require("fs");
        return require;
      } catch (e) {}
    }
    if (global.cep_node && global.cep_node.require) {
      return function (m) {
        return global.cep_node.require(m);
      };
    }
    return null;
  })();

  var fs = nodeRequire ? nodeRequire("fs") : null;
  var path = nodeRequire ? nodeRequire("path") : null;
  var os = nodeRequire ? nodeRequire("os") : null;
  var http = nodeRequire ? nodeRequire("http") : null;
  var cp = nodeRequire ? nodeRequire("child_process") : null;

  var NPROC = typeof process !== "undefined" ? process : global.cep_node && global.cep_node.process;
  var BUF = typeof Buffer !== "undefined" ? Buffer : global.cep_node && global.cep_node.Buffer;
  var ENV = (NPROC && NPROC.env) || {};

  var svc = null;
  var starting = null;
  var AUTH_USER = "opencode";

  function stateDir() {
    var xdg = ENV.XDG_STATE_HOME;
    if (xdg && xdg.trim()) return path.join(xdg, "opencode");
    return path.join(os.homedir(), ".local", "state", "opencode");
  }

  function serviceFile() {
    return path.join(stateDir(), "service.json");
  }

  function readService() {
    try {
      var j = JSON.parse(fs.readFileSync(serviceFile(), "utf8"));
      if (j && j.url && j.password) return j;
    } catch (e) {}
    return null;
  }

  function authHeader(s) {
    return "Basic " + BUF.from(AUTH_USER + ":" + (s || svc).password).toString("base64");
  }

  function baseUrl(s) {
    return String((s || svc).url).replace(/\/+$/, "");
  }

  function queryString(query) {
    if (!query) return "";
    var parts = [];
    Object.keys(query).forEach(function (k) {
      var v = query[k];
      if (v === undefined || v === null) return;
      parts.push(encodeURIComponent(k) + "=" + encodeURIComponent(String(v)));
    });
    return parts.length ? "?" + parts.join("&") : "";
  }

  function makeErr(code, message) {
    var e = new Error(message || code);
    e.code = code;
    return e;
  }

  function requestOnce(target, method, p, opts) {
    opts = opts || {};
    return new Promise(function (resolve, reject) {
      var u = new URL(baseUrl(target) + p + queryString(opts.query));
      var body = opts.body === undefined ? null : JSON.stringify(opts.body);
      var headers = { authorization: authHeader(target), accept: "application/json" };
      if (body !== null) {
        headers["content-type"] = "application/json";
        headers["content-length"] = BUF.byteLength(body);
      }
      var req = http.request(
        {
          protocol: u.protocol,
          hostname: u.hostname,
          port: u.port,
          path: u.pathname + u.search,
          method: method,
          headers: headers
        },
        function (res) {
          var chunks = [];
          res.on("data", function (c) {
            chunks.push(c);
          });
          res.on("end", function () {
            var text = BUF.concat(chunks).toString("utf8");
            var json = null;
            if (text) {
              try {
                json = JSON.parse(text);
              } catch (e) {}
            }
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve({ status: res.statusCode, body: json, text: text });
            } else {
              var msg =
                (json && (json.message || (json.error && json.error.message))) ||
                text ||
                "HTTP " + res.statusCode;
              var err = makeErr(res.statusCode === 401 ? "unauthorized" : "http", String(msg).slice(0, 400));
              err.status = res.statusCode;
              err.body = json;
              reject(err);
            }
          });
        }
      );
      req.setTimeout(opts.timeout || 25000, function () {
        req.destroy(makeErr("timeout", "Request timed out"));
      });
      req.on("error", function (e) {
        reject(e && e.code ? makeErr(e.code, e.message) : e);
      });
      if (body !== null) req.write(body);
      req.end();
    });
  }

  function request(method, p, opts) {
    if (!svc) svc = readService();
    if (!svc) return Promise.reject(makeErr("no-service", "OpenCode service is not running"));
    return requestOnce(svc, method, p, opts).catch(function (e) {
      // passwords rotate when the service restarts; pick up the new one and retry once
      if (e && e.code === "unauthorized") {
        var fresh = readService();
        if (fresh && fresh.password) {
          svc = fresh;
          return requestOnce(svc, method, p, opts);
        }
      }
      throw e;
    });
  }

  function probe(target, timeout) {
    return new Promise(function (resolve) {
      if (!target) return resolve(false);
      var u = new URL(baseUrl(target) + "/api/info");
      var req = http.request(
        {
          hostname: u.hostname,
          port: u.port,
          path: u.pathname,
          method: "GET",
          headers: { authorization: authHeader(target) }
        },
        function (res) {
          res.resume();
          resolve(res.statusCode === 200);
        }
      );
      req.setTimeout(timeout || 1500, function () {
        req.destroy();
        resolve(false);
      });
      req.on("error", function () {
        resolve(false);
      });
      req.end();
    });
  }

  function findBinary() {
    var candidates = [];
    if (ENV.OPENCODE_BIN) candidates.push(ENV.OPENCODE_BIN);
    var appData = ENV.APPDATA;
    var home = os.homedir();
    if (appData) {
      candidates.push(path.join(appData, "npm", "opencode.cmd"));
      candidates.push(path.join(appData, "npm", "node_modules", "@opencode", "cli", "bin", "opencode.exe"));
      candidates.push(
        path.join(appData, "npm", "node_modules", "@opencode", "cli", "node_modules", "@opencode", "cli-windows-x64", "bin", "opencode.exe")
      );
    }
    candidates.push(path.join(home, ".cache", "opencode", "bin", "opencode.exe"));
    candidates.push(path.join(home, ".local", "bin", "opencode.exe"));
    for (var i = 0; i < candidates.length; i++) {
      try {
        if (fs.existsSync(candidates[i])) return candidates[i];
      } catch (e) {}
    }
    return null;
  }

  function spawnOpencode(args) {
    var bin = findBinary();
    if (!bin) throw makeErr("no-binary", "Could not find the opencode executable. Install it, or set OPENCODE_BIN.");
    var isCmd = /\.(cmd|bat)$/i.test(bin);
    var child = isCmd
      ? cp.spawn(ENV.ComSpec || "cmd.exe", ["/c", '"' + bin + '"'].concat(args), {
          windowsHide: true,
          detached: true,
          stdio: "ignore"
        })
      : cp.spawn(bin, args, { windowsHide: true, detached: true, stdio: "ignore" });
    child.unref();
    return child;
  }

  function wait(ms) {
    return new Promise(function (r) {
      setTimeout(r, ms);
    });
  }

  function note(fn, v) {
    try {
      fn && fn(v);
    } catch (e) {}
  }

  function ensureServer(onStatus) {
    if (svc && svc.ok && probe(svc, 800)) return Promise.resolve(svc);
    if (starting) return starting;
    starting = (async function () {
      var existing = readService();
      if (existing && (await probe(existing, 1200))) {
        svc = existing;
        svc.ok = true;
        note(onStatus, "connected");
        return svc;
      }
      note(onStatus, "starting");
      try {
        spawnOpencode(["service", "start"]);
      } catch (e) {
        starting = null;
        throw e;
      }
      var deadline = Date.now() + 45000;
      while (Date.now() < deadline) {
        await wait(700);
        var s = readService();
        if (s && (await probe(s, 1200))) {
          svc = s;
          svc.ok = true;
          note(onStatus, "connected");
          starting = null;
          return svc;
        }
      }
      starting = null;
      throw makeErr("start-failed", "OpenCode service did not start. Run `opencode service start` in a terminal, then retry.");
    })();
    return starting;
  }

  function restart(onStatus) {
    return (async function () {
      note(onStatus, "starting");
      svc = null;
      starting = null;
      try {
        spawnOpencode(["service", "restart"]);
      } catch (e) {}
      var deadline = Date.now() + 45000;
      while (Date.now() < deadline) {
        await wait(800);
        var s = readService();
        if (s && (await probe(s, 1200))) {
          svc = s;
          svc.ok = true;
          note(onStatus, "connected");
          return svc;
        }
      }
      throw makeErr("start-failed", "OpenCode service did not come back up.");
    })();
  }

  function info() {
    return request("GET", "/api/info").then(function (r) {
      return r.body;
    });
  }

  function listModels(dir) {
    return request("GET", "/api/model", { query: { "location[directory]": dir } }).then(function (r) {
      return (r.body && r.body.data) || [];
    });
  }

  function listAgents(dir) {
    return request("GET", "/api/agent", { query: { "location[directory]": dir } }).then(function (r) {
      return (r.body && r.body.data) || [];
    });
  }

  function listCommands(dir) {
    return request("GET", "/api/command", { query: { "location[directory]": dir } })
      .then(function (r) {
        return (r.body && r.body.data) || [];
      })
      .catch(function () {
        return [];
      });
  }

  function listSessions(dir, limit) {
    return request("GET", "/api/session", { query: { directory: dir, limit: limit || 50 } }).then(function (r) {
      return (r.body && r.body.data) || [];
    });
  }

  function createSession(dir, title, model) {
    return request("POST", "/api/session", {
      body: { title: title || null, location: { directory: dir }, model: model || null }
    }).then(function (r) {
      return r.body.data;
    });
  }

  function getSession(id) {
    return request("GET", "/api/session/" + encodeURIComponent(id)).then(function (r) {
      return r.body.data;
    });
  }

  function updateSession(id, patch) {
    return request("PATCH", "/api/session/" + encodeURIComponent(id), { body: patch }).then(function (r) {
      return r.body && r.body.data;
    });
  }

  function listMessages(id, limit) {
    return request("GET", "/api/session/" + encodeURIComponent(id) + "/message", { query: { limit: limit || 300 } }).then(
      function (r) {
        return (r.body && r.body.data) || [];
      }
    );
  }

  function prompt(id, text) {
    return request("POST", "/api/session/" + encodeURIComponent(id) + "/prompt", { body: { text: text } }).then(function (r) {
      return r.body.data;
    });
  }

  function runCommand(id, name, text) {
    return request("POST", "/api/session/" + encodeURIComponent(id) + "/command", { body: { name: name, text: text } });
  }

  function interrupt(id) {
    return request("POST", "/api/session/" + encodeURIComponent(id) + "/interrupt", { body: {} });
  }

  function setModel(id, model) {
    return request("POST", "/api/session/" + encodeURIComponent(id) + "/model", { body: { model: model } });
  }

  function listPermissions(id) {
    return request("GET", "/api/session/" + encodeURIComponent(id) + "/permission").then(function (r) {
      return (r.body && r.body.data) || [];
    });
  }

  function replyPermission(sid, rid, decision) {
    return request(
      "POST",
      "/api/session/" + encodeURIComponent(sid) + "/permission/" + encodeURIComponent(rid) + "/reply",
      { body: { decision: decision } }
    );
  }

  function listForms(sid) {
    return request("GET", "/api/session/" + encodeURIComponent(sid) + "/form").then(function (r) {
      return (r.body && r.body.data) || [];
    });
  }

  function replyForm(sid, fid, answer) {
    return request(
      "POST",
      "/api/session/" + encodeURIComponent(sid) + "/form/" + encodeURIComponent(fid) + "/reply",
      { body: { answer: answer } }
    );
  }

  function cancelForm(sid, fid, message) {
    return request("DELETE", "/api/session/" + encodeURIComponent(sid) + "/form/" + encodeURIComponent(fid), {
      query: { message: message || "Cancelled from the Premiere panel" }
    });
  }

  function listDiffs(sid) {
    return request("GET", "/api/session/" + encodeURIComponent(sid) + "/diff")
      .then(function (r) {
        return (r.body && r.body.data) || [];
      })
      .catch(function () {
        return [];
      });
  }

  function subscribe(onEvent, onState) {
    var closed = false;
    var current = null;
    var retry = null;

    function connect() {
      if (closed) return;
      if (!svc) {
        retry = setTimeout(connect, 1200);
        return;
      }
      var u = new URL(baseUrl() + "/api/event");
      var req = http.request(
        {
          hostname: u.hostname,
          port: u.port,
          path: u.pathname,
          method: "GET",
          headers: { authorization: authHeader(), accept: "text/event-stream" }
        },
        function (res) {
          if (res.statusCode !== 200) {
            res.resume();
            note(onState, "reconnecting");
            retry = setTimeout(connect, 2000);
            return;
          }
          note(onState, "live");
          var buf = "";
          res.setEncoding("utf8");
          res.on("data", function (chunk) {
            buf += chunk;
            var idx;
            while ((idx = buf.indexOf("\n")) >= 0) {
              var line = buf.slice(0, idx).replace(/\r$/, "");
              buf = buf.slice(idx + 1);
              if (line.slice(0, 5) !== "data:") continue;
              var raw = line.slice(5).trim();
              if (!raw) continue;
              var evt;
              try {
                evt = JSON.parse(raw);
              } catch (e) {
                continue;
              }
              try {
                onEvent(evt);
              } catch (e) {}
            }
          });
          res.on("end", function () {
            if (!closed) {
              note(onState, "reconnecting");
              retry = setTimeout(connect, 1500);
            }
          });
        }
      );
      req.on("error", function () {
        if (!closed) {
          note(onState, "reconnecting");
          retry = setTimeout(connect, 2000);
        }
      });
      req.end();
      current = req;
    }

    connect();

    return {
      close: function () {
        closed = true;
        if (retry) clearTimeout(retry);
        try {
          current && current.destroy();
        } catch (e) {}
      }
    };
  }

  function dirs() {
    var home = os.homedir();
    return { home: home, defaultDir: path.join(home, "Videos", "OpenCode") };
  }

  function ensureDir(dir) {
    try {
      if (dir && !fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      return true;
    } catch (e) {
      return false;
    }
  }

  function listDir(dir) {
    try {
      var names = fs.readdirSync(dir);
      var out = [];
      for (var i = 0; i < names.length && out.length < 400; i++) {
        var name = names[i];
        if (name === "." || name === "..") continue;
        var full = path.join(dir, name);
        var st = null;
        try {
          st = fs.statSync(full);
        } catch (e) {}
        out.push({
          name: name,
          path: full,
          dir: st ? st.isDirectory() : false,
          size: st ? st.size : 0,
          mtime: st ? st.mtimeMs : 0
        });
      }
      out.sort(function (a, b) {
        if (a.dir !== b.dir) return a.dir ? -1 : 1;
        return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1;
      });
      return { ok: true, entries: out };
    } catch (e) {
      return { ok: false, error: String(e && e.message ? e.message : e) };
    }
  }

  function reveal(target) {
    try {
      if (!target) return false;
      var isDir = false;
      try {
        isDir = fs.statSync(target).isDirectory();
      } catch (e) {}
      cp.spawn("explorer.exe", isDir ? [target] : ["/select,", target], { detached: true, stdio: "ignore" }).unref();
      return true;
    } catch (e) {
      return false;
    }
  }

  function browserUrl() {
    if (!svc) return "";
    var u = baseUrl();
    return u.replace("://", "://" + AUTH_USER + ":" + encodeURIComponent(svc.password) + "@") + "/";
  }

  function status() {
    return {
      url: svc ? baseUrl() : "",
      version: svc ? svc.version : "",
      pid: svc ? svc.pid : null,
      serviceFile: serviceFile()
    };
  }

  global.oc = {
    available: !!nodeRequire,
    ensureServer: ensureServer,
    restart: restart,
    info: info,
    listModels: listModels,
    listAgents: listAgents,
    listCommands: listCommands,
    listSessions: listSessions,
    createSession: createSession,
    getSession: getSession,
    updateSession: updateSession,
    listMessages: listMessages,
    prompt: prompt,
    runCommand: runCommand,
    interrupt: interrupt,
    setModel: setModel,
    listPermissions: listPermissions,
    replyPermission: replyPermission,
    listForms: listForms,
    replyForm: replyForm,
    cancelForm: cancelForm,
    listDiffs: listDiffs,
    subscribe: subscribe,
    dirs: dirs,
    ensureDir: ensureDir,
    listDir: listDir,
    reveal: reveal,
    browserUrl: browserUrl,
    status: status,
    servicePath: serviceFile
  };
})(window);
