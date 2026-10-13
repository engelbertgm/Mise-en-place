#!/usr/bin/env node
import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __commonJS = (cb, mod) => function __require2() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/nodes/identity.js
var require_identity = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/nodes/identity.js"(exports) {
    "use strict";
    var ALIAS = /* @__PURE__ */ Symbol.for("yaml.alias");
    var DOC = /* @__PURE__ */ Symbol.for("yaml.document");
    var MAP = /* @__PURE__ */ Symbol.for("yaml.map");
    var PAIR = /* @__PURE__ */ Symbol.for("yaml.pair");
    var SCALAR = /* @__PURE__ */ Symbol.for("yaml.scalar");
    var SEQ = /* @__PURE__ */ Symbol.for("yaml.seq");
    var NODE_TYPE = /* @__PURE__ */ Symbol.for("yaml.node.type");
    var isAlias = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === ALIAS;
    var isDocument = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === DOC;
    var isMap = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === MAP;
    var isPair = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === PAIR;
    var isScalar = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === SCALAR;
    var isSeq = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === SEQ;
    function isCollection(node) {
      if (node && typeof node === "object")
        switch (node[NODE_TYPE]) {
          case MAP:
          case SEQ:
            return true;
        }
      return false;
    }
    function isNode(node) {
      if (node && typeof node === "object")
        switch (node[NODE_TYPE]) {
          case ALIAS:
          case MAP:
          case SCALAR:
          case SEQ:
            return true;
        }
      return false;
    }
    var hasAnchor = (node) => (isScalar(node) || isCollection(node)) && !!node.anchor;
    exports.ALIAS = ALIAS;
    exports.DOC = DOC;
    exports.MAP = MAP;
    exports.NODE_TYPE = NODE_TYPE;
    exports.PAIR = PAIR;
    exports.SCALAR = SCALAR;
    exports.SEQ = SEQ;
    exports.hasAnchor = hasAnchor;
    exports.isAlias = isAlias;
    exports.isCollection = isCollection;
    exports.isDocument = isDocument;
    exports.isMap = isMap;
    exports.isNode = isNode;
    exports.isPair = isPair;
    exports.isScalar = isScalar;
    exports.isSeq = isSeq;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/visit.js
var require_visit = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/visit.js"(exports) {
    "use strict";
    var identity = require_identity();
    var BREAK = /* @__PURE__ */ Symbol("break visit");
    var SKIP = /* @__PURE__ */ Symbol("skip children");
    var REMOVE = /* @__PURE__ */ Symbol("remove node");
    function visit(node, visitor) {
      const visitor_ = initVisitor(visitor);
      if (identity.isDocument(node)) {
        const cd = visit_(null, node.contents, visitor_, Object.freeze([node]));
        if (cd === REMOVE)
          node.contents = null;
      } else
        visit_(null, node, visitor_, Object.freeze([]));
    }
    visit.BREAK = BREAK;
    visit.SKIP = SKIP;
    visit.REMOVE = REMOVE;
    function visit_(key, node, visitor, path) {
      const ctrl = callVisitor(key, node, visitor, path);
      if (identity.isNode(ctrl) || identity.isPair(ctrl)) {
        replaceNode(key, path, ctrl);
        return visit_(key, ctrl, visitor, path);
      }
      if (typeof ctrl !== "symbol") {
        if (identity.isCollection(node)) {
          path = Object.freeze(path.concat(node));
          for (let i = 0; i < node.items.length; ++i) {
            const ci = visit_(i, node.items[i], visitor, path);
            if (typeof ci === "number")
              i = ci - 1;
            else if (ci === BREAK)
              return BREAK;
            else if (ci === REMOVE) {
              node.items.splice(i, 1);
              i -= 1;
            }
          }
        } else if (identity.isPair(node)) {
          path = Object.freeze(path.concat(node));
          const ck = visit_("key", node.key, visitor, path);
          if (ck === BREAK)
            return BREAK;
          else if (ck === REMOVE)
            node.key = null;
          const cv = visit_("value", node.value, visitor, path);
          if (cv === BREAK)
            return BREAK;
          else if (cv === REMOVE)
            node.value = null;
        }
      }
      return ctrl;
    }
    async function visitAsync(node, visitor) {
      const visitor_ = initVisitor(visitor);
      if (identity.isDocument(node)) {
        const cd = await visitAsync_(null, node.contents, visitor_, Object.freeze([node]));
        if (cd === REMOVE)
          node.contents = null;
      } else
        await visitAsync_(null, node, visitor_, Object.freeze([]));
    }
    visitAsync.BREAK = BREAK;
    visitAsync.SKIP = SKIP;
    visitAsync.REMOVE = REMOVE;
    async function visitAsync_(key, node, visitor, path) {
      const ctrl = await callVisitor(key, node, visitor, path);
      if (identity.isNode(ctrl) || identity.isPair(ctrl)) {
        replaceNode(key, path, ctrl);
        return visitAsync_(key, ctrl, visitor, path);
      }
      if (typeof ctrl !== "symbol") {
        if (identity.isCollection(node)) {
          path = Object.freeze(path.concat(node));
          for (let i = 0; i < node.items.length; ++i) {
            const ci = await visitAsync_(i, node.items[i], visitor, path);
            if (typeof ci === "number")
              i = ci - 1;
            else if (ci === BREAK)
              return BREAK;
            else if (ci === REMOVE) {
              node.items.splice(i, 1);
              i -= 1;
            }
          }
        } else if (identity.isPair(node)) {
          path = Object.freeze(path.concat(node));
          const ck = await visitAsync_("key", node.key, visitor, path);
          if (ck === BREAK)
            return BREAK;
          else if (ck === REMOVE)
            node.key = null;
          const cv = await visitAsync_("value", node.value, visitor, path);
          if (cv === BREAK)
            return BREAK;
          else if (cv === REMOVE)
            node.value = null;
        }
      }
      return ctrl;
    }
    function initVisitor(visitor) {
      if (typeof visitor === "object" && (visitor.Collection || visitor.Node || visitor.Value)) {
        return Object.assign({
          Alias: visitor.Node,
          Map: visitor.Node,
          Scalar: visitor.Node,
          Seq: visitor.Node
        }, visitor.Value && {
          Map: visitor.Value,
          Scalar: visitor.Value,
          Seq: visitor.Value
        }, visitor.Collection && {
          Map: visitor.Collection,
          Seq: visitor.Collection
        }, visitor);
      }
      return visitor;
    }
    function callVisitor(key, node, visitor, path) {
      if (typeof visitor === "function")
        return visitor(key, node, path);
      if (identity.isMap(node))
        return visitor.Map?.(key, node, path);
      if (identity.isSeq(node))
        return visitor.Seq?.(key, node, path);
      if (identity.isPair(node))
        return visitor.Pair?.(key, node, path);
      if (identity.isScalar(node))
        return visitor.Scalar?.(key, node, path);
      if (identity.isAlias(node))
        return visitor.Alias?.(key, node, path);
      return void 0;
    }
    function replaceNode(key, path, node) {
      const parent = path[path.length - 1];
      if (identity.isCollection(parent)) {
        parent.items[key] = node;
      } else if (identity.isPair(parent)) {
        if (key === "key")
          parent.key = node;
        else
          parent.value = node;
      } else if (identity.isDocument(parent)) {
        parent.contents = node;
      } else {
        const pt = identity.isAlias(parent) ? "alias" : "scalar";
        throw new Error(`Cannot replace node with ${pt} parent`);
      }
    }
    exports.visit = visit;
    exports.visitAsync = visitAsync;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/doc/directives.js
var require_directives = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/doc/directives.js"(exports) {
    "use strict";
    var identity = require_identity();
    var visit = require_visit();
    var escapeChars = {
      "!": "%21",
      ",": "%2C",
      "[": "%5B",
      "]": "%5D",
      "{": "%7B",
      "}": "%7D"
    };
    var escapeTagName = (tn) => tn.replace(/[!,[\]{}]/g, (ch) => escapeChars[ch]);
    var Directives = class _Directives {
      constructor(yaml, tags2) {
        this.docStart = null;
        this.docEnd = false;
        this.yaml = Object.assign({}, _Directives.defaultYaml, yaml);
        this.tags = Object.assign({}, _Directives.defaultTags, tags2);
      }
      clone() {
        const copy = new _Directives(this.yaml, this.tags);
        copy.docStart = this.docStart;
        return copy;
      }
      /**
       * During parsing, get a Directives instance for the current document and
       * update the stream state according to the current version's spec.
       */
      atDocument() {
        const res = new _Directives(this.yaml, this.tags);
        switch (this.yaml.version) {
          case "1.1":
            this.atNextDocument = true;
            break;
          case "1.2":
            this.atNextDocument = false;
            this.yaml = {
              explicit: _Directives.defaultYaml.explicit,
              version: "1.2"
            };
            this.tags = Object.assign({}, _Directives.defaultTags);
            break;
        }
        return res;
      }
      /**
       * @param onError - May be called even if the action was successful
       * @returns `true` on success
       */
      add(line3, onError) {
        if (this.atNextDocument) {
          this.yaml = { explicit: _Directives.defaultYaml.explicit, version: "1.1" };
          this.tags = Object.assign({}, _Directives.defaultTags);
          this.atNextDocument = false;
        }
        const parts = line3.trim().split(/[ \t]+/);
        const name = parts.shift();
        switch (name) {
          case "%TAG": {
            if (parts.length !== 2) {
              onError(0, "%TAG directive should contain exactly two parts");
              if (parts.length < 2)
                return false;
            }
            const [handle, prefix] = parts;
            this.tags[handle] = prefix;
            return true;
          }
          case "%YAML": {
            this.yaml.explicit = true;
            if (parts.length !== 1) {
              onError(0, "%YAML directive should contain exactly one part");
              return false;
            }
            const [version] = parts;
            if (version === "1.1" || version === "1.2") {
              this.yaml.version = version;
              return true;
            } else {
              const isValid = /^\d+\.\d+$/.test(version);
              onError(6, `Unsupported YAML version ${version}`, isValid);
              return false;
            }
          }
          default:
            onError(0, `Unknown directive ${name}`, true);
            return false;
        }
      }
      /**
       * Resolves a tag, matching handles to those defined in %TAG directives.
       *
       * @returns Resolved tag, which may also be the non-specific tag `'!'` or a
       *   `'!local'` tag, or `null` if unresolvable.
       */
      tagName(source, onError) {
        if (source === "!")
          return "!";
        if (source[0] !== "!") {
          onError(`Not a valid tag: ${source}`);
          return null;
        }
        if (source[1] === "<") {
          const verbatim = source.slice(2, -1);
          if (verbatim === "!" || verbatim === "!!") {
            onError(`Verbatim tags aren't resolved, so ${source} is invalid.`);
            return null;
          }
          if (source[source.length - 1] !== ">")
            onError("Verbatim tags must end with a >");
          return verbatim;
        }
        const [, handle, suffix] = source.match(/^(.*!)([^!]*)$/s);
        if (!suffix)
          onError(`The ${source} tag has no suffix`);
        const prefix = this.tags[handle];
        if (prefix) {
          try {
            return prefix + decodeURIComponent(suffix);
          } catch (error) {
            onError(String(error));
            return null;
          }
        }
        if (handle === "!")
          return source;
        onError(`Could not resolve tag: ${source}`);
        return null;
      }
      /**
       * Given a fully resolved tag, returns its printable string form,
       * taking into account current tag prefixes and defaults.
       */
      tagString(tag) {
        for (const [handle, prefix] of Object.entries(this.tags)) {
          if (tag.startsWith(prefix))
            return handle + escapeTagName(tag.substring(prefix.length));
        }
        return tag[0] === "!" ? tag : `!<${tag}>`;
      }
      toString(doc) {
        const lines = this.yaml.explicit ? [`%YAML ${this.yaml.version || "1.2"}`] : [];
        const tagEntries = Object.entries(this.tags);
        let tagNames;
        if (doc && tagEntries.length > 0 && identity.isNode(doc.contents)) {
          const tags2 = {};
          visit.visit(doc.contents, (_key, node) => {
            if (identity.isNode(node) && node.tag)
              tags2[node.tag] = true;
          });
          tagNames = Object.keys(tags2);
        } else
          tagNames = [];
        for (const [handle, prefix] of tagEntries) {
          if (handle === "!!" && prefix === "tag:yaml.org,2002:")
            continue;
          if (!doc || tagNames.some((tn) => tn.startsWith(prefix)))
            lines.push(`%TAG ${handle} ${prefix}`);
        }
        return lines.join("\n");
      }
    };
    Directives.defaultYaml = { explicit: false, version: "1.2" };
    Directives.defaultTags = { "!!": "tag:yaml.org,2002:" };
    exports.Directives = Directives;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/doc/anchors.js
var require_anchors = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/doc/anchors.js"(exports) {
    "use strict";
    var identity = require_identity();
    var visit = require_visit();
    function anchorIsValid(anchor) {
      if (/[\x00-\x19\s,[\]{}]/.test(anchor)) {
        const sa = JSON.stringify(anchor);
        const msg = `Anchor must not contain whitespace or control characters: ${sa}`;
        throw new Error(msg);
      }
      return true;
    }
    function anchorNames(root) {
      const anchors = /* @__PURE__ */ new Set();
      visit.visit(root, {
        Value(_key, node) {
          if (node.anchor)
            anchors.add(node.anchor);
        }
      });
      return anchors;
    }
    function findNewAnchor(prefix, exclude) {
      for (let i = 1; true; ++i) {
        const name = `${prefix}${i}`;
        if (!exclude.has(name))
          return name;
      }
    }
    function createNodeAnchors(doc, prefix) {
      const aliasObjects = [];
      const sourceObjects = /* @__PURE__ */ new Map();
      let prevAnchors = null;
      return {
        onAnchor: (source) => {
          aliasObjects.push(source);
          prevAnchors ?? (prevAnchors = anchorNames(doc));
          const anchor = findNewAnchor(prefix, prevAnchors);
          prevAnchors.add(anchor);
          return anchor;
        },
        /**
         * With circular references, the source node is only resolved after all
         * of its child nodes are. This is why anchors are set only after all of
         * the nodes have been created.
         */
        setAnchors: () => {
          for (const source of aliasObjects) {
            const ref = sourceObjects.get(source);
            if (typeof ref === "object" && ref.anchor && (identity.isScalar(ref.node) || identity.isCollection(ref.node))) {
              ref.node.anchor = ref.anchor;
            } else {
              const error = new Error("Failed to resolve repeated object (this should not happen)");
              error.source = source;
              throw error;
            }
          }
        },
        sourceObjects
      };
    }
    exports.anchorIsValid = anchorIsValid;
    exports.anchorNames = anchorNames;
    exports.createNodeAnchors = createNodeAnchors;
    exports.findNewAnchor = findNewAnchor;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/doc/applyReviver.js
var require_applyReviver = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/doc/applyReviver.js"(exports) {
    "use strict";
    function applyReviver(reviver, obj, key, val) {
      if (val && typeof val === "object") {
        if (Array.isArray(val)) {
          for (let i = 0, len = val.length; i < len; ++i) {
            const v0 = val[i];
            const v1 = applyReviver(reviver, val, String(i), v0);
            if (v1 === void 0)
              delete val[i];
            else if (v1 !== v0)
              val[i] = v1;
          }
        } else if (val instanceof Map) {
          for (const k of Array.from(val.keys())) {
            const v0 = val.get(k);
            const v1 = applyReviver(reviver, val, k, v0);
            if (v1 === void 0)
              val.delete(k);
            else if (v1 !== v0)
              val.set(k, v1);
          }
        } else if (val instanceof Set) {
          for (const v0 of Array.from(val)) {
            const v1 = applyReviver(reviver, val, v0, v0);
            if (v1 === void 0)
              val.delete(v0);
            else if (v1 !== v0) {
              val.delete(v0);
              val.add(v1);
            }
          }
        } else {
          for (const [k, v0] of Object.entries(val)) {
            const v1 = applyReviver(reviver, val, k, v0);
            if (v1 === void 0)
              delete val[k];
            else if (v1 !== v0)
              val[k] = v1;
          }
        }
      }
      return reviver.call(obj, key, val);
    }
    exports.applyReviver = applyReviver;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/nodes/toJS.js
var require_toJS = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/nodes/toJS.js"(exports) {
    "use strict";
    var identity = require_identity();
    function toJS(value, arg, ctx) {
      if (Array.isArray(value))
        return value.map((v, i) => toJS(v, String(i), ctx));
      if (value && typeof value.toJSON === "function") {
        if (!ctx || !identity.hasAnchor(value))
          return value.toJSON(arg, ctx);
        const data = { aliasCount: 0, count: 1, res: void 0 };
        ctx.anchors.set(value, data);
        ctx.onCreate = (res2) => {
          data.res = res2;
          delete ctx.onCreate;
        };
        const res = value.toJSON(arg, ctx);
        if (ctx.onCreate)
          ctx.onCreate(res);
        return res;
      }
      if (typeof value === "bigint" && !ctx?.keep)
        return Number(value);
      return value;
    }
    exports.toJS = toJS;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/nodes/Node.js
var require_Node = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/nodes/Node.js"(exports) {
    "use strict";
    var applyReviver = require_applyReviver();
    var identity = require_identity();
    var toJS = require_toJS();
    var NodeBase = class {
      constructor(type) {
        Object.defineProperty(this, identity.NODE_TYPE, { value: type });
      }
      /** Create a copy of this node.  */
      clone() {
        const copy = Object.create(Object.getPrototypeOf(this), Object.getOwnPropertyDescriptors(this));
        if (this.range)
          copy.range = this.range.slice();
        return copy;
      }
      /** A plain JavaScript representation of this node. */
      toJS(doc, { mapAsMap, maxAliasCount, onAnchor, reviver } = {}) {
        if (!identity.isDocument(doc))
          throw new TypeError("A document argument is required");
        const ctx = {
          anchors: /* @__PURE__ */ new Map(),
          doc,
          keep: true,
          mapAsMap: mapAsMap === true,
          mapKeyWarned: false,
          maxAliasCount: typeof maxAliasCount === "number" ? maxAliasCount : 100
        };
        const res = toJS.toJS(this, "", ctx);
        if (typeof onAnchor === "function")
          for (const { count, res: res2 } of ctx.anchors.values())
            onAnchor(res2, count);
        return typeof reviver === "function" ? applyReviver.applyReviver(reviver, { "": res }, "", res) : res;
      }
    };
    exports.NodeBase = NodeBase;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/nodes/Alias.js
var require_Alias = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/nodes/Alias.js"(exports) {
    "use strict";
    var anchors = require_anchors();
    var visit = require_visit();
    var identity = require_identity();
    var Node = require_Node();
    var toJS = require_toJS();
    var Alias = class extends Node.NodeBase {
      constructor(source) {
        super(identity.ALIAS);
        this.source = source;
        Object.defineProperty(this, "tag", {
          set() {
            throw new Error("Alias nodes cannot have tags");
          }
        });
      }
      /**
       * Resolve the value of this alias within `doc`, finding the last
       * instance of the `source` anchor before this node.
       */
      resolve(doc, ctx) {
        if (ctx?.maxAliasCount === 0)
          throw new ReferenceError("Alias resolution is disabled");
        let nodes;
        if (ctx?.aliasResolveCache) {
          nodes = ctx.aliasResolveCache;
        } else {
          nodes = [];
          visit.visit(doc, {
            Node: (_key, node) => {
              if (identity.isAlias(node) || identity.hasAnchor(node))
                nodes.push(node);
            }
          });
          if (ctx)
            ctx.aliasResolveCache = nodes;
        }
        let found = void 0;
        for (const node of nodes) {
          if (node === this)
            break;
          if (node.anchor === this.source)
            found = node;
        }
        if (found && ctx) {
          const { anchors: anchors2, doc: doc2, maxAliasCount } = ctx;
          let data = anchors2.get(found);
          if (!data) {
            toJS.toJS(found, null, ctx);
            data = anchors2.get(found);
          }
          if (data?.res === void 0) {
            const msg = "This should not happen: Alias anchor was not resolved?";
            throw new ReferenceError(msg);
          }
          if (maxAliasCount >= 0) {
            data.count += 1;
            if (data.aliasCount === 0)
              data.aliasCount = getAliasCount(doc2, found, anchors2);
            if (data.count * data.aliasCount > maxAliasCount) {
              const msg = "Excessive alias count indicates a resource exhaustion attack";
              throw new ReferenceError(msg);
            }
          }
        }
        return found;
      }
      toJSON(_arg, ctx) {
        if (!ctx)
          return { source: this.source };
        const source = this.resolve(ctx.doc, ctx);
        if (!source) {
          const msg = `Unresolved alias (the anchor must be set before the alias): ${this.source}`;
          throw new ReferenceError(msg);
        }
        return ctx.anchors.get(source).res;
      }
      toString(ctx, _onComment, _onChompKeep) {
        const src = `*${this.source}`;
        if (ctx) {
          anchors.anchorIsValid(this.source);
          if (ctx.options.verifyAliasOrder && !ctx.anchors.has(this.source)) {
            const msg = `Unresolved alias (the anchor must be set before the alias): ${this.source}`;
            throw new Error(msg);
          }
          if (ctx.implicitKey)
            return `${src} `;
        }
        return src;
      }
    };
    function getAliasCount(doc, node, anchors2) {
      if (identity.isAlias(node)) {
        const source = node.resolve(doc);
        const anchor = anchors2 && source && anchors2.get(source);
        return anchor ? anchor.count * anchor.aliasCount : 0;
      } else if (identity.isCollection(node)) {
        let count = 0;
        for (const item of node.items) {
          const c = getAliasCount(doc, item, anchors2);
          if (c > count)
            count = c;
        }
        return count;
      } else if (identity.isPair(node)) {
        const kc = getAliasCount(doc, node.key, anchors2);
        const vc = getAliasCount(doc, node.value, anchors2);
        return Math.max(kc, vc);
      }
      return 1;
    }
    exports.Alias = Alias;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/nodes/Scalar.js
var require_Scalar = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/nodes/Scalar.js"(exports) {
    "use strict";
    var identity = require_identity();
    var Node = require_Node();
    var toJS = require_toJS();
    var isScalarValue = (value) => !value || typeof value !== "function" && typeof value !== "object";
    var Scalar = class extends Node.NodeBase {
      constructor(value) {
        super(identity.SCALAR);
        this.value = value;
      }
      toJSON(arg, ctx) {
        return ctx?.keep ? this.value : toJS.toJS(this.value, arg, ctx);
      }
      toString() {
        return String(this.value);
      }
    };
    Scalar.BLOCK_FOLDED = "BLOCK_FOLDED";
    Scalar.BLOCK_LITERAL = "BLOCK_LITERAL";
    Scalar.PLAIN = "PLAIN";
    Scalar.QUOTE_DOUBLE = "QUOTE_DOUBLE";
    Scalar.QUOTE_SINGLE = "QUOTE_SINGLE";
    exports.Scalar = Scalar;
    exports.isScalarValue = isScalarValue;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/doc/createNode.js
var require_createNode = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/doc/createNode.js"(exports) {
    "use strict";
    var Alias = require_Alias();
    var identity = require_identity();
    var Scalar = require_Scalar();
    var defaultTagPrefix = "tag:yaml.org,2002:";
    function findTagObject(value, tagName, tags2) {
      if (tagName) {
        const match = tags2.filter((t) => t.tag === tagName);
        const tagObj = match.find((t) => !t.format) ?? match[0];
        if (!tagObj)
          throw new Error(`Tag ${tagName} not found`);
        return tagObj;
      }
      return tags2.find((t) => t.identify?.(value) && !t.format);
    }
    function createNode(value, tagName, ctx) {
      if (identity.isDocument(value))
        value = value.contents;
      if (identity.isNode(value))
        return value;
      if (identity.isPair(value)) {
        const map = ctx.schema[identity.MAP].createNode?.(ctx.schema, null, ctx);
        map.items.push(value);
        return map;
      }
      if (value instanceof String || value instanceof Number || value instanceof Boolean || typeof BigInt !== "undefined" && value instanceof BigInt) {
        value = value.valueOf();
      }
      const { aliasDuplicateObjects, onAnchor, onTagObj, schema, sourceObjects } = ctx;
      let ref = void 0;
      if (aliasDuplicateObjects && value && typeof value === "object") {
        ref = sourceObjects.get(value);
        if (ref) {
          ref.anchor ?? (ref.anchor = onAnchor(value));
          return new Alias.Alias(ref.anchor);
        } else {
          ref = { anchor: null, node: null };
          sourceObjects.set(value, ref);
        }
      }
      if (tagName?.startsWith("!!"))
        tagName = defaultTagPrefix + tagName.slice(2);
      let tagObj = findTagObject(value, tagName, schema.tags);
      if (!tagObj) {
        if (value && typeof value.toJSON === "function") {
          value = value.toJSON();
        }
        if (!value || typeof value !== "object") {
          const node2 = new Scalar.Scalar(value);
          if (ref)
            ref.node = node2;
          return node2;
        }
        tagObj = value instanceof Map ? schema[identity.MAP] : Symbol.iterator in Object(value) ? schema[identity.SEQ] : schema[identity.MAP];
      }
      if (onTagObj) {
        onTagObj(tagObj);
        delete ctx.onTagObj;
      }
      const node = tagObj?.createNode ? tagObj.createNode(ctx.schema, value, ctx) : typeof tagObj?.nodeClass?.from === "function" ? tagObj.nodeClass.from(ctx.schema, value, ctx) : new Scalar.Scalar(value);
      if (tagName)
        node.tag = tagName;
      else if (!tagObj.default)
        node.tag = tagObj.tag;
      if (ref)
        ref.node = node;
      return node;
    }
    exports.createNode = createNode;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/nodes/Collection.js
var require_Collection = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/nodes/Collection.js"(exports) {
    "use strict";
    var createNode = require_createNode();
    var identity = require_identity();
    var Node = require_Node();
    function collectionFromPath(schema, path, value) {
      let v = value;
      for (let i = path.length - 1; i >= 0; --i) {
        const k = path[i];
        if (typeof k === "number" && Number.isInteger(k) && k >= 0) {
          const a = [];
          a[k] = v;
          v = a;
        } else {
          v = /* @__PURE__ */ new Map([[k, v]]);
        }
      }
      return createNode.createNode(v, void 0, {
        aliasDuplicateObjects: false,
        keepUndefined: false,
        onAnchor: () => {
          throw new Error("This should not happen, please report a bug.");
        },
        schema,
        sourceObjects: /* @__PURE__ */ new Map()
      });
    }
    var isEmptyPath = (path) => path == null || typeof path === "object" && !!path[Symbol.iterator]().next().done;
    var Collection = class extends Node.NodeBase {
      constructor(type, schema) {
        super(type);
        Object.defineProperty(this, "schema", {
          value: schema,
          configurable: true,
          enumerable: false,
          writable: true
        });
      }
      /**
       * Create a copy of this collection.
       *
       * @param schema - If defined, overwrites the original's schema
       */
      clone(schema) {
        const copy = Object.create(Object.getPrototypeOf(this), Object.getOwnPropertyDescriptors(this));
        if (schema)
          copy.schema = schema;
        copy.items = copy.items.map((it) => identity.isNode(it) || identity.isPair(it) ? it.clone(schema) : it);
        if (this.range)
          copy.range = this.range.slice();
        return copy;
      }
      /**
       * Adds a value to the collection. For `!!map` and `!!omap` the value must
       * be a Pair instance or a `{ key, value }` object, which may not have a key
       * that already exists in the map.
       */
      addIn(path, value) {
        if (isEmptyPath(path))
          this.add(value);
        else {
          const [key, ...rest] = path;
          const node = this.get(key, true);
          if (identity.isCollection(node))
            node.addIn(rest, value);
          else if (node === void 0 && this.schema)
            this.set(key, collectionFromPath(this.schema, rest, value));
          else
            throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
        }
      }
      /**
       * Removes a value from the collection.
       * @returns `true` if the item was found and removed.
       */
      deleteIn(path) {
        const [key, ...rest] = path;
        if (rest.length === 0)
          return this.delete(key);
        const node = this.get(key, true);
        if (identity.isCollection(node))
          return node.deleteIn(rest);
        else
          throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
      }
      /**
       * Returns item at `key`, or `undefined` if not found. By default unwraps
       * scalar values from their surrounding node; to disable set `keepScalar` to
       * `true` (collections are always returned intact).
       */
      getIn(path, keepScalar) {
        const [key, ...rest] = path;
        const node = this.get(key, true);
        if (rest.length === 0)
          return !keepScalar && identity.isScalar(node) ? node.value : node;
        else
          return identity.isCollection(node) ? node.getIn(rest, keepScalar) : void 0;
      }
      hasAllNullValues(allowScalar) {
        return this.items.every((node) => {
          if (!identity.isPair(node))
            return false;
          const n = node.value;
          return n == null || allowScalar && identity.isScalar(n) && n.value == null && !n.commentBefore && !n.comment && !n.tag;
        });
      }
      /**
       * Checks if the collection includes a value with the key `key`.
       */
      hasIn(path) {
        const [key, ...rest] = path;
        if (rest.length === 0)
          return this.has(key);
        const node = this.get(key, true);
        return identity.isCollection(node) ? node.hasIn(rest) : false;
      }
      /**
       * Sets a value in this collection. For `!!set`, `value` needs to be a
       * boolean to add/remove the item from the set.
       */
      setIn(path, value) {
        const [key, ...rest] = path;
        if (rest.length === 0) {
          this.set(key, value);
        } else {
          const node = this.get(key, true);
          if (identity.isCollection(node))
            node.setIn(rest, value);
          else if (node === void 0 && this.schema)
            this.set(key, collectionFromPath(this.schema, rest, value));
          else
            throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
        }
      }
    };
    exports.Collection = Collection;
    exports.collectionFromPath = collectionFromPath;
    exports.isEmptyPath = isEmptyPath;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/stringify/stringifyComment.js
var require_stringifyComment = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/stringify/stringifyComment.js"(exports) {
    "use strict";
    var stringifyComment = (str) => str.replace(/^(?!$)(?: $)?/gm, "#");
    function indentComment(comment, indent) {
      if (/^\n+$/.test(comment))
        return comment.substring(1);
      return indent ? comment.replace(/^(?! *$)/gm, indent) : comment;
    }
    var lineComment = (str, indent, comment) => str.endsWith("\n") ? indentComment(comment, indent) : comment.includes("\n") ? "\n" + indentComment(comment, indent) : (str.endsWith(" ") ? "" : " ") + comment;
    exports.indentComment = indentComment;
    exports.lineComment = lineComment;
    exports.stringifyComment = stringifyComment;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/stringify/foldFlowLines.js
var require_foldFlowLines = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/stringify/foldFlowLines.js"(exports) {
    "use strict";
    var FOLD_FLOW = "flow";
    var FOLD_BLOCK = "block";
    var FOLD_QUOTED = "quoted";
    function foldFlowLines(text, indent, mode = "flow", { indentAtStart, lineWidth = 80, minContentWidth = 20, onFold, onOverflow } = {}) {
      if (!lineWidth || lineWidth < 0)
        return text;
      if (lineWidth < minContentWidth)
        minContentWidth = 0;
      const endStep = Math.max(1 + minContentWidth, 1 + lineWidth - indent.length);
      if (text.length <= endStep)
        return text;
      const folds = [];
      const escapedFolds = {};
      let end = lineWidth - indent.length;
      if (typeof indentAtStart === "number") {
        if (indentAtStart > lineWidth - Math.max(2, minContentWidth))
          folds.push(0);
        else
          end = lineWidth - indentAtStart;
      }
      let split = void 0;
      let prev = void 0;
      let overflow = false;
      let i = -1;
      let escStart = -1;
      let escEnd = -1;
      if (mode === FOLD_BLOCK) {
        i = consumeMoreIndentedLines(text, i, indent.length);
        if (i !== -1)
          end = i + endStep;
      }
      for (let ch; ch = text[i += 1]; ) {
        if (mode === FOLD_QUOTED && ch === "\\") {
          escStart = i;
          switch (text[i + 1]) {
            case "x":
              i += 3;
              break;
            case "u":
              i += 5;
              break;
            case "U":
              i += 9;
              break;
            default:
              i += 1;
          }
          escEnd = i;
        }
        if (ch === "\n") {
          if (mode === FOLD_BLOCK)
            i = consumeMoreIndentedLines(text, i, indent.length);
          end = i + indent.length + endStep;
          split = void 0;
        } else {
          if (ch === " " && prev && prev !== " " && prev !== "\n" && prev !== "	") {
            const next = text[i + 1];
            if (next && next !== " " && next !== "\n" && next !== "	")
              split = i;
          }
          if (i >= end) {
            if (split) {
              folds.push(split);
              end = split + endStep;
              split = void 0;
            } else if (mode === FOLD_QUOTED) {
              while (prev === " " || prev === "	") {
                prev = ch;
                ch = text[i += 1];
                overflow = true;
              }
              const j = i > escEnd + 1 ? i - 2 : escStart - 1;
              if (escapedFolds[j])
                return text;
              folds.push(j);
              escapedFolds[j] = true;
              end = j + endStep;
              split = void 0;
            } else {
              overflow = true;
            }
          }
        }
        prev = ch;
      }
      if (overflow && onOverflow)
        onOverflow();
      if (folds.length === 0)
        return text;
      if (onFold)
        onFold();
      let res = text.slice(0, folds[0]);
      for (let i2 = 0; i2 < folds.length; ++i2) {
        const fold = folds[i2];
        const end2 = folds[i2 + 1] || text.length;
        if (fold === 0)
          res = `
${indent}${text.slice(0, end2)}`;
        else {
          if (mode === FOLD_QUOTED && escapedFolds[fold])
            res += `${text[fold]}\\`;
          res += `
${indent}${text.slice(fold + 1, end2)}`;
        }
      }
      return res;
    }
    function consumeMoreIndentedLines(text, i, indent) {
      let end = i;
      let start = i + 1;
      let ch = text[start];
      while (ch === " " || ch === "	") {
        if (i < start + indent) {
          ch = text[++i];
        } else {
          do {
            ch = text[++i];
          } while (ch && ch !== "\n");
          end = i;
          start = i + 1;
          ch = text[start];
        }
      }
      return end;
    }
    exports.FOLD_BLOCK = FOLD_BLOCK;
    exports.FOLD_FLOW = FOLD_FLOW;
    exports.FOLD_QUOTED = FOLD_QUOTED;
    exports.foldFlowLines = foldFlowLines;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/stringify/stringifyString.js
var require_stringifyString = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/stringify/stringifyString.js"(exports) {
    "use strict";
    var Scalar = require_Scalar();
    var foldFlowLines = require_foldFlowLines();
    var getFoldOptions = (ctx, isBlock) => ({
      indentAtStart: isBlock ? ctx.indent.length : ctx.indentAtStart,
      lineWidth: ctx.options.lineWidth,
      minContentWidth: ctx.options.minContentWidth
    });
    var containsDocumentMarker = (str) => /^(%|---|\.\.\.)/m.test(str);
    function lineLengthOverLimit(str, lineWidth, indentLength) {
      if (!lineWidth || lineWidth < 0)
        return false;
      const limit = lineWidth - indentLength;
      const strLen = str.length;
      if (strLen <= limit)
        return false;
      for (let i = 0, start = 0; i < strLen; ++i) {
        if (str[i] === "\n") {
          if (i - start > limit)
            return true;
          start = i + 1;
          if (strLen - start <= limit)
            return false;
        }
      }
      return true;
    }
    function doubleQuotedString(value, ctx) {
      const json2 = JSON.stringify(value);
      if (ctx.options.doubleQuotedAsJSON)
        return json2;
      const { implicitKey } = ctx;
      const minMultiLineLength = ctx.options.doubleQuotedMinMultiLineLength;
      const indent = ctx.indent || (containsDocumentMarker(value) ? "  " : "");
      let str = "";
      let start = 0;
      for (let i = 0, ch = json2[i]; ch; ch = json2[++i]) {
        if (ch === " " && json2[i + 1] === "\\" && json2[i + 2] === "n") {
          str += json2.slice(start, i) + "\\ ";
          i += 1;
          start = i;
          ch = "\\";
        }
        if (ch === "\\")
          switch (json2[i + 1]) {
            case "u":
              {
                str += json2.slice(start, i);
                const code = json2.substr(i + 2, 4);
                switch (code) {
                  case "0000":
                    str += "\\0";
                    break;
                  case "0007":
                    str += "\\a";
                    break;
                  case "000b":
                    str += "\\v";
                    break;
                  case "001b":
                    str += "\\e";
                    break;
                  case "0085":
                    str += "\\N";
                    break;
                  case "00a0":
                    str += "\\_";
                    break;
                  case "2028":
                    str += "\\L";
                    break;
                  case "2029":
                    str += "\\P";
                    break;
                  default:
                    if (code.substr(0, 2) === "00")
                      str += "\\x" + code.substr(2);
                    else
                      str += json2.substr(i, 6);
                }
                i += 5;
                start = i + 1;
              }
              break;
            case "n":
              if (implicitKey || json2[i + 2] === '"' || json2.length < minMultiLineLength) {
                i += 1;
              } else {
                str += json2.slice(start, i) + "\n\n";
                while (json2[i + 2] === "\\" && json2[i + 3] === "n" && json2[i + 4] !== '"') {
                  str += "\n";
                  i += 2;
                }
                str += indent;
                if (json2[i + 2] === " ")
                  str += "\\";
                i += 1;
                start = i + 1;
              }
              break;
            default:
              i += 1;
          }
      }
      str = start ? str + json2.slice(start) : json2;
      return implicitKey ? str : foldFlowLines.foldFlowLines(str, indent, foldFlowLines.FOLD_QUOTED, getFoldOptions(ctx, false));
    }
    function singleQuotedString(value, ctx) {
      if (ctx.options.singleQuote === false || ctx.implicitKey && value.includes("\n") || /[ \t]\n|\n[ \t]/.test(value))
        return doubleQuotedString(value, ctx);
      const indent = ctx.indent || (containsDocumentMarker(value) ? "  " : "");
      const res = "'" + value.replace(/'/g, "''").replace(/\n+/g, `$&
${indent}`) + "'";
      return ctx.implicitKey ? res : foldFlowLines.foldFlowLines(res, indent, foldFlowLines.FOLD_FLOW, getFoldOptions(ctx, false));
    }
    function quotedString(value, ctx) {
      const { singleQuote } = ctx.options;
      let qs;
      if (singleQuote === false)
        qs = doubleQuotedString;
      else {
        const hasDouble = value.includes('"');
        const hasSingle = value.includes("'");
        if (hasDouble && !hasSingle)
          qs = singleQuotedString;
        else if (hasSingle && !hasDouble)
          qs = doubleQuotedString;
        else
          qs = singleQuote ? singleQuotedString : doubleQuotedString;
      }
      return qs(value, ctx);
    }
    var blockEndNewlines;
    try {
      blockEndNewlines = new RegExp("(^|(?<!\n))\n+(?!\n|$)", "g");
    } catch {
      blockEndNewlines = /\n+(?!\n|$)/g;
    }
    function blockString({ comment, type, value }, ctx, onComment, onChompKeep) {
      const { blockQuote, commentString, lineWidth } = ctx.options;
      if (!blockQuote || /\n[\t ]+$/.test(value)) {
        return quotedString(value, ctx);
      }
      const indent = ctx.indent || (ctx.forceBlockIndent || containsDocumentMarker(value) ? "  " : "");
      const literal = blockQuote === "literal" ? true : blockQuote === "folded" || type === Scalar.Scalar.BLOCK_FOLDED ? false : type === Scalar.Scalar.BLOCK_LITERAL ? true : !lineLengthOverLimit(value, lineWidth, indent.length);
      if (!value)
        return literal ? "|\n" : ">\n";
      let chomp;
      let endStart;
      for (endStart = value.length; endStart > 0; --endStart) {
        const ch = value[endStart - 1];
        if (ch !== "\n" && ch !== "	" && ch !== " ")
          break;
      }
      let end = value.substring(endStart);
      const endNlPos = end.indexOf("\n");
      if (endNlPos === -1) {
        chomp = "-";
      } else if (value === end || endNlPos !== end.length - 1) {
        chomp = "+";
        if (onChompKeep)
          onChompKeep();
      } else {
        chomp = "";
      }
      if (end) {
        value = value.slice(0, -end.length);
        if (end[end.length - 1] === "\n")
          end = end.slice(0, -1);
        end = end.replace(blockEndNewlines, `$&${indent}`);
      }
      let startWithSpace = false;
      let startEnd;
      let startNlPos = -1;
      for (startEnd = 0; startEnd < value.length; ++startEnd) {
        const ch = value[startEnd];
        if (ch === " ")
          startWithSpace = true;
        else if (ch === "\n")
          startNlPos = startEnd;
        else
          break;
      }
      let start = value.substring(0, startNlPos < startEnd ? startNlPos + 1 : startEnd);
      if (start) {
        value = value.substring(start.length);
        start = start.replace(/\n+/g, `$&${indent}`);
      }
      const indentSize = indent ? "2" : "1";
      let header = (startWithSpace ? indentSize : "") + chomp;
      if (comment) {
        header += " " + commentString(comment.replace(/ ?[\r\n]+/g, " "));
        if (onComment)
          onComment();
      }
      if (!literal) {
        const foldedValue = value.replace(/\n+/g, "\n$&").replace(/(?:^|\n)([\t ].*)(?:([\n\t ]*)\n(?![\n\t ]))?/g, "$1$2").replace(/\n+/g, `$&${indent}`);
        let literalFallback = false;
        const foldOptions = getFoldOptions(ctx, true);
        if (blockQuote !== "folded" && type !== Scalar.Scalar.BLOCK_FOLDED) {
          foldOptions.onOverflow = () => {
            literalFallback = true;
          };
        }
        const body = foldFlowLines.foldFlowLines(`${start}${foldedValue}${end}`, indent, foldFlowLines.FOLD_BLOCK, foldOptions);
        if (!literalFallback)
          return `>${header}
${indent}${body}`;
      }
      value = value.replace(/\n+/g, `$&${indent}`);
      return `|${header}
${indent}${start}${value}${end}`;
    }
    function plainString(item, ctx, onComment, onChompKeep) {
      const { type, value } = item;
      const { actualString, implicitKey, indent, indentStep, inFlow } = ctx;
      if (implicitKey && value.includes("\n") || inFlow && /[[\]{},]/.test(value)) {
        return quotedString(value, ctx);
      }
      if (/^[\n\t ,[\]{}#&*!|>'"%@`]|^[?-]$|^[?-][ \t]|[\n:][ \t]|[ \t]\n|[\n\t ]#|[\n\t :]$/.test(value)) {
        return implicitKey || inFlow || !value.includes("\n") ? quotedString(value, ctx) : blockString(item, ctx, onComment, onChompKeep);
      }
      if (!implicitKey && !inFlow && type !== Scalar.Scalar.PLAIN && value.includes("\n")) {
        return blockString(item, ctx, onComment, onChompKeep);
      }
      if (containsDocumentMarker(value)) {
        if (indent === "") {
          ctx.forceBlockIndent = true;
          return blockString(item, ctx, onComment, onChompKeep);
        } else if (implicitKey && indent === indentStep) {
          return quotedString(value, ctx);
        }
      }
      const str = value.replace(/\n+/g, `$&
${indent}`);
      if (actualString) {
        const test = (tag) => tag.default && tag.tag !== "tag:yaml.org,2002:str" && tag.test?.test(str);
        const { compat, tags: tags2 } = ctx.doc.schema;
        if (tags2.some(test) || compat?.some(test))
          return quotedString(value, ctx);
      }
      return implicitKey ? str : foldFlowLines.foldFlowLines(str, indent, foldFlowLines.FOLD_FLOW, getFoldOptions(ctx, false));
    }
    function stringifyString(item, ctx, onComment, onChompKeep) {
      const { implicitKey, inFlow } = ctx;
      const ss = typeof item.value === "string" ? item : Object.assign({}, item, { value: String(item.value) });
      let { type } = item;
      if (type !== Scalar.Scalar.QUOTE_DOUBLE) {
        if (/[\x00-\x08\x0b-\x1f\x7f-\x9f\u{D800}-\u{DFFF}]/u.test(ss.value))
          type = Scalar.Scalar.QUOTE_DOUBLE;
      }
      const _stringify = (_type) => {
        switch (_type) {
          case Scalar.Scalar.BLOCK_FOLDED:
          case Scalar.Scalar.BLOCK_LITERAL:
            return implicitKey || inFlow ? quotedString(ss.value, ctx) : blockString(ss, ctx, onComment, onChompKeep);
          case Scalar.Scalar.QUOTE_DOUBLE:
            return doubleQuotedString(ss.value, ctx);
          case Scalar.Scalar.QUOTE_SINGLE:
            return singleQuotedString(ss.value, ctx);
          case Scalar.Scalar.PLAIN:
            return plainString(ss, ctx, onComment, onChompKeep);
          default:
            return null;
        }
      };
      let res = _stringify(type);
      if (res === null) {
        const { defaultKeyType, defaultStringType } = ctx.options;
        const t = implicitKey && defaultKeyType || defaultStringType;
        res = _stringify(t);
        if (res === null)
          throw new Error(`Unsupported default string type ${t}`);
      }
      return res;
    }
    exports.stringifyString = stringifyString;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/stringify/stringify.js
var require_stringify = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/stringify/stringify.js"(exports) {
    "use strict";
    var anchors = require_anchors();
    var identity = require_identity();
    var stringifyComment = require_stringifyComment();
    var stringifyString = require_stringifyString();
    function createStringifyContext(doc, options) {
      const opt = Object.assign({
        blockQuote: true,
        commentString: stringifyComment.stringifyComment,
        defaultKeyType: null,
        defaultStringType: "PLAIN",
        directives: null,
        doubleQuotedAsJSON: false,
        doubleQuotedMinMultiLineLength: 40,
        falseStr: "false",
        flowCollectionPadding: true,
        indentSeq: true,
        lineWidth: 80,
        minContentWidth: 20,
        nullStr: "null",
        simpleKeys: false,
        singleQuote: null,
        trailingComma: false,
        trueStr: "true",
        verifyAliasOrder: true
      }, doc.schema.toStringOptions, options);
      let inFlow;
      switch (opt.collectionStyle) {
        case "block":
          inFlow = false;
          break;
        case "flow":
          inFlow = true;
          break;
        default:
          inFlow = null;
      }
      return {
        anchors: /* @__PURE__ */ new Set(),
        doc,
        flowCollectionPadding: opt.flowCollectionPadding ? " " : "",
        indent: "",
        indentStep: typeof opt.indent === "number" ? " ".repeat(opt.indent) : "  ",
        inFlow,
        options: opt
      };
    }
    function getTagObject(tags2, item) {
      if (item.tag) {
        const match = tags2.filter((t) => t.tag === item.tag);
        if (match.length > 0)
          return match.find((t) => t.format === item.format) ?? match[0];
      }
      let tagObj = void 0;
      let obj;
      if (identity.isScalar(item)) {
        obj = item.value;
        let match = tags2.filter((t) => t.identify?.(obj));
        if (match.length > 1) {
          const testMatch = match.filter((t) => t.test);
          if (testMatch.length > 0)
            match = testMatch;
        }
        tagObj = match.find((t) => t.format === item.format) ?? match.find((t) => !t.format);
      } else {
        obj = item;
        tagObj = tags2.find((t) => t.nodeClass && obj instanceof t.nodeClass);
      }
      if (!tagObj) {
        const name = obj?.constructor?.name ?? (obj === null ? "null" : typeof obj);
        throw new Error(`Tag not resolved for ${name} value`);
      }
      return tagObj;
    }
    function stringifyProps(node, tagObj, { anchors: anchors$1, doc }) {
      if (!doc.directives)
        return "";
      const props = [];
      const anchor = (identity.isScalar(node) || identity.isCollection(node)) && node.anchor;
      if (anchor && anchors.anchorIsValid(anchor)) {
        anchors$1.add(anchor);
        props.push(`&${anchor}`);
      }
      const tag = node.tag ?? (tagObj.default ? null : tagObj.tag);
      if (tag)
        props.push(doc.directives.tagString(tag));
      return props.join(" ");
    }
    function stringify5(item, ctx, onComment, onChompKeep) {
      if (identity.isPair(item))
        return item.toString(ctx, onComment, onChompKeep);
      if (identity.isAlias(item)) {
        if (ctx.doc.directives)
          return item.toString(ctx);
        if (ctx.resolvedAliases?.has(item)) {
          throw new TypeError(`Cannot stringify circular structure without alias nodes`);
        } else {
          if (ctx.resolvedAliases)
            ctx.resolvedAliases.add(item);
          else
            ctx.resolvedAliases = /* @__PURE__ */ new Set([item]);
          item = item.resolve(ctx.doc);
        }
      }
      let tagObj = void 0;
      const node = identity.isNode(item) ? item : ctx.doc.createNode(item, { onTagObj: (o) => tagObj = o });
      tagObj ?? (tagObj = getTagObject(ctx.doc.schema.tags, node));
      const props = stringifyProps(node, tagObj, ctx);
      if (props.length > 0)
        ctx.indentAtStart = (ctx.indentAtStart ?? 0) + props.length + 1;
      const str = typeof tagObj.stringify === "function" ? tagObj.stringify(node, ctx, onComment, onChompKeep) : identity.isScalar(node) ? stringifyString.stringifyString(node, ctx, onComment, onChompKeep) : node.toString(ctx, onComment, onChompKeep);
      if (!props)
        return str;
      return identity.isScalar(node) || str[0] === "{" || str[0] === "[" ? `${props} ${str}` : `${props}
${ctx.indent}${str}`;
    }
    exports.createStringifyContext = createStringifyContext;
    exports.stringify = stringify5;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/stringify/stringifyPair.js
var require_stringifyPair = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/stringify/stringifyPair.js"(exports) {
    "use strict";
    var identity = require_identity();
    var Scalar = require_Scalar();
    var stringify5 = require_stringify();
    var stringifyComment = require_stringifyComment();
    function stringifyPair({ key, value }, ctx, onComment, onChompKeep) {
      const { allNullValues, doc, indent, indentStep, options: { commentString, indentSeq, simpleKeys } } = ctx;
      let keyComment = identity.isNode(key) && key.comment || null;
      if (simpleKeys) {
        if (keyComment) {
          throw new Error("With simple keys, key nodes cannot have comments");
        }
        if (identity.isCollection(key) || !identity.isNode(key) && typeof key === "object") {
          const msg = "With simple keys, collection cannot be used as a key value";
          throw new Error(msg);
        }
      }
      let explicitKey = !simpleKeys && (!key || keyComment && value == null && !ctx.inFlow || identity.isCollection(key) || (identity.isScalar(key) ? key.type === Scalar.Scalar.BLOCK_FOLDED || key.type === Scalar.Scalar.BLOCK_LITERAL : typeof key === "object"));
      ctx = Object.assign({}, ctx, {
        allNullValues: false,
        implicitKey: !explicitKey && (simpleKeys || !allNullValues),
        indent: indent + indentStep
      });
      let keyCommentDone = false;
      let chompKeep = false;
      let str = stringify5.stringify(key, ctx, () => keyCommentDone = true, () => chompKeep = true);
      if (!explicitKey && !ctx.inFlow && str.length > 1024) {
        if (simpleKeys)
          throw new Error("With simple keys, single line scalar must not span more than 1024 characters");
        explicitKey = true;
      }
      if (ctx.inFlow) {
        if (allNullValues || value == null) {
          if (keyCommentDone && onComment)
            onComment();
          return str === "" ? "?" : explicitKey ? `? ${str}` : str;
        }
      } else if (allNullValues && !simpleKeys || value == null && explicitKey) {
        str = `? ${str}`;
        if (keyComment && !keyCommentDone) {
          str += stringifyComment.lineComment(str, ctx.indent, commentString(keyComment));
        } else if (chompKeep && onChompKeep)
          onChompKeep();
        return str;
      }
      if (keyCommentDone)
        keyComment = null;
      if (explicitKey) {
        if (keyComment)
          str += stringifyComment.lineComment(str, ctx.indent, commentString(keyComment));
        str = `? ${str}
${indent}:`;
      } else {
        str = `${str}:`;
        if (keyComment)
          str += stringifyComment.lineComment(str, ctx.indent, commentString(keyComment));
      }
      let vsb, vcb, valueComment;
      if (identity.isNode(value)) {
        vsb = !!value.spaceBefore;
        vcb = value.commentBefore;
        valueComment = value.comment;
      } else {
        vsb = false;
        vcb = null;
        valueComment = null;
        if (value && typeof value === "object")
          value = doc.createNode(value);
      }
      ctx.implicitKey = false;
      if (!explicitKey && !keyComment && identity.isScalar(value))
        ctx.indentAtStart = str.length + 1;
      chompKeep = false;
      if (!indentSeq && indentStep.length >= 2 && !ctx.inFlow && !explicitKey && identity.isSeq(value) && !value.flow && !value.tag && !value.anchor) {
        ctx.indent = ctx.indent.substring(2);
      }
      let valueCommentDone = false;
      const valueStr = stringify5.stringify(value, ctx, () => valueCommentDone = true, () => chompKeep = true);
      let ws = " ";
      if (keyComment || vsb || vcb) {
        ws = vsb ? "\n" : "";
        if (vcb) {
          const cs = commentString(vcb);
          ws += `
${stringifyComment.indentComment(cs, ctx.indent)}`;
        }
        if (valueStr === "" && !ctx.inFlow) {
          if (ws === "\n" && valueComment)
            ws = "\n\n";
        } else {
          ws += `
${ctx.indent}`;
        }
      } else if (!explicitKey && identity.isCollection(value)) {
        const vs0 = valueStr[0];
        const nl0 = valueStr.indexOf("\n");
        const hasNewline = nl0 !== -1;
        const flow = ctx.inFlow ?? value.flow ?? value.items.length === 0;
        if (hasNewline || !flow) {
          let hasPropsLine = false;
          if (hasNewline && (vs0 === "&" || vs0 === "!")) {
            let sp0 = valueStr.indexOf(" ");
            if (vs0 === "&" && sp0 !== -1 && sp0 < nl0 && valueStr[sp0 + 1] === "!") {
              sp0 = valueStr.indexOf(" ", sp0 + 1);
            }
            if (sp0 === -1 || nl0 < sp0)
              hasPropsLine = true;
          }
          if (!hasPropsLine)
            ws = `
${ctx.indent}`;
        }
      } else if (valueStr === "" || valueStr[0] === "\n") {
        ws = "";
      }
      str += ws + valueStr;
      if (ctx.inFlow) {
        if (valueCommentDone && onComment)
          onComment();
      } else if (valueComment && !valueCommentDone) {
        str += stringifyComment.lineComment(str, ctx.indent, commentString(valueComment));
      } else if (chompKeep && onChompKeep) {
        onChompKeep();
      }
      return str;
    }
    exports.stringifyPair = stringifyPair;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/log.js
var require_log = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/log.js"(exports) {
    "use strict";
    var node_process = __require("process");
    function debug(logLevel, ...messages) {
      if (logLevel === "debug")
        console.log(...messages);
    }
    function warn(logLevel, warning) {
      if (logLevel === "debug" || logLevel === "warn") {
        if (typeof node_process.emitWarning === "function")
          node_process.emitWarning(warning);
        else
          console.warn(warning);
      }
    }
    exports.debug = debug;
    exports.warn = warn;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/yaml-1.1/merge.js
var require_merge = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/yaml-1.1/merge.js"(exports) {
    "use strict";
    var identity = require_identity();
    var Scalar = require_Scalar();
    var MERGE_KEY = "<<";
    var merge = {
      identify: (value) => value === MERGE_KEY || typeof value === "symbol" && value.description === MERGE_KEY,
      default: "key",
      tag: "tag:yaml.org,2002:merge",
      test: /^<<$/,
      resolve: () => Object.assign(new Scalar.Scalar(Symbol(MERGE_KEY)), {
        addToJSMap: addMergeToJSMap
      }),
      stringify: () => MERGE_KEY
    };
    var isMergeKey = (ctx, key) => (merge.identify(key) || identity.isScalar(key) && (!key.type || key.type === Scalar.Scalar.PLAIN) && merge.identify(key.value)) && ctx?.doc.schema.tags.some((tag) => tag.tag === merge.tag && tag.default);
    function addMergeToJSMap(ctx, map, value) {
      const source = resolveAliasValue(ctx, value);
      if (identity.isSeq(source))
        for (const it of source.items)
          mergeValue(ctx, map, it);
      else if (Array.isArray(source))
        for (const it of source)
          mergeValue(ctx, map, it);
      else
        mergeValue(ctx, map, source);
    }
    function mergeValue(ctx, map, value) {
      const source = resolveAliasValue(ctx, value);
      if (!identity.isMap(source))
        throw new Error("Merge sources must be maps or map aliases");
      const srcMap = source.toJSON(null, ctx, Map);
      for (const [key, value2] of srcMap) {
        if (map instanceof Map) {
          if (!map.has(key))
            map.set(key, value2);
        } else if (map instanceof Set) {
          map.add(key);
        } else if (!Object.prototype.hasOwnProperty.call(map, key)) {
          Object.defineProperty(map, key, {
            value: value2,
            writable: true,
            enumerable: true,
            configurable: true
          });
        }
      }
      return map;
    }
    function resolveAliasValue(ctx, value) {
      return ctx && identity.isAlias(value) ? value.resolve(ctx.doc, ctx) : value;
    }
    exports.addMergeToJSMap = addMergeToJSMap;
    exports.isMergeKey = isMergeKey;
    exports.merge = merge;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/nodes/addPairToJSMap.js
var require_addPairToJSMap = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/nodes/addPairToJSMap.js"(exports) {
    "use strict";
    var log2 = require_log();
    var merge = require_merge();
    var stringify5 = require_stringify();
    var identity = require_identity();
    var toJS = require_toJS();
    function addPairToJSMap(ctx, map, { key, value }) {
      if (identity.isNode(key) && key.addToJSMap)
        key.addToJSMap(ctx, map, value);
      else if (merge.isMergeKey(ctx, key))
        merge.addMergeToJSMap(ctx, map, value);
      else {
        const jsKey = toJS.toJS(key, "", ctx);
        if (map instanceof Map) {
          map.set(jsKey, toJS.toJS(value, jsKey, ctx));
        } else if (map instanceof Set) {
          map.add(jsKey);
        } else {
          const stringKey = stringifyKey(key, jsKey, ctx);
          const jsValue = toJS.toJS(value, stringKey, ctx);
          if (stringKey in map)
            Object.defineProperty(map, stringKey, {
              value: jsValue,
              writable: true,
              enumerable: true,
              configurable: true
            });
          else
            map[stringKey] = jsValue;
        }
      }
      return map;
    }
    function stringifyKey(key, jsKey, ctx) {
      if (jsKey === null)
        return "";
      if (typeof jsKey !== "object")
        return String(jsKey);
      if (identity.isNode(key) && ctx?.doc) {
        const strCtx = stringify5.createStringifyContext(ctx.doc, {});
        strCtx.anchors = /* @__PURE__ */ new Set();
        for (const node of ctx.anchors.keys())
          strCtx.anchors.add(node.anchor);
        strCtx.inFlow = true;
        strCtx.inStringifyKey = true;
        const strKey = key.toString(strCtx);
        if (!ctx.mapKeyWarned) {
          let jsonStr = JSON.stringify(strKey);
          if (jsonStr.length > 40)
            jsonStr = jsonStr.substring(0, 36) + '..."';
          log2.warn(ctx.doc.options.logLevel, `Keys with collection values will be stringified due to JS Object restrictions: ${jsonStr}. Set mapAsMap: true to use object keys.`);
          ctx.mapKeyWarned = true;
        }
        return strKey;
      }
      return JSON.stringify(jsKey);
    }
    exports.addPairToJSMap = addPairToJSMap;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/nodes/Pair.js
var require_Pair = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/nodes/Pair.js"(exports) {
    "use strict";
    var createNode = require_createNode();
    var stringifyPair = require_stringifyPair();
    var addPairToJSMap = require_addPairToJSMap();
    var identity = require_identity();
    function createPair(key, value, ctx) {
      const k = createNode.createNode(key, void 0, ctx);
      const v = createNode.createNode(value, void 0, ctx);
      return new Pair(k, v);
    }
    var Pair = class _Pair {
      constructor(key, value = null) {
        Object.defineProperty(this, identity.NODE_TYPE, { value: identity.PAIR });
        this.key = key;
        this.value = value;
      }
      clone(schema) {
        let { key, value } = this;
        if (identity.isNode(key))
          key = key.clone(schema);
        if (identity.isNode(value))
          value = value.clone(schema);
        return new _Pair(key, value);
      }
      toJSON(_, ctx) {
        const pair = ctx?.mapAsMap ? /* @__PURE__ */ new Map() : {};
        return addPairToJSMap.addPairToJSMap(ctx, pair, this);
      }
      toString(ctx, onComment, onChompKeep) {
        return ctx?.doc ? stringifyPair.stringifyPair(this, ctx, onComment, onChompKeep) : JSON.stringify(this);
      }
    };
    exports.Pair = Pair;
    exports.createPair = createPair;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/stringify/stringifyCollection.js
var require_stringifyCollection = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/stringify/stringifyCollection.js"(exports) {
    "use strict";
    var identity = require_identity();
    var stringify5 = require_stringify();
    var stringifyComment = require_stringifyComment();
    function stringifyCollection(collection, ctx, options) {
      const flow = ctx.inFlow ?? collection.flow;
      const stringify6 = flow ? stringifyFlowCollection : stringifyBlockCollection;
      return stringify6(collection, ctx, options);
    }
    function stringifyBlockCollection({ comment, items }, ctx, { blockItemPrefix, flowChars, itemIndent, onChompKeep, onComment }) {
      const { indent, options: { commentString } } = ctx;
      const itemCtx = Object.assign({}, ctx, { indent: itemIndent, type: null });
      let chompKeep = false;
      const lines = [];
      for (let i = 0; i < items.length; ++i) {
        const item = items[i];
        let comment2 = null;
        if (identity.isNode(item)) {
          if (!chompKeep && item.spaceBefore)
            lines.push("");
          addCommentBefore(ctx, lines, item.commentBefore, chompKeep);
          if (item.comment)
            comment2 = item.comment;
        } else if (identity.isPair(item)) {
          const ik = identity.isNode(item.key) ? item.key : null;
          if (ik) {
            if (!chompKeep && ik.spaceBefore)
              lines.push("");
            addCommentBefore(ctx, lines, ik.commentBefore, chompKeep);
          }
        }
        chompKeep = false;
        let str2 = stringify5.stringify(item, itemCtx, () => comment2 = null, () => chompKeep = true);
        if (comment2)
          str2 += stringifyComment.lineComment(str2, itemIndent, commentString(comment2));
        if (chompKeep && comment2)
          chompKeep = false;
        lines.push(blockItemPrefix + str2);
      }
      let str;
      if (lines.length === 0) {
        str = flowChars.start + flowChars.end;
      } else {
        str = lines[0];
        for (let i = 1; i < lines.length; ++i) {
          const line3 = lines[i];
          str += line3 ? `
${indent}${line3}` : "\n";
        }
      }
      if (comment) {
        str += "\n" + stringifyComment.indentComment(commentString(comment), indent);
        if (onComment)
          onComment();
      } else if (chompKeep && onChompKeep)
        onChompKeep();
      return str;
    }
    function stringifyFlowCollection({ items }, ctx, { flowChars, itemIndent }) {
      const { indent, indentStep, flowCollectionPadding: fcPadding, options: { commentString } } = ctx;
      itemIndent += indentStep;
      const itemCtx = Object.assign({}, ctx, {
        indent: itemIndent,
        inFlow: true,
        type: null
      });
      let reqNewline = false;
      let linesAtValue = 0;
      const lines = [];
      for (let i = 0; i < items.length; ++i) {
        const item = items[i];
        let comment = null;
        if (identity.isNode(item)) {
          if (item.spaceBefore)
            lines.push("");
          addCommentBefore(ctx, lines, item.commentBefore, false);
          if (item.comment)
            comment = item.comment;
        } else if (identity.isPair(item)) {
          const ik = identity.isNode(item.key) ? item.key : null;
          if (ik) {
            if (ik.spaceBefore)
              lines.push("");
            addCommentBefore(ctx, lines, ik.commentBefore, false);
            if (ik.comment)
              reqNewline = true;
          }
          const iv = identity.isNode(item.value) ? item.value : null;
          if (iv) {
            if (iv.comment)
              comment = iv.comment;
            if (iv.commentBefore)
              reqNewline = true;
          } else if (item.value == null && ik?.comment) {
            comment = ik.comment;
          }
        }
        if (comment)
          reqNewline = true;
        let str = stringify5.stringify(item, itemCtx, () => comment = null);
        reqNewline || (reqNewline = lines.length > linesAtValue || str.includes("\n"));
        if (i < items.length - 1) {
          str += ",";
        } else if (ctx.options.trailingComma) {
          if (ctx.options.lineWidth > 0) {
            reqNewline || (reqNewline = lines.reduce((sum, line3) => sum + line3.length + 2, 2) + (str.length + 2) > ctx.options.lineWidth);
          }
          if (reqNewline) {
            str += ",";
          }
        }
        if (comment)
          str += stringifyComment.lineComment(str, itemIndent, commentString(comment));
        lines.push(str);
        linesAtValue = lines.length;
      }
      const { start, end } = flowChars;
      if (lines.length === 0) {
        return start + end;
      } else {
        if (!reqNewline) {
          const len = lines.reduce((sum, line3) => sum + line3.length + 2, 2);
          reqNewline = ctx.options.lineWidth > 0 && len > ctx.options.lineWidth;
        }
        if (reqNewline) {
          let str = start;
          for (const line3 of lines)
            str += line3 ? `
${indentStep}${indent}${line3}` : "\n";
          return `${str}
${indent}${end}`;
        } else {
          return `${start}${fcPadding}${lines.join(" ")}${fcPadding}${end}`;
        }
      }
    }
    function addCommentBefore({ indent, options: { commentString } }, lines, comment, chompKeep) {
      if (comment && chompKeep)
        comment = comment.replace(/^\n+/, "");
      if (comment) {
        const ic = stringifyComment.indentComment(commentString(comment), indent);
        lines.push(ic.trimStart());
      }
    }
    exports.stringifyCollection = stringifyCollection;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/nodes/YAMLMap.js
var require_YAMLMap = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/nodes/YAMLMap.js"(exports) {
    "use strict";
    var stringifyCollection = require_stringifyCollection();
    var addPairToJSMap = require_addPairToJSMap();
    var Collection = require_Collection();
    var identity = require_identity();
    var Pair = require_Pair();
    var Scalar = require_Scalar();
    function findPair(items, key) {
      const k = identity.isScalar(key) ? key.value : key;
      for (const it of items) {
        if (identity.isPair(it)) {
          if (it.key === key || it.key === k)
            return it;
          if (identity.isScalar(it.key) && it.key.value === k)
            return it;
        }
      }
      return void 0;
    }
    var YAMLMap = class extends Collection.Collection {
      static get tagName() {
        return "tag:yaml.org,2002:map";
      }
      constructor(schema) {
        super(identity.MAP, schema);
        this.items = [];
      }
      /**
       * A generic collection parsing method that can be extended
       * to other node classes that inherit from YAMLMap
       */
      static from(schema, obj, ctx) {
        const { keepUndefined, replacer } = ctx;
        const map = new this(schema);
        const add2 = (key, value) => {
          if (typeof replacer === "function")
            value = replacer.call(obj, key, value);
          else if (Array.isArray(replacer) && !replacer.includes(key))
            return;
          if (value !== void 0 || keepUndefined)
            map.items.push(Pair.createPair(key, value, ctx));
        };
        if (obj instanceof Map) {
          for (const [key, value] of obj)
            add2(key, value);
        } else if (obj && typeof obj === "object") {
          for (const key of Object.keys(obj))
            add2(key, obj[key]);
        }
        if (typeof schema.sortMapEntries === "function") {
          map.items.sort(schema.sortMapEntries);
        }
        return map;
      }
      /**
       * Adds a value to the collection.
       *
       * @param overwrite - If not set `true`, using a key that is already in the
       *   collection will throw. Otherwise, overwrites the previous value.
       */
      add(pair, overwrite) {
        let _pair;
        if (identity.isPair(pair))
          _pair = pair;
        else if (!pair || typeof pair !== "object" || !("key" in pair)) {
          _pair = new Pair.Pair(pair, pair?.value);
        } else
          _pair = new Pair.Pair(pair.key, pair.value);
        const prev = findPair(this.items, _pair.key);
        const sortEntries = this.schema?.sortMapEntries;
        if (prev) {
          if (!overwrite)
            throw new Error(`Key ${_pair.key} already set`);
          if (identity.isScalar(prev.value) && Scalar.isScalarValue(_pair.value))
            prev.value.value = _pair.value;
          else
            prev.value = _pair.value;
        } else if (sortEntries) {
          const i = this.items.findIndex((item) => sortEntries(_pair, item) < 0);
          if (i === -1)
            this.items.push(_pair);
          else
            this.items.splice(i, 0, _pair);
        } else {
          this.items.push(_pair);
        }
      }
      delete(key) {
        const it = findPair(this.items, key);
        if (!it)
          return false;
        const del = this.items.splice(this.items.indexOf(it), 1);
        return del.length > 0;
      }
      get(key, keepScalar) {
        const it = findPair(this.items, key);
        const node = it?.value;
        return (!keepScalar && identity.isScalar(node) ? node.value : node) ?? void 0;
      }
      has(key) {
        return !!findPair(this.items, key);
      }
      set(key, value) {
        this.add(new Pair.Pair(key, value), true);
      }
      /**
       * @param ctx - Conversion context, originally set in Document#toJS()
       * @param {Class} Type - If set, forces the returned collection type
       * @returns Instance of Type, Map, or Object
       */
      toJSON(_, ctx, Type) {
        const map = Type ? new Type() : ctx?.mapAsMap ? /* @__PURE__ */ new Map() : {};
        if (ctx?.onCreate)
          ctx.onCreate(map);
        for (const item of this.items)
          addPairToJSMap.addPairToJSMap(ctx, map, item);
        return map;
      }
      toString(ctx, onComment, onChompKeep) {
        if (!ctx)
          return JSON.stringify(this);
        for (const item of this.items) {
          if (!identity.isPair(item))
            throw new Error(`Map items must all be pairs; found ${JSON.stringify(item)} instead`);
        }
        if (!ctx.allNullValues && this.hasAllNullValues(false))
          ctx = Object.assign({}, ctx, { allNullValues: true });
        return stringifyCollection.stringifyCollection(this, ctx, {
          blockItemPrefix: "",
          flowChars: { start: "{", end: "}" },
          itemIndent: ctx.indent || "",
          onChompKeep,
          onComment
        });
      }
    };
    exports.YAMLMap = YAMLMap;
    exports.findPair = findPair;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/common/map.js
var require_map = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/common/map.js"(exports) {
    "use strict";
    var identity = require_identity();
    var YAMLMap = require_YAMLMap();
    var map = {
      collection: "map",
      default: true,
      nodeClass: YAMLMap.YAMLMap,
      tag: "tag:yaml.org,2002:map",
      resolve(map2, onError) {
        if (!identity.isMap(map2))
          onError("Expected a mapping for this tag");
        return map2;
      },
      createNode: (schema, obj, ctx) => YAMLMap.YAMLMap.from(schema, obj, ctx)
    };
    exports.map = map;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/nodes/YAMLSeq.js
var require_YAMLSeq = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/nodes/YAMLSeq.js"(exports) {
    "use strict";
    var createNode = require_createNode();
    var stringifyCollection = require_stringifyCollection();
    var Collection = require_Collection();
    var identity = require_identity();
    var Scalar = require_Scalar();
    var toJS = require_toJS();
    var YAMLSeq = class extends Collection.Collection {
      static get tagName() {
        return "tag:yaml.org,2002:seq";
      }
      constructor(schema) {
        super(identity.SEQ, schema);
        this.items = [];
      }
      add(value) {
        this.items.push(value);
      }
      /**
       * Removes a value from the collection.
       *
       * `key` must contain a representation of an integer for this to succeed.
       * It may be wrapped in a `Scalar`.
       *
       * @returns `true` if the item was found and removed.
       */
      delete(key) {
        const idx = asItemIndex(key);
        if (typeof idx !== "number")
          return false;
        const del = this.items.splice(idx, 1);
        return del.length > 0;
      }
      get(key, keepScalar) {
        const idx = asItemIndex(key);
        if (typeof idx !== "number")
          return void 0;
        const it = this.items[idx];
        return !keepScalar && identity.isScalar(it) ? it.value : it;
      }
      /**
       * Checks if the collection includes a value with the key `key`.
       *
       * `key` must contain a representation of an integer for this to succeed.
       * It may be wrapped in a `Scalar`.
       */
      has(key) {
        const idx = asItemIndex(key);
        return typeof idx === "number" && idx < this.items.length;
      }
      /**
       * Sets a value in this collection. For `!!set`, `value` needs to be a
       * boolean to add/remove the item from the set.
       *
       * If `key` does not contain a representation of an integer, this will throw.
       * It may be wrapped in a `Scalar`.
       */
      set(key, value) {
        const idx = asItemIndex(key);
        if (typeof idx !== "number")
          throw new Error(`Expected a valid index, not ${key}.`);
        const prev = this.items[idx];
        if (identity.isScalar(prev) && Scalar.isScalarValue(value))
          prev.value = value;
        else
          this.items[idx] = value;
      }
      toJSON(_, ctx) {
        const seq = [];
        if (ctx?.onCreate)
          ctx.onCreate(seq);
        let i = 0;
        for (const item of this.items)
          seq.push(toJS.toJS(item, String(i++), ctx));
        return seq;
      }
      toString(ctx, onComment, onChompKeep) {
        if (!ctx)
          return JSON.stringify(this);
        return stringifyCollection.stringifyCollection(this, ctx, {
          blockItemPrefix: "- ",
          flowChars: { start: "[", end: "]" },
          itemIndent: (ctx.indent || "") + "  ",
          onChompKeep,
          onComment
        });
      }
      static from(schema, obj, ctx) {
        const { replacer } = ctx;
        const seq = new this(schema);
        if (obj && Symbol.iterator in Object(obj)) {
          let i = 0;
          for (let it of obj) {
            if (typeof replacer === "function") {
              const key = obj instanceof Set ? it : String(i++);
              it = replacer.call(obj, key, it);
            }
            seq.items.push(createNode.createNode(it, void 0, ctx));
          }
        }
        return seq;
      }
    };
    function asItemIndex(key) {
      let idx = identity.isScalar(key) ? key.value : key;
      if (idx && typeof idx === "string")
        idx = Number(idx);
      return typeof idx === "number" && Number.isInteger(idx) && idx >= 0 ? idx : null;
    }
    exports.YAMLSeq = YAMLSeq;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/common/seq.js
var require_seq = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/common/seq.js"(exports) {
    "use strict";
    var identity = require_identity();
    var YAMLSeq = require_YAMLSeq();
    var seq = {
      collection: "seq",
      default: true,
      nodeClass: YAMLSeq.YAMLSeq,
      tag: "tag:yaml.org,2002:seq",
      resolve(seq2, onError) {
        if (!identity.isSeq(seq2))
          onError("Expected a sequence for this tag");
        return seq2;
      },
      createNode: (schema, obj, ctx) => YAMLSeq.YAMLSeq.from(schema, obj, ctx)
    };
    exports.seq = seq;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/common/string.js
var require_string = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/common/string.js"(exports) {
    "use strict";
    var stringifyString = require_stringifyString();
    var string = {
      identify: (value) => typeof value === "string",
      default: true,
      tag: "tag:yaml.org,2002:str",
      resolve: (str) => str,
      stringify(item, ctx, onComment, onChompKeep) {
        ctx = Object.assign({ actualString: true }, ctx);
        return stringifyString.stringifyString(item, ctx, onComment, onChompKeep);
      }
    };
    exports.string = string;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/common/null.js
var require_null = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/common/null.js"(exports) {
    "use strict";
    var Scalar = require_Scalar();
    var nullTag = {
      identify: (value) => value == null,
      createNode: () => new Scalar.Scalar(null),
      default: true,
      tag: "tag:yaml.org,2002:null",
      test: /^(?:~|[Nn]ull|NULL)?$/,
      resolve: () => new Scalar.Scalar(null),
      stringify: ({ source }, ctx) => typeof source === "string" && nullTag.test.test(source) ? source : ctx.options.nullStr
    };
    exports.nullTag = nullTag;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/core/bool.js
var require_bool = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/core/bool.js"(exports) {
    "use strict";
    var Scalar = require_Scalar();
    var boolTag = {
      identify: (value) => typeof value === "boolean",
      default: true,
      tag: "tag:yaml.org,2002:bool",
      test: /^(?:[Tt]rue|TRUE|[Ff]alse|FALSE)$/,
      resolve: (str) => new Scalar.Scalar(str[0] === "t" || str[0] === "T"),
      stringify({ source, value }, ctx) {
        if (source && boolTag.test.test(source)) {
          const sv = source[0] === "t" || source[0] === "T";
          if (value === sv)
            return source;
        }
        return value ? ctx.options.trueStr : ctx.options.falseStr;
      }
    };
    exports.boolTag = boolTag;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/stringify/stringifyNumber.js
var require_stringifyNumber = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/stringify/stringifyNumber.js"(exports) {
    "use strict";
    function stringifyNumber({ format, minFractionDigits, tag, value }) {
      if (typeof value === "bigint")
        return String(value);
      const num = typeof value === "number" ? value : Number(value);
      if (!isFinite(num))
        return isNaN(num) ? ".nan" : num < 0 ? "-.inf" : ".inf";
      let n = Object.is(value, -0) ? "-0" : JSON.stringify(value);
      if (!format && minFractionDigits && (!tag || tag === "tag:yaml.org,2002:float") && /^-?\d/.test(n) && !n.includes("e")) {
        let i = n.indexOf(".");
        if (i < 0) {
          i = n.length;
          n += ".";
        }
        let d = minFractionDigits - (n.length - i - 1);
        while (d-- > 0)
          n += "0";
      }
      return n;
    }
    exports.stringifyNumber = stringifyNumber;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/core/float.js
var require_float = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/core/float.js"(exports) {
    "use strict";
    var Scalar = require_Scalar();
    var stringifyNumber = require_stringifyNumber();
    var floatNaN = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      test: /^(?:[-+]?\.(?:inf|Inf|INF)|\.nan|\.NaN|\.NAN)$/,
      resolve: (str) => str.slice(-3).toLowerCase() === "nan" ? NaN : str[0] === "-" ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY,
      stringify: stringifyNumber.stringifyNumber
    };
    var floatExp = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      format: "EXP",
      test: /^[-+]?(?:\.[0-9]+|[0-9]+(?:\.[0-9]*)?)[eE][-+]?[0-9]+$/,
      resolve: (str) => parseFloat(str),
      stringify(node) {
        const num = Number(node.value);
        return isFinite(num) ? num.toExponential() : stringifyNumber.stringifyNumber(node);
      }
    };
    var float = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      test: /^[-+]?(?:\.[0-9]+|[0-9]+\.[0-9]*)$/,
      resolve(str) {
        const node = new Scalar.Scalar(parseFloat(str));
        const dot = str.indexOf(".");
        if (dot !== -1 && str[str.length - 1] === "0")
          node.minFractionDigits = str.length - dot - 1;
        return node;
      },
      stringify: stringifyNumber.stringifyNumber
    };
    exports.float = float;
    exports.floatExp = floatExp;
    exports.floatNaN = floatNaN;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/core/int.js
var require_int = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/core/int.js"(exports) {
    "use strict";
    var stringifyNumber = require_stringifyNumber();
    var intIdentify = (value) => typeof value === "bigint" || Number.isInteger(value);
    var intResolve = (str, offset, radix, { intAsBigInt }) => intAsBigInt ? BigInt(str) : parseInt(str.substring(offset), radix);
    function intStringify(node, radix, prefix) {
      const { value } = node;
      if (intIdentify(value) && value >= 0)
        return prefix + value.toString(radix);
      return stringifyNumber.stringifyNumber(node);
    }
    var intOct = {
      identify: (value) => intIdentify(value) && value >= 0,
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "OCT",
      test: /^0o[0-7]+$/,
      resolve: (str, _onError, opt) => intResolve(str, 2, 8, opt),
      stringify: (node) => intStringify(node, 8, "0o")
    };
    var int = {
      identify: intIdentify,
      default: true,
      tag: "tag:yaml.org,2002:int",
      test: /^[-+]?[0-9]+$/,
      resolve: (str, _onError, opt) => intResolve(str, 0, 10, opt),
      stringify: stringifyNumber.stringifyNumber
    };
    var intHex = {
      identify: (value) => intIdentify(value) && value >= 0,
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "HEX",
      test: /^0x[0-9a-fA-F]+$/,
      resolve: (str, _onError, opt) => intResolve(str, 2, 16, opt),
      stringify: (node) => intStringify(node, 16, "0x")
    };
    exports.int = int;
    exports.intHex = intHex;
    exports.intOct = intOct;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/core/schema.js
var require_schema = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/core/schema.js"(exports) {
    "use strict";
    var map = require_map();
    var _null = require_null();
    var seq = require_seq();
    var string = require_string();
    var bool = require_bool();
    var float = require_float();
    var int = require_int();
    var schema = [
      map.map,
      seq.seq,
      string.string,
      _null.nullTag,
      bool.boolTag,
      int.intOct,
      int.int,
      int.intHex,
      float.floatNaN,
      float.floatExp,
      float.float
    ];
    exports.schema = schema;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/json/schema.js
var require_schema2 = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/json/schema.js"(exports) {
    "use strict";
    var Scalar = require_Scalar();
    var map = require_map();
    var seq = require_seq();
    function intIdentify(value) {
      return typeof value === "bigint" || Number.isInteger(value);
    }
    var stringifyJSON = ({ value }) => JSON.stringify(value);
    var jsonScalars = [
      {
        identify: (value) => typeof value === "string",
        default: true,
        tag: "tag:yaml.org,2002:str",
        resolve: (str) => str,
        stringify: stringifyJSON
      },
      {
        identify: (value) => value == null,
        createNode: () => new Scalar.Scalar(null),
        default: true,
        tag: "tag:yaml.org,2002:null",
        test: /^null$/,
        resolve: () => null,
        stringify: stringifyJSON
      },
      {
        identify: (value) => typeof value === "boolean",
        default: true,
        tag: "tag:yaml.org,2002:bool",
        test: /^true$|^false$/,
        resolve: (str) => str === "true",
        stringify: stringifyJSON
      },
      {
        identify: intIdentify,
        default: true,
        tag: "tag:yaml.org,2002:int",
        test: /^-?(?:0|[1-9][0-9]*)$/,
        resolve: (str, _onError, { intAsBigInt }) => intAsBigInt ? BigInt(str) : parseInt(str, 10),
        stringify: ({ value }) => intIdentify(value) ? value.toString() : JSON.stringify(value)
      },
      {
        identify: (value) => typeof value === "number",
        default: true,
        tag: "tag:yaml.org,2002:float",
        test: /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]*)?(?:[eE][-+]?[0-9]+)?$/,
        resolve: (str) => parseFloat(str),
        stringify: stringifyJSON
      }
    ];
    var jsonError = {
      default: true,
      tag: "",
      test: /^/,
      resolve(str, onError) {
        onError(`Unresolved plain scalar ${JSON.stringify(str)}`);
        return str;
      }
    };
    var schema = [map.map, seq.seq].concat(jsonScalars, jsonError);
    exports.schema = schema;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/yaml-1.1/binary.js
var require_binary = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/yaml-1.1/binary.js"(exports) {
    "use strict";
    var node_buffer = __require("buffer");
    var Scalar = require_Scalar();
    var stringifyString = require_stringifyString();
    var binary = {
      identify: (value) => value instanceof Uint8Array,
      // Buffer inherits from Uint8Array
      default: false,
      tag: "tag:yaml.org,2002:binary",
      /**
       * Returns a Buffer in node and an Uint8Array in browsers
       *
       * To use the resulting buffer as an image, you'll want to do something like:
       *
       *   const blob = new Blob([buffer], { type: 'image/jpeg' })
       *   document.querySelector('#photo').src = URL.createObjectURL(blob)
       */
      resolve(src, onError) {
        if (typeof node_buffer.Buffer === "function") {
          return node_buffer.Buffer.from(src, "base64");
        } else if (typeof atob === "function") {
          const str = atob(src.replace(/[\n\r]/g, ""));
          const buffer = new Uint8Array(str.length);
          for (let i = 0; i < str.length; ++i)
            buffer[i] = str.charCodeAt(i);
          return buffer;
        } else {
          onError("This environment does not support reading binary tags; either Buffer or atob is required");
          return src;
        }
      },
      stringify({ comment, type, value }, ctx, onComment, onChompKeep) {
        if (!value)
          return "";
        const buf = value;
        let str;
        if (typeof node_buffer.Buffer === "function") {
          str = buf instanceof node_buffer.Buffer ? buf.toString("base64") : node_buffer.Buffer.from(buf.buffer).toString("base64");
        } else if (typeof btoa === "function") {
          let s = "";
          for (let i = 0; i < buf.length; ++i)
            s += String.fromCharCode(buf[i]);
          str = btoa(s);
        } else {
          throw new Error("This environment does not support writing binary tags; either Buffer or btoa is required");
        }
        type ?? (type = Scalar.Scalar.BLOCK_LITERAL);
        if (type !== Scalar.Scalar.QUOTE_DOUBLE) {
          const lineWidth = Math.max(ctx.options.lineWidth - ctx.indent.length, ctx.options.minContentWidth);
          const n = Math.ceil(str.length / lineWidth);
          const lines = new Array(n);
          for (let i = 0, o = 0; i < n; ++i, o += lineWidth) {
            lines[i] = str.substr(o, lineWidth);
          }
          str = lines.join(type === Scalar.Scalar.BLOCK_LITERAL ? "\n" : " ");
        }
        return stringifyString.stringifyString({ comment, type, value: str }, ctx, onComment, onChompKeep);
      }
    };
    exports.binary = binary;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/yaml-1.1/pairs.js
var require_pairs = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/yaml-1.1/pairs.js"(exports) {
    "use strict";
    var identity = require_identity();
    var Pair = require_Pair();
    var Scalar = require_Scalar();
    var YAMLSeq = require_YAMLSeq();
    function resolvePairs(seq, onError) {
      if (identity.isSeq(seq)) {
        for (let i = 0; i < seq.items.length; ++i) {
          let item = seq.items[i];
          if (identity.isPair(item))
            continue;
          else if (identity.isMap(item)) {
            if (item.items.length > 1)
              onError("Each pair must have its own sequence indicator");
            const pair = item.items[0] || new Pair.Pair(new Scalar.Scalar(null));
            if (item.commentBefore)
              pair.key.commentBefore = pair.key.commentBefore ? `${item.commentBefore}
${pair.key.commentBefore}` : item.commentBefore;
            if (item.comment) {
              const cn = pair.value ?? pair.key;
              cn.comment = cn.comment ? `${item.comment}
${cn.comment}` : item.comment;
            }
            item = pair;
          }
          seq.items[i] = identity.isPair(item) ? item : new Pair.Pair(item);
        }
      } else
        onError("Expected a sequence for this tag");
      return seq;
    }
    function createPairs(schema, iterable, ctx) {
      const { replacer } = ctx;
      const pairs2 = new YAMLSeq.YAMLSeq(schema);
      pairs2.tag = "tag:yaml.org,2002:pairs";
      let i = 0;
      if (iterable && Symbol.iterator in Object(iterable))
        for (let it of iterable) {
          if (typeof replacer === "function")
            it = replacer.call(iterable, String(i++), it);
          let key, value;
          if (Array.isArray(it)) {
            if (it.length === 2) {
              key = it[0];
              value = it[1];
            } else
              throw new TypeError(`Expected [key, value] tuple: ${it}`);
          } else if (it && it instanceof Object) {
            const keys = Object.keys(it);
            if (keys.length === 1) {
              key = keys[0];
              value = it[key];
            } else {
              throw new TypeError(`Expected tuple with one key, not ${keys.length} keys`);
            }
          } else {
            key = it;
          }
          pairs2.items.push(Pair.createPair(key, value, ctx));
        }
      return pairs2;
    }
    var pairs = {
      collection: "seq",
      default: false,
      tag: "tag:yaml.org,2002:pairs",
      resolve: resolvePairs,
      createNode: createPairs
    };
    exports.createPairs = createPairs;
    exports.pairs = pairs;
    exports.resolvePairs = resolvePairs;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/yaml-1.1/omap.js
var require_omap = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/yaml-1.1/omap.js"(exports) {
    "use strict";
    var identity = require_identity();
    var toJS = require_toJS();
    var YAMLMap = require_YAMLMap();
    var YAMLSeq = require_YAMLSeq();
    var pairs = require_pairs();
    var YAMLOMap = class _YAMLOMap extends YAMLSeq.YAMLSeq {
      constructor() {
        super();
        this.add = YAMLMap.YAMLMap.prototype.add.bind(this);
        this.delete = YAMLMap.YAMLMap.prototype.delete.bind(this);
        this.get = YAMLMap.YAMLMap.prototype.get.bind(this);
        this.has = YAMLMap.YAMLMap.prototype.has.bind(this);
        this.set = YAMLMap.YAMLMap.prototype.set.bind(this);
        this.tag = _YAMLOMap.tag;
      }
      /**
       * If `ctx` is given, the return type is actually `Map<unknown, unknown>`,
       * but TypeScript won't allow widening the signature of a child method.
       */
      toJSON(_, ctx) {
        if (!ctx)
          return super.toJSON(_);
        const map = /* @__PURE__ */ new Map();
        if (ctx?.onCreate)
          ctx.onCreate(map);
        for (const pair of this.items) {
          let key, value;
          if (identity.isPair(pair)) {
            key = toJS.toJS(pair.key, "", ctx);
            value = toJS.toJS(pair.value, key, ctx);
          } else {
            key = toJS.toJS(pair, "", ctx);
          }
          if (map.has(key))
            throw new Error("Ordered maps must not include duplicate keys");
          map.set(key, value);
        }
        return map;
      }
      static from(schema, iterable, ctx) {
        const pairs$1 = pairs.createPairs(schema, iterable, ctx);
        const omap2 = new this();
        omap2.items = pairs$1.items;
        return omap2;
      }
    };
    YAMLOMap.tag = "tag:yaml.org,2002:omap";
    var omap = {
      collection: "seq",
      identify: (value) => value instanceof Map,
      nodeClass: YAMLOMap,
      default: false,
      tag: "tag:yaml.org,2002:omap",
      resolve(seq, onError) {
        const pairs$1 = pairs.resolvePairs(seq, onError);
        const seenKeys = [];
        for (const { key } of pairs$1.items) {
          if (identity.isScalar(key)) {
            if (seenKeys.includes(key.value)) {
              onError(`Ordered maps must not include duplicate keys: ${key.value}`);
            } else {
              seenKeys.push(key.value);
            }
          }
        }
        return Object.assign(new YAMLOMap(), pairs$1);
      },
      createNode: (schema, iterable, ctx) => YAMLOMap.from(schema, iterable, ctx)
    };
    exports.YAMLOMap = YAMLOMap;
    exports.omap = omap;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/yaml-1.1/bool.js
var require_bool2 = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/yaml-1.1/bool.js"(exports) {
    "use strict";
    var Scalar = require_Scalar();
    function boolStringify({ value, source }, ctx) {
      const boolObj = value ? trueTag : falseTag;
      if (source && boolObj.test.test(source))
        return source;
      return value ? ctx.options.trueStr : ctx.options.falseStr;
    }
    var trueTag = {
      identify: (value) => value === true,
      default: true,
      tag: "tag:yaml.org,2002:bool",
      test: /^(?:Y|y|[Yy]es|YES|[Tt]rue|TRUE|[Oo]n|ON)$/,
      resolve: () => new Scalar.Scalar(true),
      stringify: boolStringify
    };
    var falseTag = {
      identify: (value) => value === false,
      default: true,
      tag: "tag:yaml.org,2002:bool",
      test: /^(?:N|n|[Nn]o|NO|[Ff]alse|FALSE|[Oo]ff|OFF)$/,
      resolve: () => new Scalar.Scalar(false),
      stringify: boolStringify
    };
    exports.falseTag = falseTag;
    exports.trueTag = trueTag;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/yaml-1.1/float.js
var require_float2 = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/yaml-1.1/float.js"(exports) {
    "use strict";
    var Scalar = require_Scalar();
    var stringifyNumber = require_stringifyNumber();
    var floatNaN = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      test: /^(?:[-+]?\.(?:inf|Inf|INF)|\.nan|\.NaN|\.NAN)$/,
      resolve: (str) => str.slice(-3).toLowerCase() === "nan" ? NaN : str[0] === "-" ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY,
      stringify: stringifyNumber.stringifyNumber
    };
    var floatExp = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      format: "EXP",
      test: /^[-+]?(?:[0-9][0-9_]*)?(?:\.[0-9_]*)?[eE][-+]?[0-9]+$/,
      resolve: (str) => parseFloat(str.replace(/_/g, "")),
      stringify(node) {
        const num = Number(node.value);
        return isFinite(num) ? num.toExponential() : stringifyNumber.stringifyNumber(node);
      }
    };
    var float = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      test: /^[-+]?(?:[0-9][0-9_]*)?\.[0-9_]*$/,
      resolve(str) {
        const node = new Scalar.Scalar(parseFloat(str.replace(/_/g, "")));
        const dot = str.indexOf(".");
        if (dot !== -1) {
          const f = str.substring(dot + 1).replace(/_/g, "");
          if (f[f.length - 1] === "0")
            node.minFractionDigits = f.length;
        }
        return node;
      },
      stringify: stringifyNumber.stringifyNumber
    };
    exports.float = float;
    exports.floatExp = floatExp;
    exports.floatNaN = floatNaN;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/yaml-1.1/int.js
var require_int2 = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/yaml-1.1/int.js"(exports) {
    "use strict";
    var stringifyNumber = require_stringifyNumber();
    var intIdentify = (value) => typeof value === "bigint" || Number.isInteger(value);
    function intResolve(str, offset, radix, { intAsBigInt }) {
      const sign = str[0];
      if (sign === "-" || sign === "+")
        offset += 1;
      str = str.substring(offset).replace(/_/g, "");
      if (intAsBigInt) {
        switch (radix) {
          case 2:
            str = `0b${str}`;
            break;
          case 8:
            str = `0o${str}`;
            break;
          case 16:
            str = `0x${str}`;
            break;
        }
        const n2 = BigInt(str);
        return sign === "-" ? BigInt(-1) * n2 : n2;
      }
      const n = parseInt(str, radix);
      return sign === "-" ? -1 * n : n;
    }
    function intStringify(node, radix, prefix) {
      const { value } = node;
      if (intIdentify(value)) {
        const str = value.toString(radix);
        return value < 0 ? "-" + prefix + str.substr(1) : prefix + str;
      }
      return stringifyNumber.stringifyNumber(node);
    }
    var intBin = {
      identify: intIdentify,
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "BIN",
      test: /^[-+]?0b[0-1_]+$/,
      resolve: (str, _onError, opt) => intResolve(str, 2, 2, opt),
      stringify: (node) => intStringify(node, 2, "0b")
    };
    var intOct = {
      identify: intIdentify,
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "OCT",
      test: /^[-+]?0[0-7_]+$/,
      resolve: (str, _onError, opt) => intResolve(str, 1, 8, opt),
      stringify: (node) => intStringify(node, 8, "0")
    };
    var int = {
      identify: intIdentify,
      default: true,
      tag: "tag:yaml.org,2002:int",
      test: /^[-+]?[0-9][0-9_]*$/,
      resolve: (str, _onError, opt) => intResolve(str, 0, 10, opt),
      stringify: stringifyNumber.stringifyNumber
    };
    var intHex = {
      identify: intIdentify,
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "HEX",
      test: /^[-+]?0x[0-9a-fA-F_]+$/,
      resolve: (str, _onError, opt) => intResolve(str, 2, 16, opt),
      stringify: (node) => intStringify(node, 16, "0x")
    };
    exports.int = int;
    exports.intBin = intBin;
    exports.intHex = intHex;
    exports.intOct = intOct;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/yaml-1.1/set.js
var require_set = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/yaml-1.1/set.js"(exports) {
    "use strict";
    var identity = require_identity();
    var Pair = require_Pair();
    var YAMLMap = require_YAMLMap();
    var YAMLSet = class _YAMLSet extends YAMLMap.YAMLMap {
      constructor(schema) {
        super(schema);
        this.tag = _YAMLSet.tag;
      }
      add(key) {
        let pair;
        if (identity.isPair(key))
          pair = key;
        else if (key && typeof key === "object" && "key" in key && "value" in key && key.value === null)
          pair = new Pair.Pair(key.key, null);
        else
          pair = new Pair.Pair(key, null);
        const prev = YAMLMap.findPair(this.items, pair.key);
        if (!prev)
          this.items.push(pair);
      }
      /**
       * If `keepPair` is `true`, returns the Pair matching `key`.
       * Otherwise, returns the value of that Pair's key.
       */
      get(key, keepPair) {
        const pair = YAMLMap.findPair(this.items, key);
        return !keepPair && identity.isPair(pair) ? identity.isScalar(pair.key) ? pair.key.value : pair.key : pair;
      }
      set(key, value) {
        if (typeof value !== "boolean")
          throw new Error(`Expected boolean value for set(key, value) in a YAML set, not ${typeof value}`);
        const prev = YAMLMap.findPair(this.items, key);
        if (prev && !value) {
          this.items.splice(this.items.indexOf(prev), 1);
        } else if (!prev && value) {
          this.items.push(new Pair.Pair(key));
        }
      }
      toJSON(_, ctx) {
        return super.toJSON(_, ctx, Set);
      }
      toString(ctx, onComment, onChompKeep) {
        if (!ctx)
          return JSON.stringify(this);
        if (this.hasAllNullValues(true))
          return super.toString(Object.assign({}, ctx, { allNullValues: true }), onComment, onChompKeep);
        else
          throw new Error("Set items must all have null values");
      }
      static from(schema, iterable, ctx) {
        const { replacer } = ctx;
        const set2 = new this(schema);
        if (iterable && Symbol.iterator in Object(iterable))
          for (let value of iterable) {
            if (typeof replacer === "function")
              value = replacer.call(iterable, value, value);
            set2.items.push(Pair.createPair(value, null, ctx));
          }
        return set2;
      }
    };
    YAMLSet.tag = "tag:yaml.org,2002:set";
    var set = {
      collection: "map",
      identify: (value) => value instanceof Set,
      nodeClass: YAMLSet,
      default: false,
      tag: "tag:yaml.org,2002:set",
      createNode: (schema, iterable, ctx) => YAMLSet.from(schema, iterable, ctx),
      resolve(map, onError) {
        if (identity.isMap(map)) {
          if (map.hasAllNullValues(true))
            return Object.assign(new YAMLSet(), map);
          else
            onError("Set items must all have null values");
        } else
          onError("Expected a mapping for this tag");
        return map;
      }
    };
    exports.YAMLSet = YAMLSet;
    exports.set = set;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/yaml-1.1/timestamp.js
var require_timestamp = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/yaml-1.1/timestamp.js"(exports) {
    "use strict";
    var stringifyNumber = require_stringifyNumber();
    function parseSexagesimal(str, asBigInt) {
      const sign = str[0];
      const parts = sign === "-" || sign === "+" ? str.substring(1) : str;
      const num = (n) => asBigInt ? BigInt(n) : Number(n);
      const res = parts.replace(/_/g, "").split(":").reduce((res2, p) => res2 * num(60) + num(p), num(0));
      return sign === "-" ? num(-1) * res : res;
    }
    function stringifySexagesimal(node) {
      let { value } = node;
      let num = (n) => n;
      if (typeof value === "bigint")
        num = (n) => BigInt(n);
      else if (isNaN(value) || !isFinite(value))
        return stringifyNumber.stringifyNumber(node);
      let sign = "";
      if (value < 0) {
        sign = "-";
        value *= num(-1);
      }
      const _60 = num(60);
      const parts = [value % _60];
      if (value < 60) {
        parts.unshift(0);
      } else {
        value = (value - parts[0]) / _60;
        parts.unshift(value % _60);
        if (value >= 60) {
          value = (value - parts[0]) / _60;
          parts.unshift(value);
        }
      }
      return sign + parts.map((n) => String(n).padStart(2, "0")).join(":").replace(/000000\d*$/, "");
    }
    var intTime = {
      identify: (value) => typeof value === "bigint" || Number.isInteger(value),
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "TIME",
      test: /^[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+$/,
      resolve: (str, _onError, { intAsBigInt }) => parseSexagesimal(str, intAsBigInt),
      stringify: stringifySexagesimal
    };
    var floatTime = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      format: "TIME",
      test: /^[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+\.[0-9_]*$/,
      resolve: (str) => parseSexagesimal(str, false),
      stringify: stringifySexagesimal
    };
    var timestamp = {
      identify: (value) => value instanceof Date,
      default: true,
      tag: "tag:yaml.org,2002:timestamp",
      // If the time zone is omitted, the timestamp is assumed to be specified in UTC. The time part
      // may be omitted altogether, resulting in a date format. In such a case, the time part is
      // assumed to be 00:00:00Z (start of day, UTC).
      test: RegExp("^([0-9]{4})-([0-9]{1,2})-([0-9]{1,2})(?:(?:t|T|[ \\t]+)([0-9]{1,2}):([0-9]{1,2}):([0-9]{1,2}(\\.[0-9]+)?)(?:[ \\t]*(Z|[-+][012]?[0-9](?::[0-9]{2})?))?)?$"),
      resolve(str) {
        const match = str.match(timestamp.test);
        if (!match)
          throw new Error("!!timestamp expects a date, starting with yyyy-mm-dd");
        const [, year, month, day, hour, minute, second] = match.map(Number);
        const millisec = match[7] ? Number((match[7] + "00").substr(1, 3)) : 0;
        let date = Date.UTC(year, month - 1, day, hour || 0, minute || 0, second || 0, millisec);
        const tz = match[8];
        if (tz && tz !== "Z") {
          let d = parseSexagesimal(tz, false);
          if (Math.abs(d) < 30)
            d *= 60;
          date -= 6e4 * d;
        }
        return new Date(date);
      },
      stringify: ({ value }) => value?.toISOString().replace(/(T00:00:00)?\.000Z$/, "") ?? ""
    };
    exports.floatTime = floatTime;
    exports.intTime = intTime;
    exports.timestamp = timestamp;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/yaml-1.1/schema.js
var require_schema3 = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/yaml-1.1/schema.js"(exports) {
    "use strict";
    var map = require_map();
    var _null = require_null();
    var seq = require_seq();
    var string = require_string();
    var binary = require_binary();
    var bool = require_bool2();
    var float = require_float2();
    var int = require_int2();
    var merge = require_merge();
    var omap = require_omap();
    var pairs = require_pairs();
    var set = require_set();
    var timestamp = require_timestamp();
    var schema = [
      map.map,
      seq.seq,
      string.string,
      _null.nullTag,
      bool.trueTag,
      bool.falseTag,
      int.intBin,
      int.intOct,
      int.int,
      int.intHex,
      float.floatNaN,
      float.floatExp,
      float.float,
      binary.binary,
      merge.merge,
      omap.omap,
      pairs.pairs,
      set.set,
      timestamp.intTime,
      timestamp.floatTime,
      timestamp.timestamp
    ];
    exports.schema = schema;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/tags.js
var require_tags = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/tags.js"(exports) {
    "use strict";
    var map = require_map();
    var _null = require_null();
    var seq = require_seq();
    var string = require_string();
    var bool = require_bool();
    var float = require_float();
    var int = require_int();
    var schema = require_schema();
    var schema$1 = require_schema2();
    var binary = require_binary();
    var merge = require_merge();
    var omap = require_omap();
    var pairs = require_pairs();
    var schema$2 = require_schema3();
    var set = require_set();
    var timestamp = require_timestamp();
    var schemas = /* @__PURE__ */ new Map([
      ["core", schema.schema],
      ["failsafe", [map.map, seq.seq, string.string]],
      ["json", schema$1.schema],
      ["yaml11", schema$2.schema],
      ["yaml-1.1", schema$2.schema]
    ]);
    var tagsByName = {
      binary: binary.binary,
      bool: bool.boolTag,
      float: float.float,
      floatExp: float.floatExp,
      floatNaN: float.floatNaN,
      floatTime: timestamp.floatTime,
      int: int.int,
      intHex: int.intHex,
      intOct: int.intOct,
      intTime: timestamp.intTime,
      map: map.map,
      merge: merge.merge,
      null: _null.nullTag,
      omap: omap.omap,
      pairs: pairs.pairs,
      seq: seq.seq,
      set: set.set,
      timestamp: timestamp.timestamp
    };
    var coreKnownTags = {
      "tag:yaml.org,2002:binary": binary.binary,
      "tag:yaml.org,2002:merge": merge.merge,
      "tag:yaml.org,2002:omap": omap.omap,
      "tag:yaml.org,2002:pairs": pairs.pairs,
      "tag:yaml.org,2002:set": set.set,
      "tag:yaml.org,2002:timestamp": timestamp.timestamp
    };
    function getTags(customTags, schemaName, addMergeTag) {
      const schemaTags = schemas.get(schemaName);
      if (schemaTags && !customTags) {
        return addMergeTag && !schemaTags.includes(merge.merge) ? schemaTags.concat(merge.merge) : schemaTags.slice();
      }
      let tags2 = schemaTags;
      if (!tags2) {
        if (Array.isArray(customTags))
          tags2 = [];
        else {
          const keys = Array.from(schemas.keys()).filter((key) => key !== "yaml11").map((key) => JSON.stringify(key)).join(", ");
          throw new Error(`Unknown schema "${schemaName}"; use one of ${keys} or define customTags array`);
        }
      }
      if (Array.isArray(customTags)) {
        for (const tag of customTags)
          tags2 = tags2.concat(tag);
      } else if (typeof customTags === "function") {
        tags2 = customTags(tags2.slice());
      }
      if (addMergeTag)
        tags2 = tags2.concat(merge.merge);
      return tags2.reduce((tags3, tag) => {
        const tagObj = typeof tag === "string" ? tagsByName[tag] : tag;
        if (!tagObj) {
          const tagName = JSON.stringify(tag);
          const keys = Object.keys(tagsByName).map((key) => JSON.stringify(key)).join(", ");
          throw new Error(`Unknown custom tag ${tagName}; use one of ${keys}`);
        }
        if (!tags3.includes(tagObj))
          tags3.push(tagObj);
        return tags3;
      }, []);
    }
    exports.coreKnownTags = coreKnownTags;
    exports.getTags = getTags;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/Schema.js
var require_Schema = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/schema/Schema.js"(exports) {
    "use strict";
    var identity = require_identity();
    var map = require_map();
    var seq = require_seq();
    var string = require_string();
    var tags2 = require_tags();
    var sortMapEntriesByKey = (a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
    var Schema = class _Schema {
      constructor({ compat, customTags, merge, resolveKnownTags, schema, sortMapEntries, toStringDefaults }) {
        this.compat = Array.isArray(compat) ? tags2.getTags(compat, "compat") : compat ? tags2.getTags(null, compat) : null;
        this.name = typeof schema === "string" && schema || "core";
        this.knownTags = resolveKnownTags ? tags2.coreKnownTags : {};
        this.tags = tags2.getTags(customTags, this.name, merge);
        this.toStringOptions = toStringDefaults ?? null;
        Object.defineProperty(this, identity.MAP, { value: map.map });
        Object.defineProperty(this, identity.SCALAR, { value: string.string });
        Object.defineProperty(this, identity.SEQ, { value: seq.seq });
        this.sortMapEntries = typeof sortMapEntries === "function" ? sortMapEntries : sortMapEntries === true ? sortMapEntriesByKey : null;
      }
      clone() {
        const copy = Object.create(_Schema.prototype, Object.getOwnPropertyDescriptors(this));
        copy.tags = this.tags.slice();
        return copy;
      }
    };
    exports.Schema = Schema;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/stringify/stringifyDocument.js
var require_stringifyDocument = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/stringify/stringifyDocument.js"(exports) {
    "use strict";
    var identity = require_identity();
    var stringify5 = require_stringify();
    var stringifyComment = require_stringifyComment();
    function stringifyDocument(doc, options) {
      const lines = [];
      let hasDirectives = options.directives === true;
      if (options.directives !== false && doc.directives) {
        const dir = doc.directives.toString(doc);
        if (dir) {
          lines.push(dir);
          hasDirectives = true;
        } else if (doc.directives.docStart)
          hasDirectives = true;
      }
      if (hasDirectives)
        lines.push("---");
      const ctx = stringify5.createStringifyContext(doc, options);
      const { commentString } = ctx.options;
      if (doc.commentBefore) {
        if (lines.length !== 1)
          lines.unshift("");
        const cs = commentString(doc.commentBefore);
        lines.unshift(stringifyComment.indentComment(cs, ""));
      }
      let chompKeep = false;
      let contentComment = null;
      if (doc.contents) {
        if (identity.isNode(doc.contents)) {
          if (doc.contents.spaceBefore && hasDirectives)
            lines.push("");
          if (doc.contents.commentBefore) {
            const cs = commentString(doc.contents.commentBefore);
            lines.push(stringifyComment.indentComment(cs, ""));
          }
          ctx.forceBlockIndent = !!doc.comment;
          contentComment = doc.contents.comment;
        }
        const onChompKeep = contentComment ? void 0 : () => chompKeep = true;
        let body = stringify5.stringify(doc.contents, ctx, () => contentComment = null, onChompKeep);
        if (contentComment)
          body += stringifyComment.lineComment(body, "", commentString(contentComment));
        if ((body[0] === "|" || body[0] === ">") && lines[lines.length - 1] === "---") {
          lines[lines.length - 1] = `--- ${body}`;
        } else
          lines.push(body);
      } else {
        lines.push(stringify5.stringify(doc.contents, ctx));
      }
      if (doc.directives?.docEnd) {
        if (doc.comment) {
          const cs = commentString(doc.comment);
          if (cs.includes("\n")) {
            lines.push("...");
            lines.push(stringifyComment.indentComment(cs, ""));
          } else {
            lines.push(`... ${cs}`);
          }
        } else {
          lines.push("...");
        }
      } else {
        let dc = doc.comment;
        if (dc && chompKeep)
          dc = dc.replace(/^\n+/, "");
        if (dc) {
          if ((!chompKeep || contentComment) && lines[lines.length - 1] !== "")
            lines.push("");
          lines.push(stringifyComment.indentComment(commentString(dc), ""));
        }
      }
      return lines.join("\n") + "\n";
    }
    exports.stringifyDocument = stringifyDocument;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/doc/Document.js
var require_Document = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/doc/Document.js"(exports) {
    "use strict";
    var Alias = require_Alias();
    var Collection = require_Collection();
    var identity = require_identity();
    var Pair = require_Pair();
    var toJS = require_toJS();
    var Schema = require_Schema();
    var stringifyDocument = require_stringifyDocument();
    var anchors = require_anchors();
    var applyReviver = require_applyReviver();
    var createNode = require_createNode();
    var directives = require_directives();
    var Document = class _Document {
      constructor(value, replacer, options) {
        this.commentBefore = null;
        this.comment = null;
        this.errors = [];
        this.warnings = [];
        Object.defineProperty(this, identity.NODE_TYPE, { value: identity.DOC });
        let _replacer = null;
        if (typeof replacer === "function" || Array.isArray(replacer)) {
          _replacer = replacer;
        } else if (options === void 0 && replacer) {
          options = replacer;
          replacer = void 0;
        }
        const opt = Object.assign({
          intAsBigInt: false,
          keepSourceTokens: false,
          logLevel: "warn",
          prettyErrors: true,
          strict: true,
          stringKeys: false,
          uniqueKeys: true,
          version: "1.2"
        }, options);
        this.options = opt;
        let { version } = opt;
        if (options?._directives) {
          this.directives = options._directives.atDocument();
          if (this.directives.yaml.explicit)
            version = this.directives.yaml.version;
        } else
          this.directives = new directives.Directives({ version });
        this.setSchema(version, options);
        this.contents = value === void 0 ? null : this.createNode(value, _replacer, options);
      }
      /**
       * Create a deep copy of this Document and its contents.
       *
       * Custom Node values that inherit from `Object` still refer to their original instances.
       */
      clone() {
        const copy = Object.create(_Document.prototype, {
          [identity.NODE_TYPE]: { value: identity.DOC }
        });
        copy.commentBefore = this.commentBefore;
        copy.comment = this.comment;
        copy.errors = this.errors.slice();
        copy.warnings = this.warnings.slice();
        copy.options = Object.assign({}, this.options);
        if (this.directives)
          copy.directives = this.directives.clone();
        copy.schema = this.schema.clone();
        copy.contents = identity.isNode(this.contents) ? this.contents.clone(copy.schema) : this.contents;
        if (this.range)
          copy.range = this.range.slice();
        return copy;
      }
      /** Adds a value to the document. */
      add(value) {
        if (assertCollection(this.contents))
          this.contents.add(value);
      }
      /** Adds a value to the document. */
      addIn(path, value) {
        if (assertCollection(this.contents))
          this.contents.addIn(path, value);
      }
      /**
       * Create a new `Alias` node, ensuring that the target `node` has the required anchor.
       *
       * If `node` already has an anchor, `name` is ignored.
       * Otherwise, the `node.anchor` value will be set to `name`,
       * or if an anchor with that name is already present in the document,
       * `name` will be used as a prefix for a new unique anchor.
       * If `name` is undefined, the generated anchor will use 'a' as a prefix.
       */
      createAlias(node, name) {
        if (!node.anchor) {
          const prev = anchors.anchorNames(this);
          node.anchor = // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
          !name || prev.has(name) ? anchors.findNewAnchor(name || "a", prev) : name;
        }
        return new Alias.Alias(node.anchor);
      }
      createNode(value, replacer, options) {
        let _replacer = void 0;
        if (typeof replacer === "function") {
          value = replacer.call({ "": value }, "", value);
          _replacer = replacer;
        } else if (Array.isArray(replacer)) {
          const keyToStr = (v) => typeof v === "number" || v instanceof String || v instanceof Number;
          const asStr = replacer.filter(keyToStr).map(String);
          if (asStr.length > 0)
            replacer = replacer.concat(asStr);
          _replacer = replacer;
        } else if (options === void 0 && replacer) {
          options = replacer;
          replacer = void 0;
        }
        const { aliasDuplicateObjects, anchorPrefix, flow, keepUndefined, onTagObj, tag } = options ?? {};
        const { onAnchor, setAnchors, sourceObjects } = anchors.createNodeAnchors(
          this,
          // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
          anchorPrefix || "a"
        );
        const ctx = {
          aliasDuplicateObjects: aliasDuplicateObjects ?? true,
          keepUndefined: keepUndefined ?? false,
          onAnchor,
          onTagObj,
          replacer: _replacer,
          schema: this.schema,
          sourceObjects
        };
        const node = createNode.createNode(value, tag, ctx);
        if (flow && identity.isCollection(node))
          node.flow = true;
        setAnchors();
        return node;
      }
      /**
       * Convert a key and a value into a `Pair` using the current schema,
       * recursively wrapping all values as `Scalar` or `Collection` nodes.
       */
      createPair(key, value, options = {}) {
        const k = this.createNode(key, null, options);
        const v = this.createNode(value, null, options);
        return new Pair.Pair(k, v);
      }
      /**
       * Removes a value from the document.
       * @returns `true` if the item was found and removed.
       */
      delete(key) {
        return assertCollection(this.contents) ? this.contents.delete(key) : false;
      }
      /**
       * Removes a value from the document.
       * @returns `true` if the item was found and removed.
       */
      deleteIn(path) {
        if (Collection.isEmptyPath(path)) {
          if (this.contents == null)
            return false;
          this.contents = null;
          return true;
        }
        return assertCollection(this.contents) ? this.contents.deleteIn(path) : false;
      }
      /**
       * Returns item at `key`, or `undefined` if not found. By default unwraps
       * scalar values from their surrounding node; to disable set `keepScalar` to
       * `true` (collections are always returned intact).
       */
      get(key, keepScalar) {
        return identity.isCollection(this.contents) ? this.contents.get(key, keepScalar) : void 0;
      }
      /**
       * Returns item at `path`, or `undefined` if not found. By default unwraps
       * scalar values from their surrounding node; to disable set `keepScalar` to
       * `true` (collections are always returned intact).
       */
      getIn(path, keepScalar) {
        if (Collection.isEmptyPath(path))
          return !keepScalar && identity.isScalar(this.contents) ? this.contents.value : this.contents;
        return identity.isCollection(this.contents) ? this.contents.getIn(path, keepScalar) : void 0;
      }
      /**
       * Checks if the document includes a value with the key `key`.
       */
      has(key) {
        return identity.isCollection(this.contents) ? this.contents.has(key) : false;
      }
      /**
       * Checks if the document includes a value at `path`.
       */
      hasIn(path) {
        if (Collection.isEmptyPath(path))
          return this.contents !== void 0;
        return identity.isCollection(this.contents) ? this.contents.hasIn(path) : false;
      }
      /**
       * Sets a value in this document. For `!!set`, `value` needs to be a
       * boolean to add/remove the item from the set.
       */
      set(key, value) {
        if (this.contents == null) {
          this.contents = Collection.collectionFromPath(this.schema, [key], value);
        } else if (assertCollection(this.contents)) {
          this.contents.set(key, value);
        }
      }
      /**
       * Sets a value in this document. For `!!set`, `value` needs to be a
       * boolean to add/remove the item from the set.
       */
      setIn(path, value) {
        if (Collection.isEmptyPath(path)) {
          this.contents = value;
        } else if (this.contents == null) {
          this.contents = Collection.collectionFromPath(this.schema, Array.from(path), value);
        } else if (assertCollection(this.contents)) {
          this.contents.setIn(path, value);
        }
      }
      /**
       * Change the YAML version and schema used by the document.
       * A `null` version disables support for directives, explicit tags, anchors, and aliases.
       * It also requires the `schema` option to be given as a `Schema` instance value.
       *
       * Overrides all previously set schema options.
       */
      setSchema(version, options = {}) {
        if (typeof version === "number")
          version = String(version);
        let opt;
        switch (version) {
          case "1.1":
            if (this.directives)
              this.directives.yaml.version = "1.1";
            else
              this.directives = new directives.Directives({ version: "1.1" });
            opt = { resolveKnownTags: false, schema: "yaml-1.1" };
            break;
          case "1.2":
          case "next":
            if (this.directives)
              this.directives.yaml.version = version;
            else
              this.directives = new directives.Directives({ version });
            opt = { resolveKnownTags: true, schema: "core" };
            break;
          case null:
            if (this.directives)
              delete this.directives;
            opt = null;
            break;
          default: {
            const sv = JSON.stringify(version);
            throw new Error(`Expected '1.1', '1.2' or null as first argument, but found: ${sv}`);
          }
        }
        if (options.schema instanceof Object)
          this.schema = options.schema;
        else if (opt)
          this.schema = new Schema.Schema(Object.assign(opt, options));
        else
          throw new Error(`With a null YAML version, the { schema: Schema } option is required`);
      }
      // json & jsonArg are only used from toJSON()
      toJS({ json: json2, jsonArg, mapAsMap, maxAliasCount, onAnchor, reviver } = {}) {
        const ctx = {
          anchors: /* @__PURE__ */ new Map(),
          doc: this,
          keep: !json2,
          mapAsMap: mapAsMap === true,
          mapKeyWarned: false,
          maxAliasCount: typeof maxAliasCount === "number" ? maxAliasCount : 100
        };
        const res = toJS.toJS(this.contents, jsonArg ?? "", ctx);
        if (typeof onAnchor === "function")
          for (const { count, res: res2 } of ctx.anchors.values())
            onAnchor(res2, count);
        return typeof reviver === "function" ? applyReviver.applyReviver(reviver, { "": res }, "", res) : res;
      }
      /**
       * A JSON representation of the document `contents`.
       *
       * @param jsonArg Used by `JSON.stringify` to indicate the array index or
       *   property name.
       */
      toJSON(jsonArg, onAnchor) {
        return this.toJS({ json: true, jsonArg, mapAsMap: false, onAnchor });
      }
      /** A YAML representation of the document. */
      toString(options = {}) {
        if (this.errors.length > 0)
          throw new Error("Document with errors cannot be stringified");
        if ("indent" in options && (!Number.isInteger(options.indent) || Number(options.indent) <= 0)) {
          const s = JSON.stringify(options.indent);
          throw new Error(`"indent" option must be a positive integer, not ${s}`);
        }
        return stringifyDocument.stringifyDocument(this, options);
      }
    };
    function assertCollection(contents) {
      if (identity.isCollection(contents))
        return true;
      throw new Error("Expected a YAML collection as document contents");
    }
    exports.Document = Document;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/errors.js
var require_errors = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/errors.js"(exports) {
    "use strict";
    var YAMLError = class extends Error {
      constructor(name, pos, code, message) {
        super();
        this.name = name;
        this.code = code;
        this.message = message;
        this.pos = pos;
      }
    };
    var YAMLParseError = class extends YAMLError {
      constructor(pos, code, message) {
        super("YAMLParseError", pos, code, message);
      }
    };
    var YAMLWarning = class extends YAMLError {
      constructor(pos, code, message) {
        super("YAMLWarning", pos, code, message);
      }
    };
    var prettifyError = (src, lc) => (error) => {
      if (error.pos[0] === -1)
        return;
      error.linePos = error.pos.map((pos) => lc.linePos(pos));
      const { line: line3, col } = error.linePos[0];
      error.message += ` at line ${line3}, column ${col}`;
      let ci = col - 1;
      let lineStr = src.substring(lc.lineStarts[line3 - 1], lc.lineStarts[line3]).replace(/[\n\r]+$/, "");
      if (ci >= 60 && lineStr.length > 80) {
        const trimStart = Math.min(ci - 39, lineStr.length - 79);
        lineStr = "\u2026" + lineStr.substring(trimStart);
        ci -= trimStart - 1;
      }
      if (lineStr.length > 80)
        lineStr = lineStr.substring(0, 79) + "\u2026";
      if (line3 > 1 && /^ *$/.test(lineStr.substring(0, ci))) {
        let prev = src.substring(lc.lineStarts[line3 - 2], lc.lineStarts[line3 - 1]);
        if (prev.length > 80)
          prev = prev.substring(0, 79) + "\u2026\n";
        lineStr = prev + lineStr;
      }
      if (/[^ ]/.test(lineStr)) {
        let count = 1;
        const end = error.linePos[1];
        if (end?.line === line3 && end.col > col) {
          count = Math.max(1, Math.min(end.col - col, 80 - ci));
        }
        const pointer = " ".repeat(ci) + "^".repeat(count);
        error.message += `:

${lineStr}
${pointer}
`;
      }
    };
    exports.YAMLError = YAMLError;
    exports.YAMLParseError = YAMLParseError;
    exports.YAMLWarning = YAMLWarning;
    exports.prettifyError = prettifyError;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/compose/resolve-props.js
var require_resolve_props = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/compose/resolve-props.js"(exports) {
    "use strict";
    function resolveProps(tokens, { flow, indicator, next, offset, onError, parentIndent, startOnNewline }) {
      let spaceBefore = false;
      let atNewline = startOnNewline;
      let hasSpace = startOnNewline;
      let comment = "";
      let commentSep = "";
      let hasNewline = false;
      let reqSpace = false;
      let tab = null;
      let anchor = null;
      let tag = null;
      let newlineAfterProp = null;
      let comma = null;
      let found = null;
      let start = null;
      for (const token of tokens) {
        if (reqSpace) {
          if (token.type !== "space" && token.type !== "newline" && token.type !== "comma")
            onError(token.offset, "MISSING_CHAR", "Tags and anchors must be separated from the next token by white space");
          reqSpace = false;
        }
        if (tab) {
          if (atNewline && token.type !== "comment" && token.type !== "newline") {
            onError(tab, "TAB_AS_INDENT", "Tabs are not allowed as indentation");
          }
          tab = null;
        }
        switch (token.type) {
          case "space":
            if (!flow && (indicator !== "doc-start" || next?.type !== "flow-collection") && token.source.includes("	")) {
              tab = token;
            }
            hasSpace = true;
            break;
          case "comment": {
            if (!hasSpace)
              onError(token, "MISSING_CHAR", "Comments must be separated from other tokens by white space characters");
            const cb = token.source.substring(1) || " ";
            if (!comment)
              comment = cb;
            else
              comment += commentSep + cb;
            commentSep = "";
            atNewline = false;
            break;
          }
          case "newline":
            if (atNewline) {
              if (comment)
                comment += token.source;
              else if (!found || indicator !== "seq-item-ind")
                spaceBefore = true;
            } else
              commentSep += token.source;
            atNewline = true;
            hasNewline = true;
            if (anchor || tag)
              newlineAfterProp = token;
            hasSpace = true;
            break;
          case "anchor":
            if (anchor)
              onError(token, "MULTIPLE_ANCHORS", "A node can have at most one anchor");
            if (token.source.endsWith(":"))
              onError(token.offset + token.source.length - 1, "BAD_ALIAS", "Anchor ending in : is ambiguous", true);
            anchor = token;
            start ?? (start = token.offset);
            atNewline = false;
            hasSpace = false;
            reqSpace = true;
            break;
          case "tag": {
            if (tag)
              onError(token, "MULTIPLE_TAGS", "A node can have at most one tag");
            tag = token;
            start ?? (start = token.offset);
            atNewline = false;
            hasSpace = false;
            reqSpace = true;
            break;
          }
          case indicator:
            if (anchor || tag)
              onError(token, "BAD_PROP_ORDER", `Anchors and tags must be after the ${token.source} indicator`);
            if (found)
              onError(token, "UNEXPECTED_TOKEN", `Unexpected ${token.source} in ${flow ?? "collection"}`);
            found = token;
            atNewline = indicator === "seq-item-ind" || indicator === "explicit-key-ind";
            hasSpace = false;
            break;
          case "comma":
            if (flow) {
              if (comma)
                onError(token, "UNEXPECTED_TOKEN", `Unexpected , in ${flow}`);
              comma = token;
              atNewline = false;
              hasSpace = false;
              break;
            }
          // else fallthrough
          default:
            onError(token, "UNEXPECTED_TOKEN", `Unexpected ${token.type} token`);
            atNewline = false;
            hasSpace = false;
        }
      }
      const last = tokens[tokens.length - 1];
      const end = last ? last.offset + last.source.length : offset;
      if (reqSpace && next && next.type !== "space" && next.type !== "newline" && next.type !== "comma" && (next.type !== "scalar" || next.source !== "")) {
        onError(next.offset, "MISSING_CHAR", "Tags and anchors must be separated from the next token by white space");
      }
      if (tab && (atNewline && tab.indent <= parentIndent || next?.type === "block-map" || next?.type === "block-seq"))
        onError(tab, "TAB_AS_INDENT", "Tabs are not allowed as indentation");
      return {
        comma,
        found,
        spaceBefore,
        comment,
        hasNewline,
        anchor,
        tag,
        newlineAfterProp,
        end,
        start: start ?? end
      };
    }
    exports.resolveProps = resolveProps;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/compose/util-contains-newline.js
var require_util_contains_newline = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/compose/util-contains-newline.js"(exports) {
    "use strict";
    function containsNewline(key) {
      if (!key)
        return null;
      switch (key.type) {
        case "alias":
        case "scalar":
        case "double-quoted-scalar":
        case "single-quoted-scalar":
          if (key.source.includes("\n"))
            return true;
          if (key.end) {
            for (const st of key.end)
              if (st.type === "newline")
                return true;
          }
          return false;
        case "flow-collection":
          for (const it of key.items) {
            for (const st of it.start)
              if (st.type === "newline")
                return true;
            if (it.sep) {
              for (const st of it.sep)
                if (st.type === "newline")
                  return true;
            }
            if (containsNewline(it.key) || containsNewline(it.value))
              return true;
          }
          return false;
        default:
          return true;
      }
    }
    exports.containsNewline = containsNewline;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/compose/util-flow-indent-check.js
var require_util_flow_indent_check = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/compose/util-flow-indent-check.js"(exports) {
    "use strict";
    var utilContainsNewline = require_util_contains_newline();
    function flowIndentCheck(indent, fc, onError) {
      if (fc?.type === "flow-collection") {
        const end = fc.end[0];
        if (end.indent === indent && (end.source === "]" || end.source === "}") && utilContainsNewline.containsNewline(fc)) {
          const msg = "Flow end indicator should be more indented than parent";
          onError(end, "BAD_INDENT", msg, true);
        }
      }
    }
    exports.flowIndentCheck = flowIndentCheck;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/compose/util-map-includes.js
var require_util_map_includes = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/compose/util-map-includes.js"(exports) {
    "use strict";
    var identity = require_identity();
    function mapIncludes(ctx, items, search) {
      const { uniqueKeys } = ctx.options;
      if (uniqueKeys === false)
        return false;
      const isEqual = typeof uniqueKeys === "function" ? uniqueKeys : (a, b) => a === b || identity.isScalar(a) && identity.isScalar(b) && a.value === b.value;
      return items.some((pair) => isEqual(pair.key, search));
    }
    exports.mapIncludes = mapIncludes;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/compose/resolve-block-map.js
var require_resolve_block_map = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/compose/resolve-block-map.js"(exports) {
    "use strict";
    var Pair = require_Pair();
    var YAMLMap = require_YAMLMap();
    var resolveProps = require_resolve_props();
    var utilContainsNewline = require_util_contains_newline();
    var utilFlowIndentCheck = require_util_flow_indent_check();
    var utilMapIncludes = require_util_map_includes();
    var startColMsg = "All mapping items must start at the same column";
    function resolveBlockMap({ composeNode, composeEmptyNode }, ctx, bm, onError, tag) {
      const NodeClass = tag?.nodeClass ?? YAMLMap.YAMLMap;
      const map = new NodeClass(ctx.schema);
      if (ctx.atRoot)
        ctx.atRoot = false;
      let offset = bm.offset;
      let commentEnd = null;
      for (const collItem of bm.items) {
        const { start, key, sep: sep2, value } = collItem;
        const keyProps = resolveProps.resolveProps(start, {
          indicator: "explicit-key-ind",
          next: key ?? sep2?.[0],
          offset,
          onError,
          parentIndent: bm.indent,
          startOnNewline: true
        });
        const implicitKey = !keyProps.found;
        if (implicitKey) {
          if (key) {
            if (key.type === "block-seq")
              onError(offset, "BLOCK_AS_IMPLICIT_KEY", "A block sequence may not be used as an implicit map key");
            else if ("indent" in key && key.indent !== bm.indent)
              onError(offset, "BAD_INDENT", startColMsg);
          }
          if (!keyProps.anchor && !keyProps.tag && !sep2) {
            commentEnd = keyProps.end;
            if (keyProps.comment) {
              if (map.comment)
                map.comment += "\n" + keyProps.comment;
              else
                map.comment = keyProps.comment;
            }
            continue;
          }
          if (keyProps.newlineAfterProp || utilContainsNewline.containsNewline(key)) {
            onError(key ?? start[start.length - 1], "MULTILINE_IMPLICIT_KEY", "Implicit keys need to be on a single line");
          }
        } else if (keyProps.found?.indent !== bm.indent) {
          onError(offset, "BAD_INDENT", startColMsg);
        }
        ctx.atKey = true;
        const keyStart = keyProps.end;
        const keyNode = key ? composeNode(ctx, key, keyProps, onError) : composeEmptyNode(ctx, keyStart, start, null, keyProps, onError);
        if (ctx.schema.compat)
          utilFlowIndentCheck.flowIndentCheck(bm.indent, key, onError);
        ctx.atKey = false;
        if (utilMapIncludes.mapIncludes(ctx, map.items, keyNode))
          onError(keyStart, "DUPLICATE_KEY", "Map keys must be unique");
        const valueProps = resolveProps.resolveProps(sep2 ?? [], {
          indicator: "map-value-ind",
          next: value,
          offset: keyNode.range[2],
          onError,
          parentIndent: bm.indent,
          startOnNewline: !key || key.type === "block-scalar"
        });
        offset = valueProps.end;
        if (valueProps.found) {
          if (implicitKey) {
            if (value?.type === "block-map" && !valueProps.hasNewline)
              onError(offset, "BLOCK_AS_IMPLICIT_KEY", "Nested mappings are not allowed in compact mappings");
            if (ctx.options.strict && keyProps.start < valueProps.found.offset - 1024)
              onError(keyNode.range, "KEY_OVER_1024_CHARS", "The : indicator must be at most 1024 chars after the start of an implicit block mapping key");
          }
          const valueNode = value ? composeNode(ctx, value, valueProps, onError) : composeEmptyNode(ctx, offset, sep2, null, valueProps, onError);
          if (ctx.schema.compat)
            utilFlowIndentCheck.flowIndentCheck(bm.indent, value, onError);
          offset = valueNode.range[2];
          const pair = new Pair.Pair(keyNode, valueNode);
          if (ctx.options.keepSourceTokens)
            pair.srcToken = collItem;
          map.items.push(pair);
        } else {
          if (implicitKey)
            onError(keyNode.range, "MISSING_CHAR", "Implicit map keys need to be followed by map values");
          if (valueProps.comment) {
            if (keyNode.comment)
              keyNode.comment += "\n" + valueProps.comment;
            else
              keyNode.comment = valueProps.comment;
          }
          const pair = new Pair.Pair(keyNode);
          if (ctx.options.keepSourceTokens)
            pair.srcToken = collItem;
          map.items.push(pair);
        }
      }
      if (commentEnd && commentEnd < offset)
        onError(commentEnd, "IMPOSSIBLE", "Map comment with trailing content");
      map.range = [bm.offset, offset, commentEnd ?? offset];
      return map;
    }
    exports.resolveBlockMap = resolveBlockMap;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/compose/resolve-block-seq.js
var require_resolve_block_seq = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/compose/resolve-block-seq.js"(exports) {
    "use strict";
    var YAMLSeq = require_YAMLSeq();
    var resolveProps = require_resolve_props();
    var utilFlowIndentCheck = require_util_flow_indent_check();
    function resolveBlockSeq({ composeNode, composeEmptyNode }, ctx, bs, onError, tag) {
      const NodeClass = tag?.nodeClass ?? YAMLSeq.YAMLSeq;
      const seq = new NodeClass(ctx.schema);
      if (ctx.atRoot)
        ctx.atRoot = false;
      if (ctx.atKey)
        ctx.atKey = false;
      let offset = bs.offset;
      let commentEnd = null;
      for (const { start, value } of bs.items) {
        const props = resolveProps.resolveProps(start, {
          indicator: "seq-item-ind",
          next: value,
          offset,
          onError,
          parentIndent: bs.indent,
          startOnNewline: true
        });
        if (!props.found) {
          if (props.anchor || props.tag || value) {
            if (value?.type === "block-seq")
              onError(props.end, "BAD_INDENT", "All sequence items must start at the same column");
            else
              onError(offset, "MISSING_CHAR", "Sequence item without - indicator");
          } else {
            commentEnd = props.end;
            if (props.comment)
              seq.comment = props.comment;
            continue;
          }
        }
        const node = value ? composeNode(ctx, value, props, onError) : composeEmptyNode(ctx, props.end, start, null, props, onError);
        if (ctx.schema.compat)
          utilFlowIndentCheck.flowIndentCheck(bs.indent, value, onError);
        offset = node.range[2];
        seq.items.push(node);
      }
      seq.range = [bs.offset, offset, commentEnd ?? offset];
      return seq;
    }
    exports.resolveBlockSeq = resolveBlockSeq;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/compose/resolve-end.js
var require_resolve_end = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/compose/resolve-end.js"(exports) {
    "use strict";
    function resolveEnd(end, offset, reqSpace, onError) {
      let comment = "";
      if (end) {
        let hasSpace = false;
        let sep2 = "";
        for (const token of end) {
          const { source, type } = token;
          switch (type) {
            case "space":
              hasSpace = true;
              break;
            case "comment": {
              if (reqSpace && !hasSpace)
                onError(token, "MISSING_CHAR", "Comments must be separated from other tokens by white space characters");
              const cb = source.substring(1) || " ";
              if (!comment)
                comment = cb;
              else
                comment += sep2 + cb;
              sep2 = "";
              break;
            }
            case "newline":
              if (comment)
                sep2 += source;
              hasSpace = true;
              break;
            default:
              onError(token, "UNEXPECTED_TOKEN", `Unexpected ${type} at node end`);
          }
          offset += source.length;
        }
      }
      return { comment, offset };
    }
    exports.resolveEnd = resolveEnd;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/compose/resolve-flow-collection.js
var require_resolve_flow_collection = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/compose/resolve-flow-collection.js"(exports) {
    "use strict";
    var identity = require_identity();
    var Pair = require_Pair();
    var YAMLMap = require_YAMLMap();
    var YAMLSeq = require_YAMLSeq();
    var resolveEnd = require_resolve_end();
    var resolveProps = require_resolve_props();
    var utilContainsNewline = require_util_contains_newline();
    var utilMapIncludes = require_util_map_includes();
    var blockMsg = "Block collections are not allowed within flow collections";
    var isBlock = (token) => token && (token.type === "block-map" || token.type === "block-seq");
    function resolveFlowCollection({ composeNode, composeEmptyNode }, ctx, fc, onError, tag) {
      const isMap = fc.start.source === "{";
      const fcName = isMap ? "flow map" : "flow sequence";
      const NodeClass = tag?.nodeClass ?? (isMap ? YAMLMap.YAMLMap : YAMLSeq.YAMLSeq);
      const coll = new NodeClass(ctx.schema);
      coll.flow = true;
      const atRoot = ctx.atRoot;
      if (atRoot)
        ctx.atRoot = false;
      if (ctx.atKey)
        ctx.atKey = false;
      let offset = fc.offset + fc.start.source.length;
      for (let i = 0; i < fc.items.length; ++i) {
        const collItem = fc.items[i];
        const { start, key, sep: sep2, value } = collItem;
        const props = resolveProps.resolveProps(start, {
          flow: fcName,
          indicator: "explicit-key-ind",
          next: key ?? sep2?.[0],
          offset,
          onError,
          parentIndent: fc.indent,
          startOnNewline: false
        });
        if (!props.found) {
          if (!props.anchor && !props.tag && !sep2 && !value) {
            if (i === 0 && props.comma)
              onError(props.comma, "UNEXPECTED_TOKEN", `Unexpected , in ${fcName}`);
            else if (i < fc.items.length - 1)
              onError(props.start, "UNEXPECTED_TOKEN", `Unexpected empty item in ${fcName}`);
            if (props.comment) {
              if (coll.comment)
                coll.comment += "\n" + props.comment;
              else
                coll.comment = props.comment;
            }
            offset = props.end;
            continue;
          }
          if (!isMap && ctx.options.strict && utilContainsNewline.containsNewline(key))
            onError(
              key,
              // checked by containsNewline()
              "MULTILINE_IMPLICIT_KEY",
              "Implicit keys of flow sequence pairs need to be on a single line"
            );
        }
        if (i === 0) {
          if (props.comma)
            onError(props.comma, "UNEXPECTED_TOKEN", `Unexpected , in ${fcName}`);
        } else {
          if (!props.comma)
            onError(props.start, "MISSING_CHAR", `Missing , between ${fcName} items`);
          if (props.comment) {
            let prevItemComment = "";
            loop: for (const st of start) {
              switch (st.type) {
                case "comma":
                case "space":
                  break;
                case "comment":
                  prevItemComment = st.source.substring(1);
                  break loop;
                default:
                  break loop;
              }
            }
            if (prevItemComment) {
              let prev = coll.items[coll.items.length - 1];
              if (identity.isPair(prev))
                prev = prev.value ?? prev.key;
              if (prev.comment)
                prev.comment += "\n" + prevItemComment;
              else
                prev.comment = prevItemComment;
              props.comment = props.comment.substring(prevItemComment.length + 1);
            }
          }
        }
        if (!isMap && !sep2 && !props.found) {
          const valueNode = value ? composeNode(ctx, value, props, onError) : composeEmptyNode(ctx, props.end, sep2, null, props, onError);
          coll.items.push(valueNode);
          offset = valueNode.range[2];
          if (isBlock(value))
            onError(valueNode.range, "BLOCK_IN_FLOW", blockMsg);
        } else {
          ctx.atKey = true;
          const keyStart = props.end;
          const keyNode = key ? composeNode(ctx, key, props, onError) : composeEmptyNode(ctx, keyStart, start, null, props, onError);
          if (isBlock(key))
            onError(keyNode.range, "BLOCK_IN_FLOW", blockMsg);
          ctx.atKey = false;
          const valueProps = resolveProps.resolveProps(sep2 ?? [], {
            flow: fcName,
            indicator: "map-value-ind",
            next: value,
            offset: keyNode.range[2],
            onError,
            parentIndent: fc.indent,
            startOnNewline: false
          });
          if (valueProps.found) {
            if (!isMap && !props.found && ctx.options.strict) {
              if (sep2)
                for (const st of sep2) {
                  if (st === valueProps.found)
                    break;
                  if (st.type === "newline") {
                    onError(st, "MULTILINE_IMPLICIT_KEY", "Implicit keys of flow sequence pairs need to be on a single line");
                    break;
                  }
                }
              if (props.start < valueProps.found.offset - 1024)
                onError(valueProps.found, "KEY_OVER_1024_CHARS", "The : indicator must be at most 1024 chars after the start of an implicit flow sequence key");
            }
          } else if (value) {
            if ("source" in value && value.source?.[0] === ":")
              onError(value, "MISSING_CHAR", `Missing space after : in ${fcName}`);
            else
              onError(valueProps.start, "MISSING_CHAR", `Missing , or : between ${fcName} items`);
          }
          const valueNode = value ? composeNode(ctx, value, valueProps, onError) : valueProps.found ? composeEmptyNode(ctx, valueProps.end, sep2, null, valueProps, onError) : null;
          if (valueNode) {
            if (isBlock(value))
              onError(valueNode.range, "BLOCK_IN_FLOW", blockMsg);
          } else if (valueProps.comment) {
            if (keyNode.comment)
              keyNode.comment += "\n" + valueProps.comment;
            else
              keyNode.comment = valueProps.comment;
          }
          const pair = new Pair.Pair(keyNode, valueNode);
          if (ctx.options.keepSourceTokens)
            pair.srcToken = collItem;
          if (isMap) {
            const map = coll;
            if (utilMapIncludes.mapIncludes(ctx, map.items, keyNode))
              onError(keyStart, "DUPLICATE_KEY", "Map keys must be unique");
            map.items.push(pair);
          } else {
            const map = new YAMLMap.YAMLMap(ctx.schema);
            map.flow = true;
            map.items.push(pair);
            const endRange = (valueNode ?? keyNode).range;
            map.range = [keyNode.range[0], endRange[1], endRange[2]];
            coll.items.push(map);
          }
          offset = valueNode ? valueNode.range[2] : valueProps.end;
        }
      }
      const expectedEnd = isMap ? "}" : "]";
      const [ce, ...ee] = fc.end;
      let cePos = offset;
      if (ce?.source === expectedEnd)
        cePos = ce.offset + ce.source.length;
      else {
        const name = fcName[0].toUpperCase() + fcName.substring(1);
        const msg = atRoot ? `${name} must end with a ${expectedEnd}` : `${name} in block collection must be sufficiently indented and end with a ${expectedEnd}`;
        onError(offset, atRoot ? "MISSING_CHAR" : "BAD_INDENT", msg);
        if (ce && ce.source.length !== 1)
          ee.unshift(ce);
      }
      if (ee.length > 0) {
        const end = resolveEnd.resolveEnd(ee, cePos, ctx.options.strict, onError);
        if (end.comment) {
          if (coll.comment)
            coll.comment += "\n" + end.comment;
          else
            coll.comment = end.comment;
        }
        coll.range = [fc.offset, cePos, end.offset];
      } else {
        coll.range = [fc.offset, cePos, cePos];
      }
      return coll;
    }
    exports.resolveFlowCollection = resolveFlowCollection;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/compose/compose-collection.js
var require_compose_collection = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/compose/compose-collection.js"(exports) {
    "use strict";
    var identity = require_identity();
    var Scalar = require_Scalar();
    var YAMLMap = require_YAMLMap();
    var YAMLSeq = require_YAMLSeq();
    var resolveBlockMap = require_resolve_block_map();
    var resolveBlockSeq = require_resolve_block_seq();
    var resolveFlowCollection = require_resolve_flow_collection();
    function resolveCollection(CN, ctx, token, onError, tagName, tag) {
      const coll = token.type === "block-map" ? resolveBlockMap.resolveBlockMap(CN, ctx, token, onError, tag) : token.type === "block-seq" ? resolveBlockSeq.resolveBlockSeq(CN, ctx, token, onError, tag) : resolveFlowCollection.resolveFlowCollection(CN, ctx, token, onError, tag);
      const Coll = coll.constructor;
      if (tagName === "!" || tagName === Coll.tagName) {
        coll.tag = Coll.tagName;
        return coll;
      }
      if (tagName)
        coll.tag = tagName;
      return coll;
    }
    function composeCollection(CN, ctx, token, props, onError) {
      const tagToken = props.tag;
      const tagName = !tagToken ? null : ctx.directives.tagName(tagToken.source, (msg) => onError(tagToken, "TAG_RESOLVE_FAILED", msg));
      if (token.type === "block-seq") {
        const { anchor, newlineAfterProp: nl } = props;
        const lastProp = anchor && tagToken ? anchor.offset > tagToken.offset ? anchor : tagToken : anchor ?? tagToken;
        if (lastProp && (!nl || nl.offset < lastProp.offset)) {
          const message = "Missing newline after block sequence props";
          onError(lastProp, "MISSING_CHAR", message);
        }
      }
      const expType = token.type === "block-map" ? "map" : token.type === "block-seq" ? "seq" : token.start.source === "{" ? "map" : "seq";
      if (!tagToken || !tagName || tagName === "!" || tagName === YAMLMap.YAMLMap.tagName && expType === "map" || tagName === YAMLSeq.YAMLSeq.tagName && expType === "seq") {
        return resolveCollection(CN, ctx, token, onError, tagName);
      }
      let tag = ctx.schema.tags.find((t) => t.tag === tagName && t.collection === expType);
      if (!tag) {
        const kt = ctx.schema.knownTags[tagName];
        if (kt?.collection === expType) {
          ctx.schema.tags.push(Object.assign({}, kt, { default: false }));
          tag = kt;
        } else {
          if (kt) {
            onError(tagToken, "BAD_COLLECTION_TYPE", `${kt.tag} used for ${expType} collection, but expects ${kt.collection ?? "scalar"}`, true);
          } else {
            onError(tagToken, "TAG_RESOLVE_FAILED", `Unresolved tag: ${tagName}`, true);
          }
          return resolveCollection(CN, ctx, token, onError, tagName);
        }
      }
      const coll = resolveCollection(CN, ctx, token, onError, tagName, tag);
      const res = tag.resolve?.(coll, (msg) => onError(tagToken, "TAG_RESOLVE_FAILED", msg), ctx.options) ?? coll;
      const node = identity.isNode(res) ? res : new Scalar.Scalar(res);
      node.range = coll.range;
      node.tag = tagName;
      if (tag?.format)
        node.format = tag.format;
      return node;
    }
    exports.composeCollection = composeCollection;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/compose/resolve-block-scalar.js
var require_resolve_block_scalar = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/compose/resolve-block-scalar.js"(exports) {
    "use strict";
    var Scalar = require_Scalar();
    function resolveBlockScalar(ctx, scalar, onError) {
      const start = scalar.offset;
      const header = parseBlockScalarHeader(scalar, ctx.options.strict, onError);
      if (!header)
        return { value: "", type: null, comment: "", range: [start, start, start] };
      const type = header.mode === ">" ? Scalar.Scalar.BLOCK_FOLDED : Scalar.Scalar.BLOCK_LITERAL;
      const lines = scalar.source ? splitLines(scalar.source) : [];
      let chompStart = lines.length;
      for (let i = lines.length - 1; i >= 0; --i) {
        const content = lines[i][1];
        if (content === "" || content === "\r")
          chompStart = i;
        else
          break;
      }
      if (chompStart === 0) {
        const value2 = header.chomp === "+" && lines.length > 0 ? "\n".repeat(Math.max(1, lines.length - 1)) : "";
        let end2 = start + header.length;
        if (scalar.source)
          end2 += scalar.source.length;
        return { value: value2, type, comment: header.comment, range: [start, end2, end2] };
      }
      let trimIndent = scalar.indent + header.indent;
      let offset = scalar.offset + header.length;
      let contentStart = 0;
      for (let i = 0; i < chompStart; ++i) {
        const [indent, content] = lines[i];
        if (content === "" || content === "\r") {
          if (header.indent === 0 && indent.length > trimIndent)
            trimIndent = indent.length;
        } else {
          if (indent.length < trimIndent) {
            const message = "Block scalars with more-indented leading empty lines must use an explicit indentation indicator";
            onError(offset + indent.length, "MISSING_CHAR", message);
          }
          if (header.indent === 0)
            trimIndent = indent.length;
          contentStart = i;
          if (trimIndent === 0 && !ctx.atRoot) {
            const message = "Block scalar values in collections must be indented";
            onError(offset, "BAD_INDENT", message);
          }
          break;
        }
        offset += indent.length + content.length + 1;
      }
      for (let i = lines.length - 1; i >= chompStart; --i) {
        if (lines[i][0].length > trimIndent)
          chompStart = i + 1;
      }
      let value = "";
      let sep2 = "";
      let prevMoreIndented = false;
      for (let i = 0; i < contentStart; ++i)
        value += lines[i][0].slice(trimIndent) + "\n";
      for (let i = contentStart; i < chompStart; ++i) {
        let [indent, content] = lines[i];
        offset += indent.length + content.length + 1;
        const crlf = content[content.length - 1] === "\r";
        if (crlf)
          content = content.slice(0, -1);
        if (content && indent.length < trimIndent) {
          const src = header.indent ? "explicit indentation indicator" : "first line";
          const message = `Block scalar lines must not be less indented than their ${src}`;
          onError(offset - content.length - (crlf ? 2 : 1), "BAD_INDENT", message);
          indent = "";
        }
        if (type === Scalar.Scalar.BLOCK_LITERAL) {
          value += sep2 + indent.slice(trimIndent) + content;
          sep2 = "\n";
        } else if (indent.length > trimIndent || content[0] === "	") {
          if (sep2 === " ")
            sep2 = "\n";
          else if (!prevMoreIndented && sep2 === "\n")
            sep2 = "\n\n";
          value += sep2 + indent.slice(trimIndent) + content;
          sep2 = "\n";
          prevMoreIndented = true;
        } else if (content === "") {
          if (sep2 === "\n")
            value += "\n";
          else
            sep2 = "\n";
        } else {
          value += sep2 + content;
          sep2 = " ";
          prevMoreIndented = false;
        }
      }
      switch (header.chomp) {
        case "-":
          break;
        case "+":
          for (let i = chompStart; i < lines.length; ++i)
            value += "\n" + lines[i][0].slice(trimIndent);
          if (value[value.length - 1] !== "\n")
            value += "\n";
          break;
        default:
          value += "\n";
      }
      const end = start + header.length + scalar.source.length;
      return { value, type, comment: header.comment, range: [start, end, end] };
    }
    function parseBlockScalarHeader({ offset, props }, strict, onError) {
      if (props[0].type !== "block-scalar-header") {
        onError(props[0], "IMPOSSIBLE", "Block scalar header not found");
        return null;
      }
      const { source } = props[0];
      const mode = source[0];
      let indent = 0;
      let chomp = "";
      let error = -1;
      for (let i = 1; i < source.length; ++i) {
        const ch = source[i];
        if (!chomp && (ch === "-" || ch === "+"))
          chomp = ch;
        else {
          const n = Number(ch);
          if (!indent && n)
            indent = n;
          else if (error === -1)
            error = offset + i;
        }
      }
      if (error !== -1)
        onError(error, "UNEXPECTED_TOKEN", `Block scalar header includes extra characters: ${source}`);
      let hasSpace = false;
      let comment = "";
      let length = source.length;
      for (let i = 1; i < props.length; ++i) {
        const token = props[i];
        switch (token.type) {
          case "space":
            hasSpace = true;
          // fallthrough
          case "newline":
            length += token.source.length;
            break;
          case "comment":
            if (strict && !hasSpace) {
              const message = "Comments must be separated from other tokens by white space characters";
              onError(token, "MISSING_CHAR", message);
            }
            length += token.source.length;
            comment = token.source.substring(1);
            break;
          case "error":
            onError(token, "UNEXPECTED_TOKEN", token.message);
            length += token.source.length;
            break;
          /* istanbul ignore next should not happen */
          default: {
            const message = `Unexpected token in block scalar header: ${token.type}`;
            onError(token, "UNEXPECTED_TOKEN", message);
            const ts = token.source;
            if (ts && typeof ts === "string")
              length += ts.length;
          }
        }
      }
      return { mode, indent, chomp, comment, length };
    }
    function splitLines(source) {
      const split = source.split(/\n( *)/);
      const first = split[0];
      const m = first.match(/^( *)/);
      const line0 = m?.[1] ? [m[1], first.slice(m[1].length)] : ["", first];
      const lines = [line0];
      for (let i = 1; i < split.length; i += 2)
        lines.push([split[i], split[i + 1]]);
      return lines;
    }
    exports.resolveBlockScalar = resolveBlockScalar;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/compose/resolve-flow-scalar.js
var require_resolve_flow_scalar = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/compose/resolve-flow-scalar.js"(exports) {
    "use strict";
    var Scalar = require_Scalar();
    var resolveEnd = require_resolve_end();
    function resolveFlowScalar(scalar, strict, onError) {
      const { offset, type, source, end } = scalar;
      let _type;
      let value;
      const _onError = (rel, code, msg) => onError(offset + rel, code, msg);
      switch (type) {
        case "scalar":
          _type = Scalar.Scalar.PLAIN;
          value = plainValue(source, _onError);
          break;
        case "single-quoted-scalar":
          _type = Scalar.Scalar.QUOTE_SINGLE;
          value = singleQuotedValue(source, _onError);
          break;
        case "double-quoted-scalar":
          _type = Scalar.Scalar.QUOTE_DOUBLE;
          value = doubleQuotedValue(source, _onError);
          break;
        /* istanbul ignore next should not happen */
        default:
          onError(scalar, "UNEXPECTED_TOKEN", `Expected a flow scalar value, but found: ${type}`);
          return {
            value: "",
            type: null,
            comment: "",
            range: [offset, offset + source.length, offset + source.length]
          };
      }
      const valueEnd = offset + source.length;
      const re = resolveEnd.resolveEnd(end, valueEnd, strict, onError);
      return {
        value,
        type: _type,
        comment: re.comment,
        range: [offset, valueEnd, re.offset]
      };
    }
    function plainValue(source, onError) {
      let badChar = "";
      switch (source[0]) {
        /* istanbul ignore next should not happen */
        case "	":
          badChar = "a tab character";
          break;
        case ",":
          badChar = "flow indicator character ,";
          break;
        case "%":
          badChar = "directive indicator character %";
          break;
        case "|":
        case ">": {
          badChar = `block scalar indicator ${source[0]}`;
          break;
        }
        case "@":
        case "`": {
          badChar = `reserved character ${source[0]}`;
          break;
        }
      }
      if (badChar)
        onError(0, "BAD_SCALAR_START", `Plain value cannot start with ${badChar}`);
      return unfoldLines(source);
    }
    function singleQuotedValue(source, onError) {
      if (source[source.length - 1] !== "'" || source.length === 1)
        onError(source.length, "MISSING_CHAR", "Missing closing 'quote");
      return unfoldLines(source.slice(1, -1)).replace(/''/g, "'");
    }
    function unfoldLines(source) {
      const line3 = /(.*?)\r?\n/sy;
      let match = line3.exec(source);
      if (!match)
        return source;
      let trimEnd, trimBoth;
      try {
        trimEnd = new RegExp("(?<![ 	])[ 	]+$");
        trimBoth = new RegExp("^[ 	]+|(?<![ 	])[ 	]+$", "g");
      } catch {
        trimEnd = /[ \t]+$/;
        trimBoth = /^[ \t]+|[ \t]+$/g;
      }
      let res = match[1].replace(trimEnd, "");
      let sep2 = " ";
      let pos = line3.lastIndex;
      while (match = line3.exec(source)) {
        const lm = match[1].replace(trimBoth, "");
        if (lm === "") {
          if (sep2 === "\n")
            res += sep2;
          else
            sep2 = "\n";
        } else {
          res += sep2 + lm;
          sep2 = " ";
        }
        pos = line3.lastIndex;
      }
      const last = /[ \t]*(.*)/sy;
      last.lastIndex = pos;
      match = last.exec(source);
      return res + sep2 + (match?.[1] ?? "");
    }
    function doubleQuotedValue(source, onError) {
      let res = "";
      for (let i = 1; i < source.length - 1; ++i) {
        const ch = source[i];
        if (ch === "\r" && source[i + 1] === "\n")
          continue;
        if (ch === "\n") {
          const { fold, offset } = foldNewline(source, i);
          res += fold;
          i = offset;
        } else if (ch === "\\") {
          let next = source[++i];
          const cc = escapeCodes[next];
          if (cc)
            res += cc;
          else if (next === "\n") {
            next = source[i + 1];
            while (next === " " || next === "	")
              next = source[++i + 1];
          } else if (next === "\r" && source[i + 1] === "\n") {
            next = source[++i + 1];
            while (next === " " || next === "	")
              next = source[++i + 1];
          } else if (next === "x" || next === "u" || next === "U") {
            const length = next === "x" ? 2 : next === "u" ? 4 : 8;
            res += parseCharCode(source, i + 1, length, onError);
            i += length;
          } else {
            const raw = source.substr(i - 1, 2);
            onError(i - 1, "BAD_DQ_ESCAPE", `Invalid escape sequence ${raw}`);
            res += raw;
          }
        } else if (ch === " " || ch === "	") {
          const wsStart = i;
          let next = source[i + 1];
          while (next === " " || next === "	")
            next = source[++i + 1];
          if (next !== "\n" && !(next === "\r" && source[i + 2] === "\n"))
            res += i > wsStart ? source.slice(wsStart, i + 1) : ch;
        } else {
          res += ch;
        }
      }
      if (source[source.length - 1] !== '"' || source.length === 1)
        onError(source.length, "MISSING_CHAR", 'Missing closing "quote');
      return res;
    }
    function foldNewline(source, offset) {
      let fold = "";
      let ch = source[offset + 1];
      while (ch === " " || ch === "	" || ch === "\n" || ch === "\r") {
        if (ch === "\r" && source[offset + 2] !== "\n")
          break;
        if (ch === "\n")
          fold += "\n";
        offset += 1;
        ch = source[offset + 1];
      }
      if (!fold)
        fold = " ";
      return { fold, offset };
    }
    var escapeCodes = {
      "0": "\0",
      // null character
      a: "\x07",
      // bell character
      b: "\b",
      // backspace
      e: "\x1B",
      // escape character
      f: "\f",
      // form feed
      n: "\n",
      // line feed
      r: "\r",
      // carriage return
      t: "	",
      // horizontal tab
      v: "\v",
      // vertical tab
      N: "\x85",
      // Unicode next line
      _: "\xA0",
      // Unicode non-breaking space
      L: "\u2028",
      // Unicode line separator
      P: "\u2029",
      // Unicode paragraph separator
      " ": " ",
      '"': '"',
      "/": "/",
      "\\": "\\",
      "	": "	"
    };
    function parseCharCode(source, offset, length, onError) {
      const cc = source.substr(offset, length);
      const ok = cc.length === length && /^[0-9a-fA-F]+$/.test(cc);
      const code = ok ? parseInt(cc, 16) : NaN;
      try {
        return String.fromCodePoint(code);
      } catch {
        const raw = source.substr(offset - 2, length + 2);
        onError(offset - 2, "BAD_DQ_ESCAPE", `Invalid escape sequence ${raw}`);
        return raw;
      }
    }
    exports.resolveFlowScalar = resolveFlowScalar;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/compose/compose-scalar.js
var require_compose_scalar = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/compose/compose-scalar.js"(exports) {
    "use strict";
    var identity = require_identity();
    var Scalar = require_Scalar();
    var resolveBlockScalar = require_resolve_block_scalar();
    var resolveFlowScalar = require_resolve_flow_scalar();
    function composeScalar(ctx, token, tagToken, onError) {
      const { value, type, comment, range } = token.type === "block-scalar" ? resolveBlockScalar.resolveBlockScalar(ctx, token, onError) : resolveFlowScalar.resolveFlowScalar(token, ctx.options.strict, onError);
      const tagName = tagToken ? ctx.directives.tagName(tagToken.source, (msg) => onError(tagToken, "TAG_RESOLVE_FAILED", msg)) : null;
      let tag;
      if (ctx.options.stringKeys && ctx.atKey) {
        tag = ctx.schema[identity.SCALAR];
      } else if (tagName)
        tag = findScalarTagByName(ctx.schema, value, tagName, tagToken, onError);
      else if (token.type === "scalar")
        tag = findScalarTagByTest(ctx, value, token, onError);
      else
        tag = ctx.schema[identity.SCALAR];
      let scalar;
      try {
        const res = tag.resolve(value, (msg) => onError(tagToken ?? token, "TAG_RESOLVE_FAILED", msg), ctx.options);
        scalar = identity.isScalar(res) ? res : new Scalar.Scalar(res);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        onError(tagToken ?? token, "TAG_RESOLVE_FAILED", msg);
        scalar = new Scalar.Scalar(value);
      }
      scalar.range = range;
      scalar.source = value;
      if (type)
        scalar.type = type;
      if (tagName)
        scalar.tag = tagName;
      if (tag.format)
        scalar.format = tag.format;
      if (comment)
        scalar.comment = comment;
      return scalar;
    }
    function findScalarTagByName(schema, value, tagName, tagToken, onError) {
      if (tagName === "!")
        return schema[identity.SCALAR];
      const matchWithTest = [];
      for (const tag of schema.tags) {
        if (!tag.collection && tag.tag === tagName) {
          if (tag.default && tag.test)
            matchWithTest.push(tag);
          else
            return tag;
        }
      }
      for (const tag of matchWithTest)
        if (tag.test?.test(value))
          return tag;
      const kt = schema.knownTags[tagName];
      if (kt && !kt.collection) {
        schema.tags.push(Object.assign({}, kt, { default: false, test: void 0 }));
        return kt;
      }
      onError(tagToken, "TAG_RESOLVE_FAILED", `Unresolved tag: ${tagName}`, tagName !== "tag:yaml.org,2002:str");
      return schema[identity.SCALAR];
    }
    function findScalarTagByTest({ atKey, directives, schema }, value, token, onError) {
      const tag = schema.tags.find((tag2) => (tag2.default === true || atKey && tag2.default === "key") && tag2.test?.test(value)) || schema[identity.SCALAR];
      if (schema.compat) {
        const compat = schema.compat.find((tag2) => tag2.default && tag2.test?.test(value)) ?? schema[identity.SCALAR];
        if (tag.tag !== compat.tag) {
          const ts = directives.tagString(tag.tag);
          const cs = directives.tagString(compat.tag);
          const msg = `Value may be parsed as either ${ts} or ${cs}`;
          onError(token, "TAG_RESOLVE_FAILED", msg, true);
        }
      }
      return tag;
    }
    exports.composeScalar = composeScalar;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/compose/util-empty-scalar-position.js
var require_util_empty_scalar_position = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/compose/util-empty-scalar-position.js"(exports) {
    "use strict";
    function emptyScalarPosition(offset, before, pos) {
      if (before) {
        pos ?? (pos = before.length);
        for (let i = pos - 1; i >= 0; --i) {
          let st = before[i];
          switch (st.type) {
            case "space":
            case "comment":
            case "newline":
              offset -= st.source.length;
              continue;
          }
          st = before[++i];
          while (st?.type === "space") {
            offset += st.source.length;
            st = before[++i];
          }
          break;
        }
      }
      return offset;
    }
    exports.emptyScalarPosition = emptyScalarPosition;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/compose/compose-node.js
var require_compose_node = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/compose/compose-node.js"(exports) {
    "use strict";
    var Alias = require_Alias();
    var identity = require_identity();
    var composeCollection = require_compose_collection();
    var composeScalar = require_compose_scalar();
    var resolveEnd = require_resolve_end();
    var utilEmptyScalarPosition = require_util_empty_scalar_position();
    var CN = { composeNode, composeEmptyNode };
    function composeNode(ctx, token, props, onError) {
      const atKey = ctx.atKey;
      const { spaceBefore, comment, anchor, tag } = props;
      let node;
      let isSrcToken = true;
      switch (token.type) {
        case "alias":
          node = composeAlias(ctx, token, onError);
          if (anchor || tag)
            onError(token, "ALIAS_PROPS", "An alias node must not specify any properties");
          break;
        case "scalar":
        case "single-quoted-scalar":
        case "double-quoted-scalar":
        case "block-scalar":
          node = composeScalar.composeScalar(ctx, token, tag, onError);
          if (anchor)
            node.anchor = anchor.source.substring(1);
          break;
        case "block-map":
        case "block-seq":
        case "flow-collection":
          try {
            node = composeCollection.composeCollection(CN, ctx, token, props, onError);
            if (anchor)
              node.anchor = anchor.source.substring(1);
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            onError(token, "RESOURCE_EXHAUSTION", message);
          }
          break;
        default: {
          const message = token.type === "error" ? token.message : `Unsupported token (type: ${token.type})`;
          onError(token, "UNEXPECTED_TOKEN", message);
          isSrcToken = false;
        }
      }
      node ?? (node = composeEmptyNode(ctx, token.offset, void 0, null, props, onError));
      if (anchor && node.anchor === "")
        onError(anchor, "BAD_ALIAS", "Anchor cannot be an empty string");
      if (atKey && ctx.options.stringKeys && (!identity.isScalar(node) || typeof node.value !== "string" || node.tag && node.tag !== "tag:yaml.org,2002:str")) {
        const msg = "With stringKeys, all keys must be strings";
        onError(tag ?? token, "NON_STRING_KEY", msg);
      }
      if (spaceBefore)
        node.spaceBefore = true;
      if (comment) {
        if (token.type === "scalar" && token.source === "")
          node.comment = comment;
        else
          node.commentBefore = comment;
      }
      if (ctx.options.keepSourceTokens && isSrcToken)
        node.srcToken = token;
      return node;
    }
    function composeEmptyNode(ctx, offset, before, pos, { spaceBefore, comment, anchor, tag, end }, onError) {
      const token = {
        type: "scalar",
        offset: utilEmptyScalarPosition.emptyScalarPosition(offset, before, pos),
        indent: -1,
        source: ""
      };
      const node = composeScalar.composeScalar(ctx, token, tag, onError);
      if (anchor) {
        node.anchor = anchor.source.substring(1);
        if (node.anchor === "")
          onError(anchor, "BAD_ALIAS", "Anchor cannot be an empty string");
      }
      if (spaceBefore)
        node.spaceBefore = true;
      if (comment) {
        node.comment = comment;
        node.range[2] = end;
      }
      return node;
    }
    function composeAlias({ options }, { offset, source, end }, onError) {
      const alias = new Alias.Alias(source.substring(1));
      if (alias.source === "")
        onError(offset, "BAD_ALIAS", "Alias cannot be an empty string");
      if (alias.source.endsWith(":"))
        onError(offset + source.length - 1, "BAD_ALIAS", "Alias ending in : is ambiguous", true);
      const valueEnd = offset + source.length;
      const re = resolveEnd.resolveEnd(end, valueEnd, options.strict, onError);
      alias.range = [offset, valueEnd, re.offset];
      if (re.comment)
        alias.comment = re.comment;
      return alias;
    }
    exports.composeEmptyNode = composeEmptyNode;
    exports.composeNode = composeNode;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/compose/compose-doc.js
var require_compose_doc = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/compose/compose-doc.js"(exports) {
    "use strict";
    var Document = require_Document();
    var composeNode = require_compose_node();
    var resolveEnd = require_resolve_end();
    var resolveProps = require_resolve_props();
    function composeDoc(options, directives, { offset, start, value, end }, onError) {
      const opts = Object.assign({ _directives: directives }, options);
      const doc = new Document.Document(void 0, opts);
      const ctx = {
        atKey: false,
        atRoot: true,
        directives: doc.directives,
        options: doc.options,
        schema: doc.schema
      };
      const props = resolveProps.resolveProps(start, {
        indicator: "doc-start",
        next: value ?? end?.[0],
        offset,
        onError,
        parentIndent: 0,
        startOnNewline: true
      });
      if (props.found) {
        doc.directives.docStart = true;
        if (value && (value.type === "block-map" || value.type === "block-seq") && !props.hasNewline)
          onError(props.end, "MISSING_CHAR", "Block collection cannot start on same line with directives-end marker");
      }
      doc.contents = value ? composeNode.composeNode(ctx, value, props, onError) : composeNode.composeEmptyNode(ctx, props.end, start, null, props, onError);
      const contentEnd = doc.contents.range[2];
      const re = resolveEnd.resolveEnd(end, contentEnd, false, onError);
      if (re.comment)
        doc.comment = re.comment;
      doc.range = [offset, contentEnd, re.offset];
      return doc;
    }
    exports.composeDoc = composeDoc;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/compose/composer.js
var require_composer = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/compose/composer.js"(exports) {
    "use strict";
    var node_process = __require("process");
    var directives = require_directives();
    var Document = require_Document();
    var errors = require_errors();
    var identity = require_identity();
    var composeDoc = require_compose_doc();
    var resolveEnd = require_resolve_end();
    function getErrorPos(src) {
      if (typeof src === "number")
        return [src, src + 1];
      if (Array.isArray(src))
        return src.length === 2 ? src : [src[0], src[1]];
      const { offset, source } = src;
      return [offset, offset + (typeof source === "string" ? source.length : 1)];
    }
    function parsePrelude(prelude) {
      let comment = "";
      let atComment = false;
      let afterEmptyLine = false;
      for (let i = 0; i < prelude.length; ++i) {
        const source = prelude[i];
        switch (source[0]) {
          case "#":
            comment += (comment === "" ? "" : afterEmptyLine ? "\n\n" : "\n") + (source.substring(1) || " ");
            atComment = true;
            afterEmptyLine = false;
            break;
          case "%":
            if (prelude[i + 1]?.[0] !== "#")
              i += 1;
            atComment = false;
            break;
          default:
            if (!atComment)
              afterEmptyLine = true;
            atComment = false;
        }
      }
      return { comment, afterEmptyLine };
    }
    var Composer = class {
      constructor(options = {}) {
        this.doc = null;
        this.atDirectives = false;
        this.prelude = [];
        this.errors = [];
        this.warnings = [];
        this.onError = (source, code, message, warning) => {
          const pos = getErrorPos(source);
          if (warning)
            this.warnings.push(new errors.YAMLWarning(pos, code, message));
          else
            this.errors.push(new errors.YAMLParseError(pos, code, message));
        };
        this.directives = new directives.Directives({ version: options.version || "1.2" });
        this.options = options;
      }
      decorate(doc, afterDoc) {
        const { comment, afterEmptyLine } = parsePrelude(this.prelude);
        if (comment) {
          const dc = doc.contents;
          if (afterDoc) {
            doc.comment = doc.comment ? `${doc.comment}
${comment}` : comment;
          } else if (afterEmptyLine || doc.directives.docStart || !dc) {
            doc.commentBefore = comment;
          } else if (identity.isCollection(dc) && !dc.flow && dc.items.length > 0) {
            let it = dc.items[0];
            if (identity.isPair(it))
              it = it.key;
            const cb = it.commentBefore;
            it.commentBefore = cb ? `${comment}
${cb}` : comment;
          } else {
            const cb = dc.commentBefore;
            dc.commentBefore = cb ? `${comment}
${cb}` : comment;
          }
        }
        if (afterDoc) {
          for (let i = 0; i < this.errors.length; ++i)
            doc.errors.push(this.errors[i]);
          for (let i = 0; i < this.warnings.length; ++i)
            doc.warnings.push(this.warnings[i]);
        } else {
          doc.errors = this.errors;
          doc.warnings = this.warnings;
        }
        this.prelude = [];
        this.errors = [];
        this.warnings = [];
      }
      /**
       * Current stream status information.
       *
       * Mostly useful at the end of input for an empty stream.
       */
      streamInfo() {
        return {
          comment: parsePrelude(this.prelude).comment,
          directives: this.directives,
          errors: this.errors,
          warnings: this.warnings
        };
      }
      /**
       * Compose tokens into documents.
       *
       * @param forceDoc - If the stream contains no document, still emit a final document including any comments and directives that would be applied to a subsequent document.
       * @param endOffset - Should be set if `forceDoc` is also set, to set the document range end and to indicate errors correctly.
       */
      *compose(tokens, forceDoc = false, endOffset = -1) {
        for (const token of tokens)
          yield* this.next(token);
        yield* this.end(forceDoc, endOffset);
      }
      /** Advance the composer by one CST token. */
      *next(token) {
        if (node_process.env.LOG_STREAM)
          console.dir(token, { depth: null });
        switch (token.type) {
          case "directive":
            this.directives.add(token.source, (offset, message, warning) => {
              const pos = getErrorPos(token);
              pos[0] += offset;
              this.onError(pos, "BAD_DIRECTIVE", message, warning);
            });
            this.prelude.push(token.source);
            this.atDirectives = true;
            break;
          case "document": {
            const doc = composeDoc.composeDoc(this.options, this.directives, token, this.onError);
            if (this.atDirectives && !doc.directives.docStart)
              this.onError(token, "MISSING_CHAR", "Missing directives-end/doc-start indicator line");
            this.decorate(doc, false);
            if (this.doc)
              yield this.doc;
            this.doc = doc;
            this.atDirectives = false;
            break;
          }
          case "byte-order-mark":
          case "space":
            break;
          case "comment":
          case "newline":
            this.prelude.push(token.source);
            break;
          case "error": {
            const msg = token.source ? `${token.message}: ${JSON.stringify(token.source)}` : token.message;
            const error = new errors.YAMLParseError(getErrorPos(token), "UNEXPECTED_TOKEN", msg);
            if (this.atDirectives || !this.doc)
              this.errors.push(error);
            else
              this.doc.errors.push(error);
            break;
          }
          case "doc-end": {
            if (!this.doc) {
              const msg = "Unexpected doc-end without preceding document";
              this.errors.push(new errors.YAMLParseError(getErrorPos(token), "UNEXPECTED_TOKEN", msg));
              break;
            }
            this.doc.directives.docEnd = true;
            const end = resolveEnd.resolveEnd(token.end, token.offset + token.source.length, this.doc.options.strict, this.onError);
            this.decorate(this.doc, true);
            if (end.comment) {
              const dc = this.doc.comment;
              this.doc.comment = dc ? `${dc}
${end.comment}` : end.comment;
            }
            this.doc.range[2] = end.offset;
            break;
          }
          default:
            this.errors.push(new errors.YAMLParseError(getErrorPos(token), "UNEXPECTED_TOKEN", `Unsupported token ${token.type}`));
        }
      }
      /**
       * Call at end of input to yield any remaining document.
       *
       * @param forceDoc - If the stream contains no document, still emit a final document including any comments and directives that would be applied to a subsequent document.
       * @param endOffset - Should be set if `forceDoc` is also set, to set the document range end and to indicate errors correctly.
       */
      *end(forceDoc = false, endOffset = -1) {
        if (this.doc) {
          this.decorate(this.doc, true);
          yield this.doc;
          this.doc = null;
        } else if (forceDoc) {
          const opts = Object.assign({ _directives: this.directives }, this.options);
          const doc = new Document.Document(void 0, opts);
          if (this.atDirectives)
            this.onError(endOffset, "MISSING_CHAR", "Missing directives-end indicator line");
          doc.range = [0, endOffset, endOffset];
          this.decorate(doc, false);
          yield doc;
        }
      }
    };
    exports.Composer = Composer;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/parse/cst-scalar.js
var require_cst_scalar = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/parse/cst-scalar.js"(exports) {
    "use strict";
    var resolveBlockScalar = require_resolve_block_scalar();
    var resolveFlowScalar = require_resolve_flow_scalar();
    var errors = require_errors();
    var stringifyString = require_stringifyString();
    function resolveAsScalar(token, strict = true, onError) {
      if (token) {
        const _onError = (pos, code, message) => {
          const offset = typeof pos === "number" ? pos : Array.isArray(pos) ? pos[0] : pos.offset;
          if (onError)
            onError(offset, code, message);
          else
            throw new errors.YAMLParseError([offset, offset + 1], code, message);
        };
        switch (token.type) {
          case "scalar":
          case "single-quoted-scalar":
          case "double-quoted-scalar":
            return resolveFlowScalar.resolveFlowScalar(token, strict, _onError);
          case "block-scalar":
            return resolveBlockScalar.resolveBlockScalar({ options: { strict } }, token, _onError);
        }
      }
      return null;
    }
    function createScalarToken(value, context) {
      const { implicitKey = false, indent, inFlow = false, offset = -1, type = "PLAIN" } = context;
      const source = stringifyString.stringifyString({ type, value }, {
        implicitKey,
        indent: indent > 0 ? " ".repeat(indent) : "",
        inFlow,
        options: { blockQuote: true, lineWidth: -1 }
      });
      const end = context.end ?? [
        { type: "newline", offset: -1, indent, source: "\n" }
      ];
      switch (source[0]) {
        case "|":
        case ">": {
          const he = source.indexOf("\n");
          const head = source.substring(0, he);
          const body = source.substring(he + 1) + "\n";
          const props = [
            { type: "block-scalar-header", offset, indent, source: head }
          ];
          if (!addEndtoBlockProps(props, end))
            props.push({ type: "newline", offset: -1, indent, source: "\n" });
          return { type: "block-scalar", offset, indent, props, source: body };
        }
        case '"':
          return { type: "double-quoted-scalar", offset, indent, source, end };
        case "'":
          return { type: "single-quoted-scalar", offset, indent, source, end };
        default:
          return { type: "scalar", offset, indent, source, end };
      }
    }
    function setScalarValue(token, value, context = {}) {
      let { afterKey = false, implicitKey = false, inFlow = false, type } = context;
      let indent = "indent" in token ? token.indent : null;
      if (afterKey && typeof indent === "number")
        indent += 2;
      if (!type)
        switch (token.type) {
          case "single-quoted-scalar":
            type = "QUOTE_SINGLE";
            break;
          case "double-quoted-scalar":
            type = "QUOTE_DOUBLE";
            break;
          case "block-scalar": {
            const header = token.props[0];
            if (header.type !== "block-scalar-header")
              throw new Error("Invalid block scalar header");
            type = header.source[0] === ">" ? "BLOCK_FOLDED" : "BLOCK_LITERAL";
            break;
          }
          default:
            type = "PLAIN";
        }
      const source = stringifyString.stringifyString({ type, value }, {
        implicitKey: implicitKey || indent === null,
        indent: indent !== null && indent > 0 ? " ".repeat(indent) : "",
        inFlow,
        options: { blockQuote: true, lineWidth: -1 }
      });
      switch (source[0]) {
        case "|":
        case ">":
          setBlockScalarValue(token, source);
          break;
        case '"':
          setFlowScalarValue(token, source, "double-quoted-scalar");
          break;
        case "'":
          setFlowScalarValue(token, source, "single-quoted-scalar");
          break;
        default:
          setFlowScalarValue(token, source, "scalar");
      }
    }
    function setBlockScalarValue(token, source) {
      const he = source.indexOf("\n");
      const head = source.substring(0, he);
      const body = source.substring(he + 1) + "\n";
      if (token.type === "block-scalar") {
        const header = token.props[0];
        if (header.type !== "block-scalar-header")
          throw new Error("Invalid block scalar header");
        header.source = head;
        token.source = body;
      } else {
        const { offset } = token;
        const indent = "indent" in token ? token.indent : -1;
        const props = [
          { type: "block-scalar-header", offset, indent, source: head }
        ];
        if (!addEndtoBlockProps(props, "end" in token ? token.end : void 0))
          props.push({ type: "newline", offset: -1, indent, source: "\n" });
        for (const key of Object.keys(token))
          if (key !== "type" && key !== "offset")
            delete token[key];
        Object.assign(token, { type: "block-scalar", indent, props, source: body });
      }
    }
    function addEndtoBlockProps(props, end) {
      if (end)
        for (const st of end)
          switch (st.type) {
            case "space":
            case "comment":
              props.push(st);
              break;
            case "newline":
              props.push(st);
              return true;
          }
      return false;
    }
    function setFlowScalarValue(token, source, type) {
      switch (token.type) {
        case "scalar":
        case "double-quoted-scalar":
        case "single-quoted-scalar":
          token.type = type;
          token.source = source;
          break;
        case "block-scalar": {
          const end = token.props.slice(1);
          let oa = source.length;
          if (token.props[0].type === "block-scalar-header")
            oa -= token.props[0].source.length;
          for (const tok of end)
            tok.offset += oa;
          delete token.props;
          Object.assign(token, { type, source, end });
          break;
        }
        case "block-map":
        case "block-seq": {
          const offset = token.offset + source.length;
          const nl = { type: "newline", offset, indent: token.indent, source: "\n" };
          delete token.items;
          Object.assign(token, { type, source, end: [nl] });
          break;
        }
        default: {
          const indent = "indent" in token ? token.indent : -1;
          const end = "end" in token && Array.isArray(token.end) ? token.end.filter((st) => st.type === "space" || st.type === "comment" || st.type === "newline") : [];
          for (const key of Object.keys(token))
            if (key !== "type" && key !== "offset")
              delete token[key];
          Object.assign(token, { type, indent, source, end });
        }
      }
    }
    exports.createScalarToken = createScalarToken;
    exports.resolveAsScalar = resolveAsScalar;
    exports.setScalarValue = setScalarValue;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/parse/cst-stringify.js
var require_cst_stringify = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/parse/cst-stringify.js"(exports) {
    "use strict";
    var stringify5 = (cst) => "type" in cst ? stringifyToken(cst) : stringifyItem(cst);
    function stringifyToken(token) {
      switch (token.type) {
        case "block-scalar": {
          let res = "";
          for (const tok of token.props)
            res += stringifyToken(tok);
          return res + token.source;
        }
        case "block-map":
        case "block-seq": {
          let res = "";
          for (const item of token.items)
            res += stringifyItem(item);
          return res;
        }
        case "flow-collection": {
          let res = token.start.source;
          for (const item of token.items)
            res += stringifyItem(item);
          for (const st of token.end)
            res += st.source;
          return res;
        }
        case "document": {
          let res = stringifyItem(token);
          if (token.end)
            for (const st of token.end)
              res += st.source;
          return res;
        }
        default: {
          let res = token.source;
          if ("end" in token && token.end)
            for (const st of token.end)
              res += st.source;
          return res;
        }
      }
    }
    function stringifyItem({ start, key, sep: sep2, value }) {
      let res = "";
      for (const st of start)
        res += st.source;
      if (key)
        res += stringifyToken(key);
      if (sep2)
        for (const st of sep2)
          res += st.source;
      if (value)
        res += stringifyToken(value);
      return res;
    }
    exports.stringify = stringify5;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/parse/cst-visit.js
var require_cst_visit = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/parse/cst-visit.js"(exports) {
    "use strict";
    var BREAK = /* @__PURE__ */ Symbol("break visit");
    var SKIP = /* @__PURE__ */ Symbol("skip children");
    var REMOVE = /* @__PURE__ */ Symbol("remove item");
    function visit(cst, visitor) {
      if ("type" in cst && cst.type === "document")
        cst = { start: cst.start, value: cst.value };
      _visit(Object.freeze([]), cst, visitor);
    }
    visit.BREAK = BREAK;
    visit.SKIP = SKIP;
    visit.REMOVE = REMOVE;
    visit.itemAtPath = (cst, path) => {
      let item = cst;
      for (const [field, index] of path) {
        const tok = item?.[field];
        if (tok && "items" in tok) {
          item = tok.items[index];
        } else
          return void 0;
      }
      return item;
    };
    visit.parentCollection = (cst, path) => {
      const parent = visit.itemAtPath(cst, path.slice(0, -1));
      const field = path[path.length - 1][0];
      const coll = parent?.[field];
      if (coll && "items" in coll)
        return coll;
      throw new Error("Parent collection not found");
    };
    function _visit(path, item, visitor) {
      let ctrl = visitor(item, path);
      if (typeof ctrl === "symbol")
        return ctrl;
      for (const field of ["key", "value"]) {
        const token = item[field];
        if (token && "items" in token) {
          for (let i = 0; i < token.items.length; ++i) {
            const ci = _visit(Object.freeze(path.concat([[field, i]])), token.items[i], visitor);
            if (typeof ci === "number")
              i = ci - 1;
            else if (ci === BREAK)
              return BREAK;
            else if (ci === REMOVE) {
              token.items.splice(i, 1);
              i -= 1;
            }
          }
          if (typeof ctrl === "function" && field === "key")
            ctrl = ctrl(item, path);
        }
      }
      return typeof ctrl === "function" ? ctrl(item, path) : ctrl;
    }
    exports.visit = visit;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/parse/cst.js
var require_cst = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/parse/cst.js"(exports) {
    "use strict";
    var cstScalar = require_cst_scalar();
    var cstStringify = require_cst_stringify();
    var cstVisit = require_cst_visit();
    var BOM = "\uFEFF";
    var DOCUMENT = "";
    var FLOW_END = "";
    var SCALAR = "";
    var isCollection = (token) => !!token && "items" in token;
    var isScalar = (token) => !!token && (token.type === "scalar" || token.type === "single-quoted-scalar" || token.type === "double-quoted-scalar" || token.type === "block-scalar");
    function prettyToken(token) {
      switch (token) {
        case BOM:
          return "<BOM>";
        case DOCUMENT:
          return "<DOC>";
        case FLOW_END:
          return "<FLOW_END>";
        case SCALAR:
          return "<SCALAR>";
        default:
          return JSON.stringify(token);
      }
    }
    function tokenType(source) {
      switch (source) {
        case BOM:
          return "byte-order-mark";
        case DOCUMENT:
          return "doc-mode";
        case FLOW_END:
          return "flow-error-end";
        case SCALAR:
          return "scalar";
        case "---":
          return "doc-start";
        case "...":
          return "doc-end";
        case "":
        case "\n":
        case "\r\n":
          return "newline";
        case "-":
          return "seq-item-ind";
        case "?":
          return "explicit-key-ind";
        case ":":
          return "map-value-ind";
        case "{":
          return "flow-map-start";
        case "}":
          return "flow-map-end";
        case "[":
          return "flow-seq-start";
        case "]":
          return "flow-seq-end";
        case ",":
          return "comma";
      }
      switch (source[0]) {
        case " ":
        case "	":
          return "space";
        case "#":
          return "comment";
        case "%":
          return "directive-line";
        case "*":
          return "alias";
        case "&":
          return "anchor";
        case "!":
          return "tag";
        case "'":
          return "single-quoted-scalar";
        case '"':
          return "double-quoted-scalar";
        case "|":
        case ">":
          return "block-scalar-header";
      }
      return null;
    }
    exports.createScalarToken = cstScalar.createScalarToken;
    exports.resolveAsScalar = cstScalar.resolveAsScalar;
    exports.setScalarValue = cstScalar.setScalarValue;
    exports.stringify = cstStringify.stringify;
    exports.visit = cstVisit.visit;
    exports.BOM = BOM;
    exports.DOCUMENT = DOCUMENT;
    exports.FLOW_END = FLOW_END;
    exports.SCALAR = SCALAR;
    exports.isCollection = isCollection;
    exports.isScalar = isScalar;
    exports.prettyToken = prettyToken;
    exports.tokenType = tokenType;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/parse/lexer.js
var require_lexer = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/parse/lexer.js"(exports) {
    "use strict";
    var cst = require_cst();
    function isEmpty(ch) {
      switch (ch) {
        case void 0:
        case " ":
        case "\n":
        case "\r":
        case "	":
          return true;
        default:
          return false;
      }
    }
    var hexDigits = new Set("0123456789ABCDEFabcdef");
    var tagChars = new Set("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-#;/?:@&=+$_.!~*'()");
    var flowIndicatorChars = new Set(",[]{}");
    var invalidAnchorChars = new Set(" ,[]{}\n\r	");
    var isNotAnchorChar = (ch) => !ch || invalidAnchorChars.has(ch);
    var Lexer = class {
      constructor() {
        this.atEnd = false;
        this.blockScalarIndent = -1;
        this.blockScalarKeep = false;
        this.buffer = "";
        this.flowKey = false;
        this.flowLevel = 0;
        this.indentNext = 0;
        this.indentValue = 0;
        this.lineEndPos = null;
        this.next = null;
        this.pos = 0;
      }
      /**
       * Generate YAML tokens from the `source` string. If `incomplete`,
       * a part of the last line may be left as a buffer for the next call.
       *
       * @returns A generator of lexical tokens
       */
      *lex(source, incomplete = false) {
        if (source) {
          if (typeof source !== "string")
            throw TypeError("source is not a string");
          this.buffer = this.buffer ? this.buffer + source : source;
          this.lineEndPos = null;
        }
        this.atEnd = !incomplete;
        let next = this.next ?? "stream";
        while (next && (incomplete || this.hasChars(1)))
          next = yield* this.parseNext(next);
      }
      atLineEnd() {
        let i = this.pos;
        let ch = this.buffer[i];
        while (ch === " " || ch === "	")
          ch = this.buffer[++i];
        if (!ch || ch === "#" || ch === "\n")
          return true;
        if (ch === "\r")
          return this.buffer[i + 1] === "\n";
        return false;
      }
      charAt(n) {
        return this.buffer[this.pos + n];
      }
      continueScalar(offset) {
        let ch = this.buffer[offset];
        if (this.indentNext > 0) {
          let indent = 0;
          while (ch === " ")
            ch = this.buffer[++indent + offset];
          if (ch === "\r") {
            const next = this.buffer[indent + offset + 1];
            if (next === "\n" || !next && !this.atEnd)
              return offset + indent + 1;
          }
          return ch === "\n" || indent >= this.indentNext || !ch && !this.atEnd ? offset + indent : -1;
        }
        if (ch === "-" || ch === ".") {
          const dt = this.buffer.substr(offset, 3);
          if ((dt === "---" || dt === "...") && isEmpty(this.buffer[offset + 3]))
            return -1;
        }
        return offset;
      }
      getLine() {
        let end = this.lineEndPos;
        if (typeof end !== "number" || end !== -1 && end < this.pos) {
          end = this.buffer.indexOf("\n", this.pos);
          this.lineEndPos = end;
        }
        if (end === -1)
          return this.atEnd ? this.buffer.substring(this.pos) : null;
        if (this.buffer[end - 1] === "\r")
          end -= 1;
        return this.buffer.substring(this.pos, end);
      }
      hasChars(n) {
        return this.pos + n <= this.buffer.length;
      }
      setNext(state) {
        this.buffer = this.buffer.substring(this.pos);
        this.pos = 0;
        this.lineEndPos = null;
        this.next = state;
        return null;
      }
      peek(n) {
        return this.buffer.substr(this.pos, n);
      }
      *parseNext(next) {
        switch (next) {
          case "stream":
            return yield* this.parseStream();
          case "line-start":
            return yield* this.parseLineStart();
          case "block-start":
            return yield* this.parseBlockStart();
          case "doc":
            return yield* this.parseDocument();
          case "flow":
            return yield* this.parseFlowCollection();
          case "quoted-scalar":
            return yield* this.parseQuotedScalar();
          case "block-scalar":
            return yield* this.parseBlockScalar();
          case "plain-scalar":
            return yield* this.parsePlainScalar();
        }
      }
      *parseStream() {
        let line3 = this.getLine();
        if (line3 === null)
          return this.setNext("stream");
        if (line3[0] === cst.BOM) {
          yield* this.pushCount(1);
          line3 = line3.substring(1);
        }
        if (line3[0] === "%") {
          let dirEnd = line3.length;
          let cs = line3.indexOf("#");
          while (cs !== -1) {
            const ch = line3[cs - 1];
            if (ch === " " || ch === "	") {
              dirEnd = cs - 1;
              break;
            } else {
              cs = line3.indexOf("#", cs + 1);
            }
          }
          while (true) {
            const ch = line3[dirEnd - 1];
            if (ch === " " || ch === "	")
              dirEnd -= 1;
            else
              break;
          }
          const n = (yield* this.pushCount(dirEnd)) + (yield* this.pushSpaces(true));
          yield* this.pushCount(line3.length - n);
          this.pushNewline();
          return "stream";
        }
        if (this.atLineEnd()) {
          const sp = yield* this.pushSpaces(true);
          yield* this.pushCount(line3.length - sp);
          yield* this.pushNewline();
          return "stream";
        }
        yield cst.DOCUMENT;
        return yield* this.parseLineStart();
      }
      *parseLineStart() {
        const ch = this.charAt(0);
        if (!ch && !this.atEnd)
          return this.setNext("line-start");
        if (ch === "-" || ch === ".") {
          if (!this.atEnd && !this.hasChars(4))
            return this.setNext("line-start");
          const s = this.peek(3);
          if ((s === "---" || s === "...") && isEmpty(this.charAt(3))) {
            yield* this.pushCount(3);
            this.indentValue = 0;
            this.indentNext = 0;
            return s === "---" ? "doc" : "stream";
          }
        }
        this.indentValue = yield* this.pushSpaces(false);
        if (this.indentNext > this.indentValue && !isEmpty(this.charAt(1)))
          this.indentNext = this.indentValue;
        return yield* this.parseBlockStart();
      }
      *parseBlockStart() {
        const [ch0, ch1] = this.peek(2);
        if (!ch1 && !this.atEnd)
          return this.setNext("block-start");
        if ((ch0 === "-" || ch0 === "?" || ch0 === ":") && isEmpty(ch1)) {
          const n = (yield* this.pushCount(1)) + (yield* this.pushSpaces(true));
          this.indentNext = this.indentValue + 1;
          this.indentValue += n;
          return "block-start";
        }
        return "doc";
      }
      *parseDocument() {
        yield* this.pushSpaces(true);
        const line3 = this.getLine();
        if (line3 === null)
          return this.setNext("doc");
        let n = yield* this.pushIndicators();
        switch (line3[n]) {
          case "#":
            yield* this.pushCount(line3.length - n);
          // fallthrough
          case void 0:
            yield* this.pushNewline();
            return yield* this.parseLineStart();
          case "{":
          case "[":
            yield* this.pushCount(1);
            this.flowKey = false;
            this.flowLevel = 1;
            return "flow";
          case "}":
          case "]":
            yield* this.pushCount(1);
            return "doc";
          case "*":
            yield* this.pushUntil(isNotAnchorChar);
            return "doc";
          case '"':
          case "'":
            return yield* this.parseQuotedScalar();
          case "|":
          case ">":
            n += yield* this.parseBlockScalarHeader();
            n += yield* this.pushSpaces(true);
            yield* this.pushCount(line3.length - n);
            yield* this.pushNewline();
            return yield* this.parseBlockScalar();
          default:
            return yield* this.parsePlainScalar();
        }
      }
      *parseFlowCollection() {
        let nl, sp;
        let indent = -1;
        do {
          nl = yield* this.pushNewline();
          if (nl > 0) {
            sp = yield* this.pushSpaces(false);
            this.indentValue = indent = sp;
          } else {
            sp = 0;
          }
          sp += yield* this.pushSpaces(true);
        } while (nl + sp > 0);
        const line3 = this.getLine();
        if (line3 === null)
          return this.setNext("flow");
        if (indent !== -1 && indent < this.indentNext && line3[0] !== "#" || indent === 0 && (line3.startsWith("---") || line3.startsWith("...")) && isEmpty(line3[3])) {
          const atFlowEndMarker = indent === this.indentNext - 1 && this.flowLevel === 1 && (line3[0] === "]" || line3[0] === "}");
          if (!atFlowEndMarker) {
            this.flowLevel = 0;
            yield cst.FLOW_END;
            return yield* this.parseLineStart();
          }
        }
        let n = 0;
        while (line3[n] === ",") {
          n += yield* this.pushCount(1);
          n += yield* this.pushSpaces(true);
          this.flowKey = false;
        }
        n += yield* this.pushIndicators();
        switch (line3[n]) {
          case void 0:
            return "flow";
          case "#":
            yield* this.pushCount(line3.length - n);
            return "flow";
          case "{":
          case "[":
            yield* this.pushCount(1);
            this.flowKey = false;
            this.flowLevel += 1;
            return "flow";
          case "}":
          case "]":
            yield* this.pushCount(1);
            this.flowKey = true;
            this.flowLevel -= 1;
            return this.flowLevel ? "flow" : "doc";
          case "*":
            yield* this.pushUntil(isNotAnchorChar);
            return "flow";
          case '"':
          case "'":
            this.flowKey = true;
            return yield* this.parseQuotedScalar();
          case ":": {
            const next = this.charAt(1);
            if (this.flowKey || isEmpty(next) || next === ",") {
              this.flowKey = false;
              yield* this.pushCount(1);
              yield* this.pushSpaces(true);
              return "flow";
            }
          }
          // fallthrough
          default:
            this.flowKey = false;
            return yield* this.parsePlainScalar();
        }
      }
      *parseQuotedScalar() {
        const quote2 = this.charAt(0);
        let end = this.buffer.indexOf(quote2, this.pos + 1);
        if (quote2 === "'") {
          while (end !== -1 && this.buffer[end + 1] === "'")
            end = this.buffer.indexOf("'", end + 2);
        } else {
          while (end !== -1) {
            let n = 0;
            while (this.buffer[end - 1 - n] === "\\")
              n += 1;
            if (n % 2 === 0)
              break;
            end = this.buffer.indexOf('"', end + 1);
          }
        }
        const qb = this.buffer.substring(0, end);
        let nl = qb.indexOf("\n", this.pos);
        if (nl !== -1) {
          while (nl !== -1) {
            const cs = this.continueScalar(nl + 1);
            if (cs === -1)
              break;
            nl = qb.indexOf("\n", cs);
          }
          if (nl !== -1) {
            end = nl - (qb[nl - 1] === "\r" ? 2 : 1);
          }
        }
        if (end === -1) {
          if (!this.atEnd)
            return this.setNext("quoted-scalar");
          end = this.buffer.length;
        }
        yield* this.pushToIndex(end + 1, false);
        return this.flowLevel ? "flow" : "doc";
      }
      *parseBlockScalarHeader() {
        this.blockScalarIndent = -1;
        this.blockScalarKeep = false;
        let i = this.pos;
        while (true) {
          const ch = this.buffer[++i];
          if (ch === "+")
            this.blockScalarKeep = true;
          else if (ch > "0" && ch <= "9")
            this.blockScalarIndent = Number(ch) - 1;
          else if (ch !== "-")
            break;
        }
        return yield* this.pushUntil((ch) => isEmpty(ch) || ch === "#");
      }
      *parseBlockScalar() {
        let nl = this.pos - 1;
        let indent = 0;
        let ch;
        loop: for (let i2 = this.pos; ch = this.buffer[i2]; ++i2) {
          switch (ch) {
            case " ":
              indent += 1;
              break;
            case "\n":
              nl = i2;
              indent = 0;
              break;
            case "\r": {
              const next = this.buffer[i2 + 1];
              if (!next && !this.atEnd)
                return this.setNext("block-scalar");
              if (next === "\n")
                break;
            }
            // fallthrough
            default:
              break loop;
          }
        }
        if (!ch && !this.atEnd)
          return this.setNext("block-scalar");
        if (indent >= this.indentNext) {
          if (this.blockScalarIndent === -1)
            this.indentNext = indent;
          else {
            this.indentNext = this.blockScalarIndent + (this.indentNext === 0 ? 1 : this.indentNext);
          }
          do {
            const cs = this.continueScalar(nl + 1);
            if (cs === -1)
              break;
            nl = this.buffer.indexOf("\n", cs);
          } while (nl !== -1);
          if (nl === -1) {
            if (!this.atEnd)
              return this.setNext("block-scalar");
            nl = this.buffer.length;
          }
        }
        let i = nl + 1;
        ch = this.buffer[i];
        while (ch === " ")
          ch = this.buffer[++i];
        if (ch === "	") {
          while (ch === "	" || ch === " " || ch === "\r" || ch === "\n")
            ch = this.buffer[++i];
          nl = i - 1;
        } else if (!this.blockScalarKeep) {
          do {
            let i2 = nl - 1;
            let ch2 = this.buffer[i2];
            if (ch2 === "\r")
              ch2 = this.buffer[--i2];
            const lastChar = i2;
            while (ch2 === " ")
              ch2 = this.buffer[--i2];
            if (ch2 === "\n" && i2 >= this.pos && i2 + 1 + indent > lastChar)
              nl = i2;
            else
              break;
          } while (true);
        }
        yield cst.SCALAR;
        yield* this.pushToIndex(nl + 1, true);
        return yield* this.parseLineStart();
      }
      *parsePlainScalar() {
        const inFlow = this.flowLevel > 0;
        let end = this.pos - 1;
        let i = this.pos - 1;
        let ch;
        while (ch = this.buffer[++i]) {
          if (ch === ":") {
            const next = this.buffer[i + 1];
            if (isEmpty(next) || inFlow && flowIndicatorChars.has(next))
              break;
            end = i;
          } else if (isEmpty(ch)) {
            let next = this.buffer[i + 1];
            if (ch === "\r") {
              if (next === "\n") {
                i += 1;
                ch = "\n";
                next = this.buffer[i + 1];
              } else
                end = i;
            }
            if (next === "#" || inFlow && flowIndicatorChars.has(next))
              break;
            if (ch === "\n") {
              const cs = this.continueScalar(i + 1);
              if (cs === -1)
                break;
              i = Math.max(i, cs - 2);
            }
          } else {
            if (inFlow && flowIndicatorChars.has(ch))
              break;
            end = i;
          }
        }
        if (!ch && !this.atEnd)
          return this.setNext("plain-scalar");
        yield cst.SCALAR;
        yield* this.pushToIndex(end + 1, true);
        return inFlow ? "flow" : "doc";
      }
      *pushCount(n) {
        if (n > 0) {
          yield this.buffer.substr(this.pos, n);
          this.pos += n;
          return n;
        }
        return 0;
      }
      *pushToIndex(i, allowEmpty) {
        const s = this.buffer.slice(this.pos, i);
        if (s) {
          yield s;
          this.pos += s.length;
          return s.length;
        } else if (allowEmpty)
          yield "";
        return 0;
      }
      *pushIndicators() {
        let n = 0;
        loop: while (true) {
          switch (this.charAt(0)) {
            case "!":
              n += yield* this.pushTag();
              n += yield* this.pushSpaces(true);
              continue loop;
            case "&":
              n += yield* this.pushUntil(isNotAnchorChar);
              n += yield* this.pushSpaces(true);
              continue loop;
            case "-":
            // this is an error
            case "?":
            // this is an error outside flow collections
            case ":": {
              const inFlow = this.flowLevel > 0;
              const ch1 = this.charAt(1);
              if (isEmpty(ch1) || inFlow && flowIndicatorChars.has(ch1)) {
                if (!inFlow)
                  this.indentNext = this.indentValue + 1;
                else if (this.flowKey)
                  this.flowKey = false;
                n += yield* this.pushCount(1);
                n += yield* this.pushSpaces(true);
                continue loop;
              }
            }
          }
          break loop;
        }
        return n;
      }
      *pushTag() {
        if (this.charAt(1) === "<") {
          let i = this.pos + 2;
          let ch = this.buffer[i];
          while (!isEmpty(ch) && ch !== ">")
            ch = this.buffer[++i];
          return yield* this.pushToIndex(ch === ">" ? i + 1 : i, false);
        } else {
          let i = this.pos + 1;
          let ch = this.buffer[i];
          while (ch) {
            if (tagChars.has(ch))
              ch = this.buffer[++i];
            else if (ch === "%" && hexDigits.has(this.buffer[i + 1]) && hexDigits.has(this.buffer[i + 2])) {
              ch = this.buffer[i += 3];
            } else
              break;
          }
          return yield* this.pushToIndex(i, false);
        }
      }
      *pushNewline() {
        const ch = this.buffer[this.pos];
        if (ch === "\n")
          return yield* this.pushCount(1);
        else if (ch === "\r" && this.charAt(1) === "\n")
          return yield* this.pushCount(2);
        else
          return 0;
      }
      *pushSpaces(allowTabs) {
        let i = this.pos - 1;
        let ch;
        do {
          ch = this.buffer[++i];
        } while (ch === " " || allowTabs && ch === "	");
        const n = i - this.pos;
        if (n > 0) {
          yield this.buffer.substr(this.pos, n);
          this.pos = i;
        }
        return n;
      }
      *pushUntil(test) {
        let i = this.pos;
        let ch = this.buffer[i];
        while (!test(ch))
          ch = this.buffer[++i];
        return yield* this.pushToIndex(i, false);
      }
    };
    exports.Lexer = Lexer;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/parse/line-counter.js
var require_line_counter = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/parse/line-counter.js"(exports) {
    "use strict";
    var LineCounter = class {
      constructor() {
        this.lineStarts = [];
        this.addNewLine = (offset) => this.lineStarts.push(offset);
        this.linePos = (offset) => {
          let low = 0;
          let high = this.lineStarts.length;
          while (low < high) {
            const mid = low + high >> 1;
            if (this.lineStarts[mid] < offset)
              low = mid + 1;
            else
              high = mid;
          }
          if (this.lineStarts[low] === offset)
            return { line: low + 1, col: 1 };
          if (low === 0)
            return { line: 0, col: offset };
          const start = this.lineStarts[low - 1];
          return { line: low, col: offset - start + 1 };
        };
      }
    };
    exports.LineCounter = LineCounter;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/parse/parser.js
var require_parser = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/parse/parser.js"(exports) {
    "use strict";
    var node_process = __require("process");
    var cst = require_cst();
    var lexer = require_lexer();
    function includesToken(list, type) {
      for (let i = 0; i < list.length; ++i)
        if (list[i].type === type)
          return true;
      return false;
    }
    function findNonEmptyIndex(list) {
      for (let i = 0; i < list.length; ++i) {
        switch (list[i].type) {
          case "space":
          case "comment":
          case "newline":
            break;
          default:
            return i;
        }
      }
      return -1;
    }
    function isFlowToken(token) {
      switch (token?.type) {
        case "alias":
        case "scalar":
        case "single-quoted-scalar":
        case "double-quoted-scalar":
        case "flow-collection":
          return true;
        default:
          return false;
      }
    }
    function getPrevProps(parent) {
      switch (parent.type) {
        case "document":
          return parent.start;
        case "block-map": {
          const it = parent.items[parent.items.length - 1];
          return it.sep ?? it.start;
        }
        case "block-seq":
          return parent.items[parent.items.length - 1].start;
        /* istanbul ignore next should not happen */
        default:
          return [];
      }
    }
    function getFirstKeyStartProps(prev) {
      if (prev.length === 0)
        return [];
      let i = prev.length;
      loop: while (--i >= 0) {
        switch (prev[i].type) {
          case "doc-start":
          case "explicit-key-ind":
          case "map-value-ind":
          case "seq-item-ind":
          case "newline":
            break loop;
        }
      }
      while (prev[++i]?.type === "space") {
      }
      return prev.splice(i, prev.length);
    }
    function arrayPushArray(target, source) {
      if (source.length < 1e5)
        Array.prototype.push.apply(target, source);
      else
        for (let i = 0; i < source.length; ++i)
          target.push(source[i]);
    }
    function fixFlowSeqItems(fc) {
      if (fc.start.type === "flow-seq-start") {
        for (const it of fc.items) {
          if (it.sep && !it.value && !includesToken(it.start, "explicit-key-ind") && !includesToken(it.sep, "map-value-ind")) {
            if (it.key)
              it.value = it.key;
            delete it.key;
            if (isFlowToken(it.value)) {
              if (it.value.end)
                arrayPushArray(it.value.end, it.sep);
              else
                it.value.end = it.sep;
            } else
              arrayPushArray(it.start, it.sep);
            delete it.sep;
          }
        }
      }
    }
    var Parser = class {
      /**
       * @param onNewLine - If defined, called separately with the start position of
       *   each new line (in `parse()`, including the start of input).
       */
      constructor(onNewLine) {
        this.atNewLine = true;
        this.atScalar = false;
        this.indent = 0;
        this.offset = 0;
        this.onKeyLine = false;
        this.stack = [];
        this.source = "";
        this.type = "";
        this.lexer = new lexer.Lexer();
        this.onNewLine = onNewLine;
      }
      /**
       * Parse `source` as a YAML stream.
       * If `incomplete`, a part of the last line may be left as a buffer for the next call.
       *
       * Errors are not thrown, but yielded as `{ type: 'error', message }` tokens.
       *
       * @returns A generator of tokens representing each directive, document, and other structure.
       */
      *parse(source, incomplete = false) {
        if (this.onNewLine && this.offset === 0)
          this.onNewLine(0);
        for (const lexeme of this.lexer.lex(source, incomplete))
          yield* this.next(lexeme);
        if (!incomplete)
          yield* this.end();
      }
      /**
       * Advance the parser by the `source` of one lexical token.
       */
      *next(source) {
        this.source = source;
        if (node_process.env.LOG_TOKENS)
          console.log("|", cst.prettyToken(source));
        if (this.atScalar) {
          this.atScalar = false;
          yield* this.step();
          this.offset += source.length;
          return;
        }
        const type = cst.tokenType(source);
        if (!type) {
          const message = `Not a YAML token: ${source}`;
          yield* this.pop({ type: "error", offset: this.offset, message, source });
          this.offset += source.length;
        } else if (type === "scalar") {
          this.atNewLine = false;
          this.atScalar = true;
          this.type = "scalar";
        } else {
          this.type = type;
          yield* this.step();
          switch (type) {
            case "newline":
              this.atNewLine = true;
              this.indent = 0;
              if (this.onNewLine)
                this.onNewLine(this.offset + source.length);
              break;
            case "space":
              if (this.atNewLine && source[0] === " ")
                this.indent += source.length;
              break;
            case "explicit-key-ind":
            case "map-value-ind":
            case "seq-item-ind":
              if (this.atNewLine)
                this.indent += source.length;
              break;
            case "doc-mode":
            case "flow-error-end":
              return;
            default:
              this.atNewLine = false;
          }
          this.offset += source.length;
        }
      }
      /** Call at end of input to push out any remaining constructions */
      *end() {
        while (this.stack.length > 0)
          yield* this.pop();
      }
      get sourceToken() {
        const st = {
          type: this.type,
          offset: this.offset,
          indent: this.indent,
          source: this.source
        };
        return st;
      }
      *step() {
        const top = this.peek(1);
        if (this.type === "doc-end" && top?.type !== "doc-end") {
          while (this.stack.length > 0)
            yield* this.pop();
          this.stack.push({
            type: "doc-end",
            offset: this.offset,
            source: this.source
          });
          return;
        }
        if (!top)
          return yield* this.stream();
        switch (top.type) {
          case "document":
            return yield* this.document(top);
          case "alias":
          case "scalar":
          case "single-quoted-scalar":
          case "double-quoted-scalar":
            return yield* this.scalar(top);
          case "block-scalar":
            return yield* this.blockScalar(top);
          case "block-map":
            return yield* this.blockMap(top);
          case "block-seq":
            return yield* this.blockSequence(top);
          case "flow-collection":
            return yield* this.flowCollection(top);
          case "doc-end":
            return yield* this.documentEnd(top);
        }
        yield* this.pop();
      }
      peek(n) {
        return this.stack[this.stack.length - n];
      }
      *pop(error) {
        const token = error ?? this.stack.pop();
        if (!token) {
          const message = "Tried to pop an empty stack";
          yield { type: "error", offset: this.offset, source: "", message };
        } else if (this.stack.length === 0) {
          yield token;
        } else {
          const top = this.peek(1);
          if (token.type === "block-scalar") {
            token.indent = "indent" in top ? top.indent : 0;
          } else if (token.type === "flow-collection" && top.type === "document") {
            token.indent = 0;
          }
          if (token.type === "flow-collection")
            fixFlowSeqItems(token);
          switch (top.type) {
            case "document":
              top.value = token;
              break;
            case "block-scalar":
              top.props.push(token);
              break;
            case "block-map": {
              const it = top.items[top.items.length - 1];
              if (it.value) {
                top.items.push({ start: [], key: token, sep: [] });
                this.onKeyLine = true;
                return;
              } else if (it.sep) {
                it.value = token;
              } else {
                Object.assign(it, { key: token, sep: [] });
                this.onKeyLine = !it.explicitKey;
                return;
              }
              break;
            }
            case "block-seq": {
              const it = top.items[top.items.length - 1];
              if (it.value)
                top.items.push({ start: [], value: token });
              else
                it.value = token;
              break;
            }
            case "flow-collection": {
              const it = top.items[top.items.length - 1];
              if (!it || it.value)
                top.items.push({ start: [], key: token, sep: [] });
              else if (it.sep)
                it.value = token;
              else
                Object.assign(it, { key: token, sep: [] });
              return;
            }
            /* istanbul ignore next should not happen */
            default:
              yield* this.pop();
              yield* this.pop(token);
          }
          if ((top.type === "document" || top.type === "block-map" || top.type === "block-seq") && (token.type === "block-map" || token.type === "block-seq")) {
            const last = token.items[token.items.length - 1];
            if (last && !last.sep && !last.value && last.start.length > 0 && findNonEmptyIndex(last.start) === -1 && (token.indent === 0 || last.start.every((st) => st.type !== "comment" || st.indent < token.indent))) {
              if (top.type === "document")
                top.end = last.start;
              else
                top.items.push({ start: last.start });
              token.items.splice(-1, 1);
            }
          }
        }
      }
      *stream() {
        switch (this.type) {
          case "directive-line":
            yield { type: "directive", offset: this.offset, source: this.source };
            return;
          case "byte-order-mark":
          case "space":
          case "comment":
          case "newline":
            yield this.sourceToken;
            return;
          case "doc-mode":
          case "doc-start": {
            const doc = {
              type: "document",
              offset: this.offset,
              start: []
            };
            if (this.type === "doc-start")
              doc.start.push(this.sourceToken);
            this.stack.push(doc);
            return;
          }
        }
        yield {
          type: "error",
          offset: this.offset,
          message: `Unexpected ${this.type} token in YAML stream`,
          source: this.source
        };
      }
      *document(doc) {
        if (doc.value)
          return yield* this.lineEnd(doc);
        switch (this.type) {
          case "doc-start": {
            if (findNonEmptyIndex(doc.start) !== -1) {
              yield* this.pop();
              yield* this.step();
            } else
              doc.start.push(this.sourceToken);
            return;
          }
          case "anchor":
          case "tag":
          case "space":
          case "comment":
          case "newline":
            doc.start.push(this.sourceToken);
            return;
        }
        const bv = this.startBlockValue(doc);
        if (bv)
          this.stack.push(bv);
        else {
          yield {
            type: "error",
            offset: this.offset,
            message: `Unexpected ${this.type} token in YAML document`,
            source: this.source
          };
        }
      }
      *scalar(scalar) {
        if (this.type === "map-value-ind") {
          const prev = getPrevProps(this.peek(2));
          const start = getFirstKeyStartProps(prev);
          let sep2;
          if (scalar.end) {
            sep2 = scalar.end;
            sep2.push(this.sourceToken);
            delete scalar.end;
          } else
            sep2 = [this.sourceToken];
          const map = {
            type: "block-map",
            offset: scalar.offset,
            indent: scalar.indent,
            items: [{ start, key: scalar, sep: sep2 }]
          };
          this.onKeyLine = true;
          this.stack[this.stack.length - 1] = map;
        } else
          yield* this.lineEnd(scalar);
      }
      *blockScalar(scalar) {
        switch (this.type) {
          case "space":
          case "comment":
          case "newline":
            scalar.props.push(this.sourceToken);
            return;
          case "scalar":
            scalar.source = this.source;
            this.atNewLine = true;
            this.indent = 0;
            if (this.onNewLine) {
              let nl = this.source.indexOf("\n") + 1;
              while (nl !== 0) {
                this.onNewLine(this.offset + nl);
                nl = this.source.indexOf("\n", nl) + 1;
              }
            }
            yield* this.pop();
            break;
          /* istanbul ignore next should not happen */
          default:
            yield* this.pop();
            yield* this.step();
        }
      }
      *blockMap(map) {
        const it = map.items[map.items.length - 1];
        switch (this.type) {
          case "newline":
            this.onKeyLine = false;
            if (it.value) {
              const end = "end" in it.value ? it.value.end : void 0;
              const last = Array.isArray(end) ? end[end.length - 1] : void 0;
              if (last?.type === "comment")
                end?.push(this.sourceToken);
              else
                map.items.push({ start: [this.sourceToken] });
            } else if (it.sep) {
              it.sep.push(this.sourceToken);
            } else {
              it.start.push(this.sourceToken);
            }
            return;
          case "space":
          case "comment":
            if (it.value) {
              map.items.push({ start: [this.sourceToken] });
            } else if (it.sep) {
              it.sep.push(this.sourceToken);
            } else {
              if (this.atIndentedComment(it.start, map.indent)) {
                const prev = map.items[map.items.length - 2];
                const end = prev?.value?.end;
                if (Array.isArray(end)) {
                  arrayPushArray(end, it.start);
                  end.push(this.sourceToken);
                  map.items.pop();
                  return;
                }
              }
              it.start.push(this.sourceToken);
            }
            return;
        }
        if (this.indent >= map.indent) {
          const atMapIndent = !this.onKeyLine && this.indent === map.indent;
          const atNextItem = atMapIndent && (it.sep || it.explicitKey) && this.type !== "seq-item-ind";
          let start = [];
          if (atNextItem && it.sep && !it.value) {
            const nl = [];
            for (let i = 0; i < it.sep.length; ++i) {
              const st = it.sep[i];
              switch (st.type) {
                case "newline":
                  nl.push(i);
                  break;
                case "space":
                  break;
                case "comment":
                  if (st.indent > map.indent)
                    nl.length = 0;
                  break;
                default:
                  nl.length = 0;
              }
            }
            if (nl.length >= 2)
              start = it.sep.splice(nl[1]);
          }
          switch (this.type) {
            case "anchor":
            case "tag":
              if (atNextItem || it.value) {
                start.push(this.sourceToken);
                map.items.push({ start });
                this.onKeyLine = true;
              } else if (it.sep) {
                it.sep.push(this.sourceToken);
              } else {
                it.start.push(this.sourceToken);
              }
              return;
            case "explicit-key-ind":
              if (!it.sep && !it.explicitKey) {
                it.start.push(this.sourceToken);
                it.explicitKey = true;
              } else if (atNextItem || it.value) {
                start.push(this.sourceToken);
                map.items.push({ start, explicitKey: true });
              } else {
                this.stack.push({
                  type: "block-map",
                  offset: this.offset,
                  indent: this.indent,
                  items: [{ start: [this.sourceToken], explicitKey: true }]
                });
              }
              this.onKeyLine = true;
              return;
            case "map-value-ind":
              if (it.explicitKey) {
                if (!it.sep) {
                  if (includesToken(it.start, "newline")) {
                    Object.assign(it, { key: null, sep: [this.sourceToken] });
                  } else {
                    const start2 = getFirstKeyStartProps(it.start);
                    this.stack.push({
                      type: "block-map",
                      offset: this.offset,
                      indent: this.indent,
                      items: [{ start: start2, key: null, sep: [this.sourceToken] }]
                    });
                  }
                } else if (it.value) {
                  map.items.push({ start: [], key: null, sep: [this.sourceToken] });
                } else if (includesToken(it.sep, "map-value-ind")) {
                  this.stack.push({
                    type: "block-map",
                    offset: this.offset,
                    indent: this.indent,
                    items: [{ start, key: null, sep: [this.sourceToken] }]
                  });
                } else if (isFlowToken(it.key) && !includesToken(it.sep, "newline")) {
                  const start2 = getFirstKeyStartProps(it.start);
                  const key = it.key;
                  const sep2 = it.sep;
                  sep2.push(this.sourceToken);
                  delete it.key;
                  delete it.sep;
                  this.stack.push({
                    type: "block-map",
                    offset: this.offset,
                    indent: this.indent,
                    items: [{ start: start2, key, sep: sep2 }]
                  });
                } else if (start.length > 0) {
                  it.sep = it.sep.concat(start, this.sourceToken);
                } else {
                  it.sep.push(this.sourceToken);
                }
              } else {
                if (!it.sep) {
                  Object.assign(it, { key: null, sep: [this.sourceToken] });
                } else if (it.value || atNextItem) {
                  map.items.push({ start, key: null, sep: [this.sourceToken] });
                } else if (includesToken(it.sep, "map-value-ind")) {
                  this.stack.push({
                    type: "block-map",
                    offset: this.offset,
                    indent: this.indent,
                    items: [{ start: [], key: null, sep: [this.sourceToken] }]
                  });
                } else {
                  it.sep.push(this.sourceToken);
                }
              }
              this.onKeyLine = true;
              return;
            case "alias":
            case "scalar":
            case "single-quoted-scalar":
            case "double-quoted-scalar": {
              const fs = this.flowScalar(this.type);
              if (atNextItem || it.value) {
                map.items.push({ start, key: fs, sep: [] });
                this.onKeyLine = true;
              } else if (it.sep) {
                this.stack.push(fs);
              } else {
                Object.assign(it, { key: fs, sep: [] });
                this.onKeyLine = true;
              }
              return;
            }
            default: {
              const bv = this.startBlockValue(map);
              if (bv) {
                if (bv.type === "block-seq") {
                  if (!it.explicitKey && it.sep && !includesToken(it.sep, "newline")) {
                    yield* this.pop({
                      type: "error",
                      offset: this.offset,
                      message: "Unexpected block-seq-ind on same line with key",
                      source: this.source
                    });
                    return;
                  }
                } else if (atMapIndent) {
                  map.items.push({ start });
                }
                this.stack.push(bv);
                return;
              }
            }
          }
        }
        yield* this.pop();
        yield* this.step();
      }
      *blockSequence(seq) {
        const it = seq.items[seq.items.length - 1];
        switch (this.type) {
          case "newline":
            if (it.value) {
              const end = "end" in it.value ? it.value.end : void 0;
              const last = Array.isArray(end) ? end[end.length - 1] : void 0;
              if (last?.type === "comment")
                end?.push(this.sourceToken);
              else
                seq.items.push({ start: [this.sourceToken] });
            } else
              it.start.push(this.sourceToken);
            return;
          case "space":
          case "comment":
            if (it.value)
              seq.items.push({ start: [this.sourceToken] });
            else {
              if (this.atIndentedComment(it.start, seq.indent)) {
                const prev = seq.items[seq.items.length - 2];
                const end = prev?.value?.end;
                if (Array.isArray(end)) {
                  arrayPushArray(end, it.start);
                  end.push(this.sourceToken);
                  seq.items.pop();
                  return;
                }
              }
              it.start.push(this.sourceToken);
            }
            return;
          case "anchor":
          case "tag":
            if (it.value || this.indent <= seq.indent)
              break;
            it.start.push(this.sourceToken);
            return;
          case "seq-item-ind":
            if (this.indent !== seq.indent)
              break;
            if (it.value || includesToken(it.start, "seq-item-ind"))
              seq.items.push({ start: [this.sourceToken] });
            else
              it.start.push(this.sourceToken);
            return;
        }
        if (this.indent > seq.indent) {
          const bv = this.startBlockValue(seq);
          if (bv) {
            this.stack.push(bv);
            return;
          }
        }
        yield* this.pop();
        yield* this.step();
      }
      *flowCollection(fc) {
        const it = fc.items[fc.items.length - 1];
        if (this.type === "flow-error-end") {
          let top;
          do {
            yield* this.pop();
            top = this.peek(1);
          } while (top?.type === "flow-collection");
        } else if (fc.end.length === 0) {
          switch (this.type) {
            case "comma":
            case "explicit-key-ind":
              if (!it || it.sep)
                fc.items.push({ start: [this.sourceToken] });
              else
                it.start.push(this.sourceToken);
              return;
            case "map-value-ind":
              if (!it || it.value)
                fc.items.push({ start: [], key: null, sep: [this.sourceToken] });
              else if (it.sep)
                it.sep.push(this.sourceToken);
              else
                Object.assign(it, { key: null, sep: [this.sourceToken] });
              return;
            case "space":
            case "comment":
            case "newline":
            case "anchor":
            case "tag":
              if (!it || it.value)
                fc.items.push({ start: [this.sourceToken] });
              else if (it.sep)
                it.sep.push(this.sourceToken);
              else
                it.start.push(this.sourceToken);
              return;
            case "alias":
            case "scalar":
            case "single-quoted-scalar":
            case "double-quoted-scalar": {
              const fs = this.flowScalar(this.type);
              if (!it || it.value)
                fc.items.push({ start: [], key: fs, sep: [] });
              else if (it.sep)
                this.stack.push(fs);
              else
                Object.assign(it, { key: fs, sep: [] });
              return;
            }
            case "flow-map-end":
            case "flow-seq-end":
              fc.end.push(this.sourceToken);
              return;
          }
          const bv = this.startBlockValue(fc);
          if (bv)
            this.stack.push(bv);
          else {
            yield* this.pop();
            yield* this.step();
          }
        } else {
          const parent = this.peek(2);
          if (parent.type === "block-map" && (this.type === "map-value-ind" && parent.indent === fc.indent || this.type === "newline" && !parent.items[parent.items.length - 1].sep)) {
            yield* this.pop();
            yield* this.step();
          } else if (this.type === "map-value-ind" && parent.type !== "flow-collection") {
            const prev = getPrevProps(parent);
            const start = getFirstKeyStartProps(prev);
            fixFlowSeqItems(fc);
            const sep2 = fc.end.splice(1, fc.end.length);
            sep2.push(this.sourceToken);
            const map = {
              type: "block-map",
              offset: fc.offset,
              indent: fc.indent,
              items: [{ start, key: fc, sep: sep2 }]
            };
            this.onKeyLine = true;
            this.stack[this.stack.length - 1] = map;
          } else {
            yield* this.lineEnd(fc);
          }
        }
      }
      flowScalar(type) {
        if (this.onNewLine) {
          let nl = this.source.indexOf("\n") + 1;
          while (nl !== 0) {
            this.onNewLine(this.offset + nl);
            nl = this.source.indexOf("\n", nl) + 1;
          }
        }
        return {
          type,
          offset: this.offset,
          indent: this.indent,
          source: this.source
        };
      }
      startBlockValue(parent) {
        switch (this.type) {
          case "alias":
          case "scalar":
          case "single-quoted-scalar":
          case "double-quoted-scalar":
            return this.flowScalar(this.type);
          case "block-scalar-header":
            return {
              type: "block-scalar",
              offset: this.offset,
              indent: this.indent,
              props: [this.sourceToken],
              source: ""
            };
          case "flow-map-start":
          case "flow-seq-start":
            return {
              type: "flow-collection",
              offset: this.offset,
              indent: this.indent,
              start: this.sourceToken,
              items: [],
              end: []
            };
          case "seq-item-ind":
            return {
              type: "block-seq",
              offset: this.offset,
              indent: this.indent,
              items: [{ start: [this.sourceToken] }]
            };
          case "explicit-key-ind": {
            this.onKeyLine = true;
            const prev = getPrevProps(parent);
            const start = getFirstKeyStartProps(prev);
            start.push(this.sourceToken);
            return {
              type: "block-map",
              offset: this.offset,
              indent: this.indent,
              items: [{ start, explicitKey: true }]
            };
          }
          case "map-value-ind": {
            this.onKeyLine = true;
            const prev = getPrevProps(parent);
            const start = getFirstKeyStartProps(prev);
            return {
              type: "block-map",
              offset: this.offset,
              indent: this.indent,
              items: [{ start, key: null, sep: [this.sourceToken] }]
            };
          }
        }
        return null;
      }
      atIndentedComment(start, indent) {
        if (this.type !== "comment")
          return false;
        if (this.indent <= indent)
          return false;
        return start.every((st) => st.type === "newline" || st.type === "space");
      }
      *documentEnd(docEnd) {
        if (this.type !== "doc-mode") {
          if (docEnd.end)
            docEnd.end.push(this.sourceToken);
          else
            docEnd.end = [this.sourceToken];
          if (this.type === "newline")
            yield* this.pop();
        }
      }
      *lineEnd(token) {
        switch (this.type) {
          case "comma":
          case "doc-start":
          case "doc-end":
          case "flow-seq-end":
          case "flow-map-end":
          case "map-value-ind":
            yield* this.pop();
            yield* this.step();
            break;
          case "newline":
            this.onKeyLine = false;
          // fallthrough
          case "space":
          case "comment":
          default:
            if (token.end)
              token.end.push(this.sourceToken);
            else
              token.end = [this.sourceToken];
            if (this.type === "newline")
              yield* this.pop();
        }
      }
    };
    exports.Parser = Parser;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/public-api.js
var require_public_api = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/public-api.js"(exports) {
    "use strict";
    var composer = require_composer();
    var Document = require_Document();
    var errors = require_errors();
    var log2 = require_log();
    var identity = require_identity();
    var lineCounter = require_line_counter();
    var parser = require_parser();
    function parseOptions(options) {
      const prettyErrors = options.prettyErrors !== false;
      const lineCounter$1 = options.lineCounter || prettyErrors && new lineCounter.LineCounter() || null;
      return { lineCounter: lineCounter$1, prettyErrors };
    }
    function parseAllDocuments(source, options = {}) {
      const { lineCounter: lineCounter2, prettyErrors } = parseOptions(options);
      const parser$1 = new parser.Parser(lineCounter2?.addNewLine);
      const composer$1 = new composer.Composer(options);
      const docs = Array.from(composer$1.compose(parser$1.parse(source)));
      if (prettyErrors && lineCounter2)
        for (const doc of docs) {
          doc.errors.forEach(errors.prettifyError(source, lineCounter2));
          doc.warnings.forEach(errors.prettifyError(source, lineCounter2));
        }
      if (docs.length > 0)
        return docs;
      return Object.assign([], { empty: true }, composer$1.streamInfo());
    }
    function parseDocument(source, options = {}) {
      const { lineCounter: lineCounter2, prettyErrors } = parseOptions(options);
      const parser$1 = new parser.Parser(lineCounter2?.addNewLine);
      const composer$1 = new composer.Composer(options);
      let doc = null;
      for (const _doc of composer$1.compose(parser$1.parse(source), true, source.length)) {
        if (!doc)
          doc = _doc;
        else if (doc.options.logLevel !== "silent") {
          doc.errors.push(new errors.YAMLParseError(_doc.range.slice(0, 2), "MULTIPLE_DOCS", "Source contains multiple documents; please use YAML.parseAllDocuments()"));
          break;
        }
      }
      if (prettyErrors && lineCounter2) {
        doc.errors.forEach(errors.prettifyError(source, lineCounter2));
        doc.warnings.forEach(errors.prettifyError(source, lineCounter2));
      }
      return doc;
    }
    function parse8(src, reviver, options) {
      let _reviver = void 0;
      if (typeof reviver === "function") {
        _reviver = reviver;
      } else if (options === void 0 && reviver && typeof reviver === "object") {
        options = reviver;
      }
      const doc = parseDocument(src, options);
      if (!doc)
        return null;
      doc.warnings.forEach((warning) => log2.warn(doc.options.logLevel, warning));
      if (doc.errors.length > 0) {
        if (doc.options.logLevel !== "silent")
          throw doc.errors[0];
        else
          doc.errors = [];
      }
      return doc.toJS(Object.assign({ reviver: _reviver }, options));
    }
    function stringify5(value, replacer, options) {
      let _replacer = null;
      if (typeof replacer === "function" || Array.isArray(replacer)) {
        _replacer = replacer;
      } else if (options === void 0 && replacer) {
        options = replacer;
      }
      if (typeof options === "string")
        options = options.length;
      if (typeof options === "number") {
        const indent = Math.round(options);
        options = indent < 1 ? void 0 : indent > 8 ? { indent: 8 } : { indent };
      }
      if (value === void 0) {
        const { keepUndefined } = options ?? replacer ?? {};
        if (!keepUndefined)
          return void 0;
      }
      if (identity.isDocument(value) && !_replacer)
        return value.toString(options);
      return new Document.Document(value, _replacer, options).toString(options);
    }
    exports.parse = parse8;
    exports.parseAllDocuments = parseAllDocuments;
    exports.parseDocument = parseDocument;
    exports.stringify = stringify5;
  }
});

// node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/index.js
var require_dist = __commonJS({
  "node_modules/.pnpm/yaml@2.9.1/node_modules/yaml/dist/index.js"(exports) {
    "use strict";
    var composer = require_composer();
    var Document = require_Document();
    var Schema = require_Schema();
    var errors = require_errors();
    var Alias = require_Alias();
    var identity = require_identity();
    var Pair = require_Pair();
    var Scalar = require_Scalar();
    var YAMLMap = require_YAMLMap();
    var YAMLSeq = require_YAMLSeq();
    var cst = require_cst();
    var lexer = require_lexer();
    var lineCounter = require_line_counter();
    var parser = require_parser();
    var publicApi = require_public_api();
    var visit = require_visit();
    exports.Composer = composer.Composer;
    exports.Document = Document.Document;
    exports.Schema = Schema.Schema;
    exports.YAMLError = errors.YAMLError;
    exports.YAMLParseError = errors.YAMLParseError;
    exports.YAMLWarning = errors.YAMLWarning;
    exports.Alias = Alias.Alias;
    exports.isAlias = identity.isAlias;
    exports.isCollection = identity.isCollection;
    exports.isDocument = identity.isDocument;
    exports.isMap = identity.isMap;
    exports.isNode = identity.isNode;
    exports.isPair = identity.isPair;
    exports.isScalar = identity.isScalar;
    exports.isSeq = identity.isSeq;
    exports.Pair = Pair.Pair;
    exports.Scalar = Scalar.Scalar;
    exports.YAMLMap = YAMLMap.YAMLMap;
    exports.YAMLSeq = YAMLSeq.YAMLSeq;
    exports.CST = cst;
    exports.Lexer = lexer.Lexer;
    exports.LineCounter = lineCounter.LineCounter;
    exports.Parser = parser.Parser;
    exports.parse = publicApi.parse;
    exports.parseAllDocuments = publicApi.parseAllDocuments;
    exports.parseDocument = publicApi.parseDocument;
    exports.stringify = publicApi.stringify;
    exports.visit = visit.visit;
    exports.visitAsync = visit.visitAsync;
  }
});

// engine/src/cli.ts
var import_yaml7 = __toESM(require_dist(), 1);
import { execSync as execSync3 } from "node:child_process";
import { existsSync as existsSync11, mkdirSync as mkdirSync7, readFileSync as readFileSync10, writeFileSync as writeFileSync8 } from "node:fs";
import { basename, dirname as dirname3, join as join12, resolve as resolve2 } from "node:path";

// engine/src/catalog.ts
var import_yaml = __toESM(require_dist(), 1);
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
var LEVELS = ["required", "recommended", "optional"];
var SIZES = ["XS", "S", "M", "L", "XL"];
var SCALES = ["pages", "entities", "languages", "markets", "integrations"];
var CHECK_TYPES = ["file_exists", "route_exists", "grep", "json_key", "command", "html", "sql", "maps", "manual"];
function defaultCatalogDir() {
  if (process.env.MEP_CATALOG) return resolve(process.env.MEP_CATALOG);
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 4; i++) {
    if (existsSync(join(dir, "catalog", "dimensions.yaml"))) return join(dir, "catalog");
    dir = dirname(dir);
  }
  throw new Error("mep: catalog not found (set MEP_CATALOG)");
}
function readYaml(path) {
  return (0, import_yaml.parse)(readFileSync(path, "utf8"));
}
function readYamlDir(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith(".yaml")).sort().flatMap((f) => readYaml(join(dir, f)) ?? []);
}
function loadCatalog(dir = defaultCatalogDir()) {
  const presetsDir = join(dir, "presets");
  const presets = {};
  if (existsSync(presetsDir)) {
    for (const f of readdirSync(presetsDir).filter((f2) => f2.endsWith(".yaml")).sort()) {
      presets[f.replace(/\.yaml$/, "")] = readYaml(join(presetsDir, f));
    }
  }
  const catalog = {
    version: readFileSync(join(dir, "VERSION"), "utf8").trim(),
    dir,
    dimensions: readYaml(join(dir, "dimensions.yaml")),
    items: [...readYamlDir(join(dir, "items")), ...readYamlDir(join(dir, "markets"))],
    stackRules: readYaml(join(dir, "stack-rules.yaml")) ?? [],
    presets,
    sensitivePaths: readYaml(join(dir, "sensitive.yaml")).paths
  };
  const errors = validateCatalog(catalog);
  if (errors.length) throw new Error(`mep: invalid catalog
- ${errors.join("\n- ")}`);
  return catalog;
}
function dimensionValues(dims, key) {
  if (key === "markets") return [...dims.markets, ...Object.values(dims.market_sublevels).flat()];
  return dims[key] ?? [];
}
function matcherValues(m) {
  if (typeof m === "string") return [m];
  if (Array.isArray(m)) return m;
  return [...m.any ?? [], ...m.all ?? [], ...m.none ?? []];
}
function validateCondition(cond, dims, where) {
  if ("all" in cond && Array.isArray(cond.all)) return cond.all.flatMap((c) => validateCondition(c, dims, where));
  if ("any" in cond && Array.isArray(cond.any)) return cond.any.flatMap((c) => validateCondition(c, dims, where));
  if ("not" in cond) return validateCondition(cond.not, dims, where);
  const errors = [];
  for (const [key, matcher] of Object.entries(cond)) {
    if (key === "signals") {
      for (const [signal, value] of Object.entries(matcher)) {
        const def = dims.signals[signal];
        if (!def) errors.push(`${where}: unknown signal "${signal}"`);
        else if (!def.values.includes(value)) errors.push(`${where}: invalid value for ${signal}: ${value}`);
      }
      continue;
    }
    if (!["type", "capabilities", "markets", "audience", "context"].includes(key)) {
      errors.push(`${where}: unknown dimension "${key}"`);
      continue;
    }
    const valid = dimensionValues(dims, key);
    for (const v of matcherValues(matcher)) {
      if (!valid.includes(v)) errors.push(`${where}: "${v}" is not a valid ${key}`);
    }
  }
  return errors;
}
function validateCheck(check, where) {
  if (!CHECK_TYPES.includes(check.type)) return [`${where}: unknown verify type "${check.type}"`];
  const required = {
    file_exists: ["path"],
    route_exists: ["path"],
    grep: ["pattern", "glob"],
    json_key: ["file", "key"],
    command: ["run"],
    html: ["rule"],
    sql: ["rule"],
    maps: ["rule"],
    manual: ["prompt"]
  };
  const errors = required[check.type].filter((f) => check[f] === void 0).map((f) => `${where}: verify ${check.type} needs "${f}"`);
  if (check.type === "grep") {
    try {
      new RegExp(check.pattern, check.flags);
    } catch {
      errors.push(`${where}: invalid regex ${check.pattern}`);
    }
  }
  return errors;
}
function validateCatalog(catalog) {
  const { dimensions: dims } = catalog;
  const errors = [];
  const ids = /* @__PURE__ */ new Set();
  for (const item of catalog.items) {
    const where = `item ${item.id ?? "(no id)"}`;
    if (!item.id) errors.push(`${where}: missing id`);
    if (ids.has(item.id)) errors.push(`${where}: duplicate id`);
    ids.add(item.id);
    for (const f of ["title", "category", "why", "how", "since"]) {
      if (!item[f]) errors.push(`${where}: missing ${f}`);
    }
    if (!LEVELS.includes(item.level)) errors.push(`${where}: invalid level ${item.level}`);
    if (!dims.phases.includes(item.phase)) errors.push(`${where}: invalid phase ${item.phase}`);
    if (!item.effort || !SIZES.includes(item.effort.size) || item.effort.hours?.length !== 2) {
      errors.push(`${where}: invalid effort`);
    } else if (item.effort.scales_with && !SCALES.includes(item.effort.scales_with)) {
      errors.push(`${where}: invalid scales_with`);
    }
    if (!Array.isArray(item.verify) || item.verify.length === 0) errors.push(`${where}: needs at least one verify`);
    else item.verify.forEach((c) => errors.push(...validateCheck(c, where)));
    if (item.when) errors.push(...validateCondition(item.when, dims, where));
    for (const o of item.level_overrides ?? []) {
      if (!LEVELS.includes(o.level)) errors.push(`${where}: invalid override level`);
      errors.push(...validateCondition(o.when, dims, where));
    }
  }
  for (const item of catalog.items) {
    for (const ref of [...item.depends_on ?? [], ...item.conflicts_with ?? []]) {
      if (!ids.has(ref)) errors.push(`item ${item.id}: references unknown item ${ref}`);
    }
  }
  for (const rule of catalog.stackRules) {
    if (!rule.why) errors.push(`stack rule ${rule.id}: missing why`);
    if (rule.when) errors.push(...validateCondition(rule.when, dims, `stack rule ${rule.id}`));
  }
  return errors;
}
function validateProfile(profile, catalog) {
  const dims = catalog.dimensions;
  const errors = [];
  const markets = dimensionValues(dims, "markets");
  if (!dims.type.includes(profile.type)) errors.push(`type "${profile.type}" is not valid`);
  if (!dims.context.includes(profile.context)) errors.push(`context "${profile.context}" is not valid`);
  for (const c of profile.capabilities) if (!dims.capabilities.includes(c)) errors.push(`capability "${c}" is not valid`);
  for (const a of profile.audience) if (!dims.audience.includes(a)) errors.push(`audience "${a}" is not valid`);
  for (const m of profile.markets) if (!markets.includes(m)) errors.push(`market "${m}" is not valid`);
  for (const [k, v] of Object.entries(profile.signals)) {
    const def = dims.signals[k];
    if (!def) errors.push(`signal "${k}" is not valid`);
    else if (!def.values.includes(v)) errors.push(`signal ${k}: "${v}" is not valid`);
  }
  for (const p of [...profile.phase.closed, profile.phase.active]) {
    if (!dims.phases.includes(p)) errors.push(`phase "${p}" is not valid`);
  }
  return errors;
}

// engine/src/deploy.ts
var PROD = [
  /\bvercel\b(?=[^|;&]*\s--prod\b)/,
  /\bvercel\s+(?:deploy\s+)?--prod\b/,
  /\bvercel\s+promote\b/,
  /\bnetlify\s+deploy\b(?=[^|;&]*\s--prod\b)/,
  /\bgit\s+push\b[^|;&]*\s(?:\S+\s+)?(?:HEAD:)?(?:refs\/heads\/)?(?:main|master)\b/
];
var PREVIEW = [/\bvercel(?:\s+deploy)?(?:\s|$)/, /\bnetlify\s+deploy\b/];
function deployKind(command, currentBranch2) {
  const cmd = command.trim();
  if (PROD.some((re) => re.test(cmd))) return "prod";
  if (currentBranch2 && /^(main|master)$/.test(currentBranch2) && /\bgit\s+push\b(?![^|;&]*\s(?:-d|--delete)\b)/.test(cmd)) {
    const args = cmd.replace(/^.*?\bgit\s+push\b/, "").split(/[|;&]/)[0].trim().split(/\s+/).filter((a) => a && !a.startsWith("-"));
    if (args.length <= 1) return "prod";
  }
  if (/\bvercel\s+(env|link|login|logout|pull|whoami|ls|list|logs|inspect|domains|dns|secrets|project|teams|--version|-v|help)\b/.test(cmd)) return void 0;
  if (PREVIEW.some((re) => re.test(cmd))) return "preview";
  return void 0;
}
function mayDeploy(command) {
  return /\b(vercel|netlify|git\s+push)\b/.test(command);
}

// engine/src/conditions.ts
function marketCovers(wanted, chosen) {
  return chosen === wanted || chosen.startsWith(`${wanted}:`);
}
function hasValue(values, wanted, isMarket) {
  return values.some((v) => isMarket ? marketCovers(wanted, v) : v === wanted);
}
function matchList(values, matcher, isMarket = false) {
  const has = (w) => hasValue(values, w, isMarket);
  if (typeof matcher === "string") return has(matcher);
  if (Array.isArray(matcher)) return matcher.every(has);
  if (matcher.all && !matcher.all.every(has)) return false;
  if (matcher.any && !matcher.any.some(has)) return false;
  if (matcher.none && matcher.none.some(has)) return false;
  return true;
}
function matchScalar(value, matcher) {
  if (typeof matcher === "string") return value === matcher;
  if (Array.isArray(matcher)) return matcher.includes(value);
  if (matcher.any && !matcher.any.includes(value)) return false;
  if (matcher.all && !matcher.all.every((m) => m === value)) return false;
  if (matcher.none && matcher.none.includes(value)) return false;
  return true;
}
function matchLeaf(leaf, profile) {
  if (leaf.type !== void 0 && !matchScalar(profile.type, leaf.type)) return false;
  if (leaf.context !== void 0 && !matchScalar(profile.context, leaf.context)) return false;
  if (leaf.capabilities !== void 0 && !matchList(profile.capabilities, leaf.capabilities)) return false;
  if (leaf.audience !== void 0 && !matchList(profile.audience, leaf.audience)) return false;
  if (leaf.markets !== void 0 && !matchList(profile.markets, leaf.markets, true)) return false;
  if (leaf.signals) {
    for (const [key, wanted] of Object.entries(leaf.signals)) {
      if (profile.signals[key] !== wanted) return false;
    }
  }
  return true;
}
function matches(condition, profile) {
  if (condition === void 0) return true;
  if ("all" in condition && Array.isArray(condition.all)) return condition.all.every((c) => matches(c, profile));
  if ("any" in condition && Array.isArray(condition.any)) return condition.any.some((c) => matches(c, profile));
  if ("not" in condition) return !matches(condition.not, profile);
  return matchLeaf(condition, profile);
}

// engine/src/types.ts
var LEVEL_RANK = { optional: 0, recommended: 1, required: 2 };
var LEVEL_ICON = { required: "\u{1F534}", recommended: "\u{1F7E1}", optional: "\u26AA" };

// engine/src/evaluate.ts
function effectiveLevel(item, profile) {
  let level = item.level;
  for (const o of item.level_overrides ?? []) {
    if (matches(o.when, profile) && LEVEL_RANK[o.level] > LEVEL_RANK[level]) level = o.level;
  }
  return level;
}
function evaluate(profile, catalog) {
  const phaseOrder = catalog.dimensions.phases;
  const skipped = new Map(profile.selections.recommended_skipped.map((s) => [s.id, s.reason]));
  const overridden = new Map(profile.selections.overrides.map((s) => [s.id, s.reason]));
  const optional = new Set(profile.selections.optional_added);
  const result = [];
  for (const item of catalog.items) {
    if (!matches(item.when, profile)) continue;
    const level = effectiveLevel(item, profile);
    let state = "active";
    let reason;
    if (level === "optional" && !optional.has(item.id)) state = "offered";
    else if (level === "recommended" && skipped.has(item.id)) {
      state = "skipped";
      reason = skipped.get(item.id);
    } else if (level === "required" && overridden.has(item.id) && !item.locked) {
      state = "overridden";
      reason = overridden.get(item.id);
    }
    result.push({ item, level, state, reason });
  }
  return result.sort(
    (a, b) => phaseOrder.indexOf(a.item.phase) - phaseOrder.indexOf(b.item.phase) || LEVEL_RANK[b.level] - LEVEL_RANK[a.level] || a.item.id.localeCompare(b.item.id)
  );
}
function warnings(evaluated) {
  const active = new Map(evaluated.filter((e) => e.state === "active").map((e) => [e.item.id, e]));
  const out = [];
  for (const e of active.values()) {
    for (const other of e.item.conflicts_with ?? []) {
      if (active.has(other) && e.item.id < other) {
        out.push({ kind: "conflict", message: `${e.item.id} y ${other} son incompatibles: desactiva uno con raz\xF3n` });
      }
    }
    for (const dep of e.item.depends_on ?? []) {
      if (!active.has(dep)) out.push({ kind: "dependency", message: `${e.item.id} depende de ${dep}, que no est\xE1 activo` });
    }
  }
  return out;
}
function stackGroups(decisions) {
  const groups = /* @__PURE__ */ new Map();
  for (const d of decisions) {
    const g = groups.get(d.rule) ?? { rule: d.rule, why: d.why, decisions: [] };
    g.decisions.push(d);
    groups.set(d.rule, g);
  }
  return [...groups.values()];
}
function stack(profile, catalog) {
  const out = /* @__PURE__ */ new Map();
  for (const rule of catalog.stackRules) {
    if (!matches(rule.when, profile)) continue;
    for (const [key, value] of Object.entries(rule.recommend)) {
      if (!out.has(key)) out.set(key, { key, value, why: rule.why, rule: rule.id, decided: false });
    }
  }
  for (const [key, value] of Object.entries(profile.stack.decided)) {
    const rec = out.get(key);
    out.set(key, {
      key,
      value,
      why: rec && rec.value === value ? rec.why : rec ? `Decidido en el perfil (la regla ${rec.rule} recomendaba ${rec.value}).` : "Decidido en el perfil.",
      rule: rec?.rule ?? "profile",
      decided: true
    });
  }
  return [...out.values()].sort((a, b) => a.key.localeCompare(b.key));
}
function diff(before, after, catalog) {
  const a = new Map(evaluate(before, catalog).map((e) => [e.item.id, e]));
  const b = new Map(evaluate(after, catalog).map((e) => [e.item.id, e]));
  const out = [];
  for (const [id, e] of b) {
    const prev = a.get(id);
    if (!prev) out.push({ id, title: e.item.title, change: "new", to: e.level });
    else if (LEVEL_RANK[e.level] > LEVEL_RANK[prev.level]) out.push({ id, title: e.item.title, change: "raised", from: prev.level, to: e.level });
    else if (LEVEL_RANK[e.level] < LEVEL_RANK[prev.level]) out.push({ id, title: e.item.title, change: "lowered", from: prev.level, to: e.level });
  }
  for (const [id, e] of a) if (!b.has(id)) out.push({ id, title: e.item.title, change: "removed", from: e.level });
  return out;
}

// engine/src/files.ts
import { existsSync as existsSync2, readdirSync as readdirSync2, readFileSync as readFileSync2, statSync } from "node:fs";
import { join as join2, relative, sep } from "node:path";
var IGNORED_DIRS = /* @__PURE__ */ new Set(["node_modules", ".git", ".next", ".vercel", ".turbo", ".mep", "dist", "build", "out", "coverage", ".astro", ".svelte-kit"]);
var MAX_FILE_BYTES = 1e6;
function globToRegExp(glob) {
  return new RegExp(`^${globSource(glob)}$`);
}
function globSource(glob) {
  let re = "";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === "*") {
      if (glob[i + 1] === "*") {
        const slash = glob[i + 2] === "/";
        re += slash ? "(?:.*/)?" : ".*";
        i += slash ? 2 : 1;
      } else re += "[^/]*";
    } else if (c === "?") re += "[^/]";
    else if (c === "{") {
      const { end, parts } = braceParts(glob, i);
      re += `(?:${parts.map(globSource).join("|")})`;
      i = end;
    } else re += escape(c);
  }
  return re;
}
function braceParts(glob, start) {
  const parts = [];
  let depth = 0;
  let from = start + 1;
  for (let i = start; i < glob.length; i++) {
    if (glob[i] === "{") depth++;
    else if (glob[i] === "}" && --depth === 0) {
      parts.push(glob.slice(from, i));
      return { end: i, parts };
    } else if (glob[i] === "," && depth === 1) {
      parts.push(glob.slice(from, i));
      from = i + 1;
    }
  }
  throw new Error(`glob con llave sin cerrar: ${glob}`);
}
function escape(s) {
  return s.replace(/[.+^$()|[\]\\]/g, "\\$&");
}
var walkCache = /* @__PURE__ */ new Map();
function listFiles(root, { includeIgnored = false } = {}) {
  const key = `${root}|${includeIgnored}`;
  const cached = walkCache.get(key);
  if (cached) return cached;
  const out = [];
  const walk = (dir) => {
    let entries;
    try {
      entries = readdirSync2(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const full = join2(dir, e.name);
      if (e.isDirectory()) {
        if (!includeIgnored && IGNORED_DIRS.has(e.name)) continue;
        walk(full);
      } else if (e.isFile()) out.push(relative(root, full).split(sep).join("/"));
    }
  };
  walk(root);
  out.sort();
  walkCache.set(key, out);
  return out;
}
function matchFiles(root, glob, exclude) {
  const re = globToRegExp(glob);
  const ex = exclude ? globToRegExp(exclude) : void 0;
  return listFiles(root).filter((f) => re.test(f) && !(ex && ex.test(f)));
}
function readText(root, file) {
  const full = join2(root, file);
  try {
    if (statSync(full).size > MAX_FILE_BYTES) return void 0;
    return readFileSync2(full, "utf8");
  } catch {
    return void 0;
  }
}
function exists(root, file) {
  return existsSync2(join2(root, file));
}
function parseJsonc(text) {
  let out = "";
  let inString = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      out += c;
      if (c === "\\") out += text[++i] ?? "";
      else if (c === '"') inString = false;
    } else if (c === '"') {
      inString = true;
      out += c;
    } else if (c === "/" && text[i + 1] === "/") {
      while (i < text.length && text[i] !== "\n") i++;
      out += "\n";
    } else if (c === "/" && text[i + 1] === "*") {
      i = text.indexOf("*/", i + 2) + 1;
      if (i === 0) break;
    } else out += c;
  }
  return JSON.parse(out.replace(/,(\s*[}\]])/g, "$1"));
}

// engine/src/gate.ts
import { execSync as execSync2 } from "node:child_process";
import { createHash as createHash2 } from "node:crypto";
import { existsSync as existsSync6, mkdirSync as mkdirSync3, readFileSync as readFileSync5, writeFileSync as writeFileSync4 } from "node:fs";
import { join as join7 } from "node:path";

// engine/src/profile.ts
var import_yaml2 = __toESM(require_dist(), 1);
import { existsSync as existsSync3, mkdirSync, readFileSync as readFileSync3, writeFileSync, appendFileSync } from "node:fs";
import { join as join3 } from "node:path";
var MEP_DIR = ".mep";
var PROFILE_FILE = join3(MEP_DIR, "profile.yaml");
function hasProfile(root) {
  return existsSync3(join3(root, PROFILE_FILE));
}
function emptyProfile(catalog) {
  const signals = {};
  for (const [k, def] of Object.entries(catalog.dimensions.signals)) signals[k] = def.default;
  return {
    version: 1,
    catalog_version: catalog.version,
    project: "",
    phase: { closed: [], active: catalog.dimensions.phases[0] },
    type: "landing",
    capabilities: [],
    markets: [],
    audience: [],
    context: "own-product",
    counts: {},
    signals,
    selections: { optional_added: [], recommended_skipped: [], overrides: [], manual_confirmed: [], grace: [] },
    stack: { decided: {} }
  };
}
function normalizeProfile(raw, catalog) {
  const base = emptyProfile(catalog);
  const profile = {
    ...base,
    ...raw,
    phase: { ...base.phase, ...raw.phase },
    counts: { ...raw.counts },
    signals: { ...base.signals, ...raw.signals },
    selections: { ...base.selections, ...raw.selections },
    stack: { decided: { ...raw.stack?.decided } },
    capabilities: [...raw.capabilities ?? []],
    markets: [...raw.markets ?? []],
    audience: [...raw.audience ?? []]
  };
  profile.phase.closed = [...profile.phase.closed ?? []];
  for (const key of ["optional_added", "recommended_skipped", "overrides", "manual_confirmed", "grace"]) {
    profile.selections[key] = [...profile.selections[key] ?? []];
  }
  return applyImplications(profile, catalog);
}
function applyImplications(profile, catalog) {
  if ((profile.counts.languages ?? 1) > 1 && !profile.capabilities.includes("i18n")) {
    profile.capabilities.push("i18n");
  }
  const implies = catalog.dimensions.implies;
  let changed = true;
  while (changed) {
    changed = false;
    for (const cap of [...profile.capabilities]) {
      const rule = implies[cap];
      if (!rule) continue;
      for (const extra of rule.capabilities ?? []) {
        if (!profile.capabilities.includes(extra)) {
          profile.capabilities.push(extra);
          changed = true;
        }
      }
      for (const [signal, value] of Object.entries(rule.signals ?? {})) {
        if (value === true && profile.signals[signal] !== true) profile.signals[signal] = true;
      }
    }
  }
  return profile;
}
function loadProfile(root, catalog) {
  const raw = (0, import_yaml2.parse)(readFileSync3(join3(root, PROFILE_FILE), "utf8"));
  return normalizeProfile(raw, catalog);
}
function saveProfile(root, profile) {
  mkdirSync(join3(root, MEP_DIR), { recursive: true });
  writeFileSync(join3(root, PROFILE_FILE), (0, import_yaml2.stringify)(profile, { lineWidth: 0 }));
}
function today() {
  return (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
}
function log(root, event, detail) {
  mkdirSync(join3(root, MEP_DIR), { recursive: true });
  appendFileSync(join3(root, MEP_DIR, "log"), `${(/* @__PURE__ */ new Date()).toISOString()} ${event} ${detail}
`);
}

// engine/src/verify.ts
import { execSync } from "node:child_process";

// engine/src/framework.ts
function readPackageJson(root) {
  const text = readText(root, "package.json");
  if (!text) return void 0;
  try {
    return parseJsonc(text);
  } catch {
    return void 0;
  }
}
function dependencies(root) {
  const pkg = readPackageJson(root);
  return /* @__PURE__ */ new Set([...Object.keys(pkg?.dependencies ?? {}), ...Object.keys(pkg?.devDependencies ?? {})]);
}
function detectFramework(root) {
  const deps = dependencies(root);
  if (deps.has("next")) return "nextjs";
  if (deps.has("astro")) return "astro";
  if (deps.has("vite") || deps.has("react")) return "vite-react";
  return "static";
}
var PAGE_EXT = "(tsx|jsx|ts|js|mdx|md)";
function cleanSegments(path) {
  return "/" + path.split("/").filter((s) => s && !/^\(.*\)$/.test(s) && !s.startsWith("@")).join("/");
}
function routeMatches(pattern, path) {
  if (pattern === path) return true;
  const p = pattern.split("/");
  const t = path.split("/");
  for (let i = 0; i < p.length; i++) {
    if (/^\[\[?\.\.\./.test(p[i])) return true;
    if (i >= t.length) return false;
    if (/^\[.*\]$/.test(p[i])) continue;
    if (p[i] !== t[i]) return false;
  }
  return p.length === t.length;
}
function nextRoutes(files) {
  const routes2 = [];
  for (const f of files) {
    const app = f.match(new RegExp(`^(?:src/)?app/(.*?)/?(page|route)\\.${PAGE_EXT}$`));
    if (app) routes2.push(cleanSegments(app[1]));
    const meta = f.match(/^(?:src\/)?app\/(.*?)(robots|sitemap|manifest)\.(ts|js)$/);
    if (meta) routes2.push(cleanSegments(`${meta[1]}${meta[2]}.${meta[2] === "manifest" ? "webmanifest" : meta[2] === "robots" ? "txt" : "xml"}`));
    if (/^(?:src\/)?app\/not-found\.(tsx|jsx|ts|js)$/.test(f)) routes2.push("/404");
    if (/^(?:src\/)?app\/(global-)?error\.(tsx|jsx|ts|js)$/.test(f)) routes2.push("/500");
    const pages = f.match(new RegExp(`^(?:src/)?pages/(.*?)(?:/index)?\\.${PAGE_EXT}$`));
    if (pages && !pages[1].startsWith("_")) routes2.push(cleanSegments(pages[1] === "index" ? "" : pages[1]));
    if (/^(?:src\/)?pages\/_error\.(tsx|jsx|ts|js)$/.test(f)) routes2.push("/500");
  }
  return routes2;
}
function astroRoutes(files) {
  return files.map((f) => f.match(/^src\/pages\/(.*?)(?:\/?index)?\.(astro|md|mdx|ts|js|html)$/)).filter((m) => m !== null).map((m) => cleanSegments(m[1]));
}
function viteRoutes(root, files) {
  const routes2 = [];
  for (const f of files) {
    const tanstack = f.match(/^src\/routes\/(.*?)(?:\/?index)?\.(tsx|jsx)$/);
    if (tanstack && !tanstack[1].startsWith("__")) routes2.push(cleanSegments(tanstack[1].replace(/\./g, "/").replace(/\$(\w+)/g, "[$1]")));
    if (!/\.(tsx|jsx|ts|js)$/.test(f) || !f.startsWith("src/")) continue;
    const text = readText(root, f) ?? "";
    for (const m of text.matchAll(/path\s*[:=]\s*\{?\s*["'`]([^"'`]+)["'`]/g)) {
      routes2.push(m[1] === "*" ? "/404" : cleanSegments(m[1].replace(/:(\w+)/g, "[$1]")));
    }
  }
  return routes2;
}
function staticRoutes(files) {
  return files.map((f) => f.match(/^(?:public\/|static\/|src\/)?(.*?)(?:\/?index)?\.html$/)).filter((m) => m !== null).map((m) => cleanSegments(m[1]));
}
function routes(root, framework = detectFramework(root)) {
  const files = listFiles(root);
  const byFramework = {
    nextjs: () => nextRoutes(files),
    astro: () => astroRoutes(files),
    "vite-react": () => viteRoutes(root, files),
    static: () => staticRoutes(files)
  }[framework]();
  return [.../* @__PURE__ */ new Set([...byFramework, ...staticRoutes(files)])].sort();
}
function routeExists(root, path) {
  const clean = path.replace(/\/$/, "") || "/";
  if (exists(root, `public${clean}`) || exists(root, `static${clean}`)) return true;
  return routes(root).some((r) => routeMatches(r, clean));
}

// engine/src/html.ts
import { existsSync as existsSync4 } from "node:fs";
import { join as join4 } from "node:path";
var OUTPUT_DIRS = ["out", ".vercel/output/static", ".next/server/app", ".next/server/pages", "dist", "build"];
function buildOutputDir(root) {
  if (process.env.MEP_BUILD_DIR) return process.env.MEP_BUILD_DIR;
  return OUTPUT_DIRS.find((d) => existsSync4(join4(root, d)));
}
function loadPages(root) {
  const dir = buildOutputDir(root);
  if (!dir) return void 0;
  const base = join4(root, dir);
  return listFiles(base, { includeIgnored: true }).filter((f) => f.endsWith(".html") && !/(^|\/)_(not-found|error|global-error)/.test(f)).map((f) => ({ file: `${dir}/${f}`, html: readText(base, f) ?? "" }));
}
function isErrorPage(file) {
  return /(^|\/)(404|500)(\/index)?\.html$/.test(file);
}
function isNoindex(html) {
  return /<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(html);
}
function attr(tag, name) {
  return tag.match(new RegExp(`\\s${name}\\s*=\\s*["']([^"']*)["']`, "i"))?.[1];
}
function tags(html, name) {
  return [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, "gi"))].map((m) => m[0]);
}
function metaContent(html, key, value) {
  const tag = tags(html, "meta").find((t) => attr(t, key)?.toLowerCase() === value.toLowerCase());
  return tag ? attr(tag, "content") || void 0 : void 0;
}
function title(html) {
  return html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1].trim();
}
function headingLevels(html) {
  const body = html.replace(/<(script|style|template)[\s\S]*?<\/\1>/gi, "");
  return [...body.matchAll(/<h([1-6])\b/gi)].map((m) => Number(m[1]));
}
var PAGE_RULES = {
  meta: (p, c) => {
    const key = c.name ? "name" : "property";
    const value = c.name ?? c.property;
    return metaContent(p.html, key, value) ? void 0 : `falta <meta ${key}="${value}">`;
  },
  link: (p, c) => tags(p.html, "link").some((t) => attr(t, "rel")?.split(/\s+/).includes(c.rel)) ? void 0 : `falta <link rel="${c.rel}">`,
  html_lang: (p) => tags(p.html, "html").some((t) => attr(t, "lang")) ? void 0 : "falta lang en <html>",
  charset: (p) => tags(p.html, "meta").some((t) => /charset/i.test(t)) ? void 0 : "falta <meta charset>",
  single_h1: (p) => {
    const count = headingLevels(p.html).filter((l) => l === 1).length;
    return count === 1 ? void 0 : `${count} <h1> (debe haber exactamente 1)`;
  },
  heading_order: (p) => {
    const levels = headingLevels(p.html);
    if (levels.length && levels[0] !== 1) return `el primer heading es h${levels[0]}, no h1`;
    for (let i = 1; i < levels.length; i++) {
      if (levels[i] > levels[i - 1] + 1) return `salta de h${levels[i - 1]} a h${levels[i]}`;
    }
    return void 0;
  },
  absolute_og_image: (p) => {
    const url = metaContent(p.html, "property", "og:image");
    return url && url.startsWith("https://") ? void 0 : `og:image no es una URL absoluta https:// (${url ?? "ausente"})`;
  },
  img_dimensions: (p) => {
    const bad = tags(p.html, "img").filter((t) => !attr(t, "width") || !attr(t, "height"));
    return bad.length ? `${bad.length} <img> sin width/height` : void 0;
  },
  img_alt: (p) => {
    const bad = tags(p.html, "img").filter((t) => !/\salt\s*=/.test(t));
    return bad.length ? `${bad.length} <img> sin alt` : void 0;
  }
};
function uniqueBy(pages, pick, label) {
  const seen = /* @__PURE__ */ new Map();
  const missing = [];
  for (const p of pages.filter((p2) => !isErrorPage(p2.file) && !isNoindex(p2.html))) {
    const value = pick(p.html);
    if (!value) missing.push(p.file);
    else seen.set(value, [...seen.get(value) ?? [], p.file]);
  }
  const repeated = [...seen.entries()].filter(([, files]) => files.length > 1);
  if (!missing.length && !repeated.length) return { ok: true, detail: `${label} \xFAnico en ${pages.length} p\xE1ginas` };
  const parts = [
    ...missing.slice(0, 3).map((f) => `${f}: sin ${label}`),
    ...repeated.slice(0, 3).map(([v, files]) => `"${v.slice(0, 50)}" repetido en ${files.slice(0, 3).join(", ")}`)
  ];
  return { ok: false, detail: parts.join("; ") };
}
function checkHtml(root, check) {
  const pages = loadPages(root);
  if (!pages || pages.length === 0) return { ok: null, detail: "sin salida de build con HTML (corre el build primero)" };
  if (check.rule === "unique_title") return uniqueBy(pages, title, "<title>");
  if (check.rule === "unique_description") return uniqueBy(pages, (h) => metaContent(h, "name", "description"), "meta description");
  const rule = PAGE_RULES[check.rule];
  const failures = pages.map((p) => ({ file: p.file, error: rule(p, check) })).filter((f) => f.error !== void 0);
  if (!failures.length) return { ok: true, detail: `${pages.length} p\xE1ginas cumplen` };
  return { ok: false, detail: failures.slice(0, 5).map((f) => `${f.file}: ${f.error}`).join("; ") + (failures.length > 5 ? ` (+${failures.length - 5})` : "") };
}

// engine/src/maps.ts
var import_yaml3 = __toESM(require_dist(), 1);
import { existsSync as existsSync5, readdirSync as readdirSync3, readFileSync as readFileSync4, statSync as statSync2, writeFileSync as writeFileSync2 } from "node:fs";
import { join as join5 } from "node:path";
var REGISTRY_FILE = "REGISTRY.md";
var CODEMAP_FILE = "CODEMAP.md";
var REGISTRY_GLOB = "{src/,}{components,hooks,lib,utils,services,types,emails}/**/*.{ts,tsx,js,jsx}";
var REGISTRY_EXCLUDE = "**/*.{test,spec,stories,d}.{ts,tsx,js,jsx}";
var KIND_ORDER = ["Componentes", "Hooks", "Servicios", "Utilidades", "Tipos"];
function kindOf(path, name, keyword) {
  if (keyword === "type" || keyword === "interface" || keyword === "enum") return "Tipos";
  if (/^use[A-Z]/.test(name) || /(^|\/)hooks\//.test(path)) return "Hooks";
  if (/(^|\/)services\//.test(path)) return "Servicios";
  if (/(^|\/)(components|emails)\//.test(path) && /^[A-Z]/.test(name)) return "Componentes";
  return "Utilidades";
}
function parseDoc(doc) {
  const lines = doc.replace(/^\/\*\*|\*\/$/g, "").split("\n").map((l) => l.replace(/^\s*\*\s?/, ""));
  const out = {};
  const free = [];
  for (let i = 0; i < lines.length; i++) {
    const line3 = lines[i].trim();
    const field = line3.match(/^(Para qué|No usar para|Variantes):\s*(.*)$/i);
    if (field) {
      const key = { "para qu\xE9": "purpose", "no usar para": "notFor", variantes: "variants" }[field[1].toLowerCase()];
      out[key] = field[2];
    } else if (line3.startsWith("@example")) {
      const rest = [line3.slice(8).trim(), ...lines.slice(i + 1).filter((l) => !l.trim().startsWith("@"))].filter(Boolean);
      out.example = rest.join(" ").replace(/\s+/g, " ").trim();
      break;
    } else if (line3.startsWith("@")) break;
    else if (line3) free.push(line3);
  }
  if (!out.purpose && free.length) out.purpose = free.join(" ");
  return out;
}
var EXPORT_RE = /^export\s+(?:default\s+)?(?:declare\s+)?(?:async\s+)?(function\*?|const|let|class|type|interface|enum|abstract\s+class)\s+([A-Za-z_$][\w$]*)/;
function scanExports(root) {
  const entries = [];
  for (const path of matchFiles(root, REGISTRY_GLOB, REGISTRY_EXCLUDE)) {
    const lines = (readText(root, path) ?? "").split("\n");
    lines.forEach((line3, i) => {
      const m = line3.match(EXPORT_RE);
      if (!m) return;
      const [, keyword, name] = m;
      let doc = "";
      let j = i - 1;
      if (j >= 0 && lines[j].trim().endsWith("*/")) {
        const end = j;
        while (j >= 0 && !lines[j].trim().startsWith("/**")) j--;
        if (j >= 0) doc = lines.slice(j, end + 1).join("\n");
      }
      const signature = line3.replace(/\s*[{=]\s*$/, "").replace(/\s*\{$/, "").trim().slice(0, 140);
      entries.push({ name, path, kind: kindOf(path, name, keyword.replace("abstract ", "")), signature, ...parseDoc(doc) });
    });
  }
  return entries.sort((a, b) => a.name.localeCompare(b.name) || a.path.localeCompare(b.path));
}
function renderRegistry(entries) {
  const out = [
    '<!-- Generado por mep (registry). No editar a mano: "Para qu\xE9", "No usar para", "Variantes" y @example se escriben en el comentario /** */ de cada export. -->',
    "# Registro de piezas reutilizables",
    "",
    "Antes de crear algo, busca aqu\xED. Cada entrada apunta al c\xF3digo; nunca lo copia."
  ];
  for (const kind of KIND_ORDER) {
    const group = entries.filter((e) => e.kind === kind);
    if (!group.length) continue;
    out.push("", `## ${kind}`);
    for (const e of group) {
      out.push("", `### ${e.name}`, `- Ruta: ${e.path}`, `- Para qu\xE9: ${e.purpose ?? "\u26A0\uFE0F sin descripci\xF3n"}`, `- Firma: \`${e.signature}\``);
      if (e.variants) out.push(`- Variantes: ${e.variants}`);
      if (e.example) out.push(`- Ejemplo: \`${e.example}\``);
      if (e.notFor) out.push(`- No usar para: ${e.notFor}`);
    }
  }
  return out.join("\n") + "\n";
}
function listedEntries(text) {
  const out = /* @__PURE__ */ new Set();
  let name;
  for (const line3 of text.split("\n")) {
    const h = line3.match(/^###\s+(.+?)\s*$/);
    if (h) name = h[1];
    const r = line3.match(/^- Ruta:\s*(\S+)/);
    if (r && name) out.add(`${r[1]}#${name}`);
  }
  return out;
}
function checkRegistry(root) {
  const entries = scanExports(root);
  if (!entries.length) return [];
  const text = readText(root, REGISTRY_FILE);
  if (text === void 0) return [`falta ${REGISTRY_FILE} (corre: mep registry)`];
  const listed = listedEntries(text);
  const actual = new Set(entries.map((e) => `${e.path}#${e.name}`));
  const errors = [];
  for (const e of entries) {
    if (!listed.has(`${e.path}#${e.name}`)) errors.push(`${e.name} (${e.path}) no est\xE1 en ${REGISTRY_FILE}`);
    if (!e.purpose) errors.push(`${e.name} (${e.path}) sin "Para qu\xE9" en su comentario`);
  }
  for (const key of listed) {
    if (!actual.has(key)) errors.push(`${REGISTRY_FILE} apunta a ${key.replace("#", " \u2192 ")}, que ya no existe`);
  }
  return errors;
}
function writeRegistry(root) {
  const entries = scanExports(root);
  writeFileSync2(join5(root, REGISTRY_FILE), renderRegistry(entries));
  return { entries: entries.length, undocumented: entries.filter((e) => !e.purpose).length };
}
function codemapData(catalog) {
  const file = join5(catalog.dir, "codemap.yaml");
  return existsSync5(file) ? (0, import_yaml3.parse)(readFileSync4(file, "utf8")) : { folders: {}, conventions: {} };
}
var SKIP_DIRS = /* @__PURE__ */ new Set(["node_modules", ".git", ".next", ".vercel", ".turbo", "dist", "build", "out", "coverage", ".astro", ".svelte-kit", ".mep"]);
function folders(root) {
  const dirs = (dir) => existsSync5(join5(root, dir)) ? readdirSync3(join5(root, dir)).filter((d) => !SKIP_DIRS.has(d) && !d.startsWith(".") && statSync2(join5(root, dir, d)).isDirectory()) : [];
  const top = dirs(".").sort();
  const nested = ["src", "src/app", "app"].flatMap((parent) => top.includes(parent.split("/")[0]) ? dirs(parent).map((d) => `${parent}/${d}`) : []);
  return [...top, ...nested.sort()];
}
var MANUAL_START = "<!-- mep:manual -->";
var MANUAL_END = "<!-- /mep:manual -->";
function describe(folder, table) {
  const last = folder.split("/").pop();
  return table[folder] ?? table[last] ?? { contains: "\u2014", notHere: "\u2014" };
}
function renderCodemap(root, catalog) {
  const previous = readText(root, CODEMAP_FILE) ?? "";
  const manual = previous.includes(MANUAL_START) ? previous.slice(previous.indexOf(MANUAL_START) + MANUAL_START.length, previous.indexOf(MANUAL_END)).trim() : "_Lo que el generador no puede inferir: decisiones, atajos, d\xF3nde vive algo poco obvio._";
  const { folders: table, conventions: byFramework } = codemapData(catalog);
  const framework = detectFramework(root);
  const allRoutes = routes(root, framework);
  const pages = allRoutes.filter((r) => !r.startsWith("/api") && !/\.(txt|xml|webmanifest)$/.test(r));
  const api = allRoutes.filter((r) => r.startsWith("/api"));
  const find = (glob) => matchFiles(root, glob);
  const entryPoints = [
    ["Rutas", pages],
    ["API", api],
    ["Middleware", find("{src/,}middleware.{ts,js}")],
    ["Configuraci\xF3n", find("{next.config,astro.config,vite.config,tailwind.config,postcss.config,drizzle.config}.{js,mjs,ts,cjs}").concat(find("{tsconfig.json,vercel.json,components.json}"))],
    ["Tokens de dise\xF1o", find("**/{tokens,theme}.{ts,js,css,json}").concat(find("**/globals.css"))],
    ["Migraciones", find("{supabase/migrations,migrations,prisma,drizzle}/**/*").slice(0, 1).map((f) => f.split("/").slice(0, -1).join("/") + "/")],
    ["Jobs / tareas programadas", find("{src/,}{app/api/cron,jobs,trigger,inngest}/**/*.{ts,js}").slice(0, 10)]
  ];
  const conventions = byFramework[framework] ?? [];
  const out = [
    `<!-- Generado por mep (codemap). Edita solo la secci\xF3n "Notas manuales"; el resto se regenera. -->`,
    "# Mapa del c\xF3digo",
    "",
    `Framework: ${framework}. Para piezas reutilizables, ver ${REGISTRY_FILE}.`,
    "",
    "## Carpetas",
    "",
    "| Carpeta | Contiene | No va aqu\xED |",
    "| --- | --- | --- |",
    ...folders(root).map((f) => {
      const info = describe(f, table);
      return `| \`${f}/\` | ${info.contains} | ${info.notHere} |`;
    }),
    "",
    "## Puntos de entrada",
    "",
    ...entryPoints.filter(([, v]) => v.length).map(([k, v]) => `- **${k}:** ${v.slice(0, 40).map((x) => `\`${x}\``).join(", ")}${v.length > 40 ? ` \u2026 (+${v.length - 40})` : ""}`),
    "",
    "## Convenciones",
    "",
    ...conventions.length ? conventions.map((c) => `- ${c}`) : ["- \u2014"],
    "",
    "## Notas manuales",
    "",
    MANUAL_START,
    manual,
    MANUAL_END,
    ""
  ];
  return out.join("\n");
}
function writeCodemap(root, catalog) {
  writeFileSync2(join5(root, CODEMAP_FILE), renderCodemap(root, catalog));
}
function checkCodemap(root) {
  const text = readText(root, CODEMAP_FILE);
  if (text === void 0) return [`falta ${CODEMAP_FILE} (corre: mep codemap)`];
  return folders(root).filter((f) => !text.includes(`\`${f}/\``)).map((f) => `${CODEMAP_FILE} no lista la carpeta ${f}/ (corre: mep codemap)`);
}

// engine/src/sql.ts
var DEFAULT_GLOB = "{supabase/migrations,migrations,db/migrations,prisma/migrations,drizzle}/**/*.sql";
var SYSTEM_SCHEMAS = /* @__PURE__ */ new Set(["auth", "storage", "extensions", "realtime", "supabase_functions", "graphql", "vault"]);
var OPERATIONS = ["select", "insert", "update", "delete"];
function tableName(raw) {
  const parts = raw.replace(/"/g, "").toLowerCase().split(".");
  if (parts.length === 2 && SYSTEM_SCHEMAS.has(parts[0])) return void 0;
  return parts.length === 2 && parts[0] === "public" ? parts[1] : parts.join(".");
}
var NAME = '((?:"?[\\w]+"?\\.)?"?[\\w]+"?)';
function scan(root, glob) {
  const sql = matchFiles(root, glob).map((f) => (readText(root, f) ?? "").replace(/--.*$/gm, "")).join("\n");
  const tables = /* @__PURE__ */ new Set();
  const rls = /* @__PURE__ */ new Set();
  const policies = /* @__PURE__ */ new Map();
  for (const m of sql.matchAll(new RegExp(`create\\s+table\\s+(?:if\\s+not\\s+exists\\s+)?${NAME}`, "gi"))) {
    const t = tableName(m[1]);
    if (t) tables.add(t);
  }
  for (const m of sql.matchAll(new RegExp(`drop\\s+table\\s+(?:if\\s+exists\\s+)?${NAME}`, "gi"))) {
    const t = tableName(m[1]);
    if (t) tables.delete(t);
  }
  for (const m of sql.matchAll(new RegExp(`alter\\s+table\\s+(?:only\\s+)?${NAME}\\s+enable\\s+row\\s+level\\s+security`, "gi"))) {
    const t = tableName(m[1]);
    if (t) rls.add(t);
  }
  for (const m of sql.matchAll(new RegExp(`create\\s+policy\\s+(?:"[^"]*"|\\w+)\\s+on\\s+${NAME}([\\s\\S]*?);`, "gi"))) {
    const t = tableName(m[1]);
    if (!t) continue;
    const op = m[2].match(/\bfor\s+(all|select|insert|update|delete)\b/i)?.[1].toLowerCase() ?? "all";
    const set = policies.get(t) ?? /* @__PURE__ */ new Set();
    for (const o of op === "all" ? OPERATIONS : [op]) set.add(o);
    policies.set(t, set);
  }
  return { files: matchFiles(root, glob).length, tables, rls, policies };
}
function checkSql(root, check) {
  const { files, tables, rls, policies } = scan(root, check.glob ?? DEFAULT_GLOB);
  if (files === 0) return { ok: null, detail: "sin migraciones SQL versionadas" };
  if (check.rule === "rls_enabled") {
    const missing = [...tables].filter((t) => !rls.has(t)).sort();
    return missing.length ? { ok: false, violation: true, detail: `tablas sin RLS: ${missing.join(", ")}` } : { ok: true, detail: `RLS activo en ${tables.size} tablas` };
  }
  const incomplete = [...tables].filter((t) => rls.has(t)).map((t) => ({ t, missing: OPERATIONS.filter((o) => !policies.get(t)?.has(o)) })).filter((x) => x.missing.length);
  return incomplete.length ? { ok: false, detail: incomplete.slice(0, 5).map((x) => `${x.t}: sin pol\xEDtica ${x.missing.join("/")}`).join("; ") } : { ok: true, detail: "pol\xEDticas por operaci\xF3n en todas las tablas" };
}

// engine/src/security.ts
import { createHash } from "node:crypto";
import { mkdirSync as mkdirSync2, writeFileSync as writeFileSync3 } from "node:fs";
import { join as join6 } from "node:path";
var SECURITY_DIR = join6(MEP_DIR, "security");
function hashFiles(root, files) {
  const h = createHash("sha256");
  for (const f of [...files].sort()) {
    h.update(`${f}\0${readText(root, f) ?? "<missing>"}\0`);
  }
  return h.digest("hex");
}
function readReport(root, id) {
  const text = readText(root, join6(SECURITY_DIR, `${id}.json`));
  if (!text) return void 0;
  try {
    return JSON.parse(text);
  } catch {
    return void 0;
  }
}
function reportState(root, id) {
  const report = readReport(root, id);
  if (!report) return { valid: false, detail: "sin auditor\xEDa de mep-security" };
  if (report.result !== "pass") return { valid: false, detail: `auditor\xEDa: ${report.result} \u2014 ${report.notes}` };
  if (hashFiles(root, report.files) !== report.hash) return { valid: false, detail: "auditor\xEDa vencida: cambiaron los archivos revisados" };
  return { valid: true, detail: `auditado ${report.date}` };
}
function recordReport(root, input) {
  const report = { ...input, hash: hashFiles(root, input.files), date: today(), by: "mep-security" };
  mkdirSync2(join6(root, SECURITY_DIR), { recursive: true });
  writeFileSync3(join6(root, SECURITY_DIR, `${input.id}.json`), JSON.stringify(report, null, 2) + "\n");
  return report;
}

// engine/src/verify.ts
function getKey(obj, path) {
  return path.split(".").reduce((o, k) => o && typeof o === "object" ? o[k] : void 0, obj);
}
function grep(root, check) {
  const re = new RegExp(check.pattern, check.flags?.replace("g", ""));
  const hits = [];
  for (const file of matchFiles(root, check.glob, check.exclude)) {
    const lines = (readText(root, file) ?? "").split("\n");
    lines.forEach((line3, i) => {
      if (re.test(line3)) hits.push(`${file}:${i + 1}`);
    });
    if (hits.length >= 20) break;
  }
  if ((check.expect ?? "present") === "present") {
    return hits.length ? { ok: true, detail: `encontrado en ${hits[0]}` } : { ok: false, detail: `no se encontr\xF3 /${check.pattern}/ en ${check.glob}` };
  }
  return hits.length ? { ok: false, violation: true, detail: `no permitido: ${hits.slice(0, 5).join(", ")}${hits.length > 5 ? " \u2026" : ""}` } : { ok: true, detail: "sin coincidencias" };
}
function runCheck(root, check, profile, itemId, mode) {
  switch (check.type) {
    case "file_exists": {
      const paths = Array.isArray(check.path) ? check.path : [check.path];
      const found = paths.find((p) => p.includes("*") ? matchFiles(root, p).length > 0 : exists(root, p));
      return found ? { ok: true, detail: found } : { ok: false, detail: `falta ${paths.join(" o ")}` };
    }
    case "route_exists":
      return routeExists(root, check.path) ? { ok: true, detail: `ruta ${check.path}` } : { ok: false, detail: `falta la ruta ${check.path}` };
    case "grep":
      return grep(root, check);
    case "json_key": {
      const text = readText(root, check.file);
      if (text === void 0) return { ok: false, detail: `falta ${check.file}` };
      let value;
      try {
        value = getKey(parseJsonc(text), check.key);
      } catch {
        return { ok: false, detail: `${check.file} no es JSON v\xE1lido` };
      }
      if (value === void 0) return { ok: false, detail: `${check.file}: falta ${check.key}` };
      if (check.value !== void 0 && JSON.stringify(value) !== JSON.stringify(check.value)) {
        return { ok: false, detail: `${check.file}: ${check.key} es ${JSON.stringify(value)}, se espera ${JSON.stringify(check.value)}` };
      }
      return { ok: true, detail: `${check.file}: ${check.key}` };
    }
    case "command": {
      if (mode === "fast") return { ok: null, detail: `se verifica en /mep:check: ${check.run}` };
      try {
        execSync(check.run, { cwd: root, stdio: "pipe", timeout: (check.timeout ?? 300) * 1e3 });
        return { ok: true, detail: `${check.run} \u2713` };
      } catch (err) {
        const out = String(err.stdout ?? "") + String(err.stderr ?? "");
        return { ok: false, detail: `${check.run} fall\xF3: ${out.trim().split("\n").slice(-3).join(" ").slice(0, 300)}` };
      }
    }
    case "html":
      if (mode === "fast") return { ok: null, detail: "se verifica sobre el build en /mep:check" };
      return checkHtml(root, check);
    case "sql":
      return checkSql(root, check);
    case "maps": {
      const errors = check.rule === "registry" ? checkRegistry(root) : checkCodemap(root);
      return errors.length ? { ok: false, detail: errors.slice(0, 5).join("; ") + (errors.length > 5 ? ` (+${errors.length - 5})` : "") } : { ok: true, detail: `${check.rule} al d\xEDa` };
    }
    case "manual": {
      const confirmed = profile.selections.manual_confirmed.find((c) => c.id === itemId);
      return confirmed ? { ok: true, detail: `confirmado por ${confirmed.by} (${confirmed.date})` } : { ok: null, detail: `manual: ${check.prompt}` };
    }
  }
}
function statusOf(results) {
  if (results.some((r) => r.ok === false)) return "fail";
  if (results.some((r) => r.ok === null)) return "unknown";
  return "pass";
}
function isSecurityItem(e) {
  return e.item.category === "security";
}
function verifyItems(root, profile, evaluated, mode) {
  return evaluated.map((e) => {
    if (e.state !== "active") return { ...e, status: "unknown", checks: [], violation: false };
    const security = isSecurityItem(e);
    const checks = e.item.verify.filter((check) => !(security && check.type === "manual")).map((check) => ({ check, result: runCheck(root, check, profile, e.item.id, mode) }));
    const violation = checks.some((c) => c.result.ok === false && c.result.violation === true);
    let status = statusOf(checks.map((c) => c.result));
    if (security && status !== "fail") {
      const audit = reportState(root, e.item.id);
      checks.push({ check: { type: "manual", prompt: "auditor\xEDa mep-security" }, result: { ok: audit.valid, detail: audit.detail } });
      if (!audit.valid) status = "fail";
    }
    return { ...e, status, checks, violation };
  });
}
function failingDetail(r) {
  return r.checks.filter((c) => c.result.ok !== true).map((c) => c.result.detail).join("; ");
}

// engine/src/gate.ts
var PASS = { block: false, blockers: [], info: [], bypassed: false, message: "" };
function formatItems(results, max = 15) {
  const lines = results.slice(0, max).map((r) => `${LEVEL_ICON[r.level]} ${r.item.id} (${r.item.phase}) \u2014 ${r.item.how}
   \u21B3 ${failingDetail(r) || "pendiente"}`);
  if (results.length > max) lines.push(`\u2026 y ${results.length - max} m\xE1s (/mep:check)`);
  return lines.join("\n");
}
function gate(root, catalog, kind, env = process.env) {
  if (!hasProfile(root)) return PASS;
  const profile = loadProfile(root, catalog);
  const mode = kind === "prod" ? "full" : "fast";
  const results = verifyItems(root, profile, evaluate(profile, catalog), mode).filter((r) => r.state === "active");
  const closed = new Set(profile.phase.closed);
  const locked = results.filter((r) => r.item.locked && r.violation);
  const required = results.filter((r) => r.level === "required");
  const grace = new Set(profile.selections.grace);
  const regressions = kind === "prod" ? required.filter((r) => r.status !== "pass") : required.filter((r) => closed.has(r.item.phase) && r.status === "fail" && !grace.has(r.item.id));
  const blockers = uniq([...locked, ...regressions]);
  const info = kind === "prod" ? [] : required.filter((r) => r.item.phase === profile.phase.active && r.status !== "pass" && !blockers.includes(r));
  const bypassed = env.MEP_BYPASS === "1" && blockers.length > 0 && locked.length === 0;
  if (bypassed) log(root, "bypass", `${kind}: ${blockers.map((b) => b.item.id).join(",")}`);
  const block = blockers.length > 0 && !bypassed;
  const label = { stop: "cerrar el trabajo", preview: "el deploy de preview", prod: "el deploy a producci\xF3n" }[kind];
  const parts = [];
  if (block) {
    parts.push(`mep bloquea ${label}: ${blockers.length} \u{1F534} pendiente(s).`);
    if (locked.length) parts.push("\xCDtems locked violados (no aceptan MEP_BYPASS):");
    parts.push(formatItems(blockers));
  } else if (bypassed) parts.push(`MEP_BYPASS=1: ${blockers.length} \u{1F534} omitidos para ${label} (registrado en .mep/log).`);
  if (info.length) parts.push(`Pendientes de ${profile.phase.active} (a\xFAn no bloquean):
${formatItems(info, 5)}`);
  return { block, blockers, info, bypassed, message: parts.join("\n") };
}
function uniq(xs) {
  return [...new Set(xs)];
}
function closePhase(root, catalog, sub) {
  const profile = loadProfile(root, catalog);
  const phases = catalog.dimensions.phases;
  if (!phases.includes(sub)) return { closed: false, message: `sub-etapa desconocida: ${sub}. V\xE1lidas: ${phases.join(", ")}`, pending: [], profile };
  if (profile.phase.closed.includes(sub)) return { closed: false, message: `${sub} ya est\xE1 cerrada`, pending: [], profile };
  const results = verifyItems(root, profile, evaluate(profile, catalog), "full");
  const grace = new Set(profile.selections.grace);
  const pending = results.filter(
    (r) => r.state === "active" && r.level === "required" && (r.item.phase === sub || grace.has(r.item.id)) && r.status !== "pass"
  );
  if (pending.length) {
    return { closed: false, message: `No se puede cerrar ${sub}: ${pending.length} \u{1F534} sin cumplir.
${formatItems(pending)}`, pending, profile };
  }
  profile.phase.closed = phases.filter((p) => p === sub || profile.phase.closed.includes(p));
  profile.phase.active = phases.find((p) => !profile.phase.closed.includes(p)) ?? sub;
  profile.selections.grace = [];
  saveProfile(root, profile);
  log(root, "phase-close", sub);
  return { closed: true, message: `\u2705 ${sub} cerrada. Sus \u{1F534} quedan protegidos contra regresiones. Sub-etapa activa: ${profile.phase.active}.`, pending: [], profile };
}
var CACHE_TTL_MS = 12e4;
function gitState(root) {
  try {
    return execSync2('git rev-parse HEAD && git status --porcelain -- . ":!.mep"', { cwd: root, stdio: ["ignore", "pipe", "ignore"] }).toString();
  } catch {
    return "no-git";
  }
}
function cachedGate(root, catalog, kind, env = process.env) {
  if (!hasProfile(root)) return PASS;
  const key = createHash2("sha256").update(`${kind}\0${env.MEP_BYPASS ?? ""}\0${gitState(root)}\0${readFileSync5(join7(root, MEP_DIR, "profile.yaml"), "utf8")}`).digest("hex");
  const dir = join7(root, MEP_DIR, ".cache");
  const file = join7(dir, `gate-${kind}.json`);
  if (existsSync6(file)) {
    const cached = JSON.parse(readFileSync5(file, "utf8"));
    if (cached.key === key && Date.now() - cached.time < CACHE_TTL_MS) return cached;
  }
  const { block, message } = gate(root, catalog, kind, env);
  mkdirSync3(dir, { recursive: true });
  writeFileSync4(join7(root, MEP_DIR, ".gitignore"), ".cache/\n");
  writeFileSync4(file, JSON.stringify({ key, time: Date.now(), block, message }));
  return { block, message };
}

// engine/src/render.ts
import { existsSync as existsSync7, mkdirSync as mkdirSync4, readdirSync as readdirSync4, readFileSync as readFileSync6, writeFileSync as writeFileSync5 } from "node:fs";
import { join as join8 } from "node:path";
var BRIEF_FILE = "BRIEF.md";
var ADR_DIR = "docs/decisions";
var LEGAL_NOTE = "> Checklist orientativo, no sustituye asesor\xEDa legal.";
function describeCheck(c) {
  switch (c.type) {
    case "file_exists":
      return `existe ${Array.isArray(c.path) ? c.path.join(" o ") : c.path}`;
    case "route_exists":
      return `ruta ${c.path}`;
    case "grep":
      return `${c.expect === "absent" ? "sin" : "contiene"} /${c.pattern}/ en ${c.glob}`;
    case "json_key":
      return `${c.file} \u2192 ${c.key}${c.value !== void 0 ? ` = ${JSON.stringify(c.value)}` : ""}`;
    case "command":
      return `\`${c.run}\` sale con 0`;
    case "html":
      return `HTML del build: ${c.rule}${c.name ?? c.property ?? c.rel ? ` ${c.name ?? c.property ?? c.rel}` : ""}`;
    case "sql":
      return `migraciones SQL: ${c.rule}`;
    case "maps":
      return c.rule === "registry" ? "REGISTRY.md al d\xEDa (mep registry --check)" : "CODEMAP.md al d\xEDa";
    case "manual":
      return `manual: ${c.prompt}`;
  }
}
function checkbox(e, results) {
  const r = results?.get(e.item.id);
  return r?.status === "pass" ? "[x]" : "[ ]";
}
function line(e, results) {
  const lock = e.item.locked ? " \u{1F512}" : "";
  const verify = e.item.verify.map(describeCheck).join(" \xB7 ");
  return `- ${checkbox(e, results)} \`${e.item.id}\`${lock} \u2014 ${e.item.title} \u2014 ${verify}`;
}
function profileSection(p) {
  const signals = Object.entries(p.signals).filter(([, v]) => v !== false).map(([k, v]) => v === true ? k : `${k}=${v}`);
  return [
    `- **Tipo:** ${p.type}${p.preset ? ` (preset ${p.preset})` : ""}`,
    `- **Capacidades:** ${p.capabilities.join(", ") || "\u2014"}`,
    `- **Mercados:** ${p.markets.join(", ") || "\u2014"}`,
    `- **Audiencia:** ${p.audience.join(", ") || "\u2014"}`,
    `- **Contexto:** ${p.context}`,
    `- **Se\xF1ales:** ${signals.join(", ") || "\u2014"}`,
    `- **Conteos:** ${Object.entries(p.counts).map(([k, v]) => `${k} ${v}`).join(" \xB7 ") || "\u2014"}`
  ].join("\n");
}
function stackSection(decisions) {
  if (!decisions.length) return "_Sin decisiones de stack._";
  return stackGroups(decisions).map((g) => `- ${g.decisions.map((d) => `**${d.key}:** ${d.value}${d.decided ? "" : " _(recomendado)_"}`).join(" \xB7 ")} \u2014 ${g.why}`).join("\n");
}
function renderBrief(profile, evaluated, catalog, results) {
  const byId = results ? new Map(results.map((r) => [r.item.id, r])) : void 0;
  const out = [
    `<!-- Generado por mep desde .mep/profile.yaml (cat\xE1logo ${profile.catalog_version}). No editar a mano: usa /mep:add, /mep:skip, /mep:override. -->`,
    `# Brief \u2014 ${profile.project}`,
    "",
    "## Perfil",
    profileSection(profile),
    "",
    "## Stack (decisi\xF3n + por qu\xE9)",
    stackSection(stack(profile, catalog)),
    "",
    "## Fase actual",
    `- **Cerradas:** ${profile.phase.closed.join(", ") || "\u2014"}`,
    `- **Activa:** ${profile.phase.active}`,
    "",
    "## Checklist"
  ];
  for (const phase of catalog.dimensions.phases) {
    const inPhase = evaluated.filter((e) => e.item.phase === phase && e.state === "active");
    if (!inPhase.length) continue;
    const mark = profile.phase.closed.includes(phase) ? " \u2705" : phase === profile.phase.active ? " \u2190 activa" : "";
    out.push("", `### ${phase}${mark}`);
    for (const level of ["required", "recommended", "optional"]) {
      const items = inPhase.filter((e) => e.level === level);
      if (!items.length) continue;
      const label = { required: "Obligatorios", recommended: "Recomendados", optional: "Opcionales elegidos" }[level];
      out.push("", `#### ${LEVEL_ICON[level]} ${label}`, ...items.map((e) => line(e, byId)));
    }
  }
  const skipped = evaluated.filter((e) => e.state === "skipped");
  const overridden = evaluated.filter((e) => e.state === "overridden");
  out.push("", "### \u23ED\uFE0F Omitidos (\u{1F7E1}, con raz\xF3n)", skipped.length ? skipped.map((e) => `- \`${e.item.id}\` \u2014 ${e.reason}`).join("\n") : "\u2014");
  out.push("", "### \u26A0\uFE0F Desactivados (\u{1F534} con override, con raz\xF3n)", overridden.length ? overridden.map((e) => `- \u26A0\uFE0F \`${e.item.id}\` \u2014 ${e.reason}`).join("\n") : "\u2014");
  const warns = warnings(evaluated);
  if (warns.length) out.push("", "### Avisos", ...warns.map((w) => `- ${w.message}`));
  out.push("", "## Costos recurrentes estimados", "_Se completan con /mep:quote (hosting, dominio, servicios)._");
  const refs = evaluated.filter((e) => e.state === "active" && e.item.category === "legal" && e.item.references?.length);
  out.push("", "## Notas legales", LEGAL_NOTE);
  for (const e of refs) out.push(`- \`${e.item.id}\`: ${e.item.references.join(" \xB7 ")}`);
  return out.join("\n") + "\n";
}
function writeBrief(root, content) {
  writeFileSync5(join8(root, BRIEF_FILE), content);
}
function slug(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
function writeStackAdrs(root, profile, catalog) {
  const dir = join8(root, ADR_DIR);
  mkdirSync4(dir, { recursive: true });
  const existing = readdirSync4(dir).filter((f) => /^\d{4}-.*\.md$/.test(f)).sort();
  const written = [];
  let next = existing.length ? Number(existing[existing.length - 1].slice(0, 4)) + 1 : 1;
  for (const g of stackGroups(stack(profile, catalog))) {
    const decision = g.decisions.map((d) => `${d.key}: ${d.value}`).join(", ");
    const base = `stack-${slug(g.rule)}`;
    const previous = existing.filter((f) => f.slice(5).startsWith(base)).pop();
    if (previous && readFileSync6(join8(dir, previous), "utf8").includes(`**Decisi\xF3n:** ${decision}
`)) continue;
    const file = `${String(next++).padStart(4, "0")}-${base}.md`;
    const alternatives = catalog.stackRules.find((r) => r.id === g.rule)?.alternatives ?? [];
    writeFileSync5(
      join8(dir, file),
      [
        `# Stack: ${decision}`,
        "",
        `- **Estado:** aceptada${previous ? ` (reemplaza a ${previous})` : ""}`,
        `- **Fecha:** ${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}`,
        "",
        "## Contexto",
        `Perfil: ${profile.type}; capacidades: ${profile.capabilities.join(", ") || "\u2014"}. Regla: ${g.rule}.`,
        "",
        "## Decisi\xF3n",
        `**Decisi\xF3n:** ${decision}`,
        "",
        g.why,
        "",
        "## Alternativas",
        alternatives.length ? alternatives.map((a) => `- ${Object.entries(a).map(([k, v]) => `${k}: ${v}`).join(" \u2014 ")}`).join("\n") : "- \u2014",
        "",
        "## Consecuencias",
        "Cambiarla requiere actualizar `.mep/profile.yaml`, regenerar el brief y un ADR nuevo que reemplace a este.",
        ""
      ].join("\n")
    );
    written.push(file);
  }
  return written;
}
var CLAUDE_MARKER = "<!-- mep -->";
function linkClaudeMd(root, template) {
  const file = join8(root, "CLAUDE.md");
  const current = existsSync7(file) ? readFileSync6(file, "utf8") : "";
  if (current.includes(CLAUDE_MARKER)) return false;
  const block = `${CLAUDE_MARKER}
${template.trim()}
${CLAUDE_MARKER}
`;
  writeFileSync5(file, current ? `${current.trimEnd()}

${block}` : block);
  return true;
}

// engine/src/report.ts
var STATUS_ICON = { pass: "\u2705", fail: "\u274C", unknown: "\u2754" };
function formatProposal(evaluated) {
  const out = [];
  for (const level of ["required", "recommended", "optional"]) {
    const items = evaluated.filter((e) => e.level === level);
    if (!items.length) continue;
    const label = { required: "Obligatorios", recommended: "Recomendados", optional: "Opcionales (elige)" }[level];
    out.push(`
${LEVEL_ICON[level]} ${label} (${items.length})`);
    const categories = [...new Set(items.map((e) => e.item.category))].sort();
    for (const cat of categories) {
      out.push(`  ${cat}`);
      for (const e of items.filter((i) => i.item.category === cat)) {
        out.push(`    - ${e.item.id}${e.item.locked ? " \u{1F512}" : ""} \u2014 ${e.item.title}`);
      }
    }
  }
  return out.join("\n").trim();
}
function stateIcon(r) {
  if (r.state === "skipped") return "\u23ED\uFE0F";
  if (r.state === "overridden") return "\u26A0\uFE0F";
  return STATUS_ICON[r.status];
}
function formatCheck(results, profile, catalog, { verbose = false } = {}) {
  const out = [];
  const shown = results.filter((r) => r.state !== "offered");
  for (const phase of catalog.dimensions.phases) {
    const items = shown.filter((r) => r.item.phase === phase);
    if (!items.length) continue;
    const req = items.filter((r) => r.level === "required" && r.state === "active");
    const done = req.filter((r) => r.status === "pass").length;
    const mark = profile.phase.closed.includes(phase) ? "\u{1F512} cerrada" : phase === profile.phase.active ? "\u2190 activa" : "";
    out.push(`
${phase}  \u{1F534} ${done}/${req.length} ${mark}`.trimEnd());
    for (const r of items) {
      if (!verbose && r.status === "pass" && r.state === "active") continue;
      const detail = r.state === "active" ? failingDetail(r) : r.reason;
      out.push(`  ${stateIcon(r)} ${LEVEL_ICON[r.level]} ${r.item.id}${detail ? ` \u2014 ${detail}` : ""}`);
    }
  }
  return out.join("\n").trim();
}
function counts(results) {
  const pending = results.filter((r) => r.state === "active" && r.status !== "pass");
  return {
    required: pending.filter((r) => r.level === "required").length,
    recommended: pending.filter((r) => r.level === "recommended").length
  };
}

// engine/src/signals.ts
var import_yaml4 = __toESM(require_dist(), 1);
import { existsSync as existsSync8, readFileSync as readFileSync7 } from "node:fs";
import { join as join9 } from "node:path";
function loadDetectors(catalog, name = "signals.yaml") {
  const file = join9(catalog.dir, name);
  return existsSync8(file) ? (0, import_yaml4.parse)(readFileSync7(file, "utf8")) : {};
}
function fires(root, d, deps) {
  if ("dependency" in d) return d.dependency.find((dep) => deps.has(dep));
  if ("file" in d) return matchFiles(root, d.file)[0];
  const re = new RegExp(d.grep);
  return matchFiles(root, d.glob).find((f) => re.test(readText(root, f) ?? ""));
}
function detectSignals(root, catalog) {
  return detect(root, loadDetectors(catalog));
}
function detectCapabilities(root, catalog) {
  return detect(root, loadDetectors(catalog, "detect.yaml"));
}
function detect(root, table) {
  const deps = dependencies(root);
  const out = {};
  for (const [signal, detectors] of Object.entries(table)) {
    for (const d of detectors) {
      const evidence = fires(root, d, deps);
      if (evidence) {
        out[signal] = evidence;
        break;
      }
    }
  }
  return out;
}
function missingSignals(root, profile, catalog) {
  return Object.entries(detectSignals(root, catalog)).filter(([signal]) => profile.signals[signal] !== true).map(([signal, evidence]) => ({ signal, evidence }));
}

// engine/src/audit.ts
var INTEGRATION_DEPS = /^(stripe|@stripe\/|resend|@sendgrid|postmark|@supabase\/|@clerk\/|algoliasearch|meilisearch|@vercel\/(blob|analytics|kv)|posthog|mixpanel|@sentry\/|openai|@anthropic-ai\/|uploadthing|pusher|ably|mapbox|@react-google-maps|twilio|@upstash\/|sanity|contentful|@mux\/)/;
function countEntities(root) {
  const tables = /* @__PURE__ */ new Set();
  for (const f of matchFiles(root, "**/*.sql")) {
    for (const m of (readText(root, f) ?? "").matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:"?public"?\.)?"?(\w+)"?/gi)) tables.add(m[1].toLowerCase());
  }
  for (const f of matchFiles(root, "**/*.prisma")) {
    for (const m of (readText(root, f) ?? "").matchAll(/^model\s+(\w+)/gm)) tables.add(m[1].toLowerCase());
  }
  return tables.size;
}
function countLanguages(root) {
  const locales = /* @__PURE__ */ new Set();
  for (const f of listFiles(root)) {
    const m = f.match(/(?:^|\/)(?:locales|messages|i18n|lang)\/([a-z]{2}(?:[-_][A-Z]{2})?)(?:\.json|\/)/);
    if (m) locales.add(m[1].slice(0, 2));
  }
  return Math.max(1, locales.size);
}
function guessType(caps, pages, files) {
  if (caps.has("payments") && caps.has("ugc")) return "marketplace";
  if (caps.has("subscriptions") || caps.has("auth") && caps.has("payments")) return "saas";
  if (caps.has("payments")) return "ecommerce";
  if (files.some((f) => /(^|\/)(booking|bookings|reservas|appointments|citas)(\/|\.)/.test(f))) return "booking";
  if (caps.has("auth")) return "internal-app";
  if (files.some((f) => /(^|\/)(blog|posts)\//.test(f))) return "blog";
  return pages <= 2 ? "landing" : "corporate";
}
function inferProfile(root, catalog) {
  const evidence = {};
  const caps = detectCapabilities(root, catalog);
  for (const [k, v] of Object.entries(caps)) evidence[`capabilities.${k}`] = v;
  const signals = detectSignals(root, catalog);
  for (const [k, v] of Object.entries(signals)) evidence[`signals.${k}`] = v;
  const framework = detectFramework(root);
  evidence.framework = framework;
  const pageRoutes = routes(root, framework).filter((r) => !/\.(txt|xml|webmanifest)$/.test(r) && !["/404", "/500"].includes(r) && !r.startsWith("/api"));
  const files = listFiles(root);
  const capSet = new Set(Object.keys(caps));
  const type = guessType(capSet, pageRoutes.length, files);
  evidence.type = `${capSet.size} capacidades, ${pageRoutes.length} p\xE1ginas`;
  const integrations = [...dependencies(root)].filter((d) => INTEGRATION_DEPS.test(d));
  const deps = dependencies(root);
  const stack2 = {};
  if (framework !== "static") stack2.framework = framework;
  if (deps.has("@supabase/supabase-js")) Object.assign(stack2, { db: "postgresql", db_provider: "supabase" });
  else if (deps.has("pg") || deps.has("postgres") || deps.has("@neondatabase/serverless")) stack2.db = "postgresql";
  if (deps.has("stripe")) stack2.payments = "stripe";
  if (files.some((f) => f === "vercel.json" || f.startsWith(".vercel/"))) stack2.hosting = "vercel";
  const raw = {
    project: (readText(root, "package.json") ?? "").match(/"name"\s*:\s*"([^"]+)"/)?.[1] ?? "proyecto",
    type,
    capabilities: [...capSet].filter((c) => catalog.dimensions.capabilities.includes(c)).sort(),
    signals: Object.fromEntries(Object.keys(signals).map((k) => [k, true])),
    counts: { pages: Math.max(1, pageRoutes.length), entities: countEntities(root), languages: countLanguages(root), integrations: integrations.length },
    stack: { decided: stack2 }
  };
  return { profile: normalizeProfile(raw, catalog), evidence };
}
function gapReport(root, profile, catalog) {
  return verifyItems(root, profile, evaluate(profile, catalog), "full").filter((r) => r.state === "active");
}

// engine/src/docs.ts
import { deflateSync } from "node:zlib";
function inline(text) {
  const out = [];
  const parts = text.replace(/`([^`]*)`/g, "$1").split(/(\*\*[^*]+\*\*)/);
  for (const p of parts) {
    if (!p) continue;
    const bold = p.startsWith("**") && p.endsWith("**");
    out.push({ text: bold ? p.slice(2, -2) : p, bold });
  }
  return out;
}
function parseMarkdown(md) {
  const lines = md.replace(/<!--[\s\S]*?-->/g, "").split("\n");
  const blocks = [];
  let para = [];
  const flush = () => {
    if (para.length) blocks.push({ kind: "paragraph", text: inline(para.join(" ")) });
    para = [];
  };
  for (let i = 0; i < lines.length; i++) {
    const line3 = lines[i].trimEnd();
    const h = line3.match(/^(#{1,3})\s+(.*)$/);
    const li = line3.match(/^\s*(?:[-*]|(\d+)\.)\s+(.*)$/);
    if (!line3.trim()) flush();
    else if (h) {
      flush();
      blocks.push({ kind: "heading", level: h[1].length, text: inline(h[2]) });
    } else if (/^-{3,}$/.test(line3.trim())) {
      flush();
      blocks.push({ kind: "pagebreak" });
    } else if (line3.startsWith("|")) {
      flush();
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        const cells = lines[i].trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
        if (!cells.every((c) => /^:?-{2,}:?$/.test(c))) rows.push(cells.map(inline));
        i++;
      }
      i--;
      blocks.push({ kind: "table", rows });
    } else if (li) {
      flush();
      const ordered = li[1] !== void 0;
      const items = [];
      while (i < lines.length) {
        const m = lines[i].match(/^\s*(?:[-*]|(\d+)\.)\s+(.*)$/);
        if (!m || m[1] !== void 0 !== ordered) break;
        items.push(inline(m[2]));
        i++;
      }
      i--;
      blocks.push({ kind: "list", ordered, items });
    } else if (line3.startsWith(">")) {
      flush();
      blocks.push({ kind: "quote", text: inline(line3.replace(/^>\s?/, "")) });
    } else para.push(line3.trim());
  }
  flush();
  return blocks;
}
var xml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
function runs(text) {
  return text.map((t) => `<w:r>${t.bold ? "<w:rPr><w:b/></w:rPr>" : ""}<w:t xml:space="preserve">${xml(t.text)}</w:t></w:r>`).join("");
}
function docxBlock(b) {
  switch (b.kind) {
    case "heading":
      return `<w:p><w:pPr><w:pStyle w:val="${b.level === 1 ? "Title" : `Heading${b.level - 1}`}"/></w:pPr>${runs(b.text)}</w:p>`;
    case "paragraph":
      return `<w:p>${runs(b.text)}</w:p>`;
    case "quote":
      return `<w:p><w:pPr><w:pStyle w:val="Quote"/></w:pPr>${runs(b.text)}</w:p>`;
    case "list":
      return b.items.map((item, n) => `<w:p><w:pPr><w:pStyle w:val="ListParagraph"/><w:ind w:left="360" w:hanging="360"/></w:pPr><w:r><w:t xml:space="preserve">${b.ordered ? `${n + 1}.` : "\u2022"}	</w:t></w:r>${runs(item)}</w:p>`).join("");
    case "table": {
      const border = '<w:top w:val="single" w:sz="4" w:color="BFBFBF"/><w:left w:val="single" w:sz="4" w:color="BFBFBF"/><w:bottom w:val="single" w:sz="4" w:color="BFBFBF"/><w:right w:val="single" w:sz="4" w:color="BFBFBF"/><w:insideH w:val="single" w:sz="4" w:color="BFBFBF"/><w:insideV w:val="single" w:sz="4" w:color="BFBFBF"/>';
      const rows = b.rows.map((row, r) => `<w:tr>${row.map((cell) => `<w:tc><w:p>${runs(r === 0 ? cell.map((c) => ({ ...c, bold: true })) : cell)}</w:p></w:tc>`).join("")}</w:tr>`).join("");
      return `<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:tblBorders>${border}</w:tblBorders><w:tblCellMar><w:left w:w="80" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar></w:tblPr>${rows}</w:tbl><w:p/>`;
    }
    case "pagebreak":
      return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
  }
}
var STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:sz w:val="22"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="240"/></w:pPr><w:rPr><w:b/><w:sz w:val="40"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="320" w:after="120"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:sz w:val="30"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="200" w:after="80"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/><w:sz w:val="24"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Quote"><w:name w:val="Quote"/><w:basedOn w:val="Normal"/><w:pPr><w:ind w:left="360"/></w:pPr><w:rPr><w:i/><w:color w:val="555555"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="60"/></w:pPr></w:style>
</w:styles>`;
function toDocx(blocks) {
  const body = blocks.map(docxBlock).join("");
  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>`;
  return zip([
    ["[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`],
    ["_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`],
    ["word/_rels/document.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
    ["word/document.xml", document],
    ["word/styles.xml", STYLES]
  ]);
}
var CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 3988292384 ^ c >>> 1 : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 4294967295;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 255] ^ c >>> 8;
  return (c ^ 4294967295) >>> 0;
}
function zip(files) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const [name, content] of files) {
    const data = Buffer.from(content, "utf8");
    const nameBuf = Buffer.from(name, "utf8");
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(67324752, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(2048, 6);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(33639248, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(2048, 8);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt32LE(offset, 42);
    locals.push(local, nameBuf, data);
    centrals.push(central, nameBuf);
    offset += local.length + nameBuf.length + data.length;
  }
  const centralBuf = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(101010256, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, centralBuf, end]);
}
var HELVETICA = [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584];
var WIN_ANSI = { "\u20AC": 128, "\u2026": 133, "\u2018": 145, "\u2019": 146, "\u201C": 147, "\u201D": 148, "\u2022": 149, "\u2013": 150, "\u2014": 151, "\u2122": 153 };
function ansi(text) {
  const out = [];
  for (const ch of text.normalize("NFC")) {
    const code = ch.codePointAt(0);
    if (WIN_ANSI[ch]) out.push(WIN_ANSI[ch]);
    else if (ch === "\u2192") out.push(...[45, 62]);
    else if (code >= 32 && code <= 255 && !(code >= 127 && code < 160)) out.push(code);
  }
  return out;
}
function baseChar(code) {
  const accents = "\xC0\xC1\xC2\xC3\xC4\xC5\xE0\xE1\xE2\xE3\xE4\xE5\xC8\xC9\xCA\xCB\xE8\xE9\xEA\xEB\xCC\xCD\xCE\xCF\xEC\xED\xEE\xEF\xD2\xD3\xD4\xD5\xD6\xF2\xF3\xF4\xF5\xF6\xD9\xDA\xDB\xDC\xF9\xFA\xFB\xFC\xD1\xF1\xC7\xE7\xDD\xFD\xFF";
  const bases = "AAAAAAaaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuNnCcYyy";
  const i = accents.indexOf(String.fromCharCode(code));
  return i >= 0 ? bases.charCodeAt(i) : code;
}
var EXTRA_WIDTHS = { 128: 556, 133: 1e3, 145: 222, 146: 222, 147: 333, 148: 333, 149: 350, 150: 556, 151: 1e3, 153: 1e3, 161: 333, 191: 611, 183: 278, 171: 556, 187: 556 };
function widthOf(codes, size, bold) {
  let w = 0;
  for (const c of codes) {
    const b = baseChar(c);
    w += b >= 32 && b <= 126 ? HELVETICA[b - 32] : EXTRA_WIDTHS[c] ?? 556;
  }
  return w / 1e3 * size * (bold ? 1.12 : 1);
}
function words(text) {
  return text.flatMap((t) => t.text.split(/\s+/).filter(Boolean).map((w) => ({ codes: ansi(w), bold: t.bold })));
}
function wrap(text, size, maxWidth) {
  const lines = [];
  let line3 = [];
  let width = 0;
  const space = widthOf([32], size, false);
  for (const w of words(text)) {
    const ww = widthOf(w.codes, size, w.bold);
    if (line3.length && width + space + ww > maxWidth) {
      lines.push(line3);
      line3 = [];
      width = 0;
    }
    width += (line3.length ? space : 0) + ww;
    line3.push(w);
  }
  if (line3.length) lines.push(line3);
  return lines.length ? lines : [[]];
}
var PAGE_W = 612;
var PAGE_H = 792;
var MARGIN = 56;
function pdfString(codes) {
  return "(" + codes.map((c) => c === 40 || c === 41 || c === 92 ? "\\" + String.fromCharCode(c) : c < 32 || c > 126 ? "\\" + c.toString(8).padStart(3, "0") : String.fromCharCode(c)).join("") + ")";
}
var PdfWriter = class {
  pages = [];
  ops = [];
  y = PAGE_H - MARGIN;
  newPage() {
    if (this.ops.length) this.pages.push(this.ops.join("\n"));
    this.ops = [];
    this.y = PAGE_H - MARGIN;
  }
  ensure(height) {
    if (this.y - height < MARGIN) this.newPage();
  }
  text(line3, x, size, gray = 0) {
    let cx = x;
    const space = widthOf([32], size, false);
    for (const w of line3) {
      this.ops.push(`BT /${w.bold ? "F2" : "F1"} ${size} Tf ${gray} g ${cx.toFixed(2)} ${this.y.toFixed(2)} Td ${pdfString(w.codes)} Tj ET`);
      cx += widthOf(w.codes, size, w.bold) + space;
    }
  }
  paragraph(text, size, opts = {}) {
    const lh = size * 1.35;
    const x = MARGIN + (opts.indent ?? 0);
    const lines = wrap(opts.bold ? text.map((t) => ({ ...t, bold: true })) : text, size, PAGE_W - MARGIN - x);
    this.y -= opts.before ?? 0;
    this.ensure(lh * Math.min(lines.length, 2));
    for (const line3 of lines) {
      this.ensure(lh);
      this.y -= size;
      this.text(line3, x, size, opts.gray);
      this.y -= lh - size;
    }
    this.y -= opts.after ?? size * 0.5;
  }
  table(rows) {
    const size = 9.5;
    const lh = size * 1.3;
    const cols = Math.max(...rows.map((r) => r.length));
    const colW = (PAGE_W - 2 * MARGIN) / cols;
    rows.forEach((row, r) => {
      const cells = Array.from({ length: cols }, (_, c) => wrap(r === 0 ? (row[c] ?? []).map((t) => ({ ...t, bold: true })) : row[c] ?? [], size, colW - 8));
      const height = Math.max(...cells.map((c) => c.length)) * lh + 6;
      this.ensure(height);
      const top = this.y;
      cells.forEach((lines, c) => {
        this.y = top - 3;
        for (const line3 of lines) {
          this.y -= size;
          this.text(line3, MARGIN + c * colW + 4, size);
          this.y -= lh - size;
        }
      });
      this.y = top - height;
      this.ops.push(`0.75 G 0.5 w ${MARGIN} ${top.toFixed(2)} ${PAGE_W - 2 * MARGIN} ${(-height).toFixed(2)} re S`);
      for (let c = 1; c < cols; c++) this.ops.push(`${(MARGIN + c * colW).toFixed(2)} ${top.toFixed(2)} m ${(MARGIN + c * colW).toFixed(2)} ${this.y.toFixed(2)} l S`);
    });
    this.y -= 10;
  }
  finish() {
    this.newPage();
    const objects = [];
    const add2 = (o) => objects.push(o);
    add2("<< /Type /Catalog /Pages 2 0 R >>");
    add2("");
    add2("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
    add2("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
    const kids = [];
    this.pages.forEach((content, i) => {
      const footer = `BT /F1 8 Tf 0.5 g ${PAGE_W - MARGIN - 20} 30 Td (${i + 1}/${this.pages.length}) Tj ET`;
      const stream = deflateSync(Buffer.from(`${content}
${footer}`, "latin1"));
      add2(Buffer.concat([Buffer.from(`<< /Length ${stream.length} /Filter /FlateDecode >>
stream
`, "latin1"), stream, Buffer.from("\nendstream", "latin1")]));
      const contentId = objects.length;
      add2(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`);
      kids.push(objects.length);
    });
    objects[1] = `<< /Type /Pages /Kids [${kids.map((k) => `${k} 0 R`).join(" ")}] /Count ${kids.length} >>`;
    const chunks = [Buffer.from("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n", "latin1")];
    const offsets = [];
    let pos = chunks[0].length;
    objects.forEach((o, i) => {
      const body = Buffer.concat([Buffer.from(`${i + 1} 0 obj
`, "latin1"), typeof o === "string" ? Buffer.from(o, "latin1") : o, Buffer.from("\nendobj\n", "latin1")]);
      offsets.push(pos);
      chunks.push(body);
      pos += body.length;
    });
    const xref = [`xref
0 ${objects.length + 1}
0000000000 65535 f 
`, ...offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n 
`)].join("");
    chunks.push(Buffer.from(`${xref}trailer
<< /Size ${objects.length + 1} /Root 1 0 R >>
startxref
${pos}
%%EOF
`, "latin1"));
    return Buffer.concat(chunks);
  }
};
function toPdf(blocks) {
  const pdf = new PdfWriter();
  for (const b of blocks) {
    switch (b.kind) {
      case "heading":
        pdf.paragraph(b.text, b.level === 1 ? 20 : b.level === 2 ? 14 : 11.5, { bold: true, before: b.level === 1 ? 0 : 10, after: 6 });
        break;
      case "paragraph":
        pdf.paragraph(b.text, 10.5);
        break;
      case "quote":
        pdf.paragraph(b.text, 10, { indent: 14, gray: 0.35 });
        break;
      case "list":
        b.items.forEach((item, n) => pdf.paragraph([{ text: b.ordered ? `${n + 1}.` : "\u2022", bold: false }, ...item], 10.5, { indent: 12, after: 2 }));
        pdf.y -= 4;
        break;
      case "table":
        pdf.table(b.rows);
        break;
      case "pagebreak":
        pdf.newPage();
        break;
    }
  }
  return pdf.finish();
}

// engine/src/export.ts
var import_yaml5 = __toESM(require_dist(), 1);
import { existsSync as existsSync9, mkdirSync as mkdirSync5, readFileSync as readFileSync8, writeFileSync as writeFileSync6 } from "node:fs";
import { dirname as dirname2, join as join10 } from "node:path";
var EXPORTS_FILE = join10(MEP_DIR, "exports.yaml");
function exportHistory(root) {
  const file = join10(root, EXPORTS_FILE);
  return existsSync9(file) ? (0, import_yaml5.parse)(readFileSync8(file, "utf8")) ?? [] : [];
}
function exportData(root, profile, catalog, lang, q) {
  const evaluated = evaluate(profile, catalog);
  const active = evaluated.filter((e) => e.state === "active");
  const history = exportHistory(root);
  const previous = history[history.length - 1];
  const ids = active.map((e) => e.item.id).sort();
  const changes = previous ? {
    since: `v${previous.version}`,
    added: ids.filter((id) => !previous.items.includes(id)),
    removed: previous.items.filter((id) => !ids.includes(id)),
    capabilities_added: profile.capabilities.filter((c) => !previous.capabilities.includes(c)),
    capabilities_removed: previous.capabilities.filter((c) => !profile.capabilities.includes(c)),
    total_before: previous.total
  } : void 0;
  const top = (phase) => phase.split(".")[0];
  return {
    version: (previous?.version ?? 0) + 1,
    lang,
    date: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
    project: profile.project,
    profile: { type: profile.type, capabilities: profile.capabilities, markets: profile.markets, audience: profile.audience, context: profile.context, counts: profile.counts },
    included: { capabilities: profile.capabilities, custom_work: profile.custom_work ?? [], optional_chosen: active.filter((e) => e.level === "optional").map((e) => e.item.title) },
    out_of_scope: {
      capabilities_not_included: catalog.dimensions.capabilities.filter((c) => !profile.capabilities.includes(c)),
      optional_not_chosen: evaluated.filter((e) => e.state === "offered").map((e) => e.item.title),
      recommended_skipped: evaluated.filter((e) => e.state === "skipped").map((e) => ({ title: e.item.title, reason: e.reason }))
    },
    compliance: active.filter((e) => ["legal", "security", "accessibility", "privacy", "cookies"].includes(e.item.category)).map((e) => ({ title: e.item.title, category: e.item.category, references: e.item.references ?? [] })),
    stack: stackGroups(stack(profile, catalog)).map((g) => ({ decision: g.decisions.map((d) => `${d.key}: ${d.value}`).join(", "), why: g.why })),
    deliverables: Object.fromEntries(["foundation", "build", "launch"].map((p) => [p, active.filter((e) => top(e.item.phase) === p && e.level !== "optional").map((e) => e.item.title)])),
    quote: q ? { currency: q.currency, by_phase: q.byPhase, total: q.price, extras: q.extrasPrice, recurring: q.recurring, maintenance: q.maintenance } : void 0,
    acceptance_criteria: active.filter((e) => e.level === "required").map((e) => ({ id: e.item.id, title: e.item.title, how: e.item.how })),
    legal_note: lang.startsWith("es") ? "Checklist orientativo, no sustituye asesor\xEDa legal." : "Guidance checklist; not a substitute for legal advice.",
    changes
  };
}
function recordExport(root, profile, catalog, lang, files, total, version) {
  const all = exportHistory(root);
  const history = version === void 0 ? all : all.filter((r) => r.version !== version);
  const record = {
    version: version ?? (history[history.length - 1]?.version ?? 0) + 1,
    date: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
    lang,
    items: evaluate(profile, catalog).filter((e) => e.state === "active").map((e) => e.item.id).sort(),
    capabilities: [...profile.capabilities],
    total,
    files
  };
  mkdirSync5(dirname2(join10(root, EXPORTS_FILE)), { recursive: true });
  writeFileSync6(join10(root, EXPORTS_FILE), (0, import_yaml5.stringify)([...history, record].sort((a, b) => a.version - b.version), { lineWidth: 0 }));
  return record;
}

// engine/src/quote.ts
var import_yaml6 = __toESM(require_dist(), 1);
import { existsSync as existsSync10, mkdirSync as mkdirSync6, readFileSync as readFileSync9, readdirSync as readdirSync5, writeFileSync as writeFileSync7, appendFileSync as appendFileSync2 } from "node:fs";
import { homedir } from "node:os";
import { join as join11 } from "node:path";
function configDir(env = process.env) {
  return env.MEP_CONFIG_DIR ?? join11(homedir(), ".config", "mep-check");
}
var SIZE_HOURS = { XS: [0.5, 1], S: [1, 3], M: [3, 8], L: [8, 20], XL: [20, 40] };
var DEFAULT_RATES = {
  currency: "USD",
  hourly_rate: 0,
  pm_overhead: 0.1,
  risk_buffer: 0.2,
  rounding: 50,
  maintenance_plans: { basic: { price: 0, hours: 0 }, standard: { price: 0, hours: 0 }, premium: { price: 0, hours: 0 } }
};
var RATES_TEMPLATE = `# Tarifas de mep. Fuera del repo: nunca se entregan al cliente.
currency: USD
hourly_rate: 0        # define tu tarifa por hora
pm_overhead: 0.10     # gesti\xF3n de proyecto
risk_buffer: 0.20     # colch\xF3n de riesgo
rounding: 50          # redondear precios a m\xFAltiplos de 50
maintenance_plans:    # precio mensual; horas incluidas por mes
  basic:    { price: 0, hours: 0 }   # actualizaciones de seguridad + backups
  standard: { price: 0, hours: 0 }   # + cambios menores
  premium:  { price: 0, hours: 0 }   # + monitoreo y soporte prioritario
`;
function loadRates(env = process.env) {
  const file = join11(configDir(env), "rates.yaml");
  let created = false;
  if (!existsSync10(file)) {
    mkdirSync6(configDir(env), { recursive: true });
    writeFileSync7(file, RATES_TEMPLATE);
    created = true;
  }
  const raw = (0, import_yaml6.parse)(readFileSync9(file, "utf8")) ?? {};
  const rates = { ...DEFAULT_RATES, ...raw, maintenance_plans: { ...DEFAULT_RATES.maintenance_plans, ...raw.maintenance_plans } };
  return { rates, created, configured: rates.hourly_rate > 0 };
}
var add = (a, b) => [a[0] + b[0], a[1] + b[1]];
var scale = (a, k) => [a[0] * k, a[1] * k];
var round1 = (a) => [Math.round(a[0] * 10) / 10, Math.round(a[1] * 10) / 10];
function multiplier(item, profile) {
  const dim = item.effort.scales_with;
  if (!dim) return 1;
  const value = dim === "markets" ? profile.markets.length : profile.counts[dim];
  return Math.max(1, value ?? 1);
}
function line2(e, profile) {
  const k = multiplier(e.item, profile);
  return { id: e.item.id, title: e.item.title, phase: e.item.phase, hours: scale(e.item.effort.hours, k), multiplier: k };
}
function money(hours, rates) {
  const r = Math.max(1, rates.rounding);
  return [Math.ceil(hours[0] * rates.hourly_rate / r) * r, Math.ceil(hours[1] * rates.hourly_rate / r) * r];
}
function loaded(hours, rates) {
  return scale(hours, (1 + rates.pm_overhead) * (1 + rates.risk_buffer));
}
function recurringCosts(profile, catalog) {
  const file = join11(catalog.dir, "costs.yaml");
  if (!existsSync10(file)) return [];
  const table = (0, import_yaml6.parse)(readFileSync9(file, "utf8"));
  const out = Object.entries(table.always ?? {}).map(([key, c]) => ({ key, ...c }));
  for (const d of stack(profile, catalog)) {
    const cost = table.stack?.[`${d.key}.${d.value}`];
    if (cost) out.push({ key: `${d.key}.${d.value}`, ...cost });
  }
  return out;
}
function quote(profile, catalog, rates) {
  const evaluated = evaluate(profile, catalog);
  const lines = evaluated.filter((e) => e.state === "active").map((e) => line2(e, profile));
  for (const c of profile.custom_work ?? []) {
    lines.push({ id: `custom:${c.title}`, title: `${c.title} (estimaci\xF3n a revisar)`, phase: c.phase ?? "build.features", hours: SIZE_HOURS[c.size], multiplier: 1, custom: true });
  }
  const extras = evaluated.filter((e) => e.state === "offered").map((e) => line2(e, profile));
  const bySubphase = {};
  const byPhaseHours = {};
  for (const l of lines) {
    bySubphase[l.phase] = add(bySubphase[l.phase] ?? [0, 0], l.hours);
    const top = l.phase.split(".")[0];
    byPhaseHours[top] = add(byPhaseHours[top] ?? [0, 0], l.hours);
  }
  const subtotal = lines.reduce((acc, l) => add(acc, l.hours), [0, 0]);
  const pm = scale(subtotal, rates.pm_overhead);
  const risk = scale(add(subtotal, pm), rates.risk_buffer);
  const total = add(add(subtotal, pm), risk);
  const byPhase = Object.fromEntries(Object.entries(byPhaseHours).map(([k, v]) => [k, money(loaded(v, rates), rates)]));
  return {
    currency: rates.currency,
    lines,
    extras,
    bySubphase: Object.fromEntries(Object.entries(bySubphase).map(([k, v]) => [k, round1(v)])),
    subtotal: round1(subtotal),
    pm: round1(pm),
    risk: round1(risk),
    total: round1(total),
    // The total is the sum of the phase prices, so the client view always adds up.
    price: Object.values(byPhase).reduce((acc, r) => add(acc, r), [0, 0]),
    byPhase,
    extrasPrice: extras.map((x) => ({ id: x.id, title: x.title, price: money(loaded(x.hours, rates), rates) })),
    recurring: recurringCosts(profile, catalog),
    maintenance: profile.context === "client-project" ? rates.maintenance_plans : void 0
  };
}
var fmtH = (r) => `${r[0]}\u2013${r[1]} h`;
var fmtMoney = (r, c) => `${r[0].toLocaleString("en-US")}\u2013${r[1].toLocaleString("en-US")} ${c}`;
var PHASE_LABEL = { foundation: "Cimientos", build: "Construcci\xF3n", launch: "Lanzamiento" };
function formatInternal(q, rates, phases) {
  const out = [`Cotizaci\xF3n interna (${q.currency}, tarifa ${rates.hourly_rate}/h)`];
  for (const phase of phases) {
    const items = q.lines.filter((l) => l.phase === phase);
    if (!items.length) continue;
    out.push("", `${phase}  ${fmtH(q.bySubphase[phase])}`);
    for (const l of items) out.push(`  ${l.custom ? "\u270E" : "\xB7"} ${l.id}  ${fmtH(round1(l.hours))}${l.multiplier > 1 ? ` (\xD7${l.multiplier})` : ""}`);
  }
  out.push(
    "",
    `Subtotal          ${fmtH(q.subtotal)}`,
    `Gesti\xF3n (${Math.round(rates.pm_overhead * 100)}%)     ${fmtH(q.pm)}`,
    `Colch\xF3n (${Math.round(rates.risk_buffer * 100)}%)     ${fmtH(q.risk)}`,
    `Total             ${fmtH(q.total)}  \u2192  ${fmtMoney(q.price, q.currency)}`
  );
  if (q.extrasPrice.length) out.push("", "Extras opcionales:", ...q.extrasPrice.map((x) => `  \u26AA ${x.id}  ${fmtMoney(x.price, q.currency)}`));
  return out.join("\n");
}
function formatClient(q) {
  const out = ["Cotizaci\xF3n"];
  for (const [phase, price] of Object.entries(q.byPhase)) out.push(`  ${PHASE_LABEL[phase] ?? phase}: ${fmtMoney(price, q.currency)}`);
  out.push(`  Total: ${fmtMoney(q.price, q.currency)}`);
  if (q.extrasPrice.length) out.push("", "Extras opcionales:", ...q.extrasPrice.map((x) => `  ${x.title}: ${fmtMoney(x.price, q.currency)}`));
  if (q.recurring.length) {
    out.push("", "Costos recurrentes estimados (aparte del proyecto, mensuales, USD):");
    out.push(...q.recurring.map((r) => `  ${r.label}: ${r.monthly[0]}\u2013${r.monthly[1]}${r.note ? ` \u2014 ${r.note}` : ""}`));
  }
  if (q.maintenance) {
    out.push("", "Planes de mantenimiento (mensual):");
    const names = { basic: "B\xE1sico (seguridad + backups)", standard: "Est\xE1ndar (+ cambios menores)", premium: "Premium (+ monitoreo y soporte prioritario)" };
    for (const [k, p] of Object.entries(q.maintenance)) out.push(`  ${names[k]}: ${p.price.toLocaleString("en-US")} ${q.currency}${p.hours ? `, ${p.hours} h incluidas` : ""}`);
    out.push("  Horas adicionales y features nuevas se cotizan aparte.");
  }
  return out.join("\n");
}
function projectKey(profile) {
  return (profile.project || "proyecto").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "proyecto";
}
function saveQuote(profile, q, rates, env = process.env) {
  const dir = join11(configDir(env), "quotes", projectKey(profile));
  mkdirSync6(dir, { recursive: true });
  const file = join11(dir, `${(/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-")}.yaml`);
  writeFileSync7(file, (0, import_yaml6.stringify)({ profile: profile.project, catalog_version: profile.catalog_version, rates, quote: q }, { lineWidth: 0 }));
  return file;
}
function logTime(profile, id, hours, env = process.env) {
  const dir = join11(configDir(env), "actuals");
  mkdirSync6(dir, { recursive: true });
  const file = join11(dir, `${projectKey(profile)}.yaml`);
  appendFileSync2(file, (0, import_yaml6.stringify)([{ id, hours, date: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10), catalog_version: profile.catalog_version }]));
  return file;
}
function calibrate(catalog, env = process.env, minSamples = 3) {
  const dir = join11(configDir(env), "actuals");
  if (!existsSync10(dir)) return [];
  const byId = /* @__PURE__ */ new Map();
  for (const f of readdirSync5(dir).filter((f2) => f2.endsWith(".yaml"))) {
    for (const row of (0, import_yaml6.parse)(readFileSync9(join11(dir, f), "utf8")) ?? []) {
      byId.set(row.id, [...byId.get(row.id) ?? [], row.hours]);
    }
  }
  const out = [];
  for (const [id, hours] of byId) {
    const item = catalog.items.find((i) => i.id === id);
    if (!item || hours.length < minSamples) continue;
    const sorted = [...hours].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const [lo, hi] = item.effort.hours;
    if (median >= lo && median <= hi) continue;
    const p25 = sorted[Math.floor((sorted.length - 1) * 0.25)];
    const p75 = sorted[Math.ceil((sorted.length - 1) * 0.75)];
    out.push({ id, samples: hours.length, median, current: [lo, hi], suggested: [p25, p75] });
  }
  return out.sort((a, b) => a.id.localeCompare(b.id));
}

// engine/src/version.ts
function compareVersions(a, b) {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return Math.sign(d);
  }
  return 0;
}

// engine/src/update.ts
function catalogUpdates(profile, catalog) {
  const since = profile.catalog_version;
  const closed = new Set(profile.phase.closed);
  return evaluate(profile, catalog).filter((e) => compareVersions(e.item.since, since) > 0 || e.item.updated !== void 0 && compareVersions(e.item.updated, since) > 0).map((e) => ({ ...e, change: compareVersions(e.item.since, since) > 0 ? "new" : "modified", inClosedPhase: closed.has(e.item.phase) }));
}
function applyUpdate(profile, catalog) {
  const graced = catalogUpdates(profile, catalog).filter((u) => u.inClosedPhase && u.level === "required" && u.state === "active").map((u) => u.item.id);
  return {
    profile: { ...profile, catalog_version: catalog.version, selections: { ...profile.selections, grace: [.../* @__PURE__ */ new Set([...profile.selections.grace, ...graced])].sort() } },
    graced
  };
}

// engine/src/cli.ts
function parseArgs(argv) {
  const out = { _: [], flags: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const [k, v] = a.slice(2).split("=", 2);
      if (v !== void 0) out.flags[k] = v;
      else if (argv[i + 1] !== void 0 && !argv[i + 1].startsWith("--")) out.flags[k] = argv[++i];
      else out.flags[k] = true;
    } else out._.push(a);
  }
  return out;
}
function readInput(source) {
  if (source === void 0 || source === true || source === "-") return readFileSync10(0, "utf8");
  return readFileSync10(source, "utf8");
}
function proposedProfile(args, catalog) {
  const raw = (0, import_yaml7.parse)(readInput(args.flags.from)) ?? {};
  const presetName = args.flags.preset ?? raw.preset;
  const preset = presetName ? catalog.presets[presetName] : {};
  if (presetName && !preset) fail(`preset desconocido: ${presetName}. Disponibles: ${Object.keys(catalog.presets).join(", ")}`);
  const merged = {
    ...preset,
    ...raw,
    capabilities: [.../* @__PURE__ */ new Set([...preset?.capabilities ?? [], ...raw.capabilities ?? []])],
    signals: { ...preset?.signals, ...raw.signals },
    preset: presetName,
    catalog_version: catalog.version
  };
  const profile = normalizeProfile(merged, catalog);
  const errors = validateProfile(profile, catalog);
  if (errors.length) fail(`perfil inv\xE1lido:
- ${errors.join("\n- ")}`);
  return profile;
}
function fail(message, code = 1) {
  process.stderr.write(`${message}
`);
  process.exit(code);
}
function print(text) {
  process.stdout.write(text.endsWith("\n") ? text : `${text}
`);
}
function pluginRoot(catalog) {
  return dirname3(catalog.dir);
}
function requireProfile(root, catalog) {
  if (!hasProfile(root)) fail("Este proyecto no usa mep (falta .mep/profile.yaml). Empieza con /mep:scope.");
  return loadProfile(root, catalog);
}
function regenerate(root, profile, catalog) {
  const evaluated = evaluate(profile, catalog);
  const results = verifyItems(root, profile, evaluated, "fast");
  writeBrief(root, renderBrief(profile, evaluated, catalog, results));
}
function currentBranch(root) {
  try {
    return execSync3("git rev-parse --abbrev-ref HEAD", { cwd: root, stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return void 0;
  }
}
function hookInput() {
  try {
    return JSON.parse(readFileSync10(0, "utf8") || "{}");
  } catch {
    return {};
  }
}
function json(value) {
  print(JSON.stringify(value));
}
var fmtRange = (r, unit) => `${r[0].toLocaleString("en-US")}\u2013${r[1].toLocaleString("en-US")} ${unit}`;
var signed = (r, unit) => `${r[0] >= 0 ? "+" : ""}${r[0].toLocaleString("en-US")} a ${r[1] >= 0 ? "+" : ""}${r[1].toLocaleString("en-US")} ${unit}`;
function quoteOnScopeChange(profile, catalog) {
  const { rates, created, configured } = loadRates();
  const q = quote(profile, catalog, rates);
  if (!configured) return `Esfuerzo estimado: ${fmtRange(q.total, "h")}.${created ? " Se cre\xF3 ~/.config/mep-check/rates.yaml:" : ""} Define hourly_rate en ~/.config/mep-check/rates.yaml para ver precios.`;
  saveQuote(profile, q, rates);
  return `Cotizaci\xF3n: ${fmtRange(q.total, "h")} \xB7 ${fmtRange(q.price, q.currency)} (interna guardada fuera del repo; /mep:quote para el detalle).`;
}
function closePassingPhases(root, catalog) {
  const closed = [];
  for (const sub of catalog.dimensions.phases) {
    const r = closePhase(root, catalog, sub);
    if (!r.closed) break;
    closed.push(sub);
  }
  return closed;
}
function runHook(event, root, catalog) {
  const input = hookInput();
  const cwd = input.cwd ? resolve2(input.cwd) : root;
  if (!hasProfile(cwd)) return;
  switch (event) {
    case "session-start": {
      const profile = loadProfile(cwd, catalog);
      const results = verifyItems(cwd, profile, evaluate(profile, catalog), "fast");
      const c = counts(results);
      const active = results.filter((r) => r.state === "active" && r.level === "required" && r.item.phase === profile.phase.active && r.status !== "pass");
      const text = [
        `mep \xB7 sub-etapa activa: ${profile.phase.active} \xB7 pendientes \u{1F534} ${c.required} \xB7 \u{1F7E1} ${c.recommended}. Este proyecto se rige por BRIEF.md.`,
        ...active.slice(0, 5).map((r) => `  \u{1F534} ${r.item.id} \u2014 ${r.item.how}`),
        active.length > 5 ? `  \u2026 y ${active.length - 5} m\xE1s (/mep:check)` : ""
      ].filter(Boolean).join("\n");
      json({ systemMessage: text.split("\n")[0], hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: text } });
      return;
    }
    case "stop": {
      const result = gate(cwd, catalog, "stop");
      if (result.block && !input.stop_hook_active) json({ decision: "block", reason: result.message });
      else if (result.message) json({ systemMessage: result.message });
      return;
    }
    case "pre-bash": {
      const command = String(input.tool_input?.command ?? "");
      if (!mayDeploy(command)) return;
      const kind = deployKind(command, currentBranch(cwd));
      if (!kind) return;
      const result = cachedGate(cwd, catalog, kind);
      if (result.block) {
        json({ hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: result.message } });
      }
      return;
    }
    case "post-edit": {
      const file = String(input.tool_input?.file_path ?? "");
      const rel = file.startsWith(cwd) ? file.slice(cwd.length + 1) : file;
      if (!catalog.sensitivePaths.some((p) => globToRegExp(p).test(rel))) return;
      json({
        hookSpecificOutput: {
          hookEventName: "PostToolUse",
          additionalContext: `mep: ${rel} es un archivo sensible. Al terminar este cambio, pide al agente mep-security que lo audite; su reporte en .mep/security/ es lo que da por cumplidos los \xEDtems de seguridad.`
        }
      });
      return;
    }
    default:
      fail(`hook desconocido: ${event}`);
  }
}
function main() {
  const args = parseArgs(process.argv.slice(2));
  const [cmd, ...rest] = args._;
  const root = resolve2(args.flags.cwd ?? process.cwd());
  const catalog = loadCatalog(args.flags.catalog ? resolve2(args.flags.catalog) : void 0);
  switch (cmd) {
    case "evaluate": {
      const profile = args.flags.from ? proposedProfile(args, catalog) : requireProfile(root, catalog);
      const evaluated = evaluate(profile, catalog);
      if (args.flags.json) return json({ profile, items: evaluated.map((e) => ({ id: e.item.id, level: e.level, state: e.state, phase: e.item.phase, category: e.item.category })), warnings: warnings(evaluated) });
      return print(formatProposal(evaluated));
    }
    case "init": {
      if (hasProfile(root) && !args.flags.force) fail("Ya existe .mep/profile.yaml. Usa /mep:add para cambiar el scope (o --force).");
      const profile = proposedProfile(args, catalog);
      saveProfile(root, profile);
      regenerate(root, profile, catalog);
      const adrs = writeStackAdrs(root, profile, catalog);
      const linked = linkClaudeMd(root, readFileSync10(join12(pluginRoot(catalog), "templates", "claude-md.md"), "utf8"));
      const ci = join12(root, ".github", "workflows", "mep.yml");
      if (!existsSync11(ci)) {
        mkdirSync7(dirname3(ci), { recursive: true });
        writeFileSync8(ci, readFileSync10(join12(pluginRoot(catalog), "templates", "ci", "mep.yml"), "utf8"));
      }
      log(root, "init", `${profile.type} (${profile.capabilities.join(",")})`);
      const closed = args.flags["close-passing"] ? closePassingPhases(root, catalog) : [];
      if (closed.length) regenerate(root, loadProfile(root, catalog), catalog);
      return print(
        [
          `\u2705 .mep/profile.yaml y BRIEF.md creados. ADRs: ${adrs.length}. CLAUDE.md ${linked ? "enlazado" : "ya estaba enlazado"}. CI: .github/workflows/mep.yml.`,
          closed.length ? `Sub-etapas ya cumplidas y cerradas: ${closed.join(", ")}.` : "",
          quoteOnScopeChange(loadProfile(root, catalog), catalog)
        ].filter(Boolean).join("\n")
      );
    }
    case "render": {
      const profile = requireProfile(root, catalog);
      regenerate(root, profile, catalog);
      const adrs = writeStackAdrs(root, profile, catalog);
      return print(`BRIEF.md regenerado.${adrs.length ? ` ADRs nuevos: ${adrs.join(", ")}` : ""}`);
    }
    case "add": {
      const before = requireProfile(root, catalog);
      const proposed = (0, import_yaml7.parse)(readInput(args.flags.from)) ?? {};
      const after = normalizeProfile({ ...before, ...proposed, phase: before.phase, selections: before.selections }, catalog);
      const errors = validateProfile(after, catalog);
      if (errors.length) fail(`perfil inv\xE1lido:
- ${errors.join("\n- ")}`);
      const changes = diff(before, after, catalog);
      const labels = { new: "\uFF0B nuevo", raised: "\u2191 sube", lowered: "\u2193 baja", removed: "\uFF0D deja de aplicar" };
      const text = changes.length ? changes.map((c) => `${labels[c.change]}  ${c.id} \u2014 ${c.title}${c.from ? ` (${c.from}${c.to ? ` \u2192 ${c.to}` : ""})` : c.to ? ` (${c.to})` : ""}`).join("\n") : "Sin cambios en el checklist.";
      if (args.flags.json) return json(changes);
      const { rates, configured } = loadRates();
      const qa = quote(before, catalog, rates);
      const qb = quote(after, catalog, rates);
      const impact = `Impacto: ${signed([qb.total[0] - qa.total[0], qb.total[1] - qa.total[1]], "h")}${configured ? ` \xB7 ${signed([qb.price[0] - qa.price[0], qb.price[1] - qa.price[1]], qb.currency)}` : ""}`;
      if (args.flags.apply) {
        saveProfile(root, after);
        regenerate(root, after, catalog);
        writeStackAdrs(root, after, catalog);
        log(root, "add", changes.map((c) => `${c.change}:${c.id}`).join(","));
        return print(`${text}
${impact}

\u2705 Perfil actualizado y BRIEF.md regenerado.
${quoteOnScopeChange(after, catalog)}`);
      }
      return print(`${text}
${impact}`);
    }
    case "check": {
      const profile = requireProfile(root, catalog);
      const mode = args.flags.fast ? "fast" : "full";
      const results = verifyItems(root, profile, evaluate(profile, catalog), mode);
      const signals = missingSignals(root, profile, catalog);
      if (args.flags.json) return json({ counts: counts(results), results: results.map((r) => ({ id: r.item.id, level: r.level, state: r.state, status: r.status, phase: r.item.phase })), signals });
      const parts = [formatCheck(results, profile, catalog, { verbose: Boolean(args.flags.all) })];
      const c = counts(results);
      parts.push(`
Pendientes: \u{1F534} ${c.required} \xB7 \u{1F7E1} ${c.recommended}`);
      if (signals.length) {
        parts.push(`
\u26A0\uFE0F El c\xF3digo muestra se\xF1ales que el perfil no tiene (prop\xF3n actualizarlo con /mep:add):
${signals.map((s) => `  - ${s.signal} (${s.evidence})`).join("\n")}`);
      }
      return print(parts.join("\n"));
    }
    case "verify": {
      if (!hasProfile(root)) return print("mep: sin .mep/profile.yaml, nada que verificar.");
      const kind = args.flags.prod ? "prod" : "stop";
      const result = args.flags["no-cache"] ? gate(root, catalog, kind) : cachedGate(root, catalog, kind);
      print(result.message || "\u2705 mep: sin \u{1F534} pendientes que bloqueen.");
      process.exitCode = result.block ? 1 : 0;
      return;
    }
    case "status": {
      if (!hasProfile(root)) return args.flags.json ? json(null) : void 0;
      const profile = loadProfile(root, catalog);
      const c = counts(verifyItems(root, profile, evaluate(profile, catalog), "fast"));
      if (args.flags.json) return json({ phase: profile.phase.active, ...c });
      return print(`mep \xB7 ${profile.phase.active} \xB7 \u{1F534} ${c.required} \xB7 \u{1F7E1} ${c.recommended}`);
    }
    case "phase": {
      const profile = requireProfile(root, catalog);
      if (rest[0] === "close") {
        if (!rest[1]) fail("Uso: mep phase close <sub-etapa>");
        const result = closePhase(root, catalog, rest[1]);
        if (result.closed) regenerate(root, result.profile, catalog);
        print(result.message);
        process.exitCode = result.closed ? 0 : 1;
        return;
      }
      const results = verifyItems(root, profile, evaluate(profile, catalog), "full");
      const pending = results.filter((r) => r.state === "active" && r.level === "required" && r.item.phase === profile.phase.active && r.status !== "pass");
      const lines = catalog.dimensions.phases.map((p) => `${profile.phase.closed.includes(p) ? "\u2705" : p === profile.phase.active ? "\u25B6\uFE0F" : "\xB7"} ${p}`);
      return print(
        [`Sub-etapa activa: ${profile.phase.active}`, lines.join("\n"), pending.length ? `
Para cerrarla faltan ${pending.length} \u{1F534}:
${formatItems(pending)}` : `
\u2705 Lista para cerrar: /mep:phase close ${profile.phase.active}`].join("\n")
      );
    }
    case "skip":
    case "override": {
      const [id, ...reasonParts] = rest;
      const reason = reasonParts.join(" ").trim();
      if (!id || !reason) fail(`Uso: mep ${cmd} <id> <raz\xF3n>`);
      const profile = requireProfile(root, catalog);
      const e = evaluate(profile, catalog).find((x) => x.item.id === id);
      if (!e) fail(`${id} no aplica a este perfil`);
      if (cmd === "skip") {
        if (e.level !== "recommended") fail(`/mep:skip solo acepta \u{1F7E1}. ${id} es ${e.level}${e.level === "required" ? ": usa /mep:override" : ""}.`);
        profile.selections.recommended_skipped = profile.selections.recommended_skipped.filter((s) => s.id !== id).concat({ id, reason, date: today() });
      } else {
        if (e.item.locked) fail(`${id} es locked \u{1F512}: no se puede desactivar.`);
        if (e.level !== "required") fail(`/mep:override solo aplica a \u{1F534}. ${id} es ${e.level}${e.level === "recommended" ? ": usa /mep:skip" : ""}.`);
        if (!args.flags.yes) fail(`Desactivar ${id} requiere confirmaci\xF3n expl\xEDcita (--yes).`, 2);
        profile.selections.overrides = profile.selections.overrides.filter((s) => s.id !== id).concat({ id, reason, date: today() });
      }
      saveProfile(root, profile);
      log(root, cmd, `${id} "${reason}"`);
      regenerate(root, profile, catalog);
      return print(cmd === "skip" ? `\u23ED\uFE0F ${id} omitido: ${reason}` : `\u26A0\uFE0F ${id} desactivado: ${reason} (registrado en .mep/log)`);
    }
    case "select": {
      const profile = requireProfile(root, catalog);
      const evaluated = evaluate(profile, catalog);
      for (const id of rest) {
        const e = evaluated.find((x) => x.item.id === id);
        if (!e || e.level !== "optional") fail(`${id} no es un \u26AA opcional de este perfil`);
      }
      profile.selections.optional_added = [.../* @__PURE__ */ new Set([...profile.selections.optional_added, ...rest])].sort();
      saveProfile(root, profile);
      regenerate(root, profile, catalog);
      return print(`\u26AA agregados: ${rest.join(", ")}`);
    }
    case "confirm": {
      const [id] = rest;
      const by = args.flags.by;
      if (!id || !by) fail("Uso: mep confirm <id> --by <nombre>");
      const profile = requireProfile(root, catalog);
      const e = evaluate(profile, catalog).find((x) => x.item.id === id);
      if (!e?.item.verify.some((v) => v.type === "manual")) fail(`${id} no tiene verificaci\xF3n manual`);
      if (e.item.category === "security") fail(`${id} es de seguridad: lo confirma una auditor\xEDa de mep-security, no una persona.`);
      profile.selections.manual_confirmed = profile.selections.manual_confirmed.filter((c) => c.id !== id).concat({ id, by, date: today() });
      saveProfile(root, profile);
      regenerate(root, profile, catalog);
      return print(`\u2705 ${id} confirmado por ${by}`);
    }
    case "security": {
      requireProfile(root, catalog);
      if (rest[0] === "record") {
        const id = args.flags.id;
        const result = args.flags.result;
        if (!id || !["pass", "fail", "risk"].includes(result)) fail('Uso: mep security record --id <id> --result pass|fail|risk --files a,b --notes "..."');
        if (!catalog.items.some((i) => i.id === id && i.category === "security")) fail(`${id} no es un \xEDtem de seguridad`);
        const files = String(args.flags.files ?? "").split(",").map((f) => f.trim()).filter(Boolean);
        const missing = files.filter((f) => !matchFiles(root, f).length && !existsSync11(join12(root, f)));
        if (missing.length) fail(`archivos inexistentes: ${missing.join(", ")}`);
        recordReport(root, { id, result, files, notes: String(args.flags.notes ?? "") });
        return print(`reporte de ${id}: ${result}`);
      }
      const profile = loadProfile(root, catalog);
      const ids = evaluate(profile, catalog).filter((e) => e.state === "active" && e.item.category === "security").map((e) => e.item.id);
      return print(ids.map((id) => `${reportState(root, id).valid ? "\u2705" : "\u274C"} ${id} \u2014 ${reportState(root, id).detail}`).join("\n"));
    }
    case "audit": {
      if (!args.flags.from) {
        const { profile: profile2, evidence } = inferProfile(root, catalog);
        if (args.flags.json) return json({ profile: profile2, evidence });
        const { phase, selections, version, catalog_version, ...shown } = profile2;
        return print(`${(0, import_yaml7.stringify)(shown, { lineWidth: 0 }).trim()}

Evidencia:
${Object.entries(evidence).map(([k, v]) => `  ${k}: ${v}`).join("\n")}`);
      }
      const profile = proposedProfile(args, catalog);
      const results = gapReport(root, profile, catalog);
      const c = counts(results);
      if (args.flags.json) return json({ counts: c, results: results.map((r) => ({ id: r.item.id, level: r.level, phase: r.item.phase, status: r.status })) });
      const passing = catalog.dimensions.phases.filter((p) => results.every((r) => r.item.phase !== p || r.level !== "required" || r.status === "pass"));
      return print(
        [
          `Reporte de brecha (nada se bloquea hasta adoptar el brief)`,
          formatCheck(results, profile, catalog),
          `
Pendientes: \u{1F534} ${c.required} \xB7 \u{1F7E1} ${c.recommended}`,
          passing.length ? `Sub-etapas que ya cumplen sus \u{1F534}: ${passing.join(", ")}` : ""
        ].filter(Boolean).join("\n")
      );
    }
    case "update": {
      const profile = requireProfile(root, catalog);
      const updates = catalogUpdates(profile, catalog);
      if (args.flags.json) return json(updates.map((u) => ({ id: u.item.id, change: u.change, level: u.level, phase: u.item.phase, inClosedPhase: u.inClosedPhase })));
      if (!updates.length && profile.catalog_version === catalog.version) return print(`Cat\xE1logo al d\xEDa (${catalog.version}).`);
      const list = updates.map((u) => `${u.change === "new" ? "\uFF0B" : "\u270E"} ${LEVEL_ICON[u.level]} ${u.item.id} (${u.item.phase}${u.inClosedPhase ? ", sub-etapa cerrada" : ""}) \u2014 ${u.item.title}`);
      const head = `Cat\xE1logo ${profile.catalog_version} \u2192 ${catalog.version}: ${updates.length} \xEDtem(s) nuevos o modificados que aplican a este perfil.`;
      if (!args.flags.apply) return print([head, ...list].join("\n"));
      const { profile: next, graced } = applyUpdate(profile, catalog);
      saveProfile(root, next);
      regenerate(root, next, catalog);
      log(root, "update", `${profile.catalog_version}->${catalog.version} grace:${graced.join(",")}`);
      return print([head, ...list, "", `\u2705 Perfil en cat\xE1logo ${catalog.version}.`, graced.length ? `Periodo de gracia (no bloquean hasta el siguiente cierre o el deploy a producci\xF3n): ${graced.join(", ")}` : ""].filter(Boolean).join("\n"));
    }
    case "registry": {
      if (args.flags.check) {
        const errors = checkRegistry(root);
        print(errors.length ? `\u274C REGISTRY.md desactualizado:
${errors.map((e) => `  - ${e}`).join("\n")}` : "\u2705 REGISTRY.md al d\xEDa");
        process.exitCode = errors.length ? 1 : 0;
        return;
      }
      const r = writeRegistry(root);
      return print(`REGISTRY.md: ${r.entries} piezas${r.undocumented ? `, ${r.undocumented} sin "Para qu\xE9" (escr\xEDbelo en su comentario /** */)` : ""}.`);
    }
    case "codemap": {
      if (args.flags.check) {
        const errors = checkCodemap(root);
        print(errors.length ? `\u274C ${errors.join("\n")}` : "\u2705 CODEMAP.md al d\xEDa");
        process.exitCode = errors.length ? 1 : 0;
        return;
      }
      writeCodemap(root, catalog);
      return print("CODEMAP.md regenerado (las notas manuales se conservan).");
    }
    case "quote": {
      const profile = requireProfile(root, catalog);
      const { rates, created, configured } = loadRates();
      const q = quote(profile, catalog, rates);
      if (args.flags.json) return json(args.flags.client ? { byPhase: q.byPhase, total: q.price, extras: q.extrasPrice, recurring: q.recurring, maintenance: q.maintenance, currency: q.currency } : q);
      if (args.flags.save && configured) saveQuote(profile, q, rates);
      const warn = configured ? "" : `

\u26A0\uFE0F hourly_rate es 0${created ? " (se cre\xF3 la plantilla)" : ""}: define tu tarifa en ~/.config/mep-check/rates.yaml.`;
      return print((args.flags.client ? formatClient(q) : formatInternal(q, rates, catalog.dimensions.phases)) + warn);
    }
    case "log-time": {
      const [id, hoursText] = rest;
      const hours = Number(hoursText);
      if (!id || !(hours > 0)) fail("Uso: mep log-time <id> <horas>");
      const profile = requireProfile(root, catalog);
      if (!catalog.items.some((i) => i.id === id) && !id.startsWith("custom:")) fail(`${id} no es un \xEDtem del cat\xE1logo (para trabajo a la medida usa custom:<nombre>)`);
      logTime(profile, id, hours);
      const item = catalog.items.find((i) => i.id === id);
      return print(`\u23F1\uFE0F ${id}: ${hours} h registradas fuera del repo.${item ? ` Rango del cat\xE1logo: ${item.effort.hours[0]}\u2013${item.effort.hours[1]} h.` : ""}`);
    }
    case "calibrate": {
      const suggestions = calibrate(catalog);
      if (args.flags.json) return json(suggestions);
      return print(
        suggestions.length ? ["Sugerencias de ajuste (mediana fuera del rango, 3+ mediciones):", ...suggestions.map((s) => `  ${s.id}: ${s.current[0]}\u2013${s.current[1]} h \u2192 ${s.suggested[0]}\u2013${s.suggested[1]} h (mediana ${s.median} h, ${s.samples} mediciones)`)].join("\n") : "Sin sugerencias: faltan mediciones o los rangos ya coinciden con las horas reales."
      );
    }
    case "export-data": {
      const profile = requireProfile(root, catalog);
      const { rates, configured } = loadRates();
      return json(exportData(root, profile, catalog, String(args.flags.lang ?? "es"), configured ? quote(profile, catalog, rates) : void 0));
    }
    case "export": {
      const profile = requireProfile(root, catalog);
      const input = args.flags.in;
      if (!input || !existsSync11(join12(root, input))) fail("Uso: mep export --in docs/client/brief-vN.md [--format docx|pdf|both] [--lang es]");
      const format = String(args.flags.format ?? "both");
      const blocks = parseMarkdown(readFileSync10(join12(root, input), "utf8"));
      const base = join12(root, dirname3(input), basename(input).replace(/\.md$/, ""));
      const files = [];
      if (format === "docx" || format === "both") {
        writeFileSync8(`${base}.docx`, toDocx(blocks));
        files.push(`${base}.docx`.slice(root.length + 1));
      }
      if (format === "pdf" || format === "both") {
        writeFileSync8(`${base}.pdf`, toPdf(blocks));
        files.push(`${base}.pdf`.slice(root.length + 1));
      }
      const { rates, configured } = loadRates();
      const fromName = basename(input).match(/-v(\d+)\.md$/)?.[1];
      const record = recordExport(root, profile, catalog, String(args.flags.lang ?? "es"), files, configured ? quote(profile, catalog, rates).price : void 0, fromName ? Number(fromName) : void 0);
      return print(`\u{1F4C4} Brief v${record.version} para el cliente: ${files.join(", ")}`);
    }
    case "signals": {
      const profile = requireProfile(root, catalog);
      return json(missingSignals(root, profile, catalog));
    }
    case "presets":
      return print(Object.entries(catalog.presets).map(([k, v]) => `${k}: ${v.type} \u2014 ${(v.capabilities ?? []).join(", ")}`).join("\n"));
    case "hook":
      return runHook(rest[0], root, catalog);
    case "version":
      return print(`cat\xE1logo ${catalog.version}`);
    default:
      print(
        [
          "mep <comando>",
          "  evaluate [--from perfil.yaml] [--preset x] [--json]   \xEDtems que aplican",
          "  init --from perfil.yaml [--preset x]                  crea perfil, BRIEF.md, ADRs, CLAUDE.md y CI",
          "  add --from cambio.yaml [--apply]                      diff del checklist",
          "  check [--fast] [--all] [--json]                       verificaci\xF3n por sub-etapa",
          "  verify [--prod]                                       gate para CI (sale con 1 si bloquea)",
          "  phase [close <sub-etapa>]",
          "  skip <id> <raz\xF3n> \xB7 override <id> <raz\xF3n> --yes \xB7 select <id\u2026> \xB7 confirm <id> --by <nombre>",
          "  security [record --id --result --files --notes]",
          "  audit [--from perfil.yaml]                            infiere el perfil / reporte de brecha (no escribe nada)",
          "  update [--apply]                                      \xEDtems nuevos del cat\xE1logo que aplican",
          "  registry [--check] \xB7 codemap [--check]                mapas de referencia",
          "  quote [--client] [--save] \xB7 log-time <id> <horas> \xB7 calibrate",
          "  export-data [--lang es] \xB7 export --in <md> [--format docx|pdf|both]",
          "  render \xB7 status \xB7 signals \xB7 presets \xB7 version",
          "  hook <session-start|stop|pre-bash|post-edit>          hooks cl\xE1sicos (stdin JSON)"
        ].join("\n")
      );
      if (cmd) process.exitCode = 1;
  }
}
main();
