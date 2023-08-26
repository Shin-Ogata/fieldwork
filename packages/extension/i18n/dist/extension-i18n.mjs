/*!
 * @cdp/extension-i18n 0.9.17
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uLWkxOG4ubWpzIiwic291cmNlcyI6WyJpMThuZXh0L3NyYy9sb2dnZXIuanMiLCJpMThuZXh0L3NyYy9FdmVudEVtaXR0ZXIuanMiLCJpMThuZXh0L3NyYy91dGlscy5qcyIsImkxOG5leHQvc3JjL1Jlc291cmNlU3RvcmUuanMiLCJpMThuZXh0L3NyYy9wb3N0UHJvY2Vzc29yLmpzIiwiaTE4bmV4dC9zcmMvVHJhbnNsYXRvci5qcyIsImkxOG5leHQvc3JjL0xhbmd1YWdlVXRpbHMuanMiLCJpMThuZXh0L3NyYy9QbHVyYWxSZXNvbHZlci5qcyIsImkxOG5leHQvc3JjL0ludGVycG9sYXRvci5qcyIsImkxOG5leHQvc3JjL0Zvcm1hdHRlci5qcyIsImkxOG5leHQvc3JjL0JhY2tlbmRDb25uZWN0b3IuanMiLCJpMThuZXh0L3NyYy9kZWZhdWx0cy5qcyIsImkxOG5leHQvc3JjL2kxOG5leHQuanMiLCJpMThuZXh0L3NyYy9pbmRleC5qcyIsImluZGV4LnRzIl0sInNvdXJjZXNDb250ZW50IjpbImNvbnN0IGNvbnNvbGVMb2dnZXIgPSB7XG4gIHR5cGU6ICdsb2dnZXInLFxuXG4gIGxvZyhhcmdzKSB7XG4gICAgdGhpcy5vdXRwdXQoJ2xvZycsIGFyZ3MpO1xuICB9LFxuXG4gIHdhcm4oYXJncykge1xuICAgIHRoaXMub3V0cHV0KCd3YXJuJywgYXJncyk7XG4gIH0sXG5cbiAgZXJyb3IoYXJncykge1xuICAgIHRoaXMub3V0cHV0KCdlcnJvcicsIGFyZ3MpO1xuICB9LFxuXG4gIG91dHB1dCh0eXBlLCBhcmdzKSB7XG4gICAgLyogZXNsaW50IG5vLWNvbnNvbGU6IDAgKi9cbiAgICBpZiAoY29uc29sZSAmJiBjb25zb2xlW3R5cGVdKSBjb25zb2xlW3R5cGVdLmFwcGx5KGNvbnNvbGUsIGFyZ3MpO1xuICB9LFxufTtcblxuY2xhc3MgTG9nZ2VyIHtcbiAgY29uc3RydWN0b3IoY29uY3JldGVMb2dnZXIsIG9wdGlvbnMgPSB7fSkge1xuICAgIHRoaXMuaW5pdChjb25jcmV0ZUxvZ2dlciwgb3B0aW9ucyk7XG4gIH1cblxuICBpbml0KGNvbmNyZXRlTG9nZ2VyLCBvcHRpb25zID0ge30pIHtcbiAgICB0aGlzLnByZWZpeCA9IG9wdGlvbnMucHJlZml4IHx8ICdpMThuZXh0Oic7XG4gICAgdGhpcy5sb2dnZXIgPSBjb25jcmV0ZUxvZ2dlciB8fCBjb25zb2xlTG9nZ2VyO1xuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG4gICAgdGhpcy5kZWJ1ZyA9IG9wdGlvbnMuZGVidWc7XG4gIH1cblxuICBsb2coLi4uYXJncykge1xuICAgIHJldHVybiB0aGlzLmZvcndhcmQoYXJncywgJ2xvZycsICcnLCB0cnVlKTtcbiAgfVxuXG4gIHdhcm4oLi4uYXJncykge1xuICAgIHJldHVybiB0aGlzLmZvcndhcmQoYXJncywgJ3dhcm4nLCAnJywgdHJ1ZSk7XG4gIH1cblxuICBlcnJvciguLi5hcmdzKSB7XG4gICAgcmV0dXJuIHRoaXMuZm9yd2FyZChhcmdzLCAnZXJyb3InLCAnJyk7XG4gIH1cblxuICBkZXByZWNhdGUoLi4uYXJncykge1xuICAgIHJldHVybiB0aGlzLmZvcndhcmQoYXJncywgJ3dhcm4nLCAnV0FSTklORyBERVBSRUNBVEVEOiAnLCB0cnVlKTtcbiAgfVxuXG4gIGZvcndhcmQoYXJncywgbHZsLCBwcmVmaXgsIGRlYnVnT25seSkge1xuICAgIGlmIChkZWJ1Z09ubHkgJiYgIXRoaXMuZGVidWcpIHJldHVybiBudWxsO1xuICAgIGlmICh0eXBlb2YgYXJnc1swXSA9PT0gJ3N0cmluZycpIGFyZ3NbMF0gPSBgJHtwcmVmaXh9JHt0aGlzLnByZWZpeH0gJHthcmdzWzBdfWA7XG4gICAgcmV0dXJuIHRoaXMubG9nZ2VyW2x2bF0oYXJncyk7XG4gIH1cblxuICBjcmVhdGUobW9kdWxlTmFtZSkge1xuICAgIHJldHVybiBuZXcgTG9nZ2VyKHRoaXMubG9nZ2VyLCB7XG4gICAgICAuLi57IHByZWZpeDogYCR7dGhpcy5wcmVmaXh9OiR7bW9kdWxlTmFtZX06YCB9LFxuICAgICAgLi4udGhpcy5vcHRpb25zLFxuICAgIH0pO1xuICB9XG5cbiAgY2xvbmUob3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHRoaXMub3B0aW9ucztcbiAgICBvcHRpb25zLnByZWZpeCA9IG9wdGlvbnMucHJlZml4IHx8IHRoaXMucHJlZml4O1xuICAgIHJldHVybiBuZXcgTG9nZ2VyKHRoaXMubG9nZ2VyLCBvcHRpb25zKTtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBuZXcgTG9nZ2VyKCk7XG4iLCJjbGFzcyBFdmVudEVtaXR0ZXIge1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICB0aGlzLm9ic2VydmVycyA9IHt9O1xuICB9XG5cbiAgb24oZXZlbnRzLCBsaXN0ZW5lcikge1xuICAgIGV2ZW50cy5zcGxpdCgnICcpLmZvckVhY2goKGV2ZW50KSA9PiB7XG4gICAgICB0aGlzLm9ic2VydmVyc1tldmVudF0gPSB0aGlzLm9ic2VydmVyc1tldmVudF0gfHwgW107XG4gICAgICB0aGlzLm9ic2VydmVyc1tldmVudF0ucHVzaChsaXN0ZW5lcik7XG4gICAgfSk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBvZmYoZXZlbnQsIGxpc3RlbmVyKSB7XG4gICAgaWYgKCF0aGlzLm9ic2VydmVyc1tldmVudF0pIHJldHVybjtcbiAgICBpZiAoIWxpc3RlbmVyKSB7XG4gICAgICBkZWxldGUgdGhpcy5vYnNlcnZlcnNbZXZlbnRdO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMub2JzZXJ2ZXJzW2V2ZW50XSA9IHRoaXMub2JzZXJ2ZXJzW2V2ZW50XS5maWx0ZXIoKGwpID0+IGwgIT09IGxpc3RlbmVyKTtcbiAgfVxuXG4gIGVtaXQoZXZlbnQsIC4uLmFyZ3MpIHtcbiAgICBpZiAodGhpcy5vYnNlcnZlcnNbZXZlbnRdKSB7XG4gICAgICBjb25zdCBjbG9uZWQgPSBbXS5jb25jYXQodGhpcy5vYnNlcnZlcnNbZXZlbnRdKTtcbiAgICAgIGNsb25lZC5mb3JFYWNoKChvYnNlcnZlcikgPT4ge1xuICAgICAgICBvYnNlcnZlciguLi5hcmdzKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm9ic2VydmVyc1snKiddKSB7XG4gICAgICBjb25zdCBjbG9uZWQgPSBbXS5jb25jYXQodGhpcy5vYnNlcnZlcnNbJyonXSk7XG4gICAgICBjbG9uZWQuZm9yRWFjaCgob2JzZXJ2ZXIpID0+IHtcbiAgICAgICAgb2JzZXJ2ZXIuYXBwbHkob2JzZXJ2ZXIsIFtldmVudCwgLi4uYXJnc10pO1xuICAgICAgfSk7XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IEV2ZW50RW1pdHRlcjtcbiIsIi8vIGh0dHA6Ly9sZWEudmVyb3UubWUvMjAxNi8xMi9yZXNvbHZlLXByb21pc2VzLWV4dGVybmFsbHktd2l0aC10aGlzLW9uZS13ZWlyZC10cmljay9cbmV4cG9ydCBmdW5jdGlvbiBkZWZlcigpIHtcbiAgbGV0IHJlcztcbiAgbGV0IHJlajtcblxuICBjb25zdCBwcm9taXNlID0gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIHJlcyA9IHJlc29sdmU7XG4gICAgcmVqID0gcmVqZWN0O1xuICB9KTtcblxuICBwcm9taXNlLnJlc29sdmUgPSByZXM7XG4gIHByb21pc2UucmVqZWN0ID0gcmVqO1xuXG4gIHJldHVybiBwcm9taXNlO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbWFrZVN0cmluZyhvYmplY3QpIHtcbiAgaWYgKG9iamVjdCA9PSBudWxsKSByZXR1cm4gJyc7XG4gIC8qIGVzbGludCBwcmVmZXItdGVtcGxhdGU6IDAgKi9cbiAgcmV0dXJuICcnICsgb2JqZWN0O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY29weShhLCBzLCB0KSB7XG4gIGEuZm9yRWFjaCgobSkgPT4ge1xuICAgIGlmIChzW21dKSB0W21dID0gc1ttXTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIGdldExhc3RPZlBhdGgob2JqZWN0LCBwYXRoLCBFbXB0eSkge1xuICBmdW5jdGlvbiBjbGVhbktleShrZXkpIHtcbiAgICByZXR1cm4ga2V5ICYmIGtleS5pbmRleE9mKCcjIyMnKSA+IC0xID8ga2V5LnJlcGxhY2UoLyMjIy9nLCAnLicpIDoga2V5O1xuICB9XG5cbiAgZnVuY3Rpb24gY2FuTm90VHJhdmVyc2VEZWVwZXIoKSB7XG4gICAgcmV0dXJuICFvYmplY3QgfHwgdHlwZW9mIG9iamVjdCA9PT0gJ3N0cmluZyc7XG4gIH1cblxuICBjb25zdCBzdGFjayA9IHR5cGVvZiBwYXRoICE9PSAnc3RyaW5nJyA/IFtdLmNvbmNhdChwYXRoKSA6IHBhdGguc3BsaXQoJy4nKTtcbiAgd2hpbGUgKHN0YWNrLmxlbmd0aCA+IDEpIHtcbiAgICBpZiAoY2FuTm90VHJhdmVyc2VEZWVwZXIoKSkgcmV0dXJuIHt9O1xuXG4gICAgY29uc3Qga2V5ID0gY2xlYW5LZXkoc3RhY2suc2hpZnQoKSk7XG4gICAgaWYgKCFvYmplY3Rba2V5XSAmJiBFbXB0eSkgb2JqZWN0W2tleV0gPSBuZXcgRW1wdHkoKTtcbiAgICAvLyBwcmV2ZW50IHByb3RvdHlwZSBwb2xsdXRpb25cbiAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iamVjdCwga2V5KSkge1xuICAgICAgb2JqZWN0ID0gb2JqZWN0W2tleV07XG4gICAgfSBlbHNlIHtcbiAgICAgIG9iamVjdCA9IHt9O1xuICAgIH1cbiAgfVxuXG4gIGlmIChjYW5Ob3RUcmF2ZXJzZURlZXBlcigpKSByZXR1cm4ge307XG4gIHJldHVybiB7XG4gICAgb2JqOiBvYmplY3QsXG4gICAgazogY2xlYW5LZXkoc3RhY2suc2hpZnQoKSksXG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzZXRQYXRoKG9iamVjdCwgcGF0aCwgbmV3VmFsdWUpIHtcbiAgY29uc3QgeyBvYmosIGsgfSA9IGdldExhc3RPZlBhdGgob2JqZWN0LCBwYXRoLCBPYmplY3QpO1xuXG4gIG9ialtrXSA9IG5ld1ZhbHVlO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcHVzaFBhdGgob2JqZWN0LCBwYXRoLCBuZXdWYWx1ZSwgY29uY2F0KSB7XG4gIGNvbnN0IHsgb2JqLCBrIH0gPSBnZXRMYXN0T2ZQYXRoKG9iamVjdCwgcGF0aCwgT2JqZWN0KTtcblxuICBvYmpba10gPSBvYmpba10gfHwgW107XG4gIGlmIChjb25jYXQpIG9ialtrXSA9IG9ialtrXS5jb25jYXQobmV3VmFsdWUpO1xuICBpZiAoIWNvbmNhdCkgb2JqW2tdLnB1c2gobmV3VmFsdWUpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0UGF0aChvYmplY3QsIHBhdGgpIHtcbiAgY29uc3QgeyBvYmosIGsgfSA9IGdldExhc3RPZlBhdGgob2JqZWN0LCBwYXRoKTtcblxuICBpZiAoIW9iaikgcmV0dXJuIHVuZGVmaW5lZDtcbiAgcmV0dXJuIG9ialtrXTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFBhdGhXaXRoRGVmYXVsdHMoZGF0YSwgZGVmYXVsdERhdGEsIGtleSkge1xuICBjb25zdCB2YWx1ZSA9IGdldFBhdGgoZGF0YSwga2V5KTtcbiAgaWYgKHZhbHVlICE9PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cbiAgLy8gRmFsbGJhY2sgdG8gZGVmYXVsdCB2YWx1ZXNcbiAgcmV0dXJuIGdldFBhdGgoZGVmYXVsdERhdGEsIGtleSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkZWVwRXh0ZW5kKHRhcmdldCwgc291cmNlLCBvdmVyd3JpdGUpIHtcbiAgLyogZXNsaW50IG5vLXJlc3RyaWN0ZWQtc3ludGF4OiAwICovXG4gIGZvciAoY29uc3QgcHJvcCBpbiBzb3VyY2UpIHtcbiAgICBpZiAocHJvcCAhPT0gJ19fcHJvdG9fXycgJiYgcHJvcCAhPT0gJ2NvbnN0cnVjdG9yJykge1xuICAgICAgaWYgKHByb3AgaW4gdGFyZ2V0KSB7XG4gICAgICAgIC8vIElmIHdlIHJlYWNoZWQgYSBsZWFmIHN0cmluZyBpbiB0YXJnZXQgb3Igc291cmNlIHRoZW4gcmVwbGFjZSB3aXRoIHNvdXJjZSBvciBza2lwIGRlcGVuZGluZyBvbiB0aGUgJ292ZXJ3cml0ZScgc3dpdGNoXG4gICAgICAgIGlmIChcbiAgICAgICAgICB0eXBlb2YgdGFyZ2V0W3Byb3BdID09PSAnc3RyaW5nJyB8fFxuICAgICAgICAgIHRhcmdldFtwcm9wXSBpbnN0YW5jZW9mIFN0cmluZyB8fFxuICAgICAgICAgIHR5cGVvZiBzb3VyY2VbcHJvcF0gPT09ICdzdHJpbmcnIHx8XG4gICAgICAgICAgc291cmNlW3Byb3BdIGluc3RhbmNlb2YgU3RyaW5nXG4gICAgICAgICkge1xuICAgICAgICAgIGlmIChvdmVyd3JpdGUpIHRhcmdldFtwcm9wXSA9IHNvdXJjZVtwcm9wXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBkZWVwRXh0ZW5kKHRhcmdldFtwcm9wXSwgc291cmNlW3Byb3BdLCBvdmVyd3JpdGUpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0YXJnZXRbcHJvcF0gPSBzb3VyY2VbcHJvcF07XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiB0YXJnZXQ7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZWdleEVzY2FwZShzdHIpIHtcbiAgLyogZXNsaW50IG5vLXVzZWxlc3MtZXNjYXBlOiAwICovXG4gIHJldHVybiBzdHIucmVwbGFjZSgvW1xcLVxcW1xcXVxcL1xce1xcfVxcKFxcKVxcKlxcK1xcP1xcLlxcXFxcXF5cXCRcXHxdL2csICdcXFxcJCYnKTtcbn1cblxuLyogZXNsaW50LWRpc2FibGUgKi9cbnZhciBfZW50aXR5TWFwID0ge1xuICAnJic6ICcmYW1wOycsXG4gICc8JzogJyZsdDsnLFxuICAnPic6ICcmZ3Q7JyxcbiAgJ1wiJzogJyZxdW90OycsXG4gIFwiJ1wiOiAnJiMzOTsnLFxuICAnLyc6ICcmI3gyRjsnLFxufTtcbi8qIGVzbGludC1lbmFibGUgKi9cblxuZXhwb3J0IGZ1bmN0aW9uIGVzY2FwZShkYXRhKSB7XG4gIGlmICh0eXBlb2YgZGF0YSA9PT0gJ3N0cmluZycpIHtcbiAgICByZXR1cm4gZGF0YS5yZXBsYWNlKC9bJjw+XCInXFwvXS9nLCAocykgPT4gX2VudGl0eU1hcFtzXSk7XG4gIH1cblxuICByZXR1cm4gZGF0YTtcbn1cblxuY29uc3QgY2hhcnMgPSBbJyAnLCAnLCcsICc/JywgJyEnLCAnOyddO1xuZXhwb3J0IGZ1bmN0aW9uIGxvb2tzTGlrZU9iamVjdFBhdGgoa2V5LCBuc1NlcGFyYXRvciwga2V5U2VwYXJhdG9yKSB7XG4gIG5zU2VwYXJhdG9yID0gbnNTZXBhcmF0b3IgfHwgJyc7XG4gIGtleVNlcGFyYXRvciA9IGtleVNlcGFyYXRvciB8fCAnJztcbiAgY29uc3QgcG9zc2libGVDaGFycyA9IGNoYXJzLmZpbHRlcihcbiAgICAoYykgPT4gbnNTZXBhcmF0b3IuaW5kZXhPZihjKSA8IDAgJiYga2V5U2VwYXJhdG9yLmluZGV4T2YoYykgPCAwLFxuICApO1xuICBpZiAocG9zc2libGVDaGFycy5sZW5ndGggPT09IDApIHJldHVybiB0cnVlO1xuICBjb25zdCByID0gbmV3IFJlZ0V4cChgKCR7cG9zc2libGVDaGFycy5tYXAoKGMpID0+IChjID09PSAnPycgPyAnXFxcXD8nIDogYykpLmpvaW4oJ3wnKX0pYCk7XG4gIGxldCBtYXRjaGVkID0gIXIudGVzdChrZXkpO1xuICBpZiAoIW1hdGNoZWQpIHtcbiAgICBjb25zdCBraSA9IGtleS5pbmRleE9mKGtleVNlcGFyYXRvcik7XG4gICAgaWYgKGtpID4gMCAmJiAhci50ZXN0KGtleS5zdWJzdHJpbmcoMCwga2kpKSkge1xuICAgICAgbWF0Y2hlZCA9IHRydWU7XG4gICAgfVxuICB9XG4gIHJldHVybiBtYXRjaGVkO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZGVlcEZpbmQob2JqLCBwYXRoLCBrZXlTZXBhcmF0b3IgPSAnLicpIHtcbiAgaWYgKCFvYmopIHJldHVybiB1bmRlZmluZWQ7XG4gIGlmIChvYmpbcGF0aF0pIHJldHVybiBvYmpbcGF0aF07XG4gIGNvbnN0IHBhdGhzID0gcGF0aC5zcGxpdChrZXlTZXBhcmF0b3IpO1xuICBsZXQgY3VycmVudCA9IG9iajtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBwYXRocy5sZW5ndGg7ICsraSkge1xuICAgIGlmICghY3VycmVudCkgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICBpZiAodHlwZW9mIGN1cnJlbnRbcGF0aHNbaV1dID09PSAnc3RyaW5nJyAmJiBpICsgMSA8IHBhdGhzLmxlbmd0aCkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgaWYgKGN1cnJlbnRbcGF0aHNbaV1dID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGxldCBqID0gMjtcbiAgICAgIGxldCBwID0gcGF0aHMuc2xpY2UoaSwgaSArIGopLmpvaW4oa2V5U2VwYXJhdG9yKTtcbiAgICAgIGxldCBtaXggPSBjdXJyZW50W3BdO1xuICAgICAgd2hpbGUgKG1peCA9PT0gdW5kZWZpbmVkICYmIHBhdGhzLmxlbmd0aCA+IGkgKyBqKSB7XG4gICAgICAgIGorKztcbiAgICAgICAgcCA9IHBhdGhzLnNsaWNlKGksIGkgKyBqKS5qb2luKGtleVNlcGFyYXRvcik7XG4gICAgICAgIG1peCA9IGN1cnJlbnRbcF07XG4gICAgICB9XG4gICAgICBpZiAobWl4ID09PSB1bmRlZmluZWQpIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICBpZiAobWl4ID09PSBudWxsKSByZXR1cm4gbnVsbDtcbiAgICAgIGlmIChwYXRoLmVuZHNXaXRoKHApKSB7XG4gICAgICAgIGlmICh0eXBlb2YgbWl4ID09PSAnc3RyaW5nJykgcmV0dXJuIG1peDtcbiAgICAgICAgaWYgKHAgJiYgdHlwZW9mIG1peFtwXSA9PT0gJ3N0cmluZycpIHJldHVybiBtaXhbcF07XG4gICAgICB9XG4gICAgICBjb25zdCBqb2luZWRQYXRoID0gcGF0aHMuc2xpY2UoaSArIGopLmpvaW4oa2V5U2VwYXJhdG9yKTtcbiAgICAgIGlmIChqb2luZWRQYXRoKSByZXR1cm4gZGVlcEZpbmQobWl4LCBqb2luZWRQYXRoLCBrZXlTZXBhcmF0b3IpO1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgY3VycmVudCA9IGN1cnJlbnRbcGF0aHNbaV1dO1xuICB9XG4gIHJldHVybiBjdXJyZW50O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q2xlYW5lZENvZGUoY29kZSkge1xuICBpZiAoY29kZSAmJiBjb2RlLmluZGV4T2YoJ18nKSA+IDApIHJldHVybiBjb2RlLnJlcGxhY2UoJ18nLCAnLScpO1xuICByZXR1cm4gY29kZTtcbn1cbiIsImltcG9ydCBFdmVudEVtaXR0ZXIgZnJvbSAnLi9FdmVudEVtaXR0ZXIuanMnO1xuaW1wb3J0ICogYXMgdXRpbHMgZnJvbSAnLi91dGlscy5qcyc7XG5cbmNsYXNzIFJlc291cmNlU3RvcmUgZXh0ZW5kcyBFdmVudEVtaXR0ZXIge1xuICBjb25zdHJ1Y3RvcihkYXRhLCBvcHRpb25zID0geyBuczogWyd0cmFuc2xhdGlvbiddLCBkZWZhdWx0TlM6ICd0cmFuc2xhdGlvbicgfSkge1xuICAgIHN1cGVyKCk7XG5cbiAgICB0aGlzLmRhdGEgPSBkYXRhIHx8IHt9O1xuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG4gICAgaWYgKHRoaXMub3B0aW9ucy5rZXlTZXBhcmF0b3IgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5vcHRpb25zLmtleVNlcGFyYXRvciA9ICcuJztcbiAgICB9XG4gICAgaWYgKHRoaXMub3B0aW9ucy5pZ25vcmVKU09OU3RydWN0dXJlID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMub3B0aW9ucy5pZ25vcmVKU09OU3RydWN0dXJlID0gdHJ1ZTtcbiAgICB9XG4gIH1cblxuICBhZGROYW1lc3BhY2VzKG5zKSB7XG4gICAgaWYgKHRoaXMub3B0aW9ucy5ucy5pbmRleE9mKG5zKSA8IDApIHtcbiAgICAgIHRoaXMub3B0aW9ucy5ucy5wdXNoKG5zKTtcbiAgICB9XG4gIH1cblxuICByZW1vdmVOYW1lc3BhY2VzKG5zKSB7XG4gICAgY29uc3QgaW5kZXggPSB0aGlzLm9wdGlvbnMubnMuaW5kZXhPZihucyk7XG4gICAgaWYgKGluZGV4ID4gLTEpIHtcbiAgICAgIHRoaXMub3B0aW9ucy5ucy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgIH1cbiAgfVxuXG4gIGdldFJlc291cmNlKGxuZywgbnMsIGtleSwgb3B0aW9ucyA9IHt9KSB7XG4gICAgY29uc3Qga2V5U2VwYXJhdG9yID1cbiAgICAgIG9wdGlvbnMua2V5U2VwYXJhdG9yICE9PSB1bmRlZmluZWQgPyBvcHRpb25zLmtleVNlcGFyYXRvciA6IHRoaXMub3B0aW9ucy5rZXlTZXBhcmF0b3I7XG5cbiAgICBjb25zdCBpZ25vcmVKU09OU3RydWN0dXJlID1cbiAgICAgIG9wdGlvbnMuaWdub3JlSlNPTlN0cnVjdHVyZSAhPT0gdW5kZWZpbmVkXG4gICAgICAgID8gb3B0aW9ucy5pZ25vcmVKU09OU3RydWN0dXJlXG4gICAgICAgIDogdGhpcy5vcHRpb25zLmlnbm9yZUpTT05TdHJ1Y3R1cmU7XG5cbiAgICBsZXQgcGF0aCA9IFtsbmcsIG5zXTtcbiAgICBpZiAoa2V5ICYmIHR5cGVvZiBrZXkgIT09ICdzdHJpbmcnKSBwYXRoID0gcGF0aC5jb25jYXQoa2V5KTtcbiAgICBpZiAoa2V5ICYmIHR5cGVvZiBrZXkgPT09ICdzdHJpbmcnKVxuICAgICAgcGF0aCA9IHBhdGguY29uY2F0KGtleVNlcGFyYXRvciA/IGtleS5zcGxpdChrZXlTZXBhcmF0b3IpIDoga2V5KTtcblxuICAgIGlmIChsbmcuaW5kZXhPZignLicpID4gLTEpIHtcbiAgICAgIHBhdGggPSBsbmcuc3BsaXQoJy4nKTtcbiAgICB9XG5cbiAgICBjb25zdCByZXN1bHQgPSB1dGlscy5nZXRQYXRoKHRoaXMuZGF0YSwgcGF0aCk7XG4gICAgaWYgKHJlc3VsdCB8fCAhaWdub3JlSlNPTlN0cnVjdHVyZSB8fCB0eXBlb2Yga2V5ICE9PSAnc3RyaW5nJykgcmV0dXJuIHJlc3VsdDtcblxuICAgIHJldHVybiB1dGlscy5kZWVwRmluZCh0aGlzLmRhdGEgJiYgdGhpcy5kYXRhW2xuZ10gJiYgdGhpcy5kYXRhW2xuZ11bbnNdLCBrZXksIGtleVNlcGFyYXRvcik7XG4gIH1cblxuICBhZGRSZXNvdXJjZShsbmcsIG5zLCBrZXksIHZhbHVlLCBvcHRpb25zID0geyBzaWxlbnQ6IGZhbHNlIH0pIHtcbiAgICBjb25zdCBrZXlTZXBhcmF0b3IgPVxuICAgICAgb3B0aW9ucy5rZXlTZXBhcmF0b3IgIT09IHVuZGVmaW5lZCA/IG9wdGlvbnMua2V5U2VwYXJhdG9yIDogdGhpcy5vcHRpb25zLmtleVNlcGFyYXRvcjtcblxuICAgIGxldCBwYXRoID0gW2xuZywgbnNdO1xuICAgIGlmIChrZXkpIHBhdGggPSBwYXRoLmNvbmNhdChrZXlTZXBhcmF0b3IgPyBrZXkuc3BsaXQoa2V5U2VwYXJhdG9yKSA6IGtleSk7XG5cbiAgICBpZiAobG5nLmluZGV4T2YoJy4nKSA+IC0xKSB7XG4gICAgICBwYXRoID0gbG5nLnNwbGl0KCcuJyk7XG4gICAgICB2YWx1ZSA9IG5zO1xuICAgICAgbnMgPSBwYXRoWzFdO1xuICAgIH1cblxuICAgIHRoaXMuYWRkTmFtZXNwYWNlcyhucyk7XG5cbiAgICB1dGlscy5zZXRQYXRoKHRoaXMuZGF0YSwgcGF0aCwgdmFsdWUpO1xuXG4gICAgaWYgKCFvcHRpb25zLnNpbGVudCkgdGhpcy5lbWl0KCdhZGRlZCcsIGxuZywgbnMsIGtleSwgdmFsdWUpO1xuICB9XG5cbiAgYWRkUmVzb3VyY2VzKGxuZywgbnMsIHJlc291cmNlcywgb3B0aW9ucyA9IHsgc2lsZW50OiBmYWxzZSB9KSB7XG4gICAgLyogZXNsaW50IG5vLXJlc3RyaWN0ZWQtc3ludGF4OiAwICovXG4gICAgZm9yIChjb25zdCBtIGluIHJlc291cmNlcykge1xuICAgICAgaWYgKFxuICAgICAgICB0eXBlb2YgcmVzb3VyY2VzW21dID09PSAnc3RyaW5nJyB8fFxuICAgICAgICBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmFwcGx5KHJlc291cmNlc1ttXSkgPT09ICdbb2JqZWN0IEFycmF5XSdcbiAgICAgIClcbiAgICAgICAgdGhpcy5hZGRSZXNvdXJjZShsbmcsIG5zLCBtLCByZXNvdXJjZXNbbV0sIHsgc2lsZW50OiB0cnVlIH0pO1xuICAgIH1cbiAgICBpZiAoIW9wdGlvbnMuc2lsZW50KSB0aGlzLmVtaXQoJ2FkZGVkJywgbG5nLCBucywgcmVzb3VyY2VzKTtcbiAgfVxuXG4gIGFkZFJlc291cmNlQnVuZGxlKGxuZywgbnMsIHJlc291cmNlcywgZGVlcCwgb3ZlcndyaXRlLCBvcHRpb25zID0geyBzaWxlbnQ6IGZhbHNlIH0pIHtcbiAgICBsZXQgcGF0aCA9IFtsbmcsIG5zXTtcbiAgICBpZiAobG5nLmluZGV4T2YoJy4nKSA+IC0xKSB7XG4gICAgICBwYXRoID0gbG5nLnNwbGl0KCcuJyk7XG4gICAgICBkZWVwID0gcmVzb3VyY2VzO1xuICAgICAgcmVzb3VyY2VzID0gbnM7XG4gICAgICBucyA9IHBhdGhbMV07XG4gICAgfVxuXG4gICAgdGhpcy5hZGROYW1lc3BhY2VzKG5zKTtcblxuICAgIGxldCBwYWNrID0gdXRpbHMuZ2V0UGF0aCh0aGlzLmRhdGEsIHBhdGgpIHx8IHt9O1xuXG4gICAgaWYgKGRlZXApIHtcbiAgICAgIHV0aWxzLmRlZXBFeHRlbmQocGFjaywgcmVzb3VyY2VzLCBvdmVyd3JpdGUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBwYWNrID0geyAuLi5wYWNrLCAuLi5yZXNvdXJjZXMgfTtcbiAgICB9XG5cbiAgICB1dGlscy5zZXRQYXRoKHRoaXMuZGF0YSwgcGF0aCwgcGFjayk7XG5cbiAgICBpZiAoIW9wdGlvbnMuc2lsZW50KSB0aGlzLmVtaXQoJ2FkZGVkJywgbG5nLCBucywgcmVzb3VyY2VzKTtcbiAgfVxuXG4gIHJlbW92ZVJlc291cmNlQnVuZGxlKGxuZywgbnMpIHtcbiAgICBpZiAodGhpcy5oYXNSZXNvdXJjZUJ1bmRsZShsbmcsIG5zKSkge1xuICAgICAgZGVsZXRlIHRoaXMuZGF0YVtsbmddW25zXTtcbiAgICB9XG4gICAgdGhpcy5yZW1vdmVOYW1lc3BhY2VzKG5zKTtcblxuICAgIHRoaXMuZW1pdCgncmVtb3ZlZCcsIGxuZywgbnMpO1xuICB9XG5cbiAgaGFzUmVzb3VyY2VCdW5kbGUobG5nLCBucykge1xuICAgIHJldHVybiB0aGlzLmdldFJlc291cmNlKGxuZywgbnMpICE9PSB1bmRlZmluZWQ7XG4gIH1cblxuICBnZXRSZXNvdXJjZUJ1bmRsZShsbmcsIG5zKSB7XG4gICAgaWYgKCFucykgbnMgPSB0aGlzLm9wdGlvbnMuZGVmYXVsdE5TO1xuXG4gICAgLy8gQ09NUEFUSUJJTElUWTogcmVtb3ZlIGV4dGVuZCBpbiB2Mi4xLjBcbiAgICBpZiAodGhpcy5vcHRpb25zLmNvbXBhdGliaWxpdHlBUEkgPT09ICd2MScpIHJldHVybiB7IC4uLnt9LCAuLi50aGlzLmdldFJlc291cmNlKGxuZywgbnMpIH07XG5cbiAgICByZXR1cm4gdGhpcy5nZXRSZXNvdXJjZShsbmcsIG5zKTtcbiAgfVxuXG4gIGdldERhdGFCeUxhbmd1YWdlKGxuZykge1xuICAgIHJldHVybiB0aGlzLmRhdGFbbG5nXTtcbiAgfVxuXG4gIGhhc0xhbmd1YWdlU29tZVRyYW5zbGF0aW9ucyhsbmcpIHtcbiAgICBjb25zdCBkYXRhID0gdGhpcy5nZXREYXRhQnlMYW5ndWFnZShsbmcpO1xuICAgIGNvbnN0IG4gPSAoZGF0YSAmJiBPYmplY3Qua2V5cyhkYXRhKSkgfHwgW107XG4gICAgcmV0dXJuICEhbi5maW5kKCh2KSA9PiBkYXRhW3ZdICYmIE9iamVjdC5rZXlzKGRhdGFbdl0pLmxlbmd0aCA+IDApO1xuICB9XG5cbiAgdG9KU09OKCkge1xuICAgIHJldHVybiB0aGlzLmRhdGE7XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgUmVzb3VyY2VTdG9yZTtcbiIsImV4cG9ydCBkZWZhdWx0IHtcbiAgcHJvY2Vzc29yczoge30sXG5cbiAgYWRkUG9zdFByb2Nlc3Nvcihtb2R1bGUpIHtcbiAgICB0aGlzLnByb2Nlc3NvcnNbbW9kdWxlLm5hbWVdID0gbW9kdWxlO1xuICB9LFxuXG4gIGhhbmRsZShwcm9jZXNzb3JzLCB2YWx1ZSwga2V5LCBvcHRpb25zLCB0cmFuc2xhdG9yKSB7XG4gICAgcHJvY2Vzc29ycy5mb3JFYWNoKChwcm9jZXNzb3IpID0+IHtcbiAgICAgIGlmICh0aGlzLnByb2Nlc3NvcnNbcHJvY2Vzc29yXSlcbiAgICAgICAgdmFsdWUgPSB0aGlzLnByb2Nlc3NvcnNbcHJvY2Vzc29yXS5wcm9jZXNzKHZhbHVlLCBrZXksIG9wdGlvbnMsIHRyYW5zbGF0b3IpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHZhbHVlO1xuICB9LFxufTtcbiIsImltcG9ydCBiYXNlTG9nZ2VyIGZyb20gJy4vbG9nZ2VyLmpzJztcbmltcG9ydCBFdmVudEVtaXR0ZXIgZnJvbSAnLi9FdmVudEVtaXR0ZXIuanMnO1xuaW1wb3J0IHBvc3RQcm9jZXNzb3IgZnJvbSAnLi9wb3N0UHJvY2Vzc29yLmpzJztcbmltcG9ydCAqIGFzIHV0aWxzIGZyb20gJy4vdXRpbHMuanMnO1xuXG5jb25zdCBjaGVja2VkTG9hZGVkRm9yID0ge307XG5cbmNsYXNzIFRyYW5zbGF0b3IgZXh0ZW5kcyBFdmVudEVtaXR0ZXIge1xuICBjb25zdHJ1Y3RvcihzZXJ2aWNlcywgb3B0aW9ucyA9IHt9KSB7XG4gICAgc3VwZXIoKTtcblxuICAgIHV0aWxzLmNvcHkoXG4gICAgICBbXG4gICAgICAgICdyZXNvdXJjZVN0b3JlJyxcbiAgICAgICAgJ2xhbmd1YWdlVXRpbHMnLFxuICAgICAgICAncGx1cmFsUmVzb2x2ZXInLFxuICAgICAgICAnaW50ZXJwb2xhdG9yJyxcbiAgICAgICAgJ2JhY2tlbmRDb25uZWN0b3InLFxuICAgICAgICAnaTE4bkZvcm1hdCcsXG4gICAgICAgICd1dGlscycsXG4gICAgICBdLFxuICAgICAgc2VydmljZXMsXG4gICAgICB0aGlzLFxuICAgICk7XG5cbiAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuICAgIGlmICh0aGlzLm9wdGlvbnMua2V5U2VwYXJhdG9yID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMub3B0aW9ucy5rZXlTZXBhcmF0b3IgPSAnLic7XG4gICAgfVxuXG4gICAgdGhpcy5sb2dnZXIgPSBiYXNlTG9nZ2VyLmNyZWF0ZSgndHJhbnNsYXRvcicpO1xuICB9XG5cbiAgY2hhbmdlTGFuZ3VhZ2UobG5nKSB7XG4gICAgaWYgKGxuZykgdGhpcy5sYW5ndWFnZSA9IGxuZztcbiAgfVxuXG4gIGV4aXN0cyhrZXksIG9wdGlvbnMgPSB7IGludGVycG9sYXRpb246IHt9IH0pIHtcbiAgICBpZiAoa2V5ID09PSB1bmRlZmluZWQgfHwga2V5ID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgY29uc3QgcmVzb2x2ZWQgPSB0aGlzLnJlc29sdmUoa2V5LCBvcHRpb25zKTtcbiAgICByZXR1cm4gcmVzb2x2ZWQgJiYgcmVzb2x2ZWQucmVzICE9PSB1bmRlZmluZWQ7XG4gIH1cblxuICBleHRyYWN0RnJvbUtleShrZXksIG9wdGlvbnMpIHtcbiAgICBsZXQgbnNTZXBhcmF0b3IgPVxuICAgICAgb3B0aW9ucy5uc1NlcGFyYXRvciAhPT0gdW5kZWZpbmVkID8gb3B0aW9ucy5uc1NlcGFyYXRvciA6IHRoaXMub3B0aW9ucy5uc1NlcGFyYXRvcjtcbiAgICBpZiAobnNTZXBhcmF0b3IgPT09IHVuZGVmaW5lZCkgbnNTZXBhcmF0b3IgPSAnOic7XG5cbiAgICBjb25zdCBrZXlTZXBhcmF0b3IgPVxuICAgICAgb3B0aW9ucy5rZXlTZXBhcmF0b3IgIT09IHVuZGVmaW5lZCA/IG9wdGlvbnMua2V5U2VwYXJhdG9yIDogdGhpcy5vcHRpb25zLmtleVNlcGFyYXRvcjtcblxuICAgIGxldCBuYW1lc3BhY2VzID0gb3B0aW9ucy5ucyB8fCB0aGlzLm9wdGlvbnMuZGVmYXVsdE5TIHx8IFtdO1xuICAgIGNvbnN0IHdvdWxkQ2hlY2tGb3JOc0luS2V5ID0gbnNTZXBhcmF0b3IgJiYga2V5LmluZGV4T2YobnNTZXBhcmF0b3IpID4gLTE7XG4gICAgY29uc3Qgc2VlbXNOYXR1cmFsTGFuZ3VhZ2UgPVxuICAgICAgIXRoaXMub3B0aW9ucy51c2VyRGVmaW5lZEtleVNlcGFyYXRvciAmJlxuICAgICAgIW9wdGlvbnMua2V5U2VwYXJhdG9yICYmXG4gICAgICAhdGhpcy5vcHRpb25zLnVzZXJEZWZpbmVkTnNTZXBhcmF0b3IgJiZcbiAgICAgICFvcHRpb25zLm5zU2VwYXJhdG9yICYmXG4gICAgICAhdXRpbHMubG9va3NMaWtlT2JqZWN0UGF0aChrZXksIG5zU2VwYXJhdG9yLCBrZXlTZXBhcmF0b3IpO1xuICAgIGlmICh3b3VsZENoZWNrRm9yTnNJbktleSAmJiAhc2VlbXNOYXR1cmFsTGFuZ3VhZ2UpIHtcbiAgICAgIGNvbnN0IG0gPSBrZXkubWF0Y2godGhpcy5pbnRlcnBvbGF0b3IubmVzdGluZ1JlZ2V4cCk7XG4gICAgICBpZiAobSAmJiBtLmxlbmd0aCA+IDApIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBrZXksXG4gICAgICAgICAgbmFtZXNwYWNlcyxcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHBhcnRzID0ga2V5LnNwbGl0KG5zU2VwYXJhdG9yKTtcbiAgICAgIGlmIChcbiAgICAgICAgbnNTZXBhcmF0b3IgIT09IGtleVNlcGFyYXRvciB8fFxuICAgICAgICAobnNTZXBhcmF0b3IgPT09IGtleVNlcGFyYXRvciAmJiB0aGlzLm9wdGlvbnMubnMuaW5kZXhPZihwYXJ0c1swXSkgPiAtMSlcbiAgICAgIClcbiAgICAgICAgbmFtZXNwYWNlcyA9IHBhcnRzLnNoaWZ0KCk7XG4gICAgICBrZXkgPSBwYXJ0cy5qb2luKGtleVNlcGFyYXRvcik7XG4gICAgfVxuICAgIGlmICh0eXBlb2YgbmFtZXNwYWNlcyA9PT0gJ3N0cmluZycpIG5hbWVzcGFjZXMgPSBbbmFtZXNwYWNlc107XG5cbiAgICByZXR1cm4ge1xuICAgICAga2V5LFxuICAgICAgbmFtZXNwYWNlcyxcbiAgICB9O1xuICB9XG5cbiAgdHJhbnNsYXRlKGtleXMsIG9wdGlvbnMsIGxhc3RLZXkpIHtcbiAgICBpZiAodHlwZW9mIG9wdGlvbnMgIT09ICdvYmplY3QnICYmIHRoaXMub3B0aW9ucy5vdmVybG9hZFRyYW5zbGF0aW9uT3B0aW9uSGFuZGxlcikge1xuICAgICAgLyogZXNsaW50IHByZWZlci1yZXN0LXBhcmFtczogMCAqL1xuICAgICAgb3B0aW9ucyA9IHRoaXMub3B0aW9ucy5vdmVybG9hZFRyYW5zbGF0aW9uT3B0aW9uSGFuZGxlcihhcmd1bWVudHMpO1xuICAgIH1cbiAgICBpZiAodHlwZW9mIG9wdGlvbnMgPT09ICdvYmplY3QnKSBvcHRpb25zID0geyAuLi5vcHRpb25zIH07XG4gICAgaWYgKCFvcHRpb25zKSBvcHRpb25zID0ge307XG5cbiAgICAvLyBub24gdmFsaWQga2V5cyBoYW5kbGluZ1xuICAgIGlmIChrZXlzID09PSB1bmRlZmluZWQgfHwga2V5cyA9PT0gbnVsbCAvKiB8fCBrZXlzID09PSAnJyAqLykgcmV0dXJuICcnO1xuICAgIGlmICghQXJyYXkuaXNBcnJheShrZXlzKSkga2V5cyA9IFtTdHJpbmcoa2V5cyldO1xuXG4gICAgY29uc3QgcmV0dXJuRGV0YWlscyA9XG4gICAgICBvcHRpb25zLnJldHVybkRldGFpbHMgIT09IHVuZGVmaW5lZCA/IG9wdGlvbnMucmV0dXJuRGV0YWlscyA6IHRoaXMub3B0aW9ucy5yZXR1cm5EZXRhaWxzO1xuXG4gICAgLy8gc2VwYXJhdG9yc1xuICAgIGNvbnN0IGtleVNlcGFyYXRvciA9XG4gICAgICBvcHRpb25zLmtleVNlcGFyYXRvciAhPT0gdW5kZWZpbmVkID8gb3B0aW9ucy5rZXlTZXBhcmF0b3IgOiB0aGlzLm9wdGlvbnMua2V5U2VwYXJhdG9yO1xuXG4gICAgLy8gZ2V0IG5hbWVzcGFjZShzKVxuICAgIGNvbnN0IHsga2V5LCBuYW1lc3BhY2VzIH0gPSB0aGlzLmV4dHJhY3RGcm9tS2V5KGtleXNba2V5cy5sZW5ndGggLSAxXSwgb3B0aW9ucyk7XG4gICAgY29uc3QgbmFtZXNwYWNlID0gbmFtZXNwYWNlc1tuYW1lc3BhY2VzLmxlbmd0aCAtIDFdO1xuXG4gICAgLy8gcmV0dXJuIGtleSBvbiBDSU1vZGVcbiAgICBjb25zdCBsbmcgPSBvcHRpb25zLmxuZyB8fCB0aGlzLmxhbmd1YWdlO1xuICAgIGNvbnN0IGFwcGVuZE5hbWVzcGFjZVRvQ0lNb2RlID1cbiAgICAgIG9wdGlvbnMuYXBwZW5kTmFtZXNwYWNlVG9DSU1vZGUgfHwgdGhpcy5vcHRpb25zLmFwcGVuZE5hbWVzcGFjZVRvQ0lNb2RlO1xuICAgIGlmIChsbmcgJiYgbG5nLnRvTG93ZXJDYXNlKCkgPT09ICdjaW1vZGUnKSB7XG4gICAgICBpZiAoYXBwZW5kTmFtZXNwYWNlVG9DSU1vZGUpIHtcbiAgICAgICAgY29uc3QgbnNTZXBhcmF0b3IgPSBvcHRpb25zLm5zU2VwYXJhdG9yIHx8IHRoaXMub3B0aW9ucy5uc1NlcGFyYXRvcjtcbiAgICAgICAgaWYgKHJldHVybkRldGFpbHMpIHtcbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmVzOiBgJHtuYW1lc3BhY2V9JHtuc1NlcGFyYXRvcn0ke2tleX1gLFxuICAgICAgICAgICAgdXNlZEtleToga2V5LFxuICAgICAgICAgICAgZXhhY3RVc2VkS2V5OiBrZXksXG4gICAgICAgICAgICB1c2VkTG5nOiBsbmcsXG4gICAgICAgICAgICB1c2VkTlM6IG5hbWVzcGFjZSxcbiAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBgJHtuYW1lc3BhY2V9JHtuc1NlcGFyYXRvcn0ke2tleX1gO1xuICAgICAgfVxuXG4gICAgICBpZiAocmV0dXJuRGV0YWlscykge1xuICAgICAgICByZXR1cm4geyByZXM6IGtleSwgdXNlZEtleToga2V5LCBleGFjdFVzZWRLZXk6IGtleSwgdXNlZExuZzogbG5nLCB1c2VkTlM6IG5hbWVzcGFjZSB9O1xuICAgICAgfVxuICAgICAgcmV0dXJuIGtleTtcbiAgICB9XG5cbiAgICAvLyByZXNvbHZlIGZyb20gc3RvcmVcbiAgICBjb25zdCByZXNvbHZlZCA9IHRoaXMucmVzb2x2ZShrZXlzLCBvcHRpb25zKTtcbiAgICBsZXQgcmVzID0gcmVzb2x2ZWQgJiYgcmVzb2x2ZWQucmVzO1xuICAgIGNvbnN0IHJlc1VzZWRLZXkgPSAocmVzb2x2ZWQgJiYgcmVzb2x2ZWQudXNlZEtleSkgfHwga2V5O1xuICAgIGNvbnN0IHJlc0V4YWN0VXNlZEtleSA9IChyZXNvbHZlZCAmJiByZXNvbHZlZC5leGFjdFVzZWRLZXkpIHx8IGtleTtcblxuICAgIGNvbnN0IHJlc1R5cGUgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmFwcGx5KHJlcyk7XG4gICAgY29uc3Qgbm9PYmplY3QgPSBbJ1tvYmplY3QgTnVtYmVyXScsICdbb2JqZWN0IEZ1bmN0aW9uXScsICdbb2JqZWN0IFJlZ0V4cF0nXTtcbiAgICBjb25zdCBqb2luQXJyYXlzID1cbiAgICAgIG9wdGlvbnMuam9pbkFycmF5cyAhPT0gdW5kZWZpbmVkID8gb3B0aW9ucy5qb2luQXJyYXlzIDogdGhpcy5vcHRpb25zLmpvaW5BcnJheXM7XG5cbiAgICAvLyBvYmplY3RcbiAgICBjb25zdCBoYW5kbGVBc09iamVjdEluSTE4bkZvcm1hdCA9ICF0aGlzLmkxOG5Gb3JtYXQgfHwgdGhpcy5pMThuRm9ybWF0LmhhbmRsZUFzT2JqZWN0O1xuICAgIGNvbnN0IGhhbmRsZUFzT2JqZWN0ID1cbiAgICAgIHR5cGVvZiByZXMgIT09ICdzdHJpbmcnICYmIHR5cGVvZiByZXMgIT09ICdib29sZWFuJyAmJiB0eXBlb2YgcmVzICE9PSAnbnVtYmVyJztcbiAgICBpZiAoXG4gICAgICBoYW5kbGVBc09iamVjdEluSTE4bkZvcm1hdCAmJlxuICAgICAgcmVzICYmXG4gICAgICBoYW5kbGVBc09iamVjdCAmJlxuICAgICAgbm9PYmplY3QuaW5kZXhPZihyZXNUeXBlKSA8IDAgJiZcbiAgICAgICEodHlwZW9mIGpvaW5BcnJheXMgPT09ICdzdHJpbmcnICYmIHJlc1R5cGUgPT09ICdbb2JqZWN0IEFycmF5XScpXG4gICAgKSB7XG4gICAgICBpZiAoIW9wdGlvbnMucmV0dXJuT2JqZWN0cyAmJiAhdGhpcy5vcHRpb25zLnJldHVybk9iamVjdHMpIHtcbiAgICAgICAgaWYgKCF0aGlzLm9wdGlvbnMucmV0dXJuZWRPYmplY3RIYW5kbGVyKSB7XG4gICAgICAgICAgdGhpcy5sb2dnZXIud2FybignYWNjZXNzaW5nIGFuIG9iamVjdCAtIGJ1dCByZXR1cm5PYmplY3RzIG9wdGlvbnMgaXMgbm90IGVuYWJsZWQhJyk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgciA9IHRoaXMub3B0aW9ucy5yZXR1cm5lZE9iamVjdEhhbmRsZXJcbiAgICAgICAgICA/IHRoaXMub3B0aW9ucy5yZXR1cm5lZE9iamVjdEhhbmRsZXIocmVzVXNlZEtleSwgcmVzLCB7IC4uLm9wdGlvbnMsIG5zOiBuYW1lc3BhY2VzIH0pXG4gICAgICAgICAgOiBga2V5ICcke2tleX0gKCR7dGhpcy5sYW5ndWFnZX0pJyByZXR1cm5lZCBhbiBvYmplY3QgaW5zdGVhZCBvZiBzdHJpbmcuYDtcbiAgICAgICAgaWYgKHJldHVybkRldGFpbHMpIHtcbiAgICAgICAgICByZXNvbHZlZC5yZXMgPSByO1xuICAgICAgICAgIHJldHVybiByZXNvbHZlZDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcjtcbiAgICAgIH1cblxuICAgICAgLy8gaWYgd2UgZ290IGEgc2VwYXJhdG9yIHdlIGxvb3Agb3ZlciBjaGlsZHJlbiAtIGVsc2Ugd2UganVzdCByZXR1cm4gb2JqZWN0IGFzIGlzXG4gICAgICAvLyBhcyBoYXZpbmcgaXQgc2V0IHRvIGZhbHNlIG1lYW5zIG5vIGhpZXJhcmNoeSBzbyBubyBsb29rdXAgZm9yIG5lc3RlZCB2YWx1ZXNcbiAgICAgIGlmIChrZXlTZXBhcmF0b3IpIHtcbiAgICAgICAgY29uc3QgcmVzVHlwZUlzQXJyYXkgPSByZXNUeXBlID09PSAnW29iamVjdCBBcnJheV0nO1xuICAgICAgICBjb25zdCBjb3B5ID0gcmVzVHlwZUlzQXJyYXkgPyBbXSA6IHt9OyAvLyBhcHBseSBjaGlsZCB0cmFuc2xhdGlvbiBvbiBhIGNvcHlcblxuICAgICAgICAvKiBlc2xpbnQgbm8tcmVzdHJpY3RlZC1zeW50YXg6IDAgKi9cbiAgICAgICAgY29uc3QgbmV3S2V5VG9Vc2UgPSByZXNUeXBlSXNBcnJheSA/IHJlc0V4YWN0VXNlZEtleSA6IHJlc1VzZWRLZXk7XG4gICAgICAgIGZvciAoY29uc3QgbSBpbiByZXMpIHtcbiAgICAgICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHJlcywgbSkpIHtcbiAgICAgICAgICAgIGNvbnN0IGRlZXBLZXkgPSBgJHtuZXdLZXlUb1VzZX0ke2tleVNlcGFyYXRvcn0ke219YDtcbiAgICAgICAgICAgIGNvcHlbbV0gPSB0aGlzLnRyYW5zbGF0ZShkZWVwS2V5LCB7XG4gICAgICAgICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICAgICAgICAgIC4uLnsgam9pbkFycmF5czogZmFsc2UsIG5zOiBuYW1lc3BhY2VzIH0sXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmIChjb3B5W21dID09PSBkZWVwS2V5KSBjb3B5W21dID0gcmVzW21dOyAvLyBpZiBub3RoaW5nIGZvdW5kIHVzZSBvcmlnaW5hbCB2YWx1ZSBhcyBmYWxsYmFja1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXMgPSBjb3B5O1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoXG4gICAgICBoYW5kbGVBc09iamVjdEluSTE4bkZvcm1hdCAmJlxuICAgICAgdHlwZW9mIGpvaW5BcnJheXMgPT09ICdzdHJpbmcnICYmXG4gICAgICByZXNUeXBlID09PSAnW29iamVjdCBBcnJheV0nXG4gICAgKSB7XG4gICAgICAvLyBhcnJheSBzcGVjaWFsIHRyZWF0bWVudFxuICAgICAgcmVzID0gcmVzLmpvaW4oam9pbkFycmF5cyk7XG4gICAgICBpZiAocmVzKSByZXMgPSB0aGlzLmV4dGVuZFRyYW5zbGF0aW9uKHJlcywga2V5cywgb3B0aW9ucywgbGFzdEtleSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIHN0cmluZywgZW1wdHkgb3IgbnVsbFxuICAgICAgbGV0IHVzZWREZWZhdWx0ID0gZmFsc2U7XG4gICAgICBsZXQgdXNlZEtleSA9IGZhbHNlO1xuXG4gICAgICBjb25zdCBuZWVkc1BsdXJhbEhhbmRsaW5nID0gb3B0aW9ucy5jb3VudCAhPT0gdW5kZWZpbmVkICYmIHR5cGVvZiBvcHRpb25zLmNvdW50ICE9PSAnc3RyaW5nJztcbiAgICAgIGNvbnN0IGhhc0RlZmF1bHRWYWx1ZSA9IFRyYW5zbGF0b3IuaGFzRGVmYXVsdFZhbHVlKG9wdGlvbnMpO1xuICAgICAgY29uc3QgZGVmYXVsdFZhbHVlU3VmZml4ID0gbmVlZHNQbHVyYWxIYW5kbGluZ1xuICAgICAgICA/IHRoaXMucGx1cmFsUmVzb2x2ZXIuZ2V0U3VmZml4KGxuZywgb3B0aW9ucy5jb3VudCwgb3B0aW9ucylcbiAgICAgICAgOiAnJztcbiAgICAgIGNvbnN0IGRlZmF1bHRWYWx1ZVN1ZmZpeE9yZGluYWxGYWxsYmFjayA9XG4gICAgICAgIG9wdGlvbnMub3JkaW5hbCAmJiBuZWVkc1BsdXJhbEhhbmRsaW5nXG4gICAgICAgICAgPyB0aGlzLnBsdXJhbFJlc29sdmVyLmdldFN1ZmZpeChsbmcsIG9wdGlvbnMuY291bnQsIHsgb3JkaW5hbDogZmFsc2UgfSlcbiAgICAgICAgICA6ICcnO1xuICAgICAgY29uc3QgZGVmYXVsdFZhbHVlID1cbiAgICAgICAgb3B0aW9uc1tgZGVmYXVsdFZhbHVlJHtkZWZhdWx0VmFsdWVTdWZmaXh9YF0gfHxcbiAgICAgICAgb3B0aW9uc1tgZGVmYXVsdFZhbHVlJHtkZWZhdWx0VmFsdWVTdWZmaXhPcmRpbmFsRmFsbGJhY2t9YF0gfHxcbiAgICAgICAgb3B0aW9ucy5kZWZhdWx0VmFsdWU7XG5cbiAgICAgIC8vIGZhbGxiYWNrIHZhbHVlXG4gICAgICBpZiAoIXRoaXMuaXNWYWxpZExvb2t1cChyZXMpICYmIGhhc0RlZmF1bHRWYWx1ZSkge1xuICAgICAgICB1c2VkRGVmYXVsdCA9IHRydWU7XG4gICAgICAgIHJlcyA9IGRlZmF1bHRWYWx1ZTtcbiAgICAgIH1cbiAgICAgIGlmICghdGhpcy5pc1ZhbGlkTG9va3VwKHJlcykpIHtcbiAgICAgICAgdXNlZEtleSA9IHRydWU7XG4gICAgICAgIHJlcyA9IGtleTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgbWlzc2luZ0tleU5vVmFsdWVGYWxsYmFja1RvS2V5ID1cbiAgICAgICAgb3B0aW9ucy5taXNzaW5nS2V5Tm9WYWx1ZUZhbGxiYWNrVG9LZXkgfHwgdGhpcy5vcHRpb25zLm1pc3NpbmdLZXlOb1ZhbHVlRmFsbGJhY2tUb0tleTtcbiAgICAgIGNvbnN0IHJlc0Zvck1pc3NpbmcgPSBtaXNzaW5nS2V5Tm9WYWx1ZUZhbGxiYWNrVG9LZXkgJiYgdXNlZEtleSA/IHVuZGVmaW5lZCA6IHJlcztcblxuICAgICAgLy8gc2F2ZSBtaXNzaW5nXG4gICAgICBjb25zdCB1cGRhdGVNaXNzaW5nID0gaGFzRGVmYXVsdFZhbHVlICYmIGRlZmF1bHRWYWx1ZSAhPT0gcmVzICYmIHRoaXMub3B0aW9ucy51cGRhdGVNaXNzaW5nO1xuICAgICAgaWYgKHVzZWRLZXkgfHwgdXNlZERlZmF1bHQgfHwgdXBkYXRlTWlzc2luZykge1xuICAgICAgICB0aGlzLmxvZ2dlci5sb2coXG4gICAgICAgICAgdXBkYXRlTWlzc2luZyA/ICd1cGRhdGVLZXknIDogJ21pc3NpbmdLZXknLFxuICAgICAgICAgIGxuZyxcbiAgICAgICAgICBuYW1lc3BhY2UsXG4gICAgICAgICAga2V5LFxuICAgICAgICAgIHVwZGF0ZU1pc3NpbmcgPyBkZWZhdWx0VmFsdWUgOiByZXMsXG4gICAgICAgICk7XG4gICAgICAgIGlmIChrZXlTZXBhcmF0b3IpIHtcbiAgICAgICAgICBjb25zdCBmayA9IHRoaXMucmVzb2x2ZShrZXksIHsgLi4ub3B0aW9ucywga2V5U2VwYXJhdG9yOiBmYWxzZSB9KTtcbiAgICAgICAgICBpZiAoZmsgJiYgZmsucmVzKVxuICAgICAgICAgICAgdGhpcy5sb2dnZXIud2FybihcbiAgICAgICAgICAgICAgJ1NlZW1zIHRoZSBsb2FkZWQgdHJhbnNsYXRpb25zIHdlcmUgaW4gZmxhdCBKU09OIGZvcm1hdCBpbnN0ZWFkIG9mIG5lc3RlZC4gRWl0aGVyIHNldCBrZXlTZXBhcmF0b3I6IGZhbHNlIG9uIGluaXQgb3IgbWFrZSBzdXJlIHlvdXIgdHJhbnNsYXRpb25zIGFyZSBwdWJsaXNoZWQgaW4gbmVzdGVkIGZvcm1hdC4nLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBsbmdzID0gW107XG4gICAgICAgIGNvbnN0IGZhbGxiYWNrTG5ncyA9IHRoaXMubGFuZ3VhZ2VVdGlscy5nZXRGYWxsYmFja0NvZGVzKFxuICAgICAgICAgIHRoaXMub3B0aW9ucy5mYWxsYmFja0xuZyxcbiAgICAgICAgICBvcHRpb25zLmxuZyB8fCB0aGlzLmxhbmd1YWdlLFxuICAgICAgICApO1xuICAgICAgICBpZiAodGhpcy5vcHRpb25zLnNhdmVNaXNzaW5nVG8gPT09ICdmYWxsYmFjaycgJiYgZmFsbGJhY2tMbmdzICYmIGZhbGxiYWNrTG5nc1swXSkge1xuICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZmFsbGJhY2tMbmdzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBsbmdzLnB1c2goZmFsbGJhY2tMbmdzW2ldKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5vcHRpb25zLnNhdmVNaXNzaW5nVG8gPT09ICdhbGwnKSB7XG4gICAgICAgICAgbG5ncyA9IHRoaXMubGFuZ3VhZ2VVdGlscy50b1Jlc29sdmVIaWVyYXJjaHkob3B0aW9ucy5sbmcgfHwgdGhpcy5sYW5ndWFnZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbG5ncy5wdXNoKG9wdGlvbnMubG5nIHx8IHRoaXMubGFuZ3VhZ2UpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgc2VuZCA9IChsLCBrLCBzcGVjaWZpY0RlZmF1bHRWYWx1ZSkgPT4ge1xuICAgICAgICAgIGNvbnN0IGRlZmF1bHRGb3JNaXNzaW5nID1cbiAgICAgICAgICAgIGhhc0RlZmF1bHRWYWx1ZSAmJiBzcGVjaWZpY0RlZmF1bHRWYWx1ZSAhPT0gcmVzID8gc3BlY2lmaWNEZWZhdWx0VmFsdWUgOiByZXNGb3JNaXNzaW5nO1xuICAgICAgICAgIGlmICh0aGlzLm9wdGlvbnMubWlzc2luZ0tleUhhbmRsZXIpIHtcbiAgICAgICAgICAgIHRoaXMub3B0aW9ucy5taXNzaW5nS2V5SGFuZGxlcihcbiAgICAgICAgICAgICAgbCxcbiAgICAgICAgICAgICAgbmFtZXNwYWNlLFxuICAgICAgICAgICAgICBrLFxuICAgICAgICAgICAgICBkZWZhdWx0Rm9yTWlzc2luZyxcbiAgICAgICAgICAgICAgdXBkYXRlTWlzc2luZyxcbiAgICAgICAgICAgICAgb3B0aW9ucyxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfSBlbHNlIGlmICh0aGlzLmJhY2tlbmRDb25uZWN0b3IgJiYgdGhpcy5iYWNrZW5kQ29ubmVjdG9yLnNhdmVNaXNzaW5nKSB7XG4gICAgICAgICAgICB0aGlzLmJhY2tlbmRDb25uZWN0b3Iuc2F2ZU1pc3NpbmcoXG4gICAgICAgICAgICAgIGwsXG4gICAgICAgICAgICAgIG5hbWVzcGFjZSxcbiAgICAgICAgICAgICAgayxcbiAgICAgICAgICAgICAgZGVmYXVsdEZvck1pc3NpbmcsXG4gICAgICAgICAgICAgIHVwZGF0ZU1pc3NpbmcsXG4gICAgICAgICAgICAgIG9wdGlvbnMsXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH1cbiAgICAgICAgICB0aGlzLmVtaXQoJ21pc3NpbmdLZXknLCBsLCBuYW1lc3BhY2UsIGssIHJlcyk7XG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5zYXZlTWlzc2luZykge1xuICAgICAgICAgIGlmICh0aGlzLm9wdGlvbnMuc2F2ZU1pc3NpbmdQbHVyYWxzICYmIG5lZWRzUGx1cmFsSGFuZGxpbmcpIHtcbiAgICAgICAgICAgIGxuZ3MuZm9yRWFjaCgobGFuZ3VhZ2UpID0+IHtcbiAgICAgICAgICAgICAgdGhpcy5wbHVyYWxSZXNvbHZlci5nZXRTdWZmaXhlcyhsYW5ndWFnZSwgb3B0aW9ucykuZm9yRWFjaCgoc3VmZml4KSA9PiB7XG4gICAgICAgICAgICAgICAgc2VuZChbbGFuZ3VhZ2VdLCBrZXkgKyBzdWZmaXgsIG9wdGlvbnNbYGRlZmF1bHRWYWx1ZSR7c3VmZml4fWBdIHx8IGRlZmF1bHRWYWx1ZSk7XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHNlbmQobG5ncywga2V5LCBkZWZhdWx0VmFsdWUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBleHRlbmRcbiAgICAgIHJlcyA9IHRoaXMuZXh0ZW5kVHJhbnNsYXRpb24ocmVzLCBrZXlzLCBvcHRpb25zLCByZXNvbHZlZCwgbGFzdEtleSk7XG5cbiAgICAgIC8vIGFwcGVuZCBuYW1lc3BhY2UgaWYgc3RpbGwga2V5XG4gICAgICBpZiAodXNlZEtleSAmJiByZXMgPT09IGtleSAmJiB0aGlzLm9wdGlvbnMuYXBwZW5kTmFtZXNwYWNlVG9NaXNzaW5nS2V5KVxuICAgICAgICByZXMgPSBgJHtuYW1lc3BhY2V9OiR7a2V5fWA7XG5cbiAgICAgIC8vIHBhcnNlTWlzc2luZ0tleUhhbmRsZXJcbiAgICAgIGlmICgodXNlZEtleSB8fCB1c2VkRGVmYXVsdCkgJiYgdGhpcy5vcHRpb25zLnBhcnNlTWlzc2luZ0tleUhhbmRsZXIpIHtcbiAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5jb21wYXRpYmlsaXR5QVBJICE9PSAndjEnKSB7XG4gICAgICAgICAgcmVzID0gdGhpcy5vcHRpb25zLnBhcnNlTWlzc2luZ0tleUhhbmRsZXIoXG4gICAgICAgICAgICB0aGlzLm9wdGlvbnMuYXBwZW5kTmFtZXNwYWNlVG9NaXNzaW5nS2V5ID8gYCR7bmFtZXNwYWNlfToke2tleX1gIDoga2V5LFxuICAgICAgICAgICAgdXNlZERlZmF1bHQgPyByZXMgOiB1bmRlZmluZWQsXG4gICAgICAgICAgKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXMgPSB0aGlzLm9wdGlvbnMucGFyc2VNaXNzaW5nS2V5SGFuZGxlcihyZXMpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gcmV0dXJuXG4gICAgaWYgKHJldHVybkRldGFpbHMpIHtcbiAgICAgIHJlc29sdmVkLnJlcyA9IHJlcztcbiAgICAgIHJldHVybiByZXNvbHZlZDtcbiAgICB9XG4gICAgcmV0dXJuIHJlcztcbiAgfVxuXG4gIGV4dGVuZFRyYW5zbGF0aW9uKHJlcywga2V5LCBvcHRpb25zLCByZXNvbHZlZCwgbGFzdEtleSkge1xuICAgIGlmICh0aGlzLmkxOG5Gb3JtYXQgJiYgdGhpcy5pMThuRm9ybWF0LnBhcnNlKSB7XG4gICAgICByZXMgPSB0aGlzLmkxOG5Gb3JtYXQucGFyc2UoXG4gICAgICAgIHJlcyxcbiAgICAgICAgeyAuLi50aGlzLm9wdGlvbnMuaW50ZXJwb2xhdGlvbi5kZWZhdWx0VmFyaWFibGVzLCAuLi5vcHRpb25zIH0sXG4gICAgICAgIG9wdGlvbnMubG5nIHx8IHRoaXMubGFuZ3VhZ2UgfHwgcmVzb2x2ZWQudXNlZExuZyxcbiAgICAgICAgcmVzb2x2ZWQudXNlZE5TLFxuICAgICAgICByZXNvbHZlZC51c2VkS2V5LFxuICAgICAgICB7IHJlc29sdmVkIH0sXG4gICAgICApO1xuICAgIH0gZWxzZSBpZiAoIW9wdGlvbnMuc2tpcEludGVycG9sYXRpb24pIHtcbiAgICAgIC8vIGkxOG5leHQucGFyc2luZ1xuICAgICAgaWYgKG9wdGlvbnMuaW50ZXJwb2xhdGlvbilcbiAgICAgICAgdGhpcy5pbnRlcnBvbGF0b3IuaW5pdCh7XG4gICAgICAgICAgLi4ub3B0aW9ucyxcbiAgICAgICAgICAuLi57IGludGVycG9sYXRpb246IHsgLi4udGhpcy5vcHRpb25zLmludGVycG9sYXRpb24sIC4uLm9wdGlvbnMuaW50ZXJwb2xhdGlvbiB9IH0sXG4gICAgICAgIH0pO1xuICAgICAgY29uc3Qgc2tpcE9uVmFyaWFibGVzID1cbiAgICAgICAgdHlwZW9mIHJlcyA9PT0gJ3N0cmluZycgJiZcbiAgICAgICAgKG9wdGlvbnMgJiYgb3B0aW9ucy5pbnRlcnBvbGF0aW9uICYmIG9wdGlvbnMuaW50ZXJwb2xhdGlvbi5za2lwT25WYXJpYWJsZXMgIT09IHVuZGVmaW5lZFxuICAgICAgICAgID8gb3B0aW9ucy5pbnRlcnBvbGF0aW9uLnNraXBPblZhcmlhYmxlc1xuICAgICAgICAgIDogdGhpcy5vcHRpb25zLmludGVycG9sYXRpb24uc2tpcE9uVmFyaWFibGVzKTtcbiAgICAgIGxldCBuZXN0QmVmO1xuICAgICAgaWYgKHNraXBPblZhcmlhYmxlcykge1xuICAgICAgICBjb25zdCBuYiA9IHJlcy5tYXRjaCh0aGlzLmludGVycG9sYXRvci5uZXN0aW5nUmVnZXhwKTtcbiAgICAgICAgLy8gaGFzIG5lc3RpbmcgYWZ0YmVmb3JlZXIgaW50ZXJwb2xhdGlvblxuICAgICAgICBuZXN0QmVmID0gbmIgJiYgbmIubGVuZ3RoO1xuICAgICAgfVxuXG4gICAgICAvLyBpbnRlcnBvbGF0ZVxuICAgICAgbGV0IGRhdGEgPSBvcHRpb25zLnJlcGxhY2UgJiYgdHlwZW9mIG9wdGlvbnMucmVwbGFjZSAhPT0gJ3N0cmluZycgPyBvcHRpb25zLnJlcGxhY2UgOiBvcHRpb25zO1xuICAgICAgaWYgKHRoaXMub3B0aW9ucy5pbnRlcnBvbGF0aW9uLmRlZmF1bHRWYXJpYWJsZXMpXG4gICAgICAgIGRhdGEgPSB7IC4uLnRoaXMub3B0aW9ucy5pbnRlcnBvbGF0aW9uLmRlZmF1bHRWYXJpYWJsZXMsIC4uLmRhdGEgfTtcbiAgICAgIHJlcyA9IHRoaXMuaW50ZXJwb2xhdG9yLmludGVycG9sYXRlKHJlcywgZGF0YSwgb3B0aW9ucy5sbmcgfHwgdGhpcy5sYW5ndWFnZSwgb3B0aW9ucyk7XG5cbiAgICAgIC8vIG5lc3RpbmdcbiAgICAgIGlmIChza2lwT25WYXJpYWJsZXMpIHtcbiAgICAgICAgY29uc3QgbmEgPSByZXMubWF0Y2godGhpcy5pbnRlcnBvbGF0b3IubmVzdGluZ1JlZ2V4cCk7XG4gICAgICAgIC8vIGhhcyBuZXN0aW5nIGFmdGVyIGludGVycG9sYXRpb25cbiAgICAgICAgY29uc3QgbmVzdEFmdCA9IG5hICYmIG5hLmxlbmd0aDtcbiAgICAgICAgaWYgKG5lc3RCZWYgPCBuZXN0QWZ0KSBvcHRpb25zLm5lc3QgPSBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGlmICghb3B0aW9ucy5sbmcgJiYgdGhpcy5vcHRpb25zLmNvbXBhdGliaWxpdHlBUEkgIT09ICd2MScgJiYgcmVzb2x2ZWQgJiYgcmVzb2x2ZWQucmVzKVxuICAgICAgICBvcHRpb25zLmxuZyA9IHJlc29sdmVkLnVzZWRMbmc7XG4gICAgICBpZiAob3B0aW9ucy5uZXN0ICE9PSBmYWxzZSlcbiAgICAgICAgcmVzID0gdGhpcy5pbnRlcnBvbGF0b3IubmVzdChcbiAgICAgICAgICByZXMsXG4gICAgICAgICAgKC4uLmFyZ3MpID0+IHtcbiAgICAgICAgICAgIGlmIChsYXN0S2V5ICYmIGxhc3RLZXlbMF0gPT09IGFyZ3NbMF0gJiYgIW9wdGlvbnMuY29udGV4dCkge1xuICAgICAgICAgICAgICB0aGlzLmxvZ2dlci53YXJuKFxuICAgICAgICAgICAgICAgIGBJdCBzZWVtcyB5b3UgYXJlIG5lc3RpbmcgcmVjdXJzaXZlbHkga2V5OiAke2FyZ3NbMF19IGluIGtleTogJHtrZXlbMF19YCxcbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhpcy50cmFuc2xhdGUoLi4uYXJncywga2V5KTtcbiAgICAgICAgICB9LFxuICAgICAgICAgIG9wdGlvbnMsXG4gICAgICAgICk7XG5cbiAgICAgIGlmIChvcHRpb25zLmludGVycG9sYXRpb24pIHRoaXMuaW50ZXJwb2xhdG9yLnJlc2V0KCk7XG4gICAgfVxuXG4gICAgLy8gcG9zdCBwcm9jZXNzXG4gICAgY29uc3QgcG9zdFByb2Nlc3MgPSBvcHRpb25zLnBvc3RQcm9jZXNzIHx8IHRoaXMub3B0aW9ucy5wb3N0UHJvY2VzcztcbiAgICBjb25zdCBwb3N0UHJvY2Vzc29yTmFtZXMgPSB0eXBlb2YgcG9zdFByb2Nlc3MgPT09ICdzdHJpbmcnID8gW3Bvc3RQcm9jZXNzXSA6IHBvc3RQcm9jZXNzO1xuXG4gICAgaWYgKFxuICAgICAgcmVzICE9PSB1bmRlZmluZWQgJiZcbiAgICAgIHJlcyAhPT0gbnVsbCAmJlxuICAgICAgcG9zdFByb2Nlc3Nvck5hbWVzICYmXG4gICAgICBwb3N0UHJvY2Vzc29yTmFtZXMubGVuZ3RoICYmXG4gICAgICBvcHRpb25zLmFwcGx5UG9zdFByb2Nlc3NvciAhPT0gZmFsc2VcbiAgICApIHtcbiAgICAgIHJlcyA9IHBvc3RQcm9jZXNzb3IuaGFuZGxlKFxuICAgICAgICBwb3N0UHJvY2Vzc29yTmFtZXMsXG4gICAgICAgIHJlcyxcbiAgICAgICAga2V5LFxuICAgICAgICB0aGlzLm9wdGlvbnMgJiYgdGhpcy5vcHRpb25zLnBvc3RQcm9jZXNzUGFzc1Jlc29sdmVkXG4gICAgICAgICAgPyB7IGkxOG5SZXNvbHZlZDogcmVzb2x2ZWQsIC4uLm9wdGlvbnMgfVxuICAgICAgICAgIDogb3B0aW9ucyxcbiAgICAgICAgdGhpcyxcbiAgICAgICk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlcztcbiAgfVxuXG4gIHJlc29sdmUoa2V5cywgb3B0aW9ucyA9IHt9KSB7XG4gICAgbGV0IGZvdW5kO1xuICAgIGxldCB1c2VkS2V5OyAvLyBwbGFpbiBrZXlcbiAgICBsZXQgZXhhY3RVc2VkS2V5OyAvLyBrZXkgd2l0aCBjb250ZXh0IC8gcGx1cmFsXG4gICAgbGV0IHVzZWRMbmc7XG4gICAgbGV0IHVzZWROUztcblxuICAgIGlmICh0eXBlb2Yga2V5cyA9PT0gJ3N0cmluZycpIGtleXMgPSBba2V5c107XG5cbiAgICAvLyBmb3JFYWNoIHBvc3NpYmxlIGtleVxuICAgIGtleXMuZm9yRWFjaCgoaykgPT4ge1xuICAgICAgaWYgKHRoaXMuaXNWYWxpZExvb2t1cChmb3VuZCkpIHJldHVybjtcbiAgICAgIGNvbnN0IGV4dHJhY3RlZCA9IHRoaXMuZXh0cmFjdEZyb21LZXkoaywgb3B0aW9ucyk7XG4gICAgICBjb25zdCBrZXkgPSBleHRyYWN0ZWQua2V5O1xuICAgICAgdXNlZEtleSA9IGtleTtcbiAgICAgIGxldCBuYW1lc3BhY2VzID0gZXh0cmFjdGVkLm5hbWVzcGFjZXM7XG4gICAgICBpZiAodGhpcy5vcHRpb25zLmZhbGxiYWNrTlMpIG5hbWVzcGFjZXMgPSBuYW1lc3BhY2VzLmNvbmNhdCh0aGlzLm9wdGlvbnMuZmFsbGJhY2tOUyk7XG5cbiAgICAgIGNvbnN0IG5lZWRzUGx1cmFsSGFuZGxpbmcgPSBvcHRpb25zLmNvdW50ICE9PSB1bmRlZmluZWQgJiYgdHlwZW9mIG9wdGlvbnMuY291bnQgIT09ICdzdHJpbmcnO1xuICAgICAgY29uc3QgbmVlZHNaZXJvU3VmZml4TG9va3VwID1cbiAgICAgICAgbmVlZHNQbHVyYWxIYW5kbGluZyAmJlxuICAgICAgICAhb3B0aW9ucy5vcmRpbmFsICYmXG4gICAgICAgIG9wdGlvbnMuY291bnQgPT09IDAgJiZcbiAgICAgICAgdGhpcy5wbHVyYWxSZXNvbHZlci5zaG91bGRVc2VJbnRsQXBpKCk7XG4gICAgICBjb25zdCBuZWVkc0NvbnRleHRIYW5kbGluZyA9XG4gICAgICAgIG9wdGlvbnMuY29udGV4dCAhPT0gdW5kZWZpbmVkICYmXG4gICAgICAgICh0eXBlb2Ygb3B0aW9ucy5jb250ZXh0ID09PSAnc3RyaW5nJyB8fCB0eXBlb2Ygb3B0aW9ucy5jb250ZXh0ID09PSAnbnVtYmVyJykgJiZcbiAgICAgICAgb3B0aW9ucy5jb250ZXh0ICE9PSAnJztcblxuICAgICAgY29uc3QgY29kZXMgPSBvcHRpb25zLmxuZ3NcbiAgICAgICAgPyBvcHRpb25zLmxuZ3NcbiAgICAgICAgOiB0aGlzLmxhbmd1YWdlVXRpbHMudG9SZXNvbHZlSGllcmFyY2h5KG9wdGlvbnMubG5nIHx8IHRoaXMubGFuZ3VhZ2UsIG9wdGlvbnMuZmFsbGJhY2tMbmcpO1xuXG4gICAgICBuYW1lc3BhY2VzLmZvckVhY2goKG5zKSA9PiB7XG4gICAgICAgIGlmICh0aGlzLmlzVmFsaWRMb29rdXAoZm91bmQpKSByZXR1cm47XG4gICAgICAgIHVzZWROUyA9IG5zO1xuXG4gICAgICAgIGlmIChcbiAgICAgICAgICAhY2hlY2tlZExvYWRlZEZvcltgJHtjb2Rlc1swXX0tJHtuc31gXSAmJlxuICAgICAgICAgIHRoaXMudXRpbHMgJiZcbiAgICAgICAgICB0aGlzLnV0aWxzLmhhc0xvYWRlZE5hbWVzcGFjZSAmJlxuICAgICAgICAgICF0aGlzLnV0aWxzLmhhc0xvYWRlZE5hbWVzcGFjZSh1c2VkTlMpXG4gICAgICAgICkge1xuICAgICAgICAgIGNoZWNrZWRMb2FkZWRGb3JbYCR7Y29kZXNbMF19LSR7bnN9YF0gPSB0cnVlO1xuICAgICAgICAgIHRoaXMubG9nZ2VyLndhcm4oXG4gICAgICAgICAgICBga2V5IFwiJHt1c2VkS2V5fVwiIGZvciBsYW5ndWFnZXMgXCIke2NvZGVzLmpvaW4oXG4gICAgICAgICAgICAgICcsICcsXG4gICAgICAgICAgICApfVwiIHdvbid0IGdldCByZXNvbHZlZCBhcyBuYW1lc3BhY2UgXCIke3VzZWROU31cIiB3YXMgbm90IHlldCBsb2FkZWRgLFxuICAgICAgICAgICAgJ1RoaXMgbWVhbnMgc29tZXRoaW5nIElTIFdST05HIGluIHlvdXIgc2V0dXAuIFlvdSBhY2Nlc3MgdGhlIHQgZnVuY3Rpb24gYmVmb3JlIGkxOG5leHQuaW5pdCAvIGkxOG5leHQubG9hZE5hbWVzcGFjZSAvIGkxOG5leHQuY2hhbmdlTGFuZ3VhZ2Ugd2FzIGRvbmUuIFdhaXQgZm9yIHRoZSBjYWxsYmFjayBvciBQcm9taXNlIHRvIHJlc29sdmUgYmVmb3JlIGFjY2Vzc2luZyBpdCEhIScsXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvZGVzLmZvckVhY2goKGNvZGUpID0+IHtcbiAgICAgICAgICBpZiAodGhpcy5pc1ZhbGlkTG9va3VwKGZvdW5kKSkgcmV0dXJuO1xuICAgICAgICAgIHVzZWRMbmcgPSBjb2RlO1xuXG4gICAgICAgICAgY29uc3QgZmluYWxLZXlzID0gW2tleV07XG5cbiAgICAgICAgICBpZiAodGhpcy5pMThuRm9ybWF0ICYmIHRoaXMuaTE4bkZvcm1hdC5hZGRMb29rdXBLZXlzKSB7XG4gICAgICAgICAgICB0aGlzLmkxOG5Gb3JtYXQuYWRkTG9va3VwS2V5cyhmaW5hbEtleXMsIGtleSwgY29kZSwgbnMsIG9wdGlvbnMpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsZXQgcGx1cmFsU3VmZml4O1xuICAgICAgICAgICAgaWYgKG5lZWRzUGx1cmFsSGFuZGxpbmcpXG4gICAgICAgICAgICAgIHBsdXJhbFN1ZmZpeCA9IHRoaXMucGx1cmFsUmVzb2x2ZXIuZ2V0U3VmZml4KGNvZGUsIG9wdGlvbnMuY291bnQsIG9wdGlvbnMpO1xuICAgICAgICAgICAgY29uc3QgemVyb1N1ZmZpeCA9IGAke3RoaXMub3B0aW9ucy5wbHVyYWxTZXBhcmF0b3J9emVyb2A7XG4gICAgICAgICAgICBjb25zdCBvcmRpbmFsUHJlZml4ID0gYCR7dGhpcy5vcHRpb25zLnBsdXJhbFNlcGFyYXRvcn1vcmRpbmFsJHt0aGlzLm9wdGlvbnMucGx1cmFsU2VwYXJhdG9yfWA7XG4gICAgICAgICAgICAvLyBnZXQga2V5IGZvciBwbHVyYWwgaWYgbmVlZGVkXG4gICAgICAgICAgICBpZiAobmVlZHNQbHVyYWxIYW5kbGluZykge1xuICAgICAgICAgICAgICBmaW5hbEtleXMucHVzaChrZXkgKyBwbHVyYWxTdWZmaXgpO1xuICAgICAgICAgICAgICBpZiAob3B0aW9ucy5vcmRpbmFsICYmIHBsdXJhbFN1ZmZpeC5pbmRleE9mKG9yZGluYWxQcmVmaXgpID09PSAwKSB7XG4gICAgICAgICAgICAgICAgZmluYWxLZXlzLnB1c2goXG4gICAgICAgICAgICAgICAgICBrZXkgKyBwbHVyYWxTdWZmaXgucmVwbGFjZShvcmRpbmFsUHJlZml4LCB0aGlzLm9wdGlvbnMucGx1cmFsU2VwYXJhdG9yKSxcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGlmIChuZWVkc1plcm9TdWZmaXhMb29rdXApIHtcbiAgICAgICAgICAgICAgICBmaW5hbEtleXMucHVzaChrZXkgKyB6ZXJvU3VmZml4KTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBnZXQga2V5IGZvciBjb250ZXh0IGlmIG5lZWRlZFxuICAgICAgICAgICAgaWYgKG5lZWRzQ29udGV4dEhhbmRsaW5nKSB7XG4gICAgICAgICAgICAgIGNvbnN0IGNvbnRleHRLZXkgPSBgJHtrZXl9JHt0aGlzLm9wdGlvbnMuY29udGV4dFNlcGFyYXRvcn0ke29wdGlvbnMuY29udGV4dH1gO1xuICAgICAgICAgICAgICBmaW5hbEtleXMucHVzaChjb250ZXh0S2V5KTtcblxuICAgICAgICAgICAgICAvLyBnZXQga2V5IGZvciBjb250ZXh0ICsgcGx1cmFsIGlmIG5lZWRlZFxuICAgICAgICAgICAgICBpZiAobmVlZHNQbHVyYWxIYW5kbGluZykge1xuICAgICAgICAgICAgICAgIGZpbmFsS2V5cy5wdXNoKGNvbnRleHRLZXkgKyBwbHVyYWxTdWZmaXgpO1xuICAgICAgICAgICAgICAgIGlmIChvcHRpb25zLm9yZGluYWwgJiYgcGx1cmFsU3VmZml4LmluZGV4T2Yob3JkaW5hbFByZWZpeCkgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgIGZpbmFsS2V5cy5wdXNoKFxuICAgICAgICAgICAgICAgICAgICBjb250ZXh0S2V5ICsgcGx1cmFsU3VmZml4LnJlcGxhY2Uob3JkaW5hbFByZWZpeCwgdGhpcy5vcHRpb25zLnBsdXJhbFNlcGFyYXRvciksXG4gICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAobmVlZHNaZXJvU3VmZml4TG9va3VwKSB7XG4gICAgICAgICAgICAgICAgICBmaW5hbEtleXMucHVzaChjb250ZXh0S2V5ICsgemVyb1N1ZmZpeCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gaXRlcmF0ZSBvdmVyIGZpbmFsS2V5cyBzdGFydGluZyB3aXRoIG1vc3Qgc3BlY2lmaWMgcGx1cmFsa2V5ICgtPiBjb250ZXh0a2V5IG9ubHkpIC0+IHNpbmd1bGFya2V5IG9ubHlcbiAgICAgICAgICBsZXQgcG9zc2libGVLZXk7XG4gICAgICAgICAgLyogZXNsaW50IG5vLWNvbmQtYXNzaWduOiAwICovXG4gICAgICAgICAgd2hpbGUgKChwb3NzaWJsZUtleSA9IGZpbmFsS2V5cy5wb3AoKSkpIHtcbiAgICAgICAgICAgIGlmICghdGhpcy5pc1ZhbGlkTG9va3VwKGZvdW5kKSkge1xuICAgICAgICAgICAgICBleGFjdFVzZWRLZXkgPSBwb3NzaWJsZUtleTtcbiAgICAgICAgICAgICAgZm91bmQgPSB0aGlzLmdldFJlc291cmNlKGNvZGUsIG5zLCBwb3NzaWJsZUtleSwgb3B0aW9ucyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHsgcmVzOiBmb3VuZCwgdXNlZEtleSwgZXhhY3RVc2VkS2V5LCB1c2VkTG5nLCB1c2VkTlMgfTtcbiAgfVxuXG4gIGlzVmFsaWRMb29rdXAocmVzKSB7XG4gICAgcmV0dXJuIChcbiAgICAgIHJlcyAhPT0gdW5kZWZpbmVkICYmXG4gICAgICAhKCF0aGlzLm9wdGlvbnMucmV0dXJuTnVsbCAmJiByZXMgPT09IG51bGwpICYmXG4gICAgICAhKCF0aGlzLm9wdGlvbnMucmV0dXJuRW1wdHlTdHJpbmcgJiYgcmVzID09PSAnJylcbiAgICApO1xuICB9XG5cbiAgZ2V0UmVzb3VyY2UoY29kZSwgbnMsIGtleSwgb3B0aW9ucyA9IHt9KSB7XG4gICAgaWYgKHRoaXMuaTE4bkZvcm1hdCAmJiB0aGlzLmkxOG5Gb3JtYXQuZ2V0UmVzb3VyY2UpXG4gICAgICByZXR1cm4gdGhpcy5pMThuRm9ybWF0LmdldFJlc291cmNlKGNvZGUsIG5zLCBrZXksIG9wdGlvbnMpO1xuICAgIHJldHVybiB0aGlzLnJlc291cmNlU3RvcmUuZ2V0UmVzb3VyY2UoY29kZSwgbnMsIGtleSwgb3B0aW9ucyk7XG4gIH1cblxuICBzdGF0aWMgaGFzRGVmYXVsdFZhbHVlKG9wdGlvbnMpIHtcbiAgICBjb25zdCBwcmVmaXggPSAnZGVmYXVsdFZhbHVlJztcblxuICAgIGZvciAoY29uc3Qgb3B0aW9uIGluIG9wdGlvbnMpIHtcbiAgICAgIGlmIChcbiAgICAgICAgT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9wdGlvbnMsIG9wdGlvbikgJiZcbiAgICAgICAgcHJlZml4ID09PSBvcHRpb24uc3Vic3RyaW5nKDAsIHByZWZpeC5sZW5ndGgpICYmXG4gICAgICAgIHVuZGVmaW5lZCAhPT0gb3B0aW9uc1tvcHRpb25dXG4gICAgICApIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IFRyYW5zbGF0b3I7XG4iLCJpbXBvcnQgYmFzZUxvZ2dlciBmcm9tICcuL2xvZ2dlci5qcyc7XG5pbXBvcnQgeyBnZXRDbGVhbmVkQ29kZSB9IGZyb20gJy4vdXRpbHMuanMnO1xuXG5mdW5jdGlvbiBjYXBpdGFsaXplKHN0cmluZykge1xuICByZXR1cm4gc3RyaW5nLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgc3RyaW5nLnNsaWNlKDEpO1xufVxuXG5jbGFzcyBMYW5ndWFnZVV0aWwge1xuICBjb25zdHJ1Y3RvcihvcHRpb25zKSB7XG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcblxuICAgIHRoaXMuc3VwcG9ydGVkTG5ncyA9IHRoaXMub3B0aW9ucy5zdXBwb3J0ZWRMbmdzIHx8IGZhbHNlO1xuICAgIHRoaXMubG9nZ2VyID0gYmFzZUxvZ2dlci5jcmVhdGUoJ2xhbmd1YWdlVXRpbHMnKTtcbiAgfVxuXG4gIGdldFNjcmlwdFBhcnRGcm9tQ29kZShjb2RlKSB7XG4gICAgY29kZSA9IGdldENsZWFuZWRDb2RlKGNvZGUpO1xuICAgIGlmICghY29kZSB8fCBjb2RlLmluZGV4T2YoJy0nKSA8IDApIHJldHVybiBudWxsO1xuXG4gICAgY29uc3QgcCA9IGNvZGUuc3BsaXQoJy0nKTtcbiAgICBpZiAocC5sZW5ndGggPT09IDIpIHJldHVybiBudWxsO1xuICAgIHAucG9wKCk7XG4gICAgaWYgKHBbcC5sZW5ndGggLSAxXS50b0xvd2VyQ2FzZSgpID09PSAneCcpIHJldHVybiBudWxsO1xuICAgIHJldHVybiB0aGlzLmZvcm1hdExhbmd1YWdlQ29kZShwLmpvaW4oJy0nKSk7XG4gIH1cblxuICBnZXRMYW5ndWFnZVBhcnRGcm9tQ29kZShjb2RlKSB7XG4gICAgY29kZSA9IGdldENsZWFuZWRDb2RlKGNvZGUpO1xuICAgIGlmICghY29kZSB8fCBjb2RlLmluZGV4T2YoJy0nKSA8IDApIHJldHVybiBjb2RlO1xuXG4gICAgY29uc3QgcCA9IGNvZGUuc3BsaXQoJy0nKTtcbiAgICByZXR1cm4gdGhpcy5mb3JtYXRMYW5ndWFnZUNvZGUocFswXSk7XG4gIH1cblxuICBmb3JtYXRMYW5ndWFnZUNvZGUoY29kZSkge1xuICAgIC8vIGh0dHA6Ly93d3cuaWFuYS5vcmcvYXNzaWdubWVudHMvbGFuZ3VhZ2UtdGFncy9sYW5ndWFnZS10YWdzLnhodG1sXG4gICAgaWYgKHR5cGVvZiBjb2RlID09PSAnc3RyaW5nJyAmJiBjb2RlLmluZGV4T2YoJy0nKSA+IC0xKSB7XG4gICAgICBjb25zdCBzcGVjaWFsQ2FzZXMgPSBbJ2hhbnMnLCAnaGFudCcsICdsYXRuJywgJ2N5cmwnLCAnY2FucycsICdtb25nJywgJ2FyYWInXTtcbiAgICAgIGxldCBwID0gY29kZS5zcGxpdCgnLScpO1xuXG4gICAgICBpZiAodGhpcy5vcHRpb25zLmxvd2VyQ2FzZUxuZykge1xuICAgICAgICBwID0gcC5tYXAoKHBhcnQpID0+IHBhcnQudG9Mb3dlckNhc2UoKSk7XG4gICAgICB9IGVsc2UgaWYgKHAubGVuZ3RoID09PSAyKSB7XG4gICAgICAgIHBbMF0gPSBwWzBdLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgIHBbMV0gPSBwWzFdLnRvVXBwZXJDYXNlKCk7XG5cbiAgICAgICAgaWYgKHNwZWNpYWxDYXNlcy5pbmRleE9mKHBbMV0udG9Mb3dlckNhc2UoKSkgPiAtMSkgcFsxXSA9IGNhcGl0YWxpemUocFsxXS50b0xvd2VyQ2FzZSgpKTtcbiAgICAgIH0gZWxzZSBpZiAocC5sZW5ndGggPT09IDMpIHtcbiAgICAgICAgcFswXSA9IHBbMF0udG9Mb3dlckNhc2UoKTtcblxuICAgICAgICAvLyBpZiBsZW5ndGggMiBndWVzcyBpdCdzIGEgY291bnRyeVxuICAgICAgICBpZiAocFsxXS5sZW5ndGggPT09IDIpIHBbMV0gPSBwWzFdLnRvVXBwZXJDYXNlKCk7XG4gICAgICAgIGlmIChwWzBdICE9PSAnc2duJyAmJiBwWzJdLmxlbmd0aCA9PT0gMikgcFsyXSA9IHBbMl0udG9VcHBlckNhc2UoKTtcblxuICAgICAgICBpZiAoc3BlY2lhbENhc2VzLmluZGV4T2YocFsxXS50b0xvd2VyQ2FzZSgpKSA+IC0xKSBwWzFdID0gY2FwaXRhbGl6ZShwWzFdLnRvTG93ZXJDYXNlKCkpO1xuICAgICAgICBpZiAoc3BlY2lhbENhc2VzLmluZGV4T2YocFsyXS50b0xvd2VyQ2FzZSgpKSA+IC0xKSBwWzJdID0gY2FwaXRhbGl6ZShwWzJdLnRvTG93ZXJDYXNlKCkpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gcC5qb2luKCctJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMub3B0aW9ucy5jbGVhbkNvZGUgfHwgdGhpcy5vcHRpb25zLmxvd2VyQ2FzZUxuZyA/IGNvZGUudG9Mb3dlckNhc2UoKSA6IGNvZGU7XG4gIH1cblxuICBpc1N1cHBvcnRlZENvZGUoY29kZSkge1xuICAgIGlmICh0aGlzLm9wdGlvbnMubG9hZCA9PT0gJ2xhbmd1YWdlT25seScgfHwgdGhpcy5vcHRpb25zLm5vbkV4cGxpY2l0U3VwcG9ydGVkTG5ncykge1xuICAgICAgY29kZSA9IHRoaXMuZ2V0TGFuZ3VhZ2VQYXJ0RnJvbUNvZGUoY29kZSk7XG4gICAgfVxuICAgIHJldHVybiAoXG4gICAgICAhdGhpcy5zdXBwb3J0ZWRMbmdzIHx8ICF0aGlzLnN1cHBvcnRlZExuZ3MubGVuZ3RoIHx8IHRoaXMuc3VwcG9ydGVkTG5ncy5pbmRleE9mKGNvZGUpID4gLTFcbiAgICApO1xuICB9XG5cbiAgZ2V0QmVzdE1hdGNoRnJvbUNvZGVzKGNvZGVzKSB7XG4gICAgaWYgKCFjb2RlcykgcmV0dXJuIG51bGw7XG5cbiAgICBsZXQgZm91bmQ7XG5cbiAgICAvLyBwaWNrIGZpcnN0IHN1cHBvcnRlZCBjb2RlIG9yIGlmIG5vIHJlc3RyaWN0aW9uIHBpY2sgdGhlIGZpcnN0IG9uZSAoaGlnaGVzdCBwcmlvKVxuICAgIGNvZGVzLmZvckVhY2goKGNvZGUpID0+IHtcbiAgICAgIGlmIChmb3VuZCkgcmV0dXJuO1xuICAgICAgY29uc3QgY2xlYW5lZExuZyA9IHRoaXMuZm9ybWF0TGFuZ3VhZ2VDb2RlKGNvZGUpO1xuICAgICAgaWYgKCF0aGlzLm9wdGlvbnMuc3VwcG9ydGVkTG5ncyB8fCB0aGlzLmlzU3VwcG9ydGVkQ29kZShjbGVhbmVkTG5nKSkgZm91bmQgPSBjbGVhbmVkTG5nO1xuICAgIH0pO1xuXG4gICAgLy8gaWYgd2UgZ290IG5vIG1hdGNoIGluIHN1cHBvcnRlZExuZ3MgeWV0IC0gY2hlY2sgZm9yIHNpbWlsYXIgbG9jYWxlc1xuICAgIC8vIGZpcnN0ICBkZS1DSCAtLT4gZGVcbiAgICAvLyBzZWNvbmQgZGUtQ0ggLS0+IGRlLURFXG4gICAgaWYgKCFmb3VuZCAmJiB0aGlzLm9wdGlvbnMuc3VwcG9ydGVkTG5ncykge1xuICAgICAgY29kZXMuZm9yRWFjaCgoY29kZSkgPT4ge1xuICAgICAgICBpZiAoZm91bmQpIHJldHVybjtcblxuICAgICAgICBjb25zdCBsbmdPbmx5ID0gdGhpcy5nZXRMYW5ndWFnZVBhcnRGcm9tQ29kZShjb2RlKTtcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLXJldHVybi1hc3NpZ25cbiAgICAgICAgaWYgKHRoaXMuaXNTdXBwb3J0ZWRDb2RlKGxuZ09ubHkpKSByZXR1cm4gKGZvdW5kID0gbG5nT25seSk7XG5cbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIGFycmF5LWNhbGxiYWNrLXJldHVyblxuICAgICAgICBmb3VuZCA9IHRoaXMub3B0aW9ucy5zdXBwb3J0ZWRMbmdzLmZpbmQoKHN1cHBvcnRlZExuZykgPT4ge1xuICAgICAgICAgIGlmIChzdXBwb3J0ZWRMbmcgPT09IGxuZ09ubHkpIHJldHVybiBzdXBwb3J0ZWRMbmc7XG4gICAgICAgICAgaWYgKHN1cHBvcnRlZExuZy5pbmRleE9mKCctJykgPCAwICYmIGxuZ09ubHkuaW5kZXhPZignLScpIDwgMCkgcmV0dXJuO1xuICAgICAgICAgIGlmIChzdXBwb3J0ZWRMbmcuaW5kZXhPZihsbmdPbmx5KSA9PT0gMCkgcmV0dXJuIHN1cHBvcnRlZExuZztcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBpZiBub3RoaW5nIGZvdW5kLCB1c2UgZmFsbGJhY2tMbmdcbiAgICBpZiAoIWZvdW5kKSBmb3VuZCA9IHRoaXMuZ2V0RmFsbGJhY2tDb2Rlcyh0aGlzLm9wdGlvbnMuZmFsbGJhY2tMbmcpWzBdO1xuXG4gICAgcmV0dXJuIGZvdW5kO1xuICB9XG5cbiAgZ2V0RmFsbGJhY2tDb2RlcyhmYWxsYmFja3MsIGNvZGUpIHtcbiAgICBpZiAoIWZhbGxiYWNrcykgcmV0dXJuIFtdO1xuICAgIGlmICh0eXBlb2YgZmFsbGJhY2tzID09PSAnZnVuY3Rpb24nKSBmYWxsYmFja3MgPSBmYWxsYmFja3MoY29kZSk7XG4gICAgaWYgKHR5cGVvZiBmYWxsYmFja3MgPT09ICdzdHJpbmcnKSBmYWxsYmFja3MgPSBbZmFsbGJhY2tzXTtcbiAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5hcHBseShmYWxsYmFja3MpID09PSAnW29iamVjdCBBcnJheV0nKSByZXR1cm4gZmFsbGJhY2tzO1xuXG4gICAgaWYgKCFjb2RlKSByZXR1cm4gZmFsbGJhY2tzLmRlZmF1bHQgfHwgW107XG5cbiAgICAvLyBhc3N1bWUgd2UgaGF2ZSBhbiBvYmplY3QgZGVmaW5pbmcgZmFsbGJhY2tzXG4gICAgbGV0IGZvdW5kID0gZmFsbGJhY2tzW2NvZGVdO1xuICAgIGlmICghZm91bmQpIGZvdW5kID0gZmFsbGJhY2tzW3RoaXMuZ2V0U2NyaXB0UGFydEZyb21Db2RlKGNvZGUpXTtcbiAgICBpZiAoIWZvdW5kKSBmb3VuZCA9IGZhbGxiYWNrc1t0aGlzLmZvcm1hdExhbmd1YWdlQ29kZShjb2RlKV07XG4gICAgaWYgKCFmb3VuZCkgZm91bmQgPSBmYWxsYmFja3NbdGhpcy5nZXRMYW5ndWFnZVBhcnRGcm9tQ29kZShjb2RlKV07XG4gICAgaWYgKCFmb3VuZCkgZm91bmQgPSBmYWxsYmFja3MuZGVmYXVsdDtcblxuICAgIHJldHVybiBmb3VuZCB8fCBbXTtcbiAgfVxuXG4gIHRvUmVzb2x2ZUhpZXJhcmNoeShjb2RlLCBmYWxsYmFja0NvZGUpIHtcbiAgICBjb25zdCBmYWxsYmFja0NvZGVzID0gdGhpcy5nZXRGYWxsYmFja0NvZGVzKFxuICAgICAgZmFsbGJhY2tDb2RlIHx8IHRoaXMub3B0aW9ucy5mYWxsYmFja0xuZyB8fCBbXSxcbiAgICAgIGNvZGUsXG4gICAgKTtcblxuICAgIGNvbnN0IGNvZGVzID0gW107XG4gICAgY29uc3QgYWRkQ29kZSA9IChjKSA9PiB7XG4gICAgICBpZiAoIWMpIHJldHVybjtcbiAgICAgIGlmICh0aGlzLmlzU3VwcG9ydGVkQ29kZShjKSkge1xuICAgICAgICBjb2Rlcy5wdXNoKGMpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5sb2dnZXIud2FybihgcmVqZWN0aW5nIGxhbmd1YWdlIGNvZGUgbm90IGZvdW5kIGluIHN1cHBvcnRlZExuZ3M6ICR7Y31gKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgaWYgKHR5cGVvZiBjb2RlID09PSAnc3RyaW5nJyAmJiAoY29kZS5pbmRleE9mKCctJykgPiAtMSB8fCBjb2RlLmluZGV4T2YoJ18nKSA+IC0xKSkge1xuICAgICAgaWYgKHRoaXMub3B0aW9ucy5sb2FkICE9PSAnbGFuZ3VhZ2VPbmx5JykgYWRkQ29kZSh0aGlzLmZvcm1hdExhbmd1YWdlQ29kZShjb2RlKSk7XG4gICAgICBpZiAodGhpcy5vcHRpb25zLmxvYWQgIT09ICdsYW5ndWFnZU9ubHknICYmIHRoaXMub3B0aW9ucy5sb2FkICE9PSAnY3VycmVudE9ubHknKVxuICAgICAgICBhZGRDb2RlKHRoaXMuZ2V0U2NyaXB0UGFydEZyb21Db2RlKGNvZGUpKTtcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMubG9hZCAhPT0gJ2N1cnJlbnRPbmx5JykgYWRkQ29kZSh0aGlzLmdldExhbmd1YWdlUGFydEZyb21Db2RlKGNvZGUpKTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBjb2RlID09PSAnc3RyaW5nJykge1xuICAgICAgYWRkQ29kZSh0aGlzLmZvcm1hdExhbmd1YWdlQ29kZShjb2RlKSk7XG4gICAgfVxuXG4gICAgZmFsbGJhY2tDb2Rlcy5mb3JFYWNoKChmYykgPT4ge1xuICAgICAgaWYgKGNvZGVzLmluZGV4T2YoZmMpIDwgMCkgYWRkQ29kZSh0aGlzLmZvcm1hdExhbmd1YWdlQ29kZShmYykpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIGNvZGVzO1xuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IExhbmd1YWdlVXRpbDtcbiIsImltcG9ydCBiYXNlTG9nZ2VyIGZyb20gJy4vbG9nZ2VyLmpzJztcbmltcG9ydCB7IGdldENsZWFuZWRDb2RlIH0gZnJvbSAnLi91dGlscy5qcydcblxuLy8gZGVmaW5pdGlvbiBodHRwOi8vdHJhbnNsYXRlLnNvdXJjZWZvcmdlLm5ldC93aWtpL2wxMG4vcGx1cmFsZm9ybXNcbi8qIGVzbGludC1kaXNhYmxlICovXG5sZXQgc2V0cyA9IFtcbiAgeyBsbmdzOiBbJ2FjaCcsJ2FrJywnYW0nLCdhcm4nLCdicicsJ2ZpbCcsJ2d1bicsJ2xuJywnbWZlJywnbWcnLCdtaScsJ29jJywgJ3B0JywgJ3B0LUJSJyxcbiAgICAndGcnLCAndGwnLCAndGknLCd0cicsJ3V6Jywnd2EnXSwgbnI6IFsxLDJdLCBmYzogMSB9LFxuXG4gIHsgbG5nczogWydhZicsJ2FuJywnYXN0JywnYXonLCdiZycsJ2JuJywnY2EnLCdkYScsJ2RlJywnZGV2JywnZWwnLCdlbicsXG4gICAgJ2VvJywnZXMnLCdldCcsJ2V1JywnZmknLCdmbycsJ2Z1cicsJ2Z5JywnZ2wnLCdndScsJ2hhJywnaGknLFxuICAgICdodScsJ2h5JywnaWEnLCdpdCcsJ2trJywna24nLCdrdScsJ2xiJywnbWFpJywnbWwnLCdtbicsJ21yJywnbmFoJywnbmFwJywnbmInLFxuICAgICduZScsJ25sJywnbm4nLCdubycsJ25zbycsJ3BhJywncGFwJywncG1zJywncHMnLCdwdC1QVCcsJ3JtJywnc2NvJyxcbiAgICAnc2UnLCdzaScsJ3NvJywnc29uJywnc3EnLCdzdicsJ3N3JywndGEnLCd0ZScsJ3RrJywndXInLCd5byddLCBucjogWzEsMl0sIGZjOiAyIH0sXG5cbiAgeyBsbmdzOiBbJ2F5JywnYm8nLCdjZ2cnLCdmYScsJ2h0JywnaWQnLCdqYScsJ2pibycsJ2thJywna20nLCdrbycsJ2t5JywnbG8nLFxuICAgICdtcycsJ3NhaCcsJ3N1JywndGgnLCd0dCcsJ3VnJywndmknLCd3bycsJ3poJ10sIG5yOiBbMV0sIGZjOiAzIH0sXG5cbiAgeyBsbmdzOiBbJ2JlJywnYnMnLCAnY25yJywgJ2R6JywnaHInLCdydScsJ3NyJywndWsnXSwgbnI6IFsxLDIsNV0sIGZjOiA0IH0sXG5cbiAgeyBsbmdzOiBbJ2FyJ10sIG5yOiBbMCwxLDIsMywxMSwxMDBdLCBmYzogNSB9LFxuICB7IGxuZ3M6IFsnY3MnLCdzayddLCBucjogWzEsMiw1XSwgZmM6IDYgfSxcbiAgeyBsbmdzOiBbJ2NzYicsJ3BsJ10sIG5yOiBbMSwyLDVdLCBmYzogNyB9LFxuICB7IGxuZ3M6IFsnY3knXSwgbnI6IFsxLDIsMyw4XSwgZmM6IDggfSxcbiAgeyBsbmdzOiBbJ2ZyJ10sIG5yOiBbMSwyXSwgZmM6IDkgfSxcbiAgeyBsbmdzOiBbJ2dhJ10sIG5yOiBbMSwyLDMsNywxMV0sIGZjOiAxMCB9LFxuICB7IGxuZ3M6IFsnZ2QnXSwgbnI6IFsxLDIsMywyMF0sIGZjOiAxMSB9LFxuICB7IGxuZ3M6IFsnaXMnXSwgbnI6IFsxLDJdLCBmYzogMTIgfSxcbiAgeyBsbmdzOiBbJ2p2J10sIG5yOiBbMCwxXSwgZmM6IDEzIH0sXG4gIHsgbG5nczogWydrdyddLCBucjogWzEsMiwzLDRdLCBmYzogMTQgfSxcbiAgeyBsbmdzOiBbJ2x0J10sIG5yOiBbMSwyLDEwXSwgZmM6IDE1IH0sXG4gIHsgbG5nczogWydsdiddLCBucjogWzEsMiwwXSwgZmM6IDE2IH0sXG4gIHsgbG5nczogWydtayddLCBucjogWzEsMl0sIGZjOiAxNyB9LFxuICB7IGxuZ3M6IFsnbW5rJ10sIG5yOiBbMCwxLDJdLCBmYzogMTggfSxcbiAgeyBsbmdzOiBbJ210J10sIG5yOiBbMSwyLDExLDIwXSwgZmM6IDE5IH0sXG4gIHsgbG5nczogWydvciddLCBucjogWzIsMV0sIGZjOiAyIH0sXG4gIHsgbG5nczogWydybyddLCBucjogWzEsMiwyMF0sIGZjOiAyMCB9LFxuICB7IGxuZ3M6IFsnc2wnXSwgbnI6IFs1LDEsMiwzXSwgZmM6IDIxIH0sXG4gIHsgbG5nczogWydoZScsJ2l3J10sIG5yOiBbMSwyLDIwLDIxXSwgZmM6IDIyIH1cbl1cblxubGV0IF9ydWxlc1BsdXJhbHNUeXBlcyA9IHtcbiAgMTogZnVuY3Rpb24obikge3JldHVybiBOdW1iZXIobiA+IDEpO30sXG4gIDI6IGZ1bmN0aW9uKG4pIHtyZXR1cm4gTnVtYmVyKG4gIT0gMSk7fSxcbiAgMzogZnVuY3Rpb24obikge3JldHVybiAwO30sXG4gIDQ6IGZ1bmN0aW9uKG4pIHtyZXR1cm4gTnVtYmVyKG4lMTA9PTEgJiYgbiUxMDAhPTExID8gMCA6IG4lMTA+PTIgJiYgbiUxMDw9NCAmJiAobiUxMDA8MTAgfHwgbiUxMDA+PTIwKSA/IDEgOiAyKTt9LFxuICA1OiBmdW5jdGlvbihuKSB7cmV0dXJuIE51bWJlcihuPT0wID8gMCA6IG49PTEgPyAxIDogbj09MiA/IDIgOiBuJTEwMD49MyAmJiBuJTEwMDw9MTAgPyAzIDogbiUxMDA+PTExID8gNCA6IDUpO30sXG4gIDY6IGZ1bmN0aW9uKG4pIHtyZXR1cm4gTnVtYmVyKChuPT0xKSA/IDAgOiAobj49MiAmJiBuPD00KSA/IDEgOiAyKTt9LFxuICA3OiBmdW5jdGlvbihuKSB7cmV0dXJuIE51bWJlcihuPT0xID8gMCA6IG4lMTA+PTIgJiYgbiUxMDw9NCAmJiAobiUxMDA8MTAgfHwgbiUxMDA+PTIwKSA/IDEgOiAyKTt9LFxuICA4OiBmdW5jdGlvbihuKSB7cmV0dXJuIE51bWJlcigobj09MSkgPyAwIDogKG49PTIpID8gMSA6IChuICE9IDggJiYgbiAhPSAxMSkgPyAyIDogMyk7fSxcbiAgOTogZnVuY3Rpb24obikge3JldHVybiBOdW1iZXIobiA+PSAyKTt9LFxuICAxMDogZnVuY3Rpb24obikge3JldHVybiBOdW1iZXIobj09MSA/IDAgOiBuPT0yID8gMSA6IG48NyA/IDIgOiBuPDExID8gMyA6IDQpIDt9LFxuICAxMTogZnVuY3Rpb24obikge3JldHVybiBOdW1iZXIoKG49PTEgfHwgbj09MTEpID8gMCA6IChuPT0yIHx8IG49PTEyKSA/IDEgOiAobiA+IDIgJiYgbiA8IDIwKSA/IDIgOiAzKTt9LFxuICAxMjogZnVuY3Rpb24obikge3JldHVybiBOdW1iZXIobiUxMCE9MSB8fCBuJTEwMD09MTEpO30sXG4gIDEzOiBmdW5jdGlvbihuKSB7cmV0dXJuIE51bWJlcihuICE9PSAwKTt9LFxuICAxNDogZnVuY3Rpb24obikge3JldHVybiBOdW1iZXIoKG49PTEpID8gMCA6IChuPT0yKSA/IDEgOiAobiA9PSAzKSA/IDIgOiAzKTt9LFxuICAxNTogZnVuY3Rpb24obikge3JldHVybiBOdW1iZXIobiUxMD09MSAmJiBuJTEwMCE9MTEgPyAwIDogbiUxMD49MiAmJiAobiUxMDA8MTAgfHwgbiUxMDA+PTIwKSA/IDEgOiAyKTt9LFxuICAxNjogZnVuY3Rpb24obikge3JldHVybiBOdW1iZXIobiUxMD09MSAmJiBuJTEwMCE9MTEgPyAwIDogbiAhPT0gMCA/IDEgOiAyKTt9LFxuICAxNzogZnVuY3Rpb24obikge3JldHVybiBOdW1iZXIobj09MSB8fCBuJTEwPT0xICYmIG4lMTAwIT0xMSA/IDAgOiAxKTt9LFxuICAxODogZnVuY3Rpb24obikge3JldHVybiBOdW1iZXIobj09MCA/IDAgOiBuPT0xID8gMSA6IDIpO30sXG4gIDE5OiBmdW5jdGlvbihuKSB7cmV0dXJuIE51bWJlcihuPT0xID8gMCA6IG49PTAgfHwgKCBuJTEwMD4xICYmIG4lMTAwPDExKSA/IDEgOiAobiUxMDA+MTAgJiYgbiUxMDA8MjAgKSA/IDIgOiAzKTt9LFxuICAyMDogZnVuY3Rpb24obikge3JldHVybiBOdW1iZXIobj09MSA/IDAgOiAobj09MCB8fCAobiUxMDAgPiAwICYmIG4lMTAwIDwgMjApKSA/IDEgOiAyKTt9LFxuICAyMTogZnVuY3Rpb24obikge3JldHVybiBOdW1iZXIobiUxMDA9PTEgPyAxIDogbiUxMDA9PTIgPyAyIDogbiUxMDA9PTMgfHwgbiUxMDA9PTQgPyAzIDogMCk7IH0sXG4gIDIyOiBmdW5jdGlvbihuKSB7cmV0dXJuIE51bWJlcihuPT0xID8gMCA6IG49PTIgPyAxIDogKG48MCB8fCBuPjEwKSAmJiBuJTEwPT0wID8gMiA6IDMpOyB9XG59O1xuLyogZXNsaW50LWVuYWJsZSAqL1xuXG5jb25zdCBub25JbnRsVmVyc2lvbnMgPSBbJ3YxJywgJ3YyJywgJ3YzJ107XG5jb25zdCBpbnRsVmVyc2lvbnMgPSBbJ3Y0J107XG5jb25zdCBzdWZmaXhlc09yZGVyID0ge1xuICB6ZXJvOiAwLFxuICBvbmU6IDEsXG4gIHR3bzogMixcbiAgZmV3OiAzLFxuICBtYW55OiA0LFxuICBvdGhlcjogNSxcbn07XG5cbmZ1bmN0aW9uIGNyZWF0ZVJ1bGVzKCkge1xuICBjb25zdCBydWxlcyA9IHt9O1xuICBzZXRzLmZvckVhY2goKHNldCkgPT4ge1xuICAgIHNldC5sbmdzLmZvckVhY2goKGwpID0+IHtcbiAgICAgIHJ1bGVzW2xdID0ge1xuICAgICAgICBudW1iZXJzOiBzZXQubnIsXG4gICAgICAgIHBsdXJhbHM6IF9ydWxlc1BsdXJhbHNUeXBlc1tzZXQuZmNdXG4gICAgICB9O1xuICAgIH0pO1xuICB9KTtcbiAgcmV0dXJuIHJ1bGVzO1xufVxuXG5jbGFzcyBQbHVyYWxSZXNvbHZlciB7XG4gIGNvbnN0cnVjdG9yKGxhbmd1YWdlVXRpbHMsIG9wdGlvbnMgPSB7fSkge1xuICAgIHRoaXMubGFuZ3VhZ2VVdGlscyA9IGxhbmd1YWdlVXRpbHM7XG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcblxuICAgIHRoaXMubG9nZ2VyID0gYmFzZUxvZ2dlci5jcmVhdGUoJ3BsdXJhbFJlc29sdmVyJyk7XG5cbiAgICBpZiAoKCF0aGlzLm9wdGlvbnMuY29tcGF0aWJpbGl0eUpTT04gfHwgaW50bFZlcnNpb25zLmluY2x1ZGVzKHRoaXMub3B0aW9ucy5jb21wYXRpYmlsaXR5SlNPTikpICYmICh0eXBlb2YgSW50bCA9PT0gJ3VuZGVmaW5lZCcgfHwgIUludGwuUGx1cmFsUnVsZXMpKSB7XG4gICAgICB0aGlzLm9wdGlvbnMuY29tcGF0aWJpbGl0eUpTT04gPSAndjMnO1xuICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoJ1lvdXIgZW52aXJvbm1lbnQgc2VlbXMgbm90IHRvIGJlIEludGwgQVBJIGNvbXBhdGlibGUsIHVzZSBhbiBJbnRsLlBsdXJhbFJ1bGVzIHBvbHlmaWxsLiBXaWxsIGZhbGxiYWNrIHRvIHRoZSBjb21wYXRpYmlsaXR5SlNPTiB2MyBmb3JtYXQgaGFuZGxpbmcuJyk7XG4gICAgfVxuXG4gICAgdGhpcy5ydWxlcyA9IGNyZWF0ZVJ1bGVzKCk7XG4gIH1cblxuICBhZGRSdWxlKGxuZywgb2JqKSB7XG4gICAgdGhpcy5ydWxlc1tsbmddID0gb2JqO1xuICB9XG5cbiAgZ2V0UnVsZShjb2RlLCBvcHRpb25zID0ge30pIHtcbiAgICBpZiAodGhpcy5zaG91bGRVc2VJbnRsQXBpKCkpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHJldHVybiBuZXcgSW50bC5QbHVyYWxSdWxlcyhnZXRDbGVhbmVkQ29kZShjb2RlKSwgeyB0eXBlOiBvcHRpb25zLm9yZGluYWwgPyAnb3JkaW5hbCcgOiAnY2FyZGluYWwnIH0pO1xuICAgICAgfSBjYXRjaCB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5ydWxlc1tjb2RlXSB8fCB0aGlzLnJ1bGVzW3RoaXMubGFuZ3VhZ2VVdGlscy5nZXRMYW5ndWFnZVBhcnRGcm9tQ29kZShjb2RlKV07XG4gIH1cblxuICBuZWVkc1BsdXJhbChjb2RlLCBvcHRpb25zID0ge30pIHtcbiAgICBjb25zdCBydWxlID0gdGhpcy5nZXRSdWxlKGNvZGUsIG9wdGlvbnMpO1xuXG4gICAgaWYgKHRoaXMuc2hvdWxkVXNlSW50bEFwaSgpKSB7XG4gICAgICByZXR1cm4gcnVsZSAmJiBydWxlLnJlc29sdmVkT3B0aW9ucygpLnBsdXJhbENhdGVnb3JpZXMubGVuZ3RoID4gMTtcbiAgICB9XG5cbiAgICByZXR1cm4gcnVsZSAmJiBydWxlLm51bWJlcnMubGVuZ3RoID4gMTtcbiAgfVxuXG4gIGdldFBsdXJhbEZvcm1zT2ZLZXkoY29kZSwga2V5LCBvcHRpb25zID0ge30pIHtcbiAgICByZXR1cm4gdGhpcy5nZXRTdWZmaXhlcyhjb2RlLCBvcHRpb25zKS5tYXAoKHN1ZmZpeCkgPT4gYCR7a2V5fSR7c3VmZml4fWApO1xuICB9XG5cbiAgZ2V0U3VmZml4ZXMoY29kZSwgb3B0aW9ucyA9IHt9KSB7XG4gICAgY29uc3QgcnVsZSA9IHRoaXMuZ2V0UnVsZShjb2RlLCBvcHRpb25zKTtcblxuICAgIGlmICghcnVsZSkge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICAgIGlmICh0aGlzLnNob3VsZFVzZUludGxBcGkoKSkge1xuICAgICAgcmV0dXJuIHJ1bGUucmVzb2x2ZWRPcHRpb25zKCkucGx1cmFsQ2F0ZWdvcmllc1xuICAgICAgICAuc29ydCgocGx1cmFsQ2F0ZWdvcnkxLCBwbHVyYWxDYXRlZ29yeTIpID0+IHN1ZmZpeGVzT3JkZXJbcGx1cmFsQ2F0ZWdvcnkxXSAtIHN1ZmZpeGVzT3JkZXJbcGx1cmFsQ2F0ZWdvcnkyXSlcbiAgICAgICAgLm1hcChwbHVyYWxDYXRlZ29yeSA9PiBgJHt0aGlzLm9wdGlvbnMucHJlcGVuZH0ke29wdGlvbnMub3JkaW5hbCA/IGBvcmRpbmFsJHt0aGlzLm9wdGlvbnMucHJlcGVuZH1gIDogJyd9JHtwbHVyYWxDYXRlZ29yeX1gKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcnVsZS5udW1iZXJzLm1hcCgobnVtYmVyKSA9PiB0aGlzLmdldFN1ZmZpeChjb2RlLCBudW1iZXIsIG9wdGlvbnMpKTtcbiAgfVxuXG4gIGdldFN1ZmZpeChjb2RlLCBjb3VudCwgb3B0aW9ucyA9IHt9KSB7XG4gICAgY29uc3QgcnVsZSA9IHRoaXMuZ2V0UnVsZShjb2RlLCBvcHRpb25zKTtcblxuICAgIGlmIChydWxlKSB7XG4gICAgICBpZiAodGhpcy5zaG91bGRVc2VJbnRsQXBpKCkpIHtcbiAgICAgICAgcmV0dXJuIGAke3RoaXMub3B0aW9ucy5wcmVwZW5kfSR7b3B0aW9ucy5vcmRpbmFsID8gYG9yZGluYWwke3RoaXMub3B0aW9ucy5wcmVwZW5kfWAgOiAnJ30ke3J1bGUuc2VsZWN0KGNvdW50KX1gO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gdGhpcy5nZXRTdWZmaXhSZXRyb0NvbXBhdGlibGUocnVsZSwgY291bnQpO1xuICAgIH1cblxuICAgIHRoaXMubG9nZ2VyLndhcm4oYG5vIHBsdXJhbCBydWxlIGZvdW5kIGZvcjogJHtjb2RlfWApO1xuICAgIHJldHVybiAnJztcbiAgfVxuXG4gIGdldFN1ZmZpeFJldHJvQ29tcGF0aWJsZShydWxlLCBjb3VudCkge1xuICAgIGNvbnN0IGlkeCA9IHJ1bGUubm9BYnMgPyBydWxlLnBsdXJhbHMoY291bnQpIDogcnVsZS5wbHVyYWxzKE1hdGguYWJzKGNvdW50KSk7XG4gICAgbGV0IHN1ZmZpeCA9IHJ1bGUubnVtYmVyc1tpZHhdO1xuXG4gICAgLy8gc3BlY2lhbCB0cmVhdG1lbnQgZm9yIGxuZ3Mgb25seSBoYXZpbmcgc2luZ3VsYXIgYW5kIHBsdXJhbFxuICAgIGlmICh0aGlzLm9wdGlvbnMuc2ltcGxpZnlQbHVyYWxTdWZmaXggJiYgcnVsZS5udW1iZXJzLmxlbmd0aCA9PT0gMiAmJiBydWxlLm51bWJlcnNbMF0gPT09IDEpIHtcbiAgICAgIGlmIChzdWZmaXggPT09IDIpIHtcbiAgICAgICAgc3VmZml4ID0gJ3BsdXJhbCc7XG4gICAgICB9IGVsc2UgaWYgKHN1ZmZpeCA9PT0gMSkge1xuICAgICAgICBzdWZmaXggPSAnJztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCByZXR1cm5TdWZmaXggPSAoKSA9PiAoXG4gICAgICB0aGlzLm9wdGlvbnMucHJlcGVuZCAmJiBzdWZmaXgudG9TdHJpbmcoKSA/IHRoaXMub3B0aW9ucy5wcmVwZW5kICsgc3VmZml4LnRvU3RyaW5nKCkgOiBzdWZmaXgudG9TdHJpbmcoKVxuICAgICk7XG5cbiAgICAvLyBDT01QQVRJQklMSVRZIEpTT05cbiAgICAvLyB2MVxuICAgIGlmICh0aGlzLm9wdGlvbnMuY29tcGF0aWJpbGl0eUpTT04gPT09ICd2MScpIHtcbiAgICAgIGlmIChzdWZmaXggPT09IDEpIHJldHVybiAnJztcbiAgICAgIGlmICh0eXBlb2Ygc3VmZml4ID09PSAnbnVtYmVyJykgcmV0dXJuIGBfcGx1cmFsXyR7c3VmZml4LnRvU3RyaW5nKCl9YDtcbiAgICAgIHJldHVybiByZXR1cm5TdWZmaXgoKTtcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1lbHNlLXJldHVyblxuICAgIH0gZWxzZSBpZiAoLyogdjIgKi8gdGhpcy5vcHRpb25zLmNvbXBhdGliaWxpdHlKU09OID09PSAndjInKSB7XG4gICAgICByZXR1cm4gcmV0dXJuU3VmZml4KCk7XG4gICAgfSBlbHNlIGlmICgvKiB2MyAtIGdldHRleHQgaW5kZXggKi8gdGhpcy5vcHRpb25zLnNpbXBsaWZ5UGx1cmFsU3VmZml4ICYmIHJ1bGUubnVtYmVycy5sZW5ndGggPT09IDIgJiYgcnVsZS5udW1iZXJzWzBdID09PSAxKSB7XG4gICAgICByZXR1cm4gcmV0dXJuU3VmZml4KCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLm9wdGlvbnMucHJlcGVuZCAmJiBpZHgudG9TdHJpbmcoKSA/IHRoaXMub3B0aW9ucy5wcmVwZW5kICsgaWR4LnRvU3RyaW5nKCkgOiBpZHgudG9TdHJpbmcoKTtcbiAgfVxuXG4gIHNob3VsZFVzZUludGxBcGkoKSB7XG4gICAgcmV0dXJuICFub25JbnRsVmVyc2lvbnMuaW5jbHVkZXModGhpcy5vcHRpb25zLmNvbXBhdGliaWxpdHlKU09OKTtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBQbHVyYWxSZXNvbHZlcjtcbiIsImltcG9ydCAqIGFzIHV0aWxzIGZyb20gJy4vdXRpbHMuanMnO1xuaW1wb3J0IGJhc2VMb2dnZXIgZnJvbSAnLi9sb2dnZXIuanMnO1xuXG5mdW5jdGlvbiBkZWVwRmluZFdpdGhEZWZhdWx0cyhcbiAgZGF0YSxcbiAgZGVmYXVsdERhdGEsXG4gIGtleSxcbiAga2V5U2VwYXJhdG9yID0gJy4nLFxuICBpZ25vcmVKU09OU3RydWN0dXJlID0gdHJ1ZSxcbikge1xuICBsZXQgcGF0aCA9IHV0aWxzLmdldFBhdGhXaXRoRGVmYXVsdHMoZGF0YSwgZGVmYXVsdERhdGEsIGtleSk7XG4gIGlmICghcGF0aCAmJiBpZ25vcmVKU09OU3RydWN0dXJlICYmIHR5cGVvZiBrZXkgPT09ICdzdHJpbmcnKSB7XG4gICAgcGF0aCA9IHV0aWxzLmRlZXBGaW5kKGRhdGEsIGtleSwga2V5U2VwYXJhdG9yKTtcbiAgICBpZiAocGF0aCA9PT0gdW5kZWZpbmVkKSBwYXRoID0gdXRpbHMuZGVlcEZpbmQoZGVmYXVsdERhdGEsIGtleSwga2V5U2VwYXJhdG9yKTtcbiAgfVxuICByZXR1cm4gcGF0aDtcbn1cblxuY2xhc3MgSW50ZXJwb2xhdG9yIHtcbiAgY29uc3RydWN0b3Iob3B0aW9ucyA9IHt9KSB7XG4gICAgdGhpcy5sb2dnZXIgPSBiYXNlTG9nZ2VyLmNyZWF0ZSgnaW50ZXJwb2xhdG9yJyk7XG5cbiAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuICAgIHRoaXMuZm9ybWF0ID0gKG9wdGlvbnMuaW50ZXJwb2xhdGlvbiAmJiBvcHRpb25zLmludGVycG9sYXRpb24uZm9ybWF0KSB8fCAoKHZhbHVlKSA9PiB2YWx1ZSk7XG4gICAgdGhpcy5pbml0KG9wdGlvbnMpO1xuICB9XG5cbiAgLyogZXNsaW50IG5vLXBhcmFtLXJlYXNzaWduOiAwICovXG4gIGluaXQob3B0aW9ucyA9IHt9KSB7XG4gICAgaWYgKCFvcHRpb25zLmludGVycG9sYXRpb24pIG9wdGlvbnMuaW50ZXJwb2xhdGlvbiA9IHsgZXNjYXBlVmFsdWU6IHRydWUgfTtcblxuICAgIGNvbnN0IGlPcHRzID0gb3B0aW9ucy5pbnRlcnBvbGF0aW9uO1xuXG4gICAgdGhpcy5lc2NhcGUgPSBpT3B0cy5lc2NhcGUgIT09IHVuZGVmaW5lZCA/IGlPcHRzLmVzY2FwZSA6IHV0aWxzLmVzY2FwZTtcbiAgICB0aGlzLmVzY2FwZVZhbHVlID0gaU9wdHMuZXNjYXBlVmFsdWUgIT09IHVuZGVmaW5lZCA/IGlPcHRzLmVzY2FwZVZhbHVlIDogdHJ1ZTtcbiAgICB0aGlzLnVzZVJhd1ZhbHVlVG9Fc2NhcGUgPVxuICAgICAgaU9wdHMudXNlUmF3VmFsdWVUb0VzY2FwZSAhPT0gdW5kZWZpbmVkID8gaU9wdHMudXNlUmF3VmFsdWVUb0VzY2FwZSA6IGZhbHNlO1xuXG4gICAgdGhpcy5wcmVmaXggPSBpT3B0cy5wcmVmaXggPyB1dGlscy5yZWdleEVzY2FwZShpT3B0cy5wcmVmaXgpIDogaU9wdHMucHJlZml4RXNjYXBlZCB8fCAne3snO1xuICAgIHRoaXMuc3VmZml4ID0gaU9wdHMuc3VmZml4ID8gdXRpbHMucmVnZXhFc2NhcGUoaU9wdHMuc3VmZml4KSA6IGlPcHRzLnN1ZmZpeEVzY2FwZWQgfHwgJ319JztcblxuICAgIHRoaXMuZm9ybWF0U2VwYXJhdG9yID0gaU9wdHMuZm9ybWF0U2VwYXJhdG9yXG4gICAgICA/IGlPcHRzLmZvcm1hdFNlcGFyYXRvclxuICAgICAgOiBpT3B0cy5mb3JtYXRTZXBhcmF0b3IgfHwgJywnO1xuXG4gICAgdGhpcy51bmVzY2FwZVByZWZpeCA9IGlPcHRzLnVuZXNjYXBlU3VmZml4ID8gJycgOiBpT3B0cy51bmVzY2FwZVByZWZpeCB8fCAnLSc7XG4gICAgdGhpcy51bmVzY2FwZVN1ZmZpeCA9IHRoaXMudW5lc2NhcGVQcmVmaXggPyAnJyA6IGlPcHRzLnVuZXNjYXBlU3VmZml4IHx8ICcnO1xuXG4gICAgdGhpcy5uZXN0aW5nUHJlZml4ID0gaU9wdHMubmVzdGluZ1ByZWZpeFxuICAgICAgPyB1dGlscy5yZWdleEVzY2FwZShpT3B0cy5uZXN0aW5nUHJlZml4KVxuICAgICAgOiBpT3B0cy5uZXN0aW5nUHJlZml4RXNjYXBlZCB8fCB1dGlscy5yZWdleEVzY2FwZSgnJHQoJyk7XG4gICAgdGhpcy5uZXN0aW5nU3VmZml4ID0gaU9wdHMubmVzdGluZ1N1ZmZpeFxuICAgICAgPyB1dGlscy5yZWdleEVzY2FwZShpT3B0cy5uZXN0aW5nU3VmZml4KVxuICAgICAgOiBpT3B0cy5uZXN0aW5nU3VmZml4RXNjYXBlZCB8fCB1dGlscy5yZWdleEVzY2FwZSgnKScpO1xuXG4gICAgdGhpcy5uZXN0aW5nT3B0aW9uc1NlcGFyYXRvciA9IGlPcHRzLm5lc3RpbmdPcHRpb25zU2VwYXJhdG9yXG4gICAgICA/IGlPcHRzLm5lc3RpbmdPcHRpb25zU2VwYXJhdG9yXG4gICAgICA6IGlPcHRzLm5lc3RpbmdPcHRpb25zU2VwYXJhdG9yIHx8ICcsJztcblxuICAgIHRoaXMubWF4UmVwbGFjZXMgPSBpT3B0cy5tYXhSZXBsYWNlcyA/IGlPcHRzLm1heFJlcGxhY2VzIDogMTAwMDtcblxuICAgIHRoaXMuYWx3YXlzRm9ybWF0ID0gaU9wdHMuYWx3YXlzRm9ybWF0ICE9PSB1bmRlZmluZWQgPyBpT3B0cy5hbHdheXNGb3JtYXQgOiBmYWxzZTtcblxuICAgIC8vIHRoZSByZWdleHBcbiAgICB0aGlzLnJlc2V0UmVnRXhwKCk7XG4gIH1cblxuICByZXNldCgpIHtcbiAgICBpZiAodGhpcy5vcHRpb25zKSB0aGlzLmluaXQodGhpcy5vcHRpb25zKTtcbiAgfVxuXG4gIHJlc2V0UmVnRXhwKCkge1xuICAgIC8vIHRoZSByZWdleHBcbiAgICBjb25zdCByZWdleHBTdHIgPSBgJHt0aGlzLnByZWZpeH0oLis/KSR7dGhpcy5zdWZmaXh9YDtcbiAgICB0aGlzLnJlZ2V4cCA9IG5ldyBSZWdFeHAocmVnZXhwU3RyLCAnZycpO1xuXG4gICAgY29uc3QgcmVnZXhwVW5lc2NhcGVTdHIgPSBgJHt0aGlzLnByZWZpeH0ke3RoaXMudW5lc2NhcGVQcmVmaXh9KC4rPykke3RoaXMudW5lc2NhcGVTdWZmaXh9JHt0aGlzLnN1ZmZpeH1gO1xuICAgIHRoaXMucmVnZXhwVW5lc2NhcGUgPSBuZXcgUmVnRXhwKHJlZ2V4cFVuZXNjYXBlU3RyLCAnZycpO1xuXG4gICAgY29uc3QgbmVzdGluZ1JlZ2V4cFN0ciA9IGAke3RoaXMubmVzdGluZ1ByZWZpeH0oLis/KSR7dGhpcy5uZXN0aW5nU3VmZml4fWA7XG4gICAgdGhpcy5uZXN0aW5nUmVnZXhwID0gbmV3IFJlZ0V4cChuZXN0aW5nUmVnZXhwU3RyLCAnZycpO1xuICB9XG5cbiAgaW50ZXJwb2xhdGUoc3RyLCBkYXRhLCBsbmcsIG9wdGlvbnMpIHtcbiAgICBsZXQgbWF0Y2g7XG4gICAgbGV0IHZhbHVlO1xuICAgIGxldCByZXBsYWNlcztcblxuICAgIGNvbnN0IGRlZmF1bHREYXRhID1cbiAgICAgICh0aGlzLm9wdGlvbnMgJiYgdGhpcy5vcHRpb25zLmludGVycG9sYXRpb24gJiYgdGhpcy5vcHRpb25zLmludGVycG9sYXRpb24uZGVmYXVsdFZhcmlhYmxlcykgfHxcbiAgICAgIHt9O1xuXG4gICAgZnVuY3Rpb24gcmVnZXhTYWZlKHZhbCkge1xuICAgICAgcmV0dXJuIHZhbC5yZXBsYWNlKC9cXCQvZywgJyQkJCQnKTtcbiAgICB9XG5cbiAgICBjb25zdCBoYW5kbGVGb3JtYXQgPSAoa2V5KSA9PiB7XG4gICAgICBpZiAoa2V5LmluZGV4T2YodGhpcy5mb3JtYXRTZXBhcmF0b3IpIDwgMCkge1xuICAgICAgICBjb25zdCBwYXRoID0gZGVlcEZpbmRXaXRoRGVmYXVsdHMoXG4gICAgICAgICAgZGF0YSxcbiAgICAgICAgICBkZWZhdWx0RGF0YSxcbiAgICAgICAgICBrZXksXG4gICAgICAgICAgdGhpcy5vcHRpb25zLmtleVNlcGFyYXRvcixcbiAgICAgICAgICB0aGlzLm9wdGlvbnMuaWdub3JlSlNPTlN0cnVjdHVyZSxcbiAgICAgICAgKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuYWx3YXlzRm9ybWF0XG4gICAgICAgICAgPyB0aGlzLmZvcm1hdChwYXRoLCB1bmRlZmluZWQsIGxuZywgeyAuLi5vcHRpb25zLCAuLi5kYXRhLCBpbnRlcnBvbGF0aW9ua2V5OiBrZXkgfSlcbiAgICAgICAgICA6IHBhdGg7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHAgPSBrZXkuc3BsaXQodGhpcy5mb3JtYXRTZXBhcmF0b3IpO1xuICAgICAgY29uc3QgayA9IHAuc2hpZnQoKS50cmltKCk7XG4gICAgICBjb25zdCBmID0gcC5qb2luKHRoaXMuZm9ybWF0U2VwYXJhdG9yKS50cmltKCk7XG5cbiAgICAgIHJldHVybiB0aGlzLmZvcm1hdChcbiAgICAgICAgZGVlcEZpbmRXaXRoRGVmYXVsdHMoXG4gICAgICAgICAgZGF0YSxcbiAgICAgICAgICBkZWZhdWx0RGF0YSxcbiAgICAgICAgICBrLFxuICAgICAgICAgIHRoaXMub3B0aW9ucy5rZXlTZXBhcmF0b3IsXG4gICAgICAgICAgdGhpcy5vcHRpb25zLmlnbm9yZUpTT05TdHJ1Y3R1cmUsXG4gICAgICAgICksXG4gICAgICAgIGYsXG4gICAgICAgIGxuZyxcbiAgICAgICAge1xuICAgICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICAgICAgLi4uZGF0YSxcbiAgICAgICAgICBpbnRlcnBvbGF0aW9ua2V5OiBrLFxuICAgICAgICB9LFxuICAgICAgKTtcbiAgICB9O1xuXG4gICAgdGhpcy5yZXNldFJlZ0V4cCgpO1xuXG4gICAgY29uc3QgbWlzc2luZ0ludGVycG9sYXRpb25IYW5kbGVyID1cbiAgICAgIChvcHRpb25zICYmIG9wdGlvbnMubWlzc2luZ0ludGVycG9sYXRpb25IYW5kbGVyKSB8fCB0aGlzLm9wdGlvbnMubWlzc2luZ0ludGVycG9sYXRpb25IYW5kbGVyO1xuXG4gICAgY29uc3Qgc2tpcE9uVmFyaWFibGVzID1cbiAgICAgIG9wdGlvbnMgJiYgb3B0aW9ucy5pbnRlcnBvbGF0aW9uICYmIG9wdGlvbnMuaW50ZXJwb2xhdGlvbi5za2lwT25WYXJpYWJsZXMgIT09IHVuZGVmaW5lZFxuICAgICAgICA/IG9wdGlvbnMuaW50ZXJwb2xhdGlvbi5za2lwT25WYXJpYWJsZXNcbiAgICAgICAgOiB0aGlzLm9wdGlvbnMuaW50ZXJwb2xhdGlvbi5za2lwT25WYXJpYWJsZXM7XG5cbiAgICBjb25zdCB0b2RvcyA9IFtcbiAgICAgIHtcbiAgICAgICAgLy8gdW5lc2NhcGUgaWYgaGFzIHVuZXNjYXBlUHJlZml4L1N1ZmZpeFxuICAgICAgICByZWdleDogdGhpcy5yZWdleHBVbmVzY2FwZSxcbiAgICAgICAgc2FmZVZhbHVlOiAodmFsKSA9PiByZWdleFNhZmUodmFsKSxcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIC8vIHJlZ3VsYXIgZXNjYXBlIG9uIGRlbWFuZFxuICAgICAgICByZWdleDogdGhpcy5yZWdleHAsXG4gICAgICAgIHNhZmVWYWx1ZTogKHZhbCkgPT4gKHRoaXMuZXNjYXBlVmFsdWUgPyByZWdleFNhZmUodGhpcy5lc2NhcGUodmFsKSkgOiByZWdleFNhZmUodmFsKSksXG4gICAgICB9LFxuICAgIF07XG4gICAgdG9kb3MuZm9yRWFjaCgodG9kbykgPT4ge1xuICAgICAgcmVwbGFjZXMgPSAwO1xuICAgICAgLyogZXNsaW50IG5vLWNvbmQtYXNzaWduOiAwICovXG4gICAgICB3aGlsZSAoKG1hdGNoID0gdG9kby5yZWdleC5leGVjKHN0cikpKSB7XG4gICAgICAgIGNvbnN0IG1hdGNoZWRWYXIgPSBtYXRjaFsxXS50cmltKCk7XG4gICAgICAgIHZhbHVlID0gaGFuZGxlRm9ybWF0KG1hdGNoZWRWYXIpO1xuICAgICAgICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGlmICh0eXBlb2YgbWlzc2luZ0ludGVycG9sYXRpb25IYW5kbGVyID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjb25zdCB0ZW1wID0gbWlzc2luZ0ludGVycG9sYXRpb25IYW5kbGVyKHN0ciwgbWF0Y2gsIG9wdGlvbnMpO1xuICAgICAgICAgICAgdmFsdWUgPSB0eXBlb2YgdGVtcCA9PT0gJ3N0cmluZycgPyB0ZW1wIDogJyc7XG4gICAgICAgICAgfSBlbHNlIGlmIChvcHRpb25zICYmIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvcHRpb25zLCBtYXRjaGVkVmFyKSkge1xuICAgICAgICAgICAgdmFsdWUgPSAnJzsgLy8gdW5kZWZpbmVkIGJlY29tZXMgZW1wdHkgc3RyaW5nXG4gICAgICAgICAgfSBlbHNlIGlmIChza2lwT25WYXJpYWJsZXMpIHtcbiAgICAgICAgICAgIHZhbHVlID0gbWF0Y2hbMF07XG4gICAgICAgICAgICBjb250aW51ZTsgLy8gdGhpcyBtYWtlcyBzdXJlIGl0IGNvbnRpbnVlcyB0byBkZXRlY3Qgb3RoZXJzXG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMubG9nZ2VyLndhcm4oYG1pc3NlZCB0byBwYXNzIGluIHZhcmlhYmxlICR7bWF0Y2hlZFZhcn0gZm9yIGludGVycG9sYXRpbmcgJHtzdHJ9YCk7XG4gICAgICAgICAgICB2YWx1ZSA9ICcnO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgdmFsdWUgIT09ICdzdHJpbmcnICYmICF0aGlzLnVzZVJhd1ZhbHVlVG9Fc2NhcGUpIHtcbiAgICAgICAgICB2YWx1ZSA9IHV0aWxzLm1ha2VTdHJpbmcodmFsdWUpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHNhZmVWYWx1ZSA9IHRvZG8uc2FmZVZhbHVlKHZhbHVlKTtcbiAgICAgICAgc3RyID0gc3RyLnJlcGxhY2UobWF0Y2hbMF0sIHNhZmVWYWx1ZSk7XG4gICAgICAgIGlmIChza2lwT25WYXJpYWJsZXMpIHtcbiAgICAgICAgICB0b2RvLnJlZ2V4Lmxhc3RJbmRleCArPSB2YWx1ZS5sZW5ndGg7XG4gICAgICAgICAgdG9kby5yZWdleC5sYXN0SW5kZXggLT0gbWF0Y2hbMF0ubGVuZ3RoO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRvZG8ucmVnZXgubGFzdEluZGV4ID0gMDtcbiAgICAgICAgfVxuICAgICAgICByZXBsYWNlcysrO1xuICAgICAgICBpZiAocmVwbGFjZXMgPj0gdGhpcy5tYXhSZXBsYWNlcykge1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHN0cjtcbiAgfVxuXG4gIG5lc3Qoc3RyLCBmYywgb3B0aW9ucyA9IHt9KSB7XG4gICAgbGV0IG1hdGNoO1xuICAgIGxldCB2YWx1ZTtcblxuICAgIGxldCBjbG9uZWRPcHRpb25zO1xuXG4gICAgLy8gaWYgdmFsdWUgaXMgc29tZXRoaW5nIGxpa2UgXCJteUtleVwiOiBcImxvcmVtICQoYW5vdGhlcktleSwgeyBcImNvdW50XCI6IHt7YVZhbHVlSW5PcHRpb25zfX0gfSlcIlxuICAgIGZ1bmN0aW9uIGhhbmRsZUhhc09wdGlvbnMoa2V5LCBpbmhlcml0ZWRPcHRpb25zKSB7XG4gICAgICBjb25zdCBzZXAgPSB0aGlzLm5lc3RpbmdPcHRpb25zU2VwYXJhdG9yO1xuICAgICAgaWYgKGtleS5pbmRleE9mKHNlcCkgPCAwKSByZXR1cm4ga2V5O1xuXG4gICAgICBjb25zdCBjID0ga2V5LnNwbGl0KG5ldyBSZWdFeHAoYCR7c2VwfVsgXSp7YCkpO1xuXG4gICAgICBsZXQgb3B0aW9uc1N0cmluZyA9IGB7JHtjWzFdfWA7XG4gICAgICBrZXkgPSBjWzBdO1xuICAgICAgb3B0aW9uc1N0cmluZyA9IHRoaXMuaW50ZXJwb2xhdGUob3B0aW9uc1N0cmluZywgY2xvbmVkT3B0aW9ucyk7XG4gICAgICBjb25zdCBtYXRjaGVkU2luZ2xlUXVvdGVzID0gb3B0aW9uc1N0cmluZy5tYXRjaCgvJy9nKTtcbiAgICAgIGNvbnN0IG1hdGNoZWREb3VibGVRdW90ZXMgPSBvcHRpb25zU3RyaW5nLm1hdGNoKC9cIi9nKTtcbiAgICAgIGlmIChcbiAgICAgICAgKG1hdGNoZWRTaW5nbGVRdW90ZXMgJiYgbWF0Y2hlZFNpbmdsZVF1b3Rlcy5sZW5ndGggJSAyID09PSAwICYmICFtYXRjaGVkRG91YmxlUXVvdGVzKSB8fFxuICAgICAgICBtYXRjaGVkRG91YmxlUXVvdGVzLmxlbmd0aCAlIDIgIT09IDBcbiAgICAgICkge1xuICAgICAgICBvcHRpb25zU3RyaW5nID0gb3B0aW9uc1N0cmluZy5yZXBsYWNlKC8nL2csICdcIicpO1xuICAgICAgfVxuXG4gICAgICB0cnkge1xuICAgICAgICBjbG9uZWRPcHRpb25zID0gSlNPTi5wYXJzZShvcHRpb25zU3RyaW5nKTtcblxuICAgICAgICBpZiAoaW5oZXJpdGVkT3B0aW9ucykgY2xvbmVkT3B0aW9ucyA9IHsgLi4uaW5oZXJpdGVkT3B0aW9ucywgLi4uY2xvbmVkT3B0aW9ucyB9O1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICB0aGlzLmxvZ2dlci53YXJuKGBmYWlsZWQgcGFyc2luZyBvcHRpb25zIHN0cmluZyBpbiBuZXN0aW5nIGZvciBrZXkgJHtrZXl9YCwgZSk7XG4gICAgICAgIHJldHVybiBgJHtrZXl9JHtzZXB9JHtvcHRpb25zU3RyaW5nfWA7XG4gICAgICB9XG5cbiAgICAgIC8vIGFzc2VydCB3ZSBkbyBub3QgZ2V0IGEgZW5kbGVzcyBsb29wIG9uIGludGVycG9sYXRpbmcgZGVmYXVsdFZhbHVlIGFnYWluIGFuZCBhZ2FpblxuICAgICAgZGVsZXRlIGNsb25lZE9wdGlvbnMuZGVmYXVsdFZhbHVlO1xuICAgICAgcmV0dXJuIGtleTtcbiAgICB9XG5cbiAgICAvLyByZWd1bGFyIGVzY2FwZSBvbiBkZW1hbmRcbiAgICB3aGlsZSAoKG1hdGNoID0gdGhpcy5uZXN0aW5nUmVnZXhwLmV4ZWMoc3RyKSkpIHtcbiAgICAgIGxldCBmb3JtYXR0ZXJzID0gW107XG5cbiAgICAgIGNsb25lZE9wdGlvbnMgPSB7IC4uLm9wdGlvbnMgfTtcbiAgICAgIGNsb25lZE9wdGlvbnMgPVxuICAgICAgICBjbG9uZWRPcHRpb25zLnJlcGxhY2UgJiYgdHlwZW9mIGNsb25lZE9wdGlvbnMucmVwbGFjZSAhPT0gJ3N0cmluZydcbiAgICAgICAgICA/IGNsb25lZE9wdGlvbnMucmVwbGFjZVxuICAgICAgICAgIDogY2xvbmVkT3B0aW9ucztcbiAgICAgIGNsb25lZE9wdGlvbnMuYXBwbHlQb3N0UHJvY2Vzc29yID0gZmFsc2U7IC8vIGF2b2lkIHBvc3QgcHJvY2Vzc2luZyBvbiBuZXN0ZWQgbG9va3VwXG4gICAgICBkZWxldGUgY2xvbmVkT3B0aW9ucy5kZWZhdWx0VmFsdWU7IC8vIGFzc2VydCB3ZSBkbyBub3QgZ2V0IGEgZW5kbGVzcyBsb29wIG9uIGludGVycG9sYXRpbmcgZGVmYXVsdFZhbHVlIGFnYWluIGFuZCBhZ2FpblxuXG4gICAgICAvKipcbiAgICAgICAqIElmIHRoZXJlIGlzIG1vcmUgdGhhbiBvbmUgcGFyYW1ldGVyIChjb250YWlucyB0aGUgZm9ybWF0IHNlcGFyYXRvcikuIEUuZy46XG4gICAgICAgKiAgIC0gdChhLCBiKVxuICAgICAgICogICAtIHQoYSwgYiwgYylcbiAgICAgICAqXG4gICAgICAgKiBBbmQgdGhvc2UgcGFyYW1ldGVycyBhcmUgbm90IGR5bmFtaWMgdmFsdWVzIChwYXJhbWV0ZXJzIGRvIG5vdCBpbmNsdWRlIGN1cmx5IGJyYWNlcykuIEUuZy46XG4gICAgICAgKiAgIC0gTm90IHQoYSwgeyBcImtleVwiOiBcInt7dmFyaWFibGV9fVwiIH0pXG4gICAgICAgKiAgIC0gTm90IHQoYSwgYiwge1wia2V5QVwiOiBcInZhbHVlQVwiLCBcImtleUJcIjogXCJ2YWx1ZUJcIn0pXG4gICAgICAgKi9cbiAgICAgIGxldCBkb1JlZHVjZSA9IGZhbHNlO1xuICAgICAgaWYgKG1hdGNoWzBdLmluZGV4T2YodGhpcy5mb3JtYXRTZXBhcmF0b3IpICE9PSAtMSAmJiAhL3suKn0vLnRlc3QobWF0Y2hbMV0pKSB7XG4gICAgICAgIGNvbnN0IHIgPSBtYXRjaFsxXS5zcGxpdCh0aGlzLmZvcm1hdFNlcGFyYXRvcikubWFwKChlbGVtKSA9PiBlbGVtLnRyaW0oKSk7XG4gICAgICAgIG1hdGNoWzFdID0gci5zaGlmdCgpO1xuICAgICAgICBmb3JtYXR0ZXJzID0gcjtcbiAgICAgICAgZG9SZWR1Y2UgPSB0cnVlO1xuICAgICAgfVxuXG4gICAgICB2YWx1ZSA9IGZjKGhhbmRsZUhhc09wdGlvbnMuY2FsbCh0aGlzLCBtYXRjaFsxXS50cmltKCksIGNsb25lZE9wdGlvbnMpLCBjbG9uZWRPcHRpb25zKTtcblxuICAgICAgLy8gaXMgb25seSB0aGUgbmVzdGluZyBrZXkgKGtleTEgPSAnJChrZXkyKScpIHJldHVybiB0aGUgdmFsdWUgd2l0aG91dCBzdHJpbmdpZnlcbiAgICAgIGlmICh2YWx1ZSAmJiBtYXRjaFswXSA9PT0gc3RyICYmIHR5cGVvZiB2YWx1ZSAhPT0gJ3N0cmluZycpIHJldHVybiB2YWx1ZTtcblxuICAgICAgLy8gbm8gc3RyaW5nIHRvIGluY2x1ZGUgb3IgZW1wdHlcbiAgICAgIGlmICh0eXBlb2YgdmFsdWUgIT09ICdzdHJpbmcnKSB2YWx1ZSA9IHV0aWxzLm1ha2VTdHJpbmcodmFsdWUpO1xuICAgICAgaWYgKCF2YWx1ZSkge1xuICAgICAgICB0aGlzLmxvZ2dlci53YXJuKGBtaXNzZWQgdG8gcmVzb2x2ZSAke21hdGNoWzFdfSBmb3IgbmVzdGluZyAke3N0cn1gKTtcbiAgICAgICAgdmFsdWUgPSAnJztcbiAgICAgIH1cblxuICAgICAgaWYgKGRvUmVkdWNlKSB7XG4gICAgICAgIHZhbHVlID0gZm9ybWF0dGVycy5yZWR1Y2UoXG4gICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWxvb3AtZnVuY1xuICAgICAgICAgICh2LCBmKSA9PlxuICAgICAgICAgICAgdGhpcy5mb3JtYXQodiwgZiwgb3B0aW9ucy5sbmcsIHsgLi4ub3B0aW9ucywgaW50ZXJwb2xhdGlvbmtleTogbWF0Y2hbMV0udHJpbSgpIH0pLFxuICAgICAgICAgIHZhbHVlLnRyaW0oKSxcbiAgICAgICAgKTtcbiAgICAgIH1cblxuICAgICAgLy8gTmVzdGVkIGtleXMgc2hvdWxkIG5vdCBiZSBlc2NhcGVkIGJ5IGRlZmF1bHQgIzg1NFxuICAgICAgLy8gdmFsdWUgPSB0aGlzLmVzY2FwZVZhbHVlID8gcmVnZXhTYWZlKHV0aWxzLmVzY2FwZSh2YWx1ZSkpIDogcmVnZXhTYWZlKHZhbHVlKTtcbiAgICAgIHN0ciA9IHN0ci5yZXBsYWNlKG1hdGNoWzBdLCB2YWx1ZSk7XG4gICAgICB0aGlzLnJlZ2V4cC5sYXN0SW5kZXggPSAwO1xuICAgIH1cbiAgICByZXR1cm4gc3RyO1xuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IEludGVycG9sYXRvcjtcbiIsImltcG9ydCBiYXNlTG9nZ2VyIGZyb20gJy4vbG9nZ2VyLmpzJztcbmltcG9ydCB7IGdldENsZWFuZWRDb2RlIH0gZnJvbSAnLi91dGlscy5qcyc7XG5cbmZ1bmN0aW9uIHBhcnNlRm9ybWF0U3RyKGZvcm1hdFN0cikge1xuICBsZXQgZm9ybWF0TmFtZSA9IGZvcm1hdFN0ci50b0xvd2VyQ2FzZSgpLnRyaW0oKTtcbiAgY29uc3QgZm9ybWF0T3B0aW9ucyA9IHt9O1xuICBpZiAoZm9ybWF0U3RyLmluZGV4T2YoJygnKSA+IC0xKSB7XG4gICAgY29uc3QgcCA9IGZvcm1hdFN0ci5zcGxpdCgnKCcpO1xuICAgIGZvcm1hdE5hbWUgPSBwWzBdLnRvTG93ZXJDYXNlKCkudHJpbSgpO1xuXG4gICAgY29uc3Qgb3B0U3RyID0gcFsxXS5zdWJzdHJpbmcoMCwgcFsxXS5sZW5ndGggLSAxKTtcblxuICAgIC8vIGV4dHJhIGZvciBjdXJyZW5jeVxuICAgIGlmIChmb3JtYXROYW1lID09PSAnY3VycmVuY3knICYmIG9wdFN0ci5pbmRleE9mKCc6JykgPCAwKSB7XG4gICAgICBpZiAoIWZvcm1hdE9wdGlvbnMuY3VycmVuY3kpIGZvcm1hdE9wdGlvbnMuY3VycmVuY3kgPSBvcHRTdHIudHJpbSgpO1xuICAgIH0gZWxzZSBpZiAoZm9ybWF0TmFtZSA9PT0gJ3JlbGF0aXZldGltZScgJiYgb3B0U3RyLmluZGV4T2YoJzonKSA8IDApIHtcbiAgICAgIGlmICghZm9ybWF0T3B0aW9ucy5yYW5nZSkgZm9ybWF0T3B0aW9ucy5yYW5nZSA9IG9wdFN0ci50cmltKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IG9wdHMgPSBvcHRTdHIuc3BsaXQoJzsnKTtcblxuICAgICAgb3B0cy5mb3JFYWNoKChvcHQpID0+IHtcbiAgICAgICAgaWYgKCFvcHQpIHJldHVybjtcbiAgICAgICAgY29uc3QgW2tleSwgLi4ucmVzdF0gPSBvcHQuc3BsaXQoJzonKTtcbiAgICAgICAgY29uc3QgdmFsID0gcmVzdFxuICAgICAgICAgIC5qb2luKCc6JylcbiAgICAgICAgICAudHJpbSgpXG4gICAgICAgICAgLnJlcGxhY2UoL14nK3wnKyQvZywgJycpOyAvLyB0cmltIGFuZCByZXBsYWNlICcnXG5cbiAgICAgICAgaWYgKCFmb3JtYXRPcHRpb25zW2tleS50cmltKCldKSBmb3JtYXRPcHRpb25zW2tleS50cmltKCldID0gdmFsO1xuICAgICAgICBpZiAodmFsID09PSAnZmFsc2UnKSBmb3JtYXRPcHRpb25zW2tleS50cmltKCldID0gZmFsc2U7XG4gICAgICAgIGlmICh2YWwgPT09ICd0cnVlJykgZm9ybWF0T3B0aW9uc1trZXkudHJpbSgpXSA9IHRydWU7XG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1yZXN0cmljdGVkLWdsb2JhbHNcbiAgICAgICAgaWYgKCFpc05hTih2YWwpKSBmb3JtYXRPcHRpb25zW2tleS50cmltKCldID0gcGFyc2VJbnQodmFsLCAxMCk7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGZvcm1hdE5hbWUsXG4gICAgZm9ybWF0T3B0aW9ucyxcbiAgfTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlQ2FjaGVkRm9ybWF0dGVyKGZuKSB7XG4gIGNvbnN0IGNhY2hlID0ge307XG4gIHJldHVybiBmdW5jdGlvbiBpbnZva2VGb3JtYXR0ZXIodmFsLCBsbmcsIG9wdGlvbnMpIHtcbiAgICBjb25zdCBrZXkgPSBsbmcgKyBKU09OLnN0cmluZ2lmeShvcHRpb25zKTtcbiAgICBsZXQgZm9ybWF0dGVyID0gY2FjaGVba2V5XTtcbiAgICBpZiAoIWZvcm1hdHRlcikge1xuICAgICAgZm9ybWF0dGVyID0gZm4oZ2V0Q2xlYW5lZENvZGUobG5nKSwgb3B0aW9ucyk7XG4gICAgICBjYWNoZVtrZXldID0gZm9ybWF0dGVyO1xuICAgIH1cbiAgICByZXR1cm4gZm9ybWF0dGVyKHZhbCk7XG4gIH07XG59XG5cbmNsYXNzIEZvcm1hdHRlciB7XG4gIGNvbnN0cnVjdG9yKG9wdGlvbnMgPSB7fSkge1xuICAgIHRoaXMubG9nZ2VyID0gYmFzZUxvZ2dlci5jcmVhdGUoJ2Zvcm1hdHRlcicpO1xuXG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcbiAgICB0aGlzLmZvcm1hdHMgPSB7XG4gICAgICBudW1iZXI6IGNyZWF0ZUNhY2hlZEZvcm1hdHRlcigobG5nLCBvcHQpID0+IHtcbiAgICAgICAgY29uc3QgZm9ybWF0dGVyID0gbmV3IEludGwuTnVtYmVyRm9ybWF0KGxuZywgeyAuLi5vcHQgfSk7XG4gICAgICAgIHJldHVybiAodmFsKSA9PiBmb3JtYXR0ZXIuZm9ybWF0KHZhbCk7XG4gICAgICB9KSxcbiAgICAgIGN1cnJlbmN5OiBjcmVhdGVDYWNoZWRGb3JtYXR0ZXIoKGxuZywgb3B0KSA9PiB7XG4gICAgICAgIGNvbnN0IGZvcm1hdHRlciA9IG5ldyBJbnRsLk51bWJlckZvcm1hdChsbmcsIHsgLi4ub3B0LCBzdHlsZTogJ2N1cnJlbmN5JyB9KTtcbiAgICAgICAgcmV0dXJuICh2YWwpID0+IGZvcm1hdHRlci5mb3JtYXQodmFsKTtcbiAgICAgIH0pLFxuICAgICAgZGF0ZXRpbWU6IGNyZWF0ZUNhY2hlZEZvcm1hdHRlcigobG5nLCBvcHQpID0+IHtcbiAgICAgICAgY29uc3QgZm9ybWF0dGVyID0gbmV3IEludGwuRGF0ZVRpbWVGb3JtYXQobG5nLCB7IC4uLm9wdCB9KTtcbiAgICAgICAgcmV0dXJuICh2YWwpID0+IGZvcm1hdHRlci5mb3JtYXQodmFsKTtcbiAgICAgIH0pLFxuICAgICAgcmVsYXRpdmV0aW1lOiBjcmVhdGVDYWNoZWRGb3JtYXR0ZXIoKGxuZywgb3B0KSA9PiB7XG4gICAgICAgIGNvbnN0IGZvcm1hdHRlciA9IG5ldyBJbnRsLlJlbGF0aXZlVGltZUZvcm1hdChsbmcsIHsgLi4ub3B0IH0pO1xuICAgICAgICByZXR1cm4gKHZhbCkgPT4gZm9ybWF0dGVyLmZvcm1hdCh2YWwsIG9wdC5yYW5nZSB8fCAnZGF5Jyk7XG4gICAgICB9KSxcbiAgICAgIGxpc3Q6IGNyZWF0ZUNhY2hlZEZvcm1hdHRlcigobG5nLCBvcHQpID0+IHtcbiAgICAgICAgY29uc3QgZm9ybWF0dGVyID0gbmV3IEludGwuTGlzdEZvcm1hdChsbmcsIHsgLi4ub3B0IH0pO1xuICAgICAgICByZXR1cm4gKHZhbCkgPT4gZm9ybWF0dGVyLmZvcm1hdCh2YWwpO1xuICAgICAgfSksXG4gICAgfTtcbiAgICB0aGlzLmluaXQob3B0aW9ucyk7XG4gIH1cblxuICAvKiBlc2xpbnQgbm8tcGFyYW0tcmVhc3NpZ246IDAgKi9cbiAgaW5pdChzZXJ2aWNlcywgb3B0aW9ucyA9IHsgaW50ZXJwb2xhdGlvbjoge30gfSkge1xuICAgIGNvbnN0IGlPcHRzID0gb3B0aW9ucy5pbnRlcnBvbGF0aW9uO1xuXG4gICAgdGhpcy5mb3JtYXRTZXBhcmF0b3IgPSBpT3B0cy5mb3JtYXRTZXBhcmF0b3JcbiAgICAgID8gaU9wdHMuZm9ybWF0U2VwYXJhdG9yXG4gICAgICA6IGlPcHRzLmZvcm1hdFNlcGFyYXRvciB8fCAnLCc7XG4gIH1cblxuICBhZGQobmFtZSwgZmMpIHtcbiAgICB0aGlzLmZvcm1hdHNbbmFtZS50b0xvd2VyQ2FzZSgpLnRyaW0oKV0gPSBmYztcbiAgfVxuXG4gIGFkZENhY2hlZChuYW1lLCBmYykge1xuICAgIHRoaXMuZm9ybWF0c1tuYW1lLnRvTG93ZXJDYXNlKCkudHJpbSgpXSA9IGNyZWF0ZUNhY2hlZEZvcm1hdHRlcihmYyk7XG4gIH1cblxuICBmb3JtYXQodmFsdWUsIGZvcm1hdCwgbG5nLCBvcHRpb25zID0ge30pIHtcbiAgICBjb25zdCBmb3JtYXRzID0gZm9ybWF0LnNwbGl0KHRoaXMuZm9ybWF0U2VwYXJhdG9yKTtcblxuICAgIGNvbnN0IHJlc3VsdCA9IGZvcm1hdHMucmVkdWNlKChtZW0sIGYpID0+IHtcbiAgICAgIGNvbnN0IHsgZm9ybWF0TmFtZSwgZm9ybWF0T3B0aW9ucyB9ID0gcGFyc2VGb3JtYXRTdHIoZik7XG5cbiAgICAgIGlmICh0aGlzLmZvcm1hdHNbZm9ybWF0TmFtZV0pIHtcbiAgICAgICAgbGV0IGZvcm1hdHRlZCA9IG1lbTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAvLyBvcHRpb25zIHBhc3NlZCBleHBsaWNpdCBmb3IgdGhhdCBmb3JtYXR0ZWQgdmFsdWVcbiAgICAgICAgICBjb25zdCB2YWxPcHRpb25zID1cbiAgICAgICAgICAgIChvcHRpb25zICYmIG9wdGlvbnMuZm9ybWF0UGFyYW1zICYmIG9wdGlvbnMuZm9ybWF0UGFyYW1zW29wdGlvbnMuaW50ZXJwb2xhdGlvbmtleV0pIHx8XG4gICAgICAgICAgICB7fTtcblxuICAgICAgICAgIC8vIGxhbmd1YWdlXG4gICAgICAgICAgY29uc3QgbCA9IHZhbE9wdGlvbnMubG9jYWxlIHx8IHZhbE9wdGlvbnMubG5nIHx8IG9wdGlvbnMubG9jYWxlIHx8IG9wdGlvbnMubG5nIHx8IGxuZztcblxuICAgICAgICAgIGZvcm1hdHRlZCA9IHRoaXMuZm9ybWF0c1tmb3JtYXROYW1lXShtZW0sIGwsIHtcbiAgICAgICAgICAgIC4uLmZvcm1hdE9wdGlvbnMsXG4gICAgICAgICAgICAuLi5vcHRpb25zLFxuICAgICAgICAgICAgLi4udmFsT3B0aW9ucyxcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICB0aGlzLmxvZ2dlci53YXJuKGVycm9yKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZm9ybWF0dGVkO1xuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tZWxzZS1yZXR1cm5cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMubG9nZ2VyLndhcm4oYHRoZXJlIHdhcyBubyBmb3JtYXQgZnVuY3Rpb24gZm9yICR7Zm9ybWF0TmFtZX1gKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBtZW07XG4gICAgfSwgdmFsdWUpO1xuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBGb3JtYXR0ZXI7XG4iLCJpbXBvcnQgKiBhcyB1dGlscyBmcm9tICcuL3V0aWxzLmpzJztcbmltcG9ydCBiYXNlTG9nZ2VyIGZyb20gJy4vbG9nZ2VyLmpzJztcbmltcG9ydCBFdmVudEVtaXR0ZXIgZnJvbSAnLi9FdmVudEVtaXR0ZXIuanMnO1xuXG5mdW5jdGlvbiByZW1vdmVQZW5kaW5nKHEsIG5hbWUpIHtcbiAgaWYgKHEucGVuZGluZ1tuYW1lXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgZGVsZXRlIHEucGVuZGluZ1tuYW1lXTtcbiAgICBxLnBlbmRpbmdDb3VudC0tO1xuICB9XG59XG5cbmNsYXNzIENvbm5lY3RvciBleHRlbmRzIEV2ZW50RW1pdHRlciB7XG4gIGNvbnN0cnVjdG9yKGJhY2tlbmQsIHN0b3JlLCBzZXJ2aWNlcywgb3B0aW9ucyA9IHt9KSB7XG4gICAgc3VwZXIoKTtcblxuICAgIHRoaXMuYmFja2VuZCA9IGJhY2tlbmQ7XG4gICAgdGhpcy5zdG9yZSA9IHN0b3JlO1xuICAgIHRoaXMuc2VydmljZXMgPSBzZXJ2aWNlcztcbiAgICB0aGlzLmxhbmd1YWdlVXRpbHMgPSBzZXJ2aWNlcy5sYW5ndWFnZVV0aWxzO1xuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG4gICAgdGhpcy5sb2dnZXIgPSBiYXNlTG9nZ2VyLmNyZWF0ZSgnYmFja2VuZENvbm5lY3RvcicpO1xuXG4gICAgdGhpcy53YWl0aW5nUmVhZHMgPSBbXTtcbiAgICB0aGlzLm1heFBhcmFsbGVsUmVhZHMgPSBvcHRpb25zLm1heFBhcmFsbGVsUmVhZHMgfHwgMTA7XG4gICAgdGhpcy5yZWFkaW5nQ2FsbHMgPSAwO1xuXG4gICAgdGhpcy5tYXhSZXRyaWVzID0gb3B0aW9ucy5tYXhSZXRyaWVzID49IDAgPyBvcHRpb25zLm1heFJldHJpZXMgOiA1O1xuICAgIHRoaXMucmV0cnlUaW1lb3V0ID0gb3B0aW9ucy5yZXRyeVRpbWVvdXQgPj0gMSA/IG9wdGlvbnMucmV0cnlUaW1lb3V0IDogMzUwO1xuXG4gICAgdGhpcy5zdGF0ZSA9IHt9O1xuICAgIHRoaXMucXVldWUgPSBbXTtcblxuICAgIGlmICh0aGlzLmJhY2tlbmQgJiYgdGhpcy5iYWNrZW5kLmluaXQpIHtcbiAgICAgIHRoaXMuYmFja2VuZC5pbml0KHNlcnZpY2VzLCBvcHRpb25zLmJhY2tlbmQsIG9wdGlvbnMpO1xuICAgIH1cbiAgfVxuXG4gIHF1ZXVlTG9hZChsYW5ndWFnZXMsIG5hbWVzcGFjZXMsIG9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gICAgLy8gZmluZCB3aGF0IG5lZWRzIHRvIGJlIGxvYWRlZFxuICAgIGNvbnN0IHRvTG9hZCA9IHt9O1xuICAgIGNvbnN0IHBlbmRpbmcgPSB7fTtcbiAgICBjb25zdCB0b0xvYWRMYW5ndWFnZXMgPSB7fTtcbiAgICBjb25zdCB0b0xvYWROYW1lc3BhY2VzID0ge307XG5cbiAgICBsYW5ndWFnZXMuZm9yRWFjaCgobG5nKSA9PiB7XG4gICAgICBsZXQgaGFzQWxsTmFtZXNwYWNlcyA9IHRydWU7XG5cbiAgICAgIG5hbWVzcGFjZXMuZm9yRWFjaCgobnMpID0+IHtcbiAgICAgICAgY29uc3QgbmFtZSA9IGAke2xuZ318JHtuc31gO1xuXG4gICAgICAgIGlmICghb3B0aW9ucy5yZWxvYWQgJiYgdGhpcy5zdG9yZS5oYXNSZXNvdXJjZUJ1bmRsZShsbmcsIG5zKSkge1xuICAgICAgICAgIHRoaXMuc3RhdGVbbmFtZV0gPSAyOyAvLyBsb2FkZWRcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLnN0YXRlW25hbWVdIDwgMCkge1xuICAgICAgICAgIC8vIG5vdGhpbmcgdG8gZG8gZm9yIGVyclxuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuc3RhdGVbbmFtZV0gPT09IDEpIHtcbiAgICAgICAgICBpZiAocGVuZGluZ1tuYW1lXSA9PT0gdW5kZWZpbmVkKSBwZW5kaW5nW25hbWVdID0gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLnN0YXRlW25hbWVdID0gMTsgLy8gcGVuZGluZ1xuXG4gICAgICAgICAgaGFzQWxsTmFtZXNwYWNlcyA9IGZhbHNlO1xuXG4gICAgICAgICAgaWYgKHBlbmRpbmdbbmFtZV0gPT09IHVuZGVmaW5lZCkgcGVuZGluZ1tuYW1lXSA9IHRydWU7XG4gICAgICAgICAgaWYgKHRvTG9hZFtuYW1lXSA9PT0gdW5kZWZpbmVkKSB0b0xvYWRbbmFtZV0gPSB0cnVlO1xuICAgICAgICAgIGlmICh0b0xvYWROYW1lc3BhY2VzW25zXSA9PT0gdW5kZWZpbmVkKSB0b0xvYWROYW1lc3BhY2VzW25zXSA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICBpZiAoIWhhc0FsbE5hbWVzcGFjZXMpIHRvTG9hZExhbmd1YWdlc1tsbmddID0gdHJ1ZTtcbiAgICB9KTtcblxuICAgIGlmIChPYmplY3Qua2V5cyh0b0xvYWQpLmxlbmd0aCB8fCBPYmplY3Qua2V5cyhwZW5kaW5nKS5sZW5ndGgpIHtcbiAgICAgIHRoaXMucXVldWUucHVzaCh7XG4gICAgICAgIHBlbmRpbmcsXG4gICAgICAgIHBlbmRpbmdDb3VudDogT2JqZWN0LmtleXMocGVuZGluZykubGVuZ3RoLFxuICAgICAgICBsb2FkZWQ6IHt9LFxuICAgICAgICBlcnJvcnM6IFtdLFxuICAgICAgICBjYWxsYmFjayxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICB0b0xvYWQ6IE9iamVjdC5rZXlzKHRvTG9hZCksXG4gICAgICBwZW5kaW5nOiBPYmplY3Qua2V5cyhwZW5kaW5nKSxcbiAgICAgIHRvTG9hZExhbmd1YWdlczogT2JqZWN0LmtleXModG9Mb2FkTGFuZ3VhZ2VzKSxcbiAgICAgIHRvTG9hZE5hbWVzcGFjZXM6IE9iamVjdC5rZXlzKHRvTG9hZE5hbWVzcGFjZXMpLFxuICAgIH07XG4gIH1cblxuICBsb2FkZWQobmFtZSwgZXJyLCBkYXRhKSB7XG4gICAgY29uc3QgcyA9IG5hbWUuc3BsaXQoJ3wnKTtcbiAgICBjb25zdCBsbmcgPSBzWzBdO1xuICAgIGNvbnN0IG5zID0gc1sxXTtcblxuICAgIGlmIChlcnIpIHRoaXMuZW1pdCgnZmFpbGVkTG9hZGluZycsIGxuZywgbnMsIGVycik7XG5cbiAgICBpZiAoZGF0YSkge1xuICAgICAgdGhpcy5zdG9yZS5hZGRSZXNvdXJjZUJ1bmRsZShsbmcsIG5zLCBkYXRhKTtcbiAgICB9XG5cbiAgICAvLyBzZXQgbG9hZGVkXG4gICAgdGhpcy5zdGF0ZVtuYW1lXSA9IGVyciA/IC0xIDogMjtcblxuICAgIC8vIGNvbnNvbGlkYXRlZCBsb2FkaW5nIGRvbmUgaW4gdGhpcyBydW4gLSBvbmx5IGVtaXQgb25jZSBmb3IgYSBsb2FkZWQgbmFtZXNwYWNlXG4gICAgY29uc3QgbG9hZGVkID0ge307XG5cbiAgICAvLyBjYWxsYmFjayBpZiByZWFkeVxuICAgIHRoaXMucXVldWUuZm9yRWFjaCgocSkgPT4ge1xuICAgICAgdXRpbHMucHVzaFBhdGgocS5sb2FkZWQsIFtsbmddLCBucyk7XG4gICAgICByZW1vdmVQZW5kaW5nKHEsIG5hbWUpO1xuXG4gICAgICBpZiAoZXJyKSBxLmVycm9ycy5wdXNoKGVycik7XG5cbiAgICAgIGlmIChxLnBlbmRpbmdDb3VudCA9PT0gMCAmJiAhcS5kb25lKSB7XG4gICAgICAgIC8vIG9ubHkgZG8gb25jZSBwZXIgbG9hZGVkIC0+IHRoaXMuZW1pdCgnbG9hZGVkJywgcS5sb2FkZWQpO1xuICAgICAgICBPYmplY3Qua2V5cyhxLmxvYWRlZCkuZm9yRWFjaCgobCkgPT4ge1xuICAgICAgICAgIGlmICghbG9hZGVkW2xdKSBsb2FkZWRbbF0gPSB7fTtcbiAgICAgICAgICBjb25zdCBsb2FkZWRLZXlzID0gcS5sb2FkZWRbbF07XG4gICAgICAgICAgaWYgKGxvYWRlZEtleXMubGVuZ3RoKSB7XG4gICAgICAgICAgICBsb2FkZWRLZXlzLmZvckVhY2goKG4pID0+IHtcbiAgICAgICAgICAgICAgaWYgKGxvYWRlZFtsXVtuXSA9PT0gdW5kZWZpbmVkKSBsb2FkZWRbbF1bbl0gPSB0cnVlO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvKiBlc2xpbnQgbm8tcGFyYW0tcmVhc3NpZ246IDAgKi9cbiAgICAgICAgcS5kb25lID0gdHJ1ZTtcbiAgICAgICAgaWYgKHEuZXJyb3JzLmxlbmd0aCkge1xuICAgICAgICAgIHEuY2FsbGJhY2socS5lcnJvcnMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHEuY2FsbGJhY2soKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gZW1pdCBjb25zb2xpZGF0ZWQgbG9hZGVkIGV2ZW50XG4gICAgdGhpcy5lbWl0KCdsb2FkZWQnLCBsb2FkZWQpO1xuXG4gICAgLy8gcmVtb3ZlIGRvbmUgbG9hZCByZXF1ZXN0c1xuICAgIHRoaXMucXVldWUgPSB0aGlzLnF1ZXVlLmZpbHRlcigocSkgPT4gIXEuZG9uZSk7XG4gIH1cblxuICByZWFkKGxuZywgbnMsIGZjTmFtZSwgdHJpZWQgPSAwLCB3YWl0ID0gdGhpcy5yZXRyeVRpbWVvdXQsIGNhbGxiYWNrKSB7XG4gICAgaWYgKCFsbmcubGVuZ3RoKSByZXR1cm4gY2FsbGJhY2sobnVsbCwge30pOyAvLyBub3RpbmcgdG8gbG9hZFxuXG4gICAgLy8gTGltaXQgcGFyYWxsZWxpc20gb2YgY2FsbHMgdG8gYmFja2VuZFxuICAgIC8vIFRoaXMgaXMgbmVlZGVkIHRvIHByZXZlbnQgdHJ5aW5nIHRvIG9wZW4gdGhvdXNhbmRzIG9mXG4gICAgLy8gc29ja2V0cyBvciBmaWxlIGRlc2NyaXB0b3JzLCB3aGljaCBjYW4gY2F1c2UgZmFpbHVyZXNcbiAgICAvLyBhbmQgYWN0dWFsbHkgbWFrZSB0aGUgZW50aXJlIHByb2Nlc3MgdGFrZSBsb25nZXIuXG4gICAgaWYgKHRoaXMucmVhZGluZ0NhbGxzID49IHRoaXMubWF4UGFyYWxsZWxSZWFkcykge1xuICAgICAgdGhpcy53YWl0aW5nUmVhZHMucHVzaCh7IGxuZywgbnMsIGZjTmFtZSwgdHJpZWQsIHdhaXQsIGNhbGxiYWNrIH0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLnJlYWRpbmdDYWxscysrO1xuXG4gICAgY29uc3QgcmVzb2x2ZXIgPSAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICB0aGlzLnJlYWRpbmdDYWxscy0tO1xuICAgICAgaWYgKHRoaXMud2FpdGluZ1JlYWRzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgY29uc3QgbmV4dCA9IHRoaXMud2FpdGluZ1JlYWRzLnNoaWZ0KCk7XG4gICAgICAgIHRoaXMucmVhZChuZXh0LmxuZywgbmV4dC5ucywgbmV4dC5mY05hbWUsIG5leHQudHJpZWQsIG5leHQud2FpdCwgbmV4dC5jYWxsYmFjayk7XG4gICAgICB9XG4gICAgICBpZiAoZXJyICYmIGRhdGEgLyogPSByZXRyeUZsYWcgKi8gJiYgdHJpZWQgPCB0aGlzLm1heFJldHJpZXMpIHtcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgdGhpcy5yZWFkLmNhbGwodGhpcywgbG5nLCBucywgZmNOYW1lLCB0cmllZCArIDEsIHdhaXQgKiAyLCBjYWxsYmFjayk7XG4gICAgICAgIH0sIHdhaXQpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjYWxsYmFjayhlcnIsIGRhdGEpO1xuICAgIH07XG5cbiAgICBjb25zdCBmYyA9IHRoaXMuYmFja2VuZFtmY05hbWVdLmJpbmQodGhpcy5iYWNrZW5kKTtcbiAgICBpZiAoZmMubGVuZ3RoID09PSAyKSB7XG4gICAgICAvLyBubyBjYWxsYmFja1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgciA9IGZjKGxuZywgbnMpO1xuICAgICAgICBpZiAociAmJiB0eXBlb2Ygci50aGVuID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgLy8gcHJvbWlzZVxuICAgICAgICAgIHIudGhlbigoZGF0YSkgPT4gcmVzb2x2ZXIobnVsbCwgZGF0YSkpLmNhdGNoKHJlc29sdmVyKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBzeW5jXG4gICAgICAgICAgcmVzb2x2ZXIobnVsbCwgcik7XG4gICAgICAgIH1cbiAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICByZXNvbHZlcihlcnIpO1xuICAgICAgfVxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIG5vcm1hbCB3aXRoIGNhbGxiYWNrXG4gICAgcmV0dXJuIGZjKGxuZywgbnMsIHJlc29sdmVyKTtcbiAgfVxuXG4gIC8qIGVzbGludCBjb25zaXN0ZW50LXJldHVybjogMCAqL1xuICBwcmVwYXJlTG9hZGluZyhsYW5ndWFnZXMsIG5hbWVzcGFjZXMsIG9wdGlvbnMgPSB7fSwgY2FsbGJhY2spIHtcbiAgICBpZiAoIXRoaXMuYmFja2VuZCkge1xuICAgICAgdGhpcy5sb2dnZXIud2FybignTm8gYmFja2VuZCB3YXMgYWRkZWQgdmlhIGkxOG5leHQudXNlLiBXaWxsIG5vdCBsb2FkIHJlc291cmNlcy4nKTtcbiAgICAgIHJldHVybiBjYWxsYmFjayAmJiBjYWxsYmFjaygpO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2YgbGFuZ3VhZ2VzID09PSAnc3RyaW5nJykgbGFuZ3VhZ2VzID0gdGhpcy5sYW5ndWFnZVV0aWxzLnRvUmVzb2x2ZUhpZXJhcmNoeShsYW5ndWFnZXMpO1xuICAgIGlmICh0eXBlb2YgbmFtZXNwYWNlcyA9PT0gJ3N0cmluZycpIG5hbWVzcGFjZXMgPSBbbmFtZXNwYWNlc107XG5cbiAgICBjb25zdCB0b0xvYWQgPSB0aGlzLnF1ZXVlTG9hZChsYW5ndWFnZXMsIG5hbWVzcGFjZXMsIG9wdGlvbnMsIGNhbGxiYWNrKTtcbiAgICBpZiAoIXRvTG9hZC50b0xvYWQubGVuZ3RoKSB7XG4gICAgICBpZiAoIXRvTG9hZC5wZW5kaW5nLmxlbmd0aCkgY2FsbGJhY2soKTsgLy8gbm90aGluZyB0byBsb2FkIGFuZCBubyBwZW5kaW5ncy4uLmNhbGxiYWNrIG5vd1xuICAgICAgcmV0dXJuIG51bGw7IC8vIHBlbmRpbmdzIHdpbGwgdHJpZ2dlciBjYWxsYmFja1xuICAgIH1cblxuICAgIHRvTG9hZC50b0xvYWQuZm9yRWFjaCgobmFtZSkgPT4ge1xuICAgICAgdGhpcy5sb2FkT25lKG5hbWUpO1xuICAgIH0pO1xuICB9XG5cbiAgbG9hZChsYW5ndWFnZXMsIG5hbWVzcGFjZXMsIGNhbGxiYWNrKSB7XG4gICAgdGhpcy5wcmVwYXJlTG9hZGluZyhsYW5ndWFnZXMsIG5hbWVzcGFjZXMsIHt9LCBjYWxsYmFjayk7XG4gIH1cblxuICByZWxvYWQobGFuZ3VhZ2VzLCBuYW1lc3BhY2VzLCBjYWxsYmFjaykge1xuICAgIHRoaXMucHJlcGFyZUxvYWRpbmcobGFuZ3VhZ2VzLCBuYW1lc3BhY2VzLCB7IHJlbG9hZDogdHJ1ZSB9LCBjYWxsYmFjayk7XG4gIH1cblxuICBsb2FkT25lKG5hbWUsIHByZWZpeCA9ICcnKSB7XG4gICAgY29uc3QgcyA9IG5hbWUuc3BsaXQoJ3wnKTtcbiAgICBjb25zdCBsbmcgPSBzWzBdO1xuICAgIGNvbnN0IG5zID0gc1sxXTtcblxuICAgIHRoaXMucmVhZChsbmcsIG5zLCAncmVhZCcsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICBpZiAoZXJyKSB0aGlzLmxvZ2dlci53YXJuKGAke3ByZWZpeH1sb2FkaW5nIG5hbWVzcGFjZSAke25zfSBmb3IgbGFuZ3VhZ2UgJHtsbmd9IGZhaWxlZGAsIGVycik7XG4gICAgICBpZiAoIWVyciAmJiBkYXRhKVxuICAgICAgICB0aGlzLmxvZ2dlci5sb2coYCR7cHJlZml4fWxvYWRlZCBuYW1lc3BhY2UgJHtuc30gZm9yIGxhbmd1YWdlICR7bG5nfWAsIGRhdGEpO1xuXG4gICAgICB0aGlzLmxvYWRlZChuYW1lLCBlcnIsIGRhdGEpO1xuICAgIH0pO1xuICB9XG5cbiAgc2F2ZU1pc3NpbmcobGFuZ3VhZ2VzLCBuYW1lc3BhY2UsIGtleSwgZmFsbGJhY2tWYWx1ZSwgaXNVcGRhdGUsIG9wdGlvbnMgPSB7fSwgY2xiID0gKCkgPT4ge30pIHtcbiAgICBpZiAoXG4gICAgICB0aGlzLnNlcnZpY2VzLnV0aWxzICYmXG4gICAgICB0aGlzLnNlcnZpY2VzLnV0aWxzLmhhc0xvYWRlZE5hbWVzcGFjZSAmJlxuICAgICAgIXRoaXMuc2VydmljZXMudXRpbHMuaGFzTG9hZGVkTmFtZXNwYWNlKG5hbWVzcGFjZSlcbiAgICApIHtcbiAgICAgIHRoaXMubG9nZ2VyLndhcm4oXG4gICAgICAgIGBkaWQgbm90IHNhdmUga2V5IFwiJHtrZXl9XCIgYXMgdGhlIG5hbWVzcGFjZSBcIiR7bmFtZXNwYWNlfVwiIHdhcyBub3QgeWV0IGxvYWRlZGAsXG4gICAgICAgICdUaGlzIG1lYW5zIHNvbWV0aGluZyBJUyBXUk9ORyBpbiB5b3VyIHNldHVwLiBZb3UgYWNjZXNzIHRoZSB0IGZ1bmN0aW9uIGJlZm9yZSBpMThuZXh0LmluaXQgLyBpMThuZXh0LmxvYWROYW1lc3BhY2UgLyBpMThuZXh0LmNoYW5nZUxhbmd1YWdlIHdhcyBkb25lLiBXYWl0IGZvciB0aGUgY2FsbGJhY2sgb3IgUHJvbWlzZSB0byByZXNvbHZlIGJlZm9yZSBhY2Nlc3NpbmcgaXQhISEnLFxuICAgICAgKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBpZ25vcmUgbm9uIHZhbGlkIGtleXNcbiAgICBpZiAoa2V5ID09PSB1bmRlZmluZWQgfHwga2V5ID09PSBudWxsIHx8IGtleSA9PT0gJycpIHJldHVybjtcblxuICAgIGlmICh0aGlzLmJhY2tlbmQgJiYgdGhpcy5iYWNrZW5kLmNyZWF0ZSkge1xuICAgICAgY29uc3Qgb3B0cyA9IHtcbiAgICAgICAgLi4ub3B0aW9ucyxcbiAgICAgICAgaXNVcGRhdGUsXG4gICAgICB9O1xuICAgICAgY29uc3QgZmMgPSB0aGlzLmJhY2tlbmQuY3JlYXRlLmJpbmQodGhpcy5iYWNrZW5kKTtcbiAgICAgIGlmIChmYy5sZW5ndGggPCA2KSB7XG4gICAgICAgIC8vIG5vIGNhbGxiYWNrXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgbGV0IHI7XG4gICAgICAgICAgaWYgKGZjLmxlbmd0aCA9PT0gNSkge1xuICAgICAgICAgICAgLy8gZnV0dXJlIGNhbGxiYWNrLWxlc3MgYXBpIGZvciBpMThuZXh0LWxvY2l6ZS1iYWNrZW5kXG4gICAgICAgICAgICByID0gZmMobGFuZ3VhZ2VzLCBuYW1lc3BhY2UsIGtleSwgZmFsbGJhY2tWYWx1ZSwgb3B0cyk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHIgPSBmYyhsYW5ndWFnZXMsIG5hbWVzcGFjZSwga2V5LCBmYWxsYmFja1ZhbHVlKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHIgJiYgdHlwZW9mIHIudGhlbiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgLy8gcHJvbWlzZVxuICAgICAgICAgICAgci50aGVuKChkYXRhKSA9PiBjbGIobnVsbCwgZGF0YSkpLmNhdGNoKGNsYik7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIHN5bmNcbiAgICAgICAgICAgIGNsYihudWxsLCByKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgIGNsYihlcnIpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBub3JtYWwgd2l0aCBjYWxsYmFja1xuICAgICAgICBmYyhsYW5ndWFnZXMsIG5hbWVzcGFjZSwga2V5LCBmYWxsYmFja1ZhbHVlLCBjbGIgLyogdW51c2VkIGNhbGxiYWNrICovLCBvcHRzKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyB3cml0ZSB0byBzdG9yZSB0byBhdm9pZCByZXNlbmRpbmdcbiAgICBpZiAoIWxhbmd1YWdlcyB8fCAhbGFuZ3VhZ2VzWzBdKSByZXR1cm47XG4gICAgdGhpcy5zdG9yZS5hZGRSZXNvdXJjZShsYW5ndWFnZXNbMF0sIG5hbWVzcGFjZSwga2V5LCBmYWxsYmFja1ZhbHVlKTtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBDb25uZWN0b3I7XG4iLCJleHBvcnQgZnVuY3Rpb24gZ2V0KCkge1xuICByZXR1cm4ge1xuICAgIGRlYnVnOiBmYWxzZSxcbiAgICBpbml0SW1tZWRpYXRlOiB0cnVlLFxuXG4gICAgbnM6IFsndHJhbnNsYXRpb24nXSxcbiAgICBkZWZhdWx0TlM6IFsndHJhbnNsYXRpb24nXSxcbiAgICBmYWxsYmFja0xuZzogWydkZXYnXSxcbiAgICBmYWxsYmFja05TOiBmYWxzZSwgLy8gc3RyaW5nIG9yIGFycmF5IG9mIG5hbWVzcGFjZXNcblxuICAgIHN1cHBvcnRlZExuZ3M6IGZhbHNlLCAvLyBhcnJheSB3aXRoIHN1cHBvcnRlZCBsYW5ndWFnZXNcbiAgICBub25FeHBsaWNpdFN1cHBvcnRlZExuZ3M6IGZhbHNlLFxuICAgIGxvYWQ6ICdhbGwnLCAvLyB8IGN1cnJlbnRPbmx5IHwgbGFuZ3VhZ2VPbmx5XG4gICAgcHJlbG9hZDogZmFsc2UsIC8vIGFycmF5IHdpdGggcHJlbG9hZCBsYW5ndWFnZXNcblxuICAgIHNpbXBsaWZ5UGx1cmFsU3VmZml4OiB0cnVlLFxuICAgIGtleVNlcGFyYXRvcjogJy4nLFxuICAgIG5zU2VwYXJhdG9yOiAnOicsXG4gICAgcGx1cmFsU2VwYXJhdG9yOiAnXycsXG4gICAgY29udGV4dFNlcGFyYXRvcjogJ18nLFxuXG4gICAgcGFydGlhbEJ1bmRsZWRMYW5ndWFnZXM6IGZhbHNlLCAvLyBhbGxvdyBidW5kbGluZyBjZXJ0YWluIGxhbmd1YWdlcyB0aGF0IGFyZSBub3QgcmVtb3RlbHkgZmV0Y2hlZFxuICAgIHNhdmVNaXNzaW5nOiBmYWxzZSwgLy8gZW5hYmxlIHRvIHNlbmQgbWlzc2luZyB2YWx1ZXNcbiAgICB1cGRhdGVNaXNzaW5nOiBmYWxzZSwgLy8gZW5hYmxlIHRvIHVwZGF0ZSBkZWZhdWx0IHZhbHVlcyBpZiBkaWZmZXJlbnQgZnJvbSB0cmFuc2xhdGVkIHZhbHVlIChvbmx5IHVzZWZ1bCBvbiBpbml0aWFsIGRldmVsb3BtZW50LCBvciB3aGVuIGtlZXBpbmcgY29kZSBhcyBzb3VyY2Ugb2YgdHJ1dGgpXG4gICAgc2F2ZU1pc3NpbmdUbzogJ2ZhbGxiYWNrJywgLy8gJ2N1cnJlbnQnIHx8ICdhbGwnXG4gICAgc2F2ZU1pc3NpbmdQbHVyYWxzOiB0cnVlLCAvLyB3aWxsIHNhdmUgYWxsIGZvcm1zIG5vdCBvbmx5IHNpbmd1bGFyIGtleVxuICAgIG1pc3NpbmdLZXlIYW5kbGVyOiBmYWxzZSwgLy8gZnVuY3Rpb24obG5nLCBucywga2V5LCBmYWxsYmFja1ZhbHVlKSAtPiBvdmVycmlkZSBpZiBwcmVmZXIgb24gaGFuZGxpbmdcbiAgICBtaXNzaW5nSW50ZXJwb2xhdGlvbkhhbmRsZXI6IGZhbHNlLCAvLyBmdW5jdGlvbihzdHIsIG1hdGNoKVxuXG4gICAgcG9zdFByb2Nlc3M6IGZhbHNlLCAvLyBzdHJpbmcgb3IgYXJyYXkgb2YgcG9zdFByb2Nlc3NvciBuYW1lc1xuICAgIHBvc3RQcm9jZXNzUGFzc1Jlc29sdmVkOiBmYWxzZSwgLy8gcGFzcyByZXNvbHZlZCBvYmplY3QgaW50byAnb3B0aW9ucy5pMThuUmVzb2x2ZWQnIGZvciBwb3N0cHJvY2Vzc29yXG4gICAgcmV0dXJuTnVsbDogZmFsc2UsIC8vIGFsbG93cyBudWxsIHZhbHVlIGFzIHZhbGlkIHRyYW5zbGF0aW9uXG4gICAgcmV0dXJuRW1wdHlTdHJpbmc6IHRydWUsIC8vIGFsbG93cyBlbXB0eSBzdHJpbmcgdmFsdWUgYXMgdmFsaWQgdHJhbnNsYXRpb25cbiAgICByZXR1cm5PYmplY3RzOiBmYWxzZSxcbiAgICBqb2luQXJyYXlzOiBmYWxzZSwgLy8gb3Igc3RyaW5nIHRvIGpvaW4gYXJyYXlcbiAgICByZXR1cm5lZE9iamVjdEhhbmRsZXI6IGZhbHNlLCAvLyBmdW5jdGlvbihrZXksIHZhbHVlLCBvcHRpb25zKSB0cmlnZ2VyZWQgaWYga2V5IHJldHVybnMgb2JqZWN0IGJ1dCByZXR1cm5PYmplY3RzIGlzIHNldCB0byBmYWxzZVxuICAgIHBhcnNlTWlzc2luZ0tleUhhbmRsZXI6IGZhbHNlLCAvLyBmdW5jdGlvbihrZXkpIHBhcnNlZCBhIGtleSB0aGF0IHdhcyBub3QgZm91bmQgaW4gdCgpIGJlZm9yZSByZXR1cm5pbmdcbiAgICBhcHBlbmROYW1lc3BhY2VUb01pc3NpbmdLZXk6IGZhbHNlLFxuICAgIGFwcGVuZE5hbWVzcGFjZVRvQ0lNb2RlOiBmYWxzZSxcbiAgICBvdmVybG9hZFRyYW5zbGF0aW9uT3B0aW9uSGFuZGxlcjogZnVuY3Rpb24gaGFuZGxlKGFyZ3MpIHtcbiAgICAgIGxldCByZXQgPSB7fTtcbiAgICAgIGlmICh0eXBlb2YgYXJnc1sxXSA9PT0gJ29iamVjdCcpIHJldCA9IGFyZ3NbMV07XG4gICAgICBpZiAodHlwZW9mIGFyZ3NbMV0gPT09ICdzdHJpbmcnKSByZXQuZGVmYXVsdFZhbHVlID0gYXJnc1sxXTtcbiAgICAgIGlmICh0eXBlb2YgYXJnc1syXSA9PT0gJ3N0cmluZycpIHJldC50RGVzY3JpcHRpb24gPSBhcmdzWzJdO1xuICAgICAgaWYgKHR5cGVvZiBhcmdzWzJdID09PSAnb2JqZWN0JyB8fCB0eXBlb2YgYXJnc1szXSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgY29uc3Qgb3B0aW9ucyA9IGFyZ3NbM10gfHwgYXJnc1syXTtcbiAgICAgICAgT2JqZWN0LmtleXMob3B0aW9ucykuZm9yRWFjaCgoa2V5KSA9PiB7XG4gICAgICAgICAgcmV0W2tleV0gPSBvcHRpb25zW2tleV07XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJldDtcbiAgICB9LFxuICAgIGludGVycG9sYXRpb246IHtcbiAgICAgIGVzY2FwZVZhbHVlOiB0cnVlLFxuICAgICAgZm9ybWF0OiAodmFsdWUsIGZvcm1hdCwgbG5nLCBvcHRpb25zKSA9PiB2YWx1ZSxcbiAgICAgIHByZWZpeDogJ3t7JyxcbiAgICAgIHN1ZmZpeDogJ319JyxcbiAgICAgIGZvcm1hdFNlcGFyYXRvcjogJywnLFxuICAgICAgLy8gcHJlZml4RXNjYXBlZDogJ3t7JyxcbiAgICAgIC8vIHN1ZmZpeEVzY2FwZWQ6ICd9fScsXG4gICAgICAvLyB1bmVzY2FwZVN1ZmZpeDogJycsXG4gICAgICB1bmVzY2FwZVByZWZpeDogJy0nLFxuXG4gICAgICBuZXN0aW5nUHJlZml4OiAnJHQoJyxcbiAgICAgIG5lc3RpbmdTdWZmaXg6ICcpJyxcbiAgICAgIG5lc3RpbmdPcHRpb25zU2VwYXJhdG9yOiAnLCcsXG4gICAgICAvLyBuZXN0aW5nUHJlZml4RXNjYXBlZDogJyR0KCcsXG4gICAgICAvLyBuZXN0aW5nU3VmZml4RXNjYXBlZDogJyknLFxuICAgICAgLy8gZGVmYXVsdFZhcmlhYmxlczogdW5kZWZpbmVkIC8vIG9iamVjdCB0aGF0IGNhbiBoYXZlIHZhbHVlcyB0byBpbnRlcnBvbGF0ZSBvbiAtIGV4dGVuZHMgcGFzc2VkIGluIGludGVycG9sYXRpb24gZGF0YVxuICAgICAgbWF4UmVwbGFjZXM6IDEwMDAsIC8vIG1heCByZXBsYWNlcyB0byBwcmV2ZW50IGVuZGxlc3MgbG9vcFxuICAgICAgc2tpcE9uVmFyaWFibGVzOiB0cnVlLFxuICAgIH0sXG4gIH07XG59XG5cbi8qIGVzbGludCBuby1wYXJhbS1yZWFzc2lnbjogMCAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRyYW5zZm9ybU9wdGlvbnMob3B0aW9ucykge1xuICAvLyBjcmVhdGUgbmFtZXNwYWNlIG9iamVjdCBpZiBuYW1lc3BhY2UgaXMgcGFzc2VkIGluIGFzIHN0cmluZ1xuICBpZiAodHlwZW9mIG9wdGlvbnMubnMgPT09ICdzdHJpbmcnKSBvcHRpb25zLm5zID0gW29wdGlvbnMubnNdO1xuICBpZiAodHlwZW9mIG9wdGlvbnMuZmFsbGJhY2tMbmcgPT09ICdzdHJpbmcnKSBvcHRpb25zLmZhbGxiYWNrTG5nID0gW29wdGlvbnMuZmFsbGJhY2tMbmddO1xuICBpZiAodHlwZW9mIG9wdGlvbnMuZmFsbGJhY2tOUyA9PT0gJ3N0cmluZycpIG9wdGlvbnMuZmFsbGJhY2tOUyA9IFtvcHRpb25zLmZhbGxiYWNrTlNdO1xuXG4gIC8vIGV4dGVuZCBzdXBwb3J0ZWRMbmdzIHdpdGggY2ltb2RlXG4gIGlmIChvcHRpb25zLnN1cHBvcnRlZExuZ3MgJiYgb3B0aW9ucy5zdXBwb3J0ZWRMbmdzLmluZGV4T2YoJ2NpbW9kZScpIDwgMCkge1xuICAgIG9wdGlvbnMuc3VwcG9ydGVkTG5ncyA9IG9wdGlvbnMuc3VwcG9ydGVkTG5ncy5jb25jYXQoWydjaW1vZGUnXSk7XG4gIH1cblxuICByZXR1cm4gb3B0aW9ucztcbn1cbiIsImltcG9ydCBiYXNlTG9nZ2VyIGZyb20gJy4vbG9nZ2VyLmpzJztcbmltcG9ydCBFdmVudEVtaXR0ZXIgZnJvbSAnLi9FdmVudEVtaXR0ZXIuanMnO1xuaW1wb3J0IFJlc291cmNlU3RvcmUgZnJvbSAnLi9SZXNvdXJjZVN0b3JlLmpzJztcbmltcG9ydCBUcmFuc2xhdG9yIGZyb20gJy4vVHJhbnNsYXRvci5qcyc7XG5pbXBvcnQgTGFuZ3VhZ2VVdGlscyBmcm9tICcuL0xhbmd1YWdlVXRpbHMuanMnO1xuaW1wb3J0IFBsdXJhbFJlc29sdmVyIGZyb20gJy4vUGx1cmFsUmVzb2x2ZXIuanMnO1xuaW1wb3J0IEludGVycG9sYXRvciBmcm9tICcuL0ludGVycG9sYXRvci5qcyc7XG5pbXBvcnQgRm9ybWF0dGVyIGZyb20gJy4vRm9ybWF0dGVyLmpzJztcbmltcG9ydCBCYWNrZW5kQ29ubmVjdG9yIGZyb20gJy4vQmFja2VuZENvbm5lY3Rvci5qcyc7XG5pbXBvcnQgeyBnZXQgYXMgZ2V0RGVmYXVsdHMsIHRyYW5zZm9ybU9wdGlvbnMgfSBmcm9tICcuL2RlZmF1bHRzLmpzJztcbmltcG9ydCBwb3N0UHJvY2Vzc29yIGZyb20gJy4vcG9zdFByb2Nlc3Nvci5qcyc7XG5pbXBvcnQgeyBkZWZlciB9IGZyb20gJy4vdXRpbHMuanMnO1xuXG5mdW5jdGlvbiBub29wKCkgeyB9XG5cbi8vIEJpbmRzIHRoZSBtZW1iZXIgZnVuY3Rpb25zIG9mIHRoZSBnaXZlbiBjbGFzcyBpbnN0YW5jZSBzbyB0aGF0IHRoZXkgY2FuIGJlXG4vLyBkZXN0cnVjdHVyZWQgb3IgdXNlZCBhcyBjYWxsYmFja3MuXG5mdW5jdGlvbiBiaW5kTWVtYmVyRnVuY3Rpb25zKGluc3QpIHtcbiAgY29uc3QgbWVtcyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKE9iamVjdC5nZXRQcm90b3R5cGVPZihpbnN0KSlcbiAgbWVtcy5mb3JFYWNoKChtZW0pID0+IHtcbiAgICBpZiAodHlwZW9mIGluc3RbbWVtXSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgaW5zdFttZW1dID0gaW5zdFttZW1dLmJpbmQoaW5zdClcbiAgICB9XG4gIH0pXG59XG5cbmNsYXNzIEkxOG4gZXh0ZW5kcyBFdmVudEVtaXR0ZXIge1xuICBjb25zdHJ1Y3RvcihvcHRpb25zID0ge30sIGNhbGxiYWNrKSB7XG4gICAgc3VwZXIoKTtcblxuICAgIHRoaXMub3B0aW9ucyA9IHRyYW5zZm9ybU9wdGlvbnMob3B0aW9ucyk7XG4gICAgdGhpcy5zZXJ2aWNlcyA9IHt9O1xuICAgIHRoaXMubG9nZ2VyID0gYmFzZUxvZ2dlcjtcbiAgICB0aGlzLm1vZHVsZXMgPSB7IGV4dGVybmFsOiBbXSB9O1xuXG4gICAgYmluZE1lbWJlckZ1bmN0aW9ucyh0aGlzKTtcblxuICAgIGlmIChjYWxsYmFjayAmJiAhdGhpcy5pc0luaXRpYWxpemVkICYmICFvcHRpb25zLmlzQ2xvbmUpIHtcbiAgICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9pMThuZXh0L2kxOG5leHQvaXNzdWVzLzg3OVxuICAgICAgaWYgKCF0aGlzLm9wdGlvbnMuaW5pdEltbWVkaWF0ZSkge1xuICAgICAgICB0aGlzLmluaXQob3B0aW9ucywgY2FsbGJhY2spO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgIH1cbiAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICB0aGlzLmluaXQob3B0aW9ucywgY2FsbGJhY2spO1xuICAgICAgfSwgMCk7XG4gICAgfVxuICB9XG5cbiAgaW5pdChvcHRpb25zID0ge30sIGNhbGxiYWNrKSB7XG4gICAgaWYgKHR5cGVvZiBvcHRpb25zID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBjYWxsYmFjayA9IG9wdGlvbnM7XG4gICAgICBvcHRpb25zID0ge307XG4gICAgfVxuXG4gICAgaWYgKCFvcHRpb25zLmRlZmF1bHROUyAmJiBvcHRpb25zLmRlZmF1bHROUyAhPT0gZmFsc2UgJiYgb3B0aW9ucy5ucykge1xuICAgICAgaWYgKHR5cGVvZiBvcHRpb25zLm5zID09PSAnc3RyaW5nJykge1xuICAgICAgICBvcHRpb25zLmRlZmF1bHROUyA9IG9wdGlvbnMubnM7XG4gICAgICB9IGVsc2UgaWYgKG9wdGlvbnMubnMuaW5kZXhPZigndHJhbnNsYXRpb24nKSA8IDApIHtcbiAgICAgICAgb3B0aW9ucy5kZWZhdWx0TlMgPSBvcHRpb25zLm5zWzBdO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IGRlZk9wdHMgPSBnZXREZWZhdWx0cygpO1xuICAgIHRoaXMub3B0aW9ucyA9IHsgLi4uZGVmT3B0cywgLi4udGhpcy5vcHRpb25zLCAuLi50cmFuc2Zvcm1PcHRpb25zKG9wdGlvbnMpIH07XG4gICAgaWYgKHRoaXMub3B0aW9ucy5jb21wYXRpYmlsaXR5QVBJICE9PSAndjEnKSB7XG4gICAgICB0aGlzLm9wdGlvbnMuaW50ZXJwb2xhdGlvbiA9IHsgLi4uZGVmT3B0cy5pbnRlcnBvbGF0aW9uLCAuLi50aGlzLm9wdGlvbnMuaW50ZXJwb2xhdGlvbiB9OyAvLyBkbyBub3QgdXNlIHJlZmVyZW5jZVxuICAgIH1cbiAgICBpZiAob3B0aW9ucy5rZXlTZXBhcmF0b3IgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5vcHRpb25zLnVzZXJEZWZpbmVkS2V5U2VwYXJhdG9yID0gb3B0aW9ucy5rZXlTZXBhcmF0b3I7XG4gICAgfVxuICAgIGlmIChvcHRpb25zLm5zU2VwYXJhdG9yICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMub3B0aW9ucy51c2VyRGVmaW5lZE5zU2VwYXJhdG9yID0gb3B0aW9ucy5uc1NlcGFyYXRvcjtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjcmVhdGVDbGFzc09uRGVtYW5kKENsYXNzT3JPYmplY3QpIHtcbiAgICAgIGlmICghQ2xhc3NPck9iamVjdCkgcmV0dXJuIG51bGw7XG4gICAgICBpZiAodHlwZW9mIENsYXNzT3JPYmplY3QgPT09ICdmdW5jdGlvbicpIHJldHVybiBuZXcgQ2xhc3NPck9iamVjdCgpO1xuICAgICAgcmV0dXJuIENsYXNzT3JPYmplY3Q7XG4gICAgfVxuXG4gICAgLy8gaW5pdCBzZXJ2aWNlc1xuICAgIGlmICghdGhpcy5vcHRpb25zLmlzQ2xvbmUpIHtcbiAgICAgIGlmICh0aGlzLm1vZHVsZXMubG9nZ2VyKSB7XG4gICAgICAgIGJhc2VMb2dnZXIuaW5pdChjcmVhdGVDbGFzc09uRGVtYW5kKHRoaXMubW9kdWxlcy5sb2dnZXIpLCB0aGlzLm9wdGlvbnMpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYmFzZUxvZ2dlci5pbml0KG51bGwsIHRoaXMub3B0aW9ucyk7XG4gICAgICB9XG5cbiAgICAgIGxldCBmb3JtYXR0ZXI7XG4gICAgICBpZiAodGhpcy5tb2R1bGVzLmZvcm1hdHRlcikge1xuICAgICAgICBmb3JtYXR0ZXIgPSB0aGlzLm1vZHVsZXMuZm9ybWF0dGVyO1xuICAgICAgfSBlbHNlIGlmICh0eXBlb2YgSW50bCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgZm9ybWF0dGVyID0gRm9ybWF0dGVyO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBsdSA9IG5ldyBMYW5ndWFnZVV0aWxzKHRoaXMub3B0aW9ucyk7XG4gICAgICB0aGlzLnN0b3JlID0gbmV3IFJlc291cmNlU3RvcmUodGhpcy5vcHRpb25zLnJlc291cmNlcywgdGhpcy5vcHRpb25zKTtcblxuICAgICAgY29uc3QgcyA9IHRoaXMuc2VydmljZXM7XG4gICAgICBzLmxvZ2dlciA9IGJhc2VMb2dnZXI7XG4gICAgICBzLnJlc291cmNlU3RvcmUgPSB0aGlzLnN0b3JlO1xuICAgICAgcy5sYW5ndWFnZVV0aWxzID0gbHU7XG4gICAgICBzLnBsdXJhbFJlc29sdmVyID0gbmV3IFBsdXJhbFJlc29sdmVyKGx1LCB7XG4gICAgICAgIHByZXBlbmQ6IHRoaXMub3B0aW9ucy5wbHVyYWxTZXBhcmF0b3IsXG4gICAgICAgIGNvbXBhdGliaWxpdHlKU09OOiB0aGlzLm9wdGlvbnMuY29tcGF0aWJpbGl0eUpTT04sXG4gICAgICAgIHNpbXBsaWZ5UGx1cmFsU3VmZml4OiB0aGlzLm9wdGlvbnMuc2ltcGxpZnlQbHVyYWxTdWZmaXgsXG4gICAgICB9KTtcblxuICAgICAgaWYgKGZvcm1hdHRlciAmJiAoIXRoaXMub3B0aW9ucy5pbnRlcnBvbGF0aW9uLmZvcm1hdCB8fCB0aGlzLm9wdGlvbnMuaW50ZXJwb2xhdGlvbi5mb3JtYXQgPT09IGRlZk9wdHMuaW50ZXJwb2xhdGlvbi5mb3JtYXQpKSB7XG4gICAgICAgIHMuZm9ybWF0dGVyID0gY3JlYXRlQ2xhc3NPbkRlbWFuZChmb3JtYXR0ZXIpO1xuICAgICAgICBzLmZvcm1hdHRlci5pbml0KHMsIHRoaXMub3B0aW9ucyk7XG5cbiAgICAgICAgdGhpcy5vcHRpb25zLmludGVycG9sYXRpb24uZm9ybWF0ID0gcy5mb3JtYXR0ZXIuZm9ybWF0LmJpbmQocy5mb3JtYXR0ZXIpO1xuICAgICAgfVxuXG4gICAgICBzLmludGVycG9sYXRvciA9IG5ldyBJbnRlcnBvbGF0b3IodGhpcy5vcHRpb25zKTtcbiAgICAgIHMudXRpbHMgPSB7XG4gICAgICAgIGhhc0xvYWRlZE5hbWVzcGFjZTogdGhpcy5oYXNMb2FkZWROYW1lc3BhY2UuYmluZCh0aGlzKVxuICAgICAgfVxuXG4gICAgICBzLmJhY2tlbmRDb25uZWN0b3IgPSBuZXcgQmFja2VuZENvbm5lY3RvcihcbiAgICAgICAgY3JlYXRlQ2xhc3NPbkRlbWFuZCh0aGlzLm1vZHVsZXMuYmFja2VuZCksXG4gICAgICAgIHMucmVzb3VyY2VTdG9yZSxcbiAgICAgICAgcyxcbiAgICAgICAgdGhpcy5vcHRpb25zLFxuICAgICAgKTtcbiAgICAgIC8vIHBpcGUgZXZlbnRzIGZyb20gYmFja2VuZENvbm5lY3RvclxuICAgICAgcy5iYWNrZW5kQ29ubmVjdG9yLm9uKCcqJywgKGV2ZW50LCAuLi5hcmdzKSA9PiB7XG4gICAgICAgIHRoaXMuZW1pdChldmVudCwgLi4uYXJncyk7XG4gICAgICB9KTtcblxuICAgICAgaWYgKHRoaXMubW9kdWxlcy5sYW5ndWFnZURldGVjdG9yKSB7XG4gICAgICAgIHMubGFuZ3VhZ2VEZXRlY3RvciA9IGNyZWF0ZUNsYXNzT25EZW1hbmQodGhpcy5tb2R1bGVzLmxhbmd1YWdlRGV0ZWN0b3IpO1xuICAgICAgICBpZiAocy5sYW5ndWFnZURldGVjdG9yLmluaXQpIHMubGFuZ3VhZ2VEZXRlY3Rvci5pbml0KHMsIHRoaXMub3B0aW9ucy5kZXRlY3Rpb24sIHRoaXMub3B0aW9ucyk7XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLm1vZHVsZXMuaTE4bkZvcm1hdCkge1xuICAgICAgICBzLmkxOG5Gb3JtYXQgPSBjcmVhdGVDbGFzc09uRGVtYW5kKHRoaXMubW9kdWxlcy5pMThuRm9ybWF0KTtcbiAgICAgICAgaWYgKHMuaTE4bkZvcm1hdC5pbml0KSBzLmkxOG5Gb3JtYXQuaW5pdCh0aGlzKTtcbiAgICAgIH1cblxuICAgICAgdGhpcy50cmFuc2xhdG9yID0gbmV3IFRyYW5zbGF0b3IodGhpcy5zZXJ2aWNlcywgdGhpcy5vcHRpb25zKTtcbiAgICAgIC8vIHBpcGUgZXZlbnRzIGZyb20gdHJhbnNsYXRvclxuICAgICAgdGhpcy50cmFuc2xhdG9yLm9uKCcqJywgKGV2ZW50LCAuLi5hcmdzKSA9PiB7XG4gICAgICAgIHRoaXMuZW1pdChldmVudCwgLi4uYXJncyk7XG4gICAgICB9KTtcblxuICAgICAgdGhpcy5tb2R1bGVzLmV4dGVybmFsLmZvckVhY2gobSA9PiB7XG4gICAgICAgIGlmIChtLmluaXQpIG0uaW5pdCh0aGlzKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHRoaXMuZm9ybWF0ID0gdGhpcy5vcHRpb25zLmludGVycG9sYXRpb24uZm9ybWF0O1xuICAgIGlmICghY2FsbGJhY2spIGNhbGxiYWNrID0gbm9vcDtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMuZmFsbGJhY2tMbmcgJiYgIXRoaXMuc2VydmljZXMubGFuZ3VhZ2VEZXRlY3RvciAmJiAhdGhpcy5vcHRpb25zLmxuZykge1xuICAgICAgY29uc3QgY29kZXMgPSB0aGlzLnNlcnZpY2VzLmxhbmd1YWdlVXRpbHMuZ2V0RmFsbGJhY2tDb2Rlcyh0aGlzLm9wdGlvbnMuZmFsbGJhY2tMbmcpXG4gICAgICBpZiAoY29kZXMubGVuZ3RoID4gMCAmJiBjb2Rlc1swXSAhPT0gJ2RldicpIHRoaXMub3B0aW9ucy5sbmcgPSBjb2Rlc1swXVxuICAgIH1cbiAgICBpZiAoIXRoaXMuc2VydmljZXMubGFuZ3VhZ2VEZXRlY3RvciAmJiAhdGhpcy5vcHRpb25zLmxuZykge1xuICAgICAgdGhpcy5sb2dnZXIud2FybignaW5pdDogbm8gbGFuZ3VhZ2VEZXRlY3RvciBpcyB1c2VkIGFuZCBubyBsbmcgaXMgZGVmaW5lZCcpO1xuICAgIH1cblxuICAgIC8vIGFwcGVuZCBhcGlcbiAgICBjb25zdCBzdG9yZUFwaSA9IFtcbiAgICAgICdnZXRSZXNvdXJjZScsXG4gICAgICAnaGFzUmVzb3VyY2VCdW5kbGUnLFxuICAgICAgJ2dldFJlc291cmNlQnVuZGxlJyxcbiAgICAgICdnZXREYXRhQnlMYW5ndWFnZScsXG4gICAgXTtcbiAgICBzdG9yZUFwaS5mb3JFYWNoKGZjTmFtZSA9PiB7XG4gICAgICB0aGlzW2ZjTmFtZV0gPSAoLi4uYXJncykgPT4gdGhpcy5zdG9yZVtmY05hbWVdKC4uLmFyZ3MpO1xuICAgIH0pO1xuICAgIGNvbnN0IHN0b3JlQXBpQ2hhaW5lZCA9IFtcbiAgICAgICdhZGRSZXNvdXJjZScsXG4gICAgICAnYWRkUmVzb3VyY2VzJyxcbiAgICAgICdhZGRSZXNvdXJjZUJ1bmRsZScsXG4gICAgICAncmVtb3ZlUmVzb3VyY2VCdW5kbGUnLFxuICAgIF07XG4gICAgc3RvcmVBcGlDaGFpbmVkLmZvckVhY2goZmNOYW1lID0+IHtcbiAgICAgIHRoaXNbZmNOYW1lXSA9ICguLi5hcmdzKSA9PiB7XG4gICAgICAgIHRoaXMuc3RvcmVbZmNOYW1lXSguLi5hcmdzKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICB9O1xuICAgIH0pO1xuXG4gICAgY29uc3QgZGVmZXJyZWQgPSBkZWZlcigpO1xuXG4gICAgY29uc3QgbG9hZCA9ICgpID0+IHtcbiAgICAgIGNvbnN0IGZpbmlzaCA9IChlcnIsIHQpID0+IHtcbiAgICAgICAgaWYgKHRoaXMuaXNJbml0aWFsaXplZCAmJiAhdGhpcy5pbml0aWFsaXplZFN0b3JlT25jZSkgdGhpcy5sb2dnZXIud2FybignaW5pdDogaTE4bmV4dCBpcyBhbHJlYWR5IGluaXRpYWxpemVkLiBZb3Ugc2hvdWxkIGNhbGwgaW5pdCBqdXN0IG9uY2UhJyk7XG4gICAgICAgIHRoaXMuaXNJbml0aWFsaXplZCA9IHRydWU7XG4gICAgICAgIGlmICghdGhpcy5vcHRpb25zLmlzQ2xvbmUpIHRoaXMubG9nZ2VyLmxvZygnaW5pdGlhbGl6ZWQnLCB0aGlzLm9wdGlvbnMpO1xuICAgICAgICB0aGlzLmVtaXQoJ2luaXRpYWxpemVkJywgdGhpcy5vcHRpb25zKTtcblxuICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKHQpOyAvLyBub3QgcmVqZWN0aW5nIG9uIGVyciAoYXMgZXJyIGlzIG9ubHkgYSBsb2FkaW5nIHRyYW5zbGF0aW9uIGZhaWxlZCB3YXJuaW5nKVxuICAgICAgICBjYWxsYmFjayhlcnIsIHQpO1xuICAgICAgfTtcbiAgICAgIC8vIGZpeCBmb3IgdXNlIGNhc2VzIHdoZW4gY2FsbGluZyBjaGFuZ2VMYW5ndWFnZSBiZWZvcmUgZmluaXNoZWQgdG8gaW5pdGlhbGl6ZWQgKGkuZS4gaHR0cHM6Ly9naXRodWIuY29tL2kxOG5leHQvaTE4bmV4dC9pc3N1ZXMvMTU1MilcbiAgICAgIGlmICh0aGlzLmxhbmd1YWdlcyAmJiB0aGlzLm9wdGlvbnMuY29tcGF0aWJpbGl0eUFQSSAhPT0gJ3YxJyAmJiAhdGhpcy5pc0luaXRpYWxpemVkKSByZXR1cm4gZmluaXNoKG51bGwsIHRoaXMudC5iaW5kKHRoaXMpKTtcbiAgICAgIHRoaXMuY2hhbmdlTGFuZ3VhZ2UodGhpcy5vcHRpb25zLmxuZywgZmluaXNoKTtcbiAgICB9O1xuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5yZXNvdXJjZXMgfHwgIXRoaXMub3B0aW9ucy5pbml0SW1tZWRpYXRlKSB7XG4gICAgICBsb2FkKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHNldFRpbWVvdXQobG9hZCwgMCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGRlZmVycmVkO1xuICB9XG5cbiAgLyogZXNsaW50IGNvbnNpc3RlbnQtcmV0dXJuOiAwICovXG4gIGxvYWRSZXNvdXJjZXMobGFuZ3VhZ2UsIGNhbGxiYWNrID0gbm9vcCkge1xuICAgIGxldCB1c2VkQ2FsbGJhY2sgPSBjYWxsYmFjaztcbiAgICBjb25zdCB1c2VkTG5nID0gdHlwZW9mIGxhbmd1YWdlID09PSAnc3RyaW5nJyA/IGxhbmd1YWdlIDogdGhpcy5sYW5ndWFnZTtcbiAgICBpZiAodHlwZW9mIGxhbmd1YWdlID09PSAnZnVuY3Rpb24nKSB1c2VkQ2FsbGJhY2sgPSBsYW5ndWFnZTtcblxuICAgIGlmICghdGhpcy5vcHRpb25zLnJlc291cmNlcyB8fCB0aGlzLm9wdGlvbnMucGFydGlhbEJ1bmRsZWRMYW5ndWFnZXMpIHtcbiAgICAgIGlmICh1c2VkTG5nICYmIHVzZWRMbmcudG9Mb3dlckNhc2UoKSA9PT0gJ2NpbW9kZScpIHJldHVybiB1c2VkQ2FsbGJhY2soKTsgLy8gYXZvaWQgbG9hZGluZyByZXNvdXJjZXMgZm9yIGNpbW9kZVxuXG4gICAgICBjb25zdCB0b0xvYWQgPSBbXTtcblxuICAgICAgY29uc3QgYXBwZW5kID0gbG5nID0+IHtcbiAgICAgICAgaWYgKCFsbmcpIHJldHVybjtcbiAgICAgICAgY29uc3QgbG5ncyA9IHRoaXMuc2VydmljZXMubGFuZ3VhZ2VVdGlscy50b1Jlc29sdmVIaWVyYXJjaHkobG5nKTtcbiAgICAgICAgbG5ncy5mb3JFYWNoKGwgPT4ge1xuICAgICAgICAgIGlmICh0b0xvYWQuaW5kZXhPZihsKSA8IDApIHRvTG9hZC5wdXNoKGwpO1xuICAgICAgICB9KTtcbiAgICAgIH07XG5cbiAgICAgIGlmICghdXNlZExuZykge1xuICAgICAgICAvLyBhdCBsZWFzdCBsb2FkIGZhbGxiYWNrcyBpbiB0aGlzIGNhc2VcbiAgICAgICAgY29uc3QgZmFsbGJhY2tzID0gdGhpcy5zZXJ2aWNlcy5sYW5ndWFnZVV0aWxzLmdldEZhbGxiYWNrQ29kZXModGhpcy5vcHRpb25zLmZhbGxiYWNrTG5nKTtcbiAgICAgICAgZmFsbGJhY2tzLmZvckVhY2gobCA9PiBhcHBlbmQobCkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYXBwZW5kKHVzZWRMbmcpO1xuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5vcHRpb25zLnByZWxvYWQpIHtcbiAgICAgICAgdGhpcy5vcHRpb25zLnByZWxvYWQuZm9yRWFjaChsID0+IGFwcGVuZChsKSk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMuc2VydmljZXMuYmFja2VuZENvbm5lY3Rvci5sb2FkKHRvTG9hZCwgdGhpcy5vcHRpb25zLm5zLCAoZSkgPT4ge1xuICAgICAgICBpZiAoIWUgJiYgIXRoaXMucmVzb2x2ZWRMYW5ndWFnZSAmJiB0aGlzLmxhbmd1YWdlKSB0aGlzLnNldFJlc29sdmVkTGFuZ3VhZ2UodGhpcy5sYW5ndWFnZSk7XG4gICAgICAgIHVzZWRDYWxsYmFjayhlKTtcbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICB1c2VkQ2FsbGJhY2sobnVsbCk7XG4gICAgfVxuICB9XG5cbiAgcmVsb2FkUmVzb3VyY2VzKGxuZ3MsIG5zLCBjYWxsYmFjaykge1xuICAgIGNvbnN0IGRlZmVycmVkID0gZGVmZXIoKTtcbiAgICBpZiAoIWxuZ3MpIGxuZ3MgPSB0aGlzLmxhbmd1YWdlcztcbiAgICBpZiAoIW5zKSBucyA9IHRoaXMub3B0aW9ucy5ucztcbiAgICBpZiAoIWNhbGxiYWNrKSBjYWxsYmFjayA9IG5vb3A7XG4gICAgdGhpcy5zZXJ2aWNlcy5iYWNrZW5kQ29ubmVjdG9yLnJlbG9hZChsbmdzLCBucywgZXJyID0+IHtcbiAgICAgIGRlZmVycmVkLnJlc29sdmUoKTsgLy8gbm90IHJlamVjdGluZyBvbiBlcnIgKGFzIGVyciBpcyBvbmx5IGEgbG9hZGluZyB0cmFuc2xhdGlvbiBmYWlsZWQgd2FybmluZylcbiAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgfSk7XG4gICAgcmV0dXJuIGRlZmVycmVkO1xuICB9XG5cbiAgdXNlKG1vZHVsZSkge1xuICAgIGlmICghbW9kdWxlKSB0aHJvdyBuZXcgRXJyb3IoJ1lvdSBhcmUgcGFzc2luZyBhbiB1bmRlZmluZWQgbW9kdWxlISBQbGVhc2UgY2hlY2sgdGhlIG9iamVjdCB5b3UgYXJlIHBhc3NpbmcgdG8gaTE4bmV4dC51c2UoKScpXG4gICAgaWYgKCFtb2R1bGUudHlwZSkgdGhyb3cgbmV3IEVycm9yKCdZb3UgYXJlIHBhc3NpbmcgYSB3cm9uZyBtb2R1bGUhIFBsZWFzZSBjaGVjayB0aGUgb2JqZWN0IHlvdSBhcmUgcGFzc2luZyB0byBpMThuZXh0LnVzZSgpJylcblxuICAgIGlmIChtb2R1bGUudHlwZSA9PT0gJ2JhY2tlbmQnKSB7XG4gICAgICB0aGlzLm1vZHVsZXMuYmFja2VuZCA9IG1vZHVsZTtcbiAgICB9XG5cbiAgICBpZiAobW9kdWxlLnR5cGUgPT09ICdsb2dnZXInIHx8IChtb2R1bGUubG9nICYmIG1vZHVsZS53YXJuICYmIG1vZHVsZS5lcnJvcikpIHtcbiAgICAgIHRoaXMubW9kdWxlcy5sb2dnZXIgPSBtb2R1bGU7XG4gICAgfVxuXG4gICAgaWYgKG1vZHVsZS50eXBlID09PSAnbGFuZ3VhZ2VEZXRlY3RvcicpIHtcbiAgICAgIHRoaXMubW9kdWxlcy5sYW5ndWFnZURldGVjdG9yID0gbW9kdWxlO1xuICAgIH1cblxuICAgIGlmIChtb2R1bGUudHlwZSA9PT0gJ2kxOG5Gb3JtYXQnKSB7XG4gICAgICB0aGlzLm1vZHVsZXMuaTE4bkZvcm1hdCA9IG1vZHVsZTtcbiAgICB9XG5cbiAgICBpZiAobW9kdWxlLnR5cGUgPT09ICdwb3N0UHJvY2Vzc29yJykge1xuICAgICAgcG9zdFByb2Nlc3Nvci5hZGRQb3N0UHJvY2Vzc29yKG1vZHVsZSk7XG4gICAgfVxuXG4gICAgaWYgKG1vZHVsZS50eXBlID09PSAnZm9ybWF0dGVyJykge1xuICAgICAgdGhpcy5tb2R1bGVzLmZvcm1hdHRlciA9IG1vZHVsZTtcbiAgICB9XG5cbiAgICBpZiAobW9kdWxlLnR5cGUgPT09ICczcmRQYXJ0eScpIHtcbiAgICAgIHRoaXMubW9kdWxlcy5leHRlcm5hbC5wdXNoKG1vZHVsZSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBzZXRSZXNvbHZlZExhbmd1YWdlKGwpIHtcbiAgICBpZiAoIWwgfHwgIXRoaXMubGFuZ3VhZ2VzKSByZXR1cm47XG4gICAgaWYgKFsnY2ltb2RlJywgJ2RldiddLmluZGV4T2YobCkgPiAtMSkgcmV0dXJuO1xuICAgIGZvciAobGV0IGxpID0gMDsgbGkgPCB0aGlzLmxhbmd1YWdlcy5sZW5ndGg7IGxpKyspIHtcbiAgICAgIGNvbnN0IGxuZ0luTG5ncyA9IHRoaXMubGFuZ3VhZ2VzW2xpXTtcbiAgICAgIGlmIChbJ2NpbW9kZScsICdkZXYnXS5pbmRleE9mKGxuZ0luTG5ncykgPiAtMSkgY29udGludWU7XG4gICAgICBpZiAodGhpcy5zdG9yZS5oYXNMYW5ndWFnZVNvbWVUcmFuc2xhdGlvbnMobG5nSW5MbmdzKSkge1xuICAgICAgICB0aGlzLnJlc29sdmVkTGFuZ3VhZ2UgPSBsbmdJbkxuZ3M7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGNoYW5nZUxhbmd1YWdlKGxuZywgY2FsbGJhY2spIHtcbiAgICB0aGlzLmlzTGFuZ3VhZ2VDaGFuZ2luZ1RvID0gbG5nO1xuICAgIGNvbnN0IGRlZmVycmVkID0gZGVmZXIoKTtcbiAgICB0aGlzLmVtaXQoJ2xhbmd1YWdlQ2hhbmdpbmcnLCBsbmcpO1xuXG4gICAgY29uc3Qgc2V0TG5nUHJvcHMgPSAobCkgPT4ge1xuICAgICAgdGhpcy5sYW5ndWFnZSA9IGw7XG4gICAgICB0aGlzLmxhbmd1YWdlcyA9IHRoaXMuc2VydmljZXMubGFuZ3VhZ2VVdGlscy50b1Jlc29sdmVIaWVyYXJjaHkobCk7XG4gICAgICAvLyBmaW5kIHRoZSBmaXJzdCBsYW5ndWFnZSByZXNvbHZlZCBsYW5ndWFnZVxuICAgICAgdGhpcy5yZXNvbHZlZExhbmd1YWdlID0gdW5kZWZpbmVkO1xuICAgICAgdGhpcy5zZXRSZXNvbHZlZExhbmd1YWdlKGwpO1xuICAgIH07XG5cbiAgICBjb25zdCBkb25lID0gKGVyciwgbCkgPT4ge1xuICAgICAgaWYgKGwpIHtcbiAgICAgICAgc2V0TG5nUHJvcHMobCk7XG4gICAgICAgIHRoaXMudHJhbnNsYXRvci5jaGFuZ2VMYW5ndWFnZShsKTtcbiAgICAgICAgdGhpcy5pc0xhbmd1YWdlQ2hhbmdpbmdUbyA9IHVuZGVmaW5lZDtcbiAgICAgICAgdGhpcy5lbWl0KCdsYW5ndWFnZUNoYW5nZWQnLCBsKTtcbiAgICAgICAgdGhpcy5sb2dnZXIubG9nKCdsYW5ndWFnZUNoYW5nZWQnLCBsKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuaXNMYW5ndWFnZUNoYW5naW5nVG8gPSB1bmRlZmluZWQ7XG4gICAgICB9XG5cbiAgICAgIGRlZmVycmVkLnJlc29sdmUoKC4uLmFyZ3MpID0+IHRoaXMudCguLi5hcmdzKSk7XG4gICAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrKGVyciwgKC4uLmFyZ3MpID0+IHRoaXMudCguLi5hcmdzKSk7XG4gICAgfTtcblxuICAgIGNvbnN0IHNldExuZyA9IGxuZ3MgPT4ge1xuICAgICAgLy8gaWYgZGV0ZWN0ZWQgbG5nIGlzIGZhbHN5LCBzZXQgaXQgdG8gZW1wdHkgYXJyYXksIHRvIG1ha2Ugc3VyZSBhdCBsZWFzdCB0aGUgZmFsbGJhY2tMbmcgd2lsbCBiZSB1c2VkXG4gICAgICBpZiAoIWxuZyAmJiAhbG5ncyAmJiB0aGlzLnNlcnZpY2VzLmxhbmd1YWdlRGV0ZWN0b3IpIGxuZ3MgPSBbXTtcbiAgICAgIC8vIGRlcGVuZGluZyBvbiBBUEkgaW4gZGV0ZWN0b3IgbG5nIGNhbiBiZSBhIHN0cmluZyAob2xkKSBvciBhbiBhcnJheSBvZiBsYW5ndWFnZXMgb3JkZXJlZCBpbiBwcmlvcml0eVxuICAgICAgY29uc3QgbCA9IHR5cGVvZiBsbmdzID09PSAnc3RyaW5nJyA/IGxuZ3MgOiB0aGlzLnNlcnZpY2VzLmxhbmd1YWdlVXRpbHMuZ2V0QmVzdE1hdGNoRnJvbUNvZGVzKGxuZ3MpO1xuXG4gICAgICBpZiAobCkge1xuICAgICAgICBpZiAoIXRoaXMubGFuZ3VhZ2UpIHtcbiAgICAgICAgICBzZXRMbmdQcm9wcyhsKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXRoaXMudHJhbnNsYXRvci5sYW5ndWFnZSkgdGhpcy50cmFuc2xhdG9yLmNoYW5nZUxhbmd1YWdlKGwpO1xuXG4gICAgICAgIGlmICh0aGlzLnNlcnZpY2VzLmxhbmd1YWdlRGV0ZWN0b3IgJiYgdGhpcy5zZXJ2aWNlcy5sYW5ndWFnZURldGVjdG9yLmNhY2hlVXNlckxhbmd1YWdlKSB0aGlzLnNlcnZpY2VzLmxhbmd1YWdlRGV0ZWN0b3IuY2FjaGVVc2VyTGFuZ3VhZ2UobCk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMubG9hZFJlc291cmNlcyhsLCBlcnIgPT4ge1xuICAgICAgICBkb25lKGVyciwgbCk7XG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgaWYgKCFsbmcgJiYgdGhpcy5zZXJ2aWNlcy5sYW5ndWFnZURldGVjdG9yICYmICF0aGlzLnNlcnZpY2VzLmxhbmd1YWdlRGV0ZWN0b3IuYXN5bmMpIHtcbiAgICAgIHNldExuZyh0aGlzLnNlcnZpY2VzLmxhbmd1YWdlRGV0ZWN0b3IuZGV0ZWN0KCkpO1xuICAgIH0gZWxzZSBpZiAoIWxuZyAmJiB0aGlzLnNlcnZpY2VzLmxhbmd1YWdlRGV0ZWN0b3IgJiYgdGhpcy5zZXJ2aWNlcy5sYW5ndWFnZURldGVjdG9yLmFzeW5jKSB7XG4gICAgICBpZiAodGhpcy5zZXJ2aWNlcy5sYW5ndWFnZURldGVjdG9yLmRldGVjdC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgdGhpcy5zZXJ2aWNlcy5sYW5ndWFnZURldGVjdG9yLmRldGVjdCgpLnRoZW4oc2V0TG5nKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuc2VydmljZXMubGFuZ3VhZ2VEZXRlY3Rvci5kZXRlY3Qoc2V0TG5nKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgc2V0TG5nKGxuZyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGRlZmVycmVkO1xuICB9XG5cbiAgZ2V0Rml4ZWRUKGxuZywgbnMsIGtleVByZWZpeCkge1xuICAgIGNvbnN0IGZpeGVkVCA9IChrZXksIG9wdHMsIC4uLnJlc3QpID0+IHtcbiAgICAgIGxldCBvcHRpb25zO1xuICAgICAgaWYgKHR5cGVvZiBvcHRzICE9PSAnb2JqZWN0Jykge1xuICAgICAgICBvcHRpb25zID0gdGhpcy5vcHRpb25zLm92ZXJsb2FkVHJhbnNsYXRpb25PcHRpb25IYW5kbGVyKFtrZXksIG9wdHNdLmNvbmNhdChyZXN0KSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvcHRpb25zID0geyAuLi5vcHRzIH07XG4gICAgICB9XG5cbiAgICAgIG9wdGlvbnMubG5nID0gb3B0aW9ucy5sbmcgfHwgZml4ZWRULmxuZztcbiAgICAgIG9wdGlvbnMubG5ncyA9IG9wdGlvbnMubG5ncyB8fCBmaXhlZFQubG5ncztcbiAgICAgIG9wdGlvbnMubnMgPSBvcHRpb25zLm5zIHx8IGZpeGVkVC5ucztcbiAgICAgIG9wdGlvbnMua2V5UHJlZml4ID0gb3B0aW9ucy5rZXlQcmVmaXggfHwga2V5UHJlZml4IHx8IGZpeGVkVC5rZXlQcmVmaXg7XG5cbiAgICAgIGNvbnN0IGtleVNlcGFyYXRvciA9IHRoaXMub3B0aW9ucy5rZXlTZXBhcmF0b3IgfHwgJy4nO1xuICAgICAgbGV0IHJlc3VsdEtleVxuICAgICAgaWYgKG9wdGlvbnMua2V5UHJlZml4ICYmIEFycmF5LmlzQXJyYXkoa2V5KSkge1xuICAgICAgICByZXN1bHRLZXkgPSBrZXkubWFwKGsgPT4gYCR7b3B0aW9ucy5rZXlQcmVmaXh9JHtrZXlTZXBhcmF0b3J9JHtrfWApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzdWx0S2V5ID0gb3B0aW9ucy5rZXlQcmVmaXggPyBgJHtvcHRpb25zLmtleVByZWZpeH0ke2tleVNlcGFyYXRvcn0ke2tleX1gIDoga2V5O1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXMudChyZXN1bHRLZXksIG9wdGlvbnMpO1xuICAgIH07XG4gICAgaWYgKHR5cGVvZiBsbmcgPT09ICdzdHJpbmcnKSB7XG4gICAgICBmaXhlZFQubG5nID0gbG5nO1xuICAgIH0gZWxzZSB7XG4gICAgICBmaXhlZFQubG5ncyA9IGxuZztcbiAgICB9XG4gICAgZml4ZWRULm5zID0gbnM7XG4gICAgZml4ZWRULmtleVByZWZpeCA9IGtleVByZWZpeDtcbiAgICByZXR1cm4gZml4ZWRUO1xuICB9XG5cbiAgdCguLi5hcmdzKSB7XG4gICAgcmV0dXJuIHRoaXMudHJhbnNsYXRvciAmJiB0aGlzLnRyYW5zbGF0b3IudHJhbnNsYXRlKC4uLmFyZ3MpO1xuICB9XG5cbiAgZXhpc3RzKC4uLmFyZ3MpIHtcbiAgICByZXR1cm4gdGhpcy50cmFuc2xhdG9yICYmIHRoaXMudHJhbnNsYXRvci5leGlzdHMoLi4uYXJncyk7XG4gIH1cblxuICBzZXREZWZhdWx0TmFtZXNwYWNlKG5zKSB7XG4gICAgdGhpcy5vcHRpb25zLmRlZmF1bHROUyA9IG5zO1xuICB9XG5cbiAgaGFzTG9hZGVkTmFtZXNwYWNlKG5zLCBvcHRpb25zID0ge30pIHtcbiAgICBpZiAoIXRoaXMuaXNJbml0aWFsaXplZCkge1xuICAgICAgdGhpcy5sb2dnZXIud2FybignaGFzTG9hZGVkTmFtZXNwYWNlOiBpMThuZXh0IHdhcyBub3QgaW5pdGlhbGl6ZWQnLCB0aGlzLmxhbmd1YWdlcyk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGlmICghdGhpcy5sYW5ndWFnZXMgfHwgIXRoaXMubGFuZ3VhZ2VzLmxlbmd0aCkge1xuICAgICAgdGhpcy5sb2dnZXIud2FybignaGFzTG9hZGVkTmFtZXNwYWNlOiBpMThuLmxhbmd1YWdlcyB3ZXJlIHVuZGVmaW5lZCBvciBlbXB0eScsIHRoaXMubGFuZ3VhZ2VzKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBjb25zdCBsbmcgPSBvcHRpb25zLmxuZyB8fCB0aGlzLnJlc29sdmVkTGFuZ3VhZ2UgfHwgdGhpcy5sYW5ndWFnZXNbMF07XG4gICAgY29uc3QgZmFsbGJhY2tMbmcgPSB0aGlzLm9wdGlvbnMgPyB0aGlzLm9wdGlvbnMuZmFsbGJhY2tMbmcgOiBmYWxzZTtcbiAgICBjb25zdCBsYXN0TG5nID0gdGhpcy5sYW5ndWFnZXNbdGhpcy5sYW5ndWFnZXMubGVuZ3RoIC0gMV07XG5cbiAgICAvLyB3ZSdyZSBpbiBjaW1vZGUgc28gdGhpcyBzaGFsbCBwYXNzXG4gICAgaWYgKGxuZy50b0xvd2VyQ2FzZSgpID09PSAnY2ltb2RlJykgcmV0dXJuIHRydWU7XG5cbiAgICBjb25zdCBsb2FkTm90UGVuZGluZyA9IChsLCBuKSA9PiB7XG4gICAgICBjb25zdCBsb2FkU3RhdGUgPSB0aGlzLnNlcnZpY2VzLmJhY2tlbmRDb25uZWN0b3Iuc3RhdGVbYCR7bH18JHtufWBdO1xuICAgICAgcmV0dXJuIGxvYWRTdGF0ZSA9PT0gLTEgfHwgbG9hZFN0YXRlID09PSAyO1xuICAgIH07XG5cbiAgICAvLyBvcHRpb25hbCBpbmplY3RlZCBjaGVja1xuICAgIGlmIChvcHRpb25zLnByZWNoZWNrKSB7XG4gICAgICBjb25zdCBwcmVSZXN1bHQgPSBvcHRpb25zLnByZWNoZWNrKHRoaXMsIGxvYWROb3RQZW5kaW5nKTtcbiAgICAgIGlmIChwcmVSZXN1bHQgIT09IHVuZGVmaW5lZCkgcmV0dXJuIHByZVJlc3VsdDtcbiAgICB9XG5cbiAgICAvLyBsb2FkZWQgLT4gU1VDQ0VTU1xuICAgIGlmICh0aGlzLmhhc1Jlc291cmNlQnVuZGxlKGxuZywgbnMpKSByZXR1cm4gdHJ1ZTtcblxuICAgIC8vIHdlcmUgbm90IGxvYWRpbmcgYXQgYWxsIC0+IFNFTUkgU1VDQ0VTU1xuICAgIGlmICghdGhpcy5zZXJ2aWNlcy5iYWNrZW5kQ29ubmVjdG9yLmJhY2tlbmQgfHwgKHRoaXMub3B0aW9ucy5yZXNvdXJjZXMgJiYgIXRoaXMub3B0aW9ucy5wYXJ0aWFsQnVuZGxlZExhbmd1YWdlcykpIHJldHVybiB0cnVlO1xuXG4gICAgLy8gZmFpbGVkIGxvYWRpbmcgbnMgLSBidXQgYXQgbGVhc3QgZmFsbGJhY2sgaXMgbm90IHBlbmRpbmcgLT4gU0VNSSBTVUNDRVNTXG4gICAgaWYgKGxvYWROb3RQZW5kaW5nKGxuZywgbnMpICYmICghZmFsbGJhY2tMbmcgfHwgbG9hZE5vdFBlbmRpbmcobGFzdExuZywgbnMpKSkgcmV0dXJuIHRydWU7XG5cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBsb2FkTmFtZXNwYWNlcyhucywgY2FsbGJhY2spIHtcbiAgICBjb25zdCBkZWZlcnJlZCA9IGRlZmVyKCk7XG5cbiAgICBpZiAoIXRoaXMub3B0aW9ucy5ucykge1xuICAgICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjaygpO1xuICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICAgIH1cbiAgICBpZiAodHlwZW9mIG5zID09PSAnc3RyaW5nJykgbnMgPSBbbnNdO1xuXG4gICAgbnMuZm9yRWFjaChuID0+IHtcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMubnMuaW5kZXhPZihuKSA8IDApIHRoaXMub3B0aW9ucy5ucy5wdXNoKG4pO1xuICAgIH0pO1xuXG4gICAgdGhpcy5sb2FkUmVzb3VyY2VzKGVyciA9PiB7XG4gICAgICBkZWZlcnJlZC5yZXNvbHZlKCk7XG4gICAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrKGVycik7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gZGVmZXJyZWQ7XG4gIH1cblxuICBsb2FkTGFuZ3VhZ2VzKGxuZ3MsIGNhbGxiYWNrKSB7XG4gICAgY29uc3QgZGVmZXJyZWQgPSBkZWZlcigpO1xuXG4gICAgaWYgKHR5cGVvZiBsbmdzID09PSAnc3RyaW5nJykgbG5ncyA9IFtsbmdzXTtcbiAgICBjb25zdCBwcmVsb2FkZWQgPSB0aGlzLm9wdGlvbnMucHJlbG9hZCB8fCBbXTtcblxuICAgIGNvbnN0IG5ld0xuZ3MgPSBsbmdzLmZpbHRlcihsbmcgPT4gcHJlbG9hZGVkLmluZGV4T2YobG5nKSA8IDApO1xuICAgIC8vIEV4aXQgZWFybHkgaWYgYWxsIGdpdmVuIGxhbmd1YWdlcyBhcmUgYWxyZWFkeSBwcmVsb2FkZWRcbiAgICBpZiAoIW5ld0xuZ3MubGVuZ3RoKSB7XG4gICAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrKCk7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgfVxuXG4gICAgdGhpcy5vcHRpb25zLnByZWxvYWQgPSBwcmVsb2FkZWQuY29uY2F0KG5ld0xuZ3MpO1xuICAgIHRoaXMubG9hZFJlc291cmNlcyhlcnIgPT4ge1xuICAgICAgZGVmZXJyZWQucmVzb2x2ZSgpO1xuICAgICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjayhlcnIpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIGRlZmVycmVkO1xuICB9XG5cbiAgZGlyKGxuZykge1xuICAgIGlmICghbG5nKSBsbmcgPSB0aGlzLnJlc29sdmVkTGFuZ3VhZ2UgfHwgKHRoaXMubGFuZ3VhZ2VzICYmIHRoaXMubGFuZ3VhZ2VzLmxlbmd0aCA+IDAgPyB0aGlzLmxhbmd1YWdlc1swXSA6IHRoaXMubGFuZ3VhZ2UpO1xuICAgIGlmICghbG5nKSByZXR1cm4gJ3J0bCc7XG5cbiAgICBjb25zdCBydGxMbmdzID0gW1xuICAgICAgJ2FyJyxcbiAgICAgICdzaHUnLFxuICAgICAgJ3NxcicsXG4gICAgICAnc3NoJyxcbiAgICAgICd4YWEnLFxuICAgICAgJ3loZCcsXG4gICAgICAneXVkJyxcbiAgICAgICdhYW8nLFxuICAgICAgJ2FiaCcsXG4gICAgICAnYWJ2JyxcbiAgICAgICdhY20nLFxuICAgICAgJ2FjcScsXG4gICAgICAnYWN3JyxcbiAgICAgICdhY3gnLFxuICAgICAgJ2FjeScsXG4gICAgICAnYWRmJyxcbiAgICAgICdhZHMnLFxuICAgICAgJ2FlYicsXG4gICAgICAnYWVjJyxcbiAgICAgICdhZmInLFxuICAgICAgJ2FqcCcsXG4gICAgICAnYXBjJyxcbiAgICAgICdhcGQnLFxuICAgICAgJ2FyYicsXG4gICAgICAnYXJxJyxcbiAgICAgICdhcnMnLFxuICAgICAgJ2FyeScsXG4gICAgICAnYXJ6JyxcbiAgICAgICdhdXonLFxuICAgICAgJ2F2bCcsXG4gICAgICAnYXloJyxcbiAgICAgICdheWwnLFxuICAgICAgJ2F5bicsXG4gICAgICAnYXlwJyxcbiAgICAgICdiYnonLFxuICAgICAgJ3BnYScsXG4gICAgICAnaGUnLFxuICAgICAgJ2l3JyxcbiAgICAgICdwcycsXG4gICAgICAncGJ0JyxcbiAgICAgICdwYnUnLFxuICAgICAgJ3BzdCcsXG4gICAgICAncHJwJyxcbiAgICAgICdwcmQnLFxuICAgICAgJ3VnJyxcbiAgICAgICd1cicsXG4gICAgICAneWRkJyxcbiAgICAgICd5ZHMnLFxuICAgICAgJ3lpaCcsXG4gICAgICAnamknLFxuICAgICAgJ3lpJyxcbiAgICAgICdoYm8nLFxuICAgICAgJ21lbicsXG4gICAgICAneG1uJyxcbiAgICAgICdmYScsXG4gICAgICAnanByJyxcbiAgICAgICdwZW8nLFxuICAgICAgJ3BlcycsXG4gICAgICAncHJzJyxcbiAgICAgICdkdicsXG4gICAgICAnc2FtJyxcbiAgICAgICdja2InXG4gICAgXTtcblxuICAgIGNvbnN0IGxhbmd1YWdlVXRpbHMgPSAodGhpcy5zZXJ2aWNlcyAmJiB0aGlzLnNlcnZpY2VzLmxhbmd1YWdlVXRpbHMpIHx8IG5ldyBMYW5ndWFnZVV0aWxzKGdldERlZmF1bHRzKCkpIC8vIGZvciB1bmluaXRpYWxpemVkIHVzYWdlXG5cbiAgICByZXR1cm4gcnRsTG5ncy5pbmRleE9mKGxhbmd1YWdlVXRpbHMuZ2V0TGFuZ3VhZ2VQYXJ0RnJvbUNvZGUobG5nKSkgPiAtMSB8fCBsbmcudG9Mb3dlckNhc2UoKS5pbmRleE9mKCctYXJhYicpID4gMVxuICAgICAgPyAncnRsJ1xuICAgICAgOiAnbHRyJztcbiAgfVxuXG4gIHN0YXRpYyBjcmVhdGVJbnN0YW5jZShvcHRpb25zID0ge30sIGNhbGxiYWNrKSB7IHJldHVybiBuZXcgSTE4bihvcHRpb25zLCBjYWxsYmFjaykgfVxuXG4gIGNsb25lSW5zdGFuY2Uob3B0aW9ucyA9IHt9LCBjYWxsYmFjayA9IG5vb3ApIHtcbiAgICBjb25zdCBmb3JrUmVzb3VyY2VTdG9yZSA9IG9wdGlvbnMuZm9ya1Jlc291cmNlU3RvcmU7XG4gICAgaWYgKGZvcmtSZXNvdXJjZVN0b3JlKSBkZWxldGUgb3B0aW9ucy5mb3JrUmVzb3VyY2VTdG9yZTtcbiAgICBjb25zdCBtZXJnZWRPcHRpb25zID0geyAuLi50aGlzLm9wdGlvbnMsIC4uLm9wdGlvbnMsIC4uLnsgaXNDbG9uZTogdHJ1ZSB9IH07XG4gICAgY29uc3QgY2xvbmUgPSBuZXcgSTE4bihtZXJnZWRPcHRpb25zKTtcbiAgICBpZiAoKG9wdGlvbnMuZGVidWcgIT09IHVuZGVmaW5lZCB8fCBvcHRpb25zLnByZWZpeCAhPT0gdW5kZWZpbmVkKSkge1xuICAgICAgY2xvbmUubG9nZ2VyID0gY2xvbmUubG9nZ2VyLmNsb25lKG9wdGlvbnMpO1xuICAgIH1cbiAgICBjb25zdCBtZW1iZXJzVG9Db3B5ID0gWydzdG9yZScsICdzZXJ2aWNlcycsICdsYW5ndWFnZSddO1xuICAgIG1lbWJlcnNUb0NvcHkuZm9yRWFjaChtID0+IHtcbiAgICAgIGNsb25lW21dID0gdGhpc1ttXTtcbiAgICB9KTtcbiAgICBjbG9uZS5zZXJ2aWNlcyA9IHsgLi4udGhpcy5zZXJ2aWNlcyB9O1xuICAgIGNsb25lLnNlcnZpY2VzLnV0aWxzID0ge1xuICAgICAgaGFzTG9hZGVkTmFtZXNwYWNlOiBjbG9uZS5oYXNMb2FkZWROYW1lc3BhY2UuYmluZChjbG9uZSlcbiAgICB9O1xuICAgIGlmIChmb3JrUmVzb3VyY2VTdG9yZSkge1xuICAgICAgY2xvbmUuc3RvcmUgPSBuZXcgUmVzb3VyY2VTdG9yZSh0aGlzLnN0b3JlLmRhdGEsIG1lcmdlZE9wdGlvbnMpO1xuICAgICAgY2xvbmUuc2VydmljZXMucmVzb3VyY2VTdG9yZSA9IGNsb25lLnN0b3JlO1xuICAgIH1cbiAgICBjbG9uZS50cmFuc2xhdG9yID0gbmV3IFRyYW5zbGF0b3IoY2xvbmUuc2VydmljZXMsIG1lcmdlZE9wdGlvbnMpO1xuICAgIGNsb25lLnRyYW5zbGF0b3Iub24oJyonLCAoZXZlbnQsIC4uLmFyZ3MpID0+IHtcbiAgICAgIGNsb25lLmVtaXQoZXZlbnQsIC4uLmFyZ3MpO1xuICAgIH0pO1xuICAgIGNsb25lLmluaXQobWVyZ2VkT3B0aW9ucywgY2FsbGJhY2spO1xuICAgIGNsb25lLnRyYW5zbGF0b3Iub3B0aW9ucyA9IG1lcmdlZE9wdGlvbnM7IC8vIHN5bmMgb3B0aW9uc1xuICAgIGNsb25lLnRyYW5zbGF0b3IuYmFja2VuZENvbm5lY3Rvci5zZXJ2aWNlcy51dGlscyA9IHtcbiAgICAgIGhhc0xvYWRlZE5hbWVzcGFjZTogY2xvbmUuaGFzTG9hZGVkTmFtZXNwYWNlLmJpbmQoY2xvbmUpXG4gICAgfTtcblxuICAgIHJldHVybiBjbG9uZTtcbiAgfVxuXG4gIHRvSlNPTigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgb3B0aW9uczogdGhpcy5vcHRpb25zLFxuICAgICAgc3RvcmU6IHRoaXMuc3RvcmUsXG4gICAgICBsYW5ndWFnZTogdGhpcy5sYW5ndWFnZSxcbiAgICAgIGxhbmd1YWdlczogdGhpcy5sYW5ndWFnZXMsXG4gICAgICByZXNvbHZlZExhbmd1YWdlOiB0aGlzLnJlc29sdmVkTGFuZ3VhZ2VcbiAgICB9O1xuICB9XG59XG5cbmNvbnN0IGluc3RhbmNlID0gSTE4bi5jcmVhdGVJbnN0YW5jZSgpO1xuaW5zdGFuY2UuY3JlYXRlSW5zdGFuY2UgPSBJMThuLmNyZWF0ZUluc3RhbmNlO1xuXG5leHBvcnQgZGVmYXVsdCBpbnN0YW5jZTtcbiIsImltcG9ydCBpMThuZXh0IGZyb20gJy4vaTE4bmV4dC5qcyc7XG5cbmV4cG9ydCBkZWZhdWx0IGkxOG5leHQ7XG5cbmV4cG9ydCBjb25zdCBjcmVhdGVJbnN0YW5jZSA9IGkxOG5leHQuY3JlYXRlSW5zdGFuY2U7XG5cbmV4cG9ydCBjb25zdCBkaXIgPSBpMThuZXh0LmRpcjtcbmV4cG9ydCBjb25zdCBpbml0ID0gaTE4bmV4dC5pbml0O1xuZXhwb3J0IGNvbnN0IGxvYWRSZXNvdXJjZXMgPSBpMThuZXh0LmxvYWRSZXNvdXJjZXM7XG5leHBvcnQgY29uc3QgcmVsb2FkUmVzb3VyY2VzID0gaTE4bmV4dC5yZWxvYWRSZXNvdXJjZXM7XG5leHBvcnQgY29uc3QgdXNlID0gaTE4bmV4dC51c2U7XG5leHBvcnQgY29uc3QgY2hhbmdlTGFuZ3VhZ2UgPSBpMThuZXh0LmNoYW5nZUxhbmd1YWdlO1xuZXhwb3J0IGNvbnN0IGdldEZpeGVkVCA9IGkxOG5leHQuZ2V0Rml4ZWRUO1xuZXhwb3J0IGNvbnN0IHQgPSBpMThuZXh0LnQ7XG5leHBvcnQgY29uc3QgZXhpc3RzID0gaTE4bmV4dC5leGlzdHM7XG5leHBvcnQgY29uc3Qgc2V0RGVmYXVsdE5hbWVzcGFjZSA9IGkxOG5leHQuc2V0RGVmYXVsdE5hbWVzcGFjZTtcbmV4cG9ydCBjb25zdCBoYXNMb2FkZWROYW1lc3BhY2UgPSBpMThuZXh0Lmhhc0xvYWRlZE5hbWVzcGFjZTtcbmV4cG9ydCBjb25zdCBsb2FkTmFtZXNwYWNlcyA9IGkxOG5leHQubG9hZE5hbWVzcGFjZXM7XG5leHBvcnQgY29uc3QgbG9hZExhbmd1YWdlcyA9IGkxOG5leHQubG9hZExhbmd1YWdlcztcbiIsIi8qIGVzbGludC1kaXNhYmxlXG4gICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5hbWVzcGFjZSxcbiAgICBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55LFxuICovXG5cbmltcG9ydCB7XG4gICAgZGVmYXVsdCBhcyBpMThuZXh0LFxuICAgIGkxOG4gYXMgaTE4bmV4dEluc3RhbmNlLFxuICAgIEZhbGxiYWNrTG5nT2JqTGlzdCBhcyBpMThuZXh0RmFsbGJhY2tMbmdPYmpMaXN0LFxuICAgIEZhbGxiYWNrTG5nIGFzIGkxOG5leHRGYWxsYmFja0xuZyxcbiAgICBJbnRlcnBvbGF0aW9uT3B0aW9ucyBhcyBpMThuZXh0SW50ZXJwb2xhdGlvbk9wdGlvbnMsXG4gICAgUmVhY3RPcHRpb25zIGFzIGkxOG5leHRSZWFjdE9wdGlvbnMsXG4gICAgSW5pdE9wdGlvbnMgYXMgaTE4bmV4dEluaXRPcHRpb25zLFxuICAgIFRPcHRpb25zQmFzZSBhcyBpMThuZXh0VE9wdGlvbnNCYXNlLFxuICAgIFRPcHRpb25zIGFzIGkxOG5leHRUT3B0aW9ucyxcbiAgICBFeGlzdHNGdW5jdGlvbiBhcyBpMThuZXh0RXhpc3RzRnVuY3Rpb24sXG4gICAgV2l0aFQgYXMgaTE4bmV4dFdpdGhULFxuICAgIFRGdW5jdGlvbiBhcyBpMThuZXh0VEZ1bmN0aW9uLFxuICAgIFJlc291cmNlIGFzIGkxOG5leHRSZXNvdXJjZSxcbiAgICBSZXNvdXJjZUxhbmd1YWdlIGFzIGkxOG5leHRSZXNvdXJjZUxhbmd1YWdlLFxuICAgIFJlc291cmNlS2V5IGFzIGkxOG5leHRSZXNvdXJjZUtleSxcbiAgICBJbnRlcnBvbGF0b3IgYXMgaTE4bmV4dEludGVycG9sYXRvcixcbiAgICBSZXNvdXJjZVN0b3JlIGFzIGkxOG5leHRSZXNvdXJjZVN0b3JlLFxuICAgIFNlcnZpY2VzIGFzIGkxOG5leHRTZXJ2aWNlcyxcbiAgICBNb2R1bGUgYXMgaTE4bmV4dE1vZHVsZSxcbiAgICBDYWxsYmFja0Vycm9yIGFzIGkxOG5leHRDYWxsYmFja0Vycm9yLFxuICAgIFJlYWRDYWxsYmFjayBhcyBpMThuZXh0UmVhZENhbGxiYWNrLFxuICAgIE11bHRpUmVhZENhbGxiYWNrIGFzIGkxOG5leHRNdWx0aVJlYWRDYWxsYmFjayxcbiAgICBCYWNrZW5kTW9kdWxlIGFzIGkxOG5leHRCYWNrZW5kTW9kdWxlLFxuICAgIExhbmd1YWdlRGV0ZWN0b3JNb2R1bGUgYXMgaTE4bmV4dExhbmd1YWdlRGV0ZWN0b3JNb2R1bGUsXG4gICAgTGFuZ3VhZ2VEZXRlY3RvckFzeW5jTW9kdWxlIGFzIGkxOG5leHRMYW5ndWFnZURldGVjdG9yQXN5bmNNb2R1bGUsXG4gICAgUG9zdFByb2Nlc3Nvck1vZHVsZSBhcyBpMThuZXh0UG9zdFByb2Nlc3Nvck1vZHVsZSxcbiAgICBMb2dnZXJNb2R1bGUgYXMgaTE4bmV4dExvZ2dlck1vZHVsZSxcbiAgICBJMThuRm9ybWF0TW9kdWxlIGFzIGkxOG5leHRJMThuRm9ybWF0TW9kdWxlLFxuICAgIFRoaXJkUGFydHlNb2R1bGUgYXMgaTE4bmV4dFRoaXJkUGFydHlNb2R1bGUsXG4gICAgTW9kdWxlcyBhcyBpMThuZXh0TW9kdWxlcyxcbiAgICBOZXdhYmxlIGFzIGkxOG5leHROZXdhYmxlLFxufSBmcm9tICdpMThuZXh0JztcblxuY29uc3QgaTE4bjogaTE4bi5pMThuID0gaTE4bmV4dDtcblxuZGVjbGFyZSBuYW1lc3BhY2UgaTE4biB7XG4gICAgZXhwb3J0IHR5cGUgaTE4biA9IGkxOG5leHRJbnN0YW5jZTtcbiAgICBleHBvcnQgdHlwZSBGYWxsYmFja0xuZ09iakxpc3QgPSBpMThuZXh0RmFsbGJhY2tMbmdPYmpMaXN0O1xuICAgIGV4cG9ydCB0eXBlIEZhbGxiYWNrTG5nID0gaTE4bmV4dEZhbGxiYWNrTG5nO1xuICAgIGV4cG9ydCB0eXBlIEludGVycG9sYXRpb25PcHRpb25zID0gaTE4bmV4dEludGVycG9sYXRpb25PcHRpb25zO1xuICAgIGV4cG9ydCB0eXBlIFJlYWN0T3B0aW9ucyA9IGkxOG5leHRSZWFjdE9wdGlvbnM7XG4gICAgZXhwb3J0IHR5cGUgSW5pdE9wdGlvbnMgPSBpMThuZXh0SW5pdE9wdGlvbnM7XG4gICAgZXhwb3J0IHR5cGUgVE9wdGlvbnNCYXNlID0gaTE4bmV4dFRPcHRpb25zQmFzZTtcbiAgICBleHBvcnQgdHlwZSBUT3B0aW9uczxUIGV4dGVuZHMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4gPSBSZWNvcmQ8c3RyaW5nLCBhbnk+PiA9IGkxOG5leHRUT3B0aW9uczxUPjtcbiAgICBleHBvcnQgdHlwZSBFeGlzdHNGdW5jdGlvbjxLIGV4dGVuZHMgc3RyaW5nID0gc3RyaW5nLCBUIGV4dGVuZHMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4gPSBSZWNvcmQ8c3RyaW5nLCBhbnk+PiA9IGkxOG5leHRFeGlzdHNGdW5jdGlvbjxLLCBUPjtcbiAgICBleHBvcnQgdHlwZSBXaXRoVCA9IGkxOG5leHRXaXRoVDtcbiAgICBleHBvcnQgdHlwZSBURnVuY3Rpb24gPSBpMThuZXh0VEZ1bmN0aW9uO1xuICAgIGV4cG9ydCB0eXBlIFJlc291cmNlID0gaTE4bmV4dFJlc291cmNlO1xuICAgIGV4cG9ydCB0eXBlIFJlc291cmNlTGFuZ3VhZ2UgPSBpMThuZXh0UmVzb3VyY2VMYW5ndWFnZTtcbiAgICBleHBvcnQgdHlwZSBSZXNvdXJjZUtleSA9IGkxOG5leHRSZXNvdXJjZUtleTtcbiAgICBleHBvcnQgdHlwZSBJbnRlcnBvbGF0b3IgPSBpMThuZXh0SW50ZXJwb2xhdG9yO1xuICAgIGV4cG9ydCB0eXBlIFJlc291cmNlU3RvcmUgPSBpMThuZXh0UmVzb3VyY2VTdG9yZTtcbiAgICBleHBvcnQgdHlwZSBTZXJ2aWNlcyA9IGkxOG5leHRTZXJ2aWNlcztcbiAgICBleHBvcnQgdHlwZSBNb2R1bGUgPSBpMThuZXh0TW9kdWxlO1xuICAgIGV4cG9ydCB0eXBlIENhbGxiYWNrRXJyb3IgPSBpMThuZXh0Q2FsbGJhY2tFcnJvcjtcbiAgICBleHBvcnQgdHlwZSBSZWFkQ2FsbGJhY2sgPSBpMThuZXh0UmVhZENhbGxiYWNrO1xuICAgIGV4cG9ydCB0eXBlIE11bHRpUmVhZENhbGxiYWNrID0gaTE4bmV4dE11bHRpUmVhZENhbGxiYWNrO1xuICAgIGV4cG9ydCB0eXBlIEJhY2tlbmRNb2R1bGU8VCA9IFJlY29yZDxzdHJpbmcsIHVua25vd24+PiA9IGkxOG5leHRCYWNrZW5kTW9kdWxlPFQ+O1xuICAgIGV4cG9ydCB0eXBlIExhbmd1YWdlRGV0ZWN0b3JNb2R1bGUgPSBpMThuZXh0TGFuZ3VhZ2VEZXRlY3Rvck1vZHVsZTtcbiAgICBleHBvcnQgdHlwZSBMYW5ndWFnZURldGVjdG9yQXN5bmNNb2R1bGUgPSBpMThuZXh0TGFuZ3VhZ2VEZXRlY3RvckFzeW5jTW9kdWxlO1xuICAgIGV4cG9ydCB0eXBlIFBvc3RQcm9jZXNzb3JNb2R1bGUgPSBpMThuZXh0UG9zdFByb2Nlc3Nvck1vZHVsZTtcbiAgICBleHBvcnQgdHlwZSBMb2dnZXJNb2R1bGUgPSBpMThuZXh0TG9nZ2VyTW9kdWxlO1xuICAgIGV4cG9ydCB0eXBlIEkxOG5Gb3JtYXRNb2R1bGUgPSBpMThuZXh0STE4bkZvcm1hdE1vZHVsZTtcbiAgICBleHBvcnQgdHlwZSBUaGlyZFBhcnR5TW9kdWxlID0gaTE4bmV4dFRoaXJkUGFydHlNb2R1bGU7XG4gICAgZXhwb3J0IHR5cGUgTW9kdWxlcyA9IGkxOG5leHRNb2R1bGVzO1xuICAgIGV4cG9ydCB0eXBlIE5ld2FibGU8VD4gPSBpMThuZXh0TmV3YWJsZTxUPjtcbn1cblxuZXhwb3J0IHsgaTE4biB9O1xuIl0sIm5hbWVzIjpbInV0aWxzLmdldFBhdGgiLCJ1dGlscy5kZWVwRmluZCIsInV0aWxzLnNldFBhdGgiLCJ1dGlscy5kZWVwRXh0ZW5kIiwidXRpbHMuY29weSIsInV0aWxzLmxvb2tzTGlrZU9iamVjdFBhdGgiLCJ1dGlscy5nZXRQYXRoV2l0aERlZmF1bHRzIiwidXRpbHMuZXNjYXBlIiwidXRpbHMucmVnZXhFc2NhcGUiLCJ1dGlscy5tYWtlU3RyaW5nIiwidXRpbHMucHVzaFBhdGgiLCJnZXREZWZhdWx0cyIsIkxhbmd1YWdlVXRpbHMiLCJCYWNrZW5kQ29ubmVjdG9yIiwiaTE4bmV4dCJdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFBQSxNQUFNLGFBQWEsR0FBRztBQUN0QixFQUFFLElBQUksRUFBRSxRQUFRO0FBQ2hCO0FBQ0EsRUFBRSxHQUFHLENBQUMsSUFBSSxFQUFFO0FBQ1osSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQztBQUM3QixHQUFHO0FBQ0g7QUFDQSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUU7QUFDYixJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO0FBQzlCLEdBQUc7QUFDSDtBQUNBLEVBQUUsS0FBSyxDQUFDLElBQUksRUFBRTtBQUNkLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDL0IsR0FBRztBQUNIO0FBQ0EsRUFBRSxNQUFNLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRTtBQUNyQjtBQUNBLElBQUksSUFBSSxPQUFPLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDO0FBQ3JFLEdBQUc7QUFDSCxDQUFDLENBQUM7QUFDRjtBQUNBLE1BQU0sTUFBTSxDQUFDO0FBQ2IsRUFBRSxXQUFXLENBQUMsY0FBYyxFQUFFLE9BQU8sR0FBRyxFQUFFLEVBQUU7QUFDNUMsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxPQUFPLENBQUMsQ0FBQztBQUN2QyxHQUFHO0FBQ0g7QUFDQSxFQUFFLElBQUksQ0FBQyxjQUFjLEVBQUUsT0FBTyxHQUFHLEVBQUUsRUFBRTtBQUNyQyxJQUFJLElBQUksQ0FBQyxNQUFNLEdBQUcsT0FBTyxD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QUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUM7QUFDbEM7QUFDQSxRQUFRLElBQUksWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDO0FBQ2pHLE9BQU8sTUFBTSxJQUFJLENBQUMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO0FBQ2pDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQztBQUNsQztBQUNBO0FBQ0EsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUM7QUFDekQsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxLQUFLLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQztBQUMzRTtBQUNBLFFBQVEsSUFBSSxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUM7QUFDakcsUUFBUSxJQUFJLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMs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QSxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJO0FBQ3hFLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJO0FBQ2hFLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJO0FBQ2pGLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLO0FBQ3RFLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRTtBQUNyRjtBQUNBLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJO0FBQzdFLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFO0FBQ3BFO0FBQ0EsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUU7QUFDNUU7QUFDQSxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFO0FBQy9DLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFO0FBQzNDLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFO0FBQzVDLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFO0FBQ3hDLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRTtBQUNwQyxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUU7QUFDNUMsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUU7QUFDMUMsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFO0FBQ3JDLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRTtBQUNyQyxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRTtBQUN6QyxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFO0FBQ3hDLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUU7QUFDdkMsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFO0FBQ3JDLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxLQUFLLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUU7QUFDeEMsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUU7QUFDM0MsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFO0FBQ3BDLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUU7QUFDeEMsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUU7QUFDekMsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFO0FBQ2hELEVBQUM7QUFDRDtBQUNBLElBQUksa0JBQWtCLEdBQUc7QUFDekIsRUFBRSxDQUFDLEVBQUUsU0FBUyxDQUFDLEVBQUUsQ0FBQyxPQUFPLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN4QyxFQUFFLENBQUMsRUFBRSxTQUFTLENBQUMsRUFBRSxDQUFDLE9BQU8sTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3pDLEVBQUUsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztBQUM1QixFQUFFLENBQUMsRUFBRSxTQUFTLENBQUMsRUFBRSxDQUFDLE9BQU8sTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ25ILEVBQUUsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxFQUFFLENBQUMsT0FBTyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2pILEVBQUUsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxFQUFFLENBQUMsT0FBTyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN0RSxFQUFFLENBQUMsRUFBRSxTQUFTLENBQUMsRUFBRSxDQUFDLE9BQU8sTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbkcsRUFBRSxDQUFDLEVBQUUsU0FBUyxDQUFDLEVBQUUsQ0FBQyxPQUFPLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDeEYsRUFBRSxDQUFDLEVBQUUsU0FBUyxDQUFDLEVBQUUsQ0FBQyxPQUFPLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN6QyxFQUFFLEVBQUUsRUFBRSxTQUFTLENBQUMsRUFBRSxDQUFDLE9BQU8sTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUM7QUFDakYsRUFBRSxFQUFFLEVBQUUsU0FBUyxDQUFDLEVBQUUsQ0FBQyxPQUFPLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3pHLEVBQUUsRUFBRSxFQUFFLFNBQVMsQ0FBQyxFQUFFLENBQUMsT0FBTyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQ3hELEVBQUUsRUFBRSxFQUFFLFNBQVMsQ0FBQyxFQUFFLENBQUMsT0FBTyxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDM0MsRUFBRSxFQUFFLEVBQUUsU0FBUyxDQUFDLEVBQUUsQ0FBQyxPQUFPLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzlFLEVBQUUsRUFBRSxFQUFFLFNBQVMsQ0FBQyxFQUFFLENBQUMsT0FBTyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDekcsRUFBRSxFQUFFLEVBQUUsU0FBUyxDQUFDLEVBQUUsQ0FBQyxPQUFPLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM5RSxFQUFFLEVBQUUsRUFBRSxTQUFTLENBQUMsRUFBRSxDQUFDLE9BQU8sTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDeEUsRUFBRSxFQUFFLEVBQUUsU0FBUyxDQUFDLEVBQUUsQ0FBQyxPQUFPLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzNELEVBQUUsRUFBRSxFQUFFLFNBQVMsQ0FBQyxFQUFFLENBQUMsT0FBTyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ25ILEVBQUUsRUFBRSxFQUFFLFNBQVMsQ0FBQyxFQUFFLENBQUMsT0FBTyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDMUYsRUFBRSxFQUFFLEVBQUUsU0FBUyxDQUFDLEVBQUUsQ0FBQyxPQUFPLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsR0FB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LE1BQU0sS0FBSztBQUNYLE1BQU0sS0FBSztBQUNYLE1BQU0sS0FBSztBQUNYLE1BQU0sS0FBSztBQUNYLE1BQU0sS0FBSztBQUNYLE1BQU0sS0FBSztBQUNYLE1BQU0sS0FBSztBQUNYLE1BQU0sS0FBSztBQUNYLE1BQU0sS0FBSztBQUNYLE1BQU0sS0FBSztBQUNYLE1BQU0sS0FBSztBQUNYLE1BQU0sSUFBSTtBQUNWLE1BQU0sSUFBSTtBQUNWLE1BQU0sSUFBSTtBQUNWLE1BQU0sS0FBSztBQUNYLE1BQU0sS0FBSztBQUNYLE1BQU0sS0FBSztBQUNYLE1BQU0sS0FBSztBQUNYLE1BQU0sS0FBSztBQUNYLE1BQU0sSUFBSTtBQUNWLE1BQU0sSUFBSTtBQUNWLE1BQU0sS0FBSztBQUNYLE1BQU0sS0FBSztBQUNYLE1BQU0sS0FBSztBQUNYLE1BQU0sSUFBSTtBQUNWLE1BQU0sSUFBSTtBQUNWLE1BQU0sS0FBSztBQUNYLE1BQU0sS0FBSztBQUNYLE1BQU0sS0FBSztBQUNYLE1BQU0sSUFBSTtBQUNWLE1BQU0sS0FBSztBQUNYLE1BQU0sS0FBSztBQUNYLE1BQU0sS0FBSztBQUNYLE1BQU0sS0FBSztBQUNYLE1BQU0sSUFBSTtBQUNWLE1BQU0sS0FBSztBQUNYLE1BQU0sS0FBSztBQUNYLEtBQUssQ0FBQztBQUNOO0FBQ0EsSUFBSSxNQUFNLGFBQWEsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxhQUFhLEtBQUssSUFBSUQsWUFBYSxDQUFDRCxHQUFXLEVBQUUsRUFBQztBQUM1RztBQUNBLElBQUksT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyx1QkFBdUIsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQztBQUNySCxRQUFRLEtBQUs7QUFDYixRQUFRLEtBQUssQ0FBQztBQUNkLEdBQUc7QUFDSDtBQUNBLEVBQUUsT0FB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QUs7QUFDdkIsTUFBTSxRQUFRLEVBQUUsSUFBSSxDQUFDLFFBQVE7QUFDN0IsTUFBTSxTQUFTLEVBQUUsSUFBSSxDQUFDLFNBQVM7QUFDL0IsTUFBTSxnQkFBZ0IsRUFBRSxJQUFJLENBQUMsZ0JBQWdCO0FBQzdDLEtBQUssQ0FBQztBQUNOLEdBQUc7QUFDSCxDQUFDO0FBQ0Q7QUFDQSxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7QUFDdkMsUUFBUSxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUMsY0FBYzs7QUMvbUJmRyxRQUFPLENBQUMsZUFBZTtBQUNyRDtBQUNtQkEsUUFBTyxDQUFDLElBQUk7QUFDWEEsUUFBTyxDQUFDLEtBQUs7QUFDSkEsUUFBTyxDQUFDLGNBQWM7QUFDcEJBLFFBQU8sQ0FBQyxnQkFBZ0I7QUFDcENBLFFBQU8sQ0FBQyxJQUFJO0FBQ0RBLFFBQU8sQ0FBQyxlQUFlO0FBQzVCQSxRQUFPLENBQUMsVUFBVTtBQUMxQkEsUUFBTyxDQUFDLEVBQUU7QUFDTEEsUUFBTyxDQUFDLE9BQU87QUFDRkEsUUFBTyxDQUFDLG9CQUFvQjtBQUM3QkEsUUFBTyxDQUFDLG1CQUFtQjtBQUMvQkEsUUFBTyxDQUFDLGVBQWU7QUFDeEJBLFFBQU8sQ0FBQzs7QUNsQnJDOzs7QUFHRztBQW9DRyxNQUFBLElBQUksR0FBY0E7Ozs7IiwieF9nb29nbGVfaWdub3JlTGlzdCI6WzAsMSwyLDMsNCw1LDYsNyw4LDksMTAsMTEsMTIsMTNdLCJzb3VyY2VSb290IjoiY2RwOi8vL0BjZHAvZXh0ZW5zaW9uLWkxOG4vIn0=