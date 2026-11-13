/*!
 * @cdp/extension-i18n 0.9.22
 *   extension for internationalization
 */

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
      if (Object.prototype.hasOwnProperty.call(target, prop)) {
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
    });
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
    const sep = this.options.pluralSeparator;
    const defaultValue =
      (needsZeroSuffixLookup && opt[`defaultValue${sep}zero`]) ||
      opt[`defaultValue${defaultValueSuffix}`] ||
      opt[`defaultValue${defaultValueSuffixOrdinalFallback}`] ||
      // like the lookup: the plain default value first, then the "other" form
      (opt.defaultValue ??
        (needsPluralHandling
          ? opt[`defaultValue${opt.ordinal ? `${sep}ordinal${sep}` : sep}other`]
          : undefined));

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
    if (!code || !code.includes('-')) return code;

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
  // false, 0 and '' are values; null still falls back to a flat key
  if (path == null && ignoreJSONStructure && isString(key)) {
    path = deepFind(data, key, keySeparator);
    if (path === undefined) path = deepFind(defaultData, key, keySeparator);
  }
  return path;
};

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

  interpolate(str, data, lng, options) {
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

    // no placeholder at all: neither regexp can match
    if (isString(str) && !str.includes(this.prefixText)) return str;

    const todos = [
      {
        // unescape if has unescapePrefix/Suffix
        regex: this.regexpUnescape,
        safeValue: (val) => val,
      },
      {
        // regular escape on demand
        regex: this.regexp,
        safeValue: (val) => (this.escapeValue ? this.escape(val) : val),
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
          } else if (options && Object.prototype.hasOwnProperty.call(options, matchedVar)) {
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
    if (this.callbackApi === false || (this.callbackApi === undefined && fc.length === 2)) {
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

export { i18n };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uLWkxOG4ubWpzIiwic291cmNlcyI6WyJpMThuZXh0L3NyYy91dGlscy5qcyIsImkxOG5leHQvc3JjL2xvZ2dlci5qcyIsImkxOG5leHQvc3JjL0V2ZW50RW1pdHRlci5qcyIsImkxOG5leHQvc3JjL1Jlc291cmNlU3RvcmUuanMiLCJpMThuZXh0L3NyYy9zZWxlY3Rvci5qcyIsImkxOG5leHQvc3JjL1RyYW5zbGF0b3IuanMiLCJpMThuZXh0L3NyYy9MYW5ndWFnZVV0aWxzLmpzIiwiaTE4bmV4dC9zcmMvUGx1cmFsUmVzb2x2ZXIuanMiLCJpMThuZXh0L3NyYy9JbnRlcnBvbGF0b3IuanMiLCJpMThuZXh0L3NyYy9Gb3JtYXR0ZXIuanMiLCJpMThuZXh0L3NyYy9CYWNrZW5kQ29ubmVjdG9yLmpzIiwiaTE4bmV4dC9zcmMvZGVmYXVsdHMuanMiLCJpMThuZXh0L3NyYy9pMThuZXh0LmpzIiwiaTE4bmV4dC9zcmMvaW5kZXguanMiLCJpbmRleC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgY29uc3QgaXNTdHJpbmcgPSAob2JqKSA9PiB0eXBlb2Ygb2JqID09PSAnc3RyaW5nJztcblxuLy8gaHR0cDovL2xlYS52ZXJvdS5tZS8yMDE2LzEyL3Jlc29sdmUtcHJvbWlzZXMtZXh0ZXJuYWxseS13aXRoLXRoaXMtb25lLXdlaXJkLXRyaWNrL1xuZXhwb3J0IGNvbnN0IGRlZmVyID0gKCkgPT4ge1xuICBsZXQgcmVzO1xuICBsZXQgcmVqO1xuXG4gIGNvbnN0IHByb21pc2UgPSBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgcmVzID0gcmVzb2x2ZTtcbiAgICByZWogPSByZWplY3Q7XG4gIH0pO1xuXG4gIHByb21pc2UucmVzb2x2ZSA9IHJlcztcbiAgcHJvbWlzZS5yZWplY3QgPSByZWo7XG5cbiAgcmV0dXJuIHByb21pc2U7XG59O1xuXG5leHBvcnQgY29uc3QgbWFrZVN0cmluZyA9IChvYmplY3QpID0+IHtcbiAgaWYgKG9iamVjdCA9PSBudWxsKSByZXR1cm4gJyc7XG4gIHJldHVybiBTdHJpbmcob2JqZWN0KTtcbn07XG5cbi8vIFRoZSBzaGFwZSBvZiBhIGxhbmd1YWdlIGNvZGUgdGhhdCBpMThuZXh0IGFjY2VwdHMgZnJvbSBvdXRzaWRlIChsbmcsIGNoYW5nZUxhbmd1YWdlLCBkZXRlY3RvcnMpIHVubGVzcyBpdCBpc1xuLy8gY29uZmlndXJlZDsgb3RoZXIgY29kZXMgYXJlIHJlZnVzZWQuIE5vdCBhIEJDUCA0NyBjaGVjazogJ2VuX1VTJywgJ3poX0hhbnRfVFcnLCAnc3JAbGF0aW4nIGFuZCAnZGVfREUuVVRGLTgnIHBhc3M7IG1hcmt1cCwgc2xhc2hlcywgc3BhY2VzLFxuLy8gJy4uJywgcHJvdG90eXBlIGtleXMgYW5kIGNvZGVzIG92ZXIgMTI4IGNoYXJhY3RlcnMgZG8gbm90LiBFeHBvcnRlZCBmb3IgcGx1Z2lucyAoZGV0ZWN0b3JzLCBiYWNrZW5kcywgbWlkZGxld2FyZSkuXG5leHBvcnQgY29uc3QgaXNTYWZlTGFuZ3VhZ2VDb2RlID0gKGNvZGUpID0+XG4gIGlzU3RyaW5nKGNvZGUpICYmXG4gIC9eW0EtWmEtejAtOV9ALi1dezEsMTI4fSQvLnRlc3QoY29kZSkgJiZcbiAgIWNvZGUuaW5jbHVkZXMoJy4uJykgJiZcbiAgIVsnX19wcm90b19fJywgJ2NvbnN0cnVjdG9yJywgJ3Byb3RvdHlwZSddLmluY2x1ZGVzKGNvZGUpO1xuXG4vLyBBIHBsdWdpbiBkZWNsYXJlcyBpdHMgY2FsbGluZyBjb252ZW50aW9uIHdpdGggYGNhbGxiYWNrQXBpYCAoaW5zdGFuY2Ugb3Igc3RhdGljIHByb3BlcnR5KTpcbi8vIHRydWUgZm9yIGNhbGxiYWNrcywgZmFsc2UgZm9yIHByb21pc2VzIChvciBzeW5jIHZhbHVlcyksIHVuZGVmaW5lZCB0byBoYXZlIGl0IGd1ZXNzZWQgZnJvbSBGdW5jdGlvbi5sZW5ndGhcbmV4cG9ydCBjb25zdCBjYWxsYmFja0FwaU9mID0gKHBsdWdpbikgPT4gcGx1Z2luPy5jYWxsYmFja0FwaSA/PyBwbHVnaW4/LmNvbnN0cnVjdG9yPy5jYWxsYmFja0FwaTtcblxuZXhwb3J0IGNvbnN0IGNvcHkgPSAoYSwgcywgdCkgPT4ge1xuICBhLmZvckVhY2goKG0pID0+IHtcbiAgICBpZiAoc1ttXSkgdFttXSA9IHNbbV07XG4gIH0pO1xufTtcblxuLy8gV2UgZXh0cmFjdCBvdXQgdGhlIFJlZ0V4cCBkZWZpbml0aW9uIHRvIGltcHJvdmUgcGVyZm9ybWFuY2Ugd2l0aCBSZWFjdCBOYXRpdmUgQW5kcm9pZCwgd2hpY2ggaGFzIHBvb3IgUmVnRXhwXG4vLyBpbml0aWFsaXphdGlvbiBwZXJmb3JtYW5jZVxuY29uc3QgbGFzdE9mUGF0aFNlcGFyYXRvclJlZ0V4cCA9IC8jIyMvZztcblxuY29uc3QgY2xlYW5LZXkgPSAoa2V5KSA9PlxuICBrZXkgJiYga2V5LmluY2x1ZGVzKCcjIyMnKSA/IGtleS5yZXBsYWNlKGxhc3RPZlBhdGhTZXBhcmF0b3JSZWdFeHAsICcuJykgOiBrZXk7XG5cbmNvbnN0IGNhbk5vdFRyYXZlcnNlRGVlcGVyID0gKG9iamVjdCkgPT4gIW9iamVjdCB8fCBpc1N0cmluZyhvYmplY3QpO1xuXG5jb25zdCBnZXRMYXN0T2ZQYXRoID0gKG9iamVjdCwgcGF0aCwgRW1wdHkpID0+IHtcbiAgY29uc3Qgc3RhY2sgPSAhaXNTdHJpbmcocGF0aCkgPyBwYXRoIDogcGF0aC5zcGxpdCgnLicpO1xuICBsZXQgc3RhY2tJbmRleCA9IDA7XG4gIC8vIGl0ZXJhdGUgdGhyb3VnaCB0aGUgc3RhY2ssIGJ1dCBsZWF2ZSB0aGUgbGFzdCBpdGVtXG4gIHdoaWxlIChzdGFja0luZGV4IDwgc3RhY2subGVuZ3RoIC0gMSkge1xuICAgIGlmIChjYW5Ob3RUcmF2ZXJzZURlZXBlcihvYmplY3QpKSByZXR1cm4ge307XG5cbiAgICBjb25zdCBrZXkgPSBjbGVhbktleShzdGFja1tzdGFja0luZGV4XSk7XG4gICAgaWYgKCFvYmplY3Rba2V5XSAmJiBFbXB0eSkgb2JqZWN0W2tleV0gPSBuZXcgRW1wdHkoKTtcbiAgICAvLyBwcmV2ZW50IHByb3RvdHlwZSBwb2xsdXRpb25cbiAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iamVjdCwga2V5KSkge1xuICAgICAgb2JqZWN0ID0gb2JqZWN0W2tleV07XG4gICAgfSBlbHNlIHtcbiAgICAgIG9iamVjdCA9IHt9O1xuICAgIH1cbiAgICArK3N0YWNrSW5kZXg7XG4gIH1cblxuICBpZiAoY2FuTm90VHJhdmVyc2VEZWVwZXIob2JqZWN0KSkgcmV0dXJuIHt9O1xuICByZXR1cm4ge1xuICAgIG9iajogb2JqZWN0LFxuICAgIGs6IGNsZWFuS2V5KHN0YWNrW3N0YWNrSW5kZXhdKSxcbiAgfTtcbn07XG5cbmV4cG9ydCBjb25zdCBzZXRQYXRoID0gKG9iamVjdCwgcGF0aCwgbmV3VmFsdWUpID0+IHtcbiAgY29uc3QgeyBvYmosIGsgfSA9IGdldExhc3RPZlBhdGgob2JqZWN0LCBwYXRoLCBPYmplY3QpO1xuICBpZiAob2JqICE9PSB1bmRlZmluZWQgfHwgcGF0aC5sZW5ndGggPT09IDEpIHtcbiAgICBvYmpba10gPSBuZXdWYWx1ZTtcbiAgICByZXR1cm47XG4gIH1cblxuICBsZXQgZSA9IHBhdGhbcGF0aC5sZW5ndGggLSAxXTtcbiAgbGV0IHAgPSBwYXRoLnNsaWNlKDAsIHBhdGgubGVuZ3RoIC0gMSk7XG4gIGxldCBsYXN0ID0gZ2V0TGFzdE9mUGF0aChvYmplY3QsIHAsIE9iamVjdCk7XG4gIHdoaWxlIChsYXN0Lm9iaiA9PT0gdW5kZWZpbmVkICYmIHAubGVuZ3RoKSB7XG4gICAgZSA9IGAke3BbcC5sZW5ndGggLSAxXX0uJHtlfWA7XG4gICAgcCA9IHAuc2xpY2UoMCwgcC5sZW5ndGggLSAxKTtcbiAgICBsYXN0ID0gZ2V0TGFzdE9mUGF0aChvYmplY3QsIHAsIE9iamVjdCk7XG4gICAgaWYgKGxhc3Q/Lm9iaiAmJiB0eXBlb2YgbGFzdC5vYmpbYCR7bGFzdC5rfS4ke2V9YF0gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICBsYXN0Lm9iaiA9IHVuZGVmaW5lZDtcbiAgICB9XG4gIH1cbiAgbGFzdC5vYmpbYCR7bGFzdC5rfS4ke2V9YF0gPSBuZXdWYWx1ZTtcbn07XG5cbmV4cG9ydCBjb25zdCBwdXNoUGF0aCA9IChvYmplY3QsIHBhdGgsIG5ld1ZhbHVlLCBjb25jYXQpID0+IHtcbiAgY29uc3QgeyBvYmosIGsgfSA9IGdldExhc3RPZlBhdGgob2JqZWN0LCBwYXRoLCBPYmplY3QpO1xuXG4gIG9ialtrXSA9IG9ialtrXSB8fCBbXTtcbiAgaWYgKGNvbmNhdCkgb2JqW2tdID0gb2JqW2tdLmNvbmNhdChuZXdWYWx1ZSk7XG4gIGlmICghY29uY2F0KSBvYmpba10ucHVzaChuZXdWYWx1ZSk7XG59O1xuXG5leHBvcnQgY29uc3QgZ2V0UGF0aCA9IChvYmplY3QsIHBhdGgpID0+IHtcbiAgY29uc3QgeyBvYmosIGsgfSA9IGdldExhc3RPZlBhdGgob2JqZWN0LCBwYXRoKTtcblxuICBpZiAoIW9iaikgcmV0dXJuIHVuZGVmaW5lZDtcbiAgaWYgKCFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBrKSkgcmV0dXJuIHVuZGVmaW5lZDtcbiAgcmV0dXJuIG9ialtrXTtcbn07XG5cbmV4cG9ydCBjb25zdCBnZXRQYXRoV2l0aERlZmF1bHRzID0gKGRhdGEsIGRlZmF1bHREYXRhLCBrZXkpID0+IHtcbiAgY29uc3QgdmFsdWUgPSBnZXRQYXRoKGRhdGEsIGtleSk7XG4gIGlmICh2YWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIHZhbHVlO1xuICB9XG4gIC8vIEZhbGxiYWNrIHRvIGRlZmF1bHQgdmFsdWVzXG4gIHJldHVybiBnZXRQYXRoKGRlZmF1bHREYXRhLCBrZXkpO1xufTtcblxuZXhwb3J0IGNvbnN0IGRlZXBFeHRlbmQgPSAodGFyZ2V0LCBzb3VyY2UsIG92ZXJ3cml0ZSkgPT4ge1xuICBmb3IgKGNvbnN0IHByb3AgaW4gc291cmNlKSB7XG4gICAgaWYgKHByb3AgIT09ICdfX3Byb3RvX18nICYmIHByb3AgIT09ICdjb25zdHJ1Y3RvcicpIHtcbiAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwodGFyZ2V0LCBwcm9wKSkge1xuICAgICAgICAvLyBJZiB3ZSByZWFjaGVkIGEgbGVhZiBzdHJpbmcgaW4gdGFyZ2V0IG9yIHNvdXJjZSB0aGVuIHJlcGxhY2Ugd2l0aCBzb3VyY2Ugb3Igc2tpcCBkZXBlbmRpbmcgb24gdGhlICdvdmVyd3JpdGUnIHN3aXRjaFxuICAgICAgICBpZiAoXG4gICAgICAgICAgaXNTdHJpbmcodGFyZ2V0W3Byb3BdKSB8fFxuICAgICAgICAgIHRhcmdldFtwcm9wXSBpbnN0YW5jZW9mIFN0cmluZyB8fFxuICAgICAgICAgIGlzU3RyaW5nKHNvdXJjZVtwcm9wXSkgfHxcbiAgICAgICAgICBzb3VyY2VbcHJvcF0gaW5zdGFuY2VvZiBTdHJpbmdcbiAgICAgICAgKSB7XG4gICAgICAgICAgaWYgKG92ZXJ3cml0ZSkgdGFyZ2V0W3Byb3BdID0gc291cmNlW3Byb3BdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGRlZXBFeHRlbmQodGFyZ2V0W3Byb3BdLCBzb3VyY2VbcHJvcF0sIG92ZXJ3cml0ZSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRhcmdldFtwcm9wXSA9IHNvdXJjZVtwcm9wXTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIHRhcmdldDtcbn07XG5cbmV4cG9ydCBjb25zdCByZWdleEVzY2FwZSA9IChzdHIpID0+XG4gIC8qIGVzbGludCBuby11c2VsZXNzLWVzY2FwZTogMCAqL1xuICBzdHIucmVwbGFjZSgvW1xcLVxcW1xcXVxcL1xce1xcfVxcKFxcKVxcKlxcK1xcP1xcLlxcXFxcXF5cXCRcXHxdL2csICdcXFxcJCYnKTtcblxuY29uc3QgX2VudGl0eU1hcCA9IHtcbiAgJyYnOiAnJmFtcDsnLFxuICAnPCc6ICcmbHQ7JyxcbiAgJz4nOiAnJmd0OycsXG4gICdcIic6ICcmcXVvdDsnLFxuICBcIidcIjogJyYjMzk7Jyxcbn07XG5cbmV4cG9ydCBjb25zdCBlc2NhcGUgPSAoZGF0YSkgPT4ge1xuICBpZiAoaXNTdHJpbmcoZGF0YSkpIHtcbiAgICByZXR1cm4gZGF0YS5yZXBsYWNlKC9bJjw+XCInXS9nLCAocykgPT4gX2VudGl0eU1hcFtzXSk7XG4gIH1cblxuICByZXR1cm4gZGF0YTtcbn07XG5cbi8qKlxuICogVGhpcyBpcyBhIHJldXNhYmxlIHJlZ3VsYXIgZXhwcmVzc2lvbiBjYWNoZSBjbGFzcy4gR2l2ZW4gYSBjZXJ0YWluIG1heGltdW0gbnVtYmVyIG9mIHJlZ3VsYXIgZXhwcmVzc2lvbnMgd2UncmVcbiAqIGFsbG93ZWQgdG8gc3RvcmUgaW4gdGhlIGNhY2hlLCBpdCBwcm92aWRlcyBhIHdheSB0byBhdm9pZCByZWNyZWF0aW5nIHJlZ3VsYXIgZXhwcmVzc2lvbiBvYmplY3RzIG92ZXIgYW5kIG92ZXIuXG4gKiBXaGVuIGl0IG5lZWRzIHRvIGV2aWN0IHNvbWV0aGluZywgaXQgZXZpY3RzIHRoZSBvbGRlc3Qgb25lLlxuICovXG5jbGFzcyBSZWdFeHBDYWNoZSB7XG4gIGNvbnN0cnVjdG9yKGNhcGFjaXR5KSB7XG4gICAgdGhpcy5jYXBhY2l0eSA9IGNhcGFjaXR5O1xuICAgIHRoaXMucmVnRXhwTWFwID0gbmV3IE1hcCgpO1xuICAgIC8vIFNpbmNlIG91ciBjYXBhY2l0eSB0ZW5kcyB0byBiZSBmYWlybHkgc21hbGwsIGAuc2hpZnQoKWAgd2lsbCBiZSBmYWlybHkgcXVpY2sgZGVzcGl0ZSBiZWluZyBPKG4pLiBXZSBqdXN0IHVzZSBhXG4gICAgLy8gbm9ybWFsIGFycmF5IHRvIGtlZXAgaXQgc2ltcGxlLlxuICAgIHRoaXMucmVnRXhwUXVldWUgPSBbXTtcbiAgfVxuXG4gIGdldFJlZ0V4cChwYXR0ZXJuKSB7XG4gICAgY29uc3QgcmVnRXhwRnJvbUNhY2hlID0gdGhpcy5yZWdFeHBNYXAuZ2V0KHBhdHRlcm4pO1xuICAgIGlmIChyZWdFeHBGcm9tQ2FjaGUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIHJlZ0V4cEZyb21DYWNoZTtcbiAgICB9XG4gICAgY29uc3QgcmVnRXhwTmV3ID0gbmV3IFJlZ0V4cChwYXR0ZXJuKTtcbiAgICBpZiAodGhpcy5yZWdFeHBRdWV1ZS5sZW5ndGggPT09IHRoaXMuY2FwYWNpdHkpIHtcbiAgICAgIHRoaXMucmVnRXhwTWFwLmRlbGV0ZSh0aGlzLnJlZ0V4cFF1ZXVlLnNoaWZ0KCkpO1xuICAgIH1cbiAgICB0aGlzLnJlZ0V4cE1hcC5zZXQocGF0dGVybiwgcmVnRXhwTmV3KTtcbiAgICB0aGlzLnJlZ0V4cFF1ZXVlLnB1c2gocGF0dGVybik7XG4gICAgcmV0dXJuIHJlZ0V4cE5ldztcbiAgfVxufVxuXG5jb25zdCBjaGFycyA9IFsnICcsICcsJywgJz8nLCAnIScsICc7J107XG4vLyBXZSBjYWNoZSBSZWdFeHBzIHRvIGltcHJvdmUgcGVyZm9ybWFuY2Ugd2l0aCBSZWFjdCBOYXRpdmUgQW5kcm9pZCwgd2hpY2ggaGFzIHBvb3IgUmVnRXhwIGluaXRpYWxpemF0aW9uIHBlcmZvcm1hbmNlLlxuLy8gQ2FwYWNpdHkgb2YgMjAgc2hvdWxkIGJlIHBsZW50eSwgYXMgbnNTZXBhcmF0b3Iva2V5U2VwYXJhdG9yIGRvbid0IHRlbmQgdG8gdmFyeSBtdWNoIGFjcm9zcyBjYWxscy5cbmNvbnN0IGxvb2tzTGlrZU9iamVjdFBhdGhSZWdFeHBDYWNoZSA9IG5ldyBSZWdFeHBDYWNoZSgyMCk7XG5cbmV4cG9ydCBjb25zdCBsb29rc0xpa2VPYmplY3RQYXRoID0gKGtleSwgbnNTZXBhcmF0b3IsIGtleVNlcGFyYXRvcikgPT4ge1xuICBuc1NlcGFyYXRvciA9IG5zU2VwYXJhdG9yIHx8ICcnO1xuICBrZXlTZXBhcmF0b3IgPSBrZXlTZXBhcmF0b3IgfHwgJyc7XG4gIGNvbnN0IHBvc3NpYmxlQ2hhcnMgPSBjaGFycy5maWx0ZXIoKGMpID0+ICFuc1NlcGFyYXRvci5pbmNsdWRlcyhjKSAmJiAha2V5U2VwYXJhdG9yLmluY2x1ZGVzKGMpKTtcbiAgaWYgKHBvc3NpYmxlQ2hhcnMubGVuZ3RoID09PSAwKSByZXR1cm4gdHJ1ZTtcbiAgY29uc3QgciA9IGxvb2tzTGlrZU9iamVjdFBhdGhSZWdFeHBDYWNoZS5nZXRSZWdFeHAoXG4gICAgYCgke3Bvc3NpYmxlQ2hhcnMubWFwKChjKSA9PiAoYyA9PT0gJz8nID8gJ1xcXFw/JyA6IGMpKS5qb2luKCd8Jyl9KWAsXG4gICk7XG4gIGxldCBtYXRjaGVkID0gIXIudGVzdChrZXkpO1xuICBpZiAoIW1hdGNoZWQpIHtcbiAgICBjb25zdCBraSA9IGtleS5pbmRleE9mKGtleVNlcGFyYXRvcik7XG4gICAgaWYgKGtpID4gMCAmJiAhci50ZXN0KGtleS5zdWJzdHJpbmcoMCwga2kpKSkge1xuICAgICAgbWF0Y2hlZCA9IHRydWU7XG4gICAgfVxuICB9XG4gIHJldHVybiBtYXRjaGVkO1xufTtcblxuLyoqXG4gKiBHaXZlblxuICpcbiAqIDEuIGEgdG9wIGxldmVsIG9iamVjdCBvYmosIGFuZFxuICogMi4gYSBwYXRoIHRvIGEgZGVlcGx5IG5lc3RlZCBzdHJpbmcgb3Igb2JqZWN0IHdpdGhpbiBpdFxuICpcbiAqIEZpbmQgYW5kIHJldHVybiB0aGF0IGRlZXBseSBuZXN0ZWQgc3RyaW5nIG9yIG9iamVjdC4gVGhlIGNhdmVhdCBpcyB0aGF0IHRoZSBrZXlzIG9mIG9iamVjdHMgd2l0aGluIHRoZSBuZXN0aW5nIGNoYWluXG4gKiBtYXkgY29udGFpbiBwZXJpb2QgY2hhcmFjdGVycy4gVGhlcmVmb3JlLCB3ZSBuZWVkIHRvIERGUyBhbmQgZXhwbG9yZSBhbGwgcG9zc2libGUga2V5cyBhdCBlYWNoIHN0ZXAgdW50aWwgd2UgZmluZCB0aGVcbiAqIGRlZXBseSBuZXN0ZWQgc3RyaW5nIG9yIG9iamVjdC5cbiAqL1xuZXhwb3J0IGNvbnN0IGRlZXBGaW5kID0gKG9iaiwgcGF0aCwga2V5U2VwYXJhdG9yID0gJy4nKSA9PiB7XG4gIGlmICghb2JqKSByZXR1cm4gdW5kZWZpbmVkO1xuICBpZiAob2JqW3BhdGhdKSB7XG4gICAgaWYgKCFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBwYXRoKSkgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICByZXR1cm4gb2JqW3BhdGhdO1xuICB9XG4gIC8vIGtleVNlcGFyYXRvcjogZmFsc2UgbWVhbnMgZmxhdCBrZXlzIG9ubHksIHRoZXJlIGlzIG5vdGhpbmcgdG8gc3BsaXQgKG5vdCBldmVuIGF0IHRoZSB0ZXh0ICdmYWxzZScpXG4gIGlmICgha2V5U2VwYXJhdG9yKSB7XG4gICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIHBhdGgpID8gb2JqW3BhdGhdIDogdW5kZWZpbmVkO1xuICB9XG4gIGNvbnN0IHRva2VucyA9IHBhdGguc3BsaXQoa2V5U2VwYXJhdG9yKTtcbiAgbGV0IGN1cnJlbnQgPSBvYmo7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgdG9rZW5zLmxlbmd0aDspIHtcbiAgICBpZiAoIWN1cnJlbnQgfHwgdHlwZW9mIGN1cnJlbnQgIT09ICdvYmplY3QnKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBsZXQgbmV4dDtcbiAgICBsZXQgbmV4dFBhdGggPSAnJztcbiAgICBmb3IgKGxldCBqID0gaTsgaiA8IHRva2Vucy5sZW5ndGg7ICsraikge1xuICAgICAgaWYgKGogIT09IGkpIHtcbiAgICAgICAgbmV4dFBhdGggKz0ga2V5U2VwYXJhdG9yO1xuICAgICAgfVxuICAgICAgbmV4dFBhdGggKz0gdG9rZW5zW2pdO1xuICAgICAgbmV4dCA9IGN1cnJlbnRbbmV4dFBhdGhdO1xuICAgICAgLy8gbGlrZSB0aGUgdG9wLWxldmVsIGxvb2t1cCBhYm92ZSwgZG9uJ3QgcmVzb2x2ZSB0byBidWlsdC1pbiBtZXRob2RzIHN1Y2ggYXNcbiAgICAgIC8vIGBjb25zdHJ1Y3RvcmAgb3IgYHRvU3RyaW5nYCwgd2hpY2ggd291bGQgYmUgcHJpbnRlZCBhcyBmdW5jdGlvbiBzb3VyY2UsXG4gICAgICAvLyBhbmQgZG9uJ3Qgd2FsayBpbnRvIHRoZSBwcm90b3R5cGUgdmlhIGBfX3Byb3RvX19gXG4gICAgICBpZiAoXG4gICAgICAgICh0eXBlb2YgbmV4dCA9PT0gJ2Z1bmN0aW9uJyB8fCBuZXh0UGF0aCA9PT0gJ19fcHJvdG9fXycpICYmXG4gICAgICAgICFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoY3VycmVudCwgbmV4dFBhdGgpXG4gICAgICApIHtcbiAgICAgICAgbmV4dCA9IHVuZGVmaW5lZDtcbiAgICAgIH1cbiAgICAgIGlmIChuZXh0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaWYgKFsnc3RyaW5nJywgJ251bWJlcicsICdib29sZWFuJ10uaW5jbHVkZXModHlwZW9mIG5leHQpICYmIGogPCB0b2tlbnMubGVuZ3RoIC0gMSkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIGkgKz0gaiAtIGkgKyAxO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gICAgY3VycmVudCA9IG5leHQ7XG4gIH1cbiAgcmV0dXJuIGN1cnJlbnQ7XG59O1xuXG5leHBvcnQgY29uc3QgZ2V0Q2xlYW5lZENvZGUgPSAoY29kZSkgPT4gY29kZT8ucmVwbGFjZSgvXy9nLCAnLScpO1xuIiwiaW1wb3J0IHsgaXNTdHJpbmcgfSBmcm9tICcuL3V0aWxzLmpzJztcblxuY29uc3QgY29uc29sZUxvZ2dlciA9IHtcbiAgdHlwZTogJ2xvZ2dlcicsXG5cbiAgbG9nKGFyZ3MpIHtcbiAgICB0aGlzLm91dHB1dCgnbG9nJywgYXJncyk7XG4gIH0sXG5cbiAgd2FybihhcmdzKSB7XG4gICAgdGhpcy5vdXRwdXQoJ3dhcm4nLCBhcmdzKTtcbiAgfSxcblxuICBlcnJvcihhcmdzKSB7XG4gICAgdGhpcy5vdXRwdXQoJ2Vycm9yJywgYXJncyk7XG4gIH0sXG5cbiAgb3V0cHV0KHR5cGUsIGFyZ3MpIHtcbiAgICAvKiBlc2xpbnQgbm8tY29uc29sZTogMCAqL1xuICAgIGNvbnNvbGU/Llt0eXBlXT8uYXBwbHk/Lihjb25zb2xlLCBhcmdzKTtcbiAgfSxcbn07XG5cbi8vIEVhY2ggaTE4bmV4dCBpbnN0YW5jZSBoYXMgaXRzIG93biBMb2dnZXIgKGNsb25lcyBzaGFyZSB0aGVpciBwYXJlbnQncyk7IHRoZSBkZWZhdWx0IGV4cG9ydCBzZXJ2ZXNcbi8vIHRoZSBjbGFzc2VzIHdoZW4gdGhleSBhcmUgdXNlZCB3aXRob3V0IGFuIGluc3RhbmNlLlxuZXhwb3J0IGNsYXNzIExvZ2dlciB7XG4gIGNvbnN0cnVjdG9yKGNvbmNyZXRlTG9nZ2VyLCBvcHRpb25zID0ge30pIHtcbiAgICB0aGlzLmluaXQoY29uY3JldGVMb2dnZXIsIG9wdGlvbnMpO1xuICB9XG5cbiAgaW5pdChjb25jcmV0ZUxvZ2dlciwgb3B0aW9ucyA9IHt9KSB7XG4gICAgdGhpcy5wcmVmaXggPSBvcHRpb25zLnByZWZpeCB8fCAnaTE4bmV4dDonO1xuICAgIHRoaXMubG9nZ2VyID0gY29uY3JldGVMb2dnZXIgfHwgY29uc29sZUxvZ2dlcjtcbiAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuICAgIHRoaXMuZGVidWcgPSBvcHRpb25zLmRlYnVnO1xuICAgIHRoaXMuc2VlbiA9IG5ldyBTZXQoKTtcbiAgfVxuXG4gIGxvZyguLi5hcmdzKSB7XG4gICAgcmV0dXJuIHRoaXMuZm9yd2FyZChhcmdzLCAnbG9nJywgJycsIHRydWUpO1xuICB9XG5cbiAgd2FybiguLi5hcmdzKSB7XG4gICAgcmV0dXJuIHRoaXMuZm9yd2FyZChhcmdzLCAnd2FybicsICcnLCB0cnVlKTtcbiAgfVxuXG4gIGVycm9yKC4uLmFyZ3MpIHtcbiAgICByZXR1cm4gdGhpcy5mb3J3YXJkKGFyZ3MsICdlcnJvcicsICcnKTtcbiAgfVxuXG4gIGRlcHJlY2F0ZSguLi5hcmdzKSB7XG4gICAgcmV0dXJuIHRoaXMuZm9yd2FyZChhcmdzLCAnd2FybicsICdXQVJOSU5HIERFUFJFQ0FURUQ6ICcsIHRydWUpO1xuICB9XG5cbiAgLy8gQSBkZWJ1ZyBtZXNzYWdlIGxvZ2dlZCBvbmNlIHBlciBrZXkuIHBvbnl0YWlsOiByZW1lbWJlcnMgMTAwMCBrZXlzIHBlciBsb2dnZXIsIHRoZW4gc3RheXMgcXVpZXRcbiAgb25jZShrZXksIGx2bCwgLi4uYXJncykge1xuICAgIGlmICghdGhpcy5kZWJ1ZyB8fCB0aGlzLnNlZW4uaGFzKGtleSkgfHwgdGhpcy5zZWVuLnNpemUgPj0gMTAwMCkgcmV0dXJuIG51bGw7XG4gICAgdGhpcy5zZWVuLmFkZChrZXkpO1xuICAgIHJldHVybiB0aGlzW2x2bF0oLi4uYXJncyk7XG4gIH1cblxuICBmb3J3YXJkKGFyZ3MsIGx2bCwgcHJlZml4LCBkZWJ1Z09ubHkpIHtcbiAgICBpZiAoZGVidWdPbmx5ICYmICF0aGlzLmRlYnVnKSByZXR1cm4gbnVsbDtcbiAgICAvLyBTdHJpcCBjb250cm9sIGNoYXJhY3RlcnMgZnJvbSBzdHJpbmcgYXJncyB0byBwcmV2ZW50IGxvZyBmb3JnaW5nIHZpYVxuICAgIC8vIHVzZXItY29udHJvbGxlZCB0cmFuc2xhdGlvbiBrZXlzLCBsYW5ndWFnZXMsIG5hbWVzcGFjZXMsIG9yIGludGVycG9sYXRpb25cbiAgICAvLyB2YXJpYWJsZSBuYW1lcyAoQ1dFLTExNykuXG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnRyb2wtcmVnZXhcbiAgICBhcmdzID0gYXJncy5tYXAoKGEpID0+IChpc1N0cmluZyhhKSA/IGEucmVwbGFjZSgvW1xcclxcblxceDAwLVxceDFGXFx4N0ZdL2csICcgJykgOiBhKSk7XG4gICAgaWYgKGlzU3RyaW5nKGFyZ3NbMF0pKSBhcmdzWzBdID0gYCR7cHJlZml4fSR7dGhpcy5wcmVmaXh9ICR7YXJnc1swXX1gO1xuICAgIHJldHVybiB0aGlzLmxvZ2dlcltsdmxdKGFyZ3MpO1xuICB9XG5cbiAgY3JlYXRlKG1vZHVsZU5hbWUpIHtcbiAgICByZXR1cm4gbmV3IExvZ2dlcih0aGlzLmxvZ2dlciwge1xuICAgICAgLi4ueyBwcmVmaXg6IGAke3RoaXMucHJlZml4fToke21vZHVsZU5hbWV9OmAgfSxcbiAgICAgIC4uLnRoaXMub3B0aW9ucyxcbiAgICB9KTtcbiAgfVxuXG4gIGNsb25lKG9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB0aGlzLm9wdGlvbnM7XG4gICAgb3B0aW9ucy5wcmVmaXggPSBvcHRpb25zLnByZWZpeCB8fCB0aGlzLnByZWZpeDtcbiAgICByZXR1cm4gbmV3IExvZ2dlcih0aGlzLmxvZ2dlciwgb3B0aW9ucyk7XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgbmV3IExvZ2dlcigpO1xuIiwiY2xhc3MgRXZlbnRFbWl0dGVyIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgLy8gVGhpcyBpcyBhbiBPYmplY3QgY29udGFpbmluZyBNYXBzOlxuICAgIC8vXG4gICAgLy8geyBbZXZlbnQ6IHN0cmluZ106IE1hcDxsaXN0ZW5lcjogZnVuY3Rpb24sIG51bVRpbWVzQWRkZWQ6IG51bWJlcj4gfVxuICAgIC8vXG4gICAgLy8gV2UgdXNlIGEgTWFwIGZvciBPKDEpIGluc2VydGlvbi9kZWxldGlvbiBhbmQgYmVjYXVzZSBpdCBjYW4gaGF2ZSBmdW5jdGlvbnMgYXMga2V5cy5cbiAgICAvL1xuICAgIC8vIFdlIGtlZXAgdHJhY2sgb2YgbnVtVGltZXNBZGRlZCAodGhlIG51bWJlciBvZiB0aW1lcyBpdCB3YXMgYWRkZWQpIGJlY2F1c2UgaWYgeW91IGF0dGFjaCB0aGUgc2FtZSBsaXN0ZW5lciB0d2ljZSxcbiAgICAvLyB3ZSBzaG91bGQgYWN0dWFsbHkgY2FsbCBpdCB0d2ljZSBmb3IgZWFjaCBlbWl0dGVkIGV2ZW50LlxuICAgIHRoaXMub2JzZXJ2ZXJzID0ge307XG4gIH1cblxuICBvbihldmVudHMsIGxpc3RlbmVyKSB7XG4gICAgZXZlbnRzLnNwbGl0KCcgJykuZm9yRWFjaCgoZXZlbnQpID0+IHtcbiAgICAgIGlmICghdGhpcy5vYnNlcnZlcnNbZXZlbnRdKSB0aGlzLm9ic2VydmVyc1tldmVudF0gPSBuZXcgTWFwKCk7XG4gICAgICBjb25zdCBudW1MaXN0ZW5lcnMgPSB0aGlzLm9ic2VydmVyc1tldmVudF0uZ2V0KGxpc3RlbmVyKSB8fCAwO1xuICAgICAgdGhpcy5vYnNlcnZlcnNbZXZlbnRdLnNldChsaXN0ZW5lciwgbnVtTGlzdGVuZXJzICsgMSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBvZmYoZXZlbnRzLCBsaXN0ZW5lcikge1xuICAgIC8vIGxpa2Ugb24oKSwgYSBzdHJpbmcgbGlzdHMgZXZlbnRzIHNlcGFyYXRlZCBieSBzcGFjZXM7IGFueXRoaW5nIGVsc2UgaXMgbG9va2VkIHVwIGFzIGl0IGlzXG4gICAgKHR5cGVvZiBldmVudHMgPT09ICdzdHJpbmcnID8gZXZlbnRzLnNwbGl0KCcgJykgOiBbZXZlbnRzXSkuZm9yRWFjaCgoZXZlbnQpID0+IHtcbiAgICAgIGlmICghdGhpcy5vYnNlcnZlcnNbZXZlbnRdKSByZXR1cm47XG4gICAgICBpZiAoIWxpc3RlbmVyKSB7XG4gICAgICAgIGRlbGV0ZSB0aGlzLm9ic2VydmVyc1tldmVudF07XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdGhpcy5vYnNlcnZlcnNbZXZlbnRdLmRlbGV0ZShsaXN0ZW5lcik7XG4gICAgfSk7XG4gIH1cblxuICBvbmNlKGV2ZW50LCBsaXN0ZW5lcikge1xuICAgIGNvbnN0IHdyYXBwZXIgPSAoLi4uYXJncykgPT4ge1xuICAgICAgbGlzdGVuZXIoLi4uYXJncyk7XG4gICAgICB0aGlzLm9mZihldmVudCwgd3JhcHBlcik7XG4gICAgfTtcbiAgICB0aGlzLm9uKGV2ZW50LCB3cmFwcGVyKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGVtaXQoZXZlbnQsIC4uLmFyZ3MpIHtcbiAgICBpZiAodGhpcy5vYnNlcnZlcnNbZXZlbnRdKSB7XG4gICAgICBjb25zdCBjbG9uZWQgPSBBcnJheS5mcm9tKHRoaXMub2JzZXJ2ZXJzW2V2ZW50XS5lbnRyaWVzKCkpO1xuICAgICAgY2xvbmVkLmZvckVhY2goKFtvYnNlcnZlciwgbnVtVGltZXNBZGRlZF0pID0+IHtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBudW1UaW1lc0FkZGVkOyBpKyspIHtcbiAgICAgICAgICBvYnNlcnZlciguLi5hcmdzKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMub2JzZXJ2ZXJzWycqJ10pIHtcbiAgICAgIGNvbnN0IGNsb25lZCA9IEFycmF5LmZyb20odGhpcy5vYnNlcnZlcnNbJyonXS5lbnRyaWVzKCkpO1xuICAgICAgY2xvbmVkLmZvckVhY2goKFtvYnNlcnZlciwgbnVtVGltZXNBZGRlZF0pID0+IHtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBudW1UaW1lc0FkZGVkOyBpKyspIHtcbiAgICAgICAgICBvYnNlcnZlcihldmVudCwgLi4uYXJncyk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBFdmVudEVtaXR0ZXI7XG4iLCJpbXBvcnQgRXZlbnRFbWl0dGVyIGZyb20gJy4vRXZlbnRFbWl0dGVyLmpzJztcbmltcG9ydCBiYXNlTG9nZ2VyIGZyb20gJy4vbG9nZ2VyLmpzJztcbmltcG9ydCB7IGdldFBhdGgsIGRlZXBGaW5kLCBzZXRQYXRoLCBkZWVwRXh0ZW5kLCBpc1N0cmluZyB9IGZyb20gJy4vdXRpbHMuanMnO1xuXG4vLyBCdW5kbGVzIGFscmVhZHkgc2VlbiB3aXRoIGtleXMsIHNoYXJlZCBhY3Jvc3MgaW5zdGFuY2VzIHNvIFNTUiBzZXR1cHMgcmV1c2luZyB0aGUgc2FtZVxuLy8gcmVzb3VyY2VzIHNraXAgZW51bWVyYXRpbmcgbGFyZ2UgYnVuZGxlcyBvbiBldmVyeSBpbml0ICgjMjQ0OSkuIE9ubHkgXCJub24tZW1wdHlcIiBpcyBjYWNoZWQ6XG4vLyBubyBBUEkgcmVtb3ZlcyBzaW5nbGUga2V5cyBmcm9tIGEgYnVuZGxlLCBzbyBhIG5vbi1lbXB0eSBidW5kbGUgc3RheXMgbm9uLWVtcHR5LlxuLy8gcG9ueXRhaWw6IGEgYnVuZGxlIGVtcHRpZWQgYnkgaGFuZCB3aXRoIGBkZWxldGVgIG9uIGV2ZXJ5IGtleSBrZWVwcyBjb3VudGluZyBhcyBub24tZW1wdHlcbmNvbnN0IG5vbkVtcHR5QnVuZGxlcyA9IG5ldyBXZWFrU2V0KCk7XG5cbi8vIFRoZSBkb3R0ZWQgZm9ybSwgYWRkUmVzb3VyY2UoJ2VuLnRyYW5zbGF0aW9uLmtleScsIHZhbHVlKSwgd2FzIHJlbW92ZWQgaW4gdjI3OiB3aXRob3V0IHRoaXMgY2hlY2sgaXRzXG4vLyB2YWx1ZSB3b3VsZCBsYW5kIGluIG9wdGlvbnMubnMsIG9yIGFuIG9iamVjdCB3b3VsZCBhbmQgYnJlYWsgdGhlIG5leHQgbG9va3VwXG5jb25zdCBhc3NlcnRTZXBhcmF0ZUFyZ3VtZW50cyA9IChtZXRob2QsIC4uLmFyZ3MpID0+IHtcbiAgaWYgKGFyZ3Muc29tZSgoYSkgPT4gIWlzU3RyaW5nKGEpKSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXG4gICAgICBgJHttZXRob2R9OiBwYXNzIGxhbmd1YWdlLCBuYW1lc3BhY2Uke21ldGhvZCA9PT0gJ2FkZFJlc291cmNlJyA/ICcgYW5kIGtleScgOiAnJ30gYXMgc2VwYXJhdGUgc3RyaW5nczsgdGhlIGRvdHRlZCBmb3JtICgnZW4udHJhbnNsYXRpb24ua2V5Jykgd2FzIHJlbW92ZWQgaW4gaTE4bmV4dCB2MjdgLFxuICAgICk7XG4gIH1cbn07XG5cbmNsYXNzIFJlc291cmNlU3RvcmUgZXh0ZW5kcyBFdmVudEVtaXR0ZXIge1xuICBjb25zdHJ1Y3RvcihcbiAgICBkYXRhLFxuICAgIG9wdGlvbnMgPSB7IG5zOiBbJ3RyYW5zbGF0aW9uJ10sIGRlZmF1bHROUzogJ3RyYW5zbGF0aW9uJyB9LFxuICAgIGxvZ2dlciA9IGJhc2VMb2dnZXIsXG4gICkge1xuICAgIHN1cGVyKCk7XG5cbiAgICB0aGlzLmRhdGEgPSBkYXRhIHx8IHt9O1xuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG4gICAgdGhpcy5sb2dnZXIgPSBsb2dnZXIuY3JlYXRlKCdyZXNvdXJjZVN0b3JlJyk7XG4gICAgaWYgKHRoaXMub3B0aW9ucy5rZXlTZXBhcmF0b3IgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5vcHRpb25zLmtleVNlcGFyYXRvciA9ICcuJztcbiAgICB9XG4gICAgaWYgKHRoaXMub3B0aW9ucy5pZ25vcmVKU09OU3RydWN0dXJlID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMub3B0aW9ucy5pZ25vcmVKU09OU3RydWN0dXJlID0gdHJ1ZTtcbiAgICB9XG4gIH1cblxuICBhZGROYW1lc3BhY2VzKG5zKSB7XG4gICAgaWYgKCF0aGlzLm9wdGlvbnMubnMuaW5jbHVkZXMobnMpKSB7XG4gICAgICB0aGlzLm9wdGlvbnMubnMucHVzaChucyk7XG4gICAgfVxuICB9XG5cbiAgcmVtb3ZlTmFtZXNwYWNlcyhucykge1xuICAgIGNvbnN0IGluZGV4ID0gdGhpcy5vcHRpb25zLm5zLmluZGV4T2YobnMpO1xuICAgIGlmIChpbmRleCA+IC0xKSB7XG4gICAgICB0aGlzLm9wdGlvbnMubnMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICB9XG4gIH1cblxuICBnZXRSZXNvdXJjZShsbmcsIG5zLCBrZXksIG9wdGlvbnMgPSB7fSkge1xuICAgIGNvbnN0IGtleVNlcGFyYXRvciA9XG4gICAgICBvcHRpb25zLmtleVNlcGFyYXRvciAhPT0gdW5kZWZpbmVkID8gb3B0aW9ucy5rZXlTZXBhcmF0b3IgOiB0aGlzLm9wdGlvbnMua2V5U2VwYXJhdG9yO1xuXG4gICAgY29uc3QgaWdub3JlSlNPTlN0cnVjdHVyZSA9XG4gICAgICBvcHRpb25zLmlnbm9yZUpTT05TdHJ1Y3R1cmUgIT09IHVuZGVmaW5lZFxuICAgICAgICA/IG9wdGlvbnMuaWdub3JlSlNPTlN0cnVjdHVyZVxuICAgICAgICA6IHRoaXMub3B0aW9ucy5pZ25vcmVKU09OU3RydWN0dXJlO1xuXG4gICAgY29uc3QgcGF0aCA9IFtsbmcsIG5zXTtcbiAgICBpZiAoa2V5KSB7XG4gICAgICBpZiAoQXJyYXkuaXNBcnJheShrZXkpKSB7XG4gICAgICAgIHBhdGgucHVzaCguLi5rZXkpO1xuICAgICAgfSBlbHNlIGlmIChpc1N0cmluZyhrZXkpICYmIGtleVNlcGFyYXRvcikge1xuICAgICAgICBwYXRoLnB1c2goLi4ua2V5LnNwbGl0KGtleVNlcGFyYXRvcikpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcGF0aC5wdXNoKGtleSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgcmVzdWx0ID0gZ2V0UGF0aCh0aGlzLmRhdGEsIHBhdGgpO1xuICAgIC8vIGZhbHNlLCAwIGFuZCAnJyBhcmUgdmFsdWVzOyBudWxsIChub3QgYSB2YWxpZCBsb29rdXAgYnkgZGVmYXVsdCkgc3RpbGwgZmFsbHMgYmFjayB0byBhIGZsYXQga2V5XG4gICAgaWYgKHJlc3VsdCAhPSBudWxsIHx8ICFpZ25vcmVKU09OU3RydWN0dXJlIHx8ICFpc1N0cmluZyhrZXkpKSByZXR1cm4gcmVzdWx0O1xuXG4gICAgcmV0dXJuIGRlZXBGaW5kKHRoaXMuZGF0YT8uW2xuZ10/Lltuc10sIGtleSwga2V5U2VwYXJhdG9yKTtcbiAgfVxuXG4gIGFkZFJlc291cmNlKGxuZywgbnMsIGtleSwgdmFsdWUsIG9wdGlvbnMgPSB7IHNpbGVudDogZmFsc2UgfSkge1xuICAgIGFzc2VydFNlcGFyYXRlQXJndW1lbnRzKCdhZGRSZXNvdXJjZScsIGxuZywgbnMsIGtleSk7XG4gICAgY29uc3Qga2V5U2VwYXJhdG9yID1cbiAgICAgIG9wdGlvbnMua2V5U2VwYXJhdG9yICE9PSB1bmRlZmluZWQgPyBvcHRpb25zLmtleVNlcGFyYXRvciA6IHRoaXMub3B0aW9ucy5rZXlTZXBhcmF0b3I7XG5cbiAgICBsZXQgcGF0aCA9IFtsbmcsIG5zXTtcbiAgICBpZiAoa2V5KSBwYXRoID0gcGF0aC5jb25jYXQoa2V5U2VwYXJhdG9yID8ga2V5LnNwbGl0KGtleVNlcGFyYXRvcikgOiBrZXkpO1xuXG4gICAgdGhpcy5hZGROYW1lc3BhY2VzKG5zKTtcblxuICAgIHNldFBhdGgodGhpcy5kYXRhLCBwYXRoLCB2YWx1ZSk7XG5cbiAgICBpZiAoIW9wdGlvbnMuc2lsZW50KSB0aGlzLmVtaXQoJ2FkZGVkJywgbG5nLCBucywga2V5LCB2YWx1ZSk7XG4gIH1cblxuICBhZGRSZXNvdXJjZXMobG5nLCBucywgcmVzb3VyY2VzLCBvcHRpb25zID0geyBzaWxlbnQ6IGZhbHNlIH0pIHtcbiAgICBhc3NlcnRTZXBhcmF0ZUFyZ3VtZW50cygnYWRkUmVzb3VyY2VzJywgbG5nLCBucyk7XG4gICAgLy8gZXZlcnkgdmFsdWUsIGFzIGFkZFJlc291cmNlKCkgdGFrZXMgaXQgKG51bWJlcnMsIGJvb2xlYW5zIGFuZCBvYmplY3RzIHdlcmUgZHJvcHBlZClcbiAgICBPYmplY3Qua2V5cyhyZXNvdXJjZXMgfHwge30pLmZvckVhY2goKG0pID0+IHtcbiAgICAgIGlmIChtID09PSAnX19wcm90b19fJyB8fCBtID09PSAnY29uc3RydWN0b3InKSByZXR1cm47XG4gICAgICB0aGlzLmFkZFJlc291cmNlKGxuZywgbnMsIG0sIHJlc291cmNlc1ttXSwgeyBzaWxlbnQ6IHRydWUgfSk7XG4gICAgfSk7XG4gICAgaWYgKCFvcHRpb25zLnNpbGVudCkgdGhpcy5lbWl0KCdhZGRlZCcsIGxuZywgbnMsIHJlc291cmNlcyk7XG4gIH1cblxuICBhZGRSZXNvdXJjZUJ1bmRsZShcbiAgICBsbmcsXG4gICAgbnMsXG4gICAgcmVzb3VyY2VzLFxuICAgIGRlZXAsXG4gICAgb3ZlcndyaXRlLFxuICAgIG9wdGlvbnMgPSB7IHNpbGVudDogZmFsc2UsIHNraXBDb3B5OiBmYWxzZSB9LFxuICApIHtcbiAgICBhc3NlcnRTZXBhcmF0ZUFyZ3VtZW50cygnYWRkUmVzb3VyY2VCdW5kbGUnLCBsbmcsIG5zKTtcbiAgICBjb25zdCBwYXRoID0gW2xuZywgbnNdO1xuXG4gICAgdGhpcy5hZGROYW1lc3BhY2VzKG5zKTtcblxuICAgIGxldCBwYWNrID0gZ2V0UGF0aCh0aGlzLmRhdGEsIHBhdGgpIHx8IHt9O1xuXG4gICAgaWYgKCFvcHRpb25zLnNraXBDb3B5KSByZXNvdXJjZXMgPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KHJlc291cmNlcykpOyAvLyBtYWtlIGEgY29weSB0byBmaXggIzIwODFcblxuICAgIGlmIChkZWVwKSB7XG4gICAgICBkZWVwRXh0ZW5kKHBhY2ssIHJlc291cmNlcywgb3ZlcndyaXRlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcGFjayA9IHsgLi4ucGFjaywgLi4ucmVzb3VyY2VzIH07XG4gICAgfVxuXG4gICAgc2V0UGF0aCh0aGlzLmRhdGEsIHBhdGgsIHBhY2spO1xuXG4gICAgaWYgKCFvcHRpb25zLnNpbGVudCkgdGhpcy5lbWl0KCdhZGRlZCcsIGxuZywgbnMsIHJlc291cmNlcyk7XG4gIH1cblxuICByZW1vdmVSZXNvdXJjZUJ1bmRsZShsbmcsIG5zKSB7XG4gICAgaWYgKHRoaXMuaGFzUmVzb3VyY2VCdW5kbGUobG5nLCBucykpIHtcbiAgICAgIGRlbGV0ZSB0aGlzLmRhdGFbbG5nXVtuc107XG4gICAgfVxuICAgIHRoaXMucmVtb3ZlTmFtZXNwYWNlcyhucyk7XG5cbiAgICB0aGlzLmVtaXQoJ3JlbW92ZWQnLCBsbmcsIG5zKTtcbiAgfVxuXG4gIGhhc1Jlc291cmNlQnVuZGxlKGxuZywgbnMpIHtcbiAgICByZXR1cm4gdGhpcy5nZXRSZXNvdXJjZShsbmcsIG5zKSAhPT0gdW5kZWZpbmVkO1xuICB9XG5cbiAgZ2V0UmVzb3VyY2VCdW5kbGUobG5nLCBucykge1xuICAgIGlmICghbnMpIG5zID0gdGhpcy5vcHRpb25zLmRlZmF1bHROUztcbiAgICByZXR1cm4gdGhpcy5nZXRSZXNvdXJjZShsbmcsIG5zKTtcbiAgfVxuXG4gIGdldERhdGFCeUxhbmd1YWdlKGxuZykge1xuICAgIHJldHVybiB0aGlzLmRhdGFbbG5nXTtcbiAgfVxuXG4gIGhhc0xhbmd1YWdlU29tZVRyYW5zbGF0aW9ucyhsbmcpIHtcbiAgICBjb25zdCBkYXRhID0gdGhpcy5nZXREYXRhQnlMYW5ndWFnZShsbmcpO1xuICAgIGNvbnN0IG4gPSAoZGF0YSAmJiBPYmplY3Qua2V5cyhkYXRhKSkgfHwgW107XG4gICAgcmV0dXJuICEhbi5maW5kKCh2KSA9PiB7XG4gICAgICBjb25zdCBidW5kbGUgPSBkYXRhW3ZdO1xuICAgICAgaWYgKG5vbkVtcHR5QnVuZGxlcy5oYXMoYnVuZGxlKSkgcmV0dXJuIHRydWU7XG4gICAgICBpZiAoIWJ1bmRsZSB8fCBPYmplY3Qua2V5cyhidW5kbGUpLmxlbmd0aCA9PT0gMCkgcmV0dXJuIGZhbHNlO1xuICAgICAgaWYgKHR5cGVvZiBidW5kbGUgPT09ICdvYmplY3QnKSBub25FbXB0eUJ1bmRsZXMuYWRkKGJ1bmRsZSk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9KTtcbiAgfVxuXG4gIHRvSlNPTigpIHtcbiAgICByZXR1cm4gdGhpcy5kYXRhO1xuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IFJlc291cmNlU3RvcmU7XG4iLCJjb25zdCBQQVRIX0tFWSA9IFN5bWJvbCgnaTE4bmV4dC9QQVRIX0tFWScpO1xuXG5mdW5jdGlvbiBjcmVhdGVQcm94eSgpIHtcbiAgY29uc3Qgc3RhdGUgPSBbXTtcbiAgLy8gYE9iamVjdC5jcmVhdGUobnVsbClgIHRvIHByZXZlbnQgcHJvdG90eXBlIHBvbGx1dGlvblxuICBjb25zdCBoYW5kbGVyID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgbGV0IHByb3h5O1xuICBoYW5kbGVyLmdldCA9ICh0YXJnZXQsIGtleSkgPT4ge1xuICAgIHByb3h5Py5yZXZva2U/LigpO1xuICAgIGlmIChrZXkgPT09IFBBVEhfS0VZKSByZXR1cm4gc3RhdGU7XG4gICAgc3RhdGUucHVzaChrZXkpO1xuICAgIHByb3h5ID0gUHJveHkucmV2b2NhYmxlKHRhcmdldCwgaGFuZGxlcik7XG4gICAgcmV0dXJuIHByb3h5LnByb3h5O1xuICB9O1xuICByZXR1cm4gUHJveHkucmV2b2NhYmxlKE9iamVjdC5jcmVhdGUobnVsbCksIGhhbmRsZXIpLnByb3h5O1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBrZXlzRnJvbVNlbGVjdG9yKHNlbGVjdG9yLCBvcHRzKSB7XG4gIGNvbnN0IHsgW1BBVEhfS0VZXTogcGF0aCB9ID0gc2VsZWN0b3IoY3JlYXRlUHJveHkoKSk7XG5cbiAgLy8ga2V5U2VwYXJhdG9yOiBmYWxzZSBqb2lucyB3aXRoICcuJywgYXMgZ2V0Rml4ZWRUKCkgam9pbnMgYSBrZXkgcHJlZml4OiBgJC5hLmJgIGlzIHRoZSBmbGF0IGtleSAnYS5iJ1xuICAvLyAoam9pbmVkIHdpdGggZmFsc2UgaXQgd2FzICdhZmFsc2ViJylcbiAgY29uc3Qga2V5U2VwYXJhdG9yID0gb3B0cz8ua2V5U2VwYXJhdG9yIHx8ICcuJztcbiAgY29uc3QgbnNTZXBhcmF0b3IgPSBvcHRzPy5uc1NlcGFyYXRvciA/PyAnOic7XG4gIGNvbnN0IHN0cmljdCA9IG9wdHM/LmVuYWJsZVNlbGVjdG9yID09PSAnc3RyaWN0JztcblxuICAvLyBEZWZhdWx0IG1vZGUgKHYyNS44LjE5KTogd2hlbiBgbnNgIGlzIGFuIGFycmF5IG9mIHR3byBvciBtb3JlIG5hbWVzcGFjZXMsXG4gIC8vIEdldFNvdXJjZSBleHBvc2VzIHRoZSBwcmltYXJ5IG5hbWVzcGFjZSdzIGtleXMgZmxhdCBvbiBgJGAsIHdoaWxlIHNlY29uZGFyeVxuICAvLyBuYW1lc3BhY2VzIGFyZSBodW5nIG9mZiBgJGAgdW5kZXIgdGhlaXIgb3duIG5hbWUgKGUuZy4gYCQubnMzLmZyb21OczNgKS5cbiAgLy8gT25seSBhIGxlYWRpbmcgc2VnbWVudCBlcXVhbCB0byBhICpzZWNvbmRhcnkqIG5hbWVzcGFjZSBpcyByZXdyaXR0ZW4uXG4gIC8vIFNpbmdsZS1zdHJpbmcgbnMgYW5kIHByaW1hcnktcHJlZml4ZWQgcGF0aHMgc3RheSBmbGF0IChwcmVzZXJ2ZXMgIzI0MDUpLlxuICAvL1xuICAvLyBTdHJpY3QgbW9kZTogYE5zUmVzb3VyY2VgIGRyb3BzIGl0cyBmbGF0dGVuZWQtcHJpbWFyeSBmb3JtIGF0IHRoZSB0eXBlXG4gIC8vIGxldmVsIOKAlCBgJGAgZXhwb3NlcyBuYW1lc3BhY2VzIHVuaWZvcm1seSwgcHJpbWFyeSBpbmNsdWRlZC4gU28gYHBhdGhbMF1gXG4gIC8vIGlzICphbHdheXMqIGEgbmFtZXNwYWNlIGlkZW50aWZpZXIgd2hlbiBpdCBtYXRjaGVzIHRoZSBzY29wZSdzIG5zIGxpc3QsXG4gIC8vIGFuZCB3ZSByZXdyaXRlIHRvIGBuczxzZXA+cmVzdGAgcmVnYXJkbGVzcyBvZiBzaW5nbGUvbXVsdGktbnMgc2NvcGUgYW5kXG4gIC8vIHJlZ2FyZGxlc3Mgb2YgcHJpbWFyeSB2cyBzZWNvbmRhcnkuIFNlZSAjMjQyOS5cbiAgaWYgKHBhdGgubGVuZ3RoID4gMSAmJiBuc1NlcGFyYXRvcikge1xuICAgIGNvbnN0IG5zID0gb3B0cz8ubnM7XG4gICAgY29uc3QgbnNMaXN0ID0gc3RyaWN0XG4gICAgICA/IEFycmF5LmlzQXJyYXkobnMpXG4gICAgICAgID8gbnNcbiAgICAgICAgOiBuc1xuICAgICAgICAgID8gW25zXVxuICAgICAgICAgIDogbnVsbFxuICAgICAgOiBBcnJheS5pc0FycmF5KG5zKVxuICAgICAgICA/IG5zXG4gICAgICAgIDogbnVsbDtcblxuICAgIGlmIChuc0xpc3QpIHtcbiAgICAgIGNvbnN0IGNhbmRpZGF0ZXMgPSBzdHJpY3QgPyBuc0xpc3QgOiBuc0xpc3QubGVuZ3RoID4gMSA/IG5zTGlzdC5zbGljZSgxKSA6IFtdO1xuICAgICAgaWYgKGNhbmRpZGF0ZXMuaW5jbHVkZXMocGF0aFswXSkpIHtcbiAgICAgICAgcmV0dXJuIGAke3BhdGhbMF19JHtuc1NlcGFyYXRvcn0ke3BhdGguc2xpY2UoMSkuam9pbihrZXlTZXBhcmF0b3IpfWA7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHBhdGguam9pbihrZXlTZXBhcmF0b3IpO1xufVxuIiwiaW1wb3J0IGJhc2VMb2dnZXIgZnJvbSAnLi9sb2dnZXIuanMnO1xuaW1wb3J0IEV2ZW50RW1pdHRlciBmcm9tICcuL0V2ZW50RW1pdHRlci5qcyc7XG5pbXBvcnQgeyBjb3B5IGFzIHV0aWxzQ29weSwgbG9va3NMaWtlT2JqZWN0UGF0aCwgaXNTdHJpbmcgfSBmcm9tICcuL3V0aWxzLmpzJztcbmltcG9ydCBrZXlzRnJvbVNlbGVjdG9yIGZyb20gJy4vc2VsZWN0b3IuanMnO1xuXG5jb25zdCBzaG91bGRIYW5kbGVBc09iamVjdCA9IChyZXMpID0+XG4gICFpc1N0cmluZyhyZXMpICYmIHR5cGVvZiByZXMgIT09ICdib29sZWFuJyAmJiB0eXBlb2YgcmVzICE9PSAnbnVtYmVyJztcblxuY2xhc3MgVHJhbnNsYXRvciBleHRlbmRzIEV2ZW50RW1pdHRlciB7XG4gIGNvbnN0cnVjdG9yKHNlcnZpY2VzLCBvcHRpb25zID0ge30pIHtcbiAgICBzdXBlcigpO1xuXG4gICAgdXRpbHNDb3B5KFxuICAgICAgW1xuICAgICAgICAncmVzb3VyY2VTdG9yZScsXG4gICAgICAgICdsYW5ndWFnZVV0aWxzJyxcbiAgICAgICAgJ3BsdXJhbFJlc29sdmVyJyxcbiAgICAgICAgJ2ludGVycG9sYXRvcicsXG4gICAgICAgICdiYWNrZW5kQ29ubmVjdG9yJyxcbiAgICAgICAgJ2kxOG5Gb3JtYXQnLFxuICAgICAgICAndXRpbHMnLFxuICAgICAgICAncG9zdFByb2Nlc3NvcnMnLFxuICAgICAgXSxcbiAgICAgIHNlcnZpY2VzLFxuICAgICAgdGhpcyxcbiAgICApO1xuXG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcbiAgICBpZiAodGhpcy5vcHRpb25zLmtleVNlcGFyYXRvciA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzLm9wdGlvbnMua2V5U2VwYXJhdG9yID0gJy4nO1xuICAgIH1cblxuICAgIHRoaXMubG9nZ2VyID0gKHNlcnZpY2VzLmxvZ2dlciB8fCBiYXNlTG9nZ2VyKS5jcmVhdGUoJ3RyYW5zbGF0b3InKTtcblxuICAgIHRoaXMuY2hlY2tlZExvYWRlZEZvciA9IHt9O1xuICB9XG5cbiAgY2hhbmdlTGFuZ3VhZ2UobG5nKSB7XG4gICAgaWYgKGxuZykgdGhpcy5sYW5ndWFnZSA9IGxuZztcbiAgfVxuXG4gIGV4aXN0cyhrZXksIG8gPSB7IGludGVycG9sYXRpb246IHt9IH0pIHtcbiAgICBjb25zdCBvcHQgPSB7IC4uLm8gfTtcbiAgICBpZiAoa2V5ID09IG51bGwpIHJldHVybiBmYWxzZTtcbiAgICBjb25zdCByZXNvbHZlZCA9IHRoaXMucmVzb2x2ZShrZXksIG9wdCk7XG5cbiAgICAvLyBJZiBubyByZXNvdXJjZSBmb3VuZCwgcmV0dXJuIGZhbHNlXG4gICAgaWYgKHJlc29sdmVkPy5yZXMgPT09IHVuZGVmaW5lZCkgcmV0dXJuIGZhbHNlO1xuXG4gICAgLy8gQ2hlY2sgaWYgdGhlIHJlc29sdmVkIHJlc291cmNlIGlzIGFuIG9iamVjdFxuICAgIGNvbnN0IGlzT2JqZWN0ID0gc2hvdWxkSGFuZGxlQXNPYmplY3QocmVzb2x2ZWQucmVzKTtcblxuICAgIC8vIElmIHJldHVybk9iamVjdHMgaXMgZXhwbGljaXRseSBzZXQgdG8gZmFsc2UgYW5kIHRoZSByZXNvdXJjZSBpcyBhbiBvYmplY3QsIHJldHVybiBmYWxzZVxuICAgIGlmIChvcHQucmV0dXJuT2JqZWN0cyA9PT0gZmFsc2UgJiYgaXNPYmplY3QpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAvLyBPdGhlcndpc2UgcmV0dXJuIHRydWUgKHJlc291cmNlIGV4aXN0cylcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIGV4dHJhY3RGcm9tS2V5KGtleSwgb3B0KSB7XG4gICAgbGV0IG5zU2VwYXJhdG9yID0gb3B0Lm5zU2VwYXJhdG9yICE9PSB1bmRlZmluZWQgPyBvcHQubnNTZXBhcmF0b3IgOiB0aGlzLm9wdGlvbnMubnNTZXBhcmF0b3I7XG4gICAgaWYgKG5zU2VwYXJhdG9yID09PSB1bmRlZmluZWQpIG5zU2VwYXJhdG9yID0gJzonO1xuXG4gICAgY29uc3Qga2V5U2VwYXJhdG9yID1cbiAgICAgIG9wdC5rZXlTZXBhcmF0b3IgIT09IHVuZGVmaW5lZCA/IG9wdC5rZXlTZXBhcmF0b3IgOiB0aGlzLm9wdGlvbnMua2V5U2VwYXJhdG9yO1xuXG4gICAgbGV0IG5hbWVzcGFjZXMgPSBvcHQubnMgfHwgdGhpcy5vcHRpb25zLmRlZmF1bHROUyB8fCBbXTtcbiAgICBjb25zdCB3b3VsZENoZWNrRm9yTnNJbktleSA9IG5zU2VwYXJhdG9yICYmIGtleS5pbmNsdWRlcyhuc1NlcGFyYXRvcik7XG4gICAgY29uc3Qgc2VlbXNOYXR1cmFsTGFuZ3VhZ2UgPVxuICAgICAgIXRoaXMub3B0aW9ucy51c2VyRGVmaW5lZEtleVNlcGFyYXRvciAmJlxuICAgICAgIW9wdC5rZXlTZXBhcmF0b3IgJiZcbiAgICAgICF0aGlzLm9wdGlvbnMudXNlckRlZmluZWROc1NlcGFyYXRvciAmJlxuICAgICAgIW9wdC5uc1NlcGFyYXRvciAmJlxuICAgICAgIWxvb2tzTGlrZU9iamVjdFBhdGgoa2V5LCBuc1NlcGFyYXRvciwga2V5U2VwYXJhdG9yKTtcbiAgICBpZiAod291bGRDaGVja0Zvck5zSW5LZXkgJiYgIXNlZW1zTmF0dXJhbExhbmd1YWdlKSB7XG4gICAgICBjb25zdCBtID0ga2V5Lm1hdGNoKHRoaXMuaW50ZXJwb2xhdG9yLm5lc3RpbmdSZWdleHApO1xuICAgICAgaWYgKG0gJiYgbS5sZW5ndGggPiAwKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAga2V5LFxuICAgICAgICAgIG5hbWVzcGFjZXM6IGlzU3RyaW5nKG5hbWVzcGFjZXMpID8gW25hbWVzcGFjZXNdIDogbmFtZXNwYWNlcyxcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHBhcnRzID0ga2V5LnNwbGl0KG5zU2VwYXJhdG9yKTtcbiAgICAgIGlmIChcbiAgICAgICAgbnNTZXBhcmF0b3IgIT09IGtleVNlcGFyYXRvciB8fFxuICAgICAgICAobnNTZXBhcmF0b3IgPT09IGtleVNlcGFyYXRvciAmJiB0aGlzLm9wdGlvbnMubnMuaW5jbHVkZXMocGFydHNbMF0pKVxuICAgICAgKVxuICAgICAgICBuYW1lc3BhY2VzID0gcGFydHMuc2hpZnQoKTtcbiAgICAgIGtleSA9IHBhcnRzLmpvaW4oa2V5U2VwYXJhdG9yKTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAga2V5LFxuICAgICAgbmFtZXNwYWNlczogaXNTdHJpbmcobmFtZXNwYWNlcykgPyBbbmFtZXNwYWNlc10gOiBuYW1lc3BhY2VzLFxuICAgIH07XG4gIH1cblxuICB0cmFuc2xhdGUoa2V5cywgbywgbGFzdEtleSkge1xuICAgIGxldCBvcHQgPSB0eXBlb2YgbyA9PT0gJ29iamVjdCcgPyB7IC4uLm8gfSA6IG87XG4gICAgaWYgKHR5cGVvZiBvcHQgIT09ICdvYmplY3QnICYmIHRoaXMub3B0aW9ucy5vdmVybG9hZFRyYW5zbGF0aW9uT3B0aW9uSGFuZGxlcikge1xuICAgICAgb3B0ID0gdGhpcy5vcHRpb25zLm92ZXJsb2FkVHJhbnNsYXRpb25PcHRpb25IYW5kbGVyKGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIGlmICh0eXBlb2Ygb3B0ID09PSAnb2JqZWN0Jykgb3B0ID0geyAuLi5vcHQgfTtcbiAgICBpZiAoIW9wdCkgb3B0ID0ge307XG5cbiAgICAvLyBub24gdmFsaWQga2V5cyBoYW5kbGluZ1xuICAgIGlmIChrZXlzID09IG51bGwgLyogfHwga2V5cyA9PT0gJycgKi8pIHJldHVybiAnJztcbiAgICBpZiAodHlwZW9mIGtleXMgPT09ICdmdW5jdGlvbicpIGtleXMgPSBrZXlzRnJvbVNlbGVjdG9yKGtleXMsIHsgLi4udGhpcy5vcHRpb25zLCAuLi5vcHQgfSk7XG4gICAgaWYgKCFBcnJheS5pc0FycmF5KGtleXMpKSBrZXlzID0gW1N0cmluZyhrZXlzKV07XG4gICAga2V5cyA9IGtleXMubWFwKChrKSA9PlxuICAgICAgdHlwZW9mIGsgPT09ICdmdW5jdGlvbicgPyBrZXlzRnJvbVNlbGVjdG9yKGssIHsgLi4udGhpcy5vcHRpb25zLCAuLi5vcHQgfSkgOiBTdHJpbmcoayksXG4gICAgKTtcblxuICAgIGNvbnN0IHJldHVybkRldGFpbHMgPVxuICAgICAgb3B0LnJldHVybkRldGFpbHMgIT09IHVuZGVmaW5lZCA/IG9wdC5yZXR1cm5EZXRhaWxzIDogdGhpcy5vcHRpb25zLnJldHVybkRldGFpbHM7XG5cbiAgICAvLyBzZXBhcmF0b3JzXG4gICAgY29uc3Qga2V5U2VwYXJhdG9yID1cbiAgICAgIG9wdC5rZXlTZXBhcmF0b3IgIT09IHVuZGVmaW5lZCA/IG9wdC5rZXlTZXBhcmF0b3IgOiB0aGlzLm9wdGlvbnMua2V5U2VwYXJhdG9yO1xuXG4gICAgLy8gZ2V0IG5hbWVzcGFjZShzKVxuICAgIGNvbnN0IHsga2V5LCBuYW1lc3BhY2VzIH0gPSB0aGlzLmV4dHJhY3RGcm9tS2V5KGtleXNba2V5cy5sZW5ndGggLSAxXSwgb3B0KTtcbiAgICBjb25zdCBuYW1lc3BhY2UgPSBuYW1lc3BhY2VzW25hbWVzcGFjZXMubGVuZ3RoIC0gMV07XG5cbiAgICBsZXQgbnNTZXBhcmF0b3IgPSBvcHQubnNTZXBhcmF0b3IgIT09IHVuZGVmaW5lZCA/IG9wdC5uc1NlcGFyYXRvciA6IHRoaXMub3B0aW9ucy5uc1NlcGFyYXRvcjtcbiAgICBpZiAobnNTZXBhcmF0b3IgPT09IHVuZGVmaW5lZCkgbnNTZXBhcmF0b3IgPSAnOic7XG5cbiAgICAvLyByZXR1cm4ga2V5IG9uIENJTW9kZVxuICAgIGNvbnN0IGxuZyA9IG9wdC5sbmcgfHwgdGhpcy5sYW5ndWFnZTtcbiAgICBjb25zdCBhcHBlbmROYW1lc3BhY2VUb0NJTW9kZSA9XG4gICAgICBvcHQuYXBwZW5kTmFtZXNwYWNlVG9DSU1vZGUgfHwgdGhpcy5vcHRpb25zLmFwcGVuZE5hbWVzcGFjZVRvQ0lNb2RlO1xuICAgIGlmIChsbmc/LnRvTG93ZXJDYXNlKCkgPT09ICdjaW1vZGUnKSB7XG4gICAgICBpZiAoYXBwZW5kTmFtZXNwYWNlVG9DSU1vZGUpIHtcbiAgICAgICAgaWYgKHJldHVybkRldGFpbHMpIHtcbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmVzOiBgJHtuYW1lc3BhY2V9JHtuc1NlcGFyYXRvcn0ke2tleX1gLFxuICAgICAgICAgICAgdXNlZEtleToga2V5LFxuICAgICAgICAgICAgZXhhY3RVc2VkS2V5OiBrZXksXG4gICAgICAgICAgICB1c2VkTG5nOiBsbmcsXG4gICAgICAgICAgICB1c2VkTlM6IG5hbWVzcGFjZSxcbiAgICAgICAgICAgIHVzZWRQYXJhbXM6IHRoaXMuZ2V0VXNlZFBhcmFtc0RldGFpbHMob3B0KSxcbiAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBgJHtuYW1lc3BhY2V9JHtuc1NlcGFyYXRvcn0ke2tleX1gO1xuICAgICAgfVxuXG4gICAgICBpZiAocmV0dXJuRGV0YWlscykge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIHJlczoga2V5LFxuICAgICAgICAgIHVzZWRLZXk6IGtleSxcbiAgICAgICAgICBleGFjdFVzZWRLZXk6IGtleSxcbiAgICAgICAgICB1c2VkTG5nOiBsbmcsXG4gICAgICAgICAgdXNlZE5TOiBuYW1lc3BhY2UsXG4gICAgICAgICAgdXNlZFBhcmFtczogdGhpcy5nZXRVc2VkUGFyYW1zRGV0YWlscyhvcHQpLFxuICAgICAgICB9O1xuICAgICAgfVxuICAgICAgcmV0dXJuIGtleTtcbiAgICB9XG5cbiAgICAvLyByZXNvbHZlIGZyb20gc3RvcmVcbiAgICBjb25zdCByZXNvbHZlZCA9IHRoaXMucmVzb2x2ZShrZXlzLCBvcHQpO1xuICAgIGxldCByZXMgPSByZXNvbHZlZD8ucmVzO1xuICAgIGNvbnN0IHJlc1VzZWRLZXkgPSByZXNvbHZlZD8udXNlZEtleSB8fCBrZXk7XG4gICAgY29uc3QgcmVzRXhhY3RVc2VkS2V5ID0gcmVzb2x2ZWQ/LmV4YWN0VXNlZEtleSB8fCBrZXk7XG5cbiAgICBjb25zdCBub09iamVjdCA9IFsnW29iamVjdCBOdW1iZXJdJywgJ1tvYmplY3QgRnVuY3Rpb25dJywgJ1tvYmplY3QgUmVnRXhwXSddO1xuICAgIGNvbnN0IGpvaW5BcnJheXMgPSBvcHQuam9pbkFycmF5cyAhPT0gdW5kZWZpbmVkID8gb3B0LmpvaW5BcnJheXMgOiB0aGlzLm9wdGlvbnMuam9pbkFycmF5cztcblxuICAgIC8vIG9iamVjdFxuICAgIGNvbnN0IGhhbmRsZUFzT2JqZWN0SW5JMThuRm9ybWF0ID0gIXRoaXMuaTE4bkZvcm1hdCB8fCB0aGlzLmkxOG5Gb3JtYXQuaGFuZGxlQXNPYmplY3Q7XG4gICAgY29uc3QgbmVlZHNQbHVyYWxIYW5kbGluZyA9IG9wdC5jb3VudCAhPT0gdW5kZWZpbmVkICYmICFpc1N0cmluZyhvcHQuY291bnQpO1xuICAgIGNvbnN0IGhhc0RlZmF1bHRWYWx1ZSA9IFRyYW5zbGF0b3IuaGFzRGVmYXVsdFZhbHVlKG9wdCk7XG4gICAgY29uc3QgZGVmYXVsdFZhbHVlU3VmZml4ID0gbmVlZHNQbHVyYWxIYW5kbGluZ1xuICAgICAgPyB0aGlzLnBsdXJhbFJlc29sdmVyLmdldFN1ZmZpeChsbmcsIG9wdC5jb3VudCwgb3B0KVxuICAgICAgOiAnJztcbiAgICBjb25zdCBkZWZhdWx0VmFsdWVTdWZmaXhPcmRpbmFsRmFsbGJhY2sgPVxuICAgICAgb3B0Lm9yZGluYWwgJiYgbmVlZHNQbHVyYWxIYW5kbGluZ1xuICAgICAgICA/IHRoaXMucGx1cmFsUmVzb2x2ZXIuZ2V0U3VmZml4KGxuZywgb3B0LmNvdW50LCB7IG9yZGluYWw6IGZhbHNlIH0pXG4gICAgICAgIDogJyc7XG4gICAgY29uc3QgbmVlZHNaZXJvU3VmZml4TG9va3VwID0gbmVlZHNQbHVyYWxIYW5kbGluZyAmJiAhb3B0Lm9yZGluYWwgJiYgb3B0LmNvdW50ID09PSAwO1xuICAgIGNvbnN0IHNlcCA9IHRoaXMub3B0aW9ucy5wbHVyYWxTZXBhcmF0b3I7XG4gICAgY29uc3QgZGVmYXVsdFZhbHVlID1cbiAgICAgIChuZWVkc1plcm9TdWZmaXhMb29rdXAgJiYgb3B0W2BkZWZhdWx0VmFsdWUke3NlcH16ZXJvYF0pIHx8XG4gICAgICBvcHRbYGRlZmF1bHRWYWx1ZSR7ZGVmYXVsdFZhbHVlU3VmZml4fWBdIHx8XG4gICAgICBvcHRbYGRlZmF1bHRWYWx1ZSR7ZGVmYXVsdFZhbHVlU3VmZml4T3JkaW5hbEZhbGxiYWNrfWBdIHx8XG4gICAgICAvLyBsaWtlIHRoZSBsb29rdXA6IHRoZSBwbGFpbiBkZWZhdWx0IHZhbHVlIGZpcnN0LCB0aGVuIHRoZSBcIm90aGVyXCIgZm9ybVxuICAgICAgKG9wdC5kZWZhdWx0VmFsdWUgPz9cbiAgICAgICAgKG5lZWRzUGx1cmFsSGFuZGxpbmdcbiAgICAgICAgICA/IG9wdFtgZGVmYXVsdFZhbHVlJHtvcHQub3JkaW5hbCA/IGAke3NlcH1vcmRpbmFsJHtzZXB9YCA6IHNlcH1vdGhlcmBdXG4gICAgICAgICAgOiB1bmRlZmluZWQpKTtcblxuICAgIGxldCByZXNGb3JPYmpIbmRsID0gcmVzO1xuICAgIGlmIChoYW5kbGVBc09iamVjdEluSTE4bkZvcm1hdCAmJiAhcmVzICYmIGhhc0RlZmF1bHRWYWx1ZSkge1xuICAgICAgcmVzRm9yT2JqSG5kbCA9IGRlZmF1bHRWYWx1ZTtcbiAgICB9XG5cbiAgICBjb25zdCBoYW5kbGVBc09iamVjdCA9IHNob3VsZEhhbmRsZUFzT2JqZWN0KHJlc0Zvck9iakhuZGwpO1xuICAgIGNvbnN0IHJlc1R5cGUgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmFwcGx5KHJlc0Zvck9iakhuZGwpO1xuXG4gICAgY29uc3QgaXNPYmplY3RIaXQgPVxuICAgICAgaGFuZGxlQXNPYmplY3RJbkkxOG5Gb3JtYXQgJiZcbiAgICAgIHJlc0Zvck9iakhuZGwgJiZcbiAgICAgIGhhbmRsZUFzT2JqZWN0ICYmXG4gICAgICAhbm9PYmplY3QuaW5jbHVkZXMocmVzVHlwZSkgJiZcbiAgICAgICEoaXNTdHJpbmcoam9pbkFycmF5cykgJiYgQXJyYXkuaXNBcnJheShyZXNGb3JPYmpIbmRsKSk7XG4gICAgLy8gYW4gb2JqZWN0IG9yIGFycmF5IHdpdGhvdXQgcmV0dXJuT2JqZWN0czogd2hhdCByZXR1cm5lZE9iamVjdEhhbmRsZXIgcmV0dXJucywgZWxzZSBpdCBpcyBoYW5kbGVkXG4gICAgLy8gbGlrZSBhIG1pc3Npbmcga2V5IGJlbG93ICh0aGUgZGVmYXVsdCB2YWx1ZSwgZWxzZSB0aGUga2V5KSwgd2l0aG91dCBzYXZpbmcgaXQsIGFzIHRoZSBrZXkgZXhpc3RzXG4gICAgY29uc3Qgb2JqZWN0Tm90UmV0dXJuZWQgPSBpc09iamVjdEhpdCAmJiAhb3B0LnJldHVybk9iamVjdHMgJiYgIXRoaXMub3B0aW9ucy5yZXR1cm5PYmplY3RzO1xuICAgIGlmIChvYmplY3ROb3RSZXR1cm5lZCAmJiB0aGlzLm9wdGlvbnMucmV0dXJuZWRPYmplY3RIYW5kbGVyKSB7XG4gICAgICBjb25zdCByID0gdGhpcy5vcHRpb25zLnJldHVybmVkT2JqZWN0SGFuZGxlcihyZXNVc2VkS2V5LCByZXNGb3JPYmpIbmRsLCB7XG4gICAgICAgIC4uLm9wdCxcbiAgICAgICAgbnM6IG5hbWVzcGFjZXMsXG4gICAgICB9KTtcbiAgICAgIGlmIChyZXR1cm5EZXRhaWxzKSB7XG4gICAgICAgIHJlc29sdmVkLnJlcyA9IHI7XG4gICAgICAgIHJlc29sdmVkLnVzZWRQYXJhbXMgPSB0aGlzLmdldFVzZWRQYXJhbXNEZXRhaWxzKG9wdCk7XG4gICAgICAgIHJldHVybiByZXNvbHZlZDtcbiAgICAgIH1cbiAgICAgIHJldHVybiByO1xuICAgIH1cbiAgICBpZiAob2JqZWN0Tm90UmV0dXJuZWQpIHtcbiAgICAgIHRoaXMubG9nZ2VyLndhcm4oJ2FjY2Vzc2luZyBhbiBvYmplY3QgLSBidXQgcmV0dXJuT2JqZWN0cyBvcHRpb25zIGlzIG5vdCBlbmFibGVkIScpO1xuICAgIH1cblxuICAgIGlmIChpc09iamVjdEhpdCAmJiAhb2JqZWN0Tm90UmV0dXJuZWQpIHtcbiAgICAgIC8vIGlmIHdlIGdvdCBhIHNlcGFyYXRvciB3ZSBsb29wIG92ZXIgY2hpbGRyZW4gLSBlbHNlIHdlIGp1c3QgcmV0dXJuIG9iamVjdCBhcyBpc1xuICAgICAgLy8gYXMgaGF2aW5nIGl0IHNldCB0byBmYWxzZSBtZWFucyBubyBoaWVyYXJjaHkgc28gbm8gbG9va3VwIGZvciBuZXN0ZWQgdmFsdWVzXG4gICAgICBpZiAoa2V5U2VwYXJhdG9yKSB7XG4gICAgICAgIGNvbnN0IHJlc1R5cGVJc0FycmF5ID0gQXJyYXkuaXNBcnJheShyZXNGb3JPYmpIbmRsKTtcbiAgICAgICAgY29uc3QgY29weSA9IHJlc1R5cGVJc0FycmF5ID8gW10gOiB7fTsgLy8gYXBwbHkgY2hpbGQgdHJhbnNsYXRpb24gb24gYSBjb3B5XG5cbiAgICAgICAgY29uc3QgbmV3S2V5VG9Vc2UgPSByZXNUeXBlSXNBcnJheSA/IHJlc0V4YWN0VXNlZEtleSA6IHJlc1VzZWRLZXk7XG4gICAgICAgIGZvciAoY29uc3QgbSBpbiByZXNGb3JPYmpIbmRsKSB7XG4gICAgICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChyZXNGb3JPYmpIbmRsLCBtKSkge1xuICAgICAgICAgICAgY29uc3QgZGVlcEtleSA9IGAke25ld0tleVRvVXNlfSR7a2V5U2VwYXJhdG9yfSR7bX1gO1xuICAgICAgICAgICAgaWYgKGhhc0RlZmF1bHRWYWx1ZSAmJiAhcmVzKSB7XG4gICAgICAgICAgICAgIGNvcHlbbV0gPSB0aGlzLnRyYW5zbGF0ZShkZWVwS2V5LCB7XG4gICAgICAgICAgICAgICAgLi4ub3B0LFxuICAgICAgICAgICAgICAgIGRlZmF1bHRWYWx1ZTogc2hvdWxkSGFuZGxlQXNPYmplY3QoZGVmYXVsdFZhbHVlKSA/IGRlZmF1bHRWYWx1ZVttXSA6IHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICAuLi57IGpvaW5BcnJheXM6IGZhbHNlLCBuczogbmFtZXNwYWNlcyB9LFxuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGNvcHlbbV0gPSB0aGlzLnRyYW5zbGF0ZShkZWVwS2V5LCB7XG4gICAgICAgICAgICAgICAgLi4ub3B0LFxuICAgICAgICAgICAgICAgIC4uLnsgam9pbkFycmF5czogZmFsc2UsIG5zOiBuYW1lc3BhY2VzIH0sXG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGNvcHlbbV0gPT09IGRlZXBLZXkpIGNvcHlbbV0gPSByZXNGb3JPYmpIbmRsW21dOyAvLyBpZiBub3RoaW5nIGZvdW5kIHVzZSBvcmlnaW5hbCB2YWx1ZSBhcyBmYWxsYmFja1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXMgPSBjb3B5O1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoaGFuZGxlQXNPYmplY3RJbkkxOG5Gb3JtYXQgJiYgaXNTdHJpbmcoam9pbkFycmF5cykgJiYgQXJyYXkuaXNBcnJheShyZXMpKSB7XG4gICAgICAvLyBhcnJheSBzcGVjaWFsIHRyZWF0bWVudFxuICAgICAgcmVzID0gcmVzLmpvaW4oam9pbkFycmF5cyk7XG4gICAgICBpZiAocmVzKSByZXMgPSB0aGlzLmV4dGVuZFRyYW5zbGF0aW9uKHJlcywga2V5cywgb3B0LCByZXNvbHZlZCwgbGFzdEtleSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIHN0cmluZywgZW1wdHkgb3IgbnVsbCAob3IgYW4gb2JqZWN0IHRoYXQgaXMgbm90IHJldHVybmVkKVxuICAgICAgbGV0IHVzZWREZWZhdWx0ID0gZmFsc2U7XG4gICAgICBsZXQgdXNlZEtleSA9IGZhbHNlO1xuICAgICAgaWYgKG9iamVjdE5vdFJldHVybmVkKSByZXMgPSB1bmRlZmluZWQ7XG5cbiAgICAgIC8vIGZhbGxiYWNrIHZhbHVlIChmb3IgYW4gb2JqZWN0IGhpdCwgbm90IGFuIG9iamVjdCBkZWZhdWx0IHZhbHVlIGVpdGhlcilcbiAgICAgIGlmIChcbiAgICAgICAgIXRoaXMuaXNWYWxpZExvb2t1cChyZXMpICYmXG4gICAgICAgIGhhc0RlZmF1bHRWYWx1ZSAmJlxuICAgICAgICAhKG9iamVjdE5vdFJldHVybmVkICYmIHNob3VsZEhhbmRsZUFzT2JqZWN0KGRlZmF1bHRWYWx1ZSkpXG4gICAgICApIHtcbiAgICAgICAgdXNlZERlZmF1bHQgPSB0cnVlO1xuICAgICAgICByZXMgPSBkZWZhdWx0VmFsdWU7XG4gICAgICB9XG4gICAgICAvLyBhbiBleHBsaWNpdCAnJyBkZWZhdWx0IGZyb20gY29kZSBjb3VudHM6IG9ubHkgZW1wdHkgdHJhbnNsYXRpb25zIGZhbGwgYmFjayAocmV0dXJuRW1wdHlTdHJpbmcpXG4gICAgICBpZiAoIXRoaXMuaXNWYWxpZExvb2t1cChyZXMpICYmICEodXNlZERlZmF1bHQgJiYgcmVzID09PSAnJykpIHtcbiAgICAgICAgdXNlZEtleSA9IHRydWU7XG4gICAgICAgIHJlcyA9IGtleTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgbWlzc2luZ0tleU5vVmFsdWVGYWxsYmFja1RvS2V5ID1cbiAgICAgICAgb3B0Lm1pc3NpbmdLZXlOb1ZhbHVlRmFsbGJhY2tUb0tleSB8fCB0aGlzLm9wdGlvbnMubWlzc2luZ0tleU5vVmFsdWVGYWxsYmFja1RvS2V5O1xuICAgICAgY29uc3QgcmVzRm9yTWlzc2luZyA9IG1pc3NpbmdLZXlOb1ZhbHVlRmFsbGJhY2tUb0tleSAmJiB1c2VkS2V5ID8gdW5kZWZpbmVkIDogcmVzO1xuXG4gICAgICAvLyBzYXZlIG1pc3NpbmdcbiAgICAgIGNvbnN0IHVwZGF0ZU1pc3NpbmcgPSBoYXNEZWZhdWx0VmFsdWUgJiYgZGVmYXVsdFZhbHVlICE9PSByZXMgJiYgdGhpcy5vcHRpb25zLnVwZGF0ZU1pc3Npbmc7XG4gICAgICBpZiAoIW9iamVjdE5vdFJldHVybmVkICYmICh1c2VkS2V5IHx8IHVzZWREZWZhdWx0IHx8IHVwZGF0ZU1pc3NpbmcpKSB7XG4gICAgICAgIHRoaXMubG9nZ2VyLmxvZyhcbiAgICAgICAgICB1cGRhdGVNaXNzaW5nID8gJ3VwZGF0ZUtleScgOiAnbWlzc2luZ0tleScsXG4gICAgICAgICAgbG5nLFxuICAgICAgICAgIG5hbWVzcGFjZSxcbiAgICAgICAgICBuZWVkc1BsdXJhbEhhbmRsaW5nICYmICF1cGRhdGVNaXNzaW5nXG4gICAgICAgICAgICA/IGAke2tleX0ke3RoaXMucGx1cmFsUmVzb2x2ZXIuZ2V0U3VmZml4KGxuZywgb3B0LmNvdW50LCBvcHQpfWBcbiAgICAgICAgICAgIDoga2V5LFxuICAgICAgICAgIHVwZGF0ZU1pc3NpbmcgPyBkZWZhdWx0VmFsdWUgOiByZXMsXG4gICAgICAgICk7XG4gICAgICAgIGlmIChrZXlTZXBhcmF0b3IpIHtcbiAgICAgICAgICBjb25zdCBmayA9IHRoaXMucmVzb2x2ZShrZXksIHsgLi4ub3B0LCBrZXlTZXBhcmF0b3I6IGZhbHNlIH0pO1xuICAgICAgICAgIGlmIChmayAmJiBmay5yZXMpXG4gICAgICAgICAgICB0aGlzLmxvZ2dlci53YXJuKFxuICAgICAgICAgICAgICAnU2VlbXMgdGhlIGxvYWRlZCB0cmFuc2xhdGlvbnMgd2VyZSBpbiBmbGF0IEpTT04gZm9ybWF0IGluc3RlYWQgb2YgbmVzdGVkLiBFaXRoZXIgc2V0IGtleVNlcGFyYXRvcjogZmFsc2Ugb24gaW5pdCBvciBtYWtlIHN1cmUgeW91ciB0cmFuc2xhdGlvbnMgYXJlIHB1Ymxpc2hlZCBpbiBuZXN0ZWQgZm9ybWF0LicsXG4gICAgICAgICAgICApO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IGxuZ3MgPSBbXTtcbiAgICAgICAgY29uc3QgZmFsbGJhY2tMbmdzID0gdGhpcy5sYW5ndWFnZVV0aWxzLmdldEZhbGxiYWNrQ29kZXMoXG4gICAgICAgICAgdGhpcy5vcHRpb25zLmZhbGxiYWNrTG5nLFxuICAgICAgICAgIG9wdC5sbmcgfHwgdGhpcy5sYW5ndWFnZSxcbiAgICAgICAgKTtcbiAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5zYXZlTWlzc2luZ1RvID09PSAnZmFsbGJhY2snICYmIGZhbGxiYWNrTG5ncyAmJiBmYWxsYmFja0xuZ3NbMF0pIHtcbiAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGZhbGxiYWNrTG5ncy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgbG5ncy5wdXNoKGZhbGxiYWNrTG5nc1tpXSk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKHRoaXMub3B0aW9ucy5zYXZlTWlzc2luZ1RvID09PSAnYWxsJykge1xuICAgICAgICAgIGxuZ3MgPSB0aGlzLmxhbmd1YWdlVXRpbHMudG9SZXNvbHZlSGllcmFyY2h5KG9wdC5sbmcgfHwgdGhpcy5sYW5ndWFnZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbG5ncy5wdXNoKG9wdC5sbmcgfHwgdGhpcy5sYW5ndWFnZSk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBzZW5kID0gKGwsIGssIHNwZWNpZmljRGVmYXVsdFZhbHVlKSA9PiB7XG4gICAgICAgICAgY29uc3QgZGVmYXVsdEZvck1pc3NpbmcgPVxuICAgICAgICAgICAgaGFzRGVmYXVsdFZhbHVlICYmIHNwZWNpZmljRGVmYXVsdFZhbHVlICE9PSByZXMgPyBzcGVjaWZpY0RlZmF1bHRWYWx1ZSA6IHJlc0Zvck1pc3Npbmc7XG4gICAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5taXNzaW5nS2V5SGFuZGxlcikge1xuICAgICAgICAgICAgdGhpcy5vcHRpb25zLm1pc3NpbmdLZXlIYW5kbGVyKGwsIG5hbWVzcGFjZSwgaywgZGVmYXVsdEZvck1pc3NpbmcsIHVwZGF0ZU1pc3NpbmcsIG9wdCk7XG4gICAgICAgICAgfSBlbHNlIGlmICh0aGlzLmJhY2tlbmRDb25uZWN0b3I/LnNhdmVNaXNzaW5nKSB7XG4gICAgICAgICAgICB0aGlzLmJhY2tlbmRDb25uZWN0b3Iuc2F2ZU1pc3NpbmcoXG4gICAgICAgICAgICAgIGwsXG4gICAgICAgICAgICAgIG5hbWVzcGFjZSxcbiAgICAgICAgICAgICAgayxcbiAgICAgICAgICAgICAgZGVmYXVsdEZvck1pc3NpbmcsXG4gICAgICAgICAgICAgIHVwZGF0ZU1pc3NpbmcsXG4gICAgICAgICAgICAgIG9wdCxcbiAgICAgICAgICAgICAgdW5kZWZpbmVkLFxuICAgICAgICAgICAgICB0aGlzLnV0aWxzPy5oYXNMb2FkZWROYW1lc3BhY2UsXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH1cbiAgICAgICAgICB0aGlzLmVtaXQoJ21pc3NpbmdLZXknLCBsLCBuYW1lc3BhY2UsIGssIHJlcyk7XG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5zYXZlTWlzc2luZykge1xuICAgICAgICAgIGlmICh0aGlzLm9wdGlvbnMuc2F2ZU1pc3NpbmdQbHVyYWxzICYmIG5lZWRzUGx1cmFsSGFuZGxpbmcpIHtcbiAgICAgICAgICAgIGxuZ3MuZm9yRWFjaCgobGFuZ3VhZ2UpID0+IHtcbiAgICAgICAgICAgICAgY29uc3Qgc3VmZml4ZXMgPSB0aGlzLnBsdXJhbFJlc29sdmVyLmdldFN1ZmZpeGVzKGxhbmd1YWdlLCBvcHQpO1xuICAgICAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAgICAgbmVlZHNaZXJvU3VmZml4TG9va3VwICYmXG4gICAgICAgICAgICAgICAgb3B0W2BkZWZhdWx0VmFsdWUke3RoaXMub3B0aW9ucy5wbHVyYWxTZXBhcmF0b3J9emVyb2BdICYmXG4gICAgICAgICAgICAgICAgIXN1ZmZpeGVzLmluY2x1ZGVzKGAke3RoaXMub3B0aW9ucy5wbHVyYWxTZXBhcmF0b3J9emVyb2ApXG4gICAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICAgIHN1ZmZpeGVzLnB1c2goYCR7dGhpcy5vcHRpb25zLnBsdXJhbFNlcGFyYXRvcn16ZXJvYCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgc3VmZml4ZXMuZm9yRWFjaCgoc3VmZml4KSA9PiB7XG4gICAgICAgICAgICAgICAgc2VuZChbbGFuZ3VhZ2VdLCBrZXkgKyBzdWZmaXgsIG9wdFtgZGVmYXVsdFZhbHVlJHtzdWZmaXh9YF0gfHwgZGVmYXVsdFZhbHVlKTtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc2VuZChsbmdzLCBrZXksIGRlZmF1bHRWYWx1ZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIGV4dGVuZFxuICAgICAgcmVzID0gdGhpcy5leHRlbmRUcmFuc2xhdGlvbihyZXMsIGtleXMsIG9wdCwgcmVzb2x2ZWQsIGxhc3RLZXkpO1xuXG4gICAgICAvLyBhcHBlbmQgbmFtZXNwYWNlIGlmIHN0aWxsIGtleVxuICAgICAgaWYgKHVzZWRLZXkgJiYgcmVzID09PSBrZXkgJiYgdGhpcy5vcHRpb25zLmFwcGVuZE5hbWVzcGFjZVRvTWlzc2luZ0tleSkge1xuICAgICAgICByZXMgPSBgJHtuYW1lc3BhY2V9JHtuc1NlcGFyYXRvcn0ke2tleX1gO1xuICAgICAgfVxuXG4gICAgICAvLyBwYXJzZU1pc3NpbmdLZXlIYW5kbGVyXG4gICAgICBpZiAoKHVzZWRLZXkgfHwgdXNlZERlZmF1bHQpICYmIHRoaXMub3B0aW9ucy5wYXJzZU1pc3NpbmdLZXlIYW5kbGVyKSB7XG4gICAgICAgIHJlcyA9IHRoaXMub3B0aW9ucy5wYXJzZU1pc3NpbmdLZXlIYW5kbGVyKFxuICAgICAgICAgIHRoaXMub3B0aW9ucy5hcHBlbmROYW1lc3BhY2VUb01pc3NpbmdLZXkgPyBgJHtuYW1lc3BhY2V9JHtuc1NlcGFyYXRvcn0ke2tleX1gIDoga2V5LFxuICAgICAgICAgIHVzZWREZWZhdWx0ID8gcmVzIDogdW5kZWZpbmVkLFxuICAgICAgICAgIG9wdCxcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyByZXR1cm5cbiAgICBpZiAocmV0dXJuRGV0YWlscykge1xuICAgICAgcmVzb2x2ZWQucmVzID0gcmVzO1xuICAgICAgcmVzb2x2ZWQudXNlZFBhcmFtcyA9IHRoaXMuZ2V0VXNlZFBhcmFtc0RldGFpbHMob3B0KTtcbiAgICAgIHJldHVybiByZXNvbHZlZDtcbiAgICB9XG4gICAgcmV0dXJuIHJlcztcbiAgfVxuXG4gIGV4dGVuZFRyYW5zbGF0aW9uKHJlcywga2V5LCBvcHQsIHJlc29sdmVkLCBsYXN0S2V5KSB7XG4gICAgaWYgKHRoaXMuaTE4bkZvcm1hdD8ucGFyc2UpIHtcbiAgICAgIHJlcyA9IHRoaXMuaTE4bkZvcm1hdC5wYXJzZShcbiAgICAgICAgcmVzLFxuICAgICAgICB7IC4uLnRoaXMub3B0aW9ucy5pbnRlcnBvbGF0aW9uLmRlZmF1bHRWYXJpYWJsZXMsIC4uLm9wdCB9LFxuICAgICAgICBvcHQubG5nIHx8IHRoaXMubGFuZ3VhZ2UgfHwgcmVzb2x2ZWQudXNlZExuZyxcbiAgICAgICAgcmVzb2x2ZWQudXNlZE5TLFxuICAgICAgICByZXNvbHZlZC51c2VkS2V5LFxuICAgICAgICB7IHJlc29sdmVkIH0sXG4gICAgICApO1xuICAgIH0gZWxzZSBpZiAoIW9wdC5za2lwSW50ZXJwb2xhdGlvbikge1xuICAgICAgLy8gaTE4bmV4dC5wYXJzaW5nXG4gICAgICBpZiAob3B0LmludGVycG9sYXRpb24pXG4gICAgICAgIHRoaXMuaW50ZXJwb2xhdG9yLmluaXQoe1xuICAgICAgICAgIC4uLm9wdCxcbiAgICAgICAgICAuLi57IGludGVycG9sYXRpb246IHsgLi4udGhpcy5vcHRpb25zLmludGVycG9sYXRpb24sIC4uLm9wdC5pbnRlcnBvbGF0aW9uIH0gfSxcbiAgICAgICAgfSk7XG4gICAgICBjb25zdCBza2lwT25WYXJpYWJsZXMgPVxuICAgICAgICBpc1N0cmluZyhyZXMpICYmXG4gICAgICAgIChvcHQ/LmludGVycG9sYXRpb24/LnNraXBPblZhcmlhYmxlcyAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgPyBvcHQuaW50ZXJwb2xhdGlvbi5za2lwT25WYXJpYWJsZXNcbiAgICAgICAgICA6IHRoaXMub3B0aW9ucy5pbnRlcnBvbGF0aW9uLnNraXBPblZhcmlhYmxlcyk7XG4gICAgICBsZXQgbmVzdEJlZjtcbiAgICAgIGlmIChza2lwT25WYXJpYWJsZXMpIHtcbiAgICAgICAgY29uc3QgbmIgPSByZXMuaW5jbHVkZXModGhpcy5pbnRlcnBvbGF0b3IubmVzdGluZ1ByZWZpeFRleHQpXG4gICAgICAgICAgPyByZXMubWF0Y2godGhpcy5pbnRlcnBvbGF0b3IubmVzdGluZ1JlZ2V4cClcbiAgICAgICAgICA6IG51bGw7XG4gICAgICAgIC8vIGhhcyBuZXN0aW5nIGFmdGJlZm9yZWVyIGludGVycG9sYXRpb25cbiAgICAgICAgbmVzdEJlZiA9IG5iICYmIG5iLmxlbmd0aDtcbiAgICAgIH1cblxuICAgICAgLy8gaW50ZXJwb2xhdGVcbiAgICAgIGxldCBkYXRhID0gb3B0LnJlcGxhY2UgJiYgIWlzU3RyaW5nKG9wdC5yZXBsYWNlKSA/IG9wdC5yZXBsYWNlIDogb3B0O1xuICAgICAgaWYgKHRoaXMub3B0aW9ucy5pbnRlcnBvbGF0aW9uLmRlZmF1bHRWYXJpYWJsZXMpXG4gICAgICAgIGRhdGEgPSB7IC4uLnRoaXMub3B0aW9ucy5pbnRlcnBvbGF0aW9uLmRlZmF1bHRWYXJpYWJsZXMsIC4uLmRhdGEgfTtcbiAgICAgIHJlcyA9IHRoaXMuaW50ZXJwb2xhdG9yLmludGVycG9sYXRlKFxuICAgICAgICByZXMsXG4gICAgICAgIGRhdGEsXG4gICAgICAgIG9wdC5sbmcgfHwgdGhpcy5sYW5ndWFnZSB8fCByZXNvbHZlZC51c2VkTG5nLFxuICAgICAgICBvcHQsXG4gICAgICApO1xuXG4gICAgICAvLyBuZXN0aW5nXG4gICAgICBpZiAoc2tpcE9uVmFyaWFibGVzKSB7XG4gICAgICAgIGNvbnN0IG5hID0gcmVzLmluY2x1ZGVzKHRoaXMuaW50ZXJwb2xhdG9yLm5lc3RpbmdQcmVmaXhUZXh0KVxuICAgICAgICAgID8gcmVzLm1hdGNoKHRoaXMuaW50ZXJwb2xhdG9yLm5lc3RpbmdSZWdleHApXG4gICAgICAgICAgOiBudWxsO1xuICAgICAgICAvLyBoYXMgbmVzdGluZyBhZnRlciBpbnRlcnBvbGF0aW9uXG4gICAgICAgIGNvbnN0IG5lc3RBZnQgPSBuYSAmJiBuYS5sZW5ndGg7XG4gICAgICAgIGlmIChuZXN0QmVmIDwgbmVzdEFmdCkgb3B0Lm5lc3QgPSBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGlmICghb3B0LmxuZyAmJiByZXNvbHZlZCAmJiByZXNvbHZlZC5yZXMpIG9wdC5sbmcgPSB0aGlzLmxhbmd1YWdlIHx8IHJlc29sdmVkLnVzZWRMbmc7XG4gICAgICBpZiAob3B0Lm5lc3QgIT09IGZhbHNlKVxuICAgICAgICByZXMgPSB0aGlzLmludGVycG9sYXRvci5uZXN0KFxuICAgICAgICAgIHJlcyxcbiAgICAgICAgICAoLi4uYXJncykgPT4ge1xuICAgICAgICAgICAgaWYgKGxhc3RLZXk/LlswXSA9PT0gYXJnc1swXSAmJiAhb3B0LmNvbnRleHQpIHtcbiAgICAgICAgICAgICAgdGhpcy5sb2dnZXIud2FybihcbiAgICAgICAgICAgICAgICBgSXQgc2VlbXMgeW91IGFyZSBuZXN0aW5nIHJlY3Vyc2l2ZWx5IGtleTogJHthcmdzWzBdfSBpbiBrZXk6ICR7a2V5WzBdfWAsXG4gICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMudHJhbnNsYXRlKC4uLmFyZ3MsIGtleSk7XG4gICAgICAgICAgfSxcbiAgICAgICAgICBvcHQsXG4gICAgICAgICk7XG5cbiAgICAgIGlmIChvcHQuaW50ZXJwb2xhdGlvbikgdGhpcy5pbnRlcnBvbGF0b3IucmVzZXQoKTtcbiAgICB9XG5cbiAgICAvLyBwb3N0IHByb2Nlc3NcbiAgICBjb25zdCBwb3N0UHJvY2VzcyA9IG9wdC5wb3N0UHJvY2VzcyB8fCB0aGlzLm9wdGlvbnMucG9zdFByb2Nlc3M7XG4gICAgY29uc3QgcG9zdFByb2Nlc3Nvck5hbWVzID0gaXNTdHJpbmcocG9zdFByb2Nlc3MpID8gW3Bvc3RQcm9jZXNzXSA6IHBvc3RQcm9jZXNzO1xuXG4gICAgaWYgKHJlcyAhPSBudWxsICYmIHBvc3RQcm9jZXNzb3JOYW1lcz8ubGVuZ3RoICYmIG9wdC5hcHBseVBvc3RQcm9jZXNzb3IgIT09IGZhbHNlKSB7XG4gICAgICBjb25zdCBwcE9wdGlvbnMgPSB0aGlzLm9wdGlvbnM/LnBvc3RQcm9jZXNzUGFzc1Jlc29sdmVkXG4gICAgICAgID8geyBpMThuUmVzb2x2ZWQ6IHsgLi4ucmVzb2x2ZWQsIHVzZWRQYXJhbXM6IHRoaXMuZ2V0VXNlZFBhcmFtc0RldGFpbHMob3B0KSB9LCAuLi5vcHQgfVxuICAgICAgICA6IG9wdDtcbiAgICAgIC8vIHRoZSBwb3N0LXByb2Nlc3NvcnMgcmVnaXN0ZXJlZCB3aXRoIHVzZSgpIG9uIHRoaXMgaW5zdGFuY2UgKG9yIHRoZSBwYXJlbnQgb2YgYSBjbG9uZSlcbiAgICAgIHBvc3RQcm9jZXNzb3JOYW1lcy5mb3JFYWNoKChuYW1lKSA9PiB7XG4gICAgICAgIGNvbnN0IHByb2Nlc3NvciA9IHRoaXMucG9zdFByb2Nlc3NvcnM/LltuYW1lXTtcbiAgICAgICAgaWYgKCFwcm9jZXNzb3IpIHtcbiAgICAgICAgICB0aGlzLmxvZ2dlci5vbmNlKFxuICAgICAgICAgICAgYHBvc3RQcm9jZXNzOiR7bmFtZX1gLFxuICAgICAgICAgICAgJ3dhcm4nLFxuICAgICAgICAgICAgYHBvc3RQcm9jZXNzOiAnJHtuYW1lfScgaXMgbm90IHJlZ2lzdGVyZWQgb24gdGhpcyBpMThuZXh0IGluc3RhbmNlOyBjYWxsIHVzZSgpIHdpdGggaXQgb24gdGhpcyBpbnN0YW5jZWAsXG4gICAgICAgICAgKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgcmVzID0gcHJvY2Vzc29yLnByb2Nlc3MocmVzLCBrZXksIHBwT3B0aW9ucywgdGhpcykgPz8gcmVzO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlcztcbiAgfVxuXG4gIHJlc29sdmUoa2V5cywgb3B0ID0ge30pIHtcbiAgICBsZXQgZm91bmQ7XG4gICAgbGV0IHVzZWRLZXk7IC8vIHBsYWluIGtleVxuICAgIGxldCBleGFjdFVzZWRLZXk7IC8vIGtleSB3aXRoIGNvbnRleHQgLyBwbHVyYWxcbiAgICBsZXQgdXNlZExuZztcbiAgICBsZXQgdXNlZE5TO1xuXG4gICAgaWYgKGlzU3RyaW5nKGtleXMpKSBrZXlzID0gW2tleXNdO1xuICAgIGlmIChBcnJheS5pc0FycmF5KGtleXMpKVxuICAgICAga2V5cyA9IGtleXMubWFwKChrKSA9PlxuICAgICAgICB0eXBlb2YgayA9PT0gJ2Z1bmN0aW9uJyA/IGtleXNGcm9tU2VsZWN0b3IoaywgeyAuLi50aGlzLm9wdGlvbnMsIC4uLm9wdCB9KSA6IGssXG4gICAgICApO1xuXG4gICAgLy8gZm9yRWFjaCBwb3NzaWJsZSBrZXlcbiAgICBrZXlzLmZvckVhY2goKGspID0+IHtcbiAgICAgIGlmICh0aGlzLmlzVmFsaWRMb29rdXAoZm91bmQpKSByZXR1cm47XG4gICAgICBjb25zdCBleHRyYWN0ZWQgPSB0aGlzLmV4dHJhY3RGcm9tS2V5KGssIG9wdCk7XG4gICAgICBjb25zdCBrZXkgPSBleHRyYWN0ZWQua2V5O1xuICAgICAgdXNlZEtleSA9IGtleTtcbiAgICAgIGxldCBuYW1lc3BhY2VzID0gZXh0cmFjdGVkLm5hbWVzcGFjZXM7XG4gICAgICBpZiAodGhpcy5vcHRpb25zLmZhbGxiYWNrTlMpIG5hbWVzcGFjZXMgPSBuYW1lc3BhY2VzLmNvbmNhdCh0aGlzLm9wdGlvbnMuZmFsbGJhY2tOUyk7XG5cbiAgICAgIGNvbnN0IG5lZWRzUGx1cmFsSGFuZGxpbmcgPSBvcHQuY291bnQgIT09IHVuZGVmaW5lZCAmJiAhaXNTdHJpbmcob3B0LmNvdW50KTtcbiAgICAgIGNvbnN0IG5lZWRzWmVyb1N1ZmZpeExvb2t1cCA9IG5lZWRzUGx1cmFsSGFuZGxpbmcgJiYgIW9wdC5vcmRpbmFsICYmIG9wdC5jb3VudCA9PT0gMDtcbiAgICAgIGNvbnN0IG5lZWRzQ29udGV4dEhhbmRsaW5nID1cbiAgICAgICAgb3B0LmNvbnRleHQgIT09IHVuZGVmaW5lZCAmJlxuICAgICAgICAoaXNTdHJpbmcob3B0LmNvbnRleHQpIHx8IHR5cGVvZiBvcHQuY29udGV4dCA9PT0gJ251bWJlcicpICYmXG4gICAgICAgIG9wdC5jb250ZXh0ICE9PSAnJztcblxuICAgICAgY29uc3QgY29kZXMgPSBvcHQubG5nc1xuICAgICAgICA/IG9wdC5sbmdzXG4gICAgICAgIDogdGhpcy5sYW5ndWFnZVV0aWxzLnRvUmVzb2x2ZUhpZXJhcmNoeShvcHQubG5nIHx8IHRoaXMubGFuZ3VhZ2UsIG9wdC5mYWxsYmFja0xuZyk7XG5cbiAgICAgIG5hbWVzcGFjZXMuZm9yRWFjaCgobnMpID0+IHtcbiAgICAgICAgaWYgKHRoaXMuaXNWYWxpZExvb2t1cChmb3VuZCkpIHJldHVybjtcbiAgICAgICAgdXNlZE5TID0gbnM7XG5cbiAgICAgICAgaWYgKFxuICAgICAgICAgICF0aGlzLmNoZWNrZWRMb2FkZWRGb3JbYCR7Y29kZXNbMF19LSR7bnN9YF0gJiZcbiAgICAgICAgICB0aGlzLnV0aWxzPy5oYXNMb2FkZWROYW1lc3BhY2UgJiZcbiAgICAgICAgICAhdGhpcy51dGlscz8uaGFzTG9hZGVkTmFtZXNwYWNlKHVzZWROUylcbiAgICAgICAgKSB7XG4gICAgICAgICAgdGhpcy5jaGVja2VkTG9hZGVkRm9yW2Ake2NvZGVzWzBdfS0ke25zfWBdID0gdHJ1ZTtcbiAgICAgICAgICB0aGlzLmxvZ2dlci53YXJuKFxuICAgICAgICAgICAgYGtleSBcIiR7dXNlZEtleX1cIiBmb3IgbGFuZ3VhZ2VzIFwiJHtjb2Rlcy5qb2luKFxuICAgICAgICAgICAgICAnLCAnLFxuICAgICAgICAgICAgKX1cIiB3b24ndCBnZXQgcmVzb2x2ZWQgYXMgbmFtZXNwYWNlIFwiJHt1c2VkTlN9XCIgd2FzIG5vdCB5ZXQgbG9hZGVkYCxcbiAgICAgICAgICAgICdUaGlzIG1lYW5zIHNvbWV0aGluZyBJUyBXUk9ORyBpbiB5b3VyIHNldHVwLiBZb3UgYWNjZXNzIHRoZSB0IGZ1bmN0aW9uIGJlZm9yZSBpMThuZXh0LmluaXQgLyBpMThuZXh0LmxvYWROYW1lc3BhY2UgLyBpMThuZXh0LmNoYW5nZUxhbmd1YWdlIHdhcyBkb25lLiBXYWl0IGZvciB0aGUgY2FsbGJhY2sgb3IgUHJvbWlzZSB0byByZXNvbHZlIGJlZm9yZSBhY2Nlc3NpbmcgaXQhISEnLFxuICAgICAgICAgICk7XG4gICAgICAgIH1cblxuICAgICAgICBjb2Rlcy5mb3JFYWNoKChjb2RlKSA9PiB7XG4gICAgICAgICAgaWYgKHRoaXMuaXNWYWxpZExvb2t1cChmb3VuZCkpIHJldHVybjtcbiAgICAgICAgICB1c2VkTG5nID0gY29kZTtcblxuICAgICAgICAgIGNvbnN0IGZpbmFsS2V5cyA9IFtrZXldO1xuXG4gICAgICAgICAgaWYgKHRoaXMuaTE4bkZvcm1hdD8uYWRkTG9va3VwS2V5cykge1xuICAgICAgICAgICAgdGhpcy5pMThuRm9ybWF0LmFkZExvb2t1cEtleXMoZmluYWxLZXlzLCBrZXksIGNvZGUsIG5zLCBvcHQpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsZXQgcGx1cmFsU3VmZml4O1xuICAgICAgICAgICAgaWYgKG5lZWRzUGx1cmFsSGFuZGxpbmcpXG4gICAgICAgICAgICAgIHBsdXJhbFN1ZmZpeCA9IHRoaXMucGx1cmFsUmVzb2x2ZXIuZ2V0U3VmZml4KGNvZGUsIG9wdC5jb3VudCwgb3B0KTtcbiAgICAgICAgICAgIGNvbnN0IHplcm9TdWZmaXggPSBgJHt0aGlzLm9wdGlvbnMucGx1cmFsU2VwYXJhdG9yfXplcm9gO1xuICAgICAgICAgICAgY29uc3Qgb3JkaW5hbFByZWZpeCA9IGAke3RoaXMub3B0aW9ucy5wbHVyYWxTZXBhcmF0b3J9b3JkaW5hbCR7dGhpcy5vcHRpb25zLnBsdXJhbFNlcGFyYXRvcn1gO1xuICAgICAgICAgICAgLy8gZ2V0IGtleSBmb3IgcGx1cmFsIGlmIG5lZWRlZFxuICAgICAgICAgICAgaWYgKG5lZWRzUGx1cmFsSGFuZGxpbmcpIHtcbiAgICAgICAgICAgICAgaWYgKG9wdC5vcmRpbmFsICYmIHBsdXJhbFN1ZmZpeC5zdGFydHNXaXRoKG9yZGluYWxQcmVmaXgpKSB7XG4gICAgICAgICAgICAgICAgZmluYWxLZXlzLnB1c2goXG4gICAgICAgICAgICAgICAgICBrZXkgKyBwbHVyYWxTdWZmaXgucmVwbGFjZShvcmRpbmFsUHJlZml4LCB0aGlzLm9wdGlvbnMucGx1cmFsU2VwYXJhdG9yKSxcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGZpbmFsS2V5cy5wdXNoKGtleSArIHBsdXJhbFN1ZmZpeCk7XG4gICAgICAgICAgICAgIGlmIChuZWVkc1plcm9TdWZmaXhMb29rdXApIHtcbiAgICAgICAgICAgICAgICBmaW5hbEtleXMucHVzaChrZXkgKyB6ZXJvU3VmZml4KTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBnZXQga2V5IGZvciBjb250ZXh0IGlmIG5lZWRlZFxuICAgICAgICAgICAgaWYgKG5lZWRzQ29udGV4dEhhbmRsaW5nKSB7XG4gICAgICAgICAgICAgIGNvbnN0IGNvbnRleHRLZXkgPSBgJHtrZXl9JHt0aGlzLm9wdGlvbnMuY29udGV4dFNlcGFyYXRvciB8fCAnXyd9JHtvcHQuY29udGV4dH1gO1xuICAgICAgICAgICAgICBmaW5hbEtleXMucHVzaChjb250ZXh0S2V5KTtcblxuICAgICAgICAgICAgICAvLyBnZXQga2V5IGZvciBjb250ZXh0ICsgcGx1cmFsIGlmIG5lZWRlZFxuICAgICAgICAgICAgICBpZiAobmVlZHNQbHVyYWxIYW5kbGluZykge1xuICAgICAgICAgICAgICAgIGlmIChvcHQub3JkaW5hbCAmJiBwbHVyYWxTdWZmaXguc3RhcnRzV2l0aChvcmRpbmFsUHJlZml4KSkge1xuICAgICAgICAgICAgICAgICAgZmluYWxLZXlzLnB1c2goXG4gICAgICAgICAgICAgICAgICAgIGNvbnRleHRLZXkgKyBwbHVyYWxTdWZmaXgucmVwbGFjZShvcmRpbmFsUHJlZml4LCB0aGlzLm9wdGlvbnMucGx1cmFsU2VwYXJhdG9yKSxcbiAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGZpbmFsS2V5cy5wdXNoKGNvbnRleHRLZXkgKyBwbHVyYWxTdWZmaXgpO1xuICAgICAgICAgICAgICAgIGlmIChuZWVkc1plcm9TdWZmaXhMb29rdXApIHtcbiAgICAgICAgICAgICAgICAgIGZpbmFsS2V5cy5wdXNoKGNvbnRleHRLZXkgKyB6ZXJvU3VmZml4KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gbGFzdCBpbiB0aGlzIGxhbmd1YWdlOiB0aGUgXCJvdGhlclwiIGZvcm0sIGFzIGluIENMRFIncyBsYXRlcmFsIGluaGVyaXRhbmNlIChhIG1pc3NpbmcgcGx1cmFsXG4gICAgICAgICAgICAvLyBjYXRlZ29yeSBmYWxscyBiYWNrIHRvIFwib3RoZXJcIiBiZWZvcmUgdGhlIHBhcmVudCBsb2NhbGUpLiBBZnRlciB0aGUgcGxhaW4ga2V5LCBzbyBga2V5YCArXG4gICAgICAgICAgICAvLyBga2V5X290aGVyYCBzdGlsbCByZXNvbHZlcyBga2V5YDsgYmVmb3JlIHRoZSBuZXh0IGZhbGxiYWNrIGxhbmd1YWdlLlxuICAgICAgICAgICAgaWYgKG5lZWRzUGx1cmFsSGFuZGxpbmcpIHtcbiAgICAgICAgICAgICAgY29uc3Qgb3RoZXJTdWZmaXggPSBgJHtvcHQub3JkaW5hbCA/IG9yZGluYWxQcmVmaXggOiB0aGlzLm9wdGlvbnMucGx1cmFsU2VwYXJhdG9yfW90aGVyYDtcbiAgICAgICAgICAgICAgaWYgKHBsdXJhbFN1ZmZpeCAhPT0gb3RoZXJTdWZmaXgpIHtcbiAgICAgICAgICAgICAgICBpZiAobmVlZHNDb250ZXh0SGFuZGxpbmcpIHtcbiAgICAgICAgICAgICAgICAgIGZpbmFsS2V5cy51bnNoaWZ0KFxuICAgICAgICAgICAgICAgICAgICBgJHtrZXl9JHt0aGlzLm9wdGlvbnMuY29udGV4dFNlcGFyYXRvciB8fCAnXyd9JHtvcHQuY29udGV4dH0ke290aGVyU3VmZml4fWAsXG4gICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBmaW5hbEtleXMudW5zaGlmdChrZXkgKyBvdGhlclN1ZmZpeCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBpdGVyYXRlIG92ZXIgZmluYWxLZXlzIHN0YXJ0aW5nIHdpdGggbW9zdCBzcGVjaWZpYyBwbHVyYWxrZXkgKC0+IGNvbnRleHRrZXkgb25seSkgLT4gc2luZ3VsYXJrZXkgb25seVxuICAgICAgICAgIGxldCBwb3NzaWJsZUtleTtcbiAgICAgICAgICB3aGlsZSAoKHBvc3NpYmxlS2V5ID0gZmluYWxLZXlzLnBvcCgpKSkge1xuICAgICAgICAgICAgaWYgKCF0aGlzLmlzVmFsaWRMb29rdXAoZm91bmQpKSB7XG4gICAgICAgICAgICAgIGV4YWN0VXNlZEtleSA9IHBvc3NpYmxlS2V5O1xuICAgICAgICAgICAgICBmb3VuZCA9IHRoaXMuZ2V0UmVzb3VyY2UoY29kZSwgbnMsIHBvc3NpYmxlS2V5LCBvcHQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIHJldHVybiB7IHJlczogZm91bmQsIHVzZWRLZXksIGV4YWN0VXNlZEtleSwgdXNlZExuZywgdXNlZE5TIH07XG4gIH1cblxuICBpc1ZhbGlkTG9va3VwKHJlcykge1xuICAgIHJldHVybiAoXG4gICAgICByZXMgIT09IHVuZGVmaW5lZCAmJlxuICAgICAgISghdGhpcy5vcHRpb25zLnJldHVybk51bGwgJiYgcmVzID09PSBudWxsKSAmJlxuICAgICAgISghdGhpcy5vcHRpb25zLnJldHVybkVtcHR5U3RyaW5nICYmIHJlcyA9PT0gJycpXG4gICAgKTtcbiAgfVxuXG4gIGdldFJlc291cmNlKGNvZGUsIG5zLCBrZXksIG9wdGlvbnMgPSB7fSkge1xuICAgIGlmICh0aGlzLmkxOG5Gb3JtYXQ/LmdldFJlc291cmNlKSByZXR1cm4gdGhpcy5pMThuRm9ybWF0LmdldFJlc291cmNlKGNvZGUsIG5zLCBrZXksIG9wdGlvbnMpO1xuICAgIHJldHVybiB0aGlzLnJlc291cmNlU3RvcmUuZ2V0UmVzb3VyY2UoY29kZSwgbnMsIGtleSwgb3B0aW9ucyk7XG4gIH1cblxuICBnZXRVc2VkUGFyYW1zRGV0YWlscyhvcHRpb25zID0ge30pIHtcbiAgICAvLyB3ZSBuZWVkIHRvIHJlbWVtYmVyIHRvIGV4dGVuZCB0aGlzIGFycmF5IHdoZW5ldmVyIG5ldyBvcHRpb24gcHJvcGVydGllcyBhcmUgYWRkZWRcbiAgICBjb25zdCBvcHRpb25zS2V5cyA9IFtcbiAgICAgICdkZWZhdWx0VmFsdWUnLFxuICAgICAgJ29yZGluYWwnLFxuICAgICAgJ2NvbnRleHQnLFxuICAgICAgJ3JlcGxhY2UnLFxuICAgICAgJ2xuZycsXG4gICAgICAnbG5ncycsXG4gICAgICAnZmFsbGJhY2tMbmcnLFxuICAgICAgJ25zJyxcbiAgICAgICdrZXlTZXBhcmF0b3InLFxuICAgICAgJ25zU2VwYXJhdG9yJyxcbiAgICAgICdyZXR1cm5PYmplY3RzJyxcbiAgICAgICdyZXR1cm5EZXRhaWxzJyxcbiAgICAgICdqb2luQXJyYXlzJyxcbiAgICAgICdwb3N0UHJvY2VzcycsXG4gICAgICAnaW50ZXJwb2xhdGlvbicsXG4gICAgXTtcblxuICAgIGNvbnN0IHVzZU9wdGlvbnNSZXBsYWNlRm9yRGF0YSA9IG9wdGlvbnMucmVwbGFjZSAmJiAhaXNTdHJpbmcob3B0aW9ucy5yZXBsYWNlKTtcbiAgICBsZXQgZGF0YSA9IHVzZU9wdGlvbnNSZXBsYWNlRm9yRGF0YSA/IG9wdGlvbnMucmVwbGFjZSA6IG9wdGlvbnM7XG4gICAgaWYgKHVzZU9wdGlvbnNSZXBsYWNlRm9yRGF0YSAmJiB0eXBlb2Ygb3B0aW9ucy5jb3VudCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIGRhdGEgPSB7IC4uLmRhdGEsIGNvdW50OiBvcHRpb25zLmNvdW50IH07XG4gICAgfVxuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5pbnRlcnBvbGF0aW9uLmRlZmF1bHRWYXJpYWJsZXMpIHtcbiAgICAgIGRhdGEgPSB7IC4uLnRoaXMub3B0aW9ucy5pbnRlcnBvbGF0aW9uLmRlZmF1bHRWYXJpYWJsZXMsIC4uLmRhdGEgfTtcbiAgICB9XG5cbiAgICAvLyBhdm9pZCByZXBvcnRpbmcgb3B0aW9ucyAoZXhlY3B0IGNvdW50KSBhcyB1c2VkUGFyYW1zXG4gICAgaWYgKCF1c2VPcHRpb25zUmVwbGFjZUZvckRhdGEpIHtcbiAgICAgIGRhdGEgPSB7IC4uLmRhdGEgfTtcbiAgICAgIGZvciAoY29uc3Qga2V5IG9mIG9wdGlvbnNLZXlzKSB7XG4gICAgICAgIGRlbGV0ZSBkYXRhW2tleV07XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGRhdGE7XG4gIH1cblxuICBzdGF0aWMgaGFzRGVmYXVsdFZhbHVlKG9wdGlvbnMpIHtcbiAgICBjb25zdCBwcmVmaXggPSAnZGVmYXVsdFZhbHVlJztcblxuICAgIGZvciAoY29uc3Qgb3B0aW9uIGluIG9wdGlvbnMpIHtcbiAgICAgIGlmIChcbiAgICAgICAgT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9wdGlvbnMsIG9wdGlvbikgJiZcbiAgICAgICAgb3B0aW9uLnN0YXJ0c1dpdGgocHJlZml4KSAmJlxuICAgICAgICB1bmRlZmluZWQgIT09IG9wdGlvbnNbb3B0aW9uXVxuICAgICAgKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBUcmFuc2xhdG9yO1xuIiwiaW1wb3J0IGJhc2VMb2dnZXIgZnJvbSAnLi9sb2dnZXIuanMnO1xuaW1wb3J0IHsgZ2V0Q2xlYW5lZENvZGUsIGlzU3RyaW5nIH0gZnJvbSAnLi91dGlscy5qcyc7XG5cbmNsYXNzIExhbmd1YWdlVXRpbCB7XG4gIGNvbnN0cnVjdG9yKG9wdGlvbnMsIGxvZ2dlciA9IGJhc2VMb2dnZXIpIHtcbiAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuXG4gICAgdGhpcy5zdXBwb3J0ZWRMbmdzID0gdGhpcy5vcHRpb25zLnN1cHBvcnRlZExuZ3MgfHwgZmFsc2U7XG4gICAgdGhpcy5sb2dnZXIgPSBsb2dnZXIuY3JlYXRlKCdsYW5ndWFnZVV0aWxzJyk7XG4gICAgdGhpcy5yZXNvbHZlSGllcmFyY2h5Q2FjaGUgPSB7fTtcbiAgICB0aGlzLmZvcm1hdHRlZENvZGVzID0gbmV3IE1hcCgpO1xuICB9XG5cbiAgY2xlYXJDYWNoZSgpIHtcbiAgICB0aGlzLnJlc29sdmVIaWVyYXJjaHlDYWNoZSA9IHt9O1xuICAgIHRoaXMuZm9ybWF0dGVkQ29kZXMuY2xlYXIoKTtcbiAgfVxuXG4gIGdldFNjcmlwdFBhcnRGcm9tQ29kZShjb2RlKSB7XG4gICAgY29kZSA9IGdldENsZWFuZWRDb2RlKGNvZGUpO1xuICAgIGlmICghY29kZSB8fCAhY29kZS5pbmNsdWRlcygnLScpKSByZXR1cm4gbnVsbDtcblxuICAgIGNvbnN0IHAgPSBjb2RlLnNwbGl0KCctJyk7XG4gICAgaWYgKHAubGVuZ3RoID09PSAyKSByZXR1cm4gbnVsbDtcbiAgICBwLnBvcCgpO1xuICAgIGlmIChwW3AubGVuZ3RoIC0gMV0udG9Mb3dlckNhc2UoKSA9PT0gJ3gnKSByZXR1cm4gbnVsbDtcbiAgICByZXR1cm4gdGhpcy5mb3JtYXRMYW5ndWFnZUNvZGUocC5qb2luKCctJykpO1xuICB9XG5cbiAgZ2V0TGFuZ3VhZ2VQYXJ0RnJvbUNvZGUoY29kZSkge1xuICAgIGNvZGUgPSBnZXRDbGVhbmVkQ29kZShjb2RlKTtcbiAgICBpZiAoIWNvZGUgfHwgIWNvZGUuaW5jbHVkZXMoJy0nKSkgcmV0dXJuIGNvZGU7XG5cbiAgICBjb25zdCBwID0gY29kZS5zcGxpdCgnLScpO1xuICAgIHJldHVybiB0aGlzLmZvcm1hdExhbmd1YWdlQ29kZShwWzBdKTtcbiAgfVxuXG4gIC8vIENhbm9uaWNhbCBmb3JtIG9mIGEgY29kZSB3aXRoIHN1YnRhZ3MgKCdlbi11cycgLT4gJ2VuLVVTJywgJ2l3LUlMJyAtPiAnaGUtSUwnLCBhcyBiZWZvcmUgdjI3KTsgYSBjb2RlXG4gIC8vIHdpdGhvdXQgc3VidGFncyBvbmx5IGdldHMgaXRzIGNhbm9uaWNhbCBjYXNpbmcgKCdFTicgLT4gJ2VuJywgJ1RMJyAtPiAndGwnKSwgYWxpYXNlcyBzdGF5ICgndGwnLCAnaXcnKS4gQSBjb2RlXG4gIC8vIHRoYXQgaXMgbm90IEJDUCA0NyAoZ2V0Q2Fub25pY2FsTG9jYWxlcyB0aHJvd3MpIHN0YXlzIGFzIGl0IGlzLiBjbGVhbkNvZGU6IGZhbHNlIGtlZXBzIGEgY29kZSB3aXRob3V0XG4gIC8vIHN1YnRhZ3MgYXMgaXQgaXMgKGJlZm9yZSB2MjcpLlxuICBmb3JtYXRMYW5ndWFnZUNvZGUoY29kZSkge1xuICAgIGlmICghaXNTdHJpbmcoY29kZSkpIHJldHVybiBjb2RlO1xuICAgIGxldCBmb3JtYXR0ZWQgPSB0aGlzLmZvcm1hdHRlZENvZGVzLmdldChjb2RlKTtcbiAgICBpZiAoZm9ybWF0dGVkICE9PSB1bmRlZmluZWQpIHJldHVybiBmb3JtYXR0ZWQ7XG4gICAgZm9ybWF0dGVkID0gdGhpcy5mb3JtYXRVbmNhY2hlZChjb2RlKTtcbiAgICAvLyBwb255dGFpbDogY29kZXMgY29tZSBmcm9tIG91dHNpZGUgKGRldGVjdG9ycyksIHNvIHRoZSBjYWNoZSBpcyBlbXB0aWVkIGF0IDEwMDAgY29kZXMgaW5zdGVhZCBvZiBncm93aW5nXG4gICAgaWYgKHRoaXMuZm9ybWF0dGVkQ29kZXMuc2l6ZSA+PSAxMDAwKSB0aGlzLmZvcm1hdHRlZENvZGVzLmNsZWFyKCk7XG4gICAgdGhpcy5mb3JtYXR0ZWRDb2Rlcy5zZXQoY29kZSwgZm9ybWF0dGVkKTtcbiAgICByZXR1cm4gZm9ybWF0dGVkO1xuICB9XG5cbiAgZm9ybWF0VW5jYWNoZWQoY29kZSkge1xuICAgIGNvbnN0IGhhc1N1YnRhZ3MgPSBjb2RlLmluY2x1ZGVzKCctJyk7XG4gICAgaWYgKGhhc1N1YnRhZ3MgfHwgdGhpcy5vcHRpb25zLmNsZWFuQ29kZSAhPT0gZmFsc2UpIHtcbiAgICAgIGxldCBjYW5vbmljYWw7XG4gICAgICB0cnkge1xuICAgICAgICBjYW5vbmljYWwgPSBJbnRsLmdldENhbm9uaWNhbExvY2FsZXMoY29kZSlbMF07XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIC8qIGZhbGwgdGhyb3VnaCAqL1xuICAgICAgfVxuICAgICAgaWYgKGNhbm9uaWNhbCAmJiAoaGFzU3VidGFncyB8fCBjYW5vbmljYWwudG9Mb3dlckNhc2UoKSA9PT0gY29kZS50b0xvd2VyQ2FzZSgpKSkge1xuICAgICAgICByZXR1cm4gdGhpcy5vcHRpb25zLmxvd2VyQ2FzZUxuZyA/IGNhbm9uaWNhbC50b0xvd2VyQ2FzZSgpIDogY2Fub25pY2FsO1xuICAgICAgfVxuICAgICAgLy8gYW4gYWxpYXMgSW50bCB3b3VsZCByZXBsYWNlICgnVEwnIC0+ICdmaWwnLCAnSVcnIC0+ICdoZScpOiBvbmx5IGl0cyBjYXNpbmcgY2hhbmdlcyAoJ3RsJywgJ2l3JylcbiAgICAgIGlmIChjYW5vbmljYWwpIHJldHVybiBjb2RlLnRvTG93ZXJDYXNlKCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLm9wdGlvbnMubG93ZXJDYXNlTG5nIHx8ICh0aGlzLm9wdGlvbnMuY2xlYW5Db2RlICYmICFoYXNTdWJ0YWdzKVxuICAgICAgPyBjb2RlLnRvTG93ZXJDYXNlKClcbiAgICAgIDogY29kZTtcbiAgfVxuXG4gIGlzU3VwcG9ydGVkQ29kZShjb2RlKSB7XG4gICAgaWYgKHRoaXMub3B0aW9ucy5sb2FkID09PSAnbGFuZ3VhZ2VPbmx5JyB8fCB0aGlzLm9wdGlvbnMubm9uRXhwbGljaXRTdXBwb3J0ZWRMbmdzKSB7XG4gICAgICBjb2RlID0gdGhpcy5nZXRMYW5ndWFnZVBhcnRGcm9tQ29kZShjb2RlKTtcbiAgICB9XG4gICAgcmV0dXJuICF0aGlzLnN1cHBvcnRlZExuZ3MgfHwgIXRoaXMuc3VwcG9ydGVkTG5ncy5sZW5ndGggfHwgdGhpcy5zdXBwb3J0ZWRMbmdzLmluY2x1ZGVzKGNvZGUpO1xuICB9XG5cbiAgZ2V0QmVzdE1hdGNoRnJvbUNvZGVzKGNvZGVzKSB7XG4gICAgaWYgKCFjb2RlcykgcmV0dXJuIG51bGw7XG5cbiAgICBsZXQgZm91bmQ7XG5cbiAgICAvLyBwaWNrIGZpcnN0IHN1cHBvcnRlZCBjb2RlIG9yIGlmIG5vIHJlc3RyaWN0aW9uIHBpY2sgdGhlIGZpcnN0IG9uZSAoaGlnaGVzdCBwcmlvKVxuICAgIGNvZGVzLmZvckVhY2goKGNvZGUpID0+IHtcbiAgICAgIGlmIChmb3VuZCkgcmV0dXJuO1xuICAgICAgY29uc3QgY2xlYW5lZExuZyA9IHRoaXMuZm9ybWF0TGFuZ3VhZ2VDb2RlKGNvZGUpO1xuICAgICAgaWYgKCF0aGlzLm9wdGlvbnMuc3VwcG9ydGVkTG5ncyB8fCB0aGlzLmlzU3VwcG9ydGVkQ29kZShjbGVhbmVkTG5nKSkgZm91bmQgPSBjbGVhbmVkTG5nO1xuICAgIH0pO1xuXG4gICAgLy8gaWYgd2UgZ290IG5vIG1hdGNoIGluIHN1cHBvcnRlZExuZ3MgeWV0IC0gY2hlY2sgZm9yIHNpbWlsYXIgbG9jYWxlc1xuICAgIC8vIGZpcnN0ICBkZS1DSCAtLT4gZGVcbiAgICAvLyBzZWNvbmQgZGUtQ0ggLS0+IGRlLURFXG4gICAgaWYgKCFmb3VuZCAmJiB0aGlzLm9wdGlvbnMuc3VwcG9ydGVkTG5ncykge1xuICAgICAgY29kZXMuZm9yRWFjaCgoY29kZSkgPT4ge1xuICAgICAgICBpZiAoZm91bmQpIHJldHVybjtcblxuICAgICAgICBjb25zdCBsbmdTY09ubHkgPSB0aGlzLmdldFNjcmlwdFBhcnRGcm9tQ29kZShjb2RlKTtcblxuICAgICAgICBpZiAodGhpcy5pc1N1cHBvcnRlZENvZGUobG5nU2NPbmx5KSkgcmV0dXJuIChmb3VuZCA9IGxuZ1NjT25seSk7XG5cbiAgICAgICAgY29uc3QgbG5nT25seSA9IHRoaXMuZ2V0TGFuZ3VhZ2VQYXJ0RnJvbUNvZGUoY29kZSk7XG5cbiAgICAgICAgaWYgKHRoaXMuaXNTdXBwb3J0ZWRDb2RlKGxuZ09ubHkpKSByZXR1cm4gKGZvdW5kID0gbG5nT25seSk7XG5cbiAgICAgICAgZm91bmQgPSB0aGlzLm9wdGlvbnMuc3VwcG9ydGVkTG5ncy5maW5kKChzdXBwb3J0ZWRMbmcpID0+IHtcbiAgICAgICAgICBpZiAoc3VwcG9ydGVkTG5nID09PSBsbmdPbmx5KSByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICBpZiAoIXN1cHBvcnRlZExuZy5pbmNsdWRlcygnLScpICYmICFsbmdPbmx5LmluY2x1ZGVzKCctJykpIHJldHVybiBmYWxzZTtcbiAgICAgICAgICBpZiAoXG4gICAgICAgICAgICBzdXBwb3J0ZWRMbmcuaW5jbHVkZXMoJy0nKSAmJlxuICAgICAgICAgICAgIWxuZ09ubHkuaW5jbHVkZXMoJy0nKSAmJlxuICAgICAgICAgICAgc3VwcG9ydGVkTG5nLnNsaWNlKDAsIHN1cHBvcnRlZExuZy5pbmRleE9mKCctJykpID09PSBsbmdPbmx5XG4gICAgICAgICAgKVxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH1cbiAgICAvLyBpZiBub3RoaW5nIGZvdW5kLCB1c2UgZmFsbGJhY2tMbmdcbiAgICBpZiAoIWZvdW5kKSBmb3VuZCA9IHRoaXMuZ2V0RmFsbGJhY2tDb2Rlcyh0aGlzLm9wdGlvbnMuZmFsbGJhY2tMbmcpWzBdO1xuXG4gICAgcmV0dXJuIGZvdW5kO1xuICB9XG5cbiAgZ2V0RmFsbGJhY2tDb2RlcyhmYWxsYmFja3MsIGNvZGUpIHtcbiAgICBpZiAoIWZhbGxiYWNrcykgcmV0dXJuIFtdO1xuICAgIGlmICh0eXBlb2YgZmFsbGJhY2tzID09PSAnZnVuY3Rpb24nKSBmYWxsYmFja3MgPSBmYWxsYmFja3MoY29kZSk7XG4gICAgaWYgKGlzU3RyaW5nKGZhbGxiYWNrcykpIGZhbGxiYWNrcyA9IFtmYWxsYmFja3NdO1xuICAgIGlmIChBcnJheS5pc0FycmF5KGZhbGxiYWNrcykpIHJldHVybiBmYWxsYmFja3M7XG5cbiAgICBpZiAoIWNvZGUpIHJldHVybiBmYWxsYmFja3MuZGVmYXVsdCB8fCBbXTtcblxuICAgIC8vIGFzc3VtZSB3ZSBoYXZlIGFuIG9iamVjdCBkZWZpbmluZyBmYWxsYmFja3NcbiAgICBsZXQgZm91bmQgPSBmYWxsYmFja3NbY29kZV07XG4gICAgaWYgKCFmb3VuZCkgZm91bmQgPSBmYWxsYmFja3NbdGhpcy5nZXRTY3JpcHRQYXJ0RnJvbUNvZGUoY29kZSldO1xuICAgIGlmICghZm91bmQpIGZvdW5kID0gZmFsbGJhY2tzW3RoaXMuZm9ybWF0TGFuZ3VhZ2VDb2RlKGNvZGUpXTtcbiAgICBpZiAoIWZvdW5kKSBmb3VuZCA9IGZhbGxiYWNrc1t0aGlzLmdldExhbmd1YWdlUGFydEZyb21Db2RlKGNvZGUpXTtcbiAgICBpZiAoIWZvdW5kKSBmb3VuZCA9IGZhbGxiYWNrcy5kZWZhdWx0O1xuXG4gICAgcmV0dXJuIGZvdW5kIHx8IFtdO1xuICB9XG5cbiAgdG9SZXNvbHZlSGllcmFyY2h5KGNvZGUsIGZhbGxiYWNrQ29kZSkge1xuICAgIGNvbnN0IGZhbGxiYWNrTG5nID0gdGhpcy5vcHRpb25zLmZhbGxiYWNrTG5nO1xuICAgIC8vIGpvaW4gc28gaW4tcGxhY2UgYXJyYXkgbXV0YXRpb24gKGZhbGxiYWNrTG5nLnB1c2goLi4uKSkgYWxzbyBpbnZhbGlkYXRlcywgbm90IG9ubHkgcmVhc3NpZ25tZW50XG4gICAgY29uc3QgZmFsbGJhY2tMbmdLZXkgPSBBcnJheS5pc0FycmF5KGZhbGxiYWNrTG5nKSA/IGZhbGxiYWNrTG5nLmpvaW4oJ3wnKSA6IGZhbGxiYWNrTG5nO1xuICAgIGlmIChmYWxsYmFja0xuZ0tleSAhPT0gdGhpcy5fY2FjaGVkRmFsbGJhY2tMbmcpIHtcbiAgICAgIHRoaXMucmVzb2x2ZUhpZXJhcmNoeUNhY2hlID0ge307XG4gICAgICB0aGlzLl9jYWNoZWRGYWxsYmFja0xuZyA9IGZhbGxiYWNrTG5nS2V5O1xuICAgIH1cblxuICAgIGNvbnN0IGhhc0NhY2hlYWJsZUZhbGxiYWNrID1cbiAgICAgIGZhbGxiYWNrQ29kZSA9PT0gdW5kZWZpbmVkIHx8IGZhbGxiYWNrQ29kZSA9PT0gZmFsc2UgfHwgaXNTdHJpbmcoZmFsbGJhY2tDb2RlKTtcbiAgICBjb25zdCB1c2VzVW5jYWNoZWFibGVPcHRpb25zRmFsbGJhY2sgPVxuICAgICAgZmFsbGJhY2tDb2RlID09PSB1bmRlZmluZWQgJiYgdHlwZW9mIHRoaXMub3B0aW9ucy5mYWxsYmFja0xuZyA9PT0gJ2Z1bmN0aW9uJztcbiAgICBjb25zdCBjYWNoZWFibGUgPSBpc1N0cmluZyhjb2RlKSAmJiBoYXNDYWNoZWFibGVGYWxsYmFjayAmJiAhdXNlc1VuY2FjaGVhYmxlT3B0aW9uc0ZhbGxiYWNrO1xuICAgIGxldCBjYWNoZUtleSA9IG51bGw7XG4gICAgaWYgKGNhY2hlYWJsZSkge1xuICAgICAgbGV0IGZhbGxiYWNrQ2FjaGVLZXk7XG4gICAgICBpZiAoZmFsbGJhY2tDb2RlID09PSB1bmRlZmluZWQpIGZhbGxiYWNrQ2FjaGVLZXkgPSAndW5kZWZpbmVkJztcbiAgICAgIGVsc2UgaWYgKGZhbGxiYWNrQ29kZSA9PT0gZmFsc2UpIGZhbGxiYWNrQ2FjaGVLZXkgPSAnYm9vbGVhbjpmYWxzZSc7XG4gICAgICBlbHNlIGZhbGxiYWNrQ2FjaGVLZXkgPSBgc3RyaW5nOiR7ZmFsbGJhY2tDb2RlfWA7XG4gICAgICBjYWNoZUtleSA9IGAke2NvZGUubGVuZ3RofToke2NvZGV9fCR7ZmFsbGJhY2tDYWNoZUtleX1gO1xuICAgIH1cbiAgICBpZiAoY2FjaGVLZXkgIT09IG51bGwpIHtcbiAgICAgIGNvbnN0IGNhY2hlZCA9IHRoaXMucmVzb2x2ZUhpZXJhcmNoeUNhY2hlW2NhY2hlS2V5XTtcbiAgICAgIGlmIChjYWNoZWQgIT09IHVuZGVmaW5lZCkgcmV0dXJuIGNhY2hlZC5zbGljZSgpO1xuICAgIH1cblxuICAgIGNvbnN0IGZhbGxiYWNrQ29kZXMgPSB0aGlzLmdldEZhbGxiYWNrQ29kZXMoXG4gICAgICAoZmFsbGJhY2tDb2RlID09PSBmYWxzZSA/IFtdIDogZmFsbGJhY2tDb2RlKSB8fCB0aGlzLm9wdGlvbnMuZmFsbGJhY2tMbmcgfHwgW10sXG4gICAgICBjb2RlLFxuICAgICk7XG5cbiAgICBjb25zdCBjb2RlcyA9IFtdO1xuICAgIGNvbnN0IGFkZENvZGUgPSAoYykgPT4ge1xuICAgICAgaWYgKCFjKSByZXR1cm47XG4gICAgICBpZiAodGhpcy5pc1N1cHBvcnRlZENvZGUoYykpIHtcbiAgICAgICAgY29kZXMucHVzaChjKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMubG9nZ2VyLndhcm4oYHJlamVjdGluZyBsYW5ndWFnZSBjb2RlIG5vdCBmb3VuZCBpbiBzdXBwb3J0ZWRMbmdzOiAke2N9YCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIGlmIChpc1N0cmluZyhjb2RlKSAmJiAoY29kZS5pbmNsdWRlcygnLScpIHx8IGNvZGUuaW5jbHVkZXMoJ18nKSkpIHtcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMubG9hZCAhPT0gJ2xhbmd1YWdlT25seScpIGFkZENvZGUodGhpcy5mb3JtYXRMYW5ndWFnZUNvZGUoY29kZSkpO1xuICAgICAgaWYgKHRoaXMub3B0aW9ucy5sb2FkICE9PSAnbGFuZ3VhZ2VPbmx5JyAmJiB0aGlzLm9wdGlvbnMubG9hZCAhPT0gJ2N1cnJlbnRPbmx5JylcbiAgICAgICAgYWRkQ29kZSh0aGlzLmdldFNjcmlwdFBhcnRGcm9tQ29kZShjb2RlKSk7XG4gICAgICBpZiAodGhpcy5vcHRpb25zLmxvYWQgIT09ICdjdXJyZW50T25seScpIGFkZENvZGUodGhpcy5nZXRMYW5ndWFnZVBhcnRGcm9tQ29kZShjb2RlKSk7XG4gICAgfSBlbHNlIGlmIChpc1N0cmluZyhjb2RlKSkge1xuICAgICAgYWRkQ29kZSh0aGlzLmZvcm1hdExhbmd1YWdlQ29kZShjb2RlKSk7XG4gICAgfVxuXG4gICAgZmFsbGJhY2tDb2Rlcy5mb3JFYWNoKChmYykgPT4ge1xuICAgICAgLy8gY29tcGFyZSB0aGUgZm9ybWF0dGVkIGNvZGUsIHNvIGEgZmFsbGJhY2sgbGlrZSAnZGUtY2gnIGRvZXNuJ3QgcmVwZWF0ICdkZS1DSCdcbiAgICAgIGNvbnN0IGZvcm1hdHRlZEZjID0gdGhpcy5mb3JtYXRMYW5ndWFnZUNvZGUoZmMpO1xuICAgICAgaWYgKCFjb2Rlcy5pbmNsdWRlcyhmb3JtYXR0ZWRGYykpIGFkZENvZGUoZm9ybWF0dGVkRmMpO1xuICAgIH0pO1xuXG4gICAgaWYgKGNhY2hlS2V5ICE9PSBudWxsKSB7XG4gICAgICB0aGlzLnJlc29sdmVIaWVyYXJjaHlDYWNoZVtjYWNoZUtleV0gPSBjb2RlcztcbiAgICAgIHJldHVybiBjb2Rlcy5zbGljZSgpO1xuICAgIH1cblxuICAgIHJldHVybiBjb2RlcztcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBMYW5ndWFnZVV0aWw7XG4iLCJpbXBvcnQgYmFzZUxvZ2dlciBmcm9tICcuL2xvZ2dlci5qcyc7XG5pbXBvcnQgeyBnZXRDbGVhbmVkQ29kZSB9IGZyb20gJy4vdXRpbHMuanMnXG5cbmNvbnN0IHN1ZmZpeGVzT3JkZXIgPSB7XG4gIHplcm86IDAsXG4gIG9uZTogMSxcbiAgdHdvOiAyLFxuICBmZXc6IDMsXG4gIG1hbnk6IDQsXG4gIG90aGVyOiA1LFxufTtcblxuY29uc3QgZHVtbXlSdWxlID0ge1xuICBzZWxlY3Q6IChjb3VudCkgPT4gY291bnQgPT09IDEgPyAnb25lJyA6ICdvdGhlcicsXG4gIHJlc29sdmVkT3B0aW9uczogKCkgPT4gKHtcbiAgICBwbHVyYWxDYXRlZ29yaWVzOiBbJ29uZScsICdvdGhlciddXG4gIH0pXG59O1xuXG5jbGFzcyBQbHVyYWxSZXNvbHZlciB7XG4gIGNvbnN0cnVjdG9yKGxhbmd1YWdlVXRpbHMsIG9wdGlvbnMgPSB7fSwgbG9nZ2VyID0gYmFzZUxvZ2dlcikge1xuICAgIHRoaXMubGFuZ3VhZ2VVdGlscyA9IGxhbmd1YWdlVXRpbHM7XG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcblxuICAgIHRoaXMubG9nZ2VyID0gbG9nZ2VyLmNyZWF0ZSgncGx1cmFsUmVzb2x2ZXInKTtcblxuICAgIC8vIENhY2hlIGNhbGxzIHRvIEludGwuUGx1cmFsUnVsZXMsIHNpbmNlIHJlcGVhdGVkIGNhbGxzIGNhbiBiZSBzbG93IGluIHJ1bnRpbWVzIGxpa2UgUmVhY3QgTmF0aXZlXG4gICAgLy8gYW5kIHRoZSBtZW1vcnkgdXNhZ2UgZGlmZmVyZW5jZSBpcyBuZWdsaWdpYmxlXG4gICAgdGhpcy5wbHVyYWxSdWxlc0NhY2hlID0ge307XG4gIH1cblxuICBjbGVhckNhY2hlKCkge1xuICAgIHRoaXMucGx1cmFsUnVsZXNDYWNoZSA9IHt9O1xuICB9XG5cbiAgZ2V0UnVsZShjb2RlLCBvcHRpb25zID0ge30pIHtcbiAgICBjb25zdCBjbGVhbmVkQ29kZSA9IGdldENsZWFuZWRDb2RlKGNvZGUgPT09ICdkZXYnID8gJ2VuJyA6IGNvZGUpO1xuICAgIGNvbnN0IHR5cGUgPSBvcHRpb25zLm9yZGluYWwgPyAnb3JkaW5hbCcgOiAnY2FyZGluYWwnO1xuICAgIGNvbnN0IGNhY2hlS2V5ID0gSlNPTi5zdHJpbmdpZnkoeyBjbGVhbmVkQ29kZSwgdHlwZSB9KTtcblxuICAgIGlmIChjYWNoZUtleSBpbiB0aGlzLnBsdXJhbFJ1bGVzQ2FjaGUpIHtcbiAgICAgIHJldHVybiB0aGlzLnBsdXJhbFJ1bGVzQ2FjaGVbY2FjaGVLZXldO1xuICAgIH1cblxuICAgIGxldCBydWxlO1xuXG4gICAgdHJ5IHtcbiAgICAgIHJ1bGUgPSBuZXcgSW50bC5QbHVyYWxSdWxlcyhjbGVhbmVkQ29kZSwgeyB0eXBlIH0pO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgaWYgKHR5cGVvZiBJbnRsID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICB0aGlzLmxvZ2dlci5lcnJvcignTm8gSW50bCBzdXBwb3J0LCBwbGVhc2UgdXNlIGFuIEludGwgcG9seWZpbGwhJyk7XG4gICAgICAgIHJldHVybiBkdW1teVJ1bGU7XG4gICAgICB9XG4gICAgICBpZiAoIWNvZGUubWF0Y2goLy18Xy8pKSByZXR1cm4gZHVtbXlSdWxlO1xuICAgICAgY29uc3QgbG5nUGFydCA9IHRoaXMubGFuZ3VhZ2VVdGlscy5nZXRMYW5ndWFnZVBhcnRGcm9tQ29kZShjb2RlKTtcbiAgICAgIHJ1bGUgPSB0aGlzLmdldFJ1bGUobG5nUGFydCwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgdGhpcy5wbHVyYWxSdWxlc0NhY2hlW2NhY2hlS2V5XSA9IHJ1bGU7XG4gICAgcmV0dXJuIHJ1bGU7XG4gIH1cblxuICBuZWVkc1BsdXJhbChjb2RlLCBvcHRpb25zID0ge30pIHtcbiAgICBsZXQgcnVsZSA9IHRoaXMuZ2V0UnVsZShjb2RlLCBvcHRpb25zKTtcbiAgICBpZiAoIXJ1bGUpIHJ1bGUgPSB0aGlzLmdldFJ1bGUoJ2RldicsIG9wdGlvbnMpO1xuICAgIHJldHVybiBydWxlPy5yZXNvbHZlZE9wdGlvbnMoKS5wbHVyYWxDYXRlZ29yaWVzLmxlbmd0aCA+IDE7XG4gIH1cblxuICBnZXRQbHVyYWxGb3Jtc09mS2V5KGNvZGUsIGtleSwgb3B0aW9ucyA9IHt9KSB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0U3VmZml4ZXMoY29kZSwgb3B0aW9ucykubWFwKChzdWZmaXgpID0+IGAke2tleX0ke3N1ZmZpeH1gKTtcbiAgfVxuXG4gIGdldFN1ZmZpeGVzKGNvZGUsIG9wdGlvbnMgPSB7fSkge1xuICAgIGxldCBydWxlID0gdGhpcy5nZXRSdWxlKGNvZGUsIG9wdGlvbnMpO1xuICAgIGlmICghcnVsZSkgcnVsZSA9IHRoaXMuZ2V0UnVsZSgnZGV2Jywgb3B0aW9ucyk7XG4gICAgaWYgKCFydWxlKSByZXR1cm4gW107XG5cbiAgICByZXR1cm4gcnVsZS5yZXNvbHZlZE9wdGlvbnMoKS5wbHVyYWxDYXRlZ29yaWVzXG4gICAgICAuc29ydCgocGx1cmFsQ2F0ZWdvcnkxLCBwbHVyYWxDYXRlZ29yeTIpID0+IHN1ZmZpeGVzT3JkZXJbcGx1cmFsQ2F0ZWdvcnkxXSAtIHN1ZmZpeGVzT3JkZXJbcGx1cmFsQ2F0ZWdvcnkyXSlcbiAgICAgIC5tYXAocGx1cmFsQ2F0ZWdvcnkgPT4gYCR7dGhpcy5vcHRpb25zLnByZXBlbmR9JHtvcHRpb25zLm9yZGluYWwgPyBgb3JkaW5hbCR7dGhpcy5vcHRpb25zLnByZXBlbmR9YCA6ICcnfSR7cGx1cmFsQ2F0ZWdvcnl9YCk7XG4gIH1cblxuICBnZXRTdWZmaXgoY29kZSwgY291bnQsIG9wdGlvbnMgPSB7fSkge1xuICAgIGNvbnN0IHJ1bGUgPSB0aGlzLmdldFJ1bGUoY29kZSwgb3B0aW9ucyk7XG5cbiAgICBpZiAocnVsZSkge1xuICAgICAgcmV0dXJuIGAke3RoaXMub3B0aW9ucy5wcmVwZW5kfSR7b3B0aW9ucy5vcmRpbmFsID8gYG9yZGluYWwke3RoaXMub3B0aW9ucy5wcmVwZW5kfWAgOiAnJ30ke3J1bGUuc2VsZWN0KGNvdW50KX1gO1xuICAgIH1cblxuICAgIHRoaXMubG9nZ2VyLndhcm4oYG5vIHBsdXJhbCBydWxlIGZvdW5kIGZvcjogJHtjb2RlfWApO1xuICAgIHJldHVybiB0aGlzLmdldFN1ZmZpeCgnZGV2JywgY291bnQsIG9wdGlvbnMpO1xuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IFBsdXJhbFJlc29sdmVyO1xuIiwiaW1wb3J0IHtcbiAgZ2V0UGF0aFdpdGhEZWZhdWx0cyxcbiAgZGVlcEZpbmQsXG4gIGVzY2FwZSBhcyB1dGlsc0VzY2FwZSxcbiAgcmVnZXhFc2NhcGUsXG4gIG1ha2VTdHJpbmcsXG4gIGlzU3RyaW5nLFxufSBmcm9tICcuL3V0aWxzLmpzJztcbmltcG9ydCBiYXNlTG9nZ2VyIGZyb20gJy4vbG9nZ2VyLmpzJztcblxuY29uc3QgZGVlcEZpbmRXaXRoRGVmYXVsdHMgPSAoXG4gIGRhdGEsXG4gIGRlZmF1bHREYXRhLFxuICBrZXksXG4gIGtleVNlcGFyYXRvciA9ICcuJyxcbiAgaWdub3JlSlNPTlN0cnVjdHVyZSA9IHRydWUsXG4pID0+IHtcbiAgbGV0IHBhdGggPSBnZXRQYXRoV2l0aERlZmF1bHRzKGRhdGEsIGRlZmF1bHREYXRhLCBrZXkpO1xuICAvLyBmYWxzZSwgMCBhbmQgJycgYXJlIHZhbHVlczsgbnVsbCBzdGlsbCBmYWxscyBiYWNrIHRvIGEgZmxhdCBrZXlcbiAgaWYgKHBhdGggPT0gbnVsbCAmJiBpZ25vcmVKU09OU3RydWN0dXJlICYmIGlzU3RyaW5nKGtleSkpIHtcbiAgICBwYXRoID0gZGVlcEZpbmQoZGF0YSwga2V5LCBrZXlTZXBhcmF0b3IpO1xuICAgIGlmIChwYXRoID09PSB1bmRlZmluZWQpIHBhdGggPSBkZWVwRmluZChkZWZhdWx0RGF0YSwga2V5LCBrZXlTZXBhcmF0b3IpO1xuICB9XG4gIHJldHVybiBwYXRoO1xufTtcblxuY2xhc3MgSW50ZXJwb2xhdG9yIHtcbiAgY29uc3RydWN0b3Iob3B0aW9ucyA9IHt9LCBsb2dnZXIgPSBiYXNlTG9nZ2VyKSB7XG4gICAgdGhpcy5sb2dnZXIgPSBsb2dnZXIuY3JlYXRlKCdpbnRlcnBvbGF0b3InKTtcblxuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG4gICAgdGhpcy5mb3JtYXQgPSBvcHRpb25zPy5pbnRlcnBvbGF0aW9uPy5mb3JtYXQgfHwgKCh2YWx1ZSkgPT4gdmFsdWUpO1xuICAgIHRoaXMuaW5pdChvcHRpb25zKTtcbiAgfVxuXG4gIGluaXQob3B0aW9ucyA9IHt9KSB7XG4gICAgaWYgKCFvcHRpb25zLmludGVycG9sYXRpb24pIG9wdGlvbnMuaW50ZXJwb2xhdGlvbiA9IHsgZXNjYXBlVmFsdWU6IHRydWUgfTtcblxuICAgIGNvbnN0IHtcbiAgICAgIGVzY2FwZSxcbiAgICAgIGVzY2FwZVZhbHVlLFxuICAgICAgdXNlUmF3VmFsdWVUb0VzY2FwZSxcbiAgICAgIHByZWZpeCxcbiAgICAgIHN1ZmZpeCxcbiAgICAgIGZvcm1hdFNlcGFyYXRvcixcbiAgICAgIHVuZXNjYXBlU3VmZml4LFxuICAgICAgdW5lc2NhcGVQcmVmaXgsXG4gICAgICBuZXN0aW5nUHJlZml4LFxuICAgICAgbmVzdGluZ1N1ZmZpeCxcbiAgICAgIG5lc3RpbmdPcHRpb25zU2VwYXJhdG9yLFxuICAgICAgbWF4UmVwbGFjZXMsXG4gICAgICBhbHdheXNGb3JtYXQsXG4gICAgfSA9IG9wdGlvbnMuaW50ZXJwb2xhdGlvbjtcblxuICAgIHRoaXMuZXNjYXBlID0gZXNjYXBlICE9PSB1bmRlZmluZWQgPyBlc2NhcGUgOiB1dGlsc0VzY2FwZTtcbiAgICB0aGlzLmVzY2FwZVZhbHVlID0gZXNjYXBlVmFsdWUgIT09IHVuZGVmaW5lZCA/IGVzY2FwZVZhbHVlIDogdHJ1ZTtcbiAgICB0aGlzLnVzZVJhd1ZhbHVlVG9Fc2NhcGUgPSB1c2VSYXdWYWx1ZVRvRXNjYXBlICE9PSB1bmRlZmluZWQgPyB1c2VSYXdWYWx1ZVRvRXNjYXBlIDogZmFsc2U7XG5cbiAgICB0aGlzLnByZWZpeCA9IHByZWZpeCA/IHJlZ2V4RXNjYXBlKHByZWZpeCkgOiAne3snO1xuICAgIHRoaXMuc3VmZml4ID0gc3VmZml4ID8gcmVnZXhFc2NhcGUoc3VmZml4KSA6ICd9fSc7XG5cbiAgICB0aGlzLmZvcm1hdFNlcGFyYXRvciA9IGZvcm1hdFNlcGFyYXRvciB8fCAnLCc7XG5cbiAgICB0aGlzLnVuZXNjYXBlUHJlZml4ID0gdW5lc2NhcGVTdWZmaXggPyAnJyA6IHVuZXNjYXBlUHJlZml4ID8gcmVnZXhFc2NhcGUodW5lc2NhcGVQcmVmaXgpIDogJy0nO1xuICAgIHRoaXMudW5lc2NhcGVTdWZmaXggPSB0aGlzLnVuZXNjYXBlUHJlZml4XG4gICAgICA/ICcnXG4gICAgICA6IHVuZXNjYXBlU3VmZml4XG4gICAgICAgID8gcmVnZXhFc2NhcGUodW5lc2NhcGVTdWZmaXgpXG4gICAgICAgIDogJyc7XG5cbiAgICAvLyB0aGUgcGxhaW4gdGV4dHMgZXZlcnkgbWF0Y2ggb2YgdGhlIHJlZ2V4cHMgc3RhcnRzIHdpdGg6IGEgdGV4dCB3aXRob3V0IHRoZW0gaGFzIG5vIG1hdGNoXG4gICAgdGhpcy5wcmVmaXhUZXh0ID0gcHJlZml4IHx8ICd7eyc7XG4gICAgdGhpcy5uZXN0aW5nUHJlZml4VGV4dCA9IG5lc3RpbmdQcmVmaXggfHwgJyR0KCc7XG4gICAgdGhpcy5uZXN0aW5nUHJlZml4ID0gcmVnZXhFc2NhcGUobmVzdGluZ1ByZWZpeCB8fCAnJHQoJyk7XG4gICAgdGhpcy5uZXN0aW5nU3VmZml4ID0gcmVnZXhFc2NhcGUobmVzdGluZ1N1ZmZpeCB8fCAnKScpO1xuXG4gICAgdGhpcy5uZXN0aW5nT3B0aW9uc1NlcGFyYXRvciA9IG5lc3RpbmdPcHRpb25zU2VwYXJhdG9yIHx8ICcsJztcblxuICAgIHRoaXMubWF4UmVwbGFjZXMgPSBtYXhSZXBsYWNlcyB8fCAxMDAwO1xuXG4gICAgdGhpcy5hbHdheXNGb3JtYXQgPSBhbHdheXNGb3JtYXQgIT09IHVuZGVmaW5lZCA/IGFsd2F5c0Zvcm1hdCA6IGZhbHNlO1xuXG4gICAgLy8gdGhlIHJlZ2V4cFxuICAgIHRoaXMucmVzZXRSZWdFeHAoKTtcbiAgfVxuXG4gIHJlc2V0KCkge1xuICAgIGlmICh0aGlzLm9wdGlvbnMpIHRoaXMuaW5pdCh0aGlzLm9wdGlvbnMpO1xuICB9XG5cbiAgcmVzZXRSZWdFeHAoKSB7XG4gICAgY29uc3QgZ2V0T3JSZXNldFJlZ0V4cCA9IChleGlzdGluZ1JlZ0V4cCwgcGF0dGVybikgPT4ge1xuICAgICAgaWYgKGV4aXN0aW5nUmVnRXhwPy5zb3VyY2UgPT09IHBhdHRlcm4pIHtcbiAgICAgICAgZXhpc3RpbmdSZWdFeHAubGFzdEluZGV4ID0gMDtcbiAgICAgICAgcmV0dXJuIGV4aXN0aW5nUmVnRXhwO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG5ldyBSZWdFeHAocGF0dGVybiwgJ2cnKTtcbiAgICB9O1xuXG4gICAgdGhpcy5yZWdleHAgPSBnZXRPclJlc2V0UmVnRXhwKHRoaXMucmVnZXhwLCBgJHt0aGlzLnByZWZpeH0oLis/KSR7dGhpcy5zdWZmaXh9YCk7XG4gICAgdGhpcy5yZWdleHBVbmVzY2FwZSA9IGdldE9yUmVzZXRSZWdFeHAoXG4gICAgICB0aGlzLnJlZ2V4cFVuZXNjYXBlLFxuICAgICAgYCR7dGhpcy5wcmVmaXh9JHt0aGlzLnVuZXNjYXBlUHJlZml4fSguKz8pJHt0aGlzLnVuZXNjYXBlU3VmZml4fSR7dGhpcy5zdWZmaXh9YCxcbiAgICApO1xuICAgIC8vIEV2ZXJ5IGFsdGVybmF0aXZlIHN0YXJ0cyB3aXRoIGEgZGlmZmVyZW50IGNoYXIgKHBsYWluIC8gXCIgLyAnIC8gXCIoXCIpLCBzbyB0aGVyZSBpc1xuICAgIC8vIG9ubHkgb25lIHdheSB0byBzcGxpdCB0aGUgaW5wdXQuIE92ZXJsYXBwaW5nIGFsdGVybmF0aXZlcyAoZS5nLiBgW14oKVwiJ10rYCBpbnNpZGVcbiAgICAvLyBgKj9gKSBiYWNrdHJhY2sgZXhwb25lbnRpYWxseSBvbiBhbiB1bmNsb3NlZCBgJHQoYCAoUmVEb1MpLlxuICAgIHRoaXMubmVzdGluZ1JlZ2V4cCA9IGdldE9yUmVzZXRSZWdFeHAoXG4gICAgICB0aGlzLm5lc3RpbmdSZWdleHAsXG4gICAgICBgJHt0aGlzLm5lc3RpbmdQcmVmaXh9KCg/OlteKClcIiddfFwiW15cIl0qXCJ8J1teJ10qJ3xcXFxcKCg/OlteKClcIiddfFwiW15cIl0qXCJ8J1teJ10qJykqXFxcXCkpKj8pJHt0aGlzLm5lc3RpbmdTdWZmaXh9YCxcbiAgICApO1xuICB9XG5cbiAgaW50ZXJwb2xhdGUoc3RyLCBkYXRhLCBsbmcsIG9wdGlvbnMpIHtcbiAgICBsZXQgbWF0Y2g7XG4gICAgbGV0IHZhbHVlO1xuICAgIGxldCByZXBsYWNlcztcbiAgICBjb25zdCBvcmlnaW5hbCA9IHN0cjtcblxuICAgIGNvbnN0IGRlZmF1bHREYXRhID1cbiAgICAgICh0aGlzLm9wdGlvbnMgJiYgdGhpcy5vcHRpb25zLmludGVycG9sYXRpb24gJiYgdGhpcy5vcHRpb25zLmludGVycG9sYXRpb24uZGVmYXVsdFZhcmlhYmxlcykgfHxcbiAgICAgIHt9O1xuXG4gICAgY29uc3QgaGFuZGxlRm9ybWF0ID0gKGtleSkgPT4ge1xuICAgICAgaWYgKCFrZXkuaW5jbHVkZXModGhpcy5mb3JtYXRTZXBhcmF0b3IpKSB7XG4gICAgICAgIGNvbnN0IHBhdGggPSBkZWVwRmluZFdpdGhEZWZhdWx0cyhcbiAgICAgICAgICBkYXRhLFxuICAgICAgICAgIGRlZmF1bHREYXRhLFxuICAgICAgICAgIGtleSxcbiAgICAgICAgICB0aGlzLm9wdGlvbnMua2V5U2VwYXJhdG9yLFxuICAgICAgICAgIHRoaXMub3B0aW9ucy5pZ25vcmVKU09OU3RydWN0dXJlLFxuICAgICAgICApO1xuICAgICAgICByZXR1cm4gdGhpcy5hbHdheXNGb3JtYXRcbiAgICAgICAgICA/IHRoaXMuZm9ybWF0KHBhdGgsIHVuZGVmaW5lZCwgbG5nLCB7IC4uLm9wdGlvbnMsIC4uLmRhdGEsIGludGVycG9sYXRpb25rZXk6IGtleSB9KVxuICAgICAgICAgIDogcGF0aDtcbiAgICAgIH1cblxuICAgICAgY29uc3QgcCA9IGtleS5zcGxpdCh0aGlzLmZvcm1hdFNlcGFyYXRvcik7XG4gICAgICBjb25zdCBrID0gcC5zaGlmdCgpLnRyaW0oKTtcbiAgICAgIGNvbnN0IGYgPSBwLmpvaW4odGhpcy5mb3JtYXRTZXBhcmF0b3IpLnRyaW0oKTtcblxuICAgICAgcmV0dXJuIHRoaXMuZm9ybWF0KFxuICAgICAgICBkZWVwRmluZFdpdGhEZWZhdWx0cyhcbiAgICAgICAgICBkYXRhLFxuICAgICAgICAgIGRlZmF1bHREYXRhLFxuICAgICAgICAgIGssXG4gICAgICAgICAgdGhpcy5vcHRpb25zLmtleVNlcGFyYXRvcixcbiAgICAgICAgICB0aGlzLm9wdGlvbnMuaWdub3JlSlNPTlN0cnVjdHVyZSxcbiAgICAgICAgKSxcbiAgICAgICAgZixcbiAgICAgICAgbG5nLFxuICAgICAgICB7XG4gICAgICAgICAgLi4ub3B0aW9ucyxcbiAgICAgICAgICAuLi5kYXRhLFxuICAgICAgICAgIGludGVycG9sYXRpb25rZXk6IGssXG4gICAgICAgIH0sXG4gICAgICApO1xuICAgIH07XG5cbiAgICB0aGlzLnJlc2V0UmVnRXhwKCk7XG5cbiAgICAvLyBTZWN1cml0eSB3YXJuaW5nOiB3aGVuIGVzY2FwZVZhbHVlIGlzIGZhbHNlIEFORCB0aGUgdHJhbnNsYXRpb24gZW1iZWRzXG4gICAgLy8gaW50ZXJwb2xhdGlvbiBwbGFjZWhvbGRlcnMgaW5zaWRlIGEgJHQoKSBuZXN0aW5nIG9wdGlvbnMgYmxvY2sgKGkuZS5cbiAgICAvLyAkdChrZXksIHsgLi4uIFwie3t2YXJ9fVwiIC4uLiB9KSksIGF0dGFja2VyLWNvbnRyb2xsZWQgc3RyaW5nIHZhbHVlcyB0aGF0XG4gICAgLy8gY29udGFpbiBgXCJgIGNhbiBicmVhayBvdXQgb2YgdGhlIEpTT04gc3RyaW5nIGxpdGVyYWwgYW5kIGluamVjdCBleHRyYVxuICAgIC8vIG5lc3Rpbmcgb3B0aW9ucyAoZS5nLiByZWRpcmVjdCBsbmcvbnMpLiBUaGlzIGlzIHNhZmUgdW5kZXIgdGhlIGRlZmF1bHRcbiAgICAvLyBlc2NhcGVWYWx1ZTogdHJ1ZSwgd2hlcmUgSFRNTC1lc2NhcGluZyBuZXV0cmFsaXNlcyB0aGUgcXVvdGUgYmVmb3JlXG4gICAgLy8gSlNPTi5wYXJzZS4gU2VlIENIQU5HRUxPRyBlbnRyeSBmb3IgMjYuMC42IGFuZCB0aGUgc2VjdXJpdHkgZG9jcy5cbiAgICBpZiAoIXRoaXMuZXNjYXBlVmFsdWUgJiYgdHlwZW9mIHN0ciA9PT0gJ3N0cmluZycgJiYgL1xcJHRcXChbXildKlxce1tefV0qXFx7XFx7Ly50ZXN0KHN0cikpIHtcbiAgICAgIHRoaXMubG9nZ2VyLndhcm4oXG4gICAgICAgICduZXN0aW5nIG9wdGlvbnMgc3RyaW5nIGNvbnRhaW5zIGludGVycG9sYXRlZCB2YXJpYWJsZXMgd2l0aCBlc2NhcGVWYWx1ZTogZmFsc2Ug4oCUICcgK1xuICAgICAgICAgICdpZiBhbnkgb2YgdGhvc2UgdmFsdWVzIGFyZSBhdHRhY2tlci1jb250cm9sbGVkIHRoZXkgY2FuIGluamVjdCBhZGRpdGlvbmFsICcgK1xuICAgICAgICAgICduZXN0aW5nIG9wdGlvbnMgKGUuZy4gcmVkaXJlY3QgbG5nL25zKS4gU2FuaXRpc2UgdW50cnVzdGVkIGlucHV0IGJlZm9yZSBwYXNzaW5nICcgK1xuICAgICAgICAgICdpdCB0byB0KCksIG9yIGtlZXAgZXNjYXBlVmFsdWU6IHRydWUuJyxcbiAgICAgICk7XG4gICAgfVxuXG4gICAgY29uc3QgbWlzc2luZ0ludGVycG9sYXRpb25IYW5kbGVyID1cbiAgICAgIG9wdGlvbnM/Lm1pc3NpbmdJbnRlcnBvbGF0aW9uSGFuZGxlciB8fCB0aGlzLm9wdGlvbnMubWlzc2luZ0ludGVycG9sYXRpb25IYW5kbGVyO1xuXG4gICAgY29uc3Qgc2tpcE9uVmFyaWFibGVzID1cbiAgICAgIG9wdGlvbnM/LmludGVycG9sYXRpb24/LnNraXBPblZhcmlhYmxlcyAhPT0gdW5kZWZpbmVkXG4gICAgICAgID8gb3B0aW9ucy5pbnRlcnBvbGF0aW9uLnNraXBPblZhcmlhYmxlc1xuICAgICAgICA6IHRoaXMub3B0aW9ucy5pbnRlcnBvbGF0aW9uLnNraXBPblZhcmlhYmxlcztcblxuICAgIC8vIG5vIHBsYWNlaG9sZGVyIGF0IGFsbDogbmVpdGhlciByZWdleHAgY2FuIG1hdGNoXG4gICAgaWYgKGlzU3RyaW5nKHN0cikgJiYgIXN0ci5pbmNsdWRlcyh0aGlzLnByZWZpeFRleHQpKSByZXR1cm4gc3RyO1xuXG4gICAgY29uc3QgdG9kb3MgPSBbXG4gICAgICB7XG4gICAgICAgIC8vIHVuZXNjYXBlIGlmIGhhcyB1bmVzY2FwZVByZWZpeC9TdWZmaXhcbiAgICAgICAgcmVnZXg6IHRoaXMucmVnZXhwVW5lc2NhcGUsXG4gICAgICAgIHNhZmVWYWx1ZTogKHZhbCkgPT4gdmFsLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgLy8gcmVndWxhciBlc2NhcGUgb24gZGVtYW5kXG4gICAgICAgIHJlZ2V4OiB0aGlzLnJlZ2V4cCxcbiAgICAgICAgc2FmZVZhbHVlOiAodmFsKSA9PiAodGhpcy5lc2NhcGVWYWx1ZSA/IHRoaXMuZXNjYXBlKHZhbCkgOiB2YWwpLFxuICAgICAgfSxcbiAgICBdO1xuICAgIC8vIHNraXBPblZhcmlhYmxlczogdGhlIGVzY2FwZSBwYXNzIHNraXBzIHRoZSB1bmVzY2FwZWQgdmFsdWVzLCBvZmZzZXQgYnkgaXRzIG93biBlZGl0cy5cbiAgICBjb25zdCB1bmVzY2FwZWRWYWx1ZXMgPSBbXTtcbiAgICBsZXQgc2hpZnQgPSAwO1xuICAgIHRvZG9zLmZvckVhY2goKHRvZG8pID0+IHtcbiAgICAgIHJlcGxhY2VzID0gMDtcbiAgICAgIHdoaWxlICgobWF0Y2ggPSB0b2RvLnJlZ2V4LmV4ZWMoc3RyKSkpIHtcbiAgICAgICAgY29uc3QgYXQgPSBtYXRjaC5pbmRleCAtIHNoaWZ0O1xuICAgICAgICBjb25zdCB3cml0dGVuID0gdW5lc2NhcGVkVmFsdWVzLmZpbmQoKFtzdGFydCwgZW5kXSkgPT4gYXQgPj0gc3RhcnQgJiYgYXQgPCBlbmQpO1xuICAgICAgICBpZiAod3JpdHRlbikge1xuICAgICAgICAgIHRvZG8ucmVnZXgubGFzdEluZGV4ID0gd3JpdHRlblsxXSArIHNoaWZ0O1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IG1hdGNoZWRWYXIgPSBtYXRjaFsxXS50cmltKCk7XG4gICAgICAgIHZhbHVlID0gaGFuZGxlRm9ybWF0KG1hdGNoZWRWYXIpO1xuICAgICAgICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGlmICh0eXBlb2YgbWlzc2luZ0ludGVycG9sYXRpb25IYW5kbGVyID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjb25zdCB0ZW1wID0gbWlzc2luZ0ludGVycG9sYXRpb25IYW5kbGVyKHN0ciwgbWF0Y2gsIG9wdGlvbnMpO1xuICAgICAgICAgICAgdmFsdWUgPSBpc1N0cmluZyh0ZW1wKSA/IHRlbXAgOiAnJztcbiAgICAgICAgICB9IGVsc2UgaWYgKG9wdGlvbnMgJiYgT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9wdGlvbnMsIG1hdGNoZWRWYXIpKSB7XG4gICAgICAgICAgICB2YWx1ZSA9ICcnOyAvLyB1bmRlZmluZWQgYmVjb21lcyBlbXB0eSBzdHJpbmdcbiAgICAgICAgICB9IGVsc2UgaWYgKHNraXBPblZhcmlhYmxlcykge1xuICAgICAgICAgICAgLy8ga2V5ZWQgYnkgdGhlIHBsYWNlaG9sZGVyIHRleHQ6IGJvdGggcGFzc2VzIHNlZSBhbiB1bmVzY2FwZWQgYHt7LSB2YXJ9fWAuXG4gICAgICAgICAgICAvLyBDaGVja2VkIGhlcmUgdG9vLCBzbyBhIGNhbGwgd2l0aG91dCBkZWJ1ZyBkb2VzIG5vdCBidWlsZCB0aGUgc3RyaW5ncy5cbiAgICAgICAgICAgIGlmICh0aGlzLmxvZ2dlci5kZWJ1Zykge1xuICAgICAgICAgICAgICB0aGlzLmxvZ2dlci5vbmNlKFxuICAgICAgICAgICAgICAgIGAke29yaWdpbmFsfVxcdTAwMDAke21hdGNoWzBdfWAsXG4gICAgICAgICAgICAgICAgJ3dhcm4nLFxuICAgICAgICAgICAgICAgIGBtaXNzZWQgdG8gcGFzcyBpbiB2YXJpYWJsZSAke21hdGNoZWRWYXJ9IGZvciBpbnRlcnBvbGF0aW5nICR7b3JpZ2luYWx9YCxcbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhbHVlID0gbWF0Y2hbMF07XG4gICAgICAgICAgICBjb250aW51ZTsgLy8gdGhpcyBtYWtlcyBzdXJlIGl0IGNvbnRpbnVlcyB0byBkZXRlY3Qgb3RoZXJzXG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMubG9nZ2VyLndhcm4oYG1pc3NlZCB0byBwYXNzIGluIHZhcmlhYmxlICR7bWF0Y2hlZFZhcn0gZm9yIGludGVycG9sYXRpbmcgJHtzdHJ9YCk7XG4gICAgICAgICAgICB2YWx1ZSA9ICcnO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmICghaXNTdHJpbmcodmFsdWUpICYmICF0aGlzLnVzZVJhd1ZhbHVlVG9Fc2NhcGUpIHtcbiAgICAgICAgICB2YWx1ZSA9IG1ha2VTdHJpbmcodmFsdWUpO1xuICAgICAgICB9XG4gICAgICAgIC8vIG1ha2VTdHJpbmc6IHdpdGggdXNlUmF3VmFsdWVUb0VzY2FwZSwgYHt7LSB2YXJ9fWAgYW5kIGVzY2FwZVZhbHVlOiBmYWxzZSBwYXNzIHRoZSByYXcgdmFsdWUuXG4gICAgICAgIGNvbnN0IHNhZmVWYWx1ZSA9IG1ha2VTdHJpbmcodG9kby5zYWZlVmFsdWUodmFsdWUpKTtcbiAgICAgICAgLy8gU2xpY2VkIGluIGF0IG1hdGNoLmluZGV4OiBTdHJpbmcucmVwbGFjZSBtYXkgaGl0IGEgY29weSBpbnNpZGUgYW4gZWFybGllciB2YWx1ZS5cbiAgICAgICAgc3RyID0gc3RyLnNsaWNlKDAsIG1hdGNoLmluZGV4KSArIHNhZmVWYWx1ZSArIHN0ci5zbGljZShtYXRjaC5pbmRleCArIG1hdGNoWzBdLmxlbmd0aCk7XG4gICAgICAgIGlmIChza2lwT25WYXJpYWJsZXMpIHtcbiAgICAgICAgICBpZiAodG9kby5yZWdleCA9PT0gdGhpcy5yZWdleHBVbmVzY2FwZSkge1xuICAgICAgICAgICAgdW5lc2NhcGVkVmFsdWVzLnB1c2goW21hdGNoLmluZGV4LCBtYXRjaC5pbmRleCArIHNhZmVWYWx1ZS5sZW5ndGhdKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc2hpZnQgKz0gc2FmZVZhbHVlLmxlbmd0aCAtIG1hdGNoWzBdLmxlbmd0aDtcbiAgICAgICAgICB9XG4gICAgICAgICAgdG9kby5yZWdleC5sYXN0SW5kZXggKz0gc2FmZVZhbHVlLmxlbmd0aDtcbiAgICAgICAgICB0b2RvLnJlZ2V4Lmxhc3RJbmRleCAtPSBtYXRjaFswXS5sZW5ndGg7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdG9kby5yZWdleC5sYXN0SW5kZXggPSAwO1xuICAgICAgICB9XG4gICAgICAgIHJlcGxhY2VzKys7XG4gICAgICAgIGlmIChyZXBsYWNlcyA+PSB0aGlzLm1heFJlcGxhY2VzKSB7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gc3RyO1xuICB9XG5cbiAgbmVzdChzdHIsIGZjLCBvcHRpb25zID0ge30pIHtcbiAgICBsZXQgbWF0Y2g7XG4gICAgbGV0IHZhbHVlO1xuXG4gICAgbGV0IGNsb25lZE9wdGlvbnM7XG5cbiAgICAvLyBpZiB2YWx1ZSBpcyBzb21ldGhpbmcgbGlrZSBcIm15S2V5XCI6IFwibG9yZW0gJChhbm90aGVyS2V5LCB7IFwiY291bnRcIjoge3thVmFsdWVJbk9wdGlvbnN9fSB9KVwiXG4gICAgY29uc3QgaGFuZGxlSGFzT3B0aW9ucyA9IChrZXksIGluaGVyaXRlZE9wdGlvbnMpID0+IHtcbiAgICAgIGNvbnN0IHNlcCA9IHRoaXMubmVzdGluZ09wdGlvbnNTZXBhcmF0b3I7XG4gICAgICBpZiAoIWtleS5pbmNsdWRlcyhzZXApKSByZXR1cm4ga2V5O1xuXG4gICAgICBjb25zdCBjID0ga2V5LnNwbGl0KG5ldyBSZWdFeHAoYCR7cmVnZXhFc2NhcGUoc2VwKX1bIF0qe2ApKTtcblxuICAgICAgbGV0IG9wdGlvbnNTdHJpbmcgPSBgeyR7Y1sxXX1gO1xuICAgICAga2V5ID0gY1swXTtcbiAgICAgIG9wdGlvbnNTdHJpbmcgPSB0aGlzLmludGVycG9sYXRlKG9wdGlvbnNTdHJpbmcsIGNsb25lZE9wdGlvbnMpO1xuICAgICAgY29uc3QgbWF0Y2hlZFNpbmdsZVF1b3RlcyA9IG9wdGlvbnNTdHJpbmcubWF0Y2goLycvZyk7XG4gICAgICBjb25zdCBtYXRjaGVkRG91YmxlUXVvdGVzID0gb3B0aW9uc1N0cmluZy5tYXRjaCgvXCIvZyk7XG4gICAgICBpZiAoXG4gICAgICAgICgobWF0Y2hlZFNpbmdsZVF1b3Rlcz8ubGVuZ3RoID8/IDApICUgMiA9PT0gMCAmJiAhbWF0Y2hlZERvdWJsZVF1b3RlcykgfHxcbiAgICAgICAgKG1hdGNoZWREb3VibGVRdW90ZXM/Lmxlbmd0aCA/PyAwKSAlIDIgIT09IDBcbiAgICAgICkge1xuICAgICAgICBvcHRpb25zU3RyaW5nID0gb3B0aW9uc1N0cmluZy5yZXBsYWNlKC8nL2csICdcIicpO1xuICAgICAgfVxuXG4gICAgICB0cnkge1xuICAgICAgICBjbG9uZWRPcHRpb25zID0gSlNPTi5wYXJzZShvcHRpb25zU3RyaW5nKTtcblxuICAgICAgICBpZiAoaW5oZXJpdGVkT3B0aW9ucykgY2xvbmVkT3B0aW9ucyA9IHsgLi4uaW5oZXJpdGVkT3B0aW9ucywgLi4uY2xvbmVkT3B0aW9ucyB9O1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICB0aGlzLmxvZ2dlci53YXJuKGBmYWlsZWQgcGFyc2luZyBvcHRpb25zIHN0cmluZyBpbiBuZXN0aW5nIGZvciBrZXkgJHtrZXl9YCwgZSk7XG4gICAgICAgIHJldHVybiBgJHtrZXl9JHtzZXB9JHtvcHRpb25zU3RyaW5nfWA7XG4gICAgICB9XG5cbiAgICAgIC8vIGFzc2VydCB3ZSBkbyBub3QgZ2V0IGEgZW5kbGVzcyBsb29wIG9uIGludGVycG9sYXRpbmcgZGVmYXVsdFZhbHVlIGFnYWluIGFuZCBhZ2FpblxuICAgICAgaWYgKGNsb25lZE9wdGlvbnMuZGVmYXVsdFZhbHVlICYmIGNsb25lZE9wdGlvbnMuZGVmYXVsdFZhbHVlLmluY2x1ZGVzKHRoaXMucHJlZml4KSlcbiAgICAgICAgZGVsZXRlIGNsb25lZE9wdGlvbnMuZGVmYXVsdFZhbHVlO1xuICAgICAgcmV0dXJuIGtleTtcbiAgICB9O1xuXG4gICAgLy8gbm90aGluZyB0byBuZXN0ICh0aGUgY29tbW9uIGNhc2UpOiBubyBjb3B5IG9mIHRoZSByZWdleHAgdG8gc2NhbiB3aXRoXG4gICAgaWYgKGlzU3RyaW5nKHN0cikgJiYgIXN0ci5pbmNsdWRlcyh0aGlzLm5lc3RpbmdQcmVmaXhUZXh0KSkgcmV0dXJuIHN0cjtcblxuICAgIC8vIE9uZSBwYXNzIG92ZXIgdGhlIG9yaWdpbmFsIHN0ciB3aXRoIGFuIG93biBjb3B5IG9mIHRoZSByZWdleHAuIFRoZSBuZXN0ZWQgbG9va3Vwc1xuICAgIC8vIChmYykgcmVzZXQgdGhlIHNoYXJlZCBuZXN0aW5nUmVnZXhwLCBzbyB0aGUgbG9vcCB1c2VkIHRvIHJlc2NhbiBmcm9tIDAgYWZ0ZXIgZXZlcnlcbiAgICAvLyBtYXRjaDogcXVhZHJhdGljLCBhbmQgaXQgbmVzdGVkIGFnYWluIGFueSBgJHQoLi4uKWAgaW5zaWRlIGEgcmVzb2x2ZWQgdmFsdWUgKGUuZy4gYVxuICAgIC8vIHZhcmlhYmxlIHRoZSBuZXN0ZWQgbG9va3VwIGtlcHQgbGl0ZXJhbCB1bmRlciBza2lwT25WYXJpYWJsZXMpLlxuICAgIGNvbnN0IG5lc3RpbmdSZWdleHAgPSBuZXcgUmVnRXhwKHRoaXMubmVzdGluZ1JlZ2V4cCk7XG4gICAgbGV0IG91dCA9ICcnO1xuICAgIGxldCBsYXN0RW5kID0gMDtcbiAgICB3aGlsZSAoKG1hdGNoID0gbmVzdGluZ1JlZ2V4cC5leGVjKHN0cikpKSB7XG4gICAgICBsZXQgZm9ybWF0dGVycyA9IFtdO1xuXG4gICAgICBjbG9uZWRPcHRpb25zID0geyAuLi5vcHRpb25zIH07XG4gICAgICBjbG9uZWRPcHRpb25zID1cbiAgICAgICAgY2xvbmVkT3B0aW9ucy5yZXBsYWNlICYmICFpc1N0cmluZyhjbG9uZWRPcHRpb25zLnJlcGxhY2UpXG4gICAgICAgICAgPyBjbG9uZWRPcHRpb25zLnJlcGxhY2VcbiAgICAgICAgICA6IGNsb25lZE9wdGlvbnM7XG4gICAgICBjbG9uZWRPcHRpb25zLmFwcGx5UG9zdFByb2Nlc3NvciA9IGZhbHNlOyAvLyBhdm9pZCBwb3N0IHByb2Nlc3Npbmcgb24gbmVzdGVkIGxvb2t1cFxuICAgICAgZGVsZXRlIGNsb25lZE9wdGlvbnMuZGVmYXVsdFZhbHVlOyAvLyBhc3NlcnQgd2UgZG8gbm90IGdldCBhIGVuZGxlc3MgbG9vcCBvbiBpbnRlcnBvbGF0aW5nIGRlZmF1bHRWYWx1ZSBhZ2FpbiBhbmQgYWdhaW5cblxuICAgICAgLyoqXG4gICAgICAgKiBJZiB0aGVyZSBpcyBtb3JlIHRoYW4gb25lIHBhcmFtZXRlciAoY29udGFpbnMgdGhlIGZvcm1hdCBzZXBhcmF0b3IpLiBFLmcuOlxuICAgICAgICogICAtIHQoYSwgYilcbiAgICAgICAqICAgLSB0KGEsIGIsIGMpXG4gICAgICAgKlxuICAgICAgICogQW5kIHRob3NlIHBhcmFtZXRlcnMgYXJlIG5vdCBkeW5hbWljIHZhbHVlcyAocGFyYW1ldGVycyBkbyBub3QgaW5jbHVkZSBjdXJseSBicmFjZXMpLiBFLmcuOlxuICAgICAgICogICAtIE5vdCB0KGEsIHsgXCJrZXlcIjogXCJ7e3ZhcmlhYmxlfX1cIiB9KVxuICAgICAgICogICAtIE5vdCB0KGEsIGIsIHtcImtleUFcIjogXCJ2YWx1ZUFcIiwgXCJrZXlCXCI6IFwidmFsdWVCXCJ9KVxuICAgICAgICpcbiAgICAgICAqIFNpbmNlIHYyNS4zLjAgYWxzbyB0aGlzIGlzIHBvc3NpYmxlOiBodHRwczovL2dpdGh1Yi5jb20vaTE4bmV4dC9pMThuZXh0L3B1bGwvMjMyNVxuICAgICAgICovXG4gICAgICBjb25zdCBrZXlFbmRJbmRleCA9IC97Lip9L3MudGVzdChtYXRjaFsxXSlcbiAgICAgICAgPyBtYXRjaFsxXS5sYXN0SW5kZXhPZignfScpICsgMVxuICAgICAgICA6IG1hdGNoWzFdLmluZGV4T2YodGhpcy5mb3JtYXRTZXBhcmF0b3IpO1xuICAgICAgaWYgKGtleUVuZEluZGV4ICE9PSAtMSkge1xuICAgICAgICBmb3JtYXR0ZXJzID0gbWF0Y2hbMV1cbiAgICAgICAgICAuc2xpY2Uoa2V5RW5kSW5kZXgpXG4gICAgICAgICAgLnNwbGl0KHRoaXMuZm9ybWF0U2VwYXJhdG9yKVxuICAgICAgICAgIC5tYXAoKGVsZW0pID0+IGVsZW0udHJpbSgpKVxuICAgICAgICAgIC5maWx0ZXIoQm9vbGVhbik7XG4gICAgICAgIG1hdGNoWzFdID0gbWF0Y2hbMV0uc2xpY2UoMCwga2V5RW5kSW5kZXgpO1xuICAgICAgfVxuXG4gICAgICB2YWx1ZSA9IGZjKGhhbmRsZUhhc09wdGlvbnMuY2FsbCh0aGlzLCBtYXRjaFsxXS50cmltKCksIGNsb25lZE9wdGlvbnMpLCBjbG9uZWRPcHRpb25zKTtcblxuICAgICAgLy8gaXMgb25seSB0aGUgbmVzdGluZyBrZXkgKGtleTEgPSAnJChrZXkyKScpIHJldHVybiB0aGUgdmFsdWUgd2l0aG91dCBzdHJpbmdpZnlcbiAgICAgIGlmICh2YWx1ZSAmJiBtYXRjaFswXSA9PT0gc3RyICYmICFpc1N0cmluZyh2YWx1ZSkpIHJldHVybiB2YWx1ZTtcblxuICAgICAgLy8gbm8gc3RyaW5nIHRvIGluY2x1ZGUgb3IgZW1wdHlcbiAgICAgIGlmICghaXNTdHJpbmcodmFsdWUpKSB2YWx1ZSA9IG1ha2VTdHJpbmcodmFsdWUpO1xuICAgICAgaWYgKCF2YWx1ZSkge1xuICAgICAgICB0aGlzLmxvZ2dlci53YXJuKGBtaXNzZWQgdG8gcmVzb2x2ZSAke21hdGNoWzFdfSBmb3IgbmVzdGluZyAke3N0cn1gKTtcbiAgICAgICAgdmFsdWUgPSAnJztcbiAgICAgIH1cblxuICAgICAgaWYgKGZvcm1hdHRlcnMubGVuZ3RoKSB7XG4gICAgICAgIHZhbHVlID0gZm9ybWF0dGVycy5yZWR1Y2UoXG4gICAgICAgICAgKHYsIGYpID0+XG4gICAgICAgICAgICB0aGlzLmZvcm1hdCh2LCBmLCBvcHRpb25zLmxuZywgeyAuLi5vcHRpb25zLCBpbnRlcnBvbGF0aW9ua2V5OiBtYXRjaFsxXS50cmltKCkgfSksXG4gICAgICAgICAgdmFsdWUudHJpbSgpLFxuICAgICAgICApO1xuICAgICAgfVxuXG4gICAgICAvLyBOZXN0ZWQga2V5cyBzaG91bGQgbm90IGJlIGVzY2FwZWQgYnkgZGVmYXVsdCAjODU0XG4gICAgICAvLyBTbGljZWQgaW4sIG5vdCBTdHJpbmcucmVwbGFjZSwgc28gYCQmYCwgYCQnYCwgXCIkYFwiIGFuZCBgJCRgIGluIHRoZSB2YWx1ZSBzdGF5IGxpdGVyYWwuXG4gICAgICAvLyBtYWtlU3RyaW5nOiBhIGZvcm1hdHRlciBpbiB0aGUgbmVzdGluZyBjaGFpbiBtYXkgaGF2ZSByZXR1cm5lZCBhIG5vbi1zdHJpbmcuXG4gICAgICBvdXQgKz0gc3RyLnNsaWNlKGxhc3RFbmQsIG1hdGNoLmluZGV4KSArIG1ha2VTdHJpbmcodmFsdWUpO1xuICAgICAgbGFzdEVuZCA9IG5lc3RpbmdSZWdleHAubGFzdEluZGV4O1xuICAgICAgdGhpcy5yZWdleHAubGFzdEluZGV4ID0gMDtcbiAgICB9XG4gICAgLy8gbm8gbWF0Y2g6IHN0ciB1bnRvdWNoZWQgKGl0IG1heSBiZSBhIG5vbi1zdHJpbmcpXG4gICAgcmV0dXJuIGxhc3RFbmQgPyBvdXQgKyBzdHIuc2xpY2UobGFzdEVuZCkgOiBzdHI7XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgSW50ZXJwb2xhdG9yO1xuIiwiaW1wb3J0IGJhc2VMb2dnZXIgZnJvbSAnLi9sb2dnZXIuanMnO1xuaW1wb3J0IHsgZ2V0Q2xlYW5lZENvZGUgfSBmcm9tICcuL3V0aWxzLmpzJztcblxuY29uc3QgcGFyc2VGb3JtYXRTdHIgPSAoZm9ybWF0U3RyKSA9PiB7XG4gIGxldCBmb3JtYXROYW1lID0gZm9ybWF0U3RyLnRvTG93ZXJDYXNlKCkudHJpbSgpO1xuICBjb25zdCBmb3JtYXRPcHRpb25zID0ge307XG4gIGlmIChmb3JtYXRTdHIuaW5jbHVkZXMoJygnKSkge1xuICAgIGNvbnN0IHAgPSBmb3JtYXRTdHIuc3BsaXQoJygnKTtcbiAgICBmb3JtYXROYW1lID0gcFswXS50b0xvd2VyQ2FzZSgpLnRyaW0oKTtcblxuICAgIGNvbnN0IG9wdFN0ciA9IHBbMV0uc2xpY2UoMCwgLTEpO1xuXG4gICAgLy8gZXh0cmEgZm9yIGN1cnJlbmN5XG4gICAgaWYgKGZvcm1hdE5hbWUgPT09ICdjdXJyZW5jeScgJiYgIW9wdFN0ci5pbmNsdWRlcygnOicpKSB7XG4gICAgICBpZiAoIWZvcm1hdE9wdGlvbnMuY3VycmVuY3kpIGZvcm1hdE9wdGlvbnMuY3VycmVuY3kgPSBvcHRTdHIudHJpbSgpO1xuICAgIH0gZWxzZSBpZiAoZm9ybWF0TmFtZSA9PT0gJ3JlbGF0aXZldGltZScgJiYgIW9wdFN0ci5pbmNsdWRlcygnOicpKSB7XG4gICAgICBpZiAoIWZvcm1hdE9wdGlvbnMucmFuZ2UpIGZvcm1hdE9wdGlvbnMucmFuZ2UgPSBvcHRTdHIudHJpbSgpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBvcHRzID0gb3B0U3RyLnNwbGl0KCc7Jyk7XG5cbiAgICAgIG9wdHMuZm9yRWFjaCgob3B0KSA9PiB7XG4gICAgICAgIGlmIChvcHQpIHtcbiAgICAgICAgICBjb25zdCBba2V5LCAuLi5yZXN0XSA9IG9wdC5zcGxpdCgnOicpO1xuICAgICAgICAgIGNvbnN0IHZhbCA9IHJlc3RcbiAgICAgICAgICAgIC5qb2luKCc6JylcbiAgICAgICAgICAgIC50cmltKClcbiAgICAgICAgICAgIC5yZXBsYWNlKC9eJyt8JyskL2csICcnKTsgLy8gdHJpbSBhbmQgcmVwbGFjZSAnJ1xuXG4gICAgICAgICAgY29uc3QgdHJpbW1lZEtleSA9IGtleS50cmltKCk7XG5cbiAgICAgICAgICBpZiAoIWZvcm1hdE9wdGlvbnNbdHJpbW1lZEtleV0pIGZvcm1hdE9wdGlvbnNbdHJpbW1lZEtleV0gPSB2YWw7XG4gICAgICAgICAgaWYgKHZhbCA9PT0gJ2ZhbHNlJykgZm9ybWF0T3B0aW9uc1t0cmltbWVkS2V5XSA9IGZhbHNlO1xuICAgICAgICAgIGlmICh2YWwgPT09ICd0cnVlJykgZm9ybWF0T3B0aW9uc1t0cmltbWVkS2V5XSA9IHRydWU7XG4gICAgICAgICAgaWYgKCFpc05hTih2YWwpKSBmb3JtYXRPcHRpb25zW3RyaW1tZWRLZXldID0gcGFyc2VJbnQodmFsLCAxMCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB7XG4gICAgZm9ybWF0TmFtZSxcbiAgICBmb3JtYXRPcHRpb25zLFxuICB9O1xufTtcblxuLy8gVGhlIGNhY2hlIGtleSBob2xkcyB0aGUgb3B0aW9ucyBvZiB0aGUgdCgpIGNhbGwsIGFuZCBzbyB0aGUgaW50ZXJwb2xhdGVkIHZhbHVlczogYSBmb3JtYXR0ZXIgaXNcbi8vIGtlcHQgZm9yIGVhY2ggbmV3IHZhbHVlLiBXaXRob3V0IGEgbGltaXQsIGEgbG9uZyBydW5uaW5nIHByb2Nlc3MgdGhhdCBmb3JtYXRzIGV2ZXIgbmV3XG4vLyBhbW91bnRzLCBkYXRlcyBvciBuYW1lcyBrZWVwcyB0aGVtIGFsbCAoIzIyMjcpLlxuY29uc3QgY2FjaGVkRm9ybWF0dGVyc0xpbWl0ID0gMTAwMDtcblxuY29uc3QgY3JlYXRlQ2FjaGVkRm9ybWF0dGVyID0gKGZuKSA9PiB7XG4gIGNvbnN0IGNhY2hlID0gbmV3IE1hcCgpO1xuICByZXR1cm4gKHYsIGwsIG8pID0+IHtcbiAgICBsZXQgb3B0Rm9yQ2FjaGUgPSBvO1xuICAgIC8vIHRoaXMgY2FjaGUgb3B0aW1pemF0aW9uIHdpbGwgb25seSB3b3JrIGZvciBrZXlzIGhhdmluZyAxIGludGVycG9sYXRlZCB2YWx1ZVxuICAgIGlmIChcbiAgICAgIG8gJiZcbiAgICAgIG8uaW50ZXJwb2xhdGlvbmtleSAmJlxuICAgICAgby5mb3JtYXRQYXJhbXMgJiZcbiAgICAgIG8uZm9ybWF0UGFyYW1zW28uaW50ZXJwb2xhdGlvbmtleV0gJiZcbiAgICAgIG9bby5pbnRlcnBvbGF0aW9ua2V5XVxuICAgICkge1xuICAgICAgb3B0Rm9yQ2FjaGUgPSB7XG4gICAgICAgIC4uLm9wdEZvckNhY2hlLFxuICAgICAgICBbby5pbnRlcnBvbGF0aW9ua2V5XTogdW5kZWZpbmVkLFxuICAgICAgfTtcbiAgICB9XG4gICAgbGV0IGtleTtcbiAgICB0cnkge1xuICAgICAga2V5ID0gbCArIEpTT04uc3RyaW5naWZ5KG9wdEZvckNhY2hlKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAvLyBvcHRpb25zIGFyZSBub3Qgc2VyaWFsaXphYmxlIChlLmcuIEJpZ0ludCBvciBjaXJjdWxhciB2YWx1ZXMpOiBmb3JtYXQgd2l0aG91dCB0aGUgY2FjaGVcbiAgICAgIHJldHVybiBmbihnZXRDbGVhbmVkQ29kZShsKSwgbykodik7XG4gICAgfVxuICAgIGxldCBmcm0gPSBjYWNoZS5nZXQoa2V5KTtcbiAgICBpZiAoIWZybSkge1xuICAgICAgZnJtID0gZm4oZ2V0Q2xlYW5lZENvZGUobCksIG8pO1xuICAgICAgLy8gZm9yZ2V0IHRoZSBvbGRlc3QgZm9ybWF0dGVyLCB3aGljaCBpcyBtYWRlIGFnYWluIGlmIGl0IGlzIG5lZWRlZFxuICAgICAgaWYgKGNhY2hlLnNpemUgPj0gY2FjaGVkRm9ybWF0dGVyc0xpbWl0KSBjYWNoZS5kZWxldGUoY2FjaGUua2V5cygpLm5leHQoKS52YWx1ZSk7XG4gICAgICBjYWNoZS5zZXQoa2V5LCBmcm0pO1xuICAgIH1cbiAgICByZXR1cm4gZnJtKHYpO1xuICB9O1xufTtcblxuY29uc3QgY3JlYXRlTm9uQ2FjaGVkRm9ybWF0dGVyID0gKGZuKSA9PiAodiwgbCwgbykgPT4gZm4oZ2V0Q2xlYW5lZENvZGUobCksIG8pKHYpO1xuXG5jbGFzcyBGb3JtYXR0ZXIge1xuICBjb25zdHJ1Y3RvcihvcHRpb25zID0ge30pIHtcbiAgICB0aGlzLmxvZ2dlciA9IGJhc2VMb2dnZXIuY3JlYXRlKCdmb3JtYXR0ZXInKTtcbiAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuICAgIHRoaXMuaW5pdChvcHRpb25zKTtcbiAgfVxuXG4gIGluaXQoc2VydmljZXMsIG9wdGlvbnMgPSB7IGludGVycG9sYXRpb246IHt9IH0pIHtcbiAgICAvLyB0aGUgaW5zdGFuY2UncyBsb2dnZXIgKHRoZSBjb25zdHJ1Y3RvciBydW5zIGluaXQoKSB3aXRoIHRoZSBvcHRpb25zIGluc3RlYWQgb2YgdGhlIHNlcnZpY2VzKVxuICAgIGlmIChzZXJ2aWNlcz8ubG9nZ2VyPy5jcmVhdGUpIHRoaXMubG9nZ2VyID0gc2VydmljZXMubG9nZ2VyLmNyZWF0ZSgnZm9ybWF0dGVyJyk7XG4gICAgdGhpcy5mb3JtYXRTZXBhcmF0b3IgPSBvcHRpb25zLmludGVycG9sYXRpb24uZm9ybWF0U2VwYXJhdG9yIHx8ICcsJztcbiAgICBjb25zdCBjZiA9IG9wdGlvbnMuY2FjaGVJbkJ1aWx0Rm9ybWF0cyA/IGNyZWF0ZUNhY2hlZEZvcm1hdHRlciA6IGNyZWF0ZU5vbkNhY2hlZEZvcm1hdHRlcjtcbiAgICB0aGlzLmZvcm1hdHMgPSB7XG4gICAgICBudW1iZXI6IGNmKChsbmcsIG9wdCkgPT4ge1xuICAgICAgICBjb25zdCBmb3JtYXR0ZXIgPSBuZXcgSW50bC5OdW1iZXJGb3JtYXQobG5nLCB7IC4uLm9wdCB9KTtcbiAgICAgICAgcmV0dXJuICh2YWwpID0+IGZvcm1hdHRlci5mb3JtYXQodmFsKTtcbiAgICAgIH0pLFxuICAgICAgY3VycmVuY3k6IGNmKChsbmcsIG9wdCkgPT4ge1xuICAgICAgICBjb25zdCBmb3JtYXR0ZXIgPSBuZXcgSW50bC5OdW1iZXJGb3JtYXQobG5nLCB7IC4uLm9wdCwgc3R5bGU6ICdjdXJyZW5jeScgfSk7XG4gICAgICAgIHJldHVybiAodmFsKSA9PiBmb3JtYXR0ZXIuZm9ybWF0KHZhbCk7XG4gICAgICB9KSxcbiAgICAgIGRhdGV0aW1lOiBjZigobG5nLCBvcHQpID0+IHtcbiAgICAgICAgY29uc3QgZm9ybWF0dGVyID0gbmV3IEludGwuRGF0ZVRpbWVGb3JtYXQobG5nLCB7IC4uLm9wdCB9KTtcbiAgICAgICAgcmV0dXJuICh2YWwpID0+IGZvcm1hdHRlci5mb3JtYXQodmFsKTtcbiAgICAgIH0pLFxuICAgICAgcmVsYXRpdmV0aW1lOiBjZigobG5nLCBvcHQpID0+IHtcbiAgICAgICAgY29uc3QgZm9ybWF0dGVyID0gbmV3IEludGwuUmVsYXRpdmVUaW1lRm9ybWF0KGxuZywgeyAuLi5vcHQgfSk7XG4gICAgICAgIHJldHVybiAodmFsKSA9PiBmb3JtYXR0ZXIuZm9ybWF0KHZhbCwgb3B0LnJhbmdlIHx8ICdkYXknKTtcbiAgICAgIH0pLFxuICAgICAgbGlzdDogY2YoKGxuZywgb3B0KSA9PiB7XG4gICAgICAgIGNvbnN0IGZvcm1hdHRlciA9IG5ldyBJbnRsLkxpc3RGb3JtYXQobG5nLCB7IC4uLm9wdCB9KTtcbiAgICAgICAgcmV0dXJuICh2YWwpID0+IGZvcm1hdHRlci5mb3JtYXQodmFsKTtcbiAgICAgIH0pLFxuICAgIH07XG4gIH1cblxuICBhZGQobmFtZSwgZmMpIHtcbiAgICB0aGlzLmZvcm1hdHNbbmFtZS50b0xvd2VyQ2FzZSgpLnRyaW0oKV0gPSBmYztcbiAgfVxuXG4gIGFkZENhY2hlZChuYW1lLCBmYykge1xuICAgIHRoaXMuZm9ybWF0c1tuYW1lLnRvTG93ZXJDYXNlKCkudHJpbSgpXSA9IGNyZWF0ZUNhY2hlZEZvcm1hdHRlcihmYyk7XG4gIH1cblxuICBmb3JtYXQodmFsdWUsIGZvcm1hdCwgbG5nLCBvcHRpb25zID0ge30pIHtcbiAgICBpZiAoIWZvcm1hdCkgcmV0dXJuIHZhbHVlO1xuICAgIGlmICh2YWx1ZSA9PSBudWxsKSByZXR1cm4gdmFsdWU7XG4gICAgY29uc3QgcmF3Rm9ybWF0cyA9IGZvcm1hdC5zcGxpdCh0aGlzLmZvcm1hdFNlcGFyYXRvcik7XG4gICAgY29uc3QgZm9ybWF0cyA9IFtdO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcmF3Rm9ybWF0cy5sZW5ndGg7IGkrKykge1xuICAgICAgbGV0IGYgPSByYXdGb3JtYXRzW2ldO1xuICAgICAgd2hpbGUgKGYuaW5kZXhPZignKCcpID4gLTEgJiYgIWYuaW5jbHVkZXMoJyknKSAmJiBpICsgMSA8IHJhd0Zvcm1hdHMubGVuZ3RoKSB7XG4gICAgICAgIGYgPSBgJHtmfSR7dGhpcy5mb3JtYXRTZXBhcmF0b3J9JHtyYXdGb3JtYXRzWysraV19YDtcbiAgICAgIH1cbiAgICAgIGZvcm1hdHMucHVzaChmKTtcbiAgICB9XG5cbiAgICBjb25zdCByZXN1bHQgPSBmb3JtYXRzLnJlZHVjZSgobWVtLCBmKSA9PiB7XG4gICAgICBjb25zdCB7IGZvcm1hdE5hbWUsIGZvcm1hdE9wdGlvbnMgfSA9IHBhcnNlRm9ybWF0U3RyKGYpO1xuXG4gICAgICBpZiAodGhpcy5mb3JtYXRzW2Zvcm1hdE5hbWVdKSB7XG4gICAgICAgIGxldCBmb3JtYXR0ZWQgPSBtZW07XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgLy8gb3B0aW9ucyBwYXNzZWQgZXhwbGljaXQgZm9yIHRoYXQgZm9ybWF0dGVkIHZhbHVlXG4gICAgICAgICAgY29uc3QgdmFsT3B0aW9ucyA9IG9wdGlvbnM/LmZvcm1hdFBhcmFtcz8uW29wdGlvbnMuaW50ZXJwb2xhdGlvbmtleV0gfHwge307XG5cbiAgICAgICAgICAvLyBsYW5ndWFnZVxuICAgICAgICAgIGNvbnN0IGwgPSB2YWxPcHRpb25zLmxvY2FsZSB8fCB2YWxPcHRpb25zLmxuZyB8fCBvcHRpb25zLmxvY2FsZSB8fCBvcHRpb25zLmxuZyB8fCBsbmc7XG5cbiAgICAgICAgICBmb3JtYXR0ZWQgPSB0aGlzLmZvcm1hdHNbZm9ybWF0TmFtZV0obWVtLCBsLCB7XG4gICAgICAgICAgICAuLi5mb3JtYXRPcHRpb25zLFxuICAgICAgICAgICAgLi4ub3B0aW9ucyxcbiAgICAgICAgICAgIC4uLnZhbE9wdGlvbnMsXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgdGhpcy5sb2dnZXIud2FybihlcnJvcik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZvcm1hdHRlZDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMubG9nZ2VyLndhcm4oYHRoZXJlIHdhcyBubyBmb3JtYXQgZnVuY3Rpb24gZm9yICR7Zm9ybWF0TmFtZX1gKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBtZW07XG4gICAgfSwgdmFsdWUpO1xuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBGb3JtYXR0ZXI7XG4iLCJpbXBvcnQgeyBwdXNoUGF0aCwgaXNTdHJpbmcsIGNhbGxiYWNrQXBpT2YgfSBmcm9tICcuL3V0aWxzLmpzJztcbmltcG9ydCBiYXNlTG9nZ2VyIGZyb20gJy4vbG9nZ2VyLmpzJztcbmltcG9ydCBFdmVudEVtaXR0ZXIgZnJvbSAnLi9FdmVudEVtaXR0ZXIuanMnO1xuXG5jb25zdCByZW1vdmVQZW5kaW5nID0gKHEsIG5hbWUpID0+IHtcbiAgaWYgKHEucGVuZGluZ1tuYW1lXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgZGVsZXRlIHEucGVuZGluZ1tuYW1lXTtcbiAgICBxLnBlbmRpbmdDb3VudC0tO1xuICB9XG59O1xuXG5jbGFzcyBDb25uZWN0b3IgZXh0ZW5kcyBFdmVudEVtaXR0ZXIge1xuICBjb25zdHJ1Y3RvcihiYWNrZW5kLCBzdG9yZSwgc2VydmljZXMsIG9wdGlvbnMgPSB7fSkge1xuICAgIHN1cGVyKCk7XG5cbiAgICB0aGlzLmJhY2tlbmQgPSBiYWNrZW5kO1xuICAgIHRoaXMuc3RvcmUgPSBzdG9yZTtcbiAgICB0aGlzLnNlcnZpY2VzID0gc2VydmljZXM7XG4gICAgdGhpcy5sYW5ndWFnZVV0aWxzID0gc2VydmljZXMubGFuZ3VhZ2VVdGlscztcbiAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuICAgIHRoaXMubG9nZ2VyID0gKHNlcnZpY2VzLmxvZ2dlciB8fCBiYXNlTG9nZ2VyKS5jcmVhdGUoJ2JhY2tlbmRDb25uZWN0b3InKTtcblxuICAgIHRoaXMud2FpdGluZ1JlYWRzID0gW107XG4gICAgdGhpcy5tYXhQYXJhbGxlbFJlYWRzID0gb3B0aW9ucy5tYXhQYXJhbGxlbFJlYWRzIHx8IDEwO1xuICAgIHRoaXMucmVhZGluZ0NhbGxzID0gMDtcblxuICAgIHRoaXMubWF4UmV0cmllcyA9IG9wdGlvbnMubWF4UmV0cmllcyA+PSAwID8gb3B0aW9ucy5tYXhSZXRyaWVzIDogNTtcbiAgICB0aGlzLnJldHJ5VGltZW91dCA9IG9wdGlvbnMucmV0cnlUaW1lb3V0ID49IDEgPyBvcHRpb25zLnJldHJ5VGltZW91dCA6IDM1MDtcblxuICAgIHRoaXMuc3RhdGUgPSB7fTtcbiAgICB0aGlzLnF1ZXVlID0gW107XG5cbiAgICB0aGlzLmJhY2tlbmQ/LmluaXQ/LihzZXJ2aWNlcywgb3B0aW9ucy5iYWNrZW5kLCBvcHRpb25zKTtcbiAgICB0aGlzLmNhbGxiYWNrQXBpID0gY2FsbGJhY2tBcGlPZih0aGlzLmJhY2tlbmQpO1xuICAgIGlmIChcbiAgICAgIHRoaXMuYmFja2VuZCAmJlxuICAgICAgdGhpcy5jYWxsYmFja0FwaSA9PT0gdW5kZWZpbmVkICYmXG4gICAgICAodGhpcy5iYWNrZW5kLnJlYWQgfHwgdGhpcy5iYWNrZW5kLmNyZWF0ZSlcbiAgICApIHtcbiAgICAgIHRoaXMubG9nZ2VyLmRlcHJlY2F0ZShcbiAgICAgICAgJ2JhY2tlbmQ6IHNldCBjYWxsYmFja0FwaSB0byBkZWNsYXJlIHRoZSBjYWxsaW5nIGNvbnZlbnRpb24gKHRydWU6IHJlYWQobGFuZ3VhZ2UsIG5hbWVzcGFjZSwgY2FsbGJhY2spIGFuZCBjcmVhdGUobGFuZ3VhZ2VzLCBuYW1lc3BhY2UsIGtleSwgZmFsbGJhY2tWYWx1ZSwgY2FsbGJhY2ssIG9wdGlvbnMpOyBmYWxzZTogYm90aCByZXR1cm4gYSBwcm9taXNlIG9yIGEgdmFsdWUpOyBndWVzc2luZyBpdCBmcm9tIHRoZSBudW1iZXIgb2YgcGFyYW1ldGVycyBpcyBkZXByZWNhdGVkJyxcbiAgICAgICk7XG4gICAgfVxuICB9XG5cbiAgcXVldWVMb2FkKGxhbmd1YWdlcywgbmFtZXNwYWNlcywgb3B0aW9ucywgY2FsbGJhY2spIHtcbiAgICAvLyBmaW5kIHdoYXQgbmVlZHMgdG8gYmUgbG9hZGVkXG4gICAgY29uc3QgdG9Mb2FkID0ge307XG4gICAgY29uc3QgcGVuZGluZyA9IHt9O1xuICAgIGNvbnN0IHRvTG9hZExhbmd1YWdlcyA9IHt9O1xuICAgIGNvbnN0IHRvTG9hZE5hbWVzcGFjZXMgPSB7fTtcblxuICAgIGxhbmd1YWdlcy5mb3JFYWNoKChsbmcpID0+IHtcbiAgICAgIGxldCBoYXNBbGxOYW1lc3BhY2VzID0gdHJ1ZTtcblxuICAgICAgbmFtZXNwYWNlcy5mb3JFYWNoKChucykgPT4ge1xuICAgICAgICBjb25zdCBuYW1lID0gYCR7bG5nfXwke25zfWA7XG5cbiAgICAgICAgaWYgKCFvcHRpb25zLnJlbG9hZCAmJiB0aGlzLnN0b3JlLmhhc1Jlc291cmNlQnVuZGxlKGxuZywgbnMpKSB7XG4gICAgICAgICAgdGhpcy5zdGF0ZVtuYW1lXSA9IDI7IC8vIGxvYWRlZFxuICAgICAgICB9IGVsc2UgaWYgKCFvcHRpb25zLnJlbG9hZCAmJiB0aGlzLnN0YXRlW25hbWVdIDwgMCkge1xuICAgICAgICAgIC8vIG5vdGhpbmcgdG8gZG8gZm9yIGVycjsgYSByZWxvYWQgdHJpZXMgYWdhaW5cbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLnN0YXRlW25hbWVdID09PSAxKSB7XG4gICAgICAgICAgaWYgKHBlbmRpbmdbbmFtZV0gPT09IHVuZGVmaW5lZCkgcGVuZGluZ1tuYW1lXSA9IHRydWU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5zdGF0ZVtuYW1lXSA9IDE7IC8vIHBlbmRpbmdcblxuICAgICAgICAgIGhhc0FsbE5hbWVzcGFjZXMgPSBmYWxzZTtcblxuICAgICAgICAgIGlmIChwZW5kaW5nW25hbWVdID09PSB1bmRlZmluZWQpIHBlbmRpbmdbbmFtZV0gPSB0cnVlO1xuICAgICAgICAgIGlmICh0b0xvYWRbbmFtZV0gPT09IHVuZGVmaW5lZCkgdG9Mb2FkW25hbWVdID0gdHJ1ZTtcbiAgICAgICAgICBpZiAodG9Mb2FkTmFtZXNwYWNlc1tuc10gPT09IHVuZGVmaW5lZCkgdG9Mb2FkTmFtZXNwYWNlc1tuc10gPSB0cnVlO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgaWYgKCFoYXNBbGxOYW1lc3BhY2VzKSB0b0xvYWRMYW5ndWFnZXNbbG5nXSA9IHRydWU7XG4gICAgfSk7XG5cbiAgICBpZiAoT2JqZWN0LmtleXModG9Mb2FkKS5sZW5ndGggfHwgT2JqZWN0LmtleXMocGVuZGluZykubGVuZ3RoKSB7XG4gICAgICB0aGlzLnF1ZXVlLnB1c2goe1xuICAgICAgICBwZW5kaW5nLFxuICAgICAgICBwZW5kaW5nQ291bnQ6IE9iamVjdC5rZXlzKHBlbmRpbmcpLmxlbmd0aCxcbiAgICAgICAgbG9hZGVkOiB7fSxcbiAgICAgICAgZXJyb3JzOiBbXSxcbiAgICAgICAgY2FsbGJhY2ssXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgdG9Mb2FkOiBPYmplY3Qua2V5cyh0b0xvYWQpLFxuICAgICAgcGVuZGluZzogT2JqZWN0LmtleXMocGVuZGluZyksXG4gICAgICB0b0xvYWRMYW5ndWFnZXM6IE9iamVjdC5rZXlzKHRvTG9hZExhbmd1YWdlcyksXG4gICAgICB0b0xvYWROYW1lc3BhY2VzOiBPYmplY3Qua2V5cyh0b0xvYWROYW1lc3BhY2VzKSxcbiAgICB9O1xuICB9XG5cbiAgbG9hZGVkKG5hbWUsIGVyciwgZGF0YSkge1xuICAgIGNvbnN0IHMgPSBuYW1lLnNwbGl0KCd8Jyk7XG4gICAgY29uc3QgbG5nID0gc1swXTtcbiAgICBjb25zdCBucyA9IHNbMV07XG5cbiAgICBpZiAoZXJyKSB0aGlzLmVtaXQoJ2ZhaWxlZExvYWRpbmcnLCBsbmcsIG5zLCBlcnIpO1xuXG4gICAgaWYgKCFlcnIgJiYgZGF0YSkge1xuICAgICAgdGhpcy5zdG9yZS5hZGRSZXNvdXJjZUJ1bmRsZShsbmcsIG5zLCBkYXRhLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgeyBza2lwQ29weTogdHJ1ZSB9KTtcbiAgICB9XG5cbiAgICAvLyBzZXQgbG9hZGVkXG4gICAgdGhpcy5zdGF0ZVtuYW1lXSA9IGVyciA/IC0xIDogMjtcbiAgICBpZiAoZXJyICYmIGRhdGEpIHRoaXMuc3RhdGVbbmFtZV0gPSAwO1xuXG4gICAgLy8gY29uc29saWRhdGVkIGxvYWRpbmcgZG9uZSBpbiB0aGlzIHJ1biAtIG9ubHkgZW1pdCBvbmNlIGZvciBhIGxvYWRlZCBuYW1lc3BhY2VcbiAgICBjb25zdCBsb2FkZWQgPSB7fTtcblxuICAgIC8vIGNhbGxiYWNrIGlmIHJlYWR5XG4gICAgdGhpcy5xdWV1ZS5mb3JFYWNoKChxKSA9PiB7XG4gICAgICBwdXNoUGF0aChxLmxvYWRlZCwgW2xuZ10sIG5zKTtcbiAgICAgIHJlbW92ZVBlbmRpbmcocSwgbmFtZSk7XG5cbiAgICAgIGlmIChlcnIpIHEuZXJyb3JzLnB1c2goZXJyKTtcblxuICAgICAgaWYgKHEucGVuZGluZ0NvdW50ID09PSAwICYmICFxLmRvbmUpIHtcbiAgICAgICAgLy8gb25seSBkbyBvbmNlIHBlciBsb2FkZWQgLT4gdGhpcy5lbWl0KCdsb2FkZWQnLCBxLmxvYWRlZCk7XG4gICAgICAgIE9iamVjdC5rZXlzKHEubG9hZGVkKS5mb3JFYWNoKChsKSA9PiB7XG4gICAgICAgICAgaWYgKCFsb2FkZWRbbF0pIGxvYWRlZFtsXSA9IHt9O1xuICAgICAgICAgIGNvbnN0IGxvYWRlZEtleXMgPSBxLmxvYWRlZFtsXTtcbiAgICAgICAgICBpZiAobG9hZGVkS2V5cy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGxvYWRlZEtleXMuZm9yRWFjaCgobikgPT4ge1xuICAgICAgICAgICAgICBpZiAobG9hZGVkW2xdW25dID09PSB1bmRlZmluZWQpIGxvYWRlZFtsXVtuXSA9IHRydWU7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHEuZG9uZSA9IHRydWU7XG4gICAgICAgIGlmIChxLmVycm9ycy5sZW5ndGgpIHtcbiAgICAgICAgICBxLmNhbGxiYWNrKHEuZXJyb3JzKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBxLmNhbGxiYWNrKCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIGVtaXQgY29uc29saWRhdGVkIGxvYWRlZCBldmVudFxuICAgIHRoaXMuZW1pdCgnbG9hZGVkJywgbG9hZGVkKTtcblxuICAgIC8vIHJlbW92ZSBkb25lIGxvYWQgcmVxdWVzdHNcbiAgICB0aGlzLnF1ZXVlID0gdGhpcy5xdWV1ZS5maWx0ZXIoKHEpID0+ICFxLmRvbmUpO1xuICB9XG5cbiAgcmVhZChsbmcsIG5zLCBmY05hbWUsIHRyaWVkID0gMCwgd2FpdCA9IHRoaXMucmV0cnlUaW1lb3V0LCBjYWxsYmFjaykge1xuICAgIGlmICghbG5nLmxlbmd0aCkgcmV0dXJuIGNhbGxiYWNrKG51bGwsIHt9KTsgLy8gbm90aW5nIHRvIGxvYWRcblxuICAgIC8vIExpbWl0IHBhcmFsbGVsaXNtIG9mIGNhbGxzIHRvIGJhY2tlbmRcbiAgICAvLyBUaGlzIGlzIG5lZWRlZCB0byBwcmV2ZW50IHRyeWluZyB0byBvcGVuIHRob3VzYW5kcyBvZlxuICAgIC8vIHNvY2tldHMgb3IgZmlsZSBkZXNjcmlwdG9ycywgd2hpY2ggY2FuIGNhdXNlIGZhaWx1cmVzXG4gICAgLy8gYW5kIGFjdHVhbGx5IG1ha2UgdGhlIGVudGlyZSBwcm9jZXNzIHRha2UgbG9uZ2VyLlxuICAgIGlmICh0aGlzLnJlYWRpbmdDYWxscyA+PSB0aGlzLm1heFBhcmFsbGVsUmVhZHMpIHtcbiAgICAgIHRoaXMud2FpdGluZ1JlYWRzLnB1c2goeyBsbmcsIG5zLCBmY05hbWUsIHRyaWVkLCB3YWl0LCBjYWxsYmFjayB9KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5yZWFkaW5nQ2FsbHMrKztcblxuICAgIGNvbnN0IHJlc29sdmVyID0gKGVyciwgZGF0YSkgPT4ge1xuICAgICAgdGhpcy5yZWFkaW5nQ2FsbHMtLTtcbiAgICAgIGlmICh0aGlzLndhaXRpbmdSZWFkcy5sZW5ndGggPiAwKSB7XG4gICAgICAgIGNvbnN0IG5leHQgPSB0aGlzLndhaXRpbmdSZWFkcy5zaGlmdCgpO1xuICAgICAgICB0aGlzLnJlYWQobmV4dC5sbmcsIG5leHQubnMsIG5leHQuZmNOYW1lLCBuZXh0LnRyaWVkLCBuZXh0LndhaXQsIG5leHQuY2FsbGJhY2spO1xuICAgICAgfVxuICAgICAgaWYgKGVyciAmJiBkYXRhIC8qID0gcmV0cnlGbGFnICovICYmIHRyaWVkIDwgdGhpcy5tYXhSZXRyaWVzKSB7XG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgIHRoaXMucmVhZChsbmcsIG5zLCBmY05hbWUsIHRyaWVkICsgMSwgd2FpdCAqIDIsIGNhbGxiYWNrKTtcbiAgICAgICAgfSwgd2FpdCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGNhbGxiYWNrKGVyciwgZGF0YSk7XG4gICAgfTtcblxuICAgIGNvbnN0IGZjID0gdGhpcy5iYWNrZW5kW2ZjTmFtZV0uYmluZCh0aGlzLmJhY2tlbmQpO1xuICAgIGlmICh0aGlzLmNhbGxiYWNrQXBpID09PSBmYWxzZSB8fCAodGhpcy5jYWxsYmFja0FwaSA9PT0gdW5kZWZpbmVkICYmIGZjLmxlbmd0aCA9PT0gMikpIHtcbiAgICAgIC8vIG5vIGNhbGxiYWNrXG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCByID0gZmMobG5nLCBucyk7XG4gICAgICAgIGlmIChyICYmIHR5cGVvZiByLnRoZW4gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAvLyBwcm9taXNlXG4gICAgICAgICAgci50aGVuKChkYXRhKSA9PiByZXNvbHZlcihudWxsLCBkYXRhKSkuY2F0Y2gocmVzb2x2ZXIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIHN5bmNcbiAgICAgICAgICByZXNvbHZlcihudWxsLCByKTtcbiAgICAgICAgfVxuICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgIHJlc29sdmVyKGVycik7XG4gICAgICB9XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gbm9ybWFsIHdpdGggY2FsbGJhY2tcbiAgICByZXR1cm4gZmMobG5nLCBucywgcmVzb2x2ZXIpO1xuICB9XG5cbiAgcHJlcGFyZUxvYWRpbmcobGFuZ3VhZ2VzLCBuYW1lc3BhY2VzLCBvcHRpb25zID0ge30sIGNhbGxiYWNrKSB7XG4gICAgaWYgKCF0aGlzLmJhY2tlbmQpIHtcbiAgICAgIHRoaXMubG9nZ2VyLndhcm4oJ05vIGJhY2tlbmQgd2FzIGFkZGVkIHZpYSBpMThuZXh0LnVzZS4gV2lsbCBub3QgbG9hZCByZXNvdXJjZXMuJyk7XG4gICAgICByZXR1cm4gY2FsbGJhY2sgJiYgY2FsbGJhY2soKTtcbiAgICB9XG5cbiAgICBpZiAoaXNTdHJpbmcobGFuZ3VhZ2VzKSkgbGFuZ3VhZ2VzID0gdGhpcy5sYW5ndWFnZVV0aWxzLnRvUmVzb2x2ZUhpZXJhcmNoeShsYW5ndWFnZXMpO1xuICAgIGlmIChpc1N0cmluZyhuYW1lc3BhY2VzKSkgbmFtZXNwYWNlcyA9IFtuYW1lc3BhY2VzXTtcblxuICAgIGNvbnN0IHRvTG9hZCA9IHRoaXMucXVldWVMb2FkKGxhbmd1YWdlcywgbmFtZXNwYWNlcywgb3B0aW9ucywgY2FsbGJhY2spO1xuICAgIGlmICghdG9Mb2FkLnRvTG9hZC5sZW5ndGgpIHtcbiAgICAgIGlmICghdG9Mb2FkLnBlbmRpbmcubGVuZ3RoKSBjYWxsYmFjaygpOyAvLyBub3RoaW5nIHRvIGxvYWQgYW5kIG5vIHBlbmRpbmdzLi4uY2FsbGJhY2sgbm93XG4gICAgICByZXR1cm4gbnVsbDsgLy8gcGVuZGluZ3Mgd2lsbCB0cmlnZ2VyIGNhbGxiYWNrXG4gICAgfVxuXG4gICAgdG9Mb2FkLnRvTG9hZC5mb3JFYWNoKChuYW1lKSA9PiB7XG4gICAgICB0aGlzLmxvYWRPbmUobmFtZSk7XG4gICAgfSk7XG4gIH1cblxuICBsb2FkKGxhbmd1YWdlcywgbmFtZXNwYWNlcywgY2FsbGJhY2spIHtcbiAgICB0aGlzLnByZXBhcmVMb2FkaW5nKGxhbmd1YWdlcywgbmFtZXNwYWNlcywge30sIGNhbGxiYWNrKTtcbiAgfVxuXG4gIHJlbG9hZChsYW5ndWFnZXMsIG5hbWVzcGFjZXMsIGNhbGxiYWNrKSB7XG4gICAgdGhpcy5wcmVwYXJlTG9hZGluZyhsYW5ndWFnZXMsIG5hbWVzcGFjZXMsIHsgcmVsb2FkOiB0cnVlIH0sIGNhbGxiYWNrKTtcbiAgfVxuXG4gIGxvYWRPbmUobmFtZSwgcHJlZml4ID0gJycpIHtcbiAgICBjb25zdCBzID0gbmFtZS5zcGxpdCgnfCcpO1xuICAgIGNvbnN0IGxuZyA9IHNbMF07XG4gICAgY29uc3QgbnMgPSBzWzFdO1xuXG4gICAgdGhpcy5yZWFkKGxuZywgbnMsICdyZWFkJywgdW5kZWZpbmVkLCB1bmRlZmluZWQsIChlcnIsIGRhdGEpID0+IHtcbiAgICAgIGlmIChlcnIpIHRoaXMubG9nZ2VyLndhcm4oYCR7cHJlZml4fWxvYWRpbmcgbmFtZXNwYWNlICR7bnN9IGZvciBsYW5ndWFnZSAke2xuZ30gZmFpbGVkYCwgZXJyKTtcbiAgICAgIGlmICghZXJyICYmIGRhdGEpXG4gICAgICAgIHRoaXMubG9nZ2VyLmxvZyhgJHtwcmVmaXh9bG9hZGVkIG5hbWVzcGFjZSAke25zfSBmb3IgbGFuZ3VhZ2UgJHtsbmd9YCwgZGF0YSk7XG5cbiAgICAgIHRoaXMubG9hZGVkKG5hbWUsIGVyciwgZGF0YSk7XG4gICAgfSk7XG4gIH1cblxuICAvLyBoYXNMb2FkZWROYW1lc3BhY2U6IHRoZSBjaGVjayBvZiB0aGUgY2FsbGluZyBpbnN0YW5jZTsgdGhlIGNvbm5lY3RvciAoYW5kIGl0cyBzZXJ2aWNlcykgaXMgc2hhcmVkIHdpdGggYWxsIGNsb25lcyxcbiAgLy8gc28gYSBkaXJlY3QgY2FsbCB3aXRob3V0IGl0IGNoZWNrcyB0aGUgbmV3ZXN0IGNsb25lLCBvciB0aGUgaW5zdGFuY2UgdGhhdCBjcmVhdGVkIHRoZSBjb25uZWN0b3JcbiAgc2F2ZU1pc3NpbmcoXG4gICAgbGFuZ3VhZ2VzLFxuICAgIG5hbWVzcGFjZSxcbiAgICBrZXksXG4gICAgZmFsbGJhY2tWYWx1ZSxcbiAgICBpc1VwZGF0ZSxcbiAgICBvcHRpb25zID0ge30sXG4gICAgY2xiID0gKCkgPT4ge30sXG4gICAgaGFzTG9hZGVkTmFtZXNwYWNlID0gdGhpcy5uZXdlc3RDbG9uZUhhc0xvYWRlZE5hbWVzcGFjZSB8fFxuICAgICAgdGhpcy5zZXJ2aWNlcz8udXRpbHM/Lmhhc0xvYWRlZE5hbWVzcGFjZSxcbiAgKSB7XG4gICAgaWYgKGhhc0xvYWRlZE5hbWVzcGFjZSAmJiAhaGFzTG9hZGVkTmFtZXNwYWNlKG5hbWVzcGFjZSkpIHtcbiAgICAgIHRoaXMubG9nZ2VyLndhcm4oXG4gICAgICAgIGBkaWQgbm90IHNhdmUga2V5IFwiJHtrZXl9XCIgYXMgdGhlIG5hbWVzcGFjZSBcIiR7bmFtZXNwYWNlfVwiIHdhcyBub3QgeWV0IGxvYWRlZGAsXG4gICAgICAgICdUaGlzIG1lYW5zIHNvbWV0aGluZyBJUyBXUk9ORyBpbiB5b3VyIHNldHVwLiBZb3UgYWNjZXNzIHRoZSB0IGZ1bmN0aW9uIGJlZm9yZSBpMThuZXh0LmluaXQgLyBpMThuZXh0LmxvYWROYW1lc3BhY2UgLyBpMThuZXh0LmNoYW5nZUxhbmd1YWdlIHdhcyBkb25lLiBXYWl0IGZvciB0aGUgY2FsbGJhY2sgb3IgUHJvbWlzZSB0byByZXNvbHZlIGJlZm9yZSBhY2Nlc3NpbmcgaXQhISEnLFxuICAgICAgKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBpZ25vcmUgbm9uIHZhbGlkIGtleXNcbiAgICBpZiAoa2V5ID09PSB1bmRlZmluZWQgfHwga2V5ID09PSBudWxsIHx8IGtleSA9PT0gJycpIHJldHVybjtcblxuICAgIGlmICh0aGlzLmJhY2tlbmQ/LmNyZWF0ZSkge1xuICAgICAgY29uc3Qgb3B0cyA9IHtcbiAgICAgICAgLi4ub3B0aW9ucyxcbiAgICAgICAgaXNVcGRhdGUsXG4gICAgICB9O1xuICAgICAgY29uc3QgZmMgPSB0aGlzLmJhY2tlbmQuY3JlYXRlLmJpbmQodGhpcy5iYWNrZW5kKTtcbiAgICAgIGlmICh0aGlzLmNhbGxiYWNrQXBpID09PSBmYWxzZSB8fCAodGhpcy5jYWxsYmFja0FwaSA9PT0gdW5kZWZpbmVkICYmIGZjLmxlbmd0aCA8IDYpKSB7XG4gICAgICAgIC8vIG5vIGNhbGxiYWNrXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgbGV0IHI7XG4gICAgICAgICAgaWYgKHRoaXMuY2FsbGJhY2tBcGkgPT09IGZhbHNlIHx8IGZjLmxlbmd0aCA9PT0gNSkge1xuICAgICAgICAgICAgLy8gZnV0dXJlIGNhbGxiYWNrLWxlc3MgYXBpIGZvciBpMThuZXh0LWxvY2l6ZS1iYWNrZW5kXG4gICAgICAgICAgICByID0gZmMobGFuZ3VhZ2VzLCBuYW1lc3BhY2UsIGtleSwgZmFsbGJhY2tWYWx1ZSwgb3B0cyk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHIgPSBmYyhsYW5ndWFnZXMsIG5hbWVzcGFjZSwga2V5LCBmYWxsYmFja1ZhbHVlKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHIgJiYgdHlwZW9mIHIudGhlbiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgLy8gcHJvbWlzZVxuICAgICAgICAgICAgci50aGVuKChkYXRhKSA9PiBjbGIobnVsbCwgZGF0YSkpLmNhdGNoKGNsYik7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIHN5bmNcbiAgICAgICAgICAgIGNsYihudWxsLCByKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgIGNsYihlcnIpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBub3JtYWwgd2l0aCBjYWxsYmFja1xuICAgICAgICBmYyhsYW5ndWFnZXMsIG5hbWVzcGFjZSwga2V5LCBmYWxsYmFja1ZhbHVlLCBjbGIgLyogdW51c2VkIGNhbGxiYWNrICovLCBvcHRzKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyB3cml0ZSB0byBzdG9yZSB0byBhdm9pZCByZXNlbmRpbmdcbiAgICBpZiAoIWxhbmd1YWdlcyB8fCAhbGFuZ3VhZ2VzWzBdKSByZXR1cm47XG4gICAgdGhpcy5zdG9yZS5hZGRSZXNvdXJjZShsYW5ndWFnZXNbMF0sIG5hbWVzcGFjZSwga2V5LCBmYWxsYmFja1ZhbHVlKTtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBDb25uZWN0b3I7XG4iLCJpbXBvcnQgeyBpc1N0cmluZyB9IGZyb20gJy4vdXRpbHMuanMnO1xuXG5leHBvcnQgY29uc3QgZ2V0ID0gKCkgPT4gKHtcbiAgZGVidWc6IGZhbHNlLFxuICBpbml0QXN5bmM6IHRydWUsXG5cbiAgbnM6IFsndHJhbnNsYXRpb24nXSxcbiAgZGVmYXVsdE5TOiBbJ3RyYW5zbGF0aW9uJ10sXG4gIGZhbGxiYWNrTG5nOiBmYWxzZSwgLy8gc3RyaW5nLCBhcnJheSwgb2JqZWN0IG9yIGZ1bmN0aW9uOyAnZGV2JyBvbmx5IHdoZW4gc2V0XG4gIGZhbGxiYWNrTlM6IGZhbHNlLCAvLyBzdHJpbmcgb3IgYXJyYXkgb2YgbmFtZXNwYWNlc1xuXG4gIHN1cHBvcnRlZExuZ3M6IGZhbHNlLCAvLyBhcnJheSB3aXRoIHN1cHBvcnRlZCBsYW5ndWFnZXNcbiAgbm9uRXhwbGljaXRTdXBwb3J0ZWRMbmdzOiBmYWxzZSxcbiAgbG9hZDogJ2FsbCcsIC8vIHwgY3VycmVudE9ubHkgfCBsYW5ndWFnZU9ubHlcbiAgcHJlbG9hZDogZmFsc2UsIC8vIGFycmF5IHdpdGggcHJlbG9hZCBsYW5ndWFnZXNcblxuICBrZXlTZXBhcmF0b3I6ICcuJyxcbiAgbnNTZXBhcmF0b3I6ICc6JyxcbiAgcGx1cmFsU2VwYXJhdG9yOiAnXycsXG4gIGNvbnRleHRTZXBhcmF0b3I6ICdfJyxcblxuICAvLyBTZWxlY3RvciBBUEkgcnVudGltZSBtb2RlLiBNaXJyb3JzIHRoZSBUeXBlT3B0aW9ucyBgZW5hYmxlU2VsZWN0b3JgIGZsYWcuXG4gIC8vIC0gZmFsc2UgLyB0cnVlIC8gJ29wdGltaXplJzogbGVnYWN5IHJ1bGUg4oCUIG9ubHkgYSBsZWFkaW5nICpzZWNvbmRhcnkqIG5hbWVzcGFjZVxuICAvLyAgIGluIGEgbXVsdGktZWxlbWVudCBucyBhcnJheSBpcyByZXdyaXR0ZW4gYXMgYSBuYW1lc3BhY2UgcHJlZml4ICh2MjUuOC4xOSlcbiAgLy8gLSAnc3RyaWN0JzogYWx3YXlzIHRyZWF0IHBhdGhbMF0gYXMgYSBuYW1lc3BhY2UgcHJlZml4IHdoZW4gaXQgbWF0Y2hlcyB0aGVcbiAgLy8gICBzY29wZSdzIG5hbWVzcGFjZSBsaXN0LCBpbmNsdWRpbmcgdGhlIHByaW1hcnkgYW5kIHNpbmdsZS1ucyBob29rcy5cbiAgLy8gICBQYWlycyB3aXRoIGBOc1Jlc291cmNlYCBkcm9wcGluZyBpdHMgZmxhdHRlbmVkLXByaW1hcnkgdW5pb24gYXQgdGhlIHR5cGVcbiAgLy8gICBsZXZlbC4gT3B0LWluOyBkZWZhdWx0IGJlaGF2aW9yIGlzIHVuY2hhbmdlZC5cbiAgZW5hYmxlU2VsZWN0b3I6IGZhbHNlLFxuXG4gIHBhcnRpYWxCdW5kbGVkTGFuZ3VhZ2VzOiBmYWxzZSwgLy8gYWxsb3cgYnVuZGxpbmcgY2VydGFpbiBsYW5ndWFnZXMgdGhhdCBhcmUgbm90IHJlbW90ZWx5IGZldGNoZWRcbiAgc2F2ZU1pc3Npbmc6IGZhbHNlLCAvLyBlbmFibGUgdG8gc2VuZCBtaXNzaW5nIHZhbHVlc1xuICB1cGRhdGVNaXNzaW5nOiBmYWxzZSwgLy8gZW5hYmxlIHRvIHVwZGF0ZSBkZWZhdWx0IHZhbHVlcyBpZiBkaWZmZXJlbnQgZnJvbSB0cmFuc2xhdGVkIHZhbHVlIChvbmx5IHVzZWZ1bCBvbiBpbml0aWFsIGRldmVsb3BtZW50LCBvciB3aGVuIGtlZXBpbmcgY29kZSBhcyBzb3VyY2Ugb2YgdHJ1dGgpXG4gIHNhdmVNaXNzaW5nVG86ICdmYWxsYmFjaycsIC8vICdjdXJyZW50JyB8fCAnYWxsJ1xuICBzYXZlTWlzc2luZ1BsdXJhbHM6IHRydWUsIC8vIHdpbGwgc2F2ZSBhbGwgZm9ybXMgbm90IG9ubHkgc2luZ3VsYXIga2V5XG4gIG1pc3NpbmdLZXlIYW5kbGVyOiBmYWxzZSwgLy8gZnVuY3Rpb24obG5nLCBucywga2V5LCBmYWxsYmFja1ZhbHVlKSAtPiBvdmVycmlkZSBpZiBwcmVmZXIgb24gaGFuZGxpbmdcbiAgbWlzc2luZ0ludGVycG9sYXRpb25IYW5kbGVyOiBmYWxzZSwgLy8gZnVuY3Rpb24oc3RyLCBtYXRjaClcblxuICBwb3N0UHJvY2VzczogZmFsc2UsIC8vIHN0cmluZyBvciBhcnJheSBvZiBwb3N0UHJvY2Vzc29yIG5hbWVzXG4gIHBvc3RQcm9jZXNzUGFzc1Jlc29sdmVkOiBmYWxzZSwgLy8gcGFzcyByZXNvbHZlZCBvYmplY3QgaW50byAnb3B0aW9ucy5pMThuUmVzb2x2ZWQnIGZvciBwb3N0cHJvY2Vzc29yXG4gIHJldHVybk51bGw6IGZhbHNlLCAvLyBhbGxvd3MgbnVsbCB2YWx1ZSBhcyB2YWxpZCB0cmFuc2xhdGlvblxuICByZXR1cm5FbXB0eVN0cmluZzogZmFsc2UsIC8vIGFuIGVtcHR5IHN0cmluZyBmYWxscyBiYWNrIGxpa2UgYSBtaXNzaW5nIHZhbHVlXG4gIHJldHVybk9iamVjdHM6IGZhbHNlLFxuICBqb2luQXJyYXlzOiBmYWxzZSwgLy8gb3Igc3RyaW5nIHRvIGpvaW4gYXJyYXlcbiAgcmV0dXJuZWRPYmplY3RIYW5kbGVyOiBmYWxzZSwgLy8gZnVuY3Rpb24oa2V5LCB2YWx1ZSwgb3B0aW9ucykgdHJpZ2dlcmVkIGlmIGtleSByZXR1cm5zIG9iamVjdCBidXQgcmV0dXJuT2JqZWN0cyBpcyBzZXQgdG8gZmFsc2VcbiAgcGFyc2VNaXNzaW5nS2V5SGFuZGxlcjogZmFsc2UsIC8vIGZ1bmN0aW9uKGtleSkgcGFyc2VkIGEga2V5IHRoYXQgd2FzIG5vdCBmb3VuZCBpbiB0KCkgYmVmb3JlIHJldHVybmluZ1xuICBhcHBlbmROYW1lc3BhY2VUb01pc3NpbmdLZXk6IGZhbHNlLFxuICBhcHBlbmROYW1lc3BhY2VUb0NJTW9kZTogZmFsc2UsXG4gIG92ZXJsb2FkVHJhbnNsYXRpb25PcHRpb25IYW5kbGVyOiAoYXJncykgPT4ge1xuICAgIGxldCByZXQgPSB7fTtcbiAgICBpZiAodHlwZW9mIGFyZ3NbMV0gPT09ICdvYmplY3QnKSByZXQgPSBhcmdzWzFdO1xuICAgIGlmIChpc1N0cmluZyhhcmdzWzFdKSkgcmV0LmRlZmF1bHRWYWx1ZSA9IGFyZ3NbMV07XG4gICAgaWYgKGlzU3RyaW5nKGFyZ3NbMl0pKSByZXQudERlc2NyaXB0aW9uID0gYXJnc1syXTtcbiAgICBpZiAodHlwZW9mIGFyZ3NbMl0gPT09ICdvYmplY3QnIHx8IHR5cGVvZiBhcmdzWzNdID09PSAnb2JqZWN0Jykge1xuICAgICAgY29uc3Qgb3B0aW9ucyA9IGFyZ3NbM10gfHwgYXJnc1syXTtcbiAgICAgIE9iamVjdC5rZXlzKG9wdGlvbnMpLmZvckVhY2goKGtleSkgPT4ge1xuICAgICAgICByZXRba2V5XSA9IG9wdGlvbnNba2V5XTtcbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gcmV0O1xuICB9LFxuICBpbnRlcnBvbGF0aW9uOiB7XG4gICAgZXNjYXBlVmFsdWU6IHRydWUsXG4gICAgcHJlZml4OiAne3snLFxuICAgIHN1ZmZpeDogJ319JyxcbiAgICBmb3JtYXRTZXBhcmF0b3I6ICcsJyxcbiAgICAvLyB1bmVzY2FwZVN1ZmZpeDogJycsXG4gICAgdW5lc2NhcGVQcmVmaXg6ICctJyxcblxuICAgIG5lc3RpbmdQcmVmaXg6ICckdCgnLFxuICAgIG5lc3RpbmdTdWZmaXg6ICcpJyxcbiAgICBuZXN0aW5nT3B0aW9uc1NlcGFyYXRvcjogJywnLFxuICAgIC8vIGRlZmF1bHRWYXJpYWJsZXM6IHVuZGVmaW5lZCAvLyBvYmplY3QgdGhhdCBjYW4gaGF2ZSB2YWx1ZXMgdG8gaW50ZXJwb2xhdGUgb24gLSBleHRlbmRzIHBhc3NlZCBpbiBpbnRlcnBvbGF0aW9uIGRhdGFcbiAgICBtYXhSZXBsYWNlczogMTAwMCwgLy8gbWF4IHJlcGxhY2VzIHRvIHByZXZlbnQgZW5kbGVzcyBsb29wXG4gICAgc2tpcE9uVmFyaWFibGVzOiB0cnVlLFxuICB9LFxuICBjYWNoZUluQnVpbHRGb3JtYXRzOiB0cnVlLFxufSk7XG5cbmV4cG9ydCBjb25zdCB0cmFuc2Zvcm1PcHRpb25zID0gKG9wdGlvbnMpID0+IHtcbiAgLy8gY3JlYXRlIG5hbWVzcGFjZSBvYmplY3QgaWYgbmFtZXNwYWNlIGlzIHBhc3NlZCBpbiBhcyBzdHJpbmdcbiAgaWYgKGlzU3RyaW5nKG9wdGlvbnMubnMpKSBvcHRpb25zLm5zID0gW29wdGlvbnMubnNdO1xuICBpZiAoaXNTdHJpbmcob3B0aW9ucy5mYWxsYmFja0xuZykpIG9wdGlvbnMuZmFsbGJhY2tMbmcgPSBbb3B0aW9ucy5mYWxsYmFja0xuZ107XG4gIGlmIChpc1N0cmluZyhvcHRpb25zLmZhbGxiYWNrTlMpKSBvcHRpb25zLmZhbGxiYWNrTlMgPSBbb3B0aW9ucy5mYWxsYmFja05TXTtcblxuICAvLyBleHRlbmQgc3VwcG9ydGVkTG5ncyB3aXRoIGNpbW9kZVxuICBpZiAob3B0aW9ucy5zdXBwb3J0ZWRMbmdzICYmICFvcHRpb25zLnN1cHBvcnRlZExuZ3MuaW5jbHVkZXMoJ2NpbW9kZScpKSB7XG4gICAgb3B0aW9ucy5zdXBwb3J0ZWRMbmdzID0gb3B0aW9ucy5zdXBwb3J0ZWRMbmdzLmNvbmNhdChbJ2NpbW9kZSddKTtcbiAgfVxuXG4gIHJldHVybiBvcHRpb25zO1xufTtcbiIsImltcG9ydCB7IExvZ2dlciB9IGZyb20gJy4vbG9nZ2VyLmpzJztcbmltcG9ydCBFdmVudEVtaXR0ZXIgZnJvbSAnLi9FdmVudEVtaXR0ZXIuanMnO1xuaW1wb3J0IFJlc291cmNlU3RvcmUgZnJvbSAnLi9SZXNvdXJjZVN0b3JlLmpzJztcbmltcG9ydCBUcmFuc2xhdG9yIGZyb20gJy4vVHJhbnNsYXRvci5qcyc7XG5pbXBvcnQgTGFuZ3VhZ2VVdGlscyBmcm9tICcuL0xhbmd1YWdlVXRpbHMuanMnO1xuaW1wb3J0IFBsdXJhbFJlc29sdmVyIGZyb20gJy4vUGx1cmFsUmVzb2x2ZXIuanMnO1xuaW1wb3J0IEludGVycG9sYXRvciBmcm9tICcuL0ludGVycG9sYXRvci5qcyc7XG5pbXBvcnQgRm9ybWF0dGVyIGZyb20gJy4vRm9ybWF0dGVyLmpzJztcbmltcG9ydCBCYWNrZW5kQ29ubmVjdG9yIGZyb20gJy4vQmFja2VuZENvbm5lY3Rvci5qcyc7XG5pbXBvcnQgeyBnZXQgYXMgZ2V0RGVmYXVsdHMsIHRyYW5zZm9ybU9wdGlvbnMgfSBmcm9tICcuL2RlZmF1bHRzLmpzJztcbmltcG9ydCB7IGRlZmVyLCBpc1N0cmluZywgY2FsbGJhY2tBcGlPZiwgaXNTYWZlTGFuZ3VhZ2VDb2RlIH0gZnJvbSAnLi91dGlscy5qcyc7XG5pbXBvcnQga2V5c0Zyb21TZWxlY3RvciBmcm9tICcuL3NlbGVjdG9yLmpzJztcblxuY29uc3Qgbm9vcCA9ICgpID0+IHt9XG5cbi8vIGRlZmF1bHRzIHVuZGVyIHRoZSBnaXZlbiBvcHRpb25zLCB3aXRoIHRoZSBpbnRlcnBvbGF0aW9uIG9wdGlvbnMgbWVyZ2VkIG9uZSBsZXZlbCBkZWVwXG5jb25zdCB3aXRoRGVmYXVsdHMgPSAob3B0aW9ucykgPT4ge1xuICBjb25zdCBkZWZPcHRzID0gZ2V0RGVmYXVsdHMoKTtcbiAgY29uc3QgbWVyZ2VkID0geyAuLi5kZWZPcHRzLCAuLi5vcHRpb25zIH07XG4gIG1lcmdlZC5pbnRlcnBvbGF0aW9uID0geyAuLi5kZWZPcHRzLmludGVycG9sYXRpb24sIC4uLm9wdGlvbnMuaW50ZXJwb2xhdGlvbiB9OyAvLyBkbyBub3QgdXNlIHJlZmVyZW5jZVxuICBpZiAodHlwZW9mIG1lcmdlZC5vdmVybG9hZFRyYW5zbGF0aW9uT3B0aW9uSGFuZGxlciAhPT0gJ2Z1bmN0aW9uJykge1xuICAgIG1lcmdlZC5vdmVybG9hZFRyYW5zbGF0aW9uT3B0aW9uSGFuZGxlciA9IGRlZk9wdHMub3ZlcmxvYWRUcmFuc2xhdGlvbk9wdGlvbkhhbmRsZXI7XG4gIH1cbiAgcmV0dXJuIG1lcmdlZDtcbn07XG5cbi8vIFRoZSBsYW5ndWFnZSBjb2RlcyB0aGUgdXNlciBjb25maWd1cmVkIGF0IGluaXQoKSAoc3VwcG9ydGVkTG5ncywgYSBmYWxsYmFja0xuZyB0aGF0IGlzIG5vdCBhIGZ1bmN0aW9uLFxuLy8gcHJlbG9hZCwgdGhlIGxhbmd1YWdlcyBpbiByZXNvdXJjZXMpOiBjaGFuZ2VMYW5ndWFnZSgpIGFuZCBsb2FkTGFuZ3VhZ2VzKCkgdGFrZSB0aGVtIHdoYXRldmVyIHRoZWlyIHNoYXBlLlxuLy8gVGFrZW4gZnJvbSB0aGUgb3B0aW9ucyBhcyBwYXNzZWQsIHNvIG5laXRoZXIgbG9hZExhbmd1YWdlcygpIChpdCBleHRlbmRzIHByZWxvYWQpIG5vciBhZGRlZCByZXNvdXJjZXMsIG5vclxuLy8gYSBmYWxsYmFja0xuZyBmdW5jdGlvbiB0aGF0IHJldHVybnMgdGhlIGNvZGUgaXQgZ2V0cywgY2FuIG1ha2UgYW4gb3V0c2lkZSBjb2RlIGNvdW50IGFzIGNvbmZpZ3VyZWQuXG5jb25zdCBjb25maWd1cmVkTGFuZ3VhZ2VDb2RlcyA9IChvcHRpb25zKSA9PiB7XG4gIGNvbnN0IGNvZGVzID0gW10uY29uY2F0KG9wdGlvbnMuc3VwcG9ydGVkTG5ncyB8fCBbXSwgb3B0aW9ucy5wcmVsb2FkIHx8IFtdKTtcbiAgY29kZXMucHVzaCguLi5PYmplY3Qua2V5cyhvcHRpb25zLnJlc291cmNlcyB8fCB7fSkpO1xuICBjb25zdCBmYWxsYmFja0xuZyA9IG9wdGlvbnMuZmFsbGJhY2tMbmc7XG4gIGlmIChpc1N0cmluZyhmYWxsYmFja0xuZykgfHwgQXJyYXkuaXNBcnJheShmYWxsYmFja0xuZykpIGNvZGVzLnB1c2goLi4uW10uY29uY2F0KGZhbGxiYWNrTG5nKSk7XG4gIGVsc2UgaWYgKGZhbGxiYWNrTG5nICYmIHR5cGVvZiBmYWxsYmFja0xuZyA9PT0gJ29iamVjdCcpIHtcbiAgICBPYmplY3Qua2V5cyhmYWxsYmFja0xuZykuZm9yRWFjaCgoY29kZSkgPT4ge1xuICAgICAgaWYgKGNvZGUgIT09ICdkZWZhdWx0JykgY29kZXMucHVzaChjb2RlKTtcbiAgICAgIGNvZGVzLnB1c2goLi4uW10uY29uY2F0KGZhbGxiYWNrTG5nW2NvZGVdKSk7XG4gICAgfSk7XG4gIH1cbiAgcmV0dXJuIGNvZGVzO1xufTtcblxuLy8gQSBjb2RlIGZyb20gbG5nLCBjaGFuZ2VMYW5ndWFnZSgpLCBhIGRldGVjdG9yIG9yIGxvYWRMYW5ndWFnZXMoKSB3aXRoIGFub3RoZXIgc2hhcGUgdGhhbiBpc1NhZmVMYW5ndWFnZUNvZGUoKVxuLy8gYWxsb3dzIGlzIHJlZnVzZWQgdW5sZXNzIGl0IGlzIGNvbmZpZ3VyZWQ6IGFwcHMgcHV0IHRoZSBsYW5ndWFnZSBpbnRvIDxodG1sIGxhbmc+LCBVUkxzIGFuZCBmaWxlIHBhdGhzLlxuY29uc3QgaXNSZWZ1c2VkTGFuZ3VhZ2VDb2RlID0gKGkxOG4sIGNvZGUpID0+IHtcbiAgaWYgKCFpc1N0cmluZyhjb2RlKSB8fCBpc1NhZmVMYW5ndWFnZUNvZGUoY29kZSkgfHwgaTE4bi5jb25maWd1cmVkTG5ncz8uaGFzKGNvZGUpKSByZXR1cm4gZmFsc2U7XG4gIGkxOG4ubG9nZ2VyLm9uY2UoXG4gICAgYGxuZzoke2NvZGV9YCxcbiAgICAnd2FybicsXG4gICAgYHJlZnVzZWQgdGhlIGxhbmd1YWdlIGNvZGUgJyR7Y29kZS5zbGljZSgwLCA2NCl9JyBmcm9tIGxuZywgY2hhbmdlTGFuZ3VhZ2UoKSwgdGhlIGxhbmd1YWdlIGRldGVjdG9yIG9yIGxvYWRMYW5ndWFnZXMoKTogaXQgaXMgbm90IGNvbmZpZ3VyZWQgYW5kIGhhcyBvdGhlciBjaGFyYWN0ZXJzIHRoYW4gbGV0dGVycywgZGlnaXRzLCAnLScsICdfJywgJ0AnIGFuZCAnLicgKG9yICcuLicsIG9yIG1vcmUgdGhhbiAxMjgpLiBMaXN0IGl0IGluIHN1cHBvcnRlZExuZ3MgdG8gdXNlIGl0YCxcbiAgKTtcbiAgcmV0dXJuIHRydWU7XG59O1xuXG4vLyBCaW5kcyB0aGUgbWVtYmVyIGZ1bmN0aW9ucyBvZiB0aGUgZ2l2ZW4gY2xhc3MgaW5zdGFuY2Ugc28gdGhhdCB0aGV5IGNhbiBiZVxuLy8gZGVzdHJ1Y3R1cmVkIG9yIHVzZWQgYXMgY2FsbGJhY2tzLlxuY29uc3QgYmluZE1lbWJlckZ1bmN0aW9ucyA9IChpbnN0KSA9PiB7XG4gIGNvbnN0IG1lbXMgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhPYmplY3QuZ2V0UHJvdG90eXBlT2YoaW5zdCkpXG4gIG1lbXMuZm9yRWFjaCgobWVtKSA9PiB7XG4gICAgaWYgKHR5cGVvZiBpbnN0W21lbV0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIGluc3RbbWVtXSA9IGluc3RbbWVtXS5iaW5kKGluc3QpXG4gICAgfVxuICB9KVxufVxuXG5jbGFzcyBJMThuIGV4dGVuZHMgRXZlbnRFbWl0dGVyIHtcbiAgY29uc3RydWN0b3Iob3B0aW9ucyA9IHt9LCBjYWxsYmFjaykge1xuICAgIHN1cGVyKCk7XG5cbiAgICAvLyB0aGUgb3B0aW9ucyBhcyB0aGUgdXNlciBwYXNzZWQgdGhlbSwgdG8gdGVsbCBcIm5vdCBzZXRcIiBmcm9tIGEgZGVmYXVsdDsgdGhpcy5vcHRpb25zIGhhcyB0aGVcbiAgICAvLyBkZWZhdWx0cyBtZXJnZWQgaW4gZnJvbSB0aGUgc3RhcnQsIHNvIGdldEZpeGVkVCgpIGFuZCB0aGUgb3B0aW9ucyB3b3JrIGJlZm9yZSBpbml0KClcbiAgICB0aGlzLnVzZXJPcHRpb25zID0gdHJhbnNmb3JtT3B0aW9ucyhvcHRpb25zKTtcbiAgICB0aGlzLm9wdGlvbnMgPSB3aXRoRGVmYXVsdHModGhpcy51c2VyT3B0aW9ucyk7XG4gICAgLy8gcG9zdC1wcm9jZXNzb3JzIHJlZ2lzdGVyZWQgd2l0aCB1c2UoKTsgYSBjbG9uZSdzIHJlZ2lzdHJ5IGluaGVyaXRzIGl0cyBwYXJlbnQnc1xuICAgIHRoaXMuc2VydmljZXMgPSB7IHBvc3RQcm9jZXNzb3JzOiBPYmplY3QuY3JlYXRlKG51bGwpIH07XG4gICAgLy8gZWFjaCBpbnN0YW5jZSBsb2dzIHRocm91Z2ggaXRzIG93biBsb2dnZXIgKGEgY2xvbmUgdGhyb3VnaCBpdHMgcGFyZW50J3MpOyBpbml0KCkgc2V0cyBpdCB1cCBhZ2FpblxuICAgIC8vIHdpdGggdGhlIGxvZ2dlciBtb2R1bGUsIHVudGlsIHRoZW4gaXQgbG9ncyB0byB0aGUgY29uc29sZSB3aXRoIHRoZSBvcHRpb25zIGdpdmVuIGhlcmVcbiAgICB0aGlzLmxvZ2dlciA9IG5ldyBMb2dnZXIobnVsbCwgdGhpcy5vcHRpb25zKTtcbiAgICB0aGlzLm1vZHVsZXMgPSB7IGV4dGVybmFsOiBbXSB9O1xuXG4gICAgYmluZE1lbWJlckZ1bmN0aW9ucyh0aGlzKTtcblxuICAgIGlmIChjYWxsYmFjayAmJiAhdGhpcy5pc0luaXRpYWxpemVkICYmICFvcHRpb25zLmlzQ2xvbmUpIHtcbiAgICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9pMThuZXh0L2kxOG5leHQvaXNzdWVzLzg3OVxuICAgICAgLy8gdGhlIHVzZXIncyBvd24gaW5pdEFzeW5jOiB0aGUgZGVmYXVsdHMgbWVyZ2VkIGFib3ZlIGFsd2F5cyBoYXZlIGl0IHRydWVcbiAgICAgIGlmICghdGhpcy51c2VyT3B0aW9ucy5pbml0QXN5bmMpIHtcbiAgICAgICAgdGhpcy5pbml0KG9wdGlvbnMsIGNhbGxiYWNrKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICB9XG4gICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgdGhpcy5pbml0KG9wdGlvbnMsIGNhbGxiYWNrKTtcbiAgICAgIH0sIDApO1xuICAgIH1cbiAgfVxuXG4gIGluaXQob3B0aW9ucyA9IHt9LCBjYWxsYmFjaykge1xuICAgIHRoaXMuaXNJbml0aWFsaXppbmcgPSB0cnVlO1xuICAgIGlmICh0eXBlb2Ygb3B0aW9ucyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgY2FsbGJhY2sgPSBvcHRpb25zO1xuICAgICAgb3B0aW9ucyA9IHt9O1xuICAgIH1cblxuICAgIGlmIChvcHRpb25zLmRlZmF1bHROUyA9PSBudWxsICYmIG9wdGlvbnMubnMpIHtcbiAgICAgIGlmIChpc1N0cmluZyhvcHRpb25zLm5zKSkge1xuICAgICAgICBvcHRpb25zLmRlZmF1bHROUyA9IG9wdGlvbnMubnM7XG4gICAgICB9IGVsc2UgaWYgKCFvcHRpb25zLm5zLmluY2x1ZGVzKCd0cmFuc2xhdGlvbicpKSB7XG4gICAgICAgIG9wdGlvbnMuZGVmYXVsdE5TID0gb3B0aW9ucy5uc1swXTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0cmFuc2Zvcm1PcHRpb25zKG9wdGlvbnMpO1xuICAgIC8vIHdoYXQgdGhlIHVzZXIgc2V0LCBpbiBjcmVhdGVJbnN0YW5jZSgpIG9yIGhlcmVcbiAgICBjb25zdCB1c2VyT3B0aW9ucyA9IHsgLi4udGhpcy51c2VyT3B0aW9ucywgLi4ub3B0aW9ucyB9O1xuICAgIHRoaXMub3B0aW9ucyA9IHdpdGhEZWZhdWx0cyh7IC4uLnRoaXMub3B0aW9ucywgLi4ub3B0aW9ucyB9KTtcbiAgICBpZiAodXNlck9wdGlvbnMua2V5U2VwYXJhdG9yICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMub3B0aW9ucy51c2VyRGVmaW5lZEtleVNlcGFyYXRvciA9IHVzZXJPcHRpb25zLmtleVNlcGFyYXRvcjtcbiAgICB9XG4gICAgaWYgKHVzZXJPcHRpb25zLm5zU2VwYXJhdG9yICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMub3B0aW9ucy51c2VyRGVmaW5lZE5zU2VwYXJhdG9yID0gdXNlck9wdGlvbnMubnNTZXBhcmF0b3I7XG4gICAgfVxuICAgIC8vIGEgY2xvbmUgZ2V0cyBpdHMgcGFyZW50J3MgZnJvbSBjbG9uZUluc3RhbmNlKCksIHdpdGggaXRzIG93biBvcHRpb25zIGFkZGVkIHRoZXJlOiBpdHMgaW5pdCgpIG9wdGlvbnNcbiAgICAvLyBhcmUgdGhlIHBhcmVudCdzLCB3aG9zZSBpbmxpbmUgcmVzb3VyY2VzIGFyZSB0aGUgbGl2ZSBzdG9yZVxuICAgIGlmICghdGhpcy5vcHRpb25zLmlzQ2xvbmUpIHtcbiAgICAgIHRoaXMuY29uZmlndXJlZExuZ3MgPSBuZXcgU2V0KFtcbiAgICAgICAgLi4uKHRoaXMuY29uZmlndXJlZExuZ3MgfHwgW10pLFxuICAgICAgICAuLi5jb25maWd1cmVkTGFuZ3VhZ2VDb2Rlcyh1c2VyT3B0aW9ucyksXG4gICAgICBdKTtcbiAgICB9XG5cbiAgICBjb25zdCBjcmVhdGVDbGFzc09uRGVtYW5kID0gKENsYXNzT3JPYmplY3QpID0+IHtcbiAgICAgIGlmICghQ2xhc3NPck9iamVjdCkgcmV0dXJuIG51bGw7XG4gICAgICBpZiAodHlwZW9mIENsYXNzT3JPYmplY3QgPT09ICdmdW5jdGlvbicpIHJldHVybiBuZXcgQ2xhc3NPck9iamVjdCgpO1xuICAgICAgcmV0dXJuIENsYXNzT3JPYmplY3Q7XG4gICAgfVxuXG4gICAgLy8gaW5pdCBzZXJ2aWNlc1xuICAgIGlmICghdGhpcy5vcHRpb25zLmlzQ2xvbmUpIHtcbiAgICAgIHRoaXMubG9nZ2VyLmluaXQoY3JlYXRlQ2xhc3NPbkRlbWFuZCh0aGlzLm1vZHVsZXMubG9nZ2VyKSwgdGhpcy5vcHRpb25zKTtcbiAgICAgIGNvbnN0IHsgbG9nZ2VyIH0gPSB0aGlzO1xuICAgICAgdGhpcy5wZW5kaW5nV2FybmluZ3M/LmZvckVhY2goKG1zZykgPT4gdGhpcy5sb2dnZXIud2Fybihtc2cpKTtcbiAgICAgIHRoaXMucGVuZGluZ1dhcm5pbmdzID0gdW5kZWZpbmVkO1xuXG4gICAgICBsZXQgZm9ybWF0dGVyO1xuICAgICAgaWYgKHRoaXMubW9kdWxlcy5mb3JtYXR0ZXIpIHtcbiAgICAgICAgZm9ybWF0dGVyID0gdGhpcy5tb2R1bGVzLmZvcm1hdHRlcjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGZvcm1hdHRlciA9IEZvcm1hdHRlcjtcbiAgICAgIH1cblxuICAgICAgY29uc3QgbHUgPSBuZXcgTGFuZ3VhZ2VVdGlscyh0aGlzLm9wdGlvbnMsIGxvZ2dlcik7XG5cbiAgICAgIC8vIGlmICh0aGlzLm9wdGlvbnMucmVzb3VyY2VzKSB7XG4gICAgICAvLyAgIE9iamVjdC5rZXlzKHRoaXMub3B0aW9ucy5yZXNvdXJjZXMpLmZvckVhY2goKGxuZykgPT4ge1xuICAgICAgLy8gICAgIGNvbnN0IGZMbmcgPSBsdS5mb3JtYXRMYW5ndWFnZUNvZGUobG5nKTtcbiAgICAgIC8vICAgICBpZiAoZkxuZyAhPT0gbG5nKSB7XG4gICAgICAvLyAgICAgICB0aGlzLm9wdGlvbnMucmVzb3VyY2VzW2ZMbmddID0gdGhpcy5vcHRpb25zLnJlc291cmNlc1tsbmddO1xuICAgICAgLy8gICAgICAgZGVsZXRlIHRoaXMub3B0aW9ucy5yZXNvdXJjZXNbbG5nXTtcbiAgICAgIC8vICAgICAgIHRoaXMubG9nZ2VyLndhcm4oYGluaXQ6IGxuZyBpbiByZXNvdXJjZSBpcyBub3QgdmFsaWQsIG1hcHBpbmcgJHtsbmd9IHRvICR7ZkxuZ31gKTtcbiAgICAgIC8vICAgICB9XG4gICAgICAvLyAgIH0pXG4gICAgICAvLyB9XG5cbiAgICAgIHRoaXMuc3RvcmUgPSBuZXcgUmVzb3VyY2VTdG9yZSh0aGlzLm9wdGlvbnMucmVzb3VyY2VzLCB0aGlzLm9wdGlvbnMsIGxvZ2dlcik7XG5cbiAgICAgIGNvbnN0IHMgPSB0aGlzLnNlcnZpY2VzO1xuICAgICAgcy5sb2dnZXIgPSBsb2dnZXI7XG4gICAgICBzLnJlc291cmNlU3RvcmUgPSB0aGlzLnN0b3JlO1xuICAgICAgcy5sYW5ndWFnZVV0aWxzID0gbHU7XG4gICAgICBzLnBsdXJhbFJlc29sdmVyID0gbmV3IFBsdXJhbFJlc29sdmVyKGx1LCB7IHByZXBlbmQ6IHRoaXMub3B0aW9ucy5wbHVyYWxTZXBhcmF0b3IgfSwgbG9nZ2VyKTtcblxuICAgICAgaWYgKGZvcm1hdHRlcikge1xuICAgICAgICBzLmZvcm1hdHRlciA9IGNyZWF0ZUNsYXNzT25EZW1hbmQoZm9ybWF0dGVyKTtcbiAgICAgICAgaWYgKHMuZm9ybWF0dGVyLmluaXQpIHMuZm9ybWF0dGVyLmluaXQocywgdGhpcy5vcHRpb25zKTtcbiAgICAgICAgdGhpcy5vcHRpb25zLmludGVycG9sYXRpb24uZm9ybWF0ID0gcy5mb3JtYXR0ZXIuZm9ybWF0LmJpbmQocy5mb3JtYXR0ZXIpO1xuICAgICAgfVxuXG4gICAgICBzLmludGVycG9sYXRvciA9IG5ldyBJbnRlcnBvbGF0b3IodGhpcy5vcHRpb25zLCBsb2dnZXIpO1xuICAgICAgcy51dGlscyA9IHtcbiAgICAgICAgaGFzTG9hZGVkTmFtZXNwYWNlOiB0aGlzLmhhc0xvYWRlZE5hbWVzcGFjZS5iaW5kKHRoaXMpLFxuICAgICAgICAvLyBsZXRzIGEgYmFja2VuZCByZWZyZXNoIGl0cyBidW5kbGVzIChyZWxvYWRJbnRlcnZhbCkgd2l0aG91dCBkcml2aW5nIHRoZSBiYWNrZW5kQ29ubmVjdG9yXG4gICAgICAgIHJlbG9hZFJlc291cmNlczogdGhpcy5yZWxvYWRSZXNvdXJjZXMuYmluZCh0aGlzKVxuICAgICAgfTtcblxuICAgICAgcy5iYWNrZW5kQ29ubmVjdG9yID0gbmV3IEJhY2tlbmRDb25uZWN0b3IoXG4gICAgICAgIGNyZWF0ZUNsYXNzT25EZW1hbmQodGhpcy5tb2R1bGVzLmJhY2tlbmQpLFxuICAgICAgICBzLnJlc291cmNlU3RvcmUsXG4gICAgICAgIHMsXG4gICAgICAgIHRoaXMub3B0aW9ucyxcbiAgICAgICk7XG4gICAgICAvLyBwaXBlIGV2ZW50cyBmcm9tIGJhY2tlbmRDb25uZWN0b3JcbiAgICAgIHMuYmFja2VuZENvbm5lY3Rvci5vbignKicsIChldmVudCwgLi4uYXJncykgPT4ge1xuICAgICAgICB0aGlzLmVtaXQoZXZlbnQsIC4uLmFyZ3MpO1xuICAgICAgfSk7XG5cbiAgICAgIGlmICh0aGlzLm1vZHVsZXMubGFuZ3VhZ2VEZXRlY3Rvcikge1xuICAgICAgICBzLmxhbmd1YWdlRGV0ZWN0b3IgPSBjcmVhdGVDbGFzc09uRGVtYW5kKHRoaXMubW9kdWxlcy5sYW5ndWFnZURldGVjdG9yKTtcbiAgICAgICAgaWYgKHMubGFuZ3VhZ2VEZXRlY3Rvci5pbml0KSBzLmxhbmd1YWdlRGV0ZWN0b3IuaW5pdChzLCB0aGlzLm9wdGlvbnMuZGV0ZWN0aW9uLCB0aGlzLm9wdGlvbnMpO1xuICAgICAgICBpZiAocy5sYW5ndWFnZURldGVjdG9yLmFzeW5jICYmIGNhbGxiYWNrQXBpT2Yocy5sYW5ndWFnZURldGVjdG9yKSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgdGhpcy5sb2dnZXIuZGVwcmVjYXRlKFxuICAgICAgICAgICAgJ2xhbmd1YWdlRGV0ZWN0b3I6IHNldCBjYWxsYmFja0FwaSB0byBkZWNsYXJlIGhvdyB0aGUgYXN5bmMgZGV0ZWN0KCkgYW5zd2VycyAodHJ1ZTogZGV0ZWN0KGNhbGxiYWNrKTsgZmFsc2U6IGRldGVjdCgpIHJldHVybnMgYSBwcm9taXNlKTsgZ3Vlc3NpbmcgaXQgZnJvbSB0aGUgbnVtYmVyIG9mIHBhcmFtZXRlcnMgaXMgZGVwcmVjYXRlZCcsXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5tb2R1bGVzLmkxOG5Gb3JtYXQpIHtcbiAgICAgICAgcy5pMThuRm9ybWF0ID0gY3JlYXRlQ2xhc3NPbkRlbWFuZCh0aGlzLm1vZHVsZXMuaTE4bkZvcm1hdCk7XG4gICAgICAgIGlmIChzLmkxOG5Gb3JtYXQuaW5pdCkgcy5pMThuRm9ybWF0LmluaXQodGhpcyk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMudHJhbnNsYXRvciA9IG5ldyBUcmFuc2xhdG9yKHRoaXMuc2VydmljZXMsIHRoaXMub3B0aW9ucyk7XG4gICAgICAvLyBwaXBlIGV2ZW50cyBmcm9tIHRyYW5zbGF0b3JcbiAgICAgIHRoaXMudHJhbnNsYXRvci5vbignKicsIChldmVudCwgLi4uYXJncykgPT4ge1xuICAgICAgICB0aGlzLmVtaXQoZXZlbnQsIC4uLmFyZ3MpO1xuICAgICAgfSk7XG5cbiAgICAgIHRoaXMubW9kdWxlcy5leHRlcm5hbC5mb3JFYWNoKG0gPT4ge1xuICAgICAgICBpZiAobS5pbml0KSBtLmluaXQodGhpcyk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICB0aGlzLmZvcm1hdCA9IHRoaXMub3B0aW9ucy5pbnRlcnBvbGF0aW9uLmZvcm1hdDtcbiAgICBpZiAoIWNhbGxiYWNrKSBjYWxsYmFjayA9IG5vb3A7XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLmZhbGxiYWNrTG5nICYmICF0aGlzLnNlcnZpY2VzLmxhbmd1YWdlRGV0ZWN0b3IgJiYgIXRoaXMub3B0aW9ucy5sbmcpIHtcbiAgICAgIGNvbnN0IGNvZGVzID0gdGhpcy5zZXJ2aWNlcy5sYW5ndWFnZVV0aWxzLmdldEZhbGxiYWNrQ29kZXModGhpcy5vcHRpb25zLmZhbGxiYWNrTG5nKVxuICAgICAgaWYgKGNvZGVzLmxlbmd0aCA+IDAgJiYgY29kZXNbMF0gIT09ICdkZXYnKSB0aGlzLm9wdGlvbnMubG5nID0gY29kZXNbMF1cbiAgICB9XG4gICAgaWYgKCF0aGlzLnNlcnZpY2VzLmxhbmd1YWdlRGV0ZWN0b3IgJiYgIXRoaXMub3B0aW9ucy5sbmcpIHtcbiAgICAgIHRoaXMubG9nZ2VyLndhcm4oJ2luaXQ6IG5vIGxhbmd1YWdlRGV0ZWN0b3IgaXMgdXNlZCBhbmQgbm8gbG5nIGlzIGRlZmluZWQnKTtcbiAgICB9XG5cbiAgICAvLyBhcHBlbmQgYXBpXG4gICAgY29uc3Qgc3RvcmVBcGkgPSBbXG4gICAgICAnZ2V0UmVzb3VyY2UnLFxuICAgICAgJ2hhc1Jlc291cmNlQnVuZGxlJyxcbiAgICAgICdnZXRSZXNvdXJjZUJ1bmRsZScsXG4gICAgICAnZ2V0RGF0YUJ5TGFuZ3VhZ2UnLFxuICAgIF07XG4gICAgc3RvcmVBcGkuZm9yRWFjaChmY05hbWUgPT4ge1xuICAgICAgdGhpc1tmY05hbWVdID0gKC4uLmFyZ3MpID0+IHRoaXMuc3RvcmVbZmNOYW1lXSguLi5hcmdzKTtcbiAgICB9KTtcbiAgICBjb25zdCBzdG9yZUFwaUNoYWluZWQgPSBbXG4gICAgICAnYWRkUmVzb3VyY2UnLFxuICAgICAgJ2FkZFJlc291cmNlcycsXG4gICAgICAnYWRkUmVzb3VyY2VCdW5kbGUnLFxuICAgICAgJ3JlbW92ZVJlc291cmNlQnVuZGxlJyxcbiAgICBdO1xuICAgIHN0b3JlQXBpQ2hhaW5lZC5mb3JFYWNoKGZjTmFtZSA9PiB7XG4gICAgICB0aGlzW2ZjTmFtZV0gPSAoLi4uYXJncykgPT4ge1xuICAgICAgICB0aGlzLnN0b3JlW2ZjTmFtZV0oLi4uYXJncyk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgfTtcbiAgICB9KTtcblxuICAgIGNvbnN0IGRlZmVycmVkID0gZGVmZXIoKTtcblxuICAgIGNvbnN0IGxvYWQgPSAoKSA9PiB7XG4gICAgICBjb25zdCBmaW5pc2ggPSAoZXJyLCB0KSA9PiB7XG4gICAgICAgIHRoaXMuaXNJbml0aWFsaXppbmcgPSBmYWxzZTtcbiAgICAgICAgaWYgKHRoaXMuaXNJbml0aWFsaXplZCAmJiAhdGhpcy5pbml0aWFsaXplZFN0b3JlT25jZSkgdGhpcy5sb2dnZXIud2FybignaW5pdDogaTE4bmV4dCBpcyBhbHJlYWR5IGluaXRpYWxpemVkLiBZb3Ugc2hvdWxkIGNhbGwgaW5pdCBqdXN0IG9uY2UhJyk7XG4gICAgICAgIHRoaXMuaXNJbml0aWFsaXplZCA9IHRydWU7XG4gICAgICAgIGlmICghdGhpcy5vcHRpb25zLmlzQ2xvbmUpIHRoaXMubG9nZ2VyLmxvZygnaW5pdGlhbGl6ZWQnLCB0aGlzLm9wdGlvbnMpO1xuICAgICAgICB0aGlzLmVtaXQoJ2luaXRpYWxpemVkJywgdGhpcy5vcHRpb25zKTtcblxuICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKHQpOyAvLyBub3QgcmVqZWN0aW5nIG9uIGVyciAoYXMgZXJyIGlzIG9ubHkgYSBsb2FkaW5nIHRyYW5zbGF0aW9uIGZhaWxlZCB3YXJuaW5nKVxuICAgICAgICBjYWxsYmFjayhlcnIsIHQpO1xuICAgICAgfTtcbiAgICAgIC8vIGZpeCBmb3IgdXNlIGNhc2VzIHdoZW4gY2FsbGluZyBjaGFuZ2VMYW5ndWFnZSBiZWZvcmUgZmluaXNoZWQgdG8gaW5pdGlhbGl6ZWQgKGkuZS4gaHR0cHM6Ly9naXRodWIuY29tL2kxOG5leHQvaTE4bmV4dC9pc3N1ZXMvMTU1MilcbiAgICAgIC8vIGFsc28gY292ZXJzIGNsb25lSW5zdGFuY2UgcmFjZSB3aGVyZSBkZWZlcnJlZCBsb2FkKCkgd291bGQgb3ZlcndyaXRlIGEgcGVuZGluZyBjaGFuZ2VMYW5ndWFnZSAoaHR0cHM6Ly9naXRodWIuY29tL2kxOG5leHQvaTE4bmV4dC9pc3N1ZXMvMjQyMilcbiAgICAgIGlmICgodGhpcy5sYW5ndWFnZXMgfHwgdGhpcy5pc0xhbmd1YWdlQ2hhbmdpbmdUbykgJiYgIXRoaXMuaXNJbml0aWFsaXplZCkgcmV0dXJuIGZpbmlzaChudWxsLCB0aGlzLnQuYmluZCh0aGlzKSk7XG4gICAgICB0aGlzLmNoYW5nZUxhbmd1YWdlKHRoaXMub3B0aW9ucy5sbmcsIGZpbmlzaCk7XG4gICAgfTtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMucmVzb3VyY2VzIHx8ICF0aGlzLm9wdGlvbnMuaW5pdEFzeW5jKSB7XG4gICAgICBsb2FkKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHNldFRpbWVvdXQobG9hZCwgMCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGRlZmVycmVkO1xuICB9XG5cbiAgbG9hZFJlc291cmNlcyhsYW5ndWFnZSwgY2FsbGJhY2sgPSBub29wKSB7XG4gICAgbGV0IHVzZWRDYWxsYmFjayA9IGNhbGxiYWNrO1xuICAgIGNvbnN0IHVzZWRMbmcgPSBpc1N0cmluZyhsYW5ndWFnZSkgPyBsYW5ndWFnZSA6IHRoaXMubGFuZ3VhZ2U7XG4gICAgaWYgKHR5cGVvZiBsYW5ndWFnZSA9PT0gJ2Z1bmN0aW9uJykgdXNlZENhbGxiYWNrID0gbGFuZ3VhZ2U7XG5cbiAgICBpZiAoIXRoaXMub3B0aW9ucy5yZXNvdXJjZXMgfHwgdGhpcy5vcHRpb25zLnBhcnRpYWxCdW5kbGVkTGFuZ3VhZ2VzKSB7XG4gICAgICBpZiAodXNlZExuZz8udG9Mb3dlckNhc2UoKSA9PT0gJ2NpbW9kZScgJiYgKCF0aGlzLm9wdGlvbnMucHJlbG9hZCB8fCB0aGlzLm9wdGlvbnMucHJlbG9hZC5sZW5ndGggPT09IDApKSByZXR1cm4gdXNlZENhbGxiYWNrKCk7IC8vIGF2b2lkIGxvYWRpbmcgcmVzb3VyY2VzIGZvciBjaW1vZGVcblxuICAgICAgY29uc3QgdG9Mb2FkID0gW107XG5cbiAgICAgIGNvbnN0IGFwcGVuZCA9IGxuZyA9PiB7XG4gICAgICAgIGlmICghbG5nKSByZXR1cm47XG4gICAgICAgIGlmIChsbmcgPT09ICdjaW1vZGUnKSByZXR1cm47XG4gICAgICAgIGNvbnN0IGxuZ3MgPSB0aGlzLnNlcnZpY2VzLmxhbmd1YWdlVXRpbHMudG9SZXNvbHZlSGllcmFyY2h5KGxuZyk7XG4gICAgICAgIGxuZ3MuZm9yRWFjaChsID0+IHtcbiAgICAgICAgICBpZiAobCA9PT0gJ2NpbW9kZScpIHJldHVybjtcbiAgICAgICAgICBpZiAoIXRvTG9hZC5pbmNsdWRlcyhsKSkgdG9Mb2FkLnB1c2gobCk7XG4gICAgICAgIH0pO1xuICAgICAgfTtcblxuICAgICAgaWYgKCF1c2VkTG5nKSB7XG4gICAgICAgIC8vIGF0IGxlYXN0IGxvYWQgZmFsbGJhY2tzIGluIHRoaXMgY2FzZVxuICAgICAgICBjb25zdCBmYWxsYmFja3MgPSB0aGlzLnNlcnZpY2VzLmxhbmd1YWdlVXRpbHMuZ2V0RmFsbGJhY2tDb2Rlcyh0aGlzLm9wdGlvbnMuZmFsbGJhY2tMbmcpO1xuICAgICAgICBmYWxsYmFja3MuZm9yRWFjaChsID0+IGFwcGVuZChsKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBhcHBlbmQodXNlZExuZyk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMub3B0aW9ucy5wcmVsb2FkPy5mb3JFYWNoPy4obCA9PiBhcHBlbmQobCkpO1xuXG4gICAgICB0aGlzLnNlcnZpY2VzLmJhY2tlbmRDb25uZWN0b3IubG9hZCh0b0xvYWQsIHRoaXMub3B0aW9ucy5ucywgKGUpID0+IHtcbiAgICAgICAgaWYgKCFlICYmICF0aGlzLnJlc29sdmVkTGFuZ3VhZ2UgJiYgdGhpcy5sYW5ndWFnZSkgdGhpcy5zZXRSZXNvbHZlZExhbmd1YWdlKHRoaXMubGFuZ3VhZ2UpO1xuICAgICAgICB1c2VkQ2FsbGJhY2soZSk7XG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgdXNlZENhbGxiYWNrKG51bGwpO1xuICAgIH1cbiAgfVxuXG4gIHJlbG9hZFJlc291cmNlcyhsbmdzLCBucywgY2FsbGJhY2spIHtcbiAgICBjb25zdCBkZWZlcnJlZCA9IGRlZmVyKCk7XG4gICAgaWYgKHR5cGVvZiBsbmdzID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBjYWxsYmFjayA9IGxuZ3M7XG4gICAgICBsbmdzID0gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBpZiAodHlwZW9mIG5zID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBjYWxsYmFjayA9IG5zO1xuICAgICAgbnMgPSB1bmRlZmluZWQ7XG4gICAgfVxuICAgIC8vIHdpdGhvdXQgbGFuZ3VhZ2VzOiB0aGUgY3VycmVudCBvbmVzIGFuZCBldmVyeSBsYW5ndWFnZSB0aGUgYmFja2VuZCBsb2FkZWQgb3IgdHJpZWQgdG8gbG9hZCBmb3IgdGhpc1xuICAgIC8vIGluc3RhbmNlIGFuZCBpdHMgY2xvbmVzICh0aGV5IHNoYXJlIHRoZSBjb25uZWN0b3IpLCBzbyBhIHBlcmlvZGljIHJlbG9hZCBvZiBhIGJhY2tlbmQgYWxzbyBjb3ZlcnMgdGhlXG4gICAgLy8gbGFuZ3VhZ2VzIGEgY2xvbmUgbG9hZGVkIG9uIGRlbWFuZFxuICAgIGlmICghbG5ncykge1xuICAgICAgY29uc3QgcmVxdWVzdGVkID0gT2JqZWN0LmtleXModGhpcy5zZXJ2aWNlcy5iYWNrZW5kQ29ubmVjdG9yLnN0YXRlKS5tYXAoKG5hbWUpID0+IG5hbWUuc3BsaXQoJ3wnKVswXSk7XG4gICAgICBsbmdzID0gWy4uLm5ldyBTZXQoWy4uLih0aGlzLmxhbmd1YWdlcyB8fCBbXSksIC4uLnJlcXVlc3RlZF0pXS5maWx0ZXIoKGwpID0+IGwgIT09ICdjaW1vZGUnKTtcbiAgICB9XG4gICAgaWYgKCFucykgbnMgPSB0aGlzLm9wdGlvbnMubnM7XG4gICAgaWYgKCFjYWxsYmFjaykgY2FsbGJhY2sgPSBub29wO1xuICAgIHRoaXMuc2VydmljZXMuYmFja2VuZENvbm5lY3Rvci5yZWxvYWQobG5ncywgbnMsIGVyciA9PiB7XG4gICAgICBkZWZlcnJlZC5yZXNvbHZlKCk7IC8vIG5vdCByZWplY3Rpbmcgb24gZXJyIChhcyBlcnIgaXMgb25seSBhIGxvYWRpbmcgdHJhbnNsYXRpb24gZmFpbGVkIHdhcm5pbmcpXG4gICAgICBjYWxsYmFjayhlcnIpO1xuICAgIH0pO1xuICAgIHJldHVybiBkZWZlcnJlZDtcbiAgfVxuXG4gIHVzZShtb2R1bGUpIHtcbiAgICBpZiAoIW1vZHVsZSkgdGhyb3cgbmV3IEVycm9yKCdZb3UgYXJlIHBhc3NpbmcgYW4gdW5kZWZpbmVkIG1vZHVsZSEgUGxlYXNlIGNoZWNrIHRoZSBvYmplY3QgeW91IGFyZSBwYXNzaW5nIHRvIGkxOG5leHQudXNlKCknKVxuICAgIGlmICghbW9kdWxlLnR5cGUpIHRocm93IG5ldyBFcnJvcignWW91IGFyZSBwYXNzaW5nIGEgd3JvbmcgbW9kdWxlISBQbGVhc2UgY2hlY2sgdGhlIG9iamVjdCB5b3UgYXJlIHBhc3NpbmcgdG8gaTE4bmV4dC51c2UoKScpXG5cbiAgICAvLyBhIHNlY29uZCBiYWNrZW5kLCBkZXRlY3RvciwgaTE4bkZvcm1hdCBvciBmb3JtYXR0ZXIgcmVwbGFjZXMgdGhlIGZpcnN0IG9uZVxuICAgIGNvbnN0IHNldE1vZHVsZSA9ICh0eXBlKSA9PiB7XG4gICAgICBpZiAodGhpcy5tb2R1bGVzW3R5cGVdICYmIHRoaXMubW9kdWxlc1t0eXBlXSAhPT0gbW9kdWxlKSB7XG4gICAgICAgIGNvbnN0IG1zZyA9IGB1c2U6IHRoaXMgJHt0eXBlfSByZXBsYWNlcyB0aGUgJHt0eXBlfSBwYXNzZWQgdG8gYW4gZWFybGllciB1c2UoKSBjYWxsOyBvbmx5IG9uZSAke3R5cGV9IGlzIHVzZWQgcGVyIGluc3RhbmNlYDtcbiAgICAgICAgLy8gdXNlKCkgbW9zdGx5IHJ1bnMgYmVmb3JlIGluaXQoKSBoYXMgc2V0IHVwIHRoZSBsb2dnZXIgKGFuZCBkZWJ1ZyksIHNvIHRoZSB3YXJuaW5nIHdhaXRzIGZvciBpbml0KClcbiAgICAgICAgaWYgKHRoaXMuaXNJbml0aWFsaXppbmcgfHwgdGhpcy5pc0luaXRpYWxpemVkKSB0aGlzLmxvZ2dlci53YXJuKG1zZyk7XG4gICAgICAgIGVsc2UgKHRoaXMucGVuZGluZ1dhcm5pbmdzID0gdGhpcy5wZW5kaW5nV2FybmluZ3MgfHwgW10pLnB1c2gobXNnKTtcbiAgICAgIH1cbiAgICAgIHRoaXMubW9kdWxlc1t0eXBlXSA9IG1vZHVsZTtcbiAgICB9O1xuXG4gICAgaWYgKG1vZHVsZS50eXBlID09PSAnYmFja2VuZCcpIHtcbiAgICAgIHNldE1vZHVsZSgnYmFja2VuZCcpO1xuICAgIH1cblxuICAgIGlmIChtb2R1bGUudHlwZSA9PT0gJ2xvZ2dlcicgfHwgKG1vZHVsZS5sb2cgJiYgbW9kdWxlLndhcm4gJiYgbW9kdWxlLmVycm9yKSkge1xuICAgICAgdGhpcy5tb2R1bGVzLmxvZ2dlciA9IG1vZHVsZTtcbiAgICB9XG5cbiAgICBpZiAobW9kdWxlLnR5cGUgPT09ICdsYW5ndWFnZURldGVjdG9yJykge1xuICAgICAgc2V0TW9kdWxlKCdsYW5ndWFnZURldGVjdG9yJyk7XG4gICAgfVxuXG4gICAgaWYgKG1vZHVsZS50eXBlID09PSAnaTE4bkZvcm1hdCcpIHtcbiAgICAgIHNldE1vZHVsZSgnaTE4bkZvcm1hdCcpO1xuICAgIH1cblxuICAgIGlmIChtb2R1bGUudHlwZSA9PT0gJ3Bvc3RQcm9jZXNzb3InKSB7XG4gICAgICB0aGlzLnNlcnZpY2VzLnBvc3RQcm9jZXNzb3JzW21vZHVsZS5uYW1lXSA9IG1vZHVsZTtcbiAgICB9XG5cbiAgICBpZiAobW9kdWxlLnR5cGUgPT09ICdmb3JtYXR0ZXInKSB7XG4gICAgICBzZXRNb2R1bGUoJ2Zvcm1hdHRlcicpO1xuICAgIH1cblxuICAgIGlmIChtb2R1bGUudHlwZSA9PT0gJzNyZFBhcnR5Jykge1xuICAgICAgdGhpcy5tb2R1bGVzLmV4dGVybmFsLnB1c2gobW9kdWxlKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8vIHB1dHMgc2VydmVyLXJlbmRlcmVkIHJlc291cmNlcyBpbnRvIHRoZSBzdG9yZSBhbmQgc3dpdGNoZXMgdG8gdGhlIHNlcnZlcidzIGxhbmd1YWdlLCBlYWNoIG9uY2VcbiAgLy8gKHJlYWN0LWkxOG5leHQgdXNlU1NSLCBuZXh0LWkxOG5leHQpLiBTZXRzIHRoZSBzYW1lIGZsYWdzIHRob3NlIHdyb3RlIGRpcmVjdGx5IGJlZm9yZS5cbiAgaHlkcmF0ZShyZXNvdXJjZXMsIGxuZykge1xuICAgIC8vIGEgY2xvbmUgc2hhcmVzIGl0cyBwYXJlbnQncyBzdG9yZSAob25lIGNsb25lIHBlciByZXF1ZXN0IG9uIGEgc2VydmVyKTogbGlrZSB1c2VTU1IsIGxlYXZlIGl0IGFsb25lXG4gICAgaWYgKHRoaXMub3B0aW9ucy5pc0Nsb25lKSByZXR1cm4gdGhpcztcbiAgICBpZiAoIXRoaXMuc2VydmljZXMucmVzb3VyY2VTdG9yZSkge1xuICAgICAgdGhpcy5sb2dnZXIud2FybignaHlkcmF0ZTogY2FsbCBpbml0KCkgZmlyc3QsIHRoZSBpbnN0YW5jZSBoYXMgbm8gcmVzb3VyY2Ugc3RvcmUgeWV0Jyk7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gICAgaWYgKHJlc291cmNlcyAmJiAhdGhpcy5pbml0aWFsaXplZFN0b3JlT25jZSkge1xuICAgICAgdGhpcy5zZXJ2aWNlcy5yZXNvdXJjZVN0b3JlLmRhdGEgPSByZXNvdXJjZXM7XG4gICAgICAvLyBhZGQgdGhlIG5hbWVzcGFjZXMsIHNvIGEgbGFuZ3VhZ2UgY2hhbmdlIGxvYWRzIGFsbCBvZiB0aGVtXG4gICAgICBPYmplY3QudmFsdWVzKHJlc291cmNlcykuZm9yRWFjaCgobG5nUmVzb3VyY2VzKSA9PiB7XG4gICAgICAgIE9iamVjdC5rZXlzKGxuZ1Jlc291cmNlcykuZm9yRWFjaCgobnMpID0+IHtcbiAgICAgICAgICBpZiAoIXRoaXMub3B0aW9ucy5ucy5pbmNsdWRlcyhucykpIHRoaXMub3B0aW9ucy5ucy5wdXNoKG5zKTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICAgIHRoaXMuaW5pdGlhbGl6ZWRTdG9yZU9uY2UgPSB0cnVlO1xuICAgICAgdGhpcy5pc0luaXRpYWxpemVkID0gdHJ1ZTtcbiAgICB9XG4gICAgaWYgKGxuZyAmJiAhdGhpcy5pbml0aWFsaXplZExhbmd1YWdlT25jZSkge1xuICAgICAgdGhpcy5jaGFuZ2VMYW5ndWFnZShsbmcpO1xuICAgICAgdGhpcy5pbml0aWFsaXplZExhbmd1YWdlT25jZSA9IHRydWU7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgc2V0UmVzb2x2ZWRMYW5ndWFnZShsKSB7XG4gICAgaWYgKCFsIHx8ICF0aGlzLmxhbmd1YWdlcykgcmV0dXJuO1xuICAgIGlmIChbJ2NpbW9kZScsICdkZXYnXS5pbmNsdWRlcyhsKSkgcmV0dXJuO1xuICAgIGZvciAobGV0IGxpID0gMDsgbGkgPCB0aGlzLmxhbmd1YWdlcy5sZW5ndGg7IGxpKyspIHtcbiAgICAgIGNvbnN0IGxuZ0luTG5ncyA9IHRoaXMubGFuZ3VhZ2VzW2xpXTtcbiAgICAgIGlmIChbJ2NpbW9kZScsICdkZXYnXS5pbmNsdWRlcyhsbmdJbkxuZ3MpKSBjb250aW51ZTtcbiAgICAgIGlmICh0aGlzLnN0b3JlLmhhc0xhbmd1YWdlU29tZVRyYW5zbGF0aW9ucyhsbmdJbkxuZ3MpKSB7XG4gICAgICAgIHRoaXMucmVzb2x2ZWRMYW5ndWFnZSA9IGxuZ0luTG5ncztcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICAgIGlmICghdGhpcy5yZXNvbHZlZExhbmd1YWdlICYmICF0aGlzLmxhbmd1YWdlcy5pbmNsdWRlcyhsKSAmJiB0aGlzLnN0b3JlLmhhc0xhbmd1YWdlU29tZVRyYW5zbGF0aW9ucyhsKSkge1xuICAgICAgdGhpcy5yZXNvbHZlZExhbmd1YWdlID0gbDtcbiAgICAgIHRoaXMubGFuZ3VhZ2VzLnVuc2hpZnQobCk7XG4gICAgfVxuICB9XG5cbiAgY2hhbmdlTGFuZ3VhZ2UobG5nLCBjYWxsYmFjaykge1xuICAgIHRoaXMuaXNMYW5ndWFnZUNoYW5naW5nVG8gPSBsbmc7XG4gICAgY29uc3QgZGVmZXJyZWQgPSBkZWZlcigpO1xuICAgIHRoaXMuZW1pdCgnbGFuZ3VhZ2VDaGFuZ2luZycsIGxuZyk7XG5cbiAgICBjb25zdCBzZXRMbmdQcm9wcyA9IChsKSA9PiB7XG4gICAgICB0aGlzLmxhbmd1YWdlID0gbDtcbiAgICAgIHRoaXMubGFuZ3VhZ2VzID0gdGhpcy5zZXJ2aWNlcy5sYW5ndWFnZVV0aWxzLnRvUmVzb2x2ZUhpZXJhcmNoeShsKTtcbiAgICAgIC8vIGZpbmQgdGhlIGZpcnN0IGxhbmd1YWdlIHJlc29sdmVkIGxhbmd1YWdlXG4gICAgICB0aGlzLnJlc29sdmVkTGFuZ3VhZ2UgPSB1bmRlZmluZWQ7XG4gICAgICB0aGlzLnNldFJlc29sdmVkTGFuZ3VhZ2UobCk7XG4gICAgfTtcblxuICAgIGNvbnN0IGRvbmUgPSAoZXJyLCBsKSA9PiB7XG4gICAgICBpZiAobCkge1xuICAgICAgICBpZiAodGhpcy5pc0xhbmd1YWdlQ2hhbmdpbmdUbyA9PT0gbG5nKSB7XG4gICAgICAgICAgc2V0TG5nUHJvcHMobCk7XG4gICAgICAgICAgdGhpcy50cmFuc2xhdG9yLmNoYW5nZUxhbmd1YWdlKGwpO1xuICAgICAgICAgIHRoaXMuaXNMYW5ndWFnZUNoYW5naW5nVG8gPSB1bmRlZmluZWQ7XG4gICAgICAgICAgdGhpcy5lbWl0KCdsYW5ndWFnZUNoYW5nZWQnLCBsKTtcbiAgICAgICAgICB0aGlzLmxvZ2dlci5sb2coJ2xhbmd1YWdlQ2hhbmdlZCcsIGwpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmlzTGFuZ3VhZ2VDaGFuZ2luZ1RvID0gdW5kZWZpbmVkO1xuICAgICAgfVxuXG4gICAgICBkZWZlcnJlZC5yZXNvbHZlKCguLi5hcmdzKSA9PiB0aGlzLnQoLi4uYXJncykpO1xuICAgICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjayhlcnIsICguLi5hcmdzKSA9PiB0aGlzLnQoLi4uYXJncykpO1xuICAgIH07XG5cbiAgICBjb25zdCBzZXRMbmcgPSBsbmdzID0+IHtcbiAgICAgIC8vIGlmIGRldGVjdGVkIGxuZyBpcyBmYWxzeSwgc2V0IGl0IHRvIGVtcHR5IGFycmF5LCB0byBtYWtlIHN1cmUgYXQgbGVhc3QgdGhlIGZhbGxiYWNrTG5nIHdpbGwgYmUgdXNlZFxuICAgICAgaWYgKCFsbmcgJiYgIWxuZ3MgJiYgdGhpcy5zZXJ2aWNlcy5sYW5ndWFnZURldGVjdG9yKSBsbmdzID0gW107XG4gICAgICAvLyBhIHJlZnVzZWQgY29kZSBpcyBza2lwcGVkIGxpa2UgYW4gdW5zdXBwb3J0ZWQgb25lOiB0aGUgZGV0ZWN0b3IncyBuZXh0IGNvZGUsIGVsc2UgdGhlIGZhbGxiYWNrXG4gICAgICAvLyBsYW5ndWFnZSwgZWxzZSBub25lIChmYWxsYmFja0xuZzogZmFsc2UgbGVhdmVzIHRoZSBsYW5ndWFnZSB1bnNldCkuIFdpdGggc3VwcG9ydGVkTG5ncyB0aGUgaW5wdXQgaXNcbiAgICAgIC8vIG1hdGNoZWQgYXMgYmVmb3JlICgnZGUtREU7cT0wLjknIGdpdmVzICdkZScpOyBvbmx5IGFuIHVuc2FmZSBtYXRjaCBpcyByZWZ1c2VkLCB3aGljaCBvbmx5XG4gICAgICAvLyBub25FeHBsaWNpdFN1cHBvcnRlZExuZ3MgY2FuIHJldHVybiAoJ2RlLTx4PicgZm9yIGEgc3VwcG9ydGVkICdkZScpXG4gICAgICBjb25zdCB7IHN1cHBvcnRlZExuZ3MgfSA9IHRoaXMub3B0aW9ucztcbiAgICAgIGlmIChsbmdzICYmICFzdXBwb3J0ZWRMbmdzKSB7XG4gICAgICAgIGNvbnN0IGFjY2VwdGVkID0gW10uY29uY2F0KGxuZ3MpLmZpbHRlcigoYykgPT4gIWlzUmVmdXNlZExhbmd1YWdlQ29kZSh0aGlzLCBjKSk7XG4gICAgICAgIGlmIChhY2NlcHRlZC5sZW5ndGggPCBbXS5jb25jYXQobG5ncykubGVuZ3RoKSBsbmdzID0gYWNjZXB0ZWQ7XG4gICAgICB9XG4gICAgICAvLyBkZXBlbmRpbmcgb24gQVBJIGluIGRldGVjdG9yIGxuZyBjYW4gYmUgYSBzdHJpbmcgKG9sZCkgb3IgYW4gYXJyYXkgb2YgbGFuZ3VhZ2VzIG9yZGVyZWQgaW4gcHJpb3JpdHlcbiAgICAgIGNvbnN0IGZsID0gaXNTdHJpbmcobG5ncykgPyBsbmdzIDogbG5ncyAmJiBsbmdzWzBdO1xuICAgICAgbGV0IGwgPSB0aGlzLnN0b3JlLmhhc0xhbmd1YWdlU29tZVRyYW5zbGF0aW9ucyhmbCkgPyBmbCA6IHRoaXMuc2VydmljZXMubGFuZ3VhZ2VVdGlscy5nZXRCZXN0TWF0Y2hGcm9tQ29kZXMoaXNTdHJpbmcobG5ncykgPyBbbG5nc10gOiBsbmdzKTtcbiAgICAgIGlmIChzdXBwb3J0ZWRMbmdzICYmIGlzUmVmdXNlZExhbmd1YWdlQ29kZSh0aGlzLCBsKSkgbCA9IHRoaXMuc2VydmljZXMubGFuZ3VhZ2VVdGlscy5nZXRCZXN0TWF0Y2hGcm9tQ29kZXMoW10pO1xuXG4gICAgICBpZiAobCkge1xuICAgICAgICBpZiAoIXRoaXMubGFuZ3VhZ2UpIHtcbiAgICAgICAgICBzZXRMbmdQcm9wcyhsKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXRoaXMudHJhbnNsYXRvci5sYW5ndWFnZSkgdGhpcy50cmFuc2xhdG9yLmNoYW5nZUxhbmd1YWdlKGwpO1xuXG4gICAgICAgIHRoaXMuc2VydmljZXMubGFuZ3VhZ2VEZXRlY3Rvcj8uY2FjaGVVc2VyTGFuZ3VhZ2U/LihsKTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5sb2FkUmVzb3VyY2VzKGwsIGVyciA9PiB7XG4gICAgICAgIGRvbmUoZXJyLCBsKTtcbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICBpZiAoIWxuZyAmJiB0aGlzLnNlcnZpY2VzLmxhbmd1YWdlRGV0ZWN0b3IgJiYgIXRoaXMuc2VydmljZXMubGFuZ3VhZ2VEZXRlY3Rvci5hc3luYykge1xuICAgICAgc2V0TG5nKHRoaXMuc2VydmljZXMubGFuZ3VhZ2VEZXRlY3Rvci5kZXRlY3QoKSk7XG4gICAgfSBlbHNlIGlmICghbG5nICYmIHRoaXMuc2VydmljZXMubGFuZ3VhZ2VEZXRlY3RvciAmJiB0aGlzLnNlcnZpY2VzLmxhbmd1YWdlRGV0ZWN0b3IuYXN5bmMpIHtcbiAgICAgIGNvbnN0IGNhbGxiYWNrQXBpID0gY2FsbGJhY2tBcGlPZih0aGlzLnNlcnZpY2VzLmxhbmd1YWdlRGV0ZWN0b3IpO1xuICAgICAgaWYgKGNhbGxiYWNrQXBpID09PSBmYWxzZSB8fCAoY2FsbGJhY2tBcGkgPT09IHVuZGVmaW5lZCAmJiB0aGlzLnNlcnZpY2VzLmxhbmd1YWdlRGV0ZWN0b3IuZGV0ZWN0Lmxlbmd0aCA9PT0gMCkpIHtcbiAgICAgICAgdGhpcy5zZXJ2aWNlcy5sYW5ndWFnZURldGVjdG9yLmRldGVjdCgpLnRoZW4oc2V0TG5nKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuc2VydmljZXMubGFuZ3VhZ2VEZXRlY3Rvci5kZXRlY3Qoc2V0TG5nKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgc2V0TG5nKGxuZyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGRlZmVycmVkO1xuICB9XG5cbiAgLy8gYGZpeGVkT3B0c2AgKG9wdGlvbmFsIDR0aCBhcmcpIGNhcnJpZXMgb3B0aW9ucyB0aGF0IGFyZSB0aWVkIHRvIHRoZVxuICAvLyBib3VuZCB0IGZ1bmN0aW9uIHJhdGhlciB0aGFuIHRvIHRoZSByZXNvbHV0aW9uIG9mIGFueSBzaW5nbGUgY2FsbDpcbiAgLy9cbiAgLy8gICAtIGBzY29wZU5zPzogc3RyaW5nW11gXG4gIC8vICAgICAgIEZ1bGwgbmFtZXNwYWNlIGxpc3QgdGhlIGJvdW5kIHQgd2FzIGNyZWF0ZWQgZm9yIChlLmcuIHRoZSBhcnJheVxuICAvLyAgICAgICBwYXNzZWQgdG8gYHVzZVRyYW5zbGF0aW9uKFsnbnNBJywnbnNCJ10pYCkuIFVzZWQgKm9ubHkqIGJ5IHRoZVxuICAvLyAgICAgICBzZWxlY3RvciBwYXRoIHRvIGRlY2lkZSB3aGV0aGVyIGBwYXRoWzBdYCBzaG91bGQgYmUgcmV3cml0dGVuIGFzXG4gIC8vICAgICAgIGEgbmFtZXNwYWNlIHByZWZpeC4gUmVzb2x1dGlvbiBzZW1hbnRpY3MgYXJlIHVuY2hhbmdlZDogdGhlIGJvdW5kXG4gIC8vICAgICAgIGBuc2AgKGEgc2luZ2xlIHByaW1hcnkgc3RyaW5nKSBzdGlsbCBkcml2ZXMgYFRyYW5zbGF0b3IudHJhbnNsYXRlYC5cbiAgLy8gICAgICAgVGhpcyBkZWNvdXBsZXMgc2VsZWN0b3IgbnMtZGV0ZWN0aW9uIGZyb20gcmVzb2x1dGlvbiBzY29wZSBzbyBhXG4gIC8vICAgICAgIHJlYWN0LWkxOG5leHQgaG9vayBjYWxsZWQgd2l0aCBtdWx0aXBsZSBuYW1lc3BhY2VzIGNhbiByb3V0ZVxuICAvLyAgICAgICBgdCgkID0+ICQuc2Vjb25kYXJ5LmZvbylgIGNvcnJlY3RseSAqd2l0aG91dCogdHVybmluZyBldmVyeVxuICAvLyAgICAgICBgdCgnZm9vJylgIGxvb2t1cCBpbnRvIGEgbXVsdGktbnMgZmFsbGJhY2sgY2hhaW4uXG4gIC8vICAgICAgIFNlZSB0aGUgdjI1LjguMTkgc2VsZWN0b3IgcnVsZSBpbiBgc3JjL3NlbGVjdG9yLmpzYC5cbiAgZ2V0Rml4ZWRUKGxuZywgbnMsIGtleVByZWZpeCwgZml4ZWRPcHRzKSB7XG4gICAgY29uc3Qgc2NvcGVOcyA9IGZpeGVkT3B0cz8uc2NvcGVOcztcbiAgICBjb25zdCBmaXhlZFQgPSAoa2V5LCBvcHRzLCAuLi5yZXN0KSA9PiB7XG4gICAgICBsZXQgbztcbiAgICAgIGlmICh0eXBlb2Ygb3B0cyAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgbyA9IHRoaXMub3B0aW9ucy5vdmVybG9hZFRyYW5zbGF0aW9uT3B0aW9uSGFuZGxlcihba2V5LCBvcHRzXS5jb25jYXQocmVzdCkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbyA9IHsgLi4ub3B0cyB9O1xuICAgICAgfVxuXG4gICAgICBvLmxuZyA9IG8ubG5nIHx8IGZpeGVkVC5sbmc7XG4gICAgICBvLmxuZ3MgPSBvLmxuZ3MgfHwgZml4ZWRULmxuZ3M7XG4gICAgICAvLyBEZXRlY3QgcGVyLWNhbGwgZXhwbGljaXQgYG5zYCBCRUZPUkUgYXV0by1maWxsaW5nIGZyb20gZml4ZWRULm5zLCBzbyB0aGVcbiAgICAgIC8vIHNlbGVjdG9yIGNhbiBwcmVmZXIgY2FsbC1sZXZlbCBucyBvdmVyIHRoZSBib3VuZCBzY29wZU5zLlxuICAgICAgY29uc3QgZXhwbGljaXRDYWxsTnMgPSBvLm5zICE9PSB1bmRlZmluZWQgJiYgby5ucyAhPT0gbnVsbDtcbiAgICAgIG8ubnMgPSBvLm5zIHx8IGZpeGVkVC5ucztcbiAgICAgIGlmIChvLmtleVByZWZpeCAhPT0gJycpIG8ua2V5UHJlZml4ID0gby5rZXlQcmVmaXggfHwga2V5UHJlZml4IHx8IGZpeGVkVC5rZXlQcmVmaXg7XG5cbiAgICAgIC8vIGtleXNGcm9tU2VsZWN0b3IgbXVzdCBiZSBjYWxsZWQgYWZ0ZXIgby5ucyBpcyByZXNvbHZlZCBhYm92ZSwgc28gdGhhdCBuYW1lc3BhY2VcbiAgICAgIC8vIHJld3JpdGluZyB1c2VzIHRoZSBlZmZlY3RpdmUgbmFtZXNwYWNlIChlLmcuIHRoZSBvbmUgZml4ZWQgYnkgZ2V0Rml4ZWRUKSByYXRoZXJcbiAgICAgIC8vIHRoYW4gdGhlIHJhdyBnbG9iYWwgbnMgYXJyYXkgZnJvbSB0aGlzLm9wdGlvbnMuIFByZWNlZGVuY2UgZm9yIHNlbGVjdG9yXG4gICAgICAvLyBucy1kZXRlY3Rpb24gKGhpZ2hlc3QgZmlyc3QpOlxuICAgICAgLy8gICAxLiBgby5uc2AgaWYgdGhlIGNhbGxlciBwYXNzZWQgaXQgZXhwbGljaXRseSBvbiB0aGlzIGNhbGxcbiAgICAgIC8vICAgMi4gYHNjb3BlTnNgIGlmIHRoZSBib3VuZCB0IGNhcnJpZXMgaXQgKHRoZSBob29rJ3MgZnVsbCBucyBsaXN0KVxuICAgICAgLy8gICAzLiBgby5uc2AgcG9wdWxhdGVkIGZyb20gZml4ZWRULm5zIC8gdGhpcy5vcHRpb25zXG4gICAgICAvLyBUaGlzIGRlY291cGxlcyBzZWxlY3RvciBwYXRoWzBdIG1hdGNoaW5nIGZyb20gcmVzb2x1dGlvbiBzY29wZS4gYG8ubnNgXG4gICAgICAvLyBjb250aW51ZXMgdG8gZHJpdmUgYFRyYW5zbGF0b3IudHJhbnNsYXRlYCByZXNvbHV0aW9uIHVuY2hhbmdlZC5cbiAgICAgIGNvbnN0IHNlbGVjdG9yT3B0cyA9IHsgLi4udGhpcy5vcHRpb25zLCAuLi5vIH07XG4gICAgICBpZiAoQXJyYXkuaXNBcnJheShzY29wZU5zKSAmJiAhZXhwbGljaXRDYWxsTnMpIHNlbGVjdG9yT3B0cy5ucyA9IHNjb3BlTnM7XG4gICAgICBpZiAodHlwZW9mIG8ua2V5UHJlZml4ID09PSAnZnVuY3Rpb24nKSBvLmtleVByZWZpeCA9IGtleXNGcm9tU2VsZWN0b3Ioby5rZXlQcmVmaXgsIHNlbGVjdG9yT3B0cyk7XG4gICAgICBjb25zdCBrZXlTZXBhcmF0b3IgPSB0aGlzLm9wdGlvbnMua2V5U2VwYXJhdG9yIHx8ICcuJztcbiAgICAgIGxldCByZXN1bHRLZXlcbiAgICAgIGlmIChvLmtleVByZWZpeCAmJiBBcnJheS5pc0FycmF5KGtleSkpIHtcbiAgICAgICAgcmVzdWx0S2V5ID0ga2V5Lm1hcChrID0+IHtcbiAgICAgICAgICBpZiAodHlwZW9mIGsgPT09ICdmdW5jdGlvbicpIGsgPSBrZXlzRnJvbVNlbGVjdG9yKGssIHNlbGVjdG9yT3B0cyk7XG4gICAgICAgICAgcmV0dXJuIGAke28ua2V5UHJlZml4fSR7a2V5U2VwYXJhdG9yfSR7a31gXG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKHR5cGVvZiBrZXkgPT09ICdmdW5jdGlvbicpIGtleSA9IGtleXNGcm9tU2VsZWN0b3Ioa2V5LCBzZWxlY3Rvck9wdHMpO1xuICAgICAgICByZXN1bHRLZXkgPSBvLmtleVByZWZpeCA/IGAke28ua2V5UHJlZml4fSR7a2V5U2VwYXJhdG9yfSR7a2V5fWAgOiBrZXk7XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcy50KHJlc3VsdEtleSwgbyk7XG4gICAgfTtcbiAgICBpZiAoaXNTdHJpbmcobG5nKSkge1xuICAgICAgZml4ZWRULmxuZyA9IGxuZztcbiAgICB9IGVsc2Uge1xuICAgICAgZml4ZWRULmxuZ3MgPSBsbmc7XG4gICAgfVxuICAgIGZpeGVkVC5ucyA9IG5zO1xuICAgIGZpeGVkVC5rZXlQcmVmaXggPSBrZXlQcmVmaXg7XG4gICAgcmV0dXJuIGZpeGVkVDtcbiAgfVxuXG4gIHQoLi4uYXJncykge1xuICAgIGlmICghdGhpcy50cmFuc2xhdG9yKSB7XG4gICAgICB0aGlzLmxvZ2dlci53YXJuKCd0OiBjYWxsZWQgYmVmb3JlIGluaXQoKTsgcmV0dXJuaW5nIGFuIGVtcHR5IHN0cmluZycpO1xuICAgICAgcmV0dXJuICcnO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy50cmFuc2xhdG9yLnRyYW5zbGF0ZSguLi5hcmdzKTtcbiAgfVxuXG4gIGV4aXN0cyguLi5hcmdzKSB7XG4gICAgcmV0dXJuIHRoaXMudHJhbnNsYXRvcj8uZXhpc3RzKC4uLmFyZ3MpO1xuICB9XG5cbiAgc2V0RGVmYXVsdE5hbWVzcGFjZShucykge1xuICAgIHRoaXMub3B0aW9ucy5kZWZhdWx0TlMgPSBucztcbiAgfVxuXG4gIGhhc0xvYWRlZE5hbWVzcGFjZShucywgb3B0aW9ucyA9IHt9KSB7XG4gICAgaWYgKCF0aGlzLmlzSW5pdGlhbGl6ZWQpIHtcbiAgICAgIHRoaXMubG9nZ2VyLndhcm4oJ2hhc0xvYWRlZE5hbWVzcGFjZTogaTE4bmV4dCB3YXMgbm90IGluaXRpYWxpemVkJywgdGhpcy5sYW5ndWFnZXMpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBpZiAoIXRoaXMubGFuZ3VhZ2VzIHx8ICF0aGlzLmxhbmd1YWdlcy5sZW5ndGgpIHtcbiAgICAgIHRoaXMubG9nZ2VyLndhcm4oJ2hhc0xvYWRlZE5hbWVzcGFjZTogaTE4bi5sYW5ndWFnZXMgd2VyZSB1bmRlZmluZWQgb3IgZW1wdHknLCB0aGlzLmxhbmd1YWdlcyk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgY29uc3QgbG5nID0gb3B0aW9ucy5sbmcgfHwgdGhpcy5yZXNvbHZlZExhbmd1YWdlIHx8IHRoaXMubGFuZ3VhZ2VzWzBdO1xuICAgIGNvbnN0IGZhbGxiYWNrTG5nID0gdGhpcy5vcHRpb25zID8gdGhpcy5vcHRpb25zLmZhbGxiYWNrTG5nIDogZmFsc2U7XG4gICAgY29uc3QgbGFzdExuZyA9IHRoaXMubGFuZ3VhZ2VzW3RoaXMubGFuZ3VhZ2VzLmxlbmd0aCAtIDFdO1xuXG4gICAgLy8gd2UncmUgaW4gY2ltb2RlIHNvIHRoaXMgc2hhbGwgcGFzc1xuICAgIGlmIChsbmcudG9Mb3dlckNhc2UoKSA9PT0gJ2NpbW9kZScpIHJldHVybiB0cnVlO1xuXG4gICAgY29uc3QgbG9hZE5vdFBlbmRpbmcgPSAobCwgbikgPT4ge1xuICAgICAgY29uc3QgbG9hZFN0YXRlID0gdGhpcy5zZXJ2aWNlcy5iYWNrZW5kQ29ubmVjdG9yLnN0YXRlW2Ake2x9fCR7bn1gXTtcbiAgICAgIHJldHVybiBsb2FkU3RhdGUgPT09IC0xIHx8IGxvYWRTdGF0ZSA9PT0gMCB8fCBsb2FkU3RhdGUgPT09IDI7XG4gICAgfTtcblxuICAgIC8vIG9wdGlvbmFsIGluamVjdGVkIGNoZWNrXG4gICAgaWYgKG9wdGlvbnMucHJlY2hlY2spIHtcbiAgICAgIGNvbnN0IHByZVJlc3VsdCA9IG9wdGlvbnMucHJlY2hlY2sodGhpcywgbG9hZE5vdFBlbmRpbmcpO1xuICAgICAgaWYgKHByZVJlc3VsdCAhPT0gdW5kZWZpbmVkKSByZXR1cm4gcHJlUmVzdWx0O1xuICAgIH1cblxuICAgIC8vIGxvYWRlZCAtPiBTVUNDRVNTXG4gICAgaWYgKHRoaXMuaGFzUmVzb3VyY2VCdW5kbGUobG5nLCBucykpIHJldHVybiB0cnVlO1xuXG4gICAgLy8gd2VyZSBub3QgbG9hZGluZyBhdCBhbGwgLT4gU0VNSSBTVUNDRVNTXG4gICAgaWYgKCF0aGlzLnNlcnZpY2VzLmJhY2tlbmRDb25uZWN0b3IuYmFja2VuZCB8fCAodGhpcy5vcHRpb25zLnJlc291cmNlcyAmJiAhdGhpcy5vcHRpb25zLnBhcnRpYWxCdW5kbGVkTGFuZ3VhZ2VzKSkgcmV0dXJuIHRydWU7XG5cbiAgICAvLyBhIHBhc3NlZCBpbiBsbmcgaXMgYSByYXcgY29kZTogbG9hZExhbmd1YWdlcygpIHN0b3JlcyBpdCB1bmRlciBpdHMgcmVzb2x2ZWQgY29kZSAoZm9ybWF0dGVkLCByZWR1Y2VkXG4gICAgLy8gcGVyIGBsb2FkYCksIG9yIHNraXBzIGl0IGVudGlyZWx5IG91dHNpZGUgc3VwcG9ydGVkTG5ncyAtIGNoZWNraW5nIHRoZSByYXcgY29kZSB3b3VsZCB3YWl0IGZvcmV2ZXJcbiAgICBjb25zdCB7IGxhbmd1YWdlVXRpbHMgfSA9IHRoaXMuc2VydmljZXM7XG4gICAgY29uc3QgbG9hZExuZyA9ICFvcHRpb25zLmxuZyA/IGxuZyA6IGxhbmd1YWdlVXRpbHMuaXNTdXBwb3J0ZWRDb2RlKGxuZykgJiYgbGFuZ3VhZ2VVdGlscy50b1Jlc29sdmVIaWVyYXJjaHkobG5nLCBmYWxzZSlbMF07XG5cbiAgICAvLyBmYWlsZWQgbG9hZGluZyBucyAtIGJ1dCBhdCBsZWFzdCBmYWxsYmFjayBpcyBub3QgcGVuZGluZyAtPiBTRU1JIFNVQ0NFU1NcbiAgICBpZiAoKCFsb2FkTG5nIHx8IGxvYWROb3RQZW5kaW5nKGxvYWRMbmcsIG5zKSkgJiYgKCFmYWxsYmFja0xuZyB8fCBsb2FkTm90UGVuZGluZyhsYXN0TG5nLCBucykpKSByZXR1cm4gdHJ1ZTtcblxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGxvYWROYW1lc3BhY2VzKG5zLCBjYWxsYmFjaykge1xuICAgIGNvbnN0IGRlZmVycmVkID0gZGVmZXIoKTtcblxuICAgIC8vIGJlZm9yZSBpbml0KCkgKHJlYWN0LWkxOG5leHQncyB1c2VUcmFuc2xhdGlvbiBjYW4gY2FsbCBpdCB0aGVuKTogbm90aGluZyB0byBsb2FkIHlldCwgYXMgaW4gdjI2LFxuICAgIC8vIHdoZXJlIHRoZSBvcHRpb25zIG9mIGFuIGluc3RhbmNlIHdlcmUgZW1wdHkgdW50aWwgaW5pdCgpXG4gICAgaWYgKCF0aGlzLm9wdGlvbnMubnMgfHwgIXRoaXMuc2VydmljZXMuYmFja2VuZENvbm5lY3Rvcikge1xuICAgICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjaygpO1xuICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICAgIH1cbiAgICBpZiAoaXNTdHJpbmcobnMpKSBucyA9IFtuc107XG5cbiAgICBucy5mb3JFYWNoKG4gPT4ge1xuICAgICAgaWYgKCF0aGlzLm9wdGlvbnMubnMuaW5jbHVkZXMobikpIHRoaXMub3B0aW9ucy5ucy5wdXNoKG4pO1xuICAgIH0pO1xuXG4gICAgdGhpcy5sb2FkUmVzb3VyY2VzKGVyciA9PiB7XG4gICAgICBkZWZlcnJlZC5yZXNvbHZlKCk7XG4gICAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrKGVycik7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gZGVmZXJyZWQ7XG4gIH1cblxuICBsb2FkTGFuZ3VhZ2VzKGxuZ3MsIGNhbGxiYWNrKSB7XG4gICAgY29uc3QgZGVmZXJyZWQgPSBkZWZlcigpO1xuXG4gICAgaWYgKGlzU3RyaW5nKGxuZ3MpKSBsbmdzID0gW2xuZ3NdO1xuICAgIGNvbnN0IHByZWxvYWRlZCA9IHRoaXMub3B0aW9ucy5wcmVsb2FkIHx8IFtdO1xuXG4gICAgY29uc3QgbmV3TG5ncyA9IGxuZ3MuZmlsdGVyKGxuZyA9PiAhcHJlbG9hZGVkLmluY2x1ZGVzKGxuZykgJiYgIWlzUmVmdXNlZExhbmd1YWdlQ29kZSh0aGlzLCBsbmcpICYmIHRoaXMuc2VydmljZXMubGFuZ3VhZ2VVdGlscy5pc1N1cHBvcnRlZENvZGUobG5nKSk7XG4gICAgLy8gRXhpdCBlYXJseSBpZiBhbGwgZ2l2ZW4gbGFuZ3VhZ2VzIGFyZSBhbHJlYWR5IHByZWxvYWRlZFxuICAgIGlmICghbmV3TG5ncy5sZW5ndGgpIHtcbiAgICAgIGlmIChjYWxsYmFjaykgY2FsbGJhY2soKTtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcbiAgICB9XG5cbiAgICB0aGlzLm9wdGlvbnMucHJlbG9hZCA9IHByZWxvYWRlZC5jb25jYXQobmV3TG5ncyk7XG4gICAgdGhpcy5sb2FkUmVzb3VyY2VzKGVyciA9PiB7XG4gICAgICBkZWZlcnJlZC5yZXNvbHZlKCk7XG4gICAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrKGVycik7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gZGVmZXJyZWQ7XG4gIH1cblxuICBkaXIobG5nKSB7XG4gICAgaWYgKCFsbmcpIGxuZyA9IHRoaXMucmVzb2x2ZWRMYW5ndWFnZSB8fCAodGhpcy5sYW5ndWFnZXM/Lmxlbmd0aCA+IDAgPyB0aGlzLmxhbmd1YWdlc1swXSA6IHRoaXMubGFuZ3VhZ2UpO1xuICAgIGlmICghbG5nKSByZXR1cm4gJ2x0cic7XG5cbiAgICB0cnkge1xuICAgICAgY29uc3QgbCA9IG5ldyBJbnRsLkxvY2FsZShsbmcpXG4gICAgICBpZiAobCAmJiBsLmdldFRleHRJbmZvKSB7XG4gICAgICAgIGNvbnN0IHRpID0gbC5nZXRUZXh0SW5mbygpXG4gICAgICAgIGlmICh0aSAmJiB0aS5kaXJlY3Rpb24pIHJldHVybiB0aS5kaXJlY3Rpb25cbiAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7LyogZmFsbCB0aHJvdWdoICovfVxuXG4gICAgY29uc3QgcnRsTG5ncyA9IFtcbiAgICAgICdhcicsXG4gICAgICAnc2h1JyxcbiAgICAgICdzcXInLFxuICAgICAgJ3NzaCcsXG4gICAgICAneGFhJyxcbiAgICAgICd5aGQnLFxuICAgICAgJ3l1ZCcsXG4gICAgICAnYWFvJyxcbiAgICAgICdhYmgnLFxuICAgICAgJ2FidicsXG4gICAgICAnYWNtJyxcbiAgICAgICdhY3EnLFxuICAgICAgJ2FjdycsXG4gICAgICAnYWN4JyxcbiAgICAgICdhY3knLFxuICAgICAgJ2FkZicsXG4gICAgICAnYWRzJyxcbiAgICAgICdhZWInLFxuICAgICAgJ2FlYycsXG4gICAgICAnYWZiJyxcbiAgICAgICdhanAnLFxuICAgICAgJ2FwYycsXG4gICAgICAnYXBkJyxcbiAgICAgICdhcmInLFxuICAgICAgJ2FycScsXG4gICAgICAnYXJzJyxcbiAgICAgICdhcnknLFxuICAgICAgJ2FyeicsXG4gICAgICAnYXV6JyxcbiAgICAgICdhdmwnLFxuICAgICAgJ2F5aCcsXG4gICAgICAnYXlsJyxcbiAgICAgICdheW4nLFxuICAgICAgJ2F5cCcsXG4gICAgICAnYmJ6JyxcbiAgICAgICdwZ2EnLFxuICAgICAgJ2hlJyxcbiAgICAgICdpdycsXG4gICAgICAncHMnLFxuICAgICAgJ3BidCcsXG4gICAgICAncGJ1JyxcbiAgICAgICdwc3QnLFxuICAgICAgJ3BycCcsXG4gICAgICAncHJkJyxcbiAgICAgICd1ZycsXG4gICAgICAndXInLFxuICAgICAgJ3lkZCcsXG4gICAgICAneWRzJyxcbiAgICAgICd5aWgnLFxuICAgICAgJ2ppJyxcbiAgICAgICd5aScsXG4gICAgICAnaGJvJyxcbiAgICAgICdtZW4nLFxuICAgICAgJ3htbicsXG4gICAgICAnZmEnLFxuICAgICAgJ2pwcicsXG4gICAgICAncGVvJyxcbiAgICAgICdwZXMnLFxuICAgICAgJ3BycycsXG4gICAgICAnZHYnLFxuICAgICAgJ3NhbScsXG4gICAgICAnY2tiJ1xuICAgIF07XG5cbiAgICBjb25zdCBsYW5ndWFnZVV0aWxzID0gdGhpcy5zZXJ2aWNlcz8ubGFuZ3VhZ2VVdGlscyB8fCBuZXcgTGFuZ3VhZ2VVdGlscyhnZXREZWZhdWx0cygpKSAvLyBmb3IgdW5pbml0aWFsaXplZCB1c2FnZVxuICAgIGlmIChsbmcudG9Mb3dlckNhc2UoKS5pbmRleE9mKCctbGF0bicpID4gMSkgcmV0dXJuICdsdHInO1xuXG4gICAgcmV0dXJuIHJ0bExuZ3MuaW5jbHVkZXMobGFuZ3VhZ2VVdGlscy5nZXRMYW5ndWFnZVBhcnRGcm9tQ29kZShsbmcpKSB8fCBsbmcudG9Mb3dlckNhc2UoKS5pbmRleE9mKCctYXJhYicpID4gMVxuICAgICAgPyAncnRsJ1xuICAgICAgOiAnbHRyJztcbiAgfVxuXG4gIHN0YXRpYyBjcmVhdGVJbnN0YW5jZShvcHRpb25zID0ge30sIGNhbGxiYWNrKSB7XG4gICAgY29uc3QgaW5zdGFuY2UgPSBuZXcgSTE4bihvcHRpb25zLCBjYWxsYmFjaylcbiAgICBpbnN0YW5jZS5jcmVhdGVJbnN0YW5jZSA9IEkxOG4uY3JlYXRlSW5zdGFuY2U7XG4gICAgcmV0dXJuIGluc3RhbmNlO1xuICB9XG5cbiAgY2xvbmVJbnN0YW5jZShvcHRpb25zID0ge30sIGNhbGxiYWNrID0gbm9vcCkge1xuICAgIGNvbnN0IGZvcmtSZXNvdXJjZVN0b3JlID0gb3B0aW9ucy5mb3JrUmVzb3VyY2VTdG9yZTtcbiAgICBpZiAoZm9ya1Jlc291cmNlU3RvcmUpIHtcbiAgICAgIG9wdGlvbnMgPSB7IC4uLm9wdGlvbnMgfTtcbiAgICAgIGRlbGV0ZSBvcHRpb25zLmZvcmtSZXNvdXJjZVN0b3JlO1xuICAgIH1cbiAgICAvLyBwcmVsb2FkIGlzIG5vdCBpbmhlcml0ZWQ6IHRoZSBwYXJlbnQgYWxyZWFkeSBsb2FkZWQgaXQgaW50byB0aGUgc2hhcmVkIHN0b3JlLCBhbmQgcmUtcXVldWVpbmcgaXQgb24gZXZlcnkgY2xvbmUnc1xuICAgIC8vIGNoYW5nZUxhbmd1YWdlIGNvc3RzIGxhbmd1YWdlcyDDlyBuYW1lc3BhY2VzIHBlciBjYWxsIChodHRwczovL2dpdGh1Yi5jb20vaTE4bmV4dC9pMThuZXh0L2lzc3Vlcy8yNDUxKVxuICAgIGNvbnN0IG1lcmdlZE9wdGlvbnMgPSB7IC4uLnRoaXMub3B0aW9ucywgcHJlbG9hZDogZmFsc2UsIC4uLm9wdGlvbnMsIC4uLnsgaXNDbG9uZTogdHJ1ZSB9IH07XG4gICAgY29uc3QgY2xvbmUgPSBuZXcgSTE4bihtZXJnZWRPcHRpb25zKTtcbiAgICAvLyBhIGNsb25lIGxvZ3MgdGhyb3VnaCBpdHMgcGFyZW50J3MgbG9nZ2VyLCBvciBhIGNvcHkgb2YgaXQgd2l0aCBpdHMgb3duIGRlYnVnIG9yIHByZWZpeCAoaXRzXG4gICAgLy8gc2VydmljZXMsIHRyYW5zbGF0b3IgaW5jbHVkZWQsIGtlZXAgdGhlIHBhcmVudCdzLCBhcyBiZWZvcmUpXG4gICAgY2xvbmUubG9nZ2VyID0gb3B0aW9ucy5kZWJ1ZyAhPT0gdW5kZWZpbmVkIHx8IG9wdGlvbnMucHJlZml4ICE9PSB1bmRlZmluZWRcbiAgICAgID8gdGhpcy5sb2dnZXIuY2xvbmUob3B0aW9ucylcbiAgICAgIDogdGhpcy5sb2dnZXI7XG4gICAgY29uc3QgbWVtYmVyc1RvQ29weSA9IFsnc3RvcmUnLCAnbGFuZ3VhZ2UnXTtcbiAgICBtZW1iZXJzVG9Db3B5LmZvckVhY2gobSA9PiB7XG4gICAgICBjbG9uZVttXSA9IHRoaXNbbV07XG4gICAgfSk7XG4gICAgY2xvbmUuc2VydmljZXMgPSB7IC4uLnRoaXMuc2VydmljZXMgfTtcbiAgICAvLyBpdCBzZWVzIHdoYXQgaXRzIHBhcmVudCByZWdpc3RlcnMsIGFsc28gbGF0ZXI7IHdoYXQgaXQgcmVnaXN0ZXJzIGl0c2VsZiBzdGF5cyBpdHMgb3duXG4gICAgY2xvbmUuc2VydmljZXMucG9zdFByb2Nlc3NvcnMgPSBPYmplY3QuY3JlYXRlKHRoaXMuc2VydmljZXMucG9zdFByb2Nlc3NvcnMpO1xuICAgIGNsb25lLnNlcnZpY2VzLnV0aWxzID0ge1xuICAgICAgLi4uY2xvbmUuc2VydmljZXMudXRpbHMsXG4gICAgICBoYXNMb2FkZWROYW1lc3BhY2U6IGNsb25lLmhhc0xvYWRlZE5hbWVzcGFjZS5iaW5kKGNsb25lKSxcbiAgICAgIHJlbG9hZFJlc291cmNlczogY2xvbmUucmVsb2FkUmVzb3VyY2VzLmJpbmQoY2xvbmUpXG4gICAgfTtcbiAgICBpZiAoZm9ya1Jlc291cmNlU3RvcmUpIHtcbiAgICAgIC8vIGZhc3RlciB0aGFuIGNvbnN0IGNsb25lZERhdGEgPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KHRoaXMuc3RvcmUuZGF0YSkpXG4gICAgICBjb25zdCBjb3B5RGF0YSA9IG9iaiA9PiB7XG4gICAgICAgIGNvbnN0IGNvcGllZCA9IEFycmF5LmlzQXJyYXkob2JqKSA/IFsuLi5vYmpdIDogeyAuLi5vYmogfTtcbiAgICAgICAgT2JqZWN0LmtleXMoY29waWVkKS5mb3JFYWNoKGsgPT4ge1xuICAgICAgICAgIGlmIChjb3BpZWRba10gJiYgdHlwZW9mIGNvcGllZFtrXSA9PT0gJ29iamVjdCcpIGNvcGllZFtrXSA9IGNvcHlEYXRhKGNvcGllZFtrXSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gY29waWVkO1xuICAgICAgfTtcbiAgICAgIGNvbnN0IGNsb25lZERhdGEgPSBjb3B5RGF0YSh0aGlzLnN0b3JlLmRhdGEpO1xuICAgICAgY2xvbmUuc3RvcmUgPSBuZXcgUmVzb3VyY2VTdG9yZShjbG9uZWREYXRhLCBtZXJnZWRPcHRpb25zLCB0aGlzLmxvZ2dlcik7XG4gICAgICBjbG9uZS5zZXJ2aWNlcy5yZXNvdXJjZVN0b3JlID0gY2xvbmUuc3RvcmU7XG4gICAgfVxuICAgIC8vIEVuc3VyZSBpbnRlcnBvbGF0aW9uIG9wdGlvbnMgYXJlIGFsd2F5cyBtZXJnZWQgd2l0aCBkZWZhdWx0cyB3aGVuIGNsb25pbmdcbiAgICBpZiAob3B0aW9ucy5pbnRlcnBvbGF0aW9uKSB7XG4gICAgICBjb25zdCBkZWZPcHRzID0gZ2V0RGVmYXVsdHMoKTtcbiAgICAgIGNvbnN0IG1lcmdlZEludGVycG9sYXRpb24gPSB7IC4uLmRlZk9wdHMuaW50ZXJwb2xhdGlvbiwgLi4udGhpcy5vcHRpb25zLmludGVycG9sYXRpb24sIC4uLm9wdGlvbnMuaW50ZXJwb2xhdGlvbiB9O1xuICAgICAgY29uc3QgbWVyZ2VkRm9ySW50ZXJwb2xhdG9yID0geyAuLi5tZXJnZWRPcHRpb25zLCBpbnRlcnBvbGF0aW9uOiBtZXJnZWRJbnRlcnBvbGF0aW9uIH07XG4gICAgICBjbG9uZS5zZXJ2aWNlcy5pbnRlcnBvbGF0b3IgPSBuZXcgSW50ZXJwb2xhdG9yKG1lcmdlZEZvckludGVycG9sYXRvciwgdGhpcy5sb2dnZXIpO1xuICAgIH1cbiAgICAvLyB0aGUgY29kZXMgdGhlIHBhcmVudCB3YXMgY29uZmlndXJlZCB3aXRoIGF0IGl0cyBpbml0KCksIHBsdXMgdGhvc2UgaW4gdGhlIG9wdGlvbnMgZ2l2ZW4gaGVyZTsgbm90IHRoZVxuICAgIC8vIGxhbmd1YWdlcyBhZGRlZCB0byB0aGUgc2hhcmVkIHN0b3JlIHNpbmNlXG4gICAgY2xvbmUuY29uZmlndXJlZExuZ3MgPSBuZXcgU2V0KFsuLi4odGhpcy5jb25maWd1cmVkTG5ncyB8fCBbXSksIC4uLmNvbmZpZ3VyZWRMYW5ndWFnZUNvZGVzKG9wdGlvbnMpXSk7XG4gICAgY2xvbmUudHJhbnNsYXRvciA9IG5ldyBUcmFuc2xhdG9yKGNsb25lLnNlcnZpY2VzLCBtZXJnZWRPcHRpb25zKTtcbiAgICBjbG9uZS50cmFuc2xhdG9yLm9uKCcqJywgKGV2ZW50LCAuLi5hcmdzKSA9PiB7XG4gICAgICBjbG9uZS5lbWl0KGV2ZW50LCAuLi5hcmdzKTtcbiAgICB9KTtcbiAgICBjbG9uZS5pbml0KG1lcmdlZE9wdGlvbnMsIGNhbGxiYWNrKTtcbiAgICBjbG9uZS50cmFuc2xhdG9yLm9wdGlvbnMgPSBtZXJnZWRPcHRpb25zOyAvLyBzeW5jIG9wdGlvbnNcbiAgICAvLyBkaXJlY3QgY2FsbGVycyBvZiB0aGUgc2hhcmVkIGNvbm5lY3RvcidzIHNhdmVNaXNzaW5nKCkgKGkxOG5leHQtaHR0cC1taWRkbGV3YXJlJ3MgbWlzc2luZyBrZXlzIHJvdXRlKVxuICAgIC8vIGtlZXAgY2hlY2tpbmcgdGhlIG5ld2VzdCBjbG9uZSwgYXMgYmVmb3JlOyB0aGUgdHJhbnNsYXRvcnMgcGFzcyB0aGUgY2hlY2sgb2YgdGhlaXIgb3duIGluc3RhbmNlXG4gICAgY2xvbmUudHJhbnNsYXRvci5iYWNrZW5kQ29ubmVjdG9yLm5ld2VzdENsb25lSGFzTG9hZGVkTmFtZXNwYWNlID0gY2xvbmUuaGFzTG9hZGVkTmFtZXNwYWNlLmJpbmQoY2xvbmUpO1xuXG4gICAgcmV0dXJuIGNsb25lO1xuICB9XG5cbiAgdG9KU09OKCkge1xuICAgIHJldHVybiB7XG4gICAgICBvcHRpb25zOiB0aGlzLm9wdGlvbnMsXG4gICAgICBzdG9yZTogdGhpcy5zdG9yZSxcbiAgICAgIGxhbmd1YWdlOiB0aGlzLmxhbmd1YWdlLFxuICAgICAgbGFuZ3VhZ2VzOiB0aGlzLmxhbmd1YWdlcyxcbiAgICAgIHJlc29sdmVkTGFuZ3VhZ2U6IHRoaXMucmVzb2x2ZWRMYW5ndWFnZVxuICAgIH07XG4gIH1cbn1cblxuY29uc3QgaW5zdGFuY2UgPSBJMThuLmNyZWF0ZUluc3RhbmNlKCk7XG5cbmV4cG9ydCBkZWZhdWx0IGluc3RhbmNlO1xuIiwiaW1wb3J0IGkxOG5leHQgZnJvbSAnLi9pMThuZXh0LmpzJztcblxuZXhwb3J0IHsgZGVmYXVsdCBhcyBrZXlGcm9tU2VsZWN0b3IgfSBmcm9tICcuL3NlbGVjdG9yLmpzJztcbmV4cG9ydCB7IGlzU2FmZUxhbmd1YWdlQ29kZSB9IGZyb20gJy4vdXRpbHMuanMnO1xuXG5leHBvcnQgZGVmYXVsdCBpMThuZXh0O1xuXG5leHBvcnQgY29uc3QgY3JlYXRlSW5zdGFuY2UgPSBpMThuZXh0LmNyZWF0ZUluc3RhbmNlO1xuXG5leHBvcnQgY29uc3QgZGlyID0gaTE4bmV4dC5kaXI7XG5leHBvcnQgY29uc3QgaW5pdCA9IGkxOG5leHQuaW5pdDtcbmV4cG9ydCBjb25zdCBsb2FkUmVzb3VyY2VzID0gaTE4bmV4dC5sb2FkUmVzb3VyY2VzO1xuZXhwb3J0IGNvbnN0IHJlbG9hZFJlc291cmNlcyA9IGkxOG5leHQucmVsb2FkUmVzb3VyY2VzO1xuZXhwb3J0IGNvbnN0IHVzZSA9IGkxOG5leHQudXNlO1xuZXhwb3J0IGNvbnN0IGNoYW5nZUxhbmd1YWdlID0gaTE4bmV4dC5jaGFuZ2VMYW5ndWFnZTtcbmV4cG9ydCBjb25zdCBnZXRGaXhlZFQgPSBpMThuZXh0LmdldEZpeGVkVDtcbmV4cG9ydCBjb25zdCB0ID0gaTE4bmV4dC50O1xuZXhwb3J0IGNvbnN0IGV4aXN0cyA9IGkxOG5leHQuZXhpc3RzO1xuZXhwb3J0IGNvbnN0IHNldERlZmF1bHROYW1lc3BhY2UgPSBpMThuZXh0LnNldERlZmF1bHROYW1lc3BhY2U7XG5leHBvcnQgY29uc3QgaGFzTG9hZGVkTmFtZXNwYWNlID0gaTE4bmV4dC5oYXNMb2FkZWROYW1lc3BhY2U7XG5leHBvcnQgY29uc3QgbG9hZE5hbWVzcGFjZXMgPSBpMThuZXh0LmxvYWROYW1lc3BhY2VzO1xuZXhwb3J0IGNvbnN0IGxvYWRMYW5ndWFnZXMgPSBpMThuZXh0LmxvYWRMYW5ndWFnZXM7XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1uYW1lc3BhY2UsXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueSxcbiAqL1xuXG5pbXBvcnQge1xuICAgIGRlZmF1bHQgYXMgaTE4bmV4dCxcbiAgICB0eXBlIGkxOG4gYXMgaTE4bmV4dEluc3RhbmNlLFxuICAgIHR5cGUgRmFsbGJhY2tMbmdPYmpMaXN0IGFzIGkxOG5leHRGYWxsYmFja0xuZ09iakxpc3QsXG4gICAgdHlwZSBGYWxsYmFja0xuZyBhcyBpMThuZXh0RmFsbGJhY2tMbmcsXG4gICAgdHlwZSBJbnRlcnBvbGF0aW9uT3B0aW9ucyBhcyBpMThuZXh0SW50ZXJwb2xhdGlvbk9wdGlvbnMsXG4gICAgdHlwZSBSZWFjdE9wdGlvbnMgYXMgaTE4bmV4dFJlYWN0T3B0aW9ucyxcbiAgICB0eXBlIEluaXRPcHRpb25zIGFzIGkxOG5leHRJbml0T3B0aW9ucyxcbiAgICB0eXBlIFRPcHRpb25zQmFzZSBhcyBpMThuZXh0VE9wdGlvbnNCYXNlLFxuICAgIHR5cGUgVE9wdGlvbnMgYXMgaTE4bmV4dFRPcHRpb25zLFxuICAgIHR5cGUgRXhpc3RzRnVuY3Rpb24gYXMgaTE4bmV4dEV4aXN0c0Z1bmN0aW9uLFxuICAgIHR5cGUgV2l0aFQgYXMgaTE4bmV4dFdpdGhULFxuICAgIHR5cGUgVEZ1bmN0aW9uIGFzIGkxOG5leHRURnVuY3Rpb24sXG4gICAgdHlwZSBSZXNvdXJjZSBhcyBpMThuZXh0UmVzb3VyY2UsXG4gICAgdHlwZSBSZXNvdXJjZUxhbmd1YWdlIGFzIGkxOG5leHRSZXNvdXJjZUxhbmd1YWdlLFxuICAgIHR5cGUgUmVzb3VyY2VLZXkgYXMgaTE4bmV4dFJlc291cmNlS2V5LFxuICAgIHR5cGUgSW50ZXJwb2xhdG9yIGFzIGkxOG5leHRJbnRlcnBvbGF0b3IsXG4gICAgdHlwZSBSZXNvdXJjZVN0b3JlIGFzIGkxOG5leHRSZXNvdXJjZVN0b3JlLFxuICAgIHR5cGUgU2VydmljZXMgYXMgaTE4bmV4dFNlcnZpY2VzLFxuICAgIHR5cGUgTW9kdWxlIGFzIGkxOG5leHRNb2R1bGUsXG4gICAgdHlwZSBDYWxsYmFja0Vycm9yIGFzIGkxOG5leHRDYWxsYmFja0Vycm9yLFxuICAgIHR5cGUgUmVhZENhbGxiYWNrIGFzIGkxOG5leHRSZWFkQ2FsbGJhY2ssXG4gICAgdHlwZSBNdWx0aVJlYWRDYWxsYmFjayBhcyBpMThuZXh0TXVsdGlSZWFkQ2FsbGJhY2ssXG4gICAgdHlwZSBCYWNrZW5kTW9kdWxlIGFzIGkxOG5leHRCYWNrZW5kTW9kdWxlLFxuICAgIHR5cGUgTGFuZ3VhZ2VEZXRlY3Rvck1vZHVsZSBhcyBpMThuZXh0TGFuZ3VhZ2VEZXRlY3Rvck1vZHVsZSxcbiAgICB0eXBlIExhbmd1YWdlRGV0ZWN0b3JBc3luY01vZHVsZSBhcyBpMThuZXh0TGFuZ3VhZ2VEZXRlY3RvckFzeW5jTW9kdWxlLFxuICAgIHR5cGUgUG9zdFByb2Nlc3Nvck1vZHVsZSBhcyBpMThuZXh0UG9zdFByb2Nlc3Nvck1vZHVsZSxcbiAgICB0eXBlIExvZ2dlck1vZHVsZSBhcyBpMThuZXh0TG9nZ2VyTW9kdWxlLFxuICAgIHR5cGUgSTE4bkZvcm1hdE1vZHVsZSBhcyBpMThuZXh0STE4bkZvcm1hdE1vZHVsZSxcbiAgICB0eXBlIFRoaXJkUGFydHlNb2R1bGUgYXMgaTE4bmV4dFRoaXJkUGFydHlNb2R1bGUsXG4gICAgdHlwZSBNb2R1bGVzIGFzIGkxOG5leHRNb2R1bGVzLFxuICAgIHR5cGUgTmV3YWJsZSBhcyBpMThuZXh0TmV3YWJsZSxcbn0gZnJvbSAnaTE4bmV4dCc7XG5cbmNvbnN0IGkxOG46IGkxOG4uaTE4biA9IGkxOG5leHQ7XG5cbmRlY2xhcmUgbmFtZXNwYWNlIGkxOG4ge1xuICAgIGV4cG9ydCB0eXBlIGkxOG4gPSBpMThuZXh0SW5zdGFuY2U7XG4gICAgZXhwb3J0IHR5cGUgRmFsbGJhY2tMbmdPYmpMaXN0ID0gaTE4bmV4dEZhbGxiYWNrTG5nT2JqTGlzdDtcbiAgICBleHBvcnQgdHlwZSBGYWxsYmFja0xuZyA9IGkxOG5leHRGYWxsYmFja0xuZztcbiAgICBleHBvcnQgdHlwZSBJbnRlcnBvbGF0aW9uT3B0aW9ucyA9IGkxOG5leHRJbnRlcnBvbGF0aW9uT3B0aW9ucztcbiAgICBleHBvcnQgdHlwZSBSZWFjdE9wdGlvbnMgPSBpMThuZXh0UmVhY3RPcHRpb25zO1xuICAgIGV4cG9ydCB0eXBlIEluaXRPcHRpb25zID0gaTE4bmV4dEluaXRPcHRpb25zO1xuICAgIGV4cG9ydCB0eXBlIFRPcHRpb25zQmFzZSA9IGkxOG5leHRUT3B0aW9uc0Jhc2U7XG4gICAgZXhwb3J0IHR5cGUgVE9wdGlvbnM8VCBleHRlbmRzIFJlY29yZDxzdHJpbmcsIHVua25vd24+ID0gUmVjb3JkPHN0cmluZywgYW55Pj4gPSBpMThuZXh0VE9wdGlvbnM8VD47XG4gICAgZXhwb3J0IHR5cGUgRXhpc3RzRnVuY3Rpb248SyBleHRlbmRzIHN0cmluZyA9IHN0cmluZywgVCBleHRlbmRzIFJlY29yZDxzdHJpbmcsIHVua25vd24+ID0gUmVjb3JkPHN0cmluZywgYW55Pj4gPSBpMThuZXh0RXhpc3RzRnVuY3Rpb248SywgVD47XG4gICAgZXhwb3J0IHR5cGUgV2l0aFQgPSBpMThuZXh0V2l0aFQ7XG4gICAgZXhwb3J0IHR5cGUgVEZ1bmN0aW9uID0gaTE4bmV4dFRGdW5jdGlvbjtcbiAgICBleHBvcnQgdHlwZSBSZXNvdXJjZSA9IGkxOG5leHRSZXNvdXJjZTtcbiAgICBleHBvcnQgdHlwZSBSZXNvdXJjZUxhbmd1YWdlID0gaTE4bmV4dFJlc291cmNlTGFuZ3VhZ2U7XG4gICAgZXhwb3J0IHR5cGUgUmVzb3VyY2VLZXkgPSBpMThuZXh0UmVzb3VyY2VLZXk7XG4gICAgZXhwb3J0IHR5cGUgSW50ZXJwb2xhdG9yID0gaTE4bmV4dEludGVycG9sYXRvcjtcbiAgICBleHBvcnQgdHlwZSBSZXNvdXJjZVN0b3JlID0gaTE4bmV4dFJlc291cmNlU3RvcmU7XG4gICAgZXhwb3J0IHR5cGUgU2VydmljZXMgPSBpMThuZXh0U2VydmljZXM7XG4gICAgZXhwb3J0IHR5cGUgTW9kdWxlID0gaTE4bmV4dE1vZHVsZTtcbiAgICBleHBvcnQgdHlwZSBDYWxsYmFja0Vycm9yID0gaTE4bmV4dENhbGxiYWNrRXJyb3I7XG4gICAgZXhwb3J0IHR5cGUgUmVhZENhbGxiYWNrID0gaTE4bmV4dFJlYWRDYWxsYmFjaztcbiAgICBleHBvcnQgdHlwZSBNdWx0aVJlYWRDYWxsYmFjayA9IGkxOG5leHRNdWx0aVJlYWRDYWxsYmFjaztcbiAgICBleHBvcnQgdHlwZSBCYWNrZW5kTW9kdWxlPFQgPSBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPj4gPSBpMThuZXh0QmFja2VuZE1vZHVsZTxUPjtcbiAgICBleHBvcnQgdHlwZSBMYW5ndWFnZURldGVjdG9yTW9kdWxlID0gaTE4bmV4dExhbmd1YWdlRGV0ZWN0b3JNb2R1bGU7XG4gICAgZXhwb3J0IHR5cGUgTGFuZ3VhZ2VEZXRlY3RvckFzeW5jTW9kdWxlID0gaTE4bmV4dExhbmd1YWdlRGV0ZWN0b3JBc3luY01vZHVsZTtcbiAgICBleHBvcnQgdHlwZSBQb3N0UHJvY2Vzc29yTW9kdWxlID0gaTE4bmV4dFBvc3RQcm9jZXNzb3JNb2R1bGU7XG4gICAgZXhwb3J0IHR5cGUgTG9nZ2VyTW9kdWxlID0gaTE4bmV4dExvZ2dlck1vZHVsZTtcbiAgICBleHBvcnQgdHlwZSBJMThuRm9ybWF0TW9kdWxlID0gaTE4bmV4dEkxOG5Gb3JtYXRNb2R1bGU7XG4gICAgZXhwb3J0IHR5cGUgVGhpcmRQYXJ0eU1vZHVsZSA9IGkxOG5leHRUaGlyZFBhcnR5TW9kdWxlO1xuICAgIGV4cG9ydCB0eXBlIE1vZHVsZXMgPSBpMThuZXh0TW9kdWxlcztcbiAgICBleHBvcnQgdHlwZSBOZXdhYmxlPFQ+ID0gaTE4bmV4dE5ld2FibGU8VD47XG59XG5cbmV4cG9ydCB7IGkxOG4gfTtcbiJdLCJuYW1lcyI6WyJ1dGlsc0NvcHkiLCJlc2NhcGUiLCJ1dGlsc0VzY2FwZSIsImdldERlZmF1bHRzIiwiTGFuZ3VhZ2VVdGlscyIsIkJhY2tlbmRDb25uZWN0b3IiLCJpMThuZXh0Il0sIm1hcHBpbmdzIjoiOzs7OztBQUFPLE1BQU0sUUFBUSxHQUFHLENBQUMsR0FBRyxLQUFLLE9BQU8sR0FBRyxLQUFLLFFBQVE7O0FBRXhEO0FBQ08sTUFBTSxLQUFLLEdBQUcsTUFBTTtBQUMzQixFQUFFLElBQUksR0FBRztBQUNULEVBQUUsSUFBSSxHQUFHOztBQUVULEVBQUUsTUFBTSxPQUFPLEdBQUcsSUFBSSxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsTUFBTSxLQUFLO0FBQ25ELElBQUksR0FBRyxHQUFHLE9BQU87QUFDakIsSUFBSSxHQUFHLEdBQUcsTUFBTTtBQUNoQixFQUFFLENBQUMsQ0FBQzs7QUFFSixFQUFFLE9BQU8sQ0FBQyxPQUFPLEdBQUcsR0FBRztBQUN2QixFQUFFLE9BQU8sQ0FBQyxNQUFNLEdBQUcsR0FBRzs7QUFFdEIsRUFBRSxPQUFPLE9BQU87QUFDaEIsQ0FBQzs7QUFFTSxNQUFNLFVBQVUsR0FBRyxDQUFDLE1BQU0sS0FBSztBQUN0QyxFQUFFLElBQUksTUFBTSxJQUFJLElBQUksRUFBRSxPQUFPLEVBQUU7QUFDL0IsRUFBRSxPQUFPLE1BQU0sQ0FBQyxNQUFNLENBQUM7QUFDdkIsQ0FBQzs7QUFFRDtBQUNBO0FBQ0E7QUFDTyxNQUFNLGtCQUFrQixHQUFHLENBQUMsSUFBSTtBQUN2QyxFQUFFLFFBQVEsQ0FBQyxJQUFJLENBQUM7QUFDaEIsRUFBRSwwQkFBMEIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO0FBQ3ZDLEVBQUUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQztBQUN0QixFQUFFLENBQUMsQ0FBQyxXQUFXLEVBQUUsYUFBYSxFQUFFLFdBQVcsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUM7O0FBRTNEO0FBQ0E7QUFDTyxNQUFNLGFBQWEsR0FBRyxDQUFDLE1BQU0sS0FBSyxNQUFNLEVBQUUsV0FBVyxJQUFJLE1B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RUFBRSxLQUFLLENBQUMsR0FBRyxJQUFJLEVBQUU7QUFDakIsSUFBSSxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxFQUFFLENBQUM7QUFDMUMsRUFBRTs7QUFFRixFQUFFLFNBQVMsQ0FBQyxHQUFHLElBQUksRUFBRTtBQUNyQixJQUFJLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLHNCQUFzQixFQUFFLElBQUksQ0FBQztBQUNuRSxFQUFFOztBQUVGO0FBQ0EsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLElBQUksRUFBRTtBQUMxQixJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLElBQUksRUFBRSxPQUFPLElBQUk7QUFDaEYsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUM7QUFDdEIsSUFBSSxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQztBQUM3QixFQUFFOztBQUVGLEVBQUUsT0FBTyxDQUFDLElBQUksRUFBRSxHQUFHLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRTtBQUN4QyxJQUFJLElBQUksU0FBUyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxPQUFPLElBQUk7QUFDN0M7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFJLElBQUksR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxNQUFNLFFBQVEsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLHNCQUFzQixFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBQ3RGLElBQUksSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENB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