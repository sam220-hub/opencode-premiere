/* OpenCode panel for Premiere Pro (CEP). */
(function () {
  "use strict";

  /* ------------------------------------------------------------ utilities */

  var $ = function (id) {
    return document.getElementById(id);
  };

  var LS = {
    get: function (k, d) {
      try {
        var v = localStorage.getItem(k);
        return v === null ? d : v;
      } catch (e) {
        return d;
      }
    },
    set: function (k, v) {
      try {
        localStorage.setItem(k, v);
      } catch (e) {}
    },
    del: function (k) {
      try {
        localStorage.removeItem(k);
      } catch (e) {}
    }
  };

  var ICONS = {
    menu: ["M3 4h10", "M3 8h10", "M3 12h10"],
    plus: ["M8 3v10", "M3 8h10"],
    close: ["M4 4l8 8", "M12 4l-8 8"],
    send: ["M8 13V4", "M4 8l4-4 4 4"],
    stop: ["M5 5h6v6H5z"],
    diff: ["M4 2v12", "M4 5h4l3 3v6H4"],
    chev: ["M6 4l4 4-4 4"],
    search: ["M7 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10z", "M10.5 10.5L14 14"],
    folder: ["M2 4h5l1.5 2H14v8H2z"],
    file: ["M4 2h5l3 3v9H4z", "M9 2v3h3"],
    check: ["M3 8l3 3 7-7"],
    copy: ["M6 6h7v8H6z", "M3 3h7v3"],
    alert: ["M8 2l6 11H2z", "M8 6v3", "M8 11h.01"],
    refresh: ["M13 8a5 5 0 1 1-2-4", "M13 2v3h-3"],
    external: ["M6 3H3v10h10v-3", "M9 2h5v5", "M14 2L7.5 8.5"],
    todo: ["M2 4h2v2H2z", "M2 10h2v2H2z", "M6 5h8", "M6 11h8"],
    terminal: ["M3 3h10v10H3z", "M5 6l2 2-2 2", "M9 10h2"],
    read: ["M3 2h7l3 3v9H3z", "M6 8h4", "M6 11h4"],
    edit: ["M2 14l1-4 8-8 3 3-8 8z"],
    glob: ["M8 2a6 6 0 1 0 0 12 6 6 0 0 0 0-12z", "M2 8h12", "M8 2c2 2 2 10 0 12", "M8 2c-2 2-2 10 0 12"],
    web: ["M8 2a6 6 0 1 0 0 12 6 6 0 0 0 0-12z", "M2 8h12", "M8 2c2 2 2 10 0 12C6 12 6 4 8 2z"],
    spark: ["M8 1l1.4 5.6L15 8l-5.6 1.4L8 15l-1.4-5.6L1 8l5.6-1.4z"]
  };

  function icon(name, cls) {
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 16 16");
    if (cls) svg.setAttribute("class", cls);
    (ICONS[name] || []).forEach(function (d) {
      var p = document.createElementNS("http://www.w3.org/2000/svg", "path");
      p.setAttribute("d", d);
      svg.appendChild(p);
    });
    return svg;
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = String(text);
    return n;
  }

  function btn(label, cls, fn) {
    var b = el("button", cls, label);
    b.addEventListener("click", fn);
    return b;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function inlineMd(s) {
    var out = "";
    var parts = String(s).split("`");
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      if (i % 2 === 1) {
        out += "<code>" + p + "</code>";
        continue;
      }
      p = p.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
      p = p.replace(/(^|[\s(])\*([^*\n]+)\*/g, "$1<em>$2</em>");
      p = p.replace(/(^|[\s(])_([^_\n]+)_/g, "$1<em>$2</em>");
      p = p.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
      out += p;
    }
    return out;
  }

  function md(src) {
    var lines = String(src === undefined || src === null ? "" : src).split("\n");
    var html = "";
    var i = 0;
    var list = null;
    var para = [];

    function closeList() {
      if (list) {
        html += "</" + list + ">";
        list = null;
      }
    }
    function flushPara() {
      if (para.length) {
        html += "<p>" + para.join("<br>") + "</p>";
        para = [];
      }
    }

    while (i < lines.length) {
      var line = lines[i].replace(/\s+$/, "");

      if (/^\s*```/.test(line)) {
        flushPara();
        closeList();
        var code = [];
        i++;
        while (i < lines.length && !/^\s*```/.test(lines[i])) {
          code.push(lines[i]);
          i++;
        }
        i++;
        html += "<pre><code>" + escapeHtml(code.join("\n")) + "</code></pre>";
        continue;
      }

      if (!line.trim()) {
        flushPara();
        closeList();
        i++;
        continue;
      }

      if (/^#{1,6}\s+/.test(line)) {
        flushPara();
        closeList();
        var level = Math.min(3, line.match(/^#+/)[0].length);
        html += "<h" + level + ">" + inlineMd(escapeHtml(line.replace(/^#+\s+/, ""))) + "</h" + level + ">";
      } else if (/^\s*([-*+])\s+/.test(line)) {
        flushPara();
        if (list !== "ul") {
          closeList();
          html += "<ul>";
          list = "ul";
        }
        html += "<li>" + inlineMd(escapeHtml(line.replace(/^\s*[-*+]\s+/, ""))) + "</li>";
      } else if (/^\s*\d+[.)]\s+/.test(line)) {
        flushPara();
        if (list !== "ol") {
          closeList();
          html += "<ol>";
          list = "ol";
        }
        html += "<li>" + inlineMd(escapeHtml(line.replace(/^\s*\d+[.)]\s+/, ""))) + "</li>";
      } else if (/^\s*>\s?/.test(line)) {
        flushPara();
        closeList();
        html += "<blockquote>" + inlineMd(escapeHtml(line.replace(/^\s*>\s?/, ""))) + "</blockquote>";
      } else {
        closeList();
        para.push(inlineMd(escapeHtml(line)));
      }
      i++;
    }
    flushPara();
    closeList();
    return html;
  }

  function relTime(ts) {
    if (!ts) return "";
    var s = (Date.now() - ts) / 1000;
    if (s < 45) return "just now";
    if (s < 3600) return Math.max(1, Math.floor(s / 60)) + "m ago";
    if (s < 86400) return Math.floor(s / 3600) + "h ago";
    return Math.floor(s / 86400) + "d ago";
  }

  function tokenText(n) {
    n = n || 0;
    if (n < 1000) return String(n);
    if (n < 1000000) return (n / 1000).toFixed(n < 10000 ? 1 : 0) + "k";
    return (n / 1000000).toFixed(1) + "m";
  }

  function bytes(n) {
    if (!n) return "";
    if (n < 1024) return n + "B";
    if (n < 1048576) return Math.round(n / 1024) + "KB";
    return (n / 1048576).toFixed(1) + "MB";
  }

  function toast(msg, ok) {
    var t = $("toast");
    t.textContent = msg;
    t.className = "toast" + (ok ? " ok" : "");
    clearTimeout(toast._t);
    toast._t = setTimeout(function () {
      t.className = "toast hidden";
    }, 5200);
  }

  function errText(e) {
    if (!e) return "Unknown error";
    if (e.code === "unauthorized") return "Not authorized — the server password changed. Try Settings > Restart server.";
    if (e.code === "no-service") return "OpenCode service is not running.";
    return e.message || String(e);
  }

  function copyText(text) {
    try {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      toast("Copied", true);
    } catch (e) {
      toast("Could not copy");
    }
  }

  /* ---------------------------------------------------------------- state */

  var state = {
    dir: null,
    customDir: LS.get("oc.customDir", ""),
    project: { name: "", path: "", sequences: [], active: "" },
    sessionID: null,
    session: null,
    messages: [],
    live: null,
    sessions: [],
    models: [],
    model: null,
    commands: [],
    perms: [],
    forms: [],
    formDrafts: {},
    formErrors: {},
    focusField: null,
    promptKey: null,
    toolOpen: {},
    reasonOpen: {},
    busy: false,
    sending: false,
    connected: false,
    status: "starting",
    usage: { cost: 0, tokens: { input: 0, output: 0 } },
    lastUserText: "",
    startedAt: 0,
    lastEventAt: 0,
    sidebar: false,
    sheet: null,
    ctxOn: LS.get("oc.ctx", "1") === "1",
    files: { cwd: "", entries: [], ok: false },
    changes: null,
    sessionQuery: "",
    cmdIndex: 0,
    cmdFiltered: []
  };

  var stream = null;
  var refreshTimer = null;
  var statsTimer = null;
  var lastDirCheck = 0;
  var liveNodes = {};
  var lastPlanKey = "";
  var renderQueued = false;
  var busyWatch = null;

  /* ------------------------------------------------------------- host glue */

  function evalHost(script) {
    return new Promise(function (resolve) {
      if (!window.__adobe_cep__ || !window.__adobe_cep__.evalScript) return resolve(null);
      try {
        window.__adobe_cep__.evalScript(script, function (r) {
          resolve(r);
        });
      } catch (e) {
        resolve(null);
      }
    });
  }

  function loadProject() {
    return evalHost("OC_getProject()").then(function (raw) {
      if (!raw) return null;
      try {
        var j = JSON.parse(raw);
        if (!j || !j.ok) return null;
        state.project = {
          name: j.name || "",
          path: j.path || "",
          sequences: j.sequences || [],
          active: j.active || "",
          tree: j.tree || [],
          count: j.sequenceCount || (j.sequences || []).length
        };
        return state.project;
      } catch (e) {
        return null;
      }
    });
  }

  function openExternal(url) {
    try {
      if (window.__adobe_cep__ && window.__adobe_cep__.invokeSync) {
        window.__adobe_cep__.invokeSync("cep.util.openURLInDefaultBrowser", url);
        return;
      }
    } catch (e) {}
    window.open(url, "_blank");
  }

  /* --------------------------------------------------------------- status */

  function setStatus(s) {
    state.status = s;
    state.connected = s === "connected";
    var h = $("health");
    var cls = "health";
    if (state.busy) cls += " busy";
    else if (s === "connected") cls += " live";
    else if (s === "error") cls += " bad";
    h.className = cls;
    $("health-text").textContent = state.busy ? "working" : s === "connected" ? "ready" : s;
  }

  function setBusy(b) {
    state.busy = !!b;
    if (b && !state.startedAt) state.startedAt = Date.now();
    if (!b) state.startedAt = 0;
    $("btn-stop").classList.toggle("hidden", !state.busy);
    setStatus(state.status);
    updateSendState();
    renderStats();
  }

  function renderStats() {
    var parts = [];
    var t = state.usage.tokens || {};
    if (t.input || t.output) {
      parts.push(tokenText(t.input) + " in / " + tokenText(t.output) + " out");
    }
    if (state.usage.cost) {
      parts.push("$" + Number(state.usage.cost).toFixed(state.usage.cost < 1 ? 4 : 2));
    }
    if (state.busy && state.startedAt) {
      var secs = Math.floor((Date.now() - state.startedAt) / 1000);
      parts.push(secs < 60 ? secs + "s" : Math.floor(secs / 60) + "m " + (secs % 60) + "s");
    }
    var s = $("stats");
    s.innerHTML = parts.length
      ? parts
          .map(function (p) {
            return escapeHtml(p);
          })
          .join('<span class="sep">·</span>')
      : "";
  }

  function tick() {
    if (state.busy) renderStats();
  }

  /* ----------------------------------------------------------------- boot */

  function boot() {
    if (!window.oc || !oc.available) {
      fatal(
        "Node.js is not available in this panel. Make sure the extension loads with --enable-nodejs (it is in the manifest) and restart Premiere completely."
      );
      return;
    }

    document.querySelectorAll("[data-icon]").forEach(function (n) {
      n.appendChild(icon(n.getAttribute("data-icon")));
    });

    wire();
    setStatus("starting");
    renderProject();
    renderStats();
    statsTimer = setInterval(tick, 1000);

    loadProject().then(resolveDir).then(afterDir).catch(function (e) {
      setStatus("error");
      fatal(errText(e));
    });
  }

  function resolveDir() {
    if (state.customDir) return state.customDir;
    if (state.project && state.project.path) return state.project.path;
    return oc.dirs().defaultDir;
  }

  function afterDir(dir) {
    state.dir = dir;
    if (!state.customDir) oc.ensureDir(dir);
    renderTop();
    oc.ensureServer(setStatus)
      .then(afterConnect)
      .catch(function (e) {
        setStatus("error");
        fatal(errText(e));
      });
  }

  function afterConnect() {
    setStatus("connected");
    return oc
      .info()
      .then(function (info) {
        state.serverVersion = info && info.version;
        return Promise.all([
          loadModels(),
          loadCommands(),
          loadSessions(),
          loadProject().then(renderProject)
        ]);
      })
      .then(function () {
        var last = LS.get("oc.last:" + state.dir, "");
        if (last) {
          return openSession(last, true).catch(function () {
            renderAll();
          });
        }
        renderAll();
      })
      .then(function () {
        startStream();
        $("input").focus();
      });
  }

  function fatal(message) {
    var box = $("messages");
    box.innerHTML = "";
    var wrap = el("div", "empty-state");
    wrap.appendChild(el("div", "es-title", "OpenCode could not start"));
    wrap.appendChild(el("div", "es-body", message));
    var row = el("div", "row");
    var row2 = el("div", "erow");
    row2.style.justifyContent = "center";
    row2.appendChild(
      btn("Open settings", "btn", function () {
        openSheet("settings");
      })
    );
    row2.appendChild(
      btn("Retry", "btn primary", function () {
        boot();
      })
    );
    wrap.appendChild(row2);
    box.appendChild(wrap);
    setBusy(false);
  }

  /* --------------------------------------------------------------- the top */

  function renderTop() {
    var title = state.session && state.session.title ? state.session.title : "New session";
    $("session-title").textContent = title;
    var sub = state.customDir ? state.dir : state.project && state.project.name ? state.project.name : state.dir || "";
    $("session-sub").textContent = sub;
    $("session-sub").title = state.dir || "";
  }

  function renderProject() {
    var p = state.project || {};
    $("project-name").textContent = p.name || "No Premiere project";
    var meta = [];
    if (p.sequences && p.sequences.length) meta.push(p.sequences.length + " seq");
    if (p.active) meta.push(p.active);
    $("project-meta").textContent = meta.join(" · ");
    $("project-strip").classList.toggle("empty", !p.name);
    if (!$("project-detail").classList.contains("hidden")) renderProjectDetail();
  }

  function renderProjectDetail() {
    var box = $("project-detail");
    box.innerHTML = "";
    var p = state.project || {};

    box.appendChild(el("div", "path", p.path || "Project not saved yet — save it to give OpenCode a folder to work in."));

    var seqs = p.sequences || [];
    if (seqs.length) {
      var wrap = el("div", "row");
      seqs.forEach(function (s) {
        var b = el("button", "seq" + (s.name === p.active ? " active" : ""));
        b.appendChild(el("span", null, s.name));
        if (s.fps) b.appendChild(el("span", "fps", s.fps + "fps"));
        b.title = "Insert this sequence name";
        b.addEventListener("click", function () {
          insertText(s.name);
        });
        wrap.appendChild(b);
      });
      box.appendChild(wrap);
    }

    var row = el("div", "row");
    row.appendChild(
      btn("Reveal folder", "btn", function () {
        if (p.path) oc.reveal(p.path);
      })
    );
    row.appendChild(
      btn("Browse files", "btn", function () {
        openSheet("files");
      })
    );
    row.appendChild(
      btn("Refresh", "btn ghost", function () {
        loadProject().then(renderProject);
      })
    );
    box.appendChild(row);

    var tree = p.tree || [];
    if (tree.length) {
      var stats = projectStats();
      box.appendChild(
        el(
          "div",
          "tool-label",
          "project panel · " + stats.bins + " bins · " + stats.clips + " clips"
        )
      );
      var tw = el("div", "tree");
      (function walk(nodes, depth) {
        nodes.forEach(function (n) {
          if (!n) return;
          var r = el("div", "tree-row " + (n.type || "item"));
          r.style.paddingLeft = 4 + depth * 12 + "px";
          r.appendChild(icon(n.type === "bin" ? "folder" : n.type === "sequence" ? "todo" : "file"));
          r.appendChild(el("span", "tname", n.name || "(unnamed)"));
          r.title = n.media || n.name || "";
          if (n.type === "clip" || n.type === "sequence" || n.type === "bin") {
            r.addEventListener("click", function () {
              insertText(n.name);
            });
          }
          tw.appendChild(r);
          if (n.children && n.children.length) walk(n.children, depth + 1);
        });
      })(tree, 0);
      box.appendChild(tw);
    }
  }

  function projectStats() {
    var stats = { bins: 0, clips: 0, sequences: 0 };
    (function walk(nodes) {
      (nodes || []).forEach(function (n) {
        if (!n) return;
        if (n.type === "bin") stats.bins++;
        else if (n.type === "sequence") stats.sequences++;
        else if (n.type === "clip") stats.clips++;
        if (n.children) walk(n.children);
      });
    })(state.project && state.project.tree);
    return stats;
  }

  function insertText(text) {
    var input = $("input");
    var v = input.value;
    var sep = v && !/\s$/.test(v) ? " " : "";
    input.value = v + sep + text;
    input.focus();
    autosize();
  }

  /* ---------------------------------------------------------------- models */

  function modelKey(m) {
    if (!m) return "";
    return m.providerID + "/" + m.id + (m.variant ? "#" + m.variant : "");
  }

  function modelLabel(m) {
    if (!m) return "Default model";
    return m.name || m.id;
  }

  function loadModels() {
    return oc.listModels(state.dir).then(function (models) {
      state.models = (models || []).filter(function (m) {
        return m && m.enabled !== false;
      });
      if (!state.model) {
        try {
          var saved = JSON.parse(LS.get("oc.model", "null"));
          if (saved && saved.id) state.model = saved;
        } catch (e) {}
      }
      renderModelChip();
    });
  }

  function renderModelChip() {
    var chip = $("btn-model");
    chip.innerHTML = "";
    chip.appendChild(icon("spark"));
    chip.appendChild(el("span", null, modelLabel(state.model)));
    chip.title = state.model ? state.model.providerID + "/" + state.model.id : "Server default";
  }

  function loadCommands() {
    return oc.listCommands(state.dir).then(function (list) {
      state.commands = list || [];
    });
  }

  /* -------------------------------------------------------------- sessions */

  function loadSessions() {
    return oc
      .listSessions(state.dir, 60)
      .then(function (list) {
        state.sessions = (list || []).sort(function (a, b) {
          return ((b.time && b.time.updated) || 0) - ((a.time && a.time.updated) || 0);
        });
        if (state.sidebar) renderSidebar();
      })
      .catch(function () {});
  }

  function sessionTitle(s) {
    return (s && s.title) || "Untitled session";
  }

  function openSession(id, quiet) {
    return oc
      .getSession(id)
      .then(function (s) {
        if (!s || !s.id) throw new Error("Session not found");
        state.sessionID = s.id;
        state.session = s;
        state.live = null;
        liveNodes = {};
        state.toolOpen = {};
        state.reasonOpen = {};
        state.forms = [];
        state.formDrafts = {};
        state.perms = [];
        state.usage = {
          cost: s.cost || 0,
          tokens: s.tokens || { input: 0, output: 0 }
        };
        if (s.model && s.model.id) {
          state.model = s.model;
          renderModelChip();
        }
        LS.set("oc.last:" + state.dir, s.id);
        closeSidebar();
        closeSheet();
        return Promise.all([
          oc.listMessages(s.id, 300).then(function (list) {
            state.messages = list
              .map(normalize)
              .filter(Boolean)
              .reverse();
          }),
          oc.listPermissions(s.id).then(function (p) {
            state.perms = p || [];
          }),
          oc.listForms(s.id).then(function (f) {
            state.forms = f || [];
          })
        ]);
      })
      .then(function () {
        computeBusy();
        renderAll();
        scrollBottom();
        if (!quiet) $("input").focus();
      });
  }

  function computeBusy() {
    var list = state.messages;
    var last = list.length ? list[list.length - 1] : null;
    var busy = false;
    if (last) {
      if (last.role === "user") busy = true;
      else if (last.role === "assistant") busy = !(last.time && last.time.completed);
    }
    setBusy(busy);
    updateSendState();
  }

  function updateSendState() {
    var send = $("btn-send");
    if (!send) return;
    send.classList.toggle("hidden", state.busy);
    send.disabled = state.sending;
  }

  function newSession() {
    state.sessionID = null;
    state.session = null;
    state.messages = [];
    state.live = null;
    state.perms = [];
    state.forms = [];
    state.formDrafts = {};
    state.formErrors = {};
    state.usage = { cost: 0, tokens: { input: 0, output: 0 } };
    setBusy(false);
    closeSidebar();
    closeSheet();
    renderAll();
    $("input").focus();
  }

  function ensureSession() {
    if (state.sessionID) return Promise.resolve(state.sessionID);
    var title = state.project && state.project.name ? "Premiere — " + state.project.name : "Premiere session";
    return oc.createSession(state.dir, title, state.model).then(function (s) {
      state.sessionID = s.id;
      state.session = s;
      LS.set("oc.last:" + state.dir, s.id);
      renderTop();
      loadSessions();
      return s.id;
    });
  }

  /* -------------------------------------------------------------- sidebar */

  function openSidebar() {
    state.sidebar = true;
    renderSidebar();
    $("sidebar").classList.add("open");
    $("scrim").classList.add("open");
    $("input").blur();
  }

  function closeSidebar() {
    state.sidebar = false;
    $("sidebar").classList.remove("open");
    if (!state.sheet) $("scrim").classList.remove("open");
  }

  function dayGroup(ts) {
    if (!ts) return "Older";
    var now = new Date();
    var d = new Date(ts);
    var start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    if (ts >= start) return "Today";
    if (ts >= start - 86400000) return "Yesterday";
    if (ts >= start - 7 * 86400000) return "Previous 7 days";
    return "Older";
  }

  function renderSidebar() {
    var list = $("side-list");
    list.innerHTML = "";
    var q = state.sessionQuery.toLowerCase();
    var rows = state.sessions.filter(function (s) {
      return !q || sessionTitle(s).toLowerCase().indexOf(q) >= 0;
    });

    if (!rows.length) {
      list.appendChild(el("div", "side-group", q ? "No matches" : "No sessions yet"));
    }

    var groups = {};
    rows.forEach(function (s) {
      var g = dayGroup(s.time && s.time.updated);
      (groups[g] = groups[g] || []).push(s);
    });

    ["Today", "Yesterday", "Previous 7 days", "Older"].forEach(function (g) {
      if (!groups[g]) return;
      list.appendChild(el("div", "side-group", g));
      groups[g].forEach(function (s) {
        var row = el("div", "srow" + (s.id === state.sessionID ? " active" : ""));
        row.appendChild(el("div", "st", sessionTitle(s)));
        var meta = relTime(s.time && s.time.updated);
        if (s.model && s.model.id) meta += " · " + s.model.id;
        row.appendChild(el("div", "sm", meta));
        row.addEventListener("click", function () {
          openSession(s.id).catch(function (e) {
            toast("Could not open session: " + errText(e));
          });
        });
        list.appendChild(row);
      });
    });
  }

  /* --------------------------------------------------------------- events */

  function startStream() {
    if (stream) stream.close();
    stream = oc.subscribe(onEvent, function (s) {
      if (s === "live") {
        setStatus("connected");
        resync();
      } else {
        setStatus("reconnecting");
      }
    });
  }

  function resync() {
    if (!state.sessionID) return;
    refreshMessages(true);
    oc.listPermissions(state.sessionID).then(function (p) {
      state.perms = p || [];
      renderPrompts();
    });
    oc.listForms(state.sessionID).then(function (f) {
      state.forms = f || [];
      renderPrompts();
    });
    oc.getSession(state.sessionID)
      .then(function (s) {
        state.session = s;
        state.usage = { cost: s.cost || 0, tokens: s.tokens || state.usage.tokens };
        renderTop();
        renderStats();
      })
      .catch(function () {});
  }

  function hasMessage(id) {
    for (var i = 0; i < state.messages.length; i++) if (state.messages[i].id === id) return true;
    return false;
  }

  function findMessage(id) {
    for (var i = 0; i < state.messages.length; i++) if (state.messages[i].id === id) return state.messages[i];
    return null;
  }

  /* Deltas can arrive for a message that is already in the transcript (after a
     resync mid-stream). Patch it in place instead of dropping the text. */
  function patchLoadedPart(d, kind) {
    var m = findMessage(d.assistantMessageID);
    if (!m || m.role !== "assistant") return false;
    var parts = m.parts || (m.parts = []);
    var p = null;
    for (var i = parts.length - 1; i >= 0; i--) {
      if (parts[i].kind === kind) {
        p = parts[i];
        break;
      }
    }
    if (!p) {
      p = { kind: kind, text: "" };
      parts.push(p);
    }
    p.text += d.delta || "";
    m.finish = null;
    scheduleRender();
    return true;
  }

  function onEvent(e) {
    if (!e || !e.type) return;
    state.lastEventAt = Date.now();
    var d = e.data || {};

    if (e.type === "session.created" || e.type === "session.renamed" || e.type === "session.deleted") {
      loadSessions();
      return;
    }

    var sid = d.sessionID || (d.form && d.form.sessionID);
    if (sid && state.sessionID && sid !== state.sessionID) return;
    if (sid && !state.sessionID) return;

    if (d.assistantMessageID && hasMessage(d.assistantMessageID)) {
      if (e.type === "session.text.delta") {
        patchLoadedPart(d, "text");
        return;
      }
      if (e.type === "session.reasoning.delta") {
        patchLoadedPart(d, "reasoning");
        return;
      }
      if (e.type.indexOf("session.tool.") === 0) {
        updateLoadedTool(d);
        return;
      }
      if (/^session\.(text|reasoning)\.(started|ended)$/.test(e.type)) {
        scheduleRender();
        return;
      }
    }

    switch (e.type) {
      case "session.execution.started":
        setBusy(true);
        break;

      case "session.execution.succeeded":
      case "session.execution.failed":
      case "session.execution.interrupted":
        setBusy(false);
        refreshMessages();
        loadSessions();
        refreshSessionMeta();
        break;

      case "session.step.started":
        setBusy(true);
        if (!hasMessage(d.assistantMessageID)) ensureLive(d.assistantMessageID);
        scheduleRender();
        break;

      case "session.text.started": {
        var l1 = ensureLive(d.assistantMessageID);
        textPart(l1, d.ordinal);
        scheduleRender();
        break;
      }

      case "session.text.delta": {
        var l2 = ensureLive(d.assistantMessageID);
        var p2 = textPart(l2, d.ordinal);
        p2.text += d.delta || "";
        appendLive(d.assistantMessageID, d.ordinal, d.delta || "");
        break;
      }

      case "session.text.ended": {
        var l3 = ensureLive(d.assistantMessageID);
        var p3 = textPart(l3, d.ordinal);
        if (typeof d.text === "string") p3.text = d.text;
        scheduleRender();
        break;
      }

      case "session.reasoning.started": {
        var l4 = ensureLive(d.assistantMessageID);
        reasoningPart(l4, d.ordinal);
        scheduleRender();
        break;
      }

      case "session.reasoning.delta": {
        var l5 = ensureLive(d.assistantMessageID);
        var p5 = reasoningPart(l5, d.ordinal);
        p5.text += d.delta || "";
        scheduleRender();
        break;
      }

      case "session.reasoning.ended": {
        var l6 = ensureLive(d.assistantMessageID);
        var p6 = reasoningPart(l6, d.ordinal);
        if (typeof d.text === "string") p6.text = d.text;
        scheduleRender();
        break;
      }

      case "session.tool.called":
        upsertTool(d.id, d.name, "running", d.input);
        scheduleRender();
        break;

      case "session.tool.input.started":
        upsertTool(d.id, d.name, "running");
        scheduleRender();
        break;

      case "session.tool.input.ended":
        upsertTool(d.id, d.name, "running", parseMaybeJson(d.text));
        scheduleRender();
        break;

      case "session.tool.success":
        upsertTool(d.id, d.name, "completed", d.input, d.content, d.metadata);
        scheduleRender();
        break;

      case "session.tool.failed":
        upsertTool(d.id, d.name, "error", d.input, d.content, d.metadata, d.error);
        scheduleRender();
        break;

      case "session.retry.scheduled":
        setBusy(true);
        toast("Provider is busy — retrying…");
        break;

      case "session.usage.updated":
        state.usage = { cost: d.cost || state.usage.cost, tokens: d.tokens || state.usage.tokens };
        renderStats();
        break;

      case "permission.asked":
        addPermission(d);
        break;

      case "permission.replied":
        state.perms = state.perms.filter(function (x) {
          return x.id !== (d.requestID || d.id);
        });
        renderPrompts();
        break;

      case "form.created":
        if (d.form) {
          addForm(d.form);
        } else {
          refreshForms();
        }
        break;

      case "form.replied":
      case "form.cancelled":
        state.forms = state.forms.filter(function (f) {
          return f.id !== d.id;
        });
        delete state.formDrafts[d.id];
        renderPrompts();
        break;

      case "session.idle":
        setBusy(false);
        refreshMessages();
        break;

      default:
        break;
    }
  }

  /* ------------------------------------------------------------ live state */

  function ensureLive(aid) {
    if (!state.live || state.live.id !== aid) {
      state.live = { id: aid, role: "assistant", parts: [], live: true };
    }
    return state.live;
  }

  function textPart(live, ordinal) {
    var key = "text:" + ordinal;
    var p = live.parts.filter(function (x) {
      return x.key === key;
    })[0];
    if (!p) {
      p = { kind: "text", key: key, text: "" };
      live.parts.push(p);
    }
    return p;
  }

  function reasoningPart(live, ordinal) {
    var key = "reason:" + ordinal;
    var p = live.parts.filter(function (x) {
      return x.key === key;
    })[0];
    if (!p) {
      p = { kind: "reasoning", key: key, text: "" };
      live.parts.push(p);
    }
    return p;
  }

  function upsertTool(id, name, status, input, content, metadata, error) {
    if (!id) return;
    var live = state.live || ensureLive("live");
    var p = live.parts.filter(function (x) {
      return x.kind === "tool" && x.id === id;
    })[0];
    if (!p) {
      p = { kind: "tool", id: id, name: name || "tool", status: status, input: null };
      live.parts.push(p);
    }
    if (name) p.name = name;
    p.status = status;
    if (input !== undefined && input !== null) p.input = input;
    if (content) p.output = toolContentText(content) || p.output || "";
    if (error) p.output = error.message || error.type || String(error);
    if (metadata) {
      p.meta = metadata;
      var diff = metadata.diff || metadata.patch;
      if (typeof diff === "string" && diff) p.meta = metadata;
    }
  }

  function parseMaybeJson(text) {
    if (typeof text !== "string" || !text) return null;
    try {
      return JSON.parse(text);
    } catch (e) {
      return text;
    }
  }

  function toolContentText(content) {
    if (!content || !content.length) return "";
    return content
      .map(function (c) {
        if (!c) return "";
        if (c.type === "text") return c.text || "";
        if (c.type === "file") return "[file] " + (c.name || c.uri || "");
        return "";
      })
      .filter(Boolean)
      .join("\n");
  }

  function updateLoadedTool(d) {
    if (!d.id) return;
    state.messages.forEach(function (m) {
      if (m.role !== "assistant") return;
      (m.parts || []).forEach(function (p) {
        if (p.kind === "tool" && p.id === d.id) {
          if (d.name) p.name = d.name;
          if (d.input !== undefined && d.input !== null) p.input = d.input;
          if (d.content) p.output = toolContentText(d.content) || p.output || "";
          if (d.error) p.output = d.error.message || d.error.type || String(d.error);
          if (d.metadata) p.meta = d.metadata;
          if (d.type === "session.tool.success") p.status = "completed";
          else if (d.type === "session.tool.failed") p.status = "error";
          else if (d.type === "session.tool.called") p.status = "running";
        }
      });
    });
    scheduleRender();
  }

  function appendLive(aid, ordinal, delta) {
    if (!delta) return;
    var node = liveNodes[aid + ":" + ordinal];
    if (!node) {
      scheduleRender();
      return;
    }
    var text = document.createTextNode(delta);
    var caret = node.querySelector(".caret");
    if (caret) node.insertBefore(text, caret);
    else node.appendChild(text);
    maybeStick();
  }

  function refreshMessages(immediate) {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(
      function () {
        if (!state.sessionID) return;
        oc.listMessages(state.sessionID, 300)
          .then(function (list) {
            var fresh = list
              .map(normalize)
              .filter(Boolean)
              .reverse();

            // keep optimistic user messages the server has not echoed back yet,
            // but never show the same prompt twice
            var echoed = {};
            fresh.forEach(function (m) {
              if (m.role === "user") echoed[m.text] = true;
            });
            state.messages.forEach(function (m) {
              if (m.role === "user" && m.id.indexOf("local-") === 0 && !echoed[m.text]) {
                fresh.push(m);
                echoed[m.text] = true;
              }
            });

            state.messages = fresh;
            state.live = null;
            liveNodes = {};
            computeBusy();
            scheduleRender();
            scrollBottom();
          })
          .catch(function () {});
      },
      immediate ? 0 : 240
    );
  }

  function refreshSessionMeta() {
    if (!state.sessionID) return;
    oc.getSession(state.sessionID)
      .then(function (s) {
        state.session = s;
        state.usage = { cost: s.cost || state.usage.cost, tokens: s.tokens || state.usage.tokens };
        renderTop();
        renderStats();
      })
      .catch(function () {});
  }

  /* ------------------------------------------------------------ normalize */

  function normalize(m) {
    if (!m || !m.type) return null;
    if (m.type === "user") {
      return { id: m.id, role: "user", text: m.text || "", time: m.time && m.time.created };
    }
    if (m.type === "assistant") {
      var parts = [];
      (m.content || []).forEach(function (p) {
        if (!p || !p.type) return;
        if (p.type === "text") {
          parts.push({ kind: "text", text: p.text || "" });
        } else if (p.type === "reasoning") {
          parts.push({ kind: "reasoning", text: p.text || "" });
        } else if (p.type === "tool") {
          var st = p.state || {};
          parts.push({
            kind: "tool",
            id: p.id,
            name: p.name || "tool",
            status: st.status || "running",
            input: st.input,
            output: toolOutput(st),
            error: st.error,
            meta: st.metadata
          });
        }
      });
      return {
        id: m.id,
        role: "assistant",
        parts: parts,
        time: m.time || {},
        finish: m.finish,
        error: m.error,
        cost: m.cost,
        tokens: m.tokens,
        agent: m.agent,
        model: m.model
      };
    }
    if (m.type === "idle") {
      return {
        id: m.id,
        role: "idle",
        outcome: m.outcome,
        error: m.error,
        time: m.time && m.time.created
      };
    }
    if (m.type === "shell") {
      return {
        id: m.id,
        role: "shell",
        command: m.command,
        output: (m.output && m.output.output) || ""
      };
    }
    if (m.type === "compaction") {
      return {
        id: m.id,
        role: "compaction",
        status: m.status,
        reason: m.reason,
        summary: m.summary
      };
    }
    if (m.type === "system") {
      return { id: m.id, role: "system", text: m.text || "" };
    }
    if (m.type === "skill") {
      return { id: m.id, role: "skill", name: m.name || m.skill, text: m.text || "" };
    }
    return null;
  }

  function toolOutput(st) {
    if (!st) return "";
    if (st.content && st.content.length) {
      var out = st.content
        .map(function (c) {
          if (!c) return "";
          if (c.type === "text") return c.text || "";
          if (c.type === "file") return "[file] " + (c.name || c.uri || "");
          return "";
        })
        .filter(Boolean)
        .join("\n");
      if (out) return out;
    }
    if (st.error) return st.error.message || st.error.type || "Error";
    return "";
  }

  /* --------------------------------------------------------------- render */

  function scheduleRender() {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(function () {
      renderQueued = false;
      renderAll();
    });
  }

  function renderAll() {
    renderTop();
    renderMessages();
    renderPrompts();
    renderStats();
  }

  function atBottom() {
    var box = $("messages");
    return box.scrollHeight - box.scrollTop - box.clientHeight < 56;
  }

  function maybeStick() {
    if (atBottom()) {
      var box = $("messages");
      box.scrollTop = box.scrollHeight;
      $("jump").classList.add("hidden");
    } else {
      $("jump").classList.remove("hidden");
    }
  }

  function scrollBottom() {
    var box = $("messages");
    box.scrollTop = box.scrollHeight;
    $("jump").classList.add("hidden");
  }

  function renderMessages() {
    var box = $("messages");
    var stick = atBottom();
    box.innerHTML = "";
    liveNodes = {};

    var all = state.messages.slice();
    if (state.live) all.push(state.live);

    lastPlanKey = "";
    all.forEach(function (m) {
      (m.parts || []).forEach(function (p) {
        if (p.kind === "tool" && parseTodos(p)) lastPlanKey = m.id + ":" + p.id;
      });
    });

    if (!all.length) {
      box.appendChild(emptyState());
    } else {
      var frag = document.createDocumentFragment();
      all.forEach(function (m) {
        var n = messageNode(m);
        if (n) frag.appendChild(n);
      });
      box.appendChild(frag);
    }

    if (stick) box.scrollTop = box.scrollHeight;
    else $("jump").classList.remove("hidden");
  }

  function emptyState() {
    var wrap = el("div", "empty-state");
    wrap.appendChild(el("div", "es-title", state.sessionID ? "Session ready" : "What are we working on?"));
    var body = el("div", "es-body");
    body.innerHTML =
      "OpenCode can read and edit this project's folder, run commands, and plan the work.<br><br>" +
      "Type <kbd>/</kbd> for commands · <kbd>Shift</kbd>+<kbd>Enter</kbd> for a new line<br>" +
      "Turn on the <b>Project</b> chip to send your Premiere project context with each message.";
    wrap.appendChild(body);
    return wrap;
  }

  function messageNode(m) {
    if (m.role === "user") {
      var wrap = el("div", "msg user");
      wrap.appendChild(el("div", "bubble", m.text));
      return wrap;
    }

    if (m.role === "idle") {
      if (m.error) {
        var ew = el("div", "msg");
        var eb = el("div", "assistant-body");
        eb.appendChild(errorNode(m.error));
        ew.appendChild(eb);
        return ew;
      }
      var label =
        m.outcome === "failed" ? "Failed" : m.outcome === "interrupted" ? "Stopped" : "Done";
      var dv = el("div", "divider" + (m.outcome === "failed" ? " failed" : ""));
      dv.appendChild(el("span", null, label));
      return dv;
    }

    if (m.role === "compaction") {
      var dc = el("div", "divider");
      dc.appendChild(el("span", null, "Context compacted · " + (m.reason || "auto")));
      return dc;
    }

    if (m.role === "system" || m.role === "skill") {
      var ds = el("div", "divider");
      ds.appendChild(el("span", null, m.role === "skill" ? "skill · " + m.name : m.text.slice(0, 80)));
      return ds;
    }

    if (m.role === "shell") {
      var sh = el("div", "msg");
      var sbody = el("div", "assistant-body");
      var pre = el("div", "shell-out");
      pre.textContent = "$ " + (m.command || "") + "\n" + (m.output || "");
      sbody.appendChild(pre);
      sh.appendChild(sbody);
      return sh;
    }

    // assistant
    var msg = el("div", "msg" + (m.live ? " working" : "") + (m.error ? " errored" : ""));
    var who = el("div", "who");
    var av = el("span", "avatar", "oc");
    who.appendChild(av);
    who.appendChild(el("span", null, m.live ? "working" : "assistant"));
    if (m.model && m.model.id) who.appendChild(el("span", "model", m.model.id));
    var copier = el("button", "icon tiny");
    copier.appendChild(icon("copy"));
    copier.title = "Copy message";
    copier.addEventListener("click", function () {
      copyText(
        (m.parts || [])
          .map(function (p) {
            return p.kind === "text" ? p.text : "";
          })
          .join("\n\n")
      );
    });
    who.appendChild(copier);
    msg.appendChild(who);

    var body = el("div", "assistant-body");
    var parts = m.parts || [];
    if (!parts.length && m.live) {
      var wait = el("div", "md");
      wait.innerHTML = '<span class="caret"></span>';
      body.appendChild(wait);
    }

    parts.forEach(function (p, idx) {
      if (p.kind === "text") {
        var div = el("div", "md");
        div.innerHTML = md(p.text || "");
        if (m.live && idx === parts.length - 1) {
          div.appendChild(el("span", "caret"));
          if (p.key) liveNodes[m.id + ":" + (p.key.split(":")[1] || "0")] = div;
        }
        body.appendChild(div);
      } else if (p.kind === "reasoning") {
        body.appendChild(reasoningNode(m, p));
      } else if (p.kind === "tool") {
        var todos = parseTodos(p);
        if (todos && m.id + ":" + p.id === lastPlanKey) body.appendChild(planNode(todos));
        else body.appendChild(toolNode(m, p));
      }
    });

    if (m.error) body.appendChild(errorNode(m.error));

    msg.appendChild(body);
    return msg;
  }

  function reasoningNode(m, p) {
    var key = m.id + ":" + (p.key || "r");
    var open = !!state.reasonOpen[key];
    var wrap = el("div", "reasoning" + (open ? " open" : ""));
    var head = el("div", "reasoning-head");
    head.appendChild(icon("chev"));
    head.appendChild(el("span", null, p.text ? "Thought" : "Thinking…"));
    var bh = el("div", "reasoning-body");
    bh.textContent = p.text || "";
    head.addEventListener("click", function () {
      state.reasonOpen[key] = !state.reasonOpen[key];
      wrap.classList.toggle("open");
    });
    wrap.appendChild(head);
    wrap.appendChild(bh);
    return wrap;
  }

  var TOOL_META = {
    read: { label: "read", icon: "read" },
    write: { label: "write", icon: "edit" },
    edit: { label: "edit", icon: "edit" },
    patch: { label: "patch", icon: "edit" },
    bash: { label: "shell", icon: "terminal" },
    shell: { label: "shell", icon: "terminal" },
    grep: { label: "search", icon: "search" },
    glob: { label: "find", icon: "glob" },
    list: { label: "list", icon: "folder" },
    ls: { label: "list", icon: "folder" },
    webfetch: { label: "fetch", icon: "web" },
    websearch: { label: "web", icon: "web" },
    todowrite: { label: "plan", icon: "todo" },
    task: { label: "agent", icon: "spark" },
    lsp: { label: "lsp", icon: "read" },
    skill: { label: "skill", icon: "spark" }
  };

  function toolNode(m, p) {
    var key = m.id + ":" + p.id;
    var open = !!state.toolOpen[key];
    var meta = TOOL_META[p.name] || { label: p.name, icon: "read" };
    var card = el("div", "tool " + (p.status || "running") + (open ? " open" : ""));

    var head = el("div", "tool-head");
    var ic = el("span", "tool-ico");
    ic.appendChild(icon(meta.icon));
    head.appendChild(ic);
    head.appendChild(el("span", "tool-name", meta.label));
    var sum = toolSummary(p);
    if (sum) head.appendChild(el("span", "tool-sum", sum));
    head.appendChild(el("span", "tool-status", statusLabel(p.status)));
    head.addEventListener("click", function () {
      state.toolOpen[key] = !state.toolOpen[key];
      card.classList.toggle("open");
    });
    card.appendChild(head);

    var body = el("div", "tool-body");
    var inputText = prettyInput(p.input);
    if (inputText) {
      body.appendChild(el("div", "tool-label", "input"));
      var inPre = el("pre", null, clip(inputText, 6000));
      body.appendChild(inPre);
    }
    var diff = findDiff(p);
    if (diff) {
      body.appendChild(el("div", "tool-label", "diff"));
      body.appendChild(diffNode(diff));
    }
    if (p.output) {
      body.appendChild(el("div", "tool-label", p.status === "error" ? "error" : "output"));
      body.appendChild(el("pre", null, clip(p.output, 12000)));
    }
    if (!inputText && !p.output && !diff) {
      body.appendChild(el("div", "empty", "No details available."));
    }
    card.appendChild(body);
    return card;
  }

  function statusLabel(s) {
    if (s === "completed") return "done";
    if (s === "error") return "error";
    if (s === "streaming") return "input";
    return "running";
  }

  function toolSummary(p) {
    var input = p.input;
    if (typeof input === "string") {
      try {
        input = JSON.parse(input);
      } catch (e) {
        return input.slice(0, 200);
      }
    }
    if (!input || typeof input !== "object") return "";
    var keys = ["command", "filePath", "path", "file", "pattern", "query", "description", "url", "task"];
    for (var i = 0; i < keys.length; i++) {
      var v = input[keys[i]];
      if (typeof v === "string" && v) return v.slice(0, 220);
    }
    if (Array.isArray(input.paths)) return input.paths.join(", ").slice(0, 220);
    if (Array.isArray(input.files)) return input.files.join(", ").slice(0, 220);
    return "";
  }

  function prettyInput(input) {
    if (input === undefined || input === null || input === "") return "";
    if (typeof input === "string") return input;
    try {
      return JSON.stringify(input, null, 2);
    } catch (e) {
      return String(input);
    }
  }

  function clip(s, n) {
    s = String(s);
    if (s.length <= n) return s;
    return s.slice(0, n) + "\n… (" + (s.length - n) + " more characters)";
  }

  function findDiff(p) {
    var m = p.meta || {};
    var cand = m.diff || m.patch || m.fileDiff;
    if (typeof cand === "string") return cand;
    if (cand && typeof cand === "object") return cand.patch || cand.diff || "";
    if (p.input && typeof p.input === "object" && typeof p.input.patch === "string") return p.input.patch;
    return "";
  }

  function diffNode(patch) {
    var box = el("div", "diff");
    String(patch)
      .split("\n")
      .slice(0, 400)
      .forEach(function (line) {
        var row = el("div");
        if (line.indexOf("@@") === 0) row.className = "hunk";
        else if (line.charAt(0) === "+" && line.indexOf("+++") !== 0) row.className = "add";
        else if (line.charAt(0) === "-" && line.indexOf("---") !== 0) row.className = "del";
        else if (/^(diff --git|index |---|\+\+\+)/.test(line)) row.className = "meta";
        row.textContent = line || " ";
        box.appendChild(row);
      });
    return box;
  }

  /* ----------------------------------------------------------------- plan */

  function parseTodos(p) {
    if (!p || p.kind !== "tool") return null;
    if (!TOOL_META[p.name] || TOOL_META[p.name].label !== "plan") return null;
    var input = p.input;
    if (typeof input === "string") {
      try {
        input = JSON.parse(input);
      } catch (e) {
        return null;
      }
    }
    if (!input || typeof input !== "object") return null;
    var list = input.todos || input.items || input.plan;
    if (!Array.isArray(list) || !list.length) return null;
    return list.map(function (t, i) {
      if (typeof t === "string") return { text: t, status: "pending" };
      return {
        text: t.content || t.title || t.text || t.activeForm || "Step " + (i + 1),
        status: todoStatus(t.status)
      };
    });
  }

  function todoStatus(s) {
    if (s === "completed" || s === "done") return "completed";
    if (s === "in_progress" || s === "in-progress" || s === "active" || s === "running") return "in_progress";
    if (s === "cancelled" || s === "canceled") return "cancelled";
    return "pending";
  }

  function planNode(todos) {
    var done = todos.filter(function (t) {
      return t.status === "completed";
    }).length;
    var card = el("div", "plan");
    var head = el("div", "plan-head");
    head.appendChild(icon("todo"));
    head.appendChild(el("span", null, "Plan"));
    head.appendChild(el("span", "count", done + "/" + todos.length));
    card.appendChild(head);
    todos.forEach(function (t) {
      var row = el("div", "plan-item " + t.status);
      var mark = el("span", "mark");
      if (t.status === "completed") mark.appendChild(icon("check"));
      row.appendChild(mark);
      row.appendChild(el("span", null, t.text));
      card.appendChild(row);
    });
    return card;
  }

  function errorNode(err) {
    var box = el("div", "errbox");
    box.appendChild(el("div", "etitle", err.type || "Error"));
    box.appendChild(el("div", "emsg", err.message || String(err)));
    var row = el("div", "erow");
    row.appendChild(
      btn("Retry", "btn", function () {
        if (state.lastUserText) {
          sendText(state.lastUserText);
        }
      })
    );
    row.appendChild(
      btn("Copy", "btn ghost", function () {
        copyText(err.message || String(err));
      })
    );
    box.appendChild(row);
    return box;
  }

  /* -------------------------------------------------------------- prompts */

  function renderPrompts() {
    var box = $("prompts");
    var key =
      state.forms
        .map(function (f) {
          return f.id;
        })
        .join(",") +
      "|" +
      state.perms
        .map(function (p) {
          return p.id;
        })
        .join(",");
    var changed = key !== state.promptKey;
    state.promptKey = key;

    box.innerHTML = "";
    state.forms.forEach(function (f) {
      box.appendChild(formNode(f));
    });
    state.perms.forEach(function (p) {
      box.appendChild(permNode(p));
    });

    if (changed) box.scrollTop = 0;
  }

  function addForm(f) {
    if (!f || !f.id) return;
    if (
      state.forms.some(function (x) {
        return x.id === f.id;
      })
    )
      return;
    state.forms.push(f);
    renderPrompts();
    toast("OpenCode has a question");
  }

  function refreshForms() {
    if (!state.sessionID) return;
    oc.listForms(state.sessionID).then(function (f) {
      state.forms = f || [];
      renderPrompts();
    });
  }

  function fieldVisible(f, draft) {
    var when = f.when;
    if (!when) return true;
    var arr = Array.isArray(when) ? when : [when];
    for (var i = 0; i < arr.length; i++) {
      var c = arr[i];
      if (!c) continue;
      var left = draft[c.key];
      if (typeof left === "boolean") left = left ? "true" : "false";
      var right = typeof c.value === "boolean" ? (c.value ? "true" : "false") : c.value;
      var eq = String(left === undefined ? "" : left) === String(right);
      if (c.op === "eq" && !eq) return false;
      if (c.op === "neq" && eq) return false;
    }
    return true;
  }

  function draftFor(id, form) {
    if (!state.formDrafts[id]) {
      var d = {};
      ((form && form.fields) || []).forEach(function (f) {
        if (f && f.key && f.default !== undefined) d[f.key] = f.default;
      });
      state.formDrafts[id] = d;
    }
    return state.formDrafts[id];
  }

  function visFields(f) {
    var draft = draftFor(f.id, f);
    return (f.fields || []).filter(function (x) {
      return x && !x.hidden && fieldVisible(x, draft);
    });
  }

  function formNode(form) {
    var card = el("div", "qcard");
    var head = el("div", "qhead");
    head.appendChild(el("div", "qtag", "question"));
    head.appendChild(el("div", "qtitle", form.title || "A quick question"));
    card.appendChild(head);

    var body = el("div", "qbody");
    var draft = draftFor(form.id, form);
    var errs = state.formErrors[form.id] || {};
    var fields = visFields(form);

    if (!fields.length) body.appendChild(el("div", "field-desc", "No answer needed."));

    fields.forEach(function (f) {
      body.appendChild(fieldNode(form, f, draft, errs));
    });
    card.appendChild(body);

    var foot = el("div", "qfoot");
    foot.appendChild(
      btn("Submit", "btn primary", function () {
        submitForm(form);
      })
    );
    foot.appendChild(
      btn("Skip", "btn ghost", function () {
        oc.cancelForm(form.sessionID || state.sessionID, form.id, "Skipped from the Premiere panel")
          .then(function () {
            state.forms = state.forms.filter(function (x) {
              return x.id !== form.id;
            });
            renderPrompts();
          })
          .catch(function (e) {
            toast("Could not skip: " + errText(e));
          });
      })
    );
    card.appendChild(foot);
    return card;
  }

  function fieldNode(form, f, draft, errs) {
    var wrap = el("div", "field");
    var label = el("div", "field-label", f.title || f.key);
    if (f.required) label.appendChild(el("span", "req", "*"));
    wrap.appendChild(label);
    if (f.description) wrap.appendChild(el("div", "field-desc", f.description));

    function remember(v) {
      draft[f.key] = v;
      state.focusField = f.key;
    }

    if (f.type === "external") {
      var link = el("div", "row");
      link.appendChild(
        btn("Open link", "btn", function () {
          openExternal(f.url);
        })
      );
      wrap.appendChild(link);
      return wrap;
    }

    if (f.type === "string") {
      if (f.options && f.options.length) {
        var sel = document.createElement("select");
        var emptyOpt = el("option", null, f.placeholder || "Choose…");
        emptyOpt.value = "";
        sel.appendChild(emptyOpt);
        f.options.forEach(function (o) {
          var opt = el("option", null, o.label || o.value);
          opt.value = o.value;
          sel.appendChild(opt);
        });
        if (f.custom) {
          var other = el("option", null, "Other…");
          other.value = "__other";
          sel.appendChild(other);
        }
        sel.value = draft[f.key] || "";
        sel.addEventListener("change", function () {
          remember(sel.value);
          if (f.custom && sel.value === "__other") {
            renderPrompts();
            var inp = document.querySelector('[data-field="' + form.id + ":" + f.key + ':custom"]');
            if (inp) inp.focus();
          } else {
            renderPrompts();
          }
        });
        sel.setAttribute("data-field", form.id + ":" + f.key);
        wrap.appendChild(sel);
        if (f.custom && (draft[f.key] === "__other" || (draft[f.key + "__custom"] !== undefined && draft[f.key] === "__other"))) {
          var ci = document.createElement("input");
          ci.type = "text";
          ci.placeholder = "Type your answer";
          ci.value = draft[f.key + "__custom"] || "";
          ci.setAttribute("data-field", form.id + ":" + f.key + ":custom");
          ci.addEventListener("input", function () {
            draft[f.key + "__custom"] = ci.value;
          });
          wrap.appendChild(ci);
        }
      } else {
        var inp = document.createElement("input");
        inp.type = f.format === "email" ? "email" : f.format === "uri" ? "url" : "text";
        inp.placeholder = f.placeholder || "";
        inp.value = draft[f.key] || "";
        inp.setAttribute("data-field", form.id + ":" + f.key);
        inp.addEventListener("input", function () {
          draft[f.key] = inp.value;
        });
        wrap.appendChild(inp);
      }
    } else if (f.type === "number" || f.type === "integer") {
      var num = document.createElement("input");
      num.type = "number";
      if (f.minimum !== undefined) num.min = f.minimum;
      if (f.maximum !== undefined) num.max = f.maximum;
      if (f.type === "integer") num.step = "1";
      num.value = draft[f.key] === undefined ? "" : draft[f.key];
      num.setAttribute("data-field", form.id + ":" + f.key);
      num.addEventListener("input", function () {
        draft[f.key] = num.value;
      });
      wrap.appendChild(num);
    } else if (f.type === "boolean") {
      var rowB = el("label", "opt");
      var cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = draft[f.key] === true || draft[f.key] === "true";
      cb.addEventListener("change", function () {
        remember(cb.checked);
        renderPrompts();
      });
      rowB.appendChild(cb);
      rowB.appendChild(el("span", null, "Yes"));
      wrap.appendChild(rowB);
    } else if (f.type === "multiselect") {
      var chosen = Array.isArray(draft[f.key]) ? draft[f.key].slice() : [];
      (f.options || []).forEach(function (o) {
        var row = el("label", "opt");
        var cbx = document.createElement("input");
        cbx.type = "checkbox";
        cbx.value = o.value;
        cbx.checked = chosen.indexOf(o.value) >= 0;
        cbx.addEventListener("change", function () {
          var idx = chosen.indexOf(o.value);
          if (cbx.checked && idx < 0) chosen.push(o.value);
          if (!cbx.checked && idx >= 0) chosen.splice(idx, 1);
          draft[f.key] = chosen.slice();
          state.focusField = f.key;
          renderPrompts();
        });
        row.appendChild(cbx);
        var lab = el("span");
        lab.appendChild(el("div", null, o.label || o.value));
        if (o.description) lab.appendChild(el("div", "od", o.description));
        row.appendChild(lab);
        wrap.appendChild(row);
      });
    }

    if (errs[f.key]) wrap.appendChild(el("div", "field-error", errs[f.key]));
    return wrap;
  }

  function submitForm(form) {
    var draft = draftFor(form.id, form);
    var answers = {};
    var errors = {};
    visFields(form).forEach(function (f) {
      if (f.type === "external") return;
      var raw = draft[f.key];
      var has = raw !== undefined && raw !== null && raw !== "" && (!Array.isArray(raw) || raw.length);
      if (f.required && !has) {
        errors[f.key] = "This is required";
        return;
      }
      if (!has) return;
      if (f.type === "number" || f.type === "integer") {
        var n = Number(raw);
        var min = Number(f.minimum);
        var max = Number(f.maximum);
        if (isNaN(n)) errors[f.key] = "Enter a number";
        else if (f.type === "integer" && Math.floor(n) !== n) errors[f.key] = "Enter a whole number";
        else if (isFinite(min) && n < min) errors[f.key] = "Must be at least " + f.minimum;
        else if (isFinite(max) && n > max) errors[f.key] = "Must be at most " + f.maximum;
        else answers[f.key] = n;
      } else if (f.type === "boolean") {
        answers[f.key] = raw === true || raw === "true";
      } else if (f.type === "multiselect") {
        var arr = Array.isArray(raw) ? raw : [];
        if (f.minItems && arr.length < f.minItems) errors[f.key] = "Select at least " + f.minItems;
        else if (f.maxItems && arr.length > f.maxItems) errors[f.key] = "Select at most " + f.maxItems;
        else answers[f.key] = arr;
      } else {
        var s = String(raw === "__other" ? draft[f.key + "__custom"] || "" : raw);
        if (f.minLength && s.length < f.minLength) errors[f.key] = "At least " + f.minLength + " characters";
        else if (f.maxLength && s.length > f.maxLength) errors[f.key] = "At most " + f.maxLength + " characters";
        else if (f.pattern) {
          var re = null;
          try {
            re = new RegExp(f.pattern);
          } catch (e) {}
          if (re && !re.test(s)) errors[f.key] = "Does not match the expected format";
          else answers[f.key] = s;
        } else answers[f.key] = s;
      }
    });

    state.formErrors[form.id] = errors;
    if (Object.keys(errors).length) {
      renderPrompts();
      toast("Please answer the required fields");
      return;
    }

    oc.replyForm(form.sessionID || state.sessionID, form.id, answers)
      .then(function () {
        state.forms = state.forms.filter(function (x) {
          return x.id !== form.id;
        });
        delete state.formDrafts[form.id];
        delete state.formErrors[form.id];
        renderPrompts();
        toast("Answer sent", true);
      })
      .catch(function (e) {
        toast("Could not send answer: " + errText(e));
      });
  }

  function permNode(p) {
    var card = el("div", "perm");
    card.appendChild(el("div", "paction", "permission · " + (p.action || "action")));
    card.appendChild(el("div", "ptitle", permTitle(p)));
    var res = (p.resources || []).join("\n");
    if (res) card.appendChild(el("div", "pres", res));
    var row = el("div", "prow");
    row.appendChild(
      btn("Allow once", "btn primary", function () {
        replyPerm(p, "once");
      })
    );
    row.appendChild(
      btn("Always", "btn", function () {
        replyPerm(p, "always");
      })
    );
    row.appendChild(
      btn("Deny", "btn danger", function () {
        replyPerm(p, "reject");
      })
    );
    card.appendChild(row);
    return card;
  }

  function permTitle(p) {
    var map = {
      bash: "Run a shell command",
      edit: "Edit a file",
      write: "Write a file",
      read: "Read a file",
      webfetch: "Fetch a URL",
      websearch: "Search the web",
      external_directory: "Access a folder outside the project",
      task: "Launch a sub-agent"
    };
    return map[p.action] || "Allow " + (p.action || "this action") + "?";
  }

  function addPermission(p) {
    if (!p || !p.id) return;
    if (
      state.perms.some(function (x) {
        return x.id === p.id;
      })
    )
      return;
    state.perms.push(p);
    renderPrompts();
    toast("OpenCode needs permission");
  }

  function replyPerm(p, decision) {
    oc.replyPermission(p.sessionID || state.sessionID, p.id, decision)
      .then(function () {
        state.perms = state.perms.filter(function (x) {
          return x.id !== p.id;
        });
        renderPrompts();
      })
      .catch(function (e) {
        toast("Permission reply failed: " + errText(e));
      });
  }

  /* -------------------------------------------------------------- composer */

  function autosize() {
    var input = $("input");
    input.style.height = "auto";
    input.style.height = Math.min(140, Math.max(26, input.scrollHeight)) + "px";
  }

  function projectContext(text) {
    if (!state.ctxOn) return text;
    var p = state.project || {};
    if (!p.name) return text;
    var seqs = (p.sequences || [])
      .slice(0, 12)
      .map(function (s) {
        return s.name + (s.fps ? " (" + s.fps + " fps)" : "");
      })
      .join(", ");
    var stats = projectStats();
    var head =
      "[Premiere project: " +
      p.name +
      " | folder: " +
      (p.path || "unsaved") +
      (p.active ? " | open sequence: " + p.active : "") +
      (seqs ? " | sequences: " + seqs : "") +
      (p.tree && p.tree.length
        ? " | project panel: " + stats.bins + " bins, " + stats.clips + " clips"
        : "") +
      "]";
    return head + "\n\n" + text;
  }

  function send() {
    var input = $("input");
    var text = input.value.trim();
    if (!text || state.sending) return;

    input.value = "";
    autosize();
    hideCmd();

    var cmd = matchCommand(text);
    if (cmd) {
      var args = text.slice(cmd.name.length + 1).trim();
      state.lastUserText = args || cmd.name;
      state.messages.push({ id: "local-" + Date.now(), role: "user", text: text, time: Date.now() });
      setBusy(true);
      state.sending = true;
      updateSendState();
      renderMessages();
      scrollBottom();
      ensureSession()
        .then(function (sid) {
          return oc.runCommand(sid, cmd.name, args);
        })
        .then(function () {
          state.sending = false;
          updateSendState();
          loadSessions();
        })
        .catch(function (e) {
          state.sending = false;
          updateSendState();
          setBusy(false);
          toast("Command failed: " + errText(e));
          refreshMessages(true);
        });
      return;
    }

    sendText(text);
  }

  function sendText(text) {
    if (!text || state.sending) return;
    state.sending = true;
    state.lastUserText = text;
    state.messages.push({ id: "local-" + Date.now(), role: "user", text: text, time: Date.now() });
    setBusy(true);
    updateSendState();
    renderMessages();
    scrollBottom();

    ensureSession()
      .then(function (sid) {
        return oc.prompt(sid, projectContext(text));
      })
      .then(function () {
        state.sending = false;
        updateSendState();
        loadSessions();
      })
      .catch(function (e) {
        state.sending = false;
        updateSendState();
        setBusy(false);
        toast("Send failed: " + errText(e));
        refreshMessages(true);
      });
  }

  function stop() {
    if (!state.sessionID) return;
    oc.interrupt(state.sessionID)
      .then(function () {
        toast("Stopping…");
      })
      .catch(function (e) {
        toast("Stop failed: " + errText(e));
      });
  }

  function matchCommand(text) {
    if (text.charAt(0) !== "/") return null;
    var name = text.slice(1).split(/\s/)[0];
    if (!name) return null;
    for (var i = 0; i < state.commands.length; i++) {
      if (state.commands[i].name === name) return state.commands[i];
    }
    return null;
  }

  /* ----------------------------------------------------------- slash menu */

  function updateCmdMenu() {
    var v = $("input").value;
    var m = /^\/([^\s]*)$/.exec(v);
    if (!m) {
      hideCmd();
      return;
    }
    var q = m[1].toLowerCase();
    var list = state.commands.filter(function (c) {
      return !q || c.name.toLowerCase().indexOf(q) === 0;
    });
    if (!list.length) {
      hideCmd();
      return;
    }
    state.cmdFiltered = list;
    state.cmdIndex = Math.min(state.cmdIndex, list.length - 1);
    var pop = $("cmd-pop");
    pop.innerHTML = "";
    list.forEach(function (c, i) {
      var row = el("div", "cmd-row" + (i === state.cmdIndex ? " sel" : ""));
      row.appendChild(el("span", "cname", "/" + c.name));
      if (c.description) row.appendChild(el("span", "cdesc", c.description));
      row.addEventListener("mousedown", function (ev) {
        ev.preventDefault();
        pickCommand(c, i);
      });
      pop.appendChild(row);
    });
    pop.classList.remove("hidden");
  }

  function pickCommand(c) {
    var input = $("input");
    input.value = "/" + c.name + " ";
    hideCmd();
    input.focus();
    autosize();
  }

  function hideCmd() {
    $("cmd-pop").classList.add("hidden");
    state.cmdIndex = 0;
  }

  /* --------------------------------------------------------------- sheets */

  function openSheet(kind) {
    state.sheet = kind;
    $("sheet-wrap").classList.add("open");
    $("scrim").classList.add("open");
    closeSidebar();
    renderSheet();
  }

  function closeSheet() {
    state.sheet = null;
    $("sheet-wrap").classList.remove("open");
    if (!state.sidebar) $("scrim").classList.remove("open");
  }

  function renderSheet() {
    var kind = state.sheet;
    if (!kind) return;
    var title = kind === "models" ? "Model" : kind === "settings" ? "Settings" : kind === "files" ? "Project files" : "Changes";
    $("sheet-title").textContent = title;
    var body = $("sheet-body");
    var foot = $("sheet-foot");
    body.innerHTML = "";
    foot.innerHTML = "";

    if (kind === "models") renderModelSheet(body, foot);
    else if (kind === "settings") renderSettingsSheet(body, foot);
    else if (kind === "files") renderFilesSheet(body, foot);
    else if (kind === "changes") renderChangesSheet(body, foot);
  }

  function renderModelSheet(body, foot) {
    var search = document.createElement("input");
    search.type = "text";
    search.placeholder = "Filter models";
    search.className = "";
    var wrapS = el("div", "model-search");
    search.style.width = "100%";
    search.style.height = "26px";
    search.style.background = "#141414";
    search.style.border = "1px solid #242424";
    search.style.borderRadius = "5px";
    search.style.color = "#e9e9e9";
    search.style.padding = "0 7px";
    search.style.outline = "none";
    search.style.fontFamily = "inherit";
    search.style.fontSize = "11px";
    wrapS.appendChild(search);
    body.appendChild(wrapS);

    var listBox = el("div");
    body.appendChild(listBox);

    function paint(q) {
      listBox.innerHTML = "";
      var def = el("div", "mrow" + (!state.model ? " sel" : ""));
      def.appendChild(el("span", "mname", "Server default"));
      def.appendChild(el("span", "mprov", "auto"));
      if (!state.model) def.appendChild(tickIcon());
      def.addEventListener("click", function () {
        state.model = null;
        LS.set("oc.model", "null");
        renderModelChip();
        closeSheet();
      });
      listBox.appendChild(def);

      var models = state.models.filter(function (m) {
        var s = (m.name || m.id).toLowerCase() + " " + m.providerID.toLowerCase();
        return !q || s.indexOf(q) >= 0;
      });

      var groups = {};
      models.forEach(function (m) {
        (groups[m.providerID] = groups[m.providerID] || []).push(m);
      });
      Object.keys(groups).forEach(function (prov) {
        listBox.appendChild(el("div", "side-group", prov));
        groups[prov].forEach(function (m) {
          var sel = state.model && modelKey(state.model) === modelKey(m);
          var row = el("div", "mrow" + (sel ? " sel" : ""));
          row.appendChild(el("span", "mname", m.name || m.id));
          row.appendChild(el("span", "mprov", m.id));
          if (sel) row.appendChild(tickIcon());
          row.addEventListener("click", function () {
            state.model = { id: m.id, providerID: m.providerID };
            if (m.variant) state.model.variant = m.variant;
            LS.set("oc.model", JSON.stringify(state.model));
            renderModelChip();
            if (state.sessionID) {
              oc.setModel(state.sessionID, state.model).catch(function (e) {
                toast("Could not switch model: " + errText(e));
              });
            }
            closeSheet();
          });
          listBox.appendChild(row);
        });
      });
    }

    search.addEventListener("input", function () {
      paint(search.value.toLowerCase());
    });
    paint("");
    search.focus();
  }

  function tickIcon() {
    var s = el("span", "mtick");
    s.appendChild(icon("check"));
    return s;
  }

  function renderSettingsSheet(body, foot) {
    var s1 = el("div", "sheet-section");
    s1.appendChild(el("h4", null, "Working folder"));
    var inp = document.createElement("input");
    inp.type = "text";
    inp.value = state.dir || "";
    s1.appendChild(inp);
    var row1 = el("div", "row");
    row1.appendChild(
      btn("Apply", "btn primary", function () {
        var v = inp.value.trim();
        if (!v) {
          LS.del("oc.customDir");
          state.customDir = "";
        } else {
          LS.set("oc.customDir", v);
          state.customDir = v;
        }
        closeSheet();
        reloadDir();
      })
    );
    row1.appendChild(
      btn("Use project folder", "btn", function () {
        LS.del("oc.customDir");
        state.customDir = "";
        closeSheet();
        reloadDir();
      })
    );
    s1.appendChild(row1);
    s1.appendChild(
      el(
        "div",
        "note",
        state.customDir
          ? "Custom folder. Use the project folder to follow Premiere again."
          : "Following the current Premiere project folder."
      )
    );
    body.appendChild(s1);

    var s2 = el("div", "sheet-section");
    s2.appendChild(el("h4", null, "Behaviour"));
    var cr = el("div", "row");
    cr.appendChild(
      btn((state.ctxOn ? "Project context: on" : "Project context: off"), "btn" , function () {
        state.ctxOn = !state.ctxOn;
        LS.set("oc.ctx", state.ctxOn ? "1" : "0");
        renderChip();
        closeSheet();
      })
    );
    s2.appendChild(cr);
    s2.appendChild(el("div", "note", "When on, each message includes your Premiere project name, folder and sequences."));
    body.appendChild(s2);

    var s3 = el("div", "sheet-section");
    s3.appendChild(el("h4", null, "Server"));
    var st = oc.status();
    s3.appendChild(el("div", "note", "version " + (st.version || "?") + " · " + (st.url || "not connected")));
    s3.appendChild(el("div", "note", st.serviceFile));
    var row3 = el("div", "row");
    row3.appendChild(
      btn("Open in browser", "btn", function () {
        var url = oc.browserUrl();
        if (url) openExternal(url);
      })
    );
    row3.appendChild(
      btn("Restart server", "btn", function () {
        oc.restart(setStatus)
          .then(function () {
            toast("Server restarted", true);
            state.sessionID = null;
            return afterConnect();
          })
          .catch(function (e) {
            toast("Restart failed: " + errText(e));
          });
      })
    );
    s3.appendChild(row3);
    body.appendChild(s3);

    var s4 = el("div", "sheet-section");
    s4.appendChild(el("h4", null, "Panel"));
    s4.appendChild(el("div", "note", "OpenCode for Premiere Pro · v1.1"));
    var row4 = el("div", "row");
    row4.appendChild(
      btn("Clear preferences", "btn danger", function () {
        ["oc.customDir", "oc.model", "oc.ctx", "oc.last:" + state.dir].forEach(function (k) {
          LS.del(k);
        });
        state.customDir = "";
        toast("Preferences cleared", true);
      })
    );
    s4.appendChild(row4);
    body.appendChild(s4);
  }

  function renderFilesSheet(body, foot) {
    var cwd = state.files.cwd || state.dir;
    var crumb = el("div", "crumbs");
    crumb.appendChild(el("span", null, cwd));
    body.appendChild(crumb);

    if (!state.files.loaded || state.files.cwd !== cwd) {
      loadDir(cwd);
    }

    if (!state.files.ok) {
      body.appendChild(el("div", "sheet-section note", state.files.error || "Could not read this folder."));
    } else if (!state.files.entries.length) {
      body.appendChild(el("div", "sheet-section note", "Folder is empty."));
    } else {
      state.files.entries.forEach(function (f) {
        var row = el("div", "file-row");
        row.appendChild(icon(f.dir ? "folder" : "file"));
        row.appendChild(el("span", "fname", f.name));
        if (!f.dir) row.appendChild(el("span", "fsize", bytes(f.size)));
        row.addEventListener("click", function () {
          if (f.dir) {
            loadDir(f.path);
          } else {
            var rel = f.path.indexOf(state.dir) === 0 ? f.path.slice(state.dir.length).replace(/^[\\/]/, "") : f.path;
            insertText(rel);
            closeSheet();
            toast("Inserted path", true);
          }
        });
        body.appendChild(row);
      });
    }

    foot.appendChild(
      btn("Up", "btn", function () {
        var parts = cwd.replace(/[\\/]+$/, "").split(/[\\/]/);
        parts.pop();
        loadDir(parts.join("\\") || state.dir);
      })
    );
    foot.appendChild(
      btn("Project folder", "btn", function () {
        loadDir(state.dir);
      })
    );
    foot.appendChild(
      btn("Reveal", "btn ghost", function () {
        oc.reveal(cwd);
      })
    );
  }

  function loadDir(dir) {
    state.files.cwd = dir;
    state.files.loaded = true;
    var res = oc.listDir(dir);
    state.files.ok = !!res.ok;
    state.files.error = res.error || "";
    state.files.entries = res.entries || [];
    if (state.sheet === "files") renderSheet();
  }

  function renderChangesSheet(body, foot) {
    if (!state.sessionID) {
      body.appendChild(el("div", "sheet-section note", "Send a message first — changes are tracked per session."));
      return;
    }
    if (state.changes === null) {
      body.appendChild(el("div", "sheet-section note", "Loading changes…"));
      oc.listDiffs(state.sessionID)
        .then(function (list) {
          state.changes = list || [];
          if (state.sheet === "changes") renderSheet();
        })
        .catch(function (e) {
          state.changes = [];
          body.innerHTML = "";
          body.appendChild(el("div", "sheet-section note", "Could not load changes: " + errText(e)));
        });
      return;
    }
    if (!state.changes.length) {
      body.appendChild(el("div", "sheet-section note", "No file changes in this session yet."));
    }
    state.changes.forEach(function (c) {
      var row = el("div", "chg");
      var head = el("div", "chg-head");
      head.appendChild(el("span", "chg-file", c.file));
      var stat = el("span", "chg-stat");
      stat.innerHTML = '<span class="a">+' + (c.additions || 0) + '</span> <span class="d">-' + (c.deletions || 0) + "</span>";
      head.appendChild(stat);
      var b = el("div", "chg-body");
      b.appendChild(diffNode(c.patch || ""));
      head.addEventListener("click", function () {
        row.classList.toggle("open");
      });
      row.appendChild(head);
      row.appendChild(b);
      body.appendChild(row);
    });
    foot.appendChild(
      btn("Refresh", "btn", function () {
        state.changes = null;
        renderSheet();
      })
    );
    foot.appendChild(
      btn("Reveal project", "btn ghost", function () {
        oc.reveal(state.dir);
      })
    );
  }

  /* ------------------------------------------------------------------ wire */

  function renderChip() {
    var chip = $("btn-ctx");
    chip.innerHTML = "";
    var dot = el("span", "cd");
    chip.appendChild(dot);
    chip.appendChild(el("span", null, "Project"));
    chip.classList.toggle("on", state.ctxOn);
    chip.title = state.ctxOn ? "Project context is included in messages" : "Project context is off";
  }

  function reloadDir() {
    loadProject()
      .then(resolveDir)
      .then(function (dir) {
        state.dir = dir;
        state.sessionID = null;
        state.session = null;
        state.messages = [];
        state.live = null;
        state.sessions = [];
        state.perms = [];
        state.forms = [];
        state.changes = null;
        renderTop();
        renderProject();
        renderMessages();
        renderPrompts();
        return Promise.all([loadModels(), loadCommands(), loadSessions()]);
      })
      .then(function () {
        var last = LS.get("oc.last:" + state.dir, "");
        if (last) return openSession(last, true).catch(function () {});
      });
  }

  function wire() {
    $("btn-send").addEventListener("click", send);
    $("btn-stop").addEventListener("click", stop);
    $("btn-new").addEventListener("click", newSession);
    $("btn-sidebar").addEventListener("click", openSidebar);
    $("btn-side-close").addEventListener("click", closeSidebar);
    $("btn-side-new").addEventListener("click", newSession);
    $("btn-sheet-close").addEventListener("click", closeSheet);
    $("btn-changes").addEventListener("click", function () {
      state.changes = null;
      openSheet("changes");
    });
    $("btn-project").addEventListener("click", function () {
      var d = $("project-detail");
      d.classList.toggle("hidden");
      if (!d.classList.contains("hidden")) renderProjectDetail();
    });
    $("btn-project-more").addEventListener("click", function () {
      var d = $("project-detail");
      d.classList.toggle("hidden");
      if (!d.classList.contains("hidden")) renderProjectDetail();
    });
    $("jump").addEventListener("click", scrollBottom);
    $("btn-model").addEventListener("click", function () {
      openSheet("models");
    });
    $("btn-ctx").addEventListener("click", function () {
      state.ctxOn = !state.ctxOn;
      LS.set("oc.ctx", state.ctxOn ? "1" : "0");
      renderChip();
    });
    $("btn-side-files").addEventListener("click", function () {
      state.files = { cwd: "", entries: [], ok: false };
      openSheet("files");
    });
    $("btn-side-settings").addEventListener("click", function () {
      openSheet("settings");
    });
    $("scrim").addEventListener("click", function () {
      closeSidebar();
      closeSheet();
    });
    $("session-search").addEventListener("input", function () {
      state.sessionQuery = this.value;
      renderSidebar();
    });

    var input = $("input");
    input.addEventListener("focus", function () {
      $("composer").classList.add("focus");
    });
    input.addEventListener("blur", function () {
      $("composer").classList.remove("focus");
    });
    input.addEventListener("input", function () {
      autosize();
      updateCmdMenu();
    });
    input.addEventListener("keydown", function (e) {
      var popOpen = !$("cmd-pop").classList.contains("hidden");
      if (popOpen) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          state.cmdIndex = (state.cmdIndex + 1) % state.cmdFiltered.length;
          updateCmdMenu();
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          state.cmdIndex = (state.cmdIndex - 1 + state.cmdFiltered.length) % state.cmdFiltered.length;
          updateCmdMenu();
          return;
        }
        if (e.key === "Escape") {
          e.preventDefault();
          hideCmd();
          return;
        }
        if (e.key === "Enter" || e.key === "Tab") {
          e.preventDefault();
          var c = state.cmdFiltered[state.cmdIndex];
          if (c) pickCommand(c);
          return;
        }
      }
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        send();
      }
    });

    $("messages").addEventListener("click", function (e) {
      var t = e.target;
      var a = t.closest && t.closest("a");
      if (a && a.href) {
        e.preventDefault();
        openExternal(a.href);
      }
    });

    $("messages").addEventListener("scroll", function () {
      if (atBottom()) $("jump").classList.add("hidden");
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        if (state.sheet) closeSheet();
        else if (state.sidebar) closeSidebar();
      }
    });

    window.addEventListener("focus", function () {
      if (state.customDir) return;
      var now = Date.now();
      if (now - lastDirCheck < 2500) return;
      lastDirCheck = now;
      loadProject().then(function (p) {
        if (!p) return;
        renderProject();
        if (p.path && p.path !== state.dir && !state.busy) {
          reloadDir();
        } else {
          renderTop();
        }
      });
    });
  }

  /* --------------------------------------------------------------- watchdog */

  function watchdog() {
    busyWatch = setInterval(function () {
      if (!state.busy || !state.sessionID) return;
      if (Date.now() - state.lastEventAt < 25000) return;
      state.lastEventAt = Date.now();
      oc.listMessages(state.sessionID, 20)
        .then(function (list) {
          var newest = list && list.length ? list[0] : null;
          var done =
            !newest ||
            newest.type === "idle" ||
            (newest.type === "assistant" && newest.time && newest.time.completed);
          if (done) {
            setBusy(false);
            refreshMessages(true);
            refreshSessionMeta();
          }
        })
        .catch(function () {});
    }, 15000);
  }

  document.addEventListener("DOMContentLoaded", function () {
    boot();
    watchdog();
    renderChip();
    computeBusy();
  });
})();
