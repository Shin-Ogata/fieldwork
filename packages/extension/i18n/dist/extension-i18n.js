/*!
 * @cdp/extension-i18n 0.9.19
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

    exists(key, options = { interpolation: {} }) {
      if (key == null) {
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
      if (keys == null /* || keys === '' */) return '';
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

      const noObject = ['[object Number]', '[object Function]', '[object RegExp]'];
      const joinArrays =
        options.joinArrays !== undefined ? options.joinArrays : this.options.joinArrays;

      // object
      const handleAsObjectInI18nFormat = !this.i18nFormat || this.i18nFormat.handleAsObject;
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
        if (!options.returnObjects && !this.options.returnObjects) {
          if (!this.options.returnedObjectHandler) {
            this.logger.warn('accessing an object - but returnObjects options is not enabled!');
          }
          const r = this.options.returnedObjectHandler
            ? this.options.returnedObjectHandler(resUsedKey, resForObjHndl, {
                ...options,
                ns: namespaces,
              })
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
          const resTypeIsArray = Array.isArray(resForObjHndl);
          const copy = resTypeIsArray ? [] : {}; // apply child translation on a copy

          /* eslint no-restricted-syntax: 0 */
          const newKeyToUse = resTypeIsArray ? resExactUsedKey : resUsedKey;
          for (const m in resForObjHndl) {
            if (Object.prototype.hasOwnProperty.call(resForObjHndl, m)) {
              const deepKey = `${newKeyToUse}${keySeparator}${m}`;
              if (hasDefaultValue && !res) {
                copy[m] = this.translate(deepKey, {
                  ...options,
                  defaultValue: shouldHandleAsObject(defaultValue) ? defaultValue[m] : undefined,
                  ...{ joinArrays: false, ns: namespaces },
                });
              } else {
                copy[m] = this.translate(deepKey, {
                  ...options,
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
        if (res) res = this.extendTranslation(res, keys, options, lastKey);
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

      if (res != null && postProcessorNames?.length && options.applyPostProcessor !== false) {
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
        // faster than const clonedData = JSON.parse(JSON.stringify(this.store.data))
        const clonedData = Object.keys(this.store.data).reduce((prev, l) => {
          prev[l] = { ...this.store.data[l] };
          return Object.keys(prev[l]).reduce((acc, n) => {
            acc[n] = { ...prev[l][n] };
            return acc;
          }, {});
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

  exports.i18n = i18n;

  Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uLWkxOG4uanMiLCJzb3VyY2VzIjpbImkxOG5leHQvc3JjL3V0aWxzLmpzIiwiaTE4bmV4dC9zcmMvbG9nZ2VyLmpzIiwiaTE4bmV4dC9zcmMvRXZlbnRFbWl0dGVyLmpzIiwiaTE4bmV4dC9zcmMvUmVzb3VyY2VTdG9yZS5qcyIsImkxOG5leHQvc3JjL3Bvc3RQcm9jZXNzb3IuanMiLCJpMThuZXh0L3NyYy9UcmFuc2xhdG9yLmpzIiwiaTE4bmV4dC9zcmMvTGFuZ3VhZ2VVdGlscy5qcyIsImkxOG5leHQvc3JjL1BsdXJhbFJlc29sdmVyLmpzIiwiaTE4bmV4dC9zcmMvSW50ZXJwb2xhdG9yLmpzIiwiaTE4bmV4dC9zcmMvRm9ybWF0dGVyLmpzIiwiaTE4bmV4dC9zcmMvQmFja2VuZENvbm5lY3Rvci5qcyIsImkxOG5leHQvc3JjL2RlZmF1bHRzLmpzIiwiaTE4bmV4dC9zcmMvaTE4bmV4dC5qcyIsImkxOG5leHQvc3JjL2luZGV4LmpzIiwiaW5kZXgudHMiXSwic291cmNlc0NvbnRlbnQiOlsiZXhwb3J0IGNvbnN0IGlzU3RyaW5nID0gKG9iaikgPT4gdHlwZW9mIG9iaiA9PT0gJ3N0cmluZyc7XG5cbi8vIGh0dHA6Ly9sZWEudmVyb3UubWUvMjAxNi8xMi9yZXNvbHZlLXByb21pc2VzLWV4dGVybmFsbHktd2l0aC10aGlzLW9uZS13ZWlyZC10cmljay9cbmV4cG9ydCBjb25zdCBkZWZlciA9ICgpID0+IHtcbiAgbGV0IHJlcztcbiAgbGV0IHJlajtcblxuICBjb25zdCBwcm9taXNlID0gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIHJlcyA9IHJlc29sdmU7XG4gICAgcmVqID0gcmVqZWN0O1xuICB9KTtcblxuICBwcm9taXNlLnJlc29sdmUgPSByZXM7XG4gIHByb21pc2UucmVqZWN0ID0gcmVqO1xuXG4gIHJldHVybiBwcm9taXNlO1xufTtcblxuZXhwb3J0IGNvbnN0IG1ha2VTdHJpbmcgPSAob2JqZWN0KSA9PiB7XG4gIGlmIChvYmplY3QgPT0gbnVsbCkgcmV0dXJuICcnO1xuICAvKiBlc2xpbnQgcHJlZmVyLXRlbXBsYXRlOiAwICovXG4gIHJldHVybiAnJyArIG9iamVjdDtcbn07XG5cbmV4cG9ydCBjb25zdCBjb3B5ID0gKGEsIHMsIHQpID0+IHtcbiAgYS5mb3JFYWNoKChtKSA9PiB7XG4gICAgaWYgKHNbbV0pIHRbbV0gPSBzW21dO1xuICB9KTtcbn07XG5cbi8vIFdlIGV4dHJhY3Qgb3V0IHRoZSBSZWdFeHAgZGVmaW5pdGlvbiB0byBpbXByb3ZlIHBlcmZvcm1hbmNlIHdpdGggUmVhY3QgTmF0aXZlIEFuZHJvaWQsIHdoaWNoIGhhcyBwb29yIFJlZ0V4cFxuLy8gaW5pdGlhbGl6YXRpb24gcGVyZm9ybWFuY2VcbmNvbnN0IGxhc3RPZlBhdGhTZXBhcmF0b3JSZWdFeHAgPSAvIyMjL2c7XG5cbmNvbnN0IGNsZWFuS2V5ID0gKGtleSkgPT5cbiAga2V5ICYmIGtleS5pbmRleE9mKCcjIyMnKSA+IC0xID8ga2V5LnJlcGxhY2UobGFzdE9mUGF0aFNlcGFyYXRvclJlZ0V4cCwgJy4nKSA6IGtleTtcblxuY29uc3QgY2FuTm90VHJhdmVyc2VEZWVwZXIgPSAob2JqZWN0KSA9PiAhb2JqZWN0IHx8IGlzU3RyaW5nKG9iamVjdCk7XG5cbmNvbnN0IGdldExhc3RPZlBhdGggPSAob2JqZWN0LCBwYXRoLCBFbXB0eSkgPT4ge1xuICBjb25zdCBzdGFjayA9ICFpc1N0cmluZyhwYXRoKSA/IHBhdGggOiBwYXRoLnNwbGl0KCcuJyk7XG4gIGxldCBzdGFja0luZGV4ID0gMDtcbiAgLy8gaXRlcmF0ZSB0aHJvdWdoIHRoZSBzdGFjaywgYnV0IGxlYXZlIHRoZSBsYXN0IGl0ZW1cbiAgd2hpbGUgKHN0YWNrSW5kZXggPCBzdGFjay5sZW5ndGggLSAxKSB7XG4gICAgaWYgKGNhbk5vdFRyYXZlcnNlRGVlcGVyKG9iamVjdCkpIHJldHVybiB7fTtcblxuICAgIGNvbnN0IGtleSA9IGNsZWFuS2V5KHN0YWNrW3N0YWNrSW5kZXhdKTtcbiAgICBpZiAoIW9iamVjdFtrZXldICYmIEVtcHR5KSBvYmplY3Rba2V5XSA9IG5ldyBFbXB0eSgpO1xuICAgIC8vIHByZXZlbnQgcHJvdG90eXBlIHBvbGx1dGlvblxuICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqZWN0LCBrZXkpKSB7XG4gICAgICBvYmplY3QgPSBvYmplY3Rba2V5XTtcbiAgICB9IGVsc2Uge1xuICAgICAgb2JqZWN0ID0ge307XG4gICAgfVxuICAgICsrc3RhY2tJbmRleDtcbiAgfVxuXG4gIGlmIChjYW5Ob3RUcmF2ZXJzZURlZXBlcihvYmplY3QpKSByZXR1cm4ge307XG4gIHJldHVybiB7XG4gICAgb2JqOiBvYmplY3QsXG4gICAgazogY2xlYW5LZXkoc3RhY2tbc3RhY2tJbmRleF0pLFxuICB9O1xufTtcblxuZXhwb3J0IGNvbnN0IHNldFBhdGggPSAob2JqZWN0LCBwYXRoLCBuZXdWYWx1ZSkgPT4ge1xuICBjb25zdCB7IG9iaiwgayB9ID0gZ2V0TGFzdE9mUGF0aChvYmplY3QsIHBhdGgsIE9iamVjdCk7XG4gIGlmIChvYmogIT09IHVuZGVmaW5lZCB8fCBwYXRoLmxlbmd0aCA9PT0gMSkge1xuICAgIG9ialtrXSA9IG5ld1ZhbHVlO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGxldCBlID0gcGF0aFtwYXRoLmxlbmd0aCAtIDFdO1xuICBsZXQgcCA9IHBhdGguc2xpY2UoMCwgcGF0aC5sZW5ndGggLSAxKTtcbiAgbGV0IGxhc3QgPSBnZXRMYXN0T2ZQYXRoKG9iamVjdCwgcCwgT2JqZWN0KTtcbiAgd2hpbGUgKGxhc3Qub2JqID09PSB1bmRlZmluZWQgJiYgcC5sZW5ndGgpIHtcbiAgICBlID0gYCR7cFtwLmxlbmd0aCAtIDFdfS4ke2V9YDtcbiAgICBwID0gcC5zbGljZSgwLCBwLmxlbmd0aCAtIDEpO1xuICAgIGxhc3QgPSBnZXRMYXN0T2ZQYXRoKG9iamVjdCwgcCwgT2JqZWN0KTtcbiAgICBpZiAobGFzdD8ub2JqICYmIHR5cGVvZiBsYXN0Lm9ialtgJHtsYXN0Lmt9LiR7ZX1gXSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIGxhc3Qub2JqID0gdW5kZWZpbmVkO1xuICAgIH1cbiAgfVxuICBsYXN0Lm9ialtgJHtsYXN0Lmt9LiR7ZX1gXSA9IG5ld1ZhbHVlO1xufTtcblxuZXhwb3J0IGNvbnN0IHB1c2hQYXRoID0gKG9iamVjdCwgcGF0aCwgbmV3VmFsdWUsIGNvbmNhdCkgPT4ge1xuICBjb25zdCB7IG9iaiwgayB9ID0gZ2V0TGFzdE9mUGF0aChvYmplY3QsIHBhdGgsIE9iamVjdCk7XG5cbiAgb2JqW2tdID0gb2JqW2tdIHx8IFtdO1xuICBpZiAoY29uY2F0KSBvYmpba10gPSBvYmpba10uY29uY2F0KG5ld1ZhbHVlKTtcbiAgaWYgKCFjb25jYXQpIG9ialtrXS5wdXNoKG5ld1ZhbHVlKTtcbn07XG5cbmV4cG9ydCBjb25zdCBnZXRQYXRoID0gKG9iamVjdCwgcGF0aCkgPT4ge1xuICBjb25zdCB7IG9iaiwgayB9ID0gZ2V0TGFzdE9mUGF0aChvYmplY3QsIHBhdGgpO1xuXG4gIGlmICghb2JqKSByZXR1cm4gdW5kZWZpbmVkO1xuICBpZiAoIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIGspKSByZXR1cm4gdW5kZWZpbmVkO1xuICByZXR1cm4gb2JqW2tdO1xufTtcblxuZXhwb3J0IGNvbnN0IGdldFBhdGhXaXRoRGVmYXVsdHMgPSAoZGF0YSwgZGVmYXVsdERhdGEsIGtleSkgPT4ge1xuICBjb25zdCB2YWx1ZSA9IGdldFBhdGgoZGF0YSwga2V5KTtcbiAgaWYgKHZhbHVlICE9PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cbiAgLy8gRmFsbGJhY2sgdG8gZGVmYXVsdCB2YWx1ZXNcbiAgcmV0dXJuIGdldFBhdGgoZGVmYXVsdERhdGEsIGtleSk7XG59O1xuXG5leHBvcnQgY29uc3QgZGVlcEV4dGVuZCA9ICh0YXJnZXQsIHNvdXJjZSwgb3ZlcndyaXRlKSA9PiB7XG4gIC8qIGVzbGludCBuby1yZXN0cmljdGVkLXN5bnRheDogMCAqL1xuICBmb3IgKGNvbnN0IHByb3AgaW4gc291cmNlKSB7XG4gICAgaWYgKHByb3AgIT09ICdfX3Byb3RvX18nICYmIHByb3AgIT09ICdjb25zdHJ1Y3RvcicpIHtcbiAgICAgIGlmIChwcm9wIGluIHRhcmdldCkge1xuICAgICAgICAvLyBJZiB3ZSByZWFjaGVkIGEgbGVhZiBzdHJpbmcgaW4gdGFyZ2V0IG9yIHNvdXJjZSB0aGVuIHJlcGxhY2Ugd2l0aCBzb3VyY2Ugb3Igc2tpcCBkZXBlbmRpbmcgb24gdGhlICdvdmVyd3JpdGUnIHN3aXRjaFxuICAgICAgICBpZiAoXG4gICAgICAgICAgaXNTdHJpbmcodGFyZ2V0W3Byb3BdKSB8fFxuICAgICAgICAgIHRhcmdldFtwcm9wXSBpbnN0YW5jZW9mIFN0cmluZyB8fFxuICAgICAgICAgIGlzU3RyaW5nKHNvdXJjZVtwcm9wXSkgfHxcbiAgICAgICAgICBzb3VyY2VbcHJvcF0gaW5zdGFuY2VvZiBTdHJpbmdcbiAgICAgICAgKSB7XG4gICAgICAgICAgaWYgKG92ZXJ3cml0ZSkgdGFyZ2V0W3Byb3BdID0gc291cmNlW3Byb3BdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGRlZXBFeHRlbmQodGFyZ2V0W3Byb3BdLCBzb3VyY2VbcHJvcF0sIG92ZXJ3cml0ZSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRhcmdldFtwcm9wXSA9IHNvdXJjZVtwcm9wXTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIHRhcmdldDtcbn07XG5cbmV4cG9ydCBjb25zdCByZWdleEVzY2FwZSA9IChzdHIpID0+XG4gIC8qIGVzbGludCBuby11c2VsZXNzLWVzY2FwZTogMCAqL1xuICBzdHIucmVwbGFjZSgvW1xcLVxcW1xcXVxcL1xce1xcfVxcKFxcKVxcKlxcK1xcP1xcLlxcXFxcXF5cXCRcXHxdL2csICdcXFxcJCYnKTtcblxuLyogZXNsaW50LWRpc2FibGUgKi9cbnZhciBfZW50aXR5TWFwID0ge1xuICAnJic6ICcmYW1wOycsXG4gICc8JzogJyZsdDsnLFxuICAnPic6ICcmZ3Q7JyxcbiAgJ1wiJzogJyZxdW90OycsXG4gIFwiJ1wiOiAnJiMzOTsnLFxuICAnLyc6ICcmI3gyRjsnLFxufTtcbi8qIGVzbGludC1lbmFibGUgKi9cblxuZXhwb3J0IGNvbnN0IGVzY2FwZSA9IChkYXRhKSA9PiB7XG4gIGlmIChpc1N0cmluZyhkYXRhKSkge1xuICAgIHJldHVybiBkYXRhLnJlcGxhY2UoL1smPD5cIidcXC9dL2csIChzKSA9PiBfZW50aXR5TWFwW3NdKTtcbiAgfVxuXG4gIHJldHVybiBkYXRhO1xufTtcblxuLyoqXG4gKiBUaGlzIGlzIGEgcmV1c2FibGUgcmVndWxhciBleHByZXNzaW9uIGNhY2hlIGNsYXNzLiBHaXZlbiBhIGNlcnRhaW4gbWF4aW11bSBudW1iZXIgb2YgcmVndWxhciBleHByZXNzaW9ucyB3ZSdyZVxuICogYWxsb3dlZCB0byBzdG9yZSBpbiB0aGUgY2FjaGUsIGl0IHByb3ZpZGVzIGEgd2F5IHRvIGF2b2lkIHJlY3JlYXRpbmcgcmVndWxhciBleHByZXNzaW9uIG9iamVjdHMgb3ZlciBhbmQgb3Zlci5cbiAqIFdoZW4gaXQgbmVlZHMgdG8gZXZpY3Qgc29tZXRoaW5nLCBpdCBldmljdHMgdGhlIG9sZGVzdCBvbmUuXG4gKi9cbmNsYXNzIFJlZ0V4cENhY2hlIHtcbiAgY29uc3RydWN0b3IoY2FwYWNpdHkpIHtcbiAgICB0aGlzLmNhcGFjaXR5ID0gY2FwYWNpdHk7XG4gICAgdGhpcy5yZWdFeHBNYXAgPSBuZXcgTWFwKCk7XG4gICAgLy8gU2luY2Ugb3VyIGNhcGFjaXR5IHRlbmRzIHRvIGJlIGZhaXJseSBzbWFsbCwgYC5zaGlmdCgpYCB3aWxsIGJlIGZhaXJseSBxdWljayBkZXNwaXRlIGJlaW5nIE8obikuIFdlIGp1c3QgdXNlIGFcbiAgICAvLyBub3JtYWwgYXJyYXkgdG8ga2VlcCBpdCBzaW1wbGUuXG4gICAgdGhpcy5yZWdFeHBRdWV1ZSA9IFtdO1xuICB9XG5cbiAgZ2V0UmVnRXhwKHBhdHRlcm4pIHtcbiAgICBjb25zdCByZWdFeHBGcm9tQ2FjaGUgPSB0aGlzLnJlZ0V4cE1hcC5nZXQocGF0dGVybik7XG4gICAgaWYgKHJlZ0V4cEZyb21DYWNoZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gcmVnRXhwRnJvbUNhY2hlO1xuICAgIH1cbiAgICBjb25zdCByZWdFeHBOZXcgPSBuZXcgUmVnRXhwKHBhdHRlcm4pO1xuICAgIGlmICh0aGlzLnJlZ0V4cFF1ZXVlLmxlbmd0aCA9PT0gdGhpcy5jYXBhY2l0eSkge1xuICAgICAgdGhpcy5yZWdFeHBNYXAuZGVsZXRlKHRoaXMucmVnRXhwUXVldWUuc2hpZnQoKSk7XG4gICAgfVxuICAgIHRoaXMucmVnRXhwTWFwLnNldChwYXR0ZXJuLCByZWdFeHBOZXcpO1xuICAgIHRoaXMucmVnRXhwUXVldWUucHVzaChwYXR0ZXJuKTtcbiAgICByZXR1cm4gcmVnRXhwTmV3O1xuICB9XG59XG5cbmNvbnN0IGNoYXJzID0gWycgJywgJywnLCAnPycsICchJywgJzsnXTtcbi8vIFdlIGNhY2hlIFJlZ0V4cHMgdG8gaW1wcm92ZSBwZXJmb3JtYW5jZSB3aXRoIFJlYWN0IE5hdGl2ZSBBbmRyb2lkLCB3aGljaCBoYXMgcG9vciBSZWdFeHAgaW5pdGlhbGl6YXRpb24gcGVyZm9ybWFuY2UuXG4vLyBDYXBhY2l0eSBvZiAyMCBzaG91bGQgYmUgcGxlbnR5LCBhcyBuc1NlcGFyYXRvci9rZXlTZXBhcmF0b3IgZG9uJ3QgdGVuZCB0byB2YXJ5IG11Y2ggYWNyb3NzIGNhbGxzLlxuY29uc3QgbG9va3NMaWtlT2JqZWN0UGF0aFJlZ0V4cENhY2hlID0gbmV3IFJlZ0V4cENhY2hlKDIwKTtcblxuZXhwb3J0IGNvbnN0IGxvb2tzTGlrZU9iamVjdFBhdGggPSAoa2V5LCBuc1NlcGFyYXRvciwga2V5U2VwYXJhdG9yKSA9PiB7XG4gIG5zU2VwYXJhdG9yID0gbnNTZXBhcmF0b3IgfHwgJyc7XG4gIGtleVNlcGFyYXRvciA9IGtleVNlcGFyYXRvciB8fCAnJztcbiAgY29uc3QgcG9zc2libGVDaGFycyA9IGNoYXJzLmZpbHRlcihcbiAgICAoYykgPT4gbnNTZXBhcmF0b3IuaW5kZXhPZihjKSA8IDAgJiYga2V5U2VwYXJhdG9yLmluZGV4T2YoYykgPCAwLFxuICApO1xuICBpZiAocG9zc2libGVDaGFycy5sZW5ndGggPT09IDApIHJldHVybiB0cnVlO1xuICBjb25zdCByID0gbG9va3NMaWtlT2JqZWN0UGF0aFJlZ0V4cENhY2hlLmdldFJlZ0V4cChcbiAgICBgKCR7cG9zc2libGVDaGFycy5tYXAoKGMpID0+IChjID09PSAnPycgPyAnXFxcXD8nIDogYykpLmpvaW4oJ3wnKX0pYCxcbiAgKTtcbiAgbGV0IG1hdGNoZWQgPSAhci50ZXN0KGtleSk7XG4gIGlmICghbWF0Y2hlZCkge1xuICAgIGNvbnN0IGtpID0ga2V5LmluZGV4T2Yoa2V5U2VwYXJhdG9yKTtcbiAgICBpZiAoa2kgPiAwICYmICFyLnRlc3Qoa2V5LnN1YnN0cmluZygwLCBraSkpKSB7XG4gICAgICBtYXRjaGVkID0gdHJ1ZTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIG1hdGNoZWQ7XG59O1xuXG4vKipcbiAqIEdpdmVuXG4gKlxuICogMS4gYSB0b3AgbGV2ZWwgb2JqZWN0IG9iaiwgYW5kXG4gKiAyLiBhIHBhdGggdG8gYSBkZWVwbHkgbmVzdGVkIHN0cmluZyBvciBvYmplY3Qgd2l0aGluIGl0XG4gKlxuICogRmluZCBhbmQgcmV0dXJuIHRoYXQgZGVlcGx5IG5lc3RlZCBzdHJpbmcgb3Igb2JqZWN0LiBUaGUgY2F2ZWF0IGlzIHRoYXQgdGhlIGtleXMgb2Ygb2JqZWN0cyB3aXRoaW4gdGhlIG5lc3RpbmcgY2hhaW5cbiAqIG1heSBjb250YWluIHBlcmlvZCBjaGFyYWN0ZXJzLiBUaGVyZWZvcmUsIHdlIG5lZWQgdG8gREZTIGFuZCBleHBsb3JlIGFsbCBwb3NzaWJsZSBrZXlzIGF0IGVhY2ggc3RlcCB1bnRpbCB3ZSBmaW5kIHRoZVxuICogZGVlcGx5IG5lc3RlZCBzdHJpbmcgb3Igb2JqZWN0LlxuICovXG5leHBvcnQgY29uc3QgZGVlcEZpbmQgPSAob2JqLCBwYXRoLCBrZXlTZXBhcmF0b3IgPSAnLicpID0+IHtcbiAgaWYgKCFvYmopIHJldHVybiB1bmRlZmluZWQ7XG4gIGlmIChvYmpbcGF0aF0pIHtcbiAgICBpZiAoIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIHBhdGgpKSByZXR1cm4gdW5kZWZpbmVkO1xuICAgIHJldHVybiBvYmpbcGF0aF07XG4gIH1cbiAgY29uc3QgdG9rZW5zID0gcGF0aC5zcGxpdChrZXlTZXBhcmF0b3IpO1xuICBsZXQgY3VycmVudCA9IG9iajtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCB0b2tlbnMubGVuZ3RoOyApIHtcbiAgICBpZiAoIWN1cnJlbnQgfHwgdHlwZW9mIGN1cnJlbnQgIT09ICdvYmplY3QnKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBsZXQgbmV4dDtcbiAgICBsZXQgbmV4dFBhdGggPSAnJztcbiAgICBmb3IgKGxldCBqID0gaTsgaiA8IHRva2Vucy5sZW5ndGg7ICsraikge1xuICAgICAgaWYgKGogIT09IGkpIHtcbiAgICAgICAgbmV4dFBhdGggKz0ga2V5U2VwYXJhdG9yO1xuICAgICAgfVxuICAgICAgbmV4dFBhdGggKz0gdG9rZW5zW2pdO1xuICAgICAgbmV4dCA9IGN1cnJlbnRbbmV4dFBhdGhdO1xuICAgICAgaWYgKG5leHQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAoWydzdHJpbmcnLCAnbnVtYmVyJywgJ2Jvb2xlYW4nXS5pbmRleE9mKHR5cGVvZiBuZXh0KSA+IC0xICYmIGogPCB0b2tlbnMubGVuZ3RoIC0gMSkge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIGkgKz0gaiAtIGkgKyAxO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gICAgY3VycmVudCA9IG5leHQ7XG4gIH1cbiAgcmV0dXJuIGN1cnJlbnQ7XG59O1xuXG5leHBvcnQgY29uc3QgZ2V0Q2xlYW5lZENvZGUgPSAoY29kZSkgPT4gY29kZT8ucmVwbGFjZSgnXycsICctJyk7XG4iLCJpbXBvcnQgeyBpc1N0cmluZyB9IGZyb20gJy4vdXRpbHMuanMnO1xuXG5jb25zdCBjb25zb2xlTG9nZ2VyID0ge1xuICB0eXBlOiAnbG9nZ2VyJyxcblxuICBsb2coYXJncykge1xuICAgIHRoaXMub3V0cHV0KCdsb2cnLCBhcmdzKTtcbiAgfSxcblxuICB3YXJuKGFyZ3MpIHtcbiAgICB0aGlzLm91dHB1dCgnd2FybicsIGFyZ3MpO1xuICB9LFxuXG4gIGVycm9yKGFyZ3MpIHtcbiAgICB0aGlzLm91dHB1dCgnZXJyb3InLCBhcmdzKTtcbiAgfSxcblxuICBvdXRwdXQodHlwZSwgYXJncykge1xuICAgIC8qIGVzbGludCBuby1jb25zb2xlOiAwICovXG4gICAgY29uc29sZT8uW3R5cGVdPy5hcHBseT8uKGNvbnNvbGUsIGFyZ3MpO1xuICB9LFxufTtcblxuY2xhc3MgTG9nZ2VyIHtcbiAgY29uc3RydWN0b3IoY29uY3JldGVMb2dnZXIsIG9wdGlvbnMgPSB7fSkge1xuICAgIHRoaXMuaW5pdChjb25jcmV0ZUxvZ2dlciwgb3B0aW9ucyk7XG4gIH1cblxuICBpbml0KGNvbmNyZXRlTG9nZ2VyLCBvcHRpb25zID0ge30pIHtcbiAgICB0aGlzLnByZWZpeCA9IG9wdGlvbnMucHJlZml4IHx8ICdpMThuZXh0Oic7XG4gICAgdGhpcy5sb2dnZXIgPSBjb25jcmV0ZUxvZ2dlciB8fCBjb25zb2xlTG9nZ2VyO1xuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG4gICAgdGhpcy5kZWJ1ZyA9IG9wdGlvbnMuZGVidWc7XG4gIH1cblxuICBsb2coLi4uYXJncykge1xuICAgIHJldHVybiB0aGlzLmZvcndhcmQoYXJncywgJ2xvZycsICcnLCB0cnVlKTtcbiAgfVxuXG4gIHdhcm4oLi4uYXJncykge1xuICAgIHJldHVybiB0aGlzLmZvcndhcmQoYXJncywgJ3dhcm4nLCAnJywgdHJ1ZSk7XG4gIH1cblxuICBlcnJvciguLi5hcmdzKSB7XG4gICAgcmV0dXJuIHRoaXMuZm9yd2FyZChhcmdzLCAnZXJyb3InLCAnJyk7XG4gIH1cblxuICBkZXByZWNhdGUoLi4uYXJncykge1xuICAgIHJldHVybiB0aGlzLmZvcndhcmQoYXJncywgJ3dhcm4nLCAnV0FSTklORyBERVBSRUNBVEVEOiAnLCB0cnVlKTtcbiAgfVxuXG4gIGZvcndhcmQoYXJncywgbHZsLCBwcmVmaXgsIGRlYnVnT25seSkge1xuICAgIGlmIChkZWJ1Z09ubHkgJiYgIXRoaXMuZGVidWcpIHJldHVybiBudWxsO1xuICAgIGlmIChpc1N0cmluZyhhcmdzWzBdKSkgYXJnc1swXSA9IGAke3ByZWZpeH0ke3RoaXMucHJlZml4fSAke2FyZ3NbMF19YDtcbiAgICByZXR1cm4gdGhpcy5sb2dnZXJbbHZsXShhcmdzKTtcbiAgfVxuXG4gIGNyZWF0ZShtb2R1bGVOYW1lKSB7XG4gICAgcmV0dXJuIG5ldyBMb2dnZXIodGhpcy5sb2dnZXIsIHtcbiAgICAgIC4uLnsgcHJlZml4OiBgJHt0aGlzLnByZWZpeH06JHttb2R1bGVOYW1lfTpgIH0sXG4gICAgICAuLi50aGlzLm9wdGlvbnMsXG4gICAgfSk7XG4gIH1cblxuICBjbG9uZShvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwgdGhpcy5vcHRpb25zO1xuICAgIG9wdGlvbnMucHJlZml4ID0gb3B0aW9ucy5wcmVmaXggfHwgdGhpcy5wcmVmaXg7XG4gICAgcmV0dXJuIG5ldyBMb2dnZXIodGhpcy5sb2dnZXIsIG9wdGlvbnMpO1xuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IG5ldyBMb2dnZXIoKTtcbiIsImNsYXNzIEV2ZW50RW1pdHRlciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIC8vIFRoaXMgaXMgYW4gT2JqZWN0IGNvbnRhaW5pbmcgTWFwczpcbiAgICAvL1xuICAgIC8vIHsgW2V2ZW50OiBzdHJpbmddOiBNYXA8bGlzdGVuZXI6IGZ1bmN0aW9uLCBudW1UaW1lc0FkZGVkOiBudW1iZXI+IH1cbiAgICAvL1xuICAgIC8vIFdlIHVzZSBhIE1hcCBmb3IgTygxKSBpbnNlcnRpb24vZGVsZXRpb24gYW5kIGJlY2F1c2UgaXQgY2FuIGhhdmUgZnVuY3Rpb25zIGFzIGtleXMuXG4gICAgLy9cbiAgICAvLyBXZSBrZWVwIHRyYWNrIG9mIG51bVRpbWVzQWRkZWQgKHRoZSBudW1iZXIgb2YgdGltZXMgaXQgd2FzIGFkZGVkKSBiZWNhdXNlIGlmIHlvdSBhdHRhY2ggdGhlIHNhbWUgbGlzdGVuZXIgdHdpY2UsXG4gICAgLy8gd2Ugc2hvdWxkIGFjdHVhbGx5IGNhbGwgaXQgdHdpY2UgZm9yIGVhY2ggZW1pdHRlZCBldmVudC5cbiAgICB0aGlzLm9ic2VydmVycyA9IHt9O1xuICB9XG5cbiAgb24oZXZlbnRzLCBsaXN0ZW5lcikge1xuICAgIGV2ZW50cy5zcGxpdCgnICcpLmZvckVhY2goKGV2ZW50KSA9PiB7XG4gICAgICBpZiAoIXRoaXMub2JzZXJ2ZXJzW2V2ZW50XSkgdGhpcy5vYnNlcnZlcnNbZXZlbnRdID0gbmV3IE1hcCgpO1xuICAgICAgY29uc3QgbnVtTGlzdGVuZXJzID0gdGhpcy5vYnNlcnZlcnNbZXZlbnRdLmdldChsaXN0ZW5lcikgfHwgMDtcbiAgICAgIHRoaXMub2JzZXJ2ZXJzW2V2ZW50XS5zZXQobGlzdGVuZXIsIG51bUxpc3RlbmVycyArIDEpO1xuICAgIH0pO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgb2ZmKGV2ZW50LCBsaXN0ZW5lcikge1xuICAgIGlmICghdGhpcy5vYnNlcnZlcnNbZXZlbnRdKSByZXR1cm47XG4gICAgaWYgKCFsaXN0ZW5lcikge1xuICAgICAgZGVsZXRlIHRoaXMub2JzZXJ2ZXJzW2V2ZW50XTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLm9ic2VydmVyc1tldmVudF0uZGVsZXRlKGxpc3RlbmVyKTtcbiAgfVxuXG4gIGVtaXQoZXZlbnQsIC4uLmFyZ3MpIHtcbiAgICBpZiAodGhpcy5vYnNlcnZlcnNbZXZlbnRdKSB7XG4gICAgICBjb25zdCBjbG9uZWQgPSBBcnJheS5mcm9tKHRoaXMub2JzZXJ2ZXJzW2V2ZW50XS5lbnRyaWVzKCkpO1xuICAgICAgY2xvbmVkLmZvckVhY2goKFtvYnNlcnZlciwgbnVtVGltZXNBZGRlZF0pID0+IHtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBudW1UaW1lc0FkZGVkOyBpKyspIHtcbiAgICAgICAgICBvYnNlcnZlciguLi5hcmdzKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMub2JzZXJ2ZXJzWycqJ10pIHtcbiAgICAgIGNvbnN0IGNsb25lZCA9IEFycmF5LmZyb20odGhpcy5vYnNlcnZlcnNbJyonXS5lbnRyaWVzKCkpO1xuICAgICAgY2xvbmVkLmZvckVhY2goKFtvYnNlcnZlciwgbnVtVGltZXNBZGRlZF0pID0+IHtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBudW1UaW1lc0FkZGVkOyBpKyspIHtcbiAgICAgICAgICBvYnNlcnZlci5hcHBseShvYnNlcnZlciwgW2V2ZW50LCAuLi5hcmdzXSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBFdmVudEVtaXR0ZXI7XG4iLCJpbXBvcnQgRXZlbnRFbWl0dGVyIGZyb20gJy4vRXZlbnRFbWl0dGVyLmpzJztcbmltcG9ydCB7IGdldFBhdGgsIGRlZXBGaW5kLCBzZXRQYXRoLCBkZWVwRXh0ZW5kLCBpc1N0cmluZyB9IGZyb20gJy4vdXRpbHMuanMnO1xuXG5jbGFzcyBSZXNvdXJjZVN0b3JlIGV4dGVuZHMgRXZlbnRFbWl0dGVyIHtcbiAgY29uc3RydWN0b3IoZGF0YSwgb3B0aW9ucyA9IHsgbnM6IFsndHJhbnNsYXRpb24nXSwgZGVmYXVsdE5TOiAndHJhbnNsYXRpb24nIH0pIHtcbiAgICBzdXBlcigpO1xuXG4gICAgdGhpcy5kYXRhID0gZGF0YSB8fCB7fTtcbiAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuICAgIGlmICh0aGlzLm9wdGlvbnMua2V5U2VwYXJhdG9yID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMub3B0aW9ucy5rZXlTZXBhcmF0b3IgPSAnLic7XG4gICAgfVxuICAgIGlmICh0aGlzLm9wdGlvbnMuaWdub3JlSlNPTlN0cnVjdHVyZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzLm9wdGlvbnMuaWdub3JlSlNPTlN0cnVjdHVyZSA9IHRydWU7XG4gICAgfVxuICB9XG5cbiAgYWRkTmFtZXNwYWNlcyhucykge1xuICAgIGlmICh0aGlzLm9wdGlvbnMubnMuaW5kZXhPZihucykgPCAwKSB7XG4gICAgICB0aGlzLm9wdGlvbnMubnMucHVzaChucyk7XG4gICAgfVxuICB9XG5cbiAgcmVtb3ZlTmFtZXNwYWNlcyhucykge1xuICAgIGNvbnN0IGluZGV4ID0gdGhpcy5vcHRpb25zLm5zLmluZGV4T2YobnMpO1xuICAgIGlmIChpbmRleCA+IC0xKSB7XG4gICAgICB0aGlzLm9wdGlvbnMubnMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICB9XG4gIH1cblxuICBnZXRSZXNvdXJjZShsbmcsIG5zLCBrZXksIG9wdGlvbnMgPSB7fSkge1xuICAgIGNvbnN0IGtleVNlcGFyYXRvciA9XG4gICAgICBvcHRpb25zLmtleVNlcGFyYXRvciAhPT0gdW5kZWZpbmVkID8gb3B0aW9ucy5rZXlTZXBhcmF0b3IgOiB0aGlzLm9wdGlvbnMua2V5U2VwYXJhdG9yO1xuXG4gICAgY29uc3QgaWdub3JlSlNPTlN0cnVjdHVyZSA9XG4gICAgICBvcHRpb25zLmlnbm9yZUpTT05TdHJ1Y3R1cmUgIT09IHVuZGVmaW5lZFxuICAgICAgICA/IG9wdGlvbnMuaWdub3JlSlNPTlN0cnVjdHVyZVxuICAgICAgICA6IHRoaXMub3B0aW9ucy5pZ25vcmVKU09OU3RydWN0dXJlO1xuXG4gICAgbGV0IHBhdGg7XG4gICAgaWYgKGxuZy5pbmRleE9mKCcuJykgPiAtMSkge1xuICAgICAgcGF0aCA9IGxuZy5zcGxpdCgnLicpO1xuICAgIH0gZWxzZSB7XG4gICAgICBwYXRoID0gW2xuZywgbnNdO1xuICAgICAgaWYgKGtleSkge1xuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShrZXkpKSB7XG4gICAgICAgICAgcGF0aC5wdXNoKC4uLmtleSk7XG4gICAgICAgIH0gZWxzZSBpZiAoaXNTdHJpbmcoa2V5KSAmJiBrZXlTZXBhcmF0b3IpIHtcbiAgICAgICAgICBwYXRoLnB1c2goLi4ua2V5LnNwbGl0KGtleVNlcGFyYXRvcikpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHBhdGgucHVzaChrZXkpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgcmVzdWx0ID0gZ2V0UGF0aCh0aGlzLmRhdGEsIHBhdGgpO1xuICAgIGlmICghcmVzdWx0ICYmICFucyAmJiAha2V5ICYmIGxuZy5pbmRleE9mKCcuJykgPiAtMSkge1xuICAgICAgbG5nID0gcGF0aFswXTtcbiAgICAgIG5zID0gcGF0aFsxXTtcbiAgICAgIGtleSA9IHBhdGguc2xpY2UoMikuam9pbignLicpO1xuICAgIH1cbiAgICBpZiAocmVzdWx0IHx8ICFpZ25vcmVKU09OU3RydWN0dXJlIHx8ICFpc1N0cmluZyhrZXkpKSByZXR1cm4gcmVzdWx0O1xuXG4gICAgcmV0dXJuIGRlZXBGaW5kKHRoaXMuZGF0YT8uW2xuZ10/Lltuc10sIGtleSwga2V5U2VwYXJhdG9yKTtcbiAgfVxuXG4gIGFkZFJlc291cmNlKGxuZywgbnMsIGtleSwgdmFsdWUsIG9wdGlvbnMgPSB7IHNpbGVudDogZmFsc2UgfSkge1xuICAgIGNvbnN0IGtleVNlcGFyYXRvciA9XG4gICAgICBvcHRpb25zLmtleVNlcGFyYXRvciAhPT0gdW5kZWZpbmVkID8gb3B0aW9ucy5rZXlTZXBhcmF0b3IgOiB0aGlzLm9wdGlvbnMua2V5U2VwYXJhdG9yO1xuXG4gICAgbGV0IHBhdGggPSBbbG5nLCBuc107XG4gICAgaWYgKGtleSkgcGF0aCA9IHBhdGguY29uY2F0KGtleVNlcGFyYXRvciA/IGtleS5zcGxpdChrZXlTZXBhcmF0b3IpIDoga2V5KTtcblxuICAgIGlmIChsbmcuaW5kZXhPZignLicpID4gLTEpIHtcbiAgICAgIHBhdGggPSBsbmcuc3BsaXQoJy4nKTtcbiAgICAgIHZhbHVlID0gbnM7XG4gICAgICBucyA9IHBhdGhbMV07XG4gICAgfVxuXG4gICAgdGhpcy5hZGROYW1lc3BhY2VzKG5zKTtcblxuICAgIHNldFBhdGgodGhpcy5kYXRhLCBwYXRoLCB2YWx1ZSk7XG5cbiAgICBpZiAoIW9wdGlvbnMuc2lsZW50KSB0aGlzLmVtaXQoJ2FkZGVkJywgbG5nLCBucywga2V5LCB2YWx1ZSk7XG4gIH1cblxuICBhZGRSZXNvdXJjZXMobG5nLCBucywgcmVzb3VyY2VzLCBvcHRpb25zID0geyBzaWxlbnQ6IGZhbHNlIH0pIHtcbiAgICAvKiBlc2xpbnQgbm8tcmVzdHJpY3RlZC1zeW50YXg6IDAgKi9cbiAgICBmb3IgKGNvbnN0IG0gaW4gcmVzb3VyY2VzKSB7XG4gICAgICBpZiAoaXNTdHJpbmcocmVzb3VyY2VzW21dKSB8fCBBcnJheS5pc0FycmF5KHJlc291cmNlc1ttXSkpXG4gICAgICAgIHRoaXMuYWRkUmVzb3VyY2UobG5nLCBucywgbSwgcmVzb3VyY2VzW21dLCB7IHNpbGVudDogdHJ1ZSB9KTtcbiAgICB9XG4gICAgaWYgKCFvcHRpb25zLnNpbGVudCkgdGhpcy5lbWl0KCdhZGRlZCcsIGxuZywgbnMsIHJlc291cmNlcyk7XG4gIH1cblxuICBhZGRSZXNvdXJjZUJ1bmRsZShcbiAgICBsbmcsXG4gICAgbnMsXG4gICAgcmVzb3VyY2VzLFxuICAgIGRlZXAsXG4gICAgb3ZlcndyaXRlLFxuICAgIG9wdGlvbnMgPSB7IHNpbGVudDogZmFsc2UsIHNraXBDb3B5OiBmYWxzZSB9LFxuICApIHtcbiAgICBsZXQgcGF0aCA9IFtsbmcsIG5zXTtcbiAgICBpZiAobG5nLmluZGV4T2YoJy4nKSA+IC0xKSB7XG4gICAgICBwYXRoID0gbG5nLnNwbGl0KCcuJyk7XG4gICAgICBkZWVwID0gcmVzb3VyY2VzO1xuICAgICAgcmVzb3VyY2VzID0gbnM7XG4gICAgICBucyA9IHBhdGhbMV07XG4gICAgfVxuXG4gICAgdGhpcy5hZGROYW1lc3BhY2VzKG5zKTtcblxuICAgIGxldCBwYWNrID0gZ2V0UGF0aCh0aGlzLmRhdGEsIHBhdGgpIHx8IHt9O1xuXG4gICAgaWYgKCFvcHRpb25zLnNraXBDb3B5KSByZXNvdXJjZXMgPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KHJlc291cmNlcykpOyAvLyBtYWtlIGEgY29weSB0byBmaXggIzIwODFcblxuICAgIGlmIChkZWVwKSB7XG4gICAgICBkZWVwRXh0ZW5kKHBhY2ssIHJlc291cmNlcywgb3ZlcndyaXRlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcGFjayA9IHsgLi4ucGFjaywgLi4ucmVzb3VyY2VzIH07XG4gICAgfVxuXG4gICAgc2V0UGF0aCh0aGlzLmRhdGEsIHBhdGgsIHBhY2spO1xuXG4gICAgaWYgKCFvcHRpb25zLnNpbGVudCkgdGhpcy5lbWl0KCdhZGRlZCcsIGxuZywgbnMsIHJlc291cmNlcyk7XG4gIH1cblxuICByZW1vdmVSZXNvdXJjZUJ1bmRsZShsbmcsIG5zKSB7XG4gICAgaWYgKHRoaXMuaGFzUmVzb3VyY2VCdW5kbGUobG5nLCBucykpIHtcbiAgICAgIGRlbGV0ZSB0aGlzLmRhdGFbbG5nXVtuc107XG4gICAgfVxuICAgIHRoaXMucmVtb3ZlTmFtZXNwYWNlcyhucyk7XG5cbiAgICB0aGlzLmVtaXQoJ3JlbW92ZWQnLCBsbmcsIG5zKTtcbiAgfVxuXG4gIGhhc1Jlc291cmNlQnVuZGxlKGxuZywgbnMpIHtcbiAgICByZXR1cm4gdGhpcy5nZXRSZXNvdXJjZShsbmcsIG5zKSAhPT0gdW5kZWZpbmVkO1xuICB9XG5cbiAgZ2V0UmVzb3VyY2VCdW5kbGUobG5nLCBucykge1xuICAgIGlmICghbnMpIG5zID0gdGhpcy5vcHRpb25zLmRlZmF1bHROUztcbiAgICByZXR1cm4gdGhpcy5nZXRSZXNvdXJjZShsbmcsIG5zKTtcbiAgfVxuXG4gIGdldERhdGFCeUxhbmd1YWdlKGxuZykge1xuICAgIHJldHVybiB0aGlzLmRhdGFbbG5nXTtcbiAgfVxuXG4gIGhhc0xhbmd1YWdlU29tZVRyYW5zbGF0aW9ucyhsbmcpIHtcbiAgICBjb25zdCBkYXRhID0gdGhpcy5nZXREYXRhQnlMYW5ndWFnZShsbmcpO1xuICAgIGNvbnN0IG4gPSAoZGF0YSAmJiBPYmplY3Qua2V5cyhkYXRhKSkgfHwgW107XG4gICAgcmV0dXJuICEhbi5maW5kKCh2KSA9PiBkYXRhW3ZdICYmIE9iamVjdC5rZXlzKGRhdGFbdl0pLmxlbmd0aCA+IDApO1xuICB9XG5cbiAgdG9KU09OKCkge1xuICAgIHJldHVybiB0aGlzLmRhdGE7XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgUmVzb3VyY2VTdG9yZTtcbiIsImV4cG9ydCBkZWZhdWx0IHtcbiAgcHJvY2Vzc29yczoge30sXG5cbiAgYWRkUG9zdFByb2Nlc3Nvcihtb2R1bGUpIHtcbiAgICB0aGlzLnByb2Nlc3NvcnNbbW9kdWxlLm5hbWVdID0gbW9kdWxlO1xuICB9LFxuXG4gIGhhbmRsZShwcm9jZXNzb3JzLCB2YWx1ZSwga2V5LCBvcHRpb25zLCB0cmFuc2xhdG9yKSB7XG4gICAgcHJvY2Vzc29ycy5mb3JFYWNoKChwcm9jZXNzb3IpID0+IHtcbiAgICAgIHZhbHVlID0gdGhpcy5wcm9jZXNzb3JzW3Byb2Nlc3Nvcl0/LnByb2Nlc3ModmFsdWUsIGtleSwgb3B0aW9ucywgdHJhbnNsYXRvcikgPz8gdmFsdWU7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gdmFsdWU7XG4gIH0sXG59O1xuIiwiaW1wb3J0IGJhc2VMb2dnZXIgZnJvbSAnLi9sb2dnZXIuanMnO1xuaW1wb3J0IEV2ZW50RW1pdHRlciBmcm9tICcuL0V2ZW50RW1pdHRlci5qcyc7XG5pbXBvcnQgcG9zdFByb2Nlc3NvciBmcm9tICcuL3Bvc3RQcm9jZXNzb3IuanMnO1xuaW1wb3J0IHsgY29weSBhcyB1dGlsc0NvcHksIGxvb2tzTGlrZU9iamVjdFBhdGgsIGlzU3RyaW5nIH0gZnJvbSAnLi91dGlscy5qcyc7XG5cbmNvbnN0IGNoZWNrZWRMb2FkZWRGb3IgPSB7fTtcblxuY29uc3Qgc2hvdWxkSGFuZGxlQXNPYmplY3QgPSAocmVzKSA9PlxuICAhaXNTdHJpbmcocmVzKSAmJiB0eXBlb2YgcmVzICE9PSAnYm9vbGVhbicgJiYgdHlwZW9mIHJlcyAhPT0gJ251bWJlcic7XG5cbmNsYXNzIFRyYW5zbGF0b3IgZXh0ZW5kcyBFdmVudEVtaXR0ZXIge1xuICBjb25zdHJ1Y3RvcihzZXJ2aWNlcywgb3B0aW9ucyA9IHt9KSB7XG4gICAgc3VwZXIoKTtcblxuICAgIHV0aWxzQ29weShcbiAgICAgIFtcbiAgICAgICAgJ3Jlc291cmNlU3RvcmUnLFxuICAgICAgICAnbGFuZ3VhZ2VVdGlscycsXG4gICAgICAgICdwbHVyYWxSZXNvbHZlcicsXG4gICAgICAgICdpbnRlcnBvbGF0b3InLFxuICAgICAgICAnYmFja2VuZENvbm5lY3RvcicsXG4gICAgICAgICdpMThuRm9ybWF0JyxcbiAgICAgICAgJ3V0aWxzJyxcbiAgICAgIF0sXG4gICAgICBzZXJ2aWNlcyxcbiAgICAgIHRoaXMsXG4gICAgKTtcblxuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG4gICAgaWYgKHRoaXMub3B0aW9ucy5rZXlTZXBhcmF0b3IgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5vcHRpb25zLmtleVNlcGFyYXRvciA9ICcuJztcbiAgICB9XG5cbiAgICB0aGlzLmxvZ2dlciA9IGJhc2VMb2dnZXIuY3JlYXRlKCd0cmFuc2xhdG9yJyk7XG4gIH1cblxuICBjaGFuZ2VMYW5ndWFnZShsbmcpIHtcbiAgICBpZiAobG5nKSB0aGlzLmxhbmd1YWdlID0gbG5nO1xuICB9XG5cbiAgZXhpc3RzKGtleSwgb3B0aW9ucyA9IHsgaW50ZXJwb2xhdGlvbjoge30gfSkge1xuICAgIGlmIChrZXkgPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGNvbnN0IHJlc29sdmVkID0gdGhpcy5yZXNvbHZlKGtleSwgb3B0aW9ucyk7XG4gICAgcmV0dXJuIHJlc29sdmVkPy5yZXMgIT09IHVuZGVmaW5lZDtcbiAgfVxuXG4gIGV4dHJhY3RGcm9tS2V5KGtleSwgb3B0aW9ucykge1xuICAgIGxldCBuc1NlcGFyYXRvciA9XG4gICAgICBvcHRpb25zLm5zU2VwYXJhdG9yICE9PSB1bmRlZmluZWQgPyBvcHRpb25zLm5zU2VwYXJhdG9yIDogdGhpcy5vcHRpb25zLm5zU2VwYXJhdG9yO1xuICAgIGlmIChuc1NlcGFyYXRvciA9PT0gdW5kZWZpbmVkKSBuc1NlcGFyYXRvciA9ICc6JztcblxuICAgIGNvbnN0IGtleVNlcGFyYXRvciA9XG4gICAgICBvcHRpb25zLmtleVNlcGFyYXRvciAhPT0gdW5kZWZpbmVkID8gb3B0aW9ucy5rZXlTZXBhcmF0b3IgOiB0aGlzLm9wdGlvbnMua2V5U2VwYXJhdG9yO1xuXG4gICAgbGV0IG5hbWVzcGFjZXMgPSBvcHRpb25zLm5zIHx8IHRoaXMub3B0aW9ucy5kZWZhdWx0TlMgfHwgW107XG4gICAgY29uc3Qgd291bGRDaGVja0Zvck5zSW5LZXkgPSBuc1NlcGFyYXRvciAmJiBrZXkuaW5kZXhPZihuc1NlcGFyYXRvcikgPiAtMTtcbiAgICBjb25zdCBzZWVtc05hdHVyYWxMYW5ndWFnZSA9XG4gICAgICAhdGhpcy5vcHRpb25zLnVzZXJEZWZpbmVkS2V5U2VwYXJhdG9yICYmXG4gICAgICAhb3B0aW9ucy5rZXlTZXBhcmF0b3IgJiZcbiAgICAgICF0aGlzLm9wdGlvbnMudXNlckRlZmluZWROc1NlcGFyYXRvciAmJlxuICAgICAgIW9wdGlvbnMubnNTZXBhcmF0b3IgJiZcbiAgICAgICFsb29rc0xpa2VPYmplY3RQYXRoKGtleSwgbnNTZXBhcmF0b3IsIGtleVNlcGFyYXRvcik7XG4gICAgaWYgKHdvdWxkQ2hlY2tGb3JOc0luS2V5ICYmICFzZWVtc05hdHVyYWxMYW5ndWFnZSkge1xuICAgICAgY29uc3QgbSA9IGtleS5tYXRjaCh0aGlzLmludGVycG9sYXRvci5uZXN0aW5nUmVnZXhwKTtcbiAgICAgIGlmIChtICYmIG0ubGVuZ3RoID4gMCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIGtleSxcbiAgICAgICAgICBuYW1lc3BhY2VzOiBpc1N0cmluZyhuYW1lc3BhY2VzKSA/IFtuYW1lc3BhY2VzXSA6IG5hbWVzcGFjZXMsXG4gICAgICAgIH07XG4gICAgICB9XG4gICAgICBjb25zdCBwYXJ0cyA9IGtleS5zcGxpdChuc1NlcGFyYXRvcik7XG4gICAgICBpZiAoXG4gICAgICAgIG5zU2VwYXJhdG9yICE9PSBrZXlTZXBhcmF0b3IgfHxcbiAgICAgICAgKG5zU2VwYXJhdG9yID09PSBrZXlTZXBhcmF0b3IgJiYgdGhpcy5vcHRpb25zLm5zLmluZGV4T2YocGFydHNbMF0pID4gLTEpXG4gICAgICApXG4gICAgICAgIG5hbWVzcGFjZXMgPSBwYXJ0cy5zaGlmdCgpO1xuICAgICAga2V5ID0gcGFydHMuam9pbihrZXlTZXBhcmF0b3IpO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBrZXksXG4gICAgICBuYW1lc3BhY2VzOiBpc1N0cmluZyhuYW1lc3BhY2VzKSA/IFtuYW1lc3BhY2VzXSA6IG5hbWVzcGFjZXMsXG4gICAgfTtcbiAgfVxuXG4gIHRyYW5zbGF0ZShrZXlzLCBvcHRpb25zLCBsYXN0S2V5KSB7XG4gICAgaWYgKHR5cGVvZiBvcHRpb25zICE9PSAnb2JqZWN0JyAmJiB0aGlzLm9wdGlvbnMub3ZlcmxvYWRUcmFuc2xhdGlvbk9wdGlvbkhhbmRsZXIpIHtcbiAgICAgIC8qIGVzbGludCBwcmVmZXItcmVzdC1wYXJhbXM6IDAgKi9cbiAgICAgIG9wdGlvbnMgPSB0aGlzLm9wdGlvbnMub3ZlcmxvYWRUcmFuc2xhdGlvbk9wdGlvbkhhbmRsZXIoYXJndW1lbnRzKTtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiBvcHRpb25zID09PSAnb2JqZWN0Jykgb3B0aW9ucyA9IHsgLi4ub3B0aW9ucyB9O1xuICAgIGlmICghb3B0aW9ucykgb3B0aW9ucyA9IHt9O1xuXG4gICAgLy8gbm9uIHZhbGlkIGtleXMgaGFuZGxpbmdcbiAgICBpZiAoa2V5cyA9PSBudWxsIC8qIHx8IGtleXMgPT09ICcnICovKSByZXR1cm4gJyc7XG4gICAgaWYgKCFBcnJheS5pc0FycmF5KGtleXMpKSBrZXlzID0gW1N0cmluZyhrZXlzKV07XG5cbiAgICBjb25zdCByZXR1cm5EZXRhaWxzID1cbiAgICAgIG9wdGlvbnMucmV0dXJuRGV0YWlscyAhPT0gdW5kZWZpbmVkID8gb3B0aW9ucy5yZXR1cm5EZXRhaWxzIDogdGhpcy5vcHRpb25zLnJldHVybkRldGFpbHM7XG5cbiAgICAvLyBzZXBhcmF0b3JzXG4gICAgY29uc3Qga2V5U2VwYXJhdG9yID1cbiAgICAgIG9wdGlvbnMua2V5U2VwYXJhdG9yICE9PSB1bmRlZmluZWQgPyBvcHRpb25zLmtleVNlcGFyYXRvciA6IHRoaXMub3B0aW9ucy5rZXlTZXBhcmF0b3I7XG5cbiAgICAvLyBnZXQgbmFtZXNwYWNlKHMpXG4gICAgY29uc3QgeyBrZXksIG5hbWVzcGFjZXMgfSA9IHRoaXMuZXh0cmFjdEZyb21LZXkoa2V5c1trZXlzLmxlbmd0aCAtIDFdLCBvcHRpb25zKTtcbiAgICBjb25zdCBuYW1lc3BhY2UgPSBuYW1lc3BhY2VzW25hbWVzcGFjZXMubGVuZ3RoIC0gMV07XG5cbiAgICAvLyByZXR1cm4ga2V5IG9uIENJTW9kZVxuICAgIGNvbnN0IGxuZyA9IG9wdGlvbnMubG5nIHx8IHRoaXMubGFuZ3VhZ2U7XG4gICAgY29uc3QgYXBwZW5kTmFtZXNwYWNlVG9DSU1vZGUgPVxuICAgICAgb3B0aW9ucy5hcHBlbmROYW1lc3BhY2VUb0NJTW9kZSB8fCB0aGlzLm9wdGlvbnMuYXBwZW5kTmFtZXNwYWNlVG9DSU1vZGU7XG4gICAgaWYgKGxuZz8udG9Mb3dlckNhc2UoKSA9PT0gJ2NpbW9kZScpIHtcbiAgICAgIGlmIChhcHBlbmROYW1lc3BhY2VUb0NJTW9kZSkge1xuICAgICAgICBjb25zdCBuc1NlcGFyYXRvciA9IG9wdGlvbnMubnNTZXBhcmF0b3IgfHwgdGhpcy5vcHRpb25zLm5zU2VwYXJhdG9yO1xuICAgICAgICBpZiAocmV0dXJuRGV0YWlscykge1xuICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICByZXM6IGAke25hbWVzcGFjZX0ke25zU2VwYXJhdG9yfSR7a2V5fWAsXG4gICAgICAgICAgICB1c2VkS2V5OiBrZXksXG4gICAgICAgICAgICBleGFjdFVzZWRLZXk6IGtleSxcbiAgICAgICAgICAgIHVzZWRMbmc6IGxuZyxcbiAgICAgICAgICAgIHVzZWROUzogbmFtZXNwYWNlLFxuICAgICAgICAgICAgdXNlZFBhcmFtczogdGhpcy5nZXRVc2VkUGFyYW1zRGV0YWlscyhvcHRpb25zKSxcbiAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBgJHtuYW1lc3BhY2V9JHtuc1NlcGFyYXRvcn0ke2tleX1gO1xuICAgICAgfVxuXG4gICAgICBpZiAocmV0dXJuRGV0YWlscykge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIHJlczoga2V5LFxuICAgICAgICAgIHVzZWRLZXk6IGtleSxcbiAgICAgICAgICBleGFjdFVzZWRLZXk6IGtleSxcbiAgICAgICAgICB1c2VkTG5nOiBsbmcsXG4gICAgICAgICAgdXNlZE5TOiBuYW1lc3BhY2UsXG4gICAgICAgICAgdXNlZFBhcmFtczogdGhpcy5nZXRVc2VkUGFyYW1zRGV0YWlscyhvcHRpb25zKSxcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBrZXk7XG4gICAgfVxuXG4gICAgLy8gcmVzb2x2ZSBmcm9tIHN0b3JlXG4gICAgY29uc3QgcmVzb2x2ZWQgPSB0aGlzLnJlc29sdmUoa2V5cywgb3B0aW9ucyk7XG4gICAgbGV0IHJlcyA9IHJlc29sdmVkPy5yZXM7XG4gICAgY29uc3QgcmVzVXNlZEtleSA9IHJlc29sdmVkPy51c2VkS2V5IHx8IGtleTtcbiAgICBjb25zdCByZXNFeGFjdFVzZWRLZXkgPSByZXNvbHZlZD8uZXhhY3RVc2VkS2V5IHx8IGtleTtcblxuICAgIGNvbnN0IG5vT2JqZWN0ID0gWydbb2JqZWN0IE51bWJlcl0nLCAnW29iamVjdCBGdW5jdGlvbl0nLCAnW29iamVjdCBSZWdFeHBdJ107XG4gICAgY29uc3Qgam9pbkFycmF5cyA9XG4gICAgICBvcHRpb25zLmpvaW5BcnJheXMgIT09IHVuZGVmaW5lZCA/IG9wdGlvbnMuam9pbkFycmF5cyA6IHRoaXMub3B0aW9ucy5qb2luQXJyYXlzO1xuXG4gICAgLy8gb2JqZWN0XG4gICAgY29uc3QgaGFuZGxlQXNPYmplY3RJbkkxOG5Gb3JtYXQgPSAhdGhpcy5pMThuRm9ybWF0IHx8IHRoaXMuaTE4bkZvcm1hdC5oYW5kbGVBc09iamVjdDtcbiAgICBjb25zdCBuZWVkc1BsdXJhbEhhbmRsaW5nID0gb3B0aW9ucy5jb3VudCAhPT0gdW5kZWZpbmVkICYmICFpc1N0cmluZyhvcHRpb25zLmNvdW50KTtcbiAgICBjb25zdCBoYXNEZWZhdWx0VmFsdWUgPSBUcmFuc2xhdG9yLmhhc0RlZmF1bHRWYWx1ZShvcHRpb25zKTtcbiAgICBjb25zdCBkZWZhdWx0VmFsdWVTdWZmaXggPSBuZWVkc1BsdXJhbEhhbmRsaW5nXG4gICAgICA/IHRoaXMucGx1cmFsUmVzb2x2ZXIuZ2V0U3VmZml4KGxuZywgb3B0aW9ucy5jb3VudCwgb3B0aW9ucylcbiAgICAgIDogJyc7XG4gICAgY29uc3QgZGVmYXVsdFZhbHVlU3VmZml4T3JkaW5hbEZhbGxiYWNrID1cbiAgICAgIG9wdGlvbnMub3JkaW5hbCAmJiBuZWVkc1BsdXJhbEhhbmRsaW5nXG4gICAgICAgID8gdGhpcy5wbHVyYWxSZXNvbHZlci5nZXRTdWZmaXgobG5nLCBvcHRpb25zLmNvdW50LCB7IG9yZGluYWw6IGZhbHNlIH0pXG4gICAgICAgIDogJyc7XG4gICAgY29uc3QgbmVlZHNaZXJvU3VmZml4TG9va3VwID0gbmVlZHNQbHVyYWxIYW5kbGluZyAmJiAhb3B0aW9ucy5vcmRpbmFsICYmIG9wdGlvbnMuY291bnQgPT09IDA7XG4gICAgY29uc3QgZGVmYXVsdFZhbHVlID1cbiAgICAgIChuZWVkc1plcm9TdWZmaXhMb29rdXAgJiYgb3B0aW9uc1tgZGVmYXVsdFZhbHVlJHt0aGlzLm9wdGlvbnMucGx1cmFsU2VwYXJhdG9yfXplcm9gXSkgfHxcbiAgICAgIG9wdGlvbnNbYGRlZmF1bHRWYWx1ZSR7ZGVmYXVsdFZhbHVlU3VmZml4fWBdIHx8XG4gICAgICBvcHRpb25zW2BkZWZhdWx0VmFsdWUke2RlZmF1bHRWYWx1ZVN1ZmZpeE9yZGluYWxGYWxsYmFja31gXSB8fFxuICAgICAgb3B0aW9ucy5kZWZhdWx0VmFsdWU7XG5cbiAgICBsZXQgcmVzRm9yT2JqSG5kbCA9IHJlcztcbiAgICBpZiAoaGFuZGxlQXNPYmplY3RJbkkxOG5Gb3JtYXQgJiYgIXJlcyAmJiBoYXNEZWZhdWx0VmFsdWUpIHtcbiAgICAgIHJlc0Zvck9iakhuZGwgPSBkZWZhdWx0VmFsdWU7XG4gICAgfVxuXG4gICAgY29uc3QgaGFuZGxlQXNPYmplY3QgPSBzaG91bGRIYW5kbGVBc09iamVjdChyZXNGb3JPYmpIbmRsKTtcbiAgICBjb25zdCByZXNUeXBlID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5hcHBseShyZXNGb3JPYmpIbmRsKTtcblxuICAgIGlmIChcbiAgICAgIGhhbmRsZUFzT2JqZWN0SW5JMThuRm9ybWF0ICYmXG4gICAgICByZXNGb3JPYmpIbmRsICYmXG4gICAgICBoYW5kbGVBc09iamVjdCAmJlxuICAgICAgbm9PYmplY3QuaW5kZXhPZihyZXNUeXBlKSA8IDAgJiZcbiAgICAgICEoaXNTdHJpbmcoam9pbkFycmF5cykgJiYgQXJyYXkuaXNBcnJheShyZXNGb3JPYmpIbmRsKSlcbiAgICApIHtcbiAgICAgIGlmICghb3B0aW9ucy5yZXR1cm5PYmplY3RzICYmICF0aGlzLm9wdGlvbnMucmV0dXJuT2JqZWN0cykge1xuICAgICAgICBpZiAoIXRoaXMub3B0aW9ucy5yZXR1cm5lZE9iamVjdEhhbmRsZXIpIHtcbiAgICAgICAgICB0aGlzLmxvZ2dlci53YXJuKCdhY2Nlc3NpbmcgYW4gb2JqZWN0IC0gYnV0IHJldHVybk9iamVjdHMgb3B0aW9ucyBpcyBub3QgZW5hYmxlZCEnKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCByID0gdGhpcy5vcHRpb25zLnJldHVybmVkT2JqZWN0SGFuZGxlclxuICAgICAgICAgID8gdGhpcy5vcHRpb25zLnJldHVybmVkT2JqZWN0SGFuZGxlcihyZXNVc2VkS2V5LCByZXNGb3JPYmpIbmRsLCB7XG4gICAgICAgICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICAgICAgICAgIG5zOiBuYW1lc3BhY2VzLFxuICAgICAgICAgICAgfSlcbiAgICAgICAgICA6IGBrZXkgJyR7a2V5fSAoJHt0aGlzLmxhbmd1YWdlfSknIHJldHVybmVkIGFuIG9iamVjdCBpbnN0ZWFkIG9mIHN0cmluZy5gO1xuICAgICAgICBpZiAocmV0dXJuRGV0YWlscykge1xuICAgICAgICAgIHJlc29sdmVkLnJlcyA9IHI7XG4gICAgICAgICAgcmVzb2x2ZWQudXNlZFBhcmFtcyA9IHRoaXMuZ2V0VXNlZFBhcmFtc0RldGFpbHMob3B0aW9ucyk7XG4gICAgICAgICAgcmV0dXJuIHJlc29sdmVkO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByO1xuICAgICAgfVxuXG4gICAgICAvLyBpZiB3ZSBnb3QgYSBzZXBhcmF0b3Igd2UgbG9vcCBvdmVyIGNoaWxkcmVuIC0gZWxzZSB3ZSBqdXN0IHJldHVybiBvYmplY3QgYXMgaXNcbiAgICAgIC8vIGFzIGhhdmluZyBpdCBzZXQgdG8gZmFsc2UgbWVhbnMgbm8gaGllcmFyY2h5IHNvIG5vIGxvb2t1cCBmb3IgbmVzdGVkIHZhbHVlc1xuICAgICAgaWYgKGtleVNlcGFyYXRvcikge1xuICAgICAgICBjb25zdCByZXNUeXBlSXNBcnJheSA9IEFycmF5LmlzQXJyYXkocmVzRm9yT2JqSG5kbCk7XG4gICAgICAgIGNvbnN0IGNvcHkgPSByZXNUeXBlSXNBcnJheSA/IFtdIDoge307IC8vIGFwcGx5IGNoaWxkIHRyYW5zbGF0aW9uIG9uIGEgY29weVxuXG4gICAgICAgIC8qIGVzbGludCBuby1yZXN0cmljdGVkLXN5bnRheDogMCAqL1xuICAgICAgICBjb25zdCBuZXdLZXlUb1VzZSA9IHJlc1R5cGVJc0FycmF5ID8gcmVzRXhhY3RVc2VkS2V5IDogcmVzVXNlZEtleTtcbiAgICAgICAgZm9yIChjb25zdCBtIGluIHJlc0Zvck9iakhuZGwpIHtcbiAgICAgICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHJlc0Zvck9iakhuZGwsIG0pKSB7XG4gICAgICAgICAgICBjb25zdCBkZWVwS2V5ID0gYCR7bmV3S2V5VG9Vc2V9JHtrZXlTZXBhcmF0b3J9JHttfWA7XG4gICAgICAgICAgICBpZiAoaGFzRGVmYXVsdFZhbHVlICYmICFyZXMpIHtcbiAgICAgICAgICAgICAgY29weVttXSA9IHRoaXMudHJhbnNsYXRlKGRlZXBLZXksIHtcbiAgICAgICAgICAgICAgICAuLi5vcHRpb25zLFxuICAgICAgICAgICAgICAgIGRlZmF1bHRWYWx1ZTogc2hvdWxkSGFuZGxlQXNPYmplY3QoZGVmYXVsdFZhbHVlKSA/IGRlZmF1bHRWYWx1ZVttXSA6IHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICAuLi57IGpvaW5BcnJheXM6IGZhbHNlLCBuczogbmFtZXNwYWNlcyB9LFxuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGNvcHlbbV0gPSB0aGlzLnRyYW5zbGF0ZShkZWVwS2V5LCB7XG4gICAgICAgICAgICAgICAgLi4ub3B0aW9ucyxcbiAgICAgICAgICAgICAgICAuLi57IGpvaW5BcnJheXM6IGZhbHNlLCBuczogbmFtZXNwYWNlcyB9LFxuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChjb3B5W21dID09PSBkZWVwS2V5KSBjb3B5W21dID0gcmVzRm9yT2JqSG5kbFttXTsgLy8gaWYgbm90aGluZyBmb3VuZCB1c2Ugb3JpZ2luYWwgdmFsdWUgYXMgZmFsbGJhY2tcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmVzID0gY29weTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGhhbmRsZUFzT2JqZWN0SW5JMThuRm9ybWF0ICYmIGlzU3RyaW5nKGpvaW5BcnJheXMpICYmIEFycmF5LmlzQXJyYXkocmVzKSkge1xuICAgICAgLy8gYXJyYXkgc3BlY2lhbCB0cmVhdG1lbnRcbiAgICAgIHJlcyA9IHJlcy5qb2luKGpvaW5BcnJheXMpO1xuICAgICAgaWYgKHJlcykgcmVzID0gdGhpcy5leHRlbmRUcmFuc2xhdGlvbihyZXMsIGtleXMsIG9wdGlvbnMsIGxhc3RLZXkpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBzdHJpbmcsIGVtcHR5IG9yIG51bGxcbiAgICAgIGxldCB1c2VkRGVmYXVsdCA9IGZhbHNlO1xuICAgICAgbGV0IHVzZWRLZXkgPSBmYWxzZTtcblxuICAgICAgLy8gZmFsbGJhY2sgdmFsdWVcbiAgICAgIGlmICghdGhpcy5pc1ZhbGlkTG9va3VwKHJlcykgJiYgaGFzRGVmYXVsdFZhbHVlKSB7XG4gICAgICAgIHVzZWREZWZhdWx0ID0gdHJ1ZTtcbiAgICAgICAgcmVzID0gZGVmYXVsdFZhbHVlO1xuICAgICAgfVxuICAgICAgaWYgKCF0aGlzLmlzVmFsaWRMb29rdXAocmVzKSkge1xuICAgICAgICB1c2VkS2V5ID0gdHJ1ZTtcbiAgICAgICAgcmVzID0ga2V5O1xuICAgICAgfVxuXG4gICAgICBjb25zdCBtaXNzaW5nS2V5Tm9WYWx1ZUZhbGxiYWNrVG9LZXkgPVxuICAgICAgICBvcHRpb25zLm1pc3NpbmdLZXlOb1ZhbHVlRmFsbGJhY2tUb0tleSB8fCB0aGlzLm9wdGlvbnMubWlzc2luZ0tleU5vVmFsdWVGYWxsYmFja1RvS2V5O1xuICAgICAgY29uc3QgcmVzRm9yTWlzc2luZyA9IG1pc3NpbmdLZXlOb1ZhbHVlRmFsbGJhY2tUb0tleSAmJiB1c2VkS2V5ID8gdW5kZWZpbmVkIDogcmVzO1xuXG4gICAgICAvLyBzYXZlIG1pc3NpbmdcbiAgICAgIGNvbnN0IHVwZGF0ZU1pc3NpbmcgPSBoYXNEZWZhdWx0VmFsdWUgJiYgZGVmYXVsdFZhbHVlICE9PSByZXMgJiYgdGhpcy5vcHRpb25zLnVwZGF0ZU1pc3Npbmc7XG4gICAgICBpZiAodXNlZEtleSB8fCB1c2VkRGVmYXVsdCB8fCB1cGRhdGVNaXNzaW5nKSB7XG4gICAgICAgIHRoaXMubG9nZ2VyLmxvZyhcbiAgICAgICAgICB1cGRhdGVNaXNzaW5nID8gJ3VwZGF0ZUtleScgOiAnbWlzc2luZ0tleScsXG4gICAgICAgICAgbG5nLFxuICAgICAgICAgIG5hbWVzcGFjZSxcbiAgICAgICAgICBrZXksXG4gICAgICAgICAgdXBkYXRlTWlzc2luZyA/IGRlZmF1bHRWYWx1ZSA6IHJlcyxcbiAgICAgICAgKTtcbiAgICAgICAgaWYgKGtleVNlcGFyYXRvcikge1xuICAgICAgICAgIGNvbnN0IGZrID0gdGhpcy5yZXNvbHZlKGtleSwgeyAuLi5vcHRpb25zLCBrZXlTZXBhcmF0b3I6IGZhbHNlIH0pO1xuICAgICAgICAgIGlmIChmayAmJiBmay5yZXMpXG4gICAgICAgICAgICB0aGlzLmxvZ2dlci53YXJuKFxuICAgICAgICAgICAgICAnU2VlbXMgdGhlIGxvYWRlZCB0cmFuc2xhdGlvbnMgd2VyZSBpbiBmbGF0IEpTT04gZm9ybWF0IGluc3RlYWQgb2YgbmVzdGVkLiBFaXRoZXIgc2V0IGtleVNlcGFyYXRvcjogZmFsc2Ugb24gaW5pdCBvciBtYWtlIHN1cmUgeW91ciB0cmFuc2xhdGlvbnMgYXJlIHB1Ymxpc2hlZCBpbiBuZXN0ZWQgZm9ybWF0LicsXG4gICAgICAgICAgICApO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IGxuZ3MgPSBbXTtcbiAgICAgICAgY29uc3QgZmFsbGJhY2tMbmdzID0gdGhpcy5sYW5ndWFnZVV0aWxzLmdldEZhbGxiYWNrQ29kZXMoXG4gICAgICAgICAgdGhpcy5vcHRpb25zLmZhbGxiYWNrTG5nLFxuICAgICAgICAgIG9wdGlvbnMubG5nIHx8IHRoaXMubGFuZ3VhZ2UsXG4gICAgICAgICk7XG4gICAgICAgIGlmICh0aGlzLm9wdGlvbnMuc2F2ZU1pc3NpbmdUbyA9PT0gJ2ZhbGxiYWNrJyAmJiBmYWxsYmFja0xuZ3MgJiYgZmFsbGJhY2tMbmdzWzBdKSB7XG4gICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBmYWxsYmFja0xuZ3MubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGxuZ3MucHVzaChmYWxsYmFja0xuZ3NbaV0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLm9wdGlvbnMuc2F2ZU1pc3NpbmdUbyA9PT0gJ2FsbCcpIHtcbiAgICAgICAgICBsbmdzID0gdGhpcy5sYW5ndWFnZVV0aWxzLnRvUmVzb2x2ZUhpZXJhcmNoeShvcHRpb25zLmxuZyB8fCB0aGlzLmxhbmd1YWdlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBsbmdzLnB1c2gob3B0aW9ucy5sbmcgfHwgdGhpcy5sYW5ndWFnZSk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBzZW5kID0gKGwsIGssIHNwZWNpZmljRGVmYXVsdFZhbHVlKSA9PiB7XG4gICAgICAgICAgY29uc3QgZGVmYXVsdEZvck1pc3NpbmcgPVxuICAgICAgICAgICAgaGFzRGVmYXVsdFZhbHVlICYmIHNwZWNpZmljRGVmYXVsdFZhbHVlICE9PSByZXMgPyBzcGVjaWZpY0RlZmF1bHRWYWx1ZSA6IHJlc0Zvck1pc3Npbmc7XG4gICAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5taXNzaW5nS2V5SGFuZGxlcikge1xuICAgICAgICAgICAgdGhpcy5vcHRpb25zLm1pc3NpbmdLZXlIYW5kbGVyKFxuICAgICAgICAgICAgICBsLFxuICAgICAgICAgICAgICBuYW1lc3BhY2UsXG4gICAgICAgICAgICAgIGssXG4gICAgICAgICAgICAgIGRlZmF1bHRGb3JNaXNzaW5nLFxuICAgICAgICAgICAgICB1cGRhdGVNaXNzaW5nLFxuICAgICAgICAgICAgICBvcHRpb25zLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMuYmFja2VuZENvbm5lY3Rvcj8uc2F2ZU1pc3NpbmcpIHtcbiAgICAgICAgICAgIHRoaXMuYmFja2VuZENvbm5lY3Rvci5zYXZlTWlzc2luZyhcbiAgICAgICAgICAgICAgbCxcbiAgICAgICAgICAgICAgbmFtZXNwYWNlLFxuICAgICAgICAgICAgICBrLFxuICAgICAgICAgICAgICBkZWZhdWx0Rm9yTWlzc2luZyxcbiAgICAgICAgICAgICAgdXBkYXRlTWlzc2luZyxcbiAgICAgICAgICAgICAgb3B0aW9ucyxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHRoaXMuZW1pdCgnbWlzc2luZ0tleScsIGwsIG5hbWVzcGFjZSwgaywgcmVzKTtcbiAgICAgICAgfTtcblxuICAgICAgICBpZiAodGhpcy5vcHRpb25zLnNhdmVNaXNzaW5nKSB7XG4gICAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5zYXZlTWlzc2luZ1BsdXJhbHMgJiYgbmVlZHNQbHVyYWxIYW5kbGluZykge1xuICAgICAgICAgICAgbG5ncy5mb3JFYWNoKChsYW5ndWFnZSkgPT4ge1xuICAgICAgICAgICAgICBjb25zdCBzdWZmaXhlcyA9IHRoaXMucGx1cmFsUmVzb2x2ZXIuZ2V0U3VmZml4ZXMobGFuZ3VhZ2UsIG9wdGlvbnMpO1xuICAgICAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAgICAgbmVlZHNaZXJvU3VmZml4TG9va3VwICYmXG4gICAgICAgICAgICAgICAgb3B0aW9uc1tgZGVmYXVsdFZhbHVlJHt0aGlzLm9wdGlvbnMucGx1cmFsU2VwYXJhdG9yfXplcm9gXSAmJlxuICAgICAgICAgICAgICAgIHN1ZmZpeGVzLmluZGV4T2YoYCR7dGhpcy5vcHRpb25zLnBsdXJhbFNlcGFyYXRvcn16ZXJvYCkgPCAwXG4gICAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICAgIHN1ZmZpeGVzLnB1c2goYCR7dGhpcy5vcHRpb25zLnBsdXJhbFNlcGFyYXRvcn16ZXJvYCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgc3VmZml4ZXMuZm9yRWFjaCgoc3VmZml4KSA9PiB7XG4gICAgICAgICAgICAgICAgc2VuZChbbGFuZ3VhZ2VdLCBrZXkgKyBzdWZmaXgsIG9wdGlvbnNbYGRlZmF1bHRWYWx1ZSR7c3VmZml4fWBdIHx8IGRlZmF1bHRWYWx1ZSk7XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHNlbmQobG5ncywga2V5LCBkZWZhdWx0VmFsdWUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBleHRlbmRcbiAgICAgIHJlcyA9IHRoaXMuZXh0ZW5kVHJhbnNsYXRpb24ocmVzLCBrZXlzLCBvcHRpb25zLCByZXNvbHZlZCwgbGFzdEtleSk7XG5cbiAgICAgIC8vIGFwcGVuZCBuYW1lc3BhY2UgaWYgc3RpbGwga2V5XG4gICAgICBpZiAodXNlZEtleSAmJiByZXMgPT09IGtleSAmJiB0aGlzLm9wdGlvbnMuYXBwZW5kTmFtZXNwYWNlVG9NaXNzaW5nS2V5KVxuICAgICAgICByZXMgPSBgJHtuYW1lc3BhY2V9OiR7a2V5fWA7XG5cbiAgICAgIC8vIHBhcnNlTWlzc2luZ0tleUhhbmRsZXJcbiAgICAgIGlmICgodXNlZEtleSB8fCB1c2VkRGVmYXVsdCkgJiYgdGhpcy5vcHRpb25zLnBhcnNlTWlzc2luZ0tleUhhbmRsZXIpIHtcbiAgICAgICAgcmVzID0gdGhpcy5vcHRpb25zLnBhcnNlTWlzc2luZ0tleUhhbmRsZXIoXG4gICAgICAgICAgdGhpcy5vcHRpb25zLmFwcGVuZE5hbWVzcGFjZVRvTWlzc2luZ0tleSA/IGAke25hbWVzcGFjZX06JHtrZXl9YCA6IGtleSxcbiAgICAgICAgICB1c2VkRGVmYXVsdCA/IHJlcyA6IHVuZGVmaW5lZCxcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyByZXR1cm5cbiAgICBpZiAocmV0dXJuRGV0YWlscykge1xuICAgICAgcmVzb2x2ZWQucmVzID0gcmVzO1xuICAgICAgcmVzb2x2ZWQudXNlZFBhcmFtcyA9IHRoaXMuZ2V0VXNlZFBhcmFtc0RldGFpbHMob3B0aW9ucyk7XG4gICAgICByZXR1cm4gcmVzb2x2ZWQ7XG4gICAgfVxuICAgIHJldHVybiByZXM7XG4gIH1cblxuICBleHRlbmRUcmFuc2xhdGlvbihyZXMsIGtleSwgb3B0aW9ucywgcmVzb2x2ZWQsIGxhc3RLZXkpIHtcbiAgICBpZiAodGhpcy5pMThuRm9ybWF0Py5wYXJzZSkge1xuICAgICAgcmVzID0gdGhpcy5pMThuRm9ybWF0LnBhcnNlKFxuICAgICAgICByZXMsXG4gICAgICAgIHsgLi4udGhpcy5vcHRpb25zLmludGVycG9sYXRpb24uZGVmYXVsdFZhcmlhYmxlcywgLi4ub3B0aW9ucyB9LFxuICAgICAgICBvcHRpb25zLmxuZyB8fCB0aGlzLmxhbmd1YWdlIHx8IHJlc29sdmVkLnVzZWRMbmcsXG4gICAgICAgIHJlc29sdmVkLnVzZWROUyxcbiAgICAgICAgcmVzb2x2ZWQudXNlZEtleSxcbiAgICAgICAgeyByZXNvbHZlZCB9LFxuICAgICAgKTtcbiAgICB9IGVsc2UgaWYgKCFvcHRpb25zLnNraXBJbnRlcnBvbGF0aW9uKSB7XG4gICAgICAvLyBpMThuZXh0LnBhcnNpbmdcbiAgICAgIGlmIChvcHRpb25zLmludGVycG9sYXRpb24pXG4gICAgICAgIHRoaXMuaW50ZXJwb2xhdG9yLmluaXQoe1xuICAgICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICAgICAgLi4ueyBpbnRlcnBvbGF0aW9uOiB7IC4uLnRoaXMub3B0aW9ucy5pbnRlcnBvbGF0aW9uLCAuLi5vcHRpb25zLmludGVycG9sYXRpb24gfSB9LFxuICAgICAgICB9KTtcbiAgICAgIGNvbnN0IHNraXBPblZhcmlhYmxlcyA9XG4gICAgICAgIGlzU3RyaW5nKHJlcykgJiZcbiAgICAgICAgKG9wdGlvbnM/LmludGVycG9sYXRpb24/LnNraXBPblZhcmlhYmxlcyAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgPyBvcHRpb25zLmludGVycG9sYXRpb24uc2tpcE9uVmFyaWFibGVzXG4gICAgICAgICAgOiB0aGlzLm9wdGlvbnMuaW50ZXJwb2xhdGlvbi5za2lwT25WYXJpYWJsZXMpO1xuICAgICAgbGV0IG5lc3RCZWY7XG4gICAgICBpZiAoc2tpcE9uVmFyaWFibGVzKSB7XG4gICAgICAgIGNvbnN0IG5iID0gcmVzLm1hdGNoKHRoaXMuaW50ZXJwb2xhdG9yLm5lc3RpbmdSZWdleHApO1xuICAgICAgICAvLyBoYXMgbmVzdGluZyBhZnRiZWZvcmVlciBpbnRlcnBvbGF0aW9uXG4gICAgICAgIG5lc3RCZWYgPSBuYiAmJiBuYi5sZW5ndGg7XG4gICAgICB9XG5cbiAgICAgIC8vIGludGVycG9sYXRlXG4gICAgICBsZXQgZGF0YSA9IG9wdGlvbnMucmVwbGFjZSAmJiAhaXNTdHJpbmcob3B0aW9ucy5yZXBsYWNlKSA/IG9wdGlvbnMucmVwbGFjZSA6IG9wdGlvbnM7XG4gICAgICBpZiAodGhpcy5vcHRpb25zLmludGVycG9sYXRpb24uZGVmYXVsdFZhcmlhYmxlcylcbiAgICAgICAgZGF0YSA9IHsgLi4udGhpcy5vcHRpb25zLmludGVycG9sYXRpb24uZGVmYXVsdFZhcmlhYmxlcywgLi4uZGF0YSB9O1xuICAgICAgcmVzID0gdGhpcy5pbnRlcnBvbGF0b3IuaW50ZXJwb2xhdGUoXG4gICAgICAgIHJlcyxcbiAgICAgICAgZGF0YSxcbiAgICAgICAgb3B0aW9ucy5sbmcgfHwgdGhpcy5sYW5ndWFnZSB8fCByZXNvbHZlZC51c2VkTG5nLFxuICAgICAgICBvcHRpb25zLFxuICAgICAgKTtcblxuICAgICAgLy8gbmVzdGluZ1xuICAgICAgaWYgKHNraXBPblZhcmlhYmxlcykge1xuICAgICAgICBjb25zdCBuYSA9IHJlcy5tYXRjaCh0aGlzLmludGVycG9sYXRvci5uZXN0aW5nUmVnZXhwKTtcbiAgICAgICAgLy8gaGFzIG5lc3RpbmcgYWZ0ZXIgaW50ZXJwb2xhdGlvblxuICAgICAgICBjb25zdCBuZXN0QWZ0ID0gbmEgJiYgbmEubGVuZ3RoO1xuICAgICAgICBpZiAobmVzdEJlZiA8IG5lc3RBZnQpIG9wdGlvbnMubmVzdCA9IGZhbHNlO1xuICAgICAgfVxuICAgICAgaWYgKCFvcHRpb25zLmxuZyAmJiByZXNvbHZlZCAmJiByZXNvbHZlZC5yZXMpIG9wdGlvbnMubG5nID0gdGhpcy5sYW5ndWFnZSB8fCByZXNvbHZlZC51c2VkTG5nO1xuICAgICAgaWYgKG9wdGlvbnMubmVzdCAhPT0gZmFsc2UpXG4gICAgICAgIHJlcyA9IHRoaXMuaW50ZXJwb2xhdG9yLm5lc3QoXG4gICAgICAgICAgcmVzLFxuICAgICAgICAgICguLi5hcmdzKSA9PiB7XG4gICAgICAgICAgICBpZiAobGFzdEtleT8uWzBdID09PSBhcmdzWzBdICYmICFvcHRpb25zLmNvbnRleHQpIHtcbiAgICAgICAgICAgICAgdGhpcy5sb2dnZXIud2FybihcbiAgICAgICAgICAgICAgICBgSXQgc2VlbXMgeW91IGFyZSBuZXN0aW5nIHJlY3Vyc2l2ZWx5IGtleTogJHthcmdzWzBdfSBpbiBrZXk6ICR7a2V5WzBdfWAsXG4gICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMudHJhbnNsYXRlKC4uLmFyZ3MsIGtleSk7XG4gICAgICAgICAgfSxcbiAgICAgICAgICBvcHRpb25zLFxuICAgICAgICApO1xuXG4gICAgICBpZiAob3B0aW9ucy5pbnRlcnBvbGF0aW9uKSB0aGlzLmludGVycG9sYXRvci5yZXNldCgpO1xuICAgIH1cblxuICAgIC8vIHBvc3QgcHJvY2Vzc1xuICAgIGNvbnN0IHBvc3RQcm9jZXNzID0gb3B0aW9ucy5wb3N0UHJvY2VzcyB8fCB0aGlzLm9wdGlvbnMucG9zdFByb2Nlc3M7XG4gICAgY29uc3QgcG9zdFByb2Nlc3Nvck5hbWVzID0gaXNTdHJpbmcocG9zdFByb2Nlc3MpID8gW3Bvc3RQcm9jZXNzXSA6IHBvc3RQcm9jZXNzO1xuXG4gICAgaWYgKHJlcyAhPSBudWxsICYmIHBvc3RQcm9jZXNzb3JOYW1lcz8ubGVuZ3RoICYmIG9wdGlvbnMuYXBwbHlQb3N0UHJvY2Vzc29yICE9PSBmYWxzZSkge1xuICAgICAgcmVzID0gcG9zdFByb2Nlc3Nvci5oYW5kbGUoXG4gICAgICAgIHBvc3RQcm9jZXNzb3JOYW1lcyxcbiAgICAgICAgcmVzLFxuICAgICAgICBrZXksXG4gICAgICAgIHRoaXMub3B0aW9ucyAmJiB0aGlzLm9wdGlvbnMucG9zdFByb2Nlc3NQYXNzUmVzb2x2ZWRcbiAgICAgICAgICA/IHtcbiAgICAgICAgICAgICAgaTE4blJlc29sdmVkOiB7IC4uLnJlc29sdmVkLCB1c2VkUGFyYW1zOiB0aGlzLmdldFVzZWRQYXJhbXNEZXRhaWxzKG9wdGlvbnMpIH0sXG4gICAgICAgICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICAgICAgICB9XG4gICAgICAgICAgOiBvcHRpb25zLFxuICAgICAgICB0aGlzLFxuICAgICAgKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmVzO1xuICB9XG5cbiAgcmVzb2x2ZShrZXlzLCBvcHRpb25zID0ge30pIHtcbiAgICBsZXQgZm91bmQ7XG4gICAgbGV0IHVzZWRLZXk7IC8vIHBsYWluIGtleVxuICAgIGxldCBleGFjdFVzZWRLZXk7IC8vIGtleSB3aXRoIGNvbnRleHQgLyBwbHVyYWxcbiAgICBsZXQgdXNlZExuZztcbiAgICBsZXQgdXNlZE5TO1xuXG4gICAgaWYgKGlzU3RyaW5nKGtleXMpKSBrZXlzID0gW2tleXNdO1xuXG4gICAgLy8gZm9yRWFjaCBwb3NzaWJsZSBrZXlcbiAgICBrZXlzLmZvckVhY2goKGspID0+IHtcbiAgICAgIGlmICh0aGlzLmlzVmFsaWRMb29rdXAoZm91bmQpKSByZXR1cm47XG4gICAgICBjb25zdCBleHRyYWN0ZWQgPSB0aGlzLmV4dHJhY3RGcm9tS2V5KGssIG9wdGlvbnMpO1xuICAgICAgY29uc3Qga2V5ID0gZXh0cmFjdGVkLmtleTtcbiAgICAgIHVzZWRLZXkgPSBrZXk7XG4gICAgICBsZXQgbmFtZXNwYWNlcyA9IGV4dHJhY3RlZC5uYW1lc3BhY2VzO1xuICAgICAgaWYgKHRoaXMub3B0aW9ucy5mYWxsYmFja05TKSBuYW1lc3BhY2VzID0gbmFtZXNwYWNlcy5jb25jYXQodGhpcy5vcHRpb25zLmZhbGxiYWNrTlMpO1xuXG4gICAgICBjb25zdCBuZWVkc1BsdXJhbEhhbmRsaW5nID0gb3B0aW9ucy5jb3VudCAhPT0gdW5kZWZpbmVkICYmICFpc1N0cmluZyhvcHRpb25zLmNvdW50KTtcbiAgICAgIGNvbnN0IG5lZWRzWmVyb1N1ZmZpeExvb2t1cCA9IG5lZWRzUGx1cmFsSGFuZGxpbmcgJiYgIW9wdGlvbnMub3JkaW5hbCAmJiBvcHRpb25zLmNvdW50ID09PSAwO1xuICAgICAgY29uc3QgbmVlZHNDb250ZXh0SGFuZGxpbmcgPVxuICAgICAgICBvcHRpb25zLmNvbnRleHQgIT09IHVuZGVmaW5lZCAmJlxuICAgICAgICAoaXNTdHJpbmcob3B0aW9ucy5jb250ZXh0KSB8fCB0eXBlb2Ygb3B0aW9ucy5jb250ZXh0ID09PSAnbnVtYmVyJykgJiZcbiAgICAgICAgb3B0aW9ucy5jb250ZXh0ICE9PSAnJztcblxuICAgICAgY29uc3QgY29kZXMgPSBvcHRpb25zLmxuZ3NcbiAgICAgICAgPyBvcHRpb25zLmxuZ3NcbiAgICAgICAgOiB0aGlzLmxhbmd1YWdlVXRpbHMudG9SZXNvbHZlSGllcmFyY2h5KG9wdGlvbnMubG5nIHx8IHRoaXMubGFuZ3VhZ2UsIG9wdGlvbnMuZmFsbGJhY2tMbmcpO1xuXG4gICAgICBuYW1lc3BhY2VzLmZvckVhY2goKG5zKSA9PiB7XG4gICAgICAgIGlmICh0aGlzLmlzVmFsaWRMb29rdXAoZm91bmQpKSByZXR1cm47XG4gICAgICAgIHVzZWROUyA9IG5zO1xuXG4gICAgICAgIGlmIChcbiAgICAgICAgICAhY2hlY2tlZExvYWRlZEZvcltgJHtjb2Rlc1swXX0tJHtuc31gXSAmJlxuICAgICAgICAgIHRoaXMudXRpbHM/Lmhhc0xvYWRlZE5hbWVzcGFjZSAmJlxuICAgICAgICAgICF0aGlzLnV0aWxzPy5oYXNMb2FkZWROYW1lc3BhY2UodXNlZE5TKVxuICAgICAgICApIHtcbiAgICAgICAgICBjaGVja2VkTG9hZGVkRm9yW2Ake2NvZGVzWzBdfS0ke25zfWBdID0gdHJ1ZTtcbiAgICAgICAgICB0aGlzLmxvZ2dlci53YXJuKFxuICAgICAgICAgICAgYGtleSBcIiR7dXNlZEtleX1cIiBmb3IgbGFuZ3VhZ2VzIFwiJHtjb2Rlcy5qb2luKFxuICAgICAgICAgICAgICAnLCAnLFxuICAgICAgICAgICAgKX1cIiB3b24ndCBnZXQgcmVzb2x2ZWQgYXMgbmFtZXNwYWNlIFwiJHt1c2VkTlN9XCIgd2FzIG5vdCB5ZXQgbG9hZGVkYCxcbiAgICAgICAgICAgICdUaGlzIG1lYW5zIHNvbWV0aGluZyBJUyBXUk9ORyBpbiB5b3VyIHNldHVwLiBZb3UgYWNjZXNzIHRoZSB0IGZ1bmN0aW9uIGJlZm9yZSBpMThuZXh0LmluaXQgLyBpMThuZXh0LmxvYWROYW1lc3BhY2UgLyBpMThuZXh0LmNoYW5nZUxhbmd1YWdlIHdhcyBkb25lLiBXYWl0IGZvciB0aGUgY2FsbGJhY2sgb3IgUHJvbWlzZSB0byByZXNvbHZlIGJlZm9yZSBhY2Nlc3NpbmcgaXQhISEnLFxuICAgICAgICAgICk7XG4gICAgICAgIH1cblxuICAgICAgICBjb2Rlcy5mb3JFYWNoKChjb2RlKSA9PiB7XG4gICAgICAgICAgaWYgKHRoaXMuaXNWYWxpZExvb2t1cChmb3VuZCkpIHJldHVybjtcbiAgICAgICAgICB1c2VkTG5nID0gY29kZTtcblxuICAgICAgICAgIGNvbnN0IGZpbmFsS2V5cyA9IFtrZXldO1xuXG4gICAgICAgICAgaWYgKHRoaXMuaTE4bkZvcm1hdD8uYWRkTG9va3VwS2V5cykge1xuICAgICAgICAgICAgdGhpcy5pMThuRm9ybWF0LmFkZExvb2t1cEtleXMoZmluYWxLZXlzLCBrZXksIGNvZGUsIG5zLCBvcHRpb25zKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbGV0IHBsdXJhbFN1ZmZpeDtcbiAgICAgICAgICAgIGlmIChuZWVkc1BsdXJhbEhhbmRsaW5nKVxuICAgICAgICAgICAgICBwbHVyYWxTdWZmaXggPSB0aGlzLnBsdXJhbFJlc29sdmVyLmdldFN1ZmZpeChjb2RlLCBvcHRpb25zLmNvdW50LCBvcHRpb25zKTtcbiAgICAgICAgICAgIGNvbnN0IHplcm9TdWZmaXggPSBgJHt0aGlzLm9wdGlvbnMucGx1cmFsU2VwYXJhdG9yfXplcm9gO1xuICAgICAgICAgICAgY29uc3Qgb3JkaW5hbFByZWZpeCA9IGAke3RoaXMub3B0aW9ucy5wbHVyYWxTZXBhcmF0b3J9b3JkaW5hbCR7dGhpcy5vcHRpb25zLnBsdXJhbFNlcGFyYXRvcn1gO1xuICAgICAgICAgICAgLy8gZ2V0IGtleSBmb3IgcGx1cmFsIGlmIG5lZWRlZFxuICAgICAgICAgICAgaWYgKG5lZWRzUGx1cmFsSGFuZGxpbmcpIHtcbiAgICAgICAgICAgICAgZmluYWxLZXlzLnB1c2goa2V5ICsgcGx1cmFsU3VmZml4KTtcbiAgICAgICAgICAgICAgaWYgKG9wdGlvbnMub3JkaW5hbCAmJiBwbHVyYWxTdWZmaXguaW5kZXhPZihvcmRpbmFsUHJlZml4KSA9PT0gMCkge1xuICAgICAgICAgICAgICAgIGZpbmFsS2V5cy5wdXNoKFxuICAgICAgICAgICAgICAgICAga2V5ICsgcGx1cmFsU3VmZml4LnJlcGxhY2Uob3JkaW5hbFByZWZpeCwgdGhpcy5vcHRpb25zLnBsdXJhbFNlcGFyYXRvciksXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBpZiAobmVlZHNaZXJvU3VmZml4TG9va3VwKSB7XG4gICAgICAgICAgICAgICAgZmluYWxLZXlzLnB1c2goa2V5ICsgemVyb1N1ZmZpeCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gZ2V0IGtleSBmb3IgY29udGV4dCBpZiBuZWVkZWRcbiAgICAgICAgICAgIGlmIChuZWVkc0NvbnRleHRIYW5kbGluZykge1xuICAgICAgICAgICAgICBjb25zdCBjb250ZXh0S2V5ID0gYCR7a2V5fSR7dGhpcy5vcHRpb25zLmNvbnRleHRTZXBhcmF0b3J9JHtvcHRpb25zLmNvbnRleHR9YDtcbiAgICAgICAgICAgICAgZmluYWxLZXlzLnB1c2goY29udGV4dEtleSk7XG5cbiAgICAgICAgICAgICAgLy8gZ2V0IGtleSBmb3IgY29udGV4dCArIHBsdXJhbCBpZiBuZWVkZWRcbiAgICAgICAgICAgICAgaWYgKG5lZWRzUGx1cmFsSGFuZGxpbmcpIHtcbiAgICAgICAgICAgICAgICBmaW5hbEtleXMucHVzaChjb250ZXh0S2V5ICsgcGx1cmFsU3VmZml4KTtcbiAgICAgICAgICAgICAgICBpZiAob3B0aW9ucy5vcmRpbmFsICYmIHBsdXJhbFN1ZmZpeC5pbmRleE9mKG9yZGluYWxQcmVmaXgpID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICBmaW5hbEtleXMucHVzaChcbiAgICAgICAgICAgICAgICAgICAgY29udGV4dEtleSArIHBsdXJhbFN1ZmZpeC5yZXBsYWNlKG9yZGluYWxQcmVmaXgsIHRoaXMub3B0aW9ucy5wbHVyYWxTZXBhcmF0b3IpLFxuICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKG5lZWRzWmVyb1N1ZmZpeExvb2t1cCkge1xuICAgICAgICAgICAgICAgICAgZmluYWxLZXlzLnB1c2goY29udGV4dEtleSArIHplcm9TdWZmaXgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIGl0ZXJhdGUgb3ZlciBmaW5hbEtleXMgc3RhcnRpbmcgd2l0aCBtb3N0IHNwZWNpZmljIHBsdXJhbGtleSAoLT4gY29udGV4dGtleSBvbmx5KSAtPiBzaW5ndWxhcmtleSBvbmx5XG4gICAgICAgICAgbGV0IHBvc3NpYmxlS2V5O1xuICAgICAgICAgIC8qIGVzbGludCBuby1jb25kLWFzc2lnbjogMCAqL1xuICAgICAgICAgIHdoaWxlICgocG9zc2libGVLZXkgPSBmaW5hbEtleXMucG9wKCkpKSB7XG4gICAgICAgICAgICBpZiAoIXRoaXMuaXNWYWxpZExvb2t1cChmb3VuZCkpIHtcbiAgICAgICAgICAgICAgZXhhY3RVc2VkS2V5ID0gcG9zc2libGVLZXk7XG4gICAgICAgICAgICAgIGZvdW5kID0gdGhpcy5nZXRSZXNvdXJjZShjb2RlLCBucywgcG9zc2libGVLZXksIG9wdGlvbnMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIHJldHVybiB7IHJlczogZm91bmQsIHVzZWRLZXksIGV4YWN0VXNlZEtleSwgdXNlZExuZywgdXNlZE5TIH07XG4gIH1cblxuICBpc1ZhbGlkTG9va3VwKHJlcykge1xuICAgIHJldHVybiAoXG4gICAgICByZXMgIT09IHVuZGVmaW5lZCAmJlxuICAgICAgISghdGhpcy5vcHRpb25zLnJldHVybk51bGwgJiYgcmVzID09PSBudWxsKSAmJlxuICAgICAgISghdGhpcy5vcHRpb25zLnJldHVybkVtcHR5U3RyaW5nICYmIHJlcyA9PT0gJycpXG4gICAgKTtcbiAgfVxuXG4gIGdldFJlc291cmNlKGNvZGUsIG5zLCBrZXksIG9wdGlvbnMgPSB7fSkge1xuICAgIGlmICh0aGlzLmkxOG5Gb3JtYXQ/LmdldFJlc291cmNlKSByZXR1cm4gdGhpcy5pMThuRm9ybWF0LmdldFJlc291cmNlKGNvZGUsIG5zLCBrZXksIG9wdGlvbnMpO1xuICAgIHJldHVybiB0aGlzLnJlc291cmNlU3RvcmUuZ2V0UmVzb3VyY2UoY29kZSwgbnMsIGtleSwgb3B0aW9ucyk7XG4gIH1cblxuICBnZXRVc2VkUGFyYW1zRGV0YWlscyhvcHRpb25zID0ge30pIHtcbiAgICAvLyB3ZSBuZWVkIHRvIHJlbWVtYmVyIHRvIGV4dGVuZCB0aGlzIGFycmF5IHdoZW5ldmVyIG5ldyBvcHRpb24gcHJvcGVydGllcyBhcmUgYWRkZWRcbiAgICBjb25zdCBvcHRpb25zS2V5cyA9IFtcbiAgICAgICdkZWZhdWx0VmFsdWUnLFxuICAgICAgJ29yZGluYWwnLFxuICAgICAgJ2NvbnRleHQnLFxuICAgICAgJ3JlcGxhY2UnLFxuICAgICAgJ2xuZycsXG4gICAgICAnbG5ncycsXG4gICAgICAnZmFsbGJhY2tMbmcnLFxuICAgICAgJ25zJyxcbiAgICAgICdrZXlTZXBhcmF0b3InLFxuICAgICAgJ25zU2VwYXJhdG9yJyxcbiAgICAgICdyZXR1cm5PYmplY3RzJyxcbiAgICAgICdyZXR1cm5EZXRhaWxzJyxcbiAgICAgICdqb2luQXJyYXlzJyxcbiAgICAgICdwb3N0UHJvY2VzcycsXG4gICAgICAnaW50ZXJwb2xhdGlvbicsXG4gICAgXTtcblxuICAgIGNvbnN0IHVzZU9wdGlvbnNSZXBsYWNlRm9yRGF0YSA9IG9wdGlvbnMucmVwbGFjZSAmJiAhaXNTdHJpbmcob3B0aW9ucy5yZXBsYWNlKTtcbiAgICBsZXQgZGF0YSA9IHVzZU9wdGlvbnNSZXBsYWNlRm9yRGF0YSA/IG9wdGlvbnMucmVwbGFjZSA6IG9wdGlvbnM7XG4gICAgaWYgKHVzZU9wdGlvbnNSZXBsYWNlRm9yRGF0YSAmJiB0eXBlb2Ygb3B0aW9ucy5jb3VudCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIGRhdGEuY291bnQgPSBvcHRpb25zLmNvdW50O1xuICAgIH1cblxuICAgIGlmICh0aGlzLm9wdGlvbnMuaW50ZXJwb2xhdGlvbi5kZWZhdWx0VmFyaWFibGVzKSB7XG4gICAgICBkYXRhID0geyAuLi50aGlzLm9wdGlvbnMuaW50ZXJwb2xhdGlvbi5kZWZhdWx0VmFyaWFibGVzLCAuLi5kYXRhIH07XG4gICAgfVxuXG4gICAgLy8gYXZvaWQgcmVwb3J0aW5nIG9wdGlvbnMgKGV4ZWNwdCBjb3VudCkgYXMgdXNlZFBhcmFtc1xuICAgIGlmICghdXNlT3B0aW9uc1JlcGxhY2VGb3JEYXRhKSB7XG4gICAgICBkYXRhID0geyAuLi5kYXRhIH07XG4gICAgICBmb3IgKGNvbnN0IGtleSBvZiBvcHRpb25zS2V5cykge1xuICAgICAgICBkZWxldGUgZGF0YVtrZXldO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBkYXRhO1xuICB9XG5cbiAgc3RhdGljIGhhc0RlZmF1bHRWYWx1ZShvcHRpb25zKSB7XG4gICAgY29uc3QgcHJlZml4ID0gJ2RlZmF1bHRWYWx1ZSc7XG5cbiAgICBmb3IgKGNvbnN0IG9wdGlvbiBpbiBvcHRpb25zKSB7XG4gICAgICBpZiAoXG4gICAgICAgIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvcHRpb25zLCBvcHRpb24pICYmXG4gICAgICAgIHByZWZpeCA9PT0gb3B0aW9uLnN1YnN0cmluZygwLCBwcmVmaXgubGVuZ3RoKSAmJlxuICAgICAgICB1bmRlZmluZWQgIT09IG9wdGlvbnNbb3B0aW9uXVxuICAgICAgKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBUcmFuc2xhdG9yO1xuIiwiaW1wb3J0IGJhc2VMb2dnZXIgZnJvbSAnLi9sb2dnZXIuanMnO1xuaW1wb3J0IHsgZ2V0Q2xlYW5lZENvZGUsIGlzU3RyaW5nIH0gZnJvbSAnLi91dGlscy5qcyc7XG5cbmNsYXNzIExhbmd1YWdlVXRpbCB7XG4gIGNvbnN0cnVjdG9yKG9wdGlvbnMpIHtcbiAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuXG4gICAgdGhpcy5zdXBwb3J0ZWRMbmdzID0gdGhpcy5vcHRpb25zLnN1cHBvcnRlZExuZ3MgfHwgZmFsc2U7XG4gICAgdGhpcy5sb2dnZXIgPSBiYXNlTG9nZ2VyLmNyZWF0ZSgnbGFuZ3VhZ2VVdGlscycpO1xuICB9XG5cbiAgZ2V0U2NyaXB0UGFydEZyb21Db2RlKGNvZGUpIHtcbiAgICBjb2RlID0gZ2V0Q2xlYW5lZENvZGUoY29kZSk7XG4gICAgaWYgKCFjb2RlIHx8IGNvZGUuaW5kZXhPZignLScpIDwgMCkgcmV0dXJuIG51bGw7XG5cbiAgICBjb25zdCBwID0gY29kZS5zcGxpdCgnLScpO1xuICAgIGlmIChwLmxlbmd0aCA9PT0gMikgcmV0dXJuIG51bGw7XG4gICAgcC5wb3AoKTtcbiAgICBpZiAocFtwLmxlbmd0aCAtIDFdLnRvTG93ZXJDYXNlKCkgPT09ICd4JykgcmV0dXJuIG51bGw7XG4gICAgcmV0dXJuIHRoaXMuZm9ybWF0TGFuZ3VhZ2VDb2RlKHAuam9pbignLScpKTtcbiAgfVxuXG4gIGdldExhbmd1YWdlUGFydEZyb21Db2RlKGNvZGUpIHtcbiAgICBjb2RlID0gZ2V0Q2xlYW5lZENvZGUoY29kZSk7XG4gICAgaWYgKCFjb2RlIHx8IGNvZGUuaW5kZXhPZignLScpIDwgMCkgcmV0dXJuIGNvZGU7XG5cbiAgICBjb25zdCBwID0gY29kZS5zcGxpdCgnLScpO1xuICAgIHJldHVybiB0aGlzLmZvcm1hdExhbmd1YWdlQ29kZShwWzBdKTtcbiAgfVxuXG4gIGZvcm1hdExhbmd1YWdlQ29kZShjb2RlKSB7XG4gICAgLy8gaHR0cDovL3d3dy5pYW5hLm9yZy9hc3NpZ25tZW50cy9sYW5ndWFnZS10YWdzL2xhbmd1YWdlLXRhZ3MueGh0bWxcbiAgICBpZiAoaXNTdHJpbmcoY29kZSkgJiYgY29kZS5pbmRleE9mKCctJykgPiAtMSkge1xuICAgICAgbGV0IGZvcm1hdHRlZENvZGU7XG4gICAgICB0cnkge1xuICAgICAgICBmb3JtYXR0ZWRDb2RlID0gSW50bC5nZXRDYW5vbmljYWxMb2NhbGVzKGNvZGUpWzBdO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAvKiBmYWxsIHRocm91Z2ggKi9cbiAgICAgIH1cbiAgICAgIGlmIChmb3JtYXR0ZWRDb2RlICYmIHRoaXMub3B0aW9ucy5sb3dlckNhc2VMbmcpIHtcbiAgICAgICAgZm9ybWF0dGVkQ29kZSA9IGZvcm1hdHRlZENvZGUudG9Mb3dlckNhc2UoKTtcbiAgICAgIH1cbiAgICAgIGlmIChmb3JtYXR0ZWRDb2RlKSByZXR1cm4gZm9ybWF0dGVkQ29kZTtcblxuICAgICAgaWYgKHRoaXMub3B0aW9ucy5sb3dlckNhc2VMbmcpIHtcbiAgICAgICAgcmV0dXJuIGNvZGUudG9Mb3dlckNhc2UoKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGNvZGU7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMub3B0aW9ucy5jbGVhbkNvZGUgfHwgdGhpcy5vcHRpb25zLmxvd2VyQ2FzZUxuZyA/IGNvZGUudG9Mb3dlckNhc2UoKSA6IGNvZGU7XG4gIH1cblxuICBpc1N1cHBvcnRlZENvZGUoY29kZSkge1xuICAgIGlmICh0aGlzLm9wdGlvbnMubG9hZCA9PT0gJ2xhbmd1YWdlT25seScgfHwgdGhpcy5vcHRpb25zLm5vbkV4cGxpY2l0U3VwcG9ydGVkTG5ncykge1xuICAgICAgY29kZSA9IHRoaXMuZ2V0TGFuZ3VhZ2VQYXJ0RnJvbUNvZGUoY29kZSk7XG4gICAgfVxuICAgIHJldHVybiAoXG4gICAgICAhdGhpcy5zdXBwb3J0ZWRMbmdzIHx8ICF0aGlzLnN1cHBvcnRlZExuZ3MubGVuZ3RoIHx8IHRoaXMuc3VwcG9ydGVkTG5ncy5pbmRleE9mKGNvZGUpID4gLTFcbiAgICApO1xuICB9XG5cbiAgZ2V0QmVzdE1hdGNoRnJvbUNvZGVzKGNvZGVzKSB7XG4gICAgaWYgKCFjb2RlcykgcmV0dXJuIG51bGw7XG5cbiAgICBsZXQgZm91bmQ7XG5cbiAgICAvLyBwaWNrIGZpcnN0IHN1cHBvcnRlZCBjb2RlIG9yIGlmIG5vIHJlc3RyaWN0aW9uIHBpY2sgdGhlIGZpcnN0IG9uZSAoaGlnaGVzdCBwcmlvKVxuICAgIGNvZGVzLmZvckVhY2goKGNvZGUpID0+IHtcbiAgICAgIGlmIChmb3VuZCkgcmV0dXJuO1xuICAgICAgY29uc3QgY2xlYW5lZExuZyA9IHRoaXMuZm9ybWF0TGFuZ3VhZ2VDb2RlKGNvZGUpO1xuICAgICAgaWYgKCF0aGlzLm9wdGlvbnMuc3VwcG9ydGVkTG5ncyB8fCB0aGlzLmlzU3VwcG9ydGVkQ29kZShjbGVhbmVkTG5nKSkgZm91bmQgPSBjbGVhbmVkTG5nO1xuICAgIH0pO1xuXG4gICAgLy8gaWYgd2UgZ290IG5vIG1hdGNoIGluIHN1cHBvcnRlZExuZ3MgeWV0IC0gY2hlY2sgZm9yIHNpbWlsYXIgbG9jYWxlc1xuICAgIC8vIGZpcnN0ICBkZS1DSCAtLT4gZGVcbiAgICAvLyBzZWNvbmQgZGUtQ0ggLS0+IGRlLURFXG4gICAgaWYgKCFmb3VuZCAmJiB0aGlzLm9wdGlvbnMuc3VwcG9ydGVkTG5ncykge1xuICAgICAgY29kZXMuZm9yRWFjaCgoY29kZSkgPT4ge1xuICAgICAgICBpZiAoZm91bmQpIHJldHVybjtcblxuICAgICAgICBjb25zdCBsbmdPbmx5ID0gdGhpcy5nZXRMYW5ndWFnZVBhcnRGcm9tQ29kZShjb2RlKTtcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLXJldHVybi1hc3NpZ25cbiAgICAgICAgaWYgKHRoaXMuaXNTdXBwb3J0ZWRDb2RlKGxuZ09ubHkpKSByZXR1cm4gKGZvdW5kID0gbG5nT25seSk7XG5cbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIGFycmF5LWNhbGxiYWNrLXJldHVyblxuICAgICAgICBmb3VuZCA9IHRoaXMub3B0aW9ucy5zdXBwb3J0ZWRMbmdzLmZpbmQoKHN1cHBvcnRlZExuZykgPT4ge1xuICAgICAgICAgIGlmIChzdXBwb3J0ZWRMbmcgPT09IGxuZ09ubHkpIHJldHVybiBzdXBwb3J0ZWRMbmc7XG4gICAgICAgICAgaWYgKHN1cHBvcnRlZExuZy5pbmRleE9mKCctJykgPCAwICYmIGxuZ09ubHkuaW5kZXhPZignLScpIDwgMCkgcmV0dXJuO1xuICAgICAgICAgIGlmIChcbiAgICAgICAgICAgIHN1cHBvcnRlZExuZy5pbmRleE9mKCctJykgPiAwICYmXG4gICAgICAgICAgICBsbmdPbmx5LmluZGV4T2YoJy0nKSA8IDAgJiZcbiAgICAgICAgICAgIHN1cHBvcnRlZExuZy5zdWJzdHJpbmcoMCwgc3VwcG9ydGVkTG5nLmluZGV4T2YoJy0nKSkgPT09IGxuZ09ubHlcbiAgICAgICAgICApXG4gICAgICAgICAgICByZXR1cm4gc3VwcG9ydGVkTG5nO1xuICAgICAgICAgIGlmIChzdXBwb3J0ZWRMbmcuaW5kZXhPZihsbmdPbmx5KSA9PT0gMCAmJiBsbmdPbmx5Lmxlbmd0aCA+IDEpIHJldHVybiBzdXBwb3J0ZWRMbmc7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfVxuICAgIC8vIGlmIG5vdGhpbmcgZm91bmQsIHVzZSBmYWxsYmFja0xuZ1xuICAgIGlmICghZm91bmQpIGZvdW5kID0gdGhpcy5nZXRGYWxsYmFja0NvZGVzKHRoaXMub3B0aW9ucy5mYWxsYmFja0xuZylbMF07XG5cbiAgICByZXR1cm4gZm91bmQ7XG4gIH1cblxuICBnZXRGYWxsYmFja0NvZGVzKGZhbGxiYWNrcywgY29kZSkge1xuICAgIGlmICghZmFsbGJhY2tzKSByZXR1cm4gW107XG4gICAgaWYgKHR5cGVvZiBmYWxsYmFja3MgPT09ICdmdW5jdGlvbicpIGZhbGxiYWNrcyA9IGZhbGxiYWNrcyhjb2RlKTtcbiAgICBpZiAoaXNTdHJpbmcoZmFsbGJhY2tzKSkgZmFsbGJhY2tzID0gW2ZhbGxiYWNrc107XG4gICAgaWYgKEFycmF5LmlzQXJyYXkoZmFsbGJhY2tzKSkgcmV0dXJuIGZhbGxiYWNrcztcblxuICAgIGlmICghY29kZSkgcmV0dXJuIGZhbGxiYWNrcy5kZWZhdWx0IHx8IFtdO1xuXG4gICAgLy8gYXNzdW1lIHdlIGhhdmUgYW4gb2JqZWN0IGRlZmluaW5nIGZhbGxiYWNrc1xuICAgIGxldCBmb3VuZCA9IGZhbGxiYWNrc1tjb2RlXTtcbiAgICBpZiAoIWZvdW5kKSBmb3VuZCA9IGZhbGxiYWNrc1t0aGlzLmdldFNjcmlwdFBhcnRGcm9tQ29kZShjb2RlKV07XG4gICAgaWYgKCFmb3VuZCkgZm91bmQgPSBmYWxsYmFja3NbdGhpcy5mb3JtYXRMYW5ndWFnZUNvZGUoY29kZSldO1xuICAgIGlmICghZm91bmQpIGZvdW5kID0gZmFsbGJhY2tzW3RoaXMuZ2V0TGFuZ3VhZ2VQYXJ0RnJvbUNvZGUoY29kZSldO1xuICAgIGlmICghZm91bmQpIGZvdW5kID0gZmFsbGJhY2tzLmRlZmF1bHQ7XG5cbiAgICByZXR1cm4gZm91bmQgfHwgW107XG4gIH1cblxuICB0b1Jlc29sdmVIaWVyYXJjaHkoY29kZSwgZmFsbGJhY2tDb2RlKSB7XG4gICAgY29uc3QgZmFsbGJhY2tDb2RlcyA9IHRoaXMuZ2V0RmFsbGJhY2tDb2RlcyhcbiAgICAgIGZhbGxiYWNrQ29kZSB8fCB0aGlzLm9wdGlvbnMuZmFsbGJhY2tMbmcgfHwgW10sXG4gICAgICBjb2RlLFxuICAgICk7XG5cbiAgICBjb25zdCBjb2RlcyA9IFtdO1xuICAgIGNvbnN0IGFkZENvZGUgPSAoYykgPT4ge1xuICAgICAgaWYgKCFjKSByZXR1cm47XG4gICAgICBpZiAodGhpcy5pc1N1cHBvcnRlZENvZGUoYykpIHtcbiAgICAgICAgY29kZXMucHVzaChjKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMubG9nZ2VyLndhcm4oYHJlamVjdGluZyBsYW5ndWFnZSBjb2RlIG5vdCBmb3VuZCBpbiBzdXBwb3J0ZWRMbmdzOiAke2N9YCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIGlmIChpc1N0cmluZyhjb2RlKSAmJiAoY29kZS5pbmRleE9mKCctJykgPiAtMSB8fCBjb2RlLmluZGV4T2YoJ18nKSA+IC0xKSkge1xuICAgICAgaWYgKHRoaXMub3B0aW9ucy5sb2FkICE9PSAnbGFuZ3VhZ2VPbmx5JykgYWRkQ29kZSh0aGlzLmZvcm1hdExhbmd1YWdlQ29kZShjb2RlKSk7XG4gICAgICBpZiAodGhpcy5vcHRpb25zLmxvYWQgIT09ICdsYW5ndWFnZU9ubHknICYmIHRoaXMub3B0aW9ucy5sb2FkICE9PSAnY3VycmVudE9ubHknKVxuICAgICAgICBhZGRDb2RlKHRoaXMuZ2V0U2NyaXB0UGFydEZyb21Db2RlKGNvZGUpKTtcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMubG9hZCAhPT0gJ2N1cnJlbnRPbmx5JykgYWRkQ29kZSh0aGlzLmdldExhbmd1YWdlUGFydEZyb21Db2RlKGNvZGUpKTtcbiAgICB9IGVsc2UgaWYgKGlzU3RyaW5nKGNvZGUpKSB7XG4gICAgICBhZGRDb2RlKHRoaXMuZm9ybWF0TGFuZ3VhZ2VDb2RlKGNvZGUpKTtcbiAgICB9XG5cbiAgICBmYWxsYmFja0NvZGVzLmZvckVhY2goKGZjKSA9PiB7XG4gICAgICBpZiAoY29kZXMuaW5kZXhPZihmYykgPCAwKSBhZGRDb2RlKHRoaXMuZm9ybWF0TGFuZ3VhZ2VDb2RlKGZjKSk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gY29kZXM7XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgTGFuZ3VhZ2VVdGlsO1xuIiwiaW1wb3J0IGJhc2VMb2dnZXIgZnJvbSAnLi9sb2dnZXIuanMnO1xuaW1wb3J0IHsgZ2V0Q2xlYW5lZENvZGUgfSBmcm9tICcuL3V0aWxzLmpzJ1xuXG5jb25zdCBzdWZmaXhlc09yZGVyID0ge1xuICB6ZXJvOiAwLFxuICBvbmU6IDEsXG4gIHR3bzogMixcbiAgZmV3OiAzLFxuICBtYW55OiA0LFxuICBvdGhlcjogNSxcbn07XG5cbmNvbnN0IGR1bW15UnVsZSA9IHtcbiAgc2VsZWN0OiAoY291bnQpID0+IGNvdW50ID09PSAxID8gJ29uZScgOiAnb3RoZXInLFxuICByZXNvbHZlZE9wdGlvbnM6ICgpID0+ICh7XG4gICAgcGx1cmFsQ2F0ZWdvcmllczogWydvbmUnLCAnb3RoZXInXVxuICB9KVxufTtcblxuY2xhc3MgUGx1cmFsUmVzb2x2ZXIge1xuICBjb25zdHJ1Y3RvcihsYW5ndWFnZVV0aWxzLCBvcHRpb25zID0ge30pIHtcbiAgICB0aGlzLmxhbmd1YWdlVXRpbHMgPSBsYW5ndWFnZVV0aWxzO1xuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG5cbiAgICB0aGlzLmxvZ2dlciA9IGJhc2VMb2dnZXIuY3JlYXRlKCdwbHVyYWxSZXNvbHZlcicpO1xuXG4gICAgLy8gQ2FjaGUgY2FsbHMgdG8gSW50bC5QbHVyYWxSdWxlcywgc2luY2UgcmVwZWF0ZWQgY2FsbHMgY2FuIGJlIHNsb3cgaW4gcnVudGltZXMgbGlrZSBSZWFjdCBOYXRpdmVcbiAgICAvLyBhbmQgdGhlIG1lbW9yeSB1c2FnZSBkaWZmZXJlbmNlIGlzIG5lZ2xpZ2libGVcbiAgICB0aGlzLnBsdXJhbFJ1bGVzQ2FjaGUgPSB7fTtcbiAgfVxuXG4gIGFkZFJ1bGUobG5nLCBvYmopIHtcbiAgICB0aGlzLnJ1bGVzW2xuZ10gPSBvYmo7XG4gIH1cblxuICBjbGVhckNhY2hlKCkge1xuICAgIHRoaXMucGx1cmFsUnVsZXNDYWNoZSA9IHt9O1xuICB9XG5cbiAgZ2V0UnVsZShjb2RlLCBvcHRpb25zID0ge30pIHtcbiAgICBjb25zdCBjbGVhbmVkQ29kZSA9IGdldENsZWFuZWRDb2RlKGNvZGUgPT09ICdkZXYnID8gJ2VuJyA6IGNvZGUpO1xuICAgIGNvbnN0IHR5cGUgPSBvcHRpb25zLm9yZGluYWwgPyAnb3JkaW5hbCcgOiAnY2FyZGluYWwnO1xuICAgIGNvbnN0IGNhY2hlS2V5ID0gSlNPTi5zdHJpbmdpZnkoeyBjbGVhbmVkQ29kZSwgdHlwZSB9KTtcblxuICAgIGlmIChjYWNoZUtleSBpbiB0aGlzLnBsdXJhbFJ1bGVzQ2FjaGUpIHtcbiAgICAgIHJldHVybiB0aGlzLnBsdXJhbFJ1bGVzQ2FjaGVbY2FjaGVLZXldO1xuICAgIH1cblxuICAgIGxldCBydWxlO1xuXG4gICAgdHJ5IHtcbiAgICAgIHJ1bGUgPSBuZXcgSW50bC5QbHVyYWxSdWxlcyhjbGVhbmVkQ29kZSwgeyB0eXBlIH0pO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgaWYgKCFJbnRsKSB7XG4gICAgICAgIHRoaXMubG9nZ2VyLmVycm9yKCdObyBJbnRsIHN1cHBvcnQsIHBsZWFzZSB1c2UgYW4gSW50bCBwb2x5ZmlsbCEnKTtcbiAgICAgICAgcmV0dXJuIGR1bW15UnVsZTtcbiAgICAgIH1cbiAgICAgIGlmICghY29kZS5tYXRjaCgvLXxfLykpIHJldHVybiBkdW1teVJ1bGU7XG4gICAgICBjb25zdCBsbmdQYXJ0ID0gdGhpcy5sYW5ndWFnZVV0aWxzLmdldExhbmd1YWdlUGFydEZyb21Db2RlKGNvZGUpO1xuICAgICAgcnVsZSA9IHRoaXMuZ2V0UnVsZShsbmdQYXJ0LCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICB0aGlzLnBsdXJhbFJ1bGVzQ2FjaGVbY2FjaGVLZXldID0gcnVsZTtcbiAgICByZXR1cm4gcnVsZTtcbiAgfVxuXG4gIG5lZWRzUGx1cmFsKGNvZGUsIG9wdGlvbnMgPSB7fSkge1xuICAgIGxldCBydWxlID0gdGhpcy5nZXRSdWxlKGNvZGUsIG9wdGlvbnMpO1xuICAgIGlmICghcnVsZSkgcnVsZSA9IHRoaXMuZ2V0UnVsZSgnZGV2Jywgb3B0aW9ucyk7XG4gICAgcmV0dXJuIHJ1bGU/LnJlc29sdmVkT3B0aW9ucygpLnBsdXJhbENhdGVnb3JpZXMubGVuZ3RoID4gMTtcbiAgfVxuXG4gIGdldFBsdXJhbEZvcm1zT2ZLZXkoY29kZSwga2V5LCBvcHRpb25zID0ge30pIHtcbiAgICByZXR1cm4gdGhpcy5nZXRTdWZmaXhlcyhjb2RlLCBvcHRpb25zKS5tYXAoKHN1ZmZpeCkgPT4gYCR7a2V5fSR7c3VmZml4fWApO1xuICB9XG5cbiAgZ2V0U3VmZml4ZXMoY29kZSwgb3B0aW9ucyA9IHt9KSB7XG4gICAgbGV0IHJ1bGUgPSB0aGlzLmdldFJ1bGUoY29kZSwgb3B0aW9ucyk7XG4gICAgaWYgKCFydWxlKSBydWxlID0gdGhpcy5nZXRSdWxlKCdkZXYnLCBvcHRpb25zKTtcbiAgICBpZiAoIXJ1bGUpIHJldHVybiBbXTtcblxuICAgIHJldHVybiBydWxlLnJlc29sdmVkT3B0aW9ucygpLnBsdXJhbENhdGVnb3JpZXNcbiAgICAgIC5zb3J0KChwbHVyYWxDYXRlZ29yeTEsIHBsdXJhbENhdGVnb3J5MikgPT4gc3VmZml4ZXNPcmRlcltwbHVyYWxDYXRlZ29yeTFdIC0gc3VmZml4ZXNPcmRlcltwbHVyYWxDYXRlZ29yeTJdKVxuICAgICAgLm1hcChwbHVyYWxDYXRlZ29yeSA9PiBgJHt0aGlzLm9wdGlvbnMucHJlcGVuZH0ke29wdGlvbnMub3JkaW5hbCA/IGBvcmRpbmFsJHt0aGlzLm9wdGlvbnMucHJlcGVuZH1gIDogJyd9JHtwbHVyYWxDYXRlZ29yeX1gKTtcbiAgfVxuXG4gIGdldFN1ZmZpeChjb2RlLCBjb3VudCwgb3B0aW9ucyA9IHt9KSB7XG4gICAgY29uc3QgcnVsZSA9IHRoaXMuZ2V0UnVsZShjb2RlLCBvcHRpb25zKTtcblxuICAgIGlmIChydWxlKSB7XG4gICAgICByZXR1cm4gYCR7dGhpcy5vcHRpb25zLnByZXBlbmR9JHtvcHRpb25zLm9yZGluYWwgPyBgb3JkaW5hbCR7dGhpcy5vcHRpb25zLnByZXBlbmR9YCA6ICcnfSR7cnVsZS5zZWxlY3QoY291bnQpfWA7XG4gICAgfVxuXG4gICAgdGhpcy5sb2dnZXIud2Fybihgbm8gcGx1cmFsIHJ1bGUgZm91bmQgZm9yOiAke2NvZGV9YCk7XG4gICAgcmV0dXJuIHRoaXMuZ2V0U3VmZml4KCdkZXYnLCBjb3VudCwgb3B0aW9ucyk7XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgUGx1cmFsUmVzb2x2ZXI7XG4iLCJpbXBvcnQge1xuICBnZXRQYXRoV2l0aERlZmF1bHRzLFxuICBkZWVwRmluZCxcbiAgZXNjYXBlIGFzIHV0aWxzRXNjYXBlLFxuICByZWdleEVzY2FwZSxcbiAgbWFrZVN0cmluZyxcbiAgaXNTdHJpbmcsXG59IGZyb20gJy4vdXRpbHMuanMnO1xuaW1wb3J0IGJhc2VMb2dnZXIgZnJvbSAnLi9sb2dnZXIuanMnO1xuXG5jb25zdCBkZWVwRmluZFdpdGhEZWZhdWx0cyA9IChcbiAgZGF0YSxcbiAgZGVmYXVsdERhdGEsXG4gIGtleSxcbiAga2V5U2VwYXJhdG9yID0gJy4nLFxuICBpZ25vcmVKU09OU3RydWN0dXJlID0gdHJ1ZSxcbikgPT4ge1xuICBsZXQgcGF0aCA9IGdldFBhdGhXaXRoRGVmYXVsdHMoZGF0YSwgZGVmYXVsdERhdGEsIGtleSk7XG4gIGlmICghcGF0aCAmJiBpZ25vcmVKU09OU3RydWN0dXJlICYmIGlzU3RyaW5nKGtleSkpIHtcbiAgICBwYXRoID0gZGVlcEZpbmQoZGF0YSwga2V5LCBrZXlTZXBhcmF0b3IpO1xuICAgIGlmIChwYXRoID09PSB1bmRlZmluZWQpIHBhdGggPSBkZWVwRmluZChkZWZhdWx0RGF0YSwga2V5LCBrZXlTZXBhcmF0b3IpO1xuICB9XG4gIHJldHVybiBwYXRoO1xufTtcblxuY29uc3QgcmVnZXhTYWZlID0gKHZhbCkgPT4gdmFsLnJlcGxhY2UoL1xcJC9nLCAnJCQkJCcpO1xuXG5jbGFzcyBJbnRlcnBvbGF0b3Ige1xuICBjb25zdHJ1Y3RvcihvcHRpb25zID0ge30pIHtcbiAgICB0aGlzLmxvZ2dlciA9IGJhc2VMb2dnZXIuY3JlYXRlKCdpbnRlcnBvbGF0b3InKTtcblxuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG4gICAgdGhpcy5mb3JtYXQgPSBvcHRpb25zPy5pbnRlcnBvbGF0aW9uPy5mb3JtYXQgfHwgKCh2YWx1ZSkgPT4gdmFsdWUpO1xuICAgIHRoaXMuaW5pdChvcHRpb25zKTtcbiAgfVxuXG4gIC8qIGVzbGludCBuby1wYXJhbS1yZWFzc2lnbjogMCAqL1xuICBpbml0KG9wdGlvbnMgPSB7fSkge1xuICAgIGlmICghb3B0aW9ucy5pbnRlcnBvbGF0aW9uKSBvcHRpb25zLmludGVycG9sYXRpb24gPSB7IGVzY2FwZVZhbHVlOiB0cnVlIH07XG5cbiAgICBjb25zdCB7XG4gICAgICBlc2NhcGUsXG4gICAgICBlc2NhcGVWYWx1ZSxcbiAgICAgIHVzZVJhd1ZhbHVlVG9Fc2NhcGUsXG4gICAgICBwcmVmaXgsXG4gICAgICBwcmVmaXhFc2NhcGVkLFxuICAgICAgc3VmZml4LFxuICAgICAgc3VmZml4RXNjYXBlZCxcbiAgICAgIGZvcm1hdFNlcGFyYXRvcixcbiAgICAgIHVuZXNjYXBlU3VmZml4LFxuICAgICAgdW5lc2NhcGVQcmVmaXgsXG4gICAgICBuZXN0aW5nUHJlZml4LFxuICAgICAgbmVzdGluZ1ByZWZpeEVzY2FwZWQsXG4gICAgICBuZXN0aW5nU3VmZml4LFxuICAgICAgbmVzdGluZ1N1ZmZpeEVzY2FwZWQsXG4gICAgICBuZXN0aW5nT3B0aW9uc1NlcGFyYXRvcixcbiAgICAgIG1heFJlcGxhY2VzLFxuICAgICAgYWx3YXlzRm9ybWF0LFxuICAgIH0gPSBvcHRpb25zLmludGVycG9sYXRpb247XG5cbiAgICB0aGlzLmVzY2FwZSA9IGVzY2FwZSAhPT0gdW5kZWZpbmVkID8gZXNjYXBlIDogdXRpbHNFc2NhcGU7XG4gICAgdGhpcy5lc2NhcGVWYWx1ZSA9IGVzY2FwZVZhbHVlICE9PSB1bmRlZmluZWQgPyBlc2NhcGVWYWx1ZSA6IHRydWU7XG4gICAgdGhpcy51c2VSYXdWYWx1ZVRvRXNjYXBlID0gdXNlUmF3VmFsdWVUb0VzY2FwZSAhPT0gdW5kZWZpbmVkID8gdXNlUmF3VmFsdWVUb0VzY2FwZSA6IGZhbHNlO1xuXG4gICAgdGhpcy5wcmVmaXggPSBwcmVmaXggPyByZWdleEVzY2FwZShwcmVmaXgpIDogcHJlZml4RXNjYXBlZCB8fCAne3snO1xuICAgIHRoaXMuc3VmZml4ID0gc3VmZml4ID8gcmVnZXhFc2NhcGUoc3VmZml4KSA6IHN1ZmZpeEVzY2FwZWQgfHwgJ319JztcblxuICAgIHRoaXMuZm9ybWF0U2VwYXJhdG9yID0gZm9ybWF0U2VwYXJhdG9yIHx8ICcsJztcblxuICAgIHRoaXMudW5lc2NhcGVQcmVmaXggPSB1bmVzY2FwZVN1ZmZpeCA/ICcnIDogdW5lc2NhcGVQcmVmaXggfHwgJy0nO1xuICAgIHRoaXMudW5lc2NhcGVTdWZmaXggPSB0aGlzLnVuZXNjYXBlUHJlZml4ID8gJycgOiB1bmVzY2FwZVN1ZmZpeCB8fCAnJztcblxuICAgIHRoaXMubmVzdGluZ1ByZWZpeCA9IG5lc3RpbmdQcmVmaXhcbiAgICAgID8gcmVnZXhFc2NhcGUobmVzdGluZ1ByZWZpeClcbiAgICAgIDogbmVzdGluZ1ByZWZpeEVzY2FwZWQgfHwgcmVnZXhFc2NhcGUoJyR0KCcpO1xuICAgIHRoaXMubmVzdGluZ1N1ZmZpeCA9IG5lc3RpbmdTdWZmaXhcbiAgICAgID8gcmVnZXhFc2NhcGUobmVzdGluZ1N1ZmZpeClcbiAgICAgIDogbmVzdGluZ1N1ZmZpeEVzY2FwZWQgfHwgcmVnZXhFc2NhcGUoJyknKTtcblxuICAgIHRoaXMubmVzdGluZ09wdGlvbnNTZXBhcmF0b3IgPSBuZXN0aW5nT3B0aW9uc1NlcGFyYXRvciB8fCAnLCc7XG5cbiAgICB0aGlzLm1heFJlcGxhY2VzID0gbWF4UmVwbGFjZXMgfHwgMTAwMDtcblxuICAgIHRoaXMuYWx3YXlzRm9ybWF0ID0gYWx3YXlzRm9ybWF0ICE9PSB1bmRlZmluZWQgPyBhbHdheXNGb3JtYXQgOiBmYWxzZTtcblxuICAgIC8vIHRoZSByZWdleHBcbiAgICB0aGlzLnJlc2V0UmVnRXhwKCk7XG4gIH1cblxuICByZXNldCgpIHtcbiAgICBpZiAodGhpcy5vcHRpb25zKSB0aGlzLmluaXQodGhpcy5vcHRpb25zKTtcbiAgfVxuXG4gIHJlc2V0UmVnRXhwKCkge1xuICAgIGNvbnN0IGdldE9yUmVzZXRSZWdFeHAgPSAoZXhpc3RpbmdSZWdFeHAsIHBhdHRlcm4pID0+IHtcbiAgICAgIGlmIChleGlzdGluZ1JlZ0V4cD8uc291cmNlID09PSBwYXR0ZXJuKSB7XG4gICAgICAgIGV4aXN0aW5nUmVnRXhwLmxhc3RJbmRleCA9IDA7XG4gICAgICAgIHJldHVybiBleGlzdGluZ1JlZ0V4cDtcbiAgICAgIH1cbiAgICAgIHJldHVybiBuZXcgUmVnRXhwKHBhdHRlcm4sICdnJyk7XG4gICAgfTtcblxuICAgIHRoaXMucmVnZXhwID0gZ2V0T3JSZXNldFJlZ0V4cCh0aGlzLnJlZ2V4cCwgYCR7dGhpcy5wcmVmaXh9KC4rPykke3RoaXMuc3VmZml4fWApO1xuICAgIHRoaXMucmVnZXhwVW5lc2NhcGUgPSBnZXRPclJlc2V0UmVnRXhwKFxuICAgICAgdGhpcy5yZWdleHBVbmVzY2FwZSxcbiAgICAgIGAke3RoaXMucHJlZml4fSR7dGhpcy51bmVzY2FwZVByZWZpeH0oLis/KSR7dGhpcy51bmVzY2FwZVN1ZmZpeH0ke3RoaXMuc3VmZml4fWAsXG4gICAgKTtcbiAgICB0aGlzLm5lc3RpbmdSZWdleHAgPSBnZXRPclJlc2V0UmVnRXhwKFxuICAgICAgdGhpcy5uZXN0aW5nUmVnZXhwLFxuICAgICAgYCR7dGhpcy5uZXN0aW5nUHJlZml4fSguKz8pJHt0aGlzLm5lc3RpbmdTdWZmaXh9YCxcbiAgICApO1xuICB9XG5cbiAgaW50ZXJwb2xhdGUoc3RyLCBkYXRhLCBsbmcsIG9wdGlvbnMpIHtcbiAgICBsZXQgbWF0Y2g7XG4gICAgbGV0IHZhbHVlO1xuICAgIGxldCByZXBsYWNlcztcblxuICAgIGNvbnN0IGRlZmF1bHREYXRhID1cbiAgICAgICh0aGlzLm9wdGlvbnMgJiYgdGhpcy5vcHRpb25zLmludGVycG9sYXRpb24gJiYgdGhpcy5vcHRpb25zLmludGVycG9sYXRpb24uZGVmYXVsdFZhcmlhYmxlcykgfHxcbiAgICAgIHt9O1xuXG4gICAgY29uc3QgaGFuZGxlRm9ybWF0ID0gKGtleSkgPT4ge1xuICAgICAgaWYgKGtleS5pbmRleE9mKHRoaXMuZm9ybWF0U2VwYXJhdG9yKSA8IDApIHtcbiAgICAgICAgY29uc3QgcGF0aCA9IGRlZXBGaW5kV2l0aERlZmF1bHRzKFxuICAgICAgICAgIGRhdGEsXG4gICAgICAgICAgZGVmYXVsdERhdGEsXG4gICAgICAgICAga2V5LFxuICAgICAgICAgIHRoaXMub3B0aW9ucy5rZXlTZXBhcmF0b3IsXG4gICAgICAgICAgdGhpcy5vcHRpb25zLmlnbm9yZUpTT05TdHJ1Y3R1cmUsXG4gICAgICAgICk7XG4gICAgICAgIHJldHVybiB0aGlzLmFsd2F5c0Zvcm1hdFxuICAgICAgICAgID8gdGhpcy5mb3JtYXQocGF0aCwgdW5kZWZpbmVkLCBsbmcsIHsgLi4ub3B0aW9ucywgLi4uZGF0YSwgaW50ZXJwb2xhdGlvbmtleToga2V5IH0pXG4gICAgICAgICAgOiBwYXRoO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBwID0ga2V5LnNwbGl0KHRoaXMuZm9ybWF0U2VwYXJhdG9yKTtcbiAgICAgIGNvbnN0IGsgPSBwLnNoaWZ0KCkudHJpbSgpO1xuICAgICAgY29uc3QgZiA9IHAuam9pbih0aGlzLmZvcm1hdFNlcGFyYXRvcikudHJpbSgpO1xuXG4gICAgICByZXR1cm4gdGhpcy5mb3JtYXQoXG4gICAgICAgIGRlZXBGaW5kV2l0aERlZmF1bHRzKFxuICAgICAgICAgIGRhdGEsXG4gICAgICAgICAgZGVmYXVsdERhdGEsXG4gICAgICAgICAgayxcbiAgICAgICAgICB0aGlzLm9wdGlvbnMua2V5U2VwYXJhdG9yLFxuICAgICAgICAgIHRoaXMub3B0aW9ucy5pZ25vcmVKU09OU3RydWN0dXJlLFxuICAgICAgICApLFxuICAgICAgICBmLFxuICAgICAgICBsbmcsXG4gICAgICAgIHtcbiAgICAgICAgICAuLi5vcHRpb25zLFxuICAgICAgICAgIC4uLmRhdGEsXG4gICAgICAgICAgaW50ZXJwb2xhdGlvbmtleTogayxcbiAgICAgICAgfSxcbiAgICAgICk7XG4gICAgfTtcblxuICAgIHRoaXMucmVzZXRSZWdFeHAoKTtcblxuICAgIGNvbnN0IG1pc3NpbmdJbnRlcnBvbGF0aW9uSGFuZGxlciA9XG4gICAgICBvcHRpb25zPy5taXNzaW5nSW50ZXJwb2xhdGlvbkhhbmRsZXIgfHwgdGhpcy5vcHRpb25zLm1pc3NpbmdJbnRlcnBvbGF0aW9uSGFuZGxlcjtcblxuICAgIGNvbnN0IHNraXBPblZhcmlhYmxlcyA9XG4gICAgICBvcHRpb25zPy5pbnRlcnBvbGF0aW9uPy5za2lwT25WYXJpYWJsZXMgIT09IHVuZGVmaW5lZFxuICAgICAgICA/IG9wdGlvbnMuaW50ZXJwb2xhdGlvbi5za2lwT25WYXJpYWJsZXNcbiAgICAgICAgOiB0aGlzLm9wdGlvbnMuaW50ZXJwb2xhdGlvbi5za2lwT25WYXJpYWJsZXM7XG5cbiAgICBjb25zdCB0b2RvcyA9IFtcbiAgICAgIHtcbiAgICAgICAgLy8gdW5lc2NhcGUgaWYgaGFzIHVuZXNjYXBlUHJlZml4L1N1ZmZpeFxuICAgICAgICByZWdleDogdGhpcy5yZWdleHBVbmVzY2FwZSxcbiAgICAgICAgc2FmZVZhbHVlOiAodmFsKSA9PiByZWdleFNhZmUodmFsKSxcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIC8vIHJlZ3VsYXIgZXNjYXBlIG9uIGRlbWFuZFxuICAgICAgICByZWdleDogdGhpcy5yZWdleHAsXG4gICAgICAgIHNhZmVWYWx1ZTogKHZhbCkgPT4gKHRoaXMuZXNjYXBlVmFsdWUgPyByZWdleFNhZmUodGhpcy5lc2NhcGUodmFsKSkgOiByZWdleFNhZmUodmFsKSksXG4gICAgICB9LFxuICAgIF07XG4gICAgdG9kb3MuZm9yRWFjaCgodG9kbykgPT4ge1xuICAgICAgcmVwbGFjZXMgPSAwO1xuICAgICAgLyogZXNsaW50IG5vLWNvbmQtYXNzaWduOiAwICovXG4gICAgICB3aGlsZSAoKG1hdGNoID0gdG9kby5yZWdleC5leGVjKHN0cikpKSB7XG4gICAgICAgIGNvbnN0IG1hdGNoZWRWYXIgPSBtYXRjaFsxXS50cmltKCk7XG4gICAgICAgIHZhbHVlID0gaGFuZGxlRm9ybWF0KG1hdGNoZWRWYXIpO1xuICAgICAgICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGlmICh0eXBlb2YgbWlzc2luZ0ludGVycG9sYXRpb25IYW5kbGVyID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjb25zdCB0ZW1wID0gbWlzc2luZ0ludGVycG9sYXRpb25IYW5kbGVyKHN0ciwgbWF0Y2gsIG9wdGlvbnMpO1xuICAgICAgICAgICAgdmFsdWUgPSBpc1N0cmluZyh0ZW1wKSA/IHRlbXAgOiAnJztcbiAgICAgICAgICB9IGVsc2UgaWYgKG9wdGlvbnMgJiYgT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9wdGlvbnMsIG1hdGNoZWRWYXIpKSB7XG4gICAgICAgICAgICB2YWx1ZSA9ICcnOyAvLyB1bmRlZmluZWQgYmVjb21lcyBlbXB0eSBzdHJpbmdcbiAgICAgICAgICB9IGVsc2UgaWYgKHNraXBPblZhcmlhYmxlcykge1xuICAgICAgICAgICAgdmFsdWUgPSBtYXRjaFswXTtcbiAgICAgICAgICAgIGNvbnRpbnVlOyAvLyB0aGlzIG1ha2VzIHN1cmUgaXQgY29udGludWVzIHRvIGRldGVjdCBvdGhlcnNcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5sb2dnZXIud2FybihgbWlzc2VkIHRvIHBhc3MgaW4gdmFyaWFibGUgJHttYXRjaGVkVmFyfSBmb3IgaW50ZXJwb2xhdGluZyAke3N0cn1gKTtcbiAgICAgICAgICAgIHZhbHVlID0gJyc7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKCFpc1N0cmluZyh2YWx1ZSkgJiYgIXRoaXMudXNlUmF3VmFsdWVUb0VzY2FwZSkge1xuICAgICAgICAgIHZhbHVlID0gbWFrZVN0cmluZyh2YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3Qgc2FmZVZhbHVlID0gdG9kby5zYWZlVmFsdWUodmFsdWUpO1xuICAgICAgICBzdHIgPSBzdHIucmVwbGFjZShtYXRjaFswXSwgc2FmZVZhbHVlKTtcbiAgICAgICAgaWYgKHNraXBPblZhcmlhYmxlcykge1xuICAgICAgICAgIHRvZG8ucmVnZXgubGFzdEluZGV4ICs9IHZhbHVlLmxlbmd0aDtcbiAgICAgICAgICB0b2RvLnJlZ2V4Lmxhc3RJbmRleCAtPSBtYXRjaFswXS5sZW5ndGg7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdG9kby5yZWdleC5sYXN0SW5kZXggPSAwO1xuICAgICAgICB9XG4gICAgICAgIHJlcGxhY2VzKys7XG4gICAgICAgIGlmIChyZXBsYWNlcyA+PSB0aGlzLm1heFJlcGxhY2VzKSB7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gc3RyO1xuICB9XG5cbiAgbmVzdChzdHIsIGZjLCBvcHRpb25zID0ge30pIHtcbiAgICBsZXQgbWF0Y2g7XG4gICAgbGV0IHZhbHVlO1xuXG4gICAgbGV0IGNsb25lZE9wdGlvbnM7XG5cbiAgICAvLyBpZiB2YWx1ZSBpcyBzb21ldGhpbmcgbGlrZSBcIm15S2V5XCI6IFwibG9yZW0gJChhbm90aGVyS2V5LCB7IFwiY291bnRcIjoge3thVmFsdWVJbk9wdGlvbnN9fSB9KVwiXG4gICAgY29uc3QgaGFuZGxlSGFzT3B0aW9ucyA9IChrZXksIGluaGVyaXRlZE9wdGlvbnMpID0+IHtcbiAgICAgIGNvbnN0IHNlcCA9IHRoaXMubmVzdGluZ09wdGlvbnNTZXBhcmF0b3I7XG4gICAgICBpZiAoa2V5LmluZGV4T2Yoc2VwKSA8IDApIHJldHVybiBrZXk7XG5cbiAgICAgIGNvbnN0IGMgPSBrZXkuc3BsaXQobmV3IFJlZ0V4cChgJHtzZXB9WyBdKntgKSk7XG5cbiAgICAgIGxldCBvcHRpb25zU3RyaW5nID0gYHske2NbMV19YDtcbiAgICAgIGtleSA9IGNbMF07XG4gICAgICBvcHRpb25zU3RyaW5nID0gdGhpcy5pbnRlcnBvbGF0ZShvcHRpb25zU3RyaW5nLCBjbG9uZWRPcHRpb25zKTtcbiAgICAgIGNvbnN0IG1hdGNoZWRTaW5nbGVRdW90ZXMgPSBvcHRpb25zU3RyaW5nLm1hdGNoKC8nL2cpO1xuICAgICAgY29uc3QgbWF0Y2hlZERvdWJsZVF1b3RlcyA9IG9wdGlvbnNTdHJpbmcubWF0Y2goL1wiL2cpO1xuICAgICAgaWYgKFxuICAgICAgICAoKG1hdGNoZWRTaW5nbGVRdW90ZXM/Lmxlbmd0aCA/PyAwKSAlIDIgPT09IDAgJiYgIW1hdGNoZWREb3VibGVRdW90ZXMpIHx8XG4gICAgICAgIG1hdGNoZWREb3VibGVRdW90ZXMubGVuZ3RoICUgMiAhPT0gMFxuICAgICAgKSB7XG4gICAgICAgIG9wdGlvbnNTdHJpbmcgPSBvcHRpb25zU3RyaW5nLnJlcGxhY2UoLycvZywgJ1wiJyk7XG4gICAgICB9XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIGNsb25lZE9wdGlvbnMgPSBKU09OLnBhcnNlKG9wdGlvbnNTdHJpbmcpO1xuXG4gICAgICAgIGlmIChpbmhlcml0ZWRPcHRpb25zKSBjbG9uZWRPcHRpb25zID0geyAuLi5pbmhlcml0ZWRPcHRpb25zLCAuLi5jbG9uZWRPcHRpb25zIH07XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHRoaXMubG9nZ2VyLndhcm4oYGZhaWxlZCBwYXJzaW5nIG9wdGlvbnMgc3RyaW5nIGluIG5lc3RpbmcgZm9yIGtleSAke2tleX1gLCBlKTtcbiAgICAgICAgcmV0dXJuIGAke2tleX0ke3NlcH0ke29wdGlvbnNTdHJpbmd9YDtcbiAgICAgIH1cblxuICAgICAgLy8gYXNzZXJ0IHdlIGRvIG5vdCBnZXQgYSBlbmRsZXNzIGxvb3Agb24gaW50ZXJwb2xhdGluZyBkZWZhdWx0VmFsdWUgYWdhaW4gYW5kIGFnYWluXG4gICAgICBpZiAoY2xvbmVkT3B0aW9ucy5kZWZhdWx0VmFsdWUgJiYgY2xvbmVkT3B0aW9ucy5kZWZhdWx0VmFsdWUuaW5kZXhPZih0aGlzLnByZWZpeCkgPiAtMSlcbiAgICAgICAgZGVsZXRlIGNsb25lZE9wdGlvbnMuZGVmYXVsdFZhbHVlO1xuICAgICAgcmV0dXJuIGtleTtcbiAgICB9O1xuXG4gICAgLy8gcmVndWxhciBlc2NhcGUgb24gZGVtYW5kXG4gICAgd2hpbGUgKChtYXRjaCA9IHRoaXMubmVzdGluZ1JlZ2V4cC5leGVjKHN0cikpKSB7XG4gICAgICBsZXQgZm9ybWF0dGVycyA9IFtdO1xuXG4gICAgICBjbG9uZWRPcHRpb25zID0geyAuLi5vcHRpb25zIH07XG4gICAgICBjbG9uZWRPcHRpb25zID1cbiAgICAgICAgY2xvbmVkT3B0aW9ucy5yZXBsYWNlICYmICFpc1N0cmluZyhjbG9uZWRPcHRpb25zLnJlcGxhY2UpXG4gICAgICAgICAgPyBjbG9uZWRPcHRpb25zLnJlcGxhY2VcbiAgICAgICAgICA6IGNsb25lZE9wdGlvbnM7XG4gICAgICBjbG9uZWRPcHRpb25zLmFwcGx5UG9zdFByb2Nlc3NvciA9IGZhbHNlOyAvLyBhdm9pZCBwb3N0IHByb2Nlc3Npbmcgb24gbmVzdGVkIGxvb2t1cFxuICAgICAgZGVsZXRlIGNsb25lZE9wdGlvbnMuZGVmYXVsdFZhbHVlOyAvLyBhc3NlcnQgd2UgZG8gbm90IGdldCBhIGVuZGxlc3MgbG9vcCBvbiBpbnRlcnBvbGF0aW5nIGRlZmF1bHRWYWx1ZSBhZ2FpbiBhbmQgYWdhaW5cblxuICAgICAgLyoqXG4gICAgICAgKiBJZiB0aGVyZSBpcyBtb3JlIHRoYW4gb25lIHBhcmFtZXRlciAoY29udGFpbnMgdGhlIGZvcm1hdCBzZXBhcmF0b3IpLiBFLmcuOlxuICAgICAgICogICAtIHQoYSwgYilcbiAgICAgICAqICAgLSB0KGEsIGIsIGMpXG4gICAgICAgKlxuICAgICAgICogQW5kIHRob3NlIHBhcmFtZXRlcnMgYXJlIG5vdCBkeW5hbWljIHZhbHVlcyAocGFyYW1ldGVycyBkbyBub3QgaW5jbHVkZSBjdXJseSBicmFjZXMpLiBFLmcuOlxuICAgICAgICogICAtIE5vdCB0KGEsIHsgXCJrZXlcIjogXCJ7e3ZhcmlhYmxlfX1cIiB9KVxuICAgICAgICogICAtIE5vdCB0KGEsIGIsIHtcImtleUFcIjogXCJ2YWx1ZUFcIiwgXCJrZXlCXCI6IFwidmFsdWVCXCJ9KVxuICAgICAgICovXG4gICAgICBsZXQgZG9SZWR1Y2UgPSBmYWxzZTtcbiAgICAgIGlmIChtYXRjaFswXS5pbmRleE9mKHRoaXMuZm9ybWF0U2VwYXJhdG9yKSAhPT0gLTEgJiYgIS97Lip9Ly50ZXN0KG1hdGNoWzFdKSkge1xuICAgICAgICBjb25zdCByID0gbWF0Y2hbMV0uc3BsaXQodGhpcy5mb3JtYXRTZXBhcmF0b3IpLm1hcCgoZWxlbSkgPT4gZWxlbS50cmltKCkpO1xuICAgICAgICBtYXRjaFsxXSA9IHIuc2hpZnQoKTtcbiAgICAgICAgZm9ybWF0dGVycyA9IHI7XG4gICAgICAgIGRvUmVkdWNlID0gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgdmFsdWUgPSBmYyhoYW5kbGVIYXNPcHRpb25zLmNhbGwodGhpcywgbWF0Y2hbMV0udHJpbSgpLCBjbG9uZWRPcHRpb25zKSwgY2xvbmVkT3B0aW9ucyk7XG5cbiAgICAgIC8vIGlzIG9ubHkgdGhlIG5lc3Rpbmcga2V5IChrZXkxID0gJyQoa2V5MiknKSByZXR1cm4gdGhlIHZhbHVlIHdpdGhvdXQgc3RyaW5naWZ5XG4gICAgICBpZiAodmFsdWUgJiYgbWF0Y2hbMF0gPT09IHN0ciAmJiAhaXNTdHJpbmcodmFsdWUpKSByZXR1cm4gdmFsdWU7XG5cbiAgICAgIC8vIG5vIHN0cmluZyB0byBpbmNsdWRlIG9yIGVtcHR5XG4gICAgICBpZiAoIWlzU3RyaW5nKHZhbHVlKSkgdmFsdWUgPSBtYWtlU3RyaW5nKHZhbHVlKTtcbiAgICAgIGlmICghdmFsdWUpIHtcbiAgICAgICAgdGhpcy5sb2dnZXIud2FybihgbWlzc2VkIHRvIHJlc29sdmUgJHttYXRjaFsxXX0gZm9yIG5lc3RpbmcgJHtzdHJ9YCk7XG4gICAgICAgIHZhbHVlID0gJyc7XG4gICAgICB9XG5cbiAgICAgIGlmIChkb1JlZHVjZSkge1xuICAgICAgICB2YWx1ZSA9IGZvcm1hdHRlcnMucmVkdWNlKFxuICAgICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1sb29wLWZ1bmNcbiAgICAgICAgICAodiwgZikgPT5cbiAgICAgICAgICAgIHRoaXMuZm9ybWF0KHYsIGYsIG9wdGlvbnMubG5nLCB7IC4uLm9wdGlvbnMsIGludGVycG9sYXRpb25rZXk6IG1hdGNoWzFdLnRyaW0oKSB9KSxcbiAgICAgICAgICB2YWx1ZS50cmltKCksXG4gICAgICAgICk7XG4gICAgICB9XG5cbiAgICAgIC8vIE5lc3RlZCBrZXlzIHNob3VsZCBub3QgYmUgZXNjYXBlZCBieSBkZWZhdWx0ICM4NTRcbiAgICAgIC8vIHZhbHVlID0gdGhpcy5lc2NhcGVWYWx1ZSA/IHJlZ2V4U2FmZSh1dGlscy5lc2NhcGUodmFsdWUpKSA6IHJlZ2V4U2FmZSh2YWx1ZSk7XG4gICAgICBzdHIgPSBzdHIucmVwbGFjZShtYXRjaFswXSwgdmFsdWUpO1xuICAgICAgdGhpcy5yZWdleHAubGFzdEluZGV4ID0gMDtcbiAgICB9XG4gICAgcmV0dXJuIHN0cjtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBJbnRlcnBvbGF0b3I7XG4iLCJpbXBvcnQgYmFzZUxvZ2dlciBmcm9tICcuL2xvZ2dlci5qcyc7XG5pbXBvcnQgeyBnZXRDbGVhbmVkQ29kZSB9IGZyb20gJy4vdXRpbHMuanMnO1xuXG5jb25zdCBwYXJzZUZvcm1hdFN0ciA9IChmb3JtYXRTdHIpID0+IHtcbiAgbGV0IGZvcm1hdE5hbWUgPSBmb3JtYXRTdHIudG9Mb3dlckNhc2UoKS50cmltKCk7XG4gIGNvbnN0IGZvcm1hdE9wdGlvbnMgPSB7fTtcbiAgaWYgKGZvcm1hdFN0ci5pbmRleE9mKCcoJykgPiAtMSkge1xuICAgIGNvbnN0IHAgPSBmb3JtYXRTdHIuc3BsaXQoJygnKTtcbiAgICBmb3JtYXROYW1lID0gcFswXS50b0xvd2VyQ2FzZSgpLnRyaW0oKTtcblxuICAgIGNvbnN0IG9wdFN0ciA9IHBbMV0uc3Vic3RyaW5nKDAsIHBbMV0ubGVuZ3RoIC0gMSk7XG5cbiAgICAvLyBleHRyYSBmb3IgY3VycmVuY3lcbiAgICBpZiAoZm9ybWF0TmFtZSA9PT0gJ2N1cnJlbmN5JyAmJiBvcHRTdHIuaW5kZXhPZignOicpIDwgMCkge1xuICAgICAgaWYgKCFmb3JtYXRPcHRpb25zLmN1cnJlbmN5KSBmb3JtYXRPcHRpb25zLmN1cnJlbmN5ID0gb3B0U3RyLnRyaW0oKTtcbiAgICB9IGVsc2UgaWYgKGZvcm1hdE5hbWUgPT09ICdyZWxhdGl2ZXRpbWUnICYmIG9wdFN0ci5pbmRleE9mKCc6JykgPCAwKSB7XG4gICAgICBpZiAoIWZvcm1hdE9wdGlvbnMucmFuZ2UpIGZvcm1hdE9wdGlvbnMucmFuZ2UgPSBvcHRTdHIudHJpbSgpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBvcHRzID0gb3B0U3RyLnNwbGl0KCc7Jyk7XG5cbiAgICAgIG9wdHMuZm9yRWFjaCgob3B0KSA9PiB7XG4gICAgICAgIGlmIChvcHQpIHtcbiAgICAgICAgICBjb25zdCBba2V5LCAuLi5yZXN0XSA9IG9wdC5zcGxpdCgnOicpO1xuICAgICAgICAgIGNvbnN0IHZhbCA9IHJlc3RcbiAgICAgICAgICAgIC5qb2luKCc6JylcbiAgICAgICAgICAgIC50cmltKClcbiAgICAgICAgICAgIC5yZXBsYWNlKC9eJyt8JyskL2csICcnKTsgLy8gdHJpbSBhbmQgcmVwbGFjZSAnJ1xuXG4gICAgICAgICAgY29uc3QgdHJpbW1lZEtleSA9IGtleS50cmltKCk7XG5cbiAgICAgICAgICBpZiAoIWZvcm1hdE9wdGlvbnNbdHJpbW1lZEtleV0pIGZvcm1hdE9wdGlvbnNbdHJpbW1lZEtleV0gPSB2YWw7XG4gICAgICAgICAgaWYgKHZhbCA9PT0gJ2ZhbHNlJykgZm9ybWF0T3B0aW9uc1t0cmltbWVkS2V5XSA9IGZhbHNlO1xuICAgICAgICAgIGlmICh2YWwgPT09ICd0cnVlJykgZm9ybWF0T3B0aW9uc1t0cmltbWVkS2V5XSA9IHRydWU7XG4gICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLXJlc3RyaWN0ZWQtZ2xvYmFsc1xuICAgICAgICAgIGlmICghaXNOYU4odmFsKSkgZm9ybWF0T3B0aW9uc1t0cmltbWVkS2V5XSA9IHBhcnNlSW50KHZhbCwgMTApO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGZvcm1hdE5hbWUsXG4gICAgZm9ybWF0T3B0aW9ucyxcbiAgfTtcbn07XG5cbmNvbnN0IGNyZWF0ZUNhY2hlZEZvcm1hdHRlciA9IChmbikgPT4ge1xuICBjb25zdCBjYWNoZSA9IHt9O1xuICByZXR1cm4gKHZhbCwgbG5nLCBvcHRpb25zKSA9PiB7XG4gICAgbGV0IG9wdEZvckNhY2hlID0gb3B0aW9ucztcbiAgICAvLyB0aGlzIGNhY2hlIG9wdGltaXphdGlvbiB3aWxsIG9ubHkgd29yayBmb3Iga2V5cyBoYXZpbmcgMSBpbnRlcnBvbGF0ZWQgdmFsdWVcbiAgICBpZiAoXG4gICAgICBvcHRpb25zICYmXG4gICAgICBvcHRpb25zLmludGVycG9sYXRpb25rZXkgJiZcbiAgICAgIG9wdGlvbnMuZm9ybWF0UGFyYW1zICYmXG4gICAgICBvcHRpb25zLmZvcm1hdFBhcmFtc1tvcHRpb25zLmludGVycG9sYXRpb25rZXldICYmXG4gICAgICBvcHRpb25zW29wdGlvbnMuaW50ZXJwb2xhdGlvbmtleV1cbiAgICApIHtcbiAgICAgIG9wdEZvckNhY2hlID0ge1xuICAgICAgICAuLi5vcHRGb3JDYWNoZSxcbiAgICAgICAgW29wdGlvbnMuaW50ZXJwb2xhdGlvbmtleV06IHVuZGVmaW5lZCxcbiAgICAgIH07XG4gICAgfVxuICAgIGNvbnN0IGtleSA9IGxuZyArIEpTT04uc3RyaW5naWZ5KG9wdEZvckNhY2hlKTtcbiAgICBsZXQgZm9ybWF0dGVyID0gY2FjaGVba2V5XTtcbiAgICBpZiAoIWZvcm1hdHRlcikge1xuICAgICAgZm9ybWF0dGVyID0gZm4oZ2V0Q2xlYW5lZENvZGUobG5nKSwgb3B0aW9ucyk7XG4gICAgICBjYWNoZVtrZXldID0gZm9ybWF0dGVyO1xuICAgIH1cbiAgICByZXR1cm4gZm9ybWF0dGVyKHZhbCk7XG4gIH07XG59O1xuXG5jbGFzcyBGb3JtYXR0ZXIge1xuICBjb25zdHJ1Y3RvcihvcHRpb25zID0ge30pIHtcbiAgICB0aGlzLmxvZ2dlciA9IGJhc2VMb2dnZXIuY3JlYXRlKCdmb3JtYXR0ZXInKTtcblxuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG4gICAgdGhpcy5mb3JtYXRzID0ge1xuICAgICAgbnVtYmVyOiBjcmVhdGVDYWNoZWRGb3JtYXR0ZXIoKGxuZywgb3B0KSA9PiB7XG4gICAgICAgIGNvbnN0IGZvcm1hdHRlciA9IG5ldyBJbnRsLk51bWJlckZvcm1hdChsbmcsIHsgLi4ub3B0IH0pO1xuICAgICAgICByZXR1cm4gKHZhbCkgPT4gZm9ybWF0dGVyLmZvcm1hdCh2YWwpO1xuICAgICAgfSksXG4gICAgICBjdXJyZW5jeTogY3JlYXRlQ2FjaGVkRm9ybWF0dGVyKChsbmcsIG9wdCkgPT4ge1xuICAgICAgICBjb25zdCBmb3JtYXR0ZXIgPSBuZXcgSW50bC5OdW1iZXJGb3JtYXQobG5nLCB7IC4uLm9wdCwgc3R5bGU6ICdjdXJyZW5jeScgfSk7XG4gICAgICAgIHJldHVybiAodmFsKSA9PiBmb3JtYXR0ZXIuZm9ybWF0KHZhbCk7XG4gICAgICB9KSxcbiAgICAgIGRhdGV0aW1lOiBjcmVhdGVDYWNoZWRGb3JtYXR0ZXIoKGxuZywgb3B0KSA9PiB7XG4gICAgICAgIGNvbnN0IGZvcm1hdHRlciA9IG5ldyBJbnRsLkRhdGVUaW1lRm9ybWF0KGxuZywgeyAuLi5vcHQgfSk7XG4gICAgICAgIHJldHVybiAodmFsKSA9PiBmb3JtYXR0ZXIuZm9ybWF0KHZhbCk7XG4gICAgICB9KSxcbiAgICAgIHJlbGF0aXZldGltZTogY3JlYXRlQ2FjaGVkRm9ybWF0dGVyKChsbmcsIG9wdCkgPT4ge1xuICAgICAgICBjb25zdCBmb3JtYXR0ZXIgPSBuZXcgSW50bC5SZWxhdGl2ZVRpbWVGb3JtYXQobG5nLCB7IC4uLm9wdCB9KTtcbiAgICAgICAgcmV0dXJuICh2YWwpID0+IGZvcm1hdHRlci5mb3JtYXQodmFsLCBvcHQucmFuZ2UgfHwgJ2RheScpO1xuICAgICAgfSksXG4gICAgICBsaXN0OiBjcmVhdGVDYWNoZWRGb3JtYXR0ZXIoKGxuZywgb3B0KSA9PiB7XG4gICAgICAgIGNvbnN0IGZvcm1hdHRlciA9IG5ldyBJbnRsLkxpc3RGb3JtYXQobG5nLCB7IC4uLm9wdCB9KTtcbiAgICAgICAgcmV0dXJuICh2YWwpID0+IGZvcm1hdHRlci5mb3JtYXQodmFsKTtcbiAgICAgIH0pLFxuICAgIH07XG4gICAgdGhpcy5pbml0KG9wdGlvbnMpO1xuICB9XG5cbiAgLyogZXNsaW50IG5vLXBhcmFtLXJlYXNzaWduOiAwICovXG4gIGluaXQoc2VydmljZXMsIG9wdGlvbnMgPSB7IGludGVycG9sYXRpb246IHt9IH0pIHtcbiAgICB0aGlzLmZvcm1hdFNlcGFyYXRvciA9IG9wdGlvbnMuaW50ZXJwb2xhdGlvbi5mb3JtYXRTZXBhcmF0b3IgfHwgJywnO1xuICB9XG5cbiAgYWRkKG5hbWUsIGZjKSB7XG4gICAgdGhpcy5mb3JtYXRzW25hbWUudG9Mb3dlckNhc2UoKS50cmltKCldID0gZmM7XG4gIH1cblxuICBhZGRDYWNoZWQobmFtZSwgZmMpIHtcbiAgICB0aGlzLmZvcm1hdHNbbmFtZS50b0xvd2VyQ2FzZSgpLnRyaW0oKV0gPSBjcmVhdGVDYWNoZWRGb3JtYXR0ZXIoZmMpO1xuICB9XG5cbiAgZm9ybWF0KHZhbHVlLCBmb3JtYXQsIGxuZywgb3B0aW9ucyA9IHt9KSB7XG4gICAgY29uc3QgZm9ybWF0cyA9IGZvcm1hdC5zcGxpdCh0aGlzLmZvcm1hdFNlcGFyYXRvcik7XG4gICAgaWYgKFxuICAgICAgZm9ybWF0cy5sZW5ndGggPiAxICYmXG4gICAgICBmb3JtYXRzWzBdLmluZGV4T2YoJygnKSA+IDEgJiZcbiAgICAgIGZvcm1hdHNbMF0uaW5kZXhPZignKScpIDwgMCAmJlxuICAgICAgZm9ybWF0cy5maW5kKChmKSA9PiBmLmluZGV4T2YoJyknKSA+IC0xKVxuICAgICkge1xuICAgICAgY29uc3QgbGFzdEluZGV4ID0gZm9ybWF0cy5maW5kSW5kZXgoKGYpID0+IGYuaW5kZXhPZignKScpID4gLTEpO1xuICAgICAgZm9ybWF0c1swXSA9IFtmb3JtYXRzWzBdLCAuLi5mb3JtYXRzLnNwbGljZSgxLCBsYXN0SW5kZXgpXS5qb2luKHRoaXMuZm9ybWF0U2VwYXJhdG9yKTtcbiAgICB9XG5cbiAgICBjb25zdCByZXN1bHQgPSBmb3JtYXRzLnJlZHVjZSgobWVtLCBmKSA9PiB7XG4gICAgICBjb25zdCB7IGZvcm1hdE5hbWUsIGZvcm1hdE9wdGlvbnMgfSA9IHBhcnNlRm9ybWF0U3RyKGYpO1xuXG4gICAgICBpZiAodGhpcy5mb3JtYXRzW2Zvcm1hdE5hbWVdKSB7XG4gICAgICAgIGxldCBmb3JtYXR0ZWQgPSBtZW07XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgLy8gb3B0aW9ucyBwYXNzZWQgZXhwbGljaXQgZm9yIHRoYXQgZm9ybWF0dGVkIHZhbHVlXG4gICAgICAgICAgY29uc3QgdmFsT3B0aW9ucyA9IG9wdGlvbnM/LmZvcm1hdFBhcmFtcz8uW29wdGlvbnMuaW50ZXJwb2xhdGlvbmtleV0gfHwge307XG5cbiAgICAgICAgICAvLyBsYW5ndWFnZVxuICAgICAgICAgIGNvbnN0IGwgPSB2YWxPcHRpb25zLmxvY2FsZSB8fCB2YWxPcHRpb25zLmxuZyB8fCBvcHRpb25zLmxvY2FsZSB8fCBvcHRpb25zLmxuZyB8fCBsbmc7XG5cbiAgICAgICAgICBmb3JtYXR0ZWQgPSB0aGlzLmZvcm1hdHNbZm9ybWF0TmFtZV0obWVtLCBsLCB7XG4gICAgICAgICAgICAuLi5mb3JtYXRPcHRpb25zLFxuICAgICAgICAgICAgLi4ub3B0aW9ucyxcbiAgICAgICAgICAgIC4uLnZhbE9wdGlvbnMsXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgdGhpcy5sb2dnZXIud2FybihlcnJvcik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZvcm1hdHRlZDtcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWVsc2UtcmV0dXJuXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmxvZ2dlci53YXJuKGB0aGVyZSB3YXMgbm8gZm9ybWF0IGZ1bmN0aW9uIGZvciAke2Zvcm1hdE5hbWV9YCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gbWVtO1xuICAgIH0sIHZhbHVlKTtcblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgRm9ybWF0dGVyO1xuIiwiaW1wb3J0IHsgcHVzaFBhdGgsIGlzU3RyaW5nIH0gZnJvbSAnLi91dGlscy5qcyc7XG5pbXBvcnQgYmFzZUxvZ2dlciBmcm9tICcuL2xvZ2dlci5qcyc7XG5pbXBvcnQgRXZlbnRFbWl0dGVyIGZyb20gJy4vRXZlbnRFbWl0dGVyLmpzJztcblxuY29uc3QgcmVtb3ZlUGVuZGluZyA9IChxLCBuYW1lKSA9PiB7XG4gIGlmIChxLnBlbmRpbmdbbmFtZV0gIT09IHVuZGVmaW5lZCkge1xuICAgIGRlbGV0ZSBxLnBlbmRpbmdbbmFtZV07XG4gICAgcS5wZW5kaW5nQ291bnQtLTtcbiAgfVxufTtcblxuY2xhc3MgQ29ubmVjdG9yIGV4dGVuZHMgRXZlbnRFbWl0dGVyIHtcbiAgY29uc3RydWN0b3IoYmFja2VuZCwgc3RvcmUsIHNlcnZpY2VzLCBvcHRpb25zID0ge30pIHtcbiAgICBzdXBlcigpO1xuXG4gICAgdGhpcy5iYWNrZW5kID0gYmFja2VuZDtcbiAgICB0aGlzLnN0b3JlID0gc3RvcmU7XG4gICAgdGhpcy5zZXJ2aWNlcyA9IHNlcnZpY2VzO1xuICAgIHRoaXMubGFuZ3VhZ2VVdGlscyA9IHNlcnZpY2VzLmxhbmd1YWdlVXRpbHM7XG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcbiAgICB0aGlzLmxvZ2dlciA9IGJhc2VMb2dnZXIuY3JlYXRlKCdiYWNrZW5kQ29ubmVjdG9yJyk7XG5cbiAgICB0aGlzLndhaXRpbmdSZWFkcyA9IFtdO1xuICAgIHRoaXMubWF4UGFyYWxsZWxSZWFkcyA9IG9wdGlvbnMubWF4UGFyYWxsZWxSZWFkcyB8fCAxMDtcbiAgICB0aGlzLnJlYWRpbmdDYWxscyA9IDA7XG5cbiAgICB0aGlzLm1heFJldHJpZXMgPSBvcHRpb25zLm1heFJldHJpZXMgPj0gMCA/IG9wdGlvbnMubWF4UmV0cmllcyA6IDU7XG4gICAgdGhpcy5yZXRyeVRpbWVvdXQgPSBvcHRpb25zLnJldHJ5VGltZW91dCA+PSAxID8gb3B0aW9ucy5yZXRyeVRpbWVvdXQgOiAzNTA7XG5cbiAgICB0aGlzLnN0YXRlID0ge307XG4gICAgdGhpcy5xdWV1ZSA9IFtdO1xuXG4gICAgdGhpcy5iYWNrZW5kPy5pbml0Py4oc2VydmljZXMsIG9wdGlvbnMuYmFja2VuZCwgb3B0aW9ucyk7XG4gIH1cblxuICBxdWV1ZUxvYWQobGFuZ3VhZ2VzLCBuYW1lc3BhY2VzLCBvcHRpb25zLCBjYWxsYmFjaykge1xuICAgIC8vIGZpbmQgd2hhdCBuZWVkcyB0byBiZSBsb2FkZWRcbiAgICBjb25zdCB0b0xvYWQgPSB7fTtcbiAgICBjb25zdCBwZW5kaW5nID0ge307XG4gICAgY29uc3QgdG9Mb2FkTGFuZ3VhZ2VzID0ge307XG4gICAgY29uc3QgdG9Mb2FkTmFtZXNwYWNlcyA9IHt9O1xuXG4gICAgbGFuZ3VhZ2VzLmZvckVhY2goKGxuZykgPT4ge1xuICAgICAgbGV0IGhhc0FsbE5hbWVzcGFjZXMgPSB0cnVlO1xuXG4gICAgICBuYW1lc3BhY2VzLmZvckVhY2goKG5zKSA9PiB7XG4gICAgICAgIGNvbnN0IG5hbWUgPSBgJHtsbmd9fCR7bnN9YDtcblxuICAgICAgICBpZiAoIW9wdGlvbnMucmVsb2FkICYmIHRoaXMuc3RvcmUuaGFzUmVzb3VyY2VCdW5kbGUobG5nLCBucykpIHtcbiAgICAgICAgICB0aGlzLnN0YXRlW25hbWVdID0gMjsgLy8gbG9hZGVkXG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5zdGF0ZVtuYW1lXSA8IDApIHtcbiAgICAgICAgICAvLyBub3RoaW5nIHRvIGRvIGZvciBlcnJcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLnN0YXRlW25hbWVdID09PSAxKSB7XG4gICAgICAgICAgaWYgKHBlbmRpbmdbbmFtZV0gPT09IHVuZGVmaW5lZCkgcGVuZGluZ1tuYW1lXSA9IHRydWU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5zdGF0ZVtuYW1lXSA9IDE7IC8vIHBlbmRpbmdcblxuICAgICAgICAgIGhhc0FsbE5hbWVzcGFjZXMgPSBmYWxzZTtcblxuICAgICAgICAgIGlmIChwZW5kaW5nW25hbWVdID09PSB1bmRlZmluZWQpIHBlbmRpbmdbbmFtZV0gPSB0cnVlO1xuICAgICAgICAgIGlmICh0b0xvYWRbbmFtZV0gPT09IHVuZGVmaW5lZCkgdG9Mb2FkW25hbWVdID0gdHJ1ZTtcbiAgICAgICAgICBpZiAodG9Mb2FkTmFtZXNwYWNlc1tuc10gPT09IHVuZGVmaW5lZCkgdG9Mb2FkTmFtZXNwYWNlc1tuc10gPSB0cnVlO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgaWYgKCFoYXNBbGxOYW1lc3BhY2VzKSB0b0xvYWRMYW5ndWFnZXNbbG5nXSA9IHRydWU7XG4gICAgfSk7XG5cbiAgICBpZiAoT2JqZWN0LmtleXModG9Mb2FkKS5sZW5ndGggfHwgT2JqZWN0LmtleXMocGVuZGluZykubGVuZ3RoKSB7XG4gICAgICB0aGlzLnF1ZXVlLnB1c2goe1xuICAgICAgICBwZW5kaW5nLFxuICAgICAgICBwZW5kaW5nQ291bnQ6IE9iamVjdC5rZXlzKHBlbmRpbmcpLmxlbmd0aCxcbiAgICAgICAgbG9hZGVkOiB7fSxcbiAgICAgICAgZXJyb3JzOiBbXSxcbiAgICAgICAgY2FsbGJhY2ssXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgdG9Mb2FkOiBPYmplY3Qua2V5cyh0b0xvYWQpLFxuICAgICAgcGVuZGluZzogT2JqZWN0LmtleXMocGVuZGluZyksXG4gICAgICB0b0xvYWRMYW5ndWFnZXM6IE9iamVjdC5rZXlzKHRvTG9hZExhbmd1YWdlcyksXG4gICAgICB0b0xvYWROYW1lc3BhY2VzOiBPYmplY3Qua2V5cyh0b0xvYWROYW1lc3BhY2VzKSxcbiAgICB9O1xuICB9XG5cbiAgbG9hZGVkKG5hbWUsIGVyciwgZGF0YSkge1xuICAgIGNvbnN0IHMgPSBuYW1lLnNwbGl0KCd8Jyk7XG4gICAgY29uc3QgbG5nID0gc1swXTtcbiAgICBjb25zdCBucyA9IHNbMV07XG5cbiAgICBpZiAoZXJyKSB0aGlzLmVtaXQoJ2ZhaWxlZExvYWRpbmcnLCBsbmcsIG5zLCBlcnIpO1xuXG4gICAgaWYgKCFlcnIgJiYgZGF0YSkge1xuICAgICAgdGhpcy5zdG9yZS5hZGRSZXNvdXJjZUJ1bmRsZShsbmcsIG5zLCBkYXRhLCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgeyBza2lwQ29weTogdHJ1ZSB9KTtcbiAgICB9XG5cbiAgICAvLyBzZXQgbG9hZGVkXG4gICAgdGhpcy5zdGF0ZVtuYW1lXSA9IGVyciA/IC0xIDogMjtcbiAgICBpZiAoZXJyICYmIGRhdGEpIHRoaXMuc3RhdGVbbmFtZV0gPSAwO1xuXG4gICAgLy8gY29uc29saWRhdGVkIGxvYWRpbmcgZG9uZSBpbiB0aGlzIHJ1biAtIG9ubHkgZW1pdCBvbmNlIGZvciBhIGxvYWRlZCBuYW1lc3BhY2VcbiAgICBjb25zdCBsb2FkZWQgPSB7fTtcblxuICAgIC8vIGNhbGxiYWNrIGlmIHJlYWR5XG4gICAgdGhpcy5xdWV1ZS5mb3JFYWNoKChxKSA9PiB7XG4gICAgICBwdXNoUGF0aChxLmxvYWRlZCwgW2xuZ10sIG5zKTtcbiAgICAgIHJlbW92ZVBlbmRpbmcocSwgbmFtZSk7XG5cbiAgICAgIGlmIChlcnIpIHEuZXJyb3JzLnB1c2goZXJyKTtcblxuICAgICAgaWYgKHEucGVuZGluZ0NvdW50ID09PSAwICYmICFxLmRvbmUpIHtcbiAgICAgICAgLy8gb25seSBkbyBvbmNlIHBlciBsb2FkZWQgLT4gdGhpcy5lbWl0KCdsb2FkZWQnLCBxLmxvYWRlZCk7XG4gICAgICAgIE9iamVjdC5rZXlzKHEubG9hZGVkKS5mb3JFYWNoKChsKSA9PiB7XG4gICAgICAgICAgaWYgKCFsb2FkZWRbbF0pIGxvYWRlZFtsXSA9IHt9O1xuICAgICAgICAgIGNvbnN0IGxvYWRlZEtleXMgPSBxLmxvYWRlZFtsXTtcbiAgICAgICAgICBpZiAobG9hZGVkS2V5cy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGxvYWRlZEtleXMuZm9yRWFjaCgobikgPT4ge1xuICAgICAgICAgICAgICBpZiAobG9hZGVkW2xdW25dID09PSB1bmRlZmluZWQpIGxvYWRlZFtsXVtuXSA9IHRydWU7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8qIGVzbGludCBuby1wYXJhbS1yZWFzc2lnbjogMCAqL1xuICAgICAgICBxLmRvbmUgPSB0cnVlO1xuICAgICAgICBpZiAocS5lcnJvcnMubGVuZ3RoKSB7XG4gICAgICAgICAgcS5jYWxsYmFjayhxLmVycm9ycyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcS5jYWxsYmFjaygpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBlbWl0IGNvbnNvbGlkYXRlZCBsb2FkZWQgZXZlbnRcbiAgICB0aGlzLmVtaXQoJ2xvYWRlZCcsIGxvYWRlZCk7XG5cbiAgICAvLyByZW1vdmUgZG9uZSBsb2FkIHJlcXVlc3RzXG4gICAgdGhpcy5xdWV1ZSA9IHRoaXMucXVldWUuZmlsdGVyKChxKSA9PiAhcS5kb25lKTtcbiAgfVxuXG4gIHJlYWQobG5nLCBucywgZmNOYW1lLCB0cmllZCA9IDAsIHdhaXQgPSB0aGlzLnJldHJ5VGltZW91dCwgY2FsbGJhY2spIHtcbiAgICBpZiAoIWxuZy5sZW5ndGgpIHJldHVybiBjYWxsYmFjayhudWxsLCB7fSk7IC8vIG5vdGluZyB0byBsb2FkXG5cbiAgICAvLyBMaW1pdCBwYXJhbGxlbGlzbSBvZiBjYWxscyB0byBiYWNrZW5kXG4gICAgLy8gVGhpcyBpcyBuZWVkZWQgdG8gcHJldmVudCB0cnlpbmcgdG8gb3BlbiB0aG91c2FuZHMgb2ZcbiAgICAvLyBzb2NrZXRzIG9yIGZpbGUgZGVzY3JpcHRvcnMsIHdoaWNoIGNhbiBjYXVzZSBmYWlsdXJlc1xuICAgIC8vIGFuZCBhY3R1YWxseSBtYWtlIHRoZSBlbnRpcmUgcHJvY2VzcyB0YWtlIGxvbmdlci5cbiAgICBpZiAodGhpcy5yZWFkaW5nQ2FsbHMgPj0gdGhpcy5tYXhQYXJhbGxlbFJlYWRzKSB7XG4gICAgICB0aGlzLndhaXRpbmdSZWFkcy5wdXNoKHsgbG5nLCBucywgZmNOYW1lLCB0cmllZCwgd2FpdCwgY2FsbGJhY2sgfSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMucmVhZGluZ0NhbGxzKys7XG5cbiAgICBjb25zdCByZXNvbHZlciA9IChlcnIsIGRhdGEpID0+IHtcbiAgICAgIHRoaXMucmVhZGluZ0NhbGxzLS07XG4gICAgICBpZiAodGhpcy53YWl0aW5nUmVhZHMubGVuZ3RoID4gMCkge1xuICAgICAgICBjb25zdCBuZXh0ID0gdGhpcy53YWl0aW5nUmVhZHMuc2hpZnQoKTtcbiAgICAgICAgdGhpcy5yZWFkKG5leHQubG5nLCBuZXh0Lm5zLCBuZXh0LmZjTmFtZSwgbmV4dC50cmllZCwgbmV4dC53YWl0LCBuZXh0LmNhbGxiYWNrKTtcbiAgICAgIH1cbiAgICAgIGlmIChlcnIgJiYgZGF0YSAvKiA9IHJldHJ5RmxhZyAqLyAmJiB0cmllZCA8IHRoaXMubWF4UmV0cmllcykge1xuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICB0aGlzLnJlYWQuY2FsbCh0aGlzLCBsbmcsIG5zLCBmY05hbWUsIHRyaWVkICsgMSwgd2FpdCAqIDIsIGNhbGxiYWNrKTtcbiAgICAgICAgfSwgd2FpdCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGNhbGxiYWNrKGVyciwgZGF0YSk7XG4gICAgfTtcblxuICAgIGNvbnN0IGZjID0gdGhpcy5iYWNrZW5kW2ZjTmFtZV0uYmluZCh0aGlzLmJhY2tlbmQpO1xuICAgIGlmIChmYy5sZW5ndGggPT09IDIpIHtcbiAgICAgIC8vIG5vIGNhbGxiYWNrXG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCByID0gZmMobG5nLCBucyk7XG4gICAgICAgIGlmIChyICYmIHR5cGVvZiByLnRoZW4gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAvLyBwcm9taXNlXG4gICAgICAgICAgci50aGVuKChkYXRhKSA9PiByZXNvbHZlcihudWxsLCBkYXRhKSkuY2F0Y2gocmVzb2x2ZXIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIHN5bmNcbiAgICAgICAgICByZXNvbHZlcihudWxsLCByKTtcbiAgICAgICAgfVxuICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgIHJlc29sdmVyKGVycik7XG4gICAgICB9XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gbm9ybWFsIHdpdGggY2FsbGJhY2tcbiAgICByZXR1cm4gZmMobG5nLCBucywgcmVzb2x2ZXIpO1xuICB9XG5cbiAgLyogZXNsaW50IGNvbnNpc3RlbnQtcmV0dXJuOiAwICovXG4gIHByZXBhcmVMb2FkaW5nKGxhbmd1YWdlcywgbmFtZXNwYWNlcywgb3B0aW9ucyA9IHt9LCBjYWxsYmFjaykge1xuICAgIGlmICghdGhpcy5iYWNrZW5kKSB7XG4gICAgICB0aGlzLmxvZ2dlci53YXJuKCdObyBiYWNrZW5kIHdhcyBhZGRlZCB2aWEgaTE4bmV4dC51c2UuIFdpbGwgbm90IGxvYWQgcmVzb3VyY2VzLicpO1xuICAgICAgcmV0dXJuIGNhbGxiYWNrICYmIGNhbGxiYWNrKCk7XG4gICAgfVxuXG4gICAgaWYgKGlzU3RyaW5nKGxhbmd1YWdlcykpIGxhbmd1YWdlcyA9IHRoaXMubGFuZ3VhZ2VVdGlscy50b1Jlc29sdmVIaWVyYXJjaHkobGFuZ3VhZ2VzKTtcbiAgICBpZiAoaXNTdHJpbmcobmFtZXNwYWNlcykpIG5hbWVzcGFjZXMgPSBbbmFtZXNwYWNlc107XG5cbiAgICBjb25zdCB0b0xvYWQgPSB0aGlzLnF1ZXVlTG9hZChsYW5ndWFnZXMsIG5hbWVzcGFjZXMsIG9wdGlvbnMsIGNhbGxiYWNrKTtcbiAgICBpZiAoIXRvTG9hZC50b0xvYWQubGVuZ3RoKSB7XG4gICAgICBpZiAoIXRvTG9hZC5wZW5kaW5nLmxlbmd0aCkgY2FsbGJhY2soKTsgLy8gbm90aGluZyB0byBsb2FkIGFuZCBubyBwZW5kaW5ncy4uLmNhbGxiYWNrIG5vd1xuICAgICAgcmV0dXJuIG51bGw7IC8vIHBlbmRpbmdzIHdpbGwgdHJpZ2dlciBjYWxsYmFja1xuICAgIH1cblxuICAgIHRvTG9hZC50b0xvYWQuZm9yRWFjaCgobmFtZSkgPT4ge1xuICAgICAgdGhpcy5sb2FkT25lKG5hbWUpO1xuICAgIH0pO1xuICB9XG5cbiAgbG9hZChsYW5ndWFnZXMsIG5hbWVzcGFjZXMsIGNhbGxiYWNrKSB7XG4gICAgdGhpcy5wcmVwYXJlTG9hZGluZyhsYW5ndWFnZXMsIG5hbWVzcGFjZXMsIHt9LCBjYWxsYmFjayk7XG4gIH1cblxuICByZWxvYWQobGFuZ3VhZ2VzLCBuYW1lc3BhY2VzLCBjYWxsYmFjaykge1xuICAgIHRoaXMucHJlcGFyZUxvYWRpbmcobGFuZ3VhZ2VzLCBuYW1lc3BhY2VzLCB7IHJlbG9hZDogdHJ1ZSB9LCBjYWxsYmFjayk7XG4gIH1cblxuICBsb2FkT25lKG5hbWUsIHByZWZpeCA9ICcnKSB7XG4gICAgY29uc3QgcyA9IG5hbWUuc3BsaXQoJ3wnKTtcbiAgICBjb25zdCBsbmcgPSBzWzBdO1xuICAgIGNvbnN0IG5zID0gc1sxXTtcblxuICAgIHRoaXMucmVhZChsbmcsIG5zLCAncmVhZCcsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICBpZiAoZXJyKSB0aGlzLmxvZ2dlci53YXJuKGAke3ByZWZpeH1sb2FkaW5nIG5hbWVzcGFjZSAke25zfSBmb3IgbGFuZ3VhZ2UgJHtsbmd9IGZhaWxlZGAsIGVycik7XG4gICAgICBpZiAoIWVyciAmJiBkYXRhKVxuICAgICAgICB0aGlzLmxvZ2dlci5sb2coYCR7cHJlZml4fWxvYWRlZCBuYW1lc3BhY2UgJHtuc30gZm9yIGxhbmd1YWdlICR7bG5nfWAsIGRhdGEpO1xuXG4gICAgICB0aGlzLmxvYWRlZChuYW1lLCBlcnIsIGRhdGEpO1xuICAgIH0pO1xuICB9XG5cbiAgc2F2ZU1pc3NpbmcobGFuZ3VhZ2VzLCBuYW1lc3BhY2UsIGtleSwgZmFsbGJhY2tWYWx1ZSwgaXNVcGRhdGUsIG9wdGlvbnMgPSB7fSwgY2xiID0gKCkgPT4ge30pIHtcbiAgICBpZiAoXG4gICAgICB0aGlzLnNlcnZpY2VzPy51dGlscz8uaGFzTG9hZGVkTmFtZXNwYWNlICYmXG4gICAgICAhdGhpcy5zZXJ2aWNlcz8udXRpbHM/Lmhhc0xvYWRlZE5hbWVzcGFjZShuYW1lc3BhY2UpXG4gICAgKSB7XG4gICAgICB0aGlzLmxvZ2dlci53YXJuKFxuICAgICAgICBgZGlkIG5vdCBzYXZlIGtleSBcIiR7a2V5fVwiIGFzIHRoZSBuYW1lc3BhY2UgXCIke25hbWVzcGFjZX1cIiB3YXMgbm90IHlldCBsb2FkZWRgLFxuICAgICAgICAnVGhpcyBtZWFucyBzb21ldGhpbmcgSVMgV1JPTkcgaW4geW91ciBzZXR1cC4gWW91IGFjY2VzcyB0aGUgdCBmdW5jdGlvbiBiZWZvcmUgaTE4bmV4dC5pbml0IC8gaTE4bmV4dC5sb2FkTmFtZXNwYWNlIC8gaTE4bmV4dC5jaGFuZ2VMYW5ndWFnZSB3YXMgZG9uZS4gV2FpdCBmb3IgdGhlIGNhbGxiYWNrIG9yIFByb21pc2UgdG8gcmVzb2x2ZSBiZWZvcmUgYWNjZXNzaW5nIGl0ISEhJyxcbiAgICAgICk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gaWdub3JlIG5vbiB2YWxpZCBrZXlzXG4gICAgaWYgKGtleSA9PT0gdW5kZWZpbmVkIHx8IGtleSA9PT0gbnVsbCB8fCBrZXkgPT09ICcnKSByZXR1cm47XG5cbiAgICBpZiAodGhpcy5iYWNrZW5kPy5jcmVhdGUpIHtcbiAgICAgIGNvbnN0IG9wdHMgPSB7XG4gICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICAgIGlzVXBkYXRlLFxuICAgICAgfTtcbiAgICAgIGNvbnN0IGZjID0gdGhpcy5iYWNrZW5kLmNyZWF0ZS5iaW5kKHRoaXMuYmFja2VuZCk7XG4gICAgICBpZiAoZmMubGVuZ3RoIDwgNikge1xuICAgICAgICAvLyBubyBjYWxsYmFja1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGxldCByO1xuICAgICAgICAgIGlmIChmYy5sZW5ndGggPT09IDUpIHtcbiAgICAgICAgICAgIC8vIGZ1dHVyZSBjYWxsYmFjay1sZXNzIGFwaSBmb3IgaTE4bmV4dC1sb2NpemUtYmFja2VuZFxuICAgICAgICAgICAgciA9IGZjKGxhbmd1YWdlcywgbmFtZXNwYWNlLCBrZXksIGZhbGxiYWNrVmFsdWUsIG9wdHMpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByID0gZmMobGFuZ3VhZ2VzLCBuYW1lc3BhY2UsIGtleSwgZmFsbGJhY2tWYWx1ZSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChyICYmIHR5cGVvZiByLnRoZW4gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIC8vIHByb21pc2VcbiAgICAgICAgICAgIHIudGhlbigoZGF0YSkgPT4gY2xiKG51bGwsIGRhdGEpKS5jYXRjaChjbGIpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBzeW5jXG4gICAgICAgICAgICBjbGIobnVsbCwgcik7XG4gICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICBjbGIoZXJyKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gbm9ybWFsIHdpdGggY2FsbGJhY2tcbiAgICAgICAgZmMobGFuZ3VhZ2VzLCBuYW1lc3BhY2UsIGtleSwgZmFsbGJhY2tWYWx1ZSwgY2xiIC8qIHVudXNlZCBjYWxsYmFjayAqLywgb3B0cyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gd3JpdGUgdG8gc3RvcmUgdG8gYXZvaWQgcmVzZW5kaW5nXG4gICAgaWYgKCFsYW5ndWFnZXMgfHwgIWxhbmd1YWdlc1swXSkgcmV0dXJuO1xuICAgIHRoaXMuc3RvcmUuYWRkUmVzb3VyY2UobGFuZ3VhZ2VzWzBdLCBuYW1lc3BhY2UsIGtleSwgZmFsbGJhY2tWYWx1ZSk7XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgQ29ubmVjdG9yO1xuIiwiaW1wb3J0IHsgaXNTdHJpbmcgfSBmcm9tICcuL3V0aWxzLmpzJztcblxuZXhwb3J0IGNvbnN0IGdldCA9ICgpID0+ICh7XG4gIGRlYnVnOiBmYWxzZSxcbiAgaW5pdEFzeW5jOiB0cnVlLFxuXG4gIG5zOiBbJ3RyYW5zbGF0aW9uJ10sXG4gIGRlZmF1bHROUzogWyd0cmFuc2xhdGlvbiddLFxuICBmYWxsYmFja0xuZzogWydkZXYnXSxcbiAgZmFsbGJhY2tOUzogZmFsc2UsIC8vIHN0cmluZyBvciBhcnJheSBvZiBuYW1lc3BhY2VzXG5cbiAgc3VwcG9ydGVkTG5nczogZmFsc2UsIC8vIGFycmF5IHdpdGggc3VwcG9ydGVkIGxhbmd1YWdlc1xuICBub25FeHBsaWNpdFN1cHBvcnRlZExuZ3M6IGZhbHNlLFxuICBsb2FkOiAnYWxsJywgLy8gfCBjdXJyZW50T25seSB8IGxhbmd1YWdlT25seVxuICBwcmVsb2FkOiBmYWxzZSwgLy8gYXJyYXkgd2l0aCBwcmVsb2FkIGxhbmd1YWdlc1xuXG4gIHNpbXBsaWZ5UGx1cmFsU3VmZml4OiB0cnVlLFxuICBrZXlTZXBhcmF0b3I6ICcuJyxcbiAgbnNTZXBhcmF0b3I6ICc6JyxcbiAgcGx1cmFsU2VwYXJhdG9yOiAnXycsXG4gIGNvbnRleHRTZXBhcmF0b3I6ICdfJyxcblxuICBwYXJ0aWFsQnVuZGxlZExhbmd1YWdlczogZmFsc2UsIC8vIGFsbG93IGJ1bmRsaW5nIGNlcnRhaW4gbGFuZ3VhZ2VzIHRoYXQgYXJlIG5vdCByZW1vdGVseSBmZXRjaGVkXG4gIHNhdmVNaXNzaW5nOiBmYWxzZSwgLy8gZW5hYmxlIHRvIHNlbmQgbWlzc2luZyB2YWx1ZXNcbiAgdXBkYXRlTWlzc2luZzogZmFsc2UsIC8vIGVuYWJsZSB0byB1cGRhdGUgZGVmYXVsdCB2YWx1ZXMgaWYgZGlmZmVyZW50IGZyb20gdHJhbnNsYXRlZCB2YWx1ZSAob25seSB1c2VmdWwgb24gaW5pdGlhbCBkZXZlbG9wbWVudCwgb3Igd2hlbiBrZWVwaW5nIGNvZGUgYXMgc291cmNlIG9mIHRydXRoKVxuICBzYXZlTWlzc2luZ1RvOiAnZmFsbGJhY2snLCAvLyAnY3VycmVudCcgfHwgJ2FsbCdcbiAgc2F2ZU1pc3NpbmdQbHVyYWxzOiB0cnVlLCAvLyB3aWxsIHNhdmUgYWxsIGZvcm1zIG5vdCBvbmx5IHNpbmd1bGFyIGtleVxuICBtaXNzaW5nS2V5SGFuZGxlcjogZmFsc2UsIC8vIGZ1bmN0aW9uKGxuZywgbnMsIGtleSwgZmFsbGJhY2tWYWx1ZSkgLT4gb3ZlcnJpZGUgaWYgcHJlZmVyIG9uIGhhbmRsaW5nXG4gIG1pc3NpbmdJbnRlcnBvbGF0aW9uSGFuZGxlcjogZmFsc2UsIC8vIGZ1bmN0aW9uKHN0ciwgbWF0Y2gpXG5cbiAgcG9zdFByb2Nlc3M6IGZhbHNlLCAvLyBzdHJpbmcgb3IgYXJyYXkgb2YgcG9zdFByb2Nlc3NvciBuYW1lc1xuICBwb3N0UHJvY2Vzc1Bhc3NSZXNvbHZlZDogZmFsc2UsIC8vIHBhc3MgcmVzb2x2ZWQgb2JqZWN0IGludG8gJ29wdGlvbnMuaTE4blJlc29sdmVkJyBmb3IgcG9zdHByb2Nlc3NvclxuICByZXR1cm5OdWxsOiBmYWxzZSwgLy8gYWxsb3dzIG51bGwgdmFsdWUgYXMgdmFsaWQgdHJhbnNsYXRpb25cbiAgcmV0dXJuRW1wdHlTdHJpbmc6IHRydWUsIC8vIGFsbG93cyBlbXB0eSBzdHJpbmcgdmFsdWUgYXMgdmFsaWQgdHJhbnNsYXRpb25cbiAgcmV0dXJuT2JqZWN0czogZmFsc2UsXG4gIGpvaW5BcnJheXM6IGZhbHNlLCAvLyBvciBzdHJpbmcgdG8gam9pbiBhcnJheVxuICByZXR1cm5lZE9iamVjdEhhbmRsZXI6IGZhbHNlLCAvLyBmdW5jdGlvbihrZXksIHZhbHVlLCBvcHRpb25zKSB0cmlnZ2VyZWQgaWYga2V5IHJldHVybnMgb2JqZWN0IGJ1dCByZXR1cm5PYmplY3RzIGlzIHNldCB0byBmYWxzZVxuICBwYXJzZU1pc3NpbmdLZXlIYW5kbGVyOiBmYWxzZSwgLy8gZnVuY3Rpb24oa2V5KSBwYXJzZWQgYSBrZXkgdGhhdCB3YXMgbm90IGZvdW5kIGluIHQoKSBiZWZvcmUgcmV0dXJuaW5nXG4gIGFwcGVuZE5hbWVzcGFjZVRvTWlzc2luZ0tleTogZmFsc2UsXG4gIGFwcGVuZE5hbWVzcGFjZVRvQ0lNb2RlOiBmYWxzZSxcbiAgb3ZlcmxvYWRUcmFuc2xhdGlvbk9wdGlvbkhhbmRsZXI6IChhcmdzKSA9PiB7XG4gICAgbGV0IHJldCA9IHt9O1xuICAgIGlmICh0eXBlb2YgYXJnc1sxXSA9PT0gJ29iamVjdCcpIHJldCA9IGFyZ3NbMV07XG4gICAgaWYgKGlzU3RyaW5nKGFyZ3NbMV0pKSByZXQuZGVmYXVsdFZhbHVlID0gYXJnc1sxXTtcbiAgICBpZiAoaXNTdHJpbmcoYXJnc1syXSkpIHJldC50RGVzY3JpcHRpb24gPSBhcmdzWzJdO1xuICAgIGlmICh0eXBlb2YgYXJnc1syXSA9PT0gJ29iamVjdCcgfHwgdHlwZW9mIGFyZ3NbM10gPT09ICdvYmplY3QnKSB7XG4gICAgICBjb25zdCBvcHRpb25zID0gYXJnc1szXSB8fCBhcmdzWzJdO1xuICAgICAgT2JqZWN0LmtleXMob3B0aW9ucykuZm9yRWFjaCgoa2V5KSA9PiB7XG4gICAgICAgIHJldFtrZXldID0gb3B0aW9uc1trZXldO1xuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiByZXQ7XG4gIH0sXG4gIGludGVycG9sYXRpb246IHtcbiAgICBlc2NhcGVWYWx1ZTogdHJ1ZSxcbiAgICAvKiogQHR5cGUge2ltcG9ydCgnaTE4bmV4dCcpLkZvcm1hdEZ1bmN0aW9ufSAqL1xuICAgIGZvcm1hdDogKHZhbHVlKSA9PiB2YWx1ZSxcbiAgICBwcmVmaXg6ICd7eycsXG4gICAgc3VmZml4OiAnfX0nLFxuICAgIGZvcm1hdFNlcGFyYXRvcjogJywnLFxuICAgIC8vIHByZWZpeEVzY2FwZWQ6ICd7eycsXG4gICAgLy8gc3VmZml4RXNjYXBlZDogJ319JyxcbiAgICAvLyB1bmVzY2FwZVN1ZmZpeDogJycsXG4gICAgdW5lc2NhcGVQcmVmaXg6ICctJyxcblxuICAgIG5lc3RpbmdQcmVmaXg6ICckdCgnLFxuICAgIG5lc3RpbmdTdWZmaXg6ICcpJyxcbiAgICBuZXN0aW5nT3B0aW9uc1NlcGFyYXRvcjogJywnLFxuICAgIC8vIG5lc3RpbmdQcmVmaXhFc2NhcGVkOiAnJHQoJyxcbiAgICAvLyBuZXN0aW5nU3VmZml4RXNjYXBlZDogJyknLFxuICAgIC8vIGRlZmF1bHRWYXJpYWJsZXM6IHVuZGVmaW5lZCAvLyBvYmplY3QgdGhhdCBjYW4gaGF2ZSB2YWx1ZXMgdG8gaW50ZXJwb2xhdGUgb24gLSBleHRlbmRzIHBhc3NlZCBpbiBpbnRlcnBvbGF0aW9uIGRhdGFcbiAgICBtYXhSZXBsYWNlczogMTAwMCwgLy8gbWF4IHJlcGxhY2VzIHRvIHByZXZlbnQgZW5kbGVzcyBsb29wXG4gICAgc2tpcE9uVmFyaWFibGVzOiB0cnVlLFxuICB9LFxufSk7XG5cbi8qIGVzbGludCBuby1wYXJhbS1yZWFzc2lnbjogMCAqL1xuZXhwb3J0IGNvbnN0IHRyYW5zZm9ybU9wdGlvbnMgPSAob3B0aW9ucykgPT4ge1xuICAvLyBjcmVhdGUgbmFtZXNwYWNlIG9iamVjdCBpZiBuYW1lc3BhY2UgaXMgcGFzc2VkIGluIGFzIHN0cmluZ1xuICBpZiAoaXNTdHJpbmcob3B0aW9ucy5ucykpIG9wdGlvbnMubnMgPSBbb3B0aW9ucy5uc107XG4gIGlmIChpc1N0cmluZyhvcHRpb25zLmZhbGxiYWNrTG5nKSkgb3B0aW9ucy5mYWxsYmFja0xuZyA9IFtvcHRpb25zLmZhbGxiYWNrTG5nXTtcbiAgaWYgKGlzU3RyaW5nKG9wdGlvbnMuZmFsbGJhY2tOUykpIG9wdGlvbnMuZmFsbGJhY2tOUyA9IFtvcHRpb25zLmZhbGxiYWNrTlNdO1xuXG4gIC8vIGV4dGVuZCBzdXBwb3J0ZWRMbmdzIHdpdGggY2ltb2RlXG4gIGlmIChvcHRpb25zLnN1cHBvcnRlZExuZ3M/LmluZGV4T2Y/LignY2ltb2RlJykgPCAwKSB7XG4gICAgb3B0aW9ucy5zdXBwb3J0ZWRMbmdzID0gb3B0aW9ucy5zdXBwb3J0ZWRMbmdzLmNvbmNhdChbJ2NpbW9kZSddKTtcbiAgfVxuXG4gIC8vIGZvciBiYWNrd2FyZCBjb21wYXRpYmlsaXR5LCBhc3NpZ24gaW5pdEltbWVkaWF0ZSB0byBpbml0QXN5bmMgKGlmIHNldClcbiAgaWYgKHR5cGVvZiBvcHRpb25zLmluaXRJbW1lZGlhdGUgPT09ICdib29sZWFuJykgb3B0aW9ucy5pbml0QXN5bmMgPSBvcHRpb25zLmluaXRJbW1lZGlhdGU7XG5cbiAgcmV0dXJuIG9wdGlvbnM7XG59O1xuIiwiaW1wb3J0IGJhc2VMb2dnZXIgZnJvbSAnLi9sb2dnZXIuanMnO1xuaW1wb3J0IEV2ZW50RW1pdHRlciBmcm9tICcuL0V2ZW50RW1pdHRlci5qcyc7XG5pbXBvcnQgUmVzb3VyY2VTdG9yZSBmcm9tICcuL1Jlc291cmNlU3RvcmUuanMnO1xuaW1wb3J0IFRyYW5zbGF0b3IgZnJvbSAnLi9UcmFuc2xhdG9yLmpzJztcbmltcG9ydCBMYW5ndWFnZVV0aWxzIGZyb20gJy4vTGFuZ3VhZ2VVdGlscy5qcyc7XG5pbXBvcnQgUGx1cmFsUmVzb2x2ZXIgZnJvbSAnLi9QbHVyYWxSZXNvbHZlci5qcyc7XG5pbXBvcnQgSW50ZXJwb2xhdG9yIGZyb20gJy4vSW50ZXJwb2xhdG9yLmpzJztcbmltcG9ydCBGb3JtYXR0ZXIgZnJvbSAnLi9Gb3JtYXR0ZXIuanMnO1xuaW1wb3J0IEJhY2tlbmRDb25uZWN0b3IgZnJvbSAnLi9CYWNrZW5kQ29ubmVjdG9yLmpzJztcbmltcG9ydCB7IGdldCBhcyBnZXREZWZhdWx0cywgdHJhbnNmb3JtT3B0aW9ucyB9IGZyb20gJy4vZGVmYXVsdHMuanMnO1xuaW1wb3J0IHBvc3RQcm9jZXNzb3IgZnJvbSAnLi9wb3N0UHJvY2Vzc29yLmpzJztcbmltcG9ydCB7IGRlZmVyLCBpc1N0cmluZyB9IGZyb20gJy4vdXRpbHMuanMnO1xuXG5jb25zdCBub29wID0gKCkgPT4ge31cblxuLy8gQmluZHMgdGhlIG1lbWJlciBmdW5jdGlvbnMgb2YgdGhlIGdpdmVuIGNsYXNzIGluc3RhbmNlIHNvIHRoYXQgdGhleSBjYW4gYmVcbi8vIGRlc3RydWN0dXJlZCBvciB1c2VkIGFzIGNhbGxiYWNrcy5cbmNvbnN0IGJpbmRNZW1iZXJGdW5jdGlvbnMgPSAoaW5zdCkgPT4ge1xuICBjb25zdCBtZW1zID0gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMoT2JqZWN0LmdldFByb3RvdHlwZU9mKGluc3QpKVxuICBtZW1zLmZvckVhY2goKG1lbSkgPT4ge1xuICAgIGlmICh0eXBlb2YgaW5zdFttZW1dID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBpbnN0W21lbV0gPSBpbnN0W21lbV0uYmluZChpbnN0KVxuICAgIH1cbiAgfSlcbn1cblxuY2xhc3MgSTE4biBleHRlbmRzIEV2ZW50RW1pdHRlciB7XG4gIGNvbnN0cnVjdG9yKG9wdGlvbnMgPSB7fSwgY2FsbGJhY2spIHtcbiAgICBzdXBlcigpO1xuXG4gICAgdGhpcy5vcHRpb25zID0gdHJhbnNmb3JtT3B0aW9ucyhvcHRpb25zKTtcbiAgICB0aGlzLnNlcnZpY2VzID0ge307XG4gICAgdGhpcy5sb2dnZXIgPSBiYXNlTG9nZ2VyO1xuICAgIHRoaXMubW9kdWxlcyA9IHsgZXh0ZXJuYWw6IFtdIH07XG5cbiAgICBiaW5kTWVtYmVyRnVuY3Rpb25zKHRoaXMpO1xuXG4gICAgaWYgKGNhbGxiYWNrICYmICF0aGlzLmlzSW5pdGlhbGl6ZWQgJiYgIW9wdGlvbnMuaXNDbG9uZSkge1xuICAgICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL2kxOG5leHQvaTE4bmV4dC9pc3N1ZXMvODc5XG4gICAgICBpZiAoIXRoaXMub3B0aW9ucy5pbml0QXN5bmMpIHtcbiAgICAgICAgdGhpcy5pbml0KG9wdGlvbnMsIGNhbGxiYWNrKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICB9XG4gICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgdGhpcy5pbml0KG9wdGlvbnMsIGNhbGxiYWNrKTtcbiAgICAgIH0sIDApO1xuICAgIH1cbiAgfVxuXG4gIGluaXQob3B0aW9ucyA9IHt9LCBjYWxsYmFjaykge1xuICAgIHRoaXMuaXNJbml0aWFsaXppbmcgPSB0cnVlO1xuICAgIGlmICh0eXBlb2Ygb3B0aW9ucyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgY2FsbGJhY2sgPSBvcHRpb25zO1xuICAgICAgb3B0aW9ucyA9IHt9O1xuICAgIH1cblxuICAgIGlmIChvcHRpb25zLmRlZmF1bHROUyA9PSBudWxsICYmIG9wdGlvbnMubnMpIHtcbiAgICAgIGlmIChpc1N0cmluZyhvcHRpb25zLm5zKSkge1xuICAgICAgICBvcHRpb25zLmRlZmF1bHROUyA9IG9wdGlvbnMubnM7XG4gICAgICB9IGVsc2UgaWYgKG9wdGlvbnMubnMuaW5kZXhPZigndHJhbnNsYXRpb24nKSA8IDApIHtcbiAgICAgICAgb3B0aW9ucy5kZWZhdWx0TlMgPSBvcHRpb25zLm5zWzBdO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IGRlZk9wdHMgPSBnZXREZWZhdWx0cygpO1xuICAgIHRoaXMub3B0aW9ucyA9IHsgLi4uZGVmT3B0cywgLi4udGhpcy5vcHRpb25zLCAuLi50cmFuc2Zvcm1PcHRpb25zKG9wdGlvbnMpIH07XG4gICAgdGhpcy5vcHRpb25zLmludGVycG9sYXRpb24gPSB7IC4uLmRlZk9wdHMuaW50ZXJwb2xhdGlvbiwgLi4udGhpcy5vcHRpb25zLmludGVycG9sYXRpb24gfTsgLy8gZG8gbm90IHVzZSByZWZlcmVuY2VcbiAgICBpZiAob3B0aW9ucy5rZXlTZXBhcmF0b3IgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5vcHRpb25zLnVzZXJEZWZpbmVkS2V5U2VwYXJhdG9yID0gb3B0aW9ucy5rZXlTZXBhcmF0b3I7XG4gICAgfVxuICAgIGlmIChvcHRpb25zLm5zU2VwYXJhdG9yICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMub3B0aW9ucy51c2VyRGVmaW5lZE5zU2VwYXJhdG9yID0gb3B0aW9ucy5uc1NlcGFyYXRvcjtcbiAgICB9XG5cbiAgICBjb25zdCBjcmVhdGVDbGFzc09uRGVtYW5kID0gKENsYXNzT3JPYmplY3QpID0+IHtcbiAgICAgIGlmICghQ2xhc3NPck9iamVjdCkgcmV0dXJuIG51bGw7XG4gICAgICBpZiAodHlwZW9mIENsYXNzT3JPYmplY3QgPT09ICdmdW5jdGlvbicpIHJldHVybiBuZXcgQ2xhc3NPck9iamVjdCgpO1xuICAgICAgcmV0dXJuIENsYXNzT3JPYmplY3Q7XG4gICAgfVxuXG4gICAgLy8gaW5pdCBzZXJ2aWNlc1xuICAgIGlmICghdGhpcy5vcHRpb25zLmlzQ2xvbmUpIHtcbiAgICAgIGlmICh0aGlzLm1vZHVsZXMubG9nZ2VyKSB7XG4gICAgICAgIGJhc2VMb2dnZXIuaW5pdChjcmVhdGVDbGFzc09uRGVtYW5kKHRoaXMubW9kdWxlcy5sb2dnZXIpLCB0aGlzLm9wdGlvbnMpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYmFzZUxvZ2dlci5pbml0KG51bGwsIHRoaXMub3B0aW9ucyk7XG4gICAgICB9XG5cbiAgICAgIGxldCBmb3JtYXR0ZXI7XG4gICAgICBpZiAodGhpcy5tb2R1bGVzLmZvcm1hdHRlcikge1xuICAgICAgICBmb3JtYXR0ZXIgPSB0aGlzLm1vZHVsZXMuZm9ybWF0dGVyO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZm9ybWF0dGVyID0gRm9ybWF0dGVyO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBsdSA9IG5ldyBMYW5ndWFnZVV0aWxzKHRoaXMub3B0aW9ucyk7XG5cbiAgICAgIC8vIGlmICh0aGlzLm9wdGlvbnMucmVzb3VyY2VzKSB7XG4gICAgICAvLyAgIE9iamVjdC5rZXlzKHRoaXMub3B0aW9ucy5yZXNvdXJjZXMpLmZvckVhY2goKGxuZykgPT4ge1xuICAgICAgLy8gICAgIGNvbnN0IGZMbmcgPSBsdS5mb3JtYXRMYW5ndWFnZUNvZGUobG5nKTtcbiAgICAgIC8vICAgICBpZiAoZkxuZyAhPT0gbG5nKSB7XG4gICAgICAvLyAgICAgICB0aGlzLm9wdGlvbnMucmVzb3VyY2VzW2ZMbmddID0gdGhpcy5vcHRpb25zLnJlc291cmNlc1tsbmddO1xuICAgICAgLy8gICAgICAgZGVsZXRlIHRoaXMub3B0aW9ucy5yZXNvdXJjZXNbbG5nXTtcbiAgICAgIC8vICAgICAgIHRoaXMubG9nZ2VyLndhcm4oYGluaXQ6IGxuZyBpbiByZXNvdXJjZSBpcyBub3QgdmFsaWQsIG1hcHBpbmcgJHtsbmd9IHRvICR7ZkxuZ31gKTtcbiAgICAgIC8vICAgICB9XG4gICAgICAvLyAgIH0pXG4gICAgICAvLyB9XG5cbiAgICAgIHRoaXMuc3RvcmUgPSBuZXcgUmVzb3VyY2VTdG9yZSh0aGlzLm9wdGlvbnMucmVzb3VyY2VzLCB0aGlzLm9wdGlvbnMpO1xuXG4gICAgICBjb25zdCBzID0gdGhpcy5zZXJ2aWNlcztcbiAgICAgIHMubG9nZ2VyID0gYmFzZUxvZ2dlcjtcbiAgICAgIHMucmVzb3VyY2VTdG9yZSA9IHRoaXMuc3RvcmU7XG4gICAgICBzLmxhbmd1YWdlVXRpbHMgPSBsdTtcbiAgICAgIHMucGx1cmFsUmVzb2x2ZXIgPSBuZXcgUGx1cmFsUmVzb2x2ZXIobHUsIHtcbiAgICAgICAgcHJlcGVuZDogdGhpcy5vcHRpb25zLnBsdXJhbFNlcGFyYXRvcixcbiAgICAgICAgc2ltcGxpZnlQbHVyYWxTdWZmaXg6IHRoaXMub3B0aW9ucy5zaW1wbGlmeVBsdXJhbFN1ZmZpeCxcbiAgICAgIH0pO1xuXG4gICAgICBpZiAoZm9ybWF0dGVyICYmICghdGhpcy5vcHRpb25zLmludGVycG9sYXRpb24uZm9ybWF0IHx8IHRoaXMub3B0aW9ucy5pbnRlcnBvbGF0aW9uLmZvcm1hdCA9PT0gZGVmT3B0cy5pbnRlcnBvbGF0aW9uLmZvcm1hdCkpIHtcbiAgICAgICAgcy5mb3JtYXR0ZXIgPSBjcmVhdGVDbGFzc09uRGVtYW5kKGZvcm1hdHRlcik7XG4gICAgICAgIHMuZm9ybWF0dGVyLmluaXQocywgdGhpcy5vcHRpb25zKTtcblxuICAgICAgICB0aGlzLm9wdGlvbnMuaW50ZXJwb2xhdGlvbi5mb3JtYXQgPSBzLmZvcm1hdHRlci5mb3JtYXQuYmluZChzLmZvcm1hdHRlcik7XG4gICAgICB9XG5cbiAgICAgIHMuaW50ZXJwb2xhdG9yID0gbmV3IEludGVycG9sYXRvcih0aGlzLm9wdGlvbnMpO1xuICAgICAgcy51dGlscyA9IHtcbiAgICAgICAgaGFzTG9hZGVkTmFtZXNwYWNlOiB0aGlzLmhhc0xvYWRlZE5hbWVzcGFjZS5iaW5kKHRoaXMpXG4gICAgICB9XG5cbiAgICAgIHMuYmFja2VuZENvbm5lY3RvciA9IG5ldyBCYWNrZW5kQ29ubmVjdG9yKFxuICAgICAgICBjcmVhdGVDbGFzc09uRGVtYW5kKHRoaXMubW9kdWxlcy5iYWNrZW5kKSxcbiAgICAgICAgcy5yZXNvdXJjZVN0b3JlLFxuICAgICAgICBzLFxuICAgICAgICB0aGlzLm9wdGlvbnMsXG4gICAgICApO1xuICAgICAgLy8gcGlwZSBldmVudHMgZnJvbSBiYWNrZW5kQ29ubmVjdG9yXG4gICAgICBzLmJhY2tlbmRDb25uZWN0b3Iub24oJyonLCAoZXZlbnQsIC4uLmFyZ3MpID0+IHtcbiAgICAgICAgdGhpcy5lbWl0KGV2ZW50LCAuLi5hcmdzKTtcbiAgICAgIH0pO1xuXG4gICAgICBpZiAodGhpcy5tb2R1bGVzLmxhbmd1YWdlRGV0ZWN0b3IpIHtcbiAgICAgICAgcy5sYW5ndWFnZURldGVjdG9yID0gY3JlYXRlQ2xhc3NPbkRlbWFuZCh0aGlzLm1vZHVsZXMubGFuZ3VhZ2VEZXRlY3Rvcik7XG4gICAgICAgIGlmIChzLmxhbmd1YWdlRGV0ZWN0b3IuaW5pdCkgcy5sYW5ndWFnZURldGVjdG9yLmluaXQocywgdGhpcy5vcHRpb25zLmRldGVjdGlvbiwgdGhpcy5vcHRpb25zKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMubW9kdWxlcy5pMThuRm9ybWF0KSB7XG4gICAgICAgIHMuaTE4bkZvcm1hdCA9IGNyZWF0ZUNsYXNzT25EZW1hbmQodGhpcy5tb2R1bGVzLmkxOG5Gb3JtYXQpO1xuICAgICAgICBpZiAocy5pMThuRm9ybWF0LmluaXQpIHMuaTE4bkZvcm1hdC5pbml0KHRoaXMpO1xuICAgICAgfVxuXG4gICAgICB0aGlzLnRyYW5zbGF0b3IgPSBuZXcgVHJhbnNsYXRvcih0aGlzLnNlcnZpY2VzLCB0aGlzLm9wdGlvbnMpO1xuICAgICAgLy8gcGlwZSBldmVudHMgZnJvbSB0cmFuc2xhdG9yXG4gICAgICB0aGlzLnRyYW5zbGF0b3Iub24oJyonLCAoZXZlbnQsIC4uLmFyZ3MpID0+IHtcbiAgICAgICAgdGhpcy5lbWl0KGV2ZW50LCAuLi5hcmdzKTtcbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLm1vZHVsZXMuZXh0ZXJuYWwuZm9yRWFjaChtID0+IHtcbiAgICAgICAgaWYgKG0uaW5pdCkgbS5pbml0KHRoaXMpO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgdGhpcy5mb3JtYXQgPSB0aGlzLm9wdGlvbnMuaW50ZXJwb2xhdGlvbi5mb3JtYXQ7XG4gICAgaWYgKCFjYWxsYmFjaykgY2FsbGJhY2sgPSBub29wO1xuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5mYWxsYmFja0xuZyAmJiAhdGhpcy5zZXJ2aWNlcy5sYW5ndWFnZURldGVjdG9yICYmICF0aGlzLm9wdGlvbnMubG5nKSB7XG4gICAgICBjb25zdCBjb2RlcyA9IHRoaXMuc2VydmljZXMubGFuZ3VhZ2VVdGlscy5nZXRGYWxsYmFja0NvZGVzKHRoaXMub3B0aW9ucy5mYWxsYmFja0xuZylcbiAgICAgIGlmIChjb2Rlcy5sZW5ndGggPiAwICYmIGNvZGVzWzBdICE9PSAnZGV2JykgdGhpcy5vcHRpb25zLmxuZyA9IGNvZGVzWzBdXG4gICAgfVxuICAgIGlmICghdGhpcy5zZXJ2aWNlcy5sYW5ndWFnZURldGVjdG9yICYmICF0aGlzLm9wdGlvbnMubG5nKSB7XG4gICAgICB0aGlzLmxvZ2dlci53YXJuKCdpbml0OiBubyBsYW5ndWFnZURldGVjdG9yIGlzIHVzZWQgYW5kIG5vIGxuZyBpcyBkZWZpbmVkJyk7XG4gICAgfVxuXG4gICAgLy8gYXBwZW5kIGFwaVxuICAgIGNvbnN0IHN0b3JlQXBpID0gW1xuICAgICAgJ2dldFJlc291cmNlJyxcbiAgICAgICdoYXNSZXNvdXJjZUJ1bmRsZScsXG4gICAgICAnZ2V0UmVzb3VyY2VCdW5kbGUnLFxuICAgICAgJ2dldERhdGFCeUxhbmd1YWdlJyxcbiAgICBdO1xuICAgIHN0b3JlQXBpLmZvckVhY2goZmNOYW1lID0+IHtcbiAgICAgIHRoaXNbZmNOYW1lXSA9ICguLi5hcmdzKSA9PiB0aGlzLnN0b3JlW2ZjTmFtZV0oLi4uYXJncyk7XG4gICAgfSk7XG4gICAgY29uc3Qgc3RvcmVBcGlDaGFpbmVkID0gW1xuICAgICAgJ2FkZFJlc291cmNlJyxcbiAgICAgICdhZGRSZXNvdXJjZXMnLFxuICAgICAgJ2FkZFJlc291cmNlQnVuZGxlJyxcbiAgICAgICdyZW1vdmVSZXNvdXJjZUJ1bmRsZScsXG4gICAgXTtcbiAgICBzdG9yZUFwaUNoYWluZWQuZm9yRWFjaChmY05hbWUgPT4ge1xuICAgICAgdGhpc1tmY05hbWVdID0gKC4uLmFyZ3MpID0+IHtcbiAgICAgICAgdGhpcy5zdG9yZVtmY05hbWVdKC4uLmFyZ3MpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgIH07XG4gICAgfSk7XG5cbiAgICBjb25zdCBkZWZlcnJlZCA9IGRlZmVyKCk7XG5cbiAgICBjb25zdCBsb2FkID0gKCkgPT4ge1xuICAgICAgY29uc3QgZmluaXNoID0gKGVyciwgdCkgPT4ge1xuICAgICAgICB0aGlzLmlzSW5pdGlhbGl6aW5nID0gZmFsc2U7XG4gICAgICAgIGlmICh0aGlzLmlzSW5pdGlhbGl6ZWQgJiYgIXRoaXMuaW5pdGlhbGl6ZWRTdG9yZU9uY2UpIHRoaXMubG9nZ2VyLndhcm4oJ2luaXQ6IGkxOG5leHQgaXMgYWxyZWFkeSBpbml0aWFsaXplZC4gWW91IHNob3VsZCBjYWxsIGluaXQganVzdCBvbmNlIScpO1xuICAgICAgICB0aGlzLmlzSW5pdGlhbGl6ZWQgPSB0cnVlO1xuICAgICAgICBpZiAoIXRoaXMub3B0aW9ucy5pc0Nsb25lKSB0aGlzLmxvZ2dlci5sb2coJ2luaXRpYWxpemVkJywgdGhpcy5vcHRpb25zKTtcbiAgICAgICAgdGhpcy5lbWl0KCdpbml0aWFsaXplZCcsIHRoaXMub3B0aW9ucyk7XG5cbiAgICAgICAgZGVmZXJyZWQucmVzb2x2ZSh0KTsgLy8gbm90IHJlamVjdGluZyBvbiBlcnIgKGFzIGVyciBpcyBvbmx5IGEgbG9hZGluZyB0cmFuc2xhdGlvbiBmYWlsZWQgd2FybmluZylcbiAgICAgICAgY2FsbGJhY2soZXJyLCB0KTtcbiAgICAgIH07XG4gICAgICAvLyBmaXggZm9yIHVzZSBjYXNlcyB3aGVuIGNhbGxpbmcgY2hhbmdlTGFuZ3VhZ2UgYmVmb3JlIGZpbmlzaGVkIHRvIGluaXRpYWxpemVkIChpLmUuIGh0dHBzOi8vZ2l0aHViLmNvbS9pMThuZXh0L2kxOG5leHQvaXNzdWVzLzE1NTIpXG4gICAgICBpZiAodGhpcy5sYW5ndWFnZXMgJiYgIXRoaXMuaXNJbml0aWFsaXplZCkgcmV0dXJuIGZpbmlzaChudWxsLCB0aGlzLnQuYmluZCh0aGlzKSk7XG4gICAgICB0aGlzLmNoYW5nZUxhbmd1YWdlKHRoaXMub3B0aW9ucy5sbmcsIGZpbmlzaCk7XG4gICAgfTtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMucmVzb3VyY2VzIHx8ICF0aGlzLm9wdGlvbnMuaW5pdEFzeW5jKSB7XG4gICAgICBsb2FkKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHNldFRpbWVvdXQobG9hZCwgMCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGRlZmVycmVkO1xuICB9XG5cbiAgLyogZXNsaW50IGNvbnNpc3RlbnQtcmV0dXJuOiAwICovXG4gIGxvYWRSZXNvdXJjZXMobGFuZ3VhZ2UsIGNhbGxiYWNrID0gbm9vcCkge1xuICAgIGxldCB1c2VkQ2FsbGJhY2sgPSBjYWxsYmFjaztcbiAgICBjb25zdCB1c2VkTG5nID0gaXNTdHJpbmcobGFuZ3VhZ2UpID8gbGFuZ3VhZ2UgOiB0aGlzLmxhbmd1YWdlO1xuICAgIGlmICh0eXBlb2YgbGFuZ3VhZ2UgPT09ICdmdW5jdGlvbicpIHVzZWRDYWxsYmFjayA9IGxhbmd1YWdlO1xuXG4gICAgaWYgKCF0aGlzLm9wdGlvbnMucmVzb3VyY2VzIHx8IHRoaXMub3B0aW9ucy5wYXJ0aWFsQnVuZGxlZExhbmd1YWdlcykge1xuICAgICAgaWYgKHVzZWRMbmc/LnRvTG93ZXJDYXNlKCkgPT09ICdjaW1vZGUnICYmICghdGhpcy5vcHRpb25zLnByZWxvYWQgfHwgdGhpcy5vcHRpb25zLnByZWxvYWQubGVuZ3RoID09PSAwKSkgcmV0dXJuIHVzZWRDYWxsYmFjaygpOyAvLyBhdm9pZCBsb2FkaW5nIHJlc291cmNlcyBmb3IgY2ltb2RlXG5cbiAgICAgIGNvbnN0IHRvTG9hZCA9IFtdO1xuXG4gICAgICBjb25zdCBhcHBlbmQgPSBsbmcgPT4ge1xuICAgICAgICBpZiAoIWxuZykgcmV0dXJuO1xuICAgICAgICBpZiAobG5nID09PSAnY2ltb2RlJykgcmV0dXJuO1xuICAgICAgICBjb25zdCBsbmdzID0gdGhpcy5zZXJ2aWNlcy5sYW5ndWFnZVV0aWxzLnRvUmVzb2x2ZUhpZXJhcmNoeShsbmcpO1xuICAgICAgICBsbmdzLmZvckVhY2gobCA9PiB7XG4gICAgICAgICAgaWYgKGwgPT09ICdjaW1vZGUnKSByZXR1cm47XG4gICAgICAgICAgaWYgKHRvTG9hZC5pbmRleE9mKGwpIDwgMCkgdG9Mb2FkLnB1c2gobCk7XG4gICAgICAgIH0pO1xuICAgICAgfTtcblxuICAgICAgaWYgKCF1c2VkTG5nKSB7XG4gICAgICAgIC8vIGF0IGxlYXN0IGxvYWQgZmFsbGJhY2tzIGluIHRoaXMgY2FzZVxuICAgICAgICBjb25zdCBmYWxsYmFja3MgPSB0aGlzLnNlcnZpY2VzLmxhbmd1YWdlVXRpbHMuZ2V0RmFsbGJhY2tDb2Rlcyh0aGlzLm9wdGlvbnMuZmFsbGJhY2tMbmcpO1xuICAgICAgICBmYWxsYmFja3MuZm9yRWFjaChsID0+IGFwcGVuZChsKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBhcHBlbmQodXNlZExuZyk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMub3B0aW9ucy5wcmVsb2FkPy5mb3JFYWNoPy4obCA9PiBhcHBlbmQobCkpO1xuXG4gICAgICB0aGlzLnNlcnZpY2VzLmJhY2tlbmRDb25uZWN0b3IubG9hZCh0b0xvYWQsIHRoaXMub3B0aW9ucy5ucywgKGUpID0+IHtcbiAgICAgICAgaWYgKCFlICYmICF0aGlzLnJlc29sdmVkTGFuZ3VhZ2UgJiYgdGhpcy5sYW5ndWFnZSkgdGhpcy5zZXRSZXNvbHZlZExhbmd1YWdlKHRoaXMubGFuZ3VhZ2UpO1xuICAgICAgICB1c2VkQ2FsbGJhY2soZSk7XG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgdXNlZENhbGxiYWNrKG51bGwpO1xuICAgIH1cbiAgfVxuXG4gIHJlbG9hZFJlc291cmNlcyhsbmdzLCBucywgY2FsbGJhY2spIHtcbiAgICBjb25zdCBkZWZlcnJlZCA9IGRlZmVyKCk7XG4gICAgaWYgKHR5cGVvZiBsbmdzID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBjYWxsYmFjayA9IGxuZ3M7XG4gICAgICBsbmdzID0gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBpZiAodHlwZW9mIG5zID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBjYWxsYmFjayA9IG5zO1xuICAgICAgbnMgPSB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGlmICghbG5ncykgbG5ncyA9IHRoaXMubGFuZ3VhZ2VzO1xuICAgIGlmICghbnMpIG5zID0gdGhpcy5vcHRpb25zLm5zO1xuICAgIGlmICghY2FsbGJhY2spIGNhbGxiYWNrID0gbm9vcDtcbiAgICB0aGlzLnNlcnZpY2VzLmJhY2tlbmRDb25uZWN0b3IucmVsb2FkKGxuZ3MsIG5zLCBlcnIgPT4ge1xuICAgICAgZGVmZXJyZWQucmVzb2x2ZSgpOyAvLyBub3QgcmVqZWN0aW5nIG9uIGVyciAoYXMgZXJyIGlzIG9ubHkgYSBsb2FkaW5nIHRyYW5zbGF0aW9uIGZhaWxlZCB3YXJuaW5nKVxuICAgICAgY2FsbGJhY2soZXJyKTtcbiAgICB9KTtcbiAgICByZXR1cm4gZGVmZXJyZWQ7XG4gIH1cblxuICB1c2UobW9kdWxlKSB7XG4gICAgaWYgKCFtb2R1bGUpIHRocm93IG5ldyBFcnJvcignWW91IGFyZSBwYXNzaW5nIGFuIHVuZGVmaW5lZCBtb2R1bGUhIFBsZWFzZSBjaGVjayB0aGUgb2JqZWN0IHlvdSBhcmUgcGFzc2luZyB0byBpMThuZXh0LnVzZSgpJylcbiAgICBpZiAoIW1vZHVsZS50eXBlKSB0aHJvdyBuZXcgRXJyb3IoJ1lvdSBhcmUgcGFzc2luZyBhIHdyb25nIG1vZHVsZSEgUGxlYXNlIGNoZWNrIHRoZSBvYmplY3QgeW91IGFyZSBwYXNzaW5nIHRvIGkxOG5leHQudXNlKCknKVxuXG4gICAgaWYgKG1vZHVsZS50eXBlID09PSAnYmFja2VuZCcpIHtcbiAgICAgIHRoaXMubW9kdWxlcy5iYWNrZW5kID0gbW9kdWxlO1xuICAgIH1cblxuICAgIGlmIChtb2R1bGUudHlwZSA9PT0gJ2xvZ2dlcicgfHwgKG1vZHVsZS5sb2cgJiYgbW9kdWxlLndhcm4gJiYgbW9kdWxlLmVycm9yKSkge1xuICAgICAgdGhpcy5tb2R1bGVzLmxvZ2dlciA9IG1vZHVsZTtcbiAgICB9XG5cbiAgICBpZiAobW9kdWxlLnR5cGUgPT09ICdsYW5ndWFnZURldGVjdG9yJykge1xuICAgICAgdGhpcy5tb2R1bGVzLmxhbmd1YWdlRGV0ZWN0b3IgPSBtb2R1bGU7XG4gICAgfVxuXG4gICAgaWYgKG1vZHVsZS50eXBlID09PSAnaTE4bkZvcm1hdCcpIHtcbiAgICAgIHRoaXMubW9kdWxlcy5pMThuRm9ybWF0ID0gbW9kdWxlO1xuICAgIH1cblxuICAgIGlmIChtb2R1bGUudHlwZSA9PT0gJ3Bvc3RQcm9jZXNzb3InKSB7XG4gICAgICBwb3N0UHJvY2Vzc29yLmFkZFBvc3RQcm9jZXNzb3IobW9kdWxlKTtcbiAgICB9XG5cbiAgICBpZiAobW9kdWxlLnR5cGUgPT09ICdmb3JtYXR0ZXInKSB7XG4gICAgICB0aGlzLm1vZHVsZXMuZm9ybWF0dGVyID0gbW9kdWxlO1xuICAgIH1cblxuICAgIGlmIChtb2R1bGUudHlwZSA9PT0gJzNyZFBhcnR5Jykge1xuICAgICAgdGhpcy5tb2R1bGVzLmV4dGVybmFsLnB1c2gobW9kdWxlKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIHNldFJlc29sdmVkTGFuZ3VhZ2UobCkge1xuICAgIGlmICghbCB8fCAhdGhpcy5sYW5ndWFnZXMpIHJldHVybjtcbiAgICBpZiAoWydjaW1vZGUnLCAnZGV2J10uaW5kZXhPZihsKSA+IC0xKSByZXR1cm47XG4gICAgZm9yIChsZXQgbGkgPSAwOyBsaSA8IHRoaXMubGFuZ3VhZ2VzLmxlbmd0aDsgbGkrKykge1xuICAgICAgY29uc3QgbG5nSW5MbmdzID0gdGhpcy5sYW5ndWFnZXNbbGldO1xuICAgICAgaWYgKFsnY2ltb2RlJywgJ2RldiddLmluZGV4T2YobG5nSW5MbmdzKSA+IC0xKSBjb250aW51ZTtcbiAgICAgIGlmICh0aGlzLnN0b3JlLmhhc0xhbmd1YWdlU29tZVRyYW5zbGF0aW9ucyhsbmdJbkxuZ3MpKSB7XG4gICAgICAgIHRoaXMucmVzb2x2ZWRMYW5ndWFnZSA9IGxuZ0luTG5ncztcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgY2hhbmdlTGFuZ3VhZ2UobG5nLCBjYWxsYmFjaykge1xuICAgIHRoaXMuaXNMYW5ndWFnZUNoYW5naW5nVG8gPSBsbmc7XG4gICAgY29uc3QgZGVmZXJyZWQgPSBkZWZlcigpO1xuICAgIHRoaXMuZW1pdCgnbGFuZ3VhZ2VDaGFuZ2luZycsIGxuZyk7XG5cbiAgICBjb25zdCBzZXRMbmdQcm9wcyA9IChsKSA9PiB7XG4gICAgICB0aGlzLmxhbmd1YWdlID0gbDtcbiAgICAgIHRoaXMubGFuZ3VhZ2VzID0gdGhpcy5zZXJ2aWNlcy5sYW5ndWFnZVV0aWxzLnRvUmVzb2x2ZUhpZXJhcmNoeShsKTtcbiAgICAgIC8vIGZpbmQgdGhlIGZpcnN0IGxhbmd1YWdlIHJlc29sdmVkIGxhbmd1YWdlXG4gICAgICB0aGlzLnJlc29sdmVkTGFuZ3VhZ2UgPSB1bmRlZmluZWQ7XG4gICAgICB0aGlzLnNldFJlc29sdmVkTGFuZ3VhZ2UobCk7XG4gICAgfTtcblxuICAgIGNvbnN0IGRvbmUgPSAoZXJyLCBsKSA9PiB7XG4gICAgICBpZiAobCkge1xuICAgICAgICBzZXRMbmdQcm9wcyhsKTtcbiAgICAgICAgdGhpcy50cmFuc2xhdG9yLmNoYW5nZUxhbmd1YWdlKGwpO1xuICAgICAgICB0aGlzLmlzTGFuZ3VhZ2VDaGFuZ2luZ1RvID0gdW5kZWZpbmVkO1xuICAgICAgICB0aGlzLmVtaXQoJ2xhbmd1YWdlQ2hhbmdlZCcsIGwpO1xuICAgICAgICB0aGlzLmxvZ2dlci5sb2coJ2xhbmd1YWdlQ2hhbmdlZCcsIGwpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5pc0xhbmd1YWdlQ2hhbmdpbmdUbyA9IHVuZGVmaW5lZDtcbiAgICAgIH1cblxuICAgICAgZGVmZXJyZWQucmVzb2x2ZSgoLi4uYXJncykgPT4gdGhpcy50KC4uLmFyZ3MpKTtcbiAgICAgIGlmIChjYWxsYmFjaykgY2FsbGJhY2soZXJyLCAoLi4uYXJncykgPT4gdGhpcy50KC4uLmFyZ3MpKTtcbiAgICB9O1xuXG4gICAgY29uc3Qgc2V0TG5nID0gbG5ncyA9PiB7XG4gICAgICAvLyBpZiBkZXRlY3RlZCBsbmcgaXMgZmFsc3ksIHNldCBpdCB0byBlbXB0eSBhcnJheSwgdG8gbWFrZSBzdXJlIGF0IGxlYXN0IHRoZSBmYWxsYmFja0xuZyB3aWxsIGJlIHVzZWRcbiAgICAgIGlmICghbG5nICYmICFsbmdzICYmIHRoaXMuc2VydmljZXMubGFuZ3VhZ2VEZXRlY3RvcikgbG5ncyA9IFtdO1xuICAgICAgLy8gZGVwZW5kaW5nIG9uIEFQSSBpbiBkZXRlY3RvciBsbmcgY2FuIGJlIGEgc3RyaW5nIChvbGQpIG9yIGFuIGFycmF5IG9mIGxhbmd1YWdlcyBvcmRlcmVkIGluIHByaW9yaXR5XG4gICAgICBjb25zdCBsID0gaXNTdHJpbmcobG5ncykgPyBsbmdzIDogdGhpcy5zZXJ2aWNlcy5sYW5ndWFnZVV0aWxzLmdldEJlc3RNYXRjaEZyb21Db2RlcyhsbmdzKTtcblxuICAgICAgaWYgKGwpIHtcbiAgICAgICAgaWYgKCF0aGlzLmxhbmd1YWdlKSB7XG4gICAgICAgICAgc2V0TG5nUHJvcHMobCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCF0aGlzLnRyYW5zbGF0b3IubGFuZ3VhZ2UpIHRoaXMudHJhbnNsYXRvci5jaGFuZ2VMYW5ndWFnZShsKTtcblxuICAgICAgICB0aGlzLnNlcnZpY2VzLmxhbmd1YWdlRGV0ZWN0b3I/LmNhY2hlVXNlckxhbmd1YWdlPy4obCk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMubG9hZFJlc291cmNlcyhsLCBlcnIgPT4ge1xuICAgICAgICBkb25lKGVyciwgbCk7XG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgaWYgKCFsbmcgJiYgdGhpcy5zZXJ2aWNlcy5sYW5ndWFnZURldGVjdG9yICYmICF0aGlzLnNlcnZpY2VzLmxhbmd1YWdlRGV0ZWN0b3IuYXN5bmMpIHtcbiAgICAgIHNldExuZyh0aGlzLnNlcnZpY2VzLmxhbmd1YWdlRGV0ZWN0b3IuZGV0ZWN0KCkpO1xuICAgIH0gZWxzZSBpZiAoIWxuZyAmJiB0aGlzLnNlcnZpY2VzLmxhbmd1YWdlRGV0ZWN0b3IgJiYgdGhpcy5zZXJ2aWNlcy5sYW5ndWFnZURldGVjdG9yLmFzeW5jKSB7XG4gICAgICBpZiAodGhpcy5zZXJ2aWNlcy5sYW5ndWFnZURldGVjdG9yLmRldGVjdC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgdGhpcy5zZXJ2aWNlcy5sYW5ndWFnZURldGVjdG9yLmRldGVjdCgpLnRoZW4oc2V0TG5nKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuc2VydmljZXMubGFuZ3VhZ2VEZXRlY3Rvci5kZXRlY3Qoc2V0TG5nKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgc2V0TG5nKGxuZyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGRlZmVycmVkO1xuICB9XG5cbiAgZ2V0Rml4ZWRUKGxuZywgbnMsIGtleVByZWZpeCkge1xuICAgIGNvbnN0IGZpeGVkVCA9IChrZXksIG9wdHMsIC4uLnJlc3QpID0+IHtcbiAgICAgIGxldCBvcHRpb25zO1xuICAgICAgaWYgKHR5cGVvZiBvcHRzICE9PSAnb2JqZWN0Jykge1xuICAgICAgICBvcHRpb25zID0gdGhpcy5vcHRpb25zLm92ZXJsb2FkVHJhbnNsYXRpb25PcHRpb25IYW5kbGVyKFtrZXksIG9wdHNdLmNvbmNhdChyZXN0KSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvcHRpb25zID0geyAuLi5vcHRzIH07XG4gICAgICB9XG5cbiAgICAgIG9wdGlvbnMubG5nID0gb3B0aW9ucy5sbmcgfHwgZml4ZWRULmxuZztcbiAgICAgIG9wdGlvbnMubG5ncyA9IG9wdGlvbnMubG5ncyB8fCBmaXhlZFQubG5ncztcbiAgICAgIG9wdGlvbnMubnMgPSBvcHRpb25zLm5zIHx8IGZpeGVkVC5ucztcbiAgICAgIGlmIChvcHRpb25zLmtleVByZWZpeCAhPT0gJycpIG9wdGlvbnMua2V5UHJlZml4ID0gb3B0aW9ucy5rZXlQcmVmaXggfHwga2V5UHJlZml4IHx8IGZpeGVkVC5rZXlQcmVmaXg7XG5cbiAgICAgIGNvbnN0IGtleVNlcGFyYXRvciA9IHRoaXMub3B0aW9ucy5rZXlTZXBhcmF0b3IgfHwgJy4nO1xuICAgICAgbGV0IHJlc3VsdEtleVxuICAgICAgaWYgKG9wdGlvbnMua2V5UHJlZml4ICYmIEFycmF5LmlzQXJyYXkoa2V5KSkge1xuICAgICAgICByZXN1bHRLZXkgPSBrZXkubWFwKGsgPT4gYCR7b3B0aW9ucy5rZXlQcmVmaXh9JHtrZXlTZXBhcmF0b3J9JHtrfWApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzdWx0S2V5ID0gb3B0aW9ucy5rZXlQcmVmaXggPyBgJHtvcHRpb25zLmtleVByZWZpeH0ke2tleVNlcGFyYXRvcn0ke2tleX1gIDoga2V5O1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXMudChyZXN1bHRLZXksIG9wdGlvbnMpO1xuICAgIH07XG4gICAgaWYgKGlzU3RyaW5nKGxuZykpIHtcbiAgICAgIGZpeGVkVC5sbmcgPSBsbmc7XG4gICAgfSBlbHNlIHtcbiAgICAgIGZpeGVkVC5sbmdzID0gbG5nO1xuICAgIH1cbiAgICBmaXhlZFQubnMgPSBucztcbiAgICBmaXhlZFQua2V5UHJlZml4ID0ga2V5UHJlZml4O1xuICAgIHJldHVybiBmaXhlZFQ7XG4gIH1cblxuICB0KC4uLmFyZ3MpIHtcbiAgICByZXR1cm4gdGhpcy50cmFuc2xhdG9yPy50cmFuc2xhdGUoLi4uYXJncyk7XG4gIH1cblxuICBleGlzdHMoLi4uYXJncykge1xuICAgIHJldHVybiB0aGlzLnRyYW5zbGF0b3I/LmV4aXN0cyguLi5hcmdzKTtcbiAgfVxuXG4gIHNldERlZmF1bHROYW1lc3BhY2UobnMpIHtcbiAgICB0aGlzLm9wdGlvbnMuZGVmYXVsdE5TID0gbnM7XG4gIH1cblxuICBoYXNMb2FkZWROYW1lc3BhY2UobnMsIG9wdGlvbnMgPSB7fSkge1xuICAgIGlmICghdGhpcy5pc0luaXRpYWxpemVkKSB7XG4gICAgICB0aGlzLmxvZ2dlci53YXJuKCdoYXNMb2FkZWROYW1lc3BhY2U6IGkxOG5leHQgd2FzIG5vdCBpbml0aWFsaXplZCcsIHRoaXMubGFuZ3VhZ2VzKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgaWYgKCF0aGlzLmxhbmd1YWdlcyB8fCAhdGhpcy5sYW5ndWFnZXMubGVuZ3RoKSB7XG4gICAgICB0aGlzLmxvZ2dlci53YXJuKCdoYXNMb2FkZWROYW1lc3BhY2U6IGkxOG4ubGFuZ3VhZ2VzIHdlcmUgdW5kZWZpbmVkIG9yIGVtcHR5JywgdGhpcy5sYW5ndWFnZXMpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGNvbnN0IGxuZyA9IG9wdGlvbnMubG5nIHx8IHRoaXMucmVzb2x2ZWRMYW5ndWFnZSB8fCB0aGlzLmxhbmd1YWdlc1swXTtcbiAgICBjb25zdCBmYWxsYmFja0xuZyA9IHRoaXMub3B0aW9ucyA/IHRoaXMub3B0aW9ucy5mYWxsYmFja0xuZyA6IGZhbHNlO1xuICAgIGNvbnN0IGxhc3RMbmcgPSB0aGlzLmxhbmd1YWdlc1t0aGlzLmxhbmd1YWdlcy5sZW5ndGggLSAxXTtcblxuICAgIC8vIHdlJ3JlIGluIGNpbW9kZSBzbyB0aGlzIHNoYWxsIHBhc3NcbiAgICBpZiAobG5nLnRvTG93ZXJDYXNlKCkgPT09ICdjaW1vZGUnKSByZXR1cm4gdHJ1ZTtcblxuICAgIGNvbnN0IGxvYWROb3RQZW5kaW5nID0gKGwsIG4pID0+IHtcbiAgICAgIGNvbnN0IGxvYWRTdGF0ZSA9IHRoaXMuc2VydmljZXMuYmFja2VuZENvbm5lY3Rvci5zdGF0ZVtgJHtsfXwke259YF07XG4gICAgICByZXR1cm4gbG9hZFN0YXRlID09PSAtMSB8fCBsb2FkU3RhdGUgPT09IDAgfHwgbG9hZFN0YXRlID09PSAyO1xuICAgIH07XG5cbiAgICAvLyBvcHRpb25hbCBpbmplY3RlZCBjaGVja1xuICAgIGlmIChvcHRpb25zLnByZWNoZWNrKSB7XG4gICAgICBjb25zdCBwcmVSZXN1bHQgPSBvcHRpb25zLnByZWNoZWNrKHRoaXMsIGxvYWROb3RQZW5kaW5nKTtcbiAgICAgIGlmIChwcmVSZXN1bHQgIT09IHVuZGVmaW5lZCkgcmV0dXJuIHByZVJlc3VsdDtcbiAgICB9XG5cbiAgICAvLyBsb2FkZWQgLT4gU1VDQ0VTU1xuICAgIGlmICh0aGlzLmhhc1Jlc291cmNlQnVuZGxlKGxuZywgbnMpKSByZXR1cm4gdHJ1ZTtcblxuICAgIC8vIHdlcmUgbm90IGxvYWRpbmcgYXQgYWxsIC0+IFNFTUkgU1VDQ0VTU1xuICAgIGlmICghdGhpcy5zZXJ2aWNlcy5iYWNrZW5kQ29ubmVjdG9yLmJhY2tlbmQgfHwgKHRoaXMub3B0aW9ucy5yZXNvdXJjZXMgJiYgIXRoaXMub3B0aW9ucy5wYXJ0aWFsQnVuZGxlZExhbmd1YWdlcykpIHJldHVybiB0cnVlO1xuXG4gICAgLy8gZmFpbGVkIGxvYWRpbmcgbnMgLSBidXQgYXQgbGVhc3QgZmFsbGJhY2sgaXMgbm90IHBlbmRpbmcgLT4gU0VNSSBTVUNDRVNTXG4gICAgaWYgKGxvYWROb3RQZW5kaW5nKGxuZywgbnMpICYmICghZmFsbGJhY2tMbmcgfHwgbG9hZE5vdFBlbmRpbmcobGFzdExuZywgbnMpKSkgcmV0dXJuIHRydWU7XG5cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBsb2FkTmFtZXNwYWNlcyhucywgY2FsbGJhY2spIHtcbiAgICBjb25zdCBkZWZlcnJlZCA9IGRlZmVyKCk7XG5cbiAgICBpZiAoIXRoaXMub3B0aW9ucy5ucykge1xuICAgICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjaygpO1xuICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICAgIH1cbiAgICBpZiAoaXNTdHJpbmcobnMpKSBucyA9IFtuc107XG5cbiAgICBucy5mb3JFYWNoKG4gPT4ge1xuICAgICAgaWYgKHRoaXMub3B0aW9ucy5ucy5pbmRleE9mKG4pIDwgMCkgdGhpcy5vcHRpb25zLm5zLnB1c2gobik7XG4gICAgfSk7XG5cbiAgICB0aGlzLmxvYWRSZXNvdXJjZXMoZXJyID0+IHtcbiAgICAgIGRlZmVycmVkLnJlc29sdmUoKTtcbiAgICAgIGlmIChjYWxsYmFjaykgY2FsbGJhY2soZXJyKTtcbiAgICB9KTtcblxuICAgIHJldHVybiBkZWZlcnJlZDtcbiAgfVxuXG4gIGxvYWRMYW5ndWFnZXMobG5ncywgY2FsbGJhY2spIHtcbiAgICBjb25zdCBkZWZlcnJlZCA9IGRlZmVyKCk7XG5cbiAgICBpZiAoaXNTdHJpbmcobG5ncykpIGxuZ3MgPSBbbG5nc107XG4gICAgY29uc3QgcHJlbG9hZGVkID0gdGhpcy5vcHRpb25zLnByZWxvYWQgfHwgW107XG5cbiAgICBjb25zdCBuZXdMbmdzID0gbG5ncy5maWx0ZXIobG5nID0+IHByZWxvYWRlZC5pbmRleE9mKGxuZykgPCAwICYmIHRoaXMuc2VydmljZXMubGFuZ3VhZ2VVdGlscy5pc1N1cHBvcnRlZENvZGUobG5nKSk7XG4gICAgLy8gRXhpdCBlYXJseSBpZiBhbGwgZ2l2ZW4gbGFuZ3VhZ2VzIGFyZSBhbHJlYWR5IHByZWxvYWRlZFxuICAgIGlmICghbmV3TG5ncy5sZW5ndGgpIHtcbiAgICAgIGlmIChjYWxsYmFjaykgY2FsbGJhY2soKTtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcbiAgICB9XG5cbiAgICB0aGlzLm9wdGlvbnMucHJlbG9hZCA9IHByZWxvYWRlZC5jb25jYXQobmV3TG5ncyk7XG4gICAgdGhpcy5sb2FkUmVzb3VyY2VzKGVyciA9PiB7XG4gICAgICBkZWZlcnJlZC5yZXNvbHZlKCk7XG4gICAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrKGVycik7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gZGVmZXJyZWQ7XG4gIH1cblxuICBkaXIobG5nKSB7XG4gICAgaWYgKCFsbmcpIGxuZyA9IHRoaXMucmVzb2x2ZWRMYW5ndWFnZSB8fCAodGhpcy5sYW5ndWFnZXM/Lmxlbmd0aCA+IDAgPyB0aGlzLmxhbmd1YWdlc1swXSA6IHRoaXMubGFuZ3VhZ2UpO1xuICAgIGlmICghbG5nKSByZXR1cm4gJ3J0bCc7XG5cbiAgICBjb25zdCBydGxMbmdzID0gW1xuICAgICAgJ2FyJyxcbiAgICAgICdzaHUnLFxuICAgICAgJ3NxcicsXG4gICAgICAnc3NoJyxcbiAgICAgICd4YWEnLFxuICAgICAgJ3loZCcsXG4gICAgICAneXVkJyxcbiAgICAgICdhYW8nLFxuICAgICAgJ2FiaCcsXG4gICAgICAnYWJ2JyxcbiAgICAgICdhY20nLFxuICAgICAgJ2FjcScsXG4gICAgICAnYWN3JyxcbiAgICAgICdhY3gnLFxuICAgICAgJ2FjeScsXG4gICAgICAnYWRmJyxcbiAgICAgICdhZHMnLFxuICAgICAgJ2FlYicsXG4gICAgICAnYWVjJyxcbiAgICAgICdhZmInLFxuICAgICAgJ2FqcCcsXG4gICAgICAnYXBjJyxcbiAgICAgICdhcGQnLFxuICAgICAgJ2FyYicsXG4gICAgICAnYXJxJyxcbiAgICAgICdhcnMnLFxuICAgICAgJ2FyeScsXG4gICAgICAnYXJ6JyxcbiAgICAgICdhdXonLFxuICAgICAgJ2F2bCcsXG4gICAgICAnYXloJyxcbiAgICAgICdheWwnLFxuICAgICAgJ2F5bicsXG4gICAgICAnYXlwJyxcbiAgICAgICdiYnonLFxuICAgICAgJ3BnYScsXG4gICAgICAnaGUnLFxuICAgICAgJ2l3JyxcbiAgICAgICdwcycsXG4gICAgICAncGJ0JyxcbiAgICAgICdwYnUnLFxuICAgICAgJ3BzdCcsXG4gICAgICAncHJwJyxcbiAgICAgICdwcmQnLFxuICAgICAgJ3VnJyxcbiAgICAgICd1cicsXG4gICAgICAneWRkJyxcbiAgICAgICd5ZHMnLFxuICAgICAgJ3lpaCcsXG4gICAgICAnamknLFxuICAgICAgJ3lpJyxcbiAgICAgICdoYm8nLFxuICAgICAgJ21lbicsXG4gICAgICAneG1uJyxcbiAgICAgICdmYScsXG4gICAgICAnanByJyxcbiAgICAgICdwZW8nLFxuICAgICAgJ3BlcycsXG4gICAgICAncHJzJyxcbiAgICAgICdkdicsXG4gICAgICAnc2FtJyxcbiAgICAgICdja2InXG4gICAgXTtcblxuICAgIGNvbnN0IGxhbmd1YWdlVXRpbHMgPSB0aGlzLnNlcnZpY2VzPy5sYW5ndWFnZVV0aWxzIHx8IG5ldyBMYW5ndWFnZVV0aWxzKGdldERlZmF1bHRzKCkpIC8vIGZvciB1bmluaXRpYWxpemVkIHVzYWdlXG5cbiAgICByZXR1cm4gcnRsTG5ncy5pbmRleE9mKGxhbmd1YWdlVXRpbHMuZ2V0TGFuZ3VhZ2VQYXJ0RnJvbUNvZGUobG5nKSkgPiAtMSB8fCBsbmcudG9Mb3dlckNhc2UoKS5pbmRleE9mKCctYXJhYicpID4gMVxuICAgICAgPyAncnRsJ1xuICAgICAgOiAnbHRyJztcbiAgfVxuXG4gIHN0YXRpYyBjcmVhdGVJbnN0YW5jZShvcHRpb25zID0ge30sIGNhbGxiYWNrKSB7IHJldHVybiBuZXcgSTE4bihvcHRpb25zLCBjYWxsYmFjaykgfVxuXG4gIGNsb25lSW5zdGFuY2Uob3B0aW9ucyA9IHt9LCBjYWxsYmFjayA9IG5vb3ApIHtcbiAgICBjb25zdCBmb3JrUmVzb3VyY2VTdG9yZSA9IG9wdGlvbnMuZm9ya1Jlc291cmNlU3RvcmU7XG4gICAgaWYgKGZvcmtSZXNvdXJjZVN0b3JlKSBkZWxldGUgb3B0aW9ucy5mb3JrUmVzb3VyY2VTdG9yZTtcbiAgICBjb25zdCBtZXJnZWRPcHRpb25zID0geyAuLi50aGlzLm9wdGlvbnMsIC4uLm9wdGlvbnMsIC4uLnsgaXNDbG9uZTogdHJ1ZSB9IH07XG4gICAgY29uc3QgY2xvbmUgPSBuZXcgSTE4bihtZXJnZWRPcHRpb25zKTtcbiAgICBpZiAoKG9wdGlvbnMuZGVidWcgIT09IHVuZGVmaW5lZCB8fCBvcHRpb25zLnByZWZpeCAhPT0gdW5kZWZpbmVkKSkge1xuICAgICAgY2xvbmUubG9nZ2VyID0gY2xvbmUubG9nZ2VyLmNsb25lKG9wdGlvbnMpO1xuICAgIH1cbiAgICBjb25zdCBtZW1iZXJzVG9Db3B5ID0gWydzdG9yZScsICdzZXJ2aWNlcycsICdsYW5ndWFnZSddO1xuICAgIG1lbWJlcnNUb0NvcHkuZm9yRWFjaChtID0+IHtcbiAgICAgIGNsb25lW21dID0gdGhpc1ttXTtcbiAgICB9KTtcbiAgICBjbG9uZS5zZXJ2aWNlcyA9IHsgLi4udGhpcy5zZXJ2aWNlcyB9O1xuICAgIGNsb25lLnNlcnZpY2VzLnV0aWxzID0ge1xuICAgICAgaGFzTG9hZGVkTmFtZXNwYWNlOiBjbG9uZS5oYXNMb2FkZWROYW1lc3BhY2UuYmluZChjbG9uZSlcbiAgICB9O1xuICAgIGlmIChmb3JrUmVzb3VyY2VTdG9yZSkge1xuICAgICAgLy8gZmFzdGVyIHRoYW4gY29uc3QgY2xvbmVkRGF0YSA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkodGhpcy5zdG9yZS5kYXRhKSlcbiAgICAgIGNvbnN0IGNsb25lZERhdGEgPSBPYmplY3Qua2V5cyh0aGlzLnN0b3JlLmRhdGEpLnJlZHVjZSgocHJldiwgbCkgPT4ge1xuICAgICAgICBwcmV2W2xdID0geyAuLi50aGlzLnN0b3JlLmRhdGFbbF0gfTtcbiAgICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKHByZXZbbF0pLnJlZHVjZSgoYWNjLCBuKSA9PiB7XG4gICAgICAgICAgYWNjW25dID0geyAuLi5wcmV2W2xdW25dIH07XG4gICAgICAgICAgcmV0dXJuIGFjYztcbiAgICAgICAgfSwge30pO1xuICAgICAgfSwge30pO1xuICAgICAgY2xvbmUuc3RvcmUgPSBuZXcgUmVzb3VyY2VTdG9yZShjbG9uZWREYXRhLCBtZXJnZWRPcHRpb25zKTtcbiAgICAgIGNsb25lLnNlcnZpY2VzLnJlc291cmNlU3RvcmUgPSBjbG9uZS5zdG9yZTtcbiAgICB9XG4gICAgY2xvbmUudHJhbnNsYXRvciA9IG5ldyBUcmFuc2xhdG9yKGNsb25lLnNlcnZpY2VzLCBtZXJnZWRPcHRpb25zKTtcbiAgICBjbG9uZS50cmFuc2xhdG9yLm9uKCcqJywgKGV2ZW50LCAuLi5hcmdzKSA9PiB7XG4gICAgICBjbG9uZS5lbWl0KGV2ZW50LCAuLi5hcmdzKTtcbiAgICB9KTtcbiAgICBjbG9uZS5pbml0KG1lcmdlZE9wdGlvbnMsIGNhbGxiYWNrKTtcbiAgICBjbG9uZS50cmFuc2xhdG9yLm9wdGlvbnMgPSBtZXJnZWRPcHRpb25zOyAvLyBzeW5jIG9wdGlvbnNcbiAgICBjbG9uZS50cmFuc2xhdG9yLmJhY2tlbmRDb25uZWN0b3Iuc2VydmljZXMudXRpbHMgPSB7XG4gICAgICBoYXNMb2FkZWROYW1lc3BhY2U6IGNsb25lLmhhc0xvYWRlZE5hbWVzcGFjZS5iaW5kKGNsb25lKVxuICAgIH07XG5cbiAgICByZXR1cm4gY2xvbmU7XG4gIH1cblxuICB0b0pTT04oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIG9wdGlvbnM6IHRoaXMub3B0aW9ucyxcbiAgICAgIHN0b3JlOiB0aGlzLnN0b3JlLFxuICAgICAgbGFuZ3VhZ2U6IHRoaXMubGFuZ3VhZ2UsXG4gICAgICBsYW5ndWFnZXM6IHRoaXMubGFuZ3VhZ2VzLFxuICAgICAgcmVzb2x2ZWRMYW5ndWFnZTogdGhpcy5yZXNvbHZlZExhbmd1YWdlXG4gICAgfTtcbiAgfVxufVxuXG5jb25zdCBpbnN0YW5jZSA9IEkxOG4uY3JlYXRlSW5zdGFuY2UoKTtcbmluc3RhbmNlLmNyZWF0ZUluc3RhbmNlID0gSTE4bi5jcmVhdGVJbnN0YW5jZTtcblxuZXhwb3J0IGRlZmF1bHQgaW5zdGFuY2U7XG4iLCJpbXBvcnQgaTE4bmV4dCBmcm9tICcuL2kxOG5leHQuanMnO1xuXG5leHBvcnQgZGVmYXVsdCBpMThuZXh0O1xuXG5leHBvcnQgY29uc3QgY3JlYXRlSW5zdGFuY2UgPSBpMThuZXh0LmNyZWF0ZUluc3RhbmNlO1xuXG5leHBvcnQgY29uc3QgZGlyID0gaTE4bmV4dC5kaXI7XG5leHBvcnQgY29uc3QgaW5pdCA9IGkxOG5leHQuaW5pdDtcbmV4cG9ydCBjb25zdCBsb2FkUmVzb3VyY2VzID0gaTE4bmV4dC5sb2FkUmVzb3VyY2VzO1xuZXhwb3J0IGNvbnN0IHJlbG9hZFJlc291cmNlcyA9IGkxOG5leHQucmVsb2FkUmVzb3VyY2VzO1xuZXhwb3J0IGNvbnN0IHVzZSA9IGkxOG5leHQudXNlO1xuZXhwb3J0IGNvbnN0IGNoYW5nZUxhbmd1YWdlID0gaTE4bmV4dC5jaGFuZ2VMYW5ndWFnZTtcbmV4cG9ydCBjb25zdCBnZXRGaXhlZFQgPSBpMThuZXh0LmdldEZpeGVkVDtcbmV4cG9ydCBjb25zdCB0ID0gaTE4bmV4dC50O1xuZXhwb3J0IGNvbnN0IGV4aXN0cyA9IGkxOG5leHQuZXhpc3RzO1xuZXhwb3J0IGNvbnN0IHNldERlZmF1bHROYW1lc3BhY2UgPSBpMThuZXh0LnNldERlZmF1bHROYW1lc3BhY2U7XG5leHBvcnQgY29uc3QgaGFzTG9hZGVkTmFtZXNwYWNlID0gaTE4bmV4dC5oYXNMb2FkZWROYW1lc3BhY2U7XG5leHBvcnQgY29uc3QgbG9hZE5hbWVzcGFjZXMgPSBpMThuZXh0LmxvYWROYW1lc3BhY2VzO1xuZXhwb3J0IGNvbnN0IGxvYWRMYW5ndWFnZXMgPSBpMThuZXh0LmxvYWRMYW5ndWFnZXM7XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1uYW1lc3BhY2UsXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueSxcbiAqL1xuXG5pbXBvcnQge1xuICAgIGRlZmF1bHQgYXMgaTE4bmV4dCxcbiAgICBpMThuIGFzIGkxOG5leHRJbnN0YW5jZSxcbiAgICBGYWxsYmFja0xuZ09iakxpc3QgYXMgaTE4bmV4dEZhbGxiYWNrTG5nT2JqTGlzdCxcbiAgICBGYWxsYmFja0xuZyBhcyBpMThuZXh0RmFsbGJhY2tMbmcsXG4gICAgSW50ZXJwb2xhdGlvbk9wdGlvbnMgYXMgaTE4bmV4dEludGVycG9sYXRpb25PcHRpb25zLFxuICAgIFJlYWN0T3B0aW9ucyBhcyBpMThuZXh0UmVhY3RPcHRpb25zLFxuICAgIEluaXRPcHRpb25zIGFzIGkxOG5leHRJbml0T3B0aW9ucyxcbiAgICBUT3B0aW9uc0Jhc2UgYXMgaTE4bmV4dFRPcHRpb25zQmFzZSxcbiAgICBUT3B0aW9ucyBhcyBpMThuZXh0VE9wdGlvbnMsXG4gICAgRXhpc3RzRnVuY3Rpb24gYXMgaTE4bmV4dEV4aXN0c0Z1bmN0aW9uLFxuICAgIFdpdGhUIGFzIGkxOG5leHRXaXRoVCxcbiAgICBURnVuY3Rpb24gYXMgaTE4bmV4dFRGdW5jdGlvbixcbiAgICBSZXNvdXJjZSBhcyBpMThuZXh0UmVzb3VyY2UsXG4gICAgUmVzb3VyY2VMYW5ndWFnZSBhcyBpMThuZXh0UmVzb3VyY2VMYW5ndWFnZSxcbiAgICBSZXNvdXJjZUtleSBhcyBpMThuZXh0UmVzb3VyY2VLZXksXG4gICAgSW50ZXJwb2xhdG9yIGFzIGkxOG5leHRJbnRlcnBvbGF0b3IsXG4gICAgUmVzb3VyY2VTdG9yZSBhcyBpMThuZXh0UmVzb3VyY2VTdG9yZSxcbiAgICBTZXJ2aWNlcyBhcyBpMThuZXh0U2VydmljZXMsXG4gICAgTW9kdWxlIGFzIGkxOG5leHRNb2R1bGUsXG4gICAgQ2FsbGJhY2tFcnJvciBhcyBpMThuZXh0Q2FsbGJhY2tFcnJvcixcbiAgICBSZWFkQ2FsbGJhY2sgYXMgaTE4bmV4dFJlYWRDYWxsYmFjayxcbiAgICBNdWx0aVJlYWRDYWxsYmFjayBhcyBpMThuZXh0TXVsdGlSZWFkQ2FsbGJhY2ssXG4gICAgQmFja2VuZE1vZHVsZSBhcyBpMThuZXh0QmFja2VuZE1vZHVsZSxcbiAgICBMYW5ndWFnZURldGVjdG9yTW9kdWxlIGFzIGkxOG5leHRMYW5ndWFnZURldGVjdG9yTW9kdWxlLFxuICAgIExhbmd1YWdlRGV0ZWN0b3JBc3luY01vZHVsZSBhcyBpMThuZXh0TGFuZ3VhZ2VEZXRlY3RvckFzeW5jTW9kdWxlLFxuICAgIFBvc3RQcm9jZXNzb3JNb2R1bGUgYXMgaTE4bmV4dFBvc3RQcm9jZXNzb3JNb2R1bGUsXG4gICAgTG9nZ2VyTW9kdWxlIGFzIGkxOG5leHRMb2dnZXJNb2R1bGUsXG4gICAgSTE4bkZvcm1hdE1vZHVsZSBhcyBpMThuZXh0STE4bkZvcm1hdE1vZHVsZSxcbiAgICBUaGlyZFBhcnR5TW9kdWxlIGFzIGkxOG5leHRUaGlyZFBhcnR5TW9kdWxlLFxuICAgIE1vZHVsZXMgYXMgaTE4bmV4dE1vZHVsZXMsXG4gICAgTmV3YWJsZSBhcyBpMThuZXh0TmV3YWJsZSxcbn0gZnJvbSAnaTE4bmV4dCc7XG5cbmNvbnN0IGkxOG46IGkxOG4uaTE4biA9IGkxOG5leHQ7XG5cbmRlY2xhcmUgbmFtZXNwYWNlIGkxOG4ge1xuICAgIGV4cG9ydCB0eXBlIGkxOG4gPSBpMThuZXh0SW5zdGFuY2U7XG4gICAgZXhwb3J0IHR5cGUgRmFsbGJhY2tMbmdPYmpMaXN0ID0gaTE4bmV4dEZhbGxiYWNrTG5nT2JqTGlzdDtcbiAgICBleHBvcnQgdHlwZSBGYWxsYmFja0xuZyA9IGkxOG5leHRGYWxsYmFja0xuZztcbiAgICBleHBvcnQgdHlwZSBJbnRlcnBvbGF0aW9uT3B0aW9ucyA9IGkxOG5leHRJbnRlcnBvbGF0aW9uT3B0aW9ucztcbiAgICBleHBvcnQgdHlwZSBSZWFjdE9wdGlvbnMgPSBpMThuZXh0UmVhY3RPcHRpb25zO1xuICAgIGV4cG9ydCB0eXBlIEluaXRPcHRpb25zID0gaTE4bmV4dEluaXRPcHRpb25zO1xuICAgIGV4cG9ydCB0eXBlIFRPcHRpb25zQmFzZSA9IGkxOG5leHRUT3B0aW9uc0Jhc2U7XG4gICAgZXhwb3J0IHR5cGUgVE9wdGlvbnM8VCBleHRlbmRzIFJlY29yZDxzdHJpbmcsIHVua25vd24+ID0gUmVjb3JkPHN0cmluZywgYW55Pj4gPSBpMThuZXh0VE9wdGlvbnM8VD47XG4gICAgZXhwb3J0IHR5cGUgRXhpc3RzRnVuY3Rpb248SyBleHRlbmRzIHN0cmluZyA9IHN0cmluZywgVCBleHRlbmRzIFJlY29yZDxzdHJpbmcsIHVua25vd24+ID0gUmVjb3JkPHN0cmluZywgYW55Pj4gPSBpMThuZXh0RXhpc3RzRnVuY3Rpb248SywgVD47XG4gICAgZXhwb3J0IHR5cGUgV2l0aFQgPSBpMThuZXh0V2l0aFQ7XG4gICAgZXhwb3J0IHR5cGUgVEZ1bmN0aW9uID0gaTE4bmV4dFRGdW5jdGlvbjtcbiAgICBleHBvcnQgdHlwZSBSZXNvdXJjZSA9IGkxOG5leHRSZXNvdXJjZTtcbiAgICBleHBvcnQgdHlwZSBSZXNvdXJjZUxhbmd1YWdlID0gaTE4bmV4dFJlc291cmNlTGFuZ3VhZ2U7XG4gICAgZXhwb3J0IHR5cGUgUmVzb3VyY2VLZXkgPSBpMThuZXh0UmVzb3VyY2VLZXk7XG4gICAgZXhwb3J0IHR5cGUgSW50ZXJwb2xhdG9yID0gaTE4bmV4dEludGVycG9sYXRvcjtcbiAgICBleHBvcnQgdHlwZSBSZXNvdXJjZVN0b3JlID0gaTE4bmV4dFJlc291cmNlU3RvcmU7XG4gICAgZXhwb3J0IHR5cGUgU2VydmljZXMgPSBpMThuZXh0U2VydmljZXM7XG4gICAgZXhwb3J0IHR5cGUgTW9kdWxlID0gaTE4bmV4dE1vZHVsZTtcbiAgICBleHBvcnQgdHlwZSBDYWxsYmFja0Vycm9yID0gaTE4bmV4dENhbGxiYWNrRXJyb3I7XG4gICAgZXhwb3J0IHR5cGUgUmVhZENhbGxiYWNrID0gaTE4bmV4dFJlYWRDYWxsYmFjaztcbiAgICBleHBvcnQgdHlwZSBNdWx0aVJlYWRDYWxsYmFjayA9IGkxOG5leHRNdWx0aVJlYWRDYWxsYmFjaztcbiAgICBleHBvcnQgdHlwZSBCYWNrZW5kTW9kdWxlPFQgPSBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPj4gPSBpMThuZXh0QmFja2VuZE1vZHVsZTxUPjtcbiAgICBleHBvcnQgdHlwZSBMYW5ndWFnZURldGVjdG9yTW9kdWxlID0gaTE4bmV4dExhbmd1YWdlRGV0ZWN0b3JNb2R1bGU7XG4gICAgZXhwb3J0IHR5cGUgTGFuZ3VhZ2VEZXRlY3RvckFzeW5jTW9kdWxlID0gaTE4bmV4dExhbmd1YWdlRGV0ZWN0b3JBc3luY01vZHVsZTtcbiAgICBleHBvcnQgdHlwZSBQb3N0UHJvY2Vzc29yTW9kdWxlID0gaTE4bmV4dFBvc3RQcm9jZXNzb3JNb2R1bGU7XG4gICAgZXhwb3J0IHR5cGUgTG9nZ2VyTW9kdWxlID0gaTE4bmV4dExvZ2dlck1vZHVsZTtcbiAgICBleHBvcnQgdHlwZSBJMThuRm9ybWF0TW9kdWxlID0gaTE4bmV4dEkxOG5Gb3JtYXRNb2R1bGU7XG4gICAgZXhwb3J0IHR5cGUgVGhpcmRQYXJ0eU1vZHVsZSA9IGkxOG5leHRUaGlyZFBhcnR5TW9kdWxlO1xuICAgIGV4cG9ydCB0eXBlIE1vZHVsZXMgPSBpMThuZXh0TW9kdWxlcztcbiAgICBleHBvcnQgdHlwZSBOZXdhYmxlPFQ+ID0gaTE4bmV4dE5ld2FibGU8VD47XG59XG5cbmV4cG9ydCB7IGkxOG4gfTtcbiJdLCJuYW1lcyI6WyJ1dGlsc0NvcHkiLCJlc2NhcGUiLCJ1dGlsc0VzY2FwZSIsImdldERlZmF1bHRzIiwiTGFuZ3VhZ2VVdGlscyIsIkJhY2tlbmRDb25uZWN0b3IiLCJpMThuZXh0Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztFQUFPLE1BQU0sUUFBUSxHQUFHLENBQUMsR0FBRyxLQUFLLE9BQU8sR0FBRyxLQUFLLFFBQVE7O0VBRXhEO0VBQ08sTUFBTSxLQUFLLEdBQUcsTUFBTTtFQUMzQixFQUFFLElBQUksR0FBRztFQUNULEVBQUUsSUFBSSxHQUFHOztFQUVULEVBQUUsTUFBTSxPQUFPLEdBQUcsSUFBSSxP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LEtBQUssU0FBUyxJQUFJLElBQUksQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO0VBQzlDLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLFFBQVE7RUFDckIsSUFBSTtFQUNKOztFQUVBLEVBQUUsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO0VBQy9CLEVBQUUsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7RUFDeEMsRUFBRSxJQUFJLElBQUksR0FBRyxhQUFhLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxNQUFNLENBQUM7RUFDN0MsRUFBRSxPQUFPLElBQUksQ0FBQyxHQUFHLEtBQUssU0FBUyxJQUFJLENBQUMsQ0FBQyxNQUFNLEVBQUU7RUFDN0MsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztFQUNqQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztFQUNoQyxJQUFJLElBQUksR0FBRyxhQUFhLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxNQUFNLENBQUM7RUFDM0MsSUFBSSxJQUFJLElBQUksRUFBRSxHQUFHLElBQUksT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssV0FBVyxFQUFFO0VBQ3hFLE1BQU0sSUFBSSxDQUFDLEdBQUcsR0FBRyxTQUFTO0VBQzFCO0VBQ0E7RUFDQSxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENB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SUFBSSxDQUFDLGdCQUFnQixLQUFLLElBQUksQ0FBQyxTQUFTLEVBQUUsTUFBTSxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUM7RUFDN0csSUFBSSxJQUFJLENBQUMsR0FBRyxFQUFFLE9BQU8sS0FBSzs7RUFFMUIsSUFBSSxNQUFNLE9BQU8sR0FBRztFQUNwQixNQUFNLElBQUk7RUFDVixNQUFNLEtBQUs7RUFDWCxNQUFNLEtBQUs7RUFDWCxNQUFNLEtBQUs7RUFDWCxNQUFNLEtBQUs7RUFDWCxNQUFNLEtBQUs7RUFDWCxNQUFNLEtBQUs7RUFDWCxNQUFNLEtBQUs7RUFDWCxNQUFNLEtBQUs7RUFDWCxNQUFNLEtBQUs7RUFDWCxNQUFNLEtBQUs7RUFDWCxNQUFNLEtBQUs7RUFDWCxNQUFNLEtBQUs7RUFDWCxNQUFNLEtBQUs7RUFDWCxNQUFNLEtBQUs7RUFDWCxNQUFNLEtBQUs7RUFDWCxNQUFNLEtBQUs7RUFDWCxNQUFNLEtBQUs7RUFDWCxNQUFNLEtBQUs7RUFDWCxNQUFNLEtBQUs7RUFDWCxNQUFNLEtBQUs7RUFDWCxNQUFNLEtBQUs7RUFDWCxNQUFNLEtBQUs7RUFDWCxNQUFNLEtBQUs7RUFDWCxNQUFNLEtBQUs7RUFDWCxNQUFNLEtBQUs7RUFDWCxNQUFNLEtBQUs7RUFDWCxNQUFNLEtBQUs7RUFDWCxNQUFNLEtBQUs7RUFDWCxNQUFNLEtBQUs7RUFDWCxNQUFNLEtBQUs7RUFDWCxNQUFNLEtBQUs7RUFDWCxNQUFNLEtBQUs7RUFDWCxNQUFNLEtBQUs7RUFDWCxNQUFNLEtBQUs7RUFDWCxNQUFNLEtBQUs7RUFDWCxNQUFNLElBQUk7RUFDVixNQUFNLElBQUk7RUFDVixNQUFNLElBQUk7RUFDVixNQUFNLEtBQUs7RUFDWCxNQUFNLEtBQUs7RUFDWCxNQUFNLEtBQUs7RUFDWCxNQUFNLEtBQUs7RUFDWCxNQUFNLEtBQUs7RUFDWCxNQUFNLElBQUk7RUFDVixNQUFNLElBQUk7RUFDVixNQUFNLEtBQUs7RUFDWCxNQUFN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QWdCLEVBQUUsSUFBSSxDQUFDO0VBQzdCLEtBQUs7RUFDTDtFQUNBOztFQUVBLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxjQUFjLEVBQUU7RUFDdEMsUUFBUSxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUMsY0FBYzs7QUMxb0JmRyxVQUFPLENBQUM7O0FBRW5CQSxVQUFPLENBQUM7QUFDUEEsVUFBTyxDQUFDO0FBQ0NBLFVBQU8sQ0FBQztBQUNOQSxVQUFPLENBQUM7QUFDcEJBLFVBQU8sQ0FBQztBQUNHQSxVQUFPLENBQUM7QUFDYkEsVUFBTyxDQUFDO0FBQ2hCQSxVQUFPLENBQUM7QUFDSEEsVUFBTyxDQUFDO0FBQ0tBLFVBQU8sQ0FBQztBQUNUQSxVQUFPLENBQUM7QUFDWkEsVUFBTyxDQUFDO0FBQ1RBLFVBQU8sQ0FBQzs7RUNsQnJDOzs7RUFHRztBQW9DRyxRQUFBLElBQUksR0FBY0E7Ozs7Ozs7Ozs7IiwieF9nb29nbGVfaWdub3JlTGlzdCI6WzAsMSwyLDMsNCw1LDYsNyw4LDksMTAsMTEsMTIsMTNdLCJzb3VyY2VSb290IjoiY2RwOi8vL0BjZHAvZXh0ZW5zaW9uLWkxOG4vIn0=