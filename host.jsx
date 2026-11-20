/* Premiere Pro host script: exposes project info to the panel.
   ExtendScript is ES3, so this builds JSON by hand. */

function OC_esc(s) {
  var out = "";
  var str = String(s === undefined || s === null ? "" : s);
  for (var i = 0; i < str.length; i++) {
    var c = str.charAt(i);
    var code = str.charCodeAt(i);
    if (c === "\\") out += "\\\\";
    else if (c === '"') out += '\\"';
    else if (c === "\n") out += "\\n";
    else if (c === "\r") out += "\\r";
    else if (c === "\t") out += "\\t";
    else if (code < 32) out += " ";
    else out += c;
  }
  return out;
}

function OC_q(s) {
  return '"' + OC_esc(s) + '"';
}

function OC_num(n, fallback) {
  var v = Number(n);
  if (!isFinite(v)) return String(fallback === undefined ? 0 : fallback);
  return String(Math.round(v * 1000) / 1000);
}

function OC_node(item, depth, budget) {
  if (!item) return "null";
  if (budget.count > 320) return "null";
  budget.count++;

  var name = "";
  var type = "item";
  var media = "";
  var seqID = "";

  try {
    name = item.name || "";
  } catch (e) {}

  try {
    if (item.isSequence && item.isSequence()) type = "sequence";
  } catch (e) {}

  if (type !== "sequence") {
    try {
      if (typeof ProjectItemType !== "undefined") {
        if (item.type === ProjectItemType.CLIP || item.type === ProjectItemType.FILE) type = "clip";
        else if (item.type === ProjectItemType.BIN) type = "bin";
      } else if (item.children && item.children.numItems >= 0) {
        type = "bin";
      }
    } catch (e) {}
  }

  try {
    if (item.getMediaPath) {
      var mp = item.getMediaPath();
      if (mp) media = mp;
    }
  } catch (e) {}

  try {
    if (item.sequenceID) seqID = String(item.sequenceID);
  } catch (e) {}

  var out = '{"name":' + OC_q(name) + ',"type":' + OC_q(type);
  if (media) out += ',"media":' + OC_q(media);
  if (seqID) out += ',"id":' + OC_q(seqID);

  if (type === "bin" && depth < 3) {
    try {
      var kids = item.children;
      var parts = [];
      for (var i = 0; i < kids.numItems && i < 150; i++) {
        var child = OC_node(kids[i], depth + 1, budget);
        if (child !== "null") parts.push(child);
      }
      out += ',"children":[' + parts.join(",") + "]";
    } catch (e) {}
  }

  return out + "}";
}

function OC_getProject() {
  try {
    if (!app.project) return '{"ok":false,"reason":"no project"}';

    var info = {
      ok: true,
      name: "",
      path: "",
      active: "",
      sequenceCount: 0,
      sequences: [],
      tree: []
    };

    try {
      info.name = app.project.name || "";
    } catch (e) {}

    try {
      info.path = app.project.path || "";
    } catch (e) {}

    try {
      if (app.project.activeSequence && app.project.activeSequence.name) {
        info.active = app.project.activeSequence.name;
      }
    } catch (e) {}

    var seqParts = [];
    try {
      var seqs = app.project.sequences;
      if (seqs) {
        var total = seqs.numSequences || 0;
        info.sequenceCount = total;
        for (var i = 0; i < total && i < 80; i++) {
          try {
            var seq = seqs[i];
            if (!seq) continue;
            var s = '{"name":' + OC_q(seq.name || "Sequence " + (i + 1));
            var fps = 0;
            try {
              var settings = seq.getSettings();
              if (settings && settings.videoFrameRate) fps = settings.videoFrameRate;
            } catch (e2) {}
            s += ',"fps":' + OC_num(fps, 0) + "}";
            seqParts.push(s);
          } catch (e3) {}
        }
      }
    } catch (e4) {}
    info.sequencesText = "[" + seqParts.join(",") + "]";

    var treeParts = [];
    try {
      var root = app.project.rootItem;
      if (root) {
        var budget = { count: 0 };
        var kids = root.children;
        if (kids) {
          for (var k = 0; k < kids.numItems && k < 150; k++) {
            var node = OC_node(kids[k], 0, budget);
            if (node !== "null") treeParts.push(node);
          }
        }
      }
    } catch (e5) {}
    info.treeText = "[" + treeParts.join(",") + "]";

    return (
      '{"ok":true,"name":' +
      OC_q(info.name) +
      ',"path":' +
      OC_q(info.path) +
      ',"active":' +
      OC_q(info.active) +
      ',"sequenceCount":' +
      info.sequenceCount +
      ',"sequences":' +
      info.sequencesText +
      ',"tree":' +
      info.treeText +
      "}"
    );
  } catch (err) {
    return '{"ok":false,"reason":' + OC_q(String(err)) + "}";
  }
}
