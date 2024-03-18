/*!
 * @cdp/extension-i18n 0.9.18
 *   extension for internationalization
 */

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
    if (console && console[type]) console[type].apply(console, args);
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
    if (typeof args[0] === 'string') args[0] = `${prefix}${this.prefix} ${args[0]}`;
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
          observer.apply(observer, [event, ...args]);
        }
      });
    }
  }
}

// http://lea.verou.me/2016/12/resolve-promises-externally-with-this-one-weird-trick/
function defer() {
  let res;
  let rej;

  const promise = new Promise((resolve, reject) => {
    res = resolve;
    rej = reject;
  });

  promise.resolve = res;
  promise.reject = rej;

  return promise;
}

function makeString(object) {
  if (object == null) return '';
  /* eslint prefer-template: 0 */
  return '' + object;
}

function copy(a, s, t) {
  a.forEach((m) => {
    if (s[m]) t[m] = s[m];
  });
}

// We extract out the RegExp definition to improve performance with React Native Android, which has poor RegExp
// initialization performance
const lastOfPathSeparatorRegExp = /###/g;

function getLastOfPath(object, path, Empty) {
  function cleanKey(key) {
    return key && key.indexOf('###') > -1 ? key.replace(lastOfPathSeparatorRegExp, '.') : key;
  }

  function canNotTraverseDeeper() {
    return !object || typeof object === 'string';
  }

  const stack = typeof path !== 'string' ? path : path.split('.');
  let stackIndex = 0;
  // iterate through the stack, but leave the last item
  while (stackIndex < stack.length - 1) {
    if (canNotTraverseDeeper()) return {};

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

  if (canNotTraverseDeeper()) return {};
  return {
    obj: object,
    k: cleanKey(stack[stackIndex]),
  };
}

function setPath(object, path, newValue) {
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
    if (last && last.obj && typeof last.obj[`${last.k}.${e}`] !== 'undefined') {
      last.obj = undefined;
    }
  }
  last.obj[`${last.k}.${e}`] = newValue;
}

function pushPath(object, path, newValue, concat) {
  const { obj, k } = getLastOfPath(object, path, Object);

  obj[k] = obj[k] || [];
  if (concat) obj[k] = obj[k].concat(newValue);
  if (!concat) obj[k].push(newValue);
}

function getPath(object, path) {
  const { obj, k } = getLastOfPath(object, path);

  if (!obj) return undefined;
  return obj[k];
}

function getPathWithDefaults(data, defaultData, key) {
  const value = getPath(data, key);
  if (value !== undefined) {
    return value;
  }
  // Fallback to default values
  return getPath(defaultData, key);
}

function deepExtend(target, source, overwrite) {
  /* eslint no-restricted-syntax: 0 */
  for (const prop in source) {
    if (prop !== '__proto__' && prop !== 'constructor') {
      if (prop in target) {
        // If we reached a leaf string in target or source then replace with source or skip depending on the 'overwrite' switch
        if (
          typeof target[prop] === 'string' ||
          target[prop] instanceof String ||
          typeof source[prop] === 'string' ||
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
}

function regexEscape(str) {
  /* eslint no-useless-escape: 0 */
  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
}

/* eslint-disable */
var _entityMap = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '/': '&#x2F;',
};
/* eslint-enable */

function escape(data) {
  if (typeof data === 'string') {
    return data.replace(/[&<>"'\/]/g, (s) => _entityMap[s]);
  }

  return data;
}

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

function looksLikeObjectPath(key, nsSeparator, keySeparator) {
  nsSeparator = nsSeparator || '';
  keySeparator = keySeparator || '';
  const possibleChars = chars.filter(
    (c) => nsSeparator.indexOf(c) < 0 && keySeparator.indexOf(c) < 0,
  );
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
}

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
function deepFind(obj, path, keySeparator = '.') {
  if (!obj) return undefined;
  if (obj[path]) return obj[path];
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
        if (['string', 'number', 'boolean'].indexOf(typeof next) > -1 && j < tokens.length - 1) {
          continue;
        }
        i += j - i + 1;
        break;
      }
    }
    current = next;
  }
  return current;
}

function getCleanedCode(code) {
  if (code && code.indexOf('_') > 0) return code.replace('_', '-');
  return code;
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
    if (this.options.ns.indexOf(ns) < 0) {
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
    if (lng.indexOf('.') > -1) {
      path = lng.split('.');
    } else {
      path = [lng, ns];
      if (key) {
        if (Array.isArray(key)) {
          path.push(...key);
        } else if (typeof key === 'string' && keySeparator) {
          path.push(...key.split(keySeparator));
        } else {
          path.push(key);
        }
      }
    }

    const result = getPath(this.data, path);
    if (!result && !ns && !key && lng.indexOf('.') > -1) {
      lng = path[0];
      ns = path[1];
      key = path.slice(2).join('.');
    }
    if (result || !ignoreJSONStructure || typeof key !== 'string') return result;

    return deepFind(this.data && this.data[lng] && this.data[lng][ns], key, keySeparator);
  }

  addResource(lng, ns, key, value, options = { silent: false }) {
    const keySeparator =
      options.keySeparator !== undefined ? options.keySeparator : this.options.keySeparator;

    let path = [lng, ns];
    if (key) path = path.concat(keySeparator ? key.split(keySeparator) : key);

    if (lng.indexOf('.') > -1) {
      path = lng.split('.');
      value = ns;
      ns = path[1];
    }

    this.addNamespaces(ns);

    setPath(this.data, path, value);

    if (!options.silent) this.emit('added', lng, ns, key, value);
  }

  addResources(lng, ns, resources, options = { silent: false }) {
    /* eslint no-restricted-syntax: 0 */
    for (const m in resources) {
      if (
        typeof resources[m] === 'string' ||
        Object.prototype.toString.apply(resources[m]) === '[object Array]'
      )
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
    if (lng.indexOf('.') > -1) {
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

    // COMPATIBILITY: remove extend in v2.1.0
    if (this.options.compatibilityAPI === 'v1') return { ...{}, ...this.getResource(lng, ns) };

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
      if (this.processors[processor])
        value = this.processors[processor].process(value, key, options, translator);
    });

    return value;
  },
};

const checkedLoadedFor = {};

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
  }

  changeLanguage(lng) {
    if (lng) this.language = lng;
  }

  exists(key, options = { interpolation: {} }) {
    if (key === undefined || key === null) {
      return false;
    }

    const resolved = this.resolve(key, options);
    return resolved && resolved.res !== undefined;
  }

  extractFromKey(key, options) {
    let nsSeparator =
      options.nsSeparator !== undefined ? options.nsSeparator : this.options.nsSeparator;
    if (nsSeparator === undefined) nsSeparator = ':';

    const keySeparator =
      options.keySeparator !== undefined ? options.keySeparator : this.options.keySeparator;

    let namespaces = options.ns || this.options.defaultNS || [];
    const wouldCheckForNsInKey = nsSeparator && key.indexOf(nsSeparator) > -1;
    const seemsNaturalLanguage =
      !this.options.userDefinedKeySeparator &&
      !options.keySeparator &&
      !this.options.userDefinedNsSeparator &&
      !options.nsSeparator &&
      !looksLikeObjectPath(key, nsSeparator, keySeparator);
    if (wouldCheckForNsInKey && !seemsNaturalLanguage) {
      const m = key.match(this.interpolator.nestingRegexp);
      if (m && m.length > 0) {
        return {
          key,
          namespaces,
        };
      }
      const parts = key.split(nsSeparator);
      if (
        nsSeparator !== keySeparator ||
        (nsSeparator === keySeparator && this.options.ns.indexOf(parts[0]) > -1)
      )
        namespaces = parts.shift();
      key = parts.join(keySeparator);
    }
    if (typeof namespaces === 'string') namespaces = [namespaces];

    return {
      key,
      namespaces,
    };
  }

  translate(keys, options, lastKey) {
    if (typeof options !== 'object' && this.options.overloadTranslationOptionHandler) {
      /* eslint prefer-rest-params: 0 */
      options = this.options.overloadTranslationOptionHandler(arguments);
    }
    if (typeof options === 'object') options = { ...options };
    if (!options) options = {};

    // non valid keys handling
    if (keys === undefined || keys === null /* || keys === '' */) return '';
    if (!Array.isArray(keys)) keys = [String(keys)];

    const returnDetails =
      options.returnDetails !== undefined ? options.returnDetails : this.options.returnDetails;

    // separators
    const keySeparator =
      options.keySeparator !== undefined ? options.keySeparator : this.options.keySeparator;

    // get namespace(s)
    const { key, namespaces } = this.extractFromKey(keys[keys.length - 1], options);
    const namespace = namespaces[namespaces.length - 1];

    // return key on CIMode
    const lng = options.lng || this.language;
    const appendNamespaceToCIMode =
      options.appendNamespaceToCIMode || this.options.appendNamespaceToCIMode;
    if (lng && lng.toLowerCase() === 'cimode') {
      if (appendNamespaceToCIMode) {
        const nsSeparator = options.nsSeparator || this.options.nsSeparator;
        if (returnDetails) {
          return {
            res: `${namespace}${nsSeparator}${key}`,
            usedKey: key,
            exactUsedKey: key,
            usedLng: lng,
            usedNS: namespace,
            usedParams: this.getUsedParamsDetails(options),
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
          usedParams: this.getUsedParamsDetails(options),
        };
      }
      return key;
    }

    // resolve from store
    const resolved = this.resolve(keys, options);
    let res = resolved && resolved.res;
    const resUsedKey = (resolved && resolved.usedKey) || key;
    const resExactUsedKey = (resolved && resolved.exactUsedKey) || key;

    const resType = Object.prototype.toString.apply(res);
    const noObject = ['[object Number]', '[object Function]', '[object RegExp]'];
    const joinArrays =
      options.joinArrays !== undefined ? options.joinArrays : this.options.joinArrays;

    // object
    const handleAsObjectInI18nFormat = !this.i18nFormat || this.i18nFormat.handleAsObject;
    const handleAsObject =
      typeof res !== 'string' && typeof res !== 'boolean' && typeof res !== 'number';
    if (
      handleAsObjectInI18nFormat &&
      res &&
      handleAsObject &&
      noObject.indexOf(resType) < 0 &&
      !(typeof joinArrays === 'string' && resType === '[object Array]')
    ) {
      if (!options.returnObjects && !this.options.returnObjects) {
        if (!this.options.returnedObjectHandler) {
          this.logger.warn('accessing an object - but returnObjects options is not enabled!');
        }
        const r = this.options.returnedObjectHandler
          ? this.options.returnedObjectHandler(resUsedKey, res, { ...options, ns: namespaces })
          : `key '${key} (${this.language})' returned an object instead of string.`;
        if (returnDetails) {
          resolved.res = r;
          resolved.usedParams = this.getUsedParamsDetails(options);
          return resolved;
        }
        return r;
      }

      // if we got a separator we loop over children - else we just return object as is
      // as having it set to false means no hierarchy so no lookup for nested values
      if (keySeparator) {
        const resTypeIsArray = resType === '[object Array]';
        const copy = resTypeIsArray ? [] : {}; // apply child translation on a copy

        /* eslint no-restricted-syntax: 0 */
        const newKeyToUse = resTypeIsArray ? resExactUsedKey : resUsedKey;
        for (const m in res) {
          if (Object.prototype.hasOwnProperty.call(res, m)) {
            const deepKey = `${newKeyToUse}${keySeparator}${m}`;
            copy[m] = this.translate(deepKey, {
              ...options,
              ...{ joinArrays: false, ns: namespaces },
            });
            if (copy[m] === deepKey) copy[m] = res[m]; // if nothing found use original value as fallback
          }
        }
        res = copy;
      }
    } else if (
      handleAsObjectInI18nFormat &&
      typeof joinArrays === 'string' &&
      resType === '[object Array]'
    ) {
      // array special treatment
      res = res.join(joinArrays);
      if (res) res = this.extendTranslation(res, keys, options, lastKey);
    } else {
      // string, empty or null
      let usedDefault = false;
      let usedKey = false;

      const needsPluralHandling = options.count !== undefined && typeof options.count !== 'string';
      const hasDefaultValue = Translator.hasDefaultValue(options);
      const defaultValueSuffix = needsPluralHandling
        ? this.pluralResolver.getSuffix(lng, options.count, options)
        : '';
      const defaultValueSuffixOrdinalFallback =
        options.ordinal && needsPluralHandling
          ? this.pluralResolver.getSuffix(lng, options.count, { ordinal: false })
          : '';
      const needsZeroSuffixLookup =
        needsPluralHandling &&
        !options.ordinal &&
        options.count === 0 &&
        this.pluralResolver.shouldUseIntlApi();
      const defaultValue =
        (needsZeroSuffixLookup && options[`defaultValue${this.options.pluralSeparator}zero`]) ||
        options[`defaultValue${defaultValueSuffix}`] ||
        options[`defaultValue${defaultValueSuffixOrdinalFallback}`] ||
        options.defaultValue;

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
        options.missingKeyNoValueFallbackToKey || this.options.missingKeyNoValueFallbackToKey;
      const resForMissing = missingKeyNoValueFallbackToKey && usedKey ? undefined : res;

      // save missing
      const updateMissing = hasDefaultValue && defaultValue !== res && this.options.updateMissing;
      if (usedKey || usedDefault || updateMissing) {
        this.logger.log(
          updateMissing ? 'updateKey' : 'missingKey',
          lng,
          namespace,
          key,
          updateMissing ? defaultValue : res,
        );
        if (keySeparator) {
          const fk = this.resolve(key, { ...options, keySeparator: false });
          if (fk && fk.res)
            this.logger.warn(
              'Seems the loaded translations were in flat JSON format instead of nested. Either set keySeparator: false on init or make sure your translations are published in nested format.',
            );
        }

        let lngs = [];
        const fallbackLngs = this.languageUtils.getFallbackCodes(
          this.options.fallbackLng,
          options.lng || this.language,
        );
        if (this.options.saveMissingTo === 'fallback' && fallbackLngs && fallbackLngs[0]) {
          for (let i = 0; i < fallbackLngs.length; i++) {
            lngs.push(fallbackLngs[i]);
          }
        } else if (this.options.saveMissingTo === 'all') {
          lngs = this.languageUtils.toResolveHierarchy(options.lng || this.language);
        } else {
          lngs.push(options.lng || this.language);
        }

        const send = (l, k, specificDefaultValue) => {
          const defaultForMissing =
            hasDefaultValue && specificDefaultValue !== res ? specificDefaultValue : resForMissing;
          if (this.options.missingKeyHandler) {
            this.options.missingKeyHandler(
              l,
              namespace,
              k,
              defaultForMissing,
              updateMissing,
              options,
            );
          } else if (this.backendConnector && this.backendConnector.saveMissing) {
            this.backendConnector.saveMissing(
              l,
              namespace,
              k,
              defaultForMissing,
              updateMissing,
              options,
            );
          }
          this.emit('missingKey', l, namespace, k, res);
        };

        if (this.options.saveMissing) {
          if (this.options.saveMissingPlurals && needsPluralHandling) {
            lngs.forEach((language) => {
              const suffixes = this.pluralResolver.getSuffixes(language, options);
              if (
                needsZeroSuffixLookup &&
                options[`defaultValue${this.options.pluralSeparator}zero`] &&
                suffixes.indexOf(`${this.options.pluralSeparator}zero`) < 0
              ) {
                suffixes.push(`${this.options.pluralSeparator}zero`);
              }
              suffixes.forEach((suffix) => {
                send([language], key + suffix, options[`defaultValue${suffix}`] || defaultValue);
              });
            });
          } else {
            send(lngs, key, defaultValue);
          }
        }
      }

      // extend
      res = this.extendTranslation(res, keys, options, resolved, lastKey);

      // append namespace if still key
      if (usedKey && res === key && this.options.appendNamespaceToMissingKey)
        res = `${namespace}:${key}`;

      // parseMissingKeyHandler
      if ((usedKey || usedDefault) && this.options.parseMissingKeyHandler) {
        if (this.options.compatibilityAPI !== 'v1') {
          res = this.options.parseMissingKeyHandler(
            this.options.appendNamespaceToMissingKey ? `${namespace}:${key}` : key,
            usedDefault ? res : undefined,
          );
        } else {
          res = this.options.parseMissingKeyHandler(res);
        }
      }
    }

    // return
    if (returnDetails) {
      resolved.res = res;
      resolved.usedParams = this.getUsedParamsDetails(options);
      return resolved;
    }
    return res;
  }

  extendTranslation(res, key, options, resolved, lastKey) {
    if (this.i18nFormat && this.i18nFormat.parse) {
      res = this.i18nFormat.parse(
        res,
        { ...this.options.interpolation.defaultVariables, ...options },
        options.lng || this.language || resolved.usedLng,
        resolved.usedNS,
        resolved.usedKey,
        { resolved },
      );
    } else if (!options.skipInterpolation) {
      // i18next.parsing
      if (options.interpolation)
        this.interpolator.init({
          ...options,
          ...{ interpolation: { ...this.options.interpolation, ...options.interpolation } },
        });
      const skipOnVariables =
        typeof res === 'string' &&
        (options && options.interpolation && options.interpolation.skipOnVariables !== undefined
          ? options.interpolation.skipOnVariables
          : this.options.interpolation.skipOnVariables);
      let nestBef;
      if (skipOnVariables) {
        const nb = res.match(this.interpolator.nestingRegexp);
        // has nesting aftbeforeer interpolation
        nestBef = nb && nb.length;
      }

      // interpolate
      let data = options.replace && typeof options.replace !== 'string' ? options.replace : options;
      if (this.options.interpolation.defaultVariables)
        data = { ...this.options.interpolation.defaultVariables, ...data };
      res = this.interpolator.interpolate(res, data, options.lng || this.language, options);

      // nesting
      if (skipOnVariables) {
        const na = res.match(this.interpolator.nestingRegexp);
        // has nesting after interpolation
        const nestAft = na && na.length;
        if (nestBef < nestAft) options.nest = false;
      }
      if (!options.lng && this.options.compatibilityAPI !== 'v1' && resolved && resolved.res)
        options.lng = resolved.usedLng;
      if (options.nest !== false)
        res = this.interpolator.nest(
          res,
          (...args) => {
            if (lastKey && lastKey[0] === args[0] && !options.context) {
              this.logger.warn(
                `It seems you are nesting recursively key: ${args[0]} in key: ${key[0]}`,
              );
              return null;
            }
            return this.translate(...args, key);
          },
          options,
        );

      if (options.interpolation) this.interpolator.reset();
    }

    // post process
    const postProcess = options.postProcess || this.options.postProcess;
    const postProcessorNames = typeof postProcess === 'string' ? [postProcess] : postProcess;

    if (
      res !== undefined &&
      res !== null &&
      postProcessorNames &&
      postProcessorNames.length &&
      options.applyPostProcessor !== false
    ) {
      res = postProcessor.handle(
        postProcessorNames,
        res,
        key,
        this.options && this.options.postProcessPassResolved
          ? {
              i18nResolved: { ...resolved, usedParams: this.getUsedParamsDetails(options) },
              ...options,
            }
          : options,
        this,
      );
    }

    return res;
  }

  resolve(keys, options = {}) {
    let found;
    let usedKey; // plain key
    let exactUsedKey; // key with context / plural
    let usedLng;
    let usedNS;

    if (typeof keys === 'string') keys = [keys];

    // forEach possible key
    keys.forEach((k) => {
      if (this.isValidLookup(found)) return;
      const extracted = this.extractFromKey(k, options);
      const key = extracted.key;
      usedKey = key;
      let namespaces = extracted.namespaces;
      if (this.options.fallbackNS) namespaces = namespaces.concat(this.options.fallbackNS);

      const needsPluralHandling = options.count !== undefined && typeof options.count !== 'string';
      const needsZeroSuffixLookup =
        needsPluralHandling &&
        !options.ordinal &&
        options.count === 0 &&
        this.pluralResolver.shouldUseIntlApi();
      const needsContextHandling =
        options.context !== undefined &&
        (typeof options.context === 'string' || typeof options.context === 'number') &&
        options.context !== '';

      const codes = options.lngs
        ? options.lngs
        : this.languageUtils.toResolveHierarchy(options.lng || this.language, options.fallbackLng);

      namespaces.forEach((ns) => {
        if (this.isValidLookup(found)) return;
        usedNS = ns;

        if (
          !checkedLoadedFor[`${codes[0]}-${ns}`] &&
          this.utils &&
          this.utils.hasLoadedNamespace &&
          !this.utils.hasLoadedNamespace(usedNS)
        ) {
          checkedLoadedFor[`${codes[0]}-${ns}`] = true;
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

          if (this.i18nFormat && this.i18nFormat.addLookupKeys) {
            this.i18nFormat.addLookupKeys(finalKeys, key, code, ns, options);
          } else {
            let pluralSuffix;
            if (needsPluralHandling)
              pluralSuffix = this.pluralResolver.getSuffix(code, options.count, options);
            const zeroSuffix = `${this.options.pluralSeparator}zero`;
            const ordinalPrefix = `${this.options.pluralSeparator}ordinal${this.options.pluralSeparator}`;
            // get key for plural if needed
            if (needsPluralHandling) {
              finalKeys.push(key + pluralSuffix);
              if (options.ordinal && pluralSuffix.indexOf(ordinalPrefix) === 0) {
                finalKeys.push(
                  key + pluralSuffix.replace(ordinalPrefix, this.options.pluralSeparator),
                );
              }
              if (needsZeroSuffixLookup) {
                finalKeys.push(key + zeroSuffix);
              }
            }

            // get key for context if needed
            if (needsContextHandling) {
              const contextKey = `${key}${this.options.contextSeparator}${options.context}`;
              finalKeys.push(contextKey);

              // get key for context + plural if needed
              if (needsPluralHandling) {
                finalKeys.push(contextKey + pluralSuffix);
                if (options.ordinal && pluralSuffix.indexOf(ordinalPrefix) === 0) {
                  finalKeys.push(
                    contextKey + pluralSuffix.replace(ordinalPrefix, this.options.pluralSeparator),
                  );
                }
                if (needsZeroSuffixLookup) {
                  finalKeys.push(contextKey + zeroSuffix);
                }
              }
            }
          }

          // iterate over finalKeys starting with most specific pluralkey (-> contextkey only) -> singularkey only
          let possibleKey;
          /* eslint no-cond-assign: 0 */
          while ((possibleKey = finalKeys.pop())) {
            if (!this.isValidLookup(found)) {
              exactUsedKey = possibleKey;
              found = this.getResource(code, ns, possibleKey, options);
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
    if (this.i18nFormat && this.i18nFormat.getResource)
      return this.i18nFormat.getResource(code, ns, key, options);
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

    const useOptionsReplaceForData = options.replace && typeof options.replace !== 'string';
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
        prefix === option.substring(0, prefix.length) &&
        undefined !== options[option]
      ) {
        return true;
      }
    }

    return false;
  }
}

function capitalize(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

class LanguageUtil {
  constructor(options) {
    this.options = options;

    this.supportedLngs = this.options.supportedLngs || false;
    this.logger = baseLogger.create('languageUtils');
  }

  getScriptPartFromCode(code) {
    code = getCleanedCode(code);
    if (!code || code.indexOf('-') < 0) return null;

    const p = code.split('-');
    if (p.length === 2) return null;
    p.pop();
    if (p[p.length - 1].toLowerCase() === 'x') return null;
    return this.formatLanguageCode(p.join('-'));
  }

  getLanguagePartFromCode(code) {
    code = getCleanedCode(code);
    if (!code || code.indexOf('-') < 0) return code;

    const p = code.split('-');
    return this.formatLanguageCode(p[0]);
  }

  formatLanguageCode(code) {
    // http://www.iana.org/assignments/language-tags/language-tags.xhtml
    if (typeof code === 'string' && code.indexOf('-') > -1) {
      const specialCases = ['hans', 'hant', 'latn', 'cyrl', 'cans', 'mong', 'arab'];
      let p = code.split('-');

      if (this.options.lowerCaseLng) {
        p = p.map((part) => part.toLowerCase());
      } else if (p.length === 2) {
        p[0] = p[0].toLowerCase();
        p[1] = p[1].toUpperCase();

        if (specialCases.indexOf(p[1].toLowerCase()) > -1) p[1] = capitalize(p[1].toLowerCase());
      } else if (p.length === 3) {
        p[0] = p[0].toLowerCase();

        // if length 2 guess it's a country
        if (p[1].length === 2) p[1] = p[1].toUpperCase();
        if (p[0] !== 'sgn' && p[2].length === 2) p[2] = p[2].toUpperCase();

        if (specialCases.indexOf(p[1].toLowerCase()) > -1) p[1] = capitalize(p[1].toLowerCase());
        if (specialCases.indexOf(p[2].toLowerCase()) > -1) p[2] = capitalize(p[2].toLowerCase());
      }

      return p.join('-');
    }

    return this.options.cleanCode || this.options.lowerCaseLng ? code.toLowerCase() : code;
  }

  isSupportedCode(code) {
    if (this.options.load === 'languageOnly' || this.options.nonExplicitSupportedLngs) {
      code = this.getLanguagePartFromCode(code);
    }
    return (
      !this.supportedLngs || !this.supportedLngs.length || this.supportedLngs.indexOf(code) > -1
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

        const lngOnly = this.getLanguagePartFromCode(code);
        // eslint-disable-next-line no-return-assign
        if (this.isSupportedCode(lngOnly)) return (found = lngOnly);

        // eslint-disable-next-line array-callback-return
        found = this.options.supportedLngs.find((supportedLng) => {
          if (supportedLng === lngOnly) return supportedLng;
          if (supportedLng.indexOf('-') < 0 && lngOnly.indexOf('-') < 0) return;
          if (
            supportedLng.indexOf('-') > 0 &&
            lngOnly.indexOf('-') < 0 &&
            supportedLng.substring(0, supportedLng.indexOf('-')) === lngOnly
          )
            return supportedLng;
          if (supportedLng.indexOf(lngOnly) === 0 && lngOnly.length > 1) return supportedLng;
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
    if (typeof fallbacks === 'string') fallbacks = [fallbacks];
    if (Object.prototype.toString.apply(fallbacks) === '[object Array]') return fallbacks;

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
      fallbackCode || this.options.fallbackLng || [],
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

    if (typeof code === 'string' && (code.indexOf('-') > -1 || code.indexOf('_') > -1)) {
      if (this.options.load !== 'languageOnly') addCode(this.formatLanguageCode(code));
      if (this.options.load !== 'languageOnly' && this.options.load !== 'currentOnly')
        addCode(this.getScriptPartFromCode(code));
      if (this.options.load !== 'currentOnly') addCode(this.getLanguagePartFromCode(code));
    } else if (typeof code === 'string') {
      addCode(this.formatLanguageCode(code));
    }

    fallbackCodes.forEach((fc) => {
      if (codes.indexOf(fc) < 0) addCode(this.formatLanguageCode(fc));
    });

    return codes;
  }
}

// definition http://translate.sourceforge.net/wiki/l10n/pluralforms
/* eslint-disable */
let sets = [
  { lngs: ['ach','ak','am','arn','br','fil','gun','ln','mfe','mg','mi','oc', 'pt', 'pt-BR',
    'tg', 'tl', 'ti','tr','uz','wa'], nr: [1,2], fc: 1 },

  { lngs: ['af','an','ast','az','bg','bn','ca','da','de','dev','el','en',
    'eo','es','et','eu','fi','fo','fur','fy','gl','gu','ha','hi',
    'hu','hy','ia','it','kk','kn','ku','lb','mai','ml','mn','mr','nah','nap','nb',
    'ne','nl','nn','no','nso','pa','pap','pms','ps','pt-PT','rm','sco',
    'se','si','so','son','sq','sv','sw','ta','te','tk','ur','yo'], nr: [1,2], fc: 2 },

  { lngs: ['ay','bo','cgg','fa','ht','id','ja','jbo','ka','km','ko','ky','lo',
    'ms','sah','su','th','tt','ug','vi','wo','zh'], nr: [1], fc: 3 },

  { lngs: ['be','bs', 'cnr', 'dz','hr','ru','sr','uk'], nr: [1,2,5], fc: 4 },

  { lngs: ['ar'], nr: [0,1,2,3,11,100], fc: 5 },
  { lngs: ['cs','sk'], nr: [1,2,5], fc: 6 },
  { lngs: ['csb','pl'], nr: [1,2,5], fc: 7 },
  { lngs: ['cy'], nr: [1,2,3,8], fc: 8 },
  { lngs: ['fr'], nr: [1,2], fc: 9 },
  { lngs: ['ga'], nr: [1,2,3,7,11], fc: 10 },
  { lngs: ['gd'], nr: [1,2,3,20], fc: 11 },
  { lngs: ['is'], nr: [1,2], fc: 12 },
  { lngs: ['jv'], nr: [0,1], fc: 13 },
  { lngs: ['kw'], nr: [1,2,3,4], fc: 14 },
  { lngs: ['lt'], nr: [1,2,10], fc: 15 },
  { lngs: ['lv'], nr: [1,2,0], fc: 16 },
  { lngs: ['mk'], nr: [1,2], fc: 17 },
  { lngs: ['mnk'], nr: [0,1,2], fc: 18 },
  { lngs: ['mt'], nr: [1,2,11,20], fc: 19 },
  { lngs: ['or'], nr: [2,1], fc: 2 },
  { lngs: ['ro'], nr: [1,2,20], fc: 20 },
  { lngs: ['sl'], nr: [5,1,2,3], fc: 21 },
  { lngs: ['he','iw'], nr: [1,2,20,21], fc: 22 }
];

let _rulesPluralsTypes = {
  1: function(n) {return Number(n > 1);},
  2: function(n) {return Number(n != 1);},
  3: function(n) {return 0;},
  4: function(n) {return Number(n%10==1 && n%100!=11 ? 0 : n%10>=2 && n%10<=4 && (n%100<10 || n%100>=20) ? 1 : 2);},
  5: function(n) {return Number(n==0 ? 0 : n==1 ? 1 : n==2 ? 2 : n%100>=3 && n%100<=10 ? 3 : n%100>=11 ? 4 : 5);},
  6: function(n) {return Number((n==1) ? 0 : (n>=2 && n<=4) ? 1 : 2);},
  7: function(n) {return Number(n==1 ? 0 : n%10>=2 && n%10<=4 && (n%100<10 || n%100>=20) ? 1 : 2);},
  8: function(n) {return Number((n==1) ? 0 : (n==2) ? 1 : (n != 8 && n != 11) ? 2 : 3);},
  9: function(n) {return Number(n >= 2);},
  10: function(n) {return Number(n==1 ? 0 : n==2 ? 1 : n<7 ? 2 : n<11 ? 3 : 4) ;},
  11: function(n) {return Number((n==1 || n==11) ? 0 : (n==2 || n==12) ? 1 : (n > 2 && n < 20) ? 2 : 3);},
  12: function(n) {return Number(n%10!=1 || n%100==11);},
  13: function(n) {return Number(n !== 0);},
  14: function(n) {return Number((n==1) ? 0 : (n==2) ? 1 : (n == 3) ? 2 : 3);},
  15: function(n) {return Number(n%10==1 && n%100!=11 ? 0 : n%10>=2 && (n%100<10 || n%100>=20) ? 1 : 2);},
  16: function(n) {return Number(n%10==1 && n%100!=11 ? 0 : n !== 0 ? 1 : 2);},
  17: function(n) {return Number(n==1 || n%10==1 && n%100!=11 ? 0 : 1);},
  18: function(n) {return Number(n==0 ? 0 : n==1 ? 1 : 2);},
  19: function(n) {return Number(n==1 ? 0 : n==0 || ( n%100>1 && n%100<11) ? 1 : (n%100>10 && n%100<20 ) ? 2 : 3);},
  20: function(n) {return Number(n==1 ? 0 : (n==0 || (n%100 > 0 && n%100 < 20)) ? 1 : 2);},
  21: function(n) {return Number(n%100==1 ? 1 : n%100==2 ? 2 : n%100==3 || n%100==4 ? 3 : 0); },
  22: function(n) {return Number(n==1 ? 0 : n==2 ? 1 : (n<0 || n>10) && n%10==0 ? 2 : 3); }
};
/* eslint-enable */

const nonIntlVersions = ['v1', 'v2', 'v3'];
const intlVersions = ['v4'];
const suffixesOrder = {
  zero: 0,
  one: 1,
  two: 2,
  few: 3,
  many: 4,
  other: 5,
};

function createRules() {
  const rules = {};
  sets.forEach((set) => {
    set.lngs.forEach((l) => {
      rules[l] = {
        numbers: set.nr,
        plurals: _rulesPluralsTypes[set.fc]
      };
    });
  });
  return rules;
}

class PluralResolver {
  constructor(languageUtils, options = {}) {
    this.languageUtils = languageUtils;
    this.options = options;

    this.logger = baseLogger.create('pluralResolver');

    if ((!this.options.compatibilityJSON || intlVersions.includes(this.options.compatibilityJSON)) && (typeof Intl === 'undefined' || !Intl.PluralRules)) {
      this.options.compatibilityJSON = 'v3';
      this.logger.error('Your environment seems not to be Intl API compatible, use an Intl.PluralRules polyfill. Will fallback to the compatibilityJSON v3 format handling.');
    }

    this.rules = createRules();
  }

  addRule(lng, obj) {
    this.rules[lng] = obj;
  }

  getRule(code, options = {}) {
    if (this.shouldUseIntlApi()) {
      try {
        return new Intl.PluralRules(getCleanedCode(code === 'dev' ? 'en' : code), { type: options.ordinal ? 'ordinal' : 'cardinal' });
      } catch (err) {
        return;
      }
    }

    return this.rules[code] || this.rules[this.languageUtils.getLanguagePartFromCode(code)];
  }

  needsPlural(code, options = {}) {
    const rule = this.getRule(code, options);

    if (this.shouldUseIntlApi()) {
      return rule && rule.resolvedOptions().pluralCategories.length > 1;
    }

    return rule && rule.numbers.length > 1;
  }

  getPluralFormsOfKey(code, key, options = {}) {
    return this.getSuffixes(code, options).map((suffix) => `${key}${suffix}`);
  }

  getSuffixes(code, options = {}) {
    const rule = this.getRule(code, options);

    if (!rule) {
      return [];
    }

    if (this.shouldUseIntlApi()) {
      return rule.resolvedOptions().pluralCategories
        .sort((pluralCategory1, pluralCategory2) => suffixesOrder[pluralCategory1] - suffixesOrder[pluralCategory2])
        .map(pluralCategory => `${this.options.prepend}${options.ordinal ? `ordinal${this.options.prepend}` : ''}${pluralCategory}`);
    }

    return rule.numbers.map((number) => this.getSuffix(code, number, options));
  }

  getSuffix(code, count, options = {}) {
    const rule = this.getRule(code, options);

    if (rule) {
      if (this.shouldUseIntlApi()) {
        return `${this.options.prepend}${options.ordinal ? `ordinal${this.options.prepend}` : ''}${rule.select(count)}`;
      }

      return this.getSuffixRetroCompatible(rule, count);
    }

    this.logger.warn(`no plural rule found for: ${code}`);
    return '';
  }

  getSuffixRetroCompatible(rule, count) {
    const idx = rule.noAbs ? rule.plurals(count) : rule.plurals(Math.abs(count));
    let suffix = rule.numbers[idx];

    // special treatment for lngs only having singular and plural
    if (this.options.simplifyPluralSuffix && rule.numbers.length === 2 && rule.numbers[0] === 1) {
      if (suffix === 2) {
        suffix = 'plural';
      } else if (suffix === 1) {
        suffix = '';
      }
    }

    const returnSuffix = () => (
      this.options.prepend && suffix.toString() ? this.options.prepend + suffix.toString() : suffix.toString()
    );

    // COMPATIBILITY JSON
    // v1
    if (this.options.compatibilityJSON === 'v1') {
      if (suffix === 1) return '';
      if (typeof suffix === 'number') return `_plural_${suffix.toString()}`;
      return returnSuffix();
      // eslint-disable-next-line no-else-return
    } else if (/* v2 */ this.options.compatibilityJSON === 'v2') {
      return returnSuffix();
    } else if (/* v3 - gettext index */ this.options.simplifyPluralSuffix && rule.numbers.length === 2 && rule.numbers[0] === 1) {
      return returnSuffix();
    }
    return this.options.prepend && idx.toString() ? this.options.prepend + idx.toString() : idx.toString();
  }

  shouldUseIntlApi() {
    return !nonIntlVersions.includes(this.options.compatibilityJSON);
  }
}

function deepFindWithDefaults(
  data,
  defaultData,
  key,
  keySeparator = '.',
  ignoreJSONStructure = true,
) {
  let path = getPathWithDefaults(data, defaultData, key);
  if (!path && ignoreJSONStructure && typeof key === 'string') {
    path = deepFind(data, key, keySeparator);
    if (path === undefined) path = deepFind(defaultData, key, keySeparator);
  }
  return path;
}

class Interpolator {
  constructor(options = {}) {
    this.logger = baseLogger.create('interpolator');

    this.options = options;
    this.format = (options.interpolation && options.interpolation.format) || ((value) => value);
    this.init(options);
  }

  /* eslint no-param-reassign: 0 */
  init(options = {}) {
    if (!options.interpolation) options.interpolation = { escapeValue: true };

    const iOpts = options.interpolation;

    this.escape = iOpts.escape !== undefined ? iOpts.escape : escape;
    this.escapeValue = iOpts.escapeValue !== undefined ? iOpts.escapeValue : true;
    this.useRawValueToEscape =
      iOpts.useRawValueToEscape !== undefined ? iOpts.useRawValueToEscape : false;

    this.prefix = iOpts.prefix ? regexEscape(iOpts.prefix) : iOpts.prefixEscaped || '{{';
    this.suffix = iOpts.suffix ? regexEscape(iOpts.suffix) : iOpts.suffixEscaped || '}}';

    this.formatSeparator = iOpts.formatSeparator
      ? iOpts.formatSeparator
      : iOpts.formatSeparator || ',';

    this.unescapePrefix = iOpts.unescapeSuffix ? '' : iOpts.unescapePrefix || '-';
    this.unescapeSuffix = this.unescapePrefix ? '' : iOpts.unescapeSuffix || '';

    this.nestingPrefix = iOpts.nestingPrefix
      ? regexEscape(iOpts.nestingPrefix)
      : iOpts.nestingPrefixEscaped || regexEscape('$t(');
    this.nestingSuffix = iOpts.nestingSuffix
      ? regexEscape(iOpts.nestingSuffix)
      : iOpts.nestingSuffixEscaped || regexEscape(')');

    this.nestingOptionsSeparator = iOpts.nestingOptionsSeparator
      ? iOpts.nestingOptionsSeparator
      : iOpts.nestingOptionsSeparator || ',';

    this.maxReplaces = iOpts.maxReplaces ? iOpts.maxReplaces : 1000;

    this.alwaysFormat = iOpts.alwaysFormat !== undefined ? iOpts.alwaysFormat : false;

    // the regexp
    this.resetRegExp();
  }

  reset() {
    if (this.options) this.init(this.options);
  }

  resetRegExp() {
    const getOrResetRegExp = (existingRegExp, pattern) => {
      if (existingRegExp && existingRegExp.source === pattern) {
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
      `${this.nestingPrefix}(.+?)${this.nestingSuffix}`,
    );
  }

  interpolate(str, data, lng, options) {
    let match;
    let value;
    let replaces;

    const defaultData =
      (this.options && this.options.interpolation && this.options.interpolation.defaultVariables) ||
      {};

    function regexSafe(val) {
      return val.replace(/\$/g, '$$$$');
    }

    const handleFormat = (key) => {
      if (key.indexOf(this.formatSeparator) < 0) {
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

    const missingInterpolationHandler =
      (options && options.missingInterpolationHandler) || this.options.missingInterpolationHandler;

    const skipOnVariables =
      options && options.interpolation && options.interpolation.skipOnVariables !== undefined
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
      /* eslint no-cond-assign: 0 */
      while ((match = todo.regex.exec(str))) {
        const matchedVar = match[1].trim();
        value = handleFormat(matchedVar);
        if (value === undefined) {
          if (typeof missingInterpolationHandler === 'function') {
            const temp = missingInterpolationHandler(str, match, options);
            value = typeof temp === 'string' ? temp : '';
          } else if (options && Object.prototype.hasOwnProperty.call(options, matchedVar)) {
            value = ''; // undefined becomes empty string
          } else if (skipOnVariables) {
            value = match[0];
            continue; // this makes sure it continues to detect others
          } else {
            this.logger.warn(`missed to pass in variable ${matchedVar} for interpolating ${str}`);
            value = '';
          }
        } else if (typeof value !== 'string' && !this.useRawValueToEscape) {
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
    function handleHasOptions(key, inheritedOptions) {
      const sep = this.nestingOptionsSeparator;
      if (key.indexOf(sep) < 0) return key;

      const c = key.split(new RegExp(`${sep}[ ]*{`));

      let optionsString = `{${c[1]}`;
      key = c[0];
      optionsString = this.interpolate(optionsString, clonedOptions);
      const matchedSingleQuotes = optionsString.match(/'/g);
      const matchedDoubleQuotes = optionsString.match(/"/g);
      if (
        (matchedSingleQuotes && matchedSingleQuotes.length % 2 === 0 && !matchedDoubleQuotes) ||
        matchedDoubleQuotes.length % 2 !== 0
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
      delete clonedOptions.defaultValue;
      return key;
    }

    // regular escape on demand
    while ((match = this.nestingRegexp.exec(str))) {
      let formatters = [];

      clonedOptions = { ...options };
      clonedOptions =
        clonedOptions.replace && typeof clonedOptions.replace !== 'string'
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
       */
      let doReduce = false;
      if (match[0].indexOf(this.formatSeparator) !== -1 && !/{.*}/.test(match[1])) {
        const r = match[1].split(this.formatSeparator).map((elem) => elem.trim());
        match[1] = r.shift();
        formatters = r;
        doReduce = true;
      }

      value = fc(handleHasOptions.call(this, match[1].trim(), clonedOptions), clonedOptions);

      // is only the nesting key (key1 = '$(key2)') return the value without stringify
      if (value && match[0] === str && typeof value !== 'string') return value;

      // no string to include or empty
      if (typeof value !== 'string') value = makeString(value);
      if (!value) {
        this.logger.warn(`missed to resolve ${match[1]} for nesting ${str}`);
        value = '';
      }

      if (doReduce) {
        value = formatters.reduce(
          // eslint-disable-next-line no-loop-func
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

function parseFormatStr(formatStr) {
  let formatName = formatStr.toLowerCase().trim();
  const formatOptions = {};
  if (formatStr.indexOf('(') > -1) {
    const p = formatStr.split('(');
    formatName = p[0].toLowerCase().trim();

    const optStr = p[1].substring(0, p[1].length - 1);

    // extra for currency
    if (formatName === 'currency' && optStr.indexOf(':') < 0) {
      if (!formatOptions.currency) formatOptions.currency = optStr.trim();
    } else if (formatName === 'relativetime' && optStr.indexOf(':') < 0) {
      if (!formatOptions.range) formatOptions.range = optStr.trim();
    } else {
      const opts = optStr.split(';');

      opts.forEach((opt) => {
        if (!opt) return;
        const [key, ...rest] = opt.split(':');
        const val = rest
          .join(':')
          .trim()
          .replace(/^'+|'+$/g, ''); // trim and replace ''

        if (!formatOptions[key.trim()]) formatOptions[key.trim()] = val;
        if (val === 'false') formatOptions[key.trim()] = false;
        if (val === 'true') formatOptions[key.trim()] = true;
        // eslint-disable-next-line no-restricted-globals
        if (!isNaN(val)) formatOptions[key.trim()] = parseInt(val, 10);
      });
    }
  }

  return {
    formatName,
    formatOptions,
  };
}

function createCachedFormatter(fn) {
  const cache = {};
  return function invokeFormatter(val, lng, options) {
    const key = lng + JSON.stringify(options);
    let formatter = cache[key];
    if (!formatter) {
      formatter = fn(getCleanedCode(lng), options);
      cache[key] = formatter;
    }
    return formatter(val);
  };
}

class Formatter {
  constructor(options = {}) {
    this.logger = baseLogger.create('formatter');

    this.options = options;
    this.formats = {
      number: createCachedFormatter((lng, opt) => {
        const formatter = new Intl.NumberFormat(lng, { ...opt });
        return (val) => formatter.format(val);
      }),
      currency: createCachedFormatter((lng, opt) => {
        const formatter = new Intl.NumberFormat(lng, { ...opt, style: 'currency' });
        return (val) => formatter.format(val);
      }),
      datetime: createCachedFormatter((lng, opt) => {
        const formatter = new Intl.DateTimeFormat(lng, { ...opt });
        return (val) => formatter.format(val);
      }),
      relativetime: createCachedFormatter((lng, opt) => {
        const formatter = new Intl.RelativeTimeFormat(lng, { ...opt });
        return (val) => formatter.format(val, opt.range || 'day');
      }),
      list: createCachedFormatter((lng, opt) => {
        const formatter = new Intl.ListFormat(lng, { ...opt });
        return (val) => formatter.format(val);
      }),
    };
    this.init(options);
  }

  /* eslint no-param-reassign: 0 */
  init(services, options = { interpolation: {} }) {
    const iOpts = options.interpolation;

    this.formatSeparator = iOpts.formatSeparator
      ? iOpts.formatSeparator
      : iOpts.formatSeparator || ',';
  }

  add(name, fc) {
    this.formats[name.toLowerCase().trim()] = fc;
  }

  addCached(name, fc) {
    this.formats[name.toLowerCase().trim()] = createCachedFormatter(fc);
  }

  format(value, format, lng, options = {}) {
    const formats = format.split(this.formatSeparator);

    const result = formats.reduce((mem, f) => {
      const { formatName, formatOptions } = parseFormatStr(f);

      if (this.formats[formatName]) {
        let formatted = mem;
        try {
          // options passed explicit for that formatted value
          const valOptions =
            (options && options.formatParams && options.formatParams[options.interpolationkey]) ||
            {};

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
        // eslint-disable-next-line no-else-return
      } else {
        this.logger.warn(`there was no format function for ${formatName}`);
      }
      return mem;
    }, value);

    return result;
  }
}

function removePending(q, name) {
  if (q.pending[name] !== undefined) {
    delete q.pending[name];
    q.pendingCount--;
  }
}

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

    if (this.backend && this.backend.init) {
      this.backend.init(services, options.backend, options);
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

    if (data) {
      this.store.addResourceBundle(lng, ns, data, undefined, undefined, { skipCopy: true });
    }

    // set loaded
    this.state[name] = err ? -1 : 2;

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

        /* eslint no-param-reassign: 0 */
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
          this.read.call(this, lng, ns, fcName, tried + 1, wait * 2, callback);
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

  /* eslint consistent-return: 0 */
  prepareLoading(languages, namespaces, options = {}, callback) {
    if (!this.backend) {
      this.logger.warn('No backend was added via i18next.use. Will not load resources.');
      return callback && callback();
    }

    if (typeof languages === 'string') languages = this.languageUtils.toResolveHierarchy(languages);
    if (typeof namespaces === 'string') namespaces = [namespaces];

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
      this.services.utils &&
      this.services.utils.hasLoadedNamespace &&
      !this.services.utils.hasLoadedNamespace(namespace)
    ) {
      this.logger.warn(
        `did not save key "${key}" as the namespace "${namespace}" was not yet loaded`,
        'This means something IS WRONG in your setup. You access the t function before i18next.init / i18next.loadNamespace / i18next.changeLanguage was done. Wait for the callback or Promise to resolve before accessing it!!!',
      );
      return;
    }

    // ignore non valid keys
    if (key === undefined || key === null || key === '') return;

    if (this.backend && this.backend.create) {
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

function get() {
  return {
    debug: false,
    initImmediate: true,

    ns: ['translation'],
    defaultNS: ['translation'],
    fallbackLng: ['dev'],
    fallbackNS: false, // string or array of namespaces

    supportedLngs: false, // array with supported languages
    nonExplicitSupportedLngs: false,
    load: 'all', // | currentOnly | languageOnly
    preload: false, // array with preload languages

    simplifyPluralSuffix: true,
    keySeparator: '.',
    nsSeparator: ':',
    pluralSeparator: '_',
    contextSeparator: '_',

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
    overloadTranslationOptionHandler: function handle(args) {
      let ret = {};
      if (typeof args[1] === 'object') ret = args[1];
      if (typeof args[1] === 'string') ret.defaultValue = args[1];
      if (typeof args[2] === 'string') ret.tDescription = args[2];
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
      /** @type {import('i18next').FormatFunction} */
      format: (value) => value,
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
  };
}

/* eslint no-param-reassign: 0 */
function transformOptions(options) {
  // create namespace object if namespace is passed in as string
  if (typeof options.ns === 'string') options.ns = [options.ns];
  if (typeof options.fallbackLng === 'string') options.fallbackLng = [options.fallbackLng];
  if (typeof options.fallbackNS === 'string') options.fallbackNS = [options.fallbackNS];

  // extend supportedLngs with cimode
  if (options.supportedLngs && options.supportedLngs.indexOf('cimode') < 0) {
    options.supportedLngs = options.supportedLngs.concat(['cimode']);
  }

  return options;
}

function noop() { }

// Binds the member functions of the given class instance so that they can be
// destructured or used as callbacks.
function bindMemberFunctions(inst) {
  const mems = Object.getOwnPropertyNames(Object.getPrototypeOf(inst));
  mems.forEach((mem) => {
    if (typeof inst[mem] === 'function') {
      inst[mem] = inst[mem].bind(inst);
    }
  });
}

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
      if (!this.options.initImmediate) {
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

    if (!options.defaultNS && options.defaultNS !== false && options.ns) {
      if (typeof options.ns === 'string') {
        options.defaultNS = options.ns;
      } else if (options.ns.indexOf('translation') < 0) {
        options.defaultNS = options.ns[0];
      }
    }

    const defOpts = get();
    this.options = { ...defOpts, ...this.options, ...transformOptions(options) };
    if (this.options.compatibilityAPI !== 'v1') {
      this.options.interpolation = { ...defOpts.interpolation, ...this.options.interpolation }; // do not use reference
    }
    if (options.keySeparator !== undefined) {
      this.options.userDefinedKeySeparator = options.keySeparator;
    }
    if (options.nsSeparator !== undefined) {
      this.options.userDefinedNsSeparator = options.nsSeparator;
    }

    function createClassOnDemand(ClassOrObject) {
      if (!ClassOrObject) return null;
      if (typeof ClassOrObject === 'function') return new ClassOrObject();
      return ClassOrObject;
    }

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
      } else if (typeof Intl !== 'undefined') {
        formatter = Formatter;
      }

      const lu = new LanguageUtil(this.options);
      this.store = new ResourceStore(this.options.resources, this.options);

      const s = this.services;
      s.logger = baseLogger;
      s.resourceStore = this.store;
      s.languageUtils = lu;
      s.pluralResolver = new PluralResolver(lu, {
        prepend: this.options.pluralSeparator,
        compatibilityJSON: this.options.compatibilityJSON,
        simplifyPluralSuffix: this.options.simplifyPluralSuffix,
      });

      if (formatter && (!this.options.interpolation.format || this.options.interpolation.format === defOpts.interpolation.format)) {
        s.formatter = createClassOnDemand(formatter);
        s.formatter.init(s, this.options);

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
      if (this.languages && this.options.compatibilityAPI !== 'v1' && !this.isInitialized) return finish(null, this.t.bind(this));
      this.changeLanguage(this.options.lng, finish);
    };

    if (this.options.resources || !this.options.initImmediate) {
      load();
    } else {
      setTimeout(load, 0);
    }

    return deferred;
  }

  /* eslint consistent-return: 0 */
  loadResources(language, callback = noop) {
    let usedCallback = callback;
    const usedLng = typeof language === 'string' ? language : this.language;
    if (typeof language === 'function') usedCallback = language;

    if (!this.options.resources || this.options.partialBundledLanguages) {
      if (usedLng && usedLng.toLowerCase() === 'cimode' && (!this.options.preload || this.options.preload.length === 0)) return usedCallback(); // avoid loading resources for cimode

      const toLoad = [];

      const append = lng => {
        if (!lng) return;
        if (lng === 'cimode') return;
        const lngs = this.services.languageUtils.toResolveHierarchy(lng);
        lngs.forEach(l => {
          if (l === 'cimode') return;
          if (toLoad.indexOf(l) < 0) toLoad.push(l);
        });
      };

      if (!usedLng) {
        // at least load fallbacks in this case
        const fallbacks = this.services.languageUtils.getFallbackCodes(this.options.fallbackLng);
        fallbacks.forEach(l => append(l));
      } else {
        append(usedLng);
      }

      if (this.options.preload) {
        this.options.preload.forEach(l => append(l));
      }

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
    if (['cimode', 'dev'].indexOf(l) > -1) return;
    for (let li = 0; li < this.languages.length; li++) {
      const lngInLngs = this.languages[li];
      if (['cimode', 'dev'].indexOf(lngInLngs) > -1) continue;
      if (this.store.hasLanguageSomeTranslations(lngInLngs)) {
        this.resolvedLanguage = lngInLngs;
        break;
      }
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
        setLngProps(l);
        this.translator.changeLanguage(l);
        this.isLanguageChangingTo = undefined;
        this.emit('languageChanged', l);
        this.logger.log('languageChanged', l);
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
      const l = typeof lngs === 'string' ? lngs : this.services.languageUtils.getBestMatchFromCodes(lngs);

      if (l) {
        if (!this.language) {
          setLngProps(l);
        }
        if (!this.translator.language) this.translator.changeLanguage(l);

        if (this.services.languageDetector && this.services.languageDetector.cacheUserLanguage) this.services.languageDetector.cacheUserLanguage(l);
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

  getFixedT(lng, ns, keyPrefix) {
    const fixedT = (key, opts, ...rest) => {
      let options;
      if (typeof opts !== 'object') {
        options = this.options.overloadTranslationOptionHandler([key, opts].concat(rest));
      } else {
        options = { ...opts };
      }

      options.lng = options.lng || fixedT.lng;
      options.lngs = options.lngs || fixedT.lngs;
      options.ns = options.ns || fixedT.ns;
      options.keyPrefix = options.keyPrefix || keyPrefix || fixedT.keyPrefix;

      const keySeparator = this.options.keySeparator || '.';
      let resultKey;
      if (options.keyPrefix && Array.isArray(key)) {
        resultKey = key.map(k => `${options.keyPrefix}${keySeparator}${k}`);
      } else {
        resultKey = options.keyPrefix ? `${options.keyPrefix}${keySeparator}${key}` : key;
      }
      return this.t(resultKey, options);
    };
    if (typeof lng === 'string') {
      fixedT.lng = lng;
    } else {
      fixedT.lngs = lng;
    }
    fixedT.ns = ns;
    fixedT.keyPrefix = keyPrefix;
    return fixedT;
  }

  t(...args) {
    return this.translator && this.translator.translate(...args);
  }

  exists(...args) {
    return this.translator && this.translator.exists(...args);
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
      return loadState === -1 || loadState === 2;
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
    if (typeof ns === 'string') ns = [ns];

    ns.forEach(n => {
      if (this.options.ns.indexOf(n) < 0) this.options.ns.push(n);
    });

    this.loadResources(err => {
      deferred.resolve();
      if (callback) callback(err);
    });

    return deferred;
  }

  loadLanguages(lngs, callback) {
    const deferred = defer();

    if (typeof lngs === 'string') lngs = [lngs];
    const preloaded = this.options.preload || [];

    const newLngs = lngs.filter(lng => preloaded.indexOf(lng) < 0);
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
    if (!lng) lng = this.resolvedLanguage || (this.languages && this.languages.length > 0 ? this.languages[0] : this.language);
    if (!lng) return 'rtl';

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

    const languageUtils = (this.services && this.services.languageUtils) || new LanguageUtil(get()); // for uninitialized usage

    return rtlLngs.indexOf(languageUtils.getLanguagePartFromCode(lng)) > -1 || lng.toLowerCase().indexOf('-arab') > 1
      ? 'rtl'
      : 'ltr';
  }

  static createInstance(options = {}, callback) { return new I18n(options, callback) }

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
      clone.store = new ResourceStore(this.store.data, mergedOptions);
      clone.services.resourceStore = clone.store;
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
instance.createInstance = I18n.createInstance;

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uLWkxOG4ubWpzIiwic291cmNlcyI6WyJpMThuZXh0L3NyYy9sb2dnZXIuanMiLCJpMThuZXh0L3NyYy9FdmVudEVtaXR0ZXIuanMiLCJpMThuZXh0L3NyYy91dGlscy5qcyIsImkxOG5leHQvc3JjL1Jlc291cmNlU3RvcmUuanMiLCJpMThuZXh0L3NyYy9wb3N0UHJvY2Vzc29yLmpzIiwiaTE4bmV4dC9zcmMvVHJhbnNsYXRvci5qcyIsImkxOG5leHQvc3JjL0xhbmd1YWdlVXRpbHMuanMiLCJpMThuZXh0L3NyYy9QbHVyYWxSZXNvbHZlci5qcyIsImkxOG5leHQvc3JjL0ludGVycG9sYXRvci5qcyIsImkxOG5leHQvc3JjL0Zvcm1hdHRlci5qcyIsImkxOG5leHQvc3JjL0JhY2tlbmRDb25uZWN0b3IuanMiLCJpMThuZXh0L3NyYy9kZWZhdWx0cy5qcyIsImkxOG5leHQvc3JjL2kxOG5leHQuanMiLCJpMThuZXh0L3NyYy9pbmRleC5qcyIsImluZGV4LnRzIl0sInNvdXJjZXNDb250ZW50IjpbImNvbnN0IGNvbnNvbGVMb2dnZXIgPSB7XG4gIHR5cGU6ICdsb2dnZXInLFxuXG4gIGxvZyhhcmdzKSB7XG4gICAgdGhpcy5vdXRwdXQoJ2xvZycsIGFyZ3MpO1xuICB9LFxuXG4gIHdhcm4oYXJncykge1xuICAgIHRoaXMub3V0cHV0KCd3YXJuJywgYXJncyk7XG4gIH0sXG5cbiAgZXJyb3IoYXJncykge1xuICAgIHRoaXMub3V0cHV0KCdlcnJvcicsIGFyZ3MpO1xuICB9LFxuXG4gIG91dHB1dCh0eXBlLCBhcmdzKSB7XG4gICAgLyogZXNsaW50IG5vLWNvbnNvbGU6IDAgKi9cbiAgICBpZiAoY29uc29sZSAmJiBjb25zb2xlW3R5cGVdKSBjb25zb2xlW3R5cGVdLmFwcGx5KGNvbnNvbGUsIGFyZ3MpO1xuICB9LFxufTtcblxuY2xhc3MgTG9nZ2VyIHtcbiAgY29uc3RydWN0b3IoY29uY3JldGVMb2dnZXIsIG9wdGlvbnMgPSB7fSkge1xuICAgIHRoaXMuaW5pdChjb25jcmV0ZUxvZ2dlciwgb3B0aW9ucyk7XG4gIH1cblxuICBpbml0KGNvbmNyZXRlTG9nZ2VyLCBvcHRpb25zID0ge30pIHtcbiAgICB0aGlzLnByZWZpeCA9IG9wdGlvbnMucHJlZml4IHx8ICdpMThuZXh0Oic7XG4gICAgdGhpcy5sb2dnZXIgPSBjb25jcmV0ZUxvZ2dlciB8fCBjb25zb2xlTG9nZ2VyO1xuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG4gICAgdGhpcy5kZWJ1ZyA9IG9wdGlvbnMuZGVidWc7XG4gIH1cblxuICBsb2coLi4uYXJncykge1xuICAgIHJldHVybiB0aGlzLmZvcndhcmQoYXJncywgJ2xvZycsICcnLCB0cnVlKTtcbiAgfVxuXG4gIHdhcm4oLi4uYXJncykge1xuICAgIHJldHVybiB0aGlzLmZvcndhcmQoYXJncywgJ3dhcm4nLCAnJywgdHJ1ZSk7XG4gIH1cblxuICBlcnJvciguLi5hcmdzKSB7XG4gICAgcmV0dXJuIHRoaXMuZm9yd2FyZChhcmdzLCAnZXJyb3InLCAnJyk7XG4gIH1cblxuICBkZXByZWNhdGUoLi4uYXJncykge1xuICAgIHJldHVybiB0aGlzLmZvcndhcmQoYXJncywgJ3dhcm4nLCAnV0FSTklORyBERVBSRUNBVEVEOiAnLCB0cnVlKTtcbiAgfVxuXG4gIGZvcndhcmQoYXJncywgbHZsLCBwcmVmaXgsIGRlYnVnT25seSkge1xuICAgIGlmIChkZWJ1Z09ubHkgJiYgIXRoaXMuZGVidWcpIHJldHVybiBudWxsO1xuICAgIGlmICh0eXBlb2YgYXJnc1swXSA9PT0gJ3N0cmluZycpIGFyZ3NbMF0gPSBgJHtwcmVmaXh9JHt0aGlzLnByZWZpeH0gJHthcmdzWzBdfWA7XG4gICAgcmV0dXJuIHRoaXMubG9nZ2VyW2x2bF0oYXJncyk7XG4gIH1cblxuICBjcmVhdGUobW9kdWxlTmFtZSkge1xuICAgIHJldHVybiBuZXcgTG9nZ2VyKHRoaXMubG9nZ2VyLCB7XG4gICAgICAuLi57IHByZWZpeDogYCR7dGhpcy5wcmVmaXh9OiR7bW9kdWxlTmFtZX06YCB9LFxuICAgICAgLi4udGhpcy5vcHRpb25zLFxuICAgIH0pO1xuICB9XG5cbiAgY2xvbmUob3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHRoaXMub3B0aW9ucztcbiAgICBvcHRpb25zLnByZWZpeCA9IG9wdGlvbnMucHJlZml4IHx8IHRoaXMucHJlZml4O1xuICAgIHJldHVybiBuZXcgTG9nZ2VyKHRoaXMubG9nZ2VyLCBvcHRpb25zKTtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBuZXcgTG9nZ2VyKCk7XG4iLCJjbGFzcyBFdmVudEVtaXR0ZXIge1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICAvLyBUaGlzIGlzIGFuIE9iamVjdCBjb250YWluaW5nIE1hcHM6XG4gICAgLy9cbiAgICAvLyB7IFtldmVudDogc3RyaW5nXTogTWFwPGxpc3RlbmVyOiBmdW5jdGlvbiwgbnVtVGltZXNBZGRlZDogbnVtYmVyPiB9XG4gICAgLy9cbiAgICAvLyBXZSB1c2UgYSBNYXAgZm9yIE8oMSkgaW5zZXJ0aW9uL2RlbGV0aW9uIGFuZCBiZWNhdXNlIGl0IGNhbiBoYXZlIGZ1bmN0aW9ucyBhcyBrZXlzLlxuICAgIC8vXG4gICAgLy8gV2Uga2VlcCB0cmFjayBvZiBudW1UaW1lc0FkZGVkICh0aGUgbnVtYmVyIG9mIHRpbWVzIGl0IHdhcyBhZGRlZCkgYmVjYXVzZSBpZiB5b3UgYXR0YWNoIHRoZSBzYW1lIGxpc3RlbmVyIHR3aWNlLFxuICAgIC8vIHdlIHNob3VsZCBhY3R1YWxseSBjYWxsIGl0IHR3aWNlIGZvciBlYWNoIGVtaXR0ZWQgZXZlbnQuXG4gICAgdGhpcy5vYnNlcnZlcnMgPSB7fTtcbiAgfVxuXG4gIG9uKGV2ZW50cywgbGlzdGVuZXIpIHtcbiAgICBldmVudHMuc3BsaXQoJyAnKS5mb3JFYWNoKChldmVudCkgPT4ge1xuICAgICAgaWYgKCF0aGlzLm9ic2VydmVyc1tldmVudF0pIHRoaXMub2JzZXJ2ZXJzW2V2ZW50XSA9IG5ldyBNYXAoKTtcbiAgICAgIGNvbnN0IG51bUxpc3RlbmVycyA9IHRoaXMub2JzZXJ2ZXJzW2V2ZW50XS5nZXQobGlzdGVuZXIpIHx8IDA7XG4gICAgICB0aGlzLm9ic2VydmVyc1tldmVudF0uc2V0KGxpc3RlbmVyLCBudW1MaXN0ZW5lcnMgKyAxKTtcbiAgICB9KTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIG9mZihldmVudCwgbGlzdGVuZXIpIHtcbiAgICBpZiAoIXRoaXMub2JzZXJ2ZXJzW2V2ZW50XSkgcmV0dXJuO1xuICAgIGlmICghbGlzdGVuZXIpIHtcbiAgICAgIGRlbGV0ZSB0aGlzLm9ic2VydmVyc1tldmVudF07XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5vYnNlcnZlcnNbZXZlbnRdLmRlbGV0ZShsaXN0ZW5lcik7XG4gIH1cblxuICBlbWl0KGV2ZW50LCAuLi5hcmdzKSB7XG4gICAgaWYgKHRoaXMub2JzZXJ2ZXJzW2V2ZW50XSkge1xuICAgICAgY29uc3QgY2xvbmVkID0gQXJyYXkuZnJvbSh0aGlzLm9ic2VydmVyc1tldmVudF0uZW50cmllcygpKTtcbiAgICAgIGNsb25lZC5mb3JFYWNoKChbb2JzZXJ2ZXIsIG51bVRpbWVzQWRkZWRdKSA9PiB7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbnVtVGltZXNBZGRlZDsgaSsrKSB7XG4gICAgICAgICAgb2JzZXJ2ZXIoLi4uYXJncyk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm9ic2VydmVyc1snKiddKSB7XG4gICAgICBjb25zdCBjbG9uZWQgPSBBcnJheS5mcm9tKHRoaXMub2JzZXJ2ZXJzWycqJ10uZW50cmllcygpKTtcbiAgICAgIGNsb25lZC5mb3JFYWNoKChbb2JzZXJ2ZXIsIG51bVRpbWVzQWRkZWRdKSA9PiB7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbnVtVGltZXNBZGRlZDsgaSsrKSB7XG4gICAgICAgICAgb2JzZXJ2ZXIuYXBwbHkob2JzZXJ2ZXIsIFtldmVudCwgLi4uYXJnc10pO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgRXZlbnRFbWl0dGVyO1xuIiwiLy8gaHR0cDovL2xlYS52ZXJvdS5tZS8yMDE2LzEyL3Jlc29sdmUtcHJvbWlzZXMtZXh0ZXJuYWxseS13aXRoLXRoaXMtb25lLXdlaXJkLXRyaWNrL1xuZXhwb3J0IGZ1bmN0aW9uIGRlZmVyKCkge1xuICBsZXQgcmVzO1xuICBsZXQgcmVqO1xuXG4gIGNvbnN0IHByb21pc2UgPSBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgcmVzID0gcmVzb2x2ZTtcbiAgICByZWogPSByZWplY3Q7XG4gIH0pO1xuXG4gIHByb21pc2UucmVzb2x2ZSA9IHJlcztcbiAgcHJvbWlzZS5yZWplY3QgPSByZWo7XG5cbiAgcmV0dXJuIHByb21pc2U7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBtYWtlU3RyaW5nKG9iamVjdCkge1xuICBpZiAob2JqZWN0ID09IG51bGwpIHJldHVybiAnJztcbiAgLyogZXNsaW50IHByZWZlci10ZW1wbGF0ZTogMCAqL1xuICByZXR1cm4gJycgKyBvYmplY3Q7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjb3B5KGEsIHMsIHQpIHtcbiAgYS5mb3JFYWNoKChtKSA9PiB7XG4gICAgaWYgKHNbbV0pIHRbbV0gPSBzW21dO1xuICB9KTtcbn1cblxuLy8gV2UgZXh0cmFjdCBvdXQgdGhlIFJlZ0V4cCBkZWZpbml0aW9uIHRvIGltcHJvdmUgcGVyZm9ybWFuY2Ugd2l0aCBSZWFjdCBOYXRpdmUgQW5kcm9pZCwgd2hpY2ggaGFzIHBvb3IgUmVnRXhwXG4vLyBpbml0aWFsaXphdGlvbiBwZXJmb3JtYW5jZVxuY29uc3QgbGFzdE9mUGF0aFNlcGFyYXRvclJlZ0V4cCA9IC8jIyMvZztcblxuZnVuY3Rpb24gZ2V0TGFzdE9mUGF0aChvYmplY3QsIHBhdGgsIEVtcHR5KSB7XG4gIGZ1bmN0aW9uIGNsZWFuS2V5KGtleSkge1xuICAgIHJldHVybiBrZXkgJiYga2V5LmluZGV4T2YoJyMjIycpID4gLTEgPyBrZXkucmVwbGFjZShsYXN0T2ZQYXRoU2VwYXJhdG9yUmVnRXhwLCAnLicpIDoga2V5O1xuICB9XG5cbiAgZnVuY3Rpb24gY2FuTm90VHJhdmVyc2VEZWVwZXIoKSB7XG4gICAgcmV0dXJuICFvYmplY3QgfHwgdHlwZW9mIG9iamVjdCA9PT0gJ3N0cmluZyc7XG4gIH1cblxuICBjb25zdCBzdGFjayA9IHR5cGVvZiBwYXRoICE9PSAnc3RyaW5nJyA/IHBhdGggOiBwYXRoLnNwbGl0KCcuJyk7XG4gIGxldCBzdGFja0luZGV4ID0gMDtcbiAgLy8gaXRlcmF0ZSB0aHJvdWdoIHRoZSBzdGFjaywgYnV0IGxlYXZlIHRoZSBsYXN0IGl0ZW1cbiAgd2hpbGUgKHN0YWNrSW5kZXggPCBzdGFjay5sZW5ndGggLSAxKSB7XG4gICAgaWYgKGNhbk5vdFRyYXZlcnNlRGVlcGVyKCkpIHJldHVybiB7fTtcblxuICAgIGNvbnN0IGtleSA9IGNsZWFuS2V5KHN0YWNrW3N0YWNrSW5kZXhdKTtcbiAgICBpZiAoIW9iamVjdFtrZXldICYmIEVtcHR5KSBvYmplY3Rba2V5XSA9IG5ldyBFbXB0eSgpO1xuICAgIC8vIHByZXZlbnQgcHJvdG90eXBlIHBvbGx1dGlvblxuICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqZWN0LCBrZXkpKSB7XG4gICAgICBvYmplY3QgPSBvYmplY3Rba2V5XTtcbiAgICB9IGVsc2Uge1xuICAgICAgb2JqZWN0ID0ge307XG4gICAgfVxuICAgICsrc3RhY2tJbmRleDtcbiAgfVxuXG4gIGlmIChjYW5Ob3RUcmF2ZXJzZURlZXBlcigpKSByZXR1cm4ge307XG4gIHJldHVybiB7XG4gICAgb2JqOiBvYmplY3QsXG4gICAgazogY2xlYW5LZXkoc3RhY2tbc3RhY2tJbmRleF0pLFxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2V0UGF0aChvYmplY3QsIHBhdGgsIG5ld1ZhbHVlKSB7XG4gIGNvbnN0IHsgb2JqLCBrIH0gPSBnZXRMYXN0T2ZQYXRoKG9iamVjdCwgcGF0aCwgT2JqZWN0KTtcbiAgaWYgKG9iaiAhPT0gdW5kZWZpbmVkIHx8IHBhdGgubGVuZ3RoID09PSAxKSB7XG4gICAgb2JqW2tdID0gbmV3VmFsdWU7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgbGV0IGUgPSBwYXRoW3BhdGgubGVuZ3RoIC0gMV07XG4gIGxldCBwID0gcGF0aC5zbGljZSgwLCBwYXRoLmxlbmd0aCAtIDEpO1xuICBsZXQgbGFzdCA9IGdldExhc3RPZlBhdGgob2JqZWN0LCBwLCBPYmplY3QpO1xuICB3aGlsZSAobGFzdC5vYmogPT09IHVuZGVmaW5lZCAmJiBwLmxlbmd0aCkge1xuICAgIGUgPSBgJHtwW3AubGVuZ3RoIC0gMV19LiR7ZX1gO1xuICAgIHAgPSBwLnNsaWNlKDAsIHAubGVuZ3RoIC0gMSk7XG4gICAgbGFzdCA9IGdldExhc3RPZlBhdGgob2JqZWN0LCBwLCBPYmplY3QpO1xuICAgIGlmIChsYXN0ICYmIGxhc3Qub2JqICYmIHR5cGVvZiBsYXN0Lm9ialtgJHtsYXN0Lmt9LiR7ZX1gXSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIGxhc3Qub2JqID0gdW5kZWZpbmVkO1xuICAgIH1cbiAgfVxuICBsYXN0Lm9ialtgJHtsYXN0Lmt9LiR7ZX1gXSA9IG5ld1ZhbHVlO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcHVzaFBhdGgob2JqZWN0LCBwYXRoLCBuZXdWYWx1ZSwgY29uY2F0KSB7XG4gIGNvbnN0IHsgb2JqLCBrIH0gPSBnZXRMYXN0T2ZQYXRoKG9iamVjdCwgcGF0aCwgT2JqZWN0KTtcblxuICBvYmpba10gPSBvYmpba10gfHwgW107XG4gIGlmIChjb25jYXQpIG9ialtrXSA9IG9ialtrXS5jb25jYXQobmV3VmFsdWUpO1xuICBpZiAoIWNvbmNhdCkgb2JqW2tdLnB1c2gobmV3VmFsdWUpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0UGF0aChvYmplY3QsIHBhdGgpIHtcbiAgY29uc3QgeyBvYmosIGsgfSA9IGdldExhc3RPZlBhdGgob2JqZWN0LCBwYXRoKTtcblxuICBpZiAoIW9iaikgcmV0dXJuIHVuZGVmaW5lZDtcbiAgcmV0dXJuIG9ialtrXTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFBhdGhXaXRoRGVmYXVsdHMoZGF0YSwgZGVmYXVsdERhdGEsIGtleSkge1xuICBjb25zdCB2YWx1ZSA9IGdldFBhdGgoZGF0YSwga2V5KTtcbiAgaWYgKHZhbHVlICE9PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cbiAgLy8gRmFsbGJhY2sgdG8gZGVmYXVsdCB2YWx1ZXNcbiAgcmV0dXJuIGdldFBhdGgoZGVmYXVsdERhdGEsIGtleSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkZWVwRXh0ZW5kKHRhcmdldCwgc291cmNlLCBvdmVyd3JpdGUpIHtcbiAgLyogZXNsaW50IG5vLXJlc3RyaWN0ZWQtc3ludGF4OiAwICovXG4gIGZvciAoY29uc3QgcHJvcCBpbiBzb3VyY2UpIHtcbiAgICBpZiAocHJvcCAhPT0gJ19fcHJvdG9fXycgJiYgcHJvcCAhPT0gJ2NvbnN0cnVjdG9yJykge1xuICAgICAgaWYgKHByb3AgaW4gdGFyZ2V0KSB7XG4gICAgICAgIC8vIElmIHdlIHJlYWNoZWQgYSBsZWFmIHN0cmluZyBpbiB0YXJnZXQgb3Igc291cmNlIHRoZW4gcmVwbGFjZSB3aXRoIHNvdXJjZSBvciBza2lwIGRlcGVuZGluZyBvbiB0aGUgJ292ZXJ3cml0ZScgc3dpdGNoXG4gICAgICAgIGlmIChcbiAgICAgICAgICB0eXBlb2YgdGFyZ2V0W3Byb3BdID09PSAnc3RyaW5nJyB8fFxuICAgICAgICAgIHRhcmdldFtwcm9wXSBpbnN0YW5jZW9mIFN0cmluZyB8fFxuICAgICAgICAgIHR5cGVvZiBzb3VyY2VbcHJvcF0gPT09ICdzdHJpbmcnIHx8XG4gICAgICAgICAgc291cmNlW3Byb3BdIGluc3RhbmNlb2YgU3RyaW5nXG4gICAgICAgICkge1xuICAgICAgICAgIGlmIChvdmVyd3JpdGUpIHRhcmdldFtwcm9wXSA9IHNvdXJjZVtwcm9wXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBkZWVwRXh0ZW5kKHRhcmdldFtwcm9wXSwgc291cmNlW3Byb3BdLCBvdmVyd3JpdGUpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0YXJnZXRbcHJvcF0gPSBzb3VyY2VbcHJvcF07XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiB0YXJnZXQ7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZWdleEVzY2FwZShzdHIpIHtcbiAgLyogZXNsaW50IG5vLXVzZWxlc3MtZXNjYXBlOiAwICovXG4gIHJldHVybiBzdHIucmVwbGFjZSgvW1xcLVxcW1xcXVxcL1xce1xcfVxcKFxcKVxcKlxcK1xcP1xcLlxcXFxcXF5cXCRcXHxdL2csICdcXFxcJCYnKTtcbn1cblxuLyogZXNsaW50LWRpc2FibGUgKi9cbnZhciBfZW50aXR5TWFwID0ge1xuICAnJic6ICcmYW1wOycsXG4gICc8JzogJyZsdDsnLFxuICAnPic6ICcmZ3Q7JyxcbiAgJ1wiJzogJyZxdW90OycsXG4gIFwiJ1wiOiAnJiMzOTsnLFxuICAnLyc6ICcmI3gyRjsnLFxufTtcbi8qIGVzbGludC1lbmFibGUgKi9cblxuZXhwb3J0IGZ1bmN0aW9uIGVzY2FwZShkYXRhKSB7XG4gIGlmICh0eXBlb2YgZGF0YSA9PT0gJ3N0cmluZycpIHtcbiAgICByZXR1cm4gZGF0YS5yZXBsYWNlKC9bJjw+XCInXFwvXS9nLCAocykgPT4gX2VudGl0eU1hcFtzXSk7XG4gIH1cblxuICByZXR1cm4gZGF0YTtcbn1cblxuLyoqXG4gKiBUaGlzIGlzIGEgcmV1c2FibGUgcmVndWxhciBleHByZXNzaW9uIGNhY2hlIGNsYXNzLiBHaXZlbiBhIGNlcnRhaW4gbWF4aW11bSBudW1iZXIgb2YgcmVndWxhciBleHByZXNzaW9ucyB3ZSdyZVxuICogYWxsb3dlZCB0byBzdG9yZSBpbiB0aGUgY2FjaGUsIGl0IHByb3ZpZGVzIGEgd2F5IHRvIGF2b2lkIHJlY3JlYXRpbmcgcmVndWxhciBleHByZXNzaW9uIG9iamVjdHMgb3ZlciBhbmQgb3Zlci5cbiAqIFdoZW4gaXQgbmVlZHMgdG8gZXZpY3Qgc29tZXRoaW5nLCBpdCBldmljdHMgdGhlIG9sZGVzdCBvbmUuXG4gKi9cbmNsYXNzIFJlZ0V4cENhY2hlIHtcbiAgY29uc3RydWN0b3IoY2FwYWNpdHkpIHtcbiAgICB0aGlzLmNhcGFjaXR5ID0gY2FwYWNpdHk7XG4gICAgdGhpcy5yZWdFeHBNYXAgPSBuZXcgTWFwKCk7XG4gICAgLy8gU2luY2Ugb3VyIGNhcGFjaXR5IHRlbmRzIHRvIGJlIGZhaXJseSBzbWFsbCwgYC5zaGlmdCgpYCB3aWxsIGJlIGZhaXJseSBxdWljayBkZXNwaXRlIGJlaW5nIE8obikuIFdlIGp1c3QgdXNlIGFcbiAgICAvLyBub3JtYWwgYXJyYXkgdG8ga2VlcCBpdCBzaW1wbGUuXG4gICAgdGhpcy5yZWdFeHBRdWV1ZSA9IFtdO1xuICB9XG5cbiAgZ2V0UmVnRXhwKHBhdHRlcm4pIHtcbiAgICBjb25zdCByZWdFeHBGcm9tQ2FjaGUgPSB0aGlzLnJlZ0V4cE1hcC5nZXQocGF0dGVybik7XG4gICAgaWYgKHJlZ0V4cEZyb21DYWNoZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gcmVnRXhwRnJvbUNhY2hlO1xuICAgIH1cbiAgICBjb25zdCByZWdFeHBOZXcgPSBuZXcgUmVnRXhwKHBhdHRlcm4pO1xuICAgIGlmICh0aGlzLnJlZ0V4cFF1ZXVlLmxlbmd0aCA9PT0gdGhpcy5jYXBhY2l0eSkge1xuICAgICAgdGhpcy5yZWdFeHBNYXAuZGVsZXRlKHRoaXMucmVnRXhwUXVldWUuc2hpZnQoKSk7XG4gICAgfVxuICAgIHRoaXMucmVnRXhwTWFwLnNldChwYXR0ZXJuLCByZWdFeHBOZXcpO1xuICAgIHRoaXMucmVnRXhwUXVldWUucHVzaChwYXR0ZXJuKTtcbiAgICByZXR1cm4gcmVnRXhwTmV3O1xuICB9XG59XG5cbmNvbnN0IGNoYXJzID0gWycgJywgJywnLCAnPycsICchJywgJzsnXTtcbi8vIFdlIGNhY2hlIFJlZ0V4cHMgdG8gaW1wcm92ZSBwZXJmb3JtYW5jZSB3aXRoIFJlYWN0IE5hdGl2ZSBBbmRyb2lkLCB3aGljaCBoYXMgcG9vciBSZWdFeHAgaW5pdGlhbGl6YXRpb24gcGVyZm9ybWFuY2UuXG4vLyBDYXBhY2l0eSBvZiAyMCBzaG91bGQgYmUgcGxlbnR5LCBhcyBuc1NlcGFyYXRvci9rZXlTZXBhcmF0b3IgZG9uJ3QgdGVuZCB0byB2YXJ5IG11Y2ggYWNyb3NzIGNhbGxzLlxuY29uc3QgbG9va3NMaWtlT2JqZWN0UGF0aFJlZ0V4cENhY2hlID0gbmV3IFJlZ0V4cENhY2hlKDIwKTtcblxuZXhwb3J0IGZ1bmN0aW9uIGxvb2tzTGlrZU9iamVjdFBhdGgoa2V5LCBuc1NlcGFyYXRvciwga2V5U2VwYXJhdG9yKSB7XG4gIG5zU2VwYXJhdG9yID0gbnNTZXBhcmF0b3IgfHwgJyc7XG4gIGtleVNlcGFyYXRvciA9IGtleVNlcGFyYXRvciB8fCAnJztcbiAgY29uc3QgcG9zc2libGVDaGFycyA9IGNoYXJzLmZpbHRlcihcbiAgICAoYykgPT4gbnNTZXBhcmF0b3IuaW5kZXhPZihjKSA8IDAgJiYga2V5U2VwYXJhdG9yLmluZGV4T2YoYykgPCAwLFxuICApO1xuICBpZiAocG9zc2libGVDaGFycy5sZW5ndGggPT09IDApIHJldHVybiB0cnVlO1xuICBjb25zdCByID0gbG9va3NMaWtlT2JqZWN0UGF0aFJlZ0V4cENhY2hlLmdldFJlZ0V4cChcbiAgICBgKCR7cG9zc2libGVDaGFycy5tYXAoKGMpID0+IChjID09PSAnPycgPyAnXFxcXD8nIDogYykpLmpvaW4oJ3wnKX0pYCxcbiAgKTtcbiAgbGV0IG1hdGNoZWQgPSAhci50ZXN0KGtleSk7XG4gIGlmICghbWF0Y2hlZCkge1xuICAgIGNvbnN0IGtpID0ga2V5LmluZGV4T2Yoa2V5U2VwYXJhdG9yKTtcbiAgICBpZiAoa2kgPiAwICYmICFyLnRlc3Qoa2V5LnN1YnN0cmluZygwLCBraSkpKSB7XG4gICAgICBtYXRjaGVkID0gdHJ1ZTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIG1hdGNoZWQ7XG59XG5cbi8qKlxuICogR2l2ZW5cbiAqXG4gKiAxLiBhIHRvcCBsZXZlbCBvYmplY3Qgb2JqLCBhbmRcbiAqIDIuIGEgcGF0aCB0byBhIGRlZXBseSBuZXN0ZWQgc3RyaW5nIG9yIG9iamVjdCB3aXRoaW4gaXRcbiAqXG4gKiBGaW5kIGFuZCByZXR1cm4gdGhhdCBkZWVwbHkgbmVzdGVkIHN0cmluZyBvciBvYmplY3QuIFRoZSBjYXZlYXQgaXMgdGhhdCB0aGUga2V5cyBvZiBvYmplY3RzIHdpdGhpbiB0aGUgbmVzdGluZyBjaGFpblxuICogbWF5IGNvbnRhaW4gcGVyaW9kIGNoYXJhY3RlcnMuIFRoZXJlZm9yZSwgd2UgbmVlZCB0byBERlMgYW5kIGV4cGxvcmUgYWxsIHBvc3NpYmxlIGtleXMgYXQgZWFjaCBzdGVwIHVudGlsIHdlIGZpbmQgdGhlXG4gKiBkZWVwbHkgbmVzdGVkIHN0cmluZyBvciBvYmplY3QuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkZWVwRmluZChvYmosIHBhdGgsIGtleVNlcGFyYXRvciA9ICcuJykge1xuICBpZiAoIW9iaikgcmV0dXJuIHVuZGVmaW5lZDtcbiAgaWYgKG9ialtwYXRoXSkgcmV0dXJuIG9ialtwYXRoXTtcbiAgY29uc3QgdG9rZW5zID0gcGF0aC5zcGxpdChrZXlTZXBhcmF0b3IpO1xuICBsZXQgY3VycmVudCA9IG9iajtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCB0b2tlbnMubGVuZ3RoOyApIHtcbiAgICBpZiAoIWN1cnJlbnQgfHwgdHlwZW9mIGN1cnJlbnQgIT09ICdvYmplY3QnKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBsZXQgbmV4dDtcbiAgICBsZXQgbmV4dFBhdGggPSAnJztcbiAgICBmb3IgKGxldCBqID0gaTsgaiA8IHRva2Vucy5sZW5ndGg7ICsraikge1xuICAgICAgaWYgKGogIT09IGkpIHtcbiAgICAgICAgbmV4dFBhdGggKz0ga2V5U2VwYXJhdG9yO1xuICAgICAgfVxuICAgICAgbmV4dFBhdGggKz0gdG9rZW5zW2pdO1xuICAgICAgbmV4dCA9IGN1cnJlbnRbbmV4dFBhdGhdO1xuICAgICAgaWYgKG5leHQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAoWydzdHJpbmcnLCAnbnVtYmVyJywgJ2Jvb2xlYW4nXS5pbmRleE9mKHR5cGVvZiBuZXh0KSA+IC0xICYmIGogPCB0b2tlbnMubGVuZ3RoIC0gMSkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIGkgKz0gaiAtIGkgKyAxO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gICAgY3VycmVudCA9IG5leHQ7XG4gIH1cbiAgcmV0dXJuIGN1cnJlbnQ7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRDbGVhbmVkQ29kZShjb2RlKSB7XG4gIGlmIChjb2RlICYmIGNvZGUuaW5kZXhPZignXycpID4gMCkgcmV0dXJuIGNvZGUucmVwbGFjZSgnXycsICctJyk7XG4gIHJldHVybiBjb2RlO1xufVxuIiwiaW1wb3J0IEV2ZW50RW1pdHRlciBmcm9tICcuL0V2ZW50RW1pdHRlci5qcyc7XG5pbXBvcnQgKiBhcyB1dGlscyBmcm9tICcuL3V0aWxzLmpzJztcblxuY2xhc3MgUmVzb3VyY2VTdG9yZSBleHRlbmRzIEV2ZW50RW1pdHRlciB7XG4gIGNvbnN0cnVjdG9yKGRhdGEsIG9wdGlvbnMgPSB7IG5zOiBbJ3RyYW5zbGF0aW9uJ10sIGRlZmF1bHROUzogJ3RyYW5zbGF0aW9uJyB9KSB7XG4gICAgc3VwZXIoKTtcblxuICAgIHRoaXMuZGF0YSA9IGRhdGEgfHwge307XG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcbiAgICBpZiAodGhpcy5vcHRpb25zLmtleVNlcGFyYXRvciA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzLm9wdGlvbnMua2V5U2VwYXJhdG9yID0gJy4nO1xuICAgIH1cbiAgICBpZiAodGhpcy5vcHRpb25zLmlnbm9yZUpTT05TdHJ1Y3R1cmUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5vcHRpb25zLmlnbm9yZUpTT05TdHJ1Y3R1cmUgPSB0cnVlO1xuICAgIH1cbiAgfVxuXG4gIGFkZE5hbWVzcGFjZXMobnMpIHtcbiAgICBpZiAodGhpcy5vcHRpb25zLm5zLmluZGV4T2YobnMpIDwgMCkge1xuICAgICAgdGhpcy5vcHRpb25zLm5zLnB1c2gobnMpO1xuICAgIH1cbiAgfVxuXG4gIHJlbW92ZU5hbWVzcGFjZXMobnMpIHtcbiAgICBjb25zdCBpbmRleCA9IHRoaXMub3B0aW9ucy5ucy5pbmRleE9mKG5zKTtcbiAgICBpZiAoaW5kZXggPiAtMSkge1xuICAgICAgdGhpcy5vcHRpb25zLm5zLnNwbGljZShpbmRleCwgMSk7XG4gICAgfVxuICB9XG5cbiAgZ2V0UmVzb3VyY2UobG5nLCBucywga2V5LCBvcHRpb25zID0ge30pIHtcbiAgICBjb25zdCBrZXlTZXBhcmF0b3IgPVxuICAgICAgb3B0aW9ucy5rZXlTZXBhcmF0b3IgIT09IHVuZGVmaW5lZCA/IG9wdGlvbnMua2V5U2VwYXJhdG9yIDogdGhpcy5vcHRpb25zLmtleVNlcGFyYXRvcjtcblxuICAgIGNvbnN0IGlnbm9yZUpTT05TdHJ1Y3R1cmUgPVxuICAgICAgb3B0aW9ucy5pZ25vcmVKU09OU3RydWN0dXJlICE9PSB1bmRlZmluZWRcbiAgICAgICAgPyBvcHRpb25zLmlnbm9yZUpTT05TdHJ1Y3R1cmVcbiAgICAgICAgOiB0aGlzLm9wdGlvbnMuaWdub3JlSlNPTlN0cnVjdHVyZTtcblxuICAgIGxldCBwYXRoO1xuICAgIGlmIChsbmcuaW5kZXhPZignLicpID4gLTEpIHtcbiAgICAgIHBhdGggPSBsbmcuc3BsaXQoJy4nKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcGF0aCA9IFtsbmcsIG5zXTtcbiAgICAgIGlmIChrZXkpIHtcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoa2V5KSkge1xuICAgICAgICAgIHBhdGgucHVzaCguLi5rZXkpO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBrZXkgPT09ICdzdHJpbmcnICYmIGtleVNlcGFyYXRvcikge1xuICAgICAgICAgIHBhdGgucHVzaCguLi5rZXkuc3BsaXQoa2V5U2VwYXJhdG9yKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcGF0aC5wdXNoKGtleSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCByZXN1bHQgPSB1dGlscy5nZXRQYXRoKHRoaXMuZGF0YSwgcGF0aCk7XG4gICAgaWYgKCFyZXN1bHQgJiYgIW5zICYmICFrZXkgJiYgbG5nLmluZGV4T2YoJy4nKSA+IC0xKSB7XG4gICAgICBsbmcgPSBwYXRoWzBdO1xuICAgICAgbnMgPSBwYXRoWzFdO1xuICAgICAga2V5ID0gcGF0aC5zbGljZSgyKS5qb2luKCcuJyk7XG4gICAgfVxuICAgIGlmIChyZXN1bHQgfHwgIWlnbm9yZUpTT05TdHJ1Y3R1cmUgfHwgdHlwZW9mIGtleSAhPT0gJ3N0cmluZycpIHJldHVybiByZXN1bHQ7XG5cbiAgICByZXR1cm4gdXRpbHMuZGVlcEZpbmQodGhpcy5kYXRhICYmIHRoaXMuZGF0YVtsbmddICYmIHRoaXMuZGF0YVtsbmddW25zXSwga2V5LCBrZXlTZXBhcmF0b3IpO1xuICB9XG5cbiAgYWRkUmVzb3VyY2UobG5nLCBucywga2V5LCB2YWx1ZSwgb3B0aW9ucyA9IHsgc2lsZW50OiBmYWxzZSB9KSB7XG4gICAgY29uc3Qga2V5U2VwYXJhdG9yID1cbiAgICAgIG9wdGlvbnMua2V5U2VwYXJhdG9yICE9PSB1bmRlZmluZWQgPyBvcHRpb25zLmtleVNlcGFyYXRvciA6IHRoaXMub3B0aW9ucy5rZXlTZXBhcmF0b3I7XG5cbiAgICBsZXQgcGF0aCA9IFtsbmcsIG5zXTtcbiAgICBpZiAoa2V5KSBwYXRoID0gcGF0aC5jb25jYXQoa2V5U2VwYXJhdG9yID8ga2V5LnNwbGl0KGtleVNlcGFyYXRvcikgOiBrZXkpO1xuXG4gICAgaWYgKGxuZy5pbmRleE9mKCcuJykgPiAtMSkge1xuICAgICAgcGF0aCA9IGxuZy5zcGxpdCgnLicpO1xuICAgICAgdmFsdWUgPSBucztcbiAgICAgIG5zID0gcGF0aFsxXTtcbiAgICB9XG5cbiAgICB0aGlzLmFkZE5hbWVzcGFjZXMobnMpO1xuXG4gICAgdXRpbHMuc2V0UGF0aCh0aGlzLmRhdGEsIHBhdGgsIHZhbHVlKTtcblxuICAgIGlmICghb3B0aW9ucy5zaWxlbnQpIHRoaXMuZW1pdCgnYWRkZWQnLCBsbmcsIG5zLCBrZXksIHZhbHVlKTtcbiAgfVxuXG4gIGFkZFJlc291cmNlcyhsbmcsIG5zLCByZXNvdXJjZXMsIG9wdGlvbnMgPSB7IHNpbGVudDogZmFsc2UgfSkge1xuICAgIC8qIGVzbGludCBuby1yZXN0cmljdGVkLXN5bnRheDogMCAqL1xuICAgIGZvciAoY29uc3QgbSBpbiByZXNvdXJjZXMpIHtcbiAgICAgIGlmIChcbiAgICAgICAgdHlwZW9mIHJlc291cmNlc1ttXSA9PT0gJ3N0cmluZycgfHxcbiAgICAgICAgT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5hcHBseShyZXNvdXJjZXNbbV0pID09PSAnW29iamVjdCBBcnJheV0nXG4gICAgICApXG4gICAgICAgIHRoaXMuYWRkUmVzb3VyY2UobG5nLCBucywgbSwgcmVzb3VyY2VzW21dLCB7IHNpbGVudDogdHJ1ZSB9KTtcbiAgICB9XG4gICAgaWYgKCFvcHRpb25zLnNpbGVudCkgdGhpcy5lbWl0KCdhZGRlZCcsIGxuZywgbnMsIHJlc291cmNlcyk7XG4gIH1cblxuICBhZGRSZXNvdXJjZUJ1bmRsZShcbiAgICBsbmcsXG4gICAgbnMsXG4gICAgcmVzb3VyY2VzLFxuICAgIGRlZXAsXG4gICAgb3ZlcndyaXRlLFxuICAgIG9wdGlvbnMgPSB7IHNpbGVudDogZmFsc2UsIHNraXBDb3B5OiBmYWxzZSB9LFxuICApIHtcbiAgICBsZXQgcGF0aCA9IFtsbmcsIG5zXTtcbiAgICBpZiAobG5nLmluZGV4T2YoJy4nKSA+IC0xKSB7XG4gICAgICBwYXRoID0gbG5nLnNwbGl0KCcuJyk7XG4gICAgICBkZWVwID0gcmVzb3VyY2VzO1xuICAgICAgcmVzb3VyY2VzID0gbnM7XG4gICAgICBucyA9IHBhdGhbMV07XG4gICAgfVxuXG4gICAgdGhpcy5hZGROYW1lc3BhY2VzKG5zKTtcblxuICAgIGxldCBwYWNrID0gdXRpbHMuZ2V0UGF0aCh0aGlzLmRhdGEsIHBhdGgpIHx8IHt9O1xuXG4gICAgaWYgKCFvcHRpb25zLnNraXBDb3B5KSByZXNvdXJjZXMgPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KHJlc291cmNlcykpOyAvLyBtYWtlIGEgY29weSB0byBmaXggIzIwODFcblxuICAgIGlmIChkZWVwKSB7XG4gICAgICB1dGlscy5kZWVwRXh0ZW5kKHBhY2ssIHJlc291cmNlcywgb3ZlcndyaXRlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcGFjayA9IHsgLi4ucGFjaywgLi4ucmVzb3VyY2VzIH07XG4gICAgfVxuXG4gICAgdXRpbHMuc2V0UGF0aCh0aGlzLmRhdGEsIHBhdGgsIHBhY2spO1xuXG4gICAgaWYgKCFvcHRpb25zLnNpbGVudCkgdGhpcy5lbWl0KCdhZGRlZCcsIGxuZywgbnMsIHJlc291cmNlcyk7XG4gIH1cblxuICByZW1vdmVSZXNvdXJjZUJ1bmRsZShsbmcsIG5zKSB7XG4gICAgaWYgKHRoaXMuaGFzUmVzb3VyY2VCdW5kbGUobG5nLCBucykpIHtcbiAgICAgIGRlbGV0ZSB0aGlzLmRhdGFbbG5nXVtuc107XG4gICAgfVxuICAgIHRoaXMucmVtb3ZlTmFtZXNwYWNlcyhucyk7XG5cbiAgICB0aGlzLmVtaXQoJ3JlbW92ZWQnLCBsbmcsIG5zKTtcbiAgfVxuXG4gIGhhc1Jlc291cmNlQnVuZGxlKGxuZywgbnMpIHtcbiAgICByZXR1cm4gdGhpcy5nZXRSZXNvdXJjZShsbmcsIG5zKSAhPT0gdW5kZWZpbmVkO1xuICB9XG5cbiAgZ2V0UmVzb3VyY2VCdW5kbGUobG5nLCBucykge1xuICAgIGlmICghbnMpIG5zID0gdGhpcy5vcHRpb25zLmRlZmF1bHROUztcblxuICAgIC8vIENPTVBBVElCSUxJVFk6IHJlbW92ZSBleHRlbmQgaW4gdjIuMS4wXG4gICAgaWYgKHRoaXMub3B0aW9ucy5jb21wYXRpYmlsaXR5QVBJID09PSAndjEnKSByZXR1cm4geyAuLi57fSwgLi4udGhpcy5nZXRSZXNvdXJjZShsbmcsIG5zKSB9O1xuXG4gICAgcmV0dXJuIHRoaXMuZ2V0UmVzb3VyY2UobG5nLCBucyk7XG4gIH1cblxuICBnZXREYXRhQnlMYW5ndWFnZShsbmcpIHtcbiAgICByZXR1cm4gdGhpcy5kYXRhW2xuZ107XG4gIH1cblxuICBoYXNMYW5ndWFnZVNvbWVUcmFuc2xhdGlvbnMobG5nKSB7XG4gICAgY29uc3QgZGF0YSA9IHRoaXMuZ2V0RGF0YUJ5TGFuZ3VhZ2UobG5nKTtcbiAgICBjb25zdCBuID0gKGRhdGEgJiYgT2JqZWN0LmtleXMoZGF0YSkpIHx8IFtdO1xuICAgIHJldHVybiAhIW4uZmluZCgodikgPT4gZGF0YVt2XSAmJiBPYmplY3Qua2V5cyhkYXRhW3ZdKS5sZW5ndGggPiAwKTtcbiAgfVxuXG4gIHRvSlNPTigpIHtcbiAgICByZXR1cm4gdGhpcy5kYXRhO1xuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IFJlc291cmNlU3RvcmU7XG4iLCJleHBvcnQgZGVmYXVsdCB7XG4gIHByb2Nlc3NvcnM6IHt9LFxuXG4gIGFkZFBvc3RQcm9jZXNzb3IobW9kdWxlKSB7XG4gICAgdGhpcy5wcm9jZXNzb3JzW21vZHVsZS5uYW1lXSA9IG1vZHVsZTtcbiAgfSxcblxuICBoYW5kbGUocHJvY2Vzc29ycywgdmFsdWUsIGtleSwgb3B0aW9ucywgdHJhbnNsYXRvcikge1xuICAgIHByb2Nlc3NvcnMuZm9yRWFjaCgocHJvY2Vzc29yKSA9PiB7XG4gICAgICBpZiAodGhpcy5wcm9jZXNzb3JzW3Byb2Nlc3Nvcl0pXG4gICAgICAgIHZhbHVlID0gdGhpcy5wcm9jZXNzb3JzW3Byb2Nlc3Nvcl0ucHJvY2Vzcyh2YWx1ZSwga2V5LCBvcHRpb25zLCB0cmFuc2xhdG9yKTtcbiAgICB9KTtcblxuICAgIHJldHVybiB2YWx1ZTtcbiAgfSxcbn07XG4iLCJpbXBvcnQgYmFzZUxvZ2dlciBmcm9tICcuL2xvZ2dlci5qcyc7XG5pbXBvcnQgRXZlbnRFbWl0dGVyIGZyb20gJy4vRXZlbnRFbWl0dGVyLmpzJztcbmltcG9ydCBwb3N0UHJvY2Vzc29yIGZyb20gJy4vcG9zdFByb2Nlc3Nvci5qcyc7XG5pbXBvcnQgKiBhcyB1dGlscyBmcm9tICcuL3V0aWxzLmpzJztcblxuY29uc3QgY2hlY2tlZExvYWRlZEZvciA9IHt9O1xuXG5jbGFzcyBUcmFuc2xhdG9yIGV4dGVuZHMgRXZlbnRFbWl0dGVyIHtcbiAgY29uc3RydWN0b3Ioc2VydmljZXMsIG9wdGlvbnMgPSB7fSkge1xuICAgIHN1cGVyKCk7XG5cbiAgICB1dGlscy5jb3B5KFxuICAgICAgW1xuICAgICAgICAncmVzb3VyY2VTdG9yZScsXG4gICAgICAgICdsYW5ndWFnZVV0aWxzJyxcbiAgICAgICAgJ3BsdXJhbFJlc29sdmVyJyxcbiAgICAgICAgJ2ludGVycG9sYXRvcicsXG4gICAgICAgICdiYWNrZW5kQ29ubmVjdG9yJyxcbiAgICAgICAgJ2kxOG5Gb3JtYXQnLFxuICAgICAgICAndXRpbHMnLFxuICAgICAgXSxcbiAgICAgIHNlcnZpY2VzLFxuICAgICAgdGhpcyxcbiAgICApO1xuXG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcbiAgICBpZiAodGhpcy5vcHRpb25zLmtleVNlcGFyYXRvciA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzLm9wdGlvbnMua2V5U2VwYXJhdG9yID0gJy4nO1xuICAgIH1cblxuICAgIHRoaXMubG9nZ2VyID0gYmFzZUxvZ2dlci5jcmVhdGUoJ3RyYW5zbGF0b3InKTtcbiAgfVxuXG4gIGNoYW5nZUxhbmd1YWdlKGxuZykge1xuICAgIGlmIChsbmcpIHRoaXMubGFuZ3VhZ2UgPSBsbmc7XG4gIH1cblxuICBleGlzdHMoa2V5LCBvcHRpb25zID0geyBpbnRlcnBvbGF0aW9uOiB7fSB9KSB7XG4gICAgaWYgKGtleSA9PT0gdW5kZWZpbmVkIHx8IGtleSA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGNvbnN0IHJlc29sdmVkID0gdGhpcy5yZXNvbHZlKGtleSwgb3B0aW9ucyk7XG4gICAgcmV0dXJuIHJlc29sdmVkICYmIHJlc29sdmVkLnJlcyAhPT0gdW5kZWZpbmVkO1xuICB9XG5cbiAgZXh0cmFjdEZyb21LZXkoa2V5LCBvcHRpb25zKSB7XG4gICAgbGV0IG5zU2VwYXJhdG9yID1cbiAgICAgIG9wdGlvbnMubnNTZXBhcmF0b3IgIT09IHVuZGVmaW5lZCA/IG9wdGlvbnMubnNTZXBhcmF0b3IgOiB0aGlzLm9wdGlvbnMubnNTZXBhcmF0b3I7XG4gICAgaWYgKG5zU2VwYXJhdG9yID09PSB1bmRlZmluZWQpIG5zU2VwYXJhdG9yID0gJzonO1xuXG4gICAgY29uc3Qga2V5U2VwYXJhdG9yID1cbiAgICAgIG9wdGlvbnMua2V5U2VwYXJhdG9yICE9PSB1bmRlZmluZWQgPyBvcHRpb25zLmtleVNlcGFyYXRvciA6IHRoaXMub3B0aW9ucy5rZXlTZXBhcmF0b3I7XG5cbiAgICBsZXQgbmFtZXNwYWNlcyA9IG9wdGlvbnMubnMgfHwgdGhpcy5vcHRpb25zLmRlZmF1bHROUyB8fCBbXTtcbiAgICBjb25zdCB3b3VsZENoZWNrRm9yTnNJbktleSA9IG5zU2VwYXJhdG9yICYmIGtleS5pbmRleE9mKG5zU2VwYXJhdG9yKSA+IC0xO1xuICAgIGNvbnN0IHNlZW1zTmF0dXJhbExhbmd1YWdlID1cbiAgICAgICF0aGlzLm9wdGlvbnMudXNlckRlZmluZWRLZXlTZXBhcmF0b3IgJiZcbiAgICAgICFvcHRpb25zLmtleVNlcGFyYXRvciAmJlxuICAgICAgIXRoaXMub3B0aW9ucy51c2VyRGVmaW5lZE5zU2VwYXJhdG9yICYmXG4gICAgICAhb3B0aW9ucy5uc1NlcGFyYXRvciAmJlxuICAgICAgIXV0aWxzLmxvb2tzTGlrZU9iamVjdFBhdGgoa2V5LCBuc1NlcGFyYXRvciwga2V5U2VwYXJhdG9yKTtcbiAgICBpZiAod291bGRDaGVja0Zvck5zSW5LZXkgJiYgIXNlZW1zTmF0dXJhbExhbmd1YWdlKSB7XG4gICAgICBjb25zdCBtID0ga2V5Lm1hdGNoKHRoaXMuaW50ZXJwb2xhdG9yLm5lc3RpbmdSZWdleHApO1xuICAgICAgaWYgKG0gJiYgbS5sZW5ndGggPiAwKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAga2V5LFxuICAgICAgICAgIG5hbWVzcGFjZXMsXG4gICAgICAgIH07XG4gICAgICB9XG4gICAgICBjb25zdCBwYXJ0cyA9IGtleS5zcGxpdChuc1NlcGFyYXRvcik7XG4gICAgICBpZiAoXG4gICAgICAgIG5zU2VwYXJhdG9yICE9PSBrZXlTZXBhcmF0b3IgfHxcbiAgICAgICAgKG5zU2VwYXJhdG9yID09PSBrZXlTZXBhcmF0b3IgJiYgdGhpcy5vcHRpb25zLm5zLmluZGV4T2YocGFydHNbMF0pID4gLTEpXG4gICAgICApXG4gICAgICAgIG5hbWVzcGFjZXMgPSBwYXJ0cy5zaGlmdCgpO1xuICAgICAga2V5ID0gcGFydHMuam9pbihrZXlTZXBhcmF0b3IpO1xuICAgIH1cbiAgICBpZiAodHlwZW9mIG5hbWVzcGFjZXMgPT09ICdzdHJpbmcnKSBuYW1lc3BhY2VzID0gW25hbWVzcGFjZXNdO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIGtleSxcbiAgICAgIG5hbWVzcGFjZXMsXG4gICAgfTtcbiAgfVxuXG4gIHRyYW5zbGF0ZShrZXlzLCBvcHRpb25zLCBsYXN0S2V5KSB7XG4gICAgaWYgKHR5cGVvZiBvcHRpb25zICE9PSAnb2JqZWN0JyAmJiB0aGlzLm9wdGlvbnMub3ZlcmxvYWRUcmFuc2xhdGlvbk9wdGlvbkhhbmRsZXIpIHtcbiAgICAgIC8qIGVzbGludCBwcmVmZXItcmVzdC1wYXJhbXM6IDAgKi9cbiAgICAgIG9wdGlvbnMgPSB0aGlzLm9wdGlvbnMub3ZlcmxvYWRUcmFuc2xhdGlvbk9wdGlvbkhhbmRsZXIoYXJndW1lbnRzKTtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiBvcHRpb25zID09PSAnb2JqZWN0Jykgb3B0aW9ucyA9IHsgLi4ub3B0aW9ucyB9O1xuICAgIGlmICghb3B0aW9ucykgb3B0aW9ucyA9IHt9O1xuXG4gICAgLy8gbm9uIHZhbGlkIGtleXMgaGFuZGxpbmdcbiAgICBpZiAoa2V5cyA9PT0gdW5kZWZpbmVkIHx8IGtleXMgPT09IG51bGwgLyogfHwga2V5cyA9PT0gJycgKi8pIHJldHVybiAnJztcbiAgICBpZiAoIUFycmF5LmlzQXJyYXkoa2V5cykpIGtleXMgPSBbU3RyaW5nKGtleXMpXTtcblxuICAgIGNvbnN0IHJldHVybkRldGFpbHMgPVxuICAgICAgb3B0aW9ucy5yZXR1cm5EZXRhaWxzICE9PSB1bmRlZmluZWQgPyBvcHRpb25zLnJldHVybkRldGFpbHMgOiB0aGlzLm9wdGlvbnMucmV0dXJuRGV0YWlscztcblxuICAgIC8vIHNlcGFyYXRvcnNcbiAgICBjb25zdCBrZXlTZXBhcmF0b3IgPVxuICAgICAgb3B0aW9ucy5rZXlTZXBhcmF0b3IgIT09IHVuZGVmaW5lZCA/IG9wdGlvbnMua2V5U2VwYXJhdG9yIDogdGhpcy5vcHRpb25zLmtleVNlcGFyYXRvcjtcblxuICAgIC8vIGdldCBuYW1lc3BhY2UocylcbiAgICBjb25zdCB7IGtleSwgbmFtZXNwYWNlcyB9ID0gdGhpcy5leHRyYWN0RnJvbUtleShrZXlzW2tleXMubGVuZ3RoIC0gMV0sIG9wdGlvbnMpO1xuICAgIGNvbnN0IG5hbWVzcGFjZSA9IG5hbWVzcGFjZXNbbmFtZXNwYWNlcy5sZW5ndGggLSAxXTtcblxuICAgIC8vIHJldHVybiBrZXkgb24gQ0lNb2RlXG4gICAgY29uc3QgbG5nID0gb3B0aW9ucy5sbmcgfHwgdGhpcy5sYW5ndWFnZTtcbiAgICBjb25zdCBhcHBlbmROYW1lc3BhY2VUb0NJTW9kZSA9XG4gICAgICBvcHRpb25zLmFwcGVuZE5hbWVzcGFjZVRvQ0lNb2RlIHx8IHRoaXMub3B0aW9ucy5hcHBlbmROYW1lc3BhY2VUb0NJTW9kZTtcbiAgICBpZiAobG5nICYmIGxuZy50b0xvd2VyQ2FzZSgpID09PSAnY2ltb2RlJykge1xuICAgICAgaWYgKGFwcGVuZE5hbWVzcGFjZVRvQ0lNb2RlKSB7XG4gICAgICAgIGNvbnN0IG5zU2VwYXJhdG9yID0gb3B0aW9ucy5uc1NlcGFyYXRvciB8fCB0aGlzLm9wdGlvbnMubnNTZXBhcmF0b3I7XG4gICAgICAgIGlmIChyZXR1cm5EZXRhaWxzKSB7XG4gICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJlczogYCR7bmFtZXNwYWNlfSR7bnNTZXBhcmF0b3J9JHtrZXl9YCxcbiAgICAgICAgICAgIHVzZWRLZXk6IGtleSxcbiAgICAgICAgICAgIGV4YWN0VXNlZEtleToga2V5LFxuICAgICAgICAgICAgdXNlZExuZzogbG5nLFxuICAgICAgICAgICAgdXNlZE5TOiBuYW1lc3BhY2UsXG4gICAgICAgICAgICB1c2VkUGFyYW1zOiB0aGlzLmdldFVzZWRQYXJhbXNEZXRhaWxzKG9wdGlvbnMpLFxuICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGAke25hbWVzcGFjZX0ke25zU2VwYXJhdG9yfSR7a2V5fWA7XG4gICAgICB9XG5cbiAgICAgIGlmIChyZXR1cm5EZXRhaWxzKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgcmVzOiBrZXksXG4gICAgICAgICAgdXNlZEtleToga2V5LFxuICAgICAgICAgIGV4YWN0VXNlZEtleToga2V5LFxuICAgICAgICAgIHVzZWRMbmc6IGxuZyxcbiAgICAgICAgICB1c2VkTlM6IG5hbWVzcGFjZSxcbiAgICAgICAgICB1c2VkUGFyYW1zOiB0aGlzLmdldFVzZWRQYXJhbXNEZXRhaWxzKG9wdGlvbnMpLFxuICAgICAgICB9O1xuICAgICAgfVxuICAgICAgcmV0dXJuIGtleTtcbiAgICB9XG5cbiAgICAvLyByZXNvbHZlIGZyb20gc3RvcmVcbiAgICBjb25zdCByZXNvbHZlZCA9IHRoaXMucmVzb2x2ZShrZXlzLCBvcHRpb25zKTtcbiAgICBsZXQgcmVzID0gcmVzb2x2ZWQgJiYgcmVzb2x2ZWQucmVzO1xuICAgIGNvbnN0IHJlc1VzZWRLZXkgPSAocmVzb2x2ZWQgJiYgcmVzb2x2ZWQudXNlZEtleSkgfHwga2V5O1xuICAgIGNvbnN0IHJlc0V4YWN0VXNlZEtleSA9IChyZXNvbHZlZCAmJiByZXNvbHZlZC5leGFjdFVzZWRLZXkpIHx8IGtleTtcblxuICAgIGNvbnN0IHJlc1R5cGUgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmFwcGx5KHJlcyk7XG4gICAgY29uc3Qgbm9PYmplY3QgPSBbJ1tvYmplY3QgTnVtYmVyXScsICdbb2JqZWN0IEZ1bmN0aW9uXScsICdbb2JqZWN0IFJlZ0V4cF0nXTtcbiAgICBjb25zdCBqb2luQXJyYXlzID1cbiAgICAgIG9wdGlvbnMuam9pbkFycmF5cyAhPT0gdW5kZWZpbmVkID8gb3B0aW9ucy5qb2luQXJyYXlzIDogdGhpcy5vcHRpb25zLmpvaW5BcnJheXM7XG5cbiAgICAvLyBvYmplY3RcbiAgICBjb25zdCBoYW5kbGVBc09iamVjdEluSTE4bkZvcm1hdCA9ICF0aGlzLmkxOG5Gb3JtYXQgfHwgdGhpcy5pMThuRm9ybWF0LmhhbmRsZUFzT2JqZWN0O1xuICAgIGNvbnN0IGhhbmRsZUFzT2JqZWN0ID1cbiAgICAgIHR5cGVvZiByZXMgIT09ICdzdHJpbmcnICYmIHR5cGVvZiByZXMgIT09ICdib29sZWFuJyAmJiB0eXBlb2YgcmVzICE9PSAnbnVtYmVyJztcbiAgICBpZiAoXG4gICAgICBoYW5kbGVBc09iamVjdEluSTE4bkZvcm1hdCAmJlxuICAgICAgcmVzICYmXG4gICAgICBoYW5kbGVBc09iamVjdCAmJlxuICAgICAgbm9PYmplY3QuaW5kZXhPZihyZXNUeXBlKSA8IDAgJiZcbiAgICAgICEodHlwZW9mIGpvaW5BcnJheXMgPT09ICdzdHJpbmcnICYmIHJlc1R5cGUgPT09ICdbb2JqZWN0IEFycmF5XScpXG4gICAgKSB7XG4gICAgICBpZiAoIW9wdGlvbnMucmV0dXJuT2JqZWN0cyAmJiAhdGhpcy5vcHRpb25zLnJldHVybk9iamVjdHMpIHtcbiAgICAgICAgaWYgKCF0aGlzLm9wdGlvbnMucmV0dXJuZWRPYmplY3RIYW5kbGVyKSB7XG4gICAgICAgICAgdGhpcy5sb2dnZXIud2FybignYWNjZXNzaW5nIGFuIG9iamVjdCAtIGJ1dCByZXR1cm5PYmplY3RzIG9wdGlvbnMgaXMgbm90IGVuYWJsZWQhJyk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgciA9IHRoaXMub3B0aW9ucy5yZXR1cm5lZE9iamVjdEhhbmRsZXJcbiAgICAgICAgICA/IHRoaXMub3B0aW9ucy5yZXR1cm5lZE9iamVjdEhhbmRsZXIocmVzVXNlZEtleSwgcmVzLCB7IC4uLm9wdGlvbnMsIG5zOiBuYW1lc3BhY2VzIH0pXG4gICAgICAgICAgOiBga2V5ICcke2tleX0gKCR7dGhpcy5sYW5ndWFnZX0pJyByZXR1cm5lZCBhbiBvYmplY3QgaW5zdGVhZCBvZiBzdHJpbmcuYDtcbiAgICAgICAgaWYgKHJldHVybkRldGFpbHMpIHtcbiAgICAgICAgICByZXNvbHZlZC5yZXMgPSByO1xuICAgICAgICAgIHJlc29sdmVkLnVzZWRQYXJhbXMgPSB0aGlzLmdldFVzZWRQYXJhbXNEZXRhaWxzKG9wdGlvbnMpO1xuICAgICAgICAgIHJldHVybiByZXNvbHZlZDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcjtcbiAgICAgIH1cblxuICAgICAgLy8gaWYgd2UgZ290IGEgc2VwYXJhdG9yIHdlIGxvb3Agb3ZlciBjaGlsZHJlbiAtIGVsc2Ugd2UganVzdCByZXR1cm4gb2JqZWN0IGFzIGlzXG4gICAgICAvLyBhcyBoYXZpbmcgaXQgc2V0IHRvIGZhbHNlIG1lYW5zIG5vIGhpZXJhcmNoeSBzbyBubyBsb29rdXAgZm9yIG5lc3RlZCB2YWx1ZXNcbiAgICAgIGlmIChrZXlTZXBhcmF0b3IpIHtcbiAgICAgICAgY29uc3QgcmVzVHlwZUlzQXJyYXkgPSByZXNUeXBlID09PSAnW29iamVjdCBBcnJheV0nO1xuICAgICAgICBjb25zdCBjb3B5ID0gcmVzVHlwZUlzQXJyYXkgPyBbXSA6IHt9OyAvLyBhcHBseSBjaGlsZCB0cmFuc2xhdGlvbiBvbiBhIGNvcHlcblxuICAgICAgICAvKiBlc2xpbnQgbm8tcmVzdHJpY3RlZC1zeW50YXg6IDAgKi9cbiAgICAgICAgY29uc3QgbmV3S2V5VG9Vc2UgPSByZXNUeXBlSXNBcnJheSA/IHJlc0V4YWN0VXNlZEtleSA6IHJlc1VzZWRLZXk7XG4gICAgICAgIGZvciAoY29uc3QgbSBpbiByZXMpIHtcbiAgICAgICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHJlcywgbSkpIHtcbiAgICAgICAgICAgIGNvbnN0IGRlZXBLZXkgPSBgJHtuZXdLZXlUb1VzZX0ke2tleVNlcGFyYXRvcn0ke219YDtcbiAgICAgICAgICAgIGNvcHlbbV0gPSB0aGlzLnRyYW5zbGF0ZShkZWVwS2V5LCB7XG4gICAgICAgICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICAgICAgICAgIC4uLnsgam9pbkFycmF5czogZmFsc2UsIG5zOiBuYW1lc3BhY2VzIH0sXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmIChjb3B5W21dID09PSBkZWVwS2V5KSBjb3B5W21dID0gcmVzW21dOyAvLyBpZiBub3RoaW5nIGZvdW5kIHVzZSBvcmlnaW5hbCB2YWx1ZSBhcyBmYWxsYmFja1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXMgPSBjb3B5O1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoXG4gICAgICBoYW5kbGVBc09iamVjdEluSTE4bkZvcm1hdCAmJlxuICAgICAgdHlwZW9mIGpvaW5BcnJheXMgPT09ICdzdHJpbmcnICYmXG4gICAgICByZXNUeXBlID09PSAnW29iamVjdCBBcnJheV0nXG4gICAgKSB7XG4gICAgICAvLyBhcnJheSBzcGVjaWFsIHRyZWF0bWVudFxuICAgICAgcmVzID0gcmVzLmpvaW4oam9pbkFycmF5cyk7XG4gICAgICBpZiAocmVzKSByZXMgPSB0aGlzLmV4dGVuZFRyYW5zbGF0aW9uKHJlcywga2V5cywgb3B0aW9ucywgbGFzdEtleSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIHN0cmluZywgZW1wdHkgb3IgbnVsbFxuICAgICAgbGV0IHVzZWREZWZhdWx0ID0gZmFsc2U7XG4gICAgICBsZXQgdXNlZEtleSA9IGZhbHNlO1xuXG4gICAgICBjb25zdCBuZWVkc1BsdXJhbEhhbmRsaW5nID0gb3B0aW9ucy5jb3VudCAhPT0gdW5kZWZpbmVkICYmIHR5cGVvZiBvcHRpb25zLmNvdW50ICE9PSAnc3RyaW5nJztcbiAgICAgIGNvbnN0IGhhc0RlZmF1bHRWYWx1ZSA9IFRyYW5zbGF0b3IuaGFzRGVmYXVsdFZhbHVlKG9wdGlvbnMpO1xuICAgICAgY29uc3QgZGVmYXVsdFZhbHVlU3VmZml4ID0gbmVlZHNQbHVyYWxIYW5kbGluZ1xuICAgICAgICA/IHRoaXMucGx1cmFsUmVzb2x2ZXIuZ2V0U3VmZml4KGxuZywgb3B0aW9ucy5jb3VudCwgb3B0aW9ucylcbiAgICAgICAgOiAnJztcbiAgICAgIGNvbnN0IGRlZmF1bHRWYWx1ZVN1ZmZpeE9yZGluYWxGYWxsYmFjayA9XG4gICAgICAgIG9wdGlvbnMub3JkaW5hbCAmJiBuZWVkc1BsdXJhbEhhbmRsaW5nXG4gICAgICAgICAgPyB0aGlzLnBsdXJhbFJlc29sdmVyLmdldFN1ZmZpeChsbmcsIG9wdGlvbnMuY291bnQsIHsgb3JkaW5hbDogZmFsc2UgfSlcbiAgICAgICAgICA6ICcnO1xuICAgICAgY29uc3QgbmVlZHNaZXJvU3VmZml4TG9va3VwID1cbiAgICAgICAgbmVlZHNQbHVyYWxIYW5kbGluZyAmJlxuICAgICAgICAhb3B0aW9ucy5vcmRpbmFsICYmXG4gICAgICAgIG9wdGlvbnMuY291bnQgPT09IDAgJiZcbiAgICAgICAgdGhpcy5wbHVyYWxSZXNvbHZlci5zaG91bGRVc2VJbnRsQXBpKCk7XG4gICAgICBjb25zdCBkZWZhdWx0VmFsdWUgPVxuICAgICAgICAobmVlZHNaZXJvU3VmZml4TG9va3VwICYmIG9wdGlvbnNbYGRlZmF1bHRWYWx1ZSR7dGhpcy5vcHRpb25zLnBsdXJhbFNlcGFyYXRvcn16ZXJvYF0pIHx8XG4gICAgICAgIG9wdGlvbnNbYGRlZmF1bHRWYWx1ZSR7ZGVmYXVsdFZhbHVlU3VmZml4fWBdIHx8XG4gICAgICAgIG9wdGlvbnNbYGRlZmF1bHRWYWx1ZSR7ZGVmYXVsdFZhbHVlU3VmZml4T3JkaW5hbEZhbGxiYWNrfWBdIHx8XG4gICAgICAgIG9wdGlvbnMuZGVmYXVsdFZhbHVlO1xuXG4gICAgICAvLyBmYWxsYmFjayB2YWx1ZVxuICAgICAgaWYgKCF0aGlzLmlzVmFsaWRMb29rdXAocmVzKSAmJiBoYXNEZWZhdWx0VmFsdWUpIHtcbiAgICAgICAgdXNlZERlZmF1bHQgPSB0cnVlO1xuICAgICAgICByZXMgPSBkZWZhdWx0VmFsdWU7XG4gICAgICB9XG4gICAgICBpZiAoIXRoaXMuaXNWYWxpZExvb2t1cChyZXMpKSB7XG4gICAgICAgIHVzZWRLZXkgPSB0cnVlO1xuICAgICAgICByZXMgPSBrZXk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IG1pc3NpbmdLZXlOb1ZhbHVlRmFsbGJhY2tUb0tleSA9XG4gICAgICAgIG9wdGlvbnMubWlzc2luZ0tleU5vVmFsdWVGYWxsYmFja1RvS2V5IHx8IHRoaXMub3B0aW9ucy5taXNzaW5nS2V5Tm9WYWx1ZUZhbGxiYWNrVG9LZXk7XG4gICAgICBjb25zdCByZXNGb3JNaXNzaW5nID0gbWlzc2luZ0tleU5vVmFsdWVGYWxsYmFja1RvS2V5ICYmIHVzZWRLZXkgPyB1bmRlZmluZWQgOiByZXM7XG5cbiAgICAgIC8vIHNhdmUgbWlzc2luZ1xuICAgICAgY29uc3QgdXBkYXRlTWlzc2luZyA9IGhhc0RlZmF1bHRWYWx1ZSAmJiBkZWZhdWx0VmFsdWUgIT09IHJlcyAmJiB0aGlzLm9wdGlvbnMudXBkYXRlTWlzc2luZztcbiAgICAgIGlmICh1c2VkS2V5IHx8IHVzZWREZWZhdWx0IHx8IHVwZGF0ZU1pc3NpbmcpIHtcbiAgICAgICAgdGhpcy5sb2dnZXIubG9nKFxuICAgICAgICAgIHVwZGF0ZU1pc3NpbmcgPyAndXBkYXRlS2V5JyA6ICdtaXNzaW5nS2V5JyxcbiAgICAgICAgICBsbmcsXG4gICAgICAgICAgbmFtZXNwYWNlLFxuICAgICAgICAgIGtleSxcbiAgICAgICAgICB1cGRhdGVNaXNzaW5nID8gZGVmYXVsdFZhbHVlIDogcmVzLFxuICAgICAgICApO1xuICAgICAgICBpZiAoa2V5U2VwYXJhdG9yKSB7XG4gICAgICAgICAgY29uc3QgZmsgPSB0aGlzLnJlc29sdmUoa2V5LCB7IC4uLm9wdGlvbnMsIGtleVNlcGFyYXRvcjogZmFsc2UgfSk7XG4gICAgICAgICAgaWYgKGZrICYmIGZrLnJlcylcbiAgICAgICAgICAgIHRoaXMubG9nZ2VyLndhcm4oXG4gICAgICAgICAgICAgICdTZWVtcyB0aGUgbG9hZGVkIHRyYW5zbGF0aW9ucyB3ZXJlIGluIGZsYXQgSlNPTiBmb3JtYXQgaW5zdGVhZCBvZiBuZXN0ZWQuIEVpdGhlciBzZXQga2V5U2VwYXJhdG9yOiBmYWxzZSBvbiBpbml0IG9yIG1ha2Ugc3VyZSB5b3VyIHRyYW5zbGF0aW9ucyBhcmUgcHVibGlzaGVkIGluIG5lc3RlZCBmb3JtYXQuJyxcbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgbG5ncyA9IFtdO1xuICAgICAgICBjb25zdCBmYWxsYmFja0xuZ3MgPSB0aGlzLmxhbmd1YWdlVXRpbHMuZ2V0RmFsbGJhY2tDb2RlcyhcbiAgICAgICAgICB0aGlzLm9wdGlvbnMuZmFsbGJhY2tMbmcsXG4gICAgICAgICAgb3B0aW9ucy5sbmcgfHwgdGhpcy5sYW5ndWFnZSxcbiAgICAgICAgKTtcbiAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5zYXZlTWlzc2luZ1RvID09PSAnZmFsbGJhY2snICYmIGZhbGxiYWNrTG5ncyAmJiBmYWxsYmFja0xuZ3NbMF0pIHtcbiAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGZhbGxiYWNrTG5ncy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgbG5ncy5wdXNoKGZhbGxiYWNrTG5nc1tpXSk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKHRoaXMub3B0aW9ucy5zYXZlTWlzc2luZ1RvID09PSAnYWxsJykge1xuICAgICAgICAgIGxuZ3MgPSB0aGlzLmxhbmd1YWdlVXRpbHMudG9SZXNvbHZlSGllcmFyY2h5KG9wdGlvbnMubG5nIHx8IHRoaXMubGFuZ3VhZ2UpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGxuZ3MucHVzaChvcHRpb25zLmxuZyB8fCB0aGlzLmxhbmd1YWdlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHNlbmQgPSAobCwgaywgc3BlY2lmaWNEZWZhdWx0VmFsdWUpID0+IHtcbiAgICAgICAgICBjb25zdCBkZWZhdWx0Rm9yTWlzc2luZyA9XG4gICAgICAgICAgICBoYXNEZWZhdWx0VmFsdWUgJiYgc3BlY2lmaWNEZWZhdWx0VmFsdWUgIT09IHJlcyA/IHNwZWNpZmljRGVmYXVsdFZhbHVlIDogcmVzRm9yTWlzc2luZztcbiAgICAgICAgICBpZiAodGhpcy5vcHRpb25zLm1pc3NpbmdLZXlIYW5kbGVyKSB7XG4gICAgICAgICAgICB0aGlzLm9wdGlvbnMubWlzc2luZ0tleUhhbmRsZXIoXG4gICAgICAgICAgICAgIGwsXG4gICAgICAgICAgICAgIG5hbWVzcGFjZSxcbiAgICAgICAgICAgICAgayxcbiAgICAgICAgICAgICAgZGVmYXVsdEZvck1pc3NpbmcsXG4gICAgICAgICAgICAgIHVwZGF0ZU1pc3NpbmcsXG4gICAgICAgICAgICAgIG9wdGlvbnMsXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH0gZWxzZSBpZiAodGhpcy5iYWNrZW5kQ29ubmVjdG9yICYmIHRoaXMuYmFja2VuZENvbm5lY3Rvci5zYXZlTWlzc2luZykge1xuICAgICAgICAgICAgdGhpcy5iYWNrZW5kQ29ubmVjdG9yLnNhdmVNaXNzaW5nKFxuICAgICAgICAgICAgICBsLFxuICAgICAgICAgICAgICBuYW1lc3BhY2UsXG4gICAgICAgICAgICAgIGssXG4gICAgICAgICAgICAgIGRlZmF1bHRGb3JNaXNzaW5nLFxuICAgICAgICAgICAgICB1cGRhdGVNaXNzaW5nLFxuICAgICAgICAgICAgICBvcHRpb25zLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdGhpcy5lbWl0KCdtaXNzaW5nS2V5JywgbCwgbmFtZXNwYWNlLCBrLCByZXMpO1xuICAgICAgICB9O1xuXG4gICAgICAgIGlmICh0aGlzLm9wdGlvbnMuc2F2ZU1pc3NpbmcpIHtcbiAgICAgICAgICBpZiAodGhpcy5vcHRpb25zLnNhdmVNaXNzaW5nUGx1cmFscyAmJiBuZWVkc1BsdXJhbEhhbmRsaW5nKSB7XG4gICAgICAgICAgICBsbmdzLmZvckVhY2goKGxhbmd1YWdlKSA9PiB7XG4gICAgICAgICAgICAgIGNvbnN0IHN1ZmZpeGVzID0gdGhpcy5wbHVyYWxSZXNvbHZlci5nZXRTdWZmaXhlcyhsYW5ndWFnZSwgb3B0aW9ucyk7XG4gICAgICAgICAgICAgIGlmIChcbiAgICAgICAgICAgICAgICBuZWVkc1plcm9TdWZmaXhMb29rdXAgJiZcbiAgICAgICAgICAgICAgICBvcHRpb25zW2BkZWZhdWx0VmFsdWUke3RoaXMub3B0aW9ucy5wbHVyYWxTZXBhcmF0b3J9emVyb2BdICYmXG4gICAgICAgICAgICAgICAgc3VmZml4ZXMuaW5kZXhPZihgJHt0aGlzLm9wdGlvbnMucGx1cmFsU2VwYXJhdG9yfXplcm9gKSA8IDBcbiAgICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgICAgc3VmZml4ZXMucHVzaChgJHt0aGlzLm9wdGlvbnMucGx1cmFsU2VwYXJhdG9yfXplcm9gKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBzdWZmaXhlcy5mb3JFYWNoKChzdWZmaXgpID0+IHtcbiAgICAgICAgICAgICAgICBzZW5kKFtsYW5ndWFnZV0sIGtleSArIHN1ZmZpeCwgb3B0aW9uc1tgZGVmYXVsdFZhbHVlJHtzdWZmaXh9YF0gfHwgZGVmYXVsdFZhbHVlKTtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc2VuZChsbmdzLCBrZXksIGRlZmF1bHRWYWx1ZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIGV4dGVuZFxuICAgICAgcmVzID0gdGhpcy5leHRlbmRUcmFuc2xhdGlvbihyZXMsIGtleXMsIG9wdGlvbnMsIHJlc29sdmVkLCBsYXN0S2V5KTtcblxuICAgICAgLy8gYXBwZW5kIG5hbWVzcGFjZSBpZiBzdGlsbCBrZXlcbiAgICAgIGlmICh1c2VkS2V5ICYmIHJlcyA9PT0ga2V5ICYmIHRoaXMub3B0aW9ucy5hcHBlbmROYW1lc3BhY2VUb01pc3NpbmdLZXkpXG4gICAgICAgIHJlcyA9IGAke25hbWVzcGFjZX06JHtrZXl9YDtcblxuICAgICAgLy8gcGFyc2VNaXNzaW5nS2V5SGFuZGxlclxuICAgICAgaWYgKCh1c2VkS2V5IHx8IHVzZWREZWZhdWx0KSAmJiB0aGlzLm9wdGlvbnMucGFyc2VNaXNzaW5nS2V5SGFuZGxlcikge1xuICAgICAgICBpZiAodGhpcy5vcHRpb25zLmNvbXBhdGliaWxpdHlBUEkgIT09ICd2MScpIHtcbiAgICAgICAgICByZXMgPSB0aGlzLm9wdGlvbnMucGFyc2VNaXNzaW5nS2V5SGFuZGxlcihcbiAgICAgICAgICAgIHRoaXMub3B0aW9ucy5hcHBlbmROYW1lc3BhY2VUb01pc3NpbmdLZXkgPyBgJHtuYW1lc3BhY2V9OiR7a2V5fWAgOiBrZXksXG4gICAgICAgICAgICB1c2VkRGVmYXVsdCA/IHJlcyA6IHVuZGVmaW5lZCxcbiAgICAgICAgICApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJlcyA9IHRoaXMub3B0aW9ucy5wYXJzZU1pc3NpbmdLZXlIYW5kbGVyKHJlcyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyByZXR1cm5cbiAgICBpZiAocmV0dXJuRGV0YWlscykge1xuICAgICAgcmVzb2x2ZWQucmVzID0gcmVzO1xuICAgICAgcmVzb2x2ZWQudXNlZFBhcmFtcyA9IHRoaXMuZ2V0VXNlZFBhcmFtc0RldGFpbHMob3B0aW9ucyk7XG4gICAgICByZXR1cm4gcmVzb2x2ZWQ7XG4gICAgfVxuICAgIHJldHVybiByZXM7XG4gIH1cblxuICBleHRlbmRUcmFuc2xhdGlvbihyZXMsIGtleSwgb3B0aW9ucywgcmVzb2x2ZWQsIGxhc3RLZXkpIHtcbiAgICBpZiAodGhpcy5pMThuRm9ybWF0ICYmIHRoaXMuaTE4bkZvcm1hdC5wYXJzZSkge1xuICAgICAgcmVzID0gdGhpcy5pMThuRm9ybWF0LnBhcnNlKFxuICAgICAgICByZXMsXG4gICAgICAgIHsgLi4udGhpcy5vcHRpb25zLmludGVycG9sYXRpb24uZGVmYXVsdFZhcmlhYmxlcywgLi4ub3B0aW9ucyB9LFxuICAgICAgICBvcHRpb25zLmxuZyB8fCB0aGlzLmxhbmd1YWdlIHx8IHJlc29sdmVkLnVzZWRMbmcsXG4gICAgICAgIHJlc29sdmVkLnVzZWROUyxcbiAgICAgICAgcmVzb2x2ZWQudXNlZEtleSxcbiAgICAgICAgeyByZXNvbHZlZCB9LFxuICAgICAgKTtcbiAgICB9IGVsc2UgaWYgKCFvcHRpb25zLnNraXBJbnRlcnBvbGF0aW9uKSB7XG4gICAgICAvLyBpMThuZXh0LnBhcnNpbmdcbiAgICAgIGlmIChvcHRpb25zLmludGVycG9sYXRpb24pXG4gICAgICAgIHRoaXMuaW50ZXJwb2xhdG9yLmluaXQoe1xuICAgICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICAgICAgLi4ueyBpbnRlcnBvbGF0aW9uOiB7IC4uLnRoaXMub3B0aW9ucy5pbnRlcnBvbGF0aW9uLCAuLi5vcHRpb25zLmludGVycG9sYXRpb24gfSB9LFxuICAgICAgICB9KTtcbiAgICAgIGNvbnN0IHNraXBPblZhcmlhYmxlcyA9XG4gICAgICAgIHR5cGVvZiByZXMgPT09ICdzdHJpbmcnICYmXG4gICAgICAgIChvcHRpb25zICYmIG9wdGlvbnMuaW50ZXJwb2xhdGlvbiAmJiBvcHRpb25zLmludGVycG9sYXRpb24uc2tpcE9uVmFyaWFibGVzICE9PSB1bmRlZmluZWRcbiAgICAgICAgICA/IG9wdGlvbnMuaW50ZXJwb2xhdGlvbi5za2lwT25WYXJpYWJsZXNcbiAgICAgICAgICA6IHRoaXMub3B0aW9ucy5pbnRlcnBvbGF0aW9uLnNraXBPblZhcmlhYmxlcyk7XG4gICAgICBsZXQgbmVzdEJlZjtcbiAgICAgIGlmIChza2lwT25WYXJpYWJsZXMpIHtcbiAgICAgICAgY29uc3QgbmIgPSByZXMubWF0Y2godGhpcy5pbnRlcnBvbGF0b3IubmVzdGluZ1JlZ2V4cCk7XG4gICAgICAgIC8vIGhhcyBuZXN0aW5nIGFmdGJlZm9yZWVyIGludGVycG9sYXRpb25cbiAgICAgICAgbmVzdEJlZiA9IG5iICYmIG5iLmxlbmd0aDtcbiAgICAgIH1cblxuICAgICAgLy8gaW50ZXJwb2xhdGVcbiAgICAgIGxldCBkYXRhID0gb3B0aW9ucy5yZXBsYWNlICYmIHR5cGVvZiBvcHRpb25zLnJlcGxhY2UgIT09ICdzdHJpbmcnID8gb3B0aW9ucy5yZXBsYWNlIDogb3B0aW9ucztcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMuaW50ZXJwb2xhdGlvbi5kZWZhdWx0VmFyaWFibGVzKVxuICAgICAgICBkYXRhID0geyAuLi50aGlzLm9wdGlvbnMuaW50ZXJwb2xhdGlvbi5kZWZhdWx0VmFyaWFibGVzLCAuLi5kYXRhIH07XG4gICAgICByZXMgPSB0aGlzLmludGVycG9sYXRvci5pbnRlcnBvbGF0ZShyZXMsIGRhdGEsIG9wdGlvbnMubG5nIHx8IHRoaXMubGFuZ3VhZ2UsIG9wdGlvbnMpO1xuXG4gICAgICAvLyBuZXN0aW5nXG4gICAgICBpZiAoc2tpcE9uVmFyaWFibGVzKSB7XG4gICAgICAgIGNvbnN0IG5hID0gcmVzLm1hdGNoKHRoaXMuaW50ZXJwb2xhdG9yLm5lc3RpbmdSZWdleHApO1xuICAgICAgICAvLyBoYXMgbmVzdGluZyBhZnRlciBpbnRlcnBvbGF0aW9uXG4gICAgICAgIGNvbnN0IG5lc3RBZnQgPSBuYSAmJiBuYS5sZW5ndGg7XG4gICAgICAgIGlmIChuZXN0QmVmIDwgbmVzdEFmdCkgb3B0aW9ucy5uZXN0ID0gZmFsc2U7XG4gICAgICB9XG4gICAgICBpZiAoIW9wdGlvbnMubG5nICYmIHRoaXMub3B0aW9ucy5jb21wYXRpYmlsaXR5QVBJICE9PSAndjEnICYmIHJlc29sdmVkICYmIHJlc29sdmVkLnJlcylcbiAgICAgICAgb3B0aW9ucy5sbmcgPSByZXNvbHZlZC51c2VkTG5nO1xuICAgICAgaWYgKG9wdGlvbnMubmVzdCAhPT0gZmFsc2UpXG4gICAgICAgIHJlcyA9IHRoaXMuaW50ZXJwb2xhdG9yLm5lc3QoXG4gICAgICAgICAgcmVzLFxuICAgICAgICAgICguLi5hcmdzKSA9PiB7XG4gICAgICAgICAgICBpZiAobGFzdEtleSAmJiBsYXN0S2V5WzBdID09PSBhcmdzWzBdICYmICFvcHRpb25zLmNvbnRleHQpIHtcbiAgICAgICAgICAgICAgdGhpcy5sb2dnZXIud2FybihcbiAgICAgICAgICAgICAgICBgSXQgc2VlbXMgeW91IGFyZSBuZXN0aW5nIHJlY3Vyc2l2ZWx5IGtleTogJHthcmdzWzBdfSBpbiBrZXk6ICR7a2V5WzBdfWAsXG4gICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMudHJhbnNsYXRlKC4uLmFyZ3MsIGtleSk7XG4gICAgICAgICAgfSxcbiAgICAgICAgICBvcHRpb25zLFxuICAgICAgICApO1xuXG4gICAgICBpZiAob3B0aW9ucy5pbnRlcnBvbGF0aW9uKSB0aGlzLmludGVycG9sYXRvci5yZXNldCgpO1xuICAgIH1cblxuICAgIC8vIHBvc3QgcHJvY2Vzc1xuICAgIGNvbnN0IHBvc3RQcm9jZXNzID0gb3B0aW9ucy5wb3N0UHJvY2VzcyB8fCB0aGlzLm9wdGlvbnMucG9zdFByb2Nlc3M7XG4gICAgY29uc3QgcG9zdFByb2Nlc3Nvck5hbWVzID0gdHlwZW9mIHBvc3RQcm9jZXNzID09PSAnc3RyaW5nJyA/IFtwb3N0UHJvY2Vzc10gOiBwb3N0UHJvY2VzcztcblxuICAgIGlmIChcbiAgICAgIHJlcyAhPT0gdW5kZWZpbmVkICYmXG4gICAgICByZXMgIT09IG51bGwgJiZcbiAgICAgIHBvc3RQcm9jZXNzb3JOYW1lcyAmJlxuICAgICAgcG9zdFByb2Nlc3Nvck5hbWVzLmxlbmd0aCAmJlxuICAgICAgb3B0aW9ucy5hcHBseVBvc3RQcm9jZXNzb3IgIT09IGZhbHNlXG4gICAgKSB7XG4gICAgICByZXMgPSBwb3N0UHJvY2Vzc29yLmhhbmRsZShcbiAgICAgICAgcG9zdFByb2Nlc3Nvck5hbWVzLFxuICAgICAgICByZXMsXG4gICAgICAgIGtleSxcbiAgICAgICAgdGhpcy5vcHRpb25zICYmIHRoaXMub3B0aW9ucy5wb3N0UHJvY2Vzc1Bhc3NSZXNvbHZlZFxuICAgICAgICAgID8ge1xuICAgICAgICAgICAgICBpMThuUmVzb2x2ZWQ6IHsgLi4ucmVzb2x2ZWQsIHVzZWRQYXJhbXM6IHRoaXMuZ2V0VXNlZFBhcmFtc0RldGFpbHMob3B0aW9ucykgfSxcbiAgICAgICAgICAgICAgLi4ub3B0aW9ucyxcbiAgICAgICAgICAgIH1cbiAgICAgICAgICA6IG9wdGlvbnMsXG4gICAgICAgIHRoaXMsXG4gICAgICApO1xuICAgIH1cblxuICAgIHJldHVybiByZXM7XG4gIH1cblxuICByZXNvbHZlKGtleXMsIG9wdGlvbnMgPSB7fSkge1xuICAgIGxldCBmb3VuZDtcbiAgICBsZXQgdXNlZEtleTsgLy8gcGxhaW4ga2V5XG4gICAgbGV0IGV4YWN0VXNlZEtleTsgLy8ga2V5IHdpdGggY29udGV4dCAvIHBsdXJhbFxuICAgIGxldCB1c2VkTG5nO1xuICAgIGxldCB1c2VkTlM7XG5cbiAgICBpZiAodHlwZW9mIGtleXMgPT09ICdzdHJpbmcnKSBrZXlzID0gW2tleXNdO1xuXG4gICAgLy8gZm9yRWFjaCBwb3NzaWJsZSBrZXlcbiAgICBrZXlzLmZvckVhY2goKGspID0+IHtcbiAgICAgIGlmICh0aGlzLmlzVmFsaWRMb29rdXAoZm91bmQpKSByZXR1cm47XG4gICAgICBjb25zdCBleHRyYWN0ZWQgPSB0aGlzLmV4dHJhY3RGcm9tS2V5KGssIG9wdGlvbnMpO1xuICAgICAgY29uc3Qga2V5ID0gZXh0cmFjdGVkLmtleTtcbiAgICAgIHVzZWRLZXkgPSBrZXk7XG4gICAgICBsZXQgbmFtZXNwYWNlcyA9IGV4dHJhY3RlZC5uYW1lc3BhY2VzO1xuICAgICAgaWYgKHRoaXMub3B0aW9ucy5mYWxsYmFja05TKSBuYW1lc3BhY2VzID0gbmFtZXNwYWNlcy5jb25jYXQodGhpcy5vcHRpb25zLmZhbGxiYWNrTlMpO1xuXG4gICAgICBjb25zdCBuZWVkc1BsdXJhbEhhbmRsaW5nID0gb3B0aW9ucy5jb3VudCAhPT0gdW5kZWZpbmVkICYmIHR5cGVvZiBvcHRpb25zLmNvdW50ICE9PSAnc3RyaW5nJztcbiAgICAgIGNvbnN0IG5lZWRzWmVyb1N1ZmZpeExvb2t1cCA9XG4gICAgICAgIG5lZWRzUGx1cmFsSGFuZGxpbmcgJiZcbiAgICAgICAgIW9wdGlvbnMub3JkaW5hbCAmJlxuICAgICAgICBvcHRpb25zLmNvdW50ID09PSAwICYmXG4gICAgICAgIHRoaXMucGx1cmFsUmVzb2x2ZXIuc2hvdWxkVXNlSW50bEFwaSgpO1xuICAgICAgY29uc3QgbmVlZHNDb250ZXh0SGFuZGxpbmcgPVxuICAgICAgICBvcHRpb25zLmNvbnRleHQgIT09IHVuZGVmaW5lZCAmJlxuICAgICAgICAodHlwZW9mIG9wdGlvbnMuY29udGV4dCA9PT0gJ3N0cmluZycgfHwgdHlwZW9mIG9wdGlvbnMuY29udGV4dCA9PT0gJ251bWJlcicpICYmXG4gICAgICAgIG9wdGlvbnMuY29udGV4dCAhPT0gJyc7XG5cbiAgICAgIGNvbnN0IGNvZGVzID0gb3B0aW9ucy5sbmdzXG4gICAgICAgID8gb3B0aW9ucy5sbmdzXG4gICAgICAgIDogdGhpcy5sYW5ndWFnZVV0aWxzLnRvUmVzb2x2ZUhpZXJhcmNoeShvcHRpb25zLmxuZyB8fCB0aGlzLmxhbmd1YWdlLCBvcHRpb25zLmZhbGxiYWNrTG5nKTtcblxuICAgICAgbmFtZXNwYWNlcy5mb3JFYWNoKChucykgPT4ge1xuICAgICAgICBpZiAodGhpcy5pc1ZhbGlkTG9va3VwKGZvdW5kKSkgcmV0dXJuO1xuICAgICAgICB1c2VkTlMgPSBucztcblxuICAgICAgICBpZiAoXG4gICAgICAgICAgIWNoZWNrZWRMb2FkZWRGb3JbYCR7Y29kZXNbMF19LSR7bnN9YF0gJiZcbiAgICAgICAgICB0aGlzLnV0aWxzICYmXG4gICAgICAgICAgdGhpcy51dGlscy5oYXNMb2FkZWROYW1lc3BhY2UgJiZcbiAgICAgICAgICAhdGhpcy51dGlscy5oYXNMb2FkZWROYW1lc3BhY2UodXNlZE5TKVxuICAgICAgICApIHtcbiAgICAgICAgICBjaGVja2VkTG9hZGVkRm9yW2Ake2NvZGVzWzBdfS0ke25zfWBdID0gdHJ1ZTtcbiAgICAgICAgICB0aGlzLmxvZ2dlci53YXJuKFxuICAgICAgICAgICAgYGtleSBcIiR7dXNlZEtleX1cIiBmb3IgbGFuZ3VhZ2VzIFwiJHtjb2Rlcy5qb2luKFxuICAgICAgICAgICAgICAnLCAnLFxuICAgICAgICAgICAgKX1cIiB3b24ndCBnZXQgcmVzb2x2ZWQgYXMgbmFtZXNwYWNlIFwiJHt1c2VkTlN9XCIgd2FzIG5vdCB5ZXQgbG9hZGVkYCxcbiAgICAgICAgICAgICdUaGlzIG1lYW5zIHNvbWV0aGluZyBJUyBXUk9ORyBpbiB5b3VyIHNldHVwLiBZb3UgYWNjZXNzIHRoZSB0IGZ1bmN0aW9uIGJlZm9yZSBpMThuZXh0LmluaXQgLyBpMThuZXh0LmxvYWROYW1lc3BhY2UgLyBpMThuZXh0LmNoYW5nZUxhbmd1YWdlIHdhcyBkb25lLiBXYWl0IGZvciB0aGUgY2FsbGJhY2sgb3IgUHJvbWlzZSB0byByZXNvbHZlIGJlZm9yZSBhY2Nlc3NpbmcgaXQhISEnLFxuICAgICAgICAgICk7XG4gICAgICAgIH1cblxuICAgICAgICBjb2Rlcy5mb3JFYWNoKChjb2RlKSA9PiB7XG4gICAgICAgICAgaWYgKHRoaXMuaXNWYWxpZExvb2t1cChmb3VuZCkpIHJldHVybjtcbiAgICAgICAgICB1c2VkTG5nID0gY29kZTtcblxuICAgICAgICAgIGNvbnN0IGZpbmFsS2V5cyA9IFtrZXldO1xuXG4gICAgICAgICAgaWYgKHRoaXMuaTE4bkZvcm1hdCAmJiB0aGlzLmkxOG5Gb3JtYXQuYWRkTG9va3VwS2V5cykge1xuICAgICAgICAgICAgdGhpcy5pMThuRm9ybWF0LmFkZExvb2t1cEtleXMoZmluYWxLZXlzLCBrZXksIGNvZGUsIG5zLCBvcHRpb25zKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbGV0IHBsdXJhbFN1ZmZpeDtcbiAgICAgICAgICAgIGlmIChuZWVkc1BsdXJhbEhhbmRsaW5nKVxuICAgICAgICAgICAgICBwbHVyYWxTdWZmaXggPSB0aGlzLnBsdXJhbFJlc29sdmVyLmdldFN1ZmZpeChjb2RlLCBvcHRpb25zLmNvdW50LCBvcHRpb25zKTtcbiAgICAgICAgICAgIGNvbnN0IHplcm9TdWZmaXggPSBgJHt0aGlzLm9wdGlvbnMucGx1cmFsU2VwYXJhdG9yfXplcm9gO1xuICAgICAgICAgICAgY29uc3Qgb3JkaW5hbFByZWZpeCA9IGAke3RoaXMub3B0aW9ucy5wbHVyYWxTZXBhcmF0b3J9b3JkaW5hbCR7dGhpcy5vcHRpb25zLnBsdXJhbFNlcGFyYXRvcn1gO1xuICAgICAgICAgICAgLy8gZ2V0IGtleSBmb3IgcGx1cmFsIGlmIG5lZWRlZFxuICAgICAgICAgICAgaWYgKG5lZWRzUGx1cmFsSGFuZGxpbmcpIHtcbiAgICAgICAgICAgICAgZmluYWxLZXlzLnB1c2goa2V5ICsgcGx1cmFsU3VmZml4KTtcbiAgICAgICAgICAgICAgaWYgKG9wdGlvbnMub3JkaW5hbCAmJiBwbHVyYWxTdWZmaXguaW5kZXhPZihvcmRpbmFsUHJlZml4KSA9PT0gMCkge1xuICAgICAgICAgICAgICAgIGZpbmFsS2V5cy5wdXNoKFxuICAgICAgICAgICAgICAgICAga2V5ICsgcGx1cmFsU3VmZml4LnJlcGxhY2Uob3JkaW5hbFByZWZpeCwgdGhpcy5vcHRpb25zLnBsdXJhbFNlcGFyYXRvciksXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBpZiAobmVlZHNaZXJvU3VmZml4TG9va3VwKSB7XG4gICAgICAgICAgICAgICAgZmluYWxLZXlzLnB1c2goa2V5ICsgemVyb1N1ZmZpeCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gZ2V0IGtleSBmb3IgY29udGV4dCBpZiBuZWVkZWRcbiAgICAgICAgICAgIGlmIChuZWVkc0NvbnRleHRIYW5kbGluZykge1xuICAgICAgICAgICAgICBjb25zdCBjb250ZXh0S2V5ID0gYCR7a2V5fSR7dGhpcy5vcHRpb25zLmNvbnRleHRTZXBhcmF0b3J9JHtvcHRpb25zLmNvbnRleHR9YDtcbiAgICAgICAgICAgICAgZmluYWxLZXlzLnB1c2goY29udGV4dEtleSk7XG5cbiAgICAgICAgICAgICAgLy8gZ2V0IGtleSBmb3IgY29udGV4dCArIHBsdXJhbCBpZiBuZWVkZWRcbiAgICAgICAgICAgICAgaWYgKG5lZWRzUGx1cmFsSGFuZGxpbmcpIHtcbiAgICAgICAgICAgICAgICBmaW5hbEtleXMucHVzaChjb250ZXh0S2V5ICsgcGx1cmFsU3VmZml4KTtcbiAgICAgICAgICAgICAgICBpZiAob3B0aW9ucy5vcmRpbmFsICYmIHBsdXJhbFN1ZmZpeC5pbmRleE9mKG9yZGluYWxQcmVmaXgpID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICBmaW5hbEtleXMucHVzaChcbiAgICAgICAgICAgICAgICAgICAgY29udGV4dEtleSArIHBsdXJhbFN1ZmZpeC5yZXBsYWNlKG9yZGluYWxQcmVmaXgsIHRoaXMub3B0aW9ucy5wbHVyYWxTZXBhcmF0b3IpLFxuICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKG5lZWRzWmVyb1N1ZmZpeExvb2t1cCkge1xuICAgICAgICAgICAgICAgICAgZmluYWxLZXlzLnB1c2goY29udGV4dEtleSArIHplcm9TdWZmaXgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIGl0ZXJhdGUgb3ZlciBmaW5hbEtleXMgc3RhcnRpbmcgd2l0aCBtb3N0IHNwZWNpZmljIHBsdXJhbGtleSAoLT4gY29udGV4dGtleSBvbmx5KSAtPiBzaW5ndWxhcmtleSBvbmx5XG4gICAgICAgICAgbGV0IHBvc3NpYmxlS2V5O1xuICAgICAgICAgIC8qIGVzbGludCBuby1jb25kLWFzc2lnbjogMCAqL1xuICAgICAgICAgIHdoaWxlICgocG9zc2libGVLZXkgPSBmaW5hbEtleXMucG9wKCkpKSB7XG4gICAgICAgICAgICBpZiAoIXRoaXMuaXNWYWxpZExvb2t1cChmb3VuZCkpIHtcbiAgICAgICAgICAgICAgZXhhY3RVc2VkS2V5ID0gcG9zc2libGVLZXk7XG4gICAgICAgICAgICAgIGZvdW5kID0gdGhpcy5nZXRSZXNvdXJjZShjb2RlLCBucywgcG9zc2libGVLZXksIG9wdGlvbnMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIHJldHVybiB7IHJlczogZm91bmQsIHVzZWRLZXksIGV4YWN0VXNlZEtleSwgdXNlZExuZywgdXNlZE5TIH07XG4gIH1cblxuICBpc1ZhbGlkTG9va3VwKHJlcykge1xuICAgIHJldHVybiAoXG4gICAgICByZXMgIT09IHVuZGVmaW5lZCAmJlxuICAgICAgISghdGhpcy5vcHRpb25zLnJldHVybk51bGwgJiYgcmVzID09PSBudWxsKSAmJlxuICAgICAgISghdGhpcy5vcHRpb25zLnJldHVybkVtcHR5U3RyaW5nICYmIHJlcyA9PT0gJycpXG4gICAgKTtcbiAgfVxuXG4gIGdldFJlc291cmNlKGNvZGUsIG5zLCBrZXksIG9wdGlvbnMgPSB7fSkge1xuICAgIGlmICh0aGlzLmkxOG5Gb3JtYXQgJiYgdGhpcy5pMThuRm9ybWF0LmdldFJlc291cmNlKVxuICAgICAgcmV0dXJuIHRoaXMuaTE4bkZvcm1hdC5nZXRSZXNvdXJjZShjb2RlLCBucywga2V5LCBvcHRpb25zKTtcbiAgICByZXR1cm4gdGhpcy5yZXNvdXJjZVN0b3JlLmdldFJlc291cmNlKGNvZGUsIG5zLCBrZXksIG9wdGlvbnMpO1xuICB9XG5cbiAgZ2V0VXNlZFBhcmFtc0RldGFpbHMob3B0aW9ucyA9IHt9KSB7XG4gICAgLy8gd2UgbmVlZCB0byByZW1lbWJlciB0byBleHRlbmQgdGhpcyBhcnJheSB3aGVuZXZlciBuZXcgb3B0aW9uIHByb3BlcnRpZXMgYXJlIGFkZGVkXG4gICAgY29uc3Qgb3B0aW9uc0tleXMgPSBbXG4gICAgICAnZGVmYXVsdFZhbHVlJyxcbiAgICAgICdvcmRpbmFsJyxcbiAgICAgICdjb250ZXh0JyxcbiAgICAgICdyZXBsYWNlJyxcbiAgICAgICdsbmcnLFxuICAgICAgJ2xuZ3MnLFxuICAgICAgJ2ZhbGxiYWNrTG5nJyxcbiAgICAgICducycsXG4gICAgICAna2V5U2VwYXJhdG9yJyxcbiAgICAgICduc1NlcGFyYXRvcicsXG4gICAgICAncmV0dXJuT2JqZWN0cycsXG4gICAgICAncmV0dXJuRGV0YWlscycsXG4gICAgICAnam9pbkFycmF5cycsXG4gICAgICAncG9zdFByb2Nlc3MnLFxuICAgICAgJ2ludGVycG9sYXRpb24nLFxuICAgIF07XG5cbiAgICBjb25zdCB1c2VPcHRpb25zUmVwbGFjZUZvckRhdGEgPSBvcHRpb25zLnJlcGxhY2UgJiYgdHlwZW9mIG9wdGlvbnMucmVwbGFjZSAhPT0gJ3N0cmluZyc7XG4gICAgbGV0IGRhdGEgPSB1c2VPcHRpb25zUmVwbGFjZUZvckRhdGEgPyBvcHRpb25zLnJlcGxhY2UgOiBvcHRpb25zO1xuICAgIGlmICh1c2VPcHRpb25zUmVwbGFjZUZvckRhdGEgJiYgdHlwZW9mIG9wdGlvbnMuY291bnQgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICBkYXRhLmNvdW50ID0gb3B0aW9ucy5jb3VudDtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLmludGVycG9sYXRpb24uZGVmYXVsdFZhcmlhYmxlcykge1xuICAgICAgZGF0YSA9IHsgLi4udGhpcy5vcHRpb25zLmludGVycG9sYXRpb24uZGVmYXVsdFZhcmlhYmxlcywgLi4uZGF0YSB9O1xuICAgIH1cblxuICAgIC8vIGF2b2lkIHJlcG9ydGluZyBvcHRpb25zIChleGVjcHQgY291bnQpIGFzIHVzZWRQYXJhbXNcbiAgICBpZiAoIXVzZU9wdGlvbnNSZXBsYWNlRm9yRGF0YSkge1xuICAgICAgZGF0YSA9IHsgLi4uZGF0YSB9O1xuICAgICAgZm9yIChjb25zdCBrZXkgb2Ygb3B0aW9uc0tleXMpIHtcbiAgICAgICAgZGVsZXRlIGRhdGFba2V5XTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gZGF0YTtcbiAgfVxuXG4gIHN0YXRpYyBoYXNEZWZhdWx0VmFsdWUob3B0aW9ucykge1xuICAgIGNvbnN0IHByZWZpeCA9ICdkZWZhdWx0VmFsdWUnO1xuXG4gICAgZm9yIChjb25zdCBvcHRpb24gaW4gb3B0aW9ucykge1xuICAgICAgaWYgKFxuICAgICAgICBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob3B0aW9ucywgb3B0aW9uKSAmJlxuICAgICAgICBwcmVmaXggPT09IG9wdGlvbi5zdWJzdHJpbmcoMCwgcHJlZml4Lmxlbmd0aCkgJiZcbiAgICAgICAgdW5kZWZpbmVkICE9PSBvcHRpb25zW29wdGlvbl1cbiAgICAgICkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgVHJhbnNsYXRvcjtcbiIsImltcG9ydCBiYXNlTG9nZ2VyIGZyb20gJy4vbG9nZ2VyLmpzJztcbmltcG9ydCB7IGdldENsZWFuZWRDb2RlIH0gZnJvbSAnLi91dGlscy5qcyc7XG5cbmZ1bmN0aW9uIGNhcGl0YWxpemUoc3RyaW5nKSB7XG4gIHJldHVybiBzdHJpbmcuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBzdHJpbmcuc2xpY2UoMSk7XG59XG5cbmNsYXNzIExhbmd1YWdlVXRpbCB7XG4gIGNvbnN0cnVjdG9yKG9wdGlvbnMpIHtcbiAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuXG4gICAgdGhpcy5zdXBwb3J0ZWRMbmdzID0gdGhpcy5vcHRpb25zLnN1cHBvcnRlZExuZ3MgfHwgZmFsc2U7XG4gICAgdGhpcy5sb2dnZXIgPSBiYXNlTG9nZ2VyLmNyZWF0ZSgnbGFuZ3VhZ2VVdGlscycpO1xuICB9XG5cbiAgZ2V0U2NyaXB0UGFydEZyb21Db2RlKGNvZGUpIHtcbiAgICBjb2RlID0gZ2V0Q2xlYW5lZENvZGUoY29kZSk7XG4gICAgaWYgKCFjb2RlIHx8IGNvZGUuaW5kZXhPZignLScpIDwgMCkgcmV0dXJuIG51bGw7XG5cbiAgICBjb25zdCBwID0gY29kZS5zcGxpdCgnLScpO1xuICAgIGlmIChwLmxlbmd0aCA9PT0gMikgcmV0dXJuIG51bGw7XG4gICAgcC5wb3AoKTtcbiAgICBpZiAocFtwLmxlbmd0aCAtIDFdLnRvTG93ZXJDYXNlKCkgPT09ICd4JykgcmV0dXJuIG51bGw7XG4gICAgcmV0dXJuIHRoaXMuZm9ybWF0TGFuZ3VhZ2VDb2RlKHAuam9pbignLScpKTtcbiAgfVxuXG4gIGdldExhbmd1YWdlUGFydEZyb21Db2RlKGNvZGUpIHtcbiAgICBjb2RlID0gZ2V0Q2xlYW5lZENvZGUoY29kZSk7XG4gICAgaWYgKCFjb2RlIHx8IGNvZGUuaW5kZXhPZignLScpIDwgMCkgcmV0dXJuIGNvZGU7XG5cbiAgICBjb25zdCBwID0gY29kZS5zcGxpdCgnLScpO1xuICAgIHJldHVybiB0aGlzLmZvcm1hdExhbmd1YWdlQ29kZShwWzBdKTtcbiAgfVxuXG4gIGZvcm1hdExhbmd1YWdlQ29kZShjb2RlKSB7XG4gICAgLy8gaHR0cDovL3d3dy5pYW5hLm9yZy9hc3NpZ25tZW50cy9sYW5ndWFnZS10YWdzL2xhbmd1YWdlLXRhZ3MueGh0bWxcbiAgICBpZiAodHlwZW9mIGNvZGUgPT09ICdzdHJpbmcnICYmIGNvZGUuaW5kZXhPZignLScpID4gLTEpIHtcbiAgICAgIGNvbnN0IHNwZWNpYWxDYXNlcyA9IFsnaGFucycsICdoYW50JywgJ2xhdG4nLCAnY3lybCcsICdjYW5zJywgJ21vbmcnLCAnYXJhYiddO1xuICAgICAgbGV0IHAgPSBjb2RlLnNwbGl0KCctJyk7XG5cbiAgICAgIGlmICh0aGlzLm9wdGlvbnMubG93ZXJDYXNlTG5nKSB7XG4gICAgICAgIHAgPSBwLm1hcCgocGFydCkgPT4gcGFydC50b0xvd2VyQ2FzZSgpKTtcbiAgICAgIH0gZWxzZSBpZiAocC5sZW5ndGggPT09IDIpIHtcbiAgICAgICAgcFswXSA9IHBbMF0udG9Mb3dlckNhc2UoKTtcbiAgICAgICAgcFsxXSA9IHBbMV0udG9VcHBlckNhc2UoKTtcblxuICAgICAgICBpZiAoc3BlY2lhbENhc2VzLmluZGV4T2YocFsxXS50b0xvd2VyQ2FzZSgpKSA+IC0xKSBwWzFdID0gY2FwaXRhbGl6ZShwWzFdLnRvTG93ZXJDYXNlKCkpO1xuICAgICAgfSBlbHNlIGlmIChwLmxlbmd0aCA9PT0gMykge1xuICAgICAgICBwWzBdID0gcFswXS50b0xvd2VyQ2FzZSgpO1xuXG4gICAgICAgIC8vIGlmIGxlbmd0aCAyIGd1ZXNzIGl0J3MgYSBjb3VudHJ5XG4gICAgICAgIGlmIChwWzFdLmxlbmd0aCA9PT0gMikgcFsxXSA9IHBbMV0udG9VcHBlckNhc2UoKTtcbiAgICAgICAgaWYgKHBbMF0gIT09ICdzZ24nICYmIHBbMl0ubGVuZ3RoID09PSAyKSBwWzJdID0gcFsyXS50b1VwcGVyQ2FzZSgpO1xuXG4gICAgICAgIGlmIChzcGVjaWFsQ2FzZXMuaW5kZXhPZihwWzFdLnRvTG93ZXJDYXNlKCkpID4gLTEpIHBbMV0gPSBjYXBpdGFsaXplKHBbMV0udG9Mb3dlckNhc2UoKSk7XG4gICAgICAgIGlmIChzcGVjaWFsQ2FzZXMuaW5kZXhPZihwWzJdLnRvTG93ZXJDYXNlKCkpID4gLTEpIHBbMl0gPSBjYXBpdGFsaXplKHBbMl0udG9Mb3dlckNhc2UoKSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBwLmpvaW4oJy0nKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5vcHRpb25zLmNsZWFuQ29kZSB8fCB0aGlzLm9wdGlvbnMubG93ZXJDYXNlTG5nID8gY29kZS50b0xvd2VyQ2FzZSgpIDogY29kZTtcbiAgfVxuXG4gIGlzU3VwcG9ydGVkQ29kZShjb2RlKSB7XG4gICAgaWYgKHRoaXMub3B0aW9ucy5sb2FkID09PSAnbGFuZ3VhZ2VPbmx5JyB8fCB0aGlzLm9wdGlvbnMubm9uRXhwbGljaXRTdXBwb3J0ZWRMbmdzKSB7XG4gICAgICBjb2RlID0gdGhpcy5nZXRMYW5ndWFnZVBhcnRGcm9tQ29kZShjb2RlKTtcbiAgICB9XG4gICAgcmV0dXJuIChcbiAgICAgICF0aGlzLnN1cHBvcnRlZExuZ3MgfHwgIXRoaXMuc3VwcG9ydGVkTG5ncy5sZW5ndGggfHwgdGhpcy5zdXBwb3J0ZWRMbmdzLmluZGV4T2YoY29kZSkgPiAtMVxuICAgICk7XG4gIH1cblxuICBnZXRCZXN0TWF0Y2hGcm9tQ29kZXMoY29kZXMpIHtcbiAgICBpZiAoIWNvZGVzKSByZXR1cm4gbnVsbDtcblxuICAgIGxldCBmb3VuZDtcblxuICAgIC8vIHBpY2sgZmlyc3Qgc3VwcG9ydGVkIGNvZGUgb3IgaWYgbm8gcmVzdHJpY3Rpb24gcGljayB0aGUgZmlyc3Qgb25lIChoaWdoZXN0IHByaW8pXG4gICAgY29kZXMuZm9yRWFjaCgoY29kZSkgPT4ge1xuICAgICAgaWYgKGZvdW5kKSByZXR1cm47XG4gICAgICBjb25zdCBjbGVhbmVkTG5nID0gdGhpcy5mb3JtYXRMYW5ndWFnZUNvZGUoY29kZSk7XG4gICAgICBpZiAoIXRoaXMub3B0aW9ucy5zdXBwb3J0ZWRMbmdzIHx8IHRoaXMuaXNTdXBwb3J0ZWRDb2RlKGNsZWFuZWRMbmcpKSBmb3VuZCA9IGNsZWFuZWRMbmc7XG4gICAgfSk7XG5cbiAgICAvLyBpZiB3ZSBnb3Qgbm8gbWF0Y2ggaW4gc3VwcG9ydGVkTG5ncyB5ZXQgLSBjaGVjayBmb3Igc2ltaWxhciBsb2NhbGVzXG4gICAgLy8gZmlyc3QgIGRlLUNIIC0tPiBkZVxuICAgIC8vIHNlY29uZCBkZS1DSCAtLT4gZGUtREVcbiAgICBpZiAoIWZvdW5kICYmIHRoaXMub3B0aW9ucy5zdXBwb3J0ZWRMbmdzKSB7XG4gICAgICBjb2Rlcy5mb3JFYWNoKChjb2RlKSA9PiB7XG4gICAgICAgIGlmIChmb3VuZCkgcmV0dXJuO1xuXG4gICAgICAgIGNvbnN0IGxuZ09ubHkgPSB0aGlzLmdldExhbmd1YWdlUGFydEZyb21Db2RlKGNvZGUpO1xuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tcmV0dXJuLWFzc2lnblxuICAgICAgICBpZiAodGhpcy5pc1N1cHBvcnRlZENvZGUobG5nT25seSkpIHJldHVybiAoZm91bmQgPSBsbmdPbmx5KTtcblxuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgYXJyYXktY2FsbGJhY2stcmV0dXJuXG4gICAgICAgIGZvdW5kID0gdGhpcy5vcHRpb25zLnN1cHBvcnRlZExuZ3MuZmluZCgoc3VwcG9ydGVkTG5nKSA9PiB7XG4gICAgICAgICAgaWYgKHN1cHBvcnRlZExuZyA9PT0gbG5nT25seSkgcmV0dXJuIHN1cHBvcnRlZExuZztcbiAgICAgICAgICBpZiAoc3VwcG9ydGVkTG5nLmluZGV4T2YoJy0nKSA8IDAgJiYgbG5nT25seS5pbmRleE9mKCctJykgPCAwKSByZXR1cm47XG4gICAgICAgICAgaWYgKFxuICAgICAgICAgICAgc3VwcG9ydGVkTG5nLmluZGV4T2YoJy0nKSA+IDAgJiZcbiAgICAgICAgICAgIGxuZ09ubHkuaW5kZXhPZignLScpIDwgMCAmJlxuICAgICAgICAgICAgc3VwcG9ydGVkTG5nLnN1YnN0cmluZygwLCBzdXBwb3J0ZWRMbmcuaW5kZXhPZignLScpKSA9PT0gbG5nT25seVxuICAgICAgICAgIClcbiAgICAgICAgICAgIHJldHVybiBzdXBwb3J0ZWRMbmc7XG4gICAgICAgICAgaWYgKHN1cHBvcnRlZExuZy5pbmRleE9mKGxuZ09ubHkpID09PSAwICYmIGxuZ09ubHkubGVuZ3RoID4gMSkgcmV0dXJuIHN1cHBvcnRlZExuZztcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9XG4gICAgLy8gaWYgbm90aGluZyBmb3VuZCwgdXNlIGZhbGxiYWNrTG5nXG4gICAgaWYgKCFmb3VuZCkgZm91bmQgPSB0aGlzLmdldEZhbGxiYWNrQ29kZXModGhpcy5vcHRpb25zLmZhbGxiYWNrTG5nKVswXTtcblxuICAgIHJldHVybiBmb3VuZDtcbiAgfVxuXG4gIGdldEZhbGxiYWNrQ29kZXMoZmFsbGJhY2tzLCBjb2RlKSB7XG4gICAgaWYgKCFmYWxsYmFja3MpIHJldHVybiBbXTtcbiAgICBpZiAodHlwZW9mIGZhbGxiYWNrcyA9PT0gJ2Z1bmN0aW9uJykgZmFsbGJhY2tzID0gZmFsbGJhY2tzKGNvZGUpO1xuICAgIGlmICh0eXBlb2YgZmFsbGJhY2tzID09PSAnc3RyaW5nJykgZmFsbGJhY2tzID0gW2ZhbGxiYWNrc107XG4gICAgaWYgKE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuYXBwbHkoZmFsbGJhY2tzKSA9PT0gJ1tvYmplY3QgQXJyYXldJykgcmV0dXJuIGZhbGxiYWNrcztcblxuICAgIGlmICghY29kZSkgcmV0dXJuIGZhbGxiYWNrcy5kZWZhdWx0IHx8IFtdO1xuXG4gICAgLy8gYXNzdW1lIHdlIGhhdmUgYW4gb2JqZWN0IGRlZmluaW5nIGZhbGxiYWNrc1xuICAgIGxldCBmb3VuZCA9IGZhbGxiYWNrc1tjb2RlXTtcbiAgICBpZiAoIWZvdW5kKSBmb3VuZCA9IGZhbGxiYWNrc1t0aGlzLmdldFNjcmlwdFBhcnRGcm9tQ29kZShjb2RlKV07XG4gICAgaWYgKCFmb3VuZCkgZm91bmQgPSBmYWxsYmFja3NbdGhpcy5mb3JtYXRMYW5ndWFnZUNvZGUoY29kZSldO1xuICAgIGlmICghZm91bmQpIGZvdW5kID0gZmFsbGJhY2tzW3RoaXMuZ2V0TGFuZ3VhZ2VQYXJ0RnJvbUNvZGUoY29kZSldO1xuICAgIGlmICghZm91bmQpIGZvdW5kID0gZmFsbGJhY2tzLmRlZmF1bHQ7XG5cbiAgICByZXR1cm4gZm91bmQgfHwgW107XG4gIH1cblxuICB0b1Jlc29sdmVIaWVyYXJjaHkoY29kZSwgZmFsbGJhY2tDb2RlKSB7XG4gICAgY29uc3QgZmFsbGJhY2tDb2RlcyA9IHRoaXMuZ2V0RmFsbGJhY2tDb2RlcyhcbiAgICAgIGZhbGxiYWNrQ29kZSB8fCB0aGlzLm9wdGlvbnMuZmFsbGJhY2tMbmcgfHwgW10sXG4gICAgICBjb2RlLFxuICAgICk7XG5cbiAgICBjb25zdCBjb2RlcyA9IFtdO1xuICAgIGNvbnN0IGFkZENvZGUgPSAoYykgPT4ge1xuICAgICAgaWYgKCFjKSByZXR1cm47XG4gICAgICBpZiAodGhpcy5pc1N1cHBvcnRlZENvZGUoYykpIHtcbiAgICAgICAgY29kZXMucHVzaChjKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMubG9nZ2VyLndhcm4oYHJlamVjdGluZyBsYW5ndWFnZSBjb2RlIG5vdCBmb3VuZCBpbiBzdXBwb3J0ZWRMbmdzOiAke2N9YCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIGlmICh0eXBlb2YgY29kZSA9PT0gJ3N0cmluZycgJiYgKGNvZGUuaW5kZXhPZignLScpID4gLTEgfHwgY29kZS5pbmRleE9mKCdfJykgPiAtMSkpIHtcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMubG9hZCAhPT0gJ2xhbmd1YWdlT25seScpIGFkZENvZGUodGhpcy5mb3JtYXRMYW5ndWFnZUNvZGUoY29kZSkpO1xuICAgICAgaWYgKHRoaXMub3B0aW9ucy5sb2FkICE9PSAnbGFuZ3VhZ2VPbmx5JyAmJiB0aGlzLm9wdGlvbnMubG9hZCAhPT0gJ2N1cnJlbnRPbmx5JylcbiAgICAgICAgYWRkQ29kZSh0aGlzLmdldFNjcmlwdFBhcnRGcm9tQ29kZShjb2RlKSk7XG4gICAgICBpZiAodGhpcy5vcHRpb25zLmxvYWQgIT09ICdjdXJyZW50T25seScpIGFkZENvZGUodGhpcy5nZXRMYW5ndWFnZVBhcnRGcm9tQ29kZShjb2RlKSk7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgY29kZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGFkZENvZGUodGhpcy5mb3JtYXRMYW5ndWFnZUNvZGUoY29kZSkpO1xuICAgIH1cblxuICAgIGZhbGxiYWNrQ29kZXMuZm9yRWFjaCgoZmMpID0+IHtcbiAgICAgIGlmIChjb2Rlcy5pbmRleE9mKGZjKSA8IDApIGFkZENvZGUodGhpcy5mb3JtYXRMYW5ndWFnZUNvZGUoZmMpKTtcbiAgICB9KTtcblxuICAgIHJldHVybiBjb2RlcztcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBMYW5ndWFnZVV0aWw7XG4iLCJpbXBvcnQgYmFzZUxvZ2dlciBmcm9tICcuL2xvZ2dlci5qcyc7XG5pbXBvcnQgeyBnZXRDbGVhbmVkQ29kZSB9IGZyb20gJy4vdXRpbHMuanMnXG5cbi8vIGRlZmluaXRpb24gaHR0cDovL3RyYW5zbGF0ZS5zb3VyY2Vmb3JnZS5uZXQvd2lraS9sMTBuL3BsdXJhbGZvcm1zXG4vKiBlc2xpbnQtZGlzYWJsZSAqL1xubGV0IHNldHMgPSBbXG4gIHsgbG5nczogWydhY2gnLCdhaycsJ2FtJywnYXJuJywnYnInLCdmaWwnLCdndW4nLCdsbicsJ21mZScsJ21nJywnbWknLCdvYycsICdwdCcsICdwdC1CUicsXG4gICAgJ3RnJywgJ3RsJywgJ3RpJywndHInLCd1eicsJ3dhJ10sIG5yOiBbMSwyXSwgZmM6IDEgfSxcblxuICB7IGxuZ3M6IFsnYWYnLCdhbicsJ2FzdCcsJ2F6JywnYmcnLCdibicsJ2NhJywnZGEnLCdkZScsJ2RldicsJ2VsJywnZW4nLFxuICAgICdlbycsJ2VzJywnZXQnLCdldScsJ2ZpJywnZm8nLCdmdXInLCdmeScsJ2dsJywnZ3UnLCdoYScsJ2hpJyxcbiAgICAnaHUnLCdoeScsJ2lhJywnaXQnLCdraycsJ2tuJywna3UnLCdsYicsJ21haScsJ21sJywnbW4nLCdtcicsJ25haCcsJ25hcCcsJ25iJyxcbiAgICAnbmUnLCdubCcsJ25uJywnbm8nLCduc28nLCdwYScsJ3BhcCcsJ3BtcycsJ3BzJywncHQtUFQnLCdybScsJ3NjbycsXG4gICAgJ3NlJywnc2knLCdzbycsJ3NvbicsJ3NxJywnc3YnLCdzdycsJ3RhJywndGUnLCd0aycsJ3VyJywneW8nXSwgbnI6IFsxLDJdLCBmYzogMiB9LFxuXG4gIHsgbG5nczogWydheScsJ2JvJywnY2dnJywnZmEnLCdodCcsJ2lkJywnamEnLCdqYm8nLCdrYScsJ2ttJywna28nLCdreScsJ2xvJyxcbiAgICAnbXMnLCdzYWgnLCdzdScsJ3RoJywndHQnLCd1ZycsJ3ZpJywnd28nLCd6aCddLCBucjogWzFdLCBmYzogMyB9LFxuXG4gIHsgbG5nczogWydiZScsJ2JzJywgJ2NucicsICdkeicsJ2hyJywncnUnLCdzcicsJ3VrJ10sIG5yOiBbMSwyLDVdLCBmYzogNCB9LFxuXG4gIHsgbG5nczogWydhciddLCBucjogWzAsMSwyLDMsMTEsMTAwXSwgZmM6IDUgfSxcbiAgeyBsbmdzOiBbJ2NzJywnc2snXSwgbnI6IFsxLDIsNV0sIGZjOiA2IH0sXG4gIHsgbG5nczogWydjc2InLCdwbCddLCBucjogWzEsMiw1XSwgZmM6IDcgfSxcbiAgeyBsbmdzOiBbJ2N5J10sIG5yOiBbMSwyLDMsOF0sIGZjOiA4IH0sXG4gIHsgbG5nczogWydmciddLCBucjogWzEsMl0sIGZjOiA5IH0sXG4gIHsgbG5nczogWydnYSddLCBucjogWzEsMiwzLDcsMTFdLCBmYzogMTAgfSxcbiAgeyBsbmdzOiBbJ2dkJ10sIG5yOiBbMSwyLDMsMjBdLCBmYzogMTEgfSxcbiAgeyBsbmdzOiBbJ2lzJ10sIG5yOiBbMSwyXSwgZmM6IDEyIH0sXG4gIHsgbG5nczogWydqdiddLCBucjogWzAsMV0sIGZjOiAxMyB9LFxuICB7IGxuZ3M6IFsna3cnXSwgbnI6IFsxLDIsMyw0XSwgZmM6IDE0IH0sXG4gIHsgbG5nczogWydsdCddLCBucjogWzEsMiwxMF0sIGZjOiAxNSB9LFxuICB7IGxuZ3M6IFsnbHYnXSwgbnI6IFsxLDIsMF0sIGZjOiAxNiB9LFxuICB7IGxuZ3M6IFsnbWsnXSwgbnI6IFsxLDJdLCBmYzogMTcgfSxcbiAgeyBsbmdzOiBbJ21uayddLCBucjogWzAsMSwyXSwgZmM6IDE4IH0sXG4gIHsgbG5nczogWydtdCddLCBucjogWzEsMiwxMSwyMF0sIGZjOiAxOSB9LFxuICB7IGxuZ3M6IFsnb3InXSwgbnI6IFsyLDFdLCBmYzogMiB9LFxuICB7IGxuZ3M6IFsncm8nXSwgbnI6IFsxLDIsMjBdLCBmYzogMjAgfSxcbiAgeyBsbmdzOiBbJ3NsJ10sIG5yOiBbNSwxLDIsM10sIGZjOiAyMSB9LFxuICB7IGxuZ3M6IFsnaGUnLCdpdyddLCBucjogWzEsMiwyMCwyMV0sIGZjOiAyMiB9XG5dXG5cbmxldCBfcnVsZXNQbHVyYWxzVHlwZXMgPSB7XG4gIDE6IGZ1bmN0aW9uKG4pIHtyZXR1cm4gTnVtYmVyKG4gPiAxKTt9LFxuICAyOiBmdW5jdGlvbihuKSB7cmV0dXJuIE51bWJlcihuICE9IDEpO30sXG4gIDM6IGZ1bmN0aW9uKG4pIHtyZXR1cm4gMDt9LFxuICA0OiBmdW5jdGlvbihuKSB7cmV0dXJuIE51bWJlcihuJTEwPT0xICYmIG4lMTAwIT0xMSA/IDAgOiBuJTEwPj0yICYmIG4lMTA8PTQgJiYgKG4lMTAwPDEwIHx8IG4lMTAwPj0yMCkgPyAxIDogMik7fSxcbiAgNTogZnVuY3Rpb24obikge3JldHVybiBOdW1iZXIobj09MCA/IDAgOiBuPT0xID8gMSA6IG49PTIgPyAyIDogbiUxMDA+PTMgJiYgbiUxMDA8PTEwID8gMyA6IG4lMTAwPj0xMSA/IDQgOiA1KTt9LFxuICA2OiBmdW5jdGlvbihuKSB7cmV0dXJuIE51bWJlcigobj09MSkgPyAwIDogKG4+PTIgJiYgbjw9NCkgPyAxIDogMik7fSxcbiAgNzogZnVuY3Rpb24obikge3JldHVybiBOdW1iZXIobj09MSA/IDAgOiBuJTEwPj0yICYmIG4lMTA8PTQgJiYgKG4lMTAwPDEwIHx8IG4lMTAwPj0yMCkgPyAxIDogMik7fSxcbiAgODogZnVuY3Rpb24obikge3JldHVybiBOdW1iZXIoKG49PTEpID8gMCA6IChuPT0yKSA/IDEgOiAobiAhPSA4ICYmIG4gIT0gMTEpID8gMiA6IDMpO30sXG4gIDk6IGZ1bmN0aW9uKG4pIHtyZXR1cm4gTnVtYmVyKG4gPj0gMik7fSxcbiAgMTA6IGZ1bmN0aW9uKG4pIHtyZXR1cm4gTnVtYmVyKG49PTEgPyAwIDogbj09MiA/IDEgOiBuPDcgPyAyIDogbjwxMSA/IDMgOiA0KSA7fSxcbiAgMTE6IGZ1bmN0aW9uKG4pIHtyZXR1cm4gTnVtYmVyKChuPT0xIHx8IG49PTExKSA/IDAgOiAobj09MiB8fCBuPT0xMikgPyAxIDogKG4gPiAyICYmIG4gPCAyMCkgPyAyIDogMyk7fSxcbiAgMTI6IGZ1bmN0aW9uKG4pIHtyZXR1cm4gTnVtYmVyKG4lMTAhPTEgfHwgbiUxMDA9PTExKTt9LFxuICAxMzogZnVuY3Rpb24obikge3JldHVybiBOdW1iZXIobiAhPT0gMCk7fSxcbiAgMTQ6IGZ1bmN0aW9uKG4pIHtyZXR1cm4gTnVtYmVyKChuPT0xKSA/IDAgOiAobj09MikgPyAxIDogKG4gPT0gMykgPyAyIDogMyk7fSxcbiAgMTU6IGZ1bmN0aW9uKG4pIHtyZXR1cm4gTnVtYmVyKG4lMTA9PTEgJiYgbiUxMDAhPTExID8gMCA6IG4lMTA+PTIgJiYgKG4lMTAwPDEwIHx8IG4lMTAwPj0yMCkgPyAxIDogMik7fSxcbiAgMTY6IGZ1bmN0aW9uKG4pIHtyZXR1cm4gTnVtYmVyKG4lMTA9PTEgJiYgbiUxMDAhPTExID8gMCA6IG4gIT09IDAgPyAxIDogMik7fSxcbiAgMTc6IGZ1bmN0aW9uKG4pIHtyZXR1cm4gTnVtYmVyKG49PTEgfHwgbiUxMD09MSAmJiBuJTEwMCE9MTEgPyAwIDogMSk7fSxcbiAgMTg6IGZ1bmN0aW9uKG4pIHtyZXR1cm4gTnVtYmVyKG49PTAgPyAwIDogbj09MSA/IDEgOiAyKTt9LFxuICAxOTogZnVuY3Rpb24obikge3JldHVybiBOdW1iZXIobj09MSA/IDAgOiBuPT0wIHx8ICggbiUxMDA+MSAmJiBuJTEwMDwxMSkgPyAxIDogKG4lMTAwPjEwICYmIG4lMTAwPDIwICkgPyAyIDogMyk7fSxcbiAgMjA6IGZ1bmN0aW9uKG4pIHtyZXR1cm4gTnVtYmVyKG49PTEgPyAwIDogKG49PTAgfHwgKG4lMTAwID4gMCAmJiBuJTEwMCA8IDIwKSkgPyAxIDogMik7fSxcbiAgMjE6IGZ1bmN0aW9uKG4pIHtyZXR1cm4gTnVtYmVyKG4lMTAwPT0xID8gMSA6IG4lMTAwPT0yID8gMiA6IG4lMTAwPT0zIHx8IG4lMTAwPT00ID8gMyA6IDApOyB9LFxuICAyMjogZnVuY3Rpb24obikge3JldHVybiBOdW1iZXIobj09MSA/IDAgOiBuPT0yID8gMSA6IChuPDAgfHwgbj4xMCkgJiYgbiUxMD09MCA/IDIgOiAzKTsgfVxufTtcbi8qIGVzbGludC1lbmFibGUgKi9cblxuY29uc3Qgbm9uSW50bFZlcnNpb25zID0gWyd2MScsICd2MicsICd2MyddO1xuY29uc3QgaW50bFZlcnNpb25zID0gWyd2NCddO1xuY29uc3Qgc3VmZml4ZXNPcmRlciA9IHtcbiAgemVybzogMCxcbiAgb25lOiAxLFxuICB0d286IDIsXG4gIGZldzogMyxcbiAgbWFueTogNCxcbiAgb3RoZXI6IDUsXG59O1xuXG5mdW5jdGlvbiBjcmVhdGVSdWxlcygpIHtcbiAgY29uc3QgcnVsZXMgPSB7fTtcbiAgc2V0cy5mb3JFYWNoKChzZXQpID0+IHtcbiAgICBzZXQubG5ncy5mb3JFYWNoKChsKSA9PiB7XG4gICAgICBydWxlc1tsXSA9IHtcbiAgICAgICAgbnVtYmVyczogc2V0Lm5yLFxuICAgICAgICBwbHVyYWxzOiBfcnVsZXNQbHVyYWxzVHlwZXNbc2V0LmZjXVxuICAgICAgfTtcbiAgICB9KTtcbiAgfSk7XG4gIHJldHVybiBydWxlcztcbn1cblxuY2xhc3MgUGx1cmFsUmVzb2x2ZXIge1xuICBjb25zdHJ1Y3RvcihsYW5ndWFnZVV0aWxzLCBvcHRpb25zID0ge30pIHtcbiAgICB0aGlzLmxhbmd1YWdlVXRpbHMgPSBsYW5ndWFnZVV0aWxzO1xuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG5cbiAgICB0aGlzLmxvZ2dlciA9IGJhc2VMb2dnZXIuY3JlYXRlKCdwbHVyYWxSZXNvbHZlcicpO1xuXG4gICAgaWYgKCghdGhpcy5vcHRpb25zLmNvbXBhdGliaWxpdHlKU09OIHx8IGludGxWZXJzaW9ucy5pbmNsdWRlcyh0aGlzLm9wdGlvbnMuY29tcGF0aWJpbGl0eUpTT04pKSAmJiAodHlwZW9mIEludGwgPT09ICd1bmRlZmluZWQnIHx8ICFJbnRsLlBsdXJhbFJ1bGVzKSkge1xuICAgICAgdGhpcy5vcHRpb25zLmNvbXBhdGliaWxpdHlKU09OID0gJ3YzJztcbiAgICAgIHRoaXMubG9nZ2VyLmVycm9yKCdZb3VyIGVudmlyb25tZW50IHNlZW1zIG5vdCB0byBiZSBJbnRsIEFQSSBjb21wYXRpYmxlLCB1c2UgYW4gSW50bC5QbHVyYWxSdWxlcyBwb2x5ZmlsbC4gV2lsbCBmYWxsYmFjayB0byB0aGUgY29tcGF0aWJpbGl0eUpTT04gdjMgZm9ybWF0IGhhbmRsaW5nLicpO1xuICAgIH1cblxuICAgIHRoaXMucnVsZXMgPSBjcmVhdGVSdWxlcygpO1xuICB9XG5cbiAgYWRkUnVsZShsbmcsIG9iaikge1xuICAgIHRoaXMucnVsZXNbbG5nXSA9IG9iajtcbiAgfVxuXG4gIGdldFJ1bGUoY29kZSwgb3B0aW9ucyA9IHt9KSB7XG4gICAgaWYgKHRoaXMuc2hvdWxkVXNlSW50bEFwaSgpKSB7XG4gICAgICB0cnkge1xuICAgICAgICByZXR1cm4gbmV3IEludGwuUGx1cmFsUnVsZXMoZ2V0Q2xlYW5lZENvZGUoY29kZSA9PT0gJ2RldicgPyAnZW4nIDogY29kZSksIHsgdHlwZTogb3B0aW9ucy5vcmRpbmFsID8gJ29yZGluYWwnIDogJ2NhcmRpbmFsJyB9KTtcbiAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMucnVsZXNbY29kZV0gfHwgdGhpcy5ydWxlc1t0aGlzLmxhbmd1YWdlVXRpbHMuZ2V0TGFuZ3VhZ2VQYXJ0RnJvbUNvZGUoY29kZSldO1xuICB9XG5cbiAgbmVlZHNQbHVyYWwoY29kZSwgb3B0aW9ucyA9IHt9KSB7XG4gICAgY29uc3QgcnVsZSA9IHRoaXMuZ2V0UnVsZShjb2RlLCBvcHRpb25zKTtcblxuICAgIGlmICh0aGlzLnNob3VsZFVzZUludGxBcGkoKSkge1xuICAgICAgcmV0dXJuIHJ1bGUgJiYgcnVsZS5yZXNvbHZlZE9wdGlvbnMoKS5wbHVyYWxDYXRlZ29yaWVzLmxlbmd0aCA+IDE7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJ1bGUgJiYgcnVsZS5udW1iZXJzLmxlbmd0aCA+IDE7XG4gIH1cblxuICBnZXRQbHVyYWxGb3Jtc09mS2V5KGNvZGUsIGtleSwgb3B0aW9ucyA9IHt9KSB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0U3VmZml4ZXMoY29kZSwgb3B0aW9ucykubWFwKChzdWZmaXgpID0+IGAke2tleX0ke3N1ZmZpeH1gKTtcbiAgfVxuXG4gIGdldFN1ZmZpeGVzKGNvZGUsIG9wdGlvbnMgPSB7fSkge1xuICAgIGNvbnN0IHJ1bGUgPSB0aGlzLmdldFJ1bGUoY29kZSwgb3B0aW9ucyk7XG5cbiAgICBpZiAoIXJ1bGUpIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5zaG91bGRVc2VJbnRsQXBpKCkpIHtcbiAgICAgIHJldHVybiBydWxlLnJlc29sdmVkT3B0aW9ucygpLnBsdXJhbENhdGVnb3JpZXNcbiAgICAgICAgLnNvcnQoKHBsdXJhbENhdGVnb3J5MSwgcGx1cmFsQ2F0ZWdvcnkyKSA9PiBzdWZmaXhlc09yZGVyW3BsdXJhbENhdGVnb3J5MV0gLSBzdWZmaXhlc09yZGVyW3BsdXJhbENhdGVnb3J5Ml0pXG4gICAgICAgIC5tYXAocGx1cmFsQ2F0ZWdvcnkgPT4gYCR7dGhpcy5vcHRpb25zLnByZXBlbmR9JHtvcHRpb25zLm9yZGluYWwgPyBgb3JkaW5hbCR7dGhpcy5vcHRpb25zLnByZXBlbmR9YCA6ICcnfSR7cGx1cmFsQ2F0ZWdvcnl9YCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJ1bGUubnVtYmVycy5tYXAoKG51bWJlcikgPT4gdGhpcy5nZXRTdWZmaXgoY29kZSwgbnVtYmVyLCBvcHRpb25zKSk7XG4gIH1cblxuICBnZXRTdWZmaXgoY29kZSwgY291bnQsIG9wdGlvbnMgPSB7fSkge1xuICAgIGNvbnN0IHJ1bGUgPSB0aGlzLmdldFJ1bGUoY29kZSwgb3B0aW9ucyk7XG5cbiAgICBpZiAocnVsZSkge1xuICAgICAgaWYgKHRoaXMuc2hvdWxkVXNlSW50bEFwaSgpKSB7XG4gICAgICAgIHJldHVybiBgJHt0aGlzLm9wdGlvbnMucHJlcGVuZH0ke29wdGlvbnMub3JkaW5hbCA/IGBvcmRpbmFsJHt0aGlzLm9wdGlvbnMucHJlcGVuZH1gIDogJyd9JHtydWxlLnNlbGVjdChjb3VudCl9YDtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRoaXMuZ2V0U3VmZml4UmV0cm9Db21wYXRpYmxlKHJ1bGUsIGNvdW50KTtcbiAgICB9XG5cbiAgICB0aGlzLmxvZ2dlci53YXJuKGBubyBwbHVyYWwgcnVsZSBmb3VuZCBmb3I6ICR7Y29kZX1gKTtcbiAgICByZXR1cm4gJyc7XG4gIH1cblxuICBnZXRTdWZmaXhSZXRyb0NvbXBhdGlibGUocnVsZSwgY291bnQpIHtcbiAgICBjb25zdCBpZHggPSBydWxlLm5vQWJzID8gcnVsZS5wbHVyYWxzKGNvdW50KSA6IHJ1bGUucGx1cmFscyhNYXRoLmFicyhjb3VudCkpO1xuICAgIGxldCBzdWZmaXggPSBydWxlLm51bWJlcnNbaWR4XTtcblxuICAgIC8vIHNwZWNpYWwgdHJlYXRtZW50IGZvciBsbmdzIG9ubHkgaGF2aW5nIHNpbmd1bGFyIGFuZCBwbHVyYWxcbiAgICBpZiAodGhpcy5vcHRpb25zLnNpbXBsaWZ5UGx1cmFsU3VmZml4ICYmIHJ1bGUubnVtYmVycy5sZW5ndGggPT09IDIgJiYgcnVsZS5udW1iZXJzWzBdID09PSAxKSB7XG4gICAgICBpZiAoc3VmZml4ID09PSAyKSB7XG4gICAgICAgIHN1ZmZpeCA9ICdwbHVyYWwnO1xuICAgICAgfSBlbHNlIGlmIChzdWZmaXggPT09IDEpIHtcbiAgICAgICAgc3VmZml4ID0gJyc7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgcmV0dXJuU3VmZml4ID0gKCkgPT4gKFxuICAgICAgdGhpcy5vcHRpb25zLnByZXBlbmQgJiYgc3VmZml4LnRvU3RyaW5nKCkgPyB0aGlzLm9wdGlvbnMucHJlcGVuZCArIHN1ZmZpeC50b1N0cmluZygpIDogc3VmZml4LnRvU3RyaW5nKClcbiAgICApO1xuXG4gICAgLy8gQ09NUEFUSUJJTElUWSBKU09OXG4gICAgLy8gdjFcbiAgICBpZiAodGhpcy5vcHRpb25zLmNvbXBhdGliaWxpdHlKU09OID09PSAndjEnKSB7XG4gICAgICBpZiAoc3VmZml4ID09PSAxKSByZXR1cm4gJyc7XG4gICAgICBpZiAodHlwZW9mIHN1ZmZpeCA9PT0gJ251bWJlcicpIHJldHVybiBgX3BsdXJhbF8ke3N1ZmZpeC50b1N0cmluZygpfWA7XG4gICAgICByZXR1cm4gcmV0dXJuU3VmZml4KCk7XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tZWxzZS1yZXR1cm5cbiAgICB9IGVsc2UgaWYgKC8qIHYyICovIHRoaXMub3B0aW9ucy5jb21wYXRpYmlsaXR5SlNPTiA9PT0gJ3YyJykge1xuICAgICAgcmV0dXJuIHJldHVyblN1ZmZpeCgpO1xuICAgIH0gZWxzZSBpZiAoLyogdjMgLSBnZXR0ZXh0IGluZGV4ICovIHRoaXMub3B0aW9ucy5zaW1wbGlmeVBsdXJhbFN1ZmZpeCAmJiBydWxlLm51bWJlcnMubGVuZ3RoID09PSAyICYmIHJ1bGUubnVtYmVyc1swXSA9PT0gMSkge1xuICAgICAgcmV0dXJuIHJldHVyblN1ZmZpeCgpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5vcHRpb25zLnByZXBlbmQgJiYgaWR4LnRvU3RyaW5nKCkgPyB0aGlzLm9wdGlvbnMucHJlcGVuZCArIGlkeC50b1N0cmluZygpIDogaWR4LnRvU3RyaW5nKCk7XG4gIH1cblxuICBzaG91bGRVc2VJbnRsQXBpKCkge1xuICAgIHJldHVybiAhbm9uSW50bFZlcnNpb25zLmluY2x1ZGVzKHRoaXMub3B0aW9ucy5jb21wYXRpYmlsaXR5SlNPTik7XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgUGx1cmFsUmVzb2x2ZXI7XG4iLCJpbXBvcnQgKiBhcyB1dGlscyBmcm9tICcuL3V0aWxzLmpzJztcbmltcG9ydCBiYXNlTG9nZ2VyIGZyb20gJy4vbG9nZ2VyLmpzJztcblxuZnVuY3Rpb24gZGVlcEZpbmRXaXRoRGVmYXVsdHMoXG4gIGRhdGEsXG4gIGRlZmF1bHREYXRhLFxuICBrZXksXG4gIGtleVNlcGFyYXRvciA9ICcuJyxcbiAgaWdub3JlSlNPTlN0cnVjdHVyZSA9IHRydWUsXG4pIHtcbiAgbGV0IHBhdGggPSB1dGlscy5nZXRQYXRoV2l0aERlZmF1bHRzKGRhdGEsIGRlZmF1bHREYXRhLCBrZXkpO1xuICBpZiAoIXBhdGggJiYgaWdub3JlSlNPTlN0cnVjdHVyZSAmJiB0eXBlb2Yga2V5ID09PSAnc3RyaW5nJykge1xuICAgIHBhdGggPSB1dGlscy5kZWVwRmluZChkYXRhLCBrZXksIGtleVNlcGFyYXRvcik7XG4gICAgaWYgKHBhdGggPT09IHVuZGVmaW5lZCkgcGF0aCA9IHV0aWxzLmRlZXBGaW5kKGRlZmF1bHREYXRhLCBrZXksIGtleVNlcGFyYXRvcik7XG4gIH1cbiAgcmV0dXJuIHBhdGg7XG59XG5cbmNsYXNzIEludGVycG9sYXRvciB7XG4gIGNvbnN0cnVjdG9yKG9wdGlvbnMgPSB7fSkge1xuICAgIHRoaXMubG9nZ2VyID0gYmFzZUxvZ2dlci5jcmVhdGUoJ2ludGVycG9sYXRvcicpO1xuXG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcbiAgICB0aGlzLmZvcm1hdCA9IChvcHRpb25zLmludGVycG9sYXRpb24gJiYgb3B0aW9ucy5pbnRlcnBvbGF0aW9uLmZvcm1hdCkgfHwgKCh2YWx1ZSkgPT4gdmFsdWUpO1xuICAgIHRoaXMuaW5pdChvcHRpb25zKTtcbiAgfVxuXG4gIC8qIGVzbGludCBuby1wYXJhbS1yZWFzc2lnbjogMCAqL1xuICBpbml0KG9wdGlvbnMgPSB7fSkge1xuICAgIGlmICghb3B0aW9ucy5pbnRlcnBvbGF0aW9uKSBvcHRpb25zLmludGVycG9sYXRpb24gPSB7IGVzY2FwZVZhbHVlOiB0cnVlIH07XG5cbiAgICBjb25zdCBpT3B0cyA9IG9wdGlvbnMuaW50ZXJwb2xhdGlvbjtcblxuICAgIHRoaXMuZXNjYXBlID0gaU9wdHMuZXNjYXBlICE9PSB1bmRlZmluZWQgPyBpT3B0cy5lc2NhcGUgOiB1dGlscy5lc2NhcGU7XG4gICAgdGhpcy5lc2NhcGVWYWx1ZSA9IGlPcHRzLmVzY2FwZVZhbHVlICE9PSB1bmRlZmluZWQgPyBpT3B0cy5lc2NhcGVWYWx1ZSA6IHRydWU7XG4gICAgdGhpcy51c2VSYXdWYWx1ZVRvRXNjYXBlID1cbiAgICAgIGlPcHRzLnVzZVJhd1ZhbHVlVG9Fc2NhcGUgIT09IHVuZGVmaW5lZCA/IGlPcHRzLnVzZVJhd1ZhbHVlVG9Fc2NhcGUgOiBmYWxzZTtcblxuICAgIHRoaXMucHJlZml4ID0gaU9wdHMucHJlZml4ID8gdXRpbHMucmVnZXhFc2NhcGUoaU9wdHMucHJlZml4KSA6IGlPcHRzLnByZWZpeEVzY2FwZWQgfHwgJ3t7JztcbiAgICB0aGlzLnN1ZmZpeCA9IGlPcHRzLnN1ZmZpeCA/IHV0aWxzLnJlZ2V4RXNjYXBlKGlPcHRzLnN1ZmZpeCkgOiBpT3B0cy5zdWZmaXhFc2NhcGVkIHx8ICd9fSc7XG5cbiAgICB0aGlzLmZvcm1hdFNlcGFyYXRvciA9IGlPcHRzLmZvcm1hdFNlcGFyYXRvclxuICAgICAgPyBpT3B0cy5mb3JtYXRTZXBhcmF0b3JcbiAgICAgIDogaU9wdHMuZm9ybWF0U2VwYXJhdG9yIHx8ICcsJztcblxuICAgIHRoaXMudW5lc2NhcGVQcmVmaXggPSBpT3B0cy51bmVzY2FwZVN1ZmZpeCA/ICcnIDogaU9wdHMudW5lc2NhcGVQcmVmaXggfHwgJy0nO1xuICAgIHRoaXMudW5lc2NhcGVTdWZmaXggPSB0aGlzLnVuZXNjYXBlUHJlZml4ID8gJycgOiBpT3B0cy51bmVzY2FwZVN1ZmZpeCB8fCAnJztcblxuICAgIHRoaXMubmVzdGluZ1ByZWZpeCA9IGlPcHRzLm5lc3RpbmdQcmVmaXhcbiAgICAgID8gdXRpbHMucmVnZXhFc2NhcGUoaU9wdHMubmVzdGluZ1ByZWZpeClcbiAgICAgIDogaU9wdHMubmVzdGluZ1ByZWZpeEVzY2FwZWQgfHwgdXRpbHMucmVnZXhFc2NhcGUoJyR0KCcpO1xuICAgIHRoaXMubmVzdGluZ1N1ZmZpeCA9IGlPcHRzLm5lc3RpbmdTdWZmaXhcbiAgICAgID8gdXRpbHMucmVnZXhFc2NhcGUoaU9wdHMubmVzdGluZ1N1ZmZpeClcbiAgICAgIDogaU9wdHMubmVzdGluZ1N1ZmZpeEVzY2FwZWQgfHwgdXRpbHMucmVnZXhFc2NhcGUoJyknKTtcblxuICAgIHRoaXMubmVzdGluZ09wdGlvbnNTZXBhcmF0b3IgPSBpT3B0cy5uZXN0aW5nT3B0aW9uc1NlcGFyYXRvclxuICAgICAgPyBpT3B0cy5uZXN0aW5nT3B0aW9uc1NlcGFyYXRvclxuICAgICAgOiBpT3B0cy5uZXN0aW5nT3B0aW9uc1NlcGFyYXRvciB8fCAnLCc7XG5cbiAgICB0aGlzLm1heFJlcGxhY2VzID0gaU9wdHMubWF4UmVwbGFjZXMgPyBpT3B0cy5tYXhSZXBsYWNlcyA6IDEwMDA7XG5cbiAgICB0aGlzLmFsd2F5c0Zvcm1hdCA9IGlPcHRzLmFsd2F5c0Zvcm1hdCAhPT0gdW5kZWZpbmVkID8gaU9wdHMuYWx3YXlzRm9ybWF0IDogZmFsc2U7XG5cbiAgICAvLyB0aGUgcmVnZXhwXG4gICAgdGhpcy5yZXNldFJlZ0V4cCgpO1xuICB9XG5cbiAgcmVzZXQoKSB7XG4gICAgaWYgKHRoaXMub3B0aW9ucykgdGhpcy5pbml0KHRoaXMub3B0aW9ucyk7XG4gIH1cblxuICByZXNldFJlZ0V4cCgpIHtcbiAgICBjb25zdCBnZXRPclJlc2V0UmVnRXhwID0gKGV4aXN0aW5nUmVnRXhwLCBwYXR0ZXJuKSA9PiB7XG4gICAgICBpZiAoZXhpc3RpbmdSZWdFeHAgJiYgZXhpc3RpbmdSZWdFeHAuc291cmNlID09PSBwYXR0ZXJuKSB7XG4gICAgICAgIGV4aXN0aW5nUmVnRXhwLmxhc3RJbmRleCA9IDA7XG4gICAgICAgIHJldHVybiBleGlzdGluZ1JlZ0V4cDtcbiAgICAgIH1cbiAgICAgIHJldHVybiBuZXcgUmVnRXhwKHBhdHRlcm4sICdnJyk7XG4gICAgfTtcblxuICAgIHRoaXMucmVnZXhwID0gZ2V0T3JSZXNldFJlZ0V4cCh0aGlzLnJlZ2V4cCwgYCR7dGhpcy5wcmVmaXh9KC4rPykke3RoaXMuc3VmZml4fWApO1xuICAgIHRoaXMucmVnZXhwVW5lc2NhcGUgPSBnZXRPclJlc2V0UmVnRXhwKFxuICAgICAgdGhpcy5yZWdleHBVbmVzY2FwZSxcbiAgICAgIGAke3RoaXMucHJlZml4fSR7dGhpcy51bmVzY2FwZVByZWZpeH0oLis/KSR7dGhpcy51bmVzY2FwZVN1ZmZpeH0ke3RoaXMuc3VmZml4fWAsXG4gICAgKTtcbiAgICB0aGlzLm5lc3RpbmdSZWdleHAgPSBnZXRPclJlc2V0UmVnRXhwKFxuICAgICAgdGhpcy5uZXN0aW5nUmVnZXhwLFxuICAgICAgYCR7dGhpcy5uZXN0aW5nUHJlZml4fSguKz8pJHt0aGlzLm5lc3RpbmdTdWZmaXh9YCxcbiAgICApO1xuICB9XG5cbiAgaW50ZXJwb2xhdGUoc3RyLCBkYXRhLCBsbmcsIG9wdGlvbnMpIHtcbiAgICBsZXQgbWF0Y2g7XG4gICAgbGV0IHZhbHVlO1xuICAgIGxldCByZXBsYWNlcztcblxuICAgIGNvbnN0IGRlZmF1bHREYXRhID1cbiAgICAgICh0aGlzLm9wdGlvbnMgJiYgdGhpcy5vcHRpb25zLmludGVycG9sYXRpb24gJiYgdGhpcy5vcHRpb25zLmludGVycG9sYXRpb24uZGVmYXVsdFZhcmlhYmxlcykgfHxcbiAgICAgIHt9O1xuXG4gICAgZnVuY3Rpb24gcmVnZXhTYWZlKHZhbCkge1xuICAgICAgcmV0dXJuIHZhbC5yZXBsYWNlKC9cXCQvZywgJyQkJCQnKTtcbiAgICB9XG5cbiAgICBjb25zdCBoYW5kbGVGb3JtYXQgPSAoa2V5KSA9PiB7XG4gICAgICBpZiAoa2V5LmluZGV4T2YodGhpcy5mb3JtYXRTZXBhcmF0b3IpIDwgMCkge1xuICAgICAgICBjb25zdCBwYXRoID0gZGVlcEZpbmRXaXRoRGVmYXVsdHMoXG4gICAgICAgICAgZGF0YSxcbiAgICAgICAgICBkZWZhdWx0RGF0YSxcbiAgICAgICAgICBrZXksXG4gICAgICAgICAgdGhpcy5vcHRpb25zLmtleVNlcGFyYXRvcixcbiAgICAgICAgICB0aGlzLm9wdGlvbnMuaWdub3JlSlNPTlN0cnVjdHVyZSxcbiAgICAgICAgKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuYWx3YXlzRm9ybWF0XG4gICAgICAgICAgPyB0aGlzLmZvcm1hdChwYXRoLCB1bmRlZmluZWQsIGxuZywgeyAuLi5vcHRpb25zLCAuLi5kYXRhLCBpbnRlcnBvbGF0aW9ua2V5OiBrZXkgfSlcbiAgICAgICAgICA6IHBhdGg7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHAgPSBrZXkuc3BsaXQodGhpcy5mb3JtYXRTZXBhcmF0b3IpO1xuICAgICAgY29uc3QgayA9IHAuc2hpZnQoKS50cmltKCk7XG4gICAgICBjb25zdCBmID0gcC5qb2luKHRoaXMuZm9ybWF0U2VwYXJhdG9yKS50cmltKCk7XG5cbiAgICAgIHJldHVybiB0aGlzLmZvcm1hdChcbiAgICAgICAgZGVlcEZpbmRXaXRoRGVmYXVsdHMoXG4gICAgICAgICAgZGF0YSxcbiAgICAgICAgICBkZWZhdWx0RGF0YSxcbiAgICAgICAgICBrLFxuICAgICAgICAgIHRoaXMub3B0aW9ucy5rZXlTZXBhcmF0b3IsXG4gICAgICAgICAgdGhpcy5vcHRpb25zLmlnbm9yZUpTT05TdHJ1Y3R1cmUsXG4gICAgICAgICksXG4gICAgICAgIGYsXG4gICAgICAgIGxuZyxcbiAgICAgICAge1xuICAgICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICAgICAgLi4uZGF0YSxcbiAgICAgICAgICBpbnRlcnBvbGF0aW9ua2V5OiBrLFxuICAgICAgICB9LFxuICAgICAgKTtcbiAgICB9O1xuXG4gICAgdGhpcy5yZXNldFJlZ0V4cCgpO1xuXG4gICAgY29uc3QgbWlzc2luZ0ludGVycG9sYXRpb25IYW5kbGVyID1cbiAgICAgIChvcHRpb25zICYmIG9wdGlvbnMubWlzc2luZ0ludGVycG9sYXRpb25IYW5kbGVyKSB8fCB0aGlzLm9wdGlvbnMubWlzc2luZ0ludGVycG9sYXRpb25IYW5kbGVyO1xuXG4gICAgY29uc3Qgc2tpcE9uVmFyaWFibGVzID1cbiAgICAgIG9wdGlvbnMgJiYgb3B0aW9ucy5pbnRlcnBvbGF0aW9uICYmIG9wdGlvbnMuaW50ZXJwb2xhdGlvbi5za2lwT25WYXJpYWJsZXMgIT09IHVuZGVmaW5lZFxuICAgICAgICA/IG9wdGlvbnMuaW50ZXJwb2xhdGlvbi5za2lwT25WYXJpYWJsZXNcbiAgICAgICAgOiB0aGlzLm9wdGlvbnMuaW50ZXJwb2xhdGlvbi5za2lwT25WYXJpYWJsZXM7XG5cbiAgICBjb25zdCB0b2RvcyA9IFtcbiAgICAgIHtcbiAgICAgICAgLy8gdW5lc2NhcGUgaWYgaGFzIHVuZXNjYXBlUHJlZml4L1N1ZmZpeFxuICAgICAgICByZWdleDogdGhpcy5yZWdleHBVbmVzY2FwZSxcbiAgICAgICAgc2FmZVZhbHVlOiAodmFsKSA9PiByZWdleFNhZmUodmFsKSxcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIC8vIHJlZ3VsYXIgZXNjYXBlIG9uIGRlbWFuZFxuICAgICAgICByZWdleDogdGhpcy5yZWdleHAsXG4gICAgICAgIHNhZmVWYWx1ZTogKHZhbCkgPT4gKHRoaXMuZXNjYXBlVmFsdWUgPyByZWdleFNhZmUodGhpcy5lc2NhcGUodmFsKSkgOiByZWdleFNhZmUodmFsKSksXG4gICAgICB9LFxuICAgIF07XG4gICAgdG9kb3MuZm9yRWFjaCgodG9kbykgPT4ge1xuICAgICAgcmVwbGFjZXMgPSAwO1xuICAgICAgLyogZXNsaW50IG5vLWNvbmQtYXNzaWduOiAwICovXG4gICAgICB3aGlsZSAoKG1hdGNoID0gdG9kby5yZWdleC5leGVjKHN0cikpKSB7XG4gICAgICAgIGNvbnN0IG1hdGNoZWRWYXIgPSBtYXRjaFsxXS50cmltKCk7XG4gICAgICAgIHZhbHVlID0gaGFuZGxlRm9ybWF0KG1hdGNoZWRWYXIpO1xuICAgICAgICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGlmICh0eXBlb2YgbWlzc2luZ0ludGVycG9sYXRpb25IYW5kbGVyID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjb25zdCB0ZW1wID0gbWlzc2luZ0ludGVycG9sYXRpb25IYW5kbGVyKHN0ciwgbWF0Y2gsIG9wdGlvbnMpO1xuICAgICAgICAgICAgdmFsdWUgPSB0eXBlb2YgdGVtcCA9PT0gJ3N0cmluZycgPyB0ZW1wIDogJyc7XG4gICAgICAgICAgfSBlbHNlIGlmIChvcHRpb25zICYmIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvcHRpb25zLCBtYXRjaGVkVmFyKSkge1xuICAgICAgICAgICAgdmFsdWUgPSAnJzsgLy8gdW5kZWZpbmVkIGJlY29tZXMgZW1wdHkgc3RyaW5nXG4gICAgICAgICAgfSBlbHNlIGlmIChza2lwT25WYXJpYWJsZXMpIHtcbiAgICAgICAgICAgIHZhbHVlID0gbWF0Y2hbMF07XG4gICAgICAgICAgICBjb250aW51ZTsgLy8gdGhpcyBtYWtlcyBzdXJlIGl0IGNvbnRpbnVlcyB0byBkZXRlY3Qgb3RoZXJzXG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMubG9nZ2VyLndhcm4oYG1pc3NlZCB0byBwYXNzIGluIHZhcmlhYmxlICR7bWF0Y2hlZFZhcn0gZm9yIGludGVycG9sYXRpbmcgJHtzdHJ9YCk7XG4gICAgICAgICAgICB2YWx1ZSA9ICcnO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgdmFsdWUgIT09ICdzdHJpbmcnICYmICF0aGlzLnVzZVJhd1ZhbHVlVG9Fc2NhcGUpIHtcbiAgICAgICAgICB2YWx1ZSA9IHV0aWxzLm1ha2VTdHJpbmcodmFsdWUpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHNhZmVWYWx1ZSA9IHRvZG8uc2FmZVZhbHVlKHZhbHVlKTtcbiAgICAgICAgc3RyID0gc3RyLnJlcGxhY2UobWF0Y2hbMF0sIHNhZmVWYWx1ZSk7XG4gICAgICAgIGlmIChza2lwT25WYXJpYWJsZXMpIHtcbiAgICAgICAgICB0b2RvLnJlZ2V4Lmxhc3RJbmRleCArPSB2YWx1ZS5sZW5ndGg7XG4gICAgICAgICAgdG9kby5yZWdleC5sYXN0SW5kZXggLT0gbWF0Y2hbMF0ubGVuZ3RoO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRvZG8ucmVnZXgubGFzdEluZGV4ID0gMDtcbiAgICAgICAgfVxuICAgICAgICByZXBsYWNlcysrO1xuICAgICAgICBpZiAocmVwbGFjZXMgPj0gdGhpcy5tYXhSZXBsYWNlcykge1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHN0cjtcbiAgfVxuXG4gIG5lc3Qoc3RyLCBmYywgb3B0aW9ucyA9IHt9KSB7XG4gICAgbGV0IG1hdGNoO1xuICAgIGxldCB2YWx1ZTtcblxuICAgIGxldCBjbG9uZWRPcHRpb25zO1xuXG4gICAgLy8gaWYgdmFsdWUgaXMgc29tZXRoaW5nIGxpa2UgXCJteUtleVwiOiBcImxvcmVtICQoYW5vdGhlcktleSwgeyBcImNvdW50XCI6IHt7YVZhbHVlSW5PcHRpb25zfX0gfSlcIlxuICAgIGZ1bmN0aW9uIGhhbmRsZUhhc09wdGlvbnMoa2V5LCBpbmhlcml0ZWRPcHRpb25zKSB7XG4gICAgICBjb25zdCBzZXAgPSB0aGlzLm5lc3RpbmdPcHRpb25zU2VwYXJhdG9yO1xuICAgICAgaWYgKGtleS5pbmRleE9mKHNlcCkgPCAwKSByZXR1cm4ga2V5O1xuXG4gICAgICBjb25zdCBjID0ga2V5LnNwbGl0KG5ldyBSZWdFeHAoYCR7c2VwfVsgXSp7YCkpO1xuXG4gICAgICBsZXQgb3B0aW9uc1N0cmluZyA9IGB7JHtjWzFdfWA7XG4gICAgICBrZXkgPSBjWzBdO1xuICAgICAgb3B0aW9uc1N0cmluZyA9IHRoaXMuaW50ZXJwb2xhdGUob3B0aW9uc1N0cmluZywgY2xvbmVkT3B0aW9ucyk7XG4gICAgICBjb25zdCBtYXRjaGVkU2luZ2xlUXVvdGVzID0gb3B0aW9uc1N0cmluZy5tYXRjaCgvJy9nKTtcbiAgICAgIGNvbnN0IG1hdGNoZWREb3VibGVRdW90ZXMgPSBvcHRpb25zU3RyaW5nLm1hdGNoKC9cIi9nKTtcbiAgICAgIGlmIChcbiAgICAgICAgKG1hdGNoZWRTaW5nbGVRdW90ZXMgJiYgbWF0Y2hlZFNpbmdsZVF1b3Rlcy5sZW5ndGggJSAyID09PSAwICYmICFtYXRjaGVkRG91YmxlUXVvdGVzKSB8fFxuICAgICAgICBtYXRjaGVkRG91YmxlUXVvdGVzLmxlbmd0aCAlIDIgIT09IDBcbiAgICAgICkge1xuICAgICAgICBvcHRpb25zU3RyaW5nID0gb3B0aW9uc1N0cmluZy5yZXBsYWNlKC8nL2csICdcIicpO1xuICAgICAgfVxuXG4gICAgICB0cnkge1xuICAgICAgICBjbG9uZWRPcHRpb25zID0gSlNPTi5wYXJzZShvcHRpb25zU3RyaW5nKTtcblxuICAgICAgICBpZiAoaW5oZXJpdGVkT3B0aW9ucykgY2xvbmVkT3B0aW9ucyA9IHsgLi4uaW5oZXJpdGVkT3B0aW9ucywgLi4uY2xvbmVkT3B0aW9ucyB9O1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICB0aGlzLmxvZ2dlci53YXJuKGBmYWlsZWQgcGFyc2luZyBvcHRpb25zIHN0cmluZyBpbiBuZXN0aW5nIGZvciBrZXkgJHtrZXl9YCwgZSk7XG4gICAgICAgIHJldHVybiBgJHtrZXl9JHtzZXB9JHtvcHRpb25zU3RyaW5nfWA7XG4gICAgICB9XG5cbiAgICAgIC8vIGFzc2VydCB3ZSBkbyBub3QgZ2V0IGEgZW5kbGVzcyBsb29wIG9uIGludGVycG9sYXRpbmcgZGVmYXVsdFZhbHVlIGFnYWluIGFuZCBhZ2FpblxuICAgICAgZGVsZXRlIGNsb25lZE9wdGlvbnMuZGVmYXVsdFZhbHVlO1xuICAgICAgcmV0dXJuIGtleTtcbiAgICB9XG5cbiAgICAvLyByZWd1bGFyIGVzY2FwZSBvbiBkZW1hbmRcbiAgICB3aGlsZSAoKG1hdGNoID0gdGhpcy5uZXN0aW5nUmVnZXhwLmV4ZWMoc3RyKSkpIHtcbiAgICAgIGxldCBmb3JtYXR0ZXJzID0gW107XG5cbiAgICAgIGNsb25lZE9wdGlvbnMgPSB7IC4uLm9wdGlvbnMgfTtcbiAgICAgIGNsb25lZE9wdGlvbnMgPVxuICAgICAgICBjbG9uZWRPcHRpb25zLnJlcGxhY2UgJiYgdHlwZW9mIGNsb25lZE9wdGlvbnMucmVwbGFjZSAhPT0gJ3N0cmluZydcbiAgICAgICAgICA/IGNsb25lZE9wdGlvbnMucmVwbGFjZVxuICAgICAgICAgIDogY2xvbmVkT3B0aW9ucztcbiAgICAgIGNsb25lZE9wdGlvbnMuYXBwbHlQb3N0UHJvY2Vzc29yID0gZmFsc2U7IC8vIGF2b2lkIHBvc3QgcHJvY2Vzc2luZyBvbiBuZXN0ZWQgbG9va3VwXG4gICAgICBkZWxldGUgY2xvbmVkT3B0aW9ucy5kZWZhdWx0VmFsdWU7IC8vIGFzc2VydCB3ZSBkbyBub3QgZ2V0IGEgZW5kbGVzcyBsb29wIG9uIGludGVycG9sYXRpbmcgZGVmYXVsdFZhbHVlIGFnYWluIGFuZCBhZ2FpblxuXG4gICAgICAvKipcbiAgICAgICAqIElmIHRoZXJlIGlzIG1vcmUgdGhhbiBvbmUgcGFyYW1ldGVyIChjb250YWlucyB0aGUgZm9ybWF0IHNlcGFyYXRvcikuIEUuZy46XG4gICAgICAgKiAgIC0gdChhLCBiKVxuICAgICAgICogICAtIHQoYSwgYiwgYylcbiAgICAgICAqXG4gICAgICAgKiBBbmQgdGhvc2UgcGFyYW1ldGVycyBhcmUgbm90IGR5bmFtaWMgdmFsdWVzIChwYXJhbWV0ZXJzIGRvIG5vdCBpbmNsdWRlIGN1cmx5IGJyYWNlcykuIEUuZy46XG4gICAgICAgKiAgIC0gTm90IHQoYSwgeyBcImtleVwiOiBcInt7dmFyaWFibGV9fVwiIH0pXG4gICAgICAgKiAgIC0gTm90IHQoYSwgYiwge1wia2V5QVwiOiBcInZhbHVlQVwiLCBcImtleUJcIjogXCJ2YWx1ZUJcIn0pXG4gICAgICAgKi9cbiAgICAgIGxldCBkb1JlZHVjZSA9IGZhbHNlO1xuICAgICAgaWYgKG1hdGNoWzBdLmluZGV4T2YodGhpcy5mb3JtYXRTZXBhcmF0b3IpICE9PSAtMSAmJiAhL3suKn0vLnRlc3QobWF0Y2hbMV0pKSB7XG4gICAgICAgIGNvbnN0IHIgPSBtYXRjaFsxXS5zcGxpdCh0aGlzLmZvcm1hdFNlcGFyYXRvcikubWFwKChlbGVtKSA9PiBlbGVtLnRyaW0oKSk7XG4gICAgICAgIG1hdGNoWzFdID0gci5zaGlmdCgpO1xuICAgICAgICBmb3JtYXR0ZXJzID0gcjtcbiAgICAgICAgZG9SZWR1Y2UgPSB0cnVlO1xuICAgICAgfVxuXG4gICAgICB2YWx1ZSA9IGZjKGhhbmRsZUhhc09wdGlvbnMuY2FsbCh0aGlzLCBtYXRjaFsxXS50cmltKCksIGNsb25lZE9wdGlvbnMpLCBjbG9uZWRPcHRpb25zKTtcblxuICAgICAgLy8gaXMgb25seSB0aGUgbmVzdGluZyBrZXkgKGtleTEgPSAnJChrZXkyKScpIHJldHVybiB0aGUgdmFsdWUgd2l0aG91dCBzdHJpbmdpZnlcbiAgICAgIGlmICh2YWx1ZSAmJiBtYXRjaFswXSA9PT0gc3RyICYmIHR5cGVvZiB2YWx1ZSAhPT0gJ3N0cmluZycpIHJldHVybiB2YWx1ZTtcblxuICAgICAgLy8gbm8gc3RyaW5nIHRvIGluY2x1ZGUgb3IgZW1wdHlcbiAgICAgIGlmICh0eXBlb2YgdmFsdWUgIT09ICdzdHJpbmcnKSB2YWx1ZSA9IHV0aWxzLm1ha2VTdHJpbmcodmFsdWUpO1xuICAgICAgaWYgKCF2YWx1ZSkge1xuICAgICAgICB0aGlzLmxvZ2dlci53YXJuKGBtaXNzZWQgdG8gcmVzb2x2ZSAke21hdGNoWzFdfSBmb3IgbmVzdGluZyAke3N0cn1gKTtcbiAgICAgICAgdmFsdWUgPSAnJztcbiAgICAgIH1cblxuICAgICAgaWYgKGRvUmVkdWNlKSB7XG4gICAgICAgIHZhbHVlID0gZm9ybWF0dGVycy5yZWR1Y2UoXG4gICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWxvb3AtZnVuY1xuICAgICAgICAgICh2LCBmKSA9PlxuICAgICAgICAgICAgdGhpcy5mb3JtYXQodiwgZiwgb3B0aW9ucy5sbmcsIHsgLi4ub3B0aW9ucywgaW50ZXJwb2xhdGlvbmtleTogbWF0Y2hbMV0udHJpbSgpIH0pLFxuICAgICAgICAgIHZhbHVlLnRyaW0oKSxcbiAgICAgICAgKTtcbiAgICAgIH1cblxuICAgICAgLy8gTmVzdGVkIGtleXMgc2hvdWxkIG5vdCBiZSBlc2NhcGVkIGJ5IGRlZmF1bHQgIzg1NFxuICAgICAgLy8gdmFsdWUgPSB0aGlzLmVzY2FwZVZhbHVlID8gcmVnZXhTYWZlKHV0aWxzLmVzY2FwZSh2YWx1ZSkpIDogcmVnZXhTYWZlKHZhbHVlKTtcbiAgICAgIHN0ciA9IHN0ci5yZXBsYWNlKG1hdGNoWzBdLCB2YWx1ZSk7XG4gICAgICB0aGlzLnJlZ2V4cC5sYXN0SW5kZXggPSAwO1xuICAgIH1cbiAgICByZXR1cm4gc3RyO1xuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IEludGVycG9sYXRvcjtcbiIsImltcG9ydCBiYXNlTG9nZ2VyIGZyb20gJy4vbG9nZ2VyLmpzJztcbmltcG9ydCB7IGdldENsZWFuZWRDb2RlIH0gZnJvbSAnLi91dGlscy5qcyc7XG5cbmZ1bmN0aW9uIHBhcnNlRm9ybWF0U3RyKGZvcm1hdFN0cikge1xuICBsZXQgZm9ybWF0TmFtZSA9IGZvcm1hdFN0ci50b0xvd2VyQ2FzZSgpLnRyaW0oKTtcbiAgY29uc3QgZm9ybWF0T3B0aW9ucyA9IHt9O1xuICBpZiAoZm9ybWF0U3RyLmluZGV4T2YoJygnKSA+IC0xKSB7XG4gICAgY29uc3QgcCA9IGZvcm1hdFN0ci5zcGxpdCgnKCcpO1xuICAgIGZvcm1hdE5hbWUgPSBwWzBdLnRvTG93ZXJDYXNlKCkudHJpbSgpO1xuXG4gICAgY29uc3Qgb3B0U3RyID0gcFsxXS5zdWJzdHJpbmcoMCwgcFsxXS5sZW5ndGggLSAxKTtcblxuICAgIC8vIGV4dHJhIGZvciBjdXJyZW5jeVxuICAgIGlmIChmb3JtYXROYW1lID09PSAnY3VycmVuY3knICYmIG9wdFN0ci5pbmRleE9mKCc6JykgPCAwKSB7XG4gICAgICBpZiAoIWZvcm1hdE9wdGlvbnMuY3VycmVuY3kpIGZvcm1hdE9wdGlvbnMuY3VycmVuY3kgPSBvcHRTdHIudHJpbSgpO1xuICAgIH0gZWxzZSBpZiAoZm9ybWF0TmFtZSA9PT0gJ3JlbGF0aXZldGltZScgJiYgb3B0U3RyLmluZGV4T2YoJzonKSA8IDApIHtcbiAgICAgIGlmICghZm9ybWF0T3B0aW9ucy5yYW5nZSkgZm9ybWF0T3B0aW9ucy5yYW5nZSA9IG9wdFN0ci50cmltKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IG9wdHMgPSBvcHRTdHIuc3BsaXQoJzsnKTtcblxuICAgICAgb3B0cy5mb3JFYWNoKChvcHQpID0+IHtcbiAgICAgICAgaWYgKCFvcHQpIHJldHVybjtcbiAgICAgICAgY29uc3QgW2tleSwgLi4ucmVzdF0gPSBvcHQuc3BsaXQoJzonKTtcbiAgICAgICAgY29uc3QgdmFsID0gcmVzdFxuICAgICAgICAgIC5qb2luKCc6JylcbiAgICAgICAgICAudHJpbSgpXG4gICAgICAgICAgLnJlcGxhY2UoL14nK3wnKyQvZywgJycpOyAvLyB0cmltIGFuZCByZXBsYWNlICcnXG5cbiAgICAgICAgaWYgKCFmb3JtYXRPcHRpb25zW2tleS50cmltKCldKSBmb3JtYXRPcHRpb25zW2tleS50cmltKCldID0gdmFsO1xuICAgICAgICBpZiAodmFsID09PSAnZmFsc2UnKSBmb3JtYXRPcHRpb25zW2tleS50cmltKCldID0gZmFsc2U7XG4gICAgICAgIGlmICh2YWwgPT09ICd0cnVlJykgZm9ybWF0T3B0aW9uc1trZXkudHJpbSgpXSA9IHRydWU7XG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1yZXN0cmljdGVkLWdsb2JhbHNcbiAgICAgICAgaWYgKCFpc05hTih2YWwpKSBmb3JtYXRPcHRpb25zW2tleS50cmltKCldID0gcGFyc2VJbnQodmFsLCAxMCk7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGZvcm1hdE5hbWUsXG4gICAgZm9ybWF0T3B0aW9ucyxcbiAgfTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlQ2FjaGVkRm9ybWF0dGVyKGZuKSB7XG4gIGNvbnN0IGNhY2hlID0ge307XG4gIHJldHVybiBmdW5jdGlvbiBpbnZva2VGb3JtYXR0ZXIodmFsLCBsbmcsIG9wdGlvbnMpIHtcbiAgICBjb25zdCBrZXkgPSBsbmcgKyBKU09OLnN0cmluZ2lmeShvcHRpb25zKTtcbiAgICBsZXQgZm9ybWF0dGVyID0gY2FjaGVba2V5XTtcbiAgICBpZiAoIWZvcm1hdHRlcikge1xuICAgICAgZm9ybWF0dGVyID0gZm4oZ2V0Q2xlYW5lZENvZGUobG5nKSwgb3B0aW9ucyk7XG4gICAgICBjYWNoZVtrZXldID0gZm9ybWF0dGVyO1xuICAgIH1cbiAgICByZXR1cm4gZm9ybWF0dGVyKHZhbCk7XG4gIH07XG59XG5cbmNsYXNzIEZvcm1hdHRlciB7XG4gIGNvbnN0cnVjdG9yKG9wdGlvbnMgPSB7fSkge1xuICAgIHRoaXMubG9nZ2VyID0gYmFzZUxvZ2dlci5jcmVhdGUoJ2Zvcm1hdHRlcicpO1xuXG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcbiAgICB0aGlzLmZvcm1hdHMgPSB7XG4gICAgICBudW1iZXI6IGNyZWF0ZUNhY2hlZEZvcm1hdHRlcigobG5nLCBvcHQpID0+IHtcbiAgICAgICAgY29uc3QgZm9ybWF0dGVyID0gbmV3IEludGwuTnVtYmVyRm9ybWF0KGxuZywgeyAuLi5vcHQgfSk7XG4gICAgICAgIHJldHVybiAodmFsKSA9PiBmb3JtYXR0ZXIuZm9ybWF0KHZhbCk7XG4gICAgICB9KSxcbiAgICAgIGN1cnJlbmN5OiBjcmVhdGVDYWNoZWRGb3JtYXR0ZXIoKGxuZywgb3B0KSA9PiB7XG4gICAgICAgIGNvbnN0IGZvcm1hdHRlciA9IG5ldyBJbnRsLk51bWJlckZvcm1hdChsbmcsIHsgLi4ub3B0LCBzdHlsZTogJ2N1cnJlbmN5JyB9KTtcbiAgICAgICAgcmV0dXJuICh2YWwpID0+IGZvcm1hdHRlci5mb3JtYXQodmFsKTtcbiAgICAgIH0pLFxuICAgICAgZGF0ZXRpbWU6IGNyZWF0ZUNhY2hlZEZvcm1hdHRlcigobG5nLCBvcHQpID0+IHtcbiAgICAgICAgY29uc3QgZm9ybWF0dGVyID0gbmV3IEludGwuRGF0ZVRpbWVGb3JtYXQobG5nLCB7IC4uLm9wdCB9KTtcbiAgICAgICAgcmV0dXJuICh2YWwpID0+IGZvcm1hdHRlci5mb3JtYXQodmFsKTtcbiAgICAgIH0pLFxuICAgICAgcmVsYXRpdmV0aW1lOiBjcmVhdGVDYWNoZWRGb3JtYXR0ZXIoKGxuZywgb3B0KSA9PiB7XG4gICAgICAgIGNvbnN0IGZvcm1hdHRlciA9IG5ldyBJbnRsLlJlbGF0aXZlVGltZUZvcm1hdChsbmcsIHsgLi4ub3B0IH0pO1xuICAgICAgICByZXR1cm4gKHZhbCkgPT4gZm9ybWF0dGVyLmZvcm1hdCh2YWwsIG9wdC5yYW5nZSB8fCAnZGF5Jyk7XG4gICAgICB9KSxcbiAgICAgIGxpc3Q6IGNyZWF0ZUNhY2hlZEZvcm1hdHRlcigobG5nLCBvcHQpID0+IHtcbiAgICAgICAgY29uc3QgZm9ybWF0dGVyID0gbmV3IEludGwuTGlzdEZvcm1hdChsbmcsIHsgLi4ub3B0IH0pO1xuICAgICAgICByZXR1cm4gKHZhbCkgPT4gZm9ybWF0dGVyLmZvcm1hdCh2YWwpO1xuICAgICAgfSksXG4gICAgfTtcbiAgICB0aGlzLmluaXQob3B0aW9ucyk7XG4gIH1cblxuICAvKiBlc2xpbnQgbm8tcGFyYW0tcmVhc3NpZ246IDAgKi9cbiAgaW5pdChzZXJ2aWNlcywgb3B0aW9ucyA9IHsgaW50ZXJwb2xhdGlvbjoge30gfSkge1xuICAgIGNvbnN0IGlPcHRzID0gb3B0aW9ucy5pbnRlcnBvbGF0aW9uO1xuXG4gICAgdGhpcy5mb3JtYXRTZXBhcmF0b3IgPSBpT3B0cy5mb3JtYXRTZXBhcmF0b3JcbiAgICAgID8gaU9wdHMuZm9ybWF0U2VwYXJhdG9yXG4gICAgICA6IGlPcHRzLmZvcm1hdFNlcGFyYXRvciB8fCAnLCc7XG4gIH1cblxuICBhZGQobmFtZSwgZmMpIHtcbiAgICB0aGlzLmZvcm1hdHNbbmFtZS50b0xvd2VyQ2FzZSgpLnRyaW0oKV0gPSBmYztcbiAgfVxuXG4gIGFkZENhY2hlZChuYW1lLCBmYykge1xuICAgIHRoaXMuZm9ybWF0c1tuYW1lLnRvTG93ZXJDYXNlKCkudHJpbSgpXSA9IGNyZWF0ZUNhY2hlZEZvcm1hdHRlcihmYyk7XG4gIH1cblxuICBmb3JtYXQodmFsdWUsIGZvcm1hdCwgbG5nLCBvcHRpb25zID0ge30pIHtcbiAgICBjb25zdCBmb3JtYXRzID0gZm9ybWF0LnNwbGl0KHRoaXMuZm9ybWF0U2VwYXJhdG9yKTtcblxuICAgIGNvbnN0IHJlc3VsdCA9IGZvcm1hdHMucmVkdWNlKChtZW0sIGYpID0+IHtcbiAgICAgIGNvbnN0IHsgZm9ybWF0TmFtZSwgZm9ybWF0T3B0aW9ucyB9ID0gcGFyc2VGb3JtYXRTdHIoZik7XG5cbiAgICAgIGlmICh0aGlzLmZvcm1hdHNbZm9ybWF0TmFtZV0pIHtcbiAgICAgICAgbGV0IGZvcm1hdHRlZCA9IG1lbTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAvLyBvcHRpb25zIHBhc3NlZCBleHBsaWNpdCBmb3IgdGhhdCBmb3JtYXR0ZWQgdmFsdWVcbiAgICAgICAgICBjb25zdCB2YWxPcHRpb25zID1cbiAgICAgICAgICAgIChvcHRpb25zICYmIG9wdGlvbnMuZm9ybWF0UGFyYW1zICYmIG9wdGlvbnMuZm9ybWF0UGFyYW1zW29wdGlvbnMuaW50ZXJwb2xhdGlvbmtleV0pIHx8XG4gICAgICAgICAgICB7fTtcblxuICAgICAgICAgIC8vIGxhbmd1YWdlXG4gICAgICAgICAgY29uc3QgbCA9IHZhbE9wdGlvbnMubG9jYWxlIHx8IHZhbE9wdGlvbnMubG5nIHx8IG9wdGlvbnMubG9jYWxlIHx8IG9wdGlvbnMubG5nIHx8IGxuZztcblxuICAgICAgICAgIGZvcm1hdHRlZCA9IHRoaXMuZm9ybWF0c1tmb3JtYXROYW1lXShtZW0sIGwsIHtcbiAgICAgICAgICAgIC4uLmZvcm1hdE9wdGlvbnMsXG4gICAgICAgICAgICAuLi5vcHRpb25zLFxuICAgICAgICAgICAgLi4udmFsT3B0aW9ucyxcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICB0aGlzLmxvZ2dlci53YXJuKGVycm9yKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZm9ybWF0dGVkO1xuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tZWxzZS1yZXR1cm5cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMubG9nZ2VyLndhcm4oYHRoZXJlIHdhcyBubyBmb3JtYXQgZnVuY3Rpb24gZm9yICR7Zm9ybWF0TmFtZX1gKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBtZW07XG4gICAgfSwgdmFsdWUpO1xuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBGb3JtYXR0ZXI7XG4iLCJpbXBvcnQgKiBhcyB1dGlscyBmcm9tICcuL3V0aWxzLmpzJztcbmltcG9ydCBiYXNlTG9nZ2VyIGZyb20gJy4vbG9nZ2VyLmpzJztcbmltcG9ydCBFdmVudEVtaXR0ZXIgZnJvbSAnLi9FdmVudEVtaXR0ZXIuanMnO1xuXG5mdW5jdGlvbiByZW1vdmVQZW5kaW5nKHEsIG5hbWUpIHtcbiAgaWYgKHEucGVuZGluZ1tuYW1lXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgZGVsZXRlIHEucGVuZGluZ1tuYW1lXTtcbiAgICBxLnBlbmRpbmdDb3VudC0tO1xuICB9XG59XG5cbmNsYXNzIENvbm5lY3RvciBleHRlbmRzIEV2ZW50RW1pdHRlciB7XG4gIGNvbnN0cnVjdG9yKGJhY2tlbmQsIHN0b3JlLCBzZXJ2aWNlcywgb3B0aW9ucyA9IHt9KSB7XG4gICAgc3VwZXIoKTtcblxuICAgIHRoaXMuYmFja2VuZCA9IGJhY2tlbmQ7XG4gICAgdGhpcy5zdG9yZSA9IHN0b3JlO1xuICAgIHRoaXMuc2VydmljZXMgPSBzZXJ2aWNlcztcbiAgICB0aGlzLmxhbmd1YWdlVXRpbHMgPSBzZXJ2aWNlcy5sYW5ndWFnZVV0aWxzO1xuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG4gICAgdGhpcy5sb2dnZXIgPSBiYXNlTG9nZ2VyLmNyZWF0ZSgnYmFja2VuZENvbm5lY3RvcicpO1xuXG4gICAgdGhpcy53YWl0aW5nUmVhZHMgPSBbXTtcbiAgICB0aGlzLm1heFBhcmFsbGVsUmVhZHMgPSBvcHRpb25zLm1heFBhcmFsbGVsUmVhZHMgfHwgMTA7XG4gICAgdGhpcy5yZWFkaW5nQ2FsbHMgPSAwO1xuXG4gICAgdGhpcy5tYXhSZXRyaWVzID0gb3B0aW9ucy5tYXhSZXRyaWVzID49IDAgPyBvcHRpb25zLm1heFJldHJpZXMgOiA1O1xuICAgIHRoaXMucmV0cnlUaW1lb3V0ID0gb3B0aW9ucy5yZXRyeVRpbWVvdXQgPj0gMSA/IG9wdGlvbnMucmV0cnlUaW1lb3V0IDogMzUwO1xuXG4gICAgdGhpcy5zdGF0ZSA9IHt9O1xuICAgIHRoaXMucXVldWUgPSBbXTtcblxuICAgIGlmICh0aGlzLmJhY2tlbmQgJiYgdGhpcy5iYWNrZW5kLmluaXQpIHtcbiAgICAgIHRoaXMuYmFja2VuZC5pbml0KHNlcnZpY2VzLCBvcHRpb25zLmJhY2tlbmQsIG9wdGlvbnMpO1xuICAgIH1cbiAgfVxuXG4gIHF1ZXVlTG9hZChsYW5ndWFnZXMsIG5hbWVzcGFjZXMsIG9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gICAgLy8gZmluZCB3aGF0IG5lZWRzIHRvIGJlIGxvYWRlZFxuICAgIGNvbnN0IHRvTG9hZCA9IHt9O1xuICAgIGNvbnN0IHBlbmRpbmcgPSB7fTtcbiAgICBjb25zdCB0b0xvYWRMYW5ndWFnZXMgPSB7fTtcbiAgICBjb25zdCB0b0xvYWROYW1lc3BhY2VzID0ge307XG5cbiAgICBsYW5ndWFnZXMuZm9yRWFjaCgobG5nKSA9PiB7XG4gICAgICBsZXQgaGFzQWxsTmFtZXNwYWNlcyA9IHRydWU7XG5cbiAgICAgIG5hbWVzcGFjZXMuZm9yRWFjaCgobnMpID0+IHtcbiAgICAgICAgY29uc3QgbmFtZSA9IGAke2xuZ318JHtuc31gO1xuXG4gICAgICAgIGlmICghb3B0aW9ucy5yZWxvYWQgJiYgdGhpcy5zdG9yZS5oYXNSZXNvdXJjZUJ1bmRsZShsbmcsIG5zKSkge1xuICAgICAgICAgIHRoaXMuc3RhdGVbbmFtZV0gPSAyOyAvLyBsb2FkZWRcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLnN0YXRlW25hbWVdIDwgMCkge1xuICAgICAgICAgIC8vIG5vdGhpbmcgdG8gZG8gZm9yIGVyclxuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuc3RhdGVbbmFtZV0gPT09IDEpIHtcbiAgICAgICAgICBpZiAocGVuZGluZ1tuYW1lXSA9PT0gdW5kZWZpbmVkKSBwZW5kaW5nW25hbWVdID0gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLnN0YXRlW25hbWVdID0gMTsgLy8gcGVuZGluZ1xuXG4gICAgICAgICAgaGFzQWxsTmFtZXNwYWNlcyA9IGZhbHNlO1xuXG4gICAgICAgICAgaWYgKHBlbmRpbmdbbmFtZV0gPT09IHVuZGVmaW5lZCkgcGVuZGluZ1tuYW1lXSA9IHRydWU7XG4gICAgICAgICAgaWYgKHRvTG9hZFtuYW1lXSA9PT0gdW5kZWZpbmVkKSB0b0xvYWRbbmFtZV0gPSB0cnVlO1xuICAgICAgICAgIGlmICh0b0xvYWROYW1lc3BhY2VzW25zXSA9PT0gdW5kZWZpbmVkKSB0b0xvYWROYW1lc3BhY2VzW25zXSA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICBpZiAoIWhhc0FsbE5hbWVzcGFjZXMpIHRvTG9hZExhbmd1YWdlc1tsbmddID0gdHJ1ZTtcbiAgICB9KTtcblxuICAgIGlmIChPYmplY3Qua2V5cyh0b0xvYWQpLmxlbmd0aCB8fCBPYmplY3Qua2V5cyhwZW5kaW5nKS5sZW5ndGgpIHtcbiAgICAgIHRoaXMucXVldWUucHVzaCh7XG4gICAgICAgIHBlbmRpbmcsXG4gICAgICAgIHBlbmRpbmdDb3VudDogT2JqZWN0LmtleXMocGVuZGluZykubGVuZ3RoLFxuICAgICAgICBsb2FkZWQ6IHt9LFxuICAgICAgICBlcnJvcnM6IFtdLFxuICAgICAgICBjYWxsYmFjayxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICB0b0xvYWQ6IE9iamVjdC5rZXlzKHRvTG9hZCksXG4gICAgICBwZW5kaW5nOiBPYmplY3Qua2V5cyhwZW5kaW5nKSxcbiAgICAgIHRvTG9hZExhbmd1YWdlczogT2JqZWN0LmtleXModG9Mb2FkTGFuZ3VhZ2VzKSxcbiAgICAgIHRvTG9hZE5hbWVzcGFjZXM6IE9iamVjdC5rZXlzKHRvTG9hZE5hbWVzcGFjZXMpLFxuICAgIH07XG4gIH1cblxuICBsb2FkZWQobmFtZSwgZXJyLCBkYXRhKSB7XG4gICAgY29uc3QgcyA9IG5hbWUuc3BsaXQoJ3wnKTtcbiAgICBjb25zdCBsbmcgPSBzWzBdO1xuICAgIGNvbnN0IG5zID0gc1sxXTtcblxuICAgIGlmIChlcnIpIHRoaXMuZW1pdCgnZmFpbGVkTG9hZGluZycsIGxuZywgbnMsIGVycik7XG5cbiAgICBpZiAoZGF0YSkge1xuICAgICAgdGhpcy5zdG9yZS5hZGRSZXNvdXJjZUJ1bmRsZShsbmcsIG5zLCBkYXRhLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgeyBza2lwQ29weTogdHJ1ZSB9KTtcbiAgICB9XG5cbiAgICAvLyBzZXQgbG9hZGVkXG4gICAgdGhpcy5zdGF0ZVtuYW1lXSA9IGVyciA/IC0xIDogMjtcblxuICAgIC8vIGNvbnNvbGlkYXRlZCBsb2FkaW5nIGRvbmUgaW4gdGhpcyBydW4gLSBvbmx5IGVtaXQgb25jZSBmb3IgYSBsb2FkZWQgbmFtZXNwYWNlXG4gICAgY29uc3QgbG9hZGVkID0ge307XG5cbiAgICAvLyBjYWxsYmFjayBpZiByZWFkeVxuICAgIHRoaXMucXVldWUuZm9yRWFjaCgocSkgPT4ge1xuICAgICAgdXRpbHMucHVzaFBhdGgocS5sb2FkZWQsIFtsbmddLCBucyk7XG4gICAgICByZW1vdmVQZW5kaW5nKHEsIG5hbWUpO1xuXG4gICAgICBpZiAoZXJyKSBxLmVycm9ycy5wdXNoKGVycik7XG5cbiAgICAgIGlmIChxLnBlbmRpbmdDb3VudCA9PT0gMCAmJiAhcS5kb25lKSB7XG4gICAgICAgIC8vIG9ubHkgZG8gb25jZSBwZXIgbG9hZGVkIC0+IHRoaXMuZW1pdCgnbG9hZGVkJywgcS5sb2FkZWQpO1xuICAgICAgICBPYmplY3Qua2V5cyhxLmxvYWRlZCkuZm9yRWFjaCgobCkgPT4ge1xuICAgICAgICAgIGlmICghbG9hZGVkW2xdKSBsb2FkZWRbbF0gPSB7fTtcbiAgICAgICAgICBjb25zdCBsb2FkZWRLZXlzID0gcS5sb2FkZWRbbF07XG4gICAgICAgICAgaWYgKGxvYWRlZEtleXMubGVuZ3RoKSB7XG4gICAgICAgICAgICBsb2FkZWRLZXlzLmZvckVhY2goKG4pID0+IHtcbiAgICAgICAgICAgICAgaWYgKGxvYWRlZFtsXVtuXSA9PT0gdW5kZWZpbmVkKSBsb2FkZWRbbF1bbl0gPSB0cnVlO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvKiBlc2xpbnQgbm8tcGFyYW0tcmVhc3NpZ246IDAgKi9cbiAgICAgICAgcS5kb25lID0gdHJ1ZTtcbiAgICAgICAgaWYgKHEuZXJyb3JzLmxlbmd0aCkge1xuICAgICAgICAgIHEuY2FsbGJhY2socS5lcnJvcnMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHEuY2FsbGJhY2soKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gZW1pdCBjb25zb2xpZGF0ZWQgbG9hZGVkIGV2ZW50XG4gICAgdGhpcy5lbWl0KCdsb2FkZWQnLCBsb2FkZWQpO1xuXG4gICAgLy8gcmVtb3ZlIGRvbmUgbG9hZCByZXF1ZXN0c1xuICAgIHRoaXMucXVldWUgPSB0aGlzLnF1ZXVlLmZpbHRlcigocSkgPT4gIXEuZG9uZSk7XG4gIH1cblxuICByZWFkKGxuZywgbnMsIGZjTmFtZSwgdHJpZWQgPSAwLCB3YWl0ID0gdGhpcy5yZXRyeVRpbWVvdXQsIGNhbGxiYWNrKSB7XG4gICAgaWYgKCFsbmcubGVuZ3RoKSByZXR1cm4gY2FsbGJhY2sobnVsbCwge30pOyAvLyBub3RpbmcgdG8gbG9hZFxuXG4gICAgLy8gTGltaXQgcGFyYWxsZWxpc20gb2YgY2FsbHMgdG8gYmFja2VuZFxuICAgIC8vIFRoaXMgaXMgbmVlZGVkIHRvIHByZXZlbnQgdHJ5aW5nIHRvIG9wZW4gdGhvdXNhbmRzIG9mXG4gICAgLy8gc29ja2V0cyBvciBmaWxlIGRlc2NyaXB0b3JzLCB3aGljaCBjYW4gY2F1c2UgZmFpbHVyZXNcbiAgICAvLyBhbmQgYWN0dWFsbHkgbWFrZSB0aGUgZW50aXJlIHByb2Nlc3MgdGFrZSBsb25nZXIuXG4gICAgaWYgKHRoaXMucmVhZGluZ0NhbGxzID49IHRoaXMubWF4UGFyYWxsZWxSZWFkcykge1xuICAgICAgdGhpcy53YWl0aW5nUmVhZHMucHVzaCh7IGxuZywgbnMsIGZjTmFtZSwgdHJpZWQsIHdhaXQsIGNhbGxiYWNrIH0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLnJlYWRpbmdDYWxscysrO1xuXG4gICAgY29uc3QgcmVzb2x2ZXIgPSAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICB0aGlzLnJlYWRpbmdDYWxscy0tO1xuICAgICAgaWYgKHRoaXMud2FpdGluZ1JlYWRzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgY29uc3QgbmV4dCA9IHRoaXMud2FpdGluZ1JlYWRzLnNoaWZ0KCk7XG4gICAgICAgIHRoaXMucmVhZChuZXh0LmxuZywgbmV4dC5ucywgbmV4dC5mY05hbWUsIG5leHQudHJpZWQsIG5leHQud2FpdCwgbmV4dC5jYWxsYmFjayk7XG4gICAgICB9XG4gICAgICBpZiAoZXJyICYmIGRhdGEgLyogPSByZXRyeUZsYWcgKi8gJiYgdHJpZWQgPCB0aGlzLm1heFJldHJpZXMpIHtcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgdGhpcy5yZWFkLmNhbGwodGhpcywgbG5nLCBucywgZmNOYW1lLCB0cmllZCArIDEsIHdhaXQgKiAyLCBjYWxsYmFjayk7XG4gICAgICAgIH0sIHdhaXQpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjYWxsYmFjayhlcnIsIGRhdGEpO1xuICAgIH07XG5cbiAgICBjb25zdCBmYyA9IHRoaXMuYmFja2VuZFtmY05hbWVdLmJpbmQodGhpcy5iYWNrZW5kKTtcbiAgICBpZiAoZmMubGVuZ3RoID09PSAyKSB7XG4gICAgICAvLyBubyBjYWxsYmFja1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgciA9IGZjKGxuZywgbnMpO1xuICAgICAgICBpZiAociAmJiB0eXBlb2Ygci50aGVuID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgLy8gcHJvbWlzZVxuICAgICAgICAgIHIudGhlbigoZGF0YSkgPT4gcmVzb2x2ZXIobnVsbCwgZGF0YSkpLmNhdGNoKHJlc29sdmVyKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBzeW5jXG4gICAgICAgICAgcmVzb2x2ZXIobnVsbCwgcik7XG4gICAgICAgIH1cbiAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICByZXNvbHZlcihlcnIpO1xuICAgICAgfVxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIG5vcm1hbCB3aXRoIGNhbGxiYWNrXG4gICAgcmV0dXJuIGZjKGxuZywgbnMsIHJlc29sdmVyKTtcbiAgfVxuXG4gIC8qIGVzbGludCBjb25zaXN0ZW50LXJldHVybjogMCAqL1xuICBwcmVwYXJlTG9hZGluZyhsYW5ndWFnZXMsIG5hbWVzcGFjZXMsIG9wdGlvbnMgPSB7fSwgY2FsbGJhY2spIHtcbiAgICBpZiAoIXRoaXMuYmFja2VuZCkge1xuICAgICAgdGhpcy5sb2dnZXIud2FybignTm8gYmFja2VuZCB3YXMgYWRkZWQgdmlhIGkxOG5leHQudXNlLiBXaWxsIG5vdCBsb2FkIHJlc291cmNlcy4nKTtcbiAgICAgIHJldHVybiBjYWxsYmFjayAmJiBjYWxsYmFjaygpO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2YgbGFuZ3VhZ2VzID09PSAnc3RyaW5nJykgbGFuZ3VhZ2VzID0gdGhpcy5sYW5ndWFnZVV0aWxzLnRvUmVzb2x2ZUhpZXJhcmNoeShsYW5ndWFnZXMpO1xuICAgIGlmICh0eXBlb2YgbmFtZXNwYWNlcyA9PT0gJ3N0cmluZycpIG5hbWVzcGFjZXMgPSBbbmFtZXNwYWNlc107XG5cbiAgICBjb25zdCB0b0xvYWQgPSB0aGlzLnF1ZXVlTG9hZChsYW5ndWFnZXMsIG5hbWVzcGFjZXMsIG9wdGlvbnMsIGNhbGxiYWNrKTtcbiAgICBpZiAoIXRvTG9hZC50b0xvYWQubGVuZ3RoKSB7XG4gICAgICBpZiAoIXRvTG9hZC5wZW5kaW5nLmxlbmd0aCkgY2FsbGJhY2soKTsgLy8gbm90aGluZyB0byBsb2FkIGFuZCBubyBwZW5kaW5ncy4uLmNhbGxiYWNrIG5vd1xuICAgICAgcmV0dXJuIG51bGw7IC8vIHBlbmRpbmdzIHdpbGwgdHJpZ2dlciBjYWxsYmFja1xuICAgIH1cblxuICAgIHRvTG9hZC50b0xvYWQuZm9yRWFjaCgobmFtZSkgPT4ge1xuICAgICAgdGhpcy5sb2FkT25lKG5hbWUpO1xuICAgIH0pO1xuICB9XG5cbiAgbG9hZChsYW5ndWFnZXMsIG5hbWVzcGFjZXMsIGNhbGxiYWNrKSB7XG4gICAgdGhpcy5wcmVwYXJlTG9hZGluZyhsYW5ndWFnZXMsIG5hbWVzcGFjZXMsIHt9LCBjYWxsYmFjayk7XG4gIH1cblxuICByZWxvYWQobGFuZ3VhZ2VzLCBuYW1lc3BhY2VzLCBjYWxsYmFjaykge1xuICAgIHRoaXMucHJlcGFyZUxvYWRpbmcobGFuZ3VhZ2VzLCBuYW1lc3BhY2VzLCB7IHJlbG9hZDogdHJ1ZSB9LCBjYWxsYmFjayk7XG4gIH1cblxuICBsb2FkT25lKG5hbWUsIHByZWZpeCA9ICcnKSB7XG4gICAgY29uc3QgcyA9IG5hbWUuc3BsaXQoJ3wnKTtcbiAgICBjb25zdCBsbmcgPSBzWzBdO1xuICAgIGNvbnN0IG5zID0gc1sxXTtcblxuICAgIHRoaXMucmVhZChsbmcsIG5zLCAncmVhZCcsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICBpZiAoZXJyKSB0aGlzLmxvZ2dlci53YXJuKGAke3ByZWZpeH1sb2FkaW5nIG5hbWVzcGFjZSAke25zfSBmb3IgbGFuZ3VhZ2UgJHtsbmd9IGZhaWxlZGAsIGVycik7XG4gICAgICBpZiAoIWVyciAmJiBkYXRhKVxuICAgICAgICB0aGlzLmxvZ2dlci5sb2coYCR7cHJlZml4fWxvYWRlZCBuYW1lc3BhY2UgJHtuc30gZm9yIGxhbmd1YWdlICR7bG5nfWAsIGRhdGEpO1xuXG4gICAgICB0aGlzLmxvYWRlZChuYW1lLCBlcnIsIGRhdGEpO1xuICAgIH0pO1xuICB9XG5cbiAgc2F2ZU1pc3NpbmcobGFuZ3VhZ2VzLCBuYW1lc3BhY2UsIGtleSwgZmFsbGJhY2tWYWx1ZSwgaXNVcGRhdGUsIG9wdGlvbnMgPSB7fSwgY2xiID0gKCkgPT4ge30pIHtcbiAgICBpZiAoXG4gICAgICB0aGlzLnNlcnZpY2VzLnV0aWxzICYmXG4gICAgICB0aGlzLnNlcnZpY2VzLnV0aWxzLmhhc0xvYWRlZE5hbWVzcGFjZSAmJlxuICAgICAgIXRoaXMuc2VydmljZXMudXRpbHMuaGFzTG9hZGVkTmFtZXNwYWNlKG5hbWVzcGFjZSlcbiAgICApIHtcbiAgICAgIHRoaXMubG9nZ2VyLndhcm4oXG4gICAgICAgIGBkaWQgbm90IHNhdmUga2V5IFwiJHtrZXl9XCIgYXMgdGhlIG5hbWVzcGFjZSBcIiR7bmFtZXNwYWNlfVwiIHdhcyBub3QgeWV0IGxvYWRlZGAsXG4gICAgICAgICdUaGlzIG1lYW5zIHNvbWV0aGluZyBJUyBXUk9ORyBpbiB5b3VyIHNldHVwLiBZb3UgYWNjZXNzIHRoZSB0IGZ1bmN0aW9uIGJlZm9yZSBpMThuZXh0LmluaXQgLyBpMThuZXh0LmxvYWROYW1lc3BhY2UgLyBpMThuZXh0LmNoYW5nZUxhbmd1YWdlIHdhcyBkb25lLiBXYWl0IGZvciB0aGUgY2FsbGJhY2sgb3IgUHJvbWlzZSB0byByZXNvbHZlIGJlZm9yZSBhY2Nlc3NpbmcgaXQhISEnLFxuICAgICAgKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBpZ25vcmUgbm9uIHZhbGlkIGtleXNcbiAgICBpZiAoa2V5ID09PSB1bmRlZmluZWQgfHwga2V5ID09PSBudWxsIHx8IGtleSA9PT0gJycpIHJldHVybjtcblxuICAgIGlmICh0aGlzLmJhY2tlbmQgJiYgdGhpcy5iYWNrZW5kLmNyZWF0ZSkge1xuICAgICAgY29uc3Qgb3B0cyA9IHtcbiAgICAgICAgLi4ub3B0aW9ucyxcbiAgICAgICAgaXNVcGRhdGUsXG4gICAgICB9O1xuICAgICAgY29uc3QgZmMgPSB0aGlzLmJhY2tlbmQuY3JlYXRlLmJpbmQodGhpcy5iYWNrZW5kKTtcbiAgICAgIGlmIChmYy5sZW5ndGggPCA2KSB7XG4gICAgICAgIC8vIG5vIGNhbGxiYWNrXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgbGV0IHI7XG4gICAgICAgICAgaWYgKGZjLmxlbmd0aCA9PT0gNSkge1xuICAgICAgICAgICAgLy8gZnV0dXJlIGNhbGxiYWNrLWxlc3MgYXBpIGZvciBpMThuZXh0LWxvY2l6ZS1iYWNrZW5kXG4gICAgICAgICAgICByID0gZmMobGFuZ3VhZ2VzLCBuYW1lc3BhY2UsIGtleSwgZmFsbGJhY2tWYWx1ZSwgb3B0cyk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHIgPSBmYyhsYW5ndWFnZXMsIG5hbWVzcGFjZSwga2V5LCBmYWxsYmFja1ZhbHVlKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHIgJiYgdHlwZW9mIHIudGhlbiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgLy8gcHJvbWlzZVxuICAgICAgICAgICAgci50aGVuKChkYXRhKSA9PiBjbGIobnVsbCwgZGF0YSkpLmNhdGNoKGNsYik7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIHN5bmNcbiAgICAgICAgICAgIGNsYihudWxsLCByKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgIGNsYihlcnIpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBub3JtYWwgd2l0aCBjYWxsYmFja1xuICAgICAgICBmYyhsYW5ndWFnZXMsIG5hbWVzcGFjZSwga2V5LCBmYWxsYmFja1ZhbHVlLCBjbGIgLyogdW51c2VkIGNhbGxiYWNrICovLCBvcHRzKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyB3cml0ZSB0byBzdG9yZSB0byBhdm9pZCByZXNlbmRpbmdcbiAgICBpZiAoIWxhbmd1YWdlcyB8fCAhbGFuZ3VhZ2VzWzBdKSByZXR1cm47XG4gICAgdGhpcy5zdG9yZS5hZGRSZXNvdXJjZShsYW5ndWFnZXNbMF0sIG5hbWVzcGFjZSwga2V5LCBmYWxsYmFja1ZhbHVlKTtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBDb25uZWN0b3I7XG4iLCJleHBvcnQgZnVuY3Rpb24gZ2V0KCkge1xuICByZXR1cm4ge1xuICAgIGRlYnVnOiBmYWxzZSxcbiAgICBpbml0SW1tZWRpYXRlOiB0cnVlLFxuXG4gICAgbnM6IFsndHJhbnNsYXRpb24nXSxcbiAgICBkZWZhdWx0TlM6IFsndHJhbnNsYXRpb24nXSxcbiAgICBmYWxsYmFja0xuZzogWydkZXYnXSxcbiAgICBmYWxsYmFja05TOiBmYWxzZSwgLy8gc3RyaW5nIG9yIGFycmF5IG9mIG5hbWVzcGFjZXNcblxuICAgIHN1cHBvcnRlZExuZ3M6IGZhbHNlLCAvLyBhcnJheSB3aXRoIHN1cHBvcnRlZCBsYW5ndWFnZXNcbiAgICBub25FeHBsaWNpdFN1cHBvcnRlZExuZ3M6IGZhbHNlLFxuICAgIGxvYWQ6ICdhbGwnLCAvLyB8IGN1cnJlbnRPbmx5IHwgbGFuZ3VhZ2VPbmx5XG4gICAgcHJlbG9hZDogZmFsc2UsIC8vIGFycmF5IHdpdGggcHJlbG9hZCBsYW5ndWFnZXNcblxuICAgIHNpbXBsaWZ5UGx1cmFsU3VmZml4OiB0cnVlLFxuICAgIGtleVNlcGFyYXRvcjogJy4nLFxuICAgIG5zU2VwYXJhdG9yOiAnOicsXG4gICAgcGx1cmFsU2VwYXJhdG9yOiAnXycsXG4gICAgY29udGV4dFNlcGFyYXRvcjogJ18nLFxuXG4gICAgcGFydGlhbEJ1bmRsZWRMYW5ndWFnZXM6IGZhbHNlLCAvLyBhbGxvdyBidW5kbGluZyBjZXJ0YWluIGxhbmd1YWdlcyB0aGF0IGFyZSBub3QgcmVtb3RlbHkgZmV0Y2hlZFxuICAgIHNhdmVNaXNzaW5nOiBmYWxzZSwgLy8gZW5hYmxlIHRvIHNlbmQgbWlzc2luZyB2YWx1ZXNcbiAgICB1cGRhdGVNaXNzaW5nOiBmYWxzZSwgLy8gZW5hYmxlIHRvIHVwZGF0ZSBkZWZhdWx0IHZhbHVlcyBpZiBkaWZmZXJlbnQgZnJvbSB0cmFuc2xhdGVkIHZhbHVlIChvbmx5IHVzZWZ1bCBvbiBpbml0aWFsIGRldmVsb3BtZW50LCBvciB3aGVuIGtlZXBpbmcgY29kZSBhcyBzb3VyY2Ugb2YgdHJ1dGgpXG4gICAgc2F2ZU1pc3NpbmdUbzogJ2ZhbGxiYWNrJywgLy8gJ2N1cnJlbnQnIHx8ICdhbGwnXG4gICAgc2F2ZU1pc3NpbmdQbHVyYWxzOiB0cnVlLCAvLyB3aWxsIHNhdmUgYWxsIGZvcm1zIG5vdCBvbmx5IHNpbmd1bGFyIGtleVxuICAgIG1pc3NpbmdLZXlIYW5kbGVyOiBmYWxzZSwgLy8gZnVuY3Rpb24obG5nLCBucywga2V5LCBmYWxsYmFja1ZhbHVlKSAtPiBvdmVycmlkZSBpZiBwcmVmZXIgb24gaGFuZGxpbmdcbiAgICBtaXNzaW5nSW50ZXJwb2xhdGlvbkhhbmRsZXI6IGZhbHNlLCAvLyBmdW5jdGlvbihzdHIsIG1hdGNoKVxuXG4gICAgcG9zdFByb2Nlc3M6IGZhbHNlLCAvLyBzdHJpbmcgb3IgYXJyYXkgb2YgcG9zdFByb2Nlc3NvciBuYW1lc1xuICAgIHBvc3RQcm9jZXNzUGFzc1Jlc29sdmVkOiBmYWxzZSwgLy8gcGFzcyByZXNvbHZlZCBvYmplY3QgaW50byAnb3B0aW9ucy5pMThuUmVzb2x2ZWQnIGZvciBwb3N0cHJvY2Vzc29yXG4gICAgcmV0dXJuTnVsbDogZmFsc2UsIC8vIGFsbG93cyBudWxsIHZhbHVlIGFzIHZhbGlkIHRyYW5zbGF0aW9uXG4gICAgcmV0dXJuRW1wdHlTdHJpbmc6IHRydWUsIC8vIGFsbG93cyBlbXB0eSBzdHJpbmcgdmFsdWUgYXMgdmFsaWQgdHJhbnNsYXRpb25cbiAgICByZXR1cm5PYmplY3RzOiBmYWxzZSxcbiAgICBqb2luQXJyYXlzOiBmYWxzZSwgLy8gb3Igc3RyaW5nIHRvIGpvaW4gYXJyYXlcbiAgICByZXR1cm5lZE9iamVjdEhhbmRsZXI6IGZhbHNlLCAvLyBmdW5jdGlvbihrZXksIHZhbHVlLCBvcHRpb25zKSB0cmlnZ2VyZWQgaWYga2V5IHJldHVybnMgb2JqZWN0IGJ1dCByZXR1cm5PYmplY3RzIGlzIHNldCB0byBmYWxzZVxuICAgIHBhcnNlTWlzc2luZ0tleUhhbmRsZXI6IGZhbHNlLCAvLyBmdW5jdGlvbihrZXkpIHBhcnNlZCBhIGtleSB0aGF0IHdhcyBub3QgZm91bmQgaW4gdCgpIGJlZm9yZSByZXR1cm5pbmdcbiAgICBhcHBlbmROYW1lc3BhY2VUb01pc3NpbmdLZXk6IGZhbHNlLFxuICAgIGFwcGVuZE5hbWVzcGFjZVRvQ0lNb2RlOiBmYWxzZSxcbiAgICBvdmVybG9hZFRyYW5zbGF0aW9uT3B0aW9uSGFuZGxlcjogZnVuY3Rpb24gaGFuZGxlKGFyZ3MpIHtcbiAgICAgIGxldCByZXQgPSB7fTtcbiAgICAgIGlmICh0eXBlb2YgYXJnc1sxXSA9PT0gJ29iamVjdCcpIHJldCA9IGFyZ3NbMV07XG4gICAgICBpZiAodHlwZW9mIGFyZ3NbMV0gPT09ICdzdHJpbmcnKSByZXQuZGVmYXVsdFZhbHVlID0gYXJnc1sxXTtcbiAgICAgIGlmICh0eXBlb2YgYXJnc1syXSA9PT0gJ3N0cmluZycpIHJldC50RGVzY3JpcHRpb24gPSBhcmdzWzJdO1xuICAgICAgaWYgKHR5cGVvZiBhcmdzWzJdID09PSAnb2JqZWN0JyB8fCB0eXBlb2YgYXJnc1szXSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgY29uc3Qgb3B0aW9ucyA9IGFyZ3NbM10gfHwgYXJnc1syXTtcbiAgICAgICAgT2JqZWN0LmtleXMob3B0aW9ucykuZm9yRWFjaCgoa2V5KSA9PiB7XG4gICAgICAgICAgcmV0W2tleV0gPSBvcHRpb25zW2tleV07XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJldDtcbiAgICB9LFxuICAgIGludGVycG9sYXRpb246IHtcbiAgICAgIGVzY2FwZVZhbHVlOiB0cnVlLFxuICAgICAgLyoqIEB0eXBlIHtpbXBvcnQoJ2kxOG5leHQnKS5Gb3JtYXRGdW5jdGlvbn0gKi9cbiAgICAgIGZvcm1hdDogKHZhbHVlKSA9PiB2YWx1ZSxcbiAgICAgIHByZWZpeDogJ3t7JyxcbiAgICAgIHN1ZmZpeDogJ319JyxcbiAgICAgIGZvcm1hdFNlcGFyYXRvcjogJywnLFxuICAgICAgLy8gcHJlZml4RXNjYXBlZDogJ3t7JyxcbiAgICAgIC8vIHN1ZmZpeEVzY2FwZWQ6ICd9fScsXG4gICAgICAvLyB1bmVzY2FwZVN1ZmZpeDogJycsXG4gICAgICB1bmVzY2FwZVByZWZpeDogJy0nLFxuXG4gICAgICBuZXN0aW5nUHJlZml4OiAnJHQoJyxcbiAgICAgIG5lc3RpbmdTdWZmaXg6ICcpJyxcbiAgICAgIG5lc3RpbmdPcHRpb25zU2VwYXJhdG9yOiAnLCcsXG4gICAgICAvLyBuZXN0aW5nUHJlZml4RXNjYXBlZDogJyR0KCcsXG4gICAgICAvLyBuZXN0aW5nU3VmZml4RXNjYXBlZDogJyknLFxuICAgICAgLy8gZGVmYXVsdFZhcmlhYmxlczogdW5kZWZpbmVkIC8vIG9iamVjdCB0aGF0IGNhbiBoYXZlIHZhbHVlcyB0byBpbnRlcnBvbGF0ZSBvbiAtIGV4dGVuZHMgcGFzc2VkIGluIGludGVycG9sYXRpb24gZGF0YVxuICAgICAgbWF4UmVwbGFjZXM6IDEwMDAsIC8vIG1heCByZXBsYWNlcyB0byBwcmV2ZW50IGVuZGxlc3MgbG9vcFxuICAgICAgc2tpcE9uVmFyaWFibGVzOiB0cnVlLFxuICAgIH0sXG4gIH07XG59XG5cbi8qIGVzbGludCBuby1wYXJhbS1yZWFzc2lnbjogMCAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRyYW5zZm9ybU9wdGlvbnMob3B0aW9ucykge1xuICAvLyBjcmVhdGUgbmFtZXNwYWNlIG9iamVjdCBpZiBuYW1lc3BhY2UgaXMgcGFzc2VkIGluIGFzIHN0cmluZ1xuICBpZiAodHlwZW9mIG9wdGlvbnMubnMgPT09ICdzdHJpbmcnKSBvcHRpb25zLm5zID0gW29wdGlvbnMubnNdO1xuICBpZiAodHlwZW9mIG9wdGlvbnMuZmFsbGJhY2tMbmcgPT09ICdzdHJpbmcnKSBvcHRpb25zLmZhbGxiYWNrTG5nID0gW29wdGlvbnMuZmFsbGJhY2tMbmddO1xuICBpZiAodHlwZW9mIG9wdGlvbnMuZmFsbGJhY2tOUyA9PT0gJ3N0cmluZycpIG9wdGlvbnMuZmFsbGJhY2tOUyA9IFtvcHRpb25zLmZhbGxiYWNrTlNdO1xuXG4gIC8vIGV4dGVuZCBzdXBwb3J0ZWRMbmdzIHdpdGggY2ltb2RlXG4gIGlmIChvcHRpb25zLnN1cHBvcnRlZExuZ3MgJiYgb3B0aW9ucy5zdXBwb3J0ZWRMbmdzLmluZGV4T2YoJ2NpbW9kZScpIDwgMCkge1xuICAgIG9wdGlvbnMuc3VwcG9ydGVkTG5ncyA9IG9wdGlvbnMuc3VwcG9ydGVkTG5ncy5jb25jYXQoWydjaW1vZGUnXSk7XG4gIH1cblxuICByZXR1cm4gb3B0aW9ucztcbn1cbiIsImltcG9ydCBiYXNlTG9nZ2VyIGZyb20gJy4vbG9nZ2VyLmpzJztcbmltcG9ydCBFdmVudEVtaXR0ZXIgZnJvbSAnLi9FdmVudEVtaXR0ZXIuanMnO1xuaW1wb3J0IFJlc291cmNlU3RvcmUgZnJvbSAnLi9SZXNvdXJjZVN0b3JlLmpzJztcbmltcG9ydCBUcmFuc2xhdG9yIGZyb20gJy4vVHJhbnNsYXRvci5qcyc7XG5pbXBvcnQgTGFuZ3VhZ2VVdGlscyBmcm9tICcuL0xhbmd1YWdlVXRpbHMuanMnO1xuaW1wb3J0IFBsdXJhbFJlc29sdmVyIGZyb20gJy4vUGx1cmFsUmVzb2x2ZXIuanMnO1xuaW1wb3J0IEludGVycG9sYXRvciBmcm9tICcuL0ludGVycG9sYXRvci5qcyc7XG5pbXBvcnQgRm9ybWF0dGVyIGZyb20gJy4vRm9ybWF0dGVyLmpzJztcbmltcG9ydCBCYWNrZW5kQ29ubmVjdG9yIGZyb20gJy4vQmFja2VuZENvbm5lY3Rvci5qcyc7XG5pbXBvcnQgeyBnZXQgYXMgZ2V0RGVmYXVsdHMsIHRyYW5zZm9ybU9wdGlvbnMgfSBmcm9tICcuL2RlZmF1bHRzLmpzJztcbmltcG9ydCBwb3N0UHJvY2Vzc29yIGZyb20gJy4vcG9zdFByb2Nlc3Nvci5qcyc7XG5pbXBvcnQgeyBkZWZlciB9IGZyb20gJy4vdXRpbHMuanMnO1xuXG5mdW5jdGlvbiBub29wKCkgeyB9XG5cbi8vIEJpbmRzIHRoZSBtZW1iZXIgZnVuY3Rpb25zIG9mIHRoZSBnaXZlbiBjbGFzcyBpbnN0YW5jZSBzbyB0aGF0IHRoZXkgY2FuIGJlXG4vLyBkZXN0cnVjdHVyZWQgb3IgdXNlZCBhcyBjYWxsYmFja3MuXG5mdW5jdGlvbiBiaW5kTWVtYmVyRnVuY3Rpb25zKGluc3QpIHtcbiAgY29uc3QgbWVtcyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKE9iamVjdC5nZXRQcm90b3R5cGVPZihpbnN0KSlcbiAgbWVtcy5mb3JFYWNoKChtZW0pID0+IHtcbiAgICBpZiAodHlwZW9mIGluc3RbbWVtXSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgaW5zdFttZW1dID0gaW5zdFttZW1dLmJpbmQoaW5zdClcbiAgICB9XG4gIH0pXG59XG5cbmNsYXNzIEkxOG4gZXh0ZW5kcyBFdmVudEVtaXR0ZXIge1xuICBjb25zdHJ1Y3RvcihvcHRpb25zID0ge30sIGNhbGxiYWNrKSB7XG4gICAgc3VwZXIoKTtcblxuICAgIHRoaXMub3B0aW9ucyA9IHRyYW5zZm9ybU9wdGlvbnMob3B0aW9ucyk7XG4gICAgdGhpcy5zZXJ2aWNlcyA9IHt9O1xuICAgIHRoaXMubG9nZ2VyID0gYmFzZUxvZ2dlcjtcbiAgICB0aGlzLm1vZHVsZXMgPSB7IGV4dGVybmFsOiBbXSB9O1xuXG4gICAgYmluZE1lbWJlckZ1bmN0aW9ucyh0aGlzKTtcblxuICAgIGlmIChjYWxsYmFjayAmJiAhdGhpcy5pc0luaXRpYWxpemVkICYmICFvcHRpb25zLmlzQ2xvbmUpIHtcbiAgICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9pMThuZXh0L2kxOG5leHQvaXNzdWVzLzg3OVxuICAgICAgaWYgKCF0aGlzLm9wdGlvbnMuaW5pdEltbWVkaWF0ZSkge1xuICAgICAgICB0aGlzLmluaXQob3B0aW9ucywgY2FsbGJhY2spO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgIH1cbiAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICB0aGlzLmluaXQob3B0aW9ucywgY2FsbGJhY2spO1xuICAgICAgfSwgMCk7XG4gICAgfVxuICB9XG5cbiAgaW5pdChvcHRpb25zID0ge30sIGNhbGxiYWNrKSB7XG4gICAgdGhpcy5pc0luaXRpYWxpemluZyA9IHRydWU7XG4gICAgaWYgKHR5cGVvZiBvcHRpb25zID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBjYWxsYmFjayA9IG9wdGlvbnM7XG4gICAgICBvcHRpb25zID0ge307XG4gICAgfVxuXG4gICAgaWYgKCFvcHRpb25zLmRlZmF1bHROUyAmJiBvcHRpb25zLmRlZmF1bHROUyAhPT0gZmFsc2UgJiYgb3B0aW9ucy5ucykge1xuICAgICAgaWYgKHR5cGVvZiBvcHRpb25zLm5zID09PSAnc3RyaW5nJykge1xuICAgICAgICBvcHRpb25zLmRlZmF1bHROUyA9IG9wdGlvbnMubnM7XG4gICAgICB9IGVsc2UgaWYgKG9wdGlvbnMubnMuaW5kZXhPZigndHJhbnNsYXRpb24nKSA8IDApIHtcbiAgICAgICAgb3B0aW9ucy5kZWZhdWx0TlMgPSBvcHRpb25zLm5zWzBdO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IGRlZk9wdHMgPSBnZXREZWZhdWx0cygpO1xuICAgIHRoaXMub3B0aW9ucyA9IHsgLi4uZGVmT3B0cywgLi4udGhpcy5vcHRpb25zLCAuLi50cmFuc2Zvcm1PcHRpb25zKG9wdGlvbnMpIH07XG4gICAgaWYgKHRoaXMub3B0aW9ucy5jb21wYXRpYmlsaXR5QVBJICE9PSAndjEnKSB7XG4gICAgICB0aGlzLm9wdGlvbnMuaW50ZXJwb2xhdGlvbiA9IHsgLi4uZGVmT3B0cy5pbnRlcnBvbGF0aW9uLCAuLi50aGlzLm9wdGlvbnMuaW50ZXJwb2xhdGlvbiB9OyAvLyBkbyBub3QgdXNlIHJlZmVyZW5jZVxuICAgIH1cbiAgICBpZiAob3B0aW9ucy5rZXlTZXBhcmF0b3IgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5vcHRpb25zLnVzZXJEZWZpbmVkS2V5U2VwYXJhdG9yID0gb3B0aW9ucy5rZXlTZXBhcmF0b3I7XG4gICAgfVxuICAgIGlmIChvcHRpb25zLm5zU2VwYXJhdG9yICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMub3B0aW9ucy51c2VyRGVmaW5lZE5zU2VwYXJhdG9yID0gb3B0aW9ucy5uc1NlcGFyYXRvcjtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjcmVhdGVDbGFzc09uRGVtYW5kKENsYXNzT3JPYmplY3QpIHtcbiAgICAgIGlmICghQ2xhc3NPck9iamVjdCkgcmV0dXJuIG51bGw7XG4gICAgICBpZiAodHlwZW9mIENsYXNzT3JPYmplY3QgPT09ICdmdW5jdGlvbicpIHJldHVybiBuZXcgQ2xhc3NPck9iamVjdCgpO1xuICAgICAgcmV0dXJuIENsYXNzT3JPYmplY3Q7XG4gICAgfVxuXG4gICAgLy8gaW5pdCBzZXJ2aWNlc1xuICAgIGlmICghdGhpcy5vcHRpb25zLmlzQ2xvbmUpIHtcbiAgICAgIGlmICh0aGlzLm1vZHVsZXMubG9nZ2VyKSB7XG4gICAgICAgIGJhc2VMb2dnZXIuaW5pdChjcmVhdGVDbGFzc09uRGVtYW5kKHRoaXMubW9kdWxlcy5sb2dnZXIpLCB0aGlzLm9wdGlvbnMpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYmFzZUxvZ2dlci5pbml0KG51bGwsIHRoaXMub3B0aW9ucyk7XG4gICAgICB9XG5cbiAgICAgIGxldCBmb3JtYXR0ZXI7XG4gICAgICBpZiAodGhpcy5tb2R1bGVzLmZvcm1hdHRlcikge1xuICAgICAgICBmb3JtYXR0ZXIgPSB0aGlzLm1vZHVsZXMuZm9ybWF0dGVyO1xuICAgICAgfSBlbHNlIGlmICh0eXBlb2YgSW50bCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgZm9ybWF0dGVyID0gRm9ybWF0dGVyO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBsdSA9IG5ldyBMYW5ndWFnZVV0aWxzKHRoaXMub3B0aW9ucyk7XG4gICAgICB0aGlzLnN0b3JlID0gbmV3IFJlc291cmNlU3RvcmUodGhpcy5vcHRpb25zLnJlc291cmNlcywgdGhpcy5vcHRpb25zKTtcblxuICAgICAgY29uc3QgcyA9IHRoaXMuc2VydmljZXM7XG4gICAgICBzLmxvZ2dlciA9IGJhc2VMb2dnZXI7XG4gICAgICBzLnJlc291cmNlU3RvcmUgPSB0aGlzLnN0b3JlO1xuICAgICAgcy5sYW5ndWFnZVV0aWxzID0gbHU7XG4gICAgICBzLnBsdXJhbFJlc29sdmVyID0gbmV3IFBsdXJhbFJlc29sdmVyKGx1LCB7XG4gICAgICAgIHByZXBlbmQ6IHRoaXMub3B0aW9ucy5wbHVyYWxTZXBhcmF0b3IsXG4gICAgICAgIGNvbXBhdGliaWxpdHlKU09OOiB0aGlzLm9wdGlvbnMuY29tcGF0aWJpbGl0eUpTT04sXG4gICAgICAgIHNpbXBsaWZ5UGx1cmFsU3VmZml4OiB0aGlzLm9wdGlvbnMuc2ltcGxpZnlQbHVyYWxTdWZmaXgsXG4gICAgICB9KTtcblxuICAgICAgaWYgKGZvcm1hdHRlciAmJiAoIXRoaXMub3B0aW9ucy5pbnRlcnBvbGF0aW9uLmZvcm1hdCB8fCB0aGlzLm9wdGlvbnMuaW50ZXJwb2xhdGlvbi5mb3JtYXQgPT09IGRlZk9wdHMuaW50ZXJwb2xhdGlvbi5mb3JtYXQpKSB7XG4gICAgICAgIHMuZm9ybWF0dGVyID0gY3JlYXRlQ2xhc3NPbkRlbWFuZChmb3JtYXR0ZXIpO1xuICAgICAgICBzLmZvcm1hdHRlci5pbml0KHMsIHRoaXMub3B0aW9ucyk7XG5cbiAgICAgICAgdGhpcy5vcHRpb25zLmludGVycG9sYXRpb24uZm9ybWF0ID0gcy5mb3JtYXR0ZXIuZm9ybWF0LmJpbmQocy5mb3JtYXR0ZXIpO1xuICAgICAgfVxuXG4gICAgICBzLmludGVycG9sYXRvciA9IG5ldyBJbnRlcnBvbGF0b3IodGhpcy5vcHRpb25zKTtcbiAgICAgIHMudXRpbHMgPSB7XG4gICAgICAgIGhhc0xvYWRlZE5hbWVzcGFjZTogdGhpcy5oYXNMb2FkZWROYW1lc3BhY2UuYmluZCh0aGlzKVxuICAgICAgfVxuXG4gICAgICBzLmJhY2tlbmRDb25uZWN0b3IgPSBuZXcgQmFja2VuZENvbm5lY3RvcihcbiAgICAgICAgY3JlYXRlQ2xhc3NPbkRlbWFuZCh0aGlzLm1vZHVsZXMuYmFja2VuZCksXG4gICAgICAgIHMucmVzb3VyY2VTdG9yZSxcbiAgICAgICAgcyxcbiAgICAgICAgdGhpcy5vcHRpb25zLFxuICAgICAgKTtcbiAgICAgIC8vIHBpcGUgZXZlbnRzIGZyb20gYmFja2VuZENvbm5lY3RvclxuICAgICAgcy5iYWNrZW5kQ29ubmVjdG9yLm9uKCcqJywgKGV2ZW50LCAuLi5hcmdzKSA9PiB7XG4gICAgICAgIHRoaXMuZW1pdChldmVudCwgLi4uYXJncyk7XG4gICAgICB9KTtcblxuICAgICAgaWYgKHRoaXMubW9kdWxlcy5sYW5ndWFnZURldGVjdG9yKSB7XG4gICAgICAgIHMubGFuZ3VhZ2VEZXRlY3RvciA9IGNyZWF0ZUNsYXNzT25EZW1hbmQodGhpcy5tb2R1bGVzLmxhbmd1YWdlRGV0ZWN0b3IpO1xuICAgICAgICBpZiAocy5sYW5ndWFnZURldGVjdG9yLmluaXQpIHMubGFuZ3VhZ2VEZXRlY3Rvci5pbml0KHMsIHRoaXMub3B0aW9ucy5kZXRlY3Rpb24sIHRoaXMub3B0aW9ucyk7XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLm1vZHVsZXMuaTE4bkZvcm1hdCkge1xuICAgICAgICBzLmkxOG5Gb3JtYXQgPSBjcmVhdGVDbGFzc09uRGVtYW5kKHRoaXMubW9kdWxlcy5pMThuRm9ybWF0KTtcbiAgICAgICAgaWYgKHMuaTE4bkZvcm1hdC5pbml0KSBzLmkxOG5Gb3JtYXQuaW5pdCh0aGlzKTtcbiAgICAgIH1cblxuICAgICAgdGhpcy50cmFuc2xhdG9yID0gbmV3IFRyYW5zbGF0b3IodGhpcy5zZXJ2aWNlcywgdGhpcy5vcHRpb25zKTtcbiAgICAgIC8vIHBpcGUgZXZlbnRzIGZyb20gdHJhbnNsYXRvclxuICAgICAgdGhpcy50cmFuc2xhdG9yLm9uKCcqJywgKGV2ZW50LCAuLi5hcmdzKSA9PiB7XG4gICAgICAgIHRoaXMuZW1pdChldmVudCwgLi4uYXJncyk7XG4gICAgICB9KTtcblxuICAgICAgdGhpcy5tb2R1bGVzLmV4dGVybmFsLmZvckVhY2gobSA9PiB7XG4gICAgICAgIGlmIChtLmluaXQpIG0uaW5pdCh0aGlzKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHRoaXMuZm9ybWF0ID0gdGhpcy5vcHRpb25zLmludGVycG9sYXRpb24uZm9ybWF0O1xuICAgIGlmICghY2FsbGJhY2spIGNhbGxiYWNrID0gbm9vcDtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMuZmFsbGJhY2tMbmcgJiYgIXRoaXMuc2VydmljZXMubGFuZ3VhZ2VEZXRlY3RvciAmJiAhdGhpcy5vcHRpb25zLmxuZykge1xuICAgICAgY29uc3QgY29kZXMgPSB0aGlzLnNlcnZpY2VzLmxhbmd1YWdlVXRpbHMuZ2V0RmFsbGJhY2tDb2Rlcyh0aGlzLm9wdGlvbnMuZmFsbGJhY2tMbmcpXG4gICAgICBpZiAoY29kZXMubGVuZ3RoID4gMCAmJiBjb2Rlc1swXSAhPT0gJ2RldicpIHRoaXMub3B0aW9ucy5sbmcgPSBjb2Rlc1swXVxuICAgIH1cbiAgICBpZiAoIXRoaXMuc2VydmljZXMubGFuZ3VhZ2VEZXRlY3RvciAmJiAhdGhpcy5vcHRpb25zLmxuZykge1xuICAgICAgdGhpcy5sb2dnZXIud2FybignaW5pdDogbm8gbGFuZ3VhZ2VEZXRlY3RvciBpcyB1c2VkIGFuZCBubyBsbmcgaXMgZGVmaW5lZCcpO1xuICAgIH1cblxuICAgIC8vIGFwcGVuZCBhcGlcbiAgICBjb25zdCBzdG9yZUFwaSA9IFtcbiAgICAgICdnZXRSZXNvdXJjZScsXG4gICAgICAnaGFzUmVzb3VyY2VCdW5kbGUnLFxuICAgICAgJ2dldFJlc291cmNlQnVuZGxlJyxcbiAgICAgICdnZXREYXRhQnlMYW5ndWFnZScsXG4gICAgXTtcbiAgICBzdG9yZUFwaS5mb3JFYWNoKGZjTmFtZSA9PiB7XG4gICAgICB0aGlzW2ZjTmFtZV0gPSAoLi4uYXJncykgPT4gdGhpcy5zdG9yZVtmY05hbWVdKC4uLmFyZ3MpO1xuICAgIH0pO1xuICAgIGNvbnN0IHN0b3JlQXBpQ2hhaW5lZCA9IFtcbiAgICAgICdhZGRSZXNvdXJjZScsXG4gICAgICAnYWRkUmVzb3VyY2VzJyxcbiAgICAgICdhZGRSZXNvdXJjZUJ1bmRsZScsXG4gICAgICAncmVtb3ZlUmVzb3VyY2VCdW5kbGUnLFxuICAgIF07XG4gICAgc3RvcmVBcGlDaGFpbmVkLmZvckVhY2goZmNOYW1lID0+IHtcbiAgICAgIHRoaXNbZmNOYW1lXSA9ICguLi5hcmdzKSA9PiB7XG4gICAgICAgIHRoaXMuc3RvcmVbZmNOYW1lXSguLi5hcmdzKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICB9O1xuICAgIH0pO1xuXG4gICAgY29uc3QgZGVmZXJyZWQgPSBkZWZlcigpO1xuXG4gICAgY29uc3QgbG9hZCA9ICgpID0+IHtcbiAgICAgIGNvbnN0IGZpbmlzaCA9IChlcnIsIHQpID0+IHtcbiAgICAgICAgdGhpcy5pc0luaXRpYWxpemluZyA9IGZhbHNlO1xuICAgICAgICBpZiAodGhpcy5pc0luaXRpYWxpemVkICYmICF0aGlzLmluaXRpYWxpemVkU3RvcmVPbmNlKSB0aGlzLmxvZ2dlci53YXJuKCdpbml0OiBpMThuZXh0IGlzIGFscmVhZHkgaW5pdGlhbGl6ZWQuIFlvdSBzaG91bGQgY2FsbCBpbml0IGp1c3Qgb25jZSEnKTtcbiAgICAgICAgdGhpcy5pc0luaXRpYWxpemVkID0gdHJ1ZTtcbiAgICAgICAgaWYgKCF0aGlzLm9wdGlvbnMuaXNDbG9uZSkgdGhpcy5sb2dnZXIubG9nKCdpbml0aWFsaXplZCcsIHRoaXMub3B0aW9ucyk7XG4gICAgICAgIHRoaXMuZW1pdCgnaW5pdGlhbGl6ZWQnLCB0aGlzLm9wdGlvbnMpO1xuXG4gICAgICAgIGRlZmVycmVkLnJlc29sdmUodCk7IC8vIG5vdCByZWplY3Rpbmcgb24gZXJyIChhcyBlcnIgaXMgb25seSBhIGxvYWRpbmcgdHJhbnNsYXRpb24gZmFpbGVkIHdhcm5pbmcpXG4gICAgICAgIGNhbGxiYWNrKGVyciwgdCk7XG4gICAgICB9O1xuICAgICAgLy8gZml4IGZvciB1c2UgY2FzZXMgd2hlbiBjYWxsaW5nIGNoYW5nZUxhbmd1YWdlIGJlZm9yZSBmaW5pc2hlZCB0byBpbml0aWFsaXplZCAoaS5lLiBodHRwczovL2dpdGh1Yi5jb20vaTE4bmV4dC9pMThuZXh0L2lzc3Vlcy8xNTUyKVxuICAgICAgaWYgKHRoaXMubGFuZ3VhZ2VzICYmIHRoaXMub3B0aW9ucy5jb21wYXRpYmlsaXR5QVBJICE9PSAndjEnICYmICF0aGlzLmlzSW5pdGlhbGl6ZWQpIHJldHVybiBmaW5pc2gobnVsbCwgdGhpcy50LmJpbmQodGhpcykpO1xuICAgICAgdGhpcy5jaGFuZ2VMYW5ndWFnZSh0aGlzLm9wdGlvbnMubG5nLCBmaW5pc2gpO1xuICAgIH07XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLnJlc291cmNlcyB8fCAhdGhpcy5vcHRpb25zLmluaXRJbW1lZGlhdGUpIHtcbiAgICAgIGxvYWQoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgc2V0VGltZW91dChsb2FkLCAwKTtcbiAgICB9XG5cbiAgICByZXR1cm4gZGVmZXJyZWQ7XG4gIH1cblxuICAvKiBlc2xpbnQgY29uc2lzdGVudC1yZXR1cm46IDAgKi9cbiAgbG9hZFJlc291cmNlcyhsYW5ndWFnZSwgY2FsbGJhY2sgPSBub29wKSB7XG4gICAgbGV0IHVzZWRDYWxsYmFjayA9IGNhbGxiYWNrO1xuICAgIGNvbnN0IHVzZWRMbmcgPSB0eXBlb2YgbGFuZ3VhZ2UgPT09ICdzdHJpbmcnID8gbGFuZ3VhZ2UgOiB0aGlzLmxhbmd1YWdlO1xuICAgIGlmICh0eXBlb2YgbGFuZ3VhZ2UgPT09ICdmdW5jdGlvbicpIHVzZWRDYWxsYmFjayA9IGxhbmd1YWdlO1xuXG4gICAgaWYgKCF0aGlzLm9wdGlvbnMucmVzb3VyY2VzIHx8IHRoaXMub3B0aW9ucy5wYXJ0aWFsQnVuZGxlZExhbmd1YWdlcykge1xuICAgICAgaWYgKHVzZWRMbmcgJiYgdXNlZExuZy50b0xvd2VyQ2FzZSgpID09PSAnY2ltb2RlJyAmJiAoIXRoaXMub3B0aW9ucy5wcmVsb2FkIHx8IHRoaXMub3B0aW9ucy5wcmVsb2FkLmxlbmd0aCA9PT0gMCkpIHJldHVybiB1c2VkQ2FsbGJhY2soKTsgLy8gYXZvaWQgbG9hZGluZyByZXNvdXJjZXMgZm9yIGNpbW9kZVxuXG4gICAgICBjb25zdCB0b0xvYWQgPSBbXTtcblxuICAgICAgY29uc3QgYXBwZW5kID0gbG5nID0+IHtcbiAgICAgICAgaWYgKCFsbmcpIHJldHVybjtcbiAgICAgICAgaWYgKGxuZyA9PT0gJ2NpbW9kZScpIHJldHVybjtcbiAgICAgICAgY29uc3QgbG5ncyA9IHRoaXMuc2VydmljZXMubGFuZ3VhZ2VVdGlscy50b1Jlc29sdmVIaWVyYXJjaHkobG5nKTtcbiAgICAgICAgbG5ncy5mb3JFYWNoKGwgPT4ge1xuICAgICAgICAgIGlmIChsID09PSAnY2ltb2RlJykgcmV0dXJuO1xuICAgICAgICAgIGlmICh0b0xvYWQuaW5kZXhPZihsKSA8IDApIHRvTG9hZC5wdXNoKGwpO1xuICAgICAgICB9KTtcbiAgICAgIH07XG5cbiAgICAgIGlmICghdXNlZExuZykge1xuICAgICAgICAvLyBhdCBsZWFzdCBsb2FkIGZhbGxiYWNrcyBpbiB0aGlzIGNhc2VcbiAgICAgICAgY29uc3QgZmFsbGJhY2tzID0gdGhpcy5zZXJ2aWNlcy5sYW5ndWFnZVV0aWxzLmdldEZhbGxiYWNrQ29kZXModGhpcy5vcHRpb25zLmZhbGxiYWNrTG5nKTtcbiAgICAgICAgZmFsbGJhY2tzLmZvckVhY2gobCA9PiBhcHBlbmQobCkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYXBwZW5kKHVzZWRMbmcpO1xuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5vcHRpb25zLnByZWxvYWQpIHtcbiAgICAgICAgdGhpcy5vcHRpb25zLnByZWxvYWQuZm9yRWFjaChsID0+IGFwcGVuZChsKSk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMuc2VydmljZXMuYmFja2VuZENvbm5lY3Rvci5sb2FkKHRvTG9hZCwgdGhpcy5vcHRpb25zLm5zLCAoZSkgPT4ge1xuICAgICAgICBpZiAoIWUgJiYgIXRoaXMucmVzb2x2ZWRMYW5ndWFnZSAmJiB0aGlzLmxhbmd1YWdlKSB0aGlzLnNldFJlc29sdmVkTGFuZ3VhZ2UodGhpcy5sYW5ndWFnZSk7XG4gICAgICAgIHVzZWRDYWxsYmFjayhlKTtcbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICB1c2VkQ2FsbGJhY2sobnVsbCk7XG4gICAgfVxuICB9XG5cbiAgcmVsb2FkUmVzb3VyY2VzKGxuZ3MsIG5zLCBjYWxsYmFjaykge1xuICAgIGNvbnN0IGRlZmVycmVkID0gZGVmZXIoKTtcbiAgICBpZiAoIWxuZ3MpIGxuZ3MgPSB0aGlzLmxhbmd1YWdlcztcbiAgICBpZiAoIW5zKSBucyA9IHRoaXMub3B0aW9ucy5ucztcbiAgICBpZiAoIWNhbGxiYWNrKSBjYWxsYmFjayA9IG5vb3A7XG4gICAgdGhpcy5zZXJ2aWNlcy5iYWNrZW5kQ29ubmVjdG9yLnJlbG9hZChsbmdzLCBucywgZXJyID0+IHtcbiAgICAgIGRlZmVycmVkLnJlc29sdmUoKTsgLy8gbm90IHJlamVjdGluZyBvbiBlcnIgKGFzIGVyciBpcyBvbmx5IGEgbG9hZGluZyB0cmFuc2xhdGlvbiBmYWlsZWQgd2FybmluZylcbiAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgfSk7XG4gICAgcmV0dXJuIGRlZmVycmVkO1xuICB9XG5cbiAgdXNlKG1vZHVsZSkge1xuICAgIGlmICghbW9kdWxlKSB0aHJvdyBuZXcgRXJyb3IoJ1lvdSBhcmUgcGFzc2luZyBhbiB1bmRlZmluZWQgbW9kdWxlISBQbGVhc2UgY2hlY2sgdGhlIG9iamVjdCB5b3UgYXJlIHBhc3NpbmcgdG8gaTE4bmV4dC51c2UoKScpXG4gICAgaWYgKCFtb2R1bGUudHlwZSkgdGhyb3cgbmV3IEVycm9yKCdZb3UgYXJlIHBhc3NpbmcgYSB3cm9uZyBtb2R1bGUhIFBsZWFzZSBjaGVjayB0aGUgb2JqZWN0IHlvdSBhcmUgcGFzc2luZyB0byBpMThuZXh0LnVzZSgpJylcblxuICAgIGlmIChtb2R1bGUudHlwZSA9PT0gJ2JhY2tlbmQnKSB7XG4gICAgICB0aGlzLm1vZHVsZXMuYmFja2VuZCA9IG1vZHVsZTtcbiAgICB9XG5cbiAgICBpZiAobW9kdWxlLnR5cGUgPT09ICdsb2dnZXInIHx8IChtb2R1bGUubG9nICYmIG1vZHVsZS53YXJuICYmIG1vZHVsZS5lcnJvcikpIHtcbiAgICAgIHRoaXMubW9kdWxlcy5sb2dnZXIgPSBtb2R1bGU7XG4gICAgfVxuXG4gICAgaWYgKG1vZHVsZS50eXBlID09PSAnbGFuZ3VhZ2VEZXRlY3RvcicpIHtcbiAgICAgIHRoaXMubW9kdWxlcy5sYW5ndWFnZURldGVjdG9yID0gbW9kdWxlO1xuICAgIH1cblxuICAgIGlmIChtb2R1bGUudHlwZSA9PT0gJ2kxOG5Gb3JtYXQnKSB7XG4gICAgICB0aGlzLm1vZHVsZXMuaTE4bkZvcm1hdCA9IG1vZHVsZTtcbiAgICB9XG5cbiAgICBpZiAobW9kdWxlLnR5cGUgPT09ICdwb3N0UHJvY2Vzc29yJykge1xuICAgICAgcG9zdFByb2Nlc3Nvci5hZGRQb3N0UHJvY2Vzc29yKG1vZHVsZSk7XG4gICAgfVxuXG4gICAgaWYgKG1vZHVsZS50eXBlID09PSAnZm9ybWF0dGVyJykge1xuICAgICAgdGhpcy5tb2R1bGVzLmZvcm1hdHRlciA9IG1vZHVsZTtcbiAgICB9XG5cbiAgICBpZiAobW9kdWxlLnR5cGUgPT09ICczcmRQYXJ0eScpIHtcbiAgICAgIHRoaXMubW9kdWxlcy5leHRlcm5hbC5wdXNoKG1vZHVsZSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBzZXRSZXNvbHZlZExhbmd1YWdlKGwpIHtcbiAgICBpZiAoIWwgfHwgIXRoaXMubGFuZ3VhZ2VzKSByZXR1cm47XG4gICAgaWYgKFsnY2ltb2RlJywgJ2RldiddLmluZGV4T2YobCkgPiAtMSkgcmV0dXJuO1xuICAgIGZvciAobGV0IGxpID0gMDsgbGkgPCB0aGlzLmxhbmd1YWdlcy5sZW5ndGg7IGxpKyspIHtcbiAgICAgIGNvbnN0IGxuZ0luTG5ncyA9IHRoaXMubGFuZ3VhZ2VzW2xpXTtcbiAgICAgIGlmIChbJ2NpbW9kZScsICdkZXYnXS5pbmRleE9mKGxuZ0luTG5ncykgPiAtMSkgY29udGludWU7XG4gICAgICBpZiAodGhpcy5zdG9yZS5oYXNMYW5ndWFnZVNvbWVUcmFuc2xhdGlvbnMobG5nSW5MbmdzKSkge1xuICAgICAgICB0aGlzLnJlc29sdmVkTGFuZ3VhZ2UgPSBsbmdJbkxuZ3M7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGNoYW5nZUxhbmd1YWdlKGxuZywgY2FsbGJhY2spIHtcbiAgICB0aGlzLmlzTGFuZ3VhZ2VDaGFuZ2luZ1RvID0gbG5nO1xuICAgIGNvbnN0IGRlZmVycmVkID0gZGVmZXIoKTtcbiAgICB0aGlzLmVtaXQoJ2xhbmd1YWdlQ2hhbmdpbmcnLCBsbmcpO1xuXG4gICAgY29uc3Qgc2V0TG5nUHJvcHMgPSAobCkgPT4ge1xuICAgICAgdGhpcy5sYW5ndWFnZSA9IGw7XG4gICAgICB0aGlzLmxhbmd1YWdlcyA9IHRoaXMuc2VydmljZXMubGFuZ3VhZ2VVdGlscy50b1Jlc29sdmVIaWVyYXJjaHkobCk7XG4gICAgICAvLyBmaW5kIHRoZSBmaXJzdCBsYW5ndWFnZSByZXNvbHZlZCBsYW5ndWFnZVxuICAgICAgdGhpcy5yZXNvbHZlZExhbmd1YWdlID0gdW5kZWZpbmVkO1xuICAgICAgdGhpcy5zZXRSZXNvbHZlZExhbmd1YWdlKGwpO1xuICAgIH07XG5cbiAgICBjb25zdCBkb25lID0gKGVyciwgbCkgPT4ge1xuICAgICAgaWYgKGwpIHtcbiAgICAgICAgc2V0TG5nUHJvcHMobCk7XG4gICAgICAgIHRoaXMudHJhbnNsYXRvci5jaGFuZ2VMYW5ndWFnZShsKTtcbiAgICAgICAgdGhpcy5pc0xhbmd1YWdlQ2hhbmdpbmdUbyA9IHVuZGVmaW5lZDtcbiAgICAgICAgdGhpcy5lbWl0KCdsYW5ndWFnZUNoYW5nZWQnLCBsKTtcbiAgICAgICAgdGhpcy5sb2dnZXIubG9nKCdsYW5ndWFnZUNoYW5nZWQnLCBsKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuaXNMYW5ndWFnZUNoYW5naW5nVG8gPSB1bmRlZmluZWQ7XG4gICAgICB9XG5cbiAgICAgIGRlZmVycmVkLnJlc29sdmUoKC4uLmFyZ3MpID0+IHRoaXMudCguLi5hcmdzKSk7XG4gICAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrKGVyciwgKC4uLmFyZ3MpID0+IHRoaXMudCguLi5hcmdzKSk7XG4gICAgfTtcblxuICAgIGNvbnN0IHNldExuZyA9IGxuZ3MgPT4ge1xuICAgICAgLy8gaWYgZGV0ZWN0ZWQgbG5nIGlzIGZhbHN5LCBzZXQgaXQgdG8gZW1wdHkgYXJyYXksIHRvIG1ha2Ugc3VyZSBhdCBsZWFzdCB0aGUgZmFsbGJhY2tMbmcgd2lsbCBiZSB1c2VkXG4gICAgICBpZiAoIWxuZyAmJiAhbG5ncyAmJiB0aGlzLnNlcnZpY2VzLmxhbmd1YWdlRGV0ZWN0b3IpIGxuZ3MgPSBbXTtcbiAgICAgIC8vIGRlcGVuZGluZyBvbiBBUEkgaW4gZGV0ZWN0b3IgbG5nIGNhbiBiZSBhIHN0cmluZyAob2xkKSBvciBhbiBhcnJheSBvZiBsYW5ndWFnZXMgb3JkZXJlZCBpbiBwcmlvcml0eVxuICAgICAgY29uc3QgbCA9IHR5cGVvZiBsbmdzID09PSAnc3RyaW5nJyA/IGxuZ3MgOiB0aGlzLnNlcnZpY2VzLmxhbmd1YWdlVXRpbHMuZ2V0QmVzdE1hdGNoRnJvbUNvZGVzKGxuZ3MpO1xuXG4gICAgICBpZiAobCkge1xuICAgICAgICBpZiAoIXRoaXMubGFuZ3VhZ2UpIHtcbiAgICAgICAgICBzZXRMbmdQcm9wcyhsKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXRoaXMudHJhbnNsYXRvci5sYW5ndWFnZSkgdGhpcy50cmFuc2xhdG9yLmNoYW5nZUxhbmd1YWdlKGwpO1xuXG4gICAgICAgIGlmICh0aGlzLnNlcnZpY2VzLmxhbmd1YWdlRGV0ZWN0b3IgJiYgdGhpcy5zZXJ2aWNlcy5sYW5ndWFnZURldGVjdG9yLmNhY2hlVXNlckxhbmd1YWdlKSB0aGlzLnNlcnZpY2VzLmxhbmd1YWdlRGV0ZWN0b3IuY2FjaGVVc2VyTGFuZ3VhZ2UobCk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMubG9hZFJlc291cmNlcyhsLCBlcnIgPT4ge1xuICAgICAgICBkb25lKGVyciwgbCk7XG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgaWYgKCFsbmcgJiYgdGhpcy5zZXJ2aWNlcy5sYW5ndWFnZURldGVjdG9yICYmICF0aGlzLnNlcnZpY2VzLmxhbmd1YWdlRGV0ZWN0b3IuYXN5bmMpIHtcbiAgICAgIHNldExuZyh0aGlzLnNlcnZpY2VzLmxhbmd1YWdlRGV0ZWN0b3IuZGV0ZWN0KCkpO1xuICAgIH0gZWxzZSBpZiAoIWxuZyAmJiB0aGlzLnNlcnZpY2VzLmxhbmd1YWdlRGV0ZWN0b3IgJiYgdGhpcy5zZXJ2aWNlcy5sYW5ndWFnZURldGVjdG9yLmFzeW5jKSB7XG4gICAgICBpZiAodGhpcy5zZXJ2aWNlcy5sYW5ndWFnZURldGVjdG9yLmRldGVjdC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgdGhpcy5zZXJ2aWNlcy5sYW5ndWFnZURldGVjdG9yLmRldGVjdCgpLnRoZW4oc2V0TG5nKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuc2VydmljZXMubGFuZ3VhZ2VEZXRlY3Rvci5kZXRlY3Qoc2V0TG5nKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgc2V0TG5nKGxuZyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGRlZmVycmVkO1xuICB9XG5cbiAgZ2V0Rml4ZWRUKGxuZywgbnMsIGtleVByZWZpeCkge1xuICAgIGNvbnN0IGZpeGVkVCA9IChrZXksIG9wdHMsIC4uLnJlc3QpID0+IHtcbiAgICAgIGxldCBvcHRpb25zO1xuICAgICAgaWYgKHR5cGVvZiBvcHRzICE9PSAnb2JqZWN0Jykge1xuICAgICAgICBvcHRpb25zID0gdGhpcy5vcHRpb25zLm92ZXJsb2FkVHJhbnNsYXRpb25PcHRpb25IYW5kbGVyKFtrZXksIG9wdHNdLmNvbmNhdChyZXN0KSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvcHRpb25zID0geyAuLi5vcHRzIH07XG4gICAgICB9XG5cbiAgICAgIG9wdGlvbnMubG5nID0gb3B0aW9ucy5sbmcgfHwgZml4ZWRULmxuZztcbiAgICAgIG9wdGlvbnMubG5ncyA9IG9wdGlvbnMubG5ncyB8fCBmaXhlZFQubG5ncztcbiAgICAgIG9wdGlvbnMubnMgPSBvcHRpb25zLm5zIHx8IGZpeGVkVC5ucztcbiAgICAgIG9wdGlvbnMua2V5UHJlZml4ID0gb3B0aW9ucy5rZXlQcmVmaXggfHwga2V5UHJlZml4IHx8IGZpeGVkVC5rZXlQcmVmaXg7XG5cbiAgICAgIGNvbnN0IGtleVNlcGFyYXRvciA9IHRoaXMub3B0aW9ucy5rZXlTZXBhcmF0b3IgfHwgJy4nO1xuICAgICAgbGV0IHJlc3VsdEtleVxuICAgICAgaWYgKG9wdGlvbnMua2V5UHJlZml4ICYmIEFycmF5LmlzQXJyYXkoa2V5KSkge1xuICAgICAgICByZXN1bHRLZXkgPSBrZXkubWFwKGsgPT4gYCR7b3B0aW9ucy5rZXlQcmVmaXh9JHtrZXlTZXBhcmF0b3J9JHtrfWApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzdWx0S2V5ID0gb3B0aW9ucy5rZXlQcmVmaXggPyBgJHtvcHRpb25zLmtleVByZWZpeH0ke2tleVNlcGFyYXRvcn0ke2tleX1gIDoga2V5O1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXMudChyZXN1bHRLZXksIG9wdGlvbnMpO1xuICAgIH07XG4gICAgaWYgKHR5cGVvZiBsbmcgPT09ICdzdHJpbmcnKSB7XG4gICAgICBmaXhlZFQubG5nID0gbG5nO1xuICAgIH0gZWxzZSB7XG4gICAgICBmaXhlZFQubG5ncyA9IGxuZztcbiAgICB9XG4gICAgZml4ZWRULm5zID0gbnM7XG4gICAgZml4ZWRULmtleVByZWZpeCA9IGtleVByZWZpeDtcbiAgICByZXR1cm4gZml4ZWRUO1xuICB9XG5cbiAgdCguLi5hcmdzKSB7XG4gICAgcmV0dXJuIHRoaXMudHJhbnNsYXRvciAmJiB0aGlzLnRyYW5zbGF0b3IudHJhbnNsYXRlKC4uLmFyZ3MpO1xuICB9XG5cbiAgZXhpc3RzKC4uLmFyZ3MpIHtcbiAgICByZXR1cm4gdGhpcy50cmFuc2xhdG9yICYmIHRoaXMudHJhbnNsYXRvci5leGlzdHMoLi4uYXJncyk7XG4gIH1cblxuICBzZXREZWZhdWx0TmFtZXNwYWNlKG5zKSB7XG4gICAgdGhpcy5vcHRpb25zLmRlZmF1bHROUyA9IG5zO1xuICB9XG5cbiAgaGFzTG9hZGVkTmFtZXNwYWNlKG5zLCBvcHRpb25zID0ge30pIHtcbiAgICBpZiAoIXRoaXMuaXNJbml0aWFsaXplZCkge1xuICAgICAgdGhpcy5sb2dnZXIud2FybignaGFzTG9hZGVkTmFtZXNwYWNlOiBpMThuZXh0IHdhcyBub3QgaW5pdGlhbGl6ZWQnLCB0aGlzLmxhbmd1YWdlcyk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGlmICghdGhpcy5sYW5ndWFnZXMgfHwgIXRoaXMubGFuZ3VhZ2VzLmxlbmd0aCkge1xuICAgICAgdGhpcy5sb2dnZXIud2FybignaGFzTG9hZGVkTmFtZXNwYWNlOiBpMThuLmxhbmd1YWdlcyB3ZXJlIHVuZGVmaW5lZCBvciBlbXB0eScsIHRoaXMubGFuZ3VhZ2VzKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBjb25zdCBsbmcgPSBvcHRpb25zLmxuZyB8fCB0aGlzLnJlc29sdmVkTGFuZ3VhZ2UgfHwgdGhpcy5sYW5ndWFnZXNbMF07XG4gICAgY29uc3QgZmFsbGJhY2tMbmcgPSB0aGlzLm9wdGlvbnMgPyB0aGlzLm9wdGlvbnMuZmFsbGJhY2tMbmcgOiBmYWxzZTtcbiAgICBjb25zdCBsYXN0TG5nID0gdGhpcy5sYW5ndWFnZXNbdGhpcy5sYW5ndWFnZXMubGVuZ3RoIC0gMV07XG5cbiAgICAvLyB3ZSdyZSBpbiBjaW1vZGUgc28gdGhpcyBzaGFsbCBwYXNzXG4gICAgaWYgKGxuZy50b0xvd2VyQ2FzZSgpID09PSAnY2ltb2RlJykgcmV0dXJuIHRydWU7XG5cbiAgICBjb25zdCBsb2FkTm90UGVuZGluZyA9IChsLCBuKSA9PiB7XG4gICAgICBjb25zdCBsb2FkU3RhdGUgPSB0aGlzLnNlcnZpY2VzLmJhY2tlbmRDb25uZWN0b3Iuc3RhdGVbYCR7bH18JHtufWBdO1xuICAgICAgcmV0dXJuIGxvYWRTdGF0ZSA9PT0gLTEgfHwgbG9hZFN0YXRlID09PSAyO1xuICAgIH07XG5cbiAgICAvLyBvcHRpb25hbCBpbmplY3RlZCBjaGVja1xuICAgIGlmIChvcHRpb25zLnByZWNoZWNrKSB7XG4gICAgICBjb25zdCBwcmVSZXN1bHQgPSBvcHRpb25zLnByZWNoZWNrKHRoaXMsIGxvYWROb3RQZW5kaW5nKTtcbiAgICAgIGlmIChwcmVSZXN1bHQgIT09IHVuZGVmaW5lZCkgcmV0dXJuIHByZVJlc3VsdDtcbiAgICB9XG5cbiAgICAvLyBsb2FkZWQgLT4gU1VDQ0VTU1xuICAgIGlmICh0aGlzLmhhc1Jlc291cmNlQnVuZGxlKGxuZywgbnMpKSByZXR1cm4gdHJ1ZTtcblxuICAgIC8vIHdlcmUgbm90IGxvYWRpbmcgYXQgYWxsIC0+IFNFTUkgU1VDQ0VTU1xuICAgIGlmICghdGhpcy5zZXJ2aWNlcy5iYWNrZW5kQ29ubmVjdG9yLmJhY2tlbmQgfHwgKHRoaXMub3B0aW9ucy5yZXNvdXJjZXMgJiYgIXRoaXMub3B0aW9ucy5wYXJ0aWFsQnVuZGxlZExhbmd1YWdlcykpIHJldHVybiB0cnVlO1xuXG4gICAgLy8gZmFpbGVkIGxvYWRpbmcgbnMgLSBidXQgYXQgbGVhc3QgZmFsbGJhY2sgaXMgbm90IHBlbmRpbmcgLT4gU0VNSSBTVUNDRVNTXG4gICAgaWYgKGxvYWROb3RQZW5kaW5nKGxuZywgbnMpICYmICghZmFsbGJhY2tMbmcgfHwgbG9hZE5vdFBlbmRpbmcobGFzdExuZywgbnMpKSkgcmV0dXJuIHRydWU7XG5cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBsb2FkTmFtZXNwYWNlcyhucywgY2FsbGJhY2spIHtcbiAgICBjb25zdCBkZWZlcnJlZCA9IGRlZmVyKCk7XG5cbiAgICBpZiAoIXRoaXMub3B0aW9ucy5ucykge1xuICAgICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjaygpO1xuICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICAgIH1cbiAgICBpZiAodHlwZW9mIG5zID09PSAnc3RyaW5nJykgbnMgPSBbbnNdO1xuXG4gICAgbnMuZm9yRWFjaChuID0+IHtcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMubnMuaW5kZXhPZihuKSA8IDApIHRoaXMub3B0aW9ucy5ucy5wdXNoKG4pO1xuICAgIH0pO1xuXG4gICAgdGhpcy5sb2FkUmVzb3VyY2VzKGVyciA9PiB7XG4gICAgICBkZWZlcnJlZC5yZXNvbHZlKCk7XG4gICAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrKGVycik7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gZGVmZXJyZWQ7XG4gIH1cblxuICBsb2FkTGFuZ3VhZ2VzKGxuZ3MsIGNhbGxiYWNrKSB7XG4gICAgY29uc3QgZGVmZXJyZWQgPSBkZWZlcigpO1xuXG4gICAgaWYgKHR5cGVvZiBsbmdzID09PSAnc3RyaW5nJykgbG5ncyA9IFtsbmdzXTtcbiAgICBjb25zdCBwcmVsb2FkZWQgPSB0aGlzLm9wdGlvbnMucHJlbG9hZCB8fCBbXTtcblxuICAgIGNvbnN0IG5ld0xuZ3MgPSBsbmdzLmZpbHRlcihsbmcgPT4gcHJlbG9hZGVkLmluZGV4T2YobG5nKSA8IDApO1xuICAgIC8vIEV4aXQgZWFybHkgaWYgYWxsIGdpdmVuIGxhbmd1YWdlcyBhcmUgYWxyZWFkeSBwcmVsb2FkZWRcbiAgICBpZiAoIW5ld0xuZ3MubGVuZ3RoKSB7XG4gICAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrKCk7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgfVxuXG4gICAgdGhpcy5vcHRpb25zLnByZWxvYWQgPSBwcmVsb2FkZWQuY29uY2F0KG5ld0xuZ3MpO1xuICAgIHRoaXMubG9hZFJlc291cmNlcyhlcnIgPT4ge1xuICAgICAgZGVmZXJyZWQucmVzb2x2ZSgpO1xuICAgICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjayhlcnIpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIGRlZmVycmVkO1xuICB9XG5cbiAgZGlyKGxuZykge1xuICAgIGlmICghbG5nKSBsbmcgPSB0aGlzLnJlc29sdmVkTGFuZ3VhZ2UgfHwgKHRoaXMubGFuZ3VhZ2VzICYmIHRoaXMubGFuZ3VhZ2VzLmxlbmd0aCA+IDAgPyB0aGlzLmxhbmd1YWdlc1swXSA6IHRoaXMubGFuZ3VhZ2UpO1xuICAgIGlmICghbG5nKSByZXR1cm4gJ3J0bCc7XG5cbiAgICBjb25zdCBydGxMbmdzID0gW1xuICAgICAgJ2FyJyxcbiAgICAgICdzaHUnLFxuICAgICAgJ3NxcicsXG4gICAgICAnc3NoJyxcbiAgICAgICd4YWEnLFxuICAgICAgJ3loZCcsXG4gICAgICAneXVkJyxcbiAgICAgICdhYW8nLFxuICAgICAgJ2FiaCcsXG4gICAgICAnYWJ2JyxcbiAgICAgICdhY20nLFxuICAgICAgJ2FjcScsXG4gICAgICAnYWN3JyxcbiAgICAgICdhY3gnLFxuICAgICAgJ2FjeScsXG4gICAgICAnYWRmJyxcbiAgICAgICdhZHMnLFxuICAgICAgJ2FlYicsXG4gICAgICAnYWVjJyxcbiAgICAgICdhZmInLFxuICAgICAgJ2FqcCcsXG4gICAgICAnYXBjJyxcbiAgICAgICdhcGQnLFxuICAgICAgJ2FyYicsXG4gICAgICAnYXJxJyxcbiAgICAgICdhcnMnLFxuICAgICAgJ2FyeScsXG4gICAgICAnYXJ6JyxcbiAgICAgICdhdXonLFxuICAgICAgJ2F2bCcsXG4gICAgICAnYXloJyxcbiAgICAgICdheWwnLFxuICAgICAgJ2F5bicsXG4gICAgICAnYXlwJyxcbiAgICAgICdiYnonLFxuICAgICAgJ3BnYScsXG4gICAgICAnaGUnLFxuICAgICAgJ2l3JyxcbiAgICAgICdwcycsXG4gICAgICAncGJ0JyxcbiAgICAgICdwYnUnLFxuICAgICAgJ3BzdCcsXG4gICAgICAncHJwJyxcbiAgICAgICdwcmQnLFxuICAgICAgJ3VnJyxcbiAgICAgICd1cicsXG4gICAgICAneWRkJyxcbiAgICAgICd5ZHMnLFxuICAgICAgJ3lpaCcsXG4gICAgICAnamknLFxuICAgICAgJ3lpJyxcbiAgICAgICdoYm8nLFxuICAgICAgJ21lbicsXG4gICAgICAneG1uJyxcbiAgICAgICdmYScsXG4gICAgICAnanByJyxcbiAgICAgICdwZW8nLFxuICAgICAgJ3BlcycsXG4gICAgICAncHJzJyxcbiAgICAgICdkdicsXG4gICAgICAnc2FtJyxcbiAgICAgICdja2InXG4gICAgXTtcblxuICAgIGNvbnN0IGxhbmd1YWdlVXRpbHMgPSAodGhpcy5zZXJ2aWNlcyAmJiB0aGlzLnNlcnZpY2VzLmxhbmd1YWdlVXRpbHMpIHx8IG5ldyBMYW5ndWFnZVV0aWxzKGdldERlZmF1bHRzKCkpIC8vIGZvciB1bmluaXRpYWxpemVkIHVzYWdlXG5cbiAgICByZXR1cm4gcnRsTG5ncy5pbmRleE9mKGxhbmd1YWdlVXRpbHMuZ2V0TGFuZ3VhZ2VQYXJ0RnJvbUNvZGUobG5nKSkgPiAtMSB8fCBsbmcudG9Mb3dlckNhc2UoKS5pbmRleE9mKCctYXJhYicpID4gMVxuICAgICAgPyAncnRsJ1xuICAgICAgOiAnbHRyJztcbiAgfVxuXG4gIHN0YXRpYyBjcmVhdGVJbnN0YW5jZShvcHRpb25zID0ge30sIGNhbGxiYWNrKSB7IHJldHVybiBuZXcgSTE4bihvcHRpb25zLCBjYWxsYmFjaykgfVxuXG4gIGNsb25lSW5zdGFuY2Uob3B0aW9ucyA9IHt9LCBjYWxsYmFjayA9IG5vb3ApIHtcbiAgICBjb25zdCBmb3JrUmVzb3VyY2VTdG9yZSA9IG9wdGlvbnMuZm9ya1Jlc291cmNlU3RvcmU7XG4gICAgaWYgKGZvcmtSZXNvdXJjZVN0b3JlKSBkZWxldGUgb3B0aW9ucy5mb3JrUmVzb3VyY2VTdG9yZTtcbiAgICBjb25zdCBtZXJnZWRPcHRpb25zID0geyAuLi50aGlzLm9wdGlvbnMsIC4uLm9wdGlvbnMsIC4uLnsgaXNDbG9uZTogdHJ1ZSB9IH07XG4gICAgY29uc3QgY2xvbmUgPSBuZXcgSTE4bihtZXJnZWRPcHRpb25zKTtcbiAgICBpZiAoKG9wdGlvbnMuZGVidWcgIT09IHVuZGVmaW5lZCB8fCBvcHRpb25zLnByZWZpeCAhPT0gdW5kZWZpbmVkKSkge1xuICAgICAgY2xvbmUubG9nZ2VyID0gY2xvbmUubG9nZ2VyLmNsb25lKG9wdGlvbnMpO1xuICAgIH1cbiAgICBjb25zdCBtZW1iZXJzVG9Db3B5ID0gWydzdG9yZScsICdzZXJ2aWNlcycsICdsYW5ndWFnZSddO1xuICAgIG1lbWJlcnNUb0NvcHkuZm9yRWFjaChtID0+IHtcbiAgICAgIGNsb25lW21dID0gdGhpc1ttXTtcbiAgICB9KTtcbiAgICBjbG9uZS5zZXJ2aWNlcyA9IHsgLi4udGhpcy5zZXJ2aWNlcyB9O1xuICAgIGNsb25lLnNlcnZpY2VzLnV0aWxzID0ge1xuICAgICAgaGFzTG9hZGVkTmFtZXNwYWNlOiBjbG9uZS5oYXNMb2FkZWROYW1lc3BhY2UuYmluZChjbG9uZSlcbiAgICB9O1xuICAgIGlmIChmb3JrUmVzb3VyY2VTdG9yZSkge1xuICAgICAgY2xvbmUuc3RvcmUgPSBuZXcgUmVzb3VyY2VTdG9yZSh0aGlzLnN0b3JlLmRhdGEsIG1lcmdlZE9wdGlvbnMpO1xuICAgICAgY2xvbmUuc2VydmljZXMucmVzb3VyY2VTdG9yZSA9IGNsb25lLnN0b3JlO1xuICAgIH1cbiAgICBjbG9uZS50cmFuc2xhdG9yID0gbmV3IFRyYW5zbGF0b3IoY2xvbmUuc2VydmljZXMsIG1lcmdlZE9wdGlvbnMpO1xuICAgIGNsb25lLnRyYW5zbGF0b3Iub24oJyonLCAoZXZlbnQsIC4uLmFyZ3MpID0+IHtcbiAgICAgIGNsb25lLmVtaXQoZXZlbnQsIC4uLmFyZ3MpO1xuICAgIH0pO1xuICAgIGNsb25lLmluaXQobWVyZ2VkT3B0aW9ucywgY2FsbGJhY2spO1xuICAgIGNsb25lLnRyYW5zbGF0b3Iub3B0aW9ucyA9IG1lcmdlZE9wdGlvbnM7IC8vIHN5bmMgb3B0aW9uc1xuICAgIGNsb25lLnRyYW5zbGF0b3IuYmFja2VuZENvbm5lY3Rvci5zZXJ2aWNlcy51dGlscyA9IHtcbiAgICAgIGhhc0xvYWRlZE5hbWVzcGFjZTogY2xvbmUuaGFzTG9hZGVkTmFtZXNwYWNlLmJpbmQoY2xvbmUpXG4gICAgfTtcblxuICAgIHJldHVybiBjbG9uZTtcbiAgfVxuXG4gIHRvSlNPTigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgb3B0aW9uczogdGhpcy5vcHRpb25zLFxuICAgICAgc3RvcmU6IHRoaXMuc3RvcmUsXG4gICAgICBsYW5ndWFnZTogdGhpcy5sYW5ndWFnZSxcbiAgICAgIGxhbmd1YWdlczogdGhpcy5sYW5ndWFnZXMsXG4gICAgICByZXNvbHZlZExhbmd1YWdlOiB0aGlzLnJlc29sdmVkTGFuZ3VhZ2VcbiAgICB9O1xuICB9XG59XG5cbmNvbnN0IGluc3RhbmNlID0gSTE4bi5jcmVhdGVJbnN0YW5jZSgpO1xuaW5zdGFuY2UuY3JlYXRlSW5zdGFuY2UgPSBJMThuLmNyZWF0ZUluc3RhbmNlO1xuXG5leHBvcnQgZGVmYXVsdCBpbnN0YW5jZTtcbiIsImltcG9ydCBpMThuZXh0IGZyb20gJy4vaTE4bmV4dC5qcyc7XG5cbmV4cG9ydCBkZWZhdWx0IGkxOG5leHQ7XG5cbmV4cG9ydCBjb25zdCBjcmVhdGVJbnN0YW5jZSA9IGkxOG5leHQuY3JlYXRlSW5zdGFuY2U7XG5cbmV4cG9ydCBjb25zdCBkaXIgPSBpMThuZXh0LmRpcjtcbmV4cG9ydCBjb25zdCBpbml0ID0gaTE4bmV4dC5pbml0O1xuZXhwb3J0IGNvbnN0IGxvYWRSZXNvdXJjZXMgPSBpMThuZXh0LmxvYWRSZXNvdXJjZXM7XG5leHBvcnQgY29uc3QgcmVsb2FkUmVzb3VyY2VzID0gaTE4bmV4dC5yZWxvYWRSZXNvdXJjZXM7XG5leHBvcnQgY29uc3QgdXNlID0gaTE4bmV4dC51c2U7XG5leHBvcnQgY29uc3QgY2hhbmdlTGFuZ3VhZ2UgPSBpMThuZXh0LmNoYW5nZUxhbmd1YWdlO1xuZXhwb3J0IGNvbnN0IGdldEZpeGVkVCA9IGkxOG5leHQuZ2V0Rml4ZWRUO1xuZXhwb3J0IGNvbnN0IHQgPSBpMThuZXh0LnQ7XG5leHBvcnQgY29uc3QgZXhpc3RzID0gaTE4bmV4dC5leGlzdHM7XG5leHBvcnQgY29uc3Qgc2V0RGVmYXVsdE5hbWVzcGFjZSA9IGkxOG5leHQuc2V0RGVmYXVsdE5hbWVzcGFjZTtcbmV4cG9ydCBjb25zdCBoYXNMb2FkZWROYW1lc3BhY2UgPSBpMThuZXh0Lmhhc0xvYWRlZE5hbWVzcGFjZTtcbmV4cG9ydCBjb25zdCBsb2FkTmFtZXNwYWNlcyA9IGkxOG5leHQubG9hZE5hbWVzcGFjZXM7XG5leHBvcnQgY29uc3QgbG9hZExhbmd1YWdlcyA9IGkxOG5leHQubG9hZExhbmd1YWdlcztcbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5hbWVzcGFjZSxcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55LFxuICovXG5cbmltcG9ydCB7XG4gICAgZGVmYXVsdCBhcyBpMThuZXh0LFxuICAgIGkxOG4gYXMgaTE4bmV4dEluc3RhbmNlLFxuICAgIEZhbGxiYWNrTG5nT2JqTGlzdCBhcyBpMThuZXh0RmFsbGJhY2tMbmdPYmpMaXN0LFxuICAgIEZhbGxiYWNrTG5nIGFzIGkxOG5leHRGYWxsYmFja0xuZyxcbiAgICBJbnRlcnBvbGF0aW9uT3B0aW9ucyBhcyBpMThuZXh0SW50ZXJwb2xhdGlvbk9wdGlvbnMsXG4gICAgUmVhY3RPcHRpb25zIGFzIGkxOG5leHRSZWFjdE9wdGlvbnMsXG4gICAgSW5pdE9wdGlvbnMgYXMgaTE4bmV4dEluaXRPcHRpb25zLFxuICAgIFRPcHRpb25zQmFzZSBhcyBpMThuZXh0VE9wdGlvbnNCYXNlLFxuICAgIFRPcHRpb25zIGFzIGkxOG5leHRUT3B0aW9ucyxcbiAgICBFeGlzdHNGdW5jdGlvbiBhcyBpMThuZXh0RXhpc3RzRnVuY3Rpb24sXG4gICAgV2l0aFQgYXMgaTE4bmV4dFdpdGhULFxuICAgIFRGdW5jdGlvbiBhcyBpMThuZXh0VEZ1bmN0aW9uLFxuICAgIFJlc291cmNlIGFzIGkxOG5leHRSZXNvdXJjZSxcbiAgICBSZXNvdXJjZUxhbmd1YWdlIGFzIGkxOG5leHRSZXNvdXJjZUxhbmd1YWdlLFxuICAgIFJlc291cmNlS2V5IGFzIGkxOG5leHRSZXNvdXJjZUtleSxcbiAgICBJbnRlcnBvbGF0b3IgYXMgaTE4bmV4dEludGVycG9sYXRvcixcbiAgICBSZXNvdXJjZVN0b3JlIGFzIGkxOG5leHRSZXNvdXJjZVN0b3JlLFxuICAgIFNlcnZpY2VzIGFzIGkxOG5leHRTZXJ2aWNlcyxcbiAgICBNb2R1bGUgYXMgaTE4bmV4dE1vZHVsZSxcbiAgICBDYWxsYmFja0Vycm9yIGFzIGkxOG5leHRDYWxsYmFja0Vycm9yLFxuICAgIFJlYWRDYWxsYmFjayBhcyBpMThuZXh0UmVhZENhbGxiYWNrLFxuICAgIE11bHRpUmVhZENhbGxiYWNrIGFzIGkxOG5leHRNdWx0aVJlYWRDYWxsYmFjayxcbiAgICBCYWNrZW5kTW9kdWxlIGFzIGkxOG5leHRCYWNrZW5kTW9kdWxlLFxuICAgIExhbmd1YWdlRGV0ZWN0b3JNb2R1bGUgYXMgaTE4bmV4dExhbmd1YWdlRGV0ZWN0b3JNb2R1bGUsXG4gICAgTGFuZ3VhZ2VEZXRlY3RvckFzeW5jTW9kdWxlIGFzIGkxOG5leHRMYW5ndWFnZURldGVjdG9yQXN5bmNNb2R1bGUsXG4gICAgUG9zdFByb2Nlc3Nvck1vZHVsZSBhcyBpMThuZXh0UG9zdFByb2Nlc3Nvck1vZHVsZSxcbiAgICBMb2dnZXJNb2R1bGUgYXMgaTE4bmV4dExvZ2dlck1vZHVsZSxcbiAgICBJMThuRm9ybWF0TW9kdWxlIGFzIGkxOG5leHRJMThuRm9ybWF0TW9kdWxlLFxuICAgIFRoaXJkUGFydHlNb2R1bGUgYXMgaTE4bmV4dFRoaXJkUGFydHlNb2R1bGUsXG4gICAgTW9kdWxlcyBhcyBpMThuZXh0TW9kdWxlcyxcbiAgICBOZXdhYmxlIGFzIGkxOG5leHROZXdhYmxlLFxufSBmcm9tICdpMThuZXh0JztcblxuY29uc3QgaTE4bjogaTE4bi5pMThuID0gaTE4bmV4dDtcblxuZGVjbGFyZSBuYW1lc3BhY2UgaTE4biB7XG4gICAgZXhwb3J0IHR5cGUgaTE4biA9IGkxOG5leHRJbnN0YW5jZTtcbiAgICBleHBvcnQgdHlwZSBGYWxsYmFja0xuZ09iakxpc3QgPSBpMThuZXh0RmFsbGJhY2tMbmdPYmpMaXN0O1xuICAgIGV4cG9ydCB0eXBlIEZhbGxiYWNrTG5nID0gaTE4bmV4dEZhbGxiYWNrTG5nO1xuICAgIGV4cG9ydCB0eXBlIEludGVycG9sYXRpb25PcHRpb25zID0gaTE4bmV4dEludGVycG9sYXRpb25PcHRpb25zO1xuICAgIGV4cG9ydCB0eXBlIFJlYWN0T3B0aW9ucyA9IGkxOG5leHRSZWFjdE9wdGlvbnM7XG4gICAgZXhwb3J0IHR5cGUgSW5pdE9wdGlvbnMgPSBpMThuZXh0SW5pdE9wdGlvbnM7XG4gICAgZXhwb3J0IHR5cGUgVE9wdGlvbnNCYXNlID0gaTE4bmV4dFRPcHRpb25zQmFzZTtcbiAgICBleHBvcnQgdHlwZSBUT3B0aW9uczxUIGV4dGVuZHMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4gPSBSZWNvcmQ8c3RyaW5nLCBhbnk+PiA9IGkxOG5leHRUT3B0aW9uczxUPjtcbiAgICBleHBvcnQgdHlwZSBFeGlzdHNGdW5jdGlvbjxLIGV4dGVuZHMgc3RyaW5nID0gc3RyaW5nLCBUIGV4dGVuZHMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4gPSBSZWNvcmQ8c3RyaW5nLCBhbnk+PiA9IGkxOG5leHRFeGlzdHNGdW5jdGlvbjxLLCBUPjtcbiAgICBleHBvcnQgdHlwZSBXaXRoVCA9IGkxOG5leHRXaXRoVDtcbiAgICBleHBvcnQgdHlwZSBURnVuY3Rpb24gPSBpMThuZXh0VEZ1bmN0aW9uO1xuICAgIGV4cG9ydCB0eXBlIFJlc291cmNlID0gaTE4bmV4dFJlc291cmNlO1xuICAgIGV4cG9ydCB0eXBlIFJlc291cmNlTGFuZ3VhZ2UgPSBpMThuZXh0UmVzb3VyY2VMYW5ndWFnZTtcbiAgICBleHBvcnQgdHlwZSBSZXNvdXJjZUtleSA9IGkxOG5leHRSZXNvdXJjZUtleTtcbiAgICBleHBvcnQgdHlwZSBJbnRlcnBvbGF0b3IgPSBpMThuZXh0SW50ZXJwb2xhdG9yO1xuICAgIGV4cG9ydCB0eXBlIFJlc291cmNlU3RvcmUgPSBpMThuZXh0UmVzb3VyY2VTdG9yZTtcbiAgICBleHBvcnQgdHlwZSBTZXJ2aWNlcyA9IGkxOG5leHRTZXJ2aWNlcztcbiAgICBleHBvcnQgdHlwZSBNb2R1bGUgPSBpMThuZXh0TW9kdWxlO1xuICAgIGV4cG9ydCB0eXBlIENhbGxiYWNrRXJyb3IgPSBpMThuZXh0Q2FsbGJhY2tFcnJvcjtcbiAgICBleHBvcnQgdHlwZSBSZWFkQ2FsbGJhY2sgPSBpMThuZXh0UmVhZENhbGxiYWNrO1xuICAgIGV4cG9ydCB0eXBlIE11bHRpUmVhZENhbGxiYWNrID0gaTE4bmV4dE11bHRpUmVhZENhbGxiYWNrO1xuICAgIGV4cG9ydCB0eXBlIEJhY2tlbmRNb2R1bGU8VCA9IFJlY29yZDxzdHJpbmcsIHVua25vd24+PiA9IGkxOG5leHRCYWNrZW5kTW9kdWxlPFQ+O1xuICAgIGV4cG9ydCB0eXBlIExhbmd1YWdlRGV0ZWN0b3JNb2R1bGUgPSBpMThuZXh0TGFuZ3VhZ2VEZXRlY3Rvck1vZHVsZTtcbiAgICBleHBvcnQgdHlwZSBMYW5ndWFnZURldGVjdG9yQXN5bmNNb2R1bGUgPSBpMThuZXh0TGFuZ3VhZ2VEZXRlY3RvckFzeW5jTW9kdWxlO1xuICAgIGV4cG9ydCB0eXBlIFBvc3RQcm9jZXNzb3JNb2R1bGUgPSBpMThuZXh0UG9zdFByb2Nlc3Nvck1vZHVsZTtcbiAgICBleHBvcnQgdHlwZSBMb2dnZXJNb2R1bGUgPSBpMThuZXh0TG9nZ2VyTW9kdWxlO1xuICAgIGV4cG9ydCB0eXBlIEkxOG5Gb3JtYXRNb2R1bGUgPSBpMThuZXh0STE4bkZvcm1hdE1vZHVsZTtcbiAgICBleHBvcnQgdHlwZSBUaGlyZFBhcnR5TW9kdWxlID0gaTE4bmV4dFRoaXJkUGFydHlNb2R1bGU7XG4gICAgZXhwb3J0IHR5cGUgTW9kdWxlcyA9IGkxOG5leHRNb2R1bGVzO1xuICAgIGV4cG9ydCB0eXBlIE5ld2FibGU8VD4gPSBpMThuZXh0TmV3YWJsZTxUPjtcbn1cblxuZXhwb3J0IHsgaTE4biB9O1xuIl0sIm5hbWVzIjpbInV0aWxzLmdldFBhdGgiLCJ1dGlscy5kZWVwRmluZCIsInV0aWxzLnNldFBhdGgiLCJ1dGlscy5kZWVwRXh0ZW5kIiwidXRpbHMuY29weSIsInV0aWxzLmxvb2tzTGlrZU9iamVjdFBhdGgiLCJ1dGlscy5nZXRQYXRoV2l0aERlZmF1bHRzIiwidXRpbHMuZXNjYXBlIiwidXRpbHMucmVnZXhFc2NhcGUiLCJ1dGlscy5tYWtlU3RyaW5nIiwidXRpbHMucHVzaFBhdGgiLCJnZXREZWZhdWx0cyIsIkxhbmd1YWdlVXRpbHMiLCJCYWNrZW5kQ29ubmVjdG9yIiwiaTE4bmV4dCJdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFBQSxNQUFNLGFBQWEsR0FBRztBQUN0QixFQUFFLElBQUksRUFBRSxRQUFRO0FBQ2hCO0FBQ0EsRUFBRSxHQUFHLENBQUMsSUFBSSxFQUFFO0FBQ1osSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQztBQUM3QixHQUFHO0FBQ0g7QUFDQSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUU7QUFDYixJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO0FBQzlCLEdBQUc7QUFDSDtBQUNBLEVBQUUsS0FBSyxDQUFDLElBQUksRUFBRTtBQUNkLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDL0IsR0FBRztBQUNIO0FBQ0EsRUFBRSxNQUFNLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRTtBQUNyQjtBQUNBLElBQUksSUFBSSxPQUFPLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDO0FBQ3JFLEdBQUc7QUFDSCxDQUFDLENBQUM7QUFDRjtBQUNBLE1BQU0sTUFBTSxDQUFDO0FBQ2IsRUFBRSxXQUFXLENBQUMsY0FBYyxFQUFFLE9BQU8sR0FBRyxFQUFFLEVBQUU7QUFDNUMsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxPQUFPLENBQUMsQ0FBQztBQUN2QyxHQUFHO0FBQ0g7QUFDQSxFQUFFLElBQUksQ0FBQyxjQUFjLEVBQUUsT0FBTyxHQUFHLEVBQUUsRUFBRTtBQUNyQyxJQUFJLElBQUksQ0FBQyxNQUFNLEdBQUcs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QU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUM7QUFDekQsRUFBRSxJQUFJLEdBQUcsS0FBSyxTQUFTLElBQUksSUFBSSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7QUFDOUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsUUFBUSxDQUFDO0FBQ3RCLElBQUksT0FBTztBQUNYLEdBQUc7QUFDSDtBQUNBLEVBQUUsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7QUFDaEMsRUFBRSxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBQ3pDLEVBQUUsSUFBSSxJQUFJLEdBQUcsYUFBYSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUM7QUFDOUMsRUFBRSxPQUFPLElBQUksQ0FBQyxHQUFHLEtBQUssU0FBUyxJQUFJLENBQUMsQ0FBQyxNQUFNLEVBQUU7QUFDN0MsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2xDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7QUFDakMsSUFBSSxJQUFJLEdBQUcsYUFBYSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUM7QUFDNUMsSUFBSSxJQUFJLElBQUksSUFBSSxJQUFJLENBQUMsR0FBRyxJQUFJLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLFdBQVcsRUFBRTtBQUMvRSxNQUFNLElBQUksQ0FBQyxH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LENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDO0FBQ2pHLE9BQU8sTUFBTSxJQUFJLENBQUMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO0FBQ2pDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQztBQUNsQztBQUNBO0FBQ0EsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUM7QUFDekQsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxLQUFLLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQztBQUMzRTtBQUNBLFFBQVEsSUFBSSxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUM7QUFDakcsUUFBUSxJQUFJLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQztBQUNqRyxPQUFPO0FBQ1A7QUFDQSxNQUFNLE9B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SSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRTtBQUN4RDtBQUNBLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUk7QUFDeEUsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUk7QUFDaEUsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUk7QUFDakYsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUs7QUFDdEUsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFO0FBQ3JGO0FBQ0EsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUk7QUFDN0UsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUU7QUFDcEU7QUFDQSxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRTtBQUM1RTtBQUNBLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUU7QUFDL0MsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUU7QUFDM0MsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUU7QUFDNUMsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUU7QUFDeEMsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFO0FBQ3BDLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRTtBQUM1QyxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRTtBQUMxQyxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUU7QUFDckMsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFO0FBQ3JDLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFO0FBQ3pDLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUU7QUFDeEMsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRTtBQUN2QyxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUU7QUFDckMsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLEtBQUssQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRTtBQUN4QyxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRTtBQUMzQyxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUU7QUFDcEMsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRTtBQUN4QyxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRTtBQUN6QyxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUU7QUFDaEQsRUFBQztBQUNEO0FBQ0EsSUFBSSxrQkFBa0IsR0FBRztBQUN6QixFQUFFLENBQUMsRUFBRSxTQUFTLENBQUMsRUFBRSxDQUFDLE9BQU8sTUFBTSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3hDLEVBQUUsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxFQUFFLENBQUMsT0FBTyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDekMsRUFBRSxDQUFDLEVBQUUsU0FBUyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO0FBQzVCLEVBQUUsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxFQUFFLENBQUMsT0FBTyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbkgsRUFBRSxDQUFDLEVBQUUsU0FBUyxDQUFDLEVBQUUsQ0FBQyxPQUFPLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDakgsRUFBRSxDQUFDLEVBQUUsU0FBUyxDQUFDLEVBQUUsQ0FBQyxPQUFPLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3RFLEVBQUUsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxFQUFFLENBQUMsT0FBTyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNuRyxFQUFFLENBQUMsRUFBRSxTQUFTLENBQUMsRUFBRSxDQUFDLE9BQU8sTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN4RixFQUFFLENBQUMsRUFBRSxTQUFTLENBQUMsRUFBRSxDQUFDLE9BQU8sTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3pDLEVBQUUsRUFBRSxFQUFFLFNBQVMsQ0FBQyxFQUFFLENBQUMsT0FBTyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQztBQUNqRixFQUFFLEVBQUUsRUFBRSxTQUFTLENBQUMsRUFBRSxDQUFDLE9BQU8sTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDekcsRUFBRSxFQUFFLEVBQUUsU0FBUyxDQUFDLEVBQUUsQ0FBQyxPQUFPLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDeEQsRUFBRSxFQUFFLEVBQUUsU0FBUyxDQUFDLEVBQUUsQ0FBQyxPQUFPLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMzQyxFQUFFLEVBQUUsRUFBRSxTQUFTLENBQUMsRUFBRSxDQUFDLE9BQU8sTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDOUUsRUFBRSxFQUFFLEVBQUUsU0FBUyxDQUFDLEVBQUUsQ0FBQyxPQUFPLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN6RyxFQUFFLEVBQUUsRUFBRSxTQUFTLENBQUMsRUFBRSxDQUFDLE9BQU8sTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxHQUFHLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzlFLEVBQUUsRUFBRSxFQUFFLFNBQVMsQ0FBQyxFQUFFLENBQUMsT0FBTyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN4RSxFQUFFLEVBQUUsRUFBRSxTQUFTLENBQUMsRUFBRSxDQUFDLE9BQU8sTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDM0QsRUFBRSxFQUFFLEVBQUUsU0FBUyxDQUFDLEVBQUUsQ0FBQyxPQUFPLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbkgsRUFBRSxFQUFFLEVBQUUsU0FBUyxDQUFDLEVBQUUsQ0FBQyxPQUFPLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FB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QUcsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLEtBQUssSUFBSSxDQUFDLFNBQVMsSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDL0gsSUFBSSxJQUFJLENBQUMsR0FBRyxFQUFFLE9BQU8sS0FBSyxDQUFDO0FBQzNCO0FBQ0EsSUFBSSxNQUFNLE9BQU8sR0FBRztBQUNwQixNQUFNLElBQUk7QUFDVixNQUFNLEtBQUs7QUFDWCxNQUFNLEtBQUs7QUFDWCxNQUFNLEtBQUs7QUFDWCxNQUFNLEtBQUs7QUFDWCxNQUFNLEtBQUs7QUFDWCxNQUFNLEtBQUs7QUFDWCxNQUFNLEtBQUs7QUFDWCxNQUFNLEtBQUs7QUFDWCxNQUFNLEtBQUs7QUFDWCxNQUFNLEtBQUs7QUFDWCxNQUFNLEtBQUs7QUFDWCxNQUFNLEtBQUs7QUFDWCxNQUFNLEtBQUs7QUFDWCxNQUFNLEtBQUs7QUFDWCxNQUFNLEtBQUs7QUFDWCxNQUFNLEtBQUs7QUFDWCxNQUFNLEtBQUs7QUFDWCxNQUFNLEtBQUs7QUFDWCxNQUFNLEtBQUs7QUFDWCxNQUFNLEtBQUs7QUFDWCxNQUFNLEtBQUs7QUFDWCxNQUFNLEtBQUs7QUFDWCxNQUFNLEtBQUs7QUFDWCxNQUFNLEtBQUs7QUFDWCxNQUFNLEtBQUs7QUFDWCxNQUFNLEtBQUs7QUFDWCxNQUFNLEtBQUs7QUFDWCxNQUFNLEtBQUs7QUFDWCxNQUFNLEtBQUs7QUFDWCxNQUFNLEtBQUs7QUFDWCxNQUFNLEtBQUs7QUFDWCxNQUFNLEtBQUs7QUFDWCxNQUFNLEtBQUs7QUFDWCxNQUFNLEtBQUs7QUFDWCxNQUFNLEtBQUs7QUFDWCxNQUFNLElBQUk7QUFDVixNQUFNLElBQUk7QUFDVixNQUFNLElBQUk7QUFDVixNQUFNLEtBQUs7QUFDWCxNQUFNLEtBQUs7QUFDWCxNQUFNLEtBQUs7QUFDWCxNQUFNLEtBQUs7QUFDWCxNQUFNLEtBQUs7QUFDWCxNQUFNLElB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VUFBVSxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsYUFBYSxDQUFDLENBQUM7QUFDckUsSUFBSSxLQUFLLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxLQUFLLEVBQUUsR0FBRyxJQUFJLEtBQUs7QUFDakQsTUFBTSxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDO0FBQ2pDLEtBQUssQ0FBQyxDQUFDO0FBQ1AsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxRQUFRLENBQUMsQ0FBQztBQUN4QyxJQUFJLEtBQUssQ0FBQyxVQUFVLENBQUMsT0FBTyxHQUFHLGFBQWEsQ0FBQztBQUM3QyxJQUFJLEtBQUssQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLEtBQUssR0FBRztBQUN2RCxNQUFNLGtCQUFrQixFQUFFLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDO0FBQzlELEtBQUssQ0FBQztBQUNOO0FBQ0EsSUFBSSxPQUFPLEtBQUssQ0FBQztBQUNqQixHQUFHO0FBQ0g7QUFDQSxFQUFFLE1BQU0sR0FBRztBQUNYLElBQUksT0FBTztBQUNYLE1BQU0sT0FBTyxFQUFFLElBQUksQ0FBQyxPQUFPO0FBQzNCLE1BQU0sS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLO0FBQ3ZCLE1BQU0sUUFBUSxFQUFFLElBQUksQ0FBQyxRQUFRO0FBQzdCLE1BQU0sU0FBUyxFQUFFLElBQUksQ0FBQyxTQUFTO0FBQy9CLE1BQU0sZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLGdCQUFnQjtBQUM3QyxLQUFLLENBQUM7QUFDTixHQUFHO0FBQ0gsQ0FBQztBQUNEO0FBQ0EsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO0FBQ3ZDLFFBQVEsQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFDLGNBQWM7O0FDbm5CZkcsUUFBTyxDQUFDLGVBQWU7QUFDckQ7QUFDbUJBLFFBQU8sQ0FBQyxJQUFJO0FBQ1hBLFFBQU8sQ0FBQyxLQUFLO0FBQ0pBLFFBQU8sQ0FBQyxjQUFjO0FBQ3BCQSxRQUFPLENBQUMsZ0JBQWdCO0FBQ3BDQSxRQUFPLENBQUMsSUFBSTtBQUNEQSxRQUFPLENBQUMsZUFBZTtBQUM1QkEsUUFBTyxDQUFDLFVBQVU7QUFDMUJBLFFBQU8sQ0FBQyxFQUFFO0FBQ0xBLFFBQU8sQ0FBQyxPQUFPO0FBQ0ZBLFFBQU8sQ0FBQyxvQkFBb0I7QUFDN0JBLFFBQU8sQ0FBQyxtQkFBbUI7QUFDL0JBLFFBQU8sQ0FBQyxlQUFlO0FBQ3hCQSxRQUFPLENBQUM7O0FDbEJyQzs7O0FBR0c7QUFvQ0csTUFBQSxJQUFJLEdBQWNBOzs7OyIsInhfZ29vZ2xlX2lnbm9yZUxpc3QiOlswLDEsMiwzLDQsNSw2LDcsOCw5LDEwLDExLDEyLDEzXSwic291cmNlUm9vdCI6ImNkcDovLy9AY2RwL2V4dGVuc2lvbi1pMThuLyJ9