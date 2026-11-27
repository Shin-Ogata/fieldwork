/*!
 * @cdp/extension-i18n 0.9.22
 *   extension for internationalization
 */

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory((global.CDP = global.CDP || {}, global.CDP.Exension = global.CDP.Exension || {})));
})(this, (function (exports) { 'use strict';

  const isString = (obj) => typeof obj === 'string';

  // http://lea.verou.me/2016/12/resolve-promises-externally-with-this-one-weird-trick/
  const defer = () => {
    let res;
    let rej;

    const promise = new Promise((resolve, reject) => {
      res = resolve;
      rej = reject;
    });

    promise.resolve = res;
    promise.reject = rej;

    return promise;
  };

  const makeString = (object) => {
    if (object == null) return '';
    return String(object);
  };

  // The shape of a language code that i18next accepts from outside (lng, changeLanguage, detectors) unless it is
  // configured; other codes are refused. Not a BCP 47 check: 'en_US', 'zh_Hant_TW', 'sr@latin' and 'de_DE.UTF-8' pass; markup, slashes, spaces,
  // '..', prototype keys and codes over 128 characters do not. Exported for plugins (detectors, backends, middleware).
  const isSafeLanguageCode = (code) =>
    isString(code) &&
    /^[A-Za-z0-9_@.-]{1,128}$/.test(code) &&
    !code.includes('..') &&
    !['__proto__', 'constructor', 'prototype'].includes(code);

  // A plugin declares its calling convention with `callbackApi` (instance or static property):
  // true for callbacks, false for promises (or sync values), undefined to have it guessed from Function.length
  const callbackApiOf = (plugin) => plugin?.callbackApi ?? plugin?.constructor?.callbackApi;

  const copy = (a, s, t) => {
    a.forEach((m) => {
      if (s[m]) t[m] = s[m];
    });
  };

  // We extract out the RegExp definition to improve performance with React Native Android, which has poor RegExp
  // initialization performance
  const lastOfPathSeparatorRegExp = /###/g;

  const cleanKey = (key) =>
    key && key.includes('###') ? key.replace(lastOfPathSeparatorRegExp, '.') : key;

  // only objects (and functions) hold keys: a string, number or boolean below a key ends the path,
  // so setPath keeps the rest flat instead of throwing on the primitive
  const canNotTraverseDeeper = (object) =>
    !object || (typeof object !== 'object' && typeof object !== 'function');

  const getLastOfPath = (object, path, Empty) => {
    const stack = !isString(path) ? path : path.split('.');
    let stackIndex = 0;
    // iterate through the stack, but leave the last item
    while (stackIndex < stack.length - 1) {
      if (canNotTraverseDeeper(object)) return {};

      const key = cleanKey(stack[stackIndex]);
      if (!object[key] && Empty) object[key] = new Empty();
      // prevent prototype pollution
      if (Object.prototype.hasOwnProperty.call(object, key)) {
        object = object[key];
      } else {
        object = {};
      }
      ++stackIndex;
    }

    if (canNotTraverseDeeper(object)) return {};
    return {
      obj: object,
      k: cleanKey(stack[stackIndex]),
    };
  };

  const setPath = (object, path, newValue) => {
    const { obj, k } = getLastOfPath(object, path, Object);
    // an array's length takes no value (`Invalid array length`): such a key stays flat too
    if ((obj !== undefined && !(Array.isArray(obj) && k === 'length')) || path.length === 1) {
      obj[k] = newValue;
      return;
    }

    let e = path[path.length - 1];
    let p = path.slice(0, path.length - 1);
    let last = getLastOfPath(object, p, Object);
    while (last.obj === undefined && p.length) {
      e = `${p[p.length - 1]}.${e}`;
      p = p.slice(0, p.length - 1);
      last = getLastOfPath(object, p, Object);
      if (last?.obj && typeof last.obj[`${last.k}.${e}`] !== 'undefined') {
        last.obj = undefined;
      }
    }
    last.obj[`${last.k}.${e}`] = newValue;
  };

  const pushPath = (object, path, newValue, concat) => {
    const { obj, k } = getLastOfPath(object, path, Object);

    // own keys only: a language code from a request can name an inherited property (`hasOwnProperty`)
    if (!Object.prototype.hasOwnProperty.call(obj, k) || !obj[k]) obj[k] = [];
    obj[k].push(newValue);
  };

  const getPath = (object, path) => {
    const { obj, k } = getLastOfPath(object, path);

    if (!obj) return undefined;
    if (!Object.prototype.hasOwnProperty.call(obj, k)) return undefined;
    return obj[k];
  };

  const getPathWithDefaults = (data, defaultData, key) => {
    const value = getPath(data, key);
    if (value !== undefined) {
      return value;
    }
    // Fallback to default values
    return getPath(defaultData, key);
  };

  const isLeaf = (value) => value === null || typeof value !== 'object' || value instanceof String;

  const deepExtend = (target, source, overwrite) => {
    for (const prop in source) {
      if (prop !== '__proto__' && prop !== 'constructor') {
        if (Object.prototype.hasOwnProperty.call(target, prop)) {
          // If we reached a leaf (string, number, boolean or null) in target or source then replace with source or skip depending on the 'overwrite' switch
          if (isLeaf(target[prop]) || isLeaf(source[prop])) {
            if (overwrite) target[prop] = source[prop];
          } else {
            deepExtend(target[prop], source[prop], overwrite);
          }
        } else {
          target[prop] = source[prop];
        }
      }
    }
    return target;
  };

  const regexEscape = (str) =>
    /* eslint no-useless-escape: 0 */
    str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');

  const _entityMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };

  const escape = (data) => {
    if (isString(data)) {
      return data.replace(/[&<>"']/g, (s) => _entityMap[s]);
    }

    return data;
  };

  /**
   * This is a reusable regular expression cache class. Given a certain maximum number of regular expressions we're
   * allowed to store in the cache, it provides a way to avoid recreating regular expression objects over and over.
   * When it needs to evict something, it evicts the oldest one.
   */
  class RegExpCache {
    constructor(capacity) {
      this.capacity = capacity;
      this.regExpMap = new Map();
      // Since our capacity tends to be fairly small, `.shift()` will be fairly quick despite being O(n). We just use a
      // normal array to keep it simple.
      this.regExpQueue = [];
    }

    getRegExp(pattern) {
      const regExpFromCache = this.regExpMap.get(pattern);
      if (regExpFromCache !== undefined) {
        return regExpFromCache;
      }
      const regExpNew = new RegExp(pattern);
      if (this.regExpQueue.length === this.capacity) {
        this.regExpMap.delete(this.regExpQueue.shift());
      }
      this.regExpMap.set(pattern, regExpNew);
      this.regExpQueue.push(pattern);
      return regExpNew;
    }
  }

  const chars = [' ', ',', '?', '!', ';'];
  // We cache RegExps to improve performance with React Native Android, which has poor RegExp initialization performance.
  // Capacity of 20 should be plenty, as nsSeparator/keySeparator don't tend to vary much across calls.
  const looksLikeObjectPathRegExpCache = new RegExpCache(20);

  const looksLikeObjectPath = (key, nsSeparator, keySeparator) => {
    nsSeparator = nsSeparator || '';
    keySeparator = keySeparator || '';
    const possibleChars = chars.filter((c) => !nsSeparator.includes(c) && !keySeparator.includes(c));
    if (possibleChars.length === 0) return true;
    const r = looksLikeObjectPathRegExpCache.getRegExp(
      `(${possibleChars.map((c) => (c === '?' ? '\\?' : c)).join('|')})`,
    );
    let matched = !r.test(key);
    if (!matched) {
      const ki = key.indexOf(keySeparator);
      if (ki > 0 && !r.test(key.substring(0, ki))) {
        matched = true;
      }
    }
    return matched;
  };

  /**
   * Given
   *
   * 1. a top level object obj, and
   * 2. a path to a deeply nested string or object within it
   *
   * Find and return that deeply nested string or object. The caveat is that the keys of objects within the nesting chain
   * may contain period characters. Therefore, we need to DFS and explore all possible keys at each step until we find the
   * deeply nested string or object.
   */
  const deepFind = (obj, path, keySeparator = '.') => {
    if (!obj) return undefined;
    if (obj[path]) {
      if (!Object.prototype.hasOwnProperty.call(obj, path)) return undefined;
      return obj[path];
    }
    // keySeparator: false means flat keys only, there is nothing to split (not even at the text 'false')
    if (!keySeparator) {
      return Object.prototype.hasOwnProperty.call(obj, path) ? obj[path] : undefined;
    }
    const tokens = path.split(keySeparator);
    let current = obj;
    for (let i = 0; i < tokens.length;) {
      if (!current || typeof current !== 'object') {
        return undefined;
      }
      let next;
      let nextPath = '';
      for (let j = i; j < tokens.length; ++j) {
        if (j !== i) {
          nextPath += keySeparator;
        }
        nextPath += tokens[j];
        next = current[nextPath];
        // like the top-level lookup above, don't resolve to built-in methods such as
        // `constructor` or `toString`, which would be printed as function source,
        // and don't walk into the prototype via `__proto__`
        if (
          (typeof next === 'function' || nextPath === '__proto__') &&
          !Object.prototype.hasOwnProperty.call(current, nextPath)
        ) {
          next = undefined;
        }
        if (next !== undefined) {
          if (['string', 'number', 'boolean'].includes(typeof next) && j < tokens.length - 1) {
            continue;
          }
          i += j - i + 1;
          break;
        }
      }
      current = next;
    }
    return current;
  };

  const getCleanedCode = (code) => code?.replace(/_/g, '-');

  const consoleLogger = {
    type: 'logger',

    log(args) {
      this.output('log', args);
    },

    warn(args) {
      this.output('warn', args);
    },

    error(args) {
      this.output('error', args);
    },

    output(type, args) {
      /* eslint no-console: 0 */
      console?.[type]?.apply?.(console, args);
    },
  };

  // Each i18next instance has its own Logger (clones share their parent's); the default export serves
  // the classes when they are used without an instance.
  class Logger {
    constructor(concreteLogger, options = {}) {
      this.init(concreteLogger, options);
    }

    init(concreteLogger, options = {}) {
      this.prefix = options.prefix || 'i18next:';
      this.logger = concreteLogger || consoleLogger;
      this.options = options;
      this.debug = options.debug;
      this.seen = new Set();
    }

    log(...args) {
      return this.forward(args, 'log', '', true);
    }

    warn(...args) {
      return this.forward(args, 'warn', '', true);
    }

    error(...args) {
      return this.forward(args, 'error', '');
    }

    deprecate(...args) {
      return this.forward(args, 'warn', 'WARNING DEPRECATED: ', true);
    }

    // A debug message logged once per key. ponytail: remembers 1000 keys per logger, then stays quiet
    once(key, lvl, ...args) {
      if (!this.debug || this.seen.has(key) || this.seen.size >= 1000) return null;
      this.seen.add(key);
      return this[lvl](...args);
    }

    forward(args, lvl, prefix, debugOnly) {
      if (debugOnly && !this.debug) return null;
      // Strip control characters from string args to prevent log forging via
      // user-controlled translation keys, languages, namespaces, or interpolation
      // variable names (CWE-117).
      // eslint-disable-next-line no-control-regex
      args = args.map((a) => (isString(a) ? a.replace(/[\r\n\x00-\x1F\x7F]/g, ' ') : a));
      if (isString(args[0])) args[0] = `${prefix}${this.prefix} ${args[0]}`;
      return this.logger[lvl](args);
    }

    create(moduleName) {
      return new Logger(this.logger, {
        ...{ prefix: `${this.prefix}:${moduleName}:` },
        ...this.options,
      });
    }

    clone(options) {
      options = options || this.options;
      options.prefix = options.prefix || this.prefix;
      return new Logger(this.logger, options);
    }
  }

  const baseLogger = new Logger();

  // the listeners passed to once(): off() looks for their wrappers, and stays O(1) for all others
  const onceListeners = new WeakSet();

  class EventEmitter {
    constructor() {
      // This is an Object containing Maps:
      //
      // { [event: string]: Map<listener: function, numTimesAdded: number> }
      //
      // We use a Map for O(1) insertion/deletion and because it can have functions as keys.
      //
      // We keep track of numTimesAdded (the number of times it was added) because if you attach the same listener twice,
      // we should actually call it twice for each emitted event.
      this.observers = {};
    }

    on(events, listener) {
      events.split(' ').forEach((event) => {
        if (!this.observers[event]) this.observers[event] = new Map();
        const numListeners = this.observers[event].get(listener) || 0;
        this.observers[event].set(listener, numListeners + 1);
      });
      return this;
    }

    off(events, listener) {
      // like on(), a string lists events separated by spaces; anything else is looked up as it is
      (typeof events === 'string' ? events.split(' ') : [events]).forEach((event) => {
        if (!this.observers[event]) return;
        if (!listener) {
          delete this.observers[event];
          return;
        }

        this.observers[event].delete(listener);
        if (onceListeners.has(listener)) {
          this.observers[event].forEach((_, observer) => {
            if (observer.listener === listener) this.observers[event].delete(observer);
          });
        }
      });
    }

    once(event, listener) {
      const wrapper = (...args) => {
        // removed first, so a listener that emits the same event again or throws still runs once
        this.off(event, wrapper);
        listener(...args);
      };
      wrapper.listener = listener;
      onceListeners.add(listener);
      this.on(event, wrapper);
      return this;
    }

    emit(event, ...args) {
      if (this.observers[event]) {
        const cloned = Array.from(this.observers[event].entries());
        cloned.forEach(([observer, numTimesAdded]) => {
          for (let i = 0; i < numTimesAdded; i++) {
            observer(...args);
          }
        });
      }

      if (this.observers['*']) {
        const cloned = Array.from(this.observers['*'].entries());
        cloned.forEach(([observer, numTimesAdded]) => {
          for (let i = 0; i < numTimesAdded; i++) {
            observer(event, ...args);
          }
        });
      }
    }
  }

  // Bundles already seen with keys, shared across instances so SSR setups reusing the same
  // resources skip enumerating large bundles on every init (#2449). Only "non-empty" is cached:
  // no API removes single keys from a bundle, so a non-empty bundle stays non-empty.
  // ponytail: a bundle emptied by hand with `delete` on every key keeps counting as non-empty
  const nonEmptyBundles = new WeakSet();

  // The dotted form, addResource('en.translation.key', value), was removed in v27: without this check its
  // value would land in options.ns, or an object would and break the next lookup
  const assertSeparateArguments = (method, ...args) => {
    if (args.some((a) => !isString(a))) {
      throw new TypeError(
        `${method}: pass language, namespace${method === 'addResource' ? ' and key' : ''} as separate strings; the dotted form ('en.translation.key') was removed in i18next v27`,
      );
    }
  };

  class ResourceStore extends EventEmitter {
    constructor(
      data,
      options = { ns: ['translation'], defaultNS: 'translation' },
      logger = baseLogger,
    ) {
      super();

      this.data = data || {};
      this.options = options;
      this.logger = logger.create('resourceStore');
      if (this.options.keySeparator === undefined) {
        this.options.keySeparator = '.';
      }
      if (this.options.ignoreJSONStructure === undefined) {
        this.options.ignoreJSONStructure = true;
      }
    }

    addNamespaces(ns) {
      if (!this.options.ns.includes(ns)) {
        this.options.ns.push(ns);
      }
    }

    removeNamespaces(ns) {
      const index = this.options.ns.indexOf(ns);
      if (index > -1) {
        this.options.ns.splice(index, 1);
      }
    }

    getResource(lng, ns, key, options = {}) {
      const keySeparator =
        options.keySeparator !== undefined ? options.keySeparator : this.options.keySeparator;

      const ignoreJSONStructure =
        options.ignoreJSONStructure !== undefined
          ? options.ignoreJSONStructure
          : this.options.ignoreJSONStructure;

      const path = [lng, ns];
      if (key) {
        if (Array.isArray(key)) {
          path.push(...key);
        } else if (isString(key) && keySeparator) {
          path.push(...key.split(keySeparator));
        } else {
          path.push(key);
        }
      }

      const result = getPath(this.data, path);
      // false, 0 and '' are values; null (not a valid lookup by default) still falls back to a flat key
      if (result != null || !ignoreJSONStructure || !isString(key)) return result;

      return deepFind(this.data?.[lng]?.[ns], key, keySeparator);
    }

    addResource(lng, ns, key, value, options = { silent: false }) {
      assertSeparateArguments('addResource', lng, ns, key);
      const keySeparator =
        options.keySeparator !== undefined ? options.keySeparator : this.options.keySeparator;

      let path = [lng, ns];
      if (key) path = path.concat(keySeparator ? key.split(keySeparator) : key);

      this.addNamespaces(ns);

      setPath(this.data, path, value);

      if (!options.silent) this.emit('added', lng, ns, key, value);
    }

    addResources(lng, ns, resources, options = { silent: false }) {
      assertSeparateArguments('addResources', lng, ns);
      // every value, as addResource() takes it (numbers, booleans and objects were dropped)
      Object.keys(resources || {}).forEach((m) => {
        if (m === '__proto__' || m === 'constructor') return;
        this.addResource(lng, ns, m, resources[m], { silent: true });
      });
      if (!options.silent) this.emit('added', lng, ns, resources);
    }

    addResourceBundle(
      lng,
      ns,
      resources,
      deep,
      overwrite,
      options = { silent: false, skipCopy: false },
    ) {
      assertSeparateArguments('addResourceBundle', lng, ns);
      const path = [lng, ns];

      this.addNamespaces(ns);

      let pack = getPath(this.data, path) || {};

      if (!options.skipCopy) resources = JSON.parse(JSON.stringify(resources)); // make a copy to fix #2081

      if (deep) {
        deepExtend(pack, resources, overwrite);
      } else {
        pack = { ...pack, ...resources };
      }

      setPath(this.data, path, pack);

      if (!options.silent) this.emit('added', lng, ns, resources);
    }

    removeResourceBundle(lng, ns) {
      if (this.hasResourceBundle(lng, ns)) {
        delete this.data[lng][ns];
      }
      this.removeNamespaces(ns);

      this.emit('removed', lng, ns);
    }

    hasResourceBundle(lng, ns) {
      return this.getResource(lng, ns) !== undefined;
    }

    getResourceBundle(lng, ns) {
      if (!ns) ns = this.options.defaultNS;
      return this.getResource(lng, ns);
    }

    getDataByLanguage(lng) {
      return this.data[lng];
    }

    hasLanguageSomeTranslations(lng) {
      const data = this.getDataByLanguage(lng);
      const n = (data && Object.keys(data)) || [];
      return !!n.find((v) => {
        const bundle = data[v];
        if (nonEmptyBundles.has(bundle)) return true;
        if (!bundle || Object.keys(bundle).length === 0) return false;
        if (typeof bundle === 'object') nonEmptyBundles.add(bundle);
        return true;
      });
    }

    toJSON() {
      return this.data;
    }
  }

  const PATH_KEY = Symbol('i18next/PATH_KEY');

  function createProxy() {
    const state = [];
    // `Object.create(null)` to prevent prototype pollution
    const handler = Object.create(null);
    let proxy;
    handler.get = (target, key) => {
      proxy?.revoke?.();
      if (key === PATH_KEY) return state;
      state.push(key);
      proxy = Proxy.revocable(target, handler);
      return proxy.proxy;
    };
    return Proxy.revocable(Object.create(null), handler).proxy;
  }

  function keysFromSelector(selector, opts) {
    const { [PATH_KEY]: path } = selector(createProxy());

    // keySeparator: false joins with '.', as getFixedT() joins a key prefix: `$.a.b` is the flat key 'a.b'
    // (joined with false it was 'afalseb')
    const keySeparator = opts?.keySeparator || '.';
    const nsSeparator = opts?.nsSeparator ?? ':';
    const strict = opts?.enableSelector === 'strict';

    // Default mode (v25.8.19): when `ns` is an array of two or more namespaces,
    // GetSource exposes the primary namespace's keys flat on `$`, while secondary
    // namespaces are hung off `$` under their own name (e.g. `$.ns3.fromNs3`).
    // Only a leading segment equal to a *secondary* namespace is rewritten.
    // Single-string ns and primary-prefixed paths stay flat (preserves #2405).
    //
    // Strict mode: `NsResource` drops its flattened-primary form at the type
    // level — `$` exposes namespaces uniformly, primary included. So `path[0]`
    // is *always* a namespace identifier when it matches the scope's ns list,
    // and we rewrite to `ns<sep>rest` regardless of single/multi-ns scope and
    // regardless of primary vs secondary. See #2429.
    if (path.length > 1 && nsSeparator) {
      const ns = opts?.ns;
      const nsList = strict
        ? Array.isArray(ns)
          ? ns
          : ns
            ? [ns]
            : null
        : Array.isArray(ns)
          ? ns
          : null;

      if (nsList) {
        const candidates = strict ? nsList : nsList.length > 1 ? nsList.slice(1) : [];
        if (candidates.includes(path[0])) {
          return `${path[0]}${nsSeparator}${path.slice(1).join(keySeparator)}`;
        }
      }
    }

    return path.join(keySeparator);
  }

  // 0n too: a BigInt count looks up the _zero form as 0 does
  const isZeroCount = (count) => count === 0 || (typeof count === 'bigint' && !count);

  const shouldHandleAsObject = (res) =>
    !isString(res) && typeof res !== 'boolean' && typeof res !== 'number';

  class Translator extends EventEmitter {
    constructor(services, options = {}) {
      super();

      copy(
        [
          'resourceStore',
          'languageUtils',
          'pluralResolver',
          'interpolator',
          'backendConnector',
          'i18nFormat',
          'utils',
          'postProcessors',
        ],
        services,
        this,
      );

      this.options = options;
      if (this.options.keySeparator === undefined) {
        this.options.keySeparator = '.';
      }

      this.logger = (services.logger || baseLogger).create('translator');

      this.checkedLoadedFor = {};
    }

    changeLanguage(lng) {
      if (lng) this.language = lng;
    }

    exists(key, o = { interpolation: {} }) {
      const opt = { ...o };
      if (key == null) return false;
      const resolved = this.resolve(key, opt);

      // If no resource found, return false
      if (resolved?.res === undefined) return false;

      // Check if the resolved resource is an object
      const isObject = shouldHandleAsObject(resolved.res);

      // If returnObjects is explicitly set to false and the resource is an object, return false
      if (opt.returnObjects === false && isObject) {
        return false;
      }

      // Otherwise return true (resource exists)
      return true;
    }

    extractFromKey(key, opt) {
      let nsSeparator = opt.nsSeparator !== undefined ? opt.nsSeparator : this.options.nsSeparator;
      if (nsSeparator === undefined) nsSeparator = ':';

      const keySeparator =
        opt.keySeparator !== undefined ? opt.keySeparator : this.options.keySeparator;

      let namespaces = opt.ns || this.options.defaultNS || [];
      const wouldCheckForNsInKey = nsSeparator && key.includes(nsSeparator);
      const seemsNaturalLanguage =
        !this.options.userDefinedKeySeparator &&
        !opt.keySeparator &&
        !this.options.userDefinedNsSeparator &&
        !opt.nsSeparator &&
        !looksLikeObjectPath(key, nsSeparator, keySeparator);
      if (wouldCheckForNsInKey && !seemsNaturalLanguage) {
        const m = key.match(this.interpolator.nestingRegexp);
        if (m && m.length > 0) {
          return {
            key,
            namespaces: isString(namespaces) ? [namespaces] : namespaces,
          };
        }
        const parts = key.split(nsSeparator);
        if (
          nsSeparator !== keySeparator ||
          (nsSeparator === keySeparator && this.options.ns.includes(parts[0]))
        )
          namespaces = parts.shift();
        // flat keys (keySeparator: false) keep the text after the namespace as it is, not joined with 'false'
        key = parts.join(keySeparator === false ? nsSeparator : keySeparator);
      }

      return {
        key,
        namespaces: isString(namespaces) ? [namespaces] : namespaces,
      };
    }

    translate(keys, o, lastKey) {
      let opt = typeof o === 'object' ? { ...o } : o;
      if (typeof opt !== 'object' && this.options.overloadTranslationOptionHandler) {
        opt = this.options.overloadTranslationOptionHandler(arguments);
      }
      if (typeof opt === 'object') opt = { ...opt };
      if (!opt) opt = {};

      // non valid keys handling
      if (keys == null /* || keys === '' */) return '';
      if (typeof keys === 'function') keys = keysFromSelector(keys, { ...this.options, ...opt });
      if (!Array.isArray(keys)) keys = [String(keys)];
      keys = keys.map((k) =>
        typeof k === 'function' ? keysFromSelector(k, { ...this.options, ...opt }) : String(k),
      );

      const returnDetails =
        opt.returnDetails !== undefined ? opt.returnDetails : this.options.returnDetails;

      // separators
      const keySeparator =
        opt.keySeparator !== undefined ? opt.keySeparator : this.options.keySeparator;

      // get namespace(s)
      const { key, namespaces } = this.extractFromKey(keys[keys.length - 1], opt);
      const namespace = namespaces[namespaces.length - 1];

      let nsSeparator = opt.nsSeparator !== undefined ? opt.nsSeparator : this.options.nsSeparator;
      if (nsSeparator === undefined) nsSeparator = ':';

      // return key on CIMode
      const lng = opt.lng || this.language;
      const appendNamespaceToCIMode =
        opt.appendNamespaceToCIMode || this.options.appendNamespaceToCIMode;
      if (lng?.toLowerCase() === 'cimode') {
        if (appendNamespaceToCIMode) {
          if (returnDetails) {
            return {
              res: `${namespace}${nsSeparator}${key}`,
              usedKey: key,
              exactUsedKey: key,
              usedLng: lng,
              usedNS: namespace,
              usedParams: this.getUsedParamsDetails(opt),
            };
          }
          return `${namespace}${nsSeparator}${key}`;
        }

        if (returnDetails) {
          return {
            res: key,
            usedKey: key,
            exactUsedKey: key,
            usedLng: lng,
            usedNS: namespace,
            usedParams: this.getUsedParamsDetails(opt),
          };
        }
        return key;
      }

      // resolve from store
      const resolved = this.resolve(keys, opt);
      let res = resolved?.res;
      const resUsedKey = resolved?.usedKey || key;
      const resExactUsedKey = resolved?.exactUsedKey || key;

      const noObject = ['[object Number]', '[object Function]', '[object RegExp]'];
      const joinArrays = opt.joinArrays !== undefined ? opt.joinArrays : this.options.joinArrays;

      // object
      const handleAsObjectInI18nFormat = !this.i18nFormat || this.i18nFormat.handleAsObject;
      const needsPluralHandling = opt.count !== undefined && !isString(opt.count);
      const hasDefaultValue = Translator.hasDefaultValue(opt);
      const defaultValueSuffix = needsPluralHandling
        ? this.pluralResolver.getSuffix(lng, opt.count, opt)
        : '';
      const defaultValueSuffixOrdinalFallback =
        opt.ordinal && needsPluralHandling
          ? this.pluralResolver.getSuffix(lng, opt.count, { ordinal: false })
          : '';
      const needsZeroSuffixLookup = needsPluralHandling && !opt.ordinal && isZeroCount(opt.count);
      const sep = this.options.pluralSeparator;
      // like the lookup: the plain default value first, then the "other" form
      const otherDefaultValue =
        opt.defaultValue ??
        (needsPluralHandling
          ? opt[`defaultValue${opt.ordinal ? `${sep}ordinal${sep}` : sep}other`]
          : undefined);
      const countDefaultValue =
        opt[`defaultValue${defaultValueSuffix}`] ??
        opt[`defaultValue${defaultValueSuffixOrdinalFallback}`] ??
        otherDefaultValue;
      const defaultValue =
        (needsZeroSuffixLookup ? opt[`defaultValue${sep}zero`] : undefined) ?? countDefaultValue;

      let resForObjHndl = res;
      if (handleAsObjectInI18nFormat && !res && hasDefaultValue) {
        resForObjHndl = defaultValue;
      }

      const handleAsObject = shouldHandleAsObject(resForObjHndl);
      const resType = Object.prototype.toString.apply(resForObjHndl);

      const isObjectHit =
        handleAsObjectInI18nFormat &&
        resForObjHndl &&
        handleAsObject &&
        !noObject.includes(resType) &&
        !(isString(joinArrays) && Array.isArray(resForObjHndl));
      // an object or array without returnObjects: what returnedObjectHandler returns, else it is handled
      // like a missing key below (the default value, else the key), without saving it, as the key exists
      const objectNotReturned = isObjectHit && !opt.returnObjects && !this.options.returnObjects;
      if (objectNotReturned && this.options.returnedObjectHandler) {
        const r = this.options.returnedObjectHandler(resUsedKey, resForObjHndl, {
          ...opt,
          ns: namespaces,
        });
        if (returnDetails) {
          resolved.res = r;
          resolved.usedParams = this.getUsedParamsDetails(opt);
          return resolved;
        }
        return r;
      }
      if (objectNotReturned) {
        this.logger.warn('accessing an object - but returnObjects options is not enabled!');
      }

      if (isObjectHit && !objectNotReturned) {
        // if we got a separator we loop over children - else we just return object as is
        // as having it set to false means no hierarchy so no lookup for nested values
        if (keySeparator) {
          const resTypeIsArray = Array.isArray(resForObjHndl);
          const copy = resTypeIsArray ? [] : {}; // apply child translation on a copy

          const newKeyToUse = resTypeIsArray ? resExactUsedKey : resUsedKey;
          for (const m in resForObjHndl) {
            if (Object.prototype.hasOwnProperty.call(resForObjHndl, m)) {
              const deepKey = `${newKeyToUse}${keySeparator}${m}`;
              if (hasDefaultValue && !res) {
                copy[m] = this.translate(deepKey, {
                  ...opt,
                  defaultValue: shouldHandleAsObject(defaultValue) ? defaultValue[m] : undefined,
                  ...{ joinArrays: false, ns: namespaces },
                });
              } else {
                copy[m] = this.translate(deepKey, {
                  ...opt,
                  ...{ joinArrays: false, ns: namespaces },
                });
              }
              if (copy[m] === deepKey) copy[m] = resForObjHndl[m]; // if nothing found use original value as fallback
            }
          }
          res = copy;
        }
      } else if (handleAsObjectInI18nFormat && isString(joinArrays) && Array.isArray(res)) {
        // array special treatment
        res = res.join(joinArrays);
        if (res) res = this.extendTranslation(res, keys, opt, resolved, lastKey);
      } else {
        // string, empty or null (or an object that is not returned)
        let usedDefault = false;
        let usedKey = false;
        if (objectNotReturned) res = undefined;

        // fallback value (for an object hit, not an object default value either)
        if (
          !this.isValidLookup(res) &&
          hasDefaultValue &&
          !(objectNotReturned && shouldHandleAsObject(defaultValue))
        ) {
          usedDefault = true;
          res = defaultValue;
        }
        // an explicit '' default from code counts: only empty translations fall back (returnEmptyString)
        if (!this.isValidLookup(res) && !(usedDefault && res === '')) {
          usedKey = true;
          res = key;
        }

        const missingKeyNoValueFallbackToKey =
          opt.missingKeyNoValueFallbackToKey || this.options.missingKeyNoValueFallbackToKey;
        const resForMissing = missingKeyNoValueFallbackToKey && usedKey ? undefined : res;

        // save missing
        const updateMissing = hasDefaultValue && defaultValue !== res && this.options.updateMissing;
        if (!objectNotReturned && (usedKey || usedDefault || updateMissing)) {
          this.logger.log(
            updateMissing ? 'updateKey' : 'missingKey',
            lng,
            namespace,
            needsPluralHandling && !updateMissing
              ? `${key}${this.pluralResolver.getSuffix(lng, opt.count, opt)}`
              : key,
            updateMissing ? defaultValue : res,
          );
          if (keySeparator) {
            const fk = this.resolve(key, { ...opt, keySeparator: false });
            if (fk && fk.res)
              this.logger.warn(
                'Seems the loaded translations were in flat JSON format instead of nested. Either set keySeparator: false on init or make sure your translations are published in nested format.',
              );
          }

          let lngs = [];
          const fallbackLngs = this.languageUtils.getFallbackCodes(
            this.options.fallbackLng,
            opt.lng || this.language,
          );
          if (this.options.saveMissingTo === 'fallback' && fallbackLngs && fallbackLngs[0]) {
            for (let i = 0; i < fallbackLngs.length; i++) {
              lngs.push(fallbackLngs[i]);
            }
          } else if (this.options.saveMissingTo === 'all') {
            lngs = this.languageUtils.toResolveHierarchy(opt.lng || this.language);
          } else {
            lngs.push(opt.lng || this.language);
          }

          const send = (l, k, specificDefaultValue) => {
            const defaultForMissing =
              hasDefaultValue && specificDefaultValue !== res ? specificDefaultValue : resForMissing;
            if (this.options.missingKeyHandler) {
              this.options.missingKeyHandler(l, namespace, k, defaultForMissing, updateMissing, opt);
            } else if (this.backendConnector?.saveMissing) {
              this.backendConnector.saveMissing(
                l,
                namespace,
                k,
                defaultForMissing,
                updateMissing,
                opt,
                undefined,
                this.utils?.hasLoadedNamespace,
              );
            }
            this.emit('missingKey', l, namespace, k, res);
          };

          if (this.options.saveMissing) {
            if (this.options.saveMissingPlurals && needsPluralHandling) {
              lngs.forEach((language) => {
                const suffixes = this.pluralResolver.getSuffixes(language, opt);
                const zeroDefaultValue = opt[`defaultValue${sep}zero`];

                if (
                  needsZeroSuffixLookup &&
                  zeroDefaultValue !== undefined &&
                  zeroDefaultValue !== null &&
                  !suffixes.includes(`${sep}zero`)
                ) {
                  suffixes.push(`${sep}zero`);
                }
                // a form without its own default: the form for the count gets what t() resolved
                // for it, the others the plain or "other" default (the zero default stays in _zero)
                suffixes.forEach((suffix) => {
                  send(
                    [language],
                    key + suffix,
                    opt[`defaultValue${suffix}`] ??
                      (suffix === defaultValueSuffix ? countDefaultValue : otherDefaultValue) ??
                      defaultValue,
                  );
                });
              });
            } else {
              send(lngs, key, defaultValue);
            }
          }
        }

        // extend
        res = this.extendTranslation(res, keys, opt, resolved, lastKey);

        // append namespace if still key
        if (usedKey && res === key && this.options.appendNamespaceToMissingKey) {
          res = `${namespace}${nsSeparator}${key}`;
        }

        // parseMissingKeyHandler
        if ((usedKey || usedDefault) && this.options.parseMissingKeyHandler) {
          res = this.options.parseMissingKeyHandler(
            this.options.appendNamespaceToMissingKey ? `${namespace}${nsSeparator}${key}` : key,
            usedDefault ? res : undefined,
            opt,
          );
        }
      }

      // return
      if (returnDetails) {
        resolved.res = res;
        resolved.usedParams = this.getUsedParamsDetails(opt);
        return resolved;
      }
      return res;
    }

    extendTranslation(res, key, opt, resolved, lastKey) {
      if (this.i18nFormat?.parse) {
        res = this.i18nFormat.parse(
          res,
          { ...this.options.interpolation.defaultVariables, ...opt },
          opt.lng || this.language || resolved.usedLng,
          resolved.usedNS,
          resolved.usedKey,
          { resolved },
        );
      } else if (!opt.skipInterpolation) {
        // i18next.parsing
        if (opt.interpolation)
          this.interpolator.init({
            ...opt,
            ...{ interpolation: { ...this.options.interpolation, ...opt.interpolation } },
          });
        const skipOnVariables =
          isString(res) &&
          (opt?.interpolation?.skipOnVariables !== undefined
            ? opt.interpolation.skipOnVariables
            : this.options.interpolation.skipOnVariables);
        let nestBef;
        if (skipOnVariables) {
          const nb = res.includes(this.interpolator.nestingPrefixText)
            ? res.match(this.interpolator.nestingRegexp)
            : null;
          // has nesting aftbeforeer interpolation
          nestBef = nb && nb.length;
        }

        // interpolate
        let data = opt.replace && !isString(opt.replace) ? opt.replace : opt;
        if (this.options.interpolation.defaultVariables)
          data = { ...this.options.interpolation.defaultVariables, ...data };
        res = this.interpolator.interpolate(
          res,
          data,
          opt.lng || this.language || resolved.usedLng,
          opt,
        );

        // nesting
        if (skipOnVariables) {
          const na = res.includes(this.interpolator.nestingPrefixText)
            ? res.match(this.interpolator.nestingRegexp)
            : null;
          // has nesting after interpolation
          const nestAft = na && na.length;
          if (nestBef < nestAft) opt.nest = false;
        }
        if (!opt.lng && resolved && resolved.res) opt.lng = this.language || resolved.usedLng;
        if (opt.nest !== false)
          res = this.interpolator.nest(
            res,
            (...args) => {
              if (lastKey?.[0] === args[0] && !opt.context) {
                this.logger.warn(
                  `It seems you are nesting recursively key: ${args[0]} in key: ${key[0]}`,
                );
                return null;
              }
              return this.translate(...args, key);
            },
            opt,
          );

        if (opt.interpolation) this.interpolator.reset();
      }

      // post process
      const postProcess = opt.postProcess || this.options.postProcess;
      const postProcessorNames = isString(postProcess) ? [postProcess] : postProcess;

      if (res != null && postProcessorNames?.length && opt.applyPostProcessor !== false) {
        const ppOptions = this.options?.postProcessPassResolved
          ? { i18nResolved: { ...resolved, usedParams: this.getUsedParamsDetails(opt) }, ...opt }
          : opt;
        // the post-processors registered with use() on this instance (or the parent of a clone)
        postProcessorNames.forEach((name) => {
          const processor = this.postProcessors?.[name];
          if (!processor) {
            this.logger.once(
              `postProcess:${name}`,
              'warn',
              `postProcess: '${name}' is not registered on this i18next instance; call use() with it on this instance`,
            );
            return;
          }
          res = processor.process(res, key, ppOptions, this) ?? res;
        });
      }

      return res;
    }

    resolve(keys, opt = {}) {
      let found;
      let usedKey; // plain key
      let exactUsedKey; // key with context / plural
      let usedLng;
      let usedNS;

      if (isString(keys)) keys = [keys];
      if (Array.isArray(keys))
        keys = keys.map((k) =>
          typeof k === 'function' ? keysFromSelector(k, { ...this.options, ...opt }) : k,
        );

      // forEach possible key
      keys.forEach((k) => {
        if (this.isValidLookup(found)) return;
        const extracted = this.extractFromKey(k, opt);
        const key = extracted.key;
        usedKey = key;
        let namespaces = extracted.namespaces;
        if (this.options.fallbackNS) namespaces = namespaces.concat(this.options.fallbackNS);

        const needsPluralHandling = opt.count !== undefined && !isString(opt.count);
        const needsZeroSuffixLookup = needsPluralHandling && !opt.ordinal && isZeroCount(opt.count);
        const needsContextHandling =
          opt.context !== undefined &&
          (isString(opt.context) || typeof opt.context === 'number') &&
          opt.context !== '';

        const codes = opt.lngs
          ? opt.lngs
          : this.languageUtils.toResolveHierarchy(opt.lng || this.language, opt.fallbackLng);

        namespaces.forEach((ns) => {
          if (this.isValidLookup(found)) return;
          usedNS = ns;

          if (
            !this.checkedLoadedFor[`${codes[0]}-${ns}`] &&
            this.utils?.hasLoadedNamespace &&
            !this.utils?.hasLoadedNamespace(usedNS)
          ) {
            this.checkedLoadedFor[`${codes[0]}-${ns}`] = true;
            this.logger.warn(
              `key "${usedKey}" for languages "${codes.join(
              ', ',
            )}" won't get resolved as namespace "${usedNS}" was not yet loaded`,
              'This means something IS WRONG in your setup. You access the t function before i18next.init / i18next.loadNamespace / i18next.changeLanguage was done. Wait for the callback or Promise to resolve before accessing it!!!',
            );
          }

          codes.forEach((code) => {
            if (this.isValidLookup(found)) return;
            usedLng = code;

            const finalKeys = [key];

            if (this.i18nFormat?.addLookupKeys) {
              this.i18nFormat.addLookupKeys(finalKeys, key, code, ns, opt);
            } else {
              let pluralSuffix;
              if (needsPluralHandling)
                pluralSuffix = this.pluralResolver.getSuffix(code, opt.count, opt);
              const zeroSuffix = `${this.options.pluralSeparator}zero`;
              const ordinalPrefix = `${this.options.pluralSeparator}ordinal${this.options.pluralSeparator}`;
              // get key for plural if needed
              if (needsPluralHandling) {
                if (opt.ordinal && pluralSuffix.startsWith(ordinalPrefix)) {
                  finalKeys.push(
                    key + pluralSuffix.replace(ordinalPrefix, this.options.pluralSeparator),
                  );
                }
                finalKeys.push(key + pluralSuffix);
                if (needsZeroSuffixLookup) {
                  finalKeys.push(key + zeroSuffix);
                }
              }

              // get key for context if needed
              if (needsContextHandling) {
                const contextKey = `${key}${this.options.contextSeparator || '_'}${opt.context}`;
                finalKeys.push(contextKey);

                // get key for context + plural if needed
                if (needsPluralHandling) {
                  if (opt.ordinal && pluralSuffix.startsWith(ordinalPrefix)) {
                    finalKeys.push(
                      contextKey + pluralSuffix.replace(ordinalPrefix, this.options.pluralSeparator),
                    );
                  }
                  finalKeys.push(contextKey + pluralSuffix);
                  if (needsZeroSuffixLookup) {
                    finalKeys.push(contextKey + zeroSuffix);
                  }
                }
              }

              // last in this language: the "other" form, as in CLDR's lateral inheritance (a missing plural
              // category falls back to "other" before the parent locale). After the plain key, so `key` +
              // `key_other` still resolves `key`; before the next fallback language.
              if (needsPluralHandling) {
                const otherSuffix = `${opt.ordinal ? ordinalPrefix : this.options.pluralSeparator}other`;
                if (pluralSuffix !== otherSuffix) {
                  if (needsContextHandling) {
                    finalKeys.unshift(
                      `${key}${this.options.contextSeparator || '_'}${opt.context}${otherSuffix}`,
                    );
                  }
                  finalKeys.unshift(key + otherSuffix);
                }
              }
            }

            // iterate over finalKeys starting with most specific pluralkey (-> contextkey only) -> singularkey only
            let possibleKey;
            while ((possibleKey = finalKeys.pop())) {
              if (!this.isValidLookup(found)) {
                exactUsedKey = possibleKey;
                found = this.getResource(code, ns, possibleKey, opt);
              }
            }
          });
        });
      });

      return { res: found, usedKey, exactUsedKey, usedLng, usedNS };
    }

    isValidLookup(res) {
      return (
        res !== undefined &&
        !(!this.options.returnNull && res === null) &&
        !(!this.options.returnEmptyString && res === '')
      );
    }

    getResource(code, ns, key, options = {}) {
      if (this.i18nFormat?.getResource) return this.i18nFormat.getResource(code, ns, key, options);
      return this.resourceStore.getResource(code, ns, key, options);
    }

    getUsedParamsDetails(options = {}) {
      // we need to remember to extend this array whenever new option properties are added
      const optionsKeys = [
        'defaultValue',
        'ordinal',
        'context',
        'replace',
        'lng',
        'lngs',
        'fallbackLng',
        'ns',
        'keySeparator',
        'nsSeparator',
        'returnObjects',
        'returnDetails',
        'joinArrays',
        'postProcess',
        'interpolation',
      ];

      const useOptionsReplaceForData = options.replace && !isString(options.replace);
      let data = useOptionsReplaceForData ? options.replace : options;
      if (useOptionsReplaceForData && typeof options.count !== 'undefined') {
        data = { ...data, count: options.count };
      }

      if (this.options.interpolation.defaultVariables) {
        data = { ...this.options.interpolation.defaultVariables, ...data };
      }

      // avoid reporting options (execpt count) as usedParams
      if (!useOptionsReplaceForData) {
        data = { ...data };
        for (const key of optionsKeys) {
          delete data[key];
        }
      }

      return data;
    }

    static hasDefaultValue(options) {
      const prefix = 'defaultValue';

      for (const option in options) {
        if (
          Object.prototype.hasOwnProperty.call(options, option) &&
          option.startsWith(prefix) &&
          undefined !== options[option]
        ) {
          return true;
        }
      }

      return false;
    }
  }

  class LanguageUtil {
    constructor(options, logger = baseLogger) {
      this.options = options;

      this.supportedLngs = this.options.supportedLngs || false;
      this.logger = logger.create('languageUtils');
      this.resolveHierarchyCache = {};
      this.formattedCodes = new Map();
    }

    clearCache() {
      this.resolveHierarchyCache = {};
      this.formattedCodes.clear();
    }

    getScriptPartFromCode(code) {
      code = getCleanedCode(code);
      if (!code || !code.includes('-')) return null;

      const p = code.split('-');
      if (p.length === 2) return null;
      p.pop();
      if (p[p.length - 1].toLowerCase() === 'x') return null;
      return this.formatLanguageCode(p.join('-'));
    }

    getLanguagePartFromCode(code) {
      code = getCleanedCode(code);
      if (!code) return code;
      // formatted like the language part of a code with subtags: 'AR' is 'ar' as 'AR-EG' gives 'ar'
      if (!code.includes('-')) return this.formatLanguageCode(code);

      const p = code.split('-');
      return this.formatLanguageCode(p[0]);
    }

    // Canonical form of a code with subtags ('en-us' -> 'en-US', 'iw-IL' -> 'he-IL', as before v27); a code
    // without subtags only gets its canonical casing ('EN' -> 'en', 'TL' -> 'tl'), aliases stay ('tl', 'iw'). A code
    // that is not BCP 47 (getCanonicalLocales throws) stays as it is. cleanCode: false keeps a code without
    // subtags as it is (before v27).
    formatLanguageCode(code) {
      if (!isString(code)) return code;
      let formatted = this.formattedCodes.get(code);
      if (formatted !== undefined) return formatted;
      formatted = this.formatUncached(code);
      // ponytail: codes come from outside (detectors), so the cache is emptied at 1000 codes instead of growing
      if (this.formattedCodes.size >= 1000) this.formattedCodes.clear();
      this.formattedCodes.set(code, formatted);
      return formatted;
    }

    formatUncached(code) {
      const hasSubtags = code.includes('-');
      if (hasSubtags || this.options.cleanCode !== false) {
        let canonical;
        try {
          canonical = Intl.getCanonicalLocales(code)[0];
        } catch (e) {
          /* fall through */
        }
        if (canonical && (hasSubtags || canonical.toLowerCase() === code.toLowerCase())) {
          return this.options.lowerCaseLng ? canonical.toLowerCase() : canonical;
        }
        // an alias Intl would replace ('TL' -> 'fil', 'IW' -> 'he'): only its casing changes ('tl', 'iw')
        if (canonical) return code.toLowerCase();
      }
      return this.options.lowerCaseLng || (this.options.cleanCode && !hasSubtags)
        ? code.toLowerCase()
        : code;
    }

    isSupportedCode(code) {
      if (this.options.load === 'languageOnly' || this.options.nonExplicitSupportedLngs) {
        code = this.getLanguagePartFromCode(code);
      }
      if (!this.supportedLngs || !this.supportedLngs.length) return true;
      if (!Array.isArray(this.supportedLngs)) return this.supportedLngs.includes(code);
      // compared formatted, like every other code: 'pt-br' and 'pt-BR' match, all lowercase with lowerCaseLng
      const formatted = this.formatLanguageCode(code);
      return this.supportedLngs.some(
        (supportedLng) => this.formatLanguageCode(supportedLng) === formatted,
      );
    }

    getBestMatchFromCodes(codes) {
      if (!codes) return null;

      let found;

      // pick first supported code or if no restriction pick the first one (highest prio)
      codes.forEach((code) => {
        if (found) return;
        const cleanedLng = this.formatLanguageCode(code);
        if (!this.options.supportedLngs || this.isSupportedCode(cleanedLng)) found = cleanedLng;
      });

      // if we got no match in supportedLngs yet - check for similar locales
      // first  de-CH --> de
      // second de-CH --> de-DE
      if (!found && this.options.supportedLngs) {
        codes.forEach((code) => {
          if (found) return;

          const lngScOnly = this.getScriptPartFromCode(code);

          if (this.isSupportedCode(lngScOnly)) return (found = lngScOnly);

          const lngOnly = this.getLanguagePartFromCode(code);

          if (this.isSupportedCode(lngOnly)) return (found = lngOnly);

          found = this.options.supportedLngs
            .map((supportedLng) => this.formatLanguageCode(supportedLng))
            .find((supportedLng) => {
              if (supportedLng === lngOnly) return true;
              if (!supportedLng.includes('-') && !lngOnly.includes('-')) return false;
              if (
                supportedLng.includes('-') &&
                !lngOnly.includes('-') &&
                supportedLng.slice(0, supportedLng.indexOf('-')) === lngOnly
              )
                return true;
              return false;
            });
        });
      }
      // if nothing found, use fallbackLng
      if (!found) found = this.getFallbackCodes(this.options.fallbackLng)[0];

      return found;
    }

    getFallbackCodes(fallbacks, code) {
      if (!fallbacks) return [];
      if (typeof fallbacks === 'function') fallbacks = fallbacks(code);
      if (isString(fallbacks)) fallbacks = [fallbacks];
      if (Array.isArray(fallbacks)) return fallbacks;

      const getOwnFallback = (key) =>
        Object.prototype.hasOwnProperty.call(fallbacks, key) ? fallbacks[key] : undefined;
      if (!code) return getOwnFallback('default') || [];

      // assume we have an object defining fallbacks
      let found = getOwnFallback(code);
      if (!found) found = getOwnFallback(this.getScriptPartFromCode(code));
      if (!found) found = getOwnFallback(this.formatLanguageCode(code));
      if (!found) found = getOwnFallback(this.getLanguagePartFromCode(code));
      if (!found) found = getOwnFallback('default');

      return found || [];
    }

    toResolveHierarchy(code, fallbackCode) {
      const fallbackLng = this.options.fallbackLng;
      // join so in-place array mutation (fallbackLng.push(...)) also invalidates, not only reassignment
      const fallbackLngKey = Array.isArray(fallbackLng) ? fallbackLng.join('|') : fallbackLng;
      if (fallbackLngKey !== this._cachedFallbackLng) {
        this.resolveHierarchyCache = {};
        this._cachedFallbackLng = fallbackLngKey;
      }

      const hasCacheableFallback =
        fallbackCode === undefined || fallbackCode === false || isString(fallbackCode);
      const usesUncacheableOptionsFallback =
        fallbackCode === undefined && typeof this.options.fallbackLng === 'function';
      const cacheable = isString(code) && hasCacheableFallback && !usesUncacheableOptionsFallback;
      let cacheKey = null;
      if (cacheable) {
        let fallbackCacheKey;
        if (fallbackCode === undefined) fallbackCacheKey = 'undefined';
        else if (fallbackCode === false) fallbackCacheKey = 'boolean:false';
        else fallbackCacheKey = `string:${fallbackCode}`;
        cacheKey = `${code.length}:${code}|${fallbackCacheKey}`;
      }
      if (cacheKey !== null) {
        const cached = this.resolveHierarchyCache[cacheKey];
        if (cached !== undefined) return cached.slice();
      }

      const fallbackCodes = this.getFallbackCodes(
        (fallbackCode === false ? [] : fallbackCode) || this.options.fallbackLng || [],
        code,
      );

      const codes = [];
      const addCode = (c) => {
        if (!c) return;
        if (this.isSupportedCode(c)) {
          codes.push(c);
        } else {
          this.logger.warn(`rejecting language code not found in supportedLngs: ${c}`);
        }
      };

      if (isString(code) && (code.includes('-') || code.includes('_'))) {
        if (this.options.load !== 'languageOnly') addCode(this.formatLanguageCode(code));
        if (this.options.load !== 'languageOnly' && this.options.load !== 'currentOnly')
          addCode(this.getScriptPartFromCode(code));
        if (this.options.load !== 'currentOnly') addCode(this.getLanguagePartFromCode(code));
      } else if (isString(code)) {
        addCode(this.formatLanguageCode(code));
      }

      fallbackCodes.forEach((fc) => {
        // compare the formatted code, so a fallback like 'de-ch' doesn't repeat 'de-CH'
        const formattedFc = this.formatLanguageCode(fc);
        if (!codes.includes(formattedFc)) addCode(formattedFc);
      });

      if (cacheKey !== null) {
        // ponytail: codes come from outside (detectors), so the cache is emptied at 1000 codes, as formattedCodes
        if (Object.keys(this.resolveHierarchyCache).length >= 1000) this.resolveHierarchyCache = {};
        this.resolveHierarchyCache[cacheKey] = codes;
        return codes.slice();
      }

      return codes;
    }
  }

  const suffixesOrder = {
    zero: 0,
    one: 1,
    two: 2,
    few: 3,
    many: 4,
    other: 5,
  };

  const dummyRule = {
    select: (count) => count === 1 ? 'one' : 'other',
    resolvedOptions: () => ({
      pluralCategories: ['one', 'other']
    })
  };

  class PluralResolver {
    constructor(languageUtils, options = {}, logger = baseLogger) {
      this.languageUtils = languageUtils;
      this.options = options;

      this.logger = logger.create('pluralResolver');

      // Cache calls to Intl.PluralRules, since repeated calls can be slow in runtimes like React Native
      // and the memory usage difference is negligible
      this.pluralRulesCache = {};
    }

    clearCache() {
      this.pluralRulesCache = {};
    }

    getRule(code, options = {}) {
      const cleanedCode = getCleanedCode(code === 'dev' ? 'en' : code);
      const type = options.ordinal ? 'ordinal' : 'cardinal';
      const cacheKey = JSON.stringify({ cleanedCode, type });

      if (cacheKey in this.pluralRulesCache) {
        return this.pluralRulesCache[cacheKey];
      }

      let rule;

      try {
        rule = new Intl.PluralRules(cleanedCode, { type });
      } catch (err) {
        if (typeof Intl === 'undefined') {
          this.logger.error('No Intl support, please use an Intl polyfill!');
          return dummyRule;
        }
        if (!code.match(/-|_/)) return dummyRule;
        const lngPart = this.languageUtils.getLanguagePartFromCode(code);
        rule = this.getRule(lngPart, options);
      }

      // ponytail: codes come from outside (detectors), so the cache is emptied at 1000 rules, as formattedCodes
      if (Object.keys(this.pluralRulesCache).length >= 1000) this.pluralRulesCache = {};
      this.pluralRulesCache[cacheKey] = rule;
      return rule;
    }

    needsPlural(code, options = {}) {
      let rule = this.getRule(code, options);
      if (!rule) rule = this.getRule('dev', options);
      return rule?.resolvedOptions().pluralCategories.length > 1;
    }

    getPluralFormsOfKey(code, key, options = {}) {
      return this.getSuffixes(code, options).map((suffix) => `${key}${suffix}`);
    }

    getSuffixes(code, options = {}) {
      let rule = this.getRule(code, options);
      if (!rule) rule = this.getRule('dev', options);
      if (!rule) return [];

      return rule.resolvedOptions().pluralCategories
        .sort((pluralCategory1, pluralCategory2) => suffixesOrder[pluralCategory1] - suffixesOrder[pluralCategory2])
        .map(pluralCategory => `${this.options.prepend}${options.ordinal ? `ordinal${this.options.prepend}` : ''}${pluralCategory}`);
    }

    getSuffix(code, count, options = {}) {
      const rule = this.getRule(code, options);

      if (rule) {
        // Intl.PluralRules takes a number only: a BigInt count (e.g. a COUNT(*) from a database driver) threw
        const n = typeof count === 'bigint' ? Number(count) : count;
        return `${this.options.prepend}${options.ordinal ? `ordinal${this.options.prepend}` : ''}${rule.select(n)}`;
      }

      this.logger.warn(`no plural rule found for: ${code}`);
      return this.getSuffix('dev', count, options);
    }
  }

  const deepFindWithDefaults = (
    data,
    defaultData,
    key,
    keySeparator = '.',
    ignoreJSONStructure = true,
  ) => {
    let path = getPathWithDefaults(data, defaultData, key);
    // false, 0 and '' are values; null still falls back to a flat key
    if (path == null && ignoreJSONStructure && isString(key)) {
      path = deepFind(data, key, keySeparator);
      if (path === undefined) path = deepFind(defaultData, key, keySeparator);
    }
    return path;
  };

  // A value inside the `{ ... }` options of a `$t(key, { ... })`, escaped for a JSON string:
  // it can not end the string, and no markup reaches the output if the options do not parse.
  const escapeNestingOptionsValue = (value) =>
    makeString(value).replace(
      // eslint-disable-next-line no-control-regex
      /["'\\&<>\u0000-\u001f]/g,
      (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`,
    );

  class Interpolator {
    constructor(options = {}, logger = baseLogger) {
      this.logger = logger.create('interpolator');

      this.options = options;
      this.format = options?.interpolation?.format || ((value) => value);
      this.init(options);
    }

    init(options = {}) {
      if (!options.interpolation) options.interpolation = { escapeValue: true };

      const {
        escape: escape$1,
        escapeValue,
        useRawValueToEscape,
        prefix,
        suffix,
        formatSeparator,
        unescapeSuffix,
        unescapePrefix,
        nestingPrefix,
        nestingSuffix,
        nestingOptionsSeparator,
        maxReplaces,
        alwaysFormat,
      } = options.interpolation;

      this.escape = escape$1 !== undefined ? escape$1 : escape;
      this.escapeValue = escapeValue !== undefined ? escapeValue : true;
      this.useRawValueToEscape = useRawValueToEscape !== undefined ? useRawValueToEscape : false;

      this.prefix = prefix ? regexEscape(prefix) : '{{';
      this.suffix = suffix ? regexEscape(suffix) : '}}';

      this.formatSeparator = formatSeparator || ',';

      this.unescapePrefix = unescapeSuffix ? '' : unescapePrefix ? regexEscape(unescapePrefix) : '-';
      this.unescapeSuffix = this.unescapePrefix
        ? ''
        : unescapeSuffix
          ? regexEscape(unescapeSuffix)
          : '';

      // the plain texts every match of the regexps starts with: a text without them has no match
      this.prefixText = prefix || '{{';
      this.nestingPrefixText = nestingPrefix || '$t(';
      this.nestingPrefix = regexEscape(nestingPrefix || '$t(');
      this.nestingSuffix = regexEscape(nestingSuffix || ')');

      this.nestingOptionsSeparator = nestingOptionsSeparator || ',';

      this.maxReplaces = maxReplaces || 1000;

      this.alwaysFormat = alwaysFormat !== undefined ? alwaysFormat : false;

      // the regexp
      this.resetRegExp();
    }

    reset() {
      if (this.options) this.init(this.options);
    }

    resetRegExp() {
      const getOrResetRegExp = (existingRegExp, pattern) => {
        if (existingRegExp?.source === pattern) {
          existingRegExp.lastIndex = 0;
          return existingRegExp;
        }
        return new RegExp(pattern, 'g');
      };

      this.regexp = getOrResetRegExp(this.regexp, `${this.prefix}(.+?)${this.suffix}`);
      this.regexpUnescape = getOrResetRegExp(
        this.regexpUnescape,
        `${this.prefix}${this.unescapePrefix}(.+?)${this.unescapeSuffix}${this.suffix}`,
      );
      // Every alternative starts with a different char (plain / " / ' / "("), so there is
      // only one way to split the input. Overlapping alternatives (e.g. `[^()"']+` inside
      // `*?`) backtrack exponentially on an unclosed `$t(` (ReDoS).
      this.nestingRegexp = getOrResetRegExp(
        this.nestingRegexp,
        `${this.nestingPrefix}((?:[^()"']|"[^"]*"|'[^']*'|\\((?:[^()"']|"[^"]*"|'[^']*')*\\))*?)${this.nestingSuffix}`,
      );
    }

    interpolate(str, data, lng, options, escape) {
      let match;
      let value;
      let replaces;
      const original = str;

      const defaultData =
        (this.options && this.options.interpolation && this.options.interpolation.defaultVariables) ||
        {};

      const handleFormat = (key) => {
        if (!key.includes(this.formatSeparator)) {
          const path = deepFindWithDefaults(
            data,
            defaultData,
            key,
            this.options.keySeparator,
            this.options.ignoreJSONStructure,
          );
          return this.alwaysFormat
            ? this.format(path, undefined, lng, { ...options, ...data, interpolationkey: key })
            : path;
        }

        const p = key.split(this.formatSeparator);
        const k = p.shift().trim();
        const f = p.join(this.formatSeparator).trim();

        return this.format(
          deepFindWithDefaults(
            data,
            defaultData,
            k,
            this.options.keySeparator,
            this.options.ignoreJSONStructure,
          ),
          f,
          lng,
          {
            ...options,
            ...data,
            interpolationkey: k,
          },
        );
      };

      this.resetRegExp();

      // Security warning: a `{{- var}}` inside a $t() nesting options block
      // (i.e. $t(key, { ... "{{- var}}" ... })) is inserted unescaped, so an
      // attacker-controlled value that contains `"` can break out of the JSON
      // string literal and inject extra nesting options (e.g. redirect lng/ns).
      // A `{{var}}` there is escaped for JSON by nest(), whatever escapeValue is.
      // See the CHANGELOG (26.0.6 and later) and the security docs.
      if (typeof str === 'string' && /\$t\([^)]*\{[^}]*\{\{-/.test(str)) {
        this.logger.warn(
          'nesting options string contains a variable inserted unescaped with {{- }}: ' +
            'if its value is attacker-controlled it can inject additional nesting options ' +
            '(e.g. redirect lng/ns). Use {{var}} there, which is escaped for the options, or ' +
            'sanitise untrusted input before passing it to t().',
        );
      }

      const missingInterpolationHandler =
        options?.missingInterpolationHandler || this.options.missingInterpolationHandler;

      const skipOnVariables =
        options?.interpolation?.skipOnVariables !== undefined
          ? options.interpolation.skipOnVariables
          : this.options.interpolation.skipOnVariables;

      // no placeholder at all: neither regexp can match
      if (isString(str) && !str.includes(this.prefixText)) return str;

      if (!escape) {
        escape = (val) => (this.escapeValue ? this.escape(val) : val);
        // The `{ ... }` options of a `$t(key, { ... })` are left for nest(), which fills them in
        // escaped for JSON. Escaped for HTML here, a value was escaped again by the nested t().
        if (isString(str) && str.includes(this.nestingPrefixText)) {
          const nestingRegexp = new RegExp(this.nestingRegexp);
          const optionsRegexp = new RegExp(`${regexEscape(this.nestingOptionsSeparator)}[ ]*{`);
          let out = '';
          let lastEnd = 0;
          let nesting;
          while ((nesting = nestingRegexp.exec(str))) {
            const inner = nesting.index + this.nestingPrefixText.length;
            const opts = optionsRegexp.exec(nesting[1]);
            const start = opts ? inner + opts.index + opts[0].length - 1 : -1;
            // nest() takes the options up to the last `}` (formatters may follow)
            const end = inner + nesting[1].lastIndexOf('}') + 1;
            // `$t(key, {{- options}})`: the options are a variable, filled in here
            if (start !== -1 && end > start && !str.startsWith(this.prefixText, start)) {
              out +=
                this.interpolate(str.slice(lastEnd, start), data, lng, options, escape) +
                str.slice(start, end);
              lastEnd = end;
            }
          }
          if (lastEnd) return out + this.interpolate(str.slice(lastEnd), data, lng, options, escape);
        }
      }

      const todos = [
        {
          // unescape if has unescapePrefix/Suffix
          regex: this.regexpUnescape,
          safeValue: (val) => val,
        },
        {
          // regular escape on demand
          regex: this.regexp,
          safeValue: escape,
        },
      ];
      // skipOnVariables: the escape pass skips the unescaped values, offset by its own edits.
      const unescapedValues = [];
      let shift = 0;
      todos.forEach((todo) => {
        replaces = 0;
        while ((match = todo.regex.exec(str))) {
          const at = match.index - shift;
          const written = unescapedValues.find(([start, end]) => at >= start && at < end);
          if (written) {
            todo.regex.lastIndex = written[1] + shift;
            continue;
          }
          const matchedVar = match[1].trim();
          value = handleFormat(matchedVar);
          if (value === undefined) {
            if (typeof missingInterpolationHandler === 'function') {
              const temp = missingInterpolationHandler(str, match, options);
              value = isString(temp) ? temp : '';
            } else if (
              options &&
              Object.prototype.hasOwnProperty.call(
                options,
                matchedVar.split(this.formatSeparator)[0].trim(),
              )
            ) {
              value = ''; // undefined becomes empty string
            } else if (skipOnVariables) {
              // keyed by the placeholder text: both passes see an unescaped `{{- var}}`.
              // Checked here too, so a call without debug does not build the strings.
              if (this.logger.debug) {
                this.logger.once(
                  `${original}\u0000${match[0]}`,
                  'warn',
                  `missed to pass in variable ${matchedVar} for interpolating ${original}`,
                );
              }
              value = match[0];
              continue; // this makes sure it continues to detect others
            } else {
              this.logger.warn(`missed to pass in variable ${matchedVar} for interpolating ${str}`);
              value = '';
            }
          } else if (!isString(value) && !this.useRawValueToEscape) {
            value = makeString(value);
          }
          // makeString: with useRawValueToEscape, `{{- var}}` and escapeValue: false pass the raw value.
          const safeValue = makeString(todo.safeValue(value));
          // Sliced in at match.index: String.replace may hit a copy inside an earlier value.
          str = str.slice(0, match.index) + safeValue + str.slice(match.index + match[0].length);
          if (skipOnVariables) {
            if (todo.regex === this.regexpUnescape) {
              unescapedValues.push([match.index, match.index + safeValue.length]);
            } else {
              shift += safeValue.length - match[0].length;
            }
            todo.regex.lastIndex += safeValue.length;
            todo.regex.lastIndex -= match[0].length;
          } else {
            todo.regex.lastIndex = 0;
          }
          replaces++;
          if (replaces >= this.maxReplaces) {
            break;
          }
        }
      });
      return str;
    }

    nest(str, fc, options = {}) {
      let match;
      let value;

      let clonedOptions;

      // if value is something like "myKey": "lorem $(anotherKey, { "count": {{aValueInOptions}} })"
      const handleHasOptions = (key, inheritedOptions) => {
        const sep = this.nestingOptionsSeparator;
        if (!key.includes(sep)) return key;

        const c = key.split(new RegExp(`${regexEscape(sep)}[ ]*{`));

        const template = `{${c[1]}`;
        key = c[0];
        let optionsString;
        // interpolate() left the variables in the options to this: escaped for JSON, a value is
        // passed on unchanged, and the nested t() escapes it once, as a direct t() call does
        const parse = (escape) => {
          optionsString = this.interpolate(template, inheritedOptions, options.lng, options, escape);
          const matchedSingleQuotes = optionsString.match(/'/g);
          const matchedDoubleQuotes = optionsString.match(/"/g);
          if (
            ((matchedSingleQuotes?.length ?? 0) % 2 === 0 && !matchedDoubleQuotes) ||
            (matchedDoubleQuotes?.length ?? 0) % 2 !== 0
          ) {
            optionsString = optionsString.replace(/'/g, '"');
          }
          return JSON.parse(optionsString);
        };

        try {
          const parsed = parse(escapeNestingOptionsValue);
          // the nested t() does not interpolate these again: their values are escaped here
          const verbatim = this.escapeValue
            ? Object.keys(parsed).filter((k) => k.startsWith('defaultValue') || k === 'joinArrays')
            : [];
          if (verbatim.length) {
            const escaped = parse((val) => escapeNestingOptionsValue(this.escape(val)));
            verbatim.forEach((k) => {
              parsed[k] = escaped[k];
            });
          }

          clonedOptions = inheritedOptions ? { ...inheritedOptions, ...parsed } : parsed;
        } catch (e) {
          this.logger.warn(`failed parsing options string in nesting for key ${key}`, e);
          return `${key}${sep}${optionsString}`;
        }

        // assert we do not get a endless loop on interpolating defaultValue again and again
        if (clonedOptions.defaultValue && clonedOptions.defaultValue.includes(this.prefix))
          delete clonedOptions.defaultValue;
        return key;
      };

      // nothing to nest (the common case): no copy of the regexp to scan with
      if (isString(str) && !str.includes(this.nestingPrefixText)) return str;

      // One pass over the original str with an own copy of the regexp. The nested lookups
      // (fc) reset the shared nestingRegexp, so the loop used to rescan from 0 after every
      // match: quadratic, and it nested again any `$t(...)` inside a resolved value (e.g. a
      // variable the nested lookup kept literal under skipOnVariables).
      const nestingRegexp = new RegExp(this.nestingRegexp);
      let out = '';
      let lastEnd = 0;
      while ((match = nestingRegexp.exec(str))) {
        let formatters = [];

        clonedOptions = { ...options };
        clonedOptions =
          clonedOptions.replace && !isString(clonedOptions.replace)
            ? clonedOptions.replace
            : clonedOptions;
        clonedOptions.applyPostProcessor = false; // avoid post processing on nested lookup
        delete clonedOptions.defaultValue; // assert we do not get a endless loop on interpolating defaultValue again and again

        /**
         * If there is more than one parameter (contains the format separator). E.g.:
         *   - t(a, b)
         *   - t(a, b, c)
         *
         * And those parameters are not dynamic values (parameters do not include curly braces). E.g.:
         *   - Not t(a, { "key": "{{variable}}" })
         *   - Not t(a, b, {"keyA": "valueA", "keyB": "valueB"})
         *
         * Since v25.3.0 also this is possible: https://github.com/i18next/i18next/pull/2325
         */
        const keyEndIndex = /{.*}/s.test(match[1])
          ? match[1].lastIndexOf('}') + 1
          : match[1].indexOf(this.formatSeparator);
        if (keyEndIndex !== -1) {
          formatters = match[1]
            .slice(keyEndIndex)
            .split(this.formatSeparator)
            .map((elem) => elem.trim())
            .filter(Boolean);
          match[1] = match[1].slice(0, keyEndIndex);
        }

        value = fc(handleHasOptions.call(this, match[1].trim(), clonedOptions), clonedOptions);

        // is only the nesting key (key1 = '$(key2)') return the value without stringify
        if (value && match[0] === str && !isString(value)) return value;

        // no string to include or empty
        if (!isString(value)) value = makeString(value);
        if (!value) {
          this.logger.warn(`missed to resolve ${match[1]} for nesting ${str}`);
          value = '';
        }

        if (formatters.length) {
          value = formatters.reduce(
            (v, f) =>
              this.format(v, f, options.lng, { ...options, interpolationkey: match[1].trim() }),
            value.trim(),
          );
        }

        // Nested keys should not be escaped by default #854
        // Sliced in, not String.replace, so `$&`, `$'`, "$`" and `$$` in the value stay literal.
        // makeString: a formatter in the nesting chain may have returned a non-string.
        out += str.slice(lastEnd, match.index) + makeString(value);
        lastEnd = nestingRegexp.lastIndex;
        this.regexp.lastIndex = 0;
      }
      // no match: str untouched (it may be a non-string)
      return lastEnd ? out + str.slice(lastEnd) : str;
    }
  }

  const parseFormatStr = (formatStr) => {
    let formatName = formatStr.toLowerCase().trim();
    const formatOptions = {};
    if (formatStr.includes('(')) {
      const p = formatStr.split('(');
      formatName = p[0].toLowerCase().trim();

      const optStr = p[1].slice(0, -1);

      // extra for currency
      if (formatName === 'currency' && !optStr.includes(':')) {
        if (!formatOptions.currency) formatOptions.currency = optStr.trim();
      } else if (formatName === 'relativetime' && !optStr.includes(':')) {
        if (!formatOptions.range) formatOptions.range = optStr.trim();
      } else {
        const opts = optStr.split(';');

        opts.forEach((opt) => {
          if (opt) {
            const [key, ...rest] = opt.split(':');
            const val = rest
              .join(':')
              .trim()
              .replace(/^'+|'+$/g, ''); // trim and replace ''

            const trimmedKey = key.trim();

            if (!formatOptions[trimmedKey]) formatOptions[trimmedKey] = val;
            if (val === 'false') formatOptions[trimmedKey] = false;
            if (val === 'true') formatOptions[trimmedKey] = true;
            if (!isNaN(val)) formatOptions[trimmedKey] = parseInt(val, 10);
          }
        });
      }
    }

    return {
      formatName,
      formatOptions,
    };
  };

  // The cache key holds the options of the t() call, and so the interpolated values: a formatter is
  // kept for each new value. Without a limit, a long running process that formats ever new
  // amounts, dates or names keeps them all (#2227).
  const cachedFormattersLimit = 1000;

  const createCachedFormatter = (fn) => {
    const cache = new Map();
    return (v, l, o) => {
      let optForCache = o;
      // this cache optimization will only work for keys having 1 interpolated value
      if (
        o &&
        o.interpolationkey &&
        o.formatParams &&
        o.formatParams[o.interpolationkey] &&
        o[o.interpolationkey]
      ) {
        optForCache = {
          ...optForCache,
          [o.interpolationkey]: undefined,
        };
      }
      let key;
      try {
        key = l + JSON.stringify(optForCache);
      } catch (e) {
        // options are not serializable (e.g. BigInt or circular values): format without the cache
        return fn(getCleanedCode(l), o)(v);
      }
      let frm = cache.get(key);
      if (!frm) {
        frm = fn(getCleanedCode(l), o);
        // forget the oldest formatter, which is made again if it is needed
        if (cache.size >= cachedFormattersLimit) cache.delete(cache.keys().next().value);
        cache.set(key, frm);
      }
      return frm(v);
    };
  };

  const createNonCachedFormatter = (fn) => (v, l, o) => fn(getCleanedCode(l), o)(v);

  class Formatter {
    constructor(options = {}) {
      this.logger = baseLogger.create('formatter');
      this.options = options;
      this.init(options);
    }

    init(services, options = { interpolation: {} }) {
      // the instance's logger (the constructor runs init() with the options instead of the services)
      if (services?.logger?.create) this.logger = services.logger.create('formatter');
      this.formatSeparator = options.interpolation.formatSeparator || ',';
      const cf = options.cacheInBuiltFormats ? createCachedFormatter : createNonCachedFormatter;
      this.formats = {
        number: cf((lng, opt) => {
          const formatter = new Intl.NumberFormat(lng, { ...opt });
          return (val) => formatter.format(val);
        }),
        currency: cf((lng, opt) => {
          const formatter = new Intl.NumberFormat(lng, { ...opt, style: 'currency' });
          return (val) => formatter.format(val);
        }),
        datetime: cf((lng, opt) => {
          const formatter = new Intl.DateTimeFormat(lng, { ...opt });
          return (val) => formatter.format(val);
        }),
        relativetime: cf((lng, opt) => {
          const formatter = new Intl.RelativeTimeFormat(lng, { ...opt });
          return (val) => formatter.format(val, opt.range || 'day');
        }),
        list: cf((lng, opt) => {
          const formatter = new Intl.ListFormat(lng, { ...opt });
          return (val) => formatter.format(val);
        }),
      };
    }

    add(name, fc) {
      this.formats[name.toLowerCase().trim()] = fc;
    }

    addCached(name, fc) {
      this.formats[name.toLowerCase().trim()] = createCachedFormatter(fc);
    }

    format(value, format, lng, options = {}) {
      if (!format) return value;
      if (value == null) return value;
      const rawFormats = format.split(this.formatSeparator);
      const formats = [];
      for (let i = 0; i < rawFormats.length; i++) {
        let f = rawFormats[i];
        while (f.indexOf('(') > -1 && !f.includes(')') && i + 1 < rawFormats.length) {
          f = `${f}${this.formatSeparator}${rawFormats[++i]}`;
        }
        formats.push(f);
      }

      const result = formats.reduce((mem, f) => {
        const { formatName, formatOptions } = parseFormatStr(f);

        if (this.formats[formatName]) {
          let formatted = mem;
          try {
            // options passed explicit for that formatted value
            const valOptions = options?.formatParams?.[options.interpolationkey] || {};

            // language
            const l = valOptions.locale || valOptions.lng || options.locale || options.lng || lng;

            formatted = this.formats[formatName](mem, l, {
              ...formatOptions,
              ...options,
              ...valOptions,
            });
          } catch (error) {
            this.logger.warn(error);
          }
          return formatted;
        } else {
          this.logger.warn(`there was no format function for ${formatName}`);
        }
        return mem;
      }, value);

      return result;
    }
  }

  // A failed load stays in the state, so it is not read again until a reload. Languages and namespaces can
  // come from requests (a server's language detection, i18next-http-middleware's getResourcesHandler), so
  // only the most recent failures stay: one entry per made-up value would grow without end.
  const maxFailedLoads = 1000;

  const removePending = (q, name) => {
    if (q.pending[name] !== undefined) {
      delete q.pending[name];
      q.pendingCount--;
    }
  };

  class Connector extends EventEmitter {
    constructor(backend, store, services, options = {}) {
      super();

      this.backend = backend;
      this.store = store;
      this.services = services;
      this.languageUtils = services.languageUtils;
      this.options = options;
      this.logger = (services.logger || baseLogger).create('backendConnector');

      this.waitingReads = [];
      this.maxParallelReads = options.maxParallelReads || 10;
      this.readingCalls = 0;

      this.maxRetries = options.maxRetries >= 0 ? options.maxRetries : 5;
      this.retryTimeout = options.retryTimeout >= 1 ? options.retryTimeout : 350;

      this.state = {};
      this.failed = new Set();
      this.queue = [];

      this.backend?.init?.(services, options.backend, options);
      this.callbackApi = callbackApiOf(this.backend);
      if (
        this.backend &&
        this.callbackApi === undefined &&
        (this.backend.read || this.backend.create)
      ) {
        this.logger.deprecate(
          'backend: set callbackApi to declare the calling convention (true: read(language, namespace, callback) and create(languages, namespace, key, fallbackValue, callback, options); false: both return a promise or a value); guessing it from the number of parameters is deprecated',
        );
      }
    }

    queueLoad(languages, namespaces, options, callback) {
      // find what needs to be loaded
      const toLoad = {};
      const pending = {};
      const toLoadLanguages = {};
      const toLoadNamespaces = {};

      languages.forEach((lng) => {
        let hasAllNamespaces = true;

        namespaces.forEach((ns) => {
          const name = `${lng}|${ns}`;

          if (!options.reload && this.store.hasResourceBundle(lng, ns)) {
            this.state[name] = 2; // loaded
          } else if (!options.reload && this.state[name] < 0) ; else if (this.state[name] === 1) {
            if (pending[name] === undefined) pending[name] = true;
          } else {
            this.state[name] = 1; // pending

            hasAllNamespaces = false;

            if (pending[name] === undefined) pending[name] = true;
            if (toLoad[name] === undefined) toLoad[name] = true;
            if (toLoadNamespaces[ns] === undefined) toLoadNamespaces[ns] = true;
          }
        });

        if (!hasAllNamespaces) toLoadLanguages[lng] = true;
      });

      if (Object.keys(toLoad).length || Object.keys(pending).length) {
        this.queue.push({
          pending,
          pendingCount: Object.keys(pending).length,
          loaded: {},
          errors: [],
          callback,
        });
      }

      return {
        toLoad: Object.keys(toLoad),
        pending: Object.keys(pending),
        toLoadLanguages: Object.keys(toLoadLanguages),
        toLoadNamespaces: Object.keys(toLoadNamespaces),
      };
    }

    loaded(name, err, data) {
      const s = name.split('|');
      const lng = s[0];
      const ns = s[1];

      if (err) this.emit('failedLoading', lng, ns, err);

      if (!err && data) {
        this.store.addResourceBundle(lng, ns, data, undefined, undefined, { skipCopy: true });
      }

      // set loaded
      this.state[name] = err ? -1 : 2;
      if (err && data) this.state[name] = 0;
      this.failed.delete(name);
      if (err) {
        this.failed.add(name);
        if (this.failed.size > maxFailedLoads) {
          const oldest = this.failed.values().next().value;
          this.failed.delete(oldest);
          // forget it unless it is being read again: a later load reads it again
          if (this.state[oldest] < 1) delete this.state[oldest];
        }
      }

      // consolidated loading done in this run - only emit once for a loaded namespace
      const loaded = {};
      // an error thrown by a callback: the other callbacks and the loaded event still run, then it is thrown on
      const thrown = [];

      // callback if ready
      this.queue.forEach((q) => {
        pushPath(q.loaded, [lng], ns);
        removePending(q, name);

        if (err) q.errors.push(err);

        if (q.pendingCount === 0 && !q.done) {
          // only do once per loaded -> this.emit('loaded', q.loaded);
          Object.keys(q.loaded).forEach((l) => {
            if (!Object.prototype.hasOwnProperty.call(loaded, l)) loaded[l] = {};
            const loadedKeys = q.loaded[l];
            if (loadedKeys.length) {
              loadedKeys.forEach((n) => {
                if (loaded[l][n] === undefined) loaded[l][n] = true;
              });
            }
          });

          q.done = true;
          try {
            if (q.errors.length) {
              q.callback(q.errors);
            } else {
              q.callback();
            }
          } catch (e) {
            thrown.push(e);
          }
        }
      });

      // remove done load requests
      this.queue = this.queue.filter((q) => !q.done);

      // emit consolidated loaded event
      this.emit('loaded', loaded);

      if (thrown.length) throw thrown[0];
    }

    read(lng, ns, fcName, tried = 0, wait = this.retryTimeout, callback) {
      if (!lng.length) return callback(null, {}); // noting to load

      // Limit parallelism of calls to backend
      // This is needed to prevent trying to open thousands of
      // sockets or file descriptors, which can cause failures
      // and actually make the entire process take longer.
      if (this.readingCalls >= this.maxParallelReads) {
        this.waitingReads.push({ lng, ns, fcName, tried, wait, callback });
        return;
      }
      this.readingCalls++;

      const resolver = (err, data) => {
        this.readingCalls--;
        if (this.waitingReads.length > 0) {
          const next = this.waitingReads.shift();
          this.read(next.lng, next.ns, next.fcName, next.tried, next.wait, next.callback);
        }
        if (err && data /* = retryFlag */ && tried < this.maxRetries) {
          setTimeout(() => {
            this.read(lng, ns, fcName, tried + 1, wait * 2, callback);
          }, wait);
          return;
        }
        callback(err, data);
      };

      const fc = this.backend[fcName].bind(this.backend);
      if (this.callbackApi === false || (this.callbackApi === undefined && fc.length === 2)) {
        // no callback
        let r;
        try {
          r = fc(lng, ns);
        } catch (err) {
          resolver(err);
          return;
        }
        // outside the try and not with .catch(): an error thrown by the callback must not call the resolver again
        if (r && typeof r.then === 'function') {
          // promise
          r.then((data) => resolver(null, data), resolver);
        } else {
          // sync
          resolver(null, r);
        }
        return;
      }

      // normal with callback
      return fc(lng, ns, resolver);
    }

    prepareLoading(languages, namespaces, options = {}, callback) {
      if (!this.backend) {
        this.logger.warn('No backend was added via i18next.use. Will not load resources.');
        return callback && callback();
      }

      if (isString(languages)) languages = this.languageUtils.toResolveHierarchy(languages);
      if (isString(namespaces)) namespaces = [namespaces];

      const toLoad = this.queueLoad(languages, namespaces, options, callback);
      if (!toLoad.toLoad.length) {
        if (!toLoad.pending.length) callback(); // nothing to load and no pendings...callback now
        return null; // pendings will trigger callback
      }

      toLoad.toLoad.forEach((name) => {
        this.loadOne(name);
      });
    }

    load(languages, namespaces, callback) {
      this.prepareLoading(languages, namespaces, {}, callback);
    }

    reload(languages, namespaces, callback) {
      this.prepareLoading(languages, namespaces, { reload: true }, callback);
    }

    loadOne(name, prefix = '') {
      const s = name.split('|');
      const lng = s[0];
      const ns = s[1];

      this.read(lng, ns, 'read', undefined, undefined, (err, data) => {
        if (err) this.logger.warn(`${prefix}loading namespace ${ns} for language ${lng} failed`, err);
        if (!err && data)
          this.logger.log(`${prefix}loaded namespace ${ns} for language ${lng}`, data);

        this.loaded(name, err, data);
      });
    }

    // hasLoadedNamespace: the check of the calling instance; the connector (and its services) is shared with all clones,
    // so a direct call without it checks the newest clone, or the instance that created the connector
    saveMissing(
      languages,
      namespace,
      key,
      fallbackValue,
      isUpdate,
      options = {},
      clb = () => {},
      hasLoadedNamespace = this.newestCloneHasLoadedNamespace ||
        this.services?.utils?.hasLoadedNamespace,
    ) {
      if (hasLoadedNamespace && !hasLoadedNamespace(namespace)) {
        this.logger.warn(
          `did not save key "${key}" as the namespace "${namespace}" was not yet loaded`,
          'This means something IS WRONG in your setup. You access the t function before i18next.init / i18next.loadNamespace / i18next.changeLanguage was done. Wait for the callback or Promise to resolve before accessing it!!!',
        );
        return;
      }

      // ignore non valid keys
      if (key === undefined || key === null || key === '') return;

      if (this.backend?.create) {
        const opts = {
          ...options,
          isUpdate,
        };
        const fc = this.backend.create.bind(this.backend);
        if (this.callbackApi === false || (this.callbackApi === undefined && fc.length < 6)) {
          // no callback
          try {
            let r;
            if (this.callbackApi === false || fc.length === 5) {
              // future callback-less api for i18next-locize-backend
              r = fc(languages, namespace, key, fallbackValue, opts);
            } else {
              r = fc(languages, namespace, key, fallbackValue);
            }
            if (r && typeof r.then === 'function') {
              // promise
              r.then((data) => clb(null, data)).catch(clb);
            } else {
              // sync
              clb(null, r);
            }
          } catch (err) {
            clb(err);
          }
        } else {
          // normal with callback
          fc(languages, namespace, key, fallbackValue, clb /* unused callback */, opts);
        }
      }

      // write to store to avoid resending
      if (!languages || !languages[0]) return;
      this.store.addResource(languages[0], namespace, key, fallbackValue);
    }
  }

  const get = () => ({
    debug: false,
    initAsync: true,

    ns: ['translation'],
    defaultNS: ['translation'],
    fallbackLng: false, // string, array, object or function; 'dev' only when set
    fallbackNS: false, // string or array of namespaces

    supportedLngs: false, // array with supported languages
    nonExplicitSupportedLngs: false,
    load: 'all', // | currentOnly | languageOnly
    preload: false, // array with preload languages

    keySeparator: '.',
    nsSeparator: ':',
    pluralSeparator: '_',
    contextSeparator: '_',

    // Selector API runtime mode. Mirrors the TypeOptions `enableSelector` flag.
    // - false / true / 'optimize': legacy rule — only a leading *secondary* namespace
    //   in a multi-element ns array is rewritten as a namespace prefix (v25.8.19)
    // - 'strict': always treat path[0] as a namespace prefix when it matches the
    //   scope's namespace list, including the primary and single-ns hooks.
    //   Pairs with `NsResource` dropping its flattened-primary union at the type
    //   level. Opt-in; default behavior is unchanged.
    enableSelector: false,

    partialBundledLanguages: false, // allow bundling certain languages that are not remotely fetched
    saveMissing: false, // enable to send missing values
    updateMissing: false, // enable to update default values if different from translated value (only useful on initial development, or when keeping code as source of truth)
    saveMissingTo: 'fallback', // 'current' || 'all'
    saveMissingPlurals: true, // will save all forms not only singular key
    missingKeyHandler: false, // function(lng, ns, key, fallbackValue) -> override if prefer on handling
    missingInterpolationHandler: false, // function(str, match)

    postProcess: false, // string or array of postProcessor names
    postProcessPassResolved: false, // pass resolved object into 'options.i18nResolved' for postprocessor
    returnNull: false, // allows null value as valid translation
    returnEmptyString: false, // an empty string falls back like a missing value
    returnObjects: false,
    joinArrays: false, // or string to join array
    returnedObjectHandler: false, // function(key, value, options) triggered if key returns object but returnObjects is set to false
    parseMissingKeyHandler: false, // function(key) parsed a key that was not found in t() before returning
    appendNamespaceToMissingKey: false,
    appendNamespaceToCIMode: false,
    overloadTranslationOptionHandler: (args) => {
      let ret = {};
      if (typeof args[1] === 'object') ret = args[1];
      if (isString(args[1])) ret.defaultValue = args[1];
      if (isString(args[2])) ret.tDescription = args[2];
      if (typeof args[2] === 'object' || typeof args[3] === 'object') {
        const options = args[3] || args[2];
        Object.keys(options).forEach((key) => {
          ret[key] = options[key];
        });
      }
      return ret;
    },
    interpolation: {
      escapeValue: true,
      prefix: '{{',
      suffix: '}}',
      formatSeparator: ',',
      // unescapeSuffix: '',
      unescapePrefix: '-',

      nestingPrefix: '$t(',
      nestingSuffix: ')',
      nestingOptionsSeparator: ',',
      // defaultVariables: undefined // object that can have values to interpolate on - extends passed in interpolation data
      maxReplaces: 1000, // max replaces to prevent endless loop
      skipOnVariables: true,
    },
    cacheInBuiltFormats: true,
  });

  const transformOptions = (options) => {
    // create namespace object if namespace is passed in as string
    if (isString(options.ns)) options.ns = [options.ns];
    if (isString(options.fallbackLng)) options.fallbackLng = [options.fallbackLng];
    if (isString(options.fallbackNS)) options.fallbackNS = [options.fallbackNS];

    // extend supportedLngs with cimode
    if (options.supportedLngs && !options.supportedLngs.includes('cimode')) {
      options.supportedLngs = options.supportedLngs.concat(['cimode']);
    }

    return options;
  };

  const noop = () => {};

  // defaults under the given options, with the interpolation options merged one level deep
  const withDefaults = (options) => {
    const defOpts = get();
    const merged = { ...defOpts, ...options };
    merged.interpolation = { ...defOpts.interpolation, ...options.interpolation }; // do not use reference
    if (typeof merged.overloadTranslationOptionHandler !== 'function') {
      merged.overloadTranslationOptionHandler = defOpts.overloadTranslationOptionHandler;
    }
    return merged;
  };

  // The language codes the user configured at init() (supportedLngs, a fallbackLng that is not a function,
  // preload, the languages in resources): changeLanguage() and loadLanguages() take them whatever their shape.
  // Taken from the options as passed, so neither loadLanguages() (it extends preload) nor added resources, nor
  // a fallbackLng function that returns the code it gets, can make an outside code count as configured.
  const configuredLanguageCodes = (options) => {
    const codes = [].concat(options.supportedLngs || [], options.preload || []);
    codes.push(...Object.keys(options.resources || {}));
    const fallbackLng = options.fallbackLng;
    if (isString(fallbackLng) || Array.isArray(fallbackLng)) codes.push(...[].concat(fallbackLng));
    else if (fallbackLng && typeof fallbackLng === 'object') {
      Object.keys(fallbackLng).forEach((code) => {
        if (code !== 'default') codes.push(code);
        codes.push(...[].concat(fallbackLng[code]));
      });
    }
    return codes;
  };

  // A code from lng, changeLanguage(), a detector or loadLanguages() with another shape than isSafeLanguageCode()
  // allows is refused unless it is configured: apps put the language into <html lang>, URLs and file paths.
  const isRefusedLanguageCode = (i18n, code) => {
    if (!isString(code) || isSafeLanguageCode(code) || i18n.configuredLngs?.has(code)) return false;
    i18n.logger.once(
      `lng:${code}`,
      'warn',
      `refused the language code '${code.slice(0, 64)}' from lng, changeLanguage(), the language detector or loadLanguages(): it is not configured and has other characters than letters, digits, '-', '_', '@' and '.' (or '..', or more than 128). List it in supportedLngs to use it`,
    );
    return true;
  };

  // Binds the member functions of the given class instance so that they can be
  // destructured or used as callbacks.
  const bindMemberFunctions = (inst) => {
    const mems = Object.getOwnPropertyNames(Object.getPrototypeOf(inst));
    mems.forEach((mem) => {
      if (typeof inst[mem] === 'function') {
        inst[mem] = inst[mem].bind(inst);
      }
    });
  };

  class I18n extends EventEmitter {
    constructor(options = {}, callback) {
      super();

      // the options as the user passed them, to tell "not set" from a default; this.options has the
      // defaults merged in from the start, so getFixedT() and the options work before init()
      this.userOptions = transformOptions(options);
      this.options = withDefaults(this.userOptions);
      // post-processors registered with use(); a clone's registry inherits its parent's
      this.services = { postProcessors: Object.create(null) };
      // each instance logs through its own logger (a clone through its parent's); init() sets it up again
      // with the logger module, until then it logs to the console with the options given here
      this.logger = new Logger(null, this.options);
      this.modules = { external: [] };

      bindMemberFunctions(this);

      if (callback && !this.isInitialized && !options.isClone) {
        // https://github.com/i18next/i18next/issues/879
        // the user's own initAsync: the defaults merged above always have it true
        if (!this.userOptions.initAsync) {
          this.init(options, callback);
          return this;
        }
        setTimeout(() => {
          this.init(options, callback);
        }, 0);
      }
    }

    init(options = {}, callback) {
      this.isInitializing = true;
      if (typeof options === 'function') {
        callback = options;
        options = {};
      }

      if (options.defaultNS == null && options.ns) {
        if (isString(options.ns)) {
          options.defaultNS = options.ns;
        } else if (!options.ns.includes('translation')) {
          options.defaultNS = options.ns[0];
        }
      }

      transformOptions(options);
      // what the user set, in createInstance() or here
      const userOptions = { ...this.userOptions, ...options };
      this.options = withDefaults({ ...this.options, ...options });
      if (userOptions.keySeparator !== undefined) {
        this.options.userDefinedKeySeparator = userOptions.keySeparator;
      }
      if (userOptions.nsSeparator !== undefined) {
        this.options.userDefinedNsSeparator = userOptions.nsSeparator;
      }
      // a clone gets its parent's from cloneInstance(), with its own options added there: its init() options
      // are the parent's, whose inline resources are the live store
      if (!this.options.isClone) {
        this.configuredLngs = new Set([
          ...(this.configuredLngs || []),
          ...configuredLanguageCodes(userOptions),
        ]);
      }

      const createClassOnDemand = (ClassOrObject) => {
        if (!ClassOrObject) return null;
        if (typeof ClassOrObject === 'function') return new ClassOrObject();
        return ClassOrObject;
      };

      // init services
      if (!this.options.isClone) {
        this.logger.init(createClassOnDemand(this.modules.logger), this.options);
        const { logger } = this;
        this.pendingWarnings?.forEach((msg) => this.logger.warn(msg));
        this.pendingWarnings = undefined;

        let formatter;
        if (this.modules.formatter) {
          formatter = this.modules.formatter;
        } else {
          formatter = Formatter;
        }

        const lu = new LanguageUtil(this.options, logger);

        // if (this.options.resources) {
        //   Object.keys(this.options.resources).forEach((lng) => {
        //     const fLng = lu.formatLanguageCode(lng);
        //     if (fLng !== lng) {
        //       this.options.resources[fLng] = this.options.resources[lng];
        //       delete this.options.resources[lng];
        //       this.logger.warn(`init: lng in resource is not valid, mapping ${lng} to ${fLng}`);
        //     }
        //   })
        // }

        this.store = new ResourceStore(this.options.resources, this.options, logger);

        const s = this.services;
        s.logger = logger;
        s.resourceStore = this.store;
        s.languageUtils = lu;
        s.pluralResolver = new PluralResolver(lu, { prepend: this.options.pluralSeparator }, logger);

        if (formatter) {
          s.formatter = createClassOnDemand(formatter);
          if (s.formatter.init) s.formatter.init(s, this.options);
          this.options.interpolation.format = s.formatter.format.bind(s.formatter);
        }

        s.interpolator = new Interpolator(this.options, logger);
        s.utils = {
          hasLoadedNamespace: this.hasLoadedNamespace.bind(this),
          // lets a backend refresh its bundles (reloadInterval) without driving the backendConnector
          reloadResources: this.reloadResources.bind(this)
        };

        s.backendConnector = new Connector(
          createClassOnDemand(this.modules.backend),
          s.resourceStore,
          s,
          this.options,
        );
        // pipe events from backendConnector
        s.backendConnector.on('*', (event, ...args) => {
          this.emit(event, ...args);
        });

        if (this.modules.languageDetector) {
          s.languageDetector = createClassOnDemand(this.modules.languageDetector);
          if (s.languageDetector.init) s.languageDetector.init(s, this.options.detection, this.options);
          if (s.languageDetector.async && callbackApiOf(s.languageDetector) === undefined) {
            this.logger.deprecate(
              'languageDetector: set callbackApi to declare how the async detect() answers (true: detect(callback); false: detect() returns a promise); guessing it from the number of parameters is deprecated',
            );
          }
        }

        if (this.modules.i18nFormat) {
          s.i18nFormat = createClassOnDemand(this.modules.i18nFormat);
          if (s.i18nFormat.init) s.i18nFormat.init(this);
        }

        this.translator = new Translator(this.services, this.options);
        // pipe events from translator
        this.translator.on('*', (event, ...args) => {
          this.emit(event, ...args);
        });

        this.modules.external.forEach(m => {
          if (m.init) m.init(this);
        });
      }

      this.format = this.options.interpolation.format;
      if (!callback) callback = noop;

      if (this.options.fallbackLng && !this.services.languageDetector && !this.options.lng) {
        const codes = this.services.languageUtils.getFallbackCodes(this.options.fallbackLng);
        if (codes.length > 0 && codes[0] !== 'dev') this.options.lng = codes[0];
      }
      if (!this.services.languageDetector && !this.options.lng) {
        this.logger.warn('init: no languageDetector is used and no lng is defined');
      }

      // append api
      const storeApi = [
        'getResource',
        'hasResourceBundle',
        'getResourceBundle',
        'getDataByLanguage',
      ];
      storeApi.forEach(fcName => {
        this[fcName] = (...args) => this.store[fcName](...args);
      });
      const storeApiChained = [
        'addResource',
        'addResources',
        'addResourceBundle',
        'removeResourceBundle',
      ];
      storeApiChained.forEach(fcName => {
        this[fcName] = (...args) => {
          this.store[fcName](...args);
          return this;
        };
      });

      const deferred = defer();

      const load = () => {
        const finish = (err, t) => {
          this.isInitializing = false;
          if (this.isInitialized && !this.initializedStoreOnce) this.logger.warn('init: i18next is already initialized. You should call init just once!');
          this.isInitialized = true;
          if (!this.options.isClone) this.logger.log('initialized', this.options);
          this.emit('initialized', this.options);

          deferred.resolve(t); // not rejecting on err (as err is only a loading translation failed warning)
          callback(err, t);
        };
        // fix for use cases when calling changeLanguage before finished to initialized (i.e. https://github.com/i18next/i18next/issues/1552)
        // also covers cloneInstance race where deferred load() would overwrite a pending changeLanguage (https://github.com/i18next/i18next/issues/2422)
        if ((this.languages || this.isLanguageChangingTo) && !this.isInitialized) return finish(null, this.t.bind(this));
        this.changeLanguage(this.options.lng, finish);
      };

      if (this.options.resources || !this.options.initAsync) {
        load();
      } else {
        setTimeout(load, 0);
      }

      return deferred;
    }

    loadResources(language, callback = noop) {
      let usedCallback = callback;
      const usedLng = isString(language) ? language : this.language;
      if (typeof language === 'function') usedCallback = language;

      if (!this.options.resources || this.options.partialBundledLanguages) {
        if (usedLng?.toLowerCase() === 'cimode' && (!this.options.preload || this.options.preload.length === 0)) return usedCallback(); // avoid loading resources for cimode

        const toLoad = [];

        const append = lng => {
          if (!lng) return;
          if (lng === 'cimode') return;
          const lngs = this.services.languageUtils.toResolveHierarchy(lng);
          lngs.forEach(l => {
            if (l === 'cimode') return;
            if (!toLoad.includes(l)) toLoad.push(l);
          });
        };

        if (!usedLng) {
          // at least load fallbacks in this case
          const fallbacks = this.services.languageUtils.getFallbackCodes(this.options.fallbackLng);
          fallbacks.forEach(l => append(l));
        } else {
          append(usedLng);
        }

        this.options.preload?.forEach?.(l => append(l));

        this.services.backendConnector.load(toLoad, this.options.ns, (e) => {
          if (!e && !this.resolvedLanguage && this.language) this.setResolvedLanguage(this.language);
          usedCallback(e);
        });
      } else {
        usedCallback(null);
      }
    }

    reloadResources(lngs, ns, callback) {
      const deferred = defer();
      if (typeof lngs === 'function') {
        callback = lngs;
        lngs = undefined;
      }
      if (typeof ns === 'function') {
        callback = ns;
        ns = undefined;
      }
      // without languages: the current ones and every language the backend loaded or tried to load for this
      // instance and its clones (they share the connector), so a periodic reload of a backend also covers the
      // languages a clone loaded on demand
      if (!lngs) {
        const requested = Object.keys(this.services.backendConnector.state).map((name) => name.split('|')[0]);
        lngs = [...new Set([...(this.languages || []), ...requested])].filter((l) => l !== 'cimode');
      }
      if (!ns) ns = this.options.ns;
      if (!callback) callback = noop;
      this.services.backendConnector.reload(lngs, ns, err => {
        deferred.resolve(); // not rejecting on err (as err is only a loading translation failed warning)
        callback(err);
      });
      return deferred;
    }

    use(module) {
      if (!module) throw new Error('You are passing an undefined module! Please check the object you are passing to i18next.use()')
      if (!module.type) throw new Error('You are passing a wrong module! Please check the object you are passing to i18next.use()')

      // a second backend, detector, i18nFormat or formatter replaces the first one
      const setModule = (type) => {
        if (this.modules[type] && this.modules[type] !== module) {
          const msg = `use: this ${type} replaces the ${type} passed to an earlier use() call; only one ${type} is used per instance`;
          // use() mostly runs before init() has set up the logger (and debug), so the warning waits for init()
          if (this.isInitializing || this.isInitialized) this.logger.warn(msg);
          else (this.pendingWarnings = this.pendingWarnings || []).push(msg);
        }
        this.modules[type] = module;
      };

      if (module.type === 'backend') {
        setModule('backend');
      }

      if (module.type === 'logger' || (module.log && module.warn && module.error)) {
        this.modules.logger = module;
      }

      if (module.type === 'languageDetector') {
        setModule('languageDetector');
      }

      if (module.type === 'i18nFormat') {
        setModule('i18nFormat');
      }

      if (module.type === 'postProcessor') {
        this.services.postProcessors[module.name] = module;
      }

      if (module.type === 'formatter') {
        setModule('formatter');
      }

      if (module.type === '3rdParty') {
        this.modules.external.push(module);
      }

      return this;
    }

    // puts server-rendered resources into the store and switches to the server's language, each once
    // (react-i18next useSSR, next-i18next). Sets the same flags those wrote directly before.
    hydrate(resources, lng) {
      // a clone shares its parent's store (one clone per request on a server): like useSSR, leave it alone
      if (this.options.isClone) return this;
      if (!this.services.resourceStore) {
        this.logger.warn('hydrate: call init() first, the instance has no resource store yet');
        return this;
      }
      if (resources && !this.initializedStoreOnce) {
        this.services.resourceStore.data = resources;
        // add the namespaces, so a language change loads all of them
        Object.values(resources).forEach((lngResources) => {
          Object.keys(lngResources).forEach((ns) => {
            if (!this.options.ns.includes(ns)) this.options.ns.push(ns);
          });
        });
        this.initializedStoreOnce = true;
        this.isInitialized = true;
      }
      if (lng && !this.initializedLanguageOnce) {
        this.changeLanguage(lng);
        this.initializedLanguageOnce = true;
      }
      return this;
    }

    setResolvedLanguage(l) {
      if (!l || !this.languages) return;
      if (['cimode', 'dev'].includes(l)) return;
      for (let li = 0; li < this.languages.length; li++) {
        const lngInLngs = this.languages[li];
        if (['cimode', 'dev'].includes(lngInLngs)) continue;
        if (this.store.hasLanguageSomeTranslations(lngInLngs)) {
          this.resolvedLanguage = lngInLngs;
          break;
        }
      }
      if (!this.resolvedLanguage && !this.languages.includes(l) && this.store.hasLanguageSomeTranslations(l)) {
        this.resolvedLanguage = l;
        this.languages.unshift(l);
      }
    }

    changeLanguage(lng, callback) {
      this.isLanguageChangingTo = lng;
      const deferred = defer();
      this.emit('languageChanging', lng);

      const setLngProps = (l) => {
        this.language = l;
        this.languages = this.services.languageUtils.toResolveHierarchy(l);
        // find the first language resolved language
        this.resolvedLanguage = undefined;
        this.setResolvedLanguage(l);
      };

      const done = (err, l) => {
        if (l) {
          if (this.isLanguageChangingTo === lng) {
            setLngProps(l);
            this.translator.changeLanguage(l);
            this.isLanguageChangingTo = undefined;
            this.emit('languageChanged', l);
            this.logger.log('languageChanged', l);
          }
        } else {
          this.isLanguageChangingTo = undefined;
        }

        deferred.resolve((...args) => this.t(...args));
        if (callback) callback(err, (...args) => this.t(...args));
      };

      const setLng = lngs => {
        // if detected lng is falsy, set it to empty array, to make sure at least the fallbackLng will be used
        if (!lng && !lngs && this.services.languageDetector) lngs = [];
        // a refused code is skipped like an unsupported one: the detector's next code, else the fallback
        // language, else none (fallbackLng: false leaves the language unset). With supportedLngs the input is
        // matched as before ('de-DE;q=0.9' gives 'de'); only an unsafe match is refused, which only
        // nonExplicitSupportedLngs can return ('de-<x>' for a supported 'de')
        const { supportedLngs } = this.options;
        if (lngs && !supportedLngs) {
          const accepted = [].concat(lngs).filter((c) => !isRefusedLanguageCode(this, c));
          if (accepted.length < [].concat(lngs).length) lngs = accepted;
        }
        // depending on API in detector lng can be a string (old) or an array of languages ordered in priority
        const fl = isString(lngs) ? lngs : lngs && lngs[0];
        let l = this.store.hasLanguageSomeTranslations(fl) ? fl : this.services.languageUtils.getBestMatchFromCodes(isString(lngs) ? [lngs] : lngs);
        if (supportedLngs && isRefusedLanguageCode(this, l)) l = this.services.languageUtils.getBestMatchFromCodes([]);

        if (l) {
          if (!this.language) {
            setLngProps(l);
          }
          if (!this.translator.language) this.translator.changeLanguage(l);

          this.services.languageDetector?.cacheUserLanguage?.(l);
        }

        this.loadResources(l, err => {
          done(err, l);
        });
      };

      if (!lng && this.services.languageDetector && !this.services.languageDetector.async) {
        setLng(this.services.languageDetector.detect());
      } else if (!lng && this.services.languageDetector && this.services.languageDetector.async) {
        const callbackApi = callbackApiOf(this.services.languageDetector);
        if (callbackApi === false || (callbackApi === undefined && this.services.languageDetector.detect.length === 0)) {
          this.services.languageDetector.detect().then(setLng);
        } else {
          this.services.languageDetector.detect(setLng);
        }
      } else {
        setLng(lng);
      }

      return deferred;
    }

    // `fixedOpts` (optional 4th arg) carries options that are tied to the
    // bound t function rather than to the resolution of any single call:
    //
    //   - `scopeNs?: string[]`
    //       Full namespace list the bound t was created for (e.g. the array
    //       passed to `useTranslation(['nsA','nsB'])`). Used *only* by the
    //       selector path to decide whether `path[0]` should be rewritten as
    //       a namespace prefix. Resolution semantics are unchanged: the bound
    //       `ns` (a single primary string) still drives `Translator.translate`.
    //       This decouples selector ns-detection from resolution scope so a
    //       react-i18next hook called with multiple namespaces can route
    //       `t($ => $.secondary.foo)` correctly *without* turning every
    //       `t('foo')` lookup into a multi-ns fallback chain.
    //       See the v25.8.19 selector rule in `src/selector.js`.
    getFixedT(lng, ns, keyPrefix, fixedOpts) {
      const scopeNs = fixedOpts?.scopeNs;
      const fixedT = (key, opts, ...rest) => {
        let o;
        if (typeof opts !== 'object') {
          o = this.options.overloadTranslationOptionHandler([key, opts].concat(rest));
        } else {
          o = { ...opts };
        }

        o.lng = o.lng || fixedT.lng;
        o.lngs = o.lngs || fixedT.lngs;
        // Detect per-call explicit `ns` BEFORE auto-filling from fixedT.ns, so the
        // selector can prefer call-level ns over the bound scopeNs.
        const explicitCallNs = o.ns !== undefined && o.ns !== null;
        o.ns = o.ns || fixedT.ns;
        if (o.keyPrefix !== '') o.keyPrefix = o.keyPrefix || keyPrefix || fixedT.keyPrefix;

        // keysFromSelector must be called after o.ns is resolved above, so that namespace
        // rewriting uses the effective namespace (e.g. the one fixed by getFixedT) rather
        // than the raw global ns array from this.options. Precedence for selector
        // ns-detection (highest first):
        //   1. `o.ns` if the caller passed it explicitly on this call
        //   2. `scopeNs` if the bound t carries it (the hook's full ns list)
        //   3. `o.ns` populated from fixedT.ns / this.options
        // This decouples selector path[0] matching from resolution scope. `o.ns`
        // continues to drive `Translator.translate` resolution unchanged.
        const selectorOpts = { ...this.options, ...o };
        if (Array.isArray(scopeNs) && !explicitCallNs) selectorOpts.ns = scopeNs;
        if (typeof o.keyPrefix === 'function') o.keyPrefix = keysFromSelector(o.keyPrefix, selectorOpts);
        const keySeparator = this.options.keySeparator || '.';
        let resultKey;
        if (o.keyPrefix && Array.isArray(key)) {
          resultKey = key.map(k => {
            if (typeof k === 'function') k = keysFromSelector(k, selectorOpts);
            return `${o.keyPrefix}${keySeparator}${k}`
          });
        } else {
          if (typeof key === 'function') key = keysFromSelector(key, selectorOpts);
          resultKey = o.keyPrefix ? `${o.keyPrefix}${keySeparator}${key}` : key;
        }
        return this.t(resultKey, o);
      };
      if (isString(lng)) {
        fixedT.lng = lng;
      } else {
        fixedT.lngs = lng;
      }
      fixedT.ns = ns;
      fixedT.keyPrefix = keyPrefix;
      return fixedT;
    }

    t(...args) {
      if (!this.translator) {
        this.logger.warn('t: called before init(); returning an empty string');
        return '';
      }
      return this.translator.translate(...args);
    }

    exists(...args) {
      return this.translator?.exists(...args);
    }

    setDefaultNamespace(ns) {
      this.options.defaultNS = ns;
      // a clone's translator has its own options object (see cloneInstance)
      if (this.translator?.options) this.translator.options.defaultNS = ns;
    }

    hasLoadedNamespace(ns, options = {}) {
      if (!this.isInitialized) {
        this.logger.warn('hasLoadedNamespace: i18next was not initialized', this.languages);
        return false;
      }
      if (!this.languages || !this.languages.length) {
        this.logger.warn('hasLoadedNamespace: i18n.languages were undefined or empty', this.languages);
        return false;
      }

      const lng = options.lng || this.resolvedLanguage || this.languages[0];
      const fallbackLng = this.options ? this.options.fallbackLng : false;
      const lastLng = this.languages[this.languages.length - 1];

      // we're in cimode so this shall pass
      if (lng.toLowerCase() === 'cimode') return true;

      const loadNotPending = (l, n) => {
        const loadState = this.services.backendConnector.state[`${l}|${n}`];
        return loadState === -1 || loadState === 0 || loadState === 2;
      };

      // optional injected check
      if (options.precheck) {
        const preResult = options.precheck(this, loadNotPending);
        if (preResult !== undefined) return preResult;
      }

      // loaded -> SUCCESS
      if (this.hasResourceBundle(lng, ns)) return true;

      // were not loading at all -> SEMI SUCCESS
      if (!this.services.backendConnector.backend || (this.options.resources && !this.options.partialBundledLanguages)) return true;

      // a passed in lng is a raw code: loadLanguages() stores it under its resolved code (formatted, reduced
      // per `load`), or skips it entirely outside supportedLngs - checking the raw code would wait forever
      const { languageUtils } = this.services;
      const loadLng = !options.lng ? lng : languageUtils.isSupportedCode(lng) && languageUtils.toResolveHierarchy(lng, false)[0];

      // failed loading ns - but at least fallback is not pending -> SEMI SUCCESS
      if ((!loadLng || loadNotPending(loadLng, ns)) && (!fallbackLng || loadNotPending(lastLng, ns))) return true;

      return false;
    }

    loadNamespaces(ns, callback) {
      const deferred = defer();

      // before init() (react-i18next's useTranslation can call it then): nothing to load yet, as in v26,
      // where the options of an instance were empty until init()
      if (!this.options.ns || !this.services.backendConnector) {
        if (callback) callback();
        return Promise.resolve();
      }
      if (isString(ns)) ns = [ns];

      ns.forEach(n => {
        if (!this.options.ns.includes(n)) this.options.ns.push(n);
      });

      this.loadResources(err => {
        deferred.resolve();
        if (callback) callback(err);
      });

      return deferred;
    }

    loadLanguages(lngs, callback) {
      const deferred = defer();

      if (isString(lngs)) lngs = [lngs];
      const preloaded = this.options.preload || [];

      const newLngs = lngs.filter(lng => !preloaded.includes(lng) && !isRefusedLanguageCode(this, lng) && this.services.languageUtils.isSupportedCode(lng));
      // Exit early if all given languages are already preloaded
      if (!newLngs.length) {
        if (callback) callback();
        return Promise.resolve();
      }

      this.options.preload = preloaded.concat(newLngs);
      this.loadResources(err => {
        deferred.resolve();
        if (callback) callback(err);
      });

      return deferred;
    }

    dir(lng) {
      if (!lng) lng = this.resolvedLanguage || (this.languages?.length > 0 ? this.languages[0] : this.language);
      if (!lng) return 'ltr';

      try {
        const l = new Intl.Locale(lng);
        if (l && l.getTextInfo) {
          const ti = l.getTextInfo();
          if (ti && ti.direction) return ti.direction
        }
      } catch (e) {/* fall through */}

      const rtlLngs = [
        'ar',
        'shu',
        'sqr',
        'ssh',
        'xaa',
        'yhd',
        'yud',
        'aao',
        'abh',
        'abv',
        'acm',
        'acq',
        'acw',
        'acx',
        'acy',
        'adf',
        'ads',
        'aeb',
        'aec',
        'afb',
        'ajp',
        'apc',
        'apd',
        'arb',
        'arq',
        'ars',
        'ary',
        'arz',
        'auz',
        'avl',
        'ayh',
        'ayl',
        'ayn',
        'ayp',
        'bbz',
        'pga',
        'he',
        'iw',
        'ps',
        'pbt',
        'pbu',
        'pst',
        'prp',
        'prd',
        'ug',
        'ur',
        'ydd',
        'yds',
        'yih',
        'ji',
        'yi',
        'hbo',
        'men',
        'xmn',
        'fa',
        'jpr',
        'peo',
        'pes',
        'prs',
        'dv',
        'sam',
        'ckb'
      ];

      const languageUtils = this.services?.languageUtils || new LanguageUtil(get()); // for uninitialized usage
      if (lng.toLowerCase().indexOf('-latn') > 1) return 'ltr';

      // the list is lowercase: with cleanCode: false the language part keeps its casing ('AR')
      return rtlLngs.includes(languageUtils.getLanguagePartFromCode(lng)?.toLowerCase()) || lng.toLowerCase().indexOf('-arab') > 1
        ? 'rtl'
        : 'ltr';
    }

    static createInstance(options = {}, callback) {
      const instance = new I18n(options, callback);
      instance.createInstance = I18n.createInstance;
      return instance;
    }

    cloneInstance(options = {}, callback = noop) {
      const forkResourceStore = options.forkResourceStore;
      if (forkResourceStore) {
        options = { ...options };
        delete options.forkResourceStore;
      }
      // preload is not inherited: the parent already loaded it into the shared store, and re-queueing it on every clone's
      // changeLanguage costs languages × namespaces per call (https://github.com/i18next/i18next/issues/2451)
      const mergedOptions = { ...this.options, preload: false, ...options, ...{ isClone: true } };
      const clone = new I18n(mergedOptions);
      // a clone logs through its parent's logger, or a copy of it with its own debug or prefix (its
      // services, translator included, keep the parent's, as before)
      clone.logger = options.debug !== undefined || options.prefix !== undefined
        ? this.logger.clone(options)
        : this.logger;
      const membersToCopy = ['store', 'language'];
      membersToCopy.forEach(m => {
        clone[m] = this[m];
      });
      clone.services = { ...this.services };
      // it sees what its parent registers, also later; what it registers itself stays its own
      clone.services.postProcessors = Object.create(this.services.postProcessors);
      clone.services.utils = {
        ...clone.services.utils,
        hasLoadedNamespace: clone.hasLoadedNamespace.bind(clone),
        reloadResources: clone.reloadResources.bind(clone)
      };
      if (forkResourceStore) {
        // faster than const clonedData = JSON.parse(JSON.stringify(this.store.data))
        const copyData = obj => {
          const copied = Array.isArray(obj) ? [...obj] : { ...obj };
          Object.keys(copied).forEach(k => {
            if (copied[k] && typeof copied[k] === 'object') copied[k] = copyData(copied[k]);
          });
          return copied;
        };
        const clonedData = copyData(this.store.data);
        clone.store = new ResourceStore(clonedData, mergedOptions, this.logger);
        clone.services.resourceStore = clone.store;
      }
      // Ensure interpolation options are always merged with defaults when cloning
      if (options.interpolation) {
        const defOpts = get();
        const mergedInterpolation = { ...defOpts.interpolation, ...this.options.interpolation, ...options.interpolation };
        const mergedForInterpolator = { ...mergedOptions, interpolation: mergedInterpolation };
        clone.services.interpolator = new Interpolator(mergedForInterpolator, this.logger);
      }
      // the codes the parent was configured with at its init(), plus those in the options given here; not the
      // languages added to the shared store since
      clone.configuredLngs = new Set([...(this.configuredLngs || []), ...configuredLanguageCodes(options)]);
      clone.translator = new Translator(clone.services, mergedOptions);
      clone.translator.on('*', (event, ...args) => {
        clone.emit(event, ...args);
      });
      clone.init(mergedOptions, callback);
      clone.translator.options = mergedOptions; // sync options
      // direct callers of the shared connector's saveMissing() (i18next-http-middleware's missing keys route)
      // keep checking the newest clone, as before; the translators pass the check of their own instance
      clone.translator.backendConnector.newestCloneHasLoadedNamespace = clone.hasLoadedNamespace.bind(clone);

      return clone;
    }

    toJSON() {
      return {
        options: this.options,
        store: this.store,
        language: this.language,
        languages: this.languages,
        resolvedLanguage: this.resolvedLanguage
      };
    }
  }

  const instance = I18n.createInstance();

  instance.createInstance;

  instance.dir;
  instance.init;
  instance.loadResources;
  instance.reloadResources;
  instance.use;
  instance.changeLanguage;
  instance.getFixedT;
  instance.t;
  instance.exists;
  instance.setDefaultNamespace;
  instance.hasLoadedNamespace;
  instance.loadNamespaces;
  instance.loadLanguages;

  /* eslint-disable
      @typescript-eslint/no-namespace,
      @typescript-eslint/no-explicit-any,
   */
  const i18n = instance;

  exports.i18n = i18n;

  Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uLWkxOG4uanMiLCJzb3VyY2VzIjpbImkxOG5leHQvc3JjL3V0aWxzLmpzIiwiaTE4bmV4dC9zcmMvbG9nZ2VyLmpzIiwiaTE4bmV4dC9zcmMvRXZlbnRFbWl0dGVyLmpzIiwiaTE4bmV4dC9zcmMvUmVzb3VyY2VTdG9yZS5qcyIsImkxOG5leHQvc3JjL3NlbGVjdG9yLmpzIiwiaTE4bmV4dC9zcmMvVHJhbnNsYXRvci5qcyIsImkxOG5leHQvc3JjL0xhbmd1YWdlVXRpbHMuanMiLCJpMThuZXh0L3NyYy9QbHVyYWxSZXNvbHZlci5qcyIsImkxOG5leHQvc3JjL0ludGVycG9sYXRvci5qcyIsImkxOG5leHQvc3JjL0Zvcm1hdHRlci5qcyIsImkxOG5leHQvc3JjL0JhY2tlbmRDb25uZWN0b3IuanMiLCJpMThuZXh0L3NyYy9kZWZhdWx0cy5qcyIsImkxOG5leHQvc3JjL2kxOG5leHQuanMiLCJpMThuZXh0L3NyYy9pbmRleC5qcyIsImluZGV4LnRzIl0sInNvdXJjZXNDb250ZW50IjpbImV4cG9ydCBjb25zdCBpc1N0cmluZyA9IChvYmopID0+IHR5cGVvZiBvYmogPT09ICdzdHJpbmcnO1xuXG4vLyBodHRwOi8vbGVhLnZlcm91Lm1lLzIwMTYvMTIvcmVzb2x2ZS1wcm9taXNlcy1leHRlcm5hbGx5LXdpdGgtdGhpcy1vbmUtd2VpcmQtdHJpY2svXG5leHBvcnQgY29uc3QgZGVmZXIgPSAoKSA9PiB7XG4gIGxldCByZXM7XG4gIGxldCByZWo7XG5cbiAgY29uc3QgcHJvbWlzZSA9IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICByZXMgPSByZXNvbHZlO1xuICAgIHJlaiA9IHJlamVjdDtcbiAgfSk7XG5cbiAgcHJvbWlzZS5yZXNvbHZlID0gcmVzO1xuICBwcm9taXNlLnJlamVjdCA9IHJlajtcblxuICByZXR1cm4gcHJvbWlzZTtcbn07XG5cbmV4cG9ydCBjb25zdCBtYWtlU3RyaW5nID0gKG9iamVjdCkgPT4ge1xuICBpZiAob2JqZWN0ID09IG51bGwpIHJldHVybiAnJztcbiAgcmV0dXJuIFN0cmluZyhvYmplY3QpO1xufTtcblxuLy8gVGhlIHNoYXBlIG9mIGEgbGFuZ3VhZ2UgY29kZSB0aGF0IGkxOG5leHQgYWNjZXB0cyBmcm9tIG91dHNpZGUgKGxuZywgY2hhbmdlTGFuZ3VhZ2UsIGRldGVjdG9ycykgdW5sZXNzIGl0IGlzXG4vLyBjb25maWd1cmVkOyBvdGhlciBjb2RlcyBhcmUgcmVmdXNlZC4gTm90IGEgQkNQIDQ3IGNoZWNrOiAnZW5fVVMnLCAnemhfSGFudF9UVycsICdzckBsYXRpbicgYW5kICdkZV9ERS5VVEYtOCcgcGFzczsgbWFya3VwLCBzbGFzaGVzLCBzcGFjZXMsXG4vLyAnLi4nLCBwcm90b3R5cGUga2V5cyBhbmQgY29kZXMgb3ZlciAxMjggY2hhcmFjdGVycyBkbyBub3QuIEV4cG9ydGVkIGZvciBwbHVnaW5zIChkZXRlY3RvcnMsIGJhY2tlbmRzLCBtaWRkbGV3YXJlKS5cbmV4cG9ydCBjb25zdCBpc1NhZmVMYW5ndWFnZUNvZGUgPSAoY29kZSkgPT5cbiAgaXNTdHJpbmcoY29kZSkgJiZcbiAgL15bQS1aYS16MC05X0AuLV17MSwxMjh9JC8udGVzdChjb2RlKSAmJlxuICAhY29kZS5pbmNsdWRlcygnLi4nKSAmJlxuICAhWydfX3Byb3RvX18nLCAnY29uc3RydWN0b3InLCAncHJvdG90eXBlJ10uaW5jbHVkZXMoY29kZSk7XG5cbi8vIEEgcGx1Z2luIGRlY2xhcmVzIGl0cyBjYWxsaW5nIGNvbnZlbnRpb24gd2l0aCBgY2FsbGJhY2tBcGlgIChpbnN0YW5jZSBvciBzdGF0aWMgcHJvcGVydHkpOlxuLy8gdHJ1ZSBmb3IgY2FsbGJhY2tzLCBmYWxzZSBmb3IgcHJvbWlzZXMgKG9yIHN5bmMgdmFsdWVzKSwgdW5kZWZpbmVkIHRvIGhhdmUgaXQgZ3Vlc3NlZCBmcm9tIEZ1bmN0aW9uLmxlbmd0aFxuZXhwb3J0IGNvbnN0IGNhbGxiYWNrQXBpT2YgPSAocGx1Z2luKSA9PiBwbHVnaW4/LmNhbGxiYWNrQXBpID8/IHBsdWdpbj8uY29uc3RydWN0b3I/LmNhbGxiYWNrQXBpO1xuXG5leHBvcnQgY29uc3QgY29weSA9IChhLCBzLCB0KSA9PiB7XG4gIGEuZm9yRWFjaCgobSkgPT4ge1xuICAgIGlmIChzW21dKSB0W21dID0gc1ttXTtcbiAgfSk7XG59O1xuXG4vLyBXZSBleHRyYWN0IG91dCB0aGUgUmVnRXhwIGRlZmluaXRpb24gdG8gaW1wcm92ZSBwZXJmb3JtYW5jZSB3aXRoIFJlYWN0IE5hdGl2ZSBBbmRyb2lkLCB3aGljaCBoYXMgcG9vciBSZWdFeHBcbi8vIGluaXRpYWxpemF0aW9uIHBlcmZvcm1hbmNlXG5jb25zdCBsYXN0T2ZQYXRoU2VwYXJhdG9yUmVnRXhwID0gLyMjIy9nO1xuXG5jb25zdCBjbGVhbktleSA9IChrZXkpID0+XG4gIGtleSAmJiBrZXkuaW5jbHVkZXMoJyMjIycpID8ga2V5LnJlcGxhY2UobGFzdE9mUGF0aFNlcGFyYXRvclJlZ0V4cCwgJy4nKSA6IGtleTtcblxuLy8gb25seSBvYmplY3RzIChhbmQgZnVuY3Rpb25zKSBob2xkIGtleXM6IGEgc3RyaW5nLCBudW1iZXIgb3IgYm9vbGVhbiBiZWxvdyBhIGtleSBlbmRzIHRoZSBwYXRoLFxuLy8gc28gc2V0UGF0aCBrZWVwcyB0aGUgcmVzdCBmbGF0IGluc3RlYWQgb2YgdGhyb3dpbmcgb24gdGhlIHByaW1pdGl2ZVxuY29uc3QgY2FuTm90VHJhdmVyc2VEZWVwZXIgPSAob2JqZWN0KSA9PlxuICAhb2JqZWN0IHx8ICh0eXBlb2Ygb2JqZWN0ICE9PSAnb2JqZWN0JyAmJiB0eXBlb2Ygb2JqZWN0ICE9PSAnZnVuY3Rpb24nKTtcblxuY29uc3QgZ2V0TGFzdE9mUGF0aCA9IChvYmplY3QsIHBhdGgsIEVtcHR5KSA9PiB7XG4gIGNvbnN0IHN0YWNrID0gIWlzU3RyaW5nKHBhdGgpID8gcGF0aCA6IHBhdGguc3BsaXQoJy4nKTtcbiAgbGV0IHN0YWNrSW5kZXggPSAwO1xuICAvLyBpdGVyYXRlIHRocm91Z2ggdGhlIHN0YWNrLCBidXQgbGVhdmUgdGhlIGxhc3QgaXRlbVxuICB3aGlsZSAoc3RhY2tJbmRleCA8IHN0YWNrLmxlbmd0aCAtIDEpIHtcbiAgICBpZiAoY2FuTm90VHJhdmVyc2VEZWVwZXIob2JqZWN0KSkgcmV0dXJuIHt9O1xuXG4gICAgY29uc3Qga2V5ID0gY2xlYW5LZXkoc3RhY2tbc3RhY2tJbmRleF0pO1xuICAgIGlmICghb2JqZWN0W2tleV0gJiYgRW1wdHkpIG9iamVjdFtrZXldID0gbmV3IEVtcHR5KCk7XG4gICAgLy8gcHJldmVudCBwcm90b3R5cGUgcG9sbHV0aW9uXG4gICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmplY3QsIGtleSkpIHtcbiAgICAgIG9iamVjdCA9IG9iamVjdFtrZXldO1xuICAgIH0gZWxzZSB7XG4gICAgICBvYmplY3QgPSB7fTtcbiAgICB9XG4gICAgKytzdGFja0luZGV4O1xuICB9XG5cbiAgaWYgKGNhbk5vdFRyYXZlcnNlRGVlcGVyKG9iamVjdCkpIHJldHVybiB7fTtcbiAgcmV0dXJuIHtcbiAgICBvYmo6IG9iamVjdCxcbiAgICBrOiBjbGVhbktleShzdGFja1tzdGFja0luZGV4XSksXG4gIH07XG59O1xuXG5leHBvcnQgY29uc3Qgc2V0UGF0aCA9IChvYmplY3QsIHBhdGgsIG5ld1ZhbHVlKSA9PiB7XG4gIGNvbnN0IHsgb2JqLCBrIH0gPSBnZXRMYXN0T2ZQYXRoKG9iamVjdCwgcGF0aCwgT2JqZWN0KTtcbiAgLy8gYW4gYXJyYXkncyBsZW5ndGggdGFrZXMgbm8gdmFsdWUgKGBJbnZhbGlkIGFycmF5IGxlbmd0aGApOiBzdWNoIGEga2V5IHN0YXlzIGZsYXQgdG9vXG4gIGlmICgob2JqICE9PSB1bmRlZmluZWQgJiYgIShBcnJheS5pc0FycmF5KG9iaikgJiYgayA9PT0gJ2xlbmd0aCcpKSB8fCBwYXRoLmxlbmd0aCA9PT0gMSkge1xuICAgIG9ialtrXSA9IG5ld1ZhbHVlO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGxldCBlID0gcGF0aFtwYXRoLmxlbmd0aCAtIDFdO1xuICBsZXQgcCA9IHBhdGguc2xpY2UoMCwgcGF0aC5sZW5ndGggLSAxKTtcbiAgbGV0IGxhc3QgPSBnZXRMYXN0T2ZQYXRoKG9iamVjdCwgcCwgT2JqZWN0KTtcbiAgd2hpbGUgKGxhc3Qub2JqID09PSB1bmRlZmluZWQgJiYgcC5sZW5ndGgpIHtcbiAgICBlID0gYCR7cFtwLmxlbmd0aCAtIDFdfS4ke2V9YDtcbiAgICBwID0gcC5zbGljZSgwLCBwLmxlbmd0aCAtIDEpO1xuICAgIGxhc3QgPSBnZXRMYXN0T2ZQYXRoKG9iamVjdCwgcCwgT2JqZWN0KTtcbiAgICBpZiAobGFzdD8ub2JqICYmIHR5cGVvZiBsYXN0Lm9ialtgJHtsYXN0Lmt9LiR7ZX1gXSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIGxhc3Qub2JqID0gdW5kZWZpbmVkO1xuICAgIH1cbiAgfVxuICBsYXN0Lm9ialtgJHtsYXN0Lmt9LiR7ZX1gXSA9IG5ld1ZhbHVlO1xufTtcblxuZXhwb3J0IGNvbnN0IHB1c2hQYXRoID0gKG9iamVjdCwgcGF0aCwgbmV3VmFsdWUsIGNvbmNhdCkgPT4ge1xuICBjb25zdCB7IG9iaiwgayB9ID0gZ2V0TGFzdE9mUGF0aChvYmplY3QsIHBhdGgsIE9iamVjdCk7XG5cbiAgLy8gb3duIGtleXMgb25seTogYSBsYW5ndWFnZSBjb2RlIGZyb20gYSByZXF1ZXN0IGNhbiBuYW1lIGFuIGluaGVyaXRlZCBwcm9wZXJ0eSAoYGhhc093blByb3BlcnR5YClcbiAgaWYgKCFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBrKSB8fCAhb2JqW2tdKSBvYmpba10gPSBbXTtcbiAgaWYgKGNvbmNhdCkgb2JqW2tdID0gb2JqW2tdLmNvbmNhdChuZXdWYWx1ZSk7XG4gIGlmICghY29uY2F0KSBvYmpba10ucHVzaChuZXdWYWx1ZSk7XG59O1xuXG5leHBvcnQgY29uc3QgZ2V0UGF0aCA9IChvYmplY3QsIHBhdGgpID0+IHtcbiAgY29uc3QgeyBvYmosIGsgfSA9IGdldExhc3RPZlBhdGgob2JqZWN0LCBwYXRoKTtcblxuICBpZiAoIW9iaikgcmV0dXJuIHVuZGVmaW5lZDtcbiAgaWYgKCFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBrKSkgcmV0dXJuIHVuZGVmaW5lZDtcbiAgcmV0dXJuIG9ialtrXTtcbn07XG5cbmV4cG9ydCBjb25zdCBnZXRQYXRoV2l0aERlZmF1bHRzID0gKGRhdGEsIGRlZmF1bHREYXRhLCBrZXkpID0+IHtcbiAgY29uc3QgdmFsdWUgPSBnZXRQYXRoKGRhdGEsIGtleSk7XG4gIGlmICh2YWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIHZhbHVlO1xuICB9XG4gIC8vIEZhbGxiYWNrIHRvIGRlZmF1bHQgdmFsdWVzXG4gIHJldHVybiBnZXRQYXRoKGRlZmF1bHREYXRhLCBrZXkpO1xufTtcblxuY29uc3QgaXNMZWFmID0gKHZhbHVlKSA9PiB2YWx1ZSA9PT0gbnVsbCB8fCB0eXBlb2YgdmFsdWUgIT09ICdvYmplY3QnIHx8IHZhbHVlIGluc3RhbmNlb2YgU3RyaW5nO1xuXG5leHBvcnQgY29uc3QgZGVlcEV4dGVuZCA9ICh0YXJnZXQsIHNvdXJjZSwgb3ZlcndyaXRlKSA9PiB7XG4gIGZvciAoY29uc3QgcHJvcCBpbiBzb3VyY2UpIHtcbiAgICBpZiAocHJvcCAhPT0gJ19fcHJvdG9fXycgJiYgcHJvcCAhPT0gJ2NvbnN0cnVjdG9yJykge1xuICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbCh0YXJnZXQsIHByb3ApKSB7XG4gICAgICAgIC8vIElmIHdlIHJlYWNoZWQgYSBsZWFmIChzdHJpbmcsIG51bWJlciwgYm9vbGVhbiBvciBudWxsKSBpbiB0YXJnZXQgb3Igc291cmNlIHRoZW4gcmVwbGFjZSB3aXRoIHNvdXJjZSBvciBza2lwIGRlcGVuZGluZyBvbiB0aGUgJ292ZXJ3cml0ZScgc3dpdGNoXG4gICAgICAgIGlmIChpc0xlYWYodGFyZ2V0W3Byb3BdKSB8fCBpc0xlYWYoc291cmNlW3Byb3BdKSkge1xuICAgICAgICAgIGlmIChvdmVyd3JpdGUpIHRhcmdldFtwcm9wXSA9IHNvdXJjZVtwcm9wXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBkZWVwRXh0ZW5kKHRhcmdldFtwcm9wXSwgc291cmNlW3Byb3BdLCBvdmVyd3JpdGUpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0YXJnZXRbcHJvcF0gPSBzb3VyY2VbcHJvcF07XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiB0YXJnZXQ7XG59O1xuXG5leHBvcnQgY29uc3QgcmVnZXhFc2NhcGUgPSAoc3RyKSA9PlxuICAvKiBlc2xpbnQgbm8tdXNlbGVzcy1lc2NhcGU6IDAgKi9cbiAgc3RyLnJlcGxhY2UoL1tcXC1cXFtcXF1cXC9cXHtcXH1cXChcXClcXCpcXCtcXD9cXC5cXFxcXFxeXFwkXFx8XS9nLCAnXFxcXCQmJyk7XG5cbmNvbnN0IF9lbnRpdHlNYXAgPSB7XG4gICcmJzogJyZhbXA7JyxcbiAgJzwnOiAnJmx0OycsXG4gICc+JzogJyZndDsnLFxuICAnXCInOiAnJnF1b3Q7JyxcbiAgXCInXCI6ICcmIzM5OycsXG59O1xuXG5leHBvcnQgY29uc3QgZXNjYXBlID0gKGRhdGEpID0+IHtcbiAgaWYgKGlzU3RyaW5nKGRhdGEpKSB7XG4gICAgcmV0dXJuIGRhdGEucmVwbGFjZSgvWyY8PlwiJ10vZywgKHMpID0+IF9lbnRpdHlNYXBbc10pO1xuICB9XG5cbiAgcmV0dXJuIGRhdGE7XG59O1xuXG4vKipcbiAqIFRoaXMgaXMgYSByZXVzYWJsZSByZWd1bGFyIGV4cHJlc3Npb24gY2FjaGUgY2xhc3MuIEdpdmVuIGEgY2VydGFpbiBtYXhpbXVtIG51bWJlciBvZiByZWd1bGFyIGV4cHJlc3Npb25zIHdlJ3JlXG4gKiBhbGxvd2VkIHRvIHN0b3JlIGluIHRoZSBjYWNoZSwgaXQgcHJvdmlkZXMgYSB3YXkgdG8gYXZvaWQgcmVjcmVhdGluZyByZWd1bGFyIGV4cHJlc3Npb24gb2JqZWN0cyBvdmVyIGFuZCBvdmVyLlxuICogV2hlbiBpdCBuZWVkcyB0byBldmljdCBzb21ldGhpbmcsIGl0IGV2aWN0cyB0aGUgb2xkZXN0IG9uZS5cbiAqL1xuY2xhc3MgUmVnRXhwQ2FjaGUge1xuICBjb25zdHJ1Y3RvcihjYXBhY2l0eSkge1xuICAgIHRoaXMuY2FwYWNpdHkgPSBjYXBhY2l0eTtcbiAgICB0aGlzLnJlZ0V4cE1hcCA9IG5ldyBNYXAoKTtcbiAgICAvLyBTaW5jZSBvdXIgY2FwYWNpdHkgdGVuZHMgdG8gYmUgZmFpcmx5IHNtYWxsLCBgLnNoaWZ0KClgIHdpbGwgYmUgZmFpcmx5IHF1aWNrIGRlc3BpdGUgYmVpbmcgTyhuKS4gV2UganVzdCB1c2UgYVxuICAgIC8vIG5vcm1hbCBhcnJheSB0byBrZWVwIGl0IHNpbXBsZS5cbiAgICB0aGlzLnJlZ0V4cFF1ZXVlID0gW107XG4gIH1cblxuICBnZXRSZWdFeHAocGF0dGVybikge1xuICAgIGNvbnN0IHJlZ0V4cEZyb21DYWNoZSA9IHRoaXMucmVnRXhwTWFwLmdldChwYXR0ZXJuKTtcbiAgICBpZiAocmVnRXhwRnJvbUNhY2hlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiByZWdFeHBGcm9tQ2FjaGU7XG4gICAgfVxuICAgIGNvbnN0IHJlZ0V4cE5ldyA9IG5ldyBSZWdFeHAocGF0dGVybik7XG4gICAgaWYgKHRoaXMucmVnRXhwUXVldWUubGVuZ3RoID09PSB0aGlzLmNhcGFjaXR5KSB7XG4gICAgICB0aGlzLnJlZ0V4cE1hcC5kZWxldGUodGhpcy5yZWdFeHBRdWV1ZS5zaGlmdCgpKTtcbiAgICB9XG4gICAgdGhpcy5yZWdFeHBNYXAuc2V0KHBhdHRlcm4sIHJlZ0V4cE5ldyk7XG4gICAgdGhpcy5yZWdFeHBRdWV1ZS5wdXNoKHBhdHRlcm4pO1xuICAgIHJldHVybiByZWdFeHBOZXc7XG4gIH1cbn1cblxuY29uc3QgY2hhcnMgPSBbJyAnLCAnLCcsICc/JywgJyEnLCAnOyddO1xuLy8gV2UgY2FjaGUgUmVnRXhwcyB0byBpbXByb3ZlIHBlcmZvcm1hbmNlIHdpdGggUmVhY3QgTmF0aXZlIEFuZHJvaWQsIHdoaWNoIGhhcyBwb29yIFJlZ0V4cCBpbml0aWFsaXphdGlvbiBwZXJmb3JtYW5jZS5cbi8vIENhcGFjaXR5IG9mIDIwIHNob3VsZCBiZSBwbGVudHksIGFzIG5zU2VwYXJhdG9yL2tleVNlcGFyYXRvciBkb24ndCB0ZW5kIHRvIHZhcnkgbXVjaCBhY3Jvc3MgY2FsbHMuXG5jb25zdCBsb29rc0xpa2VPYmplY3RQYXRoUmVnRXhwQ2FjaGUgPSBuZXcgUmVnRXhwQ2FjaGUoMjApO1xuXG5leHBvcnQgY29uc3QgbG9va3NMaWtlT2JqZWN0UGF0aCA9IChrZXksIG5zU2VwYXJhdG9yLCBrZXlTZXBhcmF0b3IpID0+IHtcbiAgbnNTZXBhcmF0b3IgPSBuc1NlcGFyYXRvciB8fCAnJztcbiAga2V5U2VwYXJhdG9yID0ga2V5U2VwYXJhdG9yIHx8ICcnO1xuICBjb25zdCBwb3NzaWJsZUNoYXJzID0gY2hhcnMuZmlsdGVyKChjKSA9PiAhbnNTZXBhcmF0b3IuaW5jbHVkZXMoYykgJiYgIWtleVNlcGFyYXRvci5pbmNsdWRlcyhjKSk7XG4gIGlmIChwb3NzaWJsZUNoYXJzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIHRydWU7XG4gIGNvbnN0IHIgPSBsb29rc0xpa2VPYmplY3RQYXRoUmVnRXhwQ2FjaGUuZ2V0UmVnRXhwKFxuICAgIGAoJHtwb3NzaWJsZUNoYXJzLm1hcCgoYykgPT4gKGMgPT09ICc/JyA/ICdcXFxcPycgOiBjKSkuam9pbignfCcpfSlgLFxuICApO1xuICBsZXQgbWF0Y2hlZCA9ICFyLnRlc3Qoa2V5KTtcbiAgaWYgKCFtYXRjaGVkKSB7XG4gICAgY29uc3Qga2kgPSBrZXkuaW5kZXhPZihrZXlTZXBhcmF0b3IpO1xuICAgIGlmIChraSA+IDAgJiYgIXIudGVzdChrZXkuc3Vic3RyaW5nKDAsIGtpKSkpIHtcbiAgICAgIG1hdGNoZWQgPSB0cnVlO1xuICAgIH1cbiAgfVxuICByZXR1cm4gbWF0Y2hlZDtcbn07XG5cbi8qKlxuICogR2l2ZW5cbiAqXG4gKiAxLiBhIHRvcCBsZXZlbCBvYmplY3Qgb2JqLCBhbmRcbiAqIDIuIGEgcGF0aCB0byBhIGRlZXBseSBuZXN0ZWQgc3RyaW5nIG9yIG9iamVjdCB3aXRoaW4gaXRcbiAqXG4gKiBGaW5kIGFuZCByZXR1cm4gdGhhdCBkZWVwbHkgbmVzdGVkIHN0cmluZyBvciBvYmplY3QuIFRoZSBjYXZlYXQgaXMgdGhhdCB0aGUga2V5cyBvZiBvYmplY3RzIHdpdGhpbiB0aGUgbmVzdGluZyBjaGFpblxuICogbWF5IGNvbnRhaW4gcGVyaW9kIGNoYXJhY3RlcnMuIFRoZXJlZm9yZSwgd2UgbmVlZCB0byBERlMgYW5kIGV4cGxvcmUgYWxsIHBvc3NpYmxlIGtleXMgYXQgZWFjaCBzdGVwIHVudGlsIHdlIGZpbmQgdGhlXG4gKiBkZWVwbHkgbmVzdGVkIHN0cmluZyBvciBvYmplY3QuXG4gKi9cbmV4cG9ydCBjb25zdCBkZWVwRmluZCA9IChvYmosIHBhdGgsIGtleVNlcGFyYXRvciA9ICcuJykgPT4ge1xuICBpZiAoIW9iaikgcmV0dXJuIHVuZGVmaW5lZDtcbiAgaWYgKG9ialtwYXRoXSkge1xuICAgIGlmICghT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwgcGF0aCkpIHJldHVybiB1bmRlZmluZWQ7XG4gICAgcmV0dXJuIG9ialtwYXRoXTtcbiAgfVxuICAvLyBrZXlTZXBhcmF0b3I6IGZhbHNlIG1lYW5zIGZsYXQga2V5cyBvbmx5LCB0aGVyZSBpcyBub3RoaW5nIHRvIHNwbGl0IChub3QgZXZlbiBhdCB0aGUgdGV4dCAnZmFsc2UnKVxuICBpZiAoIWtleVNlcGFyYXRvcikge1xuICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBwYXRoKSA/IG9ialtwYXRoXSA6IHVuZGVmaW5lZDtcbiAgfVxuICBjb25zdCB0b2tlbnMgPSBwYXRoLnNwbGl0KGtleVNlcGFyYXRvcik7XG4gIGxldCBjdXJyZW50ID0gb2JqO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IHRva2Vucy5sZW5ndGg7KSB7XG4gICAgaWYgKCFjdXJyZW50IHx8IHR5cGVvZiBjdXJyZW50ICE9PSAnb2JqZWN0Jykge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgbGV0IG5leHQ7XG4gICAgbGV0IG5leHRQYXRoID0gJyc7XG4gICAgZm9yIChsZXQgaiA9IGk7IGogPCB0b2tlbnMubGVuZ3RoOyArK2opIHtcbiAgICAgIGlmIChqICE9PSBpKSB7XG4gICAgICAgIG5leHRQYXRoICs9IGtleVNlcGFyYXRvcjtcbiAgICAgIH1cbiAgICAgIG5leHRQYXRoICs9IHRva2Vuc1tqXTtcbiAgICAgIG5leHQgPSBjdXJyZW50W25leHRQYXRoXTtcbiAgICAgIC8vIGxpa2UgdGhlIHRvcC1sZXZlbCBsb29rdXAgYWJvdmUsIGRvbid0IHJlc29sdmUgdG8gYnVpbHQtaW4gbWV0aG9kcyBzdWNoIGFzXG4gICAgICAvLyBgY29uc3RydWN0b3JgIG9yIGB0b1N0cmluZ2AsIHdoaWNoIHdvdWxkIGJlIHByaW50ZWQgYXMgZnVuY3Rpb24gc291cmNlLFxuICAgICAgLy8gYW5kIGRvbid0IHdhbGsgaW50byB0aGUgcHJvdG90eXBlIHZpYSBgX19wcm90b19fYFxuICAgICAgaWYgKFxuICAgICAgICAodHlwZW9mIG5leHQgPT09ICdmdW5jdGlvbicgfHwgbmV4dFBhdGggPT09ICdfX3Byb3RvX18nKSAmJlxuICAgICAgICAhT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKGN1cnJlbnQsIG5leHRQYXRoKVxuICAgICAgKSB7XG4gICAgICAgIG5leHQgPSB1bmRlZmluZWQ7XG4gICAgICB9XG4gICAgICBpZiAobmV4dCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmIChbJ3N0cmluZycsICdudW1iZXInLCAnYm9vbGVhbiddLmluY2x1ZGVzKHR5cGVvZiBuZXh0KSAmJiBqIDwgdG9rZW5zLmxlbmd0aCAtIDEpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBpICs9IGogLSBpICsgMTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICAgIGN1cnJlbnQgPSBuZXh0O1xuICB9XG4gIHJldHVybiBjdXJyZW50O1xufTtcblxuZXhwb3J0IGNvbnN0IGdldENsZWFuZWRDb2RlID0gKGNvZGUpID0+IGNvZGU/LnJlcGxhY2UoL18vZywgJy0nKTtcbiIsImltcG9ydCB7IGlzU3RyaW5nIH0gZnJvbSAnLi91dGlscy5qcyc7XG5cbmNvbnN0IGNvbnNvbGVMb2dnZXIgPSB7XG4gIHR5cGU6ICdsb2dnZXInLFxuXG4gIGxvZyhhcmdzKSB7XG4gICAgdGhpcy5vdXRwdXQoJ2xvZycsIGFyZ3MpO1xuICB9LFxuXG4gIHdhcm4oYXJncykge1xuICAgIHRoaXMub3V0cHV0KCd3YXJuJywgYXJncyk7XG4gIH0sXG5cbiAgZXJyb3IoYXJncykge1xuICAgIHRoaXMub3V0cHV0KCdlcnJvcicsIGFyZ3MpO1xuICB9LFxuXG4gIG91dHB1dCh0eXBlLCBhcmdzKSB7XG4gICAgLyogZXNsaW50IG5vLWNvbnNvbGU6IDAgKi9cbiAgICBjb25zb2xlPy5bdHlwZV0/LmFwcGx5Py4oY29uc29sZSwgYXJncyk7XG4gIH0sXG59O1xuXG4vLyBFYWNoIGkxOG5leHQgaW5zdGFuY2UgaGFzIGl0cyBvd24gTG9nZ2VyIChjbG9uZXMgc2hhcmUgdGhlaXIgcGFyZW50J3MpOyB0aGUgZGVmYXVsdCBleHBvcnQgc2VydmVzXG4vLyB0aGUgY2xhc3NlcyB3aGVuIHRoZXkgYXJlIHVzZWQgd2l0aG91dCBhbiBpbnN0YW5jZS5cbmV4cG9ydCBjbGFzcyBMb2dnZXIge1xuICBjb25zdHJ1Y3Rvcihjb25jcmV0ZUxvZ2dlciwgb3B0aW9ucyA9IHt9KSB7XG4gICAgdGhpcy5pbml0KGNvbmNyZXRlTG9nZ2VyLCBvcHRpb25zKTtcbiAgfVxuXG4gIGluaXQoY29uY3JldGVMb2dnZXIsIG9wdGlvbnMgPSB7fSkge1xuICAgIHRoaXMucHJlZml4ID0gb3B0aW9ucy5wcmVmaXggfHwgJ2kxOG5leHQ6JztcbiAgICB0aGlzLmxvZ2dlciA9IGNvbmNyZXRlTG9nZ2VyIHx8IGNvbnNvbGVMb2dnZXI7XG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcbiAgICB0aGlzLmRlYnVnID0gb3B0aW9ucy5kZWJ1ZztcbiAgICB0aGlzLnNlZW4gPSBuZXcgU2V0KCk7XG4gIH1cblxuICBsb2coLi4uYXJncykge1xuICAgIHJldHVybiB0aGlzLmZvcndhcmQoYXJncywgJ2xvZycsICcnLCB0cnVlKTtcbiAgfVxuXG4gIHdhcm4oLi4uYXJncykge1xuICAgIHJldHVybiB0aGlzLmZvcndhcmQoYXJncywgJ3dhcm4nLCAnJywgdHJ1ZSk7XG4gIH1cblxuICBlcnJvciguLi5hcmdzKSB7XG4gICAgcmV0dXJuIHRoaXMuZm9yd2FyZChhcmdzLCAnZXJyb3InLCAnJyk7XG4gIH1cblxuICBkZXByZWNhdGUoLi4uYXJncykge1xuICAgIHJldHVybiB0aGlzLmZvcndhcmQoYXJncywgJ3dhcm4nLCAnV0FSTklORyBERVBSRUNBVEVEOiAnLCB0cnVlKTtcbiAgfVxuXG4gIC8vIEEgZGVidWcgbWVzc2FnZSBsb2dnZWQgb25jZSBwZXIga2V5LiBwb255dGFpbDogcmVtZW1iZXJzIDEwMDAga2V5cyBwZXIgbG9nZ2VyLCB0aGVuIHN0YXlzIHF1aWV0XG4gIG9uY2Uoa2V5LCBsdmwsIC4uLmFyZ3MpIHtcbiAgICBpZiAoIXRoaXMuZGVidWcgfHwgdGhpcy5zZWVuLmhhcyhrZXkpIHx8IHRoaXMuc2Vlbi5zaXplID49IDEwMDApIHJldHVybiBudWxsO1xuICAgIHRoaXMuc2Vlbi5hZGQoa2V5KTtcbiAgICByZXR1cm4gdGhpc1tsdmxdKC4uLmFyZ3MpO1xuICB9XG5cbiAgZm9yd2FyZChhcmdzLCBsdmwsIHByZWZpeCwgZGVidWdPbmx5KSB7XG4gICAgaWYgKGRlYnVnT25seSAmJiAhdGhpcy5kZWJ1ZykgcmV0dXJuIG51bGw7XG4gICAgLy8gU3RyaXAgY29udHJvbCBjaGFyYWN0ZXJzIGZyb20gc3RyaW5nIGFyZ3MgdG8gcHJldmVudCBsb2cgZm9yZ2luZyB2aWFcbiAgICAvLyB1c2VyLWNvbnRyb2xsZWQgdHJhbnNsYXRpb24ga2V5cywgbGFuZ3VhZ2VzLCBuYW1lc3BhY2VzLCBvciBpbnRlcnBvbGF0aW9uXG4gICAgLy8gdmFyaWFibGUgbmFtZXMgKENXRS0xMTcpLlxuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb250cm9sLXJlZ2V4XG4gICAgYXJncyA9IGFyZ3MubWFwKChhKSA9PiAoaXNTdHJpbmcoYSkgPyBhLnJlcGxhY2UoL1tcXHJcXG5cXHgwMC1cXHgxRlxceDdGXS9nLCAnICcpIDogYSkpO1xuICAgIGlmIChpc1N0cmluZyhhcmdzWzBdKSkgYXJnc1swXSA9IGAke3ByZWZpeH0ke3RoaXMucHJlZml4fSAke2FyZ3NbMF19YDtcbiAgICByZXR1cm4gdGhpcy5sb2dnZXJbbHZsXShhcmdzKTtcbiAgfVxuXG4gIGNyZWF0ZShtb2R1bGVOYW1lKSB7XG4gICAgcmV0dXJuIG5ldyBMb2dnZXIodGhpcy5sb2dnZXIsIHtcbiAgICAgIC4uLnsgcHJlZml4OiBgJHt0aGlzLnByZWZpeH06JHttb2R1bGVOYW1lfTpgIH0sXG4gICAgICAuLi50aGlzLm9wdGlvbnMsXG4gICAgfSk7XG4gIH1cblxuICBjbG9uZShvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwgdGhpcy5vcHRpb25zO1xuICAgIG9wdGlvbnMucHJlZml4ID0gb3B0aW9ucy5wcmVmaXggfHwgdGhpcy5wcmVmaXg7XG4gICAgcmV0dXJuIG5ldyBMb2dnZXIodGhpcy5sb2dnZXIsIG9wdGlvbnMpO1xuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IG5ldyBMb2dnZXIoKTtcbiIsIi8vIHRoZSBsaXN0ZW5lcnMgcGFzc2VkIHRvIG9uY2UoKTogb2ZmKCkgbG9va3MgZm9yIHRoZWlyIHdyYXBwZXJzLCBhbmQgc3RheXMgTygxKSBmb3IgYWxsIG90aGVyc1xuY29uc3Qgb25jZUxpc3RlbmVycyA9IG5ldyBXZWFrU2V0KCk7XG5cbmNsYXNzIEV2ZW50RW1pdHRlciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIC8vIFRoaXMgaXMgYW4gT2JqZWN0IGNvbnRhaW5pbmcgTWFwczpcbiAgICAvL1xuICAgIC8vIHsgW2V2ZW50OiBzdHJpbmddOiBNYXA8bGlzdGVuZXI6IGZ1bmN0aW9uLCBudW1UaW1lc0FkZGVkOiBudW1iZXI+IH1cbiAgICAvL1xuICAgIC8vIFdlIHVzZSBhIE1hcCBmb3IgTygxKSBpbnNlcnRpb24vZGVsZXRpb24gYW5kIGJlY2F1c2UgaXQgY2FuIGhhdmUgZnVuY3Rpb25zIGFzIGtleXMuXG4gICAgLy9cbiAgICAvLyBXZSBrZWVwIHRyYWNrIG9mIG51bVRpbWVzQWRkZWQgKHRoZSBudW1iZXIgb2YgdGltZXMgaXQgd2FzIGFkZGVkKSBiZWNhdXNlIGlmIHlvdSBhdHRhY2ggdGhlIHNhbWUgbGlzdGVuZXIgdHdpY2UsXG4gICAgLy8gd2Ugc2hvdWxkIGFjdHVhbGx5IGNhbGwgaXQgdHdpY2UgZm9yIGVhY2ggZW1pdHRlZCBldmVudC5cbiAgICB0aGlzLm9ic2VydmVycyA9IHt9O1xuICB9XG5cbiAgb24oZXZlbnRzLCBsaXN0ZW5lcikge1xuICAgIGV2ZW50cy5zcGxpdCgnICcpLmZvckVhY2goKGV2ZW50KSA9PiB7XG4gICAgICBpZiAoIXRoaXMub2JzZXJ2ZXJzW2V2ZW50XSkgdGhpcy5vYnNlcnZlcnNbZXZlbnRdID0gbmV3IE1hcCgpO1xuICAgICAgY29uc3QgbnVtTGlzdGVuZXJzID0gdGhpcy5vYnNlcnZlcnNbZXZlbnRdLmdldChsaXN0ZW5lcikgfHwgMDtcbiAgICAgIHRoaXMub2JzZXJ2ZXJzW2V2ZW50XS5zZXQobGlzdGVuZXIsIG51bUxpc3RlbmVycyArIDEpO1xuICAgIH0pO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgb2ZmKGV2ZW50cywgbGlzdGVuZXIpIHtcbiAgICAvLyBsaWtlIG9uKCksIGEgc3RyaW5nIGxpc3RzIGV2ZW50cyBzZXBhcmF0ZWQgYnkgc3BhY2VzOyBhbnl0aGluZyBlbHNlIGlzIGxvb2tlZCB1cCBhcyBpdCBpc1xuICAgICh0eXBlb2YgZXZlbnRzID09PSAnc3RyaW5nJyA/IGV2ZW50cy5zcGxpdCgnICcpIDogW2V2ZW50c10pLmZvckVhY2goKGV2ZW50KSA9PiB7XG4gICAgICBpZiAoIXRoaXMub2JzZXJ2ZXJzW2V2ZW50XSkgcmV0dXJuO1xuICAgICAgaWYgKCFsaXN0ZW5lcikge1xuICAgICAgICBkZWxldGUgdGhpcy5vYnNlcnZlcnNbZXZlbnRdO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIHRoaXMub2JzZXJ2ZXJzW2V2ZW50XS5kZWxldGUobGlzdGVuZXIpO1xuICAgICAgaWYgKG9uY2VMaXN0ZW5lcnMuaGFzKGxpc3RlbmVyKSkge1xuICAgICAgICB0aGlzLm9ic2VydmVyc1tldmVudF0uZm9yRWFjaCgoXywgb2JzZXJ2ZXIpID0+IHtcbiAgICAgICAgICBpZiAob2JzZXJ2ZXIubGlzdGVuZXIgPT09IGxpc3RlbmVyKSB0aGlzLm9ic2VydmVyc1tldmVudF0uZGVsZXRlKG9ic2VydmVyKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBvbmNlKGV2ZW50LCBsaXN0ZW5lcikge1xuICAgIGNvbnN0IHdyYXBwZXIgPSAoLi4uYXJncykgPT4ge1xuICAgICAgLy8gcmVtb3ZlZCBmaXJzdCwgc28gYSBsaXN0ZW5lciB0aGF0IGVtaXRzIHRoZSBzYW1lIGV2ZW50IGFnYWluIG9yIHRocm93cyBzdGlsbCBydW5zIG9uY2VcbiAgICAgIHRoaXMub2ZmKGV2ZW50LCB3cmFwcGVyKTtcbiAgICAgIGxpc3RlbmVyKC4uLmFyZ3MpO1xuICAgIH07XG4gICAgd3JhcHBlci5saXN0ZW5lciA9IGxpc3RlbmVyO1xuICAgIG9uY2VMaXN0ZW5lcnMuYWRkKGxpc3RlbmVyKTtcbiAgICB0aGlzLm9uKGV2ZW50LCB3cmFwcGVyKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGVtaXQoZXZlbnQsIC4uLmFyZ3MpIHtcbiAgICBpZiAodGhpcy5vYnNlcnZlcnNbZXZlbnRdKSB7XG4gICAgICBjb25zdCBjbG9uZWQgPSBBcnJheS5mcm9tKHRoaXMub2JzZXJ2ZXJzW2V2ZW50XS5lbnRyaWVzKCkpO1xuICAgICAgY2xvbmVkLmZvckVhY2goKFtvYnNlcnZlciwgbnVtVGltZXNBZGRlZF0pID0+IHtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBudW1UaW1lc0FkZGVkOyBpKyspIHtcbiAgICAgICAgICBvYnNlcnZlciguLi5hcmdzKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMub2JzZXJ2ZXJzWycqJ10pIHtcbiAgICAgIGNvbnN0IGNsb25lZCA9IEFycmF5LmZyb20odGhpcy5vYnNlcnZlcnNbJyonXS5lbnRyaWVzKCkpO1xuICAgICAgY2xvbmVkLmZvckVhY2goKFtvYnNlcnZlciwgbnVtVGltZXNBZGRlZF0pID0+IHtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBudW1UaW1lc0FkZGVkOyBpKyspIHtcbiAgICAgICAgICBvYnNlcnZlcihldmVudCwgLi4uYXJncyk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBFdmVudEVtaXR0ZXI7XG4iLCJpbXBvcnQgRXZlbnRFbWl0dGVyIGZyb20gJy4vRXZlbnRFbWl0dGVyLmpzJztcbmltcG9ydCBiYXNlTG9nZ2VyIGZyb20gJy4vbG9nZ2VyLmpzJztcbmltcG9ydCB7IGdldFBhdGgsIGRlZXBGaW5kLCBzZXRQYXRoLCBkZWVwRXh0ZW5kLCBpc1N0cmluZyB9IGZyb20gJy4vdXRpbHMuanMnO1xuXG4vLyBCdW5kbGVzIGFscmVhZHkgc2VlbiB3aXRoIGtleXMsIHNoYXJlZCBhY3Jvc3MgaW5zdGFuY2VzIHNvIFNTUiBzZXR1cHMgcmV1c2luZyB0aGUgc2FtZVxuLy8gcmVzb3VyY2VzIHNraXAgZW51bWVyYXRpbmcgbGFyZ2UgYnVuZGxlcyBvbiBldmVyeSBpbml0ICgjMjQ0OSkuIE9ubHkgXCJub24tZW1wdHlcIiBpcyBjYWNoZWQ6XG4vLyBubyBBUEkgcmVtb3ZlcyBzaW5nbGUga2V5cyBmcm9tIGEgYnVuZGxlLCBzbyBhIG5vbi1lbXB0eSBidW5kbGUgc3RheXMgbm9uLWVtcHR5LlxuLy8gcG9ueXRhaWw6IGEgYnVuZGxlIGVtcHRpZWQgYnkgaGFuZCB3aXRoIGBkZWxldGVgIG9uIGV2ZXJ5IGtleSBrZWVwcyBjb3VudGluZyBhcyBub24tZW1wdHlcbmNvbnN0IG5vbkVtcHR5QnVuZGxlcyA9IG5ldyBXZWFrU2V0KCk7XG5cbi8vIFRoZSBkb3R0ZWQgZm9ybSwgYWRkUmVzb3VyY2UoJ2VuLnRyYW5zbGF0aW9uLmtleScsIHZhbHVlKSwgd2FzIHJlbW92ZWQgaW4gdjI3OiB3aXRob3V0IHRoaXMgY2hlY2sgaXRzXG4vLyB2YWx1ZSB3b3VsZCBsYW5kIGluIG9wdGlvbnMubnMsIG9yIGFuIG9iamVjdCB3b3VsZCBhbmQgYnJlYWsgdGhlIG5leHQgbG9va3VwXG5jb25zdCBhc3NlcnRTZXBhcmF0ZUFyZ3VtZW50cyA9IChtZXRob2QsIC4uLmFyZ3MpID0+IHtcbiAgaWYgKGFyZ3Muc29tZSgoYSkgPT4gIWlzU3RyaW5nKGEpKSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXG4gICAgICBgJHttZXRob2R9OiBwYXNzIGxhbmd1YWdlLCBuYW1lc3BhY2Uke21ldGhvZCA9PT0gJ2FkZFJlc291cmNlJyA/ICcgYW5kIGtleScgOiAnJ30gYXMgc2VwYXJhdGUgc3RyaW5nczsgdGhlIGRvdHRlZCBmb3JtICgnZW4udHJhbnNsYXRpb24ua2V5Jykgd2FzIHJlbW92ZWQgaW4gaTE4bmV4dCB2MjdgLFxuICAgICk7XG4gIH1cbn07XG5cbmNsYXNzIFJlc291cmNlU3RvcmUgZXh0ZW5kcyBFdmVudEVtaXR0ZXIge1xuICBjb25zdHJ1Y3RvcihcbiAgICBkYXRhLFxuICAgIG9wdGlvbnMgPSB7IG5zOiBbJ3RyYW5zbGF0aW9uJ10sIGRlZmF1bHROUzogJ3RyYW5zbGF0aW9uJyB9LFxuICAgIGxvZ2dlciA9IGJhc2VMb2dnZXIsXG4gICkge1xuICAgIHN1cGVyKCk7XG5cbiAgICB0aGlzLmRhdGEgPSBkYXRhIHx8IHt9O1xuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG4gICAgdGhpcy5sb2dnZXIgPSBsb2dnZXIuY3JlYXRlKCdyZXNvdXJjZVN0b3JlJyk7XG4gICAgaWYgKHRoaXMub3B0aW9ucy5rZXlTZXBhcmF0b3IgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5vcHRpb25zLmtleVNlcGFyYXRvciA9ICcuJztcbiAgICB9XG4gICAgaWYgKHRoaXMub3B0aW9ucy5pZ25vcmVKU09OU3RydWN0dXJlID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMub3B0aW9ucy5pZ25vcmVKU09OU3RydWN0dXJlID0gdHJ1ZTtcbiAgICB9XG4gIH1cblxuICBhZGROYW1lc3BhY2VzKG5zKSB7XG4gICAgaWYgKCF0aGlzLm9wdGlvbnMubnMuaW5jbHVkZXMobnMpKSB7XG4gICAgICB0aGlzLm9wdGlvbnMubnMucHVzaChucyk7XG4gICAgfVxuICB9XG5cbiAgcmVtb3ZlTmFtZXNwYWNlcyhucykge1xuICAgIGNvbnN0IGluZGV4ID0gdGhpcy5vcHRpb25zLm5zLmluZGV4T2YobnMpO1xuICAgIGlmIChpbmRleCA+IC0xKSB7XG4gICAgICB0aGlzLm9wdGlvbnMubnMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICB9XG4gIH1cblxuICBnZXRSZXNvdXJjZShsbmcsIG5zLCBrZXksIG9wdGlvbnMgPSB7fSkge1xuICAgIGNvbnN0IGtleVNlcGFyYXRvciA9XG4gICAgICBvcHRpb25zLmtleVNlcGFyYXRvciAhPT0gdW5kZWZpbmVkID8gb3B0aW9ucy5rZXlTZXBhcmF0b3IgOiB0aGlzLm9wdGlvbnMua2V5U2VwYXJhdG9yO1xuXG4gICAgY29uc3QgaWdub3JlSlNPTlN0cnVjdHVyZSA9XG4gICAgICBvcHRpb25zLmlnbm9yZUpTT05TdHJ1Y3R1cmUgIT09IHVuZGVmaW5lZFxuICAgICAgICA/IG9wdGlvbnMuaWdub3JlSlNPTlN0cnVjdHVyZVxuICAgICAgICA6IHRoaXMub3B0aW9ucy5pZ25vcmVKU09OU3RydWN0dXJlO1xuXG4gICAgY29uc3QgcGF0aCA9IFtsbmcsIG5zXTtcbiAgICBpZiAoa2V5KSB7XG4gICAgICBpZiAoQXJyYXkuaXNBcnJheShrZXkpKSB7XG4gICAgICAgIHBhdGgucHVzaCguLi5rZXkpO1xuICAgICAgfSBlbHNlIGlmIChpc1N0cmluZyhrZXkpICYmIGtleVNlcGFyYXRvcikge1xuICAgICAgICBwYXRoLnB1c2goLi4ua2V5LnNwbGl0KGtleVNlcGFyYXRvcikpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcGF0aC5wdXNoKGtleSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgcmVzdWx0ID0gZ2V0UGF0aCh0aGlzLmRhdGEsIHBhdGgpO1xuICAgIC8vIGZhbHNlLCAwIGFuZCAnJyBhcmUgdmFsdWVzOyBudWxsIChub3QgYSB2YWxpZCBsb29rdXAgYnkgZGVmYXVsdCkgc3RpbGwgZmFsbHMgYmFjayB0byBhIGZsYXQga2V5XG4gICAgaWYgKHJlc3VsdCAhPSBudWxsIHx8ICFpZ25vcmVKU09OU3RydWN0dXJlIHx8ICFpc1N0cmluZyhrZXkpKSByZXR1cm4gcmVzdWx0O1xuXG4gICAgcmV0dXJuIGRlZXBGaW5kKHRoaXMuZGF0YT8uW2xuZ10/Lltuc10sIGtleSwga2V5U2VwYXJhdG9yKTtcbiAgfVxuXG4gIGFkZFJlc291cmNlKGxuZywgbnMsIGtleSwgdmFsdWUsIG9wdGlvbnMgPSB7IHNpbGVudDogZmFsc2UgfSkge1xuICAgIGFzc2VydFNlcGFyYXRlQXJndW1lbnRzKCdhZGRSZXNvdXJjZScsIGxuZywgbnMsIGtleSk7XG4gICAgY29uc3Qga2V5U2VwYXJhdG9yID1cbiAgICAgIG9wdGlvbnMua2V5U2VwYXJhdG9yICE9PSB1bmRlZmluZWQgPyBvcHRpb25zLmtleVNlcGFyYXRvciA6IHRoaXMub3B0aW9ucy5rZXlTZXBhcmF0b3I7XG5cbiAgICBsZXQgcGF0aCA9IFtsbmcsIG5zXTtcbiAgICBpZiAoa2V5KSBwYXRoID0gcGF0aC5jb25jYXQoa2V5U2VwYXJhdG9yID8ga2V5LnNwbGl0KGtleVNlcGFyYXRvcikgOiBrZXkpO1xuXG4gICAgdGhpcy5hZGROYW1lc3BhY2VzKG5zKTtcblxuICAgIHNldFBhdGgodGhpcy5kYXRhLCBwYXRoLCB2YWx1ZSk7XG5cbiAgICBpZiAoIW9wdGlvbnMuc2lsZW50KSB0aGlzLmVtaXQoJ2FkZGVkJywgbG5nLCBucywga2V5LCB2YWx1ZSk7XG4gIH1cblxuICBhZGRSZXNvdXJjZXMobG5nLCBucywgcmVzb3VyY2VzLCBvcHRpb25zID0geyBzaWxlbnQ6IGZhbHNlIH0pIHtcbiAgICBhc3NlcnRTZXBhcmF0ZUFyZ3VtZW50cygnYWRkUmVzb3VyY2VzJywgbG5nLCBucyk7XG4gICAgLy8gZXZlcnkgdmFsdWUsIGFzIGFkZFJlc291cmNlKCkgdGFrZXMgaXQgKG51bWJlcnMsIGJvb2xlYW5zIGFuZCBvYmplY3RzIHdlcmUgZHJvcHBlZClcbiAgICBPYmplY3Qua2V5cyhyZXNvdXJjZXMgfHwge30pLmZvckVhY2goKG0pID0+IHtcbiAgICAgIGlmIChtID09PSAnX19wcm90b19fJyB8fCBtID09PSAnY29uc3RydWN0b3InKSByZXR1cm47XG4gICAgICB0aGlzLmFkZFJlc291cmNlKGxuZywgbnMsIG0sIHJlc291cmNlc1ttXSwgeyBzaWxlbnQ6IHRydWUgfSk7XG4gICAgfSk7XG4gICAgaWYgKCFvcHRpb25zLnNpbGVudCkgdGhpcy5lbWl0KCdhZGRlZCcsIGxuZywgbnMsIHJlc291cmNlcyk7XG4gIH1cblxuICBhZGRSZXNvdXJjZUJ1bmRsZShcbiAgICBsbmcsXG4gICAgbnMsXG4gICAgcmVzb3VyY2VzLFxuICAgIGRlZXAsXG4gICAgb3ZlcndyaXRlLFxuICAgIG9wdGlvbnMgPSB7IHNpbGVudDogZmFsc2UsIHNraXBDb3B5OiBmYWxzZSB9LFxuICApIHtcbiAgICBhc3NlcnRTZXBhcmF0ZUFyZ3VtZW50cygnYWRkUmVzb3VyY2VCdW5kbGUnLCBsbmcsIG5zKTtcbiAgICBjb25zdCBwYXRoID0gW2xuZywgbnNdO1xuXG4gICAgdGhpcy5hZGROYW1lc3BhY2VzKG5zKTtcblxuICAgIGxldCBwYWNrID0gZ2V0UGF0aCh0aGlzLmRhdGEsIHBhdGgpIHx8IHt9O1xuXG4gICAgaWYgKCFvcHRpb25zLnNraXBDb3B5KSByZXNvdXJjZXMgPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KHJlc291cmNlcykpOyAvLyBtYWtlIGEgY29weSB0byBmaXggIzIwODFcblxuICAgIGlmIChkZWVwKSB7XG4gICAgICBkZWVwRXh0ZW5kKHBhY2ssIHJlc291cmNlcywgb3ZlcndyaXRlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcGFjayA9IHsgLi4ucGFjaywgLi4ucmVzb3VyY2VzIH07XG4gICAgfVxuXG4gICAgc2V0UGF0aCh0aGlzLmRhdGEsIHBhdGgsIHBhY2spO1xuXG4gICAgaWYgKCFvcHRpb25zLnNpbGVudCkgdGhpcy5lbWl0KCdhZGRlZCcsIGxuZywgbnMsIHJlc291cmNlcyk7XG4gIH1cblxuICByZW1vdmVSZXNvdXJjZUJ1bmRsZShsbmcsIG5zKSB7XG4gICAgaWYgKHRoaXMuaGFzUmVzb3VyY2VCdW5kbGUobG5nLCBucykpIHtcbiAgICAgIGRlbGV0ZSB0aGlzLmRhdGFbbG5nXVtuc107XG4gICAgfVxuICAgIHRoaXMucmVtb3ZlTmFtZXNwYWNlcyhucyk7XG5cbiAgICB0aGlzLmVtaXQoJ3JlbW92ZWQnLCBsbmcsIG5zKTtcbiAgfVxuXG4gIGhhc1Jlc291cmNlQnVuZGxlKGxuZywgbnMpIHtcbiAgICByZXR1cm4gdGhpcy5nZXRSZXNvdXJjZShsbmcsIG5zKSAhPT0gdW5kZWZpbmVkO1xuICB9XG5cbiAgZ2V0UmVzb3VyY2VCdW5kbGUobG5nLCBucykge1xuICAgIGlmICghbnMpIG5zID0gdGhpcy5vcHRpb25zLmRlZmF1bHROUztcbiAgICByZXR1cm4gdGhpcy5nZXRSZXNvdXJjZShsbmcsIG5zKTtcbiAgfVxuXG4gIGdldERhdGFCeUxhbmd1YWdlKGxuZykge1xuICAgIHJldHVybiB0aGlzLmRhdGFbbG5nXTtcbiAgfVxuXG4gIGhhc0xhbmd1YWdlU29tZVRyYW5zbGF0aW9ucyhsbmcpIHtcbiAgICBjb25zdCBkYXRhID0gdGhpcy5nZXREYXRhQnlMYW5ndWFnZShsbmcpO1xuICAgIGNvbnN0IG4gPSAoZGF0YSAmJiBPYmplY3Qua2V5cyhkYXRhKSkgfHwgW107XG4gICAgcmV0dXJuICEhbi5maW5kKCh2KSA9PiB7XG4gICAgICBjb25zdCBidW5kbGUgPSBkYXRhW3ZdO1xuICAgICAgaWYgKG5vbkVtcHR5QnVuZGxlcy5oYXMoYnVuZGxlKSkgcmV0dXJuIHRydWU7XG4gICAgICBpZiAoIWJ1bmRsZSB8fCBPYmplY3Qua2V5cyhidW5kbGUpLmxlbmd0aCA9PT0gMCkgcmV0dXJuIGZhbHNlO1xuICAgICAgaWYgKHR5cGVvZiBidW5kbGUgPT09ICdvYmplY3QnKSBub25FbXB0eUJ1bmRsZXMuYWRkKGJ1bmRsZSk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9KTtcbiAgfVxuXG4gIHRvSlNPTigpIHtcbiAgICByZXR1cm4gdGhpcy5kYXRhO1xuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IFJlc291cmNlU3RvcmU7XG4iLCJjb25zdCBQQVRIX0tFWSA9IFN5bWJvbCgnaTE4bmV4dC9QQVRIX0tFWScpO1xuXG5mdW5jdGlvbiBjcmVhdGVQcm94eSgpIHtcbiAgY29uc3Qgc3RhdGUgPSBbXTtcbiAgLy8gYE9iamVjdC5jcmVhdGUobnVsbClgIHRvIHByZXZlbnQgcHJvdG90eXBlIHBvbGx1dGlvblxuICBjb25zdCBoYW5kbGVyID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgbGV0IHByb3h5O1xuICBoYW5kbGVyLmdldCA9ICh0YXJnZXQsIGtleSkgPT4ge1xuICAgIHByb3h5Py5yZXZva2U/LigpO1xuICAgIGlmIChrZXkgPT09IFBBVEhfS0VZKSByZXR1cm4gc3RhdGU7XG4gICAgc3RhdGUucHVzaChrZXkpO1xuICAgIHByb3h5ID0gUHJveHkucmV2b2NhYmxlKHRhcmdldCwgaGFuZGxlcik7XG4gICAgcmV0dXJuIHByb3h5LnByb3h5O1xuICB9O1xuICByZXR1cm4gUHJveHkucmV2b2NhYmxlKE9iamVjdC5jcmVhdGUobnVsbCksIGhhbmRsZXIpLnByb3h5O1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBrZXlzRnJvbVNlbGVjdG9yKHNlbGVjdG9yLCBvcHRzKSB7XG4gIGNvbnN0IHsgW1BBVEhfS0VZXTogcGF0aCB9ID0gc2VsZWN0b3IoY3JlYXRlUHJveHkoKSk7XG5cbiAgLy8ga2V5U2VwYXJhdG9yOiBmYWxzZSBqb2lucyB3aXRoICcuJywgYXMgZ2V0Rml4ZWRUKCkgam9pbnMgYSBrZXkgcHJlZml4OiBgJC5hLmJgIGlzIHRoZSBmbGF0IGtleSAnYS5iJ1xuICAvLyAoam9pbmVkIHdpdGggZmFsc2UgaXQgd2FzICdhZmFsc2ViJylcbiAgY29uc3Qga2V5U2VwYXJhdG9yID0gb3B0cz8ua2V5U2VwYXJhdG9yIHx8ICcuJztcbiAgY29uc3QgbnNTZXBhcmF0b3IgPSBvcHRzPy5uc1NlcGFyYXRvciA/PyAnOic7XG4gIGNvbnN0IHN0cmljdCA9IG9wdHM/LmVuYWJsZVNlbGVjdG9yID09PSAnc3RyaWN0JztcblxuICAvLyBEZWZhdWx0IG1vZGUgKHYyNS44LjE5KTogd2hlbiBgbnNgIGlzIGFuIGFycmF5IG9mIHR3byBvciBtb3JlIG5hbWVzcGFjZXMsXG4gIC8vIEdldFNvdXJjZSBleHBvc2VzIHRoZSBwcmltYXJ5IG5hbWVzcGFjZSdzIGtleXMgZmxhdCBvbiBgJGAsIHdoaWxlIHNlY29uZGFyeVxuICAvLyBuYW1lc3BhY2VzIGFyZSBodW5nIG9mZiBgJGAgdW5kZXIgdGhlaXIgb3duIG5hbWUgKGUuZy4gYCQubnMzLmZyb21OczNgKS5cbiAgLy8gT25seSBhIGxlYWRpbmcgc2VnbWVudCBlcXVhbCB0byBhICpzZWNvbmRhcnkqIG5hbWVzcGFjZSBpcyByZXdyaXR0ZW4uXG4gIC8vIFNpbmdsZS1zdHJpbmcgbnMgYW5kIHByaW1hcnktcHJlZml4ZWQgcGF0aHMgc3RheSBmbGF0IChwcmVzZXJ2ZXMgIzI0MDUpLlxuICAvL1xuICAvLyBTdHJpY3QgbW9kZTogYE5zUmVzb3VyY2VgIGRyb3BzIGl0cyBmbGF0dGVuZWQtcHJpbWFyeSBmb3JtIGF0IHRoZSB0eXBlXG4gIC8vIGxldmVsIOKAlCBgJGAgZXhwb3NlcyBuYW1lc3BhY2VzIHVuaWZvcm1seSwgcHJpbWFyeSBpbmNsdWRlZC4gU28gYHBhdGhbMF1gXG4gIC8vIGlzICphbHdheXMqIGEgbmFtZXNwYWNlIGlkZW50aWZpZXIgd2hlbiBpdCBtYXRjaGVzIHRoZSBzY29wZSdzIG5zIGxpc3QsXG4gIC8vIGFuZCB3ZSByZXdyaXRlIHRvIGBuczxzZXA+cmVzdGAgcmVnYXJkbGVzcyBvZiBzaW5nbGUvbXVsdGktbnMgc2NvcGUgYW5kXG4gIC8vIHJlZ2FyZGxlc3Mgb2YgcHJpbWFyeSB2cyBzZWNvbmRhcnkuIFNlZSAjMjQyOS5cbiAgaWYgKHBhdGgubGVuZ3RoID4gMSAmJiBuc1NlcGFyYXRvcikge1xuICAgIGNvbnN0IG5zID0gb3B0cz8ubnM7XG4gICAgY29uc3QgbnNMaXN0ID0gc3RyaWN0XG4gICAgICA/IEFycmF5LmlzQXJyYXkobnMpXG4gICAgICAgID8gbnNcbiAgICAgICAgOiBuc1xuICAgICAgICAgID8gW25zXVxuICAgICAgICAgIDogbnVsbFxuICAgICAgOiBBcnJheS5pc0FycmF5KG5zKVxuICAgICAgICA/IG5zXG4gICAgICAgIDogbnVsbDtcblxuICAgIGlmIChuc0xpc3QpIHtcbiAgICAgIGNvbnN0IGNhbmRpZGF0ZXMgPSBzdHJpY3QgPyBuc0xpc3QgOiBuc0xpc3QubGVuZ3RoID4gMSA/IG5zTGlzdC5zbGljZSgxKSA6IFtdO1xuICAgICAgaWYgKGNhbmRpZGF0ZXMuaW5jbHVkZXMocGF0aFswXSkpIHtcbiAgICAgICAgcmV0dXJuIGAke3BhdGhbMF19JHtuc1NlcGFyYXRvcn0ke3BhdGguc2xpY2UoMSkuam9pbihrZXlTZXBhcmF0b3IpfWA7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHBhdGguam9pbihrZXlTZXBhcmF0b3IpO1xufVxuIiwiaW1wb3J0IGJhc2VMb2dnZXIgZnJvbSAnLi9sb2dnZXIuanMnO1xuaW1wb3J0IEV2ZW50RW1pdHRlciBmcm9tICcuL0V2ZW50RW1pdHRlci5qcyc7XG5pbXBvcnQgeyBjb3B5IGFzIHV0aWxzQ29weSwgbG9va3NMaWtlT2JqZWN0UGF0aCwgaXNTdHJpbmcgfSBmcm9tICcuL3V0aWxzLmpzJztcbmltcG9ydCBrZXlzRnJvbVNlbGVjdG9yIGZyb20gJy4vc2VsZWN0b3IuanMnO1xuXG4vLyAwbiB0b286IGEgQmlnSW50IGNvdW50IGxvb2tzIHVwIHRoZSBfemVybyBmb3JtIGFzIDAgZG9lc1xuY29uc3QgaXNaZXJvQ291bnQgPSAoY291bnQpID0+IGNvdW50ID09PSAwIHx8ICh0eXBlb2YgY291bnQgPT09ICdiaWdpbnQnICYmICFjb3VudCk7XG5cbmNvbnN0IHNob3VsZEhhbmRsZUFzT2JqZWN0ID0gKHJlcykgPT5cbiAgIWlzU3RyaW5nKHJlcykgJiYgdHlwZW9mIHJlcyAhPT0gJ2Jvb2xlYW4nICYmIHR5cGVvZiByZXMgIT09ICdudW1iZXInO1xuXG5jbGFzcyBUcmFuc2xhdG9yIGV4dGVuZHMgRXZlbnRFbWl0dGVyIHtcbiAgY29uc3RydWN0b3Ioc2VydmljZXMsIG9wdGlvbnMgPSB7fSkge1xuICAgIHN1cGVyKCk7XG5cbiAgICB1dGlsc0NvcHkoXG4gICAgICBbXG4gICAgICAgICdyZXNvdXJjZVN0b3JlJyxcbiAgICAgICAgJ2xhbmd1YWdlVXRpbHMnLFxuICAgICAgICAncGx1cmFsUmVzb2x2ZXInLFxuICAgICAgICAnaW50ZXJwb2xhdG9yJyxcbiAgICAgICAgJ2JhY2tlbmRDb25uZWN0b3InLFxuICAgICAgICAnaTE4bkZvcm1hdCcsXG4gICAgICAgICd1dGlscycsXG4gICAgICAgICdwb3N0UHJvY2Vzc29ycycsXG4gICAgICBdLFxuICAgICAgc2VydmljZXMsXG4gICAgICB0aGlzLFxuICAgICk7XG5cbiAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuICAgIGlmICh0aGlzLm9wdGlvbnMua2V5U2VwYXJhdG9yID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMub3B0aW9ucy5rZXlTZXBhcmF0b3IgPSAnLic7XG4gICAgfVxuXG4gICAgdGhpcy5sb2dnZXIgPSAoc2VydmljZXMubG9nZ2VyIHx8IGJhc2VMb2dnZXIpLmNyZWF0ZSgndHJhbnNsYXRvcicpO1xuXG4gICAgdGhpcy5jaGVja2VkTG9hZGVkRm9yID0ge307XG4gIH1cblxuICBjaGFuZ2VMYW5ndWFnZShsbmcpIHtcbiAgICBpZiAobG5nKSB0aGlzLmxhbmd1YWdlID0gbG5nO1xuICB9XG5cbiAgZXhpc3RzKGtleSwgbyA9IHsgaW50ZXJwb2xhdGlvbjoge30gfSkge1xuICAgIGNvbnN0IG9wdCA9IHsgLi4ubyB9O1xuICAgIGlmIChrZXkgPT0gbnVsbCkgcmV0dXJuIGZhbHNlO1xuICAgIGNvbnN0IHJlc29sdmVkID0gdGhpcy5yZXNvbHZlKGtleSwgb3B0KTtcblxuICAgIC8vIElmIG5vIHJlc291cmNlIGZvdW5kLCByZXR1cm4gZmFsc2VcbiAgICBpZiAocmVzb2x2ZWQ/LnJlcyA9PT0gdW5kZWZpbmVkKSByZXR1cm4gZmFsc2U7XG5cbiAgICAvLyBDaGVjayBpZiB0aGUgcmVzb2x2ZWQgcmVzb3VyY2UgaXMgYW4gb2JqZWN0XG4gICAgY29uc3QgaXNPYmplY3QgPSBzaG91bGRIYW5kbGVBc09iamVjdChyZXNvbHZlZC5yZXMpO1xuXG4gICAgLy8gSWYgcmV0dXJuT2JqZWN0cyBpcyBleHBsaWNpdGx5IHNldCB0byBmYWxzZSBhbmQgdGhlIHJlc291cmNlIGlzIGFuIG9iamVjdCwgcmV0dXJuIGZhbHNlXG4gICAgaWYgKG9wdC5yZXR1cm5PYmplY3RzID09PSBmYWxzZSAmJiBpc09iamVjdCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIC8vIE90aGVyd2lzZSByZXR1cm4gdHJ1ZSAocmVzb3VyY2UgZXhpc3RzKVxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgZXh0cmFjdEZyb21LZXkoa2V5LCBvcHQpIHtcbiAgICBsZXQgbnNTZXBhcmF0b3IgPSBvcHQubnNTZXBhcmF0b3IgIT09IHVuZGVmaW5lZCA/IG9wdC5uc1NlcGFyYXRvciA6IHRoaXMub3B0aW9ucy5uc1NlcGFyYXRvcjtcbiAgICBpZiAobnNTZXBhcmF0b3IgPT09IHVuZGVmaW5lZCkgbnNTZXBhcmF0b3IgPSAnOic7XG5cbiAgICBjb25zdCBrZXlTZXBhcmF0b3IgPVxuICAgICAgb3B0LmtleVNlcGFyYXRvciAhPT0gdW5kZWZpbmVkID8gb3B0LmtleVNlcGFyYXRvciA6IHRoaXMub3B0aW9ucy5rZXlTZXBhcmF0b3I7XG5cbiAgICBsZXQgbmFtZXNwYWNlcyA9IG9wdC5ucyB8fCB0aGlzLm9wdGlvbnMuZGVmYXVsdE5TIHx8IFtdO1xuICAgIGNvbnN0IHdvdWxkQ2hlY2tGb3JOc0luS2V5ID0gbnNTZXBhcmF0b3IgJiYga2V5LmluY2x1ZGVzKG5zU2VwYXJhdG9yKTtcbiAgICBjb25zdCBzZWVtc05hdHVyYWxMYW5ndWFnZSA9XG4gICAgICAhdGhpcy5vcHRpb25zLnVzZXJEZWZpbmVkS2V5U2VwYXJhdG9yICYmXG4gICAgICAhb3B0LmtleVNlcGFyYXRvciAmJlxuICAgICAgIXRoaXMub3B0aW9ucy51c2VyRGVmaW5lZE5zU2VwYXJhdG9yICYmXG4gICAgICAhb3B0Lm5zU2VwYXJhdG9yICYmXG4gICAgICAhbG9va3NMaWtlT2JqZWN0UGF0aChrZXksIG5zU2VwYXJhdG9yLCBrZXlTZXBhcmF0b3IpO1xuICAgIGlmICh3b3VsZENoZWNrRm9yTnNJbktleSAmJiAhc2VlbXNOYXR1cmFsTGFuZ3VhZ2UpIHtcbiAgICAgIGNvbnN0IG0gPSBrZXkubWF0Y2godGhpcy5pbnRlcnBvbGF0b3IubmVzdGluZ1JlZ2V4cCk7XG4gICAgICBpZiAobSAmJiBtLmxlbmd0aCA+IDApIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBrZXksXG4gICAgICAgICAgbmFtZXNwYWNlczogaXNTdHJpbmcobmFtZXNwYWNlcykgPyBbbmFtZXNwYWNlc10gOiBuYW1lc3BhY2VzLFxuICAgICAgICB9O1xuICAgICAgfVxuICAgICAgY29uc3QgcGFydHMgPSBrZXkuc3BsaXQobnNTZXBhcmF0b3IpO1xuICAgICAgaWYgKFxuICAgICAgICBuc1NlcGFyYXRvciAhPT0ga2V5U2VwYXJhdG9yIHx8XG4gICAgICAgIChuc1NlcGFyYXRvciA9PT0ga2V5U2VwYXJhdG9yICYmIHRoaXMub3B0aW9ucy5ucy5pbmNsdWRlcyhwYXJ0c1swXSkpXG4gICAgICApXG4gICAgICAgIG5hbWVzcGFjZXMgPSBwYXJ0cy5zaGlmdCgpO1xuICAgICAgLy8gZmxhdCBrZXlzIChrZXlTZXBhcmF0b3I6IGZhbHNlKSBrZWVwIHRoZSB0ZXh0IGFmdGVyIHRoZSBuYW1lc3BhY2UgYXMgaXQgaXMsIG5vdCBqb2luZWQgd2l0aCAnZmFsc2UnXG4gICAgICBrZXkgPSBwYXJ0cy5qb2luKGtleVNlcGFyYXRvciA9PT0gZmFsc2UgPyBuc1NlcGFyYXRvciA6IGtleVNlcGFyYXRvcik7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIGtleSxcbiAgICAgIG5hbWVzcGFjZXM6IGlzU3RyaW5nKG5hbWVzcGFjZXMpID8gW25hbWVzcGFjZXNdIDogbmFtZXNwYWNlcyxcbiAgICB9O1xuICB9XG5cbiAgdHJhbnNsYXRlKGtleXMsIG8sIGxhc3RLZXkpIHtcbiAgICBsZXQgb3B0ID0gdHlwZW9mIG8gPT09ICdvYmplY3QnID8geyAuLi5vIH0gOiBvO1xuICAgIGlmICh0eXBlb2Ygb3B0ICE9PSAnb2JqZWN0JyAmJiB0aGlzLm9wdGlvbnMub3ZlcmxvYWRUcmFuc2xhdGlvbk9wdGlvbkhhbmRsZXIpIHtcbiAgICAgIG9wdCA9IHRoaXMub3B0aW9ucy5vdmVybG9hZFRyYW5zbGF0aW9uT3B0aW9uSGFuZGxlcihhcmd1bWVudHMpO1xuICAgIH1cbiAgICBpZiAodHlwZW9mIG9wdCA9PT0gJ29iamVjdCcpIG9wdCA9IHsgLi4ub3B0IH07XG4gICAgaWYgKCFvcHQpIG9wdCA9IHt9O1xuXG4gICAgLy8gbm9uIHZhbGlkIGtleXMgaGFuZGxpbmdcbiAgICBpZiAoa2V5cyA9PSBudWxsIC8qIHx8IGtleXMgPT09ICcnICovKSByZXR1cm4gJyc7XG4gICAgaWYgKHR5cGVvZiBrZXlzID09PSAnZnVuY3Rpb24nKSBrZXlzID0ga2V5c0Zyb21TZWxlY3RvcihrZXlzLCB7IC4uLnRoaXMub3B0aW9ucywgLi4ub3B0IH0pO1xuICAgIGlmICghQXJyYXkuaXNBcnJheShrZXlzKSkga2V5cyA9IFtTdHJpbmcoa2V5cyldO1xuICAgIGtleXMgPSBrZXlzLm1hcCgoaykgPT5cbiAgICAgIHR5cGVvZiBrID09PSAnZnVuY3Rpb24nID8ga2V5c0Zyb21TZWxlY3RvcihrLCB7IC4uLnRoaXMub3B0aW9ucywgLi4ub3B0IH0pIDogU3RyaW5nKGspLFxuICAgICk7XG5cbiAgICBjb25zdCByZXR1cm5EZXRhaWxzID1cbiAgICAgIG9wdC5yZXR1cm5EZXRhaWxzICE9PSB1bmRlZmluZWQgPyBvcHQucmV0dXJuRGV0YWlscyA6IHRoaXMub3B0aW9ucy5yZXR1cm5EZXRhaWxzO1xuXG4gICAgLy8gc2VwYXJhdG9yc1xuICAgIGNvbnN0IGtleVNlcGFyYXRvciA9XG4gICAgICBvcHQua2V5U2VwYXJhdG9yICE9PSB1bmRlZmluZWQgPyBvcHQua2V5U2VwYXJhdG9yIDogdGhpcy5vcHRpb25zLmtleVNlcGFyYXRvcjtcblxuICAgIC8vIGdldCBuYW1lc3BhY2UocylcbiAgICBjb25zdCB7IGtleSwgbmFtZXNwYWNlcyB9ID0gdGhpcy5leHRyYWN0RnJvbUtleShrZXlzW2tleXMubGVuZ3RoIC0gMV0sIG9wdCk7XG4gICAgY29uc3QgbmFtZXNwYWNlID0gbmFtZXNwYWNlc1tuYW1lc3BhY2VzLmxlbmd0aCAtIDFdO1xuXG4gICAgbGV0IG5zU2VwYXJhdG9yID0gb3B0Lm5zU2VwYXJhdG9yICE9PSB1bmRlZmluZWQgPyBvcHQubnNTZXBhcmF0b3IgOiB0aGlzLm9wdGlvbnMubnNTZXBhcmF0b3I7XG4gICAgaWYgKG5zU2VwYXJhdG9yID09PSB1bmRlZmluZWQpIG5zU2VwYXJhdG9yID0gJzonO1xuXG4gICAgLy8gcmV0dXJuIGtleSBvbiBDSU1vZGVcbiAgICBjb25zdCBsbmcgPSBvcHQubG5nIHx8IHRoaXMubGFuZ3VhZ2U7XG4gICAgY29uc3QgYXBwZW5kTmFtZXNwYWNlVG9DSU1vZGUgPVxuICAgICAgb3B0LmFwcGVuZE5hbWVzcGFjZVRvQ0lNb2RlIHx8IHRoaXMub3B0aW9ucy5hcHBlbmROYW1lc3BhY2VUb0NJTW9kZTtcbiAgICBpZiAobG5nPy50b0xvd2VyQ2FzZSgpID09PSAnY2ltb2RlJykge1xuICAgICAgaWYgKGFwcGVuZE5hbWVzcGFjZVRvQ0lNb2RlKSB7XG4gICAgICAgIGlmIChyZXR1cm5EZXRhaWxzKSB7XG4gICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJlczogYCR7bmFtZXNwYWNlfSR7bnNTZXBhcmF0b3J9JHtrZXl9YCxcbiAgICAgICAgICAgIHVzZWRLZXk6IGtleSxcbiAgICAgICAgICAgIGV4YWN0VXNlZEtleToga2V5LFxuICAgICAgICAgICAgdXNlZExuZzogbG5nLFxuICAgICAgICAgICAgdXNlZE5TOiBuYW1lc3BhY2UsXG4gICAgICAgICAgICB1c2VkUGFyYW1zOiB0aGlzLmdldFVzZWRQYXJhbXNEZXRhaWxzKG9wdCksXG4gICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYCR7bmFtZXNwYWNlfSR7bnNTZXBhcmF0b3J9JHtrZXl9YDtcbiAgICAgIH1cblxuICAgICAgaWYgKHJldHVybkRldGFpbHMpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICByZXM6IGtleSxcbiAgICAgICAgICB1c2VkS2V5OiBrZXksXG4gICAgICAgICAgZXhhY3RVc2VkS2V5OiBrZXksXG4gICAgICAgICAgdXNlZExuZzogbG5nLFxuICAgICAgICAgIHVzZWROUzogbmFtZXNwYWNlLFxuICAgICAgICAgIHVzZWRQYXJhbXM6IHRoaXMuZ2V0VXNlZFBhcmFtc0RldGFpbHMob3B0KSxcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBrZXk7XG4gICAgfVxuXG4gICAgLy8gcmVzb2x2ZSBmcm9tIHN0b3JlXG4gICAgY29uc3QgcmVzb2x2ZWQgPSB0aGlzLnJlc29sdmUoa2V5cywgb3B0KTtcbiAgICBsZXQgcmVzID0gcmVzb2x2ZWQ/LnJlcztcbiAgICBjb25zdCByZXNVc2VkS2V5ID0gcmVzb2x2ZWQ/LnVzZWRLZXkgfHwga2V5O1xuICAgIGNvbnN0IHJlc0V4YWN0VXNlZEtleSA9IHJlc29sdmVkPy5leGFjdFVzZWRLZXkgfHwga2V5O1xuXG4gICAgY29uc3Qgbm9PYmplY3QgPSBbJ1tvYmplY3QgTnVtYmVyXScsICdbb2JqZWN0IEZ1bmN0aW9uXScsICdbb2JqZWN0IFJlZ0V4cF0nXTtcbiAgICBjb25zdCBqb2luQXJyYXlzID0gb3B0LmpvaW5BcnJheXMgIT09IHVuZGVmaW5lZCA/IG9wdC5qb2luQXJyYXlzIDogdGhpcy5vcHRpb25zLmpvaW5BcnJheXM7XG5cbiAgICAvLyBvYmplY3RcbiAgICBjb25zdCBoYW5kbGVBc09iamVjdEluSTE4bkZvcm1hdCA9ICF0aGlzLmkxOG5Gb3JtYXQgfHwgdGhpcy5pMThuRm9ybWF0LmhhbmRsZUFzT2JqZWN0O1xuICAgIGNvbnN0IG5lZWRzUGx1cmFsSGFuZGxpbmcgPSBvcHQuY291bnQgIT09IHVuZGVmaW5lZCAmJiAhaXNTdHJpbmcob3B0LmNvdW50KTtcbiAgICBjb25zdCBoYXNEZWZhdWx0VmFsdWUgPSBUcmFuc2xhdG9yLmhhc0RlZmF1bHRWYWx1ZShvcHQpO1xuICAgIGNvbnN0IGRlZmF1bHRWYWx1ZVN1ZmZpeCA9IG5lZWRzUGx1cmFsSGFuZGxpbmdcbiAgICAgID8gdGhpcy5wbHVyYWxSZXNvbHZlci5nZXRTdWZmaXgobG5nLCBvcHQuY291bnQsIG9wdClcbiAgICAgIDogJyc7XG4gICAgY29uc3QgZGVmYXVsdFZhbHVlU3VmZml4T3JkaW5hbEZhbGxiYWNrID1cbiAgICAgIG9wdC5vcmRpbmFsICYmIG5lZWRzUGx1cmFsSGFuZGxpbmdcbiAgICAgICAgPyB0aGlzLnBsdXJhbFJlc29sdmVyLmdldFN1ZmZpeChsbmcsIG9wdC5jb3VudCwgeyBvcmRpbmFsOiBmYWxzZSB9KVxuICAgICAgICA6ICcnO1xuICAgIGNvbnN0IG5lZWRzWmVyb1N1ZmZpeExvb2t1cCA9IG5lZWRzUGx1cmFsSGFuZGxpbmcgJiYgIW9wdC5vcmRpbmFsICYmIGlzWmVyb0NvdW50KG9wdC5jb3VudCk7XG4gICAgY29uc3Qgc2VwID0gdGhpcy5vcHRpb25zLnBsdXJhbFNlcGFyYXRvcjtcbiAgICAvLyBsaWtlIHRoZSBsb29rdXA6IHRoZSBwbGFpbiBkZWZhdWx0IHZhbHVlIGZpcnN0LCB0aGVuIHRoZSBcIm90aGVyXCIgZm9ybVxuICAgIGNvbnN0IG90aGVyRGVmYXVsdFZhbHVlID1cbiAgICAgIG9wdC5kZWZhdWx0VmFsdWUgPz9cbiAgICAgIChuZWVkc1BsdXJhbEhhbmRsaW5nXG4gICAgICAgID8gb3B0W2BkZWZhdWx0VmFsdWUke29wdC5vcmRpbmFsID8gYCR7c2VwfW9yZGluYWwke3NlcH1gIDogc2VwfW90aGVyYF1cbiAgICAgICAgOiB1bmRlZmluZWQpO1xuICAgIGNvbnN0IGNvdW50RGVmYXVsdFZhbHVlID1cbiAgICAgIG9wdFtgZGVmYXVsdFZhbHVlJHtkZWZhdWx0VmFsdWVTdWZmaXh9YF0gPz9cbiAgICAgIG9wdFtgZGVmYXVsdFZhbHVlJHtkZWZhdWx0VmFsdWVTdWZmaXhPcmRpbmFsRmFsbGJhY2t9YF0gPz9cbiAgICAgIG90aGVyRGVmYXVsdFZhbHVlO1xuICAgIGNvbnN0IGRlZmF1bHRWYWx1ZSA9XG4gICAgICAobmVlZHNaZXJvU3VmZml4TG9va3VwID8gb3B0W2BkZWZhdWx0VmFsdWUke3NlcH16ZXJvYF0gOiB1bmRlZmluZWQpID8/IGNvdW50RGVmYXVsdFZhbHVlO1xuXG4gICAgbGV0IHJlc0Zvck9iakhuZGwgPSByZXM7XG4gICAgaWYgKGhhbmRsZUFzT2JqZWN0SW5JMThuRm9ybWF0ICYmICFyZXMgJiYgaGFzRGVmYXVsdFZhbHVlKSB7XG4gICAgICByZXNGb3JPYmpIbmRsID0gZGVmYXVsdFZhbHVlO1xuICAgIH1cblxuICAgIGNvbnN0IGhhbmRsZUFzT2JqZWN0ID0gc2hvdWxkSGFuZGxlQXNPYmplY3QocmVzRm9yT2JqSG5kbCk7XG4gICAgY29uc3QgcmVzVHlwZSA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuYXBwbHkocmVzRm9yT2JqSG5kbCk7XG5cbiAgICBjb25zdCBpc09iamVjdEhpdCA9XG4gICAgICBoYW5kbGVBc09iamVjdEluSTE4bkZvcm1hdCAmJlxuICAgICAgcmVzRm9yT2JqSG5kbCAmJlxuICAgICAgaGFuZGxlQXNPYmplY3QgJiZcbiAgICAgICFub09iamVjdC5pbmNsdWRlcyhyZXNUeXBlKSAmJlxuICAgICAgIShpc1N0cmluZyhqb2luQXJyYXlzKSAmJiBBcnJheS5pc0FycmF5KHJlc0Zvck9iakhuZGwpKTtcbiAgICAvLyBhbiBvYmplY3Qgb3IgYXJyYXkgd2l0aG91dCByZXR1cm5PYmplY3RzOiB3aGF0IHJldHVybmVkT2JqZWN0SGFuZGxlciByZXR1cm5zLCBlbHNlIGl0IGlzIGhhbmRsZWRcbiAgICAvLyBsaWtlIGEgbWlzc2luZyBrZXkgYmVsb3cgKHRoZSBkZWZhdWx0IHZhbHVlLCBlbHNlIHRoZSBrZXkpLCB3aXRob3V0IHNhdmluZyBpdCwgYXMgdGhlIGtleSBleGlzdHNcbiAgICBjb25zdCBvYmplY3ROb3RSZXR1cm5lZCA9IGlzT2JqZWN0SGl0ICYmICFvcHQucmV0dXJuT2JqZWN0cyAmJiAhdGhpcy5vcHRpb25zLnJldHVybk9iamVjdHM7XG4gICAgaWYgKG9iamVjdE5vdFJldHVybmVkICYmIHRoaXMub3B0aW9ucy5yZXR1cm5lZE9iamVjdEhhbmRsZXIpIHtcbiAgICAgIGNvbnN0IHIgPSB0aGlzLm9wdGlvbnMucmV0dXJuZWRPYmplY3RIYW5kbGVyKHJlc1VzZWRLZXksIHJlc0Zvck9iakhuZGwsIHtcbiAgICAgICAgLi4ub3B0LFxuICAgICAgICBuczogbmFtZXNwYWNlcyxcbiAgICAgIH0pO1xuICAgICAgaWYgKHJldHVybkRldGFpbHMpIHtcbiAgICAgICAgcmVzb2x2ZWQucmVzID0gcjtcbiAgICAgICAgcmVzb2x2ZWQudXNlZFBhcmFtcyA9IHRoaXMuZ2V0VXNlZFBhcmFtc0RldGFpbHMob3B0KTtcbiAgICAgICAgcmV0dXJuIHJlc29sdmVkO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHI7XG4gICAgfVxuICAgIGlmIChvYmplY3ROb3RSZXR1cm5lZCkge1xuICAgICAgdGhpcy5sb2dnZXIud2FybignYWNjZXNzaW5nIGFuIG9iamVjdCAtIGJ1dCByZXR1cm5PYmplY3RzIG9wdGlvbnMgaXMgbm90IGVuYWJsZWQhJyk7XG4gICAgfVxuXG4gICAgaWYgKGlzT2JqZWN0SGl0ICYmICFvYmplY3ROb3RSZXR1cm5lZCkge1xuICAgICAgLy8gaWYgd2UgZ290IGEgc2VwYXJhdG9yIHdlIGxvb3Agb3ZlciBjaGlsZHJlbiAtIGVsc2Ugd2UganVzdCByZXR1cm4gb2JqZWN0IGFzIGlzXG4gICAgICAvLyBhcyBoYXZpbmcgaXQgc2V0IHRvIGZhbHNlIG1lYW5zIG5vIGhpZXJhcmNoeSBzbyBubyBsb29rdXAgZm9yIG5lc3RlZCB2YWx1ZXNcbiAgICAgIGlmIChrZXlTZXBhcmF0b3IpIHtcbiAgICAgICAgY29uc3QgcmVzVHlwZUlzQXJyYXkgPSBBcnJheS5pc0FycmF5KHJlc0Zvck9iakhuZGwpO1xuICAgICAgICBjb25zdCBjb3B5ID0gcmVzVHlwZUlzQXJyYXkgPyBbXSA6IHt9OyAvLyBhcHBseSBjaGlsZCB0cmFuc2xhdGlvbiBvbiBhIGNvcHlcblxuICAgICAgICBjb25zdCBuZXdLZXlUb1VzZSA9IHJlc1R5cGVJc0FycmF5ID8gcmVzRXhhY3RVc2VkS2V5IDogcmVzVXNlZEtleTtcbiAgICAgICAgZm9yIChjb25zdCBtIGluIHJlc0Zvck9iakhuZGwpIHtcbiAgICAgICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHJlc0Zvck9iakhuZGwsIG0pKSB7XG4gICAgICAgICAgICBjb25zdCBkZWVwS2V5ID0gYCR7bmV3S2V5VG9Vc2V9JHtrZXlTZXBhcmF0b3J9JHttfWA7XG4gICAgICAgICAgICBpZiAoaGFzRGVmYXVsdFZhbHVlICYmICFyZXMpIHtcbiAgICAgICAgICAgICAgY29weVttXSA9IHRoaXMudHJhbnNsYXRlKGRlZXBLZXksIHtcbiAgICAgICAgICAgICAgICAuLi5vcHQsXG4gICAgICAgICAgICAgICAgZGVmYXVsdFZhbHVlOiBzaG91bGRIYW5kbGVBc09iamVjdChkZWZhdWx0VmFsdWUpID8gZGVmYXVsdFZhbHVlW21dIDogdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgIC4uLnsgam9pbkFycmF5czogZmFsc2UsIG5zOiBuYW1lc3BhY2VzIH0sXG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgY29weVttXSA9IHRoaXMudHJhbnNsYXRlKGRlZXBLZXksIHtcbiAgICAgICAgICAgICAgICAuLi5vcHQsXG4gICAgICAgICAgICAgICAgLi4ueyBqb2luQXJyYXlzOiBmYWxzZSwgbnM6IG5hbWVzcGFjZXMgfSxcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoY29weVttXSA9PT0gZGVlcEtleSkgY29weVttXSA9IHJlc0Zvck9iakhuZGxbbV07IC8vIGlmIG5vdGhpbmcgZm91bmQgdXNlIG9yaWdpbmFsIHZhbHVlIGFzIGZhbGxiYWNrXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJlcyA9IGNvcHk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChoYW5kbGVBc09iamVjdEluSTE4bkZvcm1hdCAmJiBpc1N0cmluZyhqb2luQXJyYXlzKSAmJiBBcnJheS5pc0FycmF5KHJlcykpIHtcbiAgICAgIC8vIGFycmF5IHNwZWNpYWwgdHJlYXRtZW50XG4gICAgICByZXMgPSByZXMuam9pbihqb2luQXJyYXlzKTtcbiAgICAgIGlmIChyZXMpIHJlcyA9IHRoaXMuZXh0ZW5kVHJhbnNsYXRpb24ocmVzLCBrZXlzLCBvcHQsIHJlc29sdmVkLCBsYXN0S2V5KTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gc3RyaW5nLCBlbXB0eSBvciBudWxsIChvciBhbiBvYmplY3QgdGhhdCBpcyBub3QgcmV0dXJuZWQpXG4gICAgICBsZXQgdXNlZERlZmF1bHQgPSBmYWxzZTtcbiAgICAgIGxldCB1c2VkS2V5ID0gZmFsc2U7XG4gICAgICBpZiAob2JqZWN0Tm90UmV0dXJuZWQpIHJlcyA9IHVuZGVmaW5lZDtcblxuICAgICAgLy8gZmFsbGJhY2sgdmFsdWUgKGZvciBhbiBvYmplY3QgaGl0LCBub3QgYW4gb2JqZWN0IGRlZmF1bHQgdmFsdWUgZWl0aGVyKVxuICAgICAgaWYgKFxuICAgICAgICAhdGhpcy5pc1ZhbGlkTG9va3VwKHJlcykgJiZcbiAgICAgICAgaGFzRGVmYXVsdFZhbHVlICYmXG4gICAgICAgICEob2JqZWN0Tm90UmV0dXJuZWQgJiYgc2hvdWxkSGFuZGxlQXNPYmplY3QoZGVmYXVsdFZhbHVlKSlcbiAgICAgICkge1xuICAgICAgICB1c2VkRGVmYXVsdCA9IHRydWU7XG4gICAgICAgIHJlcyA9IGRlZmF1bHRWYWx1ZTtcbiAgICAgIH1cbiAgICAgIC8vIGFuIGV4cGxpY2l0ICcnIGRlZmF1bHQgZnJvbSBjb2RlIGNvdW50czogb25seSBlbXB0eSB0cmFuc2xhdGlvbnMgZmFsbCBiYWNrIChyZXR1cm5FbXB0eVN0cmluZylcbiAgICAgIGlmICghdGhpcy5pc1ZhbGlkTG9va3VwKHJlcykgJiYgISh1c2VkRGVmYXVsdCAmJiByZXMgPT09ICcnKSkge1xuICAgICAgICB1c2VkS2V5ID0gdHJ1ZTtcbiAgICAgICAgcmVzID0ga2V5O1xuICAgICAgfVxuXG4gICAgICBjb25zdCBtaXNzaW5nS2V5Tm9WYWx1ZUZhbGxiYWNrVG9LZXkgPVxuICAgICAgICBvcHQubWlzc2luZ0tleU5vVmFsdWVGYWxsYmFja1RvS2V5IHx8IHRoaXMub3B0aW9ucy5taXNzaW5nS2V5Tm9WYWx1ZUZhbGxiYWNrVG9LZXk7XG4gICAgICBjb25zdCByZXNGb3JNaXNzaW5nID0gbWlzc2luZ0tleU5vVmFsdWVGYWxsYmFja1RvS2V5ICYmIHVzZWRLZXkgPyB1bmRlZmluZWQgOiByZXM7XG5cbiAgICAgIC8vIHNhdmUgbWlzc2luZ1xuICAgICAgY29uc3QgdXBkYXRlTWlzc2luZyA9IGhhc0RlZmF1bHRWYWx1ZSAmJiBkZWZhdWx0VmFsdWUgIT09IHJlcyAmJiB0aGlzLm9wdGlvbnMudXBkYXRlTWlzc2luZztcbiAgICAgIGlmICghb2JqZWN0Tm90UmV0dXJuZWQgJiYgKHVzZWRLZXkgfHwgdXNlZERlZmF1bHQgfHwgdXBkYXRlTWlzc2luZykpIHtcbiAgICAgICAgdGhpcy5sb2dnZXIubG9nKFxuICAgICAgICAgIHVwZGF0ZU1pc3NpbmcgPyAndXBkYXRlS2V5JyA6ICdtaXNzaW5nS2V5JyxcbiAgICAgICAgICBsbmcsXG4gICAgICAgICAgbmFtZXNwYWNlLFxuICAgICAgICAgIG5lZWRzUGx1cmFsSGFuZGxpbmcgJiYgIXVwZGF0ZU1pc3NpbmdcbiAgICAgICAgICAgID8gYCR7a2V5fSR7dGhpcy5wbHVyYWxSZXNvbHZlci5nZXRTdWZmaXgobG5nLCBvcHQuY291bnQsIG9wdCl9YFxuICAgICAgICAgICAgOiBrZXksXG4gICAgICAgICAgdXBkYXRlTWlzc2luZyA/IGRlZmF1bHRWYWx1ZSA6IHJlcyxcbiAgICAgICAgKTtcbiAgICAgICAgaWYgKGtleVNlcGFyYXRvcikge1xuICAgICAgICAgIGNvbnN0IGZrID0gdGhpcy5yZXNvbHZlKGtleSwgeyAuLi5vcHQsIGtleVNlcGFyYXRvcjogZmFsc2UgfSk7XG4gICAgICAgICAgaWYgKGZrICYmIGZrLnJlcylcbiAgICAgICAgICAgIHRoaXMubG9nZ2VyLndhcm4oXG4gICAgICAgICAgICAgICdTZWVtcyB0aGUgbG9hZGVkIHRyYW5zbGF0aW9ucyB3ZXJlIGluIGZsYXQgSlNPTiBmb3JtYXQgaW5zdGVhZCBvZiBuZXN0ZWQuIEVpdGhlciBzZXQga2V5U2VwYXJhdG9yOiBmYWxzZSBvbiBpbml0IG9yIG1ha2Ugc3VyZSB5b3VyIHRyYW5zbGF0aW9ucyBhcmUgcHVibGlzaGVkIGluIG5lc3RlZCBmb3JtYXQuJyxcbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgbG5ncyA9IFtdO1xuICAgICAgICBjb25zdCBmYWxsYmFja0xuZ3MgPSB0aGlzLmxhbmd1YWdlVXRpbHMuZ2V0RmFsbGJhY2tDb2RlcyhcbiAgICAgICAgICB0aGlzLm9wdGlvbnMuZmFsbGJhY2tMbmcsXG4gICAgICAgICAgb3B0LmxuZyB8fCB0aGlzLmxhbmd1YWdlLFxuICAgICAgICApO1xuICAgICAgICBpZiAodGhpcy5vcHRpb25zLnNhdmVNaXNzaW5nVG8gPT09ICdmYWxsYmFjaycgJiYgZmFsbGJhY2tMbmdzICYmIGZhbGxiYWNrTG5nc1swXSkge1xuICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZmFsbGJhY2tMbmdzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBsbmdzLnB1c2goZmFsbGJhY2tMbmdzW2ldKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5vcHRpb25zLnNhdmVNaXNzaW5nVG8gPT09ICdhbGwnKSB7XG4gICAgICAgICAgbG5ncyA9IHRoaXMubGFuZ3VhZ2VVdGlscy50b1Jlc29sdmVIaWVyYXJjaHkob3B0LmxuZyB8fCB0aGlzLmxhbmd1YWdlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBsbmdzLnB1c2gob3B0LmxuZyB8fCB0aGlzLmxhbmd1YWdlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHNlbmQgPSAobCwgaywgc3BlY2lmaWNEZWZhdWx0VmFsdWUpID0+IHtcbiAgICAgICAgICBjb25zdCBkZWZhdWx0Rm9yTWlzc2luZyA9XG4gICAgICAgICAgICBoYXNEZWZhdWx0VmFsdWUgJiYgc3BlY2lmaWNEZWZhdWx0VmFsdWUgIT09IHJlcyA/IHNwZWNpZmljRGVmYXVsdFZhbHVlIDogcmVzRm9yTWlzc2luZztcbiAgICAgICAgICBpZiAodGhpcy5vcHRpb25zLm1pc3NpbmdLZXlIYW5kbGVyKSB7XG4gICAgICAgICAgICB0aGlzLm9wdGlvbnMubWlzc2luZ0tleUhhbmRsZXIobCwgbmFtZXNwYWNlLCBrLCBkZWZhdWx0Rm9yTWlzc2luZywgdXBkYXRlTWlzc2luZywgb3B0KTtcbiAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMuYmFja2VuZENvbm5lY3Rvcj8uc2F2ZU1pc3NpbmcpIHtcbiAgICAgICAgICAgIHRoaXMuYmFja2VuZENvbm5lY3Rvci5zYXZlTWlzc2luZyhcbiAgICAgICAgICAgICAgbCxcbiAgICAgICAgICAgICAgbmFtZXNwYWNlLFxuICAgICAgICAgICAgICBrLFxuICAgICAgICAgICAgICBkZWZhdWx0Rm9yTWlzc2luZyxcbiAgICAgICAgICAgICAgdXBkYXRlTWlzc2luZyxcbiAgICAgICAgICAgICAgb3B0LFxuICAgICAgICAgICAgICB1bmRlZmluZWQsXG4gICAgICAgICAgICAgIHRoaXMudXRpbHM/Lmhhc0xvYWRlZE5hbWVzcGFjZSxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHRoaXMuZW1pdCgnbWlzc2luZ0tleScsIGwsIG5hbWVzcGFjZSwgaywgcmVzKTtcbiAgICAgICAgfTtcblxuICAgICAgICBpZiAodGhpcy5vcHRpb25zLnNhdmVNaXNzaW5nKSB7XG4gICAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5zYXZlTWlzc2luZ1BsdXJhbHMgJiYgbmVlZHNQbHVyYWxIYW5kbGluZykge1xuICAgICAgICAgICAgbG5ncy5mb3JFYWNoKChsYW5ndWFnZSkgPT4ge1xuICAgICAgICAgICAgICBjb25zdCBzdWZmaXhlcyA9IHRoaXMucGx1cmFsUmVzb2x2ZXIuZ2V0U3VmZml4ZXMobGFuZ3VhZ2UsIG9wdCk7XG4gICAgICAgICAgICAgIGNvbnN0IHplcm9EZWZhdWx0VmFsdWUgPSBvcHRbYGRlZmF1bHRWYWx1ZSR7c2VwfXplcm9gXTtcblxuICAgICAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAgICAgbmVlZHNaZXJvU3VmZml4TG9va3VwICYmXG4gICAgICAgICAgICAgICAgemVyb0RlZmF1bHRWYWx1ZSAhPT0gdW5kZWZpbmVkICYmXG4gICAgICAgICAgICAgICAgemVyb0RlZmF1bHRWYWx1ZSAhPT0gbnVsbCAmJlxuICAgICAgICAgICAgICAgICFzdWZmaXhlcy5pbmNsdWRlcyhgJHtzZXB9emVyb2ApXG4gICAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICAgIHN1ZmZpeGVzLnB1c2goYCR7c2VwfXplcm9gKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAvLyBhIGZvcm0gd2l0aG91dCBpdHMgb3duIGRlZmF1bHQ6IHRoZSBmb3JtIGZvciB0aGUgY291bnQgZ2V0cyB3aGF0IHQoKSByZXNvbHZlZFxuICAgICAgICAgICAgICAvLyBmb3IgaXQsIHRoZSBvdGhlcnMgdGhlIHBsYWluIG9yIFwib3RoZXJcIiBkZWZhdWx0ICh0aGUgemVybyBkZWZhdWx0IHN0YXlzIGluIF96ZXJvKVxuICAgICAgICAgICAgICBzdWZmaXhlcy5mb3JFYWNoKChzdWZmaXgpID0+IHtcbiAgICAgICAgICAgICAgICBzZW5kKFxuICAgICAgICAgICAgICAgICAgW2xhbmd1YWdlXSxcbiAgICAgICAgICAgICAgICAgIGtleSArIHN1ZmZpeCxcbiAgICAgICAgICAgICAgICAgIG9wdFtgZGVmYXVsdFZhbHVlJHtzdWZmaXh9YF0gPz9cbiAgICAgICAgICAgICAgICAgICAgKHN1ZmZpeCA9PT0gZGVmYXVsdFZhbHVlU3VmZml4ID8gY291bnREZWZhdWx0VmFsdWUgOiBvdGhlckRlZmF1bHRWYWx1ZSkgPz9cbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdFZhbHVlLFxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHNlbmQobG5ncywga2V5LCBkZWZhdWx0VmFsdWUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBleHRlbmRcbiAgICAgIHJlcyA9IHRoaXMuZXh0ZW5kVHJhbnNsYXRpb24ocmVzLCBrZXlzLCBvcHQsIHJlc29sdmVkLCBsYXN0S2V5KTtcblxuICAgICAgLy8gYXBwZW5kIG5hbWVzcGFjZSBpZiBzdGlsbCBrZXlcbiAgICAgIGlmICh1c2VkS2V5ICYmIHJlcyA9PT0ga2V5ICYmIHRoaXMub3B0aW9ucy5hcHBlbmROYW1lc3BhY2VUb01pc3NpbmdLZXkpIHtcbiAgICAgICAgcmVzID0gYCR7bmFtZXNwYWNlfSR7bnNTZXBhcmF0b3J9JHtrZXl9YDtcbiAgICAgIH1cblxuICAgICAgLy8gcGFyc2VNaXNzaW5nS2V5SGFuZGxlclxuICAgICAgaWYgKCh1c2VkS2V5IHx8IHVzZWREZWZhdWx0KSAmJiB0aGlzLm9wdGlvbnMucGFyc2VNaXNzaW5nS2V5SGFuZGxlcikge1xuICAgICAgICByZXMgPSB0aGlzLm9wdGlvbnMucGFyc2VNaXNzaW5nS2V5SGFuZGxlcihcbiAgICAgICAgICB0aGlzLm9wdGlvbnMuYXBwZW5kTmFtZXNwYWNlVG9NaXNzaW5nS2V5ID8gYCR7bmFtZXNwYWNlfSR7bnNTZXBhcmF0b3J9JHtrZXl9YCA6IGtleSxcbiAgICAgICAgICB1c2VkRGVmYXVsdCA/IHJlcyA6IHVuZGVmaW5lZCxcbiAgICAgICAgICBvcHQsXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gcmV0dXJuXG4gICAgaWYgKHJldHVybkRldGFpbHMpIHtcbiAgICAgIHJlc29sdmVkLnJlcyA9IHJlcztcbiAgICAgIHJlc29sdmVkLnVzZWRQYXJhbXMgPSB0aGlzLmdldFVzZWRQYXJhbXNEZXRhaWxzKG9wdCk7XG4gICAgICByZXR1cm4gcmVzb2x2ZWQ7XG4gICAgfVxuICAgIHJldHVybiByZXM7XG4gIH1cblxuICBleHRlbmRUcmFuc2xhdGlvbihyZXMsIGtleSwgb3B0LCByZXNvbHZlZCwgbGFzdEtleSkge1xuICAgIGlmICh0aGlzLmkxOG5Gb3JtYXQ/LnBhcnNlKSB7XG4gICAgICByZXMgPSB0aGlzLmkxOG5Gb3JtYXQucGFyc2UoXG4gICAgICAgIHJlcyxcbiAgICAgICAgeyAuLi50aGlzLm9wdGlvbnMuaW50ZXJwb2xhdGlvbi5kZWZhdWx0VmFyaWFibGVzLCAuLi5vcHQgfSxcbiAgICAgICAgb3B0LmxuZyB8fCB0aGlzLmxhbmd1YWdlIHx8IHJlc29sdmVkLnVzZWRMbmcsXG4gICAgICAgIHJlc29sdmVkLnVzZWROUyxcbiAgICAgICAgcmVzb2x2ZWQudXNlZEtleSxcbiAgICAgICAgeyByZXNvbHZlZCB9LFxuICAgICAgKTtcbiAgICB9IGVsc2UgaWYgKCFvcHQuc2tpcEludGVycG9sYXRpb24pIHtcbiAgICAgIC8vIGkxOG5leHQucGFyc2luZ1xuICAgICAgaWYgKG9wdC5pbnRlcnBvbGF0aW9uKVxuICAgICAgICB0aGlzLmludGVycG9sYXRvci5pbml0KHtcbiAgICAgICAgICAuLi5vcHQsXG4gICAgICAgICAgLi4ueyBpbnRlcnBvbGF0aW9uOiB7IC4uLnRoaXMub3B0aW9ucy5pbnRlcnBvbGF0aW9uLCAuLi5vcHQuaW50ZXJwb2xhdGlvbiB9IH0sXG4gICAgICAgIH0pO1xuICAgICAgY29uc3Qgc2tpcE9uVmFyaWFibGVzID1cbiAgICAgICAgaXNTdHJpbmcocmVzKSAmJlxuICAgICAgICAob3B0Py5pbnRlcnBvbGF0aW9uPy5za2lwT25WYXJpYWJsZXMgIT09IHVuZGVmaW5lZFxuICAgICAgICAgID8gb3B0LmludGVycG9sYXRpb24uc2tpcE9uVmFyaWFibGVzXG4gICAgICAgICAgOiB0aGlzLm9wdGlvbnMuaW50ZXJwb2xhdGlvbi5za2lwT25WYXJpYWJsZXMpO1xuICAgICAgbGV0IG5lc3RCZWY7XG4gICAgICBpZiAoc2tpcE9uVmFyaWFibGVzKSB7XG4gICAgICAgIGNvbnN0IG5iID0gcmVzLmluY2x1ZGVzKHRoaXMuaW50ZXJwb2xhdG9yLm5lc3RpbmdQcmVmaXhUZXh0KVxuICAgICAgICAgID8gcmVzLm1hdGNoKHRoaXMuaW50ZXJwb2xhdG9yLm5lc3RpbmdSZWdleHApXG4gICAgICAgICAgOiBudWxsO1xuICAgICAgICAvLyBoYXMgbmVzdGluZyBhZnRiZWZvcmVlciBpbnRlcnBvbGF0aW9uXG4gICAgICAgIG5lc3RCZWYgPSBuYiAmJiBuYi5sZW5ndGg7XG4gICAgICB9XG5cbiAgICAgIC8vIGludGVycG9sYXRlXG4gICAgICBsZXQgZGF0YSA9IG9wdC5yZXBsYWNlICYmICFpc1N0cmluZyhvcHQucmVwbGFjZSkgPyBvcHQucmVwbGFjZSA6IG9wdDtcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMuaW50ZXJwb2xhdGlvbi5kZWZhdWx0VmFyaWFibGVzKVxuICAgICAgICBkYXRhID0geyAuLi50aGlzLm9wdGlvbnMuaW50ZXJwb2xhdGlvbi5kZWZhdWx0VmFyaWFibGVzLCAuLi5kYXRhIH07XG4gICAgICByZXMgPSB0aGlzLmludGVycG9sYXRvci5pbnRlcnBvbGF0ZShcbiAgICAgICAgcmVzLFxuICAgICAgICBkYXRhLFxuICAgICAgICBvcHQubG5nIHx8IHRoaXMubGFuZ3VhZ2UgfHwgcmVzb2x2ZWQudXNlZExuZyxcbiAgICAgICAgb3B0LFxuICAgICAgKTtcblxuICAgICAgLy8gbmVzdGluZ1xuICAgICAgaWYgKHNraXBPblZhcmlhYmxlcykge1xuICAgICAgICBjb25zdCBuYSA9IHJlcy5pbmNsdWRlcyh0aGlzLmludGVycG9sYXRvci5uZXN0aW5nUHJlZml4VGV4dClcbiAgICAgICAgICA/IHJlcy5tYXRjaCh0aGlzLmludGVycG9sYXRvci5uZXN0aW5nUmVnZXhwKVxuICAgICAgICAgIDogbnVsbDtcbiAgICAgICAgLy8gaGFzIG5lc3RpbmcgYWZ0ZXIgaW50ZXJwb2xhdGlvblxuICAgICAgICBjb25zdCBuZXN0QWZ0ID0gbmEgJiYgbmEubGVuZ3RoO1xuICAgICAgICBpZiAobmVzdEJlZiA8IG5lc3RBZnQpIG9wdC5uZXN0ID0gZmFsc2U7XG4gICAgICB9XG4gICAgICBpZiAoIW9wdC5sbmcgJiYgcmVzb2x2ZWQgJiYgcmVzb2x2ZWQucmVzKSBvcHQubG5nID0gdGhpcy5sYW5ndWFnZSB8fCByZXNvbHZlZC51c2VkTG5nO1xuICAgICAgaWYgKG9wdC5uZXN0ICE9PSBmYWxzZSlcbiAgICAgICAgcmVzID0gdGhpcy5pbnRlcnBvbGF0b3IubmVzdChcbiAgICAgICAgICByZXMsXG4gICAgICAgICAgKC4uLmFyZ3MpID0+IHtcbiAgICAgICAgICAgIGlmIChsYXN0S2V5Py5bMF0gPT09IGFyZ3NbMF0gJiYgIW9wdC5jb250ZXh0KSB7XG4gICAgICAgICAgICAgIHRoaXMubG9nZ2VyLndhcm4oXG4gICAgICAgICAgICAgICAgYEl0IHNlZW1zIHlvdSBhcmUgbmVzdGluZyByZWN1cnNpdmVseSBrZXk6ICR7YXJnc1swXX0gaW4ga2V5OiAke2tleVswXX1gLFxuICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzLnRyYW5zbGF0ZSguLi5hcmdzLCBrZXkpO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgb3B0LFxuICAgICAgICApO1xuXG4gICAgICBpZiAob3B0LmludGVycG9sYXRpb24pIHRoaXMuaW50ZXJwb2xhdG9yLnJlc2V0KCk7XG4gICAgfVxuXG4gICAgLy8gcG9zdCBwcm9jZXNzXG4gICAgY29uc3QgcG9zdFByb2Nlc3MgPSBvcHQucG9zdFByb2Nlc3MgfHwgdGhpcy5vcHRpb25zLnBvc3RQcm9jZXNzO1xuICAgIGNvbnN0IHBvc3RQcm9jZXNzb3JOYW1lcyA9IGlzU3RyaW5nKHBvc3RQcm9jZXNzKSA/IFtwb3N0UHJvY2Vzc10gOiBwb3N0UHJvY2VzcztcblxuICAgIGlmIChyZXMgIT0gbnVsbCAmJiBwb3N0UHJvY2Vzc29yTmFtZXM/Lmxlbmd0aCAmJiBvcHQuYXBwbHlQb3N0UHJvY2Vzc29yICE9PSBmYWxzZSkge1xuICAgICAgY29uc3QgcHBPcHRpb25zID0gdGhpcy5vcHRpb25zPy5wb3N0UHJvY2Vzc1Bhc3NSZXNvbHZlZFxuICAgICAgICA/IHsgaTE4blJlc29sdmVkOiB7IC4uLnJlc29sdmVkLCB1c2VkUGFyYW1zOiB0aGlzLmdldFVzZWRQYXJhbXNEZXRhaWxzKG9wdCkgfSwgLi4ub3B0IH1cbiAgICAgICAgOiBvcHQ7XG4gICAgICAvLyB0aGUgcG9zdC1wcm9jZXNzb3JzIHJlZ2lzdGVyZWQgd2l0aCB1c2UoKSBvbiB0aGlzIGluc3RhbmNlIChvciB0aGUgcGFyZW50IG9mIGEgY2xvbmUpXG4gICAgICBwb3N0UHJvY2Vzc29yTmFtZXMuZm9yRWFjaCgobmFtZSkgPT4ge1xuICAgICAgICBjb25zdCBwcm9jZXNzb3IgPSB0aGlzLnBvc3RQcm9jZXNzb3JzPy5bbmFtZV07XG4gICAgICAgIGlmICghcHJvY2Vzc29yKSB7XG4gICAgICAgICAgdGhpcy5sb2dnZXIub25jZShcbiAgICAgICAgICAgIGBwb3N0UHJvY2Vzczoke25hbWV9YCxcbiAgICAgICAgICAgICd3YXJuJyxcbiAgICAgICAgICAgIGBwb3N0UHJvY2VzczogJyR7bmFtZX0nIGlzIG5vdCByZWdpc3RlcmVkIG9uIHRoaXMgaTE4bmV4dCBpbnN0YW5jZTsgY2FsbCB1c2UoKSB3aXRoIGl0IG9uIHRoaXMgaW5zdGFuY2VgLFxuICAgICAgICAgICk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHJlcyA9IHByb2Nlc3Nvci5wcm9jZXNzKHJlcywga2V5LCBwcE9wdGlvbnMsIHRoaXMpID8/IHJlcztcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybiByZXM7XG4gIH1cblxuICByZXNvbHZlKGtleXMsIG9wdCA9IHt9KSB7XG4gICAgbGV0IGZvdW5kO1xuICAgIGxldCB1c2VkS2V5OyAvLyBwbGFpbiBrZXlcbiAgICBsZXQgZXhhY3RVc2VkS2V5OyAvLyBrZXkgd2l0aCBjb250ZXh0IC8gcGx1cmFsXG4gICAgbGV0IHVzZWRMbmc7XG4gICAgbGV0IHVzZWROUztcblxuICAgIGlmIChpc1N0cmluZyhrZXlzKSkga2V5cyA9IFtrZXlzXTtcbiAgICBpZiAoQXJyYXkuaXNBcnJheShrZXlzKSlcbiAgICAgIGtleXMgPSBrZXlzLm1hcCgoaykgPT5cbiAgICAgICAgdHlwZW9mIGsgPT09ICdmdW5jdGlvbicgPyBrZXlzRnJvbVNlbGVjdG9yKGssIHsgLi4udGhpcy5vcHRpb25zLCAuLi5vcHQgfSkgOiBrLFxuICAgICAgKTtcblxuICAgIC8vIGZvckVhY2ggcG9zc2libGUga2V5XG4gICAga2V5cy5mb3JFYWNoKChrKSA9PiB7XG4gICAgICBpZiAodGhpcy5pc1ZhbGlkTG9va3VwKGZvdW5kKSkgcmV0dXJuO1xuICAgICAgY29uc3QgZXh0cmFjdGVkID0gdGhpcy5leHRyYWN0RnJvbUtleShrLCBvcHQpO1xuICAgICAgY29uc3Qga2V5ID0gZXh0cmFjdGVkLmtleTtcbiAgICAgIHVzZWRLZXkgPSBrZXk7XG4gICAgICBsZXQgbmFtZXNwYWNlcyA9IGV4dHJhY3RlZC5uYW1lc3BhY2VzO1xuICAgICAgaWYgKHRoaXMub3B0aW9ucy5mYWxsYmFja05TKSBuYW1lc3BhY2VzID0gbmFtZXNwYWNlcy5jb25jYXQodGhpcy5vcHRpb25zLmZhbGxiYWNrTlMpO1xuXG4gICAgICBjb25zdCBuZWVkc1BsdXJhbEhhbmRsaW5nID0gb3B0LmNvdW50ICE9PSB1bmRlZmluZWQgJiYgIWlzU3RyaW5nKG9wdC5jb3VudCk7XG4gICAgICBjb25zdCBuZWVkc1plcm9TdWZmaXhMb29rdXAgPSBuZWVkc1BsdXJhbEhhbmRsaW5nICYmICFvcHQub3JkaW5hbCAmJiBpc1plcm9Db3VudChvcHQuY291bnQpO1xuICAgICAgY29uc3QgbmVlZHNDb250ZXh0SGFuZGxpbmcgPVxuICAgICAgICBvcHQuY29udGV4dCAhPT0gdW5kZWZpbmVkICYmXG4gICAgICAgIChpc1N0cmluZyhvcHQuY29udGV4dCkgfHwgdHlwZW9mIG9wdC5jb250ZXh0ID09PSAnbnVtYmVyJykgJiZcbiAgICAgICAgb3B0LmNvbnRleHQgIT09ICcnO1xuXG4gICAgICBjb25zdCBjb2RlcyA9IG9wdC5sbmdzXG4gICAgICAgID8gb3B0LmxuZ3NcbiAgICAgICAgOiB0aGlzLmxhbmd1YWdlVXRpbHMudG9SZXNvbHZlSGllcmFyY2h5KG9wdC5sbmcgfHwgdGhpcy5sYW5ndWFnZSwgb3B0LmZhbGxiYWNrTG5nKTtcblxuICAgICAgbmFtZXNwYWNlcy5mb3JFYWNoKChucykgPT4ge1xuICAgICAgICBpZiAodGhpcy5pc1ZhbGlkTG9va3VwKGZvdW5kKSkgcmV0dXJuO1xuICAgICAgICB1c2VkTlMgPSBucztcblxuICAgICAgICBpZiAoXG4gICAgICAgICAgIXRoaXMuY2hlY2tlZExvYWRlZEZvcltgJHtjb2Rlc1swXX0tJHtuc31gXSAmJlxuICAgICAgICAgIHRoaXMudXRpbHM/Lmhhc0xvYWRlZE5hbWVzcGFjZSAmJlxuICAgICAgICAgICF0aGlzLnV0aWxzPy5oYXNMb2FkZWROYW1lc3BhY2UodXNlZE5TKVxuICAgICAgICApIHtcbiAgICAgICAgICB0aGlzLmNoZWNrZWRMb2FkZWRGb3JbYCR7Y29kZXNbMF19LSR7bnN9YF0gPSB0cnVlO1xuICAgICAgICAgIHRoaXMubG9nZ2VyLndhcm4oXG4gICAgICAgICAgICBga2V5IFwiJHt1c2VkS2V5fVwiIGZvciBsYW5ndWFnZXMgXCIke2NvZGVzLmpvaW4oXG4gICAgICAgICAgICAgICcsICcsXG4gICAgICAgICAgICApfVwiIHdvbid0IGdldCByZXNvbHZlZCBhcyBuYW1lc3BhY2UgXCIke3VzZWROU31cIiB3YXMgbm90IHlldCBsb2FkZWRgLFxuICAgICAgICAgICAgJ1RoaXMgbWVhbnMgc29tZXRoaW5nIElTIFdST05HIGluIHlvdXIgc2V0dXAuIFlvdSBhY2Nlc3MgdGhlIHQgZnVuY3Rpb24gYmVmb3JlIGkxOG5leHQuaW5pdCAvIGkxOG5leHQubG9hZE5hbWVzcGFjZSAvIGkxOG5leHQuY2hhbmdlTGFuZ3VhZ2Ugd2FzIGRvbmUuIFdhaXQgZm9yIHRoZSBjYWxsYmFjayBvciBQcm9taXNlIHRvIHJlc29sdmUgYmVmb3JlIGFjY2Vzc2luZyBpdCEhIScsXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvZGVzLmZvckVhY2goKGNvZGUpID0+IHtcbiAgICAgICAgICBpZiAodGhpcy5pc1ZhbGlkTG9va3VwKGZvdW5kKSkgcmV0dXJuO1xuICAgICAgICAgIHVzZWRMbmcgPSBjb2RlO1xuXG4gICAgICAgICAgY29uc3QgZmluYWxLZXlzID0gW2tleV07XG5cbiAgICAgICAgICBpZiAodGhpcy5pMThuRm9ybWF0Py5hZGRMb29rdXBLZXlzKSB7XG4gICAgICAgICAgICB0aGlzLmkxOG5Gb3JtYXQuYWRkTG9va3VwS2V5cyhmaW5hbEtleXMsIGtleSwgY29kZSwgbnMsIG9wdCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxldCBwbHVyYWxTdWZmaXg7XG4gICAgICAgICAgICBpZiAobmVlZHNQbHVyYWxIYW5kbGluZylcbiAgICAgICAgICAgICAgcGx1cmFsU3VmZml4ID0gdGhpcy5wbHVyYWxSZXNvbHZlci5nZXRTdWZmaXgoY29kZSwgb3B0LmNvdW50LCBvcHQpO1xuICAgICAgICAgICAgY29uc3QgemVyb1N1ZmZpeCA9IGAke3RoaXMub3B0aW9ucy5wbHVyYWxTZXBhcmF0b3J9emVyb2A7XG4gICAgICAgICAgICBjb25zdCBvcmRpbmFsUHJlZml4ID0gYCR7dGhpcy5vcHRpb25zLnBsdXJhbFNlcGFyYXRvcn1vcmRpbmFsJHt0aGlzLm9wdGlvbnMucGx1cmFsU2VwYXJhdG9yfWA7XG4gICAgICAgICAgICAvLyBnZXQga2V5IGZvciBwbHVyYWwgaWYgbmVlZGVkXG4gICAgICAgICAgICBpZiAobmVlZHNQbHVyYWxIYW5kbGluZykge1xuICAgICAgICAgICAgICBpZiAob3B0Lm9yZGluYWwgJiYgcGx1cmFsU3VmZml4LnN0YXJ0c1dpdGgob3JkaW5hbFByZWZpeCkpIHtcbiAgICAgICAgICAgICAgICBmaW5hbEtleXMucHVzaChcbiAgICAgICAgICAgICAgICAgIGtleSArIHBsdXJhbFN1ZmZpeC5yZXBsYWNlKG9yZGluYWxQcmVmaXgsIHRoaXMub3B0aW9ucy5wbHVyYWxTZXBhcmF0b3IpLFxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgZmluYWxLZXlzLnB1c2goa2V5ICsgcGx1cmFsU3VmZml4KTtcbiAgICAgICAgICAgICAgaWYgKG5lZWRzWmVyb1N1ZmZpeExvb2t1cCkge1xuICAgICAgICAgICAgICAgIGZpbmFsS2V5cy5wdXNoKGtleSArIHplcm9TdWZmaXgpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIGdldCBrZXkgZm9yIGNvbnRleHQgaWYgbmVlZGVkXG4gICAgICAgICAgICBpZiAobmVlZHNDb250ZXh0SGFuZGxpbmcpIHtcbiAgICAgICAgICAgICAgY29uc3QgY29udGV4dEtleSA9IGAke2tleX0ke3RoaXMub3B0aW9ucy5jb250ZXh0U2VwYXJhdG9yIHx8ICdfJ30ke29wdC5jb250ZXh0fWA7XG4gICAgICAgICAgICAgIGZpbmFsS2V5cy5wdXNoKGNvbnRleHRLZXkpO1xuXG4gICAgICAgICAgICAgIC8vIGdldCBrZXkgZm9yIGNvbnRleHQgKyBwbHVyYWwgaWYgbmVlZGVkXG4gICAgICAgICAgICAgIGlmIChuZWVkc1BsdXJhbEhhbmRsaW5nKSB7XG4gICAgICAgICAgICAgICAgaWYgKG9wdC5vcmRpbmFsICYmIHBsdXJhbFN1ZmZpeC5zdGFydHNXaXRoKG9yZGluYWxQcmVmaXgpKSB7XG4gICAgICAgICAgICAgICAgICBmaW5hbEtleXMucHVzaChcbiAgICAgICAgICAgICAgICAgICAgY29udGV4dEtleSArIHBsdXJhbFN1ZmZpeC5yZXBsYWNlKG9yZGluYWxQcmVmaXgsIHRoaXMub3B0aW9ucy5wbHVyYWxTZXBhcmF0b3IpLFxuICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZmluYWxLZXlzLnB1c2goY29udGV4dEtleSArIHBsdXJhbFN1ZmZpeCk7XG4gICAgICAgICAgICAgICAgaWYgKG5lZWRzWmVyb1N1ZmZpeExvb2t1cCkge1xuICAgICAgICAgICAgICAgICAgZmluYWxLZXlzLnB1c2goY29udGV4dEtleSArIHplcm9TdWZmaXgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBsYXN0IGluIHRoaXMgbGFuZ3VhZ2U6IHRoZSBcIm90aGVyXCIgZm9ybSwgYXMgaW4gQ0xEUidzIGxhdGVyYWwgaW5oZXJpdGFuY2UgKGEgbWlzc2luZyBwbHVyYWxcbiAgICAgICAgICAgIC8vIGNhdGVnb3J5IGZhbGxzIGJhY2sgdG8gXCJvdGhlclwiIGJlZm9yZSB0aGUgcGFyZW50IGxvY2FsZSkuIEFmdGVyIHRoZSBwbGFpbiBrZXksIHNvIGBrZXlgICtcbiAgICAgICAgICAgIC8vIGBrZXlfb3RoZXJgIHN0aWxsIHJlc29sdmVzIGBrZXlgOyBiZWZvcmUgdGhlIG5leHQgZmFsbGJhY2sgbGFuZ3VhZ2UuXG4gICAgICAgICAgICBpZiAobmVlZHNQbHVyYWxIYW5kbGluZykge1xuICAgICAgICAgICAgICBjb25zdCBvdGhlclN1ZmZpeCA9IGAke29wdC5vcmRpbmFsID8gb3JkaW5hbFByZWZpeCA6IHRoaXMub3B0aW9ucy5wbHVyYWxTZXBhcmF0b3J9b3RoZXJgO1xuICAgICAgICAgICAgICBpZiAocGx1cmFsU3VmZml4ICE9PSBvdGhlclN1ZmZpeCkge1xuICAgICAgICAgICAgICAgIGlmIChuZWVkc0NvbnRleHRIYW5kbGluZykge1xuICAgICAgICAgICAgICAgICAgZmluYWxLZXlzLnVuc2hpZnQoXG4gICAgICAgICAgICAgICAgICAgIGAke2tleX0ke3RoaXMub3B0aW9ucy5jb250ZXh0U2VwYXJhdG9yIHx8ICdfJ30ke29wdC5jb250ZXh0fSR7b3RoZXJTdWZmaXh9YCxcbiAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGZpbmFsS2V5cy51bnNoaWZ0KGtleSArIG90aGVyU3VmZml4KTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIGl0ZXJhdGUgb3ZlciBmaW5hbEtleXMgc3RhcnRpbmcgd2l0aCBtb3N0IHNwZWNpZmljIHBsdXJhbGtleSAoLT4gY29udGV4dGtleSBvbmx5KSAtPiBzaW5ndWxhcmtleSBvbmx5XG4gICAgICAgICAgbGV0IHBvc3NpYmxlS2V5O1xuICAgICAgICAgIHdoaWxlICgocG9zc2libGVLZXkgPSBmaW5hbEtleXMucG9wKCkpKSB7XG4gICAgICAgICAgICBpZiAoIXRoaXMuaXNWYWxpZExvb2t1cChmb3VuZCkpIHtcbiAgICAgICAgICAgICAgZXhhY3RVc2VkS2V5ID0gcG9zc2libGVLZXk7XG4gICAgICAgICAgICAgIGZvdW5kID0gdGhpcy5nZXRSZXNvdXJjZShjb2RlLCBucywgcG9zc2libGVLZXksIG9wdCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHsgcmVzOiBmb3VuZCwgdXNlZEtleSwgZXhhY3RVc2VkS2V5LCB1c2VkTG5nLCB1c2VkTlMgfTtcbiAgfVxuXG4gIGlzVmFsaWRMb29rdXAocmVzKSB7XG4gICAgcmV0dXJuIChcbiAgICAgIHJlcyAhPT0gdW5kZWZpbmVkICYmXG4gICAgICAhKCF0aGlzLm9wdGlvbnMucmV0dXJuTnVsbCAmJiByZXMgPT09IG51bGwpICYmXG4gICAgICAhKCF0aGlzLm9wdGlvbnMucmV0dXJuRW1wdHlTdHJpbmcgJiYgcmVzID09PSAnJylcbiAgICApO1xuICB9XG5cbiAgZ2V0UmVzb3VyY2UoY29kZSwgbnMsIGtleSwgb3B0aW9ucyA9IHt9KSB7XG4gICAgaWYgKHRoaXMuaTE4bkZvcm1hdD8uZ2V0UmVzb3VyY2UpIHJldHVybiB0aGlzLmkxOG5Gb3JtYXQuZ2V0UmVzb3VyY2UoY29kZSwgbnMsIGtleSwgb3B0aW9ucyk7XG4gICAgcmV0dXJuIHRoaXMucmVzb3VyY2VTdG9yZS5nZXRSZXNvdXJjZShjb2RlLCBucywga2V5LCBvcHRpb25zKTtcbiAgfVxuXG4gIGdldFVzZWRQYXJhbXNEZXRhaWxzKG9wdGlvbnMgPSB7fSkge1xuICAgIC8vIHdlIG5lZWQgdG8gcmVtZW1iZXIgdG8gZXh0ZW5kIHRoaXMgYXJyYXkgd2hlbmV2ZXIgbmV3IG9wdGlvbiBwcm9wZXJ0aWVzIGFyZSBhZGRlZFxuICAgIGNvbnN0IG9wdGlvbnNLZXlzID0gW1xuICAgICAgJ2RlZmF1bHRWYWx1ZScsXG4gICAgICAnb3JkaW5hbCcsXG4gICAgICAnY29udGV4dCcsXG4gICAgICAncmVwbGFjZScsXG4gICAgICAnbG5nJyxcbiAgICAgICdsbmdzJyxcbiAgICAgICdmYWxsYmFja0xuZycsXG4gICAgICAnbnMnLFxuICAgICAgJ2tleVNlcGFyYXRvcicsXG4gICAgICAnbnNTZXBhcmF0b3InLFxuICAgICAgJ3JldHVybk9iamVjdHMnLFxuICAgICAgJ3JldHVybkRldGFpbHMnLFxuICAgICAgJ2pvaW5BcnJheXMnLFxuICAgICAgJ3Bvc3RQcm9jZXNzJyxcbiAgICAgICdpbnRlcnBvbGF0aW9uJyxcbiAgICBdO1xuXG4gICAgY29uc3QgdXNlT3B0aW9uc1JlcGxhY2VGb3JEYXRhID0gb3B0aW9ucy5yZXBsYWNlICYmICFpc1N0cmluZyhvcHRpb25zLnJlcGxhY2UpO1xuICAgIGxldCBkYXRhID0gdXNlT3B0aW9uc1JlcGxhY2VGb3JEYXRhID8gb3B0aW9ucy5yZXBsYWNlIDogb3B0aW9ucztcbiAgICBpZiAodXNlT3B0aW9uc1JlcGxhY2VGb3JEYXRhICYmIHR5cGVvZiBvcHRpb25zLmNvdW50ICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgZGF0YSA9IHsgLi4uZGF0YSwgY291bnQ6IG9wdGlvbnMuY291bnQgfTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLmludGVycG9sYXRpb24uZGVmYXVsdFZhcmlhYmxlcykge1xuICAgICAgZGF0YSA9IHsgLi4udGhpcy5vcHRpb25zLmludGVycG9sYXRpb24uZGVmYXVsdFZhcmlhYmxlcywgLi4uZGF0YSB9O1xuICAgIH1cblxuICAgIC8vIGF2b2lkIHJlcG9ydGluZyBvcHRpb25zIChleGVjcHQgY291bnQpIGFzIHVzZWRQYXJhbXNcbiAgICBpZiAoIXVzZU9wdGlvbnNSZXBsYWNlRm9yRGF0YSkge1xuICAgICAgZGF0YSA9IHsgLi4uZGF0YSB9O1xuICAgICAgZm9yIChjb25zdCBrZXkgb2Ygb3B0aW9uc0tleXMpIHtcbiAgICAgICAgZGVsZXRlIGRhdGFba2V5XTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gZGF0YTtcbiAgfVxuXG4gIHN0YXRpYyBoYXNEZWZhdWx0VmFsdWUob3B0aW9ucykge1xuICAgIGNvbnN0IHByZWZpeCA9ICdkZWZhdWx0VmFsdWUnO1xuXG4gICAgZm9yIChjb25zdCBvcHRpb24gaW4gb3B0aW9ucykge1xuICAgICAgaWYgKFxuICAgICAgICBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob3B0aW9ucywgb3B0aW9uKSAmJlxuICAgICAgICBvcHRpb24uc3RhcnRzV2l0aChwcmVmaXgpICYmXG4gICAgICAgIHVuZGVmaW5lZCAhPT0gb3B0aW9uc1tvcHRpb25dXG4gICAgICApIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IFRyYW5zbGF0b3I7XG4iLCJpbXBvcnQgYmFzZUxvZ2dlciBmcm9tICcuL2xvZ2dlci5qcyc7XG5pbXBvcnQgeyBnZXRDbGVhbmVkQ29kZSwgaXNTdHJpbmcgfSBmcm9tICcuL3V0aWxzLmpzJztcblxuY2xhc3MgTGFuZ3VhZ2VVdGlsIHtcbiAgY29uc3RydWN0b3Iob3B0aW9ucywgbG9nZ2VyID0gYmFzZUxvZ2dlcikge1xuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG5cbiAgICB0aGlzLnN1cHBvcnRlZExuZ3MgPSB0aGlzLm9wdGlvbnMuc3VwcG9ydGVkTG5ncyB8fCBmYWxzZTtcbiAgICB0aGlzLmxvZ2dlciA9IGxvZ2dlci5jcmVhdGUoJ2xhbmd1YWdlVXRpbHMnKTtcbiAgICB0aGlzLnJlc29sdmVIaWVyYXJjaHlDYWNoZSA9IHt9O1xuICAgIHRoaXMuZm9ybWF0dGVkQ29kZXMgPSBuZXcgTWFwKCk7XG4gIH1cblxuICBjbGVhckNhY2hlKCkge1xuICAgIHRoaXMucmVzb2x2ZUhpZXJhcmNoeUNhY2hlID0ge307XG4gICAgdGhpcy5mb3JtYXR0ZWRDb2Rlcy5jbGVhcigpO1xuICB9XG5cbiAgZ2V0U2NyaXB0UGFydEZyb21Db2RlKGNvZGUpIHtcbiAgICBjb2RlID0gZ2V0Q2xlYW5lZENvZGUoY29kZSk7XG4gICAgaWYgKCFjb2RlIHx8ICFjb2RlLmluY2x1ZGVzKCctJykpIHJldHVybiBudWxsO1xuXG4gICAgY29uc3QgcCA9IGNvZGUuc3BsaXQoJy0nKTtcbiAgICBpZiAocC5sZW5ndGggPT09IDIpIHJldHVybiBudWxsO1xuICAgIHAucG9wKCk7XG4gICAgaWYgKHBbcC5sZW5ndGggLSAxXS50b0xvd2VyQ2FzZSgpID09PSAneCcpIHJldHVybiBudWxsO1xuICAgIHJldHVybiB0aGlzLmZvcm1hdExhbmd1YWdlQ29kZShwLmpvaW4oJy0nKSk7XG4gIH1cblxuICBnZXRMYW5ndWFnZVBhcnRGcm9tQ29kZShjb2RlKSB7XG4gICAgY29kZSA9IGdldENsZWFuZWRDb2RlKGNvZGUpO1xuICAgIGlmICghY29kZSkgcmV0dXJuIGNvZGU7XG4gICAgLy8gZm9ybWF0dGVkIGxpa2UgdGhlIGxhbmd1YWdlIHBhcnQgb2YgYSBjb2RlIHdpdGggc3VidGFnczogJ0FSJyBpcyAnYXInIGFzICdBUi1FRycgZ2l2ZXMgJ2FyJ1xuICAgIGlmICghY29kZS5pbmNsdWRlcygnLScpKSByZXR1cm4gdGhpcy5mb3JtYXRMYW5ndWFnZUNvZGUoY29kZSk7XG5cbiAgICBjb25zdCBwID0gY29kZS5zcGxpdCgnLScpO1xuICAgIHJldHVybiB0aGlzLmZvcm1hdExhbmd1YWdlQ29kZShwWzBdKTtcbiAgfVxuXG4gIC8vIENhbm9uaWNhbCBmb3JtIG9mIGEgY29kZSB3aXRoIHN1YnRhZ3MgKCdlbi11cycgLT4gJ2VuLVVTJywgJ2l3LUlMJyAtPiAnaGUtSUwnLCBhcyBiZWZvcmUgdjI3KTsgYSBjb2RlXG4gIC8vIHdpdGhvdXQgc3VidGFncyBvbmx5IGdldHMgaXRzIGNhbm9uaWNhbCBjYXNpbmcgKCdFTicgLT4gJ2VuJywgJ1RMJyAtPiAndGwnKSwgYWxpYXNlcyBzdGF5ICgndGwnLCAnaXcnKS4gQSBjb2RlXG4gIC8vIHRoYXQgaXMgbm90IEJDUCA0NyAoZ2V0Q2Fub25pY2FsTG9jYWxlcyB0aHJvd3MpIHN0YXlzIGFzIGl0IGlzLiBjbGVhbkNvZGU6IGZhbHNlIGtlZXBzIGEgY29kZSB3aXRob3V0XG4gIC8vIHN1YnRhZ3MgYXMgaXQgaXMgKGJlZm9yZSB2MjcpLlxuICBmb3JtYXRMYW5ndWFnZUNvZGUoY29kZSkge1xuICAgIGlmICghaXNTdHJpbmcoY29kZSkpIHJldHVybiBjb2RlO1xuICAgIGxldCBmb3JtYXR0ZWQgPSB0aGlzLmZvcm1hdHRlZENvZGVzLmdldChjb2RlKTtcbiAgICBpZiAoZm9ybWF0dGVkICE9PSB1bmRlZmluZWQpIHJldHVybiBmb3JtYXR0ZWQ7XG4gICAgZm9ybWF0dGVkID0gdGhpcy5mb3JtYXRVbmNhY2hlZChjb2RlKTtcbiAgICAvLyBwb255dGFpbDogY29kZXMgY29tZSBmcm9tIG91dHNpZGUgKGRldGVjdG9ycyksIHNvIHRoZSBjYWNoZSBpcyBlbXB0aWVkIGF0IDEwMDAgY29kZXMgaW5zdGVhZCBvZiBncm93aW5nXG4gICAgaWYgKHRoaXMuZm9ybWF0dGVkQ29kZXMuc2l6ZSA+PSAxMDAwKSB0aGlzLmZvcm1hdHRlZENvZGVzLmNsZWFyKCk7XG4gICAgdGhpcy5mb3JtYXR0ZWRDb2Rlcy5zZXQoY29kZSwgZm9ybWF0dGVkKTtcbiAgICByZXR1cm4gZm9ybWF0dGVkO1xuICB9XG5cbiAgZm9ybWF0VW5jYWNoZWQoY29kZSkge1xuICAgIGNvbnN0IGhhc1N1YnRhZ3MgPSBjb2RlLmluY2x1ZGVzKCctJyk7XG4gICAgaWYgKGhhc1N1YnRhZ3MgfHwgdGhpcy5vcHRpb25zLmNsZWFuQ29kZSAhPT0gZmFsc2UpIHtcbiAgICAgIGxldCBjYW5vbmljYWw7XG4gICAgICB0cnkge1xuICAgICAgICBjYW5vbmljYWwgPSBJbnRsLmdldENhbm9uaWNhbExvY2FsZXMoY29kZSlbMF07XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIC8qIGZhbGwgdGhyb3VnaCAqL1xuICAgICAgfVxuICAgICAgaWYgKGNhbm9uaWNhbCAmJiAoaGFzU3VidGFncyB8fCBjYW5vbmljYWwudG9Mb3dlckNhc2UoKSA9PT0gY29kZS50b0xvd2VyQ2FzZSgpKSkge1xuICAgICAgICByZXR1cm4gdGhpcy5vcHRpb25zLmxvd2VyQ2FzZUxuZyA/IGNhbm9uaWNhbC50b0xvd2VyQ2FzZSgpIDogY2Fub25pY2FsO1xuICAgICAgfVxuICAgICAgLy8gYW4gYWxpYXMgSW50bCB3b3VsZCByZXBsYWNlICgnVEwnIC0+ICdmaWwnLCAnSVcnIC0+ICdoZScpOiBvbmx5IGl0cyBjYXNpbmcgY2hhbmdlcyAoJ3RsJywgJ2l3JylcbiAgICAgIGlmIChjYW5vbmljYWwpIHJldHVybiBjb2RlLnRvTG93ZXJDYXNlKCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLm9wdGlvbnMubG93ZXJDYXNlTG5nIHx8ICh0aGlzLm9wdGlvbnMuY2xlYW5Db2RlICYmICFoYXNTdWJ0YWdzKVxuICAgICAgPyBjb2RlLnRvTG93ZXJDYXNlKClcbiAgICAgIDogY29kZTtcbiAgfVxuXG4gIGlzU3VwcG9ydGVkQ29kZShjb2RlKSB7XG4gICAgaWYgKHRoaXMub3B0aW9ucy5sb2FkID09PSAnbGFuZ3VhZ2VPbmx5JyB8fCB0aGlzLm9wdGlvbnMubm9uRXhwbGljaXRTdXBwb3J0ZWRMbmdzKSB7XG4gICAgICBjb2RlID0gdGhpcy5nZXRMYW5ndWFnZVBhcnRGcm9tQ29kZShjb2RlKTtcbiAgICB9XG4gICAgaWYgKCF0aGlzLnN1cHBvcnRlZExuZ3MgfHwgIXRoaXMuc3VwcG9ydGVkTG5ncy5sZW5ndGgpIHJldHVybiB0cnVlO1xuICAgIGlmICghQXJyYXkuaXNBcnJheSh0aGlzLnN1cHBvcnRlZExuZ3MpKSByZXR1cm4gdGhpcy5zdXBwb3J0ZWRMbmdzLmluY2x1ZGVzKGNvZGUpO1xuICAgIC8vIGNvbXBhcmVkIGZvcm1hdHRlZCwgbGlrZSBldmVyeSBvdGhlciBjb2RlOiAncHQtYnInIGFuZCAncHQtQlInIG1hdGNoLCBhbGwgbG93ZXJjYXNlIHdpdGggbG93ZXJDYXNlTG5nXG4gICAgY29uc3QgZm9ybWF0dGVkID0gdGhpcy5mb3JtYXRMYW5ndWFnZUNvZGUoY29kZSk7XG4gICAgcmV0dXJuIHRoaXMuc3VwcG9ydGVkTG5ncy5zb21lKFxuICAgICAgKHN1cHBvcnRlZExuZykgPT4gdGhpcy5mb3JtYXRMYW5ndWFnZUNvZGUoc3VwcG9ydGVkTG5nKSA9PT0gZm9ybWF0dGVkLFxuICAgICk7XG4gIH1cblxuICBnZXRCZXN0TWF0Y2hGcm9tQ29kZXMoY29kZXMpIHtcbiAgICBpZiAoIWNvZGVzKSByZXR1cm4gbnVsbDtcblxuICAgIGxldCBmb3VuZDtcblxuICAgIC8vIHBpY2sgZmlyc3Qgc3VwcG9ydGVkIGNvZGUgb3IgaWYgbm8gcmVzdHJpY3Rpb24gcGljayB0aGUgZmlyc3Qgb25lIChoaWdoZXN0IHByaW8pXG4gICAgY29kZXMuZm9yRWFjaCgoY29kZSkgPT4ge1xuICAgICAgaWYgKGZvdW5kKSByZXR1cm47XG4gICAgICBjb25zdCBjbGVhbmVkTG5nID0gdGhpcy5mb3JtYXRMYW5ndWFnZUNvZGUoY29kZSk7XG4gICAgICBpZiAoIXRoaXMub3B0aW9ucy5zdXBwb3J0ZWRMbmdzIHx8IHRoaXMuaXNTdXBwb3J0ZWRDb2RlKGNsZWFuZWRMbmcpKSBmb3VuZCA9IGNsZWFuZWRMbmc7XG4gICAgfSk7XG5cbiAgICAvLyBpZiB3ZSBnb3Qgbm8gbWF0Y2ggaW4gc3VwcG9ydGVkTG5ncyB5ZXQgLSBjaGVjayBmb3Igc2ltaWxhciBsb2NhbGVzXG4gICAgLy8gZmlyc3QgIGRlLUNIIC0tPiBkZVxuICAgIC8vIHNlY29uZCBkZS1DSCAtLT4gZGUtREVcbiAgICBpZiAoIWZvdW5kICYmIHRoaXMub3B0aW9ucy5zdXBwb3J0ZWRMbmdzKSB7XG4gICAgICBjb2Rlcy5mb3JFYWNoKChjb2RlKSA9PiB7XG4gICAgICAgIGlmIChmb3VuZCkgcmV0dXJuO1xuXG4gICAgICAgIGNvbnN0IGxuZ1NjT25seSA9IHRoaXMuZ2V0U2NyaXB0UGFydEZyb21Db2RlKGNvZGUpO1xuXG4gICAgICAgIGlmICh0aGlzLmlzU3VwcG9ydGVkQ29kZShsbmdTY09ubHkpKSByZXR1cm4gKGZvdW5kID0gbG5nU2NPbmx5KTtcblxuICAgICAgICBjb25zdCBsbmdPbmx5ID0gdGhpcy5nZXRMYW5ndWFnZVBhcnRGcm9tQ29kZShjb2RlKTtcblxuICAgICAgICBpZiAodGhpcy5pc1N1cHBvcnRlZENvZGUobG5nT25seSkpIHJldHVybiAoZm91bmQgPSBsbmdPbmx5KTtcblxuICAgICAgICBmb3VuZCA9IHRoaXMub3B0aW9ucy5zdXBwb3J0ZWRMbmdzXG4gICAgICAgICAgLm1hcCgoc3VwcG9ydGVkTG5nKSA9PiB0aGlzLmZvcm1hdExhbmd1YWdlQ29kZShzdXBwb3J0ZWRMbmcpKVxuICAgICAgICAgIC5maW5kKChzdXBwb3J0ZWRMbmcpID0+IHtcbiAgICAgICAgICAgIGlmIChzdXBwb3J0ZWRMbmcgPT09IGxuZ09ubHkpIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgaWYgKCFzdXBwb3J0ZWRMbmcuaW5jbHVkZXMoJy0nKSAmJiAhbG5nT25seS5pbmNsdWRlcygnLScpKSByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAgIHN1cHBvcnRlZExuZy5pbmNsdWRlcygnLScpICYmXG4gICAgICAgICAgICAgICFsbmdPbmx5LmluY2x1ZGVzKCctJykgJiZcbiAgICAgICAgICAgICAgc3VwcG9ydGVkTG5nLnNsaWNlKDAsIHN1cHBvcnRlZExuZy5pbmRleE9mKCctJykpID09PSBsbmdPbmx5XG4gICAgICAgICAgICApXG4gICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfVxuICAgIC8vIGlmIG5vdGhpbmcgZm91bmQsIHVzZSBmYWxsYmFja0xuZ1xuICAgIGlmICghZm91bmQpIGZvdW5kID0gdGhpcy5nZXRGYWxsYmFja0NvZGVzKHRoaXMub3B0aW9ucy5mYWxsYmFja0xuZylbMF07XG5cbiAgICByZXR1cm4gZm91bmQ7XG4gIH1cblxuICBnZXRGYWxsYmFja0NvZGVzKGZhbGxiYWNrcywgY29kZSkge1xuICAgIGlmICghZmFsbGJhY2tzKSByZXR1cm4gW107XG4gICAgaWYgKHR5cGVvZiBmYWxsYmFja3MgPT09ICdmdW5jdGlvbicpIGZhbGxiYWNrcyA9IGZhbGxiYWNrcyhjb2RlKTtcbiAgICBpZiAoaXNTdHJpbmcoZmFsbGJhY2tzKSkgZmFsbGJhY2tzID0gW2ZhbGxiYWNrc107XG4gICAgaWYgKEFycmF5LmlzQXJyYXkoZmFsbGJhY2tzKSkgcmV0dXJuIGZhbGxiYWNrcztcblxuICAgIGNvbnN0IGdldE93bkZhbGxiYWNrID0gKGtleSkgPT5cbiAgICAgIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChmYWxsYmFja3MsIGtleSkgPyBmYWxsYmFja3Nba2V5XSA6IHVuZGVmaW5lZDtcbiAgICBpZiAoIWNvZGUpIHJldHVybiBnZXRPd25GYWxsYmFjaygnZGVmYXVsdCcpIHx8IFtdO1xuXG4gICAgLy8gYXNzdW1lIHdlIGhhdmUgYW4gb2JqZWN0IGRlZmluaW5nIGZhbGxiYWNrc1xuICAgIGxldCBmb3VuZCA9IGdldE93bkZhbGxiYWNrKGNvZGUpO1xuICAgIGlmICghZm91bmQpIGZvdW5kID0gZ2V0T3duRmFsbGJhY2sodGhpcy5nZXRTY3JpcHRQYXJ0RnJvbUNvZGUoY29kZSkpO1xuICAgIGlmICghZm91bmQpIGZvdW5kID0gZ2V0T3duRmFsbGJhY2sodGhpcy5mb3JtYXRMYW5ndWFnZUNvZGUoY29kZSkpO1xuICAgIGlmICghZm91bmQpIGZvdW5kID0gZ2V0T3duRmFsbGJhY2sodGhpcy5nZXRMYW5ndWFnZVBhcnRGcm9tQ29kZShjb2RlKSk7XG4gICAgaWYgKCFmb3VuZCkgZm91bmQgPSBnZXRPd25GYWxsYmFjaygnZGVmYXVsdCcpO1xuXG4gICAgcmV0dXJuIGZvdW5kIHx8IFtdO1xuICB9XG5cbiAgdG9SZXNvbHZlSGllcmFyY2h5KGNvZGUsIGZhbGxiYWNrQ29kZSkge1xuICAgIGNvbnN0IGZhbGxiYWNrTG5nID0gdGhpcy5vcHRpb25zLmZhbGxiYWNrTG5nO1xuICAgIC8vIGpvaW4gc28gaW4tcGxhY2UgYXJyYXkgbXV0YXRpb24gKGZhbGxiYWNrTG5nLnB1c2goLi4uKSkgYWxzbyBpbnZhbGlkYXRlcywgbm90IG9ubHkgcmVhc3NpZ25tZW50XG4gICAgY29uc3QgZmFsbGJhY2tMbmdLZXkgPSBBcnJheS5pc0FycmF5KGZhbGxiYWNrTG5nKSA/IGZhbGxiYWNrTG5nLmpvaW4oJ3wnKSA6IGZhbGxiYWNrTG5nO1xuICAgIGlmIChmYWxsYmFja0xuZ0tleSAhPT0gdGhpcy5fY2FjaGVkRmFsbGJhY2tMbmcpIHtcbiAgICAgIHRoaXMucmVzb2x2ZUhpZXJhcmNoeUNhY2hlID0ge307XG4gICAgICB0aGlzLl9jYWNoZWRGYWxsYmFja0xuZyA9IGZhbGxiYWNrTG5nS2V5O1xuICAgIH1cblxuICAgIGNvbnN0IGhhc0NhY2hlYWJsZUZhbGxiYWNrID1cbiAgICAgIGZhbGxiYWNrQ29kZSA9PT0gdW5kZWZpbmVkIHx8IGZhbGxiYWNrQ29kZSA9PT0gZmFsc2UgfHwgaXNTdHJpbmcoZmFsbGJhY2tDb2RlKTtcbiAgICBjb25zdCB1c2VzVW5jYWNoZWFibGVPcHRpb25zRmFsbGJhY2sgPVxuICAgICAgZmFsbGJhY2tDb2RlID09PSB1bmRlZmluZWQgJiYgdHlwZW9mIHRoaXMub3B0aW9ucy5mYWxsYmFja0xuZyA9PT0gJ2Z1bmN0aW9uJztcbiAgICBjb25zdCBjYWNoZWFibGUgPSBpc1N0cmluZyhjb2RlKSAmJiBoYXNDYWNoZWFibGVGYWxsYmFjayAmJiAhdXNlc1VuY2FjaGVhYmxlT3B0aW9uc0ZhbGxiYWNrO1xuICAgIGxldCBjYWNoZUtleSA9IG51bGw7XG4gICAgaWYgKGNhY2hlYWJsZSkge1xuICAgICAgbGV0IGZhbGxiYWNrQ2FjaGVLZXk7XG4gICAgICBpZiAoZmFsbGJhY2tDb2RlID09PSB1bmRlZmluZWQpIGZhbGxiYWNrQ2FjaGVLZXkgPSAndW5kZWZpbmVkJztcbiAgICAgIGVsc2UgaWYgKGZhbGxiYWNrQ29kZSA9PT0gZmFsc2UpIGZhbGxiYWNrQ2FjaGVLZXkgPSAnYm9vbGVhbjpmYWxzZSc7XG4gICAgICBlbHNlIGZhbGxiYWNrQ2FjaGVLZXkgPSBgc3RyaW5nOiR7ZmFsbGJhY2tDb2RlfWA7XG4gICAgICBjYWNoZUtleSA9IGAke2NvZGUubGVuZ3RofToke2NvZGV9fCR7ZmFsbGJhY2tDYWNoZUtleX1gO1xuICAgIH1cbiAgICBpZiAoY2FjaGVLZXkgIT09IG51bGwpIHtcbiAgICAgIGNvbnN0IGNhY2hlZCA9IHRoaXMucmVzb2x2ZUhpZXJhcmNoeUNhY2hlW2NhY2hlS2V5XTtcbiAgICAgIGlmIChjYWNoZWQgIT09IHVuZGVmaW5lZCkgcmV0dXJuIGNhY2hlZC5zbGljZSgpO1xuICAgIH1cblxuICAgIGNvbnN0IGZhbGxiYWNrQ29kZXMgPSB0aGlzLmdldEZhbGxiYWNrQ29kZXMoXG4gICAgICAoZmFsbGJhY2tDb2RlID09PSBmYWxzZSA/IFtdIDogZmFsbGJhY2tDb2RlKSB8fCB0aGlzLm9wdGlvbnMuZmFsbGJhY2tMbmcgfHwgW10sXG4gICAgICBjb2RlLFxuICAgICk7XG5cbiAgICBjb25zdCBjb2RlcyA9IFtdO1xuICAgIGNvbnN0IGFkZENvZGUgPSAoYykgPT4ge1xuICAgICAgaWYgKCFjKSByZXR1cm47XG4gICAgICBpZiAodGhpcy5pc1N1cHBvcnRlZENvZGUoYykpIHtcbiAgICAgICAgY29kZXMucHVzaChjKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMubG9nZ2VyLndhcm4oYHJlamVjdGluZyBsYW5ndWFnZSBjb2RlIG5vdCBmb3VuZCBpbiBzdXBwb3J0ZWRMbmdzOiAke2N9YCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIGlmIChpc1N0cmluZyhjb2RlKSAmJiAoY29kZS5pbmNsdWRlcygnLScpIHx8IGNvZGUuaW5jbHVkZXMoJ18nKSkpIHtcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMubG9hZCAhPT0gJ2xhbmd1YWdlT25seScpIGFkZENvZGUodGhpcy5mb3JtYXRMYW5ndWFnZUNvZGUoY29kZSkpO1xuICAgICAgaWYgKHRoaXMub3B0aW9ucy5sb2FkICE9PSAnbGFuZ3VhZ2VPbmx5JyAmJiB0aGlzLm9wdGlvbnMubG9hZCAhPT0gJ2N1cnJlbnRPbmx5JylcbiAgICAgICAgYWRkQ29kZSh0aGlzLmdldFNjcmlwdFBhcnRGcm9tQ29kZShjb2RlKSk7XG4gICAgICBpZiAodGhpcy5vcHRpb25zLmxvYWQgIT09ICdjdXJyZW50T25seScpIGFkZENvZGUodGhpcy5nZXRMYW5ndWFnZVBhcnRGcm9tQ29kZShjb2RlKSk7XG4gICAgfSBlbHNlIGlmIChpc1N0cmluZyhjb2RlKSkge1xuICAgICAgYWRkQ29kZSh0aGlzLmZvcm1hdExhbmd1YWdlQ29kZShjb2RlKSk7XG4gICAgfVxuXG4gICAgZmFsbGJhY2tDb2Rlcy5mb3JFYWNoKChmYykgPT4ge1xuICAgICAgLy8gY29tcGFyZSB0aGUgZm9ybWF0dGVkIGNvZGUsIHNvIGEgZmFsbGJhY2sgbGlrZSAnZGUtY2gnIGRvZXNuJ3QgcmVwZWF0ICdkZS1DSCdcbiAgICAgIGNvbnN0IGZvcm1hdHRlZEZjID0gdGhpcy5mb3JtYXRMYW5ndWFnZUNvZGUoZmMpO1xuICAgICAgaWYgKCFjb2Rlcy5pbmNsdWRlcyhmb3JtYXR0ZWRGYykpIGFkZENvZGUoZm9ybWF0dGVkRmMpO1xuICAgIH0pO1xuXG4gICAgaWYgKGNhY2hlS2V5ICE9PSBudWxsKSB7XG4gICAgICAvLyBwb255dGFpbDogY29kZXMgY29tZSBmcm9tIG91dHNpZGUgKGRldGVjdG9ycyksIHNvIHRoZSBjYWNoZSBpcyBlbXB0aWVkIGF0IDEwMDAgY29kZXMsIGFzIGZvcm1hdHRlZENvZGVzXG4gICAgICBpZiAoT2JqZWN0LmtleXModGhpcy5yZXNvbHZlSGllcmFyY2h5Q2FjaGUpLmxlbmd0aCA+PSAxMDAwKSB0aGlzLnJlc29sdmVIaWVyYXJjaHlDYWNoZSA9IHt9O1xuICAgICAgdGhpcy5yZXNvbHZlSGllcmFyY2h5Q2FjaGVbY2FjaGVLZXldID0gY29kZXM7XG4gICAgICByZXR1cm4gY29kZXMuc2xpY2UoKTtcbiAgICB9XG5cbiAgICByZXR1cm4gY29kZXM7XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgTGFuZ3VhZ2VVdGlsO1xuIiwiaW1wb3J0IGJhc2VMb2dnZXIgZnJvbSAnLi9sb2dnZXIuanMnO1xuaW1wb3J0IHsgZ2V0Q2xlYW5lZENvZGUgfSBmcm9tICcuL3V0aWxzLmpzJ1xuXG5jb25zdCBzdWZmaXhlc09yZGVyID0ge1xuICB6ZXJvOiAwLFxuICBvbmU6IDEsXG4gIHR3bzogMixcbiAgZmV3OiAzLFxuICBtYW55OiA0LFxuICBvdGhlcjogNSxcbn07XG5cbmNvbnN0IGR1bW15UnVsZSA9IHtcbiAgc2VsZWN0OiAoY291bnQpID0+IGNvdW50ID09PSAxID8gJ29uZScgOiAnb3RoZXInLFxuICByZXNvbHZlZE9wdGlvbnM6ICgpID0+ICh7XG4gICAgcGx1cmFsQ2F0ZWdvcmllczogWydvbmUnLCAnb3RoZXInXVxuICB9KVxufTtcblxuY2xhc3MgUGx1cmFsUmVzb2x2ZXIge1xuICBjb25zdHJ1Y3RvcihsYW5ndWFnZVV0aWxzLCBvcHRpb25zID0ge30sIGxvZ2dlciA9IGJhc2VMb2dnZXIpIHtcbiAgICB0aGlzLmxhbmd1YWdlVXRpbHMgPSBsYW5ndWFnZVV0aWxzO1xuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG5cbiAgICB0aGlzLmxvZ2dlciA9IGxvZ2dlci5jcmVhdGUoJ3BsdXJhbFJlc29sdmVyJyk7XG5cbiAgICAvLyBDYWNoZSBjYWxscyB0byBJbnRsLlBsdXJhbFJ1bGVzLCBzaW5jZSByZXBlYXRlZCBjYWxscyBjYW4gYmUgc2xvdyBpbiBydW50aW1lcyBsaWtlIFJlYWN0IE5hdGl2ZVxuICAgIC8vIGFuZCB0aGUgbWVtb3J5IHVzYWdlIGRpZmZlcmVuY2UgaXMgbmVnbGlnaWJsZVxuICAgIHRoaXMucGx1cmFsUnVsZXNDYWNoZSA9IHt9O1xuICB9XG5cbiAgY2xlYXJDYWNoZSgpIHtcbiAgICB0aGlzLnBsdXJhbFJ1bGVzQ2FjaGUgPSB7fTtcbiAgfVxuXG4gIGdldFJ1bGUoY29kZSwgb3B0aW9ucyA9IHt9KSB7XG4gICAgY29uc3QgY2xlYW5lZENvZGUgPSBnZXRDbGVhbmVkQ29kZShjb2RlID09PSAnZGV2JyA/ICdlbicgOiBjb2RlKTtcbiAgICBjb25zdCB0eXBlID0gb3B0aW9ucy5vcmRpbmFsID8gJ29yZGluYWwnIDogJ2NhcmRpbmFsJztcbiAgICBjb25zdCBjYWNoZUtleSA9IEpTT04uc3RyaW5naWZ5KHsgY2xlYW5lZENvZGUsIHR5cGUgfSk7XG5cbiAgICBpZiAoY2FjaGVLZXkgaW4gdGhpcy5wbHVyYWxSdWxlc0NhY2hlKSB7XG4gICAgICByZXR1cm4gdGhpcy5wbHVyYWxSdWxlc0NhY2hlW2NhY2hlS2V5XTtcbiAgICB9XG5cbiAgICBsZXQgcnVsZTtcblxuICAgIHRyeSB7XG4gICAgICBydWxlID0gbmV3IEludGwuUGx1cmFsUnVsZXMoY2xlYW5lZENvZGUsIHsgdHlwZSB9KTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGlmICh0eXBlb2YgSW50bCA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoJ05vIEludGwgc3VwcG9ydCwgcGxlYXNlIHVzZSBhbiBJbnRsIHBvbHlmaWxsIScpO1xuICAgICAgICByZXR1cm4gZHVtbXlSdWxlO1xuICAgICAgfVxuICAgICAgaWYgKCFjb2RlLm1hdGNoKC8tfF8vKSkgcmV0dXJuIGR1bW15UnVsZTtcbiAgICAgIGNvbnN0IGxuZ1BhcnQgPSB0aGlzLmxhbmd1YWdlVXRpbHMuZ2V0TGFuZ3VhZ2VQYXJ0RnJvbUNvZGUoY29kZSk7XG4gICAgICBydWxlID0gdGhpcy5nZXRSdWxlKGxuZ1BhcnQsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIC8vIHBvbnl0YWlsOiBjb2RlcyBjb21lIGZyb20gb3V0c2lkZSAoZGV0ZWN0b3JzKSwgc28gdGhlIGNhY2hlIGlzIGVtcHRpZWQgYXQgMTAwMCBydWxlcywgYXMgZm9ybWF0dGVkQ29kZXNcbiAgICBpZiAoT2JqZWN0LmtleXModGhpcy5wbHVyYWxSdWxlc0NhY2hlKS5sZW5ndGggPj0gMTAwMCkgdGhpcy5wbHVyYWxSdWxlc0NhY2hlID0ge307XG4gICAgdGhpcy5wbHVyYWxSdWxlc0NhY2hlW2NhY2hlS2V5XSA9IHJ1bGU7XG4gICAgcmV0dXJuIHJ1bGU7XG4gIH1cblxuICBuZWVkc1BsdXJhbChjb2RlLCBvcHRpb25zID0ge30pIHtcbiAgICBsZXQgcnVsZSA9IHRoaXMuZ2V0UnVsZShjb2RlLCBvcHRpb25zKTtcbiAgICBpZiAoIXJ1bGUpIHJ1bGUgPSB0aGlzLmdldFJ1bGUoJ2RldicsIG9wdGlvbnMpO1xuICAgIHJldHVybiBydWxlPy5yZXNvbHZlZE9wdGlvbnMoKS5wbHVyYWxDYXRlZ29yaWVzLmxlbmd0aCA+IDE7XG4gIH1cblxuICBnZXRQbHVyYWxGb3Jtc09mS2V5KGNvZGUsIGtleSwgb3B0aW9ucyA9IHt9KSB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0U3VmZml4ZXMoY29kZSwgb3B0aW9ucykubWFwKChzdWZmaXgpID0+IGAke2tleX0ke3N1ZmZpeH1gKTtcbiAgfVxuXG4gIGdldFN1ZmZpeGVzKGNvZGUsIG9wdGlvbnMgPSB7fSkge1xuICAgIGxldCBydWxlID0gdGhpcy5nZXRSdWxlKGNvZGUsIG9wdGlvbnMpO1xuICAgIGlmICghcnVsZSkgcnVsZSA9IHRoaXMuZ2V0UnVsZSgnZGV2Jywgb3B0aW9ucyk7XG4gICAgaWYgKCFydWxlKSByZXR1cm4gW107XG5cbiAgICByZXR1cm4gcnVsZS5yZXNvbHZlZE9wdGlvbnMoKS5wbHVyYWxDYXRlZ29yaWVzXG4gICAgICAuc29ydCgocGx1cmFsQ2F0ZWdvcnkxLCBwbHVyYWxDYXRlZ29yeTIpID0+IHN1ZmZpeGVzT3JkZXJbcGx1cmFsQ2F0ZWdvcnkxXSAtIHN1ZmZpeGVzT3JkZXJbcGx1cmFsQ2F0ZWdvcnkyXSlcbiAgICAgIC5tYXAocGx1cmFsQ2F0ZWdvcnkgPT4gYCR7dGhpcy5vcHRpb25zLnByZXBlbmR9JHtvcHRpb25zLm9yZGluYWwgPyBgb3JkaW5hbCR7dGhpcy5vcHRpb25zLnByZXBlbmR9YCA6ICcnfSR7cGx1cmFsQ2F0ZWdvcnl9YCk7XG4gIH1cblxuICBnZXRTdWZmaXgoY29kZSwgY291bnQsIG9wdGlvbnMgPSB7fSkge1xuICAgIGNvbnN0IHJ1bGUgPSB0aGlzLmdldFJ1bGUoY29kZSwgb3B0aW9ucyk7XG5cbiAgICBpZiAocnVsZSkge1xuICAgICAgLy8gSW50bC5QbHVyYWxSdWxlcyB0YWtlcyBhIG51bWJlciBvbmx5OiBhIEJpZ0ludCBjb3VudCAoZS5nLiBhIENPVU5UKCopIGZyb20gYSBkYXRhYmFzZSBkcml2ZXIpIHRocmV3XG4gICAgICBjb25zdCBuID0gdHlwZW9mIGNvdW50ID09PSAnYmlnaW50JyA/IE51bWJlcihjb3VudCkgOiBjb3VudDtcbiAgICAgIHJldHVybiBgJHt0aGlzLm9wdGlvbnMucHJlcGVuZH0ke29wdGlvbnMub3JkaW5hbCA/IGBvcmRpbmFsJHt0aGlzLm9wdGlvbnMucHJlcGVuZH1gIDogJyd9JHtydWxlLnNlbGVjdChuKX1gO1xuICAgIH1cblxuICAgIHRoaXMubG9nZ2VyLndhcm4oYG5vIHBsdXJhbCBydWxlIGZvdW5kIGZvcjogJHtjb2RlfWApO1xuICAgIHJldHVybiB0aGlzLmdldFN1ZmZpeCgnZGV2JywgY291bnQsIG9wdGlvbnMpO1xuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IFBsdXJhbFJlc29sdmVyO1xuIiwiaW1wb3J0IHtcbiAgZ2V0UGF0aFdpdGhEZWZhdWx0cyxcbiAgZGVlcEZpbmQsXG4gIGVzY2FwZSBhcyB1dGlsc0VzY2FwZSxcbiAgcmVnZXhFc2NhcGUsXG4gIG1ha2VTdHJpbmcsXG4gIGlzU3RyaW5nLFxufSBmcm9tICcuL3V0aWxzLmpzJztcbmltcG9ydCBiYXNlTG9nZ2VyIGZyb20gJy4vbG9nZ2VyLmpzJztcblxuY29uc3QgZGVlcEZpbmRXaXRoRGVmYXVsdHMgPSAoXG4gIGRhdGEsXG4gIGRlZmF1bHREYXRhLFxuICBrZXksXG4gIGtleVNlcGFyYXRvciA9ICcuJyxcbiAgaWdub3JlSlNPTlN0cnVjdHVyZSA9IHRydWUsXG4pID0+IHtcbiAgbGV0IHBhdGggPSBnZXRQYXRoV2l0aERlZmF1bHRzKGRhdGEsIGRlZmF1bHREYXRhLCBrZXkpO1xuICAvLyBmYWxzZSwgMCBhbmQgJycgYXJlIHZhbHVlczsgbnVsbCBzdGlsbCBmYWxscyBiYWNrIHRvIGEgZmxhdCBrZXlcbiAgaWYgKHBhdGggPT0gbnVsbCAmJiBpZ25vcmVKU09OU3RydWN0dXJlICYmIGlzU3RyaW5nKGtleSkpIHtcbiAgICBwYXRoID0gZGVlcEZpbmQoZGF0YSwga2V5LCBrZXlTZXBhcmF0b3IpO1xuICAgIGlmIChwYXRoID09PSB1bmRlZmluZWQpIHBhdGggPSBkZWVwRmluZChkZWZhdWx0RGF0YSwga2V5LCBrZXlTZXBhcmF0b3IpO1xuICB9XG4gIHJldHVybiBwYXRoO1xufTtcblxuLy8gQSB2YWx1ZSBpbnNpZGUgdGhlIGB7IC4uLiB9YCBvcHRpb25zIG9mIGEgYCR0KGtleSwgeyAuLi4gfSlgLCBlc2NhcGVkIGZvciBhIEpTT04gc3RyaW5nOlxuLy8gaXQgY2FuIG5vdCBlbmQgdGhlIHN0cmluZywgYW5kIG5vIG1hcmt1cCByZWFjaGVzIHRoZSBvdXRwdXQgaWYgdGhlIG9wdGlvbnMgZG8gbm90IHBhcnNlLlxuY29uc3QgZXNjYXBlTmVzdGluZ09wdGlvbnNWYWx1ZSA9ICh2YWx1ZSkgPT5cbiAgbWFrZVN0cmluZyh2YWx1ZSkucmVwbGFjZShcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29udHJvbC1yZWdleFxuICAgIC9bXCInXFxcXCY8PlxcdTAwMDAtXFx1MDAxZl0vZyxcbiAgICAoYykgPT4gYFxcXFx1JHtjLmNoYXJDb2RlQXQoMCkudG9TdHJpbmcoMTYpLnBhZFN0YXJ0KDQsICcwJyl9YCxcbiAgKTtcblxuY2xhc3MgSW50ZXJwb2xhdG9yIHtcbiAgY29uc3RydWN0b3Iob3B0aW9ucyA9IHt9LCBsb2dnZXIgPSBiYXNlTG9nZ2VyKSB7XG4gICAgdGhpcy5sb2dnZXIgPSBsb2dnZXIuY3JlYXRlKCdpbnRlcnBvbGF0b3InKTtcblxuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG4gICAgdGhpcy5mb3JtYXQgPSBvcHRpb25zPy5pbnRlcnBvbGF0aW9uPy5mb3JtYXQgfHwgKCh2YWx1ZSkgPT4gdmFsdWUpO1xuICAgIHRoaXMuaW5pdChvcHRpb25zKTtcbiAgfVxuXG4gIGluaXQob3B0aW9ucyA9IHt9KSB7XG4gICAgaWYgKCFvcHRpb25zLmludGVycG9sYXRpb24pIG9wdGlvbnMuaW50ZXJwb2xhdGlvbiA9IHsgZXNjYXBlVmFsdWU6IHRydWUgfTtcblxuICAgIGNvbnN0IHtcbiAgICAgIGVzY2FwZSxcbiAgICAgIGVzY2FwZVZhbHVlLFxuICAgICAgdXNlUmF3VmFsdWVUb0VzY2FwZSxcbiAgICAgIHByZWZpeCxcbiAgICAgIHN1ZmZpeCxcbiAgICAgIGZvcm1hdFNlcGFyYXRvcixcbiAgICAgIHVuZXNjYXBlU3VmZml4LFxuICAgICAgdW5lc2NhcGVQcmVmaXgsXG4gICAgICBuZXN0aW5nUHJlZml4LFxuICAgICAgbmVzdGluZ1N1ZmZpeCxcbiAgICAgIG5lc3RpbmdPcHRpb25zU2VwYXJhdG9yLFxuICAgICAgbWF4UmVwbGFjZXMsXG4gICAgICBhbHdheXNGb3JtYXQsXG4gICAgfSA9IG9wdGlvbnMuaW50ZXJwb2xhdGlvbjtcblxuICAgIHRoaXMuZXNjYXBlID0gZXNjYXBlICE9PSB1bmRlZmluZWQgPyBlc2NhcGUgOiB1dGlsc0VzY2FwZTtcbiAgICB0aGlzLmVzY2FwZVZhbHVlID0gZXNjYXBlVmFsdWUgIT09IHVuZGVmaW5lZCA/IGVzY2FwZVZhbHVlIDogdHJ1ZTtcbiAgICB0aGlzLnVzZVJhd1ZhbHVlVG9Fc2NhcGUgPSB1c2VSYXdWYWx1ZVRvRXNjYXBlICE9PSB1bmRlZmluZWQgPyB1c2VSYXdWYWx1ZVRvRXNjYXBlIDogZmFsc2U7XG5cbiAgICB0aGlzLnByZWZpeCA9IHByZWZpeCA/IHJlZ2V4RXNjYXBlKHByZWZpeCkgOiAne3snO1xuICAgIHRoaXMuc3VmZml4ID0gc3VmZml4ID8gcmVnZXhFc2NhcGUoc3VmZml4KSA6ICd9fSc7XG5cbiAgICB0aGlzLmZvcm1hdFNlcGFyYXRvciA9IGZvcm1hdFNlcGFyYXRvciB8fCAnLCc7XG5cbiAgICB0aGlzLnVuZXNjYXBlUHJlZml4ID0gdW5lc2NhcGVTdWZmaXggPyAnJyA6IHVuZXNjYXBlUHJlZml4ID8gcmVnZXhFc2NhcGUodW5lc2NhcGVQcmVmaXgpIDogJy0nO1xuICAgIHRoaXMudW5lc2NhcGVTdWZmaXggPSB0aGlzLnVuZXNjYXBlUHJlZml4XG4gICAgICA/ICcnXG4gICAgICA6IHVuZXNjYXBlU3VmZml4XG4gICAgICAgID8gcmVnZXhFc2NhcGUodW5lc2NhcGVTdWZmaXgpXG4gICAgICAgIDogJyc7XG5cbiAgICAvLyB0aGUgcGxhaW4gdGV4dHMgZXZlcnkgbWF0Y2ggb2YgdGhlIHJlZ2V4cHMgc3RhcnRzIHdpdGg6IGEgdGV4dCB3aXRob3V0IHRoZW0gaGFzIG5vIG1hdGNoXG4gICAgdGhpcy5wcmVmaXhUZXh0ID0gcHJlZml4IHx8ICd7eyc7XG4gICAgdGhpcy5uZXN0aW5nUHJlZml4VGV4dCA9IG5lc3RpbmdQcmVmaXggfHwgJyR0KCc7XG4gICAgdGhpcy5uZXN0aW5nUHJlZml4ID0gcmVnZXhFc2NhcGUobmVzdGluZ1ByZWZpeCB8fCAnJHQoJyk7XG4gICAgdGhpcy5uZXN0aW5nU3VmZml4ID0gcmVnZXhFc2NhcGUobmVzdGluZ1N1ZmZpeCB8fCAnKScpO1xuXG4gICAgdGhpcy5uZXN0aW5nT3B0aW9uc1NlcGFyYXRvciA9IG5lc3RpbmdPcHRpb25zU2VwYXJhdG9yIHx8ICcsJztcblxuICAgIHRoaXMubWF4UmVwbGFjZXMgPSBtYXhSZXBsYWNlcyB8fCAxMDAwO1xuXG4gICAgdGhpcy5hbHdheXNGb3JtYXQgPSBhbHdheXNGb3JtYXQgIT09IHVuZGVmaW5lZCA/IGFsd2F5c0Zvcm1hdCA6IGZhbHNlO1xuXG4gICAgLy8gdGhlIHJlZ2V4cFxuICAgIHRoaXMucmVzZXRSZWdFeHAoKTtcbiAgfVxuXG4gIHJlc2V0KCkge1xuICAgIGlmICh0aGlzLm9wdGlvbnMpIHRoaXMuaW5pdCh0aGlzLm9wdGlvbnMpO1xuICB9XG5cbiAgcmVzZXRSZWdFeHAoKSB7XG4gICAgY29uc3QgZ2V0T3JSZXNldFJlZ0V4cCA9IChleGlzdGluZ1JlZ0V4cCwgcGF0dGVybikgPT4ge1xuICAgICAgaWYgKGV4aXN0aW5nUmVnRXhwPy5zb3VyY2UgPT09IHBhdHRlcm4pIHtcbiAgICAgICAgZXhpc3RpbmdSZWdFeHAubGFzdEluZGV4ID0gMDtcbiAgICAgICAgcmV0dXJuIGV4aXN0aW5nUmVnRXhwO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG5ldyBSZWdFeHAocGF0dGVybiwgJ2cnKTtcbiAgICB9O1xuXG4gICAgdGhpcy5yZWdleHAgPSBnZXRPclJlc2V0UmVnRXhwKHRoaXMucmVnZXhwLCBgJHt0aGlzLnByZWZpeH0oLis/KSR7dGhpcy5zdWZmaXh9YCk7XG4gICAgdGhpcy5yZWdleHBVbmVzY2FwZSA9IGdldE9yUmVzZXRSZWdFeHAoXG4gICAgICB0aGlzLnJlZ2V4cFVuZXNjYXBlLFxuICAgICAgYCR7dGhpcy5wcmVmaXh9JHt0aGlzLnVuZXNjYXBlUHJlZml4fSguKz8pJHt0aGlzLnVuZXNjYXBlU3VmZml4fSR7dGhpcy5zdWZmaXh9YCxcbiAgICApO1xuICAgIC8vIEV2ZXJ5IGFsdGVybmF0aXZlIHN0YXJ0cyB3aXRoIGEgZGlmZmVyZW50IGNoYXIgKHBsYWluIC8gXCIgLyAnIC8gXCIoXCIpLCBzbyB0aGVyZSBpc1xuICAgIC8vIG9ubHkgb25lIHdheSB0byBzcGxpdCB0aGUgaW5wdXQuIE92ZXJsYXBwaW5nIGFsdGVybmF0aXZlcyAoZS5nLiBgW14oKVwiJ10rYCBpbnNpZGVcbiAgICAvLyBgKj9gKSBiYWNrdHJhY2sgZXhwb25lbnRpYWxseSBvbiBhbiB1bmNsb3NlZCBgJHQoYCAoUmVEb1MpLlxuICAgIHRoaXMubmVzdGluZ1JlZ2V4cCA9IGdldE9yUmVzZXRSZWdFeHAoXG4gICAgICB0aGlzLm5lc3RpbmdSZWdleHAsXG4gICAgICBgJHt0aGlzLm5lc3RpbmdQcmVmaXh9KCg/OlteKClcIiddfFwiW15cIl0qXCJ8J1teJ10qJ3xcXFxcKCg/OlteKClcIiddfFwiW15cIl0qXCJ8J1teJ10qJykqXFxcXCkpKj8pJHt0aGlzLm5lc3RpbmdTdWZmaXh9YCxcbiAgICApO1xuICB9XG5cbiAgaW50ZXJwb2xhdGUoc3RyLCBkYXRhLCBsbmcsIG9wdGlvbnMsIGVzY2FwZSkge1xuICAgIGxldCBtYXRjaDtcbiAgICBsZXQgdmFsdWU7XG4gICAgbGV0IHJlcGxhY2VzO1xuICAgIGNvbnN0IG9yaWdpbmFsID0gc3RyO1xuXG4gICAgY29uc3QgZGVmYXVsdERhdGEgPVxuICAgICAgKHRoaXMub3B0aW9ucyAmJiB0aGlzLm9wdGlvbnMuaW50ZXJwb2xhdGlvbiAmJiB0aGlzLm9wdGlvbnMuaW50ZXJwb2xhdGlvbi5kZWZhdWx0VmFyaWFibGVzKSB8fFxuICAgICAge307XG5cbiAgICBjb25zdCBoYW5kbGVGb3JtYXQgPSAoa2V5KSA9PiB7XG4gICAgICBpZiAoIWtleS5pbmNsdWRlcyh0aGlzLmZvcm1hdFNlcGFyYXRvcikpIHtcbiAgICAgICAgY29uc3QgcGF0aCA9IGRlZXBGaW5kV2l0aERlZmF1bHRzKFxuICAgICAgICAgIGRhdGEsXG4gICAgICAgICAgZGVmYXVsdERhdGEsXG4gICAgICAgICAga2V5LFxuICAgICAgICAgIHRoaXMub3B0aW9ucy5rZXlTZXBhcmF0b3IsXG4gICAgICAgICAgdGhpcy5vcHRpb25zLmlnbm9yZUpTT05TdHJ1Y3R1cmUsXG4gICAgICAgICk7XG4gICAgICAgIHJldHVybiB0aGlzLmFsd2F5c0Zvcm1hdFxuICAgICAgICAgID8gdGhpcy5mb3JtYXQocGF0aCwgdW5kZWZpbmVkLCBsbmcsIHsgLi4ub3B0aW9ucywgLi4uZGF0YSwgaW50ZXJwb2xhdGlvbmtleToga2V5IH0pXG4gICAgICAgICAgOiBwYXRoO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBwID0ga2V5LnNwbGl0KHRoaXMuZm9ybWF0U2VwYXJhdG9yKTtcbiAgICAgIGNvbnN0IGsgPSBwLnNoaWZ0KCkudHJpbSgpO1xuICAgICAgY29uc3QgZiA9IHAuam9pbih0aGlzLmZvcm1hdFNlcGFyYXRvcikudHJpbSgpO1xuXG4gICAgICByZXR1cm4gdGhpcy5mb3JtYXQoXG4gICAgICAgIGRlZXBGaW5kV2l0aERlZmF1bHRzKFxuICAgICAgICAgIGRhdGEsXG4gICAgICAgICAgZGVmYXVsdERhdGEsXG4gICAgICAgICAgayxcbiAgICAgICAgICB0aGlzLm9wdGlvbnMua2V5U2VwYXJhdG9yLFxuICAgICAgICAgIHRoaXMub3B0aW9ucy5pZ25vcmVKU09OU3RydWN0dXJlLFxuICAgICAgICApLFxuICAgICAgICBmLFxuICAgICAgICBsbmcsXG4gICAgICAgIHtcbiAgICAgICAgICAuLi5vcHRpb25zLFxuICAgICAgICAgIC4uLmRhdGEsXG4gICAgICAgICAgaW50ZXJwb2xhdGlvbmtleTogayxcbiAgICAgICAgfSxcbiAgICAgICk7XG4gICAgfTtcblxuICAgIHRoaXMucmVzZXRSZWdFeHAoKTtcblxuICAgIC8vIFNlY3VyaXR5IHdhcm5pbmc6IGEgYHt7LSB2YXJ9fWAgaW5zaWRlIGEgJHQoKSBuZXN0aW5nIG9wdGlvbnMgYmxvY2tcbiAgICAvLyAoaS5lLiAkdChrZXksIHsgLi4uIFwie3stIHZhcn19XCIgLi4uIH0pKSBpcyBpbnNlcnRlZCB1bmVzY2FwZWQsIHNvIGFuXG4gICAgLy8gYXR0YWNrZXItY29udHJvbGxlZCB2YWx1ZSB0aGF0IGNvbnRhaW5zIGBcImAgY2FuIGJyZWFrIG91dCBvZiB0aGUgSlNPTlxuICAgIC8vIHN0cmluZyBsaXRlcmFsIGFuZCBpbmplY3QgZXh0cmEgbmVzdGluZyBvcHRpb25zIChlLmcuIHJlZGlyZWN0IGxuZy9ucykuXG4gICAgLy8gQSBge3t2YXJ9fWAgdGhlcmUgaXMgZXNjYXBlZCBmb3IgSlNPTiBieSBuZXN0KCksIHdoYXRldmVyIGVzY2FwZVZhbHVlIGlzLlxuICAgIC8vIFNlZSB0aGUgQ0hBTkdFTE9HICgyNi4wLjYgYW5kIGxhdGVyKSBhbmQgdGhlIHNlY3VyaXR5IGRvY3MuXG4gICAgaWYgKHR5cGVvZiBzdHIgPT09ICdzdHJpbmcnICYmIC9cXCR0XFwoW14pXSpcXHtbXn1dKlxce1xcey0vLnRlc3Qoc3RyKSkge1xuICAgICAgdGhpcy5sb2dnZXIud2FybihcbiAgICAgICAgJ25lc3Rpbmcgb3B0aW9ucyBzdHJpbmcgY29udGFpbnMgYSB2YXJpYWJsZSBpbnNlcnRlZCB1bmVzY2FwZWQgd2l0aCB7ey0gfX06ICcgK1xuICAgICAgICAgICdpZiBpdHMgdmFsdWUgaXMgYXR0YWNrZXItY29udHJvbGxlZCBpdCBjYW4gaW5qZWN0IGFkZGl0aW9uYWwgbmVzdGluZyBvcHRpb25zICcgK1xuICAgICAgICAgICcoZS5nLiByZWRpcmVjdCBsbmcvbnMpLiBVc2Uge3t2YXJ9fSB0aGVyZSwgd2hpY2ggaXMgZXNjYXBlZCBmb3IgdGhlIG9wdGlvbnMsIG9yICcgK1xuICAgICAgICAgICdzYW5pdGlzZSB1bnRydXN0ZWQgaW5wdXQgYmVmb3JlIHBhc3NpbmcgaXQgdG8gdCgpLicsXG4gICAgICApO1xuICAgIH1cblxuICAgIGNvbnN0IG1pc3NpbmdJbnRlcnBvbGF0aW9uSGFuZGxlciA9XG4gICAgICBvcHRpb25zPy5taXNzaW5nSW50ZXJwb2xhdGlvbkhhbmRsZXIgfHwgdGhpcy5vcHRpb25zLm1pc3NpbmdJbnRlcnBvbGF0aW9uSGFuZGxlcjtcblxuICAgIGNvbnN0IHNraXBPblZhcmlhYmxlcyA9XG4gICAgICBvcHRpb25zPy5pbnRlcnBvbGF0aW9uPy5za2lwT25WYXJpYWJsZXMgIT09IHVuZGVmaW5lZFxuICAgICAgICA/IG9wdGlvbnMuaW50ZXJwb2xhdGlvbi5za2lwT25WYXJpYWJsZXNcbiAgICAgICAgOiB0aGlzLm9wdGlvbnMuaW50ZXJwb2xhdGlvbi5za2lwT25WYXJpYWJsZXM7XG5cbiAgICAvLyBubyBwbGFjZWhvbGRlciBhdCBhbGw6IG5laXRoZXIgcmVnZXhwIGNhbiBtYXRjaFxuICAgIGlmIChpc1N0cmluZyhzdHIpICYmICFzdHIuaW5jbHVkZXModGhpcy5wcmVmaXhUZXh0KSkgcmV0dXJuIHN0cjtcblxuICAgIGlmICghZXNjYXBlKSB7XG4gICAgICBlc2NhcGUgPSAodmFsKSA9PiAodGhpcy5lc2NhcGVWYWx1ZSA/IHRoaXMuZXNjYXBlKHZhbCkgOiB2YWwpO1xuICAgICAgLy8gVGhlIGB7IC4uLiB9YCBvcHRpb25zIG9mIGEgYCR0KGtleSwgeyAuLi4gfSlgIGFyZSBsZWZ0IGZvciBuZXN0KCksIHdoaWNoIGZpbGxzIHRoZW0gaW5cbiAgICAgIC8vIGVzY2FwZWQgZm9yIEpTT04uIEVzY2FwZWQgZm9yIEhUTUwgaGVyZSwgYSB2YWx1ZSB3YXMgZXNjYXBlZCBhZ2FpbiBieSB0aGUgbmVzdGVkIHQoKS5cbiAgICAgIGlmIChpc1N0cmluZyhzdHIpICYmIHN0ci5pbmNsdWRlcyh0aGlzLm5lc3RpbmdQcmVmaXhUZXh0KSkge1xuICAgICAgICBjb25zdCBuZXN0aW5nUmVnZXhwID0gbmV3IFJlZ0V4cCh0aGlzLm5lc3RpbmdSZWdleHApO1xuICAgICAgICBjb25zdCBvcHRpb25zUmVnZXhwID0gbmV3IFJlZ0V4cChgJHtyZWdleEVzY2FwZSh0aGlzLm5lc3RpbmdPcHRpb25zU2VwYXJhdG9yKX1bIF0qe2ApO1xuICAgICAgICBsZXQgb3V0ID0gJyc7XG4gICAgICAgIGxldCBsYXN0RW5kID0gMDtcbiAgICAgICAgbGV0IG5lc3Rpbmc7XG4gICAgICAgIHdoaWxlICgobmVzdGluZyA9IG5lc3RpbmdSZWdleHAuZXhlYyhzdHIpKSkge1xuICAgICAgICAgIGNvbnN0IGlubmVyID0gbmVzdGluZy5pbmRleCArIHRoaXMubmVzdGluZ1ByZWZpeFRleHQubGVuZ3RoO1xuICAgICAgICAgIGNvbnN0IG9wdHMgPSBvcHRpb25zUmVnZXhwLmV4ZWMobmVzdGluZ1sxXSk7XG4gICAgICAgICAgY29uc3Qgc3RhcnQgPSBvcHRzID8gaW5uZXIgKyBvcHRzLmluZGV4ICsgb3B0c1swXS5sZW5ndGggLSAxIDogLTE7XG4gICAgICAgICAgLy8gbmVzdCgpIHRha2VzIHRoZSBvcHRpb25zIHVwIHRvIHRoZSBsYXN0IGB9YCAoZm9ybWF0dGVycyBtYXkgZm9sbG93KVxuICAgICAgICAgIGNvbnN0IGVuZCA9IGlubmVyICsgbmVzdGluZ1sxXS5sYXN0SW5kZXhPZignfScpICsgMTtcbiAgICAgICAgICAvLyBgJHQoa2V5LCB7ey0gb3B0aW9uc319KWA6IHRoZSBvcHRpb25zIGFyZSBhIHZhcmlhYmxlLCBmaWxsZWQgaW4gaGVyZVxuICAgICAgICAgIGlmIChzdGFydCAhPT0gLTEgJiYgZW5kID4gc3RhcnQgJiYgIXN0ci5zdGFydHNXaXRoKHRoaXMucHJlZml4VGV4dCwgc3RhcnQpKSB7XG4gICAgICAgICAgICBvdXQgKz1cbiAgICAgICAgICAgICAgdGhpcy5pbnRlcnBvbGF0ZShzdHIuc2xpY2UobGFzdEVuZCwgc3RhcnQpLCBkYXRhLCBsbmcsIG9wdGlvbnMsIGVzY2FwZSkgK1xuICAgICAgICAgICAgICBzdHIuc2xpY2Uoc3RhcnQsIGVuZCk7XG4gICAgICAgICAgICBsYXN0RW5kID0gZW5kO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAobGFzdEVuZCkgcmV0dXJuIG91dCArIHRoaXMuaW50ZXJwb2xhdGUoc3RyLnNsaWNlKGxhc3RFbmQpLCBkYXRhLCBsbmcsIG9wdGlvbnMsIGVzY2FwZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgdG9kb3MgPSBbXG4gICAgICB7XG4gICAgICAgIC8vIHVuZXNjYXBlIGlmIGhhcyB1bmVzY2FwZVByZWZpeC9TdWZmaXhcbiAgICAgICAgcmVnZXg6IHRoaXMucmVnZXhwVW5lc2NhcGUsXG4gICAgICAgIHNhZmVWYWx1ZTogKHZhbCkgPT4gdmFsLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgLy8gcmVndWxhciBlc2NhcGUgb24gZGVtYW5kXG4gICAgICAgIHJlZ2V4OiB0aGlzLnJlZ2V4cCxcbiAgICAgICAgc2FmZVZhbHVlOiBlc2NhcGUsXG4gICAgICB9LFxuICAgIF07XG4gICAgLy8gc2tpcE9uVmFyaWFibGVzOiB0aGUgZXNjYXBlIHBhc3Mgc2tpcHMgdGhlIHVuZXNjYXBlZCB2YWx1ZXMsIG9mZnNldCBieSBpdHMgb3duIGVkaXRzLlxuICAgIGNvbnN0IHVuZXNjYXBlZFZhbHVlcyA9IFtdO1xuICAgIGxldCBzaGlmdCA9IDA7XG4gICAgdG9kb3MuZm9yRWFjaCgodG9kbykgPT4ge1xuICAgICAgcmVwbGFjZXMgPSAwO1xuICAgICAgd2hpbGUgKChtYXRjaCA9IHRvZG8ucmVnZXguZXhlYyhzdHIpKSkge1xuICAgICAgICBjb25zdCBhdCA9IG1hdGNoLmluZGV4IC0gc2hpZnQ7XG4gICAgICAgIGNvbnN0IHdyaXR0ZW4gPSB1bmVzY2FwZWRWYWx1ZXMuZmluZCgoW3N0YXJ0LCBlbmRdKSA9PiBhdCA+PSBzdGFydCAmJiBhdCA8IGVuZCk7XG4gICAgICAgIGlmICh3cml0dGVuKSB7XG4gICAgICAgICAgdG9kby5yZWdleC5sYXN0SW5kZXggPSB3cml0dGVuWzFdICsgc2hpZnQ7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgbWF0Y2hlZFZhciA9IG1hdGNoWzFdLnRyaW0oKTtcbiAgICAgICAgdmFsdWUgPSBoYW5kbGVGb3JtYXQobWF0Y2hlZFZhcik7XG4gICAgICAgIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgaWYgKHR5cGVvZiBtaXNzaW5nSW50ZXJwb2xhdGlvbkhhbmRsZXIgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNvbnN0IHRlbXAgPSBtaXNzaW5nSW50ZXJwb2xhdGlvbkhhbmRsZXIoc3RyLCBtYXRjaCwgb3B0aW9ucyk7XG4gICAgICAgICAgICB2YWx1ZSA9IGlzU3RyaW5nKHRlbXApID8gdGVtcCA6ICcnO1xuICAgICAgICAgIH0gZWxzZSBpZiAoXG4gICAgICAgICAgICBvcHRpb25zICYmXG4gICAgICAgICAgICBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoXG4gICAgICAgICAgICAgIG9wdGlvbnMsXG4gICAgICAgICAgICAgIG1hdGNoZWRWYXIuc3BsaXQodGhpcy5mb3JtYXRTZXBhcmF0b3IpWzBdLnRyaW0oKSxcbiAgICAgICAgICAgIClcbiAgICAgICAgICApIHtcbiAgICAgICAgICAgIHZhbHVlID0gJyc7IC8vIHVuZGVmaW5lZCBiZWNvbWVzIGVtcHR5IHN0cmluZ1xuICAgICAgICAgIH0gZWxzZSBpZiAoc2tpcE9uVmFyaWFibGVzKSB7XG4gICAgICAgICAgICAvLyBrZXllZCBieSB0aGUgcGxhY2Vob2xkZXIgdGV4dDogYm90aCBwYXNzZXMgc2VlIGFuIHVuZXNjYXBlZCBge3stIHZhcn19YC5cbiAgICAgICAgICAgIC8vIENoZWNrZWQgaGVyZSB0b28sIHNvIGEgY2FsbCB3aXRob3V0IGRlYnVnIGRvZXMgbm90IGJ1aWxkIHRoZSBzdHJpbmdzLlxuICAgICAgICAgICAgaWYgKHRoaXMubG9nZ2VyLmRlYnVnKSB7XG4gICAgICAgICAgICAgIHRoaXMubG9nZ2VyLm9uY2UoXG4gICAgICAgICAgICAgICAgYCR7b3JpZ2luYWx9XFx1MDAwMCR7bWF0Y2hbMF19YCxcbiAgICAgICAgICAgICAgICAnd2FybicsXG4gICAgICAgICAgICAgICAgYG1pc3NlZCB0byBwYXNzIGluIHZhcmlhYmxlICR7bWF0Y2hlZFZhcn0gZm9yIGludGVycG9sYXRpbmcgJHtvcmlnaW5hbH1gLFxuICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFsdWUgPSBtYXRjaFswXTtcbiAgICAgICAgICAgIGNvbnRpbnVlOyAvLyB0aGlzIG1ha2VzIHN1cmUgaXQgY29udGludWVzIHRvIGRldGVjdCBvdGhlcnNcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5sb2dnZXIud2FybihgbWlzc2VkIHRvIHBhc3MgaW4gdmFyaWFibGUgJHttYXRjaGVkVmFyfSBmb3IgaW50ZXJwb2xhdGluZyAke3N0cn1gKTtcbiAgICAgICAgICAgIHZhbHVlID0gJyc7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKCFpc1N0cmluZyh2YWx1ZSkgJiYgIXRoaXMudXNlUmF3VmFsdWVUb0VzY2FwZSkge1xuICAgICAgICAgIHZhbHVlID0gbWFrZVN0cmluZyh2YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gbWFrZVN0cmluZzogd2l0aCB1c2VSYXdWYWx1ZVRvRXNjYXBlLCBge3stIHZhcn19YCBhbmQgZXNjYXBlVmFsdWU6IGZhbHNlIHBhc3MgdGhlIHJhdyB2YWx1ZS5cbiAgICAgICAgY29uc3Qgc2FmZVZhbHVlID0gbWFrZVN0cmluZyh0b2RvLnNhZmVWYWx1ZSh2YWx1ZSkpO1xuICAgICAgICAvLyBTbGljZWQgaW4gYXQgbWF0Y2guaW5kZXg6IFN0cmluZy5yZXBsYWNlIG1heSBoaXQgYSBjb3B5IGluc2lkZSBhbiBlYXJsaWVyIHZhbHVlLlxuICAgICAgICBzdHIgPSBzdHIuc2xpY2UoMCwgbWF0Y2guaW5kZXgpICsgc2FmZVZhbHVlICsgc3RyLnNsaWNlKG1hdGNoLmluZGV4ICsgbWF0Y2hbMF0ubGVuZ3RoKTtcbiAgICAgICAgaWYgKHNraXBPblZhcmlhYmxlcykge1xuICAgICAgICAgIGlmICh0b2RvLnJlZ2V4ID09PSB0aGlzLnJlZ2V4cFVuZXNjYXBlKSB7XG4gICAgICAgICAgICB1bmVzY2FwZWRWYWx1ZXMucHVzaChbbWF0Y2guaW5kZXgsIG1hdGNoLmluZGV4ICsgc2FmZVZhbHVlLmxlbmd0aF0pO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzaGlmdCArPSBzYWZlVmFsdWUubGVuZ3RoIC0gbWF0Y2hbMF0ubGVuZ3RoO1xuICAgICAgICAgIH1cbiAgICAgICAgICB0b2RvLnJlZ2V4Lmxhc3RJbmRleCArPSBzYWZlVmFsdWUubGVuZ3RoO1xuICAgICAgICAgIHRvZG8ucmVnZXgubGFzdEluZGV4IC09IG1hdGNoWzBdLmxlbmd0aDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0b2RvLnJlZ2V4Lmxhc3RJbmRleCA9IDA7XG4gICAgICAgIH1cbiAgICAgICAgcmVwbGFjZXMrKztcbiAgICAgICAgaWYgKHJlcGxhY2VzID49IHRoaXMubWF4UmVwbGFjZXMpIHtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBzdHI7XG4gIH1cblxuICBuZXN0KHN0ciwgZmMsIG9wdGlvbnMgPSB7fSkge1xuICAgIGxldCBtYXRjaDtcbiAgICBsZXQgdmFsdWU7XG5cbiAgICBsZXQgY2xvbmVkT3B0aW9ucztcblxuICAgIC8vIGlmIHZhbHVlIGlzIHNvbWV0aGluZyBsaWtlIFwibXlLZXlcIjogXCJsb3JlbSAkKGFub3RoZXJLZXksIHsgXCJjb3VudFwiOiB7e2FWYWx1ZUluT3B0aW9uc319IH0pXCJcbiAgICBjb25zdCBoYW5kbGVIYXNPcHRpb25zID0gKGtleSwgaW5oZXJpdGVkT3B0aW9ucykgPT4ge1xuICAgICAgY29uc3Qgc2VwID0gdGhpcy5uZXN0aW5nT3B0aW9uc1NlcGFyYXRvcjtcbiAgICAgIGlmICgha2V5LmluY2x1ZGVzKHNlcCkpIHJldHVybiBrZXk7XG5cbiAgICAgIGNvbnN0IGMgPSBrZXkuc3BsaXQobmV3IFJlZ0V4cChgJHtyZWdleEVzY2FwZShzZXApfVsgXSp7YCkpO1xuXG4gICAgICBjb25zdCB0ZW1wbGF0ZSA9IGB7JHtjWzFdfWA7XG4gICAgICBrZXkgPSBjWzBdO1xuICAgICAgbGV0IG9wdGlvbnNTdHJpbmc7XG4gICAgICAvLyBpbnRlcnBvbGF0ZSgpIGxlZnQgdGhlIHZhcmlhYmxlcyBpbiB0aGUgb3B0aW9ucyB0byB0aGlzOiBlc2NhcGVkIGZvciBKU09OLCBhIHZhbHVlIGlzXG4gICAgICAvLyBwYXNzZWQgb24gdW5jaGFuZ2VkLCBhbmQgdGhlIG5lc3RlZCB0KCkgZXNjYXBlcyBpdCBvbmNlLCBhcyBhIGRpcmVjdCB0KCkgY2FsbCBkb2VzXG4gICAgICBjb25zdCBwYXJzZSA9IChlc2NhcGUpID0+IHtcbiAgICAgICAgb3B0aW9uc1N0cmluZyA9IHRoaXMuaW50ZXJwb2xhdGUodGVtcGxhdGUsIGluaGVyaXRlZE9wdGlvbnMsIG9wdGlvbnMubG5nLCBvcHRpb25zLCBlc2NhcGUpO1xuICAgICAgICBjb25zdCBtYXRjaGVkU2luZ2xlUXVvdGVzID0gb3B0aW9uc1N0cmluZy5tYXRjaCgvJy9nKTtcbiAgICAgICAgY29uc3QgbWF0Y2hlZERvdWJsZVF1b3RlcyA9IG9wdGlvbnNTdHJpbmcubWF0Y2goL1wiL2cpO1xuICAgICAgICBpZiAoXG4gICAgICAgICAgKChtYXRjaGVkU2luZ2xlUXVvdGVzPy5sZW5ndGggPz8gMCkgJSAyID09PSAwICYmICFtYXRjaGVkRG91YmxlUXVvdGVzKSB8fFxuICAgICAgICAgIChtYXRjaGVkRG91YmxlUXVvdGVzPy5sZW5ndGggPz8gMCkgJSAyICE9PSAwXG4gICAgICAgICkge1xuICAgICAgICAgIG9wdGlvbnNTdHJpbmcgPSBvcHRpb25zU3RyaW5nLnJlcGxhY2UoLycvZywgJ1wiJyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIEpTT04ucGFyc2Uob3B0aW9uc1N0cmluZyk7XG4gICAgICB9O1xuXG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBwYXJzZWQgPSBwYXJzZShlc2NhcGVOZXN0aW5nT3B0aW9uc1ZhbHVlKTtcbiAgICAgICAgLy8gdGhlIG5lc3RlZCB0KCkgZG9lcyBub3QgaW50ZXJwb2xhdGUgdGhlc2UgYWdhaW46IHRoZWlyIHZhbHVlcyBhcmUgZXNjYXBlZCBoZXJlXG4gICAgICAgIGNvbnN0IHZlcmJhdGltID0gdGhpcy5lc2NhcGVWYWx1ZVxuICAgICAgICAgID8gT2JqZWN0LmtleXMocGFyc2VkKS5maWx0ZXIoKGspID0+IGsuc3RhcnRzV2l0aCgnZGVmYXVsdFZhbHVlJykgfHwgayA9PT0gJ2pvaW5BcnJheXMnKVxuICAgICAgICAgIDogW107XG4gICAgICAgIGlmICh2ZXJiYXRpbS5sZW5ndGgpIHtcbiAgICAgICAgICBjb25zdCBlc2NhcGVkID0gcGFyc2UoKHZhbCkgPT4gZXNjYXBlTmVzdGluZ09wdGlvbnNWYWx1ZSh0aGlzLmVzY2FwZSh2YWwpKSk7XG4gICAgICAgICAgdmVyYmF0aW0uZm9yRWFjaCgoaykgPT4ge1xuICAgICAgICAgICAgcGFyc2VkW2tdID0gZXNjYXBlZFtrXTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNsb25lZE9wdGlvbnMgPSBpbmhlcml0ZWRPcHRpb25zID8geyAuLi5pbmhlcml0ZWRPcHRpb25zLCAuLi5wYXJzZWQgfSA6IHBhcnNlZDtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgdGhpcy5sb2dnZXIud2FybihgZmFpbGVkIHBhcnNpbmcgb3B0aW9ucyBzdHJpbmcgaW4gbmVzdGluZyBmb3Iga2V5ICR7a2V5fWAsIGUpO1xuICAgICAgICByZXR1cm4gYCR7a2V5fSR7c2VwfSR7b3B0aW9uc1N0cmluZ31gO1xuICAgICAgfVxuXG4gICAgICAvLyBhc3NlcnQgd2UgZG8gbm90IGdldCBhIGVuZGxlc3MgbG9vcCBvbiBpbnRlcnBvbGF0aW5nIGRlZmF1bHRWYWx1ZSBhZ2FpbiBhbmQgYWdhaW5cbiAgICAgIGlmIChjbG9uZWRPcHRpb25zLmRlZmF1bHRWYWx1ZSAmJiBjbG9uZWRPcHRpb25zLmRlZmF1bHRWYWx1ZS5pbmNsdWRlcyh0aGlzLnByZWZpeCkpXG4gICAgICAgIGRlbGV0ZSBjbG9uZWRPcHRpb25zLmRlZmF1bHRWYWx1ZTtcbiAgICAgIHJldHVybiBrZXk7XG4gICAgfTtcblxuICAgIC8vIG5vdGhpbmcgdG8gbmVzdCAodGhlIGNvbW1vbiBjYXNlKTogbm8gY29weSBvZiB0aGUgcmVnZXhwIHRvIHNjYW4gd2l0aFxuICAgIGlmIChpc1N0cmluZyhzdHIpICYmICFzdHIuaW5jbHVkZXModGhpcy5uZXN0aW5nUHJlZml4VGV4dCkpIHJldHVybiBzdHI7XG5cbiAgICAvLyBPbmUgcGFzcyBvdmVyIHRoZSBvcmlnaW5hbCBzdHIgd2l0aCBhbiBvd24gY29weSBvZiB0aGUgcmVnZXhwLiBUaGUgbmVzdGVkIGxvb2t1cHNcbiAgICAvLyAoZmMpIHJlc2V0IHRoZSBzaGFyZWQgbmVzdGluZ1JlZ2V4cCwgc28gdGhlIGxvb3AgdXNlZCB0byByZXNjYW4gZnJvbSAwIGFmdGVyIGV2ZXJ5XG4gICAgLy8gbWF0Y2g6IHF1YWRyYXRpYywgYW5kIGl0IG5lc3RlZCBhZ2FpbiBhbnkgYCR0KC4uLilgIGluc2lkZSBhIHJlc29sdmVkIHZhbHVlIChlLmcuIGFcbiAgICAvLyB2YXJpYWJsZSB0aGUgbmVzdGVkIGxvb2t1cCBrZXB0IGxpdGVyYWwgdW5kZXIgc2tpcE9uVmFyaWFibGVzKS5cbiAgICBjb25zdCBuZXN0aW5nUmVnZXhwID0gbmV3IFJlZ0V4cCh0aGlzLm5lc3RpbmdSZWdleHApO1xuICAgIGxldCBvdXQgPSAnJztcbiAgICBsZXQgbGFzdEVuZCA9IDA7XG4gICAgd2hpbGUgKChtYXRjaCA9IG5lc3RpbmdSZWdleHAuZXhlYyhzdHIpKSkge1xuICAgICAgbGV0IGZvcm1hdHRlcnMgPSBbXTtcblxuICAgICAgY2xvbmVkT3B0aW9ucyA9IHsgLi4ub3B0aW9ucyB9O1xuICAgICAgY2xvbmVkT3B0aW9ucyA9XG4gICAgICAgIGNsb25lZE9wdGlvbnMucmVwbGFjZSAmJiAhaXNTdHJpbmcoY2xvbmVkT3B0aW9ucy5yZXBsYWNlKVxuICAgICAgICAgID8gY2xvbmVkT3B0aW9ucy5yZXBsYWNlXG4gICAgICAgICAgOiBjbG9uZWRPcHRpb25zO1xuICAgICAgY2xvbmVkT3B0aW9ucy5hcHBseVBvc3RQcm9jZXNzb3IgPSBmYWxzZTsgLy8gYXZvaWQgcG9zdCBwcm9jZXNzaW5nIG9uIG5lc3RlZCBsb29rdXBcbiAgICAgIGRlbGV0ZSBjbG9uZWRPcHRpb25zLmRlZmF1bHRWYWx1ZTsgLy8gYXNzZXJ0IHdlIGRvIG5vdCBnZXQgYSBlbmRsZXNzIGxvb3Agb24gaW50ZXJwb2xhdGluZyBkZWZhdWx0VmFsdWUgYWdhaW4gYW5kIGFnYWluXG5cbiAgICAgIC8qKlxuICAgICAgICogSWYgdGhlcmUgaXMgbW9yZSB0aGFuIG9uZSBwYXJhbWV0ZXIgKGNvbnRhaW5zIHRoZSBmb3JtYXQgc2VwYXJhdG9yKS4gRS5nLjpcbiAgICAgICAqICAgLSB0KGEsIGIpXG4gICAgICAgKiAgIC0gdChhLCBiLCBjKVxuICAgICAgICpcbiAgICAgICAqIEFuZCB0aG9zZSBwYXJhbWV0ZXJzIGFyZSBub3QgZHluYW1pYyB2YWx1ZXMgKHBhcmFtZXRlcnMgZG8gbm90IGluY2x1ZGUgY3VybHkgYnJhY2VzKS4gRS5nLjpcbiAgICAgICAqICAgLSBOb3QgdChhLCB7IFwia2V5XCI6IFwie3t2YXJpYWJsZX19XCIgfSlcbiAgICAgICAqICAgLSBOb3QgdChhLCBiLCB7XCJrZXlBXCI6IFwidmFsdWVBXCIsIFwia2V5QlwiOiBcInZhbHVlQlwifSlcbiAgICAgICAqXG4gICAgICAgKiBTaW5jZSB2MjUuMy4wIGFsc28gdGhpcyBpcyBwb3NzaWJsZTogaHR0cHM6Ly9naXRodWIuY29tL2kxOG5leHQvaTE4bmV4dC9wdWxsLzIzMjVcbiAgICAgICAqL1xuICAgICAgY29uc3Qga2V5RW5kSW5kZXggPSAvey4qfS9zLnRlc3QobWF0Y2hbMV0pXG4gICAgICAgID8gbWF0Y2hbMV0ubGFzdEluZGV4T2YoJ30nKSArIDFcbiAgICAgICAgOiBtYXRjaFsxXS5pbmRleE9mKHRoaXMuZm9ybWF0U2VwYXJhdG9yKTtcbiAgICAgIGlmIChrZXlFbmRJbmRleCAhPT0gLTEpIHtcbiAgICAgICAgZm9ybWF0dGVycyA9IG1hdGNoWzFdXG4gICAgICAgICAgLnNsaWNlKGtleUVuZEluZGV4KVxuICAgICAgICAgIC5zcGxpdCh0aGlzLmZvcm1hdFNlcGFyYXRvcilcbiAgICAgICAgICAubWFwKChlbGVtKSA9PiBlbGVtLnRyaW0oKSlcbiAgICAgICAgICAuZmlsdGVyKEJvb2xlYW4pO1xuICAgICAgICBtYXRjaFsxXSA9IG1hdGNoWzFdLnNsaWNlKDAsIGtleUVuZEluZGV4KTtcbiAgICAgIH1cblxuICAgICAgdmFsdWUgPSBmYyhoYW5kbGVIYXNPcHRpb25zLmNhbGwodGhpcywgbWF0Y2hbMV0udHJpbSgpLCBjbG9uZWRPcHRpb25zKSwgY2xvbmVkT3B0aW9ucyk7XG5cbiAgICAgIC8vIGlzIG9ubHkgdGhlIG5lc3Rpbmcga2V5IChrZXkxID0gJyQoa2V5MiknKSByZXR1cm4gdGhlIHZhbHVlIHdpdGhvdXQgc3RyaW5naWZ5XG4gICAgICBpZiAodmFsdWUgJiYgbWF0Y2hbMF0gPT09IHN0ciAmJiAhaXNTdHJpbmcodmFsdWUpKSByZXR1cm4gdmFsdWU7XG5cbiAgICAgIC8vIG5vIHN0cmluZyB0byBpbmNsdWRlIG9yIGVtcHR5XG4gICAgICBpZiAoIWlzU3RyaW5nKHZhbHVlKSkgdmFsdWUgPSBtYWtlU3RyaW5nKHZhbHVlKTtcbiAgICAgIGlmICghdmFsdWUpIHtcbiAgICAgICAgdGhpcy5sb2dnZXIud2FybihgbWlzc2VkIHRvIHJlc29sdmUgJHttYXRjaFsxXX0gZm9yIG5lc3RpbmcgJHtzdHJ9YCk7XG4gICAgICAgIHZhbHVlID0gJyc7XG4gICAgICB9XG5cbiAgICAgIGlmIChmb3JtYXR0ZXJzLmxlbmd0aCkge1xuICAgICAgICB2YWx1ZSA9IGZvcm1hdHRlcnMucmVkdWNlKFxuICAgICAgICAgICh2LCBmKSA9PlxuICAgICAgICAgICAgdGhpcy5mb3JtYXQodiwgZiwgb3B0aW9ucy5sbmcsIHsgLi4ub3B0aW9ucywgaW50ZXJwb2xhdGlvbmtleTogbWF0Y2hbMV0udHJpbSgpIH0pLFxuICAgICAgICAgIHZhbHVlLnRyaW0oKSxcbiAgICAgICAgKTtcbiAgICAgIH1cblxuICAgICAgLy8gTmVzdGVkIGtleXMgc2hvdWxkIG5vdCBiZSBlc2NhcGVkIGJ5IGRlZmF1bHQgIzg1NFxuICAgICAgLy8gU2xpY2VkIGluLCBub3QgU3RyaW5nLnJlcGxhY2UsIHNvIGAkJmAsIGAkJ2AsIFwiJGBcIiBhbmQgYCQkYCBpbiB0aGUgdmFsdWUgc3RheSBsaXRlcmFsLlxuICAgICAgLy8gbWFrZVN0cmluZzogYSBmb3JtYXR0ZXIgaW4gdGhlIG5lc3RpbmcgY2hhaW4gbWF5IGhhdmUgcmV0dXJuZWQgYSBub24tc3RyaW5nLlxuICAgICAgb3V0ICs9IHN0ci5zbGljZShsYXN0RW5kLCBtYXRjaC5pbmRleCkgKyBtYWtlU3RyaW5nKHZhbHVlKTtcbiAgICAgIGxhc3RFbmQgPSBuZXN0aW5nUmVnZXhwLmxhc3RJbmRleDtcbiAgICAgIHRoaXMucmVnZXhwLmxhc3RJbmRleCA9IDA7XG4gICAgfVxuICAgIC8vIG5vIG1hdGNoOiBzdHIgdW50b3VjaGVkIChpdCBtYXkgYmUgYSBub24tc3RyaW5nKVxuICAgIHJldHVybiBsYXN0RW5kID8gb3V0ICsgc3RyLnNsaWNlKGxhc3RFbmQpIDogc3RyO1xuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IEludGVycG9sYXRvcjtcbiIsImltcG9ydCBiYXNlTG9nZ2VyIGZyb20gJy4vbG9nZ2VyLmpzJztcbmltcG9ydCB7IGdldENsZWFuZWRDb2RlIH0gZnJvbSAnLi91dGlscy5qcyc7XG5cbmNvbnN0IHBhcnNlRm9ybWF0U3RyID0gKGZvcm1hdFN0cikgPT4ge1xuICBsZXQgZm9ybWF0TmFtZSA9IGZvcm1hdFN0ci50b0xvd2VyQ2FzZSgpLnRyaW0oKTtcbiAgY29uc3QgZm9ybWF0T3B0aW9ucyA9IHt9O1xuICBpZiAoZm9ybWF0U3RyLmluY2x1ZGVzKCcoJykpIHtcbiAgICBjb25zdCBwID0gZm9ybWF0U3RyLnNwbGl0KCcoJyk7XG4gICAgZm9ybWF0TmFtZSA9IHBbMF0udG9Mb3dlckNhc2UoKS50cmltKCk7XG5cbiAgICBjb25zdCBvcHRTdHIgPSBwWzFdLnNsaWNlKDAsIC0xKTtcblxuICAgIC8vIGV4dHJhIGZvciBjdXJyZW5jeVxuICAgIGlmIChmb3JtYXROYW1lID09PSAnY3VycmVuY3knICYmICFvcHRTdHIuaW5jbHVkZXMoJzonKSkge1xuICAgICAgaWYgKCFmb3JtYXRPcHRpb25zLmN1cnJlbmN5KSBmb3JtYXRPcHRpb25zLmN1cnJlbmN5ID0gb3B0U3RyLnRyaW0oKTtcbiAgICB9IGVsc2UgaWYgKGZvcm1hdE5hbWUgPT09ICdyZWxhdGl2ZXRpbWUnICYmICFvcHRTdHIuaW5jbHVkZXMoJzonKSkge1xuICAgICAgaWYgKCFmb3JtYXRPcHRpb25zLnJhbmdlKSBmb3JtYXRPcHRpb25zLnJhbmdlID0gb3B0U3RyLnRyaW0oKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3Qgb3B0cyA9IG9wdFN0ci5zcGxpdCgnOycpO1xuXG4gICAgICBvcHRzLmZvckVhY2goKG9wdCkgPT4ge1xuICAgICAgICBpZiAob3B0KSB7XG4gICAgICAgICAgY29uc3QgW2tleSwgLi4ucmVzdF0gPSBvcHQuc3BsaXQoJzonKTtcbiAgICAgICAgICBjb25zdCB2YWwgPSByZXN0XG4gICAgICAgICAgICAuam9pbignOicpXG4gICAgICAgICAgICAudHJpbSgpXG4gICAgICAgICAgICAucmVwbGFjZSgvXicrfCcrJC9nLCAnJyk7IC8vIHRyaW0gYW5kIHJlcGxhY2UgJydcblxuICAgICAgICAgIGNvbnN0IHRyaW1tZWRLZXkgPSBrZXkudHJpbSgpO1xuXG4gICAgICAgICAgaWYgKCFmb3JtYXRPcHRpb25zW3RyaW1tZWRLZXldKSBmb3JtYXRPcHRpb25zW3RyaW1tZWRLZXldID0gdmFsO1xuICAgICAgICAgIGlmICh2YWwgPT09ICdmYWxzZScpIGZvcm1hdE9wdGlvbnNbdHJpbW1lZEtleV0gPSBmYWxzZTtcbiAgICAgICAgICBpZiAodmFsID09PSAndHJ1ZScpIGZvcm1hdE9wdGlvbnNbdHJpbW1lZEtleV0gPSB0cnVlO1xuICAgICAgICAgIGlmICghaXNOYU4odmFsKSkgZm9ybWF0T3B0aW9uc1t0cmltbWVkS2V5XSA9IHBhcnNlSW50KHZhbCwgMTApO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGZvcm1hdE5hbWUsXG4gICAgZm9ybWF0T3B0aW9ucyxcbiAgfTtcbn07XG5cbi8vIFRoZSBjYWNoZSBrZXkgaG9sZHMgdGhlIG9wdGlvbnMgb2YgdGhlIHQoKSBjYWxsLCBhbmQgc28gdGhlIGludGVycG9sYXRlZCB2YWx1ZXM6IGEgZm9ybWF0dGVyIGlzXG4vLyBrZXB0IGZvciBlYWNoIG5ldyB2YWx1ZS4gV2l0aG91dCBhIGxpbWl0LCBhIGxvbmcgcnVubmluZyBwcm9jZXNzIHRoYXQgZm9ybWF0cyBldmVyIG5ld1xuLy8gYW1vdW50cywgZGF0ZXMgb3IgbmFtZXMga2VlcHMgdGhlbSBhbGwgKCMyMjI3KS5cbmNvbnN0IGNhY2hlZEZvcm1hdHRlcnNMaW1pdCA9IDEwMDA7XG5cbmNvbnN0IGNyZWF0ZUNhY2hlZEZvcm1hdHRlciA9IChmbikgPT4ge1xuICBjb25zdCBjYWNoZSA9IG5ldyBNYXAoKTtcbiAgcmV0dXJuICh2LCBsLCBvKSA9PiB7XG4gICAgbGV0IG9wdEZvckNhY2hlID0gbztcbiAgICAvLyB0aGlzIGNhY2hlIG9wdGltaXphdGlvbiB3aWxsIG9ubHkgd29yayBmb3Iga2V5cyBoYXZpbmcgMSBpbnRlcnBvbGF0ZWQgdmFsdWVcbiAgICBpZiAoXG4gICAgICBvICYmXG4gICAgICBvLmludGVycG9sYXRpb25rZXkgJiZcbiAgICAgIG8uZm9ybWF0UGFyYW1zICYmXG4gICAgICBvLmZvcm1hdFBhcmFtc1tvLmludGVycG9sYXRpb25rZXldICYmXG4gICAgICBvW28uaW50ZXJwb2xhdGlvbmtleV1cbiAgICApIHtcbiAgICAgIG9wdEZvckNhY2hlID0ge1xuICAgICAgICAuLi5vcHRGb3JDYWNoZSxcbiAgICAgICAgW28uaW50ZXJwb2xhdGlvbmtleV06IHVuZGVmaW5lZCxcbiAgICAgIH07XG4gICAgfVxuICAgIGxldCBrZXk7XG4gICAgdHJ5IHtcbiAgICAgIGtleSA9IGwgKyBKU09OLnN0cmluZ2lmeShvcHRGb3JDYWNoZSk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgLy8gb3B0aW9ucyBhcmUgbm90IHNlcmlhbGl6YWJsZSAoZS5nLiBCaWdJbnQgb3IgY2lyY3VsYXIgdmFsdWVzKTogZm9ybWF0IHdpdGhvdXQgdGhlIGNhY2hlXG4gICAgICByZXR1cm4gZm4oZ2V0Q2xlYW5lZENvZGUobCksIG8pKHYpO1xuICAgIH1cbiAgICBsZXQgZnJtID0gY2FjaGUuZ2V0KGtleSk7XG4gICAgaWYgKCFmcm0pIHtcbiAgICAgIGZybSA9IGZuKGdldENsZWFuZWRDb2RlKGwpLCBvKTtcbiAgICAgIC8vIGZvcmdldCB0aGUgb2xkZXN0IGZvcm1hdHRlciwgd2hpY2ggaXMgbWFkZSBhZ2FpbiBpZiBpdCBpcyBuZWVkZWRcbiAgICAgIGlmIChjYWNoZS5zaXplID49IGNhY2hlZEZvcm1hdHRlcnNMaW1pdCkgY2FjaGUuZGVsZXRlKGNhY2hlLmtleXMoKS5uZXh0KCkudmFsdWUpO1xuICAgICAgY2FjaGUuc2V0KGtleSwgZnJtKTtcbiAgICB9XG4gICAgcmV0dXJuIGZybSh2KTtcbiAgfTtcbn07XG5cbmNvbnN0IGNyZWF0ZU5vbkNhY2hlZEZvcm1hdHRlciA9IChmbikgPT4gKHYsIGwsIG8pID0+IGZuKGdldENsZWFuZWRDb2RlKGwpLCBvKSh2KTtcblxuY2xhc3MgRm9ybWF0dGVyIHtcbiAgY29uc3RydWN0b3Iob3B0aW9ucyA9IHt9KSB7XG4gICAgdGhpcy5sb2dnZXIgPSBiYXNlTG9nZ2VyLmNyZWF0ZSgnZm9ybWF0dGVyJyk7XG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcbiAgICB0aGlzLmluaXQob3B0aW9ucyk7XG4gIH1cblxuICBpbml0KHNlcnZpY2VzLCBvcHRpb25zID0geyBpbnRlcnBvbGF0aW9uOiB7fSB9KSB7XG4gICAgLy8gdGhlIGluc3RhbmNlJ3MgbG9nZ2VyICh0aGUgY29uc3RydWN0b3IgcnVucyBpbml0KCkgd2l0aCB0aGUgb3B0aW9ucyBpbnN0ZWFkIG9mIHRoZSBzZXJ2aWNlcylcbiAgICBpZiAoc2VydmljZXM/LmxvZ2dlcj8uY3JlYXRlKSB0aGlzLmxvZ2dlciA9IHNlcnZpY2VzLmxvZ2dlci5jcmVhdGUoJ2Zvcm1hdHRlcicpO1xuICAgIHRoaXMuZm9ybWF0U2VwYXJhdG9yID0gb3B0aW9ucy5pbnRlcnBvbGF0aW9uLmZvcm1hdFNlcGFyYXRvciB8fCAnLCc7XG4gICAgY29uc3QgY2YgPSBvcHRpb25zLmNhY2hlSW5CdWlsdEZvcm1hdHMgPyBjcmVhdGVDYWNoZWRGb3JtYXR0ZXIgOiBjcmVhdGVOb25DYWNoZWRGb3JtYXR0ZXI7XG4gICAgdGhpcy5mb3JtYXRzID0ge1xuICAgICAgbnVtYmVyOiBjZigobG5nLCBvcHQpID0+IHtcbiAgICAgICAgY29uc3QgZm9ybWF0dGVyID0gbmV3IEludGwuTnVtYmVyRm9ybWF0KGxuZywgeyAuLi5vcHQgfSk7XG4gICAgICAgIHJldHVybiAodmFsKSA9PiBmb3JtYXR0ZXIuZm9ybWF0KHZhbCk7XG4gICAgICB9KSxcbiAgICAgIGN1cnJlbmN5OiBjZigobG5nLCBvcHQpID0+IHtcbiAgICAgICAgY29uc3QgZm9ybWF0dGVyID0gbmV3IEludGwuTnVtYmVyRm9ybWF0KGxuZywgeyAuLi5vcHQsIHN0eWxlOiAnY3VycmVuY3knIH0pO1xuICAgICAgICByZXR1cm4gKHZhbCkgPT4gZm9ybWF0dGVyLmZvcm1hdCh2YWwpO1xuICAgICAgfSksXG4gICAgICBkYXRldGltZTogY2YoKGxuZywgb3B0KSA9PiB7XG4gICAgICAgIGNvbnN0IGZvcm1hdHRlciA9IG5ldyBJbnRsLkRhdGVUaW1lRm9ybWF0KGxuZywgeyAuLi5vcHQgfSk7XG4gICAgICAgIHJldHVybiAodmFsKSA9PiBmb3JtYXR0ZXIuZm9ybWF0KHZhbCk7XG4gICAgICB9KSxcbiAgICAgIHJlbGF0aXZldGltZTogY2YoKGxuZywgb3B0KSA9PiB7XG4gICAgICAgIGNvbnN0IGZvcm1hdHRlciA9IG5ldyBJbnRsLlJlbGF0aXZlVGltZUZvcm1hdChsbmcsIHsgLi4ub3B0IH0pO1xuICAgICAgICByZXR1cm4gKHZhbCkgPT4gZm9ybWF0dGVyLmZvcm1hdCh2YWwsIG9wdC5yYW5nZSB8fCAnZGF5Jyk7XG4gICAgICB9KSxcbiAgICAgIGxpc3Q6IGNmKChsbmcsIG9wdCkgPT4ge1xuICAgICAgICBjb25zdCBmb3JtYXR0ZXIgPSBuZXcgSW50bC5MaXN0Rm9ybWF0KGxuZywgeyAuLi5vcHQgfSk7XG4gICAgICAgIHJldHVybiAodmFsKSA9PiBmb3JtYXR0ZXIuZm9ybWF0KHZhbCk7XG4gICAgICB9KSxcbiAgICB9O1xuICB9XG5cbiAgYWRkKG5hbWUsIGZjKSB7XG4gICAgdGhpcy5mb3JtYXRzW25hbWUudG9Mb3dlckNhc2UoKS50cmltKCldID0gZmM7XG4gIH1cblxuICBhZGRDYWNoZWQobmFtZSwgZmMpIHtcbiAgICB0aGlzLmZvcm1hdHNbbmFtZS50b0xvd2VyQ2FzZSgpLnRyaW0oKV0gPSBjcmVhdGVDYWNoZWRGb3JtYXR0ZXIoZmMpO1xuICB9XG5cbiAgZm9ybWF0KHZhbHVlLCBmb3JtYXQsIGxuZywgb3B0aW9ucyA9IHt9KSB7XG4gICAgaWYgKCFmb3JtYXQpIHJldHVybiB2YWx1ZTtcbiAgICBpZiAodmFsdWUgPT0gbnVsbCkgcmV0dXJuIHZhbHVlO1xuICAgIGNvbnN0IHJhd0Zvcm1hdHMgPSBmb3JtYXQuc3BsaXQodGhpcy5mb3JtYXRTZXBhcmF0b3IpO1xuICAgIGNvbnN0IGZvcm1hdHMgPSBbXTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHJhd0Zvcm1hdHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGxldCBmID0gcmF3Rm9ybWF0c1tpXTtcbiAgICAgIHdoaWxlIChmLmluZGV4T2YoJygnKSA+IC0xICYmICFmLmluY2x1ZGVzKCcpJykgJiYgaSArIDEgPCByYXdGb3JtYXRzLmxlbmd0aCkge1xuICAgICAgICBmID0gYCR7Zn0ke3RoaXMuZm9ybWF0U2VwYXJhdG9yfSR7cmF3Rm9ybWF0c1srK2ldfWA7XG4gICAgICB9XG4gICAgICBmb3JtYXRzLnB1c2goZik7XG4gICAgfVxuXG4gICAgY29uc3QgcmVzdWx0ID0gZm9ybWF0cy5yZWR1Y2UoKG1lbSwgZikgPT4ge1xuICAgICAgY29uc3QgeyBmb3JtYXROYW1lLCBmb3JtYXRPcHRpb25zIH0gPSBwYXJzZUZvcm1hdFN0cihmKTtcblxuICAgICAgaWYgKHRoaXMuZm9ybWF0c1tmb3JtYXROYW1lXSkge1xuICAgICAgICBsZXQgZm9ybWF0dGVkID0gbWVtO1xuICAgICAgICB0cnkge1xuICAgICAgICAgIC8vIG9wdGlvbnMgcGFzc2VkIGV4cGxpY2l0IGZvciB0aGF0IGZvcm1hdHRlZCB2YWx1ZVxuICAgICAgICAgIGNvbnN0IHZhbE9wdGlvbnMgPSBvcHRpb25zPy5mb3JtYXRQYXJhbXM/LltvcHRpb25zLmludGVycG9sYXRpb25rZXldIHx8IHt9O1xuXG4gICAgICAgICAgLy8gbGFuZ3VhZ2VcbiAgICAgICAgICBjb25zdCBsID0gdmFsT3B0aW9ucy5sb2NhbGUgfHwgdmFsT3B0aW9ucy5sbmcgfHwgb3B0aW9ucy5sb2NhbGUgfHwgb3B0aW9ucy5sbmcgfHwgbG5nO1xuXG4gICAgICAgICAgZm9ybWF0dGVkID0gdGhpcy5mb3JtYXRzW2Zvcm1hdE5hbWVdKG1lbSwgbCwge1xuICAgICAgICAgICAgLi4uZm9ybWF0T3B0aW9ucyxcbiAgICAgICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICAgICAgICAuLi52YWxPcHRpb25zLFxuICAgICAgICAgIH0pO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgIHRoaXMubG9nZ2VyLndhcm4oZXJyb3IpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmb3JtYXR0ZWQ7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmxvZ2dlci53YXJuKGB0aGVyZSB3YXMgbm8gZm9ybWF0IGZ1bmN0aW9uIGZvciAke2Zvcm1hdE5hbWV9YCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gbWVtO1xuICAgIH0sIHZhbHVlKTtcblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgRm9ybWF0dGVyO1xuIiwiaW1wb3J0IHsgcHVzaFBhdGgsIGlzU3RyaW5nLCBjYWxsYmFja0FwaU9mIH0gZnJvbSAnLi91dGlscy5qcyc7XG5pbXBvcnQgYmFzZUxvZ2dlciBmcm9tICcuL2xvZ2dlci5qcyc7XG5pbXBvcnQgRXZlbnRFbWl0dGVyIGZyb20gJy4vRXZlbnRFbWl0dGVyLmpzJztcblxuLy8gQSBmYWlsZWQgbG9hZCBzdGF5cyBpbiB0aGUgc3RhdGUsIHNvIGl0IGlzIG5vdCByZWFkIGFnYWluIHVudGlsIGEgcmVsb2FkLiBMYW5ndWFnZXMgYW5kIG5hbWVzcGFjZXMgY2FuXG4vLyBjb21lIGZyb20gcmVxdWVzdHMgKGEgc2VydmVyJ3MgbGFuZ3VhZ2UgZGV0ZWN0aW9uLCBpMThuZXh0LWh0dHAtbWlkZGxld2FyZSdzIGdldFJlc291cmNlc0hhbmRsZXIpLCBzb1xuLy8gb25seSB0aGUgbW9zdCByZWNlbnQgZmFpbHVyZXMgc3RheTogb25lIGVudHJ5IHBlciBtYWRlLXVwIHZhbHVlIHdvdWxkIGdyb3cgd2l0aG91dCBlbmQuXG5jb25zdCBtYXhGYWlsZWRMb2FkcyA9IDEwMDA7XG5cbmNvbnN0IHJlbW92ZVBlbmRpbmcgPSAocSwgbmFtZSkgPT4ge1xuICBpZiAocS5wZW5kaW5nW25hbWVdICE9PSB1bmRlZmluZWQpIHtcbiAgICBkZWxldGUgcS5wZW5kaW5nW25hbWVdO1xuICAgIHEucGVuZGluZ0NvdW50LS07XG4gIH1cbn07XG5cbmNsYXNzIENvbm5lY3RvciBleHRlbmRzIEV2ZW50RW1pdHRlciB7XG4gIGNvbnN0cnVjdG9yKGJhY2tlbmQsIHN0b3JlLCBzZXJ2aWNlcywgb3B0aW9ucyA9IHt9KSB7XG4gICAgc3VwZXIoKTtcblxuICAgIHRoaXMuYmFja2VuZCA9IGJhY2tlbmQ7XG4gICAgdGhpcy5zdG9yZSA9IHN0b3JlO1xuICAgIHRoaXMuc2VydmljZXMgPSBzZXJ2aWNlcztcbiAgICB0aGlzLmxhbmd1YWdlVXRpbHMgPSBzZXJ2aWNlcy5sYW5ndWFnZVV0aWxzO1xuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG4gICAgdGhpcy5sb2dnZXIgPSAoc2VydmljZXMubG9nZ2VyIHx8IGJhc2VMb2dnZXIpLmNyZWF0ZSgnYmFja2VuZENvbm5lY3RvcicpO1xuXG4gICAgdGhpcy53YWl0aW5nUmVhZHMgPSBbXTtcbiAgICB0aGlzLm1heFBhcmFsbGVsUmVhZHMgPSBvcHRpb25zLm1heFBhcmFsbGVsUmVhZHMgfHwgMTA7XG4gICAgdGhpcy5yZWFkaW5nQ2FsbHMgPSAwO1xuXG4gICAgdGhpcy5tYXhSZXRyaWVzID0gb3B0aW9ucy5tYXhSZXRyaWVzID49IDAgPyBvcHRpb25zLm1heFJldHJpZXMgOiA1O1xuICAgIHRoaXMucmV0cnlUaW1lb3V0ID0gb3B0aW9ucy5yZXRyeVRpbWVvdXQgPj0gMSA/IG9wdGlvbnMucmV0cnlUaW1lb3V0IDogMzUwO1xuXG4gICAgdGhpcy5zdGF0ZSA9IHt9O1xuICAgIHRoaXMuZmFpbGVkID0gbmV3IFNldCgpO1xuICAgIHRoaXMucXVldWUgPSBbXTtcblxuICAgIHRoaXMuYmFja2VuZD8uaW5pdD8uKHNlcnZpY2VzLCBvcHRpb25zLmJhY2tlbmQsIG9wdGlvbnMpO1xuICAgIHRoaXMuY2FsbGJhY2tBcGkgPSBjYWxsYmFja0FwaU9mKHRoaXMuYmFja2VuZCk7XG4gICAgaWYgKFxuICAgICAgdGhpcy5iYWNrZW5kICYmXG4gICAgICB0aGlzLmNhbGxiYWNrQXBpID09PSB1bmRlZmluZWQgJiZcbiAgICAgICh0aGlzLmJhY2tlbmQucmVhZCB8fCB0aGlzLmJhY2tlbmQuY3JlYXRlKVxuICAgICkge1xuICAgICAgdGhpcy5sb2dnZXIuZGVwcmVjYXRlKFxuICAgICAgICAnYmFja2VuZDogc2V0IGNhbGxiYWNrQXBpIHRvIGRlY2xhcmUgdGhlIGNhbGxpbmcgY29udmVudGlvbiAodHJ1ZTogcmVhZChsYW5ndWFnZSwgbmFtZXNwYWNlLCBjYWxsYmFjaykgYW5kIGNyZWF0ZShsYW5ndWFnZXMsIG5hbWVzcGFjZSwga2V5LCBmYWxsYmFja1ZhbHVlLCBjYWxsYmFjaywgb3B0aW9ucyk7IGZhbHNlOiBib3RoIHJldHVybiBhIHByb21pc2Ugb3IgYSB2YWx1ZSk7IGd1ZXNzaW5nIGl0IGZyb20gdGhlIG51bWJlciBvZiBwYXJhbWV0ZXJzIGlzIGRlcHJlY2F0ZWQnLFxuICAgICAgKTtcbiAgICB9XG4gIH1cblxuICBxdWV1ZUxvYWQobGFuZ3VhZ2VzLCBuYW1lc3BhY2VzLCBvcHRpb25zLCBjYWxsYmFjaykge1xuICAgIC8vIGZpbmQgd2hhdCBuZWVkcyB0byBiZSBsb2FkZWRcbiAgICBjb25zdCB0b0xvYWQgPSB7fTtcbiAgICBjb25zdCBwZW5kaW5nID0ge307XG4gICAgY29uc3QgdG9Mb2FkTGFuZ3VhZ2VzID0ge307XG4gICAgY29uc3QgdG9Mb2FkTmFtZXNwYWNlcyA9IHt9O1xuXG4gICAgbGFuZ3VhZ2VzLmZvckVhY2goKGxuZykgPT4ge1xuICAgICAgbGV0IGhhc0FsbE5hbWVzcGFjZXMgPSB0cnVlO1xuXG4gICAgICBuYW1lc3BhY2VzLmZvckVhY2goKG5zKSA9PiB7XG4gICAgICAgIGNvbnN0IG5hbWUgPSBgJHtsbmd9fCR7bnN9YDtcblxuICAgICAgICBpZiAoIW9wdGlvbnMucmVsb2FkICYmIHRoaXMuc3RvcmUuaGFzUmVzb3VyY2VCdW5kbGUobG5nLCBucykpIHtcbiAgICAgICAgICB0aGlzLnN0YXRlW25hbWVdID0gMjsgLy8gbG9hZGVkXG4gICAgICAgIH0gZWxzZSBpZiAoIW9wdGlvbnMucmVsb2FkICYmIHRoaXMuc3RhdGVbbmFtZV0gPCAwKSB7XG4gICAgICAgICAgLy8gbm90aGluZyB0byBkbyBmb3IgZXJyOyBhIHJlbG9hZCB0cmllcyBhZ2FpblxuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuc3RhdGVbbmFtZV0gPT09IDEpIHtcbiAgICAgICAgICBpZiAocGVuZGluZ1tuYW1lXSA9PT0gdW5kZWZpbmVkKSBwZW5kaW5nW25hbWVdID0gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLnN0YXRlW25hbWVdID0gMTsgLy8gcGVuZGluZ1xuXG4gICAgICAgICAgaGFzQWxsTmFtZXNwYWNlcyA9IGZhbHNlO1xuXG4gICAgICAgICAgaWYgKHBlbmRpbmdbbmFtZV0gPT09IHVuZGVmaW5lZCkgcGVuZGluZ1tuYW1lXSA9IHRydWU7XG4gICAgICAgICAgaWYgKHRvTG9hZFtuYW1lXSA9PT0gdW5kZWZpbmVkKSB0b0xvYWRbbmFtZV0gPSB0cnVlO1xuICAgICAgICAgIGlmICh0b0xvYWROYW1lc3BhY2VzW25zXSA9PT0gdW5kZWZpbmVkKSB0b0xvYWROYW1lc3BhY2VzW25zXSA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICBpZiAoIWhhc0FsbE5hbWVzcGFjZXMpIHRvTG9hZExhbmd1YWdlc1tsbmddID0gdHJ1ZTtcbiAgICB9KTtcblxuICAgIGlmIChPYmplY3Qua2V5cyh0b0xvYWQpLmxlbmd0aCB8fCBPYmplY3Qua2V5cyhwZW5kaW5nKS5sZW5ndGgpIHtcbiAgICAgIHRoaXMucXVldWUucHVzaCh7XG4gICAgICAgIHBlbmRpbmcsXG4gICAgICAgIHBlbmRpbmdDb3VudDogT2JqZWN0LmtleXMocGVuZGluZykubGVuZ3RoLFxuICAgICAgICBsb2FkZWQ6IHt9LFxuICAgICAgICBlcnJvcnM6IFtdLFxuICAgICAgICBjYWxsYmFjayxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICB0b0xvYWQ6IE9iamVjdC5rZXlzKHRvTG9hZCksXG4gICAgICBwZW5kaW5nOiBPYmplY3Qua2V5cyhwZW5kaW5nKSxcbiAgICAgIHRvTG9hZExhbmd1YWdlczogT2JqZWN0LmtleXModG9Mb2FkTGFuZ3VhZ2VzKSxcbiAgICAgIHRvTG9hZE5hbWVzcGFjZXM6IE9iamVjdC5rZXlzKHRvTG9hZE5hbWVzcGFjZXMpLFxuICAgIH07XG4gIH1cblxuICBsb2FkZWQobmFtZSwgZXJyLCBkYXRhKSB7XG4gICAgY29uc3QgcyA9IG5hbWUuc3BsaXQoJ3wnKTtcbiAgICBjb25zdCBsbmcgPSBzWzBdO1xuICAgIGNvbnN0IG5zID0gc1sxXTtcblxuICAgIGlmIChlcnIpIHRoaXMuZW1pdCgnZmFpbGVkTG9hZGluZycsIGxuZywgbnMsIGVycik7XG5cbiAgICBpZiAoIWVyciAmJiBkYXRhKSB7XG4gICAgICB0aGlzLnN0b3JlLmFkZFJlc291cmNlQnVuZGxlKGxuZywgbnMsIGRhdGEsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCB7IHNraXBDb3B5OiB0cnVlIH0pO1xuICAgIH1cblxuICAgIC8vIHNldCBsb2FkZWRcbiAgICB0aGlzLnN0YXRlW25hbWVdID0gZXJyID8gLTEgOiAyO1xuICAgIGlmIChlcnIgJiYgZGF0YSkgdGhpcy5zdGF0ZVtuYW1lXSA9IDA7XG4gICAgdGhpcy5mYWlsZWQuZGVsZXRlKG5hbWUpO1xuICAgIGlmIChlcnIpIHtcbiAgICAgIHRoaXMuZmFpbGVkLmFkZChuYW1lKTtcbiAgICAgIGlmICh0aGlzLmZhaWxlZC5zaXplID4gbWF4RmFpbGVkTG9hZHMpIHtcbiAgICAgICAgY29uc3Qgb2xkZXN0ID0gdGhpcy5mYWlsZWQudmFsdWVzKCkubmV4dCgpLnZhbHVlO1xuICAgICAgICB0aGlzLmZhaWxlZC5kZWxldGUob2xkZXN0KTtcbiAgICAgICAgLy8gZm9yZ2V0IGl0IHVubGVzcyBpdCBpcyBiZWluZyByZWFkIGFnYWluOiBhIGxhdGVyIGxvYWQgcmVhZHMgaXQgYWdhaW5cbiAgICAgICAgaWYgKHRoaXMuc3RhdGVbb2xkZXN0XSA8IDEpIGRlbGV0ZSB0aGlzLnN0YXRlW29sZGVzdF07XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gY29uc29saWRhdGVkIGxvYWRpbmcgZG9uZSBpbiB0aGlzIHJ1biAtIG9ubHkgZW1pdCBvbmNlIGZvciBhIGxvYWRlZCBuYW1lc3BhY2VcbiAgICBjb25zdCBsb2FkZWQgPSB7fTtcbiAgICAvLyBhbiBlcnJvciB0aHJvd24gYnkgYSBjYWxsYmFjazogdGhlIG90aGVyIGNhbGxiYWNrcyBhbmQgdGhlIGxvYWRlZCBldmVudCBzdGlsbCBydW4sIHRoZW4gaXQgaXMgdGhyb3duIG9uXG4gICAgY29uc3QgdGhyb3duID0gW107XG5cbiAgICAvLyBjYWxsYmFjayBpZiByZWFkeVxuICAgIHRoaXMucXVldWUuZm9yRWFjaCgocSkgPT4ge1xuICAgICAgcHVzaFBhdGgocS5sb2FkZWQsIFtsbmddLCBucyk7XG4gICAgICByZW1vdmVQZW5kaW5nKHEsIG5hbWUpO1xuXG4gICAgICBpZiAoZXJyKSBxLmVycm9ycy5wdXNoKGVycik7XG5cbiAgICAgIGlmIChxLnBlbmRpbmdDb3VudCA9PT0gMCAmJiAhcS5kb25lKSB7XG4gICAgICAgIC8vIG9ubHkgZG8gb25jZSBwZXIgbG9hZGVkIC0+IHRoaXMuZW1pdCgnbG9hZGVkJywgcS5sb2FkZWQpO1xuICAgICAgICBPYmplY3Qua2V5cyhxLmxvYWRlZCkuZm9yRWFjaCgobCkgPT4ge1xuICAgICAgICAgIGlmICghT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKGxvYWRlZCwgbCkpIGxvYWRlZFtsXSA9IHt9O1xuICAgICAgICAgIGNvbnN0IGxvYWRlZEtleXMgPSBxLmxvYWRlZFtsXTtcbiAgICAgICAgICBpZiAobG9hZGVkS2V5cy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGxvYWRlZEtleXMuZm9yRWFjaCgobikgPT4ge1xuICAgICAgICAgICAgICBpZiAobG9hZGVkW2xdW25dID09PSB1bmRlZmluZWQpIGxvYWRlZFtsXVtuXSA9IHRydWU7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHEuZG9uZSA9IHRydWU7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgaWYgKHEuZXJyb3JzLmxlbmd0aCkge1xuICAgICAgICAgICAgcS5jYWxsYmFjayhxLmVycm9ycyk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHEuY2FsbGJhY2soKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICB0aHJvd24ucHVzaChlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gcmVtb3ZlIGRvbmUgbG9hZCByZXF1ZXN0c1xuICAgIHRoaXMucXVldWUgPSB0aGlzLnF1ZXVlLmZpbHRlcigocSkgPT4gIXEuZG9uZSk7XG5cbiAgICAvLyBlbWl0IGNvbnNvbGlkYXRlZCBsb2FkZWQgZXZlbnRcbiAgICB0aGlzLmVtaXQoJ2xvYWRlZCcsIGxvYWRlZCk7XG5cbiAgICBpZiAodGhyb3duLmxlbmd0aCkgdGhyb3cgdGhyb3duWzBdO1xuICB9XG5cbiAgcmVhZChsbmcsIG5zLCBmY05hbWUsIHRyaWVkID0gMCwgd2FpdCA9IHRoaXMucmV0cnlUaW1lb3V0LCBjYWxsYmFjaykge1xuICAgIGlmICghbG5nLmxlbmd0aCkgcmV0dXJuIGNhbGxiYWNrKG51bGwsIHt9KTsgLy8gbm90aW5nIHRvIGxvYWRcblxuICAgIC8vIExpbWl0IHBhcmFsbGVsaXNtIG9mIGNhbGxzIHRvIGJhY2tlbmRcbiAgICAvLyBUaGlzIGlzIG5lZWRlZCB0byBwcmV2ZW50IHRyeWluZyB0byBvcGVuIHRob3VzYW5kcyBvZlxuICAgIC8vIHNvY2tldHMgb3IgZmlsZSBkZXNjcmlwdG9ycywgd2hpY2ggY2FuIGNhdXNlIGZhaWx1cmVzXG4gICAgLy8gYW5kIGFjdHVhbGx5IG1ha2UgdGhlIGVudGlyZSBwcm9jZXNzIHRha2UgbG9uZ2VyLlxuICAgIGlmICh0aGlzLnJlYWRpbmdDYWxscyA+PSB0aGlzLm1heFBhcmFsbGVsUmVhZHMpIHtcbiAgICAgIHRoaXMud2FpdGluZ1JlYWRzLnB1c2goeyBsbmcsIG5zLCBmY05hbWUsIHRyaWVkLCB3YWl0LCBjYWxsYmFjayB9KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5yZWFkaW5nQ2FsbHMrKztcblxuICAgIGNvbnN0IHJlc29sdmVyID0gKGVyciwgZGF0YSkgPT4ge1xuICAgICAgdGhpcy5yZWFkaW5nQ2FsbHMtLTtcbiAgICAgIGlmICh0aGlzLndhaXRpbmdSZWFkcy5sZW5ndGggPiAwKSB7XG4gICAgICAgIGNvbnN0IG5leHQgPSB0aGlzLndhaXRpbmdSZWFkcy5zaGlmdCgpO1xuICAgICAgICB0aGlzLnJlYWQobmV4dC5sbmcsIG5leHQubnMsIG5leHQuZmNOYW1lLCBuZXh0LnRyaWVkLCBuZXh0LndhaXQsIG5leHQuY2FsbGJhY2spO1xuICAgICAgfVxuICAgICAgaWYgKGVyciAmJiBkYXRhIC8qID0gcmV0cnlGbGFnICovICYmIHRyaWVkIDwgdGhpcy5tYXhSZXRyaWVzKSB7XG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgIHRoaXMucmVhZChsbmcsIG5zLCBmY05hbWUsIHRyaWVkICsgMSwgd2FpdCAqIDIsIGNhbGxiYWNrKTtcbiAgICAgICAgfSwgd2FpdCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGNhbGxiYWNrKGVyciwgZGF0YSk7XG4gICAgfTtcblxuICAgIGNvbnN0IGZjID0gdGhpcy5iYWNrZW5kW2ZjTmFtZV0uYmluZCh0aGlzLmJhY2tlbmQpO1xuICAgIGlmICh0aGlzLmNhbGxiYWNrQXBpID09PSBmYWxzZSB8fCAodGhpcy5jYWxsYmFja0FwaSA9PT0gdW5kZWZpbmVkICYmIGZjLmxlbmd0aCA9PT0gMikpIHtcbiAgICAgIC8vIG5vIGNhbGxiYWNrXG4gICAgICBsZXQgcjtcbiAgICAgIHRyeSB7XG4gICAgICAgIHIgPSBmYyhsbmcsIG5zKTtcbiAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICByZXNvbHZlcihlcnIpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICAvLyBvdXRzaWRlIHRoZSB0cnkgYW5kIG5vdCB3aXRoIC5jYXRjaCgpOiBhbiBlcnJvciB0aHJvd24gYnkgdGhlIGNhbGxiYWNrIG11c3Qgbm90IGNhbGwgdGhlIHJlc29sdmVyIGFnYWluXG4gICAgICBpZiAociAmJiB0eXBlb2Ygci50aGVuID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIC8vIHByb21pc2VcbiAgICAgICAgci50aGVuKChkYXRhKSA9PiByZXNvbHZlcihudWxsLCBkYXRhKSwgcmVzb2x2ZXIpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gc3luY1xuICAgICAgICByZXNvbHZlcihudWxsLCByKTtcbiAgICAgIH1cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBub3JtYWwgd2l0aCBjYWxsYmFja1xuICAgIHJldHVybiBmYyhsbmcsIG5zLCByZXNvbHZlcik7XG4gIH1cblxuICBwcmVwYXJlTG9hZGluZyhsYW5ndWFnZXMsIG5hbWVzcGFjZXMsIG9wdGlvbnMgPSB7fSwgY2FsbGJhY2spIHtcbiAgICBpZiAoIXRoaXMuYmFja2VuZCkge1xuICAgICAgdGhpcy5sb2dnZXIud2FybignTm8gYmFja2VuZCB3YXMgYWRkZWQgdmlhIGkxOG5leHQudXNlLiBXaWxsIG5vdCBsb2FkIHJlc291cmNlcy4nKTtcbiAgICAgIHJldHVybiBjYWxsYmFjayAmJiBjYWxsYmFjaygpO1xuICAgIH1cblxuICAgIGlmIChpc1N0cmluZyhsYW5ndWFnZXMpKSBsYW5ndWFnZXMgPSB0aGlzLmxhbmd1YWdlVXRpbHMudG9SZXNvbHZlSGllcmFyY2h5KGxhbmd1YWdlcyk7XG4gICAgaWYgKGlzU3RyaW5nKG5hbWVzcGFjZXMpKSBuYW1lc3BhY2VzID0gW25hbWVzcGFjZXNdO1xuXG4gICAgY29uc3QgdG9Mb2FkID0gdGhpcy5xdWV1ZUxvYWQobGFuZ3VhZ2VzLCBuYW1lc3BhY2VzLCBvcHRpb25zLCBjYWxsYmFjayk7XG4gICAgaWYgKCF0b0xvYWQudG9Mb2FkLmxlbmd0aCkge1xuICAgICAgaWYgKCF0b0xvYWQucGVuZGluZy5sZW5ndGgpIGNhbGxiYWNrKCk7IC8vIG5vdGhpbmcgdG8gbG9hZCBhbmQgbm8gcGVuZGluZ3MuLi5jYWxsYmFjayBub3dcbiAgICAgIHJldHVybiBudWxsOyAvLyBwZW5kaW5ncyB3aWxsIHRyaWdnZXIgY2FsbGJhY2tcbiAgICB9XG5cbiAgICB0b0xvYWQudG9Mb2FkLmZvckVhY2goKG5hbWUpID0+IHtcbiAgICAgIHRoaXMubG9hZE9uZShuYW1lKTtcbiAgICB9KTtcbiAgfVxuXG4gIGxvYWQobGFuZ3VhZ2VzLCBuYW1lc3BhY2VzLCBjYWxsYmFjaykge1xuICAgIHRoaXMucHJlcGFyZUxvYWRpbmcobGFuZ3VhZ2VzLCBuYW1lc3BhY2VzLCB7fSwgY2FsbGJhY2spO1xuICB9XG5cbiAgcmVsb2FkKGxhbmd1YWdlcywgbmFtZXNwYWNlcywgY2FsbGJhY2spIHtcbiAgICB0aGlzLnByZXBhcmVMb2FkaW5nKGxhbmd1YWdlcywgbmFtZXNwYWNlcywgeyByZWxvYWQ6IHRydWUgfSwgY2FsbGJhY2spO1xuICB9XG5cbiAgbG9hZE9uZShuYW1lLCBwcmVmaXggPSAnJykge1xuICAgIGNvbnN0IHMgPSBuYW1lLnNwbGl0KCd8Jyk7XG4gICAgY29uc3QgbG5nID0gc1swXTtcbiAgICBjb25zdCBucyA9IHNbMV07XG5cbiAgICB0aGlzLnJlYWQobG5nLCBucywgJ3JlYWQnLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgaWYgKGVycikgdGhpcy5sb2dnZXIud2FybihgJHtwcmVmaXh9bG9hZGluZyBuYW1lc3BhY2UgJHtuc30gZm9yIGxhbmd1YWdlICR7bG5nfSBmYWlsZWRgLCBlcnIpO1xuICAgICAgaWYgKCFlcnIgJiYgZGF0YSlcbiAgICAgICAgdGhpcy5sb2dnZXIubG9nKGAke3ByZWZpeH1sb2FkZWQgbmFtZXNwYWNlICR7bnN9IGZvciBsYW5ndWFnZSAke2xuZ31gLCBkYXRhKTtcblxuICAgICAgdGhpcy5sb2FkZWQobmFtZSwgZXJyLCBkYXRhKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8vIGhhc0xvYWRlZE5hbWVzcGFjZTogdGhlIGNoZWNrIG9mIHRoZSBjYWxsaW5nIGluc3RhbmNlOyB0aGUgY29ubmVjdG9yIChhbmQgaXRzIHNlcnZpY2VzKSBpcyBzaGFyZWQgd2l0aCBhbGwgY2xvbmVzLFxuICAvLyBzbyBhIGRpcmVjdCBjYWxsIHdpdGhvdXQgaXQgY2hlY2tzIHRoZSBuZXdlc3QgY2xvbmUsIG9yIHRoZSBpbnN0YW5jZSB0aGF0IGNyZWF0ZWQgdGhlIGNvbm5lY3RvclxuICBzYXZlTWlzc2luZyhcbiAgICBsYW5ndWFnZXMsXG4gICAgbmFtZXNwYWNlLFxuICAgIGtleSxcbiAgICBmYWxsYmFja1ZhbHVlLFxuICAgIGlzVXBkYXRlLFxuICAgIG9wdGlvbnMgPSB7fSxcbiAgICBjbGIgPSAoKSA9PiB7fSxcbiAgICBoYXNMb2FkZWROYW1lc3BhY2UgPSB0aGlzLm5ld2VzdENsb25lSGFzTG9hZGVkTmFtZXNwYWNlIHx8XG4gICAgICB0aGlzLnNlcnZpY2VzPy51dGlscz8uaGFzTG9hZGVkTmFtZXNwYWNlLFxuICApIHtcbiAgICBpZiAoaGFzTG9hZGVkTmFtZXNwYWNlICYmICFoYXNMb2FkZWROYW1lc3BhY2UobmFtZXNwYWNlKSkge1xuICAgICAgdGhpcy5sb2dnZXIud2FybihcbiAgICAgICAgYGRpZCBub3Qgc2F2ZSBrZXkgXCIke2tleX1cIiBhcyB0aGUgbmFtZXNwYWNlIFwiJHtuYW1lc3BhY2V9XCIgd2FzIG5vdCB5ZXQgbG9hZGVkYCxcbiAgICAgICAgJ1RoaXMgbWVhbnMgc29tZXRoaW5nIElTIFdST05HIGluIHlvdXIgc2V0dXAuIFlvdSBhY2Nlc3MgdGhlIHQgZnVuY3Rpb24gYmVmb3JlIGkxOG5leHQuaW5pdCAvIGkxOG5leHQubG9hZE5hbWVzcGFjZSAvIGkxOG5leHQuY2hhbmdlTGFuZ3VhZ2Ugd2FzIGRvbmUuIFdhaXQgZm9yIHRoZSBjYWxsYmFjayBvciBQcm9taXNlIHRvIHJlc29sdmUgYmVmb3JlIGFjY2Vzc2luZyBpdCEhIScsXG4gICAgICApO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIGlnbm9yZSBub24gdmFsaWQga2V5c1xuICAgIGlmIChrZXkgPT09IHVuZGVmaW5lZCB8fCBrZXkgPT09IG51bGwgfHwga2V5ID09PSAnJykgcmV0dXJuO1xuXG4gICAgaWYgKHRoaXMuYmFja2VuZD8uY3JlYXRlKSB7XG4gICAgICBjb25zdCBvcHRzID0ge1xuICAgICAgICAuLi5vcHRpb25zLFxuICAgICAgICBpc1VwZGF0ZSxcbiAgICAgIH07XG4gICAgICBjb25zdCBmYyA9IHRoaXMuYmFja2VuZC5jcmVhdGUuYmluZCh0aGlzLmJhY2tlbmQpO1xuICAgICAgaWYgKHRoaXMuY2FsbGJhY2tBcGkgPT09IGZhbHNlIHx8ICh0aGlzLmNhbGxiYWNrQXBpID09PSB1bmRlZmluZWQgJiYgZmMubGVuZ3RoIDwgNikpIHtcbiAgICAgICAgLy8gbm8gY2FsbGJhY2tcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBsZXQgcjtcbiAgICAgICAgICBpZiAodGhpcy5jYWxsYmFja0FwaSA9PT0gZmFsc2UgfHwgZmMubGVuZ3RoID09PSA1KSB7XG4gICAgICAgICAgICAvLyBmdXR1cmUgY2FsbGJhY2stbGVzcyBhcGkgZm9yIGkxOG5leHQtbG9jaXplLWJhY2tlbmRcbiAgICAgICAgICAgIHIgPSBmYyhsYW5ndWFnZXMsIG5hbWVzcGFjZSwga2V5LCBmYWxsYmFja1ZhbHVlLCBvcHRzKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgciA9IGZjKGxhbmd1YWdlcywgbmFtZXNwYWNlLCBrZXksIGZhbGxiYWNrVmFsdWUpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAociAmJiB0eXBlb2Ygci50aGVuID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAvLyBwcm9taXNlXG4gICAgICAgICAgICByLnRoZW4oKGRhdGEpID0+IGNsYihudWxsLCBkYXRhKSkuY2F0Y2goY2xiKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gc3luY1xuICAgICAgICAgICAgY2xiKG51bGwsIHIpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgY2xiKGVycik7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIG5vcm1hbCB3aXRoIGNhbGxiYWNrXG4gICAgICAgIGZjKGxhbmd1YWdlcywgbmFtZXNwYWNlLCBrZXksIGZhbGxiYWNrVmFsdWUsIGNsYiAvKiB1bnVzZWQgY2FsbGJhY2sgKi8sIG9wdHMpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIHdyaXRlIHRvIHN0b3JlIHRvIGF2b2lkIHJlc2VuZGluZ1xuICAgIGlmICghbGFuZ3VhZ2VzIHx8ICFsYW5ndWFnZXNbMF0pIHJldHVybjtcbiAgICB0aGlzLnN0b3JlLmFkZFJlc291cmNlKGxhbmd1YWdlc1swXSwgbmFtZXNwYWNlLCBrZXksIGZhbGxiYWNrVmFsdWUpO1xuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IENvbm5lY3RvcjtcbiIsImltcG9ydCB7IGlzU3RyaW5nIH0gZnJvbSAnLi91dGlscy5qcyc7XG5cbmV4cG9ydCBjb25zdCBnZXQgPSAoKSA9PiAoe1xuICBkZWJ1ZzogZmFsc2UsXG4gIGluaXRBc3luYzogdHJ1ZSxcblxuICBuczogWyd0cmFuc2xhdGlvbiddLFxuICBkZWZhdWx0TlM6IFsndHJhbnNsYXRpb24nXSxcbiAgZmFsbGJhY2tMbmc6IGZhbHNlLCAvLyBzdHJpbmcsIGFycmF5LCBvYmplY3Qgb3IgZnVuY3Rpb247ICdkZXYnIG9ubHkgd2hlbiBzZXRcbiAgZmFsbGJhY2tOUzogZmFsc2UsIC8vIHN0cmluZyBvciBhcnJheSBvZiBuYW1lc3BhY2VzXG5cbiAgc3VwcG9ydGVkTG5nczogZmFsc2UsIC8vIGFycmF5IHdpdGggc3VwcG9ydGVkIGxhbmd1YWdlc1xuICBub25FeHBsaWNpdFN1cHBvcnRlZExuZ3M6IGZhbHNlLFxuICBsb2FkOiAnYWxsJywgLy8gfCBjdXJyZW50T25seSB8IGxhbmd1YWdlT25seVxuICBwcmVsb2FkOiBmYWxzZSwgLy8gYXJyYXkgd2l0aCBwcmVsb2FkIGxhbmd1YWdlc1xuXG4gIGtleVNlcGFyYXRvcjogJy4nLFxuICBuc1NlcGFyYXRvcjogJzonLFxuICBwbHVyYWxTZXBhcmF0b3I6ICdfJyxcbiAgY29udGV4dFNlcGFyYXRvcjogJ18nLFxuXG4gIC8vIFNlbGVjdG9yIEFQSSBydW50aW1lIG1vZGUuIE1pcnJvcnMgdGhlIFR5cGVPcHRpb25zIGBlbmFibGVTZWxlY3RvcmAgZmxhZy5cbiAgLy8gLSBmYWxzZSAvIHRydWUgLyAnb3B0aW1pemUnOiBsZWdhY3kgcnVsZSDigJQgb25seSBhIGxlYWRpbmcgKnNlY29uZGFyeSogbmFtZXNwYWNlXG4gIC8vICAgaW4gYSBtdWx0aS1lbGVtZW50IG5zIGFycmF5IGlzIHJld3JpdHRlbiBhcyBhIG5hbWVzcGFjZSBwcmVmaXggKHYyNS44LjE5KVxuICAvLyAtICdzdHJpY3QnOiBhbHdheXMgdHJlYXQgcGF0aFswXSBhcyBhIG5hbWVzcGFjZSBwcmVmaXggd2hlbiBpdCBtYXRjaGVzIHRoZVxuICAvLyAgIHNjb3BlJ3MgbmFtZXNwYWNlIGxpc3QsIGluY2x1ZGluZyB0aGUgcHJpbWFyeSBhbmQgc2luZ2xlLW5zIGhvb2tzLlxuICAvLyAgIFBhaXJzIHdpdGggYE5zUmVzb3VyY2VgIGRyb3BwaW5nIGl0cyBmbGF0dGVuZWQtcHJpbWFyeSB1bmlvbiBhdCB0aGUgdHlwZVxuICAvLyAgIGxldmVsLiBPcHQtaW47IGRlZmF1bHQgYmVoYXZpb3IgaXMgdW5jaGFuZ2VkLlxuICBlbmFibGVTZWxlY3RvcjogZmFsc2UsXG5cbiAgcGFydGlhbEJ1bmRsZWRMYW5ndWFnZXM6IGZhbHNlLCAvLyBhbGxvdyBidW5kbGluZyBjZXJ0YWluIGxhbmd1YWdlcyB0aGF0IGFyZSBub3QgcmVtb3RlbHkgZmV0Y2hlZFxuICBzYXZlTWlzc2luZzogZmFsc2UsIC8vIGVuYWJsZSB0byBzZW5kIG1pc3NpbmcgdmFsdWVzXG4gIHVwZGF0ZU1pc3Npbmc6IGZhbHNlLCAvLyBlbmFibGUgdG8gdXBkYXRlIGRlZmF1bHQgdmFsdWVzIGlmIGRpZmZlcmVudCBmcm9tIHRyYW5zbGF0ZWQgdmFsdWUgKG9ubHkgdXNlZnVsIG9uIGluaXRpYWwgZGV2ZWxvcG1lbnQsIG9yIHdoZW4ga2VlcGluZyBjb2RlIGFzIHNvdXJjZSBvZiB0cnV0aClcbiAgc2F2ZU1pc3NpbmdUbzogJ2ZhbGxiYWNrJywgLy8gJ2N1cnJlbnQnIHx8ICdhbGwnXG4gIHNhdmVNaXNzaW5nUGx1cmFsczogdHJ1ZSwgLy8gd2lsbCBzYXZlIGFsbCBmb3JtcyBub3Qgb25seSBzaW5ndWxhciBrZXlcbiAgbWlzc2luZ0tleUhhbmRsZXI6IGZhbHNlLCAvLyBmdW5jdGlvbihsbmcsIG5zLCBrZXksIGZhbGxiYWNrVmFsdWUpIC0+IG92ZXJyaWRlIGlmIHByZWZlciBvbiBoYW5kbGluZ1xuICBtaXNzaW5nSW50ZXJwb2xhdGlvbkhhbmRsZXI6IGZhbHNlLCAvLyBmdW5jdGlvbihzdHIsIG1hdGNoKVxuXG4gIHBvc3RQcm9jZXNzOiBmYWxzZSwgLy8gc3RyaW5nIG9yIGFycmF5IG9mIHBvc3RQcm9jZXNzb3IgbmFtZXNcbiAgcG9zdFByb2Nlc3NQYXNzUmVzb2x2ZWQ6IGZhbHNlLCAvLyBwYXNzIHJlc29sdmVkIG9iamVjdCBpbnRvICdvcHRpb25zLmkxOG5SZXNvbHZlZCcgZm9yIHBvc3Rwcm9jZXNzb3JcbiAgcmV0dXJuTnVsbDogZmFsc2UsIC8vIGFsbG93cyBudWxsIHZhbHVlIGFzIHZhbGlkIHRyYW5zbGF0aW9uXG4gIHJldHVybkVtcHR5U3RyaW5nOiBmYWxzZSwgLy8gYW4gZW1wdHkgc3RyaW5nIGZhbGxzIGJhY2sgbGlrZSBhIG1pc3NpbmcgdmFsdWVcbiAgcmV0dXJuT2JqZWN0czogZmFsc2UsXG4gIGpvaW5BcnJheXM6IGZhbHNlLCAvLyBvciBzdHJpbmcgdG8gam9pbiBhcnJheVxuICByZXR1cm5lZE9iamVjdEhhbmRsZXI6IGZhbHNlLCAvLyBmdW5jdGlvbihrZXksIHZhbHVlLCBvcHRpb25zKSB0cmlnZ2VyZWQgaWYga2V5IHJldHVybnMgb2JqZWN0IGJ1dCByZXR1cm5PYmplY3RzIGlzIHNldCB0byBmYWxzZVxuICBwYXJzZU1pc3NpbmdLZXlIYW5kbGVyOiBmYWxzZSwgLy8gZnVuY3Rpb24oa2V5KSBwYXJzZWQgYSBrZXkgdGhhdCB3YXMgbm90IGZvdW5kIGluIHQoKSBiZWZvcmUgcmV0dXJuaW5nXG4gIGFwcGVuZE5hbWVzcGFjZVRvTWlzc2luZ0tleTogZmFsc2UsXG4gIGFwcGVuZE5hbWVzcGFjZVRvQ0lNb2RlOiBmYWxzZSxcbiAgb3ZlcmxvYWRUcmFuc2xhdGlvbk9wdGlvbkhhbmRsZXI6IChhcmdzKSA9PiB7XG4gICAgbGV0IHJldCA9IHt9O1xuICAgIGlmICh0eXBlb2YgYXJnc1sxXSA9PT0gJ29iamVjdCcpIHJldCA9IGFyZ3NbMV07XG4gICAgaWYgKGlzU3RyaW5nKGFyZ3NbMV0pKSByZXQuZGVmYXVsdFZhbHVlID0gYXJnc1sxXTtcbiAgICBpZiAoaXNTdHJpbmcoYXJnc1syXSkpIHJldC50RGVzY3JpcHRpb24gPSBhcmdzWzJdO1xuICAgIGlmICh0eXBlb2YgYXJnc1syXSA9PT0gJ29iamVjdCcgfHwgdHlwZW9mIGFyZ3NbM10gPT09ICdvYmplY3QnKSB7XG4gICAgICBjb25zdCBvcHRpb25zID0gYXJnc1szXSB8fCBhcmdzWzJdO1xuICAgICAgT2JqZWN0LmtleXMob3B0aW9ucykuZm9yRWFjaCgoa2V5KSA9PiB7XG4gICAgICAgIHJldFtrZXldID0gb3B0aW9uc1trZXldO1xuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiByZXQ7XG4gIH0sXG4gIGludGVycG9sYXRpb246IHtcbiAgICBlc2NhcGVWYWx1ZTogdHJ1ZSxcbiAgICBwcmVmaXg6ICd7eycsXG4gICAgc3VmZml4OiAnfX0nLFxuICAgIGZvcm1hdFNlcGFyYXRvcjogJywnLFxuICAgIC8vIHVuZXNjYXBlU3VmZml4OiAnJyxcbiAgICB1bmVzY2FwZVByZWZpeDogJy0nLFxuXG4gICAgbmVzdGluZ1ByZWZpeDogJyR0KCcsXG4gICAgbmVzdGluZ1N1ZmZpeDogJyknLFxuICAgIG5lc3RpbmdPcHRpb25zU2VwYXJhdG9yOiAnLCcsXG4gICAgLy8gZGVmYXVsdFZhcmlhYmxlczogdW5kZWZpbmVkIC8vIG9iamVjdCB0aGF0IGNhbiBoYXZlIHZhbHVlcyB0byBpbnRlcnBvbGF0ZSBvbiAtIGV4dGVuZHMgcGFzc2VkIGluIGludGVycG9sYXRpb24gZGF0YVxuICAgIG1heFJlcGxhY2VzOiAxMDAwLCAvLyBtYXggcmVwbGFjZXMgdG8gcHJldmVudCBlbmRsZXNzIGxvb3BcbiAgICBza2lwT25WYXJpYWJsZXM6IHRydWUsXG4gIH0sXG4gIGNhY2hlSW5CdWlsdEZvcm1hdHM6IHRydWUsXG59KTtcblxuZXhwb3J0IGNvbnN0IHRyYW5zZm9ybU9wdGlvbnMgPSAob3B0aW9ucykgPT4ge1xuICAvLyBjcmVhdGUgbmFtZXNwYWNlIG9iamVjdCBpZiBuYW1lc3BhY2UgaXMgcGFzc2VkIGluIGFzIHN0cmluZ1xuICBpZiAoaXNTdHJpbmcob3B0aW9ucy5ucykpIG9wdGlvbnMubnMgPSBbb3B0aW9ucy5uc107XG4gIGlmIChpc1N0cmluZyhvcHRpb25zLmZhbGxiYWNrTG5nKSkgb3B0aW9ucy5mYWxsYmFja0xuZyA9IFtvcHRpb25zLmZhbGxiYWNrTG5nXTtcbiAgaWYgKGlzU3RyaW5nKG9wdGlvbnMuZmFsbGJhY2tOUykpIG9wdGlvbnMuZmFsbGJhY2tOUyA9IFtvcHRpb25zLmZhbGxiYWNrTlNdO1xuXG4gIC8vIGV4dGVuZCBzdXBwb3J0ZWRMbmdzIHdpdGggY2ltb2RlXG4gIGlmIChvcHRpb25zLnN1cHBvcnRlZExuZ3MgJiYgIW9wdGlvbnMuc3VwcG9ydGVkTG5ncy5pbmNsdWRlcygnY2ltb2RlJykpIHtcbiAgICBvcHRpb25zLnN1cHBvcnRlZExuZ3MgPSBvcHRpb25zLnN1cHBvcnRlZExuZ3MuY29uY2F0KFsnY2ltb2RlJ10pO1xuICB9XG5cbiAgcmV0dXJuIG9wdGlvbnM7XG59O1xuIiwiaW1wb3J0IHsgTG9nZ2VyIH0gZnJvbSAnLi9sb2dnZXIuanMnO1xuaW1wb3J0IEV2ZW50RW1pdHRlciBmcm9tICcuL0V2ZW50RW1pdHRlci5qcyc7XG5pbXBvcnQgUmVzb3VyY2VTdG9yZSBmcm9tICcuL1Jlc291cmNlU3RvcmUuanMnO1xuaW1wb3J0IFRyYW5zbGF0b3IgZnJvbSAnLi9UcmFuc2xhdG9yLmpzJztcbmltcG9ydCBMYW5ndWFnZVV0aWxzIGZyb20gJy4vTGFuZ3VhZ2VVdGlscy5qcyc7XG5pbXBvcnQgUGx1cmFsUmVzb2x2ZXIgZnJvbSAnLi9QbHVyYWxSZXNvbHZlci5qcyc7XG5pbXBvcnQgSW50ZXJwb2xhdG9yIGZyb20gJy4vSW50ZXJwb2xhdG9yLmpzJztcbmltcG9ydCBGb3JtYXR0ZXIgZnJvbSAnLi9Gb3JtYXR0ZXIuanMnO1xuaW1wb3J0IEJhY2tlbmRDb25uZWN0b3IgZnJvbSAnLi9CYWNrZW5kQ29ubmVjdG9yLmpzJztcbmltcG9ydCB7IGdldCBhcyBnZXREZWZhdWx0cywgdHJhbnNmb3JtT3B0aW9ucyB9IGZyb20gJy4vZGVmYXVsdHMuanMnO1xuaW1wb3J0IHsgZGVmZXIsIGlzU3RyaW5nLCBjYWxsYmFja0FwaU9mLCBpc1NhZmVMYW5ndWFnZUNvZGUgfSBmcm9tICcuL3V0aWxzLmpzJztcbmltcG9ydCBrZXlzRnJvbVNlbGVjdG9yIGZyb20gJy4vc2VsZWN0b3IuanMnO1xuXG5jb25zdCBub29wID0gKCkgPT4ge31cblxuLy8gZGVmYXVsdHMgdW5kZXIgdGhlIGdpdmVuIG9wdGlvbnMsIHdpdGggdGhlIGludGVycG9sYXRpb24gb3B0aW9ucyBtZXJnZWQgb25lIGxldmVsIGRlZXBcbmNvbnN0IHdpdGhEZWZhdWx0cyA9IChvcHRpb25zKSA9PiB7XG4gIGNvbnN0IGRlZk9wdHMgPSBnZXREZWZhdWx0cygpO1xuICBjb25zdCBtZXJnZWQgPSB7IC4uLmRlZk9wdHMsIC4uLm9wdGlvbnMgfTtcbiAgbWVyZ2VkLmludGVycG9sYXRpb24gPSB7IC4uLmRlZk9wdHMuaW50ZXJwb2xhdGlvbiwgLi4ub3B0aW9ucy5pbnRlcnBvbGF0aW9uIH07IC8vIGRvIG5vdCB1c2UgcmVmZXJlbmNlXG4gIGlmICh0eXBlb2YgbWVyZ2VkLm92ZXJsb2FkVHJhbnNsYXRpb25PcHRpb25IYW5kbGVyICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgbWVyZ2VkLm92ZXJsb2FkVHJhbnNsYXRpb25PcHRpb25IYW5kbGVyID0gZGVmT3B0cy5vdmVybG9hZFRyYW5zbGF0aW9uT3B0aW9uSGFuZGxlcjtcbiAgfVxuICByZXR1cm4gbWVyZ2VkO1xufTtcblxuLy8gVGhlIGxhbmd1YWdlIGNvZGVzIHRoZSB1c2VyIGNvbmZpZ3VyZWQgYXQgaW5pdCgpIChzdXBwb3J0ZWRMbmdzLCBhIGZhbGxiYWNrTG5nIHRoYXQgaXMgbm90IGEgZnVuY3Rpb24sXG4vLyBwcmVsb2FkLCB0aGUgbGFuZ3VhZ2VzIGluIHJlc291cmNlcyk6IGNoYW5nZUxhbmd1YWdlKCkgYW5kIGxvYWRMYW5ndWFnZXMoKSB0YWtlIHRoZW0gd2hhdGV2ZXIgdGhlaXIgc2hhcGUuXG4vLyBUYWtlbiBmcm9tIHRoZSBvcHRpb25zIGFzIHBhc3NlZCwgc28gbmVpdGhlciBsb2FkTGFuZ3VhZ2VzKCkgKGl0IGV4dGVuZHMgcHJlbG9hZCkgbm9yIGFkZGVkIHJlc291cmNlcywgbm9yXG4vLyBhIGZhbGxiYWNrTG5nIGZ1bmN0aW9uIHRoYXQgcmV0dXJucyB0aGUgY29kZSBpdCBnZXRzLCBjYW4gbWFrZSBhbiBvdXRzaWRlIGNvZGUgY291bnQgYXMgY29uZmlndXJlZC5cbmNvbnN0IGNvbmZpZ3VyZWRMYW5ndWFnZUNvZGVzID0gKG9wdGlvbnMpID0+IHtcbiAgY29uc3QgY29kZXMgPSBbXS5jb25jYXQob3B0aW9ucy5zdXBwb3J0ZWRMbmdzIHx8IFtdLCBvcHRpb25zLnByZWxvYWQgfHwgW10pO1xuICBjb2Rlcy5wdXNoKC4uLk9iamVjdC5rZXlzKG9wdGlvbnMucmVzb3VyY2VzIHx8IHt9KSk7XG4gIGNvbnN0IGZhbGxiYWNrTG5nID0gb3B0aW9ucy5mYWxsYmFja0xuZztcbiAgaWYgKGlzU3RyaW5nKGZhbGxiYWNrTG5nKSB8fCBBcnJheS5pc0FycmF5KGZhbGxiYWNrTG5nKSkgY29kZXMucHVzaCguLi5bXS5jb25jYXQoZmFsbGJhY2tMbmcpKTtcbiAgZWxzZSBpZiAoZmFsbGJhY2tMbmcgJiYgdHlwZW9mIGZhbGxiYWNrTG5nID09PSAnb2JqZWN0Jykge1xuICAgIE9iamVjdC5rZXlzKGZhbGxiYWNrTG5nKS5mb3JFYWNoKChjb2RlKSA9PiB7XG4gICAgICBpZiAoY29kZSAhPT0gJ2RlZmF1bHQnKSBjb2Rlcy5wdXNoKGNvZGUpO1xuICAgICAgY29kZXMucHVzaCguLi5bXS5jb25jYXQoZmFsbGJhY2tMbmdbY29kZV0pKTtcbiAgICB9KTtcbiAgfVxuICByZXR1cm4gY29kZXM7XG59O1xuXG4vLyBBIGNvZGUgZnJvbSBsbmcsIGNoYW5nZUxhbmd1YWdlKCksIGEgZGV0ZWN0b3Igb3IgbG9hZExhbmd1YWdlcygpIHdpdGggYW5vdGhlciBzaGFwZSB0aGFuIGlzU2FmZUxhbmd1YWdlQ29kZSgpXG4vLyBhbGxvd3MgaXMgcmVmdXNlZCB1bmxlc3MgaXQgaXMgY29uZmlndXJlZDogYXBwcyBwdXQgdGhlIGxhbmd1YWdlIGludG8gPGh0bWwgbGFuZz4sIFVSTHMgYW5kIGZpbGUgcGF0aHMuXG5jb25zdCBpc1JlZnVzZWRMYW5ndWFnZUNvZGUgPSAoaTE4biwgY29kZSkgPT4ge1xuICBpZiAoIWlzU3RyaW5nKGNvZGUpIHx8IGlzU2FmZUxhbmd1YWdlQ29kZShjb2RlKSB8fCBpMThuLmNvbmZpZ3VyZWRMbmdzPy5oYXMoY29kZSkpIHJldHVybiBmYWxzZTtcbiAgaTE4bi5sb2dnZXIub25jZShcbiAgICBgbG5nOiR7Y29kZX1gLFxuICAgICd3YXJuJyxcbiAgICBgcmVmdXNlZCB0aGUgbGFuZ3VhZ2UgY29kZSAnJHtjb2RlLnNsaWNlKDAsIDY0KX0nIGZyb20gbG5nLCBjaGFuZ2VMYW5ndWFnZSgpLCB0aGUgbGFuZ3VhZ2UgZGV0ZWN0b3Igb3IgbG9hZExhbmd1YWdlcygpOiBpdCBpcyBub3QgY29uZmlndXJlZCBhbmQgaGFzIG90aGVyIGNoYXJhY3RlcnMgdGhhbiBsZXR0ZXJzLCBkaWdpdHMsICctJywgJ18nLCAnQCcgYW5kICcuJyAob3IgJy4uJywgb3IgbW9yZSB0aGFuIDEyOCkuIExpc3QgaXQgaW4gc3VwcG9ydGVkTG5ncyB0byB1c2UgaXRgLFxuICApO1xuICByZXR1cm4gdHJ1ZTtcbn07XG5cbi8vIEJpbmRzIHRoZSBtZW1iZXIgZnVuY3Rpb25zIG9mIHRoZSBnaXZlbiBjbGFzcyBpbnN0YW5jZSBzbyB0aGF0IHRoZXkgY2FuIGJlXG4vLyBkZXN0cnVjdHVyZWQgb3IgdXNlZCBhcyBjYWxsYmFja3MuXG5jb25zdCBiaW5kTWVtYmVyRnVuY3Rpb25zID0gKGluc3QpID0+IHtcbiAgY29uc3QgbWVtcyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKE9iamVjdC5nZXRQcm90b3R5cGVPZihpbnN0KSlcbiAgbWVtcy5mb3JFYWNoKChtZW0pID0+IHtcbiAgICBpZiAodHlwZW9mIGluc3RbbWVtXSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgaW5zdFttZW1dID0gaW5zdFttZW1dLmJpbmQoaW5zdClcbiAgICB9XG4gIH0pXG59XG5cbmNsYXNzIEkxOG4gZXh0ZW5kcyBFdmVudEVtaXR0ZXIge1xuICBjb25zdHJ1Y3RvcihvcHRpb25zID0ge30sIGNhbGxiYWNrKSB7XG4gICAgc3VwZXIoKTtcblxuICAgIC8vIHRoZSBvcHRpb25zIGFzIHRoZSB1c2VyIHBhc3NlZCB0aGVtLCB0byB0ZWxsIFwibm90IHNldFwiIGZyb20gYSBkZWZhdWx0OyB0aGlzLm9wdGlvbnMgaGFzIHRoZVxuICAgIC8vIGRlZmF1bHRzIG1lcmdlZCBpbiBmcm9tIHRoZSBzdGFydCwgc28gZ2V0Rml4ZWRUKCkgYW5kIHRoZSBvcHRpb25zIHdvcmsgYmVmb3JlIGluaXQoKVxuICAgIHRoaXMudXNlck9wdGlvbnMgPSB0cmFuc2Zvcm1PcHRpb25zKG9wdGlvbnMpO1xuICAgIHRoaXMub3B0aW9ucyA9IHdpdGhEZWZhdWx0cyh0aGlzLnVzZXJPcHRpb25zKTtcbiAgICAvLyBwb3N0LXByb2Nlc3NvcnMgcmVnaXN0ZXJlZCB3aXRoIHVzZSgpOyBhIGNsb25lJ3MgcmVnaXN0cnkgaW5oZXJpdHMgaXRzIHBhcmVudCdzXG4gICAgdGhpcy5zZXJ2aWNlcyA9IHsgcG9zdFByb2Nlc3NvcnM6IE9iamVjdC5jcmVhdGUobnVsbCkgfTtcbiAgICAvLyBlYWNoIGluc3RhbmNlIGxvZ3MgdGhyb3VnaCBpdHMgb3duIGxvZ2dlciAoYSBjbG9uZSB0aHJvdWdoIGl0cyBwYXJlbnQncyk7IGluaXQoKSBzZXRzIGl0IHVwIGFnYWluXG4gICAgLy8gd2l0aCB0aGUgbG9nZ2VyIG1vZHVsZSwgdW50aWwgdGhlbiBpdCBsb2dzIHRvIHRoZSBjb25zb2xlIHdpdGggdGhlIG9wdGlvbnMgZ2l2ZW4gaGVyZVxuICAgIHRoaXMubG9nZ2VyID0gbmV3IExvZ2dlcihudWxsLCB0aGlzLm9wdGlvbnMpO1xuICAgIHRoaXMubW9kdWxlcyA9IHsgZXh0ZXJuYWw6IFtdIH07XG5cbiAgICBiaW5kTWVtYmVyRnVuY3Rpb25zKHRoaXMpO1xuXG4gICAgaWYgKGNhbGxiYWNrICYmICF0aGlzLmlzSW5pdGlhbGl6ZWQgJiYgIW9wdGlvbnMuaXNDbG9uZSkge1xuICAgICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL2kxOG5leHQvaTE4bmV4dC9pc3N1ZXMvODc5XG4gICAgICAvLyB0aGUgdXNlcidzIG93biBpbml0QXN5bmM6IHRoZSBkZWZhdWx0cyBtZXJnZWQgYWJvdmUgYWx3YXlzIGhhdmUgaXQgdHJ1ZVxuICAgICAgaWYgKCF0aGlzLnVzZXJPcHRpb25zLmluaXRBc3luYykge1xuICAgICAgICB0aGlzLmluaXQob3B0aW9ucywgY2FsbGJhY2spO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgIH1cbiAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICB0aGlzLmluaXQob3B0aW9ucywgY2FsbGJhY2spO1xuICAgICAgfSwgMCk7XG4gICAgfVxuICB9XG5cbiAgaW5pdChvcHRpb25zID0ge30sIGNhbGxiYWNrKSB7XG4gICAgdGhpcy5pc0luaXRpYWxpemluZyA9IHRydWU7XG4gICAgaWYgKHR5cGVvZiBvcHRpb25zID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBjYWxsYmFjayA9IG9wdGlvbnM7XG4gICAgICBvcHRpb25zID0ge307XG4gICAgfVxuXG4gICAgaWYgKG9wdGlvbnMuZGVmYXVsdE5TID09IG51bGwgJiYgb3B0aW9ucy5ucykge1xuICAgICAgaWYgKGlzU3RyaW5nKG9wdGlvbnMubnMpKSB7XG4gICAgICAgIG9wdGlvbnMuZGVmYXVsdE5TID0gb3B0aW9ucy5ucztcbiAgICAgIH0gZWxzZSBpZiAoIW9wdGlvbnMubnMuaW5jbHVkZXMoJ3RyYW5zbGF0aW9uJykpIHtcbiAgICAgICAgb3B0aW9ucy5kZWZhdWx0TlMgPSBvcHRpb25zLm5zWzBdO1xuICAgICAgfVxuICAgIH1cblxuICAgIHRyYW5zZm9ybU9wdGlvbnMob3B0aW9ucyk7XG4gICAgLy8gd2hhdCB0aGUgdXNlciBzZXQsIGluIGNyZWF0ZUluc3RhbmNlKCkgb3IgaGVyZVxuICAgIGNvbnN0IHVzZXJPcHRpb25zID0geyAuLi50aGlzLnVzZXJPcHRpb25zLCAuLi5vcHRpb25zIH07XG4gICAgdGhpcy5vcHRpb25zID0gd2l0aERlZmF1bHRzKHsgLi4udGhpcy5vcHRpb25zLCAuLi5vcHRpb25zIH0pO1xuICAgIGlmICh1c2VyT3B0aW9ucy5rZXlTZXBhcmF0b3IgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5vcHRpb25zLnVzZXJEZWZpbmVkS2V5U2VwYXJhdG9yID0gdXNlck9wdGlvbnMua2V5U2VwYXJhdG9yO1xuICAgIH1cbiAgICBpZiAodXNlck9wdGlvbnMubnNTZXBhcmF0b3IgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5vcHRpb25zLnVzZXJEZWZpbmVkTnNTZXBhcmF0b3IgPSB1c2VyT3B0aW9ucy5uc1NlcGFyYXRvcjtcbiAgICB9XG4gICAgLy8gYSBjbG9uZSBnZXRzIGl0cyBwYXJlbnQncyBmcm9tIGNsb25lSW5zdGFuY2UoKSwgd2l0aCBpdHMgb3duIG9wdGlvbnMgYWRkZWQgdGhlcmU6IGl0cyBpbml0KCkgb3B0aW9uc1xuICAgIC8vIGFyZSB0aGUgcGFyZW50J3MsIHdob3NlIGlubGluZSByZXNvdXJjZXMgYXJlIHRoZSBsaXZlIHN0b3JlXG4gICAgaWYgKCF0aGlzLm9wdGlvbnMuaXNDbG9uZSkge1xuICAgICAgdGhpcy5jb25maWd1cmVkTG5ncyA9IG5ldyBTZXQoW1xuICAgICAgICAuLi4odGhpcy5jb25maWd1cmVkTG5ncyB8fCBbXSksXG4gICAgICAgIC4uLmNvbmZpZ3VyZWRMYW5ndWFnZUNvZGVzKHVzZXJPcHRpb25zKSxcbiAgICAgIF0pO1xuICAgIH1cblxuICAgIGNvbnN0IGNyZWF0ZUNsYXNzT25EZW1hbmQgPSAoQ2xhc3NPck9iamVjdCkgPT4ge1xuICAgICAgaWYgKCFDbGFzc09yT2JqZWN0KSByZXR1cm4gbnVsbDtcbiAgICAgIGlmICh0eXBlb2YgQ2xhc3NPck9iamVjdCA9PT0gJ2Z1bmN0aW9uJykgcmV0dXJuIG5ldyBDbGFzc09yT2JqZWN0KCk7XG4gICAgICByZXR1cm4gQ2xhc3NPck9iamVjdDtcbiAgICB9XG5cbiAgICAvLyBpbml0IHNlcnZpY2VzXG4gICAgaWYgKCF0aGlzLm9wdGlvbnMuaXNDbG9uZSkge1xuICAgICAgdGhpcy5sb2dnZXIuaW5pdChjcmVhdGVDbGFzc09uRGVtYW5kKHRoaXMubW9kdWxlcy5sb2dnZXIpLCB0aGlzLm9wdGlvbnMpO1xuICAgICAgY29uc3QgeyBsb2dnZXIgfSA9IHRoaXM7XG4gICAgICB0aGlzLnBlbmRpbmdXYXJuaW5ncz8uZm9yRWFjaCgobXNnKSA9PiB0aGlzLmxvZ2dlci53YXJuKG1zZykpO1xuICAgICAgdGhpcy5wZW5kaW5nV2FybmluZ3MgPSB1bmRlZmluZWQ7XG5cbiAgICAgIGxldCBmb3JtYXR0ZXI7XG4gICAgICBpZiAodGhpcy5tb2R1bGVzLmZvcm1hdHRlcikge1xuICAgICAgICBmb3JtYXR0ZXIgPSB0aGlzLm1vZHVsZXMuZm9ybWF0dGVyO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZm9ybWF0dGVyID0gRm9ybWF0dGVyO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBsdSA9IG5ldyBMYW5ndWFnZVV0aWxzKHRoaXMub3B0aW9ucywgbG9nZ2VyKTtcblxuICAgICAgLy8gaWYgKHRoaXMub3B0aW9ucy5yZXNvdXJjZXMpIHtcbiAgICAgIC8vICAgT2JqZWN0LmtleXModGhpcy5vcHRpb25zLnJlc291cmNlcykuZm9yRWFjaCgobG5nKSA9PiB7XG4gICAgICAvLyAgICAgY29uc3QgZkxuZyA9IGx1LmZvcm1hdExhbmd1YWdlQ29kZShsbmcpO1xuICAgICAgLy8gICAgIGlmIChmTG5nICE9PSBsbmcpIHtcbiAgICAgIC8vICAgICAgIHRoaXMub3B0aW9ucy5yZXNvdXJjZXNbZkxuZ10gPSB0aGlzLm9wdGlvbnMucmVzb3VyY2VzW2xuZ107XG4gICAgICAvLyAgICAgICBkZWxldGUgdGhpcy5vcHRpb25zLnJlc291cmNlc1tsbmddO1xuICAgICAgLy8gICAgICAgdGhpcy5sb2dnZXIud2FybihgaW5pdDogbG5nIGluIHJlc291cmNlIGlzIG5vdCB2YWxpZCwgbWFwcGluZyAke2xuZ30gdG8gJHtmTG5nfWApO1xuICAgICAgLy8gICAgIH1cbiAgICAgIC8vICAgfSlcbiAgICAgIC8vIH1cblxuICAgICAgdGhpcy5zdG9yZSA9IG5ldyBSZXNvdXJjZVN0b3JlKHRoaXMub3B0aW9ucy5yZXNvdXJjZXMsIHRoaXMub3B0aW9ucywgbG9nZ2VyKTtcblxuICAgICAgY29uc3QgcyA9IHRoaXMuc2VydmljZXM7XG4gICAgICBzLmxvZ2dlciA9IGxvZ2dlcjtcbiAgICAgIHMucmVzb3VyY2VTdG9yZSA9IHRoaXMuc3RvcmU7XG4gICAgICBzLmxhbmd1YWdlVXRpbHMgPSBsdTtcbiAgICAgIHMucGx1cmFsUmVzb2x2ZXIgPSBuZXcgUGx1cmFsUmVzb2x2ZXIobHUsIHsgcHJlcGVuZDogdGhpcy5vcHRpb25zLnBsdXJhbFNlcGFyYXRvciB9LCBsb2dnZXIpO1xuXG4gICAgICBpZiAoZm9ybWF0dGVyKSB7XG4gICAgICAgIHMuZm9ybWF0dGVyID0gY3JlYXRlQ2xhc3NPbkRlbWFuZChmb3JtYXR0ZXIpO1xuICAgICAgICBpZiAocy5mb3JtYXR0ZXIuaW5pdCkgcy5mb3JtYXR0ZXIuaW5pdChzLCB0aGlzLm9wdGlvbnMpO1xuICAgICAgICB0aGlzLm9wdGlvbnMuaW50ZXJwb2xhdGlvbi5mb3JtYXQgPSBzLmZvcm1hdHRlci5mb3JtYXQuYmluZChzLmZvcm1hdHRlcik7XG4gICAgICB9XG5cbiAgICAgIHMuaW50ZXJwb2xhdG9yID0gbmV3IEludGVycG9sYXRvcih0aGlzLm9wdGlvbnMsIGxvZ2dlcik7XG4gICAgICBzLnV0aWxzID0ge1xuICAgICAgICBoYXNMb2FkZWROYW1lc3BhY2U6IHRoaXMuaGFzTG9hZGVkTmFtZXNwYWNlLmJpbmQodGhpcyksXG4gICAgICAgIC8vIGxldHMgYSBiYWNrZW5kIHJlZnJlc2ggaXRzIGJ1bmRsZXMgKHJlbG9hZEludGVydmFsKSB3aXRob3V0IGRyaXZpbmcgdGhlIGJhY2tlbmRDb25uZWN0b3JcbiAgICAgICAgcmVsb2FkUmVzb3VyY2VzOiB0aGlzLnJlbG9hZFJlc291cmNlcy5iaW5kKHRoaXMpXG4gICAgICB9O1xuXG4gICAgICBzLmJhY2tlbmRDb25uZWN0b3IgPSBuZXcgQmFja2VuZENvbm5lY3RvcihcbiAgICAgICAgY3JlYXRlQ2xhc3NPbkRlbWFuZCh0aGlzLm1vZHVsZXMuYmFja2VuZCksXG4gICAgICAgIHMucmVzb3VyY2VTdG9yZSxcbiAgICAgICAgcyxcbiAgICAgICAgdGhpcy5vcHRpb25zLFxuICAgICAgKTtcbiAgICAgIC8vIHBpcGUgZXZlbnRzIGZyb20gYmFja2VuZENvbm5lY3RvclxuICAgICAgcy5iYWNrZW5kQ29ubmVjdG9yLm9uKCcqJywgKGV2ZW50LCAuLi5hcmdzKSA9PiB7XG4gICAgICAgIHRoaXMuZW1pdChldmVudCwgLi4uYXJncyk7XG4gICAgICB9KTtcblxuICAgICAgaWYgKHRoaXMubW9kdWxlcy5sYW5ndWFnZURldGVjdG9yKSB7XG4gICAgICAgIHMubGFuZ3VhZ2VEZXRlY3RvciA9IGNyZWF0ZUNsYXNzT25EZW1hbmQodGhpcy5tb2R1bGVzLmxhbmd1YWdlRGV0ZWN0b3IpO1xuICAgICAgICBpZiAocy5sYW5ndWFnZURldGVjdG9yLmluaXQpIHMubGFuZ3VhZ2VEZXRlY3Rvci5pbml0KHMsIHRoaXMub3B0aW9ucy5kZXRlY3Rpb24sIHRoaXMub3B0aW9ucyk7XG4gICAgICAgIGlmIChzLmxhbmd1YWdlRGV0ZWN0b3IuYXN5bmMgJiYgY2FsbGJhY2tBcGlPZihzLmxhbmd1YWdlRGV0ZWN0b3IpID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICB0aGlzLmxvZ2dlci5kZXByZWNhdGUoXG4gICAgICAgICAgICAnbGFuZ3VhZ2VEZXRlY3Rvcjogc2V0IGNhbGxiYWNrQXBpIHRvIGRlY2xhcmUgaG93IHRoZSBhc3luYyBkZXRlY3QoKSBhbnN3ZXJzICh0cnVlOiBkZXRlY3QoY2FsbGJhY2spOyBmYWxzZTogZGV0ZWN0KCkgcmV0dXJucyBhIHByb21pc2UpOyBndWVzc2luZyBpdCBmcm9tIHRoZSBudW1iZXIgb2YgcGFyYW1ldGVycyBpcyBkZXByZWNhdGVkJyxcbiAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLm1vZHVsZXMuaTE4bkZvcm1hdCkge1xuICAgICAgICBzLmkxOG5Gb3JtYXQgPSBjcmVhdGVDbGFzc09uRGVtYW5kKHRoaXMubW9kdWxlcy5pMThuRm9ybWF0KTtcbiAgICAgICAgaWYgKHMuaTE4bkZvcm1hdC5pbml0KSBzLmkxOG5Gb3JtYXQuaW5pdCh0aGlzKTtcbiAgICAgIH1cblxuICAgICAgdGhpcy50cmFuc2xhdG9yID0gbmV3IFRyYW5zbGF0b3IodGhpcy5zZXJ2aWNlcywgdGhpcy5vcHRpb25zKTtcbiAgICAgIC8vIHBpcGUgZXZlbnRzIGZyb20gdHJhbnNsYXRvclxuICAgICAgdGhpcy50cmFuc2xhdG9yLm9uKCcqJywgKGV2ZW50LCAuLi5hcmdzKSA9PiB7XG4gICAgICAgIHRoaXMuZW1pdChldmVudCwgLi4uYXJncyk7XG4gICAgICB9KTtcblxuICAgICAgdGhpcy5tb2R1bGVzLmV4dGVybmFsLmZvckVhY2gobSA9PiB7XG4gICAgICAgIGlmIChtLmluaXQpIG0uaW5pdCh0aGlzKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHRoaXMuZm9ybWF0ID0gdGhpcy5vcHRpb25zLmludGVycG9sYXRpb24uZm9ybWF0O1xuICAgIGlmICghY2FsbGJhY2spIGNhbGxiYWNrID0gbm9vcDtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMuZmFsbGJhY2tMbmcgJiYgIXRoaXMuc2VydmljZXMubGFuZ3VhZ2VEZXRlY3RvciAmJiAhdGhpcy5vcHRpb25zLmxuZykge1xuICAgICAgY29uc3QgY29kZXMgPSB0aGlzLnNlcnZpY2VzLmxhbmd1YWdlVXRpbHMuZ2V0RmFsbGJhY2tDb2Rlcyh0aGlzLm9wdGlvbnMuZmFsbGJhY2tMbmcpXG4gICAgICBpZiAoY29kZXMubGVuZ3RoID4gMCAmJiBjb2Rlc1swXSAhPT0gJ2RldicpIHRoaXMub3B0aW9ucy5sbmcgPSBjb2Rlc1swXVxuICAgIH1cbiAgICBpZiAoIXRoaXMuc2VydmljZXMubGFuZ3VhZ2VEZXRlY3RvciAmJiAhdGhpcy5vcHRpb25zLmxuZykge1xuICAgICAgdGhpcy5sb2dnZXIud2FybignaW5pdDogbm8gbGFuZ3VhZ2VEZXRlY3RvciBpcyB1c2VkIGFuZCBubyBsbmcgaXMgZGVmaW5lZCcpO1xuICAgIH1cblxuICAgIC8vIGFwcGVuZCBhcGlcbiAgICBjb25zdCBzdG9yZUFwaSA9IFtcbiAgICAgICdnZXRSZXNvdXJjZScsXG4gICAgICAnaGFzUmVzb3VyY2VCdW5kbGUnLFxuICAgICAgJ2dldFJlc291cmNlQnVuZGxlJyxcbiAgICAgICdnZXREYXRhQnlMYW5ndWFnZScsXG4gICAgXTtcbiAgICBzdG9yZUFwaS5mb3JFYWNoKGZjTmFtZSA9PiB7XG4gICAgICB0aGlzW2ZjTmFtZV0gPSAoLi4uYXJncykgPT4gdGhpcy5zdG9yZVtmY05hbWVdKC4uLmFyZ3MpO1xuICAgIH0pO1xuICAgIGNvbnN0IHN0b3JlQXBpQ2hhaW5lZCA9IFtcbiAgICAgICdhZGRSZXNvdXJjZScsXG4gICAgICAnYWRkUmVzb3VyY2VzJyxcbiAgICAgICdhZGRSZXNvdXJjZUJ1bmRsZScsXG4gICAgICAncmVtb3ZlUmVzb3VyY2VCdW5kbGUnLFxuICAgIF07XG4gICAgc3RvcmVBcGlDaGFpbmVkLmZvckVhY2goZmNOYW1lID0+IHtcbiAgICAgIHRoaXNbZmNOYW1lXSA9ICguLi5hcmdzKSA9PiB7XG4gICAgICAgIHRoaXMuc3RvcmVbZmNOYW1lXSguLi5hcmdzKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICB9O1xuICAgIH0pO1xuXG4gICAgY29uc3QgZGVmZXJyZWQgPSBkZWZlcigpO1xuXG4gICAgY29uc3QgbG9hZCA9ICgpID0+IHtcbiAgICAgIGNvbnN0IGZpbmlzaCA9IChlcnIsIHQpID0+IHtcbiAgICAgICAgdGhpcy5pc0luaXRpYWxpemluZyA9IGZhbHNlO1xuICAgICAgICBpZiAodGhpcy5pc0luaXRpYWxpemVkICYmICF0aGlzLmluaXRpYWxpemVkU3RvcmVPbmNlKSB0aGlzLmxvZ2dlci53YXJuKCdpbml0OiBpMThuZXh0IGlzIGFscmVhZHkgaW5pdGlhbGl6ZWQuIFlvdSBzaG91bGQgY2FsbCBpbml0IGp1c3Qgb25jZSEnKTtcbiAgICAgICAgdGhpcy5pc0luaXRpYWxpemVkID0gdHJ1ZTtcbiAgICAgICAgaWYgKCF0aGlzLm9wdGlvbnMuaXNDbG9uZSkgdGhpcy5sb2dnZXIubG9nKCdpbml0aWFsaXplZCcsIHRoaXMub3B0aW9ucyk7XG4gICAgICAgIHRoaXMuZW1pdCgnaW5pdGlhbGl6ZWQnLCB0aGlzLm9wdGlvbnMpO1xuXG4gICAgICAgIGRlZmVycmVkLnJlc29sdmUodCk7IC8vIG5vdCByZWplY3Rpbmcgb24gZXJyIChhcyBlcnIgaXMgb25seSBhIGxvYWRpbmcgdHJhbnNsYXRpb24gZmFpbGVkIHdhcm5pbmcpXG4gICAgICAgIGNhbGxiYWNrKGVyciwgdCk7XG4gICAgICB9O1xuICAgICAgLy8gZml4IGZvciB1c2UgY2FzZXMgd2hlbiBjYWxsaW5nIGNoYW5nZUxhbmd1YWdlIGJlZm9yZSBmaW5pc2hlZCB0byBpbml0aWFsaXplZCAoaS5lLiBodHRwczovL2dpdGh1Yi5jb20vaTE4bmV4dC9pMThuZXh0L2lzc3Vlcy8xNTUyKVxuICAgICAgLy8gYWxzbyBjb3ZlcnMgY2xvbmVJbnN0YW5jZSByYWNlIHdoZXJlIGRlZmVycmVkIGxvYWQoKSB3b3VsZCBvdmVyd3JpdGUgYSBwZW5kaW5nIGNoYW5nZUxhbmd1YWdlIChodHRwczovL2dpdGh1Yi5jb20vaTE4bmV4dC9pMThuZXh0L2lzc3Vlcy8yNDIyKVxuICAgICAgaWYgKCh0aGlzLmxhbmd1YWdlcyB8fCB0aGlzLmlzTGFuZ3VhZ2VDaGFuZ2luZ1RvKSAmJiAhdGhpcy5pc0luaXRpYWxpemVkKSByZXR1cm4gZmluaXNoKG51bGwsIHRoaXMudC5iaW5kKHRoaXMpKTtcbiAgICAgIHRoaXMuY2hhbmdlTGFuZ3VhZ2UodGhpcy5vcHRpb25zLmxuZywgZmluaXNoKTtcbiAgICB9O1xuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5yZXNvdXJjZXMgfHwgIXRoaXMub3B0aW9ucy5pbml0QXN5bmMpIHtcbiAgICAgIGxvYWQoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgc2V0VGltZW91dChsb2FkLCAwKTtcbiAgICB9XG5cbiAgICByZXR1cm4gZGVmZXJyZWQ7XG4gIH1cblxuICBsb2FkUmVzb3VyY2VzKGxhbmd1YWdlLCBjYWxsYmFjayA9IG5vb3ApIHtcbiAgICBsZXQgdXNlZENhbGxiYWNrID0gY2FsbGJhY2s7XG4gICAgY29uc3QgdXNlZExuZyA9IGlzU3RyaW5nKGxhbmd1YWdlKSA/IGxhbmd1YWdlIDogdGhpcy5sYW5ndWFnZTtcbiAgICBpZiAodHlwZW9mIGxhbmd1YWdlID09PSAnZnVuY3Rpb24nKSB1c2VkQ2FsbGJhY2sgPSBsYW5ndWFnZTtcblxuICAgIGlmICghdGhpcy5vcHRpb25zLnJlc291cmNlcyB8fCB0aGlzLm9wdGlvbnMucGFydGlhbEJ1bmRsZWRMYW5ndWFnZXMpIHtcbiAgICAgIGlmICh1c2VkTG5nPy50b0xvd2VyQ2FzZSgpID09PSAnY2ltb2RlJyAmJiAoIXRoaXMub3B0aW9ucy5wcmVsb2FkIHx8IHRoaXMub3B0aW9ucy5wcmVsb2FkLmxlbmd0aCA9PT0gMCkpIHJldHVybiB1c2VkQ2FsbGJhY2soKTsgLy8gYXZvaWQgbG9hZGluZyByZXNvdXJjZXMgZm9yIGNpbW9kZVxuXG4gICAgICBjb25zdCB0b0xvYWQgPSBbXTtcblxuICAgICAgY29uc3QgYXBwZW5kID0gbG5nID0+IHtcbiAgICAgICAgaWYgKCFsbmcpIHJldHVybjtcbiAgICAgICAgaWYgKGxuZyA9PT0gJ2NpbW9kZScpIHJldHVybjtcbiAgICAgICAgY29uc3QgbG5ncyA9IHRoaXMuc2VydmljZXMubGFuZ3VhZ2VVdGlscy50b1Jlc29sdmVIaWVyYXJjaHkobG5nKTtcbiAgICAgICAgbG5ncy5mb3JFYWNoKGwgPT4ge1xuICAgICAgICAgIGlmIChsID09PSAnY2ltb2RlJykgcmV0dXJuO1xuICAgICAgICAgIGlmICghdG9Mb2FkLmluY2x1ZGVzKGwpKSB0b0xvYWQucHVzaChsKTtcbiAgICAgICAgfSk7XG4gICAgICB9O1xuXG4gICAgICBpZiAoIXVzZWRMbmcpIHtcbiAgICAgICAgLy8gYXQgbGVhc3QgbG9hZCBmYWxsYmFja3MgaW4gdGhpcyBjYXNlXG4gICAgICAgIGNvbnN0IGZhbGxiYWNrcyA9IHRoaXMuc2VydmljZXMubGFuZ3VhZ2VVdGlscy5nZXRGYWxsYmFja0NvZGVzKHRoaXMub3B0aW9ucy5mYWxsYmFja0xuZyk7XG4gICAgICAgIGZhbGxiYWNrcy5mb3JFYWNoKGwgPT4gYXBwZW5kKGwpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGFwcGVuZCh1c2VkTG5nKTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5vcHRpb25zLnByZWxvYWQ/LmZvckVhY2g/LihsID0+IGFwcGVuZChsKSk7XG5cbiAgICAgIHRoaXMuc2VydmljZXMuYmFja2VuZENvbm5lY3Rvci5sb2FkKHRvTG9hZCwgdGhpcy5vcHRpb25zLm5zLCAoZSkgPT4ge1xuICAgICAgICBpZiAoIWUgJiYgIXRoaXMucmVzb2x2ZWRMYW5ndWFnZSAmJiB0aGlzLmxhbmd1YWdlKSB0aGlzLnNldFJlc29sdmVkTGFuZ3VhZ2UodGhpcy5sYW5ndWFnZSk7XG4gICAgICAgIHVzZWRDYWxsYmFjayhlKTtcbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICB1c2VkQ2FsbGJhY2sobnVsbCk7XG4gICAgfVxuICB9XG5cbiAgcmVsb2FkUmVzb3VyY2VzKGxuZ3MsIG5zLCBjYWxsYmFjaykge1xuICAgIGNvbnN0IGRlZmVycmVkID0gZGVmZXIoKTtcbiAgICBpZiAodHlwZW9mIGxuZ3MgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIGNhbGxiYWNrID0gbG5ncztcbiAgICAgIGxuZ3MgPSB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGlmICh0eXBlb2YgbnMgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIGNhbGxiYWNrID0gbnM7XG4gICAgICBucyA9IHVuZGVmaW5lZDtcbiAgICB9XG4gICAgLy8gd2l0aG91dCBsYW5ndWFnZXM6IHRoZSBjdXJyZW50IG9uZXMgYW5kIGV2ZXJ5IGxhbmd1YWdlIHRoZSBiYWNrZW5kIGxvYWRlZCBvciB0cmllZCB0byBsb2FkIGZvciB0aGlzXG4gICAgLy8gaW5zdGFuY2UgYW5kIGl0cyBjbG9uZXMgKHRoZXkgc2hhcmUgdGhlIGNvbm5lY3RvciksIHNvIGEgcGVyaW9kaWMgcmVsb2FkIG9mIGEgYmFja2VuZCBhbHNvIGNvdmVycyB0aGVcbiAgICAvLyBsYW5ndWFnZXMgYSBjbG9uZSBsb2FkZWQgb24gZGVtYW5kXG4gICAgaWYgKCFsbmdzKSB7XG4gICAgICBjb25zdCByZXF1ZXN0ZWQgPSBPYmplY3Qua2V5cyh0aGlzLnNlcnZpY2VzLmJhY2tlbmRDb25uZWN0b3Iuc3RhdGUpLm1hcCgobmFtZSkgPT4gbmFtZS5zcGxpdCgnfCcpWzBdKTtcbiAgICAgIGxuZ3MgPSBbLi4ubmV3IFNldChbLi4uKHRoaXMubGFuZ3VhZ2VzIHx8IFtdKSwgLi4ucmVxdWVzdGVkXSldLmZpbHRlcigobCkgPT4gbCAhPT0gJ2NpbW9kZScpO1xuICAgIH1cbiAgICBpZiAoIW5zKSBucyA9IHRoaXMub3B0aW9ucy5ucztcbiAgICBpZiAoIWNhbGxiYWNrKSBjYWxsYmFjayA9IG5vb3A7XG4gICAgdGhpcy5zZXJ2aWNlcy5iYWNrZW5kQ29ubmVjdG9yLnJlbG9hZChsbmdzLCBucywgZXJyID0+IHtcbiAgICAgIGRlZmVycmVkLnJlc29sdmUoKTsgLy8gbm90IHJlamVjdGluZyBvbiBlcnIgKGFzIGVyciBpcyBvbmx5IGEgbG9hZGluZyB0cmFuc2xhdGlvbiBmYWlsZWQgd2FybmluZylcbiAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgfSk7XG4gICAgcmV0dXJuIGRlZmVycmVkO1xuICB9XG5cbiAgdXNlKG1vZHVsZSkge1xuICAgIGlmICghbW9kdWxlKSB0aHJvdyBuZXcgRXJyb3IoJ1lvdSBhcmUgcGFzc2luZyBhbiB1bmRlZmluZWQgbW9kdWxlISBQbGVhc2UgY2hlY2sgdGhlIG9iamVjdCB5b3UgYXJlIHBhc3NpbmcgdG8gaTE4bmV4dC51c2UoKScpXG4gICAgaWYgKCFtb2R1bGUudHlwZSkgdGhyb3cgbmV3IEVycm9yKCdZb3UgYXJlIHBhc3NpbmcgYSB3cm9uZyBtb2R1bGUhIFBsZWFzZSBjaGVjayB0aGUgb2JqZWN0IHlvdSBhcmUgcGFzc2luZyB0byBpMThuZXh0LnVzZSgpJylcblxuICAgIC8vIGEgc2Vjb25kIGJhY2tlbmQsIGRldGVjdG9yLCBpMThuRm9ybWF0IG9yIGZvcm1hdHRlciByZXBsYWNlcyB0aGUgZmlyc3Qgb25lXG4gICAgY29uc3Qgc2V0TW9kdWxlID0gKHR5cGUpID0+IHtcbiAgICAgIGlmICh0aGlzLm1vZHVsZXNbdHlwZV0gJiYgdGhpcy5tb2R1bGVzW3R5cGVdICE9PSBtb2R1bGUpIHtcbiAgICAgICAgY29uc3QgbXNnID0gYHVzZTogdGhpcyAke3R5cGV9IHJlcGxhY2VzIHRoZSAke3R5cGV9IHBhc3NlZCB0byBhbiBlYXJsaWVyIHVzZSgpIGNhbGw7IG9ubHkgb25lICR7dHlwZX0gaXMgdXNlZCBwZXIgaW5zdGFuY2VgO1xuICAgICAgICAvLyB1c2UoKSBtb3N0bHkgcnVucyBiZWZvcmUgaW5pdCgpIGhhcyBzZXQgdXAgdGhlIGxvZ2dlciAoYW5kIGRlYnVnKSwgc28gdGhlIHdhcm5pbmcgd2FpdHMgZm9yIGluaXQoKVxuICAgICAgICBpZiAodGhpcy5pc0luaXRpYWxpemluZyB8fCB0aGlzLmlzSW5pdGlhbGl6ZWQpIHRoaXMubG9nZ2VyLndhcm4obXNnKTtcbiAgICAgICAgZWxzZSAodGhpcy5wZW5kaW5nV2FybmluZ3MgPSB0aGlzLnBlbmRpbmdXYXJuaW5ncyB8fCBbXSkucHVzaChtc2cpO1xuICAgICAgfVxuICAgICAgdGhpcy5tb2R1bGVzW3R5cGVdID0gbW9kdWxlO1xuICAgIH07XG5cbiAgICBpZiAobW9kdWxlLnR5cGUgPT09ICdiYWNrZW5kJykge1xuICAgICAgc2V0TW9kdWxlKCdiYWNrZW5kJyk7XG4gICAgfVxuXG4gICAgaWYgKG1vZHVsZS50eXBlID09PSAnbG9nZ2VyJyB8fCAobW9kdWxlLmxvZyAmJiBtb2R1bGUud2FybiAmJiBtb2R1bGUuZXJyb3IpKSB7XG4gICAgICB0aGlzLm1vZHVsZXMubG9nZ2VyID0gbW9kdWxlO1xuICAgIH1cblxuICAgIGlmIChtb2R1bGUudHlwZSA9PT0gJ2xhbmd1YWdlRGV0ZWN0b3InKSB7XG4gICAgICBzZXRNb2R1bGUoJ2xhbmd1YWdlRGV0ZWN0b3InKTtcbiAgICB9XG5cbiAgICBpZiAobW9kdWxlLnR5cGUgPT09ICdpMThuRm9ybWF0Jykge1xuICAgICAgc2V0TW9kdWxlKCdpMThuRm9ybWF0Jyk7XG4gICAgfVxuXG4gICAgaWYgKG1vZHVsZS50eXBlID09PSAncG9zdFByb2Nlc3NvcicpIHtcbiAgICAgIHRoaXMuc2VydmljZXMucG9zdFByb2Nlc3NvcnNbbW9kdWxlLm5hbWVdID0gbW9kdWxlO1xuICAgIH1cblxuICAgIGlmIChtb2R1bGUudHlwZSA9PT0gJ2Zvcm1hdHRlcicpIHtcbiAgICAgIHNldE1vZHVsZSgnZm9ybWF0dGVyJyk7XG4gICAgfVxuXG4gICAgaWYgKG1vZHVsZS50eXBlID09PSAnM3JkUGFydHknKSB7XG4gICAgICB0aGlzLm1vZHVsZXMuZXh0ZXJuYWwucHVzaChtb2R1bGUpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLy8gcHV0cyBzZXJ2ZXItcmVuZGVyZWQgcmVzb3VyY2VzIGludG8gdGhlIHN0b3JlIGFuZCBzd2l0Y2hlcyB0byB0aGUgc2VydmVyJ3MgbGFuZ3VhZ2UsIGVhY2ggb25jZVxuICAvLyAocmVhY3QtaTE4bmV4dCB1c2VTU1IsIG5leHQtaTE4bmV4dCkuIFNldHMgdGhlIHNhbWUgZmxhZ3MgdGhvc2Ugd3JvdGUgZGlyZWN0bHkgYmVmb3JlLlxuICBoeWRyYXRlKHJlc291cmNlcywgbG5nKSB7XG4gICAgLy8gYSBjbG9uZSBzaGFyZXMgaXRzIHBhcmVudCdzIHN0b3JlIChvbmUgY2xvbmUgcGVyIHJlcXVlc3Qgb24gYSBzZXJ2ZXIpOiBsaWtlIHVzZVNTUiwgbGVhdmUgaXQgYWxvbmVcbiAgICBpZiAodGhpcy5vcHRpb25zLmlzQ2xvbmUpIHJldHVybiB0aGlzO1xuICAgIGlmICghdGhpcy5zZXJ2aWNlcy5yZXNvdXJjZVN0b3JlKSB7XG4gICAgICB0aGlzLmxvZ2dlci53YXJuKCdoeWRyYXRlOiBjYWxsIGluaXQoKSBmaXJzdCwgdGhlIGluc3RhbmNlIGhhcyBubyByZXNvdXJjZSBzdG9yZSB5ZXQnKTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICBpZiAocmVzb3VyY2VzICYmICF0aGlzLmluaXRpYWxpemVkU3RvcmVPbmNlKSB7XG4gICAgICB0aGlzLnNlcnZpY2VzLnJlc291cmNlU3RvcmUuZGF0YSA9IHJlc291cmNlcztcbiAgICAgIC8vIGFkZCB0aGUgbmFtZXNwYWNlcywgc28gYSBsYW5ndWFnZSBjaGFuZ2UgbG9hZHMgYWxsIG9mIHRoZW1cbiAgICAgIE9iamVjdC52YWx1ZXMocmVzb3VyY2VzKS5mb3JFYWNoKChsbmdSZXNvdXJjZXMpID0+IHtcbiAgICAgICAgT2JqZWN0LmtleXMobG5nUmVzb3VyY2VzKS5mb3JFYWNoKChucykgPT4ge1xuICAgICAgICAgIGlmICghdGhpcy5vcHRpb25zLm5zLmluY2x1ZGVzKG5zKSkgdGhpcy5vcHRpb25zLm5zLnB1c2gobnMpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgICAgdGhpcy5pbml0aWFsaXplZFN0b3JlT25jZSA9IHRydWU7XG4gICAgICB0aGlzLmlzSW5pdGlhbGl6ZWQgPSB0cnVlO1xuICAgIH1cbiAgICBpZiAobG5nICYmICF0aGlzLmluaXRpYWxpemVkTGFuZ3VhZ2VPbmNlKSB7XG4gICAgICB0aGlzLmNoYW5nZUxhbmd1YWdlKGxuZyk7XG4gICAgICB0aGlzLmluaXRpYWxpemVkTGFuZ3VhZ2VPbmNlID0gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBzZXRSZXNvbHZlZExhbmd1YWdlKGwpIHtcbiAgICBpZiAoIWwgfHwgIXRoaXMubGFuZ3VhZ2VzKSByZXR1cm47XG4gICAgaWYgKFsnY2ltb2RlJywgJ2RldiddLmluY2x1ZGVzKGwpKSByZXR1cm47XG4gICAgZm9yIChsZXQgbGkgPSAwOyBsaSA8IHRoaXMubGFuZ3VhZ2VzLmxlbmd0aDsgbGkrKykge1xuICAgICAgY29uc3QgbG5nSW5MbmdzID0gdGhpcy5sYW5ndWFnZXNbbGldO1xuICAgICAgaWYgKFsnY2ltb2RlJywgJ2RldiddLmluY2x1ZGVzKGxuZ0luTG5ncykpIGNvbnRpbnVlO1xuICAgICAgaWYgKHRoaXMuc3RvcmUuaGFzTGFuZ3VhZ2VTb21lVHJhbnNsYXRpb25zKGxuZ0luTG5ncykpIHtcbiAgICAgICAgdGhpcy5yZXNvbHZlZExhbmd1YWdlID0gbG5nSW5MbmdzO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKCF0aGlzLnJlc29sdmVkTGFuZ3VhZ2UgJiYgIXRoaXMubGFuZ3VhZ2VzLmluY2x1ZGVzKGwpICYmIHRoaXMuc3RvcmUuaGFzTGFuZ3VhZ2VTb21lVHJhbnNsYXRpb25zKGwpKSB7XG4gICAgICB0aGlzLnJlc29sdmVkTGFuZ3VhZ2UgPSBsO1xuICAgICAgdGhpcy5sYW5ndWFnZXMudW5zaGlmdChsKTtcbiAgICB9XG4gIH1cblxuICBjaGFuZ2VMYW5ndWFnZShsbmcsIGNhbGxiYWNrKSB7XG4gICAgdGhpcy5pc0xhbmd1YWdlQ2hhbmdpbmdUbyA9IGxuZztcbiAgICBjb25zdCBkZWZlcnJlZCA9IGRlZmVyKCk7XG4gICAgdGhpcy5lbWl0KCdsYW5ndWFnZUNoYW5naW5nJywgbG5nKTtcblxuICAgIGNvbnN0IHNldExuZ1Byb3BzID0gKGwpID0+IHtcbiAgICAgIHRoaXMubGFuZ3VhZ2UgPSBsO1xuICAgICAgdGhpcy5sYW5ndWFnZXMgPSB0aGlzLnNlcnZpY2VzLmxhbmd1YWdlVXRpbHMudG9SZXNvbHZlSGllcmFyY2h5KGwpO1xuICAgICAgLy8gZmluZCB0aGUgZmlyc3QgbGFuZ3VhZ2UgcmVzb2x2ZWQgbGFuZ3VhZ2VcbiAgICAgIHRoaXMucmVzb2x2ZWRMYW5ndWFnZSA9IHVuZGVmaW5lZDtcbiAgICAgIHRoaXMuc2V0UmVzb2x2ZWRMYW5ndWFnZShsKTtcbiAgICB9O1xuXG4gICAgY29uc3QgZG9uZSA9IChlcnIsIGwpID0+IHtcbiAgICAgIGlmIChsKSB7XG4gICAgICAgIGlmICh0aGlzLmlzTGFuZ3VhZ2VDaGFuZ2luZ1RvID09PSBsbmcpIHtcbiAgICAgICAgICBzZXRMbmdQcm9wcyhsKTtcbiAgICAgICAgICB0aGlzLnRyYW5zbGF0b3IuY2hhbmdlTGFuZ3VhZ2UobCk7XG4gICAgICAgICAgdGhpcy5pc0xhbmd1YWdlQ2hhbmdpbmdUbyA9IHVuZGVmaW5lZDtcbiAgICAgICAgICB0aGlzLmVtaXQoJ2xhbmd1YWdlQ2hhbmdlZCcsIGwpO1xuICAgICAgICAgIHRoaXMubG9nZ2VyLmxvZygnbGFuZ3VhZ2VDaGFuZ2VkJywgbCk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuaXNMYW5ndWFnZUNoYW5naW5nVG8gPSB1bmRlZmluZWQ7XG4gICAgICB9XG5cbiAgICAgIGRlZmVycmVkLnJlc29sdmUoKC4uLmFyZ3MpID0+IHRoaXMudCguLi5hcmdzKSk7XG4gICAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrKGVyciwgKC4uLmFyZ3MpID0+IHRoaXMudCguLi5hcmdzKSk7XG4gICAgfTtcblxuICAgIGNvbnN0IHNldExuZyA9IGxuZ3MgPT4ge1xuICAgICAgLy8gaWYgZGV0ZWN0ZWQgbG5nIGlzIGZhbHN5LCBzZXQgaXQgdG8gZW1wdHkgYXJyYXksIHRvIG1ha2Ugc3VyZSBhdCBsZWFzdCB0aGUgZmFsbGJhY2tMbmcgd2lsbCBiZSB1c2VkXG4gICAgICBpZiAoIWxuZyAmJiAhbG5ncyAmJiB0aGlzLnNlcnZpY2VzLmxhbmd1YWdlRGV0ZWN0b3IpIGxuZ3MgPSBbXTtcbiAgICAgIC8vIGEgcmVmdXNlZCBjb2RlIGlzIHNraXBwZWQgbGlrZSBhbiB1bnN1cHBvcnRlZCBvbmU6IHRoZSBkZXRlY3RvcidzIG5leHQgY29kZSwgZWxzZSB0aGUgZmFsbGJhY2tcbiAgICAgIC8vIGxhbmd1YWdlLCBlbHNlIG5vbmUgKGZhbGxiYWNrTG5nOiBmYWxzZSBsZWF2ZXMgdGhlIGxhbmd1YWdlIHVuc2V0KS4gV2l0aCBzdXBwb3J0ZWRMbmdzIHRoZSBpbnB1dCBpc1xuICAgICAgLy8gbWF0Y2hlZCBhcyBiZWZvcmUgKCdkZS1ERTtxPTAuOScgZ2l2ZXMgJ2RlJyk7IG9ubHkgYW4gdW5zYWZlIG1hdGNoIGlzIHJlZnVzZWQsIHdoaWNoIG9ubHlcbiAgICAgIC8vIG5vbkV4cGxpY2l0U3VwcG9ydGVkTG5ncyBjYW4gcmV0dXJuICgnZGUtPHg+JyBmb3IgYSBzdXBwb3J0ZWQgJ2RlJylcbiAgICAgIGNvbnN0IHsgc3VwcG9ydGVkTG5ncyB9ID0gdGhpcy5vcHRpb25zO1xuICAgICAgaWYgKGxuZ3MgJiYgIXN1cHBvcnRlZExuZ3MpIHtcbiAgICAgICAgY29uc3QgYWNjZXB0ZWQgPSBbXS5jb25jYXQobG5ncykuZmlsdGVyKChjKSA9PiAhaXNSZWZ1c2VkTGFuZ3VhZ2VDb2RlKHRoaXMsIGMpKTtcbiAgICAgICAgaWYgKGFjY2VwdGVkLmxlbmd0aCA8IFtdLmNvbmNhdChsbmdzKS5sZW5ndGgpIGxuZ3MgPSBhY2NlcHRlZDtcbiAgICAgIH1cbiAgICAgIC8vIGRlcGVuZGluZyBvbiBBUEkgaW4gZGV0ZWN0b3IgbG5nIGNhbiBiZSBhIHN0cmluZyAob2xkKSBvciBhbiBhcnJheSBvZiBsYW5ndWFnZXMgb3JkZXJlZCBpbiBwcmlvcml0eVxuICAgICAgY29uc3QgZmwgPSBpc1N0cmluZyhsbmdzKSA/IGxuZ3MgOiBsbmdzICYmIGxuZ3NbMF07XG4gICAgICBsZXQgbCA9IHRoaXMuc3RvcmUuaGFzTGFuZ3VhZ2VTb21lVHJhbnNsYXRpb25zKGZsKSA/IGZsIDogdGhpcy5zZXJ2aWNlcy5sYW5ndWFnZVV0aWxzLmdldEJlc3RNYXRjaEZyb21Db2Rlcyhpc1N0cmluZyhsbmdzKSA/IFtsbmdzXSA6IGxuZ3MpO1xuICAgICAgaWYgKHN1cHBvcnRlZExuZ3MgJiYgaXNSZWZ1c2VkTGFuZ3VhZ2VDb2RlKHRoaXMsIGwpKSBsID0gdGhpcy5zZXJ2aWNlcy5sYW5ndWFnZVV0aWxzLmdldEJlc3RNYXRjaEZyb21Db2RlcyhbXSk7XG5cbiAgICAgIGlmIChsKSB7XG4gICAgICAgIGlmICghdGhpcy5sYW5ndWFnZSkge1xuICAgICAgICAgIHNldExuZ1Byb3BzKGwpO1xuICAgICAgICB9XG4gICAgICAgIGlmICghdGhpcy50cmFuc2xhdG9yLmxhbmd1YWdlKSB0aGlzLnRyYW5zbGF0b3IuY2hhbmdlTGFuZ3VhZ2UobCk7XG5cbiAgICAgICAgdGhpcy5zZXJ2aWNlcy5sYW5ndWFnZURldGVjdG9yPy5jYWNoZVVzZXJMYW5ndWFnZT8uKGwpO1xuICAgICAgfVxuXG4gICAgICB0aGlzLmxvYWRSZXNvdXJjZXMobCwgZXJyID0+IHtcbiAgICAgICAgZG9uZShlcnIsIGwpO1xuICAgICAgfSk7XG4gICAgfTtcblxuICAgIGlmICghbG5nICYmIHRoaXMuc2VydmljZXMubGFuZ3VhZ2VEZXRlY3RvciAmJiAhdGhpcy5zZXJ2aWNlcy5sYW5ndWFnZURldGVjdG9yLmFzeW5jKSB7XG4gICAgICBzZXRMbmcodGhpcy5zZXJ2aWNlcy5sYW5ndWFnZURldGVjdG9yLmRldGVjdCgpKTtcbiAgICB9IGVsc2UgaWYgKCFsbmcgJiYgdGhpcy5zZXJ2aWNlcy5sYW5ndWFnZURldGVjdG9yICYmIHRoaXMuc2VydmljZXMubGFuZ3VhZ2VEZXRlY3Rvci5hc3luYykge1xuICAgICAgY29uc3QgY2FsbGJhY2tBcGkgPSBjYWxsYmFja0FwaU9mKHRoaXMuc2VydmljZXMubGFuZ3VhZ2VEZXRlY3Rvcik7XG4gICAgICBpZiAoY2FsbGJhY2tBcGkgPT09IGZhbHNlIHx8IChjYWxsYmFja0FwaSA9PT0gdW5kZWZpbmVkICYmIHRoaXMuc2VydmljZXMubGFuZ3VhZ2VEZXRlY3Rvci5kZXRlY3QubGVuZ3RoID09PSAwKSkge1xuICAgICAgICB0aGlzLnNlcnZpY2VzLmxhbmd1YWdlRGV0ZWN0b3IuZGV0ZWN0KCkudGhlbihzZXRMbmcpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5zZXJ2aWNlcy5sYW5ndWFnZURldGVjdG9yLmRldGVjdChzZXRMbmcpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBzZXRMbmcobG5nKTtcbiAgICB9XG5cbiAgICByZXR1cm4gZGVmZXJyZWQ7XG4gIH1cblxuICAvLyBgZml4ZWRPcHRzYCAob3B0aW9uYWwgNHRoIGFyZykgY2FycmllcyBvcHRpb25zIHRoYXQgYXJlIHRpZWQgdG8gdGhlXG4gIC8vIGJvdW5kIHQgZnVuY3Rpb24gcmF0aGVyIHRoYW4gdG8gdGhlIHJlc29sdXRpb24gb2YgYW55IHNpbmdsZSBjYWxsOlxuICAvL1xuICAvLyAgIC0gYHNjb3BlTnM/OiBzdHJpbmdbXWBcbiAgLy8gICAgICAgRnVsbCBuYW1lc3BhY2UgbGlzdCB0aGUgYm91bmQgdCB3YXMgY3JlYXRlZCBmb3IgKGUuZy4gdGhlIGFycmF5XG4gIC8vICAgICAgIHBhc3NlZCB0byBgdXNlVHJhbnNsYXRpb24oWyduc0EnLCduc0InXSlgKS4gVXNlZCAqb25seSogYnkgdGhlXG4gIC8vICAgICAgIHNlbGVjdG9yIHBhdGggdG8gZGVjaWRlIHdoZXRoZXIgYHBhdGhbMF1gIHNob3VsZCBiZSByZXdyaXR0ZW4gYXNcbiAgLy8gICAgICAgYSBuYW1lc3BhY2UgcHJlZml4LiBSZXNvbHV0aW9uIHNlbWFudGljcyBhcmUgdW5jaGFuZ2VkOiB0aGUgYm91bmRcbiAgLy8gICAgICAgYG5zYCAoYSBzaW5nbGUgcHJpbWFyeSBzdHJpbmcpIHN0aWxsIGRyaXZlcyBgVHJhbnNsYXRvci50cmFuc2xhdGVgLlxuICAvLyAgICAgICBUaGlzIGRlY291cGxlcyBzZWxlY3RvciBucy1kZXRlY3Rpb24gZnJvbSByZXNvbHV0aW9uIHNjb3BlIHNvIGFcbiAgLy8gICAgICAgcmVhY3QtaTE4bmV4dCBob29rIGNhbGxlZCB3aXRoIG11bHRpcGxlIG5hbWVzcGFjZXMgY2FuIHJvdXRlXG4gIC8vICAgICAgIGB0KCQgPT4gJC5zZWNvbmRhcnkuZm9vKWAgY29ycmVjdGx5ICp3aXRob3V0KiB0dXJuaW5nIGV2ZXJ5XG4gIC8vICAgICAgIGB0KCdmb28nKWAgbG9va3VwIGludG8gYSBtdWx0aS1ucyBmYWxsYmFjayBjaGFpbi5cbiAgLy8gICAgICAgU2VlIHRoZSB2MjUuOC4xOSBzZWxlY3RvciBydWxlIGluIGBzcmMvc2VsZWN0b3IuanNgLlxuICBnZXRGaXhlZFQobG5nLCBucywga2V5UHJlZml4LCBmaXhlZE9wdHMpIHtcbiAgICBjb25zdCBzY29wZU5zID0gZml4ZWRPcHRzPy5zY29wZU5zO1xuICAgIGNvbnN0IGZpeGVkVCA9IChrZXksIG9wdHMsIC4uLnJlc3QpID0+IHtcbiAgICAgIGxldCBvO1xuICAgICAgaWYgKHR5cGVvZiBvcHRzICE9PSAnb2JqZWN0Jykge1xuICAgICAgICBvID0gdGhpcy5vcHRpb25zLm92ZXJsb2FkVHJhbnNsYXRpb25PcHRpb25IYW5kbGVyKFtrZXksIG9wdHNdLmNvbmNhdChyZXN0KSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvID0geyAuLi5vcHRzIH07XG4gICAgICB9XG5cbiAgICAgIG8ubG5nID0gby5sbmcgfHwgZml4ZWRULmxuZztcbiAgICAgIG8ubG5ncyA9IG8ubG5ncyB8fCBmaXhlZFQubG5ncztcbiAgICAgIC8vIERldGVjdCBwZXItY2FsbCBleHBsaWNpdCBgbnNgIEJFRk9SRSBhdXRvLWZpbGxpbmcgZnJvbSBmaXhlZFQubnMsIHNvIHRoZVxuICAgICAgLy8gc2VsZWN0b3IgY2FuIHByZWZlciBjYWxsLWxldmVsIG5zIG92ZXIgdGhlIGJvdW5kIHNjb3BlTnMuXG4gICAgICBjb25zdCBleHBsaWNpdENhbGxOcyA9IG8ubnMgIT09IHVuZGVmaW5lZCAmJiBvLm5zICE9PSBudWxsO1xuICAgICAgby5ucyA9IG8ubnMgfHwgZml4ZWRULm5zO1xuICAgICAgaWYgKG8ua2V5UHJlZml4ICE9PSAnJykgby5rZXlQcmVmaXggPSBvLmtleVByZWZpeCB8fCBrZXlQcmVmaXggfHwgZml4ZWRULmtleVByZWZpeDtcblxuICAgICAgLy8ga2V5c0Zyb21TZWxlY3RvciBtdXN0IGJlIGNhbGxlZCBhZnRlciBvLm5zIGlzIHJlc29sdmVkIGFib3ZlLCBzbyB0aGF0IG5hbWVzcGFjZVxuICAgICAgLy8gcmV3cml0aW5nIHVzZXMgdGhlIGVmZmVjdGl2ZSBuYW1lc3BhY2UgKGUuZy4gdGhlIG9uZSBmaXhlZCBieSBnZXRGaXhlZFQpIHJhdGhlclxuICAgICAgLy8gdGhhbiB0aGUgcmF3IGdsb2JhbCBucyBhcnJheSBmcm9tIHRoaXMub3B0aW9ucy4gUHJlY2VkZW5jZSBmb3Igc2VsZWN0b3JcbiAgICAgIC8vIG5zLWRldGVjdGlvbiAoaGlnaGVzdCBmaXJzdCk6XG4gICAgICAvLyAgIDEuIGBvLm5zYCBpZiB0aGUgY2FsbGVyIHBhc3NlZCBpdCBleHBsaWNpdGx5IG9uIHRoaXMgY2FsbFxuICAgICAgLy8gICAyLiBgc2NvcGVOc2AgaWYgdGhlIGJvdW5kIHQgY2FycmllcyBpdCAodGhlIGhvb2sncyBmdWxsIG5zIGxpc3QpXG4gICAgICAvLyAgIDMuIGBvLm5zYCBwb3B1bGF0ZWQgZnJvbSBmaXhlZFQubnMgLyB0aGlzLm9wdGlvbnNcbiAgICAgIC8vIFRoaXMgZGVjb3VwbGVzIHNlbGVjdG9yIHBhdGhbMF0gbWF0Y2hpbmcgZnJvbSByZXNvbHV0aW9uIHNjb3BlLiBgby5uc2BcbiAgICAgIC8vIGNvbnRpbnVlcyB0byBkcml2ZSBgVHJhbnNsYXRvci50cmFuc2xhdGVgIHJlc29sdXRpb24gdW5jaGFuZ2VkLlxuICAgICAgY29uc3Qgc2VsZWN0b3JPcHRzID0geyAuLi50aGlzLm9wdGlvbnMsIC4uLm8gfTtcbiAgICAgIGlmIChBcnJheS5pc0FycmF5KHNjb3BlTnMpICYmICFleHBsaWNpdENhbGxOcykgc2VsZWN0b3JPcHRzLm5zID0gc2NvcGVOcztcbiAgICAgIGlmICh0eXBlb2Ygby5rZXlQcmVmaXggPT09ICdmdW5jdGlvbicpIG8ua2V5UHJlZml4ID0ga2V5c0Zyb21TZWxlY3RvcihvLmtleVByZWZpeCwgc2VsZWN0b3JPcHRzKTtcbiAgICAgIGNvbnN0IGtleVNlcGFyYXRvciA9IHRoaXMub3B0aW9ucy5rZXlTZXBhcmF0b3IgfHwgJy4nO1xuICAgICAgbGV0IHJlc3VsdEtleVxuICAgICAgaWYgKG8ua2V5UHJlZml4ICYmIEFycmF5LmlzQXJyYXkoa2V5KSkge1xuICAgICAgICByZXN1bHRLZXkgPSBrZXkubWFwKGsgPT4ge1xuICAgICAgICAgIGlmICh0eXBlb2YgayA9PT0gJ2Z1bmN0aW9uJykgayA9IGtleXNGcm9tU2VsZWN0b3Ioaywgc2VsZWN0b3JPcHRzKTtcbiAgICAgICAgICByZXR1cm4gYCR7by5rZXlQcmVmaXh9JHtrZXlTZXBhcmF0b3J9JHtrfWBcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAodHlwZW9mIGtleSA9PT0gJ2Z1bmN0aW9uJykga2V5ID0ga2V5c0Zyb21TZWxlY3RvcihrZXksIHNlbGVjdG9yT3B0cyk7XG4gICAgICAgIHJlc3VsdEtleSA9IG8ua2V5UHJlZml4ID8gYCR7by5rZXlQcmVmaXh9JHtrZXlTZXBhcmF0b3J9JHtrZXl9YCA6IGtleTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzLnQocmVzdWx0S2V5LCBvKTtcbiAgICB9O1xuICAgIGlmIChpc1N0cmluZyhsbmcpKSB7XG4gICAgICBmaXhlZFQubG5nID0gbG5nO1xuICAgIH0gZWxzZSB7XG4gICAgICBmaXhlZFQubG5ncyA9IGxuZztcbiAgICB9XG4gICAgZml4ZWRULm5zID0gbnM7XG4gICAgZml4ZWRULmtleVByZWZpeCA9IGtleVByZWZpeDtcbiAgICByZXR1cm4gZml4ZWRUO1xuICB9XG5cbiAgdCguLi5hcmdzKSB7XG4gICAgaWYgKCF0aGlzLnRyYW5zbGF0b3IpIHtcbiAgICAgIHRoaXMubG9nZ2VyLndhcm4oJ3Q6IGNhbGxlZCBiZWZvcmUgaW5pdCgpOyByZXR1cm5pbmcgYW4gZW1wdHkgc3RyaW5nJyk7XG4gICAgICByZXR1cm4gJyc7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnRyYW5zbGF0b3IudHJhbnNsYXRlKC4uLmFyZ3MpO1xuICB9XG5cbiAgZXhpc3RzKC4uLmFyZ3MpIHtcbiAgICByZXR1cm4gdGhpcy50cmFuc2xhdG9yPy5leGlzdHMoLi4uYXJncyk7XG4gIH1cblxuICBzZXREZWZhdWx0TmFtZXNwYWNlKG5zKSB7XG4gICAgdGhpcy5vcHRpb25zLmRlZmF1bHROUyA9IG5zO1xuICAgIC8vIGEgY2xvbmUncyB0cmFuc2xhdG9yIGhhcyBpdHMgb3duIG9wdGlvbnMgb2JqZWN0IChzZWUgY2xvbmVJbnN0YW5jZSlcbiAgICBpZiAodGhpcy50cmFuc2xhdG9yPy5vcHRpb25zKSB0aGlzLnRyYW5zbGF0b3Iub3B0aW9ucy5kZWZhdWx0TlMgPSBucztcbiAgfVxuXG4gIGhhc0xvYWRlZE5hbWVzcGFjZShucywgb3B0aW9ucyA9IHt9KSB7XG4gICAgaWYgKCF0aGlzLmlzSW5pdGlhbGl6ZWQpIHtcbiAgICAgIHRoaXMubG9nZ2VyLndhcm4oJ2hhc0xvYWRlZE5hbWVzcGFjZTogaTE4bmV4dCB3YXMgbm90IGluaXRpYWxpemVkJywgdGhpcy5sYW5ndWFnZXMpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBpZiAoIXRoaXMubGFuZ3VhZ2VzIHx8ICF0aGlzLmxhbmd1YWdlcy5sZW5ndGgpIHtcbiAgICAgIHRoaXMubG9nZ2VyLndhcm4oJ2hhc0xvYWRlZE5hbWVzcGFjZTogaTE4bi5sYW5ndWFnZXMgd2VyZSB1bmRlZmluZWQgb3IgZW1wdHknLCB0aGlzLmxhbmd1YWdlcyk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgY29uc3QgbG5nID0gb3B0aW9ucy5sbmcgfHwgdGhpcy5yZXNvbHZlZExhbmd1YWdlIHx8IHRoaXMubGFuZ3VhZ2VzWzBdO1xuICAgIGNvbnN0IGZhbGxiYWNrTG5nID0gdGhpcy5vcHRpb25zID8gdGhpcy5vcHRpb25zLmZhbGxiYWNrTG5nIDogZmFsc2U7XG4gICAgY29uc3QgbGFzdExuZyA9IHRoaXMubGFuZ3VhZ2VzW3RoaXMubGFuZ3VhZ2VzLmxlbmd0aCAtIDFdO1xuXG4gICAgLy8gd2UncmUgaW4gY2ltb2RlIHNvIHRoaXMgc2hhbGwgcGFzc1xuICAgIGlmIChsbmcudG9Mb3dlckNhc2UoKSA9PT0gJ2NpbW9kZScpIHJldHVybiB0cnVlO1xuXG4gICAgY29uc3QgbG9hZE5vdFBlbmRpbmcgPSAobCwgbikgPT4ge1xuICAgICAgY29uc3QgbG9hZFN0YXRlID0gdGhpcy5zZXJ2aWNlcy5iYWNrZW5kQ29ubmVjdG9yLnN0YXRlW2Ake2x9fCR7bn1gXTtcbiAgICAgIHJldHVybiBsb2FkU3RhdGUgPT09IC0xIHx8IGxvYWRTdGF0ZSA9PT0gMCB8fCBsb2FkU3RhdGUgPT09IDI7XG4gICAgfTtcblxuICAgIC8vIG9wdGlvbmFsIGluamVjdGVkIGNoZWNrXG4gICAgaWYgKG9wdGlvbnMucHJlY2hlY2spIHtcbiAgICAgIGNvbnN0IHByZVJlc3VsdCA9IG9wdGlvbnMucHJlY2hlY2sodGhpcywgbG9hZE5vdFBlbmRpbmcpO1xuICAgICAgaWYgKHByZVJlc3VsdCAhPT0gdW5kZWZpbmVkKSByZXR1cm4gcHJlUmVzdWx0O1xuICAgIH1cblxuICAgIC8vIGxvYWRlZCAtPiBTVUNDRVNTXG4gICAgaWYgKHRoaXMuaGFzUmVzb3VyY2VCdW5kbGUobG5nLCBucykpIHJldHVybiB0cnVlO1xuXG4gICAgLy8gd2VyZSBub3QgbG9hZGluZyBhdCBhbGwgLT4gU0VNSSBTVUNDRVNTXG4gICAgaWYgKCF0aGlzLnNlcnZpY2VzLmJhY2tlbmRDb25uZWN0b3IuYmFja2VuZCB8fCAodGhpcy5vcHRpb25zLnJlc291cmNlcyAmJiAhdGhpcy5vcHRpb25zLnBhcnRpYWxCdW5kbGVkTGFuZ3VhZ2VzKSkgcmV0dXJuIHRydWU7XG5cbiAgICAvLyBhIHBhc3NlZCBpbiBsbmcgaXMgYSByYXcgY29kZTogbG9hZExhbmd1YWdlcygpIHN0b3JlcyBpdCB1bmRlciBpdHMgcmVzb2x2ZWQgY29kZSAoZm9ybWF0dGVkLCByZWR1Y2VkXG4gICAgLy8gcGVyIGBsb2FkYCksIG9yIHNraXBzIGl0IGVudGlyZWx5IG91dHNpZGUgc3VwcG9ydGVkTG5ncyAtIGNoZWNraW5nIHRoZSByYXcgY29kZSB3b3VsZCB3YWl0IGZvcmV2ZXJcbiAgICBjb25zdCB7IGxhbmd1YWdlVXRpbHMgfSA9IHRoaXMuc2VydmljZXM7XG4gICAgY29uc3QgbG9hZExuZyA9ICFvcHRpb25zLmxuZyA/IGxuZyA6IGxhbmd1YWdlVXRpbHMuaXNTdXBwb3J0ZWRDb2RlKGxuZykgJiYgbGFuZ3VhZ2VVdGlscy50b1Jlc29sdmVIaWVyYXJjaHkobG5nLCBmYWxzZSlbMF07XG5cbiAgICAvLyBmYWlsZWQgbG9hZGluZyBucyAtIGJ1dCBhdCBsZWFzdCBmYWxsYmFjayBpcyBub3QgcGVuZGluZyAtPiBTRU1JIFNVQ0NFU1NcbiAgICBpZiAoKCFsb2FkTG5nIHx8IGxvYWROb3RQZW5kaW5nKGxvYWRMbmcsIG5zKSkgJiYgKCFmYWxsYmFja0xuZyB8fCBsb2FkTm90UGVuZGluZyhsYXN0TG5nLCBucykpKSByZXR1cm4gdHJ1ZTtcblxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGxvYWROYW1lc3BhY2VzKG5zLCBjYWxsYmFjaykge1xuICAgIGNvbnN0IGRlZmVycmVkID0gZGVmZXIoKTtcblxuICAgIC8vIGJlZm9yZSBpbml0KCkgKHJlYWN0LWkxOG5leHQncyB1c2VUcmFuc2xhdGlvbiBjYW4gY2FsbCBpdCB0aGVuKTogbm90aGluZyB0byBsb2FkIHlldCwgYXMgaW4gdjI2LFxuICAgIC8vIHdoZXJlIHRoZSBvcHRpb25zIG9mIGFuIGluc3RhbmNlIHdlcmUgZW1wdHkgdW50aWwgaW5pdCgpXG4gICAgaWYgKCF0aGlzLm9wdGlvbnMubnMgfHwgIXRoaXMuc2VydmljZXMuYmFja2VuZENvbm5lY3Rvcikge1xuICAgICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjaygpO1xuICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICAgIH1cbiAgICBpZiAoaXNTdHJpbmcobnMpKSBucyA9IFtuc107XG5cbiAgICBucy5mb3JFYWNoKG4gPT4ge1xuICAgICAgaWYgKCF0aGlzLm9wdGlvbnMubnMuaW5jbHVkZXMobikpIHRoaXMub3B0aW9ucy5ucy5wdXNoKG4pO1xuICAgIH0pO1xuXG4gICAgdGhpcy5sb2FkUmVzb3VyY2VzKGVyciA9PiB7XG4gICAgICBkZWZlcnJlZC5yZXNvbHZlKCk7XG4gICAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrKGVycik7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gZGVmZXJyZWQ7XG4gIH1cblxuICBsb2FkTGFuZ3VhZ2VzKGxuZ3MsIGNhbGxiYWNrKSB7XG4gICAgY29uc3QgZGVmZXJyZWQgPSBkZWZlcigpO1xuXG4gICAgaWYgKGlzU3RyaW5nKGxuZ3MpKSBsbmdzID0gW2xuZ3NdO1xuICAgIGNvbnN0IHByZWxvYWRlZCA9IHRoaXMub3B0aW9ucy5wcmVsb2FkIHx8IFtdO1xuXG4gICAgY29uc3QgbmV3TG5ncyA9IGxuZ3MuZmlsdGVyKGxuZyA9PiAhcHJlbG9hZGVkLmluY2x1ZGVzKGxuZykgJiYgIWlzUmVmdXNlZExhbmd1YWdlQ29kZSh0aGlzLCBsbmcpICYmIHRoaXMuc2VydmljZXMubGFuZ3VhZ2VVdGlscy5pc1N1cHBvcnRlZENvZGUobG5nKSk7XG4gICAgLy8gRXhpdCBlYXJseSBpZiBhbGwgZ2l2ZW4gbGFuZ3VhZ2VzIGFyZSBhbHJlYWR5IHByZWxvYWRlZFxuICAgIGlmICghbmV3TG5ncy5sZW5ndGgpIHtcbiAgICAgIGlmIChjYWxsYmFjaykgY2FsbGJhY2soKTtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcbiAgICB9XG5cbiAgICB0aGlzLm9wdGlvbnMucHJlbG9hZCA9IHByZWxvYWRlZC5jb25jYXQobmV3TG5ncyk7XG4gICAgdGhpcy5sb2FkUmVzb3VyY2VzKGVyciA9PiB7XG4gICAgICBkZWZlcnJlZC5yZXNvbHZlKCk7XG4gICAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrKGVycik7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gZGVmZXJyZWQ7XG4gIH1cblxuICBkaXIobG5nKSB7XG4gICAgaWYgKCFsbmcpIGxuZyA9IHRoaXMucmVzb2x2ZWRMYW5ndWFnZSB8fCAodGhpcy5sYW5ndWFnZXM/Lmxlbmd0aCA+IDAgPyB0aGlzLmxhbmd1YWdlc1swXSA6IHRoaXMubGFuZ3VhZ2UpO1xuICAgIGlmICghbG5nKSByZXR1cm4gJ2x0cic7XG5cbiAgICB0cnkge1xuICAgICAgY29uc3QgbCA9IG5ldyBJbnRsLkxvY2FsZShsbmcpXG4gICAgICBpZiAobCAmJiBsLmdldFRleHRJbmZvKSB7XG4gICAgICAgIGNvbnN0IHRpID0gbC5nZXRUZXh0SW5mbygpXG4gICAgICAgIGlmICh0aSAmJiB0aS5kaXJlY3Rpb24pIHJldHVybiB0aS5kaXJlY3Rpb25cbiAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7LyogZmFsbCB0aHJvdWdoICovfVxuXG4gICAgY29uc3QgcnRsTG5ncyA9IFtcbiAgICAgICdhcicsXG4gICAgICAnc2h1JyxcbiAgICAgICdzcXInLFxuICAgICAgJ3NzaCcsXG4gICAgICAneGFhJyxcbiAgICAgICd5aGQnLFxuICAgICAgJ3l1ZCcsXG4gICAgICAnYWFvJyxcbiAgICAgICdhYmgnLFxuICAgICAgJ2FidicsXG4gICAgICAnYWNtJyxcbiAgICAgICdhY3EnLFxuICAgICAgJ2FjdycsXG4gICAgICAnYWN4JyxcbiAgICAgICdhY3knLFxuICAgICAgJ2FkZicsXG4gICAgICAnYWRzJyxcbiAgICAgICdhZWInLFxuICAgICAgJ2FlYycsXG4gICAgICAnYWZiJyxcbiAgICAgICdhanAnLFxuICAgICAgJ2FwYycsXG4gICAgICAnYXBkJyxcbiAgICAgICdhcmInLFxuICAgICAgJ2FycScsXG4gICAgICAnYXJzJyxcbiAgICAgICdhcnknLFxuICAgICAgJ2FyeicsXG4gICAgICAnYXV6JyxcbiAgICAgICdhdmwnLFxuICAgICAgJ2F5aCcsXG4gICAgICAnYXlsJyxcbiAgICAgICdheW4nLFxuICAgICAgJ2F5cCcsXG4gICAgICAnYmJ6JyxcbiAgICAgICdwZ2EnLFxuICAgICAgJ2hlJyxcbiAgICAgICdpdycsXG4gICAgICAncHMnLFxuICAgICAgJ3BidCcsXG4gICAgICAncGJ1JyxcbiAgICAgICdwc3QnLFxuICAgICAgJ3BycCcsXG4gICAgICAncHJkJyxcbiAgICAgICd1ZycsXG4gICAgICAndXInLFxuICAgICAgJ3lkZCcsXG4gICAgICAneWRzJyxcbiAgICAgICd5aWgnLFxuICAgICAgJ2ppJyxcbiAgICAgICd5aScsXG4gICAgICAnaGJvJyxcbiAgICAgICdtZW4nLFxuICAgICAgJ3htbicsXG4gICAgICAnZmEnLFxuICAgICAgJ2pwcicsXG4gICAgICAncGVvJyxcbiAgICAgICdwZXMnLFxuICAgICAgJ3BycycsXG4gICAgICAnZHYnLFxuICAgICAgJ3NhbScsXG4gICAgICAnY2tiJ1xuICAgIF07XG5cbiAgICBjb25zdCBsYW5ndWFnZVV0aWxzID0gdGhpcy5zZXJ2aWNlcz8ubGFuZ3VhZ2VVdGlscyB8fCBuZXcgTGFuZ3VhZ2VVdGlscyhnZXREZWZhdWx0cygpKSAvLyBmb3IgdW5pbml0aWFsaXplZCB1c2FnZVxuICAgIGlmIChsbmcudG9Mb3dlckNhc2UoKS5pbmRleE9mKCctbGF0bicpID4gMSkgcmV0dXJuICdsdHInO1xuXG4gICAgLy8gdGhlIGxpc3QgaXMgbG93ZXJjYXNlOiB3aXRoIGNsZWFuQ29kZTogZmFsc2UgdGhlIGxhbmd1YWdlIHBhcnQga2VlcHMgaXRzIGNhc2luZyAoJ0FSJylcbiAgICByZXR1cm4gcnRsTG5ncy5pbmNsdWRlcyhsYW5ndWFnZVV0aWxzLmdldExhbmd1YWdlUGFydEZyb21Db2RlKGxuZyk/LnRvTG93ZXJDYXNlKCkpIHx8IGxuZy50b0xvd2VyQ2FzZSgpLmluZGV4T2YoJy1hcmFiJykgPiAxXG4gICAgICA/ICdydGwnXG4gICAgICA6ICdsdHInO1xuICB9XG5cbiAgc3RhdGljIGNyZWF0ZUluc3RhbmNlKG9wdGlvbnMgPSB7fSwgY2FsbGJhY2spIHtcbiAgICBjb25zdCBpbnN0YW5jZSA9IG5ldyBJMThuKG9wdGlvbnMsIGNhbGxiYWNrKVxuICAgIGluc3RhbmNlLmNyZWF0ZUluc3RhbmNlID0gSTE4bi5jcmVhdGVJbnN0YW5jZTtcbiAgICByZXR1cm4gaW5zdGFuY2U7XG4gIH1cblxuICBjbG9uZUluc3RhbmNlKG9wdGlvbnMgPSB7fSwgY2FsbGJhY2sgPSBub29wKSB7XG4gICAgY29uc3QgZm9ya1Jlc291cmNlU3RvcmUgPSBvcHRpb25zLmZvcmtSZXNvdXJjZVN0b3JlO1xuICAgIGlmIChmb3JrUmVzb3VyY2VTdG9yZSkge1xuICAgICAgb3B0aW9ucyA9IHsgLi4ub3B0aW9ucyB9O1xuICAgICAgZGVsZXRlIG9wdGlvbnMuZm9ya1Jlc291cmNlU3RvcmU7XG4gICAgfVxuICAgIC8vIHByZWxvYWQgaXMgbm90IGluaGVyaXRlZDogdGhlIHBhcmVudCBhbHJlYWR5IGxvYWRlZCBpdCBpbnRvIHRoZSBzaGFyZWQgc3RvcmUsIGFuZCByZS1xdWV1ZWluZyBpdCBvbiBldmVyeSBjbG9uZSdzXG4gICAgLy8gY2hhbmdlTGFuZ3VhZ2UgY29zdHMgbGFuZ3VhZ2VzIMOXIG5hbWVzcGFjZXMgcGVyIGNhbGwgKGh0dHBzOi8vZ2l0aHViLmNvbS9pMThuZXh0L2kxOG5leHQvaXNzdWVzLzI0NTEpXG4gICAgY29uc3QgbWVyZ2VkT3B0aW9ucyA9IHsgLi4udGhpcy5vcHRpb25zLCBwcmVsb2FkOiBmYWxzZSwgLi4ub3B0aW9ucywgLi4ueyBpc0Nsb25lOiB0cnVlIH0gfTtcbiAgICBjb25zdCBjbG9uZSA9IG5ldyBJMThuKG1lcmdlZE9wdGlvbnMpO1xuICAgIC8vIGEgY2xvbmUgbG9ncyB0aHJvdWdoIGl0cyBwYXJlbnQncyBsb2dnZXIsIG9yIGEgY29weSBvZiBpdCB3aXRoIGl0cyBvd24gZGVidWcgb3IgcHJlZml4IChpdHNcbiAgICAvLyBzZXJ2aWNlcywgdHJhbnNsYXRvciBpbmNsdWRlZCwga2VlcCB0aGUgcGFyZW50J3MsIGFzIGJlZm9yZSlcbiAgICBjbG9uZS5sb2dnZXIgPSBvcHRpb25zLmRlYnVnICE9PSB1bmRlZmluZWQgfHwgb3B0aW9ucy5wcmVmaXggIT09IHVuZGVmaW5lZFxuICAgICAgPyB0aGlzLmxvZ2dlci5jbG9uZShvcHRpb25zKVxuICAgICAgOiB0aGlzLmxvZ2dlcjtcbiAgICBjb25zdCBtZW1iZXJzVG9Db3B5ID0gWydzdG9yZScsICdsYW5ndWFnZSddO1xuICAgIG1lbWJlcnNUb0NvcHkuZm9yRWFjaChtID0+IHtcbiAgICAgIGNsb25lW21dID0gdGhpc1ttXTtcbiAgICB9KTtcbiAgICBjbG9uZS5zZXJ2aWNlcyA9IHsgLi4udGhpcy5zZXJ2aWNlcyB9O1xuICAgIC8vIGl0IHNlZXMgd2hhdCBpdHMgcGFyZW50IHJlZ2lzdGVycywgYWxzbyBsYXRlcjsgd2hhdCBpdCByZWdpc3RlcnMgaXRzZWxmIHN0YXlzIGl0cyBvd25cbiAgICBjbG9uZS5zZXJ2aWNlcy5wb3N0UHJvY2Vzc29ycyA9IE9iamVjdC5jcmVhdGUodGhpcy5zZXJ2aWNlcy5wb3N0UHJvY2Vzc29ycyk7XG4gICAgY2xvbmUuc2VydmljZXMudXRpbHMgPSB7XG4gICAgICAuLi5jbG9uZS5zZXJ2aWNlcy51dGlscyxcbiAgICAgIGhhc0xvYWRlZE5hbWVzcGFjZTogY2xvbmUuaGFzTG9hZGVkTmFtZXNwYWNlLmJpbmQoY2xvbmUpLFxuICAgICAgcmVsb2FkUmVzb3VyY2VzOiBjbG9uZS5yZWxvYWRSZXNvdXJjZXMuYmluZChjbG9uZSlcbiAgICB9O1xuICAgIGlmIChmb3JrUmVzb3VyY2VTdG9yZSkge1xuICAgICAgLy8gZmFzdGVyIHRoYW4gY29uc3QgY2xvbmVkRGF0YSA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkodGhpcy5zdG9yZS5kYXRhKSlcbiAgICAgIGNvbnN0IGNvcHlEYXRhID0gb2JqID0+IHtcbiAgICAgICAgY29uc3QgY29waWVkID0gQXJyYXkuaXNBcnJheShvYmopID8gWy4uLm9ial0gOiB7IC4uLm9iaiB9O1xuICAgICAgICBPYmplY3Qua2V5cyhjb3BpZWQpLmZvckVhY2goayA9PiB7XG4gICAgICAgICAgaWYgKGNvcGllZFtrXSAmJiB0eXBlb2YgY29waWVkW2tdID09PSAnb2JqZWN0JykgY29waWVkW2tdID0gY29weURhdGEoY29waWVkW2tdKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBjb3BpZWQ7XG4gICAgICB9O1xuICAgICAgY29uc3QgY2xvbmVkRGF0YSA9IGNvcHlEYXRhKHRoaXMuc3RvcmUuZGF0YSk7XG4gICAgICBjbG9uZS5zdG9yZSA9IG5ldyBSZXNvdXJjZVN0b3JlKGNsb25lZERhdGEsIG1lcmdlZE9wdGlvbnMsIHRoaXMubG9nZ2VyKTtcbiAgICAgIGNsb25lLnNlcnZpY2VzLnJlc291cmNlU3RvcmUgPSBjbG9uZS5zdG9yZTtcbiAgICB9XG4gICAgLy8gRW5zdXJlIGludGVycG9sYXRpb24gb3B0aW9ucyBhcmUgYWx3YXlzIG1lcmdlZCB3aXRoIGRlZmF1bHRzIHdoZW4gY2xvbmluZ1xuICAgIGlmIChvcHRpb25zLmludGVycG9sYXRpb24pIHtcbiAgICAgIGNvbnN0IGRlZk9wdHMgPSBnZXREZWZhdWx0cygpO1xuICAgICAgY29uc3QgbWVyZ2VkSW50ZXJwb2xhdGlvbiA9IHsgLi4uZGVmT3B0cy5pbnRlcnBvbGF0aW9uLCAuLi50aGlzLm9wdGlvbnMuaW50ZXJwb2xhdGlvbiwgLi4ub3B0aW9ucy5pbnRlcnBvbGF0aW9uIH07XG4gICAgICBjb25zdCBtZXJnZWRGb3JJbnRlcnBvbGF0b3IgPSB7IC4uLm1lcmdlZE9wdGlvbnMsIGludGVycG9sYXRpb246IG1lcmdlZEludGVycG9sYXRpb24gfTtcbiAgICAgIGNsb25lLnNlcnZpY2VzLmludGVycG9sYXRvciA9IG5ldyBJbnRlcnBvbGF0b3IobWVyZ2VkRm9ySW50ZXJwb2xhdG9yLCB0aGlzLmxvZ2dlcik7XG4gICAgfVxuICAgIC8vIHRoZSBjb2RlcyB0aGUgcGFyZW50IHdhcyBjb25maWd1cmVkIHdpdGggYXQgaXRzIGluaXQoKSwgcGx1cyB0aG9zZSBpbiB0aGUgb3B0aW9ucyBnaXZlbiBoZXJlOyBub3QgdGhlXG4gICAgLy8gbGFuZ3VhZ2VzIGFkZGVkIHRvIHRoZSBzaGFyZWQgc3RvcmUgc2luY2VcbiAgICBjbG9uZS5jb25maWd1cmVkTG5ncyA9IG5ldyBTZXQoWy4uLih0aGlzLmNvbmZpZ3VyZWRMbmdzIHx8IFtdKSwgLi4uY29uZmlndXJlZExhbmd1YWdlQ29kZXMob3B0aW9ucyldKTtcbiAgICBjbG9uZS50cmFuc2xhdG9yID0gbmV3IFRyYW5zbGF0b3IoY2xvbmUuc2VydmljZXMsIG1lcmdlZE9wdGlvbnMpO1xuICAgIGNsb25lLnRyYW5zbGF0b3Iub24oJyonLCAoZXZlbnQsIC4uLmFyZ3MpID0+IHtcbiAgICAgIGNsb25lLmVtaXQoZXZlbnQsIC4uLmFyZ3MpO1xuICAgIH0pO1xuICAgIGNsb25lLmluaXQobWVyZ2VkT3B0aW9ucywgY2FsbGJhY2spO1xuICAgIGNsb25lLnRyYW5zbGF0b3Iub3B0aW9ucyA9IG1lcmdlZE9wdGlvbnM7IC8vIHN5bmMgb3B0aW9uc1xuICAgIC8vIGRpcmVjdCBjYWxsZXJzIG9mIHRoZSBzaGFyZWQgY29ubmVjdG9yJ3Mgc2F2ZU1pc3NpbmcoKSAoaTE4bmV4dC1odHRwLW1pZGRsZXdhcmUncyBtaXNzaW5nIGtleXMgcm91dGUpXG4gICAgLy8ga2VlcCBjaGVja2luZyB0aGUgbmV3ZXN0IGNsb25lLCBhcyBiZWZvcmU7IHRoZSB0cmFuc2xhdG9ycyBwYXNzIHRoZSBjaGVjayBvZiB0aGVpciBvd24gaW5zdGFuY2VcbiAgICBjbG9uZS50cmFuc2xhdG9yLmJhY2tlbmRDb25uZWN0b3IubmV3ZXN0Q2xvbmVIYXNMb2FkZWROYW1lc3BhY2UgPSBjbG9uZS5oYXNMb2FkZWROYW1lc3BhY2UuYmluZChjbG9uZSk7XG5cbiAgICByZXR1cm4gY2xvbmU7XG4gIH1cblxuICB0b0pTT04oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIG9wdGlvbnM6IHRoaXMub3B0aW9ucyxcbiAgICAgIHN0b3JlOiB0aGlzLnN0b3JlLFxuICAgICAgbGFuZ3VhZ2U6IHRoaXMubGFuZ3VhZ2UsXG4gICAgICBsYW5ndWFnZXM6IHRoaXMubGFuZ3VhZ2VzLFxuICAgICAgcmVzb2x2ZWRMYW5ndWFnZTogdGhpcy5yZXNvbHZlZExhbmd1YWdlXG4gICAgfTtcbiAgfVxufVxuXG5jb25zdCBpbnN0YW5jZSA9IEkxOG4uY3JlYXRlSW5zdGFuY2UoKTtcblxuZXhwb3J0IGRlZmF1bHQgaW5zdGFuY2U7XG4iLCJpbXBvcnQgaTE4bmV4dCBmcm9tICcuL2kxOG5leHQuanMnO1xuXG5leHBvcnQgeyBkZWZhdWx0IGFzIGtleUZyb21TZWxlY3RvciB9IGZyb20gJy4vc2VsZWN0b3IuanMnO1xuZXhwb3J0IHsgaXNTYWZlTGFuZ3VhZ2VDb2RlIH0gZnJvbSAnLi91dGlscy5qcyc7XG5cbmV4cG9ydCBkZWZhdWx0IGkxOG5leHQ7XG5cbmV4cG9ydCBjb25zdCBjcmVhdGVJbnN0YW5jZSA9IGkxOG5leHQuY3JlYXRlSW5zdGFuY2U7XG5cbmV4cG9ydCBjb25zdCBkaXIgPSBpMThuZXh0LmRpcjtcbmV4cG9ydCBjb25zdCBpbml0ID0gaTE4bmV4dC5pbml0O1xuZXhwb3J0IGNvbnN0IGxvYWRSZXNvdXJjZXMgPSBpMThuZXh0LmxvYWRSZXNvdXJjZXM7XG5leHBvcnQgY29uc3QgcmVsb2FkUmVzb3VyY2VzID0gaTE4bmV4dC5yZWxvYWRSZXNvdXJjZXM7XG5leHBvcnQgY29uc3QgdXNlID0gaTE4bmV4dC51c2U7XG5leHBvcnQgY29uc3QgY2hhbmdlTGFuZ3VhZ2UgPSBpMThuZXh0LmNoYW5nZUxhbmd1YWdlO1xuZXhwb3J0IGNvbnN0IGdldEZpeGVkVCA9IGkxOG5leHQuZ2V0Rml4ZWRUO1xuZXhwb3J0IGNvbnN0IHQgPSBpMThuZXh0LnQ7XG5leHBvcnQgY29uc3QgZXhpc3RzID0gaTE4bmV4dC5leGlzdHM7XG5leHBvcnQgY29uc3Qgc2V0RGVmYXVsdE5hbWVzcGFjZSA9IGkxOG5leHQuc2V0RGVmYXVsdE5hbWVzcGFjZTtcbmV4cG9ydCBjb25zdCBoYXNMb2FkZWROYW1lc3BhY2UgPSBpMThuZXh0Lmhhc0xvYWRlZE5hbWVzcGFjZTtcbmV4cG9ydCBjb25zdCBsb2FkTmFtZXNwYWNlcyA9IGkxOG5leHQubG9hZE5hbWVzcGFjZXM7XG5leHBvcnQgY29uc3QgbG9hZExhbmd1YWdlcyA9IGkxOG5leHQubG9hZExhbmd1YWdlcztcbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5hbWVzcGFjZSxcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55LFxuICovXG5cbmltcG9ydCB7XG4gICAgZGVmYXVsdCBhcyBpMThuZXh0LFxuICAgIHR5cGUgaTE4biBhcyBpMThuZXh0SW5zdGFuY2UsXG4gICAgdHlwZSBGYWxsYmFja0xuZ09iakxpc3QgYXMgaTE4bmV4dEZhbGxiYWNrTG5nT2JqTGlzdCxcbiAgICB0eXBlIEZhbGxiYWNrTG5nIGFzIGkxOG5leHRGYWxsYmFja0xuZyxcbiAgICB0eXBlIEludGVycG9sYXRpb25PcHRpb25zIGFzIGkxOG5leHRJbnRlcnBvbGF0aW9uT3B0aW9ucyxcbiAgICB0eXBlIFJlYWN0T3B0aW9ucyBhcyBpMThuZXh0UmVhY3RPcHRpb25zLFxuICAgIHR5cGUgSW5pdE9wdGlvbnMgYXMgaTE4bmV4dEluaXRPcHRpb25zLFxuICAgIHR5cGUgVE9wdGlvbnNCYXNlIGFzIGkxOG5leHRUT3B0aW9uc0Jhc2UsXG4gICAgdHlwZSBUT3B0aW9ucyBhcyBpMThuZXh0VE9wdGlvbnMsXG4gICAgdHlwZSBFeGlzdHNGdW5jdGlvbiBhcyBpMThuZXh0RXhpc3RzRnVuY3Rpb24sXG4gICAgdHlwZSBXaXRoVCBhcyBpMThuZXh0V2l0aFQsXG4gICAgdHlwZSBURnVuY3Rpb24gYXMgaTE4bmV4dFRGdW5jdGlvbixcbiAgICB0eXBlIFJlc291cmNlIGFzIGkxOG5leHRSZXNvdXJjZSxcbiAgICB0eXBlIFJlc291cmNlTGFuZ3VhZ2UgYXMgaTE4bmV4dFJlc291cmNlTGFuZ3VhZ2UsXG4gICAgdHlwZSBSZXNvdXJjZUtleSBhcyBpMThuZXh0UmVzb3VyY2VLZXksXG4gICAgdHlwZSBJbnRlcnBvbGF0b3IgYXMgaTE4bmV4dEludGVycG9sYXRvcixcbiAgICB0eXBlIFJlc291cmNlU3RvcmUgYXMgaTE4bmV4dFJlc291cmNlU3RvcmUsXG4gICAgdHlwZSBTZXJ2aWNlcyBhcyBpMThuZXh0U2VydmljZXMsXG4gICAgdHlwZSBNb2R1bGUgYXMgaTE4bmV4dE1vZHVsZSxcbiAgICB0eXBlIENhbGxiYWNrRXJyb3IgYXMgaTE4bmV4dENhbGxiYWNrRXJyb3IsXG4gICAgdHlwZSBSZWFkQ2FsbGJhY2sgYXMgaTE4bmV4dFJlYWRDYWxsYmFjayxcbiAgICB0eXBlIE11bHRpUmVhZENhbGxiYWNrIGFzIGkxOG5leHRNdWx0aVJlYWRDYWxsYmFjayxcbiAgICB0eXBlIEJhY2tlbmRNb2R1bGUgYXMgaTE4bmV4dEJhY2tlbmRNb2R1bGUsXG4gICAgdHlwZSBMYW5ndWFnZURldGVjdG9yTW9kdWxlIGFzIGkxOG5leHRMYW5ndWFnZURldGVjdG9yTW9kdWxlLFxuICAgIHR5cGUgTGFuZ3VhZ2VEZXRlY3RvckFzeW5jTW9kdWxlIGFzIGkxOG5leHRMYW5ndWFnZURldGVjdG9yQXN5bmNNb2R1bGUsXG4gICAgdHlwZSBQb3N0UHJvY2Vzc29yTW9kdWxlIGFzIGkxOG5leHRQb3N0UHJvY2Vzc29yTW9kdWxlLFxuICAgIHR5cGUgTG9nZ2VyTW9kdWxlIGFzIGkxOG5leHRMb2dnZXJNb2R1bGUsXG4gICAgdHlwZSBJMThuRm9ybWF0TW9kdWxlIGFzIGkxOG5leHRJMThuRm9ybWF0TW9kdWxlLFxuICAgIHR5cGUgVGhpcmRQYXJ0eU1vZHVsZSBhcyBpMThuZXh0VGhpcmRQYXJ0eU1vZHVsZSxcbiAgICB0eXBlIE1vZHVsZXMgYXMgaTE4bmV4dE1vZHVsZXMsXG4gICAgdHlwZSBOZXdhYmxlIGFzIGkxOG5leHROZXdhYmxlLFxufSBmcm9tICdpMThuZXh0JztcblxuY29uc3QgaTE4bjogaTE4bi5pMThuID0gaTE4bmV4dDtcblxuZGVjbGFyZSBuYW1lc3BhY2UgaTE4biB7XG4gICAgZXhwb3J0IHR5cGUgaTE4biA9IGkxOG5leHRJbnN0YW5jZTtcbiAgICBleHBvcnQgdHlwZSBGYWxsYmFja0xuZ09iakxpc3QgPSBpMThuZXh0RmFsbGJhY2tMbmdPYmpMaXN0O1xuICAgIGV4cG9ydCB0eXBlIEZhbGxiYWNrTG5nID0gaTE4bmV4dEZhbGxiYWNrTG5nO1xuICAgIGV4cG9ydCB0eXBlIEludGVycG9sYXRpb25PcHRpb25zID0gaTE4bmV4dEludGVycG9sYXRpb25PcHRpb25zO1xuICAgIGV4cG9ydCB0eXBlIFJlYWN0T3B0aW9ucyA9IGkxOG5leHRSZWFjdE9wdGlvbnM7XG4gICAgZXhwb3J0IHR5cGUgSW5pdE9wdGlvbnMgPSBpMThuZXh0SW5pdE9wdGlvbnM7XG4gICAgZXhwb3J0IHR5cGUgVE9wdGlvbnNCYXNlID0gaTE4bmV4dFRPcHRpb25zQmFzZTtcbiAgICBleHBvcnQgdHlwZSBUT3B0aW9uczxUIGV4dGVuZHMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4gPSBSZWNvcmQ8c3RyaW5nLCBhbnk+PiA9IGkxOG5leHRUT3B0aW9uczxUPjtcbiAgICBleHBvcnQgdHlwZSBFeGlzdHNGdW5jdGlvbjxLIGV4dGVuZHMgc3RyaW5nID0gc3RyaW5nLCBUIGV4dGVuZHMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4gPSBSZWNvcmQ8c3RyaW5nLCBhbnk+PiA9IGkxOG5leHRFeGlzdHNGdW5jdGlvbjxLLCBUPjtcbiAgICBleHBvcnQgdHlwZSBXaXRoVCA9IGkxOG5leHRXaXRoVDtcbiAgICBleHBvcnQgdHlwZSBURnVuY3Rpb24gPSBpMThuZXh0VEZ1bmN0aW9uO1xuICAgIGV4cG9ydCB0eXBlIFJlc291cmNlID0gaTE4bmV4dFJlc291cmNlO1xuICAgIGV4cG9ydCB0eXBlIFJlc291cmNlTGFuZ3VhZ2UgPSBpMThuZXh0UmVzb3VyY2VMYW5ndWFnZTtcbiAgICBleHBvcnQgdHlwZSBSZXNvdXJjZUtleSA9IGkxOG5leHRSZXNvdXJjZUtleTtcbiAgICBleHBvcnQgdHlwZSBJbnRlcnBvbGF0b3IgPSBpMThuZXh0SW50ZXJwb2xhdG9yO1xuICAgIGV4cG9ydCB0eXBlIFJlc291cmNlU3RvcmUgPSBpMThuZXh0UmVzb3VyY2VTdG9yZTtcbiAgICBleHBvcnQgdHlwZSBTZXJ2aWNlcyA9IGkxOG5leHRTZXJ2aWNlcztcbiAgICBleHBvcnQgdHlwZSBNb2R1bGUgPSBpMThuZXh0TW9kdWxlO1xuICAgIGV4cG9ydCB0eXBlIENhbGxiYWNrRXJyb3IgPSBpMThuZXh0Q2FsbGJhY2tFcnJvcjtcbiAgICBleHBvcnQgdHlwZSBSZWFkQ2FsbGJhY2sgPSBpMThuZXh0UmVhZENhbGxiYWNrO1xuICAgIGV4cG9ydCB0eXBlIE11bHRpUmVhZENhbGxiYWNrID0gaTE4bmV4dE11bHRpUmVhZENhbGxiYWNrO1xuICAgIGV4cG9ydCB0eXBlIEJhY2tlbmRNb2R1bGU8VCA9IFJlY29yZDxzdHJpbmcsIHVua25vd24+PiA9IGkxOG5leHRCYWNrZW5kTW9kdWxlPFQ+O1xuICAgIGV4cG9ydCB0eXBlIExhbmd1YWdlRGV0ZWN0b3JNb2R1bGUgPSBpMThuZXh0TGFuZ3VhZ2VEZXRlY3Rvck1vZHVsZTtcbiAgICBleHBvcnQgdHlwZSBMYW5ndWFnZURldGVjdG9yQXN5bmNNb2R1bGUgPSBpMThuZXh0TGFuZ3VhZ2VEZXRlY3RvckFzeW5jTW9kdWxlO1xuICAgIGV4cG9ydCB0eXBlIFBvc3RQcm9jZXNzb3JNb2R1bGUgPSBpMThuZXh0UG9zdFByb2Nlc3Nvck1vZHVsZTtcbiAgICBleHBvcnQgdHlwZSBMb2dnZXJNb2R1bGUgPSBpMThuZXh0TG9nZ2VyTW9kdWxlO1xuICAgIGV4cG9ydCB0eXBlIEkxOG5Gb3JtYXRNb2R1bGUgPSBpMThuZXh0STE4bkZvcm1hdE1vZHVsZTtcbiAgICBleHBvcnQgdHlwZSBUaGlyZFBhcnR5TW9kdWxlID0gaTE4bmV4dFRoaXJkUGFydHlNb2R1bGU7XG4gICAgZXhwb3J0IHR5cGUgTW9kdWxlcyA9IGkxOG5leHRNb2R1bGVzO1xuICAgIGV4cG9ydCB0eXBlIE5ld2FibGU8VD4gPSBpMThuZXh0TmV3YWJsZTxUPjtcbn1cblxuZXhwb3J0IHsgaTE4biB9O1xuIl0sIm5hbWVzIjpbInV0aWxzQ29weSIsImVzY2FwZSIsInV0aWxzRXNjYXBlIiwiZ2V0RGVmYXVsdHMiLCJMYW5ndWFnZVV0aWxzIiwiQmFja2VuZENvbm5lY3RvciIsImkxOG5leHQiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0VBQU8sTUFBTSxRQUFRLEdBQUcsQ0FBQyxHQUFHLEtBQUssT0FBTyxHQUFHLEtBQUssUUFBUTs7RUFFeEQ7RUFDTyxNQUFNLEtBQUssR0FBRyxNQUFNO0VBQzNCLEVBQUUsSUFBSSxHQUFHO0VBQ1QsRUFBRSxJQUFJLEdBQUc7O0VBRVQsRUFBRSxNQUFNLE9BQU8sR0FBRyxJQUFJLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxNQUFNLEtBQUs7RUFDbkQsSUFBSSxHQUFHLEdBQUcsT0FBTztFQUNqQixJQUFJLEdBQUcsR0FBRyxNQUFNO0VBQ2hCLEVBQUUsQ0FBQyxDQUFDOztFQUVKLEVBQUUsT0FBTyxDQUFDLE9BQU8sR0FBRyxHQUFHO0VBQ3ZCLEVBQUUsT0FBTyxDQUFDLE1BQU0sR0FBRyxHQUFHOztFQUV0QixFQUFFLE9BQU8sT0FBTztFQUNoQixDQUFDOztFQUVNLE1BQU0sVUFBVSxHQUFHLENBQUMsTUFBTSxLQUFLO0VBQ3RDLEVBQUUsSUFBSSxNQUFNLElBQUksSUFBSSxFQUFFLE9BQU8sRUFBRTtFQUMvQixFQUFFLE9BQU8sTUFBTSxDQUFDLE1BQU0sQ0FBQztFQUN2QixDQUFDOztFQUVEO0VBQ0E7RUFDQTtFQUNPLE1BQU0sa0JBQWtCLEdBQUcsQ0FBQyxJQUFJO0VBQ3ZDLEVBQUUsUUFBUSxDQUFDLElBQUksQ0FBQztFQUNoQixFQUFFLDBCQUEwQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7RUFDdkMsRUFBRSxD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QUFRLENBQUMsS0FBSyxJQUFJLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtFQUMzRixJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxRQUFRO0VBQ3JCLElBQUk7RUFDSixFQUFFOztFQUVGLEVBQUUsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO0VBQy9CLEVBQUUsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7RUFDeEMsRUFBRSxJQUFJLElBQUksR0FBRyxhQUFhLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxNQUFNLENBQUM7RUFDN0MsRUFBRSxPQUFPLElBQUksQ0FBQyxHQUFHLEtBQUssU0FBUyxJQUFJLENBQUMsQ0FBQyxNQUFNLEVBQUU7RUFDN0MsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztFQUNqQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztFQUNoQyxJQUFJLElBQUksR0FBRyxhQUFhLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxNQUFNLENBQUM7RUFDM0MsSUFBSSxJQUFJLElBQUksRUFBRSxHQUFHLElBQUksT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssV0FBVyxFQUFFO0VBQ3hFLE1BQU0sSUFBSSxDQUFDLEdBQUcsR0FBRyxTQUFTO0VBQzFCLElBQUk7RUFDSixFQUFFO0VBQ0YsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFD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QyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDOztFQUUxRyxJQUFJLE9BQU8sS0FBSztFQUNoQixFQUFFOztFQUVGLEVBQUUsTUFBTSxHQUFHO0VBQ1gsSUFBSSxPQUFPO0VBQ1gsTUFBTSxPQUFPLEVBQUUsSUFBSSxDQUFDLE9BQU87RUFDM0IsTUFBTSxLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUs7RUFDdkIsTUFBTSxRQUFRLEVBQUUsSUFBSSxDQUFDLFFBQVE7RUFDN0IsTUFBTSxTQUFTLEVBQUUsSUFBSSxDQUFDLFNBQVM7RUFDL0IsTUFBTSxnQkFBZ0IsRUFBRSxJQUFJLENBQUM7RUFDN0IsS0FBSztFQUNMLEVBQUU7RUFDRjs7RUFFQSxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsY0FBYyxFQUFFOztBQ2wxQlJHLFVBQU8sQ0FBQzs7QUFFbkJBLFVBQU8sQ0FBQztBQUNQQSxVQUFPLENBQUM7QUFDQ0EsVUFBTyxDQUFDO0FBQ05BLFVBQU8sQ0FBQztBQUNwQkEsVUFBTyxDQUFDO0FBQ0dBLFVBQU8sQ0FBQztBQUNiQSxVQUFPLENBQUM7QUFDaEJBLFVBQU8sQ0FBQztBQUNIQSxVQUFPLENBQUM7QUFDS0EsVUFBTyxDQUFDO0FBQ1RBLFVBQU8sQ0FBQztBQUNaQSxVQUFPLENBQUM7QUFDVEEsVUFBTyxDQUFDOztFQ3JCckM7OztFQUdHO0FBb0NILFFBQU0sSUFBSSxHQUFjQTs7Ozs7OyIsInhfZ29vZ2xlX2lnbm9yZUxpc3QiOlswLDEsMiwzLDQsNSw2LDcsOCw5LDEwLDExLDEyLDEzXSwic291cmNlUm9vdCI6ImNkcDovLy9AY2RwL2V4dGVuc2lvbi1pMThuLyJ9