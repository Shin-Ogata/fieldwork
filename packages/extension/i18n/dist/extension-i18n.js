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

  const canNotTraverseDeeper = (object) => !object || isString(object);

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
    if (obj !== undefined || path.length === 1) {
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

    obj[k] = obj[k] || [];
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

  const deepExtend = (target, source, overwrite) => {
    for (const prop in source) {
      if (prop !== '__proto__' && prop !== 'constructor') {
        if (prop in target) {
          // If we reached a leaf string in target or source then replace with source or skip depending on the 'overwrite' switch
          if (
            isString(target[prop]) ||
            target[prop] instanceof String ||
            isString(source[prop]) ||
            source[prop] instanceof String
          ) {
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
    '/': '&#x2F;',
  };

  const escape = (data) => {
    if (isString(data)) {
      return data.replace(/[&<>"'\/]/g, (s) => _entityMap[s]);
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
    const tokens = path.split(keySeparator);
    let current = obj;
    for (let i = 0; i < tokens.length; ) {
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

  class Logger {
    constructor(concreteLogger, options = {}) {
      this.init(concreteLogger, options);
    }

    init(concreteLogger, options = {}) {
      this.prefix = options.prefix || 'i18next:';
      this.logger = concreteLogger || consoleLogger;
      this.options = options;
      this.debug = options.debug;
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

    off(event, listener) {
      if (!this.observers[event]) return;
      if (!listener) {
        delete this.observers[event];
        return;
      }

      this.observers[event].delete(listener);
    }

    once(event, listener) {
      const wrapper = (...args) => {
        listener(...args);
        this.off(event, wrapper);
      };
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

  class ResourceStore extends EventEmitter {
    constructor(data, options = { ns: ['translation'], defaultNS: 'translation' }) {
      super();

      this.data = data || {};
      this.options = options;
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

      let path;
      if (lng.includes('.')) {
        path = lng.split('.');
      } else {
        path = [lng, ns];
        if (key) {
          if (Array.isArray(key)) {
            path.push(...key);
          } else if (isString(key) && keySeparator) {
            path.push(...key.split(keySeparator));
          } else {
            path.push(key);
          }
        }
      }

      const result = getPath(this.data, path);
      if (!result && !ns && !key && lng.includes('.')) {
        lng = path[0];
        ns = path[1];
        key = path.slice(2).join('.');
      }
      if (result || !ignoreJSONStructure || !isString(key)) return result;

      return deepFind(this.data?.[lng]?.[ns], key, keySeparator);
    }

    addResource(lng, ns, key, value, options = { silent: false }) {
      const keySeparator =
        options.keySeparator !== undefined ? options.keySeparator : this.options.keySeparator;

      let path = [lng, ns];
      if (key) path = path.concat(keySeparator ? key.split(keySeparator) : key);

      if (lng.includes('.')) {
        path = lng.split('.');
        value = ns;
        ns = path[1];
      }

      this.addNamespaces(ns);

      setPath(this.data, path, value);

      if (!options.silent) this.emit('added', lng, ns, key, value);
    }

    addResources(lng, ns, resources, options = { silent: false }) {
      for (const m in resources) {
        if (isString(resources[m]) || Array.isArray(resources[m]))
          this.addResource(lng, ns, m, resources[m], { silent: true });
      }
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
      let path = [lng, ns];
      if (lng.includes('.')) {
        path = lng.split('.');
        deep = resources;
        resources = ns;
        ns = path[1];
      }

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
      return !!n.find((v) => data[v] && Object.keys(data[v]).length > 0);
    }

    toJSON() {
      return this.data;
    }
  }

  const postProcessor = {
    processors: {},

    addPostProcessor(module) {
      this.processors[module.name] = module;
    },

    handle(processors, value, key, options, translator) {
      processors.forEach((processor) => {
        value = this.processors[processor]?.process(value, key, options, translator) ?? value;
      });

      return value;
    },
  };

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

    const keySeparator = opts?.keySeparator ?? '.';
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
        ],
        services,
        this,
      );

      this.options = options;
      if (this.options.keySeparator === undefined) {
        this.options.keySeparator = '.';
      }

      this.logger = baseLogger.create('translator');

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
        key = parts.join(keySeparator);
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
      const needsZeroSuffixLookup = needsPluralHandling && !opt.ordinal && opt.count === 0;
      const defaultValue =
        (needsZeroSuffixLookup && opt[`defaultValue${this.options.pluralSeparator}zero`]) ||
        opt[`defaultValue${defaultValueSuffix}`] ||
        opt[`defaultValue${defaultValueSuffixOrdinalFallback}`] ||
        opt.defaultValue;

      let resForObjHndl = res;
      if (handleAsObjectInI18nFormat && !res && hasDefaultValue) {
        resForObjHndl = defaultValue;
      }

      const handleAsObject = shouldHandleAsObject(resForObjHndl);
      const resType = Object.prototype.toString.apply(resForObjHndl);

      if (
        handleAsObjectInI18nFormat &&
        resForObjHndl &&
        handleAsObject &&
        !noObject.includes(resType) &&
        !(isString(joinArrays) && Array.isArray(resForObjHndl))
      ) {
        if (!opt.returnObjects && !this.options.returnObjects) {
          if (!this.options.returnedObjectHandler) {
            this.logger.warn('accessing an object - but returnObjects options is not enabled!');
          }
          const r = this.options.returnedObjectHandler
            ? this.options.returnedObjectHandler(resUsedKey, resForObjHndl, {
                ...opt,
                ns: namespaces,
              })
            : `key '${key} (${this.language})' returned an object instead of string.`;
          if (returnDetails) {
            resolved.res = r;
            resolved.usedParams = this.getUsedParamsDetails(opt);
            return resolved;
          }
          return r;
        }

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
        if (res) res = this.extendTranslation(res, keys, opt, lastKey);
      } else {
        // string, empty or null
        let usedDefault = false;
        let usedKey = false;

        // fallback value
        if (!this.isValidLookup(res) && hasDefaultValue) {
          usedDefault = true;
          res = defaultValue;
        }
        if (!this.isValidLookup(res)) {
          usedKey = true;
          res = key;
        }

        const missingKeyNoValueFallbackToKey =
          opt.missingKeyNoValueFallbackToKey || this.options.missingKeyNoValueFallbackToKey;
        const resForMissing = missingKeyNoValueFallbackToKey && usedKey ? undefined : res;

        // save missing
        const updateMissing = hasDefaultValue && defaultValue !== res && this.options.updateMissing;
        if (usedKey || usedDefault || updateMissing) {
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
              );
            }
            this.emit('missingKey', l, namespace, k, res);
          };

          if (this.options.saveMissing) {
            if (this.options.saveMissingPlurals && needsPluralHandling) {
              lngs.forEach((language) => {
                const suffixes = this.pluralResolver.getSuffixes(language, opt);
                if (
                  needsZeroSuffixLookup &&
                  opt[`defaultValue${this.options.pluralSeparator}zero`] &&
                  !suffixes.includes(`${this.options.pluralSeparator}zero`)
                ) {
                  suffixes.push(`${this.options.pluralSeparator}zero`);
                }
                suffixes.forEach((suffix) => {
                  send([language], key + suffix, opt[`defaultValue${suffix}`] || defaultValue);
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
          const nb = res.match(this.interpolator.nestingRegexp);
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
          const na = res.match(this.interpolator.nestingRegexp);
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
        res = postProcessor.handle(
          postProcessorNames,
          res,
          key,
          this.options && this.options.postProcessPassResolved
            ? {
                i18nResolved: { ...resolved, usedParams: this.getUsedParamsDetails(opt) },
                ...opt,
              }
            : opt,
          this,
        );
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
        const needsZeroSuffixLookup = needsPluralHandling && !opt.ordinal && opt.count === 0;
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
        data.count = options.count;
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
    constructor(options) {
      this.options = options;

      this.supportedLngs = this.options.supportedLngs || false;
      this.logger = baseLogger.create('languageUtils');
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
      if (!code || !code.includes('-')) return code;

      const p = code.split('-');
      return this.formatLanguageCode(p[0]);
    }

    formatLanguageCode(code) {
      // http://www.iana.org/assignments/language-tags/language-tags.xhtml
      if (isString(code) && code.includes('-')) {
        let formattedCode;
        try {
          formattedCode = Intl.getCanonicalLocales(code)[0];
        } catch (e) {
          /* fall through */
        }
        if (formattedCode && this.options.lowerCaseLng) {
          formattedCode = formattedCode.toLowerCase();
        }
        if (formattedCode) return formattedCode;

        if (this.options.lowerCaseLng) {
          return code.toLowerCase();
        }

        return code;
      }

      return this.options.cleanCode || this.options.lowerCaseLng ? code.toLowerCase() : code;
    }

    isSupportedCode(code) {
      if (this.options.load === 'languageOnly' || this.options.nonExplicitSupportedLngs) {
        code = this.getLanguagePartFromCode(code);
      }
      return !this.supportedLngs || !this.supportedLngs.length || this.supportedLngs.includes(code);
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

          found = this.options.supportedLngs.find((supportedLng) => {
            if (supportedLng === lngOnly) return true;
            if (!supportedLng.includes('-') && !lngOnly.includes('-')) return false;
            if (
              supportedLng.includes('-') &&
              !lngOnly.includes('-') &&
              supportedLng.slice(0, supportedLng.indexOf('-')) === lngOnly
            )
              return true;
            if (supportedLng.startsWith(lngOnly) && lngOnly.length > 1) return true;
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

      if (!code) return fallbacks.default || [];

      // assume we have an object defining fallbacks
      let found = fallbacks[code];
      if (!found) found = fallbacks[this.getScriptPartFromCode(code)];
      if (!found) found = fallbacks[this.formatLanguageCode(code)];
      if (!found) found = fallbacks[this.getLanguagePartFromCode(code)];
      if (!found) found = fallbacks.default;

      return found || [];
    }

    toResolveHierarchy(code, fallbackCode) {
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
        if (!codes.includes(fc)) addCode(this.formatLanguageCode(fc));
      });

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
    constructor(languageUtils, options = {}) {
      this.languageUtils = languageUtils;
      this.options = options;

      this.logger = baseLogger.create('pluralResolver');

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
        return `${this.options.prepend}${options.ordinal ? `ordinal${this.options.prepend}` : ''}${rule.select(count)}`;
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
    if (!path && ignoreJSONStructure && isString(key)) {
      path = deepFind(data, key, keySeparator);
      if (path === undefined) path = deepFind(defaultData, key, keySeparator);
    }
    return path;
  };

  const regexSafe = (val) => val.replace(/\$/g, '$$$$');

  class Interpolator {
    constructor(options = {}) {
      this.logger = baseLogger.create('interpolator');

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
        prefixEscaped,
        suffix,
        suffixEscaped,
        formatSeparator,
        unescapeSuffix,
        unescapePrefix,
        nestingPrefix,
        nestingPrefixEscaped,
        nestingSuffix,
        nestingSuffixEscaped,
        nestingOptionsSeparator,
        maxReplaces,
        alwaysFormat,
      } = options.interpolation;

      this.escape = escape$1 !== undefined ? escape$1 : escape;
      this.escapeValue = escapeValue !== undefined ? escapeValue : true;
      this.useRawValueToEscape = useRawValueToEscape !== undefined ? useRawValueToEscape : false;

      this.prefix = prefix ? regexEscape(prefix) : prefixEscaped || '{{';
      this.suffix = suffix ? regexEscape(suffix) : suffixEscaped || '}}';

      this.formatSeparator = formatSeparator || ',';

      this.unescapePrefix = unescapeSuffix ? '' : unescapePrefix ? regexEscape(unescapePrefix) : '-';
      this.unescapeSuffix = this.unescapePrefix
        ? ''
        : unescapeSuffix
          ? regexEscape(unescapeSuffix)
          : '';

      this.nestingPrefix = nestingPrefix
        ? regexEscape(nestingPrefix)
        : nestingPrefixEscaped || regexEscape('$t(');
      this.nestingSuffix = nestingSuffix
        ? regexEscape(nestingSuffix)
        : nestingSuffixEscaped || regexEscape(')');

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
      this.nestingRegexp = getOrResetRegExp(
        this.nestingRegexp,
        `${this.nestingPrefix}((?:[^()"']+|"[^"]*"|'[^']*'|\\((?:[^()]|"[^"]*"|'[^']*')*\\))*?)${this.nestingSuffix}`,
      );
    }

    interpolate(str, data, lng, options) {
      let match;
      let value;
      let replaces;

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

      // Security warning: when escapeValue is false AND the translation embeds
      // interpolation placeholders inside a $t() nesting options block (i.e.
      // $t(key, { ... "{{var}}" ... })), attacker-controlled string values that
      // contain `"` can break out of the JSON string literal and inject extra
      // nesting options (e.g. redirect lng/ns). This is safe under the default
      // escapeValue: true, where HTML-escaping neutralises the quote before
      // JSON.parse. See CHANGELOG entry for 26.0.6 and the security docs.
      if (!this.escapeValue && typeof str === 'string' && /\$t\([^)]*\{[^}]*\{\{/.test(str)) {
        this.logger.warn(
          'nesting options string contains interpolated variables with escapeValue: false — ' +
            'if any of those values are attacker-controlled they can inject additional ' +
            'nesting options (e.g. redirect lng/ns). Sanitise untrusted input before passing ' +
            'it to t(), or keep escapeValue: true.',
        );
      }

      const missingInterpolationHandler =
        options?.missingInterpolationHandler || this.options.missingInterpolationHandler;

      const skipOnVariables =
        options?.interpolation?.skipOnVariables !== undefined
          ? options.interpolation.skipOnVariables
          : this.options.interpolation.skipOnVariables;

      const todos = [
        {
          // unescape if has unescapePrefix/Suffix
          regex: this.regexpUnescape,
          safeValue: (val) => regexSafe(val),
        },
        {
          // regular escape on demand
          regex: this.regexp,
          safeValue: (val) => (this.escapeValue ? regexSafe(this.escape(val)) : regexSafe(val)),
        },
      ];
      todos.forEach((todo) => {
        replaces = 0;
        while ((match = todo.regex.exec(str))) {
          const matchedVar = match[1].trim();
          value = handleFormat(matchedVar);
          if (value === undefined) {
            if (typeof missingInterpolationHandler === 'function') {
              const temp = missingInterpolationHandler(str, match, options);
              value = isString(temp) ? temp : '';
            } else if (options && Object.prototype.hasOwnProperty.call(options, matchedVar)) {
              value = ''; // undefined becomes empty string
            } else if (skipOnVariables) {
              value = match[0];
              continue; // this makes sure it continues to detect others
            } else {
              this.logger.warn(`missed to pass in variable ${matchedVar} for interpolating ${str}`);
              value = '';
            }
          } else if (!isString(value) && !this.useRawValueToEscape) {
            value = makeString(value);
          }
          const safeValue = todo.safeValue(value);
          str = str.replace(match[0], safeValue);
          if (skipOnVariables) {
            todo.regex.lastIndex += value.length;
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

        let optionsString = `{${c[1]}`;
        key = c[0];
        optionsString = this.interpolate(optionsString, clonedOptions);
        const matchedSingleQuotes = optionsString.match(/'/g);
        const matchedDoubleQuotes = optionsString.match(/"/g);
        if (
          ((matchedSingleQuotes?.length ?? 0) % 2 === 0 && !matchedDoubleQuotes) ||
          (matchedDoubleQuotes?.length ?? 0) % 2 !== 0
        ) {
          optionsString = optionsString.replace(/'/g, '"');
        }

        try {
          clonedOptions = JSON.parse(optionsString);

          if (inheritedOptions) clonedOptions = { ...inheritedOptions, ...clonedOptions };
        } catch (e) {
          this.logger.warn(`failed parsing options string in nesting for key ${key}`, e);
          return `${key}${sep}${optionsString}`;
        }

        // assert we do not get a endless loop on interpolating defaultValue again and again
        if (clonedOptions.defaultValue && clonedOptions.defaultValue.includes(this.prefix))
          delete clonedOptions.defaultValue;
        return key;
      };

      // regular escape on demand
      while ((match = this.nestingRegexp.exec(str))) {
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
        const keyEndIndex = /{.*}/.test(match[1])
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
        // value = this.escapeValue ? regexSafe(utils.escape(value)) : regexSafe(value);
        str = str.replace(match[0], value);
        this.regexp.lastIndex = 0;
      }
      return str;
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

  const createCachedFormatter = (fn) => {
    const cache = {};
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
      const key = l + JSON.stringify(optForCache);
      let frm = cache[key];
      if (!frm) {
        frm = fn(getCleanedCode(l), o);
        cache[key] = frm;
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
      const formats = format.split(this.formatSeparator);
      if (
        formats.length > 1 &&
        formats[0].indexOf('(') > 1 &&
        !formats[0].includes(')') &&
        formats.find((f) => f.includes(')'))
      ) {
        const lastIndex = formats.findIndex((f) => f.includes(')'));
        formats[0] = [formats[0], ...formats.splice(1, lastIndex)].join(this.formatSeparator);
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
      this.logger = baseLogger.create('backendConnector');

      this.waitingReads = [];
      this.maxParallelReads = options.maxParallelReads || 10;
      this.readingCalls = 0;

      this.maxRetries = options.maxRetries >= 0 ? options.maxRetries : 5;
      this.retryTimeout = options.retryTimeout >= 1 ? options.retryTimeout : 350;

      this.state = {};
      this.queue = [];

      this.backend?.init?.(services, options.backend, options);
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
          } else if (this.state[name] < 0) ; else if (this.state[name] === 1) {
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

      // consolidated loading done in this run - only emit once for a loaded namespace
      const loaded = {};

      // callback if ready
      this.queue.forEach((q) => {
        pushPath(q.loaded, [lng], ns);
        removePending(q, name);

        if (err) q.errors.push(err);

        if (q.pendingCount === 0 && !q.done) {
          // only do once per loaded -> this.emit('loaded', q.loaded);
          Object.keys(q.loaded).forEach((l) => {
            if (!loaded[l]) loaded[l] = {};
            const loadedKeys = q.loaded[l];
            if (loadedKeys.length) {
              loadedKeys.forEach((n) => {
                if (loaded[l][n] === undefined) loaded[l][n] = true;
              });
            }
          });

          q.done = true;
          if (q.errors.length) {
            q.callback(q.errors);
          } else {
            q.callback();
          }
        }
      });

      // emit consolidated loaded event
      this.emit('loaded', loaded);

      // remove done load requests
      this.queue = this.queue.filter((q) => !q.done);
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
      if (fc.length === 2) {
        // no callback
        try {
          const r = fc(lng, ns);
          if (r && typeof r.then === 'function') {
            // promise
            r.then((data) => resolver(null, data)).catch(resolver);
          } else {
            // sync
            resolver(null, r);
          }
        } catch (err) {
          resolver(err);
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

    saveMissing(languages, namespace, key, fallbackValue, isUpdate, options = {}, clb = () => {}) {
      if (
        this.services?.utils?.hasLoadedNamespace &&
        !this.services?.utils?.hasLoadedNamespace(namespace)
      ) {
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
        if (fc.length < 6) {
          // no callback
          try {
            let r;
            if (fc.length === 5) {
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
    fallbackLng: ['dev'],
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
    returnEmptyString: true, // allows empty string value as valid translation
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
      // prefixEscaped: '{{',
      // suffixEscaped: '}}',
      // unescapeSuffix: '',
      unescapePrefix: '-',

      nestingPrefix: '$t(',
      nestingSuffix: ')',
      nestingOptionsSeparator: ',',
      // nestingPrefixEscaped: '$t(',
      // nestingSuffixEscaped: ')',
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

      this.options = transformOptions(options);
      this.services = {};
      this.logger = baseLogger;
      this.modules = { external: [] };

      bindMemberFunctions(this);

      if (callback && !this.isInitialized && !options.isClone) {
        // https://github.com/i18next/i18next/issues/879
        if (!this.options.initAsync) {
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

      const defOpts = get();
      this.options = { ...defOpts, ...this.options, ...transformOptions(options) };
      this.options.interpolation = { ...defOpts.interpolation, ...this.options.interpolation }; // do not use reference
      if (options.keySeparator !== undefined) {
        this.options.userDefinedKeySeparator = options.keySeparator;
      }
      if (options.nsSeparator !== undefined) {
        this.options.userDefinedNsSeparator = options.nsSeparator;
      }

      if (typeof this.options.overloadTranslationOptionHandler !== 'function') {
        this.options.overloadTranslationOptionHandler = defOpts.overloadTranslationOptionHandler;
      }

      const createClassOnDemand = (ClassOrObject) => {
        if (!ClassOrObject) return null;
        if (typeof ClassOrObject === 'function') return new ClassOrObject();
        return ClassOrObject;
      };

      // init services
      if (!this.options.isClone) {
        if (this.modules.logger) {
          baseLogger.init(createClassOnDemand(this.modules.logger), this.options);
        } else {
          baseLogger.init(null, this.options);
        }

        let formatter;
        if (this.modules.formatter) {
          formatter = this.modules.formatter;
        } else {
          formatter = Formatter;
        }

        const lu = new LanguageUtil(this.options);

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

        this.store = new ResourceStore(this.options.resources, this.options);

        const s = this.services;
        s.logger = baseLogger;
        s.resourceStore = this.store;
        s.languageUtils = lu;
        s.pluralResolver = new PluralResolver(lu, {
          prepend: this.options.pluralSeparator,
        });

        if (formatter) {
          s.formatter = createClassOnDemand(formatter);
          if (s.formatter.init) s.formatter.init(s, this.options);
          this.options.interpolation.format = s.formatter.format.bind(s.formatter);
        }

        s.interpolator = new Interpolator(this.options);
        s.utils = {
          hasLoadedNamespace: this.hasLoadedNamespace.bind(this)
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
      if (!lngs) lngs = this.languages;
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

      if (module.type === 'backend') {
        this.modules.backend = module;
      }

      if (module.type === 'logger' || (module.log && module.warn && module.error)) {
        this.modules.logger = module;
      }

      if (module.type === 'languageDetector') {
        this.modules.languageDetector = module;
      }

      if (module.type === 'i18nFormat') {
        this.modules.i18nFormat = module;
      }

      if (module.type === 'postProcessor') {
        postProcessor.addPostProcessor(module);
      }

      if (module.type === 'formatter') {
        this.modules.formatter = module;
      }

      if (module.type === '3rdParty') {
        this.modules.external.push(module);
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
        // depending on API in detector lng can be a string (old) or an array of languages ordered in priority
        const fl = isString(lngs) ? lngs : lngs && lngs[0];
        const l = this.store.hasLanguageSomeTranslations(fl) ? fl : this.services.languageUtils.getBestMatchFromCodes(isString(lngs) ? [lngs] : lngs);

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
        if (this.services.languageDetector.detect.length === 0) {
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
      return this.translator?.translate(...args);
    }

    exists(...args) {
      return this.translator?.exists(...args);
    }

    setDefaultNamespace(ns) {
      this.options.defaultNS = ns;
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

      // failed loading ns - but at least fallback is not pending -> SEMI SUCCESS
      if (loadNotPending(lng, ns) && (!fallbackLng || loadNotPending(lastLng, ns))) return true;

      return false;
    }

    loadNamespaces(ns, callback) {
      const deferred = defer();

      if (!this.options.ns) {
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

      const newLngs = lngs.filter(lng => !preloaded.includes(lng) && this.services.languageUtils.isSupportedCode(lng));
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
      if (!lng) return 'rtl';

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

      return rtlLngs.includes(languageUtils.getLanguagePartFromCode(lng)) || lng.toLowerCase().indexOf('-arab') > 1
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
      if (forkResourceStore) delete options.forkResourceStore;
      const mergedOptions = { ...this.options, ...options, ...{ isClone: true } };
      const clone = new I18n(mergedOptions);
      if ((options.debug !== undefined || options.prefix !== undefined)) {
        clone.logger = clone.logger.clone(options);
      }
      const membersToCopy = ['store', 'services', 'language'];
      membersToCopy.forEach(m => {
        clone[m] = this[m];
      });
      clone.services = { ...this.services };
      clone.services.utils = {
        hasLoadedNamespace: clone.hasLoadedNamespace.bind(clone)
      };
      if (forkResourceStore) {
        // faster than const clonedData = JSON.parse(JSON.stringify(this.store.data))
        const clonedData = Object.keys(this.store.data).reduce((prev, l) => {
          prev[l] = { ...this.store.data[l] };
          prev[l] = Object.keys(prev[l]).reduce((acc, n) => {
            acc[n] = { ...prev[l][n] };
            return acc;
          }, prev[l]);
          return prev;
        }, {});
        clone.store = new ResourceStore(clonedData, mergedOptions);
        clone.services.resourceStore = clone.store;
      }
      // Ensure interpolation options are always merged with defaults when cloning
      if (options.interpolation) {
        const defOpts = get();
        const mergedInterpolation = { ...defOpts.interpolation, ...this.options.interpolation, ...options.interpolation };
        const mergedForInterpolator = { ...mergedOptions, interpolation: mergedInterpolation };
        clone.services.interpolator = new Interpolator(mergedForInterpolator);
      }
      clone.translator = new Translator(clone.services, mergedOptions);
      clone.translator.on('*', (event, ...args) => {
        clone.emit(event, ...args);
      });
      clone.init(mergedOptions, callback);
      clone.translator.options = mergedOptions; // sync options
      clone.translator.backendConnector.services.utils = {
        hasLoadedNamespace: clone.hasLoadedNamespace.bind(clone)
      };

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uLWkxOG4uanMiLCJzb3VyY2VzIjpbImkxOG5leHQvc3JjL3V0aWxzLmpzIiwiaTE4bmV4dC9zcmMvbG9nZ2VyLmpzIiwiaTE4bmV4dC9zcmMvRXZlbnRFbWl0dGVyLmpzIiwiaTE4bmV4dC9zcmMvUmVzb3VyY2VTdG9yZS5qcyIsImkxOG5leHQvc3JjL3Bvc3RQcm9jZXNzb3IuanMiLCJpMThuZXh0L3NyYy9zZWxlY3Rvci5qcyIsImkxOG5leHQvc3JjL1RyYW5zbGF0b3IuanMiLCJpMThuZXh0L3NyYy9MYW5ndWFnZVV0aWxzLmpzIiwiaTE4bmV4dC9zcmMvUGx1cmFsUmVzb2x2ZXIuanMiLCJpMThuZXh0L3NyYy9JbnRlcnBvbGF0b3IuanMiLCJpMThuZXh0L3NyYy9Gb3JtYXR0ZXIuanMiLCJpMThuZXh0L3NyYy9CYWNrZW5kQ29ubmVjdG9yLmpzIiwiaTE4bmV4dC9zcmMvZGVmYXVsdHMuanMiLCJpMThuZXh0L3NyYy9pMThuZXh0LmpzIiwiaTE4bmV4dC9zcmMvaW5kZXguanMiLCJpbmRleC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgY29uc3QgaXNTdHJpbmcgPSAob2JqKSA9PiB0eXBlb2Ygb2JqID09PSAnc3RyaW5nJztcblxuLy8gaHR0cDovL2xlYS52ZXJvdS5tZS8yMDE2LzEyL3Jlc29sdmUtcHJvbWlzZXMtZXh0ZXJuYWxseS13aXRoLXRoaXMtb25lLXdlaXJkLXRyaWNrL1xuZXhwb3J0IGNvbnN0IGRlZmVyID0gKCkgPT4ge1xuICBsZXQgcmVzO1xuICBsZXQgcmVqO1xuXG4gIGNvbnN0IHByb21pc2UgPSBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgcmVzID0gcmVzb2x2ZTtcbiAgICByZWogPSByZWplY3Q7XG4gIH0pO1xuXG4gIHByb21pc2UucmVzb2x2ZSA9IHJlcztcbiAgcHJvbWlzZS5yZWplY3QgPSByZWo7XG5cbiAgcmV0dXJuIHByb21pc2U7XG59O1xuXG5leHBvcnQgY29uc3QgbWFrZVN0cmluZyA9IChvYmplY3QpID0+IHtcbiAgaWYgKG9iamVjdCA9PSBudWxsKSByZXR1cm4gJyc7XG4gIHJldHVybiBTdHJpbmcob2JqZWN0KTtcbn07XG5cbmV4cG9ydCBjb25zdCBjb3B5ID0gKGEsIHMsIHQpID0+IHtcbiAgYS5mb3JFYWNoKChtKSA9PiB7XG4gICAgaWYgKHNbbV0pIHRbbV0gPSBzW21dO1xuICB9KTtcbn07XG5cbi8vIFdlIGV4dHJhY3Qgb3V0IHRoZSBSZWdFeHAgZGVmaW5pdGlvbiB0byBpbXByb3ZlIHBlcmZvcm1hbmNlIHdpdGggUmVhY3QgTmF0aXZlIEFuZHJvaWQsIHdoaWNoIGhhcyBwb29yIFJlZ0V4cFxuLy8gaW5pdGlhbGl6YXRpb24gcGVyZm9ybWFuY2VcbmNvbnN0IGxhc3RPZlBhdGhTZXBhcmF0b3JSZWdFeHAgPSAvIyMjL2c7XG5cbmNvbnN0IGNsZWFuS2V5ID0gKGtleSkgPT5cbiAga2V5ICYmIGtleS5pbmNsdWRlcygnIyMjJykgPyBrZXkucmVwbGFjZShsYXN0T2ZQYXRoU2VwYXJhdG9yUmVnRXhwLCAnLicpIDoga2V5O1xuXG5jb25zdCBjYW5Ob3RUcmF2ZXJzZURlZXBlciA9IChvYmplY3QpID0+ICFvYmplY3QgfHwgaXNTdHJpbmcob2JqZWN0KTtcblxuY29uc3QgZ2V0TGFzdE9mUGF0aCA9IChvYmplY3QsIHBhdGgsIEVtcHR5KSA9PiB7XG4gIGNvbnN0IHN0YWNrID0gIWlzU3RyaW5nKHBhdGgpID8gcGF0aCA6IHBhdGguc3BsaXQoJy4nKTtcbiAgbGV0IHN0YWNrSW5kZXggPSAwO1xuICAvLyBpdGVyYXRlIHRocm91Z2ggdGhlIHN0YWNrLCBidXQgbGVhdmUgdGhlIGxhc3QgaXRlbVxuICB3aGlsZSAoc3RhY2tJbmRleCA8IHN0YWNrLmxlbmd0aCAtIDEpIHtcbiAgICBpZiAoY2FuTm90VHJhdmVyc2VEZWVwZXIob2JqZWN0KSkgcmV0dXJuIHt9O1xuXG4gICAgY29uc3Qga2V5ID0gY2xlYW5LZXkoc3RhY2tbc3RhY2tJbmRleF0pO1xuICAgIGlmICghb2JqZWN0W2tleV0gJiYgRW1wdHkpIG9iamVjdFtrZXldID0gbmV3IEVtcHR5KCk7XG4gICAgLy8gcHJldmVudCBwcm90b3R5cGUgcG9sbHV0aW9uXG4gICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmplY3QsIGtleSkpIHtcbiAgICAgIG9iamVjdCA9IG9iamVjdFtrZXldO1xuICAgIH0gZWxzZSB7XG4gICAgICBvYmplY3QgPSB7fTtcbiAgICB9XG4gICAgKytzdGFja0luZGV4O1xuICB9XG5cbiAgaWYgKGNhbk5vdFRyYXZlcnNlRGVlcGVyKG9iamVjdCkpIHJldHVybiB7fTtcbiAgcmV0dXJuIHtcbiAgICBvYmo6IG9iamVjdCxcbiAgICBrOiBjbGVhbktleShzdGFja1tzdGFja0luZGV4XSksXG4gIH07XG59O1xuXG5leHBvcnQgY29uc3Qgc2V0UGF0aCA9IChvYmplY3QsIHBhdGgsIG5ld1ZhbHVlKSA9PiB7XG4gIGNvbnN0IHsgb2JqLCBrIH0gPSBnZXRMYXN0T2ZQYXRoKG9iamVjdCwgcGF0aCwgT2JqZWN0KTtcbiAgaWYgKG9iaiAhPT0gdW5kZWZpbmVkIHx8IHBhdGgubGVuZ3RoID09PSAxKSB7XG4gICAgb2JqW2tdID0gbmV3VmFsdWU7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgbGV0IGUgPSBwYXRoW3BhdGgubGVuZ3RoIC0gMV07XG4gIGxldCBwID0gcGF0aC5zbGljZSgwLCBwYXRoLmxlbmd0aCAtIDEpO1xuICBsZXQgbGFzdCA9IGdldExhc3RPZlBhdGgob2JqZWN0LCBwLCBPYmplY3QpO1xuICB3aGlsZSAobGFzdC5vYmogPT09IHVuZGVmaW5lZCAmJiBwLmxlbmd0aCkge1xuICAgIGUgPSBgJHtwW3AubGVuZ3RoIC0gMV19LiR7ZX1gO1xuICAgIHAgPSBwLnNsaWNlKDAsIHAubGVuZ3RoIC0gMSk7XG4gICAgbGFzdCA9IGdldExhc3RPZlBhdGgob2JqZWN0LCBwLCBPYmplY3QpO1xuICAgIGlmIChsYXN0Py5vYmogJiYgdHlwZW9mIGxhc3Qub2JqW2Ake2xhc3Qua30uJHtlfWBdICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgbGFzdC5vYmogPSB1bmRlZmluZWQ7XG4gICAgfVxuICB9XG4gIGxhc3Qub2JqW2Ake2xhc3Qua30uJHtlfWBdID0gbmV3VmFsdWU7XG59O1xuXG5leHBvcnQgY29uc3QgcHVzaFBhdGggPSAob2JqZWN0LCBwYXRoLCBuZXdWYWx1ZSwgY29uY2F0KSA9PiB7XG4gIGNvbnN0IHsgb2JqLCBrIH0gPSBnZXRMYXN0T2ZQYXRoKG9iamVjdCwgcGF0aCwgT2JqZWN0KTtcblxuICBvYmpba10gPSBvYmpba10gfHwgW107XG4gIGlmIChjb25jYXQpIG9ialtrXSA9IG9ialtrXS5jb25jYXQobmV3VmFsdWUpO1xuICBpZiAoIWNvbmNhdCkgb2JqW2tdLnB1c2gobmV3VmFsdWUpO1xufTtcblxuZXhwb3J0IGNvbnN0IGdldFBhdGggPSAob2JqZWN0LCBwYXRoKSA9PiB7XG4gIGNvbnN0IHsgb2JqLCBrIH0gPSBnZXRMYXN0T2ZQYXRoKG9iamVjdCwgcGF0aCk7XG5cbiAgaWYgKCFvYmopIHJldHVybiB1bmRlZmluZWQ7XG4gIGlmICghT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwgaykpIHJldHVybiB1bmRlZmluZWQ7XG4gIHJldHVybiBvYmpba107XG59O1xuXG5leHBvcnQgY29uc3QgZ2V0UGF0aFdpdGhEZWZhdWx0cyA9IChkYXRhLCBkZWZhdWx0RGF0YSwga2V5KSA9PiB7XG4gIGNvbnN0IHZhbHVlID0gZ2V0UGF0aChkYXRhLCBrZXkpO1xuICBpZiAodmFsdWUgIT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiB2YWx1ZTtcbiAgfVxuICAvLyBGYWxsYmFjayB0byBkZWZhdWx0IHZhbHVlc1xuICByZXR1cm4gZ2V0UGF0aChkZWZhdWx0RGF0YSwga2V5KTtcbn07XG5cbmV4cG9ydCBjb25zdCBkZWVwRXh0ZW5kID0gKHRhcmdldCwgc291cmNlLCBvdmVyd3JpdGUpID0+IHtcbiAgZm9yIChjb25zdCBwcm9wIGluIHNvdXJjZSkge1xuICAgIGlmIChwcm9wICE9PSAnX19wcm90b19fJyAmJiBwcm9wICE9PSAnY29uc3RydWN0b3InKSB7XG4gICAgICBpZiAocHJvcCBpbiB0YXJnZXQpIHtcbiAgICAgICAgLy8gSWYgd2UgcmVhY2hlZCBhIGxlYWYgc3RyaW5nIGluIHRhcmdldCBvciBzb3VyY2UgdGhlbiByZXBsYWNlIHdpdGggc291cmNlIG9yIHNraXAgZGVwZW5kaW5nIG9uIHRoZSAnb3ZlcndyaXRlJyBzd2l0Y2hcbiAgICAgICAgaWYgKFxuICAgICAgICAgIGlzU3RyaW5nKHRhcmdldFtwcm9wXSkgfHxcbiAgICAgICAgICB0YXJnZXRbcHJvcF0gaW5zdGFuY2VvZiBTdHJpbmcgfHxcbiAgICAgICAgICBpc1N0cmluZyhzb3VyY2VbcHJvcF0pIHx8XG4gICAgICAgICAgc291cmNlW3Byb3BdIGluc3RhbmNlb2YgU3RyaW5nXG4gICAgICAgICkge1xuICAgICAgICAgIGlmIChvdmVyd3JpdGUpIHRhcmdldFtwcm9wXSA9IHNvdXJjZVtwcm9wXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBkZWVwRXh0ZW5kKHRhcmdldFtwcm9wXSwgc291cmNlW3Byb3BdLCBvdmVyd3JpdGUpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0YXJnZXRbcHJvcF0gPSBzb3VyY2VbcHJvcF07XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiB0YXJnZXQ7XG59O1xuXG5leHBvcnQgY29uc3QgcmVnZXhFc2NhcGUgPSAoc3RyKSA9PlxuICAvKiBlc2xpbnQgbm8tdXNlbGVzcy1lc2NhcGU6IDAgKi9cbiAgc3RyLnJlcGxhY2UoL1tcXC1cXFtcXF1cXC9cXHtcXH1cXChcXClcXCpcXCtcXD9cXC5cXFxcXFxeXFwkXFx8XS9nLCAnXFxcXCQmJyk7XG5cbmNvbnN0IF9lbnRpdHlNYXAgPSB7XG4gICcmJzogJyZhbXA7JyxcbiAgJzwnOiAnJmx0OycsXG4gICc+JzogJyZndDsnLFxuICAnXCInOiAnJnF1b3Q7JyxcbiAgXCInXCI6ICcmIzM5OycsXG4gICcvJzogJyYjeDJGOycsXG59O1xuXG5leHBvcnQgY29uc3QgZXNjYXBlID0gKGRhdGEpID0+IHtcbiAgaWYgKGlzU3RyaW5nKGRhdGEpKSB7XG4gICAgcmV0dXJuIGRhdGEucmVwbGFjZSgvWyY8PlwiJ1xcL10vZywgKHMpID0+IF9lbnRpdHlNYXBbc10pO1xuICB9XG5cbiAgcmV0dXJuIGRhdGE7XG59O1xuXG4vKipcbiAqIFRoaXMgaXMgYSByZXVzYWJsZSByZWd1bGFyIGV4cHJlc3Npb24gY2FjaGUgY2xhc3MuIEdpdmVuIGEgY2VydGFpbiBtYXhpbXVtIG51bWJlciBvZiByZWd1bGFyIGV4cHJlc3Npb25zIHdlJ3JlXG4gKiBhbGxvd2VkIHRvIHN0b3JlIGluIHRoZSBjYWNoZSwgaXQgcHJvdmlkZXMgYSB3YXkgdG8gYXZvaWQgcmVjcmVhdGluZyByZWd1bGFyIGV4cHJlc3Npb24gb2JqZWN0cyBvdmVyIGFuZCBvdmVyLlxuICogV2hlbiBpdCBuZWVkcyB0byBldmljdCBzb21ldGhpbmcsIGl0IGV2aWN0cyB0aGUgb2xkZXN0IG9uZS5cbiAqL1xuY2xhc3MgUmVnRXhwQ2FjaGUge1xuICBjb25zdHJ1Y3RvcihjYXBhY2l0eSkge1xuICAgIHRoaXMuY2FwYWNpdHkgPSBjYXBhY2l0eTtcbiAgICB0aGlzLnJlZ0V4cE1hcCA9IG5ldyBNYXAoKTtcbiAgICAvLyBTaW5jZSBvdXIgY2FwYWNpdHkgdGVuZHMgdG8gYmUgZmFpcmx5IHNtYWxsLCBgLnNoaWZ0KClgIHdpbGwgYmUgZmFpcmx5IHF1aWNrIGRlc3BpdGUgYmVpbmcgTyhuKS4gV2UganVzdCB1c2UgYVxuICAgIC8vIG5vcm1hbCBhcnJheSB0byBrZWVwIGl0IHNpbXBsZS5cbiAgICB0aGlzLnJlZ0V4cFF1ZXVlID0gW107XG4gIH1cblxuICBnZXRSZWdFeHAocGF0dGVybikge1xuICAgIGNvbnN0IHJlZ0V4cEZyb21DYWNoZSA9IHRoaXMucmVnRXhwTWFwLmdldChwYXR0ZXJuKTtcbiAgICBpZiAocmVnRXhwRnJvbUNhY2hlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiByZWdFeHBGcm9tQ2FjaGU7XG4gICAgfVxuICAgIGNvbnN0IHJlZ0V4cE5ldyA9IG5ldyBSZWdFeHAocGF0dGVybik7XG4gICAgaWYgKHRoaXMucmVnRXhwUXVldWUubGVuZ3RoID09PSB0aGlzLmNhcGFjaXR5KSB7XG4gICAgICB0aGlzLnJlZ0V4cE1hcC5kZWxldGUodGhpcy5yZWdFeHBRdWV1ZS5zaGlmdCgpKTtcbiAgICB9XG4gICAgdGhpcy5yZWdFeHBNYXAuc2V0KHBhdHRlcm4sIHJlZ0V4cE5ldyk7XG4gICAgdGhpcy5yZWdFeHBRdWV1ZS5wdXNoKHBhdHRlcm4pO1xuICAgIHJldHVybiByZWdFeHBOZXc7XG4gIH1cbn1cblxuY29uc3QgY2hhcnMgPSBbJyAnLCAnLCcsICc/JywgJyEnLCAnOyddO1xuLy8gV2UgY2FjaGUgUmVnRXhwcyB0byBpbXByb3ZlIHBlcmZvcm1hbmNlIHdpdGggUmVhY3QgTmF0aXZlIEFuZHJvaWQsIHdoaWNoIGhhcyBwb29yIFJlZ0V4cCBpbml0aWFsaXphdGlvbiBwZXJmb3JtYW5jZS5cbi8vIENhcGFjaXR5IG9mIDIwIHNob3VsZCBiZSBwbGVudHksIGFzIG5zU2VwYXJhdG9yL2tleVNlcGFyYXRvciBkb24ndCB0ZW5kIHRvIHZhcnkgbXVjaCBhY3Jvc3MgY2FsbHMuXG5jb25zdCBsb29rc0xpa2VPYmplY3RQYXRoUmVnRXhwQ2FjaGUgPSBuZXcgUmVnRXhwQ2FjaGUoMjApO1xuXG5leHBvcnQgY29uc3QgbG9va3NMaWtlT2JqZWN0UGF0aCA9IChrZXksIG5zU2VwYXJhdG9yLCBrZXlTZXBhcmF0b3IpID0+IHtcbiAgbnNTZXBhcmF0b3IgPSBuc1NlcGFyYXRvciB8fCAnJztcbiAga2V5U2VwYXJhdG9yID0ga2V5U2VwYXJhdG9yIHx8ICcnO1xuICBjb25zdCBwb3NzaWJsZUNoYXJzID0gY2hhcnMuZmlsdGVyKChjKSA9PiAhbnNTZXBhcmF0b3IuaW5jbHVkZXMoYykgJiYgIWtleVNlcGFyYXRvci5pbmNsdWRlcyhjKSk7XG4gIGlmIChwb3NzaWJsZUNoYXJzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIHRydWU7XG4gIGNvbnN0IHIgPSBsb29rc0xpa2VPYmplY3RQYXRoUmVnRXhwQ2FjaGUuZ2V0UmVnRXhwKFxuICAgIGAoJHtwb3NzaWJsZUNoYXJzLm1hcCgoYykgPT4gKGMgPT09ICc/JyA/ICdcXFxcPycgOiBjKSkuam9pbignfCcpfSlgLFxuICApO1xuICBsZXQgbWF0Y2hlZCA9ICFyLnRlc3Qoa2V5KTtcbiAgaWYgKCFtYXRjaGVkKSB7XG4gICAgY29uc3Qga2kgPSBrZXkuaW5kZXhPZihrZXlTZXBhcmF0b3IpO1xuICAgIGlmIChraSA+IDAgJiYgIXIudGVzdChrZXkuc3Vic3RyaW5nKDAsIGtpKSkpIHtcbiAgICAgIG1hdGNoZWQgPSB0cnVlO1xuICAgIH1cbiAgfVxuICByZXR1cm4gbWF0Y2hlZDtcbn07XG5cbi8qKlxuICogR2l2ZW5cbiAqXG4gKiAxLiBhIHRvcCBsZXZlbCBvYmplY3Qgb2JqLCBhbmRcbiAqIDIuIGEgcGF0aCB0byBhIGRlZXBseSBuZXN0ZWQgc3RyaW5nIG9yIG9iamVjdCB3aXRoaW4gaXRcbiAqXG4gKiBGaW5kIGFuZCByZXR1cm4gdGhhdCBkZWVwbHkgbmVzdGVkIHN0cmluZyBvciBvYmplY3QuIFRoZSBjYXZlYXQgaXMgdGhhdCB0aGUga2V5cyBvZiBvYmplY3RzIHdpdGhpbiB0aGUgbmVzdGluZyBjaGFpblxuICogbWF5IGNvbnRhaW4gcGVyaW9kIGNoYXJhY3RlcnMuIFRoZXJlZm9yZSwgd2UgbmVlZCB0byBERlMgYW5kIGV4cGxvcmUgYWxsIHBvc3NpYmxlIGtleXMgYXQgZWFjaCBzdGVwIHVudGlsIHdlIGZpbmQgdGhlXG4gKiBkZWVwbHkgbmVzdGVkIHN0cmluZyBvciBvYmplY3QuXG4gKi9cbmV4cG9ydCBjb25zdCBkZWVwRmluZCA9IChvYmosIHBhdGgsIGtleVNlcGFyYXRvciA9ICcuJykgPT4ge1xuICBpZiAoIW9iaikgcmV0dXJuIHVuZGVmaW5lZDtcbiAgaWYgKG9ialtwYXRoXSkge1xuICAgIGlmICghT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwgcGF0aCkpIHJldHVybiB1bmRlZmluZWQ7XG4gICAgcmV0dXJuIG9ialtwYXRoXTtcbiAgfVxuICBjb25zdCB0b2tlbnMgPSBwYXRoLnNwbGl0KGtleVNlcGFyYXRvcik7XG4gIGxldCBjdXJyZW50ID0gb2JqO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IHRva2Vucy5sZW5ndGg7ICkge1xuICAgIGlmICghY3VycmVudCB8fCB0eXBlb2YgY3VycmVudCAhPT0gJ29iamVjdCcpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGxldCBuZXh0O1xuICAgIGxldCBuZXh0UGF0aCA9ICcnO1xuICAgIGZvciAobGV0IGogPSBpOyBqIDwgdG9rZW5zLmxlbmd0aDsgKytqKSB7XG4gICAgICBpZiAoaiAhPT0gaSkge1xuICAgICAgICBuZXh0UGF0aCArPSBrZXlTZXBhcmF0b3I7XG4gICAgICB9XG4gICAgICBuZXh0UGF0aCArPSB0b2tlbnNbal07XG4gICAgICBuZXh0ID0gY3VycmVudFtuZXh0UGF0aF07XG4gICAgICBpZiAobmV4dCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmIChbJ3N0cmluZycsICdudW1iZXInLCAnYm9vbGVhbiddLmluY2x1ZGVzKHR5cGVvZiBuZXh0KSAmJiBqIDwgdG9rZW5zLmxlbmd0aCAtIDEpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBpICs9IGogLSBpICsgMTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICAgIGN1cnJlbnQgPSBuZXh0O1xuICB9XG4gIHJldHVybiBjdXJyZW50O1xufTtcblxuZXhwb3J0IGNvbnN0IGdldENsZWFuZWRDb2RlID0gKGNvZGUpID0+IGNvZGU/LnJlcGxhY2UoL18vZywgJy0nKTtcbiIsImltcG9ydCB7IGlzU3RyaW5nIH0gZnJvbSAnLi91dGlscy5qcyc7XG5cbmNvbnN0IGNvbnNvbGVMb2dnZXIgPSB7XG4gIHR5cGU6ICdsb2dnZXInLFxuXG4gIGxvZyhhcmdzKSB7XG4gICAgdGhpcy5vdXRwdXQoJ2xvZycsIGFyZ3MpO1xuICB9LFxuXG4gIHdhcm4oYXJncykge1xuICAgIHRoaXMub3V0cHV0KCd3YXJuJywgYXJncyk7XG4gIH0sXG5cbiAgZXJyb3IoYXJncykge1xuICAgIHRoaXMub3V0cHV0KCdlcnJvcicsIGFyZ3MpO1xuICB9LFxuXG4gIG91dHB1dCh0eXBlLCBhcmdzKSB7XG4gICAgLyogZXNsaW50IG5vLWNvbnNvbGU6IDAgKi9cbiAgICBjb25zb2xlPy5bdHlwZV0/LmFwcGx5Py4oY29uc29sZSwgYXJncyk7XG4gIH0sXG59O1xuXG5jbGFzcyBMb2dnZXIge1xuICBjb25zdHJ1Y3Rvcihjb25jcmV0ZUxvZ2dlciwgb3B0aW9ucyA9IHt9KSB7XG4gICAgdGhpcy5pbml0KGNvbmNyZXRlTG9nZ2VyLCBvcHRpb25zKTtcbiAgfVxuXG4gIGluaXQoY29uY3JldGVMb2dnZXIsIG9wdGlvbnMgPSB7fSkge1xuICAgIHRoaXMucHJlZml4ID0gb3B0aW9ucy5wcmVmaXggfHwgJ2kxOG5leHQ6JztcbiAgICB0aGlzLmxvZ2dlciA9IGNvbmNyZXRlTG9nZ2VyIHx8IGNvbnNvbGVMb2dnZXI7XG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcbiAgICB0aGlzLmRlYnVnID0gb3B0aW9ucy5kZWJ1ZztcbiAgfVxuXG4gIGxvZyguLi5hcmdzKSB7XG4gICAgcmV0dXJuIHRoaXMuZm9yd2FyZChhcmdzLCAnbG9nJywgJycsIHRydWUpO1xuICB9XG5cbiAgd2FybiguLi5hcmdzKSB7XG4gICAgcmV0dXJuIHRoaXMuZm9yd2FyZChhcmdzLCAnd2FybicsICcnLCB0cnVlKTtcbiAgfVxuXG4gIGVycm9yKC4uLmFyZ3MpIHtcbiAgICByZXR1cm4gdGhpcy5mb3J3YXJkKGFyZ3MsICdlcnJvcicsICcnKTtcbiAgfVxuXG4gIGRlcHJlY2F0ZSguLi5hcmdzKSB7XG4gICAgcmV0dXJuIHRoaXMuZm9yd2FyZChhcmdzLCAnd2FybicsICdXQVJOSU5HIERFUFJFQ0FURUQ6ICcsIHRydWUpO1xuICB9XG5cbiAgZm9yd2FyZChhcmdzLCBsdmwsIHByZWZpeCwgZGVidWdPbmx5KSB7XG4gICAgaWYgKGRlYnVnT25seSAmJiAhdGhpcy5kZWJ1ZykgcmV0dXJuIG51bGw7XG4gICAgLy8gU3RyaXAgY29udHJvbCBjaGFyYWN0ZXJzIGZyb20gc3RyaW5nIGFyZ3MgdG8gcHJldmVudCBsb2cgZm9yZ2luZyB2aWFcbiAgICAvLyB1c2VyLWNvbnRyb2xsZWQgdHJhbnNsYXRpb24ga2V5cywgbGFuZ3VhZ2VzLCBuYW1lc3BhY2VzLCBvciBpbnRlcnBvbGF0aW9uXG4gICAgLy8gdmFyaWFibGUgbmFtZXMgKENXRS0xMTcpLlxuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb250cm9sLXJlZ2V4XG4gICAgYXJncyA9IGFyZ3MubWFwKChhKSA9PiAoaXNTdHJpbmcoYSkgPyBhLnJlcGxhY2UoL1tcXHJcXG5cXHgwMC1cXHgxRlxceDdGXS9nLCAnICcpIDogYSkpO1xuICAgIGlmIChpc1N0cmluZyhhcmdzWzBdKSkgYXJnc1swXSA9IGAke3ByZWZpeH0ke3RoaXMucHJlZml4fSAke2FyZ3NbMF19YDtcbiAgICByZXR1cm4gdGhpcy5sb2dnZXJbbHZsXShhcmdzKTtcbiAgfVxuXG4gIGNyZWF0ZShtb2R1bGVOYW1lKSB7XG4gICAgcmV0dXJuIG5ldyBMb2dnZXIodGhpcy5sb2dnZXIsIHtcbiAgICAgIC4uLnsgcHJlZml4OiBgJHt0aGlzLnByZWZpeH06JHttb2R1bGVOYW1lfTpgIH0sXG4gICAgICAuLi50aGlzLm9wdGlvbnMsXG4gICAgfSk7XG4gIH1cblxuICBjbG9uZShvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwgdGhpcy5vcHRpb25zO1xuICAgIG9wdGlvbnMucHJlZml4ID0gb3B0aW9ucy5wcmVmaXggfHwgdGhpcy5wcmVmaXg7XG4gICAgcmV0dXJuIG5ldyBMb2dnZXIodGhpcy5sb2dnZXIsIG9wdGlvbnMpO1xuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IG5ldyBMb2dnZXIoKTtcbiIsImNsYXNzIEV2ZW50RW1pdHRlciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIC8vIFRoaXMgaXMgYW4gT2JqZWN0IGNvbnRhaW5pbmcgTWFwczpcbiAgICAvL1xuICAgIC8vIHsgW2V2ZW50OiBzdHJpbmddOiBNYXA8bGlzdGVuZXI6IGZ1bmN0aW9uLCBudW1UaW1lc0FkZGVkOiBudW1iZXI+IH1cbiAgICAvL1xuICAgIC8vIFdlIHVzZSBhIE1hcCBmb3IgTygxKSBpbnNlcnRpb24vZGVsZXRpb24gYW5kIGJlY2F1c2UgaXQgY2FuIGhhdmUgZnVuY3Rpb25zIGFzIGtleXMuXG4gICAgLy9cbiAgICAvLyBXZSBrZWVwIHRyYWNrIG9mIG51bVRpbWVzQWRkZWQgKHRoZSBudW1iZXIgb2YgdGltZXMgaXQgd2FzIGFkZGVkKSBiZWNhdXNlIGlmIHlvdSBhdHRhY2ggdGhlIHNhbWUgbGlzdGVuZXIgdHdpY2UsXG4gICAgLy8gd2Ugc2hvdWxkIGFjdHVhbGx5IGNhbGwgaXQgdHdpY2UgZm9yIGVhY2ggZW1pdHRlZCBldmVudC5cbiAgICB0aGlzLm9ic2VydmVycyA9IHt9O1xuICB9XG5cbiAgb24oZXZlbnRzLCBsaXN0ZW5lcikge1xuICAgIGV2ZW50cy5zcGxpdCgnICcpLmZvckVhY2goKGV2ZW50KSA9PiB7XG4gICAgICBpZiAoIXRoaXMub2JzZXJ2ZXJzW2V2ZW50XSkgdGhpcy5vYnNlcnZlcnNbZXZlbnRdID0gbmV3IE1hcCgpO1xuICAgICAgY29uc3QgbnVtTGlzdGVuZXJzID0gdGhpcy5vYnNlcnZlcnNbZXZlbnRdLmdldChsaXN0ZW5lcikgfHwgMDtcbiAgICAgIHRoaXMub2JzZXJ2ZXJzW2V2ZW50XS5zZXQobGlzdGVuZXIsIG51bUxpc3RlbmVycyArIDEpO1xuICAgIH0pO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgb2ZmKGV2ZW50LCBsaXN0ZW5lcikge1xuICAgIGlmICghdGhpcy5vYnNlcnZlcnNbZXZlbnRdKSByZXR1cm47XG4gICAgaWYgKCFsaXN0ZW5lcikge1xuICAgICAgZGVsZXRlIHRoaXMub2JzZXJ2ZXJzW2V2ZW50XTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLm9ic2VydmVyc1tldmVudF0uZGVsZXRlKGxpc3RlbmVyKTtcbiAgfVxuXG4gIG9uY2UoZXZlbnQsIGxpc3RlbmVyKSB7XG4gICAgY29uc3Qgd3JhcHBlciA9ICguLi5hcmdzKSA9PiB7XG4gICAgICBsaXN0ZW5lciguLi5hcmdzKTtcbiAgICAgIHRoaXMub2ZmKGV2ZW50LCB3cmFwcGVyKTtcbiAgICB9O1xuICAgIHRoaXMub24oZXZlbnQsIHdyYXBwZXIpO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgZW1pdChldmVudCwgLi4uYXJncykge1xuICAgIGlmICh0aGlzLm9ic2VydmVyc1tldmVudF0pIHtcbiAgICAgIGNvbnN0IGNsb25lZCA9IEFycmF5LmZyb20odGhpcy5vYnNlcnZlcnNbZXZlbnRdLmVudHJpZXMoKSk7XG4gICAgICBjbG9uZWQuZm9yRWFjaCgoW29ic2VydmVyLCBudW1UaW1lc0FkZGVkXSkgPT4ge1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG51bVRpbWVzQWRkZWQ7IGkrKykge1xuICAgICAgICAgIG9ic2VydmVyKC4uLmFyZ3MpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5vYnNlcnZlcnNbJyonXSkge1xuICAgICAgY29uc3QgY2xvbmVkID0gQXJyYXkuZnJvbSh0aGlzLm9ic2VydmVyc1snKiddLmVudHJpZXMoKSk7XG4gICAgICBjbG9uZWQuZm9yRWFjaCgoW29ic2VydmVyLCBudW1UaW1lc0FkZGVkXSkgPT4ge1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG51bVRpbWVzQWRkZWQ7IGkrKykge1xuICAgICAgICAgIG9ic2VydmVyKGV2ZW50LCAuLi5hcmdzKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IEV2ZW50RW1pdHRlcjtcbiIsImltcG9ydCBFdmVudEVtaXR0ZXIgZnJvbSAnLi9FdmVudEVtaXR0ZXIuanMnO1xuaW1wb3J0IHsgZ2V0UGF0aCwgZGVlcEZpbmQsIHNldFBhdGgsIGRlZXBFeHRlbmQsIGlzU3RyaW5nIH0gZnJvbSAnLi91dGlscy5qcyc7XG5cbmNsYXNzIFJlc291cmNlU3RvcmUgZXh0ZW5kcyBFdmVudEVtaXR0ZXIge1xuICBjb25zdHJ1Y3RvcihkYXRhLCBvcHRpb25zID0geyBuczogWyd0cmFuc2xhdGlvbiddLCBkZWZhdWx0TlM6ICd0cmFuc2xhdGlvbicgfSkge1xuICAgIHN1cGVyKCk7XG5cbiAgICB0aGlzLmRhdGEgPSBkYXRhIHx8IHt9O1xuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG4gICAgaWYgKHRoaXMub3B0aW9ucy5rZXlTZXBhcmF0b3IgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5vcHRpb25zLmtleVNlcGFyYXRvciA9ICcuJztcbiAgICB9XG4gICAgaWYgKHRoaXMub3B0aW9ucy5pZ25vcmVKU09OU3RydWN0dXJlID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMub3B0aW9ucy5pZ25vcmVKU09OU3RydWN0dXJlID0gdHJ1ZTtcbiAgICB9XG4gIH1cblxuICBhZGROYW1lc3BhY2VzKG5zKSB7XG4gICAgaWYgKCF0aGlzLm9wdGlvbnMubnMuaW5jbHVkZXMobnMpKSB7XG4gICAgICB0aGlzLm9wdGlvbnMubnMucHVzaChucyk7XG4gICAgfVxuICB9XG5cbiAgcmVtb3ZlTmFtZXNwYWNlcyhucykge1xuICAgIGNvbnN0IGluZGV4ID0gdGhpcy5vcHRpb25zLm5zLmluZGV4T2YobnMpO1xuICAgIGlmIChpbmRleCA+IC0xKSB7XG4gICAgICB0aGlzLm9wdGlvbnMubnMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICB9XG4gIH1cblxuICBnZXRSZXNvdXJjZShsbmcsIG5zLCBrZXksIG9wdGlvbnMgPSB7fSkge1xuICAgIGNvbnN0IGtleVNlcGFyYXRvciA9XG4gICAgICBvcHRpb25zLmtleVNlcGFyYXRvciAhPT0gdW5kZWZpbmVkID8gb3B0aW9ucy5rZXlTZXBhcmF0b3IgOiB0aGlzLm9wdGlvbnMua2V5U2VwYXJhdG9yO1xuXG4gICAgY29uc3QgaWdub3JlSlNPTlN0cnVjdHVyZSA9XG4gICAgICBvcHRpb25zLmlnbm9yZUpTT05TdHJ1Y3R1cmUgIT09IHVuZGVmaW5lZFxuICAgICAgICA/IG9wdGlvbnMuaWdub3JlSlNPTlN0cnVjdHVyZVxuICAgICAgICA6IHRoaXMub3B0aW9ucy5pZ25vcmVKU09OU3RydWN0dXJlO1xuXG4gICAgbGV0IHBhdGg7XG4gICAgaWYgKGxuZy5pbmNsdWRlcygnLicpKSB7XG4gICAgICBwYXRoID0gbG5nLnNwbGl0KCcuJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHBhdGggPSBbbG5nLCBuc107XG4gICAgICBpZiAoa2V5KSB7XG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KGtleSkpIHtcbiAgICAgICAgICBwYXRoLnB1c2goLi4ua2V5KTtcbiAgICAgICAgfSBlbHNlIGlmIChpc1N0cmluZyhrZXkpICYmIGtleVNlcGFyYXRvcikge1xuICAgICAgICAgIHBhdGgucHVzaCguLi5rZXkuc3BsaXQoa2V5U2VwYXJhdG9yKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcGF0aC5wdXNoKGtleSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCByZXN1bHQgPSBnZXRQYXRoKHRoaXMuZGF0YSwgcGF0aCk7XG4gICAgaWYgKCFyZXN1bHQgJiYgIW5zICYmICFrZXkgJiYgbG5nLmluY2x1ZGVzKCcuJykpIHtcbiAgICAgIGxuZyA9IHBhdGhbMF07XG4gICAgICBucyA9IHBhdGhbMV07XG4gICAgICBrZXkgPSBwYXRoLnNsaWNlKDIpLmpvaW4oJy4nKTtcbiAgICB9XG4gICAgaWYgKHJlc3VsdCB8fCAhaWdub3JlSlNPTlN0cnVjdHVyZSB8fCAhaXNTdHJpbmcoa2V5KSkgcmV0dXJuIHJlc3VsdDtcblxuICAgIHJldHVybiBkZWVwRmluZCh0aGlzLmRhdGE/LltsbmddPy5bbnNdLCBrZXksIGtleVNlcGFyYXRvcik7XG4gIH1cblxuICBhZGRSZXNvdXJjZShsbmcsIG5zLCBrZXksIHZhbHVlLCBvcHRpb25zID0geyBzaWxlbnQ6IGZhbHNlIH0pIHtcbiAgICBjb25zdCBrZXlTZXBhcmF0b3IgPVxuICAgICAgb3B0aW9ucy5rZXlTZXBhcmF0b3IgIT09IHVuZGVmaW5lZCA/IG9wdGlvbnMua2V5U2VwYXJhdG9yIDogdGhpcy5vcHRpb25zLmtleVNlcGFyYXRvcjtcblxuICAgIGxldCBwYXRoID0gW2xuZywgbnNdO1xuICAgIGlmIChrZXkpIHBhdGggPSBwYXRoLmNvbmNhdChrZXlTZXBhcmF0b3IgPyBrZXkuc3BsaXQoa2V5U2VwYXJhdG9yKSA6IGtleSk7XG5cbiAgICBpZiAobG5nLmluY2x1ZGVzKCcuJykpIHtcbiAgICAgIHBhdGggPSBsbmcuc3BsaXQoJy4nKTtcbiAgICAgIHZhbHVlID0gbnM7XG4gICAgICBucyA9IHBhdGhbMV07XG4gICAgfVxuXG4gICAgdGhpcy5hZGROYW1lc3BhY2VzKG5zKTtcblxuICAgIHNldFBhdGgodGhpcy5kYXRhLCBwYXRoLCB2YWx1ZSk7XG5cbiAgICBpZiAoIW9wdGlvbnMuc2lsZW50KSB0aGlzLmVtaXQoJ2FkZGVkJywgbG5nLCBucywga2V5LCB2YWx1ZSk7XG4gIH1cblxuICBhZGRSZXNvdXJjZXMobG5nLCBucywgcmVzb3VyY2VzLCBvcHRpb25zID0geyBzaWxlbnQ6IGZhbHNlIH0pIHtcbiAgICBmb3IgKGNvbnN0IG0gaW4gcmVzb3VyY2VzKSB7XG4gICAgICBpZiAoaXNTdHJpbmcocmVzb3VyY2VzW21dKSB8fCBBcnJheS5pc0FycmF5KHJlc291cmNlc1ttXSkpXG4gICAgICAgIHRoaXMuYWRkUmVzb3VyY2UobG5nLCBucywgbSwgcmVzb3VyY2VzW21dLCB7IHNpbGVudDogdHJ1ZSB9KTtcbiAgICB9XG4gICAgaWYgKCFvcHRpb25zLnNpbGVudCkgdGhpcy5lbWl0KCdhZGRlZCcsIGxuZywgbnMsIHJlc291cmNlcyk7XG4gIH1cblxuICBhZGRSZXNvdXJjZUJ1bmRsZShcbiAgICBsbmcsXG4gICAgbnMsXG4gICAgcmVzb3VyY2VzLFxuICAgIGRlZXAsXG4gICAgb3ZlcndyaXRlLFxuICAgIG9wdGlvbnMgPSB7IHNpbGVudDogZmFsc2UsIHNraXBDb3B5OiBmYWxzZSB9LFxuICApIHtcbiAgICBsZXQgcGF0aCA9IFtsbmcsIG5zXTtcbiAgICBpZiAobG5nLmluY2x1ZGVzKCcuJykpIHtcbiAgICAgIHBhdGggPSBsbmcuc3BsaXQoJy4nKTtcbiAgICAgIGRlZXAgPSByZXNvdXJjZXM7XG4gICAgICByZXNvdXJjZXMgPSBucztcbiAgICAgIG5zID0gcGF0aFsxXTtcbiAgICB9XG5cbiAgICB0aGlzLmFkZE5hbWVzcGFjZXMobnMpO1xuXG4gICAgbGV0IHBhY2sgPSBnZXRQYXRoKHRoaXMuZGF0YSwgcGF0aCkgfHwge307XG5cbiAgICBpZiAoIW9wdGlvbnMuc2tpcENvcHkpIHJlc291cmNlcyA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkocmVzb3VyY2VzKSk7IC8vIG1ha2UgYSBjb3B5IHRvIGZpeCAjMjA4MVxuXG4gICAgaWYgKGRlZXApIHtcbiAgICAgIGRlZXBFeHRlbmQocGFjaywgcmVzb3VyY2VzLCBvdmVyd3JpdGUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBwYWNrID0geyAuLi5wYWNrLCAuLi5yZXNvdXJjZXMgfTtcbiAgICB9XG5cbiAgICBzZXRQYXRoKHRoaXMuZGF0YSwgcGF0aCwgcGFjayk7XG5cbiAgICBpZiAoIW9wdGlvbnMuc2lsZW50KSB0aGlzLmVtaXQoJ2FkZGVkJywgbG5nLCBucywgcmVzb3VyY2VzKTtcbiAgfVxuXG4gIHJlbW92ZVJlc291cmNlQnVuZGxlKGxuZywgbnMpIHtcbiAgICBpZiAodGhpcy5oYXNSZXNvdXJjZUJ1bmRsZShsbmcsIG5zKSkge1xuICAgICAgZGVsZXRlIHRoaXMuZGF0YVtsbmddW25zXTtcbiAgICB9XG4gICAgdGhpcy5yZW1vdmVOYW1lc3BhY2VzKG5zKTtcblxuICAgIHRoaXMuZW1pdCgncmVtb3ZlZCcsIGxuZywgbnMpO1xuICB9XG5cbiAgaGFzUmVzb3VyY2VCdW5kbGUobG5nLCBucykge1xuICAgIHJldHVybiB0aGlzLmdldFJlc291cmNlKGxuZywgbnMpICE9PSB1bmRlZmluZWQ7XG4gIH1cblxuICBnZXRSZXNvdXJjZUJ1bmRsZShsbmcsIG5zKSB7XG4gICAgaWYgKCFucykgbnMgPSB0aGlzLm9wdGlvbnMuZGVmYXVsdE5TO1xuICAgIHJldHVybiB0aGlzLmdldFJlc291cmNlKGxuZywgbnMpO1xuICB9XG5cbiAgZ2V0RGF0YUJ5TGFuZ3VhZ2UobG5nKSB7XG4gICAgcmV0dXJuIHRoaXMuZGF0YVtsbmddO1xuICB9XG5cbiAgaGFzTGFuZ3VhZ2VTb21lVHJhbnNsYXRpb25zKGxuZykge1xuICAgIGNvbnN0IGRhdGEgPSB0aGlzLmdldERhdGFCeUxhbmd1YWdlKGxuZyk7XG4gICAgY29uc3QgbiA9IChkYXRhICYmIE9iamVjdC5rZXlzKGRhdGEpKSB8fCBbXTtcbiAgICByZXR1cm4gISFuLmZpbmQoKHYpID0+IGRhdGFbdl0gJiYgT2JqZWN0LmtleXMoZGF0YVt2XSkubGVuZ3RoID4gMCk7XG4gIH1cblxuICB0b0pTT04oKSB7XG4gICAgcmV0dXJuIHRoaXMuZGF0YTtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBSZXNvdXJjZVN0b3JlO1xuIiwiZXhwb3J0IGRlZmF1bHQge1xuICBwcm9jZXNzb3JzOiB7fSxcblxuICBhZGRQb3N0UHJvY2Vzc29yKG1vZHVsZSkge1xuICAgIHRoaXMucHJvY2Vzc29yc1ttb2R1bGUubmFtZV0gPSBtb2R1bGU7XG4gIH0sXG5cbiAgaGFuZGxlKHByb2Nlc3NvcnMsIHZhbHVlLCBrZXksIG9wdGlvbnMsIHRyYW5zbGF0b3IpIHtcbiAgICBwcm9jZXNzb3JzLmZvckVhY2goKHByb2Nlc3NvcikgPT4ge1xuICAgICAgdmFsdWUgPSB0aGlzLnByb2Nlc3NvcnNbcHJvY2Vzc29yXT8ucHJvY2Vzcyh2YWx1ZSwga2V5LCBvcHRpb25zLCB0cmFuc2xhdG9yKSA/PyB2YWx1ZTtcbiAgICB9KTtcblxuICAgIHJldHVybiB2YWx1ZTtcbiAgfSxcbn07XG4iLCJjb25zdCBQQVRIX0tFWSA9IFN5bWJvbCgnaTE4bmV4dC9QQVRIX0tFWScpO1xuXG5mdW5jdGlvbiBjcmVhdGVQcm94eSgpIHtcbiAgY29uc3Qgc3RhdGUgPSBbXTtcbiAgLy8gYE9iamVjdC5jcmVhdGUobnVsbClgIHRvIHByZXZlbnQgcHJvdG90eXBlIHBvbGx1dGlvblxuICBjb25zdCBoYW5kbGVyID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgbGV0IHByb3h5O1xuICBoYW5kbGVyLmdldCA9ICh0YXJnZXQsIGtleSkgPT4ge1xuICAgIHByb3h5Py5yZXZva2U/LigpO1xuICAgIGlmIChrZXkgPT09IFBBVEhfS0VZKSByZXR1cm4gc3RhdGU7XG4gICAgc3RhdGUucHVzaChrZXkpO1xuICAgIHByb3h5ID0gUHJveHkucmV2b2NhYmxlKHRhcmdldCwgaGFuZGxlcik7XG4gICAgcmV0dXJuIHByb3h5LnByb3h5O1xuICB9O1xuICByZXR1cm4gUHJveHkucmV2b2NhYmxlKE9iamVjdC5jcmVhdGUobnVsbCksIGhhbmRsZXIpLnByb3h5O1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBrZXlzRnJvbVNlbGVjdG9yKHNlbGVjdG9yLCBvcHRzKSB7XG4gIGNvbnN0IHsgW1BBVEhfS0VZXTogcGF0aCB9ID0gc2VsZWN0b3IoY3JlYXRlUHJveHkoKSk7XG5cbiAgY29uc3Qga2V5U2VwYXJhdG9yID0gb3B0cz8ua2V5U2VwYXJhdG9yID8/ICcuJztcbiAgY29uc3QgbnNTZXBhcmF0b3IgPSBvcHRzPy5uc1NlcGFyYXRvciA/PyAnOic7XG4gIGNvbnN0IHN0cmljdCA9IG9wdHM/LmVuYWJsZVNlbGVjdG9yID09PSAnc3RyaWN0JztcblxuICAvLyBEZWZhdWx0IG1vZGUgKHYyNS44LjE5KTogd2hlbiBgbnNgIGlzIGFuIGFycmF5IG9mIHR3byBvciBtb3JlIG5hbWVzcGFjZXMsXG4gIC8vIEdldFNvdXJjZSBleHBvc2VzIHRoZSBwcmltYXJ5IG5hbWVzcGFjZSdzIGtleXMgZmxhdCBvbiBgJGAsIHdoaWxlIHNlY29uZGFyeVxuICAvLyBuYW1lc3BhY2VzIGFyZSBodW5nIG9mZiBgJGAgdW5kZXIgdGhlaXIgb3duIG5hbWUgKGUuZy4gYCQubnMzLmZyb21OczNgKS5cbiAgLy8gT25seSBhIGxlYWRpbmcgc2VnbWVudCBlcXVhbCB0byBhICpzZWNvbmRhcnkqIG5hbWVzcGFjZSBpcyByZXdyaXR0ZW4uXG4gIC8vIFNpbmdsZS1zdHJpbmcgbnMgYW5kIHByaW1hcnktcHJlZml4ZWQgcGF0aHMgc3RheSBmbGF0IChwcmVzZXJ2ZXMgIzI0MDUpLlxuICAvL1xuICAvLyBTdHJpY3QgbW9kZTogYE5zUmVzb3VyY2VgIGRyb3BzIGl0cyBmbGF0dGVuZWQtcHJpbWFyeSBmb3JtIGF0IHRoZSB0eXBlXG4gIC8vIGxldmVsIOKAlCBgJGAgZXhwb3NlcyBuYW1lc3BhY2VzIHVuaWZvcm1seSwgcHJpbWFyeSBpbmNsdWRlZC4gU28gYHBhdGhbMF1gXG4gIC8vIGlzICphbHdheXMqIGEgbmFtZXNwYWNlIGlkZW50aWZpZXIgd2hlbiBpdCBtYXRjaGVzIHRoZSBzY29wZSdzIG5zIGxpc3QsXG4gIC8vIGFuZCB3ZSByZXdyaXRlIHRvIGBuczxzZXA+cmVzdGAgcmVnYXJkbGVzcyBvZiBzaW5nbGUvbXVsdGktbnMgc2NvcGUgYW5kXG4gIC8vIHJlZ2FyZGxlc3Mgb2YgcHJpbWFyeSB2cyBzZWNvbmRhcnkuIFNlZSAjMjQyOS5cbiAgaWYgKHBhdGgubGVuZ3RoID4gMSAmJiBuc1NlcGFyYXRvcikge1xuICAgIGNvbnN0IG5zID0gb3B0cz8ubnM7XG4gICAgY29uc3QgbnNMaXN0ID0gc3RyaWN0XG4gICAgICA/IEFycmF5LmlzQXJyYXkobnMpXG4gICAgICAgID8gbnNcbiAgICAgICAgOiBuc1xuICAgICAgICAgID8gW25zXVxuICAgICAgICAgIDogbnVsbFxuICAgICAgOiBBcnJheS5pc0FycmF5KG5zKVxuICAgICAgICA/IG5zXG4gICAgICAgIDogbnVsbDtcblxuICAgIGlmIChuc0xpc3QpIHtcbiAgICAgIGNvbnN0IGNhbmRpZGF0ZXMgPSBzdHJpY3QgPyBuc0xpc3QgOiBuc0xpc3QubGVuZ3RoID4gMSA/IG5zTGlzdC5zbGljZSgxKSA6IFtdO1xuICAgICAgaWYgKGNhbmRpZGF0ZXMuaW5jbHVkZXMocGF0aFswXSkpIHtcbiAgICAgICAgcmV0dXJuIGAke3BhdGhbMF19JHtuc1NlcGFyYXRvcn0ke3BhdGguc2xpY2UoMSkuam9pbihrZXlTZXBhcmF0b3IpfWA7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHBhdGguam9pbihrZXlTZXBhcmF0b3IpO1xufVxuIiwiaW1wb3J0IGJhc2VMb2dnZXIgZnJvbSAnLi9sb2dnZXIuanMnO1xuaW1wb3J0IEV2ZW50RW1pdHRlciBmcm9tICcuL0V2ZW50RW1pdHRlci5qcyc7XG5pbXBvcnQgcG9zdFByb2Nlc3NvciBmcm9tICcuL3Bvc3RQcm9jZXNzb3IuanMnO1xuaW1wb3J0IHsgY29weSBhcyB1dGlsc0NvcHksIGxvb2tzTGlrZU9iamVjdFBhdGgsIGlzU3RyaW5nIH0gZnJvbSAnLi91dGlscy5qcyc7XG5pbXBvcnQga2V5c0Zyb21TZWxlY3RvciBmcm9tICcuL3NlbGVjdG9yLmpzJztcblxuY29uc3Qgc2hvdWxkSGFuZGxlQXNPYmplY3QgPSAocmVzKSA9PlxuICAhaXNTdHJpbmcocmVzKSAmJiB0eXBlb2YgcmVzICE9PSAnYm9vbGVhbicgJiYgdHlwZW9mIHJlcyAhPT0gJ251bWJlcic7XG5cbmNsYXNzIFRyYW5zbGF0b3IgZXh0ZW5kcyBFdmVudEVtaXR0ZXIge1xuICBjb25zdHJ1Y3RvcihzZXJ2aWNlcywgb3B0aW9ucyA9IHt9KSB7XG4gICAgc3VwZXIoKTtcblxuICAgIHV0aWxzQ29weShcbiAgICAgIFtcbiAgICAgICAgJ3Jlc291cmNlU3RvcmUnLFxuICAgICAgICAnbGFuZ3VhZ2VVdGlscycsXG4gICAgICAgICdwbHVyYWxSZXNvbHZlcicsXG4gICAgICAgICdpbnRlcnBvbGF0b3InLFxuICAgICAgICAnYmFja2VuZENvbm5lY3RvcicsXG4gICAgICAgICdpMThuRm9ybWF0JyxcbiAgICAgICAgJ3V0aWxzJyxcbiAgICAgIF0sXG4gICAgICBzZXJ2aWNlcyxcbiAgICAgIHRoaXMsXG4gICAgKTtcblxuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG4gICAgaWYgKHRoaXMub3B0aW9ucy5rZXlTZXBhcmF0b3IgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5vcHRpb25zLmtleVNlcGFyYXRvciA9ICcuJztcbiAgICB9XG5cbiAgICB0aGlzLmxvZ2dlciA9IGJhc2VMb2dnZXIuY3JlYXRlKCd0cmFuc2xhdG9yJyk7XG5cbiAgICB0aGlzLmNoZWNrZWRMb2FkZWRGb3IgPSB7fTtcbiAgfVxuXG4gIGNoYW5nZUxhbmd1YWdlKGxuZykge1xuICAgIGlmIChsbmcpIHRoaXMubGFuZ3VhZ2UgPSBsbmc7XG4gIH1cblxuICBleGlzdHMoa2V5LCBvID0geyBpbnRlcnBvbGF0aW9uOiB7fSB9KSB7XG4gICAgY29uc3Qgb3B0ID0geyAuLi5vIH07XG4gICAgaWYgKGtleSA9PSBudWxsKSByZXR1cm4gZmFsc2U7XG4gICAgY29uc3QgcmVzb2x2ZWQgPSB0aGlzLnJlc29sdmUoa2V5LCBvcHQpO1xuXG4gICAgLy8gSWYgbm8gcmVzb3VyY2UgZm91bmQsIHJldHVybiBmYWxzZVxuICAgIGlmIChyZXNvbHZlZD8ucmVzID09PSB1bmRlZmluZWQpIHJldHVybiBmYWxzZTtcblxuICAgIC8vIENoZWNrIGlmIHRoZSByZXNvbHZlZCByZXNvdXJjZSBpcyBhbiBvYmplY3RcbiAgICBjb25zdCBpc09iamVjdCA9IHNob3VsZEhhbmRsZUFzT2JqZWN0KHJlc29sdmVkLnJlcyk7XG5cbiAgICAvLyBJZiByZXR1cm5PYmplY3RzIGlzIGV4cGxpY2l0bHkgc2V0IHRvIGZhbHNlIGFuZCB0aGUgcmVzb3VyY2UgaXMgYW4gb2JqZWN0LCByZXR1cm4gZmFsc2VcbiAgICBpZiAob3B0LnJldHVybk9iamVjdHMgPT09IGZhbHNlICYmIGlzT2JqZWN0KSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgLy8gT3RoZXJ3aXNlIHJldHVybiB0cnVlIChyZXNvdXJjZSBleGlzdHMpXG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBleHRyYWN0RnJvbUtleShrZXksIG9wdCkge1xuICAgIGxldCBuc1NlcGFyYXRvciA9IG9wdC5uc1NlcGFyYXRvciAhPT0gdW5kZWZpbmVkID8gb3B0Lm5zU2VwYXJhdG9yIDogdGhpcy5vcHRpb25zLm5zU2VwYXJhdG9yO1xuICAgIGlmIChuc1NlcGFyYXRvciA9PT0gdW5kZWZpbmVkKSBuc1NlcGFyYXRvciA9ICc6JztcblxuICAgIGNvbnN0IGtleVNlcGFyYXRvciA9XG4gICAgICBvcHQua2V5U2VwYXJhdG9yICE9PSB1bmRlZmluZWQgPyBvcHQua2V5U2VwYXJhdG9yIDogdGhpcy5vcHRpb25zLmtleVNlcGFyYXRvcjtcblxuICAgIGxldCBuYW1lc3BhY2VzID0gb3B0Lm5zIHx8IHRoaXMub3B0aW9ucy5kZWZhdWx0TlMgfHwgW107XG4gICAgY29uc3Qgd291bGRDaGVja0Zvck5zSW5LZXkgPSBuc1NlcGFyYXRvciAmJiBrZXkuaW5jbHVkZXMobnNTZXBhcmF0b3IpO1xuICAgIGNvbnN0IHNlZW1zTmF0dXJhbExhbmd1YWdlID1cbiAgICAgICF0aGlzLm9wdGlvbnMudXNlckRlZmluZWRLZXlTZXBhcmF0b3IgJiZcbiAgICAgICFvcHQua2V5U2VwYXJhdG9yICYmXG4gICAgICAhdGhpcy5vcHRpb25zLnVzZXJEZWZpbmVkTnNTZXBhcmF0b3IgJiZcbiAgICAgICFvcHQubnNTZXBhcmF0b3IgJiZcbiAgICAgICFsb29rc0xpa2VPYmplY3RQYXRoKGtleSwgbnNTZXBhcmF0b3IsIGtleVNlcGFyYXRvcik7XG4gICAgaWYgKHdvdWxkQ2hlY2tGb3JOc0luS2V5ICYmICFzZWVtc05hdHVyYWxMYW5ndWFnZSkge1xuICAgICAgY29uc3QgbSA9IGtleS5tYXRjaCh0aGlzLmludGVycG9sYXRvci5uZXN0aW5nUmVnZXhwKTtcbiAgICAgIGlmIChtICYmIG0ubGVuZ3RoID4gMCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIGtleSxcbiAgICAgICAgICBuYW1lc3BhY2VzOiBpc1N0cmluZyhuYW1lc3BhY2VzKSA/IFtuYW1lc3BhY2VzXSA6IG5hbWVzcGFjZXMsXG4gICAgICAgIH07XG4gICAgICB9XG4gICAgICBjb25zdCBwYXJ0cyA9IGtleS5zcGxpdChuc1NlcGFyYXRvcik7XG4gICAgICBpZiAoXG4gICAgICAgIG5zU2VwYXJhdG9yICE9PSBrZXlTZXBhcmF0b3IgfHxcbiAgICAgICAgKG5zU2VwYXJhdG9yID09PSBrZXlTZXBhcmF0b3IgJiYgdGhpcy5vcHRpb25zLm5zLmluY2x1ZGVzKHBhcnRzWzBdKSlcbiAgICAgIClcbiAgICAgICAgbmFtZXNwYWNlcyA9IHBhcnRzLnNoaWZ0KCk7XG4gICAgICBrZXkgPSBwYXJ0cy5qb2luKGtleVNlcGFyYXRvcik7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIGtleSxcbiAgICAgIG5hbWVzcGFjZXM6IGlzU3RyaW5nKG5hbWVzcGFjZXMpID8gW25hbWVzcGFjZXNdIDogbmFtZXNwYWNlcyxcbiAgICB9O1xuICB9XG5cbiAgdHJhbnNsYXRlKGtleXMsIG8sIGxhc3RLZXkpIHtcbiAgICBsZXQgb3B0ID0gdHlwZW9mIG8gPT09ICdvYmplY3QnID8geyAuLi5vIH0gOiBvO1xuICAgIGlmICh0eXBlb2Ygb3B0ICE9PSAnb2JqZWN0JyAmJiB0aGlzLm9wdGlvbnMub3ZlcmxvYWRUcmFuc2xhdGlvbk9wdGlvbkhhbmRsZXIpIHtcbiAgICAgIG9wdCA9IHRoaXMub3B0aW9ucy5vdmVybG9hZFRyYW5zbGF0aW9uT3B0aW9uSGFuZGxlcihhcmd1bWVudHMpO1xuICAgIH1cbiAgICBpZiAodHlwZW9mIG9wdCA9PT0gJ29iamVjdCcpIG9wdCA9IHsgLi4ub3B0IH07XG4gICAgaWYgKCFvcHQpIG9wdCA9IHt9O1xuXG4gICAgLy8gbm9uIHZhbGlkIGtleXMgaGFuZGxpbmdcbiAgICBpZiAoa2V5cyA9PSBudWxsIC8qIHx8IGtleXMgPT09ICcnICovKSByZXR1cm4gJyc7XG4gICAgaWYgKHR5cGVvZiBrZXlzID09PSAnZnVuY3Rpb24nKSBrZXlzID0ga2V5c0Zyb21TZWxlY3RvcihrZXlzLCB7IC4uLnRoaXMub3B0aW9ucywgLi4ub3B0IH0pO1xuICAgIGlmICghQXJyYXkuaXNBcnJheShrZXlzKSkga2V5cyA9IFtTdHJpbmcoa2V5cyldO1xuICAgIGtleXMgPSBrZXlzLm1hcCgoaykgPT5cbiAgICAgIHR5cGVvZiBrID09PSAnZnVuY3Rpb24nID8ga2V5c0Zyb21TZWxlY3RvcihrLCB7IC4uLnRoaXMub3B0aW9ucywgLi4ub3B0IH0pIDogU3RyaW5nKGspLFxuICAgICk7XG5cbiAgICBjb25zdCByZXR1cm5EZXRhaWxzID1cbiAgICAgIG9wdC5yZXR1cm5EZXRhaWxzICE9PSB1bmRlZmluZWQgPyBvcHQucmV0dXJuRGV0YWlscyA6IHRoaXMub3B0aW9ucy5yZXR1cm5EZXRhaWxzO1xuXG4gICAgLy8gc2VwYXJhdG9yc1xuICAgIGNvbnN0IGtleVNlcGFyYXRvciA9XG4gICAgICBvcHQua2V5U2VwYXJhdG9yICE9PSB1bmRlZmluZWQgPyBvcHQua2V5U2VwYXJhdG9yIDogdGhpcy5vcHRpb25zLmtleVNlcGFyYXRvcjtcblxuICAgIC8vIGdldCBuYW1lc3BhY2UocylcbiAgICBjb25zdCB7IGtleSwgbmFtZXNwYWNlcyB9ID0gdGhpcy5leHRyYWN0RnJvbUtleShrZXlzW2tleXMubGVuZ3RoIC0gMV0sIG9wdCk7XG4gICAgY29uc3QgbmFtZXNwYWNlID0gbmFtZXNwYWNlc1tuYW1lc3BhY2VzLmxlbmd0aCAtIDFdO1xuXG4gICAgbGV0IG5zU2VwYXJhdG9yID0gb3B0Lm5zU2VwYXJhdG9yICE9PSB1bmRlZmluZWQgPyBvcHQubnNTZXBhcmF0b3IgOiB0aGlzLm9wdGlvbnMubnNTZXBhcmF0b3I7XG4gICAgaWYgKG5zU2VwYXJhdG9yID09PSB1bmRlZmluZWQpIG5zU2VwYXJhdG9yID0gJzonO1xuXG4gICAgLy8gcmV0dXJuIGtleSBvbiBDSU1vZGVcbiAgICBjb25zdCBsbmcgPSBvcHQubG5nIHx8IHRoaXMubGFuZ3VhZ2U7XG4gICAgY29uc3QgYXBwZW5kTmFtZXNwYWNlVG9DSU1vZGUgPVxuICAgICAgb3B0LmFwcGVuZE5hbWVzcGFjZVRvQ0lNb2RlIHx8IHRoaXMub3B0aW9ucy5hcHBlbmROYW1lc3BhY2VUb0NJTW9kZTtcbiAgICBpZiAobG5nPy50b0xvd2VyQ2FzZSgpID09PSAnY2ltb2RlJykge1xuICAgICAgaWYgKGFwcGVuZE5hbWVzcGFjZVRvQ0lNb2RlKSB7XG4gICAgICAgIGlmIChyZXR1cm5EZXRhaWxzKSB7XG4gICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJlczogYCR7bmFtZXNwYWNlfSR7bnNTZXBhcmF0b3J9JHtrZXl9YCxcbiAgICAgICAgICAgIHVzZWRLZXk6IGtleSxcbiAgICAgICAgICAgIGV4YWN0VXNlZEtleToga2V5LFxuICAgICAgICAgICAgdXNlZExuZzogbG5nLFxuICAgICAgICAgICAgdXNlZE5TOiBuYW1lc3BhY2UsXG4gICAgICAgICAgICB1c2VkUGFyYW1zOiB0aGlzLmdldFVzZWRQYXJhbXNEZXRhaWxzKG9wdCksXG4gICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYCR7bmFtZXNwYWNlfSR7bnNTZXBhcmF0b3J9JHtrZXl9YDtcbiAgICAgIH1cblxuICAgICAgaWYgKHJldHVybkRldGFpbHMpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICByZXM6IGtleSxcbiAgICAgICAgICB1c2VkS2V5OiBrZXksXG4gICAgICAgICAgZXhhY3RVc2VkS2V5OiBrZXksXG4gICAgICAgICAgdXNlZExuZzogbG5nLFxuICAgICAgICAgIHVzZWROUzogbmFtZXNwYWNlLFxuICAgICAgICAgIHVzZWRQYXJhbXM6IHRoaXMuZ2V0VXNlZFBhcmFtc0RldGFpbHMob3B0KSxcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBrZXk7XG4gICAgfVxuXG4gICAgLy8gcmVzb2x2ZSBmcm9tIHN0b3JlXG4gICAgY29uc3QgcmVzb2x2ZWQgPSB0aGlzLnJlc29sdmUoa2V5cywgb3B0KTtcbiAgICBsZXQgcmVzID0gcmVzb2x2ZWQ/LnJlcztcbiAgICBjb25zdCByZXNVc2VkS2V5ID0gcmVzb2x2ZWQ/LnVzZWRLZXkgfHwga2V5O1xuICAgIGNvbnN0IHJlc0V4YWN0VXNlZEtleSA9IHJlc29sdmVkPy5leGFjdFVzZWRLZXkgfHwga2V5O1xuXG4gICAgY29uc3Qgbm9PYmplY3QgPSBbJ1tvYmplY3QgTnVtYmVyXScsICdbb2JqZWN0IEZ1bmN0aW9uXScsICdbb2JqZWN0IFJlZ0V4cF0nXTtcbiAgICBjb25zdCBqb2luQXJyYXlzID0gb3B0LmpvaW5BcnJheXMgIT09IHVuZGVmaW5lZCA/IG9wdC5qb2luQXJyYXlzIDogdGhpcy5vcHRpb25zLmpvaW5BcnJheXM7XG5cbiAgICAvLyBvYmplY3RcbiAgICBjb25zdCBoYW5kbGVBc09iamVjdEluSTE4bkZvcm1hdCA9ICF0aGlzLmkxOG5Gb3JtYXQgfHwgdGhpcy5pMThuRm9ybWF0LmhhbmRsZUFzT2JqZWN0O1xuICAgIGNvbnN0IG5lZWRzUGx1cmFsSGFuZGxpbmcgPSBvcHQuY291bnQgIT09IHVuZGVmaW5lZCAmJiAhaXNTdHJpbmcob3B0LmNvdW50KTtcbiAgICBjb25zdCBoYXNEZWZhdWx0VmFsdWUgPSBUcmFuc2xhdG9yLmhhc0RlZmF1bHRWYWx1ZShvcHQpO1xuICAgIGNvbnN0IGRlZmF1bHRWYWx1ZVN1ZmZpeCA9IG5lZWRzUGx1cmFsSGFuZGxpbmdcbiAgICAgID8gdGhpcy5wbHVyYWxSZXNvbHZlci5nZXRTdWZmaXgobG5nLCBvcHQuY291bnQsIG9wdClcbiAgICAgIDogJyc7XG4gICAgY29uc3QgZGVmYXVsdFZhbHVlU3VmZml4T3JkaW5hbEZhbGxiYWNrID1cbiAgICAgIG9wdC5vcmRpbmFsICYmIG5lZWRzUGx1cmFsSGFuZGxpbmdcbiAgICAgICAgPyB0aGlzLnBsdXJhbFJlc29sdmVyLmdldFN1ZmZpeChsbmcsIG9wdC5jb3VudCwgeyBvcmRpbmFsOiBmYWxzZSB9KVxuICAgICAgICA6ICcnO1xuICAgIGNvbnN0IG5lZWRzWmVyb1N1ZmZpeExvb2t1cCA9IG5lZWRzUGx1cmFsSGFuZGxpbmcgJiYgIW9wdC5vcmRpbmFsICYmIG9wdC5jb3VudCA9PT0gMDtcbiAgICBjb25zdCBkZWZhdWx0VmFsdWUgPVxuICAgICAgKG5lZWRzWmVyb1N1ZmZpeExvb2t1cCAmJiBvcHRbYGRlZmF1bHRWYWx1ZSR7dGhpcy5vcHRpb25zLnBsdXJhbFNlcGFyYXRvcn16ZXJvYF0pIHx8XG4gICAgICBvcHRbYGRlZmF1bHRWYWx1ZSR7ZGVmYXVsdFZhbHVlU3VmZml4fWBdIHx8XG4gICAgICBvcHRbYGRlZmF1bHRWYWx1ZSR7ZGVmYXVsdFZhbHVlU3VmZml4T3JkaW5hbEZhbGxiYWNrfWBdIHx8XG4gICAgICBvcHQuZGVmYXVsdFZhbHVlO1xuXG4gICAgbGV0IHJlc0Zvck9iakhuZGwgPSByZXM7XG4gICAgaWYgKGhhbmRsZUFzT2JqZWN0SW5JMThuRm9ybWF0ICYmICFyZXMgJiYgaGFzRGVmYXVsdFZhbHVlKSB7XG4gICAgICByZXNGb3JPYmpIbmRsID0gZGVmYXVsdFZhbHVlO1xuICAgIH1cblxuICAgIGNvbnN0IGhhbmRsZUFzT2JqZWN0ID0gc2hvdWxkSGFuZGxlQXNPYmplY3QocmVzRm9yT2JqSG5kbCk7XG4gICAgY29uc3QgcmVzVHlwZSA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuYXBwbHkocmVzRm9yT2JqSG5kbCk7XG5cbiAgICBpZiAoXG4gICAgICBoYW5kbGVBc09iamVjdEluSTE4bkZvcm1hdCAmJlxuICAgICAgcmVzRm9yT2JqSG5kbCAmJlxuICAgICAgaGFuZGxlQXNPYmplY3QgJiZcbiAgICAgICFub09iamVjdC5pbmNsdWRlcyhyZXNUeXBlKSAmJlxuICAgICAgIShpc1N0cmluZyhqb2luQXJyYXlzKSAmJiBBcnJheS5pc0FycmF5KHJlc0Zvck9iakhuZGwpKVxuICAgICkge1xuICAgICAgaWYgKCFvcHQucmV0dXJuT2JqZWN0cyAmJiAhdGhpcy5vcHRpb25zLnJldHVybk9iamVjdHMpIHtcbiAgICAgICAgaWYgKCF0aGlzLm9wdGlvbnMucmV0dXJuZWRPYmplY3RIYW5kbGVyKSB7XG4gICAgICAgICAgdGhpcy5sb2dnZXIud2FybignYWNjZXNzaW5nIGFuIG9iamVjdCAtIGJ1dCByZXR1cm5PYmplY3RzIG9wdGlvbnMgaXMgbm90IGVuYWJsZWQhJyk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgciA9IHRoaXMub3B0aW9ucy5yZXR1cm5lZE9iamVjdEhhbmRsZXJcbiAgICAgICAgICA/IHRoaXMub3B0aW9ucy5yZXR1cm5lZE9iamVjdEhhbmRsZXIocmVzVXNlZEtleSwgcmVzRm9yT2JqSG5kbCwge1xuICAgICAgICAgICAgICAuLi5vcHQsXG4gICAgICAgICAgICAgIG5zOiBuYW1lc3BhY2VzLFxuICAgICAgICAgICAgfSlcbiAgICAgICAgICA6IGBrZXkgJyR7a2V5fSAoJHt0aGlzLmxhbmd1YWdlfSknIHJldHVybmVkIGFuIG9iamVjdCBpbnN0ZWFkIG9mIHN0cmluZy5gO1xuICAgICAgICBpZiAocmV0dXJuRGV0YWlscykge1xuICAgICAgICAgIHJlc29sdmVkLnJlcyA9IHI7XG4gICAgICAgICAgcmVzb2x2ZWQudXNlZFBhcmFtcyA9IHRoaXMuZ2V0VXNlZFBhcmFtc0RldGFpbHMob3B0KTtcbiAgICAgICAgICByZXR1cm4gcmVzb2x2ZWQ7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHI7XG4gICAgICB9XG5cbiAgICAgIC8vIGlmIHdlIGdvdCBhIHNlcGFyYXRvciB3ZSBsb29wIG92ZXIgY2hpbGRyZW4gLSBlbHNlIHdlIGp1c3QgcmV0dXJuIG9iamVjdCBhcyBpc1xuICAgICAgLy8gYXMgaGF2aW5nIGl0IHNldCB0byBmYWxzZSBtZWFucyBubyBoaWVyYXJjaHkgc28gbm8gbG9va3VwIGZvciBuZXN0ZWQgdmFsdWVzXG4gICAgICBpZiAoa2V5U2VwYXJhdG9yKSB7XG4gICAgICAgIGNvbnN0IHJlc1R5cGVJc0FycmF5ID0gQXJyYXkuaXNBcnJheShyZXNGb3JPYmpIbmRsKTtcbiAgICAgICAgY29uc3QgY29weSA9IHJlc1R5cGVJc0FycmF5ID8gW10gOiB7fTsgLy8gYXBwbHkgY2hpbGQgdHJhbnNsYXRpb24gb24gYSBjb3B5XG5cbiAgICAgICAgY29uc3QgbmV3S2V5VG9Vc2UgPSByZXNUeXBlSXNBcnJheSA/IHJlc0V4YWN0VXNlZEtleSA6IHJlc1VzZWRLZXk7XG4gICAgICAgIGZvciAoY29uc3QgbSBpbiByZXNGb3JPYmpIbmRsKSB7XG4gICAgICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChyZXNGb3JPYmpIbmRsLCBtKSkge1xuICAgICAgICAgICAgY29uc3QgZGVlcEtleSA9IGAke25ld0tleVRvVXNlfSR7a2V5U2VwYXJhdG9yfSR7bX1gO1xuICAgICAgICAgICAgaWYgKGhhc0RlZmF1bHRWYWx1ZSAmJiAhcmVzKSB7XG4gICAgICAgICAgICAgIGNvcHlbbV0gPSB0aGlzLnRyYW5zbGF0ZShkZWVwS2V5LCB7XG4gICAgICAgICAgICAgICAgLi4ub3B0LFxuICAgICAgICAgICAgICAgIGRlZmF1bHRWYWx1ZTogc2hvdWxkSGFuZGxlQXNPYmplY3QoZGVmYXVsdFZhbHVlKSA/IGRlZmF1bHRWYWx1ZVttXSA6IHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICAuLi57IGpvaW5BcnJheXM6IGZhbHNlLCBuczogbmFtZXNwYWNlcyB9LFxuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGNvcHlbbV0gPSB0aGlzLnRyYW5zbGF0ZShkZWVwS2V5LCB7XG4gICAgICAgICAgICAgICAgLi4ub3B0LFxuICAgICAgICAgICAgICAgIC4uLnsgam9pbkFycmF5czogZmFsc2UsIG5zOiBuYW1lc3BhY2VzIH0sXG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGNvcHlbbV0gPT09IGRlZXBLZXkpIGNvcHlbbV0gPSByZXNGb3JPYmpIbmRsW21dOyAvLyBpZiBub3RoaW5nIGZvdW5kIHVzZSBvcmlnaW5hbCB2YWx1ZSBhcyBmYWxsYmFja1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXMgPSBjb3B5O1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoaGFuZGxlQXNPYmplY3RJbkkxOG5Gb3JtYXQgJiYgaXNTdHJpbmcoam9pbkFycmF5cykgJiYgQXJyYXkuaXNBcnJheShyZXMpKSB7XG4gICAgICAvLyBhcnJheSBzcGVjaWFsIHRyZWF0bWVudFxuICAgICAgcmVzID0gcmVzLmpvaW4oam9pbkFycmF5cyk7XG4gICAgICBpZiAocmVzKSByZXMgPSB0aGlzLmV4dGVuZFRyYW5zbGF0aW9uKHJlcywga2V5cywgb3B0LCBsYXN0S2V5KTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gc3RyaW5nLCBlbXB0eSBvciBudWxsXG4gICAgICBsZXQgdXNlZERlZmF1bHQgPSBmYWxzZTtcbiAgICAgIGxldCB1c2VkS2V5ID0gZmFsc2U7XG5cbiAgICAgIC8vIGZhbGxiYWNrIHZhbHVlXG4gICAgICBpZiAoIXRoaXMuaXNWYWxpZExvb2t1cChyZXMpICYmIGhhc0RlZmF1bHRWYWx1ZSkge1xuICAgICAgICB1c2VkRGVmYXVsdCA9IHRydWU7XG4gICAgICAgIHJlcyA9IGRlZmF1bHRWYWx1ZTtcbiAgICAgIH1cbiAgICAgIGlmICghdGhpcy5pc1ZhbGlkTG9va3VwKHJlcykpIHtcbiAgICAgICAgdXNlZEtleSA9IHRydWU7XG4gICAgICAgIHJlcyA9IGtleTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgbWlzc2luZ0tleU5vVmFsdWVGYWxsYmFja1RvS2V5ID1cbiAgICAgICAgb3B0Lm1pc3NpbmdLZXlOb1ZhbHVlRmFsbGJhY2tUb0tleSB8fCB0aGlzLm9wdGlvbnMubWlzc2luZ0tleU5vVmFsdWVGYWxsYmFja1RvS2V5O1xuICAgICAgY29uc3QgcmVzRm9yTWlzc2luZyA9IG1pc3NpbmdLZXlOb1ZhbHVlRmFsbGJhY2tUb0tleSAmJiB1c2VkS2V5ID8gdW5kZWZpbmVkIDogcmVzO1xuXG4gICAgICAvLyBzYXZlIG1pc3NpbmdcbiAgICAgIGNvbnN0IHVwZGF0ZU1pc3NpbmcgPSBoYXNEZWZhdWx0VmFsdWUgJiYgZGVmYXVsdFZhbHVlICE9PSByZXMgJiYgdGhpcy5vcHRpb25zLnVwZGF0ZU1pc3Npbmc7XG4gICAgICBpZiAodXNlZEtleSB8fCB1c2VkRGVmYXVsdCB8fCB1cGRhdGVNaXNzaW5nKSB7XG4gICAgICAgIHRoaXMubG9nZ2VyLmxvZyhcbiAgICAgICAgICB1cGRhdGVNaXNzaW5nID8gJ3VwZGF0ZUtleScgOiAnbWlzc2luZ0tleScsXG4gICAgICAgICAgbG5nLFxuICAgICAgICAgIG5hbWVzcGFjZSxcbiAgICAgICAgICBuZWVkc1BsdXJhbEhhbmRsaW5nICYmICF1cGRhdGVNaXNzaW5nXG4gICAgICAgICAgICA/IGAke2tleX0ke3RoaXMucGx1cmFsUmVzb2x2ZXIuZ2V0U3VmZml4KGxuZywgb3B0LmNvdW50LCBvcHQpfWBcbiAgICAgICAgICAgIDoga2V5LFxuICAgICAgICAgIHVwZGF0ZU1pc3NpbmcgPyBkZWZhdWx0VmFsdWUgOiByZXMsXG4gICAgICAgICk7XG4gICAgICAgIGlmIChrZXlTZXBhcmF0b3IpIHtcbiAgICAgICAgICBjb25zdCBmayA9IHRoaXMucmVzb2x2ZShrZXksIHsgLi4ub3B0LCBrZXlTZXBhcmF0b3I6IGZhbHNlIH0pO1xuICAgICAgICAgIGlmIChmayAmJiBmay5yZXMpXG4gICAgICAgICAgICB0aGlzLmxvZ2dlci53YXJuKFxuICAgICAgICAgICAgICAnU2VlbXMgdGhlIGxvYWRlZCB0cmFuc2xhdGlvbnMgd2VyZSBpbiBmbGF0IEpTT04gZm9ybWF0IGluc3RlYWQgb2YgbmVzdGVkLiBFaXRoZXIgc2V0IGtleVNlcGFyYXRvcjogZmFsc2Ugb24gaW5pdCBvciBtYWtlIHN1cmUgeW91ciB0cmFuc2xhdGlvbnMgYXJlIHB1Ymxpc2hlZCBpbiBuZXN0ZWQgZm9ybWF0LicsXG4gICAgICAgICAgICApO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IGxuZ3MgPSBbXTtcbiAgICAgICAgY29uc3QgZmFsbGJhY2tMbmdzID0gdGhpcy5sYW5ndWFnZVV0aWxzLmdldEZhbGxiYWNrQ29kZXMoXG4gICAgICAgICAgdGhpcy5vcHRpb25zLmZhbGxiYWNrTG5nLFxuICAgICAgICAgIG9wdC5sbmcgfHwgdGhpcy5sYW5ndWFnZSxcbiAgICAgICAgKTtcbiAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5zYXZlTWlzc2luZ1RvID09PSAnZmFsbGJhY2snICYmIGZhbGxiYWNrTG5ncyAmJiBmYWxsYmFja0xuZ3NbMF0pIHtcbiAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGZhbGxiYWNrTG5ncy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgbG5ncy5wdXNoKGZhbGxiYWNrTG5nc1tpXSk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKHRoaXMub3B0aW9ucy5zYXZlTWlzc2luZ1RvID09PSAnYWxsJykge1xuICAgICAgICAgIGxuZ3MgPSB0aGlzLmxhbmd1YWdlVXRpbHMudG9SZXNvbHZlSGllcmFyY2h5KG9wdC5sbmcgfHwgdGhpcy5sYW5ndWFnZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbG5ncy5wdXNoKG9wdC5sbmcgfHwgdGhpcy5sYW5ndWFnZSk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBzZW5kID0gKGwsIGssIHNwZWNpZmljRGVmYXVsdFZhbHVlKSA9PiB7XG4gICAgICAgICAgY29uc3QgZGVmYXVsdEZvck1pc3NpbmcgPVxuICAgICAgICAgICAgaGFzRGVmYXVsdFZhbHVlICYmIHNwZWNpZmljRGVmYXVsdFZhbHVlICE9PSByZXMgPyBzcGVjaWZpY0RlZmF1bHRWYWx1ZSA6IHJlc0Zvck1pc3Npbmc7XG4gICAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5taXNzaW5nS2V5SGFuZGxlcikge1xuICAgICAgICAgICAgdGhpcy5vcHRpb25zLm1pc3NpbmdLZXlIYW5kbGVyKGwsIG5hbWVzcGFjZSwgaywgZGVmYXVsdEZvck1pc3NpbmcsIHVwZGF0ZU1pc3NpbmcsIG9wdCk7XG4gICAgICAgICAgfSBlbHNlIGlmICh0aGlzLmJhY2tlbmRDb25uZWN0b3I/LnNhdmVNaXNzaW5nKSB7XG4gICAgICAgICAgICB0aGlzLmJhY2tlbmRDb25uZWN0b3Iuc2F2ZU1pc3NpbmcoXG4gICAgICAgICAgICAgIGwsXG4gICAgICAgICAgICAgIG5hbWVzcGFjZSxcbiAgICAgICAgICAgICAgayxcbiAgICAgICAgICAgICAgZGVmYXVsdEZvck1pc3NpbmcsXG4gICAgICAgICAgICAgIHVwZGF0ZU1pc3NpbmcsXG4gICAgICAgICAgICAgIG9wdCxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHRoaXMuZW1pdCgnbWlzc2luZ0tleScsIGwsIG5hbWVzcGFjZSwgaywgcmVzKTtcbiAgICAgICAgfTtcblxuICAgICAgICBpZiAodGhpcy5vcHRpb25zLnNhdmVNaXNzaW5nKSB7XG4gICAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5zYXZlTWlzc2luZ1BsdXJhbHMgJiYgbmVlZHNQbHVyYWxIYW5kbGluZykge1xuICAgICAgICAgICAgbG5ncy5mb3JFYWNoKChsYW5ndWFnZSkgPT4ge1xuICAgICAgICAgICAgICBjb25zdCBzdWZmaXhlcyA9IHRoaXMucGx1cmFsUmVzb2x2ZXIuZ2V0U3VmZml4ZXMobGFuZ3VhZ2UsIG9wdCk7XG4gICAgICAgICAgICAgIGlmIChcbiAgICAgICAgICAgICAgICBuZWVkc1plcm9TdWZmaXhMb29rdXAgJiZcbiAgICAgICAgICAgICAgICBvcHRbYGRlZmF1bHRWYWx1ZSR7dGhpcy5vcHRpb25zLnBsdXJhbFNlcGFyYXRvcn16ZXJvYF0gJiZcbiAgICAgICAgICAgICAgICAhc3VmZml4ZXMuaW5jbHVkZXMoYCR7dGhpcy5vcHRpb25zLnBsdXJhbFNlcGFyYXRvcn16ZXJvYClcbiAgICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgICAgc3VmZml4ZXMucHVzaChgJHt0aGlzLm9wdGlvbnMucGx1cmFsU2VwYXJhdG9yfXplcm9gKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBzdWZmaXhlcy5mb3JFYWNoKChzdWZmaXgpID0+IHtcbiAgICAgICAgICAgICAgICBzZW5kKFtsYW5ndWFnZV0sIGtleSArIHN1ZmZpeCwgb3B0W2BkZWZhdWx0VmFsdWUke3N1ZmZpeH1gXSB8fCBkZWZhdWx0VmFsdWUpO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzZW5kKGxuZ3MsIGtleSwgZGVmYXVsdFZhbHVlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gZXh0ZW5kXG4gICAgICByZXMgPSB0aGlzLmV4dGVuZFRyYW5zbGF0aW9uKHJlcywga2V5cywgb3B0LCByZXNvbHZlZCwgbGFzdEtleSk7XG5cbiAgICAgIC8vIGFwcGVuZCBuYW1lc3BhY2UgaWYgc3RpbGwga2V5XG4gICAgICBpZiAodXNlZEtleSAmJiByZXMgPT09IGtleSAmJiB0aGlzLm9wdGlvbnMuYXBwZW5kTmFtZXNwYWNlVG9NaXNzaW5nS2V5KSB7XG4gICAgICAgIHJlcyA9IGAke25hbWVzcGFjZX0ke25zU2VwYXJhdG9yfSR7a2V5fWA7XG4gICAgICB9XG5cbiAgICAgIC8vIHBhcnNlTWlzc2luZ0tleUhhbmRsZXJcbiAgICAgIGlmICgodXNlZEtleSB8fCB1c2VkRGVmYXVsdCkgJiYgdGhpcy5vcHRpb25zLnBhcnNlTWlzc2luZ0tleUhhbmRsZXIpIHtcbiAgICAgICAgcmVzID0gdGhpcy5vcHRpb25zLnBhcnNlTWlzc2luZ0tleUhhbmRsZXIoXG4gICAgICAgICAgdGhpcy5vcHRpb25zLmFwcGVuZE5hbWVzcGFjZVRvTWlzc2luZ0tleSA/IGAke25hbWVzcGFjZX0ke25zU2VwYXJhdG9yfSR7a2V5fWAgOiBrZXksXG4gICAgICAgICAgdXNlZERlZmF1bHQgPyByZXMgOiB1bmRlZmluZWQsXG4gICAgICAgICAgb3B0LFxuICAgICAgICApO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIHJldHVyblxuICAgIGlmIChyZXR1cm5EZXRhaWxzKSB7XG4gICAgICByZXNvbHZlZC5yZXMgPSByZXM7XG4gICAgICByZXNvbHZlZC51c2VkUGFyYW1zID0gdGhpcy5nZXRVc2VkUGFyYW1zRGV0YWlscyhvcHQpO1xuICAgICAgcmV0dXJuIHJlc29sdmVkO1xuICAgIH1cbiAgICByZXR1cm4gcmVzO1xuICB9XG5cbiAgZXh0ZW5kVHJhbnNsYXRpb24ocmVzLCBrZXksIG9wdCwgcmVzb2x2ZWQsIGxhc3RLZXkpIHtcbiAgICBpZiAodGhpcy5pMThuRm9ybWF0Py5wYXJzZSkge1xuICAgICAgcmVzID0gdGhpcy5pMThuRm9ybWF0LnBhcnNlKFxuICAgICAgICByZXMsXG4gICAgICAgIHsgLi4udGhpcy5vcHRpb25zLmludGVycG9sYXRpb24uZGVmYXVsdFZhcmlhYmxlcywgLi4ub3B0IH0sXG4gICAgICAgIG9wdC5sbmcgfHwgdGhpcy5sYW5ndWFnZSB8fCByZXNvbHZlZC51c2VkTG5nLFxuICAgICAgICByZXNvbHZlZC51c2VkTlMsXG4gICAgICAgIHJlc29sdmVkLnVzZWRLZXksXG4gICAgICAgIHsgcmVzb2x2ZWQgfSxcbiAgICAgICk7XG4gICAgfSBlbHNlIGlmICghb3B0LnNraXBJbnRlcnBvbGF0aW9uKSB7XG4gICAgICAvLyBpMThuZXh0LnBhcnNpbmdcbiAgICAgIGlmIChvcHQuaW50ZXJwb2xhdGlvbilcbiAgICAgICAgdGhpcy5pbnRlcnBvbGF0b3IuaW5pdCh7XG4gICAgICAgICAgLi4ub3B0LFxuICAgICAgICAgIC4uLnsgaW50ZXJwb2xhdGlvbjogeyAuLi50aGlzLm9wdGlvbnMuaW50ZXJwb2xhdGlvbiwgLi4ub3B0LmludGVycG9sYXRpb24gfSB9LFxuICAgICAgICB9KTtcbiAgICAgIGNvbnN0IHNraXBPblZhcmlhYmxlcyA9XG4gICAgICAgIGlzU3RyaW5nKHJlcykgJiZcbiAgICAgICAgKG9wdD8uaW50ZXJwb2xhdGlvbj8uc2tpcE9uVmFyaWFibGVzICE9PSB1bmRlZmluZWRcbiAgICAgICAgICA/IG9wdC5pbnRlcnBvbGF0aW9uLnNraXBPblZhcmlhYmxlc1xuICAgICAgICAgIDogdGhpcy5vcHRpb25zLmludGVycG9sYXRpb24uc2tpcE9uVmFyaWFibGVzKTtcbiAgICAgIGxldCBuZXN0QmVmO1xuICAgICAgaWYgKHNraXBPblZhcmlhYmxlcykge1xuICAgICAgICBjb25zdCBuYiA9IHJlcy5tYXRjaCh0aGlzLmludGVycG9sYXRvci5uZXN0aW5nUmVnZXhwKTtcbiAgICAgICAgLy8gaGFzIG5lc3RpbmcgYWZ0YmVmb3JlZXIgaW50ZXJwb2xhdGlvblxuICAgICAgICBuZXN0QmVmID0gbmIgJiYgbmIubGVuZ3RoO1xuICAgICAgfVxuXG4gICAgICAvLyBpbnRlcnBvbGF0ZVxuICAgICAgbGV0IGRhdGEgPSBvcHQucmVwbGFjZSAmJiAhaXNTdHJpbmcob3B0LnJlcGxhY2UpID8gb3B0LnJlcGxhY2UgOiBvcHQ7XG4gICAgICBpZiAodGhpcy5vcHRpb25zLmludGVycG9sYXRpb24uZGVmYXVsdFZhcmlhYmxlcylcbiAgICAgICAgZGF0YSA9IHsgLi4udGhpcy5vcHRpb25zLmludGVycG9sYXRpb24uZGVmYXVsdFZhcmlhYmxlcywgLi4uZGF0YSB9O1xuICAgICAgcmVzID0gdGhpcy5pbnRlcnBvbGF0b3IuaW50ZXJwb2xhdGUoXG4gICAgICAgIHJlcyxcbiAgICAgICAgZGF0YSxcbiAgICAgICAgb3B0LmxuZyB8fCB0aGlzLmxhbmd1YWdlIHx8IHJlc29sdmVkLnVzZWRMbmcsXG4gICAgICAgIG9wdCxcbiAgICAgICk7XG5cbiAgICAgIC8vIG5lc3RpbmdcbiAgICAgIGlmIChza2lwT25WYXJpYWJsZXMpIHtcbiAgICAgICAgY29uc3QgbmEgPSByZXMubWF0Y2godGhpcy5pbnRlcnBvbGF0b3IubmVzdGluZ1JlZ2V4cCk7XG4gICAgICAgIC8vIGhhcyBuZXN0aW5nIGFmdGVyIGludGVycG9sYXRpb25cbiAgICAgICAgY29uc3QgbmVzdEFmdCA9IG5hICYmIG5hLmxlbmd0aDtcbiAgICAgICAgaWYgKG5lc3RCZWYgPCBuZXN0QWZ0KSBvcHQubmVzdCA9IGZhbHNlO1xuICAgICAgfVxuICAgICAgaWYgKCFvcHQubG5nICYmIHJlc29sdmVkICYmIHJlc29sdmVkLnJlcykgb3B0LmxuZyA9IHRoaXMubGFuZ3VhZ2UgfHwgcmVzb2x2ZWQudXNlZExuZztcbiAgICAgIGlmIChvcHQubmVzdCAhPT0gZmFsc2UpXG4gICAgICAgIHJlcyA9IHRoaXMuaW50ZXJwb2xhdG9yLm5lc3QoXG4gICAgICAgICAgcmVzLFxuICAgICAgICAgICguLi5hcmdzKSA9PiB7XG4gICAgICAgICAgICBpZiAobGFzdEtleT8uWzBdID09PSBhcmdzWzBdICYmICFvcHQuY29udGV4dCkge1xuICAgICAgICAgICAgICB0aGlzLmxvZ2dlci53YXJuKFxuICAgICAgICAgICAgICAgIGBJdCBzZWVtcyB5b3UgYXJlIG5lc3RpbmcgcmVjdXJzaXZlbHkga2V5OiAke2FyZ3NbMF19IGluIGtleTogJHtrZXlbMF19YCxcbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhpcy50cmFuc2xhdGUoLi4uYXJncywga2V5KTtcbiAgICAgICAgICB9LFxuICAgICAgICAgIG9wdCxcbiAgICAgICAgKTtcblxuICAgICAgaWYgKG9wdC5pbnRlcnBvbGF0aW9uKSB0aGlzLmludGVycG9sYXRvci5yZXNldCgpO1xuICAgIH1cblxuICAgIC8vIHBvc3QgcHJvY2Vzc1xuICAgIGNvbnN0IHBvc3RQcm9jZXNzID0gb3B0LnBvc3RQcm9jZXNzIHx8IHRoaXMub3B0aW9ucy5wb3N0UHJvY2VzcztcbiAgICBjb25zdCBwb3N0UHJvY2Vzc29yTmFtZXMgPSBpc1N0cmluZyhwb3N0UHJvY2VzcykgPyBbcG9zdFByb2Nlc3NdIDogcG9zdFByb2Nlc3M7XG5cbiAgICBpZiAocmVzICE9IG51bGwgJiYgcG9zdFByb2Nlc3Nvck5hbWVzPy5sZW5ndGggJiYgb3B0LmFwcGx5UG9zdFByb2Nlc3NvciAhPT0gZmFsc2UpIHtcbiAgICAgIHJlcyA9IHBvc3RQcm9jZXNzb3IuaGFuZGxlKFxuICAgICAgICBwb3N0UHJvY2Vzc29yTmFtZXMsXG4gICAgICAgIHJlcyxcbiAgICAgICAga2V5LFxuICAgICAgICB0aGlzLm9wdGlvbnMgJiYgdGhpcy5vcHRpb25zLnBvc3RQcm9jZXNzUGFzc1Jlc29sdmVkXG4gICAgICAgICAgPyB7XG4gICAgICAgICAgICAgIGkxOG5SZXNvbHZlZDogeyAuLi5yZXNvbHZlZCwgdXNlZFBhcmFtczogdGhpcy5nZXRVc2VkUGFyYW1zRGV0YWlscyhvcHQpIH0sXG4gICAgICAgICAgICAgIC4uLm9wdCxcbiAgICAgICAgICAgIH1cbiAgICAgICAgICA6IG9wdCxcbiAgICAgICAgdGhpcyxcbiAgICAgICk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlcztcbiAgfVxuXG4gIHJlc29sdmUoa2V5cywgb3B0ID0ge30pIHtcbiAgICBsZXQgZm91bmQ7XG4gICAgbGV0IHVzZWRLZXk7IC8vIHBsYWluIGtleVxuICAgIGxldCBleGFjdFVzZWRLZXk7IC8vIGtleSB3aXRoIGNvbnRleHQgLyBwbHVyYWxcbiAgICBsZXQgdXNlZExuZztcbiAgICBsZXQgdXNlZE5TO1xuXG4gICAgaWYgKGlzU3RyaW5nKGtleXMpKSBrZXlzID0gW2tleXNdO1xuICAgIGlmIChBcnJheS5pc0FycmF5KGtleXMpKVxuICAgICAga2V5cyA9IGtleXMubWFwKChrKSA9PlxuICAgICAgICB0eXBlb2YgayA9PT0gJ2Z1bmN0aW9uJyA/IGtleXNGcm9tU2VsZWN0b3IoaywgeyAuLi50aGlzLm9wdGlvbnMsIC4uLm9wdCB9KSA6IGssXG4gICAgICApO1xuXG4gICAgLy8gZm9yRWFjaCBwb3NzaWJsZSBrZXlcbiAgICBrZXlzLmZvckVhY2goKGspID0+IHtcbiAgICAgIGlmICh0aGlzLmlzVmFsaWRMb29rdXAoZm91bmQpKSByZXR1cm47XG4gICAgICBjb25zdCBleHRyYWN0ZWQgPSB0aGlzLmV4dHJhY3RGcm9tS2V5KGssIG9wdCk7XG4gICAgICBjb25zdCBrZXkgPSBleHRyYWN0ZWQua2V5O1xuICAgICAgdXNlZEtleSA9IGtleTtcbiAgICAgIGxldCBuYW1lc3BhY2VzID0gZXh0cmFjdGVkLm5hbWVzcGFjZXM7XG4gICAgICBpZiAodGhpcy5vcHRpb25zLmZhbGxiYWNrTlMpIG5hbWVzcGFjZXMgPSBuYW1lc3BhY2VzLmNvbmNhdCh0aGlzLm9wdGlvbnMuZmFsbGJhY2tOUyk7XG5cbiAgICAgIGNvbnN0IG5lZWRzUGx1cmFsSGFuZGxpbmcgPSBvcHQuY291bnQgIT09IHVuZGVmaW5lZCAmJiAhaXNTdHJpbmcob3B0LmNvdW50KTtcbiAgICAgIGNvbnN0IG5lZWRzWmVyb1N1ZmZpeExvb2t1cCA9IG5lZWRzUGx1cmFsSGFuZGxpbmcgJiYgIW9wdC5vcmRpbmFsICYmIG9wdC5jb3VudCA9PT0gMDtcbiAgICAgIGNvbnN0IG5lZWRzQ29udGV4dEhhbmRsaW5nID1cbiAgICAgICAgb3B0LmNvbnRleHQgIT09IHVuZGVmaW5lZCAmJlxuICAgICAgICAoaXNTdHJpbmcob3B0LmNvbnRleHQpIHx8IHR5cGVvZiBvcHQuY29udGV4dCA9PT0gJ251bWJlcicpICYmXG4gICAgICAgIG9wdC5jb250ZXh0ICE9PSAnJztcblxuICAgICAgY29uc3QgY29kZXMgPSBvcHQubG5nc1xuICAgICAgICA/IG9wdC5sbmdzXG4gICAgICAgIDogdGhpcy5sYW5ndWFnZVV0aWxzLnRvUmVzb2x2ZUhpZXJhcmNoeShvcHQubG5nIHx8IHRoaXMubGFuZ3VhZ2UsIG9wdC5mYWxsYmFja0xuZyk7XG5cbiAgICAgIG5hbWVzcGFjZXMuZm9yRWFjaCgobnMpID0+IHtcbiAgICAgICAgaWYgKHRoaXMuaXNWYWxpZExvb2t1cChmb3VuZCkpIHJldHVybjtcbiAgICAgICAgdXNlZE5TID0gbnM7XG5cbiAgICAgICAgaWYgKFxuICAgICAgICAgICF0aGlzLmNoZWNrZWRMb2FkZWRGb3JbYCR7Y29kZXNbMF19LSR7bnN9YF0gJiZcbiAgICAgICAgICB0aGlzLnV0aWxzPy5oYXNMb2FkZWROYW1lc3BhY2UgJiZcbiAgICAgICAgICAhdGhpcy51dGlscz8uaGFzTG9hZGVkTmFtZXNwYWNlKHVzZWROUylcbiAgICAgICAgKSB7XG4gICAgICAgICAgdGhpcy5jaGVja2VkTG9hZGVkRm9yW2Ake2NvZGVzWzBdfS0ke25zfWBdID0gdHJ1ZTtcbiAgICAgICAgICB0aGlzLmxvZ2dlci53YXJuKFxuICAgICAgICAgICAgYGtleSBcIiR7dXNlZEtleX1cIiBmb3IgbGFuZ3VhZ2VzIFwiJHtjb2Rlcy5qb2luKFxuICAgICAgICAgICAgICAnLCAnLFxuICAgICAgICAgICAgKX1cIiB3b24ndCBnZXQgcmVzb2x2ZWQgYXMgbmFtZXNwYWNlIFwiJHt1c2VkTlN9XCIgd2FzIG5vdCB5ZXQgbG9hZGVkYCxcbiAgICAgICAgICAgICdUaGlzIG1lYW5zIHNvbWV0aGluZyBJUyBXUk9ORyBpbiB5b3VyIHNldHVwLiBZb3UgYWNjZXNzIHRoZSB0IGZ1bmN0aW9uIGJlZm9yZSBpMThuZXh0LmluaXQgLyBpMThuZXh0LmxvYWROYW1lc3BhY2UgLyBpMThuZXh0LmNoYW5nZUxhbmd1YWdlIHdhcyBkb25lLiBXYWl0IGZvciB0aGUgY2FsbGJhY2sgb3IgUHJvbWlzZSB0byByZXNvbHZlIGJlZm9yZSBhY2Nlc3NpbmcgaXQhISEnLFxuICAgICAgICAgICk7XG4gICAgICAgIH1cblxuICAgICAgICBjb2Rlcy5mb3JFYWNoKChjb2RlKSA9PiB7XG4gICAgICAgICAgaWYgKHRoaXMuaXNWYWxpZExvb2t1cChmb3VuZCkpIHJldHVybjtcbiAgICAgICAgICB1c2VkTG5nID0gY29kZTtcblxuICAgICAgICAgIGNvbnN0IGZpbmFsS2V5cyA9IFtrZXldO1xuXG4gICAgICAgICAgaWYgKHRoaXMuaTE4bkZvcm1hdD8uYWRkTG9va3VwS2V5cykge1xuICAgICAgICAgICAgdGhpcy5pMThuRm9ybWF0LmFkZExvb2t1cEtleXMoZmluYWxLZXlzLCBrZXksIGNvZGUsIG5zLCBvcHQpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsZXQgcGx1cmFsU3VmZml4O1xuICAgICAgICAgICAgaWYgKG5lZWRzUGx1cmFsSGFuZGxpbmcpXG4gICAgICAgICAgICAgIHBsdXJhbFN1ZmZpeCA9IHRoaXMucGx1cmFsUmVzb2x2ZXIuZ2V0U3VmZml4KGNvZGUsIG9wdC5jb3VudCwgb3B0KTtcbiAgICAgICAgICAgIGNvbnN0IHplcm9TdWZmaXggPSBgJHt0aGlzLm9wdGlvbnMucGx1cmFsU2VwYXJhdG9yfXplcm9gO1xuICAgICAgICAgICAgY29uc3Qgb3JkaW5hbFByZWZpeCA9IGAke3RoaXMub3B0aW9ucy5wbHVyYWxTZXBhcmF0b3J9b3JkaW5hbCR7dGhpcy5vcHRpb25zLnBsdXJhbFNlcGFyYXRvcn1gO1xuICAgICAgICAgICAgLy8gZ2V0IGtleSBmb3IgcGx1cmFsIGlmIG5lZWRlZFxuICAgICAgICAgICAgaWYgKG5lZWRzUGx1cmFsSGFuZGxpbmcpIHtcbiAgICAgICAgICAgICAgaWYgKG9wdC5vcmRpbmFsICYmIHBsdXJhbFN1ZmZpeC5zdGFydHNXaXRoKG9yZGluYWxQcmVmaXgpKSB7XG4gICAgICAgICAgICAgICAgZmluYWxLZXlzLnB1c2goXG4gICAgICAgICAgICAgICAgICBrZXkgKyBwbHVyYWxTdWZmaXgucmVwbGFjZShvcmRpbmFsUHJlZml4LCB0aGlzLm9wdGlvbnMucGx1cmFsU2VwYXJhdG9yKSxcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGZpbmFsS2V5cy5wdXNoKGtleSArIHBsdXJhbFN1ZmZpeCk7XG4gICAgICAgICAgICAgIGlmIChuZWVkc1plcm9TdWZmaXhMb29rdXApIHtcbiAgICAgICAgICAgICAgICBmaW5hbEtleXMucHVzaChrZXkgKyB6ZXJvU3VmZml4KTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBnZXQga2V5IGZvciBjb250ZXh0IGlmIG5lZWRlZFxuICAgICAgICAgICAgaWYgKG5lZWRzQ29udGV4dEhhbmRsaW5nKSB7XG4gICAgICAgICAgICAgIGNvbnN0IGNvbnRleHRLZXkgPSBgJHtrZXl9JHt0aGlzLm9wdGlvbnMuY29udGV4dFNlcGFyYXRvciB8fCAnXyd9JHtvcHQuY29udGV4dH1gO1xuICAgICAgICAgICAgICBmaW5hbEtleXMucHVzaChjb250ZXh0S2V5KTtcblxuICAgICAgICAgICAgICAvLyBnZXQga2V5IGZvciBjb250ZXh0ICsgcGx1cmFsIGlmIG5lZWRlZFxuICAgICAgICAgICAgICBpZiAobmVlZHNQbHVyYWxIYW5kbGluZykge1xuICAgICAgICAgICAgICAgIGlmIChvcHQub3JkaW5hbCAmJiBwbHVyYWxTdWZmaXguc3RhcnRzV2l0aChvcmRpbmFsUHJlZml4KSkge1xuICAgICAgICAgICAgICAgICAgZmluYWxLZXlzLnB1c2goXG4gICAgICAgICAgICAgICAgICAgIGNvbnRleHRLZXkgKyBwbHVyYWxTdWZmaXgucmVwbGFjZShvcmRpbmFsUHJlZml4LCB0aGlzLm9wdGlvbnMucGx1cmFsU2VwYXJhdG9yKSxcbiAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGZpbmFsS2V5cy5wdXNoKGNvbnRleHRLZXkgKyBwbHVyYWxTdWZmaXgpO1xuICAgICAgICAgICAgICAgIGlmIChuZWVkc1plcm9TdWZmaXhMb29rdXApIHtcbiAgICAgICAgICAgICAgICAgIGZpbmFsS2V5cy5wdXNoKGNvbnRleHRLZXkgKyB6ZXJvU3VmZml4KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBpdGVyYXRlIG92ZXIgZmluYWxLZXlzIHN0YXJ0aW5nIHdpdGggbW9zdCBzcGVjaWZpYyBwbHVyYWxrZXkgKC0+IGNvbnRleHRrZXkgb25seSkgLT4gc2luZ3VsYXJrZXkgb25seVxuICAgICAgICAgIGxldCBwb3NzaWJsZUtleTtcbiAgICAgICAgICB3aGlsZSAoKHBvc3NpYmxlS2V5ID0gZmluYWxLZXlzLnBvcCgpKSkge1xuICAgICAgICAgICAgaWYgKCF0aGlzLmlzVmFsaWRMb29rdXAoZm91bmQpKSB7XG4gICAgICAgICAgICAgIGV4YWN0VXNlZEtleSA9IHBvc3NpYmxlS2V5O1xuICAgICAgICAgICAgICBmb3VuZCA9IHRoaXMuZ2V0UmVzb3VyY2UoY29kZSwgbnMsIHBvc3NpYmxlS2V5LCBvcHQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIHJldHVybiB7IHJlczogZm91bmQsIHVzZWRLZXksIGV4YWN0VXNlZEtleSwgdXNlZExuZywgdXNlZE5TIH07XG4gIH1cblxuICBpc1ZhbGlkTG9va3VwKHJlcykge1xuICAgIHJldHVybiAoXG4gICAgICByZXMgIT09IHVuZGVmaW5lZCAmJlxuICAgICAgISghdGhpcy5vcHRpb25zLnJldHVybk51bGwgJiYgcmVzID09PSBudWxsKSAmJlxuICAgICAgISghdGhpcy5vcHRpb25zLnJldHVybkVtcHR5U3RyaW5nICYmIHJlcyA9PT0gJycpXG4gICAgKTtcbiAgfVxuXG4gIGdldFJlc291cmNlKGNvZGUsIG5zLCBrZXksIG9wdGlvbnMgPSB7fSkge1xuICAgIGlmICh0aGlzLmkxOG5Gb3JtYXQ/LmdldFJlc291cmNlKSByZXR1cm4gdGhpcy5pMThuRm9ybWF0LmdldFJlc291cmNlKGNvZGUsIG5zLCBrZXksIG9wdGlvbnMpO1xuICAgIHJldHVybiB0aGlzLnJlc291cmNlU3RvcmUuZ2V0UmVzb3VyY2UoY29kZSwgbnMsIGtleSwgb3B0aW9ucyk7XG4gIH1cblxuICBnZXRVc2VkUGFyYW1zRGV0YWlscyhvcHRpb25zID0ge30pIHtcbiAgICAvLyB3ZSBuZWVkIHRvIHJlbWVtYmVyIHRvIGV4dGVuZCB0aGlzIGFycmF5IHdoZW5ldmVyIG5ldyBvcHRpb24gcHJvcGVydGllcyBhcmUgYWRkZWRcbiAgICBjb25zdCBvcHRpb25zS2V5cyA9IFtcbiAgICAgICdkZWZhdWx0VmFsdWUnLFxuICAgICAgJ29yZGluYWwnLFxuICAgICAgJ2NvbnRleHQnLFxuICAgICAgJ3JlcGxhY2UnLFxuICAgICAgJ2xuZycsXG4gICAgICAnbG5ncycsXG4gICAgICAnZmFsbGJhY2tMbmcnLFxuICAgICAgJ25zJyxcbiAgICAgICdrZXlTZXBhcmF0b3InLFxuICAgICAgJ25zU2VwYXJhdG9yJyxcbiAgICAgICdyZXR1cm5PYmplY3RzJyxcbiAgICAgICdyZXR1cm5EZXRhaWxzJyxcbiAgICAgICdqb2luQXJyYXlzJyxcbiAgICAgICdwb3N0UHJvY2VzcycsXG4gICAgICAnaW50ZXJwb2xhdGlvbicsXG4gICAgXTtcblxuICAgIGNvbnN0IHVzZU9wdGlvbnNSZXBsYWNlRm9yRGF0YSA9IG9wdGlvbnMucmVwbGFjZSAmJiAhaXNTdHJpbmcob3B0aW9ucy5yZXBsYWNlKTtcbiAgICBsZXQgZGF0YSA9IHVzZU9wdGlvbnNSZXBsYWNlRm9yRGF0YSA/IG9wdGlvbnMucmVwbGFjZSA6IG9wdGlvbnM7XG4gICAgaWYgKHVzZU9wdGlvbnNSZXBsYWNlRm9yRGF0YSAmJiB0eXBlb2Ygb3B0aW9ucy5jb3VudCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIGRhdGEuY291bnQgPSBvcHRpb25zLmNvdW50O1xuICAgIH1cblxuICAgIGlmICh0aGlzLm9wdGlvbnMuaW50ZXJwb2xhdGlvbi5kZWZhdWx0VmFyaWFibGVzKSB7XG4gICAgICBkYXRhID0geyAuLi50aGlzLm9wdGlvbnMuaW50ZXJwb2xhdGlvbi5kZWZhdWx0VmFyaWFibGVzLCAuLi5kYXRhIH07XG4gICAgfVxuXG4gICAgLy8gYXZvaWQgcmVwb3J0aW5nIG9wdGlvbnMgKGV4ZWNwdCBjb3VudCkgYXMgdXNlZFBhcmFtc1xuICAgIGlmICghdXNlT3B0aW9uc1JlcGxhY2VGb3JEYXRhKSB7XG4gICAgICBkYXRhID0geyAuLi5kYXRhIH07XG4gICAgICBmb3IgKGNvbnN0IGtleSBvZiBvcHRpb25zS2V5cykge1xuICAgICAgICBkZWxldGUgZGF0YVtrZXldO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBkYXRhO1xuICB9XG5cbiAgc3RhdGljIGhhc0RlZmF1bHRWYWx1ZShvcHRpb25zKSB7XG4gICAgY29uc3QgcHJlZml4ID0gJ2RlZmF1bHRWYWx1ZSc7XG5cbiAgICBmb3IgKGNvbnN0IG9wdGlvbiBpbiBvcHRpb25zKSB7XG4gICAgICBpZiAoXG4gICAgICAgIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvcHRpb25zLCBvcHRpb24pICYmXG4gICAgICAgIG9wdGlvbi5zdGFydHNXaXRoKHByZWZpeCkgJiZcbiAgICAgICAgdW5kZWZpbmVkICE9PSBvcHRpb25zW29wdGlvbl1cbiAgICAgICkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgVHJhbnNsYXRvcjtcbiIsImltcG9ydCBiYXNlTG9nZ2VyIGZyb20gJy4vbG9nZ2VyLmpzJztcbmltcG9ydCB7IGdldENsZWFuZWRDb2RlLCBpc1N0cmluZyB9IGZyb20gJy4vdXRpbHMuanMnO1xuXG5jbGFzcyBMYW5ndWFnZVV0aWwge1xuICBjb25zdHJ1Y3RvcihvcHRpb25zKSB7XG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcblxuICAgIHRoaXMuc3VwcG9ydGVkTG5ncyA9IHRoaXMub3B0aW9ucy5zdXBwb3J0ZWRMbmdzIHx8IGZhbHNlO1xuICAgIHRoaXMubG9nZ2VyID0gYmFzZUxvZ2dlci5jcmVhdGUoJ2xhbmd1YWdlVXRpbHMnKTtcbiAgfVxuXG4gIGdldFNjcmlwdFBhcnRGcm9tQ29kZShjb2RlKSB7XG4gICAgY29kZSA9IGdldENsZWFuZWRDb2RlKGNvZGUpO1xuICAgIGlmICghY29kZSB8fCAhY29kZS5pbmNsdWRlcygnLScpKSByZXR1cm4gbnVsbDtcblxuICAgIGNvbnN0IHAgPSBjb2RlLnNwbGl0KCctJyk7XG4gICAgaWYgKHAubGVuZ3RoID09PSAyKSByZXR1cm4gbnVsbDtcbiAgICBwLnBvcCgpO1xuICAgIGlmIChwW3AubGVuZ3RoIC0gMV0udG9Mb3dlckNhc2UoKSA9PT0gJ3gnKSByZXR1cm4gbnVsbDtcbiAgICByZXR1cm4gdGhpcy5mb3JtYXRMYW5ndWFnZUNvZGUocC5qb2luKCctJykpO1xuICB9XG5cbiAgZ2V0TGFuZ3VhZ2VQYXJ0RnJvbUNvZGUoY29kZSkge1xuICAgIGNvZGUgPSBnZXRDbGVhbmVkQ29kZShjb2RlKTtcbiAgICBpZiAoIWNvZGUgfHwgIWNvZGUuaW5jbHVkZXMoJy0nKSkgcmV0dXJuIGNvZGU7XG5cbiAgICBjb25zdCBwID0gY29kZS5zcGxpdCgnLScpO1xuICAgIHJldHVybiB0aGlzLmZvcm1hdExhbmd1YWdlQ29kZShwWzBdKTtcbiAgfVxuXG4gIGZvcm1hdExhbmd1YWdlQ29kZShjb2RlKSB7XG4gICAgLy8gaHR0cDovL3d3dy5pYW5hLm9yZy9hc3NpZ25tZW50cy9sYW5ndWFnZS10YWdzL2xhbmd1YWdlLXRhZ3MueGh0bWxcbiAgICBpZiAoaXNTdHJpbmcoY29kZSkgJiYgY29kZS5pbmNsdWRlcygnLScpKSB7XG4gICAgICBsZXQgZm9ybWF0dGVkQ29kZTtcbiAgICAgIHRyeSB7XG4gICAgICAgIGZvcm1hdHRlZENvZGUgPSBJbnRsLmdldENhbm9uaWNhbExvY2FsZXMoY29kZSlbMF07XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIC8qIGZhbGwgdGhyb3VnaCAqL1xuICAgICAgfVxuICAgICAgaWYgKGZvcm1hdHRlZENvZGUgJiYgdGhpcy5vcHRpb25zLmxvd2VyQ2FzZUxuZykge1xuICAgICAgICBmb3JtYXR0ZWRDb2RlID0gZm9ybWF0dGVkQ29kZS50b0xvd2VyQ2FzZSgpO1xuICAgICAgfVxuICAgICAgaWYgKGZvcm1hdHRlZENvZGUpIHJldHVybiBmb3JtYXR0ZWRDb2RlO1xuXG4gICAgICBpZiAodGhpcy5vcHRpb25zLmxvd2VyQ2FzZUxuZykge1xuICAgICAgICByZXR1cm4gY29kZS50b0xvd2VyQ2FzZSgpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gY29kZTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5vcHRpb25zLmNsZWFuQ29kZSB8fCB0aGlzLm9wdGlvbnMubG93ZXJDYXNlTG5nID8gY29kZS50b0xvd2VyQ2FzZSgpIDogY29kZTtcbiAgfVxuXG4gIGlzU3VwcG9ydGVkQ29kZShjb2RlKSB7XG4gICAgaWYgKHRoaXMub3B0aW9ucy5sb2FkID09PSAnbGFuZ3VhZ2VPbmx5JyB8fCB0aGlzLm9wdGlvbnMubm9uRXhwbGljaXRTdXBwb3J0ZWRMbmdzKSB7XG4gICAgICBjb2RlID0gdGhpcy5nZXRMYW5ndWFnZVBhcnRGcm9tQ29kZShjb2RlKTtcbiAgICB9XG4gICAgcmV0dXJuICF0aGlzLnN1cHBvcnRlZExuZ3MgfHwgIXRoaXMuc3VwcG9ydGVkTG5ncy5sZW5ndGggfHwgdGhpcy5zdXBwb3J0ZWRMbmdzLmluY2x1ZGVzKGNvZGUpO1xuICB9XG5cbiAgZ2V0QmVzdE1hdGNoRnJvbUNvZGVzKGNvZGVzKSB7XG4gICAgaWYgKCFjb2RlcykgcmV0dXJuIG51bGw7XG5cbiAgICBsZXQgZm91bmQ7XG5cbiAgICAvLyBwaWNrIGZpcnN0IHN1cHBvcnRlZCBjb2RlIG9yIGlmIG5vIHJlc3RyaWN0aW9uIHBpY2sgdGhlIGZpcnN0IG9uZSAoaGlnaGVzdCBwcmlvKVxuICAgIGNvZGVzLmZvckVhY2goKGNvZGUpID0+IHtcbiAgICAgIGlmIChmb3VuZCkgcmV0dXJuO1xuICAgICAgY29uc3QgY2xlYW5lZExuZyA9IHRoaXMuZm9ybWF0TGFuZ3VhZ2VDb2RlKGNvZGUpO1xuICAgICAgaWYgKCF0aGlzLm9wdGlvbnMuc3VwcG9ydGVkTG5ncyB8fCB0aGlzLmlzU3VwcG9ydGVkQ29kZShjbGVhbmVkTG5nKSkgZm91bmQgPSBjbGVhbmVkTG5nO1xuICAgIH0pO1xuXG4gICAgLy8gaWYgd2UgZ290IG5vIG1hdGNoIGluIHN1cHBvcnRlZExuZ3MgeWV0IC0gY2hlY2sgZm9yIHNpbWlsYXIgbG9jYWxlc1xuICAgIC8vIGZpcnN0ICBkZS1DSCAtLT4gZGVcbiAgICAvLyBzZWNvbmQgZGUtQ0ggLS0+IGRlLURFXG4gICAgaWYgKCFmb3VuZCAmJiB0aGlzLm9wdGlvbnMuc3VwcG9ydGVkTG5ncykge1xuICAgICAgY29kZXMuZm9yRWFjaCgoY29kZSkgPT4ge1xuICAgICAgICBpZiAoZm91bmQpIHJldHVybjtcblxuICAgICAgICBjb25zdCBsbmdTY09ubHkgPSB0aGlzLmdldFNjcmlwdFBhcnRGcm9tQ29kZShjb2RlKTtcblxuICAgICAgICBpZiAodGhpcy5pc1N1cHBvcnRlZENvZGUobG5nU2NPbmx5KSkgcmV0dXJuIChmb3VuZCA9IGxuZ1NjT25seSk7XG5cbiAgICAgICAgY29uc3QgbG5nT25seSA9IHRoaXMuZ2V0TGFuZ3VhZ2VQYXJ0RnJvbUNvZGUoY29kZSk7XG5cbiAgICAgICAgaWYgKHRoaXMuaXNTdXBwb3J0ZWRDb2RlKGxuZ09ubHkpKSByZXR1cm4gKGZvdW5kID0gbG5nT25seSk7XG5cbiAgICAgICAgZm91bmQgPSB0aGlzLm9wdGlvbnMuc3VwcG9ydGVkTG5ncy5maW5kKChzdXBwb3J0ZWRMbmcpID0+IHtcbiAgICAgICAgICBpZiAoc3VwcG9ydGVkTG5nID09PSBsbmdPbmx5KSByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICBpZiAoIXN1cHBvcnRlZExuZy5pbmNsdWRlcygnLScpICYmICFsbmdPbmx5LmluY2x1ZGVzKCctJykpIHJldHVybiBmYWxzZTtcbiAgICAgICAgICBpZiAoXG4gICAgICAgICAgICBzdXBwb3J0ZWRMbmcuaW5jbHVkZXMoJy0nKSAmJlxuICAgICAgICAgICAgIWxuZ09ubHkuaW5jbHVkZXMoJy0nKSAmJlxuICAgICAgICAgICAgc3VwcG9ydGVkTG5nLnNsaWNlKDAsIHN1cHBvcnRlZExuZy5pbmRleE9mKCctJykpID09PSBsbmdPbmx5XG4gICAgICAgICAgKVxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgaWYgKHN1cHBvcnRlZExuZy5zdGFydHNXaXRoKGxuZ09ubHkpICYmIGxuZ09ubHkubGVuZ3RoID4gMSkgcmV0dXJuIHRydWU7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH1cbiAgICAvLyBpZiBub3RoaW5nIGZvdW5kLCB1c2UgZmFsbGJhY2tMbmdcbiAgICBpZiAoIWZvdW5kKSBmb3VuZCA9IHRoaXMuZ2V0RmFsbGJhY2tDb2Rlcyh0aGlzLm9wdGlvbnMuZmFsbGJhY2tMbmcpWzBdO1xuXG4gICAgcmV0dXJuIGZvdW5kO1xuICB9XG5cbiAgZ2V0RmFsbGJhY2tDb2RlcyhmYWxsYmFja3MsIGNvZGUpIHtcbiAgICBpZiAoIWZhbGxiYWNrcykgcmV0dXJuIFtdO1xuICAgIGlmICh0eXBlb2YgZmFsbGJhY2tzID09PSAnZnVuY3Rpb24nKSBmYWxsYmFja3MgPSBmYWxsYmFja3MoY29kZSk7XG4gICAgaWYgKGlzU3RyaW5nKGZhbGxiYWNrcykpIGZhbGxiYWNrcyA9IFtmYWxsYmFja3NdO1xuICAgIGlmIChBcnJheS5pc0FycmF5KGZhbGxiYWNrcykpIHJldHVybiBmYWxsYmFja3M7XG5cbiAgICBpZiAoIWNvZGUpIHJldHVybiBmYWxsYmFja3MuZGVmYXVsdCB8fCBbXTtcblxuICAgIC8vIGFzc3VtZSB3ZSBoYXZlIGFuIG9iamVjdCBkZWZpbmluZyBmYWxsYmFja3NcbiAgICBsZXQgZm91bmQgPSBmYWxsYmFja3NbY29kZV07XG4gICAgaWYgKCFmb3VuZCkgZm91bmQgPSBmYWxsYmFja3NbdGhpcy5nZXRTY3JpcHRQYXJ0RnJvbUNvZGUoY29kZSldO1xuICAgIGlmICghZm91bmQpIGZvdW5kID0gZmFsbGJhY2tzW3RoaXMuZm9ybWF0TGFuZ3VhZ2VDb2RlKGNvZGUpXTtcbiAgICBpZiAoIWZvdW5kKSBmb3VuZCA9IGZhbGxiYWNrc1t0aGlzLmdldExhbmd1YWdlUGFydEZyb21Db2RlKGNvZGUpXTtcbiAgICBpZiAoIWZvdW5kKSBmb3VuZCA9IGZhbGxiYWNrcy5kZWZhdWx0O1xuXG4gICAgcmV0dXJuIGZvdW5kIHx8IFtdO1xuICB9XG5cbiAgdG9SZXNvbHZlSGllcmFyY2h5KGNvZGUsIGZhbGxiYWNrQ29kZSkge1xuICAgIGNvbnN0IGZhbGxiYWNrQ29kZXMgPSB0aGlzLmdldEZhbGxiYWNrQ29kZXMoXG4gICAgICAoZmFsbGJhY2tDb2RlID09PSBmYWxzZSA/IFtdIDogZmFsbGJhY2tDb2RlKSB8fCB0aGlzLm9wdGlvbnMuZmFsbGJhY2tMbmcgfHwgW10sXG4gICAgICBjb2RlLFxuICAgICk7XG5cbiAgICBjb25zdCBjb2RlcyA9IFtdO1xuICAgIGNvbnN0IGFkZENvZGUgPSAoYykgPT4ge1xuICAgICAgaWYgKCFjKSByZXR1cm47XG4gICAgICBpZiAodGhpcy5pc1N1cHBvcnRlZENvZGUoYykpIHtcbiAgICAgICAgY29kZXMucHVzaChjKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMubG9nZ2VyLndhcm4oYHJlamVjdGluZyBsYW5ndWFnZSBjb2RlIG5vdCBmb3VuZCBpbiBzdXBwb3J0ZWRMbmdzOiAke2N9YCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIGlmIChpc1N0cmluZyhjb2RlKSAmJiAoY29kZS5pbmNsdWRlcygnLScpIHx8IGNvZGUuaW5jbHVkZXMoJ18nKSkpIHtcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMubG9hZCAhPT0gJ2xhbmd1YWdlT25seScpIGFkZENvZGUodGhpcy5mb3JtYXRMYW5ndWFnZUNvZGUoY29kZSkpO1xuICAgICAgaWYgKHRoaXMub3B0aW9ucy5sb2FkICE9PSAnbGFuZ3VhZ2VPbmx5JyAmJiB0aGlzLm9wdGlvbnMubG9hZCAhPT0gJ2N1cnJlbnRPbmx5JylcbiAgICAgICAgYWRkQ29kZSh0aGlzLmdldFNjcmlwdFBhcnRGcm9tQ29kZShjb2RlKSk7XG4gICAgICBpZiAodGhpcy5vcHRpb25zLmxvYWQgIT09ICdjdXJyZW50T25seScpIGFkZENvZGUodGhpcy5nZXRMYW5ndWFnZVBhcnRGcm9tQ29kZShjb2RlKSk7XG4gICAgfSBlbHNlIGlmIChpc1N0cmluZyhjb2RlKSkge1xuICAgICAgYWRkQ29kZSh0aGlzLmZvcm1hdExhbmd1YWdlQ29kZShjb2RlKSk7XG4gICAgfVxuXG4gICAgZmFsbGJhY2tDb2Rlcy5mb3JFYWNoKChmYykgPT4ge1xuICAgICAgaWYgKCFjb2Rlcy5pbmNsdWRlcyhmYykpIGFkZENvZGUodGhpcy5mb3JtYXRMYW5ndWFnZUNvZGUoZmMpKTtcbiAgICB9KTtcblxuICAgIHJldHVybiBjb2RlcztcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBMYW5ndWFnZVV0aWw7XG4iLCJpbXBvcnQgYmFzZUxvZ2dlciBmcm9tICcuL2xvZ2dlci5qcyc7XG5pbXBvcnQgeyBnZXRDbGVhbmVkQ29kZSB9IGZyb20gJy4vdXRpbHMuanMnXG5cbmNvbnN0IHN1ZmZpeGVzT3JkZXIgPSB7XG4gIHplcm86IDAsXG4gIG9uZTogMSxcbiAgdHdvOiAyLFxuICBmZXc6IDMsXG4gIG1hbnk6IDQsXG4gIG90aGVyOiA1LFxufTtcblxuY29uc3QgZHVtbXlSdWxlID0ge1xuICBzZWxlY3Q6IChjb3VudCkgPT4gY291bnQgPT09IDEgPyAnb25lJyA6ICdvdGhlcicsXG4gIHJlc29sdmVkT3B0aW9uczogKCkgPT4gKHtcbiAgICBwbHVyYWxDYXRlZ29yaWVzOiBbJ29uZScsICdvdGhlciddXG4gIH0pXG59O1xuXG5jbGFzcyBQbHVyYWxSZXNvbHZlciB7XG4gIGNvbnN0cnVjdG9yKGxhbmd1YWdlVXRpbHMsIG9wdGlvbnMgPSB7fSkge1xuICAgIHRoaXMubGFuZ3VhZ2VVdGlscyA9IGxhbmd1YWdlVXRpbHM7XG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcblxuICAgIHRoaXMubG9nZ2VyID0gYmFzZUxvZ2dlci5jcmVhdGUoJ3BsdXJhbFJlc29sdmVyJyk7XG5cbiAgICAvLyBDYWNoZSBjYWxscyB0byBJbnRsLlBsdXJhbFJ1bGVzLCBzaW5jZSByZXBlYXRlZCBjYWxscyBjYW4gYmUgc2xvdyBpbiBydW50aW1lcyBsaWtlIFJlYWN0IE5hdGl2ZVxuICAgIC8vIGFuZCB0aGUgbWVtb3J5IHVzYWdlIGRpZmZlcmVuY2UgaXMgbmVnbGlnaWJsZVxuICAgIHRoaXMucGx1cmFsUnVsZXNDYWNoZSA9IHt9O1xuICB9XG5cbiAgY2xlYXJDYWNoZSgpIHtcbiAgICB0aGlzLnBsdXJhbFJ1bGVzQ2FjaGUgPSB7fTtcbiAgfVxuXG4gIGdldFJ1bGUoY29kZSwgb3B0aW9ucyA9IHt9KSB7XG4gICAgY29uc3QgY2xlYW5lZENvZGUgPSBnZXRDbGVhbmVkQ29kZShjb2RlID09PSAnZGV2JyA/ICdlbicgOiBjb2RlKTtcbiAgICBjb25zdCB0eXBlID0gb3B0aW9ucy5vcmRpbmFsID8gJ29yZGluYWwnIDogJ2NhcmRpbmFsJztcbiAgICBjb25zdCBjYWNoZUtleSA9IEpTT04uc3RyaW5naWZ5KHsgY2xlYW5lZENvZGUsIHR5cGUgfSk7XG5cbiAgICBpZiAoY2FjaGVLZXkgaW4gdGhpcy5wbHVyYWxSdWxlc0NhY2hlKSB7XG4gICAgICByZXR1cm4gdGhpcy5wbHVyYWxSdWxlc0NhY2hlW2NhY2hlS2V5XTtcbiAgICB9XG5cbiAgICBsZXQgcnVsZTtcblxuICAgIHRyeSB7XG4gICAgICBydWxlID0gbmV3IEludGwuUGx1cmFsUnVsZXMoY2xlYW5lZENvZGUsIHsgdHlwZSB9KTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGlmICh0eXBlb2YgSW50bCA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoJ05vIEludGwgc3VwcG9ydCwgcGxlYXNlIHVzZSBhbiBJbnRsIHBvbHlmaWxsIScpO1xuICAgICAgICByZXR1cm4gZHVtbXlSdWxlO1xuICAgICAgfVxuICAgICAgaWYgKCFjb2RlLm1hdGNoKC8tfF8vKSkgcmV0dXJuIGR1bW15UnVsZTtcbiAgICAgIGNvbnN0IGxuZ1BhcnQgPSB0aGlzLmxhbmd1YWdlVXRpbHMuZ2V0TGFuZ3VhZ2VQYXJ0RnJvbUNvZGUoY29kZSk7XG4gICAgICBydWxlID0gdGhpcy5nZXRSdWxlKGxuZ1BhcnQsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIHRoaXMucGx1cmFsUnVsZXNDYWNoZVtjYWNoZUtleV0gPSBydWxlO1xuICAgIHJldHVybiBydWxlO1xuICB9XG5cbiAgbmVlZHNQbHVyYWwoY29kZSwgb3B0aW9ucyA9IHt9KSB7XG4gICAgbGV0IHJ1bGUgPSB0aGlzLmdldFJ1bGUoY29kZSwgb3B0aW9ucyk7XG4gICAgaWYgKCFydWxlKSBydWxlID0gdGhpcy5nZXRSdWxlKCdkZXYnLCBvcHRpb25zKTtcbiAgICByZXR1cm4gcnVsZT8ucmVzb2x2ZWRPcHRpb25zKCkucGx1cmFsQ2F0ZWdvcmllcy5sZW5ndGggPiAxO1xuICB9XG5cbiAgZ2V0UGx1cmFsRm9ybXNPZktleShjb2RlLCBrZXksIG9wdGlvbnMgPSB7fSkge1xuICAgIHJldHVybiB0aGlzLmdldFN1ZmZpeGVzKGNvZGUsIG9wdGlvbnMpLm1hcCgoc3VmZml4KSA9PiBgJHtrZXl9JHtzdWZmaXh9YCk7XG4gIH1cblxuICBnZXRTdWZmaXhlcyhjb2RlLCBvcHRpb25zID0ge30pIHtcbiAgICBsZXQgcnVsZSA9IHRoaXMuZ2V0UnVsZShjb2RlLCBvcHRpb25zKTtcbiAgICBpZiAoIXJ1bGUpIHJ1bGUgPSB0aGlzLmdldFJ1bGUoJ2RldicsIG9wdGlvbnMpO1xuICAgIGlmICghcnVsZSkgcmV0dXJuIFtdO1xuXG4gICAgcmV0dXJuIHJ1bGUucmVzb2x2ZWRPcHRpb25zKCkucGx1cmFsQ2F0ZWdvcmllc1xuICAgICAgLnNvcnQoKHBsdXJhbENhdGVnb3J5MSwgcGx1cmFsQ2F0ZWdvcnkyKSA9PiBzdWZmaXhlc09yZGVyW3BsdXJhbENhdGVnb3J5MV0gLSBzdWZmaXhlc09yZGVyW3BsdXJhbENhdGVnb3J5Ml0pXG4gICAgICAubWFwKHBsdXJhbENhdGVnb3J5ID0+IGAke3RoaXMub3B0aW9ucy5wcmVwZW5kfSR7b3B0aW9ucy5vcmRpbmFsID8gYG9yZGluYWwke3RoaXMub3B0aW9ucy5wcmVwZW5kfWAgOiAnJ30ke3BsdXJhbENhdGVnb3J5fWApO1xuICB9XG5cbiAgZ2V0U3VmZml4KGNvZGUsIGNvdW50LCBvcHRpb25zID0ge30pIHtcbiAgICBjb25zdCBydWxlID0gdGhpcy5nZXRSdWxlKGNvZGUsIG9wdGlvbnMpO1xuXG4gICAgaWYgKHJ1bGUpIHtcbiAgICAgIHJldHVybiBgJHt0aGlzLm9wdGlvbnMucHJlcGVuZH0ke29wdGlvbnMub3JkaW5hbCA/IGBvcmRpbmFsJHt0aGlzLm9wdGlvbnMucHJlcGVuZH1gIDogJyd9JHtydWxlLnNlbGVjdChjb3VudCl9YDtcbiAgICB9XG5cbiAgICB0aGlzLmxvZ2dlci53YXJuKGBubyBwbHVyYWwgcnVsZSBmb3VuZCBmb3I6ICR7Y29kZX1gKTtcbiAgICByZXR1cm4gdGhpcy5nZXRTdWZmaXgoJ2RldicsIGNvdW50LCBvcHRpb25zKTtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBQbHVyYWxSZXNvbHZlcjtcbiIsImltcG9ydCB7XG4gIGdldFBhdGhXaXRoRGVmYXVsdHMsXG4gIGRlZXBGaW5kLFxuICBlc2NhcGUgYXMgdXRpbHNFc2NhcGUsXG4gIHJlZ2V4RXNjYXBlLFxuICBtYWtlU3RyaW5nLFxuICBpc1N0cmluZyxcbn0gZnJvbSAnLi91dGlscy5qcyc7XG5pbXBvcnQgYmFzZUxvZ2dlciBmcm9tICcuL2xvZ2dlci5qcyc7XG5cbmNvbnN0IGRlZXBGaW5kV2l0aERlZmF1bHRzID0gKFxuICBkYXRhLFxuICBkZWZhdWx0RGF0YSxcbiAga2V5LFxuICBrZXlTZXBhcmF0b3IgPSAnLicsXG4gIGlnbm9yZUpTT05TdHJ1Y3R1cmUgPSB0cnVlLFxuKSA9PiB7XG4gIGxldCBwYXRoID0gZ2V0UGF0aFdpdGhEZWZhdWx0cyhkYXRhLCBkZWZhdWx0RGF0YSwga2V5KTtcbiAgaWYgKCFwYXRoICYmIGlnbm9yZUpTT05TdHJ1Y3R1cmUgJiYgaXNTdHJpbmcoa2V5KSkge1xuICAgIHBhdGggPSBkZWVwRmluZChkYXRhLCBrZXksIGtleVNlcGFyYXRvcik7XG4gICAgaWYgKHBhdGggPT09IHVuZGVmaW5lZCkgcGF0aCA9IGRlZXBGaW5kKGRlZmF1bHREYXRhLCBrZXksIGtleVNlcGFyYXRvcik7XG4gIH1cbiAgcmV0dXJuIHBhdGg7XG59O1xuXG5jb25zdCByZWdleFNhZmUgPSAodmFsKSA9PiB2YWwucmVwbGFjZSgvXFwkL2csICckJCQkJyk7XG5cbmNsYXNzIEludGVycG9sYXRvciB7XG4gIGNvbnN0cnVjdG9yKG9wdGlvbnMgPSB7fSkge1xuICAgIHRoaXMubG9nZ2VyID0gYmFzZUxvZ2dlci5jcmVhdGUoJ2ludGVycG9sYXRvcicpO1xuXG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcbiAgICB0aGlzLmZvcm1hdCA9IG9wdGlvbnM/LmludGVycG9sYXRpb24/LmZvcm1hdCB8fCAoKHZhbHVlKSA9PiB2YWx1ZSk7XG4gICAgdGhpcy5pbml0KG9wdGlvbnMpO1xuICB9XG5cbiAgaW5pdChvcHRpb25zID0ge30pIHtcbiAgICBpZiAoIW9wdGlvbnMuaW50ZXJwb2xhdGlvbikgb3B0aW9ucy5pbnRlcnBvbGF0aW9uID0geyBlc2NhcGVWYWx1ZTogdHJ1ZSB9O1xuXG4gICAgY29uc3Qge1xuICAgICAgZXNjYXBlLFxuICAgICAgZXNjYXBlVmFsdWUsXG4gICAgICB1c2VSYXdWYWx1ZVRvRXNjYXBlLFxuICAgICAgcHJlZml4LFxuICAgICAgcHJlZml4RXNjYXBlZCxcbiAgICAgIHN1ZmZpeCxcbiAgICAgIHN1ZmZpeEVzY2FwZWQsXG4gICAgICBmb3JtYXRTZXBhcmF0b3IsXG4gICAgICB1bmVzY2FwZVN1ZmZpeCxcbiAgICAgIHVuZXNjYXBlUHJlZml4LFxuICAgICAgbmVzdGluZ1ByZWZpeCxcbiAgICAgIG5lc3RpbmdQcmVmaXhFc2NhcGVkLFxuICAgICAgbmVzdGluZ1N1ZmZpeCxcbiAgICAgIG5lc3RpbmdTdWZmaXhFc2NhcGVkLFxuICAgICAgbmVzdGluZ09wdGlvbnNTZXBhcmF0b3IsXG4gICAgICBtYXhSZXBsYWNlcyxcbiAgICAgIGFsd2F5c0Zvcm1hdCxcbiAgICB9ID0gb3B0aW9ucy5pbnRlcnBvbGF0aW9uO1xuXG4gICAgdGhpcy5lc2NhcGUgPSBlc2NhcGUgIT09IHVuZGVmaW5lZCA/IGVzY2FwZSA6IHV0aWxzRXNjYXBlO1xuICAgIHRoaXMuZXNjYXBlVmFsdWUgPSBlc2NhcGVWYWx1ZSAhPT0gdW5kZWZpbmVkID8gZXNjYXBlVmFsdWUgOiB0cnVlO1xuICAgIHRoaXMudXNlUmF3VmFsdWVUb0VzY2FwZSA9IHVzZVJhd1ZhbHVlVG9Fc2NhcGUgIT09IHVuZGVmaW5lZCA/IHVzZVJhd1ZhbHVlVG9Fc2NhcGUgOiBmYWxzZTtcblxuICAgIHRoaXMucHJlZml4ID0gcHJlZml4ID8gcmVnZXhFc2NhcGUocHJlZml4KSA6IHByZWZpeEVzY2FwZWQgfHwgJ3t7JztcbiAgICB0aGlzLnN1ZmZpeCA9IHN1ZmZpeCA/IHJlZ2V4RXNjYXBlKHN1ZmZpeCkgOiBzdWZmaXhFc2NhcGVkIHx8ICd9fSc7XG5cbiAgICB0aGlzLmZvcm1hdFNlcGFyYXRvciA9IGZvcm1hdFNlcGFyYXRvciB8fCAnLCc7XG5cbiAgICB0aGlzLnVuZXNjYXBlUHJlZml4ID0gdW5lc2NhcGVTdWZmaXggPyAnJyA6IHVuZXNjYXBlUHJlZml4ID8gcmVnZXhFc2NhcGUodW5lc2NhcGVQcmVmaXgpIDogJy0nO1xuICAgIHRoaXMudW5lc2NhcGVTdWZmaXggPSB0aGlzLnVuZXNjYXBlUHJlZml4XG4gICAgICA/ICcnXG4gICAgICA6IHVuZXNjYXBlU3VmZml4XG4gICAgICAgID8gcmVnZXhFc2NhcGUodW5lc2NhcGVTdWZmaXgpXG4gICAgICAgIDogJyc7XG5cbiAgICB0aGlzLm5lc3RpbmdQcmVmaXggPSBuZXN0aW5nUHJlZml4XG4gICAgICA/IHJlZ2V4RXNjYXBlKG5lc3RpbmdQcmVmaXgpXG4gICAgICA6IG5lc3RpbmdQcmVmaXhFc2NhcGVkIHx8IHJlZ2V4RXNjYXBlKCckdCgnKTtcbiAgICB0aGlzLm5lc3RpbmdTdWZmaXggPSBuZXN0aW5nU3VmZml4XG4gICAgICA/IHJlZ2V4RXNjYXBlKG5lc3RpbmdTdWZmaXgpXG4gICAgICA6IG5lc3RpbmdTdWZmaXhFc2NhcGVkIHx8IHJlZ2V4RXNjYXBlKCcpJyk7XG5cbiAgICB0aGlzLm5lc3RpbmdPcHRpb25zU2VwYXJhdG9yID0gbmVzdGluZ09wdGlvbnNTZXBhcmF0b3IgfHwgJywnO1xuXG4gICAgdGhpcy5tYXhSZXBsYWNlcyA9IG1heFJlcGxhY2VzIHx8IDEwMDA7XG5cbiAgICB0aGlzLmFsd2F5c0Zvcm1hdCA9IGFsd2F5c0Zvcm1hdCAhPT0gdW5kZWZpbmVkID8gYWx3YXlzRm9ybWF0IDogZmFsc2U7XG5cbiAgICAvLyB0aGUgcmVnZXhwXG4gICAgdGhpcy5yZXNldFJlZ0V4cCgpO1xuICB9XG5cbiAgcmVzZXQoKSB7XG4gICAgaWYgKHRoaXMub3B0aW9ucykgdGhpcy5pbml0KHRoaXMub3B0aW9ucyk7XG4gIH1cblxuICByZXNldFJlZ0V4cCgpIHtcbiAgICBjb25zdCBnZXRPclJlc2V0UmVnRXhwID0gKGV4aXN0aW5nUmVnRXhwLCBwYXR0ZXJuKSA9PiB7XG4gICAgICBpZiAoZXhpc3RpbmdSZWdFeHA/LnNvdXJjZSA9PT0gcGF0dGVybikge1xuICAgICAgICBleGlzdGluZ1JlZ0V4cC5sYXN0SW5kZXggPSAwO1xuICAgICAgICByZXR1cm4gZXhpc3RpbmdSZWdFeHA7XG4gICAgICB9XG4gICAgICByZXR1cm4gbmV3IFJlZ0V4cChwYXR0ZXJuLCAnZycpO1xuICAgIH07XG5cbiAgICB0aGlzLnJlZ2V4cCA9IGdldE9yUmVzZXRSZWdFeHAodGhpcy5yZWdleHAsIGAke3RoaXMucHJlZml4fSguKz8pJHt0aGlzLnN1ZmZpeH1gKTtcbiAgICB0aGlzLnJlZ2V4cFVuZXNjYXBlID0gZ2V0T3JSZXNldFJlZ0V4cChcbiAgICAgIHRoaXMucmVnZXhwVW5lc2NhcGUsXG4gICAgICBgJHt0aGlzLnByZWZpeH0ke3RoaXMudW5lc2NhcGVQcmVmaXh9KC4rPykke3RoaXMudW5lc2NhcGVTdWZmaXh9JHt0aGlzLnN1ZmZpeH1gLFxuICAgICk7XG4gICAgdGhpcy5uZXN0aW5nUmVnZXhwID0gZ2V0T3JSZXNldFJlZ0V4cChcbiAgICAgIHRoaXMubmVzdGluZ1JlZ2V4cCxcbiAgICAgIGAke3RoaXMubmVzdGluZ1ByZWZpeH0oKD86W14oKVwiJ10rfFwiW15cIl0qXCJ8J1teJ10qJ3xcXFxcKCg/OlteKCldfFwiW15cIl0qXCJ8J1teJ10qJykqXFxcXCkpKj8pJHt0aGlzLm5lc3RpbmdTdWZmaXh9YCxcbiAgICApO1xuICB9XG5cbiAgaW50ZXJwb2xhdGUoc3RyLCBkYXRhLCBsbmcsIG9wdGlvbnMpIHtcbiAgICBsZXQgbWF0Y2g7XG4gICAgbGV0IHZhbHVlO1xuICAgIGxldCByZXBsYWNlcztcblxuICAgIGNvbnN0IGRlZmF1bHREYXRhID1cbiAgICAgICh0aGlzLm9wdGlvbnMgJiYgdGhpcy5vcHRpb25zLmludGVycG9sYXRpb24gJiYgdGhpcy5vcHRpb25zLmludGVycG9sYXRpb24uZGVmYXVsdFZhcmlhYmxlcykgfHxcbiAgICAgIHt9O1xuXG4gICAgY29uc3QgaGFuZGxlRm9ybWF0ID0gKGtleSkgPT4ge1xuICAgICAgaWYgKCFrZXkuaW5jbHVkZXModGhpcy5mb3JtYXRTZXBhcmF0b3IpKSB7XG4gICAgICAgIGNvbnN0IHBhdGggPSBkZWVwRmluZFdpdGhEZWZhdWx0cyhcbiAgICAgICAgICBkYXRhLFxuICAgICAgICAgIGRlZmF1bHREYXRhLFxuICAgICAgICAgIGtleSxcbiAgICAgICAgICB0aGlzLm9wdGlvbnMua2V5U2VwYXJhdG9yLFxuICAgICAgICAgIHRoaXMub3B0aW9ucy5pZ25vcmVKU09OU3RydWN0dXJlLFxuICAgICAgICApO1xuICAgICAgICByZXR1cm4gdGhpcy5hbHdheXNGb3JtYXRcbiAgICAgICAgICA/IHRoaXMuZm9ybWF0KHBhdGgsIHVuZGVmaW5lZCwgbG5nLCB7IC4uLm9wdGlvbnMsIC4uLmRhdGEsIGludGVycG9sYXRpb25rZXk6IGtleSB9KVxuICAgICAgICAgIDogcGF0aDtcbiAgICAgIH1cblxuICAgICAgY29uc3QgcCA9IGtleS5zcGxpdCh0aGlzLmZvcm1hdFNlcGFyYXRvcik7XG4gICAgICBjb25zdCBrID0gcC5zaGlmdCgpLnRyaW0oKTtcbiAgICAgIGNvbnN0IGYgPSBwLmpvaW4odGhpcy5mb3JtYXRTZXBhcmF0b3IpLnRyaW0oKTtcblxuICAgICAgcmV0dXJuIHRoaXMuZm9ybWF0KFxuICAgICAgICBkZWVwRmluZFdpdGhEZWZhdWx0cyhcbiAgICAgICAgICBkYXRhLFxuICAgICAgICAgIGRlZmF1bHREYXRhLFxuICAgICAgICAgIGssXG4gICAgICAgICAgdGhpcy5vcHRpb25zLmtleVNlcGFyYXRvcixcbiAgICAgICAgICB0aGlzLm9wdGlvbnMuaWdub3JlSlNPTlN0cnVjdHVyZSxcbiAgICAgICAgKSxcbiAgICAgICAgZixcbiAgICAgICAgbG5nLFxuICAgICAgICB7XG4gICAgICAgICAgLi4ub3B0aW9ucyxcbiAgICAgICAgICAuLi5kYXRhLFxuICAgICAgICAgIGludGVycG9sYXRpb25rZXk6IGssXG4gICAgICAgIH0sXG4gICAgICApO1xuICAgIH07XG5cbiAgICB0aGlzLnJlc2V0UmVnRXhwKCk7XG5cbiAgICAvLyBTZWN1cml0eSB3YXJuaW5nOiB3aGVuIGVzY2FwZVZhbHVlIGlzIGZhbHNlIEFORCB0aGUgdHJhbnNsYXRpb24gZW1iZWRzXG4gICAgLy8gaW50ZXJwb2xhdGlvbiBwbGFjZWhvbGRlcnMgaW5zaWRlIGEgJHQoKSBuZXN0aW5nIG9wdGlvbnMgYmxvY2sgKGkuZS5cbiAgICAvLyAkdChrZXksIHsgLi4uIFwie3t2YXJ9fVwiIC4uLiB9KSksIGF0dGFja2VyLWNvbnRyb2xsZWQgc3RyaW5nIHZhbHVlcyB0aGF0XG4gICAgLy8gY29udGFpbiBgXCJgIGNhbiBicmVhayBvdXQgb2YgdGhlIEpTT04gc3RyaW5nIGxpdGVyYWwgYW5kIGluamVjdCBleHRyYVxuICAgIC8vIG5lc3Rpbmcgb3B0aW9ucyAoZS5nLiByZWRpcmVjdCBsbmcvbnMpLiBUaGlzIGlzIHNhZmUgdW5kZXIgdGhlIGRlZmF1bHRcbiAgICAvLyBlc2NhcGVWYWx1ZTogdHJ1ZSwgd2hlcmUgSFRNTC1lc2NhcGluZyBuZXV0cmFsaXNlcyB0aGUgcXVvdGUgYmVmb3JlXG4gICAgLy8gSlNPTi5wYXJzZS4gU2VlIENIQU5HRUxPRyBlbnRyeSBmb3IgMjYuMC42IGFuZCB0aGUgc2VjdXJpdHkgZG9jcy5cbiAgICBpZiAoIXRoaXMuZXNjYXBlVmFsdWUgJiYgdHlwZW9mIHN0ciA9PT0gJ3N0cmluZycgJiYgL1xcJHRcXChbXildKlxce1tefV0qXFx7XFx7Ly50ZXN0KHN0cikpIHtcbiAgICAgIHRoaXMubG9nZ2VyLndhcm4oXG4gICAgICAgICduZXN0aW5nIG9wdGlvbnMgc3RyaW5nIGNvbnRhaW5zIGludGVycG9sYXRlZCB2YXJpYWJsZXMgd2l0aCBlc2NhcGVWYWx1ZTogZmFsc2Ug4oCUICcgK1xuICAgICAgICAgICdpZiBhbnkgb2YgdGhvc2UgdmFsdWVzIGFyZSBhdHRhY2tlci1jb250cm9sbGVkIHRoZXkgY2FuIGluamVjdCBhZGRpdGlvbmFsICcgK1xuICAgICAgICAgICduZXN0aW5nIG9wdGlvbnMgKGUuZy4gcmVkaXJlY3QgbG5nL25zKS4gU2FuaXRpc2UgdW50cnVzdGVkIGlucHV0IGJlZm9yZSBwYXNzaW5nICcgK1xuICAgICAgICAgICdpdCB0byB0KCksIG9yIGtlZXAgZXNjYXBlVmFsdWU6IHRydWUuJyxcbiAgICAgICk7XG4gICAgfVxuXG4gICAgY29uc3QgbWlzc2luZ0ludGVycG9sYXRpb25IYW5kbGVyID1cbiAgICAgIG9wdGlvbnM/Lm1pc3NpbmdJbnRlcnBvbGF0aW9uSGFuZGxlciB8fCB0aGlzLm9wdGlvbnMubWlzc2luZ0ludGVycG9sYXRpb25IYW5kbGVyO1xuXG4gICAgY29uc3Qgc2tpcE9uVmFyaWFibGVzID1cbiAgICAgIG9wdGlvbnM/LmludGVycG9sYXRpb24/LnNraXBPblZhcmlhYmxlcyAhPT0gdW5kZWZpbmVkXG4gICAgICAgID8gb3B0aW9ucy5pbnRlcnBvbGF0aW9uLnNraXBPblZhcmlhYmxlc1xuICAgICAgICA6IHRoaXMub3B0aW9ucy5pbnRlcnBvbGF0aW9uLnNraXBPblZhcmlhYmxlcztcblxuICAgIGNvbnN0IHRvZG9zID0gW1xuICAgICAge1xuICAgICAgICAvLyB1bmVzY2FwZSBpZiBoYXMgdW5lc2NhcGVQcmVmaXgvU3VmZml4XG4gICAgICAgIHJlZ2V4OiB0aGlzLnJlZ2V4cFVuZXNjYXBlLFxuICAgICAgICBzYWZlVmFsdWU6ICh2YWwpID0+IHJlZ2V4U2FmZSh2YWwpLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgLy8gcmVndWxhciBlc2NhcGUgb24gZGVtYW5kXG4gICAgICAgIHJlZ2V4OiB0aGlzLnJlZ2V4cCxcbiAgICAgICAgc2FmZVZhbHVlOiAodmFsKSA9PiAodGhpcy5lc2NhcGVWYWx1ZSA/IHJlZ2V4U2FmZSh0aGlzLmVzY2FwZSh2YWwpKSA6IHJlZ2V4U2FmZSh2YWwpKSxcbiAgICAgIH0sXG4gICAgXTtcbiAgICB0b2Rvcy5mb3JFYWNoKCh0b2RvKSA9PiB7XG4gICAgICByZXBsYWNlcyA9IDA7XG4gICAgICB3aGlsZSAoKG1hdGNoID0gdG9kby5yZWdleC5leGVjKHN0cikpKSB7XG4gICAgICAgIGNvbnN0IG1hdGNoZWRWYXIgPSBtYXRjaFsxXS50cmltKCk7XG4gICAgICAgIHZhbHVlID0gaGFuZGxlRm9ybWF0KG1hdGNoZWRWYXIpO1xuICAgICAgICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGlmICh0eXBlb2YgbWlzc2luZ0ludGVycG9sYXRpb25IYW5kbGVyID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjb25zdCB0ZW1wID0gbWlzc2luZ0ludGVycG9sYXRpb25IYW5kbGVyKHN0ciwgbWF0Y2gsIG9wdGlvbnMpO1xuICAgICAgICAgICAgdmFsdWUgPSBpc1N0cmluZyh0ZW1wKSA/IHRlbXAgOiAnJztcbiAgICAgICAgICB9IGVsc2UgaWYgKG9wdGlvbnMgJiYgT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9wdGlvbnMsIG1hdGNoZWRWYXIpKSB7XG4gICAgICAgICAgICB2YWx1ZSA9ICcnOyAvLyB1bmRlZmluZWQgYmVjb21lcyBlbXB0eSBzdHJpbmdcbiAgICAgICAgICB9IGVsc2UgaWYgKHNraXBPblZhcmlhYmxlcykge1xuICAgICAgICAgICAgdmFsdWUgPSBtYXRjaFswXTtcbiAgICAgICAgICAgIGNvbnRpbnVlOyAvLyB0aGlzIG1ha2VzIHN1cmUgaXQgY29udGludWVzIHRvIGRldGVjdCBvdGhlcnNcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5sb2dnZXIud2FybihgbWlzc2VkIHRvIHBhc3MgaW4gdmFyaWFibGUgJHttYXRjaGVkVmFyfSBmb3IgaW50ZXJwb2xhdGluZyAke3N0cn1gKTtcbiAgICAgICAgICAgIHZhbHVlID0gJyc7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKCFpc1N0cmluZyh2YWx1ZSkgJiYgIXRoaXMudXNlUmF3VmFsdWVUb0VzY2FwZSkge1xuICAgICAgICAgIHZhbHVlID0gbWFrZVN0cmluZyh2YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3Qgc2FmZVZhbHVlID0gdG9kby5zYWZlVmFsdWUodmFsdWUpO1xuICAgICAgICBzdHIgPSBzdHIucmVwbGFjZShtYXRjaFswXSwgc2FmZVZhbHVlKTtcbiAgICAgICAgaWYgKHNraXBPblZhcmlhYmxlcykge1xuICAgICAgICAgIHRvZG8ucmVnZXgubGFzdEluZGV4ICs9IHZhbHVlLmxlbmd0aDtcbiAgICAgICAgICB0b2RvLnJlZ2V4Lmxhc3RJbmRleCAtPSBtYXRjaFswXS5sZW5ndGg7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdG9kby5yZWdleC5sYXN0SW5kZXggPSAwO1xuICAgICAgICB9XG4gICAgICAgIHJlcGxhY2VzKys7XG4gICAgICAgIGlmIChyZXBsYWNlcyA+PSB0aGlzLm1heFJlcGxhY2VzKSB7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gc3RyO1xuICB9XG5cbiAgbmVzdChzdHIsIGZjLCBvcHRpb25zID0ge30pIHtcbiAgICBsZXQgbWF0Y2g7XG4gICAgbGV0IHZhbHVlO1xuXG4gICAgbGV0IGNsb25lZE9wdGlvbnM7XG5cbiAgICAvLyBpZiB2YWx1ZSBpcyBzb21ldGhpbmcgbGlrZSBcIm15S2V5XCI6IFwibG9yZW0gJChhbm90aGVyS2V5LCB7IFwiY291bnRcIjoge3thVmFsdWVJbk9wdGlvbnN9fSB9KVwiXG4gICAgY29uc3QgaGFuZGxlSGFzT3B0aW9ucyA9IChrZXksIGluaGVyaXRlZE9wdGlvbnMpID0+IHtcbiAgICAgIGNvbnN0IHNlcCA9IHRoaXMubmVzdGluZ09wdGlvbnNTZXBhcmF0b3I7XG4gICAgICBpZiAoIWtleS5pbmNsdWRlcyhzZXApKSByZXR1cm4ga2V5O1xuXG4gICAgICBjb25zdCBjID0ga2V5LnNwbGl0KG5ldyBSZWdFeHAoYCR7cmVnZXhFc2NhcGUoc2VwKX1bIF0qe2ApKTtcblxuICAgICAgbGV0IG9wdGlvbnNTdHJpbmcgPSBgeyR7Y1sxXX1gO1xuICAgICAga2V5ID0gY1swXTtcbiAgICAgIG9wdGlvbnNTdHJpbmcgPSB0aGlzLmludGVycG9sYXRlKG9wdGlvbnNTdHJpbmcsIGNsb25lZE9wdGlvbnMpO1xuICAgICAgY29uc3QgbWF0Y2hlZFNpbmdsZVF1b3RlcyA9IG9wdGlvbnNTdHJpbmcubWF0Y2goLycvZyk7XG4gICAgICBjb25zdCBtYXRjaGVkRG91YmxlUXVvdGVzID0gb3B0aW9uc1N0cmluZy5tYXRjaCgvXCIvZyk7XG4gICAgICBpZiAoXG4gICAgICAgICgobWF0Y2hlZFNpbmdsZVF1b3Rlcz8ubGVuZ3RoID8/IDApICUgMiA9PT0gMCAmJiAhbWF0Y2hlZERvdWJsZVF1b3RlcykgfHxcbiAgICAgICAgKG1hdGNoZWREb3VibGVRdW90ZXM/Lmxlbmd0aCA/PyAwKSAlIDIgIT09IDBcbiAgICAgICkge1xuICAgICAgICBvcHRpb25zU3RyaW5nID0gb3B0aW9uc1N0cmluZy5yZXBsYWNlKC8nL2csICdcIicpO1xuICAgICAgfVxuXG4gICAgICB0cnkge1xuICAgICAgICBjbG9uZWRPcHRpb25zID0gSlNPTi5wYXJzZShvcHRpb25zU3RyaW5nKTtcblxuICAgICAgICBpZiAoaW5oZXJpdGVkT3B0aW9ucykgY2xvbmVkT3B0aW9ucyA9IHsgLi4uaW5oZXJpdGVkT3B0aW9ucywgLi4uY2xvbmVkT3B0aW9ucyB9O1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICB0aGlzLmxvZ2dlci53YXJuKGBmYWlsZWQgcGFyc2luZyBvcHRpb25zIHN0cmluZyBpbiBuZXN0aW5nIGZvciBrZXkgJHtrZXl9YCwgZSk7XG4gICAgICAgIHJldHVybiBgJHtrZXl9JHtzZXB9JHtvcHRpb25zU3RyaW5nfWA7XG4gICAgICB9XG5cbiAgICAgIC8vIGFzc2VydCB3ZSBkbyBub3QgZ2V0IGEgZW5kbGVzcyBsb29wIG9uIGludGVycG9sYXRpbmcgZGVmYXVsdFZhbHVlIGFnYWluIGFuZCBhZ2FpblxuICAgICAgaWYgKGNsb25lZE9wdGlvbnMuZGVmYXVsdFZhbHVlICYmIGNsb25lZE9wdGlvbnMuZGVmYXVsdFZhbHVlLmluY2x1ZGVzKHRoaXMucHJlZml4KSlcbiAgICAgICAgZGVsZXRlIGNsb25lZE9wdGlvbnMuZGVmYXVsdFZhbHVlO1xuICAgICAgcmV0dXJuIGtleTtcbiAgICB9O1xuXG4gICAgLy8gcmVndWxhciBlc2NhcGUgb24gZGVtYW5kXG4gICAgd2hpbGUgKChtYXRjaCA9IHRoaXMubmVzdGluZ1JlZ2V4cC5leGVjKHN0cikpKSB7XG4gICAgICBsZXQgZm9ybWF0dGVycyA9IFtdO1xuXG4gICAgICBjbG9uZWRPcHRpb25zID0geyAuLi5vcHRpb25zIH07XG4gICAgICBjbG9uZWRPcHRpb25zID1cbiAgICAgICAgY2xvbmVkT3B0aW9ucy5yZXBsYWNlICYmICFpc1N0cmluZyhjbG9uZWRPcHRpb25zLnJlcGxhY2UpXG4gICAgICAgICAgPyBjbG9uZWRPcHRpb25zLnJlcGxhY2VcbiAgICAgICAgICA6IGNsb25lZE9wdGlvbnM7XG4gICAgICBjbG9uZWRPcHRpb25zLmFwcGx5UG9zdFByb2Nlc3NvciA9IGZhbHNlOyAvLyBhdm9pZCBwb3N0IHByb2Nlc3Npbmcgb24gbmVzdGVkIGxvb2t1cFxuICAgICAgZGVsZXRlIGNsb25lZE9wdGlvbnMuZGVmYXVsdFZhbHVlOyAvLyBhc3NlcnQgd2UgZG8gbm90IGdldCBhIGVuZGxlc3MgbG9vcCBvbiBpbnRlcnBvbGF0aW5nIGRlZmF1bHRWYWx1ZSBhZ2FpbiBhbmQgYWdhaW5cblxuICAgICAgLyoqXG4gICAgICAgKiBJZiB0aGVyZSBpcyBtb3JlIHRoYW4gb25lIHBhcmFtZXRlciAoY29udGFpbnMgdGhlIGZvcm1hdCBzZXBhcmF0b3IpLiBFLmcuOlxuICAgICAgICogICAtIHQoYSwgYilcbiAgICAgICAqICAgLSB0KGEsIGIsIGMpXG4gICAgICAgKlxuICAgICAgICogQW5kIHRob3NlIHBhcmFtZXRlcnMgYXJlIG5vdCBkeW5hbWljIHZhbHVlcyAocGFyYW1ldGVycyBkbyBub3QgaW5jbHVkZSBjdXJseSBicmFjZXMpLiBFLmcuOlxuICAgICAgICogICAtIE5vdCB0KGEsIHsgXCJrZXlcIjogXCJ7e3ZhcmlhYmxlfX1cIiB9KVxuICAgICAgICogICAtIE5vdCB0KGEsIGIsIHtcImtleUFcIjogXCJ2YWx1ZUFcIiwgXCJrZXlCXCI6IFwidmFsdWVCXCJ9KVxuICAgICAgICpcbiAgICAgICAqIFNpbmNlIHYyNS4zLjAgYWxzbyB0aGlzIGlzIHBvc3NpYmxlOiBodHRwczovL2dpdGh1Yi5jb20vaTE4bmV4dC9pMThuZXh0L3B1bGwvMjMyNVxuICAgICAgICovXG4gICAgICBjb25zdCBrZXlFbmRJbmRleCA9IC97Lip9Ly50ZXN0KG1hdGNoWzFdKVxuICAgICAgICA/IG1hdGNoWzFdLmxhc3RJbmRleE9mKCd9JykgKyAxXG4gICAgICAgIDogbWF0Y2hbMV0uaW5kZXhPZih0aGlzLmZvcm1hdFNlcGFyYXRvcik7XG4gICAgICBpZiAoa2V5RW5kSW5kZXggIT09IC0xKSB7XG4gICAgICAgIGZvcm1hdHRlcnMgPSBtYXRjaFsxXVxuICAgICAgICAgIC5zbGljZShrZXlFbmRJbmRleClcbiAgICAgICAgICAuc3BsaXQodGhpcy5mb3JtYXRTZXBhcmF0b3IpXG4gICAgICAgICAgLm1hcCgoZWxlbSkgPT4gZWxlbS50cmltKCkpXG4gICAgICAgICAgLmZpbHRlcihCb29sZWFuKTtcbiAgICAgICAgbWF0Y2hbMV0gPSBtYXRjaFsxXS5zbGljZSgwLCBrZXlFbmRJbmRleCk7XG4gICAgICB9XG5cbiAgICAgIHZhbHVlID0gZmMoaGFuZGxlSGFzT3B0aW9ucy5jYWxsKHRoaXMsIG1hdGNoWzFdLnRyaW0oKSwgY2xvbmVkT3B0aW9ucyksIGNsb25lZE9wdGlvbnMpO1xuXG4gICAgICAvLyBpcyBvbmx5IHRoZSBuZXN0aW5nIGtleSAoa2V5MSA9ICckKGtleTIpJykgcmV0dXJuIHRoZSB2YWx1ZSB3aXRob3V0IHN0cmluZ2lmeVxuICAgICAgaWYgKHZhbHVlICYmIG1hdGNoWzBdID09PSBzdHIgJiYgIWlzU3RyaW5nKHZhbHVlKSkgcmV0dXJuIHZhbHVlO1xuXG4gICAgICAvLyBubyBzdHJpbmcgdG8gaW5jbHVkZSBvciBlbXB0eVxuICAgICAgaWYgKCFpc1N0cmluZyh2YWx1ZSkpIHZhbHVlID0gbWFrZVN0cmluZyh2YWx1ZSk7XG4gICAgICBpZiAoIXZhbHVlKSB7XG4gICAgICAgIHRoaXMubG9nZ2VyLndhcm4oYG1pc3NlZCB0byByZXNvbHZlICR7bWF0Y2hbMV19IGZvciBuZXN0aW5nICR7c3RyfWApO1xuICAgICAgICB2YWx1ZSA9ICcnO1xuICAgICAgfVxuXG4gICAgICBpZiAoZm9ybWF0dGVycy5sZW5ndGgpIHtcbiAgICAgICAgdmFsdWUgPSBmb3JtYXR0ZXJzLnJlZHVjZShcbiAgICAgICAgICAodiwgZikgPT5cbiAgICAgICAgICAgIHRoaXMuZm9ybWF0KHYsIGYsIG9wdGlvbnMubG5nLCB7IC4uLm9wdGlvbnMsIGludGVycG9sYXRpb25rZXk6IG1hdGNoWzFdLnRyaW0oKSB9KSxcbiAgICAgICAgICB2YWx1ZS50cmltKCksXG4gICAgICAgICk7XG4gICAgICB9XG5cbiAgICAgIC8vIE5lc3RlZCBrZXlzIHNob3VsZCBub3QgYmUgZXNjYXBlZCBieSBkZWZhdWx0ICM4NTRcbiAgICAgIC8vIHZhbHVlID0gdGhpcy5lc2NhcGVWYWx1ZSA/IHJlZ2V4U2FmZSh1dGlscy5lc2NhcGUodmFsdWUpKSA6IHJlZ2V4U2FmZSh2YWx1ZSk7XG4gICAgICBzdHIgPSBzdHIucmVwbGFjZShtYXRjaFswXSwgdmFsdWUpO1xuICAgICAgdGhpcy5yZWdleHAubGFzdEluZGV4ID0gMDtcbiAgICB9XG4gICAgcmV0dXJuIHN0cjtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBJbnRlcnBvbGF0b3I7XG4iLCJpbXBvcnQgYmFzZUxvZ2dlciBmcm9tICcuL2xvZ2dlci5qcyc7XG5pbXBvcnQgeyBnZXRDbGVhbmVkQ29kZSB9IGZyb20gJy4vdXRpbHMuanMnO1xuXG5jb25zdCBwYXJzZUZvcm1hdFN0ciA9IChmb3JtYXRTdHIpID0+IHtcbiAgbGV0IGZvcm1hdE5hbWUgPSBmb3JtYXRTdHIudG9Mb3dlckNhc2UoKS50cmltKCk7XG4gIGNvbnN0IGZvcm1hdE9wdGlvbnMgPSB7fTtcbiAgaWYgKGZvcm1hdFN0ci5pbmNsdWRlcygnKCcpKSB7XG4gICAgY29uc3QgcCA9IGZvcm1hdFN0ci5zcGxpdCgnKCcpO1xuICAgIGZvcm1hdE5hbWUgPSBwWzBdLnRvTG93ZXJDYXNlKCkudHJpbSgpO1xuXG4gICAgY29uc3Qgb3B0U3RyID0gcFsxXS5zbGljZSgwLCAtMSk7XG5cbiAgICAvLyBleHRyYSBmb3IgY3VycmVuY3lcbiAgICBpZiAoZm9ybWF0TmFtZSA9PT0gJ2N1cnJlbmN5JyAmJiAhb3B0U3RyLmluY2x1ZGVzKCc6JykpIHtcbiAgICAgIGlmICghZm9ybWF0T3B0aW9ucy5jdXJyZW5jeSkgZm9ybWF0T3B0aW9ucy5jdXJyZW5jeSA9IG9wdFN0ci50cmltKCk7XG4gICAgfSBlbHNlIGlmIChmb3JtYXROYW1lID09PSAncmVsYXRpdmV0aW1lJyAmJiAhb3B0U3RyLmluY2x1ZGVzKCc6JykpIHtcbiAgICAgIGlmICghZm9ybWF0T3B0aW9ucy5yYW5nZSkgZm9ybWF0T3B0aW9ucy5yYW5nZSA9IG9wdFN0ci50cmltKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IG9wdHMgPSBvcHRTdHIuc3BsaXQoJzsnKTtcblxuICAgICAgb3B0cy5mb3JFYWNoKChvcHQpID0+IHtcbiAgICAgICAgaWYgKG9wdCkge1xuICAgICAgICAgIGNvbnN0IFtrZXksIC4uLnJlc3RdID0gb3B0LnNwbGl0KCc6Jyk7XG4gICAgICAgICAgY29uc3QgdmFsID0gcmVzdFxuICAgICAgICAgICAgLmpvaW4oJzonKVxuICAgICAgICAgICAgLnRyaW0oKVxuICAgICAgICAgICAgLnJlcGxhY2UoL14nK3wnKyQvZywgJycpOyAvLyB0cmltIGFuZCByZXBsYWNlICcnXG5cbiAgICAgICAgICBjb25zdCB0cmltbWVkS2V5ID0ga2V5LnRyaW0oKTtcblxuICAgICAgICAgIGlmICghZm9ybWF0T3B0aW9uc1t0cmltbWVkS2V5XSkgZm9ybWF0T3B0aW9uc1t0cmltbWVkS2V5XSA9IHZhbDtcbiAgICAgICAgICBpZiAodmFsID09PSAnZmFsc2UnKSBmb3JtYXRPcHRpb25zW3RyaW1tZWRLZXldID0gZmFsc2U7XG4gICAgICAgICAgaWYgKHZhbCA9PT0gJ3RydWUnKSBmb3JtYXRPcHRpb25zW3RyaW1tZWRLZXldID0gdHJ1ZTtcbiAgICAgICAgICBpZiAoIWlzTmFOKHZhbCkpIGZvcm1hdE9wdGlvbnNbdHJpbW1lZEtleV0gPSBwYXJzZUludCh2YWwsIDEwKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBmb3JtYXROYW1lLFxuICAgIGZvcm1hdE9wdGlvbnMsXG4gIH07XG59O1xuXG5jb25zdCBjcmVhdGVDYWNoZWRGb3JtYXR0ZXIgPSAoZm4pID0+IHtcbiAgY29uc3QgY2FjaGUgPSB7fTtcbiAgcmV0dXJuICh2LCBsLCBvKSA9PiB7XG4gICAgbGV0IG9wdEZvckNhY2hlID0gbztcbiAgICAvLyB0aGlzIGNhY2hlIG9wdGltaXphdGlvbiB3aWxsIG9ubHkgd29yayBmb3Iga2V5cyBoYXZpbmcgMSBpbnRlcnBvbGF0ZWQgdmFsdWVcbiAgICBpZiAoXG4gICAgICBvICYmXG4gICAgICBvLmludGVycG9sYXRpb25rZXkgJiZcbiAgICAgIG8uZm9ybWF0UGFyYW1zICYmXG4gICAgICBvLmZvcm1hdFBhcmFtc1tvLmludGVycG9sYXRpb25rZXldICYmXG4gICAgICBvW28uaW50ZXJwb2xhdGlvbmtleV1cbiAgICApIHtcbiAgICAgIG9wdEZvckNhY2hlID0ge1xuICAgICAgICAuLi5vcHRGb3JDYWNoZSxcbiAgICAgICAgW28uaW50ZXJwb2xhdGlvbmtleV06IHVuZGVmaW5lZCxcbiAgICAgIH07XG4gICAgfVxuICAgIGNvbnN0IGtleSA9IGwgKyBKU09OLnN0cmluZ2lmeShvcHRGb3JDYWNoZSk7XG4gICAgbGV0IGZybSA9IGNhY2hlW2tleV07XG4gICAgaWYgKCFmcm0pIHtcbiAgICAgIGZybSA9IGZuKGdldENsZWFuZWRDb2RlKGwpLCBvKTtcbiAgICAgIGNhY2hlW2tleV0gPSBmcm07XG4gICAgfVxuICAgIHJldHVybiBmcm0odik7XG4gIH07XG59O1xuXG5jb25zdCBjcmVhdGVOb25DYWNoZWRGb3JtYXR0ZXIgPSAoZm4pID0+ICh2LCBsLCBvKSA9PiBmbihnZXRDbGVhbmVkQ29kZShsKSwgbykodik7XG5cbmNsYXNzIEZvcm1hdHRlciB7XG4gIGNvbnN0cnVjdG9yKG9wdGlvbnMgPSB7fSkge1xuICAgIHRoaXMubG9nZ2VyID0gYmFzZUxvZ2dlci5jcmVhdGUoJ2Zvcm1hdHRlcicpO1xuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG4gICAgdGhpcy5pbml0KG9wdGlvbnMpO1xuICB9XG5cbiAgaW5pdChzZXJ2aWNlcywgb3B0aW9ucyA9IHsgaW50ZXJwb2xhdGlvbjoge30gfSkge1xuICAgIHRoaXMuZm9ybWF0U2VwYXJhdG9yID0gb3B0aW9ucy5pbnRlcnBvbGF0aW9uLmZvcm1hdFNlcGFyYXRvciB8fCAnLCc7XG4gICAgY29uc3QgY2YgPSBvcHRpb25zLmNhY2hlSW5CdWlsdEZvcm1hdHMgPyBjcmVhdGVDYWNoZWRGb3JtYXR0ZXIgOiBjcmVhdGVOb25DYWNoZWRGb3JtYXR0ZXI7XG4gICAgdGhpcy5mb3JtYXRzID0ge1xuICAgICAgbnVtYmVyOiBjZigobG5nLCBvcHQpID0+IHtcbiAgICAgICAgY29uc3QgZm9ybWF0dGVyID0gbmV3IEludGwuTnVtYmVyRm9ybWF0KGxuZywgeyAuLi5vcHQgfSk7XG4gICAgICAgIHJldHVybiAodmFsKSA9PiBmb3JtYXR0ZXIuZm9ybWF0KHZhbCk7XG4gICAgICB9KSxcbiAgICAgIGN1cnJlbmN5OiBjZigobG5nLCBvcHQpID0+IHtcbiAgICAgICAgY29uc3QgZm9ybWF0dGVyID0gbmV3IEludGwuTnVtYmVyRm9ybWF0KGxuZywgeyAuLi5vcHQsIHN0eWxlOiAnY3VycmVuY3knIH0pO1xuICAgICAgICByZXR1cm4gKHZhbCkgPT4gZm9ybWF0dGVyLmZvcm1hdCh2YWwpO1xuICAgICAgfSksXG4gICAgICBkYXRldGltZTogY2YoKGxuZywgb3B0KSA9PiB7XG4gICAgICAgIGNvbnN0IGZvcm1hdHRlciA9IG5ldyBJbnRsLkRhdGVUaW1lRm9ybWF0KGxuZywgeyAuLi5vcHQgfSk7XG4gICAgICAgIHJldHVybiAodmFsKSA9PiBmb3JtYXR0ZXIuZm9ybWF0KHZhbCk7XG4gICAgICB9KSxcbiAgICAgIHJlbGF0aXZldGltZTogY2YoKGxuZywgb3B0KSA9PiB7XG4gICAgICAgIGNvbnN0IGZvcm1hdHRlciA9IG5ldyBJbnRsLlJlbGF0aXZlVGltZUZvcm1hdChsbmcsIHsgLi4ub3B0IH0pO1xuICAgICAgICByZXR1cm4gKHZhbCkgPT4gZm9ybWF0dGVyLmZvcm1hdCh2YWwsIG9wdC5yYW5nZSB8fCAnZGF5Jyk7XG4gICAgICB9KSxcbiAgICAgIGxpc3Q6IGNmKChsbmcsIG9wdCkgPT4ge1xuICAgICAgICBjb25zdCBmb3JtYXR0ZXIgPSBuZXcgSW50bC5MaXN0Rm9ybWF0KGxuZywgeyAuLi5vcHQgfSk7XG4gICAgICAgIHJldHVybiAodmFsKSA9PiBmb3JtYXR0ZXIuZm9ybWF0KHZhbCk7XG4gICAgICB9KSxcbiAgICB9O1xuICB9XG5cbiAgYWRkKG5hbWUsIGZjKSB7XG4gICAgdGhpcy5mb3JtYXRzW25hbWUudG9Mb3dlckNhc2UoKS50cmltKCldID0gZmM7XG4gIH1cblxuICBhZGRDYWNoZWQobmFtZSwgZmMpIHtcbiAgICB0aGlzLmZvcm1hdHNbbmFtZS50b0xvd2VyQ2FzZSgpLnRyaW0oKV0gPSBjcmVhdGVDYWNoZWRGb3JtYXR0ZXIoZmMpO1xuICB9XG5cbiAgZm9ybWF0KHZhbHVlLCBmb3JtYXQsIGxuZywgb3B0aW9ucyA9IHt9KSB7XG4gICAgaWYgKCFmb3JtYXQpIHJldHVybiB2YWx1ZTtcbiAgICBpZiAodmFsdWUgPT0gbnVsbCkgcmV0dXJuIHZhbHVlO1xuICAgIGNvbnN0IGZvcm1hdHMgPSBmb3JtYXQuc3BsaXQodGhpcy5mb3JtYXRTZXBhcmF0b3IpO1xuICAgIGlmIChcbiAgICAgIGZvcm1hdHMubGVuZ3RoID4gMSAmJlxuICAgICAgZm9ybWF0c1swXS5pbmRleE9mKCcoJykgPiAxICYmXG4gICAgICAhZm9ybWF0c1swXS5pbmNsdWRlcygnKScpICYmXG4gICAgICBmb3JtYXRzLmZpbmQoKGYpID0+IGYuaW5jbHVkZXMoJyknKSlcbiAgICApIHtcbiAgICAgIGNvbnN0IGxhc3RJbmRleCA9IGZvcm1hdHMuZmluZEluZGV4KChmKSA9PiBmLmluY2x1ZGVzKCcpJykpO1xuICAgICAgZm9ybWF0c1swXSA9IFtmb3JtYXRzWzBdLCAuLi5mb3JtYXRzLnNwbGljZSgxLCBsYXN0SW5kZXgpXS5qb2luKHRoaXMuZm9ybWF0U2VwYXJhdG9yKTtcbiAgICB9XG5cbiAgICBjb25zdCByZXN1bHQgPSBmb3JtYXRzLnJlZHVjZSgobWVtLCBmKSA9PiB7XG4gICAgICBjb25zdCB7IGZvcm1hdE5hbWUsIGZvcm1hdE9wdGlvbnMgfSA9IHBhcnNlRm9ybWF0U3RyKGYpO1xuXG4gICAgICBpZiAodGhpcy5mb3JtYXRzW2Zvcm1hdE5hbWVdKSB7XG4gICAgICAgIGxldCBmb3JtYXR0ZWQgPSBtZW07XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgLy8gb3B0aW9ucyBwYXNzZWQgZXhwbGljaXQgZm9yIHRoYXQgZm9ybWF0dGVkIHZhbHVlXG4gICAgICAgICAgY29uc3QgdmFsT3B0aW9ucyA9IG9wdGlvbnM/LmZvcm1hdFBhcmFtcz8uW29wdGlvbnMuaW50ZXJwb2xhdGlvbmtleV0gfHwge307XG5cbiAgICAgICAgICAvLyBsYW5ndWFnZVxuICAgICAgICAgIGNvbnN0IGwgPSB2YWxPcHRpb25zLmxvY2FsZSB8fCB2YWxPcHRpb25zLmxuZyB8fCBvcHRpb25zLmxvY2FsZSB8fCBvcHRpb25zLmxuZyB8fCBsbmc7XG5cbiAgICAgICAgICBmb3JtYXR0ZWQgPSB0aGlzLmZvcm1hdHNbZm9ybWF0TmFtZV0obWVtLCBsLCB7XG4gICAgICAgICAgICAuLi5mb3JtYXRPcHRpb25zLFxuICAgICAgICAgICAgLi4ub3B0aW9ucyxcbiAgICAgICAgICAgIC4uLnZhbE9wdGlvbnMsXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgdGhpcy5sb2dnZXIud2FybihlcnJvcik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZvcm1hdHRlZDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMubG9nZ2VyLndhcm4oYHRoZXJlIHdhcyBubyBmb3JtYXQgZnVuY3Rpb24gZm9yICR7Zm9ybWF0TmFtZX1gKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBtZW07XG4gICAgfSwgdmFsdWUpO1xuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBGb3JtYXR0ZXI7XG4iLCJpbXBvcnQgeyBwdXNoUGF0aCwgaXNTdHJpbmcgfSBmcm9tICcuL3V0aWxzLmpzJztcbmltcG9ydCBiYXNlTG9nZ2VyIGZyb20gJy4vbG9nZ2VyLmpzJztcbmltcG9ydCBFdmVudEVtaXR0ZXIgZnJvbSAnLi9FdmVudEVtaXR0ZXIuanMnO1xuXG5jb25zdCByZW1vdmVQZW5kaW5nID0gKHEsIG5hbWUpID0+IHtcbiAgaWYgKHEucGVuZGluZ1tuYW1lXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgZGVsZXRlIHEucGVuZGluZ1tuYW1lXTtcbiAgICBxLnBlbmRpbmdDb3VudC0tO1xuICB9XG59O1xuXG5jbGFzcyBDb25uZWN0b3IgZXh0ZW5kcyBFdmVudEVtaXR0ZXIge1xuICBjb25zdHJ1Y3RvcihiYWNrZW5kLCBzdG9yZSwgc2VydmljZXMsIG9wdGlvbnMgPSB7fSkge1xuICAgIHN1cGVyKCk7XG5cbiAgICB0aGlzLmJhY2tlbmQgPSBiYWNrZW5kO1xuICAgIHRoaXMuc3RvcmUgPSBzdG9yZTtcbiAgICB0aGlzLnNlcnZpY2VzID0gc2VydmljZXM7XG4gICAgdGhpcy5sYW5ndWFnZVV0aWxzID0gc2VydmljZXMubGFuZ3VhZ2VVdGlscztcbiAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuICAgIHRoaXMubG9nZ2VyID0gYmFzZUxvZ2dlci5jcmVhdGUoJ2JhY2tlbmRDb25uZWN0b3InKTtcblxuICAgIHRoaXMud2FpdGluZ1JlYWRzID0gW107XG4gICAgdGhpcy5tYXhQYXJhbGxlbFJlYWRzID0gb3B0aW9ucy5tYXhQYXJhbGxlbFJlYWRzIHx8IDEwO1xuICAgIHRoaXMucmVhZGluZ0NhbGxzID0gMDtcblxuICAgIHRoaXMubWF4UmV0cmllcyA9IG9wdGlvbnMubWF4UmV0cmllcyA+PSAwID8gb3B0aW9ucy5tYXhSZXRyaWVzIDogNTtcbiAgICB0aGlzLnJldHJ5VGltZW91dCA9IG9wdGlvbnMucmV0cnlUaW1lb3V0ID49IDEgPyBvcHRpb25zLnJldHJ5VGltZW91dCA6IDM1MDtcblxuICAgIHRoaXMuc3RhdGUgPSB7fTtcbiAgICB0aGlzLnF1ZXVlID0gW107XG5cbiAgICB0aGlzLmJhY2tlbmQ/LmluaXQ/LihzZXJ2aWNlcywgb3B0aW9ucy5iYWNrZW5kLCBvcHRpb25zKTtcbiAgfVxuXG4gIHF1ZXVlTG9hZChsYW5ndWFnZXMsIG5hbWVzcGFjZXMsIG9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gICAgLy8gZmluZCB3aGF0IG5lZWRzIHRvIGJlIGxvYWRlZFxuICAgIGNvbnN0IHRvTG9hZCA9IHt9O1xuICAgIGNvbnN0IHBlbmRpbmcgPSB7fTtcbiAgICBjb25zdCB0b0xvYWRMYW5ndWFnZXMgPSB7fTtcbiAgICBjb25zdCB0b0xvYWROYW1lc3BhY2VzID0ge307XG5cbiAgICBsYW5ndWFnZXMuZm9yRWFjaCgobG5nKSA9PiB7XG4gICAgICBsZXQgaGFzQWxsTmFtZXNwYWNlcyA9IHRydWU7XG5cbiAgICAgIG5hbWVzcGFjZXMuZm9yRWFjaCgobnMpID0+IHtcbiAgICAgICAgY29uc3QgbmFtZSA9IGAke2xuZ318JHtuc31gO1xuXG4gICAgICAgIGlmICghb3B0aW9ucy5yZWxvYWQgJiYgdGhpcy5zdG9yZS5oYXNSZXNvdXJjZUJ1bmRsZShsbmcsIG5zKSkge1xuICAgICAgICAgIHRoaXMuc3RhdGVbbmFtZV0gPSAyOyAvLyBsb2FkZWRcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLnN0YXRlW25hbWVdIDwgMCkge1xuICAgICAgICAgIC8vIG5vdGhpbmcgdG8gZG8gZm9yIGVyclxuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuc3RhdGVbbmFtZV0gPT09IDEpIHtcbiAgICAgICAgICBpZiAocGVuZGluZ1tuYW1lXSA9PT0gdW5kZWZpbmVkKSBwZW5kaW5nW25hbWVdID0gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLnN0YXRlW25hbWVdID0gMTsgLy8gcGVuZGluZ1xuXG4gICAgICAgICAgaGFzQWxsTmFtZXNwYWNlcyA9IGZhbHNlO1xuXG4gICAgICAgICAgaWYgKHBlbmRpbmdbbmFtZV0gPT09IHVuZGVmaW5lZCkgcGVuZGluZ1tuYW1lXSA9IHRydWU7XG4gICAgICAgICAgaWYgKHRvTG9hZFtuYW1lXSA9PT0gdW5kZWZpbmVkKSB0b0xvYWRbbmFtZV0gPSB0cnVlO1xuICAgICAgICAgIGlmICh0b0xvYWROYW1lc3BhY2VzW25zXSA9PT0gdW5kZWZpbmVkKSB0b0xvYWROYW1lc3BhY2VzW25zXSA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICBpZiAoIWhhc0FsbE5hbWVzcGFjZXMpIHRvTG9hZExhbmd1YWdlc1tsbmddID0gdHJ1ZTtcbiAgICB9KTtcblxuICAgIGlmIChPYmplY3Qua2V5cyh0b0xvYWQpLmxlbmd0aCB8fCBPYmplY3Qua2V5cyhwZW5kaW5nKS5sZW5ndGgpIHtcbiAgICAgIHRoaXMucXVldWUucHVzaCh7XG4gICAgICAgIHBlbmRpbmcsXG4gICAgICAgIHBlbmRpbmdDb3VudDogT2JqZWN0LmtleXMocGVuZGluZykubGVuZ3RoLFxuICAgICAgICBsb2FkZWQ6IHt9LFxuICAgICAgICBlcnJvcnM6IFtdLFxuICAgICAgICBjYWxsYmFjayxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICB0b0xvYWQ6IE9iamVjdC5rZXlzKHRvTG9hZCksXG4gICAgICBwZW5kaW5nOiBPYmplY3Qua2V5cyhwZW5kaW5nKSxcbiAgICAgIHRvTG9hZExhbmd1YWdlczogT2JqZWN0LmtleXModG9Mb2FkTGFuZ3VhZ2VzKSxcbiAgICAgIHRvTG9hZE5hbWVzcGFjZXM6IE9iamVjdC5rZXlzKHRvTG9hZE5hbWVzcGFjZXMpLFxuICAgIH07XG4gIH1cblxuICBsb2FkZWQobmFtZSwgZXJyLCBkYXRhKSB7XG4gICAgY29uc3QgcyA9IG5hbWUuc3BsaXQoJ3wnKTtcbiAgICBjb25zdCBsbmcgPSBzWzBdO1xuICAgIGNvbnN0IG5zID0gc1sxXTtcblxuICAgIGlmIChlcnIpIHRoaXMuZW1pdCgnZmFpbGVkTG9hZGluZycsIGxuZywgbnMsIGVycik7XG5cbiAgICBpZiAoIWVyciAmJiBkYXRhKSB7XG4gICAgICB0aGlzLnN0b3JlLmFkZFJlc291cmNlQnVuZGxlKGxuZywgbnMsIGRhdGEsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCB7IHNraXBDb3B5OiB0cnVlIH0pO1xuICAgIH1cblxuICAgIC8vIHNldCBsb2FkZWRcbiAgICB0aGlzLnN0YXRlW25hbWVdID0gZXJyID8gLTEgOiAyO1xuICAgIGlmIChlcnIgJiYgZGF0YSkgdGhpcy5zdGF0ZVtuYW1lXSA9IDA7XG5cbiAgICAvLyBjb25zb2xpZGF0ZWQgbG9hZGluZyBkb25lIGluIHRoaXMgcnVuIC0gb25seSBlbWl0IG9uY2UgZm9yIGEgbG9hZGVkIG5hbWVzcGFjZVxuICAgIGNvbnN0IGxvYWRlZCA9IHt9O1xuXG4gICAgLy8gY2FsbGJhY2sgaWYgcmVhZHlcbiAgICB0aGlzLnF1ZXVlLmZvckVhY2goKHEpID0+IHtcbiAgICAgIHB1c2hQYXRoKHEubG9hZGVkLCBbbG5nXSwgbnMpO1xuICAgICAgcmVtb3ZlUGVuZGluZyhxLCBuYW1lKTtcblxuICAgICAgaWYgKGVycikgcS5lcnJvcnMucHVzaChlcnIpO1xuXG4gICAgICBpZiAocS5wZW5kaW5nQ291bnQgPT09IDAgJiYgIXEuZG9uZSkge1xuICAgICAgICAvLyBvbmx5IGRvIG9uY2UgcGVyIGxvYWRlZCAtPiB0aGlzLmVtaXQoJ2xvYWRlZCcsIHEubG9hZGVkKTtcbiAgICAgICAgT2JqZWN0LmtleXMocS5sb2FkZWQpLmZvckVhY2goKGwpID0+IHtcbiAgICAgICAgICBpZiAoIWxvYWRlZFtsXSkgbG9hZGVkW2xdID0ge307XG4gICAgICAgICAgY29uc3QgbG9hZGVkS2V5cyA9IHEubG9hZGVkW2xdO1xuICAgICAgICAgIGlmIChsb2FkZWRLZXlzLmxlbmd0aCkge1xuICAgICAgICAgICAgbG9hZGVkS2V5cy5mb3JFYWNoKChuKSA9PiB7XG4gICAgICAgICAgICAgIGlmIChsb2FkZWRbbF1bbl0gPT09IHVuZGVmaW5lZCkgbG9hZGVkW2xdW25dID0gdHJ1ZTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgcS5kb25lID0gdHJ1ZTtcbiAgICAgICAgaWYgKHEuZXJyb3JzLmxlbmd0aCkge1xuICAgICAgICAgIHEuY2FsbGJhY2socS5lcnJvcnMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHEuY2FsbGJhY2soKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gZW1pdCBjb25zb2xpZGF0ZWQgbG9hZGVkIGV2ZW50XG4gICAgdGhpcy5lbWl0KCdsb2FkZWQnLCBsb2FkZWQpO1xuXG4gICAgLy8gcmVtb3ZlIGRvbmUgbG9hZCByZXF1ZXN0c1xuICAgIHRoaXMucXVldWUgPSB0aGlzLnF1ZXVlLmZpbHRlcigocSkgPT4gIXEuZG9uZSk7XG4gIH1cblxuICByZWFkKGxuZywgbnMsIGZjTmFtZSwgdHJpZWQgPSAwLCB3YWl0ID0gdGhpcy5yZXRyeVRpbWVvdXQsIGNhbGxiYWNrKSB7XG4gICAgaWYgKCFsbmcubGVuZ3RoKSByZXR1cm4gY2FsbGJhY2sobnVsbCwge30pOyAvLyBub3RpbmcgdG8gbG9hZFxuXG4gICAgLy8gTGltaXQgcGFyYWxsZWxpc20gb2YgY2FsbHMgdG8gYmFja2VuZFxuICAgIC8vIFRoaXMgaXMgbmVlZGVkIHRvIHByZXZlbnQgdHJ5aW5nIHRvIG9wZW4gdGhvdXNhbmRzIG9mXG4gICAgLy8gc29ja2V0cyBvciBmaWxlIGRlc2NyaXB0b3JzLCB3aGljaCBjYW4gY2F1c2UgZmFpbHVyZXNcbiAgICAvLyBhbmQgYWN0dWFsbHkgbWFrZSB0aGUgZW50aXJlIHByb2Nlc3MgdGFrZSBsb25nZXIuXG4gICAgaWYgKHRoaXMucmVhZGluZ0NhbGxzID49IHRoaXMubWF4UGFyYWxsZWxSZWFkcykge1xuICAgICAgdGhpcy53YWl0aW5nUmVhZHMucHVzaCh7IGxuZywgbnMsIGZjTmFtZSwgdHJpZWQsIHdhaXQsIGNhbGxiYWNrIH0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLnJlYWRpbmdDYWxscysrO1xuXG4gICAgY29uc3QgcmVzb2x2ZXIgPSAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICB0aGlzLnJlYWRpbmdDYWxscy0tO1xuICAgICAgaWYgKHRoaXMud2FpdGluZ1JlYWRzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgY29uc3QgbmV4dCA9IHRoaXMud2FpdGluZ1JlYWRzLnNoaWZ0KCk7XG4gICAgICAgIHRoaXMucmVhZChuZXh0LmxuZywgbmV4dC5ucywgbmV4dC5mY05hbWUsIG5leHQudHJpZWQsIG5leHQud2FpdCwgbmV4dC5jYWxsYmFjayk7XG4gICAgICB9XG4gICAgICBpZiAoZXJyICYmIGRhdGEgLyogPSByZXRyeUZsYWcgKi8gJiYgdHJpZWQgPCB0aGlzLm1heFJldHJpZXMpIHtcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgdGhpcy5yZWFkKGxuZywgbnMsIGZjTmFtZSwgdHJpZWQgKyAxLCB3YWl0ICogMiwgY2FsbGJhY2spO1xuICAgICAgICB9LCB3YWl0KTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgY2FsbGJhY2soZXJyLCBkYXRhKTtcbiAgICB9O1xuXG4gICAgY29uc3QgZmMgPSB0aGlzLmJhY2tlbmRbZmNOYW1lXS5iaW5kKHRoaXMuYmFja2VuZCk7XG4gICAgaWYgKGZjLmxlbmd0aCA9PT0gMikge1xuICAgICAgLy8gbm8gY2FsbGJhY2tcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IHIgPSBmYyhsbmcsIG5zKTtcbiAgICAgICAgaWYgKHIgJiYgdHlwZW9mIHIudGhlbiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgIC8vIHByb21pc2VcbiAgICAgICAgICByLnRoZW4oKGRhdGEpID0+IHJlc29sdmVyKG51bGwsIGRhdGEpKS5jYXRjaChyZXNvbHZlcik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gc3luY1xuICAgICAgICAgIHJlc29sdmVyKG51bGwsIHIpO1xuICAgICAgICB9XG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgcmVzb2x2ZXIoZXJyKTtcbiAgICAgIH1cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBub3JtYWwgd2l0aCBjYWxsYmFja1xuICAgIHJldHVybiBmYyhsbmcsIG5zLCByZXNvbHZlcik7XG4gIH1cblxuICBwcmVwYXJlTG9hZGluZyhsYW5ndWFnZXMsIG5hbWVzcGFjZXMsIG9wdGlvbnMgPSB7fSwgY2FsbGJhY2spIHtcbiAgICBpZiAoIXRoaXMuYmFja2VuZCkge1xuICAgICAgdGhpcy5sb2dnZXIud2FybignTm8gYmFja2VuZCB3YXMgYWRkZWQgdmlhIGkxOG5leHQudXNlLiBXaWxsIG5vdCBsb2FkIHJlc291cmNlcy4nKTtcbiAgICAgIHJldHVybiBjYWxsYmFjayAmJiBjYWxsYmFjaygpO1xuICAgIH1cblxuICAgIGlmIChpc1N0cmluZyhsYW5ndWFnZXMpKSBsYW5ndWFnZXMgPSB0aGlzLmxhbmd1YWdlVXRpbHMudG9SZXNvbHZlSGllcmFyY2h5KGxhbmd1YWdlcyk7XG4gICAgaWYgKGlzU3RyaW5nKG5hbWVzcGFjZXMpKSBuYW1lc3BhY2VzID0gW25hbWVzcGFjZXNdO1xuXG4gICAgY29uc3QgdG9Mb2FkID0gdGhpcy5xdWV1ZUxvYWQobGFuZ3VhZ2VzLCBuYW1lc3BhY2VzLCBvcHRpb25zLCBjYWxsYmFjayk7XG4gICAgaWYgKCF0b0xvYWQudG9Mb2FkLmxlbmd0aCkge1xuICAgICAgaWYgKCF0b0xvYWQucGVuZGluZy5sZW5ndGgpIGNhbGxiYWNrKCk7IC8vIG5vdGhpbmcgdG8gbG9hZCBhbmQgbm8gcGVuZGluZ3MuLi5jYWxsYmFjayBub3dcbiAgICAgIHJldHVybiBudWxsOyAvLyBwZW5kaW5ncyB3aWxsIHRyaWdnZXIgY2FsbGJhY2tcbiAgICB9XG5cbiAgICB0b0xvYWQudG9Mb2FkLmZvckVhY2goKG5hbWUpID0+IHtcbiAgICAgIHRoaXMubG9hZE9uZShuYW1lKTtcbiAgICB9KTtcbiAgfVxuXG4gIGxvYWQobGFuZ3VhZ2VzLCBuYW1lc3BhY2VzLCBjYWxsYmFjaykge1xuICAgIHRoaXMucHJlcGFyZUxvYWRpbmcobGFuZ3VhZ2VzLCBuYW1lc3BhY2VzLCB7fSwgY2FsbGJhY2spO1xuICB9XG5cbiAgcmVsb2FkKGxhbmd1YWdlcywgbmFtZXNwYWNlcywgY2FsbGJhY2spIHtcbiAgICB0aGlzLnByZXBhcmVMb2FkaW5nKGxhbmd1YWdlcywgbmFtZXNwYWNlcywgeyByZWxvYWQ6IHRydWUgfSwgY2FsbGJhY2spO1xuICB9XG5cbiAgbG9hZE9uZShuYW1lLCBwcmVmaXggPSAnJykge1xuICAgIGNvbnN0IHMgPSBuYW1lLnNwbGl0KCd8Jyk7XG4gICAgY29uc3QgbG5nID0gc1swXTtcbiAgICBjb25zdCBucyA9IHNbMV07XG5cbiAgICB0aGlzLnJlYWQobG5nLCBucywgJ3JlYWQnLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgaWYgKGVycikgdGhpcy5sb2dnZXIud2FybihgJHtwcmVmaXh9bG9hZGluZyBuYW1lc3BhY2UgJHtuc30gZm9yIGxhbmd1YWdlICR7bG5nfSBmYWlsZWRgLCBlcnIpO1xuICAgICAgaWYgKCFlcnIgJiYgZGF0YSlcbiAgICAgICAgdGhpcy5sb2dnZXIubG9nKGAke3ByZWZpeH1sb2FkZWQgbmFtZXNwYWNlICR7bnN9IGZvciBsYW5ndWFnZSAke2xuZ31gLCBkYXRhKTtcblxuICAgICAgdGhpcy5sb2FkZWQobmFtZSwgZXJyLCBkYXRhKTtcbiAgICB9KTtcbiAgfVxuXG4gIHNhdmVNaXNzaW5nKGxhbmd1YWdlcywgbmFtZXNwYWNlLCBrZXksIGZhbGxiYWNrVmFsdWUsIGlzVXBkYXRlLCBvcHRpb25zID0ge30sIGNsYiA9ICgpID0+IHt9KSB7XG4gICAgaWYgKFxuICAgICAgdGhpcy5zZXJ2aWNlcz8udXRpbHM/Lmhhc0xvYWRlZE5hbWVzcGFjZSAmJlxuICAgICAgIXRoaXMuc2VydmljZXM/LnV0aWxzPy5oYXNMb2FkZWROYW1lc3BhY2UobmFtZXNwYWNlKVxuICAgICkge1xuICAgICAgdGhpcy5sb2dnZXIud2FybihcbiAgICAgICAgYGRpZCBub3Qgc2F2ZSBrZXkgXCIke2tleX1cIiBhcyB0aGUgbmFtZXNwYWNlIFwiJHtuYW1lc3BhY2V9XCIgd2FzIG5vdCB5ZXQgbG9hZGVkYCxcbiAgICAgICAgJ1RoaXMgbWVhbnMgc29tZXRoaW5nIElTIFdST05HIGluIHlvdXIgc2V0dXAuIFlvdSBhY2Nlc3MgdGhlIHQgZnVuY3Rpb24gYmVmb3JlIGkxOG5leHQuaW5pdCAvIGkxOG5leHQubG9hZE5hbWVzcGFjZSAvIGkxOG5leHQuY2hhbmdlTGFuZ3VhZ2Ugd2FzIGRvbmUuIFdhaXQgZm9yIHRoZSBjYWxsYmFjayBvciBQcm9taXNlIHRvIHJlc29sdmUgYmVmb3JlIGFjY2Vzc2luZyBpdCEhIScsXG4gICAgICApO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIGlnbm9yZSBub24gdmFsaWQga2V5c1xuICAgIGlmIChrZXkgPT09IHVuZGVmaW5lZCB8fCBrZXkgPT09IG51bGwgfHwga2V5ID09PSAnJykgcmV0dXJuO1xuXG4gICAgaWYgKHRoaXMuYmFja2VuZD8uY3JlYXRlKSB7XG4gICAgICBjb25zdCBvcHRzID0ge1xuICAgICAgICAuLi5vcHRpb25zLFxuICAgICAgICBpc1VwZGF0ZSxcbiAgICAgIH07XG4gICAgICBjb25zdCBmYyA9IHRoaXMuYmFja2VuZC5jcmVhdGUuYmluZCh0aGlzLmJhY2tlbmQpO1xuICAgICAgaWYgKGZjLmxlbmd0aCA8IDYpIHtcbiAgICAgICAgLy8gbm8gY2FsbGJhY2tcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBsZXQgcjtcbiAgICAgICAgICBpZiAoZmMubGVuZ3RoID09PSA1KSB7XG4gICAgICAgICAgICAvLyBmdXR1cmUgY2FsbGJhY2stbGVzcyBhcGkgZm9yIGkxOG5leHQtbG9jaXplLWJhY2tlbmRcbiAgICAgICAgICAgIHIgPSBmYyhsYW5ndWFnZXMsIG5hbWVzcGFjZSwga2V5LCBmYWxsYmFja1ZhbHVlLCBvcHRzKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgciA9IGZjKGxhbmd1YWdlcywgbmFtZXNwYWNlLCBrZXksIGZhbGxiYWNrVmFsdWUpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAociAmJiB0eXBlb2Ygci50aGVuID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAvLyBwcm9taXNlXG4gICAgICAgICAgICByLnRoZW4oKGRhdGEpID0+IGNsYihudWxsLCBkYXRhKSkuY2F0Y2goY2xiKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gc3luY1xuICAgICAgICAgICAgY2xiKG51bGwsIHIpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgY2xiKGVycik7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIG5vcm1hbCB3aXRoIGNhbGxiYWNrXG4gICAgICAgIGZjKGxhbmd1YWdlcywgbmFtZXNwYWNlLCBrZXksIGZhbGxiYWNrVmFsdWUsIGNsYiAvKiB1bnVzZWQgY2FsbGJhY2sgKi8sIG9wdHMpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIHdyaXRlIHRvIHN0b3JlIHRvIGF2b2lkIHJlc2VuZGluZ1xuICAgIGlmICghbGFuZ3VhZ2VzIHx8ICFsYW5ndWFnZXNbMF0pIHJldHVybjtcbiAgICB0aGlzLnN0b3JlLmFkZFJlc291cmNlKGxhbmd1YWdlc1swXSwgbmFtZXNwYWNlLCBrZXksIGZhbGxiYWNrVmFsdWUpO1xuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IENvbm5lY3RvcjtcbiIsImltcG9ydCB7IGlzU3RyaW5nIH0gZnJvbSAnLi91dGlscy5qcyc7XG5cbmV4cG9ydCBjb25zdCBnZXQgPSAoKSA9PiAoe1xuICBkZWJ1ZzogZmFsc2UsXG4gIGluaXRBc3luYzogdHJ1ZSxcblxuICBuczogWyd0cmFuc2xhdGlvbiddLFxuICBkZWZhdWx0TlM6IFsndHJhbnNsYXRpb24nXSxcbiAgZmFsbGJhY2tMbmc6IFsnZGV2J10sXG4gIGZhbGxiYWNrTlM6IGZhbHNlLCAvLyBzdHJpbmcgb3IgYXJyYXkgb2YgbmFtZXNwYWNlc1xuXG4gIHN1cHBvcnRlZExuZ3M6IGZhbHNlLCAvLyBhcnJheSB3aXRoIHN1cHBvcnRlZCBsYW5ndWFnZXNcbiAgbm9uRXhwbGljaXRTdXBwb3J0ZWRMbmdzOiBmYWxzZSxcbiAgbG9hZDogJ2FsbCcsIC8vIHwgY3VycmVudE9ubHkgfCBsYW5ndWFnZU9ubHlcbiAgcHJlbG9hZDogZmFsc2UsIC8vIGFycmF5IHdpdGggcHJlbG9hZCBsYW5ndWFnZXNcblxuICBrZXlTZXBhcmF0b3I6ICcuJyxcbiAgbnNTZXBhcmF0b3I6ICc6JyxcbiAgcGx1cmFsU2VwYXJhdG9yOiAnXycsXG4gIGNvbnRleHRTZXBhcmF0b3I6ICdfJyxcblxuICAvLyBTZWxlY3RvciBBUEkgcnVudGltZSBtb2RlLiBNaXJyb3JzIHRoZSBUeXBlT3B0aW9ucyBgZW5hYmxlU2VsZWN0b3JgIGZsYWcuXG4gIC8vIC0gZmFsc2UgLyB0cnVlIC8gJ29wdGltaXplJzogbGVnYWN5IHJ1bGUg4oCUIG9ubHkgYSBsZWFkaW5nICpzZWNvbmRhcnkqIG5hbWVzcGFjZVxuICAvLyAgIGluIGEgbXVsdGktZWxlbWVudCBucyBhcnJheSBpcyByZXdyaXR0ZW4gYXMgYSBuYW1lc3BhY2UgcHJlZml4ICh2MjUuOC4xOSlcbiAgLy8gLSAnc3RyaWN0JzogYWx3YXlzIHRyZWF0IHBhdGhbMF0gYXMgYSBuYW1lc3BhY2UgcHJlZml4IHdoZW4gaXQgbWF0Y2hlcyB0aGVcbiAgLy8gICBzY29wZSdzIG5hbWVzcGFjZSBsaXN0LCBpbmNsdWRpbmcgdGhlIHByaW1hcnkgYW5kIHNpbmdsZS1ucyBob29rcy5cbiAgLy8gICBQYWlycyB3aXRoIGBOc1Jlc291cmNlYCBkcm9wcGluZyBpdHMgZmxhdHRlbmVkLXByaW1hcnkgdW5pb24gYXQgdGhlIHR5cGVcbiAgLy8gICBsZXZlbC4gT3B0LWluOyBkZWZhdWx0IGJlaGF2aW9yIGlzIHVuY2hhbmdlZC5cbiAgZW5hYmxlU2VsZWN0b3I6IGZhbHNlLFxuXG4gIHBhcnRpYWxCdW5kbGVkTGFuZ3VhZ2VzOiBmYWxzZSwgLy8gYWxsb3cgYnVuZGxpbmcgY2VydGFpbiBsYW5ndWFnZXMgdGhhdCBhcmUgbm90IHJlbW90ZWx5IGZldGNoZWRcbiAgc2F2ZU1pc3Npbmc6IGZhbHNlLCAvLyBlbmFibGUgdG8gc2VuZCBtaXNzaW5nIHZhbHVlc1xuICB1cGRhdGVNaXNzaW5nOiBmYWxzZSwgLy8gZW5hYmxlIHRvIHVwZGF0ZSBkZWZhdWx0IHZhbHVlcyBpZiBkaWZmZXJlbnQgZnJvbSB0cmFuc2xhdGVkIHZhbHVlIChvbmx5IHVzZWZ1bCBvbiBpbml0aWFsIGRldmVsb3BtZW50LCBvciB3aGVuIGtlZXBpbmcgY29kZSBhcyBzb3VyY2Ugb2YgdHJ1dGgpXG4gIHNhdmVNaXNzaW5nVG86ICdmYWxsYmFjaycsIC8vICdjdXJyZW50JyB8fCAnYWxsJ1xuICBzYXZlTWlzc2luZ1BsdXJhbHM6IHRydWUsIC8vIHdpbGwgc2F2ZSBhbGwgZm9ybXMgbm90IG9ubHkgc2luZ3VsYXIga2V5XG4gIG1pc3NpbmdLZXlIYW5kbGVyOiBmYWxzZSwgLy8gZnVuY3Rpb24obG5nLCBucywga2V5LCBmYWxsYmFja1ZhbHVlKSAtPiBvdmVycmlkZSBpZiBwcmVmZXIgb24gaGFuZGxpbmdcbiAgbWlzc2luZ0ludGVycG9sYXRpb25IYW5kbGVyOiBmYWxzZSwgLy8gZnVuY3Rpb24oc3RyLCBtYXRjaClcblxuICBwb3N0UHJvY2VzczogZmFsc2UsIC8vIHN0cmluZyBvciBhcnJheSBvZiBwb3N0UHJvY2Vzc29yIG5hbWVzXG4gIHBvc3RQcm9jZXNzUGFzc1Jlc29sdmVkOiBmYWxzZSwgLy8gcGFzcyByZXNvbHZlZCBvYmplY3QgaW50byAnb3B0aW9ucy5pMThuUmVzb2x2ZWQnIGZvciBwb3N0cHJvY2Vzc29yXG4gIHJldHVybk51bGw6IGZhbHNlLCAvLyBhbGxvd3MgbnVsbCB2YWx1ZSBhcyB2YWxpZCB0cmFuc2xhdGlvblxuICByZXR1cm5FbXB0eVN0cmluZzogdHJ1ZSwgLy8gYWxsb3dzIGVtcHR5IHN0cmluZyB2YWx1ZSBhcyB2YWxpZCB0cmFuc2xhdGlvblxuICByZXR1cm5PYmplY3RzOiBmYWxzZSxcbiAgam9pbkFycmF5czogZmFsc2UsIC8vIG9yIHN0cmluZyB0byBqb2luIGFycmF5XG4gIHJldHVybmVkT2JqZWN0SGFuZGxlcjogZmFsc2UsIC8vIGZ1bmN0aW9uKGtleSwgdmFsdWUsIG9wdGlvbnMpIHRyaWdnZXJlZCBpZiBrZXkgcmV0dXJucyBvYmplY3QgYnV0IHJldHVybk9iamVjdHMgaXMgc2V0IHRvIGZhbHNlXG4gIHBhcnNlTWlzc2luZ0tleUhhbmRsZXI6IGZhbHNlLCAvLyBmdW5jdGlvbihrZXkpIHBhcnNlZCBhIGtleSB0aGF0IHdhcyBub3QgZm91bmQgaW4gdCgpIGJlZm9yZSByZXR1cm5pbmdcbiAgYXBwZW5kTmFtZXNwYWNlVG9NaXNzaW5nS2V5OiBmYWxzZSxcbiAgYXBwZW5kTmFtZXNwYWNlVG9DSU1vZGU6IGZhbHNlLFxuICBvdmVybG9hZFRyYW5zbGF0aW9uT3B0aW9uSGFuZGxlcjogKGFyZ3MpID0+IHtcbiAgICBsZXQgcmV0ID0ge307XG4gICAgaWYgKHR5cGVvZiBhcmdzWzFdID09PSAnb2JqZWN0JykgcmV0ID0gYXJnc1sxXTtcbiAgICBpZiAoaXNTdHJpbmcoYXJnc1sxXSkpIHJldC5kZWZhdWx0VmFsdWUgPSBhcmdzWzFdO1xuICAgIGlmIChpc1N0cmluZyhhcmdzWzJdKSkgcmV0LnREZXNjcmlwdGlvbiA9IGFyZ3NbMl07XG4gICAgaWYgKHR5cGVvZiBhcmdzWzJdID09PSAnb2JqZWN0JyB8fCB0eXBlb2YgYXJnc1szXSA9PT0gJ29iamVjdCcpIHtcbiAgICAgIGNvbnN0IG9wdGlvbnMgPSBhcmdzWzNdIHx8IGFyZ3NbMl07XG4gICAgICBPYmplY3Qua2V5cyhvcHRpb25zKS5mb3JFYWNoKChrZXkpID0+IHtcbiAgICAgICAgcmV0W2tleV0gPSBvcHRpb25zW2tleV07XG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbiAgfSxcbiAgaW50ZXJwb2xhdGlvbjoge1xuICAgIGVzY2FwZVZhbHVlOiB0cnVlLFxuICAgIHByZWZpeDogJ3t7JyxcbiAgICBzdWZmaXg6ICd9fScsXG4gICAgZm9ybWF0U2VwYXJhdG9yOiAnLCcsXG4gICAgLy8gcHJlZml4RXNjYXBlZDogJ3t7JyxcbiAgICAvLyBzdWZmaXhFc2NhcGVkOiAnfX0nLFxuICAgIC8vIHVuZXNjYXBlU3VmZml4OiAnJyxcbiAgICB1bmVzY2FwZVByZWZpeDogJy0nLFxuXG4gICAgbmVzdGluZ1ByZWZpeDogJyR0KCcsXG4gICAgbmVzdGluZ1N1ZmZpeDogJyknLFxuICAgIG5lc3RpbmdPcHRpb25zU2VwYXJhdG9yOiAnLCcsXG4gICAgLy8gbmVzdGluZ1ByZWZpeEVzY2FwZWQ6ICckdCgnLFxuICAgIC8vIG5lc3RpbmdTdWZmaXhFc2NhcGVkOiAnKScsXG4gICAgLy8gZGVmYXVsdFZhcmlhYmxlczogdW5kZWZpbmVkIC8vIG9iamVjdCB0aGF0IGNhbiBoYXZlIHZhbHVlcyB0byBpbnRlcnBvbGF0ZSBvbiAtIGV4dGVuZHMgcGFzc2VkIGluIGludGVycG9sYXRpb24gZGF0YVxuICAgIG1heFJlcGxhY2VzOiAxMDAwLCAvLyBtYXggcmVwbGFjZXMgdG8gcHJldmVudCBlbmRsZXNzIGxvb3BcbiAgICBza2lwT25WYXJpYWJsZXM6IHRydWUsXG4gIH0sXG4gIGNhY2hlSW5CdWlsdEZvcm1hdHM6IHRydWUsXG59KTtcblxuZXhwb3J0IGNvbnN0IHRyYW5zZm9ybU9wdGlvbnMgPSAob3B0aW9ucykgPT4ge1xuICAvLyBjcmVhdGUgbmFtZXNwYWNlIG9iamVjdCBpZiBuYW1lc3BhY2UgaXMgcGFzc2VkIGluIGFzIHN0cmluZ1xuICBpZiAoaXNTdHJpbmcob3B0aW9ucy5ucykpIG9wdGlvbnMubnMgPSBbb3B0aW9ucy5uc107XG4gIGlmIChpc1N0cmluZyhvcHRpb25zLmZhbGxiYWNrTG5nKSkgb3B0aW9ucy5mYWxsYmFja0xuZyA9IFtvcHRpb25zLmZhbGxiYWNrTG5nXTtcbiAgaWYgKGlzU3RyaW5nKG9wdGlvbnMuZmFsbGJhY2tOUykpIG9wdGlvbnMuZmFsbGJhY2tOUyA9IFtvcHRpb25zLmZhbGxiYWNrTlNdO1xuXG4gIC8vIGV4dGVuZCBzdXBwb3J0ZWRMbmdzIHdpdGggY2ltb2RlXG4gIGlmIChvcHRpb25zLnN1cHBvcnRlZExuZ3MgJiYgIW9wdGlvbnMuc3VwcG9ydGVkTG5ncy5pbmNsdWRlcygnY2ltb2RlJykpIHtcbiAgICBvcHRpb25zLnN1cHBvcnRlZExuZ3MgPSBvcHRpb25zLnN1cHBvcnRlZExuZ3MuY29uY2F0KFsnY2ltb2RlJ10pO1xuICB9XG5cbiAgcmV0dXJuIG9wdGlvbnM7XG59O1xuIiwiaW1wb3J0IGJhc2VMb2dnZXIgZnJvbSAnLi9sb2dnZXIuanMnO1xuaW1wb3J0IEV2ZW50RW1pdHRlciBmcm9tICcuL0V2ZW50RW1pdHRlci5qcyc7XG5pbXBvcnQgUmVzb3VyY2VTdG9yZSBmcm9tICcuL1Jlc291cmNlU3RvcmUuanMnO1xuaW1wb3J0IFRyYW5zbGF0b3IgZnJvbSAnLi9UcmFuc2xhdG9yLmpzJztcbmltcG9ydCBMYW5ndWFnZVV0aWxzIGZyb20gJy4vTGFuZ3VhZ2VVdGlscy5qcyc7XG5pbXBvcnQgUGx1cmFsUmVzb2x2ZXIgZnJvbSAnLi9QbHVyYWxSZXNvbHZlci5qcyc7XG5pbXBvcnQgSW50ZXJwb2xhdG9yIGZyb20gJy4vSW50ZXJwb2xhdG9yLmpzJztcbmltcG9ydCBGb3JtYXR0ZXIgZnJvbSAnLi9Gb3JtYXR0ZXIuanMnO1xuaW1wb3J0IEJhY2tlbmRDb25uZWN0b3IgZnJvbSAnLi9CYWNrZW5kQ29ubmVjdG9yLmpzJztcbmltcG9ydCB7IGdldCBhcyBnZXREZWZhdWx0cywgdHJhbnNmb3JtT3B0aW9ucyB9IGZyb20gJy4vZGVmYXVsdHMuanMnO1xuaW1wb3J0IHBvc3RQcm9jZXNzb3IgZnJvbSAnLi9wb3N0UHJvY2Vzc29yLmpzJztcbmltcG9ydCB7IGRlZmVyLCBpc1N0cmluZyB9IGZyb20gJy4vdXRpbHMuanMnO1xuaW1wb3J0IGtleXNGcm9tU2VsZWN0b3IgZnJvbSAnLi9zZWxlY3Rvci5qcyc7XG5cbmNvbnN0IG5vb3AgPSAoKSA9PiB7fVxuXG4vLyBCaW5kcyB0aGUgbWVtYmVyIGZ1bmN0aW9ucyBvZiB0aGUgZ2l2ZW4gY2xhc3MgaW5zdGFuY2Ugc28gdGhhdCB0aGV5IGNhbiBiZVxuLy8gZGVzdHJ1Y3R1cmVkIG9yIHVzZWQgYXMgY2FsbGJhY2tzLlxuY29uc3QgYmluZE1lbWJlckZ1bmN0aW9ucyA9IChpbnN0KSA9PiB7XG4gIGNvbnN0IG1lbXMgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhPYmplY3QuZ2V0UHJvdG90eXBlT2YoaW5zdCkpXG4gIG1lbXMuZm9yRWFjaCgobWVtKSA9PiB7XG4gICAgaWYgKHR5cGVvZiBpbnN0W21lbV0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIGluc3RbbWVtXSA9IGluc3RbbWVtXS5iaW5kKGluc3QpXG4gICAgfVxuICB9KVxufVxuXG5jbGFzcyBJMThuIGV4dGVuZHMgRXZlbnRFbWl0dGVyIHtcbiAgY29uc3RydWN0b3Iob3B0aW9ucyA9IHt9LCBjYWxsYmFjaykge1xuICAgIHN1cGVyKCk7XG5cbiAgICB0aGlzLm9wdGlvbnMgPSB0cmFuc2Zvcm1PcHRpb25zKG9wdGlvbnMpO1xuICAgIHRoaXMuc2VydmljZXMgPSB7fTtcbiAgICB0aGlzLmxvZ2dlciA9IGJhc2VMb2dnZXI7XG4gICAgdGhpcy5tb2R1bGVzID0geyBleHRlcm5hbDogW10gfTtcblxuICAgIGJpbmRNZW1iZXJGdW5jdGlvbnModGhpcyk7XG5cbiAgICBpZiAoY2FsbGJhY2sgJiYgIXRoaXMuaXNJbml0aWFsaXplZCAmJiAhb3B0aW9ucy5pc0Nsb25lKSB7XG4gICAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vaTE4bmV4dC9pMThuZXh0L2lzc3Vlcy84NzlcbiAgICAgIGlmICghdGhpcy5vcHRpb25zLmluaXRBc3luYykge1xuICAgICAgICB0aGlzLmluaXQob3B0aW9ucywgY2FsbGJhY2spO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgIH1cbiAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICB0aGlzLmluaXQob3B0aW9ucywgY2FsbGJhY2spO1xuICAgICAgfSwgMCk7XG4gICAgfVxuICB9XG5cbiAgaW5pdChvcHRpb25zID0ge30sIGNhbGxiYWNrKSB7XG4gICAgdGhpcy5pc0luaXRpYWxpemluZyA9IHRydWU7XG4gICAgaWYgKHR5cGVvZiBvcHRpb25zID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBjYWxsYmFjayA9IG9wdGlvbnM7XG4gICAgICBvcHRpb25zID0ge307XG4gICAgfVxuXG4gICAgaWYgKG9wdGlvbnMuZGVmYXVsdE5TID09IG51bGwgJiYgb3B0aW9ucy5ucykge1xuICAgICAgaWYgKGlzU3RyaW5nKG9wdGlvbnMubnMpKSB7XG4gICAgICAgIG9wdGlvbnMuZGVmYXVsdE5TID0gb3B0aW9ucy5ucztcbiAgICAgIH0gZWxzZSBpZiAoIW9wdGlvbnMubnMuaW5jbHVkZXMoJ3RyYW5zbGF0aW9uJykpIHtcbiAgICAgICAgb3B0aW9ucy5kZWZhdWx0TlMgPSBvcHRpb25zLm5zWzBdO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IGRlZk9wdHMgPSBnZXREZWZhdWx0cygpO1xuICAgIHRoaXMub3B0aW9ucyA9IHsgLi4uZGVmT3B0cywgLi4udGhpcy5vcHRpb25zLCAuLi50cmFuc2Zvcm1PcHRpb25zKG9wdGlvbnMpIH07XG4gICAgdGhpcy5vcHRpb25zLmludGVycG9sYXRpb24gPSB7IC4uLmRlZk9wdHMuaW50ZXJwb2xhdGlvbiwgLi4udGhpcy5vcHRpb25zLmludGVycG9sYXRpb24gfTsgLy8gZG8gbm90IHVzZSByZWZlcmVuY2VcbiAgICBpZiAob3B0aW9ucy5rZXlTZXBhcmF0b3IgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5vcHRpb25zLnVzZXJEZWZpbmVkS2V5U2VwYXJhdG9yID0gb3B0aW9ucy5rZXlTZXBhcmF0b3I7XG4gICAgfVxuICAgIGlmIChvcHRpb25zLm5zU2VwYXJhdG9yICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMub3B0aW9ucy51c2VyRGVmaW5lZE5zU2VwYXJhdG9yID0gb3B0aW9ucy5uc1NlcGFyYXRvcjtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIHRoaXMub3B0aW9ucy5vdmVybG9hZFRyYW5zbGF0aW9uT3B0aW9uSGFuZGxlciAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhpcy5vcHRpb25zLm92ZXJsb2FkVHJhbnNsYXRpb25PcHRpb25IYW5kbGVyID0gZGVmT3B0cy5vdmVybG9hZFRyYW5zbGF0aW9uT3B0aW9uSGFuZGxlcjtcbiAgICB9XG5cbiAgICBjb25zdCBjcmVhdGVDbGFzc09uRGVtYW5kID0gKENsYXNzT3JPYmplY3QpID0+IHtcbiAgICAgIGlmICghQ2xhc3NPck9iamVjdCkgcmV0dXJuIG51bGw7XG4gICAgICBpZiAodHlwZW9mIENsYXNzT3JPYmplY3QgPT09ICdmdW5jdGlvbicpIHJldHVybiBuZXcgQ2xhc3NPck9iamVjdCgpO1xuICAgICAgcmV0dXJuIENsYXNzT3JPYmplY3Q7XG4gICAgfVxuXG4gICAgLy8gaW5pdCBzZXJ2aWNlc1xuICAgIGlmICghdGhpcy5vcHRpb25zLmlzQ2xvbmUpIHtcbiAgICAgIGlmICh0aGlzLm1vZHVsZXMubG9nZ2VyKSB7XG4gICAgICAgIGJhc2VMb2dnZXIuaW5pdChjcmVhdGVDbGFzc09uRGVtYW5kKHRoaXMubW9kdWxlcy5sb2dnZXIpLCB0aGlzLm9wdGlvbnMpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYmFzZUxvZ2dlci5pbml0KG51bGwsIHRoaXMub3B0aW9ucyk7XG4gICAgICB9XG5cbiAgICAgIGxldCBmb3JtYXR0ZXI7XG4gICAgICBpZiAodGhpcy5tb2R1bGVzLmZvcm1hdHRlcikge1xuICAgICAgICBmb3JtYXR0ZXIgPSB0aGlzLm1vZHVsZXMuZm9ybWF0dGVyO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZm9ybWF0dGVyID0gRm9ybWF0dGVyO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBsdSA9IG5ldyBMYW5ndWFnZVV0aWxzKHRoaXMub3B0aW9ucyk7XG5cbiAgICAgIC8vIGlmICh0aGlzLm9wdGlvbnMucmVzb3VyY2VzKSB7XG4gICAgICAvLyAgIE9iamVjdC5rZXlzKHRoaXMub3B0aW9ucy5yZXNvdXJjZXMpLmZvckVhY2goKGxuZykgPT4ge1xuICAgICAgLy8gICAgIGNvbnN0IGZMbmcgPSBsdS5mb3JtYXRMYW5ndWFnZUNvZGUobG5nKTtcbiAgICAgIC8vICAgICBpZiAoZkxuZyAhPT0gbG5nKSB7XG4gICAgICAvLyAgICAgICB0aGlzLm9wdGlvbnMucmVzb3VyY2VzW2ZMbmddID0gdGhpcy5vcHRpb25zLnJlc291cmNlc1tsbmddO1xuICAgICAgLy8gICAgICAgZGVsZXRlIHRoaXMub3B0aW9ucy5yZXNvdXJjZXNbbG5nXTtcbiAgICAgIC8vICAgICAgIHRoaXMubG9nZ2VyLndhcm4oYGluaXQ6IGxuZyBpbiByZXNvdXJjZSBpcyBub3QgdmFsaWQsIG1hcHBpbmcgJHtsbmd9IHRvICR7ZkxuZ31gKTtcbiAgICAgIC8vICAgICB9XG4gICAgICAvLyAgIH0pXG4gICAgICAvLyB9XG5cbiAgICAgIHRoaXMuc3RvcmUgPSBuZXcgUmVzb3VyY2VTdG9yZSh0aGlzLm9wdGlvbnMucmVzb3VyY2VzLCB0aGlzLm9wdGlvbnMpO1xuXG4gICAgICBjb25zdCBzID0gdGhpcy5zZXJ2aWNlcztcbiAgICAgIHMubG9nZ2VyID0gYmFzZUxvZ2dlcjtcbiAgICAgIHMucmVzb3VyY2VTdG9yZSA9IHRoaXMuc3RvcmU7XG4gICAgICBzLmxhbmd1YWdlVXRpbHMgPSBsdTtcbiAgICAgIHMucGx1cmFsUmVzb2x2ZXIgPSBuZXcgUGx1cmFsUmVzb2x2ZXIobHUsIHtcbiAgICAgICAgcHJlcGVuZDogdGhpcy5vcHRpb25zLnBsdXJhbFNlcGFyYXRvcixcbiAgICAgIH0pO1xuXG4gICAgICBpZiAoZm9ybWF0dGVyKSB7XG4gICAgICAgIHMuZm9ybWF0dGVyID0gY3JlYXRlQ2xhc3NPbkRlbWFuZChmb3JtYXR0ZXIpO1xuICAgICAgICBpZiAocy5mb3JtYXR0ZXIuaW5pdCkgcy5mb3JtYXR0ZXIuaW5pdChzLCB0aGlzLm9wdGlvbnMpO1xuICAgICAgICB0aGlzLm9wdGlvbnMuaW50ZXJwb2xhdGlvbi5mb3JtYXQgPSBzLmZvcm1hdHRlci5mb3JtYXQuYmluZChzLmZvcm1hdHRlcik7XG4gICAgICB9XG5cbiAgICAgIHMuaW50ZXJwb2xhdG9yID0gbmV3IEludGVycG9sYXRvcih0aGlzLm9wdGlvbnMpO1xuICAgICAgcy51dGlscyA9IHtcbiAgICAgICAgaGFzTG9hZGVkTmFtZXNwYWNlOiB0aGlzLmhhc0xvYWRlZE5hbWVzcGFjZS5iaW5kKHRoaXMpXG4gICAgICB9O1xuXG4gICAgICBzLmJhY2tlbmRDb25uZWN0b3IgPSBuZXcgQmFja2VuZENvbm5lY3RvcihcbiAgICAgICAgY3JlYXRlQ2xhc3NPbkRlbWFuZCh0aGlzLm1vZHVsZXMuYmFja2VuZCksXG4gICAgICAgIHMucmVzb3VyY2VTdG9yZSxcbiAgICAgICAgcyxcbiAgICAgICAgdGhpcy5vcHRpb25zLFxuICAgICAgKTtcbiAgICAgIC8vIHBpcGUgZXZlbnRzIGZyb20gYmFja2VuZENvbm5lY3RvclxuICAgICAgcy5iYWNrZW5kQ29ubmVjdG9yLm9uKCcqJywgKGV2ZW50LCAuLi5hcmdzKSA9PiB7XG4gICAgICAgIHRoaXMuZW1pdChldmVudCwgLi4uYXJncyk7XG4gICAgICB9KTtcblxuICAgICAgaWYgKHRoaXMubW9kdWxlcy5sYW5ndWFnZURldGVjdG9yKSB7XG4gICAgICAgIHMubGFuZ3VhZ2VEZXRlY3RvciA9IGNyZWF0ZUNsYXNzT25EZW1hbmQodGhpcy5tb2R1bGVzLmxhbmd1YWdlRGV0ZWN0b3IpO1xuICAgICAgICBpZiAocy5sYW5ndWFnZURldGVjdG9yLmluaXQpIHMubGFuZ3VhZ2VEZXRlY3Rvci5pbml0KHMsIHRoaXMub3B0aW9ucy5kZXRlY3Rpb24sIHRoaXMub3B0aW9ucyk7XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLm1vZHVsZXMuaTE4bkZvcm1hdCkge1xuICAgICAgICBzLmkxOG5Gb3JtYXQgPSBjcmVhdGVDbGFzc09uRGVtYW5kKHRoaXMubW9kdWxlcy5pMThuRm9ybWF0KTtcbiAgICAgICAgaWYgKHMuaTE4bkZvcm1hdC5pbml0KSBzLmkxOG5Gb3JtYXQuaW5pdCh0aGlzKTtcbiAgICAgIH1cblxuICAgICAgdGhpcy50cmFuc2xhdG9yID0gbmV3IFRyYW5zbGF0b3IodGhpcy5zZXJ2aWNlcywgdGhpcy5vcHRpb25zKTtcbiAgICAgIC8vIHBpcGUgZXZlbnRzIGZyb20gdHJhbnNsYXRvclxuICAgICAgdGhpcy50cmFuc2xhdG9yLm9uKCcqJywgKGV2ZW50LCAuLi5hcmdzKSA9PiB7XG4gICAgICAgIHRoaXMuZW1pdChldmVudCwgLi4uYXJncyk7XG4gICAgICB9KTtcblxuICAgICAgdGhpcy5tb2R1bGVzLmV4dGVybmFsLmZvckVhY2gobSA9PiB7XG4gICAgICAgIGlmIChtLmluaXQpIG0uaW5pdCh0aGlzKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHRoaXMuZm9ybWF0ID0gdGhpcy5vcHRpb25zLmludGVycG9sYXRpb24uZm9ybWF0O1xuICAgIGlmICghY2FsbGJhY2spIGNhbGxiYWNrID0gbm9vcDtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMuZmFsbGJhY2tMbmcgJiYgIXRoaXMuc2VydmljZXMubGFuZ3VhZ2VEZXRlY3RvciAmJiAhdGhpcy5vcHRpb25zLmxuZykge1xuICAgICAgY29uc3QgY29kZXMgPSB0aGlzLnNlcnZpY2VzLmxhbmd1YWdlVXRpbHMuZ2V0RmFsbGJhY2tDb2Rlcyh0aGlzLm9wdGlvbnMuZmFsbGJhY2tMbmcpXG4gICAgICBpZiAoY29kZXMubGVuZ3RoID4gMCAmJiBjb2Rlc1swXSAhPT0gJ2RldicpIHRoaXMub3B0aW9ucy5sbmcgPSBjb2Rlc1swXVxuICAgIH1cbiAgICBpZiAoIXRoaXMuc2VydmljZXMubGFuZ3VhZ2VEZXRlY3RvciAmJiAhdGhpcy5vcHRpb25zLmxuZykge1xuICAgICAgdGhpcy5sb2dnZXIud2FybignaW5pdDogbm8gbGFuZ3VhZ2VEZXRlY3RvciBpcyB1c2VkIGFuZCBubyBsbmcgaXMgZGVmaW5lZCcpO1xuICAgIH1cblxuICAgIC8vIGFwcGVuZCBhcGlcbiAgICBjb25zdCBzdG9yZUFwaSA9IFtcbiAgICAgICdnZXRSZXNvdXJjZScsXG4gICAgICAnaGFzUmVzb3VyY2VCdW5kbGUnLFxuICAgICAgJ2dldFJlc291cmNlQnVuZGxlJyxcbiAgICAgICdnZXREYXRhQnlMYW5ndWFnZScsXG4gICAgXTtcbiAgICBzdG9yZUFwaS5mb3JFYWNoKGZjTmFtZSA9PiB7XG4gICAgICB0aGlzW2ZjTmFtZV0gPSAoLi4uYXJncykgPT4gdGhpcy5zdG9yZVtmY05hbWVdKC4uLmFyZ3MpO1xuICAgIH0pO1xuICAgIGNvbnN0IHN0b3JlQXBpQ2hhaW5lZCA9IFtcbiAgICAgICdhZGRSZXNvdXJjZScsXG4gICAgICAnYWRkUmVzb3VyY2VzJyxcbiAgICAgICdhZGRSZXNvdXJjZUJ1bmRsZScsXG4gICAgICAncmVtb3ZlUmVzb3VyY2VCdW5kbGUnLFxuICAgIF07XG4gICAgc3RvcmVBcGlDaGFpbmVkLmZvckVhY2goZmNOYW1lID0+IHtcbiAgICAgIHRoaXNbZmNOYW1lXSA9ICguLi5hcmdzKSA9PiB7XG4gICAgICAgIHRoaXMuc3RvcmVbZmNOYW1lXSguLi5hcmdzKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICB9O1xuICAgIH0pO1xuXG4gICAgY29uc3QgZGVmZXJyZWQgPSBkZWZlcigpO1xuXG4gICAgY29uc3QgbG9hZCA9ICgpID0+IHtcbiAgICAgIGNvbnN0IGZpbmlzaCA9IChlcnIsIHQpID0+IHtcbiAgICAgICAgdGhpcy5pc0luaXRpYWxpemluZyA9IGZhbHNlO1xuICAgICAgICBpZiAodGhpcy5pc0luaXRpYWxpemVkICYmICF0aGlzLmluaXRpYWxpemVkU3RvcmVPbmNlKSB0aGlzLmxvZ2dlci53YXJuKCdpbml0OiBpMThuZXh0IGlzIGFscmVhZHkgaW5pdGlhbGl6ZWQuIFlvdSBzaG91bGQgY2FsbCBpbml0IGp1c3Qgb25jZSEnKTtcbiAgICAgICAgdGhpcy5pc0luaXRpYWxpemVkID0gdHJ1ZTtcbiAgICAgICAgaWYgKCF0aGlzLm9wdGlvbnMuaXNDbG9uZSkgdGhpcy5sb2dnZXIubG9nKCdpbml0aWFsaXplZCcsIHRoaXMub3B0aW9ucyk7XG4gICAgICAgIHRoaXMuZW1pdCgnaW5pdGlhbGl6ZWQnLCB0aGlzLm9wdGlvbnMpO1xuXG4gICAgICAgIGRlZmVycmVkLnJlc29sdmUodCk7IC8vIG5vdCByZWplY3Rpbmcgb24gZXJyIChhcyBlcnIgaXMgb25seSBhIGxvYWRpbmcgdHJhbnNsYXRpb24gZmFpbGVkIHdhcm5pbmcpXG4gICAgICAgIGNhbGxiYWNrKGVyciwgdCk7XG4gICAgICB9O1xuICAgICAgLy8gZml4IGZvciB1c2UgY2FzZXMgd2hlbiBjYWxsaW5nIGNoYW5nZUxhbmd1YWdlIGJlZm9yZSBmaW5pc2hlZCB0byBpbml0aWFsaXplZCAoaS5lLiBodHRwczovL2dpdGh1Yi5jb20vaTE4bmV4dC9pMThuZXh0L2lzc3Vlcy8xNTUyKVxuICAgICAgLy8gYWxzbyBjb3ZlcnMgY2xvbmVJbnN0YW5jZSByYWNlIHdoZXJlIGRlZmVycmVkIGxvYWQoKSB3b3VsZCBvdmVyd3JpdGUgYSBwZW5kaW5nIGNoYW5nZUxhbmd1YWdlIChodHRwczovL2dpdGh1Yi5jb20vaTE4bmV4dC9pMThuZXh0L2lzc3Vlcy8yNDIyKVxuICAgICAgaWYgKCh0aGlzLmxhbmd1YWdlcyB8fCB0aGlzLmlzTGFuZ3VhZ2VDaGFuZ2luZ1RvKSAmJiAhdGhpcy5pc0luaXRpYWxpemVkKSByZXR1cm4gZmluaXNoKG51bGwsIHRoaXMudC5iaW5kKHRoaXMpKTtcbiAgICAgIHRoaXMuY2hhbmdlTGFuZ3VhZ2UodGhpcy5vcHRpb25zLmxuZywgZmluaXNoKTtcbiAgICB9O1xuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5yZXNvdXJjZXMgfHwgIXRoaXMub3B0aW9ucy5pbml0QXN5bmMpIHtcbiAgICAgIGxvYWQoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgc2V0VGltZW91dChsb2FkLCAwKTtcbiAgICB9XG5cbiAgICByZXR1cm4gZGVmZXJyZWQ7XG4gIH1cblxuICBsb2FkUmVzb3VyY2VzKGxhbmd1YWdlLCBjYWxsYmFjayA9IG5vb3ApIHtcbiAgICBsZXQgdXNlZENhbGxiYWNrID0gY2FsbGJhY2s7XG4gICAgY29uc3QgdXNlZExuZyA9IGlzU3RyaW5nKGxhbmd1YWdlKSA/IGxhbmd1YWdlIDogdGhpcy5sYW5ndWFnZTtcbiAgICBpZiAodHlwZW9mIGxhbmd1YWdlID09PSAnZnVuY3Rpb24nKSB1c2VkQ2FsbGJhY2sgPSBsYW5ndWFnZTtcblxuICAgIGlmICghdGhpcy5vcHRpb25zLnJlc291cmNlcyB8fCB0aGlzLm9wdGlvbnMucGFydGlhbEJ1bmRsZWRMYW5ndWFnZXMpIHtcbiAgICAgIGlmICh1c2VkTG5nPy50b0xvd2VyQ2FzZSgpID09PSAnY2ltb2RlJyAmJiAoIXRoaXMub3B0aW9ucy5wcmVsb2FkIHx8IHRoaXMub3B0aW9ucy5wcmVsb2FkLmxlbmd0aCA9PT0gMCkpIHJldHVybiB1c2VkQ2FsbGJhY2soKTsgLy8gYXZvaWQgbG9hZGluZyByZXNvdXJjZXMgZm9yIGNpbW9kZVxuXG4gICAgICBjb25zdCB0b0xvYWQgPSBbXTtcblxuICAgICAgY29uc3QgYXBwZW5kID0gbG5nID0+IHtcbiAgICAgICAgaWYgKCFsbmcpIHJldHVybjtcbiAgICAgICAgaWYgKGxuZyA9PT0gJ2NpbW9kZScpIHJldHVybjtcbiAgICAgICAgY29uc3QgbG5ncyA9IHRoaXMuc2VydmljZXMubGFuZ3VhZ2VVdGlscy50b1Jlc29sdmVIaWVyYXJjaHkobG5nKTtcbiAgICAgICAgbG5ncy5mb3JFYWNoKGwgPT4ge1xuICAgICAgICAgIGlmIChsID09PSAnY2ltb2RlJykgcmV0dXJuO1xuICAgICAgICAgIGlmICghdG9Mb2FkLmluY2x1ZGVzKGwpKSB0b0xvYWQucHVzaChsKTtcbiAgICAgICAgfSk7XG4gICAgICB9O1xuXG4gICAgICBpZiAoIXVzZWRMbmcpIHtcbiAgICAgICAgLy8gYXQgbGVhc3QgbG9hZCBmYWxsYmFja3MgaW4gdGhpcyBjYXNlXG4gICAgICAgIGNvbnN0IGZhbGxiYWNrcyA9IHRoaXMuc2VydmljZXMubGFuZ3VhZ2VVdGlscy5nZXRGYWxsYmFja0NvZGVzKHRoaXMub3B0aW9ucy5mYWxsYmFja0xuZyk7XG4gICAgICAgIGZhbGxiYWNrcy5mb3JFYWNoKGwgPT4gYXBwZW5kKGwpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGFwcGVuZCh1c2VkTG5nKTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5vcHRpb25zLnByZWxvYWQ/LmZvckVhY2g/LihsID0+IGFwcGVuZChsKSk7XG5cbiAgICAgIHRoaXMuc2VydmljZXMuYmFja2VuZENvbm5lY3Rvci5sb2FkKHRvTG9hZCwgdGhpcy5vcHRpb25zLm5zLCAoZSkgPT4ge1xuICAgICAgICBpZiAoIWUgJiYgIXRoaXMucmVzb2x2ZWRMYW5ndWFnZSAmJiB0aGlzLmxhbmd1YWdlKSB0aGlzLnNldFJlc29sdmVkTGFuZ3VhZ2UodGhpcy5sYW5ndWFnZSk7XG4gICAgICAgIHVzZWRDYWxsYmFjayhlKTtcbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICB1c2VkQ2FsbGJhY2sobnVsbCk7XG4gICAgfVxuICB9XG5cbiAgcmVsb2FkUmVzb3VyY2VzKGxuZ3MsIG5zLCBjYWxsYmFjaykge1xuICAgIGNvbnN0IGRlZmVycmVkID0gZGVmZXIoKTtcbiAgICBpZiAodHlwZW9mIGxuZ3MgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIGNhbGxiYWNrID0gbG5ncztcbiAgICAgIGxuZ3MgPSB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGlmICh0eXBlb2YgbnMgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIGNhbGxiYWNrID0gbnM7XG4gICAgICBucyA9IHVuZGVmaW5lZDtcbiAgICB9XG4gICAgaWYgKCFsbmdzKSBsbmdzID0gdGhpcy5sYW5ndWFnZXM7XG4gICAgaWYgKCFucykgbnMgPSB0aGlzLm9wdGlvbnMubnM7XG4gICAgaWYgKCFjYWxsYmFjaykgY2FsbGJhY2sgPSBub29wO1xuICAgIHRoaXMuc2VydmljZXMuYmFja2VuZENvbm5lY3Rvci5yZWxvYWQobG5ncywgbnMsIGVyciA9PiB7XG4gICAgICBkZWZlcnJlZC5yZXNvbHZlKCk7IC8vIG5vdCByZWplY3Rpbmcgb24gZXJyIChhcyBlcnIgaXMgb25seSBhIGxvYWRpbmcgdHJhbnNsYXRpb24gZmFpbGVkIHdhcm5pbmcpXG4gICAgICBjYWxsYmFjayhlcnIpO1xuICAgIH0pO1xuICAgIHJldHVybiBkZWZlcnJlZDtcbiAgfVxuXG4gIHVzZShtb2R1bGUpIHtcbiAgICBpZiAoIW1vZHVsZSkgdGhyb3cgbmV3IEVycm9yKCdZb3UgYXJlIHBhc3NpbmcgYW4gdW5kZWZpbmVkIG1vZHVsZSEgUGxlYXNlIGNoZWNrIHRoZSBvYmplY3QgeW91IGFyZSBwYXNzaW5nIHRvIGkxOG5leHQudXNlKCknKVxuICAgIGlmICghbW9kdWxlLnR5cGUpIHRocm93IG5ldyBFcnJvcignWW91IGFyZSBwYXNzaW5nIGEgd3JvbmcgbW9kdWxlISBQbGVhc2UgY2hlY2sgdGhlIG9iamVjdCB5b3UgYXJlIHBhc3NpbmcgdG8gaTE4bmV4dC51c2UoKScpXG5cbiAgICBpZiAobW9kdWxlLnR5cGUgPT09ICdiYWNrZW5kJykge1xuICAgICAgdGhpcy5tb2R1bGVzLmJhY2tlbmQgPSBtb2R1bGU7XG4gICAgfVxuXG4gICAgaWYgKG1vZHVsZS50eXBlID09PSAnbG9nZ2VyJyB8fCAobW9kdWxlLmxvZyAmJiBtb2R1bGUud2FybiAmJiBtb2R1bGUuZXJyb3IpKSB7XG4gICAgICB0aGlzLm1vZHVsZXMubG9nZ2VyID0gbW9kdWxlO1xuICAgIH1cblxuICAgIGlmIChtb2R1bGUudHlwZSA9PT0gJ2xhbmd1YWdlRGV0ZWN0b3InKSB7XG4gICAgICB0aGlzLm1vZHVsZXMubGFuZ3VhZ2VEZXRlY3RvciA9IG1vZHVsZTtcbiAgICB9XG5cbiAgICBpZiAobW9kdWxlLnR5cGUgPT09ICdpMThuRm9ybWF0Jykge1xuICAgICAgdGhpcy5tb2R1bGVzLmkxOG5Gb3JtYXQgPSBtb2R1bGU7XG4gICAgfVxuXG4gICAgaWYgKG1vZHVsZS50eXBlID09PSAncG9zdFByb2Nlc3NvcicpIHtcbiAgICAgIHBvc3RQcm9jZXNzb3IuYWRkUG9zdFByb2Nlc3Nvcihtb2R1bGUpO1xuICAgIH1cblxuICAgIGlmIChtb2R1bGUudHlwZSA9PT0gJ2Zvcm1hdHRlcicpIHtcbiAgICAgIHRoaXMubW9kdWxlcy5mb3JtYXR0ZXIgPSBtb2R1bGU7XG4gICAgfVxuXG4gICAgaWYgKG1vZHVsZS50eXBlID09PSAnM3JkUGFydHknKSB7XG4gICAgICB0aGlzLm1vZHVsZXMuZXh0ZXJuYWwucHVzaChtb2R1bGUpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgc2V0UmVzb2x2ZWRMYW5ndWFnZShsKSB7XG4gICAgaWYgKCFsIHx8ICF0aGlzLmxhbmd1YWdlcykgcmV0dXJuO1xuICAgIGlmIChbJ2NpbW9kZScsICdkZXYnXS5pbmNsdWRlcyhsKSkgcmV0dXJuO1xuICAgIGZvciAobGV0IGxpID0gMDsgbGkgPCB0aGlzLmxhbmd1YWdlcy5sZW5ndGg7IGxpKyspIHtcbiAgICAgIGNvbnN0IGxuZ0luTG5ncyA9IHRoaXMubGFuZ3VhZ2VzW2xpXTtcbiAgICAgIGlmIChbJ2NpbW9kZScsICdkZXYnXS5pbmNsdWRlcyhsbmdJbkxuZ3MpKSBjb250aW51ZTtcbiAgICAgIGlmICh0aGlzLnN0b3JlLmhhc0xhbmd1YWdlU29tZVRyYW5zbGF0aW9ucyhsbmdJbkxuZ3MpKSB7XG4gICAgICAgIHRoaXMucmVzb2x2ZWRMYW5ndWFnZSA9IGxuZ0luTG5ncztcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICAgIGlmICghdGhpcy5yZXNvbHZlZExhbmd1YWdlICYmICF0aGlzLmxhbmd1YWdlcy5pbmNsdWRlcyhsKSAmJiB0aGlzLnN0b3JlLmhhc0xhbmd1YWdlU29tZVRyYW5zbGF0aW9ucyhsKSkge1xuICAgICAgdGhpcy5yZXNvbHZlZExhbmd1YWdlID0gbDtcbiAgICAgIHRoaXMubGFuZ3VhZ2VzLnVuc2hpZnQobCk7XG4gICAgfVxuICB9XG5cbiAgY2hhbmdlTGFuZ3VhZ2UobG5nLCBjYWxsYmFjaykge1xuICAgIHRoaXMuaXNMYW5ndWFnZUNoYW5naW5nVG8gPSBsbmc7XG4gICAgY29uc3QgZGVmZXJyZWQgPSBkZWZlcigpO1xuICAgIHRoaXMuZW1pdCgnbGFuZ3VhZ2VDaGFuZ2luZycsIGxuZyk7XG5cbiAgICBjb25zdCBzZXRMbmdQcm9wcyA9IChsKSA9PiB7XG4gICAgICB0aGlzLmxhbmd1YWdlID0gbDtcbiAgICAgIHRoaXMubGFuZ3VhZ2VzID0gdGhpcy5zZXJ2aWNlcy5sYW5ndWFnZVV0aWxzLnRvUmVzb2x2ZUhpZXJhcmNoeShsKTtcbiAgICAgIC8vIGZpbmQgdGhlIGZpcnN0IGxhbmd1YWdlIHJlc29sdmVkIGxhbmd1YWdlXG4gICAgICB0aGlzLnJlc29sdmVkTGFuZ3VhZ2UgPSB1bmRlZmluZWQ7XG4gICAgICB0aGlzLnNldFJlc29sdmVkTGFuZ3VhZ2UobCk7XG4gICAgfTtcblxuICAgIGNvbnN0IGRvbmUgPSAoZXJyLCBsKSA9PiB7XG4gICAgICBpZiAobCkge1xuICAgICAgICBpZiAodGhpcy5pc0xhbmd1YWdlQ2hhbmdpbmdUbyA9PT0gbG5nKSB7XG4gICAgICAgICAgc2V0TG5nUHJvcHMobCk7XG4gICAgICAgICAgdGhpcy50cmFuc2xhdG9yLmNoYW5nZUxhbmd1YWdlKGwpO1xuICAgICAgICAgIHRoaXMuaXNMYW5ndWFnZUNoYW5naW5nVG8gPSB1bmRlZmluZWQ7XG4gICAgICAgICAgdGhpcy5lbWl0KCdsYW5ndWFnZUNoYW5nZWQnLCBsKTtcbiAgICAgICAgICB0aGlzLmxvZ2dlci5sb2coJ2xhbmd1YWdlQ2hhbmdlZCcsIGwpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmlzTGFuZ3VhZ2VDaGFuZ2luZ1RvID0gdW5kZWZpbmVkO1xuICAgICAgfVxuXG4gICAgICBkZWZlcnJlZC5yZXNvbHZlKCguLi5hcmdzKSA9PiB0aGlzLnQoLi4uYXJncykpO1xuICAgICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjayhlcnIsICguLi5hcmdzKSA9PiB0aGlzLnQoLi4uYXJncykpO1xuICAgIH07XG5cbiAgICBjb25zdCBzZXRMbmcgPSBsbmdzID0+IHtcbiAgICAgIC8vIGlmIGRldGVjdGVkIGxuZyBpcyBmYWxzeSwgc2V0IGl0IHRvIGVtcHR5IGFycmF5LCB0byBtYWtlIHN1cmUgYXQgbGVhc3QgdGhlIGZhbGxiYWNrTG5nIHdpbGwgYmUgdXNlZFxuICAgICAgaWYgKCFsbmcgJiYgIWxuZ3MgJiYgdGhpcy5zZXJ2aWNlcy5sYW5ndWFnZURldGVjdG9yKSBsbmdzID0gW107XG4gICAgICAvLyBkZXBlbmRpbmcgb24gQVBJIGluIGRldGVjdG9yIGxuZyBjYW4gYmUgYSBzdHJpbmcgKG9sZCkgb3IgYW4gYXJyYXkgb2YgbGFuZ3VhZ2VzIG9yZGVyZWQgaW4gcHJpb3JpdHlcbiAgICAgIGNvbnN0IGZsID0gaXNTdHJpbmcobG5ncykgPyBsbmdzIDogbG5ncyAmJiBsbmdzWzBdO1xuICAgICAgY29uc3QgbCA9IHRoaXMuc3RvcmUuaGFzTGFuZ3VhZ2VTb21lVHJhbnNsYXRpb25zKGZsKSA/IGZsIDogdGhpcy5zZXJ2aWNlcy5sYW5ndWFnZVV0aWxzLmdldEJlc3RNYXRjaEZyb21Db2Rlcyhpc1N0cmluZyhsbmdzKSA/IFtsbmdzXSA6IGxuZ3MpO1xuXG4gICAgICBpZiAobCkge1xuICAgICAgICBpZiAoIXRoaXMubGFuZ3VhZ2UpIHtcbiAgICAgICAgICBzZXRMbmdQcm9wcyhsKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXRoaXMudHJhbnNsYXRvci5sYW5ndWFnZSkgdGhpcy50cmFuc2xhdG9yLmNoYW5nZUxhbmd1YWdlKGwpO1xuXG4gICAgICAgIHRoaXMuc2VydmljZXMubGFuZ3VhZ2VEZXRlY3Rvcj8uY2FjaGVVc2VyTGFuZ3VhZ2U/LihsKTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5sb2FkUmVzb3VyY2VzKGwsIGVyciA9PiB7XG4gICAgICAgIGRvbmUoZXJyLCBsKTtcbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICBpZiAoIWxuZyAmJiB0aGlzLnNlcnZpY2VzLmxhbmd1YWdlRGV0ZWN0b3IgJiYgIXRoaXMuc2VydmljZXMubGFuZ3VhZ2VEZXRlY3Rvci5hc3luYykge1xuICAgICAgc2V0TG5nKHRoaXMuc2VydmljZXMubGFuZ3VhZ2VEZXRlY3Rvci5kZXRlY3QoKSk7XG4gICAgfSBlbHNlIGlmICghbG5nICYmIHRoaXMuc2VydmljZXMubGFuZ3VhZ2VEZXRlY3RvciAmJiB0aGlzLnNlcnZpY2VzLmxhbmd1YWdlRGV0ZWN0b3IuYXN5bmMpIHtcbiAgICAgIGlmICh0aGlzLnNlcnZpY2VzLmxhbmd1YWdlRGV0ZWN0b3IuZGV0ZWN0Lmxlbmd0aCA9PT0gMCkge1xuICAgICAgICB0aGlzLnNlcnZpY2VzLmxhbmd1YWdlRGV0ZWN0b3IuZGV0ZWN0KCkudGhlbihzZXRMbmcpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5zZXJ2aWNlcy5sYW5ndWFnZURldGVjdG9yLmRldGVjdChzZXRMbmcpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBzZXRMbmcobG5nKTtcbiAgICB9XG5cbiAgICByZXR1cm4gZGVmZXJyZWQ7XG4gIH1cblxuICAvLyBgZml4ZWRPcHRzYCAob3B0aW9uYWwgNHRoIGFyZykgY2FycmllcyBvcHRpb25zIHRoYXQgYXJlIHRpZWQgdG8gdGhlXG4gIC8vIGJvdW5kIHQgZnVuY3Rpb24gcmF0aGVyIHRoYW4gdG8gdGhlIHJlc29sdXRpb24gb2YgYW55IHNpbmdsZSBjYWxsOlxuICAvL1xuICAvLyAgIC0gYHNjb3BlTnM/OiBzdHJpbmdbXWBcbiAgLy8gICAgICAgRnVsbCBuYW1lc3BhY2UgbGlzdCB0aGUgYm91bmQgdCB3YXMgY3JlYXRlZCBmb3IgKGUuZy4gdGhlIGFycmF5XG4gIC8vICAgICAgIHBhc3NlZCB0byBgdXNlVHJhbnNsYXRpb24oWyduc0EnLCduc0InXSlgKS4gVXNlZCAqb25seSogYnkgdGhlXG4gIC8vICAgICAgIHNlbGVjdG9yIHBhdGggdG8gZGVjaWRlIHdoZXRoZXIgYHBhdGhbMF1gIHNob3VsZCBiZSByZXdyaXR0ZW4gYXNcbiAgLy8gICAgICAgYSBuYW1lc3BhY2UgcHJlZml4LiBSZXNvbHV0aW9uIHNlbWFudGljcyBhcmUgdW5jaGFuZ2VkOiB0aGUgYm91bmRcbiAgLy8gICAgICAgYG5zYCAoYSBzaW5nbGUgcHJpbWFyeSBzdHJpbmcpIHN0aWxsIGRyaXZlcyBgVHJhbnNsYXRvci50cmFuc2xhdGVgLlxuICAvLyAgICAgICBUaGlzIGRlY291cGxlcyBzZWxlY3RvciBucy1kZXRlY3Rpb24gZnJvbSByZXNvbHV0aW9uIHNjb3BlIHNvIGFcbiAgLy8gICAgICAgcmVhY3QtaTE4bmV4dCBob29rIGNhbGxlZCB3aXRoIG11bHRpcGxlIG5hbWVzcGFjZXMgY2FuIHJvdXRlXG4gIC8vICAgICAgIGB0KCQgPT4gJC5zZWNvbmRhcnkuZm9vKWAgY29ycmVjdGx5ICp3aXRob3V0KiB0dXJuaW5nIGV2ZXJ5XG4gIC8vICAgICAgIGB0KCdmb28nKWAgbG9va3VwIGludG8gYSBtdWx0aS1ucyBmYWxsYmFjayBjaGFpbi5cbiAgLy8gICAgICAgU2VlIHRoZSB2MjUuOC4xOSBzZWxlY3RvciBydWxlIGluIGBzcmMvc2VsZWN0b3IuanNgLlxuICBnZXRGaXhlZFQobG5nLCBucywga2V5UHJlZml4LCBmaXhlZE9wdHMpIHtcbiAgICBjb25zdCBzY29wZU5zID0gZml4ZWRPcHRzPy5zY29wZU5zO1xuICAgIGNvbnN0IGZpeGVkVCA9IChrZXksIG9wdHMsIC4uLnJlc3QpID0+IHtcbiAgICAgIGxldCBvO1xuICAgICAgaWYgKHR5cGVvZiBvcHRzICE9PSAnb2JqZWN0Jykge1xuICAgICAgICBvID0gdGhpcy5vcHRpb25zLm92ZXJsb2FkVHJhbnNsYXRpb25PcHRpb25IYW5kbGVyKFtrZXksIG9wdHNdLmNvbmNhdChyZXN0KSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvID0geyAuLi5vcHRzIH07XG4gICAgICB9XG5cbiAgICAgIG8ubG5nID0gby5sbmcgfHwgZml4ZWRULmxuZztcbiAgICAgIG8ubG5ncyA9IG8ubG5ncyB8fCBmaXhlZFQubG5ncztcbiAgICAgIC8vIERldGVjdCBwZXItY2FsbCBleHBsaWNpdCBgbnNgIEJFRk9SRSBhdXRvLWZpbGxpbmcgZnJvbSBmaXhlZFQubnMsIHNvIHRoZVxuICAgICAgLy8gc2VsZWN0b3IgY2FuIHByZWZlciBjYWxsLWxldmVsIG5zIG92ZXIgdGhlIGJvdW5kIHNjb3BlTnMuXG4gICAgICBjb25zdCBleHBsaWNpdENhbGxOcyA9IG8ubnMgIT09IHVuZGVmaW5lZCAmJiBvLm5zICE9PSBudWxsO1xuICAgICAgby5ucyA9IG8ubnMgfHwgZml4ZWRULm5zO1xuICAgICAgaWYgKG8ua2V5UHJlZml4ICE9PSAnJykgby5rZXlQcmVmaXggPSBvLmtleVByZWZpeCB8fCBrZXlQcmVmaXggfHwgZml4ZWRULmtleVByZWZpeDtcblxuICAgICAgLy8ga2V5c0Zyb21TZWxlY3RvciBtdXN0IGJlIGNhbGxlZCBhZnRlciBvLm5zIGlzIHJlc29sdmVkIGFib3ZlLCBzbyB0aGF0IG5hbWVzcGFjZVxuICAgICAgLy8gcmV3cml0aW5nIHVzZXMgdGhlIGVmZmVjdGl2ZSBuYW1lc3BhY2UgKGUuZy4gdGhlIG9uZSBmaXhlZCBieSBnZXRGaXhlZFQpIHJhdGhlclxuICAgICAgLy8gdGhhbiB0aGUgcmF3IGdsb2JhbCBucyBhcnJheSBmcm9tIHRoaXMub3B0aW9ucy4gUHJlY2VkZW5jZSBmb3Igc2VsZWN0b3JcbiAgICAgIC8vIG5zLWRldGVjdGlvbiAoaGlnaGVzdCBmaXJzdCk6XG4gICAgICAvLyAgIDEuIGBvLm5zYCBpZiB0aGUgY2FsbGVyIHBhc3NlZCBpdCBleHBsaWNpdGx5IG9uIHRoaXMgY2FsbFxuICAgICAgLy8gICAyLiBgc2NvcGVOc2AgaWYgdGhlIGJvdW5kIHQgY2FycmllcyBpdCAodGhlIGhvb2sncyBmdWxsIG5zIGxpc3QpXG4gICAgICAvLyAgIDMuIGBvLm5zYCBwb3B1bGF0ZWQgZnJvbSBmaXhlZFQubnMgLyB0aGlzLm9wdGlvbnNcbiAgICAgIC8vIFRoaXMgZGVjb3VwbGVzIHNlbGVjdG9yIHBhdGhbMF0gbWF0Y2hpbmcgZnJvbSByZXNvbHV0aW9uIHNjb3BlLiBgby5uc2BcbiAgICAgIC8vIGNvbnRpbnVlcyB0byBkcml2ZSBgVHJhbnNsYXRvci50cmFuc2xhdGVgIHJlc29sdXRpb24gdW5jaGFuZ2VkLlxuICAgICAgY29uc3Qgc2VsZWN0b3JPcHRzID0geyAuLi50aGlzLm9wdGlvbnMsIC4uLm8gfTtcbiAgICAgIGlmIChBcnJheS5pc0FycmF5KHNjb3BlTnMpICYmICFleHBsaWNpdENhbGxOcykgc2VsZWN0b3JPcHRzLm5zID0gc2NvcGVOcztcbiAgICAgIGlmICh0eXBlb2Ygby5rZXlQcmVmaXggPT09ICdmdW5jdGlvbicpIG8ua2V5UHJlZml4ID0ga2V5c0Zyb21TZWxlY3RvcihvLmtleVByZWZpeCwgc2VsZWN0b3JPcHRzKTtcbiAgICAgIGNvbnN0IGtleVNlcGFyYXRvciA9IHRoaXMub3B0aW9ucy5rZXlTZXBhcmF0b3IgfHwgJy4nO1xuICAgICAgbGV0IHJlc3VsdEtleVxuICAgICAgaWYgKG8ua2V5UHJlZml4ICYmIEFycmF5LmlzQXJyYXkoa2V5KSkge1xuICAgICAgICByZXN1bHRLZXkgPSBrZXkubWFwKGsgPT4ge1xuICAgICAgICAgIGlmICh0eXBlb2YgayA9PT0gJ2Z1bmN0aW9uJykgayA9IGtleXNGcm9tU2VsZWN0b3Ioaywgc2VsZWN0b3JPcHRzKTtcbiAgICAgICAgICByZXR1cm4gYCR7by5rZXlQcmVmaXh9JHtrZXlTZXBhcmF0b3J9JHtrfWBcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAodHlwZW9mIGtleSA9PT0gJ2Z1bmN0aW9uJykga2V5ID0ga2V5c0Zyb21TZWxlY3RvcihrZXksIHNlbGVjdG9yT3B0cyk7XG4gICAgICAgIHJlc3VsdEtleSA9IG8ua2V5UHJlZml4ID8gYCR7by5rZXlQcmVmaXh9JHtrZXlTZXBhcmF0b3J9JHtrZXl9YCA6IGtleTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzLnQocmVzdWx0S2V5LCBvKTtcbiAgICB9O1xuICAgIGlmIChpc1N0cmluZyhsbmcpKSB7XG4gICAgICBmaXhlZFQubG5nID0gbG5nO1xuICAgIH0gZWxzZSB7XG4gICAgICBmaXhlZFQubG5ncyA9IGxuZztcbiAgICB9XG4gICAgZml4ZWRULm5zID0gbnM7XG4gICAgZml4ZWRULmtleVByZWZpeCA9IGtleVByZWZpeDtcbiAgICByZXR1cm4gZml4ZWRUO1xuICB9XG5cbiAgdCguLi5hcmdzKSB7XG4gICAgcmV0dXJuIHRoaXMudHJhbnNsYXRvcj8udHJhbnNsYXRlKC4uLmFyZ3MpO1xuICB9XG5cbiAgZXhpc3RzKC4uLmFyZ3MpIHtcbiAgICByZXR1cm4gdGhpcy50cmFuc2xhdG9yPy5leGlzdHMoLi4uYXJncyk7XG4gIH1cblxuICBzZXREZWZhdWx0TmFtZXNwYWNlKG5zKSB7XG4gICAgdGhpcy5vcHRpb25zLmRlZmF1bHROUyA9IG5zO1xuICB9XG5cbiAgaGFzTG9hZGVkTmFtZXNwYWNlKG5zLCBvcHRpb25zID0ge30pIHtcbiAgICBpZiAoIXRoaXMuaXNJbml0aWFsaXplZCkge1xuICAgICAgdGhpcy5sb2dnZXIud2FybignaGFzTG9hZGVkTmFtZXNwYWNlOiBpMThuZXh0IHdhcyBub3QgaW5pdGlhbGl6ZWQnLCB0aGlzLmxhbmd1YWdlcyk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGlmICghdGhpcy5sYW5ndWFnZXMgfHwgIXRoaXMubGFuZ3VhZ2VzLmxlbmd0aCkge1xuICAgICAgdGhpcy5sb2dnZXIud2FybignaGFzTG9hZGVkTmFtZXNwYWNlOiBpMThuLmxhbmd1YWdlcyB3ZXJlIHVuZGVmaW5lZCBvciBlbXB0eScsIHRoaXMubGFuZ3VhZ2VzKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBjb25zdCBsbmcgPSBvcHRpb25zLmxuZyB8fCB0aGlzLnJlc29sdmVkTGFuZ3VhZ2UgfHwgdGhpcy5sYW5ndWFnZXNbMF07XG4gICAgY29uc3QgZmFsbGJhY2tMbmcgPSB0aGlzLm9wdGlvbnMgPyB0aGlzLm9wdGlvbnMuZmFsbGJhY2tMbmcgOiBmYWxzZTtcbiAgICBjb25zdCBsYXN0TG5nID0gdGhpcy5sYW5ndWFnZXNbdGhpcy5sYW5ndWFnZXMubGVuZ3RoIC0gMV07XG5cbiAgICAvLyB3ZSdyZSBpbiBjaW1vZGUgc28gdGhpcyBzaGFsbCBwYXNzXG4gICAgaWYgKGxuZy50b0xvd2VyQ2FzZSgpID09PSAnY2ltb2RlJykgcmV0dXJuIHRydWU7XG5cbiAgICBjb25zdCBsb2FkTm90UGVuZGluZyA9IChsLCBuKSA9PiB7XG4gICAgICBjb25zdCBsb2FkU3RhdGUgPSB0aGlzLnNlcnZpY2VzLmJhY2tlbmRDb25uZWN0b3Iuc3RhdGVbYCR7bH18JHtufWBdO1xuICAgICAgcmV0dXJuIGxvYWRTdGF0ZSA9PT0gLTEgfHwgbG9hZFN0YXRlID09PSAwIHx8IGxvYWRTdGF0ZSA9PT0gMjtcbiAgICB9O1xuXG4gICAgLy8gb3B0aW9uYWwgaW5qZWN0ZWQgY2hlY2tcbiAgICBpZiAob3B0aW9ucy5wcmVjaGVjaykge1xuICAgICAgY29uc3QgcHJlUmVzdWx0ID0gb3B0aW9ucy5wcmVjaGVjayh0aGlzLCBsb2FkTm90UGVuZGluZyk7XG4gICAgICBpZiAocHJlUmVzdWx0ICE9PSB1bmRlZmluZWQpIHJldHVybiBwcmVSZXN1bHQ7XG4gICAgfVxuXG4gICAgLy8gbG9hZGVkIC0+IFNVQ0NFU1NcbiAgICBpZiAodGhpcy5oYXNSZXNvdXJjZUJ1bmRsZShsbmcsIG5zKSkgcmV0dXJuIHRydWU7XG5cbiAgICAvLyB3ZXJlIG5vdCBsb2FkaW5nIGF0IGFsbCAtPiBTRU1JIFNVQ0NFU1NcbiAgICBpZiAoIXRoaXMuc2VydmljZXMuYmFja2VuZENvbm5lY3Rvci5iYWNrZW5kIHx8ICh0aGlzLm9wdGlvbnMucmVzb3VyY2VzICYmICF0aGlzLm9wdGlvbnMucGFydGlhbEJ1bmRsZWRMYW5ndWFnZXMpKSByZXR1cm4gdHJ1ZTtcblxuICAgIC8vIGZhaWxlZCBsb2FkaW5nIG5zIC0gYnV0IGF0IGxlYXN0IGZhbGxiYWNrIGlzIG5vdCBwZW5kaW5nIC0+IFNFTUkgU1VDQ0VTU1xuICAgIGlmIChsb2FkTm90UGVuZGluZyhsbmcsIG5zKSAmJiAoIWZhbGxiYWNrTG5nIHx8IGxvYWROb3RQZW5kaW5nKGxhc3RMbmcsIG5zKSkpIHJldHVybiB0cnVlO1xuXG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgbG9hZE5hbWVzcGFjZXMobnMsIGNhbGxiYWNrKSB7XG4gICAgY29uc3QgZGVmZXJyZWQgPSBkZWZlcigpO1xuXG4gICAgaWYgKCF0aGlzLm9wdGlvbnMubnMpIHtcbiAgICAgIGlmIChjYWxsYmFjaykgY2FsbGJhY2soKTtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcbiAgICB9XG4gICAgaWYgKGlzU3RyaW5nKG5zKSkgbnMgPSBbbnNdO1xuXG4gICAgbnMuZm9yRWFjaChuID0+IHtcbiAgICAgIGlmICghdGhpcy5vcHRpb25zLm5zLmluY2x1ZGVzKG4pKSB0aGlzLm9wdGlvbnMubnMucHVzaChuKTtcbiAgICB9KTtcblxuICAgIHRoaXMubG9hZFJlc291cmNlcyhlcnIgPT4ge1xuICAgICAgZGVmZXJyZWQucmVzb2x2ZSgpO1xuICAgICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjayhlcnIpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIGRlZmVycmVkO1xuICB9XG5cbiAgbG9hZExhbmd1YWdlcyhsbmdzLCBjYWxsYmFjaykge1xuICAgIGNvbnN0IGRlZmVycmVkID0gZGVmZXIoKTtcblxuICAgIGlmIChpc1N0cmluZyhsbmdzKSkgbG5ncyA9IFtsbmdzXTtcbiAgICBjb25zdCBwcmVsb2FkZWQgPSB0aGlzLm9wdGlvbnMucHJlbG9hZCB8fCBbXTtcblxuICAgIGNvbnN0IG5ld0xuZ3MgPSBsbmdzLmZpbHRlcihsbmcgPT4gIXByZWxvYWRlZC5pbmNsdWRlcyhsbmcpICYmIHRoaXMuc2VydmljZXMubGFuZ3VhZ2VVdGlscy5pc1N1cHBvcnRlZENvZGUobG5nKSk7XG4gICAgLy8gRXhpdCBlYXJseSBpZiBhbGwgZ2l2ZW4gbGFuZ3VhZ2VzIGFyZSBhbHJlYWR5IHByZWxvYWRlZFxuICAgIGlmICghbmV3TG5ncy5sZW5ndGgpIHtcbiAgICAgIGlmIChjYWxsYmFjaykgY2FsbGJhY2soKTtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcbiAgICB9XG5cbiAgICB0aGlzLm9wdGlvbnMucHJlbG9hZCA9IHByZWxvYWRlZC5jb25jYXQobmV3TG5ncyk7XG4gICAgdGhpcy5sb2FkUmVzb3VyY2VzKGVyciA9PiB7XG4gICAgICBkZWZlcnJlZC5yZXNvbHZlKCk7XG4gICAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrKGVycik7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gZGVmZXJyZWQ7XG4gIH1cblxuICBkaXIobG5nKSB7XG4gICAgaWYgKCFsbmcpIGxuZyA9IHRoaXMucmVzb2x2ZWRMYW5ndWFnZSB8fCAodGhpcy5sYW5ndWFnZXM/Lmxlbmd0aCA+IDAgPyB0aGlzLmxhbmd1YWdlc1swXSA6IHRoaXMubGFuZ3VhZ2UpO1xuICAgIGlmICghbG5nKSByZXR1cm4gJ3J0bCc7XG5cbiAgICB0cnkge1xuICAgICAgY29uc3QgbCA9IG5ldyBJbnRsLkxvY2FsZShsbmcpXG4gICAgICBpZiAobCAmJiBsLmdldFRleHRJbmZvKSB7XG4gICAgICAgIGNvbnN0IHRpID0gbC5nZXRUZXh0SW5mbygpXG4gICAgICAgIGlmICh0aSAmJiB0aS5kaXJlY3Rpb24pIHJldHVybiB0aS5kaXJlY3Rpb25cbiAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7LyogZmFsbCB0aHJvdWdoICovfVxuXG4gICAgY29uc3QgcnRsTG5ncyA9IFtcbiAgICAgICdhcicsXG4gICAgICAnc2h1JyxcbiAgICAgICdzcXInLFxuICAgICAgJ3NzaCcsXG4gICAgICAneGFhJyxcbiAgICAgICd5aGQnLFxuICAgICAgJ3l1ZCcsXG4gICAgICAnYWFvJyxcbiAgICAgICdhYmgnLFxuICAgICAgJ2FidicsXG4gICAgICAnYWNtJyxcbiAgICAgICdhY3EnLFxuICAgICAgJ2FjdycsXG4gICAgICAnYWN4JyxcbiAgICAgICdhY3knLFxuICAgICAgJ2FkZicsXG4gICAgICAnYWRzJyxcbiAgICAgICdhZWInLFxuICAgICAgJ2FlYycsXG4gICAgICAnYWZiJyxcbiAgICAgICdhanAnLFxuICAgICAgJ2FwYycsXG4gICAgICAnYXBkJyxcbiAgICAgICdhcmInLFxuICAgICAgJ2FycScsXG4gICAgICAnYXJzJyxcbiAgICAgICdhcnknLFxuICAgICAgJ2FyeicsXG4gICAgICAnYXV6JyxcbiAgICAgICdhdmwnLFxuICAgICAgJ2F5aCcsXG4gICAgICAnYXlsJyxcbiAgICAgICdheW4nLFxuICAgICAgJ2F5cCcsXG4gICAgICAnYmJ6JyxcbiAgICAgICdwZ2EnLFxuICAgICAgJ2hlJyxcbiAgICAgICdpdycsXG4gICAgICAncHMnLFxuICAgICAgJ3BidCcsXG4gICAgICAncGJ1JyxcbiAgICAgICdwc3QnLFxuICAgICAgJ3BycCcsXG4gICAgICAncHJkJyxcbiAgICAgICd1ZycsXG4gICAgICAndXInLFxuICAgICAgJ3lkZCcsXG4gICAgICAneWRzJyxcbiAgICAgICd5aWgnLFxuICAgICAgJ2ppJyxcbiAgICAgICd5aScsXG4gICAgICAnaGJvJyxcbiAgICAgICdtZW4nLFxuICAgICAgJ3htbicsXG4gICAgICAnZmEnLFxuICAgICAgJ2pwcicsXG4gICAgICAncGVvJyxcbiAgICAgICdwZXMnLFxuICAgICAgJ3BycycsXG4gICAgICAnZHYnLFxuICAgICAgJ3NhbScsXG4gICAgICAnY2tiJ1xuICAgIF07XG5cbiAgICBjb25zdCBsYW5ndWFnZVV0aWxzID0gdGhpcy5zZXJ2aWNlcz8ubGFuZ3VhZ2VVdGlscyB8fCBuZXcgTGFuZ3VhZ2VVdGlscyhnZXREZWZhdWx0cygpKSAvLyBmb3IgdW5pbml0aWFsaXplZCB1c2FnZVxuICAgIGlmIChsbmcudG9Mb3dlckNhc2UoKS5pbmRleE9mKCctbGF0bicpID4gMSkgcmV0dXJuICdsdHInO1xuXG4gICAgcmV0dXJuIHJ0bExuZ3MuaW5jbHVkZXMobGFuZ3VhZ2VVdGlscy5nZXRMYW5ndWFnZVBhcnRGcm9tQ29kZShsbmcpKSB8fCBsbmcudG9Mb3dlckNhc2UoKS5pbmRleE9mKCctYXJhYicpID4gMVxuICAgICAgPyAncnRsJ1xuICAgICAgOiAnbHRyJztcbiAgfVxuXG4gIHN0YXRpYyBjcmVhdGVJbnN0YW5jZShvcHRpb25zID0ge30sIGNhbGxiYWNrKSB7XG4gICAgY29uc3QgaW5zdGFuY2UgPSBuZXcgSTE4bihvcHRpb25zLCBjYWxsYmFjaylcbiAgICBpbnN0YW5jZS5jcmVhdGVJbnN0YW5jZSA9IEkxOG4uY3JlYXRlSW5zdGFuY2U7XG4gICAgcmV0dXJuIGluc3RhbmNlO1xuICB9XG5cbiAgY2xvbmVJbnN0YW5jZShvcHRpb25zID0ge30sIGNhbGxiYWNrID0gbm9vcCkge1xuICAgIGNvbnN0IGZvcmtSZXNvdXJjZVN0b3JlID0gb3B0aW9ucy5mb3JrUmVzb3VyY2VTdG9yZTtcbiAgICBpZiAoZm9ya1Jlc291cmNlU3RvcmUpIGRlbGV0ZSBvcHRpb25zLmZvcmtSZXNvdXJjZVN0b3JlO1xuICAgIGNvbnN0IG1lcmdlZE9wdGlvbnMgPSB7IC4uLnRoaXMub3B0aW9ucywgLi4ub3B0aW9ucywgLi4ueyBpc0Nsb25lOiB0cnVlIH0gfTtcbiAgICBjb25zdCBjbG9uZSA9IG5ldyBJMThuKG1lcmdlZE9wdGlvbnMpO1xuICAgIGlmICgob3B0aW9ucy5kZWJ1ZyAhPT0gdW5kZWZpbmVkIHx8IG9wdGlvbnMucHJlZml4ICE9PSB1bmRlZmluZWQpKSB7XG4gICAgICBjbG9uZS5sb2dnZXIgPSBjbG9uZS5sb2dnZXIuY2xvbmUob3B0aW9ucyk7XG4gICAgfVxuICAgIGNvbnN0IG1lbWJlcnNUb0NvcHkgPSBbJ3N0b3JlJywgJ3NlcnZpY2VzJywgJ2xhbmd1YWdlJ107XG4gICAgbWVtYmVyc1RvQ29weS5mb3JFYWNoKG0gPT4ge1xuICAgICAgY2xvbmVbbV0gPSB0aGlzW21dO1xuICAgIH0pO1xuICAgIGNsb25lLnNlcnZpY2VzID0geyAuLi50aGlzLnNlcnZpY2VzIH07XG4gICAgY2xvbmUuc2VydmljZXMudXRpbHMgPSB7XG4gICAgICBoYXNMb2FkZWROYW1lc3BhY2U6IGNsb25lLmhhc0xvYWRlZE5hbWVzcGFjZS5iaW5kKGNsb25lKVxuICAgIH07XG4gICAgaWYgKGZvcmtSZXNvdXJjZVN0b3JlKSB7XG4gICAgICAvLyBmYXN0ZXIgdGhhbiBjb25zdCBjbG9uZWREYXRhID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeSh0aGlzLnN0b3JlLmRhdGEpKVxuICAgICAgY29uc3QgY2xvbmVkRGF0YSA9IE9iamVjdC5rZXlzKHRoaXMuc3RvcmUuZGF0YSkucmVkdWNlKChwcmV2LCBsKSA9PiB7XG4gICAgICAgIHByZXZbbF0gPSB7IC4uLnRoaXMuc3RvcmUuZGF0YVtsXSB9O1xuICAgICAgICBwcmV2W2xdID0gT2JqZWN0LmtleXMocHJldltsXSkucmVkdWNlKChhY2MsIG4pID0+IHtcbiAgICAgICAgICBhY2Nbbl0gPSB7IC4uLnByZXZbbF1bbl0gfTtcbiAgICAgICAgICByZXR1cm4gYWNjO1xuICAgICAgICB9LCBwcmV2W2xdKTtcbiAgICAgICAgcmV0dXJuIHByZXY7XG4gICAgICB9LCB7fSk7XG4gICAgICBjbG9uZS5zdG9yZSA9IG5ldyBSZXNvdXJjZVN0b3JlKGNsb25lZERhdGEsIG1lcmdlZE9wdGlvbnMpO1xuICAgICAgY2xvbmUuc2VydmljZXMucmVzb3VyY2VTdG9yZSA9IGNsb25lLnN0b3JlO1xuICAgIH1cbiAgICAvLyBFbnN1cmUgaW50ZXJwb2xhdGlvbiBvcHRpb25zIGFyZSBhbHdheXMgbWVyZ2VkIHdpdGggZGVmYXVsdHMgd2hlbiBjbG9uaW5nXG4gICAgaWYgKG9wdGlvbnMuaW50ZXJwb2xhdGlvbikge1xuICAgICAgY29uc3QgZGVmT3B0cyA9IGdldERlZmF1bHRzKCk7XG4gICAgICBjb25zdCBtZXJnZWRJbnRlcnBvbGF0aW9uID0geyAuLi5kZWZPcHRzLmludGVycG9sYXRpb24sIC4uLnRoaXMub3B0aW9ucy5pbnRlcnBvbGF0aW9uLCAuLi5vcHRpb25zLmludGVycG9sYXRpb24gfTtcbiAgICAgIGNvbnN0IG1lcmdlZEZvckludGVycG9sYXRvciA9IHsgLi4ubWVyZ2VkT3B0aW9ucywgaW50ZXJwb2xhdGlvbjogbWVyZ2VkSW50ZXJwb2xhdGlvbiB9O1xuICAgICAgY2xvbmUuc2VydmljZXMuaW50ZXJwb2xhdG9yID0gbmV3IEludGVycG9sYXRvcihtZXJnZWRGb3JJbnRlcnBvbGF0b3IpO1xuICAgIH1cbiAgICBjbG9uZS50cmFuc2xhdG9yID0gbmV3IFRyYW5zbGF0b3IoY2xvbmUuc2VydmljZXMsIG1lcmdlZE9wdGlvbnMpO1xuICAgIGNsb25lLnRyYW5zbGF0b3Iub24oJyonLCAoZXZlbnQsIC4uLmFyZ3MpID0+IHtcbiAgICAgIGNsb25lLmVtaXQoZXZlbnQsIC4uLmFyZ3MpO1xuICAgIH0pO1xuICAgIGNsb25lLmluaXQobWVyZ2VkT3B0aW9ucywgY2FsbGJhY2spO1xuICAgIGNsb25lLnRyYW5zbGF0b3Iub3B0aW9ucyA9IG1lcmdlZE9wdGlvbnM7IC8vIHN5bmMgb3B0aW9uc1xuICAgIGNsb25lLnRyYW5zbGF0b3IuYmFja2VuZENvbm5lY3Rvci5zZXJ2aWNlcy51dGlscyA9IHtcbiAgICAgIGhhc0xvYWRlZE5hbWVzcGFjZTogY2xvbmUuaGFzTG9hZGVkTmFtZXNwYWNlLmJpbmQoY2xvbmUpXG4gICAgfTtcblxuICAgIHJldHVybiBjbG9uZTtcbiAgfVxuXG4gIHRvSlNPTigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgb3B0aW9uczogdGhpcy5vcHRpb25zLFxuICAgICAgc3RvcmU6IHRoaXMuc3RvcmUsXG4gICAgICBsYW5ndWFnZTogdGhpcy5sYW5ndWFnZSxcbiAgICAgIGxhbmd1YWdlczogdGhpcy5sYW5ndWFnZXMsXG4gICAgICByZXNvbHZlZExhbmd1YWdlOiB0aGlzLnJlc29sdmVkTGFuZ3VhZ2VcbiAgICB9O1xuICB9XG59XG5cbmNvbnN0IGluc3RhbmNlID0gSTE4bi5jcmVhdGVJbnN0YW5jZSgpO1xuXG5leHBvcnQgZGVmYXVsdCBpbnN0YW5jZTtcbiIsImltcG9ydCBpMThuZXh0IGZyb20gJy4vaTE4bmV4dC5qcyc7XG5cbmV4cG9ydCB7IGRlZmF1bHQgYXMga2V5RnJvbVNlbGVjdG9yIH0gZnJvbSAnLi9zZWxlY3Rvci5qcyc7XG5cbmV4cG9ydCBkZWZhdWx0IGkxOG5leHQ7XG5cbmV4cG9ydCBjb25zdCBjcmVhdGVJbnN0YW5jZSA9IGkxOG5leHQuY3JlYXRlSW5zdGFuY2U7XG5cbmV4cG9ydCBjb25zdCBkaXIgPSBpMThuZXh0LmRpcjtcbmV4cG9ydCBjb25zdCBpbml0ID0gaTE4bmV4dC5pbml0O1xuZXhwb3J0IGNvbnN0IGxvYWRSZXNvdXJjZXMgPSBpMThuZXh0LmxvYWRSZXNvdXJjZXM7XG5leHBvcnQgY29uc3QgcmVsb2FkUmVzb3VyY2VzID0gaTE4bmV4dC5yZWxvYWRSZXNvdXJjZXM7XG5leHBvcnQgY29uc3QgdXNlID0gaTE4bmV4dC51c2U7XG5leHBvcnQgY29uc3QgY2hhbmdlTGFuZ3VhZ2UgPSBpMThuZXh0LmNoYW5nZUxhbmd1YWdlO1xuZXhwb3J0IGNvbnN0IGdldEZpeGVkVCA9IGkxOG5leHQuZ2V0Rml4ZWRUO1xuZXhwb3J0IGNvbnN0IHQgPSBpMThuZXh0LnQ7XG5leHBvcnQgY29uc3QgZXhpc3RzID0gaTE4bmV4dC5leGlzdHM7XG5leHBvcnQgY29uc3Qgc2V0RGVmYXVsdE5hbWVzcGFjZSA9IGkxOG5leHQuc2V0RGVmYXVsdE5hbWVzcGFjZTtcbmV4cG9ydCBjb25zdCBoYXNMb2FkZWROYW1lc3BhY2UgPSBpMThuZXh0Lmhhc0xvYWRlZE5hbWVzcGFjZTtcbmV4cG9ydCBjb25zdCBsb2FkTmFtZXNwYWNlcyA9IGkxOG5leHQubG9hZE5hbWVzcGFjZXM7XG5leHBvcnQgY29uc3QgbG9hZExhbmd1YWdlcyA9IGkxOG5leHQubG9hZExhbmd1YWdlcztcbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5hbWVzcGFjZSxcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55LFxuICovXG5cbmltcG9ydCB7XG4gICAgZGVmYXVsdCBhcyBpMThuZXh0LFxuICAgIHR5cGUgaTE4biBhcyBpMThuZXh0SW5zdGFuY2UsXG4gICAgdHlwZSBGYWxsYmFja0xuZ09iakxpc3QgYXMgaTE4bmV4dEZhbGxiYWNrTG5nT2JqTGlzdCxcbiAgICB0eXBlIEZhbGxiYWNrTG5nIGFzIGkxOG5leHRGYWxsYmFja0xuZyxcbiAgICB0eXBlIEludGVycG9sYXRpb25PcHRpb25zIGFzIGkxOG5leHRJbnRlcnBvbGF0aW9uT3B0aW9ucyxcbiAgICB0eXBlIFJlYWN0T3B0aW9ucyBhcyBpMThuZXh0UmVhY3RPcHRpb25zLFxuICAgIHR5cGUgSW5pdE9wdGlvbnMgYXMgaTE4bmV4dEluaXRPcHRpb25zLFxuICAgIHR5cGUgVE9wdGlvbnNCYXNlIGFzIGkxOG5leHRUT3B0aW9uc0Jhc2UsXG4gICAgdHlwZSBUT3B0aW9ucyBhcyBpMThuZXh0VE9wdGlvbnMsXG4gICAgdHlwZSBFeGlzdHNGdW5jdGlvbiBhcyBpMThuZXh0RXhpc3RzRnVuY3Rpb24sXG4gICAgdHlwZSBXaXRoVCBhcyBpMThuZXh0V2l0aFQsXG4gICAgdHlwZSBURnVuY3Rpb24gYXMgaTE4bmV4dFRGdW5jdGlvbixcbiAgICB0eXBlIFJlc291cmNlIGFzIGkxOG5leHRSZXNvdXJjZSxcbiAgICB0eXBlIFJlc291cmNlTGFuZ3VhZ2UgYXMgaTE4bmV4dFJlc291cmNlTGFuZ3VhZ2UsXG4gICAgdHlwZSBSZXNvdXJjZUtleSBhcyBpMThuZXh0UmVzb3VyY2VLZXksXG4gICAgdHlwZSBJbnRlcnBvbGF0b3IgYXMgaTE4bmV4dEludGVycG9sYXRvcixcbiAgICB0eXBlIFJlc291cmNlU3RvcmUgYXMgaTE4bmV4dFJlc291cmNlU3RvcmUsXG4gICAgdHlwZSBTZXJ2aWNlcyBhcyBpMThuZXh0U2VydmljZXMsXG4gICAgdHlwZSBNb2R1bGUgYXMgaTE4bmV4dE1vZHVsZSxcbiAgICB0eXBlIENhbGxiYWNrRXJyb3IgYXMgaTE4bmV4dENhbGxiYWNrRXJyb3IsXG4gICAgdHlwZSBSZWFkQ2FsbGJhY2sgYXMgaTE4bmV4dFJlYWRDYWxsYmFjayxcbiAgICB0eXBlIE11bHRpUmVhZENhbGxiYWNrIGFzIGkxOG5leHRNdWx0aVJlYWRDYWxsYmFjayxcbiAgICB0eXBlIEJhY2tlbmRNb2R1bGUgYXMgaTE4bmV4dEJhY2tlbmRNb2R1bGUsXG4gICAgdHlwZSBMYW5ndWFnZURldGVjdG9yTW9kdWxlIGFzIGkxOG5leHRMYW5ndWFnZURldGVjdG9yTW9kdWxlLFxuICAgIHR5cGUgTGFuZ3VhZ2VEZXRlY3RvckFzeW5jTW9kdWxlIGFzIGkxOG5leHRMYW5ndWFnZURldGVjdG9yQXN5bmNNb2R1bGUsXG4gICAgdHlwZSBQb3N0UHJvY2Vzc29yTW9kdWxlIGFzIGkxOG5leHRQb3N0UHJvY2Vzc29yTW9kdWxlLFxuICAgIHR5cGUgTG9nZ2VyTW9kdWxlIGFzIGkxOG5leHRMb2dnZXJNb2R1bGUsXG4gICAgdHlwZSBJMThuRm9ybWF0TW9kdWxlIGFzIGkxOG5leHRJMThuRm9ybWF0TW9kdWxlLFxuICAgIHR5cGUgVGhpcmRQYXJ0eU1vZHVsZSBhcyBpMThuZXh0VGhpcmRQYXJ0eU1vZHVsZSxcbiAgICB0eXBlIE1vZHVsZXMgYXMgaTE4bmV4dE1vZHVsZXMsXG4gICAgdHlwZSBOZXdhYmxlIGFzIGkxOG5leHROZXdhYmxlLFxufSBmcm9tICdpMThuZXh0JztcblxuY29uc3QgaTE4bjogaTE4bi5pMThuID0gaTE4bmV4dDtcblxuZGVjbGFyZSBuYW1lc3BhY2UgaTE4biB7XG4gICAgZXhwb3J0IHR5cGUgaTE4biA9IGkxOG5leHRJbnN0YW5jZTtcbiAgICBleHBvcnQgdHlwZSBGYWxsYmFja0xuZ09iakxpc3QgPSBpMThuZXh0RmFsbGJhY2tMbmdPYmpMaXN0O1xuICAgIGV4cG9ydCB0eXBlIEZhbGxiYWNrTG5nID0gaTE4bmV4dEZhbGxiYWNrTG5nO1xuICAgIGV4cG9ydCB0eXBlIEludGVycG9sYXRpb25PcHRpb25zID0gaTE4bmV4dEludGVycG9sYXRpb25PcHRpb25zO1xuICAgIGV4cG9ydCB0eXBlIFJlYWN0T3B0aW9ucyA9IGkxOG5leHRSZWFjdE9wdGlvbnM7XG4gICAgZXhwb3J0IHR5cGUgSW5pdE9wdGlvbnMgPSBpMThuZXh0SW5pdE9wdGlvbnM7XG4gICAgZXhwb3J0IHR5cGUgVE9wdGlvbnNCYXNlID0gaTE4bmV4dFRPcHRpb25zQmFzZTtcbiAgICBleHBvcnQgdHlwZSBUT3B0aW9uczxUIGV4dGVuZHMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4gPSBSZWNvcmQ8c3RyaW5nLCBhbnk+PiA9IGkxOG5leHRUT3B0aW9uczxUPjtcbiAgICBleHBvcnQgdHlwZSBFeGlzdHNGdW5jdGlvbjxLIGV4dGVuZHMgc3RyaW5nID0gc3RyaW5nLCBUIGV4dGVuZHMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4gPSBSZWNvcmQ8c3RyaW5nLCBhbnk+PiA9IGkxOG5leHRFeGlzdHNGdW5jdGlvbjxLLCBUPjtcbiAgICBleHBvcnQgdHlwZSBXaXRoVCA9IGkxOG5leHRXaXRoVDtcbiAgICBleHBvcnQgdHlwZSBURnVuY3Rpb24gPSBpMThuZXh0VEZ1bmN0aW9uO1xuICAgIGV4cG9ydCB0eXBlIFJlc291cmNlID0gaTE4bmV4dFJlc291cmNlO1xuICAgIGV4cG9ydCB0eXBlIFJlc291cmNlTGFuZ3VhZ2UgPSBpMThuZXh0UmVzb3VyY2VMYW5ndWFnZTtcbiAgICBleHBvcnQgdHlwZSBSZXNvdXJjZUtleSA9IGkxOG5leHRSZXNvdXJjZUtleTtcbiAgICBleHBvcnQgdHlwZSBJbnRlcnBvbGF0b3IgPSBpMThuZXh0SW50ZXJwb2xhdG9yO1xuICAgIGV4cG9ydCB0eXBlIFJlc291cmNlU3RvcmUgPSBpMThuZXh0UmVzb3VyY2VTdG9yZTtcbiAgICBleHBvcnQgdHlwZSBTZXJ2aWNlcyA9IGkxOG5leHRTZXJ2aWNlcztcbiAgICBleHBvcnQgdHlwZSBNb2R1bGUgPSBpMThuZXh0TW9kdWxlO1xuICAgIGV4cG9ydCB0eXBlIENhbGxiYWNrRXJyb3IgPSBpMThuZXh0Q2FsbGJhY2tFcnJvcjtcbiAgICBleHBvcnQgdHlwZSBSZWFkQ2FsbGJhY2sgPSBpMThuZXh0UmVhZENhbGxiYWNrO1xuICAgIGV4cG9ydCB0eXBlIE11bHRpUmVhZENhbGxiYWNrID0gaTE4bmV4dE11bHRpUmVhZENhbGxiYWNrO1xuICAgIGV4cG9ydCB0eXBlIEJhY2tlbmRNb2R1bGU8VCA9IFJlY29yZDxzdHJpbmcsIHVua25vd24+PiA9IGkxOG5leHRCYWNrZW5kTW9kdWxlPFQ+O1xuICAgIGV4cG9ydCB0eXBlIExhbmd1YWdlRGV0ZWN0b3JNb2R1bGUgPSBpMThuZXh0TGFuZ3VhZ2VEZXRlY3Rvck1vZHVsZTtcbiAgICBleHBvcnQgdHlwZSBMYW5ndWFnZURldGVjdG9yQXN5bmNNb2R1bGUgPSBpMThuZXh0TGFuZ3VhZ2VEZXRlY3RvckFzeW5jTW9kdWxlO1xuICAgIGV4cG9ydCB0eXBlIFBvc3RQcm9jZXNzb3JNb2R1bGUgPSBpMThuZXh0UG9zdFByb2Nlc3Nvck1vZHVsZTtcbiAgICBleHBvcnQgdHlwZSBMb2dnZXJNb2R1bGUgPSBpMThuZXh0TG9nZ2VyTW9kdWxlO1xuICAgIGV4cG9ydCB0eXBlIEkxOG5Gb3JtYXRNb2R1bGUgPSBpMThuZXh0STE4bkZvcm1hdE1vZHVsZTtcbiAgICBleHBvcnQgdHlwZSBUaGlyZFBhcnR5TW9kdWxlID0gaTE4bmV4dFRoaXJkUGFydHlNb2R1bGU7XG4gICAgZXhwb3J0IHR5cGUgTW9kdWxlcyA9IGkxOG5leHRNb2R1bGVzO1xuICAgIGV4cG9ydCB0eXBlIE5ld2FibGU8VD4gPSBpMThuZXh0TmV3YWJsZTxUPjtcbn1cblxuZXhwb3J0IHsgaTE4biB9O1xuIl0sIm5hbWVzIjpbInV0aWxzQ29weSIsImVzY2FwZSIsInV0aWxzRXNjYXBlIiwiZ2V0RGVmYXVsdHMiLCJMYW5ndWFnZVV0aWxzIiwiQmFja2VuZENvbm5lY3RvciIsImkxOG5leHQiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0VBQU8sTUFBTSxRQUFRLEdBQUcsQ0FBQyxHQUFHLEtBQUssT0FBTyxHQUFHLEtBQUssUUFBUTs7RUFFeEQ7RUFDTyxNQUFNLEtBQUssR0FBRyxNQUFNO0VBQzNCLEVBQUUsSUFBSSxHQUFHO0VBQ1QsRUFBRSxJQUFJLEdBQUc7O0VBRVQsRUFBRSxNQUFNLE9BQU8sR0FBRyxJQUFJLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxNQUFNLEtBQUs7RUFDbkQsSUFBSSxHQUFHLEdBQUcsT0FBTztFQUNqQixJQUFJLEdBQUcsR0FBRyxNQUFNO0VBQ2hCLEVBQUUsQ0FBQyxDQUFDOztFQUVKLEVBQUUs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RUFBRTs7RUFFRixFQUFFLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztFQUMvQixFQUFFLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO0VBQ3hDLEVBQUUsSUFBSSxJQUFJLEdBQUcsYUFBYSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsTUFBTSxDQUFDO0VBQzdDLEVBQUUsT0FBTyxJQUFJLENBQUMsR0FBRyxLQUFLLFNBQVMsSUFBSSxDQUFDLENBQUMsTUFBTSxFQUFFO0VBQzdDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7RUFDakMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7RUFDaEMsSUFBSSxJQUFJLEdBQUcsYUFBYSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsTUFBTSxDQUFDO0VBQzNDLElBQUksSUFBSSxJQUFJLEVBQUUsR0FBRyxJQUFJLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLFdBQVcsRUFBRTtFQUN4RSxNQUFNLElBQUksQ0FBQyxHQUFHLEdBQUcsU0FBUztFQUMxQixJQUFJO0VBQ0osRUFBRTtFQUNGLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLFFBQVE7RUFDdkMsQ0FBQzs7RUFFTSxNQUFNLFFBQVEsR0FBRyxDQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLE1BQU0sS0FB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QUFLO0VBQ1gsTUFBTSxLQUFLO0VBQ1gsTUFBTSxLQUFLO0VBQ1gsTUFBTSxLQUFLO0VBQ1gsTUFBTSxLQUFLO0VBQ1gsTUFBTSxLQUFLO0VBQ1gsTUFBTSxLQUFLO0VBQ1gsTUFBTSxLQUFLO0VBQ1gsTUFBTSxLQUFLO0VBQ1gsTUFBTSxLQUFLO0VBQ1gsTUFBTSxLQUFLO0VBQ1gsTUFBTSxLQUFLO0VBQ1gsTUFBTSxLQUFLO0VBQ1gsTUFBTSxLQUFLO0VBQ1gsTUFBTSxLQUFLO0VBQ1gsTUFBTSxLQUFLO0VBQ1gsTUFBTSxLQUFLO0VBQ1gsTUFBTSxLQUFLO0VBQ1gsTUFBTSxLQUFLO0VBQ1gsTUFBTSxLQUFLO0VBQ1gsTUFBTSxJQUFJO0VBQ1YsTUFBTSxJQUFJO0VBQ1YsTUFBTSxJQUFJO0VBQ1YsTUFBTSxLQUFLO0VBQ1gsTUFBTSxLQUFLO0VBQ1gsTUFBTSxLQUFLO0VBQ1gsTUFBTSxLQUFLO0VBQ1gsTUFBTSxLQUFLO0VBQ1gsTUFBTSxJQUFJO0VBQ1YsTUFBTSxJQUFJO0VBQ1YsTUFBTSxLQUFLO0VBQ1gsTUFBTSxLQUFLO0VBQ1gsTUFBTSxLQUFLO0VBQ1gsTUFBTSxJQUFJO0VBQ1YsTUFBTSxJQUFJO0VBQ1YsTUFBTSxLQUFLO0VBQ1gsTUFBTSxLQUFLO0VBQ1gsTUFBTSxLQUFLO0VBQ1gsTUFBTSxJQUFJO0VBQ1YsTUFBTSxLQUFLO0VBQ1gsTUFBTSxLQUFLO0VBQ1gsTUFBTSxLQUFLO0VBQ1gsTUFBTSxLQUFLO0VBQ1gsTUFBTSxJQUFJO0VBQ1YsTUFBTSxLQUFLO0VBQ1gsTUFBTTtFQUNOLEtBQUs7O0VBRUwsSUFBSSxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsUUFBUSxFQUFFLGFBQWEsSUFBSSxJQUFJRCxZQUFhLENBQUNELEdBQVcsRUFBRSxFQUFDO0VBQzFGLElBQUksSUFBSSxHQUFHLENBQUMsV0FBVyxFQUFFLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRSxPQUFPLEtBQUs7O0VBRTVELElBQUksT0FBTyxPQUFPLENBQUMsUUFBUSxDQUFDLGFBQWEs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LElBQUksT0FBTztFQUNYLE1BQU0sT0FBTyxFQUFFLElBQUksQ0FBQyxPQUFPO0VBQzNCLE1BQU0sS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLO0VBQ3ZCLE1BQU0sUUFBUSxFQUFFLElBQUksQ0FBQyxRQUFRO0VBQzdCLE1BQU0sU0FBUyxFQUFFLElBQUksQ0FBQyxTQUFTO0VBQy9CLE1BQU0sZ0JBQWdCLEVBQUUsSUFBSSxDQUFDO0VBQzdCLEtBQUs7RUFDTCxFQUFFO0VBQ0Y7O0VBRUEsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLGNBQWMsRUFBRTs7QUN4c0JSRyxVQUFPLENBQUM7O0FBRW5CQSxVQUFPLENBQUM7QUFDUEEsVUFBTyxDQUFDO0FBQ0NBLFVBQU8sQ0FBQztBQUNOQSxVQUFPLENBQUM7QUFDcEJBLFVBQU8sQ0FBQztBQUNHQSxVQUFPLENBQUM7QUFDYkEsVUFBTyxDQUFDO0FBQ2hCQSxVQUFPLENBQUM7QUFDSEEsVUFBTyxDQUFDO0FBQ0tBLFVBQU8sQ0FBQztBQUNUQSxVQUFPLENBQUM7QUFDWkEsVUFBTyxDQUFDO0FBQ1RBLFVBQU8sQ0FBQzs7RUNwQnJDOzs7RUFHRztBQW9DSCxRQUFNLElBQUksR0FBY0E7Ozs7Ozs7Ozs7IiwieF9nb29nbGVfaWdub3JlTGlzdCI6WzAsMSwyLDMsNCw1LDYsNyw4LDksMTAsMTEsMTIsMTMsMTRdLCJzb3VyY2VSb290IjoiY2RwOi8vL0BjZHAvZXh0ZW5zaW9uLWkxOG4vIn0=