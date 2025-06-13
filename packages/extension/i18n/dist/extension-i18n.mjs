/*!
 * @cdp/extension-i18n 0.9.19
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
  }

  changeLanguage(lng) {
    if (lng) this.language = lng;
  }

  exists(key, o = { interpolation: {} }) {
    const opt = { ...o };
    if (key == null) return false;
    const resolved = this.resolve(key, opt);
    return resolved?.res !== undefined;
  }

  extractFromKey(key, opt) {
    let nsSeparator = opt.nsSeparator !== undefined ? opt.nsSeparator : this.options.nsSeparator;
    if (nsSeparator === undefined) nsSeparator = ':';

    const keySeparator =
      opt.keySeparator !== undefined ? opt.keySeparator : this.options.keySeparator;

    let namespaces = opt.ns || this.options.defaultNS || [];
    const wouldCheckForNsInKey = nsSeparator && key.indexOf(nsSeparator) > -1;
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

  translate(keys, o, lastKey) {
    let opt = typeof o === 'object' ? { ...o } : o;
    if (typeof opt !== 'object' && this.options.overloadTranslationOptionHandler) {
      /* eslint prefer-rest-params: 0 */
      opt = this.options.overloadTranslationOptionHandler(arguments);
    }
    if (typeof options === 'object') opt = { ...opt };
    if (!opt) opt = {};

    // non valid keys handling
    if (keys == null /* || keys === '' */) return '';
    if (!Array.isArray(keys)) keys = [String(keys)];

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
      noObject.indexOf(resType) < 0 &&
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

        /* eslint no-restricted-syntax: 0 */
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
          key,
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
                suffixes.indexOf(`${this.options.pluralSeparator}zero`) < 0
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
            this.i18nFormat.addLookupKeys(finalKeys, key, code, ns, opt);
          } else {
            let pluralSuffix;
            if (needsPluralHandling)
              pluralSuffix = this.pluralResolver.getSuffix(code, opt.count, opt);
            const zeroSuffix = `${this.options.pluralSeparator}zero`;
            const ordinalPrefix = `${this.options.pluralSeparator}ordinal${this.options.pluralSeparator}`;
            // get key for plural if needed
            if (needsPluralHandling) {
              finalKeys.push(key + pluralSuffix);
              if (opt.ordinal && pluralSuffix.indexOf(ordinalPrefix) === 0) {
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
              const contextKey = `${key}${this.options.contextSeparator}${opt.context}`;
              finalKeys.push(contextKey);

              // get key for context + plural if needed
              if (needsPluralHandling) {
                finalKeys.push(contextKey + pluralSuffix);
                if (opt.ordinal && pluralSuffix.indexOf(ordinalPrefix) === 0) {
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

        const lngScOnly = this.getScriptPartFromCode(code);
        // eslint-disable-next-line no-return-assign
        if (this.isSupportedCode(lngScOnly)) return (found = lngScOnly);

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
      if (!Intl) {
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

  /* eslint no-param-reassign: 0 */
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
  cacheInBuiltFormats: true,
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

    if (options.defaultNS == null && options.ns) {
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
    if (!this.resolvedLanguage && this.languages.indexOf(l) < 0 && this.store.hasLanguageSomeTranslations(l)) {
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

  getFixedT(lng, ns, keyPrefix) {
    const fixedT = (key, opts, ...rest) => {
      let o;
      if (typeof opts !== 'object') {
        o = this.options.overloadTranslationOptionHandler([key, opts].concat(rest));
      } else {
        o = { ...opts };
      }

      o.lng = o.lng || fixedT.lng;
      o.lngs = o.lngs || fixedT.lngs;
      o.ns = o.ns || fixedT.ns;
      if (o.keyPrefix !== '') o.keyPrefix = o.keyPrefix || keyPrefix || fixedT.keyPrefix;

      const keySeparator = this.options.keySeparator || '.';
      let resultKey;
      if (o.keyPrefix && Array.isArray(key)) {
        resultKey = key.map(k => `${o.keyPrefix}${keySeparator}${k}`);
      } else {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uLWkxOG4ubWpzIiwic291cmNlcyI6WyJpMThuZXh0L3NyYy91dGlscy5qcyIsImkxOG5leHQvc3JjL2xvZ2dlci5qcyIsImkxOG5leHQvc3JjL0V2ZW50RW1pdHRlci5qcyIsImkxOG5leHQvc3JjL1Jlc291cmNlU3RvcmUuanMiLCJpMThuZXh0L3NyYy9wb3N0UHJvY2Vzc29yLmpzIiwiaTE4bmV4dC9zcmMvVHJhbnNsYXRvci5qcyIsImkxOG5leHQvc3JjL0xhbmd1YWdlVXRpbHMuanMiLCJpMThuZXh0L3NyYy9QbHVyYWxSZXNvbHZlci5qcyIsImkxOG5leHQvc3JjL0ludGVycG9sYXRvci5qcyIsImkxOG5leHQvc3JjL0Zvcm1hdHRlci5qcyIsImkxOG5leHQvc3JjL0JhY2tlbmRDb25uZWN0b3IuanMiLCJpMThuZXh0L3NyYy9kZWZhdWx0cy5qcyIsImkxOG5leHQvc3JjL2kxOG5leHQuanMiLCJpMThuZXh0L3NyYy9pbmRleC5qcyIsImluZGV4LnRzIl0sInNvdXJjZXNDb250ZW50IjpbImV4cG9ydCBjb25zdCBpc1N0cmluZyA9IChvYmopID0+IHR5cGVvZiBvYmogPT09ICdzdHJpbmcnO1xuXG4vLyBodHRwOi8vbGVhLnZlcm91Lm1lLzIwMTYvMTIvcmVzb2x2ZS1wcm9taXNlcy1leHRlcm5hbGx5LXdpdGgtdGhpcy1vbmUtd2VpcmQtdHJpY2svXG5leHBvcnQgY29uc3QgZGVmZXIgPSAoKSA9PiB7XG4gIGxldCByZXM7XG4gIGxldCByZWo7XG5cbiAgY29uc3QgcHJvbWlzZSA9IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICByZXMgPSByZXNvbHZlO1xuICAgIHJlaiA9IHJlamVjdDtcbiAgfSk7XG5cbiAgcHJvbWlzZS5yZXNvbHZlID0gcmVzO1xuICBwcm9taXNlLnJlamVjdCA9IHJlajtcblxuICByZXR1cm4gcHJvbWlzZTtcbn07XG5cbmV4cG9ydCBjb25zdCBtYWtlU3RyaW5nID0gKG9iamVjdCkgPT4ge1xuICBpZiAob2JqZWN0ID09IG51bGwpIHJldHVybiAnJztcbiAgLyogZXNsaW50IHByZWZlci10ZW1wbGF0ZTogMCAqL1xuICByZXR1cm4gJycgKyBvYmplY3Q7XG59O1xuXG5leHBvcnQgY29uc3QgY29weSA9IChhLCBzLCB0KSA9PiB7XG4gIGEuZm9yRWFjaCgobSkgPT4ge1xuICAgIGlmIChzW21dKSB0W21dID0gc1ttXTtcbiAgfSk7XG59O1xuXG4vLyBXZSBleHRyYWN0IG91dCB0aGUgUmVnRXhwIGRlZmluaXRpb24gdG8gaW1wcm92ZSBwZXJmb3JtYW5jZSB3aXRoIFJlYWN0IE5hdGl2ZSBBbmRyb2lkLCB3aGljaCBoYXMgcG9vciBSZWdFeHBcbi8vIGluaXRpYWxpemF0aW9uIHBlcmZvcm1hbmNlXG5jb25zdCBsYXN0T2ZQYXRoU2VwYXJhdG9yUmVnRXhwID0gLyMjIy9nO1xuXG5jb25zdCBjbGVhbktleSA9IChrZXkpID0+XG4gIGtleSAmJiBrZXkuaW5kZXhPZignIyMjJykgPiAtMSA/IGtleS5yZXBsYWNlKGxhc3RPZlBhdGhTZXBhcmF0b3JSZWdFeHAsICcuJykgOiBrZXk7XG5cbmNvbnN0IGNhbk5vdFRyYXZlcnNlRGVlcGVyID0gKG9iamVjdCkgPT4gIW9iamVjdCB8fCBpc1N0cmluZyhvYmplY3QpO1xuXG5jb25zdCBnZXRMYXN0T2ZQYXRoID0gKG9iamVjdCwgcGF0aCwgRW1wdHkpID0+IHtcbiAgY29uc3Qgc3RhY2sgPSAhaXNTdHJpbmcocGF0aCkgPyBwYXRoIDogcGF0aC5zcGxpdCgnLicpO1xuICBsZXQgc3RhY2tJbmRleCA9IDA7XG4gIC8vIGl0ZXJhdGUgdGhyb3VnaCB0aGUgc3RhY2ssIGJ1dCBsZWF2ZSB0aGUgbGFzdCBpdGVtXG4gIHdoaWxlIChzdGFja0luZGV4IDwgc3RhY2subGVuZ3RoIC0gMSkge1xuICAgIGlmIChjYW5Ob3RUcmF2ZXJzZURlZXBlcihvYmplY3QpKSByZXR1cm4ge307XG5cbiAgICBjb25zdCBrZXkgPSBjbGVhbktleShzdGFja1tzdGFja0luZGV4XSk7XG4gICAgaWYgKCFvYmplY3Rba2V5XSAmJiBFbXB0eSkgb2JqZWN0W2tleV0gPSBuZXcgRW1wdHkoKTtcbiAgICAvLyBwcmV2ZW50IHByb3RvdHlwZSBwb2xsdXRpb25cbiAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iamVjdCwga2V5KSkge1xuICAgICAgb2JqZWN0ID0gb2JqZWN0W2tleV07XG4gICAgfSBlbHNlIHtcbiAgICAgIG9iamVjdCA9IHt9O1xuICAgIH1cbiAgICArK3N0YWNrSW5kZXg7XG4gIH1cblxuICBpZiAoY2FuTm90VHJhdmVyc2VEZWVwZXIob2JqZWN0KSkgcmV0dXJuIHt9O1xuICByZXR1cm4ge1xuICAgIG9iajogb2JqZWN0LFxuICAgIGs6IGNsZWFuS2V5KHN0YWNrW3N0YWNrSW5kZXhdKSxcbiAgfTtcbn07XG5cbmV4cG9ydCBjb25zdCBzZXRQYXRoID0gKG9iamVjdCwgcGF0aCwgbmV3VmFsdWUpID0+IHtcbiAgY29uc3QgeyBvYmosIGsgfSA9IGdldExhc3RPZlBhdGgob2JqZWN0LCBwYXRoLCBPYmplY3QpO1xuICBpZiAob2JqICE9PSB1bmRlZmluZWQgfHwgcGF0aC5sZW5ndGggPT09IDEpIHtcbiAgICBvYmpba10gPSBuZXdWYWx1ZTtcbiAgICByZXR1cm47XG4gIH1cblxuICBsZXQgZSA9IHBhdGhbcGF0aC5sZW5ndGggLSAxXTtcbiAgbGV0IHAgPSBwYXRoLnNsaWNlKDAsIHBhdGgubGVuZ3RoIC0gMSk7XG4gIGxldCBsYXN0ID0gZ2V0TGFzdE9mUGF0aChvYmplY3QsIHAsIE9iamVjdCk7XG4gIHdoaWxlIChsYXN0Lm9iaiA9PT0gdW5kZWZpbmVkICYmIHAubGVuZ3RoKSB7XG4gICAgZSA9IGAke3BbcC5sZW5ndGggLSAxXX0uJHtlfWA7XG4gICAgcCA9IHAuc2xpY2UoMCwgcC5sZW5ndGggLSAxKTtcbiAgICBsYXN0ID0gZ2V0TGFzdE9mUGF0aChvYmplY3QsIHAsIE9iamVjdCk7XG4gICAgaWYgKGxhc3Q/Lm9iaiAmJiB0eXBlb2YgbGFzdC5vYmpbYCR7bGFzdC5rfS4ke2V9YF0gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICBsYXN0Lm9iaiA9IHVuZGVmaW5lZDtcbiAgICB9XG4gIH1cbiAgbGFzdC5vYmpbYCR7bGFzdC5rfS4ke2V9YF0gPSBuZXdWYWx1ZTtcbn07XG5cbmV4cG9ydCBjb25zdCBwdXNoUGF0aCA9IChvYmplY3QsIHBhdGgsIG5ld1ZhbHVlLCBjb25jYXQpID0+IHtcbiAgY29uc3QgeyBvYmosIGsgfSA9IGdldExhc3RPZlBhdGgob2JqZWN0LCBwYXRoLCBPYmplY3QpO1xuXG4gIG9ialtrXSA9IG9ialtrXSB8fCBbXTtcbiAgaWYgKGNvbmNhdCkgb2JqW2tdID0gb2JqW2tdLmNvbmNhdChuZXdWYWx1ZSk7XG4gIGlmICghY29uY2F0KSBvYmpba10ucHVzaChuZXdWYWx1ZSk7XG59O1xuXG5leHBvcnQgY29uc3QgZ2V0UGF0aCA9IChvYmplY3QsIHBhdGgpID0+IHtcbiAgY29uc3QgeyBvYmosIGsgfSA9IGdldExhc3RPZlBhdGgob2JqZWN0LCBwYXRoKTtcblxuICBpZiAoIW9iaikgcmV0dXJuIHVuZGVmaW5lZDtcbiAgaWYgKCFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBrKSkgcmV0dXJuIHVuZGVmaW5lZDtcbiAgcmV0dXJuIG9ialtrXTtcbn07XG5cbmV4cG9ydCBjb25zdCBnZXRQYXRoV2l0aERlZmF1bHRzID0gKGRhdGEsIGRlZmF1bHREYXRhLCBrZXkpID0+IHtcbiAgY29uc3QgdmFsdWUgPSBnZXRQYXRoKGRhdGEsIGtleSk7XG4gIGlmICh2YWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIHZhbHVlO1xuICB9XG4gIC8vIEZhbGxiYWNrIHRvIGRlZmF1bHQgdmFsdWVzXG4gIHJldHVybiBnZXRQYXRoKGRlZmF1bHREYXRhLCBrZXkpO1xufTtcblxuZXhwb3J0IGNvbnN0IGRlZXBFeHRlbmQgPSAodGFyZ2V0LCBzb3VyY2UsIG92ZXJ3cml0ZSkgPT4ge1xuICAvKiBlc2xpbnQgbm8tcmVzdHJpY3RlZC1zeW50YXg6IDAgKi9cbiAgZm9yIChjb25zdCBwcm9wIGluIHNvdXJjZSkge1xuICAgIGlmIChwcm9wICE9PSAnX19wcm90b19fJyAmJiBwcm9wICE9PSAnY29uc3RydWN0b3InKSB7XG4gICAgICBpZiAocHJvcCBpbiB0YXJnZXQpIHtcbiAgICAgICAgLy8gSWYgd2UgcmVhY2hlZCBhIGxlYWYgc3RyaW5nIGluIHRhcmdldCBvciBzb3VyY2UgdGhlbiByZXBsYWNlIHdpdGggc291cmNlIG9yIHNraXAgZGVwZW5kaW5nIG9uIHRoZSAnb3ZlcndyaXRlJyBzd2l0Y2hcbiAgICAgICAgaWYgKFxuICAgICAgICAgIGlzU3RyaW5nKHRhcmdldFtwcm9wXSkgfHxcbiAgICAgICAgICB0YXJnZXRbcHJvcF0gaW5zdGFuY2VvZiBTdHJpbmcgfHxcbiAgICAgICAgICBpc1N0cmluZyhzb3VyY2VbcHJvcF0pIHx8XG4gICAgICAgICAgc291cmNlW3Byb3BdIGluc3RhbmNlb2YgU3RyaW5nXG4gICAgICAgICkge1xuICAgICAgICAgIGlmIChvdmVyd3JpdGUpIHRhcmdldFtwcm9wXSA9IHNvdXJjZVtwcm9wXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBkZWVwRXh0ZW5kKHRhcmdldFtwcm9wXSwgc291cmNlW3Byb3BdLCBvdmVyd3JpdGUpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0YXJnZXRbcHJvcF0gPSBzb3VyY2VbcHJvcF07XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiB0YXJnZXQ7XG59O1xuXG5leHBvcnQgY29uc3QgcmVnZXhFc2NhcGUgPSAoc3RyKSA9PlxuICAvKiBlc2xpbnQgbm8tdXNlbGVzcy1lc2NhcGU6IDAgKi9cbiAgc3RyLnJlcGxhY2UoL1tcXC1cXFtcXF1cXC9cXHtcXH1cXChcXClcXCpcXCtcXD9cXC5cXFxcXFxeXFwkXFx8XS9nLCAnXFxcXCQmJyk7XG5cbi8qIGVzbGludC1kaXNhYmxlICovXG52YXIgX2VudGl0eU1hcCA9IHtcbiAgJyYnOiAnJmFtcDsnLFxuICAnPCc6ICcmbHQ7JyxcbiAgJz4nOiAnJmd0OycsXG4gICdcIic6ICcmcXVvdDsnLFxuICBcIidcIjogJyYjMzk7JyxcbiAgJy8nOiAnJiN4MkY7Jyxcbn07XG4vKiBlc2xpbnQtZW5hYmxlICovXG5cbmV4cG9ydCBjb25zdCBlc2NhcGUgPSAoZGF0YSkgPT4ge1xuICBpZiAoaXNTdHJpbmcoZGF0YSkpIHtcbiAgICByZXR1cm4gZGF0YS5yZXBsYWNlKC9bJjw+XCInXFwvXS9nLCAocykgPT4gX2VudGl0eU1hcFtzXSk7XG4gIH1cblxuICByZXR1cm4gZGF0YTtcbn07XG5cbi8qKlxuICogVGhpcyBpcyBhIHJldXNhYmxlIHJlZ3VsYXIgZXhwcmVzc2lvbiBjYWNoZSBjbGFzcy4gR2l2ZW4gYSBjZXJ0YWluIG1heGltdW0gbnVtYmVyIG9mIHJlZ3VsYXIgZXhwcmVzc2lvbnMgd2UncmVcbiAqIGFsbG93ZWQgdG8gc3RvcmUgaW4gdGhlIGNhY2hlLCBpdCBwcm92aWRlcyBhIHdheSB0byBhdm9pZCByZWNyZWF0aW5nIHJlZ3VsYXIgZXhwcmVzc2lvbiBvYmplY3RzIG92ZXIgYW5kIG92ZXIuXG4gKiBXaGVuIGl0IG5lZWRzIHRvIGV2aWN0IHNvbWV0aGluZywgaXQgZXZpY3RzIHRoZSBvbGRlc3Qgb25lLlxuICovXG5jbGFzcyBSZWdFeHBDYWNoZSB7XG4gIGNvbnN0cnVjdG9yKGNhcGFjaXR5KSB7XG4gICAgdGhpcy5jYXBhY2l0eSA9IGNhcGFjaXR5O1xuICAgIHRoaXMucmVnRXhwTWFwID0gbmV3IE1hcCgpO1xuICAgIC8vIFNpbmNlIG91ciBjYXBhY2l0eSB0ZW5kcyB0byBiZSBmYWlybHkgc21hbGwsIGAuc2hpZnQoKWAgd2lsbCBiZSBmYWlybHkgcXVpY2sgZGVzcGl0ZSBiZWluZyBPKG4pLiBXZSBqdXN0IHVzZSBhXG4gICAgLy8gbm9ybWFsIGFycmF5IHRvIGtlZXAgaXQgc2ltcGxlLlxuICAgIHRoaXMucmVnRXhwUXVldWUgPSBbXTtcbiAgfVxuXG4gIGdldFJlZ0V4cChwYXR0ZXJuKSB7XG4gICAgY29uc3QgcmVnRXhwRnJvbUNhY2hlID0gdGhpcy5yZWdFeHBNYXAuZ2V0KHBhdHRlcm4pO1xuICAgIGlmIChyZWdFeHBGcm9tQ2FjaGUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIHJlZ0V4cEZyb21DYWNoZTtcbiAgICB9XG4gICAgY29uc3QgcmVnRXhwTmV3ID0gbmV3IFJlZ0V4cChwYXR0ZXJuKTtcbiAgICBpZiAodGhpcy5yZWdFeHBRdWV1ZS5sZW5ndGggPT09IHRoaXMuY2FwYWNpdHkpIHtcbiAgICAgIHRoaXMucmVnRXhwTWFwLmRlbGV0ZSh0aGlzLnJlZ0V4cFF1ZXVlLnNoaWZ0KCkpO1xuICAgIH1cbiAgICB0aGlzLnJlZ0V4cE1hcC5zZXQocGF0dGVybiwgcmVnRXhwTmV3KTtcbiAgICB0aGlzLnJlZ0V4cFF1ZXVlLnB1c2gocGF0dGVybik7XG4gICAgcmV0dXJuIHJlZ0V4cE5ldztcbiAgfVxufVxuXG5jb25zdCBjaGFycyA9IFsnICcsICcsJywgJz8nLCAnIScsICc7J107XG4vLyBXZSBjYWNoZSBSZWdFeHBzIHRvIGltcHJvdmUgcGVyZm9ybWFuY2Ugd2l0aCBSZWFjdCBOYXRpdmUgQW5kcm9pZCwgd2hpY2ggaGFzIHBvb3IgUmVnRXhwIGluaXRpYWxpemF0aW9uIHBlcmZvcm1hbmNlLlxuLy8gQ2FwYWNpdHkgb2YgMjAgc2hvdWxkIGJlIHBsZW50eSwgYXMgbnNTZXBhcmF0b3Iva2V5U2VwYXJhdG9yIGRvbid0IHRlbmQgdG8gdmFyeSBtdWNoIGFjcm9zcyBjYWxscy5cbmNvbnN0IGxvb2tzTGlrZU9iamVjdFBhdGhSZWdFeHBDYWNoZSA9IG5ldyBSZWdFeHBDYWNoZSgyMCk7XG5cbmV4cG9ydCBjb25zdCBsb29rc0xpa2VPYmplY3RQYXRoID0gKGtleSwgbnNTZXBhcmF0b3IsIGtleVNlcGFyYXRvcikgPT4ge1xuICBuc1NlcGFyYXRvciA9IG5zU2VwYXJhdG9yIHx8ICcnO1xuICBrZXlTZXBhcmF0b3IgPSBrZXlTZXBhcmF0b3IgfHwgJyc7XG4gIGNvbnN0IHBvc3NpYmxlQ2hhcnMgPSBjaGFycy5maWx0ZXIoXG4gICAgKGMpID0+IG5zU2VwYXJhdG9yLmluZGV4T2YoYykgPCAwICYmIGtleVNlcGFyYXRvci5pbmRleE9mKGMpIDwgMCxcbiAgKTtcbiAgaWYgKHBvc3NpYmxlQ2hhcnMubGVuZ3RoID09PSAwKSByZXR1cm4gdHJ1ZTtcbiAgY29uc3QgciA9IGxvb2tzTGlrZU9iamVjdFBhdGhSZWdFeHBDYWNoZS5nZXRSZWdFeHAoXG4gICAgYCgke3Bvc3NpYmxlQ2hhcnMubWFwKChjKSA9PiAoYyA9PT0gJz8nID8gJ1xcXFw/JyA6IGMpKS5qb2luKCd8Jyl9KWAsXG4gICk7XG4gIGxldCBtYXRjaGVkID0gIXIudGVzdChrZXkpO1xuICBpZiAoIW1hdGNoZWQpIHtcbiAgICBjb25zdCBraSA9IGtleS5pbmRleE9mKGtleVNlcGFyYXRvcik7XG4gICAgaWYgKGtpID4gMCAmJiAhci50ZXN0KGtleS5zdWJzdHJpbmcoMCwga2kpKSkge1xuICAgICAgbWF0Y2hlZCA9IHRydWU7XG4gICAgfVxuICB9XG4gIHJldHVybiBtYXRjaGVkO1xufTtcblxuLyoqXG4gKiBHaXZlblxuICpcbiAqIDEuIGEgdG9wIGxldmVsIG9iamVjdCBvYmosIGFuZFxuICogMi4gYSBwYXRoIHRvIGEgZGVlcGx5IG5lc3RlZCBzdHJpbmcgb3Igb2JqZWN0IHdpdGhpbiBpdFxuICpcbiAqIEZpbmQgYW5kIHJldHVybiB0aGF0IGRlZXBseSBuZXN0ZWQgc3RyaW5nIG9yIG9iamVjdC4gVGhlIGNhdmVhdCBpcyB0aGF0IHRoZSBrZXlzIG9mIG9iamVjdHMgd2l0aGluIHRoZSBuZXN0aW5nIGNoYWluXG4gKiBtYXkgY29udGFpbiBwZXJpb2QgY2hhcmFjdGVycy4gVGhlcmVmb3JlLCB3ZSBuZWVkIHRvIERGUyBhbmQgZXhwbG9yZSBhbGwgcG9zc2libGUga2V5cyBhdCBlYWNoIHN0ZXAgdW50aWwgd2UgZmluZCB0aGVcbiAqIGRlZXBseSBuZXN0ZWQgc3RyaW5nIG9yIG9iamVjdC5cbiAqL1xuZXhwb3J0IGNvbnN0IGRlZXBGaW5kID0gKG9iaiwgcGF0aCwga2V5U2VwYXJhdG9yID0gJy4nKSA9PiB7XG4gIGlmICghb2JqKSByZXR1cm4gdW5kZWZpbmVkO1xuICBpZiAob2JqW3BhdGhdKSB7XG4gICAgaWYgKCFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBwYXRoKSkgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICByZXR1cm4gb2JqW3BhdGhdO1xuICB9XG4gIGNvbnN0IHRva2VucyA9IHBhdGguc3BsaXQoa2V5U2VwYXJhdG9yKTtcbiAgbGV0IGN1cnJlbnQgPSBvYmo7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgdG9rZW5zLmxlbmd0aDsgKSB7XG4gICAgaWYgKCFjdXJyZW50IHx8IHR5cGVvZiBjdXJyZW50ICE9PSAnb2JqZWN0Jykge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgbGV0IG5leHQ7XG4gICAgbGV0IG5leHRQYXRoID0gJyc7XG4gICAgZm9yIChsZXQgaiA9IGk7IGogPCB0b2tlbnMubGVuZ3RoOyArK2opIHtcbiAgICAgIGlmIChqICE9PSBpKSB7XG4gICAgICAgIG5leHRQYXRoICs9IGtleVNlcGFyYXRvcjtcbiAgICAgIH1cbiAgICAgIG5leHRQYXRoICs9IHRva2Vuc1tqXTtcbiAgICAgIG5leHQgPSBjdXJyZW50W25leHRQYXRoXTtcbiAgICAgIGlmIChuZXh0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaWYgKFsnc3RyaW5nJywgJ251bWJlcicsICdib29sZWFuJ10uaW5kZXhPZih0eXBlb2YgbmV4dCkgPiAtMSAmJiBqIDwgdG9rZW5zLmxlbmd0aCAtIDEpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBpICs9IGogLSBpICsgMTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICAgIGN1cnJlbnQgPSBuZXh0O1xuICB9XG4gIHJldHVybiBjdXJyZW50O1xufTtcblxuZXhwb3J0IGNvbnN0IGdldENsZWFuZWRDb2RlID0gKGNvZGUpID0+IGNvZGU/LnJlcGxhY2UoJ18nLCAnLScpO1xuIiwiaW1wb3J0IHsgaXNTdHJpbmcgfSBmcm9tICcuL3V0aWxzLmpzJztcblxuY29uc3QgY29uc29sZUxvZ2dlciA9IHtcbiAgdHlwZTogJ2xvZ2dlcicsXG5cbiAgbG9nKGFyZ3MpIHtcbiAgICB0aGlzLm91dHB1dCgnbG9nJywgYXJncyk7XG4gIH0sXG5cbiAgd2FybihhcmdzKSB7XG4gICAgdGhpcy5vdXRwdXQoJ3dhcm4nLCBhcmdzKTtcbiAgfSxcblxuICBlcnJvcihhcmdzKSB7XG4gICAgdGhpcy5vdXRwdXQoJ2Vycm9yJywgYXJncyk7XG4gIH0sXG5cbiAgb3V0cHV0KHR5cGUsIGFyZ3MpIHtcbiAgICAvKiBlc2xpbnQgbm8tY29uc29sZTogMCAqL1xuICAgIGNvbnNvbGU/Llt0eXBlXT8uYXBwbHk/Lihjb25zb2xlLCBhcmdzKTtcbiAgfSxcbn07XG5cbmNsYXNzIExvZ2dlciB7XG4gIGNvbnN0cnVjdG9yKGNvbmNyZXRlTG9nZ2VyLCBvcHRpb25zID0ge30pIHtcbiAgICB0aGlzLmluaXQoY29uY3JldGVMb2dnZXIsIG9wdGlvbnMpO1xuICB9XG5cbiAgaW5pdChjb25jcmV0ZUxvZ2dlciwgb3B0aW9ucyA9IHt9KSB7XG4gICAgdGhpcy5wcmVmaXggPSBvcHRpb25zLnByZWZpeCB8fCAnaTE4bmV4dDonO1xuICAgIHRoaXMubG9nZ2VyID0gY29uY3JldGVMb2dnZXIgfHwgY29uc29sZUxvZ2dlcjtcbiAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuICAgIHRoaXMuZGVidWcgPSBvcHRpb25zLmRlYnVnO1xuICB9XG5cbiAgbG9nKC4uLmFyZ3MpIHtcbiAgICByZXR1cm4gdGhpcy5mb3J3YXJkKGFyZ3MsICdsb2cnLCAnJywgdHJ1ZSk7XG4gIH1cblxuICB3YXJuKC4uLmFyZ3MpIHtcbiAgICByZXR1cm4gdGhpcy5mb3J3YXJkKGFyZ3MsICd3YXJuJywgJycsIHRydWUpO1xuICB9XG5cbiAgZXJyb3IoLi4uYXJncykge1xuICAgIHJldHVybiB0aGlzLmZvcndhcmQoYXJncywgJ2Vycm9yJywgJycpO1xuICB9XG5cbiAgZGVwcmVjYXRlKC4uLmFyZ3MpIHtcbiAgICByZXR1cm4gdGhpcy5mb3J3YXJkKGFyZ3MsICd3YXJuJywgJ1dBUk5JTkcgREVQUkVDQVRFRDogJywgdHJ1ZSk7XG4gIH1cblxuICBmb3J3YXJkKGFyZ3MsIGx2bCwgcHJlZml4LCBkZWJ1Z09ubHkpIHtcbiAgICBpZiAoZGVidWdPbmx5ICYmICF0aGlzLmRlYnVnKSByZXR1cm4gbnVsbDtcbiAgICBpZiAoaXNTdHJpbmcoYXJnc1swXSkpIGFyZ3NbMF0gPSBgJHtwcmVmaXh9JHt0aGlzLnByZWZpeH0gJHthcmdzWzBdfWA7XG4gICAgcmV0dXJuIHRoaXMubG9nZ2VyW2x2bF0oYXJncyk7XG4gIH1cblxuICBjcmVhdGUobW9kdWxlTmFtZSkge1xuICAgIHJldHVybiBuZXcgTG9nZ2VyKHRoaXMubG9nZ2VyLCB7XG4gICAgICAuLi57IHByZWZpeDogYCR7dGhpcy5wcmVmaXh9OiR7bW9kdWxlTmFtZX06YCB9LFxuICAgICAgLi4udGhpcy5vcHRpb25zLFxuICAgIH0pO1xuICB9XG5cbiAgY2xvbmUob3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHRoaXMub3B0aW9ucztcbiAgICBvcHRpb25zLnByZWZpeCA9IG9wdGlvbnMucHJlZml4IHx8IHRoaXMucHJlZml4O1xuICAgIHJldHVybiBuZXcgTG9nZ2VyKHRoaXMubG9nZ2VyLCBvcHRpb25zKTtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBuZXcgTG9nZ2VyKCk7XG4iLCJjbGFzcyBFdmVudEVtaXR0ZXIge1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICAvLyBUaGlzIGlzIGFuIE9iamVjdCBjb250YWluaW5nIE1hcHM6XG4gICAgLy9cbiAgICAvLyB7IFtldmVudDogc3RyaW5nXTogTWFwPGxpc3RlbmVyOiBmdW5jdGlvbiwgbnVtVGltZXNBZGRlZDogbnVtYmVyPiB9XG4gICAgLy9cbiAgICAvLyBXZSB1c2UgYSBNYXAgZm9yIE8oMSkgaW5zZXJ0aW9uL2RlbGV0aW9uIGFuZCBiZWNhdXNlIGl0IGNhbiBoYXZlIGZ1bmN0aW9ucyBhcyBrZXlzLlxuICAgIC8vXG4gICAgLy8gV2Uga2VlcCB0cmFjayBvZiBudW1UaW1lc0FkZGVkICh0aGUgbnVtYmVyIG9mIHRpbWVzIGl0IHdhcyBhZGRlZCkgYmVjYXVzZSBpZiB5b3UgYXR0YWNoIHRoZSBzYW1lIGxpc3RlbmVyIHR3aWNlLFxuICAgIC8vIHdlIHNob3VsZCBhY3R1YWxseSBjYWxsIGl0IHR3aWNlIGZvciBlYWNoIGVtaXR0ZWQgZXZlbnQuXG4gICAgdGhpcy5vYnNlcnZlcnMgPSB7fTtcbiAgfVxuXG4gIG9uKGV2ZW50cywgbGlzdGVuZXIpIHtcbiAgICBldmVudHMuc3BsaXQoJyAnKS5mb3JFYWNoKChldmVudCkgPT4ge1xuICAgICAgaWYgKCF0aGlzLm9ic2VydmVyc1tldmVudF0pIHRoaXMub2JzZXJ2ZXJzW2V2ZW50XSA9IG5ldyBNYXAoKTtcbiAgICAgIGNvbnN0IG51bUxpc3RlbmVycyA9IHRoaXMub2JzZXJ2ZXJzW2V2ZW50XS5nZXQobGlzdGVuZXIpIHx8IDA7XG4gICAgICB0aGlzLm9ic2VydmVyc1tldmVudF0uc2V0KGxpc3RlbmVyLCBudW1MaXN0ZW5lcnMgKyAxKTtcbiAgICB9KTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIG9mZihldmVudCwgbGlzdGVuZXIpIHtcbiAgICBpZiAoIXRoaXMub2JzZXJ2ZXJzW2V2ZW50XSkgcmV0dXJuO1xuICAgIGlmICghbGlzdGVuZXIpIHtcbiAgICAgIGRlbGV0ZSB0aGlzLm9ic2VydmVyc1tldmVudF07XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5vYnNlcnZlcnNbZXZlbnRdLmRlbGV0ZShsaXN0ZW5lcik7XG4gIH1cblxuICBlbWl0KGV2ZW50LCAuLi5hcmdzKSB7XG4gICAgaWYgKHRoaXMub2JzZXJ2ZXJzW2V2ZW50XSkge1xuICAgICAgY29uc3QgY2xvbmVkID0gQXJyYXkuZnJvbSh0aGlzLm9ic2VydmVyc1tldmVudF0uZW50cmllcygpKTtcbiAgICAgIGNsb25lZC5mb3JFYWNoKChbb2JzZXJ2ZXIsIG51bVRpbWVzQWRkZWRdKSA9PiB7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbnVtVGltZXNBZGRlZDsgaSsrKSB7XG4gICAgICAgICAgb2JzZXJ2ZXIoLi4uYXJncyk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm9ic2VydmVyc1snKiddKSB7XG4gICAgICBjb25zdCBjbG9uZWQgPSBBcnJheS5mcm9tKHRoaXMub2JzZXJ2ZXJzWycqJ10uZW50cmllcygpKTtcbiAgICAgIGNsb25lZC5mb3JFYWNoKChbb2JzZXJ2ZXIsIG51bVRpbWVzQWRkZWRdKSA9PiB7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbnVtVGltZXNBZGRlZDsgaSsrKSB7XG4gICAgICAgICAgb2JzZXJ2ZXIuYXBwbHkob2JzZXJ2ZXIsIFtldmVudCwgLi4uYXJnc10pO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgRXZlbnRFbWl0dGVyO1xuIiwiaW1wb3J0IEV2ZW50RW1pdHRlciBmcm9tICcuL0V2ZW50RW1pdHRlci5qcyc7XG5pbXBvcnQgeyBnZXRQYXRoLCBkZWVwRmluZCwgc2V0UGF0aCwgZGVlcEV4dGVuZCwgaXNTdHJpbmcgfSBmcm9tICcuL3V0aWxzLmpzJztcblxuY2xhc3MgUmVzb3VyY2VTdG9yZSBleHRlbmRzIEV2ZW50RW1pdHRlciB7XG4gIGNvbnN0cnVjdG9yKGRhdGEsIG9wdGlvbnMgPSB7IG5zOiBbJ3RyYW5zbGF0aW9uJ10sIGRlZmF1bHROUzogJ3RyYW5zbGF0aW9uJyB9KSB7XG4gICAgc3VwZXIoKTtcblxuICAgIHRoaXMuZGF0YSA9IGRhdGEgfHwge307XG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcbiAgICBpZiAodGhpcy5vcHRpb25zLmtleVNlcGFyYXRvciA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzLm9wdGlvbnMua2V5U2VwYXJhdG9yID0gJy4nO1xuICAgIH1cbiAgICBpZiAodGhpcy5vcHRpb25zLmlnbm9yZUpTT05TdHJ1Y3R1cmUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5vcHRpb25zLmlnbm9yZUpTT05TdHJ1Y3R1cmUgPSB0cnVlO1xuICAgIH1cbiAgfVxuXG4gIGFkZE5hbWVzcGFjZXMobnMpIHtcbiAgICBpZiAodGhpcy5vcHRpb25zLm5zLmluZGV4T2YobnMpIDwgMCkge1xuICAgICAgdGhpcy5vcHRpb25zLm5zLnB1c2gobnMpO1xuICAgIH1cbiAgfVxuXG4gIHJlbW92ZU5hbWVzcGFjZXMobnMpIHtcbiAgICBjb25zdCBpbmRleCA9IHRoaXMub3B0aW9ucy5ucy5pbmRleE9mKG5zKTtcbiAgICBpZiAoaW5kZXggPiAtMSkge1xuICAgICAgdGhpcy5vcHRpb25zLm5zLnNwbGljZShpbmRleCwgMSk7XG4gICAgfVxuICB9XG5cbiAgZ2V0UmVzb3VyY2UobG5nLCBucywga2V5LCBvcHRpb25zID0ge30pIHtcbiAgICBjb25zdCBrZXlTZXBhcmF0b3IgPVxuICAgICAgb3B0aW9ucy5rZXlTZXBhcmF0b3IgIT09IHVuZGVmaW5lZCA/IG9wdGlvbnMua2V5U2VwYXJhdG9yIDogdGhpcy5vcHRpb25zLmtleVNlcGFyYXRvcjtcblxuICAgIGNvbnN0IGlnbm9yZUpTT05TdHJ1Y3R1cmUgPVxuICAgICAgb3B0aW9ucy5pZ25vcmVKU09OU3RydWN0dXJlICE9PSB1bmRlZmluZWRcbiAgICAgICAgPyBvcHRpb25zLmlnbm9yZUpTT05TdHJ1Y3R1cmVcbiAgICAgICAgOiB0aGlzLm9wdGlvbnMuaWdub3JlSlNPTlN0cnVjdHVyZTtcblxuICAgIGxldCBwYXRoO1xuICAgIGlmIChsbmcuaW5kZXhPZignLicpID4gLTEpIHtcbiAgICAgIHBhdGggPSBsbmcuc3BsaXQoJy4nKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcGF0aCA9IFtsbmcsIG5zXTtcbiAgICAgIGlmIChrZXkpIHtcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoa2V5KSkge1xuICAgICAgICAgIHBhdGgucHVzaCguLi5rZXkpO1xuICAgICAgICB9IGVsc2UgaWYgKGlzU3RyaW5nKGtleSkgJiYga2V5U2VwYXJhdG9yKSB7XG4gICAgICAgICAgcGF0aC5wdXNoKC4uLmtleS5zcGxpdChrZXlTZXBhcmF0b3IpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBwYXRoLnB1c2goa2V5KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IHJlc3VsdCA9IGdldFBhdGgodGhpcy5kYXRhLCBwYXRoKTtcbiAgICBpZiAoIXJlc3VsdCAmJiAhbnMgJiYgIWtleSAmJiBsbmcuaW5kZXhPZignLicpID4gLTEpIHtcbiAgICAgIGxuZyA9IHBhdGhbMF07XG4gICAgICBucyA9IHBhdGhbMV07XG4gICAgICBrZXkgPSBwYXRoLnNsaWNlKDIpLmpvaW4oJy4nKTtcbiAgICB9XG4gICAgaWYgKHJlc3VsdCB8fCAhaWdub3JlSlNPTlN0cnVjdHVyZSB8fCAhaXNTdHJpbmcoa2V5KSkgcmV0dXJuIHJlc3VsdDtcblxuICAgIHJldHVybiBkZWVwRmluZCh0aGlzLmRhdGE/LltsbmddPy5bbnNdLCBrZXksIGtleVNlcGFyYXRvcik7XG4gIH1cblxuICBhZGRSZXNvdXJjZShsbmcsIG5zLCBrZXksIHZhbHVlLCBvcHRpb25zID0geyBzaWxlbnQ6IGZhbHNlIH0pIHtcbiAgICBjb25zdCBrZXlTZXBhcmF0b3IgPVxuICAgICAgb3B0aW9ucy5rZXlTZXBhcmF0b3IgIT09IHVuZGVmaW5lZCA/IG9wdGlvbnMua2V5U2VwYXJhdG9yIDogdGhpcy5vcHRpb25zLmtleVNlcGFyYXRvcjtcblxuICAgIGxldCBwYXRoID0gW2xuZywgbnNdO1xuICAgIGlmIChrZXkpIHBhdGggPSBwYXRoLmNvbmNhdChrZXlTZXBhcmF0b3IgPyBrZXkuc3BsaXQoa2V5U2VwYXJhdG9yKSA6IGtleSk7XG5cbiAgICBpZiAobG5nLmluZGV4T2YoJy4nKSA+IC0xKSB7XG4gICAgICBwYXRoID0gbG5nLnNwbGl0KCcuJyk7XG4gICAgICB2YWx1ZSA9IG5zO1xuICAgICAgbnMgPSBwYXRoWzFdO1xuICAgIH1cblxuICAgIHRoaXMuYWRkTmFtZXNwYWNlcyhucyk7XG5cbiAgICBzZXRQYXRoKHRoaXMuZGF0YSwgcGF0aCwgdmFsdWUpO1xuXG4gICAgaWYgKCFvcHRpb25zLnNpbGVudCkgdGhpcy5lbWl0KCdhZGRlZCcsIGxuZywgbnMsIGtleSwgdmFsdWUpO1xuICB9XG5cbiAgYWRkUmVzb3VyY2VzKGxuZywgbnMsIHJlc291cmNlcywgb3B0aW9ucyA9IHsgc2lsZW50OiBmYWxzZSB9KSB7XG4gICAgLyogZXNsaW50IG5vLXJlc3RyaWN0ZWQtc3ludGF4OiAwICovXG4gICAgZm9yIChjb25zdCBtIGluIHJlc291cmNlcykge1xuICAgICAgaWYgKGlzU3RyaW5nKHJlc291cmNlc1ttXSkgfHwgQXJyYXkuaXNBcnJheShyZXNvdXJjZXNbbV0pKVxuICAgICAgICB0aGlzLmFkZFJlc291cmNlKGxuZywgbnMsIG0sIHJlc291cmNlc1ttXSwgeyBzaWxlbnQ6IHRydWUgfSk7XG4gICAgfVxuICAgIGlmICghb3B0aW9ucy5zaWxlbnQpIHRoaXMuZW1pdCgnYWRkZWQnLCBsbmcsIG5zLCByZXNvdXJjZXMpO1xuICB9XG5cbiAgYWRkUmVzb3VyY2VCdW5kbGUoXG4gICAgbG5nLFxuICAgIG5zLFxuICAgIHJlc291cmNlcyxcbiAgICBkZWVwLFxuICAgIG92ZXJ3cml0ZSxcbiAgICBvcHRpb25zID0geyBzaWxlbnQ6IGZhbHNlLCBza2lwQ29weTogZmFsc2UgfSxcbiAgKSB7XG4gICAgbGV0IHBhdGggPSBbbG5nLCBuc107XG4gICAgaWYgKGxuZy5pbmRleE9mKCcuJykgPiAtMSkge1xuICAgICAgcGF0aCA9IGxuZy5zcGxpdCgnLicpO1xuICAgICAgZGVlcCA9IHJlc291cmNlcztcbiAgICAgIHJlc291cmNlcyA9IG5zO1xuICAgICAgbnMgPSBwYXRoWzFdO1xuICAgIH1cblxuICAgIHRoaXMuYWRkTmFtZXNwYWNlcyhucyk7XG5cbiAgICBsZXQgcGFjayA9IGdldFBhdGgodGhpcy5kYXRhLCBwYXRoKSB8fCB7fTtcblxuICAgIGlmICghb3B0aW9ucy5za2lwQ29weSkgcmVzb3VyY2VzID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShyZXNvdXJjZXMpKTsgLy8gbWFrZSBhIGNvcHkgdG8gZml4ICMyMDgxXG5cbiAgICBpZiAoZGVlcCkge1xuICAgICAgZGVlcEV4dGVuZChwYWNrLCByZXNvdXJjZXMsIG92ZXJ3cml0ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHBhY2sgPSB7IC4uLnBhY2ssIC4uLnJlc291cmNlcyB9O1xuICAgIH1cblxuICAgIHNldFBhdGgodGhpcy5kYXRhLCBwYXRoLCBwYWNrKTtcblxuICAgIGlmICghb3B0aW9ucy5zaWxlbnQpIHRoaXMuZW1pdCgnYWRkZWQnLCBsbmcsIG5zLCByZXNvdXJjZXMpO1xuICB9XG5cbiAgcmVtb3ZlUmVzb3VyY2VCdW5kbGUobG5nLCBucykge1xuICAgIGlmICh0aGlzLmhhc1Jlc291cmNlQnVuZGxlKGxuZywgbnMpKSB7XG4gICAgICBkZWxldGUgdGhpcy5kYXRhW2xuZ11bbnNdO1xuICAgIH1cbiAgICB0aGlzLnJlbW92ZU5hbWVzcGFjZXMobnMpO1xuXG4gICAgdGhpcy5lbWl0KCdyZW1vdmVkJywgbG5nLCBucyk7XG4gIH1cblxuICBoYXNSZXNvdXJjZUJ1bmRsZShsbmcsIG5zKSB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0UmVzb3VyY2UobG5nLCBucykgIT09IHVuZGVmaW5lZDtcbiAgfVxuXG4gIGdldFJlc291cmNlQnVuZGxlKGxuZywgbnMpIHtcbiAgICBpZiAoIW5zKSBucyA9IHRoaXMub3B0aW9ucy5kZWZhdWx0TlM7XG4gICAgcmV0dXJuIHRoaXMuZ2V0UmVzb3VyY2UobG5nLCBucyk7XG4gIH1cblxuICBnZXREYXRhQnlMYW5ndWFnZShsbmcpIHtcbiAgICByZXR1cm4gdGhpcy5kYXRhW2xuZ107XG4gIH1cblxuICBoYXNMYW5ndWFnZVNvbWVUcmFuc2xhdGlvbnMobG5nKSB7XG4gICAgY29uc3QgZGF0YSA9IHRoaXMuZ2V0RGF0YUJ5TGFuZ3VhZ2UobG5nKTtcbiAgICBjb25zdCBuID0gKGRhdGEgJiYgT2JqZWN0LmtleXMoZGF0YSkpIHx8IFtdO1xuICAgIHJldHVybiAhIW4uZmluZCgodikgPT4gZGF0YVt2XSAmJiBPYmplY3Qua2V5cyhkYXRhW3ZdKS5sZW5ndGggPiAwKTtcbiAgfVxuXG4gIHRvSlNPTigpIHtcbiAgICByZXR1cm4gdGhpcy5kYXRhO1xuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IFJlc291cmNlU3RvcmU7XG4iLCJleHBvcnQgZGVmYXVsdCB7XG4gIHByb2Nlc3NvcnM6IHt9LFxuXG4gIGFkZFBvc3RQcm9jZXNzb3IobW9kdWxlKSB7XG4gICAgdGhpcy5wcm9jZXNzb3JzW21vZHVsZS5uYW1lXSA9IG1vZHVsZTtcbiAgfSxcblxuICBoYW5kbGUocHJvY2Vzc29ycywgdmFsdWUsIGtleSwgb3B0aW9ucywgdHJhbnNsYXRvcikge1xuICAgIHByb2Nlc3NvcnMuZm9yRWFjaCgocHJvY2Vzc29yKSA9PiB7XG4gICAgICB2YWx1ZSA9IHRoaXMucHJvY2Vzc29yc1twcm9jZXNzb3JdPy5wcm9jZXNzKHZhbHVlLCBrZXksIG9wdGlvbnMsIHRyYW5zbGF0b3IpID8/IHZhbHVlO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHZhbHVlO1xuICB9LFxufTtcbiIsImltcG9ydCBiYXNlTG9nZ2VyIGZyb20gJy4vbG9nZ2VyLmpzJztcbmltcG9ydCBFdmVudEVtaXR0ZXIgZnJvbSAnLi9FdmVudEVtaXR0ZXIuanMnO1xuaW1wb3J0IHBvc3RQcm9jZXNzb3IgZnJvbSAnLi9wb3N0UHJvY2Vzc29yLmpzJztcbmltcG9ydCB7IGNvcHkgYXMgdXRpbHNDb3B5LCBsb29rc0xpa2VPYmplY3RQYXRoLCBpc1N0cmluZyB9IGZyb20gJy4vdXRpbHMuanMnO1xuXG5jb25zdCBjaGVja2VkTG9hZGVkRm9yID0ge307XG5cbmNvbnN0IHNob3VsZEhhbmRsZUFzT2JqZWN0ID0gKHJlcykgPT5cbiAgIWlzU3RyaW5nKHJlcykgJiYgdHlwZW9mIHJlcyAhPT0gJ2Jvb2xlYW4nICYmIHR5cGVvZiByZXMgIT09ICdudW1iZXInO1xuXG5jbGFzcyBUcmFuc2xhdG9yIGV4dGVuZHMgRXZlbnRFbWl0dGVyIHtcbiAgY29uc3RydWN0b3Ioc2VydmljZXMsIG9wdGlvbnMgPSB7fSkge1xuICAgIHN1cGVyKCk7XG5cbiAgICB1dGlsc0NvcHkoXG4gICAgICBbXG4gICAgICAgICdyZXNvdXJjZVN0b3JlJyxcbiAgICAgICAgJ2xhbmd1YWdlVXRpbHMnLFxuICAgICAgICAncGx1cmFsUmVzb2x2ZXInLFxuICAgICAgICAnaW50ZXJwb2xhdG9yJyxcbiAgICAgICAgJ2JhY2tlbmRDb25uZWN0b3InLFxuICAgICAgICAnaTE4bkZvcm1hdCcsXG4gICAgICAgICd1dGlscycsXG4gICAgICBdLFxuICAgICAgc2VydmljZXMsXG4gICAgICB0aGlzLFxuICAgICk7XG5cbiAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuICAgIGlmICh0aGlzLm9wdGlvbnMua2V5U2VwYXJhdG9yID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMub3B0aW9ucy5rZXlTZXBhcmF0b3IgPSAnLic7XG4gICAgfVxuXG4gICAgdGhpcy5sb2dnZXIgPSBiYXNlTG9nZ2VyLmNyZWF0ZSgndHJhbnNsYXRvcicpO1xuICB9XG5cbiAgY2hhbmdlTGFuZ3VhZ2UobG5nKSB7XG4gICAgaWYgKGxuZykgdGhpcy5sYW5ndWFnZSA9IGxuZztcbiAgfVxuXG4gIGV4aXN0cyhrZXksIG8gPSB7IGludGVycG9sYXRpb246IHt9IH0pIHtcbiAgICBjb25zdCBvcHQgPSB7IC4uLm8gfTtcbiAgICBpZiAoa2V5ID09IG51bGwpIHJldHVybiBmYWxzZTtcbiAgICBjb25zdCByZXNvbHZlZCA9IHRoaXMucmVzb2x2ZShrZXksIG9wdCk7XG4gICAgcmV0dXJuIHJlc29sdmVkPy5yZXMgIT09IHVuZGVmaW5lZDtcbiAgfVxuXG4gIGV4dHJhY3RGcm9tS2V5KGtleSwgb3B0KSB7XG4gICAgbGV0IG5zU2VwYXJhdG9yID0gb3B0Lm5zU2VwYXJhdG9yICE9PSB1bmRlZmluZWQgPyBvcHQubnNTZXBhcmF0b3IgOiB0aGlzLm9wdGlvbnMubnNTZXBhcmF0b3I7XG4gICAgaWYgKG5zU2VwYXJhdG9yID09PSB1bmRlZmluZWQpIG5zU2VwYXJhdG9yID0gJzonO1xuXG4gICAgY29uc3Qga2V5U2VwYXJhdG9yID1cbiAgICAgIG9wdC5rZXlTZXBhcmF0b3IgIT09IHVuZGVmaW5lZCA/IG9wdC5rZXlTZXBhcmF0b3IgOiB0aGlzLm9wdGlvbnMua2V5U2VwYXJhdG9yO1xuXG4gICAgbGV0IG5hbWVzcGFjZXMgPSBvcHQubnMgfHwgdGhpcy5vcHRpb25zLmRlZmF1bHROUyB8fCBbXTtcbiAgICBjb25zdCB3b3VsZENoZWNrRm9yTnNJbktleSA9IG5zU2VwYXJhdG9yICYmIGtleS5pbmRleE9mKG5zU2VwYXJhdG9yKSA+IC0xO1xuICAgIGNvbnN0IHNlZW1zTmF0dXJhbExhbmd1YWdlID1cbiAgICAgICF0aGlzLm9wdGlvbnMudXNlckRlZmluZWRLZXlTZXBhcmF0b3IgJiZcbiAgICAgICFvcHQua2V5U2VwYXJhdG9yICYmXG4gICAgICAhdGhpcy5vcHRpb25zLnVzZXJEZWZpbmVkTnNTZXBhcmF0b3IgJiZcbiAgICAgICFvcHQubnNTZXBhcmF0b3IgJiZcbiAgICAgICFsb29rc0xpa2VPYmplY3RQYXRoKGtleSwgbnNTZXBhcmF0b3IsIGtleVNlcGFyYXRvcik7XG4gICAgaWYgKHdvdWxkQ2hlY2tGb3JOc0luS2V5ICYmICFzZWVtc05hdHVyYWxMYW5ndWFnZSkge1xuICAgICAgY29uc3QgbSA9IGtleS5tYXRjaCh0aGlzLmludGVycG9sYXRvci5uZXN0aW5nUmVnZXhwKTtcbiAgICAgIGlmIChtICYmIG0ubGVuZ3RoID4gMCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIGtleSxcbiAgICAgICAgICBuYW1lc3BhY2VzOiBpc1N0cmluZyhuYW1lc3BhY2VzKSA/IFtuYW1lc3BhY2VzXSA6IG5hbWVzcGFjZXMsXG4gICAgICAgIH07XG4gICAgICB9XG4gICAgICBjb25zdCBwYXJ0cyA9IGtleS5zcGxpdChuc1NlcGFyYXRvcik7XG4gICAgICBpZiAoXG4gICAgICAgIG5zU2VwYXJhdG9yICE9PSBrZXlTZXBhcmF0b3IgfHxcbiAgICAgICAgKG5zU2VwYXJhdG9yID09PSBrZXlTZXBhcmF0b3IgJiYgdGhpcy5vcHRpb25zLm5zLmluZGV4T2YocGFydHNbMF0pID4gLTEpXG4gICAgICApXG4gICAgICAgIG5hbWVzcGFjZXMgPSBwYXJ0cy5zaGlmdCgpO1xuICAgICAga2V5ID0gcGFydHMuam9pbihrZXlTZXBhcmF0b3IpO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBrZXksXG4gICAgICBuYW1lc3BhY2VzOiBpc1N0cmluZyhuYW1lc3BhY2VzKSA/IFtuYW1lc3BhY2VzXSA6IG5hbWVzcGFjZXMsXG4gICAgfTtcbiAgfVxuXG4gIHRyYW5zbGF0ZShrZXlzLCBvLCBsYXN0S2V5KSB7XG4gICAgbGV0IG9wdCA9IHR5cGVvZiBvID09PSAnb2JqZWN0JyA/IHsgLi4ubyB9IDogbztcbiAgICBpZiAodHlwZW9mIG9wdCAhPT0gJ29iamVjdCcgJiYgdGhpcy5vcHRpb25zLm92ZXJsb2FkVHJhbnNsYXRpb25PcHRpb25IYW5kbGVyKSB7XG4gICAgICAvKiBlc2xpbnQgcHJlZmVyLXJlc3QtcGFyYW1zOiAwICovXG4gICAgICBvcHQgPSB0aGlzLm9wdGlvbnMub3ZlcmxvYWRUcmFuc2xhdGlvbk9wdGlvbkhhbmRsZXIoYXJndW1lbnRzKTtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiBvcHRpb25zID09PSAnb2JqZWN0Jykgb3B0ID0geyAuLi5vcHQgfTtcbiAgICBpZiAoIW9wdCkgb3B0ID0ge307XG5cbiAgICAvLyBub24gdmFsaWQga2V5cyBoYW5kbGluZ1xuICAgIGlmIChrZXlzID09IG51bGwgLyogfHwga2V5cyA9PT0gJycgKi8pIHJldHVybiAnJztcbiAgICBpZiAoIUFycmF5LmlzQXJyYXkoa2V5cykpIGtleXMgPSBbU3RyaW5nKGtleXMpXTtcblxuICAgIGNvbnN0IHJldHVybkRldGFpbHMgPVxuICAgICAgb3B0LnJldHVybkRldGFpbHMgIT09IHVuZGVmaW5lZCA/IG9wdC5yZXR1cm5EZXRhaWxzIDogdGhpcy5vcHRpb25zLnJldHVybkRldGFpbHM7XG5cbiAgICAvLyBzZXBhcmF0b3JzXG4gICAgY29uc3Qga2V5U2VwYXJhdG9yID1cbiAgICAgIG9wdC5rZXlTZXBhcmF0b3IgIT09IHVuZGVmaW5lZCA/IG9wdC5rZXlTZXBhcmF0b3IgOiB0aGlzLm9wdGlvbnMua2V5U2VwYXJhdG9yO1xuXG4gICAgLy8gZ2V0IG5hbWVzcGFjZShzKVxuICAgIGNvbnN0IHsga2V5LCBuYW1lc3BhY2VzIH0gPSB0aGlzLmV4dHJhY3RGcm9tS2V5KGtleXNba2V5cy5sZW5ndGggLSAxXSwgb3B0KTtcbiAgICBjb25zdCBuYW1lc3BhY2UgPSBuYW1lc3BhY2VzW25hbWVzcGFjZXMubGVuZ3RoIC0gMV07XG5cbiAgICBsZXQgbnNTZXBhcmF0b3IgPSBvcHQubnNTZXBhcmF0b3IgIT09IHVuZGVmaW5lZCA/IG9wdC5uc1NlcGFyYXRvciA6IHRoaXMub3B0aW9ucy5uc1NlcGFyYXRvcjtcbiAgICBpZiAobnNTZXBhcmF0b3IgPT09IHVuZGVmaW5lZCkgbnNTZXBhcmF0b3IgPSAnOic7XG5cbiAgICAvLyByZXR1cm4ga2V5IG9uIENJTW9kZVxuICAgIGNvbnN0IGxuZyA9IG9wdC5sbmcgfHwgdGhpcy5sYW5ndWFnZTtcbiAgICBjb25zdCBhcHBlbmROYW1lc3BhY2VUb0NJTW9kZSA9XG4gICAgICBvcHQuYXBwZW5kTmFtZXNwYWNlVG9DSU1vZGUgfHwgdGhpcy5vcHRpb25zLmFwcGVuZE5hbWVzcGFjZVRvQ0lNb2RlO1xuICAgIGlmIChsbmc/LnRvTG93ZXJDYXNlKCkgPT09ICdjaW1vZGUnKSB7XG4gICAgICBpZiAoYXBwZW5kTmFtZXNwYWNlVG9DSU1vZGUpIHtcbiAgICAgICAgaWYgKHJldHVybkRldGFpbHMpIHtcbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmVzOiBgJHtuYW1lc3BhY2V9JHtuc1NlcGFyYXRvcn0ke2tleX1gLFxuICAgICAgICAgICAgdXNlZEtleToga2V5LFxuICAgICAgICAgICAgZXhhY3RVc2VkS2V5OiBrZXksXG4gICAgICAgICAgICB1c2VkTG5nOiBsbmcsXG4gICAgICAgICAgICB1c2VkTlM6IG5hbWVzcGFjZSxcbiAgICAgICAgICAgIHVzZWRQYXJhbXM6IHRoaXMuZ2V0VXNlZFBhcmFtc0RldGFpbHMob3B0KSxcbiAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBgJHtuYW1lc3BhY2V9JHtuc1NlcGFyYXRvcn0ke2tleX1gO1xuICAgICAgfVxuXG4gICAgICBpZiAocmV0dXJuRGV0YWlscykge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIHJlczoga2V5LFxuICAgICAgICAgIHVzZWRLZXk6IGtleSxcbiAgICAgICAgICBleGFjdFVzZWRLZXk6IGtleSxcbiAgICAgICAgICB1c2VkTG5nOiBsbmcsXG4gICAgICAgICAgdXNlZE5TOiBuYW1lc3BhY2UsXG4gICAgICAgICAgdXNlZFBhcmFtczogdGhpcy5nZXRVc2VkUGFyYW1zRGV0YWlscyhvcHQpLFxuICAgICAgICB9O1xuICAgICAgfVxuICAgICAgcmV0dXJuIGtleTtcbiAgICB9XG5cbiAgICAvLyByZXNvbHZlIGZyb20gc3RvcmVcbiAgICBjb25zdCByZXNvbHZlZCA9IHRoaXMucmVzb2x2ZShrZXlzLCBvcHQpO1xuICAgIGxldCByZXMgPSByZXNvbHZlZD8ucmVzO1xuICAgIGNvbnN0IHJlc1VzZWRLZXkgPSByZXNvbHZlZD8udXNlZEtleSB8fCBrZXk7XG4gICAgY29uc3QgcmVzRXhhY3RVc2VkS2V5ID0gcmVzb2x2ZWQ/LmV4YWN0VXNlZEtleSB8fCBrZXk7XG5cbiAgICBjb25zdCBub09iamVjdCA9IFsnW29iamVjdCBOdW1iZXJdJywgJ1tvYmplY3QgRnVuY3Rpb25dJywgJ1tvYmplY3QgUmVnRXhwXSddO1xuICAgIGNvbnN0IGpvaW5BcnJheXMgPSBvcHQuam9pbkFycmF5cyAhPT0gdW5kZWZpbmVkID8gb3B0LmpvaW5BcnJheXMgOiB0aGlzLm9wdGlvbnMuam9pbkFycmF5cztcblxuICAgIC8vIG9iamVjdFxuICAgIGNvbnN0IGhhbmRsZUFzT2JqZWN0SW5JMThuRm9ybWF0ID0gIXRoaXMuaTE4bkZvcm1hdCB8fCB0aGlzLmkxOG5Gb3JtYXQuaGFuZGxlQXNPYmplY3Q7XG4gICAgY29uc3QgbmVlZHNQbHVyYWxIYW5kbGluZyA9IG9wdC5jb3VudCAhPT0gdW5kZWZpbmVkICYmICFpc1N0cmluZyhvcHQuY291bnQpO1xuICAgIGNvbnN0IGhhc0RlZmF1bHRWYWx1ZSA9IFRyYW5zbGF0b3IuaGFzRGVmYXVsdFZhbHVlKG9wdCk7XG4gICAgY29uc3QgZGVmYXVsdFZhbHVlU3VmZml4ID0gbmVlZHNQbHVyYWxIYW5kbGluZ1xuICAgICAgPyB0aGlzLnBsdXJhbFJlc29sdmVyLmdldFN1ZmZpeChsbmcsIG9wdC5jb3VudCwgb3B0KVxuICAgICAgOiAnJztcbiAgICBjb25zdCBkZWZhdWx0VmFsdWVTdWZmaXhPcmRpbmFsRmFsbGJhY2sgPVxuICAgICAgb3B0Lm9yZGluYWwgJiYgbmVlZHNQbHVyYWxIYW5kbGluZ1xuICAgICAgICA/IHRoaXMucGx1cmFsUmVzb2x2ZXIuZ2V0U3VmZml4KGxuZywgb3B0LmNvdW50LCB7IG9yZGluYWw6IGZhbHNlIH0pXG4gICAgICAgIDogJyc7XG4gICAgY29uc3QgbmVlZHNaZXJvU3VmZml4TG9va3VwID0gbmVlZHNQbHVyYWxIYW5kbGluZyAmJiAhb3B0Lm9yZGluYWwgJiYgb3B0LmNvdW50ID09PSAwO1xuICAgIGNvbnN0IGRlZmF1bHRWYWx1ZSA9XG4gICAgICAobmVlZHNaZXJvU3VmZml4TG9va3VwICYmIG9wdFtgZGVmYXVsdFZhbHVlJHt0aGlzLm9wdGlvbnMucGx1cmFsU2VwYXJhdG9yfXplcm9gXSkgfHxcbiAgICAgIG9wdFtgZGVmYXVsdFZhbHVlJHtkZWZhdWx0VmFsdWVTdWZmaXh9YF0gfHxcbiAgICAgIG9wdFtgZGVmYXVsdFZhbHVlJHtkZWZhdWx0VmFsdWVTdWZmaXhPcmRpbmFsRmFsbGJhY2t9YF0gfHxcbiAgICAgIG9wdC5kZWZhdWx0VmFsdWU7XG5cbiAgICBsZXQgcmVzRm9yT2JqSG5kbCA9IHJlcztcbiAgICBpZiAoaGFuZGxlQXNPYmplY3RJbkkxOG5Gb3JtYXQgJiYgIXJlcyAmJiBoYXNEZWZhdWx0VmFsdWUpIHtcbiAgICAgIHJlc0Zvck9iakhuZGwgPSBkZWZhdWx0VmFsdWU7XG4gICAgfVxuXG4gICAgY29uc3QgaGFuZGxlQXNPYmplY3QgPSBzaG91bGRIYW5kbGVBc09iamVjdChyZXNGb3JPYmpIbmRsKTtcbiAgICBjb25zdCByZXNUeXBlID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5hcHBseShyZXNGb3JPYmpIbmRsKTtcblxuICAgIGlmIChcbiAgICAgIGhhbmRsZUFzT2JqZWN0SW5JMThuRm9ybWF0ICYmXG4gICAgICByZXNGb3JPYmpIbmRsICYmXG4gICAgICBoYW5kbGVBc09iamVjdCAmJlxuICAgICAgbm9PYmplY3QuaW5kZXhPZihyZXNUeXBlKSA8IDAgJiZcbiAgICAgICEoaXNTdHJpbmcoam9pbkFycmF5cykgJiYgQXJyYXkuaXNBcnJheShyZXNGb3JPYmpIbmRsKSlcbiAgICApIHtcbiAgICAgIGlmICghb3B0LnJldHVybk9iamVjdHMgJiYgIXRoaXMub3B0aW9ucy5yZXR1cm5PYmplY3RzKSB7XG4gICAgICAgIGlmICghdGhpcy5vcHRpb25zLnJldHVybmVkT2JqZWN0SGFuZGxlcikge1xuICAgICAgICAgIHRoaXMubG9nZ2VyLndhcm4oJ2FjY2Vzc2luZyBhbiBvYmplY3QgLSBidXQgcmV0dXJuT2JqZWN0cyBvcHRpb25zIGlzIG5vdCBlbmFibGVkIScpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHIgPSB0aGlzLm9wdGlvbnMucmV0dXJuZWRPYmplY3RIYW5kbGVyXG4gICAgICAgICAgPyB0aGlzLm9wdGlvbnMucmV0dXJuZWRPYmplY3RIYW5kbGVyKHJlc1VzZWRLZXksIHJlc0Zvck9iakhuZGwsIHtcbiAgICAgICAgICAgICAgLi4ub3B0LFxuICAgICAgICAgICAgICBuczogbmFtZXNwYWNlcyxcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgOiBga2V5ICcke2tleX0gKCR7dGhpcy5sYW5ndWFnZX0pJyByZXR1cm5lZCBhbiBvYmplY3QgaW5zdGVhZCBvZiBzdHJpbmcuYDtcbiAgICAgICAgaWYgKHJldHVybkRldGFpbHMpIHtcbiAgICAgICAgICByZXNvbHZlZC5yZXMgPSByO1xuICAgICAgICAgIHJlc29sdmVkLnVzZWRQYXJhbXMgPSB0aGlzLmdldFVzZWRQYXJhbXNEZXRhaWxzKG9wdCk7XG4gICAgICAgICAgcmV0dXJuIHJlc29sdmVkO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByO1xuICAgICAgfVxuXG4gICAgICAvLyBpZiB3ZSBnb3QgYSBzZXBhcmF0b3Igd2UgbG9vcCBvdmVyIGNoaWxkcmVuIC0gZWxzZSB3ZSBqdXN0IHJldHVybiBvYmplY3QgYXMgaXNcbiAgICAgIC8vIGFzIGhhdmluZyBpdCBzZXQgdG8gZmFsc2UgbWVhbnMgbm8gaGllcmFyY2h5IHNvIG5vIGxvb2t1cCBmb3IgbmVzdGVkIHZhbHVlc1xuICAgICAgaWYgKGtleVNlcGFyYXRvcikge1xuICAgICAgICBjb25zdCByZXNUeXBlSXNBcnJheSA9IEFycmF5LmlzQXJyYXkocmVzRm9yT2JqSG5kbCk7XG4gICAgICAgIGNvbnN0IGNvcHkgPSByZXNUeXBlSXNBcnJheSA/IFtdIDoge307IC8vIGFwcGx5IGNoaWxkIHRyYW5zbGF0aW9uIG9uIGEgY29weVxuXG4gICAgICAgIC8qIGVzbGludCBuby1yZXN0cmljdGVkLXN5bnRheDogMCAqL1xuICAgICAgICBjb25zdCBuZXdLZXlUb1VzZSA9IHJlc1R5cGVJc0FycmF5ID8gcmVzRXhhY3RVc2VkS2V5IDogcmVzVXNlZEtleTtcbiAgICAgICAgZm9yIChjb25zdCBtIGluIHJlc0Zvck9iakhuZGwpIHtcbiAgICAgICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHJlc0Zvck9iakhuZGwsIG0pKSB7XG4gICAgICAgICAgICBjb25zdCBkZWVwS2V5ID0gYCR7bmV3S2V5VG9Vc2V9JHtrZXlTZXBhcmF0b3J9JHttfWA7XG4gICAgICAgICAgICBpZiAoaGFzRGVmYXVsdFZhbHVlICYmICFyZXMpIHtcbiAgICAgICAgICAgICAgY29weVttXSA9IHRoaXMudHJhbnNsYXRlKGRlZXBLZXksIHtcbiAgICAgICAgICAgICAgICAuLi5vcHQsXG4gICAgICAgICAgICAgICAgZGVmYXVsdFZhbHVlOiBzaG91bGRIYW5kbGVBc09iamVjdChkZWZhdWx0VmFsdWUpID8gZGVmYXVsdFZhbHVlW21dIDogdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgIC4uLnsgam9pbkFycmF5czogZmFsc2UsIG5zOiBuYW1lc3BhY2VzIH0sXG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgY29weVttXSA9IHRoaXMudHJhbnNsYXRlKGRlZXBLZXksIHtcbiAgICAgICAgICAgICAgICAuLi5vcHQsXG4gICAgICAgICAgICAgICAgLi4ueyBqb2luQXJyYXlzOiBmYWxzZSwgbnM6IG5hbWVzcGFjZXMgfSxcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoY29weVttXSA9PT0gZGVlcEtleSkgY29weVttXSA9IHJlc0Zvck9iakhuZGxbbV07IC8vIGlmIG5vdGhpbmcgZm91bmQgdXNlIG9yaWdpbmFsIHZhbHVlIGFzIGZhbGxiYWNrXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJlcyA9IGNvcHk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChoYW5kbGVBc09iamVjdEluSTE4bkZvcm1hdCAmJiBpc1N0cmluZyhqb2luQXJyYXlzKSAmJiBBcnJheS5pc0FycmF5KHJlcykpIHtcbiAgICAgIC8vIGFycmF5IHNwZWNpYWwgdHJlYXRtZW50XG4gICAgICByZXMgPSByZXMuam9pbihqb2luQXJyYXlzKTtcbiAgICAgIGlmIChyZXMpIHJlcyA9IHRoaXMuZXh0ZW5kVHJhbnNsYXRpb24ocmVzLCBrZXlzLCBvcHQsIGxhc3RLZXkpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBzdHJpbmcsIGVtcHR5IG9yIG51bGxcbiAgICAgIGxldCB1c2VkRGVmYXVsdCA9IGZhbHNlO1xuICAgICAgbGV0IHVzZWRLZXkgPSBmYWxzZTtcblxuICAgICAgLy8gZmFsbGJhY2sgdmFsdWVcbiAgICAgIGlmICghdGhpcy5pc1ZhbGlkTG9va3VwKHJlcykgJiYgaGFzRGVmYXVsdFZhbHVlKSB7XG4gICAgICAgIHVzZWREZWZhdWx0ID0gdHJ1ZTtcbiAgICAgICAgcmVzID0gZGVmYXVsdFZhbHVlO1xuICAgICAgfVxuICAgICAgaWYgKCF0aGlzLmlzVmFsaWRMb29rdXAocmVzKSkge1xuICAgICAgICB1c2VkS2V5ID0gdHJ1ZTtcbiAgICAgICAgcmVzID0ga2V5O1xuICAgICAgfVxuXG4gICAgICBjb25zdCBtaXNzaW5nS2V5Tm9WYWx1ZUZhbGxiYWNrVG9LZXkgPVxuICAgICAgICBvcHQubWlzc2luZ0tleU5vVmFsdWVGYWxsYmFja1RvS2V5IHx8IHRoaXMub3B0aW9ucy5taXNzaW5nS2V5Tm9WYWx1ZUZhbGxiYWNrVG9LZXk7XG4gICAgICBjb25zdCByZXNGb3JNaXNzaW5nID0gbWlzc2luZ0tleU5vVmFsdWVGYWxsYmFja1RvS2V5ICYmIHVzZWRLZXkgPyB1bmRlZmluZWQgOiByZXM7XG5cbiAgICAgIC8vIHNhdmUgbWlzc2luZ1xuICAgICAgY29uc3QgdXBkYXRlTWlzc2luZyA9IGhhc0RlZmF1bHRWYWx1ZSAmJiBkZWZhdWx0VmFsdWUgIT09IHJlcyAmJiB0aGlzLm9wdGlvbnMudXBkYXRlTWlzc2luZztcbiAgICAgIGlmICh1c2VkS2V5IHx8IHVzZWREZWZhdWx0IHx8IHVwZGF0ZU1pc3NpbmcpIHtcbiAgICAgICAgdGhpcy5sb2dnZXIubG9nKFxuICAgICAgICAgIHVwZGF0ZU1pc3NpbmcgPyAndXBkYXRlS2V5JyA6ICdtaXNzaW5nS2V5JyxcbiAgICAgICAgICBsbmcsXG4gICAgICAgICAgbmFtZXNwYWNlLFxuICAgICAgICAgIGtleSxcbiAgICAgICAgICB1cGRhdGVNaXNzaW5nID8gZGVmYXVsdFZhbHVlIDogcmVzLFxuICAgICAgICApO1xuICAgICAgICBpZiAoa2V5U2VwYXJhdG9yKSB7XG4gICAgICAgICAgY29uc3QgZmsgPSB0aGlzLnJlc29sdmUoa2V5LCB7IC4uLm9wdCwga2V5U2VwYXJhdG9yOiBmYWxzZSB9KTtcbiAgICAgICAgICBpZiAoZmsgJiYgZmsucmVzKVxuICAgICAgICAgICAgdGhpcy5sb2dnZXIud2FybihcbiAgICAgICAgICAgICAgJ1NlZW1zIHRoZSBsb2FkZWQgdHJhbnNsYXRpb25zIHdlcmUgaW4gZmxhdCBKU09OIGZvcm1hdCBpbnN0ZWFkIG9mIG5lc3RlZC4gRWl0aGVyIHNldCBrZXlTZXBhcmF0b3I6IGZhbHNlIG9uIGluaXQgb3IgbWFrZSBzdXJlIHlvdXIgdHJhbnNsYXRpb25zIGFyZSBwdWJsaXNoZWQgaW4gbmVzdGVkIGZvcm1hdC4nLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBsbmdzID0gW107XG4gICAgICAgIGNvbnN0IGZhbGxiYWNrTG5ncyA9IHRoaXMubGFuZ3VhZ2VVdGlscy5nZXRGYWxsYmFja0NvZGVzKFxuICAgICAgICAgIHRoaXMub3B0aW9ucy5mYWxsYmFja0xuZyxcbiAgICAgICAgICBvcHQubG5nIHx8IHRoaXMubGFuZ3VhZ2UsXG4gICAgICAgICk7XG4gICAgICAgIGlmICh0aGlzLm9wdGlvbnMuc2F2ZU1pc3NpbmdUbyA9PT0gJ2ZhbGxiYWNrJyAmJiBmYWxsYmFja0xuZ3MgJiYgZmFsbGJhY2tMbmdzWzBdKSB7XG4gICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBmYWxsYmFja0xuZ3MubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGxuZ3MucHVzaChmYWxsYmFja0xuZ3NbaV0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLm9wdGlvbnMuc2F2ZU1pc3NpbmdUbyA9PT0gJ2FsbCcpIHtcbiAgICAgICAgICBsbmdzID0gdGhpcy5sYW5ndWFnZVV0aWxzLnRvUmVzb2x2ZUhpZXJhcmNoeShvcHQubG5nIHx8IHRoaXMubGFuZ3VhZ2UpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGxuZ3MucHVzaChvcHQubG5nIHx8IHRoaXMubGFuZ3VhZ2UpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgc2VuZCA9IChsLCBrLCBzcGVjaWZpY0RlZmF1bHRWYWx1ZSkgPT4ge1xuICAgICAgICAgIGNvbnN0IGRlZmF1bHRGb3JNaXNzaW5nID1cbiAgICAgICAgICAgIGhhc0RlZmF1bHRWYWx1ZSAmJiBzcGVjaWZpY0RlZmF1bHRWYWx1ZSAhPT0gcmVzID8gc3BlY2lmaWNEZWZhdWx0VmFsdWUgOiByZXNGb3JNaXNzaW5nO1xuICAgICAgICAgIGlmICh0aGlzLm9wdGlvbnMubWlzc2luZ0tleUhhbmRsZXIpIHtcbiAgICAgICAgICAgIHRoaXMub3B0aW9ucy5taXNzaW5nS2V5SGFuZGxlcihsLCBuYW1lc3BhY2UsIGssIGRlZmF1bHRGb3JNaXNzaW5nLCB1cGRhdGVNaXNzaW5nLCBvcHQpO1xuICAgICAgICAgIH0gZWxzZSBpZiAodGhpcy5iYWNrZW5kQ29ubmVjdG9yPy5zYXZlTWlzc2luZykge1xuICAgICAgICAgICAgdGhpcy5iYWNrZW5kQ29ubmVjdG9yLnNhdmVNaXNzaW5nKFxuICAgICAgICAgICAgICBsLFxuICAgICAgICAgICAgICBuYW1lc3BhY2UsXG4gICAgICAgICAgICAgIGssXG4gICAgICAgICAgICAgIGRlZmF1bHRGb3JNaXNzaW5nLFxuICAgICAgICAgICAgICB1cGRhdGVNaXNzaW5nLFxuICAgICAgICAgICAgICBvcHQsXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH1cbiAgICAgICAgICB0aGlzLmVtaXQoJ21pc3NpbmdLZXknLCBsLCBuYW1lc3BhY2UsIGssIHJlcyk7XG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5zYXZlTWlzc2luZykge1xuICAgICAgICAgIGlmICh0aGlzLm9wdGlvbnMuc2F2ZU1pc3NpbmdQbHVyYWxzICYmIG5lZWRzUGx1cmFsSGFuZGxpbmcpIHtcbiAgICAgICAgICAgIGxuZ3MuZm9yRWFjaCgobGFuZ3VhZ2UpID0+IHtcbiAgICAgICAgICAgICAgY29uc3Qgc3VmZml4ZXMgPSB0aGlzLnBsdXJhbFJlc29sdmVyLmdldFN1ZmZpeGVzKGxhbmd1YWdlLCBvcHQpO1xuICAgICAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAgICAgbmVlZHNaZXJvU3VmZml4TG9va3VwICYmXG4gICAgICAgICAgICAgICAgb3B0W2BkZWZhdWx0VmFsdWUke3RoaXMub3B0aW9ucy5wbHVyYWxTZXBhcmF0b3J9emVyb2BdICYmXG4gICAgICAgICAgICAgICAgc3VmZml4ZXMuaW5kZXhPZihgJHt0aGlzLm9wdGlvbnMucGx1cmFsU2VwYXJhdG9yfXplcm9gKSA8IDBcbiAgICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgICAgc3VmZml4ZXMucHVzaChgJHt0aGlzLm9wdGlvbnMucGx1cmFsU2VwYXJhdG9yfXplcm9gKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBzdWZmaXhlcy5mb3JFYWNoKChzdWZmaXgpID0+IHtcbiAgICAgICAgICAgICAgICBzZW5kKFtsYW5ndWFnZV0sIGtleSArIHN1ZmZpeCwgb3B0W2BkZWZhdWx0VmFsdWUke3N1ZmZpeH1gXSB8fCBkZWZhdWx0VmFsdWUpO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzZW5kKGxuZ3MsIGtleSwgZGVmYXVsdFZhbHVlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gZXh0ZW5kXG4gICAgICByZXMgPSB0aGlzLmV4dGVuZFRyYW5zbGF0aW9uKHJlcywga2V5cywgb3B0LCByZXNvbHZlZCwgbGFzdEtleSk7XG5cbiAgICAgIC8vIGFwcGVuZCBuYW1lc3BhY2UgaWYgc3RpbGwga2V5XG4gICAgICBpZiAodXNlZEtleSAmJiByZXMgPT09IGtleSAmJiB0aGlzLm9wdGlvbnMuYXBwZW5kTmFtZXNwYWNlVG9NaXNzaW5nS2V5KSB7XG4gICAgICAgIHJlcyA9IGAke25hbWVzcGFjZX0ke25zU2VwYXJhdG9yfSR7a2V5fWA7XG4gICAgICB9XG5cbiAgICAgIC8vIHBhcnNlTWlzc2luZ0tleUhhbmRsZXJcbiAgICAgIGlmICgodXNlZEtleSB8fCB1c2VkRGVmYXVsdCkgJiYgdGhpcy5vcHRpb25zLnBhcnNlTWlzc2luZ0tleUhhbmRsZXIpIHtcbiAgICAgICAgcmVzID0gdGhpcy5vcHRpb25zLnBhcnNlTWlzc2luZ0tleUhhbmRsZXIoXG4gICAgICAgICAgdGhpcy5vcHRpb25zLmFwcGVuZE5hbWVzcGFjZVRvTWlzc2luZ0tleSA/IGAke25hbWVzcGFjZX0ke25zU2VwYXJhdG9yfSR7a2V5fWAgOiBrZXksXG4gICAgICAgICAgdXNlZERlZmF1bHQgPyByZXMgOiB1bmRlZmluZWQsXG4gICAgICAgICAgb3B0LFxuICAgICAgICApO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIHJldHVyblxuICAgIGlmIChyZXR1cm5EZXRhaWxzKSB7XG4gICAgICByZXNvbHZlZC5yZXMgPSByZXM7XG4gICAgICByZXNvbHZlZC51c2VkUGFyYW1zID0gdGhpcy5nZXRVc2VkUGFyYW1zRGV0YWlscyhvcHQpO1xuICAgICAgcmV0dXJuIHJlc29sdmVkO1xuICAgIH1cbiAgICByZXR1cm4gcmVzO1xuICB9XG5cbiAgZXh0ZW5kVHJhbnNsYXRpb24ocmVzLCBrZXksIG9wdCwgcmVzb2x2ZWQsIGxhc3RLZXkpIHtcbiAgICBpZiAodGhpcy5pMThuRm9ybWF0Py5wYXJzZSkge1xuICAgICAgcmVzID0gdGhpcy5pMThuRm9ybWF0LnBhcnNlKFxuICAgICAgICByZXMsXG4gICAgICAgIHsgLi4udGhpcy5vcHRpb25zLmludGVycG9sYXRpb24uZGVmYXVsdFZhcmlhYmxlcywgLi4ub3B0IH0sXG4gICAgICAgIG9wdC5sbmcgfHwgdGhpcy5sYW5ndWFnZSB8fCByZXNvbHZlZC51c2VkTG5nLFxuICAgICAgICByZXNvbHZlZC51c2VkTlMsXG4gICAgICAgIHJlc29sdmVkLnVzZWRLZXksXG4gICAgICAgIHsgcmVzb2x2ZWQgfSxcbiAgICAgICk7XG4gICAgfSBlbHNlIGlmICghb3B0LnNraXBJbnRlcnBvbGF0aW9uKSB7XG4gICAgICAvLyBpMThuZXh0LnBhcnNpbmdcbiAgICAgIGlmIChvcHQuaW50ZXJwb2xhdGlvbilcbiAgICAgICAgdGhpcy5pbnRlcnBvbGF0b3IuaW5pdCh7XG4gICAgICAgICAgLi4ub3B0LFxuICAgICAgICAgIC4uLnsgaW50ZXJwb2xhdGlvbjogeyAuLi50aGlzLm9wdGlvbnMuaW50ZXJwb2xhdGlvbiwgLi4ub3B0LmludGVycG9sYXRpb24gfSB9LFxuICAgICAgICB9KTtcbiAgICAgIGNvbnN0IHNraXBPblZhcmlhYmxlcyA9XG4gICAgICAgIGlzU3RyaW5nKHJlcykgJiZcbiAgICAgICAgKG9wdD8uaW50ZXJwb2xhdGlvbj8uc2tpcE9uVmFyaWFibGVzICE9PSB1bmRlZmluZWRcbiAgICAgICAgICA/IG9wdC5pbnRlcnBvbGF0aW9uLnNraXBPblZhcmlhYmxlc1xuICAgICAgICAgIDogdGhpcy5vcHRpb25zLmludGVycG9sYXRpb24uc2tpcE9uVmFyaWFibGVzKTtcbiAgICAgIGxldCBuZXN0QmVmO1xuICAgICAgaWYgKHNraXBPblZhcmlhYmxlcykge1xuICAgICAgICBjb25zdCBuYiA9IHJlcy5tYXRjaCh0aGlzLmludGVycG9sYXRvci5uZXN0aW5nUmVnZXhwKTtcbiAgICAgICAgLy8gaGFzIG5lc3RpbmcgYWZ0YmVmb3JlZXIgaW50ZXJwb2xhdGlvblxuICAgICAgICBuZXN0QmVmID0gbmIgJiYgbmIubGVuZ3RoO1xuICAgICAgfVxuXG4gICAgICAvLyBpbnRlcnBvbGF0ZVxuICAgICAgbGV0IGRhdGEgPSBvcHQucmVwbGFjZSAmJiAhaXNTdHJpbmcob3B0LnJlcGxhY2UpID8gb3B0LnJlcGxhY2UgOiBvcHQ7XG4gICAgICBpZiAodGhpcy5vcHRpb25zLmludGVycG9sYXRpb24uZGVmYXVsdFZhcmlhYmxlcylcbiAgICAgICAgZGF0YSA9IHsgLi4udGhpcy5vcHRpb25zLmludGVycG9sYXRpb24uZGVmYXVsdFZhcmlhYmxlcywgLi4uZGF0YSB9O1xuICAgICAgcmVzID0gdGhpcy5pbnRlcnBvbGF0b3IuaW50ZXJwb2xhdGUoXG4gICAgICAgIHJlcyxcbiAgICAgICAgZGF0YSxcbiAgICAgICAgb3B0LmxuZyB8fCB0aGlzLmxhbmd1YWdlIHx8IHJlc29sdmVkLnVzZWRMbmcsXG4gICAgICAgIG9wdCxcbiAgICAgICk7XG5cbiAgICAgIC8vIG5lc3RpbmdcbiAgICAgIGlmIChza2lwT25WYXJpYWJsZXMpIHtcbiAgICAgICAgY29uc3QgbmEgPSByZXMubWF0Y2godGhpcy5pbnRlcnBvbGF0b3IubmVzdGluZ1JlZ2V4cCk7XG4gICAgICAgIC8vIGhhcyBuZXN0aW5nIGFmdGVyIGludGVycG9sYXRpb25cbiAgICAgICAgY29uc3QgbmVzdEFmdCA9IG5hICYmIG5hLmxlbmd0aDtcbiAgICAgICAgaWYgKG5lc3RCZWYgPCBuZXN0QWZ0KSBvcHQubmVzdCA9IGZhbHNlO1xuICAgICAgfVxuICAgICAgaWYgKCFvcHQubG5nICYmIHJlc29sdmVkICYmIHJlc29sdmVkLnJlcykgb3B0LmxuZyA9IHRoaXMubGFuZ3VhZ2UgfHwgcmVzb2x2ZWQudXNlZExuZztcbiAgICAgIGlmIChvcHQubmVzdCAhPT0gZmFsc2UpXG4gICAgICAgIHJlcyA9IHRoaXMuaW50ZXJwb2xhdG9yLm5lc3QoXG4gICAgICAgICAgcmVzLFxuICAgICAgICAgICguLi5hcmdzKSA9PiB7XG4gICAgICAgICAgICBpZiAobGFzdEtleT8uWzBdID09PSBhcmdzWzBdICYmICFvcHQuY29udGV4dCkge1xuICAgICAgICAgICAgICB0aGlzLmxvZ2dlci53YXJuKFxuICAgICAgICAgICAgICAgIGBJdCBzZWVtcyB5b3UgYXJlIG5lc3RpbmcgcmVjdXJzaXZlbHkga2V5OiAke2FyZ3NbMF19IGluIGtleTogJHtrZXlbMF19YCxcbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhpcy50cmFuc2xhdGUoLi4uYXJncywga2V5KTtcbiAgICAgICAgICB9LFxuICAgICAgICAgIG9wdCxcbiAgICAgICAgKTtcblxuICAgICAgaWYgKG9wdC5pbnRlcnBvbGF0aW9uKSB0aGlzLmludGVycG9sYXRvci5yZXNldCgpO1xuICAgIH1cblxuICAgIC8vIHBvc3QgcHJvY2Vzc1xuICAgIGNvbnN0IHBvc3RQcm9jZXNzID0gb3B0LnBvc3RQcm9jZXNzIHx8IHRoaXMub3B0aW9ucy5wb3N0UHJvY2VzcztcbiAgICBjb25zdCBwb3N0UHJvY2Vzc29yTmFtZXMgPSBpc1N0cmluZyhwb3N0UHJvY2VzcykgPyBbcG9zdFByb2Nlc3NdIDogcG9zdFByb2Nlc3M7XG5cbiAgICBpZiAocmVzICE9IG51bGwgJiYgcG9zdFByb2Nlc3Nvck5hbWVzPy5sZW5ndGggJiYgb3B0LmFwcGx5UG9zdFByb2Nlc3NvciAhPT0gZmFsc2UpIHtcbiAgICAgIHJlcyA9IHBvc3RQcm9jZXNzb3IuaGFuZGxlKFxuICAgICAgICBwb3N0UHJvY2Vzc29yTmFtZXMsXG4gICAgICAgIHJlcyxcbiAgICAgICAga2V5LFxuICAgICAgICB0aGlzLm9wdGlvbnMgJiYgdGhpcy5vcHRpb25zLnBvc3RQcm9jZXNzUGFzc1Jlc29sdmVkXG4gICAgICAgICAgPyB7XG4gICAgICAgICAgICAgIGkxOG5SZXNvbHZlZDogeyAuLi5yZXNvbHZlZCwgdXNlZFBhcmFtczogdGhpcy5nZXRVc2VkUGFyYW1zRGV0YWlscyhvcHQpIH0sXG4gICAgICAgICAgICAgIC4uLm9wdCxcbiAgICAgICAgICAgIH1cbiAgICAgICAgICA6IG9wdCxcbiAgICAgICAgdGhpcyxcbiAgICAgICk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlcztcbiAgfVxuXG4gIHJlc29sdmUoa2V5cywgb3B0ID0ge30pIHtcbiAgICBsZXQgZm91bmQ7XG4gICAgbGV0IHVzZWRLZXk7IC8vIHBsYWluIGtleVxuICAgIGxldCBleGFjdFVzZWRLZXk7IC8vIGtleSB3aXRoIGNvbnRleHQgLyBwbHVyYWxcbiAgICBsZXQgdXNlZExuZztcbiAgICBsZXQgdXNlZE5TO1xuXG4gICAgaWYgKGlzU3RyaW5nKGtleXMpKSBrZXlzID0gW2tleXNdO1xuXG4gICAgLy8gZm9yRWFjaCBwb3NzaWJsZSBrZXlcbiAgICBrZXlzLmZvckVhY2goKGspID0+IHtcbiAgICAgIGlmICh0aGlzLmlzVmFsaWRMb29rdXAoZm91bmQpKSByZXR1cm47XG4gICAgICBjb25zdCBleHRyYWN0ZWQgPSB0aGlzLmV4dHJhY3RGcm9tS2V5KGssIG9wdCk7XG4gICAgICBjb25zdCBrZXkgPSBleHRyYWN0ZWQua2V5O1xuICAgICAgdXNlZEtleSA9IGtleTtcbiAgICAgIGxldCBuYW1lc3BhY2VzID0gZXh0cmFjdGVkLm5hbWVzcGFjZXM7XG4gICAgICBpZiAodGhpcy5vcHRpb25zLmZhbGxiYWNrTlMpIG5hbWVzcGFjZXMgPSBuYW1lc3BhY2VzLmNvbmNhdCh0aGlzLm9wdGlvbnMuZmFsbGJhY2tOUyk7XG5cbiAgICAgIGNvbnN0IG5lZWRzUGx1cmFsSGFuZGxpbmcgPSBvcHQuY291bnQgIT09IHVuZGVmaW5lZCAmJiAhaXNTdHJpbmcob3B0LmNvdW50KTtcbiAgICAgIGNvbnN0IG5lZWRzWmVyb1N1ZmZpeExvb2t1cCA9IG5lZWRzUGx1cmFsSGFuZGxpbmcgJiYgIW9wdC5vcmRpbmFsICYmIG9wdC5jb3VudCA9PT0gMDtcbiAgICAgIGNvbnN0IG5lZWRzQ29udGV4dEhhbmRsaW5nID1cbiAgICAgICAgb3B0LmNvbnRleHQgIT09IHVuZGVmaW5lZCAmJlxuICAgICAgICAoaXNTdHJpbmcob3B0LmNvbnRleHQpIHx8IHR5cGVvZiBvcHQuY29udGV4dCA9PT0gJ251bWJlcicpICYmXG4gICAgICAgIG9wdC5jb250ZXh0ICE9PSAnJztcblxuICAgICAgY29uc3QgY29kZXMgPSBvcHQubG5nc1xuICAgICAgICA/IG9wdC5sbmdzXG4gICAgICAgIDogdGhpcy5sYW5ndWFnZVV0aWxzLnRvUmVzb2x2ZUhpZXJhcmNoeShvcHQubG5nIHx8IHRoaXMubGFuZ3VhZ2UsIG9wdC5mYWxsYmFja0xuZyk7XG5cbiAgICAgIG5hbWVzcGFjZXMuZm9yRWFjaCgobnMpID0+IHtcbiAgICAgICAgaWYgKHRoaXMuaXNWYWxpZExvb2t1cChmb3VuZCkpIHJldHVybjtcbiAgICAgICAgdXNlZE5TID0gbnM7XG5cbiAgICAgICAgaWYgKFxuICAgICAgICAgICFjaGVja2VkTG9hZGVkRm9yW2Ake2NvZGVzWzBdfS0ke25zfWBdICYmXG4gICAgICAgICAgdGhpcy51dGlscz8uaGFzTG9hZGVkTmFtZXNwYWNlICYmXG4gICAgICAgICAgIXRoaXMudXRpbHM/Lmhhc0xvYWRlZE5hbWVzcGFjZSh1c2VkTlMpXG4gICAgICAgICkge1xuICAgICAgICAgIGNoZWNrZWRMb2FkZWRGb3JbYCR7Y29kZXNbMF19LSR7bnN9YF0gPSB0cnVlO1xuICAgICAgICAgIHRoaXMubG9nZ2VyLndhcm4oXG4gICAgICAgICAgICBga2V5IFwiJHt1c2VkS2V5fVwiIGZvciBsYW5ndWFnZXMgXCIke2NvZGVzLmpvaW4oXG4gICAgICAgICAgICAgICcsICcsXG4gICAgICAgICAgICApfVwiIHdvbid0IGdldCByZXNvbHZlZCBhcyBuYW1lc3BhY2UgXCIke3VzZWROU31cIiB3YXMgbm90IHlldCBsb2FkZWRgLFxuICAgICAgICAgICAgJ1RoaXMgbWVhbnMgc29tZXRoaW5nIElTIFdST05HIGluIHlvdXIgc2V0dXAuIFlvdSBhY2Nlc3MgdGhlIHQgZnVuY3Rpb24gYmVmb3JlIGkxOG5leHQuaW5pdCAvIGkxOG5leHQubG9hZE5hbWVzcGFjZSAvIGkxOG5leHQuY2hhbmdlTGFuZ3VhZ2Ugd2FzIGRvbmUuIFdhaXQgZm9yIHRoZSBjYWxsYmFjayBvciBQcm9taXNlIHRvIHJlc29sdmUgYmVmb3JlIGFjY2Vzc2luZyBpdCEhIScsXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvZGVzLmZvckVhY2goKGNvZGUpID0+IHtcbiAgICAgICAgICBpZiAodGhpcy5pc1ZhbGlkTG9va3VwKGZvdW5kKSkgcmV0dXJuO1xuICAgICAgICAgIHVzZWRMbmcgPSBjb2RlO1xuXG4gICAgICAgICAgY29uc3QgZmluYWxLZXlzID0gW2tleV07XG5cbiAgICAgICAgICBpZiAodGhpcy5pMThuRm9ybWF0Py5hZGRMb29rdXBLZXlzKSB7XG4gICAgICAgICAgICB0aGlzLmkxOG5Gb3JtYXQuYWRkTG9va3VwS2V5cyhmaW5hbEtleXMsIGtleSwgY29kZSwgbnMsIG9wdCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxldCBwbHVyYWxTdWZmaXg7XG4gICAgICAgICAgICBpZiAobmVlZHNQbHVyYWxIYW5kbGluZylcbiAgICAgICAgICAgICAgcGx1cmFsU3VmZml4ID0gdGhpcy5wbHVyYWxSZXNvbHZlci5nZXRTdWZmaXgoY29kZSwgb3B0LmNvdW50LCBvcHQpO1xuICAgICAgICAgICAgY29uc3QgemVyb1N1ZmZpeCA9IGAke3RoaXMub3B0aW9ucy5wbHVyYWxTZXBhcmF0b3J9emVyb2A7XG4gICAgICAgICAgICBjb25zdCBvcmRpbmFsUHJlZml4ID0gYCR7dGhpcy5vcHRpb25zLnBsdXJhbFNlcGFyYXRvcn1vcmRpbmFsJHt0aGlzLm9wdGlvbnMucGx1cmFsU2VwYXJhdG9yfWA7XG4gICAgICAgICAgICAvLyBnZXQga2V5IGZvciBwbHVyYWwgaWYgbmVlZGVkXG4gICAgICAgICAgICBpZiAobmVlZHNQbHVyYWxIYW5kbGluZykge1xuICAgICAgICAgICAgICBmaW5hbEtleXMucHVzaChrZXkgKyBwbHVyYWxTdWZmaXgpO1xuICAgICAgICAgICAgICBpZiAob3B0Lm9yZGluYWwgJiYgcGx1cmFsU3VmZml4LmluZGV4T2Yob3JkaW5hbFByZWZpeCkgPT09IDApIHtcbiAgICAgICAgICAgICAgICBmaW5hbEtleXMucHVzaChcbiAgICAgICAgICAgICAgICAgIGtleSArIHBsdXJhbFN1ZmZpeC5yZXBsYWNlKG9yZGluYWxQcmVmaXgsIHRoaXMub3B0aW9ucy5wbHVyYWxTZXBhcmF0b3IpLFxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgaWYgKG5lZWRzWmVyb1N1ZmZpeExvb2t1cCkge1xuICAgICAgICAgICAgICAgIGZpbmFsS2V5cy5wdXNoKGtleSArIHplcm9TdWZmaXgpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIGdldCBrZXkgZm9yIGNvbnRleHQgaWYgbmVlZGVkXG4gICAgICAgICAgICBpZiAobmVlZHNDb250ZXh0SGFuZGxpbmcpIHtcbiAgICAgICAgICAgICAgY29uc3QgY29udGV4dEtleSA9IGAke2tleX0ke3RoaXMub3B0aW9ucy5jb250ZXh0U2VwYXJhdG9yfSR7b3B0LmNvbnRleHR9YDtcbiAgICAgICAgICAgICAgZmluYWxLZXlzLnB1c2goY29udGV4dEtleSk7XG5cbiAgICAgICAgICAgICAgLy8gZ2V0IGtleSBmb3IgY29udGV4dCArIHBsdXJhbCBpZiBuZWVkZWRcbiAgICAgICAgICAgICAgaWYgKG5lZWRzUGx1cmFsSGFuZGxpbmcpIHtcbiAgICAgICAgICAgICAgICBmaW5hbEtleXMucHVzaChjb250ZXh0S2V5ICsgcGx1cmFsU3VmZml4KTtcbiAgICAgICAgICAgICAgICBpZiAob3B0Lm9yZGluYWwgJiYgcGx1cmFsU3VmZml4LmluZGV4T2Yob3JkaW5hbFByZWZpeCkgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgIGZpbmFsS2V5cy5wdXNoKFxuICAgICAgICAgICAgICAgICAgICBjb250ZXh0S2V5ICsgcGx1cmFsU3VmZml4LnJlcGxhY2Uob3JkaW5hbFByZWZpeCwgdGhpcy5vcHRpb25zLnBsdXJhbFNlcGFyYXRvciksXG4gICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAobmVlZHNaZXJvU3VmZml4TG9va3VwKSB7XG4gICAgICAgICAgICAgICAgICBmaW5hbEtleXMucHVzaChjb250ZXh0S2V5ICsgemVyb1N1ZmZpeCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gaXRlcmF0ZSBvdmVyIGZpbmFsS2V5cyBzdGFydGluZyB3aXRoIG1vc3Qgc3BlY2lmaWMgcGx1cmFsa2V5ICgtPiBjb250ZXh0a2V5IG9ubHkpIC0+IHNpbmd1bGFya2V5IG9ubHlcbiAgICAgICAgICBsZXQgcG9zc2libGVLZXk7XG4gICAgICAgICAgLyogZXNsaW50IG5vLWNvbmQtYXNzaWduOiAwICovXG4gICAgICAgICAgd2hpbGUgKChwb3NzaWJsZUtleSA9IGZpbmFsS2V5cy5wb3AoKSkpIHtcbiAgICAgICAgICAgIGlmICghdGhpcy5pc1ZhbGlkTG9va3VwKGZvdW5kKSkge1xuICAgICAgICAgICAgICBleGFjdFVzZWRLZXkgPSBwb3NzaWJsZUtleTtcbiAgICAgICAgICAgICAgZm91bmQgPSB0aGlzLmdldFJlc291cmNlKGNvZGUsIG5zLCBwb3NzaWJsZUtleSwgb3B0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4geyByZXM6IGZvdW5kLCB1c2VkS2V5LCBleGFjdFVzZWRLZXksIHVzZWRMbmcsIHVzZWROUyB9O1xuICB9XG5cbiAgaXNWYWxpZExvb2t1cChyZXMpIHtcbiAgICByZXR1cm4gKFxuICAgICAgcmVzICE9PSB1bmRlZmluZWQgJiZcbiAgICAgICEoIXRoaXMub3B0aW9ucy5yZXR1cm5OdWxsICYmIHJlcyA9PT0gbnVsbCkgJiZcbiAgICAgICEoIXRoaXMub3B0aW9ucy5yZXR1cm5FbXB0eVN0cmluZyAmJiByZXMgPT09ICcnKVxuICAgICk7XG4gIH1cblxuICBnZXRSZXNvdXJjZShjb2RlLCBucywga2V5LCBvcHRpb25zID0ge30pIHtcbiAgICBpZiAodGhpcy5pMThuRm9ybWF0Py5nZXRSZXNvdXJjZSkgcmV0dXJuIHRoaXMuaTE4bkZvcm1hdC5nZXRSZXNvdXJjZShjb2RlLCBucywga2V5LCBvcHRpb25zKTtcbiAgICByZXR1cm4gdGhpcy5yZXNvdXJjZVN0b3JlLmdldFJlc291cmNlKGNvZGUsIG5zLCBrZXksIG9wdGlvbnMpO1xuICB9XG5cbiAgZ2V0VXNlZFBhcmFtc0RldGFpbHMob3B0aW9ucyA9IHt9KSB7XG4gICAgLy8gd2UgbmVlZCB0byByZW1lbWJlciB0byBleHRlbmQgdGhpcyBhcnJheSB3aGVuZXZlciBuZXcgb3B0aW9uIHByb3BlcnRpZXMgYXJlIGFkZGVkXG4gICAgY29uc3Qgb3B0aW9uc0tleXMgPSBbXG4gICAgICAnZGVmYXVsdFZhbHVlJyxcbiAgICAgICdvcmRpbmFsJyxcbiAgICAgICdjb250ZXh0JyxcbiAgICAgICdyZXBsYWNlJyxcbiAgICAgICdsbmcnLFxuICAgICAgJ2xuZ3MnLFxuICAgICAgJ2ZhbGxiYWNrTG5nJyxcbiAgICAgICducycsXG4gICAgICAna2V5U2VwYXJhdG9yJyxcbiAgICAgICduc1NlcGFyYXRvcicsXG4gICAgICAncmV0dXJuT2JqZWN0cycsXG4gICAgICAncmV0dXJuRGV0YWlscycsXG4gICAgICAnam9pbkFycmF5cycsXG4gICAgICAncG9zdFByb2Nlc3MnLFxuICAgICAgJ2ludGVycG9sYXRpb24nLFxuICAgIF07XG5cbiAgICBjb25zdCB1c2VPcHRpb25zUmVwbGFjZUZvckRhdGEgPSBvcHRpb25zLnJlcGxhY2UgJiYgIWlzU3RyaW5nKG9wdGlvbnMucmVwbGFjZSk7XG4gICAgbGV0IGRhdGEgPSB1c2VPcHRpb25zUmVwbGFjZUZvckRhdGEgPyBvcHRpb25zLnJlcGxhY2UgOiBvcHRpb25zO1xuICAgIGlmICh1c2VPcHRpb25zUmVwbGFjZUZvckRhdGEgJiYgdHlwZW9mIG9wdGlvbnMuY291bnQgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICBkYXRhLmNvdW50ID0gb3B0aW9ucy5jb3VudDtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLmludGVycG9sYXRpb24uZGVmYXVsdFZhcmlhYmxlcykge1xuICAgICAgZGF0YSA9IHsgLi4udGhpcy5vcHRpb25zLmludGVycG9sYXRpb24uZGVmYXVsdFZhcmlhYmxlcywgLi4uZGF0YSB9O1xuICAgIH1cblxuICAgIC8vIGF2b2lkIHJlcG9ydGluZyBvcHRpb25zIChleGVjcHQgY291bnQpIGFzIHVzZWRQYXJhbXNcbiAgICBpZiAoIXVzZU9wdGlvbnNSZXBsYWNlRm9yRGF0YSkge1xuICAgICAgZGF0YSA9IHsgLi4uZGF0YSB9O1xuICAgICAgZm9yIChjb25zdCBrZXkgb2Ygb3B0aW9uc0tleXMpIHtcbiAgICAgICAgZGVsZXRlIGRhdGFba2V5XTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gZGF0YTtcbiAgfVxuXG4gIHN0YXRpYyBoYXNEZWZhdWx0VmFsdWUob3B0aW9ucykge1xuICAgIGNvbnN0IHByZWZpeCA9ICdkZWZhdWx0VmFsdWUnO1xuXG4gICAgZm9yIChjb25zdCBvcHRpb24gaW4gb3B0aW9ucykge1xuICAgICAgaWYgKFxuICAgICAgICBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob3B0aW9ucywgb3B0aW9uKSAmJlxuICAgICAgICBwcmVmaXggPT09IG9wdGlvbi5zdWJzdHJpbmcoMCwgcHJlZml4Lmxlbmd0aCkgJiZcbiAgICAgICAgdW5kZWZpbmVkICE9PSBvcHRpb25zW29wdGlvbl1cbiAgICAgICkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgVHJhbnNsYXRvcjtcbiIsImltcG9ydCBiYXNlTG9nZ2VyIGZyb20gJy4vbG9nZ2VyLmpzJztcbmltcG9ydCB7IGdldENsZWFuZWRDb2RlLCBpc1N0cmluZyB9IGZyb20gJy4vdXRpbHMuanMnO1xuXG5jbGFzcyBMYW5ndWFnZVV0aWwge1xuICBjb25zdHJ1Y3RvcihvcHRpb25zKSB7XG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcblxuICAgIHRoaXMuc3VwcG9ydGVkTG5ncyA9IHRoaXMub3B0aW9ucy5zdXBwb3J0ZWRMbmdzIHx8IGZhbHNlO1xuICAgIHRoaXMubG9nZ2VyID0gYmFzZUxvZ2dlci5jcmVhdGUoJ2xhbmd1YWdlVXRpbHMnKTtcbiAgfVxuXG4gIGdldFNjcmlwdFBhcnRGcm9tQ29kZShjb2RlKSB7XG4gICAgY29kZSA9IGdldENsZWFuZWRDb2RlKGNvZGUpO1xuICAgIGlmICghY29kZSB8fCBjb2RlLmluZGV4T2YoJy0nKSA8IDApIHJldHVybiBudWxsO1xuXG4gICAgY29uc3QgcCA9IGNvZGUuc3BsaXQoJy0nKTtcbiAgICBpZiAocC5sZW5ndGggPT09IDIpIHJldHVybiBudWxsO1xuICAgIHAucG9wKCk7XG4gICAgaWYgKHBbcC5sZW5ndGggLSAxXS50b0xvd2VyQ2FzZSgpID09PSAneCcpIHJldHVybiBudWxsO1xuICAgIHJldHVybiB0aGlzLmZvcm1hdExhbmd1YWdlQ29kZShwLmpvaW4oJy0nKSk7XG4gIH1cblxuICBnZXRMYW5ndWFnZVBhcnRGcm9tQ29kZShjb2RlKSB7XG4gICAgY29kZSA9IGdldENsZWFuZWRDb2RlKGNvZGUpO1xuICAgIGlmICghY29kZSB8fCBjb2RlLmluZGV4T2YoJy0nKSA8IDApIHJldHVybiBjb2RlO1xuXG4gICAgY29uc3QgcCA9IGNvZGUuc3BsaXQoJy0nKTtcbiAgICByZXR1cm4gdGhpcy5mb3JtYXRMYW5ndWFnZUNvZGUocFswXSk7XG4gIH1cblxuICBmb3JtYXRMYW5ndWFnZUNvZGUoY29kZSkge1xuICAgIC8vIGh0dHA6Ly93d3cuaWFuYS5vcmcvYXNzaWdubWVudHMvbGFuZ3VhZ2UtdGFncy9sYW5ndWFnZS10YWdzLnhodG1sXG4gICAgaWYgKGlzU3RyaW5nKGNvZGUpICYmIGNvZGUuaW5kZXhPZignLScpID4gLTEpIHtcbiAgICAgIGxldCBmb3JtYXR0ZWRDb2RlO1xuICAgICAgdHJ5IHtcbiAgICAgICAgZm9ybWF0dGVkQ29kZSA9IEludGwuZ2V0Q2Fub25pY2FsTG9jYWxlcyhjb2RlKVswXTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgLyogZmFsbCB0aHJvdWdoICovXG4gICAgICB9XG4gICAgICBpZiAoZm9ybWF0dGVkQ29kZSAmJiB0aGlzLm9wdGlvbnMubG93ZXJDYXNlTG5nKSB7XG4gICAgICAgIGZvcm1hdHRlZENvZGUgPSBmb3JtYXR0ZWRDb2RlLnRvTG93ZXJDYXNlKCk7XG4gICAgICB9XG4gICAgICBpZiAoZm9ybWF0dGVkQ29kZSkgcmV0dXJuIGZvcm1hdHRlZENvZGU7XG5cbiAgICAgIGlmICh0aGlzLm9wdGlvbnMubG93ZXJDYXNlTG5nKSB7XG4gICAgICAgIHJldHVybiBjb2RlLnRvTG93ZXJDYXNlKCk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBjb2RlO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLm9wdGlvbnMuY2xlYW5Db2RlIHx8IHRoaXMub3B0aW9ucy5sb3dlckNhc2VMbmcgPyBjb2RlLnRvTG93ZXJDYXNlKCkgOiBjb2RlO1xuICB9XG5cbiAgaXNTdXBwb3J0ZWRDb2RlKGNvZGUpIHtcbiAgICBpZiAodGhpcy5vcHRpb25zLmxvYWQgPT09ICdsYW5ndWFnZU9ubHknIHx8IHRoaXMub3B0aW9ucy5ub25FeHBsaWNpdFN1cHBvcnRlZExuZ3MpIHtcbiAgICAgIGNvZGUgPSB0aGlzLmdldExhbmd1YWdlUGFydEZyb21Db2RlKGNvZGUpO1xuICAgIH1cbiAgICByZXR1cm4gKFxuICAgICAgIXRoaXMuc3VwcG9ydGVkTG5ncyB8fCAhdGhpcy5zdXBwb3J0ZWRMbmdzLmxlbmd0aCB8fCB0aGlzLnN1cHBvcnRlZExuZ3MuaW5kZXhPZihjb2RlKSA+IC0xXG4gICAgKTtcbiAgfVxuXG4gIGdldEJlc3RNYXRjaEZyb21Db2Rlcyhjb2Rlcykge1xuICAgIGlmICghY29kZXMpIHJldHVybiBudWxsO1xuXG4gICAgbGV0IGZvdW5kO1xuXG4gICAgLy8gcGljayBmaXJzdCBzdXBwb3J0ZWQgY29kZSBvciBpZiBubyByZXN0cmljdGlvbiBwaWNrIHRoZSBmaXJzdCBvbmUgKGhpZ2hlc3QgcHJpbylcbiAgICBjb2Rlcy5mb3JFYWNoKChjb2RlKSA9PiB7XG4gICAgICBpZiAoZm91bmQpIHJldHVybjtcbiAgICAgIGNvbnN0IGNsZWFuZWRMbmcgPSB0aGlzLmZvcm1hdExhbmd1YWdlQ29kZShjb2RlKTtcbiAgICAgIGlmICghdGhpcy5vcHRpb25zLnN1cHBvcnRlZExuZ3MgfHwgdGhpcy5pc1N1cHBvcnRlZENvZGUoY2xlYW5lZExuZykpIGZvdW5kID0gY2xlYW5lZExuZztcbiAgICB9KTtcblxuICAgIC8vIGlmIHdlIGdvdCBubyBtYXRjaCBpbiBzdXBwb3J0ZWRMbmdzIHlldCAtIGNoZWNrIGZvciBzaW1pbGFyIGxvY2FsZXNcbiAgICAvLyBmaXJzdCAgZGUtQ0ggLS0+IGRlXG4gICAgLy8gc2Vjb25kIGRlLUNIIC0tPiBkZS1ERVxuICAgIGlmICghZm91bmQgJiYgdGhpcy5vcHRpb25zLnN1cHBvcnRlZExuZ3MpIHtcbiAgICAgIGNvZGVzLmZvckVhY2goKGNvZGUpID0+IHtcbiAgICAgICAgaWYgKGZvdW5kKSByZXR1cm47XG5cbiAgICAgICAgY29uc3QgbG5nU2NPbmx5ID0gdGhpcy5nZXRTY3JpcHRQYXJ0RnJvbUNvZGUoY29kZSk7XG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1yZXR1cm4tYXNzaWduXG4gICAgICAgIGlmICh0aGlzLmlzU3VwcG9ydGVkQ29kZShsbmdTY09ubHkpKSByZXR1cm4gKGZvdW5kID0gbG5nU2NPbmx5KTtcblxuICAgICAgICBjb25zdCBsbmdPbmx5ID0gdGhpcy5nZXRMYW5ndWFnZVBhcnRGcm9tQ29kZShjb2RlKTtcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLXJldHVybi1hc3NpZ25cbiAgICAgICAgaWYgKHRoaXMuaXNTdXBwb3J0ZWRDb2RlKGxuZ09ubHkpKSByZXR1cm4gKGZvdW5kID0gbG5nT25seSk7XG5cbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIGFycmF5LWNhbGxiYWNrLXJldHVyblxuICAgICAgICBmb3VuZCA9IHRoaXMub3B0aW9ucy5zdXBwb3J0ZWRMbmdzLmZpbmQoKHN1cHBvcnRlZExuZykgPT4ge1xuICAgICAgICAgIGlmIChzdXBwb3J0ZWRMbmcgPT09IGxuZ09ubHkpIHJldHVybiBzdXBwb3J0ZWRMbmc7XG4gICAgICAgICAgaWYgKHN1cHBvcnRlZExuZy5pbmRleE9mKCctJykgPCAwICYmIGxuZ09ubHkuaW5kZXhPZignLScpIDwgMCkgcmV0dXJuO1xuICAgICAgICAgIGlmIChcbiAgICAgICAgICAgIHN1cHBvcnRlZExuZy5pbmRleE9mKCctJykgPiAwICYmXG4gICAgICAgICAgICBsbmdPbmx5LmluZGV4T2YoJy0nKSA8IDAgJiZcbiAgICAgICAgICAgIHN1cHBvcnRlZExuZy5zdWJzdHJpbmcoMCwgc3VwcG9ydGVkTG5nLmluZGV4T2YoJy0nKSkgPT09IGxuZ09ubHlcbiAgICAgICAgICApXG4gICAgICAgICAgICByZXR1cm4gc3VwcG9ydGVkTG5nO1xuICAgICAgICAgIGlmIChzdXBwb3J0ZWRMbmcuaW5kZXhPZihsbmdPbmx5KSA9PT0gMCAmJiBsbmdPbmx5Lmxlbmd0aCA+IDEpIHJldHVybiBzdXBwb3J0ZWRMbmc7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfVxuICAgIC8vIGlmIG5vdGhpbmcgZm91bmQsIHVzZSBmYWxsYmFja0xuZ1xuICAgIGlmICghZm91bmQpIGZvdW5kID0gdGhpcy5nZXRGYWxsYmFja0NvZGVzKHRoaXMub3B0aW9ucy5mYWxsYmFja0xuZylbMF07XG5cbiAgICByZXR1cm4gZm91bmQ7XG4gIH1cblxuICBnZXRGYWxsYmFja0NvZGVzKGZhbGxiYWNrcywgY29kZSkge1xuICAgIGlmICghZmFsbGJhY2tzKSByZXR1cm4gW107XG4gICAgaWYgKHR5cGVvZiBmYWxsYmFja3MgPT09ICdmdW5jdGlvbicpIGZhbGxiYWNrcyA9IGZhbGxiYWNrcyhjb2RlKTtcbiAgICBpZiAoaXNTdHJpbmcoZmFsbGJhY2tzKSkgZmFsbGJhY2tzID0gW2ZhbGxiYWNrc107XG4gICAgaWYgKEFycmF5LmlzQXJyYXkoZmFsbGJhY2tzKSkgcmV0dXJuIGZhbGxiYWNrcztcblxuICAgIGlmICghY29kZSkgcmV0dXJuIGZhbGxiYWNrcy5kZWZhdWx0IHx8IFtdO1xuXG4gICAgLy8gYXNzdW1lIHdlIGhhdmUgYW4gb2JqZWN0IGRlZmluaW5nIGZhbGxiYWNrc1xuICAgIGxldCBmb3VuZCA9IGZhbGxiYWNrc1tjb2RlXTtcbiAgICBpZiAoIWZvdW5kKSBmb3VuZCA9IGZhbGxiYWNrc1t0aGlzLmdldFNjcmlwdFBhcnRGcm9tQ29kZShjb2RlKV07XG4gICAgaWYgKCFmb3VuZCkgZm91bmQgPSBmYWxsYmFja3NbdGhpcy5mb3JtYXRMYW5ndWFnZUNvZGUoY29kZSldO1xuICAgIGlmICghZm91bmQpIGZvdW5kID0gZmFsbGJhY2tzW3RoaXMuZ2V0TGFuZ3VhZ2VQYXJ0RnJvbUNvZGUoY29kZSldO1xuICAgIGlmICghZm91bmQpIGZvdW5kID0gZmFsbGJhY2tzLmRlZmF1bHQ7XG5cbiAgICByZXR1cm4gZm91bmQgfHwgW107XG4gIH1cblxuICB0b1Jlc29sdmVIaWVyYXJjaHkoY29kZSwgZmFsbGJhY2tDb2RlKSB7XG4gICAgY29uc3QgZmFsbGJhY2tDb2RlcyA9IHRoaXMuZ2V0RmFsbGJhY2tDb2RlcyhcbiAgICAgIChmYWxsYmFja0NvZGUgPT09IGZhbHNlID8gW10gOiBmYWxsYmFja0NvZGUpIHx8IHRoaXMub3B0aW9ucy5mYWxsYmFja0xuZyB8fCBbXSxcbiAgICAgIGNvZGUsXG4gICAgKTtcblxuICAgIGNvbnN0IGNvZGVzID0gW107XG4gICAgY29uc3QgYWRkQ29kZSA9IChjKSA9PiB7XG4gICAgICBpZiAoIWMpIHJldHVybjtcbiAgICAgIGlmICh0aGlzLmlzU3VwcG9ydGVkQ29kZShjKSkge1xuICAgICAgICBjb2Rlcy5wdXNoKGMpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5sb2dnZXIud2FybihgcmVqZWN0aW5nIGxhbmd1YWdlIGNvZGUgbm90IGZvdW5kIGluIHN1cHBvcnRlZExuZ3M6ICR7Y31gKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgaWYgKGlzU3RyaW5nKGNvZGUpICYmIChjb2RlLmluZGV4T2YoJy0nKSA+IC0xIHx8IGNvZGUuaW5kZXhPZignXycpID4gLTEpKSB7XG4gICAgICBpZiAodGhpcy5vcHRpb25zLmxvYWQgIT09ICdsYW5ndWFnZU9ubHknKSBhZGRDb2RlKHRoaXMuZm9ybWF0TGFuZ3VhZ2VDb2RlKGNvZGUpKTtcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMubG9hZCAhPT0gJ2xhbmd1YWdlT25seScgJiYgdGhpcy5vcHRpb25zLmxvYWQgIT09ICdjdXJyZW50T25seScpXG4gICAgICAgIGFkZENvZGUodGhpcy5nZXRTY3JpcHRQYXJ0RnJvbUNvZGUoY29kZSkpO1xuICAgICAgaWYgKHRoaXMub3B0aW9ucy5sb2FkICE9PSAnY3VycmVudE9ubHknKSBhZGRDb2RlKHRoaXMuZ2V0TGFuZ3VhZ2VQYXJ0RnJvbUNvZGUoY29kZSkpO1xuICAgIH0gZWxzZSBpZiAoaXNTdHJpbmcoY29kZSkpIHtcbiAgICAgIGFkZENvZGUodGhpcy5mb3JtYXRMYW5ndWFnZUNvZGUoY29kZSkpO1xuICAgIH1cblxuICAgIGZhbGxiYWNrQ29kZXMuZm9yRWFjaCgoZmMpID0+IHtcbiAgICAgIGlmIChjb2Rlcy5pbmRleE9mKGZjKSA8IDApIGFkZENvZGUodGhpcy5mb3JtYXRMYW5ndWFnZUNvZGUoZmMpKTtcbiAgICB9KTtcblxuICAgIHJldHVybiBjb2RlcztcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBMYW5ndWFnZVV0aWw7XG4iLCJpbXBvcnQgYmFzZUxvZ2dlciBmcm9tICcuL2xvZ2dlci5qcyc7XG5pbXBvcnQgeyBnZXRDbGVhbmVkQ29kZSB9IGZyb20gJy4vdXRpbHMuanMnXG5cbmNvbnN0IHN1ZmZpeGVzT3JkZXIgPSB7XG4gIHplcm86IDAsXG4gIG9uZTogMSxcbiAgdHdvOiAyLFxuICBmZXc6IDMsXG4gIG1hbnk6IDQsXG4gIG90aGVyOiA1LFxufTtcblxuY29uc3QgZHVtbXlSdWxlID0ge1xuICBzZWxlY3Q6IChjb3VudCkgPT4gY291bnQgPT09IDEgPyAnb25lJyA6ICdvdGhlcicsXG4gIHJlc29sdmVkT3B0aW9uczogKCkgPT4gKHtcbiAgICBwbHVyYWxDYXRlZ29yaWVzOiBbJ29uZScsICdvdGhlciddXG4gIH0pXG59O1xuXG5jbGFzcyBQbHVyYWxSZXNvbHZlciB7XG4gIGNvbnN0cnVjdG9yKGxhbmd1YWdlVXRpbHMsIG9wdGlvbnMgPSB7fSkge1xuICAgIHRoaXMubGFuZ3VhZ2VVdGlscyA9IGxhbmd1YWdlVXRpbHM7XG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcblxuICAgIHRoaXMubG9nZ2VyID0gYmFzZUxvZ2dlci5jcmVhdGUoJ3BsdXJhbFJlc29sdmVyJyk7XG5cbiAgICAvLyBDYWNoZSBjYWxscyB0byBJbnRsLlBsdXJhbFJ1bGVzLCBzaW5jZSByZXBlYXRlZCBjYWxscyBjYW4gYmUgc2xvdyBpbiBydW50aW1lcyBsaWtlIFJlYWN0IE5hdGl2ZVxuICAgIC8vIGFuZCB0aGUgbWVtb3J5IHVzYWdlIGRpZmZlcmVuY2UgaXMgbmVnbGlnaWJsZVxuICAgIHRoaXMucGx1cmFsUnVsZXNDYWNoZSA9IHt9O1xuICB9XG5cbiAgYWRkUnVsZShsbmcsIG9iaikge1xuICAgIHRoaXMucnVsZXNbbG5nXSA9IG9iajtcbiAgfVxuXG4gIGNsZWFyQ2FjaGUoKSB7XG4gICAgdGhpcy5wbHVyYWxSdWxlc0NhY2hlID0ge307XG4gIH1cblxuICBnZXRSdWxlKGNvZGUsIG9wdGlvbnMgPSB7fSkge1xuICAgIGNvbnN0IGNsZWFuZWRDb2RlID0gZ2V0Q2xlYW5lZENvZGUoY29kZSA9PT0gJ2RldicgPyAnZW4nIDogY29kZSk7XG4gICAgY29uc3QgdHlwZSA9IG9wdGlvbnMub3JkaW5hbCA/ICdvcmRpbmFsJyA6ICdjYXJkaW5hbCc7XG4gICAgY29uc3QgY2FjaGVLZXkgPSBKU09OLnN0cmluZ2lmeSh7IGNsZWFuZWRDb2RlLCB0eXBlIH0pO1xuXG4gICAgaWYgKGNhY2hlS2V5IGluIHRoaXMucGx1cmFsUnVsZXNDYWNoZSkge1xuICAgICAgcmV0dXJuIHRoaXMucGx1cmFsUnVsZXNDYWNoZVtjYWNoZUtleV07XG4gICAgfVxuXG4gICAgbGV0IHJ1bGU7XG5cbiAgICB0cnkge1xuICAgICAgcnVsZSA9IG5ldyBJbnRsLlBsdXJhbFJ1bGVzKGNsZWFuZWRDb2RlLCB7IHR5cGUgfSk7XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBpZiAoIUludGwpIHtcbiAgICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoJ05vIEludGwgc3VwcG9ydCwgcGxlYXNlIHVzZSBhbiBJbnRsIHBvbHlmaWxsIScpO1xuICAgICAgICByZXR1cm4gZHVtbXlSdWxlO1xuICAgICAgfVxuICAgICAgaWYgKCFjb2RlLm1hdGNoKC8tfF8vKSkgcmV0dXJuIGR1bW15UnVsZTtcbiAgICAgIGNvbnN0IGxuZ1BhcnQgPSB0aGlzLmxhbmd1YWdlVXRpbHMuZ2V0TGFuZ3VhZ2VQYXJ0RnJvbUNvZGUoY29kZSk7XG4gICAgICBydWxlID0gdGhpcy5nZXRSdWxlKGxuZ1BhcnQsIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIHRoaXMucGx1cmFsUnVsZXNDYWNoZVtjYWNoZUtleV0gPSBydWxlO1xuICAgIHJldHVybiBydWxlO1xuICB9XG5cbiAgbmVlZHNQbHVyYWwoY29kZSwgb3B0aW9ucyA9IHt9KSB7XG4gICAgbGV0IHJ1bGUgPSB0aGlzLmdldFJ1bGUoY29kZSwgb3B0aW9ucyk7XG4gICAgaWYgKCFydWxlKSBydWxlID0gdGhpcy5nZXRSdWxlKCdkZXYnLCBvcHRpb25zKTtcbiAgICByZXR1cm4gcnVsZT8ucmVzb2x2ZWRPcHRpb25zKCkucGx1cmFsQ2F0ZWdvcmllcy5sZW5ndGggPiAxO1xuICB9XG5cbiAgZ2V0UGx1cmFsRm9ybXNPZktleShjb2RlLCBrZXksIG9wdGlvbnMgPSB7fSkge1xuICAgIHJldHVybiB0aGlzLmdldFN1ZmZpeGVzKGNvZGUsIG9wdGlvbnMpLm1hcCgoc3VmZml4KSA9PiBgJHtrZXl9JHtzdWZmaXh9YCk7XG4gIH1cblxuICBnZXRTdWZmaXhlcyhjb2RlLCBvcHRpb25zID0ge30pIHtcbiAgICBsZXQgcnVsZSA9IHRoaXMuZ2V0UnVsZShjb2RlLCBvcHRpb25zKTtcbiAgICBpZiAoIXJ1bGUpIHJ1bGUgPSB0aGlzLmdldFJ1bGUoJ2RldicsIG9wdGlvbnMpO1xuICAgIGlmICghcnVsZSkgcmV0dXJuIFtdO1xuXG4gICAgcmV0dXJuIHJ1bGUucmVzb2x2ZWRPcHRpb25zKCkucGx1cmFsQ2F0ZWdvcmllc1xuICAgICAgLnNvcnQoKHBsdXJhbENhdGVnb3J5MSwgcGx1cmFsQ2F0ZWdvcnkyKSA9PiBzdWZmaXhlc09yZGVyW3BsdXJhbENhdGVnb3J5MV0gLSBzdWZmaXhlc09yZGVyW3BsdXJhbENhdGVnb3J5Ml0pXG4gICAgICAubWFwKHBsdXJhbENhdGVnb3J5ID0+IGAke3RoaXMub3B0aW9ucy5wcmVwZW5kfSR7b3B0aW9ucy5vcmRpbmFsID8gYG9yZGluYWwke3RoaXMub3B0aW9ucy5wcmVwZW5kfWAgOiAnJ30ke3BsdXJhbENhdGVnb3J5fWApO1xuICB9XG5cbiAgZ2V0U3VmZml4KGNvZGUsIGNvdW50LCBvcHRpb25zID0ge30pIHtcbiAgICBjb25zdCBydWxlID0gdGhpcy5nZXRSdWxlKGNvZGUsIG9wdGlvbnMpO1xuXG4gICAgaWYgKHJ1bGUpIHtcbiAgICAgIHJldHVybiBgJHt0aGlzLm9wdGlvbnMucHJlcGVuZH0ke29wdGlvbnMub3JkaW5hbCA/IGBvcmRpbmFsJHt0aGlzLm9wdGlvbnMucHJlcGVuZH1gIDogJyd9JHtydWxlLnNlbGVjdChjb3VudCl9YDtcbiAgICB9XG5cbiAgICB0aGlzLmxvZ2dlci53YXJuKGBubyBwbHVyYWwgcnVsZSBmb3VuZCBmb3I6ICR7Y29kZX1gKTtcbiAgICByZXR1cm4gdGhpcy5nZXRTdWZmaXgoJ2RldicsIGNvdW50LCBvcHRpb25zKTtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBQbHVyYWxSZXNvbHZlcjtcbiIsImltcG9ydCB7XG4gIGdldFBhdGhXaXRoRGVmYXVsdHMsXG4gIGRlZXBGaW5kLFxuICBlc2NhcGUgYXMgdXRpbHNFc2NhcGUsXG4gIHJlZ2V4RXNjYXBlLFxuICBtYWtlU3RyaW5nLFxuICBpc1N0cmluZyxcbn0gZnJvbSAnLi91dGlscy5qcyc7XG5pbXBvcnQgYmFzZUxvZ2dlciBmcm9tICcuL2xvZ2dlci5qcyc7XG5cbmNvbnN0IGRlZXBGaW5kV2l0aERlZmF1bHRzID0gKFxuICBkYXRhLFxuICBkZWZhdWx0RGF0YSxcbiAga2V5LFxuICBrZXlTZXBhcmF0b3IgPSAnLicsXG4gIGlnbm9yZUpTT05TdHJ1Y3R1cmUgPSB0cnVlLFxuKSA9PiB7XG4gIGxldCBwYXRoID0gZ2V0UGF0aFdpdGhEZWZhdWx0cyhkYXRhLCBkZWZhdWx0RGF0YSwga2V5KTtcbiAgaWYgKCFwYXRoICYmIGlnbm9yZUpTT05TdHJ1Y3R1cmUgJiYgaXNTdHJpbmcoa2V5KSkge1xuICAgIHBhdGggPSBkZWVwRmluZChkYXRhLCBrZXksIGtleVNlcGFyYXRvcik7XG4gICAgaWYgKHBhdGggPT09IHVuZGVmaW5lZCkgcGF0aCA9IGRlZXBGaW5kKGRlZmF1bHREYXRhLCBrZXksIGtleVNlcGFyYXRvcik7XG4gIH1cbiAgcmV0dXJuIHBhdGg7XG59O1xuXG5jb25zdCByZWdleFNhZmUgPSAodmFsKSA9PiB2YWwucmVwbGFjZSgvXFwkL2csICckJCQkJyk7XG5cbmNsYXNzIEludGVycG9sYXRvciB7XG4gIGNvbnN0cnVjdG9yKG9wdGlvbnMgPSB7fSkge1xuICAgIHRoaXMubG9nZ2VyID0gYmFzZUxvZ2dlci5jcmVhdGUoJ2ludGVycG9sYXRvcicpO1xuXG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcbiAgICB0aGlzLmZvcm1hdCA9IG9wdGlvbnM/LmludGVycG9sYXRpb24/LmZvcm1hdCB8fCAoKHZhbHVlKSA9PiB2YWx1ZSk7XG4gICAgdGhpcy5pbml0KG9wdGlvbnMpO1xuICB9XG5cbiAgLyogZXNsaW50IG5vLXBhcmFtLXJlYXNzaWduOiAwICovXG4gIGluaXQob3B0aW9ucyA9IHt9KSB7XG4gICAgaWYgKCFvcHRpb25zLmludGVycG9sYXRpb24pIG9wdGlvbnMuaW50ZXJwb2xhdGlvbiA9IHsgZXNjYXBlVmFsdWU6IHRydWUgfTtcblxuICAgIGNvbnN0IHtcbiAgICAgIGVzY2FwZSxcbiAgICAgIGVzY2FwZVZhbHVlLFxuICAgICAgdXNlUmF3VmFsdWVUb0VzY2FwZSxcbiAgICAgIHByZWZpeCxcbiAgICAgIHByZWZpeEVzY2FwZWQsXG4gICAgICBzdWZmaXgsXG4gICAgICBzdWZmaXhFc2NhcGVkLFxuICAgICAgZm9ybWF0U2VwYXJhdG9yLFxuICAgICAgdW5lc2NhcGVTdWZmaXgsXG4gICAgICB1bmVzY2FwZVByZWZpeCxcbiAgICAgIG5lc3RpbmdQcmVmaXgsXG4gICAgICBuZXN0aW5nUHJlZml4RXNjYXBlZCxcbiAgICAgIG5lc3RpbmdTdWZmaXgsXG4gICAgICBuZXN0aW5nU3VmZml4RXNjYXBlZCxcbiAgICAgIG5lc3RpbmdPcHRpb25zU2VwYXJhdG9yLFxuICAgICAgbWF4UmVwbGFjZXMsXG4gICAgICBhbHdheXNGb3JtYXQsXG4gICAgfSA9IG9wdGlvbnMuaW50ZXJwb2xhdGlvbjtcblxuICAgIHRoaXMuZXNjYXBlID0gZXNjYXBlICE9PSB1bmRlZmluZWQgPyBlc2NhcGUgOiB1dGlsc0VzY2FwZTtcbiAgICB0aGlzLmVzY2FwZVZhbHVlID0gZXNjYXBlVmFsdWUgIT09IHVuZGVmaW5lZCA/IGVzY2FwZVZhbHVlIDogdHJ1ZTtcbiAgICB0aGlzLnVzZVJhd1ZhbHVlVG9Fc2NhcGUgPSB1c2VSYXdWYWx1ZVRvRXNjYXBlICE9PSB1bmRlZmluZWQgPyB1c2VSYXdWYWx1ZVRvRXNjYXBlIDogZmFsc2U7XG5cbiAgICB0aGlzLnByZWZpeCA9IHByZWZpeCA/IHJlZ2V4RXNjYXBlKHByZWZpeCkgOiBwcmVmaXhFc2NhcGVkIHx8ICd7eyc7XG4gICAgdGhpcy5zdWZmaXggPSBzdWZmaXggPyByZWdleEVzY2FwZShzdWZmaXgpIDogc3VmZml4RXNjYXBlZCB8fCAnfX0nO1xuXG4gICAgdGhpcy5mb3JtYXRTZXBhcmF0b3IgPSBmb3JtYXRTZXBhcmF0b3IgfHwgJywnO1xuXG4gICAgdGhpcy51bmVzY2FwZVByZWZpeCA9IHVuZXNjYXBlU3VmZml4ID8gJycgOiB1bmVzY2FwZVByZWZpeCB8fCAnLSc7XG4gICAgdGhpcy51bmVzY2FwZVN1ZmZpeCA9IHRoaXMudW5lc2NhcGVQcmVmaXggPyAnJyA6IHVuZXNjYXBlU3VmZml4IHx8ICcnO1xuXG4gICAgdGhpcy5uZXN0aW5nUHJlZml4ID0gbmVzdGluZ1ByZWZpeFxuICAgICAgPyByZWdleEVzY2FwZShuZXN0aW5nUHJlZml4KVxuICAgICAgOiBuZXN0aW5nUHJlZml4RXNjYXBlZCB8fCByZWdleEVzY2FwZSgnJHQoJyk7XG4gICAgdGhpcy5uZXN0aW5nU3VmZml4ID0gbmVzdGluZ1N1ZmZpeFxuICAgICAgPyByZWdleEVzY2FwZShuZXN0aW5nU3VmZml4KVxuICAgICAgOiBuZXN0aW5nU3VmZml4RXNjYXBlZCB8fCByZWdleEVzY2FwZSgnKScpO1xuXG4gICAgdGhpcy5uZXN0aW5nT3B0aW9uc1NlcGFyYXRvciA9IG5lc3RpbmdPcHRpb25zU2VwYXJhdG9yIHx8ICcsJztcblxuICAgIHRoaXMubWF4UmVwbGFjZXMgPSBtYXhSZXBsYWNlcyB8fCAxMDAwO1xuXG4gICAgdGhpcy5hbHdheXNGb3JtYXQgPSBhbHdheXNGb3JtYXQgIT09IHVuZGVmaW5lZCA/IGFsd2F5c0Zvcm1hdCA6IGZhbHNlO1xuXG4gICAgLy8gdGhlIHJlZ2V4cFxuICAgIHRoaXMucmVzZXRSZWdFeHAoKTtcbiAgfVxuXG4gIHJlc2V0KCkge1xuICAgIGlmICh0aGlzLm9wdGlvbnMpIHRoaXMuaW5pdCh0aGlzLm9wdGlvbnMpO1xuICB9XG5cbiAgcmVzZXRSZWdFeHAoKSB7XG4gICAgY29uc3QgZ2V0T3JSZXNldFJlZ0V4cCA9IChleGlzdGluZ1JlZ0V4cCwgcGF0dGVybikgPT4ge1xuICAgICAgaWYgKGV4aXN0aW5nUmVnRXhwPy5zb3VyY2UgPT09IHBhdHRlcm4pIHtcbiAgICAgICAgZXhpc3RpbmdSZWdFeHAubGFzdEluZGV4ID0gMDtcbiAgICAgICAgcmV0dXJuIGV4aXN0aW5nUmVnRXhwO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG5ldyBSZWdFeHAocGF0dGVybiwgJ2cnKTtcbiAgICB9O1xuXG4gICAgdGhpcy5yZWdleHAgPSBnZXRPclJlc2V0UmVnRXhwKHRoaXMucmVnZXhwLCBgJHt0aGlzLnByZWZpeH0oLis/KSR7dGhpcy5zdWZmaXh9YCk7XG4gICAgdGhpcy5yZWdleHBVbmVzY2FwZSA9IGdldE9yUmVzZXRSZWdFeHAoXG4gICAgICB0aGlzLnJlZ2V4cFVuZXNjYXBlLFxuICAgICAgYCR7dGhpcy5wcmVmaXh9JHt0aGlzLnVuZXNjYXBlUHJlZml4fSguKz8pJHt0aGlzLnVuZXNjYXBlU3VmZml4fSR7dGhpcy5zdWZmaXh9YCxcbiAgICApO1xuICAgIHRoaXMubmVzdGluZ1JlZ2V4cCA9IGdldE9yUmVzZXRSZWdFeHAoXG4gICAgICB0aGlzLm5lc3RpbmdSZWdleHAsXG4gICAgICBgJHt0aGlzLm5lc3RpbmdQcmVmaXh9KC4rPykke3RoaXMubmVzdGluZ1N1ZmZpeH1gLFxuICAgICk7XG4gIH1cblxuICBpbnRlcnBvbGF0ZShzdHIsIGRhdGEsIGxuZywgb3B0aW9ucykge1xuICAgIGxldCBtYXRjaDtcbiAgICBsZXQgdmFsdWU7XG4gICAgbGV0IHJlcGxhY2VzO1xuXG4gICAgY29uc3QgZGVmYXVsdERhdGEgPVxuICAgICAgKHRoaXMub3B0aW9ucyAmJiB0aGlzLm9wdGlvbnMuaW50ZXJwb2xhdGlvbiAmJiB0aGlzLm9wdGlvbnMuaW50ZXJwb2xhdGlvbi5kZWZhdWx0VmFyaWFibGVzKSB8fFxuICAgICAge307XG5cbiAgICBjb25zdCBoYW5kbGVGb3JtYXQgPSAoa2V5KSA9PiB7XG4gICAgICBpZiAoa2V5LmluZGV4T2YodGhpcy5mb3JtYXRTZXBhcmF0b3IpIDwgMCkge1xuICAgICAgICBjb25zdCBwYXRoID0gZGVlcEZpbmRXaXRoRGVmYXVsdHMoXG4gICAgICAgICAgZGF0YSxcbiAgICAgICAgICBkZWZhdWx0RGF0YSxcbiAgICAgICAgICBrZXksXG4gICAgICAgICAgdGhpcy5vcHRpb25zLmtleVNlcGFyYXRvcixcbiAgICAgICAgICB0aGlzLm9wdGlvbnMuaWdub3JlSlNPTlN0cnVjdHVyZSxcbiAgICAgICAgKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuYWx3YXlzRm9ybWF0XG4gICAgICAgICAgPyB0aGlzLmZvcm1hdChwYXRoLCB1bmRlZmluZWQsIGxuZywgeyAuLi5vcHRpb25zLCAuLi5kYXRhLCBpbnRlcnBvbGF0aW9ua2V5OiBrZXkgfSlcbiAgICAgICAgICA6IHBhdGg7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHAgPSBrZXkuc3BsaXQodGhpcy5mb3JtYXRTZXBhcmF0b3IpO1xuICAgICAgY29uc3QgayA9IHAuc2hpZnQoKS50cmltKCk7XG4gICAgICBjb25zdCBmID0gcC5qb2luKHRoaXMuZm9ybWF0U2VwYXJhdG9yKS50cmltKCk7XG5cbiAgICAgIHJldHVybiB0aGlzLmZvcm1hdChcbiAgICAgICAgZGVlcEZpbmRXaXRoRGVmYXVsdHMoXG4gICAgICAgICAgZGF0YSxcbiAgICAgICAgICBkZWZhdWx0RGF0YSxcbiAgICAgICAgICBrLFxuICAgICAgICAgIHRoaXMub3B0aW9ucy5rZXlTZXBhcmF0b3IsXG4gICAgICAgICAgdGhpcy5vcHRpb25zLmlnbm9yZUpTT05TdHJ1Y3R1cmUsXG4gICAgICAgICksXG4gICAgICAgIGYsXG4gICAgICAgIGxuZyxcbiAgICAgICAge1xuICAgICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICAgICAgLi4uZGF0YSxcbiAgICAgICAgICBpbnRlcnBvbGF0aW9ua2V5OiBrLFxuICAgICAgICB9LFxuICAgICAgKTtcbiAgICB9O1xuXG4gICAgdGhpcy5yZXNldFJlZ0V4cCgpO1xuXG4gICAgY29uc3QgbWlzc2luZ0ludGVycG9sYXRpb25IYW5kbGVyID1cbiAgICAgIG9wdGlvbnM/Lm1pc3NpbmdJbnRlcnBvbGF0aW9uSGFuZGxlciB8fCB0aGlzLm9wdGlvbnMubWlzc2luZ0ludGVycG9sYXRpb25IYW5kbGVyO1xuXG4gICAgY29uc3Qgc2tpcE9uVmFyaWFibGVzID1cbiAgICAgIG9wdGlvbnM/LmludGVycG9sYXRpb24/LnNraXBPblZhcmlhYmxlcyAhPT0gdW5kZWZpbmVkXG4gICAgICAgID8gb3B0aW9ucy5pbnRlcnBvbGF0aW9uLnNraXBPblZhcmlhYmxlc1xuICAgICAgICA6IHRoaXMub3B0aW9ucy5pbnRlcnBvbGF0aW9uLnNraXBPblZhcmlhYmxlcztcblxuICAgIGNvbnN0IHRvZG9zID0gW1xuICAgICAge1xuICAgICAgICAvLyB1bmVzY2FwZSBpZiBoYXMgdW5lc2NhcGVQcmVmaXgvU3VmZml4XG4gICAgICAgIHJlZ2V4OiB0aGlzLnJlZ2V4cFVuZXNjYXBlLFxuICAgICAgICBzYWZlVmFsdWU6ICh2YWwpID0+IHJlZ2V4U2FmZSh2YWwpLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgLy8gcmVndWxhciBlc2NhcGUgb24gZGVtYW5kXG4gICAgICAgIHJlZ2V4OiB0aGlzLnJlZ2V4cCxcbiAgICAgICAgc2FmZVZhbHVlOiAodmFsKSA9PiAodGhpcy5lc2NhcGVWYWx1ZSA/IHJlZ2V4U2FmZSh0aGlzLmVzY2FwZSh2YWwpKSA6IHJlZ2V4U2FmZSh2YWwpKSxcbiAgICAgIH0sXG4gICAgXTtcbiAgICB0b2Rvcy5mb3JFYWNoKCh0b2RvKSA9PiB7XG4gICAgICByZXBsYWNlcyA9IDA7XG4gICAgICAvKiBlc2xpbnQgbm8tY29uZC1hc3NpZ246IDAgKi9cbiAgICAgIHdoaWxlICgobWF0Y2ggPSB0b2RvLnJlZ2V4LmV4ZWMoc3RyKSkpIHtcbiAgICAgICAgY29uc3QgbWF0Y2hlZFZhciA9IG1hdGNoWzFdLnRyaW0oKTtcbiAgICAgICAgdmFsdWUgPSBoYW5kbGVGb3JtYXQobWF0Y2hlZFZhcik7XG4gICAgICAgIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgaWYgKHR5cGVvZiBtaXNzaW5nSW50ZXJwb2xhdGlvbkhhbmRsZXIgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNvbnN0IHRlbXAgPSBtaXNzaW5nSW50ZXJwb2xhdGlvbkhhbmRsZXIoc3RyLCBtYXRjaCwgb3B0aW9ucyk7XG4gICAgICAgICAgICB2YWx1ZSA9IGlzU3RyaW5nKHRlbXApID8gdGVtcCA6ICcnO1xuICAgICAgICAgIH0gZWxzZSBpZiAob3B0aW9ucyAmJiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob3B0aW9ucywgbWF0Y2hlZFZhcikpIHtcbiAgICAgICAgICAgIHZhbHVlID0gJyc7IC8vIHVuZGVmaW5lZCBiZWNvbWVzIGVtcHR5IHN0cmluZ1xuICAgICAgICAgIH0gZWxzZSBpZiAoc2tpcE9uVmFyaWFibGVzKSB7XG4gICAgICAgICAgICB2YWx1ZSA9IG1hdGNoWzBdO1xuICAgICAgICAgICAgY29udGludWU7IC8vIHRoaXMgbWFrZXMgc3VyZSBpdCBjb250aW51ZXMgdG8gZGV0ZWN0IG90aGVyc1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmxvZ2dlci53YXJuKGBtaXNzZWQgdG8gcGFzcyBpbiB2YXJpYWJsZSAke21hdGNoZWRWYXJ9IGZvciBpbnRlcnBvbGF0aW5nICR7c3RyfWApO1xuICAgICAgICAgICAgdmFsdWUgPSAnJztcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoIWlzU3RyaW5nKHZhbHVlKSAmJiAhdGhpcy51c2VSYXdWYWx1ZVRvRXNjYXBlKSB7XG4gICAgICAgICAgdmFsdWUgPSBtYWtlU3RyaW5nKHZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBzYWZlVmFsdWUgPSB0b2RvLnNhZmVWYWx1ZSh2YWx1ZSk7XG4gICAgICAgIHN0ciA9IHN0ci5yZXBsYWNlKG1hdGNoWzBdLCBzYWZlVmFsdWUpO1xuICAgICAgICBpZiAoc2tpcE9uVmFyaWFibGVzKSB7XG4gICAgICAgICAgdG9kby5yZWdleC5sYXN0SW5kZXggKz0gdmFsdWUubGVuZ3RoO1xuICAgICAgICAgIHRvZG8ucmVnZXgubGFzdEluZGV4IC09IG1hdGNoWzBdLmxlbmd0aDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0b2RvLnJlZ2V4Lmxhc3RJbmRleCA9IDA7XG4gICAgICAgIH1cbiAgICAgICAgcmVwbGFjZXMrKztcbiAgICAgICAgaWYgKHJlcGxhY2VzID49IHRoaXMubWF4UmVwbGFjZXMpIHtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBzdHI7XG4gIH1cblxuICBuZXN0KHN0ciwgZmMsIG9wdGlvbnMgPSB7fSkge1xuICAgIGxldCBtYXRjaDtcbiAgICBsZXQgdmFsdWU7XG5cbiAgICBsZXQgY2xvbmVkT3B0aW9ucztcblxuICAgIC8vIGlmIHZhbHVlIGlzIHNvbWV0aGluZyBsaWtlIFwibXlLZXlcIjogXCJsb3JlbSAkKGFub3RoZXJLZXksIHsgXCJjb3VudFwiOiB7e2FWYWx1ZUluT3B0aW9uc319IH0pXCJcbiAgICBjb25zdCBoYW5kbGVIYXNPcHRpb25zID0gKGtleSwgaW5oZXJpdGVkT3B0aW9ucykgPT4ge1xuICAgICAgY29uc3Qgc2VwID0gdGhpcy5uZXN0aW5nT3B0aW9uc1NlcGFyYXRvcjtcbiAgICAgIGlmIChrZXkuaW5kZXhPZihzZXApIDwgMCkgcmV0dXJuIGtleTtcblxuICAgICAgY29uc3QgYyA9IGtleS5zcGxpdChuZXcgUmVnRXhwKGAke3NlcH1bIF0qe2ApKTtcblxuICAgICAgbGV0IG9wdGlvbnNTdHJpbmcgPSBgeyR7Y1sxXX1gO1xuICAgICAga2V5ID0gY1swXTtcbiAgICAgIG9wdGlvbnNTdHJpbmcgPSB0aGlzLmludGVycG9sYXRlKG9wdGlvbnNTdHJpbmcsIGNsb25lZE9wdGlvbnMpO1xuICAgICAgY29uc3QgbWF0Y2hlZFNpbmdsZVF1b3RlcyA9IG9wdGlvbnNTdHJpbmcubWF0Y2goLycvZyk7XG4gICAgICBjb25zdCBtYXRjaGVkRG91YmxlUXVvdGVzID0gb3B0aW9uc1N0cmluZy5tYXRjaCgvXCIvZyk7XG4gICAgICBpZiAoXG4gICAgICAgICgobWF0Y2hlZFNpbmdsZVF1b3Rlcz8ubGVuZ3RoID8/IDApICUgMiA9PT0gMCAmJiAhbWF0Y2hlZERvdWJsZVF1b3RlcykgfHxcbiAgICAgICAgbWF0Y2hlZERvdWJsZVF1b3Rlcy5sZW5ndGggJSAyICE9PSAwXG4gICAgICApIHtcbiAgICAgICAgb3B0aW9uc1N0cmluZyA9IG9wdGlvbnNTdHJpbmcucmVwbGFjZSgvJy9nLCAnXCInKTtcbiAgICAgIH1cblxuICAgICAgdHJ5IHtcbiAgICAgICAgY2xvbmVkT3B0aW9ucyA9IEpTT04ucGFyc2Uob3B0aW9uc1N0cmluZyk7XG5cbiAgICAgICAgaWYgKGluaGVyaXRlZE9wdGlvbnMpIGNsb25lZE9wdGlvbnMgPSB7IC4uLmluaGVyaXRlZE9wdGlvbnMsIC4uLmNsb25lZE9wdGlvbnMgfTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgdGhpcy5sb2dnZXIud2FybihgZmFpbGVkIHBhcnNpbmcgb3B0aW9ucyBzdHJpbmcgaW4gbmVzdGluZyBmb3Iga2V5ICR7a2V5fWAsIGUpO1xuICAgICAgICByZXR1cm4gYCR7a2V5fSR7c2VwfSR7b3B0aW9uc1N0cmluZ31gO1xuICAgICAgfVxuXG4gICAgICAvLyBhc3NlcnQgd2UgZG8gbm90IGdldCBhIGVuZGxlc3MgbG9vcCBvbiBpbnRlcnBvbGF0aW5nIGRlZmF1bHRWYWx1ZSBhZ2FpbiBhbmQgYWdhaW5cbiAgICAgIGlmIChjbG9uZWRPcHRpb25zLmRlZmF1bHRWYWx1ZSAmJiBjbG9uZWRPcHRpb25zLmRlZmF1bHRWYWx1ZS5pbmRleE9mKHRoaXMucHJlZml4KSA+IC0xKVxuICAgICAgICBkZWxldGUgY2xvbmVkT3B0aW9ucy5kZWZhdWx0VmFsdWU7XG4gICAgICByZXR1cm4ga2V5O1xuICAgIH07XG5cbiAgICAvLyByZWd1bGFyIGVzY2FwZSBvbiBkZW1hbmRcbiAgICB3aGlsZSAoKG1hdGNoID0gdGhpcy5uZXN0aW5nUmVnZXhwLmV4ZWMoc3RyKSkpIHtcbiAgICAgIGxldCBmb3JtYXR0ZXJzID0gW107XG5cbiAgICAgIGNsb25lZE9wdGlvbnMgPSB7IC4uLm9wdGlvbnMgfTtcbiAgICAgIGNsb25lZE9wdGlvbnMgPVxuICAgICAgICBjbG9uZWRPcHRpb25zLnJlcGxhY2UgJiYgIWlzU3RyaW5nKGNsb25lZE9wdGlvbnMucmVwbGFjZSlcbiAgICAgICAgICA/IGNsb25lZE9wdGlvbnMucmVwbGFjZVxuICAgICAgICAgIDogY2xvbmVkT3B0aW9ucztcbiAgICAgIGNsb25lZE9wdGlvbnMuYXBwbHlQb3N0UHJvY2Vzc29yID0gZmFsc2U7IC8vIGF2b2lkIHBvc3QgcHJvY2Vzc2luZyBvbiBuZXN0ZWQgbG9va3VwXG4gICAgICBkZWxldGUgY2xvbmVkT3B0aW9ucy5kZWZhdWx0VmFsdWU7IC8vIGFzc2VydCB3ZSBkbyBub3QgZ2V0IGEgZW5kbGVzcyBsb29wIG9uIGludGVycG9sYXRpbmcgZGVmYXVsdFZhbHVlIGFnYWluIGFuZCBhZ2FpblxuXG4gICAgICAvKipcbiAgICAgICAqIElmIHRoZXJlIGlzIG1vcmUgdGhhbiBvbmUgcGFyYW1ldGVyIChjb250YWlucyB0aGUgZm9ybWF0IHNlcGFyYXRvcikuIEUuZy46XG4gICAgICAgKiAgIC0gdChhLCBiKVxuICAgICAgICogICAtIHQoYSwgYiwgYylcbiAgICAgICAqXG4gICAgICAgKiBBbmQgdGhvc2UgcGFyYW1ldGVycyBhcmUgbm90IGR5bmFtaWMgdmFsdWVzIChwYXJhbWV0ZXJzIGRvIG5vdCBpbmNsdWRlIGN1cmx5IGJyYWNlcykuIEUuZy46XG4gICAgICAgKiAgIC0gTm90IHQoYSwgeyBcImtleVwiOiBcInt7dmFyaWFibGV9fVwiIH0pXG4gICAgICAgKiAgIC0gTm90IHQoYSwgYiwge1wia2V5QVwiOiBcInZhbHVlQVwiLCBcImtleUJcIjogXCJ2YWx1ZUJcIn0pXG4gICAgICAgKi9cbiAgICAgIGxldCBkb1JlZHVjZSA9IGZhbHNlO1xuICAgICAgaWYgKG1hdGNoWzBdLmluZGV4T2YodGhpcy5mb3JtYXRTZXBhcmF0b3IpICE9PSAtMSAmJiAhL3suKn0vLnRlc3QobWF0Y2hbMV0pKSB7XG4gICAgICAgIGNvbnN0IHIgPSBtYXRjaFsxXS5zcGxpdCh0aGlzLmZvcm1hdFNlcGFyYXRvcikubWFwKChlbGVtKSA9PiBlbGVtLnRyaW0oKSk7XG4gICAgICAgIG1hdGNoWzFdID0gci5zaGlmdCgpO1xuICAgICAgICBmb3JtYXR0ZXJzID0gcjtcbiAgICAgICAgZG9SZWR1Y2UgPSB0cnVlO1xuICAgICAgfVxuXG4gICAgICB2YWx1ZSA9IGZjKGhhbmRsZUhhc09wdGlvbnMuY2FsbCh0aGlzLCBtYXRjaFsxXS50cmltKCksIGNsb25lZE9wdGlvbnMpLCBjbG9uZWRPcHRpb25zKTtcblxuICAgICAgLy8gaXMgb25seSB0aGUgbmVzdGluZyBrZXkgKGtleTEgPSAnJChrZXkyKScpIHJldHVybiB0aGUgdmFsdWUgd2l0aG91dCBzdHJpbmdpZnlcbiAgICAgIGlmICh2YWx1ZSAmJiBtYXRjaFswXSA9PT0gc3RyICYmICFpc1N0cmluZyh2YWx1ZSkpIHJldHVybiB2YWx1ZTtcblxuICAgICAgLy8gbm8gc3RyaW5nIHRvIGluY2x1ZGUgb3IgZW1wdHlcbiAgICAgIGlmICghaXNTdHJpbmcodmFsdWUpKSB2YWx1ZSA9IG1ha2VTdHJpbmcodmFsdWUpO1xuICAgICAgaWYgKCF2YWx1ZSkge1xuICAgICAgICB0aGlzLmxvZ2dlci53YXJuKGBtaXNzZWQgdG8gcmVzb2x2ZSAke21hdGNoWzFdfSBmb3IgbmVzdGluZyAke3N0cn1gKTtcbiAgICAgICAgdmFsdWUgPSAnJztcbiAgICAgIH1cblxuICAgICAgaWYgKGRvUmVkdWNlKSB7XG4gICAgICAgIHZhbHVlID0gZm9ybWF0dGVycy5yZWR1Y2UoXG4gICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWxvb3AtZnVuY1xuICAgICAgICAgICh2LCBmKSA9PlxuICAgICAgICAgICAgdGhpcy5mb3JtYXQodiwgZiwgb3B0aW9ucy5sbmcsIHsgLi4ub3B0aW9ucywgaW50ZXJwb2xhdGlvbmtleTogbWF0Y2hbMV0udHJpbSgpIH0pLFxuICAgICAgICAgIHZhbHVlLnRyaW0oKSxcbiAgICAgICAgKTtcbiAgICAgIH1cblxuICAgICAgLy8gTmVzdGVkIGtleXMgc2hvdWxkIG5vdCBiZSBlc2NhcGVkIGJ5IGRlZmF1bHQgIzg1NFxuICAgICAgLy8gdmFsdWUgPSB0aGlzLmVzY2FwZVZhbHVlID8gcmVnZXhTYWZlKHV0aWxzLmVzY2FwZSh2YWx1ZSkpIDogcmVnZXhTYWZlKHZhbHVlKTtcbiAgICAgIHN0ciA9IHN0ci5yZXBsYWNlKG1hdGNoWzBdLCB2YWx1ZSk7XG4gICAgICB0aGlzLnJlZ2V4cC5sYXN0SW5kZXggPSAwO1xuICAgIH1cbiAgICByZXR1cm4gc3RyO1xuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IEludGVycG9sYXRvcjtcbiIsImltcG9ydCBiYXNlTG9nZ2VyIGZyb20gJy4vbG9nZ2VyLmpzJztcbmltcG9ydCB7IGdldENsZWFuZWRDb2RlIH0gZnJvbSAnLi91dGlscy5qcyc7XG5cbmNvbnN0IHBhcnNlRm9ybWF0U3RyID0gKGZvcm1hdFN0cikgPT4ge1xuICBsZXQgZm9ybWF0TmFtZSA9IGZvcm1hdFN0ci50b0xvd2VyQ2FzZSgpLnRyaW0oKTtcbiAgY29uc3QgZm9ybWF0T3B0aW9ucyA9IHt9O1xuICBpZiAoZm9ybWF0U3RyLmluZGV4T2YoJygnKSA+IC0xKSB7XG4gICAgY29uc3QgcCA9IGZvcm1hdFN0ci5zcGxpdCgnKCcpO1xuICAgIGZvcm1hdE5hbWUgPSBwWzBdLnRvTG93ZXJDYXNlKCkudHJpbSgpO1xuXG4gICAgY29uc3Qgb3B0U3RyID0gcFsxXS5zdWJzdHJpbmcoMCwgcFsxXS5sZW5ndGggLSAxKTtcblxuICAgIC8vIGV4dHJhIGZvciBjdXJyZW5jeVxuICAgIGlmIChmb3JtYXROYW1lID09PSAnY3VycmVuY3knICYmIG9wdFN0ci5pbmRleE9mKCc6JykgPCAwKSB7XG4gICAgICBpZiAoIWZvcm1hdE9wdGlvbnMuY3VycmVuY3kpIGZvcm1hdE9wdGlvbnMuY3VycmVuY3kgPSBvcHRTdHIudHJpbSgpO1xuICAgIH0gZWxzZSBpZiAoZm9ybWF0TmFtZSA9PT0gJ3JlbGF0aXZldGltZScgJiYgb3B0U3RyLmluZGV4T2YoJzonKSA8IDApIHtcbiAgICAgIGlmICghZm9ybWF0T3B0aW9ucy5yYW5nZSkgZm9ybWF0T3B0aW9ucy5yYW5nZSA9IG9wdFN0ci50cmltKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IG9wdHMgPSBvcHRTdHIuc3BsaXQoJzsnKTtcblxuICAgICAgb3B0cy5mb3JFYWNoKChvcHQpID0+IHtcbiAgICAgICAgaWYgKG9wdCkge1xuICAgICAgICAgIGNvbnN0IFtrZXksIC4uLnJlc3RdID0gb3B0LnNwbGl0KCc6Jyk7XG4gICAgICAgICAgY29uc3QgdmFsID0gcmVzdFxuICAgICAgICAgICAgLmpvaW4oJzonKVxuICAgICAgICAgICAgLnRyaW0oKVxuICAgICAgICAgICAgLnJlcGxhY2UoL14nK3wnKyQvZywgJycpOyAvLyB0cmltIGFuZCByZXBsYWNlICcnXG5cbiAgICAgICAgICBjb25zdCB0cmltbWVkS2V5ID0ga2V5LnRyaW0oKTtcblxuICAgICAgICAgIGlmICghZm9ybWF0T3B0aW9uc1t0cmltbWVkS2V5XSkgZm9ybWF0T3B0aW9uc1t0cmltbWVkS2V5XSA9IHZhbDtcbiAgICAgICAgICBpZiAodmFsID09PSAnZmFsc2UnKSBmb3JtYXRPcHRpb25zW3RyaW1tZWRLZXldID0gZmFsc2U7XG4gICAgICAgICAgaWYgKHZhbCA9PT0gJ3RydWUnKSBmb3JtYXRPcHRpb25zW3RyaW1tZWRLZXldID0gdHJ1ZTtcbiAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tcmVzdHJpY3RlZC1nbG9iYWxzXG4gICAgICAgICAgaWYgKCFpc05hTih2YWwpKSBmb3JtYXRPcHRpb25zW3RyaW1tZWRLZXldID0gcGFyc2VJbnQodmFsLCAxMCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB7XG4gICAgZm9ybWF0TmFtZSxcbiAgICBmb3JtYXRPcHRpb25zLFxuICB9O1xufTtcblxuY29uc3QgY3JlYXRlQ2FjaGVkRm9ybWF0dGVyID0gKGZuKSA9PiB7XG4gIGNvbnN0IGNhY2hlID0ge307XG4gIHJldHVybiAodiwgbCwgbykgPT4ge1xuICAgIGxldCBvcHRGb3JDYWNoZSA9IG87XG4gICAgLy8gdGhpcyBjYWNoZSBvcHRpbWl6YXRpb24gd2lsbCBvbmx5IHdvcmsgZm9yIGtleXMgaGF2aW5nIDEgaW50ZXJwb2xhdGVkIHZhbHVlXG4gICAgaWYgKFxuICAgICAgbyAmJlxuICAgICAgby5pbnRlcnBvbGF0aW9ua2V5ICYmXG4gICAgICBvLmZvcm1hdFBhcmFtcyAmJlxuICAgICAgby5mb3JtYXRQYXJhbXNbby5pbnRlcnBvbGF0aW9ua2V5XSAmJlxuICAgICAgb1tvLmludGVycG9sYXRpb25rZXldXG4gICAgKSB7XG4gICAgICBvcHRGb3JDYWNoZSA9IHtcbiAgICAgICAgLi4ub3B0Rm9yQ2FjaGUsXG4gICAgICAgIFtvLmludGVycG9sYXRpb25rZXldOiB1bmRlZmluZWQsXG4gICAgICB9O1xuICAgIH1cbiAgICBjb25zdCBrZXkgPSBsICsgSlNPTi5zdHJpbmdpZnkob3B0Rm9yQ2FjaGUpO1xuICAgIGxldCBmcm0gPSBjYWNoZVtrZXldO1xuICAgIGlmICghZnJtKSB7XG4gICAgICBmcm0gPSBmbihnZXRDbGVhbmVkQ29kZShsKSwgbyk7XG4gICAgICBjYWNoZVtrZXldID0gZnJtO1xuICAgIH1cbiAgICByZXR1cm4gZnJtKHYpO1xuICB9O1xufTtcblxuY29uc3QgY3JlYXRlTm9uQ2FjaGVkRm9ybWF0dGVyID0gKGZuKSA9PiAodiwgbCwgbykgPT4gZm4oZ2V0Q2xlYW5lZENvZGUobCksIG8pKHYpO1xuXG5jbGFzcyBGb3JtYXR0ZXIge1xuICBjb25zdHJ1Y3RvcihvcHRpb25zID0ge30pIHtcbiAgICB0aGlzLmxvZ2dlciA9IGJhc2VMb2dnZXIuY3JlYXRlKCdmb3JtYXR0ZXInKTtcbiAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuICAgIHRoaXMuaW5pdChvcHRpb25zKTtcbiAgfVxuXG4gIC8qIGVzbGludCBuby1wYXJhbS1yZWFzc2lnbjogMCAqL1xuICBpbml0KHNlcnZpY2VzLCBvcHRpb25zID0geyBpbnRlcnBvbGF0aW9uOiB7fSB9KSB7XG4gICAgdGhpcy5mb3JtYXRTZXBhcmF0b3IgPSBvcHRpb25zLmludGVycG9sYXRpb24uZm9ybWF0U2VwYXJhdG9yIHx8ICcsJztcbiAgICBjb25zdCBjZiA9IG9wdGlvbnMuY2FjaGVJbkJ1aWx0Rm9ybWF0cyA/IGNyZWF0ZUNhY2hlZEZvcm1hdHRlciA6IGNyZWF0ZU5vbkNhY2hlZEZvcm1hdHRlcjtcbiAgICB0aGlzLmZvcm1hdHMgPSB7XG4gICAgICBudW1iZXI6IGNmKChsbmcsIG9wdCkgPT4ge1xuICAgICAgICBjb25zdCBmb3JtYXR0ZXIgPSBuZXcgSW50bC5OdW1iZXJGb3JtYXQobG5nLCB7IC4uLm9wdCB9KTtcbiAgICAgICAgcmV0dXJuICh2YWwpID0+IGZvcm1hdHRlci5mb3JtYXQodmFsKTtcbiAgICAgIH0pLFxuICAgICAgY3VycmVuY3k6IGNmKChsbmcsIG9wdCkgPT4ge1xuICAgICAgICBjb25zdCBmb3JtYXR0ZXIgPSBuZXcgSW50bC5OdW1iZXJGb3JtYXQobG5nLCB7IC4uLm9wdCwgc3R5bGU6ICdjdXJyZW5jeScgfSk7XG4gICAgICAgIHJldHVybiAodmFsKSA9PiBmb3JtYXR0ZXIuZm9ybWF0KHZhbCk7XG4gICAgICB9KSxcbiAgICAgIGRhdGV0aW1lOiBjZigobG5nLCBvcHQpID0+IHtcbiAgICAgICAgY29uc3QgZm9ybWF0dGVyID0gbmV3IEludGwuRGF0ZVRpbWVGb3JtYXQobG5nLCB7IC4uLm9wdCB9KTtcbiAgICAgICAgcmV0dXJuICh2YWwpID0+IGZvcm1hdHRlci5mb3JtYXQodmFsKTtcbiAgICAgIH0pLFxuICAgICAgcmVsYXRpdmV0aW1lOiBjZigobG5nLCBvcHQpID0+IHtcbiAgICAgICAgY29uc3QgZm9ybWF0dGVyID0gbmV3IEludGwuUmVsYXRpdmVUaW1lRm9ybWF0KGxuZywgeyAuLi5vcHQgfSk7XG4gICAgICAgIHJldHVybiAodmFsKSA9PiBmb3JtYXR0ZXIuZm9ybWF0KHZhbCwgb3B0LnJhbmdlIHx8ICdkYXknKTtcbiAgICAgIH0pLFxuICAgICAgbGlzdDogY2YoKGxuZywgb3B0KSA9PiB7XG4gICAgICAgIGNvbnN0IGZvcm1hdHRlciA9IG5ldyBJbnRsLkxpc3RGb3JtYXQobG5nLCB7IC4uLm9wdCB9KTtcbiAgICAgICAgcmV0dXJuICh2YWwpID0+IGZvcm1hdHRlci5mb3JtYXQodmFsKTtcbiAgICAgIH0pLFxuICAgIH07XG4gIH1cblxuICBhZGQobmFtZSwgZmMpIHtcbiAgICB0aGlzLmZvcm1hdHNbbmFtZS50b0xvd2VyQ2FzZSgpLnRyaW0oKV0gPSBmYztcbiAgfVxuXG4gIGFkZENhY2hlZChuYW1lLCBmYykge1xuICAgIHRoaXMuZm9ybWF0c1tuYW1lLnRvTG93ZXJDYXNlKCkudHJpbSgpXSA9IGNyZWF0ZUNhY2hlZEZvcm1hdHRlcihmYyk7XG4gIH1cblxuICBmb3JtYXQodmFsdWUsIGZvcm1hdCwgbG5nLCBvcHRpb25zID0ge30pIHtcbiAgICBjb25zdCBmb3JtYXRzID0gZm9ybWF0LnNwbGl0KHRoaXMuZm9ybWF0U2VwYXJhdG9yKTtcbiAgICBpZiAoXG4gICAgICBmb3JtYXRzLmxlbmd0aCA+IDEgJiZcbiAgICAgIGZvcm1hdHNbMF0uaW5kZXhPZignKCcpID4gMSAmJlxuICAgICAgZm9ybWF0c1swXS5pbmRleE9mKCcpJykgPCAwICYmXG4gICAgICBmb3JtYXRzLmZpbmQoKGYpID0+IGYuaW5kZXhPZignKScpID4gLTEpXG4gICAgKSB7XG4gICAgICBjb25zdCBsYXN0SW5kZXggPSBmb3JtYXRzLmZpbmRJbmRleCgoZikgPT4gZi5pbmRleE9mKCcpJykgPiAtMSk7XG4gICAgICBmb3JtYXRzWzBdID0gW2Zvcm1hdHNbMF0sIC4uLmZvcm1hdHMuc3BsaWNlKDEsIGxhc3RJbmRleCldLmpvaW4odGhpcy5mb3JtYXRTZXBhcmF0b3IpO1xuICAgIH1cblxuICAgIGNvbnN0IHJlc3VsdCA9IGZvcm1hdHMucmVkdWNlKChtZW0sIGYpID0+IHtcbiAgICAgIGNvbnN0IHsgZm9ybWF0TmFtZSwgZm9ybWF0T3B0aW9ucyB9ID0gcGFyc2VGb3JtYXRTdHIoZik7XG5cbiAgICAgIGlmICh0aGlzLmZvcm1hdHNbZm9ybWF0TmFtZV0pIHtcbiAgICAgICAgbGV0IGZvcm1hdHRlZCA9IG1lbTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAvLyBvcHRpb25zIHBhc3NlZCBleHBsaWNpdCBmb3IgdGhhdCBmb3JtYXR0ZWQgdmFsdWVcbiAgICAgICAgICBjb25zdCB2YWxPcHRpb25zID0gb3B0aW9ucz8uZm9ybWF0UGFyYW1zPy5bb3B0aW9ucy5pbnRlcnBvbGF0aW9ua2V5XSB8fCB7fTtcblxuICAgICAgICAgIC8vIGxhbmd1YWdlXG4gICAgICAgICAgY29uc3QgbCA9IHZhbE9wdGlvbnMubG9jYWxlIHx8IHZhbE9wdGlvbnMubG5nIHx8IG9wdGlvbnMubG9jYWxlIHx8IG9wdGlvbnMubG5nIHx8IGxuZztcblxuICAgICAgICAgIGZvcm1hdHRlZCA9IHRoaXMuZm9ybWF0c1tmb3JtYXROYW1lXShtZW0sIGwsIHtcbiAgICAgICAgICAgIC4uLmZvcm1hdE9wdGlvbnMsXG4gICAgICAgICAgICAuLi5vcHRpb25zLFxuICAgICAgICAgICAgLi4udmFsT3B0aW9ucyxcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICB0aGlzLmxvZ2dlci53YXJuKGVycm9yKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZm9ybWF0dGVkO1xuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tZWxzZS1yZXR1cm5cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMubG9nZ2VyLndhcm4oYHRoZXJlIHdhcyBubyBmb3JtYXQgZnVuY3Rpb24gZm9yICR7Zm9ybWF0TmFtZX1gKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBtZW07XG4gICAgfSwgdmFsdWUpO1xuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBGb3JtYXR0ZXI7XG4iLCJpbXBvcnQgeyBwdXNoUGF0aCwgaXNTdHJpbmcgfSBmcm9tICcuL3V0aWxzLmpzJztcbmltcG9ydCBiYXNlTG9nZ2VyIGZyb20gJy4vbG9nZ2VyLmpzJztcbmltcG9ydCBFdmVudEVtaXR0ZXIgZnJvbSAnLi9FdmVudEVtaXR0ZXIuanMnO1xuXG5jb25zdCByZW1vdmVQZW5kaW5nID0gKHEsIG5hbWUpID0+IHtcbiAgaWYgKHEucGVuZGluZ1tuYW1lXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgZGVsZXRlIHEucGVuZGluZ1tuYW1lXTtcbiAgICBxLnBlbmRpbmdDb3VudC0tO1xuICB9XG59O1xuXG5jbGFzcyBDb25uZWN0b3IgZXh0ZW5kcyBFdmVudEVtaXR0ZXIge1xuICBjb25zdHJ1Y3RvcihiYWNrZW5kLCBzdG9yZSwgc2VydmljZXMsIG9wdGlvbnMgPSB7fSkge1xuICAgIHN1cGVyKCk7XG5cbiAgICB0aGlzLmJhY2tlbmQgPSBiYWNrZW5kO1xuICAgIHRoaXMuc3RvcmUgPSBzdG9yZTtcbiAgICB0aGlzLnNlcnZpY2VzID0gc2VydmljZXM7XG4gICAgdGhpcy5sYW5ndWFnZVV0aWxzID0gc2VydmljZXMubGFuZ3VhZ2VVdGlscztcbiAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuICAgIHRoaXMubG9nZ2VyID0gYmFzZUxvZ2dlci5jcmVhdGUoJ2JhY2tlbmRDb25uZWN0b3InKTtcblxuICAgIHRoaXMud2FpdGluZ1JlYWRzID0gW107XG4gICAgdGhpcy5tYXhQYXJhbGxlbFJlYWRzID0gb3B0aW9ucy5tYXhQYXJhbGxlbFJlYWRzIHx8IDEwO1xuICAgIHRoaXMucmVhZGluZ0NhbGxzID0gMDtcblxuICAgIHRoaXMubWF4UmV0cmllcyA9IG9wdGlvbnMubWF4UmV0cmllcyA+PSAwID8gb3B0aW9ucy5tYXhSZXRyaWVzIDogNTtcbiAgICB0aGlzLnJldHJ5VGltZW91dCA9IG9wdGlvbnMucmV0cnlUaW1lb3V0ID49IDEgPyBvcHRpb25zLnJldHJ5VGltZW91dCA6IDM1MDtcblxuICAgIHRoaXMuc3RhdGUgPSB7fTtcbiAgICB0aGlzLnF1ZXVlID0gW107XG5cbiAgICB0aGlzLmJhY2tlbmQ/LmluaXQ/LihzZXJ2aWNlcywgb3B0aW9ucy5iYWNrZW5kLCBvcHRpb25zKTtcbiAgfVxuXG4gIHF1ZXVlTG9hZChsYW5ndWFnZXMsIG5hbWVzcGFjZXMsIG9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gICAgLy8gZmluZCB3aGF0IG5lZWRzIHRvIGJlIGxvYWRlZFxuICAgIGNvbnN0IHRvTG9hZCA9IHt9O1xuICAgIGNvbnN0IHBlbmRpbmcgPSB7fTtcbiAgICBjb25zdCB0b0xvYWRMYW5ndWFnZXMgPSB7fTtcbiAgICBjb25zdCB0b0xvYWROYW1lc3BhY2VzID0ge307XG5cbiAgICBsYW5ndWFnZXMuZm9yRWFjaCgobG5nKSA9PiB7XG4gICAgICBsZXQgaGFzQWxsTmFtZXNwYWNlcyA9IHRydWU7XG5cbiAgICAgIG5hbWVzcGFjZXMuZm9yRWFjaCgobnMpID0+IHtcbiAgICAgICAgY29uc3QgbmFtZSA9IGAke2xuZ318JHtuc31gO1xuXG4gICAgICAgIGlmICghb3B0aW9ucy5yZWxvYWQgJiYgdGhpcy5zdG9yZS5oYXNSZXNvdXJjZUJ1bmRsZShsbmcsIG5zKSkge1xuICAgICAgICAgIHRoaXMuc3RhdGVbbmFtZV0gPSAyOyAvLyBsb2FkZWRcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLnN0YXRlW25hbWVdIDwgMCkge1xuICAgICAgICAgIC8vIG5vdGhpbmcgdG8gZG8gZm9yIGVyclxuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuc3RhdGVbbmFtZV0gPT09IDEpIHtcbiAgICAgICAgICBpZiAocGVuZGluZ1tuYW1lXSA9PT0gdW5kZWZpbmVkKSBwZW5kaW5nW25hbWVdID0gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLnN0YXRlW25hbWVdID0gMTsgLy8gcGVuZGluZ1xuXG4gICAgICAgICAgaGFzQWxsTmFtZXNwYWNlcyA9IGZhbHNlO1xuXG4gICAgICAgICAgaWYgKHBlbmRpbmdbbmFtZV0gPT09IHVuZGVmaW5lZCkgcGVuZGluZ1tuYW1lXSA9IHRydWU7XG4gICAgICAgICAgaWYgKHRvTG9hZFtuYW1lXSA9PT0gdW5kZWZpbmVkKSB0b0xvYWRbbmFtZV0gPSB0cnVlO1xuICAgICAgICAgIGlmICh0b0xvYWROYW1lc3BhY2VzW25zXSA9PT0gdW5kZWZpbmVkKSB0b0xvYWROYW1lc3BhY2VzW25zXSA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICBpZiAoIWhhc0FsbE5hbWVzcGFjZXMpIHRvTG9hZExhbmd1YWdlc1tsbmddID0gdHJ1ZTtcbiAgICB9KTtcblxuICAgIGlmIChPYmplY3Qua2V5cyh0b0xvYWQpLmxlbmd0aCB8fCBPYmplY3Qua2V5cyhwZW5kaW5nKS5sZW5ndGgpIHtcbiAgICAgIHRoaXMucXVldWUucHVzaCh7XG4gICAgICAgIHBlbmRpbmcsXG4gICAgICAgIHBlbmRpbmdDb3VudDogT2JqZWN0LmtleXMocGVuZGluZykubGVuZ3RoLFxuICAgICAgICBsb2FkZWQ6IHt9LFxuICAgICAgICBlcnJvcnM6IFtdLFxuICAgICAgICBjYWxsYmFjayxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICB0b0xvYWQ6IE9iamVjdC5rZXlzKHRvTG9hZCksXG4gICAgICBwZW5kaW5nOiBPYmplY3Qua2V5cyhwZW5kaW5nKSxcbiAgICAgIHRvTG9hZExhbmd1YWdlczogT2JqZWN0LmtleXModG9Mb2FkTGFuZ3VhZ2VzKSxcbiAgICAgIHRvTG9hZE5hbWVzcGFjZXM6IE9iamVjdC5rZXlzKHRvTG9hZE5hbWVzcGFjZXMpLFxuICAgIH07XG4gIH1cblxuICBsb2FkZWQobmFtZSwgZXJyLCBkYXRhKSB7XG4gICAgY29uc3QgcyA9IG5hbWUuc3BsaXQoJ3wnKTtcbiAgICBjb25zdCBsbmcgPSBzWzBdO1xuICAgIGNvbnN0IG5zID0gc1sxXTtcblxuICAgIGlmIChlcnIpIHRoaXMuZW1pdCgnZmFpbGVkTG9hZGluZycsIGxuZywgbnMsIGVycik7XG5cbiAgICBpZiAoIWVyciAmJiBkYXRhKSB7XG4gICAgICB0aGlzLnN0b3JlLmFkZFJlc291cmNlQnVuZGxlKGxuZywgbnMsIGRhdGEsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCB7IHNraXBDb3B5OiB0cnVlIH0pO1xuICAgIH1cblxuICAgIC8vIHNldCBsb2FkZWRcbiAgICB0aGlzLnN0YXRlW25hbWVdID0gZXJyID8gLTEgOiAyO1xuICAgIGlmIChlcnIgJiYgZGF0YSkgdGhpcy5zdGF0ZVtuYW1lXSA9IDA7XG5cbiAgICAvLyBjb25zb2xpZGF0ZWQgbG9hZGluZyBkb25lIGluIHRoaXMgcnVuIC0gb25seSBlbWl0IG9uY2UgZm9yIGEgbG9hZGVkIG5hbWVzcGFjZVxuICAgIGNvbnN0IGxvYWRlZCA9IHt9O1xuXG4gICAgLy8gY2FsbGJhY2sgaWYgcmVhZHlcbiAgICB0aGlzLnF1ZXVlLmZvckVhY2goKHEpID0+IHtcbiAgICAgIHB1c2hQYXRoKHEubG9hZGVkLCBbbG5nXSwgbnMpO1xuICAgICAgcmVtb3ZlUGVuZGluZyhxLCBuYW1lKTtcblxuICAgICAgaWYgKGVycikgcS5lcnJvcnMucHVzaChlcnIpO1xuXG4gICAgICBpZiAocS5wZW5kaW5nQ291bnQgPT09IDAgJiYgIXEuZG9uZSkge1xuICAgICAgICAvLyBvbmx5IGRvIG9uY2UgcGVyIGxvYWRlZCAtPiB0aGlzLmVtaXQoJ2xvYWRlZCcsIHEubG9hZGVkKTtcbiAgICAgICAgT2JqZWN0LmtleXMocS5sb2FkZWQpLmZvckVhY2goKGwpID0+IHtcbiAgICAgICAgICBpZiAoIWxvYWRlZFtsXSkgbG9hZGVkW2xdID0ge307XG4gICAgICAgICAgY29uc3QgbG9hZGVkS2V5cyA9IHEubG9hZGVkW2xdO1xuICAgICAgICAgIGlmIChsb2FkZWRLZXlzLmxlbmd0aCkge1xuICAgICAgICAgICAgbG9hZGVkS2V5cy5mb3JFYWNoKChuKSA9PiB7XG4gICAgICAgICAgICAgIGlmIChsb2FkZWRbbF1bbl0gPT09IHVuZGVmaW5lZCkgbG9hZGVkW2xdW25dID0gdHJ1ZTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLyogZXNsaW50IG5vLXBhcmFtLXJlYXNzaWduOiAwICovXG4gICAgICAgIHEuZG9uZSA9IHRydWU7XG4gICAgICAgIGlmIChxLmVycm9ycy5sZW5ndGgpIHtcbiAgICAgICAgICBxLmNhbGxiYWNrKHEuZXJyb3JzKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBxLmNhbGxiYWNrKCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIGVtaXQgY29uc29saWRhdGVkIGxvYWRlZCBldmVudFxuICAgIHRoaXMuZW1pdCgnbG9hZGVkJywgbG9hZGVkKTtcblxuICAgIC8vIHJlbW92ZSBkb25lIGxvYWQgcmVxdWVzdHNcbiAgICB0aGlzLnF1ZXVlID0gdGhpcy5xdWV1ZS5maWx0ZXIoKHEpID0+ICFxLmRvbmUpO1xuICB9XG5cbiAgcmVhZChsbmcsIG5zLCBmY05hbWUsIHRyaWVkID0gMCwgd2FpdCA9IHRoaXMucmV0cnlUaW1lb3V0LCBjYWxsYmFjaykge1xuICAgIGlmICghbG5nLmxlbmd0aCkgcmV0dXJuIGNhbGxiYWNrKG51bGwsIHt9KTsgLy8gbm90aW5nIHRvIGxvYWRcblxuICAgIC8vIExpbWl0IHBhcmFsbGVsaXNtIG9mIGNhbGxzIHRvIGJhY2tlbmRcbiAgICAvLyBUaGlzIGlzIG5lZWRlZCB0byBwcmV2ZW50IHRyeWluZyB0byBvcGVuIHRob3VzYW5kcyBvZlxuICAgIC8vIHNvY2tldHMgb3IgZmlsZSBkZXNjcmlwdG9ycywgd2hpY2ggY2FuIGNhdXNlIGZhaWx1cmVzXG4gICAgLy8gYW5kIGFjdHVhbGx5IG1ha2UgdGhlIGVudGlyZSBwcm9jZXNzIHRha2UgbG9uZ2VyLlxuICAgIGlmICh0aGlzLnJlYWRpbmdDYWxscyA+PSB0aGlzLm1heFBhcmFsbGVsUmVhZHMpIHtcbiAgICAgIHRoaXMud2FpdGluZ1JlYWRzLnB1c2goeyBsbmcsIG5zLCBmY05hbWUsIHRyaWVkLCB3YWl0LCBjYWxsYmFjayB9KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5yZWFkaW5nQ2FsbHMrKztcblxuICAgIGNvbnN0IHJlc29sdmVyID0gKGVyciwgZGF0YSkgPT4ge1xuICAgICAgdGhpcy5yZWFkaW5nQ2FsbHMtLTtcbiAgICAgIGlmICh0aGlzLndhaXRpbmdSZWFkcy5sZW5ndGggPiAwKSB7XG4gICAgICAgIGNvbnN0IG5leHQgPSB0aGlzLndhaXRpbmdSZWFkcy5zaGlmdCgpO1xuICAgICAgICB0aGlzLnJlYWQobmV4dC5sbmcsIG5leHQubnMsIG5leHQuZmNOYW1lLCBuZXh0LnRyaWVkLCBuZXh0LndhaXQsIG5leHQuY2FsbGJhY2spO1xuICAgICAgfVxuICAgICAgaWYgKGVyciAmJiBkYXRhIC8qID0gcmV0cnlGbGFnICovICYmIHRyaWVkIDwgdGhpcy5tYXhSZXRyaWVzKSB7XG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgIHRoaXMucmVhZC5jYWxsKHRoaXMsIGxuZywgbnMsIGZjTmFtZSwgdHJpZWQgKyAxLCB3YWl0ICogMiwgY2FsbGJhY2spO1xuICAgICAgICB9LCB3YWl0KTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgY2FsbGJhY2soZXJyLCBkYXRhKTtcbiAgICB9O1xuXG4gICAgY29uc3QgZmMgPSB0aGlzLmJhY2tlbmRbZmNOYW1lXS5iaW5kKHRoaXMuYmFja2VuZCk7XG4gICAgaWYgKGZjLmxlbmd0aCA9PT0gMikge1xuICAgICAgLy8gbm8gY2FsbGJhY2tcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IHIgPSBmYyhsbmcsIG5zKTtcbiAgICAgICAgaWYgKHIgJiYgdHlwZW9mIHIudGhlbiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgIC8vIHByb21pc2VcbiAgICAgICAgICByLnRoZW4oKGRhdGEpID0+IHJlc29sdmVyKG51bGwsIGRhdGEpKS5jYXRjaChyZXNvbHZlcik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gc3luY1xuICAgICAgICAgIHJlc29sdmVyKG51bGwsIHIpO1xuICAgICAgICB9XG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgcmVzb2x2ZXIoZXJyKTtcbiAgICAgIH1cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBub3JtYWwgd2l0aCBjYWxsYmFja1xuICAgIHJldHVybiBmYyhsbmcsIG5zLCByZXNvbHZlcik7XG4gIH1cblxuICAvKiBlc2xpbnQgY29uc2lzdGVudC1yZXR1cm46IDAgKi9cbiAgcHJlcGFyZUxvYWRpbmcobGFuZ3VhZ2VzLCBuYW1lc3BhY2VzLCBvcHRpb25zID0ge30sIGNhbGxiYWNrKSB7XG4gICAgaWYgKCF0aGlzLmJhY2tlbmQpIHtcbiAgICAgIHRoaXMubG9nZ2VyLndhcm4oJ05vIGJhY2tlbmQgd2FzIGFkZGVkIHZpYSBpMThuZXh0LnVzZS4gV2lsbCBub3QgbG9hZCByZXNvdXJjZXMuJyk7XG4gICAgICByZXR1cm4gY2FsbGJhY2sgJiYgY2FsbGJhY2soKTtcbiAgICB9XG5cbiAgICBpZiAoaXNTdHJpbmcobGFuZ3VhZ2VzKSkgbGFuZ3VhZ2VzID0gdGhpcy5sYW5ndWFnZVV0aWxzLnRvUmVzb2x2ZUhpZXJhcmNoeShsYW5ndWFnZXMpO1xuICAgIGlmIChpc1N0cmluZyhuYW1lc3BhY2VzKSkgbmFtZXNwYWNlcyA9IFtuYW1lc3BhY2VzXTtcblxuICAgIGNvbnN0IHRvTG9hZCA9IHRoaXMucXVldWVMb2FkKGxhbmd1YWdlcywgbmFtZXNwYWNlcywgb3B0aW9ucywgY2FsbGJhY2spO1xuICAgIGlmICghdG9Mb2FkLnRvTG9hZC5sZW5ndGgpIHtcbiAgICAgIGlmICghdG9Mb2FkLnBlbmRpbmcubGVuZ3RoKSBjYWxsYmFjaygpOyAvLyBub3RoaW5nIHRvIGxvYWQgYW5kIG5vIHBlbmRpbmdzLi4uY2FsbGJhY2sgbm93XG4gICAgICByZXR1cm4gbnVsbDsgLy8gcGVuZGluZ3Mgd2lsbCB0cmlnZ2VyIGNhbGxiYWNrXG4gICAgfVxuXG4gICAgdG9Mb2FkLnRvTG9hZC5mb3JFYWNoKChuYW1lKSA9PiB7XG4gICAgICB0aGlzLmxvYWRPbmUobmFtZSk7XG4gICAgfSk7XG4gIH1cblxuICBsb2FkKGxhbmd1YWdlcywgbmFtZXNwYWNlcywgY2FsbGJhY2spIHtcbiAgICB0aGlzLnByZXBhcmVMb2FkaW5nKGxhbmd1YWdlcywgbmFtZXNwYWNlcywge30sIGNhbGxiYWNrKTtcbiAgfVxuXG4gIHJlbG9hZChsYW5ndWFnZXMsIG5hbWVzcGFjZXMsIGNhbGxiYWNrKSB7XG4gICAgdGhpcy5wcmVwYXJlTG9hZGluZyhsYW5ndWFnZXMsIG5hbWVzcGFjZXMsIHsgcmVsb2FkOiB0cnVlIH0sIGNhbGxiYWNrKTtcbiAgfVxuXG4gIGxvYWRPbmUobmFtZSwgcHJlZml4ID0gJycpIHtcbiAgICBjb25zdCBzID0gbmFtZS5zcGxpdCgnfCcpO1xuICAgIGNvbnN0IGxuZyA9IHNbMF07XG4gICAgY29uc3QgbnMgPSBzWzFdO1xuXG4gICAgdGhpcy5yZWFkKGxuZywgbnMsICdyZWFkJywgdW5kZWZpbmVkLCB1bmRlZmluZWQsIChlcnIsIGRhdGEpID0+IHtcbiAgICAgIGlmIChlcnIpIHRoaXMubG9nZ2VyLndhcm4oYCR7cHJlZml4fWxvYWRpbmcgbmFtZXNwYWNlICR7bnN9IGZvciBsYW5ndWFnZSAke2xuZ30gZmFpbGVkYCwgZXJyKTtcbiAgICAgIGlmICghZXJyICYmIGRhdGEpXG4gICAgICAgIHRoaXMubG9nZ2VyLmxvZyhgJHtwcmVmaXh9bG9hZGVkIG5hbWVzcGFjZSAke25zfSBmb3IgbGFuZ3VhZ2UgJHtsbmd9YCwgZGF0YSk7XG5cbiAgICAgIHRoaXMubG9hZGVkKG5hbWUsIGVyciwgZGF0YSk7XG4gICAgfSk7XG4gIH1cblxuICBzYXZlTWlzc2luZyhsYW5ndWFnZXMsIG5hbWVzcGFjZSwga2V5LCBmYWxsYmFja1ZhbHVlLCBpc1VwZGF0ZSwgb3B0aW9ucyA9IHt9LCBjbGIgPSAoKSA9PiB7fSkge1xuICAgIGlmIChcbiAgICAgIHRoaXMuc2VydmljZXM/LnV0aWxzPy5oYXNMb2FkZWROYW1lc3BhY2UgJiZcbiAgICAgICF0aGlzLnNlcnZpY2VzPy51dGlscz8uaGFzTG9hZGVkTmFtZXNwYWNlKG5hbWVzcGFjZSlcbiAgICApIHtcbiAgICAgIHRoaXMubG9nZ2VyLndhcm4oXG4gICAgICAgIGBkaWQgbm90IHNhdmUga2V5IFwiJHtrZXl9XCIgYXMgdGhlIG5hbWVzcGFjZSBcIiR7bmFtZXNwYWNlfVwiIHdhcyBub3QgeWV0IGxvYWRlZGAsXG4gICAgICAgICdUaGlzIG1lYW5zIHNvbWV0aGluZyBJUyBXUk9ORyBpbiB5b3VyIHNldHVwLiBZb3UgYWNjZXNzIHRoZSB0IGZ1bmN0aW9uIGJlZm9yZSBpMThuZXh0LmluaXQgLyBpMThuZXh0LmxvYWROYW1lc3BhY2UgLyBpMThuZXh0LmNoYW5nZUxhbmd1YWdlIHdhcyBkb25lLiBXYWl0IGZvciB0aGUgY2FsbGJhY2sgb3IgUHJvbWlzZSB0byByZXNvbHZlIGJlZm9yZSBhY2Nlc3NpbmcgaXQhISEnLFxuICAgICAgKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBpZ25vcmUgbm9uIHZhbGlkIGtleXNcbiAgICBpZiAoa2V5ID09PSB1bmRlZmluZWQgfHwga2V5ID09PSBudWxsIHx8IGtleSA9PT0gJycpIHJldHVybjtcblxuICAgIGlmICh0aGlzLmJhY2tlbmQ/LmNyZWF0ZSkge1xuICAgICAgY29uc3Qgb3B0cyA9IHtcbiAgICAgICAgLi4ub3B0aW9ucyxcbiAgICAgICAgaXNVcGRhdGUsXG4gICAgICB9O1xuICAgICAgY29uc3QgZmMgPSB0aGlzLmJhY2tlbmQuY3JlYXRlLmJpbmQodGhpcy5iYWNrZW5kKTtcbiAgICAgIGlmIChmYy5sZW5ndGggPCA2KSB7XG4gICAgICAgIC8vIG5vIGNhbGxiYWNrXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgbGV0IHI7XG4gICAgICAgICAgaWYgKGZjLmxlbmd0aCA9PT0gNSkge1xuICAgICAgICAgICAgLy8gZnV0dXJlIGNhbGxiYWNrLWxlc3MgYXBpIGZvciBpMThuZXh0LWxvY2l6ZS1iYWNrZW5kXG4gICAgICAgICAgICByID0gZmMobGFuZ3VhZ2VzLCBuYW1lc3BhY2UsIGtleSwgZmFsbGJhY2tWYWx1ZSwgb3B0cyk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHIgPSBmYyhsYW5ndWFnZXMsIG5hbWVzcGFjZSwga2V5LCBmYWxsYmFja1ZhbHVlKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHIgJiYgdHlwZW9mIHIudGhlbiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgLy8gcHJvbWlzZVxuICAgICAgICAgICAgci50aGVuKChkYXRhKSA9PiBjbGIobnVsbCwgZGF0YSkpLmNhdGNoKGNsYik7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIHN5bmNcbiAgICAgICAgICAgIGNsYihudWxsLCByKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgIGNsYihlcnIpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBub3JtYWwgd2l0aCBjYWxsYmFja1xuICAgICAgICBmYyhsYW5ndWFnZXMsIG5hbWVzcGFjZSwga2V5LCBmYWxsYmFja1ZhbHVlLCBjbGIgLyogdW51c2VkIGNhbGxiYWNrICovLCBvcHRzKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyB3cml0ZSB0byBzdG9yZSB0byBhdm9pZCByZXNlbmRpbmdcbiAgICBpZiAoIWxhbmd1YWdlcyB8fCAhbGFuZ3VhZ2VzWzBdKSByZXR1cm47XG4gICAgdGhpcy5zdG9yZS5hZGRSZXNvdXJjZShsYW5ndWFnZXNbMF0sIG5hbWVzcGFjZSwga2V5LCBmYWxsYmFja1ZhbHVlKTtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBDb25uZWN0b3I7XG4iLCJpbXBvcnQgeyBpc1N0cmluZyB9IGZyb20gJy4vdXRpbHMuanMnO1xuXG5leHBvcnQgY29uc3QgZ2V0ID0gKCkgPT4gKHtcbiAgZGVidWc6IGZhbHNlLFxuICBpbml0QXN5bmM6IHRydWUsXG5cbiAgbnM6IFsndHJhbnNsYXRpb24nXSxcbiAgZGVmYXVsdE5TOiBbJ3RyYW5zbGF0aW9uJ10sXG4gIGZhbGxiYWNrTG5nOiBbJ2RldiddLFxuICBmYWxsYmFja05TOiBmYWxzZSwgLy8gc3RyaW5nIG9yIGFycmF5IG9mIG5hbWVzcGFjZXNcblxuICBzdXBwb3J0ZWRMbmdzOiBmYWxzZSwgLy8gYXJyYXkgd2l0aCBzdXBwb3J0ZWQgbGFuZ3VhZ2VzXG4gIG5vbkV4cGxpY2l0U3VwcG9ydGVkTG5nczogZmFsc2UsXG4gIGxvYWQ6ICdhbGwnLCAvLyB8IGN1cnJlbnRPbmx5IHwgbGFuZ3VhZ2VPbmx5XG4gIHByZWxvYWQ6IGZhbHNlLCAvLyBhcnJheSB3aXRoIHByZWxvYWQgbGFuZ3VhZ2VzXG5cbiAgc2ltcGxpZnlQbHVyYWxTdWZmaXg6IHRydWUsXG4gIGtleVNlcGFyYXRvcjogJy4nLFxuICBuc1NlcGFyYXRvcjogJzonLFxuICBwbHVyYWxTZXBhcmF0b3I6ICdfJyxcbiAgY29udGV4dFNlcGFyYXRvcjogJ18nLFxuXG4gIHBhcnRpYWxCdW5kbGVkTGFuZ3VhZ2VzOiBmYWxzZSwgLy8gYWxsb3cgYnVuZGxpbmcgY2VydGFpbiBsYW5ndWFnZXMgdGhhdCBhcmUgbm90IHJlbW90ZWx5IGZldGNoZWRcbiAgc2F2ZU1pc3Npbmc6IGZhbHNlLCAvLyBlbmFibGUgdG8gc2VuZCBtaXNzaW5nIHZhbHVlc1xuICB1cGRhdGVNaXNzaW5nOiBmYWxzZSwgLy8gZW5hYmxlIHRvIHVwZGF0ZSBkZWZhdWx0IHZhbHVlcyBpZiBkaWZmZXJlbnQgZnJvbSB0cmFuc2xhdGVkIHZhbHVlIChvbmx5IHVzZWZ1bCBvbiBpbml0aWFsIGRldmVsb3BtZW50LCBvciB3aGVuIGtlZXBpbmcgY29kZSBhcyBzb3VyY2Ugb2YgdHJ1dGgpXG4gIHNhdmVNaXNzaW5nVG86ICdmYWxsYmFjaycsIC8vICdjdXJyZW50JyB8fCAnYWxsJ1xuICBzYXZlTWlzc2luZ1BsdXJhbHM6IHRydWUsIC8vIHdpbGwgc2F2ZSBhbGwgZm9ybXMgbm90IG9ubHkgc2luZ3VsYXIga2V5XG4gIG1pc3NpbmdLZXlIYW5kbGVyOiBmYWxzZSwgLy8gZnVuY3Rpb24obG5nLCBucywga2V5LCBmYWxsYmFja1ZhbHVlKSAtPiBvdmVycmlkZSBpZiBwcmVmZXIgb24gaGFuZGxpbmdcbiAgbWlzc2luZ0ludGVycG9sYXRpb25IYW5kbGVyOiBmYWxzZSwgLy8gZnVuY3Rpb24oc3RyLCBtYXRjaClcblxuICBwb3N0UHJvY2VzczogZmFsc2UsIC8vIHN0cmluZyBvciBhcnJheSBvZiBwb3N0UHJvY2Vzc29yIG5hbWVzXG4gIHBvc3RQcm9jZXNzUGFzc1Jlc29sdmVkOiBmYWxzZSwgLy8gcGFzcyByZXNvbHZlZCBvYmplY3QgaW50byAnb3B0aW9ucy5pMThuUmVzb2x2ZWQnIGZvciBwb3N0cHJvY2Vzc29yXG4gIHJldHVybk51bGw6IGZhbHNlLCAvLyBhbGxvd3MgbnVsbCB2YWx1ZSBhcyB2YWxpZCB0cmFuc2xhdGlvblxuICByZXR1cm5FbXB0eVN0cmluZzogdHJ1ZSwgLy8gYWxsb3dzIGVtcHR5IHN0cmluZyB2YWx1ZSBhcyB2YWxpZCB0cmFuc2xhdGlvblxuICByZXR1cm5PYmplY3RzOiBmYWxzZSxcbiAgam9pbkFycmF5czogZmFsc2UsIC8vIG9yIHN0cmluZyB0byBqb2luIGFycmF5XG4gIHJldHVybmVkT2JqZWN0SGFuZGxlcjogZmFsc2UsIC8vIGZ1bmN0aW9uKGtleSwgdmFsdWUsIG9wdGlvbnMpIHRyaWdnZXJlZCBpZiBrZXkgcmV0dXJucyBvYmplY3QgYnV0IHJldHVybk9iamVjdHMgaXMgc2V0IHRvIGZhbHNlXG4gIHBhcnNlTWlzc2luZ0tleUhhbmRsZXI6IGZhbHNlLCAvLyBmdW5jdGlvbihrZXkpIHBhcnNlZCBhIGtleSB0aGF0IHdhcyBub3QgZm91bmQgaW4gdCgpIGJlZm9yZSByZXR1cm5pbmdcbiAgYXBwZW5kTmFtZXNwYWNlVG9NaXNzaW5nS2V5OiBmYWxzZSxcbiAgYXBwZW5kTmFtZXNwYWNlVG9DSU1vZGU6IGZhbHNlLFxuICBvdmVybG9hZFRyYW5zbGF0aW9uT3B0aW9uSGFuZGxlcjogKGFyZ3MpID0+IHtcbiAgICBsZXQgcmV0ID0ge307XG4gICAgaWYgKHR5cGVvZiBhcmdzWzFdID09PSAnb2JqZWN0JykgcmV0ID0gYXJnc1sxXTtcbiAgICBpZiAoaXNTdHJpbmcoYXJnc1sxXSkpIHJldC5kZWZhdWx0VmFsdWUgPSBhcmdzWzFdO1xuICAgIGlmIChpc1N0cmluZyhhcmdzWzJdKSkgcmV0LnREZXNjcmlwdGlvbiA9IGFyZ3NbMl07XG4gICAgaWYgKHR5cGVvZiBhcmdzWzJdID09PSAnb2JqZWN0JyB8fCB0eXBlb2YgYXJnc1szXSA9PT0gJ29iamVjdCcpIHtcbiAgICAgIGNvbnN0IG9wdGlvbnMgPSBhcmdzWzNdIHx8IGFyZ3NbMl07XG4gICAgICBPYmplY3Qua2V5cyhvcHRpb25zKS5mb3JFYWNoKChrZXkpID0+IHtcbiAgICAgICAgcmV0W2tleV0gPSBvcHRpb25zW2tleV07XG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbiAgfSxcbiAgaW50ZXJwb2xhdGlvbjoge1xuICAgIGVzY2FwZVZhbHVlOiB0cnVlLFxuICAgIC8qKiBAdHlwZSB7aW1wb3J0KCdpMThuZXh0JykuRm9ybWF0RnVuY3Rpb259ICovXG4gICAgZm9ybWF0OiAodmFsdWUpID0+IHZhbHVlLFxuICAgIHByZWZpeDogJ3t7JyxcbiAgICBzdWZmaXg6ICd9fScsXG4gICAgZm9ybWF0U2VwYXJhdG9yOiAnLCcsXG4gICAgLy8gcHJlZml4RXNjYXBlZDogJ3t7JyxcbiAgICAvLyBzdWZmaXhFc2NhcGVkOiAnfX0nLFxuICAgIC8vIHVuZXNjYXBlU3VmZml4OiAnJyxcbiAgICB1bmVzY2FwZVByZWZpeDogJy0nLFxuXG4gICAgbmVzdGluZ1ByZWZpeDogJyR0KCcsXG4gICAgbmVzdGluZ1N1ZmZpeDogJyknLFxuICAgIG5lc3RpbmdPcHRpb25zU2VwYXJhdG9yOiAnLCcsXG4gICAgLy8gbmVzdGluZ1ByZWZpeEVzY2FwZWQ6ICckdCgnLFxuICAgIC8vIG5lc3RpbmdTdWZmaXhFc2NhcGVkOiAnKScsXG4gICAgLy8gZGVmYXVsdFZhcmlhYmxlczogdW5kZWZpbmVkIC8vIG9iamVjdCB0aGF0IGNhbiBoYXZlIHZhbHVlcyB0byBpbnRlcnBvbGF0ZSBvbiAtIGV4dGVuZHMgcGFzc2VkIGluIGludGVycG9sYXRpb24gZGF0YVxuICAgIG1heFJlcGxhY2VzOiAxMDAwLCAvLyBtYXggcmVwbGFjZXMgdG8gcHJldmVudCBlbmRsZXNzIGxvb3BcbiAgICBza2lwT25WYXJpYWJsZXM6IHRydWUsXG4gIH0sXG4gIGNhY2hlSW5CdWlsdEZvcm1hdHM6IHRydWUsXG59KTtcblxuLyogZXNsaW50IG5vLXBhcmFtLXJlYXNzaWduOiAwICovXG5leHBvcnQgY29uc3QgdHJhbnNmb3JtT3B0aW9ucyA9IChvcHRpb25zKSA9PiB7XG4gIC8vIGNyZWF0ZSBuYW1lc3BhY2Ugb2JqZWN0IGlmIG5hbWVzcGFjZSBpcyBwYXNzZWQgaW4gYXMgc3RyaW5nXG4gIGlmIChpc1N0cmluZyhvcHRpb25zLm5zKSkgb3B0aW9ucy5ucyA9IFtvcHRpb25zLm5zXTtcbiAgaWYgKGlzU3RyaW5nKG9wdGlvbnMuZmFsbGJhY2tMbmcpKSBvcHRpb25zLmZhbGxiYWNrTG5nID0gW29wdGlvbnMuZmFsbGJhY2tMbmddO1xuICBpZiAoaXNTdHJpbmcob3B0aW9ucy5mYWxsYmFja05TKSkgb3B0aW9ucy5mYWxsYmFja05TID0gW29wdGlvbnMuZmFsbGJhY2tOU107XG5cbiAgLy8gZXh0ZW5kIHN1cHBvcnRlZExuZ3Mgd2l0aCBjaW1vZGVcbiAgaWYgKG9wdGlvbnMuc3VwcG9ydGVkTG5ncz8uaW5kZXhPZj8uKCdjaW1vZGUnKSA8IDApIHtcbiAgICBvcHRpb25zLnN1cHBvcnRlZExuZ3MgPSBvcHRpb25zLnN1cHBvcnRlZExuZ3MuY29uY2F0KFsnY2ltb2RlJ10pO1xuICB9XG5cbiAgLy8gZm9yIGJhY2t3YXJkIGNvbXBhdGliaWxpdHksIGFzc2lnbiBpbml0SW1tZWRpYXRlIHRvIGluaXRBc3luYyAoaWYgc2V0KVxuICBpZiAodHlwZW9mIG9wdGlvbnMuaW5pdEltbWVkaWF0ZSA9PT0gJ2Jvb2xlYW4nKSBvcHRpb25zLmluaXRBc3luYyA9IG9wdGlvbnMuaW5pdEltbWVkaWF0ZTtcblxuICByZXR1cm4gb3B0aW9ucztcbn07XG4iLCJpbXBvcnQgYmFzZUxvZ2dlciBmcm9tICcuL2xvZ2dlci5qcyc7XG5pbXBvcnQgRXZlbnRFbWl0dGVyIGZyb20gJy4vRXZlbnRFbWl0dGVyLmpzJztcbmltcG9ydCBSZXNvdXJjZVN0b3JlIGZyb20gJy4vUmVzb3VyY2VTdG9yZS5qcyc7XG5pbXBvcnQgVHJhbnNsYXRvciBmcm9tICcuL1RyYW5zbGF0b3IuanMnO1xuaW1wb3J0IExhbmd1YWdlVXRpbHMgZnJvbSAnLi9MYW5ndWFnZVV0aWxzLmpzJztcbmltcG9ydCBQbHVyYWxSZXNvbHZlciBmcm9tICcuL1BsdXJhbFJlc29sdmVyLmpzJztcbmltcG9ydCBJbnRlcnBvbGF0b3IgZnJvbSAnLi9JbnRlcnBvbGF0b3IuanMnO1xuaW1wb3J0IEZvcm1hdHRlciBmcm9tICcuL0Zvcm1hdHRlci5qcyc7XG5pbXBvcnQgQmFja2VuZENvbm5lY3RvciBmcm9tICcuL0JhY2tlbmRDb25uZWN0b3IuanMnO1xuaW1wb3J0IHsgZ2V0IGFzIGdldERlZmF1bHRzLCB0cmFuc2Zvcm1PcHRpb25zIH0gZnJvbSAnLi9kZWZhdWx0cy5qcyc7XG5pbXBvcnQgcG9zdFByb2Nlc3NvciBmcm9tICcuL3Bvc3RQcm9jZXNzb3IuanMnO1xuaW1wb3J0IHsgZGVmZXIsIGlzU3RyaW5nIH0gZnJvbSAnLi91dGlscy5qcyc7XG5cbmNvbnN0IG5vb3AgPSAoKSA9PiB7fVxuXG4vLyBCaW5kcyB0aGUgbWVtYmVyIGZ1bmN0aW9ucyBvZiB0aGUgZ2l2ZW4gY2xhc3MgaW5zdGFuY2Ugc28gdGhhdCB0aGV5IGNhbiBiZVxuLy8gZGVzdHJ1Y3R1cmVkIG9yIHVzZWQgYXMgY2FsbGJhY2tzLlxuY29uc3QgYmluZE1lbWJlckZ1bmN0aW9ucyA9IChpbnN0KSA9PiB7XG4gIGNvbnN0IG1lbXMgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhPYmplY3QuZ2V0UHJvdG90eXBlT2YoaW5zdCkpXG4gIG1lbXMuZm9yRWFjaCgobWVtKSA9PiB7XG4gICAgaWYgKHR5cGVvZiBpbnN0W21lbV0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIGluc3RbbWVtXSA9IGluc3RbbWVtXS5iaW5kKGluc3QpXG4gICAgfVxuICB9KVxufVxuXG5jbGFzcyBJMThuIGV4dGVuZHMgRXZlbnRFbWl0dGVyIHtcbiAgY29uc3RydWN0b3Iob3B0aW9ucyA9IHt9LCBjYWxsYmFjaykge1xuICAgIHN1cGVyKCk7XG5cbiAgICB0aGlzLm9wdGlvbnMgPSB0cmFuc2Zvcm1PcHRpb25zKG9wdGlvbnMpO1xuICAgIHRoaXMuc2VydmljZXMgPSB7fTtcbiAgICB0aGlzLmxvZ2dlciA9IGJhc2VMb2dnZXI7XG4gICAgdGhpcy5tb2R1bGVzID0geyBleHRlcm5hbDogW10gfTtcblxuICAgIGJpbmRNZW1iZXJGdW5jdGlvbnModGhpcyk7XG5cbiAgICBpZiAoY2FsbGJhY2sgJiYgIXRoaXMuaXNJbml0aWFsaXplZCAmJiAhb3B0aW9ucy5pc0Nsb25lKSB7XG4gICAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vaTE4bmV4dC9pMThuZXh0L2lzc3Vlcy84NzlcbiAgICAgIGlmICghdGhpcy5vcHRpb25zLmluaXRBc3luYykge1xuICAgICAgICB0aGlzLmluaXQob3B0aW9ucywgY2FsbGJhY2spO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgIH1cbiAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICB0aGlzLmluaXQob3B0aW9ucywgY2FsbGJhY2spO1xuICAgICAgfSwgMCk7XG4gICAgfVxuICB9XG5cbiAgaW5pdChvcHRpb25zID0ge30sIGNhbGxiYWNrKSB7XG4gICAgdGhpcy5pc0luaXRpYWxpemluZyA9IHRydWU7XG4gICAgaWYgKHR5cGVvZiBvcHRpb25zID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBjYWxsYmFjayA9IG9wdGlvbnM7XG4gICAgICBvcHRpb25zID0ge307XG4gICAgfVxuXG4gICAgaWYgKG9wdGlvbnMuZGVmYXVsdE5TID09IG51bGwgJiYgb3B0aW9ucy5ucykge1xuICAgICAgaWYgKGlzU3RyaW5nKG9wdGlvbnMubnMpKSB7XG4gICAgICAgIG9wdGlvbnMuZGVmYXVsdE5TID0gb3B0aW9ucy5ucztcbiAgICAgIH0gZWxzZSBpZiAob3B0aW9ucy5ucy5pbmRleE9mKCd0cmFuc2xhdGlvbicpIDwgMCkge1xuICAgICAgICBvcHRpb25zLmRlZmF1bHROUyA9IG9wdGlvbnMubnNbMF07XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgZGVmT3B0cyA9IGdldERlZmF1bHRzKCk7XG4gICAgdGhpcy5vcHRpb25zID0geyAuLi5kZWZPcHRzLCAuLi50aGlzLm9wdGlvbnMsIC4uLnRyYW5zZm9ybU9wdGlvbnMob3B0aW9ucykgfTtcbiAgICB0aGlzLm9wdGlvbnMuaW50ZXJwb2xhdGlvbiA9IHsgLi4uZGVmT3B0cy5pbnRlcnBvbGF0aW9uLCAuLi50aGlzLm9wdGlvbnMuaW50ZXJwb2xhdGlvbiB9OyAvLyBkbyBub3QgdXNlIHJlZmVyZW5jZVxuICAgIGlmIChvcHRpb25zLmtleVNlcGFyYXRvciAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzLm9wdGlvbnMudXNlckRlZmluZWRLZXlTZXBhcmF0b3IgPSBvcHRpb25zLmtleVNlcGFyYXRvcjtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMubnNTZXBhcmF0b3IgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5vcHRpb25zLnVzZXJEZWZpbmVkTnNTZXBhcmF0b3IgPSBvcHRpb25zLm5zU2VwYXJhdG9yO1xuICAgIH1cblxuICAgIGNvbnN0IGNyZWF0ZUNsYXNzT25EZW1hbmQgPSAoQ2xhc3NPck9iamVjdCkgPT4ge1xuICAgICAgaWYgKCFDbGFzc09yT2JqZWN0KSByZXR1cm4gbnVsbDtcbiAgICAgIGlmICh0eXBlb2YgQ2xhc3NPck9iamVjdCA9PT0gJ2Z1bmN0aW9uJykgcmV0dXJuIG5ldyBDbGFzc09yT2JqZWN0KCk7XG4gICAgICByZXR1cm4gQ2xhc3NPck9iamVjdDtcbiAgICB9XG5cbiAgICAvLyBpbml0IHNlcnZpY2VzXG4gICAgaWYgKCF0aGlzLm9wdGlvbnMuaXNDbG9uZSkge1xuICAgICAgaWYgKHRoaXMubW9kdWxlcy5sb2dnZXIpIHtcbiAgICAgICAgYmFzZUxvZ2dlci5pbml0KGNyZWF0ZUNsYXNzT25EZW1hbmQodGhpcy5tb2R1bGVzLmxvZ2dlciksIHRoaXMub3B0aW9ucyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBiYXNlTG9nZ2VyLmluaXQobnVsbCwgdGhpcy5vcHRpb25zKTtcbiAgICAgIH1cblxuICAgICAgbGV0IGZvcm1hdHRlcjtcbiAgICAgIGlmICh0aGlzLm1vZHVsZXMuZm9ybWF0dGVyKSB7XG4gICAgICAgIGZvcm1hdHRlciA9IHRoaXMubW9kdWxlcy5mb3JtYXR0ZXI7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBmb3JtYXR0ZXIgPSBGb3JtYXR0ZXI7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGx1ID0gbmV3IExhbmd1YWdlVXRpbHModGhpcy5vcHRpb25zKTtcblxuICAgICAgLy8gaWYgKHRoaXMub3B0aW9ucy5yZXNvdXJjZXMpIHtcbiAgICAgIC8vICAgT2JqZWN0LmtleXModGhpcy5vcHRpb25zLnJlc291cmNlcykuZm9yRWFjaCgobG5nKSA9PiB7XG4gICAgICAvLyAgICAgY29uc3QgZkxuZyA9IGx1LmZvcm1hdExhbmd1YWdlQ29kZShsbmcpO1xuICAgICAgLy8gICAgIGlmIChmTG5nICE9PSBsbmcpIHtcbiAgICAgIC8vICAgICAgIHRoaXMub3B0aW9ucy5yZXNvdXJjZXNbZkxuZ10gPSB0aGlzLm9wdGlvbnMucmVzb3VyY2VzW2xuZ107XG4gICAgICAvLyAgICAgICBkZWxldGUgdGhpcy5vcHRpb25zLnJlc291cmNlc1tsbmddO1xuICAgICAgLy8gICAgICAgdGhpcy5sb2dnZXIud2FybihgaW5pdDogbG5nIGluIHJlc291cmNlIGlzIG5vdCB2YWxpZCwgbWFwcGluZyAke2xuZ30gdG8gJHtmTG5nfWApO1xuICAgICAgLy8gICAgIH1cbiAgICAgIC8vICAgfSlcbiAgICAgIC8vIH1cblxuICAgICAgdGhpcy5zdG9yZSA9IG5ldyBSZXNvdXJjZVN0b3JlKHRoaXMub3B0aW9ucy5yZXNvdXJjZXMsIHRoaXMub3B0aW9ucyk7XG5cbiAgICAgIGNvbnN0IHMgPSB0aGlzLnNlcnZpY2VzO1xuICAgICAgcy5sb2dnZXIgPSBiYXNlTG9nZ2VyO1xuICAgICAgcy5yZXNvdXJjZVN0b3JlID0gdGhpcy5zdG9yZTtcbiAgICAgIHMubGFuZ3VhZ2VVdGlscyA9IGx1O1xuICAgICAgcy5wbHVyYWxSZXNvbHZlciA9IG5ldyBQbHVyYWxSZXNvbHZlcihsdSwge1xuICAgICAgICBwcmVwZW5kOiB0aGlzLm9wdGlvbnMucGx1cmFsU2VwYXJhdG9yLFxuICAgICAgICBzaW1wbGlmeVBsdXJhbFN1ZmZpeDogdGhpcy5vcHRpb25zLnNpbXBsaWZ5UGx1cmFsU3VmZml4LFxuICAgICAgfSk7XG5cbiAgICAgIGlmIChmb3JtYXR0ZXIgJiYgKCF0aGlzLm9wdGlvbnMuaW50ZXJwb2xhdGlvbi5mb3JtYXQgfHwgdGhpcy5vcHRpb25zLmludGVycG9sYXRpb24uZm9ybWF0ID09PSBkZWZPcHRzLmludGVycG9sYXRpb24uZm9ybWF0KSkge1xuICAgICAgICBzLmZvcm1hdHRlciA9IGNyZWF0ZUNsYXNzT25EZW1hbmQoZm9ybWF0dGVyKTtcbiAgICAgICAgcy5mb3JtYXR0ZXIuaW5pdChzLCB0aGlzLm9wdGlvbnMpO1xuXG4gICAgICAgIHRoaXMub3B0aW9ucy5pbnRlcnBvbGF0aW9uLmZvcm1hdCA9IHMuZm9ybWF0dGVyLmZvcm1hdC5iaW5kKHMuZm9ybWF0dGVyKTtcbiAgICAgIH1cblxuICAgICAgcy5pbnRlcnBvbGF0b3IgPSBuZXcgSW50ZXJwb2xhdG9yKHRoaXMub3B0aW9ucyk7XG4gICAgICBzLnV0aWxzID0ge1xuICAgICAgICBoYXNMb2FkZWROYW1lc3BhY2U6IHRoaXMuaGFzTG9hZGVkTmFtZXNwYWNlLmJpbmQodGhpcylcbiAgICAgIH07XG5cbiAgICAgIHMuYmFja2VuZENvbm5lY3RvciA9IG5ldyBCYWNrZW5kQ29ubmVjdG9yKFxuICAgICAgICBjcmVhdGVDbGFzc09uRGVtYW5kKHRoaXMubW9kdWxlcy5iYWNrZW5kKSxcbiAgICAgICAgcy5yZXNvdXJjZVN0b3JlLFxuICAgICAgICBzLFxuICAgICAgICB0aGlzLm9wdGlvbnMsXG4gICAgICApO1xuICAgICAgLy8gcGlwZSBldmVudHMgZnJvbSBiYWNrZW5kQ29ubmVjdG9yXG4gICAgICBzLmJhY2tlbmRDb25uZWN0b3Iub24oJyonLCAoZXZlbnQsIC4uLmFyZ3MpID0+IHtcbiAgICAgICAgdGhpcy5lbWl0KGV2ZW50LCAuLi5hcmdzKTtcbiAgICAgIH0pO1xuXG4gICAgICBpZiAodGhpcy5tb2R1bGVzLmxhbmd1YWdlRGV0ZWN0b3IpIHtcbiAgICAgICAgcy5sYW5ndWFnZURldGVjdG9yID0gY3JlYXRlQ2xhc3NPbkRlbWFuZCh0aGlzLm1vZHVsZXMubGFuZ3VhZ2VEZXRlY3Rvcik7XG4gICAgICAgIGlmIChzLmxhbmd1YWdlRGV0ZWN0b3IuaW5pdCkgcy5sYW5ndWFnZURldGVjdG9yLmluaXQocywgdGhpcy5vcHRpb25zLmRldGVjdGlvbiwgdGhpcy5vcHRpb25zKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMubW9kdWxlcy5pMThuRm9ybWF0KSB7XG4gICAgICAgIHMuaTE4bkZvcm1hdCA9IGNyZWF0ZUNsYXNzT25EZW1hbmQodGhpcy5tb2R1bGVzLmkxOG5Gb3JtYXQpO1xuICAgICAgICBpZiAocy5pMThuRm9ybWF0LmluaXQpIHMuaTE4bkZvcm1hdC5pbml0KHRoaXMpO1xuICAgICAgfVxuXG4gICAgICB0aGlzLnRyYW5zbGF0b3IgPSBuZXcgVHJhbnNsYXRvcih0aGlzLnNlcnZpY2VzLCB0aGlzLm9wdGlvbnMpO1xuICAgICAgLy8gcGlwZSBldmVudHMgZnJvbSB0cmFuc2xhdG9yXG4gICAgICB0aGlzLnRyYW5zbGF0b3Iub24oJyonLCAoZXZlbnQsIC4uLmFyZ3MpID0+IHtcbiAgICAgICAgdGhpcy5lbWl0KGV2ZW50LCAuLi5hcmdzKTtcbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLm1vZHVsZXMuZXh0ZXJuYWwuZm9yRWFjaChtID0+IHtcbiAgICAgICAgaWYgKG0uaW5pdCkgbS5pbml0KHRoaXMpO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgdGhpcy5mb3JtYXQgPSB0aGlzLm9wdGlvbnMuaW50ZXJwb2xhdGlvbi5mb3JtYXQ7XG4gICAgaWYgKCFjYWxsYmFjaykgY2FsbGJhY2sgPSBub29wO1xuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5mYWxsYmFja0xuZyAmJiAhdGhpcy5zZXJ2aWNlcy5sYW5ndWFnZURldGVjdG9yICYmICF0aGlzLm9wdGlvbnMubG5nKSB7XG4gICAgICBjb25zdCBjb2RlcyA9IHRoaXMuc2VydmljZXMubGFuZ3VhZ2VVdGlscy5nZXRGYWxsYmFja0NvZGVzKHRoaXMub3B0aW9ucy5mYWxsYmFja0xuZylcbiAgICAgIGlmIChjb2Rlcy5sZW5ndGggPiAwICYmIGNvZGVzWzBdICE9PSAnZGV2JykgdGhpcy5vcHRpb25zLmxuZyA9IGNvZGVzWzBdXG4gICAgfVxuICAgIGlmICghdGhpcy5zZXJ2aWNlcy5sYW5ndWFnZURldGVjdG9yICYmICF0aGlzLm9wdGlvbnMubG5nKSB7XG4gICAgICB0aGlzLmxvZ2dlci53YXJuKCdpbml0OiBubyBsYW5ndWFnZURldGVjdG9yIGlzIHVzZWQgYW5kIG5vIGxuZyBpcyBkZWZpbmVkJyk7XG4gICAgfVxuXG4gICAgLy8gYXBwZW5kIGFwaVxuICAgIGNvbnN0IHN0b3JlQXBpID0gW1xuICAgICAgJ2dldFJlc291cmNlJyxcbiAgICAgICdoYXNSZXNvdXJjZUJ1bmRsZScsXG4gICAgICAnZ2V0UmVzb3VyY2VCdW5kbGUnLFxuICAgICAgJ2dldERhdGFCeUxhbmd1YWdlJyxcbiAgICBdO1xuICAgIHN0b3JlQXBpLmZvckVhY2goZmNOYW1lID0+IHtcbiAgICAgIHRoaXNbZmNOYW1lXSA9ICguLi5hcmdzKSA9PiB0aGlzLnN0b3JlW2ZjTmFtZV0oLi4uYXJncyk7XG4gICAgfSk7XG4gICAgY29uc3Qgc3RvcmVBcGlDaGFpbmVkID0gW1xuICAgICAgJ2FkZFJlc291cmNlJyxcbiAgICAgICdhZGRSZXNvdXJjZXMnLFxuICAgICAgJ2FkZFJlc291cmNlQnVuZGxlJyxcbiAgICAgICdyZW1vdmVSZXNvdXJjZUJ1bmRsZScsXG4gICAgXTtcbiAgICBzdG9yZUFwaUNoYWluZWQuZm9yRWFjaChmY05hbWUgPT4ge1xuICAgICAgdGhpc1tmY05hbWVdID0gKC4uLmFyZ3MpID0+IHtcbiAgICAgICAgdGhpcy5zdG9yZVtmY05hbWVdKC4uLmFyZ3MpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgIH07XG4gICAgfSk7XG5cbiAgICBjb25zdCBkZWZlcnJlZCA9IGRlZmVyKCk7XG5cbiAgICBjb25zdCBsb2FkID0gKCkgPT4ge1xuICAgICAgY29uc3QgZmluaXNoID0gKGVyciwgdCkgPT4ge1xuICAgICAgICB0aGlzLmlzSW5pdGlhbGl6aW5nID0gZmFsc2U7XG4gICAgICAgIGlmICh0aGlzLmlzSW5pdGlhbGl6ZWQgJiYgIXRoaXMuaW5pdGlhbGl6ZWRTdG9yZU9uY2UpIHRoaXMubG9nZ2VyLndhcm4oJ2luaXQ6IGkxOG5leHQgaXMgYWxyZWFkeSBpbml0aWFsaXplZC4gWW91IHNob3VsZCBjYWxsIGluaXQganVzdCBvbmNlIScpO1xuICAgICAgICB0aGlzLmlzSW5pdGlhbGl6ZWQgPSB0cnVlO1xuICAgICAgICBpZiAoIXRoaXMub3B0aW9ucy5pc0Nsb25lKSB0aGlzLmxvZ2dlci5sb2coJ2luaXRpYWxpemVkJywgdGhpcy5vcHRpb25zKTtcbiAgICAgICAgdGhpcy5lbWl0KCdpbml0aWFsaXplZCcsIHRoaXMub3B0aW9ucyk7XG5cbiAgICAgICAgZGVmZXJyZWQucmVzb2x2ZSh0KTsgLy8gbm90IHJlamVjdGluZyBvbiBlcnIgKGFzIGVyciBpcyBvbmx5IGEgbG9hZGluZyB0cmFuc2xhdGlvbiBmYWlsZWQgd2FybmluZylcbiAgICAgICAgY2FsbGJhY2soZXJyLCB0KTtcbiAgICAgIH07XG4gICAgICAvLyBmaXggZm9yIHVzZSBjYXNlcyB3aGVuIGNhbGxpbmcgY2hhbmdlTGFuZ3VhZ2UgYmVmb3JlIGZpbmlzaGVkIHRvIGluaXRpYWxpemVkIChpLmUuIGh0dHBzOi8vZ2l0aHViLmNvbS9pMThuZXh0L2kxOG5leHQvaXNzdWVzLzE1NTIpXG4gICAgICBpZiAodGhpcy5sYW5ndWFnZXMgJiYgIXRoaXMuaXNJbml0aWFsaXplZCkgcmV0dXJuIGZpbmlzaChudWxsLCB0aGlzLnQuYmluZCh0aGlzKSk7XG4gICAgICB0aGlzLmNoYW5nZUxhbmd1YWdlKHRoaXMub3B0aW9ucy5sbmcsIGZpbmlzaCk7XG4gICAgfTtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMucmVzb3VyY2VzIHx8ICF0aGlzLm9wdGlvbnMuaW5pdEFzeW5jKSB7XG4gICAgICBsb2FkKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHNldFRpbWVvdXQobG9hZCwgMCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGRlZmVycmVkO1xuICB9XG5cbiAgLyogZXNsaW50IGNvbnNpc3RlbnQtcmV0dXJuOiAwICovXG4gIGxvYWRSZXNvdXJjZXMobGFuZ3VhZ2UsIGNhbGxiYWNrID0gbm9vcCkge1xuICAgIGxldCB1c2VkQ2FsbGJhY2sgPSBjYWxsYmFjaztcbiAgICBjb25zdCB1c2VkTG5nID0gaXNTdHJpbmcobGFuZ3VhZ2UpID8gbGFuZ3VhZ2UgOiB0aGlzLmxhbmd1YWdlO1xuICAgIGlmICh0eXBlb2YgbGFuZ3VhZ2UgPT09ICdmdW5jdGlvbicpIHVzZWRDYWxsYmFjayA9IGxhbmd1YWdlO1xuXG4gICAgaWYgKCF0aGlzLm9wdGlvbnMucmVzb3VyY2VzIHx8IHRoaXMub3B0aW9ucy5wYXJ0aWFsQnVuZGxlZExhbmd1YWdlcykge1xuICAgICAgaWYgKHVzZWRMbmc/LnRvTG93ZXJDYXNlKCkgPT09ICdjaW1vZGUnICYmICghdGhpcy5vcHRpb25zLnByZWxvYWQgfHwgdGhpcy5vcHRpb25zLnByZWxvYWQubGVuZ3RoID09PSAwKSkgcmV0dXJuIHVzZWRDYWxsYmFjaygpOyAvLyBhdm9pZCBsb2FkaW5nIHJlc291cmNlcyBmb3IgY2ltb2RlXG5cbiAgICAgIGNvbnN0IHRvTG9hZCA9IFtdO1xuXG4gICAgICBjb25zdCBhcHBlbmQgPSBsbmcgPT4ge1xuICAgICAgICBpZiAoIWxuZykgcmV0dXJuO1xuICAgICAgICBpZiAobG5nID09PSAnY2ltb2RlJykgcmV0dXJuO1xuICAgICAgICBjb25zdCBsbmdzID0gdGhpcy5zZXJ2aWNlcy5sYW5ndWFnZVV0aWxzLnRvUmVzb2x2ZUhpZXJhcmNoeShsbmcpO1xuICAgICAgICBsbmdzLmZvckVhY2gobCA9PiB7XG4gICAgICAgICAgaWYgKGwgPT09ICdjaW1vZGUnKSByZXR1cm47XG4gICAgICAgICAgaWYgKHRvTG9hZC5pbmRleE9mKGwpIDwgMCkgdG9Mb2FkLnB1c2gobCk7XG4gICAgICAgIH0pO1xuICAgICAgfTtcblxuICAgICAgaWYgKCF1c2VkTG5nKSB7XG4gICAgICAgIC8vIGF0IGxlYXN0IGxvYWQgZmFsbGJhY2tzIGluIHRoaXMgY2FzZVxuICAgICAgICBjb25zdCBmYWxsYmFja3MgPSB0aGlzLnNlcnZpY2VzLmxhbmd1YWdlVXRpbHMuZ2V0RmFsbGJhY2tDb2Rlcyh0aGlzLm9wdGlvbnMuZmFsbGJhY2tMbmcpO1xuICAgICAgICBmYWxsYmFja3MuZm9yRWFjaChsID0+IGFwcGVuZChsKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBhcHBlbmQodXNlZExuZyk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMub3B0aW9ucy5wcmVsb2FkPy5mb3JFYWNoPy4obCA9PiBhcHBlbmQobCkpO1xuXG4gICAgICB0aGlzLnNlcnZpY2VzLmJhY2tlbmRDb25uZWN0b3IubG9hZCh0b0xvYWQsIHRoaXMub3B0aW9ucy5ucywgKGUpID0+IHtcbiAgICAgICAgaWYgKCFlICYmICF0aGlzLnJlc29sdmVkTGFuZ3VhZ2UgJiYgdGhpcy5sYW5ndWFnZSkgdGhpcy5zZXRSZXNvbHZlZExhbmd1YWdlKHRoaXMubGFuZ3VhZ2UpO1xuICAgICAgICB1c2VkQ2FsbGJhY2soZSk7XG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgdXNlZENhbGxiYWNrKG51bGwpO1xuICAgIH1cbiAgfVxuXG4gIHJlbG9hZFJlc291cmNlcyhsbmdzLCBucywgY2FsbGJhY2spIHtcbiAgICBjb25zdCBkZWZlcnJlZCA9IGRlZmVyKCk7XG4gICAgaWYgKHR5cGVvZiBsbmdzID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBjYWxsYmFjayA9IGxuZ3M7XG4gICAgICBsbmdzID0gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBpZiAodHlwZW9mIG5zID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBjYWxsYmFjayA9IG5zO1xuICAgICAgbnMgPSB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGlmICghbG5ncykgbG5ncyA9IHRoaXMubGFuZ3VhZ2VzO1xuICAgIGlmICghbnMpIG5zID0gdGhpcy5vcHRpb25zLm5zO1xuICAgIGlmICghY2FsbGJhY2spIGNhbGxiYWNrID0gbm9vcDtcbiAgICB0aGlzLnNlcnZpY2VzLmJhY2tlbmRDb25uZWN0b3IucmVsb2FkKGxuZ3MsIG5zLCBlcnIgPT4ge1xuICAgICAgZGVmZXJyZWQucmVzb2x2ZSgpOyAvLyBub3QgcmVqZWN0aW5nIG9uIGVyciAoYXMgZXJyIGlzIG9ubHkgYSBsb2FkaW5nIHRyYW5zbGF0aW9uIGZhaWxlZCB3YXJuaW5nKVxuICAgICAgY2FsbGJhY2soZXJyKTtcbiAgICB9KTtcbiAgICByZXR1cm4gZGVmZXJyZWQ7XG4gIH1cblxuICB1c2UobW9kdWxlKSB7XG4gICAgaWYgKCFtb2R1bGUpIHRocm93IG5ldyBFcnJvcignWW91IGFyZSBwYXNzaW5nIGFuIHVuZGVmaW5lZCBtb2R1bGUhIFBsZWFzZSBjaGVjayB0aGUgb2JqZWN0IHlvdSBhcmUgcGFzc2luZyB0byBpMThuZXh0LnVzZSgpJylcbiAgICBpZiAoIW1vZHVsZS50eXBlKSB0aHJvdyBuZXcgRXJyb3IoJ1lvdSBhcmUgcGFzc2luZyBhIHdyb25nIG1vZHVsZSEgUGxlYXNlIGNoZWNrIHRoZSBvYmplY3QgeW91IGFyZSBwYXNzaW5nIHRvIGkxOG5leHQudXNlKCknKVxuXG4gICAgaWYgKG1vZHVsZS50eXBlID09PSAnYmFja2VuZCcpIHtcbiAgICAgIHRoaXMubW9kdWxlcy5iYWNrZW5kID0gbW9kdWxlO1xuICAgIH1cblxuICAgIGlmIChtb2R1bGUudHlwZSA9PT0gJ2xvZ2dlcicgfHwgKG1vZHVsZS5sb2cgJiYgbW9kdWxlLndhcm4gJiYgbW9kdWxlLmVycm9yKSkge1xuICAgICAgdGhpcy5tb2R1bGVzLmxvZ2dlciA9IG1vZHVsZTtcbiAgICB9XG5cbiAgICBpZiAobW9kdWxlLnR5cGUgPT09ICdsYW5ndWFnZURldGVjdG9yJykge1xuICAgICAgdGhpcy5tb2R1bGVzLmxhbmd1YWdlRGV0ZWN0b3IgPSBtb2R1bGU7XG4gICAgfVxuXG4gICAgaWYgKG1vZHVsZS50eXBlID09PSAnaTE4bkZvcm1hdCcpIHtcbiAgICAgIHRoaXMubW9kdWxlcy5pMThuRm9ybWF0ID0gbW9kdWxlO1xuICAgIH1cblxuICAgIGlmIChtb2R1bGUudHlwZSA9PT0gJ3Bvc3RQcm9jZXNzb3InKSB7XG4gICAgICBwb3N0UHJvY2Vzc29yLmFkZFBvc3RQcm9jZXNzb3IobW9kdWxlKTtcbiAgICB9XG5cbiAgICBpZiAobW9kdWxlLnR5cGUgPT09ICdmb3JtYXR0ZXInKSB7XG4gICAgICB0aGlzLm1vZHVsZXMuZm9ybWF0dGVyID0gbW9kdWxlO1xuICAgIH1cblxuICAgIGlmIChtb2R1bGUudHlwZSA9PT0gJzNyZFBhcnR5Jykge1xuICAgICAgdGhpcy5tb2R1bGVzLmV4dGVybmFsLnB1c2gobW9kdWxlKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIHNldFJlc29sdmVkTGFuZ3VhZ2UobCkge1xuICAgIGlmICghbCB8fCAhdGhpcy5sYW5ndWFnZXMpIHJldHVybjtcbiAgICBpZiAoWydjaW1vZGUnLCAnZGV2J10uaW5kZXhPZihsKSA+IC0xKSByZXR1cm47XG4gICAgZm9yIChsZXQgbGkgPSAwOyBsaSA8IHRoaXMubGFuZ3VhZ2VzLmxlbmd0aDsgbGkrKykge1xuICAgICAgY29uc3QgbG5nSW5MbmdzID0gdGhpcy5sYW5ndWFnZXNbbGldO1xuICAgICAgaWYgKFsnY2ltb2RlJywgJ2RldiddLmluZGV4T2YobG5nSW5MbmdzKSA+IC0xKSBjb250aW51ZTtcbiAgICAgIGlmICh0aGlzLnN0b3JlLmhhc0xhbmd1YWdlU29tZVRyYW5zbGF0aW9ucyhsbmdJbkxuZ3MpKSB7XG4gICAgICAgIHRoaXMucmVzb2x2ZWRMYW5ndWFnZSA9IGxuZ0luTG5ncztcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICAgIGlmICghdGhpcy5yZXNvbHZlZExhbmd1YWdlICYmIHRoaXMubGFuZ3VhZ2VzLmluZGV4T2YobCkgPCAwICYmIHRoaXMuc3RvcmUuaGFzTGFuZ3VhZ2VTb21lVHJhbnNsYXRpb25zKGwpKSB7XG4gICAgICB0aGlzLnJlc29sdmVkTGFuZ3VhZ2UgPSBsO1xuICAgICAgdGhpcy5sYW5ndWFnZXMudW5zaGlmdChsKTtcbiAgICB9XG4gIH1cblxuICBjaGFuZ2VMYW5ndWFnZShsbmcsIGNhbGxiYWNrKSB7XG4gICAgdGhpcy5pc0xhbmd1YWdlQ2hhbmdpbmdUbyA9IGxuZztcbiAgICBjb25zdCBkZWZlcnJlZCA9IGRlZmVyKCk7XG4gICAgdGhpcy5lbWl0KCdsYW5ndWFnZUNoYW5naW5nJywgbG5nKTtcblxuICAgIGNvbnN0IHNldExuZ1Byb3BzID0gKGwpID0+IHtcbiAgICAgIHRoaXMubGFuZ3VhZ2UgPSBsO1xuICAgICAgdGhpcy5sYW5ndWFnZXMgPSB0aGlzLnNlcnZpY2VzLmxhbmd1YWdlVXRpbHMudG9SZXNvbHZlSGllcmFyY2h5KGwpO1xuICAgICAgLy8gZmluZCB0aGUgZmlyc3QgbGFuZ3VhZ2UgcmVzb2x2ZWQgbGFuZ3VhZ2VcbiAgICAgIHRoaXMucmVzb2x2ZWRMYW5ndWFnZSA9IHVuZGVmaW5lZDtcbiAgICAgIHRoaXMuc2V0UmVzb2x2ZWRMYW5ndWFnZShsKTtcbiAgICB9O1xuXG4gICAgY29uc3QgZG9uZSA9IChlcnIsIGwpID0+IHtcbiAgICAgIGlmIChsKSB7XG4gICAgICAgIGlmICh0aGlzLmlzTGFuZ3VhZ2VDaGFuZ2luZ1RvID09PSBsbmcpIHtcbiAgICAgICAgICBzZXRMbmdQcm9wcyhsKTtcbiAgICAgICAgICB0aGlzLnRyYW5zbGF0b3IuY2hhbmdlTGFuZ3VhZ2UobCk7XG4gICAgICAgICAgdGhpcy5pc0xhbmd1YWdlQ2hhbmdpbmdUbyA9IHVuZGVmaW5lZDtcbiAgICAgICAgICB0aGlzLmVtaXQoJ2xhbmd1YWdlQ2hhbmdlZCcsIGwpO1xuICAgICAgICAgIHRoaXMubG9nZ2VyLmxvZygnbGFuZ3VhZ2VDaGFuZ2VkJywgbCk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuaXNMYW5ndWFnZUNoYW5naW5nVG8gPSB1bmRlZmluZWQ7XG4gICAgICB9XG5cbiAgICAgIGRlZmVycmVkLnJlc29sdmUoKC4uLmFyZ3MpID0+IHRoaXMudCguLi5hcmdzKSk7XG4gICAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrKGVyciwgKC4uLmFyZ3MpID0+IHRoaXMudCguLi5hcmdzKSk7XG4gICAgfTtcblxuICAgIGNvbnN0IHNldExuZyA9IGxuZ3MgPT4ge1xuICAgICAgLy8gaWYgZGV0ZWN0ZWQgbG5nIGlzIGZhbHN5LCBzZXQgaXQgdG8gZW1wdHkgYXJyYXksIHRvIG1ha2Ugc3VyZSBhdCBsZWFzdCB0aGUgZmFsbGJhY2tMbmcgd2lsbCBiZSB1c2VkXG4gICAgICBpZiAoIWxuZyAmJiAhbG5ncyAmJiB0aGlzLnNlcnZpY2VzLmxhbmd1YWdlRGV0ZWN0b3IpIGxuZ3MgPSBbXTtcbiAgICAgIC8vIGRlcGVuZGluZyBvbiBBUEkgaW4gZGV0ZWN0b3IgbG5nIGNhbiBiZSBhIHN0cmluZyAob2xkKSBvciBhbiBhcnJheSBvZiBsYW5ndWFnZXMgb3JkZXJlZCBpbiBwcmlvcml0eVxuICAgICAgY29uc3QgZmwgPSBpc1N0cmluZyhsbmdzKSA/IGxuZ3MgOiBsbmdzICYmIGxuZ3NbMF07XG4gICAgICBjb25zdCBsID0gdGhpcy5zdG9yZS5oYXNMYW5ndWFnZVNvbWVUcmFuc2xhdGlvbnMoZmwpID8gZmwgOiB0aGlzLnNlcnZpY2VzLmxhbmd1YWdlVXRpbHMuZ2V0QmVzdE1hdGNoRnJvbUNvZGVzKGlzU3RyaW5nKGxuZ3MpID8gW2xuZ3NdIDogbG5ncyk7XG5cbiAgICAgIGlmIChsKSB7XG4gICAgICAgIGlmICghdGhpcy5sYW5ndWFnZSkge1xuICAgICAgICAgIHNldExuZ1Byb3BzKGwpO1xuICAgICAgICB9XG4gICAgICAgIGlmICghdGhpcy50cmFuc2xhdG9yLmxhbmd1YWdlKSB0aGlzLnRyYW5zbGF0b3IuY2hhbmdlTGFuZ3VhZ2UobCk7XG5cbiAgICAgICAgdGhpcy5zZXJ2aWNlcy5sYW5ndWFnZURldGVjdG9yPy5jYWNoZVVzZXJMYW5ndWFnZT8uKGwpO1xuICAgICAgfVxuXG4gICAgICB0aGlzLmxvYWRSZXNvdXJjZXMobCwgZXJyID0+IHtcbiAgICAgICAgZG9uZShlcnIsIGwpO1xuICAgICAgfSk7XG4gICAgfTtcblxuICAgIGlmICghbG5nICYmIHRoaXMuc2VydmljZXMubGFuZ3VhZ2VEZXRlY3RvciAmJiAhdGhpcy5zZXJ2aWNlcy5sYW5ndWFnZURldGVjdG9yLmFzeW5jKSB7XG4gICAgICBzZXRMbmcodGhpcy5zZXJ2aWNlcy5sYW5ndWFnZURldGVjdG9yLmRldGVjdCgpKTtcbiAgICB9IGVsc2UgaWYgKCFsbmcgJiYgdGhpcy5zZXJ2aWNlcy5sYW5ndWFnZURldGVjdG9yICYmIHRoaXMuc2VydmljZXMubGFuZ3VhZ2VEZXRlY3Rvci5hc3luYykge1xuICAgICAgaWYgKHRoaXMuc2VydmljZXMubGFuZ3VhZ2VEZXRlY3Rvci5kZXRlY3QubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHRoaXMuc2VydmljZXMubGFuZ3VhZ2VEZXRlY3Rvci5kZXRlY3QoKS50aGVuKHNldExuZyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLnNlcnZpY2VzLmxhbmd1YWdlRGV0ZWN0b3IuZGV0ZWN0KHNldExuZyk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHNldExuZyhsbmcpO1xuICAgIH1cblxuICAgIHJldHVybiBkZWZlcnJlZDtcbiAgfVxuXG4gIGdldEZpeGVkVChsbmcsIG5zLCBrZXlQcmVmaXgpIHtcbiAgICBjb25zdCBmaXhlZFQgPSAoa2V5LCBvcHRzLCAuLi5yZXN0KSA9PiB7XG4gICAgICBsZXQgbztcbiAgICAgIGlmICh0eXBlb2Ygb3B0cyAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgbyA9IHRoaXMub3B0aW9ucy5vdmVybG9hZFRyYW5zbGF0aW9uT3B0aW9uSGFuZGxlcihba2V5LCBvcHRzXS5jb25jYXQocmVzdCkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbyA9IHsgLi4ub3B0cyB9O1xuICAgICAgfVxuXG4gICAgICBvLmxuZyA9IG8ubG5nIHx8IGZpeGVkVC5sbmc7XG4gICAgICBvLmxuZ3MgPSBvLmxuZ3MgfHwgZml4ZWRULmxuZ3M7XG4gICAgICBvLm5zID0gby5ucyB8fCBmaXhlZFQubnM7XG4gICAgICBpZiAoby5rZXlQcmVmaXggIT09ICcnKSBvLmtleVByZWZpeCA9IG8ua2V5UHJlZml4IHx8IGtleVByZWZpeCB8fCBmaXhlZFQua2V5UHJlZml4O1xuXG4gICAgICBjb25zdCBrZXlTZXBhcmF0b3IgPSB0aGlzLm9wdGlvbnMua2V5U2VwYXJhdG9yIHx8ICcuJztcbiAgICAgIGxldCByZXN1bHRLZXlcbiAgICAgIGlmIChvLmtleVByZWZpeCAmJiBBcnJheS5pc0FycmF5KGtleSkpIHtcbiAgICAgICAgcmVzdWx0S2V5ID0ga2V5Lm1hcChrID0+IGAke28ua2V5UHJlZml4fSR7a2V5U2VwYXJhdG9yfSR7a31gKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlc3VsdEtleSA9IG8ua2V5UHJlZml4ID8gYCR7by5rZXlQcmVmaXh9JHtrZXlTZXBhcmF0b3J9JHtrZXl9YCA6IGtleTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzLnQocmVzdWx0S2V5LCBvKTtcbiAgICB9O1xuICAgIGlmIChpc1N0cmluZyhsbmcpKSB7XG4gICAgICBmaXhlZFQubG5nID0gbG5nO1xuICAgIH0gZWxzZSB7XG4gICAgICBmaXhlZFQubG5ncyA9IGxuZztcbiAgICB9XG4gICAgZml4ZWRULm5zID0gbnM7XG4gICAgZml4ZWRULmtleVByZWZpeCA9IGtleVByZWZpeDtcbiAgICByZXR1cm4gZml4ZWRUO1xuICB9XG5cbiAgdCguLi5hcmdzKSB7XG4gICAgcmV0dXJuIHRoaXMudHJhbnNsYXRvcj8udHJhbnNsYXRlKC4uLmFyZ3MpO1xuICB9XG5cbiAgZXhpc3RzKC4uLmFyZ3MpIHtcbiAgICByZXR1cm4gdGhpcy50cmFuc2xhdG9yPy5leGlzdHMoLi4uYXJncyk7XG4gIH1cblxuICBzZXREZWZhdWx0TmFtZXNwYWNlKG5zKSB7XG4gICAgdGhpcy5vcHRpb25zLmRlZmF1bHROUyA9IG5zO1xuICB9XG5cbiAgaGFzTG9hZGVkTmFtZXNwYWNlKG5zLCBvcHRpb25zID0ge30pIHtcbiAgICBpZiAoIXRoaXMuaXNJbml0aWFsaXplZCkge1xuICAgICAgdGhpcy5sb2dnZXIud2FybignaGFzTG9hZGVkTmFtZXNwYWNlOiBpMThuZXh0IHdhcyBub3QgaW5pdGlhbGl6ZWQnLCB0aGlzLmxhbmd1YWdlcyk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGlmICghdGhpcy5sYW5ndWFnZXMgfHwgIXRoaXMubGFuZ3VhZ2VzLmxlbmd0aCkge1xuICAgICAgdGhpcy5sb2dnZXIud2FybignaGFzTG9hZGVkTmFtZXNwYWNlOiBpMThuLmxhbmd1YWdlcyB3ZXJlIHVuZGVmaW5lZCBvciBlbXB0eScsIHRoaXMubGFuZ3VhZ2VzKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBjb25zdCBsbmcgPSBvcHRpb25zLmxuZyB8fCB0aGlzLnJlc29sdmVkTGFuZ3VhZ2UgfHwgdGhpcy5sYW5ndWFnZXNbMF07XG4gICAgY29uc3QgZmFsbGJhY2tMbmcgPSB0aGlzLm9wdGlvbnMgPyB0aGlzLm9wdGlvbnMuZmFsbGJhY2tMbmcgOiBmYWxzZTtcbiAgICBjb25zdCBsYXN0TG5nID0gdGhpcy5sYW5ndWFnZXNbdGhpcy5sYW5ndWFnZXMubGVuZ3RoIC0gMV07XG5cbiAgICAvLyB3ZSdyZSBpbiBjaW1vZGUgc28gdGhpcyBzaGFsbCBwYXNzXG4gICAgaWYgKGxuZy50b0xvd2VyQ2FzZSgpID09PSAnY2ltb2RlJykgcmV0dXJuIHRydWU7XG5cbiAgICBjb25zdCBsb2FkTm90UGVuZGluZyA9IChsLCBuKSA9PiB7XG4gICAgICBjb25zdCBsb2FkU3RhdGUgPSB0aGlzLnNlcnZpY2VzLmJhY2tlbmRDb25uZWN0b3Iuc3RhdGVbYCR7bH18JHtufWBdO1xuICAgICAgcmV0dXJuIGxvYWRTdGF0ZSA9PT0gLTEgfHwgbG9hZFN0YXRlID09PSAwIHx8IGxvYWRTdGF0ZSA9PT0gMjtcbiAgICB9O1xuXG4gICAgLy8gb3B0aW9uYWwgaW5qZWN0ZWQgY2hlY2tcbiAgICBpZiAob3B0aW9ucy5wcmVjaGVjaykge1xuICAgICAgY29uc3QgcHJlUmVzdWx0ID0gb3B0aW9ucy5wcmVjaGVjayh0aGlzLCBsb2FkTm90UGVuZGluZyk7XG4gICAgICBpZiAocHJlUmVzdWx0ICE9PSB1bmRlZmluZWQpIHJldHVybiBwcmVSZXN1bHQ7XG4gICAgfVxuXG4gICAgLy8gbG9hZGVkIC0+IFNVQ0NFU1NcbiAgICBpZiAodGhpcy5oYXNSZXNvdXJjZUJ1bmRsZShsbmcsIG5zKSkgcmV0dXJuIHRydWU7XG5cbiAgICAvLyB3ZXJlIG5vdCBsb2FkaW5nIGF0IGFsbCAtPiBTRU1JIFNVQ0NFU1NcbiAgICBpZiAoIXRoaXMuc2VydmljZXMuYmFja2VuZENvbm5lY3Rvci5iYWNrZW5kIHx8ICh0aGlzLm9wdGlvbnMucmVzb3VyY2VzICYmICF0aGlzLm9wdGlvbnMucGFydGlhbEJ1bmRsZWRMYW5ndWFnZXMpKSByZXR1cm4gdHJ1ZTtcblxuICAgIC8vIGZhaWxlZCBsb2FkaW5nIG5zIC0gYnV0IGF0IGxlYXN0IGZhbGxiYWNrIGlzIG5vdCBwZW5kaW5nIC0+IFNFTUkgU1VDQ0VTU1xuICAgIGlmIChsb2FkTm90UGVuZGluZyhsbmcsIG5zKSAmJiAoIWZhbGxiYWNrTG5nIHx8IGxvYWROb3RQZW5kaW5nKGxhc3RMbmcsIG5zKSkpIHJldHVybiB0cnVlO1xuXG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgbG9hZE5hbWVzcGFjZXMobnMsIGNhbGxiYWNrKSB7XG4gICAgY29uc3QgZGVmZXJyZWQgPSBkZWZlcigpO1xuXG4gICAgaWYgKCF0aGlzLm9wdGlvbnMubnMpIHtcbiAgICAgIGlmIChjYWxsYmFjaykgY2FsbGJhY2soKTtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcbiAgICB9XG4gICAgaWYgKGlzU3RyaW5nKG5zKSkgbnMgPSBbbnNdO1xuXG4gICAgbnMuZm9yRWFjaChuID0+IHtcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMubnMuaW5kZXhPZihuKSA8IDApIHRoaXMub3B0aW9ucy5ucy5wdXNoKG4pO1xuICAgIH0pO1xuXG4gICAgdGhpcy5sb2FkUmVzb3VyY2VzKGVyciA9PiB7XG4gICAgICBkZWZlcnJlZC5yZXNvbHZlKCk7XG4gICAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrKGVycik7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gZGVmZXJyZWQ7XG4gIH1cblxuICBsb2FkTGFuZ3VhZ2VzKGxuZ3MsIGNhbGxiYWNrKSB7XG4gICAgY29uc3QgZGVmZXJyZWQgPSBkZWZlcigpO1xuXG4gICAgaWYgKGlzU3RyaW5nKGxuZ3MpKSBsbmdzID0gW2xuZ3NdO1xuICAgIGNvbnN0IHByZWxvYWRlZCA9IHRoaXMub3B0aW9ucy5wcmVsb2FkIHx8IFtdO1xuXG4gICAgY29uc3QgbmV3TG5ncyA9IGxuZ3MuZmlsdGVyKGxuZyA9PiBwcmVsb2FkZWQuaW5kZXhPZihsbmcpIDwgMCAmJiB0aGlzLnNlcnZpY2VzLmxhbmd1YWdlVXRpbHMuaXNTdXBwb3J0ZWRDb2RlKGxuZykpO1xuICAgIC8vIEV4aXQgZWFybHkgaWYgYWxsIGdpdmVuIGxhbmd1YWdlcyBhcmUgYWxyZWFkeSBwcmVsb2FkZWRcbiAgICBpZiAoIW5ld0xuZ3MubGVuZ3RoKSB7XG4gICAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrKCk7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgfVxuXG4gICAgdGhpcy5vcHRpb25zLnByZWxvYWQgPSBwcmVsb2FkZWQuY29uY2F0KG5ld0xuZ3MpO1xuICAgIHRoaXMubG9hZFJlc291cmNlcyhlcnIgPT4ge1xuICAgICAgZGVmZXJyZWQucmVzb2x2ZSgpO1xuICAgICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjayhlcnIpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIGRlZmVycmVkO1xuICB9XG5cbiAgZGlyKGxuZykge1xuICAgIGlmICghbG5nKSBsbmcgPSB0aGlzLnJlc29sdmVkTGFuZ3VhZ2UgfHwgKHRoaXMubGFuZ3VhZ2VzPy5sZW5ndGggPiAwID8gdGhpcy5sYW5ndWFnZXNbMF0gOiB0aGlzLmxhbmd1YWdlKTtcbiAgICBpZiAoIWxuZykgcmV0dXJuICdydGwnO1xuXG4gICAgY29uc3QgcnRsTG5ncyA9IFtcbiAgICAgICdhcicsXG4gICAgICAnc2h1JyxcbiAgICAgICdzcXInLFxuICAgICAgJ3NzaCcsXG4gICAgICAneGFhJyxcbiAgICAgICd5aGQnLFxuICAgICAgJ3l1ZCcsXG4gICAgICAnYWFvJyxcbiAgICAgICdhYmgnLFxuICAgICAgJ2FidicsXG4gICAgICAnYWNtJyxcbiAgICAgICdhY3EnLFxuICAgICAgJ2FjdycsXG4gICAgICAnYWN4JyxcbiAgICAgICdhY3knLFxuICAgICAgJ2FkZicsXG4gICAgICAnYWRzJyxcbiAgICAgICdhZWInLFxuICAgICAgJ2FlYycsXG4gICAgICAnYWZiJyxcbiAgICAgICdhanAnLFxuICAgICAgJ2FwYycsXG4gICAgICAnYXBkJyxcbiAgICAgICdhcmInLFxuICAgICAgJ2FycScsXG4gICAgICAnYXJzJyxcbiAgICAgICdhcnknLFxuICAgICAgJ2FyeicsXG4gICAgICAnYXV6JyxcbiAgICAgICdhdmwnLFxuICAgICAgJ2F5aCcsXG4gICAgICAnYXlsJyxcbiAgICAgICdheW4nLFxuICAgICAgJ2F5cCcsXG4gICAgICAnYmJ6JyxcbiAgICAgICdwZ2EnLFxuICAgICAgJ2hlJyxcbiAgICAgICdpdycsXG4gICAgICAncHMnLFxuICAgICAgJ3BidCcsXG4gICAgICAncGJ1JyxcbiAgICAgICdwc3QnLFxuICAgICAgJ3BycCcsXG4gICAgICAncHJkJyxcbiAgICAgICd1ZycsXG4gICAgICAndXInLFxuICAgICAgJ3lkZCcsXG4gICAgICAneWRzJyxcbiAgICAgICd5aWgnLFxuICAgICAgJ2ppJyxcbiAgICAgICd5aScsXG4gICAgICAnaGJvJyxcbiAgICAgICdtZW4nLFxuICAgICAgJ3htbicsXG4gICAgICAnZmEnLFxuICAgICAgJ2pwcicsXG4gICAgICAncGVvJyxcbiAgICAgICdwZXMnLFxuICAgICAgJ3BycycsXG4gICAgICAnZHYnLFxuICAgICAgJ3NhbScsXG4gICAgICAnY2tiJ1xuICAgIF07XG5cbiAgICBjb25zdCBsYW5ndWFnZVV0aWxzID0gdGhpcy5zZXJ2aWNlcz8ubGFuZ3VhZ2VVdGlscyB8fCBuZXcgTGFuZ3VhZ2VVdGlscyhnZXREZWZhdWx0cygpKSAvLyBmb3IgdW5pbml0aWFsaXplZCB1c2FnZVxuXG4gICAgcmV0dXJuIHJ0bExuZ3MuaW5kZXhPZihsYW5ndWFnZVV0aWxzLmdldExhbmd1YWdlUGFydEZyb21Db2RlKGxuZykpID4gLTEgfHwgbG5nLnRvTG93ZXJDYXNlKCkuaW5kZXhPZignLWFyYWInKSA+IDFcbiAgICAgID8gJ3J0bCdcbiAgICAgIDogJ2x0cic7XG4gIH1cblxuICBzdGF0aWMgY3JlYXRlSW5zdGFuY2Uob3B0aW9ucyA9IHt9LCBjYWxsYmFjaykgeyByZXR1cm4gbmV3IEkxOG4ob3B0aW9ucywgY2FsbGJhY2spIH1cblxuICBjbG9uZUluc3RhbmNlKG9wdGlvbnMgPSB7fSwgY2FsbGJhY2sgPSBub29wKSB7XG4gICAgY29uc3QgZm9ya1Jlc291cmNlU3RvcmUgPSBvcHRpb25zLmZvcmtSZXNvdXJjZVN0b3JlO1xuICAgIGlmIChmb3JrUmVzb3VyY2VTdG9yZSkgZGVsZXRlIG9wdGlvbnMuZm9ya1Jlc291cmNlU3RvcmU7XG4gICAgY29uc3QgbWVyZ2VkT3B0aW9ucyA9IHsgLi4udGhpcy5vcHRpb25zLCAuLi5vcHRpb25zLCAuLi57IGlzQ2xvbmU6IHRydWUgfSB9O1xuICAgIGNvbnN0IGNsb25lID0gbmV3IEkxOG4obWVyZ2VkT3B0aW9ucyk7XG4gICAgaWYgKChvcHRpb25zLmRlYnVnICE9PSB1bmRlZmluZWQgfHwgb3B0aW9ucy5wcmVmaXggIT09IHVuZGVmaW5lZCkpIHtcbiAgICAgIGNsb25lLmxvZ2dlciA9IGNsb25lLmxvZ2dlci5jbG9uZShvcHRpb25zKTtcbiAgICB9XG4gICAgY29uc3QgbWVtYmVyc1RvQ29weSA9IFsnc3RvcmUnLCAnc2VydmljZXMnLCAnbGFuZ3VhZ2UnXTtcbiAgICBtZW1iZXJzVG9Db3B5LmZvckVhY2gobSA9PiB7XG4gICAgICBjbG9uZVttXSA9IHRoaXNbbV07XG4gICAgfSk7XG4gICAgY2xvbmUuc2VydmljZXMgPSB7IC4uLnRoaXMuc2VydmljZXMgfTtcbiAgICBjbG9uZS5zZXJ2aWNlcy51dGlscyA9IHtcbiAgICAgIGhhc0xvYWRlZE5hbWVzcGFjZTogY2xvbmUuaGFzTG9hZGVkTmFtZXNwYWNlLmJpbmQoY2xvbmUpXG4gICAgfTtcbiAgICBpZiAoZm9ya1Jlc291cmNlU3RvcmUpIHtcbiAgICAgIC8vIGZhc3RlciB0aGFuIGNvbnN0IGNsb25lZERhdGEgPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KHRoaXMuc3RvcmUuZGF0YSkpXG4gICAgICBjb25zdCBjbG9uZWREYXRhID0gT2JqZWN0LmtleXModGhpcy5zdG9yZS5kYXRhKS5yZWR1Y2UoKHByZXYsIGwpID0+IHtcbiAgICAgICAgcHJldltsXSA9IHsgLi4udGhpcy5zdG9yZS5kYXRhW2xdIH07XG4gICAgICAgIHByZXZbbF0gPSBPYmplY3Qua2V5cyhwcmV2W2xdKS5yZWR1Y2UoKGFjYywgbikgPT4ge1xuICAgICAgICAgIGFjY1tuXSA9IHsgLi4ucHJldltsXVtuXSB9O1xuICAgICAgICAgIHJldHVybiBhY2M7XG4gICAgICAgIH0sIHByZXZbbF0pO1xuICAgICAgICByZXR1cm4gcHJldjtcbiAgICAgIH0sIHt9KTtcbiAgICAgIGNsb25lLnN0b3JlID0gbmV3IFJlc291cmNlU3RvcmUoY2xvbmVkRGF0YSwgbWVyZ2VkT3B0aW9ucyk7XG4gICAgICBjbG9uZS5zZXJ2aWNlcy5yZXNvdXJjZVN0b3JlID0gY2xvbmUuc3RvcmU7XG4gICAgfVxuICAgIGNsb25lLnRyYW5zbGF0b3IgPSBuZXcgVHJhbnNsYXRvcihjbG9uZS5zZXJ2aWNlcywgbWVyZ2VkT3B0aW9ucyk7XG4gICAgY2xvbmUudHJhbnNsYXRvci5vbignKicsIChldmVudCwgLi4uYXJncykgPT4ge1xuICAgICAgY2xvbmUuZW1pdChldmVudCwgLi4uYXJncyk7XG4gICAgfSk7XG4gICAgY2xvbmUuaW5pdChtZXJnZWRPcHRpb25zLCBjYWxsYmFjayk7XG4gICAgY2xvbmUudHJhbnNsYXRvci5vcHRpb25zID0gbWVyZ2VkT3B0aW9uczsgLy8gc3luYyBvcHRpb25zXG4gICAgY2xvbmUudHJhbnNsYXRvci5iYWNrZW5kQ29ubmVjdG9yLnNlcnZpY2VzLnV0aWxzID0ge1xuICAgICAgaGFzTG9hZGVkTmFtZXNwYWNlOiBjbG9uZS5oYXNMb2FkZWROYW1lc3BhY2UuYmluZChjbG9uZSlcbiAgICB9O1xuXG4gICAgcmV0dXJuIGNsb25lO1xuICB9XG5cbiAgdG9KU09OKCkge1xuICAgIHJldHVybiB7XG4gICAgICBvcHRpb25zOiB0aGlzLm9wdGlvbnMsXG4gICAgICBzdG9yZTogdGhpcy5zdG9yZSxcbiAgICAgIGxhbmd1YWdlOiB0aGlzLmxhbmd1YWdlLFxuICAgICAgbGFuZ3VhZ2VzOiB0aGlzLmxhbmd1YWdlcyxcbiAgICAgIHJlc29sdmVkTGFuZ3VhZ2U6IHRoaXMucmVzb2x2ZWRMYW5ndWFnZVxuICAgIH07XG4gIH1cbn1cblxuY29uc3QgaW5zdGFuY2UgPSBJMThuLmNyZWF0ZUluc3RhbmNlKCk7XG5pbnN0YW5jZS5jcmVhdGVJbnN0YW5jZSA9IEkxOG4uY3JlYXRlSW5zdGFuY2U7XG5cbmV4cG9ydCBkZWZhdWx0IGluc3RhbmNlO1xuIiwiaW1wb3J0IGkxOG5leHQgZnJvbSAnLi9pMThuZXh0LmpzJztcblxuZXhwb3J0IGRlZmF1bHQgaTE4bmV4dDtcblxuZXhwb3J0IGNvbnN0IGNyZWF0ZUluc3RhbmNlID0gaTE4bmV4dC5jcmVhdGVJbnN0YW5jZTtcblxuZXhwb3J0IGNvbnN0IGRpciA9IGkxOG5leHQuZGlyO1xuZXhwb3J0IGNvbnN0IGluaXQgPSBpMThuZXh0LmluaXQ7XG5leHBvcnQgY29uc3QgbG9hZFJlc291cmNlcyA9IGkxOG5leHQubG9hZFJlc291cmNlcztcbmV4cG9ydCBjb25zdCByZWxvYWRSZXNvdXJjZXMgPSBpMThuZXh0LnJlbG9hZFJlc291cmNlcztcbmV4cG9ydCBjb25zdCB1c2UgPSBpMThuZXh0LnVzZTtcbmV4cG9ydCBjb25zdCBjaGFuZ2VMYW5ndWFnZSA9IGkxOG5leHQuY2hhbmdlTGFuZ3VhZ2U7XG5leHBvcnQgY29uc3QgZ2V0Rml4ZWRUID0gaTE4bmV4dC5nZXRGaXhlZFQ7XG5leHBvcnQgY29uc3QgdCA9IGkxOG5leHQudDtcbmV4cG9ydCBjb25zdCBleGlzdHMgPSBpMThuZXh0LmV4aXN0cztcbmV4cG9ydCBjb25zdCBzZXREZWZhdWx0TmFtZXNwYWNlID0gaTE4bmV4dC5zZXREZWZhdWx0TmFtZXNwYWNlO1xuZXhwb3J0IGNvbnN0IGhhc0xvYWRlZE5hbWVzcGFjZSA9IGkxOG5leHQuaGFzTG9hZGVkTmFtZXNwYWNlO1xuZXhwb3J0IGNvbnN0IGxvYWROYW1lc3BhY2VzID0gaTE4bmV4dC5sb2FkTmFtZXNwYWNlcztcbmV4cG9ydCBjb25zdCBsb2FkTGFuZ3VhZ2VzID0gaTE4bmV4dC5sb2FkTGFuZ3VhZ2VzO1xuIiwiLyogZXNsaW50LWRpc2FibGVcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbmFtZXNwYWNlLFxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnksXG4gKi9cblxuaW1wb3J0IHtcbiAgICBkZWZhdWx0IGFzIGkxOG5leHQsXG4gICAgdHlwZSBpMThuIGFzIGkxOG5leHRJbnN0YW5jZSxcbiAgICB0eXBlIEZhbGxiYWNrTG5nT2JqTGlzdCBhcyBpMThuZXh0RmFsbGJhY2tMbmdPYmpMaXN0LFxuICAgIHR5cGUgRmFsbGJhY2tMbmcgYXMgaTE4bmV4dEZhbGxiYWNrTG5nLFxuICAgIHR5cGUgSW50ZXJwb2xhdGlvbk9wdGlvbnMgYXMgaTE4bmV4dEludGVycG9sYXRpb25PcHRpb25zLFxuICAgIHR5cGUgUmVhY3RPcHRpb25zIGFzIGkxOG5leHRSZWFjdE9wdGlvbnMsXG4gICAgdHlwZSBJbml0T3B0aW9ucyBhcyBpMThuZXh0SW5pdE9wdGlvbnMsXG4gICAgdHlwZSBUT3B0aW9uc0Jhc2UgYXMgaTE4bmV4dFRPcHRpb25zQmFzZSxcbiAgICB0eXBlIFRPcHRpb25zIGFzIGkxOG5leHRUT3B0aW9ucyxcbiAgICB0eXBlIEV4aXN0c0Z1bmN0aW9uIGFzIGkxOG5leHRFeGlzdHNGdW5jdGlvbixcbiAgICB0eXBlIFdpdGhUIGFzIGkxOG5leHRXaXRoVCxcbiAgICB0eXBlIFRGdW5jdGlvbiBhcyBpMThuZXh0VEZ1bmN0aW9uLFxuICAgIHR5cGUgUmVzb3VyY2UgYXMgaTE4bmV4dFJlc291cmNlLFxuICAgIHR5cGUgUmVzb3VyY2VMYW5ndWFnZSBhcyBpMThuZXh0UmVzb3VyY2VMYW5ndWFnZSxcbiAgICB0eXBlIFJlc291cmNlS2V5IGFzIGkxOG5leHRSZXNvdXJjZUtleSxcbiAgICB0eXBlIEludGVycG9sYXRvciBhcyBpMThuZXh0SW50ZXJwb2xhdG9yLFxuICAgIHR5cGUgUmVzb3VyY2VTdG9yZSBhcyBpMThuZXh0UmVzb3VyY2VTdG9yZSxcbiAgICB0eXBlIFNlcnZpY2VzIGFzIGkxOG5leHRTZXJ2aWNlcyxcbiAgICB0eXBlIE1vZHVsZSBhcyBpMThuZXh0TW9kdWxlLFxuICAgIHR5cGUgQ2FsbGJhY2tFcnJvciBhcyBpMThuZXh0Q2FsbGJhY2tFcnJvcixcbiAgICB0eXBlIFJlYWRDYWxsYmFjayBhcyBpMThuZXh0UmVhZENhbGxiYWNrLFxuICAgIHR5cGUgTXVsdGlSZWFkQ2FsbGJhY2sgYXMgaTE4bmV4dE11bHRpUmVhZENhbGxiYWNrLFxuICAgIHR5cGUgQmFja2VuZE1vZHVsZSBhcyBpMThuZXh0QmFja2VuZE1vZHVsZSxcbiAgICB0eXBlIExhbmd1YWdlRGV0ZWN0b3JNb2R1bGUgYXMgaTE4bmV4dExhbmd1YWdlRGV0ZWN0b3JNb2R1bGUsXG4gICAgdHlwZSBMYW5ndWFnZURldGVjdG9yQXN5bmNNb2R1bGUgYXMgaTE4bmV4dExhbmd1YWdlRGV0ZWN0b3JBc3luY01vZHVsZSxcbiAgICB0eXBlIFBvc3RQcm9jZXNzb3JNb2R1bGUgYXMgaTE4bmV4dFBvc3RQcm9jZXNzb3JNb2R1bGUsXG4gICAgdHlwZSBMb2dnZXJNb2R1bGUgYXMgaTE4bmV4dExvZ2dlck1vZHVsZSxcbiAgICB0eXBlIEkxOG5Gb3JtYXRNb2R1bGUgYXMgaTE4bmV4dEkxOG5Gb3JtYXRNb2R1bGUsXG4gICAgdHlwZSBUaGlyZFBhcnR5TW9kdWxlIGFzIGkxOG5leHRUaGlyZFBhcnR5TW9kdWxlLFxuICAgIHR5cGUgTW9kdWxlcyBhcyBpMThuZXh0TW9kdWxlcyxcbiAgICB0eXBlIE5ld2FibGUgYXMgaTE4bmV4dE5ld2FibGUsXG59IGZyb20gJ2kxOG5leHQnO1xuXG5jb25zdCBpMThuOiBpMThuLmkxOG4gPSBpMThuZXh0O1xuXG5kZWNsYXJlIG5hbWVzcGFjZSBpMThuIHtcbiAgICBleHBvcnQgdHlwZSBpMThuID0gaTE4bmV4dEluc3RhbmNlO1xuICAgIGV4cG9ydCB0eXBlIEZhbGxiYWNrTG5nT2JqTGlzdCA9IGkxOG5leHRGYWxsYmFja0xuZ09iakxpc3Q7XG4gICAgZXhwb3J0IHR5cGUgRmFsbGJhY2tMbmcgPSBpMThuZXh0RmFsbGJhY2tMbmc7XG4gICAgZXhwb3J0IHR5cGUgSW50ZXJwb2xhdGlvbk9wdGlvbnMgPSBpMThuZXh0SW50ZXJwb2xhdGlvbk9wdGlvbnM7XG4gICAgZXhwb3J0IHR5cGUgUmVhY3RPcHRpb25zID0gaTE4bmV4dFJlYWN0T3B0aW9ucztcbiAgICBleHBvcnQgdHlwZSBJbml0T3B0aW9ucyA9IGkxOG5leHRJbml0T3B0aW9ucztcbiAgICBleHBvcnQgdHlwZSBUT3B0aW9uc0Jhc2UgPSBpMThuZXh0VE9wdGlvbnNCYXNlO1xuICAgIGV4cG9ydCB0eXBlIFRPcHRpb25zPFQgZXh0ZW5kcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiA9IFJlY29yZDxzdHJpbmcsIGFueT4+ID0gaTE4bmV4dFRPcHRpb25zPFQ+O1xuICAgIGV4cG9ydCB0eXBlIEV4aXN0c0Z1bmN0aW9uPEsgZXh0ZW5kcyBzdHJpbmcgPSBzdHJpbmcsIFQgZXh0ZW5kcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiA9IFJlY29yZDxzdHJpbmcsIGFueT4+ID0gaTE4bmV4dEV4aXN0c0Z1bmN0aW9uPEssIFQ+O1xuICAgIGV4cG9ydCB0eXBlIFdpdGhUID0gaTE4bmV4dFdpdGhUO1xuICAgIGV4cG9ydCB0eXBlIFRGdW5jdGlvbiA9IGkxOG5leHRURnVuY3Rpb247XG4gICAgZXhwb3J0IHR5cGUgUmVzb3VyY2UgPSBpMThuZXh0UmVzb3VyY2U7XG4gICAgZXhwb3J0IHR5cGUgUmVzb3VyY2VMYW5ndWFnZSA9IGkxOG5leHRSZXNvdXJjZUxhbmd1YWdlO1xuICAgIGV4cG9ydCB0eXBlIFJlc291cmNlS2V5ID0gaTE4bmV4dFJlc291cmNlS2V5O1xuICAgIGV4cG9ydCB0eXBlIEludGVycG9sYXRvciA9IGkxOG5leHRJbnRlcnBvbGF0b3I7XG4gICAgZXhwb3J0IHR5cGUgUmVzb3VyY2VTdG9yZSA9IGkxOG5leHRSZXNvdXJjZVN0b3JlO1xuICAgIGV4cG9ydCB0eXBlIFNlcnZpY2VzID0gaTE4bmV4dFNlcnZpY2VzO1xuICAgIGV4cG9ydCB0eXBlIE1vZHVsZSA9IGkxOG5leHRNb2R1bGU7XG4gICAgZXhwb3J0IHR5cGUgQ2FsbGJhY2tFcnJvciA9IGkxOG5leHRDYWxsYmFja0Vycm9yO1xuICAgIGV4cG9ydCB0eXBlIFJlYWRDYWxsYmFjayA9IGkxOG5leHRSZWFkQ2FsbGJhY2s7XG4gICAgZXhwb3J0IHR5cGUgTXVsdGlSZWFkQ2FsbGJhY2sgPSBpMThuZXh0TXVsdGlSZWFkQ2FsbGJhY2s7XG4gICAgZXhwb3J0IHR5cGUgQmFja2VuZE1vZHVsZTxUID0gUmVjb3JkPHN0cmluZywgdW5rbm93bj4+ID0gaTE4bmV4dEJhY2tlbmRNb2R1bGU8VD47XG4gICAgZXhwb3J0IHR5cGUgTGFuZ3VhZ2VEZXRlY3Rvck1vZHVsZSA9IGkxOG5leHRMYW5ndWFnZURldGVjdG9yTW9kdWxlO1xuICAgIGV4cG9ydCB0eXBlIExhbmd1YWdlRGV0ZWN0b3JBc3luY01vZHVsZSA9IGkxOG5leHRMYW5ndWFnZURldGVjdG9yQXN5bmNNb2R1bGU7XG4gICAgZXhwb3J0IHR5cGUgUG9zdFByb2Nlc3Nvck1vZHVsZSA9IGkxOG5leHRQb3N0UHJvY2Vzc29yTW9kdWxlO1xuICAgIGV4cG9ydCB0eXBlIExvZ2dlck1vZHVsZSA9IGkxOG5leHRMb2dnZXJNb2R1bGU7XG4gICAgZXhwb3J0IHR5cGUgSTE4bkZvcm1hdE1vZHVsZSA9IGkxOG5leHRJMThuRm9ybWF0TW9kdWxlO1xuICAgIGV4cG9ydCB0eXBlIFRoaXJkUGFydHlNb2R1bGUgPSBpMThuZXh0VGhpcmRQYXJ0eU1vZHVsZTtcbiAgICBleHBvcnQgdHlwZSBNb2R1bGVzID0gaTE4bmV4dE1vZHVsZXM7XG4gICAgZXhwb3J0IHR5cGUgTmV3YWJsZTxUPiA9IGkxOG5leHROZXdhYmxlPFQ+O1xufVxuXG5leHBvcnQgeyBpMThuIH07XG4iXSwibmFtZXMiOlsidXRpbHNDb3B5IiwiZXNjYXBlIiwidXRpbHNFc2NhcGUiLCJnZXREZWZhdWx0cyIsIkxhbmd1YWdlVXRpbHMiLCJCYWNrZW5kQ29ubmVjdG9yIiwiaTE4bmV4dCJdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFBTyxNQUFNLFFBQVEsR0FBRyxDQUFDLEdBQUcsS0FBSyxPQUFPLEdBQUcsS0FBSyxRQUFROztBQUV4RDtBQUNPLE1BQU0sS0FBSyxHQUFHLE1BQU07QUFDM0IsRUFBRSxJQUFJLEdBQUc7QUFDVCxFQUFFLElBQUksR0FBRzs7QUFFVCxFQUFFLE1BQU0sT0FBTyxHQUFHLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLE1BQU0sS0FBSztBQUNuRCxJQUFJLEdBQUcsR0FBRyxPQUFPO0FBQ2pCLElBQUksR0FBRyxHQUFHLE1BQU07QUFDaEIsR0FBRyxDQUFDOztBQUVKLEVBQUUsT0FBTyxDQUFDLE9BQU8sR0FBRyxHQUFHO0FBQ3ZCLEVBQUUsT0FBTyxDQUFDLE1BQU0sR0FBRyxHQUFHOztBQUV0QixFQUFFLE9BQU8sT0FBTztBQUNoQixDQUFDOztBQUVNLE1BQU0sVUFBVSxHQUFHLENBQUMsTUFBTSxLQUFLO0FBQ3RDLEVBQUUsSUFBSSxNQUFNLElBQUksSUFBSSxFQUFFLE9BQU8sRUFBRTtBQUMvQjtBQUNBLEVBQUUsT0FBTyxFQUFFLEdBQUcsTUFBTTtBQUNwQixDQUFDOztBQUVNLE1BQU0sSUFBSSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEtBQUs7QUFDakMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxLQUFLO0FBQ25CLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDekIsR0FBRyxDQUFDO0FBQ0osQ0FBQzs7QUFFRDtBQUNBO0FBQ0EsTUFBTSx5QkFBeUIsR0FBRyxNQUFN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QU0sS0FBSztBQUNYLE1BQU0sS0FBSztBQUNYLE1BQU0sS0FBSztBQUNYLE1BQU0sS0FBSztBQUNYLE1BQU0sS0FBSztBQUNYLE1BQU0sS0FBSztBQUNYLE1BQU0sS0FBSztBQUNYLE1BQU0sS0FBSztBQUNYLE1BQU0sS0FBSztBQUNYLE1BQU0sS0FBSztBQUNYLE1BQU0sS0FBSztBQUNYLE1BQU0sS0FBSztBQUNYLE1BQU0sS0FBSztBQUNYLE1BQU0sS0FBSztBQUNYLE1BQU0sS0FBSztBQUNYLE1BQU0sS0FBSztBQUNYLE1BQU0sS0FBSztBQUNYLE1BQU0sS0FBSztBQUNYLE1BQU0sSUFBSTtBQUNWLE1BQU0sSUFBSTtBQUNWLE1BQU0sSUFBSTtBQUNWLE1BQU0sS0FBSztBQUNYLE1BQU0sS0FBSztBQUNYLE1BQU0sS0FBSztBQUNYLE1BQU0sS0FBSztBQUNYLE1BQU0sS0FBSztBQUNYLE1BQU0sSUFBSTtBQUNWLE1BQU0sSUFBSTtBQUNWLE1BQU0sS0FBSztBQUNYLE1BQU0sS0FBSztBQUNYLE1BQU0sS0FBSztBQUNYLE1BQU0sSUFBSTtBQUNWLE1BQU0sSUFBSTtBQUNWLE1BQU0sS0FBSztBQUNYLE1BQU0sS0FBSztBQUNYLE1BQU0sS0FBSztBQUNYLE1BQU0sSUFBSTtBQUNWLE1BQU0sS0FBSztBQUNYLE1BQU0sS0FBSztBQUNYLE1BQU0sS0FBSztBQUNYLE1BQU0sS0FBSztBQUNYLE1BQU0sSUFBSTtBQUNWLE1BQU0sS0FBSztBQUNYLE1BQU07QUFDTixLQUFLOztBQUVMLElBQUksTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLFFBQVEsRUFBRSxhQUFhLElBQUksSUFBSUQsWUFBYSxDQUFDRCxHQUFXLEVBQUUsRUFBQzs7QUFFMUYsSUFBSSxPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLHVCQUF1QixDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxJQUFJLEdBQUcsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUc7QUFDcEgsUUFBUTtBQUNS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