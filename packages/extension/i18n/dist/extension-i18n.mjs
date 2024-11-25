/*!
 * @cdp/extension-i18n 0.9.18
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

const getCleanedCode = (code) => code?.replace('_', '-');

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
        } else if (isString(key) && keySeparator) {
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
    if (result || !ignoreJSONStructure || !isString(key)) return result;

    return deepFind(this.data?.[lng]?.[ns], key, keySeparator);
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
    return resolved?.res !== undefined;
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
          namespaces: isString(namespaces) ? [namespaces] : namespaces,
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

    return {
      key,
      namespaces: isString(namespaces) ? [namespaces] : namespaces,
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
    if (lng?.toLowerCase() === 'cimode') {
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
    let res = resolved?.res;
    const resUsedKey = resolved?.usedKey || key;
    const resExactUsedKey = resolved?.exactUsedKey || key;

    const resType = Object.prototype.toString.apply(res);
    const noObject = ['[object Number]', '[object Function]', '[object RegExp]'];
    const joinArrays =
      options.joinArrays !== undefined ? options.joinArrays : this.options.joinArrays;

    // object
    const handleAsObjectInI18nFormat = !this.i18nFormat || this.i18nFormat.handleAsObject;
    const handleAsObject = !isString(res) && typeof res !== 'boolean' && typeof res !== 'number';
    if (
      handleAsObjectInI18nFormat &&
      res &&
      handleAsObject &&
      noObject.indexOf(resType) < 0 &&
      !(isString(joinArrays) && Array.isArray(res))
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
    } else if (handleAsObjectInI18nFormat && isString(joinArrays) && Array.isArray(res)) {
      // array special treatment
      res = res.join(joinArrays);
      if (res) res = this.extendTranslation(res, keys, options, lastKey);
    } else {
      // string, empty or null
      let usedDefault = false;
      let usedKey = false;

      const needsPluralHandling = options.count !== undefined && !isString(options.count);
      const hasDefaultValue = Translator.hasDefaultValue(options);
      const defaultValueSuffix = needsPluralHandling
        ? this.pluralResolver.getSuffix(lng, options.count, options)
        : '';
      const defaultValueSuffixOrdinalFallback =
        options.ordinal && needsPluralHandling
          ? this.pluralResolver.getSuffix(lng, options.count, { ordinal: false })
          : '';
      const needsZeroSuffixLookup = needsPluralHandling && !options.ordinal && options.count === 0;
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
          } else if (this.backendConnector?.saveMissing) {
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
        res = this.options.parseMissingKeyHandler(
          this.options.appendNamespaceToMissingKey ? `${namespace}:${key}` : key,
          usedDefault ? res : undefined,
        );
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
    if (this.i18nFormat?.parse) {
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
        isString(res) &&
        (options?.interpolation?.skipOnVariables !== undefined
          ? options.interpolation.skipOnVariables
          : this.options.interpolation.skipOnVariables);
      let nestBef;
      if (skipOnVariables) {
        const nb = res.match(this.interpolator.nestingRegexp);
        // has nesting aftbeforeer interpolation
        nestBef = nb && nb.length;
      }

      // interpolate
      let data = options.replace && !isString(options.replace) ? options.replace : options;
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
      if (!options.lng && resolved && resolved.res) options.lng = this.language || resolved.usedLng;
      if (options.nest !== false)
        res = this.interpolator.nest(
          res,
          (...args) => {
            if (lastKey?.[0] === args[0] && !options.context) {
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
    const postProcessorNames = isString(postProcess) ? [postProcess] : postProcess;

    if (
      res !== undefined &&
      res !== null &&
      postProcessorNames?.length &&
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

    if (isString(keys)) keys = [keys];

    // forEach possible key
    keys.forEach((k) => {
      if (this.isValidLookup(found)) return;
      const extracted = this.extractFromKey(k, options);
      const key = extracted.key;
      usedKey = key;
      let namespaces = extracted.namespaces;
      if (this.options.fallbackNS) namespaces = namespaces.concat(this.options.fallbackNS);

      const needsPluralHandling = options.count !== undefined && !isString(options.count);
      const needsZeroSuffixLookup = needsPluralHandling && !options.ordinal && options.count === 0;
      const needsContextHandling =
        options.context !== undefined &&
        (isString(options.context) || typeof options.context === 'number') &&
        options.context !== '';

      const codes = options.lngs
        ? options.lngs
        : this.languageUtils.toResolveHierarchy(options.lng || this.language, options.fallbackLng);

      namespaces.forEach((ns) => {
        if (this.isValidLookup(found)) return;
        usedNS = ns;

        if (
          !checkedLoadedFor[`${codes[0]}-${ns}`] &&
          this.utils?.hasLoadedNamespace &&
          !this.utils?.hasLoadedNamespace(usedNS)
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

          if (this.i18nFormat?.addLookupKeys) {
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
        prefix === option.substring(0, prefix.length) &&
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
    if (isString(code) && code.indexOf('-') > -1) {
      let formattedCode = Intl.getCanonicalLocales(code)[0];
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

    if (isString(code) && (code.indexOf('-') > -1 || code.indexOf('_') > -1)) {
      if (this.options.load !== 'languageOnly') addCode(this.formatLanguageCode(code));
      if (this.options.load !== 'languageOnly' && this.options.load !== 'currentOnly')
        addCode(this.getScriptPartFromCode(code));
      if (this.options.load !== 'currentOnly') addCode(this.getLanguagePartFromCode(code));
    } else if (isString(code)) {
      addCode(this.formatLanguageCode(code));
    }

    fallbackCodes.forEach((fc) => {
      if (codes.indexOf(fc) < 0) addCode(this.formatLanguageCode(fc));
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

class PluralResolver {
  constructor(languageUtils, options = {}) {
    this.languageUtils = languageUtils;
    this.options = options;

    this.logger = baseLogger.create('pluralResolver');

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
      if (!code.match(/-|_/)) return;
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

  getSuffixRetroCompatible(rule, count) {
    const idx = rule.noAbs ? rule.plurals(count) : rule.plurals(Math.abs(count));
    rule.numbers[idx];

    // special treatment for lngs only having singular and plural
    if (this.options.simplifyPluralSuffix && rule.numbers.length === 2 && rule.numbers[0] === 1) ;

    return this.options.prepend && idx.toString() ? this.options.prepend + idx.toString() : idx.toString();
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
      /* eslint no-cond-assign: 0 */
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
      if (key.indexOf(sep) < 0) return key;

      const c = key.split(new RegExp(`${sep}[ ]*{`));

      let optionsString = `{${c[1]}`;
      key = c[0];
      optionsString = this.interpolate(optionsString, clonedOptions);
      const matchedSingleQuotes = optionsString.match(/'/g);
      const matchedDoubleQuotes = optionsString.match(/"/g);
      if (
        ((matchedSingleQuotes?.length ?? 0) % 2 === 0 && !matchedDoubleQuotes) ||
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
      if (value && match[0] === str && !isString(value)) return value;

      // no string to include or empty
      if (!isString(value)) value = makeString(value);
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
    this.formatSeparator = options.interpolation.formatSeparator || ',';
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
  if (isString(options.ns)) options.ns = [options.ns];
  if (isString(options.fallbackLng)) options.fallbackLng = [options.fallbackLng];
  if (isString(options.fallbackNS)) options.fallbackNS = [options.fallbackNS];

  // extend supportedLngs with cimode
  if (options.supportedLngs?.indexOf?.('cimode') < 0) {
    options.supportedLngs = options.supportedLngs.concat(['cimode']);
  }

  // for backward compatibility, assign initImmediate to initAsync (if set)
  if (typeof options.initImmediate === 'boolean') options.initAsync = options.initImmediate;

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

    if (!options.defaultNS && options.defaultNS !== false && options.ns) {
      if (isString(options.ns)) {
        options.defaultNS = options.ns;
      } else if (options.ns.indexOf('translation') < 0) {
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
      this.store = new ResourceStore(this.options.resources, this.options);

      const s = this.services;
      s.logger = baseLogger;
      s.resourceStore = this.store;
      s.languageUtils = lu;
      s.pluralResolver = new PluralResolver(lu, {
        prepend: this.options.pluralSeparator,
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
      if (this.languages && !this.isInitialized) return finish(null, this.t.bind(this));
      this.changeLanguage(this.options.lng, finish);
    };

    if (this.options.resources || !this.options.initAsync) {
      load();
    } else {
      setTimeout(load, 0);
    }

    return deferred;
  }

  /* eslint consistent-return: 0 */
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
      const l = isString(lngs) ? lngs : this.services.languageUtils.getBestMatchFromCodes(lngs);

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

    if (isString(lngs)) lngs = [lngs];
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
    if (!lng) lng = this.resolvedLanguage || (this.languages?.length > 0 ? this.languages[0] : this.language);
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

    const languageUtils = this.services?.languageUtils || new LanguageUtil(get()); // for uninitialized usage

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uLWkxOG4ubWpzIiwic291cmNlcyI6WyJpMThuZXh0L3NyYy91dGlscy5qcyIsImkxOG5leHQvc3JjL2xvZ2dlci5qcyIsImkxOG5leHQvc3JjL0V2ZW50RW1pdHRlci5qcyIsImkxOG5leHQvc3JjL1Jlc291cmNlU3RvcmUuanMiLCJpMThuZXh0L3NyYy9wb3N0UHJvY2Vzc29yLmpzIiwiaTE4bmV4dC9zcmMvVHJhbnNsYXRvci5qcyIsImkxOG5leHQvc3JjL0xhbmd1YWdlVXRpbHMuanMiLCJpMThuZXh0L3NyYy9QbHVyYWxSZXNvbHZlci5qcyIsImkxOG5leHQvc3JjL0ludGVycG9sYXRvci5qcyIsImkxOG5leHQvc3JjL0Zvcm1hdHRlci5qcyIsImkxOG5leHQvc3JjL0JhY2tlbmRDb25uZWN0b3IuanMiLCJpMThuZXh0L3NyYy9kZWZhdWx0cy5qcyIsImkxOG5leHQvc3JjL2kxOG5leHQuanMiLCJpMThuZXh0L3NyYy9pbmRleC5qcyIsImluZGV4LnRzIl0sInNvdXJjZXNDb250ZW50IjpbImV4cG9ydCBjb25zdCBpc1N0cmluZyA9IChvYmopID0+IHR5cGVvZiBvYmogPT09ICdzdHJpbmcnO1xuXG4vLyBodHRwOi8vbGVhLnZlcm91Lm1lLzIwMTYvMTIvcmVzb2x2ZS1wcm9taXNlcy1leHRlcm5hbGx5LXdpdGgtdGhpcy1vbmUtd2VpcmQtdHJpY2svXG5leHBvcnQgY29uc3QgZGVmZXIgPSAoKSA9PiB7XG4gIGxldCByZXM7XG4gIGxldCByZWo7XG5cbiAgY29uc3QgcHJvbWlzZSA9IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICByZXMgPSByZXNvbHZlO1xuICAgIHJlaiA9IHJlamVjdDtcbiAgfSk7XG5cbiAgcHJvbWlzZS5yZXNvbHZlID0gcmVzO1xuICBwcm9taXNlLnJlamVjdCA9IHJlajtcblxuICByZXR1cm4gcHJvbWlzZTtcbn07XG5cbmV4cG9ydCBjb25zdCBtYWtlU3RyaW5nID0gKG9iamVjdCkgPT4ge1xuICBpZiAob2JqZWN0ID09IG51bGwpIHJldHVybiAnJztcbiAgLyogZXNsaW50IHByZWZlci10ZW1wbGF0ZTogMCAqL1xuICByZXR1cm4gJycgKyBvYmplY3Q7XG59O1xuXG5leHBvcnQgY29uc3QgY29weSA9IChhLCBzLCB0KSA9PiB7XG4gIGEuZm9yRWFjaCgobSkgPT4ge1xuICAgIGlmIChzW21dKSB0W21dID0gc1ttXTtcbiAgfSk7XG59O1xuXG4vLyBXZSBleHRyYWN0IG91dCB0aGUgUmVnRXhwIGRlZmluaXRpb24gdG8gaW1wcm92ZSBwZXJmb3JtYW5jZSB3aXRoIFJlYWN0IE5hdGl2ZSBBbmRyb2lkLCB3aGljaCBoYXMgcG9vciBSZWdFeHBcbi8vIGluaXRpYWxpemF0aW9uIHBlcmZvcm1hbmNlXG5jb25zdCBsYXN0T2ZQYXRoU2VwYXJhdG9yUmVnRXhwID0gLyMjIy9nO1xuXG5jb25zdCBjbGVhbktleSA9IChrZXkpID0+XG4gIGtleSAmJiBrZXkuaW5kZXhPZignIyMjJykgPiAtMSA/IGtleS5yZXBsYWNlKGxhc3RPZlBhdGhTZXBhcmF0b3JSZWdFeHAsICcuJykgOiBrZXk7XG5cbmNvbnN0IGNhbk5vdFRyYXZlcnNlRGVlcGVyID0gKG9iamVjdCkgPT4gIW9iamVjdCB8fCBpc1N0cmluZyhvYmplY3QpO1xuXG5jb25zdCBnZXRMYXN0T2ZQYXRoID0gKG9iamVjdCwgcGF0aCwgRW1wdHkpID0+IHtcbiAgY29uc3Qgc3RhY2sgPSAhaXNTdHJpbmcocGF0aCkgPyBwYXRoIDogcGF0aC5zcGxpdCgnLicpO1xuICBsZXQgc3RhY2tJbmRleCA9IDA7XG4gIC8vIGl0ZXJhdGUgdGhyb3VnaCB0aGUgc3RhY2ssIGJ1dCBsZWF2ZSB0aGUgbGFzdCBpdGVtXG4gIHdoaWxlIChzdGFja0luZGV4IDwgc3RhY2subGVuZ3RoIC0gMSkge1xuICAgIGlmIChjYW5Ob3RUcmF2ZXJzZURlZXBlcihvYmplY3QpKSByZXR1cm4ge307XG5cbiAgICBjb25zdCBrZXkgPSBjbGVhbktleShzdGFja1tzdGFja0luZGV4XSk7XG4gICAgaWYgKCFvYmplY3Rba2V5XSAmJiBFbXB0eSkgb2JqZWN0W2tleV0gPSBuZXcgRW1wdHkoKTtcbiAgICAvLyBwcmV2ZW50IHByb3RvdHlwZSBwb2xsdXRpb25cbiAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iamVjdCwga2V5KSkge1xuICAgICAgb2JqZWN0ID0gb2JqZWN0W2tleV07XG4gICAgfSBlbHNlIHtcbiAgICAgIG9iamVjdCA9IHt9O1xuICAgIH1cbiAgICArK3N0YWNrSW5kZXg7XG4gIH1cblxuICBpZiAoY2FuTm90VHJhdmVyc2VEZWVwZXIob2JqZWN0KSkgcmV0dXJuIHt9O1xuICByZXR1cm4ge1xuICAgIG9iajogb2JqZWN0LFxuICAgIGs6IGNsZWFuS2V5KHN0YWNrW3N0YWNrSW5kZXhdKSxcbiAgfTtcbn07XG5cbmV4cG9ydCBjb25zdCBzZXRQYXRoID0gKG9iamVjdCwgcGF0aCwgbmV3VmFsdWUpID0+IHtcbiAgY29uc3QgeyBvYmosIGsgfSA9IGdldExhc3RPZlBhdGgob2JqZWN0LCBwYXRoLCBPYmplY3QpO1xuICBpZiAob2JqICE9PSB1bmRlZmluZWQgfHwgcGF0aC5sZW5ndGggPT09IDEpIHtcbiAgICBvYmpba10gPSBuZXdWYWx1ZTtcbiAgICByZXR1cm47XG4gIH1cblxuICBsZXQgZSA9IHBhdGhbcGF0aC5sZW5ndGggLSAxXTtcbiAgbGV0IHAgPSBwYXRoLnNsaWNlKDAsIHBhdGgubGVuZ3RoIC0gMSk7XG4gIGxldCBsYXN0ID0gZ2V0TGFzdE9mUGF0aChvYmplY3QsIHAsIE9iamVjdCk7XG4gIHdoaWxlIChsYXN0Lm9iaiA9PT0gdW5kZWZpbmVkICYmIHAubGVuZ3RoKSB7XG4gICAgZSA9IGAke3BbcC5sZW5ndGggLSAxXX0uJHtlfWA7XG4gICAgcCA9IHAuc2xpY2UoMCwgcC5sZW5ndGggLSAxKTtcbiAgICBsYXN0ID0gZ2V0TGFzdE9mUGF0aChvYmplY3QsIHAsIE9iamVjdCk7XG4gICAgaWYgKGxhc3Q/Lm9iaiAmJiB0eXBlb2YgbGFzdC5vYmpbYCR7bGFzdC5rfS4ke2V9YF0gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICBsYXN0Lm9iaiA9IHVuZGVmaW5lZDtcbiAgICB9XG4gIH1cbiAgbGFzdC5vYmpbYCR7bGFzdC5rfS4ke2V9YF0gPSBuZXdWYWx1ZTtcbn07XG5cbmV4cG9ydCBjb25zdCBwdXNoUGF0aCA9IChvYmplY3QsIHBhdGgsIG5ld1ZhbHVlLCBjb25jYXQpID0+IHtcbiAgY29uc3QgeyBvYmosIGsgfSA9IGdldExhc3RPZlBhdGgob2JqZWN0LCBwYXRoLCBPYmplY3QpO1xuXG4gIG9ialtrXSA9IG9ialtrXSB8fCBbXTtcbiAgaWYgKGNvbmNhdCkgb2JqW2tdID0gb2JqW2tdLmNvbmNhdChuZXdWYWx1ZSk7XG4gIGlmICghY29uY2F0KSBvYmpba10ucHVzaChuZXdWYWx1ZSk7XG59O1xuXG5leHBvcnQgY29uc3QgZ2V0UGF0aCA9IChvYmplY3QsIHBhdGgpID0+IHtcbiAgY29uc3QgeyBvYmosIGsgfSA9IGdldExhc3RPZlBhdGgob2JqZWN0LCBwYXRoKTtcblxuICBpZiAoIW9iaikgcmV0dXJuIHVuZGVmaW5lZDtcbiAgcmV0dXJuIG9ialtrXTtcbn07XG5cbmV4cG9ydCBjb25zdCBnZXRQYXRoV2l0aERlZmF1bHRzID0gKGRhdGEsIGRlZmF1bHREYXRhLCBrZXkpID0+IHtcbiAgY29uc3QgdmFsdWUgPSBnZXRQYXRoKGRhdGEsIGtleSk7XG4gIGlmICh2YWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIHZhbHVlO1xuICB9XG4gIC8vIEZhbGxiYWNrIHRvIGRlZmF1bHQgdmFsdWVzXG4gIHJldHVybiBnZXRQYXRoKGRlZmF1bHREYXRhLCBrZXkpO1xufTtcblxuZXhwb3J0IGNvbnN0IGRlZXBFeHRlbmQgPSAodGFyZ2V0LCBzb3VyY2UsIG92ZXJ3cml0ZSkgPT4ge1xuICAvKiBlc2xpbnQgbm8tcmVzdHJpY3RlZC1zeW50YXg6IDAgKi9cbiAgZm9yIChjb25zdCBwcm9wIGluIHNvdXJjZSkge1xuICAgIGlmIChwcm9wICE9PSAnX19wcm90b19fJyAmJiBwcm9wICE9PSAnY29uc3RydWN0b3InKSB7XG4gICAgICBpZiAocHJvcCBpbiB0YXJnZXQpIHtcbiAgICAgICAgLy8gSWYgd2UgcmVhY2hlZCBhIGxlYWYgc3RyaW5nIGluIHRhcmdldCBvciBzb3VyY2UgdGhlbiByZXBsYWNlIHdpdGggc291cmNlIG9yIHNraXAgZGVwZW5kaW5nIG9uIHRoZSAnb3ZlcndyaXRlJyBzd2l0Y2hcbiAgICAgICAgaWYgKFxuICAgICAgICAgIGlzU3RyaW5nKHRhcmdldFtwcm9wXSkgfHxcbiAgICAgICAgICB0YXJnZXRbcHJvcF0gaW5zdGFuY2VvZiBTdHJpbmcgfHxcbiAgICAgICAgICBpc1N0cmluZyhzb3VyY2VbcHJvcF0pIHx8XG4gICAgICAgICAgc291cmNlW3Byb3BdIGluc3RhbmNlb2YgU3RyaW5nXG4gICAgICAgICkge1xuICAgICAgICAgIGlmIChvdmVyd3JpdGUpIHRhcmdldFtwcm9wXSA9IHNvdXJjZVtwcm9wXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBkZWVwRXh0ZW5kKHRhcmdldFtwcm9wXSwgc291cmNlW3Byb3BdLCBvdmVyd3JpdGUpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0YXJnZXRbcHJvcF0gPSBzb3VyY2VbcHJvcF07XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiB0YXJnZXQ7XG59O1xuXG5leHBvcnQgY29uc3QgcmVnZXhFc2NhcGUgPSAoc3RyKSA9PlxuICAvKiBlc2xpbnQgbm8tdXNlbGVzcy1lc2NhcGU6IDAgKi9cbiAgc3RyLnJlcGxhY2UoL1tcXC1cXFtcXF1cXC9cXHtcXH1cXChcXClcXCpcXCtcXD9cXC5cXFxcXFxeXFwkXFx8XS9nLCAnXFxcXCQmJyk7XG5cbi8qIGVzbGludC1kaXNhYmxlICovXG52YXIgX2VudGl0eU1hcCA9IHtcbiAgJyYnOiAnJmFtcDsnLFxuICAnPCc6ICcmbHQ7JyxcbiAgJz4nOiAnJmd0OycsXG4gICdcIic6ICcmcXVvdDsnLFxuICBcIidcIjogJyYjMzk7JyxcbiAgJy8nOiAnJiN4MkY7Jyxcbn07XG4vKiBlc2xpbnQtZW5hYmxlICovXG5cbmV4cG9ydCBjb25zdCBlc2NhcGUgPSAoZGF0YSkgPT4ge1xuICBpZiAoaXNTdHJpbmcoZGF0YSkpIHtcbiAgICByZXR1cm4gZGF0YS5yZXBsYWNlKC9bJjw+XCInXFwvXS9nLCAocykgPT4gX2VudGl0eU1hcFtzXSk7XG4gIH1cblxuICByZXR1cm4gZGF0YTtcbn07XG5cbi8qKlxuICogVGhpcyBpcyBhIHJldXNhYmxlIHJlZ3VsYXIgZXhwcmVzc2lvbiBjYWNoZSBjbGFzcy4gR2l2ZW4gYSBjZXJ0YWluIG1heGltdW0gbnVtYmVyIG9mIHJlZ3VsYXIgZXhwcmVzc2lvbnMgd2UncmVcbiAqIGFsbG93ZWQgdG8gc3RvcmUgaW4gdGhlIGNhY2hlLCBpdCBwcm92aWRlcyBhIHdheSB0byBhdm9pZCByZWNyZWF0aW5nIHJlZ3VsYXIgZXhwcmVzc2lvbiBvYmplY3RzIG92ZXIgYW5kIG92ZXIuXG4gKiBXaGVuIGl0IG5lZWRzIHRvIGV2aWN0IHNvbWV0aGluZywgaXQgZXZpY3RzIHRoZSBvbGRlc3Qgb25lLlxuICovXG5jbGFzcyBSZWdFeHBDYWNoZSB7XG4gIGNvbnN0cnVjdG9yKGNhcGFjaXR5KSB7XG4gICAgdGhpcy5jYXBhY2l0eSA9IGNhcGFjaXR5O1xuICAgIHRoaXMucmVnRXhwTWFwID0gbmV3IE1hcCgpO1xuICAgIC8vIFNpbmNlIG91ciBjYXBhY2l0eSB0ZW5kcyB0byBiZSBmYWlybHkgc21hbGwsIGAuc2hpZnQoKWAgd2lsbCBiZSBmYWlybHkgcXVpY2sgZGVzcGl0ZSBiZWluZyBPKG4pLiBXZSBqdXN0IHVzZSBhXG4gICAgLy8gbm9ybWFsIGFycmF5IHRvIGtlZXAgaXQgc2ltcGxlLlxuICAgIHRoaXMucmVnRXhwUXVldWUgPSBbXTtcbiAgfVxuXG4gIGdldFJlZ0V4cChwYXR0ZXJuKSB7XG4gICAgY29uc3QgcmVnRXhwRnJvbUNhY2hlID0gdGhpcy5yZWdFeHBNYXAuZ2V0KHBhdHRlcm4pO1xuICAgIGlmIChyZWdFeHBGcm9tQ2FjaGUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIHJlZ0V4cEZyb21DYWNoZTtcbiAgICB9XG4gICAgY29uc3QgcmVnRXhwTmV3ID0gbmV3IFJlZ0V4cChwYXR0ZXJuKTtcbiAgICBpZiAodGhpcy5yZWdFeHBRdWV1ZS5sZW5ndGggPT09IHRoaXMuY2FwYWNpdHkpIHtcbiAgICAgIHRoaXMucmVnRXhwTWFwLmRlbGV0ZSh0aGlzLnJlZ0V4cFF1ZXVlLnNoaWZ0KCkpO1xuICAgIH1cbiAgICB0aGlzLnJlZ0V4cE1hcC5zZXQocGF0dGVybiwgcmVnRXhwTmV3KTtcbiAgICB0aGlzLnJlZ0V4cFF1ZXVlLnB1c2gocGF0dGVybik7XG4gICAgcmV0dXJuIHJlZ0V4cE5ldztcbiAgfVxufVxuXG5jb25zdCBjaGFycyA9IFsnICcsICcsJywgJz8nLCAnIScsICc7J107XG4vLyBXZSBjYWNoZSBSZWdFeHBzIHRvIGltcHJvdmUgcGVyZm9ybWFuY2Ugd2l0aCBSZWFjdCBOYXRpdmUgQW5kcm9pZCwgd2hpY2ggaGFzIHBvb3IgUmVnRXhwIGluaXRpYWxpemF0aW9uIHBlcmZvcm1hbmNlLlxuLy8gQ2FwYWNpdHkgb2YgMjAgc2hvdWxkIGJlIHBsZW50eSwgYXMgbnNTZXBhcmF0b3Iva2V5U2VwYXJhdG9yIGRvbid0IHRlbmQgdG8gdmFyeSBtdWNoIGFjcm9zcyBjYWxscy5cbmNvbnN0IGxvb2tzTGlrZU9iamVjdFBhdGhSZWdFeHBDYWNoZSA9IG5ldyBSZWdFeHBDYWNoZSgyMCk7XG5cbmV4cG9ydCBjb25zdCBsb29rc0xpa2VPYmplY3RQYXRoID0gKGtleSwgbnNTZXBhcmF0b3IsIGtleVNlcGFyYXRvcikgPT4ge1xuICBuc1NlcGFyYXRvciA9IG5zU2VwYXJhdG9yIHx8ICcnO1xuICBrZXlTZXBhcmF0b3IgPSBrZXlTZXBhcmF0b3IgfHwgJyc7XG4gIGNvbnN0IHBvc3NpYmxlQ2hhcnMgPSBjaGFycy5maWx0ZXIoXG4gICAgKGMpID0+IG5zU2VwYXJhdG9yLmluZGV4T2YoYykgPCAwICYmIGtleVNlcGFyYXRvci5pbmRleE9mKGMpIDwgMCxcbiAgKTtcbiAgaWYgKHBvc3NpYmxlQ2hhcnMubGVuZ3RoID09PSAwKSByZXR1cm4gdHJ1ZTtcbiAgY29uc3QgciA9IGxvb2tzTGlrZU9iamVjdFBhdGhSZWdFeHBDYWNoZS5nZXRSZWdFeHAoXG4gICAgYCgke3Bvc3NpYmxlQ2hhcnMubWFwKChjKSA9PiAoYyA9PT0gJz8nID8gJ1xcXFw/JyA6IGMpKS5qb2luKCd8Jyl9KWAsXG4gICk7XG4gIGxldCBtYXRjaGVkID0gIXIudGVzdChrZXkpO1xuICBpZiAoIW1hdGNoZWQpIHtcbiAgICBjb25zdCBraSA9IGtleS5pbmRleE9mKGtleVNlcGFyYXRvcik7XG4gICAgaWYgKGtpID4gMCAmJiAhci50ZXN0KGtleS5zdWJzdHJpbmcoMCwga2kpKSkge1xuICAgICAgbWF0Y2hlZCA9IHRydWU7XG4gICAgfVxuICB9XG4gIHJldHVybiBtYXRjaGVkO1xufTtcblxuLyoqXG4gKiBHaXZlblxuICpcbiAqIDEuIGEgdG9wIGxldmVsIG9iamVjdCBvYmosIGFuZFxuICogMi4gYSBwYXRoIHRvIGEgZGVlcGx5IG5lc3RlZCBzdHJpbmcgb3Igb2JqZWN0IHdpdGhpbiBpdFxuICpcbiAqIEZpbmQgYW5kIHJldHVybiB0aGF0IGRlZXBseSBuZXN0ZWQgc3RyaW5nIG9yIG9iamVjdC4gVGhlIGNhdmVhdCBpcyB0aGF0IHRoZSBrZXlzIG9mIG9iamVjdHMgd2l0aGluIHRoZSBuZXN0aW5nIGNoYWluXG4gKiBtYXkgY29udGFpbiBwZXJpb2QgY2hhcmFjdGVycy4gVGhlcmVmb3JlLCB3ZSBuZWVkIHRvIERGUyBhbmQgZXhwbG9yZSBhbGwgcG9zc2libGUga2V5cyBhdCBlYWNoIHN0ZXAgdW50aWwgd2UgZmluZCB0aGVcbiAqIGRlZXBseSBuZXN0ZWQgc3RyaW5nIG9yIG9iamVjdC5cbiAqL1xuZXhwb3J0IGNvbnN0IGRlZXBGaW5kID0gKG9iaiwgcGF0aCwga2V5U2VwYXJhdG9yID0gJy4nKSA9PiB7XG4gIGlmICghb2JqKSByZXR1cm4gdW5kZWZpbmVkO1xuICBpZiAob2JqW3BhdGhdKSByZXR1cm4gb2JqW3BhdGhdO1xuICBjb25zdCB0b2tlbnMgPSBwYXRoLnNwbGl0KGtleVNlcGFyYXRvcik7XG4gIGxldCBjdXJyZW50ID0gb2JqO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IHRva2Vucy5sZW5ndGg7ICkge1xuICAgIGlmICghY3VycmVudCB8fCB0eXBlb2YgY3VycmVudCAhPT0gJ29iamVjdCcpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGxldCBuZXh0O1xuICAgIGxldCBuZXh0UGF0aCA9ICcnO1xuICAgIGZvciAobGV0IGogPSBpOyBqIDwgdG9rZW5zLmxlbmd0aDsgKytqKSB7XG4gICAgICBpZiAoaiAhPT0gaSkge1xuICAgICAgICBuZXh0UGF0aCArPSBrZXlTZXBhcmF0b3I7XG4gICAgICB9XG4gICAgICBuZXh0UGF0aCArPSB0b2tlbnNbal07XG4gICAgICBuZXh0ID0gY3VycmVudFtuZXh0UGF0aF07XG4gICAgICBpZiAobmV4dCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmIChbJ3N0cmluZycsICdudW1iZXInLCAnYm9vbGVhbiddLmluZGV4T2YodHlwZW9mIG5leHQpID4gLTEgJiYgaiA8IHRva2Vucy5sZW5ndGggLSAxKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgaSArPSBqIC0gaSArIDE7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgICBjdXJyZW50ID0gbmV4dDtcbiAgfVxuICByZXR1cm4gY3VycmVudDtcbn07XG5cbmV4cG9ydCBjb25zdCBnZXRDbGVhbmVkQ29kZSA9IChjb2RlKSA9PiBjb2RlPy5yZXBsYWNlKCdfJywgJy0nKTtcbiIsImltcG9ydCB7IGlzU3RyaW5nIH0gZnJvbSAnLi91dGlscy5qcyc7XG5cbmNvbnN0IGNvbnNvbGVMb2dnZXIgPSB7XG4gIHR5cGU6ICdsb2dnZXInLFxuXG4gIGxvZyhhcmdzKSB7XG4gICAgdGhpcy5vdXRwdXQoJ2xvZycsIGFyZ3MpO1xuICB9LFxuXG4gIHdhcm4oYXJncykge1xuICAgIHRoaXMub3V0cHV0KCd3YXJuJywgYXJncyk7XG4gIH0sXG5cbiAgZXJyb3IoYXJncykge1xuICAgIHRoaXMub3V0cHV0KCdlcnJvcicsIGFyZ3MpO1xuICB9LFxuXG4gIG91dHB1dCh0eXBlLCBhcmdzKSB7XG4gICAgLyogZXNsaW50IG5vLWNvbnNvbGU6IDAgKi9cbiAgICBjb25zb2xlPy5bdHlwZV0/LmFwcGx5Py4oY29uc29sZSwgYXJncyk7XG4gIH0sXG59O1xuXG5jbGFzcyBMb2dnZXIge1xuICBjb25zdHJ1Y3Rvcihjb25jcmV0ZUxvZ2dlciwgb3B0aW9ucyA9IHt9KSB7XG4gICAgdGhpcy5pbml0KGNvbmNyZXRlTG9nZ2VyLCBvcHRpb25zKTtcbiAgfVxuXG4gIGluaXQoY29uY3JldGVMb2dnZXIsIG9wdGlvbnMgPSB7fSkge1xuICAgIHRoaXMucHJlZml4ID0gb3B0aW9ucy5wcmVmaXggfHwgJ2kxOG5leHQ6JztcbiAgICB0aGlzLmxvZ2dlciA9IGNvbmNyZXRlTG9nZ2VyIHx8IGNvbnNvbGVMb2dnZXI7XG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcbiAgICB0aGlzLmRlYnVnID0gb3B0aW9ucy5kZWJ1ZztcbiAgfVxuXG4gIGxvZyguLi5hcmdzKSB7XG4gICAgcmV0dXJuIHRoaXMuZm9yd2FyZChhcmdzLCAnbG9nJywgJycsIHRydWUpO1xuICB9XG5cbiAgd2FybiguLi5hcmdzKSB7XG4gICAgcmV0dXJuIHRoaXMuZm9yd2FyZChhcmdzLCAnd2FybicsICcnLCB0cnVlKTtcbiAgfVxuXG4gIGVycm9yKC4uLmFyZ3MpIHtcbiAgICByZXR1cm4gdGhpcy5mb3J3YXJkKGFyZ3MsICdlcnJvcicsICcnKTtcbiAgfVxuXG4gIGRlcHJlY2F0ZSguLi5hcmdzKSB7XG4gICAgcmV0dXJuIHRoaXMuZm9yd2FyZChhcmdzLCAnd2FybicsICdXQVJOSU5HIERFUFJFQ0FURUQ6ICcsIHRydWUpO1xuICB9XG5cbiAgZm9yd2FyZChhcmdzLCBsdmwsIHByZWZpeCwgZGVidWdPbmx5KSB7XG4gICAgaWYgKGRlYnVnT25seSAmJiAhdGhpcy5kZWJ1ZykgcmV0dXJuIG51bGw7XG4gICAgaWYgKGlzU3RyaW5nKGFyZ3NbMF0pKSBhcmdzWzBdID0gYCR7cHJlZml4fSR7dGhpcy5wcmVmaXh9ICR7YXJnc1swXX1gO1xuICAgIHJldHVybiB0aGlzLmxvZ2dlcltsdmxdKGFyZ3MpO1xuICB9XG5cbiAgY3JlYXRlKG1vZHVsZU5hbWUpIHtcbiAgICByZXR1cm4gbmV3IExvZ2dlcih0aGlzLmxvZ2dlciwge1xuICAgICAgLi4ueyBwcmVmaXg6IGAke3RoaXMucHJlZml4fToke21vZHVsZU5hbWV9OmAgfSxcbiAgICAgIC4uLnRoaXMub3B0aW9ucyxcbiAgICB9KTtcbiAgfVxuXG4gIGNsb25lKG9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB0aGlzLm9wdGlvbnM7XG4gICAgb3B0aW9ucy5wcmVmaXggPSBvcHRpb25zLnByZWZpeCB8fCB0aGlzLnByZWZpeDtcbiAgICByZXR1cm4gbmV3IExvZ2dlcih0aGlzLmxvZ2dlciwgb3B0aW9ucyk7XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgbmV3IExvZ2dlcigpO1xuIiwiY2xhc3MgRXZlbnRFbWl0dGVyIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgLy8gVGhpcyBpcyBhbiBPYmplY3QgY29udGFpbmluZyBNYXBzOlxuICAgIC8vXG4gICAgLy8geyBbZXZlbnQ6IHN0cmluZ106IE1hcDxsaXN0ZW5lcjogZnVuY3Rpb24sIG51bVRpbWVzQWRkZWQ6IG51bWJlcj4gfVxuICAgIC8vXG4gICAgLy8gV2UgdXNlIGEgTWFwIGZvciBPKDEpIGluc2VydGlvbi9kZWxldGlvbiBhbmQgYmVjYXVzZSBpdCBjYW4gaGF2ZSBmdW5jdGlvbnMgYXMga2V5cy5cbiAgICAvL1xuICAgIC8vIFdlIGtlZXAgdHJhY2sgb2YgbnVtVGltZXNBZGRlZCAodGhlIG51bWJlciBvZiB0aW1lcyBpdCB3YXMgYWRkZWQpIGJlY2F1c2UgaWYgeW91IGF0dGFjaCB0aGUgc2FtZSBsaXN0ZW5lciB0d2ljZSxcbiAgICAvLyB3ZSBzaG91bGQgYWN0dWFsbHkgY2FsbCBpdCB0d2ljZSBmb3IgZWFjaCBlbWl0dGVkIGV2ZW50LlxuICAgIHRoaXMub2JzZXJ2ZXJzID0ge307XG4gIH1cblxuICBvbihldmVudHMsIGxpc3RlbmVyKSB7XG4gICAgZXZlbnRzLnNwbGl0KCcgJykuZm9yRWFjaCgoZXZlbnQpID0+IHtcbiAgICAgIGlmICghdGhpcy5vYnNlcnZlcnNbZXZlbnRdKSB0aGlzLm9ic2VydmVyc1tldmVudF0gPSBuZXcgTWFwKCk7XG4gICAgICBjb25zdCBudW1MaXN0ZW5lcnMgPSB0aGlzLm9ic2VydmVyc1tldmVudF0uZ2V0KGxpc3RlbmVyKSB8fCAwO1xuICAgICAgdGhpcy5vYnNlcnZlcnNbZXZlbnRdLnNldChsaXN0ZW5lciwgbnVtTGlzdGVuZXJzICsgMSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBvZmYoZXZlbnQsIGxpc3RlbmVyKSB7XG4gICAgaWYgKCF0aGlzLm9ic2VydmVyc1tldmVudF0pIHJldHVybjtcbiAgICBpZiAoIWxpc3RlbmVyKSB7XG4gICAgICBkZWxldGUgdGhpcy5vYnNlcnZlcnNbZXZlbnRdO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMub2JzZXJ2ZXJzW2V2ZW50XS5kZWxldGUobGlzdGVuZXIpO1xuICB9XG5cbiAgZW1pdChldmVudCwgLi4uYXJncykge1xuICAgIGlmICh0aGlzLm9ic2VydmVyc1tldmVudF0pIHtcbiAgICAgIGNvbnN0IGNsb25lZCA9IEFycmF5LmZyb20odGhpcy5vYnNlcnZlcnNbZXZlbnRdLmVudHJpZXMoKSk7XG4gICAgICBjbG9uZWQuZm9yRWFjaCgoW29ic2VydmVyLCBudW1UaW1lc0FkZGVkXSkgPT4ge1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG51bVRpbWVzQWRkZWQ7IGkrKykge1xuICAgICAgICAgIG9ic2VydmVyKC4uLmFyZ3MpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5vYnNlcnZlcnNbJyonXSkge1xuICAgICAgY29uc3QgY2xvbmVkID0gQXJyYXkuZnJvbSh0aGlzLm9ic2VydmVyc1snKiddLmVudHJpZXMoKSk7XG4gICAgICBjbG9uZWQuZm9yRWFjaCgoW29ic2VydmVyLCBudW1UaW1lc0FkZGVkXSkgPT4ge1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG51bVRpbWVzQWRkZWQ7IGkrKykge1xuICAgICAgICAgIG9ic2VydmVyLmFwcGx5KG9ic2VydmVyLCBbZXZlbnQsIC4uLmFyZ3NdKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IEV2ZW50RW1pdHRlcjtcbiIsImltcG9ydCBFdmVudEVtaXR0ZXIgZnJvbSAnLi9FdmVudEVtaXR0ZXIuanMnO1xuaW1wb3J0IHsgZ2V0UGF0aCwgZGVlcEZpbmQsIHNldFBhdGgsIGRlZXBFeHRlbmQsIGlzU3RyaW5nIH0gZnJvbSAnLi91dGlscy5qcyc7XG5cbmNsYXNzIFJlc291cmNlU3RvcmUgZXh0ZW5kcyBFdmVudEVtaXR0ZXIge1xuICBjb25zdHJ1Y3RvcihkYXRhLCBvcHRpb25zID0geyBuczogWyd0cmFuc2xhdGlvbiddLCBkZWZhdWx0TlM6ICd0cmFuc2xhdGlvbicgfSkge1xuICAgIHN1cGVyKCk7XG5cbiAgICB0aGlzLmRhdGEgPSBkYXRhIHx8IHt9O1xuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG4gICAgaWYgKHRoaXMub3B0aW9ucy5rZXlTZXBhcmF0b3IgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5vcHRpb25zLmtleVNlcGFyYXRvciA9ICcuJztcbiAgICB9XG4gICAgaWYgKHRoaXMub3B0aW9ucy5pZ25vcmVKU09OU3RydWN0dXJlID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMub3B0aW9ucy5pZ25vcmVKU09OU3RydWN0dXJlID0gdHJ1ZTtcbiAgICB9XG4gIH1cblxuICBhZGROYW1lc3BhY2VzKG5zKSB7XG4gICAgaWYgKHRoaXMub3B0aW9ucy5ucy5pbmRleE9mKG5zKSA8IDApIHtcbiAgICAgIHRoaXMub3B0aW9ucy5ucy5wdXNoKG5zKTtcbiAgICB9XG4gIH1cblxuICByZW1vdmVOYW1lc3BhY2VzKG5zKSB7XG4gICAgY29uc3QgaW5kZXggPSB0aGlzLm9wdGlvbnMubnMuaW5kZXhPZihucyk7XG4gICAgaWYgKGluZGV4ID4gLTEpIHtcbiAgICAgIHRoaXMub3B0aW9ucy5ucy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgIH1cbiAgfVxuXG4gIGdldFJlc291cmNlKGxuZywgbnMsIGtleSwgb3B0aW9ucyA9IHt9KSB7XG4gICAgY29uc3Qga2V5U2VwYXJhdG9yID1cbiAgICAgIG9wdGlvbnMua2V5U2VwYXJhdG9yICE9PSB1bmRlZmluZWQgPyBvcHRpb25zLmtleVNlcGFyYXRvciA6IHRoaXMub3B0aW9ucy5rZXlTZXBhcmF0b3I7XG5cbiAgICBjb25zdCBpZ25vcmVKU09OU3RydWN0dXJlID1cbiAgICAgIG9wdGlvbnMuaWdub3JlSlNPTlN0cnVjdHVyZSAhPT0gdW5kZWZpbmVkXG4gICAgICAgID8gb3B0aW9ucy5pZ25vcmVKU09OU3RydWN0dXJlXG4gICAgICAgIDogdGhpcy5vcHRpb25zLmlnbm9yZUpTT05TdHJ1Y3R1cmU7XG5cbiAgICBsZXQgcGF0aDtcbiAgICBpZiAobG5nLmluZGV4T2YoJy4nKSA+IC0xKSB7XG4gICAgICBwYXRoID0gbG5nLnNwbGl0KCcuJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHBhdGggPSBbbG5nLCBuc107XG4gICAgICBpZiAoa2V5KSB7XG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KGtleSkpIHtcbiAgICAgICAgICBwYXRoLnB1c2goLi4ua2V5KTtcbiAgICAgICAgfSBlbHNlIGlmIChpc1N0cmluZyhrZXkpICYmIGtleVNlcGFyYXRvcikge1xuICAgICAgICAgIHBhdGgucHVzaCguLi5rZXkuc3BsaXQoa2V5U2VwYXJhdG9yKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcGF0aC5wdXNoKGtleSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCByZXN1bHQgPSBnZXRQYXRoKHRoaXMuZGF0YSwgcGF0aCk7XG4gICAgaWYgKCFyZXN1bHQgJiYgIW5zICYmICFrZXkgJiYgbG5nLmluZGV4T2YoJy4nKSA+IC0xKSB7XG4gICAgICBsbmcgPSBwYXRoWzBdO1xuICAgICAgbnMgPSBwYXRoWzFdO1xuICAgICAga2V5ID0gcGF0aC5zbGljZSgyKS5qb2luKCcuJyk7XG4gICAgfVxuICAgIGlmIChyZXN1bHQgfHwgIWlnbm9yZUpTT05TdHJ1Y3R1cmUgfHwgIWlzU3RyaW5nKGtleSkpIHJldHVybiByZXN1bHQ7XG5cbiAgICByZXR1cm4gZGVlcEZpbmQodGhpcy5kYXRhPy5bbG5nXT8uW25zXSwga2V5LCBrZXlTZXBhcmF0b3IpO1xuICB9XG5cbiAgYWRkUmVzb3VyY2UobG5nLCBucywga2V5LCB2YWx1ZSwgb3B0aW9ucyA9IHsgc2lsZW50OiBmYWxzZSB9KSB7XG4gICAgY29uc3Qga2V5U2VwYXJhdG9yID1cbiAgICAgIG9wdGlvbnMua2V5U2VwYXJhdG9yICE9PSB1bmRlZmluZWQgPyBvcHRpb25zLmtleVNlcGFyYXRvciA6IHRoaXMub3B0aW9ucy5rZXlTZXBhcmF0b3I7XG5cbiAgICBsZXQgcGF0aCA9IFtsbmcsIG5zXTtcbiAgICBpZiAoa2V5KSBwYXRoID0gcGF0aC5jb25jYXQoa2V5U2VwYXJhdG9yID8ga2V5LnNwbGl0KGtleVNlcGFyYXRvcikgOiBrZXkpO1xuXG4gICAgaWYgKGxuZy5pbmRleE9mKCcuJykgPiAtMSkge1xuICAgICAgcGF0aCA9IGxuZy5zcGxpdCgnLicpO1xuICAgICAgdmFsdWUgPSBucztcbiAgICAgIG5zID0gcGF0aFsxXTtcbiAgICB9XG5cbiAgICB0aGlzLmFkZE5hbWVzcGFjZXMobnMpO1xuXG4gICAgc2V0UGF0aCh0aGlzLmRhdGEsIHBhdGgsIHZhbHVlKTtcblxuICAgIGlmICghb3B0aW9ucy5zaWxlbnQpIHRoaXMuZW1pdCgnYWRkZWQnLCBsbmcsIG5zLCBrZXksIHZhbHVlKTtcbiAgfVxuXG4gIGFkZFJlc291cmNlcyhsbmcsIG5zLCByZXNvdXJjZXMsIG9wdGlvbnMgPSB7IHNpbGVudDogZmFsc2UgfSkge1xuICAgIC8qIGVzbGludCBuby1yZXN0cmljdGVkLXN5bnRheDogMCAqL1xuICAgIGZvciAoY29uc3QgbSBpbiByZXNvdXJjZXMpIHtcbiAgICAgIGlmIChpc1N0cmluZyhyZXNvdXJjZXNbbV0pIHx8IEFycmF5LmlzQXJyYXkocmVzb3VyY2VzW21dKSlcbiAgICAgICAgdGhpcy5hZGRSZXNvdXJjZShsbmcsIG5zLCBtLCByZXNvdXJjZXNbbV0sIHsgc2lsZW50OiB0cnVlIH0pO1xuICAgIH1cbiAgICBpZiAoIW9wdGlvbnMuc2lsZW50KSB0aGlzLmVtaXQoJ2FkZGVkJywgbG5nLCBucywgcmVzb3VyY2VzKTtcbiAgfVxuXG4gIGFkZFJlc291cmNlQnVuZGxlKFxuICAgIGxuZyxcbiAgICBucyxcbiAgICByZXNvdXJjZXMsXG4gICAgZGVlcCxcbiAgICBvdmVyd3JpdGUsXG4gICAgb3B0aW9ucyA9IHsgc2lsZW50OiBmYWxzZSwgc2tpcENvcHk6IGZhbHNlIH0sXG4gICkge1xuICAgIGxldCBwYXRoID0gW2xuZywgbnNdO1xuICAgIGlmIChsbmcuaW5kZXhPZignLicpID4gLTEpIHtcbiAgICAgIHBhdGggPSBsbmcuc3BsaXQoJy4nKTtcbiAgICAgIGRlZXAgPSByZXNvdXJjZXM7XG4gICAgICByZXNvdXJjZXMgPSBucztcbiAgICAgIG5zID0gcGF0aFsxXTtcbiAgICB9XG5cbiAgICB0aGlzLmFkZE5hbWVzcGFjZXMobnMpO1xuXG4gICAgbGV0IHBhY2sgPSBnZXRQYXRoKHRoaXMuZGF0YSwgcGF0aCkgfHwge307XG5cbiAgICBpZiAoIW9wdGlvbnMuc2tpcENvcHkpIHJlc291cmNlcyA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkocmVzb3VyY2VzKSk7IC8vIG1ha2UgYSBjb3B5IHRvIGZpeCAjMjA4MVxuXG4gICAgaWYgKGRlZXApIHtcbiAgICAgIGRlZXBFeHRlbmQocGFjaywgcmVzb3VyY2VzLCBvdmVyd3JpdGUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBwYWNrID0geyAuLi5wYWNrLCAuLi5yZXNvdXJjZXMgfTtcbiAgICB9XG5cbiAgICBzZXRQYXRoKHRoaXMuZGF0YSwgcGF0aCwgcGFjayk7XG5cbiAgICBpZiAoIW9wdGlvbnMuc2lsZW50KSB0aGlzLmVtaXQoJ2FkZGVkJywgbG5nLCBucywgcmVzb3VyY2VzKTtcbiAgfVxuXG4gIHJlbW92ZVJlc291cmNlQnVuZGxlKGxuZywgbnMpIHtcbiAgICBpZiAodGhpcy5oYXNSZXNvdXJjZUJ1bmRsZShsbmcsIG5zKSkge1xuICAgICAgZGVsZXRlIHRoaXMuZGF0YVtsbmddW25zXTtcbiAgICB9XG4gICAgdGhpcy5yZW1vdmVOYW1lc3BhY2VzKG5zKTtcblxuICAgIHRoaXMuZW1pdCgncmVtb3ZlZCcsIGxuZywgbnMpO1xuICB9XG5cbiAgaGFzUmVzb3VyY2VCdW5kbGUobG5nLCBucykge1xuICAgIHJldHVybiB0aGlzLmdldFJlc291cmNlKGxuZywgbnMpICE9PSB1bmRlZmluZWQ7XG4gIH1cblxuICBnZXRSZXNvdXJjZUJ1bmRsZShsbmcsIG5zKSB7XG4gICAgaWYgKCFucykgbnMgPSB0aGlzLm9wdGlvbnMuZGVmYXVsdE5TO1xuICAgIHJldHVybiB0aGlzLmdldFJlc291cmNlKGxuZywgbnMpO1xuICB9XG5cbiAgZ2V0RGF0YUJ5TGFuZ3VhZ2UobG5nKSB7XG4gICAgcmV0dXJuIHRoaXMuZGF0YVtsbmddO1xuICB9XG5cbiAgaGFzTGFuZ3VhZ2VTb21lVHJhbnNsYXRpb25zKGxuZykge1xuICAgIGNvbnN0IGRhdGEgPSB0aGlzLmdldERhdGFCeUxhbmd1YWdlKGxuZyk7XG4gICAgY29uc3QgbiA9IChkYXRhICYmIE9iamVjdC5rZXlzKGRhdGEpKSB8fCBbXTtcbiAgICByZXR1cm4gISFuLmZpbmQoKHYpID0+IGRhdGFbdl0gJiYgT2JqZWN0LmtleXMoZGF0YVt2XSkubGVuZ3RoID4gMCk7XG4gIH1cblxuICB0b0pTT04oKSB7XG4gICAgcmV0dXJuIHRoaXMuZGF0YTtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBSZXNvdXJjZVN0b3JlO1xuIiwiZXhwb3J0IGRlZmF1bHQge1xuICBwcm9jZXNzb3JzOiB7fSxcblxuICBhZGRQb3N0UHJvY2Vzc29yKG1vZHVsZSkge1xuICAgIHRoaXMucHJvY2Vzc29yc1ttb2R1bGUubmFtZV0gPSBtb2R1bGU7XG4gIH0sXG5cbiAgaGFuZGxlKHByb2Nlc3NvcnMsIHZhbHVlLCBrZXksIG9wdGlvbnMsIHRyYW5zbGF0b3IpIHtcbiAgICBwcm9jZXNzb3JzLmZvckVhY2goKHByb2Nlc3NvcikgPT4ge1xuICAgICAgdmFsdWUgPSB0aGlzLnByb2Nlc3NvcnNbcHJvY2Vzc29yXT8ucHJvY2Vzcyh2YWx1ZSwga2V5LCBvcHRpb25zLCB0cmFuc2xhdG9yKSA/PyB2YWx1ZTtcbiAgICB9KTtcblxuICAgIHJldHVybiB2YWx1ZTtcbiAgfSxcbn07XG4iLCJpbXBvcnQgYmFzZUxvZ2dlciBmcm9tICcuL2xvZ2dlci5qcyc7XG5pbXBvcnQgRXZlbnRFbWl0dGVyIGZyb20gJy4vRXZlbnRFbWl0dGVyLmpzJztcbmltcG9ydCBwb3N0UHJvY2Vzc29yIGZyb20gJy4vcG9zdFByb2Nlc3Nvci5qcyc7XG5pbXBvcnQgeyBjb3B5IGFzIHV0aWxzQ29weSwgbG9va3NMaWtlT2JqZWN0UGF0aCwgaXNTdHJpbmcgfSBmcm9tICcuL3V0aWxzLmpzJztcblxuY29uc3QgY2hlY2tlZExvYWRlZEZvciA9IHt9O1xuXG5jbGFzcyBUcmFuc2xhdG9yIGV4dGVuZHMgRXZlbnRFbWl0dGVyIHtcbiAgY29uc3RydWN0b3Ioc2VydmljZXMsIG9wdGlvbnMgPSB7fSkge1xuICAgIHN1cGVyKCk7XG5cbiAgICB1dGlsc0NvcHkoXG4gICAgICBbXG4gICAgICAgICdyZXNvdXJjZVN0b3JlJyxcbiAgICAgICAgJ2xhbmd1YWdlVXRpbHMnLFxuICAgICAgICAncGx1cmFsUmVzb2x2ZXInLFxuICAgICAgICAnaW50ZXJwb2xhdG9yJyxcbiAgICAgICAgJ2JhY2tlbmRDb25uZWN0b3InLFxuICAgICAgICAnaTE4bkZvcm1hdCcsXG4gICAgICAgICd1dGlscycsXG4gICAgICBdLFxuICAgICAgc2VydmljZXMsXG4gICAgICB0aGlzLFxuICAgICk7XG5cbiAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuICAgIGlmICh0aGlzLm9wdGlvbnMua2V5U2VwYXJhdG9yID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMub3B0aW9ucy5rZXlTZXBhcmF0b3IgPSAnLic7XG4gICAgfVxuXG4gICAgdGhpcy5sb2dnZXIgPSBiYXNlTG9nZ2VyLmNyZWF0ZSgndHJhbnNsYXRvcicpO1xuICB9XG5cbiAgY2hhbmdlTGFuZ3VhZ2UobG5nKSB7XG4gICAgaWYgKGxuZykgdGhpcy5sYW5ndWFnZSA9IGxuZztcbiAgfVxuXG4gIGV4aXN0cyhrZXksIG9wdGlvbnMgPSB7IGludGVycG9sYXRpb246IHt9IH0pIHtcbiAgICBpZiAoa2V5ID09PSB1bmRlZmluZWQgfHwga2V5ID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgY29uc3QgcmVzb2x2ZWQgPSB0aGlzLnJlc29sdmUoa2V5LCBvcHRpb25zKTtcbiAgICByZXR1cm4gcmVzb2x2ZWQ/LnJlcyAhPT0gdW5kZWZpbmVkO1xuICB9XG5cbiAgZXh0cmFjdEZyb21LZXkoa2V5LCBvcHRpb25zKSB7XG4gICAgbGV0IG5zU2VwYXJhdG9yID1cbiAgICAgIG9wdGlvbnMubnNTZXBhcmF0b3IgIT09IHVuZGVmaW5lZCA/IG9wdGlvbnMubnNTZXBhcmF0b3IgOiB0aGlzLm9wdGlvbnMubnNTZXBhcmF0b3I7XG4gICAgaWYgKG5zU2VwYXJhdG9yID09PSB1bmRlZmluZWQpIG5zU2VwYXJhdG9yID0gJzonO1xuXG4gICAgY29uc3Qga2V5U2VwYXJhdG9yID1cbiAgICAgIG9wdGlvbnMua2V5U2VwYXJhdG9yICE9PSB1bmRlZmluZWQgPyBvcHRpb25zLmtleVNlcGFyYXRvciA6IHRoaXMub3B0aW9ucy5rZXlTZXBhcmF0b3I7XG5cbiAgICBsZXQgbmFtZXNwYWNlcyA9IG9wdGlvbnMubnMgfHwgdGhpcy5vcHRpb25zLmRlZmF1bHROUyB8fCBbXTtcbiAgICBjb25zdCB3b3VsZENoZWNrRm9yTnNJbktleSA9IG5zU2VwYXJhdG9yICYmIGtleS5pbmRleE9mKG5zU2VwYXJhdG9yKSA+IC0xO1xuICAgIGNvbnN0IHNlZW1zTmF0dXJhbExhbmd1YWdlID1cbiAgICAgICF0aGlzLm9wdGlvbnMudXNlckRlZmluZWRLZXlTZXBhcmF0b3IgJiZcbiAgICAgICFvcHRpb25zLmtleVNlcGFyYXRvciAmJlxuICAgICAgIXRoaXMub3B0aW9ucy51c2VyRGVmaW5lZE5zU2VwYXJhdG9yICYmXG4gICAgICAhb3B0aW9ucy5uc1NlcGFyYXRvciAmJlxuICAgICAgIWxvb2tzTGlrZU9iamVjdFBhdGgoa2V5LCBuc1NlcGFyYXRvciwga2V5U2VwYXJhdG9yKTtcbiAgICBpZiAod291bGRDaGVja0Zvck5zSW5LZXkgJiYgIXNlZW1zTmF0dXJhbExhbmd1YWdlKSB7XG4gICAgICBjb25zdCBtID0ga2V5Lm1hdGNoKHRoaXMuaW50ZXJwb2xhdG9yLm5lc3RpbmdSZWdleHApO1xuICAgICAgaWYgKG0gJiYgbS5sZW5ndGggPiAwKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAga2V5LFxuICAgICAgICAgIG5hbWVzcGFjZXM6IGlzU3RyaW5nKG5hbWVzcGFjZXMpID8gW25hbWVzcGFjZXNdIDogbmFtZXNwYWNlcyxcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHBhcnRzID0ga2V5LnNwbGl0KG5zU2VwYXJhdG9yKTtcbiAgICAgIGlmIChcbiAgICAgICAgbnNTZXBhcmF0b3IgIT09IGtleVNlcGFyYXRvciB8fFxuICAgICAgICAobnNTZXBhcmF0b3IgPT09IGtleVNlcGFyYXRvciAmJiB0aGlzLm9wdGlvbnMubnMuaW5kZXhPZihwYXJ0c1swXSkgPiAtMSlcbiAgICAgIClcbiAgICAgICAgbmFtZXNwYWNlcyA9IHBhcnRzLnNoaWZ0KCk7XG4gICAgICBrZXkgPSBwYXJ0cy5qb2luKGtleVNlcGFyYXRvcik7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIGtleSxcbiAgICAgIG5hbWVzcGFjZXM6IGlzU3RyaW5nKG5hbWVzcGFjZXMpID8gW25hbWVzcGFjZXNdIDogbmFtZXNwYWNlcyxcbiAgICB9O1xuICB9XG5cbiAgdHJhbnNsYXRlKGtleXMsIG9wdGlvbnMsIGxhc3RLZXkpIHtcbiAgICBpZiAodHlwZW9mIG9wdGlvbnMgIT09ICdvYmplY3QnICYmIHRoaXMub3B0aW9ucy5vdmVybG9hZFRyYW5zbGF0aW9uT3B0aW9uSGFuZGxlcikge1xuICAgICAgLyogZXNsaW50IHByZWZlci1yZXN0LXBhcmFtczogMCAqL1xuICAgICAgb3B0aW9ucyA9IHRoaXMub3B0aW9ucy5vdmVybG9hZFRyYW5zbGF0aW9uT3B0aW9uSGFuZGxlcihhcmd1bWVudHMpO1xuICAgIH1cbiAgICBpZiAodHlwZW9mIG9wdGlvbnMgPT09ICdvYmplY3QnKSBvcHRpb25zID0geyAuLi5vcHRpb25zIH07XG4gICAgaWYgKCFvcHRpb25zKSBvcHRpb25zID0ge307XG5cbiAgICAvLyBub24gdmFsaWQga2V5cyBoYW5kbGluZ1xuICAgIGlmIChrZXlzID09PSB1bmRlZmluZWQgfHwga2V5cyA9PT0gbnVsbCAvKiB8fCBrZXlzID09PSAnJyAqLykgcmV0dXJuICcnO1xuICAgIGlmICghQXJyYXkuaXNBcnJheShrZXlzKSkga2V5cyA9IFtTdHJpbmcoa2V5cyldO1xuXG4gICAgY29uc3QgcmV0dXJuRGV0YWlscyA9XG4gICAgICBvcHRpb25zLnJldHVybkRldGFpbHMgIT09IHVuZGVmaW5lZCA/IG9wdGlvbnMucmV0dXJuRGV0YWlscyA6IHRoaXMub3B0aW9ucy5yZXR1cm5EZXRhaWxzO1xuXG4gICAgLy8gc2VwYXJhdG9yc1xuICAgIGNvbnN0IGtleVNlcGFyYXRvciA9XG4gICAgICBvcHRpb25zLmtleVNlcGFyYXRvciAhPT0gdW5kZWZpbmVkID8gb3B0aW9ucy5rZXlTZXBhcmF0b3IgOiB0aGlzLm9wdGlvbnMua2V5U2VwYXJhdG9yO1xuXG4gICAgLy8gZ2V0IG5hbWVzcGFjZShzKVxuICAgIGNvbnN0IHsga2V5LCBuYW1lc3BhY2VzIH0gPSB0aGlzLmV4dHJhY3RGcm9tS2V5KGtleXNba2V5cy5sZW5ndGggLSAxXSwgb3B0aW9ucyk7XG4gICAgY29uc3QgbmFtZXNwYWNlID0gbmFtZXNwYWNlc1tuYW1lc3BhY2VzLmxlbmd0aCAtIDFdO1xuXG4gICAgLy8gcmV0dXJuIGtleSBvbiBDSU1vZGVcbiAgICBjb25zdCBsbmcgPSBvcHRpb25zLmxuZyB8fCB0aGlzLmxhbmd1YWdlO1xuICAgIGNvbnN0IGFwcGVuZE5hbWVzcGFjZVRvQ0lNb2RlID1cbiAgICAgIG9wdGlvbnMuYXBwZW5kTmFtZXNwYWNlVG9DSU1vZGUgfHwgdGhpcy5vcHRpb25zLmFwcGVuZE5hbWVzcGFjZVRvQ0lNb2RlO1xuICAgIGlmIChsbmc/LnRvTG93ZXJDYXNlKCkgPT09ICdjaW1vZGUnKSB7XG4gICAgICBpZiAoYXBwZW5kTmFtZXNwYWNlVG9DSU1vZGUpIHtcbiAgICAgICAgY29uc3QgbnNTZXBhcmF0b3IgPSBvcHRpb25zLm5zU2VwYXJhdG9yIHx8IHRoaXMub3B0aW9ucy5uc1NlcGFyYXRvcjtcbiAgICAgICAgaWYgKHJldHVybkRldGFpbHMpIHtcbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmVzOiBgJHtuYW1lc3BhY2V9JHtuc1NlcGFyYXRvcn0ke2tleX1gLFxuICAgICAgICAgICAgdXNlZEtleToga2V5LFxuICAgICAgICAgICAgZXhhY3RVc2VkS2V5OiBrZXksXG4gICAgICAgICAgICB1c2VkTG5nOiBsbmcsXG4gICAgICAgICAgICB1c2VkTlM6IG5hbWVzcGFjZSxcbiAgICAgICAgICAgIHVzZWRQYXJhbXM6IHRoaXMuZ2V0VXNlZFBhcmFtc0RldGFpbHMob3B0aW9ucyksXG4gICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYCR7bmFtZXNwYWNlfSR7bnNTZXBhcmF0b3J9JHtrZXl9YDtcbiAgICAgIH1cblxuICAgICAgaWYgKHJldHVybkRldGFpbHMpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICByZXM6IGtleSxcbiAgICAgICAgICB1c2VkS2V5OiBrZXksXG4gICAgICAgICAgZXhhY3RVc2VkS2V5OiBrZXksXG4gICAgICAgICAgdXNlZExuZzogbG5nLFxuICAgICAgICAgIHVzZWROUzogbmFtZXNwYWNlLFxuICAgICAgICAgIHVzZWRQYXJhbXM6IHRoaXMuZ2V0VXNlZFBhcmFtc0RldGFpbHMob3B0aW9ucyksXG4gICAgICAgIH07XG4gICAgICB9XG4gICAgICByZXR1cm4ga2V5O1xuICAgIH1cblxuICAgIC8vIHJlc29sdmUgZnJvbSBzdG9yZVxuICAgIGNvbnN0IHJlc29sdmVkID0gdGhpcy5yZXNvbHZlKGtleXMsIG9wdGlvbnMpO1xuICAgIGxldCByZXMgPSByZXNvbHZlZD8ucmVzO1xuICAgIGNvbnN0IHJlc1VzZWRLZXkgPSByZXNvbHZlZD8udXNlZEtleSB8fCBrZXk7XG4gICAgY29uc3QgcmVzRXhhY3RVc2VkS2V5ID0gcmVzb2x2ZWQ/LmV4YWN0VXNlZEtleSB8fCBrZXk7XG5cbiAgICBjb25zdCByZXNUeXBlID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5hcHBseShyZXMpO1xuICAgIGNvbnN0IG5vT2JqZWN0ID0gWydbb2JqZWN0IE51bWJlcl0nLCAnW29iamVjdCBGdW5jdGlvbl0nLCAnW29iamVjdCBSZWdFeHBdJ107XG4gICAgY29uc3Qgam9pbkFycmF5cyA9XG4gICAgICBvcHRpb25zLmpvaW5BcnJheXMgIT09IHVuZGVmaW5lZCA/IG9wdGlvbnMuam9pbkFycmF5cyA6IHRoaXMub3B0aW9ucy5qb2luQXJyYXlzO1xuXG4gICAgLy8gb2JqZWN0XG4gICAgY29uc3QgaGFuZGxlQXNPYmplY3RJbkkxOG5Gb3JtYXQgPSAhdGhpcy5pMThuRm9ybWF0IHx8IHRoaXMuaTE4bkZvcm1hdC5oYW5kbGVBc09iamVjdDtcbiAgICBjb25zdCBoYW5kbGVBc09iamVjdCA9ICFpc1N0cmluZyhyZXMpICYmIHR5cGVvZiByZXMgIT09ICdib29sZWFuJyAmJiB0eXBlb2YgcmVzICE9PSAnbnVtYmVyJztcbiAgICBpZiAoXG4gICAgICBoYW5kbGVBc09iamVjdEluSTE4bkZvcm1hdCAmJlxuICAgICAgcmVzICYmXG4gICAgICBoYW5kbGVBc09iamVjdCAmJlxuICAgICAgbm9PYmplY3QuaW5kZXhPZihyZXNUeXBlKSA8IDAgJiZcbiAgICAgICEoaXNTdHJpbmcoam9pbkFycmF5cykgJiYgQXJyYXkuaXNBcnJheShyZXMpKVxuICAgICkge1xuICAgICAgaWYgKCFvcHRpb25zLnJldHVybk9iamVjdHMgJiYgIXRoaXMub3B0aW9ucy5yZXR1cm5PYmplY3RzKSB7XG4gICAgICAgIGlmICghdGhpcy5vcHRpb25zLnJldHVybmVkT2JqZWN0SGFuZGxlcikge1xuICAgICAgICAgIHRoaXMubG9nZ2VyLndhcm4oJ2FjY2Vzc2luZyBhbiBvYmplY3QgLSBidXQgcmV0dXJuT2JqZWN0cyBvcHRpb25zIGlzIG5vdCBlbmFibGVkIScpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHIgPSB0aGlzLm9wdGlvbnMucmV0dXJuZWRPYmplY3RIYW5kbGVyXG4gICAgICAgICAgPyB0aGlzLm9wdGlvbnMucmV0dXJuZWRPYmplY3RIYW5kbGVyKHJlc1VzZWRLZXksIHJlcywgeyAuLi5vcHRpb25zLCBuczogbmFtZXNwYWNlcyB9KVxuICAgICAgICAgIDogYGtleSAnJHtrZXl9ICgke3RoaXMubGFuZ3VhZ2V9KScgcmV0dXJuZWQgYW4gb2JqZWN0IGluc3RlYWQgb2Ygc3RyaW5nLmA7XG4gICAgICAgIGlmIChyZXR1cm5EZXRhaWxzKSB7XG4gICAgICAgICAgcmVzb2x2ZWQucmVzID0gcjtcbiAgICAgICAgICByZXNvbHZlZC51c2VkUGFyYW1zID0gdGhpcy5nZXRVc2VkUGFyYW1zRGV0YWlscyhvcHRpb25zKTtcbiAgICAgICAgICByZXR1cm4gcmVzb2x2ZWQ7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHI7XG4gICAgICB9XG5cbiAgICAgIC8vIGlmIHdlIGdvdCBhIHNlcGFyYXRvciB3ZSBsb29wIG92ZXIgY2hpbGRyZW4gLSBlbHNlIHdlIGp1c3QgcmV0dXJuIG9iamVjdCBhcyBpc1xuICAgICAgLy8gYXMgaGF2aW5nIGl0IHNldCB0byBmYWxzZSBtZWFucyBubyBoaWVyYXJjaHkgc28gbm8gbG9va3VwIGZvciBuZXN0ZWQgdmFsdWVzXG4gICAgICBpZiAoa2V5U2VwYXJhdG9yKSB7XG4gICAgICAgIGNvbnN0IHJlc1R5cGVJc0FycmF5ID0gQXJyYXkuaXNBcnJheShyZXMpO1xuICAgICAgICBjb25zdCBjb3B5ID0gcmVzVHlwZUlzQXJyYXkgPyBbXSA6IHt9OyAvLyBhcHBseSBjaGlsZCB0cmFuc2xhdGlvbiBvbiBhIGNvcHlcblxuICAgICAgICAvKiBlc2xpbnQgbm8tcmVzdHJpY3RlZC1zeW50YXg6IDAgKi9cbiAgICAgICAgY29uc3QgbmV3S2V5VG9Vc2UgPSByZXNUeXBlSXNBcnJheSA/IHJlc0V4YWN0VXNlZEtleSA6IHJlc1VzZWRLZXk7XG4gICAgICAgIGZvciAoY29uc3QgbSBpbiByZXMpIHtcbiAgICAgICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHJlcywgbSkpIHtcbiAgICAgICAgICAgIGNvbnN0IGRlZXBLZXkgPSBgJHtuZXdLZXlUb1VzZX0ke2tleVNlcGFyYXRvcn0ke219YDtcbiAgICAgICAgICAgIGNvcHlbbV0gPSB0aGlzLnRyYW5zbGF0ZShkZWVwS2V5LCB7XG4gICAgICAgICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICAgICAgICAgIC4uLnsgam9pbkFycmF5czogZmFsc2UsIG5zOiBuYW1lc3BhY2VzIH0sXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmIChjb3B5W21dID09PSBkZWVwS2V5KSBjb3B5W21dID0gcmVzW21dOyAvLyBpZiBub3RoaW5nIGZvdW5kIHVzZSBvcmlnaW5hbCB2YWx1ZSBhcyBmYWxsYmFja1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXMgPSBjb3B5O1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoaGFuZGxlQXNPYmplY3RJbkkxOG5Gb3JtYXQgJiYgaXNTdHJpbmcoam9pbkFycmF5cykgJiYgQXJyYXkuaXNBcnJheShyZXMpKSB7XG4gICAgICAvLyBhcnJheSBzcGVjaWFsIHRyZWF0bWVudFxuICAgICAgcmVzID0gcmVzLmpvaW4oam9pbkFycmF5cyk7XG4gICAgICBpZiAocmVzKSByZXMgPSB0aGlzLmV4dGVuZFRyYW5zbGF0aW9uKHJlcywga2V5cywgb3B0aW9ucywgbGFzdEtleSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIHN0cmluZywgZW1wdHkgb3IgbnVsbFxuICAgICAgbGV0IHVzZWREZWZhdWx0ID0gZmFsc2U7XG4gICAgICBsZXQgdXNlZEtleSA9IGZhbHNlO1xuXG4gICAgICBjb25zdCBuZWVkc1BsdXJhbEhhbmRsaW5nID0gb3B0aW9ucy5jb3VudCAhPT0gdW5kZWZpbmVkICYmICFpc1N0cmluZyhvcHRpb25zLmNvdW50KTtcbiAgICAgIGNvbnN0IGhhc0RlZmF1bHRWYWx1ZSA9IFRyYW5zbGF0b3IuaGFzRGVmYXVsdFZhbHVlKG9wdGlvbnMpO1xuICAgICAgY29uc3QgZGVmYXVsdFZhbHVlU3VmZml4ID0gbmVlZHNQbHVyYWxIYW5kbGluZ1xuICAgICAgICA/IHRoaXMucGx1cmFsUmVzb2x2ZXIuZ2V0U3VmZml4KGxuZywgb3B0aW9ucy5jb3VudCwgb3B0aW9ucylcbiAgICAgICAgOiAnJztcbiAgICAgIGNvbnN0IGRlZmF1bHRWYWx1ZVN1ZmZpeE9yZGluYWxGYWxsYmFjayA9XG4gICAgICAgIG9wdGlvbnMub3JkaW5hbCAmJiBuZWVkc1BsdXJhbEhhbmRsaW5nXG4gICAgICAgICAgPyB0aGlzLnBsdXJhbFJlc29sdmVyLmdldFN1ZmZpeChsbmcsIG9wdGlvbnMuY291bnQsIHsgb3JkaW5hbDogZmFsc2UgfSlcbiAgICAgICAgICA6ICcnO1xuICAgICAgY29uc3QgbmVlZHNaZXJvU3VmZml4TG9va3VwID0gbmVlZHNQbHVyYWxIYW5kbGluZyAmJiAhb3B0aW9ucy5vcmRpbmFsICYmIG9wdGlvbnMuY291bnQgPT09IDA7XG4gICAgICBjb25zdCBkZWZhdWx0VmFsdWUgPVxuICAgICAgICAobmVlZHNaZXJvU3VmZml4TG9va3VwICYmIG9wdGlvbnNbYGRlZmF1bHRWYWx1ZSR7dGhpcy5vcHRpb25zLnBsdXJhbFNlcGFyYXRvcn16ZXJvYF0pIHx8XG4gICAgICAgIG9wdGlvbnNbYGRlZmF1bHRWYWx1ZSR7ZGVmYXVsdFZhbHVlU3VmZml4fWBdIHx8XG4gICAgICAgIG9wdGlvbnNbYGRlZmF1bHRWYWx1ZSR7ZGVmYXVsdFZhbHVlU3VmZml4T3JkaW5hbEZhbGxiYWNrfWBdIHx8XG4gICAgICAgIG9wdGlvbnMuZGVmYXVsdFZhbHVlO1xuXG4gICAgICAvLyBmYWxsYmFjayB2YWx1ZVxuICAgICAgaWYgKCF0aGlzLmlzVmFsaWRMb29rdXAocmVzKSAmJiBoYXNEZWZhdWx0VmFsdWUpIHtcbiAgICAgICAgdXNlZERlZmF1bHQgPSB0cnVlO1xuICAgICAgICByZXMgPSBkZWZhdWx0VmFsdWU7XG4gICAgICB9XG4gICAgICBpZiAoIXRoaXMuaXNWYWxpZExvb2t1cChyZXMpKSB7XG4gICAgICAgIHVzZWRLZXkgPSB0cnVlO1xuICAgICAgICByZXMgPSBrZXk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IG1pc3NpbmdLZXlOb1ZhbHVlRmFsbGJhY2tUb0tleSA9XG4gICAgICAgIG9wdGlvbnMubWlzc2luZ0tleU5vVmFsdWVGYWxsYmFja1RvS2V5IHx8IHRoaXMub3B0aW9ucy5taXNzaW5nS2V5Tm9WYWx1ZUZhbGxiYWNrVG9LZXk7XG4gICAgICBjb25zdCByZXNGb3JNaXNzaW5nID0gbWlzc2luZ0tleU5vVmFsdWVGYWxsYmFja1RvS2V5ICYmIHVzZWRLZXkgPyB1bmRlZmluZWQgOiByZXM7XG5cbiAgICAgIC8vIHNhdmUgbWlzc2luZ1xuICAgICAgY29uc3QgdXBkYXRlTWlzc2luZyA9IGhhc0RlZmF1bHRWYWx1ZSAmJiBkZWZhdWx0VmFsdWUgIT09IHJlcyAmJiB0aGlzLm9wdGlvbnMudXBkYXRlTWlzc2luZztcbiAgICAgIGlmICh1c2VkS2V5IHx8IHVzZWREZWZhdWx0IHx8IHVwZGF0ZU1pc3NpbmcpIHtcbiAgICAgICAgdGhpcy5sb2dnZXIubG9nKFxuICAgICAgICAgIHVwZGF0ZU1pc3NpbmcgPyAndXBkYXRlS2V5JyA6ICdtaXNzaW5nS2V5JyxcbiAgICAgICAgICBsbmcsXG4gICAgICAgICAgbmFtZXNwYWNlLFxuICAgICAgICAgIGtleSxcbiAgICAgICAgICB1cGRhdGVNaXNzaW5nID8gZGVmYXVsdFZhbHVlIDogcmVzLFxuICAgICAgICApO1xuICAgICAgICBpZiAoa2V5U2VwYXJhdG9yKSB7XG4gICAgICAgICAgY29uc3QgZmsgPSB0aGlzLnJlc29sdmUoa2V5LCB7IC4uLm9wdGlvbnMsIGtleVNlcGFyYXRvcjogZmFsc2UgfSk7XG4gICAgICAgICAgaWYgKGZrICYmIGZrLnJlcylcbiAgICAgICAgICAgIHRoaXMubG9nZ2VyLndhcm4oXG4gICAgICAgICAgICAgICdTZWVtcyB0aGUgbG9hZGVkIHRyYW5zbGF0aW9ucyB3ZXJlIGluIGZsYXQgSlNPTiBmb3JtYXQgaW5zdGVhZCBvZiBuZXN0ZWQuIEVpdGhlciBzZXQga2V5U2VwYXJhdG9yOiBmYWxzZSBvbiBpbml0IG9yIG1ha2Ugc3VyZSB5b3VyIHRyYW5zbGF0aW9ucyBhcmUgcHVibGlzaGVkIGluIG5lc3RlZCBmb3JtYXQuJyxcbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgbG5ncyA9IFtdO1xuICAgICAgICBjb25zdCBmYWxsYmFja0xuZ3MgPSB0aGlzLmxhbmd1YWdlVXRpbHMuZ2V0RmFsbGJhY2tDb2RlcyhcbiAgICAgICAgICB0aGlzLm9wdGlvbnMuZmFsbGJhY2tMbmcsXG4gICAgICAgICAgb3B0aW9ucy5sbmcgfHwgdGhpcy5sYW5ndWFnZSxcbiAgICAgICAgKTtcbiAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5zYXZlTWlzc2luZ1RvID09PSAnZmFsbGJhY2snICYmIGZhbGxiYWNrTG5ncyAmJiBmYWxsYmFja0xuZ3NbMF0pIHtcbiAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGZhbGxiYWNrTG5ncy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgbG5ncy5wdXNoKGZhbGxiYWNrTG5nc1tpXSk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKHRoaXMub3B0aW9ucy5zYXZlTWlzc2luZ1RvID09PSAnYWxsJykge1xuICAgICAgICAgIGxuZ3MgPSB0aGlzLmxhbmd1YWdlVXRpbHMudG9SZXNvbHZlSGllcmFyY2h5KG9wdGlvbnMubG5nIHx8IHRoaXMubGFuZ3VhZ2UpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGxuZ3MucHVzaChvcHRpb25zLmxuZyB8fCB0aGlzLmxhbmd1YWdlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHNlbmQgPSAobCwgaywgc3BlY2lmaWNEZWZhdWx0VmFsdWUpID0+IHtcbiAgICAgICAgICBjb25zdCBkZWZhdWx0Rm9yTWlzc2luZyA9XG4gICAgICAgICAgICBoYXNEZWZhdWx0VmFsdWUgJiYgc3BlY2lmaWNEZWZhdWx0VmFsdWUgIT09IHJlcyA/IHNwZWNpZmljRGVmYXVsdFZhbHVlIDogcmVzRm9yTWlzc2luZztcbiAgICAgICAgICBpZiAodGhpcy5vcHRpb25zLm1pc3NpbmdLZXlIYW5kbGVyKSB7XG4gICAgICAgICAgICB0aGlzLm9wdGlvbnMubWlzc2luZ0tleUhhbmRsZXIoXG4gICAgICAgICAgICAgIGwsXG4gICAgICAgICAgICAgIG5hbWVzcGFjZSxcbiAgICAgICAgICAgICAgayxcbiAgICAgICAgICAgICAgZGVmYXVsdEZvck1pc3NpbmcsXG4gICAgICAgICAgICAgIHVwZGF0ZU1pc3NpbmcsXG4gICAgICAgICAgICAgIG9wdGlvbnMsXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH0gZWxzZSBpZiAodGhpcy5iYWNrZW5kQ29ubmVjdG9yPy5zYXZlTWlzc2luZykge1xuICAgICAgICAgICAgdGhpcy5iYWNrZW5kQ29ubmVjdG9yLnNhdmVNaXNzaW5nKFxuICAgICAgICAgICAgICBsLFxuICAgICAgICAgICAgICBuYW1lc3BhY2UsXG4gICAgICAgICAgICAgIGssXG4gICAgICAgICAgICAgIGRlZmF1bHRGb3JNaXNzaW5nLFxuICAgICAgICAgICAgICB1cGRhdGVNaXNzaW5nLFxuICAgICAgICAgICAgICBvcHRpb25zLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdGhpcy5lbWl0KCdtaXNzaW5nS2V5JywgbCwgbmFtZXNwYWNlLCBrLCByZXMpO1xuICAgICAgICB9O1xuXG4gICAgICAgIGlmICh0aGlzLm9wdGlvbnMuc2F2ZU1pc3NpbmcpIHtcbiAgICAgICAgICBpZiAodGhpcy5vcHRpb25zLnNhdmVNaXNzaW5nUGx1cmFscyAmJiBuZWVkc1BsdXJhbEhhbmRsaW5nKSB7XG4gICAgICAgICAgICBsbmdzLmZvckVhY2goKGxhbmd1YWdlKSA9PiB7XG4gICAgICAgICAgICAgIGNvbnN0IHN1ZmZpeGVzID0gdGhpcy5wbHVyYWxSZXNvbHZlci5nZXRTdWZmaXhlcyhsYW5ndWFnZSwgb3B0aW9ucyk7XG4gICAgICAgICAgICAgIGlmIChcbiAgICAgICAgICAgICAgICBuZWVkc1plcm9TdWZmaXhMb29rdXAgJiZcbiAgICAgICAgICAgICAgICBvcHRpb25zW2BkZWZhdWx0VmFsdWUke3RoaXMub3B0aW9ucy5wbHVyYWxTZXBhcmF0b3J9emVyb2BdICYmXG4gICAgICAgICAgICAgICAgc3VmZml4ZXMuaW5kZXhPZihgJHt0aGlzLm9wdGlvbnMucGx1cmFsU2VwYXJhdG9yfXplcm9gKSA8IDBcbiAgICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgICAgc3VmZml4ZXMucHVzaChgJHt0aGlzLm9wdGlvbnMucGx1cmFsU2VwYXJhdG9yfXplcm9gKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBzdWZmaXhlcy5mb3JFYWNoKChzdWZmaXgpID0+IHtcbiAgICAgICAgICAgICAgICBzZW5kKFtsYW5ndWFnZV0sIGtleSArIHN1ZmZpeCwgb3B0aW9uc1tgZGVmYXVsdFZhbHVlJHtzdWZmaXh9YF0gfHwgZGVmYXVsdFZhbHVlKTtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc2VuZChsbmdzLCBrZXksIGRlZmF1bHRWYWx1ZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIGV4dGVuZFxuICAgICAgcmVzID0gdGhpcy5leHRlbmRUcmFuc2xhdGlvbihyZXMsIGtleXMsIG9wdGlvbnMsIHJlc29sdmVkLCBsYXN0S2V5KTtcblxuICAgICAgLy8gYXBwZW5kIG5hbWVzcGFjZSBpZiBzdGlsbCBrZXlcbiAgICAgIGlmICh1c2VkS2V5ICYmIHJlcyA9PT0ga2V5ICYmIHRoaXMub3B0aW9ucy5hcHBlbmROYW1lc3BhY2VUb01pc3NpbmdLZXkpXG4gICAgICAgIHJlcyA9IGAke25hbWVzcGFjZX06JHtrZXl9YDtcblxuICAgICAgLy8gcGFyc2VNaXNzaW5nS2V5SGFuZGxlclxuICAgICAgaWYgKCh1c2VkS2V5IHx8IHVzZWREZWZhdWx0KSAmJiB0aGlzLm9wdGlvbnMucGFyc2VNaXNzaW5nS2V5SGFuZGxlcikge1xuICAgICAgICByZXMgPSB0aGlzLm9wdGlvbnMucGFyc2VNaXNzaW5nS2V5SGFuZGxlcihcbiAgICAgICAgICB0aGlzLm9wdGlvbnMuYXBwZW5kTmFtZXNwYWNlVG9NaXNzaW5nS2V5ID8gYCR7bmFtZXNwYWNlfToke2tleX1gIDoga2V5LFxuICAgICAgICAgIHVzZWREZWZhdWx0ID8gcmVzIDogdW5kZWZpbmVkLFxuICAgICAgICApO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIHJldHVyblxuICAgIGlmIChyZXR1cm5EZXRhaWxzKSB7XG4gICAgICByZXNvbHZlZC5yZXMgPSByZXM7XG4gICAgICByZXNvbHZlZC51c2VkUGFyYW1zID0gdGhpcy5nZXRVc2VkUGFyYW1zRGV0YWlscyhvcHRpb25zKTtcbiAgICAgIHJldHVybiByZXNvbHZlZDtcbiAgICB9XG4gICAgcmV0dXJuIHJlcztcbiAgfVxuXG4gIGV4dGVuZFRyYW5zbGF0aW9uKHJlcywga2V5LCBvcHRpb25zLCByZXNvbHZlZCwgbGFzdEtleSkge1xuICAgIGlmICh0aGlzLmkxOG5Gb3JtYXQ/LnBhcnNlKSB7XG4gICAgICByZXMgPSB0aGlzLmkxOG5Gb3JtYXQucGFyc2UoXG4gICAgICAgIHJlcyxcbiAgICAgICAgeyAuLi50aGlzLm9wdGlvbnMuaW50ZXJwb2xhdGlvbi5kZWZhdWx0VmFyaWFibGVzLCAuLi5vcHRpb25zIH0sXG4gICAgICAgIG9wdGlvbnMubG5nIHx8IHRoaXMubGFuZ3VhZ2UgfHwgcmVzb2x2ZWQudXNlZExuZyxcbiAgICAgICAgcmVzb2x2ZWQudXNlZE5TLFxuICAgICAgICByZXNvbHZlZC51c2VkS2V5LFxuICAgICAgICB7IHJlc29sdmVkIH0sXG4gICAgICApO1xuICAgIH0gZWxzZSBpZiAoIW9wdGlvbnMuc2tpcEludGVycG9sYXRpb24pIHtcbiAgICAgIC8vIGkxOG5leHQucGFyc2luZ1xuICAgICAgaWYgKG9wdGlvbnMuaW50ZXJwb2xhdGlvbilcbiAgICAgICAgdGhpcy5pbnRlcnBvbGF0b3IuaW5pdCh7XG4gICAgICAgICAgLi4ub3B0aW9ucyxcbiAgICAgICAgICAuLi57IGludGVycG9sYXRpb246IHsgLi4udGhpcy5vcHRpb25zLmludGVycG9sYXRpb24sIC4uLm9wdGlvbnMuaW50ZXJwb2xhdGlvbiB9IH0sXG4gICAgICAgIH0pO1xuICAgICAgY29uc3Qgc2tpcE9uVmFyaWFibGVzID1cbiAgICAgICAgaXNTdHJpbmcocmVzKSAmJlxuICAgICAgICAob3B0aW9ucz8uaW50ZXJwb2xhdGlvbj8uc2tpcE9uVmFyaWFibGVzICE9PSB1bmRlZmluZWRcbiAgICAgICAgICA/IG9wdGlvbnMuaW50ZXJwb2xhdGlvbi5za2lwT25WYXJpYWJsZXNcbiAgICAgICAgICA6IHRoaXMub3B0aW9ucy5pbnRlcnBvbGF0aW9uLnNraXBPblZhcmlhYmxlcyk7XG4gICAgICBsZXQgbmVzdEJlZjtcbiAgICAgIGlmIChza2lwT25WYXJpYWJsZXMpIHtcbiAgICAgICAgY29uc3QgbmIgPSByZXMubWF0Y2godGhpcy5pbnRlcnBvbGF0b3IubmVzdGluZ1JlZ2V4cCk7XG4gICAgICAgIC8vIGhhcyBuZXN0aW5nIGFmdGJlZm9yZWVyIGludGVycG9sYXRpb25cbiAgICAgICAgbmVzdEJlZiA9IG5iICYmIG5iLmxlbmd0aDtcbiAgICAgIH1cblxuICAgICAgLy8gaW50ZXJwb2xhdGVcbiAgICAgIGxldCBkYXRhID0gb3B0aW9ucy5yZXBsYWNlICYmICFpc1N0cmluZyhvcHRpb25zLnJlcGxhY2UpID8gb3B0aW9ucy5yZXBsYWNlIDogb3B0aW9ucztcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMuaW50ZXJwb2xhdGlvbi5kZWZhdWx0VmFyaWFibGVzKVxuICAgICAgICBkYXRhID0geyAuLi50aGlzLm9wdGlvbnMuaW50ZXJwb2xhdGlvbi5kZWZhdWx0VmFyaWFibGVzLCAuLi5kYXRhIH07XG4gICAgICByZXMgPSB0aGlzLmludGVycG9sYXRvci5pbnRlcnBvbGF0ZShcbiAgICAgICAgcmVzLFxuICAgICAgICBkYXRhLFxuICAgICAgICBvcHRpb25zLmxuZyB8fCB0aGlzLmxhbmd1YWdlIHx8IHJlc29sdmVkLnVzZWRMbmcsXG4gICAgICAgIG9wdGlvbnMsXG4gICAgICApO1xuXG4gICAgICAvLyBuZXN0aW5nXG4gICAgICBpZiAoc2tpcE9uVmFyaWFibGVzKSB7XG4gICAgICAgIGNvbnN0IG5hID0gcmVzLm1hdGNoKHRoaXMuaW50ZXJwb2xhdG9yLm5lc3RpbmdSZWdleHApO1xuICAgICAgICAvLyBoYXMgbmVzdGluZyBhZnRlciBpbnRlcnBvbGF0aW9uXG4gICAgICAgIGNvbnN0IG5lc3RBZnQgPSBuYSAmJiBuYS5sZW5ndGg7XG4gICAgICAgIGlmIChuZXN0QmVmIDwgbmVzdEFmdCkgb3B0aW9ucy5uZXN0ID0gZmFsc2U7XG4gICAgICB9XG4gICAgICBpZiAoIW9wdGlvbnMubG5nICYmIHJlc29sdmVkICYmIHJlc29sdmVkLnJlcykgb3B0aW9ucy5sbmcgPSB0aGlzLmxhbmd1YWdlIHx8IHJlc29sdmVkLnVzZWRMbmc7XG4gICAgICBpZiAob3B0aW9ucy5uZXN0ICE9PSBmYWxzZSlcbiAgICAgICAgcmVzID0gdGhpcy5pbnRlcnBvbGF0b3IubmVzdChcbiAgICAgICAgICByZXMsXG4gICAgICAgICAgKC4uLmFyZ3MpID0+IHtcbiAgICAgICAgICAgIGlmIChsYXN0S2V5Py5bMF0gPT09IGFyZ3NbMF0gJiYgIW9wdGlvbnMuY29udGV4dCkge1xuICAgICAgICAgICAgICB0aGlzLmxvZ2dlci53YXJuKFxuICAgICAgICAgICAgICAgIGBJdCBzZWVtcyB5b3UgYXJlIG5lc3RpbmcgcmVjdXJzaXZlbHkga2V5OiAke2FyZ3NbMF19IGluIGtleTogJHtrZXlbMF19YCxcbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhpcy50cmFuc2xhdGUoLi4uYXJncywga2V5KTtcbiAgICAgICAgICB9LFxuICAgICAgICAgIG9wdGlvbnMsXG4gICAgICAgICk7XG5cbiAgICAgIGlmIChvcHRpb25zLmludGVycG9sYXRpb24pIHRoaXMuaW50ZXJwb2xhdG9yLnJlc2V0KCk7XG4gICAgfVxuXG4gICAgLy8gcG9zdCBwcm9jZXNzXG4gICAgY29uc3QgcG9zdFByb2Nlc3MgPSBvcHRpb25zLnBvc3RQcm9jZXNzIHx8IHRoaXMub3B0aW9ucy5wb3N0UHJvY2VzcztcbiAgICBjb25zdCBwb3N0UHJvY2Vzc29yTmFtZXMgPSBpc1N0cmluZyhwb3N0UHJvY2VzcykgPyBbcG9zdFByb2Nlc3NdIDogcG9zdFByb2Nlc3M7XG5cbiAgICBpZiAoXG4gICAgICByZXMgIT09IHVuZGVmaW5lZCAmJlxuICAgICAgcmVzICE9PSBudWxsICYmXG4gICAgICBwb3N0UHJvY2Vzc29yTmFtZXM/Lmxlbmd0aCAmJlxuICAgICAgb3B0aW9ucy5hcHBseVBvc3RQcm9jZXNzb3IgIT09IGZhbHNlXG4gICAgKSB7XG4gICAgICByZXMgPSBwb3N0UHJvY2Vzc29yLmhhbmRsZShcbiAgICAgICAgcG9zdFByb2Nlc3Nvck5hbWVzLFxuICAgICAgICByZXMsXG4gICAgICAgIGtleSxcbiAgICAgICAgdGhpcy5vcHRpb25zICYmIHRoaXMub3B0aW9ucy5wb3N0UHJvY2Vzc1Bhc3NSZXNvbHZlZFxuICAgICAgICAgID8ge1xuICAgICAgICAgICAgICBpMThuUmVzb2x2ZWQ6IHsgLi4ucmVzb2x2ZWQsIHVzZWRQYXJhbXM6IHRoaXMuZ2V0VXNlZFBhcmFtc0RldGFpbHMob3B0aW9ucykgfSxcbiAgICAgICAgICAgICAgLi4ub3B0aW9ucyxcbiAgICAgICAgICAgIH1cbiAgICAgICAgICA6IG9wdGlvbnMsXG4gICAgICAgIHRoaXMsXG4gICAgICApO1xuICAgIH1cblxuICAgIHJldHVybiByZXM7XG4gIH1cblxuICByZXNvbHZlKGtleXMsIG9wdGlvbnMgPSB7fSkge1xuICAgIGxldCBmb3VuZDtcbiAgICBsZXQgdXNlZEtleTsgLy8gcGxhaW4ga2V5XG4gICAgbGV0IGV4YWN0VXNlZEtleTsgLy8ga2V5IHdpdGggY29udGV4dCAvIHBsdXJhbFxuICAgIGxldCB1c2VkTG5nO1xuICAgIGxldCB1c2VkTlM7XG5cbiAgICBpZiAoaXNTdHJpbmcoa2V5cykpIGtleXMgPSBba2V5c107XG5cbiAgICAvLyBmb3JFYWNoIHBvc3NpYmxlIGtleVxuICAgIGtleXMuZm9yRWFjaCgoaykgPT4ge1xuICAgICAgaWYgKHRoaXMuaXNWYWxpZExvb2t1cChmb3VuZCkpIHJldHVybjtcbiAgICAgIGNvbnN0IGV4dHJhY3RlZCA9IHRoaXMuZXh0cmFjdEZyb21LZXkoaywgb3B0aW9ucyk7XG4gICAgICBjb25zdCBrZXkgPSBleHRyYWN0ZWQua2V5O1xuICAgICAgdXNlZEtleSA9IGtleTtcbiAgICAgIGxldCBuYW1lc3BhY2VzID0gZXh0cmFjdGVkLm5hbWVzcGFjZXM7XG4gICAgICBpZiAodGhpcy5vcHRpb25zLmZhbGxiYWNrTlMpIG5hbWVzcGFjZXMgPSBuYW1lc3BhY2VzLmNvbmNhdCh0aGlzLm9wdGlvbnMuZmFsbGJhY2tOUyk7XG5cbiAgICAgIGNvbnN0IG5lZWRzUGx1cmFsSGFuZGxpbmcgPSBvcHRpb25zLmNvdW50ICE9PSB1bmRlZmluZWQgJiYgIWlzU3RyaW5nKG9wdGlvbnMuY291bnQpO1xuICAgICAgY29uc3QgbmVlZHNaZXJvU3VmZml4TG9va3VwID0gbmVlZHNQbHVyYWxIYW5kbGluZyAmJiAhb3B0aW9ucy5vcmRpbmFsICYmIG9wdGlvbnMuY291bnQgPT09IDA7XG4gICAgICBjb25zdCBuZWVkc0NvbnRleHRIYW5kbGluZyA9XG4gICAgICAgIG9wdGlvbnMuY29udGV4dCAhPT0gdW5kZWZpbmVkICYmXG4gICAgICAgIChpc1N0cmluZyhvcHRpb25zLmNvbnRleHQpIHx8IHR5cGVvZiBvcHRpb25zLmNvbnRleHQgPT09ICdudW1iZXInKSAmJlxuICAgICAgICBvcHRpb25zLmNvbnRleHQgIT09ICcnO1xuXG4gICAgICBjb25zdCBjb2RlcyA9IG9wdGlvbnMubG5nc1xuICAgICAgICA/IG9wdGlvbnMubG5nc1xuICAgICAgICA6IHRoaXMubGFuZ3VhZ2VVdGlscy50b1Jlc29sdmVIaWVyYXJjaHkob3B0aW9ucy5sbmcgfHwgdGhpcy5sYW5ndWFnZSwgb3B0aW9ucy5mYWxsYmFja0xuZyk7XG5cbiAgICAgIG5hbWVzcGFjZXMuZm9yRWFjaCgobnMpID0+IHtcbiAgICAgICAgaWYgKHRoaXMuaXNWYWxpZExvb2t1cChmb3VuZCkpIHJldHVybjtcbiAgICAgICAgdXNlZE5TID0gbnM7XG5cbiAgICAgICAgaWYgKFxuICAgICAgICAgICFjaGVja2VkTG9hZGVkRm9yW2Ake2NvZGVzWzBdfS0ke25zfWBdICYmXG4gICAgICAgICAgdGhpcy51dGlscz8uaGFzTG9hZGVkTmFtZXNwYWNlICYmXG4gICAgICAgICAgIXRoaXMudXRpbHM/Lmhhc0xvYWRlZE5hbWVzcGFjZSh1c2VkTlMpXG4gICAgICAgICkge1xuICAgICAgICAgIGNoZWNrZWRMb2FkZWRGb3JbYCR7Y29kZXNbMF19LSR7bnN9YF0gPSB0cnVlO1xuICAgICAgICAgIHRoaXMubG9nZ2VyLndhcm4oXG4gICAgICAgICAgICBga2V5IFwiJHt1c2VkS2V5fVwiIGZvciBsYW5ndWFnZXMgXCIke2NvZGVzLmpvaW4oXG4gICAgICAgICAgICAgICcsICcsXG4gICAgICAgICAgICApfVwiIHdvbid0IGdldCByZXNvbHZlZCBhcyBuYW1lc3BhY2UgXCIke3VzZWROU31cIiB3YXMgbm90IHlldCBsb2FkZWRgLFxuICAgICAgICAgICAgJ1RoaXMgbWVhbnMgc29tZXRoaW5nIElTIFdST05HIGluIHlvdXIgc2V0dXAuIFlvdSBhY2Nlc3MgdGhlIHQgZnVuY3Rpb24gYmVmb3JlIGkxOG5leHQuaW5pdCAvIGkxOG5leHQubG9hZE5hbWVzcGFjZSAvIGkxOG5leHQuY2hhbmdlTGFuZ3VhZ2Ugd2FzIGRvbmUuIFdhaXQgZm9yIHRoZSBjYWxsYmFjayBvciBQcm9taXNlIHRvIHJlc29sdmUgYmVmb3JlIGFjY2Vzc2luZyBpdCEhIScsXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvZGVzLmZvckVhY2goKGNvZGUpID0+IHtcbiAgICAgICAgICBpZiAodGhpcy5pc1ZhbGlkTG9va3VwKGZvdW5kKSkgcmV0dXJuO1xuICAgICAgICAgIHVzZWRMbmcgPSBjb2RlO1xuXG4gICAgICAgICAgY29uc3QgZmluYWxLZXlzID0gW2tleV07XG5cbiAgICAgICAgICBpZiAodGhpcy5pMThuRm9ybWF0Py5hZGRMb29rdXBLZXlzKSB7XG4gICAgICAgICAgICB0aGlzLmkxOG5Gb3JtYXQuYWRkTG9va3VwS2V5cyhmaW5hbEtleXMsIGtleSwgY29kZSwgbnMsIG9wdGlvbnMpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsZXQgcGx1cmFsU3VmZml4O1xuICAgICAgICAgICAgaWYgKG5lZWRzUGx1cmFsSGFuZGxpbmcpXG4gICAgICAgICAgICAgIHBsdXJhbFN1ZmZpeCA9IHRoaXMucGx1cmFsUmVzb2x2ZXIuZ2V0U3VmZml4KGNvZGUsIG9wdGlvbnMuY291bnQsIG9wdGlvbnMpO1xuICAgICAgICAgICAgY29uc3QgemVyb1N1ZmZpeCA9IGAke3RoaXMub3B0aW9ucy5wbHVyYWxTZXBhcmF0b3J9emVyb2A7XG4gICAgICAgICAgICBjb25zdCBvcmRpbmFsUHJlZml4ID0gYCR7dGhpcy5vcHRpb25zLnBsdXJhbFNlcGFyYXRvcn1vcmRpbmFsJHt0aGlzLm9wdGlvbnMucGx1cmFsU2VwYXJhdG9yfWA7XG4gICAgICAgICAgICAvLyBnZXQga2V5IGZvciBwbHVyYWwgaWYgbmVlZGVkXG4gICAgICAgICAgICBpZiAobmVlZHNQbHVyYWxIYW5kbGluZykge1xuICAgICAgICAgICAgICBmaW5hbEtleXMucHVzaChrZXkgKyBwbHVyYWxTdWZmaXgpO1xuICAgICAgICAgICAgICBpZiAob3B0aW9ucy5vcmRpbmFsICYmIHBsdXJhbFN1ZmZpeC5pbmRleE9mKG9yZGluYWxQcmVmaXgpID09PSAwKSB7XG4gICAgICAgICAgICAgICAgZmluYWxLZXlzLnB1c2goXG4gICAgICAgICAgICAgICAgICBrZXkgKyBwbHVyYWxTdWZmaXgucmVwbGFjZShvcmRpbmFsUHJlZml4LCB0aGlzLm9wdGlvbnMucGx1cmFsU2VwYXJhdG9yKSxcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGlmIChuZWVkc1plcm9TdWZmaXhMb29rdXApIHtcbiAgICAgICAgICAgICAgICBmaW5hbEtleXMucHVzaChrZXkgKyB6ZXJvU3VmZml4KTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBnZXQga2V5IGZvciBjb250ZXh0IGlmIG5lZWRlZFxuICAgICAgICAgICAgaWYgKG5lZWRzQ29udGV4dEhhbmRsaW5nKSB7XG4gICAgICAgICAgICAgIGNvbnN0IGNvbnRleHRLZXkgPSBgJHtrZXl9JHt0aGlzLm9wdGlvbnMuY29udGV4dFNlcGFyYXRvcn0ke29wdGlvbnMuY29udGV4dH1gO1xuICAgICAgICAgICAgICBmaW5hbEtleXMucHVzaChjb250ZXh0S2V5KTtcblxuICAgICAgICAgICAgICAvLyBnZXQga2V5IGZvciBjb250ZXh0ICsgcGx1cmFsIGlmIG5lZWRlZFxuICAgICAgICAgICAgICBpZiAobmVlZHNQbHVyYWxIYW5kbGluZykge1xuICAgICAgICAgICAgICAgIGZpbmFsS2V5cy5wdXNoKGNvbnRleHRLZXkgKyBwbHVyYWxTdWZmaXgpO1xuICAgICAgICAgICAgICAgIGlmIChvcHRpb25zLm9yZGluYWwgJiYgcGx1cmFsU3VmZml4LmluZGV4T2Yob3JkaW5hbFByZWZpeCkgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgIGZpbmFsS2V5cy5wdXNoKFxuICAgICAgICAgICAgICAgICAgICBjb250ZXh0S2V5ICsgcGx1cmFsU3VmZml4LnJlcGxhY2Uob3JkaW5hbFByZWZpeCwgdGhpcy5vcHRpb25zLnBsdXJhbFNlcGFyYXRvciksXG4gICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAobmVlZHNaZXJvU3VmZml4TG9va3VwKSB7XG4gICAgICAgICAgICAgICAgICBmaW5hbEtleXMucHVzaChjb250ZXh0S2V5ICsgemVyb1N1ZmZpeCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gaXRlcmF0ZSBvdmVyIGZpbmFsS2V5cyBzdGFydGluZyB3aXRoIG1vc3Qgc3BlY2lmaWMgcGx1cmFsa2V5ICgtPiBjb250ZXh0a2V5IG9ubHkpIC0+IHNpbmd1bGFya2V5IG9ubHlcbiAgICAgICAgICBsZXQgcG9zc2libGVLZXk7XG4gICAgICAgICAgLyogZXNsaW50IG5vLWNvbmQtYXNzaWduOiAwICovXG4gICAgICAgICAgd2hpbGUgKChwb3NzaWJsZUtleSA9IGZpbmFsS2V5cy5wb3AoKSkpIHtcbiAgICAgICAgICAgIGlmICghdGhpcy5pc1ZhbGlkTG9va3VwKGZvdW5kKSkge1xuICAgICAgICAgICAgICBleGFjdFVzZWRLZXkgPSBwb3NzaWJsZUtleTtcbiAgICAgICAgICAgICAgZm91bmQgPSB0aGlzLmdldFJlc291cmNlKGNvZGUsIG5zLCBwb3NzaWJsZUtleSwgb3B0aW9ucyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHsgcmVzOiBmb3VuZCwgdXNlZEtleSwgZXhhY3RVc2VkS2V5LCB1c2VkTG5nLCB1c2VkTlMgfTtcbiAgfVxuXG4gIGlzVmFsaWRMb29rdXAocmVzKSB7XG4gICAgcmV0dXJuIChcbiAgICAgIHJlcyAhPT0gdW5kZWZpbmVkICYmXG4gICAgICAhKCF0aGlzLm9wdGlvbnMucmV0dXJuTnVsbCAmJiByZXMgPT09IG51bGwpICYmXG4gICAgICAhKCF0aGlzLm9wdGlvbnMucmV0dXJuRW1wdHlTdHJpbmcgJiYgcmVzID09PSAnJylcbiAgICApO1xuICB9XG5cbiAgZ2V0UmVzb3VyY2UoY29kZSwgbnMsIGtleSwgb3B0aW9ucyA9IHt9KSB7XG4gICAgaWYgKHRoaXMuaTE4bkZvcm1hdD8uZ2V0UmVzb3VyY2UpIHJldHVybiB0aGlzLmkxOG5Gb3JtYXQuZ2V0UmVzb3VyY2UoY29kZSwgbnMsIGtleSwgb3B0aW9ucyk7XG4gICAgcmV0dXJuIHRoaXMucmVzb3VyY2VTdG9yZS5nZXRSZXNvdXJjZShjb2RlLCBucywga2V5LCBvcHRpb25zKTtcbiAgfVxuXG4gIGdldFVzZWRQYXJhbXNEZXRhaWxzKG9wdGlvbnMgPSB7fSkge1xuICAgIC8vIHdlIG5lZWQgdG8gcmVtZW1iZXIgdG8gZXh0ZW5kIHRoaXMgYXJyYXkgd2hlbmV2ZXIgbmV3IG9wdGlvbiBwcm9wZXJ0aWVzIGFyZSBhZGRlZFxuICAgIGNvbnN0IG9wdGlvbnNLZXlzID0gW1xuICAgICAgJ2RlZmF1bHRWYWx1ZScsXG4gICAgICAnb3JkaW5hbCcsXG4gICAgICAnY29udGV4dCcsXG4gICAgICAncmVwbGFjZScsXG4gICAgICAnbG5nJyxcbiAgICAgICdsbmdzJyxcbiAgICAgICdmYWxsYmFja0xuZycsXG4gICAgICAnbnMnLFxuICAgICAgJ2tleVNlcGFyYXRvcicsXG4gICAgICAnbnNTZXBhcmF0b3InLFxuICAgICAgJ3JldHVybk9iamVjdHMnLFxuICAgICAgJ3JldHVybkRldGFpbHMnLFxuICAgICAgJ2pvaW5BcnJheXMnLFxuICAgICAgJ3Bvc3RQcm9jZXNzJyxcbiAgICAgICdpbnRlcnBvbGF0aW9uJyxcbiAgICBdO1xuXG4gICAgY29uc3QgdXNlT3B0aW9uc1JlcGxhY2VGb3JEYXRhID0gb3B0aW9ucy5yZXBsYWNlICYmICFpc1N0cmluZyhvcHRpb25zLnJlcGxhY2UpO1xuICAgIGxldCBkYXRhID0gdXNlT3B0aW9uc1JlcGxhY2VGb3JEYXRhID8gb3B0aW9ucy5yZXBsYWNlIDogb3B0aW9ucztcbiAgICBpZiAodXNlT3B0aW9uc1JlcGxhY2VGb3JEYXRhICYmIHR5cGVvZiBvcHRpb25zLmNvdW50ICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgZGF0YS5jb3VudCA9IG9wdGlvbnMuY291bnQ7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5pbnRlcnBvbGF0aW9uLmRlZmF1bHRWYXJpYWJsZXMpIHtcbiAgICAgIGRhdGEgPSB7IC4uLnRoaXMub3B0aW9ucy5pbnRlcnBvbGF0aW9uLmRlZmF1bHRWYXJpYWJsZXMsIC4uLmRhdGEgfTtcbiAgICB9XG5cbiAgICAvLyBhdm9pZCByZXBvcnRpbmcgb3B0aW9ucyAoZXhlY3B0IGNvdW50KSBhcyB1c2VkUGFyYW1zXG4gICAgaWYgKCF1c2VPcHRpb25zUmVwbGFjZUZvckRhdGEpIHtcbiAgICAgIGRhdGEgPSB7IC4uLmRhdGEgfTtcbiAgICAgIGZvciAoY29uc3Qga2V5IG9mIG9wdGlvbnNLZXlzKSB7XG4gICAgICAgIGRlbGV0ZSBkYXRhW2tleV07XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGRhdGE7XG4gIH1cblxuICBzdGF0aWMgaGFzRGVmYXVsdFZhbHVlKG9wdGlvbnMpIHtcbiAgICBjb25zdCBwcmVmaXggPSAnZGVmYXVsdFZhbHVlJztcblxuICAgIGZvciAoY29uc3Qgb3B0aW9uIGluIG9wdGlvbnMpIHtcbiAgICAgIGlmIChcbiAgICAgICAgT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9wdGlvbnMsIG9wdGlvbikgJiZcbiAgICAgICAgcHJlZml4ID09PSBvcHRpb24uc3Vic3RyaW5nKDAsIHByZWZpeC5sZW5ndGgpICYmXG4gICAgICAgIHVuZGVmaW5lZCAhPT0gb3B0aW9uc1tvcHRpb25dXG4gICAgICApIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IFRyYW5zbGF0b3I7XG4iLCJpbXBvcnQgYmFzZUxvZ2dlciBmcm9tICcuL2xvZ2dlci5qcyc7XG5pbXBvcnQgeyBnZXRDbGVhbmVkQ29kZSwgaXNTdHJpbmcgfSBmcm9tICcuL3V0aWxzLmpzJztcblxuY2xhc3MgTGFuZ3VhZ2VVdGlsIHtcbiAgY29uc3RydWN0b3Iob3B0aW9ucykge1xuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG5cbiAgICB0aGlzLnN1cHBvcnRlZExuZ3MgPSB0aGlzLm9wdGlvbnMuc3VwcG9ydGVkTG5ncyB8fCBmYWxzZTtcbiAgICB0aGlzLmxvZ2dlciA9IGJhc2VMb2dnZXIuY3JlYXRlKCdsYW5ndWFnZVV0aWxzJyk7XG4gIH1cblxuICBnZXRTY3JpcHRQYXJ0RnJvbUNvZGUoY29kZSkge1xuICAgIGNvZGUgPSBnZXRDbGVhbmVkQ29kZShjb2RlKTtcbiAgICBpZiAoIWNvZGUgfHwgY29kZS5pbmRleE9mKCctJykgPCAwKSByZXR1cm4gbnVsbDtcblxuICAgIGNvbnN0IHAgPSBjb2RlLnNwbGl0KCctJyk7XG4gICAgaWYgKHAubGVuZ3RoID09PSAyKSByZXR1cm4gbnVsbDtcbiAgICBwLnBvcCgpO1xuICAgIGlmIChwW3AubGVuZ3RoIC0gMV0udG9Mb3dlckNhc2UoKSA9PT0gJ3gnKSByZXR1cm4gbnVsbDtcbiAgICByZXR1cm4gdGhpcy5mb3JtYXRMYW5ndWFnZUNvZGUocC5qb2luKCctJykpO1xuICB9XG5cbiAgZ2V0TGFuZ3VhZ2VQYXJ0RnJvbUNvZGUoY29kZSkge1xuICAgIGNvZGUgPSBnZXRDbGVhbmVkQ29kZShjb2RlKTtcbiAgICBpZiAoIWNvZGUgfHwgY29kZS5pbmRleE9mKCctJykgPCAwKSByZXR1cm4gY29kZTtcblxuICAgIGNvbnN0IHAgPSBjb2RlLnNwbGl0KCctJyk7XG4gICAgcmV0dXJuIHRoaXMuZm9ybWF0TGFuZ3VhZ2VDb2RlKHBbMF0pO1xuICB9XG5cbiAgZm9ybWF0TGFuZ3VhZ2VDb2RlKGNvZGUpIHtcbiAgICAvLyBodHRwOi8vd3d3LmlhbmEub3JnL2Fzc2lnbm1lbnRzL2xhbmd1YWdlLXRhZ3MvbGFuZ3VhZ2UtdGFncy54aHRtbFxuICAgIGlmIChpc1N0cmluZyhjb2RlKSAmJiBjb2RlLmluZGV4T2YoJy0nKSA+IC0xKSB7XG4gICAgICBsZXQgZm9ybWF0dGVkQ29kZSA9IEludGwuZ2V0Q2Fub25pY2FsTG9jYWxlcyhjb2RlKVswXTtcbiAgICAgIGlmIChmb3JtYXR0ZWRDb2RlICYmIHRoaXMub3B0aW9ucy5sb3dlckNhc2VMbmcpIHtcbiAgICAgICAgZm9ybWF0dGVkQ29kZSA9IGZvcm1hdHRlZENvZGUudG9Mb3dlckNhc2UoKTtcbiAgICAgIH1cbiAgICAgIGlmIChmb3JtYXR0ZWRDb2RlKSByZXR1cm4gZm9ybWF0dGVkQ29kZTtcblxuICAgICAgaWYgKHRoaXMub3B0aW9ucy5sb3dlckNhc2VMbmcpIHtcbiAgICAgICAgcmV0dXJuIGNvZGUudG9Mb3dlckNhc2UoKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGNvZGU7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMub3B0aW9ucy5jbGVhbkNvZGUgfHwgdGhpcy5vcHRpb25zLmxvd2VyQ2FzZUxuZyA/IGNvZGUudG9Mb3dlckNhc2UoKSA6IGNvZGU7XG4gIH1cblxuICBpc1N1cHBvcnRlZENvZGUoY29kZSkge1xuICAgIGlmICh0aGlzLm9wdGlvbnMubG9hZCA9PT0gJ2xhbmd1YWdlT25seScgfHwgdGhpcy5vcHRpb25zLm5vbkV4cGxpY2l0U3VwcG9ydGVkTG5ncykge1xuICAgICAgY29kZSA9IHRoaXMuZ2V0TGFuZ3VhZ2VQYXJ0RnJvbUNvZGUoY29kZSk7XG4gICAgfVxuICAgIHJldHVybiAoXG4gICAgICAhdGhpcy5zdXBwb3J0ZWRMbmdzIHx8ICF0aGlzLnN1cHBvcnRlZExuZ3MubGVuZ3RoIHx8IHRoaXMuc3VwcG9ydGVkTG5ncy5pbmRleE9mKGNvZGUpID4gLTFcbiAgICApO1xuICB9XG5cbiAgZ2V0QmVzdE1hdGNoRnJvbUNvZGVzKGNvZGVzKSB7XG4gICAgaWYgKCFjb2RlcykgcmV0dXJuIG51bGw7XG5cbiAgICBsZXQgZm91bmQ7XG5cbiAgICAvLyBwaWNrIGZpcnN0IHN1cHBvcnRlZCBjb2RlIG9yIGlmIG5vIHJlc3RyaWN0aW9uIHBpY2sgdGhlIGZpcnN0IG9uZSAoaGlnaGVzdCBwcmlvKVxuICAgIGNvZGVzLmZvckVhY2goKGNvZGUpID0+IHtcbiAgICAgIGlmIChmb3VuZCkgcmV0dXJuO1xuICAgICAgY29uc3QgY2xlYW5lZExuZyA9IHRoaXMuZm9ybWF0TGFuZ3VhZ2VDb2RlKGNvZGUpO1xuICAgICAgaWYgKCF0aGlzLm9wdGlvbnMuc3VwcG9ydGVkTG5ncyB8fCB0aGlzLmlzU3VwcG9ydGVkQ29kZShjbGVhbmVkTG5nKSkgZm91bmQgPSBjbGVhbmVkTG5nO1xuICAgIH0pO1xuXG4gICAgLy8gaWYgd2UgZ290IG5vIG1hdGNoIGluIHN1cHBvcnRlZExuZ3MgeWV0IC0gY2hlY2sgZm9yIHNpbWlsYXIgbG9jYWxlc1xuICAgIC8vIGZpcnN0ICBkZS1DSCAtLT4gZGVcbiAgICAvLyBzZWNvbmQgZGUtQ0ggLS0+IGRlLURFXG4gICAgaWYgKCFmb3VuZCAmJiB0aGlzLm9wdGlvbnMuc3VwcG9ydGVkTG5ncykge1xuICAgICAgY29kZXMuZm9yRWFjaCgoY29kZSkgPT4ge1xuICAgICAgICBpZiAoZm91bmQpIHJldHVybjtcblxuICAgICAgICBjb25zdCBsbmdPbmx5ID0gdGhpcy5nZXRMYW5ndWFnZVBhcnRGcm9tQ29kZShjb2RlKTtcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLXJldHVybi1hc3NpZ25cbiAgICAgICAgaWYgKHRoaXMuaXNTdXBwb3J0ZWRDb2RlKGxuZ09ubHkpKSByZXR1cm4gKGZvdW5kID0gbG5nT25seSk7XG5cbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIGFycmF5LWNhbGxiYWNrLXJldHVyblxuICAgICAgICBmb3VuZCA9IHRoaXMub3B0aW9ucy5zdXBwb3J0ZWRMbmdzLmZpbmQoKHN1cHBvcnRlZExuZykgPT4ge1xuICAgICAgICAgIGlmIChzdXBwb3J0ZWRMbmcgPT09IGxuZ09ubHkpIHJldHVybiBzdXBwb3J0ZWRMbmc7XG4gICAgICAgICAgaWYgKHN1cHBvcnRlZExuZy5pbmRleE9mKCctJykgPCAwICYmIGxuZ09ubHkuaW5kZXhPZignLScpIDwgMCkgcmV0dXJuO1xuICAgICAgICAgIGlmIChcbiAgICAgICAgICAgIHN1cHBvcnRlZExuZy5pbmRleE9mKCctJykgPiAwICYmXG4gICAgICAgICAgICBsbmdPbmx5LmluZGV4T2YoJy0nKSA8IDAgJiZcbiAgICAgICAgICAgIHN1cHBvcnRlZExuZy5zdWJzdHJpbmcoMCwgc3VwcG9ydGVkTG5nLmluZGV4T2YoJy0nKSkgPT09IGxuZ09ubHlcbiAgICAgICAgICApXG4gICAgICAgICAgICByZXR1cm4gc3VwcG9ydGVkTG5nO1xuICAgICAgICAgIGlmIChzdXBwb3J0ZWRMbmcuaW5kZXhPZihsbmdPbmx5KSA9PT0gMCAmJiBsbmdPbmx5Lmxlbmd0aCA+IDEpIHJldHVybiBzdXBwb3J0ZWRMbmc7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfVxuICAgIC8vIGlmIG5vdGhpbmcgZm91bmQsIHVzZSBmYWxsYmFja0xuZ1xuICAgIGlmICghZm91bmQpIGZvdW5kID0gdGhpcy5nZXRGYWxsYmFja0NvZGVzKHRoaXMub3B0aW9ucy5mYWxsYmFja0xuZylbMF07XG5cbiAgICByZXR1cm4gZm91bmQ7XG4gIH1cblxuICBnZXRGYWxsYmFja0NvZGVzKGZhbGxiYWNrcywgY29kZSkge1xuICAgIGlmICghZmFsbGJhY2tzKSByZXR1cm4gW107XG4gICAgaWYgKHR5cGVvZiBmYWxsYmFja3MgPT09ICdmdW5jdGlvbicpIGZhbGxiYWNrcyA9IGZhbGxiYWNrcyhjb2RlKTtcbiAgICBpZiAoaXNTdHJpbmcoZmFsbGJhY2tzKSkgZmFsbGJhY2tzID0gW2ZhbGxiYWNrc107XG4gICAgaWYgKEFycmF5LmlzQXJyYXkoZmFsbGJhY2tzKSkgcmV0dXJuIGZhbGxiYWNrcztcblxuICAgIGlmICghY29kZSkgcmV0dXJuIGZhbGxiYWNrcy5kZWZhdWx0IHx8IFtdO1xuXG4gICAgLy8gYXNzdW1lIHdlIGhhdmUgYW4gb2JqZWN0IGRlZmluaW5nIGZhbGxiYWNrc1xuICAgIGxldCBmb3VuZCA9IGZhbGxiYWNrc1tjb2RlXTtcbiAgICBpZiAoIWZvdW5kKSBmb3VuZCA9IGZhbGxiYWNrc1t0aGlzLmdldFNjcmlwdFBhcnRGcm9tQ29kZShjb2RlKV07XG4gICAgaWYgKCFmb3VuZCkgZm91bmQgPSBmYWxsYmFja3NbdGhpcy5mb3JtYXRMYW5ndWFnZUNvZGUoY29kZSldO1xuICAgIGlmICghZm91bmQpIGZvdW5kID0gZmFsbGJhY2tzW3RoaXMuZ2V0TGFuZ3VhZ2VQYXJ0RnJvbUNvZGUoY29kZSldO1xuICAgIGlmICghZm91bmQpIGZvdW5kID0gZmFsbGJhY2tzLmRlZmF1bHQ7XG5cbiAgICByZXR1cm4gZm91bmQgfHwgW107XG4gIH1cblxuICB0b1Jlc29sdmVIaWVyYXJjaHkoY29kZSwgZmFsbGJhY2tDb2RlKSB7XG4gICAgY29uc3QgZmFsbGJhY2tDb2RlcyA9IHRoaXMuZ2V0RmFsbGJhY2tDb2RlcyhcbiAgICAgIGZhbGxiYWNrQ29kZSB8fCB0aGlzLm9wdGlvbnMuZmFsbGJhY2tMbmcgfHwgW10sXG4gICAgICBjb2RlLFxuICAgICk7XG5cbiAgICBjb25zdCBjb2RlcyA9IFtdO1xuICAgIGNvbnN0IGFkZENvZGUgPSAoYykgPT4ge1xuICAgICAgaWYgKCFjKSByZXR1cm47XG4gICAgICBpZiAodGhpcy5pc1N1cHBvcnRlZENvZGUoYykpIHtcbiAgICAgICAgY29kZXMucHVzaChjKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMubG9nZ2VyLndhcm4oYHJlamVjdGluZyBsYW5ndWFnZSBjb2RlIG5vdCBmb3VuZCBpbiBzdXBwb3J0ZWRMbmdzOiAke2N9YCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIGlmIChpc1N0cmluZyhjb2RlKSAmJiAoY29kZS5pbmRleE9mKCctJykgPiAtMSB8fCBjb2RlLmluZGV4T2YoJ18nKSA+IC0xKSkge1xuICAgICAgaWYgKHRoaXMub3B0aW9ucy5sb2FkICE9PSAnbGFuZ3VhZ2VPbmx5JykgYWRkQ29kZSh0aGlzLmZvcm1hdExhbmd1YWdlQ29kZShjb2RlKSk7XG4gICAgICBpZiAodGhpcy5vcHRpb25zLmxvYWQgIT09ICdsYW5ndWFnZU9ubHknICYmIHRoaXMub3B0aW9ucy5sb2FkICE9PSAnY3VycmVudE9ubHknKVxuICAgICAgICBhZGRDb2RlKHRoaXMuZ2V0U2NyaXB0UGFydEZyb21Db2RlKGNvZGUpKTtcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMubG9hZCAhPT0gJ2N1cnJlbnRPbmx5JykgYWRkQ29kZSh0aGlzLmdldExhbmd1YWdlUGFydEZyb21Db2RlKGNvZGUpKTtcbiAgICB9IGVsc2UgaWYgKGlzU3RyaW5nKGNvZGUpKSB7XG4gICAgICBhZGRDb2RlKHRoaXMuZm9ybWF0TGFuZ3VhZ2VDb2RlKGNvZGUpKTtcbiAgICB9XG5cbiAgICBmYWxsYmFja0NvZGVzLmZvckVhY2goKGZjKSA9PiB7XG4gICAgICBpZiAoY29kZXMuaW5kZXhPZihmYykgPCAwKSBhZGRDb2RlKHRoaXMuZm9ybWF0TGFuZ3VhZ2VDb2RlKGZjKSk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gY29kZXM7XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgTGFuZ3VhZ2VVdGlsO1xuIiwiaW1wb3J0IGJhc2VMb2dnZXIgZnJvbSAnLi9sb2dnZXIuanMnO1xuaW1wb3J0IHsgZ2V0Q2xlYW5lZENvZGUgfSBmcm9tICcuL3V0aWxzLmpzJ1xuXG5jb25zdCBzdWZmaXhlc09yZGVyID0ge1xuICB6ZXJvOiAwLFxuICBvbmU6IDEsXG4gIHR3bzogMixcbiAgZmV3OiAzLFxuICBtYW55OiA0LFxuICBvdGhlcjogNSxcbn07XG5cbmNsYXNzIFBsdXJhbFJlc29sdmVyIHtcbiAgY29uc3RydWN0b3IobGFuZ3VhZ2VVdGlscywgb3B0aW9ucyA9IHt9KSB7XG4gICAgdGhpcy5sYW5ndWFnZVV0aWxzID0gbGFuZ3VhZ2VVdGlscztcbiAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuXG4gICAgdGhpcy5sb2dnZXIgPSBiYXNlTG9nZ2VyLmNyZWF0ZSgncGx1cmFsUmVzb2x2ZXInKTtcblxuICAgIC8vIENhY2hlIGNhbGxzIHRvIEludGwuUGx1cmFsUnVsZXMsIHNpbmNlIHJlcGVhdGVkIGNhbGxzIGNhbiBiZSBzbG93IGluIHJ1bnRpbWVzIGxpa2UgUmVhY3QgTmF0aXZlXG4gICAgLy8gYW5kIHRoZSBtZW1vcnkgdXNhZ2UgZGlmZmVyZW5jZSBpcyBuZWdsaWdpYmxlXG4gICAgdGhpcy5wbHVyYWxSdWxlc0NhY2hlID0ge307XG4gIH1cblxuICBhZGRSdWxlKGxuZywgb2JqKSB7XG4gICAgdGhpcy5ydWxlc1tsbmddID0gb2JqO1xuICB9XG5cbiAgY2xlYXJDYWNoZSgpIHtcbiAgICB0aGlzLnBsdXJhbFJ1bGVzQ2FjaGUgPSB7fTtcbiAgfVxuXG4gIGdldFJ1bGUoY29kZSwgb3B0aW9ucyA9IHt9KSB7XG4gICAgY29uc3QgY2xlYW5lZENvZGUgPSBnZXRDbGVhbmVkQ29kZShjb2RlID09PSAnZGV2JyA/ICdlbicgOiBjb2RlKTtcbiAgICBjb25zdCB0eXBlID0gb3B0aW9ucy5vcmRpbmFsID8gJ29yZGluYWwnIDogJ2NhcmRpbmFsJztcbiAgICBjb25zdCBjYWNoZUtleSA9IEpTT04uc3RyaW5naWZ5KHsgY2xlYW5lZENvZGUsIHR5cGUgfSk7XG5cbiAgICBpZiAoY2FjaGVLZXkgaW4gdGhpcy5wbHVyYWxSdWxlc0NhY2hlKSB7XG4gICAgICByZXR1cm4gdGhpcy5wbHVyYWxSdWxlc0NhY2hlW2NhY2hlS2V5XTtcbiAgICB9XG5cbiAgICBsZXQgcnVsZTtcblxuICAgIHRyeSB7XG4gICAgICBydWxlID0gbmV3IEludGwuUGx1cmFsUnVsZXMoY2xlYW5lZENvZGUsIHsgdHlwZSB9KTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGlmICghY29kZS5tYXRjaCgvLXxfLykpIHJldHVybjtcbiAgICAgIGNvbnN0IGxuZ1BhcnQgPSB0aGlzLmxhbmd1YWdlVXRpbHMuZ2V0TGFuZ3VhZ2VQYXJ0RnJvbUNvZGUoY29kZSk7XG4gICAgICBydWxlID0gdGhpcy5nZXRSdWxlKGxuZ1BhcnQsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIHRoaXMucGx1cmFsUnVsZXNDYWNoZVtjYWNoZUtleV0gPSBydWxlO1xuICAgIHJldHVybiBydWxlO1xuICB9XG5cbiAgbmVlZHNQbHVyYWwoY29kZSwgb3B0aW9ucyA9IHt9KSB7XG4gICAgbGV0IHJ1bGUgPSB0aGlzLmdldFJ1bGUoY29kZSwgb3B0aW9ucyk7XG4gICAgaWYgKCFydWxlKSBydWxlID0gdGhpcy5nZXRSdWxlKCdkZXYnLCBvcHRpb25zKTtcbiAgICByZXR1cm4gcnVsZT8ucmVzb2x2ZWRPcHRpb25zKCkucGx1cmFsQ2F0ZWdvcmllcy5sZW5ndGggPiAxO1xuICB9XG5cbiAgZ2V0UGx1cmFsRm9ybXNPZktleShjb2RlLCBrZXksIG9wdGlvbnMgPSB7fSkge1xuICAgIHJldHVybiB0aGlzLmdldFN1ZmZpeGVzKGNvZGUsIG9wdGlvbnMpLm1hcCgoc3VmZml4KSA9PiBgJHtrZXl9JHtzdWZmaXh9YCk7XG4gIH1cblxuICBnZXRTdWZmaXhlcyhjb2RlLCBvcHRpb25zID0ge30pIHtcbiAgICBsZXQgcnVsZSA9IHRoaXMuZ2V0UnVsZShjb2RlLCBvcHRpb25zKTtcbiAgICBpZiAoIXJ1bGUpIHJ1bGUgPSB0aGlzLmdldFJ1bGUoJ2RldicsIG9wdGlvbnMpO1xuICAgIGlmICghcnVsZSkgcmV0dXJuIFtdO1xuXG4gICAgcmV0dXJuIHJ1bGUucmVzb2x2ZWRPcHRpb25zKCkucGx1cmFsQ2F0ZWdvcmllc1xuICAgICAgLnNvcnQoKHBsdXJhbENhdGVnb3J5MSwgcGx1cmFsQ2F0ZWdvcnkyKSA9PiBzdWZmaXhlc09yZGVyW3BsdXJhbENhdGVnb3J5MV0gLSBzdWZmaXhlc09yZGVyW3BsdXJhbENhdGVnb3J5Ml0pXG4gICAgICAubWFwKHBsdXJhbENhdGVnb3J5ID0+IGAke3RoaXMub3B0aW9ucy5wcmVwZW5kfSR7b3B0aW9ucy5vcmRpbmFsID8gYG9yZGluYWwke3RoaXMub3B0aW9ucy5wcmVwZW5kfWAgOiAnJ30ke3BsdXJhbENhdGVnb3J5fWApO1xuICB9XG5cbiAgZ2V0U3VmZml4KGNvZGUsIGNvdW50LCBvcHRpb25zID0ge30pIHtcbiAgICBjb25zdCBydWxlID0gdGhpcy5nZXRSdWxlKGNvZGUsIG9wdGlvbnMpO1xuXG4gICAgaWYgKHJ1bGUpIHtcbiAgICAgIHJldHVybiBgJHt0aGlzLm9wdGlvbnMucHJlcGVuZH0ke29wdGlvbnMub3JkaW5hbCA/IGBvcmRpbmFsJHt0aGlzLm9wdGlvbnMucHJlcGVuZH1gIDogJyd9JHtydWxlLnNlbGVjdChjb3VudCl9YDtcbiAgICB9XG5cbiAgICB0aGlzLmxvZ2dlci53YXJuKGBubyBwbHVyYWwgcnVsZSBmb3VuZCBmb3I6ICR7Y29kZX1gKTtcbiAgICByZXR1cm4gdGhpcy5nZXRTdWZmaXgoJ2RldicsIGNvdW50LCBvcHRpb25zKTtcbiAgfVxuXG4gIGdldFN1ZmZpeFJldHJvQ29tcGF0aWJsZShydWxlLCBjb3VudCkge1xuICAgIGNvbnN0IGlkeCA9IHJ1bGUubm9BYnMgPyBydWxlLnBsdXJhbHMoY291bnQpIDogcnVsZS5wbHVyYWxzKE1hdGguYWJzKGNvdW50KSk7XG4gICAgbGV0IHN1ZmZpeCA9IHJ1bGUubnVtYmVyc1tpZHhdO1xuXG4gICAgLy8gc3BlY2lhbCB0cmVhdG1lbnQgZm9yIGxuZ3Mgb25seSBoYXZpbmcgc2luZ3VsYXIgYW5kIHBsdXJhbFxuICAgIGlmICh0aGlzLm9wdGlvbnMuc2ltcGxpZnlQbHVyYWxTdWZmaXggJiYgcnVsZS5udW1iZXJzLmxlbmd0aCA9PT0gMiAmJiBydWxlLm51bWJlcnNbMF0gPT09IDEpIHtcbiAgICAgIGlmIChzdWZmaXggPT09IDIpIHtcbiAgICAgICAgc3VmZml4ID0gJ3BsdXJhbCc7XG4gICAgICB9IGVsc2UgaWYgKHN1ZmZpeCA9PT0gMSkge1xuICAgICAgICBzdWZmaXggPSAnJztcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5vcHRpb25zLnByZXBlbmQgJiYgaWR4LnRvU3RyaW5nKCkgPyB0aGlzLm9wdGlvbnMucHJlcGVuZCArIGlkeC50b1N0cmluZygpIDogaWR4LnRvU3RyaW5nKCk7XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgUGx1cmFsUmVzb2x2ZXI7XG4iLCJpbXBvcnQge1xuICBnZXRQYXRoV2l0aERlZmF1bHRzLFxuICBkZWVwRmluZCxcbiAgZXNjYXBlIGFzIHV0aWxzRXNjYXBlLFxuICByZWdleEVzY2FwZSxcbiAgbWFrZVN0cmluZyxcbiAgaXNTdHJpbmcsXG59IGZyb20gJy4vdXRpbHMuanMnO1xuaW1wb3J0IGJhc2VMb2dnZXIgZnJvbSAnLi9sb2dnZXIuanMnO1xuXG5jb25zdCBkZWVwRmluZFdpdGhEZWZhdWx0cyA9IChcbiAgZGF0YSxcbiAgZGVmYXVsdERhdGEsXG4gIGtleSxcbiAga2V5U2VwYXJhdG9yID0gJy4nLFxuICBpZ25vcmVKU09OU3RydWN0dXJlID0gdHJ1ZSxcbikgPT4ge1xuICBsZXQgcGF0aCA9IGdldFBhdGhXaXRoRGVmYXVsdHMoZGF0YSwgZGVmYXVsdERhdGEsIGtleSk7XG4gIGlmICghcGF0aCAmJiBpZ25vcmVKU09OU3RydWN0dXJlICYmIGlzU3RyaW5nKGtleSkpIHtcbiAgICBwYXRoID0gZGVlcEZpbmQoZGF0YSwga2V5LCBrZXlTZXBhcmF0b3IpO1xuICAgIGlmIChwYXRoID09PSB1bmRlZmluZWQpIHBhdGggPSBkZWVwRmluZChkZWZhdWx0RGF0YSwga2V5LCBrZXlTZXBhcmF0b3IpO1xuICB9XG4gIHJldHVybiBwYXRoO1xufTtcblxuY29uc3QgcmVnZXhTYWZlID0gKHZhbCkgPT4gdmFsLnJlcGxhY2UoL1xcJC9nLCAnJCQkJCcpO1xuXG5jbGFzcyBJbnRlcnBvbGF0b3Ige1xuICBjb25zdHJ1Y3RvcihvcHRpb25zID0ge30pIHtcbiAgICB0aGlzLmxvZ2dlciA9IGJhc2VMb2dnZXIuY3JlYXRlKCdpbnRlcnBvbGF0b3InKTtcblxuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG4gICAgdGhpcy5mb3JtYXQgPSBvcHRpb25zPy5pbnRlcnBvbGF0aW9uPy5mb3JtYXQgfHwgKCh2YWx1ZSkgPT4gdmFsdWUpO1xuICAgIHRoaXMuaW5pdChvcHRpb25zKTtcbiAgfVxuXG4gIC8qIGVzbGludCBuby1wYXJhbS1yZWFzc2lnbjogMCAqL1xuICBpbml0KG9wdGlvbnMgPSB7fSkge1xuICAgIGlmICghb3B0aW9ucy5pbnRlcnBvbGF0aW9uKSBvcHRpb25zLmludGVycG9sYXRpb24gPSB7IGVzY2FwZVZhbHVlOiB0cnVlIH07XG5cbiAgICBjb25zdCB7XG4gICAgICBlc2NhcGUsXG4gICAgICBlc2NhcGVWYWx1ZSxcbiAgICAgIHVzZVJhd1ZhbHVlVG9Fc2NhcGUsXG4gICAgICBwcmVmaXgsXG4gICAgICBwcmVmaXhFc2NhcGVkLFxuICAgICAgc3VmZml4LFxuICAgICAgc3VmZml4RXNjYXBlZCxcbiAgICAgIGZvcm1hdFNlcGFyYXRvcixcbiAgICAgIHVuZXNjYXBlU3VmZml4LFxuICAgICAgdW5lc2NhcGVQcmVmaXgsXG4gICAgICBuZXN0aW5nUHJlZml4LFxuICAgICAgbmVzdGluZ1ByZWZpeEVzY2FwZWQsXG4gICAgICBuZXN0aW5nU3VmZml4LFxuICAgICAgbmVzdGluZ1N1ZmZpeEVzY2FwZWQsXG4gICAgICBuZXN0aW5nT3B0aW9uc1NlcGFyYXRvcixcbiAgICAgIG1heFJlcGxhY2VzLFxuICAgICAgYWx3YXlzRm9ybWF0LFxuICAgIH0gPSBvcHRpb25zLmludGVycG9sYXRpb247XG5cbiAgICB0aGlzLmVzY2FwZSA9IGVzY2FwZSAhPT0gdW5kZWZpbmVkID8gZXNjYXBlIDogdXRpbHNFc2NhcGU7XG4gICAgdGhpcy5lc2NhcGVWYWx1ZSA9IGVzY2FwZVZhbHVlICE9PSB1bmRlZmluZWQgPyBlc2NhcGVWYWx1ZSA6IHRydWU7XG4gICAgdGhpcy51c2VSYXdWYWx1ZVRvRXNjYXBlID0gdXNlUmF3VmFsdWVUb0VzY2FwZSAhPT0gdW5kZWZpbmVkID8gdXNlUmF3VmFsdWVUb0VzY2FwZSA6IGZhbHNlO1xuXG4gICAgdGhpcy5wcmVmaXggPSBwcmVmaXggPyByZWdleEVzY2FwZShwcmVmaXgpIDogcHJlZml4RXNjYXBlZCB8fCAne3snO1xuICAgIHRoaXMuc3VmZml4ID0gc3VmZml4ID8gcmVnZXhFc2NhcGUoc3VmZml4KSA6IHN1ZmZpeEVzY2FwZWQgfHwgJ319JztcblxuICAgIHRoaXMuZm9ybWF0U2VwYXJhdG9yID0gZm9ybWF0U2VwYXJhdG9yIHx8ICcsJztcblxuICAgIHRoaXMudW5lc2NhcGVQcmVmaXggPSB1bmVzY2FwZVN1ZmZpeCA/ICcnIDogdW5lc2NhcGVQcmVmaXggfHwgJy0nO1xuICAgIHRoaXMudW5lc2NhcGVTdWZmaXggPSB0aGlzLnVuZXNjYXBlUHJlZml4ID8gJycgOiB1bmVzY2FwZVN1ZmZpeCB8fCAnJztcblxuICAgIHRoaXMubmVzdGluZ1ByZWZpeCA9IG5lc3RpbmdQcmVmaXhcbiAgICAgID8gcmVnZXhFc2NhcGUobmVzdGluZ1ByZWZpeClcbiAgICAgIDogbmVzdGluZ1ByZWZpeEVzY2FwZWQgfHwgcmVnZXhFc2NhcGUoJyR0KCcpO1xuICAgIHRoaXMubmVzdGluZ1N1ZmZpeCA9IG5lc3RpbmdTdWZmaXhcbiAgICAgID8gcmVnZXhFc2NhcGUobmVzdGluZ1N1ZmZpeClcbiAgICAgIDogbmVzdGluZ1N1ZmZpeEVzY2FwZWQgfHwgcmVnZXhFc2NhcGUoJyknKTtcblxuICAgIHRoaXMubmVzdGluZ09wdGlvbnNTZXBhcmF0b3IgPSBuZXN0aW5nT3B0aW9uc1NlcGFyYXRvciB8fCAnLCc7XG5cbiAgICB0aGlzLm1heFJlcGxhY2VzID0gbWF4UmVwbGFjZXMgfHwgMTAwMDtcblxuICAgIHRoaXMuYWx3YXlzRm9ybWF0ID0gYWx3YXlzRm9ybWF0ICE9PSB1bmRlZmluZWQgPyBhbHdheXNGb3JtYXQgOiBmYWxzZTtcblxuICAgIC8vIHRoZSByZWdleHBcbiAgICB0aGlzLnJlc2V0UmVnRXhwKCk7XG4gIH1cblxuICByZXNldCgpIHtcbiAgICBpZiAodGhpcy5vcHRpb25zKSB0aGlzLmluaXQodGhpcy5vcHRpb25zKTtcbiAgfVxuXG4gIHJlc2V0UmVnRXhwKCkge1xuICAgIGNvbnN0IGdldE9yUmVzZXRSZWdFeHAgPSAoZXhpc3RpbmdSZWdFeHAsIHBhdHRlcm4pID0+IHtcbiAgICAgIGlmIChleGlzdGluZ1JlZ0V4cD8uc291cmNlID09PSBwYXR0ZXJuKSB7XG4gICAgICAgIGV4aXN0aW5nUmVnRXhwLmxhc3RJbmRleCA9IDA7XG4gICAgICAgIHJldHVybiBleGlzdGluZ1JlZ0V4cDtcbiAgICAgIH1cbiAgICAgIHJldHVybiBuZXcgUmVnRXhwKHBhdHRlcm4sICdnJyk7XG4gICAgfTtcblxuICAgIHRoaXMucmVnZXhwID0gZ2V0T3JSZXNldFJlZ0V4cCh0aGlzLnJlZ2V4cCwgYCR7dGhpcy5wcmVmaXh9KC4rPykke3RoaXMuc3VmZml4fWApO1xuICAgIHRoaXMucmVnZXhwVW5lc2NhcGUgPSBnZXRPclJlc2V0UmVnRXhwKFxuICAgICAgdGhpcy5yZWdleHBVbmVzY2FwZSxcbiAgICAgIGAke3RoaXMucHJlZml4fSR7dGhpcy51bmVzY2FwZVByZWZpeH0oLis/KSR7dGhpcy51bmVzY2FwZVN1ZmZpeH0ke3RoaXMuc3VmZml4fWAsXG4gICAgKTtcbiAgICB0aGlzLm5lc3RpbmdSZWdleHAgPSBnZXRPclJlc2V0UmVnRXhwKFxuICAgICAgdGhpcy5uZXN0aW5nUmVnZXhwLFxuICAgICAgYCR7dGhpcy5uZXN0aW5nUHJlZml4fSguKz8pJHt0aGlzLm5lc3RpbmdTdWZmaXh9YCxcbiAgICApO1xuICB9XG5cbiAgaW50ZXJwb2xhdGUoc3RyLCBkYXRhLCBsbmcsIG9wdGlvbnMpIHtcbiAgICBsZXQgbWF0Y2g7XG4gICAgbGV0IHZhbHVlO1xuICAgIGxldCByZXBsYWNlcztcblxuICAgIGNvbnN0IGRlZmF1bHREYXRhID1cbiAgICAgICh0aGlzLm9wdGlvbnMgJiYgdGhpcy5vcHRpb25zLmludGVycG9sYXRpb24gJiYgdGhpcy5vcHRpb25zLmludGVycG9sYXRpb24uZGVmYXVsdFZhcmlhYmxlcykgfHxcbiAgICAgIHt9O1xuXG4gICAgY29uc3QgaGFuZGxlRm9ybWF0ID0gKGtleSkgPT4ge1xuICAgICAgaWYgKGtleS5pbmRleE9mKHRoaXMuZm9ybWF0U2VwYXJhdG9yKSA8IDApIHtcbiAgICAgICAgY29uc3QgcGF0aCA9IGRlZXBGaW5kV2l0aERlZmF1bHRzKFxuICAgICAgICAgIGRhdGEsXG4gICAgICAgICAgZGVmYXVsdERhdGEsXG4gICAgICAgICAga2V5LFxuICAgICAgICAgIHRoaXMub3B0aW9ucy5rZXlTZXBhcmF0b3IsXG4gICAgICAgICAgdGhpcy5vcHRpb25zLmlnbm9yZUpTT05TdHJ1Y3R1cmUsXG4gICAgICAgICk7XG4gICAgICAgIHJldHVybiB0aGlzLmFsd2F5c0Zvcm1hdFxuICAgICAgICAgID8gdGhpcy5mb3JtYXQocGF0aCwgdW5kZWZpbmVkLCBsbmcsIHsgLi4ub3B0aW9ucywgLi4uZGF0YSwgaW50ZXJwb2xhdGlvbmtleToga2V5IH0pXG4gICAgICAgICAgOiBwYXRoO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBwID0ga2V5LnNwbGl0KHRoaXMuZm9ybWF0U2VwYXJhdG9yKTtcbiAgICAgIGNvbnN0IGsgPSBwLnNoaWZ0KCkudHJpbSgpO1xuICAgICAgY29uc3QgZiA9IHAuam9pbih0aGlzLmZvcm1hdFNlcGFyYXRvcikudHJpbSgpO1xuXG4gICAgICByZXR1cm4gdGhpcy5mb3JtYXQoXG4gICAgICAgIGRlZXBGaW5kV2l0aERlZmF1bHRzKFxuICAgICAgICAgIGRhdGEsXG4gICAgICAgICAgZGVmYXVsdERhdGEsXG4gICAgICAgICAgayxcbiAgICAgICAgICB0aGlzLm9wdGlvbnMua2V5U2VwYXJhdG9yLFxuICAgICAgICAgIHRoaXMub3B0aW9ucy5pZ25vcmVKU09OU3RydWN0dXJlLFxuICAgICAgICApLFxuICAgICAgICBmLFxuICAgICAgICBsbmcsXG4gICAgICAgIHtcbiAgICAgICAgICAuLi5vcHRpb25zLFxuICAgICAgICAgIC4uLmRhdGEsXG4gICAgICAgICAgaW50ZXJwb2xhdGlvbmtleTogayxcbiAgICAgICAgfSxcbiAgICAgICk7XG4gICAgfTtcblxuICAgIHRoaXMucmVzZXRSZWdFeHAoKTtcblxuICAgIGNvbnN0IG1pc3NpbmdJbnRlcnBvbGF0aW9uSGFuZGxlciA9XG4gICAgICBvcHRpb25zPy5taXNzaW5nSW50ZXJwb2xhdGlvbkhhbmRsZXIgfHwgdGhpcy5vcHRpb25zLm1pc3NpbmdJbnRlcnBvbGF0aW9uSGFuZGxlcjtcblxuICAgIGNvbnN0IHNraXBPblZhcmlhYmxlcyA9XG4gICAgICBvcHRpb25zPy5pbnRlcnBvbGF0aW9uPy5za2lwT25WYXJpYWJsZXMgIT09IHVuZGVmaW5lZFxuICAgICAgICA/IG9wdGlvbnMuaW50ZXJwb2xhdGlvbi5za2lwT25WYXJpYWJsZXNcbiAgICAgICAgOiB0aGlzLm9wdGlvbnMuaW50ZXJwb2xhdGlvbi5za2lwT25WYXJpYWJsZXM7XG5cbiAgICBjb25zdCB0b2RvcyA9IFtcbiAgICAgIHtcbiAgICAgICAgLy8gdW5lc2NhcGUgaWYgaGFzIHVuZXNjYXBlUHJlZml4L1N1ZmZpeFxuICAgICAgICByZWdleDogdGhpcy5yZWdleHBVbmVzY2FwZSxcbiAgICAgICAgc2FmZVZhbHVlOiAodmFsKSA9PiByZWdleFNhZmUodmFsKSxcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIC8vIHJlZ3VsYXIgZXNjYXBlIG9uIGRlbWFuZFxuICAgICAgICByZWdleDogdGhpcy5yZWdleHAsXG4gICAgICAgIHNhZmVWYWx1ZTogKHZhbCkgPT4gKHRoaXMuZXNjYXBlVmFsdWUgPyByZWdleFNhZmUodGhpcy5lc2NhcGUodmFsKSkgOiByZWdleFNhZmUodmFsKSksXG4gICAgICB9LFxuICAgIF07XG4gICAgdG9kb3MuZm9yRWFjaCgodG9kbykgPT4ge1xuICAgICAgcmVwbGFjZXMgPSAwO1xuICAgICAgLyogZXNsaW50IG5vLWNvbmQtYXNzaWduOiAwICovXG4gICAgICB3aGlsZSAoKG1hdGNoID0gdG9kby5yZWdleC5leGVjKHN0cikpKSB7XG4gICAgICAgIGNvbnN0IG1hdGNoZWRWYXIgPSBtYXRjaFsxXS50cmltKCk7XG4gICAgICAgIHZhbHVlID0gaGFuZGxlRm9ybWF0KG1hdGNoZWRWYXIpO1xuICAgICAgICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGlmICh0eXBlb2YgbWlzc2luZ0ludGVycG9sYXRpb25IYW5kbGVyID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjb25zdCB0ZW1wID0gbWlzc2luZ0ludGVycG9sYXRpb25IYW5kbGVyKHN0ciwgbWF0Y2gsIG9wdGlvbnMpO1xuICAgICAgICAgICAgdmFsdWUgPSBpc1N0cmluZyh0ZW1wKSA/IHRlbXAgOiAnJztcbiAgICAgICAgICB9IGVsc2UgaWYgKG9wdGlvbnMgJiYgT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9wdGlvbnMsIG1hdGNoZWRWYXIpKSB7XG4gICAgICAgICAgICB2YWx1ZSA9ICcnOyAvLyB1bmRlZmluZWQgYmVjb21lcyBlbXB0eSBzdHJpbmdcbiAgICAgICAgICB9IGVsc2UgaWYgKHNraXBPblZhcmlhYmxlcykge1xuICAgICAgICAgICAgdmFsdWUgPSBtYXRjaFswXTtcbiAgICAgICAgICAgIGNvbnRpbnVlOyAvLyB0aGlzIG1ha2VzIHN1cmUgaXQgY29udGludWVzIHRvIGRldGVjdCBvdGhlcnNcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5sb2dnZXIud2FybihgbWlzc2VkIHRvIHBhc3MgaW4gdmFyaWFibGUgJHttYXRjaGVkVmFyfSBmb3IgaW50ZXJwb2xhdGluZyAke3N0cn1gKTtcbiAgICAgICAgICAgIHZhbHVlID0gJyc7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKCFpc1N0cmluZyh2YWx1ZSkgJiYgIXRoaXMudXNlUmF3VmFsdWVUb0VzY2FwZSkge1xuICAgICAgICAgIHZhbHVlID0gbWFrZVN0cmluZyh2YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3Qgc2FmZVZhbHVlID0gdG9kby5zYWZlVmFsdWUodmFsdWUpO1xuICAgICAgICBzdHIgPSBzdHIucmVwbGFjZShtYXRjaFswXSwgc2FmZVZhbHVlKTtcbiAgICAgICAgaWYgKHNraXBPblZhcmlhYmxlcykge1xuICAgICAgICAgIHRvZG8ucmVnZXgubGFzdEluZGV4ICs9IHZhbHVlLmxlbmd0aDtcbiAgICAgICAgICB0b2RvLnJlZ2V4Lmxhc3RJbmRleCAtPSBtYXRjaFswXS5sZW5ndGg7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdG9kby5yZWdleC5sYXN0SW5kZXggPSAwO1xuICAgICAgICB9XG4gICAgICAgIHJlcGxhY2VzKys7XG4gICAgICAgIGlmIChyZXBsYWNlcyA+PSB0aGlzLm1heFJlcGxhY2VzKSB7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gc3RyO1xuICB9XG5cbiAgbmVzdChzdHIsIGZjLCBvcHRpb25zID0ge30pIHtcbiAgICBsZXQgbWF0Y2g7XG4gICAgbGV0IHZhbHVlO1xuXG4gICAgbGV0IGNsb25lZE9wdGlvbnM7XG5cbiAgICAvLyBpZiB2YWx1ZSBpcyBzb21ldGhpbmcgbGlrZSBcIm15S2V5XCI6IFwibG9yZW0gJChhbm90aGVyS2V5LCB7IFwiY291bnRcIjoge3thVmFsdWVJbk9wdGlvbnN9fSB9KVwiXG4gICAgY29uc3QgaGFuZGxlSGFzT3B0aW9ucyA9IChrZXksIGluaGVyaXRlZE9wdGlvbnMpID0+IHtcbiAgICAgIGNvbnN0IHNlcCA9IHRoaXMubmVzdGluZ09wdGlvbnNTZXBhcmF0b3I7XG4gICAgICBpZiAoa2V5LmluZGV4T2Yoc2VwKSA8IDApIHJldHVybiBrZXk7XG5cbiAgICAgIGNvbnN0IGMgPSBrZXkuc3BsaXQobmV3IFJlZ0V4cChgJHtzZXB9WyBdKntgKSk7XG5cbiAgICAgIGxldCBvcHRpb25zU3RyaW5nID0gYHske2NbMV19YDtcbiAgICAgIGtleSA9IGNbMF07XG4gICAgICBvcHRpb25zU3RyaW5nID0gdGhpcy5pbnRlcnBvbGF0ZShvcHRpb25zU3RyaW5nLCBjbG9uZWRPcHRpb25zKTtcbiAgICAgIGNvbnN0IG1hdGNoZWRTaW5nbGVRdW90ZXMgPSBvcHRpb25zU3RyaW5nLm1hdGNoKC8nL2cpO1xuICAgICAgY29uc3QgbWF0Y2hlZERvdWJsZVF1b3RlcyA9IG9wdGlvbnNTdHJpbmcubWF0Y2goL1wiL2cpO1xuICAgICAgaWYgKFxuICAgICAgICAoKG1hdGNoZWRTaW5nbGVRdW90ZXM/Lmxlbmd0aCA/PyAwKSAlIDIgPT09IDAgJiYgIW1hdGNoZWREb3VibGVRdW90ZXMpIHx8XG4gICAgICAgIG1hdGNoZWREb3VibGVRdW90ZXMubGVuZ3RoICUgMiAhPT0gMFxuICAgICAgKSB7XG4gICAgICAgIG9wdGlvbnNTdHJpbmcgPSBvcHRpb25zU3RyaW5nLnJlcGxhY2UoLycvZywgJ1wiJyk7XG4gICAgICB9XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIGNsb25lZE9wdGlvbnMgPSBKU09OLnBhcnNlKG9wdGlvbnNTdHJpbmcpO1xuXG4gICAgICAgIGlmIChpbmhlcml0ZWRPcHRpb25zKSBjbG9uZWRPcHRpb25zID0geyAuLi5pbmhlcml0ZWRPcHRpb25zLCAuLi5jbG9uZWRPcHRpb25zIH07XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHRoaXMubG9nZ2VyLndhcm4oYGZhaWxlZCBwYXJzaW5nIG9wdGlvbnMgc3RyaW5nIGluIG5lc3RpbmcgZm9yIGtleSAke2tleX1gLCBlKTtcbiAgICAgICAgcmV0dXJuIGAke2tleX0ke3NlcH0ke29wdGlvbnNTdHJpbmd9YDtcbiAgICAgIH1cblxuICAgICAgLy8gYXNzZXJ0IHdlIGRvIG5vdCBnZXQgYSBlbmRsZXNzIGxvb3Agb24gaW50ZXJwb2xhdGluZyBkZWZhdWx0VmFsdWUgYWdhaW4gYW5kIGFnYWluXG4gICAgICBpZiAoY2xvbmVkT3B0aW9ucy5kZWZhdWx0VmFsdWUgJiYgY2xvbmVkT3B0aW9ucy5kZWZhdWx0VmFsdWUuaW5kZXhPZih0aGlzLnByZWZpeCkgPiAtMSlcbiAgICAgICAgZGVsZXRlIGNsb25lZE9wdGlvbnMuZGVmYXVsdFZhbHVlO1xuICAgICAgcmV0dXJuIGtleTtcbiAgICB9O1xuXG4gICAgLy8gcmVndWxhciBlc2NhcGUgb24gZGVtYW5kXG4gICAgd2hpbGUgKChtYXRjaCA9IHRoaXMubmVzdGluZ1JlZ2V4cC5leGVjKHN0cikpKSB7XG4gICAgICBsZXQgZm9ybWF0dGVycyA9IFtdO1xuXG4gICAgICBjbG9uZWRPcHRpb25zID0geyAuLi5vcHRpb25zIH07XG4gICAgICBjbG9uZWRPcHRpb25zID1cbiAgICAgICAgY2xvbmVkT3B0aW9ucy5yZXBsYWNlICYmICFpc1N0cmluZyhjbG9uZWRPcHRpb25zLnJlcGxhY2UpXG4gICAgICAgICAgPyBjbG9uZWRPcHRpb25zLnJlcGxhY2VcbiAgICAgICAgICA6IGNsb25lZE9wdGlvbnM7XG4gICAgICBjbG9uZWRPcHRpb25zLmFwcGx5UG9zdFByb2Nlc3NvciA9IGZhbHNlOyAvLyBhdm9pZCBwb3N0IHByb2Nlc3Npbmcgb24gbmVzdGVkIGxvb2t1cFxuICAgICAgZGVsZXRlIGNsb25lZE9wdGlvbnMuZGVmYXVsdFZhbHVlOyAvLyBhc3NlcnQgd2UgZG8gbm90IGdldCBhIGVuZGxlc3MgbG9vcCBvbiBpbnRlcnBvbGF0aW5nIGRlZmF1bHRWYWx1ZSBhZ2FpbiBhbmQgYWdhaW5cblxuICAgICAgLyoqXG4gICAgICAgKiBJZiB0aGVyZSBpcyBtb3JlIHRoYW4gb25lIHBhcmFtZXRlciAoY29udGFpbnMgdGhlIGZvcm1hdCBzZXBhcmF0b3IpLiBFLmcuOlxuICAgICAgICogICAtIHQoYSwgYilcbiAgICAgICAqICAgLSB0KGEsIGIsIGMpXG4gICAgICAgKlxuICAgICAgICogQW5kIHRob3NlIHBhcmFtZXRlcnMgYXJlIG5vdCBkeW5hbWljIHZhbHVlcyAocGFyYW1ldGVycyBkbyBub3QgaW5jbHVkZSBjdXJseSBicmFjZXMpLiBFLmcuOlxuICAgICAgICogICAtIE5vdCB0KGEsIHsgXCJrZXlcIjogXCJ7e3ZhcmlhYmxlfX1cIiB9KVxuICAgICAgICogICAtIE5vdCB0KGEsIGIsIHtcImtleUFcIjogXCJ2YWx1ZUFcIiwgXCJrZXlCXCI6IFwidmFsdWVCXCJ9KVxuICAgICAgICovXG4gICAgICBsZXQgZG9SZWR1Y2UgPSBmYWxzZTtcbiAgICAgIGlmIChtYXRjaFswXS5pbmRleE9mKHRoaXMuZm9ybWF0U2VwYXJhdG9yKSAhPT0gLTEgJiYgIS97Lip9Ly50ZXN0KG1hdGNoWzFdKSkge1xuICAgICAgICBjb25zdCByID0gbWF0Y2hbMV0uc3BsaXQodGhpcy5mb3JtYXRTZXBhcmF0b3IpLm1hcCgoZWxlbSkgPT4gZWxlbS50cmltKCkpO1xuICAgICAgICBtYXRjaFsxXSA9IHIuc2hpZnQoKTtcbiAgICAgICAgZm9ybWF0dGVycyA9IHI7XG4gICAgICAgIGRvUmVkdWNlID0gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgdmFsdWUgPSBmYyhoYW5kbGVIYXNPcHRpb25zLmNhbGwodGhpcywgbWF0Y2hbMV0udHJpbSgpLCBjbG9uZWRPcHRpb25zKSwgY2xvbmVkT3B0aW9ucyk7XG5cbiAgICAgIC8vIGlzIG9ubHkgdGhlIG5lc3Rpbmcga2V5IChrZXkxID0gJyQoa2V5MiknKSByZXR1cm4gdGhlIHZhbHVlIHdpdGhvdXQgc3RyaW5naWZ5XG4gICAgICBpZiAodmFsdWUgJiYgbWF0Y2hbMF0gPT09IHN0ciAmJiAhaXNTdHJpbmcodmFsdWUpKSByZXR1cm4gdmFsdWU7XG5cbiAgICAgIC8vIG5vIHN0cmluZyB0byBpbmNsdWRlIG9yIGVtcHR5XG4gICAgICBpZiAoIWlzU3RyaW5nKHZhbHVlKSkgdmFsdWUgPSBtYWtlU3RyaW5nKHZhbHVlKTtcbiAgICAgIGlmICghdmFsdWUpIHtcbiAgICAgICAgdGhpcy5sb2dnZXIud2FybihgbWlzc2VkIHRvIHJlc29sdmUgJHttYXRjaFsxXX0gZm9yIG5lc3RpbmcgJHtzdHJ9YCk7XG4gICAgICAgIHZhbHVlID0gJyc7XG4gICAgICB9XG5cbiAgICAgIGlmIChkb1JlZHVjZSkge1xuICAgICAgICB2YWx1ZSA9IGZvcm1hdHRlcnMucmVkdWNlKFxuICAgICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1sb29wLWZ1bmNcbiAgICAgICAgICAodiwgZikgPT5cbiAgICAgICAgICAgIHRoaXMuZm9ybWF0KHYsIGYsIG9wdGlvbnMubG5nLCB7IC4uLm9wdGlvbnMsIGludGVycG9sYXRpb25rZXk6IG1hdGNoWzFdLnRyaW0oKSB9KSxcbiAgICAgICAgICB2YWx1ZS50cmltKCksXG4gICAgICAgICk7XG4gICAgICB9XG5cbiAgICAgIC8vIE5lc3RlZCBrZXlzIHNob3VsZCBub3QgYmUgZXNjYXBlZCBieSBkZWZhdWx0ICM4NTRcbiAgICAgIC8vIHZhbHVlID0gdGhpcy5lc2NhcGVWYWx1ZSA/IHJlZ2V4U2FmZSh1dGlscy5lc2NhcGUodmFsdWUpKSA6IHJlZ2V4U2FmZSh2YWx1ZSk7XG4gICAgICBzdHIgPSBzdHIucmVwbGFjZShtYXRjaFswXSwgdmFsdWUpO1xuICAgICAgdGhpcy5yZWdleHAubGFzdEluZGV4ID0gMDtcbiAgICB9XG4gICAgcmV0dXJuIHN0cjtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBJbnRlcnBvbGF0b3I7XG4iLCJpbXBvcnQgYmFzZUxvZ2dlciBmcm9tICcuL2xvZ2dlci5qcyc7XG5pbXBvcnQgeyBnZXRDbGVhbmVkQ29kZSB9IGZyb20gJy4vdXRpbHMuanMnO1xuXG5jb25zdCBwYXJzZUZvcm1hdFN0ciA9IChmb3JtYXRTdHIpID0+IHtcbiAgbGV0IGZvcm1hdE5hbWUgPSBmb3JtYXRTdHIudG9Mb3dlckNhc2UoKS50cmltKCk7XG4gIGNvbnN0IGZvcm1hdE9wdGlvbnMgPSB7fTtcbiAgaWYgKGZvcm1hdFN0ci5pbmRleE9mKCcoJykgPiAtMSkge1xuICAgIGNvbnN0IHAgPSBmb3JtYXRTdHIuc3BsaXQoJygnKTtcbiAgICBmb3JtYXROYW1lID0gcFswXS50b0xvd2VyQ2FzZSgpLnRyaW0oKTtcblxuICAgIGNvbnN0IG9wdFN0ciA9IHBbMV0uc3Vic3RyaW5nKDAsIHBbMV0ubGVuZ3RoIC0gMSk7XG5cbiAgICAvLyBleHRyYSBmb3IgY3VycmVuY3lcbiAgICBpZiAoZm9ybWF0TmFtZSA9PT0gJ2N1cnJlbmN5JyAmJiBvcHRTdHIuaW5kZXhPZignOicpIDwgMCkge1xuICAgICAgaWYgKCFmb3JtYXRPcHRpb25zLmN1cnJlbmN5KSBmb3JtYXRPcHRpb25zLmN1cnJlbmN5ID0gb3B0U3RyLnRyaW0oKTtcbiAgICB9IGVsc2UgaWYgKGZvcm1hdE5hbWUgPT09ICdyZWxhdGl2ZXRpbWUnICYmIG9wdFN0ci5pbmRleE9mKCc6JykgPCAwKSB7XG4gICAgICBpZiAoIWZvcm1hdE9wdGlvbnMucmFuZ2UpIGZvcm1hdE9wdGlvbnMucmFuZ2UgPSBvcHRTdHIudHJpbSgpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBvcHRzID0gb3B0U3RyLnNwbGl0KCc7Jyk7XG5cbiAgICAgIG9wdHMuZm9yRWFjaCgob3B0KSA9PiB7XG4gICAgICAgIGlmIChvcHQpIHtcbiAgICAgICAgICBjb25zdCBba2V5LCAuLi5yZXN0XSA9IG9wdC5zcGxpdCgnOicpO1xuICAgICAgICAgIGNvbnN0IHZhbCA9IHJlc3RcbiAgICAgICAgICAgIC5qb2luKCc6JylcbiAgICAgICAgICAgIC50cmltKClcbiAgICAgICAgICAgIC5yZXBsYWNlKC9eJyt8JyskL2csICcnKTsgLy8gdHJpbSBhbmQgcmVwbGFjZSAnJ1xuXG4gICAgICAgICAgY29uc3QgdHJpbW1lZEtleSA9IGtleS50cmltKCk7XG5cbiAgICAgICAgICBpZiAoIWZvcm1hdE9wdGlvbnNbdHJpbW1lZEtleV0pIGZvcm1hdE9wdGlvbnNbdHJpbW1lZEtleV0gPSB2YWw7XG4gICAgICAgICAgaWYgKHZhbCA9PT0gJ2ZhbHNlJykgZm9ybWF0T3B0aW9uc1t0cmltbWVkS2V5XSA9IGZhbHNlO1xuICAgICAgICAgIGlmICh2YWwgPT09ICd0cnVlJykgZm9ybWF0T3B0aW9uc1t0cmltbWVkS2V5XSA9IHRydWU7XG4gICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLXJlc3RyaWN0ZWQtZ2xvYmFsc1xuICAgICAgICAgIGlmICghaXNOYU4odmFsKSkgZm9ybWF0T3B0aW9uc1t0cmltbWVkS2V5XSA9IHBhcnNlSW50KHZhbCwgMTApO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGZvcm1hdE5hbWUsXG4gICAgZm9ybWF0T3B0aW9ucyxcbiAgfTtcbn07XG5cbmNvbnN0IGNyZWF0ZUNhY2hlZEZvcm1hdHRlciA9IChmbikgPT4ge1xuICBjb25zdCBjYWNoZSA9IHt9O1xuICByZXR1cm4gKHZhbCwgbG5nLCBvcHRpb25zKSA9PiB7XG4gICAgbGV0IG9wdEZvckNhY2hlID0gb3B0aW9ucztcbiAgICAvLyB0aGlzIGNhY2hlIG9wdGltaXphdGlvbiB3aWxsIG9ubHkgd29yayBmb3Iga2V5cyBoYXZpbmcgMSBpbnRlcnBvbGF0ZWQgdmFsdWVcbiAgICBpZiAoXG4gICAgICBvcHRpb25zICYmXG4gICAgICBvcHRpb25zLmludGVycG9sYXRpb25rZXkgJiZcbiAgICAgIG9wdGlvbnMuZm9ybWF0UGFyYW1zICYmXG4gICAgICBvcHRpb25zLmZvcm1hdFBhcmFtc1tvcHRpb25zLmludGVycG9sYXRpb25rZXldICYmXG4gICAgICBvcHRpb25zW29wdGlvbnMuaW50ZXJwb2xhdGlvbmtleV1cbiAgICApIHtcbiAgICAgIG9wdEZvckNhY2hlID0ge1xuICAgICAgICAuLi5vcHRGb3JDYWNoZSxcbiAgICAgICAgW29wdGlvbnMuaW50ZXJwb2xhdGlvbmtleV06IHVuZGVmaW5lZCxcbiAgICAgIH07XG4gICAgfVxuICAgIGNvbnN0IGtleSA9IGxuZyArIEpTT04uc3RyaW5naWZ5KG9wdEZvckNhY2hlKTtcbiAgICBsZXQgZm9ybWF0dGVyID0gY2FjaGVba2V5XTtcbiAgICBpZiAoIWZvcm1hdHRlcikge1xuICAgICAgZm9ybWF0dGVyID0gZm4oZ2V0Q2xlYW5lZENvZGUobG5nKSwgb3B0aW9ucyk7XG4gICAgICBjYWNoZVtrZXldID0gZm9ybWF0dGVyO1xuICAgIH1cbiAgICByZXR1cm4gZm9ybWF0dGVyKHZhbCk7XG4gIH07XG59O1xuXG5jbGFzcyBGb3JtYXR0ZXIge1xuICBjb25zdHJ1Y3RvcihvcHRpb25zID0ge30pIHtcbiAgICB0aGlzLmxvZ2dlciA9IGJhc2VMb2dnZXIuY3JlYXRlKCdmb3JtYXR0ZXInKTtcblxuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG4gICAgdGhpcy5mb3JtYXRzID0ge1xuICAgICAgbnVtYmVyOiBjcmVhdGVDYWNoZWRGb3JtYXR0ZXIoKGxuZywgb3B0KSA9PiB7XG4gICAgICAgIGNvbnN0IGZvcm1hdHRlciA9IG5ldyBJbnRsLk51bWJlckZvcm1hdChsbmcsIHsgLi4ub3B0IH0pO1xuICAgICAgICByZXR1cm4gKHZhbCkgPT4gZm9ybWF0dGVyLmZvcm1hdCh2YWwpO1xuICAgICAgfSksXG4gICAgICBjdXJyZW5jeTogY3JlYXRlQ2FjaGVkRm9ybWF0dGVyKChsbmcsIG9wdCkgPT4ge1xuICAgICAgICBjb25zdCBmb3JtYXR0ZXIgPSBuZXcgSW50bC5OdW1iZXJGb3JtYXQobG5nLCB7IC4uLm9wdCwgc3R5bGU6ICdjdXJyZW5jeScgfSk7XG4gICAgICAgIHJldHVybiAodmFsKSA9PiBmb3JtYXR0ZXIuZm9ybWF0KHZhbCk7XG4gICAgICB9KSxcbiAgICAgIGRhdGV0aW1lOiBjcmVhdGVDYWNoZWRGb3JtYXR0ZXIoKGxuZywgb3B0KSA9PiB7XG4gICAgICAgIGNvbnN0IGZvcm1hdHRlciA9IG5ldyBJbnRsLkRhdGVUaW1lRm9ybWF0KGxuZywgeyAuLi5vcHQgfSk7XG4gICAgICAgIHJldHVybiAodmFsKSA9PiBmb3JtYXR0ZXIuZm9ybWF0KHZhbCk7XG4gICAgICB9KSxcbiAgICAgIHJlbGF0aXZldGltZTogY3JlYXRlQ2FjaGVkRm9ybWF0dGVyKChsbmcsIG9wdCkgPT4ge1xuICAgICAgICBjb25zdCBmb3JtYXR0ZXIgPSBuZXcgSW50bC5SZWxhdGl2ZVRpbWVGb3JtYXQobG5nLCB7IC4uLm9wdCB9KTtcbiAgICAgICAgcmV0dXJuICh2YWwpID0+IGZvcm1hdHRlci5mb3JtYXQodmFsLCBvcHQucmFuZ2UgfHwgJ2RheScpO1xuICAgICAgfSksXG4gICAgICBsaXN0OiBjcmVhdGVDYWNoZWRGb3JtYXR0ZXIoKGxuZywgb3B0KSA9PiB7XG4gICAgICAgIGNvbnN0IGZvcm1hdHRlciA9IG5ldyBJbnRsLkxpc3RGb3JtYXQobG5nLCB7IC4uLm9wdCB9KTtcbiAgICAgICAgcmV0dXJuICh2YWwpID0+IGZvcm1hdHRlci5mb3JtYXQodmFsKTtcbiAgICAgIH0pLFxuICAgIH07XG4gICAgdGhpcy5pbml0KG9wdGlvbnMpO1xuICB9XG5cbiAgLyogZXNsaW50IG5vLXBhcmFtLXJlYXNzaWduOiAwICovXG4gIGluaXQoc2VydmljZXMsIG9wdGlvbnMgPSB7IGludGVycG9sYXRpb246IHt9IH0pIHtcbiAgICB0aGlzLmZvcm1hdFNlcGFyYXRvciA9IG9wdGlvbnMuaW50ZXJwb2xhdGlvbi5mb3JtYXRTZXBhcmF0b3IgfHwgJywnO1xuICB9XG5cbiAgYWRkKG5hbWUsIGZjKSB7XG4gICAgdGhpcy5mb3JtYXRzW25hbWUudG9Mb3dlckNhc2UoKS50cmltKCldID0gZmM7XG4gIH1cblxuICBhZGRDYWNoZWQobmFtZSwgZmMpIHtcbiAgICB0aGlzLmZvcm1hdHNbbmFtZS50b0xvd2VyQ2FzZSgpLnRyaW0oKV0gPSBjcmVhdGVDYWNoZWRGb3JtYXR0ZXIoZmMpO1xuICB9XG5cbiAgZm9ybWF0KHZhbHVlLCBmb3JtYXQsIGxuZywgb3B0aW9ucyA9IHt9KSB7XG4gICAgY29uc3QgZm9ybWF0cyA9IGZvcm1hdC5zcGxpdCh0aGlzLmZvcm1hdFNlcGFyYXRvcik7XG4gICAgaWYgKFxuICAgICAgZm9ybWF0cy5sZW5ndGggPiAxICYmXG4gICAgICBmb3JtYXRzWzBdLmluZGV4T2YoJygnKSA+IDEgJiZcbiAgICAgIGZvcm1hdHNbMF0uaW5kZXhPZignKScpIDwgMCAmJlxuICAgICAgZm9ybWF0cy5maW5kKChmKSA9PiBmLmluZGV4T2YoJyknKSA+IC0xKVxuICAgICkge1xuICAgICAgY29uc3QgbGFzdEluZGV4ID0gZm9ybWF0cy5maW5kSW5kZXgoKGYpID0+IGYuaW5kZXhPZignKScpID4gLTEpO1xuICAgICAgZm9ybWF0c1swXSA9IFtmb3JtYXRzWzBdLCAuLi5mb3JtYXRzLnNwbGljZSgxLCBsYXN0SW5kZXgpXS5qb2luKHRoaXMuZm9ybWF0U2VwYXJhdG9yKTtcbiAgICB9XG5cbiAgICBjb25zdCByZXN1bHQgPSBmb3JtYXRzLnJlZHVjZSgobWVtLCBmKSA9PiB7XG4gICAgICBjb25zdCB7IGZvcm1hdE5hbWUsIGZvcm1hdE9wdGlvbnMgfSA9IHBhcnNlRm9ybWF0U3RyKGYpO1xuXG4gICAgICBpZiAodGhpcy5mb3JtYXRzW2Zvcm1hdE5hbWVdKSB7XG4gICAgICAgIGxldCBmb3JtYXR0ZWQgPSBtZW07XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgLy8gb3B0aW9ucyBwYXNzZWQgZXhwbGljaXQgZm9yIHRoYXQgZm9ybWF0dGVkIHZhbHVlXG4gICAgICAgICAgY29uc3QgdmFsT3B0aW9ucyA9IG9wdGlvbnM/LmZvcm1hdFBhcmFtcz8uW29wdGlvbnMuaW50ZXJwb2xhdGlvbmtleV0gfHwge307XG5cbiAgICAgICAgICAvLyBsYW5ndWFnZVxuICAgICAgICAgIGNvbnN0IGwgPSB2YWxPcHRpb25zLmxvY2FsZSB8fCB2YWxPcHRpb25zLmxuZyB8fCBvcHRpb25zLmxvY2FsZSB8fCBvcHRpb25zLmxuZyB8fCBsbmc7XG5cbiAgICAgICAgICBmb3JtYXR0ZWQgPSB0aGlzLmZvcm1hdHNbZm9ybWF0TmFtZV0obWVtLCBsLCB7XG4gICAgICAgICAgICAuLi5mb3JtYXRPcHRpb25zLFxuICAgICAgICAgICAgLi4ub3B0aW9ucyxcbiAgICAgICAgICAgIC4uLnZhbE9wdGlvbnMsXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgdGhpcy5sb2dnZXIud2FybihlcnJvcik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZvcm1hdHRlZDtcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWVsc2UtcmV0dXJuXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmxvZ2dlci53YXJuKGB0aGVyZSB3YXMgbm8gZm9ybWF0IGZ1bmN0aW9uIGZvciAke2Zvcm1hdE5hbWV9YCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gbWVtO1xuICAgIH0sIHZhbHVlKTtcblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgRm9ybWF0dGVyO1xuIiwiaW1wb3J0IHsgcHVzaFBhdGgsIGlzU3RyaW5nIH0gZnJvbSAnLi91dGlscy5qcyc7XG5pbXBvcnQgYmFzZUxvZ2dlciBmcm9tICcuL2xvZ2dlci5qcyc7XG5pbXBvcnQgRXZlbnRFbWl0dGVyIGZyb20gJy4vRXZlbnRFbWl0dGVyLmpzJztcblxuY29uc3QgcmVtb3ZlUGVuZGluZyA9IChxLCBuYW1lKSA9PiB7XG4gIGlmIChxLnBlbmRpbmdbbmFtZV0gIT09IHVuZGVmaW5lZCkge1xuICAgIGRlbGV0ZSBxLnBlbmRpbmdbbmFtZV07XG4gICAgcS5wZW5kaW5nQ291bnQtLTtcbiAgfVxufTtcblxuY2xhc3MgQ29ubmVjdG9yIGV4dGVuZHMgRXZlbnRFbWl0dGVyIHtcbiAgY29uc3RydWN0b3IoYmFja2VuZCwgc3RvcmUsIHNlcnZpY2VzLCBvcHRpb25zID0ge30pIHtcbiAgICBzdXBlcigpO1xuXG4gICAgdGhpcy5iYWNrZW5kID0gYmFja2VuZDtcbiAgICB0aGlzLnN0b3JlID0gc3RvcmU7XG4gICAgdGhpcy5zZXJ2aWNlcyA9IHNlcnZpY2VzO1xuICAgIHRoaXMubGFuZ3VhZ2VVdGlscyA9IHNlcnZpY2VzLmxhbmd1YWdlVXRpbHM7XG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcbiAgICB0aGlzLmxvZ2dlciA9IGJhc2VMb2dnZXIuY3JlYXRlKCdiYWNrZW5kQ29ubmVjdG9yJyk7XG5cbiAgICB0aGlzLndhaXRpbmdSZWFkcyA9IFtdO1xuICAgIHRoaXMubWF4UGFyYWxsZWxSZWFkcyA9IG9wdGlvbnMubWF4UGFyYWxsZWxSZWFkcyB8fCAxMDtcbiAgICB0aGlzLnJlYWRpbmdDYWxscyA9IDA7XG5cbiAgICB0aGlzLm1heFJldHJpZXMgPSBvcHRpb25zLm1heFJldHJpZXMgPj0gMCA/IG9wdGlvbnMubWF4UmV0cmllcyA6IDU7XG4gICAgdGhpcy5yZXRyeVRpbWVvdXQgPSBvcHRpb25zLnJldHJ5VGltZW91dCA+PSAxID8gb3B0aW9ucy5yZXRyeVRpbWVvdXQgOiAzNTA7XG5cbiAgICB0aGlzLnN0YXRlID0ge307XG4gICAgdGhpcy5xdWV1ZSA9IFtdO1xuXG4gICAgdGhpcy5iYWNrZW5kPy5pbml0Py4oc2VydmljZXMsIG9wdGlvbnMuYmFja2VuZCwgb3B0aW9ucyk7XG4gIH1cblxuICBxdWV1ZUxvYWQobGFuZ3VhZ2VzLCBuYW1lc3BhY2VzLCBvcHRpb25zLCBjYWxsYmFjaykge1xuICAgIC8vIGZpbmQgd2hhdCBuZWVkcyB0byBiZSBsb2FkZWRcbiAgICBjb25zdCB0b0xvYWQgPSB7fTtcbiAgICBjb25zdCBwZW5kaW5nID0ge307XG4gICAgY29uc3QgdG9Mb2FkTGFuZ3VhZ2VzID0ge307XG4gICAgY29uc3QgdG9Mb2FkTmFtZXNwYWNlcyA9IHt9O1xuXG4gICAgbGFuZ3VhZ2VzLmZvckVhY2goKGxuZykgPT4ge1xuICAgICAgbGV0IGhhc0FsbE5hbWVzcGFjZXMgPSB0cnVlO1xuXG4gICAgICBuYW1lc3BhY2VzLmZvckVhY2goKG5zKSA9PiB7XG4gICAgICAgIGNvbnN0IG5hbWUgPSBgJHtsbmd9fCR7bnN9YDtcblxuICAgICAgICBpZiAoIW9wdGlvbnMucmVsb2FkICYmIHRoaXMuc3RvcmUuaGFzUmVzb3VyY2VCdW5kbGUobG5nLCBucykpIHtcbiAgICAgICAgICB0aGlzLnN0YXRlW25hbWVdID0gMjsgLy8gbG9hZGVkXG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5zdGF0ZVtuYW1lXSA8IDApIHtcbiAgICAgICAgICAvLyBub3RoaW5nIHRvIGRvIGZvciBlcnJcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLnN0YXRlW25hbWVdID09PSAxKSB7XG4gICAgICAgICAgaWYgKHBlbmRpbmdbbmFtZV0gPT09IHVuZGVmaW5lZCkgcGVuZGluZ1tuYW1lXSA9IHRydWU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5zdGF0ZVtuYW1lXSA9IDE7IC8vIHBlbmRpbmdcblxuICAgICAgICAgIGhhc0FsbE5hbWVzcGFjZXMgPSBmYWxzZTtcblxuICAgICAgICAgIGlmIChwZW5kaW5nW25hbWVdID09PSB1bmRlZmluZWQpIHBlbmRpbmdbbmFtZV0gPSB0cnVlO1xuICAgICAgICAgIGlmICh0b0xvYWRbbmFtZV0gPT09IHVuZGVmaW5lZCkgdG9Mb2FkW25hbWVdID0gdHJ1ZTtcbiAgICAgICAgICBpZiAodG9Mb2FkTmFtZXNwYWNlc1tuc10gPT09IHVuZGVmaW5lZCkgdG9Mb2FkTmFtZXNwYWNlc1tuc10gPSB0cnVlO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgaWYgKCFoYXNBbGxOYW1lc3BhY2VzKSB0b0xvYWRMYW5ndWFnZXNbbG5nXSA9IHRydWU7XG4gICAgfSk7XG5cbiAgICBpZiAoT2JqZWN0LmtleXModG9Mb2FkKS5sZW5ndGggfHwgT2JqZWN0LmtleXMocGVuZGluZykubGVuZ3RoKSB7XG4gICAgICB0aGlzLnF1ZXVlLnB1c2goe1xuICAgICAgICBwZW5kaW5nLFxuICAgICAgICBwZW5kaW5nQ291bnQ6IE9iamVjdC5rZXlzKHBlbmRpbmcpLmxlbmd0aCxcbiAgICAgICAgbG9hZGVkOiB7fSxcbiAgICAgICAgZXJyb3JzOiBbXSxcbiAgICAgICAgY2FsbGJhY2ssXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgdG9Mb2FkOiBPYmplY3Qua2V5cyh0b0xvYWQpLFxuICAgICAgcGVuZGluZzogT2JqZWN0LmtleXMocGVuZGluZyksXG4gICAgICB0b0xvYWRMYW5ndWFnZXM6IE9iamVjdC5rZXlzKHRvTG9hZExhbmd1YWdlcyksXG4gICAgICB0b0xvYWROYW1lc3BhY2VzOiBPYmplY3Qua2V5cyh0b0xvYWROYW1lc3BhY2VzKSxcbiAgICB9O1xuICB9XG5cbiAgbG9hZGVkKG5hbWUsIGVyciwgZGF0YSkge1xuICAgIGNvbnN0IHMgPSBuYW1lLnNwbGl0KCd8Jyk7XG4gICAgY29uc3QgbG5nID0gc1swXTtcbiAgICBjb25zdCBucyA9IHNbMV07XG5cbiAgICBpZiAoZXJyKSB0aGlzLmVtaXQoJ2ZhaWxlZExvYWRpbmcnLCBsbmcsIG5zLCBlcnIpO1xuXG4gICAgaWYgKCFlcnIgJiYgZGF0YSkge1xuICAgICAgdGhpcy5zdG9yZS5hZGRSZXNvdXJjZUJ1bmRsZShsbmcsIG5zLCBkYXRhLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgeyBza2lwQ29weTogdHJ1ZSB9KTtcbiAgICB9XG5cbiAgICAvLyBzZXQgbG9hZGVkXG4gICAgdGhpcy5zdGF0ZVtuYW1lXSA9IGVyciA/IC0xIDogMjtcbiAgICBpZiAoZXJyICYmIGRhdGEpIHRoaXMuc3RhdGVbbmFtZV0gPSAwO1xuXG4gICAgLy8gY29uc29saWRhdGVkIGxvYWRpbmcgZG9uZSBpbiB0aGlzIHJ1biAtIG9ubHkgZW1pdCBvbmNlIGZvciBhIGxvYWRlZCBuYW1lc3BhY2VcbiAgICBjb25zdCBsb2FkZWQgPSB7fTtcblxuICAgIC8vIGNhbGxiYWNrIGlmIHJlYWR5XG4gICAgdGhpcy5xdWV1ZS5mb3JFYWNoKChxKSA9PiB7XG4gICAgICBwdXNoUGF0aChxLmxvYWRlZCwgW2xuZ10sIG5zKTtcbiAgICAgIHJlbW92ZVBlbmRpbmcocSwgbmFtZSk7XG5cbiAgICAgIGlmIChlcnIpIHEuZXJyb3JzLnB1c2goZXJyKTtcblxuICAgICAgaWYgKHEucGVuZGluZ0NvdW50ID09PSAwICYmICFxLmRvbmUpIHtcbiAgICAgICAgLy8gb25seSBkbyBvbmNlIHBlciBsb2FkZWQgLT4gdGhpcy5lbWl0KCdsb2FkZWQnLCBxLmxvYWRlZCk7XG4gICAgICAgIE9iamVjdC5rZXlzKHEubG9hZGVkKS5mb3JFYWNoKChsKSA9PiB7XG4gICAgICAgICAgaWYgKCFsb2FkZWRbbF0pIGxvYWRlZFtsXSA9IHt9O1xuICAgICAgICAgIGNvbnN0IGxvYWRlZEtleXMgPSBxLmxvYWRlZFtsXTtcbiAgICAgICAgICBpZiAobG9hZGVkS2V5cy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGxvYWRlZEtleXMuZm9yRWFjaCgobikgPT4ge1xuICAgICAgICAgICAgICBpZiAobG9hZGVkW2xdW25dID09PSB1bmRlZmluZWQpIGxvYWRlZFtsXVtuXSA9IHRydWU7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8qIGVzbGludCBuby1wYXJhbS1yZWFzc2lnbjogMCAqL1xuICAgICAgICBxLmRvbmUgPSB0cnVlO1xuICAgICAgICBpZiAocS5lcnJvcnMubGVuZ3RoKSB7XG4gICAgICAgICAgcS5jYWxsYmFjayhxLmVycm9ycyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcS5jYWxsYmFjaygpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBlbWl0IGNvbnNvbGlkYXRlZCBsb2FkZWQgZXZlbnRcbiAgICB0aGlzLmVtaXQoJ2xvYWRlZCcsIGxvYWRlZCk7XG5cbiAgICAvLyByZW1vdmUgZG9uZSBsb2FkIHJlcXVlc3RzXG4gICAgdGhpcy5xdWV1ZSA9IHRoaXMucXVldWUuZmlsdGVyKChxKSA9PiAhcS5kb25lKTtcbiAgfVxuXG4gIHJlYWQobG5nLCBucywgZmNOYW1lLCB0cmllZCA9IDAsIHdhaXQgPSB0aGlzLnJldHJ5VGltZW91dCwgY2FsbGJhY2spIHtcbiAgICBpZiAoIWxuZy5sZW5ndGgpIHJldHVybiBjYWxsYmFjayhudWxsLCB7fSk7IC8vIG5vdGluZyB0byBsb2FkXG5cbiAgICAvLyBMaW1pdCBwYXJhbGxlbGlzbSBvZiBjYWxscyB0byBiYWNrZW5kXG4gICAgLy8gVGhpcyBpcyBuZWVkZWQgdG8gcHJldmVudCB0cnlpbmcgdG8gb3BlbiB0aG91c2FuZHMgb2ZcbiAgICAvLyBzb2NrZXRzIG9yIGZpbGUgZGVzY3JpcHRvcnMsIHdoaWNoIGNhbiBjYXVzZSBmYWlsdXJlc1xuICAgIC8vIGFuZCBhY3R1YWxseSBtYWtlIHRoZSBlbnRpcmUgcHJvY2VzcyB0YWtlIGxvbmdlci5cbiAgICBpZiAodGhpcy5yZWFkaW5nQ2FsbHMgPj0gdGhpcy5tYXhQYXJhbGxlbFJlYWRzKSB7XG4gICAgICB0aGlzLndhaXRpbmdSZWFkcy5wdXNoKHsgbG5nLCBucywgZmNOYW1lLCB0cmllZCwgd2FpdCwgY2FsbGJhY2sgfSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMucmVhZGluZ0NhbGxzKys7XG5cbiAgICBjb25zdCByZXNvbHZlciA9IChlcnIsIGRhdGEpID0+IHtcbiAgICAgIHRoaXMucmVhZGluZ0NhbGxzLS07XG4gICAgICBpZiAodGhpcy53YWl0aW5nUmVhZHMubGVuZ3RoID4gMCkge1xuICAgICAgICBjb25zdCBuZXh0ID0gdGhpcy53YWl0aW5nUmVhZHMuc2hpZnQoKTtcbiAgICAgICAgdGhpcy5yZWFkKG5leHQubG5nLCBuZXh0Lm5zLCBuZXh0LmZjTmFtZSwgbmV4dC50cmllZCwgbmV4dC53YWl0LCBuZXh0LmNhbGxiYWNrKTtcbiAgICAgIH1cbiAgICAgIGlmIChlcnIgJiYgZGF0YSAvKiA9IHJldHJ5RmxhZyAqLyAmJiB0cmllZCA8IHRoaXMubWF4UmV0cmllcykge1xuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICB0aGlzLnJlYWQuY2FsbCh0aGlzLCBsbmcsIG5zLCBmY05hbWUsIHRyaWVkICsgMSwgd2FpdCAqIDIsIGNhbGxiYWNrKTtcbiAgICAgICAgfSwgd2FpdCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGNhbGxiYWNrKGVyciwgZGF0YSk7XG4gICAgfTtcblxuICAgIGNvbnN0IGZjID0gdGhpcy5iYWNrZW5kW2ZjTmFtZV0uYmluZCh0aGlzLmJhY2tlbmQpO1xuICAgIGlmIChmYy5sZW5ndGggPT09IDIpIHtcbiAgICAgIC8vIG5vIGNhbGxiYWNrXG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCByID0gZmMobG5nLCBucyk7XG4gICAgICAgIGlmIChyICYmIHR5cGVvZiByLnRoZW4gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAvLyBwcm9taXNlXG4gICAgICAgICAgci50aGVuKChkYXRhKSA9PiByZXNvbHZlcihudWxsLCBkYXRhKSkuY2F0Y2gocmVzb2x2ZXIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIHN5bmNcbiAgICAgICAgICByZXNvbHZlcihudWxsLCByKTtcbiAgICAgICAgfVxuICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgIHJlc29sdmVyKGVycik7XG4gICAgICB9XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gbm9ybWFsIHdpdGggY2FsbGJhY2tcbiAgICByZXR1cm4gZmMobG5nLCBucywgcmVzb2x2ZXIpO1xuICB9XG5cbiAgLyogZXNsaW50IGNvbnNpc3RlbnQtcmV0dXJuOiAwICovXG4gIHByZXBhcmVMb2FkaW5nKGxhbmd1YWdlcywgbmFtZXNwYWNlcywgb3B0aW9ucyA9IHt9LCBjYWxsYmFjaykge1xuICAgIGlmICghdGhpcy5iYWNrZW5kKSB7XG4gICAgICB0aGlzLmxvZ2dlci53YXJuKCdObyBiYWNrZW5kIHdhcyBhZGRlZCB2aWEgaTE4bmV4dC51c2UuIFdpbGwgbm90IGxvYWQgcmVzb3VyY2VzLicpO1xuICAgICAgcmV0dXJuIGNhbGxiYWNrICYmIGNhbGxiYWNrKCk7XG4gICAgfVxuXG4gICAgaWYgKGlzU3RyaW5nKGxhbmd1YWdlcykpIGxhbmd1YWdlcyA9IHRoaXMubGFuZ3VhZ2VVdGlscy50b1Jlc29sdmVIaWVyYXJjaHkobGFuZ3VhZ2VzKTtcbiAgICBpZiAoaXNTdHJpbmcobmFtZXNwYWNlcykpIG5hbWVzcGFjZXMgPSBbbmFtZXNwYWNlc107XG5cbiAgICBjb25zdCB0b0xvYWQgPSB0aGlzLnF1ZXVlTG9hZChsYW5ndWFnZXMsIG5hbWVzcGFjZXMsIG9wdGlvbnMsIGNhbGxiYWNrKTtcbiAgICBpZiAoIXRvTG9hZC50b0xvYWQubGVuZ3RoKSB7XG4gICAgICBpZiAoIXRvTG9hZC5wZW5kaW5nLmxlbmd0aCkgY2FsbGJhY2soKTsgLy8gbm90aGluZyB0byBsb2FkIGFuZCBubyBwZW5kaW5ncy4uLmNhbGxiYWNrIG5vd1xuICAgICAgcmV0dXJuIG51bGw7IC8vIHBlbmRpbmdzIHdpbGwgdHJpZ2dlciBjYWxsYmFja1xuICAgIH1cblxuICAgIHRvTG9hZC50b0xvYWQuZm9yRWFjaCgobmFtZSkgPT4ge1xuICAgICAgdGhpcy5sb2FkT25lKG5hbWUpO1xuICAgIH0pO1xuICB9XG5cbiAgbG9hZChsYW5ndWFnZXMsIG5hbWVzcGFjZXMsIGNhbGxiYWNrKSB7XG4gICAgdGhpcy5wcmVwYXJlTG9hZGluZyhsYW5ndWFnZXMsIG5hbWVzcGFjZXMsIHt9LCBjYWxsYmFjayk7XG4gIH1cblxuICByZWxvYWQobGFuZ3VhZ2VzLCBuYW1lc3BhY2VzLCBjYWxsYmFjaykge1xuICAgIHRoaXMucHJlcGFyZUxvYWRpbmcobGFuZ3VhZ2VzLCBuYW1lc3BhY2VzLCB7IHJlbG9hZDogdHJ1ZSB9LCBjYWxsYmFjayk7XG4gIH1cblxuICBsb2FkT25lKG5hbWUsIHByZWZpeCA9ICcnKSB7XG4gICAgY29uc3QgcyA9IG5hbWUuc3BsaXQoJ3wnKTtcbiAgICBjb25zdCBsbmcgPSBzWzBdO1xuICAgIGNvbnN0IG5zID0gc1sxXTtcblxuICAgIHRoaXMucmVhZChsbmcsIG5zLCAncmVhZCcsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICBpZiAoZXJyKSB0aGlzLmxvZ2dlci53YXJuKGAke3ByZWZpeH1sb2FkaW5nIG5hbWVzcGFjZSAke25zfSBmb3IgbGFuZ3VhZ2UgJHtsbmd9IGZhaWxlZGAsIGVycik7XG4gICAgICBpZiAoIWVyciAmJiBkYXRhKVxuICAgICAgICB0aGlzLmxvZ2dlci5sb2coYCR7cHJlZml4fWxvYWRlZCBuYW1lc3BhY2UgJHtuc30gZm9yIGxhbmd1YWdlICR7bG5nfWAsIGRhdGEpO1xuXG4gICAgICB0aGlzLmxvYWRlZChuYW1lLCBlcnIsIGRhdGEpO1xuICAgIH0pO1xuICB9XG5cbiAgc2F2ZU1pc3NpbmcobGFuZ3VhZ2VzLCBuYW1lc3BhY2UsIGtleSwgZmFsbGJhY2tWYWx1ZSwgaXNVcGRhdGUsIG9wdGlvbnMgPSB7fSwgY2xiID0gKCkgPT4ge30pIHtcbiAgICBpZiAoXG4gICAgICB0aGlzLnNlcnZpY2VzPy51dGlscz8uaGFzTG9hZGVkTmFtZXNwYWNlICYmXG4gICAgICAhdGhpcy5zZXJ2aWNlcz8udXRpbHM/Lmhhc0xvYWRlZE5hbWVzcGFjZShuYW1lc3BhY2UpXG4gICAgKSB7XG4gICAgICB0aGlzLmxvZ2dlci53YXJuKFxuICAgICAgICBgZGlkIG5vdCBzYXZlIGtleSBcIiR7a2V5fVwiIGFzIHRoZSBuYW1lc3BhY2UgXCIke25hbWVzcGFjZX1cIiB3YXMgbm90IHlldCBsb2FkZWRgLFxuICAgICAgICAnVGhpcyBtZWFucyBzb21ldGhpbmcgSVMgV1JPTkcgaW4geW91ciBzZXR1cC4gWW91IGFjY2VzcyB0aGUgdCBmdW5jdGlvbiBiZWZvcmUgaTE4bmV4dC5pbml0IC8gaTE4bmV4dC5sb2FkTmFtZXNwYWNlIC8gaTE4bmV4dC5jaGFuZ2VMYW5ndWFnZSB3YXMgZG9uZS4gV2FpdCBmb3IgdGhlIGNhbGxiYWNrIG9yIFByb21pc2UgdG8gcmVzb2x2ZSBiZWZvcmUgYWNjZXNzaW5nIGl0ISEhJyxcbiAgICAgICk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gaWdub3JlIG5vbiB2YWxpZCBrZXlzXG4gICAgaWYgKGtleSA9PT0gdW5kZWZpbmVkIHx8IGtleSA9PT0gbnVsbCB8fCBrZXkgPT09ICcnKSByZXR1cm47XG5cbiAgICBpZiAodGhpcy5iYWNrZW5kPy5jcmVhdGUpIHtcbiAgICAgIGNvbnN0IG9wdHMgPSB7XG4gICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICAgIGlzVXBkYXRlLFxuICAgICAgfTtcbiAgICAgIGNvbnN0IGZjID0gdGhpcy5iYWNrZW5kLmNyZWF0ZS5iaW5kKHRoaXMuYmFja2VuZCk7XG4gICAgICBpZiAoZmMubGVuZ3RoIDwgNikge1xuICAgICAgICAvLyBubyBjYWxsYmFja1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGxldCByO1xuICAgICAgICAgIGlmIChmYy5sZW5ndGggPT09IDUpIHtcbiAgICAgICAgICAgIC8vIGZ1dHVyZSBjYWxsYmFjay1sZXNzIGFwaSBmb3IgaTE4bmV4dC1sb2NpemUtYmFja2VuZFxuICAgICAgICAgICAgciA9IGZjKGxhbmd1YWdlcywgbmFtZXNwYWNlLCBrZXksIGZhbGxiYWNrVmFsdWUsIG9wdHMpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByID0gZmMobGFuZ3VhZ2VzLCBuYW1lc3BhY2UsIGtleSwgZmFsbGJhY2tWYWx1ZSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChyICYmIHR5cGVvZiByLnRoZW4gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIC8vIHByb21pc2VcbiAgICAgICAgICAgIHIudGhlbigoZGF0YSkgPT4gY2xiKG51bGwsIGRhdGEpKS5jYXRjaChjbGIpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBzeW5jXG4gICAgICAgICAgICBjbGIobnVsbCwgcik7XG4gICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICBjbGIoZXJyKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gbm9ybWFsIHdpdGggY2FsbGJhY2tcbiAgICAgICAgZmMobGFuZ3VhZ2VzLCBuYW1lc3BhY2UsIGtleSwgZmFsbGJhY2tWYWx1ZSwgY2xiIC8qIHVudXNlZCBjYWxsYmFjayAqLywgb3B0cyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gd3JpdGUgdG8gc3RvcmUgdG8gYXZvaWQgcmVzZW5kaW5nXG4gICAgaWYgKCFsYW5ndWFnZXMgfHwgIWxhbmd1YWdlc1swXSkgcmV0dXJuO1xuICAgIHRoaXMuc3RvcmUuYWRkUmVzb3VyY2UobGFuZ3VhZ2VzWzBdLCBuYW1lc3BhY2UsIGtleSwgZmFsbGJhY2tWYWx1ZSk7XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgQ29ubmVjdG9yO1xuIiwiaW1wb3J0IHsgaXNTdHJpbmcgfSBmcm9tICcuL3V0aWxzLmpzJztcblxuZXhwb3J0IGNvbnN0IGdldCA9ICgpID0+ICh7XG4gIGRlYnVnOiBmYWxzZSxcbiAgaW5pdEFzeW5jOiB0cnVlLFxuXG4gIG5zOiBbJ3RyYW5zbGF0aW9uJ10sXG4gIGRlZmF1bHROUzogWyd0cmFuc2xhdGlvbiddLFxuICBmYWxsYmFja0xuZzogWydkZXYnXSxcbiAgZmFsbGJhY2tOUzogZmFsc2UsIC8vIHN0cmluZyBvciBhcnJheSBvZiBuYW1lc3BhY2VzXG5cbiAgc3VwcG9ydGVkTG5nczogZmFsc2UsIC8vIGFycmF5IHdpdGggc3VwcG9ydGVkIGxhbmd1YWdlc1xuICBub25FeHBsaWNpdFN1cHBvcnRlZExuZ3M6IGZhbHNlLFxuICBsb2FkOiAnYWxsJywgLy8gfCBjdXJyZW50T25seSB8IGxhbmd1YWdlT25seVxuICBwcmVsb2FkOiBmYWxzZSwgLy8gYXJyYXkgd2l0aCBwcmVsb2FkIGxhbmd1YWdlc1xuXG4gIHNpbXBsaWZ5UGx1cmFsU3VmZml4OiB0cnVlLFxuICBrZXlTZXBhcmF0b3I6ICcuJyxcbiAgbnNTZXBhcmF0b3I6ICc6JyxcbiAgcGx1cmFsU2VwYXJhdG9yOiAnXycsXG4gIGNvbnRleHRTZXBhcmF0b3I6ICdfJyxcblxuICBwYXJ0aWFsQnVuZGxlZExhbmd1YWdlczogZmFsc2UsIC8vIGFsbG93IGJ1bmRsaW5nIGNlcnRhaW4gbGFuZ3VhZ2VzIHRoYXQgYXJlIG5vdCByZW1vdGVseSBmZXRjaGVkXG4gIHNhdmVNaXNzaW5nOiBmYWxzZSwgLy8gZW5hYmxlIHRvIHNlbmQgbWlzc2luZyB2YWx1ZXNcbiAgdXBkYXRlTWlzc2luZzogZmFsc2UsIC8vIGVuYWJsZSB0byB1cGRhdGUgZGVmYXVsdCB2YWx1ZXMgaWYgZGlmZmVyZW50IGZyb20gdHJhbnNsYXRlZCB2YWx1ZSAob25seSB1c2VmdWwgb24gaW5pdGlhbCBkZXZlbG9wbWVudCwgb3Igd2hlbiBrZWVwaW5nIGNvZGUgYXMgc291cmNlIG9mIHRydXRoKVxuICBzYXZlTWlzc2luZ1RvOiAnZmFsbGJhY2snLCAvLyAnY3VycmVudCcgfHwgJ2FsbCdcbiAgc2F2ZU1pc3NpbmdQbHVyYWxzOiB0cnVlLCAvLyB3aWxsIHNhdmUgYWxsIGZvcm1zIG5vdCBvbmx5IHNpbmd1bGFyIGtleVxuICBtaXNzaW5nS2V5SGFuZGxlcjogZmFsc2UsIC8vIGZ1bmN0aW9uKGxuZywgbnMsIGtleSwgZmFsbGJhY2tWYWx1ZSkgLT4gb3ZlcnJpZGUgaWYgcHJlZmVyIG9uIGhhbmRsaW5nXG4gIG1pc3NpbmdJbnRlcnBvbGF0aW9uSGFuZGxlcjogZmFsc2UsIC8vIGZ1bmN0aW9uKHN0ciwgbWF0Y2gpXG5cbiAgcG9zdFByb2Nlc3M6IGZhbHNlLCAvLyBzdHJpbmcgb3IgYXJyYXkgb2YgcG9zdFByb2Nlc3NvciBuYW1lc1xuICBwb3N0UHJvY2Vzc1Bhc3NSZXNvbHZlZDogZmFsc2UsIC8vIHBhc3MgcmVzb2x2ZWQgb2JqZWN0IGludG8gJ29wdGlvbnMuaTE4blJlc29sdmVkJyBmb3IgcG9zdHByb2Nlc3NvclxuICByZXR1cm5OdWxsOiBmYWxzZSwgLy8gYWxsb3dzIG51bGwgdmFsdWUgYXMgdmFsaWQgdHJhbnNsYXRpb25cbiAgcmV0dXJuRW1wdHlTdHJpbmc6IHRydWUsIC8vIGFsbG93cyBlbXB0eSBzdHJpbmcgdmFsdWUgYXMgdmFsaWQgdHJhbnNsYXRpb25cbiAgcmV0dXJuT2JqZWN0czogZmFsc2UsXG4gIGpvaW5BcnJheXM6IGZhbHNlLCAvLyBvciBzdHJpbmcgdG8gam9pbiBhcnJheVxuICByZXR1cm5lZE9iamVjdEhhbmRsZXI6IGZhbHNlLCAvLyBmdW5jdGlvbihrZXksIHZhbHVlLCBvcHRpb25zKSB0cmlnZ2VyZWQgaWYga2V5IHJldHVybnMgb2JqZWN0IGJ1dCByZXR1cm5PYmplY3RzIGlzIHNldCB0byBmYWxzZVxuICBwYXJzZU1pc3NpbmdLZXlIYW5kbGVyOiBmYWxzZSwgLy8gZnVuY3Rpb24oa2V5KSBwYXJzZWQgYSBrZXkgdGhhdCB3YXMgbm90IGZvdW5kIGluIHQoKSBiZWZvcmUgcmV0dXJuaW5nXG4gIGFwcGVuZE5hbWVzcGFjZVRvTWlzc2luZ0tleTogZmFsc2UsXG4gIGFwcGVuZE5hbWVzcGFjZVRvQ0lNb2RlOiBmYWxzZSxcbiAgb3ZlcmxvYWRUcmFuc2xhdGlvbk9wdGlvbkhhbmRsZXI6IChhcmdzKSA9PiB7XG4gICAgbGV0IHJldCA9IHt9O1xuICAgIGlmICh0eXBlb2YgYXJnc1sxXSA9PT0gJ29iamVjdCcpIHJldCA9IGFyZ3NbMV07XG4gICAgaWYgKGlzU3RyaW5nKGFyZ3NbMV0pKSByZXQuZGVmYXVsdFZhbHVlID0gYXJnc1sxXTtcbiAgICBpZiAoaXNTdHJpbmcoYXJnc1syXSkpIHJldC50RGVzY3JpcHRpb24gPSBhcmdzWzJdO1xuICAgIGlmICh0eXBlb2YgYXJnc1syXSA9PT0gJ29iamVjdCcgfHwgdHlwZW9mIGFyZ3NbM10gPT09ICdvYmplY3QnKSB7XG4gICAgICBjb25zdCBvcHRpb25zID0gYXJnc1szXSB8fCBhcmdzWzJdO1xuICAgICAgT2JqZWN0LmtleXMob3B0aW9ucykuZm9yRWFjaCgoa2V5KSA9PiB7XG4gICAgICAgIHJldFtrZXldID0gb3B0aW9uc1trZXldO1xuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiByZXQ7XG4gIH0sXG4gIGludGVycG9sYXRpb246IHtcbiAgICBlc2NhcGVWYWx1ZTogdHJ1ZSxcbiAgICAvKiogQHR5cGUge2ltcG9ydCgnaTE4bmV4dCcpLkZvcm1hdEZ1bmN0aW9ufSAqL1xuICAgIGZvcm1hdDogKHZhbHVlKSA9PiB2YWx1ZSxcbiAgICBwcmVmaXg6ICd7eycsXG4gICAgc3VmZml4OiAnfX0nLFxuICAgIGZvcm1hdFNlcGFyYXRvcjogJywnLFxuICAgIC8vIHByZWZpeEVzY2FwZWQ6ICd7eycsXG4gICAgLy8gc3VmZml4RXNjYXBlZDogJ319JyxcbiAgICAvLyB1bmVzY2FwZVN1ZmZpeDogJycsXG4gICAgdW5lc2NhcGVQcmVmaXg6ICctJyxcblxuICAgIG5lc3RpbmdQcmVmaXg6ICckdCgnLFxuICAgIG5lc3RpbmdTdWZmaXg6ICcpJyxcbiAgICBuZXN0aW5nT3B0aW9uc1NlcGFyYXRvcjogJywnLFxuICAgIC8vIG5lc3RpbmdQcmVmaXhFc2NhcGVkOiAnJHQoJyxcbiAgICAvLyBuZXN0aW5nU3VmZml4RXNjYXBlZDogJyknLFxuICAgIC8vIGRlZmF1bHRWYXJpYWJsZXM6IHVuZGVmaW5lZCAvLyBvYmplY3QgdGhhdCBjYW4gaGF2ZSB2YWx1ZXMgdG8gaW50ZXJwb2xhdGUgb24gLSBleHRlbmRzIHBhc3NlZCBpbiBpbnRlcnBvbGF0aW9uIGRhdGFcbiAgICBtYXhSZXBsYWNlczogMTAwMCwgLy8gbWF4IHJlcGxhY2VzIHRvIHByZXZlbnQgZW5kbGVzcyBsb29wXG4gICAgc2tpcE9uVmFyaWFibGVzOiB0cnVlLFxuICB9LFxufSk7XG5cbi8qIGVzbGludCBuby1wYXJhbS1yZWFzc2lnbjogMCAqL1xuZXhwb3J0IGNvbnN0IHRyYW5zZm9ybU9wdGlvbnMgPSAob3B0aW9ucykgPT4ge1xuICAvLyBjcmVhdGUgbmFtZXNwYWNlIG9iamVjdCBpZiBuYW1lc3BhY2UgaXMgcGFzc2VkIGluIGFzIHN0cmluZ1xuICBpZiAoaXNTdHJpbmcob3B0aW9ucy5ucykpIG9wdGlvbnMubnMgPSBbb3B0aW9ucy5uc107XG4gIGlmIChpc1N0cmluZyhvcHRpb25zLmZhbGxiYWNrTG5nKSkgb3B0aW9ucy5mYWxsYmFja0xuZyA9IFtvcHRpb25zLmZhbGxiYWNrTG5nXTtcbiAgaWYgKGlzU3RyaW5nKG9wdGlvbnMuZmFsbGJhY2tOUykpIG9wdGlvbnMuZmFsbGJhY2tOUyA9IFtvcHRpb25zLmZhbGxiYWNrTlNdO1xuXG4gIC8vIGV4dGVuZCBzdXBwb3J0ZWRMbmdzIHdpdGggY2ltb2RlXG4gIGlmIChvcHRpb25zLnN1cHBvcnRlZExuZ3M/LmluZGV4T2Y/LignY2ltb2RlJykgPCAwKSB7XG4gICAgb3B0aW9ucy5zdXBwb3J0ZWRMbmdzID0gb3B0aW9ucy5zdXBwb3J0ZWRMbmdzLmNvbmNhdChbJ2NpbW9kZSddKTtcbiAgfVxuXG4gIC8vIGZvciBiYWNrd2FyZCBjb21wYXRpYmlsaXR5LCBhc3NpZ24gaW5pdEltbWVkaWF0ZSB0byBpbml0QXN5bmMgKGlmIHNldClcbiAgaWYgKHR5cGVvZiBvcHRpb25zLmluaXRJbW1lZGlhdGUgPT09ICdib29sZWFuJykgb3B0aW9ucy5pbml0QXN5bmMgPSBvcHRpb25zLmluaXRJbW1lZGlhdGU7XG5cbiAgcmV0dXJuIG9wdGlvbnM7XG59O1xuIiwiaW1wb3J0IGJhc2VMb2dnZXIgZnJvbSAnLi9sb2dnZXIuanMnO1xuaW1wb3J0IEV2ZW50RW1pdHRlciBmcm9tICcuL0V2ZW50RW1pdHRlci5qcyc7XG5pbXBvcnQgUmVzb3VyY2VTdG9yZSBmcm9tICcuL1Jlc291cmNlU3RvcmUuanMnO1xuaW1wb3J0IFRyYW5zbGF0b3IgZnJvbSAnLi9UcmFuc2xhdG9yLmpzJztcbmltcG9ydCBMYW5ndWFnZVV0aWxzIGZyb20gJy4vTGFuZ3VhZ2VVdGlscy5qcyc7XG5pbXBvcnQgUGx1cmFsUmVzb2x2ZXIgZnJvbSAnLi9QbHVyYWxSZXNvbHZlci5qcyc7XG5pbXBvcnQgSW50ZXJwb2xhdG9yIGZyb20gJy4vSW50ZXJwb2xhdG9yLmpzJztcbmltcG9ydCBGb3JtYXR0ZXIgZnJvbSAnLi9Gb3JtYXR0ZXIuanMnO1xuaW1wb3J0IEJhY2tlbmRDb25uZWN0b3IgZnJvbSAnLi9CYWNrZW5kQ29ubmVjdG9yLmpzJztcbmltcG9ydCB7IGdldCBhcyBnZXREZWZhdWx0cywgdHJhbnNmb3JtT3B0aW9ucyB9IGZyb20gJy4vZGVmYXVsdHMuanMnO1xuaW1wb3J0IHBvc3RQcm9jZXNzb3IgZnJvbSAnLi9wb3N0UHJvY2Vzc29yLmpzJztcbmltcG9ydCB7IGRlZmVyLCBpc1N0cmluZyB9IGZyb20gJy4vdXRpbHMuanMnO1xuXG5jb25zdCBub29wID0gKCkgPT4ge31cblxuLy8gQmluZHMgdGhlIG1lbWJlciBmdW5jdGlvbnMgb2YgdGhlIGdpdmVuIGNsYXNzIGluc3RhbmNlIHNvIHRoYXQgdGhleSBjYW4gYmVcbi8vIGRlc3RydWN0dXJlZCBvciB1c2VkIGFzIGNhbGxiYWNrcy5cbmNvbnN0IGJpbmRNZW1iZXJGdW5jdGlvbnMgPSAoaW5zdCkgPT4ge1xuICBjb25zdCBtZW1zID0gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMoT2JqZWN0LmdldFByb3RvdHlwZU9mKGluc3QpKVxuICBtZW1zLmZvckVhY2goKG1lbSkgPT4ge1xuICAgIGlmICh0eXBlb2YgaW5zdFttZW1dID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBpbnN0W21lbV0gPSBpbnN0W21lbV0uYmluZChpbnN0KVxuICAgIH1cbiAgfSlcbn1cblxuY2xhc3MgSTE4biBleHRlbmRzIEV2ZW50RW1pdHRlciB7XG4gIGNvbnN0cnVjdG9yKG9wdGlvbnMgPSB7fSwgY2FsbGJhY2spIHtcbiAgICBzdXBlcigpO1xuXG4gICAgdGhpcy5vcHRpb25zID0gdHJhbnNmb3JtT3B0aW9ucyhvcHRpb25zKTtcbiAgICB0aGlzLnNlcnZpY2VzID0ge307XG4gICAgdGhpcy5sb2dnZXIgPSBiYXNlTG9nZ2VyO1xuICAgIHRoaXMubW9kdWxlcyA9IHsgZXh0ZXJuYWw6IFtdIH07XG5cbiAgICBiaW5kTWVtYmVyRnVuY3Rpb25zKHRoaXMpO1xuXG4gICAgaWYgKGNhbGxiYWNrICYmICF0aGlzLmlzSW5pdGlhbGl6ZWQgJiYgIW9wdGlvbnMuaXNDbG9uZSkge1xuICAgICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL2kxOG5leHQvaTE4bmV4dC9pc3N1ZXMvODc5XG4gICAgICBpZiAoIXRoaXMub3B0aW9ucy5pbml0QXN5bmMpIHtcbiAgICAgICAgdGhpcy5pbml0KG9wdGlvbnMsIGNhbGxiYWNrKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICB9XG4gICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgdGhpcy5pbml0KG9wdGlvbnMsIGNhbGxiYWNrKTtcbiAgICAgIH0sIDApO1xuICAgIH1cbiAgfVxuXG4gIGluaXQob3B0aW9ucyA9IHt9LCBjYWxsYmFjaykge1xuICAgIHRoaXMuaXNJbml0aWFsaXppbmcgPSB0cnVlO1xuICAgIGlmICh0eXBlb2Ygb3B0aW9ucyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgY2FsbGJhY2sgPSBvcHRpb25zO1xuICAgICAgb3B0aW9ucyA9IHt9O1xuICAgIH1cblxuICAgIGlmICghb3B0aW9ucy5kZWZhdWx0TlMgJiYgb3B0aW9ucy5kZWZhdWx0TlMgIT09IGZhbHNlICYmIG9wdGlvbnMubnMpIHtcbiAgICAgIGlmIChpc1N0cmluZyhvcHRpb25zLm5zKSkge1xuICAgICAgICBvcHRpb25zLmRlZmF1bHROUyA9IG9wdGlvbnMubnM7XG4gICAgICB9IGVsc2UgaWYgKG9wdGlvbnMubnMuaW5kZXhPZigndHJhbnNsYXRpb24nKSA8IDApIHtcbiAgICAgICAgb3B0aW9ucy5kZWZhdWx0TlMgPSBvcHRpb25zLm5zWzBdO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IGRlZk9wdHMgPSBnZXREZWZhdWx0cygpO1xuICAgIHRoaXMub3B0aW9ucyA9IHsgLi4uZGVmT3B0cywgLi4udGhpcy5vcHRpb25zLCAuLi50cmFuc2Zvcm1PcHRpb25zKG9wdGlvbnMpIH07XG4gICAgdGhpcy5vcHRpb25zLmludGVycG9sYXRpb24gPSB7IC4uLmRlZk9wdHMuaW50ZXJwb2xhdGlvbiwgLi4udGhpcy5vcHRpb25zLmludGVycG9sYXRpb24gfTsgLy8gZG8gbm90IHVzZSByZWZlcmVuY2VcbiAgICBpZiAob3B0aW9ucy5rZXlTZXBhcmF0b3IgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5vcHRpb25zLnVzZXJEZWZpbmVkS2V5U2VwYXJhdG9yID0gb3B0aW9ucy5rZXlTZXBhcmF0b3I7XG4gICAgfVxuICAgIGlmIChvcHRpb25zLm5zU2VwYXJhdG9yICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMub3B0aW9ucy51c2VyRGVmaW5lZE5zU2VwYXJhdG9yID0gb3B0aW9ucy5uc1NlcGFyYXRvcjtcbiAgICB9XG5cbiAgICBjb25zdCBjcmVhdGVDbGFzc09uRGVtYW5kID0gKENsYXNzT3JPYmplY3QpID0+IHtcbiAgICAgIGlmICghQ2xhc3NPck9iamVjdCkgcmV0dXJuIG51bGw7XG4gICAgICBpZiAodHlwZW9mIENsYXNzT3JPYmplY3QgPT09ICdmdW5jdGlvbicpIHJldHVybiBuZXcgQ2xhc3NPck9iamVjdCgpO1xuICAgICAgcmV0dXJuIENsYXNzT3JPYmplY3Q7XG4gICAgfVxuXG4gICAgLy8gaW5pdCBzZXJ2aWNlc1xuICAgIGlmICghdGhpcy5vcHRpb25zLmlzQ2xvbmUpIHtcbiAgICAgIGlmICh0aGlzLm1vZHVsZXMubG9nZ2VyKSB7XG4gICAgICAgIGJhc2VMb2dnZXIuaW5pdChjcmVhdGVDbGFzc09uRGVtYW5kKHRoaXMubW9kdWxlcy5sb2dnZXIpLCB0aGlzLm9wdGlvbnMpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYmFzZUxvZ2dlci5pbml0KG51bGwsIHRoaXMub3B0aW9ucyk7XG4gICAgICB9XG5cbiAgICAgIGxldCBmb3JtYXR0ZXI7XG4gICAgICBpZiAodGhpcy5tb2R1bGVzLmZvcm1hdHRlcikge1xuICAgICAgICBmb3JtYXR0ZXIgPSB0aGlzLm1vZHVsZXMuZm9ybWF0dGVyO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZm9ybWF0dGVyID0gRm9ybWF0dGVyO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBsdSA9IG5ldyBMYW5ndWFnZVV0aWxzKHRoaXMub3B0aW9ucyk7XG4gICAgICB0aGlzLnN0b3JlID0gbmV3IFJlc291cmNlU3RvcmUodGhpcy5vcHRpb25zLnJlc291cmNlcywgdGhpcy5vcHRpb25zKTtcblxuICAgICAgY29uc3QgcyA9IHRoaXMuc2VydmljZXM7XG4gICAgICBzLmxvZ2dlciA9IGJhc2VMb2dnZXI7XG4gICAgICBzLnJlc291cmNlU3RvcmUgPSB0aGlzLnN0b3JlO1xuICAgICAgcy5sYW5ndWFnZVV0aWxzID0gbHU7XG4gICAgICBzLnBsdXJhbFJlc29sdmVyID0gbmV3IFBsdXJhbFJlc29sdmVyKGx1LCB7XG4gICAgICAgIHByZXBlbmQ6IHRoaXMub3B0aW9ucy5wbHVyYWxTZXBhcmF0b3IsXG4gICAgICAgIHNpbXBsaWZ5UGx1cmFsU3VmZml4OiB0aGlzLm9wdGlvbnMuc2ltcGxpZnlQbHVyYWxTdWZmaXgsXG4gICAgICB9KTtcblxuICAgICAgaWYgKGZvcm1hdHRlciAmJiAoIXRoaXMub3B0aW9ucy5pbnRlcnBvbGF0aW9uLmZvcm1hdCB8fCB0aGlzLm9wdGlvbnMuaW50ZXJwb2xhdGlvbi5mb3JtYXQgPT09IGRlZk9wdHMuaW50ZXJwb2xhdGlvbi5mb3JtYXQpKSB7XG4gICAgICAgIHMuZm9ybWF0dGVyID0gY3JlYXRlQ2xhc3NPbkRlbWFuZChmb3JtYXR0ZXIpO1xuICAgICAgICBzLmZvcm1hdHRlci5pbml0KHMsIHRoaXMub3B0aW9ucyk7XG5cbiAgICAgICAgdGhpcy5vcHRpb25zLmludGVycG9sYXRpb24uZm9ybWF0ID0gcy5mb3JtYXR0ZXIuZm9ybWF0LmJpbmQocy5mb3JtYXR0ZXIpO1xuICAgICAgfVxuXG4gICAgICBzLmludGVycG9sYXRvciA9IG5ldyBJbnRlcnBvbGF0b3IodGhpcy5vcHRpb25zKTtcbiAgICAgIHMudXRpbHMgPSB7XG4gICAgICAgIGhhc0xvYWRlZE5hbWVzcGFjZTogdGhpcy5oYXNMb2FkZWROYW1lc3BhY2UuYmluZCh0aGlzKVxuICAgICAgfVxuXG4gICAgICBzLmJhY2tlbmRDb25uZWN0b3IgPSBuZXcgQmFja2VuZENvbm5lY3RvcihcbiAgICAgICAgY3JlYXRlQ2xhc3NPbkRlbWFuZCh0aGlzLm1vZHVsZXMuYmFja2VuZCksXG4gICAgICAgIHMucmVzb3VyY2VTdG9yZSxcbiAgICAgICAgcyxcbiAgICAgICAgdGhpcy5vcHRpb25zLFxuICAgICAgKTtcbiAgICAgIC8vIHBpcGUgZXZlbnRzIGZyb20gYmFja2VuZENvbm5lY3RvclxuICAgICAgcy5iYWNrZW5kQ29ubmVjdG9yLm9uKCcqJywgKGV2ZW50LCAuLi5hcmdzKSA9PiB7XG4gICAgICAgIHRoaXMuZW1pdChldmVudCwgLi4uYXJncyk7XG4gICAgICB9KTtcblxuICAgICAgaWYgKHRoaXMubW9kdWxlcy5sYW5ndWFnZURldGVjdG9yKSB7XG4gICAgICAgIHMubGFuZ3VhZ2VEZXRlY3RvciA9IGNyZWF0ZUNsYXNzT25EZW1hbmQodGhpcy5tb2R1bGVzLmxhbmd1YWdlRGV0ZWN0b3IpO1xuICAgICAgICBpZiAocy5sYW5ndWFnZURldGVjdG9yLmluaXQpIHMubGFuZ3VhZ2VEZXRlY3Rvci5pbml0KHMsIHRoaXMub3B0aW9ucy5kZXRlY3Rpb24sIHRoaXMub3B0aW9ucyk7XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLm1vZHVsZXMuaTE4bkZvcm1hdCkge1xuICAgICAgICBzLmkxOG5Gb3JtYXQgPSBjcmVhdGVDbGFzc09uRGVtYW5kKHRoaXMubW9kdWxlcy5pMThuRm9ybWF0KTtcbiAgICAgICAgaWYgKHMuaTE4bkZvcm1hdC5pbml0KSBzLmkxOG5Gb3JtYXQuaW5pdCh0aGlzKTtcbiAgICAgIH1cblxuICAgICAgdGhpcy50cmFuc2xhdG9yID0gbmV3IFRyYW5zbGF0b3IodGhpcy5zZXJ2aWNlcywgdGhpcy5vcHRpb25zKTtcbiAgICAgIC8vIHBpcGUgZXZlbnRzIGZyb20gdHJhbnNsYXRvclxuICAgICAgdGhpcy50cmFuc2xhdG9yLm9uKCcqJywgKGV2ZW50LCAuLi5hcmdzKSA9PiB7XG4gICAgICAgIHRoaXMuZW1pdChldmVudCwgLi4uYXJncyk7XG4gICAgICB9KTtcblxuICAgICAgdGhpcy5tb2R1bGVzLmV4dGVybmFsLmZvckVhY2gobSA9PiB7XG4gICAgICAgIGlmIChtLmluaXQpIG0uaW5pdCh0aGlzKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHRoaXMuZm9ybWF0ID0gdGhpcy5vcHRpb25zLmludGVycG9sYXRpb24uZm9ybWF0O1xuICAgIGlmICghY2FsbGJhY2spIGNhbGxiYWNrID0gbm9vcDtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMuZmFsbGJhY2tMbmcgJiYgIXRoaXMuc2VydmljZXMubGFuZ3VhZ2VEZXRlY3RvciAmJiAhdGhpcy5vcHRpb25zLmxuZykge1xuICAgICAgY29uc3QgY29kZXMgPSB0aGlzLnNlcnZpY2VzLmxhbmd1YWdlVXRpbHMuZ2V0RmFsbGJhY2tDb2Rlcyh0aGlzLm9wdGlvbnMuZmFsbGJhY2tMbmcpXG4gICAgICBpZiAoY29kZXMubGVuZ3RoID4gMCAmJiBjb2Rlc1swXSAhPT0gJ2RldicpIHRoaXMub3B0aW9ucy5sbmcgPSBjb2Rlc1swXVxuICAgIH1cbiAgICBpZiAoIXRoaXMuc2VydmljZXMubGFuZ3VhZ2VEZXRlY3RvciAmJiAhdGhpcy5vcHRpb25zLmxuZykge1xuICAgICAgdGhpcy5sb2dnZXIud2FybignaW5pdDogbm8gbGFuZ3VhZ2VEZXRlY3RvciBpcyB1c2VkIGFuZCBubyBsbmcgaXMgZGVmaW5lZCcpO1xuICAgIH1cblxuICAgIC8vIGFwcGVuZCBhcGlcbiAgICBjb25zdCBzdG9yZUFwaSA9IFtcbiAgICAgICdnZXRSZXNvdXJjZScsXG4gICAgICAnaGFzUmVzb3VyY2VCdW5kbGUnLFxuICAgICAgJ2dldFJlc291cmNlQnVuZGxlJyxcbiAgICAgICdnZXREYXRhQnlMYW5ndWFnZScsXG4gICAgXTtcbiAgICBzdG9yZUFwaS5mb3JFYWNoKGZjTmFtZSA9PiB7XG4gICAgICB0aGlzW2ZjTmFtZV0gPSAoLi4uYXJncykgPT4gdGhpcy5zdG9yZVtmY05hbWVdKC4uLmFyZ3MpO1xuICAgIH0pO1xuICAgIGNvbnN0IHN0b3JlQXBpQ2hhaW5lZCA9IFtcbiAgICAgICdhZGRSZXNvdXJjZScsXG4gICAgICAnYWRkUmVzb3VyY2VzJyxcbiAgICAgICdhZGRSZXNvdXJjZUJ1bmRsZScsXG4gICAgICAncmVtb3ZlUmVzb3VyY2VCdW5kbGUnLFxuICAgIF07XG4gICAgc3RvcmVBcGlDaGFpbmVkLmZvckVhY2goZmNOYW1lID0+IHtcbiAgICAgIHRoaXNbZmNOYW1lXSA9ICguLi5hcmdzKSA9PiB7XG4gICAgICAgIHRoaXMuc3RvcmVbZmNOYW1lXSguLi5hcmdzKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICB9O1xuICAgIH0pO1xuXG4gICAgY29uc3QgZGVmZXJyZWQgPSBkZWZlcigpO1xuXG4gICAgY29uc3QgbG9hZCA9ICgpID0+IHtcbiAgICAgIGNvbnN0IGZpbmlzaCA9IChlcnIsIHQpID0+IHtcbiAgICAgICAgdGhpcy5pc0luaXRpYWxpemluZyA9IGZhbHNlO1xuICAgICAgICBpZiAodGhpcy5pc0luaXRpYWxpemVkICYmICF0aGlzLmluaXRpYWxpemVkU3RvcmVPbmNlKSB0aGlzLmxvZ2dlci53YXJuKCdpbml0OiBpMThuZXh0IGlzIGFscmVhZHkgaW5pdGlhbGl6ZWQuIFlvdSBzaG91bGQgY2FsbCBpbml0IGp1c3Qgb25jZSEnKTtcbiAgICAgICAgdGhpcy5pc0luaXRpYWxpemVkID0gdHJ1ZTtcbiAgICAgICAgaWYgKCF0aGlzLm9wdGlvbnMuaXNDbG9uZSkgdGhpcy5sb2dnZXIubG9nKCdpbml0aWFsaXplZCcsIHRoaXMub3B0aW9ucyk7XG4gICAgICAgIHRoaXMuZW1pdCgnaW5pdGlhbGl6ZWQnLCB0aGlzLm9wdGlvbnMpO1xuXG4gICAgICAgIGRlZmVycmVkLnJlc29sdmUodCk7IC8vIG5vdCByZWplY3Rpbmcgb24gZXJyIChhcyBlcnIgaXMgb25seSBhIGxvYWRpbmcgdHJhbnNsYXRpb24gZmFpbGVkIHdhcm5pbmcpXG4gICAgICAgIGNhbGxiYWNrKGVyciwgdCk7XG4gICAgICB9O1xuICAgICAgLy8gZml4IGZvciB1c2UgY2FzZXMgd2hlbiBjYWxsaW5nIGNoYW5nZUxhbmd1YWdlIGJlZm9yZSBmaW5pc2hlZCB0byBpbml0aWFsaXplZCAoaS5lLiBodHRwczovL2dpdGh1Yi5jb20vaTE4bmV4dC9pMThuZXh0L2lzc3Vlcy8xNTUyKVxuICAgICAgaWYgKHRoaXMubGFuZ3VhZ2VzICYmICF0aGlzLmlzSW5pdGlhbGl6ZWQpIHJldHVybiBmaW5pc2gobnVsbCwgdGhpcy50LmJpbmQodGhpcykpO1xuICAgICAgdGhpcy5jaGFuZ2VMYW5ndWFnZSh0aGlzLm9wdGlvbnMubG5nLCBmaW5pc2gpO1xuICAgIH07XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLnJlc291cmNlcyB8fCAhdGhpcy5vcHRpb25zLmluaXRBc3luYykge1xuICAgICAgbG9hZCgpO1xuICAgIH0gZWxzZSB7XG4gICAgICBzZXRUaW1lb3V0KGxvYWQsIDApO1xuICAgIH1cblxuICAgIHJldHVybiBkZWZlcnJlZDtcbiAgfVxuXG4gIC8qIGVzbGludCBjb25zaXN0ZW50LXJldHVybjogMCAqL1xuICBsb2FkUmVzb3VyY2VzKGxhbmd1YWdlLCBjYWxsYmFjayA9IG5vb3ApIHtcbiAgICBsZXQgdXNlZENhbGxiYWNrID0gY2FsbGJhY2s7XG4gICAgY29uc3QgdXNlZExuZyA9IGlzU3RyaW5nKGxhbmd1YWdlKSA/IGxhbmd1YWdlIDogdGhpcy5sYW5ndWFnZTtcbiAgICBpZiAodHlwZW9mIGxhbmd1YWdlID09PSAnZnVuY3Rpb24nKSB1c2VkQ2FsbGJhY2sgPSBsYW5ndWFnZTtcblxuICAgIGlmICghdGhpcy5vcHRpb25zLnJlc291cmNlcyB8fCB0aGlzLm9wdGlvbnMucGFydGlhbEJ1bmRsZWRMYW5ndWFnZXMpIHtcbiAgICAgIGlmICh1c2VkTG5nPy50b0xvd2VyQ2FzZSgpID09PSAnY2ltb2RlJyAmJiAoIXRoaXMub3B0aW9ucy5wcmVsb2FkIHx8IHRoaXMub3B0aW9ucy5wcmVsb2FkLmxlbmd0aCA9PT0gMCkpIHJldHVybiB1c2VkQ2FsbGJhY2soKTsgLy8gYXZvaWQgbG9hZGluZyByZXNvdXJjZXMgZm9yIGNpbW9kZVxuXG4gICAgICBjb25zdCB0b0xvYWQgPSBbXTtcblxuICAgICAgY29uc3QgYXBwZW5kID0gbG5nID0+IHtcbiAgICAgICAgaWYgKCFsbmcpIHJldHVybjtcbiAgICAgICAgaWYgKGxuZyA9PT0gJ2NpbW9kZScpIHJldHVybjtcbiAgICAgICAgY29uc3QgbG5ncyA9IHRoaXMuc2VydmljZXMubGFuZ3VhZ2VVdGlscy50b1Jlc29sdmVIaWVyYXJjaHkobG5nKTtcbiAgICAgICAgbG5ncy5mb3JFYWNoKGwgPT4ge1xuICAgICAgICAgIGlmIChsID09PSAnY2ltb2RlJykgcmV0dXJuO1xuICAgICAgICAgIGlmICh0b0xvYWQuaW5kZXhPZihsKSA8IDApIHRvTG9hZC5wdXNoKGwpO1xuICAgICAgICB9KTtcbiAgICAgIH07XG5cbiAgICAgIGlmICghdXNlZExuZykge1xuICAgICAgICAvLyBhdCBsZWFzdCBsb2FkIGZhbGxiYWNrcyBpbiB0aGlzIGNhc2VcbiAgICAgICAgY29uc3QgZmFsbGJhY2tzID0gdGhpcy5zZXJ2aWNlcy5sYW5ndWFnZVV0aWxzLmdldEZhbGxiYWNrQ29kZXModGhpcy5vcHRpb25zLmZhbGxiYWNrTG5nKTtcbiAgICAgICAgZmFsbGJhY2tzLmZvckVhY2gobCA9PiBhcHBlbmQobCkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYXBwZW5kKHVzZWRMbmcpO1xuICAgICAgfVxuXG4gICAgICB0aGlzLm9wdGlvbnMucHJlbG9hZD8uZm9yRWFjaD8uKGwgPT4gYXBwZW5kKGwpKTtcblxuICAgICAgdGhpcy5zZXJ2aWNlcy5iYWNrZW5kQ29ubmVjdG9yLmxvYWQodG9Mb2FkLCB0aGlzLm9wdGlvbnMubnMsIChlKSA9PiB7XG4gICAgICAgIGlmICghZSAmJiAhdGhpcy5yZXNvbHZlZExhbmd1YWdlICYmIHRoaXMubGFuZ3VhZ2UpIHRoaXMuc2V0UmVzb2x2ZWRMYW5ndWFnZSh0aGlzLmxhbmd1YWdlKTtcbiAgICAgICAgdXNlZENhbGxiYWNrKGUpO1xuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHVzZWRDYWxsYmFjayhudWxsKTtcbiAgICB9XG4gIH1cblxuICByZWxvYWRSZXNvdXJjZXMobG5ncywgbnMsIGNhbGxiYWNrKSB7XG4gICAgY29uc3QgZGVmZXJyZWQgPSBkZWZlcigpO1xuICAgIGlmICh0eXBlb2YgbG5ncyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgY2FsbGJhY2sgPSBsbmdzO1xuICAgICAgbG5ncyA9IHVuZGVmaW5lZDtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiBucyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgY2FsbGJhY2sgPSBucztcbiAgICAgIG5zID0gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBpZiAoIWxuZ3MpIGxuZ3MgPSB0aGlzLmxhbmd1YWdlcztcbiAgICBpZiAoIW5zKSBucyA9IHRoaXMub3B0aW9ucy5ucztcbiAgICBpZiAoIWNhbGxiYWNrKSBjYWxsYmFjayA9IG5vb3A7XG4gICAgdGhpcy5zZXJ2aWNlcy5iYWNrZW5kQ29ubmVjdG9yLnJlbG9hZChsbmdzLCBucywgZXJyID0+IHtcbiAgICAgIGRlZmVycmVkLnJlc29sdmUoKTsgLy8gbm90IHJlamVjdGluZyBvbiBlcnIgKGFzIGVyciBpcyBvbmx5IGEgbG9hZGluZyB0cmFuc2xhdGlvbiBmYWlsZWQgd2FybmluZylcbiAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgfSk7XG4gICAgcmV0dXJuIGRlZmVycmVkO1xuICB9XG5cbiAgdXNlKG1vZHVsZSkge1xuICAgIGlmICghbW9kdWxlKSB0aHJvdyBuZXcgRXJyb3IoJ1lvdSBhcmUgcGFzc2luZyBhbiB1bmRlZmluZWQgbW9kdWxlISBQbGVhc2UgY2hlY2sgdGhlIG9iamVjdCB5b3UgYXJlIHBhc3NpbmcgdG8gaTE4bmV4dC51c2UoKScpXG4gICAgaWYgKCFtb2R1bGUudHlwZSkgdGhyb3cgbmV3IEVycm9yKCdZb3UgYXJlIHBhc3NpbmcgYSB3cm9uZyBtb2R1bGUhIFBsZWFzZSBjaGVjayB0aGUgb2JqZWN0IHlvdSBhcmUgcGFzc2luZyB0byBpMThuZXh0LnVzZSgpJylcblxuICAgIGlmIChtb2R1bGUudHlwZSA9PT0gJ2JhY2tlbmQnKSB7XG4gICAgICB0aGlzLm1vZHVsZXMuYmFja2VuZCA9IG1vZHVsZTtcbiAgICB9XG5cbiAgICBpZiAobW9kdWxlLnR5cGUgPT09ICdsb2dnZXInIHx8IChtb2R1bGUubG9nICYmIG1vZHVsZS53YXJuICYmIG1vZHVsZS5lcnJvcikpIHtcbiAgICAgIHRoaXMubW9kdWxlcy5sb2dnZXIgPSBtb2R1bGU7XG4gICAgfVxuXG4gICAgaWYgKG1vZHVsZS50eXBlID09PSAnbGFuZ3VhZ2VEZXRlY3RvcicpIHtcbiAgICAgIHRoaXMubW9kdWxlcy5sYW5ndWFnZURldGVjdG9yID0gbW9kdWxlO1xuICAgIH1cblxuICAgIGlmIChtb2R1bGUudHlwZSA9PT0gJ2kxOG5Gb3JtYXQnKSB7XG4gICAgICB0aGlzLm1vZHVsZXMuaTE4bkZvcm1hdCA9IG1vZHVsZTtcbiAgICB9XG5cbiAgICBpZiAobW9kdWxlLnR5cGUgPT09ICdwb3N0UHJvY2Vzc29yJykge1xuICAgICAgcG9zdFByb2Nlc3Nvci5hZGRQb3N0UHJvY2Vzc29yKG1vZHVsZSk7XG4gICAgfVxuXG4gICAgaWYgKG1vZHVsZS50eXBlID09PSAnZm9ybWF0dGVyJykge1xuICAgICAgdGhpcy5tb2R1bGVzLmZvcm1hdHRlciA9IG1vZHVsZTtcbiAgICB9XG5cbiAgICBpZiAobW9kdWxlLnR5cGUgPT09ICczcmRQYXJ0eScpIHtcbiAgICAgIHRoaXMubW9kdWxlcy5leHRlcm5hbC5wdXNoKG1vZHVsZSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBzZXRSZXNvbHZlZExhbmd1YWdlKGwpIHtcbiAgICBpZiAoIWwgfHwgIXRoaXMubGFuZ3VhZ2VzKSByZXR1cm47XG4gICAgaWYgKFsnY2ltb2RlJywgJ2RldiddLmluZGV4T2YobCkgPiAtMSkgcmV0dXJuO1xuICAgIGZvciAobGV0IGxpID0gMDsgbGkgPCB0aGlzLmxhbmd1YWdlcy5sZW5ndGg7IGxpKyspIHtcbiAgICAgIGNvbnN0IGxuZ0luTG5ncyA9IHRoaXMubGFuZ3VhZ2VzW2xpXTtcbiAgICAgIGlmIChbJ2NpbW9kZScsICdkZXYnXS5pbmRleE9mKGxuZ0luTG5ncykgPiAtMSkgY29udGludWU7XG4gICAgICBpZiAodGhpcy5zdG9yZS5oYXNMYW5ndWFnZVNvbWVUcmFuc2xhdGlvbnMobG5nSW5MbmdzKSkge1xuICAgICAgICB0aGlzLnJlc29sdmVkTGFuZ3VhZ2UgPSBsbmdJbkxuZ3M7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGNoYW5nZUxhbmd1YWdlKGxuZywgY2FsbGJhY2spIHtcbiAgICB0aGlzLmlzTGFuZ3VhZ2VDaGFuZ2luZ1RvID0gbG5nO1xuICAgIGNvbnN0IGRlZmVycmVkID0gZGVmZXIoKTtcbiAgICB0aGlzLmVtaXQoJ2xhbmd1YWdlQ2hhbmdpbmcnLCBsbmcpO1xuXG4gICAgY29uc3Qgc2V0TG5nUHJvcHMgPSAobCkgPT4ge1xuICAgICAgdGhpcy5sYW5ndWFnZSA9IGw7XG4gICAgICB0aGlzLmxhbmd1YWdlcyA9IHRoaXMuc2VydmljZXMubGFuZ3VhZ2VVdGlscy50b1Jlc29sdmVIaWVyYXJjaHkobCk7XG4gICAgICAvLyBmaW5kIHRoZSBmaXJzdCBsYW5ndWFnZSByZXNvbHZlZCBsYW5ndWFnZVxuICAgICAgdGhpcy5yZXNvbHZlZExhbmd1YWdlID0gdW5kZWZpbmVkO1xuICAgICAgdGhpcy5zZXRSZXNvbHZlZExhbmd1YWdlKGwpO1xuICAgIH07XG5cbiAgICBjb25zdCBkb25lID0gKGVyciwgbCkgPT4ge1xuICAgICAgaWYgKGwpIHtcbiAgICAgICAgc2V0TG5nUHJvcHMobCk7XG4gICAgICAgIHRoaXMudHJhbnNsYXRvci5jaGFuZ2VMYW5ndWFnZShsKTtcbiAgICAgICAgdGhpcy5pc0xhbmd1YWdlQ2hhbmdpbmdUbyA9IHVuZGVmaW5lZDtcbiAgICAgICAgdGhpcy5lbWl0KCdsYW5ndWFnZUNoYW5nZWQnLCBsKTtcbiAgICAgICAgdGhpcy5sb2dnZXIubG9nKCdsYW5ndWFnZUNoYW5nZWQnLCBsKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuaXNMYW5ndWFnZUNoYW5naW5nVG8gPSB1bmRlZmluZWQ7XG4gICAgICB9XG5cbiAgICAgIGRlZmVycmVkLnJlc29sdmUoKC4uLmFyZ3MpID0+IHRoaXMudCguLi5hcmdzKSk7XG4gICAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrKGVyciwgKC4uLmFyZ3MpID0+IHRoaXMudCguLi5hcmdzKSk7XG4gICAgfTtcblxuICAgIGNvbnN0IHNldExuZyA9IGxuZ3MgPT4ge1xuICAgICAgLy8gaWYgZGV0ZWN0ZWQgbG5nIGlzIGZhbHN5LCBzZXQgaXQgdG8gZW1wdHkgYXJyYXksIHRvIG1ha2Ugc3VyZSBhdCBsZWFzdCB0aGUgZmFsbGJhY2tMbmcgd2lsbCBiZSB1c2VkXG4gICAgICBpZiAoIWxuZyAmJiAhbG5ncyAmJiB0aGlzLnNlcnZpY2VzLmxhbmd1YWdlRGV0ZWN0b3IpIGxuZ3MgPSBbXTtcbiAgICAgIC8vIGRlcGVuZGluZyBvbiBBUEkgaW4gZGV0ZWN0b3IgbG5nIGNhbiBiZSBhIHN0cmluZyAob2xkKSBvciBhbiBhcnJheSBvZiBsYW5ndWFnZXMgb3JkZXJlZCBpbiBwcmlvcml0eVxuICAgICAgY29uc3QgbCA9IGlzU3RyaW5nKGxuZ3MpID8gbG5ncyA6IHRoaXMuc2VydmljZXMubGFuZ3VhZ2VVdGlscy5nZXRCZXN0TWF0Y2hGcm9tQ29kZXMobG5ncyk7XG5cbiAgICAgIGlmIChsKSB7XG4gICAgICAgIGlmICghdGhpcy5sYW5ndWFnZSkge1xuICAgICAgICAgIHNldExuZ1Byb3BzKGwpO1xuICAgICAgICB9XG4gICAgICAgIGlmICghdGhpcy50cmFuc2xhdG9yLmxhbmd1YWdlKSB0aGlzLnRyYW5zbGF0b3IuY2hhbmdlTGFuZ3VhZ2UobCk7XG5cbiAgICAgICAgdGhpcy5zZXJ2aWNlcy5sYW5ndWFnZURldGVjdG9yPy5jYWNoZVVzZXJMYW5ndWFnZT8uKGwpO1xuICAgICAgfVxuXG4gICAgICB0aGlzLmxvYWRSZXNvdXJjZXMobCwgZXJyID0+IHtcbiAgICAgICAgZG9uZShlcnIsIGwpO1xuICAgICAgfSk7XG4gICAgfTtcblxuICAgIGlmICghbG5nICYmIHRoaXMuc2VydmljZXMubGFuZ3VhZ2VEZXRlY3RvciAmJiAhdGhpcy5zZXJ2aWNlcy5sYW5ndWFnZURldGVjdG9yLmFzeW5jKSB7XG4gICAgICBzZXRMbmcodGhpcy5zZXJ2aWNlcy5sYW5ndWFnZURldGVjdG9yLmRldGVjdCgpKTtcbiAgICB9IGVsc2UgaWYgKCFsbmcgJiYgdGhpcy5zZXJ2aWNlcy5sYW5ndWFnZURldGVjdG9yICYmIHRoaXMuc2VydmljZXMubGFuZ3VhZ2VEZXRlY3Rvci5hc3luYykge1xuICAgICAgaWYgKHRoaXMuc2VydmljZXMubGFuZ3VhZ2VEZXRlY3Rvci5kZXRlY3QubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHRoaXMuc2VydmljZXMubGFuZ3VhZ2VEZXRlY3Rvci5kZXRlY3QoKS50aGVuKHNldExuZyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLnNlcnZpY2VzLmxhbmd1YWdlRGV0ZWN0b3IuZGV0ZWN0KHNldExuZyk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHNldExuZyhsbmcpO1xuICAgIH1cblxuICAgIHJldHVybiBkZWZlcnJlZDtcbiAgfVxuXG4gIGdldEZpeGVkVChsbmcsIG5zLCBrZXlQcmVmaXgpIHtcbiAgICBjb25zdCBmaXhlZFQgPSAoa2V5LCBvcHRzLCAuLi5yZXN0KSA9PiB7XG4gICAgICBsZXQgb3B0aW9ucztcbiAgICAgIGlmICh0eXBlb2Ygb3B0cyAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgb3B0aW9ucyA9IHRoaXMub3B0aW9ucy5vdmVybG9hZFRyYW5zbGF0aW9uT3B0aW9uSGFuZGxlcihba2V5LCBvcHRzXS5jb25jYXQocmVzdCkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb3B0aW9ucyA9IHsgLi4ub3B0cyB9O1xuICAgICAgfVxuXG4gICAgICBvcHRpb25zLmxuZyA9IG9wdGlvbnMubG5nIHx8IGZpeGVkVC5sbmc7XG4gICAgICBvcHRpb25zLmxuZ3MgPSBvcHRpb25zLmxuZ3MgfHwgZml4ZWRULmxuZ3M7XG4gICAgICBvcHRpb25zLm5zID0gb3B0aW9ucy5ucyB8fCBmaXhlZFQubnM7XG4gICAgICBpZiAob3B0aW9ucy5rZXlQcmVmaXggIT09ICcnKSBvcHRpb25zLmtleVByZWZpeCA9IG9wdGlvbnMua2V5UHJlZml4IHx8IGtleVByZWZpeCB8fCBmaXhlZFQua2V5UHJlZml4O1xuXG4gICAgICBjb25zdCBrZXlTZXBhcmF0b3IgPSB0aGlzLm9wdGlvbnMua2V5U2VwYXJhdG9yIHx8ICcuJztcbiAgICAgIGxldCByZXN1bHRLZXlcbiAgICAgIGlmIChvcHRpb25zLmtleVByZWZpeCAmJiBBcnJheS5pc0FycmF5KGtleSkpIHtcbiAgICAgICAgcmVzdWx0S2V5ID0ga2V5Lm1hcChrID0+IGAke29wdGlvbnMua2V5UHJlZml4fSR7a2V5U2VwYXJhdG9yfSR7a31gKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlc3VsdEtleSA9IG9wdGlvbnMua2V5UHJlZml4ID8gYCR7b3B0aW9ucy5rZXlQcmVmaXh9JHtrZXlTZXBhcmF0b3J9JHtrZXl9YCA6IGtleTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzLnQocmVzdWx0S2V5LCBvcHRpb25zKTtcbiAgICB9O1xuICAgIGlmIChpc1N0cmluZyhsbmcpKSB7XG4gICAgICBmaXhlZFQubG5nID0gbG5nO1xuICAgIH0gZWxzZSB7XG4gICAgICBmaXhlZFQubG5ncyA9IGxuZztcbiAgICB9XG4gICAgZml4ZWRULm5zID0gbnM7XG4gICAgZml4ZWRULmtleVByZWZpeCA9IGtleVByZWZpeDtcbiAgICByZXR1cm4gZml4ZWRUO1xuICB9XG5cbiAgdCguLi5hcmdzKSB7XG4gICAgcmV0dXJuIHRoaXMudHJhbnNsYXRvcj8udHJhbnNsYXRlKC4uLmFyZ3MpO1xuICB9XG5cbiAgZXhpc3RzKC4uLmFyZ3MpIHtcbiAgICByZXR1cm4gdGhpcy50cmFuc2xhdG9yPy5leGlzdHMoLi4uYXJncyk7XG4gIH1cblxuICBzZXREZWZhdWx0TmFtZXNwYWNlKG5zKSB7XG4gICAgdGhpcy5vcHRpb25zLmRlZmF1bHROUyA9IG5zO1xuICB9XG5cbiAgaGFzTG9hZGVkTmFtZXNwYWNlKG5zLCBvcHRpb25zID0ge30pIHtcbiAgICBpZiAoIXRoaXMuaXNJbml0aWFsaXplZCkge1xuICAgICAgdGhpcy5sb2dnZXIud2FybignaGFzTG9hZGVkTmFtZXNwYWNlOiBpMThuZXh0IHdhcyBub3QgaW5pdGlhbGl6ZWQnLCB0aGlzLmxhbmd1YWdlcyk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGlmICghdGhpcy5sYW5ndWFnZXMgfHwgIXRoaXMubGFuZ3VhZ2VzLmxlbmd0aCkge1xuICAgICAgdGhpcy5sb2dnZXIud2FybignaGFzTG9hZGVkTmFtZXNwYWNlOiBpMThuLmxhbmd1YWdlcyB3ZXJlIHVuZGVmaW5lZCBvciBlbXB0eScsIHRoaXMubGFuZ3VhZ2VzKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBjb25zdCBsbmcgPSBvcHRpb25zLmxuZyB8fCB0aGlzLnJlc29sdmVkTGFuZ3VhZ2UgfHwgdGhpcy5sYW5ndWFnZXNbMF07XG4gICAgY29uc3QgZmFsbGJhY2tMbmcgPSB0aGlzLm9wdGlvbnMgPyB0aGlzLm9wdGlvbnMuZmFsbGJhY2tMbmcgOiBmYWxzZTtcbiAgICBjb25zdCBsYXN0TG5nID0gdGhpcy5sYW5ndWFnZXNbdGhpcy5sYW5ndWFnZXMubGVuZ3RoIC0gMV07XG5cbiAgICAvLyB3ZSdyZSBpbiBjaW1vZGUgc28gdGhpcyBzaGFsbCBwYXNzXG4gICAgaWYgKGxuZy50b0xvd2VyQ2FzZSgpID09PSAnY2ltb2RlJykgcmV0dXJuIHRydWU7XG5cbiAgICBjb25zdCBsb2FkTm90UGVuZGluZyA9IChsLCBuKSA9PiB7XG4gICAgICBjb25zdCBsb2FkU3RhdGUgPSB0aGlzLnNlcnZpY2VzLmJhY2tlbmRDb25uZWN0b3Iuc3RhdGVbYCR7bH18JHtufWBdO1xuICAgICAgcmV0dXJuIGxvYWRTdGF0ZSA9PT0gLTEgfHwgbG9hZFN0YXRlID09PSAwIHx8IGxvYWRTdGF0ZSA9PT0gMjtcbiAgICB9O1xuXG4gICAgLy8gb3B0aW9uYWwgaW5qZWN0ZWQgY2hlY2tcbiAgICBpZiAob3B0aW9ucy5wcmVjaGVjaykge1xuICAgICAgY29uc3QgcHJlUmVzdWx0ID0gb3B0aW9ucy5wcmVjaGVjayh0aGlzLCBsb2FkTm90UGVuZGluZyk7XG4gICAgICBpZiAocHJlUmVzdWx0ICE9PSB1bmRlZmluZWQpIHJldHVybiBwcmVSZXN1bHQ7XG4gICAgfVxuXG4gICAgLy8gbG9hZGVkIC0+IFNVQ0NFU1NcbiAgICBpZiAodGhpcy5oYXNSZXNvdXJjZUJ1bmRsZShsbmcsIG5zKSkgcmV0dXJuIHRydWU7XG5cbiAgICAvLyB3ZXJlIG5vdCBsb2FkaW5nIGF0IGFsbCAtPiBTRU1JIFNVQ0NFU1NcbiAgICBpZiAoIXRoaXMuc2VydmljZXMuYmFja2VuZENvbm5lY3Rvci5iYWNrZW5kIHx8ICh0aGlzLm9wdGlvbnMucmVzb3VyY2VzICYmICF0aGlzLm9wdGlvbnMucGFydGlhbEJ1bmRsZWRMYW5ndWFnZXMpKSByZXR1cm4gdHJ1ZTtcblxuICAgIC8vIGZhaWxlZCBsb2FkaW5nIG5zIC0gYnV0IGF0IGxlYXN0IGZhbGxiYWNrIGlzIG5vdCBwZW5kaW5nIC0+IFNFTUkgU1VDQ0VTU1xuICAgIGlmIChsb2FkTm90UGVuZGluZyhsbmcsIG5zKSAmJiAoIWZhbGxiYWNrTG5nIHx8IGxvYWROb3RQZW5kaW5nKGxhc3RMbmcsIG5zKSkpIHJldHVybiB0cnVlO1xuXG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgbG9hZE5hbWVzcGFjZXMobnMsIGNhbGxiYWNrKSB7XG4gICAgY29uc3QgZGVmZXJyZWQgPSBkZWZlcigpO1xuXG4gICAgaWYgKCF0aGlzLm9wdGlvbnMubnMpIHtcbiAgICAgIGlmIChjYWxsYmFjaykgY2FsbGJhY2soKTtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcbiAgICB9XG4gICAgaWYgKGlzU3RyaW5nKG5zKSkgbnMgPSBbbnNdO1xuXG4gICAgbnMuZm9yRWFjaChuID0+IHtcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMubnMuaW5kZXhPZihuKSA8IDApIHRoaXMub3B0aW9ucy5ucy5wdXNoKG4pO1xuICAgIH0pO1xuXG4gICAgdGhpcy5sb2FkUmVzb3VyY2VzKGVyciA9PiB7XG4gICAgICBkZWZlcnJlZC5yZXNvbHZlKCk7XG4gICAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrKGVycik7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gZGVmZXJyZWQ7XG4gIH1cblxuICBsb2FkTGFuZ3VhZ2VzKGxuZ3MsIGNhbGxiYWNrKSB7XG4gICAgY29uc3QgZGVmZXJyZWQgPSBkZWZlcigpO1xuXG4gICAgaWYgKGlzU3RyaW5nKGxuZ3MpKSBsbmdzID0gW2xuZ3NdO1xuICAgIGNvbnN0IHByZWxvYWRlZCA9IHRoaXMub3B0aW9ucy5wcmVsb2FkIHx8IFtdO1xuXG4gICAgY29uc3QgbmV3TG5ncyA9IGxuZ3MuZmlsdGVyKGxuZyA9PiBwcmVsb2FkZWQuaW5kZXhPZihsbmcpIDwgMCAmJiB0aGlzLnNlcnZpY2VzLmxhbmd1YWdlVXRpbHMuaXNTdXBwb3J0ZWRDb2RlKGxuZykpO1xuICAgIC8vIEV4aXQgZWFybHkgaWYgYWxsIGdpdmVuIGxhbmd1YWdlcyBhcmUgYWxyZWFkeSBwcmVsb2FkZWRcbiAgICBpZiAoIW5ld0xuZ3MubGVuZ3RoKSB7XG4gICAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrKCk7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgfVxuXG4gICAgdGhpcy5vcHRpb25zLnByZWxvYWQgPSBwcmVsb2FkZWQuY29uY2F0KG5ld0xuZ3MpO1xuICAgIHRoaXMubG9hZFJlc291cmNlcyhlcnIgPT4ge1xuICAgICAgZGVmZXJyZWQucmVzb2x2ZSgpO1xuICAgICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjayhlcnIpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIGRlZmVycmVkO1xuICB9XG5cbiAgZGlyKGxuZykge1xuICAgIGlmICghbG5nKSBsbmcgPSB0aGlzLnJlc29sdmVkTGFuZ3VhZ2UgfHwgKHRoaXMubGFuZ3VhZ2VzPy5sZW5ndGggPiAwID8gdGhpcy5sYW5ndWFnZXNbMF0gOiB0aGlzLmxhbmd1YWdlKTtcbiAgICBpZiAoIWxuZykgcmV0dXJuICdydGwnO1xuXG4gICAgY29uc3QgcnRsTG5ncyA9IFtcbiAgICAgICdhcicsXG4gICAgICAnc2h1JyxcbiAgICAgICdzcXInLFxuICAgICAgJ3NzaCcsXG4gICAgICAneGFhJyxcbiAgICAgICd5aGQnLFxuICAgICAgJ3l1ZCcsXG4gICAgICAnYWFvJyxcbiAgICAgICdhYmgnLFxuICAgICAgJ2FidicsXG4gICAgICAnYWNtJyxcbiAgICAgICdhY3EnLFxuICAgICAgJ2FjdycsXG4gICAgICAnYWN4JyxcbiAgICAgICdhY3knLFxuICAgICAgJ2FkZicsXG4gICAgICAnYWRzJyxcbiAgICAgICdhZWInLFxuICAgICAgJ2FlYycsXG4gICAgICAnYWZiJyxcbiAgICAgICdhanAnLFxuICAgICAgJ2FwYycsXG4gICAgICAnYXBkJyxcbiAgICAgICdhcmInLFxuICAgICAgJ2FycScsXG4gICAgICAnYXJzJyxcbiAgICAgICdhcnknLFxuICAgICAgJ2FyeicsXG4gICAgICAnYXV6JyxcbiAgICAgICdhdmwnLFxuICAgICAgJ2F5aCcsXG4gICAgICAnYXlsJyxcbiAgICAgICdheW4nLFxuICAgICAgJ2F5cCcsXG4gICAgICAnYmJ6JyxcbiAgICAgICdwZ2EnLFxuICAgICAgJ2hlJyxcbiAgICAgICdpdycsXG4gICAgICAncHMnLFxuICAgICAgJ3BidCcsXG4gICAgICAncGJ1JyxcbiAgICAgICdwc3QnLFxuICAgICAgJ3BycCcsXG4gICAgICAncHJkJyxcbiAgICAgICd1ZycsXG4gICAgICAndXInLFxuICAgICAgJ3lkZCcsXG4gICAgICAneWRzJyxcbiAgICAgICd5aWgnLFxuICAgICAgJ2ppJyxcbiAgICAgICd5aScsXG4gICAgICAnaGJvJyxcbiAgICAgICdtZW4nLFxuICAgICAgJ3htbicsXG4gICAgICAnZmEnLFxuICAgICAgJ2pwcicsXG4gICAgICAncGVvJyxcbiAgICAgICdwZXMnLFxuICAgICAgJ3BycycsXG4gICAgICAnZHYnLFxuICAgICAgJ3NhbScsXG4gICAgICAnY2tiJ1xuICAgIF07XG5cbiAgICBjb25zdCBsYW5ndWFnZVV0aWxzID0gdGhpcy5zZXJ2aWNlcz8ubGFuZ3VhZ2VVdGlscyB8fCBuZXcgTGFuZ3VhZ2VVdGlscyhnZXREZWZhdWx0cygpKSAvLyBmb3IgdW5pbml0aWFsaXplZCB1c2FnZVxuXG4gICAgcmV0dXJuIHJ0bExuZ3MuaW5kZXhPZihsYW5ndWFnZVV0aWxzLmdldExhbmd1YWdlUGFydEZyb21Db2RlKGxuZykpID4gLTEgfHwgbG5nLnRvTG93ZXJDYXNlKCkuaW5kZXhPZignLWFyYWInKSA+IDFcbiAgICAgID8gJ3J0bCdcbiAgICAgIDogJ2x0cic7XG4gIH1cblxuICBzdGF0aWMgY3JlYXRlSW5zdGFuY2Uob3B0aW9ucyA9IHt9LCBjYWxsYmFjaykgeyByZXR1cm4gbmV3IEkxOG4ob3B0aW9ucywgY2FsbGJhY2spIH1cblxuICBjbG9uZUluc3RhbmNlKG9wdGlvbnMgPSB7fSwgY2FsbGJhY2sgPSBub29wKSB7XG4gICAgY29uc3QgZm9ya1Jlc291cmNlU3RvcmUgPSBvcHRpb25zLmZvcmtSZXNvdXJjZVN0b3JlO1xuICAgIGlmIChmb3JrUmVzb3VyY2VTdG9yZSkgZGVsZXRlIG9wdGlvbnMuZm9ya1Jlc291cmNlU3RvcmU7XG4gICAgY29uc3QgbWVyZ2VkT3B0aW9ucyA9IHsgLi4udGhpcy5vcHRpb25zLCAuLi5vcHRpb25zLCAuLi57IGlzQ2xvbmU6IHRydWUgfSB9O1xuICAgIGNvbnN0IGNsb25lID0gbmV3IEkxOG4obWVyZ2VkT3B0aW9ucyk7XG4gICAgaWYgKChvcHRpb25zLmRlYnVnICE9PSB1bmRlZmluZWQgfHwgb3B0aW9ucy5wcmVmaXggIT09IHVuZGVmaW5lZCkpIHtcbiAgICAgIGNsb25lLmxvZ2dlciA9IGNsb25lLmxvZ2dlci5jbG9uZShvcHRpb25zKTtcbiAgICB9XG4gICAgY29uc3QgbWVtYmVyc1RvQ29weSA9IFsnc3RvcmUnLCAnc2VydmljZXMnLCAnbGFuZ3VhZ2UnXTtcbiAgICBtZW1iZXJzVG9Db3B5LmZvckVhY2gobSA9PiB7XG4gICAgICBjbG9uZVttXSA9IHRoaXNbbV07XG4gICAgfSk7XG4gICAgY2xvbmUuc2VydmljZXMgPSB7IC4uLnRoaXMuc2VydmljZXMgfTtcbiAgICBjbG9uZS5zZXJ2aWNlcy51dGlscyA9IHtcbiAgICAgIGhhc0xvYWRlZE5hbWVzcGFjZTogY2xvbmUuaGFzTG9hZGVkTmFtZXNwYWNlLmJpbmQoY2xvbmUpXG4gICAgfTtcbiAgICBpZiAoZm9ya1Jlc291cmNlU3RvcmUpIHtcbiAgICAgIGNsb25lLnN0b3JlID0gbmV3IFJlc291cmNlU3RvcmUodGhpcy5zdG9yZS5kYXRhLCBtZXJnZWRPcHRpb25zKTtcbiAgICAgIGNsb25lLnNlcnZpY2VzLnJlc291cmNlU3RvcmUgPSBjbG9uZS5zdG9yZTtcbiAgICB9XG4gICAgY2xvbmUudHJhbnNsYXRvciA9IG5ldyBUcmFuc2xhdG9yKGNsb25lLnNlcnZpY2VzLCBtZXJnZWRPcHRpb25zKTtcbiAgICBjbG9uZS50cmFuc2xhdG9yLm9uKCcqJywgKGV2ZW50LCAuLi5hcmdzKSA9PiB7XG4gICAgICBjbG9uZS5lbWl0KGV2ZW50LCAuLi5hcmdzKTtcbiAgICB9KTtcbiAgICBjbG9uZS5pbml0KG1lcmdlZE9wdGlvbnMsIGNhbGxiYWNrKTtcbiAgICBjbG9uZS50cmFuc2xhdG9yLm9wdGlvbnMgPSBtZXJnZWRPcHRpb25zOyAvLyBzeW5jIG9wdGlvbnNcbiAgICBjbG9uZS50cmFuc2xhdG9yLmJhY2tlbmRDb25uZWN0b3Iuc2VydmljZXMudXRpbHMgPSB7XG4gICAgICBoYXNMb2FkZWROYW1lc3BhY2U6IGNsb25lLmhhc0xvYWRlZE5hbWVzcGFjZS5iaW5kKGNsb25lKVxuICAgIH07XG5cbiAgICByZXR1cm4gY2xvbmU7XG4gIH1cblxuICB0b0pTT04oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIG9wdGlvbnM6IHRoaXMub3B0aW9ucyxcbiAgICAgIHN0b3JlOiB0aGlzLnN0b3JlLFxuICAgICAgbGFuZ3VhZ2U6IHRoaXMubGFuZ3VhZ2UsXG4gICAgICBsYW5ndWFnZXM6IHRoaXMubGFuZ3VhZ2VzLFxuICAgICAgcmVzb2x2ZWRMYW5ndWFnZTogdGhpcy5yZXNvbHZlZExhbmd1YWdlXG4gICAgfTtcbiAgfVxufVxuXG5jb25zdCBpbnN0YW5jZSA9IEkxOG4uY3JlYXRlSW5zdGFuY2UoKTtcbmluc3RhbmNlLmNyZWF0ZUluc3RhbmNlID0gSTE4bi5jcmVhdGVJbnN0YW5jZTtcblxuZXhwb3J0IGRlZmF1bHQgaW5zdGFuY2U7XG4iLCJpbXBvcnQgaTE4bmV4dCBmcm9tICcuL2kxOG5leHQuanMnO1xuXG5leHBvcnQgZGVmYXVsdCBpMThuZXh0O1xuXG5leHBvcnQgY29uc3QgY3JlYXRlSW5zdGFuY2UgPSBpMThuZXh0LmNyZWF0ZUluc3RhbmNlO1xuXG5leHBvcnQgY29uc3QgZGlyID0gaTE4bmV4dC5kaXI7XG5leHBvcnQgY29uc3QgaW5pdCA9IGkxOG5leHQuaW5pdDtcbmV4cG9ydCBjb25zdCBsb2FkUmVzb3VyY2VzID0gaTE4bmV4dC5sb2FkUmVzb3VyY2VzO1xuZXhwb3J0IGNvbnN0IHJlbG9hZFJlc291cmNlcyA9IGkxOG5leHQucmVsb2FkUmVzb3VyY2VzO1xuZXhwb3J0IGNvbnN0IHVzZSA9IGkxOG5leHQudXNlO1xuZXhwb3J0IGNvbnN0IGNoYW5nZUxhbmd1YWdlID0gaTE4bmV4dC5jaGFuZ2VMYW5ndWFnZTtcbmV4cG9ydCBjb25zdCBnZXRGaXhlZFQgPSBpMThuZXh0LmdldEZpeGVkVDtcbmV4cG9ydCBjb25zdCB0ID0gaTE4bmV4dC50O1xuZXhwb3J0IGNvbnN0IGV4aXN0cyA9IGkxOG5leHQuZXhpc3RzO1xuZXhwb3J0IGNvbnN0IHNldERlZmF1bHROYW1lc3BhY2UgPSBpMThuZXh0LnNldERlZmF1bHROYW1lc3BhY2U7XG5leHBvcnQgY29uc3QgaGFzTG9hZGVkTmFtZXNwYWNlID0gaTE4bmV4dC5oYXNMb2FkZWROYW1lc3BhY2U7XG5leHBvcnQgY29uc3QgbG9hZE5hbWVzcGFjZXMgPSBpMThuZXh0LmxvYWROYW1lc3BhY2VzO1xuZXhwb3J0IGNvbnN0IGxvYWRMYW5ndWFnZXMgPSBpMThuZXh0LmxvYWRMYW5ndWFnZXM7XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1uYW1lc3BhY2UsXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueSxcbiAqL1xuXG5pbXBvcnQge1xuICAgIGRlZmF1bHQgYXMgaTE4bmV4dCxcbiAgICBpMThuIGFzIGkxOG5leHRJbnN0YW5jZSxcbiAgICBGYWxsYmFja0xuZ09iakxpc3QgYXMgaTE4bmV4dEZhbGxiYWNrTG5nT2JqTGlzdCxcbiAgICBGYWxsYmFja0xuZyBhcyBpMThuZXh0RmFsbGJhY2tMbmcsXG4gICAgSW50ZXJwb2xhdGlvbk9wdGlvbnMgYXMgaTE4bmV4dEludGVycG9sYXRpb25PcHRpb25zLFxuICAgIFJlYWN0T3B0aW9ucyBhcyBpMThuZXh0UmVhY3RPcHRpb25zLFxuICAgIEluaXRPcHRpb25zIGFzIGkxOG5leHRJbml0T3B0aW9ucyxcbiAgICBUT3B0aW9uc0Jhc2UgYXMgaTE4bmV4dFRPcHRpb25zQmFzZSxcbiAgICBUT3B0aW9ucyBhcyBpMThuZXh0VE9wdGlvbnMsXG4gICAgRXhpc3RzRnVuY3Rpb24gYXMgaTE4bmV4dEV4aXN0c0Z1bmN0aW9uLFxuICAgIFdpdGhUIGFzIGkxOG5leHRXaXRoVCxcbiAgICBURnVuY3Rpb24gYXMgaTE4bmV4dFRGdW5jdGlvbixcbiAgICBSZXNvdXJjZSBhcyBpMThuZXh0UmVzb3VyY2UsXG4gICAgUmVzb3VyY2VMYW5ndWFnZSBhcyBpMThuZXh0UmVzb3VyY2VMYW5ndWFnZSxcbiAgICBSZXNvdXJjZUtleSBhcyBpMThuZXh0UmVzb3VyY2VLZXksXG4gICAgSW50ZXJwb2xhdG9yIGFzIGkxOG5leHRJbnRlcnBvbGF0b3IsXG4gICAgUmVzb3VyY2VTdG9yZSBhcyBpMThuZXh0UmVzb3VyY2VTdG9yZSxcbiAgICBTZXJ2aWNlcyBhcyBpMThuZXh0U2VydmljZXMsXG4gICAgTW9kdWxlIGFzIGkxOG5leHRNb2R1bGUsXG4gICAgQ2FsbGJhY2tFcnJvciBhcyBpMThuZXh0Q2FsbGJhY2tFcnJvcixcbiAgICBSZWFkQ2FsbGJhY2sgYXMgaTE4bmV4dFJlYWRDYWxsYmFjayxcbiAgICBNdWx0aVJlYWRDYWxsYmFjayBhcyBpMThuZXh0TXVsdGlSZWFkQ2FsbGJhY2ssXG4gICAgQmFja2VuZE1vZHVsZSBhcyBpMThuZXh0QmFja2VuZE1vZHVsZSxcbiAgICBMYW5ndWFnZURldGVjdG9yTW9kdWxlIGFzIGkxOG5leHRMYW5ndWFnZURldGVjdG9yTW9kdWxlLFxuICAgIExhbmd1YWdlRGV0ZWN0b3JBc3luY01vZHVsZSBhcyBpMThuZXh0TGFuZ3VhZ2VEZXRlY3RvckFzeW5jTW9kdWxlLFxuICAgIFBvc3RQcm9jZXNzb3JNb2R1bGUgYXMgaTE4bmV4dFBvc3RQcm9jZXNzb3JNb2R1bGUsXG4gICAgTG9nZ2VyTW9kdWxlIGFzIGkxOG5leHRMb2dnZXJNb2R1bGUsXG4gICAgSTE4bkZvcm1hdE1vZHVsZSBhcyBpMThuZXh0STE4bkZvcm1hdE1vZHVsZSxcbiAgICBUaGlyZFBhcnR5TW9kdWxlIGFzIGkxOG5leHRUaGlyZFBhcnR5TW9kdWxlLFxuICAgIE1vZHVsZXMgYXMgaTE4bmV4dE1vZHVsZXMsXG4gICAgTmV3YWJsZSBhcyBpMThuZXh0TmV3YWJsZSxcbn0gZnJvbSAnaTE4bmV4dCc7XG5cbmNvbnN0IGkxOG46IGkxOG4uaTE4biA9IGkxOG5leHQ7XG5cbmRlY2xhcmUgbmFtZXNwYWNlIGkxOG4ge1xuICAgIGV4cG9ydCB0eXBlIGkxOG4gPSBpMThuZXh0SW5zdGFuY2U7XG4gICAgZXhwb3J0IHR5cGUgRmFsbGJhY2tMbmdPYmpMaXN0ID0gaTE4bmV4dEZhbGxiYWNrTG5nT2JqTGlzdDtcbiAgICBleHBvcnQgdHlwZSBGYWxsYmFja0xuZyA9IGkxOG5leHRGYWxsYmFja0xuZztcbiAgICBleHBvcnQgdHlwZSBJbnRlcnBvbGF0aW9uT3B0aW9ucyA9IGkxOG5leHRJbnRlcnBvbGF0aW9uT3B0aW9ucztcbiAgICBleHBvcnQgdHlwZSBSZWFjdE9wdGlvbnMgPSBpMThuZXh0UmVhY3RPcHRpb25zO1xuICAgIGV4cG9ydCB0eXBlIEluaXRPcHRpb25zID0gaTE4bmV4dEluaXRPcHRpb25zO1xuICAgIGV4cG9ydCB0eXBlIFRPcHRpb25zQmFzZSA9IGkxOG5leHRUT3B0aW9uc0Jhc2U7XG4gICAgZXhwb3J0IHR5cGUgVE9wdGlvbnM8VCBleHRlbmRzIFJlY29yZDxzdHJpbmcsIHVua25vd24+ID0gUmVjb3JkPHN0cmluZywgYW55Pj4gPSBpMThuZXh0VE9wdGlvbnM8VD47XG4gICAgZXhwb3J0IHR5cGUgRXhpc3RzRnVuY3Rpb248SyBleHRlbmRzIHN0cmluZyA9IHN0cmluZywgVCBleHRlbmRzIFJlY29yZDxzdHJpbmcsIHVua25vd24+ID0gUmVjb3JkPHN0cmluZywgYW55Pj4gPSBpMThuZXh0RXhpc3RzRnVuY3Rpb248SywgVD47XG4gICAgZXhwb3J0IHR5cGUgV2l0aFQgPSBpMThuZXh0V2l0aFQ7XG4gICAgZXhwb3J0IHR5cGUgVEZ1bmN0aW9uID0gaTE4bmV4dFRGdW5jdGlvbjtcbiAgICBleHBvcnQgdHlwZSBSZXNvdXJjZSA9IGkxOG5leHRSZXNvdXJjZTtcbiAgICBleHBvcnQgdHlwZSBSZXNvdXJjZUxhbmd1YWdlID0gaTE4bmV4dFJlc291cmNlTGFuZ3VhZ2U7XG4gICAgZXhwb3J0IHR5cGUgUmVzb3VyY2VLZXkgPSBpMThuZXh0UmVzb3VyY2VLZXk7XG4gICAgZXhwb3J0IHR5cGUgSW50ZXJwb2xhdG9yID0gaTE4bmV4dEludGVycG9sYXRvcjtcbiAgICBleHBvcnQgdHlwZSBSZXNvdXJjZVN0b3JlID0gaTE4bmV4dFJlc291cmNlU3RvcmU7XG4gICAgZXhwb3J0IHR5cGUgU2VydmljZXMgPSBpMThuZXh0U2VydmljZXM7XG4gICAgZXhwb3J0IHR5cGUgTW9kdWxlID0gaTE4bmV4dE1vZHVsZTtcbiAgICBleHBvcnQgdHlwZSBDYWxsYmFja0Vycm9yID0gaTE4bmV4dENhbGxiYWNrRXJyb3I7XG4gICAgZXhwb3J0IHR5cGUgUmVhZENhbGxiYWNrID0gaTE4bmV4dFJlYWRDYWxsYmFjaztcbiAgICBleHBvcnQgdHlwZSBNdWx0aVJlYWRDYWxsYmFjayA9IGkxOG5leHRNdWx0aVJlYWRDYWxsYmFjaztcbiAgICBleHBvcnQgdHlwZSBCYWNrZW5kTW9kdWxlPFQgPSBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPj4gPSBpMThuZXh0QmFja2VuZE1vZHVsZTxUPjtcbiAgICBleHBvcnQgdHlwZSBMYW5ndWFnZURldGVjdG9yTW9kdWxlID0gaTE4bmV4dExhbmd1YWdlRGV0ZWN0b3JNb2R1bGU7XG4gICAgZXhwb3J0IHR5cGUgTGFuZ3VhZ2VEZXRlY3RvckFzeW5jTW9kdWxlID0gaTE4bmV4dExhbmd1YWdlRGV0ZWN0b3JBc3luY01vZHVsZTtcbiAgICBleHBvcnQgdHlwZSBQb3N0UHJvY2Vzc29yTW9kdWxlID0gaTE4bmV4dFBvc3RQcm9jZXNzb3JNb2R1bGU7XG4gICAgZXhwb3J0IHR5cGUgTG9nZ2VyTW9kdWxlID0gaTE4bmV4dExvZ2dlck1vZHVsZTtcbiAgICBleHBvcnQgdHlwZSBJMThuRm9ybWF0TW9kdWxlID0gaTE4bmV4dEkxOG5Gb3JtYXRNb2R1bGU7XG4gICAgZXhwb3J0IHR5cGUgVGhpcmRQYXJ0eU1vZHVsZSA9IGkxOG5leHRUaGlyZFBhcnR5TW9kdWxlO1xuICAgIGV4cG9ydCB0eXBlIE1vZHVsZXMgPSBpMThuZXh0TW9kdWxlcztcbiAgICBleHBvcnQgdHlwZSBOZXdhYmxlPFQ+ID0gaTE4bmV4dE5ld2FibGU8VD47XG59XG5cbmV4cG9ydCB7IGkxOG4gfTtcbiJdLCJuYW1lcyI6WyJ1dGlsc0NvcHkiLCJlc2NhcGUiLCJ1dGlsc0VzY2FwZSIsImdldERlZmF1bHRzIiwiTGFuZ3VhZ2VVdGlscyIsIkJhY2tlbmRDb25uZWN0b3IiLCJpMThuZXh0Il0sIm1hcHBpbmdzIjoiOzs7OztBQUFPLE1BQU0sUUFBUSxHQUFHLENBQUMsR0FBRyxLQUFLLE9BQU8sR0FBRyxLQUFLLFFBQVE7O0FBRXhEO0FBQ08sTUFBTSxLQUFLLEdBQUcsTUFBTTtBQUMzQixFQUFFLElBQUksR0FBRztBQUNULEVBQUUsSUFBSSxHQUFHOztBQUVULEVBQUUsTUFBTSxPQUFPLEdBQUcsSUFBSSxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsTUFBTSxLQUFLO0FBQ25ELElBQUksR0FBRyxHQUFHLE9BQU87QUFDakIsSUFBSSxHQUFHLEdBQUcsTUFBTTtBQUNoQixHQUFHLENBQUM7O0FBRUosRUFBRSxPQUFPLENBQUMsT0FBTyxHQUFHLEdBQUc7QUFDdkIsRUFBRSxPQUFPLENBQUMsTUFBTSxHQUFHLEdBQUc7O0FBRXRCLEVBQUUsT0FBTyxPQUFPO0FBQ2hCLENBQUM7O0FBRU0sTUFBTSxVQUFVLEdBQUcsQ0FBQyxNQUFNLEtBQUs7QUFDdEMsRUFBRSxJQUFJLE1BQU0sSUFBSSxJQUFJLEVBQUUsT0FBTyxFQUFFO0FBQy9CO0FBQ0EsRUFBRSxPQUFPLEVBQUUsR0FBRyxNQUFNO0FBQ3BCLENBQUM7O0FBRU0sTUFBTSxJQUFJLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsS0FBSztBQUNqQyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEtBQUs7QUFDbkIsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN6QixHQUFHLENBQUM7QUFDSixDQUFDOztBQUVEO0FBQ0E7QUFDQSxNQUFNLHlCQUF5QixHQUFHLE1BQU07O0FBRXhDLE1BQU0sUUFBUSxHQUFHLENBQUMsR0FBRztBQUNyQixFQUFFLEdBQUcsSUFBSSxHQUFHLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxPQUFPLENBQUMseUJBQXlCLEVBQUUsR0FBRyxDQUFDLEdBQUcsR0FBRzs7QUFFcEYsTUFBTSxvQkFBb0IsR0FBRyxDQUFDLE1BQU0sS0FBSyxDQUFDLE1BQU0sSUFBSSxRQUFRLENBQUMsTUFBTSxDQUFDOztBQUVwRSxNQUFNLGFBQWEsR0FBRyxDQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsS0FBSyxLQUFLO0FBQy9DLEVBQUUsTUFBTSxLQUFLLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDO0FBQ3hELEVBQUUsSUFBSSxVQUFVLEdBQUcsQ0FBQztBQUNwQjtBQUNBLEVBQUUsT0FBTyxVQUFVLEdBQUcsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7QUFDeEMsSUFBSSxJQUFJLG9CQUFvQixDQUFDLE1BQU0sQ0FBQyxFQUFFLE9BQU8sRUFBRTs7QUFFL0MsSUFBSSxNQUFNLEdBQUcsR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQzNDLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxLQUFLLEVBQUUsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksS0FBSyxFQUFFO0FBQ3hEO0FBQ0EsSUFBSSxJQUFJLE1BQU0sQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLEVBQUU7QUFDM0QsTUFBTSxNQUFNLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQztBQUMxQixLQUFLLE1BQU07QUFDWCxNQUFNLE1BQU0sR0FBRyxFQUFFO0FBQ2pCO0FBQ0EsSUFBSSxFQUFFLFVBQVU7QUFDaEI7O0FBRUEsRUFBRSxJQUFJLG9CQUFvQixDQUFDLE1BQU0sQ0FBQyxFQUFFLE9BQU8sRUFBRTtBQUM3QyxFQUFFLE9BQU87QUFDVCxJQUFJLEdBQUcsRUFBRSxNQUFNO0FBQ2YsSUFBSSxDQUFDLEVBQUUsUUFBUSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUNsQyxHQUFHO0FBQ0gsQ0FBQzs7QUFFTSxNQUFNLE9BQU8sR0FBRyxDQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsUUFBUSxLQUFLO0FBQ25ELEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxhQUFhLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLENBQUM7QUFDeEQsRUFBRSxJQUFJLEdBQUcsS0FBSyxTQUFTLElBQUksSUFBSSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7QUFDOUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsUUFBUTtBQUNyQixJQUFJO0FBQ0o7O0FBRUEsRUFBRSxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7QUFDL0IsRUFBRSxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztBQUN4QyxFQUFFLElBQUksSUFBSSxHQUFHLGFBQWEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLE1BQU0sQ0FBQztBQUM3QyxFQUFFLE9BQU8sSUFBSSxDQUFDLEdBQUcsS0FBSyxTQUFTLElBQUksQ0FBQyxDQUFDLE1BQU0sRUFBRTtBQUM3QyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQ2pDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO0FBQ2hDLElBQUksSUFBSSxHQUFHLGFBQWEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLE1BQU0sQ0FBQztBQUMzQyxJQUFJLElBQUksSUFBSSxFQUFFLEdBQUcsSUFBSSxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxXQUFXLEVBQUU7QUFDeEUsTUFBTSxJQUFJLENBQUMsR0FBRyxHQUFHLFNBQVM7QUFDMUI7QUFDQTtBQUNBLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLFFBQVE7QUFDdkMsQ0FBQzs7QUFFTSxNQUFNLFFBQVEsR0FBRyxDQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLE1BQU0sS0FBSztBQUM1RCxFQUFFLE1BQU0sRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsYUFBYSxDQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxDQUFDOztBQUV4RCxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRTtBQUV2QixFQUFlLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDO0FBQ3BDLENBQUM7O0FBRU0sTUFBTSxPQUFPLEdBQUcsQ0FBQyxNQUFNLEVBQUUsSUFBSSxLQUFLO0FBQ3pDLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxhQUFhLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQzs7QUFFaEQsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLE9BQU8sU0FBUztBQUM1QixFQUFFLE9BQU8sR0FBRyxDQUFDLENBQUMsQ0FBQztBQUNmLENBQUM7O0FBRU0sTUFBTSxtQkFBbUIsR0FBRyxDQUFDLElBQUksRUFBRSxXQUFXLEVBQUUsR0FBRyxLQUFLO0FBQy9ELEVBQUUsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUM7QUFDbEMsRUFBRSxJQUFJLEtBQUssS0FBSyxTQUFTLEVBQUU7QUFDM0IsSUFBSSxPQUFPLEtBQUs7QUFDaEI7QUFDQTtBQUNBLEVBQUUsT0FBTyxPQUFPLENBQUMsV0FBVyxFQUFFLEdBQUcsQ0FBQztBQUNsQyxDQUFDOztBQUVNLE1BQU0sVUFBVSxHQUFHLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxTQUFTLEtBQUs7QUFDekQ7QUFDQSxFQUFFLEtBQUssTUFBTSxJQUFJLElBQUksTUFBTSxFQUFFO0FBQzdCLElBQUksSUFBSSxJQUFJLEtBQUssV0FBVyxJQUFJLElBQUksS0FBSyxhQUFhLEVBQUU7QUFDeEQsTUFBTSxJQUFJLElBQUksSUFBSSxNQUFNLEVBQUU7QUFDMUI7QUFDQSxRQUFRO0FBQ1IsVUFBVSxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ2hDLFVBQVUsTUFBTSxDQUFDLElBQUksQ0FBQyxZQUFZLE1BQU07QUFDeEMsVUFBVSxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ2hDLFVBQVUsTUFBTSxDQUFDLElBQUksQ0FBQyxZQUFZO0FBQ2xDLFVBQVU7QUFDVixVQUFVLElBQUksU0FBUyxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDO0FBQ3BELFNBQVMsTUFBTTtBQUNmLFVBQVUsVUFBVSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsU0FBUyxDQUFDO0FBQzNEO0FBQ0EsT0FBTyxNQUFNO0FBQ2IsUUFBUSxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQztBQUNuQztBQUNBO0FBQ0E7QUFDQSxFQUFFLE9BQU8sTUFBTTtBQUNmLENBQUM7O0FBRU0sTUFBTSxXQUFXLEdBQUcsQ0FBQyxHQUFHO0FBQy9CO0FBQ0EsRUFBRSxHQUFHLENBQUMsT0FBTyxDQUFDLHFDQUFxQyxFQUFFLE1BQU0sQ0FBQzs7QUFFNUQ7QUFDQSxJQUFJLFVBQVUsR0FBRztBQUNqQixFQUFFLEdBQUcsRUFBRSxPQUFPO0FBQ2QsRUFBRSxHQUFHLEVBQUUsTUFBTTtBQUNiLEVBQUUsR0FBRyxFQUFFLE1BQU07QUFDYixFQUFFLEdBQUcsRUFBRSxRQUFRO0FBQ2YsRUFBRSxHQUFHLEVBQUUsT0FBTztBQUNkLEVBQUUsR0FBRyxFQUFFLFFBQVE7QUFDZixDQUFDO0FBQ0Q7O0FBRU8sTUFBTSxNQUFNLEdBQUcsQ0FBQyxJQUFJLEtBQUs7QUFDaEMsRUFBRSxJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRTtBQUN0QixJQUFJLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDLEtBQUssVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzNEOztBQUVBLEVBQUUsT0FBTyxJQUFJO0FBQ2IsQ0FBQzs7QUFFRDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsTUFBTSxXQUFXLENBQUM7QUFDbEIsRUFBRSxXQUFXLENBQUMsUUFBUSxFQUFFO0FBQ3hCLElBQUksSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRO0FBQzVCLElBQUksSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLEdBQUcsRUFBRTtBQUM5QjtBQUNBO0FBQ0EsSUFBSSxJQUFJLENBQUMsV0FBVyxHQUFHLEVBQUU7QUFDekI7O0FBRUEsRUFBRSxTQUFTLENBQUMsT0FBTyxFQUFFO0FBQ3JCLElBQUksTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDO0FBQ3ZELElBQUksSUFBSSxlQUFlLEtBQUssU0FBUyxFQUFFO0FBQ3ZDLE1BQU0sT0FBTyxlQUFlO0FBQzVCO0FBQ0EsSUFBSSxNQUFNLFNBQVMsR0FBRyxJQUFJLE1BQU0sQ0FBQyxPQUFPLENBQUM7QUFDekMsSUFBSSxJQUFJLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxLQUFLLElBQUksQ0FBQyxRQUFRLEVBQUU7QUFDbkQsTUFBTSxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxDQUFDO0FBQ3JEO0FBQ0EsSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsU0FBUyxDQUFDO0FBQzFDLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDO0FBQ2xDLElBQUksT0FBTyxTQUFTO0FBQ3BCO0FBQ0E7O0FBRUEsTUFBTSxLQUFLLEdBQUcsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDO0FBQ3ZDO0FBQ0E7QUFDQSxNQUFNLDhCQUE4QixHQUFHLElBQUksV0FBVyxDQUFDLEVBQUUsQ0FBQzs7QUFFbkQsTUFBTSxtQkFBbUIsR0FBRyxDQUFDLEdBQUcsRUFBRSxXQUFXLEVBQUUsWUFBWSxLQUFLO0FBQ3ZFLEVBQUUsV0FBVyxHQUFHLFdBQVcsSUFBSSxFQUFFO0FBQ2pDLEVBQUUsWUFBWSxHQUFHLFlBQVksSUFBSSxFQUFFO0FBQ25DLEVBQUUsTUFBTSxhQUFhLEdBQUcsS0FBSyxDQUFDLE1BQU07QUFDcEMsSUFBSSxDQUFDLENBQUMsS0FBSyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUM7QUFDcEUsR0FBRztBQUNILEVBQUUsSUFBSSxhQUFhLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxPQUFPLElBQUk7QUFDN0MsRUFBRSxNQUFNLENBQUMsR0FBRyw4QkFBOEIsQ0FBQyxTQUFTO0FBQ3BELElBQUksQ0FBQyxDQUFDLEVBQUUsYUFBYSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssR0FBRyxHQUFHLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDdEUsR0FBRztBQUNILEVBQUUsSUFBSSxPQUFPLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQztBQUM1QixFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUU7QUFDaEIsSUFBSSxNQUFNLEVBQUUsR0FBRyxHQUFHLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQztBQUN4QyxJQUFJLElBQUksRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRTtBQUNqRCxNQUFNLE9BQU8sR0FBRyxJQUFJO0FBQ3BCO0FBQ0E7QUFDQSxFQUFFLE9BQU8sT0FBTztBQUNoQixDQUFDOztBQUVEO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ08sTUFBTSxRQUFRLEdBQUcsQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLFlBQVksR0FBRyxHQUFHLEtBQUs7QUFDM0QsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLE9BQU8sU0FBUztBQUM1QixFQUFFLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sR0FBRyxDQUFDLElBQUksQ0FBQztBQUNqQyxFQUFFLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDO0FBQ3pDLEVBQUUsSUFBSSxPQUFPLEdBQUcsR0FBRztBQUNuQixFQUFFLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxNQUFNLENBQUMsTUFBTSxJQUFJO0FBQ3ZDLElBQUksSUFBSSxDQUFDLE9BQU8sSUFBSSxPQUFPLE9BQU8sS0FBSyxRQUFRLEVBQUU7QUFDakQsTUFBTSxPQUFPLFNBQVM7QUFDdEI7QUFDQSxJQUFJLElBQUksSUFBSTtBQUNaLElBQUksSUFBSSxRQUFRLEdBQUcsRUFBRTtBQUNyQixJQUFJLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxNQUFNLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxFQUFFO0FBQzVDLE1BQU0sSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFO0FBQ25CLFFBQVEsUUFBUSxJQUFJLFlBQVk7QUFDaEM7QUFDQSxNQUFNLFFBQVEsSUFBSSxNQUFNLENBQUMsQ0FBQyxDQUFDO0FBQzNCLE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUM7QUFDOUIsTUFBTSxJQUFJLElBQUksS0FBSyxTQUFTLEVBQUU7QUFDOUIsUUFBUSxJQUFJLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBRSxTQUFTLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7QUFDaEcsVUFBVTtBQUNWO0FBQ0EsUUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDO0FBQ3RCLFFBQVE7QUFDUjtBQUNBO0FBQ0EsSUFBSSxPQUFPLEdBQUcsSUFBSTtBQUNsQjtBQUNBLEVBQUUsT0FBTyxPQUFPO0FBQ2hCLENBQUM7O0FBRU0sTUFBTSxjQUFjLEdBQUcsQ0FBQyxJQUFJLEtBQUssSUFBSSxFQUFFLE9BQU8sQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDOztBQ3hQL0QsTUFBTSxhQUFhLEdBQUc7QUFDdEIsRUFBRSxJQUFJLEVBQUUsUUFBUTs7QUFFaEIsRUFBRSxHQUFHLENBQUMsSUFBSSxFQUFFO0FBQ1osSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUM7QUFDNUIsR0FBRzs7QUFFSCxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUU7QUFDYixJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQztBQUM3QixHQUFHOztBQUVILEVBQUUsS0FBSyxDQUFDLElBQUksRUFBRTtBQUNkLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDO0FBQzlCLEdBQUc7O0FBRUgsRUFBRSxNQUFNLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRTtBQUNyQjtBQUNBLElBQUksT0FBTyxHQUFHLElBQUksQ0FBQyxFQUFFLEtBQUssR0FBRyxPQUFPLEVBQUUsSUFBSSxDQUFDO0FBQzNDLEdBQUc7QUFDSCxDQUFDOztBQUVELE1BQU0sTUFBTSxDQUFDO0FBQ2IsRUFBRSxXQUFXLENBQUMsY0FBYyxFQUFFLE9BQU8sR0FBRyxFQUFFLEVBQUU7QUFDNUMsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxPQUFPLENBQUM7QUFDdEM7O0FBRUEsRUFBRSxJQUFJLENBQUMsY0FBYyxFQUFFLE9BQU8sR0FBRyxFQUFFLEVBQUU7QUFDckMsSUFBSSxJQUFJLENBQUMsTUFBTSxHQUFHLE9BQU8sQ0FBQyxNQUFNLElBQUksVUFBVTtBQUM5QyxJQUFJLElBQUksQ0FBQyxNQUFNLEdBQUcsY0FBYyxJQUFJLGFBQWE7QUFDakQsSUFBSSxJQUFJLENBQUMsT0FBTyxHQUFHLE9BQU87QUFDMUIsSUFBSSxJQUFJLENBQUMsS0FBSyxHQUFHLE9BQU8sQ0FBQyxLQUFLO0FBQzlCOztBQUVBLEVBQUUsR0FBRyxDQUFDLEdBQUcsSUFBSSxFQUFFO0FBQ2YsSUFBSSxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsSUFBSSxDQUFDO0FBQzlDOztBQUVBLEVBQUUsSUFBSSxDQUFDLEdBQUcsSUFBSSxFQUFFO0FBQ2hCLElBQUksT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFLElBQUksQ0FBQztBQUMvQzs7QUFFQSxFQUFFLEtBQUssQ0FBQyxHQUFHLElBQUksRUFBRTtBQUNqQixJQUFJLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLEVBQUUsQ0FBQztBQUMxQzs7QUFFQSxFQUFFLFNBQVMsQ0FBQyxHQUFHLElBQUksRUFBRTtBQUNyQixJQUFJLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLHNCQUFzQixFQUFFLElBQUksQ0FBQztBQUNuRTs7QUFFQSxFQUFFLE9BQU8sQ0FBQyxJQUFJLEVBQUUsR0FBRyxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUU7QUFDeEMsSUFBSSxJQUFJLFNBQVMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsT0FBTyxJQUFJO0FBQzdDLElBQUksSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN6RSxJQUFJLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUM7QUFDakM7O0FBRUEsRUFBRSxNQUFNLENBQUMsVUFBVSxFQUFFO0FBQ3JCLElBQUksT0FBTyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFO0FBQ25DLE1BQU0sR0FBRyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQyxFQUFFO0FBQ3BELE1BQU0sR0FBRyxJQUFJLENBQUMsT0FBTztBQUNyQixLQUFLLENBQUM7QUFDTjs7QUFFQSxFQUFFLEtBQUssQ0FBQyxPQUFPLEVBQUU7QUFDakIsSUFBSSxPQUFPLEdBQUcsT0FBTyxJQUFJLElBQUksQ0FBQyxPQUFPO0FBQ3JDLElBQUksT0FBTyxDQUFDLE1BQU0sR0FBRyxPQUFPLENBQUMsTUFBTSxJQUFJLElBQUksQ0FBQyxNQUFNO0FBQ2xELElBQUksT0FBTyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQztBQUMzQztBQUNBOztBQUVBLG1CQUFlLElBQUksTUFBTSxFQUFFOztBQ3ZFM0IsTUFBTSxZQUFZLENBQUM7QUFDbkIsRUFBRSxXQUFXLEdBQUc7QUFDaEI7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQUksSUFBSSxDQUFDLFNBQVMsR0FBRyxFQUFFO0FBQ3ZCOztBQUVBLEVBQUUsRUFBRSxDQUFDLE1BQU0sRUFBRSxRQUFRLEVBQUU7QUFDdkIsSUFBSSxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssS0FBSztBQUN6QyxNQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLEdBQUcsSUFBSSxHQUFHLEVBQUU7QUFDbkUsTUFBTSxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDO0FBQ25FLE1BQU0sSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLFlBQVksR0FBRyxDQUFDLENBQUM7QUFDM0QsS0FBSyxDQUFDO0FBQ04sSUFBSSxPQUFPLElBQUk7QUFDZjs7QUFFQSxFQUFFLEdBQUcsQ0FBQyxLQUFLLEVBQUUsUUFBUSxFQUFFO0FBQ3ZCLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLEVBQUU7QUFDaEMsSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFO0FBQ25CLE1BQU0sT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQztBQUNsQyxNQUFNO0FBQ047O0FBRUEsSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUM7QUFDMUM7O0FBRUEsRUFBRSxJQUFJLENBQUMsS0FBSyxFQUFFLEdBQUcsSUFBSSxFQUFFO0FBQ3ZCLElBQUksSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxFQUFFO0FBQy9CLE1BQU0sTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDO0FBQ2hFLE1BQU0sTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLGFBQWEsQ0FBQyxLQUFLO0FBQ3BELFFBQVEsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLGFBQWEsRUFBRSxDQUFDLEVBQUUsRUFBRTtBQUNoRCxVQUFVLFFBQVEsQ0FBQyxHQUFHLElBQUksQ0FBQztBQUMzQjtBQUNBLE9BQU8sQ0FBQztBQUNSOztBQUVBLElBQUksSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxFQUFFO0FBQzdCLE1BQU0sTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDO0FBQzlELE1BQU0sTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLGFBQWEsQ0FBQyxLQUFLO0FBQ3BELFFBQVEsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLGFBQWEsRUFBRSxDQUFDLEVBQUUsRUFBRTtBQUNoRCxVQUFVLFFBQVEsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUMsS0FBSyxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUM7QUFDcEQ7QUFDQSxPQUFPLENBQUM7QUFDUjtBQUNBO0FBQ0E7O0FDaERBLE1BQU0sYUFBYSxTQUFTLFlBQVksQ0FBQztBQUN6QyxFQUFFLFdBQVcsQ0FBQyxJQUFJLEVBQUUsT0FBTyxHQUFHLEVBQUUsRUFBRSxFQUFFLENBQUMsYUFBYSxDQUFDLEVBQUUsU0FBUyxFQUFFLGFBQWEsRUFBRSxFQUFFO0FBQ2pGLElBQUksS0FBSyxFQUFFOztBQUVYLElBQUksSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLElBQUksRUFBRTtBQUMxQixJQUFJLElBQUksQ0FBQyxPQUFPLEdBQUcsT0FBTztBQUMxQixJQUFJLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLEtBQUssU0FBUyxFQUFFO0FBQ2pELE1BQU0sSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLEdBQUcsR0FBRztBQUNyQztBQUNBLElBQUksSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLG1CQUFtQixLQUFLLFNBQVMsRUFBRTtBQUN4RCxNQUFNLElBQUksQ0FBQyxPQUFPLENBQUMsbUJBQW1CLEdBQUcsSUFBSTtBQUM3QztBQUNBOztBQUVBLEVBQUUsYUFBYSxDQUFDLEVBQUUsRUFBRTtBQUNwQixJQUFJLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRTtBQUN6QyxNQUFNLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7QUFDOUI7QUFDQTs7QUFFQSxFQUFFLGdCQUFnQixDQUFDLEVBQUUsRUFBRTtBQUN2QixJQUFJLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7QUFDN0MsSUFBSSxJQUFJLEtBQUssR0FBRyxDQUFDLENBQUMsRUFBRTtBQUNwQixNQUFNLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDO0FBQ3RDO0FBQ0E7O0FBRUEsRUFBRSxXQUFXLENBQUMsR0FBRyxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsT0FBTyxHQUFHLEVBQUUsRUFBRTtBQUMxQyxJQUFJLE1BQU0sWUFBWTtBQUN0QixNQUFNLE9BQU8sQ0FBQyxZQUFZLEtBQUssU0FBUyxHQUFHLE9BQU8sQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZOztBQUUzRixJQUFJLE1BQU0sbUJBQW1CO0FBQzdCLE1BQU0sT0FBTyxDQUFDLG1CQUFtQixLQUFLO0FBQ3RDLFVBQVUsT0FBTyxDQUFDO0FBQ2xCLFVBQVUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxtQkFBbUI7O0FBRTFDLElBQUksSUFBSSxJQUFJO0FBQ1osSUFBSSxJQUFJLEdBQUcsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUU7QUFDL0IsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUM7QUFDM0IsS0FBSyxNQUFNO0FBQ1gsTUFBTSxJQUFJLEdBQUcsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDO0FBQ3RCLE1BQU0sSUFBSSxHQUFHLEVBQUU7QUFDZixRQUFRLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRTtBQUNoQyxVQUFVLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUM7QUFDM0IsU0FBUyxNQUFNLElBQUksUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLFlBQVksRUFBRTtBQUNsRCxVQUFVLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFDO0FBQy9DLFNBQVMsTUFBTTtBQUNmLFVBQVUsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUM7QUFDeEI7QUFDQTtBQUNBOztBQUVBLElBQUksTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDO0FBQzNDLElBQUksSUFBSSxDQUFDLE1BQU0sSUFBSSxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsSUFBSSxHQUFHLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFO0FBQ3pELE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDbkIsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQztBQUNsQixNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUM7QUFDbkM7QUFDQSxJQUFJLElBQUksTUFBTSxJQUFJLENBQUMsbUJBQW1CLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUUsT0FBTyxNQUFNOztBQUV2RSxJQUFJLE9BQU8sUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLEdBQUcsR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLFlBQVksQ0FBQztBQUM5RDs7QUFFQSxFQUFFLFdBQVcsQ0FBQyxHQUFHLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsT0FBTyxHQUFHLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxFQUFFO0FBQ2hFLElBQUksTUFBTSxZQUFZO0FBQ3RCLE1BQU0sT0FBTyxDQUFDLFlBQVksS0FBSyxTQUFTLEdBQUcsT0FBTyxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVk7O0FBRTNGLElBQUksSUFBSSxJQUFJLEdBQUcsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDO0FBQ3hCLElBQUksSUFBSSxHQUFHLEVBQUUsSUFBSSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsWUFBWSxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLEdBQUcsR0FBRyxDQUFDOztBQUU3RSxJQUFJLElBQUksR0FBRyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRTtBQUMvQixNQUFNLElBQUksR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQztBQUMzQixNQUFNLEtBQUssR0FBRyxFQUFFO0FBQ2hCLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDbEI7O0FBRUEsSUFBSSxJQUFJLENBQUMsYUFBYSxDQUFDLEVBQUUsQ0FBQzs7QUFFMUIsSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDOztBQUVuQyxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEtBQUssQ0FBQztBQUNoRTs7QUFFQSxFQUFFLFlBQVksQ0FBQyxHQUFHLEVBQUUsRUFBRSxFQUFFLFNBQVMsRUFBRSxPQUFPLEdBQUcsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLEVBQUU7QUFDaEU7QUFDQSxJQUFJLEtBQUssTUFBTSxDQUFDLElBQUksU0FBUyxFQUFFO0FBQy9CLE1BQU0sSUFBSSxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDL0QsUUFBUSxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQztBQUNwRTtBQUNBLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxTQUFTLENBQUM7QUFDL0Q7O0FBRUEsRUFBRSxpQkFBaUI7QUFDbkIsSUFBSSxHQUFHO0FBQ1AsSUFBSSxFQUFFO0FBQ04sSUFBSSxTQUFTO0FBQ2IsSUFBSSxJQUFJO0FBQ1IsSUFBSSxTQUFTO0FBQ2IsSUFBSSxPQUFPLEdBQUcsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUU7QUFDaEQsSUFBSTtBQUNKLElBQUksSUFBSSxJQUFJLEdBQUcsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDO0FBQ3hCLElBQUksSUFBSSxHQUFHLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFO0FBQy9CLE1BQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDO0FBQzNCLE1BQU0sSUFBSSxHQUFHLFNBQVM7QUFDdEIsTUFBTSxTQUFTLEdBQUcsRUFBRTtBQUNwQixNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDO0FBQ2xCOztBQUVBLElBQUksSUFBSSxDQUFDLGFBQWEsQ0FBQyxFQUFFLENBQUM7O0FBRTFCLElBQUksSUFBSSxJQUFJLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRTs7QUFFN0MsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxTQUFTLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7O0FBRTdFLElBQUksSUFBSSxJQUFJLEVBQUU7QUFDZCxNQUFNLFVBQVUsQ0FBQyxJQUFJLEVBQUUsU0FBUyxFQUFFLFNBQVMsQ0FBQztBQUM1QyxLQUFLLE1BQU07QUFDWCxNQUFNLElBQUksR0FBRyxFQUFFLEdBQUcsSUFBSSxFQUFFLEdBQUcsU0FBUyxFQUFFO0FBQ3RDOztBQUVBLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQzs7QUFFbEMsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLFNBQVMsQ0FBQztBQUMvRDs7QUFFQSxFQUFFLG9CQUFvQixDQUFDLEdBQUcsRUFBRSxFQUFFLEVBQUU7QUFDaEMsSUFBSSxJQUFJLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLEVBQUU7QUFDekMsTUFBTSxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDO0FBQy9CO0FBQ0EsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxDQUFDOztBQUU3QixJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLEdBQUcsRUFBRSxFQUFFLENBQUM7QUFDakM7O0FBRUEsRUFBRSxpQkFBaUIsQ0FBQyxHQUFHLEVBQUUsRUFBRSxFQUFFO0FBQzdCLElBQUksT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsS0FBSyxTQUFTO0FBQ2xEOztBQUVBLEVBQUUsaUJBQWlCLENBQUMsR0FBRyxFQUFFLEVBQUUsRUFBRTtBQUM3QixJQUFJLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUztBQUN4QyxJQUFJLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDO0FBQ3BDOztBQUVBLEVBQUUsaUJBQWlCLENBQUMsR0FBRyxFQUFFO0FBQ3pCLElBQUksT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQztBQUN6Qjs7QUFFQSxFQUFFLDJCQUEyQixDQUFDLEdBQUcsRUFBRTtBQUNuQyxJQUFJLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLENBQUM7QUFDNUMsSUFBSSxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUU7QUFDL0MsSUFBSSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7QUFDdEU7O0FBRUEsRUFBRSxNQUFNLEdBQUc7QUFDWCxJQUFJLE9BQU8sSUFBSSxDQUFDLElBQUk7QUFDcEI7QUFDQTs7QUMvSkEsc0JBQWU7QUFDZixFQUFFLFVBQVUsRUFBRSxFQUFFOztBQUVoQixFQUFFLGdCQUFnQixDQUFDLE1BQU0sRUFBRTtBQUMzQixJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLE1BQU07QUFDekMsR0FBRzs7QUFFSCxFQUFFLE1BQU0sQ0FBQyxVQUFVLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsVUFBVSxFQUFFO0FBQ3RELElBQUksVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDLFNBQVMsS0FBSztBQUN0QyxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxVQUFVLENBQUMsSUFBSSxLQUFLO0FBQzNGLEtBQUssQ0FBQzs7QUFFTixJQUFJLE9BQU8sS0FBSztBQUNoQixHQUFHO0FBQ0gsQ0FBQzs7QUNURCxNQUFNLGdCQUFnQixHQUFHLEVBQUU7O0FBRTNCLE1BQU0sVUFBVSxTQUFTLFlBQVksQ0FBQztBQUN0QyxFQUFFLFdBQVcsQ0FBQyxRQUFRLEVBQUUsT0FBTyxHQUFHLEVBQUUsRUFBRTtBQUN0QyxJQUFJLEtBQUssRUFBRTs7QUFFWCxJQUFJQSxJQUFTO0FBQ2IsTUFBTTtBQUNOLFFBQVEsZUFBZTtBQUN2QixRQUFRLGVBQWU7QUFDdkIsUUFBUSxnQkFBZ0I7QUFDeEIsUUFBUSxjQUFjO0FBQ3RCLFFBQVEsa0JBQWtCO0FBQzFCLFFBQVEsWUFBWTtBQUNwQixRQUFRLE9BQU87QUFDZixPQUFPO0FBQ1AsTUFBTSxRQUFRO0FBQ2QsTUFBTSxJQUFJO0FBQ1YsS0FBSzs7QUFFTCxJQUFJLElBQUksQ0FBQyxPQUFPLEdBQUcsT0FBTztBQUMxQixJQUFJLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLEtBQUssU0FBUyxFQUFFO0FBQ2pELE1BQU0sSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLEdBQUcsR0FBRztBQUNyQzs7QUFFQSxJQUFJLElBQUksQ0FBQyxNQUFNLEdBQUcsVUFBVSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUM7QUFDakQ7O0FBRUEsRUFBRSxjQUFjLENBQUMsR0FBRyxFQUFFO0FBQ3RCLElBQUksSUFBSSxHQUFHLEVBQUUsSUFBSSxDQUFDLFFBQVEsR0FBRyxHQUFHO0FBQ2hDOztBQUVBLEVBQUUsTUFBTSxDQUFDLEdBQUcsRUFBRSxPQUFPLEdBQUcsRUFBRSxhQUFhLEVBQUUsRUFBRSxFQUFFLEVBQUU7QUFDL0MsSUFBSSxJQUFJLEdBQUcsS0FBSyxTQUFTLElBQUksR0FBRyxLQUFLLElBQUksRUFBRTtBQUMzQyxNQUFNLE9BQU8sS0FBSztBQUNsQjs7QUFFQSxJQUFJLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLE9BQU8sQ0FBQztBQUMvQyxJQUFJLE9BQU8sUUFBUSxFQUFFLEdBQUcsS0FBSyxTQUFTO0FBQ3RDOztBQUVBLEVBQUUsY0FBYyxDQUFDLEdBQUcsRUFBRSxPQUFPLEVBQUU7QUFDL0IsSUFBSSxJQUFJLFdBQVc7QUFDbkIsTUFBTSxPQUFPLENBQUMsV0FBVyxLQUFLLFNBQVMsR0FBRyxPQUFPLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVztBQUN4RixJQUFJLElBQUksV0FBVyxLQUFLLFNBQVMsRUFBRSxXQUFXLEdBQUcsR0FBRzs7QUFFcEQsSUFBSSxNQUFNLFlBQVk7QUFDdEIsTUFBTSxPQUFPLENBQUMsWUFBWSxLQUFLLFNBQVMsR0FBRyxPQUFPLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWTs7QUFFM0YsSUFBSSxJQUFJLFVBQVUsR0FBRyxPQUFPLENBQUMsRUFBRSxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxJQUFJLEVBQUU7QUFDL0QsSUFBSSxNQUFNLG9CQUFvQixHQUFHLFdBQVcsSUFBSSxHQUFHLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUM3RSxJQUFJLE1BQU0sb0JBQW9CO0FBQzlCLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLHVCQUF1QjtBQUMzQyxNQUFNLENBQUMsT0FBTyxDQUFDLFlBQVk7QUFDM0IsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsc0JBQXNCO0FBQzFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVztBQUMxQixNQUFNLENBQUMsbUJBQW1CLENBQUMsR0FBRyxFQUFFLFdBQVcsRUFBRSxZQUFZLENBQUM7QUFDMUQsSUFBSSxJQUFJLG9CQUFvQixJQUFJLENBQUMsb0JBQW9CLEVBQUU7QUFDdkQsTUFBTSxNQUFNLENBQUMsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsYUFBYSxDQUFDO0FBQzFELE1BQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7QUFDN0IsUUFBUSxPQUFPO0FBQ2YsVUFBVSxHQUFHO0FBQ2IsVUFBVSxVQUFVLEVBQUUsUUFBUSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLEdBQUcsVUFBVTtBQUN0RSxTQUFTO0FBQ1Q7QUFDQSxNQUFNLE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDO0FBQzFDLE1BQU07QUFDTixRQUFRLFdBQVcsS0FBSyxZQUFZO0FBQ3BDLFNBQVMsV0FBVyxLQUFLLFlBQVksSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQy9FO0FBQ0EsUUFBUSxVQUFVLEdBQUcsS0FBSyxDQUFDLEtBQUssRUFBRTtBQUNsQyxNQUFNLEdBQUcsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQztBQUNwQzs7QUFFQSxJQUFJLE9BQU87QUFDWCxNQUFNLEdBQUc7QUFDVCxNQUFNLFVBQVUsRUFBRSxRQUFRLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsR0FBRyxVQUFVO0FBQ2xFLEtBQUs7QUFDTDs7QUFFQSxFQUFFLFNBQVMsQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRTtBQUNwQyxJQUFJLElBQUksT0FBTyxPQUFPLEtBQUssUUFBUSxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsZ0NBQWdDLEVBQUU7QUFDdEY7QUFDQSxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLGdDQUFnQyxDQUFDLFNBQVMsQ0FBQztBQUN4RTtBQUNBLElBQUksSUFBSSxPQUFPLE9BQU8sS0FBSyxRQUFRLEVBQUUsT0FBTyxHQUFHLEVBQUUsR0FBRyxPQUFPLEVBQUU7QUFDN0QsSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFLE9BQU8sR0FBRyxFQUFFOztBQUU5QjtBQUNBLElBQUksSUFBSSxJQUFJLEtBQUssU0FBUyxJQUFJLElBQUksS0FBSyxJQUFJLHVCQUF1QixPQUFPLEVBQUU7QUFDM0UsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7O0FBRW5ELElBQUksTUFBTSxhQUFhO0FBQ3ZCLE1BQU0sT0FBTyxDQUFDLGFBQWEsS0FBSyxTQUFTLEdBQUcsT0FBTyxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLGFBQWE7O0FBRTlGO0FBQ0EsSUFBSSxNQUFNLFlBQVk7QUFDdEIsTUFBTSxPQUFPLENBQUMsWUFBWSxLQUFLLFNBQVMsR0FBRyxPQUFPLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWTs7QUFFM0Y7QUFDQSxJQUFJLE1BQU0sRUFBRSxHQUFHLEVBQUUsVUFBVSxFQUFFLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUM7QUFDbkYsSUFBSSxNQUFNLFNBQVMsR0FBRyxVQUFVLENBQUMsVUFBVSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7O0FBRXZEO0FBQ0EsSUFBSSxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsR0FBRyxJQUFJLElBQUksQ0FBQyxRQUFRO0FBQzVDLElBQUksTUFBTSx1QkFBdUI7QUFDakMsTUFBTSxPQUFPLENBQUMsdUJBQXVCLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyx1QkFBdUI7QUFDN0UsSUFBSSxJQUFJLEdBQUcsRUFBRSxXQUFXLEVBQUUsS0FBSyxRQUFRLEVBQUU7QUFDekMsTUFBTSxJQUFJLHVCQUF1QixFQUFFO0FBQ25DLFFBQVEsTUFBTSxXQUFXLEdBQUcsT0FBTyxDQUFDLFdBQVcsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVc7QUFDM0UsUUFBUSxJQUFJLGFBQWEsRUFBRTtBQUMzQixVQUFVLE9BQU87QUFDakIsWUFBWSxHQUFHLEVBQUUsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxFQUFFLFdBQVcsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0FBQ25ELFlBQVksT0FBTyxFQUFFLEdBQUc7QUFDeEIsWUFBWSxZQUFZLEVBQUUsR0FBRztBQUM3QixZQUFZLE9BQU8sRUFBRSxHQUFHO0FBQ3hCLFlBQVksTUFBTSxFQUFFLFNBQVM7QUFDN0IsWUFBWSxVQUFVLEVBQUUsSUFBSSxDQUFDLG9CQUFvQixDQUFDLE9BQU8sQ0FBQztBQUMxRCxXQUFXO0FBQ1g7QUFDQSxRQUFRLE9BQU8sQ0FBQyxFQUFFLFNBQVMsQ0FBQyxFQUFFLFdBQVcsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0FBQ2pEOztBQUVBLE1BQU0sSUFBSSxhQUFhLEVBQUU7QUFDekIsUUFBUSxPQUFPO0FBQ2YsVUFBVSxHQUFHLEVBQUUsR0FBRztBQUNsQixVQUFVLE9BQU8sRUFBRSxHQUFHO0FBQ3RCLFVBQVUsWUFBWSxFQUFFLEdBQUc7QUFDM0IsVUFBVSxPQUFPLEVBQUUsR0FBRztBQUN0QixVQUFVLE1BQU0sRUFBRSxTQUFTO0FBQzNCLFVBQVUsVUFBVSxFQUFFLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxPQUFPLENBQUM7QUFDeEQsU0FBUztBQUNUO0FBQ0EsTUFBTSxPQUFPLEdBQUc7QUFDaEI7O0FBRUE7QUFDQSxJQUFJLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQztBQUNoRCxJQUFJLElBQUksR0FBRyxHQUFHLFFBQVEsRUFBRSxHQUFHO0FBQzNCLElBQUksTUFBTSxVQUFVLEdBQUcsUUFBUSxFQUFFLE9BQU8sSUFBSSxHQUFHO0FBQy9DLElBQUksTUFBTSxlQUFlLEdBQUcsUUFBUSxFQUFFLFlBQVksSUFBSSxHQUFHOztBQUV6RCxJQUFJLE1BQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUM7QUFDeEQsSUFBSSxNQUFNLFFBQVEsR0FBRyxDQUFDLGlCQUFpQixFQUFFLG1CQUFtQixFQUFFLGlCQUFpQixDQUFDO0FBQ2hGLElBQUksTUFBTSxVQUFVO0FBQ3BCLE1BQU0sT0FBTyxDQUFDLFVBQVUsS0FBSyxTQUFTLEdBQUcsT0FBTyxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVU7O0FBRXJGO0FBQ0EsSUFBSSxNQUFNLDBCQUEwQixHQUFHLENBQUMsSUFBSSxDQUFDLFVBQVUsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLGNBQWM7QUFDekYsSUFBSSxNQUFNLGNBQWMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxPQUFPLEdBQUcsS0FBSyxTQUFTLElBQUksT0FBTyxHQUFHLEtBQUssUUFBUTtBQUNoRyxJQUFJO0FBQ0osTUFBTSwwQkFBMEI7QUFDaEMsTUFBTSxHQUFHO0FBQ1QsTUFBTSxjQUFjO0FBQ3BCLE1BQU0sUUFBUSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDO0FBQ25DLE1BQU0sRUFBRSxRQUFRLENBQUMsVUFBVSxDQUFDLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUM7QUFDbEQsTUFBTTtBQUNOLE1BQU0sSUFBSSxDQUFDLE9BQU8sQ0FBQyxhQUFhLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLGFBQWEsRUFBRTtBQUNqRSxRQUFRLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLHFCQUFxQixFQUFFO0FBQ2pELFVBQVUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsaUVBQWlFLENBQUM7QUFDN0Y7QUFDQSxRQUFRLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUM7QUFDL0IsWUFBWSxJQUFJLENBQUMsT0FBTyxDQUFDLHFCQUFxQixDQUFDLFVBQVUsRUFBRSxHQUFHLEVBQUUsRUFBRSxHQUFHLE9BQU8sRUFBRSxFQUFFLEVBQUUsVUFBVSxFQUFFO0FBQzlGLFlBQVksQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLHdDQUF3QyxDQUFDO0FBQ25GLFFBQVEsSUFBSSxhQUFhLEVBQUU7QUFDM0IsVUFBVSxRQUFRLENBQUMsR0FBRyxHQUFHLENBQUM7QUFDMUIsVUFBVSxRQUFRLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxPQUFPLENBQUM7QUFDbEUsVUFBVSxPQUFPLFFBQVE7QUFDekI7QUFDQSxRQUFRLE9BQU8sQ0FBQztBQUNoQjs7QUFFQTtBQUNBO0FBQ0EsTUFBTSxJQUFJLFlBQVksRUFBRTtBQUN4QixRQUFRLE1BQU0sY0FBYyxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDO0FBQ2pELFFBQVEsTUFBTSxJQUFJLEdBQUcsY0FBYyxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUM7O0FBRTlDO0FBQ0EsUUFBUSxNQUFNLFdBQVcsR0FBRyxjQUFjLEdBQUcsZUFBZSxHQUFHLFVBQVU7QUFDekUsUUFBUSxLQUFLLE1BQU0sQ0FBQyxJQUFJLEdBQUcsRUFBRTtBQUM3QixVQUFVLElBQUksTUFBTSxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRTtBQUM1RCxZQUFZLE1BQU0sT0FBTyxHQUFHLENBQUMsRUFBRSxXQUFXLENBQUMsRUFBRSxZQUFZLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztBQUMvRCxZQUFZLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sRUFBRTtBQUM5QyxjQUFjLEdBQUcsT0FBTztBQUN4QixjQUFjLEdBQUcsRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxVQUFVLEVBQUU7QUFDdEQsYUFBYSxDQUFDO0FBQ2QsWUFBWSxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN0RDtBQUNBO0FBQ0EsUUFBUSxHQUFHLEdBQUcsSUFBSTtBQUNsQjtBQUNBLEtBQUssTUFBTSxJQUFJLDBCQUEwQixJQUFJLFFBQVEsQ0FBQyxVQUFVLENBQUMsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFO0FBQ3pGO0FBQ0EsTUFBTSxHQUFHLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUM7QUFDaEMsTUFBTSxJQUFJLEdBQUcsRUFBRSxHQUFHLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLE9BQU8sQ0FBQztBQUN4RSxLQUFLLE1BQU07QUFDWDtBQUNBLE1BQU0sSUFBSSxXQUFXLEdBQUcsS0FBSztBQUM3QixNQUFNLElBQUksT0FBTyxHQUFHLEtBQUs7O0FBRXpCLE1BQU0sTUFBTSxtQkFBbUIsR0FBRyxPQUFPLENBQUMsS0FBSyxLQUFLLFNBQVMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDO0FBQ3pGLE1BQU0sTUFBTSxlQUFlLEdBQUcsVUFBVSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUM7QUFDakUsTUFBTSxNQUFNLGtCQUFrQixHQUFHO0FBQ2pDLFVBQVUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFFLE9BQU8sQ0FBQyxLQUFLLEVBQUUsT0FBTztBQUNuRSxVQUFVLEVBQUU7QUFDWixNQUFNLE1BQU0saUNBQWlDO0FBQzdDLFFBQVEsT0FBTyxDQUFDLE9BQU8sSUFBSTtBQUMzQixZQUFZLElBQUksQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBRSxPQUFPLENBQUMsS0FBSyxFQUFFLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRTtBQUNoRixZQUFZLEVBQUU7QUFDZCxNQUFNLE1BQU0scUJBQXFCLEdBQUcsbUJBQW1CLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxJQUFJLE9BQU8sQ0FBQyxLQUFLLEtBQUssQ0FBQztBQUNsRyxNQUFNLE1BQU0sWUFBWTtBQUN4QixRQUFRLENBQUMscUJBQXFCLElBQUksT0FBTyxDQUFDLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQzVGLFFBQVEsT0FBTyxDQUFDLENBQUMsWUFBWSxFQUFFLGtCQUFrQixDQUFDLENBQUMsQ0FBQztBQUNwRCxRQUFRLE9BQU8sQ0FBQyxDQUFDLFlBQVksRUFBRSxpQ0FBaUMsQ0FBQyxDQUFDLENBQUM7QUFDbkUsUUFBUSxPQUFPLENBQUMsWUFBWTs7QUFFNUI7QUFDQSxNQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxJQUFJLGVBQWUsRUFBRTtBQUN2RCxRQUFRLFdBQVcsR0FBRyxJQUFJO0FBQzFCLFFBQVEsR0FBRyxHQUFHLFlBQVk7QUFDMUI7QUFDQSxNQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxFQUFFO0FBQ3BDLFFBQVEsT0FBTyxHQUFHLElBQUk7QUFDdEIsUUFBUSxHQUFHLEdBQUcsR0FBRztBQUNqQjs7QUFFQSxNQUFNLE1BQU0sOEJBQThCO0FBQzFDLFFBQVEsT0FBTyxDQUFDLDhCQUE4QixJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsOEJBQThCO0FBQzdGLE1BQU0sTUFBTSxhQUFhLEdBQUcsOEJBQThCLElBQUksT0FBTyxHQUFHLFNBQVMsR0FBRyxHQUFHOztBQUV2RjtBQUNBLE1BQU0sTUFBTSxhQUFhLEdBQUcsZUFBZSxJQUFJLFlBQVksS0FBSyxHQUFHLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxhQUFhO0FBQ2pHLE1BQU0sSUFBSSxPQUFPLElBQUksV0FBVyxJQUFJLGFBQWEsRUFBRTtBQUNuRCxRQUFRLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRztBQUN2QixVQUFVLGFBQWEsR0FBRyxXQUFXLEdBQUcsWUFBWTtBQUNwRCxVQUFVLEdBQUc7QUFDYixVQUFVLFNBQVM7QUFDbkIsVUFBVSxHQUFHO0FBQ2IsVUFBVSxhQUFhLEdBQUcsWUFBWSxHQUFHLEdBQUc7QUFDNUMsU0FBUztBQUNULFFBQVEsSUFBSSxZQUFZLEVBQUU7QUFDMUIsVUFBVSxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxFQUFFLEdBQUcsT0FBTyxFQUFFLFlBQVksRUFBRSxLQUFLLEVBQUUsQ0FBQztBQUMzRSxVQUFVLElBQUksRUFBRSxJQUFJLEVBQUUsQ0FBQyxHQUFHO0FBQzFCLFlBQVksSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJO0FBQzVCLGNBQWMsaUxBQWlMO0FBQy9MLGFBQWE7QUFDYjs7QUFFQSxRQUFRLElBQUksSUFBSSxHQUFHLEVBQUU7QUFDckIsUUFBUSxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLGdCQUFnQjtBQUNoRSxVQUFVLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVztBQUNsQyxVQUFVLE9BQU8sQ0FBQyxHQUFHLElBQUksSUFBSSxDQUFDLFFBQVE7QUFDdEMsU0FBUztBQUNULFFBQVEsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLGFBQWEsS0FBSyxVQUFVLElBQUksWUFBWSxJQUFJLFlBQVksQ0FBQyxDQUFDLENBQUMsRUFBRTtBQUMxRixVQUFVLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxZQUFZLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO0FBQ3hELFlBQVksSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDdEM7QUFDQSxTQUFTLE1BQU0sSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLGFBQWEsS0FBSyxLQUFLLEVBQUU7QUFDekQsVUFBVSxJQUFJLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsR0FBRyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUM7QUFDcEYsU0FBUyxNQUFNO0FBQ2YsVUFBVSxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQztBQUNqRDs7QUFFQSxRQUFRLE1BQU0sSUFBSSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxvQkFBb0IsS0FBSztBQUNyRCxVQUFVLE1BQU0saUJBQWlCO0FBQ2pDLFlBQVksZUFBZSxJQUFJLG9CQUFvQixLQUFLLEdBQUcsR0FBRyxvQkFBb0IsR0FBRyxhQUFhO0FBQ2xHLFVBQVUsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLGlCQUFpQixFQUFFO0FBQzlDLFlBQVksSUFBSSxDQUFDLE9BQU8sQ0FBQyxpQkFBaUI7QUFDMUMsY0FBYyxDQUFDO0FBQ2YsY0FBYyxTQUFTO0FBQ3ZCLGNBQWMsQ0FBQztBQUNmLGNBQWMsaUJBQWlCO0FBQy9CLGNBQWMsYUFBYTtBQUMzQixjQUFjLE9BQU87QUFDckIsYUFBYTtBQUNiLFdBQVcsTUFBTSxJQUFJLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxXQUFXLEVBQUU7QUFDekQsWUFBWSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsV0FBVztBQUM3QyxjQUFjLENBQUM7QUFDZixjQUFjLFNBQVM7QUFDdkIsY0FBYyxDQUFDO0FBQ2YsY0FBYyxpQkFBaUI7QUFDL0IsY0FBYyxhQUFhO0FBQzNCLGNBQWMsT0FBTztBQUNyQixhQUFhO0FBQ2I7QUFDQSxVQUFVLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUMsRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLEdBQUcsQ0FBQztBQUN2RCxTQUFTOztBQUVULFFBQVEsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRTtBQUN0QyxVQUFVLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsSUFBSSxtQkFBbUIsRUFBRTtBQUN0RSxZQUFZLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxRQUFRLEtBQUs7QUFDdkMsY0FBYyxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDO0FBQ2pGLGNBQWM7QUFDZCxnQkFBZ0IscUJBQXFCO0FBQ3JDLGdCQUFnQixPQUFPLENBQUMsQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDMUUsZ0JBQWdCLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUc7QUFDMUUsZ0JBQWdCO0FBQ2hCLGdCQUFnQixRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUNwRTtBQUNBLGNBQWMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sS0FBSztBQUMzQyxnQkFBZ0IsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLEVBQUUsR0FBRyxHQUFHLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQyxZQUFZLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLFlBQVksQ0FBQztBQUNoRyxlQUFlLENBQUM7QUFDaEIsYUFBYSxDQUFDO0FBQ2QsV0FBVyxNQUFNO0FBQ2pCLFlBQVksSUFBSSxDQUFDLElBQUksRUFBRSxHQUFHLEVBQUUsWUFBWSxDQUFDO0FBQ3pDO0FBQ0E7QUFDQTs7QUFFQTtBQUNBLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsT0FBTyxDQUFDOztBQUV6RTtBQUNBLE1BQU0sSUFBSSxPQUFPLElBQUksR0FBRyxLQUFLLEdBQUcsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLDJCQUEyQjtBQUM1RSxRQUFRLEdBQUcsR0FBRyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQzs7QUFFbkM7QUFDQSxNQUFNLElBQUksQ0FBQyxPQUFPLElBQUksV0FBVyxLQUFLLElBQUksQ0FBQyxPQUFPLENBQUMsc0JBQXNCLEVBQUU7QUFDM0UsUUFBUSxHQUFHLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxzQkFBc0I7QUFDakQsVUFBVSxJQUFJLENBQUMsT0FBTyxDQUFDLDJCQUEyQixHQUFHLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRztBQUNoRixVQUFVLFdBQVcsR0FBRyxHQUFHLEdBQUcsU0FBUztBQUN2QyxTQUFTO0FBQ1Q7QUFDQTs7QUFFQTtBQUNBLElBQUksSUFBSSxhQUFhLEVBQUU7QUFDdkIsTUFBTSxRQUFRLENBQUMsR0FBRyxHQUFHLEdBQUc7QUFDeEIsTUFBTSxRQUFRLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxPQUFPLENBQUM7QUFDOUQsTUFBTSxPQUFPLFFBQVE7QUFDckI7QUFDQSxJQUFJLE9BQU8sR0FBRztBQUNkOztBQUVBLEVBQUUsaUJBQWlCLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRTtBQUMxRCxJQUFJLElBQUksSUFBSSxDQUFDLFVBQVUsRUFBRSxLQUFLLEVBQUU7QUFDaEMsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLO0FBQ2pDLFFBQVEsR0FBRztBQUNYLFFBQVEsRUFBRSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLGdCQUFnQixFQUFFLEdBQUcsT0FBTyxFQUFFO0FBQ3RFLFFBQVEsT0FBTyxDQUFDLEdBQUcsSUFBSSxJQUFJLENBQUMsUUFBUSxJQUFJLFFBQVEsQ0FBQyxPQUFPO0FBQ3hELFFBQVEsUUFBUSxDQUFDLE1BQU07QUFDdkIsUUFBUSxRQUFRLENBQUMsT0FBTztBQUN4QixRQUFRLEVBQUUsUUFBUSxFQUFFO0FBQ3BCLE9BQU87QUFDUCxLQUFLLE1BQU0sSUFBSSxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsRUFBRTtBQUMzQztBQUNBLE1BQU0sSUFBSSxPQUFPLENBQUMsYUFBYTtBQUMvQixRQUFRLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDO0FBQy9CLFVBQVUsR0FBRyxPQUFPO0FBQ3BCLFVBQVUsR0FBRyxFQUFFLGFBQWEsRUFBRSxFQUFFLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxhQUFhLEVBQUUsR0FBRyxPQUFPLENBQUMsYUFBYSxFQUFFLEVBQUU7QUFDM0YsU0FBUyxDQUFDO0FBQ1YsTUFBTSxNQUFNLGVBQWU7QUFDM0IsUUFBUSxRQUFRLENBQUMsR0FBRyxDQUFDO0FBQ3JCLFNBQVMsT0FBTyxFQUFFLGFBQWEsRUFBRSxlQUFlLEtBQUs7QUFDckQsWUFBWSxPQUFPLENBQUMsYUFBYSxDQUFDO0FBQ2xDLFlBQVksSUFBSSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsZUFBZSxDQUFDO0FBQ3ZELE1BQU0sSUFBSSxPQUFPO0FBQ2pCLE1BQU0sSUFBSSxlQUFlLEVBQUU7QUFDM0IsUUFBUSxNQUFNLEVBQUUsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsYUFBYSxDQUFDO0FBQzdEO0FBQ0EsUUFBUSxPQUFPLEdBQUcsRUFBRSxJQUFJLEVBQUUsQ0FBQyxNQUFNO0FBQ2pDOztBQUVBO0FBQ0EsTUFBTSxJQUFJLElBQUksR0FBRyxPQUFPLENBQUMsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsR0FBRyxPQUFPLENBQUMsT0FBTyxHQUFHLE9BQU87QUFDMUYsTUFBTSxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLGdCQUFnQjtBQUNyRCxRQUFRLElBQUksR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsZ0JBQWdCLEVBQUUsR0FBRyxJQUFJLEVBQUU7QUFDMUUsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxXQUFXO0FBQ3pDLFFBQVEsR0FBRztBQUNYLFFBQVEsSUFBSTtBQUNaLFFBQVEsT0FBTyxDQUFDLEdBQUcsSUFBSSxJQUFJLENBQUMsUUFBUSxJQUFJLFFBQVEsQ0FBQyxPQUFPO0FBQ3hELFFBQVEsT0FBTztBQUNmLE9BQU87O0FBRVA7QUFDQSxNQUFNLElBQUksZUFBZSxFQUFFO0FBQzNCLFFBQVEsTUFBTSxFQUFFLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLGFBQWEsQ0FBQztBQUM3RDtBQUNBLFFBQVEsTUFBTSxPQUFPLEdBQUcsRUFBRSxJQUFJLEVBQUUsQ0FBQyxNQUFNO0FBQ3ZDLFFBQVEsSUFBSSxPQUFPLEdBQUcsT0FBTyxFQUFFLE9BQU8sQ0FBQyxJQUFJLEdBQUcsS0FBSztBQUNuRDtBQUNBLE1BQU0sSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLElBQUksUUFBUSxJQUFJLFFBQVEsQ0FBQyxHQUFHLEVBQUUsT0FBTyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsUUFBUSxJQUFJLFFBQVEsQ0FBQyxPQUFPO0FBQ25HLE1BQU0sSUFBSSxPQUFPLENBQUMsSUFBSSxLQUFLLEtBQUs7QUFDaEMsUUFBUSxHQUFHLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJO0FBQ3BDLFVBQVUsR0FBRztBQUNiLFVBQVUsQ0FBQyxHQUFHLElBQUksS0FBSztBQUN2QixZQUFZLElBQUksT0FBTyxHQUFHLENBQUMsQ0FBQyxLQUFLLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUU7QUFDOUQsY0FBYyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUk7QUFDOUIsZ0JBQWdCLENBQUMsMENBQTBDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN4RixlQUFlO0FBQ2YsY0FBYyxPQUFPLElBQUk7QUFDekI7QUFDQSxZQUFZLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLElBQUksRUFBRSxHQUFHLENBQUM7QUFDL0MsV0FBVztBQUNYLFVBQVUsT0FBTztBQUNqQixTQUFTOztBQUVULE1BQU0sSUFBSSxPQUFPLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxFQUFFO0FBQzFEOztBQUVBO0FBQ0EsSUFBSSxNQUFNLFdBQVcsR0FBRyxPQUFPLENBQUMsV0FBVyxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVztBQUN2RSxJQUFJLE1BQU0sa0JBQWtCLEdBQUcsUUFBUSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLEdBQUcsV0FBVzs7QUFFbEYsSUFBSTtBQUNKLE1BQU0sR0FBRyxLQUFLLFNBQVM7QUFDdkIsTUFBTSxHQUFHLEtBQUssSUFBSTtBQUNsQixNQUFNLGtCQUFrQixFQUFFLE1BQU07QUFDaEMsTUFBTSxPQUFPLENBQUMsa0JBQWtCLEtBQUs7QUFDckMsTUFBTTtBQUNOLE1BQU0sR0FBRyxHQUFHLGFBQWEsQ0FBQyxNQUFNO0FBQ2hDLFFBQVEsa0JBQWtCO0FBQzFCLFFBQVEsR0FBRztBQUNYLFFBQVEsR0FBRztBQUNYLFFBQVEsSUFBSSxDQUFDLE9BQU8sSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDO0FBQ3JDLFlBQVk7QUFDWixjQUFjLFlBQVksRUFBRSxFQUFFLEdBQUcsUUFBUSxFQUFFLFVBQVUsRUFBRSxJQUFJLENBQUMsb0JBQW9CLENBQUMsT0FBTyxDQUFDLEVBQUU7QUFDM0YsY0FBYyxHQUFHLE9BQU87QUFDeEI7QUFDQSxZQUFZLE9BQU87QUFDbkIsUUFBUSxJQUFJO0FBQ1osT0FBTztBQUNQOztBQUVBLElBQUksT0FBTyxHQUFHO0FBQ2Q7O0FBRUEsRUFBRSxPQUFPLENBQUMsSUFBSSxFQUFFLE9BQU8sR0FBRyxFQUFFLEVBQUU7QUFDOUIsSUFBSSxJQUFJLEtBQUs7QUFDYixJQUFJLElBQUksT0FBTyxDQUFDO0FBQ2hCLElBQUksSUFBSSxZQUFZLENBQUM7QUFDckIsSUFBSSxJQUFJLE9BQU87QUFDZixJQUFJLElBQUksTUFBTTs7QUFFZCxJQUFJLElBQUksUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQzs7QUFFckM7QUFDQSxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEtBQUs7QUFDeEIsTUFBTSxJQUFJLElBQUksQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLEVBQUU7QUFDckMsTUFBTSxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUM7QUFDdkQsTUFBTSxNQUFNLEdBQUcsR0FBRyxTQUFTLENBQUMsR0FBRztBQUMvQixNQUFNLE9BQU8sR0FBRyxHQUFHO0FBQ25CLE1BQU0sSUFBSSxVQUFVLEdBQUcsU0FBUyxDQUFDLFVBQVU7QUFDM0MsTUFBTSxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLFVBQVUsR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDOztBQUUxRixNQUFNLE1BQU0sbUJBQW1CLEdBQUcsT0FBTyxDQUFDLEtBQUssS0FBSyxTQUFTLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQztBQUN6RixNQUFNLE1BQU0scUJBQXFCLEdBQUcsbUJBQW1CLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxJQUFJLE9BQU8sQ0FBQyxLQUFLLEtBQUssQ0FBQztBQUNsRyxNQUFNLE1BQU0sb0JBQW9CO0FBQ2hDLFFBQVEsT0FBTyxDQUFDLE9BQU8sS0FBSyxTQUFTO0FBQ3JDLFNBQVMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxPQUFPLE9BQU8sQ0FBQyxPQUFPLEtBQUssUUFBUSxDQUFDO0FBQzFFLFFBQVEsT0FBTyxDQUFDLE9BQU8sS0FBSyxFQUFFOztBQUU5QixNQUFNLE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQztBQUM1QixVQUFVLE9BQU8sQ0FBQztBQUNsQixVQUFVLElBQUksQ0FBQyxhQUFhLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLEdBQUcsSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxXQUFXLENBQUM7O0FBRWxHLE1BQU0sVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsS0FBSztBQUNqQyxRQUFRLElBQUksSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsRUFBRTtBQUN2QyxRQUFRLE1BQU0sR0FBRyxFQUFFOztBQUVuQixRQUFRO0FBQ1IsVUFBVSxDQUFDLGdCQUFnQixDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDaEQsVUFBVSxJQUFJLENBQUMsS0FBSyxFQUFFLGtCQUFrQjtBQUN4QyxVQUFVLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxrQkFBa0IsQ0FBQyxNQUFNO0FBQ2hELFVBQVU7QUFDVixVQUFVLGdCQUFnQixDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJO0FBQ3RELFVBQVUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJO0FBQzFCLFlBQVksQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLGlCQUFpQixFQUFFLEtBQUssQ0FBQyxJQUFJO0FBQ3pELGNBQWMsSUFBSTtBQUNsQixhQUFhLENBQUMsbUNBQW1DLEVBQUUsTUFBTSxDQUFDLG9CQUFvQixDQUFDO0FBQy9FLFlBQVksME5BQTBOO0FBQ3RPLFdBQVc7QUFDWDs7QUFFQSxRQUFRLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLEtBQUs7QUFDaEMsVUFBVSxJQUFJLElBQUksQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLEVBQUU7QUFDekMsVUFBVSxPQUFPLEdBQUcsSUFBSTs7QUFFeEIsVUFBVSxNQUFNLFNBQVMsR0FBRyxDQUFDLEdBQUcsQ0FBQzs7QUFFakMsVUFBVSxJQUFJLElBQUksQ0FBQyxVQUFVLEVBQUUsYUFBYSxFQUFFO0FBQzlDLFlBQVksSUFBSSxDQUFDLFVBQVUsQ0FBQyxhQUFhLENBQUMsU0FBUyxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLE9BQU8sQ0FBQztBQUM1RSxXQUFXLE1BQU07QUFDakIsWUFBWSxJQUFJLFlBQVk7QUFDNUIsWUFBWSxJQUFJLG1CQUFtQjtBQUNuQyxjQUFjLFlBQVksR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLEtBQUssRUFBRSxPQUFPLENBQUM7QUFDeEYsWUFBWSxNQUFNLFVBQVUsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDO0FBQ3BFLFlBQVksTUFBTSxhQUFhLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsZUFBZSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0FBQ3pHO0FBQ0EsWUFBWSxJQUFJLG1CQUFtQixFQUFFO0FBQ3JDLGNBQWMsU0FBUyxDQUFDLElBQUksQ0FBQyxHQUFHLEdBQUcsWUFBWSxDQUFDO0FBQ2hELGNBQWMsSUFBSSxPQUFPLENBQUMsT0FBTyxJQUFJLFlBQVksQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxFQUFFO0FBQ2hGLGdCQUFnQixTQUFTLENBQUMsSUFBSTtBQUM5QixrQkFBa0IsR0FBRyxHQUFHLFlBQVksQ0FBQyxPQUFPLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsZUFBZSxDQUFDO0FBQ3pGLGlCQUFpQjtBQUNqQjtBQUNBLGNBQWMsSUFBSSxxQkFBcUIsRUFBRTtBQUN6QyxnQkFBZ0IsU0FBUyxDQUFDLElBQUksQ0FBQyxHQUFHLEdBQUcsVUFBVSxDQUFDO0FBQ2hEO0FBQ0E7O0FBRUE7QUFDQSxZQUFZLElBQUksb0JBQW9CLEVBQUU7QUFDdEMsY0FBYyxNQUFNLFVBQVUsR0FBRyxDQUFDLEVBQUUsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUMzRixjQUFjLFNBQVMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDOztBQUV4QztBQUNBLGNBQWMsSUFBSSxtQkFBbUIsRUFBRTtBQUN2QyxnQkFBZ0IsU0FBUyxDQUFDLElBQUksQ0FBQyxVQUFVLEdBQUcsWUFBWSxDQUFDO0FBQ3pELGdCQUFnQixJQUFJLE9BQU8sQ0FBQyxPQUFPLElBQUksWUFBWSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLEVBQUU7QUFDbEYsa0JBQWtCLFNBQVMsQ0FBQyxJQUFJO0FBQ2hDLG9CQUFvQixVQUFVLEdBQUcsWUFBWSxDQUFDLE9BQU8sQ0FBQyxhQUFhLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUM7QUFDbEcsbUJBQW1CO0FBQ25CO0FBQ0EsZ0JBQWdCLElBQUkscUJBQXFCLEVBQUU7QUFDM0Msa0JBQWtCLFNBQVMsQ0FBQyxJQUFJLENBQUMsVUFBVSxHQUFHLFVBQVUsQ0FBQztBQUN6RDtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBLFVBQVUsSUFBSSxXQUFXO0FBQ3pCO0FBQ0EsVUFBVSxRQUFRLFdBQVcsR0FBRyxTQUFTLENBQUMsR0FBRyxFQUFFLEdBQUc7QUFDbEQsWUFBWSxJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsRUFBRTtBQUM1QyxjQUFjLFlBQVksR0FBRyxXQUFXO0FBQ3hDLGNBQWMsS0FBSyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxXQUFXLEVBQUUsT0FBTyxDQUFDO0FBQ3RFO0FBQ0E7QUFDQSxTQUFTLENBQUM7QUFDVixPQUFPLENBQUM7QUFDUixLQUFLLENBQUM7O0FBRU4sSUFBSSxPQUFPLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUU7QUFDakU7O0FBRUEsRUFBRSxhQUFhLENBQUMsR0FBRyxFQUFFO0FBQ3JCLElBQUk7QUFDSixNQUFNLEdBQUcsS0FBSyxTQUFTO0FBQ3ZCLE1BQU0sRUFBRSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxJQUFJLEdBQUcsS0FBSyxJQUFJLENBQUM7QUFDakQsTUFBTSxFQUFFLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsSUFBSSxHQUFHLEtBQUssRUFBRTtBQUNyRDtBQUNBOztBQUVBLEVBQUUsV0FBVyxDQUFDLElBQUksRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLE9BQU8sR0FBRyxFQUFFLEVBQUU7QUFDM0MsSUFBSSxJQUFJLElBQUksQ0FBQyxVQUFVLEVBQUUsV0FBVyxFQUFFLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsT0FBTyxDQUFDO0FBQ2hHLElBQUksT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxPQUFPLENBQUM7QUFDakU7O0FBRUEsRUFBRSxvQkFBb0IsQ0FBQyxPQUFPLEdBQUcsRUFBRSxFQUFFO0FBQ3JDO0FBQ0EsSUFBSSxNQUFNLFdBQVcsR0FBRztBQUN4QixNQUFNLGNBQWM7QUFDcEIsTUFBTSxTQUFTO0FBQ2YsTUFBTSxTQUFTO0FBQ2YsTUFBTSxTQUFTO0FBQ2YsTUFBTSxLQUFLO0FBQ1gsTUFBTSxNQUFNO0FBQ1osTUFBTSxhQUFhO0FBQ25CLE1BQU0sSUFBSTtBQUNWLE1BQU0sY0FBYztBQUNwQixNQUFNLGFBQWE7QUFDbkIsTUFBTSxlQUFlO0FBQ3JCLE1BQU0sZUFBZTtBQUNyQixNQUFNLFlBQVk7QUFDbEIsTUFBTSxhQUFhO0FBQ25CLE1BQU0sZUFBZTtBQUNyQixLQUFLOztBQUVMLElBQUksTUFBTSx3QkFBd0IsR0FBRyxPQUFPLENBQUMsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUM7QUFDbEYsSUFBSSxJQUFJLElBQUksR0FBRyx3QkFBd0IsR0FBRyxPQUFPLENBQUMsT0FBTyxHQUFHLE9BQU87QUFDbkUsSUFBSSxJQUFJLHdCQUF3QixJQUFJLE9BQU8sT0FBTyxDQUFDLEtBQUssS0FBSyxXQUFXLEVBQUU7QUFDMUUsTUFBTSxJQUFJLENBQUMsS0FBSyxHQUFHLE9BQU8sQ0FBQyxLQUFLO0FBQ2hDOztBQUVBLElBQUksSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxnQkFBZ0IsRUFBRTtBQUNyRCxNQUFNLElBQUksR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsZ0JBQWdCLEVBQUUsR0FBRyxJQUFJLEVBQUU7QUFDeEU7O0FBRUE7QUFDQSxJQUFJLElBQUksQ0FBQyx3QkFBd0IsRUFBRTtBQUNuQyxNQUFNLElBQUksR0FBRyxFQUFFLEdBQUcsSUFBSSxFQUFFO0FBQ3hCLE1BQU0sS0FBSyxNQUFNLEdBQUcsSUFBSSxXQUFXLEVBQUU7QUFDckMsUUFBUSxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUM7QUFDeEI7QUFDQTs7QUFFQSxJQUFJLE9BQU8sSUFBSTtBQUNmOztBQUVBLEVBQUUsT0FBTyxlQUFlLENBQUMsT0FBTyxFQUFFO0FBQ2xDLElBQUksTUFBTSxNQUFNLEdBQUcsY0FBYzs7QUFFakMsSUFBSSxLQUFLLE1BQU0sTUFBTSxJQUFJLE9BQU8sRUFBRTtBQUNsQyxNQUFNO0FBQ04sUUFBUSxNQUFNLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQztBQUM3RCxRQUFRLE1BQU0sS0FBSyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsTUFBTSxDQUFDO0FBQ3JELFFBQVEsU0FBUyxLQUFLLE9BQU8sQ0FBQyxNQUFNO0FBQ3BDLFFBQVE7QUFDUixRQUFRLE9BQU8sSUFBSTtBQUNuQjtBQUNBOztBQUVBLElBQUksT0FBTyxLQUFLO0FBQ2hCO0FBQ0E7O0FDam1CQSxNQUFNLFlBQVksQ0FBQztBQUNuQixFQUFFLFdBQVcsQ0FBQyxPQUFPLEVBQUU7QUFDdkIsSUFBSSxJQUFJLENBQUMsT0FBTyxHQUFHLE9BQU87O0FBRTFCLElBQUksSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLGFBQWEsSUFBSSxLQUFLO0FBQzVELElBQUksSUFBSSxDQUFDLE1BQU0sR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQztBQUNwRDs7QUFFQSxFQUFFLHFCQUFxQixDQUFDLElBQUksRUFBRTtBQUM5QixJQUFJLElBQUksR0FBRyxjQUFjLENBQUMsSUFBSSxDQUFDO0FBQy9CLElBQUksSUFBSSxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxPQUFPLElBQUk7O0FBRW5ELElBQUksTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUM7QUFDN0IsSUFBSSxJQUFJLENBQUMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLE9BQU8sSUFBSTtBQUNuQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEVBQUU7QUFDWCxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLEtBQUssR0FBRyxFQUFFLE9BQU8sSUFBSTtBQUMxRCxJQUFJLE9BQU8sSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDL0M7O0FBRUEsRUFBRSx1QkFBdUIsQ0FBQyxJQUFJLEVBQUU7QUFDaEMsSUFBSSxJQUFJLEdBQUcsY0FBYyxDQUFDLElBQUksQ0FBQztBQUMvQixJQUFJLElBQUksQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsT0FBTyxJQUFJOztBQUVuRCxJQUFJLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDO0FBQzdCLElBQUksT0FBTyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3hDOztBQUVBLEVBQUUsa0JBQWtCLENBQUMsSUFBSSxFQUFFO0FBQzNCO0FBQ0EsSUFBSSxJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFO0FBQ2xELE1BQU0sSUFBSSxhQUFhLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMzRCxNQUFNLElBQUksYUFBYSxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxFQUFFO0FBQ3RELFFBQVEsYUFBYSxHQUFHLGFBQWEsQ0FBQyxXQUFXLEVBQUU7QUFDbkQ7QUFDQSxNQUFNLElBQUksYUFBYSxFQUFFLE9BQU8sYUFBYTs7QUFFN0MsTUFBTSxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxFQUFFO0FBQ3JDLFFBQVEsT0FBTyxJQUFJLENBQUMsV0FBVyxFQUFFO0FBQ2pDOztBQUVBLE1BQU0sT0FBTyxJQUFJO0FBQ2pCOztBQUVBLElBQUksT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUMsV0FBVyxFQUFFLEdBQUcsSUFBSTtBQUMxRjs7QUFFQSxFQUFFLGVBQWUsQ0FBQyxJQUFJLEVBQUU7QUFDeEIsSUFBSSxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxLQUFLLGNBQWMsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLHdCQUF3QixFQUFFO0FBQ3ZGLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLENBQUM7QUFDL0M7QUFDQSxJQUFJO0FBQ0osTUFBTSxDQUFDLElBQUksQ0FBQyxhQUFhLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sSUFBSSxJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDO0FBQy9GO0FBQ0E7O0FBRUEsRUFBRSxxQkFBcUIsQ0FBQyxLQUFLLEVBQUU7QUFDL0IsSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFLE9BQU8sSUFBSTs7QUFFM0IsSUFBSSxJQUFJLEtBQUs7O0FBRWI7QUFDQSxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLEtBQUs7QUFDNUIsTUFBTSxJQUFJLEtBQUssRUFBRTtBQUNqQixNQUFNLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUM7QUFDdEQsTUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxhQUFhLElBQUksSUFBSSxDQUFDLGVBQWUsQ0FBQyxVQUFVLENBQUMsRUFBRSxLQUFLLEdBQUcsVUFBVTtBQUM3RixLQUFLLENBQUM7O0FBRU47QUFDQTtBQUNBO0FBQ0EsSUFBSSxJQUFJLENBQUMsS0FBSyxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxFQUFFO0FBQzlDLE1BQU0sS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksS0FBSztBQUM5QixRQUFRLElBQUksS0FBSyxFQUFFOztBQUVuQixRQUFRLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLENBQUM7QUFDMUQ7QUFDQSxRQUFRLElBQUksSUFBSSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsRUFBRSxRQUFRLEtBQUssR0FBRyxPQUFPOztBQUVsRTtBQUNBLFFBQVEsS0FBSyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDLFlBQVksS0FBSztBQUNsRSxVQUFVLElBQUksWUFBWSxLQUFLLE9BQU8sRUFBRSxPQUFPLFlBQVk7QUFDM0QsVUFBVSxJQUFJLFlBQVksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFO0FBQ3pFLFVBQVU7QUFDVixZQUFZLFlBQVksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQztBQUN6QyxZQUFZLE9BQU8sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQztBQUNwQyxZQUFZLFlBQVksQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLFlBQVksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSztBQUNyRTtBQUNBLFlBQVksT0FBTyxZQUFZO0FBQy9CLFVBQVUsSUFBSSxZQUFZLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsSUFBSSxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxPQUFPLFlBQVk7QUFDNUYsU0FBUyxDQUFDO0FBQ1YsT0FBTyxDQUFDO0FBQ1I7QUFDQTtBQUNBLElBQUksSUFBSSxDQUFDLEtBQUssRUFBRSxLQUFLLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDOztBQUUxRSxJQUFJLE9BQU8sS0FBSztBQUNoQjs7QUFFQSxFQUFFLGdCQUFnQixDQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUU7QUFDcEMsSUFBSSxJQUFJLENBQUMsU0FBUyxFQUFFLE9BQU8sRUFBRTtBQUM3QixJQUFJLElBQUksT0FBTyxTQUFTLEtBQUssVUFBVSxFQUFFLFNBQVMsR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDO0FBQ3BFLElBQUksSUFBSSxRQUFRLENBQUMsU0FBUyxDQUFDLEVBQUUsU0FBUyxHQUFHLENBQUMsU0FBUyxDQUFDO0FBQ3BELElBQUksSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxFQUFFLE9BQU8sU0FBUzs7QUFFbEQsSUFBSSxJQUFJLENBQUMsSUFBSSxFQUFFLE9BQU8sU0FBUyxDQUFDLE9BQU8sSUFBSSxFQUFFOztBQUU3QztBQUNBLElBQUksSUFBSSxLQUFLLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQztBQUMvQixJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUUsS0FBSyxHQUFHLFNBQVMsQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDbkUsSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFLEtBQUssR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ2hFLElBQUksSUFBSSxDQUFDLEtBQUssRUFBRSxLQUFLLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUNyRSxJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUUsS0FBSyxHQUFHLFNBQVMsQ0FBQyxPQUFPOztBQUV6QyxJQUFJLE9BQU8sS0FBSyxJQUFJLEVBQUU7QUFDdEI7O0FBRUEsRUFBRSxrQkFBa0IsQ0FBQyxJQUFJLEVBQUUsWUFBWSxFQUFFO0FBQ3pDLElBQUksTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLGdCQUFnQjtBQUMvQyxNQUFNLFlBQVksSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsSUFBSSxFQUFFO0FBQ3BELE1BQU0sSUFBSTtBQUNWLEtBQUs7O0FBRUwsSUFBSSxNQUFNLEtBQUssR0FBRyxFQUFFO0FBQ3BCLElBQUksTUFBTSxPQUFPLEdBQUcsQ0FBQyxDQUFDLEtBQUs7QUFDM0IsTUFBTSxJQUFJLENBQUMsQ0FBQyxFQUFFO0FBQ2QsTUFBTSxJQUFJLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLEVBQUU7QUFDbkMsUUFBUSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztBQUNyQixPQUFPLE1BQU07QUFDYixRQUFRLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsb0RBQW9ELEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNwRjtBQUNBLEtBQUs7O0FBRUwsSUFBSSxJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRTtBQUM5RSxNQUFNLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEtBQUssY0FBYyxFQUFFLE9BQU8sQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDdEYsTUFBTSxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxLQUFLLGNBQWMsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksS0FBSyxhQUFhO0FBQ3JGLFFBQVEsT0FBTyxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUNqRCxNQUFNLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEtBQUssYUFBYSxFQUFFLE9BQU8sQ0FBQyxJQUFJLENBQUMsdUJBQXVCLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDMUYsS0FBSyxNQUFNLElBQUksUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFO0FBQy9CLE1BQU0sT0FBTyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUM1Qzs7QUFFQSxJQUFJLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLEtBQUs7QUFDbEMsTUFBTSxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsRUFBRSxDQUFDLENBQUM7QUFDckUsS0FBSyxDQUFDOztBQUVOLElBQUksT0FBTyxLQUFLO0FBQ2hCO0FBQ0E7O0FDbkpBLE1BQU0sYUFBYSxHQUFHO0FBQ3RCLEVBQUUsSUFBSSxFQUFFLENBQUM7QUFDVCxFQUFFLEdBQUcsRUFBRSxDQUFDO0FBQ1IsRUFBRSxHQUFHLEVBQUUsQ0FBQztBQUNSLEVBQUUsR0FBRyxFQUFFLENBQUM7QUFDUixFQUFFLElBQUksRUFBRSxDQUFDO0FBQ1QsRUFBRSxLQUFLLEVBQUUsQ0FBQztBQUNWLENBQUM7O0FBRUQsTUFBTSxjQUFjLENBQUM7QUFDckIsRUFBRSxXQUFXLENBQUMsYUFBYSxFQUFFLE9BQU8sR0FBRyxFQUFFLEVBQUU7QUFDM0MsSUFBSSxJQUFJLENBQUMsYUFBYSxHQUFHLGFBQWE7QUFDdEMsSUFBSSxJQUFJLENBQUMsT0FBTyxHQUFHLE9BQU87O0FBRTFCLElBQUksSUFBSSxDQUFDLE1BQU0sR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDOztBQUVyRDtBQUNBO0FBQ0EsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsRUFBRTtBQUM5Qjs7QUFFQSxFQUFFLE9BQU8sQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFO0FBQ3BCLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxHQUFHO0FBQ3pCOztBQUVBLEVBQUUsVUFBVSxHQUFHO0FBQ2YsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsRUFBRTtBQUM5Qjs7QUFFQSxFQUFFLE9BQU8sQ0FBQyxJQUFJLEVBQUUsT0FBTyxHQUFHLEVBQUUsRUFBRTtBQUM5QixJQUFJLE1BQU0sV0FBVyxHQUFHLGNBQWMsQ0FBQyxJQUFJLEtBQUssS0FBSyxHQUFHLElBQUksR0FBRyxJQUFJLENBQUM7QUFDcEUsSUFBSSxNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsT0FBTyxHQUFHLFNBQVMsR0FBRyxVQUFVO0FBQ3pELElBQUksTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsQ0FBQzs7QUFFMUQsSUFBSSxJQUFJLFFBQVEsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLEVBQUU7QUFDM0MsTUFBTSxPQUFPLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUM7QUFDNUM7O0FBRUEsSUFBSSxJQUFJLElBQUk7O0FBRVosSUFBSSxJQUFJO0FBQ1IsTUFBTSxJQUFJLEdBQUcsSUFBSSxJQUFJLENBQUMsV0FBVyxDQUFDLFdBQVcsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDO0FBQ3hELEtBQUssQ0FBQyxPQUFPLEdBQUcsRUFBRTtBQUNsQixNQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxFQUFFO0FBQzlCLE1BQU0sTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLENBQUM7QUFDdEUsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDO0FBQzNDOztBQUVBLElBQUksSUFBSSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxHQUFHLElBQUk7QUFDMUMsSUFBSSxPQUFPLElBQUk7QUFDZjs7QUFFQSxFQUFFLFdBQVcsQ0FBQyxJQUFJLEVBQUUsT0FBTyxHQUFHLEVBQUUsRUFBRTtBQUNsQyxJQUFJLElBQUksSUFBSSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQztBQUMxQyxJQUFJLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQztBQUNsRCxJQUFJLE9BQU8sSUFBSSxFQUFFLGVBQWUsRUFBRSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sR0FBRyxDQUFDO0FBQzlEOztBQUVBLEVBQUUsbUJBQW1CLENBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRSxPQUFPLEdBQUcsRUFBRSxFQUFFO0FBQy9DLElBQUksT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLEdBQUcsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7QUFDN0U7O0FBRUEsRUFBRSxXQUFXLENBQUMsSUFBSSxFQUFFLE9BQU8sR0FBRyxFQUFFLEVBQUU7QUFDbEMsSUFBSSxJQUFJLElBQUksR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxPQUFPLENBQUM7QUFDMUMsSUFBSSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxPQUFPLENBQUM7QUFDbEQsSUFBSSxJQUFJLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRTs7QUFFeEIsSUFBSSxPQUFPLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztBQUNsQyxPQUFPLElBQUksQ0FBQyxDQUFDLGVBQWUsRUFBRSxlQUFlLEtBQUssYUFBYSxDQUFDLGVBQWUsQ0FBQyxHQUFHLGFBQWEsQ0FBQyxlQUFlLENBQUM7QUFDakgsT0FBTyxHQUFHLENBQUMsY0FBYyxJQUFJLENBQUMsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFLE9BQU8sQ0FBQyxPQUFPLEdBQUcsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUM7QUFDbEk7O0FBRUEsRUFBRSxTQUFTLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxPQUFPLEdBQUcsRUFBRSxFQUFFO0FBQ3ZDLElBQUksTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDOztBQUU1QyxJQUFJLElBQUksSUFBSSxFQUFFO0FBQ2QsTUFBTSxPQUFPLENBQUMsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFLE9BQU8sQ0FBQyxPQUFPLEdBQUcsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztBQUNySDs7QUFFQSxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsMEJBQTBCLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztBQUN6RCxJQUFJLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUFFLE9BQU8sQ0FBQztBQUNoRDs7QUFFQSxFQUFFLHdCQUF3QixDQUFDLElBQUksRUFBRSxLQUFLLEVBQUU7QUFDeEMsSUFBSSxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQ2hGLElBQWlCLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRzs7QUFFakM7QUFDQSxJQUFJLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxvQkFBb0IsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUU7O0FBUWpHLElBQUksT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sSUFBSSxHQUFHLENBQUMsUUFBUSxFQUFFLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEdBQUcsR0FBRyxDQUFDLFFBQVEsRUFBRSxHQUFHLEdBQUcsQ0FBQyxRQUFRLEVBQUU7QUFDMUc7QUFDQTs7QUMzRkEsTUFBTSxvQkFBb0IsR0FBRztBQUM3QixFQUFFLElBQUk7QUFDTixFQUFFLFdBQVc7QUFDYixFQUFFLEdBQUc7QUFDTCxFQUFFLFlBQVksR0FBRyxHQUFHO0FBQ3BCLEVBQUUsbUJBQW1CLEdBQUcsSUFBSTtBQUM1QixLQUFLO0FBQ0wsRUFBRSxJQUFJLElBQUksR0FBRyxtQkFBbUIsQ0FBQyxJQUFJLEVBQUUsV0FBVyxFQUFFLEdBQUcsQ0FBQztBQUN4RCxFQUFFLElBQUksQ0FBQyxJQUFJLElBQUksbUJBQW1CLElBQUksUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFO0FBQ3JELElBQUksSUFBSSxHQUFHLFFBQVEsQ0FBQyxJQUFJLEVBQUUsR0FBRyxFQUFFLFlBQVksQ0FBQztBQUM1QyxJQUFJLElBQUksSUFBSSxLQUFLLFNBQVMsRUFBRSxJQUFJLEdBQUcsUUFBUSxDQUFDLFdBQVcsRUFBRSxHQUFHLEVBQUUsWUFBWSxDQUFDO0FBQzNFO0FBQ0EsRUFBRSxPQUFPLElBQUk7QUFDYixDQUFDOztBQUVELE1BQU0sU0FBUyxHQUFHLENBQUMsR0FBRyxLQUFLLEdBQUcsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQzs7QUFFckQsTUFBTSxZQUFZLENBQUM7QUFDbkIsRUFBRSxXQUFXLENBQUMsT0FBTyxHQUFHLEVBQUUsRUFBRTtBQUM1QixJQUFJLElBQUksQ0FBQyxNQUFNLEdBQUcsVUFBVSxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUM7O0FBRW5ELElBQUksSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPO0FBQzFCLElBQUksSUFBSSxDQUFDLE1BQU0sR0FBRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sS0FBSyxDQUFDLEtBQUssS0FBSyxLQUFLLENBQUM7QUFDdEUsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQztBQUN0Qjs7QUFFQTtBQUNBLEVBQUUsSUFBSSxDQUFDLE9BQU8sR0FBRyxFQUFFLEVBQUU7QUFDckIsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLGFBQWEsRUFBRSxPQUFPLENBQUMsYUFBYSxHQUFHLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRTs7QUFFN0UsSUFBSSxNQUFNO0FBQ1YsY0FBTUMsUUFBTTtBQUNaLE1BQU0sV0FBVztBQUNqQixNQUFNLG1CQUFtQjtBQUN6QixNQUFNLE1BQU07QUFDWixNQUFNLGFBQWE7QUFDbkIsTUFBTSxNQUFNO0FBQ1osTUFBTSxhQUFhO0FBQ25CLE1BQU0sZUFBZTtBQUNyQixNQUFNLGNBQWM7QUFDcEIsTUFBTSxjQUFjO0FBQ3BCLE1BQU0sYUFBYTtBQUNuQixNQUFNLG9CQUFvQjtBQUMxQixNQUFNLGFBQWE7QUFDbkIsTUFBTSxvQkFBb0I7QUFDMUIsTUFBTSx1QkFBdUI7QUFDN0IsTUFBTSxXQUFXO0FBQ2pCLE1BQU0sWUFBWTtBQUNsQixLQUFLLEdBQUcsT0FBTyxDQUFDLGFBQWE7O0FBRTdCLElBQUksSUFBSSxDQUFDLE1BQU0sR0FBR0EsUUFBTSxLQUFLLFNBQVMsR0FBR0EsUUFBTSxHQUFHQyxNQUFXO0FBQzdELElBQUksSUFBSSxDQUFDLFdBQVcsR0FBRyxXQUFXLEtBQUssU0FBUyxHQUFHLFdBQVcsR0FBRyxJQUFJO0FBQ3JFLElBQUksSUFBSSxDQUFDLG1CQUFtQixHQUFHLG1CQUFtQixLQUFLLFNBQVMsR0FBRyxtQkFBbUIsR0FBRyxLQUFLOztBQUU5RixJQUFJLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxHQUFHLFdBQVcsQ0FBQyxNQUFNLENBQUMsR0FBRyxhQUFhLElBQUksSUFBSTtBQUN0RSxJQUFJLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxHQUFHLFdBQVcsQ0FBQyxNQUFNLENBQUMsR0FBRyxhQUFhLElBQUksSUFBSTs7QUFFdEUsSUFBSSxJQUFJLENBQUMsZUFBZSxHQUFHLGVBQWUsSUFBSSxHQUFHOztBQUVqRCxJQUFJLElBQUksQ0FBQyxjQUFjLEdBQUcsY0FBYyxHQUFHLEVBQUUsR0FBRyxjQUFjLElBQUksR0FBRztBQUNyRSxJQUFJLElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFDLGNBQWMsR0FBRyxFQUFFLEdBQUcsY0FBYyxJQUFJLEVBQUU7O0FBRXpFLElBQUksSUFBSSxDQUFDLGFBQWEsR0FBRztBQUN6QixRQUFRLFdBQVcsQ0FBQyxhQUFhO0FBQ2pDLFFBQVEsb0JBQW9CLElBQUksV0FBVyxDQUFDLEtBQUssQ0FBQztBQUNsRCxJQUFJLElBQUksQ0FBQyxhQUFhLEdBQUc7QUFDekIsUUFBUSxXQUFXLENBQUMsYUFBYTtBQUNqQyxRQUFRLG9CQUFvQixJQUFJLFdBQVcsQ0FBQyxHQUFHLENBQUM7O0FBRWhELElBQUksSUFBSSxDQUFDLHVCQUF1QixHQUFHLHVCQUF1QixJQUFJLEdBQUc7O0FBRWpFLElBQUksSUFBSSxDQUFDLFdBQVcsR0FBRyxXQUFXLElBQUksSUFBSTs7QUFFMUMsSUFBSSxJQUFJLENBQUMsWUFBWSxHQUFHLFlBQVksS0FBSyxTQUFTLEdBQUcsWUFBWSxHQUFHLEtBQUs7O0FBRXpFO0FBQ0EsSUFBSSxJQUFJLENBQUMsV0FBVyxFQUFFO0FBQ3RCOztBQUVBLEVBQUUsS0FBSyxHQUFHO0FBQ1YsSUFBSSxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDO0FBQzdDOztBQUVBLEVBQUUsV0FBVyxHQUFHO0FBQ2hCLElBQUksTUFBTSxnQkFBZ0IsR0FBRyxDQUFDLGNBQWMsRUFBRSxPQUFPLEtBQUs7QUFDMUQsTUFBTSxJQUFJLGNBQWMsRUFBRSxNQUFNLEtBQUssT0FBTyxFQUFFO0FBQzlDLFFBQVEsY0FBYyxDQUFDLFNBQVMsR0FBRyxDQUFDO0FBQ3BDLFFBQVEsT0FBTyxjQUFjO0FBQzdCO0FBQ0EsTUFBTSxPQUFPLElBQUksTUFBTSxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUM7QUFDckMsS0FBSzs7QUFFTCxJQUFJLElBQUksQ0FBQyxNQUFNLEdBQUcsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7QUFDcEYsSUFBSSxJQUFJLENBQUMsY0FBYyxHQUFHLGdCQUFnQjtBQUMxQyxNQUFNLElBQUksQ0FBQyxjQUFjO0FBQ3pCLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQ3JGLEtBQUs7QUFDTCxJQUFJLElBQUksQ0FBQyxhQUFhLEdBQUcsZ0JBQWdCO0FBQ3pDLE1BQU0sSUFBSSxDQUFDLGFBQWE7QUFDeEIsTUFBTSxDQUFDLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO0FBQ3ZELEtBQUs7QUFDTDs7QUFFQSxFQUFFLFdBQVcsQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUU7QUFDdkMsSUFBSSxJQUFJLEtBQUs7QUFDYixJQUFJLElBQUksS0FBSztBQUNiLElBQUksSUFBSSxRQUFROztBQUVoQixJQUFJLE1BQU0sV0FBVztBQUNyQixNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLGFBQWEsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxnQkFBZ0I7QUFDaEcsTUFBTSxFQUFFOztBQUVSLElBQUksTUFBTSxZQUFZLEdBQUcsQ0FBQyxHQUFHLEtBQUs7QUFDbEMsTUFBTSxJQUFJLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsRUFBRTtBQUNqRCxRQUFRLE1BQU0sSUFBSSxHQUFHLG9CQUFvQjtBQUN6QyxVQUFVLElBQUk7QUFDZCxVQUFVLFdBQVc7QUFDckIsVUFBVSxHQUFHO0FBQ2IsVUFBVSxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVk7QUFDbkMsVUFBVSxJQUFJLENBQUMsT0FBTyxDQUFDLG1CQUFtQjtBQUMxQyxTQUFTO0FBQ1QsUUFBUSxPQUFPLElBQUksQ0FBQztBQUNwQixZQUFZLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLFNBQVMsRUFBRSxHQUFHLEVBQUUsRUFBRSxHQUFHLE9BQU8sRUFBRSxHQUFHLElBQUksRUFBRSxnQkFBZ0IsRUFBRSxHQUFHLEVBQUU7QUFDNUYsWUFBWSxJQUFJO0FBQ2hCOztBQUVBLE1BQU0sTUFBTSxDQUFDLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDO0FBQy9DLE1BQU0sTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLElBQUksRUFBRTtBQUNoQyxNQUFNLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDLElBQUksRUFBRTs7QUFFbkQsTUFBTSxPQUFPLElBQUksQ0FBQyxNQUFNO0FBQ3hCLFFBQVEsb0JBQW9CO0FBQzVCLFVBQVUsSUFBSTtBQUNkLFVBQVUsV0FBVztBQUNyQixVQUFVLENBQUM7QUFDWCxVQUFVLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWTtBQUNuQyxVQUFVLElBQUksQ0FBQyxPQUFPLENBQUMsbUJBQW1CO0FBQzFDLFNBQVM7QUFDVCxRQUFRLENBQUM7QUFDVCxRQUFRLEdBQUc7QUFDWCxRQUFRO0FBQ1IsVUFBVSxHQUFHLE9BQU87QUFDcEIsVUFBVSxHQUFHLElBQUk7QUFDakIsVUFBVSxnQkFBZ0IsRUFBRSxDQUFDO0FBQzdCLFNBQVM7QUFDVCxPQUFPO0FBQ1AsS0FBSzs7QUFFTCxJQUFJLElBQUksQ0FBQyxXQUFXLEVBQUU7O0FBRXRCLElBQUksTUFBTSwyQkFBMkI7QUFDckMsTUFBTSxPQUFPLEVBQUUsMkJBQTJCLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQywyQkFBMkI7O0FBRXRGLElBQUksTUFBTSxlQUFlO0FBQ3pCLE1BQU0sT0FBTyxFQUFFLGFBQWEsRUFBRSxlQUFlLEtBQUs7QUFDbEQsVUFBVSxPQUFPLENBQUMsYUFBYSxDQUFDO0FBQ2hDLFVBQVUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsZUFBZTs7QUFFcEQsSUFBSSxNQUFNLEtBQUssR0FBRztBQUNsQixNQUFNO0FBQ047QUFDQSxRQUFRLEtBQUssRUFBRSxJQUFJLENBQUMsY0FBYztBQUNsQyxRQUFRLFNBQVMsRUFBRSxDQUFDLEdBQUcsS0FBSyxTQUFTLENBQUMsR0FBRyxDQUFDO0FBQzFDLE9BQU87QUFDUCxNQUFNO0FBQ047QUFDQSxRQUFRLEtBQUssRUFBRSxJQUFJLENBQUMsTUFBTTtBQUMxQixRQUFRLFNBQVMsRUFBRSxDQUFDLEdBQUcsTUFBTSxJQUFJLENBQUMsV0FBVyxHQUFHLFNBQVMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQzdGLE9BQU87QUFDUCxLQUFLO0FBQ0wsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxLQUFLO0FBQzVCLE1BQU0sUUFBUSxHQUFHLENBQUM7QUFDbEI7QUFDQSxNQUFNLFFBQVEsS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHO0FBQzdDLFFBQVEsTUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRTtBQUMxQyxRQUFRLEtBQUssR0FBRyxZQUFZLENBQUMsVUFBVSxDQUFDO0FBQ3hDLFFBQVEsSUFBSSxLQUFLLEtBQUssU0FBUyxFQUFFO0FBQ2pDLFVBQVUsSUFBSSxPQUFPLDJCQUEyQixLQUFLLFVBQVUsRUFBRTtBQUNqRSxZQUFZLE1BQU0sSUFBSSxHQUFHLDJCQUEyQixDQUFDLEdBQUcsRUFBRSxLQUFLLEVBQUUsT0FBTyxDQUFDO0FBQ3pFLFlBQVksS0FBSyxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLEdBQUcsRUFBRTtBQUM5QyxXQUFXLE1BQU0sSUFBSSxPQUFPLElBQUksTUFBTSxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxVQUFVLENBQUMsRUFBRTtBQUMzRixZQUFZLEtBQUssR0FBRyxFQUFFLENBQUM7QUFDdkIsV0FBVyxNQUFNLElBQUksZUFBZSxFQUFFO0FBQ3RDLFlBQVksS0FBSyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUM7QUFDNUIsWUFBWSxTQUFTO0FBQ3JCLFdBQVcsTUFBTTtBQUNqQixZQUFZLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsMkJBQTJCLEVBQUUsVUFBVSxDQUFDLG1CQUFtQixFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUM7QUFDakcsWUFBWSxLQUFLLEdBQUcsRUFBRTtBQUN0QjtBQUNBLFNBQVMsTUFBTSxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLG1CQUFtQixFQUFFO0FBQ2xFLFVBQVUsS0FBSyxHQUFHLFVBQVUsQ0FBQyxLQUFLLENBQUM7QUFDbkM7QUFDQSxRQUFRLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDO0FBQy9DLFFBQVEsR0FBRyxHQUFHLEdBQUcsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLFNBQVMsQ0FBQztBQUM5QyxRQUFRLElBQUksZUFBZSxFQUFFO0FBQzdCLFVBQVUsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLElBQUksS0FBSyxDQUFDLE1BQU07QUFDOUMsVUFBVSxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTTtBQUNqRCxTQUFTLE1BQU07QUFDZixVQUFVLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxHQUFHLENBQUM7QUFDbEM7QUFDQSxRQUFRLFFBQVEsRUFBRTtBQUNsQixRQUFRLElBQUksUUFBUSxJQUFJLElBQUksQ0FBQyxXQUFXLEVBQUU7QUFDMUMsVUFBVTtBQUNWO0FBQ0E7QUFDQSxLQUFLLENBQUM7QUFDTixJQUFJLE9BQU8sR0FBRztBQUNkOztBQUVBLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxFQUFFLEVBQUUsT0FBTyxHQUFHLEVBQUUsRUFBRTtBQUM5QixJQUFJLElBQUksS0FBSztBQUNiLElBQUksSUFBSSxLQUFLOztBQUViLElBQUksSUFBSSxhQUFhOztBQUVyQjtBQUNBLElBQUksTUFBTSxnQkFBZ0IsR0FBRyxDQUFDLEdBQUcsRUFBRSxnQkFBZ0IsS0FBSztBQUN4RCxNQUFNLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyx1QkFBdUI7QUFDOUMsTUFBTSxJQUFJLEdBQUcsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLE9BQU8sR0FBRzs7QUFFMUMsTUFBTSxNQUFNLENBQUMsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksTUFBTSxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQzs7QUFFcEQsTUFBTSxJQUFJLGFBQWEsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNwQyxNQUFNLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2hCLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsYUFBYSxFQUFFLGFBQWEsQ0FBQztBQUNwRSxNQUFNLE1BQU0sbUJBQW1CLEdBQUcsYUFBYSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUM7QUFDM0QsTUFBTSxNQUFNLG1CQUFtQixHQUFHLGFBQWEsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDO0FBQzNELE1BQU07QUFDTixRQUFRLENBQUMsQ0FBQyxtQkFBbUIsRUFBRSxNQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxtQkFBbUI7QUFDN0UsUUFBUSxtQkFBbUIsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxLQUFLO0FBQzNDLFFBQVE7QUFDUixRQUFRLGFBQWEsR0FBRyxhQUFhLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUM7QUFDeEQ7O0FBRUEsTUFBTSxJQUFJO0FBQ1YsUUFBUSxhQUFhLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUM7O0FBRWpELFFBQVEsSUFBSSxnQkFBZ0IsRUFBRSxhQUFhLEdBQUcsRUFBRSxHQUFHLGdCQUFnQixFQUFFLEdBQUcsYUFBYSxFQUFFO0FBQ3ZGLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRTtBQUNsQixRQUFRLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsaURBQWlELEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7QUFDdEYsUUFBUSxPQUFPLENBQUMsRUFBRSxHQUFHLENBQUMsRUFBRSxHQUFHLENBQUMsRUFBRSxhQUFhLENBQUMsQ0FBQztBQUM3Qzs7QUFFQTtBQUNBLE1BQU0sSUFBSSxhQUFhLENBQUMsWUFBWSxJQUFJLGFBQWEsQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDNUYsUUFBUSxPQUFPLGFBQWEsQ0FBQyxZQUFZO0FBQ3pDLE1BQU0sT0FBTyxHQUFHO0FBQ2hCLEtBQUs7O0FBRUw7QUFDQSxJQUFJLFFBQVEsS0FBSyxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHO0FBQ25ELE1BQU0sSUFBSSxVQUFVLEdBQUcsRUFBRTs7QUFFekIsTUFBTSxhQUFhLEdBQUcsRUFBRSxHQUFHLE9BQU8sRUFBRTtBQUNwQyxNQUFNLGFBQWE7QUFDbkIsUUFBUSxhQUFhLENBQUMsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxPQUFPO0FBQ2hFLFlBQVksYUFBYSxDQUFDO0FBQzFCLFlBQVksYUFBYTtBQUN6QixNQUFNLGFBQWEsQ0FBQyxrQkFBa0IsR0FBRyxLQUFLLENBQUM7QUFDL0MsTUFBTSxPQUFPLGFBQWEsQ0FBQyxZQUFZLENBQUM7O0FBRXhDO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLE1BQU0sSUFBSSxRQUFRLEdBQUcsS0FBSztBQUMxQixNQUFNLElBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO0FBQ25GLFFBQVEsTUFBTSxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxLQUFLLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztBQUNqRixRQUFRLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxFQUFFO0FBQzVCLFFBQVEsVUFBVSxHQUFHLENBQUM7QUFDdEIsUUFBUSxRQUFRLEdBQUcsSUFBSTtBQUN2Qjs7QUFFQSxNQUFNLEtBQUssR0FBRyxFQUFFLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsYUFBYSxDQUFDLEVBQUUsYUFBYSxDQUFDOztBQUU1RjtBQUNBLE1BQU0sSUFBSSxLQUFLLElBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsRUFBRSxPQUFPLEtBQUs7O0FBRXJFO0FBQ0EsTUFBTSxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxFQUFFLEtBQUssR0FBRyxVQUFVLENBQUMsS0FBSyxDQUFDO0FBQ3JELE1BQU0sSUFBSSxDQUFDLEtBQUssRUFBRTtBQUNsQixRQUFRLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsa0JBQWtCLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLGFBQWEsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBQzVFLFFBQVEsS0FBSyxHQUFHLEVBQUU7QUFDbEI7O0FBRUEsTUFBTSxJQUFJLFFBQVEsRUFBRTtBQUNwQixRQUFRLEtBQUssR0FBRyxVQUFVLENBQUMsTUFBTTtBQUNqQztBQUNBLFVBQVUsQ0FBQyxDQUFDLEVBQUUsQ0FBQztBQUNmLFlBQVksSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxHQUFHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQztBQUM3RixVQUFVLEtBQUssQ0FBQyxJQUFJLEVBQUU7QUFDdEIsU0FBUztBQUNUOztBQUVBO0FBQ0E7QUFDQSxNQUFNLEdBQUcsR0FBRyxHQUFHLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUM7QUFDeEMsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsR0FBRyxDQUFDO0FBQy9CO0FBQ0EsSUFBSSxPQUFPLEdBQUc7QUFDZDtBQUNBOztBQ3pUQSxNQUFNLGNBQWMsR0FBRyxDQUFDLFNBQVMsS0FBSztBQUN0QyxFQUFFLElBQUksVUFBVSxHQUFHLFNBQVMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxJQUFJLEVBQUU7QUFDakQsRUFBRSxNQUFNLGFBQWEsR0FBRyxFQUFFO0FBQzFCLEVBQUUsSUFBSSxTQUFTLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFO0FBQ25DLElBQUksTUFBTSxDQUFDLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUM7QUFDbEMsSUFBSSxVQUFVLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDLElBQUksRUFBRTs7QUFFMUMsSUFBSSxNQUFNLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQzs7QUFFckQ7QUFDQSxJQUFJLElBQUksVUFBVSxLQUFLLFVBQVUsSUFBSSxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRTtBQUM5RCxNQUFNLElBQUksQ0FBQyxhQUFhLENBQUMsUUFBUSxFQUFFLGFBQWEsQ0FBQyxRQUFRLEdBQUcsTUFBTSxDQUFDLElBQUksRUFBRTtBQUN6RSxLQUFLLE1BQU0sSUFBSSxVQUFVLEtBQUssY0FBYyxJQUFJLE1BQU0sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFO0FBQ3pFLE1BQU0sSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLEVBQUUsYUFBYSxDQUFDLEtBQUssR0FBRyxNQUFNLENBQUMsSUFBSSxFQUFFO0FBQ25FLEtBQUssTUFBTTtBQUNYLE1BQU0sTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUM7O0FBRXBDLE1BQU0sSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsS0FBSztBQUM1QixRQUFRLElBQUksR0FBRyxFQUFFO0FBQ2pCLFVBQVUsTUFBTSxDQUFDLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDO0FBQy9DLFVBQVUsTUFBTSxHQUFHLEdBQUc7QUFDdEIsYUFBYSxJQUFJLENBQUMsR0FBRztBQUNyQixhQUFhLElBQUk7QUFDakIsYUFBYSxPQUFPLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQyxDQUFDOztBQUVyQyxVQUFVLE1BQU0sVUFBVSxHQUFHLEdBQUcsQ0FBQyxJQUFJLEVBQUU7O0FBRXZDLFVBQVUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxVQUFVLENBQUMsRUFBRSxhQUFhLENBQUMsVUFBVSxDQUFDLEdBQUcsR0FBRztBQUN6RSxVQUFVLElBQUksR0FBRyxLQUFLLE9BQU8sRUFBRSxhQUFhLENBQUMsVUFBVSxDQUFDLEdBQUcsS0FBSztBQUNoRSxVQUFVLElBQUksR0FBRyxLQUFLLE1BQU0sRUFBRSxhQUFhLENBQUMsVUFBVSxDQUFDLEdBQUcsSUFBSTtBQUM5RDtBQUNBLFVBQVUsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsRUFBRSxhQUFhLENBQUMsVUFBVSxDQUFDLEdBQUcsUUFBUSxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUM7QUFDeEU7QUFDQSxPQUFPLENBQUM7QUFDUjtBQUNBOztBQUVBLEVBQUUsT0FBTztBQUNULElBQUksVUFBVTtBQUNkLElBQUksYUFBYTtBQUNqQixHQUFHO0FBQ0gsQ0FBQzs7QUFFRCxNQUFNLHFCQUFxQixHQUFHLENBQUMsRUFBRSxLQUFLO0FBQ3RDLEVBQUUsTUFBTSxLQUFLLEdBQUcsRUFBRTtBQUNsQixFQUFFLE9BQU8sQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLE9BQU8sS0FBSztBQUNoQyxJQUFJLElBQUksV0FBVyxHQUFHLE9BQU87QUFDN0I7QUFDQSxJQUFJO0FBQ0osTUFBTSxPQUFPO0FBQ2IsTUFBTSxPQUFPLENBQUMsZ0JBQWdCO0FBQzlCLE1BQU0sT0FBTyxDQUFDLFlBQVk7QUFDMUIsTUFBTSxPQUFPLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQztBQUNwRCxNQUFNLE9BQU8sQ0FBQyxPQUFPLENBQUMsZ0JBQWdCO0FBQ3RDLE1BQU07QUFDTixNQUFNLFdBQVcsR0FBRztBQUNwQixRQUFRLEdBQUcsV0FBVztBQUN0QixRQUFRLENBQUMsT0FBTyxDQUFDLGdCQUFnQixHQUFHLFNBQVM7QUFDN0MsT0FBTztBQUNQO0FBQ0EsSUFBSSxNQUFNLEdBQUcsR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUM7QUFDakQsSUFBSSxJQUFJLFNBQVMsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDO0FBQzlCLElBQUksSUFBSSxDQUFDLFNBQVMsRUFBRTtBQUNwQixNQUFNLFNBQVMsR0FBRyxFQUFFLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxFQUFFLE9BQU8sQ0FBQztBQUNsRCxNQUFNLEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxTQUFTO0FBQzVCO0FBQ0EsSUFBSSxPQUFPLFNBQVMsQ0FBQyxHQUFHLENBQUM7QUFDekIsR0FBRztBQUNILENBQUM7O0FBRUQsTUFBTSxTQUFTLENBQUM7QUFDaEIsRUFBRSxXQUFXLENBQUMsT0FBTyxHQUFHLEVBQUUsRUFBRTtBQUM1QixJQUFJLElBQUksQ0FBQyxNQUFNLEdBQUcsVUFBVSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUM7O0FBRWhELElBQUksSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPO0FBQzFCLElBQUksSUFBSSxDQUFDLE9BQU8sR0FBRztBQUNuQixNQUFNLE1BQU0sRUFBRSxxQkFBcUIsQ0FBQyxDQUFDLEdBQUcsRUFBRSxHQUFHLEtBQUs7QUFDbEQsUUFBUSxNQUFNLFNBQVMsR0FBRyxJQUFJLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxFQUFFLEVBQUUsR0FBRyxHQUFHLEVBQUUsQ0FBQztBQUNoRSxRQUFRLE9BQU8sQ0FBQyxHQUFHLEtBQUssU0FBUyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUM7QUFDN0MsT0FBTyxDQUFDO0FBQ1IsTUFBTSxRQUFRLEVBQUUscUJBQXFCLENBQUMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxLQUFLO0FBQ3BELFFBQVEsTUFBTSxTQUFTLEdBQUcsSUFBSSxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsRUFBRSxFQUFFLEdBQUcsR0FBRyxFQUFFLEtBQUssRUFBRSxVQUFVLEVBQUUsQ0FBQztBQUNuRixRQUFRLE9BQU8sQ0FBQyxHQUFHLEtBQUssU0FBUyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUM7QUFDN0MsT0FBTyxDQUFDO0FBQ1IsTUFBTSxRQUFRLEVBQUUscUJBQXFCLENBQUMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxLQUFLO0FBQ3BELFFBQVEsTUFBTSxTQUFTLEdBQUcsSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsRUFBRSxFQUFFLEdBQUcsR0FBRyxFQUFFLENBQUM7QUFDbEUsUUFBUSxPQUFPLENBQUMsR0FBRyxLQUFLLFNBQVMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDO0FBQzdDLE9BQU8sQ0FBQztBQUNSLE1BQU0sWUFBWSxFQUFFLHFCQUFxQixDQUFDLENBQUMsR0FBRyxFQUFFLEdBQUcsS0FBSztBQUN4RCxRQUFRLE1BQU0sU0FBUyxHQUFHLElBQUksSUFBSSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsRUFBRSxFQUFFLEdBQUcsR0FBRyxFQUFFLENBQUM7QUFDdEUsUUFBUSxPQUFPLENBQUMsR0FBRyxLQUFLLFNBQVMsQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxLQUFLLElBQUksS0FBSyxDQUFDO0FBQ2pFLE9BQU8sQ0FBQztBQUNSLE1BQU0sSUFBSSxFQUFFLHFCQUFxQixDQUFDLENBQUMsR0FBRyxFQUFFLEdBQUcsS0FBSztBQUNoRCxRQUFRLE1BQU0sU0FBUyxHQUFHLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUUsRUFBRSxHQUFHLEdBQUcsRUFBRSxDQUFDO0FBQzlELFFBQVEsT0FBTyxDQUFDLEdBQUcsS0FBSyxTQUFTLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQztBQUM3QyxPQUFPLENBQUM7QUFDUixLQUFLO0FBQ0wsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQztBQUN0Qjs7QUFFQTtBQUNBLEVBQUUsSUFBSSxDQUFDLFFBQVEsRUFBRSxPQUFPLEdBQUcsRUFBRSxhQUFhLEVBQUUsRUFBRSxFQUFFLEVBQUU7QUFDbEQsSUFBSSxJQUFJLENBQUMsZUFBZSxHQUFHLE9BQU8sQ0FBQyxhQUFhLENBQUMsZUFBZSxJQUFJLEdBQUc7QUFDdkU7O0FBRUEsRUFBRSxHQUFHLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRTtBQUNoQixJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDLElBQUksRUFBRSxDQUFDLEdBQUcsRUFBRTtBQUNoRDs7QUFFQSxFQUFFLFNBQVMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFO0FBQ3RCLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUMsR0FBRyxxQkFBcUIsQ0FBQyxFQUFFLENBQUM7QUFDdkU7O0FBRUEsRUFBRSxNQUFNLENBQUMsS0FBSyxFQUFFLE1BQU0sRUFBRSxHQUFHLEVBQUUsT0FBTyxHQUFHLEVBQUUsRUFBRTtBQUMzQyxJQUFJLE1BQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQztBQUN0RCxJQUFJO0FBQ0osTUFBTSxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUM7QUFDeEIsTUFBTSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUM7QUFDakMsTUFBTSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUM7QUFDakMsTUFBTSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQzdDLE1BQU07QUFDTixNQUFNLE1BQU0sU0FBUyxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztBQUNyRSxNQUFNLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUM7QUFDM0Y7O0FBRUEsSUFBSSxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsS0FBSztBQUM5QyxNQUFNLE1BQU0sRUFBRSxVQUFVLEVBQUUsYUFBYSxFQUFFLEdBQUcsY0FBYyxDQUFDLENBQUMsQ0FBQzs7QUFFN0QsTUFBTSxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLEVBQUU7QUFDcEMsUUFBUSxJQUFJLFNBQVMsR0FBRyxHQUFHO0FBQzNCLFFBQVEsSUFBSTtBQUNaO0FBQ0EsVUFBVSxNQUFNLFVBQVUsR0FBRyxPQUFPLEVBQUUsWUFBWSxHQUFHLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUU7O0FBRXBGO0FBQ0EsVUFBVSxNQUFNLENBQUMsR0FBRyxVQUFVLENBQUMsTUFBTSxJQUFJLFVBQVUsQ0FBQyxHQUFHLElBQUksT0FBTyxDQUFDLE1BQU0sSUFBSSxPQUFPLENBQUMsR0FBRyxJQUFJLEdBQUc7O0FBRS9GLFVBQVUsU0FBUyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRTtBQUN2RCxZQUFZLEdBQUcsYUFBYTtBQUM1QixZQUFZLEdBQUcsT0FBTztBQUN0QixZQUFZLEdBQUcsVUFBVTtBQUN6QixXQUFXLENBQUM7QUFDWixTQUFTLENBQUMsT0FBTyxLQUFLLEVBQUU7QUFDeEIsVUFBVSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUM7QUFDakM7QUFDQSxRQUFRLE9BQU8sU0FBUztBQUN4QjtBQUNBLE9BQU8sTUFBTTtBQUNiLFFBQVEsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxpQ0FBaUMsRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFDO0FBQzFFO0FBQ0EsTUFBTSxPQUFPLEdBQUc7QUFDaEIsS0FBSyxFQUFFLEtBQUssQ0FBQzs7QUFFYixJQUFJLE9BQU8sTUFBTTtBQUNqQjtBQUNBOztBQzFKQSxNQUFNLGFBQWEsR0FBRyxDQUFDLENBQUMsRUFBRSxJQUFJLEtBQUs7QUFDbkMsRUFBRSxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssU0FBUyxFQUFFO0FBQ3JDLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQztBQUMxQixJQUFJLENBQUMsQ0FBQyxZQUFZLEVBQUU7QUFDcEI7QUFDQSxDQUFDOztBQUVELE1BQU0sU0FBUyxTQUFTLFlBQVksQ0FBQztBQUNyQyxFQUFFLFdBQVcsQ0FBQyxPQUFPLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxPQUFPLEdBQUcsRUFBRSxFQUFFO0FBQ3RELElBQUksS0FBSyxFQUFFOztBQUVYLElBQUksSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPO0FBQzFCLElBQUksSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLO0FBQ3RCLElBQUksSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRO0FBQzVCLElBQUksSUFBSSxDQUFDLGFBQWEsR0FBRyxRQUFRLENBQUMsYUFBYTtBQUMvQyxJQUFJLElBQUksQ0FBQyxPQUFPLEdBQUcsT0FBTztBQUMxQixJQUFJLElBQUksQ0FBQyxNQUFNLEdBQUcsVUFBVSxDQUFDLE1BQU0sQ0FBQyxrQkFBa0IsQ0FBQzs7QUFFdkQsSUFBSSxJQUFJLENBQUMsWUFBWSxHQUFHLEVBQUU7QUFDMUIsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsT0FBTyxDQUFDLGdCQUFnQixJQUFJLEVBQUU7QUFDMUQsSUFBSSxJQUFJLENBQUMsWUFBWSxHQUFHLENBQUM7O0FBRXpCLElBQUksSUFBSSxDQUFDLFVBQVUsR0FBRyxPQUFPLENBQUMsVUFBVSxJQUFJLENBQUMsR0FBRyxPQUFPLENBQUMsVUFBVSxHQUFHLENBQUM7QUFDdEUsSUFBSSxJQUFJLENBQUMsWUFBWSxHQUFHLE9BQU8sQ0FBQyxZQUFZLElBQUksQ0FBQyxHQUFHLE9BQU8sQ0FBQyxZQUFZLEdBQUcsR0FBRzs7QUFFOUUsSUFBSSxJQUFJLENBQUMsS0FBSyxHQUFHLEVBQUU7QUFDbkIsSUFBSSxJQUFJLENBQUMsS0FBSyxHQUFHLEVBQUU7O0FBRW5CLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLEdBQUcsUUFBUSxFQUFFLE9BQU8sQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDO0FBQzVEOztBQUVBLEVBQUUsU0FBUyxDQUFDLFNBQVMsRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRTtBQUN0RDtBQUNBLElBQUksTUFBTSxNQUFNLEdBQUcsRUFBRTtBQUNyQixJQUFJLE1BQU0sT0FBTyxHQUFHLEVBQUU7QUFDdEIsSUFBSSxNQUFNLGVBQWUsR0FBRyxFQUFFO0FBQzlCLElBQUksTUFBTSxnQkFBZ0IsR0FBRyxFQUFFOztBQUUvQixJQUFJLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLEtBQUs7QUFDL0IsTUFBTSxJQUFJLGdCQUFnQixHQUFHLElBQUk7O0FBRWpDLE1BQU0sVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsS0FBSztBQUNqQyxRQUFRLE1BQU0sSUFBSSxHQUFHLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDOztBQUVuQyxRQUFRLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsaUJBQWlCLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxFQUFFO0FBQ3RFLFVBQVUsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDL0IsU0FBUyxNQUFNLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FFaEMsTUFBTSxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFO0FBQzNDLFVBQVUsSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssU0FBUyxFQUFFLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJO0FBQy9ELFNBQVMsTUFBTTtBQUNmLFVBQVUsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7O0FBRS9CLFVBQVUsZ0JBQWdCLEdBQUcsS0FBSzs7QUFFbEMsVUFBVSxJQUFJLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxTQUFTLEVBQUUsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUk7QUFDL0QsVUFBVSxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxTQUFTLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUk7QUFDN0QsVUFBVSxJQUFJLGdCQUFnQixDQUFDLEVBQUUsQ0FBQyxLQUFLLFNBQVMsRUFBRSxnQkFBZ0IsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJO0FBQzdFO0FBQ0EsT0FBTyxDQUFDOztBQUVSLE1BQU0sSUFBSSxDQUFDLGdCQUFnQixFQUFFLGVBQWUsQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJO0FBQ3hELEtBQUssQ0FBQzs7QUFFTixJQUFJLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxNQUFNLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLEVBQUU7QUFDbkUsTUFBTSxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQztBQUN0QixRQUFRLE9BQU87QUFDZixRQUFRLFlBQVksRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLE1BQU07QUFDakQsUUFBUSxNQUFNLEVBQUUsRUFBRTtBQUNsQixRQUFRLE1BQU0sRUFBRSxFQUFFO0FBQ2xCLFFBQVEsUUFBUTtBQUNoQixPQUFPLENBQUM7QUFDUjs7QUFFQSxJQUFJLE9BQU87QUFDWCxNQUFNLE1BQU0sRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQztBQUNqQyxNQUFNLE9BQU8sRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQztBQUNuQyxNQUFNLGVBQWUsRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQztBQUNuRCxNQUFNLGdCQUFnQixFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUM7QUFDckQsS0FBSztBQUNMOztBQUVBLEVBQUUsTUFBTSxDQUFDLElBQUksRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFO0FBQzFCLElBQUksTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUM7QUFDN0IsSUFBSSxNQUFNLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3BCLElBQUksTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQzs7QUFFbkIsSUFBSSxJQUFJLEdBQUcsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLEdBQUcsQ0FBQzs7QUFFckQsSUFBSSxJQUFJLENBQUMsR0FBRyxJQUFJLElBQUksRUFBRTtBQUN0QixNQUFNLElBQUksQ0FBQyxLQUFLLENBQUMsaUJBQWlCLENBQUMsR0FBRyxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsQ0FBQztBQUMzRjs7QUFFQTtBQUNBLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQztBQUNuQyxJQUFJLElBQUksR0FBRyxJQUFJLElBQUksRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUM7O0FBRXpDO0FBQ0EsSUFBSSxNQUFNLE1BQU0sR0FBRyxFQUFFOztBQUVyQjtBQUNBLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEtBQUs7QUFDOUIsTUFBTSxRQUFRLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsQ0FBQztBQUNuQyxNQUFNLGFBQWEsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDOztBQUU1QixNQUFNLElBQUksR0FBRyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQzs7QUFFakMsTUFBTSxJQUFJLENBQUMsQ0FBQyxZQUFZLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRTtBQUMzQztBQUNBLFFBQVEsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxLQUFLO0FBQzdDLFVBQVUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRTtBQUN4QyxVQUFVLE1BQU0sVUFBVSxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO0FBQ3hDLFVBQVUsSUFBSSxVQUFVLENBQUMsTUFBTSxFQUFFO0FBQ2pDLFlBQVksVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSztBQUN0QyxjQUFjLElBQUksTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLFNBQVMsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSTtBQUNqRSxhQUFhLENBQUM7QUFDZDtBQUNBLFNBQVMsQ0FBQzs7QUFFVjtBQUNBLFFBQVEsQ0FBQyxDQUFDLElBQUksR0FBRyxJQUFJO0FBQ3JCLFFBQVEsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRTtBQUM3QixVQUFVLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQztBQUM5QixTQUFTLE1BQU07QUFDZixVQUFVLENBQUMsQ0FBQyxRQUFRLEVBQUU7QUFDdEI7QUFDQTtBQUNBLEtBQUssQ0FBQzs7QUFFTjtBQUNBLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDOztBQUUvQjtBQUNBLElBQUksSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7QUFDbEQ7O0FBRUEsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsS0FBSyxHQUFHLENBQUMsRUFBRSxJQUFJLEdBQUcsSUFBSSxDQUFDLFlBQVksRUFBRSxRQUFRLEVBQUU7QUFDdkUsSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxPQUFPLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUM7O0FBRS9DO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBSSxJQUFJLElBQUksQ0FBQyxZQUFZLElBQUksSUFBSSxDQUFDLGdCQUFnQixFQUFFO0FBQ3BELE1BQU0sSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxDQUFDO0FBQ3hFLE1BQU07QUFDTjtBQUNBLElBQUksSUFBSSxDQUFDLFlBQVksRUFBRTs7QUFFdkIsSUFBSSxNQUFNLFFBQVEsR0FBRyxDQUFDLEdBQUcsRUFBRSxJQUFJLEtBQUs7QUFDcEMsTUFBTSxJQUFJLENBQUMsWUFBWSxFQUFFO0FBQ3pCLE1BQU0sSUFBSSxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7QUFDeEMsUUFBUSxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssRUFBRTtBQUM5QyxRQUFRLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUM7QUFDdkY7QUFDQSxNQUFNLElBQUksR0FBRyxJQUFJLElBQUksc0JBQXNCLEtBQUssR0FBRyxJQUFJLENBQUMsVUFBVSxFQUFFO0FBQ3BFLFFBQVEsVUFBVSxDQUFDLE1BQU07QUFDekIsVUFBVSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsS0FBSyxHQUFHLENBQUMsRUFBRSxJQUFJLEdBQUcsQ0FBQyxFQUFFLFFBQVEsQ0FBQztBQUM5RSxTQUFTLEVBQUUsSUFBSSxDQUFDO0FBQ2hCLFFBQVE7QUFDUjtBQUNBLE1BQU0sUUFBUSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUM7QUFDekIsS0FBSzs7QUFFTCxJQUFJLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUM7QUFDdEQsSUFBSSxJQUFJLEVBQUUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO0FBQ3pCO0FBQ0EsTUFBTSxJQUFJO0FBQ1YsUUFBUSxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQztBQUM3QixRQUFRLElBQUksQ0FBQyxJQUFJLE9BQU8sQ0FBQyxDQUFDLElBQUksS0FBSyxVQUFVLEVBQUU7QUFDL0M7QUFDQSxVQUFVLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEtBQUssUUFBUSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUM7QUFDaEUsU0FBUyxNQUFNO0FBQ2Y7QUFDQSxVQUFVLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO0FBQzNCO0FBQ0EsT0FBTyxDQUFDLE9BQU8sR0FBRyxFQUFFO0FBQ3BCLFFBQVEsUUFBUSxDQUFDLEdBQUcsQ0FBQztBQUNyQjtBQUNBLE1BQU07QUFDTjs7QUFFQTtBQUNBLElBQUksT0FBTyxFQUFFLENBQUMsR0FBRyxFQUFFLEVBQUUsRUFBRSxRQUFRLENBQUM7QUFDaEM7O0FBRUE7QUFDQSxFQUFFLGNBQWMsQ0FBQyxTQUFTLEVBQUUsVUFBVSxFQUFFLE9BQU8sR0FBRyxFQUFFLEVBQUUsUUFBUSxFQUFFO0FBQ2hFLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUU7QUFDdkIsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxnRUFBZ0UsQ0FBQztBQUN4RixNQUFNLE9BQU8sUUFBUSxJQUFJLFFBQVEsRUFBRTtBQUNuQzs7QUFFQSxJQUFJLElBQUksUUFBUSxDQUFDLFNBQVMsQ0FBQyxFQUFFLFNBQVMsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLGtCQUFrQixDQUFDLFNBQVMsQ0FBQztBQUN6RixJQUFJLElBQUksUUFBUSxDQUFDLFVBQVUsQ0FBQyxFQUFFLFVBQVUsR0FBRyxDQUFDLFVBQVUsQ0FBQzs7QUFFdkQsSUFBSSxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFFLFFBQVEsQ0FBQztBQUMzRSxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRTtBQUMvQixNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxRQUFRLEVBQUUsQ0FBQztBQUM3QyxNQUFNLE9BQU8sSUFBSSxDQUFDO0FBQ2xCOztBQUVBLElBQUksTUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLEtBQUs7QUFDcEMsTUFBTSxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQztBQUN4QixLQUFLLENBQUM7QUFDTjs7QUFFQSxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUUsVUFBVSxFQUFFLFFBQVEsRUFBRTtBQUN4QyxJQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsU0FBUyxFQUFFLFVBQVUsRUFBRSxFQUFFLEVBQUUsUUFBUSxDQUFDO0FBQzVEOztBQUVBLEVBQUUsTUFBTSxDQUFDLFNBQVMsRUFBRSxVQUFVLEVBQUUsUUFBUSxFQUFFO0FBQzFDLElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxTQUFTLEVBQUUsVUFBVSxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxFQUFFLFFBQVEsQ0FBQztBQUMxRTs7QUFFQSxFQUFFLE9BQU8sQ0FBQyxJQUFJLEVBQUUsTUFBTSxHQUFHLEVBQUUsRUFBRTtBQUM3QixJQUFJLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDO0FBQzdCLElBQUksTUFBTSxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNwQixJQUFJLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7O0FBRW5CLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLENBQUMsR0FBRyxFQUFFLElBQUksS0FBSztBQUNwRSxNQUFNLElBQUksR0FBRyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsa0JBQWtCLEVBQUUsRUFBRSxDQUFDLGNBQWMsRUFBRSxHQUFHLENBQUMsT0FBTyxDQUFDLEVBQUUsR0FBRyxDQUFDO0FBQ25HLE1BQU0sSUFBSSxDQUFDLEdBQUcsSUFBSSxJQUFJO0FBQ3RCLFFBQVEsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxpQkFBaUIsRUFBRSxFQUFFLENBQUMsY0FBYyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDOztBQUVwRixNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUM7QUFDbEMsS0FBSyxDQUFDO0FBQ047O0FBRUEsRUFBRSxXQUFXLENBQUMsU0FBUyxFQUFFLFNBQVMsRUFBRSxHQUFHLEVBQUUsYUFBYSxFQUFFLFFBQVEsRUFBRSxPQUFPLEdBQUcsRUFBRSxFQUFFLEdBQUcsR0FBRyxNQUFNLEVBQUUsRUFBRTtBQUNoRyxJQUFJO0FBQ0osTUFBTSxJQUFJLENBQUMsUUFBUSxFQUFFLEtBQUssRUFBRSxrQkFBa0I7QUFDOUMsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsS0FBSyxFQUFFLGtCQUFrQixDQUFDLFNBQVM7QUFDekQsTUFBTTtBQUNOLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJO0FBQ3RCLFFBQVEsQ0FBQyxrQkFBa0IsRUFBRSxHQUFHLENBQUMsb0JBQW9CLEVBQUUsU0FBUyxDQUFDLG9CQUFvQixDQUFDO0FBQ3RGLFFBQVEsME5BQTBOO0FBQ2xPLE9BQU87QUFDUCxNQUFNO0FBQ047O0FBRUE7QUFDQSxJQUFJLElBQUksR0FBRyxLQUFLLFNBQVMsSUFBSSxHQUFHLEtBQUssSUFBSSxJQUFJLEdBQUcsS0FBSyxFQUFFLEVBQUU7O0FBRXpELElBQUksSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRTtBQUM5QixNQUFNLE1BQU0sSUFBSSxHQUFHO0FBQ25CLFFBQVEsR0FBRyxPQUFPO0FBQ2xCLFFBQVEsUUFBUTtBQUNoQixPQUFPO0FBQ1AsTUFBTSxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQztBQUN2RCxNQUFNLElBQUksRUFBRSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7QUFDekI7QUFDQSxRQUFRLElBQUk7QUFDWixVQUFVLElBQUksQ0FBQztBQUNmLFVBQVUsSUFBSSxFQUFFLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtBQUMvQjtBQUNBLFlBQVksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxTQUFTLEVBQUUsU0FBUyxFQUFFLEdBQUcsRUFBRSxhQUFhLEVBQUUsSUFBSSxDQUFDO0FBQ2xFLFdBQVcsTUFBTTtBQUNqQixZQUFZLENBQUMsR0FBRyxFQUFFLENBQUMsU0FBUyxFQUFFLFNBQVMsRUFBRSxHQUFHLEVBQUUsYUFBYSxDQUFDO0FBQzVEO0FBQ0EsVUFBVSxJQUFJLENBQUMsSUFBSSxPQUFPLENBQUMsQ0FBQyxJQUFJLEtBQUssVUFBVSxFQUFFO0FBQ2pEO0FBQ0EsWUFBWSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxLQUFLLEdBQUcsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDO0FBQ3hELFdBQVcsTUFBTTtBQUNqQjtBQUNBLFlBQVksR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7QUFDeEI7QUFDQSxTQUFTLENBQUMsT0FBTyxHQUFHLEVBQUU7QUFDdEIsVUFBVSxHQUFHLENBQUMsR0FBRyxDQUFDO0FBQ2xCO0FBQ0EsT0FBTyxNQUFNO0FBQ2I7QUFDQSxRQUFRLEVBQUUsQ0FBQyxTQUFTLEVBQUUsU0FBUyxFQUFFLEdBQUcsRUFBRSxhQUFhLEVBQUUsR0FBRyx3QkFBd0IsSUFBSSxDQUFDO0FBQ3JGO0FBQ0E7O0FBRUE7QUFDQSxJQUFJLElBQUksQ0FBQyxTQUFTLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUU7QUFDckMsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsU0FBUyxFQUFFLEdBQUcsRUFBRSxhQUFhLENBQUM7QUFDdkU7QUFDQTs7QUMxUk8sTUFBTSxHQUFHLEdBQUcsT0FBTztBQUMxQixFQUFFLEtBQUssRUFBRSxLQUFLO0FBQ2QsRUFBRSxTQUFTLEVBQUUsSUFBSTs7QUFFakIsRUFBRSxFQUFFLEVBQUUsQ0FBQyxhQUFhLENBQUM7QUFDckIsRUFBRSxTQUFTLEVBQUUsQ0FBQyxhQUFhLENBQUM7QUFDNUIsRUFBRSxXQUFXLEVBQUUsQ0FBQyxLQUFLLENBQUM7QUFDdEIsRUFBRSxVQUFVLEVBQUUsS0FBSzs7QUFFbkIsRUFBRSxhQUFhLEVBQUUsS0FBSztBQUN0QixFQUFFLHdCQUF3QixFQUFFLEtBQUs7QUFDakMsRUFBRSxJQUFJLEVBQUUsS0FBSztBQUNiLEVBQUUsT0FBTyxFQUFFLEtBQUs7O0FBRWhCLEVBQUUsb0JBQW9CLEVBQUUsSUFBSTtBQUM1QixFQUFFLFlBQVksRUFBRSxHQUFHO0FBQ25CLEVBQUUsV0FBVyxFQUFFLEdBQUc7QUFDbEIsRUFBRSxlQUFlLEVBQUUsR0FBRztBQUN0QixFQUFFLGdCQUFnQixFQUFFLEdBQUc7O0FBRXZCLEVBQUUsdUJBQXVCLEVBQUUsS0FBSztBQUNoQyxFQUFFLFdBQVcsRUFBRSxLQUFLO0FBQ3BCLEVBQUUsYUFBYSxFQUFFLEtBQUs7QUFDdEIsRUFBRSxhQUFhLEVBQUUsVUFBVTtBQUMzQixFQUFFLGtCQUFrQixFQUFFLElBQUk7QUFDMUIsRUFBRSxpQkFBaUIsRUFBRSxLQUFLO0FBQzFCLEVBQUUsMkJBQTJCLEVBQUUsS0FBSzs7QUFFcEMsRUFBRSxXQUFXLEVBQUUsS0FBSztBQUNwQixFQUFFLHVCQUF1QixFQUFFLEtBQUs7QUFDaEMsRUFBRSxVQUFVLEVBQUUsS0FBSztBQUNuQixFQUFFLGlCQUFpQixFQUFFLElBQUk7QUFDekIsRUFBRSxhQUFhLEVBQUUsS0FBSztBQUN0QixFQUFFLFVBQVUsRUFBRSxLQUFLO0FBQ25CLEVBQUUscUJBQXFCLEVBQUUsS0FBSztBQUM5QixFQUFFLHNCQUFzQixFQUFFLEtBQUs7QUFDL0IsRUFBRSwyQkFBMkIsRUFBRSxLQUFLO0FBQ3BDLEVBQUUsdUJBQXVCLEVBQUUsS0FBSztBQUNoQyxFQUFFLGdDQUFnQyxFQUFFLENBQUMsSUFBSSxLQUFLO0FBQzlDLElBQUksSUFBSSxHQUFHLEdBQUcsRUFBRTtBQUNoQixJQUFJLElBQUksT0FBTyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssUUFBUSxFQUFFLEdBQUcsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDO0FBQ2xELElBQUksSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDO0FBQ3JELElBQUksSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDO0FBQ3JELElBQUksSUFBSSxPQUFPLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxRQUFRLElBQUksT0FBTyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssUUFBUSxFQUFFO0FBQ3BFLE1BQU0sTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDeEMsTUFBTSxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsS0FBSztBQUM1QyxRQUFRLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDO0FBQy9CLE9BQU8sQ0FBQztBQUNSO0FBQ0EsSUFBSSxPQUFPLEdBQUc7QUFDZCxHQUFHO0FBQ0gsRUFBRSxhQUFhLEVBQUU7QUFDakIsSUFBSSxXQUFXLEVBQUUsSUFBSTtBQUNyQjtBQUNBLElBQUksTUFBTSxFQUFFLENBQUMsS0FBSyxLQUFLLEtBQUs7QUFDNUIsSUFBSSxNQUFNLEVBQUUsSUFBSTtBQUNoQixJQUFJLE1BQU0sRUFBRSxJQUFJO0FBQ2hCLElBQUksZUFBZSxFQUFFLEdBQUc7QUFDeEI7QUFDQTtBQUNBO0FBQ0EsSUFBSSxjQUFjLEVBQUUsR0FBRzs7QUFFdkIsSUFBSSxhQUFhLEVBQUUsS0FBSztBQUN4QixJQUFJLGFBQWEsRUFBRSxHQUFHO0FBQ3RCLElBQUksdUJBQXVCLEVBQUUsR0FBRztBQUNoQztBQUNBO0FBQ0E7QUFDQSxJQUFJLFdBQVcsRUFBRSxJQUFJO0FBQ3JCLElBQUksZUFBZSxFQUFFLElBQUk7QUFDekIsR0FBRztBQUNILENBQUMsQ0FBQzs7QUFFRjtBQUNPLE1BQU0sZ0JBQWdCLEdBQUcsQ0FBQyxPQUFPLEtBQUs7QUFDN0M7QUFDQSxFQUFFLElBQUksUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsRUFBRSxPQUFPLENBQUMsRUFBRSxHQUFHLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztBQUNyRCxFQUFFLElBQUksUUFBUSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsRUFBRSxPQUFPLENBQUMsV0FBVyxHQUFHLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQztBQUNoRixFQUFFLElBQUksUUFBUSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsRUFBRSxPQUFPLENBQUMsVUFBVSxHQUFHLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQzs7QUFFN0U7QUFDQSxFQUFFLElBQUksT0FBTyxDQUFDLGFBQWEsRUFBRSxPQUFPLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFO0FBQ3RELElBQUksT0FBTyxDQUFDLGFBQWEsR0FBRyxPQUFPLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQ3BFOztBQUVBO0FBQ0EsRUFBRSxJQUFJLE9BQU8sT0FBTyxDQUFDLGFBQWEsS0FBSyxTQUFTLEVBQUUsT0FBTyxDQUFDLFNBQVMsR0FBRyxPQUFPLENBQUMsYUFBYTs7QUFFM0YsRUFBRSxPQUFPLE9BQU87QUFDaEIsQ0FBQzs7QUMvRUQsTUFBTSxJQUFJLEdBQUcsTUFBTTs7QUFFbkI7QUFDQTtBQUNBLE1BQU0sbUJBQW1CLEdBQUcsQ0FBQyxJQUFJLEtBQUs7QUFDdEMsRUFBRSxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsbUJBQW1CLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUM7QUFDckUsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsR0FBRyxLQUFLO0FBQ3hCLElBQUksSUFBSSxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxVQUFVLEVBQUU7QUFDekMsTUFBTSxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJO0FBQ3JDO0FBQ0EsR0FBRztBQUNIOztBQUVBLE1BQU0sSUFBSSxTQUFTLFlBQVksQ0FBQztBQUNoQyxFQUFFLFdBQVcsQ0FBQyxPQUFPLEdBQUcsRUFBRSxFQUFFLFFBQVEsRUFBRTtBQUN0QyxJQUFJLEtBQUssRUFBRTs7QUFFWCxJQUFJLElBQUksQ0FBQyxPQUFPLEdBQUcsZ0JBQWdCLENBQUMsT0FBTyxDQUFDO0FBQzVDLElBQUksSUFBSSxDQUFDLFFBQVEsR0FBRyxFQUFFO0FBQ3RCLElBQUksSUFBSSxDQUFDLE1BQU0sR0FBRyxVQUFVO0FBQzVCLElBQUksSUFBSSxDQUFDLE9BQU8sR0FBRyxFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUU7O0FBRW5DLElBQUksbUJBQW1CLENBQUMsSUFBSSxDQUFDOztBQUU3QixJQUFJLElBQUksUUFBUSxJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUU7QUFDN0Q7QUFDQSxNQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRTtBQUNuQyxRQUFRLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLFFBQVEsQ0FBQztBQUNwQyxRQUFRLE9BQU8sSUFBSTtBQUNuQjtBQUNBLE1BQU0sVUFBVSxDQUFDLE1BQU07QUFDdkIsUUFBUSxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxRQUFRLENBQUM7QUFDcEMsT0FBTyxFQUFFLENBQUMsQ0FBQztBQUNYO0FBQ0E7O0FBRUEsRUFBRSxJQUFJLENBQUMsT0FBTyxHQUFHLEVBQUUsRUFBRSxRQUFRLEVBQUU7QUFDL0IsSUFBSSxJQUFJLENBQUMsY0FBYyxHQUFHLElBQUk7QUFDOUIsSUFBSSxJQUFJLE9BQU8sT0FBTyxLQUFLLFVBQVUsRUFBRTtBQUN2QyxNQUFNLFFBQVEsR0FBRyxPQUFPO0FBQ3hCLE1BQU0sT0FBTyxHQUFHLEVBQUU7QUFDbEI7O0FBRUEsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsSUFBSSxPQUFPLENBQUMsU0FBUyxLQUFLLEtBQUssSUFBSSxPQUFPLENBQUMsRUFBRSxFQUFFO0FBQ3pFLE1BQU0sSUFBSSxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxFQUFFO0FBQ2hDLFFBQVEsT0FBTyxDQUFDLFNBQVMsR0FBRyxPQUFPLENBQUMsRUFBRTtBQUN0QyxPQUFPLE1BQU0sSUFBSSxPQUFPLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLEVBQUU7QUFDeEQsUUFBUSxPQUFPLENBQUMsU0FBUyxHQUFHLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQ3pDO0FBQ0E7O0FBRUEsSUFBSSxNQUFNLE9BQU8sR0FBR0MsR0FBVyxFQUFFO0FBQ2pDLElBQUksSUFBSSxDQUFDLE9BQU8sR0FBRyxFQUFFLEdBQUcsT0FBTyxFQUFFLEdBQUcsSUFBSSxDQUFDLE9BQU8sRUFBRSxHQUFHLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxFQUFFO0FBQ2hGLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxhQUFhLEdBQUcsRUFBRSxHQUFHLE9BQU8sQ0FBQyxhQUFhLEVBQUUsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLGFBQWEsRUFBRSxDQUFDO0FBQzdGLElBQUksSUFBSSxPQUFPLENBQUMsWUFBWSxLQUFLLFNBQVMsRUFBRTtBQUM1QyxNQUFNLElBQUksQ0FBQyxPQUFPLENBQUMsdUJBQXVCLEdBQUcsT0FBTyxDQUFDLFlBQVk7QUFDakU7QUFDQSxJQUFJLElBQUksT0FBTyxDQUFDLFdBQVcsS0FBSyxTQUFTLEVBQUU7QUFDM0MsTUFBTSxJQUFJLENBQUMsT0FBTyxDQUFDLHNCQUFzQixHQUFHLE9BQU8sQ0FBQyxXQUFXO0FBQy9EOztBQUVBLElBQUksTUFBTSxtQkFBbUIsR0FBRyxDQUFDLGFBQWEsS0FBSztBQUNuRCxNQUFNLElBQUksQ0FBQyxhQUFhLEVBQUUsT0FBTyxJQUFJO0FBQ3JDLE1BQU0sSUFBSSxPQUFPLGFBQWEsS0FBSyxVQUFVLEVBQUUsT0FBTyxJQUFJLGFBQWEsRUFBRTtBQUN6RSxNQUFNLE9BQU8sYUFBYTtBQUMxQjs7QUFFQTtBQUNBLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFO0FBQy9CLE1BQU0sSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRTtBQUMvQixRQUFRLFVBQVUsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDO0FBQy9FLE9BQU8sTUFBTTtBQUNiLFFBQVEsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQztBQUMzQzs7QUFFQSxNQUFNLElBQUksU0FBUztBQUNuQixNQUFNLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUU7QUFDbEMsUUFBUSxTQUFTLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTO0FBQzFDLE9BQU8sTUFBTTtBQUNiLFFBQVEsU0FBUyxHQUFHLFNBQVM7QUFDN0I7O0FBRUEsTUFBTSxNQUFNLEVBQUUsR0FBRyxJQUFJQyxZQUFhLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQztBQUNoRCxNQUFNLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxhQUFhLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQzs7QUFFMUUsTUFBTSxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUTtBQUM3QixNQUFNLENBQUMsQ0FBQyxNQUFNLEdBQUcsVUFBVTtBQUMzQixNQUFNLENBQUMsQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDLEtBQUs7QUFDbEMsTUFBTSxDQUFDLENBQUMsYUFBYSxHQUFHLEVBQUU7QUFDMUIsTUFBTSxDQUFDLENBQUMsY0FBYyxHQUFHLElBQUksY0FBYyxDQUFDLEVBQUUsRUFBRTtBQUNoRCxRQUFRLE9BQU8sRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLGVBQWU7QUFDN0MsUUFBUSxvQkFBb0IsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLG9CQUFvQjtBQUMvRCxPQUFPLENBQUM7O0FBRVIsTUFBTSxJQUFJLFNBQVMsS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLE1BQU0sSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxNQUFNLEtBQUssT0FBTyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsRUFBRTtBQUNuSSxRQUFRLENBQUMsQ0FBQyxTQUFTLEdBQUcsbUJBQW1CLENBQUMsU0FBUyxDQUFDO0FBQ3BELFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUM7O0FBRXpDLFFBQVEsSUFBSSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDO0FBQ2hGOztBQUVBLE1BQU0sQ0FBQyxDQUFDLFlBQVksR0FBRyxJQUFJLFlBQVksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDO0FBQ3JELE1BQU0sQ0FBQyxDQUFDLEtBQUssR0FBRztBQUNoQixRQUFRLGtCQUFrQixFQUFFLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsSUFBSTtBQUM3RDs7QUFFQSxNQUFNLENBQUMsQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJQyxTQUFnQjtBQUMvQyxRQUFRLG1CQUFtQixDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDO0FBQ2pELFFBQVEsQ0FBQyxDQUFDLGFBQWE7QUFDdkIsUUFBUSxDQUFDO0FBQ1QsUUFBUSxJQUFJLENBQUMsT0FBTztBQUNwQixPQUFPO0FBQ1A7QUFDQSxNQUFNLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLENBQUMsS0FBSyxFQUFFLEdBQUcsSUFBSSxLQUFLO0FBQ3JELFFBQVEsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsR0FBRyxJQUFJLENBQUM7QUFDakMsT0FBTyxDQUFDOztBQUVSLE1BQU0sSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLGdCQUFnQixFQUFFO0FBQ3pDLFFBQVEsQ0FBQyxDQUFDLGdCQUFnQixHQUFHLG1CQUFtQixDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUM7QUFDL0UsUUFBUSxJQUFJLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQztBQUNyRzs7QUFFQSxNQUFNLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUU7QUFDbkMsUUFBUSxDQUFDLENBQUMsVUFBVSxHQUFHLG1CQUFtQixDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDO0FBQ25FLFFBQVEsSUFBSSxDQUFDLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7QUFDdEQ7O0FBRUEsTUFBTSxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksVUFBVSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQztBQUNuRTtBQUNBLE1BQU0sSUFBSSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLENBQUMsS0FBSyxFQUFFLEdBQUcsSUFBSSxLQUFLO0FBQ2xELFFBQVEsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsR0FBRyxJQUFJLENBQUM7QUFDakMsT0FBTyxDQUFDOztBQUVSLE1BQU0sSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSTtBQUN6QyxRQUFRLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztBQUNoQyxPQUFPLENBQUM7QUFDUjs7QUFFQSxJQUFJLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsTUFBTTtBQUNuRCxJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUUsUUFBUSxHQUFHLElBQUk7O0FBRWxDLElBQUksSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRTtBQUMxRixNQUFNLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVztBQUN6RixNQUFNLElBQUksS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLEtBQUssRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsR0FBRyxLQUFLLENBQUMsQ0FBQztBQUM1RTtBQUNBLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRTtBQUM5RCxNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLHlEQUF5RCxDQUFDO0FBQ2pGOztBQUVBO0FBQ0EsSUFBSSxNQUFNLFFBQVEsR0FBRztBQUNyQixNQUFNLGFBQWE7QUFDbkIsTUFBTSxtQkFBbUI7QUFDekIsTUFBTSxtQkFBbUI7QUFDekIsTUFBTSxtQkFBbUI7QUFDekIsS0FBSztBQUNMLElBQUksUUFBUSxDQUFDLE9BQU8sQ0FBQyxNQUFNLElBQUk7QUFDL0IsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksS0FBSyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDO0FBQzdELEtBQUssQ0FBQztBQUNOLElBQUksTUFBTSxlQUFlLEdBQUc7QUFDNUIsTUFBTSxhQUFhO0FBQ25CLE1BQU0sY0FBYztBQUNwQixNQUFNLG1CQUFtQjtBQUN6QixNQUFNLHNCQUFzQjtBQUM1QixLQUFLO0FBQ0wsSUFBSSxlQUFlLENBQUMsT0FBTyxDQUFDLE1BQU0sSUFBSTtBQUN0QyxNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxLQUFLO0FBQ2xDLFFBQVEsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQztBQUNuQyxRQUFRLE9BQU8sSUFBSTtBQUNuQixPQUFPO0FBQ1AsS0FBSyxDQUFDOztBQUVOLElBQUksTUFBTSxRQUFRLEdBQUcsS0FBSyxFQUFFOztBQUU1QixJQUFJLE1BQU0sSUFBSSxHQUFHLE1BQU07QUFDdkIsTUFBTSxNQUFNLE1BQU0sR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDLEtBQUs7QUFDakMsUUFBUSxJQUFJLENBQUMsY0FBYyxHQUFHLEtBQUs7QUFDbkMsUUFBUSxJQUFJLElBQUksQ0FBQyxhQUFhLElBQUksQ0FBQyxJQUFJLENBQUMsb0JBQW9CLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsdUVBQXVFLENBQUM7QUFDdkosUUFBUSxJQUFJLENBQUMsYUFBYSxHQUFHLElBQUk7QUFDakMsUUFBUSxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUM7QUFDL0UsUUFBUSxJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDOztBQUU5QyxRQUFRLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDNUIsUUFBUSxRQUFRLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQztBQUN4QixPQUFPO0FBQ1A7QUFDQSxNQUFNLElBQUksSUFBSSxDQUFDLFNBQVMsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsT0FBTyxNQUFNLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ3ZGLE1BQU0sSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxNQUFNLENBQUM7QUFDbkQsS0FBSzs7QUFFTCxJQUFJLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRTtBQUMzRCxNQUFNLElBQUksRUFBRTtBQUNaLEtBQUssTUFBTTtBQUNYLE1BQU0sVUFBVSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7QUFDekI7O0FBRUEsSUFBSSxPQUFPLFFBQVE7QUFDbkI7O0FBRUE7QUFDQSxFQUFFLGFBQWEsQ0FBQyxRQUFRLEVBQUUsUUFBUSxHQUFHLElBQUksRUFBRTtBQUMzQyxJQUFJLElBQUksWUFBWSxHQUFHLFFBQVE7QUFDL0IsSUFBSSxNQUFNLE9BQU8sR0FBRyxRQUFRLENBQUMsUUFBUSxDQUFDLEdBQUcsUUFBUSxHQUFHLElBQUksQ0FBQyxRQUFRO0FBQ2pFLElBQUksSUFBSSxPQUFPLFFBQVEsS0FBSyxVQUFVLEVBQUUsWUFBWSxHQUFHLFFBQVE7O0FBRS9ELElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsdUJBQXVCLEVBQUU7QUFDekUsTUFBTSxJQUFJLE9BQU8sRUFBRSxXQUFXLEVBQUUsS0FBSyxRQUFRLEtBQUssQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLEVBQUUsT0FBTyxZQUFZLEVBQUUsQ0FBQzs7QUFFckksTUFBTSxNQUFNLE1BQU0sR0FBRyxFQUFFOztBQUV2QixNQUFNLE1BQU0sTUFBTSxHQUFHLEdBQUcsSUFBSTtBQUM1QixRQUFRLElBQUksQ0FBQyxHQUFHLEVBQUU7QUFDbEIsUUFBUSxJQUFJLEdBQUcsS0FBSyxRQUFRLEVBQUU7QUFDOUIsUUFBUSxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUM7QUFDeEUsUUFBUSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSTtBQUMxQixVQUFVLElBQUksQ0FBQyxLQUFLLFFBQVEsRUFBRTtBQUM5QixVQUFVLElBQUksTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDbkQsU0FBUyxDQUFDO0FBQ1YsT0FBTzs7QUFFUCxNQUFNLElBQUksQ0FBQyxPQUFPLEVBQUU7QUFDcEI7QUFDQSxRQUFRLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDO0FBQ2hHLFFBQVEsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3pDLE9BQU8sTUFBTTtBQUNiLFFBQVEsTUFBTSxDQUFDLE9BQU8sQ0FBQztBQUN2Qjs7QUFFQSxNQUFNLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLE9BQU8sR0FBRyxDQUFDLElBQUksTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDOztBQUVyRCxNQUFNLElBQUksQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsS0FBSztBQUMxRSxRQUFRLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQztBQUNsRyxRQUFRLFlBQVksQ0FBQyxDQUFDLENBQUM7QUFDdkIsT0FBTyxDQUFDO0FBQ1IsS0FBSyxNQUFNO0FBQ1gsTUFBTSxZQUFZLENBQUMsSUFBSSxDQUFDO0FBQ3hCO0FBQ0E7O0FBRUEsRUFBRSxlQUFlLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxRQUFRLEVBQUU7QUFDdEMsSUFBSSxNQUFNLFFBQVEsR0FBRyxLQUFLLEVBQUU7QUFDNUIsSUFBSSxJQUFJLE9BQU8sSUFBSSxLQUFLLFVBQVUsRUFBRTtBQUNwQyxNQUFNLFFBQVEsR0FBRyxJQUFJO0FBQ3JCLE1BQU0sSUFBSSxHQUFHLFNBQVM7QUFDdEI7QUFDQSxJQUFJLElBQUksT0FBTyxFQUFFLEtBQUssVUFBVSxFQUFFO0FBQ2xDLE1BQU0sUUFBUSxHQUFHLEVBQUU7QUFDbkIsTUFBTSxFQUFFLEdBQUcsU0FBUztBQUNwQjtBQUNBLElBQUksSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLEdBQUcsSUFBSSxDQUFDLFNBQVM7QUFDcEMsSUFBSSxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUU7QUFDakMsSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFLFFBQVEsR0FBRyxJQUFJO0FBQ2xDLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxHQUFHLElBQUk7QUFDM0QsTUFBTSxRQUFRLENBQUMsT0FBTyxFQUFFLENBQUM7QUFDekIsTUFBTSxRQUFRLENBQUMsR0FBRyxDQUFDO0FBQ25CLEtBQUssQ0FBQztBQUNOLElBQUksT0FBTyxRQUFRO0FBQ25COztBQUVBLEVBQUUsR0FBRyxDQUFDLE1BQU0sRUFBRTtBQUNkLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRSxNQUFNLElBQUksS0FBSyxDQUFDLCtGQUErRjtBQUNoSSxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLE1BQU0sSUFBSSxLQUFLLENBQUMsMEZBQTBGOztBQUVoSSxJQUFJLElBQUksTUFBTSxDQUFDLElBQUksS0FBSyxTQUFTLEVBQUU7QUFDbkMsTUFBTSxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sR0FBRyxNQUFNO0FBQ25DOztBQUVBLElBQUksSUFBSSxNQUFNLENBQUMsSUFBSSxLQUFLLFFBQVEsS0FBSyxNQUFNLENBQUMsR0FBRyxJQUFJLE1BQU0sQ0FBQyxJQUFJLElBQUksTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFO0FBQ2pGLE1BQU0sSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEdBQUcsTUFBTTtBQUNsQzs7QUFFQSxJQUFJLElBQUksTUFBTSxDQUFDLElBQUksS0FBSyxrQkFBa0IsRUFBRTtBQUM1QyxNQUFNLElBQUksQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLEdBQUcsTUFBTTtBQUM1Qzs7QUFFQSxJQUFJLElBQUksTUFBTSxDQUFDLElBQUksS0FBSyxZQUFZLEVBQUU7QUFDdEMsTUFBTSxJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsR0FBRyxNQUFNO0FBQ3RDOztBQUVBLElBQUksSUFBSSxNQUFNLENBQUMsSUFBSSxLQUFLLGVBQWUsRUFBRTtBQUN6QyxNQUFNLGFBQWEsQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUM7QUFDNUM7O0FBRUEsSUFBSSxJQUFJLE1BQU0sQ0FBQyxJQUFJLEtBQUssV0FBVyxFQUFFO0FBQ3JDLE1BQU0sSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEdBQUcsTUFBTTtBQUNyQzs7QUFFQSxJQUFJLElBQUksTUFBTSxDQUFDLElBQUksS0FBSyxVQUFVLEVBQUU7QUFDcEMsTUFBTSxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDO0FBQ3hDOztBQUVBLElBQUksT0FBTyxJQUFJO0FBQ2Y7O0FBRUEsRUFBRSxtQkFBbUIsQ0FBQyxDQUFDLEVBQUU7QUFDekIsSUFBSSxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRTtBQUMvQixJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFO0FBQzNDLElBQUksS0FBSyxJQUFJLEVBQUUsR0FBRyxDQUFDLEVBQUUsRUFBRSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLEVBQUUsRUFBRSxFQUFFO0FBQ3ZELE1BQU0sTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUM7QUFDMUMsTUFBTSxJQUFJLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRTtBQUNyRCxNQUFNLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQywyQkFBMkIsQ0FBQyxTQUFTLENBQUMsRUFBRTtBQUM3RCxRQUFRLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxTQUFTO0FBQ3pDLFFBQVE7QUFDUjtBQUNBO0FBQ0E7O0FBRUEsRUFBRSxjQUFjLENBQUMsR0FBRyxFQUFFLFFBQVEsRUFBRTtBQUNoQyxJQUFJLElBQUksQ0FBQyxvQkFBb0IsR0FBRyxHQUFHO0FBQ25DLElBQUksTUFBTSxRQUFRLEdBQUcsS0FBSyxFQUFFO0FBQzVCLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxHQUFHLENBQUM7O0FBRXRDLElBQUksTUFBTSxXQUFXLEdBQUcsQ0FBQyxDQUFDLEtBQUs7QUFDL0IsTUFBTSxJQUFJLENBQUMsUUFBUSxHQUFHLENBQUM7QUFDdkIsTUFBTSxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQztBQUN4RTtBQUNBLE1BQU0sSUFBSSxDQUFDLGdCQUFnQixHQUFHLFNBQVM7QUFDdkMsTUFBTSxJQUFJLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDO0FBQ2pDLEtBQUs7O0FBRUwsSUFBSSxNQUFNLElBQUksR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDLEtBQUs7QUFDN0IsTUFBTSxJQUFJLENBQUMsRUFBRTtBQUNiLFFBQVEsV0FBVyxDQUFDLENBQUMsQ0FBQztBQUN0QixRQUFRLElBQUksQ0FBQyxVQUFVLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQztBQUN6QyxRQUFRLElBQUksQ0FBQyxvQkFBb0IsR0FBRyxTQUFTO0FBQzdDLFFBQVEsSUFBSSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDLENBQUM7QUFDdkMsUUFBUSxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDLENBQUM7QUFDN0MsT0FBTyxNQUFNO0FBQ2IsUUFBUSxJQUFJLENBQUMsb0JBQW9CLEdBQUcsU0FBUztBQUM3Qzs7QUFFQSxNQUFNLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLElBQUksS0FBSyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUM7QUFDcEQsTUFBTSxJQUFJLFFBQVEsRUFBRSxRQUFRLENBQUMsR0FBRyxFQUFFLENBQUMsR0FBRyxJQUFJLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDO0FBQy9ELEtBQUs7O0FBRUwsSUFBSSxNQUFNLE1BQU0sR0FBRyxJQUFJLElBQUk7QUFDM0I7QUFDQSxNQUFNLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRSxJQUFJLEdBQUcsRUFBRTtBQUNwRTtBQUNBLE1BQU0sTUFBTSxDQUFDLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUM7O0FBRS9GLE1BQU0sSUFBSSxDQUFDLEVBQUU7QUFDYixRQUFRLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFO0FBQzVCLFVBQVUsV0FBVyxDQUFDLENBQUMsQ0FBQztBQUN4QjtBQUNBLFFBQVEsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQzs7QUFFeEUsUUFBUSxJQUFJLENBQUMsUUFBUSxDQUFDLGdCQUFnQixFQUFFLGlCQUFpQixHQUFHLENBQUMsQ0FBQztBQUM5RDs7QUFFQSxNQUFNLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxFQUFFLEdBQUcsSUFBSTtBQUNuQyxRQUFRLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDO0FBQ3BCLE9BQU8sQ0FBQztBQUNSLEtBQUs7O0FBRUwsSUFBSSxJQUFJLENBQUMsR0FBRyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDLEtBQUssRUFBRTtBQUN6RixNQUFNLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sRUFBRSxDQUFDO0FBQ3JELEtBQUssTUFBTSxJQUFJLENBQUMsR0FBRyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLEVBQUU7QUFDL0YsTUFBTSxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7QUFDOUQsUUFBUSxJQUFJLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sRUFBRSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUM7QUFDNUQsT0FBTyxNQUFNO0FBQ2IsUUFBUSxJQUFJLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUM7QUFDckQ7QUFDQSxLQUFLLE1BQU07QUFDWCxNQUFNLE1BQU0sQ0FBQyxHQUFHLENBQUM7QUFDakI7O0FBRUEsSUFBSSxPQUFPLFFBQVE7QUFDbkI7O0FBRUEsRUFBRSxTQUFTLENBQUMsR0FBRyxFQUFFLEVBQUUsRUFBRSxTQUFTLEVBQUU7QUFDaEMsSUFBSSxNQUFNLE1BQU0sR0FBRyxDQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUUsR0FBRyxJQUFJLEtBQUs7QUFDM0MsTUFBTSxJQUFJLE9BQU87QUFDakIsTUFBTSxJQUFJLE9BQU8sSUFBSSxLQUFLLFFBQVEsRUFBRTtBQUNwQyxRQUFRLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLGdDQUFnQyxDQUFDLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUN6RixPQUFPLE1BQU07QUFDYixRQUFRLE9BQU8sR0FBRyxFQUFFLEdBQUcsSUFBSSxFQUFFO0FBQzdCOztBQUVBLE1BQU0sT0FBTyxDQUFDLEdBQUcsR0FBRyxPQUFPLENBQUMsR0FBRyxJQUFJLE1BQU0sQ0FBQyxHQUFHO0FBQzdDLE1BQU0sT0FBTyxDQUFDLElBQUksR0FBRyxPQUFPLENBQUMsSUFBSSxJQUFJLE1BQU0sQ0FBQyxJQUFJO0FBQ2hELE1BQU0sT0FBTyxDQUFDLEVBQUUsR0FBRyxPQUFPLENBQUMsRUFBRSxJQUFJLE1BQU0sQ0FBQyxFQUFFO0FBQzFDLE1BQU0sSUFBSSxPQUFPLENBQUMsU0FBUyxLQUFLLEVBQUUsRUFBRSxPQUFPLENBQUMsU0FBUyxHQUFHLE9BQU8sQ0FBQyxTQUFTLElBQUksU0FBUyxJQUFJLE1BQU0sQ0FBQyxTQUFTOztBQUUxRyxNQUFNLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxJQUFJLEdBQUc7QUFDM0QsTUFBTSxJQUFJO0FBQ1YsTUFBTSxJQUFJLE9BQU8sQ0FBQyxTQUFTLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRTtBQUNuRCxRQUFRLFNBQVMsR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsT0FBTyxDQUFDLFNBQVMsQ0FBQyxFQUFFLFlBQVksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDM0UsT0FBTyxNQUFNO0FBQ2IsUUFBUSxTQUFTLEdBQUcsT0FBTyxDQUFDLFNBQVMsR0FBRyxDQUFDLEVBQUUsT0FBTyxDQUFDLFNBQVMsQ0FBQyxFQUFFLFlBQVksQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRztBQUN6RjtBQUNBLE1BQU0sT0FBTyxJQUFJLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxPQUFPLENBQUM7QUFDdkMsS0FBSztBQUNMLElBQUksSUFBSSxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUU7QUFDdkIsTUFBTSxNQUFNLENBQUMsR0FBRyxHQUFHLEdBQUc7QUFDdEIsS0FBSyxNQUFNO0FBQ1gsTUFBTSxNQUFNLENBQUMsSUFBSSxHQUFHLEdBQUc7QUFDdkI7QUFDQSxJQUFJLE1BQU0sQ0FBQyxFQUFFLEdBQUcsRUFBRTtBQUNsQixJQUFJLE1BQU0sQ0FBQyxTQUFTLEdBQUcsU0FBUztBQUNoQyxJQUFJLE9BQU8sTUFBTTtBQUNqQjs7QUFFQSxFQUFFLENBQUMsQ0FBQyxHQUFHLElBQUksRUFBRTtBQUNiLElBQUksT0FBTyxJQUFJLENBQUMsVUFBVSxFQUFFLFNBQVMsQ0FBQyxHQUFHLElBQUksQ0FBQztBQUM5Qzs7QUFFQSxFQUFFLE1BQU0sQ0FBQyxHQUFHLElBQUksRUFBRTtBQUNsQixJQUFJLE9BQU8sSUFBSSxDQUFDLFVBQVUsRUFBRSxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUM7QUFDM0M7O0FBRUEsRUFBRSxtQkFBbUIsQ0FBQyxFQUFFLEVBQUU7QUFDMUIsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsR0FBRyxFQUFFO0FBQy9COztBQUVBLEVBQUUsa0JBQWtCLENBQUMsRUFBRSxFQUFFLE9BQU8sR0FBRyxFQUFFLEVBQUU7QUFDdkMsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRTtBQUM3QixNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLGlEQUFpRCxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUM7QUFDekYsTUFBTSxPQUFPLEtBQUs7QUFDbEI7QUFDQSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUU7QUFDbkQsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyw0REFBNEQsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDO0FBQ3BHLE1BQU0sT0FBTyxLQUFLO0FBQ2xCOztBQUVBLElBQUksTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLEdBQUcsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7QUFDekUsSUFBSSxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxHQUFHLEtBQUs7QUFDdkUsSUFBSSxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQzs7QUFFN0Q7QUFDQSxJQUFJLElBQUksR0FBRyxDQUFDLFdBQVcsRUFBRSxLQUFLLFFBQVEsRUFBRSxPQUFPLElBQUk7O0FBRW5ELElBQUksTUFBTSxjQUFjLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLO0FBQ3JDLE1BQU0sTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN6RSxNQUFNLE9BQU8sU0FBUyxLQUFLLENBQUMsQ0FBQyxJQUFJLFNBQVMsS0FBSyxDQUFDLElBQUksU0FBUyxLQUFLLENBQUM7QUFDbkUsS0FBSzs7QUFFTDtBQUNBLElBQUksSUFBSSxPQUFPLENBQUMsUUFBUSxFQUFFO0FBQzFCLE1BQU0sTUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsY0FBYyxDQUFDO0FBQzlELE1BQU0sSUFBSSxTQUFTLEtBQUssU0FBUyxFQUFFLE9BQU8sU0FBUztBQUNuRDs7QUFFQTtBQUNBLElBQUksSUFBSSxJQUFJLENBQUMsaUJBQWlCLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxFQUFFLE9BQU8sSUFBSTs7QUFFcEQ7QUFDQSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDLE9BQU8sS0FBSyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsdUJBQXVCLENBQUMsRUFBRSxPQUFPLElBQUk7O0FBRWpJO0FBQ0EsSUFBSSxJQUFJLGNBQWMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxXQUFXLElBQUksY0FBYyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLE9BQU8sSUFBSTs7QUFFN0YsSUFBSSxPQUFPLEtBQUs7QUFDaEI7O0FBRUEsRUFBRSxjQUFjLENBQUMsRUFBRSxFQUFFLFFBQVEsRUFBRTtBQUMvQixJQUFJLE1BQU0sUUFBUSxHQUFHLEtBQUssRUFBRTs7QUFFNUIsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLEVBQUU7QUFDMUIsTUFBTSxJQUFJLFFBQVEsRUFBRSxRQUFRLEVBQUU7QUFDOUIsTUFBTSxPQUFPLE9BQU8sQ0FBQyxPQUFPLEVBQUU7QUFDOUI7QUFDQSxJQUFJLElBQUksUUFBUSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLEVBQUUsQ0FBQzs7QUFFL0IsSUFBSSxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSTtBQUNwQixNQUFNLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0FBQ2pFLEtBQUssQ0FBQzs7QUFFTixJQUFJLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxJQUFJO0FBQzlCLE1BQU0sUUFBUSxDQUFDLE9BQU8sRUFBRTtBQUN4QixNQUFNLElBQUksUUFBUSxFQUFFLFFBQVEsQ0FBQyxHQUFHLENBQUM7QUFDakMsS0FBSyxDQUFDOztBQUVOLElBQUksT0FBTyxRQUFRO0FBQ25COztBQUVBLEVBQUUsYUFBYSxDQUFDLElBQUksRUFBRSxRQUFRLEVBQUU7QUFDaEMsSUFBSSxNQUFNLFFBQVEsR0FBRyxLQUFLLEVBQUU7O0FBRTVCLElBQUksSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDO0FBQ3JDLElBQUksTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLElBQUksRUFBRTs7QUFFaEQsSUFBSSxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsSUFBSSxTQUFTLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDdEg7QUFDQSxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFO0FBQ3pCLE1BQU0sSUFBSSxRQUFRLEVBQUUsUUFBUSxFQUFFO0FBQzlCLE1BQU0sT0FBTyxPQUFPLENBQUMsT0FBTyxFQUFFO0FBQzlCOztBQUVBLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEdBQUcsU0FBUyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUM7QUFDcEQsSUFBSSxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsSUFBSTtBQUM5QixNQUFNLFFBQVEsQ0FBQyxPQUFPLEVBQUU7QUFDeEIsTUFBTSxJQUFJLFFBQVEsRUFBRSxRQUFRLENBQUMsR0FBRyxDQUFDO0FBQ2pDLEtBQUssQ0FBQzs7QUFFTixJQUFJLE9BQU8sUUFBUTtBQUNuQjs7QUFFQSxFQUFFLEdBQUcsQ0FBQyxHQUFHLEVBQUU7QUFDWCxJQUFJLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsS0FBSyxJQUFJLENBQUMsU0FBUyxFQUFFLE1BQU0sR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDO0FBQzdHLElBQUksSUFBSSxDQUFDLEdBQUcsRUFBRSxPQUFPLEtBQUs7O0FBRTFCLElBQUksTUFBTSxPQUFPLEdBQUc7QUFDcEIsTUFBTSxJQUFJO0FBQ1YsTUFBTSxLQUFLO0FBQ1gsTUFBTSxLQUFLO0FBQ1gsTUFBTSxLQUFLO0FBQ1gsTUFBTSxLQUFLO0FBQ1gsTUFBTSxLQUFLO0FBQ1gsTUFBTSxLQUFLO0FBQ1gsTUFBTSxLQUFLO0FBQ1gsTUFBTSxLQUFLO0FBQ1gsTUFBTSxLQUFLO0FBQ1gsTUFBTSxLQUFLO0FBQ1gsTUFBTSxLQUFLO0FBQ1gsTUFBTSxLQUFLO0FBQ1gsTUFBTSxLQUFLO0FBQ1gsTUFBTSxLQUFLO0FBQ1gsTUFBTSxLQUFLO0FBQ1gsTUFBTSxLQUFLO0FBQ1gsTUFBTSxLQUFLO0FBQ1gsTUFBTSxLQUFLO0FBQ1gsTUFBTSxLQUFLO0FBQ1gsTUFBTSxLQUFLO0FBQ1gsTUFBTSxLQUFLO0FBQ1gsTUFBTSxLQUFLO0FBQ1gsTUFBTSxLQUFLO0FBQ1gsTUFBTSxLQUFLO0FBQ1gsTUFBTSxLQUFLO0FBQ1gsTUFBTSxLQUFLO0FBQ1gsTUFBTSxLQUFLO0FBQ1gsTUFBTSxLQUFLO0FBQ1gsTUFBTSxLQUFLO0FBQ1gsTUFBTSxLQUFLO0FBQ1gsTUFBTSxLQUFLO0FBQ1gsTUFBTSxLQUFLO0FBQ1gsTUFBTSxLQUFLO0FBQ1gsTUFBTSxLQUFLO0FBQ1gsTUFBTSxLQUFLO0FBQ1gsTUFBTSxJQUFJO0FBQ1YsTUFBTSxJQUFJO0FBQ1YsTUFBTSxJQUFJO0FBQ1YsTUFBTSxLQUFLO0FBQ1gsTUFBTSxLQUFLO0FBQ1gsTUFBTSxLQUFLO0FBQ1gsTUFBTSxLQUFLO0FBQ1gsTUFBTSxLQUFLO0FBQ1gsTUFBTSxJQUFJO0FBQ1YsTUFB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