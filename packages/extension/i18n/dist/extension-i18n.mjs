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
  /* eslint prefer-template: 0 */
  return '' + object;
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
  key && key.indexOf('###') > -1 ? key.replace(lastOfPathSeparatorRegExp, '.') : key;

const canNotTraverseDeeper = (object) => !object || typeof object === 'string';

const getLastOfPath = (object, path, Empty) => {
  const stack = typeof path !== 'string' ? path : path.split('.');
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
    if (last && last.obj && typeof last.obj[`${last.k}.${e}`] !== 'undefined') {
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
};

const regexEscape = (str) =>
  /* eslint no-useless-escape: 0 */
  str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');

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

const escape = (data) => {
  if (typeof data === 'string') {
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
};

const getCleanedCode = (code) => {
  if (code && code.indexOf('_') > 0) return code.replace('_', '-');
  return code;
};

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
      if (typeof resources[m] === 'string' || Array.isArray(resources[m]))
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
      !(typeof joinArrays === 'string' && Array.isArray(res))
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
        const resTypeIsArray = Array.isArray(res);
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
    } else if (handleAsObjectInI18nFormat && typeof joinArrays === 'string' && Array.isArray(res)) {
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
      res = this.interpolator.interpolate(
        res,
        data,
        options.lng || this.language || resolved.usedLng,
        options,
      );

      // nesting
      if (skipOnVariables) {
        const na = res.match(this.interpolator.nestingRegexp);
        // has nesting after interpolation
        const nestAft = na && na.length;
        if (nestBef < nestAft) options.nest = false;
      }
      if (!options.lng && this.options.compatibilityAPI !== 'v1' && resolved && resolved.res)
        options.lng = this.language || resolved.usedLng;
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

const capitalize = (string) => string.charAt(0).toUpperCase() + string.slice(1);

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
  1: (n) => Number(n > 1),
  2: (n) => Number(n != 1),
  3: (n) => 0,
  4: (n) => Number(n%10==1 && n%100!=11 ? 0 : n%10>=2 && n%10<=4 && (n%100<10 || n%100>=20) ? 1 : 2),
  5: (n) => Number(n==0 ? 0 : n==1 ? 1 : n==2 ? 2 : n%100>=3 && n%100<=10 ? 3 : n%100>=11 ? 4 : 5),
  6: (n) => Number((n==1) ? 0 : (n>=2 && n<=4) ? 1 : 2),
  7: (n) => Number(n==1 ? 0 : n%10>=2 && n%10<=4 && (n%100<10 || n%100>=20) ? 1 : 2),
  8: (n) => Number((n==1) ? 0 : (n==2) ? 1 : (n != 8 && n != 11) ? 2 : 3),
  9: (n) => Number(n >= 2),
  10: (n) => Number(n==1 ? 0 : n==2 ? 1 : n<7 ? 2 : n<11 ? 3 : 4),
  11: (n) => Number((n==1 || n==11) ? 0 : (n==2 || n==12) ? 1 : (n > 2 && n < 20) ? 2 : 3),
  12: (n) => Number(n%10!=1 || n%100==11),
  13: (n) => Number(n !== 0),
  14: (n) => Number((n==1) ? 0 : (n==2) ? 1 : (n == 3) ? 2 : 3),
  15: (n) => Number(n%10==1 && n%100!=11 ? 0 : n%10>=2 && (n%100<10 || n%100>=20) ? 1 : 2),
  16: (n) => Number(n%10==1 && n%100!=11 ? 0 : n !== 0 ? 1 : 2),
  17: (n) => Number(n==1 || n%10==1 && n%100!=11 ? 0 : 1),
  18: (n) => Number(n==0 ? 0 : n==1 ? 1 : 2),
  19: (n) => Number(n==1 ? 0 : n==0 || ( n%100>1 && n%100<11) ? 1 : (n%100>10 && n%100<20 ) ? 2 : 3),
  20: (n) => Number(n==1 ? 0 : (n==0 || (n%100 > 0 && n%100 < 20)) ? 1 : 2),
  21: (n) => Number(n%100==1 ? 1 : n%100==2 ? 2 : n%100==3 || n%100==4 ? 3 : 0),
  22: (n) => Number(n==1 ? 0 : n==2 ? 1 : (n<0 || n>10) && n%10==0 ? 2 : 3)
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

const createRules = () => {
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
};

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

    // Cache calls to Intl.PluralRules, since repeated calls can be slow in runtimes like React Native
    // and the memory usage difference is negligible
    this.pluralRulesCache = {};
  }

  addRule(lng, obj) {
    this.rules[lng] = obj;
  }

  clearCache() {
    this.pluralRulesCache = {};
  }

  getRule(code, options = {}) {
    if (this.shouldUseIntlApi()) {
      try {
        const cleanedCode = getCleanedCode(code === 'dev' ? 'en' : code);
        const type = options.ordinal ? 'ordinal' : 'cardinal';
        const cacheKey = JSON.stringify({ cleanedCode, type });
        if (cacheKey in this.pluralRulesCache) {
          return this.pluralRulesCache[cacheKey];
        }
        const rule = new Intl.PluralRules(cleanedCode, { type });
        this.pluralRulesCache[cacheKey] = rule;
        return rule;
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

const deepFindWithDefaults = (
  data,
  defaultData,
  key,
  keySeparator = '.',
  ignoreJSONStructure = true,
) => {
  let path = getPathWithDefaults(data, defaultData, key);
  if (!path && ignoreJSONStructure && typeof key === 'string') {
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
    this.format = (options.interpolation && options.interpolation.format) || ((value) => value);
    this.init(options);
  }

  /* eslint no-param-reassign: 0 */
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

    this.unescapePrefix = unescapeSuffix ? '' : unescapePrefix || '-';
    this.unescapeSuffix = this.unescapePrefix ? '' : unescapeSuffix || '';

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
    const handleHasOptions = (key, inheritedOptions) => {
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
      if (clonedOptions.defaultValue && clonedOptions.defaultValue.indexOf(this.prefix) > -1)
        delete clonedOptions.defaultValue;
      return key;
    };

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

const parseFormatStr = (formatStr) => {
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
          // eslint-disable-next-line no-restricted-globals
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
  return (val, lng, options) => {
    let optForCache = options;
    // this cache optimization will only work for keys having 1 interpolated value
    if (
      options &&
      options.interpolationkey &&
      options.formatParams &&
      options.formatParams[options.interpolationkey] &&
      options[options.interpolationkey]
    ) {
      optForCache = {
        ...optForCache,
        [options.interpolationkey]: undefined,
      };
    }
    const key = lng + JSON.stringify(optForCache);
    let formatter = cache[key];
    if (!formatter) {
      formatter = fn(getCleanedCode(lng), options);
      cache[key] = formatter;
    }
    return formatter(val);
  };
};

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
    if (
      formats.length > 1 &&
      formats[0].indexOf('(') > 1 &&
      formats[0].indexOf(')') < 0 &&
      formats.find((f) => f.indexOf(')') > -1)
    ) {
      const lastIndex = formats.findIndex((f) => f.indexOf(')') > -1);
      formats[0] = [formats[0], ...formats.splice(1, lastIndex)].join(this.formatSeparator);
    }

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

const get = () => ({
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
  overloadTranslationOptionHandler: (args) => {
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
});

/* eslint no-param-reassign: 0 */
const transformOptions = (options) => {
  // create namespace object if namespace is passed in as string
  if (typeof options.ns === 'string') options.ns = [options.ns];
  if (typeof options.fallbackLng === 'string') options.fallbackLng = [options.fallbackLng];
  if (typeof options.fallbackNS === 'string') options.fallbackNS = [options.fallbackNS];

  // extend supportedLngs with cimode
  if (options.supportedLngs && options.supportedLngs.indexOf('cimode') < 0) {
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
      if (options.keyPrefix !== '') options.keyPrefix = options.keyPrefix || keyPrefix || fixedT.keyPrefix;

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

    const newLngs = lngs.filter(lng => preloaded.indexOf(lng) < 0 && this.services.languageUtils.isSupportedCode(lng));
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uLWkxOG4ubWpzIiwic291cmNlcyI6WyJpMThuZXh0L3NyYy9sb2dnZXIuanMiLCJpMThuZXh0L3NyYy9FdmVudEVtaXR0ZXIuanMiLCJpMThuZXh0L3NyYy91dGlscy5qcyIsImkxOG5leHQvc3JjL1Jlc291cmNlU3RvcmUuanMiLCJpMThuZXh0L3NyYy9wb3N0UHJvY2Vzc29yLmpzIiwiaTE4bmV4dC9zcmMvVHJhbnNsYXRvci5qcyIsImkxOG5leHQvc3JjL0xhbmd1YWdlVXRpbHMuanMiLCJpMThuZXh0L3NyYy9QbHVyYWxSZXNvbHZlci5qcyIsImkxOG5leHQvc3JjL0ludGVycG9sYXRvci5qcyIsImkxOG5leHQvc3JjL0Zvcm1hdHRlci5qcyIsImkxOG5leHQvc3JjL0JhY2tlbmRDb25uZWN0b3IuanMiLCJpMThuZXh0L3NyYy9kZWZhdWx0cy5qcyIsImkxOG5leHQvc3JjL2kxOG5leHQuanMiLCJpMThuZXh0L3NyYy9pbmRleC5qcyIsImluZGV4LnRzIl0sInNvdXJjZXNDb250ZW50IjpbImNvbnN0IGNvbnNvbGVMb2dnZXIgPSB7XG4gIHR5cGU6ICdsb2dnZXInLFxuXG4gIGxvZyhhcmdzKSB7XG4gICAgdGhpcy5vdXRwdXQoJ2xvZycsIGFyZ3MpO1xuICB9LFxuXG4gIHdhcm4oYXJncykge1xuICAgIHRoaXMub3V0cHV0KCd3YXJuJywgYXJncyk7XG4gIH0sXG5cbiAgZXJyb3IoYXJncykge1xuICAgIHRoaXMub3V0cHV0KCdlcnJvcicsIGFyZ3MpO1xuICB9LFxuXG4gIG91dHB1dCh0eXBlLCBhcmdzKSB7XG4gICAgLyogZXNsaW50IG5vLWNvbnNvbGU6IDAgKi9cbiAgICBpZiAoY29uc29sZSAmJiBjb25zb2xlW3R5cGVdKSBjb25zb2xlW3R5cGVdLmFwcGx5KGNvbnNvbGUsIGFyZ3MpO1xuICB9LFxufTtcblxuY2xhc3MgTG9nZ2VyIHtcbiAgY29uc3RydWN0b3IoY29uY3JldGVMb2dnZXIsIG9wdGlvbnMgPSB7fSkge1xuICAgIHRoaXMuaW5pdChjb25jcmV0ZUxvZ2dlciwgb3B0aW9ucyk7XG4gIH1cblxuICBpbml0KGNvbmNyZXRlTG9nZ2VyLCBvcHRpb25zID0ge30pIHtcbiAgICB0aGlzLnByZWZpeCA9IG9wdGlvbnMucHJlZml4IHx8ICdpMThuZXh0Oic7XG4gICAgdGhpcy5sb2dnZXIgPSBjb25jcmV0ZUxvZ2dlciB8fCBjb25zb2xlTG9nZ2VyO1xuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG4gICAgdGhpcy5kZWJ1ZyA9IG9wdGlvbnMuZGVidWc7XG4gIH1cblxuICBsb2coLi4uYXJncykge1xuICAgIHJldHVybiB0aGlzLmZvcndhcmQoYXJncywgJ2xvZycsICcnLCB0cnVlKTtcbiAgfVxuXG4gIHdhcm4oLi4uYXJncykge1xuICAgIHJldHVybiB0aGlzLmZvcndhcmQoYXJncywgJ3dhcm4nLCAnJywgdHJ1ZSk7XG4gIH1cblxuICBlcnJvciguLi5hcmdzKSB7XG4gICAgcmV0dXJuIHRoaXMuZm9yd2FyZChhcmdzLCAnZXJyb3InLCAnJyk7XG4gIH1cblxuICBkZXByZWNhdGUoLi4uYXJncykge1xuICAgIHJldHVybiB0aGlzLmZvcndhcmQoYXJncywgJ3dhcm4nLCAnV0FSTklORyBERVBSRUNBVEVEOiAnLCB0cnVlKTtcbiAgfVxuXG4gIGZvcndhcmQoYXJncywgbHZsLCBwcmVmaXgsIGRlYnVnT25seSkge1xuICAgIGlmIChkZWJ1Z09ubHkgJiYgIXRoaXMuZGVidWcpIHJldHVybiBudWxsO1xuICAgIGlmICh0eXBlb2YgYXJnc1swXSA9PT0gJ3N0cmluZycpIGFyZ3NbMF0gPSBgJHtwcmVmaXh9JHt0aGlzLnByZWZpeH0gJHthcmdzWzBdfWA7XG4gICAgcmV0dXJuIHRoaXMubG9nZ2VyW2x2bF0oYXJncyk7XG4gIH1cblxuICBjcmVhdGUobW9kdWxlTmFtZSkge1xuICAgIHJldHVybiBuZXcgTG9nZ2VyKHRoaXMubG9nZ2VyLCB7XG4gICAgICAuLi57IHByZWZpeDogYCR7dGhpcy5wcmVmaXh9OiR7bW9kdWxlTmFtZX06YCB9LFxuICAgICAgLi4udGhpcy5vcHRpb25zLFxuICAgIH0pO1xuICB9XG5cbiAgY2xvbmUob3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHRoaXMub3B0aW9ucztcbiAgICBvcHRpb25zLnByZWZpeCA9IG9wdGlvbnMucHJlZml4IHx8IHRoaXMucHJlZml4O1xuICAgIHJldHVybiBuZXcgTG9nZ2VyKHRoaXMubG9nZ2VyLCBvcHRpb25zKTtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBuZXcgTG9nZ2VyKCk7XG4iLCJjbGFzcyBFdmVudEVtaXR0ZXIge1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICAvLyBUaGlzIGlzIGFuIE9iamVjdCBjb250YWluaW5nIE1hcHM6XG4gICAgLy9cbiAgICAvLyB7IFtldmVudDogc3RyaW5nXTogTWFwPGxpc3RlbmVyOiBmdW5jdGlvbiwgbnVtVGltZXNBZGRlZDogbnVtYmVyPiB9XG4gICAgLy9cbiAgICAvLyBXZSB1c2UgYSBNYXAgZm9yIE8oMSkgaW5zZXJ0aW9uL2RlbGV0aW9uIGFuZCBiZWNhdXNlIGl0IGNhbiBoYXZlIGZ1bmN0aW9ucyBhcyBrZXlzLlxuICAgIC8vXG4gICAgLy8gV2Uga2VlcCB0cmFjayBvZiBudW1UaW1lc0FkZGVkICh0aGUgbnVtYmVyIG9mIHRpbWVzIGl0IHdhcyBhZGRlZCkgYmVjYXVzZSBpZiB5b3UgYXR0YWNoIHRoZSBzYW1lIGxpc3RlbmVyIHR3aWNlLFxuICAgIC8vIHdlIHNob3VsZCBhY3R1YWxseSBjYWxsIGl0IHR3aWNlIGZvciBlYWNoIGVtaXR0ZWQgZXZlbnQuXG4gICAgdGhpcy5vYnNlcnZlcnMgPSB7fTtcbiAgfVxuXG4gIG9uKGV2ZW50cywgbGlzdGVuZXIpIHtcbiAgICBldmVudHMuc3BsaXQoJyAnKS5mb3JFYWNoKChldmVudCkgPT4ge1xuICAgICAgaWYgKCF0aGlzLm9ic2VydmVyc1tldmVudF0pIHRoaXMub2JzZXJ2ZXJzW2V2ZW50XSA9IG5ldyBNYXAoKTtcbiAgICAgIGNvbnN0IG51bUxpc3RlbmVycyA9IHRoaXMub2JzZXJ2ZXJzW2V2ZW50XS5nZXQobGlzdGVuZXIpIHx8IDA7XG4gICAgICB0aGlzLm9ic2VydmVyc1tldmVudF0uc2V0KGxpc3RlbmVyLCBudW1MaXN0ZW5lcnMgKyAxKTtcbiAgICB9KTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIG9mZihldmVudCwgbGlzdGVuZXIpIHtcbiAgICBpZiAoIXRoaXMub2JzZXJ2ZXJzW2V2ZW50XSkgcmV0dXJuO1xuICAgIGlmICghbGlzdGVuZXIpIHtcbiAgICAgIGRlbGV0ZSB0aGlzLm9ic2VydmVyc1tldmVudF07XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5vYnNlcnZlcnNbZXZlbnRdLmRlbGV0ZShsaXN0ZW5lcik7XG4gIH1cblxuICBlbWl0KGV2ZW50LCAuLi5hcmdzKSB7XG4gICAgaWYgKHRoaXMub2JzZXJ2ZXJzW2V2ZW50XSkge1xuICAgICAgY29uc3QgY2xvbmVkID0gQXJyYXkuZnJvbSh0aGlzLm9ic2VydmVyc1tldmVudF0uZW50cmllcygpKTtcbiAgICAgIGNsb25lZC5mb3JFYWNoKChbb2JzZXJ2ZXIsIG51bVRpbWVzQWRkZWRdKSA9PiB7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbnVtVGltZXNBZGRlZDsgaSsrKSB7XG4gICAgICAgICAgb2JzZXJ2ZXIoLi4uYXJncyk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm9ic2VydmVyc1snKiddKSB7XG4gICAgICBjb25zdCBjbG9uZWQgPSBBcnJheS5mcm9tKHRoaXMub2JzZXJ2ZXJzWycqJ10uZW50cmllcygpKTtcbiAgICAgIGNsb25lZC5mb3JFYWNoKChbb2JzZXJ2ZXIsIG51bVRpbWVzQWRkZWRdKSA9PiB7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbnVtVGltZXNBZGRlZDsgaSsrKSB7XG4gICAgICAgICAgb2JzZXJ2ZXIuYXBwbHkob2JzZXJ2ZXIsIFtldmVudCwgLi4uYXJnc10pO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgRXZlbnRFbWl0dGVyO1xuIiwiLy8gaHR0cDovL2xlYS52ZXJvdS5tZS8yMDE2LzEyL3Jlc29sdmUtcHJvbWlzZXMtZXh0ZXJuYWxseS13aXRoLXRoaXMtb25lLXdlaXJkLXRyaWNrL1xuZXhwb3J0IGNvbnN0IGRlZmVyID0gKCkgPT4ge1xuICBsZXQgcmVzO1xuICBsZXQgcmVqO1xuXG4gIGNvbnN0IHByb21pc2UgPSBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgcmVzID0gcmVzb2x2ZTtcbiAgICByZWogPSByZWplY3Q7XG4gIH0pO1xuXG4gIHByb21pc2UucmVzb2x2ZSA9IHJlcztcbiAgcHJvbWlzZS5yZWplY3QgPSByZWo7XG5cbiAgcmV0dXJuIHByb21pc2U7XG59O1xuXG5leHBvcnQgY29uc3QgbWFrZVN0cmluZyA9IChvYmplY3QpID0+IHtcbiAgaWYgKG9iamVjdCA9PSBudWxsKSByZXR1cm4gJyc7XG4gIC8qIGVzbGludCBwcmVmZXItdGVtcGxhdGU6IDAgKi9cbiAgcmV0dXJuICcnICsgb2JqZWN0O1xufTtcblxuZXhwb3J0IGNvbnN0IGNvcHkgPSAoYSwgcywgdCkgPT4ge1xuICBhLmZvckVhY2goKG0pID0+IHtcbiAgICBpZiAoc1ttXSkgdFttXSA9IHNbbV07XG4gIH0pO1xufTtcblxuLy8gV2UgZXh0cmFjdCBvdXQgdGhlIFJlZ0V4cCBkZWZpbml0aW9uIHRvIGltcHJvdmUgcGVyZm9ybWFuY2Ugd2l0aCBSZWFjdCBOYXRpdmUgQW5kcm9pZCwgd2hpY2ggaGFzIHBvb3IgUmVnRXhwXG4vLyBpbml0aWFsaXphdGlvbiBwZXJmb3JtYW5jZVxuY29uc3QgbGFzdE9mUGF0aFNlcGFyYXRvclJlZ0V4cCA9IC8jIyMvZztcblxuY29uc3QgY2xlYW5LZXkgPSAoa2V5KSA9PlxuICBrZXkgJiYga2V5LmluZGV4T2YoJyMjIycpID4gLTEgPyBrZXkucmVwbGFjZShsYXN0T2ZQYXRoU2VwYXJhdG9yUmVnRXhwLCAnLicpIDoga2V5O1xuXG5jb25zdCBjYW5Ob3RUcmF2ZXJzZURlZXBlciA9IChvYmplY3QpID0+ICFvYmplY3QgfHwgdHlwZW9mIG9iamVjdCA9PT0gJ3N0cmluZyc7XG5cbmNvbnN0IGdldExhc3RPZlBhdGggPSAob2JqZWN0LCBwYXRoLCBFbXB0eSkgPT4ge1xuICBjb25zdCBzdGFjayA9IHR5cGVvZiBwYXRoICE9PSAnc3RyaW5nJyA/IHBhdGggOiBwYXRoLnNwbGl0KCcuJyk7XG4gIGxldCBzdGFja0luZGV4ID0gMDtcbiAgLy8gaXRlcmF0ZSB0aHJvdWdoIHRoZSBzdGFjaywgYnV0IGxlYXZlIHRoZSBsYXN0IGl0ZW1cbiAgd2hpbGUgKHN0YWNrSW5kZXggPCBzdGFjay5sZW5ndGggLSAxKSB7XG4gICAgaWYgKGNhbk5vdFRyYXZlcnNlRGVlcGVyKG9iamVjdCkpIHJldHVybiB7fTtcblxuICAgIGNvbnN0IGtleSA9IGNsZWFuS2V5KHN0YWNrW3N0YWNrSW5kZXhdKTtcbiAgICBpZiAoIW9iamVjdFtrZXldICYmIEVtcHR5KSBvYmplY3Rba2V5XSA9IG5ldyBFbXB0eSgpO1xuICAgIC8vIHByZXZlbnQgcHJvdG90eXBlIHBvbGx1dGlvblxuICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqZWN0LCBrZXkpKSB7XG4gICAgICBvYmplY3QgPSBvYmplY3Rba2V5XTtcbiAgICB9IGVsc2Uge1xuICAgICAgb2JqZWN0ID0ge307XG4gICAgfVxuICAgICsrc3RhY2tJbmRleDtcbiAgfVxuXG4gIGlmIChjYW5Ob3RUcmF2ZXJzZURlZXBlcihvYmplY3QpKSByZXR1cm4ge307XG4gIHJldHVybiB7XG4gICAgb2JqOiBvYmplY3QsXG4gICAgazogY2xlYW5LZXkoc3RhY2tbc3RhY2tJbmRleF0pLFxuICB9O1xufTtcblxuZXhwb3J0IGNvbnN0IHNldFBhdGggPSAob2JqZWN0LCBwYXRoLCBuZXdWYWx1ZSkgPT4ge1xuICBjb25zdCB7IG9iaiwgayB9ID0gZ2V0TGFzdE9mUGF0aChvYmplY3QsIHBhdGgsIE9iamVjdCk7XG4gIGlmIChvYmogIT09IHVuZGVmaW5lZCB8fCBwYXRoLmxlbmd0aCA9PT0gMSkge1xuICAgIG9ialtrXSA9IG5ld1ZhbHVlO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGxldCBlID0gcGF0aFtwYXRoLmxlbmd0aCAtIDFdO1xuICBsZXQgcCA9IHBhdGguc2xpY2UoMCwgcGF0aC5sZW5ndGggLSAxKTtcbiAgbGV0IGxhc3QgPSBnZXRMYXN0T2ZQYXRoKG9iamVjdCwgcCwgT2JqZWN0KTtcbiAgd2hpbGUgKGxhc3Qub2JqID09PSB1bmRlZmluZWQgJiYgcC5sZW5ndGgpIHtcbiAgICBlID0gYCR7cFtwLmxlbmd0aCAtIDFdfS4ke2V9YDtcbiAgICBwID0gcC5zbGljZSgwLCBwLmxlbmd0aCAtIDEpO1xuICAgIGxhc3QgPSBnZXRMYXN0T2ZQYXRoKG9iamVjdCwgcCwgT2JqZWN0KTtcbiAgICBpZiAobGFzdCAmJiBsYXN0Lm9iaiAmJiB0eXBlb2YgbGFzdC5vYmpbYCR7bGFzdC5rfS4ke2V9YF0gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICBsYXN0Lm9iaiA9IHVuZGVmaW5lZDtcbiAgICB9XG4gIH1cbiAgbGFzdC5vYmpbYCR7bGFzdC5rfS4ke2V9YF0gPSBuZXdWYWx1ZTtcbn07XG5cbmV4cG9ydCBjb25zdCBwdXNoUGF0aCA9IChvYmplY3QsIHBhdGgsIG5ld1ZhbHVlLCBjb25jYXQpID0+IHtcbiAgY29uc3QgeyBvYmosIGsgfSA9IGdldExhc3RPZlBhdGgob2JqZWN0LCBwYXRoLCBPYmplY3QpO1xuXG4gIG9ialtrXSA9IG9ialtrXSB8fCBbXTtcbiAgaWYgKGNvbmNhdCkgb2JqW2tdID0gb2JqW2tdLmNvbmNhdChuZXdWYWx1ZSk7XG4gIGlmICghY29uY2F0KSBvYmpba10ucHVzaChuZXdWYWx1ZSk7XG59O1xuXG5leHBvcnQgY29uc3QgZ2V0UGF0aCA9IChvYmplY3QsIHBhdGgpID0+IHtcbiAgY29uc3QgeyBvYmosIGsgfSA9IGdldExhc3RPZlBhdGgob2JqZWN0LCBwYXRoKTtcblxuICBpZiAoIW9iaikgcmV0dXJuIHVuZGVmaW5lZDtcbiAgcmV0dXJuIG9ialtrXTtcbn07XG5cbmV4cG9ydCBjb25zdCBnZXRQYXRoV2l0aERlZmF1bHRzID0gKGRhdGEsIGRlZmF1bHREYXRhLCBrZXkpID0+IHtcbiAgY29uc3QgdmFsdWUgPSBnZXRQYXRoKGRhdGEsIGtleSk7XG4gIGlmICh2YWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIHZhbHVlO1xuICB9XG4gIC8vIEZhbGxiYWNrIHRvIGRlZmF1bHQgdmFsdWVzXG4gIHJldHVybiBnZXRQYXRoKGRlZmF1bHREYXRhLCBrZXkpO1xufTtcblxuZXhwb3J0IGNvbnN0IGRlZXBFeHRlbmQgPSAodGFyZ2V0LCBzb3VyY2UsIG92ZXJ3cml0ZSkgPT4ge1xuICAvKiBlc2xpbnQgbm8tcmVzdHJpY3RlZC1zeW50YXg6IDAgKi9cbiAgZm9yIChjb25zdCBwcm9wIGluIHNvdXJjZSkge1xuICAgIGlmIChwcm9wICE9PSAnX19wcm90b19fJyAmJiBwcm9wICE9PSAnY29uc3RydWN0b3InKSB7XG4gICAgICBpZiAocHJvcCBpbiB0YXJnZXQpIHtcbiAgICAgICAgLy8gSWYgd2UgcmVhY2hlZCBhIGxlYWYgc3RyaW5nIGluIHRhcmdldCBvciBzb3VyY2UgdGhlbiByZXBsYWNlIHdpdGggc291cmNlIG9yIHNraXAgZGVwZW5kaW5nIG9uIHRoZSAnb3ZlcndyaXRlJyBzd2l0Y2hcbiAgICAgICAgaWYgKFxuICAgICAgICAgIHR5cGVvZiB0YXJnZXRbcHJvcF0gPT09ICdzdHJpbmcnIHx8XG4gICAgICAgICAgdGFyZ2V0W3Byb3BdIGluc3RhbmNlb2YgU3RyaW5nIHx8XG4gICAgICAgICAgdHlwZW9mIHNvdXJjZVtwcm9wXSA9PT0gJ3N0cmluZycgfHxcbiAgICAgICAgICBzb3VyY2VbcHJvcF0gaW5zdGFuY2VvZiBTdHJpbmdcbiAgICAgICAgKSB7XG4gICAgICAgICAgaWYgKG92ZXJ3cml0ZSkgdGFyZ2V0W3Byb3BdID0gc291cmNlW3Byb3BdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGRlZXBFeHRlbmQodGFyZ2V0W3Byb3BdLCBzb3VyY2VbcHJvcF0sIG92ZXJ3cml0ZSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRhcmdldFtwcm9wXSA9IHNvdXJjZVtwcm9wXTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIHRhcmdldDtcbn07XG5cbmV4cG9ydCBjb25zdCByZWdleEVzY2FwZSA9IChzdHIpID0+XG4gIC8qIGVzbGludCBuby11c2VsZXNzLWVzY2FwZTogMCAqL1xuICBzdHIucmVwbGFjZSgvW1xcLVxcW1xcXVxcL1xce1xcfVxcKFxcKVxcKlxcK1xcP1xcLlxcXFxcXF5cXCRcXHxdL2csICdcXFxcJCYnKTtcblxuLyogZXNsaW50LWRpc2FibGUgKi9cbnZhciBfZW50aXR5TWFwID0ge1xuICAnJic6ICcmYW1wOycsXG4gICc8JzogJyZsdDsnLFxuICAnPic6ICcmZ3Q7JyxcbiAgJ1wiJzogJyZxdW90OycsXG4gIFwiJ1wiOiAnJiMzOTsnLFxuICAnLyc6ICcmI3gyRjsnLFxufTtcbi8qIGVzbGludC1lbmFibGUgKi9cblxuZXhwb3J0IGNvbnN0IGVzY2FwZSA9IChkYXRhKSA9PiB7XG4gIGlmICh0eXBlb2YgZGF0YSA9PT0gJ3N0cmluZycpIHtcbiAgICByZXR1cm4gZGF0YS5yZXBsYWNlKC9bJjw+XCInXFwvXS9nLCAocykgPT4gX2VudGl0eU1hcFtzXSk7XG4gIH1cblxuICByZXR1cm4gZGF0YTtcbn07XG5cbi8qKlxuICogVGhpcyBpcyBhIHJldXNhYmxlIHJlZ3VsYXIgZXhwcmVzc2lvbiBjYWNoZSBjbGFzcy4gR2l2ZW4gYSBjZXJ0YWluIG1heGltdW0gbnVtYmVyIG9mIHJlZ3VsYXIgZXhwcmVzc2lvbnMgd2UncmVcbiAqIGFsbG93ZWQgdG8gc3RvcmUgaW4gdGhlIGNhY2hlLCBpdCBwcm92aWRlcyBhIHdheSB0byBhdm9pZCByZWNyZWF0aW5nIHJlZ3VsYXIgZXhwcmVzc2lvbiBvYmplY3RzIG92ZXIgYW5kIG92ZXIuXG4gKiBXaGVuIGl0IG5lZWRzIHRvIGV2aWN0IHNvbWV0aGluZywgaXQgZXZpY3RzIHRoZSBvbGRlc3Qgb25lLlxuICovXG5jbGFzcyBSZWdFeHBDYWNoZSB7XG4gIGNvbnN0cnVjdG9yKGNhcGFjaXR5KSB7XG4gICAgdGhpcy5jYXBhY2l0eSA9IGNhcGFjaXR5O1xuICAgIHRoaXMucmVnRXhwTWFwID0gbmV3IE1hcCgpO1xuICAgIC8vIFNpbmNlIG91ciBjYXBhY2l0eSB0ZW5kcyB0byBiZSBmYWlybHkgc21hbGwsIGAuc2hpZnQoKWAgd2lsbCBiZSBmYWlybHkgcXVpY2sgZGVzcGl0ZSBiZWluZyBPKG4pLiBXZSBqdXN0IHVzZSBhXG4gICAgLy8gbm9ybWFsIGFycmF5IHRvIGtlZXAgaXQgc2ltcGxlLlxuICAgIHRoaXMucmVnRXhwUXVldWUgPSBbXTtcbiAgfVxuXG4gIGdldFJlZ0V4cChwYXR0ZXJuKSB7XG4gICAgY29uc3QgcmVnRXhwRnJvbUNhY2hlID0gdGhpcy5yZWdFeHBNYXAuZ2V0KHBhdHRlcm4pO1xuICAgIGlmIChyZWdFeHBGcm9tQ2FjaGUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIHJlZ0V4cEZyb21DYWNoZTtcbiAgICB9XG4gICAgY29uc3QgcmVnRXhwTmV3ID0gbmV3IFJlZ0V4cChwYXR0ZXJuKTtcbiAgICBpZiAodGhpcy5yZWdFeHBRdWV1ZS5sZW5ndGggPT09IHRoaXMuY2FwYWNpdHkpIHtcbiAgICAgIHRoaXMucmVnRXhwTWFwLmRlbGV0ZSh0aGlzLnJlZ0V4cFF1ZXVlLnNoaWZ0KCkpO1xuICAgIH1cbiAgICB0aGlzLnJlZ0V4cE1hcC5zZXQocGF0dGVybiwgcmVnRXhwTmV3KTtcbiAgICB0aGlzLnJlZ0V4cFF1ZXVlLnB1c2gocGF0dGVybik7XG4gICAgcmV0dXJuIHJlZ0V4cE5ldztcbiAgfVxufVxuXG5jb25zdCBjaGFycyA9IFsnICcsICcsJywgJz8nLCAnIScsICc7J107XG4vLyBXZSBjYWNoZSBSZWdFeHBzIHRvIGltcHJvdmUgcGVyZm9ybWFuY2Ugd2l0aCBSZWFjdCBOYXRpdmUgQW5kcm9pZCwgd2hpY2ggaGFzIHBvb3IgUmVnRXhwIGluaXRpYWxpemF0aW9uIHBlcmZvcm1hbmNlLlxuLy8gQ2FwYWNpdHkgb2YgMjAgc2hvdWxkIGJlIHBsZW50eSwgYXMgbnNTZXBhcmF0b3Iva2V5U2VwYXJhdG9yIGRvbid0IHRlbmQgdG8gdmFyeSBtdWNoIGFjcm9zcyBjYWxscy5cbmNvbnN0IGxvb2tzTGlrZU9iamVjdFBhdGhSZWdFeHBDYWNoZSA9IG5ldyBSZWdFeHBDYWNoZSgyMCk7XG5cbmV4cG9ydCBjb25zdCBsb29rc0xpa2VPYmplY3RQYXRoID0gKGtleSwgbnNTZXBhcmF0b3IsIGtleVNlcGFyYXRvcikgPT4ge1xuICBuc1NlcGFyYXRvciA9IG5zU2VwYXJhdG9yIHx8ICcnO1xuICBrZXlTZXBhcmF0b3IgPSBrZXlTZXBhcmF0b3IgfHwgJyc7XG4gIGNvbnN0IHBvc3NpYmxlQ2hhcnMgPSBjaGFycy5maWx0ZXIoXG4gICAgKGMpID0+IG5zU2VwYXJhdG9yLmluZGV4T2YoYykgPCAwICYmIGtleVNlcGFyYXRvci5pbmRleE9mKGMpIDwgMCxcbiAgKTtcbiAgaWYgKHBvc3NpYmxlQ2hhcnMubGVuZ3RoID09PSAwKSByZXR1cm4gdHJ1ZTtcbiAgY29uc3QgciA9IGxvb2tzTGlrZU9iamVjdFBhdGhSZWdFeHBDYWNoZS5nZXRSZWdFeHAoXG4gICAgYCgke3Bvc3NpYmxlQ2hhcnMubWFwKChjKSA9PiAoYyA9PT0gJz8nID8gJ1xcXFw/JyA6IGMpKS5qb2luKCd8Jyl9KWAsXG4gICk7XG4gIGxldCBtYXRjaGVkID0gIXIudGVzdChrZXkpO1xuICBpZiAoIW1hdGNoZWQpIHtcbiAgICBjb25zdCBraSA9IGtleS5pbmRleE9mKGtleVNlcGFyYXRvcik7XG4gICAgaWYgKGtpID4gMCAmJiAhci50ZXN0KGtleS5zdWJzdHJpbmcoMCwga2kpKSkge1xuICAgICAgbWF0Y2hlZCA9IHRydWU7XG4gICAgfVxuICB9XG4gIHJldHVybiBtYXRjaGVkO1xufTtcblxuLyoqXG4gKiBHaXZlblxuICpcbiAqIDEuIGEgdG9wIGxldmVsIG9iamVjdCBvYmosIGFuZFxuICogMi4gYSBwYXRoIHRvIGEgZGVlcGx5IG5lc3RlZCBzdHJpbmcgb3Igb2JqZWN0IHdpdGhpbiBpdFxuICpcbiAqIEZpbmQgYW5kIHJldHVybiB0aGF0IGRlZXBseSBuZXN0ZWQgc3RyaW5nIG9yIG9iamVjdC4gVGhlIGNhdmVhdCBpcyB0aGF0IHRoZSBrZXlzIG9mIG9iamVjdHMgd2l0aGluIHRoZSBuZXN0aW5nIGNoYWluXG4gKiBtYXkgY29udGFpbiBwZXJpb2QgY2hhcmFjdGVycy4gVGhlcmVmb3JlLCB3ZSBuZWVkIHRvIERGUyBhbmQgZXhwbG9yZSBhbGwgcG9zc2libGUga2V5cyBhdCBlYWNoIHN0ZXAgdW50aWwgd2UgZmluZCB0aGVcbiAqIGRlZXBseSBuZXN0ZWQgc3RyaW5nIG9yIG9iamVjdC5cbiAqL1xuZXhwb3J0IGNvbnN0IGRlZXBGaW5kID0gKG9iaiwgcGF0aCwga2V5U2VwYXJhdG9yID0gJy4nKSA9PiB7XG4gIGlmICghb2JqKSByZXR1cm4gdW5kZWZpbmVkO1xuICBpZiAob2JqW3BhdGhdKSByZXR1cm4gb2JqW3BhdGhdO1xuICBjb25zdCB0b2tlbnMgPSBwYXRoLnNwbGl0KGtleVNlcGFyYXRvcik7XG4gIGxldCBjdXJyZW50ID0gb2JqO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IHRva2Vucy5sZW5ndGg7ICkge1xuICAgIGlmICghY3VycmVudCB8fCB0eXBlb2YgY3VycmVudCAhPT0gJ29iamVjdCcpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGxldCBuZXh0O1xuICAgIGxldCBuZXh0UGF0aCA9ICcnO1xuICAgIGZvciAobGV0IGogPSBpOyBqIDwgdG9rZW5zLmxlbmd0aDsgKytqKSB7XG4gICAgICBpZiAoaiAhPT0gaSkge1xuICAgICAgICBuZXh0UGF0aCArPSBrZXlTZXBhcmF0b3I7XG4gICAgICB9XG4gICAgICBuZXh0UGF0aCArPSB0b2tlbnNbal07XG4gICAgICBuZXh0ID0gY3VycmVudFtuZXh0UGF0aF07XG4gICAgICBpZiAobmV4dCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmIChbJ3N0cmluZycsICdudW1iZXInLCAnYm9vbGVhbiddLmluZGV4T2YodHlwZW9mIG5leHQpID4gLTEgJiYgaiA8IHRva2Vucy5sZW5ndGggLSAxKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgaSArPSBqIC0gaSArIDE7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgICBjdXJyZW50ID0gbmV4dDtcbiAgfVxuICByZXR1cm4gY3VycmVudDtcbn07XG5cbmV4cG9ydCBjb25zdCBnZXRDbGVhbmVkQ29kZSA9IChjb2RlKSA9PiB7XG4gIGlmIChjb2RlICYmIGNvZGUuaW5kZXhPZignXycpID4gMCkgcmV0dXJuIGNvZGUucmVwbGFjZSgnXycsICctJyk7XG4gIHJldHVybiBjb2RlO1xufTtcbiIsImltcG9ydCBFdmVudEVtaXR0ZXIgZnJvbSAnLi9FdmVudEVtaXR0ZXIuanMnO1xuaW1wb3J0IHsgZ2V0UGF0aCwgZGVlcEZpbmQsIHNldFBhdGgsIGRlZXBFeHRlbmQgfSBmcm9tICcuL3V0aWxzLmpzJztcblxuY2xhc3MgUmVzb3VyY2VTdG9yZSBleHRlbmRzIEV2ZW50RW1pdHRlciB7XG4gIGNvbnN0cnVjdG9yKGRhdGEsIG9wdGlvbnMgPSB7IG5zOiBbJ3RyYW5zbGF0aW9uJ10sIGRlZmF1bHROUzogJ3RyYW5zbGF0aW9uJyB9KSB7XG4gICAgc3VwZXIoKTtcblxuICAgIHRoaXMuZGF0YSA9IGRhdGEgfHwge307XG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcbiAgICBpZiAodGhpcy5vcHRpb25zLmtleVNlcGFyYXRvciA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzLm9wdGlvbnMua2V5U2VwYXJhdG9yID0gJy4nO1xuICAgIH1cbiAgICBpZiAodGhpcy5vcHRpb25zLmlnbm9yZUpTT05TdHJ1Y3R1cmUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5vcHRpb25zLmlnbm9yZUpTT05TdHJ1Y3R1cmUgPSB0cnVlO1xuICAgIH1cbiAgfVxuXG4gIGFkZE5hbWVzcGFjZXMobnMpIHtcbiAgICBpZiAodGhpcy5vcHRpb25zLm5zLmluZGV4T2YobnMpIDwgMCkge1xuICAgICAgdGhpcy5vcHRpb25zLm5zLnB1c2gobnMpO1xuICAgIH1cbiAgfVxuXG4gIHJlbW92ZU5hbWVzcGFjZXMobnMpIHtcbiAgICBjb25zdCBpbmRleCA9IHRoaXMub3B0aW9ucy5ucy5pbmRleE9mKG5zKTtcbiAgICBpZiAoaW5kZXggPiAtMSkge1xuICAgICAgdGhpcy5vcHRpb25zLm5zLnNwbGljZShpbmRleCwgMSk7XG4gICAgfVxuICB9XG5cbiAgZ2V0UmVzb3VyY2UobG5nLCBucywga2V5LCBvcHRpb25zID0ge30pIHtcbiAgICBjb25zdCBrZXlTZXBhcmF0b3IgPVxuICAgICAgb3B0aW9ucy5rZXlTZXBhcmF0b3IgIT09IHVuZGVmaW5lZCA/IG9wdGlvbnMua2V5U2VwYXJhdG9yIDogdGhpcy5vcHRpb25zLmtleVNlcGFyYXRvcjtcblxuICAgIGNvbnN0IGlnbm9yZUpTT05TdHJ1Y3R1cmUgPVxuICAgICAgb3B0aW9ucy5pZ25vcmVKU09OU3RydWN0dXJlICE9PSB1bmRlZmluZWRcbiAgICAgICAgPyBvcHRpb25zLmlnbm9yZUpTT05TdHJ1Y3R1cmVcbiAgICAgICAgOiB0aGlzLm9wdGlvbnMuaWdub3JlSlNPTlN0cnVjdHVyZTtcblxuICAgIGxldCBwYXRoO1xuICAgIGlmIChsbmcuaW5kZXhPZignLicpID4gLTEpIHtcbiAgICAgIHBhdGggPSBsbmcuc3BsaXQoJy4nKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcGF0aCA9IFtsbmcsIG5zXTtcbiAgICAgIGlmIChrZXkpIHtcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoa2V5KSkge1xuICAgICAgICAgIHBhdGgucHVzaCguLi5rZXkpO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBrZXkgPT09ICdzdHJpbmcnICYmIGtleVNlcGFyYXRvcikge1xuICAgICAgICAgIHBhdGgucHVzaCguLi5rZXkuc3BsaXQoa2V5U2VwYXJhdG9yKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcGF0aC5wdXNoKGtleSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCByZXN1bHQgPSBnZXRQYXRoKHRoaXMuZGF0YSwgcGF0aCk7XG4gICAgaWYgKCFyZXN1bHQgJiYgIW5zICYmICFrZXkgJiYgbG5nLmluZGV4T2YoJy4nKSA+IC0xKSB7XG4gICAgICBsbmcgPSBwYXRoWzBdO1xuICAgICAgbnMgPSBwYXRoWzFdO1xuICAgICAga2V5ID0gcGF0aC5zbGljZSgyKS5qb2luKCcuJyk7XG4gICAgfVxuICAgIGlmIChyZXN1bHQgfHwgIWlnbm9yZUpTT05TdHJ1Y3R1cmUgfHwgdHlwZW9mIGtleSAhPT0gJ3N0cmluZycpIHJldHVybiByZXN1bHQ7XG5cbiAgICByZXR1cm4gZGVlcEZpbmQodGhpcy5kYXRhICYmIHRoaXMuZGF0YVtsbmddICYmIHRoaXMuZGF0YVtsbmddW25zXSwga2V5LCBrZXlTZXBhcmF0b3IpO1xuICB9XG5cbiAgYWRkUmVzb3VyY2UobG5nLCBucywga2V5LCB2YWx1ZSwgb3B0aW9ucyA9IHsgc2lsZW50OiBmYWxzZSB9KSB7XG4gICAgY29uc3Qga2V5U2VwYXJhdG9yID1cbiAgICAgIG9wdGlvbnMua2V5U2VwYXJhdG9yICE9PSB1bmRlZmluZWQgPyBvcHRpb25zLmtleVNlcGFyYXRvciA6IHRoaXMub3B0aW9ucy5rZXlTZXBhcmF0b3I7XG5cbiAgICBsZXQgcGF0aCA9IFtsbmcsIG5zXTtcbiAgICBpZiAoa2V5KSBwYXRoID0gcGF0aC5jb25jYXQoa2V5U2VwYXJhdG9yID8ga2V5LnNwbGl0KGtleVNlcGFyYXRvcikgOiBrZXkpO1xuXG4gICAgaWYgKGxuZy5pbmRleE9mKCcuJykgPiAtMSkge1xuICAgICAgcGF0aCA9IGxuZy5zcGxpdCgnLicpO1xuICAgICAgdmFsdWUgPSBucztcbiAgICAgIG5zID0gcGF0aFsxXTtcbiAgICB9XG5cbiAgICB0aGlzLmFkZE5hbWVzcGFjZXMobnMpO1xuXG4gICAgc2V0UGF0aCh0aGlzLmRhdGEsIHBhdGgsIHZhbHVlKTtcblxuICAgIGlmICghb3B0aW9ucy5zaWxlbnQpIHRoaXMuZW1pdCgnYWRkZWQnLCBsbmcsIG5zLCBrZXksIHZhbHVlKTtcbiAgfVxuXG4gIGFkZFJlc291cmNlcyhsbmcsIG5zLCByZXNvdXJjZXMsIG9wdGlvbnMgPSB7IHNpbGVudDogZmFsc2UgfSkge1xuICAgIC8qIGVzbGludCBuby1yZXN0cmljdGVkLXN5bnRheDogMCAqL1xuICAgIGZvciAoY29uc3QgbSBpbiByZXNvdXJjZXMpIHtcbiAgICAgIGlmICh0eXBlb2YgcmVzb3VyY2VzW21dID09PSAnc3RyaW5nJyB8fCBBcnJheS5pc0FycmF5KHJlc291cmNlc1ttXSkpXG4gICAgICAgIHRoaXMuYWRkUmVzb3VyY2UobG5nLCBucywgbSwgcmVzb3VyY2VzW21dLCB7IHNpbGVudDogdHJ1ZSB9KTtcbiAgICB9XG4gICAgaWYgKCFvcHRpb25zLnNpbGVudCkgdGhpcy5lbWl0KCdhZGRlZCcsIGxuZywgbnMsIHJlc291cmNlcyk7XG4gIH1cblxuICBhZGRSZXNvdXJjZUJ1bmRsZShcbiAgICBsbmcsXG4gICAgbnMsXG4gICAgcmVzb3VyY2VzLFxuICAgIGRlZXAsXG4gICAgb3ZlcndyaXRlLFxuICAgIG9wdGlvbnMgPSB7IHNpbGVudDogZmFsc2UsIHNraXBDb3B5OiBmYWxzZSB9LFxuICApIHtcbiAgICBsZXQgcGF0aCA9IFtsbmcsIG5zXTtcbiAgICBpZiAobG5nLmluZGV4T2YoJy4nKSA+IC0xKSB7XG4gICAgICBwYXRoID0gbG5nLnNwbGl0KCcuJyk7XG4gICAgICBkZWVwID0gcmVzb3VyY2VzO1xuICAgICAgcmVzb3VyY2VzID0gbnM7XG4gICAgICBucyA9IHBhdGhbMV07XG4gICAgfVxuXG4gICAgdGhpcy5hZGROYW1lc3BhY2VzKG5zKTtcblxuICAgIGxldCBwYWNrID0gZ2V0UGF0aCh0aGlzLmRhdGEsIHBhdGgpIHx8IHt9O1xuXG4gICAgaWYgKCFvcHRpb25zLnNraXBDb3B5KSByZXNvdXJjZXMgPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KHJlc291cmNlcykpOyAvLyBtYWtlIGEgY29weSB0byBmaXggIzIwODFcblxuICAgIGlmIChkZWVwKSB7XG4gICAgICBkZWVwRXh0ZW5kKHBhY2ssIHJlc291cmNlcywgb3ZlcndyaXRlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcGFjayA9IHsgLi4ucGFjaywgLi4ucmVzb3VyY2VzIH07XG4gICAgfVxuXG4gICAgc2V0UGF0aCh0aGlzLmRhdGEsIHBhdGgsIHBhY2spO1xuXG4gICAgaWYgKCFvcHRpb25zLnNpbGVudCkgdGhpcy5lbWl0KCdhZGRlZCcsIGxuZywgbnMsIHJlc291cmNlcyk7XG4gIH1cblxuICByZW1vdmVSZXNvdXJjZUJ1bmRsZShsbmcsIG5zKSB7XG4gICAgaWYgKHRoaXMuaGFzUmVzb3VyY2VCdW5kbGUobG5nLCBucykpIHtcbiAgICAgIGRlbGV0ZSB0aGlzLmRhdGFbbG5nXVtuc107XG4gICAgfVxuICAgIHRoaXMucmVtb3ZlTmFtZXNwYWNlcyhucyk7XG5cbiAgICB0aGlzLmVtaXQoJ3JlbW92ZWQnLCBsbmcsIG5zKTtcbiAgfVxuXG4gIGhhc1Jlc291cmNlQnVuZGxlKGxuZywgbnMpIHtcbiAgICByZXR1cm4gdGhpcy5nZXRSZXNvdXJjZShsbmcsIG5zKSAhPT0gdW5kZWZpbmVkO1xuICB9XG5cbiAgZ2V0UmVzb3VyY2VCdW5kbGUobG5nLCBucykge1xuICAgIGlmICghbnMpIG5zID0gdGhpcy5vcHRpb25zLmRlZmF1bHROUztcblxuICAgIC8vIENPTVBBVElCSUxJVFk6IHJlbW92ZSBleHRlbmQgaW4gdjIuMS4wXG4gICAgaWYgKHRoaXMub3B0aW9ucy5jb21wYXRpYmlsaXR5QVBJID09PSAndjEnKSByZXR1cm4geyAuLi57fSwgLi4udGhpcy5nZXRSZXNvdXJjZShsbmcsIG5zKSB9O1xuXG4gICAgcmV0dXJuIHRoaXMuZ2V0UmVzb3VyY2UobG5nLCBucyk7XG4gIH1cblxuICBnZXREYXRhQnlMYW5ndWFnZShsbmcpIHtcbiAgICByZXR1cm4gdGhpcy5kYXRhW2xuZ107XG4gIH1cblxuICBoYXNMYW5ndWFnZVNvbWVUcmFuc2xhdGlvbnMobG5nKSB7XG4gICAgY29uc3QgZGF0YSA9IHRoaXMuZ2V0RGF0YUJ5TGFuZ3VhZ2UobG5nKTtcbiAgICBjb25zdCBuID0gKGRhdGEgJiYgT2JqZWN0LmtleXMoZGF0YSkpIHx8IFtdO1xuICAgIHJldHVybiAhIW4uZmluZCgodikgPT4gZGF0YVt2XSAmJiBPYmplY3Qua2V5cyhkYXRhW3ZdKS5sZW5ndGggPiAwKTtcbiAgfVxuXG4gIHRvSlNPTigpIHtcbiAgICByZXR1cm4gdGhpcy5kYXRhO1xuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IFJlc291cmNlU3RvcmU7XG4iLCJleHBvcnQgZGVmYXVsdCB7XG4gIHByb2Nlc3NvcnM6IHt9LFxuXG4gIGFkZFBvc3RQcm9jZXNzb3IobW9kdWxlKSB7XG4gICAgdGhpcy5wcm9jZXNzb3JzW21vZHVsZS5uYW1lXSA9IG1vZHVsZTtcbiAgfSxcblxuICBoYW5kbGUocHJvY2Vzc29ycywgdmFsdWUsIGtleSwgb3B0aW9ucywgdHJhbnNsYXRvcikge1xuICAgIHByb2Nlc3NvcnMuZm9yRWFjaCgocHJvY2Vzc29yKSA9PiB7XG4gICAgICBpZiAodGhpcy5wcm9jZXNzb3JzW3Byb2Nlc3Nvcl0pXG4gICAgICAgIHZhbHVlID0gdGhpcy5wcm9jZXNzb3JzW3Byb2Nlc3Nvcl0ucHJvY2Vzcyh2YWx1ZSwga2V5LCBvcHRpb25zLCB0cmFuc2xhdG9yKTtcbiAgICB9KTtcblxuICAgIHJldHVybiB2YWx1ZTtcbiAgfSxcbn07XG4iLCJpbXBvcnQgYmFzZUxvZ2dlciBmcm9tICcuL2xvZ2dlci5qcyc7XG5pbXBvcnQgRXZlbnRFbWl0dGVyIGZyb20gJy4vRXZlbnRFbWl0dGVyLmpzJztcbmltcG9ydCBwb3N0UHJvY2Vzc29yIGZyb20gJy4vcG9zdFByb2Nlc3Nvci5qcyc7XG5pbXBvcnQgeyBjb3B5IGFzIHV0aWxzQ29weSwgbG9va3NMaWtlT2JqZWN0UGF0aCB9IGZyb20gJy4vdXRpbHMuanMnO1xuXG5jb25zdCBjaGVja2VkTG9hZGVkRm9yID0ge307XG5cbmNsYXNzIFRyYW5zbGF0b3IgZXh0ZW5kcyBFdmVudEVtaXR0ZXIge1xuICBjb25zdHJ1Y3RvcihzZXJ2aWNlcywgb3B0aW9ucyA9IHt9KSB7XG4gICAgc3VwZXIoKTtcblxuICAgIHV0aWxzQ29weShcbiAgICAgIFtcbiAgICAgICAgJ3Jlc291cmNlU3RvcmUnLFxuICAgICAgICAnbGFuZ3VhZ2VVdGlscycsXG4gICAgICAgICdwbHVyYWxSZXNvbHZlcicsXG4gICAgICAgICdpbnRlcnBvbGF0b3InLFxuICAgICAgICAnYmFja2VuZENvbm5lY3RvcicsXG4gICAgICAgICdpMThuRm9ybWF0JyxcbiAgICAgICAgJ3V0aWxzJyxcbiAgICAgIF0sXG4gICAgICBzZXJ2aWNlcyxcbiAgICAgIHRoaXMsXG4gICAgKTtcblxuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG4gICAgaWYgKHRoaXMub3B0aW9ucy5rZXlTZXBhcmF0b3IgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5vcHRpb25zLmtleVNlcGFyYXRvciA9ICcuJztcbiAgICB9XG5cbiAgICB0aGlzLmxvZ2dlciA9IGJhc2VMb2dnZXIuY3JlYXRlKCd0cmFuc2xhdG9yJyk7XG4gIH1cblxuICBjaGFuZ2VMYW5ndWFnZShsbmcpIHtcbiAgICBpZiAobG5nKSB0aGlzLmxhbmd1YWdlID0gbG5nO1xuICB9XG5cbiAgZXhpc3RzKGtleSwgb3B0aW9ucyA9IHsgaW50ZXJwb2xhdGlvbjoge30gfSkge1xuICAgIGlmIChrZXkgPT09IHVuZGVmaW5lZCB8fCBrZXkgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBjb25zdCByZXNvbHZlZCA9IHRoaXMucmVzb2x2ZShrZXksIG9wdGlvbnMpO1xuICAgIHJldHVybiByZXNvbHZlZCAmJiByZXNvbHZlZC5yZXMgIT09IHVuZGVmaW5lZDtcbiAgfVxuXG4gIGV4dHJhY3RGcm9tS2V5KGtleSwgb3B0aW9ucykge1xuICAgIGxldCBuc1NlcGFyYXRvciA9XG4gICAgICBvcHRpb25zLm5zU2VwYXJhdG9yICE9PSB1bmRlZmluZWQgPyBvcHRpb25zLm5zU2VwYXJhdG9yIDogdGhpcy5vcHRpb25zLm5zU2VwYXJhdG9yO1xuICAgIGlmIChuc1NlcGFyYXRvciA9PT0gdW5kZWZpbmVkKSBuc1NlcGFyYXRvciA9ICc6JztcblxuICAgIGNvbnN0IGtleVNlcGFyYXRvciA9XG4gICAgICBvcHRpb25zLmtleVNlcGFyYXRvciAhPT0gdW5kZWZpbmVkID8gb3B0aW9ucy5rZXlTZXBhcmF0b3IgOiB0aGlzLm9wdGlvbnMua2V5U2VwYXJhdG9yO1xuXG4gICAgbGV0IG5hbWVzcGFjZXMgPSBvcHRpb25zLm5zIHx8IHRoaXMub3B0aW9ucy5kZWZhdWx0TlMgfHwgW107XG4gICAgY29uc3Qgd291bGRDaGVja0Zvck5zSW5LZXkgPSBuc1NlcGFyYXRvciAmJiBrZXkuaW5kZXhPZihuc1NlcGFyYXRvcikgPiAtMTtcbiAgICBjb25zdCBzZWVtc05hdHVyYWxMYW5ndWFnZSA9XG4gICAgICAhdGhpcy5vcHRpb25zLnVzZXJEZWZpbmVkS2V5U2VwYXJhdG9yICYmXG4gICAgICAhb3B0aW9ucy5rZXlTZXBhcmF0b3IgJiZcbiAgICAgICF0aGlzLm9wdGlvbnMudXNlckRlZmluZWROc1NlcGFyYXRvciAmJlxuICAgICAgIW9wdGlvbnMubnNTZXBhcmF0b3IgJiZcbiAgICAgICFsb29rc0xpa2VPYmplY3RQYXRoKGtleSwgbnNTZXBhcmF0b3IsIGtleVNlcGFyYXRvcik7XG4gICAgaWYgKHdvdWxkQ2hlY2tGb3JOc0luS2V5ICYmICFzZWVtc05hdHVyYWxMYW5ndWFnZSkge1xuICAgICAgY29uc3QgbSA9IGtleS5tYXRjaCh0aGlzLmludGVycG9sYXRvci5uZXN0aW5nUmVnZXhwKTtcbiAgICAgIGlmIChtICYmIG0ubGVuZ3RoID4gMCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIGtleSxcbiAgICAgICAgICBuYW1lc3BhY2VzLFxuICAgICAgICB9O1xuICAgICAgfVxuICAgICAgY29uc3QgcGFydHMgPSBrZXkuc3BsaXQobnNTZXBhcmF0b3IpO1xuICAgICAgaWYgKFxuICAgICAgICBuc1NlcGFyYXRvciAhPT0ga2V5U2VwYXJhdG9yIHx8XG4gICAgICAgIChuc1NlcGFyYXRvciA9PT0ga2V5U2VwYXJhdG9yICYmIHRoaXMub3B0aW9ucy5ucy5pbmRleE9mKHBhcnRzWzBdKSA+IC0xKVxuICAgICAgKVxuICAgICAgICBuYW1lc3BhY2VzID0gcGFydHMuc2hpZnQoKTtcbiAgICAgIGtleSA9IHBhcnRzLmpvaW4oa2V5U2VwYXJhdG9yKTtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiBuYW1lc3BhY2VzID09PSAnc3RyaW5nJykgbmFtZXNwYWNlcyA9IFtuYW1lc3BhY2VzXTtcblxuICAgIHJldHVybiB7XG4gICAgICBrZXksXG4gICAgICBuYW1lc3BhY2VzLFxuICAgIH07XG4gIH1cblxuICB0cmFuc2xhdGUoa2V5cywgb3B0aW9ucywgbGFzdEtleSkge1xuICAgIGlmICh0eXBlb2Ygb3B0aW9ucyAhPT0gJ29iamVjdCcgJiYgdGhpcy5vcHRpb25zLm92ZXJsb2FkVHJhbnNsYXRpb25PcHRpb25IYW5kbGVyKSB7XG4gICAgICAvKiBlc2xpbnQgcHJlZmVyLXJlc3QtcGFyYW1zOiAwICovXG4gICAgICBvcHRpb25zID0gdGhpcy5vcHRpb25zLm92ZXJsb2FkVHJhbnNsYXRpb25PcHRpb25IYW5kbGVyKGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIGlmICh0eXBlb2Ygb3B0aW9ucyA9PT0gJ29iamVjdCcpIG9wdGlvbnMgPSB7IC4uLm9wdGlvbnMgfTtcbiAgICBpZiAoIW9wdGlvbnMpIG9wdGlvbnMgPSB7fTtcblxuICAgIC8vIG5vbiB2YWxpZCBrZXlzIGhhbmRsaW5nXG4gICAgaWYgKGtleXMgPT09IHVuZGVmaW5lZCB8fCBrZXlzID09PSBudWxsIC8qIHx8IGtleXMgPT09ICcnICovKSByZXR1cm4gJyc7XG4gICAgaWYgKCFBcnJheS5pc0FycmF5KGtleXMpKSBrZXlzID0gW1N0cmluZyhrZXlzKV07XG5cbiAgICBjb25zdCByZXR1cm5EZXRhaWxzID1cbiAgICAgIG9wdGlvbnMucmV0dXJuRGV0YWlscyAhPT0gdW5kZWZpbmVkID8gb3B0aW9ucy5yZXR1cm5EZXRhaWxzIDogdGhpcy5vcHRpb25zLnJldHVybkRldGFpbHM7XG5cbiAgICAvLyBzZXBhcmF0b3JzXG4gICAgY29uc3Qga2V5U2VwYXJhdG9yID1cbiAgICAgIG9wdGlvbnMua2V5U2VwYXJhdG9yICE9PSB1bmRlZmluZWQgPyBvcHRpb25zLmtleVNlcGFyYXRvciA6IHRoaXMub3B0aW9ucy5rZXlTZXBhcmF0b3I7XG5cbiAgICAvLyBnZXQgbmFtZXNwYWNlKHMpXG4gICAgY29uc3QgeyBrZXksIG5hbWVzcGFjZXMgfSA9IHRoaXMuZXh0cmFjdEZyb21LZXkoa2V5c1trZXlzLmxlbmd0aCAtIDFdLCBvcHRpb25zKTtcbiAgICBjb25zdCBuYW1lc3BhY2UgPSBuYW1lc3BhY2VzW25hbWVzcGFjZXMubGVuZ3RoIC0gMV07XG5cbiAgICAvLyByZXR1cm4ga2V5IG9uIENJTW9kZVxuICAgIGNvbnN0IGxuZyA9IG9wdGlvbnMubG5nIHx8IHRoaXMubGFuZ3VhZ2U7XG4gICAgY29uc3QgYXBwZW5kTmFtZXNwYWNlVG9DSU1vZGUgPVxuICAgICAgb3B0aW9ucy5hcHBlbmROYW1lc3BhY2VUb0NJTW9kZSB8fCB0aGlzLm9wdGlvbnMuYXBwZW5kTmFtZXNwYWNlVG9DSU1vZGU7XG4gICAgaWYgKGxuZyAmJiBsbmcudG9Mb3dlckNhc2UoKSA9PT0gJ2NpbW9kZScpIHtcbiAgICAgIGlmIChhcHBlbmROYW1lc3BhY2VUb0NJTW9kZSkge1xuICAgICAgICBjb25zdCBuc1NlcGFyYXRvciA9IG9wdGlvbnMubnNTZXBhcmF0b3IgfHwgdGhpcy5vcHRpb25zLm5zU2VwYXJhdG9yO1xuICAgICAgICBpZiAocmV0dXJuRGV0YWlscykge1xuICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICByZXM6IGAke25hbWVzcGFjZX0ke25zU2VwYXJhdG9yfSR7a2V5fWAsXG4gICAgICAgICAgICB1c2VkS2V5OiBrZXksXG4gICAgICAgICAgICBleGFjdFVzZWRLZXk6IGtleSxcbiAgICAgICAgICAgIHVzZWRMbmc6IGxuZyxcbiAgICAgICAgICAgIHVzZWROUzogbmFtZXNwYWNlLFxuICAgICAgICAgICAgdXNlZFBhcmFtczogdGhpcy5nZXRVc2VkUGFyYW1zRGV0YWlscyhvcHRpb25zKSxcbiAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBgJHtuYW1lc3BhY2V9JHtuc1NlcGFyYXRvcn0ke2tleX1gO1xuICAgICAgfVxuXG4gICAgICBpZiAocmV0dXJuRGV0YWlscykge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIHJlczoga2V5LFxuICAgICAgICAgIHVzZWRLZXk6IGtleSxcbiAgICAgICAgICBleGFjdFVzZWRLZXk6IGtleSxcbiAgICAgICAgICB1c2VkTG5nOiBsbmcsXG4gICAgICAgICAgdXNlZE5TOiBuYW1lc3BhY2UsXG4gICAgICAgICAgdXNlZFBhcmFtczogdGhpcy5nZXRVc2VkUGFyYW1zRGV0YWlscyhvcHRpb25zKSxcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBrZXk7XG4gICAgfVxuXG4gICAgLy8gcmVzb2x2ZSBmcm9tIHN0b3JlXG4gICAgY29uc3QgcmVzb2x2ZWQgPSB0aGlzLnJlc29sdmUoa2V5cywgb3B0aW9ucyk7XG4gICAgbGV0IHJlcyA9IHJlc29sdmVkICYmIHJlc29sdmVkLnJlcztcbiAgICBjb25zdCByZXNVc2VkS2V5ID0gKHJlc29sdmVkICYmIHJlc29sdmVkLnVzZWRLZXkpIHx8IGtleTtcbiAgICBjb25zdCByZXNFeGFjdFVzZWRLZXkgPSAocmVzb2x2ZWQgJiYgcmVzb2x2ZWQuZXhhY3RVc2VkS2V5KSB8fCBrZXk7XG5cbiAgICBjb25zdCByZXNUeXBlID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5hcHBseShyZXMpO1xuICAgIGNvbnN0IG5vT2JqZWN0ID0gWydbb2JqZWN0IE51bWJlcl0nLCAnW29iamVjdCBGdW5jdGlvbl0nLCAnW29iamVjdCBSZWdFeHBdJ107XG4gICAgY29uc3Qgam9pbkFycmF5cyA9XG4gICAgICBvcHRpb25zLmpvaW5BcnJheXMgIT09IHVuZGVmaW5lZCA/IG9wdGlvbnMuam9pbkFycmF5cyA6IHRoaXMub3B0aW9ucy5qb2luQXJyYXlzO1xuXG4gICAgLy8gb2JqZWN0XG4gICAgY29uc3QgaGFuZGxlQXNPYmplY3RJbkkxOG5Gb3JtYXQgPSAhdGhpcy5pMThuRm9ybWF0IHx8IHRoaXMuaTE4bkZvcm1hdC5oYW5kbGVBc09iamVjdDtcbiAgICBjb25zdCBoYW5kbGVBc09iamVjdCA9XG4gICAgICB0eXBlb2YgcmVzICE9PSAnc3RyaW5nJyAmJiB0eXBlb2YgcmVzICE9PSAnYm9vbGVhbicgJiYgdHlwZW9mIHJlcyAhPT0gJ251bWJlcic7XG4gICAgaWYgKFxuICAgICAgaGFuZGxlQXNPYmplY3RJbkkxOG5Gb3JtYXQgJiZcbiAgICAgIHJlcyAmJlxuICAgICAgaGFuZGxlQXNPYmplY3QgJiZcbiAgICAgIG5vT2JqZWN0LmluZGV4T2YocmVzVHlwZSkgPCAwICYmXG4gICAgICAhKHR5cGVvZiBqb2luQXJyYXlzID09PSAnc3RyaW5nJyAmJiBBcnJheS5pc0FycmF5KHJlcykpXG4gICAgKSB7XG4gICAgICBpZiAoIW9wdGlvbnMucmV0dXJuT2JqZWN0cyAmJiAhdGhpcy5vcHRpb25zLnJldHVybk9iamVjdHMpIHtcbiAgICAgICAgaWYgKCF0aGlzLm9wdGlvbnMucmV0dXJuZWRPYmplY3RIYW5kbGVyKSB7XG4gICAgICAgICAgdGhpcy5sb2dnZXIud2FybignYWNjZXNzaW5nIGFuIG9iamVjdCAtIGJ1dCByZXR1cm5PYmplY3RzIG9wdGlvbnMgaXMgbm90IGVuYWJsZWQhJyk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgciA9IHRoaXMub3B0aW9ucy5yZXR1cm5lZE9iamVjdEhhbmRsZXJcbiAgICAgICAgICA/IHRoaXMub3B0aW9ucy5yZXR1cm5lZE9iamVjdEhhbmRsZXIocmVzVXNlZEtleSwgcmVzLCB7IC4uLm9wdGlvbnMsIG5zOiBuYW1lc3BhY2VzIH0pXG4gICAgICAgICAgOiBga2V5ICcke2tleX0gKCR7dGhpcy5sYW5ndWFnZX0pJyByZXR1cm5lZCBhbiBvYmplY3QgaW5zdGVhZCBvZiBzdHJpbmcuYDtcbiAgICAgICAgaWYgKHJldHVybkRldGFpbHMpIHtcbiAgICAgICAgICByZXNvbHZlZC5yZXMgPSByO1xuICAgICAgICAgIHJlc29sdmVkLnVzZWRQYXJhbXMgPSB0aGlzLmdldFVzZWRQYXJhbXNEZXRhaWxzKG9wdGlvbnMpO1xuICAgICAgICAgIHJldHVybiByZXNvbHZlZDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcjtcbiAgICAgIH1cblxuICAgICAgLy8gaWYgd2UgZ290IGEgc2VwYXJhdG9yIHdlIGxvb3Agb3ZlciBjaGlsZHJlbiAtIGVsc2Ugd2UganVzdCByZXR1cm4gb2JqZWN0IGFzIGlzXG4gICAgICAvLyBhcyBoYXZpbmcgaXQgc2V0IHRvIGZhbHNlIG1lYW5zIG5vIGhpZXJhcmNoeSBzbyBubyBsb29rdXAgZm9yIG5lc3RlZCB2YWx1ZXNcbiAgICAgIGlmIChrZXlTZXBhcmF0b3IpIHtcbiAgICAgICAgY29uc3QgcmVzVHlwZUlzQXJyYXkgPSBBcnJheS5pc0FycmF5KHJlcyk7XG4gICAgICAgIGNvbnN0IGNvcHkgPSByZXNUeXBlSXNBcnJheSA/IFtdIDoge307IC8vIGFwcGx5IGNoaWxkIHRyYW5zbGF0aW9uIG9uIGEgY29weVxuXG4gICAgICAgIC8qIGVzbGludCBuby1yZXN0cmljdGVkLXN5bnRheDogMCAqL1xuICAgICAgICBjb25zdCBuZXdLZXlUb1VzZSA9IHJlc1R5cGVJc0FycmF5ID8gcmVzRXhhY3RVc2VkS2V5IDogcmVzVXNlZEtleTtcbiAgICAgICAgZm9yIChjb25zdCBtIGluIHJlcykge1xuICAgICAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwocmVzLCBtKSkge1xuICAgICAgICAgICAgY29uc3QgZGVlcEtleSA9IGAke25ld0tleVRvVXNlfSR7a2V5U2VwYXJhdG9yfSR7bX1gO1xuICAgICAgICAgICAgY29weVttXSA9IHRoaXMudHJhbnNsYXRlKGRlZXBLZXksIHtcbiAgICAgICAgICAgICAgLi4ub3B0aW9ucyxcbiAgICAgICAgICAgICAgLi4ueyBqb2luQXJyYXlzOiBmYWxzZSwgbnM6IG5hbWVzcGFjZXMgfSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKGNvcHlbbV0gPT09IGRlZXBLZXkpIGNvcHlbbV0gPSByZXNbbV07IC8vIGlmIG5vdGhpbmcgZm91bmQgdXNlIG9yaWdpbmFsIHZhbHVlIGFzIGZhbGxiYWNrXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJlcyA9IGNvcHk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChoYW5kbGVBc09iamVjdEluSTE4bkZvcm1hdCAmJiB0eXBlb2Ygam9pbkFycmF5cyA9PT0gJ3N0cmluZycgJiYgQXJyYXkuaXNBcnJheShyZXMpKSB7XG4gICAgICAvLyBhcnJheSBzcGVjaWFsIHRyZWF0bWVudFxuICAgICAgcmVzID0gcmVzLmpvaW4oam9pbkFycmF5cyk7XG4gICAgICBpZiAocmVzKSByZXMgPSB0aGlzLmV4dGVuZFRyYW5zbGF0aW9uKHJlcywga2V5cywgb3B0aW9ucywgbGFzdEtleSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIHN0cmluZywgZW1wdHkgb3IgbnVsbFxuICAgICAgbGV0IHVzZWREZWZhdWx0ID0gZmFsc2U7XG4gICAgICBsZXQgdXNlZEtleSA9IGZhbHNlO1xuXG4gICAgICBjb25zdCBuZWVkc1BsdXJhbEhhbmRsaW5nID0gb3B0aW9ucy5jb3VudCAhPT0gdW5kZWZpbmVkICYmIHR5cGVvZiBvcHRpb25zLmNvdW50ICE9PSAnc3RyaW5nJztcbiAgICAgIGNvbnN0IGhhc0RlZmF1bHRWYWx1ZSA9IFRyYW5zbGF0b3IuaGFzRGVmYXVsdFZhbHVlKG9wdGlvbnMpO1xuICAgICAgY29uc3QgZGVmYXVsdFZhbHVlU3VmZml4ID0gbmVlZHNQbHVyYWxIYW5kbGluZ1xuICAgICAgICA/IHRoaXMucGx1cmFsUmVzb2x2ZXIuZ2V0U3VmZml4KGxuZywgb3B0aW9ucy5jb3VudCwgb3B0aW9ucylcbiAgICAgICAgOiAnJztcbiAgICAgIGNvbnN0IGRlZmF1bHRWYWx1ZVN1ZmZpeE9yZGluYWxGYWxsYmFjayA9XG4gICAgICAgIG9wdGlvbnMub3JkaW5hbCAmJiBuZWVkc1BsdXJhbEhhbmRsaW5nXG4gICAgICAgICAgPyB0aGlzLnBsdXJhbFJlc29sdmVyLmdldFN1ZmZpeChsbmcsIG9wdGlvbnMuY291bnQsIHsgb3JkaW5hbDogZmFsc2UgfSlcbiAgICAgICAgICA6ICcnO1xuICAgICAgY29uc3QgbmVlZHNaZXJvU3VmZml4TG9va3VwID1cbiAgICAgICAgbmVlZHNQbHVyYWxIYW5kbGluZyAmJlxuICAgICAgICAhb3B0aW9ucy5vcmRpbmFsICYmXG4gICAgICAgIG9wdGlvbnMuY291bnQgPT09IDAgJiZcbiAgICAgICAgdGhpcy5wbHVyYWxSZXNvbHZlci5zaG91bGRVc2VJbnRsQXBpKCk7XG4gICAgICBjb25zdCBkZWZhdWx0VmFsdWUgPVxuICAgICAgICAobmVlZHNaZXJvU3VmZml4TG9va3VwICYmIG9wdGlvbnNbYGRlZmF1bHRWYWx1ZSR7dGhpcy5vcHRpb25zLnBsdXJhbFNlcGFyYXRvcn16ZXJvYF0pIHx8XG4gICAgICAgIG9wdGlvbnNbYGRlZmF1bHRWYWx1ZSR7ZGVmYXVsdFZhbHVlU3VmZml4fWBdIHx8XG4gICAgICAgIG9wdGlvbnNbYGRlZmF1bHRWYWx1ZSR7ZGVmYXVsdFZhbHVlU3VmZml4T3JkaW5hbEZhbGxiYWNrfWBdIHx8XG4gICAgICAgIG9wdGlvbnMuZGVmYXVsdFZhbHVlO1xuXG4gICAgICAvLyBmYWxsYmFjayB2YWx1ZVxuICAgICAgaWYgKCF0aGlzLmlzVmFsaWRMb29rdXAocmVzKSAmJiBoYXNEZWZhdWx0VmFsdWUpIHtcbiAgICAgICAgdXNlZERlZmF1bHQgPSB0cnVlO1xuICAgICAgICByZXMgPSBkZWZhdWx0VmFsdWU7XG4gICAgICB9XG4gICAgICBpZiAoIXRoaXMuaXNWYWxpZExvb2t1cChyZXMpKSB7XG4gICAgICAgIHVzZWRLZXkgPSB0cnVlO1xuICAgICAgICByZXMgPSBrZXk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IG1pc3NpbmdLZXlOb1ZhbHVlRmFsbGJhY2tUb0tleSA9XG4gICAgICAgIG9wdGlvbnMubWlzc2luZ0tleU5vVmFsdWVGYWxsYmFja1RvS2V5IHx8IHRoaXMub3B0aW9ucy5taXNzaW5nS2V5Tm9WYWx1ZUZhbGxiYWNrVG9LZXk7XG4gICAgICBjb25zdCByZXNGb3JNaXNzaW5nID0gbWlzc2luZ0tleU5vVmFsdWVGYWxsYmFja1RvS2V5ICYmIHVzZWRLZXkgPyB1bmRlZmluZWQgOiByZXM7XG5cbiAgICAgIC8vIHNhdmUgbWlzc2luZ1xuICAgICAgY29uc3QgdXBkYXRlTWlzc2luZyA9IGhhc0RlZmF1bHRWYWx1ZSAmJiBkZWZhdWx0VmFsdWUgIT09IHJlcyAmJiB0aGlzLm9wdGlvbnMudXBkYXRlTWlzc2luZztcbiAgICAgIGlmICh1c2VkS2V5IHx8IHVzZWREZWZhdWx0IHx8IHVwZGF0ZU1pc3NpbmcpIHtcbiAgICAgICAgdGhpcy5sb2dnZXIubG9nKFxuICAgICAgICAgIHVwZGF0ZU1pc3NpbmcgPyAndXBkYXRlS2V5JyA6ICdtaXNzaW5nS2V5JyxcbiAgICAgICAgICBsbmcsXG4gICAgICAgICAgbmFtZXNwYWNlLFxuICAgICAgICAgIGtleSxcbiAgICAgICAgICB1cGRhdGVNaXNzaW5nID8gZGVmYXVsdFZhbHVlIDogcmVzLFxuICAgICAgICApO1xuICAgICAgICBpZiAoa2V5U2VwYXJhdG9yKSB7XG4gICAgICAgICAgY29uc3QgZmsgPSB0aGlzLnJlc29sdmUoa2V5LCB7IC4uLm9wdGlvbnMsIGtleVNlcGFyYXRvcjogZmFsc2UgfSk7XG4gICAgICAgICAgaWYgKGZrICYmIGZrLnJlcylcbiAgICAgICAgICAgIHRoaXMubG9nZ2VyLndhcm4oXG4gICAgICAgICAgICAgICdTZWVtcyB0aGUgbG9hZGVkIHRyYW5zbGF0aW9ucyB3ZXJlIGluIGZsYXQgSlNPTiBmb3JtYXQgaW5zdGVhZCBvZiBuZXN0ZWQuIEVpdGhlciBzZXQga2V5U2VwYXJhdG9yOiBmYWxzZSBvbiBpbml0IG9yIG1ha2Ugc3VyZSB5b3VyIHRyYW5zbGF0aW9ucyBhcmUgcHVibGlzaGVkIGluIG5lc3RlZCBmb3JtYXQuJyxcbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgbG5ncyA9IFtdO1xuICAgICAgICBjb25zdCBmYWxsYmFja0xuZ3MgPSB0aGlzLmxhbmd1YWdlVXRpbHMuZ2V0RmFsbGJhY2tDb2RlcyhcbiAgICAgICAgICB0aGlzLm9wdGlvbnMuZmFsbGJhY2tMbmcsXG4gICAgICAgICAgb3B0aW9ucy5sbmcgfHwgdGhpcy5sYW5ndWFnZSxcbiAgICAgICAgKTtcbiAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5zYXZlTWlzc2luZ1RvID09PSAnZmFsbGJhY2snICYmIGZhbGxiYWNrTG5ncyAmJiBmYWxsYmFja0xuZ3NbMF0pIHtcbiAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGZhbGxiYWNrTG5ncy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgbG5ncy5wdXNoKGZhbGxiYWNrTG5nc1tpXSk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKHRoaXMub3B0aW9ucy5zYXZlTWlzc2luZ1RvID09PSAnYWxsJykge1xuICAgICAgICAgIGxuZ3MgPSB0aGlzLmxhbmd1YWdlVXRpbHMudG9SZXNvbHZlSGllcmFyY2h5KG9wdGlvbnMubG5nIHx8IHRoaXMubGFuZ3VhZ2UpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGxuZ3MucHVzaChvcHRpb25zLmxuZyB8fCB0aGlzLmxhbmd1YWdlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHNlbmQgPSAobCwgaywgc3BlY2lmaWNEZWZhdWx0VmFsdWUpID0+IHtcbiAgICAgICAgICBjb25zdCBkZWZhdWx0Rm9yTWlzc2luZyA9XG4gICAgICAgICAgICBoYXNEZWZhdWx0VmFsdWUgJiYgc3BlY2lmaWNEZWZhdWx0VmFsdWUgIT09IHJlcyA/IHNwZWNpZmljRGVmYXVsdFZhbHVlIDogcmVzRm9yTWlzc2luZztcbiAgICAgICAgICBpZiAodGhpcy5vcHRpb25zLm1pc3NpbmdLZXlIYW5kbGVyKSB7XG4gICAgICAgICAgICB0aGlzLm9wdGlvbnMubWlzc2luZ0tleUhhbmRsZXIoXG4gICAgICAgICAgICAgIGwsXG4gICAgICAgICAgICAgIG5hbWVzcGFjZSxcbiAgICAgICAgICAgICAgayxcbiAgICAgICAgICAgICAgZGVmYXVsdEZvck1pc3NpbmcsXG4gICAgICAgICAgICAgIHVwZGF0ZU1pc3NpbmcsXG4gICAgICAgICAgICAgIG9wdGlvbnMsXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH0gZWxzZSBpZiAodGhpcy5iYWNrZW5kQ29ubmVjdG9yICYmIHRoaXMuYmFja2VuZENvbm5lY3Rvci5zYXZlTWlzc2luZykge1xuICAgICAgICAgICAgdGhpcy5iYWNrZW5kQ29ubmVjdG9yLnNhdmVNaXNzaW5nKFxuICAgICAgICAgICAgICBsLFxuICAgICAgICAgICAgICBuYW1lc3BhY2UsXG4gICAgICAgICAgICAgIGssXG4gICAgICAgICAgICAgIGRlZmF1bHRGb3JNaXNzaW5nLFxuICAgICAgICAgICAgICB1cGRhdGVNaXNzaW5nLFxuICAgICAgICAgICAgICBvcHRpb25zLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdGhpcy5lbWl0KCdtaXNzaW5nS2V5JywgbCwgbmFtZXNwYWNlLCBrLCByZXMpO1xuICAgICAgICB9O1xuXG4gICAgICAgIGlmICh0aGlzLm9wdGlvbnMuc2F2ZU1pc3NpbmcpIHtcbiAgICAgICAgICBpZiAodGhpcy5vcHRpb25zLnNhdmVNaXNzaW5nUGx1cmFscyAmJiBuZWVkc1BsdXJhbEhhbmRsaW5nKSB7XG4gICAgICAgICAgICBsbmdzLmZvckVhY2goKGxhbmd1YWdlKSA9PiB7XG4gICAgICAgICAgICAgIGNvbnN0IHN1ZmZpeGVzID0gdGhpcy5wbHVyYWxSZXNvbHZlci5nZXRTdWZmaXhlcyhsYW5ndWFnZSwgb3B0aW9ucyk7XG4gICAgICAgICAgICAgIGlmIChcbiAgICAgICAgICAgICAgICBuZWVkc1plcm9TdWZmaXhMb29rdXAgJiZcbiAgICAgICAgICAgICAgICBvcHRpb25zW2BkZWZhdWx0VmFsdWUke3RoaXMub3B0aW9ucy5wbHVyYWxTZXBhcmF0b3J9emVyb2BdICYmXG4gICAgICAgICAgICAgICAgc3VmZml4ZXMuaW5kZXhPZihgJHt0aGlzLm9wdGlvbnMucGx1cmFsU2VwYXJhdG9yfXplcm9gKSA8IDBcbiAgICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgICAgc3VmZml4ZXMucHVzaChgJHt0aGlzLm9wdGlvbnMucGx1cmFsU2VwYXJhdG9yfXplcm9gKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBzdWZmaXhlcy5mb3JFYWNoKChzdWZmaXgpID0+IHtcbiAgICAgICAgICAgICAgICBzZW5kKFtsYW5ndWFnZV0sIGtleSArIHN1ZmZpeCwgb3B0aW9uc1tgZGVmYXVsdFZhbHVlJHtzdWZmaXh9YF0gfHwgZGVmYXVsdFZhbHVlKTtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc2VuZChsbmdzLCBrZXksIGRlZmF1bHRWYWx1ZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIGV4dGVuZFxuICAgICAgcmVzID0gdGhpcy5leHRlbmRUcmFuc2xhdGlvbihyZXMsIGtleXMsIG9wdGlvbnMsIHJlc29sdmVkLCBsYXN0S2V5KTtcblxuICAgICAgLy8gYXBwZW5kIG5hbWVzcGFjZSBpZiBzdGlsbCBrZXlcbiAgICAgIGlmICh1c2VkS2V5ICYmIHJlcyA9PT0ga2V5ICYmIHRoaXMub3B0aW9ucy5hcHBlbmROYW1lc3BhY2VUb01pc3NpbmdLZXkpXG4gICAgICAgIHJlcyA9IGAke25hbWVzcGFjZX06JHtrZXl9YDtcblxuICAgICAgLy8gcGFyc2VNaXNzaW5nS2V5SGFuZGxlclxuICAgICAgaWYgKCh1c2VkS2V5IHx8IHVzZWREZWZhdWx0KSAmJiB0aGlzLm9wdGlvbnMucGFyc2VNaXNzaW5nS2V5SGFuZGxlcikge1xuICAgICAgICBpZiAodGhpcy5vcHRpb25zLmNvbXBhdGliaWxpdHlBUEkgIT09ICd2MScpIHtcbiAgICAgICAgICByZXMgPSB0aGlzLm9wdGlvbnMucGFyc2VNaXNzaW5nS2V5SGFuZGxlcihcbiAgICAgICAgICAgIHRoaXMub3B0aW9ucy5hcHBlbmROYW1lc3BhY2VUb01pc3NpbmdLZXkgPyBgJHtuYW1lc3BhY2V9OiR7a2V5fWAgOiBrZXksXG4gICAgICAgICAgICB1c2VkRGVmYXVsdCA/IHJlcyA6IHVuZGVmaW5lZCxcbiAgICAgICAgICApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJlcyA9IHRoaXMub3B0aW9ucy5wYXJzZU1pc3NpbmdLZXlIYW5kbGVyKHJlcyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyByZXR1cm5cbiAgICBpZiAocmV0dXJuRGV0YWlscykge1xuICAgICAgcmVzb2x2ZWQucmVzID0gcmVzO1xuICAgICAgcmVzb2x2ZWQudXNlZFBhcmFtcyA9IHRoaXMuZ2V0VXNlZFBhcmFtc0RldGFpbHMob3B0aW9ucyk7XG4gICAgICByZXR1cm4gcmVzb2x2ZWQ7XG4gICAgfVxuICAgIHJldHVybiByZXM7XG4gIH1cblxuICBleHRlbmRUcmFuc2xhdGlvbihyZXMsIGtleSwgb3B0aW9ucywgcmVzb2x2ZWQsIGxhc3RLZXkpIHtcbiAgICBpZiAodGhpcy5pMThuRm9ybWF0ICYmIHRoaXMuaTE4bkZvcm1hdC5wYXJzZSkge1xuICAgICAgcmVzID0gdGhpcy5pMThuRm9ybWF0LnBhcnNlKFxuICAgICAgICByZXMsXG4gICAgICAgIHsgLi4udGhpcy5vcHRpb25zLmludGVycG9sYXRpb24uZGVmYXVsdFZhcmlhYmxlcywgLi4ub3B0aW9ucyB9LFxuICAgICAgICBvcHRpb25zLmxuZyB8fCB0aGlzLmxhbmd1YWdlIHx8IHJlc29sdmVkLnVzZWRMbmcsXG4gICAgICAgIHJlc29sdmVkLnVzZWROUyxcbiAgICAgICAgcmVzb2x2ZWQudXNlZEtleSxcbiAgICAgICAgeyByZXNvbHZlZCB9LFxuICAgICAgKTtcbiAgICB9IGVsc2UgaWYgKCFvcHRpb25zLnNraXBJbnRlcnBvbGF0aW9uKSB7XG4gICAgICAvLyBpMThuZXh0LnBhcnNpbmdcbiAgICAgIGlmIChvcHRpb25zLmludGVycG9sYXRpb24pXG4gICAgICAgIHRoaXMuaW50ZXJwb2xhdG9yLmluaXQoe1xuICAgICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICAgICAgLi4ueyBpbnRlcnBvbGF0aW9uOiB7IC4uLnRoaXMub3B0aW9ucy5pbnRlcnBvbGF0aW9uLCAuLi5vcHRpb25zLmludGVycG9sYXRpb24gfSB9LFxuICAgICAgICB9KTtcbiAgICAgIGNvbnN0IHNraXBPblZhcmlhYmxlcyA9XG4gICAgICAgIHR5cGVvZiByZXMgPT09ICdzdHJpbmcnICYmXG4gICAgICAgIChvcHRpb25zICYmIG9wdGlvbnMuaW50ZXJwb2xhdGlvbiAmJiBvcHRpb25zLmludGVycG9sYXRpb24uc2tpcE9uVmFyaWFibGVzICE9PSB1bmRlZmluZWRcbiAgICAgICAgICA/IG9wdGlvbnMuaW50ZXJwb2xhdGlvbi5za2lwT25WYXJpYWJsZXNcbiAgICAgICAgICA6IHRoaXMub3B0aW9ucy5pbnRlcnBvbGF0aW9uLnNraXBPblZhcmlhYmxlcyk7XG4gICAgICBsZXQgbmVzdEJlZjtcbiAgICAgIGlmIChza2lwT25WYXJpYWJsZXMpIHtcbiAgICAgICAgY29uc3QgbmIgPSByZXMubWF0Y2godGhpcy5pbnRlcnBvbGF0b3IubmVzdGluZ1JlZ2V4cCk7XG4gICAgICAgIC8vIGhhcyBuZXN0aW5nIGFmdGJlZm9yZWVyIGludGVycG9sYXRpb25cbiAgICAgICAgbmVzdEJlZiA9IG5iICYmIG5iLmxlbmd0aDtcbiAgICAgIH1cblxuICAgICAgLy8gaW50ZXJwb2xhdGVcbiAgICAgIGxldCBkYXRhID0gb3B0aW9ucy5yZXBsYWNlICYmIHR5cGVvZiBvcHRpb25zLnJlcGxhY2UgIT09ICdzdHJpbmcnID8gb3B0aW9ucy5yZXBsYWNlIDogb3B0aW9ucztcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMuaW50ZXJwb2xhdGlvbi5kZWZhdWx0VmFyaWFibGVzKVxuICAgICAgICBkYXRhID0geyAuLi50aGlzLm9wdGlvbnMuaW50ZXJwb2xhdGlvbi5kZWZhdWx0VmFyaWFibGVzLCAuLi5kYXRhIH07XG4gICAgICByZXMgPSB0aGlzLmludGVycG9sYXRvci5pbnRlcnBvbGF0ZShcbiAgICAgICAgcmVzLFxuICAgICAgICBkYXRhLFxuICAgICAgICBvcHRpb25zLmxuZyB8fCB0aGlzLmxhbmd1YWdlIHx8IHJlc29sdmVkLnVzZWRMbmcsXG4gICAgICAgIG9wdGlvbnMsXG4gICAgICApO1xuXG4gICAgICAvLyBuZXN0aW5nXG4gICAgICBpZiAoc2tpcE9uVmFyaWFibGVzKSB7XG4gICAgICAgIGNvbnN0IG5hID0gcmVzLm1hdGNoKHRoaXMuaW50ZXJwb2xhdG9yLm5lc3RpbmdSZWdleHApO1xuICAgICAgICAvLyBoYXMgbmVzdGluZyBhZnRlciBpbnRlcnBvbGF0aW9uXG4gICAgICAgIGNvbnN0IG5lc3RBZnQgPSBuYSAmJiBuYS5sZW5ndGg7XG4gICAgICAgIGlmIChuZXN0QmVmIDwgbmVzdEFmdCkgb3B0aW9ucy5uZXN0ID0gZmFsc2U7XG4gICAgICB9XG4gICAgICBpZiAoIW9wdGlvbnMubG5nICYmIHRoaXMub3B0aW9ucy5jb21wYXRpYmlsaXR5QVBJICE9PSAndjEnICYmIHJlc29sdmVkICYmIHJlc29sdmVkLnJlcylcbiAgICAgICAgb3B0aW9ucy5sbmcgPSB0aGlzLmxhbmd1YWdlIHx8IHJlc29sdmVkLnVzZWRMbmc7XG4gICAgICBpZiAob3B0aW9ucy5uZXN0ICE9PSBmYWxzZSlcbiAgICAgICAgcmVzID0gdGhpcy5pbnRlcnBvbGF0b3IubmVzdChcbiAgICAgICAgICByZXMsXG4gICAgICAgICAgKC4uLmFyZ3MpID0+IHtcbiAgICAgICAgICAgIGlmIChsYXN0S2V5ICYmIGxhc3RLZXlbMF0gPT09IGFyZ3NbMF0gJiYgIW9wdGlvbnMuY29udGV4dCkge1xuICAgICAgICAgICAgICB0aGlzLmxvZ2dlci53YXJuKFxuICAgICAgICAgICAgICAgIGBJdCBzZWVtcyB5b3UgYXJlIG5lc3RpbmcgcmVjdXJzaXZlbHkga2V5OiAke2FyZ3NbMF19IGluIGtleTogJHtrZXlbMF19YCxcbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhpcy50cmFuc2xhdGUoLi4uYXJncywga2V5KTtcbiAgICAgICAgICB9LFxuICAgICAgICAgIG9wdGlvbnMsXG4gICAgICAgICk7XG5cbiAgICAgIGlmIChvcHRpb25zLmludGVycG9sYXRpb24pIHRoaXMuaW50ZXJwb2xhdG9yLnJlc2V0KCk7XG4gICAgfVxuXG4gICAgLy8gcG9zdCBwcm9jZXNzXG4gICAgY29uc3QgcG9zdFByb2Nlc3MgPSBvcHRpb25zLnBvc3RQcm9jZXNzIHx8IHRoaXMub3B0aW9ucy5wb3N0UHJvY2VzcztcbiAgICBjb25zdCBwb3N0UHJvY2Vzc29yTmFtZXMgPSB0eXBlb2YgcG9zdFByb2Nlc3MgPT09ICdzdHJpbmcnID8gW3Bvc3RQcm9jZXNzXSA6IHBvc3RQcm9jZXNzO1xuXG4gICAgaWYgKFxuICAgICAgcmVzICE9PSB1bmRlZmluZWQgJiZcbiAgICAgIHJlcyAhPT0gbnVsbCAmJlxuICAgICAgcG9zdFByb2Nlc3Nvck5hbWVzICYmXG4gICAgICBwb3N0UHJvY2Vzc29yTmFtZXMubGVuZ3RoICYmXG4gICAgICBvcHRpb25zLmFwcGx5UG9zdFByb2Nlc3NvciAhPT0gZmFsc2VcbiAgICApIHtcbiAgICAgIHJlcyA9IHBvc3RQcm9jZXNzb3IuaGFuZGxlKFxuICAgICAgICBwb3N0UHJvY2Vzc29yTmFtZXMsXG4gICAgICAgIHJlcyxcbiAgICAgICAga2V5LFxuICAgICAgICB0aGlzLm9wdGlvbnMgJiYgdGhpcy5vcHRpb25zLnBvc3RQcm9jZXNzUGFzc1Jlc29sdmVkXG4gICAgICAgICAgPyB7XG4gICAgICAgICAgICAgIGkxOG5SZXNvbHZlZDogeyAuLi5yZXNvbHZlZCwgdXNlZFBhcmFtczogdGhpcy5nZXRVc2VkUGFyYW1zRGV0YWlscyhvcHRpb25zKSB9LFxuICAgICAgICAgICAgICAuLi5vcHRpb25zLFxuICAgICAgICAgICAgfVxuICAgICAgICAgIDogb3B0aW9ucyxcbiAgICAgICAgdGhpcyxcbiAgICAgICk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlcztcbiAgfVxuXG4gIHJlc29sdmUoa2V5cywgb3B0aW9ucyA9IHt9KSB7XG4gICAgbGV0IGZvdW5kO1xuICAgIGxldCB1c2VkS2V5OyAvLyBwbGFpbiBrZXlcbiAgICBsZXQgZXhhY3RVc2VkS2V5OyAvLyBrZXkgd2l0aCBjb250ZXh0IC8gcGx1cmFsXG4gICAgbGV0IHVzZWRMbmc7XG4gICAgbGV0IHVzZWROUztcblxuICAgIGlmICh0eXBlb2Yga2V5cyA9PT0gJ3N0cmluZycpIGtleXMgPSBba2V5c107XG5cbiAgICAvLyBmb3JFYWNoIHBvc3NpYmxlIGtleVxuICAgIGtleXMuZm9yRWFjaCgoaykgPT4ge1xuICAgICAgaWYgKHRoaXMuaXNWYWxpZExvb2t1cChmb3VuZCkpIHJldHVybjtcbiAgICAgIGNvbnN0IGV4dHJhY3RlZCA9IHRoaXMuZXh0cmFjdEZyb21LZXkoaywgb3B0aW9ucyk7XG4gICAgICBjb25zdCBrZXkgPSBleHRyYWN0ZWQua2V5O1xuICAgICAgdXNlZEtleSA9IGtleTtcbiAgICAgIGxldCBuYW1lc3BhY2VzID0gZXh0cmFjdGVkLm5hbWVzcGFjZXM7XG4gICAgICBpZiAodGhpcy5vcHRpb25zLmZhbGxiYWNrTlMpIG5hbWVzcGFjZXMgPSBuYW1lc3BhY2VzLmNvbmNhdCh0aGlzLm9wdGlvbnMuZmFsbGJhY2tOUyk7XG5cbiAgICAgIGNvbnN0IG5lZWRzUGx1cmFsSGFuZGxpbmcgPSBvcHRpb25zLmNvdW50ICE9PSB1bmRlZmluZWQgJiYgdHlwZW9mIG9wdGlvbnMuY291bnQgIT09ICdzdHJpbmcnO1xuICAgICAgY29uc3QgbmVlZHNaZXJvU3VmZml4TG9va3VwID1cbiAgICAgICAgbmVlZHNQbHVyYWxIYW5kbGluZyAmJlxuICAgICAgICAhb3B0aW9ucy5vcmRpbmFsICYmXG4gICAgICAgIG9wdGlvbnMuY291bnQgPT09IDAgJiZcbiAgICAgICAgdGhpcy5wbHVyYWxSZXNvbHZlci5zaG91bGRVc2VJbnRsQXBpKCk7XG4gICAgICBjb25zdCBuZWVkc0NvbnRleHRIYW5kbGluZyA9XG4gICAgICAgIG9wdGlvbnMuY29udGV4dCAhPT0gdW5kZWZpbmVkICYmXG4gICAgICAgICh0eXBlb2Ygb3B0aW9ucy5jb250ZXh0ID09PSAnc3RyaW5nJyB8fCB0eXBlb2Ygb3B0aW9ucy5jb250ZXh0ID09PSAnbnVtYmVyJykgJiZcbiAgICAgICAgb3B0aW9ucy5jb250ZXh0ICE9PSAnJztcblxuICAgICAgY29uc3QgY29kZXMgPSBvcHRpb25zLmxuZ3NcbiAgICAgICAgPyBvcHRpb25zLmxuZ3NcbiAgICAgICAgOiB0aGlzLmxhbmd1YWdlVXRpbHMudG9SZXNvbHZlSGllcmFyY2h5KG9wdGlvbnMubG5nIHx8IHRoaXMubGFuZ3VhZ2UsIG9wdGlvbnMuZmFsbGJhY2tMbmcpO1xuXG4gICAgICBuYW1lc3BhY2VzLmZvckVhY2goKG5zKSA9PiB7XG4gICAgICAgIGlmICh0aGlzLmlzVmFsaWRMb29rdXAoZm91bmQpKSByZXR1cm47XG4gICAgICAgIHVzZWROUyA9IG5zO1xuXG4gICAgICAgIGlmIChcbiAgICAgICAgICAhY2hlY2tlZExvYWRlZEZvcltgJHtjb2Rlc1swXX0tJHtuc31gXSAmJlxuICAgICAgICAgIHRoaXMudXRpbHMgJiZcbiAgICAgICAgICB0aGlzLnV0aWxzLmhhc0xvYWRlZE5hbWVzcGFjZSAmJlxuICAgICAgICAgICF0aGlzLnV0aWxzLmhhc0xvYWRlZE5hbWVzcGFjZSh1c2VkTlMpXG4gICAgICAgICkge1xuICAgICAgICAgIGNoZWNrZWRMb2FkZWRGb3JbYCR7Y29kZXNbMF19LSR7bnN9YF0gPSB0cnVlO1xuICAgICAgICAgIHRoaXMubG9nZ2VyLndhcm4oXG4gICAgICAgICAgICBga2V5IFwiJHt1c2VkS2V5fVwiIGZvciBsYW5ndWFnZXMgXCIke2NvZGVzLmpvaW4oXG4gICAgICAgICAgICAgICcsICcsXG4gICAgICAgICAgICApfVwiIHdvbid0IGdldCByZXNvbHZlZCBhcyBuYW1lc3BhY2UgXCIke3VzZWROU31cIiB3YXMgbm90IHlldCBsb2FkZWRgLFxuICAgICAgICAgICAgJ1RoaXMgbWVhbnMgc29tZXRoaW5nIElTIFdST05HIGluIHlvdXIgc2V0dXAuIFlvdSBhY2Nlc3MgdGhlIHQgZnVuY3Rpb24gYmVmb3JlIGkxOG5leHQuaW5pdCAvIGkxOG5leHQubG9hZE5hbWVzcGFjZSAvIGkxOG5leHQuY2hhbmdlTGFuZ3VhZ2Ugd2FzIGRvbmUuIFdhaXQgZm9yIHRoZSBjYWxsYmFjayBvciBQcm9taXNlIHRvIHJlc29sdmUgYmVmb3JlIGFjY2Vzc2luZyBpdCEhIScsXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvZGVzLmZvckVhY2goKGNvZGUpID0+IHtcbiAgICAgICAgICBpZiAodGhpcy5pc1ZhbGlkTG9va3VwKGZvdW5kKSkgcmV0dXJuO1xuICAgICAgICAgIHVzZWRMbmcgPSBjb2RlO1xuXG4gICAgICAgICAgY29uc3QgZmluYWxLZXlzID0gW2tleV07XG5cbiAgICAgICAgICBpZiAodGhpcy5pMThuRm9ybWF0ICYmIHRoaXMuaTE4bkZvcm1hdC5hZGRMb29rdXBLZXlzKSB7XG4gICAgICAgICAgICB0aGlzLmkxOG5Gb3JtYXQuYWRkTG9va3VwS2V5cyhmaW5hbEtleXMsIGtleSwgY29kZSwgbnMsIG9wdGlvbnMpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsZXQgcGx1cmFsU3VmZml4O1xuICAgICAgICAgICAgaWYgKG5lZWRzUGx1cmFsSGFuZGxpbmcpXG4gICAgICAgICAgICAgIHBsdXJhbFN1ZmZpeCA9IHRoaXMucGx1cmFsUmVzb2x2ZXIuZ2V0U3VmZml4KGNvZGUsIG9wdGlvbnMuY291bnQsIG9wdGlvbnMpO1xuICAgICAgICAgICAgY29uc3QgemVyb1N1ZmZpeCA9IGAke3RoaXMub3B0aW9ucy5wbHVyYWxTZXBhcmF0b3J9emVyb2A7XG4gICAgICAgICAgICBjb25zdCBvcmRpbmFsUHJlZml4ID0gYCR7dGhpcy5vcHRpb25zLnBsdXJhbFNlcGFyYXRvcn1vcmRpbmFsJHt0aGlzLm9wdGlvbnMucGx1cmFsU2VwYXJhdG9yfWA7XG4gICAgICAgICAgICAvLyBnZXQga2V5IGZvciBwbHVyYWwgaWYgbmVlZGVkXG4gICAgICAgICAgICBpZiAobmVlZHNQbHVyYWxIYW5kbGluZykge1xuICAgICAgICAgICAgICBmaW5hbEtleXMucHVzaChrZXkgKyBwbHVyYWxTdWZmaXgpO1xuICAgICAgICAgICAgICBpZiAob3B0aW9ucy5vcmRpbmFsICYmIHBsdXJhbFN1ZmZpeC5pbmRleE9mKG9yZGluYWxQcmVmaXgpID09PSAwKSB7XG4gICAgICAgICAgICAgICAgZmluYWxLZXlzLnB1c2goXG4gICAgICAgICAgICAgICAgICBrZXkgKyBwbHVyYWxTdWZmaXgucmVwbGFjZShvcmRpbmFsUHJlZml4LCB0aGlzLm9wdGlvbnMucGx1cmFsU2VwYXJhdG9yKSxcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGlmIChuZWVkc1plcm9TdWZmaXhMb29rdXApIHtcbiAgICAgICAgICAgICAgICBmaW5hbEtleXMucHVzaChrZXkgKyB6ZXJvU3VmZml4KTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBnZXQga2V5IGZvciBjb250ZXh0IGlmIG5lZWRlZFxuICAgICAgICAgICAgaWYgKG5lZWRzQ29udGV4dEhhbmRsaW5nKSB7XG4gICAgICAgICAgICAgIGNvbnN0IGNvbnRleHRLZXkgPSBgJHtrZXl9JHt0aGlzLm9wdGlvbnMuY29udGV4dFNlcGFyYXRvcn0ke29wdGlvbnMuY29udGV4dH1gO1xuICAgICAgICAgICAgICBmaW5hbEtleXMucHVzaChjb250ZXh0S2V5KTtcblxuICAgICAgICAgICAgICAvLyBnZXQga2V5IGZvciBjb250ZXh0ICsgcGx1cmFsIGlmIG5lZWRlZFxuICAgICAgICAgICAgICBpZiAobmVlZHNQbHVyYWxIYW5kbGluZykge1xuICAgICAgICAgICAgICAgIGZpbmFsS2V5cy5wdXNoKGNvbnRleHRLZXkgKyBwbHVyYWxTdWZmaXgpO1xuICAgICAgICAgICAgICAgIGlmIChvcHRpb25zLm9yZGluYWwgJiYgcGx1cmFsU3VmZml4LmluZGV4T2Yob3JkaW5hbFByZWZpeCkgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgIGZpbmFsS2V5cy5wdXNoKFxuICAgICAgICAgICAgICAgICAgICBjb250ZXh0S2V5ICsgcGx1cmFsU3VmZml4LnJlcGxhY2Uob3JkaW5hbFByZWZpeCwgdGhpcy5vcHRpb25zLnBsdXJhbFNlcGFyYXRvciksXG4gICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAobmVlZHNaZXJvU3VmZml4TG9va3VwKSB7XG4gICAgICAgICAgICAgICAgICBmaW5hbEtleXMucHVzaChjb250ZXh0S2V5ICsgemVyb1N1ZmZpeCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gaXRlcmF0ZSBvdmVyIGZpbmFsS2V5cyBzdGFydGluZyB3aXRoIG1vc3Qgc3BlY2lmaWMgcGx1cmFsa2V5ICgtPiBjb250ZXh0a2V5IG9ubHkpIC0+IHNpbmd1bGFya2V5IG9ubHlcbiAgICAgICAgICBsZXQgcG9zc2libGVLZXk7XG4gICAgICAgICAgLyogZXNsaW50IG5vLWNvbmQtYXNzaWduOiAwICovXG4gICAgICAgICAgd2hpbGUgKChwb3NzaWJsZUtleSA9IGZpbmFsS2V5cy5wb3AoKSkpIHtcbiAgICAgICAgICAgIGlmICghdGhpcy5pc1ZhbGlkTG9va3VwKGZvdW5kKSkge1xuICAgICAgICAgICAgICBleGFjdFVzZWRLZXkgPSBwb3NzaWJsZUtleTtcbiAgICAgICAgICAgICAgZm91bmQgPSB0aGlzLmdldFJlc291cmNlKGNvZGUsIG5zLCBwb3NzaWJsZUtleSwgb3B0aW9ucyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHsgcmVzOiBmb3VuZCwgdXNlZEtleSwgZXhhY3RVc2VkS2V5LCB1c2VkTG5nLCB1c2VkTlMgfTtcbiAgfVxuXG4gIGlzVmFsaWRMb29rdXAocmVzKSB7XG4gICAgcmV0dXJuIChcbiAgICAgIHJlcyAhPT0gdW5kZWZpbmVkICYmXG4gICAgICAhKCF0aGlzLm9wdGlvbnMucmV0dXJuTnVsbCAmJiByZXMgPT09IG51bGwpICYmXG4gICAgICAhKCF0aGlzLm9wdGlvbnMucmV0dXJuRW1wdHlTdHJpbmcgJiYgcmVzID09PSAnJylcbiAgICApO1xuICB9XG5cbiAgZ2V0UmVzb3VyY2UoY29kZSwgbnMsIGtleSwgb3B0aW9ucyA9IHt9KSB7XG4gICAgaWYgKHRoaXMuaTE4bkZvcm1hdCAmJiB0aGlzLmkxOG5Gb3JtYXQuZ2V0UmVzb3VyY2UpXG4gICAgICByZXR1cm4gdGhpcy5pMThuRm9ybWF0LmdldFJlc291cmNlKGNvZGUsIG5zLCBrZXksIG9wdGlvbnMpO1xuICAgIHJldHVybiB0aGlzLnJlc291cmNlU3RvcmUuZ2V0UmVzb3VyY2UoY29kZSwgbnMsIGtleSwgb3B0aW9ucyk7XG4gIH1cblxuICBnZXRVc2VkUGFyYW1zRGV0YWlscyhvcHRpb25zID0ge30pIHtcbiAgICAvLyB3ZSBuZWVkIHRvIHJlbWVtYmVyIHRvIGV4dGVuZCB0aGlzIGFycmF5IHdoZW5ldmVyIG5ldyBvcHRpb24gcHJvcGVydGllcyBhcmUgYWRkZWRcbiAgICBjb25zdCBvcHRpb25zS2V5cyA9IFtcbiAgICAgICdkZWZhdWx0VmFsdWUnLFxuICAgICAgJ29yZGluYWwnLFxuICAgICAgJ2NvbnRleHQnLFxuICAgICAgJ3JlcGxhY2UnLFxuICAgICAgJ2xuZycsXG4gICAgICAnbG5ncycsXG4gICAgICAnZmFsbGJhY2tMbmcnLFxuICAgICAgJ25zJyxcbiAgICAgICdrZXlTZXBhcmF0b3InLFxuICAgICAgJ25zU2VwYXJhdG9yJyxcbiAgICAgICdyZXR1cm5PYmplY3RzJyxcbiAgICAgICdyZXR1cm5EZXRhaWxzJyxcbiAgICAgICdqb2luQXJyYXlzJyxcbiAgICAgICdwb3N0UHJvY2VzcycsXG4gICAgICAnaW50ZXJwb2xhdGlvbicsXG4gICAgXTtcblxuICAgIGNvbnN0IHVzZU9wdGlvbnNSZXBsYWNlRm9yRGF0YSA9IG9wdGlvbnMucmVwbGFjZSAmJiB0eXBlb2Ygb3B0aW9ucy5yZXBsYWNlICE9PSAnc3RyaW5nJztcbiAgICBsZXQgZGF0YSA9IHVzZU9wdGlvbnNSZXBsYWNlRm9yRGF0YSA/IG9wdGlvbnMucmVwbGFjZSA6IG9wdGlvbnM7XG4gICAgaWYgKHVzZU9wdGlvbnNSZXBsYWNlRm9yRGF0YSAmJiB0eXBlb2Ygb3B0aW9ucy5jb3VudCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIGRhdGEuY291bnQgPSBvcHRpb25zLmNvdW50O1xuICAgIH1cblxuICAgIGlmICh0aGlzLm9wdGlvbnMuaW50ZXJwb2xhdGlvbi5kZWZhdWx0VmFyaWFibGVzKSB7XG4gICAgICBkYXRhID0geyAuLi50aGlzLm9wdGlvbnMuaW50ZXJwb2xhdGlvbi5kZWZhdWx0VmFyaWFibGVzLCAuLi5kYXRhIH07XG4gICAgfVxuXG4gICAgLy8gYXZvaWQgcmVwb3J0aW5nIG9wdGlvbnMgKGV4ZWNwdCBjb3VudCkgYXMgdXNlZFBhcmFtc1xuICAgIGlmICghdXNlT3B0aW9uc1JlcGxhY2VGb3JEYXRhKSB7XG4gICAgICBkYXRhID0geyAuLi5kYXRhIH07XG4gICAgICBmb3IgKGNvbnN0IGtleSBvZiBvcHRpb25zS2V5cykge1xuICAgICAgICBkZWxldGUgZGF0YVtrZXldO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBkYXRhO1xuICB9XG5cbiAgc3RhdGljIGhhc0RlZmF1bHRWYWx1ZShvcHRpb25zKSB7XG4gICAgY29uc3QgcHJlZml4ID0gJ2RlZmF1bHRWYWx1ZSc7XG5cbiAgICBmb3IgKGNvbnN0IG9wdGlvbiBpbiBvcHRpb25zKSB7XG4gICAgICBpZiAoXG4gICAgICAgIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvcHRpb25zLCBvcHRpb24pICYmXG4gICAgICAgIHByZWZpeCA9PT0gb3B0aW9uLnN1YnN0cmluZygwLCBwcmVmaXgubGVuZ3RoKSAmJlxuICAgICAgICB1bmRlZmluZWQgIT09IG9wdGlvbnNbb3B0aW9uXVxuICAgICAgKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBUcmFuc2xhdG9yO1xuIiwiaW1wb3J0IGJhc2VMb2dnZXIgZnJvbSAnLi9sb2dnZXIuanMnO1xuaW1wb3J0IHsgZ2V0Q2xlYW5lZENvZGUgfSBmcm9tICcuL3V0aWxzLmpzJztcblxuY29uc3QgY2FwaXRhbGl6ZSA9IChzdHJpbmcpID0+IHN0cmluZy5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIHN0cmluZy5zbGljZSgxKTtcblxuY2xhc3MgTGFuZ3VhZ2VVdGlsIHtcbiAgY29uc3RydWN0b3Iob3B0aW9ucykge1xuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG5cbiAgICB0aGlzLnN1cHBvcnRlZExuZ3MgPSB0aGlzLm9wdGlvbnMuc3VwcG9ydGVkTG5ncyB8fCBmYWxzZTtcbiAgICB0aGlzLmxvZ2dlciA9IGJhc2VMb2dnZXIuY3JlYXRlKCdsYW5ndWFnZVV0aWxzJyk7XG4gIH1cblxuICBnZXRTY3JpcHRQYXJ0RnJvbUNvZGUoY29kZSkge1xuICAgIGNvZGUgPSBnZXRDbGVhbmVkQ29kZShjb2RlKTtcbiAgICBpZiAoIWNvZGUgfHwgY29kZS5pbmRleE9mKCctJykgPCAwKSByZXR1cm4gbnVsbDtcblxuICAgIGNvbnN0IHAgPSBjb2RlLnNwbGl0KCctJyk7XG4gICAgaWYgKHAubGVuZ3RoID09PSAyKSByZXR1cm4gbnVsbDtcbiAgICBwLnBvcCgpO1xuICAgIGlmIChwW3AubGVuZ3RoIC0gMV0udG9Mb3dlckNhc2UoKSA9PT0gJ3gnKSByZXR1cm4gbnVsbDtcbiAgICByZXR1cm4gdGhpcy5mb3JtYXRMYW5ndWFnZUNvZGUocC5qb2luKCctJykpO1xuICB9XG5cbiAgZ2V0TGFuZ3VhZ2VQYXJ0RnJvbUNvZGUoY29kZSkge1xuICAgIGNvZGUgPSBnZXRDbGVhbmVkQ29kZShjb2RlKTtcbiAgICBpZiAoIWNvZGUgfHwgY29kZS5pbmRleE9mKCctJykgPCAwKSByZXR1cm4gY29kZTtcblxuICAgIGNvbnN0IHAgPSBjb2RlLnNwbGl0KCctJyk7XG4gICAgcmV0dXJuIHRoaXMuZm9ybWF0TGFuZ3VhZ2VDb2RlKHBbMF0pO1xuICB9XG5cbiAgZm9ybWF0TGFuZ3VhZ2VDb2RlKGNvZGUpIHtcbiAgICAvLyBodHRwOi8vd3d3LmlhbmEub3JnL2Fzc2lnbm1lbnRzL2xhbmd1YWdlLXRhZ3MvbGFuZ3VhZ2UtdGFncy54aHRtbFxuICAgIGlmICh0eXBlb2YgY29kZSA9PT0gJ3N0cmluZycgJiYgY29kZS5pbmRleE9mKCctJykgPiAtMSkge1xuICAgICAgY29uc3Qgc3BlY2lhbENhc2VzID0gWydoYW5zJywgJ2hhbnQnLCAnbGF0bicsICdjeXJsJywgJ2NhbnMnLCAnbW9uZycsICdhcmFiJ107XG4gICAgICBsZXQgcCA9IGNvZGUuc3BsaXQoJy0nKTtcblxuICAgICAgaWYgKHRoaXMub3B0aW9ucy5sb3dlckNhc2VMbmcpIHtcbiAgICAgICAgcCA9IHAubWFwKChwYXJ0KSA9PiBwYXJ0LnRvTG93ZXJDYXNlKCkpO1xuICAgICAgfSBlbHNlIGlmIChwLmxlbmd0aCA9PT0gMikge1xuICAgICAgICBwWzBdID0gcFswXS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICBwWzFdID0gcFsxXS50b1VwcGVyQ2FzZSgpO1xuXG4gICAgICAgIGlmIChzcGVjaWFsQ2FzZXMuaW5kZXhPZihwWzFdLnRvTG93ZXJDYXNlKCkpID4gLTEpIHBbMV0gPSBjYXBpdGFsaXplKHBbMV0udG9Mb3dlckNhc2UoKSk7XG4gICAgICB9IGVsc2UgaWYgKHAubGVuZ3RoID09PSAzKSB7XG4gICAgICAgIHBbMF0gPSBwWzBdLnRvTG93ZXJDYXNlKCk7XG5cbiAgICAgICAgLy8gaWYgbGVuZ3RoIDIgZ3Vlc3MgaXQncyBhIGNvdW50cnlcbiAgICAgICAgaWYgKHBbMV0ubGVuZ3RoID09PSAyKSBwWzFdID0gcFsxXS50b1VwcGVyQ2FzZSgpO1xuICAgICAgICBpZiAocFswXSAhPT0gJ3NnbicgJiYgcFsyXS5sZW5ndGggPT09IDIpIHBbMl0gPSBwWzJdLnRvVXBwZXJDYXNlKCk7XG5cbiAgICAgICAgaWYgKHNwZWNpYWxDYXNlcy5pbmRleE9mKHBbMV0udG9Mb3dlckNhc2UoKSkgPiAtMSkgcFsxXSA9IGNhcGl0YWxpemUocFsxXS50b0xvd2VyQ2FzZSgpKTtcbiAgICAgICAgaWYgKHNwZWNpYWxDYXNlcy5pbmRleE9mKHBbMl0udG9Mb3dlckNhc2UoKSkgPiAtMSkgcFsyXSA9IGNhcGl0YWxpemUocFsyXS50b0xvd2VyQ2FzZSgpKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHAuam9pbignLScpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLm9wdGlvbnMuY2xlYW5Db2RlIHx8IHRoaXMub3B0aW9ucy5sb3dlckNhc2VMbmcgPyBjb2RlLnRvTG93ZXJDYXNlKCkgOiBjb2RlO1xuICB9XG5cbiAgaXNTdXBwb3J0ZWRDb2RlKGNvZGUpIHtcbiAgICBpZiAodGhpcy5vcHRpb25zLmxvYWQgPT09ICdsYW5ndWFnZU9ubHknIHx8IHRoaXMub3B0aW9ucy5ub25FeHBsaWNpdFN1cHBvcnRlZExuZ3MpIHtcbiAgICAgIGNvZGUgPSB0aGlzLmdldExhbmd1YWdlUGFydEZyb21Db2RlKGNvZGUpO1xuICAgIH1cbiAgICByZXR1cm4gKFxuICAgICAgIXRoaXMuc3VwcG9ydGVkTG5ncyB8fCAhdGhpcy5zdXBwb3J0ZWRMbmdzLmxlbmd0aCB8fCB0aGlzLnN1cHBvcnRlZExuZ3MuaW5kZXhPZihjb2RlKSA+IC0xXG4gICAgKTtcbiAgfVxuXG4gIGdldEJlc3RNYXRjaEZyb21Db2Rlcyhjb2Rlcykge1xuICAgIGlmICghY29kZXMpIHJldHVybiBudWxsO1xuXG4gICAgbGV0IGZvdW5kO1xuXG4gICAgLy8gcGljayBmaXJzdCBzdXBwb3J0ZWQgY29kZSBvciBpZiBubyByZXN0cmljdGlvbiBwaWNrIHRoZSBmaXJzdCBvbmUgKGhpZ2hlc3QgcHJpbylcbiAgICBjb2Rlcy5mb3JFYWNoKChjb2RlKSA9PiB7XG4gICAgICBpZiAoZm91bmQpIHJldHVybjtcbiAgICAgIGNvbnN0IGNsZWFuZWRMbmcgPSB0aGlzLmZvcm1hdExhbmd1YWdlQ29kZShjb2RlKTtcbiAgICAgIGlmICghdGhpcy5vcHRpb25zLnN1cHBvcnRlZExuZ3MgfHwgdGhpcy5pc1N1cHBvcnRlZENvZGUoY2xlYW5lZExuZykpIGZvdW5kID0gY2xlYW5lZExuZztcbiAgICB9KTtcblxuICAgIC8vIGlmIHdlIGdvdCBubyBtYXRjaCBpbiBzdXBwb3J0ZWRMbmdzIHlldCAtIGNoZWNrIGZvciBzaW1pbGFyIGxvY2FsZXNcbiAgICAvLyBmaXJzdCAgZGUtQ0ggLS0+IGRlXG4gICAgLy8gc2Vjb25kIGRlLUNIIC0tPiBkZS1ERVxuICAgIGlmICghZm91bmQgJiYgdGhpcy5vcHRpb25zLnN1cHBvcnRlZExuZ3MpIHtcbiAgICAgIGNvZGVzLmZvckVhY2goKGNvZGUpID0+IHtcbiAgICAgICAgaWYgKGZvdW5kKSByZXR1cm47XG5cbiAgICAgICAgY29uc3QgbG5nT25seSA9IHRoaXMuZ2V0TGFuZ3VhZ2VQYXJ0RnJvbUNvZGUoY29kZSk7XG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1yZXR1cm4tYXNzaWduXG4gICAgICAgIGlmICh0aGlzLmlzU3VwcG9ydGVkQ29kZShsbmdPbmx5KSkgcmV0dXJuIChmb3VuZCA9IGxuZ09ubHkpO1xuXG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBhcnJheS1jYWxsYmFjay1yZXR1cm5cbiAgICAgICAgZm91bmQgPSB0aGlzLm9wdGlvbnMuc3VwcG9ydGVkTG5ncy5maW5kKChzdXBwb3J0ZWRMbmcpID0+IHtcbiAgICAgICAgICBpZiAoc3VwcG9ydGVkTG5nID09PSBsbmdPbmx5KSByZXR1cm4gc3VwcG9ydGVkTG5nO1xuICAgICAgICAgIGlmIChzdXBwb3J0ZWRMbmcuaW5kZXhPZignLScpIDwgMCAmJiBsbmdPbmx5LmluZGV4T2YoJy0nKSA8IDApIHJldHVybjtcbiAgICAgICAgICBpZiAoXG4gICAgICAgICAgICBzdXBwb3J0ZWRMbmcuaW5kZXhPZignLScpID4gMCAmJlxuICAgICAgICAgICAgbG5nT25seS5pbmRleE9mKCctJykgPCAwICYmXG4gICAgICAgICAgICBzdXBwb3J0ZWRMbmcuc3Vic3RyaW5nKDAsIHN1cHBvcnRlZExuZy5pbmRleE9mKCctJykpID09PSBsbmdPbmx5XG4gICAgICAgICAgKVxuICAgICAgICAgICAgcmV0dXJuIHN1cHBvcnRlZExuZztcbiAgICAgICAgICBpZiAoc3VwcG9ydGVkTG5nLmluZGV4T2YobG5nT25seSkgPT09IDAgJiYgbG5nT25seS5sZW5ndGggPiAxKSByZXR1cm4gc3VwcG9ydGVkTG5nO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH1cbiAgICAvLyBpZiBub3RoaW5nIGZvdW5kLCB1c2UgZmFsbGJhY2tMbmdcbiAgICBpZiAoIWZvdW5kKSBmb3VuZCA9IHRoaXMuZ2V0RmFsbGJhY2tDb2Rlcyh0aGlzLm9wdGlvbnMuZmFsbGJhY2tMbmcpWzBdO1xuXG4gICAgcmV0dXJuIGZvdW5kO1xuICB9XG5cbiAgZ2V0RmFsbGJhY2tDb2RlcyhmYWxsYmFja3MsIGNvZGUpIHtcbiAgICBpZiAoIWZhbGxiYWNrcykgcmV0dXJuIFtdO1xuICAgIGlmICh0eXBlb2YgZmFsbGJhY2tzID09PSAnZnVuY3Rpb24nKSBmYWxsYmFja3MgPSBmYWxsYmFja3MoY29kZSk7XG4gICAgaWYgKHR5cGVvZiBmYWxsYmFja3MgPT09ICdzdHJpbmcnKSBmYWxsYmFja3MgPSBbZmFsbGJhY2tzXTtcbiAgICBpZiAoQXJyYXkuaXNBcnJheShmYWxsYmFja3MpKSByZXR1cm4gZmFsbGJhY2tzO1xuXG4gICAgaWYgKCFjb2RlKSByZXR1cm4gZmFsbGJhY2tzLmRlZmF1bHQgfHwgW107XG5cbiAgICAvLyBhc3N1bWUgd2UgaGF2ZSBhbiBvYmplY3QgZGVmaW5pbmcgZmFsbGJhY2tzXG4gICAgbGV0IGZvdW5kID0gZmFsbGJhY2tzW2NvZGVdO1xuICAgIGlmICghZm91bmQpIGZvdW5kID0gZmFsbGJhY2tzW3RoaXMuZ2V0U2NyaXB0UGFydEZyb21Db2RlKGNvZGUpXTtcbiAgICBpZiAoIWZvdW5kKSBmb3VuZCA9IGZhbGxiYWNrc1t0aGlzLmZvcm1hdExhbmd1YWdlQ29kZShjb2RlKV07XG4gICAgaWYgKCFmb3VuZCkgZm91bmQgPSBmYWxsYmFja3NbdGhpcy5nZXRMYW5ndWFnZVBhcnRGcm9tQ29kZShjb2RlKV07XG4gICAgaWYgKCFmb3VuZCkgZm91bmQgPSBmYWxsYmFja3MuZGVmYXVsdDtcblxuICAgIHJldHVybiBmb3VuZCB8fCBbXTtcbiAgfVxuXG4gIHRvUmVzb2x2ZUhpZXJhcmNoeShjb2RlLCBmYWxsYmFja0NvZGUpIHtcbiAgICBjb25zdCBmYWxsYmFja0NvZGVzID0gdGhpcy5nZXRGYWxsYmFja0NvZGVzKFxuICAgICAgZmFsbGJhY2tDb2RlIHx8IHRoaXMub3B0aW9ucy5mYWxsYmFja0xuZyB8fCBbXSxcbiAgICAgIGNvZGUsXG4gICAgKTtcblxuICAgIGNvbnN0IGNvZGVzID0gW107XG4gICAgY29uc3QgYWRkQ29kZSA9IChjKSA9PiB7XG4gICAgICBpZiAoIWMpIHJldHVybjtcbiAgICAgIGlmICh0aGlzLmlzU3VwcG9ydGVkQ29kZShjKSkge1xuICAgICAgICBjb2Rlcy5wdXNoKGMpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5sb2dnZXIud2FybihgcmVqZWN0aW5nIGxhbmd1YWdlIGNvZGUgbm90IGZvdW5kIGluIHN1cHBvcnRlZExuZ3M6ICR7Y31gKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgaWYgKHR5cGVvZiBjb2RlID09PSAnc3RyaW5nJyAmJiAoY29kZS5pbmRleE9mKCctJykgPiAtMSB8fCBjb2RlLmluZGV4T2YoJ18nKSA+IC0xKSkge1xuICAgICAgaWYgKHRoaXMub3B0aW9ucy5sb2FkICE9PSAnbGFuZ3VhZ2VPbmx5JykgYWRkQ29kZSh0aGlzLmZvcm1hdExhbmd1YWdlQ29kZShjb2RlKSk7XG4gICAgICBpZiAodGhpcy5vcHRpb25zLmxvYWQgIT09ICdsYW5ndWFnZU9ubHknICYmIHRoaXMub3B0aW9ucy5sb2FkICE9PSAnY3VycmVudE9ubHknKVxuICAgICAgICBhZGRDb2RlKHRoaXMuZ2V0U2NyaXB0UGFydEZyb21Db2RlKGNvZGUpKTtcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMubG9hZCAhPT0gJ2N1cnJlbnRPbmx5JykgYWRkQ29kZSh0aGlzLmdldExhbmd1YWdlUGFydEZyb21Db2RlKGNvZGUpKTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBjb2RlID09PSAnc3RyaW5nJykge1xuICAgICAgYWRkQ29kZSh0aGlzLmZvcm1hdExhbmd1YWdlQ29kZShjb2RlKSk7XG4gICAgfVxuXG4gICAgZmFsbGJhY2tDb2Rlcy5mb3JFYWNoKChmYykgPT4ge1xuICAgICAgaWYgKGNvZGVzLmluZGV4T2YoZmMpIDwgMCkgYWRkQ29kZSh0aGlzLmZvcm1hdExhbmd1YWdlQ29kZShmYykpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIGNvZGVzO1xuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IExhbmd1YWdlVXRpbDtcbiIsImltcG9ydCBiYXNlTG9nZ2VyIGZyb20gJy4vbG9nZ2VyLmpzJztcbmltcG9ydCB7IGdldENsZWFuZWRDb2RlIH0gZnJvbSAnLi91dGlscy5qcydcblxuLy8gZGVmaW5pdGlvbiBodHRwOi8vdHJhbnNsYXRlLnNvdXJjZWZvcmdlLm5ldC93aWtpL2wxMG4vcGx1cmFsZm9ybXNcbi8qIGVzbGludC1kaXNhYmxlICovXG5sZXQgc2V0cyA9IFtcbiAgeyBsbmdzOiBbJ2FjaCcsJ2FrJywnYW0nLCdhcm4nLCdicicsJ2ZpbCcsJ2d1bicsJ2xuJywnbWZlJywnbWcnLCdtaScsJ29jJywgJ3B0JywgJ3B0LUJSJyxcbiAgICAndGcnLCAndGwnLCAndGknLCd0cicsJ3V6Jywnd2EnXSwgbnI6IFsxLDJdLCBmYzogMSB9LFxuXG4gIHsgbG5nczogWydhZicsJ2FuJywnYXN0JywnYXonLCdiZycsJ2JuJywnY2EnLCdkYScsJ2RlJywnZGV2JywnZWwnLCdlbicsXG4gICAgJ2VvJywnZXMnLCdldCcsJ2V1JywnZmknLCdmbycsJ2Z1cicsJ2Z5JywnZ2wnLCdndScsJ2hhJywnaGknLFxuICAgICdodScsJ2h5JywnaWEnLCdpdCcsJ2trJywna24nLCdrdScsJ2xiJywnbWFpJywnbWwnLCdtbicsJ21yJywnbmFoJywnbmFwJywnbmInLFxuICAgICduZScsJ25sJywnbm4nLCdubycsJ25zbycsJ3BhJywncGFwJywncG1zJywncHMnLCdwdC1QVCcsJ3JtJywnc2NvJyxcbiAgICAnc2UnLCdzaScsJ3NvJywnc29uJywnc3EnLCdzdicsJ3N3JywndGEnLCd0ZScsJ3RrJywndXInLCd5byddLCBucjogWzEsMl0sIGZjOiAyIH0sXG5cbiAgeyBsbmdzOiBbJ2F5JywnYm8nLCdjZ2cnLCdmYScsJ2h0JywnaWQnLCdqYScsJ2pibycsJ2thJywna20nLCdrbycsJ2t5JywnbG8nLFxuICAgICdtcycsJ3NhaCcsJ3N1JywndGgnLCd0dCcsJ3VnJywndmknLCd3bycsJ3poJ10sIG5yOiBbMV0sIGZjOiAzIH0sXG5cbiAgeyBsbmdzOiBbJ2JlJywnYnMnLCAnY25yJywgJ2R6JywnaHInLCdydScsJ3NyJywndWsnXSwgbnI6IFsxLDIsNV0sIGZjOiA0IH0sXG5cbiAgeyBsbmdzOiBbJ2FyJ10sIG5yOiBbMCwxLDIsMywxMSwxMDBdLCBmYzogNSB9LFxuICB7IGxuZ3M6IFsnY3MnLCdzayddLCBucjogWzEsMiw1XSwgZmM6IDYgfSxcbiAgeyBsbmdzOiBbJ2NzYicsJ3BsJ10sIG5yOiBbMSwyLDVdLCBmYzogNyB9LFxuICB7IGxuZ3M6IFsnY3knXSwgbnI6IFsxLDIsMyw4XSwgZmM6IDggfSxcbiAgeyBsbmdzOiBbJ2ZyJ10sIG5yOiBbMSwyXSwgZmM6IDkgfSxcbiAgeyBsbmdzOiBbJ2dhJ10sIG5yOiBbMSwyLDMsNywxMV0sIGZjOiAxMCB9LFxuICB7IGxuZ3M6IFsnZ2QnXSwgbnI6IFsxLDIsMywyMF0sIGZjOiAxMSB9LFxuICB7IGxuZ3M6IFsnaXMnXSwgbnI6IFsxLDJdLCBmYzogMTIgfSxcbiAgeyBsbmdzOiBbJ2p2J10sIG5yOiBbMCwxXSwgZmM6IDEzIH0sXG4gIHsgbG5nczogWydrdyddLCBucjogWzEsMiwzLDRdLCBmYzogMTQgfSxcbiAgeyBsbmdzOiBbJ2x0J10sIG5yOiBbMSwyLDEwXSwgZmM6IDE1IH0sXG4gIHsgbG5nczogWydsdiddLCBucjogWzEsMiwwXSwgZmM6IDE2IH0sXG4gIHsgbG5nczogWydtayddLCBucjogWzEsMl0sIGZjOiAxNyB9LFxuICB7IGxuZ3M6IFsnbW5rJ10sIG5yOiBbMCwxLDJdLCBmYzogMTggfSxcbiAgeyBsbmdzOiBbJ210J10sIG5yOiBbMSwyLDExLDIwXSwgZmM6IDE5IH0sXG4gIHsgbG5nczogWydvciddLCBucjogWzIsMV0sIGZjOiAyIH0sXG4gIHsgbG5nczogWydybyddLCBucjogWzEsMiwyMF0sIGZjOiAyMCB9LFxuICB7IGxuZ3M6IFsnc2wnXSwgbnI6IFs1LDEsMiwzXSwgZmM6IDIxIH0sXG4gIHsgbG5nczogWydoZScsJ2l3J10sIG5yOiBbMSwyLDIwLDIxXSwgZmM6IDIyIH1cbl1cblxubGV0IF9ydWxlc1BsdXJhbHNUeXBlcyA9IHtcbiAgMTogKG4pID0+IE51bWJlcihuID4gMSksXG4gIDI6IChuKSA9PiBOdW1iZXIobiAhPSAxKSxcbiAgMzogKG4pID0+IDAsXG4gIDQ6IChuKSA9PiBOdW1iZXIobiUxMD09MSAmJiBuJTEwMCE9MTEgPyAwIDogbiUxMD49MiAmJiBuJTEwPD00ICYmIChuJTEwMDwxMCB8fCBuJTEwMD49MjApID8gMSA6IDIpLFxuICA1OiAobikgPT4gTnVtYmVyKG49PTAgPyAwIDogbj09MSA/IDEgOiBuPT0yID8gMiA6IG4lMTAwPj0zICYmIG4lMTAwPD0xMCA/IDMgOiBuJTEwMD49MTEgPyA0IDogNSksXG4gIDY6IChuKSA9PiBOdW1iZXIoKG49PTEpID8gMCA6IChuPj0yICYmIG48PTQpID8gMSA6IDIpLFxuICA3OiAobikgPT4gTnVtYmVyKG49PTEgPyAwIDogbiUxMD49MiAmJiBuJTEwPD00ICYmIChuJTEwMDwxMCB8fCBuJTEwMD49MjApID8gMSA6IDIpLFxuICA4OiAobikgPT4gTnVtYmVyKChuPT0xKSA/IDAgOiAobj09MikgPyAxIDogKG4gIT0gOCAmJiBuICE9IDExKSA/IDIgOiAzKSxcbiAgOTogKG4pID0+IE51bWJlcihuID49IDIpLFxuICAxMDogKG4pID0+IE51bWJlcihuPT0xID8gMCA6IG49PTIgPyAxIDogbjw3ID8gMiA6IG48MTEgPyAzIDogNCksXG4gIDExOiAobikgPT4gTnVtYmVyKChuPT0xIHx8IG49PTExKSA/IDAgOiAobj09MiB8fCBuPT0xMikgPyAxIDogKG4gPiAyICYmIG4gPCAyMCkgPyAyIDogMyksXG4gIDEyOiAobikgPT4gTnVtYmVyKG4lMTAhPTEgfHwgbiUxMDA9PTExKSxcbiAgMTM6IChuKSA9PiBOdW1iZXIobiAhPT0gMCksXG4gIDE0OiAobikgPT4gTnVtYmVyKChuPT0xKSA/IDAgOiAobj09MikgPyAxIDogKG4gPT0gMykgPyAyIDogMyksXG4gIDE1OiAobikgPT4gTnVtYmVyKG4lMTA9PTEgJiYgbiUxMDAhPTExID8gMCA6IG4lMTA+PTIgJiYgKG4lMTAwPDEwIHx8IG4lMTAwPj0yMCkgPyAxIDogMiksXG4gIDE2OiAobikgPT4gTnVtYmVyKG4lMTA9PTEgJiYgbiUxMDAhPTExID8gMCA6IG4gIT09IDAgPyAxIDogMiksXG4gIDE3OiAobikgPT4gTnVtYmVyKG49PTEgfHwgbiUxMD09MSAmJiBuJTEwMCE9MTEgPyAwIDogMSksXG4gIDE4OiAobikgPT4gTnVtYmVyKG49PTAgPyAwIDogbj09MSA/IDEgOiAyKSxcbiAgMTk6IChuKSA9PiBOdW1iZXIobj09MSA/IDAgOiBuPT0wIHx8ICggbiUxMDA+MSAmJiBuJTEwMDwxMSkgPyAxIDogKG4lMTAwPjEwICYmIG4lMTAwPDIwICkgPyAyIDogMyksXG4gIDIwOiAobikgPT4gTnVtYmVyKG49PTEgPyAwIDogKG49PTAgfHwgKG4lMTAwID4gMCAmJiBuJTEwMCA8IDIwKSkgPyAxIDogMiksXG4gIDIxOiAobikgPT4gTnVtYmVyKG4lMTAwPT0xID8gMSA6IG4lMTAwPT0yID8gMiA6IG4lMTAwPT0zIHx8IG4lMTAwPT00ID8gMyA6IDApLFxuICAyMjogKG4pID0+IE51bWJlcihuPT0xID8gMCA6IG49PTIgPyAxIDogKG48MCB8fCBuPjEwKSAmJiBuJTEwPT0wID8gMiA6IDMpXG59O1xuLyogZXNsaW50LWVuYWJsZSAqL1xuXG5jb25zdCBub25JbnRsVmVyc2lvbnMgPSBbJ3YxJywgJ3YyJywgJ3YzJ107XG5jb25zdCBpbnRsVmVyc2lvbnMgPSBbJ3Y0J107XG5jb25zdCBzdWZmaXhlc09yZGVyID0ge1xuICB6ZXJvOiAwLFxuICBvbmU6IDEsXG4gIHR3bzogMixcbiAgZmV3OiAzLFxuICBtYW55OiA0LFxuICBvdGhlcjogNSxcbn07XG5cbmNvbnN0IGNyZWF0ZVJ1bGVzID0gKCkgPT4ge1xuICBjb25zdCBydWxlcyA9IHt9O1xuICBzZXRzLmZvckVhY2goKHNldCkgPT4ge1xuICAgIHNldC5sbmdzLmZvckVhY2goKGwpID0+IHtcbiAgICAgIHJ1bGVzW2xdID0ge1xuICAgICAgICBudW1iZXJzOiBzZXQubnIsXG4gICAgICAgIHBsdXJhbHM6IF9ydWxlc1BsdXJhbHNUeXBlc1tzZXQuZmNdXG4gICAgICB9O1xuICAgIH0pO1xuICB9KTtcbiAgcmV0dXJuIHJ1bGVzO1xufVxuXG5jbGFzcyBQbHVyYWxSZXNvbHZlciB7XG4gIGNvbnN0cnVjdG9yKGxhbmd1YWdlVXRpbHMsIG9wdGlvbnMgPSB7fSkge1xuICAgIHRoaXMubGFuZ3VhZ2VVdGlscyA9IGxhbmd1YWdlVXRpbHM7XG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcblxuICAgIHRoaXMubG9nZ2VyID0gYmFzZUxvZ2dlci5jcmVhdGUoJ3BsdXJhbFJlc29sdmVyJyk7XG5cbiAgICBpZiAoKCF0aGlzLm9wdGlvbnMuY29tcGF0aWJpbGl0eUpTT04gfHwgaW50bFZlcnNpb25zLmluY2x1ZGVzKHRoaXMub3B0aW9ucy5jb21wYXRpYmlsaXR5SlNPTikpICYmICh0eXBlb2YgSW50bCA9PT0gJ3VuZGVmaW5lZCcgfHwgIUludGwuUGx1cmFsUnVsZXMpKSB7XG4gICAgICB0aGlzLm9wdGlvbnMuY29tcGF0aWJpbGl0eUpTT04gPSAndjMnO1xuICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoJ1lvdXIgZW52aXJvbm1lbnQgc2VlbXMgbm90IHRvIGJlIEludGwgQVBJIGNvbXBhdGlibGUsIHVzZSBhbiBJbnRsLlBsdXJhbFJ1bGVzIHBvbHlmaWxsLiBXaWxsIGZhbGxiYWNrIHRvIHRoZSBjb21wYXRpYmlsaXR5SlNPTiB2MyBmb3JtYXQgaGFuZGxpbmcuJyk7XG4gICAgfVxuXG4gICAgdGhpcy5ydWxlcyA9IGNyZWF0ZVJ1bGVzKCk7XG5cbiAgICAvLyBDYWNoZSBjYWxscyB0byBJbnRsLlBsdXJhbFJ1bGVzLCBzaW5jZSByZXBlYXRlZCBjYWxscyBjYW4gYmUgc2xvdyBpbiBydW50aW1lcyBsaWtlIFJlYWN0IE5hdGl2ZVxuICAgIC8vIGFuZCB0aGUgbWVtb3J5IHVzYWdlIGRpZmZlcmVuY2UgaXMgbmVnbGlnaWJsZVxuICAgIHRoaXMucGx1cmFsUnVsZXNDYWNoZSA9IHt9O1xuICB9XG5cbiAgYWRkUnVsZShsbmcsIG9iaikge1xuICAgIHRoaXMucnVsZXNbbG5nXSA9IG9iajtcbiAgfVxuXG4gIGNsZWFyQ2FjaGUoKSB7XG4gICAgdGhpcy5wbHVyYWxSdWxlc0NhY2hlID0ge307XG4gIH1cblxuICBnZXRSdWxlKGNvZGUsIG9wdGlvbnMgPSB7fSkge1xuICAgIGlmICh0aGlzLnNob3VsZFVzZUludGxBcGkoKSkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgY2xlYW5lZENvZGUgPSBnZXRDbGVhbmVkQ29kZShjb2RlID09PSAnZGV2JyA/ICdlbicgOiBjb2RlKTtcbiAgICAgICAgY29uc3QgdHlwZSA9IG9wdGlvbnMub3JkaW5hbCA/ICdvcmRpbmFsJyA6ICdjYXJkaW5hbCc7XG4gICAgICAgIGNvbnN0IGNhY2hlS2V5ID0gSlNPTi5zdHJpbmdpZnkoeyBjbGVhbmVkQ29kZSwgdHlwZSB9KTtcbiAgICAgICAgaWYgKGNhY2hlS2V5IGluIHRoaXMucGx1cmFsUnVsZXNDYWNoZSkge1xuICAgICAgICAgIHJldHVybiB0aGlzLnBsdXJhbFJ1bGVzQ2FjaGVbY2FjaGVLZXldO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHJ1bGUgPSBuZXcgSW50bC5QbHVyYWxSdWxlcyhjbGVhbmVkQ29kZSwgeyB0eXBlIH0pO1xuICAgICAgICB0aGlzLnBsdXJhbFJ1bGVzQ2FjaGVbY2FjaGVLZXldID0gcnVsZTtcbiAgICAgICAgcmV0dXJuIHJ1bGU7XG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0aGlzLnJ1bGVzW2NvZGVdIHx8IHRoaXMucnVsZXNbdGhpcy5sYW5ndWFnZVV0aWxzLmdldExhbmd1YWdlUGFydEZyb21Db2RlKGNvZGUpXTtcbiAgfVxuXG4gIG5lZWRzUGx1cmFsKGNvZGUsIG9wdGlvbnMgPSB7fSkge1xuICAgIGNvbnN0IHJ1bGUgPSB0aGlzLmdldFJ1bGUoY29kZSwgb3B0aW9ucyk7XG5cbiAgICBpZiAodGhpcy5zaG91bGRVc2VJbnRsQXBpKCkpIHtcbiAgICAgIHJldHVybiBydWxlICYmIHJ1bGUucmVzb2x2ZWRPcHRpb25zKCkucGx1cmFsQ2F0ZWdvcmllcy5sZW5ndGggPiAxO1xuICAgIH1cblxuICAgIHJldHVybiBydWxlICYmIHJ1bGUubnVtYmVycy5sZW5ndGggPiAxO1xuICB9XG5cbiAgZ2V0UGx1cmFsRm9ybXNPZktleShjb2RlLCBrZXksIG9wdGlvbnMgPSB7fSkge1xuICAgIHJldHVybiB0aGlzLmdldFN1ZmZpeGVzKGNvZGUsIG9wdGlvbnMpLm1hcCgoc3VmZml4KSA9PiBgJHtrZXl9JHtzdWZmaXh9YCk7XG4gIH1cblxuICBnZXRTdWZmaXhlcyhjb2RlLCBvcHRpb25zID0ge30pIHtcbiAgICBjb25zdCBydWxlID0gdGhpcy5nZXRSdWxlKGNvZGUsIG9wdGlvbnMpO1xuXG4gICAgaWYgKCFydWxlKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuc2hvdWxkVXNlSW50bEFwaSgpKSB7XG4gICAgICByZXR1cm4gcnVsZS5yZXNvbHZlZE9wdGlvbnMoKS5wbHVyYWxDYXRlZ29yaWVzXG4gICAgICAgIC5zb3J0KChwbHVyYWxDYXRlZ29yeTEsIHBsdXJhbENhdGVnb3J5MikgPT4gc3VmZml4ZXNPcmRlcltwbHVyYWxDYXRlZ29yeTFdIC0gc3VmZml4ZXNPcmRlcltwbHVyYWxDYXRlZ29yeTJdKVxuICAgICAgICAubWFwKHBsdXJhbENhdGVnb3J5ID0+IGAke3RoaXMub3B0aW9ucy5wcmVwZW5kfSR7b3B0aW9ucy5vcmRpbmFsID8gYG9yZGluYWwke3RoaXMub3B0aW9ucy5wcmVwZW5kfWAgOiAnJ30ke3BsdXJhbENhdGVnb3J5fWApO1xuICAgIH1cblxuICAgIHJldHVybiBydWxlLm51bWJlcnMubWFwKChudW1iZXIpID0+IHRoaXMuZ2V0U3VmZml4KGNvZGUsIG51bWJlciwgb3B0aW9ucykpO1xuICB9XG5cbiAgZ2V0U3VmZml4KGNvZGUsIGNvdW50LCBvcHRpb25zID0ge30pIHtcbiAgICBjb25zdCBydWxlID0gdGhpcy5nZXRSdWxlKGNvZGUsIG9wdGlvbnMpO1xuXG4gICAgaWYgKHJ1bGUpIHtcbiAgICAgIGlmICh0aGlzLnNob3VsZFVzZUludGxBcGkoKSkge1xuICAgICAgICByZXR1cm4gYCR7dGhpcy5vcHRpb25zLnByZXBlbmR9JHtvcHRpb25zLm9yZGluYWwgPyBgb3JkaW5hbCR7dGhpcy5vcHRpb25zLnByZXBlbmR9YCA6ICcnfSR7cnVsZS5zZWxlY3QoY291bnQpfWA7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0aGlzLmdldFN1ZmZpeFJldHJvQ29tcGF0aWJsZShydWxlLCBjb3VudCk7XG4gICAgfVxuXG4gICAgdGhpcy5sb2dnZXIud2Fybihgbm8gcGx1cmFsIHJ1bGUgZm91bmQgZm9yOiAke2NvZGV9YCk7XG4gICAgcmV0dXJuICcnO1xuICB9XG5cbiAgZ2V0U3VmZml4UmV0cm9Db21wYXRpYmxlKHJ1bGUsIGNvdW50KSB7XG4gICAgY29uc3QgaWR4ID0gcnVsZS5ub0FicyA/IHJ1bGUucGx1cmFscyhjb3VudCkgOiBydWxlLnBsdXJhbHMoTWF0aC5hYnMoY291bnQpKTtcbiAgICBsZXQgc3VmZml4ID0gcnVsZS5udW1iZXJzW2lkeF07XG5cbiAgICAvLyBzcGVjaWFsIHRyZWF0bWVudCBmb3IgbG5ncyBvbmx5IGhhdmluZyBzaW5ndWxhciBhbmQgcGx1cmFsXG4gICAgaWYgKHRoaXMub3B0aW9ucy5zaW1wbGlmeVBsdXJhbFN1ZmZpeCAmJiBydWxlLm51bWJlcnMubGVuZ3RoID09PSAyICYmIHJ1bGUubnVtYmVyc1swXSA9PT0gMSkge1xuICAgICAgaWYgKHN1ZmZpeCA9PT0gMikge1xuICAgICAgICBzdWZmaXggPSAncGx1cmFsJztcbiAgICAgIH0gZWxzZSBpZiAoc3VmZml4ID09PSAxKSB7XG4gICAgICAgIHN1ZmZpeCA9ICcnO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IHJldHVyblN1ZmZpeCA9ICgpID0+IChcbiAgICAgIHRoaXMub3B0aW9ucy5wcmVwZW5kICYmIHN1ZmZpeC50b1N0cmluZygpID8gdGhpcy5vcHRpb25zLnByZXBlbmQgKyBzdWZmaXgudG9TdHJpbmcoKSA6IHN1ZmZpeC50b1N0cmluZygpXG4gICAgKTtcblxuICAgIC8vIENPTVBBVElCSUxJVFkgSlNPTlxuICAgIC8vIHYxXG4gICAgaWYgKHRoaXMub3B0aW9ucy5jb21wYXRpYmlsaXR5SlNPTiA9PT0gJ3YxJykge1xuICAgICAgaWYgKHN1ZmZpeCA9PT0gMSkgcmV0dXJuICcnO1xuICAgICAgaWYgKHR5cGVvZiBzdWZmaXggPT09ICdudW1iZXInKSByZXR1cm4gYF9wbHVyYWxfJHtzdWZmaXgudG9TdHJpbmcoKX1gO1xuICAgICAgcmV0dXJuIHJldHVyblN1ZmZpeCgpO1xuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWVsc2UtcmV0dXJuXG4gICAgfSBlbHNlIGlmICgvKiB2MiAqLyB0aGlzLm9wdGlvbnMuY29tcGF0aWJpbGl0eUpTT04gPT09ICd2MicpIHtcbiAgICAgIHJldHVybiByZXR1cm5TdWZmaXgoKTtcbiAgICB9IGVsc2UgaWYgKC8qIHYzIC0gZ2V0dGV4dCBpbmRleCAqLyB0aGlzLm9wdGlvbnMuc2ltcGxpZnlQbHVyYWxTdWZmaXggJiYgcnVsZS5udW1iZXJzLmxlbmd0aCA9PT0gMiAmJiBydWxlLm51bWJlcnNbMF0gPT09IDEpIHtcbiAgICAgIHJldHVybiByZXR1cm5TdWZmaXgoKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMub3B0aW9ucy5wcmVwZW5kICYmIGlkeC50b1N0cmluZygpID8gdGhpcy5vcHRpb25zLnByZXBlbmQgKyBpZHgudG9TdHJpbmcoKSA6IGlkeC50b1N0cmluZygpO1xuICB9XG5cbiAgc2hvdWxkVXNlSW50bEFwaSgpIHtcbiAgICByZXR1cm4gIW5vbkludGxWZXJzaW9ucy5pbmNsdWRlcyh0aGlzLm9wdGlvbnMuY29tcGF0aWJpbGl0eUpTT04pO1xuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IFBsdXJhbFJlc29sdmVyO1xuIiwiaW1wb3J0IHtcbiAgZ2V0UGF0aFdpdGhEZWZhdWx0cyxcbiAgZGVlcEZpbmQsXG4gIGVzY2FwZSBhcyB1dGlsc0VzY2FwZSxcbiAgcmVnZXhFc2NhcGUsXG4gIG1ha2VTdHJpbmcsXG59IGZyb20gJy4vdXRpbHMuanMnO1xuaW1wb3J0IGJhc2VMb2dnZXIgZnJvbSAnLi9sb2dnZXIuanMnO1xuXG5jb25zdCBkZWVwRmluZFdpdGhEZWZhdWx0cyA9IChcbiAgZGF0YSxcbiAgZGVmYXVsdERhdGEsXG4gIGtleSxcbiAga2V5U2VwYXJhdG9yID0gJy4nLFxuICBpZ25vcmVKU09OU3RydWN0dXJlID0gdHJ1ZSxcbikgPT4ge1xuICBsZXQgcGF0aCA9IGdldFBhdGhXaXRoRGVmYXVsdHMoZGF0YSwgZGVmYXVsdERhdGEsIGtleSk7XG4gIGlmICghcGF0aCAmJiBpZ25vcmVKU09OU3RydWN0dXJlICYmIHR5cGVvZiBrZXkgPT09ICdzdHJpbmcnKSB7XG4gICAgcGF0aCA9IGRlZXBGaW5kKGRhdGEsIGtleSwga2V5U2VwYXJhdG9yKTtcbiAgICBpZiAocGF0aCA9PT0gdW5kZWZpbmVkKSBwYXRoID0gZGVlcEZpbmQoZGVmYXVsdERhdGEsIGtleSwga2V5U2VwYXJhdG9yKTtcbiAgfVxuICByZXR1cm4gcGF0aDtcbn07XG5cbmNvbnN0IHJlZ2V4U2FmZSA9ICh2YWwpID0+IHZhbC5yZXBsYWNlKC9cXCQvZywgJyQkJCQnKTtcblxuY2xhc3MgSW50ZXJwb2xhdG9yIHtcbiAgY29uc3RydWN0b3Iob3B0aW9ucyA9IHt9KSB7XG4gICAgdGhpcy5sb2dnZXIgPSBiYXNlTG9nZ2VyLmNyZWF0ZSgnaW50ZXJwb2xhdG9yJyk7XG5cbiAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuICAgIHRoaXMuZm9ybWF0ID0gKG9wdGlvbnMuaW50ZXJwb2xhdGlvbiAmJiBvcHRpb25zLmludGVycG9sYXRpb24uZm9ybWF0KSB8fCAoKHZhbHVlKSA9PiB2YWx1ZSk7XG4gICAgdGhpcy5pbml0KG9wdGlvbnMpO1xuICB9XG5cbiAgLyogZXNsaW50IG5vLXBhcmFtLXJlYXNzaWduOiAwICovXG4gIGluaXQob3B0aW9ucyA9IHt9KSB7XG4gICAgaWYgKCFvcHRpb25zLmludGVycG9sYXRpb24pIG9wdGlvbnMuaW50ZXJwb2xhdGlvbiA9IHsgZXNjYXBlVmFsdWU6IHRydWUgfTtcblxuICAgIGNvbnN0IHtcbiAgICAgIGVzY2FwZSxcbiAgICAgIGVzY2FwZVZhbHVlLFxuICAgICAgdXNlUmF3VmFsdWVUb0VzY2FwZSxcbiAgICAgIHByZWZpeCxcbiAgICAgIHByZWZpeEVzY2FwZWQsXG4gICAgICBzdWZmaXgsXG4gICAgICBzdWZmaXhFc2NhcGVkLFxuICAgICAgZm9ybWF0U2VwYXJhdG9yLFxuICAgICAgdW5lc2NhcGVTdWZmaXgsXG4gICAgICB1bmVzY2FwZVByZWZpeCxcbiAgICAgIG5lc3RpbmdQcmVmaXgsXG4gICAgICBuZXN0aW5nUHJlZml4RXNjYXBlZCxcbiAgICAgIG5lc3RpbmdTdWZmaXgsXG4gICAgICBuZXN0aW5nU3VmZml4RXNjYXBlZCxcbiAgICAgIG5lc3RpbmdPcHRpb25zU2VwYXJhdG9yLFxuICAgICAgbWF4UmVwbGFjZXMsXG4gICAgICBhbHdheXNGb3JtYXQsXG4gICAgfSA9IG9wdGlvbnMuaW50ZXJwb2xhdGlvbjtcblxuICAgIHRoaXMuZXNjYXBlID0gZXNjYXBlICE9PSB1bmRlZmluZWQgPyBlc2NhcGUgOiB1dGlsc0VzY2FwZTtcbiAgICB0aGlzLmVzY2FwZVZhbHVlID0gZXNjYXBlVmFsdWUgIT09IHVuZGVmaW5lZCA/IGVzY2FwZVZhbHVlIDogdHJ1ZTtcbiAgICB0aGlzLnVzZVJhd1ZhbHVlVG9Fc2NhcGUgPSB1c2VSYXdWYWx1ZVRvRXNjYXBlICE9PSB1bmRlZmluZWQgPyB1c2VSYXdWYWx1ZVRvRXNjYXBlIDogZmFsc2U7XG5cbiAgICB0aGlzLnByZWZpeCA9IHByZWZpeCA/IHJlZ2V4RXNjYXBlKHByZWZpeCkgOiBwcmVmaXhFc2NhcGVkIHx8ICd7eyc7XG4gICAgdGhpcy5zdWZmaXggPSBzdWZmaXggPyByZWdleEVzY2FwZShzdWZmaXgpIDogc3VmZml4RXNjYXBlZCB8fCAnfX0nO1xuXG4gICAgdGhpcy5mb3JtYXRTZXBhcmF0b3IgPSBmb3JtYXRTZXBhcmF0b3IgfHwgJywnO1xuXG4gICAgdGhpcy51bmVzY2FwZVByZWZpeCA9IHVuZXNjYXBlU3VmZml4ID8gJycgOiB1bmVzY2FwZVByZWZpeCB8fCAnLSc7XG4gICAgdGhpcy51bmVzY2FwZVN1ZmZpeCA9IHRoaXMudW5lc2NhcGVQcmVmaXggPyAnJyA6IHVuZXNjYXBlU3VmZml4IHx8ICcnO1xuXG4gICAgdGhpcy5uZXN0aW5nUHJlZml4ID0gbmVzdGluZ1ByZWZpeFxuICAgICAgPyByZWdleEVzY2FwZShuZXN0aW5nUHJlZml4KVxuICAgICAgOiBuZXN0aW5nUHJlZml4RXNjYXBlZCB8fCByZWdleEVzY2FwZSgnJHQoJyk7XG4gICAgdGhpcy5uZXN0aW5nU3VmZml4ID0gbmVzdGluZ1N1ZmZpeFxuICAgICAgPyByZWdleEVzY2FwZShuZXN0aW5nU3VmZml4KVxuICAgICAgOiBuZXN0aW5nU3VmZml4RXNjYXBlZCB8fCByZWdleEVzY2FwZSgnKScpO1xuXG4gICAgdGhpcy5uZXN0aW5nT3B0aW9uc1NlcGFyYXRvciA9IG5lc3RpbmdPcHRpb25zU2VwYXJhdG9yIHx8ICcsJztcblxuICAgIHRoaXMubWF4UmVwbGFjZXMgPSBtYXhSZXBsYWNlcyB8fCAxMDAwO1xuXG4gICAgdGhpcy5hbHdheXNGb3JtYXQgPSBhbHdheXNGb3JtYXQgIT09IHVuZGVmaW5lZCA/IGFsd2F5c0Zvcm1hdCA6IGZhbHNlO1xuXG4gICAgLy8gdGhlIHJlZ2V4cFxuICAgIHRoaXMucmVzZXRSZWdFeHAoKTtcbiAgfVxuXG4gIHJlc2V0KCkge1xuICAgIGlmICh0aGlzLm9wdGlvbnMpIHRoaXMuaW5pdCh0aGlzLm9wdGlvbnMpO1xuICB9XG5cbiAgcmVzZXRSZWdFeHAoKSB7XG4gICAgY29uc3QgZ2V0T3JSZXNldFJlZ0V4cCA9IChleGlzdGluZ1JlZ0V4cCwgcGF0dGVybikgPT4ge1xuICAgICAgaWYgKGV4aXN0aW5nUmVnRXhwICYmIGV4aXN0aW5nUmVnRXhwLnNvdXJjZSA9PT0gcGF0dGVybikge1xuICAgICAgICBleGlzdGluZ1JlZ0V4cC5sYXN0SW5kZXggPSAwO1xuICAgICAgICByZXR1cm4gZXhpc3RpbmdSZWdFeHA7XG4gICAgICB9XG4gICAgICByZXR1cm4gbmV3IFJlZ0V4cChwYXR0ZXJuLCAnZycpO1xuICAgIH07XG5cbiAgICB0aGlzLnJlZ2V4cCA9IGdldE9yUmVzZXRSZWdFeHAodGhpcy5yZWdleHAsIGAke3RoaXMucHJlZml4fSguKz8pJHt0aGlzLnN1ZmZpeH1gKTtcbiAgICB0aGlzLnJlZ2V4cFVuZXNjYXBlID0gZ2V0T3JSZXNldFJlZ0V4cChcbiAgICAgIHRoaXMucmVnZXhwVW5lc2NhcGUsXG4gICAgICBgJHt0aGlzLnByZWZpeH0ke3RoaXMudW5lc2NhcGVQcmVmaXh9KC4rPykke3RoaXMudW5lc2NhcGVTdWZmaXh9JHt0aGlzLnN1ZmZpeH1gLFxuICAgICk7XG4gICAgdGhpcy5uZXN0aW5nUmVnZXhwID0gZ2V0T3JSZXNldFJlZ0V4cChcbiAgICAgIHRoaXMubmVzdGluZ1JlZ2V4cCxcbiAgICAgIGAke3RoaXMubmVzdGluZ1ByZWZpeH0oLis/KSR7dGhpcy5uZXN0aW5nU3VmZml4fWAsXG4gICAgKTtcbiAgfVxuXG4gIGludGVycG9sYXRlKHN0ciwgZGF0YSwgbG5nLCBvcHRpb25zKSB7XG4gICAgbGV0IG1hdGNoO1xuICAgIGxldCB2YWx1ZTtcbiAgICBsZXQgcmVwbGFjZXM7XG5cbiAgICBjb25zdCBkZWZhdWx0RGF0YSA9XG4gICAgICAodGhpcy5vcHRpb25zICYmIHRoaXMub3B0aW9ucy5pbnRlcnBvbGF0aW9uICYmIHRoaXMub3B0aW9ucy5pbnRlcnBvbGF0aW9uLmRlZmF1bHRWYXJpYWJsZXMpIHx8XG4gICAgICB7fTtcblxuICAgIGNvbnN0IGhhbmRsZUZvcm1hdCA9IChrZXkpID0+IHtcbiAgICAgIGlmIChrZXkuaW5kZXhPZih0aGlzLmZvcm1hdFNlcGFyYXRvcikgPCAwKSB7XG4gICAgICAgIGNvbnN0IHBhdGggPSBkZWVwRmluZFdpdGhEZWZhdWx0cyhcbiAgICAgICAgICBkYXRhLFxuICAgICAgICAgIGRlZmF1bHREYXRhLFxuICAgICAgICAgIGtleSxcbiAgICAgICAgICB0aGlzLm9wdGlvbnMua2V5U2VwYXJhdG9yLFxuICAgICAgICAgIHRoaXMub3B0aW9ucy5pZ25vcmVKU09OU3RydWN0dXJlLFxuICAgICAgICApO1xuICAgICAgICByZXR1cm4gdGhpcy5hbHdheXNGb3JtYXRcbiAgICAgICAgICA/IHRoaXMuZm9ybWF0KHBhdGgsIHVuZGVmaW5lZCwgbG5nLCB7IC4uLm9wdGlvbnMsIC4uLmRhdGEsIGludGVycG9sYXRpb25rZXk6IGtleSB9KVxuICAgICAgICAgIDogcGF0aDtcbiAgICAgIH1cblxuICAgICAgY29uc3QgcCA9IGtleS5zcGxpdCh0aGlzLmZvcm1hdFNlcGFyYXRvcik7XG4gICAgICBjb25zdCBrID0gcC5zaGlmdCgpLnRyaW0oKTtcbiAgICAgIGNvbnN0IGYgPSBwLmpvaW4odGhpcy5mb3JtYXRTZXBhcmF0b3IpLnRyaW0oKTtcblxuICAgICAgcmV0dXJuIHRoaXMuZm9ybWF0KFxuICAgICAgICBkZWVwRmluZFdpdGhEZWZhdWx0cyhcbiAgICAgICAgICBkYXRhLFxuICAgICAgICAgIGRlZmF1bHREYXRhLFxuICAgICAgICAgIGssXG4gICAgICAgICAgdGhpcy5vcHRpb25zLmtleVNlcGFyYXRvcixcbiAgICAgICAgICB0aGlzLm9wdGlvbnMuaWdub3JlSlNPTlN0cnVjdHVyZSxcbiAgICAgICAgKSxcbiAgICAgICAgZixcbiAgICAgICAgbG5nLFxuICAgICAgICB7XG4gICAgICAgICAgLi4ub3B0aW9ucyxcbiAgICAgICAgICAuLi5kYXRhLFxuICAgICAgICAgIGludGVycG9sYXRpb25rZXk6IGssXG4gICAgICAgIH0sXG4gICAgICApO1xuICAgIH07XG5cbiAgICB0aGlzLnJlc2V0UmVnRXhwKCk7XG5cbiAgICBjb25zdCBtaXNzaW5nSW50ZXJwb2xhdGlvbkhhbmRsZXIgPVxuICAgICAgKG9wdGlvbnMgJiYgb3B0aW9ucy5taXNzaW5nSW50ZXJwb2xhdGlvbkhhbmRsZXIpIHx8IHRoaXMub3B0aW9ucy5taXNzaW5nSW50ZXJwb2xhdGlvbkhhbmRsZXI7XG5cbiAgICBjb25zdCBza2lwT25WYXJpYWJsZXMgPVxuICAgICAgb3B0aW9ucyAmJiBvcHRpb25zLmludGVycG9sYXRpb24gJiYgb3B0aW9ucy5pbnRlcnBvbGF0aW9uLnNraXBPblZhcmlhYmxlcyAhPT0gdW5kZWZpbmVkXG4gICAgICAgID8gb3B0aW9ucy5pbnRlcnBvbGF0aW9uLnNraXBPblZhcmlhYmxlc1xuICAgICAgICA6IHRoaXMub3B0aW9ucy5pbnRlcnBvbGF0aW9uLnNraXBPblZhcmlhYmxlcztcblxuICAgIGNvbnN0IHRvZG9zID0gW1xuICAgICAge1xuICAgICAgICAvLyB1bmVzY2FwZSBpZiBoYXMgdW5lc2NhcGVQcmVmaXgvU3VmZml4XG4gICAgICAgIHJlZ2V4OiB0aGlzLnJlZ2V4cFVuZXNjYXBlLFxuICAgICAgICBzYWZlVmFsdWU6ICh2YWwpID0+IHJlZ2V4U2FmZSh2YWwpLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgLy8gcmVndWxhciBlc2NhcGUgb24gZGVtYW5kXG4gICAgICAgIHJlZ2V4OiB0aGlzLnJlZ2V4cCxcbiAgICAgICAgc2FmZVZhbHVlOiAodmFsKSA9PiAodGhpcy5lc2NhcGVWYWx1ZSA/IHJlZ2V4U2FmZSh0aGlzLmVzY2FwZSh2YWwpKSA6IHJlZ2V4U2FmZSh2YWwpKSxcbiAgICAgIH0sXG4gICAgXTtcbiAgICB0b2Rvcy5mb3JFYWNoKCh0b2RvKSA9PiB7XG4gICAgICByZXBsYWNlcyA9IDA7XG4gICAgICAvKiBlc2xpbnQgbm8tY29uZC1hc3NpZ246IDAgKi9cbiAgICAgIHdoaWxlICgobWF0Y2ggPSB0b2RvLnJlZ2V4LmV4ZWMoc3RyKSkpIHtcbiAgICAgICAgY29uc3QgbWF0Y2hlZFZhciA9IG1hdGNoWzFdLnRyaW0oKTtcbiAgICAgICAgdmFsdWUgPSBoYW5kbGVGb3JtYXQobWF0Y2hlZFZhcik7XG4gICAgICAgIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgaWYgKHR5cGVvZiBtaXNzaW5nSW50ZXJwb2xhdGlvbkhhbmRsZXIgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNvbnN0IHRlbXAgPSBtaXNzaW5nSW50ZXJwb2xhdGlvbkhhbmRsZXIoc3RyLCBtYXRjaCwgb3B0aW9ucyk7XG4gICAgICAgICAgICB2YWx1ZSA9IHR5cGVvZiB0ZW1wID09PSAnc3RyaW5nJyA/IHRlbXAgOiAnJztcbiAgICAgICAgICB9IGVsc2UgaWYgKG9wdGlvbnMgJiYgT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9wdGlvbnMsIG1hdGNoZWRWYXIpKSB7XG4gICAgICAgICAgICB2YWx1ZSA9ICcnOyAvLyB1bmRlZmluZWQgYmVjb21lcyBlbXB0eSBzdHJpbmdcbiAgICAgICAgICB9IGVsc2UgaWYgKHNraXBPblZhcmlhYmxlcykge1xuICAgICAgICAgICAgdmFsdWUgPSBtYXRjaFswXTtcbiAgICAgICAgICAgIGNvbnRpbnVlOyAvLyB0aGlzIG1ha2VzIHN1cmUgaXQgY29udGludWVzIHRvIGRldGVjdCBvdGhlcnNcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5sb2dnZXIud2FybihgbWlzc2VkIHRvIHBhc3MgaW4gdmFyaWFibGUgJHttYXRjaGVkVmFyfSBmb3IgaW50ZXJwb2xhdGluZyAke3N0cn1gKTtcbiAgICAgICAgICAgIHZhbHVlID0gJyc7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gJ3N0cmluZycgJiYgIXRoaXMudXNlUmF3VmFsdWVUb0VzY2FwZSkge1xuICAgICAgICAgIHZhbHVlID0gbWFrZVN0cmluZyh2YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3Qgc2FmZVZhbHVlID0gdG9kby5zYWZlVmFsdWUodmFsdWUpO1xuICAgICAgICBzdHIgPSBzdHIucmVwbGFjZShtYXRjaFswXSwgc2FmZVZhbHVlKTtcbiAgICAgICAgaWYgKHNraXBPblZhcmlhYmxlcykge1xuICAgICAgICAgIHRvZG8ucmVnZXgubGFzdEluZGV4ICs9IHZhbHVlLmxlbmd0aDtcbiAgICAgICAgICB0b2RvLnJlZ2V4Lmxhc3RJbmRleCAtPSBtYXRjaFswXS5sZW5ndGg7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdG9kby5yZWdleC5sYXN0SW5kZXggPSAwO1xuICAgICAgICB9XG4gICAgICAgIHJlcGxhY2VzKys7XG4gICAgICAgIGlmIChyZXBsYWNlcyA+PSB0aGlzLm1heFJlcGxhY2VzKSB7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gc3RyO1xuICB9XG5cbiAgbmVzdChzdHIsIGZjLCBvcHRpb25zID0ge30pIHtcbiAgICBsZXQgbWF0Y2g7XG4gICAgbGV0IHZhbHVlO1xuXG4gICAgbGV0IGNsb25lZE9wdGlvbnM7XG5cbiAgICAvLyBpZiB2YWx1ZSBpcyBzb21ldGhpbmcgbGlrZSBcIm15S2V5XCI6IFwibG9yZW0gJChhbm90aGVyS2V5LCB7IFwiY291bnRcIjoge3thVmFsdWVJbk9wdGlvbnN9fSB9KVwiXG4gICAgY29uc3QgaGFuZGxlSGFzT3B0aW9ucyA9IChrZXksIGluaGVyaXRlZE9wdGlvbnMpID0+IHtcbiAgICAgIGNvbnN0IHNlcCA9IHRoaXMubmVzdGluZ09wdGlvbnNTZXBhcmF0b3I7XG4gICAgICBpZiAoa2V5LmluZGV4T2Yoc2VwKSA8IDApIHJldHVybiBrZXk7XG5cbiAgICAgIGNvbnN0IGMgPSBrZXkuc3BsaXQobmV3IFJlZ0V4cChgJHtzZXB9WyBdKntgKSk7XG5cbiAgICAgIGxldCBvcHRpb25zU3RyaW5nID0gYHske2NbMV19YDtcbiAgICAgIGtleSA9IGNbMF07XG4gICAgICBvcHRpb25zU3RyaW5nID0gdGhpcy5pbnRlcnBvbGF0ZShvcHRpb25zU3RyaW5nLCBjbG9uZWRPcHRpb25zKTtcbiAgICAgIGNvbnN0IG1hdGNoZWRTaW5nbGVRdW90ZXMgPSBvcHRpb25zU3RyaW5nLm1hdGNoKC8nL2cpO1xuICAgICAgY29uc3QgbWF0Y2hlZERvdWJsZVF1b3RlcyA9IG9wdGlvbnNTdHJpbmcubWF0Y2goL1wiL2cpO1xuICAgICAgaWYgKFxuICAgICAgICAobWF0Y2hlZFNpbmdsZVF1b3RlcyAmJiBtYXRjaGVkU2luZ2xlUXVvdGVzLmxlbmd0aCAlIDIgPT09IDAgJiYgIW1hdGNoZWREb3VibGVRdW90ZXMpIHx8XG4gICAgICAgIG1hdGNoZWREb3VibGVRdW90ZXMubGVuZ3RoICUgMiAhPT0gMFxuICAgICAgKSB7XG4gICAgICAgIG9wdGlvbnNTdHJpbmcgPSBvcHRpb25zU3RyaW5nLnJlcGxhY2UoLycvZywgJ1wiJyk7XG4gICAgICB9XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIGNsb25lZE9wdGlvbnMgPSBKU09OLnBhcnNlKG9wdGlvbnNTdHJpbmcpO1xuXG4gICAgICAgIGlmIChpbmhlcml0ZWRPcHRpb25zKSBjbG9uZWRPcHRpb25zID0geyAuLi5pbmhlcml0ZWRPcHRpb25zLCAuLi5jbG9uZWRPcHRpb25zIH07XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHRoaXMubG9nZ2VyLndhcm4oYGZhaWxlZCBwYXJzaW5nIG9wdGlvbnMgc3RyaW5nIGluIG5lc3RpbmcgZm9yIGtleSAke2tleX1gLCBlKTtcbiAgICAgICAgcmV0dXJuIGAke2tleX0ke3NlcH0ke29wdGlvbnNTdHJpbmd9YDtcbiAgICAgIH1cblxuICAgICAgLy8gYXNzZXJ0IHdlIGRvIG5vdCBnZXQgYSBlbmRsZXNzIGxvb3Agb24gaW50ZXJwb2xhdGluZyBkZWZhdWx0VmFsdWUgYWdhaW4gYW5kIGFnYWluXG4gICAgICBpZiAoY2xvbmVkT3B0aW9ucy5kZWZhdWx0VmFsdWUgJiYgY2xvbmVkT3B0aW9ucy5kZWZhdWx0VmFsdWUuaW5kZXhPZih0aGlzLnByZWZpeCkgPiAtMSlcbiAgICAgICAgZGVsZXRlIGNsb25lZE9wdGlvbnMuZGVmYXVsdFZhbHVlO1xuICAgICAgcmV0dXJuIGtleTtcbiAgICB9O1xuXG4gICAgLy8gcmVndWxhciBlc2NhcGUgb24gZGVtYW5kXG4gICAgd2hpbGUgKChtYXRjaCA9IHRoaXMubmVzdGluZ1JlZ2V4cC5leGVjKHN0cikpKSB7XG4gICAgICBsZXQgZm9ybWF0dGVycyA9IFtdO1xuXG4gICAgICBjbG9uZWRPcHRpb25zID0geyAuLi5vcHRpb25zIH07XG4gICAgICBjbG9uZWRPcHRpb25zID1cbiAgICAgICAgY2xvbmVkT3B0aW9ucy5yZXBsYWNlICYmIHR5cGVvZiBjbG9uZWRPcHRpb25zLnJlcGxhY2UgIT09ICdzdHJpbmcnXG4gICAgICAgICAgPyBjbG9uZWRPcHRpb25zLnJlcGxhY2VcbiAgICAgICAgICA6IGNsb25lZE9wdGlvbnM7XG4gICAgICBjbG9uZWRPcHRpb25zLmFwcGx5UG9zdFByb2Nlc3NvciA9IGZhbHNlOyAvLyBhdm9pZCBwb3N0IHByb2Nlc3Npbmcgb24gbmVzdGVkIGxvb2t1cFxuICAgICAgZGVsZXRlIGNsb25lZE9wdGlvbnMuZGVmYXVsdFZhbHVlOyAvLyBhc3NlcnQgd2UgZG8gbm90IGdldCBhIGVuZGxlc3MgbG9vcCBvbiBpbnRlcnBvbGF0aW5nIGRlZmF1bHRWYWx1ZSBhZ2FpbiBhbmQgYWdhaW5cblxuICAgICAgLyoqXG4gICAgICAgKiBJZiB0aGVyZSBpcyBtb3JlIHRoYW4gb25lIHBhcmFtZXRlciAoY29udGFpbnMgdGhlIGZvcm1hdCBzZXBhcmF0b3IpLiBFLmcuOlxuICAgICAgICogICAtIHQoYSwgYilcbiAgICAgICAqICAgLSB0KGEsIGIsIGMpXG4gICAgICAgKlxuICAgICAgICogQW5kIHRob3NlIHBhcmFtZXRlcnMgYXJlIG5vdCBkeW5hbWljIHZhbHVlcyAocGFyYW1ldGVycyBkbyBub3QgaW5jbHVkZSBjdXJseSBicmFjZXMpLiBFLmcuOlxuICAgICAgICogICAtIE5vdCB0KGEsIHsgXCJrZXlcIjogXCJ7e3ZhcmlhYmxlfX1cIiB9KVxuICAgICAgICogICAtIE5vdCB0KGEsIGIsIHtcImtleUFcIjogXCJ2YWx1ZUFcIiwgXCJrZXlCXCI6IFwidmFsdWVCXCJ9KVxuICAgICAgICovXG4gICAgICBsZXQgZG9SZWR1Y2UgPSBmYWxzZTtcbiAgICAgIGlmIChtYXRjaFswXS5pbmRleE9mKHRoaXMuZm9ybWF0U2VwYXJhdG9yKSAhPT0gLTEgJiYgIS97Lip9Ly50ZXN0KG1hdGNoWzFdKSkge1xuICAgICAgICBjb25zdCByID0gbWF0Y2hbMV0uc3BsaXQodGhpcy5mb3JtYXRTZXBhcmF0b3IpLm1hcCgoZWxlbSkgPT4gZWxlbS50cmltKCkpO1xuICAgICAgICBtYXRjaFsxXSA9IHIuc2hpZnQoKTtcbiAgICAgICAgZm9ybWF0dGVycyA9IHI7XG4gICAgICAgIGRvUmVkdWNlID0gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgdmFsdWUgPSBmYyhoYW5kbGVIYXNPcHRpb25zLmNhbGwodGhpcywgbWF0Y2hbMV0udHJpbSgpLCBjbG9uZWRPcHRpb25zKSwgY2xvbmVkT3B0aW9ucyk7XG5cbiAgICAgIC8vIGlzIG9ubHkgdGhlIG5lc3Rpbmcga2V5IChrZXkxID0gJyQoa2V5MiknKSByZXR1cm4gdGhlIHZhbHVlIHdpdGhvdXQgc3RyaW5naWZ5XG4gICAgICBpZiAodmFsdWUgJiYgbWF0Y2hbMF0gPT09IHN0ciAmJiB0eXBlb2YgdmFsdWUgIT09ICdzdHJpbmcnKSByZXR1cm4gdmFsdWU7XG5cbiAgICAgIC8vIG5vIHN0cmluZyB0byBpbmNsdWRlIG9yIGVtcHR5XG4gICAgICBpZiAodHlwZW9mIHZhbHVlICE9PSAnc3RyaW5nJykgdmFsdWUgPSBtYWtlU3RyaW5nKHZhbHVlKTtcbiAgICAgIGlmICghdmFsdWUpIHtcbiAgICAgICAgdGhpcy5sb2dnZXIud2FybihgbWlzc2VkIHRvIHJlc29sdmUgJHttYXRjaFsxXX0gZm9yIG5lc3RpbmcgJHtzdHJ9YCk7XG4gICAgICAgIHZhbHVlID0gJyc7XG4gICAgICB9XG5cbiAgICAgIGlmIChkb1JlZHVjZSkge1xuICAgICAgICB2YWx1ZSA9IGZvcm1hdHRlcnMucmVkdWNlKFxuICAgICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1sb29wLWZ1bmNcbiAgICAgICAgICAodiwgZikgPT5cbiAgICAgICAgICAgIHRoaXMuZm9ybWF0KHYsIGYsIG9wdGlvbnMubG5nLCB7IC4uLm9wdGlvbnMsIGludGVycG9sYXRpb25rZXk6IG1hdGNoWzFdLnRyaW0oKSB9KSxcbiAgICAgICAgICB2YWx1ZS50cmltKCksXG4gICAgICAgICk7XG4gICAgICB9XG5cbiAgICAgIC8vIE5lc3RlZCBrZXlzIHNob3VsZCBub3QgYmUgZXNjYXBlZCBieSBkZWZhdWx0ICM4NTRcbiAgICAgIC8vIHZhbHVlID0gdGhpcy5lc2NhcGVWYWx1ZSA/IHJlZ2V4U2FmZSh1dGlscy5lc2NhcGUodmFsdWUpKSA6IHJlZ2V4U2FmZSh2YWx1ZSk7XG4gICAgICBzdHIgPSBzdHIucmVwbGFjZShtYXRjaFswXSwgdmFsdWUpO1xuICAgICAgdGhpcy5yZWdleHAubGFzdEluZGV4ID0gMDtcbiAgICB9XG4gICAgcmV0dXJuIHN0cjtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBJbnRlcnBvbGF0b3I7XG4iLCJpbXBvcnQgYmFzZUxvZ2dlciBmcm9tICcuL2xvZ2dlci5qcyc7XG5pbXBvcnQgeyBnZXRDbGVhbmVkQ29kZSB9IGZyb20gJy4vdXRpbHMuanMnO1xuXG5jb25zdCBwYXJzZUZvcm1hdFN0ciA9IChmb3JtYXRTdHIpID0+IHtcbiAgbGV0IGZvcm1hdE5hbWUgPSBmb3JtYXRTdHIudG9Mb3dlckNhc2UoKS50cmltKCk7XG4gIGNvbnN0IGZvcm1hdE9wdGlvbnMgPSB7fTtcbiAgaWYgKGZvcm1hdFN0ci5pbmRleE9mKCcoJykgPiAtMSkge1xuICAgIGNvbnN0IHAgPSBmb3JtYXRTdHIuc3BsaXQoJygnKTtcbiAgICBmb3JtYXROYW1lID0gcFswXS50b0xvd2VyQ2FzZSgpLnRyaW0oKTtcblxuICAgIGNvbnN0IG9wdFN0ciA9IHBbMV0uc3Vic3RyaW5nKDAsIHBbMV0ubGVuZ3RoIC0gMSk7XG5cbiAgICAvLyBleHRyYSBmb3IgY3VycmVuY3lcbiAgICBpZiAoZm9ybWF0TmFtZSA9PT0gJ2N1cnJlbmN5JyAmJiBvcHRTdHIuaW5kZXhPZignOicpIDwgMCkge1xuICAgICAgaWYgKCFmb3JtYXRPcHRpb25zLmN1cnJlbmN5KSBmb3JtYXRPcHRpb25zLmN1cnJlbmN5ID0gb3B0U3RyLnRyaW0oKTtcbiAgICB9IGVsc2UgaWYgKGZvcm1hdE5hbWUgPT09ICdyZWxhdGl2ZXRpbWUnICYmIG9wdFN0ci5pbmRleE9mKCc6JykgPCAwKSB7XG4gICAgICBpZiAoIWZvcm1hdE9wdGlvbnMucmFuZ2UpIGZvcm1hdE9wdGlvbnMucmFuZ2UgPSBvcHRTdHIudHJpbSgpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBvcHRzID0gb3B0U3RyLnNwbGl0KCc7Jyk7XG5cbiAgICAgIG9wdHMuZm9yRWFjaCgob3B0KSA9PiB7XG4gICAgICAgIGlmIChvcHQpIHtcbiAgICAgICAgICBjb25zdCBba2V5LCAuLi5yZXN0XSA9IG9wdC5zcGxpdCgnOicpO1xuICAgICAgICAgIGNvbnN0IHZhbCA9IHJlc3RcbiAgICAgICAgICAgIC5qb2luKCc6JylcbiAgICAgICAgICAgIC50cmltKClcbiAgICAgICAgICAgIC5yZXBsYWNlKC9eJyt8JyskL2csICcnKTsgLy8gdHJpbSBhbmQgcmVwbGFjZSAnJ1xuXG4gICAgICAgICAgY29uc3QgdHJpbW1lZEtleSA9IGtleS50cmltKCk7XG5cbiAgICAgICAgICBpZiAoIWZvcm1hdE9wdGlvbnNbdHJpbW1lZEtleV0pIGZvcm1hdE9wdGlvbnNbdHJpbW1lZEtleV0gPSB2YWw7XG4gICAgICAgICAgaWYgKHZhbCA9PT0gJ2ZhbHNlJykgZm9ybWF0T3B0aW9uc1t0cmltbWVkS2V5XSA9IGZhbHNlO1xuICAgICAgICAgIGlmICh2YWwgPT09ICd0cnVlJykgZm9ybWF0T3B0aW9uc1t0cmltbWVkS2V5XSA9IHRydWU7XG4gICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLXJlc3RyaWN0ZWQtZ2xvYmFsc1xuICAgICAgICAgIGlmICghaXNOYU4odmFsKSkgZm9ybWF0T3B0aW9uc1t0cmltbWVkS2V5XSA9IHBhcnNlSW50KHZhbCwgMTApO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGZvcm1hdE5hbWUsXG4gICAgZm9ybWF0T3B0aW9ucyxcbiAgfTtcbn07XG5cbmNvbnN0IGNyZWF0ZUNhY2hlZEZvcm1hdHRlciA9IChmbikgPT4ge1xuICBjb25zdCBjYWNoZSA9IHt9O1xuICByZXR1cm4gKHZhbCwgbG5nLCBvcHRpb25zKSA9PiB7XG4gICAgbGV0IG9wdEZvckNhY2hlID0gb3B0aW9ucztcbiAgICAvLyB0aGlzIGNhY2hlIG9wdGltaXphdGlvbiB3aWxsIG9ubHkgd29yayBmb3Iga2V5cyBoYXZpbmcgMSBpbnRlcnBvbGF0ZWQgdmFsdWVcbiAgICBpZiAoXG4gICAgICBvcHRpb25zICYmXG4gICAgICBvcHRpb25zLmludGVycG9sYXRpb25rZXkgJiZcbiAgICAgIG9wdGlvbnMuZm9ybWF0UGFyYW1zICYmXG4gICAgICBvcHRpb25zLmZvcm1hdFBhcmFtc1tvcHRpb25zLmludGVycG9sYXRpb25rZXldICYmXG4gICAgICBvcHRpb25zW29wdGlvbnMuaW50ZXJwb2xhdGlvbmtleV1cbiAgICApIHtcbiAgICAgIG9wdEZvckNhY2hlID0ge1xuICAgICAgICAuLi5vcHRGb3JDYWNoZSxcbiAgICAgICAgW29wdGlvbnMuaW50ZXJwb2xhdGlvbmtleV06IHVuZGVmaW5lZCxcbiAgICAgIH07XG4gICAgfVxuICAgIGNvbnN0IGtleSA9IGxuZyArIEpTT04uc3RyaW5naWZ5KG9wdEZvckNhY2hlKTtcbiAgICBsZXQgZm9ybWF0dGVyID0gY2FjaGVba2V5XTtcbiAgICBpZiAoIWZvcm1hdHRlcikge1xuICAgICAgZm9ybWF0dGVyID0gZm4oZ2V0Q2xlYW5lZENvZGUobG5nKSwgb3B0aW9ucyk7XG4gICAgICBjYWNoZVtrZXldID0gZm9ybWF0dGVyO1xuICAgIH1cbiAgICByZXR1cm4gZm9ybWF0dGVyKHZhbCk7XG4gIH07XG59O1xuXG5jbGFzcyBGb3JtYXR0ZXIge1xuICBjb25zdHJ1Y3RvcihvcHRpb25zID0ge30pIHtcbiAgICB0aGlzLmxvZ2dlciA9IGJhc2VMb2dnZXIuY3JlYXRlKCdmb3JtYXR0ZXInKTtcblxuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG4gICAgdGhpcy5mb3JtYXRzID0ge1xuICAgICAgbnVtYmVyOiBjcmVhdGVDYWNoZWRGb3JtYXR0ZXIoKGxuZywgb3B0KSA9PiB7XG4gICAgICAgIGNvbnN0IGZvcm1hdHRlciA9IG5ldyBJbnRsLk51bWJlckZvcm1hdChsbmcsIHsgLi4ub3B0IH0pO1xuICAgICAgICByZXR1cm4gKHZhbCkgPT4gZm9ybWF0dGVyLmZvcm1hdCh2YWwpO1xuICAgICAgfSksXG4gICAgICBjdXJyZW5jeTogY3JlYXRlQ2FjaGVkRm9ybWF0dGVyKChsbmcsIG9wdCkgPT4ge1xuICAgICAgICBjb25zdCBmb3JtYXR0ZXIgPSBuZXcgSW50bC5OdW1iZXJGb3JtYXQobG5nLCB7IC4uLm9wdCwgc3R5bGU6ICdjdXJyZW5jeScgfSk7XG4gICAgICAgIHJldHVybiAodmFsKSA9PiBmb3JtYXR0ZXIuZm9ybWF0KHZhbCk7XG4gICAgICB9KSxcbiAgICAgIGRhdGV0aW1lOiBjcmVhdGVDYWNoZWRGb3JtYXR0ZXIoKGxuZywgb3B0KSA9PiB7XG4gICAgICAgIGNvbnN0IGZvcm1hdHRlciA9IG5ldyBJbnRsLkRhdGVUaW1lRm9ybWF0KGxuZywgeyAuLi5vcHQgfSk7XG4gICAgICAgIHJldHVybiAodmFsKSA9PiBmb3JtYXR0ZXIuZm9ybWF0KHZhbCk7XG4gICAgICB9KSxcbiAgICAgIHJlbGF0aXZldGltZTogY3JlYXRlQ2FjaGVkRm9ybWF0dGVyKChsbmcsIG9wdCkgPT4ge1xuICAgICAgICBjb25zdCBmb3JtYXR0ZXIgPSBuZXcgSW50bC5SZWxhdGl2ZVRpbWVGb3JtYXQobG5nLCB7IC4uLm9wdCB9KTtcbiAgICAgICAgcmV0dXJuICh2YWwpID0+IGZvcm1hdHRlci5mb3JtYXQodmFsLCBvcHQucmFuZ2UgfHwgJ2RheScpO1xuICAgICAgfSksXG4gICAgICBsaXN0OiBjcmVhdGVDYWNoZWRGb3JtYXR0ZXIoKGxuZywgb3B0KSA9PiB7XG4gICAgICAgIGNvbnN0IGZvcm1hdHRlciA9IG5ldyBJbnRsLkxpc3RGb3JtYXQobG5nLCB7IC4uLm9wdCB9KTtcbiAgICAgICAgcmV0dXJuICh2YWwpID0+IGZvcm1hdHRlci5mb3JtYXQodmFsKTtcbiAgICAgIH0pLFxuICAgIH07XG4gICAgdGhpcy5pbml0KG9wdGlvbnMpO1xuICB9XG5cbiAgLyogZXNsaW50IG5vLXBhcmFtLXJlYXNzaWduOiAwICovXG4gIGluaXQoc2VydmljZXMsIG9wdGlvbnMgPSB7IGludGVycG9sYXRpb246IHt9IH0pIHtcbiAgICBjb25zdCBpT3B0cyA9IG9wdGlvbnMuaW50ZXJwb2xhdGlvbjtcblxuICAgIHRoaXMuZm9ybWF0U2VwYXJhdG9yID0gaU9wdHMuZm9ybWF0U2VwYXJhdG9yXG4gICAgICA/IGlPcHRzLmZvcm1hdFNlcGFyYXRvclxuICAgICAgOiBpT3B0cy5mb3JtYXRTZXBhcmF0b3IgfHwgJywnO1xuICB9XG5cbiAgYWRkKG5hbWUsIGZjKSB7XG4gICAgdGhpcy5mb3JtYXRzW25hbWUudG9Mb3dlckNhc2UoKS50cmltKCldID0gZmM7XG4gIH1cblxuICBhZGRDYWNoZWQobmFtZSwgZmMpIHtcbiAgICB0aGlzLmZvcm1hdHNbbmFtZS50b0xvd2VyQ2FzZSgpLnRyaW0oKV0gPSBjcmVhdGVDYWNoZWRGb3JtYXR0ZXIoZmMpO1xuICB9XG5cbiAgZm9ybWF0KHZhbHVlLCBmb3JtYXQsIGxuZywgb3B0aW9ucyA9IHt9KSB7XG4gICAgY29uc3QgZm9ybWF0cyA9IGZvcm1hdC5zcGxpdCh0aGlzLmZvcm1hdFNlcGFyYXRvcik7XG4gICAgaWYgKFxuICAgICAgZm9ybWF0cy5sZW5ndGggPiAxICYmXG4gICAgICBmb3JtYXRzWzBdLmluZGV4T2YoJygnKSA+IDEgJiZcbiAgICAgIGZvcm1hdHNbMF0uaW5kZXhPZignKScpIDwgMCAmJlxuICAgICAgZm9ybWF0cy5maW5kKChmKSA9PiBmLmluZGV4T2YoJyknKSA+IC0xKVxuICAgICkge1xuICAgICAgY29uc3QgbGFzdEluZGV4ID0gZm9ybWF0cy5maW5kSW5kZXgoKGYpID0+IGYuaW5kZXhPZignKScpID4gLTEpO1xuICAgICAgZm9ybWF0c1swXSA9IFtmb3JtYXRzWzBdLCAuLi5mb3JtYXRzLnNwbGljZSgxLCBsYXN0SW5kZXgpXS5qb2luKHRoaXMuZm9ybWF0U2VwYXJhdG9yKTtcbiAgICB9XG5cbiAgICBjb25zdCByZXN1bHQgPSBmb3JtYXRzLnJlZHVjZSgobWVtLCBmKSA9PiB7XG4gICAgICBjb25zdCB7IGZvcm1hdE5hbWUsIGZvcm1hdE9wdGlvbnMgfSA9IHBhcnNlRm9ybWF0U3RyKGYpO1xuXG4gICAgICBpZiAodGhpcy5mb3JtYXRzW2Zvcm1hdE5hbWVdKSB7XG4gICAgICAgIGxldCBmb3JtYXR0ZWQgPSBtZW07XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgLy8gb3B0aW9ucyBwYXNzZWQgZXhwbGljaXQgZm9yIHRoYXQgZm9ybWF0dGVkIHZhbHVlXG4gICAgICAgICAgY29uc3QgdmFsT3B0aW9ucyA9XG4gICAgICAgICAgICAob3B0aW9ucyAmJiBvcHRpb25zLmZvcm1hdFBhcmFtcyAmJiBvcHRpb25zLmZvcm1hdFBhcmFtc1tvcHRpb25zLmludGVycG9sYXRpb25rZXldKSB8fFxuICAgICAgICAgICAge307XG5cbiAgICAgICAgICAvLyBsYW5ndWFnZVxuICAgICAgICAgIGNvbnN0IGwgPSB2YWxPcHRpb25zLmxvY2FsZSB8fCB2YWxPcHRpb25zLmxuZyB8fCBvcHRpb25zLmxvY2FsZSB8fCBvcHRpb25zLmxuZyB8fCBsbmc7XG5cbiAgICAgICAgICBmb3JtYXR0ZWQgPSB0aGlzLmZvcm1hdHNbZm9ybWF0TmFtZV0obWVtLCBsLCB7XG4gICAgICAgICAgICAuLi5mb3JtYXRPcHRpb25zLFxuICAgICAgICAgICAgLi4ub3B0aW9ucyxcbiAgICAgICAgICAgIC4uLnZhbE9wdGlvbnMsXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgdGhpcy5sb2dnZXIud2FybihlcnJvcik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZvcm1hdHRlZDtcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWVsc2UtcmV0dXJuXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmxvZ2dlci53YXJuKGB0aGVyZSB3YXMgbm8gZm9ybWF0IGZ1bmN0aW9uIGZvciAke2Zvcm1hdE5hbWV9YCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gbWVtO1xuICAgIH0sIHZhbHVlKTtcblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgRm9ybWF0dGVyO1xuIiwiaW1wb3J0IHsgcHVzaFBhdGggfSBmcm9tICcuL3V0aWxzLmpzJztcbmltcG9ydCBiYXNlTG9nZ2VyIGZyb20gJy4vbG9nZ2VyLmpzJztcbmltcG9ydCBFdmVudEVtaXR0ZXIgZnJvbSAnLi9FdmVudEVtaXR0ZXIuanMnO1xuXG5jb25zdCByZW1vdmVQZW5kaW5nID0gKHEsIG5hbWUpID0+IHtcbiAgaWYgKHEucGVuZGluZ1tuYW1lXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgZGVsZXRlIHEucGVuZGluZ1tuYW1lXTtcbiAgICBxLnBlbmRpbmdDb3VudC0tO1xuICB9XG59O1xuXG5jbGFzcyBDb25uZWN0b3IgZXh0ZW5kcyBFdmVudEVtaXR0ZXIge1xuICBjb25zdHJ1Y3RvcihiYWNrZW5kLCBzdG9yZSwgc2VydmljZXMsIG9wdGlvbnMgPSB7fSkge1xuICAgIHN1cGVyKCk7XG5cbiAgICB0aGlzLmJhY2tlbmQgPSBiYWNrZW5kO1xuICAgIHRoaXMuc3RvcmUgPSBzdG9yZTtcbiAgICB0aGlzLnNlcnZpY2VzID0gc2VydmljZXM7XG4gICAgdGhpcy5sYW5ndWFnZVV0aWxzID0gc2VydmljZXMubGFuZ3VhZ2VVdGlscztcbiAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuICAgIHRoaXMubG9nZ2VyID0gYmFzZUxvZ2dlci5jcmVhdGUoJ2JhY2tlbmRDb25uZWN0b3InKTtcblxuICAgIHRoaXMud2FpdGluZ1JlYWRzID0gW107XG4gICAgdGhpcy5tYXhQYXJhbGxlbFJlYWRzID0gb3B0aW9ucy5tYXhQYXJhbGxlbFJlYWRzIHx8IDEwO1xuICAgIHRoaXMucmVhZGluZ0NhbGxzID0gMDtcblxuICAgIHRoaXMubWF4UmV0cmllcyA9IG9wdGlvbnMubWF4UmV0cmllcyA+PSAwID8gb3B0aW9ucy5tYXhSZXRyaWVzIDogNTtcbiAgICB0aGlzLnJldHJ5VGltZW91dCA9IG9wdGlvbnMucmV0cnlUaW1lb3V0ID49IDEgPyBvcHRpb25zLnJldHJ5VGltZW91dCA6IDM1MDtcblxuICAgIHRoaXMuc3RhdGUgPSB7fTtcbiAgICB0aGlzLnF1ZXVlID0gW107XG5cbiAgICBpZiAodGhpcy5iYWNrZW5kICYmIHRoaXMuYmFja2VuZC5pbml0KSB7XG4gICAgICB0aGlzLmJhY2tlbmQuaW5pdChzZXJ2aWNlcywgb3B0aW9ucy5iYWNrZW5kLCBvcHRpb25zKTtcbiAgICB9XG4gIH1cblxuICBxdWV1ZUxvYWQobGFuZ3VhZ2VzLCBuYW1lc3BhY2VzLCBvcHRpb25zLCBjYWxsYmFjaykge1xuICAgIC8vIGZpbmQgd2hhdCBuZWVkcyB0byBiZSBsb2FkZWRcbiAgICBjb25zdCB0b0xvYWQgPSB7fTtcbiAgICBjb25zdCBwZW5kaW5nID0ge307XG4gICAgY29uc3QgdG9Mb2FkTGFuZ3VhZ2VzID0ge307XG4gICAgY29uc3QgdG9Mb2FkTmFtZXNwYWNlcyA9IHt9O1xuXG4gICAgbGFuZ3VhZ2VzLmZvckVhY2goKGxuZykgPT4ge1xuICAgICAgbGV0IGhhc0FsbE5hbWVzcGFjZXMgPSB0cnVlO1xuXG4gICAgICBuYW1lc3BhY2VzLmZvckVhY2goKG5zKSA9PiB7XG4gICAgICAgIGNvbnN0IG5hbWUgPSBgJHtsbmd9fCR7bnN9YDtcblxuICAgICAgICBpZiAoIW9wdGlvbnMucmVsb2FkICYmIHRoaXMuc3RvcmUuaGFzUmVzb3VyY2VCdW5kbGUobG5nLCBucykpIHtcbiAgICAgICAgICB0aGlzLnN0YXRlW25hbWVdID0gMjsgLy8gbG9hZGVkXG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5zdGF0ZVtuYW1lXSA8IDApIHtcbiAgICAgICAgICAvLyBub3RoaW5nIHRvIGRvIGZvciBlcnJcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLnN0YXRlW25hbWVdID09PSAxKSB7XG4gICAgICAgICAgaWYgKHBlbmRpbmdbbmFtZV0gPT09IHVuZGVmaW5lZCkgcGVuZGluZ1tuYW1lXSA9IHRydWU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5zdGF0ZVtuYW1lXSA9IDE7IC8vIHBlbmRpbmdcblxuICAgICAgICAgIGhhc0FsbE5hbWVzcGFjZXMgPSBmYWxzZTtcblxuICAgICAgICAgIGlmIChwZW5kaW5nW25hbWVdID09PSB1bmRlZmluZWQpIHBlbmRpbmdbbmFtZV0gPSB0cnVlO1xuICAgICAgICAgIGlmICh0b0xvYWRbbmFtZV0gPT09IHVuZGVmaW5lZCkgdG9Mb2FkW25hbWVdID0gdHJ1ZTtcbiAgICAgICAgICBpZiAodG9Mb2FkTmFtZXNwYWNlc1tuc10gPT09IHVuZGVmaW5lZCkgdG9Mb2FkTmFtZXNwYWNlc1tuc10gPSB0cnVlO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgaWYgKCFoYXNBbGxOYW1lc3BhY2VzKSB0b0xvYWRMYW5ndWFnZXNbbG5nXSA9IHRydWU7XG4gICAgfSk7XG5cbiAgICBpZiAoT2JqZWN0LmtleXModG9Mb2FkKS5sZW5ndGggfHwgT2JqZWN0LmtleXMocGVuZGluZykubGVuZ3RoKSB7XG4gICAgICB0aGlzLnF1ZXVlLnB1c2goe1xuICAgICAgICBwZW5kaW5nLFxuICAgICAgICBwZW5kaW5nQ291bnQ6IE9iamVjdC5rZXlzKHBlbmRpbmcpLmxlbmd0aCxcbiAgICAgICAgbG9hZGVkOiB7fSxcbiAgICAgICAgZXJyb3JzOiBbXSxcbiAgICAgICAgY2FsbGJhY2ssXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgdG9Mb2FkOiBPYmplY3Qua2V5cyh0b0xvYWQpLFxuICAgICAgcGVuZGluZzogT2JqZWN0LmtleXMocGVuZGluZyksXG4gICAgICB0b0xvYWRMYW5ndWFnZXM6IE9iamVjdC5rZXlzKHRvTG9hZExhbmd1YWdlcyksXG4gICAgICB0b0xvYWROYW1lc3BhY2VzOiBPYmplY3Qua2V5cyh0b0xvYWROYW1lc3BhY2VzKSxcbiAgICB9O1xuICB9XG5cbiAgbG9hZGVkKG5hbWUsIGVyciwgZGF0YSkge1xuICAgIGNvbnN0IHMgPSBuYW1lLnNwbGl0KCd8Jyk7XG4gICAgY29uc3QgbG5nID0gc1swXTtcbiAgICBjb25zdCBucyA9IHNbMV07XG5cbiAgICBpZiAoZXJyKSB0aGlzLmVtaXQoJ2ZhaWxlZExvYWRpbmcnLCBsbmcsIG5zLCBlcnIpO1xuXG4gICAgaWYgKGRhdGEpIHtcbiAgICAgIHRoaXMuc3RvcmUuYWRkUmVzb3VyY2VCdW5kbGUobG5nLCBucywgZGF0YSwgdW5kZWZpbmVkLCB1bmRlZmluZWQsIHsgc2tpcENvcHk6IHRydWUgfSk7XG4gICAgfVxuXG4gICAgLy8gc2V0IGxvYWRlZFxuICAgIHRoaXMuc3RhdGVbbmFtZV0gPSBlcnIgPyAtMSA6IDI7XG5cbiAgICAvLyBjb25zb2xpZGF0ZWQgbG9hZGluZyBkb25lIGluIHRoaXMgcnVuIC0gb25seSBlbWl0IG9uY2UgZm9yIGEgbG9hZGVkIG5hbWVzcGFjZVxuICAgIGNvbnN0IGxvYWRlZCA9IHt9O1xuXG4gICAgLy8gY2FsbGJhY2sgaWYgcmVhZHlcbiAgICB0aGlzLnF1ZXVlLmZvckVhY2goKHEpID0+IHtcbiAgICAgIHB1c2hQYXRoKHEubG9hZGVkLCBbbG5nXSwgbnMpO1xuICAgICAgcmVtb3ZlUGVuZGluZyhxLCBuYW1lKTtcblxuICAgICAgaWYgKGVycikgcS5lcnJvcnMucHVzaChlcnIpO1xuXG4gICAgICBpZiAocS5wZW5kaW5nQ291bnQgPT09IDAgJiYgIXEuZG9uZSkge1xuICAgICAgICAvLyBvbmx5IGRvIG9uY2UgcGVyIGxvYWRlZCAtPiB0aGlzLmVtaXQoJ2xvYWRlZCcsIHEubG9hZGVkKTtcbiAgICAgICAgT2JqZWN0LmtleXMocS5sb2FkZWQpLmZvckVhY2goKGwpID0+IHtcbiAgICAgICAgICBpZiAoIWxvYWRlZFtsXSkgbG9hZGVkW2xdID0ge307XG4gICAgICAgICAgY29uc3QgbG9hZGVkS2V5cyA9IHEubG9hZGVkW2xdO1xuICAgICAgICAgIGlmIChsb2FkZWRLZXlzLmxlbmd0aCkge1xuICAgICAgICAgICAgbG9hZGVkS2V5cy5mb3JFYWNoKChuKSA9PiB7XG4gICAgICAgICAgICAgIGlmIChsb2FkZWRbbF1bbl0gPT09IHVuZGVmaW5lZCkgbG9hZGVkW2xdW25dID0gdHJ1ZTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLyogZXNsaW50IG5vLXBhcmFtLXJlYXNzaWduOiAwICovXG4gICAgICAgIHEuZG9uZSA9IHRydWU7XG4gICAgICAgIGlmIChxLmVycm9ycy5sZW5ndGgpIHtcbiAgICAgICAgICBxLmNhbGxiYWNrKHEuZXJyb3JzKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBxLmNhbGxiYWNrKCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIGVtaXQgY29uc29saWRhdGVkIGxvYWRlZCBldmVudFxuICAgIHRoaXMuZW1pdCgnbG9hZGVkJywgbG9hZGVkKTtcblxuICAgIC8vIHJlbW92ZSBkb25lIGxvYWQgcmVxdWVzdHNcbiAgICB0aGlzLnF1ZXVlID0gdGhpcy5xdWV1ZS5maWx0ZXIoKHEpID0+ICFxLmRvbmUpO1xuICB9XG5cbiAgcmVhZChsbmcsIG5zLCBmY05hbWUsIHRyaWVkID0gMCwgd2FpdCA9IHRoaXMucmV0cnlUaW1lb3V0LCBjYWxsYmFjaykge1xuICAgIGlmICghbG5nLmxlbmd0aCkgcmV0dXJuIGNhbGxiYWNrKG51bGwsIHt9KTsgLy8gbm90aW5nIHRvIGxvYWRcblxuICAgIC8vIExpbWl0IHBhcmFsbGVsaXNtIG9mIGNhbGxzIHRvIGJhY2tlbmRcbiAgICAvLyBUaGlzIGlzIG5lZWRlZCB0byBwcmV2ZW50IHRyeWluZyB0byBvcGVuIHRob3VzYW5kcyBvZlxuICAgIC8vIHNvY2tldHMgb3IgZmlsZSBkZXNjcmlwdG9ycywgd2hpY2ggY2FuIGNhdXNlIGZhaWx1cmVzXG4gICAgLy8gYW5kIGFjdHVhbGx5IG1ha2UgdGhlIGVudGlyZSBwcm9jZXNzIHRha2UgbG9uZ2VyLlxuICAgIGlmICh0aGlzLnJlYWRpbmdDYWxscyA+PSB0aGlzLm1heFBhcmFsbGVsUmVhZHMpIHtcbiAgICAgIHRoaXMud2FpdGluZ1JlYWRzLnB1c2goeyBsbmcsIG5zLCBmY05hbWUsIHRyaWVkLCB3YWl0LCBjYWxsYmFjayB9KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5yZWFkaW5nQ2FsbHMrKztcblxuICAgIGNvbnN0IHJlc29sdmVyID0gKGVyciwgZGF0YSkgPT4ge1xuICAgICAgdGhpcy5yZWFkaW5nQ2FsbHMtLTtcbiAgICAgIGlmICh0aGlzLndhaXRpbmdSZWFkcy5sZW5ndGggPiAwKSB7XG4gICAgICAgIGNvbnN0IG5leHQgPSB0aGlzLndhaXRpbmdSZWFkcy5zaGlmdCgpO1xuICAgICAgICB0aGlzLnJlYWQobmV4dC5sbmcsIG5leHQubnMsIG5leHQuZmNOYW1lLCBuZXh0LnRyaWVkLCBuZXh0LndhaXQsIG5leHQuY2FsbGJhY2spO1xuICAgICAgfVxuICAgICAgaWYgKGVyciAmJiBkYXRhIC8qID0gcmV0cnlGbGFnICovICYmIHRyaWVkIDwgdGhpcy5tYXhSZXRyaWVzKSB7XG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgIHRoaXMucmVhZC5jYWxsKHRoaXMsIGxuZywgbnMsIGZjTmFtZSwgdHJpZWQgKyAxLCB3YWl0ICogMiwgY2FsbGJhY2spO1xuICAgICAgICB9LCB3YWl0KTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgY2FsbGJhY2soZXJyLCBkYXRhKTtcbiAgICB9O1xuXG4gICAgY29uc3QgZmMgPSB0aGlzLmJhY2tlbmRbZmNOYW1lXS5iaW5kKHRoaXMuYmFja2VuZCk7XG4gICAgaWYgKGZjLmxlbmd0aCA9PT0gMikge1xuICAgICAgLy8gbm8gY2FsbGJhY2tcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IHIgPSBmYyhsbmcsIG5zKTtcbiAgICAgICAgaWYgKHIgJiYgdHlwZW9mIHIudGhlbiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgIC8vIHByb21pc2VcbiAgICAgICAgICByLnRoZW4oKGRhdGEpID0+IHJlc29sdmVyKG51bGwsIGRhdGEpKS5jYXRjaChyZXNvbHZlcik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gc3luY1xuICAgICAgICAgIHJlc29sdmVyKG51bGwsIHIpO1xuICAgICAgICB9XG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgcmVzb2x2ZXIoZXJyKTtcbiAgICAgIH1cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBub3JtYWwgd2l0aCBjYWxsYmFja1xuICAgIHJldHVybiBmYyhsbmcsIG5zLCByZXNvbHZlcik7XG4gIH1cblxuICAvKiBlc2xpbnQgY29uc2lzdGVudC1yZXR1cm46IDAgKi9cbiAgcHJlcGFyZUxvYWRpbmcobGFuZ3VhZ2VzLCBuYW1lc3BhY2VzLCBvcHRpb25zID0ge30sIGNhbGxiYWNrKSB7XG4gICAgaWYgKCF0aGlzLmJhY2tlbmQpIHtcbiAgICAgIHRoaXMubG9nZ2VyLndhcm4oJ05vIGJhY2tlbmQgd2FzIGFkZGVkIHZpYSBpMThuZXh0LnVzZS4gV2lsbCBub3QgbG9hZCByZXNvdXJjZXMuJyk7XG4gICAgICByZXR1cm4gY2FsbGJhY2sgJiYgY2FsbGJhY2soKTtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIGxhbmd1YWdlcyA9PT0gJ3N0cmluZycpIGxhbmd1YWdlcyA9IHRoaXMubGFuZ3VhZ2VVdGlscy50b1Jlc29sdmVIaWVyYXJjaHkobGFuZ3VhZ2VzKTtcbiAgICBpZiAodHlwZW9mIG5hbWVzcGFjZXMgPT09ICdzdHJpbmcnKSBuYW1lc3BhY2VzID0gW25hbWVzcGFjZXNdO1xuXG4gICAgY29uc3QgdG9Mb2FkID0gdGhpcy5xdWV1ZUxvYWQobGFuZ3VhZ2VzLCBuYW1lc3BhY2VzLCBvcHRpb25zLCBjYWxsYmFjayk7XG4gICAgaWYgKCF0b0xvYWQudG9Mb2FkLmxlbmd0aCkge1xuICAgICAgaWYgKCF0b0xvYWQucGVuZGluZy5sZW5ndGgpIGNhbGxiYWNrKCk7IC8vIG5vdGhpbmcgdG8gbG9hZCBhbmQgbm8gcGVuZGluZ3MuLi5jYWxsYmFjayBub3dcbiAgICAgIHJldHVybiBudWxsOyAvLyBwZW5kaW5ncyB3aWxsIHRyaWdnZXIgY2FsbGJhY2tcbiAgICB9XG5cbiAgICB0b0xvYWQudG9Mb2FkLmZvckVhY2goKG5hbWUpID0+IHtcbiAgICAgIHRoaXMubG9hZE9uZShuYW1lKTtcbiAgICB9KTtcbiAgfVxuXG4gIGxvYWQobGFuZ3VhZ2VzLCBuYW1lc3BhY2VzLCBjYWxsYmFjaykge1xuICAgIHRoaXMucHJlcGFyZUxvYWRpbmcobGFuZ3VhZ2VzLCBuYW1lc3BhY2VzLCB7fSwgY2FsbGJhY2spO1xuICB9XG5cbiAgcmVsb2FkKGxhbmd1YWdlcywgbmFtZXNwYWNlcywgY2FsbGJhY2spIHtcbiAgICB0aGlzLnByZXBhcmVMb2FkaW5nKGxhbmd1YWdlcywgbmFtZXNwYWNlcywgeyByZWxvYWQ6IHRydWUgfSwgY2FsbGJhY2spO1xuICB9XG5cbiAgbG9hZE9uZShuYW1lLCBwcmVmaXggPSAnJykge1xuICAgIGNvbnN0IHMgPSBuYW1lLnNwbGl0KCd8Jyk7XG4gICAgY29uc3QgbG5nID0gc1swXTtcbiAgICBjb25zdCBucyA9IHNbMV07XG5cbiAgICB0aGlzLnJlYWQobG5nLCBucywgJ3JlYWQnLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgaWYgKGVycikgdGhpcy5sb2dnZXIud2FybihgJHtwcmVmaXh9bG9hZGluZyBuYW1lc3BhY2UgJHtuc30gZm9yIGxhbmd1YWdlICR7bG5nfSBmYWlsZWRgLCBlcnIpO1xuICAgICAgaWYgKCFlcnIgJiYgZGF0YSlcbiAgICAgICAgdGhpcy5sb2dnZXIubG9nKGAke3ByZWZpeH1sb2FkZWQgbmFtZXNwYWNlICR7bnN9IGZvciBsYW5ndWFnZSAke2xuZ31gLCBkYXRhKTtcblxuICAgICAgdGhpcy5sb2FkZWQobmFtZSwgZXJyLCBkYXRhKTtcbiAgICB9KTtcbiAgfVxuXG4gIHNhdmVNaXNzaW5nKGxhbmd1YWdlcywgbmFtZXNwYWNlLCBrZXksIGZhbGxiYWNrVmFsdWUsIGlzVXBkYXRlLCBvcHRpb25zID0ge30sIGNsYiA9ICgpID0+IHt9KSB7XG4gICAgaWYgKFxuICAgICAgdGhpcy5zZXJ2aWNlcy51dGlscyAmJlxuICAgICAgdGhpcy5zZXJ2aWNlcy51dGlscy5oYXNMb2FkZWROYW1lc3BhY2UgJiZcbiAgICAgICF0aGlzLnNlcnZpY2VzLnV0aWxzLmhhc0xvYWRlZE5hbWVzcGFjZShuYW1lc3BhY2UpXG4gICAgKSB7XG4gICAgICB0aGlzLmxvZ2dlci53YXJuKFxuICAgICAgICBgZGlkIG5vdCBzYXZlIGtleSBcIiR7a2V5fVwiIGFzIHRoZSBuYW1lc3BhY2UgXCIke25hbWVzcGFjZX1cIiB3YXMgbm90IHlldCBsb2FkZWRgLFxuICAgICAgICAnVGhpcyBtZWFucyBzb21ldGhpbmcgSVMgV1JPTkcgaW4geW91ciBzZXR1cC4gWW91IGFjY2VzcyB0aGUgdCBmdW5jdGlvbiBiZWZvcmUgaTE4bmV4dC5pbml0IC8gaTE4bmV4dC5sb2FkTmFtZXNwYWNlIC8gaTE4bmV4dC5jaGFuZ2VMYW5ndWFnZSB3YXMgZG9uZS4gV2FpdCBmb3IgdGhlIGNhbGxiYWNrIG9yIFByb21pc2UgdG8gcmVzb2x2ZSBiZWZvcmUgYWNjZXNzaW5nIGl0ISEhJyxcbiAgICAgICk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gaWdub3JlIG5vbiB2YWxpZCBrZXlzXG4gICAgaWYgKGtleSA9PT0gdW5kZWZpbmVkIHx8IGtleSA9PT0gbnVsbCB8fCBrZXkgPT09ICcnKSByZXR1cm47XG5cbiAgICBpZiAodGhpcy5iYWNrZW5kICYmIHRoaXMuYmFja2VuZC5jcmVhdGUpIHtcbiAgICAgIGNvbnN0IG9wdHMgPSB7XG4gICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICAgIGlzVXBkYXRlLFxuICAgICAgfTtcbiAgICAgIGNvbnN0IGZjID0gdGhpcy5iYWNrZW5kLmNyZWF0ZS5iaW5kKHRoaXMuYmFja2VuZCk7XG4gICAgICBpZiAoZmMubGVuZ3RoIDwgNikge1xuICAgICAgICAvLyBubyBjYWxsYmFja1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGxldCByO1xuICAgICAgICAgIGlmIChmYy5sZW5ndGggPT09IDUpIHtcbiAgICAgICAgICAgIC8vIGZ1dHVyZSBjYWxsYmFjay1sZXNzIGFwaSBmb3IgaTE4bmV4dC1sb2NpemUtYmFja2VuZFxuICAgICAgICAgICAgciA9IGZjKGxhbmd1YWdlcywgbmFtZXNwYWNlLCBrZXksIGZhbGxiYWNrVmFsdWUsIG9wdHMpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByID0gZmMobGFuZ3VhZ2VzLCBuYW1lc3BhY2UsIGtleSwgZmFsbGJhY2tWYWx1ZSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChyICYmIHR5cGVvZiByLnRoZW4gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIC8vIHByb21pc2VcbiAgICAgICAgICAgIHIudGhlbigoZGF0YSkgPT4gY2xiKG51bGwsIGRhdGEpKS5jYXRjaChjbGIpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBzeW5jXG4gICAgICAgICAgICBjbGIobnVsbCwgcik7XG4gICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICBjbGIoZXJyKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gbm9ybWFsIHdpdGggY2FsbGJhY2tcbiAgICAgICAgZmMobGFuZ3VhZ2VzLCBuYW1lc3BhY2UsIGtleSwgZmFsbGJhY2tWYWx1ZSwgY2xiIC8qIHVudXNlZCBjYWxsYmFjayAqLywgb3B0cyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gd3JpdGUgdG8gc3RvcmUgdG8gYXZvaWQgcmVzZW5kaW5nXG4gICAgaWYgKCFsYW5ndWFnZXMgfHwgIWxhbmd1YWdlc1swXSkgcmV0dXJuO1xuICAgIHRoaXMuc3RvcmUuYWRkUmVzb3VyY2UobGFuZ3VhZ2VzWzBdLCBuYW1lc3BhY2UsIGtleSwgZmFsbGJhY2tWYWx1ZSk7XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgQ29ubmVjdG9yO1xuIiwiZXhwb3J0IGNvbnN0IGdldCA9ICgpID0+ICh7XG4gIGRlYnVnOiBmYWxzZSxcbiAgaW5pdEltbWVkaWF0ZTogdHJ1ZSxcblxuICBuczogWyd0cmFuc2xhdGlvbiddLFxuICBkZWZhdWx0TlM6IFsndHJhbnNsYXRpb24nXSxcbiAgZmFsbGJhY2tMbmc6IFsnZGV2J10sXG4gIGZhbGxiYWNrTlM6IGZhbHNlLCAvLyBzdHJpbmcgb3IgYXJyYXkgb2YgbmFtZXNwYWNlc1xuXG4gIHN1cHBvcnRlZExuZ3M6IGZhbHNlLCAvLyBhcnJheSB3aXRoIHN1cHBvcnRlZCBsYW5ndWFnZXNcbiAgbm9uRXhwbGljaXRTdXBwb3J0ZWRMbmdzOiBmYWxzZSxcbiAgbG9hZDogJ2FsbCcsIC8vIHwgY3VycmVudE9ubHkgfCBsYW5ndWFnZU9ubHlcbiAgcHJlbG9hZDogZmFsc2UsIC8vIGFycmF5IHdpdGggcHJlbG9hZCBsYW5ndWFnZXNcblxuICBzaW1wbGlmeVBsdXJhbFN1ZmZpeDogdHJ1ZSxcbiAga2V5U2VwYXJhdG9yOiAnLicsXG4gIG5zU2VwYXJhdG9yOiAnOicsXG4gIHBsdXJhbFNlcGFyYXRvcjogJ18nLFxuICBjb250ZXh0U2VwYXJhdG9yOiAnXycsXG5cbiAgcGFydGlhbEJ1bmRsZWRMYW5ndWFnZXM6IGZhbHNlLCAvLyBhbGxvdyBidW5kbGluZyBjZXJ0YWluIGxhbmd1YWdlcyB0aGF0IGFyZSBub3QgcmVtb3RlbHkgZmV0Y2hlZFxuICBzYXZlTWlzc2luZzogZmFsc2UsIC8vIGVuYWJsZSB0byBzZW5kIG1pc3NpbmcgdmFsdWVzXG4gIHVwZGF0ZU1pc3Npbmc6IGZhbHNlLCAvLyBlbmFibGUgdG8gdXBkYXRlIGRlZmF1bHQgdmFsdWVzIGlmIGRpZmZlcmVudCBmcm9tIHRyYW5zbGF0ZWQgdmFsdWUgKG9ubHkgdXNlZnVsIG9uIGluaXRpYWwgZGV2ZWxvcG1lbnQsIG9yIHdoZW4ga2VlcGluZyBjb2RlIGFzIHNvdXJjZSBvZiB0cnV0aClcbiAgc2F2ZU1pc3NpbmdUbzogJ2ZhbGxiYWNrJywgLy8gJ2N1cnJlbnQnIHx8ICdhbGwnXG4gIHNhdmVNaXNzaW5nUGx1cmFsczogdHJ1ZSwgLy8gd2lsbCBzYXZlIGFsbCBmb3JtcyBub3Qgb25seSBzaW5ndWxhciBrZXlcbiAgbWlzc2luZ0tleUhhbmRsZXI6IGZhbHNlLCAvLyBmdW5jdGlvbihsbmcsIG5zLCBrZXksIGZhbGxiYWNrVmFsdWUpIC0+IG92ZXJyaWRlIGlmIHByZWZlciBvbiBoYW5kbGluZ1xuICBtaXNzaW5nSW50ZXJwb2xhdGlvbkhhbmRsZXI6IGZhbHNlLCAvLyBmdW5jdGlvbihzdHIsIG1hdGNoKVxuXG4gIHBvc3RQcm9jZXNzOiBmYWxzZSwgLy8gc3RyaW5nIG9yIGFycmF5IG9mIHBvc3RQcm9jZXNzb3IgbmFtZXNcbiAgcG9zdFByb2Nlc3NQYXNzUmVzb2x2ZWQ6IGZhbHNlLCAvLyBwYXNzIHJlc29sdmVkIG9iamVjdCBpbnRvICdvcHRpb25zLmkxOG5SZXNvbHZlZCcgZm9yIHBvc3Rwcm9jZXNzb3JcbiAgcmV0dXJuTnVsbDogZmFsc2UsIC8vIGFsbG93cyBudWxsIHZhbHVlIGFzIHZhbGlkIHRyYW5zbGF0aW9uXG4gIHJldHVybkVtcHR5U3RyaW5nOiB0cnVlLCAvLyBhbGxvd3MgZW1wdHkgc3RyaW5nIHZhbHVlIGFzIHZhbGlkIHRyYW5zbGF0aW9uXG4gIHJldHVybk9iamVjdHM6IGZhbHNlLFxuICBqb2luQXJyYXlzOiBmYWxzZSwgLy8gb3Igc3RyaW5nIHRvIGpvaW4gYXJyYXlcbiAgcmV0dXJuZWRPYmplY3RIYW5kbGVyOiBmYWxzZSwgLy8gZnVuY3Rpb24oa2V5LCB2YWx1ZSwgb3B0aW9ucykgdHJpZ2dlcmVkIGlmIGtleSByZXR1cm5zIG9iamVjdCBidXQgcmV0dXJuT2JqZWN0cyBpcyBzZXQgdG8gZmFsc2VcbiAgcGFyc2VNaXNzaW5nS2V5SGFuZGxlcjogZmFsc2UsIC8vIGZ1bmN0aW9uKGtleSkgcGFyc2VkIGEga2V5IHRoYXQgd2FzIG5vdCBmb3VuZCBpbiB0KCkgYmVmb3JlIHJldHVybmluZ1xuICBhcHBlbmROYW1lc3BhY2VUb01pc3NpbmdLZXk6IGZhbHNlLFxuICBhcHBlbmROYW1lc3BhY2VUb0NJTW9kZTogZmFsc2UsXG4gIG92ZXJsb2FkVHJhbnNsYXRpb25PcHRpb25IYW5kbGVyOiAoYXJncykgPT4ge1xuICAgIGxldCByZXQgPSB7fTtcbiAgICBpZiAodHlwZW9mIGFyZ3NbMV0gPT09ICdvYmplY3QnKSByZXQgPSBhcmdzWzFdO1xuICAgIGlmICh0eXBlb2YgYXJnc1sxXSA9PT0gJ3N0cmluZycpIHJldC5kZWZhdWx0VmFsdWUgPSBhcmdzWzFdO1xuICAgIGlmICh0eXBlb2YgYXJnc1syXSA9PT0gJ3N0cmluZycpIHJldC50RGVzY3JpcHRpb24gPSBhcmdzWzJdO1xuICAgIGlmICh0eXBlb2YgYXJnc1syXSA9PT0gJ29iamVjdCcgfHwgdHlwZW9mIGFyZ3NbM10gPT09ICdvYmplY3QnKSB7XG4gICAgICBjb25zdCBvcHRpb25zID0gYXJnc1szXSB8fCBhcmdzWzJdO1xuICAgICAgT2JqZWN0LmtleXMob3B0aW9ucykuZm9yRWFjaCgoa2V5KSA9PiB7XG4gICAgICAgIHJldFtrZXldID0gb3B0aW9uc1trZXldO1xuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiByZXQ7XG4gIH0sXG4gIGludGVycG9sYXRpb246IHtcbiAgICBlc2NhcGVWYWx1ZTogdHJ1ZSxcbiAgICAvKiogQHR5cGUge2ltcG9ydCgnaTE4bmV4dCcpLkZvcm1hdEZ1bmN0aW9ufSAqL1xuICAgIGZvcm1hdDogKHZhbHVlKSA9PiB2YWx1ZSxcbiAgICBwcmVmaXg6ICd7eycsXG4gICAgc3VmZml4OiAnfX0nLFxuICAgIGZvcm1hdFNlcGFyYXRvcjogJywnLFxuICAgIC8vIHByZWZpeEVzY2FwZWQ6ICd7eycsXG4gICAgLy8gc3VmZml4RXNjYXBlZDogJ319JyxcbiAgICAvLyB1bmVzY2FwZVN1ZmZpeDogJycsXG4gICAgdW5lc2NhcGVQcmVmaXg6ICctJyxcblxuICAgIG5lc3RpbmdQcmVmaXg6ICckdCgnLFxuICAgIG5lc3RpbmdTdWZmaXg6ICcpJyxcbiAgICBuZXN0aW5nT3B0aW9uc1NlcGFyYXRvcjogJywnLFxuICAgIC8vIG5lc3RpbmdQcmVmaXhFc2NhcGVkOiAnJHQoJyxcbiAgICAvLyBuZXN0aW5nU3VmZml4RXNjYXBlZDogJyknLFxuICAgIC8vIGRlZmF1bHRWYXJpYWJsZXM6IHVuZGVmaW5lZCAvLyBvYmplY3QgdGhhdCBjYW4gaGF2ZSB2YWx1ZXMgdG8gaW50ZXJwb2xhdGUgb24gLSBleHRlbmRzIHBhc3NlZCBpbiBpbnRlcnBvbGF0aW9uIGRhdGFcbiAgICBtYXhSZXBsYWNlczogMTAwMCwgLy8gbWF4IHJlcGxhY2VzIHRvIHByZXZlbnQgZW5kbGVzcyBsb29wXG4gICAgc2tpcE9uVmFyaWFibGVzOiB0cnVlLFxuICB9LFxufSk7XG5cbi8qIGVzbGludCBuby1wYXJhbS1yZWFzc2lnbjogMCAqL1xuZXhwb3J0IGNvbnN0IHRyYW5zZm9ybU9wdGlvbnMgPSAob3B0aW9ucykgPT4ge1xuICAvLyBjcmVhdGUgbmFtZXNwYWNlIG9iamVjdCBpZiBuYW1lc3BhY2UgaXMgcGFzc2VkIGluIGFzIHN0cmluZ1xuICBpZiAodHlwZW9mIG9wdGlvbnMubnMgPT09ICdzdHJpbmcnKSBvcHRpb25zLm5zID0gW29wdGlvbnMubnNdO1xuICBpZiAodHlwZW9mIG9wdGlvbnMuZmFsbGJhY2tMbmcgPT09ICdzdHJpbmcnKSBvcHRpb25zLmZhbGxiYWNrTG5nID0gW29wdGlvbnMuZmFsbGJhY2tMbmddO1xuICBpZiAodHlwZW9mIG9wdGlvbnMuZmFsbGJhY2tOUyA9PT0gJ3N0cmluZycpIG9wdGlvbnMuZmFsbGJhY2tOUyA9IFtvcHRpb25zLmZhbGxiYWNrTlNdO1xuXG4gIC8vIGV4dGVuZCBzdXBwb3J0ZWRMbmdzIHdpdGggY2ltb2RlXG4gIGlmIChvcHRpb25zLnN1cHBvcnRlZExuZ3MgJiYgb3B0aW9ucy5zdXBwb3J0ZWRMbmdzLmluZGV4T2YoJ2NpbW9kZScpIDwgMCkge1xuICAgIG9wdGlvbnMuc3VwcG9ydGVkTG5ncyA9IG9wdGlvbnMuc3VwcG9ydGVkTG5ncy5jb25jYXQoWydjaW1vZGUnXSk7XG4gIH1cblxuICByZXR1cm4gb3B0aW9ucztcbn07XG4iLCJpbXBvcnQgYmFzZUxvZ2dlciBmcm9tICcuL2xvZ2dlci5qcyc7XG5pbXBvcnQgRXZlbnRFbWl0dGVyIGZyb20gJy4vRXZlbnRFbWl0dGVyLmpzJztcbmltcG9ydCBSZXNvdXJjZVN0b3JlIGZyb20gJy4vUmVzb3VyY2VTdG9yZS5qcyc7XG5pbXBvcnQgVHJhbnNsYXRvciBmcm9tICcuL1RyYW5zbGF0b3IuanMnO1xuaW1wb3J0IExhbmd1YWdlVXRpbHMgZnJvbSAnLi9MYW5ndWFnZVV0aWxzLmpzJztcbmltcG9ydCBQbHVyYWxSZXNvbHZlciBmcm9tICcuL1BsdXJhbFJlc29sdmVyLmpzJztcbmltcG9ydCBJbnRlcnBvbGF0b3IgZnJvbSAnLi9JbnRlcnBvbGF0b3IuanMnO1xuaW1wb3J0IEZvcm1hdHRlciBmcm9tICcuL0Zvcm1hdHRlci5qcyc7XG5pbXBvcnQgQmFja2VuZENvbm5lY3RvciBmcm9tICcuL0JhY2tlbmRDb25uZWN0b3IuanMnO1xuaW1wb3J0IHsgZ2V0IGFzIGdldERlZmF1bHRzLCB0cmFuc2Zvcm1PcHRpb25zIH0gZnJvbSAnLi9kZWZhdWx0cy5qcyc7XG5pbXBvcnQgcG9zdFByb2Nlc3NvciBmcm9tICcuL3Bvc3RQcm9jZXNzb3IuanMnO1xuaW1wb3J0IHsgZGVmZXIgfSBmcm9tICcuL3V0aWxzLmpzJztcblxuY29uc3Qgbm9vcCA9ICgpID0+IHt9XG5cbi8vIEJpbmRzIHRoZSBtZW1iZXIgZnVuY3Rpb25zIG9mIHRoZSBnaXZlbiBjbGFzcyBpbnN0YW5jZSBzbyB0aGF0IHRoZXkgY2FuIGJlXG4vLyBkZXN0cnVjdHVyZWQgb3IgdXNlZCBhcyBjYWxsYmFja3MuXG5jb25zdCBiaW5kTWVtYmVyRnVuY3Rpb25zID0gKGluc3QpID0+IHtcbiAgY29uc3QgbWVtcyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKE9iamVjdC5nZXRQcm90b3R5cGVPZihpbnN0KSlcbiAgbWVtcy5mb3JFYWNoKChtZW0pID0+IHtcbiAgICBpZiAodHlwZW9mIGluc3RbbWVtXSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgaW5zdFttZW1dID0gaW5zdFttZW1dLmJpbmQoaW5zdClcbiAgICB9XG4gIH0pXG59XG5cbmNsYXNzIEkxOG4gZXh0ZW5kcyBFdmVudEVtaXR0ZXIge1xuICBjb25zdHJ1Y3RvcihvcHRpb25zID0ge30sIGNhbGxiYWNrKSB7XG4gICAgc3VwZXIoKTtcblxuICAgIHRoaXMub3B0aW9ucyA9IHRyYW5zZm9ybU9wdGlvbnMob3B0aW9ucyk7XG4gICAgdGhpcy5zZXJ2aWNlcyA9IHt9O1xuICAgIHRoaXMubG9nZ2VyID0gYmFzZUxvZ2dlcjtcbiAgICB0aGlzLm1vZHVsZXMgPSB7IGV4dGVybmFsOiBbXSB9O1xuXG4gICAgYmluZE1lbWJlckZ1bmN0aW9ucyh0aGlzKTtcblxuICAgIGlmIChjYWxsYmFjayAmJiAhdGhpcy5pc0luaXRpYWxpemVkICYmICFvcHRpb25zLmlzQ2xvbmUpIHtcbiAgICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9pMThuZXh0L2kxOG5leHQvaXNzdWVzLzg3OVxuICAgICAgaWYgKCF0aGlzLm9wdGlvbnMuaW5pdEltbWVkaWF0ZSkge1xuICAgICAgICB0aGlzLmluaXQob3B0aW9ucywgY2FsbGJhY2spO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgIH1cbiAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICB0aGlzLmluaXQob3B0aW9ucywgY2FsbGJhY2spO1xuICAgICAgfSwgMCk7XG4gICAgfVxuICB9XG5cbiAgaW5pdChvcHRpb25zID0ge30sIGNhbGxiYWNrKSB7XG4gICAgdGhpcy5pc0luaXRpYWxpemluZyA9IHRydWU7XG4gICAgaWYgKHR5cGVvZiBvcHRpb25zID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBjYWxsYmFjayA9IG9wdGlvbnM7XG4gICAgICBvcHRpb25zID0ge307XG4gICAgfVxuXG4gICAgaWYgKCFvcHRpb25zLmRlZmF1bHROUyAmJiBvcHRpb25zLmRlZmF1bHROUyAhPT0gZmFsc2UgJiYgb3B0aW9ucy5ucykge1xuICAgICAgaWYgKHR5cGVvZiBvcHRpb25zLm5zID09PSAnc3RyaW5nJykge1xuICAgICAgICBvcHRpb25zLmRlZmF1bHROUyA9IG9wdGlvbnMubnM7XG4gICAgICB9IGVsc2UgaWYgKG9wdGlvbnMubnMuaW5kZXhPZigndHJhbnNsYXRpb24nKSA8IDApIHtcbiAgICAgICAgb3B0aW9ucy5kZWZhdWx0TlMgPSBvcHRpb25zLm5zWzBdO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IGRlZk9wdHMgPSBnZXREZWZhdWx0cygpO1xuICAgIHRoaXMub3B0aW9ucyA9IHsgLi4uZGVmT3B0cywgLi4udGhpcy5vcHRpb25zLCAuLi50cmFuc2Zvcm1PcHRpb25zKG9wdGlvbnMpIH07XG4gICAgaWYgKHRoaXMub3B0aW9ucy5jb21wYXRpYmlsaXR5QVBJICE9PSAndjEnKSB7XG4gICAgICB0aGlzLm9wdGlvbnMuaW50ZXJwb2xhdGlvbiA9IHsgLi4uZGVmT3B0cy5pbnRlcnBvbGF0aW9uLCAuLi50aGlzLm9wdGlvbnMuaW50ZXJwb2xhdGlvbiB9OyAvLyBkbyBub3QgdXNlIHJlZmVyZW5jZVxuICAgIH1cbiAgICBpZiAob3B0aW9ucy5rZXlTZXBhcmF0b3IgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5vcHRpb25zLnVzZXJEZWZpbmVkS2V5U2VwYXJhdG9yID0gb3B0aW9ucy5rZXlTZXBhcmF0b3I7XG4gICAgfVxuICAgIGlmIChvcHRpb25zLm5zU2VwYXJhdG9yICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMub3B0aW9ucy51c2VyRGVmaW5lZE5zU2VwYXJhdG9yID0gb3B0aW9ucy5uc1NlcGFyYXRvcjtcbiAgICB9XG5cbiAgICBjb25zdCBjcmVhdGVDbGFzc09uRGVtYW5kID0gKENsYXNzT3JPYmplY3QpID0+IHtcbiAgICAgIGlmICghQ2xhc3NPck9iamVjdCkgcmV0dXJuIG51bGw7XG4gICAgICBpZiAodHlwZW9mIENsYXNzT3JPYmplY3QgPT09ICdmdW5jdGlvbicpIHJldHVybiBuZXcgQ2xhc3NPck9iamVjdCgpO1xuICAgICAgcmV0dXJuIENsYXNzT3JPYmplY3Q7XG4gICAgfVxuXG4gICAgLy8gaW5pdCBzZXJ2aWNlc1xuICAgIGlmICghdGhpcy5vcHRpb25zLmlzQ2xvbmUpIHtcbiAgICAgIGlmICh0aGlzLm1vZHVsZXMubG9nZ2VyKSB7XG4gICAgICAgIGJhc2VMb2dnZXIuaW5pdChjcmVhdGVDbGFzc09uRGVtYW5kKHRoaXMubW9kdWxlcy5sb2dnZXIpLCB0aGlzLm9wdGlvbnMpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYmFzZUxvZ2dlci5pbml0KG51bGwsIHRoaXMub3B0aW9ucyk7XG4gICAgICB9XG5cbiAgICAgIGxldCBmb3JtYXR0ZXI7XG4gICAgICBpZiAodGhpcy5tb2R1bGVzLmZvcm1hdHRlcikge1xuICAgICAgICBmb3JtYXR0ZXIgPSB0aGlzLm1vZHVsZXMuZm9ybWF0dGVyO1xuICAgICAgfSBlbHNlIGlmICh0eXBlb2YgSW50bCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgZm9ybWF0dGVyID0gRm9ybWF0dGVyO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBsdSA9IG5ldyBMYW5ndWFnZVV0aWxzKHRoaXMub3B0aW9ucyk7XG4gICAgICB0aGlzLnN0b3JlID0gbmV3IFJlc291cmNlU3RvcmUodGhpcy5vcHRpb25zLnJlc291cmNlcywgdGhpcy5vcHRpb25zKTtcblxuICAgICAgY29uc3QgcyA9IHRoaXMuc2VydmljZXM7XG4gICAgICBzLmxvZ2dlciA9IGJhc2VMb2dnZXI7XG4gICAgICBzLnJlc291cmNlU3RvcmUgPSB0aGlzLnN0b3JlO1xuICAgICAgcy5sYW5ndWFnZVV0aWxzID0gbHU7XG4gICAgICBzLnBsdXJhbFJlc29sdmVyID0gbmV3IFBsdXJhbFJlc29sdmVyKGx1LCB7XG4gICAgICAgIHByZXBlbmQ6IHRoaXMub3B0aW9ucy5wbHVyYWxTZXBhcmF0b3IsXG4gICAgICAgIGNvbXBhdGliaWxpdHlKU09OOiB0aGlzLm9wdGlvbnMuY29tcGF0aWJpbGl0eUpTT04sXG4gICAgICAgIHNpbXBsaWZ5UGx1cmFsU3VmZml4OiB0aGlzLm9wdGlvbnMuc2ltcGxpZnlQbHVyYWxTdWZmaXgsXG4gICAgICB9KTtcblxuICAgICAgaWYgKGZvcm1hdHRlciAmJiAoIXRoaXMub3B0aW9ucy5pbnRlcnBvbGF0aW9uLmZvcm1hdCB8fCB0aGlzLm9wdGlvbnMuaW50ZXJwb2xhdGlvbi5mb3JtYXQgPT09IGRlZk9wdHMuaW50ZXJwb2xhdGlvbi5mb3JtYXQpKSB7XG4gICAgICAgIHMuZm9ybWF0dGVyID0gY3JlYXRlQ2xhc3NPbkRlbWFuZChmb3JtYXR0ZXIpO1xuICAgICAgICBzLmZvcm1hdHRlci5pbml0KHMsIHRoaXMub3B0aW9ucyk7XG5cbiAgICAgICAgdGhpcy5vcHRpb25zLmludGVycG9sYXRpb24uZm9ybWF0ID0gcy5mb3JtYXR0ZXIuZm9ybWF0LmJpbmQocy5mb3JtYXR0ZXIpO1xuICAgICAgfVxuXG4gICAgICBzLmludGVycG9sYXRvciA9IG5ldyBJbnRlcnBvbGF0b3IodGhpcy5vcHRpb25zKTtcbiAgICAgIHMudXRpbHMgPSB7XG4gICAgICAgIGhhc0xvYWRlZE5hbWVzcGFjZTogdGhpcy5oYXNMb2FkZWROYW1lc3BhY2UuYmluZCh0aGlzKVxuICAgICAgfVxuXG4gICAgICBzLmJhY2tlbmRDb25uZWN0b3IgPSBuZXcgQmFja2VuZENvbm5lY3RvcihcbiAgICAgICAgY3JlYXRlQ2xhc3NPbkRlbWFuZCh0aGlzLm1vZHVsZXMuYmFja2VuZCksXG4gICAgICAgIHMucmVzb3VyY2VTdG9yZSxcbiAgICAgICAgcyxcbiAgICAgICAgdGhpcy5vcHRpb25zLFxuICAgICAgKTtcbiAgICAgIC8vIHBpcGUgZXZlbnRzIGZyb20gYmFja2VuZENvbm5lY3RvclxuICAgICAgcy5iYWNrZW5kQ29ubmVjdG9yLm9uKCcqJywgKGV2ZW50LCAuLi5hcmdzKSA9PiB7XG4gICAgICAgIHRoaXMuZW1pdChldmVudCwgLi4uYXJncyk7XG4gICAgICB9KTtcblxuICAgICAgaWYgKHRoaXMubW9kdWxlcy5sYW5ndWFnZURldGVjdG9yKSB7XG4gICAgICAgIHMubGFuZ3VhZ2VEZXRlY3RvciA9IGNyZWF0ZUNsYXNzT25EZW1hbmQodGhpcy5tb2R1bGVzLmxhbmd1YWdlRGV0ZWN0b3IpO1xuICAgICAgICBpZiAocy5sYW5ndWFnZURldGVjdG9yLmluaXQpIHMubGFuZ3VhZ2VEZXRlY3Rvci5pbml0KHMsIHRoaXMub3B0aW9ucy5kZXRlY3Rpb24sIHRoaXMub3B0aW9ucyk7XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLm1vZHVsZXMuaTE4bkZvcm1hdCkge1xuICAgICAgICBzLmkxOG5Gb3JtYXQgPSBjcmVhdGVDbGFzc09uRGVtYW5kKHRoaXMubW9kdWxlcy5pMThuRm9ybWF0KTtcbiAgICAgICAgaWYgKHMuaTE4bkZvcm1hdC5pbml0KSBzLmkxOG5Gb3JtYXQuaW5pdCh0aGlzKTtcbiAgICAgIH1cblxuICAgICAgdGhpcy50cmFuc2xhdG9yID0gbmV3IFRyYW5zbGF0b3IodGhpcy5zZXJ2aWNlcywgdGhpcy5vcHRpb25zKTtcbiAgICAgIC8vIHBpcGUgZXZlbnRzIGZyb20gdHJhbnNsYXRvclxuICAgICAgdGhpcy50cmFuc2xhdG9yLm9uKCcqJywgKGV2ZW50LCAuLi5hcmdzKSA9PiB7XG4gICAgICAgIHRoaXMuZW1pdChldmVudCwgLi4uYXJncyk7XG4gICAgICB9KTtcblxuICAgICAgdGhpcy5tb2R1bGVzLmV4dGVybmFsLmZvckVhY2gobSA9PiB7XG4gICAgICAgIGlmIChtLmluaXQpIG0uaW5pdCh0aGlzKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHRoaXMuZm9ybWF0ID0gdGhpcy5vcHRpb25zLmludGVycG9sYXRpb24uZm9ybWF0O1xuICAgIGlmICghY2FsbGJhY2spIGNhbGxiYWNrID0gbm9vcDtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMuZmFsbGJhY2tMbmcgJiYgIXRoaXMuc2VydmljZXMubGFuZ3VhZ2VEZXRlY3RvciAmJiAhdGhpcy5vcHRpb25zLmxuZykge1xuICAgICAgY29uc3QgY29kZXMgPSB0aGlzLnNlcnZpY2VzLmxhbmd1YWdlVXRpbHMuZ2V0RmFsbGJhY2tDb2Rlcyh0aGlzLm9wdGlvbnMuZmFsbGJhY2tMbmcpXG4gICAgICBpZiAoY29kZXMubGVuZ3RoID4gMCAmJiBjb2Rlc1swXSAhPT0gJ2RldicpIHRoaXMub3B0aW9ucy5sbmcgPSBjb2Rlc1swXVxuICAgIH1cbiAgICBpZiAoIXRoaXMuc2VydmljZXMubGFuZ3VhZ2VEZXRlY3RvciAmJiAhdGhpcy5vcHRpb25zLmxuZykge1xuICAgICAgdGhpcy5sb2dnZXIud2FybignaW5pdDogbm8gbGFuZ3VhZ2VEZXRlY3RvciBpcyB1c2VkIGFuZCBubyBsbmcgaXMgZGVmaW5lZCcpO1xuICAgIH1cblxuICAgIC8vIGFwcGVuZCBhcGlcbiAgICBjb25zdCBzdG9yZUFwaSA9IFtcbiAgICAgICdnZXRSZXNvdXJjZScsXG4gICAgICAnaGFzUmVzb3VyY2VCdW5kbGUnLFxuICAgICAgJ2dldFJlc291cmNlQnVuZGxlJyxcbiAgICAgICdnZXREYXRhQnlMYW5ndWFnZScsXG4gICAgXTtcbiAgICBzdG9yZUFwaS5mb3JFYWNoKGZjTmFtZSA9PiB7XG4gICAgICB0aGlzW2ZjTmFtZV0gPSAoLi4uYXJncykgPT4gdGhpcy5zdG9yZVtmY05hbWVdKC4uLmFyZ3MpO1xuICAgIH0pO1xuICAgIGNvbnN0IHN0b3JlQXBpQ2hhaW5lZCA9IFtcbiAgICAgICdhZGRSZXNvdXJjZScsXG4gICAgICAnYWRkUmVzb3VyY2VzJyxcbiAgICAgICdhZGRSZXNvdXJjZUJ1bmRsZScsXG4gICAgICAncmVtb3ZlUmVzb3VyY2VCdW5kbGUnLFxuICAgIF07XG4gICAgc3RvcmVBcGlDaGFpbmVkLmZvckVhY2goZmNOYW1lID0+IHtcbiAgICAgIHRoaXNbZmNOYW1lXSA9ICguLi5hcmdzKSA9PiB7XG4gICAgICAgIHRoaXMuc3RvcmVbZmNOYW1lXSguLi5hcmdzKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICB9O1xuICAgIH0pO1xuXG4gICAgY29uc3QgZGVmZXJyZWQgPSBkZWZlcigpO1xuXG4gICAgY29uc3QgbG9hZCA9ICgpID0+IHtcbiAgICAgIGNvbnN0IGZpbmlzaCA9IChlcnIsIHQpID0+IHtcbiAgICAgICAgdGhpcy5pc0luaXRpYWxpemluZyA9IGZhbHNlO1xuICAgICAgICBpZiAodGhpcy5pc0luaXRpYWxpemVkICYmICF0aGlzLmluaXRpYWxpemVkU3RvcmVPbmNlKSB0aGlzLmxvZ2dlci53YXJuKCdpbml0OiBpMThuZXh0IGlzIGFscmVhZHkgaW5pdGlhbGl6ZWQuIFlvdSBzaG91bGQgY2FsbCBpbml0IGp1c3Qgb25jZSEnKTtcbiAgICAgICAgdGhpcy5pc0luaXRpYWxpemVkID0gdHJ1ZTtcbiAgICAgICAgaWYgKCF0aGlzLm9wdGlvbnMuaXNDbG9uZSkgdGhpcy5sb2dnZXIubG9nKCdpbml0aWFsaXplZCcsIHRoaXMub3B0aW9ucyk7XG4gICAgICAgIHRoaXMuZW1pdCgnaW5pdGlhbGl6ZWQnLCB0aGlzLm9wdGlvbnMpO1xuXG4gICAgICAgIGRlZmVycmVkLnJlc29sdmUodCk7IC8vIG5vdCByZWplY3Rpbmcgb24gZXJyIChhcyBlcnIgaXMgb25seSBhIGxvYWRpbmcgdHJhbnNsYXRpb24gZmFpbGVkIHdhcm5pbmcpXG4gICAgICAgIGNhbGxiYWNrKGVyciwgdCk7XG4gICAgICB9O1xuICAgICAgLy8gZml4IGZvciB1c2UgY2FzZXMgd2hlbiBjYWxsaW5nIGNoYW5nZUxhbmd1YWdlIGJlZm9yZSBmaW5pc2hlZCB0byBpbml0aWFsaXplZCAoaS5lLiBodHRwczovL2dpdGh1Yi5jb20vaTE4bmV4dC9pMThuZXh0L2lzc3Vlcy8xNTUyKVxuICAgICAgaWYgKHRoaXMubGFuZ3VhZ2VzICYmIHRoaXMub3B0aW9ucy5jb21wYXRpYmlsaXR5QVBJICE9PSAndjEnICYmICF0aGlzLmlzSW5pdGlhbGl6ZWQpIHJldHVybiBmaW5pc2gobnVsbCwgdGhpcy50LmJpbmQodGhpcykpO1xuICAgICAgdGhpcy5jaGFuZ2VMYW5ndWFnZSh0aGlzLm9wdGlvbnMubG5nLCBmaW5pc2gpO1xuICAgIH07XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLnJlc291cmNlcyB8fCAhdGhpcy5vcHRpb25zLmluaXRJbW1lZGlhdGUpIHtcbiAgICAgIGxvYWQoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgc2V0VGltZW91dChsb2FkLCAwKTtcbiAgICB9XG5cbiAgICByZXR1cm4gZGVmZXJyZWQ7XG4gIH1cblxuICAvKiBlc2xpbnQgY29uc2lzdGVudC1yZXR1cm46IDAgKi9cbiAgbG9hZFJlc291cmNlcyhsYW5ndWFnZSwgY2FsbGJhY2sgPSBub29wKSB7XG4gICAgbGV0IHVzZWRDYWxsYmFjayA9IGNhbGxiYWNrO1xuICAgIGNvbnN0IHVzZWRMbmcgPSB0eXBlb2YgbGFuZ3VhZ2UgPT09ICdzdHJpbmcnID8gbGFuZ3VhZ2UgOiB0aGlzLmxhbmd1YWdlO1xuICAgIGlmICh0eXBlb2YgbGFuZ3VhZ2UgPT09ICdmdW5jdGlvbicpIHVzZWRDYWxsYmFjayA9IGxhbmd1YWdlO1xuXG4gICAgaWYgKCF0aGlzLm9wdGlvbnMucmVzb3VyY2VzIHx8IHRoaXMub3B0aW9ucy5wYXJ0aWFsQnVuZGxlZExhbmd1YWdlcykge1xuICAgICAgaWYgKHVzZWRMbmcgJiYgdXNlZExuZy50b0xvd2VyQ2FzZSgpID09PSAnY2ltb2RlJyAmJiAoIXRoaXMub3B0aW9ucy5wcmVsb2FkIHx8IHRoaXMub3B0aW9ucy5wcmVsb2FkLmxlbmd0aCA9PT0gMCkpIHJldHVybiB1c2VkQ2FsbGJhY2soKTsgLy8gYXZvaWQgbG9hZGluZyByZXNvdXJjZXMgZm9yIGNpbW9kZVxuXG4gICAgICBjb25zdCB0b0xvYWQgPSBbXTtcblxuICAgICAgY29uc3QgYXBwZW5kID0gbG5nID0+IHtcbiAgICAgICAgaWYgKCFsbmcpIHJldHVybjtcbiAgICAgICAgaWYgKGxuZyA9PT0gJ2NpbW9kZScpIHJldHVybjtcbiAgICAgICAgY29uc3QgbG5ncyA9IHRoaXMuc2VydmljZXMubGFuZ3VhZ2VVdGlscy50b1Jlc29sdmVIaWVyYXJjaHkobG5nKTtcbiAgICAgICAgbG5ncy5mb3JFYWNoKGwgPT4ge1xuICAgICAgICAgIGlmIChsID09PSAnY2ltb2RlJykgcmV0dXJuO1xuICAgICAgICAgIGlmICh0b0xvYWQuaW5kZXhPZihsKSA8IDApIHRvTG9hZC5wdXNoKGwpO1xuICAgICAgICB9KTtcbiAgICAgIH07XG5cbiAgICAgIGlmICghdXNlZExuZykge1xuICAgICAgICAvLyBhdCBsZWFzdCBsb2FkIGZhbGxiYWNrcyBpbiB0aGlzIGNhc2VcbiAgICAgICAgY29uc3QgZmFsbGJhY2tzID0gdGhpcy5zZXJ2aWNlcy5sYW5ndWFnZVV0aWxzLmdldEZhbGxiYWNrQ29kZXModGhpcy5vcHRpb25zLmZhbGxiYWNrTG5nKTtcbiAgICAgICAgZmFsbGJhY2tzLmZvckVhY2gobCA9PiBhcHBlbmQobCkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYXBwZW5kKHVzZWRMbmcpO1xuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5vcHRpb25zLnByZWxvYWQpIHtcbiAgICAgICAgdGhpcy5vcHRpb25zLnByZWxvYWQuZm9yRWFjaChsID0+IGFwcGVuZChsKSk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMuc2VydmljZXMuYmFja2VuZENvbm5lY3Rvci5sb2FkKHRvTG9hZCwgdGhpcy5vcHRpb25zLm5zLCAoZSkgPT4ge1xuICAgICAgICBpZiAoIWUgJiYgIXRoaXMucmVzb2x2ZWRMYW5ndWFnZSAmJiB0aGlzLmxhbmd1YWdlKSB0aGlzLnNldFJlc29sdmVkTGFuZ3VhZ2UodGhpcy5sYW5ndWFnZSk7XG4gICAgICAgIHVzZWRDYWxsYmFjayhlKTtcbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICB1c2VkQ2FsbGJhY2sobnVsbCk7XG4gICAgfVxuICB9XG5cbiAgcmVsb2FkUmVzb3VyY2VzKGxuZ3MsIG5zLCBjYWxsYmFjaykge1xuICAgIGNvbnN0IGRlZmVycmVkID0gZGVmZXIoKTtcbiAgICBpZiAoIWxuZ3MpIGxuZ3MgPSB0aGlzLmxhbmd1YWdlcztcbiAgICBpZiAoIW5zKSBucyA9IHRoaXMub3B0aW9ucy5ucztcbiAgICBpZiAoIWNhbGxiYWNrKSBjYWxsYmFjayA9IG5vb3A7XG4gICAgdGhpcy5zZXJ2aWNlcy5iYWNrZW5kQ29ubmVjdG9yLnJlbG9hZChsbmdzLCBucywgZXJyID0+IHtcbiAgICAgIGRlZmVycmVkLnJlc29sdmUoKTsgLy8gbm90IHJlamVjdGluZyBvbiBlcnIgKGFzIGVyciBpcyBvbmx5IGEgbG9hZGluZyB0cmFuc2xhdGlvbiBmYWlsZWQgd2FybmluZylcbiAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgfSk7XG4gICAgcmV0dXJuIGRlZmVycmVkO1xuICB9XG5cbiAgdXNlKG1vZHVsZSkge1xuICAgIGlmICghbW9kdWxlKSB0aHJvdyBuZXcgRXJyb3IoJ1lvdSBhcmUgcGFzc2luZyBhbiB1bmRlZmluZWQgbW9kdWxlISBQbGVhc2UgY2hlY2sgdGhlIG9iamVjdCB5b3UgYXJlIHBhc3NpbmcgdG8gaTE4bmV4dC51c2UoKScpXG4gICAgaWYgKCFtb2R1bGUudHlwZSkgdGhyb3cgbmV3IEVycm9yKCdZb3UgYXJlIHBhc3NpbmcgYSB3cm9uZyBtb2R1bGUhIFBsZWFzZSBjaGVjayB0aGUgb2JqZWN0IHlvdSBhcmUgcGFzc2luZyB0byBpMThuZXh0LnVzZSgpJylcblxuICAgIGlmIChtb2R1bGUudHlwZSA9PT0gJ2JhY2tlbmQnKSB7XG4gICAgICB0aGlzLm1vZHVsZXMuYmFja2VuZCA9IG1vZHVsZTtcbiAgICB9XG5cbiAgICBpZiAobW9kdWxlLnR5cGUgPT09ICdsb2dnZXInIHx8IChtb2R1bGUubG9nICYmIG1vZHVsZS53YXJuICYmIG1vZHVsZS5lcnJvcikpIHtcbiAgICAgIHRoaXMubW9kdWxlcy5sb2dnZXIgPSBtb2R1bGU7XG4gICAgfVxuXG4gICAgaWYgKG1vZHVsZS50eXBlID09PSAnbGFuZ3VhZ2VEZXRlY3RvcicpIHtcbiAgICAgIHRoaXMubW9kdWxlcy5sYW5ndWFnZURldGVjdG9yID0gbW9kdWxlO1xuICAgIH1cblxuICAgIGlmIChtb2R1bGUudHlwZSA9PT0gJ2kxOG5Gb3JtYXQnKSB7XG4gICAgICB0aGlzLm1vZHVsZXMuaTE4bkZvcm1hdCA9IG1vZHVsZTtcbiAgICB9XG5cbiAgICBpZiAobW9kdWxlLnR5cGUgPT09ICdwb3N0UHJvY2Vzc29yJykge1xuICAgICAgcG9zdFByb2Nlc3Nvci5hZGRQb3N0UHJvY2Vzc29yKG1vZHVsZSk7XG4gICAgfVxuXG4gICAgaWYgKG1vZHVsZS50eXBlID09PSAnZm9ybWF0dGVyJykge1xuICAgICAgdGhpcy5tb2R1bGVzLmZvcm1hdHRlciA9IG1vZHVsZTtcbiAgICB9XG5cbiAgICBpZiAobW9kdWxlLnR5cGUgPT09ICczcmRQYXJ0eScpIHtcbiAgICAgIHRoaXMubW9kdWxlcy5leHRlcm5hbC5wdXNoKG1vZHVsZSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBzZXRSZXNvbHZlZExhbmd1YWdlKGwpIHtcbiAgICBpZiAoIWwgfHwgIXRoaXMubGFuZ3VhZ2VzKSByZXR1cm47XG4gICAgaWYgKFsnY2ltb2RlJywgJ2RldiddLmluZGV4T2YobCkgPiAtMSkgcmV0dXJuO1xuICAgIGZvciAobGV0IGxpID0gMDsgbGkgPCB0aGlzLmxhbmd1YWdlcy5sZW5ndGg7IGxpKyspIHtcbiAgICAgIGNvbnN0IGxuZ0luTG5ncyA9IHRoaXMubGFuZ3VhZ2VzW2xpXTtcbiAgICAgIGlmIChbJ2NpbW9kZScsICdkZXYnXS5pbmRleE9mKGxuZ0luTG5ncykgPiAtMSkgY29udGludWU7XG4gICAgICBpZiAodGhpcy5zdG9yZS5oYXNMYW5ndWFnZVNvbWVUcmFuc2xhdGlvbnMobG5nSW5MbmdzKSkge1xuICAgICAgICB0aGlzLnJlc29sdmVkTGFuZ3VhZ2UgPSBsbmdJbkxuZ3M7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGNoYW5nZUxhbmd1YWdlKGxuZywgY2FsbGJhY2spIHtcbiAgICB0aGlzLmlzTGFuZ3VhZ2VDaGFuZ2luZ1RvID0gbG5nO1xuICAgIGNvbnN0IGRlZmVycmVkID0gZGVmZXIoKTtcbiAgICB0aGlzLmVtaXQoJ2xhbmd1YWdlQ2hhbmdpbmcnLCBsbmcpO1xuXG4gICAgY29uc3Qgc2V0TG5nUHJvcHMgPSAobCkgPT4ge1xuICAgICAgdGhpcy5sYW5ndWFnZSA9IGw7XG4gICAgICB0aGlzLmxhbmd1YWdlcyA9IHRoaXMuc2VydmljZXMubGFuZ3VhZ2VVdGlscy50b1Jlc29sdmVIaWVyYXJjaHkobCk7XG4gICAgICAvLyBmaW5kIHRoZSBmaXJzdCBsYW5ndWFnZSByZXNvbHZlZCBsYW5ndWFnZVxuICAgICAgdGhpcy5yZXNvbHZlZExhbmd1YWdlID0gdW5kZWZpbmVkO1xuICAgICAgdGhpcy5zZXRSZXNvbHZlZExhbmd1YWdlKGwpO1xuICAgIH07XG5cbiAgICBjb25zdCBkb25lID0gKGVyciwgbCkgPT4ge1xuICAgICAgaWYgKGwpIHtcbiAgICAgICAgc2V0TG5nUHJvcHMobCk7XG4gICAgICAgIHRoaXMudHJhbnNsYXRvci5jaGFuZ2VMYW5ndWFnZShsKTtcbiAgICAgICAgdGhpcy5pc0xhbmd1YWdlQ2hhbmdpbmdUbyA9IHVuZGVmaW5lZDtcbiAgICAgICAgdGhpcy5lbWl0KCdsYW5ndWFnZUNoYW5nZWQnLCBsKTtcbiAgICAgICAgdGhpcy5sb2dnZXIubG9nKCdsYW5ndWFnZUNoYW5nZWQnLCBsKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuaXNMYW5ndWFnZUNoYW5naW5nVG8gPSB1bmRlZmluZWQ7XG4gICAgICB9XG5cbiAgICAgIGRlZmVycmVkLnJlc29sdmUoKC4uLmFyZ3MpID0+IHRoaXMudCguLi5hcmdzKSk7XG4gICAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrKGVyciwgKC4uLmFyZ3MpID0+IHRoaXMudCguLi5hcmdzKSk7XG4gICAgfTtcblxuICAgIGNvbnN0IHNldExuZyA9IGxuZ3MgPT4ge1xuICAgICAgLy8gaWYgZGV0ZWN0ZWQgbG5nIGlzIGZhbHN5LCBzZXQgaXQgdG8gZW1wdHkgYXJyYXksIHRvIG1ha2Ugc3VyZSBhdCBsZWFzdCB0aGUgZmFsbGJhY2tMbmcgd2lsbCBiZSB1c2VkXG4gICAgICBpZiAoIWxuZyAmJiAhbG5ncyAmJiB0aGlzLnNlcnZpY2VzLmxhbmd1YWdlRGV0ZWN0b3IpIGxuZ3MgPSBbXTtcbiAgICAgIC8vIGRlcGVuZGluZyBvbiBBUEkgaW4gZGV0ZWN0b3IgbG5nIGNhbiBiZSBhIHN0cmluZyAob2xkKSBvciBhbiBhcnJheSBvZiBsYW5ndWFnZXMgb3JkZXJlZCBpbiBwcmlvcml0eVxuICAgICAgY29uc3QgbCA9IHR5cGVvZiBsbmdzID09PSAnc3RyaW5nJyA/IGxuZ3MgOiB0aGlzLnNlcnZpY2VzLmxhbmd1YWdlVXRpbHMuZ2V0QmVzdE1hdGNoRnJvbUNvZGVzKGxuZ3MpO1xuXG4gICAgICBpZiAobCkge1xuICAgICAgICBpZiAoIXRoaXMubGFuZ3VhZ2UpIHtcbiAgICAgICAgICBzZXRMbmdQcm9wcyhsKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXRoaXMudHJhbnNsYXRvci5sYW5ndWFnZSkgdGhpcy50cmFuc2xhdG9yLmNoYW5nZUxhbmd1YWdlKGwpO1xuXG4gICAgICAgIGlmICh0aGlzLnNlcnZpY2VzLmxhbmd1YWdlRGV0ZWN0b3IgJiYgdGhpcy5zZXJ2aWNlcy5sYW5ndWFnZURldGVjdG9yLmNhY2hlVXNlckxhbmd1YWdlKSB0aGlzLnNlcnZpY2VzLmxhbmd1YWdlRGV0ZWN0b3IuY2FjaGVVc2VyTGFuZ3VhZ2UobCk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMubG9hZFJlc291cmNlcyhsLCBlcnIgPT4ge1xuICAgICAgICBkb25lKGVyciwgbCk7XG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgaWYgKCFsbmcgJiYgdGhpcy5zZXJ2aWNlcy5sYW5ndWFnZURldGVjdG9yICYmICF0aGlzLnNlcnZpY2VzLmxhbmd1YWdlRGV0ZWN0b3IuYXN5bmMpIHtcbiAgICAgIHNldExuZyh0aGlzLnNlcnZpY2VzLmxhbmd1YWdlRGV0ZWN0b3IuZGV0ZWN0KCkpO1xuICAgIH0gZWxzZSBpZiAoIWxuZyAmJiB0aGlzLnNlcnZpY2VzLmxhbmd1YWdlRGV0ZWN0b3IgJiYgdGhpcy5zZXJ2aWNlcy5sYW5ndWFnZURldGVjdG9yLmFzeW5jKSB7XG4gICAgICBpZiAodGhpcy5zZXJ2aWNlcy5sYW5ndWFnZURldGVjdG9yLmRldGVjdC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgdGhpcy5zZXJ2aWNlcy5sYW5ndWFnZURldGVjdG9yLmRldGVjdCgpLnRoZW4oc2V0TG5nKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuc2VydmljZXMubGFuZ3VhZ2VEZXRlY3Rvci5kZXRlY3Qoc2V0TG5nKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgc2V0TG5nKGxuZyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGRlZmVycmVkO1xuICB9XG5cbiAgZ2V0Rml4ZWRUKGxuZywgbnMsIGtleVByZWZpeCkge1xuICAgIGNvbnN0IGZpeGVkVCA9IChrZXksIG9wdHMsIC4uLnJlc3QpID0+IHtcbiAgICAgIGxldCBvcHRpb25zO1xuICAgICAgaWYgKHR5cGVvZiBvcHRzICE9PSAnb2JqZWN0Jykge1xuICAgICAgICBvcHRpb25zID0gdGhpcy5vcHRpb25zLm92ZXJsb2FkVHJhbnNsYXRpb25PcHRpb25IYW5kbGVyKFtrZXksIG9wdHNdLmNvbmNhdChyZXN0KSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvcHRpb25zID0geyAuLi5vcHRzIH07XG4gICAgICB9XG5cbiAgICAgIG9wdGlvbnMubG5nID0gb3B0aW9ucy5sbmcgfHwgZml4ZWRULmxuZztcbiAgICAgIG9wdGlvbnMubG5ncyA9IG9wdGlvbnMubG5ncyB8fCBmaXhlZFQubG5ncztcbiAgICAgIG9wdGlvbnMubnMgPSBvcHRpb25zLm5zIHx8IGZpeGVkVC5ucztcbiAgICAgIGlmIChvcHRpb25zLmtleVByZWZpeCAhPT0gJycpIG9wdGlvbnMua2V5UHJlZml4ID0gb3B0aW9ucy5rZXlQcmVmaXggfHwga2V5UHJlZml4IHx8IGZpeGVkVC5rZXlQcmVmaXg7XG5cbiAgICAgIGNvbnN0IGtleVNlcGFyYXRvciA9IHRoaXMub3B0aW9ucy5rZXlTZXBhcmF0b3IgfHwgJy4nO1xuICAgICAgbGV0IHJlc3VsdEtleVxuICAgICAgaWYgKG9wdGlvbnMua2V5UHJlZml4ICYmIEFycmF5LmlzQXJyYXkoa2V5KSkge1xuICAgICAgICByZXN1bHRLZXkgPSBrZXkubWFwKGsgPT4gYCR7b3B0aW9ucy5rZXlQcmVmaXh9JHtrZXlTZXBhcmF0b3J9JHtrfWApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzdWx0S2V5ID0gb3B0aW9ucy5rZXlQcmVmaXggPyBgJHtvcHRpb25zLmtleVByZWZpeH0ke2tleVNlcGFyYXRvcn0ke2tleX1gIDoga2V5O1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXMudChyZXN1bHRLZXksIG9wdGlvbnMpO1xuICAgIH07XG4gICAgaWYgKHR5cGVvZiBsbmcgPT09ICdzdHJpbmcnKSB7XG4gICAgICBmaXhlZFQubG5nID0gbG5nO1xuICAgIH0gZWxzZSB7XG4gICAgICBmaXhlZFQubG5ncyA9IGxuZztcbiAgICB9XG4gICAgZml4ZWRULm5zID0gbnM7XG4gICAgZml4ZWRULmtleVByZWZpeCA9IGtleVByZWZpeDtcbiAgICByZXR1cm4gZml4ZWRUO1xuICB9XG5cbiAgdCguLi5hcmdzKSB7XG4gICAgcmV0dXJuIHRoaXMudHJhbnNsYXRvciAmJiB0aGlzLnRyYW5zbGF0b3IudHJhbnNsYXRlKC4uLmFyZ3MpO1xuICB9XG5cbiAgZXhpc3RzKC4uLmFyZ3MpIHtcbiAgICByZXR1cm4gdGhpcy50cmFuc2xhdG9yICYmIHRoaXMudHJhbnNsYXRvci5leGlzdHMoLi4uYXJncyk7XG4gIH1cblxuICBzZXREZWZhdWx0TmFtZXNwYWNlKG5zKSB7XG4gICAgdGhpcy5vcHRpb25zLmRlZmF1bHROUyA9IG5zO1xuICB9XG5cbiAgaGFzTG9hZGVkTmFtZXNwYWNlKG5zLCBvcHRpb25zID0ge30pIHtcbiAgICBpZiAoIXRoaXMuaXNJbml0aWFsaXplZCkge1xuICAgICAgdGhpcy5sb2dnZXIud2FybignaGFzTG9hZGVkTmFtZXNwYWNlOiBpMThuZXh0IHdhcyBub3QgaW5pdGlhbGl6ZWQnLCB0aGlzLmxhbmd1YWdlcyk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGlmICghdGhpcy5sYW5ndWFnZXMgfHwgIXRoaXMubGFuZ3VhZ2VzLmxlbmd0aCkge1xuICAgICAgdGhpcy5sb2dnZXIud2FybignaGFzTG9hZGVkTmFtZXNwYWNlOiBpMThuLmxhbmd1YWdlcyB3ZXJlIHVuZGVmaW5lZCBvciBlbXB0eScsIHRoaXMubGFuZ3VhZ2VzKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBjb25zdCBsbmcgPSBvcHRpb25zLmxuZyB8fCB0aGlzLnJlc29sdmVkTGFuZ3VhZ2UgfHwgdGhpcy5sYW5ndWFnZXNbMF07XG4gICAgY29uc3QgZmFsbGJhY2tMbmcgPSB0aGlzLm9wdGlvbnMgPyB0aGlzLm9wdGlvbnMuZmFsbGJhY2tMbmcgOiBmYWxzZTtcbiAgICBjb25zdCBsYXN0TG5nID0gdGhpcy5sYW5ndWFnZXNbdGhpcy5sYW5ndWFnZXMubGVuZ3RoIC0gMV07XG5cbiAgICAvLyB3ZSdyZSBpbiBjaW1vZGUgc28gdGhpcyBzaGFsbCBwYXNzXG4gICAgaWYgKGxuZy50b0xvd2VyQ2FzZSgpID09PSAnY2ltb2RlJykgcmV0dXJuIHRydWU7XG5cbiAgICBjb25zdCBsb2FkTm90UGVuZGluZyA9IChsLCBuKSA9PiB7XG4gICAgICBjb25zdCBsb2FkU3RhdGUgPSB0aGlzLnNlcnZpY2VzLmJhY2tlbmRDb25uZWN0b3Iuc3RhdGVbYCR7bH18JHtufWBdO1xuICAgICAgcmV0dXJuIGxvYWRTdGF0ZSA9PT0gLTEgfHwgbG9hZFN0YXRlID09PSAyO1xuICAgIH07XG5cbiAgICAvLyBvcHRpb25hbCBpbmplY3RlZCBjaGVja1xuICAgIGlmIChvcHRpb25zLnByZWNoZWNrKSB7XG4gICAgICBjb25zdCBwcmVSZXN1bHQgPSBvcHRpb25zLnByZWNoZWNrKHRoaXMsIGxvYWROb3RQZW5kaW5nKTtcbiAgICAgIGlmIChwcmVSZXN1bHQgIT09IHVuZGVmaW5lZCkgcmV0dXJuIHByZVJlc3VsdDtcbiAgICB9XG5cbiAgICAvLyBsb2FkZWQgLT4gU1VDQ0VTU1xuICAgIGlmICh0aGlzLmhhc1Jlc291cmNlQnVuZGxlKGxuZywgbnMpKSByZXR1cm4gdHJ1ZTtcblxuICAgIC8vIHdlcmUgbm90IGxvYWRpbmcgYXQgYWxsIC0+IFNFTUkgU1VDQ0VTU1xuICAgIGlmICghdGhpcy5zZXJ2aWNlcy5iYWNrZW5kQ29ubmVjdG9yLmJhY2tlbmQgfHwgKHRoaXMub3B0aW9ucy5yZXNvdXJjZXMgJiYgIXRoaXMub3B0aW9ucy5wYXJ0aWFsQnVuZGxlZExhbmd1YWdlcykpIHJldHVybiB0cnVlO1xuXG4gICAgLy8gZmFpbGVkIGxvYWRpbmcgbnMgLSBidXQgYXQgbGVhc3QgZmFsbGJhY2sgaXMgbm90IHBlbmRpbmcgLT4gU0VNSSBTVUNDRVNTXG4gICAgaWYgKGxvYWROb3RQZW5kaW5nKGxuZywgbnMpICYmICghZmFsbGJhY2tMbmcgfHwgbG9hZE5vdFBlbmRpbmcobGFzdExuZywgbnMpKSkgcmV0dXJuIHRydWU7XG5cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBsb2FkTmFtZXNwYWNlcyhucywgY2FsbGJhY2spIHtcbiAgICBjb25zdCBkZWZlcnJlZCA9IGRlZmVyKCk7XG5cbiAgICBpZiAoIXRoaXMub3B0aW9ucy5ucykge1xuICAgICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjaygpO1xuICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICAgIH1cbiAgICBpZiAodHlwZW9mIG5zID09PSAnc3RyaW5nJykgbnMgPSBbbnNdO1xuXG4gICAgbnMuZm9yRWFjaChuID0+IHtcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMubnMuaW5kZXhPZihuKSA8IDApIHRoaXMub3B0aW9ucy5ucy5wdXNoKG4pO1xuICAgIH0pO1xuXG4gICAgdGhpcy5sb2FkUmVzb3VyY2VzKGVyciA9PiB7XG4gICAgICBkZWZlcnJlZC5yZXNvbHZlKCk7XG4gICAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrKGVycik7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gZGVmZXJyZWQ7XG4gIH1cblxuICBsb2FkTGFuZ3VhZ2VzKGxuZ3MsIGNhbGxiYWNrKSB7XG4gICAgY29uc3QgZGVmZXJyZWQgPSBkZWZlcigpO1xuXG4gICAgaWYgKHR5cGVvZiBsbmdzID09PSAnc3RyaW5nJykgbG5ncyA9IFtsbmdzXTtcbiAgICBjb25zdCBwcmVsb2FkZWQgPSB0aGlzLm9wdGlvbnMucHJlbG9hZCB8fCBbXTtcblxuICAgIGNvbnN0IG5ld0xuZ3MgPSBsbmdzLmZpbHRlcihsbmcgPT4gcHJlbG9hZGVkLmluZGV4T2YobG5nKSA8IDAgJiYgdGhpcy5zZXJ2aWNlcy5sYW5ndWFnZVV0aWxzLmlzU3VwcG9ydGVkQ29kZShsbmcpKTtcbiAgICAvLyBFeGl0IGVhcmx5IGlmIGFsbCBnaXZlbiBsYW5ndWFnZXMgYXJlIGFscmVhZHkgcHJlbG9hZGVkXG4gICAgaWYgKCFuZXdMbmdzLmxlbmd0aCkge1xuICAgICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjaygpO1xuICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICAgIH1cblxuICAgIHRoaXMub3B0aW9ucy5wcmVsb2FkID0gcHJlbG9hZGVkLmNvbmNhdChuZXdMbmdzKTtcbiAgICB0aGlzLmxvYWRSZXNvdXJjZXMoZXJyID0+IHtcbiAgICAgIGRlZmVycmVkLnJlc29sdmUoKTtcbiAgICAgIGlmIChjYWxsYmFjaykgY2FsbGJhY2soZXJyKTtcbiAgICB9KTtcblxuICAgIHJldHVybiBkZWZlcnJlZDtcbiAgfVxuXG4gIGRpcihsbmcpIHtcbiAgICBpZiAoIWxuZykgbG5nID0gdGhpcy5yZXNvbHZlZExhbmd1YWdlIHx8ICh0aGlzLmxhbmd1YWdlcyAmJiB0aGlzLmxhbmd1YWdlcy5sZW5ndGggPiAwID8gdGhpcy5sYW5ndWFnZXNbMF0gOiB0aGlzLmxhbmd1YWdlKTtcbiAgICBpZiAoIWxuZykgcmV0dXJuICdydGwnO1xuXG4gICAgY29uc3QgcnRsTG5ncyA9IFtcbiAgICAgICdhcicsXG4gICAgICAnc2h1JyxcbiAgICAgICdzcXInLFxuICAgICAgJ3NzaCcsXG4gICAgICAneGFhJyxcbiAgICAgICd5aGQnLFxuICAgICAgJ3l1ZCcsXG4gICAgICAnYWFvJyxcbiAgICAgICdhYmgnLFxuICAgICAgJ2FidicsXG4gICAgICAnYWNtJyxcbiAgICAgICdhY3EnLFxuICAgICAgJ2FjdycsXG4gICAgICAnYWN4JyxcbiAgICAgICdhY3knLFxuICAgICAgJ2FkZicsXG4gICAgICAnYWRzJyxcbiAgICAgICdhZWInLFxuICAgICAgJ2FlYycsXG4gICAgICAnYWZiJyxcbiAgICAgICdhanAnLFxuICAgICAgJ2FwYycsXG4gICAgICAnYXBkJyxcbiAgICAgICdhcmInLFxuICAgICAgJ2FycScsXG4gICAgICAnYXJzJyxcbiAgICAgICdhcnknLFxuICAgICAgJ2FyeicsXG4gICAgICAnYXV6JyxcbiAgICAgICdhdmwnLFxuICAgICAgJ2F5aCcsXG4gICAgICAnYXlsJyxcbiAgICAgICdheW4nLFxuICAgICAgJ2F5cCcsXG4gICAgICAnYmJ6JyxcbiAgICAgICdwZ2EnLFxuICAgICAgJ2hlJyxcbiAgICAgICdpdycsXG4gICAgICAncHMnLFxuICAgICAgJ3BidCcsXG4gICAgICAncGJ1JyxcbiAgICAgICdwc3QnLFxuICAgICAgJ3BycCcsXG4gICAgICAncHJkJyxcbiAgICAgICd1ZycsXG4gICAgICAndXInLFxuICAgICAgJ3lkZCcsXG4gICAgICAneWRzJyxcbiAgICAgICd5aWgnLFxuICAgICAgJ2ppJyxcbiAgICAgICd5aScsXG4gICAgICAnaGJvJyxcbiAgICAgICdtZW4nLFxuICAgICAgJ3htbicsXG4gICAgICAnZmEnLFxuICAgICAgJ2pwcicsXG4gICAgICAncGVvJyxcbiAgICAgICdwZXMnLFxuICAgICAgJ3BycycsXG4gICAgICAnZHYnLFxuICAgICAgJ3NhbScsXG4gICAgICAnY2tiJ1xuICAgIF07XG5cbiAgICBjb25zdCBsYW5ndWFnZVV0aWxzID0gKHRoaXMuc2VydmljZXMgJiYgdGhpcy5zZXJ2aWNlcy5sYW5ndWFnZVV0aWxzKSB8fCBuZXcgTGFuZ3VhZ2VVdGlscyhnZXREZWZhdWx0cygpKSAvLyBmb3IgdW5pbml0aWFsaXplZCB1c2FnZVxuXG4gICAgcmV0dXJuIHJ0bExuZ3MuaW5kZXhPZihsYW5ndWFnZVV0aWxzLmdldExhbmd1YWdlUGFydEZyb21Db2RlKGxuZykpID4gLTEgfHwgbG5nLnRvTG93ZXJDYXNlKCkuaW5kZXhPZignLWFyYWInKSA+IDFcbiAgICAgID8gJ3J0bCdcbiAgICAgIDogJ2x0cic7XG4gIH1cblxuICBzdGF0aWMgY3JlYXRlSW5zdGFuY2Uob3B0aW9ucyA9IHt9LCBjYWxsYmFjaykgeyByZXR1cm4gbmV3IEkxOG4ob3B0aW9ucywgY2FsbGJhY2spIH1cblxuICBjbG9uZUluc3RhbmNlKG9wdGlvbnMgPSB7fSwgY2FsbGJhY2sgPSBub29wKSB7XG4gICAgY29uc3QgZm9ya1Jlc291cmNlU3RvcmUgPSBvcHRpb25zLmZvcmtSZXNvdXJjZVN0b3JlO1xuICAgIGlmIChmb3JrUmVzb3VyY2VTdG9yZSkgZGVsZXRlIG9wdGlvbnMuZm9ya1Jlc291cmNlU3RvcmU7XG4gICAgY29uc3QgbWVyZ2VkT3B0aW9ucyA9IHsgLi4udGhpcy5vcHRpb25zLCAuLi5vcHRpb25zLCAuLi57IGlzQ2xvbmU6IHRydWUgfSB9O1xuICAgIGNvbnN0IGNsb25lID0gbmV3IEkxOG4obWVyZ2VkT3B0aW9ucyk7XG4gICAgaWYgKChvcHRpb25zLmRlYnVnICE9PSB1bmRlZmluZWQgfHwgb3B0aW9ucy5wcmVmaXggIT09IHVuZGVmaW5lZCkpIHtcbiAgICAgIGNsb25lLmxvZ2dlciA9IGNsb25lLmxvZ2dlci5jbG9uZShvcHRpb25zKTtcbiAgICB9XG4gICAgY29uc3QgbWVtYmVyc1RvQ29weSA9IFsnc3RvcmUnLCAnc2VydmljZXMnLCAnbGFuZ3VhZ2UnXTtcbiAgICBtZW1iZXJzVG9Db3B5LmZvckVhY2gobSA9PiB7XG4gICAgICBjbG9uZVttXSA9IHRoaXNbbV07XG4gICAgfSk7XG4gICAgY2xvbmUuc2VydmljZXMgPSB7IC4uLnRoaXMuc2VydmljZXMgfTtcbiAgICBjbG9uZS5zZXJ2aWNlcy51dGlscyA9IHtcbiAgICAgIGhhc0xvYWRlZE5hbWVzcGFjZTogY2xvbmUuaGFzTG9hZGVkTmFtZXNwYWNlLmJpbmQoY2xvbmUpXG4gICAgfTtcbiAgICBpZiAoZm9ya1Jlc291cmNlU3RvcmUpIHtcbiAgICAgIGNsb25lLnN0b3JlID0gbmV3IFJlc291cmNlU3RvcmUodGhpcy5zdG9yZS5kYXRhLCBtZXJnZWRPcHRpb25zKTtcbiAgICAgIGNsb25lLnNlcnZpY2VzLnJlc291cmNlU3RvcmUgPSBjbG9uZS5zdG9yZTtcbiAgICB9XG4gICAgY2xvbmUudHJhbnNsYXRvciA9IG5ldyBUcmFuc2xhdG9yKGNsb25lLnNlcnZpY2VzLCBtZXJnZWRPcHRpb25zKTtcbiAgICBjbG9uZS50cmFuc2xhdG9yLm9uKCcqJywgKGV2ZW50LCAuLi5hcmdzKSA9PiB7XG4gICAgICBjbG9uZS5lbWl0KGV2ZW50LCAuLi5hcmdzKTtcbiAgICB9KTtcbiAgICBjbG9uZS5pbml0KG1lcmdlZE9wdGlvbnMsIGNhbGxiYWNrKTtcbiAgICBjbG9uZS50cmFuc2xhdG9yLm9wdGlvbnMgPSBtZXJnZWRPcHRpb25zOyAvLyBzeW5jIG9wdGlvbnNcbiAgICBjbG9uZS50cmFuc2xhdG9yLmJhY2tlbmRDb25uZWN0b3Iuc2VydmljZXMudXRpbHMgPSB7XG4gICAgICBoYXNMb2FkZWROYW1lc3BhY2U6IGNsb25lLmhhc0xvYWRlZE5hbWVzcGFjZS5iaW5kKGNsb25lKVxuICAgIH07XG5cbiAgICByZXR1cm4gY2xvbmU7XG4gIH1cblxuICB0b0pTT04oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIG9wdGlvbnM6IHRoaXMub3B0aW9ucyxcbiAgICAgIHN0b3JlOiB0aGlzLnN0b3JlLFxuICAgICAgbGFuZ3VhZ2U6IHRoaXMubGFuZ3VhZ2UsXG4gICAgICBsYW5ndWFnZXM6IHRoaXMubGFuZ3VhZ2VzLFxuICAgICAgcmVzb2x2ZWRMYW5ndWFnZTogdGhpcy5yZXNvbHZlZExhbmd1YWdlXG4gICAgfTtcbiAgfVxufVxuXG5jb25zdCBpbnN0YW5jZSA9IEkxOG4uY3JlYXRlSW5zdGFuY2UoKTtcbmluc3RhbmNlLmNyZWF0ZUluc3RhbmNlID0gSTE4bi5jcmVhdGVJbnN0YW5jZTtcblxuZXhwb3J0IGRlZmF1bHQgaW5zdGFuY2U7XG4iLCJpbXBvcnQgaTE4bmV4dCBmcm9tICcuL2kxOG5leHQuanMnO1xuXG5leHBvcnQgZGVmYXVsdCBpMThuZXh0O1xuXG5leHBvcnQgY29uc3QgY3JlYXRlSW5zdGFuY2UgPSBpMThuZXh0LmNyZWF0ZUluc3RhbmNlO1xuXG5leHBvcnQgY29uc3QgZGlyID0gaTE4bmV4dC5kaXI7XG5leHBvcnQgY29uc3QgaW5pdCA9IGkxOG5leHQuaW5pdDtcbmV4cG9ydCBjb25zdCBsb2FkUmVzb3VyY2VzID0gaTE4bmV4dC5sb2FkUmVzb3VyY2VzO1xuZXhwb3J0IGNvbnN0IHJlbG9hZFJlc291cmNlcyA9IGkxOG5leHQucmVsb2FkUmVzb3VyY2VzO1xuZXhwb3J0IGNvbnN0IHVzZSA9IGkxOG5leHQudXNlO1xuZXhwb3J0IGNvbnN0IGNoYW5nZUxhbmd1YWdlID0gaTE4bmV4dC5jaGFuZ2VMYW5ndWFnZTtcbmV4cG9ydCBjb25zdCBnZXRGaXhlZFQgPSBpMThuZXh0LmdldEZpeGVkVDtcbmV4cG9ydCBjb25zdCB0ID0gaTE4bmV4dC50O1xuZXhwb3J0IGNvbnN0IGV4aXN0cyA9IGkxOG5leHQuZXhpc3RzO1xuZXhwb3J0IGNvbnN0IHNldERlZmF1bHROYW1lc3BhY2UgPSBpMThuZXh0LnNldERlZmF1bHROYW1lc3BhY2U7XG5leHBvcnQgY29uc3QgaGFzTG9hZGVkTmFtZXNwYWNlID0gaTE4bmV4dC5oYXNMb2FkZWROYW1lc3BhY2U7XG5leHBvcnQgY29uc3QgbG9hZE5hbWVzcGFjZXMgPSBpMThuZXh0LmxvYWROYW1lc3BhY2VzO1xuZXhwb3J0IGNvbnN0IGxvYWRMYW5ndWFnZXMgPSBpMThuZXh0LmxvYWRMYW5ndWFnZXM7XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1uYW1lc3BhY2UsXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueSxcbiAqL1xuXG5pbXBvcnQge1xuICAgIGRlZmF1bHQgYXMgaTE4bmV4dCxcbiAgICBpMThuIGFzIGkxOG5leHRJbnN0YW5jZSxcbiAgICBGYWxsYmFja0xuZ09iakxpc3QgYXMgaTE4bmV4dEZhbGxiYWNrTG5nT2JqTGlzdCxcbiAgICBGYWxsYmFja0xuZyBhcyBpMThuZXh0RmFsbGJhY2tMbmcsXG4gICAgSW50ZXJwb2xhdGlvbk9wdGlvbnMgYXMgaTE4bmV4dEludGVycG9sYXRpb25PcHRpb25zLFxuICAgIFJlYWN0T3B0aW9ucyBhcyBpMThuZXh0UmVhY3RPcHRpb25zLFxuICAgIEluaXRPcHRpb25zIGFzIGkxOG5leHRJbml0T3B0aW9ucyxcbiAgICBUT3B0aW9uc0Jhc2UgYXMgaTE4bmV4dFRPcHRpb25zQmFzZSxcbiAgICBUT3B0aW9ucyBhcyBpMThuZXh0VE9wdGlvbnMsXG4gICAgRXhpc3RzRnVuY3Rpb24gYXMgaTE4bmV4dEV4aXN0c0Z1bmN0aW9uLFxuICAgIFdpdGhUIGFzIGkxOG5leHRXaXRoVCxcbiAgICBURnVuY3Rpb24gYXMgaTE4bmV4dFRGdW5jdGlvbixcbiAgICBSZXNvdXJjZSBhcyBpMThuZXh0UmVzb3VyY2UsXG4gICAgUmVzb3VyY2VMYW5ndWFnZSBhcyBpMThuZXh0UmVzb3VyY2VMYW5ndWFnZSxcbiAgICBSZXNvdXJjZUtleSBhcyBpMThuZXh0UmVzb3VyY2VLZXksXG4gICAgSW50ZXJwb2xhdG9yIGFzIGkxOG5leHRJbnRlcnBvbGF0b3IsXG4gICAgUmVzb3VyY2VTdG9yZSBhcyBpMThuZXh0UmVzb3VyY2VTdG9yZSxcbiAgICBTZXJ2aWNlcyBhcyBpMThuZXh0U2VydmljZXMsXG4gICAgTW9kdWxlIGFzIGkxOG5leHRNb2R1bGUsXG4gICAgQ2FsbGJhY2tFcnJvciBhcyBpMThuZXh0Q2FsbGJhY2tFcnJvcixcbiAgICBSZWFkQ2FsbGJhY2sgYXMgaTE4bmV4dFJlYWRDYWxsYmFjayxcbiAgICBNdWx0aVJlYWRDYWxsYmFjayBhcyBpMThuZXh0TXVsdGlSZWFkQ2FsbGJhY2ssXG4gICAgQmFja2VuZE1vZHVsZSBhcyBpMThuZXh0QmFja2VuZE1vZHVsZSxcbiAgICBMYW5ndWFnZURldGVjdG9yTW9kdWxlIGFzIGkxOG5leHRMYW5ndWFnZURldGVjdG9yTW9kdWxlLFxuICAgIExhbmd1YWdlRGV0ZWN0b3JBc3luY01vZHVsZSBhcyBpMThuZXh0TGFuZ3VhZ2VEZXRlY3RvckFzeW5jTW9kdWxlLFxuICAgIFBvc3RQcm9jZXNzb3JNb2R1bGUgYXMgaTE4bmV4dFBvc3RQcm9jZXNzb3JNb2R1bGUsXG4gICAgTG9nZ2VyTW9kdWxlIGFzIGkxOG5leHRMb2dnZXJNb2R1bGUsXG4gICAgSTE4bkZvcm1hdE1vZHVsZSBhcyBpMThuZXh0STE4bkZvcm1hdE1vZHVsZSxcbiAgICBUaGlyZFBhcnR5TW9kdWxlIGFzIGkxOG5leHRUaGlyZFBhcnR5TW9kdWxlLFxuICAgIE1vZHVsZXMgYXMgaTE4bmV4dE1vZHVsZXMsXG4gICAgTmV3YWJsZSBhcyBpMThuZXh0TmV3YWJsZSxcbn0gZnJvbSAnaTE4bmV4dCc7XG5cbmNvbnN0IGkxOG46IGkxOG4uaTE4biA9IGkxOG5leHQ7XG5cbmRlY2xhcmUgbmFtZXNwYWNlIGkxOG4ge1xuICAgIGV4cG9ydCB0eXBlIGkxOG4gPSBpMThuZXh0SW5zdGFuY2U7XG4gICAgZXhwb3J0IHR5cGUgRmFsbGJhY2tMbmdPYmpMaXN0ID0gaTE4bmV4dEZhbGxiYWNrTG5nT2JqTGlzdDtcbiAgICBleHBvcnQgdHlwZSBGYWxsYmFja0xuZyA9IGkxOG5leHRGYWxsYmFja0xuZztcbiAgICBleHBvcnQgdHlwZSBJbnRlcnBvbGF0aW9uT3B0aW9ucyA9IGkxOG5leHRJbnRlcnBvbGF0aW9uT3B0aW9ucztcbiAgICBleHBvcnQgdHlwZSBSZWFjdE9wdGlvbnMgPSBpMThuZXh0UmVhY3RPcHRpb25zO1xuICAgIGV4cG9ydCB0eXBlIEluaXRPcHRpb25zID0gaTE4bmV4dEluaXRPcHRpb25zO1xuICAgIGV4cG9ydCB0eXBlIFRPcHRpb25zQmFzZSA9IGkxOG5leHRUT3B0aW9uc0Jhc2U7XG4gICAgZXhwb3J0IHR5cGUgVE9wdGlvbnM8VCBleHRlbmRzIFJlY29yZDxzdHJpbmcsIHVua25vd24+ID0gUmVjb3JkPHN0cmluZywgYW55Pj4gPSBpMThuZXh0VE9wdGlvbnM8VD47XG4gICAgZXhwb3J0IHR5cGUgRXhpc3RzRnVuY3Rpb248SyBleHRlbmRzIHN0cmluZyA9IHN0cmluZywgVCBleHRlbmRzIFJlY29yZDxzdHJpbmcsIHVua25vd24+ID0gUmVjb3JkPHN0cmluZywgYW55Pj4gPSBpMThuZXh0RXhpc3RzRnVuY3Rpb248SywgVD47XG4gICAgZXhwb3J0IHR5cGUgV2l0aFQgPSBpMThuZXh0V2l0aFQ7XG4gICAgZXhwb3J0IHR5cGUgVEZ1bmN0aW9uID0gaTE4bmV4dFRGdW5jdGlvbjtcbiAgICBleHBvcnQgdHlwZSBSZXNvdXJjZSA9IGkxOG5leHRSZXNvdXJjZTtcbiAgICBleHBvcnQgdHlwZSBSZXNvdXJjZUxhbmd1YWdlID0gaTE4bmV4dFJlc291cmNlTGFuZ3VhZ2U7XG4gICAgZXhwb3J0IHR5cGUgUmVzb3VyY2VLZXkgPSBpMThuZXh0UmVzb3VyY2VLZXk7XG4gICAgZXhwb3J0IHR5cGUgSW50ZXJwb2xhdG9yID0gaTE4bmV4dEludGVycG9sYXRvcjtcbiAgICBleHBvcnQgdHlwZSBSZXNvdXJjZVN0b3JlID0gaTE4bmV4dFJlc291cmNlU3RvcmU7XG4gICAgZXhwb3J0IHR5cGUgU2VydmljZXMgPSBpMThuZXh0U2VydmljZXM7XG4gICAgZXhwb3J0IHR5cGUgTW9kdWxlID0gaTE4bmV4dE1vZHVsZTtcbiAgICBleHBvcnQgdHlwZSBDYWxsYmFja0Vycm9yID0gaTE4bmV4dENhbGxiYWNrRXJyb3I7XG4gICAgZXhwb3J0IHR5cGUgUmVhZENhbGxiYWNrID0gaTE4bmV4dFJlYWRDYWxsYmFjaztcbiAgICBleHBvcnQgdHlwZSBNdWx0aVJlYWRDYWxsYmFjayA9IGkxOG5leHRNdWx0aVJlYWRDYWxsYmFjaztcbiAgICBleHBvcnQgdHlwZSBCYWNrZW5kTW9kdWxlPFQgPSBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPj4gPSBpMThuZXh0QmFja2VuZE1vZHVsZTxUPjtcbiAgICBleHBvcnQgdHlwZSBMYW5ndWFnZURldGVjdG9yTW9kdWxlID0gaTE4bmV4dExhbmd1YWdlRGV0ZWN0b3JNb2R1bGU7XG4gICAgZXhwb3J0IHR5cGUgTGFuZ3VhZ2VEZXRlY3RvckFzeW5jTW9kdWxlID0gaTE4bmV4dExhbmd1YWdlRGV0ZWN0b3JBc3luY01vZHVsZTtcbiAgICBleHBvcnQgdHlwZSBQb3N0UHJvY2Vzc29yTW9kdWxlID0gaTE4bmV4dFBvc3RQcm9jZXNzb3JNb2R1bGU7XG4gICAgZXhwb3J0IHR5cGUgTG9nZ2VyTW9kdWxlID0gaTE4bmV4dExvZ2dlck1vZHVsZTtcbiAgICBleHBvcnQgdHlwZSBJMThuRm9ybWF0TW9kdWxlID0gaTE4bmV4dEkxOG5Gb3JtYXRNb2R1bGU7XG4gICAgZXhwb3J0IHR5cGUgVGhpcmRQYXJ0eU1vZHVsZSA9IGkxOG5leHRUaGlyZFBhcnR5TW9kdWxlO1xuICAgIGV4cG9ydCB0eXBlIE1vZHVsZXMgPSBpMThuZXh0TW9kdWxlcztcbiAgICBleHBvcnQgdHlwZSBOZXdhYmxlPFQ+ID0gaTE4bmV4dE5ld2FibGU8VD47XG59XG5cbmV4cG9ydCB7IGkxOG4gfTtcbiJdLCJuYW1lcyI6WyJ1dGlsc0NvcHkiLCJlc2NhcGUiLCJ1dGlsc0VzY2FwZSIsImdldERlZmF1bHRzIiwiTGFuZ3VhZ2VVdGlscyIsIkJhY2tlbmRDb25uZWN0b3IiLCJpMThuZXh0Il0sIm1hcHBpbmdzIjoiOzs7OztBQUFBLE1BQU0sYUFBYSxHQUFHO0FBQ3RCLEVBQUUsSUFBSSxFQUFFLFFBQVE7QUFDaEI7QUFDQSxFQUFFLEdBQUcsQ0FBQyxJQUFJLEVBQUU7QUFDWixJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDO0FBQzdCLEdBQUc7QUFDSDtBQUNBLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRTtBQUNiLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDOUIsR0FBRztBQUNIO0FBQ0EsRUFBRSxLQUFLLENBQUMsSUFBSSxFQUFFO0FBQ2QsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQztBQUMvQixHQUFHO0FBQ0g7QUFDQSxFQUFFLE1BQU0sQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFO0FBQ3JCO0FBQ0EsSUFBSSxJQUFJLE9BQU8sSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDckUsR0FBRztBQUNILENBQUMsQ0FBQztBQUNGO0FBQ0EsTUFBTSxNQUFNLENBQUM7QUFDYixFQUFFLFdBQVcsQ0FBQyxjQUFjLEVBQUUsT0FBTyxHQUFHLEVBQUUsRUFBRTtBQUM1QyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0FBQ3ZDLEdBQUc7QUFDSDtBQUNBLEVBQUUsSUFBSSxDQUFD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QUNIO0FBQ0EsRUFBRSxFQUFFLENBQUMsTUFBTSxFQUFFLFFBQVEsRUFBRTtBQUN2QixJQUFJLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxLQUFLO0FBQ3pDLE1BQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsR0FBRyxJQUFJLEdBQUcsRUFBRSxDQUFDO0FBQ3BFLE1BQU0sTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ3BFLE1BQU0sSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLFlBQVksR0FBRyxDQUFDLENBQUMsQ0FBQztBQUM1RCxLQUFLLENBQUMsQ0FBQztBQUNQLElBQUksT0FBTyxJQUFJLENBQUM7QUFDaEIsR0FBRztBQUNIO0FBQ0EsRUFBRSxHQUFHLENBQUMsS0FBSyxFQUFFLFFBQVEsRUFBRTtBQUN2QixJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxFQUFFLE9BQU87QUFDdkMsSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFO0FBQ25CLE1BQU0sT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQ25DLE1BQU0sT0FBTztBQUNiLEtBQUs7QUFDTDtBQUNBLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDM0MsR0FBRztBQUNIO0FBQ0EsRUFBRSxJQUFJLENBQUMsS0FBSyxFQUFFLEdBQUcsSUFBSSxFQUFFO0FBQ3ZCLElBQUksSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxFQUFFO0FBQy9CLE1BQU0sTUFBTSxNQUFNLEdBQUcsS0FB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QyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQztBQUNqRyxPQUFPLE1BQU0sSUFBSSxDQUFDLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtBQUNqQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUM7QUFDbEM7QUFDQTtBQUNBLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO0FBQ3pELFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssS0FBSyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUM7QUFDM0U7QUFDQSxRQUFRLElBQUksWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDO0FBQ2pHLFFBQVEsSUFBSSxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdB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LElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFO0FBQ3hEO0FBQ0EsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSTtBQUN4RSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSTtBQUNoRSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSTtBQUNqRixJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSztBQUN0RSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUU7QUFDckY7QUFDQSxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSTtBQUM3RSxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRTtBQUNwRTtBQUNBLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFO0FBQzVFO0FBQ0EsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRTtBQUMvQyxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRTtBQUMzQyxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRTtBQUM1QyxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRTtBQUN4QyxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUU7QUFDcEMsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFO0FBQzVDLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFO0FBQzFDLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRTtBQUNyQyxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUU7QUFDckMsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUU7QUFDekMsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRTtBQUN4QyxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFO0FBQ3ZDLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRTtBQUNyQyxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsS0FBSyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFO0FBQ3hDLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFO0FBQzNDLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRTtBQUNwQyxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFO0FBQ3hDLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFO0FBQ3pDLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRTtBQUNoRCxFQUFDO0FBQ0Q7QUFDQSxJQUFJLGtCQUFrQixHQUFHO0FBQ3pCLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ3pCLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQzFCLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUM7QUFDYixFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUNwRyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDbEcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUN2RCxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ3BGLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUN6RSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUMxQixFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsS0FBSyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ2pFLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxLQUFLLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDMUYsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLEtBQUssTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDO0FBQ3pDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxLQUFLLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQzVCLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxLQUFLLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDL0QsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLEtBQUssTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDMUYsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLEtBQUssTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxHQUFHLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDL0QsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLEtBQUssTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUN6RCxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsS0FBSyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQzVDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxLQUFLLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUNwRyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsS0FBSyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUMzRSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsS0FBSyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQy9FLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxLQUFLLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUMsRUFB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RyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7QUFDdkMsUUFBUSxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUMsY0FBYzs7QUNubkJmRyxRQUFPLENBQUMsZUFBZTtBQUNyRDtBQUNtQkEsUUFBTyxDQUFDLElBQUk7QUFDWEEsUUFBTyxDQUFDLEtBQUs7QUFDSkEsUUFBTyxDQUFDLGNBQWM7QUFDcEJBLFFBQU8sQ0FBQyxnQkFBZ0I7QUFDcENBLFFBQU8sQ0FBQyxJQUFJO0FBQ0RBLFFBQU8sQ0FBQyxlQUFlO0FBQzVCQSxRQUFPLENBQUMsVUFBVTtBQUMxQkEsUUFBTyxDQUFDLEVBQUU7QUFDTEEsUUFBTyxDQUFDLE9BQU87QUFDRkEsUUFBTyxDQUFDLG9CQUFvQjtBQUM3QkEsUUFBTyxDQUFDLG1CQUFtQjtBQUMvQkEsUUFBTyxDQUFDLGVBQWU7QUFDeEJBLFFBQU8sQ0FBQzs7QUNsQnJDOzs7QUFHRztBQW9DRyxNQUFBLElBQUksR0FBY0E7Ozs7IiwieF9nb29nbGVfaWdub3JlTGlzdCI6WzAsMSwyLDMsNCw1LDYsNyw4LDksMTAsMTEsMTIsMTNdLCJzb3VyY2VSb290IjoiY2RwOi8vL0BjZHAvZXh0ZW5zaW9uLWkxOG4vIn0=