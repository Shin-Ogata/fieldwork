/*!
 * @cdp/extension-i18n 0.9.17
 *   extension for internationalization
 */

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory((global.CDP = global.CDP || {}, global.CDP.Exension = global.CDP.Exension || {})));
})(this, (function (exports) { 'use strict';

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
      this.observers = {};
    }

    on(events, listener) {
      events.split(' ').forEach((event) => {
        this.observers[event] = this.observers[event] || [];
        this.observers[event].push(listener);
      });
      return this;
    }

    off(event, listener) {
      if (!this.observers[event]) return;
      if (!listener) {
        delete this.observers[event];
        return;
      }

      this.observers[event] = this.observers[event].filter((l) => l !== listener);
    }

    emit(event, ...args) {
      if (this.observers[event]) {
        const cloned = [].concat(this.observers[event]);
        cloned.forEach((observer) => {
          observer(...args);
        });
      }

      if (this.observers['*']) {
        const cloned = [].concat(this.observers['*']);
        cloned.forEach((observer) => {
          observer.apply(observer, [event, ...args]);
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

  function getLastOfPath(object, path, Empty) {
    function cleanKey(key) {
      return key && key.indexOf('###') > -1 ? key.replace(/###/g, '.') : key;
    }

    function canNotTraverseDeeper() {
      return !object || typeof object === 'string';
    }

    const stack = typeof path !== 'string' ? [].concat(path) : path.split('.');
    while (stack.length > 1) {
      if (canNotTraverseDeeper()) return {};

      const key = cleanKey(stack.shift());
      if (!object[key] && Empty) object[key] = new Empty();
      // prevent prototype pollution
      if (Object.prototype.hasOwnProperty.call(object, key)) {
        object = object[key];
      } else {
        object = {};
      }
    }

    if (canNotTraverseDeeper()) return {};
    return {
      obj: object,
      k: cleanKey(stack.shift()),
    };
  }

  function setPath(object, path, newValue) {
    const { obj, k } = getLastOfPath(object, path, Object);

    obj[k] = newValue;
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

  const chars = [' ', ',', '?', '!', ';'];
  function looksLikeObjectPath(key, nsSeparator, keySeparator) {
    nsSeparator = nsSeparator || '';
    keySeparator = keySeparator || '';
    const possibleChars = chars.filter(
      (c) => nsSeparator.indexOf(c) < 0 && keySeparator.indexOf(c) < 0,
    );
    if (possibleChars.length === 0) return true;
    const r = new RegExp(`(${possibleChars.map((c) => (c === '?' ? '\\?' : c)).join('|')})`);
    let matched = !r.test(key);
    if (!matched) {
      const ki = key.indexOf(keySeparator);
      if (ki > 0 && !r.test(key.substring(0, ki))) {
        matched = true;
      }
    }
    return matched;
  }

  function deepFind(obj, path, keySeparator = '.') {
    if (!obj) return undefined;
    if (obj[path]) return obj[path];
    const paths = path.split(keySeparator);
    let current = obj;
    for (let i = 0; i < paths.length; ++i) {
      if (!current) return undefined;
      if (typeof current[paths[i]] === 'string' && i + 1 < paths.length) {
        return undefined;
      }
      if (current[paths[i]] === undefined) {
        let j = 2;
        let p = paths.slice(i, i + j).join(keySeparator);
        let mix = current[p];
        while (mix === undefined && paths.length > i + j) {
          j++;
          p = paths.slice(i, i + j).join(keySeparator);
          mix = current[p];
        }
        if (mix === undefined) return undefined;
        if (mix === null) return null;
        if (path.endsWith(p)) {
          if (typeof mix === 'string') return mix;
          if (p && typeof mix[p] === 'string') return mix[p];
        }
        const joinedPath = paths.slice(i + j).join(keySeparator);
        if (joinedPath) return deepFind(mix, joinedPath, keySeparator);
        return undefined;
      }
      current = current[paths[i]];
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

      let path = [lng, ns];
      if (key && typeof key !== 'string') path = path.concat(key);
      if (key && typeof key === 'string')
        path = path.concat(keySeparator ? key.split(keySeparator) : key);

      if (lng.indexOf('.') > -1) {
        path = lng.split('.');
      }

      const result = getPath(this.data, path);
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

    addResourceBundle(lng, ns, resources, deep, overwrite, options = { silent: false }) {
      let path = [lng, ns];
      if (lng.indexOf('.') > -1) {
        path = lng.split('.');
        deep = resources;
        resources = ns;
        ns = path[1];
      }

      this.addNamespaces(ns);

      let pack = getPath(this.data, path) || {};

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
            };
          }
          return `${namespace}${nsSeparator}${key}`;
        }

        if (returnDetails) {
          return { res: key, usedKey: key, exactUsedKey: key, usedLng: lng, usedNS: namespace };
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
              if (copy[m] === deepKey) copy[m] = res[m]; // if nothing found use orginal value as fallback
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
        const defaultValue =
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
                this.pluralResolver.getSuffixes(language, options).forEach((suffix) => {
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
        return resolved;
      }
      return res;
    }

    extendTranslation(res, key, options, resolved, lastKey) {
      if (this.i18nFormat && this.i18nFormat.parse) {
        res = this.i18nFormat.parse(
          res,
          { ...this.options.interpolation.defaultVariables, ...options },
          resolved.usedLng,
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
            ? { i18nResolved: resolved, ...options }
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

          // if lenght 2 guess it's a country
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
            if (supportedLng.indexOf(lngOnly) === 0) return supportedLng;
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

      // asume we have an object defining fallbacks
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
          return new Intl.PluralRules(getCleanedCode(code), { type: options.ordinal ? 'ordinal' : 'cardinal' });
        } catch {
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
      // the regexp
      const regexpStr = `${this.prefix}(.+?)${this.suffix}`;
      this.regexp = new RegExp(regexpStr, 'g');

      const regexpUnescapeStr = `${this.prefix}${this.unescapePrefix}(.+?)${this.unescapeSuffix}${this.suffix}`;
      this.regexpUnescape = new RegExp(regexpUnescapeStr, 'g');

      const nestingRegexpStr = `${this.nestingPrefix}(.+?)${this.nestingSuffix}`;
      this.nestingRegexp = new RegExp(nestingRegexpStr, 'g');
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
        formatter = fn(lng, options);
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
        this.store.addResourceBundle(lng, ns, data);
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
        format: (value, format, lng, options) => value,
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
        if (usedLng && usedLng.toLowerCase() === 'cimode') return usedCallback(); // avoid loading resources for cimode

        const toLoad = [];

        const append = lng => {
          if (!lng) return;
          const lngs = this.services.languageUtils.toResolveHierarchy(lng);
          lngs.forEach(l => {
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
        // find the first language resolved languaged
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

  exports.i18n = i18n;

  Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uLWkxOG4uanMiLCJzb3VyY2VzIjpbImkxOG5leHQvc3JjL2xvZ2dlci5qcyIsImkxOG5leHQvc3JjL0V2ZW50RW1pdHRlci5qcyIsImkxOG5leHQvc3JjL3V0aWxzLmpzIiwiaTE4bmV4dC9zcmMvUmVzb3VyY2VTdG9yZS5qcyIsImkxOG5leHQvc3JjL3Bvc3RQcm9jZXNzb3IuanMiLCJpMThuZXh0L3NyYy9UcmFuc2xhdG9yLmpzIiwiaTE4bmV4dC9zcmMvTGFuZ3VhZ2VVdGlscy5qcyIsImkxOG5leHQvc3JjL1BsdXJhbFJlc29sdmVyLmpzIiwiaTE4bmV4dC9zcmMvSW50ZXJwb2xhdG9yLmpzIiwiaTE4bmV4dC9zcmMvRm9ybWF0dGVyLmpzIiwiaTE4bmV4dC9zcmMvQmFja2VuZENvbm5lY3Rvci5qcyIsImkxOG5leHQvc3JjL2RlZmF1bHRzLmpzIiwiaTE4bmV4dC9zcmMvaTE4bmV4dC5qcyIsImkxOG5leHQvc3JjL2luZGV4LmpzIiwiaW5kZXgudHMiXSwic291cmNlc0NvbnRlbnQiOlsiY29uc3QgY29uc29sZUxvZ2dlciA9IHtcbiAgdHlwZTogJ2xvZ2dlcicsXG5cbiAgbG9nKGFyZ3MpIHtcbiAgICB0aGlzLm91dHB1dCgnbG9nJywgYXJncyk7XG4gIH0sXG5cbiAgd2FybihhcmdzKSB7XG4gICAgdGhpcy5vdXRwdXQoJ3dhcm4nLCBhcmdzKTtcbiAgfSxcblxuICBlcnJvcihhcmdzKSB7XG4gICAgdGhpcy5vdXRwdXQoJ2Vycm9yJywgYXJncyk7XG4gIH0sXG5cbiAgb3V0cHV0KHR5cGUsIGFyZ3MpIHtcbiAgICAvKiBlc2xpbnQgbm8tY29uc29sZTogMCAqL1xuICAgIGlmIChjb25zb2xlICYmIGNvbnNvbGVbdHlwZV0pIGNvbnNvbGVbdHlwZV0uYXBwbHkoY29uc29sZSwgYXJncyk7XG4gIH0sXG59O1xuXG5jbGFzcyBMb2dnZXIge1xuICBjb25zdHJ1Y3Rvcihjb25jcmV0ZUxvZ2dlciwgb3B0aW9ucyA9IHt9KSB7XG4gICAgdGhpcy5pbml0KGNvbmNyZXRlTG9nZ2VyLCBvcHRpb25zKTtcbiAgfVxuXG4gIGluaXQoY29uY3JldGVMb2dnZXIsIG9wdGlvbnMgPSB7fSkge1xuICAgIHRoaXMucHJlZml4ID0gb3B0aW9ucy5wcmVmaXggfHwgJ2kxOG5leHQ6JztcbiAgICB0aGlzLmxvZ2dlciA9IGNvbmNyZXRlTG9nZ2VyIHx8IGNvbnNvbGVMb2dnZXI7XG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcbiAgICB0aGlzLmRlYnVnID0gb3B0aW9ucy5kZWJ1ZztcbiAgfVxuXG4gIGxvZyguLi5hcmdzKSB7XG4gICAgcmV0dXJuIHRoaXMuZm9yd2FyZChhcmdzLCAnbG9nJywgJycsIHRydWUpO1xuICB9XG5cbiAgd2FybiguLi5hcmdzKSB7XG4gICAgcmV0dXJuIHRoaXMuZm9yd2FyZChhcmdzLCAnd2FybicsICcnLCB0cnVlKTtcbiAgfVxuXG4gIGVycm9yKC4uLmFyZ3MpIHtcbiAgICByZXR1cm4gdGhpcy5mb3J3YXJkKGFyZ3MsICdlcnJvcicsICcnKTtcbiAgfVxuXG4gIGRlcHJlY2F0ZSguLi5hcmdzKSB7XG4gICAgcmV0dXJuIHRoaXMuZm9yd2FyZChhcmdzLCAnd2FybicsICdXQVJOSU5HIERFUFJFQ0FURUQ6ICcsIHRydWUpO1xuICB9XG5cbiAgZm9yd2FyZChhcmdzLCBsdmwsIHByZWZpeCwgZGVidWdPbmx5KSB7XG4gICAgaWYgKGRlYnVnT25seSAmJiAhdGhpcy5kZWJ1ZykgcmV0dXJuIG51bGw7XG4gICAgaWYgKHR5cGVvZiBhcmdzWzBdID09PSAnc3RyaW5nJykgYXJnc1swXSA9IGAke3ByZWZpeH0ke3RoaXMucHJlZml4fSAke2FyZ3NbMF19YDtcbiAgICByZXR1cm4gdGhpcy5sb2dnZXJbbHZsXShhcmdzKTtcbiAgfVxuXG4gIGNyZWF0ZShtb2R1bGVOYW1lKSB7XG4gICAgcmV0dXJuIG5ldyBMb2dnZXIodGhpcy5sb2dnZXIsIHtcbiAgICAgIC4uLnsgcHJlZml4OiBgJHt0aGlzLnByZWZpeH06JHttb2R1bGVOYW1lfTpgIH0sXG4gICAgICAuLi50aGlzLm9wdGlvbnMsXG4gICAgfSk7XG4gIH1cblxuICBjbG9uZShvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwgdGhpcy5vcHRpb25zO1xuICAgIG9wdGlvbnMucHJlZml4ID0gb3B0aW9ucy5wcmVmaXggfHwgdGhpcy5wcmVmaXg7XG4gICAgcmV0dXJuIG5ldyBMb2dnZXIodGhpcy5sb2dnZXIsIG9wdGlvbnMpO1xuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IG5ldyBMb2dnZXIoKTtcbiIsImNsYXNzIEV2ZW50RW1pdHRlciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHRoaXMub2JzZXJ2ZXJzID0ge307XG4gIH1cblxuICBvbihldmVudHMsIGxpc3RlbmVyKSB7XG4gICAgZXZlbnRzLnNwbGl0KCcgJykuZm9yRWFjaCgoZXZlbnQpID0+IHtcbiAgICAgIHRoaXMub2JzZXJ2ZXJzW2V2ZW50XSA9IHRoaXMub2JzZXJ2ZXJzW2V2ZW50XSB8fCBbXTtcbiAgICAgIHRoaXMub2JzZXJ2ZXJzW2V2ZW50XS5wdXNoKGxpc3RlbmVyKTtcbiAgICB9KTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIG9mZihldmVudCwgbGlzdGVuZXIpIHtcbiAgICBpZiAoIXRoaXMub2JzZXJ2ZXJzW2V2ZW50XSkgcmV0dXJuO1xuICAgIGlmICghbGlzdGVuZXIpIHtcbiAgICAgIGRlbGV0ZSB0aGlzLm9ic2VydmVyc1tldmVudF07XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5vYnNlcnZlcnNbZXZlbnRdID0gdGhpcy5vYnNlcnZlcnNbZXZlbnRdLmZpbHRlcigobCkgPT4gbCAhPT0gbGlzdGVuZXIpO1xuICB9XG5cbiAgZW1pdChldmVudCwgLi4uYXJncykge1xuICAgIGlmICh0aGlzLm9ic2VydmVyc1tldmVudF0pIHtcbiAgICAgIGNvbnN0IGNsb25lZCA9IFtdLmNvbmNhdCh0aGlzLm9ic2VydmVyc1tldmVudF0pO1xuICAgICAgY2xvbmVkLmZvckVhY2goKG9ic2VydmVyKSA9PiB7XG4gICAgICAgIG9ic2VydmVyKC4uLmFyZ3MpO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMub2JzZXJ2ZXJzWycqJ10pIHtcbiAgICAgIGNvbnN0IGNsb25lZCA9IFtdLmNvbmNhdCh0aGlzLm9ic2VydmVyc1snKiddKTtcbiAgICAgIGNsb25lZC5mb3JFYWNoKChvYnNlcnZlcikgPT4ge1xuICAgICAgICBvYnNlcnZlci5hcHBseShvYnNlcnZlciwgW2V2ZW50LCAuLi5hcmdzXSk7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgRXZlbnRFbWl0dGVyO1xuIiwiLy8gaHR0cDovL2xlYS52ZXJvdS5tZS8yMDE2LzEyL3Jlc29sdmUtcHJvbWlzZXMtZXh0ZXJuYWxseS13aXRoLXRoaXMtb25lLXdlaXJkLXRyaWNrL1xuZXhwb3J0IGZ1bmN0aW9uIGRlZmVyKCkge1xuICBsZXQgcmVzO1xuICBsZXQgcmVqO1xuXG4gIGNvbnN0IHByb21pc2UgPSBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgcmVzID0gcmVzb2x2ZTtcbiAgICByZWogPSByZWplY3Q7XG4gIH0pO1xuXG4gIHByb21pc2UucmVzb2x2ZSA9IHJlcztcbiAgcHJvbWlzZS5yZWplY3QgPSByZWo7XG5cbiAgcmV0dXJuIHByb21pc2U7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBtYWtlU3RyaW5nKG9iamVjdCkge1xuICBpZiAob2JqZWN0ID09IG51bGwpIHJldHVybiAnJztcbiAgLyogZXNsaW50IHByZWZlci10ZW1wbGF0ZTogMCAqL1xuICByZXR1cm4gJycgKyBvYmplY3Q7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjb3B5KGEsIHMsIHQpIHtcbiAgYS5mb3JFYWNoKChtKSA9PiB7XG4gICAgaWYgKHNbbV0pIHRbbV0gPSBzW21dO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gZ2V0TGFzdE9mUGF0aChvYmplY3QsIHBhdGgsIEVtcHR5KSB7XG4gIGZ1bmN0aW9uIGNsZWFuS2V5KGtleSkge1xuICAgIHJldHVybiBrZXkgJiYga2V5LmluZGV4T2YoJyMjIycpID4gLTEgPyBrZXkucmVwbGFjZSgvIyMjL2csICcuJykgOiBrZXk7XG4gIH1cblxuICBmdW5jdGlvbiBjYW5Ob3RUcmF2ZXJzZURlZXBlcigpIHtcbiAgICByZXR1cm4gIW9iamVjdCB8fCB0eXBlb2Ygb2JqZWN0ID09PSAnc3RyaW5nJztcbiAgfVxuXG4gIGNvbnN0IHN0YWNrID0gdHlwZW9mIHBhdGggIT09ICdzdHJpbmcnID8gW10uY29uY2F0KHBhdGgpIDogcGF0aC5zcGxpdCgnLicpO1xuICB3aGlsZSAoc3RhY2subGVuZ3RoID4gMSkge1xuICAgIGlmIChjYW5Ob3RUcmF2ZXJzZURlZXBlcigpKSByZXR1cm4ge307XG5cbiAgICBjb25zdCBrZXkgPSBjbGVhbktleShzdGFjay5zaGlmdCgpKTtcbiAgICBpZiAoIW9iamVjdFtrZXldICYmIEVtcHR5KSBvYmplY3Rba2V5XSA9IG5ldyBFbXB0eSgpO1xuICAgIC8vIHByZXZlbnQgcHJvdG90eXBlIHBvbGx1dGlvblxuICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqZWN0LCBrZXkpKSB7XG4gICAgICBvYmplY3QgPSBvYmplY3Rba2V5XTtcbiAgICB9IGVsc2Uge1xuICAgICAgb2JqZWN0ID0ge307XG4gICAgfVxuICB9XG5cbiAgaWYgKGNhbk5vdFRyYXZlcnNlRGVlcGVyKCkpIHJldHVybiB7fTtcbiAgcmV0dXJuIHtcbiAgICBvYmo6IG9iamVjdCxcbiAgICBrOiBjbGVhbktleShzdGFjay5zaGlmdCgpKSxcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNldFBhdGgob2JqZWN0LCBwYXRoLCBuZXdWYWx1ZSkge1xuICBjb25zdCB7IG9iaiwgayB9ID0gZ2V0TGFzdE9mUGF0aChvYmplY3QsIHBhdGgsIE9iamVjdCk7XG5cbiAgb2JqW2tdID0gbmV3VmFsdWU7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwdXNoUGF0aChvYmplY3QsIHBhdGgsIG5ld1ZhbHVlLCBjb25jYXQpIHtcbiAgY29uc3QgeyBvYmosIGsgfSA9IGdldExhc3RPZlBhdGgob2JqZWN0LCBwYXRoLCBPYmplY3QpO1xuXG4gIG9ialtrXSA9IG9ialtrXSB8fCBbXTtcbiAgaWYgKGNvbmNhdCkgb2JqW2tdID0gb2JqW2tdLmNvbmNhdChuZXdWYWx1ZSk7XG4gIGlmICghY29uY2F0KSBvYmpba10ucHVzaChuZXdWYWx1ZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRQYXRoKG9iamVjdCwgcGF0aCkge1xuICBjb25zdCB7IG9iaiwgayB9ID0gZ2V0TGFzdE9mUGF0aChvYmplY3QsIHBhdGgpO1xuXG4gIGlmICghb2JqKSByZXR1cm4gdW5kZWZpbmVkO1xuICByZXR1cm4gb2JqW2tdO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0UGF0aFdpdGhEZWZhdWx0cyhkYXRhLCBkZWZhdWx0RGF0YSwga2V5KSB7XG4gIGNvbnN0IHZhbHVlID0gZ2V0UGF0aChkYXRhLCBrZXkpO1xuICBpZiAodmFsdWUgIT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiB2YWx1ZTtcbiAgfVxuICAvLyBGYWxsYmFjayB0byBkZWZhdWx0IHZhbHVlc1xuICByZXR1cm4gZ2V0UGF0aChkZWZhdWx0RGF0YSwga2V5KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRlZXBFeHRlbmQodGFyZ2V0LCBzb3VyY2UsIG92ZXJ3cml0ZSkge1xuICAvKiBlc2xpbnQgbm8tcmVzdHJpY3RlZC1zeW50YXg6IDAgKi9cbiAgZm9yIChjb25zdCBwcm9wIGluIHNvdXJjZSkge1xuICAgIGlmIChwcm9wICE9PSAnX19wcm90b19fJyAmJiBwcm9wICE9PSAnY29uc3RydWN0b3InKSB7XG4gICAgICBpZiAocHJvcCBpbiB0YXJnZXQpIHtcbiAgICAgICAgLy8gSWYgd2UgcmVhY2hlZCBhIGxlYWYgc3RyaW5nIGluIHRhcmdldCBvciBzb3VyY2UgdGhlbiByZXBsYWNlIHdpdGggc291cmNlIG9yIHNraXAgZGVwZW5kaW5nIG9uIHRoZSAnb3ZlcndyaXRlJyBzd2l0Y2hcbiAgICAgICAgaWYgKFxuICAgICAgICAgIHR5cGVvZiB0YXJnZXRbcHJvcF0gPT09ICdzdHJpbmcnIHx8XG4gICAgICAgICAgdGFyZ2V0W3Byb3BdIGluc3RhbmNlb2YgU3RyaW5nIHx8XG4gICAgICAgICAgdHlwZW9mIHNvdXJjZVtwcm9wXSA9PT0gJ3N0cmluZycgfHxcbiAgICAgICAgICBzb3VyY2VbcHJvcF0gaW5zdGFuY2VvZiBTdHJpbmdcbiAgICAgICAgKSB7XG4gICAgICAgICAgaWYgKG92ZXJ3cml0ZSkgdGFyZ2V0W3Byb3BdID0gc291cmNlW3Byb3BdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGRlZXBFeHRlbmQodGFyZ2V0W3Byb3BdLCBzb3VyY2VbcHJvcF0sIG92ZXJ3cml0ZSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRhcmdldFtwcm9wXSA9IHNvdXJjZVtwcm9wXTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIHRhcmdldDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlZ2V4RXNjYXBlKHN0cikge1xuICAvKiBlc2xpbnQgbm8tdXNlbGVzcy1lc2NhcGU6IDAgKi9cbiAgcmV0dXJuIHN0ci5yZXBsYWNlKC9bXFwtXFxbXFxdXFwvXFx7XFx9XFwoXFwpXFwqXFwrXFw/XFwuXFxcXFxcXlxcJFxcfF0vZywgJ1xcXFwkJicpO1xufVxuXG4vKiBlc2xpbnQtZGlzYWJsZSAqL1xudmFyIF9lbnRpdHlNYXAgPSB7XG4gICcmJzogJyZhbXA7JyxcbiAgJzwnOiAnJmx0OycsXG4gICc+JzogJyZndDsnLFxuICAnXCInOiAnJnF1b3Q7JyxcbiAgXCInXCI6ICcmIzM5OycsXG4gICcvJzogJyYjeDJGOycsXG59O1xuLyogZXNsaW50LWVuYWJsZSAqL1xuXG5leHBvcnQgZnVuY3Rpb24gZXNjYXBlKGRhdGEpIHtcbiAgaWYgKHR5cGVvZiBkYXRhID09PSAnc3RyaW5nJykge1xuICAgIHJldHVybiBkYXRhLnJlcGxhY2UoL1smPD5cIidcXC9dL2csIChzKSA9PiBfZW50aXR5TWFwW3NdKTtcbiAgfVxuXG4gIHJldHVybiBkYXRhO1xufVxuXG5jb25zdCBjaGFycyA9IFsnICcsICcsJywgJz8nLCAnIScsICc7J107XG5leHBvcnQgZnVuY3Rpb24gbG9va3NMaWtlT2JqZWN0UGF0aChrZXksIG5zU2VwYXJhdG9yLCBrZXlTZXBhcmF0b3IpIHtcbiAgbnNTZXBhcmF0b3IgPSBuc1NlcGFyYXRvciB8fCAnJztcbiAga2V5U2VwYXJhdG9yID0ga2V5U2VwYXJhdG9yIHx8ICcnO1xuICBjb25zdCBwb3NzaWJsZUNoYXJzID0gY2hhcnMuZmlsdGVyKFxuICAgIChjKSA9PiBuc1NlcGFyYXRvci5pbmRleE9mKGMpIDwgMCAmJiBrZXlTZXBhcmF0b3IuaW5kZXhPZihjKSA8IDAsXG4gICk7XG4gIGlmIChwb3NzaWJsZUNoYXJzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIHRydWU7XG4gIGNvbnN0IHIgPSBuZXcgUmVnRXhwKGAoJHtwb3NzaWJsZUNoYXJzLm1hcCgoYykgPT4gKGMgPT09ICc/JyA/ICdcXFxcPycgOiBjKSkuam9pbignfCcpfSlgKTtcbiAgbGV0IG1hdGNoZWQgPSAhci50ZXN0KGtleSk7XG4gIGlmICghbWF0Y2hlZCkge1xuICAgIGNvbnN0IGtpID0ga2V5LmluZGV4T2Yoa2V5U2VwYXJhdG9yKTtcbiAgICBpZiAoa2kgPiAwICYmICFyLnRlc3Qoa2V5LnN1YnN0cmluZygwLCBraSkpKSB7XG4gICAgICBtYXRjaGVkID0gdHJ1ZTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIG1hdGNoZWQ7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkZWVwRmluZChvYmosIHBhdGgsIGtleVNlcGFyYXRvciA9ICcuJykge1xuICBpZiAoIW9iaikgcmV0dXJuIHVuZGVmaW5lZDtcbiAgaWYgKG9ialtwYXRoXSkgcmV0dXJuIG9ialtwYXRoXTtcbiAgY29uc3QgcGF0aHMgPSBwYXRoLnNwbGl0KGtleVNlcGFyYXRvcik7XG4gIGxldCBjdXJyZW50ID0gb2JqO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IHBhdGhzLmxlbmd0aDsgKytpKSB7XG4gICAgaWYgKCFjdXJyZW50KSByZXR1cm4gdW5kZWZpbmVkO1xuICAgIGlmICh0eXBlb2YgY3VycmVudFtwYXRoc1tpXV0gPT09ICdzdHJpbmcnICYmIGkgKyAxIDwgcGF0aHMubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBpZiAoY3VycmVudFtwYXRoc1tpXV0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgbGV0IGogPSAyO1xuICAgICAgbGV0IHAgPSBwYXRocy5zbGljZShpLCBpICsgaikuam9pbihrZXlTZXBhcmF0b3IpO1xuICAgICAgbGV0IG1peCA9IGN1cnJlbnRbcF07XG4gICAgICB3aGlsZSAobWl4ID09PSB1bmRlZmluZWQgJiYgcGF0aHMubGVuZ3RoID4gaSArIGopIHtcbiAgICAgICAgaisrO1xuICAgICAgICBwID0gcGF0aHMuc2xpY2UoaSwgaSArIGopLmpvaW4oa2V5U2VwYXJhdG9yKTtcbiAgICAgICAgbWl4ID0gY3VycmVudFtwXTtcbiAgICAgIH1cbiAgICAgIGlmIChtaXggPT09IHVuZGVmaW5lZCkgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgIGlmIChtaXggPT09IG51bGwpIHJldHVybiBudWxsO1xuICAgICAgaWYgKHBhdGguZW5kc1dpdGgocCkpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBtaXggPT09ICdzdHJpbmcnKSByZXR1cm4gbWl4O1xuICAgICAgICBpZiAocCAmJiB0eXBlb2YgbWl4W3BdID09PSAnc3RyaW5nJykgcmV0dXJuIG1peFtwXTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGpvaW5lZFBhdGggPSBwYXRocy5zbGljZShpICsgaikuam9pbihrZXlTZXBhcmF0b3IpO1xuICAgICAgaWYgKGpvaW5lZFBhdGgpIHJldHVybiBkZWVwRmluZChtaXgsIGpvaW5lZFBhdGgsIGtleVNlcGFyYXRvcik7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBjdXJyZW50ID0gY3VycmVudFtwYXRoc1tpXV07XG4gIH1cbiAgcmV0dXJuIGN1cnJlbnQ7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRDbGVhbmVkQ29kZShjb2RlKSB7XG4gIGlmIChjb2RlICYmIGNvZGUuaW5kZXhPZignXycpID4gMCkgcmV0dXJuIGNvZGUucmVwbGFjZSgnXycsICctJyk7XG4gIHJldHVybiBjb2RlO1xufVxuIiwiaW1wb3J0IEV2ZW50RW1pdHRlciBmcm9tICcuL0V2ZW50RW1pdHRlci5qcyc7XG5pbXBvcnQgKiBhcyB1dGlscyBmcm9tICcuL3V0aWxzLmpzJztcblxuY2xhc3MgUmVzb3VyY2VTdG9yZSBleHRlbmRzIEV2ZW50RW1pdHRlciB7XG4gIGNvbnN0cnVjdG9yKGRhdGEsIG9wdGlvbnMgPSB7IG5zOiBbJ3RyYW5zbGF0aW9uJ10sIGRlZmF1bHROUzogJ3RyYW5zbGF0aW9uJyB9KSB7XG4gICAgc3VwZXIoKTtcblxuICAgIHRoaXMuZGF0YSA9IGRhdGEgfHwge307XG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcbiAgICBpZiAodGhpcy5vcHRpb25zLmtleVNlcGFyYXRvciA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzLm9wdGlvbnMua2V5U2VwYXJhdG9yID0gJy4nO1xuICAgIH1cbiAgICBpZiAodGhpcy5vcHRpb25zLmlnbm9yZUpTT05TdHJ1Y3R1cmUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5vcHRpb25zLmlnbm9yZUpTT05TdHJ1Y3R1cmUgPSB0cnVlO1xuICAgIH1cbiAgfVxuXG4gIGFkZE5hbWVzcGFjZXMobnMpIHtcbiAgICBpZiAodGhpcy5vcHRpb25zLm5zLmluZGV4T2YobnMpIDwgMCkge1xuICAgICAgdGhpcy5vcHRpb25zLm5zLnB1c2gobnMpO1xuICAgIH1cbiAgfVxuXG4gIHJlbW92ZU5hbWVzcGFjZXMobnMpIHtcbiAgICBjb25zdCBpbmRleCA9IHRoaXMub3B0aW9ucy5ucy5pbmRleE9mKG5zKTtcbiAgICBpZiAoaW5kZXggPiAtMSkge1xuICAgICAgdGhpcy5vcHRpb25zLm5zLnNwbGljZShpbmRleCwgMSk7XG4gICAgfVxuICB9XG5cbiAgZ2V0UmVzb3VyY2UobG5nLCBucywga2V5LCBvcHRpb25zID0ge30pIHtcbiAgICBjb25zdCBrZXlTZXBhcmF0b3IgPVxuICAgICAgb3B0aW9ucy5rZXlTZXBhcmF0b3IgIT09IHVuZGVmaW5lZCA/IG9wdGlvbnMua2V5U2VwYXJhdG9yIDogdGhpcy5vcHRpb25zLmtleVNlcGFyYXRvcjtcblxuICAgIGNvbnN0IGlnbm9yZUpTT05TdHJ1Y3R1cmUgPVxuICAgICAgb3B0aW9ucy5pZ25vcmVKU09OU3RydWN0dXJlICE9PSB1bmRlZmluZWRcbiAgICAgICAgPyBvcHRpb25zLmlnbm9yZUpTT05TdHJ1Y3R1cmVcbiAgICAgICAgOiB0aGlzLm9wdGlvbnMuaWdub3JlSlNPTlN0cnVjdHVyZTtcblxuICAgIGxldCBwYXRoID0gW2xuZywgbnNdO1xuICAgIGlmIChrZXkgJiYgdHlwZW9mIGtleSAhPT0gJ3N0cmluZycpIHBhdGggPSBwYXRoLmNvbmNhdChrZXkpO1xuICAgIGlmIChrZXkgJiYgdHlwZW9mIGtleSA9PT0gJ3N0cmluZycpXG4gICAgICBwYXRoID0gcGF0aC5jb25jYXQoa2V5U2VwYXJhdG9yID8ga2V5LnNwbGl0KGtleVNlcGFyYXRvcikgOiBrZXkpO1xuXG4gICAgaWYgKGxuZy5pbmRleE9mKCcuJykgPiAtMSkge1xuICAgICAgcGF0aCA9IGxuZy5zcGxpdCgnLicpO1xuICAgIH1cblxuICAgIGNvbnN0IHJlc3VsdCA9IHV0aWxzLmdldFBhdGgodGhpcy5kYXRhLCBwYXRoKTtcbiAgICBpZiAocmVzdWx0IHx8ICFpZ25vcmVKU09OU3RydWN0dXJlIHx8IHR5cGVvZiBrZXkgIT09ICdzdHJpbmcnKSByZXR1cm4gcmVzdWx0O1xuXG4gICAgcmV0dXJuIHV0aWxzLmRlZXBGaW5kKHRoaXMuZGF0YSAmJiB0aGlzLmRhdGFbbG5nXSAmJiB0aGlzLmRhdGFbbG5nXVtuc10sIGtleSwga2V5U2VwYXJhdG9yKTtcbiAgfVxuXG4gIGFkZFJlc291cmNlKGxuZywgbnMsIGtleSwgdmFsdWUsIG9wdGlvbnMgPSB7IHNpbGVudDogZmFsc2UgfSkge1xuICAgIGNvbnN0IGtleVNlcGFyYXRvciA9XG4gICAgICBvcHRpb25zLmtleVNlcGFyYXRvciAhPT0gdW5kZWZpbmVkID8gb3B0aW9ucy5rZXlTZXBhcmF0b3IgOiB0aGlzLm9wdGlvbnMua2V5U2VwYXJhdG9yO1xuXG4gICAgbGV0IHBhdGggPSBbbG5nLCBuc107XG4gICAgaWYgKGtleSkgcGF0aCA9IHBhdGguY29uY2F0KGtleVNlcGFyYXRvciA/IGtleS5zcGxpdChrZXlTZXBhcmF0b3IpIDoga2V5KTtcblxuICAgIGlmIChsbmcuaW5kZXhPZignLicpID4gLTEpIHtcbiAgICAgIHBhdGggPSBsbmcuc3BsaXQoJy4nKTtcbiAgICAgIHZhbHVlID0gbnM7XG4gICAgICBucyA9IHBhdGhbMV07XG4gICAgfVxuXG4gICAgdGhpcy5hZGROYW1lc3BhY2VzKG5zKTtcblxuICAgIHV0aWxzLnNldFBhdGgodGhpcy5kYXRhLCBwYXRoLCB2YWx1ZSk7XG5cbiAgICBpZiAoIW9wdGlvbnMuc2lsZW50KSB0aGlzLmVtaXQoJ2FkZGVkJywgbG5nLCBucywga2V5LCB2YWx1ZSk7XG4gIH1cblxuICBhZGRSZXNvdXJjZXMobG5nLCBucywgcmVzb3VyY2VzLCBvcHRpb25zID0geyBzaWxlbnQ6IGZhbHNlIH0pIHtcbiAgICAvKiBlc2xpbnQgbm8tcmVzdHJpY3RlZC1zeW50YXg6IDAgKi9cbiAgICBmb3IgKGNvbnN0IG0gaW4gcmVzb3VyY2VzKSB7XG4gICAgICBpZiAoXG4gICAgICAgIHR5cGVvZiByZXNvdXJjZXNbbV0gPT09ICdzdHJpbmcnIHx8XG4gICAgICAgIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuYXBwbHkocmVzb3VyY2VzW21dKSA9PT0gJ1tvYmplY3QgQXJyYXldJ1xuICAgICAgKVxuICAgICAgICB0aGlzLmFkZFJlc291cmNlKGxuZywgbnMsIG0sIHJlc291cmNlc1ttXSwgeyBzaWxlbnQ6IHRydWUgfSk7XG4gICAgfVxuICAgIGlmICghb3B0aW9ucy5zaWxlbnQpIHRoaXMuZW1pdCgnYWRkZWQnLCBsbmcsIG5zLCByZXNvdXJjZXMpO1xuICB9XG5cbiAgYWRkUmVzb3VyY2VCdW5kbGUobG5nLCBucywgcmVzb3VyY2VzLCBkZWVwLCBvdmVyd3JpdGUsIG9wdGlvbnMgPSB7IHNpbGVudDogZmFsc2UgfSkge1xuICAgIGxldCBwYXRoID0gW2xuZywgbnNdO1xuICAgIGlmIChsbmcuaW5kZXhPZignLicpID4gLTEpIHtcbiAgICAgIHBhdGggPSBsbmcuc3BsaXQoJy4nKTtcbiAgICAgIGRlZXAgPSByZXNvdXJjZXM7XG4gICAgICByZXNvdXJjZXMgPSBucztcbiAgICAgIG5zID0gcGF0aFsxXTtcbiAgICB9XG5cbiAgICB0aGlzLmFkZE5hbWVzcGFjZXMobnMpO1xuXG4gICAgbGV0IHBhY2sgPSB1dGlscy5nZXRQYXRoKHRoaXMuZGF0YSwgcGF0aCkgfHwge307XG5cbiAgICBpZiAoZGVlcCkge1xuICAgICAgdXRpbHMuZGVlcEV4dGVuZChwYWNrLCByZXNvdXJjZXMsIG92ZXJ3cml0ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHBhY2sgPSB7IC4uLnBhY2ssIC4uLnJlc291cmNlcyB9O1xuICAgIH1cblxuICAgIHV0aWxzLnNldFBhdGgodGhpcy5kYXRhLCBwYXRoLCBwYWNrKTtcblxuICAgIGlmICghb3B0aW9ucy5zaWxlbnQpIHRoaXMuZW1pdCgnYWRkZWQnLCBsbmcsIG5zLCByZXNvdXJjZXMpO1xuICB9XG5cbiAgcmVtb3ZlUmVzb3VyY2VCdW5kbGUobG5nLCBucykge1xuICAgIGlmICh0aGlzLmhhc1Jlc291cmNlQnVuZGxlKGxuZywgbnMpKSB7XG4gICAgICBkZWxldGUgdGhpcy5kYXRhW2xuZ11bbnNdO1xuICAgIH1cbiAgICB0aGlzLnJlbW92ZU5hbWVzcGFjZXMobnMpO1xuXG4gICAgdGhpcy5lbWl0KCdyZW1vdmVkJywgbG5nLCBucyk7XG4gIH1cblxuICBoYXNSZXNvdXJjZUJ1bmRsZShsbmcsIG5zKSB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0UmVzb3VyY2UobG5nLCBucykgIT09IHVuZGVmaW5lZDtcbiAgfVxuXG4gIGdldFJlc291cmNlQnVuZGxlKGxuZywgbnMpIHtcbiAgICBpZiAoIW5zKSBucyA9IHRoaXMub3B0aW9ucy5kZWZhdWx0TlM7XG5cbiAgICAvLyBDT01QQVRJQklMSVRZOiByZW1vdmUgZXh0ZW5kIGluIHYyLjEuMFxuICAgIGlmICh0aGlzLm9wdGlvbnMuY29tcGF0aWJpbGl0eUFQSSA9PT0gJ3YxJykgcmV0dXJuIHsgLi4ue30sIC4uLnRoaXMuZ2V0UmVzb3VyY2UobG5nLCBucykgfTtcblxuICAgIHJldHVybiB0aGlzLmdldFJlc291cmNlKGxuZywgbnMpO1xuICB9XG5cbiAgZ2V0RGF0YUJ5TGFuZ3VhZ2UobG5nKSB7XG4gICAgcmV0dXJuIHRoaXMuZGF0YVtsbmddO1xuICB9XG5cbiAgaGFzTGFuZ3VhZ2VTb21lVHJhbnNsYXRpb25zKGxuZykge1xuICAgIGNvbnN0IGRhdGEgPSB0aGlzLmdldERhdGFCeUxhbmd1YWdlKGxuZyk7XG4gICAgY29uc3QgbiA9IChkYXRhICYmIE9iamVjdC5rZXlzKGRhdGEpKSB8fCBbXTtcbiAgICByZXR1cm4gISFuLmZpbmQoKHYpID0+IGRhdGFbdl0gJiYgT2JqZWN0LmtleXMoZGF0YVt2XSkubGVuZ3RoID4gMCk7XG4gIH1cblxuICB0b0pTT04oKSB7XG4gICAgcmV0dXJuIHRoaXMuZGF0YTtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBSZXNvdXJjZVN0b3JlO1xuIiwiZXhwb3J0IGRlZmF1bHQge1xuICBwcm9jZXNzb3JzOiB7fSxcblxuICBhZGRQb3N0UHJvY2Vzc29yKG1vZHVsZSkge1xuICAgIHRoaXMucHJvY2Vzc29yc1ttb2R1bGUubmFtZV0gPSBtb2R1bGU7XG4gIH0sXG5cbiAgaGFuZGxlKHByb2Nlc3NvcnMsIHZhbHVlLCBrZXksIG9wdGlvbnMsIHRyYW5zbGF0b3IpIHtcbiAgICBwcm9jZXNzb3JzLmZvckVhY2goKHByb2Nlc3NvcikgPT4ge1xuICAgICAgaWYgKHRoaXMucHJvY2Vzc29yc1twcm9jZXNzb3JdKVxuICAgICAgICB2YWx1ZSA9IHRoaXMucHJvY2Vzc29yc1twcm9jZXNzb3JdLnByb2Nlc3ModmFsdWUsIGtleSwgb3B0aW9ucywgdHJhbnNsYXRvcik7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gdmFsdWU7XG4gIH0sXG59O1xuIiwiaW1wb3J0IGJhc2VMb2dnZXIgZnJvbSAnLi9sb2dnZXIuanMnO1xuaW1wb3J0IEV2ZW50RW1pdHRlciBmcm9tICcuL0V2ZW50RW1pdHRlci5qcyc7XG5pbXBvcnQgcG9zdFByb2Nlc3NvciBmcm9tICcuL3Bvc3RQcm9jZXNzb3IuanMnO1xuaW1wb3J0ICogYXMgdXRpbHMgZnJvbSAnLi91dGlscy5qcyc7XG5cbmNvbnN0IGNoZWNrZWRMb2FkZWRGb3IgPSB7fTtcblxuY2xhc3MgVHJhbnNsYXRvciBleHRlbmRzIEV2ZW50RW1pdHRlciB7XG4gIGNvbnN0cnVjdG9yKHNlcnZpY2VzLCBvcHRpb25zID0ge30pIHtcbiAgICBzdXBlcigpO1xuXG4gICAgdXRpbHMuY29weShcbiAgICAgIFtcbiAgICAgICAgJ3Jlc291cmNlU3RvcmUnLFxuICAgICAgICAnbGFuZ3VhZ2VVdGlscycsXG4gICAgICAgICdwbHVyYWxSZXNvbHZlcicsXG4gICAgICAgICdpbnRlcnBvbGF0b3InLFxuICAgICAgICAnYmFja2VuZENvbm5lY3RvcicsXG4gICAgICAgICdpMThuRm9ybWF0JyxcbiAgICAgICAgJ3V0aWxzJyxcbiAgICAgIF0sXG4gICAgICBzZXJ2aWNlcyxcbiAgICAgIHRoaXMsXG4gICAgKTtcblxuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG4gICAgaWYgKHRoaXMub3B0aW9ucy5rZXlTZXBhcmF0b3IgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5vcHRpb25zLmtleVNlcGFyYXRvciA9ICcuJztcbiAgICB9XG5cbiAgICB0aGlzLmxvZ2dlciA9IGJhc2VMb2dnZXIuY3JlYXRlKCd0cmFuc2xhdG9yJyk7XG4gIH1cblxuICBjaGFuZ2VMYW5ndWFnZShsbmcpIHtcbiAgICBpZiAobG5nKSB0aGlzLmxhbmd1YWdlID0gbG5nO1xuICB9XG5cbiAgZXhpc3RzKGtleSwgb3B0aW9ucyA9IHsgaW50ZXJwb2xhdGlvbjoge30gfSkge1xuICAgIGlmIChrZXkgPT09IHVuZGVmaW5lZCB8fCBrZXkgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBjb25zdCByZXNvbHZlZCA9IHRoaXMucmVzb2x2ZShrZXksIG9wdGlvbnMpO1xuICAgIHJldHVybiByZXNvbHZlZCAmJiByZXNvbHZlZC5yZXMgIT09IHVuZGVmaW5lZDtcbiAgfVxuXG4gIGV4dHJhY3RGcm9tS2V5KGtleSwgb3B0aW9ucykge1xuICAgIGxldCBuc1NlcGFyYXRvciA9XG4gICAgICBvcHRpb25zLm5zU2VwYXJhdG9yICE9PSB1bmRlZmluZWQgPyBvcHRpb25zLm5zU2VwYXJhdG9yIDogdGhpcy5vcHRpb25zLm5zU2VwYXJhdG9yO1xuICAgIGlmIChuc1NlcGFyYXRvciA9PT0gdW5kZWZpbmVkKSBuc1NlcGFyYXRvciA9ICc6JztcblxuICAgIGNvbnN0IGtleVNlcGFyYXRvciA9XG4gICAgICBvcHRpb25zLmtleVNlcGFyYXRvciAhPT0gdW5kZWZpbmVkID8gb3B0aW9ucy5rZXlTZXBhcmF0b3IgOiB0aGlzLm9wdGlvbnMua2V5U2VwYXJhdG9yO1xuXG4gICAgbGV0IG5hbWVzcGFjZXMgPSBvcHRpb25zLm5zIHx8IHRoaXMub3B0aW9ucy5kZWZhdWx0TlMgfHwgW107XG4gICAgY29uc3Qgd291bGRDaGVja0Zvck5zSW5LZXkgPSBuc1NlcGFyYXRvciAmJiBrZXkuaW5kZXhPZihuc1NlcGFyYXRvcikgPiAtMTtcbiAgICBjb25zdCBzZWVtc05hdHVyYWxMYW5ndWFnZSA9XG4gICAgICAhdGhpcy5vcHRpb25zLnVzZXJEZWZpbmVkS2V5U2VwYXJhdG9yICYmXG4gICAgICAhb3B0aW9ucy5rZXlTZXBhcmF0b3IgJiZcbiAgICAgICF0aGlzLm9wdGlvbnMudXNlckRlZmluZWROc1NlcGFyYXRvciAmJlxuICAgICAgIW9wdGlvbnMubnNTZXBhcmF0b3IgJiZcbiAgICAgICF1dGlscy5sb29rc0xpa2VPYmplY3RQYXRoKGtleSwgbnNTZXBhcmF0b3IsIGtleVNlcGFyYXRvcik7XG4gICAgaWYgKHdvdWxkQ2hlY2tGb3JOc0luS2V5ICYmICFzZWVtc05hdHVyYWxMYW5ndWFnZSkge1xuICAgICAgY29uc3QgbSA9IGtleS5tYXRjaCh0aGlzLmludGVycG9sYXRvci5uZXN0aW5nUmVnZXhwKTtcbiAgICAgIGlmIChtICYmIG0ubGVuZ3RoID4gMCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIGtleSxcbiAgICAgICAgICBuYW1lc3BhY2VzLFxuICAgICAgICB9O1xuICAgICAgfVxuICAgICAgY29uc3QgcGFydHMgPSBrZXkuc3BsaXQobnNTZXBhcmF0b3IpO1xuICAgICAgaWYgKFxuICAgICAgICBuc1NlcGFyYXRvciAhPT0ga2V5U2VwYXJhdG9yIHx8XG4gICAgICAgIChuc1NlcGFyYXRvciA9PT0ga2V5U2VwYXJhdG9yICYmIHRoaXMub3B0aW9ucy5ucy5pbmRleE9mKHBhcnRzWzBdKSA+IC0xKVxuICAgICAgKVxuICAgICAgICBuYW1lc3BhY2VzID0gcGFydHMuc2hpZnQoKTtcbiAgICAgIGtleSA9IHBhcnRzLmpvaW4oa2V5U2VwYXJhdG9yKTtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiBuYW1lc3BhY2VzID09PSAnc3RyaW5nJykgbmFtZXNwYWNlcyA9IFtuYW1lc3BhY2VzXTtcblxuICAgIHJldHVybiB7XG4gICAgICBrZXksXG4gICAgICBuYW1lc3BhY2VzLFxuICAgIH07XG4gIH1cblxuICB0cmFuc2xhdGUoa2V5cywgb3B0aW9ucywgbGFzdEtleSkge1xuICAgIGlmICh0eXBlb2Ygb3B0aW9ucyAhPT0gJ29iamVjdCcgJiYgdGhpcy5vcHRpb25zLm92ZXJsb2FkVHJhbnNsYXRpb25PcHRpb25IYW5kbGVyKSB7XG4gICAgICAvKiBlc2xpbnQgcHJlZmVyLXJlc3QtcGFyYW1zOiAwICovXG4gICAgICBvcHRpb25zID0gdGhpcy5vcHRpb25zLm92ZXJsb2FkVHJhbnNsYXRpb25PcHRpb25IYW5kbGVyKGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIGlmICh0eXBlb2Ygb3B0aW9ucyA9PT0gJ29iamVjdCcpIG9wdGlvbnMgPSB7IC4uLm9wdGlvbnMgfTtcbiAgICBpZiAoIW9wdGlvbnMpIG9wdGlvbnMgPSB7fTtcblxuICAgIC8vIG5vbiB2YWxpZCBrZXlzIGhhbmRsaW5nXG4gICAgaWYgKGtleXMgPT09IHVuZGVmaW5lZCB8fCBrZXlzID09PSBudWxsIC8qIHx8IGtleXMgPT09ICcnICovKSByZXR1cm4gJyc7XG4gICAgaWYgKCFBcnJheS5pc0FycmF5KGtleXMpKSBrZXlzID0gW1N0cmluZyhrZXlzKV07XG5cbiAgICBjb25zdCByZXR1cm5EZXRhaWxzID1cbiAgICAgIG9wdGlvbnMucmV0dXJuRGV0YWlscyAhPT0gdW5kZWZpbmVkID8gb3B0aW9ucy5yZXR1cm5EZXRhaWxzIDogdGhpcy5vcHRpb25zLnJldHVybkRldGFpbHM7XG5cbiAgICAvLyBzZXBhcmF0b3JzXG4gICAgY29uc3Qga2V5U2VwYXJhdG9yID1cbiAgICAgIG9wdGlvbnMua2V5U2VwYXJhdG9yICE9PSB1bmRlZmluZWQgPyBvcHRpb25zLmtleVNlcGFyYXRvciA6IHRoaXMub3B0aW9ucy5rZXlTZXBhcmF0b3I7XG5cbiAgICAvLyBnZXQgbmFtZXNwYWNlKHMpXG4gICAgY29uc3QgeyBrZXksIG5hbWVzcGFjZXMgfSA9IHRoaXMuZXh0cmFjdEZyb21LZXkoa2V5c1trZXlzLmxlbmd0aCAtIDFdLCBvcHRpb25zKTtcbiAgICBjb25zdCBuYW1lc3BhY2UgPSBuYW1lc3BhY2VzW25hbWVzcGFjZXMubGVuZ3RoIC0gMV07XG5cbiAgICAvLyByZXR1cm4ga2V5IG9uIENJTW9kZVxuICAgIGNvbnN0IGxuZyA9IG9wdGlvbnMubG5nIHx8IHRoaXMubGFuZ3VhZ2U7XG4gICAgY29uc3QgYXBwZW5kTmFtZXNwYWNlVG9DSU1vZGUgPVxuICAgICAgb3B0aW9ucy5hcHBlbmROYW1lc3BhY2VUb0NJTW9kZSB8fCB0aGlzLm9wdGlvbnMuYXBwZW5kTmFtZXNwYWNlVG9DSU1vZGU7XG4gICAgaWYgKGxuZyAmJiBsbmcudG9Mb3dlckNhc2UoKSA9PT0gJ2NpbW9kZScpIHtcbiAgICAgIGlmIChhcHBlbmROYW1lc3BhY2VUb0NJTW9kZSkge1xuICAgICAgICBjb25zdCBuc1NlcGFyYXRvciA9IG9wdGlvbnMubnNTZXBhcmF0b3IgfHwgdGhpcy5vcHRpb25zLm5zU2VwYXJhdG9yO1xuICAgICAgICBpZiAocmV0dXJuRGV0YWlscykge1xuICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICByZXM6IGAke25hbWVzcGFjZX0ke25zU2VwYXJhdG9yfSR7a2V5fWAsXG4gICAgICAgICAgICB1c2VkS2V5OiBrZXksXG4gICAgICAgICAgICBleGFjdFVzZWRLZXk6IGtleSxcbiAgICAgICAgICAgIHVzZWRMbmc6IGxuZyxcbiAgICAgICAgICAgIHVzZWROUzogbmFtZXNwYWNlLFxuICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGAke25hbWVzcGFjZX0ke25zU2VwYXJhdG9yfSR7a2V5fWA7XG4gICAgICB9XG5cbiAgICAgIGlmIChyZXR1cm5EZXRhaWxzKSB7XG4gICAgICAgIHJldHVybiB7IHJlczoga2V5LCB1c2VkS2V5OiBrZXksIGV4YWN0VXNlZEtleToga2V5LCB1c2VkTG5nOiBsbmcsIHVzZWROUzogbmFtZXNwYWNlIH07XG4gICAgICB9XG4gICAgICByZXR1cm4ga2V5O1xuICAgIH1cblxuICAgIC8vIHJlc29sdmUgZnJvbSBzdG9yZVxuICAgIGNvbnN0IHJlc29sdmVkID0gdGhpcy5yZXNvbHZlKGtleXMsIG9wdGlvbnMpO1xuICAgIGxldCByZXMgPSByZXNvbHZlZCAmJiByZXNvbHZlZC5yZXM7XG4gICAgY29uc3QgcmVzVXNlZEtleSA9IChyZXNvbHZlZCAmJiByZXNvbHZlZC51c2VkS2V5KSB8fCBrZXk7XG4gICAgY29uc3QgcmVzRXhhY3RVc2VkS2V5ID0gKHJlc29sdmVkICYmIHJlc29sdmVkLmV4YWN0VXNlZEtleSkgfHwga2V5O1xuXG4gICAgY29uc3QgcmVzVHlwZSA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuYXBwbHkocmVzKTtcbiAgICBjb25zdCBub09iamVjdCA9IFsnW29iamVjdCBOdW1iZXJdJywgJ1tvYmplY3QgRnVuY3Rpb25dJywgJ1tvYmplY3QgUmVnRXhwXSddO1xuICAgIGNvbnN0IGpvaW5BcnJheXMgPVxuICAgICAgb3B0aW9ucy5qb2luQXJyYXlzICE9PSB1bmRlZmluZWQgPyBvcHRpb25zLmpvaW5BcnJheXMgOiB0aGlzLm9wdGlvbnMuam9pbkFycmF5cztcblxuICAgIC8vIG9iamVjdFxuICAgIGNvbnN0IGhhbmRsZUFzT2JqZWN0SW5JMThuRm9ybWF0ID0gIXRoaXMuaTE4bkZvcm1hdCB8fCB0aGlzLmkxOG5Gb3JtYXQuaGFuZGxlQXNPYmplY3Q7XG4gICAgY29uc3QgaGFuZGxlQXNPYmplY3QgPVxuICAgICAgdHlwZW9mIHJlcyAhPT0gJ3N0cmluZycgJiYgdHlwZW9mIHJlcyAhPT0gJ2Jvb2xlYW4nICYmIHR5cGVvZiByZXMgIT09ICdudW1iZXInO1xuICAgIGlmIChcbiAgICAgIGhhbmRsZUFzT2JqZWN0SW5JMThuRm9ybWF0ICYmXG4gICAgICByZXMgJiZcbiAgICAgIGhhbmRsZUFzT2JqZWN0ICYmXG4gICAgICBub09iamVjdC5pbmRleE9mKHJlc1R5cGUpIDwgMCAmJlxuICAgICAgISh0eXBlb2Ygam9pbkFycmF5cyA9PT0gJ3N0cmluZycgJiYgcmVzVHlwZSA9PT0gJ1tvYmplY3QgQXJyYXldJylcbiAgICApIHtcbiAgICAgIGlmICghb3B0aW9ucy5yZXR1cm5PYmplY3RzICYmICF0aGlzLm9wdGlvbnMucmV0dXJuT2JqZWN0cykge1xuICAgICAgICBpZiAoIXRoaXMub3B0aW9ucy5yZXR1cm5lZE9iamVjdEhhbmRsZXIpIHtcbiAgICAgICAgICB0aGlzLmxvZ2dlci53YXJuKCdhY2Nlc3NpbmcgYW4gb2JqZWN0IC0gYnV0IHJldHVybk9iamVjdHMgb3B0aW9ucyBpcyBub3QgZW5hYmxlZCEnKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCByID0gdGhpcy5vcHRpb25zLnJldHVybmVkT2JqZWN0SGFuZGxlclxuICAgICAgICAgID8gdGhpcy5vcHRpb25zLnJldHVybmVkT2JqZWN0SGFuZGxlcihyZXNVc2VkS2V5LCByZXMsIHsgLi4ub3B0aW9ucywgbnM6IG5hbWVzcGFjZXMgfSlcbiAgICAgICAgICA6IGBrZXkgJyR7a2V5fSAoJHt0aGlzLmxhbmd1YWdlfSknIHJldHVybmVkIGFuIG9iamVjdCBpbnN0ZWFkIG9mIHN0cmluZy5gO1xuICAgICAgICBpZiAocmV0dXJuRGV0YWlscykge1xuICAgICAgICAgIHJlc29sdmVkLnJlcyA9IHI7XG4gICAgICAgICAgcmV0dXJuIHJlc29sdmVkO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByO1xuICAgICAgfVxuXG4gICAgICAvLyBpZiB3ZSBnb3QgYSBzZXBhcmF0b3Igd2UgbG9vcCBvdmVyIGNoaWxkcmVuIC0gZWxzZSB3ZSBqdXN0IHJldHVybiBvYmplY3QgYXMgaXNcbiAgICAgIC8vIGFzIGhhdmluZyBpdCBzZXQgdG8gZmFsc2UgbWVhbnMgbm8gaGllcmFyY2h5IHNvIG5vIGxvb2t1cCBmb3IgbmVzdGVkIHZhbHVlc1xuICAgICAgaWYgKGtleVNlcGFyYXRvcikge1xuICAgICAgICBjb25zdCByZXNUeXBlSXNBcnJheSA9IHJlc1R5cGUgPT09ICdbb2JqZWN0IEFycmF5XSc7XG4gICAgICAgIGNvbnN0IGNvcHkgPSByZXNUeXBlSXNBcnJheSA/IFtdIDoge307IC8vIGFwcGx5IGNoaWxkIHRyYW5zbGF0aW9uIG9uIGEgY29weVxuXG4gICAgICAgIC8qIGVzbGludCBuby1yZXN0cmljdGVkLXN5bnRheDogMCAqL1xuICAgICAgICBjb25zdCBuZXdLZXlUb1VzZSA9IHJlc1R5cGVJc0FycmF5ID8gcmVzRXhhY3RVc2VkS2V5IDogcmVzVXNlZEtleTtcbiAgICAgICAgZm9yIChjb25zdCBtIGluIHJlcykge1xuICAgICAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwocmVzLCBtKSkge1xuICAgICAgICAgICAgY29uc3QgZGVlcEtleSA9IGAke25ld0tleVRvVXNlfSR7a2V5U2VwYXJhdG9yfSR7bX1gO1xuICAgICAgICAgICAgY29weVttXSA9IHRoaXMudHJhbnNsYXRlKGRlZXBLZXksIHtcbiAgICAgICAgICAgICAgLi4ub3B0aW9ucyxcbiAgICAgICAgICAgICAgLi4ueyBqb2luQXJyYXlzOiBmYWxzZSwgbnM6IG5hbWVzcGFjZXMgfSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKGNvcHlbbV0gPT09IGRlZXBLZXkpIGNvcHlbbV0gPSByZXNbbV07IC8vIGlmIG5vdGhpbmcgZm91bmQgdXNlIG9yZ2luYWwgdmFsdWUgYXMgZmFsbGJhY2tcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmVzID0gY29weTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKFxuICAgICAgaGFuZGxlQXNPYmplY3RJbkkxOG5Gb3JtYXQgJiZcbiAgICAgIHR5cGVvZiBqb2luQXJyYXlzID09PSAnc3RyaW5nJyAmJlxuICAgICAgcmVzVHlwZSA9PT0gJ1tvYmplY3QgQXJyYXldJ1xuICAgICkge1xuICAgICAgLy8gYXJyYXkgc3BlY2lhbCB0cmVhdG1lbnRcbiAgICAgIHJlcyA9IHJlcy5qb2luKGpvaW5BcnJheXMpO1xuICAgICAgaWYgKHJlcykgcmVzID0gdGhpcy5leHRlbmRUcmFuc2xhdGlvbihyZXMsIGtleXMsIG9wdGlvbnMsIGxhc3RLZXkpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBzdHJpbmcsIGVtcHR5IG9yIG51bGxcbiAgICAgIGxldCB1c2VkRGVmYXVsdCA9IGZhbHNlO1xuICAgICAgbGV0IHVzZWRLZXkgPSBmYWxzZTtcblxuICAgICAgY29uc3QgbmVlZHNQbHVyYWxIYW5kbGluZyA9IG9wdGlvbnMuY291bnQgIT09IHVuZGVmaW5lZCAmJiB0eXBlb2Ygb3B0aW9ucy5jb3VudCAhPT0gJ3N0cmluZyc7XG4gICAgICBjb25zdCBoYXNEZWZhdWx0VmFsdWUgPSBUcmFuc2xhdG9yLmhhc0RlZmF1bHRWYWx1ZShvcHRpb25zKTtcbiAgICAgIGNvbnN0IGRlZmF1bHRWYWx1ZVN1ZmZpeCA9IG5lZWRzUGx1cmFsSGFuZGxpbmdcbiAgICAgICAgPyB0aGlzLnBsdXJhbFJlc29sdmVyLmdldFN1ZmZpeChsbmcsIG9wdGlvbnMuY291bnQsIG9wdGlvbnMpXG4gICAgICAgIDogJyc7XG4gICAgICBjb25zdCBkZWZhdWx0VmFsdWVTdWZmaXhPcmRpbmFsRmFsbGJhY2sgPVxuICAgICAgICBvcHRpb25zLm9yZGluYWwgJiYgbmVlZHNQbHVyYWxIYW5kbGluZ1xuICAgICAgICAgID8gdGhpcy5wbHVyYWxSZXNvbHZlci5nZXRTdWZmaXgobG5nLCBvcHRpb25zLmNvdW50LCB7IG9yZGluYWw6IGZhbHNlIH0pXG4gICAgICAgICAgOiAnJztcbiAgICAgIGNvbnN0IGRlZmF1bHRWYWx1ZSA9XG4gICAgICAgIG9wdGlvbnNbYGRlZmF1bHRWYWx1ZSR7ZGVmYXVsdFZhbHVlU3VmZml4fWBdIHx8XG4gICAgICAgIG9wdGlvbnNbYGRlZmF1bHRWYWx1ZSR7ZGVmYXVsdFZhbHVlU3VmZml4T3JkaW5hbEZhbGxiYWNrfWBdIHx8XG4gICAgICAgIG9wdGlvbnMuZGVmYXVsdFZhbHVlO1xuXG4gICAgICAvLyBmYWxsYmFjayB2YWx1ZVxuICAgICAgaWYgKCF0aGlzLmlzVmFsaWRMb29rdXAocmVzKSAmJiBoYXNEZWZhdWx0VmFsdWUpIHtcbiAgICAgICAgdXNlZERlZmF1bHQgPSB0cnVlO1xuICAgICAgICByZXMgPSBkZWZhdWx0VmFsdWU7XG4gICAgICB9XG4gICAgICBpZiAoIXRoaXMuaXNWYWxpZExvb2t1cChyZXMpKSB7XG4gICAgICAgIHVzZWRLZXkgPSB0cnVlO1xuICAgICAgICByZXMgPSBrZXk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IG1pc3NpbmdLZXlOb1ZhbHVlRmFsbGJhY2tUb0tleSA9XG4gICAgICAgIG9wdGlvbnMubWlzc2luZ0tleU5vVmFsdWVGYWxsYmFja1RvS2V5IHx8IHRoaXMub3B0aW9ucy5taXNzaW5nS2V5Tm9WYWx1ZUZhbGxiYWNrVG9LZXk7XG4gICAgICBjb25zdCByZXNGb3JNaXNzaW5nID0gbWlzc2luZ0tleU5vVmFsdWVGYWxsYmFja1RvS2V5ICYmIHVzZWRLZXkgPyB1bmRlZmluZWQgOiByZXM7XG5cbiAgICAgIC8vIHNhdmUgbWlzc2luZ1xuICAgICAgY29uc3QgdXBkYXRlTWlzc2luZyA9IGhhc0RlZmF1bHRWYWx1ZSAmJiBkZWZhdWx0VmFsdWUgIT09IHJlcyAmJiB0aGlzLm9wdGlvbnMudXBkYXRlTWlzc2luZztcbiAgICAgIGlmICh1c2VkS2V5IHx8IHVzZWREZWZhdWx0IHx8IHVwZGF0ZU1pc3NpbmcpIHtcbiAgICAgICAgdGhpcy5sb2dnZXIubG9nKFxuICAgICAgICAgIHVwZGF0ZU1pc3NpbmcgPyAndXBkYXRlS2V5JyA6ICdtaXNzaW5nS2V5JyxcbiAgICAgICAgICBsbmcsXG4gICAgICAgICAgbmFtZXNwYWNlLFxuICAgICAgICAgIGtleSxcbiAgICAgICAgICB1cGRhdGVNaXNzaW5nID8gZGVmYXVsdFZhbHVlIDogcmVzLFxuICAgICAgICApO1xuICAgICAgICBpZiAoa2V5U2VwYXJhdG9yKSB7XG4gICAgICAgICAgY29uc3QgZmsgPSB0aGlzLnJlc29sdmUoa2V5LCB7IC4uLm9wdGlvbnMsIGtleVNlcGFyYXRvcjogZmFsc2UgfSk7XG4gICAgICAgICAgaWYgKGZrICYmIGZrLnJlcylcbiAgICAgICAgICAgIHRoaXMubG9nZ2VyLndhcm4oXG4gICAgICAgICAgICAgICdTZWVtcyB0aGUgbG9hZGVkIHRyYW5zbGF0aW9ucyB3ZXJlIGluIGZsYXQgSlNPTiBmb3JtYXQgaW5zdGVhZCBvZiBuZXN0ZWQuIEVpdGhlciBzZXQga2V5U2VwYXJhdG9yOiBmYWxzZSBvbiBpbml0IG9yIG1ha2Ugc3VyZSB5b3VyIHRyYW5zbGF0aW9ucyBhcmUgcHVibGlzaGVkIGluIG5lc3RlZCBmb3JtYXQuJyxcbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgbG5ncyA9IFtdO1xuICAgICAgICBjb25zdCBmYWxsYmFja0xuZ3MgPSB0aGlzLmxhbmd1YWdlVXRpbHMuZ2V0RmFsbGJhY2tDb2RlcyhcbiAgICAgICAgICB0aGlzLm9wdGlvbnMuZmFsbGJhY2tMbmcsXG4gICAgICAgICAgb3B0aW9ucy5sbmcgfHwgdGhpcy5sYW5ndWFnZSxcbiAgICAgICAgKTtcbiAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5zYXZlTWlzc2luZ1RvID09PSAnZmFsbGJhY2snICYmIGZhbGxiYWNrTG5ncyAmJiBmYWxsYmFja0xuZ3NbMF0pIHtcbiAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGZhbGxiYWNrTG5ncy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgbG5ncy5wdXNoKGZhbGxiYWNrTG5nc1tpXSk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKHRoaXMub3B0aW9ucy5zYXZlTWlzc2luZ1RvID09PSAnYWxsJykge1xuICAgICAgICAgIGxuZ3MgPSB0aGlzLmxhbmd1YWdlVXRpbHMudG9SZXNvbHZlSGllcmFyY2h5KG9wdGlvbnMubG5nIHx8IHRoaXMubGFuZ3VhZ2UpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGxuZ3MucHVzaChvcHRpb25zLmxuZyB8fCB0aGlzLmxhbmd1YWdlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHNlbmQgPSAobCwgaywgc3BlY2lmaWNEZWZhdWx0VmFsdWUpID0+IHtcbiAgICAgICAgICBjb25zdCBkZWZhdWx0Rm9yTWlzc2luZyA9XG4gICAgICAgICAgICBoYXNEZWZhdWx0VmFsdWUgJiYgc3BlY2lmaWNEZWZhdWx0VmFsdWUgIT09IHJlcyA/IHNwZWNpZmljRGVmYXVsdFZhbHVlIDogcmVzRm9yTWlzc2luZztcbiAgICAgICAgICBpZiAodGhpcy5vcHRpb25zLm1pc3NpbmdLZXlIYW5kbGVyKSB7XG4gICAgICAgICAgICB0aGlzLm9wdGlvbnMubWlzc2luZ0tleUhhbmRsZXIoXG4gICAgICAgICAgICAgIGwsXG4gICAgICAgICAgICAgIG5hbWVzcGFjZSxcbiAgICAgICAgICAgICAgayxcbiAgICAgICAgICAgICAgZGVmYXVsdEZvck1pc3NpbmcsXG4gICAgICAgICAgICAgIHVwZGF0ZU1pc3NpbmcsXG4gICAgICAgICAgICAgIG9wdGlvbnMsXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH0gZWxzZSBpZiAodGhpcy5iYWNrZW5kQ29ubmVjdG9yICYmIHRoaXMuYmFja2VuZENvbm5lY3Rvci5zYXZlTWlzc2luZykge1xuICAgICAgICAgICAgdGhpcy5iYWNrZW5kQ29ubmVjdG9yLnNhdmVNaXNzaW5nKFxuICAgICAgICAgICAgICBsLFxuICAgICAgICAgICAgICBuYW1lc3BhY2UsXG4gICAgICAgICAgICAgIGssXG4gICAgICAgICAgICAgIGRlZmF1bHRGb3JNaXNzaW5nLFxuICAgICAgICAgICAgICB1cGRhdGVNaXNzaW5nLFxuICAgICAgICAgICAgICBvcHRpb25zLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdGhpcy5lbWl0KCdtaXNzaW5nS2V5JywgbCwgbmFtZXNwYWNlLCBrLCByZXMpO1xuICAgICAgICB9O1xuXG4gICAgICAgIGlmICh0aGlzLm9wdGlvbnMuc2F2ZU1pc3NpbmcpIHtcbiAgICAgICAgICBpZiAodGhpcy5vcHRpb25zLnNhdmVNaXNzaW5nUGx1cmFscyAmJiBuZWVkc1BsdXJhbEhhbmRsaW5nKSB7XG4gICAgICAgICAgICBsbmdzLmZvckVhY2goKGxhbmd1YWdlKSA9PiB7XG4gICAgICAgICAgICAgIHRoaXMucGx1cmFsUmVzb2x2ZXIuZ2V0U3VmZml4ZXMobGFuZ3VhZ2UsIG9wdGlvbnMpLmZvckVhY2goKHN1ZmZpeCkgPT4ge1xuICAgICAgICAgICAgICAgIHNlbmQoW2xhbmd1YWdlXSwga2V5ICsgc3VmZml4LCBvcHRpb25zW2BkZWZhdWx0VmFsdWUke3N1ZmZpeH1gXSB8fCBkZWZhdWx0VmFsdWUpO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzZW5kKGxuZ3MsIGtleSwgZGVmYXVsdFZhbHVlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gZXh0ZW5kXG4gICAgICByZXMgPSB0aGlzLmV4dGVuZFRyYW5zbGF0aW9uKHJlcywga2V5cywgb3B0aW9ucywgcmVzb2x2ZWQsIGxhc3RLZXkpO1xuXG4gICAgICAvLyBhcHBlbmQgbmFtZXNwYWNlIGlmIHN0aWxsIGtleVxuICAgICAgaWYgKHVzZWRLZXkgJiYgcmVzID09PSBrZXkgJiYgdGhpcy5vcHRpb25zLmFwcGVuZE5hbWVzcGFjZVRvTWlzc2luZ0tleSlcbiAgICAgICAgcmVzID0gYCR7bmFtZXNwYWNlfToke2tleX1gO1xuXG4gICAgICAvLyBwYXJzZU1pc3NpbmdLZXlIYW5kbGVyXG4gICAgICBpZiAoKHVzZWRLZXkgfHwgdXNlZERlZmF1bHQpICYmIHRoaXMub3B0aW9ucy5wYXJzZU1pc3NpbmdLZXlIYW5kbGVyKSB7XG4gICAgICAgIGlmICh0aGlzLm9wdGlvbnMuY29tcGF0aWJpbGl0eUFQSSAhPT0gJ3YxJykge1xuICAgICAgICAgIHJlcyA9IHRoaXMub3B0aW9ucy5wYXJzZU1pc3NpbmdLZXlIYW5kbGVyKFxuICAgICAgICAgICAgdGhpcy5vcHRpb25zLmFwcGVuZE5hbWVzcGFjZVRvTWlzc2luZ0tleSA/IGAke25hbWVzcGFjZX06JHtrZXl9YCA6IGtleSxcbiAgICAgICAgICAgIHVzZWREZWZhdWx0ID8gcmVzIDogdW5kZWZpbmVkLFxuICAgICAgICAgICk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmVzID0gdGhpcy5vcHRpb25zLnBhcnNlTWlzc2luZ0tleUhhbmRsZXIocmVzKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIHJldHVyblxuICAgIGlmIChyZXR1cm5EZXRhaWxzKSB7XG4gICAgICByZXNvbHZlZC5yZXMgPSByZXM7XG4gICAgICByZXR1cm4gcmVzb2x2ZWQ7XG4gICAgfVxuICAgIHJldHVybiByZXM7XG4gIH1cblxuICBleHRlbmRUcmFuc2xhdGlvbihyZXMsIGtleSwgb3B0aW9ucywgcmVzb2x2ZWQsIGxhc3RLZXkpIHtcbiAgICBpZiAodGhpcy5pMThuRm9ybWF0ICYmIHRoaXMuaTE4bkZvcm1hdC5wYXJzZSkge1xuICAgICAgcmVzID0gdGhpcy5pMThuRm9ybWF0LnBhcnNlKFxuICAgICAgICByZXMsXG4gICAgICAgIHsgLi4udGhpcy5vcHRpb25zLmludGVycG9sYXRpb24uZGVmYXVsdFZhcmlhYmxlcywgLi4ub3B0aW9ucyB9LFxuICAgICAgICByZXNvbHZlZC51c2VkTG5nLFxuICAgICAgICByZXNvbHZlZC51c2VkTlMsXG4gICAgICAgIHJlc29sdmVkLnVzZWRLZXksXG4gICAgICAgIHsgcmVzb2x2ZWQgfSxcbiAgICAgICk7XG4gICAgfSBlbHNlIGlmICghb3B0aW9ucy5za2lwSW50ZXJwb2xhdGlvbikge1xuICAgICAgLy8gaTE4bmV4dC5wYXJzaW5nXG4gICAgICBpZiAob3B0aW9ucy5pbnRlcnBvbGF0aW9uKVxuICAgICAgICB0aGlzLmludGVycG9sYXRvci5pbml0KHtcbiAgICAgICAgICAuLi5vcHRpb25zLFxuICAgICAgICAgIC4uLnsgaW50ZXJwb2xhdGlvbjogeyAuLi50aGlzLm9wdGlvbnMuaW50ZXJwb2xhdGlvbiwgLi4ub3B0aW9ucy5pbnRlcnBvbGF0aW9uIH0gfSxcbiAgICAgICAgfSk7XG4gICAgICBjb25zdCBza2lwT25WYXJpYWJsZXMgPVxuICAgICAgICB0eXBlb2YgcmVzID09PSAnc3RyaW5nJyAmJlxuICAgICAgICAob3B0aW9ucyAmJiBvcHRpb25zLmludGVycG9sYXRpb24gJiYgb3B0aW9ucy5pbnRlcnBvbGF0aW9uLnNraXBPblZhcmlhYmxlcyAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgPyBvcHRpb25zLmludGVycG9sYXRpb24uc2tpcE9uVmFyaWFibGVzXG4gICAgICAgICAgOiB0aGlzLm9wdGlvbnMuaW50ZXJwb2xhdGlvbi5za2lwT25WYXJpYWJsZXMpO1xuICAgICAgbGV0IG5lc3RCZWY7XG4gICAgICBpZiAoc2tpcE9uVmFyaWFibGVzKSB7XG4gICAgICAgIGNvbnN0IG5iID0gcmVzLm1hdGNoKHRoaXMuaW50ZXJwb2xhdG9yLm5lc3RpbmdSZWdleHApO1xuICAgICAgICAvLyBoYXMgbmVzdGluZyBhZnRiZWZvcmVlciBpbnRlcnBvbGF0aW9uXG4gICAgICAgIG5lc3RCZWYgPSBuYiAmJiBuYi5sZW5ndGg7XG4gICAgICB9XG5cbiAgICAgIC8vIGludGVycG9sYXRlXG4gICAgICBsZXQgZGF0YSA9IG9wdGlvbnMucmVwbGFjZSAmJiB0eXBlb2Ygb3B0aW9ucy5yZXBsYWNlICE9PSAnc3RyaW5nJyA/IG9wdGlvbnMucmVwbGFjZSA6IG9wdGlvbnM7XG4gICAgICBpZiAodGhpcy5vcHRpb25zLmludGVycG9sYXRpb24uZGVmYXVsdFZhcmlhYmxlcylcbiAgICAgICAgZGF0YSA9IHsgLi4udGhpcy5vcHRpb25zLmludGVycG9sYXRpb24uZGVmYXVsdFZhcmlhYmxlcywgLi4uZGF0YSB9O1xuICAgICAgcmVzID0gdGhpcy5pbnRlcnBvbGF0b3IuaW50ZXJwb2xhdGUocmVzLCBkYXRhLCBvcHRpb25zLmxuZyB8fCB0aGlzLmxhbmd1YWdlLCBvcHRpb25zKTtcblxuICAgICAgLy8gbmVzdGluZ1xuICAgICAgaWYgKHNraXBPblZhcmlhYmxlcykge1xuICAgICAgICBjb25zdCBuYSA9IHJlcy5tYXRjaCh0aGlzLmludGVycG9sYXRvci5uZXN0aW5nUmVnZXhwKTtcbiAgICAgICAgLy8gaGFzIG5lc3RpbmcgYWZ0ZXIgaW50ZXJwb2xhdGlvblxuICAgICAgICBjb25zdCBuZXN0QWZ0ID0gbmEgJiYgbmEubGVuZ3RoO1xuICAgICAgICBpZiAobmVzdEJlZiA8IG5lc3RBZnQpIG9wdGlvbnMubmVzdCA9IGZhbHNlO1xuICAgICAgfVxuICAgICAgaWYgKCFvcHRpb25zLmxuZyAmJiB0aGlzLm9wdGlvbnMuY29tcGF0aWJpbGl0eUFQSSAhPT0gJ3YxJyAmJiByZXNvbHZlZCAmJiByZXNvbHZlZC5yZXMpXG4gICAgICAgIG9wdGlvbnMubG5nID0gcmVzb2x2ZWQudXNlZExuZztcbiAgICAgIGlmIChvcHRpb25zLm5lc3QgIT09IGZhbHNlKVxuICAgICAgICByZXMgPSB0aGlzLmludGVycG9sYXRvci5uZXN0KFxuICAgICAgICAgIHJlcyxcbiAgICAgICAgICAoLi4uYXJncykgPT4ge1xuICAgICAgICAgICAgaWYgKGxhc3RLZXkgJiYgbGFzdEtleVswXSA9PT0gYXJnc1swXSAmJiAhb3B0aW9ucy5jb250ZXh0KSB7XG4gICAgICAgICAgICAgIHRoaXMubG9nZ2VyLndhcm4oXG4gICAgICAgICAgICAgICAgYEl0IHNlZW1zIHlvdSBhcmUgbmVzdGluZyByZWN1cnNpdmVseSBrZXk6ICR7YXJnc1swXX0gaW4ga2V5OiAke2tleVswXX1gLFxuICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzLnRyYW5zbGF0ZSguLi5hcmdzLCBrZXkpO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgb3B0aW9ucyxcbiAgICAgICAgKTtcblxuICAgICAgaWYgKG9wdGlvbnMuaW50ZXJwb2xhdGlvbikgdGhpcy5pbnRlcnBvbGF0b3IucmVzZXQoKTtcbiAgICB9XG5cbiAgICAvLyBwb3N0IHByb2Nlc3NcbiAgICBjb25zdCBwb3N0UHJvY2VzcyA9IG9wdGlvbnMucG9zdFByb2Nlc3MgfHwgdGhpcy5vcHRpb25zLnBvc3RQcm9jZXNzO1xuICAgIGNvbnN0IHBvc3RQcm9jZXNzb3JOYW1lcyA9IHR5cGVvZiBwb3N0UHJvY2VzcyA9PT0gJ3N0cmluZycgPyBbcG9zdFByb2Nlc3NdIDogcG9zdFByb2Nlc3M7XG5cbiAgICBpZiAoXG4gICAgICByZXMgIT09IHVuZGVmaW5lZCAmJlxuICAgICAgcmVzICE9PSBudWxsICYmXG4gICAgICBwb3N0UHJvY2Vzc29yTmFtZXMgJiZcbiAgICAgIHBvc3RQcm9jZXNzb3JOYW1lcy5sZW5ndGggJiZcbiAgICAgIG9wdGlvbnMuYXBwbHlQb3N0UHJvY2Vzc29yICE9PSBmYWxzZVxuICAgICkge1xuICAgICAgcmVzID0gcG9zdFByb2Nlc3Nvci5oYW5kbGUoXG4gICAgICAgIHBvc3RQcm9jZXNzb3JOYW1lcyxcbiAgICAgICAgcmVzLFxuICAgICAgICBrZXksXG4gICAgICAgIHRoaXMub3B0aW9ucyAmJiB0aGlzLm9wdGlvbnMucG9zdFByb2Nlc3NQYXNzUmVzb2x2ZWRcbiAgICAgICAgICA/IHsgaTE4blJlc29sdmVkOiByZXNvbHZlZCwgLi4ub3B0aW9ucyB9XG4gICAgICAgICAgOiBvcHRpb25zLFxuICAgICAgICB0aGlzLFxuICAgICAgKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmVzO1xuICB9XG5cbiAgcmVzb2x2ZShrZXlzLCBvcHRpb25zID0ge30pIHtcbiAgICBsZXQgZm91bmQ7XG4gICAgbGV0IHVzZWRLZXk7IC8vIHBsYWluIGtleVxuICAgIGxldCBleGFjdFVzZWRLZXk7IC8vIGtleSB3aXRoIGNvbnRleHQgLyBwbHVyYWxcbiAgICBsZXQgdXNlZExuZztcbiAgICBsZXQgdXNlZE5TO1xuXG4gICAgaWYgKHR5cGVvZiBrZXlzID09PSAnc3RyaW5nJykga2V5cyA9IFtrZXlzXTtcblxuICAgIC8vIGZvckVhY2ggcG9zc2libGUga2V5XG4gICAga2V5cy5mb3JFYWNoKChrKSA9PiB7XG4gICAgICBpZiAodGhpcy5pc1ZhbGlkTG9va3VwKGZvdW5kKSkgcmV0dXJuO1xuICAgICAgY29uc3QgZXh0cmFjdGVkID0gdGhpcy5leHRyYWN0RnJvbUtleShrLCBvcHRpb25zKTtcbiAgICAgIGNvbnN0IGtleSA9IGV4dHJhY3RlZC5rZXk7XG4gICAgICB1c2VkS2V5ID0ga2V5O1xuICAgICAgbGV0IG5hbWVzcGFjZXMgPSBleHRyYWN0ZWQubmFtZXNwYWNlcztcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMuZmFsbGJhY2tOUykgbmFtZXNwYWNlcyA9IG5hbWVzcGFjZXMuY29uY2F0KHRoaXMub3B0aW9ucy5mYWxsYmFja05TKTtcblxuICAgICAgY29uc3QgbmVlZHNQbHVyYWxIYW5kbGluZyA9IG9wdGlvbnMuY291bnQgIT09IHVuZGVmaW5lZCAmJiB0eXBlb2Ygb3B0aW9ucy5jb3VudCAhPT0gJ3N0cmluZyc7XG4gICAgICBjb25zdCBuZWVkc1plcm9TdWZmaXhMb29rdXAgPVxuICAgICAgICBuZWVkc1BsdXJhbEhhbmRsaW5nICYmXG4gICAgICAgICFvcHRpb25zLm9yZGluYWwgJiZcbiAgICAgICAgb3B0aW9ucy5jb3VudCA9PT0gMCAmJlxuICAgICAgICB0aGlzLnBsdXJhbFJlc29sdmVyLnNob3VsZFVzZUludGxBcGkoKTtcbiAgICAgIGNvbnN0IG5lZWRzQ29udGV4dEhhbmRsaW5nID1cbiAgICAgICAgb3B0aW9ucy5jb250ZXh0ICE9PSB1bmRlZmluZWQgJiZcbiAgICAgICAgKHR5cGVvZiBvcHRpb25zLmNvbnRleHQgPT09ICdzdHJpbmcnIHx8IHR5cGVvZiBvcHRpb25zLmNvbnRleHQgPT09ICdudW1iZXInKSAmJlxuICAgICAgICBvcHRpb25zLmNvbnRleHQgIT09ICcnO1xuXG4gICAgICBjb25zdCBjb2RlcyA9IG9wdGlvbnMubG5nc1xuICAgICAgICA/IG9wdGlvbnMubG5nc1xuICAgICAgICA6IHRoaXMubGFuZ3VhZ2VVdGlscy50b1Jlc29sdmVIaWVyYXJjaHkob3B0aW9ucy5sbmcgfHwgdGhpcy5sYW5ndWFnZSwgb3B0aW9ucy5mYWxsYmFja0xuZyk7XG5cbiAgICAgIG5hbWVzcGFjZXMuZm9yRWFjaCgobnMpID0+IHtcbiAgICAgICAgaWYgKHRoaXMuaXNWYWxpZExvb2t1cChmb3VuZCkpIHJldHVybjtcbiAgICAgICAgdXNlZE5TID0gbnM7XG5cbiAgICAgICAgaWYgKFxuICAgICAgICAgICFjaGVja2VkTG9hZGVkRm9yW2Ake2NvZGVzWzBdfS0ke25zfWBdICYmXG4gICAgICAgICAgdGhpcy51dGlscyAmJlxuICAgICAgICAgIHRoaXMudXRpbHMuaGFzTG9hZGVkTmFtZXNwYWNlICYmXG4gICAgICAgICAgIXRoaXMudXRpbHMuaGFzTG9hZGVkTmFtZXNwYWNlKHVzZWROUylcbiAgICAgICAgKSB7XG4gICAgICAgICAgY2hlY2tlZExvYWRlZEZvcltgJHtjb2Rlc1swXX0tJHtuc31gXSA9IHRydWU7XG4gICAgICAgICAgdGhpcy5sb2dnZXIud2FybihcbiAgICAgICAgICAgIGBrZXkgXCIke3VzZWRLZXl9XCIgZm9yIGxhbmd1YWdlcyBcIiR7Y29kZXMuam9pbihcbiAgICAgICAgICAgICAgJywgJyxcbiAgICAgICAgICAgICl9XCIgd29uJ3QgZ2V0IHJlc29sdmVkIGFzIG5hbWVzcGFjZSBcIiR7dXNlZE5TfVwiIHdhcyBub3QgeWV0IGxvYWRlZGAsXG4gICAgICAgICAgICAnVGhpcyBtZWFucyBzb21ldGhpbmcgSVMgV1JPTkcgaW4geW91ciBzZXR1cC4gWW91IGFjY2VzcyB0aGUgdCBmdW5jdGlvbiBiZWZvcmUgaTE4bmV4dC5pbml0IC8gaTE4bmV4dC5sb2FkTmFtZXNwYWNlIC8gaTE4bmV4dC5jaGFuZ2VMYW5ndWFnZSB3YXMgZG9uZS4gV2FpdCBmb3IgdGhlIGNhbGxiYWNrIG9yIFByb21pc2UgdG8gcmVzb2x2ZSBiZWZvcmUgYWNjZXNzaW5nIGl0ISEhJyxcbiAgICAgICAgICApO1xuICAgICAgICB9XG5cbiAgICAgICAgY29kZXMuZm9yRWFjaCgoY29kZSkgPT4ge1xuICAgICAgICAgIGlmICh0aGlzLmlzVmFsaWRMb29rdXAoZm91bmQpKSByZXR1cm47XG4gICAgICAgICAgdXNlZExuZyA9IGNvZGU7XG5cbiAgICAgICAgICBjb25zdCBmaW5hbEtleXMgPSBba2V5XTtcblxuICAgICAgICAgIGlmICh0aGlzLmkxOG5Gb3JtYXQgJiYgdGhpcy5pMThuRm9ybWF0LmFkZExvb2t1cEtleXMpIHtcbiAgICAgICAgICAgIHRoaXMuaTE4bkZvcm1hdC5hZGRMb29rdXBLZXlzKGZpbmFsS2V5cywga2V5LCBjb2RlLCBucywgb3B0aW9ucyk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxldCBwbHVyYWxTdWZmaXg7XG4gICAgICAgICAgICBpZiAobmVlZHNQbHVyYWxIYW5kbGluZylcbiAgICAgICAgICAgICAgcGx1cmFsU3VmZml4ID0gdGhpcy5wbHVyYWxSZXNvbHZlci5nZXRTdWZmaXgoY29kZSwgb3B0aW9ucy5jb3VudCwgb3B0aW9ucyk7XG4gICAgICAgICAgICBjb25zdCB6ZXJvU3VmZml4ID0gYCR7dGhpcy5vcHRpb25zLnBsdXJhbFNlcGFyYXRvcn16ZXJvYDtcbiAgICAgICAgICAgIGNvbnN0IG9yZGluYWxQcmVmaXggPSBgJHt0aGlzLm9wdGlvbnMucGx1cmFsU2VwYXJhdG9yfW9yZGluYWwke3RoaXMub3B0aW9ucy5wbHVyYWxTZXBhcmF0b3J9YDtcbiAgICAgICAgICAgIC8vIGdldCBrZXkgZm9yIHBsdXJhbCBpZiBuZWVkZWRcbiAgICAgICAgICAgIGlmIChuZWVkc1BsdXJhbEhhbmRsaW5nKSB7XG4gICAgICAgICAgICAgIGZpbmFsS2V5cy5wdXNoKGtleSArIHBsdXJhbFN1ZmZpeCk7XG4gICAgICAgICAgICAgIGlmIChvcHRpb25zLm9yZGluYWwgJiYgcGx1cmFsU3VmZml4LmluZGV4T2Yob3JkaW5hbFByZWZpeCkgPT09IDApIHtcbiAgICAgICAgICAgICAgICBmaW5hbEtleXMucHVzaChcbiAgICAgICAgICAgICAgICAgIGtleSArIHBsdXJhbFN1ZmZpeC5yZXBsYWNlKG9yZGluYWxQcmVmaXgsIHRoaXMub3B0aW9ucy5wbHVyYWxTZXBhcmF0b3IpLFxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgaWYgKG5lZWRzWmVyb1N1ZmZpeExvb2t1cCkge1xuICAgICAgICAgICAgICAgIGZpbmFsS2V5cy5wdXNoKGtleSArIHplcm9TdWZmaXgpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIGdldCBrZXkgZm9yIGNvbnRleHQgaWYgbmVlZGVkXG4gICAgICAgICAgICBpZiAobmVlZHNDb250ZXh0SGFuZGxpbmcpIHtcbiAgICAgICAgICAgICAgY29uc3QgY29udGV4dEtleSA9IGAke2tleX0ke3RoaXMub3B0aW9ucy5jb250ZXh0U2VwYXJhdG9yfSR7b3B0aW9ucy5jb250ZXh0fWA7XG4gICAgICAgICAgICAgIGZpbmFsS2V5cy5wdXNoKGNvbnRleHRLZXkpO1xuXG4gICAgICAgICAgICAgIC8vIGdldCBrZXkgZm9yIGNvbnRleHQgKyBwbHVyYWwgaWYgbmVlZGVkXG4gICAgICAgICAgICAgIGlmIChuZWVkc1BsdXJhbEhhbmRsaW5nKSB7XG4gICAgICAgICAgICAgICAgZmluYWxLZXlzLnB1c2goY29udGV4dEtleSArIHBsdXJhbFN1ZmZpeCk7XG4gICAgICAgICAgICAgICAgaWYgKG9wdGlvbnMub3JkaW5hbCAmJiBwbHVyYWxTdWZmaXguaW5kZXhPZihvcmRpbmFsUHJlZml4KSA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgZmluYWxLZXlzLnB1c2goXG4gICAgICAgICAgICAgICAgICAgIGNvbnRleHRLZXkgKyBwbHVyYWxTdWZmaXgucmVwbGFjZShvcmRpbmFsUHJlZml4LCB0aGlzLm9wdGlvbnMucGx1cmFsU2VwYXJhdG9yKSxcbiAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChuZWVkc1plcm9TdWZmaXhMb29rdXApIHtcbiAgICAgICAgICAgICAgICAgIGZpbmFsS2V5cy5wdXNoKGNvbnRleHRLZXkgKyB6ZXJvU3VmZml4KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBpdGVyYXRlIG92ZXIgZmluYWxLZXlzIHN0YXJ0aW5nIHdpdGggbW9zdCBzcGVjaWZpYyBwbHVyYWxrZXkgKC0+IGNvbnRleHRrZXkgb25seSkgLT4gc2luZ3VsYXJrZXkgb25seVxuICAgICAgICAgIGxldCBwb3NzaWJsZUtleTtcbiAgICAgICAgICAvKiBlc2xpbnQgbm8tY29uZC1hc3NpZ246IDAgKi9cbiAgICAgICAgICB3aGlsZSAoKHBvc3NpYmxlS2V5ID0gZmluYWxLZXlzLnBvcCgpKSkge1xuICAgICAgICAgICAgaWYgKCF0aGlzLmlzVmFsaWRMb29rdXAoZm91bmQpKSB7XG4gICAgICAgICAgICAgIGV4YWN0VXNlZEtleSA9IHBvc3NpYmxlS2V5O1xuICAgICAgICAgICAgICBmb3VuZCA9IHRoaXMuZ2V0UmVzb3VyY2UoY29kZSwgbnMsIHBvc3NpYmxlS2V5LCBvcHRpb25zKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4geyByZXM6IGZvdW5kLCB1c2VkS2V5LCBleGFjdFVzZWRLZXksIHVzZWRMbmcsIHVzZWROUyB9O1xuICB9XG5cbiAgaXNWYWxpZExvb2t1cChyZXMpIHtcbiAgICByZXR1cm4gKFxuICAgICAgcmVzICE9PSB1bmRlZmluZWQgJiZcbiAgICAgICEoIXRoaXMub3B0aW9ucy5yZXR1cm5OdWxsICYmIHJlcyA9PT0gbnVsbCkgJiZcbiAgICAgICEoIXRoaXMub3B0aW9ucy5yZXR1cm5FbXB0eVN0cmluZyAmJiByZXMgPT09ICcnKVxuICAgICk7XG4gIH1cblxuICBnZXRSZXNvdXJjZShjb2RlLCBucywga2V5LCBvcHRpb25zID0ge30pIHtcbiAgICBpZiAodGhpcy5pMThuRm9ybWF0ICYmIHRoaXMuaTE4bkZvcm1hdC5nZXRSZXNvdXJjZSlcbiAgICAgIHJldHVybiB0aGlzLmkxOG5Gb3JtYXQuZ2V0UmVzb3VyY2UoY29kZSwgbnMsIGtleSwgb3B0aW9ucyk7XG4gICAgcmV0dXJuIHRoaXMucmVzb3VyY2VTdG9yZS5nZXRSZXNvdXJjZShjb2RlLCBucywga2V5LCBvcHRpb25zKTtcbiAgfVxuXG4gIHN0YXRpYyBoYXNEZWZhdWx0VmFsdWUob3B0aW9ucykge1xuICAgIGNvbnN0IHByZWZpeCA9ICdkZWZhdWx0VmFsdWUnO1xuXG4gICAgZm9yIChjb25zdCBvcHRpb24gaW4gb3B0aW9ucykge1xuICAgICAgaWYgKFxuICAgICAgICBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob3B0aW9ucywgb3B0aW9uKSAmJlxuICAgICAgICBwcmVmaXggPT09IG9wdGlvbi5zdWJzdHJpbmcoMCwgcHJlZml4Lmxlbmd0aCkgJiZcbiAgICAgICAgdW5kZWZpbmVkICE9PSBvcHRpb25zW29wdGlvbl1cbiAgICAgICkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgVHJhbnNsYXRvcjtcbiIsImltcG9ydCBiYXNlTG9nZ2VyIGZyb20gJy4vbG9nZ2VyLmpzJztcbmltcG9ydCB7IGdldENsZWFuZWRDb2RlIH0gZnJvbSAnLi91dGlscy5qcyc7XG5cbmZ1bmN0aW9uIGNhcGl0YWxpemUoc3RyaW5nKSB7XG4gIHJldHVybiBzdHJpbmcuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBzdHJpbmcuc2xpY2UoMSk7XG59XG5cbmNsYXNzIExhbmd1YWdlVXRpbCB7XG4gIGNvbnN0cnVjdG9yKG9wdGlvbnMpIHtcbiAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuXG4gICAgdGhpcy5zdXBwb3J0ZWRMbmdzID0gdGhpcy5vcHRpb25zLnN1cHBvcnRlZExuZ3MgfHwgZmFsc2U7XG4gICAgdGhpcy5sb2dnZXIgPSBiYXNlTG9nZ2VyLmNyZWF0ZSgnbGFuZ3VhZ2VVdGlscycpO1xuICB9XG5cbiAgZ2V0U2NyaXB0UGFydEZyb21Db2RlKGNvZGUpIHtcbiAgICBjb2RlID0gZ2V0Q2xlYW5lZENvZGUoY29kZSk7XG4gICAgaWYgKCFjb2RlIHx8IGNvZGUuaW5kZXhPZignLScpIDwgMCkgcmV0dXJuIG51bGw7XG5cbiAgICBjb25zdCBwID0gY29kZS5zcGxpdCgnLScpO1xuICAgIGlmIChwLmxlbmd0aCA9PT0gMikgcmV0dXJuIG51bGw7XG4gICAgcC5wb3AoKTtcbiAgICBpZiAocFtwLmxlbmd0aCAtIDFdLnRvTG93ZXJDYXNlKCkgPT09ICd4JykgcmV0dXJuIG51bGw7XG4gICAgcmV0dXJuIHRoaXMuZm9ybWF0TGFuZ3VhZ2VDb2RlKHAuam9pbignLScpKTtcbiAgfVxuXG4gIGdldExhbmd1YWdlUGFydEZyb21Db2RlKGNvZGUpIHtcbiAgICBjb2RlID0gZ2V0Q2xlYW5lZENvZGUoY29kZSk7XG4gICAgaWYgKCFjb2RlIHx8IGNvZGUuaW5kZXhPZignLScpIDwgMCkgcmV0dXJuIGNvZGU7XG5cbiAgICBjb25zdCBwID0gY29kZS5zcGxpdCgnLScpO1xuICAgIHJldHVybiB0aGlzLmZvcm1hdExhbmd1YWdlQ29kZShwWzBdKTtcbiAgfVxuXG4gIGZvcm1hdExhbmd1YWdlQ29kZShjb2RlKSB7XG4gICAgLy8gaHR0cDovL3d3dy5pYW5hLm9yZy9hc3NpZ25tZW50cy9sYW5ndWFnZS10YWdzL2xhbmd1YWdlLXRhZ3MueGh0bWxcbiAgICBpZiAodHlwZW9mIGNvZGUgPT09ICdzdHJpbmcnICYmIGNvZGUuaW5kZXhPZignLScpID4gLTEpIHtcbiAgICAgIGNvbnN0IHNwZWNpYWxDYXNlcyA9IFsnaGFucycsICdoYW50JywgJ2xhdG4nLCAnY3lybCcsICdjYW5zJywgJ21vbmcnLCAnYXJhYiddO1xuICAgICAgbGV0IHAgPSBjb2RlLnNwbGl0KCctJyk7XG5cbiAgICAgIGlmICh0aGlzLm9wdGlvbnMubG93ZXJDYXNlTG5nKSB7XG4gICAgICAgIHAgPSBwLm1hcCgocGFydCkgPT4gcGFydC50b0xvd2VyQ2FzZSgpKTtcbiAgICAgIH0gZWxzZSBpZiAocC5sZW5ndGggPT09IDIpIHtcbiAgICAgICAgcFswXSA9IHBbMF0udG9Mb3dlckNhc2UoKTtcbiAgICAgICAgcFsxXSA9IHBbMV0udG9VcHBlckNhc2UoKTtcblxuICAgICAgICBpZiAoc3BlY2lhbENhc2VzLmluZGV4T2YocFsxXS50b0xvd2VyQ2FzZSgpKSA+IC0xKSBwWzFdID0gY2FwaXRhbGl6ZShwWzFdLnRvTG93ZXJDYXNlKCkpO1xuICAgICAgfSBlbHNlIGlmIChwLmxlbmd0aCA9PT0gMykge1xuICAgICAgICBwWzBdID0gcFswXS50b0xvd2VyQ2FzZSgpO1xuXG4gICAgICAgIC8vIGlmIGxlbmdodCAyIGd1ZXNzIGl0J3MgYSBjb3VudHJ5XG4gICAgICAgIGlmIChwWzFdLmxlbmd0aCA9PT0gMikgcFsxXSA9IHBbMV0udG9VcHBlckNhc2UoKTtcbiAgICAgICAgaWYgKHBbMF0gIT09ICdzZ24nICYmIHBbMl0ubGVuZ3RoID09PSAyKSBwWzJdID0gcFsyXS50b1VwcGVyQ2FzZSgpO1xuXG4gICAgICAgIGlmIChzcGVjaWFsQ2FzZXMuaW5kZXhPZihwWzFdLnRvTG93ZXJDYXNlKCkpID4gLTEpIHBbMV0gPSBjYXBpdGFsaXplKHBbMV0udG9Mb3dlckNhc2UoKSk7XG4gICAgICAgIGlmIChzcGVjaWFsQ2FzZXMuaW5kZXhPZihwWzJdLnRvTG93ZXJDYXNlKCkpID4gLTEpIHBbMl0gPSBjYXBpdGFsaXplKHBbMl0udG9Mb3dlckNhc2UoKSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBwLmpvaW4oJy0nKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5vcHRpb25zLmNsZWFuQ29kZSB8fCB0aGlzLm9wdGlvbnMubG93ZXJDYXNlTG5nID8gY29kZS50b0xvd2VyQ2FzZSgpIDogY29kZTtcbiAgfVxuXG4gIGlzU3VwcG9ydGVkQ29kZShjb2RlKSB7XG4gICAgaWYgKHRoaXMub3B0aW9ucy5sb2FkID09PSAnbGFuZ3VhZ2VPbmx5JyB8fCB0aGlzLm9wdGlvbnMubm9uRXhwbGljaXRTdXBwb3J0ZWRMbmdzKSB7XG4gICAgICBjb2RlID0gdGhpcy5nZXRMYW5ndWFnZVBhcnRGcm9tQ29kZShjb2RlKTtcbiAgICB9XG4gICAgcmV0dXJuIChcbiAgICAgICF0aGlzLnN1cHBvcnRlZExuZ3MgfHwgIXRoaXMuc3VwcG9ydGVkTG5ncy5sZW5ndGggfHwgdGhpcy5zdXBwb3J0ZWRMbmdzLmluZGV4T2YoY29kZSkgPiAtMVxuICAgICk7XG4gIH1cblxuICBnZXRCZXN0TWF0Y2hGcm9tQ29kZXMoY29kZXMpIHtcbiAgICBpZiAoIWNvZGVzKSByZXR1cm4gbnVsbDtcblxuICAgIGxldCBmb3VuZDtcblxuICAgIC8vIHBpY2sgZmlyc3Qgc3VwcG9ydGVkIGNvZGUgb3IgaWYgbm8gcmVzdHJpY3Rpb24gcGljayB0aGUgZmlyc3Qgb25lIChoaWdoZXN0IHByaW8pXG4gICAgY29kZXMuZm9yRWFjaCgoY29kZSkgPT4ge1xuICAgICAgaWYgKGZvdW5kKSByZXR1cm47XG4gICAgICBjb25zdCBjbGVhbmVkTG5nID0gdGhpcy5mb3JtYXRMYW5ndWFnZUNvZGUoY29kZSk7XG4gICAgICBpZiAoIXRoaXMub3B0aW9ucy5zdXBwb3J0ZWRMbmdzIHx8IHRoaXMuaXNTdXBwb3J0ZWRDb2RlKGNsZWFuZWRMbmcpKSBmb3VuZCA9IGNsZWFuZWRMbmc7XG4gICAgfSk7XG5cbiAgICAvLyBpZiB3ZSBnb3Qgbm8gbWF0Y2ggaW4gc3VwcG9ydGVkTG5ncyB5ZXQgLSBjaGVjayBmb3Igc2ltaWxhciBsb2NhbGVzXG4gICAgLy8gZmlyc3QgIGRlLUNIIC0tPiBkZVxuICAgIC8vIHNlY29uZCBkZS1DSCAtLT4gZGUtREVcbiAgICBpZiAoIWZvdW5kICYmIHRoaXMub3B0aW9ucy5zdXBwb3J0ZWRMbmdzKSB7XG4gICAgICBjb2Rlcy5mb3JFYWNoKChjb2RlKSA9PiB7XG4gICAgICAgIGlmIChmb3VuZCkgcmV0dXJuO1xuXG4gICAgICAgIGNvbnN0IGxuZ09ubHkgPSB0aGlzLmdldExhbmd1YWdlUGFydEZyb21Db2RlKGNvZGUpO1xuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tcmV0dXJuLWFzc2lnblxuICAgICAgICBpZiAodGhpcy5pc1N1cHBvcnRlZENvZGUobG5nT25seSkpIHJldHVybiAoZm91bmQgPSBsbmdPbmx5KTtcblxuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgYXJyYXktY2FsbGJhY2stcmV0dXJuXG4gICAgICAgIGZvdW5kID0gdGhpcy5vcHRpb25zLnN1cHBvcnRlZExuZ3MuZmluZCgoc3VwcG9ydGVkTG5nKSA9PiB7XG4gICAgICAgICAgaWYgKHN1cHBvcnRlZExuZyA9PT0gbG5nT25seSkgcmV0dXJuIHN1cHBvcnRlZExuZztcbiAgICAgICAgICBpZiAoc3VwcG9ydGVkTG5nLmluZGV4T2YoJy0nKSA8IDAgJiYgbG5nT25seS5pbmRleE9mKCctJykgPCAwKSByZXR1cm47XG4gICAgICAgICAgaWYgKHN1cHBvcnRlZExuZy5pbmRleE9mKGxuZ09ubHkpID09PSAwKSByZXR1cm4gc3VwcG9ydGVkTG5nO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIGlmIG5vdGhpbmcgZm91bmQsIHVzZSBmYWxsYmFja0xuZ1xuICAgIGlmICghZm91bmQpIGZvdW5kID0gdGhpcy5nZXRGYWxsYmFja0NvZGVzKHRoaXMub3B0aW9ucy5mYWxsYmFja0xuZylbMF07XG5cbiAgICByZXR1cm4gZm91bmQ7XG4gIH1cblxuICBnZXRGYWxsYmFja0NvZGVzKGZhbGxiYWNrcywgY29kZSkge1xuICAgIGlmICghZmFsbGJhY2tzKSByZXR1cm4gW107XG4gICAgaWYgKHR5cGVvZiBmYWxsYmFja3MgPT09ICdmdW5jdGlvbicpIGZhbGxiYWNrcyA9IGZhbGxiYWNrcyhjb2RlKTtcbiAgICBpZiAodHlwZW9mIGZhbGxiYWNrcyA9PT0gJ3N0cmluZycpIGZhbGxiYWNrcyA9IFtmYWxsYmFja3NdO1xuICAgIGlmIChPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmFwcGx5KGZhbGxiYWNrcykgPT09ICdbb2JqZWN0IEFycmF5XScpIHJldHVybiBmYWxsYmFja3M7XG5cbiAgICBpZiAoIWNvZGUpIHJldHVybiBmYWxsYmFja3MuZGVmYXVsdCB8fCBbXTtcblxuICAgIC8vIGFzdW1lIHdlIGhhdmUgYW4gb2JqZWN0IGRlZmluaW5nIGZhbGxiYWNrc1xuICAgIGxldCBmb3VuZCA9IGZhbGxiYWNrc1tjb2RlXTtcbiAgICBpZiAoIWZvdW5kKSBmb3VuZCA9IGZhbGxiYWNrc1t0aGlzLmdldFNjcmlwdFBhcnRGcm9tQ29kZShjb2RlKV07XG4gICAgaWYgKCFmb3VuZCkgZm91bmQgPSBmYWxsYmFja3NbdGhpcy5mb3JtYXRMYW5ndWFnZUNvZGUoY29kZSldO1xuICAgIGlmICghZm91bmQpIGZvdW5kID0gZmFsbGJhY2tzW3RoaXMuZ2V0TGFuZ3VhZ2VQYXJ0RnJvbUNvZGUoY29kZSldO1xuICAgIGlmICghZm91bmQpIGZvdW5kID0gZmFsbGJhY2tzLmRlZmF1bHQ7XG5cbiAgICByZXR1cm4gZm91bmQgfHwgW107XG4gIH1cblxuICB0b1Jlc29sdmVIaWVyYXJjaHkoY29kZSwgZmFsbGJhY2tDb2RlKSB7XG4gICAgY29uc3QgZmFsbGJhY2tDb2RlcyA9IHRoaXMuZ2V0RmFsbGJhY2tDb2RlcyhcbiAgICAgIGZhbGxiYWNrQ29kZSB8fCB0aGlzLm9wdGlvbnMuZmFsbGJhY2tMbmcgfHwgW10sXG4gICAgICBjb2RlLFxuICAgICk7XG5cbiAgICBjb25zdCBjb2RlcyA9IFtdO1xuICAgIGNvbnN0IGFkZENvZGUgPSAoYykgPT4ge1xuICAgICAgaWYgKCFjKSByZXR1cm47XG4gICAgICBpZiAodGhpcy5pc1N1cHBvcnRlZENvZGUoYykpIHtcbiAgICAgICAgY29kZXMucHVzaChjKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMubG9nZ2VyLndhcm4oYHJlamVjdGluZyBsYW5ndWFnZSBjb2RlIG5vdCBmb3VuZCBpbiBzdXBwb3J0ZWRMbmdzOiAke2N9YCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIGlmICh0eXBlb2YgY29kZSA9PT0gJ3N0cmluZycgJiYgKGNvZGUuaW5kZXhPZignLScpID4gLTEgfHwgY29kZS5pbmRleE9mKCdfJykgPiAtMSkpIHtcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMubG9hZCAhPT0gJ2xhbmd1YWdlT25seScpIGFkZENvZGUodGhpcy5mb3JtYXRMYW5ndWFnZUNvZGUoY29kZSkpO1xuICAgICAgaWYgKHRoaXMub3B0aW9ucy5sb2FkICE9PSAnbGFuZ3VhZ2VPbmx5JyAmJiB0aGlzLm9wdGlvbnMubG9hZCAhPT0gJ2N1cnJlbnRPbmx5JylcbiAgICAgICAgYWRkQ29kZSh0aGlzLmdldFNjcmlwdFBhcnRGcm9tQ29kZShjb2RlKSk7XG4gICAgICBpZiAodGhpcy5vcHRpb25zLmxvYWQgIT09ICdjdXJyZW50T25seScpIGFkZENvZGUodGhpcy5nZXRMYW5ndWFnZVBhcnRGcm9tQ29kZShjb2RlKSk7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgY29kZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGFkZENvZGUodGhpcy5mb3JtYXRMYW5ndWFnZUNvZGUoY29kZSkpO1xuICAgIH1cblxuICAgIGZhbGxiYWNrQ29kZXMuZm9yRWFjaCgoZmMpID0+IHtcbiAgICAgIGlmIChjb2Rlcy5pbmRleE9mKGZjKSA8IDApIGFkZENvZGUodGhpcy5mb3JtYXRMYW5ndWFnZUNvZGUoZmMpKTtcbiAgICB9KTtcblxuICAgIHJldHVybiBjb2RlcztcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBMYW5ndWFnZVV0aWw7XG4iLCJpbXBvcnQgYmFzZUxvZ2dlciBmcm9tICcuL2xvZ2dlci5qcyc7XG5pbXBvcnQgeyBnZXRDbGVhbmVkQ29kZSB9IGZyb20gJy4vdXRpbHMuanMnXG5cbi8vIGRlZmluaXRpb24gaHR0cDovL3RyYW5zbGF0ZS5zb3VyY2Vmb3JnZS5uZXQvd2lraS9sMTBuL3BsdXJhbGZvcm1zXG4vKiBlc2xpbnQtZGlzYWJsZSAqL1xubGV0IHNldHMgPSBbXG4gIHsgbG5nczogWydhY2gnLCdhaycsJ2FtJywnYXJuJywnYnInLCdmaWwnLCdndW4nLCdsbicsJ21mZScsJ21nJywnbWknLCdvYycsICdwdCcsICdwdC1CUicsXG4gICAgJ3RnJywgJ3RsJywgJ3RpJywndHInLCd1eicsJ3dhJ10sIG5yOiBbMSwyXSwgZmM6IDEgfSxcblxuICB7IGxuZ3M6IFsnYWYnLCdhbicsJ2FzdCcsJ2F6JywnYmcnLCdibicsJ2NhJywnZGEnLCdkZScsJ2RldicsJ2VsJywnZW4nLFxuICAgICdlbycsJ2VzJywnZXQnLCdldScsJ2ZpJywnZm8nLCdmdXInLCdmeScsJ2dsJywnZ3UnLCdoYScsJ2hpJyxcbiAgICAnaHUnLCdoeScsJ2lhJywnaXQnLCdraycsJ2tuJywna3UnLCdsYicsJ21haScsJ21sJywnbW4nLCdtcicsJ25haCcsJ25hcCcsJ25iJyxcbiAgICAnbmUnLCdubCcsJ25uJywnbm8nLCduc28nLCdwYScsJ3BhcCcsJ3BtcycsJ3BzJywncHQtUFQnLCdybScsJ3NjbycsXG4gICAgJ3NlJywnc2knLCdzbycsJ3NvbicsJ3NxJywnc3YnLCdzdycsJ3RhJywndGUnLCd0aycsJ3VyJywneW8nXSwgbnI6IFsxLDJdLCBmYzogMiB9LFxuXG4gIHsgbG5nczogWydheScsJ2JvJywnY2dnJywnZmEnLCdodCcsJ2lkJywnamEnLCdqYm8nLCdrYScsJ2ttJywna28nLCdreScsJ2xvJyxcbiAgICAnbXMnLCdzYWgnLCdzdScsJ3RoJywndHQnLCd1ZycsJ3ZpJywnd28nLCd6aCddLCBucjogWzFdLCBmYzogMyB9LFxuXG4gIHsgbG5nczogWydiZScsJ2JzJywgJ2NucicsICdkeicsJ2hyJywncnUnLCdzcicsJ3VrJ10sIG5yOiBbMSwyLDVdLCBmYzogNCB9LFxuXG4gIHsgbG5nczogWydhciddLCBucjogWzAsMSwyLDMsMTEsMTAwXSwgZmM6IDUgfSxcbiAgeyBsbmdzOiBbJ2NzJywnc2snXSwgbnI6IFsxLDIsNV0sIGZjOiA2IH0sXG4gIHsgbG5nczogWydjc2InLCdwbCddLCBucjogWzEsMiw1XSwgZmM6IDcgfSxcbiAgeyBsbmdzOiBbJ2N5J10sIG5yOiBbMSwyLDMsOF0sIGZjOiA4IH0sXG4gIHsgbG5nczogWydmciddLCBucjogWzEsMl0sIGZjOiA5IH0sXG4gIHsgbG5nczogWydnYSddLCBucjogWzEsMiwzLDcsMTFdLCBmYzogMTAgfSxcbiAgeyBsbmdzOiBbJ2dkJ10sIG5yOiBbMSwyLDMsMjBdLCBmYzogMTEgfSxcbiAgeyBsbmdzOiBbJ2lzJ10sIG5yOiBbMSwyXSwgZmM6IDEyIH0sXG4gIHsgbG5nczogWydqdiddLCBucjogWzAsMV0sIGZjOiAxMyB9LFxuICB7IGxuZ3M6IFsna3cnXSwgbnI6IFsxLDIsMyw0XSwgZmM6IDE0IH0sXG4gIHsgbG5nczogWydsdCddLCBucjogWzEsMiwxMF0sIGZjOiAxNSB9LFxuICB7IGxuZ3M6IFsnbHYnXSwgbnI6IFsxLDIsMF0sIGZjOiAxNiB9LFxuICB7IGxuZ3M6IFsnbWsnXSwgbnI6IFsxLDJdLCBmYzogMTcgfSxcbiAgeyBsbmdzOiBbJ21uayddLCBucjogWzAsMSwyXSwgZmM6IDE4IH0sXG4gIHsgbG5nczogWydtdCddLCBucjogWzEsMiwxMSwyMF0sIGZjOiAxOSB9LFxuICB7IGxuZ3M6IFsnb3InXSwgbnI6IFsyLDFdLCBmYzogMiB9LFxuICB7IGxuZ3M6IFsncm8nXSwgbnI6IFsxLDIsMjBdLCBmYzogMjAgfSxcbiAgeyBsbmdzOiBbJ3NsJ10sIG5yOiBbNSwxLDIsM10sIGZjOiAyMSB9LFxuICB7IGxuZ3M6IFsnaGUnLCdpdyddLCBucjogWzEsMiwyMCwyMV0sIGZjOiAyMiB9XG5dXG5cbmxldCBfcnVsZXNQbHVyYWxzVHlwZXMgPSB7XG4gIDE6IGZ1bmN0aW9uKG4pIHtyZXR1cm4gTnVtYmVyKG4gPiAxKTt9LFxuICAyOiBmdW5jdGlvbihuKSB7cmV0dXJuIE51bWJlcihuICE9IDEpO30sXG4gIDM6IGZ1bmN0aW9uKG4pIHtyZXR1cm4gMDt9LFxuICA0OiBmdW5jdGlvbihuKSB7cmV0dXJuIE51bWJlcihuJTEwPT0xICYmIG4lMTAwIT0xMSA/IDAgOiBuJTEwPj0yICYmIG4lMTA8PTQgJiYgKG4lMTAwPDEwIHx8IG4lMTAwPj0yMCkgPyAxIDogMik7fSxcbiAgNTogZnVuY3Rpb24obikge3JldHVybiBOdW1iZXIobj09MCA/IDAgOiBuPT0xID8gMSA6IG49PTIgPyAyIDogbiUxMDA+PTMgJiYgbiUxMDA8PTEwID8gMyA6IG4lMTAwPj0xMSA/IDQgOiA1KTt9LFxuICA2OiBmdW5jdGlvbihuKSB7cmV0dXJuIE51bWJlcigobj09MSkgPyAwIDogKG4+PTIgJiYgbjw9NCkgPyAxIDogMik7fSxcbiAgNzogZnVuY3Rpb24obikge3JldHVybiBOdW1iZXIobj09MSA/IDAgOiBuJTEwPj0yICYmIG4lMTA8PTQgJiYgKG4lMTAwPDEwIHx8IG4lMTAwPj0yMCkgPyAxIDogMik7fSxcbiAgODogZnVuY3Rpb24obikge3JldHVybiBOdW1iZXIoKG49PTEpID8gMCA6IChuPT0yKSA/IDEgOiAobiAhPSA4ICYmIG4gIT0gMTEpID8gMiA6IDMpO30sXG4gIDk6IGZ1bmN0aW9uKG4pIHtyZXR1cm4gTnVtYmVyKG4gPj0gMik7fSxcbiAgMTA6IGZ1bmN0aW9uKG4pIHtyZXR1cm4gTnVtYmVyKG49PTEgPyAwIDogbj09MiA/IDEgOiBuPDcgPyAyIDogbjwxMSA/IDMgOiA0KSA7fSxcbiAgMTE6IGZ1bmN0aW9uKG4pIHtyZXR1cm4gTnVtYmVyKChuPT0xIHx8IG49PTExKSA/IDAgOiAobj09MiB8fCBuPT0xMikgPyAxIDogKG4gPiAyICYmIG4gPCAyMCkgPyAyIDogMyk7fSxcbiAgMTI6IGZ1bmN0aW9uKG4pIHtyZXR1cm4gTnVtYmVyKG4lMTAhPTEgfHwgbiUxMDA9PTExKTt9LFxuICAxMzogZnVuY3Rpb24obikge3JldHVybiBOdW1iZXIobiAhPT0gMCk7fSxcbiAgMTQ6IGZ1bmN0aW9uKG4pIHtyZXR1cm4gTnVtYmVyKChuPT0xKSA/IDAgOiAobj09MikgPyAxIDogKG4gPT0gMykgPyAyIDogMyk7fSxcbiAgMTU6IGZ1bmN0aW9uKG4pIHtyZXR1cm4gTnVtYmVyKG4lMTA9PTEgJiYgbiUxMDAhPTExID8gMCA6IG4lMTA+PTIgJiYgKG4lMTAwPDEwIHx8IG4lMTAwPj0yMCkgPyAxIDogMik7fSxcbiAgMTY6IGZ1bmN0aW9uKG4pIHtyZXR1cm4gTnVtYmVyKG4lMTA9PTEgJiYgbiUxMDAhPTExID8gMCA6IG4gIT09IDAgPyAxIDogMik7fSxcbiAgMTc6IGZ1bmN0aW9uKG4pIHtyZXR1cm4gTnVtYmVyKG49PTEgfHwgbiUxMD09MSAmJiBuJTEwMCE9MTEgPyAwIDogMSk7fSxcbiAgMTg6IGZ1bmN0aW9uKG4pIHtyZXR1cm4gTnVtYmVyKG49PTAgPyAwIDogbj09MSA/IDEgOiAyKTt9LFxuICAxOTogZnVuY3Rpb24obikge3JldHVybiBOdW1iZXIobj09MSA/IDAgOiBuPT0wIHx8ICggbiUxMDA+MSAmJiBuJTEwMDwxMSkgPyAxIDogKG4lMTAwPjEwICYmIG4lMTAwPDIwICkgPyAyIDogMyk7fSxcbiAgMjA6IGZ1bmN0aW9uKG4pIHtyZXR1cm4gTnVtYmVyKG49PTEgPyAwIDogKG49PTAgfHwgKG4lMTAwID4gMCAmJiBuJTEwMCA8IDIwKSkgPyAxIDogMik7fSxcbiAgMjE6IGZ1bmN0aW9uKG4pIHtyZXR1cm4gTnVtYmVyKG4lMTAwPT0xID8gMSA6IG4lMTAwPT0yID8gMiA6IG4lMTAwPT0zIHx8IG4lMTAwPT00ID8gMyA6IDApOyB9LFxuICAyMjogZnVuY3Rpb24obikge3JldHVybiBOdW1iZXIobj09MSA/IDAgOiBuPT0yID8gMSA6IChuPDAgfHwgbj4xMCkgJiYgbiUxMD09MCA/IDIgOiAzKTsgfVxufTtcbi8qIGVzbGludC1lbmFibGUgKi9cblxuY29uc3Qgbm9uSW50bFZlcnNpb25zID0gWyd2MScsICd2MicsICd2MyddO1xuY29uc3QgaW50bFZlcnNpb25zID0gWyd2NCddO1xuY29uc3Qgc3VmZml4ZXNPcmRlciA9IHtcbiAgemVybzogMCxcbiAgb25lOiAxLFxuICB0d286IDIsXG4gIGZldzogMyxcbiAgbWFueTogNCxcbiAgb3RoZXI6IDUsXG59O1xuXG5mdW5jdGlvbiBjcmVhdGVSdWxlcygpIHtcbiAgY29uc3QgcnVsZXMgPSB7fTtcbiAgc2V0cy5mb3JFYWNoKChzZXQpID0+IHtcbiAgICBzZXQubG5ncy5mb3JFYWNoKChsKSA9PiB7XG4gICAgICBydWxlc1tsXSA9IHtcbiAgICAgICAgbnVtYmVyczogc2V0Lm5yLFxuICAgICAgICBwbHVyYWxzOiBfcnVsZXNQbHVyYWxzVHlwZXNbc2V0LmZjXVxuICAgICAgfTtcbiAgICB9KTtcbiAgfSk7XG4gIHJldHVybiBydWxlcztcbn1cblxuY2xhc3MgUGx1cmFsUmVzb2x2ZXIge1xuICBjb25zdHJ1Y3RvcihsYW5ndWFnZVV0aWxzLCBvcHRpb25zID0ge30pIHtcbiAgICB0aGlzLmxhbmd1YWdlVXRpbHMgPSBsYW5ndWFnZVV0aWxzO1xuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG5cbiAgICB0aGlzLmxvZ2dlciA9IGJhc2VMb2dnZXIuY3JlYXRlKCdwbHVyYWxSZXNvbHZlcicpO1xuXG4gICAgaWYgKCghdGhpcy5vcHRpb25zLmNvbXBhdGliaWxpdHlKU09OIHx8IGludGxWZXJzaW9ucy5pbmNsdWRlcyh0aGlzLm9wdGlvbnMuY29tcGF0aWJpbGl0eUpTT04pKSAmJiAodHlwZW9mIEludGwgPT09ICd1bmRlZmluZWQnIHx8ICFJbnRsLlBsdXJhbFJ1bGVzKSkge1xuICAgICAgdGhpcy5vcHRpb25zLmNvbXBhdGliaWxpdHlKU09OID0gJ3YzJztcbiAgICAgIHRoaXMubG9nZ2VyLmVycm9yKCdZb3VyIGVudmlyb25tZW50IHNlZW1zIG5vdCB0byBiZSBJbnRsIEFQSSBjb21wYXRpYmxlLCB1c2UgYW4gSW50bC5QbHVyYWxSdWxlcyBwb2x5ZmlsbC4gV2lsbCBmYWxsYmFjayB0byB0aGUgY29tcGF0aWJpbGl0eUpTT04gdjMgZm9ybWF0IGhhbmRsaW5nLicpO1xuICAgIH1cblxuICAgIHRoaXMucnVsZXMgPSBjcmVhdGVSdWxlcygpO1xuICB9XG5cbiAgYWRkUnVsZShsbmcsIG9iaikge1xuICAgIHRoaXMucnVsZXNbbG5nXSA9IG9iajtcbiAgfVxuXG4gIGdldFJ1bGUoY29kZSwgb3B0aW9ucyA9IHt9KSB7XG4gICAgaWYgKHRoaXMuc2hvdWxkVXNlSW50bEFwaSgpKSB7XG4gICAgICB0cnkge1xuICAgICAgICByZXR1cm4gbmV3IEludGwuUGx1cmFsUnVsZXMoZ2V0Q2xlYW5lZENvZGUoY29kZSksIHsgdHlwZTogb3B0aW9ucy5vcmRpbmFsID8gJ29yZGluYWwnIDogJ2NhcmRpbmFsJyB9KTtcbiAgICAgIH0gY2F0Y2gge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMucnVsZXNbY29kZV0gfHwgdGhpcy5ydWxlc1t0aGlzLmxhbmd1YWdlVXRpbHMuZ2V0TGFuZ3VhZ2VQYXJ0RnJvbUNvZGUoY29kZSldO1xuICB9XG5cbiAgbmVlZHNQbHVyYWwoY29kZSwgb3B0aW9ucyA9IHt9KSB7XG4gICAgY29uc3QgcnVsZSA9IHRoaXMuZ2V0UnVsZShjb2RlLCBvcHRpb25zKTtcblxuICAgIGlmICh0aGlzLnNob3VsZFVzZUludGxBcGkoKSkge1xuICAgICAgcmV0dXJuIHJ1bGUgJiYgcnVsZS5yZXNvbHZlZE9wdGlvbnMoKS5wbHVyYWxDYXRlZ29yaWVzLmxlbmd0aCA+IDE7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJ1bGUgJiYgcnVsZS5udW1iZXJzLmxlbmd0aCA+IDE7XG4gIH1cblxuICBnZXRQbHVyYWxGb3Jtc09mS2V5KGNvZGUsIGtleSwgb3B0aW9ucyA9IHt9KSB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0U3VmZml4ZXMoY29kZSwgb3B0aW9ucykubWFwKChzdWZmaXgpID0+IGAke2tleX0ke3N1ZmZpeH1gKTtcbiAgfVxuXG4gIGdldFN1ZmZpeGVzKGNvZGUsIG9wdGlvbnMgPSB7fSkge1xuICAgIGNvbnN0IHJ1bGUgPSB0aGlzLmdldFJ1bGUoY29kZSwgb3B0aW9ucyk7XG5cbiAgICBpZiAoIXJ1bGUpIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5zaG91bGRVc2VJbnRsQXBpKCkpIHtcbiAgICAgIHJldHVybiBydWxlLnJlc29sdmVkT3B0aW9ucygpLnBsdXJhbENhdGVnb3JpZXNcbiAgICAgICAgLnNvcnQoKHBsdXJhbENhdGVnb3J5MSwgcGx1cmFsQ2F0ZWdvcnkyKSA9PiBzdWZmaXhlc09yZGVyW3BsdXJhbENhdGVnb3J5MV0gLSBzdWZmaXhlc09yZGVyW3BsdXJhbENhdGVnb3J5Ml0pXG4gICAgICAgIC5tYXAocGx1cmFsQ2F0ZWdvcnkgPT4gYCR7dGhpcy5vcHRpb25zLnByZXBlbmR9JHtvcHRpb25zLm9yZGluYWwgPyBgb3JkaW5hbCR7dGhpcy5vcHRpb25zLnByZXBlbmR9YCA6ICcnfSR7cGx1cmFsQ2F0ZWdvcnl9YCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJ1bGUubnVtYmVycy5tYXAoKG51bWJlcikgPT4gdGhpcy5nZXRTdWZmaXgoY29kZSwgbnVtYmVyLCBvcHRpb25zKSk7XG4gIH1cblxuICBnZXRTdWZmaXgoY29kZSwgY291bnQsIG9wdGlvbnMgPSB7fSkge1xuICAgIGNvbnN0IHJ1bGUgPSB0aGlzLmdldFJ1bGUoY29kZSwgb3B0aW9ucyk7XG5cbiAgICBpZiAocnVsZSkge1xuICAgICAgaWYgKHRoaXMuc2hvdWxkVXNlSW50bEFwaSgpKSB7XG4gICAgICAgIHJldHVybiBgJHt0aGlzLm9wdGlvbnMucHJlcGVuZH0ke29wdGlvbnMub3JkaW5hbCA/IGBvcmRpbmFsJHt0aGlzLm9wdGlvbnMucHJlcGVuZH1gIDogJyd9JHtydWxlLnNlbGVjdChjb3VudCl9YDtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRoaXMuZ2V0U3VmZml4UmV0cm9Db21wYXRpYmxlKHJ1bGUsIGNvdW50KTtcbiAgICB9XG5cbiAgICB0aGlzLmxvZ2dlci53YXJuKGBubyBwbHVyYWwgcnVsZSBmb3VuZCBmb3I6ICR7Y29kZX1gKTtcbiAgICByZXR1cm4gJyc7XG4gIH1cblxuICBnZXRTdWZmaXhSZXRyb0NvbXBhdGlibGUocnVsZSwgY291bnQpIHtcbiAgICBjb25zdCBpZHggPSBydWxlLm5vQWJzID8gcnVsZS5wbHVyYWxzKGNvdW50KSA6IHJ1bGUucGx1cmFscyhNYXRoLmFicyhjb3VudCkpO1xuICAgIGxldCBzdWZmaXggPSBydWxlLm51bWJlcnNbaWR4XTtcblxuICAgIC8vIHNwZWNpYWwgdHJlYXRtZW50IGZvciBsbmdzIG9ubHkgaGF2aW5nIHNpbmd1bGFyIGFuZCBwbHVyYWxcbiAgICBpZiAodGhpcy5vcHRpb25zLnNpbXBsaWZ5UGx1cmFsU3VmZml4ICYmIHJ1bGUubnVtYmVycy5sZW5ndGggPT09IDIgJiYgcnVsZS5udW1iZXJzWzBdID09PSAxKSB7XG4gICAgICBpZiAoc3VmZml4ID09PSAyKSB7XG4gICAgICAgIHN1ZmZpeCA9ICdwbHVyYWwnO1xuICAgICAgfSBlbHNlIGlmIChzdWZmaXggPT09IDEpIHtcbiAgICAgICAgc3VmZml4ID0gJyc7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgcmV0dXJuU3VmZml4ID0gKCkgPT4gKFxuICAgICAgdGhpcy5vcHRpb25zLnByZXBlbmQgJiYgc3VmZml4LnRvU3RyaW5nKCkgPyB0aGlzLm9wdGlvbnMucHJlcGVuZCArIHN1ZmZpeC50b1N0cmluZygpIDogc3VmZml4LnRvU3RyaW5nKClcbiAgICApO1xuXG4gICAgLy8gQ09NUEFUSUJJTElUWSBKU09OXG4gICAgLy8gdjFcbiAgICBpZiAodGhpcy5vcHRpb25zLmNvbXBhdGliaWxpdHlKU09OID09PSAndjEnKSB7XG4gICAgICBpZiAoc3VmZml4ID09PSAxKSByZXR1cm4gJyc7XG4gICAgICBpZiAodHlwZW9mIHN1ZmZpeCA9PT0gJ251bWJlcicpIHJldHVybiBgX3BsdXJhbF8ke3N1ZmZpeC50b1N0cmluZygpfWA7XG4gICAgICByZXR1cm4gcmV0dXJuU3VmZml4KCk7XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tZWxzZS1yZXR1cm5cbiAgICB9IGVsc2UgaWYgKC8qIHYyICovIHRoaXMub3B0aW9ucy5jb21wYXRpYmlsaXR5SlNPTiA9PT0gJ3YyJykge1xuICAgICAgcmV0dXJuIHJldHVyblN1ZmZpeCgpO1xuICAgIH0gZWxzZSBpZiAoLyogdjMgLSBnZXR0ZXh0IGluZGV4ICovIHRoaXMub3B0aW9ucy5zaW1wbGlmeVBsdXJhbFN1ZmZpeCAmJiBydWxlLm51bWJlcnMubGVuZ3RoID09PSAyICYmIHJ1bGUubnVtYmVyc1swXSA9PT0gMSkge1xuICAgICAgcmV0dXJuIHJldHVyblN1ZmZpeCgpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5vcHRpb25zLnByZXBlbmQgJiYgaWR4LnRvU3RyaW5nKCkgPyB0aGlzLm9wdGlvbnMucHJlcGVuZCArIGlkeC50b1N0cmluZygpIDogaWR4LnRvU3RyaW5nKCk7XG4gIH1cblxuICBzaG91bGRVc2VJbnRsQXBpKCkge1xuICAgIHJldHVybiAhbm9uSW50bFZlcnNpb25zLmluY2x1ZGVzKHRoaXMub3B0aW9ucy5jb21wYXRpYmlsaXR5SlNPTik7XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgUGx1cmFsUmVzb2x2ZXI7XG4iLCJpbXBvcnQgKiBhcyB1dGlscyBmcm9tICcuL3V0aWxzLmpzJztcbmltcG9ydCBiYXNlTG9nZ2VyIGZyb20gJy4vbG9nZ2VyLmpzJztcblxuZnVuY3Rpb24gZGVlcEZpbmRXaXRoRGVmYXVsdHMoXG4gIGRhdGEsXG4gIGRlZmF1bHREYXRhLFxuICBrZXksXG4gIGtleVNlcGFyYXRvciA9ICcuJyxcbiAgaWdub3JlSlNPTlN0cnVjdHVyZSA9IHRydWUsXG4pIHtcbiAgbGV0IHBhdGggPSB1dGlscy5nZXRQYXRoV2l0aERlZmF1bHRzKGRhdGEsIGRlZmF1bHREYXRhLCBrZXkpO1xuICBpZiAoIXBhdGggJiYgaWdub3JlSlNPTlN0cnVjdHVyZSAmJiB0eXBlb2Yga2V5ID09PSAnc3RyaW5nJykge1xuICAgIHBhdGggPSB1dGlscy5kZWVwRmluZChkYXRhLCBrZXksIGtleVNlcGFyYXRvcik7XG4gICAgaWYgKHBhdGggPT09IHVuZGVmaW5lZCkgcGF0aCA9IHV0aWxzLmRlZXBGaW5kKGRlZmF1bHREYXRhLCBrZXksIGtleVNlcGFyYXRvcik7XG4gIH1cbiAgcmV0dXJuIHBhdGg7XG59XG5cbmNsYXNzIEludGVycG9sYXRvciB7XG4gIGNvbnN0cnVjdG9yKG9wdGlvbnMgPSB7fSkge1xuICAgIHRoaXMubG9nZ2VyID0gYmFzZUxvZ2dlci5jcmVhdGUoJ2ludGVycG9sYXRvcicpO1xuXG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcbiAgICB0aGlzLmZvcm1hdCA9IChvcHRpb25zLmludGVycG9sYXRpb24gJiYgb3B0aW9ucy5pbnRlcnBvbGF0aW9uLmZvcm1hdCkgfHwgKCh2YWx1ZSkgPT4gdmFsdWUpO1xuICAgIHRoaXMuaW5pdChvcHRpb25zKTtcbiAgfVxuXG4gIC8qIGVzbGludCBuby1wYXJhbS1yZWFzc2lnbjogMCAqL1xuICBpbml0KG9wdGlvbnMgPSB7fSkge1xuICAgIGlmICghb3B0aW9ucy5pbnRlcnBvbGF0aW9uKSBvcHRpb25zLmludGVycG9sYXRpb24gPSB7IGVzY2FwZVZhbHVlOiB0cnVlIH07XG5cbiAgICBjb25zdCBpT3B0cyA9IG9wdGlvbnMuaW50ZXJwb2xhdGlvbjtcblxuICAgIHRoaXMuZXNjYXBlID0gaU9wdHMuZXNjYXBlICE9PSB1bmRlZmluZWQgPyBpT3B0cy5lc2NhcGUgOiB1dGlscy5lc2NhcGU7XG4gICAgdGhpcy5lc2NhcGVWYWx1ZSA9IGlPcHRzLmVzY2FwZVZhbHVlICE9PSB1bmRlZmluZWQgPyBpT3B0cy5lc2NhcGVWYWx1ZSA6IHRydWU7XG4gICAgdGhpcy51c2VSYXdWYWx1ZVRvRXNjYXBlID1cbiAgICAgIGlPcHRzLnVzZVJhd1ZhbHVlVG9Fc2NhcGUgIT09IHVuZGVmaW5lZCA/IGlPcHRzLnVzZVJhd1ZhbHVlVG9Fc2NhcGUgOiBmYWxzZTtcblxuICAgIHRoaXMucHJlZml4ID0gaU9wdHMucHJlZml4ID8gdXRpbHMucmVnZXhFc2NhcGUoaU9wdHMucHJlZml4KSA6IGlPcHRzLnByZWZpeEVzY2FwZWQgfHwgJ3t7JztcbiAgICB0aGlzLnN1ZmZpeCA9IGlPcHRzLnN1ZmZpeCA/IHV0aWxzLnJlZ2V4RXNjYXBlKGlPcHRzLnN1ZmZpeCkgOiBpT3B0cy5zdWZmaXhFc2NhcGVkIHx8ICd9fSc7XG5cbiAgICB0aGlzLmZvcm1hdFNlcGFyYXRvciA9IGlPcHRzLmZvcm1hdFNlcGFyYXRvclxuICAgICAgPyBpT3B0cy5mb3JtYXRTZXBhcmF0b3JcbiAgICAgIDogaU9wdHMuZm9ybWF0U2VwYXJhdG9yIHx8ICcsJztcblxuICAgIHRoaXMudW5lc2NhcGVQcmVmaXggPSBpT3B0cy51bmVzY2FwZVN1ZmZpeCA/ICcnIDogaU9wdHMudW5lc2NhcGVQcmVmaXggfHwgJy0nO1xuICAgIHRoaXMudW5lc2NhcGVTdWZmaXggPSB0aGlzLnVuZXNjYXBlUHJlZml4ID8gJycgOiBpT3B0cy51bmVzY2FwZVN1ZmZpeCB8fCAnJztcblxuICAgIHRoaXMubmVzdGluZ1ByZWZpeCA9IGlPcHRzLm5lc3RpbmdQcmVmaXhcbiAgICAgID8gdXRpbHMucmVnZXhFc2NhcGUoaU9wdHMubmVzdGluZ1ByZWZpeClcbiAgICAgIDogaU9wdHMubmVzdGluZ1ByZWZpeEVzY2FwZWQgfHwgdXRpbHMucmVnZXhFc2NhcGUoJyR0KCcpO1xuICAgIHRoaXMubmVzdGluZ1N1ZmZpeCA9IGlPcHRzLm5lc3RpbmdTdWZmaXhcbiAgICAgID8gdXRpbHMucmVnZXhFc2NhcGUoaU9wdHMubmVzdGluZ1N1ZmZpeClcbiAgICAgIDogaU9wdHMubmVzdGluZ1N1ZmZpeEVzY2FwZWQgfHwgdXRpbHMucmVnZXhFc2NhcGUoJyknKTtcblxuICAgIHRoaXMubmVzdGluZ09wdGlvbnNTZXBhcmF0b3IgPSBpT3B0cy5uZXN0aW5nT3B0aW9uc1NlcGFyYXRvclxuICAgICAgPyBpT3B0cy5uZXN0aW5nT3B0aW9uc1NlcGFyYXRvclxuICAgICAgOiBpT3B0cy5uZXN0aW5nT3B0aW9uc1NlcGFyYXRvciB8fCAnLCc7XG5cbiAgICB0aGlzLm1heFJlcGxhY2VzID0gaU9wdHMubWF4UmVwbGFjZXMgPyBpT3B0cy5tYXhSZXBsYWNlcyA6IDEwMDA7XG5cbiAgICB0aGlzLmFsd2F5c0Zvcm1hdCA9IGlPcHRzLmFsd2F5c0Zvcm1hdCAhPT0gdW5kZWZpbmVkID8gaU9wdHMuYWx3YXlzRm9ybWF0IDogZmFsc2U7XG5cbiAgICAvLyB0aGUgcmVnZXhwXG4gICAgdGhpcy5yZXNldFJlZ0V4cCgpO1xuICB9XG5cbiAgcmVzZXQoKSB7XG4gICAgaWYgKHRoaXMub3B0aW9ucykgdGhpcy5pbml0KHRoaXMub3B0aW9ucyk7XG4gIH1cblxuICByZXNldFJlZ0V4cCgpIHtcbiAgICAvLyB0aGUgcmVnZXhwXG4gICAgY29uc3QgcmVnZXhwU3RyID0gYCR7dGhpcy5wcmVmaXh9KC4rPykke3RoaXMuc3VmZml4fWA7XG4gICAgdGhpcy5yZWdleHAgPSBuZXcgUmVnRXhwKHJlZ2V4cFN0ciwgJ2cnKTtcblxuICAgIGNvbnN0IHJlZ2V4cFVuZXNjYXBlU3RyID0gYCR7dGhpcy5wcmVmaXh9JHt0aGlzLnVuZXNjYXBlUHJlZml4fSguKz8pJHt0aGlzLnVuZXNjYXBlU3VmZml4fSR7dGhpcy5zdWZmaXh9YDtcbiAgICB0aGlzLnJlZ2V4cFVuZXNjYXBlID0gbmV3IFJlZ0V4cChyZWdleHBVbmVzY2FwZVN0ciwgJ2cnKTtcblxuICAgIGNvbnN0IG5lc3RpbmdSZWdleHBTdHIgPSBgJHt0aGlzLm5lc3RpbmdQcmVmaXh9KC4rPykke3RoaXMubmVzdGluZ1N1ZmZpeH1gO1xuICAgIHRoaXMubmVzdGluZ1JlZ2V4cCA9IG5ldyBSZWdFeHAobmVzdGluZ1JlZ2V4cFN0ciwgJ2cnKTtcbiAgfVxuXG4gIGludGVycG9sYXRlKHN0ciwgZGF0YSwgbG5nLCBvcHRpb25zKSB7XG4gICAgbGV0IG1hdGNoO1xuICAgIGxldCB2YWx1ZTtcbiAgICBsZXQgcmVwbGFjZXM7XG5cbiAgICBjb25zdCBkZWZhdWx0RGF0YSA9XG4gICAgICAodGhpcy5vcHRpb25zICYmIHRoaXMub3B0aW9ucy5pbnRlcnBvbGF0aW9uICYmIHRoaXMub3B0aW9ucy5pbnRlcnBvbGF0aW9uLmRlZmF1bHRWYXJpYWJsZXMpIHx8XG4gICAgICB7fTtcblxuICAgIGZ1bmN0aW9uIHJlZ2V4U2FmZSh2YWwpIHtcbiAgICAgIHJldHVybiB2YWwucmVwbGFjZSgvXFwkL2csICckJCQkJyk7XG4gICAgfVxuXG4gICAgY29uc3QgaGFuZGxlRm9ybWF0ID0gKGtleSkgPT4ge1xuICAgICAgaWYgKGtleS5pbmRleE9mKHRoaXMuZm9ybWF0U2VwYXJhdG9yKSA8IDApIHtcbiAgICAgICAgY29uc3QgcGF0aCA9IGRlZXBGaW5kV2l0aERlZmF1bHRzKFxuICAgICAgICAgIGRhdGEsXG4gICAgICAgICAgZGVmYXVsdERhdGEsXG4gICAgICAgICAga2V5LFxuICAgICAgICAgIHRoaXMub3B0aW9ucy5rZXlTZXBhcmF0b3IsXG4gICAgICAgICAgdGhpcy5vcHRpb25zLmlnbm9yZUpTT05TdHJ1Y3R1cmUsXG4gICAgICAgICk7XG4gICAgICAgIHJldHVybiB0aGlzLmFsd2F5c0Zvcm1hdFxuICAgICAgICAgID8gdGhpcy5mb3JtYXQocGF0aCwgdW5kZWZpbmVkLCBsbmcsIHsgLi4ub3B0aW9ucywgLi4uZGF0YSwgaW50ZXJwb2xhdGlvbmtleToga2V5IH0pXG4gICAgICAgICAgOiBwYXRoO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBwID0ga2V5LnNwbGl0KHRoaXMuZm9ybWF0U2VwYXJhdG9yKTtcbiAgICAgIGNvbnN0IGsgPSBwLnNoaWZ0KCkudHJpbSgpO1xuICAgICAgY29uc3QgZiA9IHAuam9pbih0aGlzLmZvcm1hdFNlcGFyYXRvcikudHJpbSgpO1xuXG4gICAgICByZXR1cm4gdGhpcy5mb3JtYXQoXG4gICAgICAgIGRlZXBGaW5kV2l0aERlZmF1bHRzKFxuICAgICAgICAgIGRhdGEsXG4gICAgICAgICAgZGVmYXVsdERhdGEsXG4gICAgICAgICAgayxcbiAgICAgICAgICB0aGlzLm9wdGlvbnMua2V5U2VwYXJhdG9yLFxuICAgICAgICAgIHRoaXMub3B0aW9ucy5pZ25vcmVKU09OU3RydWN0dXJlLFxuICAgICAgICApLFxuICAgICAgICBmLFxuICAgICAgICBsbmcsXG4gICAgICAgIHtcbiAgICAgICAgICAuLi5vcHRpb25zLFxuICAgICAgICAgIC4uLmRhdGEsXG4gICAgICAgICAgaW50ZXJwb2xhdGlvbmtleTogayxcbiAgICAgICAgfSxcbiAgICAgICk7XG4gICAgfTtcblxuICAgIHRoaXMucmVzZXRSZWdFeHAoKTtcblxuICAgIGNvbnN0IG1pc3NpbmdJbnRlcnBvbGF0aW9uSGFuZGxlciA9XG4gICAgICAob3B0aW9ucyAmJiBvcHRpb25zLm1pc3NpbmdJbnRlcnBvbGF0aW9uSGFuZGxlcikgfHwgdGhpcy5vcHRpb25zLm1pc3NpbmdJbnRlcnBvbGF0aW9uSGFuZGxlcjtcblxuICAgIGNvbnN0IHNraXBPblZhcmlhYmxlcyA9XG4gICAgICBvcHRpb25zICYmIG9wdGlvbnMuaW50ZXJwb2xhdGlvbiAmJiBvcHRpb25zLmludGVycG9sYXRpb24uc2tpcE9uVmFyaWFibGVzICE9PSB1bmRlZmluZWRcbiAgICAgICAgPyBvcHRpb25zLmludGVycG9sYXRpb24uc2tpcE9uVmFyaWFibGVzXG4gICAgICAgIDogdGhpcy5vcHRpb25zLmludGVycG9sYXRpb24uc2tpcE9uVmFyaWFibGVzO1xuXG4gICAgY29uc3QgdG9kb3MgPSBbXG4gICAgICB7XG4gICAgICAgIC8vIHVuZXNjYXBlIGlmIGhhcyB1bmVzY2FwZVByZWZpeC9TdWZmaXhcbiAgICAgICAgcmVnZXg6IHRoaXMucmVnZXhwVW5lc2NhcGUsXG4gICAgICAgIHNhZmVWYWx1ZTogKHZhbCkgPT4gcmVnZXhTYWZlKHZhbCksXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICAvLyByZWd1bGFyIGVzY2FwZSBvbiBkZW1hbmRcbiAgICAgICAgcmVnZXg6IHRoaXMucmVnZXhwLFxuICAgICAgICBzYWZlVmFsdWU6ICh2YWwpID0+ICh0aGlzLmVzY2FwZVZhbHVlID8gcmVnZXhTYWZlKHRoaXMuZXNjYXBlKHZhbCkpIDogcmVnZXhTYWZlKHZhbCkpLFxuICAgICAgfSxcbiAgICBdO1xuICAgIHRvZG9zLmZvckVhY2goKHRvZG8pID0+IHtcbiAgICAgIHJlcGxhY2VzID0gMDtcbiAgICAgIC8qIGVzbGludCBuby1jb25kLWFzc2lnbjogMCAqL1xuICAgICAgd2hpbGUgKChtYXRjaCA9IHRvZG8ucmVnZXguZXhlYyhzdHIpKSkge1xuICAgICAgICBjb25zdCBtYXRjaGVkVmFyID0gbWF0Y2hbMV0udHJpbSgpO1xuICAgICAgICB2YWx1ZSA9IGhhbmRsZUZvcm1hdChtYXRjaGVkVmFyKTtcbiAgICAgICAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBpZiAodHlwZW9mIG1pc3NpbmdJbnRlcnBvbGF0aW9uSGFuZGxlciA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgY29uc3QgdGVtcCA9IG1pc3NpbmdJbnRlcnBvbGF0aW9uSGFuZGxlcihzdHIsIG1hdGNoLCBvcHRpb25zKTtcbiAgICAgICAgICAgIHZhbHVlID0gdHlwZW9mIHRlbXAgPT09ICdzdHJpbmcnID8gdGVtcCA6ICcnO1xuICAgICAgICAgIH0gZWxzZSBpZiAob3B0aW9ucyAmJiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob3B0aW9ucywgbWF0Y2hlZFZhcikpIHtcbiAgICAgICAgICAgIHZhbHVlID0gJyc7IC8vIHVuZGVmaW5lZCBiZWNvbWVzIGVtcHR5IHN0cmluZ1xuICAgICAgICAgIH0gZWxzZSBpZiAoc2tpcE9uVmFyaWFibGVzKSB7XG4gICAgICAgICAgICB2YWx1ZSA9IG1hdGNoWzBdO1xuICAgICAgICAgICAgY29udGludWU7IC8vIHRoaXMgbWFrZXMgc3VyZSBpdCBjb250aW51ZXMgdG8gZGV0ZWN0IG90aGVyc1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmxvZ2dlci53YXJuKGBtaXNzZWQgdG8gcGFzcyBpbiB2YXJpYWJsZSAke21hdGNoZWRWYXJ9IGZvciBpbnRlcnBvbGF0aW5nICR7c3RyfWApO1xuICAgICAgICAgICAgdmFsdWUgPSAnJztcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHZhbHVlICE9PSAnc3RyaW5nJyAmJiAhdGhpcy51c2VSYXdWYWx1ZVRvRXNjYXBlKSB7XG4gICAgICAgICAgdmFsdWUgPSB1dGlscy5tYWtlU3RyaW5nKHZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBzYWZlVmFsdWUgPSB0b2RvLnNhZmVWYWx1ZSh2YWx1ZSk7XG4gICAgICAgIHN0ciA9IHN0ci5yZXBsYWNlKG1hdGNoWzBdLCBzYWZlVmFsdWUpO1xuICAgICAgICBpZiAoc2tpcE9uVmFyaWFibGVzKSB7XG4gICAgICAgICAgdG9kby5yZWdleC5sYXN0SW5kZXggKz0gdmFsdWUubGVuZ3RoO1xuICAgICAgICAgIHRvZG8ucmVnZXgubGFzdEluZGV4IC09IG1hdGNoWzBdLmxlbmd0aDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0b2RvLnJlZ2V4Lmxhc3RJbmRleCA9IDA7XG4gICAgICAgIH1cbiAgICAgICAgcmVwbGFjZXMrKztcbiAgICAgICAgaWYgKHJlcGxhY2VzID49IHRoaXMubWF4UmVwbGFjZXMpIHtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBzdHI7XG4gIH1cblxuICBuZXN0KHN0ciwgZmMsIG9wdGlvbnMgPSB7fSkge1xuICAgIGxldCBtYXRjaDtcbiAgICBsZXQgdmFsdWU7XG5cbiAgICBsZXQgY2xvbmVkT3B0aW9ucztcblxuICAgIC8vIGlmIHZhbHVlIGlzIHNvbWV0aGluZyBsaWtlIFwibXlLZXlcIjogXCJsb3JlbSAkKGFub3RoZXJLZXksIHsgXCJjb3VudFwiOiB7e2FWYWx1ZUluT3B0aW9uc319IH0pXCJcbiAgICBmdW5jdGlvbiBoYW5kbGVIYXNPcHRpb25zKGtleSwgaW5oZXJpdGVkT3B0aW9ucykge1xuICAgICAgY29uc3Qgc2VwID0gdGhpcy5uZXN0aW5nT3B0aW9uc1NlcGFyYXRvcjtcbiAgICAgIGlmIChrZXkuaW5kZXhPZihzZXApIDwgMCkgcmV0dXJuIGtleTtcblxuICAgICAgY29uc3QgYyA9IGtleS5zcGxpdChuZXcgUmVnRXhwKGAke3NlcH1bIF0qe2ApKTtcblxuICAgICAgbGV0IG9wdGlvbnNTdHJpbmcgPSBgeyR7Y1sxXX1gO1xuICAgICAga2V5ID0gY1swXTtcbiAgICAgIG9wdGlvbnNTdHJpbmcgPSB0aGlzLmludGVycG9sYXRlKG9wdGlvbnNTdHJpbmcsIGNsb25lZE9wdGlvbnMpO1xuICAgICAgY29uc3QgbWF0Y2hlZFNpbmdsZVF1b3RlcyA9IG9wdGlvbnNTdHJpbmcubWF0Y2goLycvZyk7XG4gICAgICBjb25zdCBtYXRjaGVkRG91YmxlUXVvdGVzID0gb3B0aW9uc1N0cmluZy5tYXRjaCgvXCIvZyk7XG4gICAgICBpZiAoXG4gICAgICAgIChtYXRjaGVkU2luZ2xlUXVvdGVzICYmIG1hdGNoZWRTaW5nbGVRdW90ZXMubGVuZ3RoICUgMiA9PT0gMCAmJiAhbWF0Y2hlZERvdWJsZVF1b3RlcykgfHxcbiAgICAgICAgbWF0Y2hlZERvdWJsZVF1b3Rlcy5sZW5ndGggJSAyICE9PSAwXG4gICAgICApIHtcbiAgICAgICAgb3B0aW9uc1N0cmluZyA9IG9wdGlvbnNTdHJpbmcucmVwbGFjZSgvJy9nLCAnXCInKTtcbiAgICAgIH1cblxuICAgICAgdHJ5IHtcbiAgICAgICAgY2xvbmVkT3B0aW9ucyA9IEpTT04ucGFyc2Uob3B0aW9uc1N0cmluZyk7XG5cbiAgICAgICAgaWYgKGluaGVyaXRlZE9wdGlvbnMpIGNsb25lZE9wdGlvbnMgPSB7IC4uLmluaGVyaXRlZE9wdGlvbnMsIC4uLmNsb25lZE9wdGlvbnMgfTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgdGhpcy5sb2dnZXIud2FybihgZmFpbGVkIHBhcnNpbmcgb3B0aW9ucyBzdHJpbmcgaW4gbmVzdGluZyBmb3Iga2V5ICR7a2V5fWAsIGUpO1xuICAgICAgICByZXR1cm4gYCR7a2V5fSR7c2VwfSR7b3B0aW9uc1N0cmluZ31gO1xuICAgICAgfVxuXG4gICAgICAvLyBhc3NlcnQgd2UgZG8gbm90IGdldCBhIGVuZGxlc3MgbG9vcCBvbiBpbnRlcnBvbGF0aW5nIGRlZmF1bHRWYWx1ZSBhZ2FpbiBhbmQgYWdhaW5cbiAgICAgIGRlbGV0ZSBjbG9uZWRPcHRpb25zLmRlZmF1bHRWYWx1ZTtcbiAgICAgIHJldHVybiBrZXk7XG4gICAgfVxuXG4gICAgLy8gcmVndWxhciBlc2NhcGUgb24gZGVtYW5kXG4gICAgd2hpbGUgKChtYXRjaCA9IHRoaXMubmVzdGluZ1JlZ2V4cC5leGVjKHN0cikpKSB7XG4gICAgICBsZXQgZm9ybWF0dGVycyA9IFtdO1xuXG4gICAgICBjbG9uZWRPcHRpb25zID0geyAuLi5vcHRpb25zIH07XG4gICAgICBjbG9uZWRPcHRpb25zID1cbiAgICAgICAgY2xvbmVkT3B0aW9ucy5yZXBsYWNlICYmIHR5cGVvZiBjbG9uZWRPcHRpb25zLnJlcGxhY2UgIT09ICdzdHJpbmcnXG4gICAgICAgICAgPyBjbG9uZWRPcHRpb25zLnJlcGxhY2VcbiAgICAgICAgICA6IGNsb25lZE9wdGlvbnM7XG4gICAgICBjbG9uZWRPcHRpb25zLmFwcGx5UG9zdFByb2Nlc3NvciA9IGZhbHNlOyAvLyBhdm9pZCBwb3N0IHByb2Nlc3Npbmcgb24gbmVzdGVkIGxvb2t1cFxuICAgICAgZGVsZXRlIGNsb25lZE9wdGlvbnMuZGVmYXVsdFZhbHVlOyAvLyBhc3NlcnQgd2UgZG8gbm90IGdldCBhIGVuZGxlc3MgbG9vcCBvbiBpbnRlcnBvbGF0aW5nIGRlZmF1bHRWYWx1ZSBhZ2FpbiBhbmQgYWdhaW5cblxuICAgICAgLyoqXG4gICAgICAgKiBJZiB0aGVyZSBpcyBtb3JlIHRoYW4gb25lIHBhcmFtZXRlciAoY29udGFpbnMgdGhlIGZvcm1hdCBzZXBhcmF0b3IpLiBFLmcuOlxuICAgICAgICogICAtIHQoYSwgYilcbiAgICAgICAqICAgLSB0KGEsIGIsIGMpXG4gICAgICAgKlxuICAgICAgICogQW5kIHRob3NlIHBhcmFtZXRlcnMgYXJlIG5vdCBkeW5hbWljIHZhbHVlcyAocGFyYW1ldGVycyBkbyBub3QgaW5jbHVkZSBjdXJseSBicmFjZXMpLiBFLmcuOlxuICAgICAgICogICAtIE5vdCB0KGEsIHsgXCJrZXlcIjogXCJ7e3ZhcmlhYmxlfX1cIiB9KVxuICAgICAgICogICAtIE5vdCB0KGEsIGIsIHtcImtleUFcIjogXCJ2YWx1ZUFcIiwgXCJrZXlCXCI6IFwidmFsdWVCXCJ9KVxuICAgICAgICovXG4gICAgICBsZXQgZG9SZWR1Y2UgPSBmYWxzZTtcbiAgICAgIGlmIChtYXRjaFswXS5pbmRleE9mKHRoaXMuZm9ybWF0U2VwYXJhdG9yKSAhPT0gLTEgJiYgIS97Lip9Ly50ZXN0KG1hdGNoWzFdKSkge1xuICAgICAgICBjb25zdCByID0gbWF0Y2hbMV0uc3BsaXQodGhpcy5mb3JtYXRTZXBhcmF0b3IpLm1hcCgoZWxlbSkgPT4gZWxlbS50cmltKCkpO1xuICAgICAgICBtYXRjaFsxXSA9IHIuc2hpZnQoKTtcbiAgICAgICAgZm9ybWF0dGVycyA9IHI7XG4gICAgICAgIGRvUmVkdWNlID0gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgdmFsdWUgPSBmYyhoYW5kbGVIYXNPcHRpb25zLmNhbGwodGhpcywgbWF0Y2hbMV0udHJpbSgpLCBjbG9uZWRPcHRpb25zKSwgY2xvbmVkT3B0aW9ucyk7XG5cbiAgICAgIC8vIGlzIG9ubHkgdGhlIG5lc3Rpbmcga2V5IChrZXkxID0gJyQoa2V5MiknKSByZXR1cm4gdGhlIHZhbHVlIHdpdGhvdXQgc3RyaW5naWZ5XG4gICAgICBpZiAodmFsdWUgJiYgbWF0Y2hbMF0gPT09IHN0ciAmJiB0eXBlb2YgdmFsdWUgIT09ICdzdHJpbmcnKSByZXR1cm4gdmFsdWU7XG5cbiAgICAgIC8vIG5vIHN0cmluZyB0byBpbmNsdWRlIG9yIGVtcHR5XG4gICAgICBpZiAodHlwZW9mIHZhbHVlICE9PSAnc3RyaW5nJykgdmFsdWUgPSB1dGlscy5tYWtlU3RyaW5nKHZhbHVlKTtcbiAgICAgIGlmICghdmFsdWUpIHtcbiAgICAgICAgdGhpcy5sb2dnZXIud2FybihgbWlzc2VkIHRvIHJlc29sdmUgJHttYXRjaFsxXX0gZm9yIG5lc3RpbmcgJHtzdHJ9YCk7XG4gICAgICAgIHZhbHVlID0gJyc7XG4gICAgICB9XG5cbiAgICAgIGlmIChkb1JlZHVjZSkge1xuICAgICAgICB2YWx1ZSA9IGZvcm1hdHRlcnMucmVkdWNlKFxuICAgICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1sb29wLWZ1bmNcbiAgICAgICAgICAodiwgZikgPT5cbiAgICAgICAgICAgIHRoaXMuZm9ybWF0KHYsIGYsIG9wdGlvbnMubG5nLCB7IC4uLm9wdGlvbnMsIGludGVycG9sYXRpb25rZXk6IG1hdGNoWzFdLnRyaW0oKSB9KSxcbiAgICAgICAgICB2YWx1ZS50cmltKCksXG4gICAgICAgICk7XG4gICAgICB9XG5cbiAgICAgIC8vIE5lc3RlZCBrZXlzIHNob3VsZCBub3QgYmUgZXNjYXBlZCBieSBkZWZhdWx0ICM4NTRcbiAgICAgIC8vIHZhbHVlID0gdGhpcy5lc2NhcGVWYWx1ZSA/IHJlZ2V4U2FmZSh1dGlscy5lc2NhcGUodmFsdWUpKSA6IHJlZ2V4U2FmZSh2YWx1ZSk7XG4gICAgICBzdHIgPSBzdHIucmVwbGFjZShtYXRjaFswXSwgdmFsdWUpO1xuICAgICAgdGhpcy5yZWdleHAubGFzdEluZGV4ID0gMDtcbiAgICB9XG4gICAgcmV0dXJuIHN0cjtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBJbnRlcnBvbGF0b3I7XG4iLCJpbXBvcnQgYmFzZUxvZ2dlciBmcm9tICcuL2xvZ2dlci5qcyc7XG5cbmZ1bmN0aW9uIHBhcnNlRm9ybWF0U3RyKGZvcm1hdFN0cikge1xuICBsZXQgZm9ybWF0TmFtZSA9IGZvcm1hdFN0ci50b0xvd2VyQ2FzZSgpLnRyaW0oKTtcbiAgY29uc3QgZm9ybWF0T3B0aW9ucyA9IHt9O1xuICBpZiAoZm9ybWF0U3RyLmluZGV4T2YoJygnKSA+IC0xKSB7XG4gICAgY29uc3QgcCA9IGZvcm1hdFN0ci5zcGxpdCgnKCcpO1xuICAgIGZvcm1hdE5hbWUgPSBwWzBdLnRvTG93ZXJDYXNlKCkudHJpbSgpO1xuXG4gICAgY29uc3Qgb3B0U3RyID0gcFsxXS5zdWJzdHJpbmcoMCwgcFsxXS5sZW5ndGggLSAxKTtcblxuICAgIC8vIGV4dHJhIGZvciBjdXJyZW5jeVxuICAgIGlmIChmb3JtYXROYW1lID09PSAnY3VycmVuY3knICYmIG9wdFN0ci5pbmRleE9mKCc6JykgPCAwKSB7XG4gICAgICBpZiAoIWZvcm1hdE9wdGlvbnMuY3VycmVuY3kpIGZvcm1hdE9wdGlvbnMuY3VycmVuY3kgPSBvcHRTdHIudHJpbSgpO1xuICAgIH0gZWxzZSBpZiAoZm9ybWF0TmFtZSA9PT0gJ3JlbGF0aXZldGltZScgJiYgb3B0U3RyLmluZGV4T2YoJzonKSA8IDApIHtcbiAgICAgIGlmICghZm9ybWF0T3B0aW9ucy5yYW5nZSkgZm9ybWF0T3B0aW9ucy5yYW5nZSA9IG9wdFN0ci50cmltKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IG9wdHMgPSBvcHRTdHIuc3BsaXQoJzsnKTtcblxuICAgICAgb3B0cy5mb3JFYWNoKChvcHQpID0+IHtcbiAgICAgICAgaWYgKCFvcHQpIHJldHVybjtcbiAgICAgICAgY29uc3QgW2tleSwgLi4ucmVzdF0gPSBvcHQuc3BsaXQoJzonKTtcbiAgICAgICAgY29uc3QgdmFsID0gcmVzdFxuICAgICAgICAgIC5qb2luKCc6JylcbiAgICAgICAgICAudHJpbSgpXG4gICAgICAgICAgLnJlcGxhY2UoL14nK3wnKyQvZywgJycpOyAvLyB0cmltIGFuZCByZXBsYWNlICcnXG5cbiAgICAgICAgaWYgKCFmb3JtYXRPcHRpb25zW2tleS50cmltKCldKSBmb3JtYXRPcHRpb25zW2tleS50cmltKCldID0gdmFsO1xuICAgICAgICBpZiAodmFsID09PSAnZmFsc2UnKSBmb3JtYXRPcHRpb25zW2tleS50cmltKCldID0gZmFsc2U7XG4gICAgICAgIGlmICh2YWwgPT09ICd0cnVlJykgZm9ybWF0T3B0aW9uc1trZXkudHJpbSgpXSA9IHRydWU7XG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1yZXN0cmljdGVkLWdsb2JhbHNcbiAgICAgICAgaWYgKCFpc05hTih2YWwpKSBmb3JtYXRPcHRpb25zW2tleS50cmltKCldID0gcGFyc2VJbnQodmFsLCAxMCk7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGZvcm1hdE5hbWUsXG4gICAgZm9ybWF0T3B0aW9ucyxcbiAgfTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlQ2FjaGVkRm9ybWF0dGVyKGZuKSB7XG4gIGNvbnN0IGNhY2hlID0ge307XG4gIHJldHVybiBmdW5jdGlvbiBpbnZva2VGb3JtYXR0ZXIodmFsLCBsbmcsIG9wdGlvbnMpIHtcbiAgICBjb25zdCBrZXkgPSBsbmcgKyBKU09OLnN0cmluZ2lmeShvcHRpb25zKTtcbiAgICBsZXQgZm9ybWF0dGVyID0gY2FjaGVba2V5XTtcbiAgICBpZiAoIWZvcm1hdHRlcikge1xuICAgICAgZm9ybWF0dGVyID0gZm4obG5nLCBvcHRpb25zKTtcbiAgICAgIGNhY2hlW2tleV0gPSBmb3JtYXR0ZXI7XG4gICAgfVxuICAgIHJldHVybiBmb3JtYXR0ZXIodmFsKTtcbiAgfTtcbn1cblxuY2xhc3MgRm9ybWF0dGVyIHtcbiAgY29uc3RydWN0b3Iob3B0aW9ucyA9IHt9KSB7XG4gICAgdGhpcy5sb2dnZXIgPSBiYXNlTG9nZ2VyLmNyZWF0ZSgnZm9ybWF0dGVyJyk7XG5cbiAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuICAgIHRoaXMuZm9ybWF0cyA9IHtcbiAgICAgIG51bWJlcjogY3JlYXRlQ2FjaGVkRm9ybWF0dGVyKChsbmcsIG9wdCkgPT4ge1xuICAgICAgICBjb25zdCBmb3JtYXR0ZXIgPSBuZXcgSW50bC5OdW1iZXJGb3JtYXQobG5nLCB7IC4uLm9wdCB9KTtcbiAgICAgICAgcmV0dXJuICh2YWwpID0+IGZvcm1hdHRlci5mb3JtYXQodmFsKTtcbiAgICAgIH0pLFxuICAgICAgY3VycmVuY3k6IGNyZWF0ZUNhY2hlZEZvcm1hdHRlcigobG5nLCBvcHQpID0+IHtcbiAgICAgICAgY29uc3QgZm9ybWF0dGVyID0gbmV3IEludGwuTnVtYmVyRm9ybWF0KGxuZywgeyAuLi5vcHQsIHN0eWxlOiAnY3VycmVuY3knIH0pO1xuICAgICAgICByZXR1cm4gKHZhbCkgPT4gZm9ybWF0dGVyLmZvcm1hdCh2YWwpO1xuICAgICAgfSksXG4gICAgICBkYXRldGltZTogY3JlYXRlQ2FjaGVkRm9ybWF0dGVyKChsbmcsIG9wdCkgPT4ge1xuICAgICAgICBjb25zdCBmb3JtYXR0ZXIgPSBuZXcgSW50bC5EYXRlVGltZUZvcm1hdChsbmcsIHsgLi4ub3B0IH0pO1xuICAgICAgICByZXR1cm4gKHZhbCkgPT4gZm9ybWF0dGVyLmZvcm1hdCh2YWwpO1xuICAgICAgfSksXG4gICAgICByZWxhdGl2ZXRpbWU6IGNyZWF0ZUNhY2hlZEZvcm1hdHRlcigobG5nLCBvcHQpID0+IHtcbiAgICAgICAgY29uc3QgZm9ybWF0dGVyID0gbmV3IEludGwuUmVsYXRpdmVUaW1lRm9ybWF0KGxuZywgeyAuLi5vcHQgfSk7XG4gICAgICAgIHJldHVybiAodmFsKSA9PiBmb3JtYXR0ZXIuZm9ybWF0KHZhbCwgb3B0LnJhbmdlIHx8ICdkYXknKTtcbiAgICAgIH0pLFxuICAgICAgbGlzdDogY3JlYXRlQ2FjaGVkRm9ybWF0dGVyKChsbmcsIG9wdCkgPT4ge1xuICAgICAgICBjb25zdCBmb3JtYXR0ZXIgPSBuZXcgSW50bC5MaXN0Rm9ybWF0KGxuZywgeyAuLi5vcHQgfSk7XG4gICAgICAgIHJldHVybiAodmFsKSA9PiBmb3JtYXR0ZXIuZm9ybWF0KHZhbCk7XG4gICAgICB9KSxcbiAgICB9O1xuICAgIHRoaXMuaW5pdChvcHRpb25zKTtcbiAgfVxuXG4gIC8qIGVzbGludCBuby1wYXJhbS1yZWFzc2lnbjogMCAqL1xuICBpbml0KHNlcnZpY2VzLCBvcHRpb25zID0geyBpbnRlcnBvbGF0aW9uOiB7fSB9KSB7XG4gICAgY29uc3QgaU9wdHMgPSBvcHRpb25zLmludGVycG9sYXRpb247XG5cbiAgICB0aGlzLmZvcm1hdFNlcGFyYXRvciA9IGlPcHRzLmZvcm1hdFNlcGFyYXRvclxuICAgICAgPyBpT3B0cy5mb3JtYXRTZXBhcmF0b3JcbiAgICAgIDogaU9wdHMuZm9ybWF0U2VwYXJhdG9yIHx8ICcsJztcbiAgfVxuXG4gIGFkZChuYW1lLCBmYykge1xuICAgIHRoaXMuZm9ybWF0c1tuYW1lLnRvTG93ZXJDYXNlKCkudHJpbSgpXSA9IGZjO1xuICB9XG5cbiAgYWRkQ2FjaGVkKG5hbWUsIGZjKSB7XG4gICAgdGhpcy5mb3JtYXRzW25hbWUudG9Mb3dlckNhc2UoKS50cmltKCldID0gY3JlYXRlQ2FjaGVkRm9ybWF0dGVyKGZjKTtcbiAgfVxuXG4gIGZvcm1hdCh2YWx1ZSwgZm9ybWF0LCBsbmcsIG9wdGlvbnMgPSB7fSkge1xuICAgIGNvbnN0IGZvcm1hdHMgPSBmb3JtYXQuc3BsaXQodGhpcy5mb3JtYXRTZXBhcmF0b3IpO1xuXG4gICAgY29uc3QgcmVzdWx0ID0gZm9ybWF0cy5yZWR1Y2UoKG1lbSwgZikgPT4ge1xuICAgICAgY29uc3QgeyBmb3JtYXROYW1lLCBmb3JtYXRPcHRpb25zIH0gPSBwYXJzZUZvcm1hdFN0cihmKTtcblxuICAgICAgaWYgKHRoaXMuZm9ybWF0c1tmb3JtYXROYW1lXSkge1xuICAgICAgICBsZXQgZm9ybWF0dGVkID0gbWVtO1xuICAgICAgICB0cnkge1xuICAgICAgICAgIC8vIG9wdGlvbnMgcGFzc2VkIGV4cGxpY2l0IGZvciB0aGF0IGZvcm1hdHRlZCB2YWx1ZVxuICAgICAgICAgIGNvbnN0IHZhbE9wdGlvbnMgPVxuICAgICAgICAgICAgKG9wdGlvbnMgJiYgb3B0aW9ucy5mb3JtYXRQYXJhbXMgJiYgb3B0aW9ucy5mb3JtYXRQYXJhbXNbb3B0aW9ucy5pbnRlcnBvbGF0aW9ua2V5XSkgfHxcbiAgICAgICAgICAgIHt9O1xuXG4gICAgICAgICAgLy8gbGFuZ3VhZ2VcbiAgICAgICAgICBjb25zdCBsID0gdmFsT3B0aW9ucy5sb2NhbGUgfHwgdmFsT3B0aW9ucy5sbmcgfHwgb3B0aW9ucy5sb2NhbGUgfHwgb3B0aW9ucy5sbmcgfHwgbG5nO1xuXG4gICAgICAgICAgZm9ybWF0dGVkID0gdGhpcy5mb3JtYXRzW2Zvcm1hdE5hbWVdKG1lbSwgbCwge1xuICAgICAgICAgICAgLi4uZm9ybWF0T3B0aW9ucyxcbiAgICAgICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICAgICAgICAuLi52YWxPcHRpb25zLFxuICAgICAgICAgIH0pO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgIHRoaXMubG9nZ2VyLndhcm4oZXJyb3IpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmb3JtYXR0ZWQ7XG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1lbHNlLXJldHVyblxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5sb2dnZXIud2FybihgdGhlcmUgd2FzIG5vIGZvcm1hdCBmdW5jdGlvbiBmb3IgJHtmb3JtYXROYW1lfWApO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG1lbTtcbiAgICB9LCB2YWx1ZSk7XG5cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IEZvcm1hdHRlcjtcbiIsImltcG9ydCAqIGFzIHV0aWxzIGZyb20gJy4vdXRpbHMuanMnO1xuaW1wb3J0IGJhc2VMb2dnZXIgZnJvbSAnLi9sb2dnZXIuanMnO1xuaW1wb3J0IEV2ZW50RW1pdHRlciBmcm9tICcuL0V2ZW50RW1pdHRlci5qcyc7XG5cbmZ1bmN0aW9uIHJlbW92ZVBlbmRpbmcocSwgbmFtZSkge1xuICBpZiAocS5wZW5kaW5nW25hbWVdICE9PSB1bmRlZmluZWQpIHtcbiAgICBkZWxldGUgcS5wZW5kaW5nW25hbWVdO1xuICAgIHEucGVuZGluZ0NvdW50LS07XG4gIH1cbn1cblxuY2xhc3MgQ29ubmVjdG9yIGV4dGVuZHMgRXZlbnRFbWl0dGVyIHtcbiAgY29uc3RydWN0b3IoYmFja2VuZCwgc3RvcmUsIHNlcnZpY2VzLCBvcHRpb25zID0ge30pIHtcbiAgICBzdXBlcigpO1xuXG4gICAgdGhpcy5iYWNrZW5kID0gYmFja2VuZDtcbiAgICB0aGlzLnN0b3JlID0gc3RvcmU7XG4gICAgdGhpcy5zZXJ2aWNlcyA9IHNlcnZpY2VzO1xuICAgIHRoaXMubGFuZ3VhZ2VVdGlscyA9IHNlcnZpY2VzLmxhbmd1YWdlVXRpbHM7XG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcbiAgICB0aGlzLmxvZ2dlciA9IGJhc2VMb2dnZXIuY3JlYXRlKCdiYWNrZW5kQ29ubmVjdG9yJyk7XG5cbiAgICB0aGlzLndhaXRpbmdSZWFkcyA9IFtdO1xuICAgIHRoaXMubWF4UGFyYWxsZWxSZWFkcyA9IG9wdGlvbnMubWF4UGFyYWxsZWxSZWFkcyB8fCAxMDtcbiAgICB0aGlzLnJlYWRpbmdDYWxscyA9IDA7XG5cbiAgICB0aGlzLm1heFJldHJpZXMgPSBvcHRpb25zLm1heFJldHJpZXMgPj0gMCA/IG9wdGlvbnMubWF4UmV0cmllcyA6IDU7XG4gICAgdGhpcy5yZXRyeVRpbWVvdXQgPSBvcHRpb25zLnJldHJ5VGltZW91dCA+PSAxID8gb3B0aW9ucy5yZXRyeVRpbWVvdXQgOiAzNTA7XG5cbiAgICB0aGlzLnN0YXRlID0ge307XG4gICAgdGhpcy5xdWV1ZSA9IFtdO1xuXG4gICAgaWYgKHRoaXMuYmFja2VuZCAmJiB0aGlzLmJhY2tlbmQuaW5pdCkge1xuICAgICAgdGhpcy5iYWNrZW5kLmluaXQoc2VydmljZXMsIG9wdGlvbnMuYmFja2VuZCwgb3B0aW9ucyk7XG4gICAgfVxuICB9XG5cbiAgcXVldWVMb2FkKGxhbmd1YWdlcywgbmFtZXNwYWNlcywgb3B0aW9ucywgY2FsbGJhY2spIHtcbiAgICAvLyBmaW5kIHdoYXQgbmVlZHMgdG8gYmUgbG9hZGVkXG4gICAgY29uc3QgdG9Mb2FkID0ge307XG4gICAgY29uc3QgcGVuZGluZyA9IHt9O1xuICAgIGNvbnN0IHRvTG9hZExhbmd1YWdlcyA9IHt9O1xuICAgIGNvbnN0IHRvTG9hZE5hbWVzcGFjZXMgPSB7fTtcblxuICAgIGxhbmd1YWdlcy5mb3JFYWNoKChsbmcpID0+IHtcbiAgICAgIGxldCBoYXNBbGxOYW1lc3BhY2VzID0gdHJ1ZTtcblxuICAgICAgbmFtZXNwYWNlcy5mb3JFYWNoKChucykgPT4ge1xuICAgICAgICBjb25zdCBuYW1lID0gYCR7bG5nfXwke25zfWA7XG5cbiAgICAgICAgaWYgKCFvcHRpb25zLnJlbG9hZCAmJiB0aGlzLnN0b3JlLmhhc1Jlc291cmNlQnVuZGxlKGxuZywgbnMpKSB7XG4gICAgICAgICAgdGhpcy5zdGF0ZVtuYW1lXSA9IDI7IC8vIGxvYWRlZFxuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuc3RhdGVbbmFtZV0gPCAwKSB7XG4gICAgICAgICAgLy8gbm90aGluZyB0byBkbyBmb3IgZXJyXG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5zdGF0ZVtuYW1lXSA9PT0gMSkge1xuICAgICAgICAgIGlmIChwZW5kaW5nW25hbWVdID09PSB1bmRlZmluZWQpIHBlbmRpbmdbbmFtZV0gPSB0cnVlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMuc3RhdGVbbmFtZV0gPSAxOyAvLyBwZW5kaW5nXG5cbiAgICAgICAgICBoYXNBbGxOYW1lc3BhY2VzID0gZmFsc2U7XG5cbiAgICAgICAgICBpZiAocGVuZGluZ1tuYW1lXSA9PT0gdW5kZWZpbmVkKSBwZW5kaW5nW25hbWVdID0gdHJ1ZTtcbiAgICAgICAgICBpZiAodG9Mb2FkW25hbWVdID09PSB1bmRlZmluZWQpIHRvTG9hZFtuYW1lXSA9IHRydWU7XG4gICAgICAgICAgaWYgKHRvTG9hZE5hbWVzcGFjZXNbbnNdID09PSB1bmRlZmluZWQpIHRvTG9hZE5hbWVzcGFjZXNbbnNdID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIGlmICghaGFzQWxsTmFtZXNwYWNlcykgdG9Mb2FkTGFuZ3VhZ2VzW2xuZ10gPSB0cnVlO1xuICAgIH0pO1xuXG4gICAgaWYgKE9iamVjdC5rZXlzKHRvTG9hZCkubGVuZ3RoIHx8IE9iamVjdC5rZXlzKHBlbmRpbmcpLmxlbmd0aCkge1xuICAgICAgdGhpcy5xdWV1ZS5wdXNoKHtcbiAgICAgICAgcGVuZGluZyxcbiAgICAgICAgcGVuZGluZ0NvdW50OiBPYmplY3Qua2V5cyhwZW5kaW5nKS5sZW5ndGgsXG4gICAgICAgIGxvYWRlZDoge30sXG4gICAgICAgIGVycm9yczogW10sXG4gICAgICAgIGNhbGxiYWNrLFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIHRvTG9hZDogT2JqZWN0LmtleXModG9Mb2FkKSxcbiAgICAgIHBlbmRpbmc6IE9iamVjdC5rZXlzKHBlbmRpbmcpLFxuICAgICAgdG9Mb2FkTGFuZ3VhZ2VzOiBPYmplY3Qua2V5cyh0b0xvYWRMYW5ndWFnZXMpLFxuICAgICAgdG9Mb2FkTmFtZXNwYWNlczogT2JqZWN0LmtleXModG9Mb2FkTmFtZXNwYWNlcyksXG4gICAgfTtcbiAgfVxuXG4gIGxvYWRlZChuYW1lLCBlcnIsIGRhdGEpIHtcbiAgICBjb25zdCBzID0gbmFtZS5zcGxpdCgnfCcpO1xuICAgIGNvbnN0IGxuZyA9IHNbMF07XG4gICAgY29uc3QgbnMgPSBzWzFdO1xuXG4gICAgaWYgKGVycikgdGhpcy5lbWl0KCdmYWlsZWRMb2FkaW5nJywgbG5nLCBucywgZXJyKTtcblxuICAgIGlmIChkYXRhKSB7XG4gICAgICB0aGlzLnN0b3JlLmFkZFJlc291cmNlQnVuZGxlKGxuZywgbnMsIGRhdGEpO1xuICAgIH1cblxuICAgIC8vIHNldCBsb2FkZWRcbiAgICB0aGlzLnN0YXRlW25hbWVdID0gZXJyID8gLTEgOiAyO1xuXG4gICAgLy8gY29uc29saWRhdGVkIGxvYWRpbmcgZG9uZSBpbiB0aGlzIHJ1biAtIG9ubHkgZW1pdCBvbmNlIGZvciBhIGxvYWRlZCBuYW1lc3BhY2VcbiAgICBjb25zdCBsb2FkZWQgPSB7fTtcblxuICAgIC8vIGNhbGxiYWNrIGlmIHJlYWR5XG4gICAgdGhpcy5xdWV1ZS5mb3JFYWNoKChxKSA9PiB7XG4gICAgICB1dGlscy5wdXNoUGF0aChxLmxvYWRlZCwgW2xuZ10sIG5zKTtcbiAgICAgIHJlbW92ZVBlbmRpbmcocSwgbmFtZSk7XG5cbiAgICAgIGlmIChlcnIpIHEuZXJyb3JzLnB1c2goZXJyKTtcblxuICAgICAgaWYgKHEucGVuZGluZ0NvdW50ID09PSAwICYmICFxLmRvbmUpIHtcbiAgICAgICAgLy8gb25seSBkbyBvbmNlIHBlciBsb2FkZWQgLT4gdGhpcy5lbWl0KCdsb2FkZWQnLCBxLmxvYWRlZCk7XG4gICAgICAgIE9iamVjdC5rZXlzKHEubG9hZGVkKS5mb3JFYWNoKChsKSA9PiB7XG4gICAgICAgICAgaWYgKCFsb2FkZWRbbF0pIGxvYWRlZFtsXSA9IHt9O1xuICAgICAgICAgIGNvbnN0IGxvYWRlZEtleXMgPSBxLmxvYWRlZFtsXTtcbiAgICAgICAgICBpZiAobG9hZGVkS2V5cy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGxvYWRlZEtleXMuZm9yRWFjaCgobikgPT4ge1xuICAgICAgICAgICAgICBpZiAobG9hZGVkW2xdW25dID09PSB1bmRlZmluZWQpIGxvYWRlZFtsXVtuXSA9IHRydWU7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8qIGVzbGludCBuby1wYXJhbS1yZWFzc2lnbjogMCAqL1xuICAgICAgICBxLmRvbmUgPSB0cnVlO1xuICAgICAgICBpZiAocS5lcnJvcnMubGVuZ3RoKSB7XG4gICAgICAgICAgcS5jYWxsYmFjayhxLmVycm9ycyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcS5jYWxsYmFjaygpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBlbWl0IGNvbnNvbGlkYXRlZCBsb2FkZWQgZXZlbnRcbiAgICB0aGlzLmVtaXQoJ2xvYWRlZCcsIGxvYWRlZCk7XG5cbiAgICAvLyByZW1vdmUgZG9uZSBsb2FkIHJlcXVlc3RzXG4gICAgdGhpcy5xdWV1ZSA9IHRoaXMucXVldWUuZmlsdGVyKChxKSA9PiAhcS5kb25lKTtcbiAgfVxuXG4gIHJlYWQobG5nLCBucywgZmNOYW1lLCB0cmllZCA9IDAsIHdhaXQgPSB0aGlzLnJldHJ5VGltZW91dCwgY2FsbGJhY2spIHtcbiAgICBpZiAoIWxuZy5sZW5ndGgpIHJldHVybiBjYWxsYmFjayhudWxsLCB7fSk7IC8vIG5vdGluZyB0byBsb2FkXG5cbiAgICAvLyBMaW1pdCBwYXJhbGxlbGlzbSBvZiBjYWxscyB0byBiYWNrZW5kXG4gICAgLy8gVGhpcyBpcyBuZWVkZWQgdG8gcHJldmVudCB0cnlpbmcgdG8gb3BlbiB0aG91c2FuZHMgb2ZcbiAgICAvLyBzb2NrZXRzIG9yIGZpbGUgZGVzY3JpcHRvcnMsIHdoaWNoIGNhbiBjYXVzZSBmYWlsdXJlc1xuICAgIC8vIGFuZCBhY3R1YWxseSBtYWtlIHRoZSBlbnRpcmUgcHJvY2VzcyB0YWtlIGxvbmdlci5cbiAgICBpZiAodGhpcy5yZWFkaW5nQ2FsbHMgPj0gdGhpcy5tYXhQYXJhbGxlbFJlYWRzKSB7XG4gICAgICB0aGlzLndhaXRpbmdSZWFkcy5wdXNoKHsgbG5nLCBucywgZmNOYW1lLCB0cmllZCwgd2FpdCwgY2FsbGJhY2sgfSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMucmVhZGluZ0NhbGxzKys7XG5cbiAgICBjb25zdCByZXNvbHZlciA9IChlcnIsIGRhdGEpID0+IHtcbiAgICAgIHRoaXMucmVhZGluZ0NhbGxzLS07XG4gICAgICBpZiAodGhpcy53YWl0aW5nUmVhZHMubGVuZ3RoID4gMCkge1xuICAgICAgICBjb25zdCBuZXh0ID0gdGhpcy53YWl0aW5nUmVhZHMuc2hpZnQoKTtcbiAgICAgICAgdGhpcy5yZWFkKG5leHQubG5nLCBuZXh0Lm5zLCBuZXh0LmZjTmFtZSwgbmV4dC50cmllZCwgbmV4dC53YWl0LCBuZXh0LmNhbGxiYWNrKTtcbiAgICAgIH1cbiAgICAgIGlmIChlcnIgJiYgZGF0YSAvKiA9IHJldHJ5RmxhZyAqLyAmJiB0cmllZCA8IHRoaXMubWF4UmV0cmllcykge1xuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICB0aGlzLnJlYWQuY2FsbCh0aGlzLCBsbmcsIG5zLCBmY05hbWUsIHRyaWVkICsgMSwgd2FpdCAqIDIsIGNhbGxiYWNrKTtcbiAgICAgICAgfSwgd2FpdCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGNhbGxiYWNrKGVyciwgZGF0YSk7XG4gICAgfTtcblxuICAgIGNvbnN0IGZjID0gdGhpcy5iYWNrZW5kW2ZjTmFtZV0uYmluZCh0aGlzLmJhY2tlbmQpO1xuICAgIGlmIChmYy5sZW5ndGggPT09IDIpIHtcbiAgICAgIC8vIG5vIGNhbGxiYWNrXG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCByID0gZmMobG5nLCBucyk7XG4gICAgICAgIGlmIChyICYmIHR5cGVvZiByLnRoZW4gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAvLyBwcm9taXNlXG4gICAgICAgICAgci50aGVuKChkYXRhKSA9PiByZXNvbHZlcihudWxsLCBkYXRhKSkuY2F0Y2gocmVzb2x2ZXIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIHN5bmNcbiAgICAgICAgICByZXNvbHZlcihudWxsLCByKTtcbiAgICAgICAgfVxuICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgIHJlc29sdmVyKGVycik7XG4gICAgICB9XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gbm9ybWFsIHdpdGggY2FsbGJhY2tcbiAgICByZXR1cm4gZmMobG5nLCBucywgcmVzb2x2ZXIpO1xuICB9XG5cbiAgLyogZXNsaW50IGNvbnNpc3RlbnQtcmV0dXJuOiAwICovXG4gIHByZXBhcmVMb2FkaW5nKGxhbmd1YWdlcywgbmFtZXNwYWNlcywgb3B0aW9ucyA9IHt9LCBjYWxsYmFjaykge1xuICAgIGlmICghdGhpcy5iYWNrZW5kKSB7XG4gICAgICB0aGlzLmxvZ2dlci53YXJuKCdObyBiYWNrZW5kIHdhcyBhZGRlZCB2aWEgaTE4bmV4dC51c2UuIFdpbGwgbm90IGxvYWQgcmVzb3VyY2VzLicpO1xuICAgICAgcmV0dXJuIGNhbGxiYWNrICYmIGNhbGxiYWNrKCk7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBsYW5ndWFnZXMgPT09ICdzdHJpbmcnKSBsYW5ndWFnZXMgPSB0aGlzLmxhbmd1YWdlVXRpbHMudG9SZXNvbHZlSGllcmFyY2h5KGxhbmd1YWdlcyk7XG4gICAgaWYgKHR5cGVvZiBuYW1lc3BhY2VzID09PSAnc3RyaW5nJykgbmFtZXNwYWNlcyA9IFtuYW1lc3BhY2VzXTtcblxuICAgIGNvbnN0IHRvTG9hZCA9IHRoaXMucXVldWVMb2FkKGxhbmd1YWdlcywgbmFtZXNwYWNlcywgb3B0aW9ucywgY2FsbGJhY2spO1xuICAgIGlmICghdG9Mb2FkLnRvTG9hZC5sZW5ndGgpIHtcbiAgICAgIGlmICghdG9Mb2FkLnBlbmRpbmcubGVuZ3RoKSBjYWxsYmFjaygpOyAvLyBub3RoaW5nIHRvIGxvYWQgYW5kIG5vIHBlbmRpbmdzLi4uY2FsbGJhY2sgbm93XG4gICAgICByZXR1cm4gbnVsbDsgLy8gcGVuZGluZ3Mgd2lsbCB0cmlnZ2VyIGNhbGxiYWNrXG4gICAgfVxuXG4gICAgdG9Mb2FkLnRvTG9hZC5mb3JFYWNoKChuYW1lKSA9PiB7XG4gICAgICB0aGlzLmxvYWRPbmUobmFtZSk7XG4gICAgfSk7XG4gIH1cblxuICBsb2FkKGxhbmd1YWdlcywgbmFtZXNwYWNlcywgY2FsbGJhY2spIHtcbiAgICB0aGlzLnByZXBhcmVMb2FkaW5nKGxhbmd1YWdlcywgbmFtZXNwYWNlcywge30sIGNhbGxiYWNrKTtcbiAgfVxuXG4gIHJlbG9hZChsYW5ndWFnZXMsIG5hbWVzcGFjZXMsIGNhbGxiYWNrKSB7XG4gICAgdGhpcy5wcmVwYXJlTG9hZGluZyhsYW5ndWFnZXMsIG5hbWVzcGFjZXMsIHsgcmVsb2FkOiB0cnVlIH0sIGNhbGxiYWNrKTtcbiAgfVxuXG4gIGxvYWRPbmUobmFtZSwgcHJlZml4ID0gJycpIHtcbiAgICBjb25zdCBzID0gbmFtZS5zcGxpdCgnfCcpO1xuICAgIGNvbnN0IGxuZyA9IHNbMF07XG4gICAgY29uc3QgbnMgPSBzWzFdO1xuXG4gICAgdGhpcy5yZWFkKGxuZywgbnMsICdyZWFkJywgdW5kZWZpbmVkLCB1bmRlZmluZWQsIChlcnIsIGRhdGEpID0+IHtcbiAgICAgIGlmIChlcnIpIHRoaXMubG9nZ2VyLndhcm4oYCR7cHJlZml4fWxvYWRpbmcgbmFtZXNwYWNlICR7bnN9IGZvciBsYW5ndWFnZSAke2xuZ30gZmFpbGVkYCwgZXJyKTtcbiAgICAgIGlmICghZXJyICYmIGRhdGEpXG4gICAgICAgIHRoaXMubG9nZ2VyLmxvZyhgJHtwcmVmaXh9bG9hZGVkIG5hbWVzcGFjZSAke25zfSBmb3IgbGFuZ3VhZ2UgJHtsbmd9YCwgZGF0YSk7XG5cbiAgICAgIHRoaXMubG9hZGVkKG5hbWUsIGVyciwgZGF0YSk7XG4gICAgfSk7XG4gIH1cblxuICBzYXZlTWlzc2luZyhsYW5ndWFnZXMsIG5hbWVzcGFjZSwga2V5LCBmYWxsYmFja1ZhbHVlLCBpc1VwZGF0ZSwgb3B0aW9ucyA9IHt9LCBjbGIgPSAoKSA9PiB7fSkge1xuICAgIGlmIChcbiAgICAgIHRoaXMuc2VydmljZXMudXRpbHMgJiZcbiAgICAgIHRoaXMuc2VydmljZXMudXRpbHMuaGFzTG9hZGVkTmFtZXNwYWNlICYmXG4gICAgICAhdGhpcy5zZXJ2aWNlcy51dGlscy5oYXNMb2FkZWROYW1lc3BhY2UobmFtZXNwYWNlKVxuICAgICkge1xuICAgICAgdGhpcy5sb2dnZXIud2FybihcbiAgICAgICAgYGRpZCBub3Qgc2F2ZSBrZXkgXCIke2tleX1cIiBhcyB0aGUgbmFtZXNwYWNlIFwiJHtuYW1lc3BhY2V9XCIgd2FzIG5vdCB5ZXQgbG9hZGVkYCxcbiAgICAgICAgJ1RoaXMgbWVhbnMgc29tZXRoaW5nIElTIFdST05HIGluIHlvdXIgc2V0dXAuIFlvdSBhY2Nlc3MgdGhlIHQgZnVuY3Rpb24gYmVmb3JlIGkxOG5leHQuaW5pdCAvIGkxOG5leHQubG9hZE5hbWVzcGFjZSAvIGkxOG5leHQuY2hhbmdlTGFuZ3VhZ2Ugd2FzIGRvbmUuIFdhaXQgZm9yIHRoZSBjYWxsYmFjayBvciBQcm9taXNlIHRvIHJlc29sdmUgYmVmb3JlIGFjY2Vzc2luZyBpdCEhIScsXG4gICAgICApO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIGlnbm9yZSBub24gdmFsaWQga2V5c1xuICAgIGlmIChrZXkgPT09IHVuZGVmaW5lZCB8fCBrZXkgPT09IG51bGwgfHwga2V5ID09PSAnJykgcmV0dXJuO1xuXG4gICAgaWYgKHRoaXMuYmFja2VuZCAmJiB0aGlzLmJhY2tlbmQuY3JlYXRlKSB7XG4gICAgICBjb25zdCBvcHRzID0ge1xuICAgICAgICAuLi5vcHRpb25zLFxuICAgICAgICBpc1VwZGF0ZSxcbiAgICAgIH07XG4gICAgICBjb25zdCBmYyA9IHRoaXMuYmFja2VuZC5jcmVhdGUuYmluZCh0aGlzLmJhY2tlbmQpO1xuICAgICAgaWYgKGZjLmxlbmd0aCA8IDYpIHtcbiAgICAgICAgLy8gbm8gY2FsbGJhY2tcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBsZXQgcjtcbiAgICAgICAgICBpZiAoZmMubGVuZ3RoID09PSA1KSB7XG4gICAgICAgICAgICAvLyBmdXR1cmUgY2FsbGJhY2stbGVzcyBhcGkgZm9yIGkxOG5leHQtbG9jaXplLWJhY2tlbmRcbiAgICAgICAgICAgIHIgPSBmYyhsYW5ndWFnZXMsIG5hbWVzcGFjZSwga2V5LCBmYWxsYmFja1ZhbHVlLCBvcHRzKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgciA9IGZjKGxhbmd1YWdlcywgbmFtZXNwYWNlLCBrZXksIGZhbGxiYWNrVmFsdWUpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAociAmJiB0eXBlb2Ygci50aGVuID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAvLyBwcm9taXNlXG4gICAgICAgICAgICByLnRoZW4oKGRhdGEpID0+IGNsYihudWxsLCBkYXRhKSkuY2F0Y2goY2xiKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gc3luY1xuICAgICAgICAgICAgY2xiKG51bGwsIHIpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgY2xiKGVycik7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIG5vcm1hbCB3aXRoIGNhbGxiYWNrXG4gICAgICAgIGZjKGxhbmd1YWdlcywgbmFtZXNwYWNlLCBrZXksIGZhbGxiYWNrVmFsdWUsIGNsYiAvKiB1bnVzZWQgY2FsbGJhY2sgKi8sIG9wdHMpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIHdyaXRlIHRvIHN0b3JlIHRvIGF2b2lkIHJlc2VuZGluZ1xuICAgIGlmICghbGFuZ3VhZ2VzIHx8ICFsYW5ndWFnZXNbMF0pIHJldHVybjtcbiAgICB0aGlzLnN0b3JlLmFkZFJlc291cmNlKGxhbmd1YWdlc1swXSwgbmFtZXNwYWNlLCBrZXksIGZhbGxiYWNrVmFsdWUpO1xuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IENvbm5lY3RvcjtcbiIsImV4cG9ydCBmdW5jdGlvbiBnZXQoKSB7XG4gIHJldHVybiB7XG4gICAgZGVidWc6IGZhbHNlLFxuICAgIGluaXRJbW1lZGlhdGU6IHRydWUsXG5cbiAgICBuczogWyd0cmFuc2xhdGlvbiddLFxuICAgIGRlZmF1bHROUzogWyd0cmFuc2xhdGlvbiddLFxuICAgIGZhbGxiYWNrTG5nOiBbJ2RldiddLFxuICAgIGZhbGxiYWNrTlM6IGZhbHNlLCAvLyBzdHJpbmcgb3IgYXJyYXkgb2YgbmFtZXNwYWNlc1xuXG4gICAgc3VwcG9ydGVkTG5nczogZmFsc2UsIC8vIGFycmF5IHdpdGggc3VwcG9ydGVkIGxhbmd1YWdlc1xuICAgIG5vbkV4cGxpY2l0U3VwcG9ydGVkTG5nczogZmFsc2UsXG4gICAgbG9hZDogJ2FsbCcsIC8vIHwgY3VycmVudE9ubHkgfCBsYW5ndWFnZU9ubHlcbiAgICBwcmVsb2FkOiBmYWxzZSwgLy8gYXJyYXkgd2l0aCBwcmVsb2FkIGxhbmd1YWdlc1xuXG4gICAgc2ltcGxpZnlQbHVyYWxTdWZmaXg6IHRydWUsXG4gICAga2V5U2VwYXJhdG9yOiAnLicsXG4gICAgbnNTZXBhcmF0b3I6ICc6JyxcbiAgICBwbHVyYWxTZXBhcmF0b3I6ICdfJyxcbiAgICBjb250ZXh0U2VwYXJhdG9yOiAnXycsXG5cbiAgICBwYXJ0aWFsQnVuZGxlZExhbmd1YWdlczogZmFsc2UsIC8vIGFsbG93IGJ1bmRsaW5nIGNlcnRhaW4gbGFuZ3VhZ2VzIHRoYXQgYXJlIG5vdCByZW1vdGVseSBmZXRjaGVkXG4gICAgc2F2ZU1pc3Npbmc6IGZhbHNlLCAvLyBlbmFibGUgdG8gc2VuZCBtaXNzaW5nIHZhbHVlc1xuICAgIHVwZGF0ZU1pc3Npbmc6IGZhbHNlLCAvLyBlbmFibGUgdG8gdXBkYXRlIGRlZmF1bHQgdmFsdWVzIGlmIGRpZmZlcmVudCBmcm9tIHRyYW5zbGF0ZWQgdmFsdWUgKG9ubHkgdXNlZnVsIG9uIGluaXRpYWwgZGV2ZWxvcG1lbnQsIG9yIHdoZW4ga2VlcGluZyBjb2RlIGFzIHNvdXJjZSBvZiB0cnV0aClcbiAgICBzYXZlTWlzc2luZ1RvOiAnZmFsbGJhY2snLCAvLyAnY3VycmVudCcgfHwgJ2FsbCdcbiAgICBzYXZlTWlzc2luZ1BsdXJhbHM6IHRydWUsIC8vIHdpbGwgc2F2ZSBhbGwgZm9ybXMgbm90IG9ubHkgc2luZ3VsYXIga2V5XG4gICAgbWlzc2luZ0tleUhhbmRsZXI6IGZhbHNlLCAvLyBmdW5jdGlvbihsbmcsIG5zLCBrZXksIGZhbGxiYWNrVmFsdWUpIC0+IG92ZXJyaWRlIGlmIHByZWZlciBvbiBoYW5kbGluZ1xuICAgIG1pc3NpbmdJbnRlcnBvbGF0aW9uSGFuZGxlcjogZmFsc2UsIC8vIGZ1bmN0aW9uKHN0ciwgbWF0Y2gpXG5cbiAgICBwb3N0UHJvY2VzczogZmFsc2UsIC8vIHN0cmluZyBvciBhcnJheSBvZiBwb3N0UHJvY2Vzc29yIG5hbWVzXG4gICAgcG9zdFByb2Nlc3NQYXNzUmVzb2x2ZWQ6IGZhbHNlLCAvLyBwYXNzIHJlc29sdmVkIG9iamVjdCBpbnRvICdvcHRpb25zLmkxOG5SZXNvbHZlZCcgZm9yIHBvc3Rwcm9jZXNzb3JcbiAgICByZXR1cm5OdWxsOiBmYWxzZSwgLy8gYWxsb3dzIG51bGwgdmFsdWUgYXMgdmFsaWQgdHJhbnNsYXRpb25cbiAgICByZXR1cm5FbXB0eVN0cmluZzogdHJ1ZSwgLy8gYWxsb3dzIGVtcHR5IHN0cmluZyB2YWx1ZSBhcyB2YWxpZCB0cmFuc2xhdGlvblxuICAgIHJldHVybk9iamVjdHM6IGZhbHNlLFxuICAgIGpvaW5BcnJheXM6IGZhbHNlLCAvLyBvciBzdHJpbmcgdG8gam9pbiBhcnJheVxuICAgIHJldHVybmVkT2JqZWN0SGFuZGxlcjogZmFsc2UsIC8vIGZ1bmN0aW9uKGtleSwgdmFsdWUsIG9wdGlvbnMpIHRyaWdnZXJlZCBpZiBrZXkgcmV0dXJucyBvYmplY3QgYnV0IHJldHVybk9iamVjdHMgaXMgc2V0IHRvIGZhbHNlXG4gICAgcGFyc2VNaXNzaW5nS2V5SGFuZGxlcjogZmFsc2UsIC8vIGZ1bmN0aW9uKGtleSkgcGFyc2VkIGEga2V5IHRoYXQgd2FzIG5vdCBmb3VuZCBpbiB0KCkgYmVmb3JlIHJldHVybmluZ1xuICAgIGFwcGVuZE5hbWVzcGFjZVRvTWlzc2luZ0tleTogZmFsc2UsXG4gICAgYXBwZW5kTmFtZXNwYWNlVG9DSU1vZGU6IGZhbHNlLFxuICAgIG92ZXJsb2FkVHJhbnNsYXRpb25PcHRpb25IYW5kbGVyOiBmdW5jdGlvbiBoYW5kbGUoYXJncykge1xuICAgICAgbGV0IHJldCA9IHt9O1xuICAgICAgaWYgKHR5cGVvZiBhcmdzWzFdID09PSAnb2JqZWN0JykgcmV0ID0gYXJnc1sxXTtcbiAgICAgIGlmICh0eXBlb2YgYXJnc1sxXSA9PT0gJ3N0cmluZycpIHJldC5kZWZhdWx0VmFsdWUgPSBhcmdzWzFdO1xuICAgICAgaWYgKHR5cGVvZiBhcmdzWzJdID09PSAnc3RyaW5nJykgcmV0LnREZXNjcmlwdGlvbiA9IGFyZ3NbMl07XG4gICAgICBpZiAodHlwZW9mIGFyZ3NbMl0gPT09ICdvYmplY3QnIHx8IHR5cGVvZiBhcmdzWzNdID09PSAnb2JqZWN0Jykge1xuICAgICAgICBjb25zdCBvcHRpb25zID0gYXJnc1szXSB8fCBhcmdzWzJdO1xuICAgICAgICBPYmplY3Qua2V5cyhvcHRpb25zKS5mb3JFYWNoKChrZXkpID0+IHtcbiAgICAgICAgICByZXRba2V5XSA9IG9wdGlvbnNba2V5XTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmV0O1xuICAgIH0sXG4gICAgaW50ZXJwb2xhdGlvbjoge1xuICAgICAgZXNjYXBlVmFsdWU6IHRydWUsXG4gICAgICBmb3JtYXQ6ICh2YWx1ZSwgZm9ybWF0LCBsbmcsIG9wdGlvbnMpID0+IHZhbHVlLFxuICAgICAgcHJlZml4OiAne3snLFxuICAgICAgc3VmZml4OiAnfX0nLFxuICAgICAgZm9ybWF0U2VwYXJhdG9yOiAnLCcsXG4gICAgICAvLyBwcmVmaXhFc2NhcGVkOiAne3snLFxuICAgICAgLy8gc3VmZml4RXNjYXBlZDogJ319JyxcbiAgICAgIC8vIHVuZXNjYXBlU3VmZml4OiAnJyxcbiAgICAgIHVuZXNjYXBlUHJlZml4OiAnLScsXG5cbiAgICAgIG5lc3RpbmdQcmVmaXg6ICckdCgnLFxuICAgICAgbmVzdGluZ1N1ZmZpeDogJyknLFxuICAgICAgbmVzdGluZ09wdGlvbnNTZXBhcmF0b3I6ICcsJyxcbiAgICAgIC8vIG5lc3RpbmdQcmVmaXhFc2NhcGVkOiAnJHQoJyxcbiAgICAgIC8vIG5lc3RpbmdTdWZmaXhFc2NhcGVkOiAnKScsXG4gICAgICAvLyBkZWZhdWx0VmFyaWFibGVzOiB1bmRlZmluZWQgLy8gb2JqZWN0IHRoYXQgY2FuIGhhdmUgdmFsdWVzIHRvIGludGVycG9sYXRlIG9uIC0gZXh0ZW5kcyBwYXNzZWQgaW4gaW50ZXJwb2xhdGlvbiBkYXRhXG4gICAgICBtYXhSZXBsYWNlczogMTAwMCwgLy8gbWF4IHJlcGxhY2VzIHRvIHByZXZlbnQgZW5kbGVzcyBsb29wXG4gICAgICBza2lwT25WYXJpYWJsZXM6IHRydWUsXG4gICAgfSxcbiAgfTtcbn1cblxuLyogZXNsaW50IG5vLXBhcmFtLXJlYXNzaWduOiAwICovXG5leHBvcnQgZnVuY3Rpb24gdHJhbnNmb3JtT3B0aW9ucyhvcHRpb25zKSB7XG4gIC8vIGNyZWF0ZSBuYW1lc3BhY2Ugb2JqZWN0IGlmIG5hbWVzcGFjZSBpcyBwYXNzZWQgaW4gYXMgc3RyaW5nXG4gIGlmICh0eXBlb2Ygb3B0aW9ucy5ucyA9PT0gJ3N0cmluZycpIG9wdGlvbnMubnMgPSBbb3B0aW9ucy5uc107XG4gIGlmICh0eXBlb2Ygb3B0aW9ucy5mYWxsYmFja0xuZyA9PT0gJ3N0cmluZycpIG9wdGlvbnMuZmFsbGJhY2tMbmcgPSBbb3B0aW9ucy5mYWxsYmFja0xuZ107XG4gIGlmICh0eXBlb2Ygb3B0aW9ucy5mYWxsYmFja05TID09PSAnc3RyaW5nJykgb3B0aW9ucy5mYWxsYmFja05TID0gW29wdGlvbnMuZmFsbGJhY2tOU107XG5cbiAgLy8gZXh0ZW5kIHN1cHBvcnRlZExuZ3Mgd2l0aCBjaW1vZGVcbiAgaWYgKG9wdGlvbnMuc3VwcG9ydGVkTG5ncyAmJiBvcHRpb25zLnN1cHBvcnRlZExuZ3MuaW5kZXhPZignY2ltb2RlJykgPCAwKSB7XG4gICAgb3B0aW9ucy5zdXBwb3J0ZWRMbmdzID0gb3B0aW9ucy5zdXBwb3J0ZWRMbmdzLmNvbmNhdChbJ2NpbW9kZSddKTtcbiAgfVxuXG4gIHJldHVybiBvcHRpb25zO1xufVxuIiwiaW1wb3J0IGJhc2VMb2dnZXIgZnJvbSAnLi9sb2dnZXIuanMnO1xuaW1wb3J0IEV2ZW50RW1pdHRlciBmcm9tICcuL0V2ZW50RW1pdHRlci5qcyc7XG5pbXBvcnQgUmVzb3VyY2VTdG9yZSBmcm9tICcuL1Jlc291cmNlU3RvcmUuanMnO1xuaW1wb3J0IFRyYW5zbGF0b3IgZnJvbSAnLi9UcmFuc2xhdG9yLmpzJztcbmltcG9ydCBMYW5ndWFnZVV0aWxzIGZyb20gJy4vTGFuZ3VhZ2VVdGlscy5qcyc7XG5pbXBvcnQgUGx1cmFsUmVzb2x2ZXIgZnJvbSAnLi9QbHVyYWxSZXNvbHZlci5qcyc7XG5pbXBvcnQgSW50ZXJwb2xhdG9yIGZyb20gJy4vSW50ZXJwb2xhdG9yLmpzJztcbmltcG9ydCBGb3JtYXR0ZXIgZnJvbSAnLi9Gb3JtYXR0ZXIuanMnO1xuaW1wb3J0IEJhY2tlbmRDb25uZWN0b3IgZnJvbSAnLi9CYWNrZW5kQ29ubmVjdG9yLmpzJztcbmltcG9ydCB7IGdldCBhcyBnZXREZWZhdWx0cywgdHJhbnNmb3JtT3B0aW9ucyB9IGZyb20gJy4vZGVmYXVsdHMuanMnO1xuaW1wb3J0IHBvc3RQcm9jZXNzb3IgZnJvbSAnLi9wb3N0UHJvY2Vzc29yLmpzJztcbmltcG9ydCB7IGRlZmVyIH0gZnJvbSAnLi91dGlscy5qcyc7XG5cbmZ1bmN0aW9uIG5vb3AoKSB7IH1cblxuLy8gQmluZHMgdGhlIG1lbWJlciBmdW5jdGlvbnMgb2YgdGhlIGdpdmVuIGNsYXNzIGluc3RhbmNlIHNvIHRoYXQgdGhleSBjYW4gYmVcbi8vIGRlc3RydWN0dXJlZCBvciB1c2VkIGFzIGNhbGxiYWNrcy5cbmZ1bmN0aW9uIGJpbmRNZW1iZXJGdW5jdGlvbnMoaW5zdCkge1xuICBjb25zdCBtZW1zID0gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMoT2JqZWN0LmdldFByb3RvdHlwZU9mKGluc3QpKVxuICBtZW1zLmZvckVhY2goKG1lbSkgPT4ge1xuICAgIGlmICh0eXBlb2YgaW5zdFttZW1dID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBpbnN0W21lbV0gPSBpbnN0W21lbV0uYmluZChpbnN0KVxuICAgIH1cbiAgfSlcbn1cblxuY2xhc3MgSTE4biBleHRlbmRzIEV2ZW50RW1pdHRlciB7XG4gIGNvbnN0cnVjdG9yKG9wdGlvbnMgPSB7fSwgY2FsbGJhY2spIHtcbiAgICBzdXBlcigpO1xuXG4gICAgdGhpcy5vcHRpb25zID0gdHJhbnNmb3JtT3B0aW9ucyhvcHRpb25zKTtcbiAgICB0aGlzLnNlcnZpY2VzID0ge307XG4gICAgdGhpcy5sb2dnZXIgPSBiYXNlTG9nZ2VyO1xuICAgIHRoaXMubW9kdWxlcyA9IHsgZXh0ZXJuYWw6IFtdIH07XG5cbiAgICBiaW5kTWVtYmVyRnVuY3Rpb25zKHRoaXMpO1xuXG4gICAgaWYgKGNhbGxiYWNrICYmICF0aGlzLmlzSW5pdGlhbGl6ZWQgJiYgIW9wdGlvbnMuaXNDbG9uZSkge1xuICAgICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL2kxOG5leHQvaTE4bmV4dC9pc3N1ZXMvODc5XG4gICAgICBpZiAoIXRoaXMub3B0aW9ucy5pbml0SW1tZWRpYXRlKSB7XG4gICAgICAgIHRoaXMuaW5pdChvcHRpb25zLCBjYWxsYmFjayk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgfVxuICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgIHRoaXMuaW5pdChvcHRpb25zLCBjYWxsYmFjayk7XG4gICAgICB9LCAwKTtcbiAgICB9XG4gIH1cblxuICBpbml0KG9wdGlvbnMgPSB7fSwgY2FsbGJhY2spIHtcbiAgICBpZiAodHlwZW9mIG9wdGlvbnMgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIGNhbGxiYWNrID0gb3B0aW9ucztcbiAgICAgIG9wdGlvbnMgPSB7fTtcbiAgICB9XG5cbiAgICBpZiAoIW9wdGlvbnMuZGVmYXVsdE5TICYmIG9wdGlvbnMuZGVmYXVsdE5TICE9PSBmYWxzZSAmJiBvcHRpb25zLm5zKSB7XG4gICAgICBpZiAodHlwZW9mIG9wdGlvbnMubnMgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIG9wdGlvbnMuZGVmYXVsdE5TID0gb3B0aW9ucy5ucztcbiAgICAgIH0gZWxzZSBpZiAob3B0aW9ucy5ucy5pbmRleE9mKCd0cmFuc2xhdGlvbicpIDwgMCkge1xuICAgICAgICBvcHRpb25zLmRlZmF1bHROUyA9IG9wdGlvbnMubnNbMF07XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgZGVmT3B0cyA9IGdldERlZmF1bHRzKCk7XG4gICAgdGhpcy5vcHRpb25zID0geyAuLi5kZWZPcHRzLCAuLi50aGlzLm9wdGlvbnMsIC4uLnRyYW5zZm9ybU9wdGlvbnMob3B0aW9ucykgfTtcbiAgICBpZiAodGhpcy5vcHRpb25zLmNvbXBhdGliaWxpdHlBUEkgIT09ICd2MScpIHtcbiAgICAgIHRoaXMub3B0aW9ucy5pbnRlcnBvbGF0aW9uID0geyAuLi5kZWZPcHRzLmludGVycG9sYXRpb24sIC4uLnRoaXMub3B0aW9ucy5pbnRlcnBvbGF0aW9uIH07IC8vIGRvIG5vdCB1c2UgcmVmZXJlbmNlXG4gICAgfVxuICAgIGlmIChvcHRpb25zLmtleVNlcGFyYXRvciAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzLm9wdGlvbnMudXNlckRlZmluZWRLZXlTZXBhcmF0b3IgPSBvcHRpb25zLmtleVNlcGFyYXRvcjtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMubnNTZXBhcmF0b3IgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5vcHRpb25zLnVzZXJEZWZpbmVkTnNTZXBhcmF0b3IgPSBvcHRpb25zLm5zU2VwYXJhdG9yO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNyZWF0ZUNsYXNzT25EZW1hbmQoQ2xhc3NPck9iamVjdCkge1xuICAgICAgaWYgKCFDbGFzc09yT2JqZWN0KSByZXR1cm4gbnVsbDtcbiAgICAgIGlmICh0eXBlb2YgQ2xhc3NPck9iamVjdCA9PT0gJ2Z1bmN0aW9uJykgcmV0dXJuIG5ldyBDbGFzc09yT2JqZWN0KCk7XG4gICAgICByZXR1cm4gQ2xhc3NPck9iamVjdDtcbiAgICB9XG5cbiAgICAvLyBpbml0IHNlcnZpY2VzXG4gICAgaWYgKCF0aGlzLm9wdGlvbnMuaXNDbG9uZSkge1xuICAgICAgaWYgKHRoaXMubW9kdWxlcy5sb2dnZXIpIHtcbiAgICAgICAgYmFzZUxvZ2dlci5pbml0KGNyZWF0ZUNsYXNzT25EZW1hbmQodGhpcy5tb2R1bGVzLmxvZ2dlciksIHRoaXMub3B0aW9ucyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBiYXNlTG9nZ2VyLmluaXQobnVsbCwgdGhpcy5vcHRpb25zKTtcbiAgICAgIH1cblxuICAgICAgbGV0IGZvcm1hdHRlcjtcbiAgICAgIGlmICh0aGlzLm1vZHVsZXMuZm9ybWF0dGVyKSB7XG4gICAgICAgIGZvcm1hdHRlciA9IHRoaXMubW9kdWxlcy5mb3JtYXR0ZXI7XG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiBJbnRsICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICBmb3JtYXR0ZXIgPSBGb3JtYXR0ZXI7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGx1ID0gbmV3IExhbmd1YWdlVXRpbHModGhpcy5vcHRpb25zKTtcbiAgICAgIHRoaXMuc3RvcmUgPSBuZXcgUmVzb3VyY2VTdG9yZSh0aGlzLm9wdGlvbnMucmVzb3VyY2VzLCB0aGlzLm9wdGlvbnMpO1xuXG4gICAgICBjb25zdCBzID0gdGhpcy5zZXJ2aWNlcztcbiAgICAgIHMubG9nZ2VyID0gYmFzZUxvZ2dlcjtcbiAgICAgIHMucmVzb3VyY2VTdG9yZSA9IHRoaXMuc3RvcmU7XG4gICAgICBzLmxhbmd1YWdlVXRpbHMgPSBsdTtcbiAgICAgIHMucGx1cmFsUmVzb2x2ZXIgPSBuZXcgUGx1cmFsUmVzb2x2ZXIobHUsIHtcbiAgICAgICAgcHJlcGVuZDogdGhpcy5vcHRpb25zLnBsdXJhbFNlcGFyYXRvcixcbiAgICAgICAgY29tcGF0aWJpbGl0eUpTT046IHRoaXMub3B0aW9ucy5jb21wYXRpYmlsaXR5SlNPTixcbiAgICAgICAgc2ltcGxpZnlQbHVyYWxTdWZmaXg6IHRoaXMub3B0aW9ucy5zaW1wbGlmeVBsdXJhbFN1ZmZpeCxcbiAgICAgIH0pO1xuXG4gICAgICBpZiAoZm9ybWF0dGVyICYmICghdGhpcy5vcHRpb25zLmludGVycG9sYXRpb24uZm9ybWF0IHx8IHRoaXMub3B0aW9ucy5pbnRlcnBvbGF0aW9uLmZvcm1hdCA9PT0gZGVmT3B0cy5pbnRlcnBvbGF0aW9uLmZvcm1hdCkpIHtcbiAgICAgICAgcy5mb3JtYXR0ZXIgPSBjcmVhdGVDbGFzc09uRGVtYW5kKGZvcm1hdHRlcik7XG4gICAgICAgIHMuZm9ybWF0dGVyLmluaXQocywgdGhpcy5vcHRpb25zKTtcblxuICAgICAgICB0aGlzLm9wdGlvbnMuaW50ZXJwb2xhdGlvbi5mb3JtYXQgPSBzLmZvcm1hdHRlci5mb3JtYXQuYmluZChzLmZvcm1hdHRlcik7XG4gICAgICB9XG5cbiAgICAgIHMuaW50ZXJwb2xhdG9yID0gbmV3IEludGVycG9sYXRvcih0aGlzLm9wdGlvbnMpO1xuICAgICAgcy51dGlscyA9IHtcbiAgICAgICAgaGFzTG9hZGVkTmFtZXNwYWNlOiB0aGlzLmhhc0xvYWRlZE5hbWVzcGFjZS5iaW5kKHRoaXMpXG4gICAgICB9XG5cbiAgICAgIHMuYmFja2VuZENvbm5lY3RvciA9IG5ldyBCYWNrZW5kQ29ubmVjdG9yKFxuICAgICAgICBjcmVhdGVDbGFzc09uRGVtYW5kKHRoaXMubW9kdWxlcy5iYWNrZW5kKSxcbiAgICAgICAgcy5yZXNvdXJjZVN0b3JlLFxuICAgICAgICBzLFxuICAgICAgICB0aGlzLm9wdGlvbnMsXG4gICAgICApO1xuICAgICAgLy8gcGlwZSBldmVudHMgZnJvbSBiYWNrZW5kQ29ubmVjdG9yXG4gICAgICBzLmJhY2tlbmRDb25uZWN0b3Iub24oJyonLCAoZXZlbnQsIC4uLmFyZ3MpID0+IHtcbiAgICAgICAgdGhpcy5lbWl0KGV2ZW50LCAuLi5hcmdzKTtcbiAgICAgIH0pO1xuXG4gICAgICBpZiAodGhpcy5tb2R1bGVzLmxhbmd1YWdlRGV0ZWN0b3IpIHtcbiAgICAgICAgcy5sYW5ndWFnZURldGVjdG9yID0gY3JlYXRlQ2xhc3NPbkRlbWFuZCh0aGlzLm1vZHVsZXMubGFuZ3VhZ2VEZXRlY3Rvcik7XG4gICAgICAgIGlmIChzLmxhbmd1YWdlRGV0ZWN0b3IuaW5pdCkgcy5sYW5ndWFnZURldGVjdG9yLmluaXQocywgdGhpcy5vcHRpb25zLmRldGVjdGlvbiwgdGhpcy5vcHRpb25zKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMubW9kdWxlcy5pMThuRm9ybWF0KSB7XG4gICAgICAgIHMuaTE4bkZvcm1hdCA9IGNyZWF0ZUNsYXNzT25EZW1hbmQodGhpcy5tb2R1bGVzLmkxOG5Gb3JtYXQpO1xuICAgICAgICBpZiAocy5pMThuRm9ybWF0LmluaXQpIHMuaTE4bkZvcm1hdC5pbml0KHRoaXMpO1xuICAgICAgfVxuXG4gICAgICB0aGlzLnRyYW5zbGF0b3IgPSBuZXcgVHJhbnNsYXRvcih0aGlzLnNlcnZpY2VzLCB0aGlzLm9wdGlvbnMpO1xuICAgICAgLy8gcGlwZSBldmVudHMgZnJvbSB0cmFuc2xhdG9yXG4gICAgICB0aGlzLnRyYW5zbGF0b3Iub24oJyonLCAoZXZlbnQsIC4uLmFyZ3MpID0+IHtcbiAgICAgICAgdGhpcy5lbWl0KGV2ZW50LCAuLi5hcmdzKTtcbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLm1vZHVsZXMuZXh0ZXJuYWwuZm9yRWFjaChtID0+IHtcbiAgICAgICAgaWYgKG0uaW5pdCkgbS5pbml0KHRoaXMpO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgdGhpcy5mb3JtYXQgPSB0aGlzLm9wdGlvbnMuaW50ZXJwb2xhdGlvbi5mb3JtYXQ7XG4gICAgaWYgKCFjYWxsYmFjaykgY2FsbGJhY2sgPSBub29wO1xuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5mYWxsYmFja0xuZyAmJiAhdGhpcy5zZXJ2aWNlcy5sYW5ndWFnZURldGVjdG9yICYmICF0aGlzLm9wdGlvbnMubG5nKSB7XG4gICAgICBjb25zdCBjb2RlcyA9IHRoaXMuc2VydmljZXMubGFuZ3VhZ2VVdGlscy5nZXRGYWxsYmFja0NvZGVzKHRoaXMub3B0aW9ucy5mYWxsYmFja0xuZylcbiAgICAgIGlmIChjb2Rlcy5sZW5ndGggPiAwICYmIGNvZGVzWzBdICE9PSAnZGV2JykgdGhpcy5vcHRpb25zLmxuZyA9IGNvZGVzWzBdXG4gICAgfVxuICAgIGlmICghdGhpcy5zZXJ2aWNlcy5sYW5ndWFnZURldGVjdG9yICYmICF0aGlzLm9wdGlvbnMubG5nKSB7XG4gICAgICB0aGlzLmxvZ2dlci53YXJuKCdpbml0OiBubyBsYW5ndWFnZURldGVjdG9yIGlzIHVzZWQgYW5kIG5vIGxuZyBpcyBkZWZpbmVkJyk7XG4gICAgfVxuXG4gICAgLy8gYXBwZW5kIGFwaVxuICAgIGNvbnN0IHN0b3JlQXBpID0gW1xuICAgICAgJ2dldFJlc291cmNlJyxcbiAgICAgICdoYXNSZXNvdXJjZUJ1bmRsZScsXG4gICAgICAnZ2V0UmVzb3VyY2VCdW5kbGUnLFxuICAgICAgJ2dldERhdGFCeUxhbmd1YWdlJyxcbiAgICBdO1xuICAgIHN0b3JlQXBpLmZvckVhY2goZmNOYW1lID0+IHtcbiAgICAgIHRoaXNbZmNOYW1lXSA9ICguLi5hcmdzKSA9PiB0aGlzLnN0b3JlW2ZjTmFtZV0oLi4uYXJncyk7XG4gICAgfSk7XG4gICAgY29uc3Qgc3RvcmVBcGlDaGFpbmVkID0gW1xuICAgICAgJ2FkZFJlc291cmNlJyxcbiAgICAgICdhZGRSZXNvdXJjZXMnLFxuICAgICAgJ2FkZFJlc291cmNlQnVuZGxlJyxcbiAgICAgICdyZW1vdmVSZXNvdXJjZUJ1bmRsZScsXG4gICAgXTtcbiAgICBzdG9yZUFwaUNoYWluZWQuZm9yRWFjaChmY05hbWUgPT4ge1xuICAgICAgdGhpc1tmY05hbWVdID0gKC4uLmFyZ3MpID0+IHtcbiAgICAgICAgdGhpcy5zdG9yZVtmY05hbWVdKC4uLmFyZ3MpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgIH07XG4gICAgfSk7XG5cbiAgICBjb25zdCBkZWZlcnJlZCA9IGRlZmVyKCk7XG5cbiAgICBjb25zdCBsb2FkID0gKCkgPT4ge1xuICAgICAgY29uc3QgZmluaXNoID0gKGVyciwgdCkgPT4ge1xuICAgICAgICBpZiAodGhpcy5pc0luaXRpYWxpemVkICYmICF0aGlzLmluaXRpYWxpemVkU3RvcmVPbmNlKSB0aGlzLmxvZ2dlci53YXJuKCdpbml0OiBpMThuZXh0IGlzIGFscmVhZHkgaW5pdGlhbGl6ZWQuIFlvdSBzaG91bGQgY2FsbCBpbml0IGp1c3Qgb25jZSEnKTtcbiAgICAgICAgdGhpcy5pc0luaXRpYWxpemVkID0gdHJ1ZTtcbiAgICAgICAgaWYgKCF0aGlzLm9wdGlvbnMuaXNDbG9uZSkgdGhpcy5sb2dnZXIubG9nKCdpbml0aWFsaXplZCcsIHRoaXMub3B0aW9ucyk7XG4gICAgICAgIHRoaXMuZW1pdCgnaW5pdGlhbGl6ZWQnLCB0aGlzLm9wdGlvbnMpO1xuXG4gICAgICAgIGRlZmVycmVkLnJlc29sdmUodCk7IC8vIG5vdCByZWplY3Rpbmcgb24gZXJyIChhcyBlcnIgaXMgb25seSBhIGxvYWRpbmcgdHJhbnNsYXRpb24gZmFpbGVkIHdhcm5pbmcpXG4gICAgICAgIGNhbGxiYWNrKGVyciwgdCk7XG4gICAgICB9O1xuICAgICAgLy8gZml4IGZvciB1c2UgY2FzZXMgd2hlbiBjYWxsaW5nIGNoYW5nZUxhbmd1YWdlIGJlZm9yZSBmaW5pc2hlZCB0byBpbml0aWFsaXplZCAoaS5lLiBodHRwczovL2dpdGh1Yi5jb20vaTE4bmV4dC9pMThuZXh0L2lzc3Vlcy8xNTUyKVxuICAgICAgaWYgKHRoaXMubGFuZ3VhZ2VzICYmIHRoaXMub3B0aW9ucy5jb21wYXRpYmlsaXR5QVBJICE9PSAndjEnICYmICF0aGlzLmlzSW5pdGlhbGl6ZWQpIHJldHVybiBmaW5pc2gobnVsbCwgdGhpcy50LmJpbmQodGhpcykpO1xuICAgICAgdGhpcy5jaGFuZ2VMYW5ndWFnZSh0aGlzLm9wdGlvbnMubG5nLCBmaW5pc2gpO1xuICAgIH07XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLnJlc291cmNlcyB8fCAhdGhpcy5vcHRpb25zLmluaXRJbW1lZGlhdGUpIHtcbiAgICAgIGxvYWQoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgc2V0VGltZW91dChsb2FkLCAwKTtcbiAgICB9XG5cbiAgICByZXR1cm4gZGVmZXJyZWQ7XG4gIH1cblxuICAvKiBlc2xpbnQgY29uc2lzdGVudC1yZXR1cm46IDAgKi9cbiAgbG9hZFJlc291cmNlcyhsYW5ndWFnZSwgY2FsbGJhY2sgPSBub29wKSB7XG4gICAgbGV0IHVzZWRDYWxsYmFjayA9IGNhbGxiYWNrO1xuICAgIGNvbnN0IHVzZWRMbmcgPSB0eXBlb2YgbGFuZ3VhZ2UgPT09ICdzdHJpbmcnID8gbGFuZ3VhZ2UgOiB0aGlzLmxhbmd1YWdlO1xuICAgIGlmICh0eXBlb2YgbGFuZ3VhZ2UgPT09ICdmdW5jdGlvbicpIHVzZWRDYWxsYmFjayA9IGxhbmd1YWdlO1xuXG4gICAgaWYgKCF0aGlzLm9wdGlvbnMucmVzb3VyY2VzIHx8IHRoaXMub3B0aW9ucy5wYXJ0aWFsQnVuZGxlZExhbmd1YWdlcykge1xuICAgICAgaWYgKHVzZWRMbmcgJiYgdXNlZExuZy50b0xvd2VyQ2FzZSgpID09PSAnY2ltb2RlJykgcmV0dXJuIHVzZWRDYWxsYmFjaygpOyAvLyBhdm9pZCBsb2FkaW5nIHJlc291cmNlcyBmb3IgY2ltb2RlXG5cbiAgICAgIGNvbnN0IHRvTG9hZCA9IFtdO1xuXG4gICAgICBjb25zdCBhcHBlbmQgPSBsbmcgPT4ge1xuICAgICAgICBpZiAoIWxuZykgcmV0dXJuO1xuICAgICAgICBjb25zdCBsbmdzID0gdGhpcy5zZXJ2aWNlcy5sYW5ndWFnZVV0aWxzLnRvUmVzb2x2ZUhpZXJhcmNoeShsbmcpO1xuICAgICAgICBsbmdzLmZvckVhY2gobCA9PiB7XG4gICAgICAgICAgaWYgKHRvTG9hZC5pbmRleE9mKGwpIDwgMCkgdG9Mb2FkLnB1c2gobCk7XG4gICAgICAgIH0pO1xuICAgICAgfTtcblxuICAgICAgaWYgKCF1c2VkTG5nKSB7XG4gICAgICAgIC8vIGF0IGxlYXN0IGxvYWQgZmFsbGJhY2tzIGluIHRoaXMgY2FzZVxuICAgICAgICBjb25zdCBmYWxsYmFja3MgPSB0aGlzLnNlcnZpY2VzLmxhbmd1YWdlVXRpbHMuZ2V0RmFsbGJhY2tDb2Rlcyh0aGlzLm9wdGlvbnMuZmFsbGJhY2tMbmcpO1xuICAgICAgICBmYWxsYmFja3MuZm9yRWFjaChsID0+IGFwcGVuZChsKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBhcHBlbmQodXNlZExuZyk7XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLm9wdGlvbnMucHJlbG9hZCkge1xuICAgICAgICB0aGlzLm9wdGlvbnMucHJlbG9hZC5mb3JFYWNoKGwgPT4gYXBwZW5kKGwpKTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5zZXJ2aWNlcy5iYWNrZW5kQ29ubmVjdG9yLmxvYWQodG9Mb2FkLCB0aGlzLm9wdGlvbnMubnMsIChlKSA9PiB7XG4gICAgICAgIGlmICghZSAmJiAhdGhpcy5yZXNvbHZlZExhbmd1YWdlICYmIHRoaXMubGFuZ3VhZ2UpIHRoaXMuc2V0UmVzb2x2ZWRMYW5ndWFnZSh0aGlzLmxhbmd1YWdlKTtcbiAgICAgICAgdXNlZENhbGxiYWNrKGUpO1xuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHVzZWRDYWxsYmFjayhudWxsKTtcbiAgICB9XG4gIH1cblxuICByZWxvYWRSZXNvdXJjZXMobG5ncywgbnMsIGNhbGxiYWNrKSB7XG4gICAgY29uc3QgZGVmZXJyZWQgPSBkZWZlcigpO1xuICAgIGlmICghbG5ncykgbG5ncyA9IHRoaXMubGFuZ3VhZ2VzO1xuICAgIGlmICghbnMpIG5zID0gdGhpcy5vcHRpb25zLm5zO1xuICAgIGlmICghY2FsbGJhY2spIGNhbGxiYWNrID0gbm9vcDtcbiAgICB0aGlzLnNlcnZpY2VzLmJhY2tlbmRDb25uZWN0b3IucmVsb2FkKGxuZ3MsIG5zLCBlcnIgPT4ge1xuICAgICAgZGVmZXJyZWQucmVzb2x2ZSgpOyAvLyBub3QgcmVqZWN0aW5nIG9uIGVyciAoYXMgZXJyIGlzIG9ubHkgYSBsb2FkaW5nIHRyYW5zbGF0aW9uIGZhaWxlZCB3YXJuaW5nKVxuICAgICAgY2FsbGJhY2soZXJyKTtcbiAgICB9KTtcbiAgICByZXR1cm4gZGVmZXJyZWQ7XG4gIH1cblxuICB1c2UobW9kdWxlKSB7XG4gICAgaWYgKCFtb2R1bGUpIHRocm93IG5ldyBFcnJvcignWW91IGFyZSBwYXNzaW5nIGFuIHVuZGVmaW5lZCBtb2R1bGUhIFBsZWFzZSBjaGVjayB0aGUgb2JqZWN0IHlvdSBhcmUgcGFzc2luZyB0byBpMThuZXh0LnVzZSgpJylcbiAgICBpZiAoIW1vZHVsZS50eXBlKSB0aHJvdyBuZXcgRXJyb3IoJ1lvdSBhcmUgcGFzc2luZyBhIHdyb25nIG1vZHVsZSEgUGxlYXNlIGNoZWNrIHRoZSBvYmplY3QgeW91IGFyZSBwYXNzaW5nIHRvIGkxOG5leHQudXNlKCknKVxuXG4gICAgaWYgKG1vZHVsZS50eXBlID09PSAnYmFja2VuZCcpIHtcbiAgICAgIHRoaXMubW9kdWxlcy5iYWNrZW5kID0gbW9kdWxlO1xuICAgIH1cblxuICAgIGlmIChtb2R1bGUudHlwZSA9PT0gJ2xvZ2dlcicgfHwgKG1vZHVsZS5sb2cgJiYgbW9kdWxlLndhcm4gJiYgbW9kdWxlLmVycm9yKSkge1xuICAgICAgdGhpcy5tb2R1bGVzLmxvZ2dlciA9IG1vZHVsZTtcbiAgICB9XG5cbiAgICBpZiAobW9kdWxlLnR5cGUgPT09ICdsYW5ndWFnZURldGVjdG9yJykge1xuICAgICAgdGhpcy5tb2R1bGVzLmxhbmd1YWdlRGV0ZWN0b3IgPSBtb2R1bGU7XG4gICAgfVxuXG4gICAgaWYgKG1vZHVsZS50eXBlID09PSAnaTE4bkZvcm1hdCcpIHtcbiAgICAgIHRoaXMubW9kdWxlcy5pMThuRm9ybWF0ID0gbW9kdWxlO1xuICAgIH1cblxuICAgIGlmIChtb2R1bGUudHlwZSA9PT0gJ3Bvc3RQcm9jZXNzb3InKSB7XG4gICAgICBwb3N0UHJvY2Vzc29yLmFkZFBvc3RQcm9jZXNzb3IobW9kdWxlKTtcbiAgICB9XG5cbiAgICBpZiAobW9kdWxlLnR5cGUgPT09ICdmb3JtYXR0ZXInKSB7XG4gICAgICB0aGlzLm1vZHVsZXMuZm9ybWF0dGVyID0gbW9kdWxlO1xuICAgIH1cblxuICAgIGlmIChtb2R1bGUudHlwZSA9PT0gJzNyZFBhcnR5Jykge1xuICAgICAgdGhpcy5tb2R1bGVzLmV4dGVybmFsLnB1c2gobW9kdWxlKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIHNldFJlc29sdmVkTGFuZ3VhZ2UobCkge1xuICAgIGlmICghbCB8fCAhdGhpcy5sYW5ndWFnZXMpIHJldHVybjtcbiAgICBpZiAoWydjaW1vZGUnLCAnZGV2J10uaW5kZXhPZihsKSA+IC0xKSByZXR1cm47XG4gICAgZm9yIChsZXQgbGkgPSAwOyBsaSA8IHRoaXMubGFuZ3VhZ2VzLmxlbmd0aDsgbGkrKykge1xuICAgICAgY29uc3QgbG5nSW5MbmdzID0gdGhpcy5sYW5ndWFnZXNbbGldO1xuICAgICAgaWYgKFsnY2ltb2RlJywgJ2RldiddLmluZGV4T2YobG5nSW5MbmdzKSA+IC0xKSBjb250aW51ZTtcbiAgICAgIGlmICh0aGlzLnN0b3JlLmhhc0xhbmd1YWdlU29tZVRyYW5zbGF0aW9ucyhsbmdJbkxuZ3MpKSB7XG4gICAgICAgIHRoaXMucmVzb2x2ZWRMYW5ndWFnZSA9IGxuZ0luTG5ncztcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgY2hhbmdlTGFuZ3VhZ2UobG5nLCBjYWxsYmFjaykge1xuICAgIHRoaXMuaXNMYW5ndWFnZUNoYW5naW5nVG8gPSBsbmc7XG4gICAgY29uc3QgZGVmZXJyZWQgPSBkZWZlcigpO1xuICAgIHRoaXMuZW1pdCgnbGFuZ3VhZ2VDaGFuZ2luZycsIGxuZyk7XG5cbiAgICBjb25zdCBzZXRMbmdQcm9wcyA9IChsKSA9PiB7XG4gICAgICB0aGlzLmxhbmd1YWdlID0gbDtcbiAgICAgIHRoaXMubGFuZ3VhZ2VzID0gdGhpcy5zZXJ2aWNlcy5sYW5ndWFnZVV0aWxzLnRvUmVzb2x2ZUhpZXJhcmNoeShsKTtcbiAgICAgIC8vIGZpbmQgdGhlIGZpcnN0IGxhbmd1YWdlIHJlc29sdmVkIGxhbmd1YWdlZFxuICAgICAgdGhpcy5yZXNvbHZlZExhbmd1YWdlID0gdW5kZWZpbmVkO1xuICAgICAgdGhpcy5zZXRSZXNvbHZlZExhbmd1YWdlKGwpO1xuICAgIH07XG5cbiAgICBjb25zdCBkb25lID0gKGVyciwgbCkgPT4ge1xuICAgICAgaWYgKGwpIHtcbiAgICAgICAgc2V0TG5nUHJvcHMobCk7XG4gICAgICAgIHRoaXMudHJhbnNsYXRvci5jaGFuZ2VMYW5ndWFnZShsKTtcbiAgICAgICAgdGhpcy5pc0xhbmd1YWdlQ2hhbmdpbmdUbyA9IHVuZGVmaW5lZDtcbiAgICAgICAgdGhpcy5lbWl0KCdsYW5ndWFnZUNoYW5nZWQnLCBsKTtcbiAgICAgICAgdGhpcy5sb2dnZXIubG9nKCdsYW5ndWFnZUNoYW5nZWQnLCBsKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuaXNMYW5ndWFnZUNoYW5naW5nVG8gPSB1bmRlZmluZWQ7XG4gICAgICB9XG5cbiAgICAgIGRlZmVycmVkLnJlc29sdmUoKC4uLmFyZ3MpID0+IHRoaXMudCguLi5hcmdzKSk7XG4gICAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrKGVyciwgKC4uLmFyZ3MpID0+IHRoaXMudCguLi5hcmdzKSk7XG4gICAgfTtcblxuICAgIGNvbnN0IHNldExuZyA9IGxuZ3MgPT4ge1xuICAgICAgLy8gaWYgZGV0ZWN0ZWQgbG5nIGlzIGZhbHN5LCBzZXQgaXQgdG8gZW1wdHkgYXJyYXksIHRvIG1ha2Ugc3VyZSBhdCBsZWFzdCB0aGUgZmFsbGJhY2tMbmcgd2lsbCBiZSB1c2VkXG4gICAgICBpZiAoIWxuZyAmJiAhbG5ncyAmJiB0aGlzLnNlcnZpY2VzLmxhbmd1YWdlRGV0ZWN0b3IpIGxuZ3MgPSBbXTtcbiAgICAgIC8vIGRlcGVuZGluZyBvbiBBUEkgaW4gZGV0ZWN0b3IgbG5nIGNhbiBiZSBhIHN0cmluZyAob2xkKSBvciBhbiBhcnJheSBvZiBsYW5ndWFnZXMgb3JkZXJlZCBpbiBwcmlvcml0eVxuICAgICAgY29uc3QgbCA9IHR5cGVvZiBsbmdzID09PSAnc3RyaW5nJyA/IGxuZ3MgOiB0aGlzLnNlcnZpY2VzLmxhbmd1YWdlVXRpbHMuZ2V0QmVzdE1hdGNoRnJvbUNvZGVzKGxuZ3MpO1xuXG4gICAgICBpZiAobCkge1xuICAgICAgICBpZiAoIXRoaXMubGFuZ3VhZ2UpIHtcbiAgICAgICAgICBzZXRMbmdQcm9wcyhsKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXRoaXMudHJhbnNsYXRvci5sYW5ndWFnZSkgdGhpcy50cmFuc2xhdG9yLmNoYW5nZUxhbmd1YWdlKGwpO1xuXG4gICAgICAgIGlmICh0aGlzLnNlcnZpY2VzLmxhbmd1YWdlRGV0ZWN0b3IgJiYgdGhpcy5zZXJ2aWNlcy5sYW5ndWFnZURldGVjdG9yLmNhY2hlVXNlckxhbmd1YWdlKSB0aGlzLnNlcnZpY2VzLmxhbmd1YWdlRGV0ZWN0b3IuY2FjaGVVc2VyTGFuZ3VhZ2UobCk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMubG9hZFJlc291cmNlcyhsLCBlcnIgPT4ge1xuICAgICAgICBkb25lKGVyciwgbCk7XG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgaWYgKCFsbmcgJiYgdGhpcy5zZXJ2aWNlcy5sYW5ndWFnZURldGVjdG9yICYmICF0aGlzLnNlcnZpY2VzLmxhbmd1YWdlRGV0ZWN0b3IuYXN5bmMpIHtcbiAgICAgIHNldExuZyh0aGlzLnNlcnZpY2VzLmxhbmd1YWdlRGV0ZWN0b3IuZGV0ZWN0KCkpO1xuICAgIH0gZWxzZSBpZiAoIWxuZyAmJiB0aGlzLnNlcnZpY2VzLmxhbmd1YWdlRGV0ZWN0b3IgJiYgdGhpcy5zZXJ2aWNlcy5sYW5ndWFnZURldGVjdG9yLmFzeW5jKSB7XG4gICAgICBpZiAodGhpcy5zZXJ2aWNlcy5sYW5ndWFnZURldGVjdG9yLmRldGVjdC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgdGhpcy5zZXJ2aWNlcy5sYW5ndWFnZURldGVjdG9yLmRldGVjdCgpLnRoZW4oc2V0TG5nKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuc2VydmljZXMubGFuZ3VhZ2VEZXRlY3Rvci5kZXRlY3Qoc2V0TG5nKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgc2V0TG5nKGxuZyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGRlZmVycmVkO1xuICB9XG5cbiAgZ2V0Rml4ZWRUKGxuZywgbnMsIGtleVByZWZpeCkge1xuICAgIGNvbnN0IGZpeGVkVCA9IChrZXksIG9wdHMsIC4uLnJlc3QpID0+IHtcbiAgICAgIGxldCBvcHRpb25zO1xuICAgICAgaWYgKHR5cGVvZiBvcHRzICE9PSAnb2JqZWN0Jykge1xuICAgICAgICBvcHRpb25zID0gdGhpcy5vcHRpb25zLm92ZXJsb2FkVHJhbnNsYXRpb25PcHRpb25IYW5kbGVyKFtrZXksIG9wdHNdLmNvbmNhdChyZXN0KSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvcHRpb25zID0geyAuLi5vcHRzIH07XG4gICAgICB9XG5cbiAgICAgIG9wdGlvbnMubG5nID0gb3B0aW9ucy5sbmcgfHwgZml4ZWRULmxuZztcbiAgICAgIG9wdGlvbnMubG5ncyA9IG9wdGlvbnMubG5ncyB8fCBmaXhlZFQubG5ncztcbiAgICAgIG9wdGlvbnMubnMgPSBvcHRpb25zLm5zIHx8IGZpeGVkVC5ucztcbiAgICAgIG9wdGlvbnMua2V5UHJlZml4ID0gb3B0aW9ucy5rZXlQcmVmaXggfHwga2V5UHJlZml4IHx8IGZpeGVkVC5rZXlQcmVmaXg7XG5cbiAgICAgIGNvbnN0IGtleVNlcGFyYXRvciA9IHRoaXMub3B0aW9ucy5rZXlTZXBhcmF0b3IgfHwgJy4nO1xuICAgICAgbGV0IHJlc3VsdEtleVxuICAgICAgaWYgKG9wdGlvbnMua2V5UHJlZml4ICYmIEFycmF5LmlzQXJyYXkoa2V5KSkge1xuICAgICAgICByZXN1bHRLZXkgPSBrZXkubWFwKGsgPT4gYCR7b3B0aW9ucy5rZXlQcmVmaXh9JHtrZXlTZXBhcmF0b3J9JHtrfWApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzdWx0S2V5ID0gb3B0aW9ucy5rZXlQcmVmaXggPyBgJHtvcHRpb25zLmtleVByZWZpeH0ke2tleVNlcGFyYXRvcn0ke2tleX1gIDoga2V5O1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXMudChyZXN1bHRLZXksIG9wdGlvbnMpO1xuICAgIH07XG4gICAgaWYgKHR5cGVvZiBsbmcgPT09ICdzdHJpbmcnKSB7XG4gICAgICBmaXhlZFQubG5nID0gbG5nO1xuICAgIH0gZWxzZSB7XG4gICAgICBmaXhlZFQubG5ncyA9IGxuZztcbiAgICB9XG4gICAgZml4ZWRULm5zID0gbnM7XG4gICAgZml4ZWRULmtleVByZWZpeCA9IGtleVByZWZpeDtcbiAgICByZXR1cm4gZml4ZWRUO1xuICB9XG5cbiAgdCguLi5hcmdzKSB7XG4gICAgcmV0dXJuIHRoaXMudHJhbnNsYXRvciAmJiB0aGlzLnRyYW5zbGF0b3IudHJhbnNsYXRlKC4uLmFyZ3MpO1xuICB9XG5cbiAgZXhpc3RzKC4uLmFyZ3MpIHtcbiAgICByZXR1cm4gdGhpcy50cmFuc2xhdG9yICYmIHRoaXMudHJhbnNsYXRvci5leGlzdHMoLi4uYXJncyk7XG4gIH1cblxuICBzZXREZWZhdWx0TmFtZXNwYWNlKG5zKSB7XG4gICAgdGhpcy5vcHRpb25zLmRlZmF1bHROUyA9IG5zO1xuICB9XG5cbiAgaGFzTG9hZGVkTmFtZXNwYWNlKG5zLCBvcHRpb25zID0ge30pIHtcbiAgICBpZiAoIXRoaXMuaXNJbml0aWFsaXplZCkge1xuICAgICAgdGhpcy5sb2dnZXIud2FybignaGFzTG9hZGVkTmFtZXNwYWNlOiBpMThuZXh0IHdhcyBub3QgaW5pdGlhbGl6ZWQnLCB0aGlzLmxhbmd1YWdlcyk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGlmICghdGhpcy5sYW5ndWFnZXMgfHwgIXRoaXMubGFuZ3VhZ2VzLmxlbmd0aCkge1xuICAgICAgdGhpcy5sb2dnZXIud2FybignaGFzTG9hZGVkTmFtZXNwYWNlOiBpMThuLmxhbmd1YWdlcyB3ZXJlIHVuZGVmaW5lZCBvciBlbXB0eScsIHRoaXMubGFuZ3VhZ2VzKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBjb25zdCBsbmcgPSBvcHRpb25zLmxuZyB8fCB0aGlzLnJlc29sdmVkTGFuZ3VhZ2UgfHwgdGhpcy5sYW5ndWFnZXNbMF07XG4gICAgY29uc3QgZmFsbGJhY2tMbmcgPSB0aGlzLm9wdGlvbnMgPyB0aGlzLm9wdGlvbnMuZmFsbGJhY2tMbmcgOiBmYWxzZTtcbiAgICBjb25zdCBsYXN0TG5nID0gdGhpcy5sYW5ndWFnZXNbdGhpcy5sYW5ndWFnZXMubGVuZ3RoIC0gMV07XG5cbiAgICAvLyB3ZSdyZSBpbiBjaW1vZGUgc28gdGhpcyBzaGFsbCBwYXNzXG4gICAgaWYgKGxuZy50b0xvd2VyQ2FzZSgpID09PSAnY2ltb2RlJykgcmV0dXJuIHRydWU7XG5cbiAgICBjb25zdCBsb2FkTm90UGVuZGluZyA9IChsLCBuKSA9PiB7XG4gICAgICBjb25zdCBsb2FkU3RhdGUgPSB0aGlzLnNlcnZpY2VzLmJhY2tlbmRDb25uZWN0b3Iuc3RhdGVbYCR7bH18JHtufWBdO1xuICAgICAgcmV0dXJuIGxvYWRTdGF0ZSA9PT0gLTEgfHwgbG9hZFN0YXRlID09PSAyO1xuICAgIH07XG5cbiAgICAvLyBvcHRpb25hbCBpbmplY3RlZCBjaGVja1xuICAgIGlmIChvcHRpb25zLnByZWNoZWNrKSB7XG4gICAgICBjb25zdCBwcmVSZXN1bHQgPSBvcHRpb25zLnByZWNoZWNrKHRoaXMsIGxvYWROb3RQZW5kaW5nKTtcbiAgICAgIGlmIChwcmVSZXN1bHQgIT09IHVuZGVmaW5lZCkgcmV0dXJuIHByZVJlc3VsdDtcbiAgICB9XG5cbiAgICAvLyBsb2FkZWQgLT4gU1VDQ0VTU1xuICAgIGlmICh0aGlzLmhhc1Jlc291cmNlQnVuZGxlKGxuZywgbnMpKSByZXR1cm4gdHJ1ZTtcblxuICAgIC8vIHdlcmUgbm90IGxvYWRpbmcgYXQgYWxsIC0+IFNFTUkgU1VDQ0VTU1xuICAgIGlmICghdGhpcy5zZXJ2aWNlcy5iYWNrZW5kQ29ubmVjdG9yLmJhY2tlbmQgfHwgKHRoaXMub3B0aW9ucy5yZXNvdXJjZXMgJiYgIXRoaXMub3B0aW9ucy5wYXJ0aWFsQnVuZGxlZExhbmd1YWdlcykpIHJldHVybiB0cnVlO1xuXG4gICAgLy8gZmFpbGVkIGxvYWRpbmcgbnMgLSBidXQgYXQgbGVhc3QgZmFsbGJhY2sgaXMgbm90IHBlbmRpbmcgLT4gU0VNSSBTVUNDRVNTXG4gICAgaWYgKGxvYWROb3RQZW5kaW5nKGxuZywgbnMpICYmICghZmFsbGJhY2tMbmcgfHwgbG9hZE5vdFBlbmRpbmcobGFzdExuZywgbnMpKSkgcmV0dXJuIHRydWU7XG5cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBsb2FkTmFtZXNwYWNlcyhucywgY2FsbGJhY2spIHtcbiAgICBjb25zdCBkZWZlcnJlZCA9IGRlZmVyKCk7XG5cbiAgICBpZiAoIXRoaXMub3B0aW9ucy5ucykge1xuICAgICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjaygpO1xuICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICAgIH1cbiAgICBpZiAodHlwZW9mIG5zID09PSAnc3RyaW5nJykgbnMgPSBbbnNdO1xuXG4gICAgbnMuZm9yRWFjaChuID0+IHtcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMubnMuaW5kZXhPZihuKSA8IDApIHRoaXMub3B0aW9ucy5ucy5wdXNoKG4pO1xuICAgIH0pO1xuXG4gICAgdGhpcy5sb2FkUmVzb3VyY2VzKGVyciA9PiB7XG4gICAgICBkZWZlcnJlZC5yZXNvbHZlKCk7XG4gICAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrKGVycik7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gZGVmZXJyZWQ7XG4gIH1cblxuICBsb2FkTGFuZ3VhZ2VzKGxuZ3MsIGNhbGxiYWNrKSB7XG4gICAgY29uc3QgZGVmZXJyZWQgPSBkZWZlcigpO1xuXG4gICAgaWYgKHR5cGVvZiBsbmdzID09PSAnc3RyaW5nJykgbG5ncyA9IFtsbmdzXTtcbiAgICBjb25zdCBwcmVsb2FkZWQgPSB0aGlzLm9wdGlvbnMucHJlbG9hZCB8fCBbXTtcblxuICAgIGNvbnN0IG5ld0xuZ3MgPSBsbmdzLmZpbHRlcihsbmcgPT4gcHJlbG9hZGVkLmluZGV4T2YobG5nKSA8IDApO1xuICAgIC8vIEV4aXQgZWFybHkgaWYgYWxsIGdpdmVuIGxhbmd1YWdlcyBhcmUgYWxyZWFkeSBwcmVsb2FkZWRcbiAgICBpZiAoIW5ld0xuZ3MubGVuZ3RoKSB7XG4gICAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrKCk7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgfVxuXG4gICAgdGhpcy5vcHRpb25zLnByZWxvYWQgPSBwcmVsb2FkZWQuY29uY2F0KG5ld0xuZ3MpO1xuICAgIHRoaXMubG9hZFJlc291cmNlcyhlcnIgPT4ge1xuICAgICAgZGVmZXJyZWQucmVzb2x2ZSgpO1xuICAgICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjayhlcnIpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIGRlZmVycmVkO1xuICB9XG5cbiAgZGlyKGxuZykge1xuICAgIGlmICghbG5nKSBsbmcgPSB0aGlzLnJlc29sdmVkTGFuZ3VhZ2UgfHwgKHRoaXMubGFuZ3VhZ2VzICYmIHRoaXMubGFuZ3VhZ2VzLmxlbmd0aCA+IDAgPyB0aGlzLmxhbmd1YWdlc1swXSA6IHRoaXMubGFuZ3VhZ2UpO1xuICAgIGlmICghbG5nKSByZXR1cm4gJ3J0bCc7XG5cbiAgICBjb25zdCBydGxMbmdzID0gW1xuICAgICAgJ2FyJyxcbiAgICAgICdzaHUnLFxuICAgICAgJ3NxcicsXG4gICAgICAnc3NoJyxcbiAgICAgICd4YWEnLFxuICAgICAgJ3loZCcsXG4gICAgICAneXVkJyxcbiAgICAgICdhYW8nLFxuICAgICAgJ2FiaCcsXG4gICAgICAnYWJ2JyxcbiAgICAgICdhY20nLFxuICAgICAgJ2FjcScsXG4gICAgICAnYWN3JyxcbiAgICAgICdhY3gnLFxuICAgICAgJ2FjeScsXG4gICAgICAnYWRmJyxcbiAgICAgICdhZHMnLFxuICAgICAgJ2FlYicsXG4gICAgICAnYWVjJyxcbiAgICAgICdhZmInLFxuICAgICAgJ2FqcCcsXG4gICAgICAnYXBjJyxcbiAgICAgICdhcGQnLFxuICAgICAgJ2FyYicsXG4gICAgICAnYXJxJyxcbiAgICAgICdhcnMnLFxuICAgICAgJ2FyeScsXG4gICAgICAnYXJ6JyxcbiAgICAgICdhdXonLFxuICAgICAgJ2F2bCcsXG4gICAgICAnYXloJyxcbiAgICAgICdheWwnLFxuICAgICAgJ2F5bicsXG4gICAgICAnYXlwJyxcbiAgICAgICdiYnonLFxuICAgICAgJ3BnYScsXG4gICAgICAnaGUnLFxuICAgICAgJ2l3JyxcbiAgICAgICdwcycsXG4gICAgICAncGJ0JyxcbiAgICAgICdwYnUnLFxuICAgICAgJ3BzdCcsXG4gICAgICAncHJwJyxcbiAgICAgICdwcmQnLFxuICAgICAgJ3VnJyxcbiAgICAgICd1cicsXG4gICAgICAneWRkJyxcbiAgICAgICd5ZHMnLFxuICAgICAgJ3lpaCcsXG4gICAgICAnamknLFxuICAgICAgJ3lpJyxcbiAgICAgICdoYm8nLFxuICAgICAgJ21lbicsXG4gICAgICAneG1uJyxcbiAgICAgICdmYScsXG4gICAgICAnanByJyxcbiAgICAgICdwZW8nLFxuICAgICAgJ3BlcycsXG4gICAgICAncHJzJyxcbiAgICAgICdkdicsXG4gICAgICAnc2FtJyxcbiAgICAgICdja2InXG4gICAgXTtcblxuICAgIGNvbnN0IGxhbmd1YWdlVXRpbHMgPSAodGhpcy5zZXJ2aWNlcyAmJiB0aGlzLnNlcnZpY2VzLmxhbmd1YWdlVXRpbHMpIHx8IG5ldyBMYW5ndWFnZVV0aWxzKGdldERlZmF1bHRzKCkpIC8vIGZvciB1bmluaXRpYWxpemVkIHVzYWdlXG5cbiAgICByZXR1cm4gcnRsTG5ncy5pbmRleE9mKGxhbmd1YWdlVXRpbHMuZ2V0TGFuZ3VhZ2VQYXJ0RnJvbUNvZGUobG5nKSkgPiAtMSB8fCBsbmcudG9Mb3dlckNhc2UoKS5pbmRleE9mKCctYXJhYicpID4gMVxuICAgICAgPyAncnRsJ1xuICAgICAgOiAnbHRyJztcbiAgfVxuXG4gIHN0YXRpYyBjcmVhdGVJbnN0YW5jZShvcHRpb25zID0ge30sIGNhbGxiYWNrKSB7IHJldHVybiBuZXcgSTE4bihvcHRpb25zLCBjYWxsYmFjaykgfVxuXG4gIGNsb25lSW5zdGFuY2Uob3B0aW9ucyA9IHt9LCBjYWxsYmFjayA9IG5vb3ApIHtcbiAgICBjb25zdCBmb3JrUmVzb3VyY2VTdG9yZSA9IG9wdGlvbnMuZm9ya1Jlc291cmNlU3RvcmU7XG4gICAgaWYgKGZvcmtSZXNvdXJjZVN0b3JlKSBkZWxldGUgb3B0aW9ucy5mb3JrUmVzb3VyY2VTdG9yZTtcbiAgICBjb25zdCBtZXJnZWRPcHRpb25zID0geyAuLi50aGlzLm9wdGlvbnMsIC4uLm9wdGlvbnMsIC4uLnsgaXNDbG9uZTogdHJ1ZSB9IH07XG4gICAgY29uc3QgY2xvbmUgPSBuZXcgSTE4bihtZXJnZWRPcHRpb25zKTtcbiAgICBpZiAoKG9wdGlvbnMuZGVidWcgIT09IHVuZGVmaW5lZCB8fCBvcHRpb25zLnByZWZpeCAhPT0gdW5kZWZpbmVkKSkge1xuICAgICAgY2xvbmUubG9nZ2VyID0gY2xvbmUubG9nZ2VyLmNsb25lKG9wdGlvbnMpO1xuICAgIH1cbiAgICBjb25zdCBtZW1iZXJzVG9Db3B5ID0gWydzdG9yZScsICdzZXJ2aWNlcycsICdsYW5ndWFnZSddO1xuICAgIG1lbWJlcnNUb0NvcHkuZm9yRWFjaChtID0+IHtcbiAgICAgIGNsb25lW21dID0gdGhpc1ttXTtcbiAgICB9KTtcbiAgICBjbG9uZS5zZXJ2aWNlcyA9IHsgLi4udGhpcy5zZXJ2aWNlcyB9O1xuICAgIGNsb25lLnNlcnZpY2VzLnV0aWxzID0ge1xuICAgICAgaGFzTG9hZGVkTmFtZXNwYWNlOiBjbG9uZS5oYXNMb2FkZWROYW1lc3BhY2UuYmluZChjbG9uZSlcbiAgICB9O1xuICAgIGlmIChmb3JrUmVzb3VyY2VTdG9yZSkge1xuICAgICAgY2xvbmUuc3RvcmUgPSBuZXcgUmVzb3VyY2VTdG9yZSh0aGlzLnN0b3JlLmRhdGEsIG1lcmdlZE9wdGlvbnMpO1xuICAgICAgY2xvbmUuc2VydmljZXMucmVzb3VyY2VTdG9yZSA9IGNsb25lLnN0b3JlO1xuICAgIH1cbiAgICBjbG9uZS50cmFuc2xhdG9yID0gbmV3IFRyYW5zbGF0b3IoY2xvbmUuc2VydmljZXMsIG1lcmdlZE9wdGlvbnMpO1xuICAgIGNsb25lLnRyYW5zbGF0b3Iub24oJyonLCAoZXZlbnQsIC4uLmFyZ3MpID0+IHtcbiAgICAgIGNsb25lLmVtaXQoZXZlbnQsIC4uLmFyZ3MpO1xuICAgIH0pO1xuICAgIGNsb25lLmluaXQobWVyZ2VkT3B0aW9ucywgY2FsbGJhY2spO1xuICAgIGNsb25lLnRyYW5zbGF0b3Iub3B0aW9ucyA9IG1lcmdlZE9wdGlvbnM7IC8vIHN5bmMgb3B0aW9uc1xuICAgIGNsb25lLnRyYW5zbGF0b3IuYmFja2VuZENvbm5lY3Rvci5zZXJ2aWNlcy51dGlscyA9IHtcbiAgICAgIGhhc0xvYWRlZE5hbWVzcGFjZTogY2xvbmUuaGFzTG9hZGVkTmFtZXNwYWNlLmJpbmQoY2xvbmUpXG4gICAgfTtcblxuICAgIHJldHVybiBjbG9uZTtcbiAgfVxuXG4gIHRvSlNPTigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgb3B0aW9uczogdGhpcy5vcHRpb25zLFxuICAgICAgc3RvcmU6IHRoaXMuc3RvcmUsXG4gICAgICBsYW5ndWFnZTogdGhpcy5sYW5ndWFnZSxcbiAgICAgIGxhbmd1YWdlczogdGhpcy5sYW5ndWFnZXMsXG4gICAgICByZXNvbHZlZExhbmd1YWdlOiB0aGlzLnJlc29sdmVkTGFuZ3VhZ2VcbiAgICB9O1xuICB9XG59XG5cbmNvbnN0IGluc3RhbmNlID0gSTE4bi5jcmVhdGVJbnN0YW5jZSgpO1xuaW5zdGFuY2UuY3JlYXRlSW5zdGFuY2UgPSBJMThuLmNyZWF0ZUluc3RhbmNlO1xuXG5leHBvcnQgZGVmYXVsdCBpbnN0YW5jZTtcbiIsImltcG9ydCBpMThuZXh0IGZyb20gJy4vaTE4bmV4dC5qcyc7XG5cbmV4cG9ydCBkZWZhdWx0IGkxOG5leHQ7XG5cbmV4cG9ydCBjb25zdCBjcmVhdGVJbnN0YW5jZSA9IGkxOG5leHQuY3JlYXRlSW5zdGFuY2U7XG5cbmV4cG9ydCBjb25zdCBkaXIgPSBpMThuZXh0LmRpcjtcbmV4cG9ydCBjb25zdCBpbml0ID0gaTE4bmV4dC5pbml0O1xuZXhwb3J0IGNvbnN0IGxvYWRSZXNvdXJjZXMgPSBpMThuZXh0LmxvYWRSZXNvdXJjZXM7XG5leHBvcnQgY29uc3QgcmVsb2FkUmVzb3VyY2VzID0gaTE4bmV4dC5yZWxvYWRSZXNvdXJjZXM7XG5leHBvcnQgY29uc3QgdXNlID0gaTE4bmV4dC51c2U7XG5leHBvcnQgY29uc3QgY2hhbmdlTGFuZ3VhZ2UgPSBpMThuZXh0LmNoYW5nZUxhbmd1YWdlO1xuZXhwb3J0IGNvbnN0IGdldEZpeGVkVCA9IGkxOG5leHQuZ2V0Rml4ZWRUO1xuZXhwb3J0IGNvbnN0IHQgPSBpMThuZXh0LnQ7XG5leHBvcnQgY29uc3QgZXhpc3RzID0gaTE4bmV4dC5leGlzdHM7XG5leHBvcnQgY29uc3Qgc2V0RGVmYXVsdE5hbWVzcGFjZSA9IGkxOG5leHQuc2V0RGVmYXVsdE5hbWVzcGFjZTtcbmV4cG9ydCBjb25zdCBoYXNMb2FkZWROYW1lc3BhY2UgPSBpMThuZXh0Lmhhc0xvYWRlZE5hbWVzcGFjZTtcbmV4cG9ydCBjb25zdCBsb2FkTmFtZXNwYWNlcyA9IGkxOG5leHQubG9hZE5hbWVzcGFjZXM7XG5leHBvcnQgY29uc3QgbG9hZExhbmd1YWdlcyA9IGkxOG5leHQubG9hZExhbmd1YWdlcztcbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5hbWVzcGFjZSxcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55LFxuICovXG5cbmltcG9ydCB7XG4gICAgZGVmYXVsdCBhcyBpMThuZXh0LFxuICAgIGkxOG4gYXMgaTE4bmV4dEluc3RhbmNlLFxuICAgIEZhbGxiYWNrTG5nT2JqTGlzdCBhcyBpMThuZXh0RmFsbGJhY2tMbmdPYmpMaXN0LFxuICAgIEZhbGxiYWNrTG5nIGFzIGkxOG5leHRGYWxsYmFja0xuZyxcbiAgICBJbnRlcnBvbGF0aW9uT3B0aW9ucyBhcyBpMThuZXh0SW50ZXJwb2xhdGlvbk9wdGlvbnMsXG4gICAgUmVhY3RPcHRpb25zIGFzIGkxOG5leHRSZWFjdE9wdGlvbnMsXG4gICAgSW5pdE9wdGlvbnMgYXMgaTE4bmV4dEluaXRPcHRpb25zLFxuICAgIFRPcHRpb25zQmFzZSBhcyBpMThuZXh0VE9wdGlvbnNCYXNlLFxuICAgIFRPcHRpb25zIGFzIGkxOG5leHRUT3B0aW9ucyxcbiAgICBFeGlzdHNGdW5jdGlvbiBhcyBpMThuZXh0RXhpc3RzRnVuY3Rpb24sXG4gICAgV2l0aFQgYXMgaTE4bmV4dFdpdGhULFxuICAgIFRGdW5jdGlvbiBhcyBpMThuZXh0VEZ1bmN0aW9uLFxuICAgIFJlc291cmNlIGFzIGkxOG5leHRSZXNvdXJjZSxcbiAgICBSZXNvdXJjZUxhbmd1YWdlIGFzIGkxOG5leHRSZXNvdXJjZUxhbmd1YWdlLFxuICAgIFJlc291cmNlS2V5IGFzIGkxOG5leHRSZXNvdXJjZUtleSxcbiAgICBJbnRlcnBvbGF0b3IgYXMgaTE4bmV4dEludGVycG9sYXRvcixcbiAgICBSZXNvdXJjZVN0b3JlIGFzIGkxOG5leHRSZXNvdXJjZVN0b3JlLFxuICAgIFNlcnZpY2VzIGFzIGkxOG5leHRTZXJ2aWNlcyxcbiAgICBNb2R1bGUgYXMgaTE4bmV4dE1vZHVsZSxcbiAgICBDYWxsYmFja0Vycm9yIGFzIGkxOG5leHRDYWxsYmFja0Vycm9yLFxuICAgIFJlYWRDYWxsYmFjayBhcyBpMThuZXh0UmVhZENhbGxiYWNrLFxuICAgIE11bHRpUmVhZENhbGxiYWNrIGFzIGkxOG5leHRNdWx0aVJlYWRDYWxsYmFjayxcbiAgICBCYWNrZW5kTW9kdWxlIGFzIGkxOG5leHRCYWNrZW5kTW9kdWxlLFxuICAgIExhbmd1YWdlRGV0ZWN0b3JNb2R1bGUgYXMgaTE4bmV4dExhbmd1YWdlRGV0ZWN0b3JNb2R1bGUsXG4gICAgTGFuZ3VhZ2VEZXRlY3RvckFzeW5jTW9kdWxlIGFzIGkxOG5leHRMYW5ndWFnZURldGVjdG9yQXN5bmNNb2R1bGUsXG4gICAgUG9zdFByb2Nlc3Nvck1vZHVsZSBhcyBpMThuZXh0UG9zdFByb2Nlc3Nvck1vZHVsZSxcbiAgICBMb2dnZXJNb2R1bGUgYXMgaTE4bmV4dExvZ2dlck1vZHVsZSxcbiAgICBJMThuRm9ybWF0TW9kdWxlIGFzIGkxOG5leHRJMThuRm9ybWF0TW9kdWxlLFxuICAgIFRoaXJkUGFydHlNb2R1bGUgYXMgaTE4bmV4dFRoaXJkUGFydHlNb2R1bGUsXG4gICAgTW9kdWxlcyBhcyBpMThuZXh0TW9kdWxlcyxcbiAgICBOZXdhYmxlIGFzIGkxOG5leHROZXdhYmxlLFxufSBmcm9tICdpMThuZXh0JztcblxuY29uc3QgaTE4bjogaTE4bi5pMThuID0gaTE4bmV4dDtcblxuZGVjbGFyZSBuYW1lc3BhY2UgaTE4biB7XG4gICAgZXhwb3J0IHR5cGUgaTE4biA9IGkxOG5leHRJbnN0YW5jZTtcbiAgICBleHBvcnQgdHlwZSBGYWxsYmFja0xuZ09iakxpc3QgPSBpMThuZXh0RmFsbGJhY2tMbmdPYmpMaXN0O1xuICAgIGV4cG9ydCB0eXBlIEZhbGxiYWNrTG5nID0gaTE4bmV4dEZhbGxiYWNrTG5nO1xuICAgIGV4cG9ydCB0eXBlIEludGVycG9sYXRpb25PcHRpb25zID0gaTE4bmV4dEludGVycG9sYXRpb25PcHRpb25zO1xuICAgIGV4cG9ydCB0eXBlIFJlYWN0T3B0aW9ucyA9IGkxOG5leHRSZWFjdE9wdGlvbnM7XG4gICAgZXhwb3J0IHR5cGUgSW5pdE9wdGlvbnMgPSBpMThuZXh0SW5pdE9wdGlvbnM7XG4gICAgZXhwb3J0IHR5cGUgVE9wdGlvbnNCYXNlID0gaTE4bmV4dFRPcHRpb25zQmFzZTtcbiAgICBleHBvcnQgdHlwZSBUT3B0aW9uczxUIGV4dGVuZHMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4gPSB7IFtrZXk6IHN0cmluZ106IGFueTsgfT4gPSBpMThuZXh0VE9wdGlvbnM8VD47XG4gICAgZXhwb3J0IHR5cGUgRXhpc3RzRnVuY3Rpb248SyBleHRlbmRzIHN0cmluZyA9IHN0cmluZywgVCBleHRlbmRzIFJlY29yZDxzdHJpbmcsIHVua25vd24+ID0geyBba2V5OiBzdHJpbmddOiBhbnk7IH0+ID0gaTE4bmV4dEV4aXN0c0Z1bmN0aW9uPEssIFQ+O1xuICAgIGV4cG9ydCB0eXBlIFdpdGhUID0gaTE4bmV4dFdpdGhUO1xuICAgIGV4cG9ydCB0eXBlIFRGdW5jdGlvbiA9IGkxOG5leHRURnVuY3Rpb247XG4gICAgZXhwb3J0IHR5cGUgUmVzb3VyY2UgPSBpMThuZXh0UmVzb3VyY2U7XG4gICAgZXhwb3J0IHR5cGUgUmVzb3VyY2VMYW5ndWFnZSA9IGkxOG5leHRSZXNvdXJjZUxhbmd1YWdlO1xuICAgIGV4cG9ydCB0eXBlIFJlc291cmNlS2V5ID0gaTE4bmV4dFJlc291cmNlS2V5O1xuICAgIGV4cG9ydCB0eXBlIEludGVycG9sYXRvciA9IGkxOG5leHRJbnRlcnBvbGF0b3I7XG4gICAgZXhwb3J0IHR5cGUgUmVzb3VyY2VTdG9yZSA9IGkxOG5leHRSZXNvdXJjZVN0b3JlO1xuICAgIGV4cG9ydCB0eXBlIFNlcnZpY2VzID0gaTE4bmV4dFNlcnZpY2VzO1xuICAgIGV4cG9ydCB0eXBlIE1vZHVsZSA9IGkxOG5leHRNb2R1bGU7XG4gICAgZXhwb3J0IHR5cGUgQ2FsbGJhY2tFcnJvciA9IGkxOG5leHRDYWxsYmFja0Vycm9yO1xuICAgIGV4cG9ydCB0eXBlIFJlYWRDYWxsYmFjayA9IGkxOG5leHRSZWFkQ2FsbGJhY2s7XG4gICAgZXhwb3J0IHR5cGUgTXVsdGlSZWFkQ2FsbGJhY2sgPSBpMThuZXh0TXVsdGlSZWFkQ2FsbGJhY2s7XG4gICAgZXhwb3J0IHR5cGUgQmFja2VuZE1vZHVsZTxUID0gUmVjb3JkPHN0cmluZywgdW5rbm93bj4+ID0gaTE4bmV4dEJhY2tlbmRNb2R1bGU8VD47XG4gICAgZXhwb3J0IHR5cGUgTGFuZ3VhZ2VEZXRlY3Rvck1vZHVsZSA9IGkxOG5leHRMYW5ndWFnZURldGVjdG9yTW9kdWxlO1xuICAgIGV4cG9ydCB0eXBlIExhbmd1YWdlRGV0ZWN0b3JBc3luY01vZHVsZSA9IGkxOG5leHRMYW5ndWFnZURldGVjdG9yQXN5bmNNb2R1bGU7XG4gICAgZXhwb3J0IHR5cGUgUG9zdFByb2Nlc3Nvck1vZHVsZSA9IGkxOG5leHRQb3N0UHJvY2Vzc29yTW9kdWxlO1xuICAgIGV4cG9ydCB0eXBlIExvZ2dlck1vZHVsZSA9IGkxOG5leHRMb2dnZXJNb2R1bGU7XG4gICAgZXhwb3J0IHR5cGUgSTE4bkZvcm1hdE1vZHVsZSA9IGkxOG5leHRJMThuRm9ybWF0TW9kdWxlO1xuICAgIGV4cG9ydCB0eXBlIFRoaXJkUGFydHlNb2R1bGUgPSBpMThuZXh0VGhpcmRQYXJ0eU1vZHVsZTtcbiAgICBleHBvcnQgdHlwZSBNb2R1bGVzID0gaTE4bmV4dE1vZHVsZXM7XG4gICAgZXhwb3J0IHR5cGUgTmV3YWJsZTxUPiA9IGkxOG5leHROZXdhYmxlPFQ+O1xufVxuXG5leHBvcnQgeyBpMThuIH07XG4iXSwibmFtZXMiOlsidXRpbHMuZ2V0UGF0aCIsInV0aWxzLmRlZXBGaW5kIiwidXRpbHMuc2V0UGF0aCIsInV0aWxzLmRlZXBFeHRlbmQiLCJ1dGlscy5jb3B5IiwidXRpbHMubG9va3NMaWtlT2JqZWN0UGF0aCIsInV0aWxzLmdldFBhdGhXaXRoRGVmYXVsdHMiLCJ1dGlscy5lc2NhcGUiLCJ1dGlscy5yZWdleEVzY2FwZSIsInV0aWxzLm1ha2VTdHJpbmciLCJ1dGlscy5wdXNoUGF0aCIsImdldERlZmF1bHRzIiwiTGFuZ3VhZ2VVdGlscyIsIkJhY2tl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QyxDQUFDLFdBQVcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQztFQUNqRyxPQUFPLE1BQU0sSUFBSSxDQUFDLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtFQUNqQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUM7QUFDbEM7RUFDQTtFQUNBLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO0VBQ3pELFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssS0FBSyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUM7QUFDM0U7RUFDQSxRQUFRLElBQUksWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDO0VBQ2pHLFFBQVEsSUFBSSxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDLENB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Q0FBQyxJQUFJLENBQUMsSUFBSTtFQUN4RSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSTtFQUNoRSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSTtFQUNqRixJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSztFQUN0RSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUU7QUFDckY7RUFDQSxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSTtFQUM3RSxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRTtBQUNwRTtFQUNBLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFO0FBQzVFO0VBQ0EsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRTtFQUMvQyxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRTtFQUMzQyxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRTtFQUM1QyxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRTtFQUN4QyxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUU7RUFDcEMsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFO0VBQzVDLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFO0VBQzFDLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRTtFQUNyQyxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUU7RUFDckMsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUU7RUFDekMsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRTtFQUN4QyxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFO0VBQ3ZDLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRTtFQUNyQyxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsS0FBSyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFO0VBQ3hDLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFO0VBQzNDLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRTtFQUNwQyxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFO0VBQ3hDLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFO0VBQ3pDLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRTtFQUNoRCxFQUFDO0FBQ0Q7RUFDQSxJQUFJLGtCQUFrQixHQUFHO0VBQ3pCLEVBQUUsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxFQUFFLENBQUMsT0FBTyxNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7RUFDeEMsRUFBRSxDQUFDLEVBQUUsU0FBUyxDQUFDLEVBQUUsQ0FBQyxPQUFPLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztFQUN6QyxFQUFFLENBQUMsRUFBRSxTQUFTLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7RUFDNUIsRUFBRSxDQUFDLEVBQUUsU0FBUyxDQUFDLEVBQUUsQ0FBQyxPQUFPLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztFQUNuSCxFQUFFLENBQUMsRUFBRSxTQUFTLENBQUMsRUFBRSxDQUFDLE9BQU8sTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztFQUNqSCxFQUFFLENBQUMsRUFBRSxTQUFTLENBQUMsRUFBRSxDQUFDLE9BQU8sTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7RUFDdEUsRUFBRSxDQUFDLEVBQUUsU0FBUyxDQUFDLEVBQUUsQ0FBQyxPQUFPLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0VBQ25HLEVBQUUsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxFQUFFLENBQUMsT0FBTyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0VBQ3hGLEVBQUUsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxFQUFFLENBQUMsT0FBTyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7RUFDekMsRUFBRSxFQUFFLEVBQUUsU0FBUyxDQUFDLEVBQUUsQ0FBQyxPQUFPLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDO0VBQ2pGLEVBQUUsRUFBRSxFQUFFLFNBQVMsQ0FBQyxFQUFFLENBQUMsT0FBTyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztFQUN6RyxFQUFFLEVBQUUsRUFBRSxTQUFTLENBQUMsRUFBRSxDQUFDLE9BQU8sTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztFQUN4RCxFQUFFLEVBQUUsRUFBRSxTQUFTLENBQUMsRUFBRSxDQUFDLE9BQU8sTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO0VBQzNDLEVBQUUsRUFBRSxFQUFFLFNBQVMsQ0FBQyxFQUFFLENBQUMsT0FBTyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztFQUM5RSxFQUFFLEVBQUUsRUFBRSxTQUFTLENBQUMsRUFBRSxDQUFDLE9BQU8sTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0VBQ3pHLEVBQUUsRUFBRSxFQUFFLFNBQVMsQ0FBQyxFQUFFLENBQUMsT0FBTyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7RUFDOUUsRUFBRSxFQUFFLEVBQUUsU0FBUyxDQUFDLEVBQUUsQ0FBQyxPQUFPLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0VBQ3hFLEVBQUUsRUFBRSxFQUFFLFNBQVMsQ0FBQyxFQUFFLENBQUMsT0FBTyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztFQUMzRCxFQUFFLEVBQUUsRUFBRSxTQUFTLENBQUMsRUFBRSxDQUFDLE9BQU8sTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztFQUNuSCxFQUFFLEVBQUUsRUFBRSxTQUFTLENBQUMsRUFBRSxDQUFDLE9BQU8sTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0VBQzFGLEVBQUUsRUFBRSxFQUFFLFNBQVMsQ0FBQyxFQUFFLENBQUMsT0FBTyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLEdBQUcs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RztBQUNIO0VBQ0EsRUFBRSxNQUFNLENBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUU7RUFDMUIsSUFBSSxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0VBQzlCLElBQUksTUFBTSxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0VBQ3JCLElBQUksTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3BCO0VBQ0EsSUFBSSxJQUFJLEdBQUcsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDO0FBQ3REO0VBQ0EsSUFBSSxJQUFJLElBQUksRUFBRTtFQUNkLE1BQU0sSUFBSSxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLEVBQUUsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDO0VBQ2xELEtBQUs7QUFDTDtFQUNBO0VBQ0EsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDcEM7RUFDQTtFQUNBLElBQUksTUFBTSxNQUFNLEdBQUcsRUFBRSxDQUFDO0FBQ3RCO0VBQ0E7RUFDQSxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxLQUFLO0VBQzlCLE1BQU1DLFFBQWMsQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7RUFDMUMsTUFBTSxhQUFhLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO0FBQzdCO0VBQ0EsTUFBTSxJQUFJLEdBQUcsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUNsQztFQUNBLE1BQU0sSUFBSSxDQUFDLENBQUMsWUFBWSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FB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RSxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUM7RUFDbEMsS0FBSyxDQUFDLENBQUM7QUFDUDtFQUNBLElBQUksT0FBTyxRQUFRLENBQUM7RUFDcEIsR0FBRztBQUNIO0VBQ0EsRUFBRSxHQUFHLENBQUMsR0FBRyxFQUFFO0VBQ1gsSUFBSSxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLEtBQUssSUFBSSxDQUFDLFNBQVMsSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7RUFDL0gsSUFBSSxJQUFJLENBQUMsR0FBRyxFQUFFLE9BQU8sS0FBSyxDQUFDO0FBQzNCO0VBQ0EsSUFBSSxNQUFNLE9BQU8sR0FBRztFQUNwQixNQUFNLElBQUk7RUFDVixNQUFNLEtBQUs7RUFDWCxNQUFNLEtBQUs7RUFDWCxNQUFNLEtBQUs7RUFDWCxNQUFNLEtBQUs7RUFDWCxNQUFNLEtBQUs7RUFDWCxNQUFNLEtBQUs7RUFDWCxNQUFNLEtBQUs7RUFDWCxNQUFNLEtBQUs7RUFDWCxNQUFNLEtBQUs7RUFDWCxNQUFNLEtBQUs7RUFDWCxNQUFNLEtBQUs7RUFDWCxNQUFNLEtBQUs7RUFDWCxNQUFNLEtBQUs7RUFDWCxNQUFNLEtBQUs7RUFDWCxNQUFNLEtBQUs7RUFDWCxNQUFNLEtBQUs7RUFDWCxNQUFNLEtBQUs7RUFDWCxNQUFNLEtBQUs7RUFDWCxNQUFNLEtBQUs7RUFDWCxNQUFNLEtBQUs7RUFDWCxNQUFNLEtBQUs7RUFDWCxNQUFNLEtBQUs7RUFDWCxNQUFNLEtBQUs7RUFDWCxNQUFNLEtBQUs7RUFDWCxNQUFNLEtBQUs7RUFDWCxNQUFNLEtBQUs7RUFDWCxNQUFNLEtBQUs7RUFDWCxNQUFNLEtBQUs7RUFDWCxNQUFNLEtBQUs7RUFDWCxNQUFNLEtBQUs7RUFDWCxNQUFNLEtBQUs7RUFDWCxNQUFNLEtBQUs7RUFDWCxNQUFNLEtBQUs7RUFDWCxN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QUFHO0VBQ0gsQ0FBQztBQUNEO0VBQ0EsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO0VBQ3ZDLFFBQVEsQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFDLGNBQWM7O0FDL21CZkcsVUFBTyxDQUFDLGVBQWU7QUFDckQ7QUFDbUJBLFVBQU8sQ0FBQyxJQUFJO0FBQ1hBLFVBQU8sQ0FBQyxLQUFLO0FBQ0pBLFVBQU8sQ0FBQyxjQUFjO0FBQ3BCQSxVQUFPLENBQUMsZ0JBQWdCO0FBQ3BDQSxVQUFPLENBQUMsSUFBSTtBQUNEQSxVQUFPLENBQUMsZUFBZTtBQUM1QkEsVUFBTyxDQUFDLFVBQVU7QUFDMUJBLFVBQU8sQ0FBQyxFQUFFO0FBQ0xBLFVBQU8sQ0FBQyxPQUFPO0FBQ0ZBLFVBQU8sQ0FBQyxvQkFBb0I7QUFDN0JBLFVBQU8sQ0FBQyxtQkFBbUI7QUFDL0JBLFVBQU8sQ0FBQyxlQUFlO0FBQ3hCQSxVQUFPLENBQUM7O0VDbEJyQzs7O0VBR0c7QUFvQ0csUUFBQSxJQUFJLEdBQWNBOzs7Ozs7Ozs7OyIsInhfZ29vZ2xlX2lnbm9yZUxpc3QiOlswLDEsMiwzLDQsNSw2LDcsOCw5LDEwLDExLDEyLDEzXSwic291cmNlUm9vdCI6ImNkcDovLy9AY2RwL2V4dGVuc2lvbi1pMThuLyJ9