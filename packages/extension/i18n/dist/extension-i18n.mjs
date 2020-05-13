/*!
 * @cdp/extension-i18n 0.9.0
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
    if (console && console[type]) console[type](...args);
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

  setDebug(bool) {
    this.debug = bool;
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
}

const baseLogger = new Logger();

class EventEmitter {
  constructor() {
    this.observers = {};
  }

  on(events, listener) {
    events.split(' ').forEach(event => {
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

    this.observers[event] = this.observers[event].filter(l => l !== listener);
  }

  emit(event, ...args) {
    if (this.observers[event]) {
      const cloned = [].concat(this.observers[event]);
      cloned.forEach(observer => {
        observer(...args);
      });
    }

    if (this.observers['*']) {
      const cloned = [].concat(this.observers['*']);
      cloned.forEach(observer => {
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
  a.forEach(m => {
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
    object = object[key];
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
    return data.replace(/[&<>"'\/]/g, s => _entityMap[s]);
  }

  return data;
}

const isIE10 =
  typeof window !== 'undefined' &&
  window.navigator &&
  window.navigator.userAgent &&
  window.navigator.userAgent.indexOf('MSIE') > -1;

class ResourceStore extends EventEmitter {
  constructor(data, options = { ns: ['translation'], defaultNS: 'translation' }) {
    super();

    this.data = data || {};
    this.options = options;
    if (this.options.keySeparator === undefined) {
      this.options.keySeparator = '.';
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

    let path = [lng, ns];
    if (key && typeof key !== 'string') path = path.concat(key);
    if (key && typeof key === 'string')
      path = path.concat(keySeparator ? key.split(keySeparator) : key);

    if (lng.indexOf('.') > -1) {
      path = lng.split('.');
    }

    return getPath(this.data, path);
  }

  addResource(lng, ns, key, value, options = { silent: false }) {
    let keySeparator = this.options.keySeparator;
    if (keySeparator === undefined) keySeparator = '.';

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
    processors.forEach(processor => {
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
    const resolved = this.resolve(key, options);
    return resolved && resolved.res !== undefined;
  }

  extractFromKey(key, options) {
    let nsSeparator = options.nsSeparator || this.options.nsSeparator;
    if (nsSeparator === undefined) nsSeparator = ':';

    const keySeparator =
      options.keySeparator !== undefined ? options.keySeparator : this.options.keySeparator;

    let namespaces = options.ns || this.options.defaultNS;
    if (nsSeparator && key.indexOf(nsSeparator) > -1) {
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

  translate(keys, options) {
    if (typeof options !== 'object' && this.options.overloadTranslationOptionHandler) {
      /* eslint prefer-rest-params: 0 */
      options = this.options.overloadTranslationOptionHandler(arguments);
    }
    if (!options) options = {};

    // non valid keys handling
    if (keys === undefined || keys === null /* || keys === ''*/) return '';
    if (!Array.isArray(keys)) keys = [String(keys)];

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
        return namespace + nsSeparator + key;
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
        this.logger.warn('accessing an object - but returnObjects options is not enabled!');
        return this.options.returnedObjectHandler
          ? this.options.returnedObjectHandler(resUsedKey, res, options)
          : `key '${key} (${this.language})' returned an object instead of string.`;
      }

      // if we got a separator we loop over children - else we just return object as is
      // as having it set to false means no hierarchy so no lookup for nested values
      if (keySeparator) {
        const resTypeIsArray = resType === '[object Array]';
        const copy = resTypeIsArray ? [] : {}; // apply child translation on a copy

        /* eslint no-restricted-syntax: 0 */
        let newKeyToUse = resTypeIsArray ? resExactUsedKey : resUsedKey;
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
      if (res) res = this.extendTranslation(res, keys, options);
    } else {
      // string, empty or null
      let usedDefault = false;
      let usedKey = false;

      // fallback value
      if (!this.isValidLookup(res) && options.defaultValue !== undefined) {
        usedDefault = true;

        if (options.count !== undefined) {
          const suffix = this.pluralResolver.getSuffix(lng, options.count);
          res = options[`defaultValue${suffix}`];
        }
        if (!res) res = options.defaultValue;
      }
      if (!this.isValidLookup(res)) {
        usedKey = true;
        res = key;
      }

      // save missing
      const updateMissing =
        options.defaultValue && options.defaultValue !== res && this.options.updateMissing;
      if (usedKey || usedDefault || updateMissing) {
        this.logger.log(
          updateMissing ? 'updateKey' : 'missingKey',
          lng,
          namespace,
          key,
          updateMissing ? options.defaultValue : res,
        );

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

        const send = (l, k) => {
          if (this.options.missingKeyHandler) {
            this.options.missingKeyHandler(
              l,
              namespace,
              k,
              updateMissing ? options.defaultValue : res,
              updateMissing,
              options,
            );
          } else if (this.backendConnector && this.backendConnector.saveMissing) {
            this.backendConnector.saveMissing(
              l,
              namespace,
              k,
              updateMissing ? options.defaultValue : res,
              updateMissing,
              options,
            );
          }
          this.emit('missingKey', l, namespace, k, res);
        };

        if (this.options.saveMissing) {
          const needsPluralHandling =
            options.count !== undefined && typeof options.count !== 'string';
          if (this.options.saveMissingPlurals && needsPluralHandling) {
            lngs.forEach(l => {
              const plurals = this.pluralResolver.getPluralFormsOfKey(l, key);

              plurals.forEach(p => send([l], p));
            });
          } else {
            send(lngs, key);
          }
        }
      }

      // extend
      res = this.extendTranslation(res, keys, options, resolved);

      // append namespace if still key
      if (usedKey && res === key && this.options.appendNamespaceToMissingKey)
        res = `${namespace}:${key}`;

      // parseMissingKeyHandler
      if (usedKey && this.options.parseMissingKeyHandler)
        res = this.options.parseMissingKeyHandler(res);
    }

    // return
    return res;
  }

  extendTranslation(res, key, options, resolved) {
    if (this.i18nFormat && this.i18nFormat.parse) {
      res = this.i18nFormat.parse(
        res,
        options,
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

      // interpolate
      let data = options.replace && typeof options.replace !== 'string' ? options.replace : options;
      if (this.options.interpolation.defaultVariables)
        data = { ...this.options.interpolation.defaultVariables, ...data };
      res = this.interpolator.interpolate(res, data, options.lng || this.language, options);

      // nesting
      if (options.nest !== false)
        res = this.interpolator.nest(res, (...args) => this.translate(...args), options);

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
    keys.forEach(k => {
      if (this.isValidLookup(found)) return;
      const extracted = this.extractFromKey(k, options);
      const key = extracted.key;
      usedKey = key;
      let namespaces = extracted.namespaces;
      if (this.options.fallbackNS) namespaces = namespaces.concat(this.options.fallbackNS);

      const needsPluralHandling = options.count !== undefined && typeof options.count !== 'string';
      const needsContextHandling =
        options.context !== undefined &&
        typeof options.context === 'string' &&
        options.context !== '';

      const codes = options.lngs
        ? options.lngs
        : this.languageUtils.toResolveHierarchy(options.lng || this.language, options.fallbackLng);

      namespaces.forEach(ns => {
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
            `key "${usedKey}" for namespace "${usedNS}" for languages "${codes.join(
              ', ',
            )}" won't get resolved as namespace was not yet loaded`,
            'This means something IS WRONG in your application setup. You access the t function before i18next.init / i18next.loadNamespace / i18next.changeLanguage was done. Wait for the callback or Promise to resolve before accessing it!!!',
          );
        }

        codes.forEach(code => {
          if (this.isValidLookup(found)) return;
          usedLng = code;

          let finalKey = key;
          const finalKeys = [finalKey];

          if (this.i18nFormat && this.i18nFormat.addLookupKeys) {
            this.i18nFormat.addLookupKeys(finalKeys, key, code, ns, options);
          } else {
            let pluralSuffix;
            if (needsPluralHandling)
              pluralSuffix = this.pluralResolver.getSuffix(code, options.count);

            // fallback for plural if context not found
            if (needsPluralHandling && needsContextHandling)
              finalKeys.push(finalKey + pluralSuffix);

            // get key for context if needed
            if (needsContextHandling)
              finalKeys.push((finalKey += `${this.options.contextSeparator}${options.context}`));

            // get key for plural if needed
            if (needsPluralHandling) finalKeys.push((finalKey += pluralSuffix));
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
}

function capitalize(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

class LanguageUtil {
  constructor(options) {
    this.options = options;

    this.whitelist = this.options.whitelist || false;
    this.logger = baseLogger.create('languageUtils');
  }

  getScriptPartFromCode(code) {
    if (!code || code.indexOf('-') < 0) return null;

    const p = code.split('-');
    if (p.length === 2) return null;
    p.pop();
    return this.formatLanguageCode(p.join('-'));
  }

  getLanguagePartFromCode(code) {
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
        p = p.map(part => part.toLowerCase());
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

  isWhitelisted(code) {
    if (this.options.load === 'languageOnly' || this.options.nonExplicitWhitelist) {
      code = this.getLanguagePartFromCode(code);
    }
    return !this.whitelist || !this.whitelist.length || this.whitelist.indexOf(code) > -1;
  }

  getFallbackCodes(fallbacks, code) {
    if (!fallbacks) return [];
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
    const addCode = c => {
      if (!c) return;
      if (this.isWhitelisted(c)) {
        codes.push(c);
      } else {
        this.logger.warn(`rejecting non-whitelisted language code: ${c}`);
      }
    };

    if (typeof code === 'string' && code.indexOf('-') > -1) {
      if (this.options.load !== 'languageOnly') addCode(this.formatLanguageCode(code));
      if (this.options.load !== 'languageOnly' && this.options.load !== 'currentOnly')
        addCode(this.getScriptPartFromCode(code));
      if (this.options.load !== 'currentOnly') addCode(this.getLanguagePartFromCode(code));
    } else if (typeof code === 'string') {
      addCode(this.formatLanguageCode(code));
    }

    fallbackCodes.forEach(fc => {
      if (codes.indexOf(fc) < 0) addCode(this.formatLanguageCode(fc));
    });

    return codes;
  }
}

// definition http://translate.sourceforge.net/wiki/l10n/pluralforms
/* eslint-disable */
let sets = [
  { lngs: ['ach','ak','am','arn','br','fil','gun','ln','mfe','mg','mi','oc', 'pt', 'pt-BR',
    'tg','ti','tr','uz','wa'], nr: [1,2], fc: 1 },

  { lngs: ['af','an','ast','az','bg','bn','ca','da','de','dev','el','en',
    'eo','es','et','eu','fi','fo','fur','fy','gl','gu','ha','hi',
    'hu','hy','ia','it','kn','ku','lb','mai','ml','mn','mr','nah','nap','nb',
    'ne','nl','nn','no','nso','pa','pap','pms','ps','pt-PT','rm','sco',
    'se','si','so','son','sq','sv','sw','ta','te','tk','ur','yo'], nr: [1,2], fc: 2 },

  { lngs: ['ay','bo','cgg','fa','id','ja','jbo','ka','kk','km','ko','ky','lo',
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
  { lngs: ['he'], nr: [1,2,20,21], fc: 22 }
];

let _rulesPluralsTypes = {
  1: function(n) {return Number(n > 1);},
  2: function(n) {return Number(n != 1);},
  3: function(n) {return 0;},
  4: function(n) {return Number(n%10==1 && n%100!=11 ? 0 : n%10>=2 && n%10<=4 && (n%100<10 || n%100>=20) ? 1 : 2);},
  5: function(n) {return Number(n===0 ? 0 : n==1 ? 1 : n==2 ? 2 : n%100>=3 && n%100<=10 ? 3 : n%100>=11 ? 4 : 5);},
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
  17: function(n) {return Number(n==1 || n%10==1 ? 0 : 1);},
  18: function(n) {return Number(n==0 ? 0 : n==1 ? 1 : 2);},
  19: function(n) {return Number(n==1 ? 0 : n===0 || ( n%100>1 && n%100<11) ? 1 : (n%100>10 && n%100<20 ) ? 2 : 3);},
  20: function(n) {return Number(n==1 ? 0 : (n===0 || (n%100 > 0 && n%100 < 20)) ? 1 : 2);},
  21: function(n) {return Number(n%100==1 ? 1 : n%100==2 ? 2 : n%100==3 || n%100==4 ? 3 : 0); },
  22: function(n) {return Number(n===1 ? 0 : n===2 ? 1 : (n<0 || n>10) && n%10==0 ? 2 : 3); }
};
/* eslint-enable */

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

    this.rules = createRules();
  }

  addRule(lng, obj) {
    this.rules[lng] = obj;
  }

  getRule(code) {
    return this.rules[code] || this.rules[this.languageUtils.getLanguagePartFromCode(code)];
  }

  needsPlural(code) {
    const rule = this.getRule(code);

    return rule && rule.numbers.length > 1;
  }

  getPluralFormsOfKey(code, key) {
    const ret = [];

    const rule = this.getRule(code);

    if (!rule) return ret;

    rule.numbers.forEach((n) => {
      const suffix = this.getSuffix(code, n);
      ret.push(`${key}${suffix}`);
    });

    return ret;
  }

  getSuffix(code, count) {
    const rule = this.getRule(code);

    if (rule) {
      // if (rule.numbers.length === 1) return ''; // only singular

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
      } else if (/* v2 */ this.options.compatibilityJSON === 'v2') {
        return returnSuffix();
      } else if (/* v3 - gettext index */ this.options.simplifyPluralSuffix && rule.numbers.length === 2 && rule.numbers[0] === 1) {
        return returnSuffix();
      }
      return this.options.prepend && idx.toString() ? this.options.prepend + idx.toString() : idx.toString();
    }

    this.logger.warn(`no plural rule found for: ${code}`);
    return '';
  }
}

class Interpolator {
  constructor(options = {}) {
    this.logger = baseLogger.create('interpolator');

    this.options = options;
    this.format = (options.interpolation && options.interpolation.format) || (value => value);
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

    const regexpUnescapeStr = `${this.prefix}${this.unescapePrefix}(.+?)${this.unescapeSuffix}${
      this.suffix
    }`;
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

    const handleFormat = key => {
      if (key.indexOf(this.formatSeparator) < 0) {
        const path = getPathWithDefaults(data, defaultData, key);
        return this.alwaysFormat ? this.format(path, undefined, lng) : path;
      }

      const p = key.split(this.formatSeparator);
      const k = p.shift().trim();
      const f = p.join(this.formatSeparator).trim();

      return this.format(getPathWithDefaults(data, defaultData, k), f, lng, options);
    };

    this.resetRegExp();

    const missingInterpolationHandler =
      (options && options.missingInterpolationHandler) || this.options.missingInterpolationHandler;

    replaces = 0;
    // unescape if has unescapePrefix/Suffix
    /* eslint no-cond-assign: 0 */
    while ((match = this.regexpUnescape.exec(str))) {
      value = handleFormat(match[1].trim());
      if (value === undefined) {
        if (typeof missingInterpolationHandler === 'function') {
          const temp = missingInterpolationHandler(str, match, options);
          value = typeof temp === 'string' ? temp : '';
        } else {
          this.logger.warn(`missed to pass in variable ${match[1]} for interpolating ${str}`);
          value = '';
        }
      } else if (typeof value !== 'string' && !this.useRawValueToEscape) {
        value = makeString(value);
      }
      str = str.replace(match[0], regexSafe(value));
      this.regexpUnescape.lastIndex = 0;
      replaces++;
      if (replaces >= this.maxReplaces) {
        break;
      }
    }

    replaces = 0;
    // regular escape on demand
    while ((match = this.regexp.exec(str))) {
      value = handleFormat(match[1].trim());
      if (value === undefined) {
        if (typeof missingInterpolationHandler === 'function') {
          const temp = missingInterpolationHandler(str, match, options);
          value = typeof temp === 'string' ? temp : '';
        } else {
          this.logger.warn(`missed to pass in variable ${match[1]} for interpolating ${str}`);
          value = '';
        }
      } else if (typeof value !== 'string' && !this.useRawValueToEscape) {
        value = makeString(value);
      }
      value = this.escapeValue ? regexSafe(this.escape(value)) : regexSafe(value);
      str = str.replace(match[0], value);
      this.regexp.lastIndex = 0;
      replaces++;
      if (replaces >= this.maxReplaces) {
        break;
      }
    }
    return str;
  }

  nest(str, fc, options = {}) {
    let match;
    let value;

    let clonedOptions = { ...options };
    clonedOptions.applyPostProcessor = false; // avoid post processing on nested lookup
    delete clonedOptions.defaultValue; // assert we do not get a endless loop on interpolating defaultValue again and again

    // if value is something like "myKey": "lorem $(anotherKey, { "count": {{aValueInOptions}} })"
    function handleHasOptions(key, inheritedOptions) {
      const sep = this.nestingOptionsSeparator;
      if (key.indexOf(sep) < 0) return key;

      const c = key.split(new RegExp(`${sep}[ ]*{`));

      let optionsString = `{${c[1]}`;
      key = c[0];
      optionsString = this.interpolate(optionsString, clonedOptions);
      optionsString = optionsString.replace(/'/g, '"');

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
      if (match[0].includes(this.formatSeparator) && !/{.*}/.test(match[1])) {
        [match[1], ...formatters] = match[1].split(this.formatSeparator).map(elem => elem.trim());
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
        value = formatters.reduce((v, f) => this.format(v, f, options.lng, options), value.trim());
      }

      // Nested keys should not be escaped by default #854
      // value = this.escapeValue ? regexSafe(utils.escape(value)) : regexSafe(value);
      str = str.replace(match[0], value);
      this.regexp.lastIndex = 0;
    }
    return str;
  }
}

function remove(arr, what) {
  let found = arr.indexOf(what);

  while (found !== -1) {
    arr.splice(found, 1);
    found = arr.indexOf(what);
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

    this.state = {};
    this.queue = [];

    if (this.backend && this.backend.init) {
      this.backend.init(services, options.backend, options);
    }
  }

  queueLoad(languages, namespaces, options, callback) {
    // find what needs to be loaded
    const toLoad = [];
    const pending = [];
    const toLoadLanguages = [];
    const toLoadNamespaces = [];

    languages.forEach(lng => {
      let hasAllNamespaces = true;

      namespaces.forEach(ns => {
        const name = `${lng}|${ns}`;

        if (!options.reload && this.store.hasResourceBundle(lng, ns)) {
          this.state[name] = 2; // loaded
        } else if (this.state[name] < 0) ; else if (this.state[name] === 1) {
          if (pending.indexOf(name) < 0) pending.push(name);
        } else {
          this.state[name] = 1; // pending

          hasAllNamespaces = false;

          if (pending.indexOf(name) < 0) pending.push(name);
          if (toLoad.indexOf(name) < 0) toLoad.push(name);
          if (toLoadNamespaces.indexOf(ns) < 0) toLoadNamespaces.push(ns);
        }
      });

      if (!hasAllNamespaces) toLoadLanguages.push(lng);
    });

    if (toLoad.length || pending.length) {
      this.queue.push({
        pending,
        loaded: {},
        errors: [],
        callback,
      });
    }

    return {
      toLoad,
      pending,
      toLoadLanguages,
      toLoadNamespaces,
    };
  }

  loaded(name, err, data) {
    const [lng, ns] = name.split('|');

    if (err) this.emit('failedLoading', lng, ns, err);

    if (data) {
      this.store.addResourceBundle(lng, ns, data);
    }

    // set loaded
    this.state[name] = err ? -1 : 2;

    // consolidated loading done in this run - only emit once for a loaded namespace
    const loaded = {};

    // callback if ready
    this.queue.forEach(q => {
      pushPath(q.loaded, [lng], ns);
      remove(q.pending, name);

      if (err) q.errors.push(err);

      if (q.pending.length === 0 && !q.done) {
        // only do once per loaded -> this.emit('loaded', q.loaded);
        Object.keys(q.loaded).forEach(l => {
          if (!loaded[l]) loaded[l] = [];
          if (q.loaded[l].length) {
            q.loaded[l].forEach(ns => {
              if (loaded[l].indexOf(ns) < 0) loaded[l].push(ns);
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
    this.queue = this.queue.filter(q => !q.done);
  }

  read(lng, ns, fcName, tried = 0, wait = 350, callback) {
    if (!lng.length) return callback(null, {}); // noting to load

    return this.backend[fcName](lng, ns, (err, data) => {
      if (err && data /* = retryFlag */ && tried < 5) {
        setTimeout(() => {
          this.read.call(this, lng, ns, fcName, tried + 1, wait * 2, callback);
        }, wait);
        return;
      }
      callback(err, data);
    });
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

    toLoad.toLoad.forEach(name => {
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
    const [lng, ns] = name.split('|');

    this.read(lng, ns, 'read', undefined, undefined, (err, data) => {
      if (err) this.logger.warn(`${prefix}loading namespace ${ns} for language ${lng} failed`, err);
      if (!err && data)
        this.logger.log(`${prefix}loaded namespace ${ns} for language ${lng}`, data);

      this.loaded(name, err, data);
    });
  }

  saveMissing(languages, namespace, key, fallbackValue, isUpdate, options = {}) {
    if (
      this.services.utils &&
      this.services.utils.hasLoadedNamespace &&
      !this.services.utils.hasLoadedNamespace(namespace)
    ) {
      this.logger.warn(
        `did not save key "${key}" for namespace "${namespace}" as the namespace was not yet loaded`,
        'This means something IS WRONG in your application setup. You access the t function before i18next.init / i18next.loadNamespace / i18next.changeLanguage was done. Wait for the callback or Promise to resolve before accessing it!!!',
      );
      return;
    }

    // ignore non valid keys
    if (key === undefined || key === null || key === '') return;

    if (this.backend && this.backend.create) {
      this.backend.create(languages, namespace, key, fallbackValue, null /* unused callback */, {
        ...options,
        isUpdate,
      });
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

    whitelist: false, // array with whitelisted languages
    nonExplicitWhitelist: false,
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
    returnNull: true, // allows null value as valid translation
    returnEmptyString: true, // allows empty string value as valid translation
    returnObjects: false,
    joinArrays: false, // or string to join array
    returnedObjectHandler: false, // function(key, value, options) triggered if key returns object but returnObjects is set to false
    parseMissingKeyHandler: false, // function(key) parsed a key that was not found in t() before returning
    appendNamespaceToMissingKey: false,
    appendNamespaceToCIMode: false,
    overloadTranslationOptionHandler: function handle(args) {
      var ret = {};
      if (typeof args[1] === 'object') ret = args[1];
      if (typeof args[1] === 'string') ret.defaultValue = args[1];
      if (typeof args[2] === 'string') ret.tDescription = args[2];
      if (typeof args[2] === 'object' || typeof args[3] === 'object') {
        var options = args[3] || args[2];
        Object.keys(options).forEach(function(key) {
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
    },
  };
}

/* eslint no-param-reassign: 0 */
function transformOptions(options) {
  // create namespace object if namespace is passed in as string
  if (typeof options.ns === 'string') options.ns = [options.ns];
  if (typeof options.fallbackLng === 'string') options.fallbackLng = [options.fallbackLng];
  if (typeof options.fallbackNS === 'string') options.fallbackNS = [options.fallbackNS];

  // extend whitelist with cimode
  if (options.whitelist && options.whitelist.indexOf('cimode') < 0) {
    options.whitelist = options.whitelist.concat(['cimode']);
  }

  return options;
}

function noop() { }

class I18n extends EventEmitter {
  constructor(options = {}, callback) {
    super();
    if (isIE10) {
      /* EventEmitter.call(this) */ // <=IE10 fix (unable to call parent constructor)
    }

    this.options = transformOptions(options);
    this.services = {};
    this.logger = baseLogger;
    this.modules = { external: [] };

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
    this.options = { ...get(), ...this.options, ...transformOptions(options) };

    this.format = this.options.interpolation.format;
    if (!callback) callback = noop;

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
        s.languageDetector.init(s, this.options.detection, this.options);
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
    
    if (!this.modules.languageDetector && !this.options.lng) {
      this.logger.warn('init: no languageDetector is used and no lng is defined');
    }

    // append api
    const storeApi = [
      'getResource',
      'addResource',
      'addResources',
      'addResourceBundle',
      'removeResourceBundle',
      'hasResourceBundle',
      'getResourceBundle',
      'getDataByLanguage',
    ];
    storeApi.forEach(fcName => {
      this[fcName] = (...args) => this.store[fcName](...args);
    });

    const deferred = defer();

    const load = () => {
      this.changeLanguage(this.options.lng, (err, t) => {
        this.isInitialized = true;
        this.logger.log('initialized', this.options);
        this.emit('initialized', this.options);

        deferred.resolve(t); // not rejecting on err (as err is only a loading translation failed warning)
        callback(err, t);
      });
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
    let usedLng = typeof language === 'string' ? language : this.language;
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

      this.services.backendConnector.load(toLoad, this.options.ns, usedCallback);
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

    if (module.type === '3rdParty') {
      this.modules.external.push(module);
    }

    return this;
  }

  changeLanguage(lng, callback) {
    this.isLanguageChangingTo = lng;
    const deferred = defer();
    this.emit('languageChanging', lng);

    const done = (err, l) => {
      if (l) {
        this.language = l;
        this.languages = this.services.languageUtils.toResolveHierarchy(l);
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

    const setLng = l => {
      if (l) {
        if (!this.language) {
          this.language = l;
          this.languages = this.services.languageUtils.toResolveHierarchy(l);
        }
        if (!this.translator.language) this.translator.changeLanguage(l);

        if (this.services.languageDetector) this.services.languageDetector.cacheUserLanguage(l);
      }

      this.loadResources(l, err => {
        done(err, l);
      });
    };

    if (!lng && this.services.languageDetector && !this.services.languageDetector.async) {
      setLng(this.services.languageDetector.detect());
    } else if (!lng && this.services.languageDetector && this.services.languageDetector.async) {
      this.services.languageDetector.detect(setLng);
    } else {
      setLng(lng);
    }

    return deferred;
  }

  getFixedT(lng, ns) {
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
      return this.t(key, options);
    };
    if (typeof lng === 'string') {
      fixedT.lng = lng;
    } else {
      fixedT.lngs = lng;
    }
    fixedT.ns = ns;
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

  hasLoadedNamespace(ns) {
    if (!this.isInitialized) {
      this.logger.warn('hasLoadedNamespace: i18next was not initialized', this.languages);
      return false;
    }
    if (!this.languages || !this.languages.length) {
      this.logger.warn('hasLoadedNamespace: i18n.languages were undefined or empty', this.languages);
      return false;
    }

    const lng = this.languages[0];
    const fallbackLng = this.options ? this.options.fallbackLng : false;
    const lastLng = this.languages[this.languages.length - 1];

    // we're in cimode so this shall pass
    if (lng.toLowerCase() === 'cimode') return true;

    const loadNotPending = (l, n) => {
      const loadState = this.services.backendConnector.state[`${l}|${n}`];
      return loadState === -1 || loadState === 2;
    };

    // loaded -> SUCCESS
    if (this.hasResourceBundle(lng, ns)) return true;

    // were not loading at all -> SEMI SUCCESS
    if (!this.services.backendConnector.backend) return true;

    // failed loading ns - but at least fallback is not pending -> SEMI SUCCESS
    if (loadNotPending(lng, ns) && (!fallbackLng || loadNotPending(lastLng, ns))) return true;

    return false;
  }

  loadNamespaces(ns, callback) {
    const deferred = defer();

    if (!this.options.ns) {
      callback && callback();
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
    if (!lng) lng = this.languages && this.languages.length > 0 ? this.languages[0] : this.language;
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
    ];

    return rtlLngs.indexOf(this.services.languageUtils.getLanguagePartFromCode(lng)) >= 0
      ? 'rtl'
      : 'ltr';
  }

  /* eslint class-methods-use-this: 0 */
  createInstance(options = {}, callback) {
    return new I18n(options, callback);
  }

  cloneInstance(options = {}, callback = noop) {
    const mergedOptions = { ...this.options, ...options, ...{ isClone: true } };
    const clone = new I18n(mergedOptions);
    const membersToCopy = ['store', 'services', 'language'];
    membersToCopy.forEach(m => {
      clone[m] = this[m];
    });
    clone.services = { ...this.services };
    clone.services.utils = {
      hasLoadedNamespace: clone.hasLoadedNamespace.bind(clone)
    };
    clone.translator = new Translator(clone.services, clone.options);
    clone.translator.on('*', (event, ...args) => {
      clone.emit(event, ...args);
    });
    clone.init(mergedOptions, callback);
    clone.translator.options = clone.options; // sync options
    clone.translator.backendConnector.services.utils = {
      hasLoadedNamespace: clone.hasLoadedNamespace.bind(clone)
    };

    return clone;
  }
}

const i18next = new I18n();

/* eslint-disable
   @typescript-eslint/no-namespace
 */
const i18n = i18next;

export { i18n };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uLWkxOG4ubWpzIiwic291cmNlcyI6WyJpMThuZXh0L3NyYy9sb2dnZXIuanMiLCJpMThuZXh0L3NyYy9FdmVudEVtaXR0ZXIuanMiLCJpMThuZXh0L3NyYy91dGlscy5qcyIsImkxOG5leHQvc3JjL1Jlc291cmNlU3RvcmUuanMiLCJpMThuZXh0L3NyYy9wb3N0UHJvY2Vzc29yLmpzIiwiaTE4bmV4dC9zcmMvVHJhbnNsYXRvci5qcyIsImkxOG5leHQvc3JjL0xhbmd1YWdlVXRpbHMuanMiLCJpMThuZXh0L3NyYy9QbHVyYWxSZXNvbHZlci5qcyIsImkxOG5leHQvc3JjL0ludGVycG9sYXRvci5qcyIsImkxOG5leHQvc3JjL0JhY2tlbmRDb25uZWN0b3IuanMiLCJpMThuZXh0L3NyYy9kZWZhdWx0cy5qcyIsImkxOG5leHQvc3JjL2kxOG5leHQuanMiLCJpbmRleC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJjb25zdCBjb25zb2xlTG9nZ2VyID0ge1xuICB0eXBlOiAnbG9nZ2VyJyxcblxuICBsb2coYXJncykge1xuICAgIHRoaXMub3V0cHV0KCdsb2cnLCBhcmdzKTtcbiAgfSxcblxuICB3YXJuKGFyZ3MpIHtcbiAgICB0aGlzLm91dHB1dCgnd2FybicsIGFyZ3MpO1xuICB9LFxuXG4gIGVycm9yKGFyZ3MpIHtcbiAgICB0aGlzLm91dHB1dCgnZXJyb3InLCBhcmdzKTtcbiAgfSxcblxuICBvdXRwdXQodHlwZSwgYXJncykge1xuICAgIC8qIGVzbGludCBuby1jb25zb2xlOiAwICovXG4gICAgaWYgKGNvbnNvbGUgJiYgY29uc29sZVt0eXBlXSkgY29uc29sZVt0eXBlXSguLi5hcmdzKTtcbiAgfSxcbn07XG5cbmNsYXNzIExvZ2dlciB7XG4gIGNvbnN0cnVjdG9yKGNvbmNyZXRlTG9nZ2VyLCBvcHRpb25zID0ge30pIHtcbiAgICB0aGlzLmluaXQoY29uY3JldGVMb2dnZXIsIG9wdGlvbnMpO1xuICB9XG5cbiAgaW5pdChjb25jcmV0ZUxvZ2dlciwgb3B0aW9ucyA9IHt9KSB7XG4gICAgdGhpcy5wcmVmaXggPSBvcHRpb25zLnByZWZpeCB8fCAnaTE4bmV4dDonO1xuICAgIHRoaXMubG9nZ2VyID0gY29uY3JldGVMb2dnZXIgfHwgY29uc29sZUxvZ2dlcjtcbiAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuICAgIHRoaXMuZGVidWcgPSBvcHRpb25zLmRlYnVnO1xuICB9XG5cbiAgc2V0RGVidWcoYm9vbCkge1xuICAgIHRoaXMuZGVidWcgPSBib29sO1xuICB9XG5cbiAgbG9nKC4uLmFyZ3MpIHtcbiAgICByZXR1cm4gdGhpcy5mb3J3YXJkKGFyZ3MsICdsb2cnLCAnJywgdHJ1ZSk7XG4gIH1cblxuICB3YXJuKC4uLmFyZ3MpIHtcbiAgICByZXR1cm4gdGhpcy5mb3J3YXJkKGFyZ3MsICd3YXJuJywgJycsIHRydWUpO1xuICB9XG5cbiAgZXJyb3IoLi4uYXJncykge1xuICAgIHJldHVybiB0aGlzLmZvcndhcmQoYXJncywgJ2Vycm9yJywgJycpO1xuICB9XG5cbiAgZGVwcmVjYXRlKC4uLmFyZ3MpIHtcbiAgICByZXR1cm4gdGhpcy5mb3J3YXJkKGFyZ3MsICd3YXJuJywgJ1dBUk5JTkcgREVQUkVDQVRFRDogJywgdHJ1ZSk7XG4gIH1cblxuICBmb3J3YXJkKGFyZ3MsIGx2bCwgcHJlZml4LCBkZWJ1Z09ubHkpIHtcbiAgICBpZiAoZGVidWdPbmx5ICYmICF0aGlzLmRlYnVnKSByZXR1cm4gbnVsbDtcbiAgICBpZiAodHlwZW9mIGFyZ3NbMF0gPT09ICdzdHJpbmcnKSBhcmdzWzBdID0gYCR7cHJlZml4fSR7dGhpcy5wcmVmaXh9ICR7YXJnc1swXX1gO1xuICAgIHJldHVybiB0aGlzLmxvZ2dlcltsdmxdKGFyZ3MpO1xuICB9XG5cbiAgY3JlYXRlKG1vZHVsZU5hbWUpIHtcbiAgICByZXR1cm4gbmV3IExvZ2dlcih0aGlzLmxvZ2dlciwge1xuICAgICAgLi4ueyBwcmVmaXg6IGAke3RoaXMucHJlZml4fToke21vZHVsZU5hbWV9OmAgfSxcbiAgICAgIC4uLnRoaXMub3B0aW9ucyxcbiAgICB9KTtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBuZXcgTG9nZ2VyKCk7XG4iLCJjbGFzcyBFdmVudEVtaXR0ZXIge1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICB0aGlzLm9ic2VydmVycyA9IHt9O1xuICB9XG5cbiAgb24oZXZlbnRzLCBsaXN0ZW5lcikge1xuICAgIGV2ZW50cy5zcGxpdCgnICcpLmZvckVhY2goZXZlbnQgPT4ge1xuICAgICAgdGhpcy5vYnNlcnZlcnNbZXZlbnRdID0gdGhpcy5vYnNlcnZlcnNbZXZlbnRdIHx8IFtdO1xuICAgICAgdGhpcy5vYnNlcnZlcnNbZXZlbnRdLnB1c2gobGlzdGVuZXIpO1xuICAgIH0pO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgb2ZmKGV2ZW50LCBsaXN0ZW5lcikge1xuICAgIGlmICghdGhpcy5vYnNlcnZlcnNbZXZlbnRdKSByZXR1cm47XG4gICAgaWYgKCFsaXN0ZW5lcikge1xuICAgICAgZGVsZXRlIHRoaXMub2JzZXJ2ZXJzW2V2ZW50XTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLm9ic2VydmVyc1tldmVudF0gPSB0aGlzLm9ic2VydmVyc1tldmVudF0uZmlsdGVyKGwgPT4gbCAhPT0gbGlzdGVuZXIpO1xuICB9XG5cbiAgZW1pdChldmVudCwgLi4uYXJncykge1xuICAgIGlmICh0aGlzLm9ic2VydmVyc1tldmVudF0pIHtcbiAgICAgIGNvbnN0IGNsb25lZCA9IFtdLmNvbmNhdCh0aGlzLm9ic2VydmVyc1tldmVudF0pO1xuICAgICAgY2xvbmVkLmZvckVhY2gob2JzZXJ2ZXIgPT4ge1xuICAgICAgICBvYnNlcnZlciguLi5hcmdzKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm9ic2VydmVyc1snKiddKSB7XG4gICAgICBjb25zdCBjbG9uZWQgPSBbXS5jb25jYXQodGhpcy5vYnNlcnZlcnNbJyonXSk7XG4gICAgICBjbG9uZWQuZm9yRWFjaChvYnNlcnZlciA9PiB7XG4gICAgICAgIG9ic2VydmVyLmFwcGx5KG9ic2VydmVyLCBbZXZlbnQsIC4uLmFyZ3NdKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBFdmVudEVtaXR0ZXI7XG4iLCIvLyBodHRwOi8vbGVhLnZlcm91Lm1lLzIwMTYvMTIvcmVzb2x2ZS1wcm9taXNlcy1leHRlcm5hbGx5LXdpdGgtdGhpcy1vbmUtd2VpcmQtdHJpY2svXG5leHBvcnQgZnVuY3Rpb24gZGVmZXIoKSB7XG4gIGxldCByZXM7XG4gIGxldCByZWo7XG5cbiAgY29uc3QgcHJvbWlzZSA9IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICByZXMgPSByZXNvbHZlO1xuICAgIHJlaiA9IHJlamVjdDtcbiAgfSk7XG5cbiAgcHJvbWlzZS5yZXNvbHZlID0gcmVzO1xuICBwcm9taXNlLnJlamVjdCA9IHJlajtcblxuICByZXR1cm4gcHJvbWlzZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG1ha2VTdHJpbmcob2JqZWN0KSB7XG4gIGlmIChvYmplY3QgPT0gbnVsbCkgcmV0dXJuICcnO1xuICAvKiBlc2xpbnQgcHJlZmVyLXRlbXBsYXRlOiAwICovXG4gIHJldHVybiAnJyArIG9iamVjdDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNvcHkoYSwgcywgdCkge1xuICBhLmZvckVhY2gobSA9PiB7XG4gICAgaWYgKHNbbV0pIHRbbV0gPSBzW21dO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gZ2V0TGFzdE9mUGF0aChvYmplY3QsIHBhdGgsIEVtcHR5KSB7XG4gIGZ1bmN0aW9uIGNsZWFuS2V5KGtleSkge1xuICAgIHJldHVybiBrZXkgJiYga2V5LmluZGV4T2YoJyMjIycpID4gLTEgPyBrZXkucmVwbGFjZSgvIyMjL2csICcuJykgOiBrZXk7XG4gIH1cblxuICBmdW5jdGlvbiBjYW5Ob3RUcmF2ZXJzZURlZXBlcigpIHtcbiAgICByZXR1cm4gIW9iamVjdCB8fCB0eXBlb2Ygb2JqZWN0ID09PSAnc3RyaW5nJztcbiAgfVxuXG4gIGNvbnN0IHN0YWNrID0gdHlwZW9mIHBhdGggIT09ICdzdHJpbmcnID8gW10uY29uY2F0KHBhdGgpIDogcGF0aC5zcGxpdCgnLicpO1xuICB3aGlsZSAoc3RhY2subGVuZ3RoID4gMSkge1xuICAgIGlmIChjYW5Ob3RUcmF2ZXJzZURlZXBlcigpKSByZXR1cm4ge307XG5cbiAgICBjb25zdCBrZXkgPSBjbGVhbktleShzdGFjay5zaGlmdCgpKTtcbiAgICBpZiAoIW9iamVjdFtrZXldICYmIEVtcHR5KSBvYmplY3Rba2V5XSA9IG5ldyBFbXB0eSgpO1xuICAgIG9iamVjdCA9IG9iamVjdFtrZXldO1xuICB9XG5cbiAgaWYgKGNhbk5vdFRyYXZlcnNlRGVlcGVyKCkpIHJldHVybiB7fTtcbiAgcmV0dXJuIHtcbiAgICBvYmo6IG9iamVjdCxcbiAgICBrOiBjbGVhbktleShzdGFjay5zaGlmdCgpKSxcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNldFBhdGgob2JqZWN0LCBwYXRoLCBuZXdWYWx1ZSkge1xuICBjb25zdCB7IG9iaiwgayB9ID0gZ2V0TGFzdE9mUGF0aChvYmplY3QsIHBhdGgsIE9iamVjdCk7XG5cbiAgb2JqW2tdID0gbmV3VmFsdWU7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwdXNoUGF0aChvYmplY3QsIHBhdGgsIG5ld1ZhbHVlLCBjb25jYXQpIHtcbiAgY29uc3QgeyBvYmosIGsgfSA9IGdldExhc3RPZlBhdGgob2JqZWN0LCBwYXRoLCBPYmplY3QpO1xuXG4gIG9ialtrXSA9IG9ialtrXSB8fCBbXTtcbiAgaWYgKGNvbmNhdCkgb2JqW2tdID0gb2JqW2tdLmNvbmNhdChuZXdWYWx1ZSk7XG4gIGlmICghY29uY2F0KSBvYmpba10ucHVzaChuZXdWYWx1ZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRQYXRoKG9iamVjdCwgcGF0aCkge1xuICBjb25zdCB7IG9iaiwgayB9ID0gZ2V0TGFzdE9mUGF0aChvYmplY3QsIHBhdGgpO1xuXG4gIGlmICghb2JqKSByZXR1cm4gdW5kZWZpbmVkO1xuICByZXR1cm4gb2JqW2tdO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0UGF0aFdpdGhEZWZhdWx0cyhkYXRhLCBkZWZhdWx0RGF0YSwga2V5KSB7XG4gIGNvbnN0IHZhbHVlID0gZ2V0UGF0aChkYXRhLCBrZXkpO1xuICBpZiAodmFsdWUgIT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiB2YWx1ZTtcbiAgfVxuICAvLyBGYWxsYmFjayB0byBkZWZhdWx0IHZhbHVlc1xuICByZXR1cm4gZ2V0UGF0aChkZWZhdWx0RGF0YSwga2V5KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRlZXBFeHRlbmQodGFyZ2V0LCBzb3VyY2UsIG92ZXJ3cml0ZSkge1xuICAvKiBlc2xpbnQgbm8tcmVzdHJpY3RlZC1zeW50YXg6IDAgKi9cbiAgZm9yIChjb25zdCBwcm9wIGluIHNvdXJjZSkge1xuICAgIGlmIChwcm9wIGluIHRhcmdldCkge1xuICAgICAgLy8gSWYgd2UgcmVhY2hlZCBhIGxlYWYgc3RyaW5nIGluIHRhcmdldCBvciBzb3VyY2UgdGhlbiByZXBsYWNlIHdpdGggc291cmNlIG9yIHNraXAgZGVwZW5kaW5nIG9uIHRoZSAnb3ZlcndyaXRlJyBzd2l0Y2hcbiAgICAgIGlmIChcbiAgICAgICAgdHlwZW9mIHRhcmdldFtwcm9wXSA9PT0gJ3N0cmluZycgfHxcbiAgICAgICAgdGFyZ2V0W3Byb3BdIGluc3RhbmNlb2YgU3RyaW5nIHx8XG4gICAgICAgIHR5cGVvZiBzb3VyY2VbcHJvcF0gPT09ICdzdHJpbmcnIHx8XG4gICAgICAgIHNvdXJjZVtwcm9wXSBpbnN0YW5jZW9mIFN0cmluZ1xuICAgICAgKSB7XG4gICAgICAgIGlmIChvdmVyd3JpdGUpIHRhcmdldFtwcm9wXSA9IHNvdXJjZVtwcm9wXTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGRlZXBFeHRlbmQodGFyZ2V0W3Byb3BdLCBzb3VyY2VbcHJvcF0sIG92ZXJ3cml0ZSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHRhcmdldFtwcm9wXSA9IHNvdXJjZVtwcm9wXTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHRhcmdldDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlZ2V4RXNjYXBlKHN0cikge1xuICAvKiBlc2xpbnQgbm8tdXNlbGVzcy1lc2NhcGU6IDAgKi9cbiAgcmV0dXJuIHN0ci5yZXBsYWNlKC9bXFwtXFxbXFxdXFwvXFx7XFx9XFwoXFwpXFwqXFwrXFw/XFwuXFxcXFxcXlxcJFxcfF0vZywgJ1xcXFwkJicpO1xufVxuXG4vKiBlc2xpbnQtZGlzYWJsZSAqL1xudmFyIF9lbnRpdHlNYXAgPSB7XG4gICcmJzogJyZhbXA7JyxcbiAgJzwnOiAnJmx0OycsXG4gICc+JzogJyZndDsnLFxuICAnXCInOiAnJnF1b3Q7JyxcbiAgXCInXCI6ICcmIzM5OycsXG4gICcvJzogJyYjeDJGOycsXG59O1xuLyogZXNsaW50LWVuYWJsZSAqL1xuXG5leHBvcnQgZnVuY3Rpb24gZXNjYXBlKGRhdGEpIHtcbiAgaWYgKHR5cGVvZiBkYXRhID09PSAnc3RyaW5nJykge1xuICAgIHJldHVybiBkYXRhLnJlcGxhY2UoL1smPD5cIidcXC9dL2csIHMgPT4gX2VudGl0eU1hcFtzXSk7XG4gIH1cblxuICByZXR1cm4gZGF0YTtcbn1cblxuZXhwb3J0IGNvbnN0IGlzSUUxMCA9XG4gIHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnICYmXG4gIHdpbmRvdy5uYXZpZ2F0b3IgJiZcbiAgd2luZG93Lm5hdmlnYXRvci51c2VyQWdlbnQgJiZcbiAgd2luZG93Lm5hdmlnYXRvci51c2VyQWdlbnQuaW5kZXhPZignTVNJRScpID4gLTE7XG4iLCJpbXBvcnQgRXZlbnRFbWl0dGVyIGZyb20gJy4vRXZlbnRFbWl0dGVyLmpzJztcbmltcG9ydCAqIGFzIHV0aWxzIGZyb20gJy4vdXRpbHMuanMnO1xuXG5jbGFzcyBSZXNvdXJjZVN0b3JlIGV4dGVuZHMgRXZlbnRFbWl0dGVyIHtcbiAgY29uc3RydWN0b3IoZGF0YSwgb3B0aW9ucyA9IHsgbnM6IFsndHJhbnNsYXRpb24nXSwgZGVmYXVsdE5TOiAndHJhbnNsYXRpb24nIH0pIHtcbiAgICBzdXBlcigpO1xuICAgIGlmICh1dGlscy5pc0lFMTApIHtcbiAgICAgIEV2ZW50RW1pdHRlci5jYWxsKHRoaXMpOyAvLyA8PUlFMTAgZml4ICh1bmFibGUgdG8gY2FsbCBwYXJlbnQgY29uc3RydWN0b3IpXG4gICAgfVxuXG4gICAgdGhpcy5kYXRhID0gZGF0YSB8fCB7fTtcbiAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuICAgIGlmICh0aGlzLm9wdGlvbnMua2V5U2VwYXJhdG9yID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMub3B0aW9ucy5rZXlTZXBhcmF0b3IgPSAnLic7XG4gICAgfVxuICB9XG5cbiAgYWRkTmFtZXNwYWNlcyhucykge1xuICAgIGlmICh0aGlzLm9wdGlvbnMubnMuaW5kZXhPZihucykgPCAwKSB7XG4gICAgICB0aGlzLm9wdGlvbnMubnMucHVzaChucyk7XG4gICAgfVxuICB9XG5cbiAgcmVtb3ZlTmFtZXNwYWNlcyhucykge1xuICAgIGNvbnN0IGluZGV4ID0gdGhpcy5vcHRpb25zLm5zLmluZGV4T2YobnMpO1xuICAgIGlmIChpbmRleCA+IC0xKSB7XG4gICAgICB0aGlzLm9wdGlvbnMubnMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICB9XG4gIH1cblxuICBnZXRSZXNvdXJjZShsbmcsIG5zLCBrZXksIG9wdGlvbnMgPSB7fSkge1xuICAgIGNvbnN0IGtleVNlcGFyYXRvciA9XG4gICAgICBvcHRpb25zLmtleVNlcGFyYXRvciAhPT0gdW5kZWZpbmVkID8gb3B0aW9ucy5rZXlTZXBhcmF0b3IgOiB0aGlzLm9wdGlvbnMua2V5U2VwYXJhdG9yO1xuXG4gICAgbGV0IHBhdGggPSBbbG5nLCBuc107XG4gICAgaWYgKGtleSAmJiB0eXBlb2Yga2V5ICE9PSAnc3RyaW5nJykgcGF0aCA9IHBhdGguY29uY2F0KGtleSk7XG4gICAgaWYgKGtleSAmJiB0eXBlb2Yga2V5ID09PSAnc3RyaW5nJylcbiAgICAgIHBhdGggPSBwYXRoLmNvbmNhdChrZXlTZXBhcmF0b3IgPyBrZXkuc3BsaXQoa2V5U2VwYXJhdG9yKSA6IGtleSk7XG5cbiAgICBpZiAobG5nLmluZGV4T2YoJy4nKSA+IC0xKSB7XG4gICAgICBwYXRoID0gbG5nLnNwbGl0KCcuJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHV0aWxzLmdldFBhdGgodGhpcy5kYXRhLCBwYXRoKTtcbiAgfVxuXG4gIGFkZFJlc291cmNlKGxuZywgbnMsIGtleSwgdmFsdWUsIG9wdGlvbnMgPSB7IHNpbGVudDogZmFsc2UgfSkge1xuICAgIGxldCBrZXlTZXBhcmF0b3IgPSB0aGlzLm9wdGlvbnMua2V5U2VwYXJhdG9yO1xuICAgIGlmIChrZXlTZXBhcmF0b3IgPT09IHVuZGVmaW5lZCkga2V5U2VwYXJhdG9yID0gJy4nO1xuXG4gICAgbGV0IHBhdGggPSBbbG5nLCBuc107XG4gICAgaWYgKGtleSkgcGF0aCA9IHBhdGguY29uY2F0KGtleVNlcGFyYXRvciA/IGtleS5zcGxpdChrZXlTZXBhcmF0b3IpIDoga2V5KTtcblxuICAgIGlmIChsbmcuaW5kZXhPZignLicpID4gLTEpIHtcbiAgICAgIHBhdGggPSBsbmcuc3BsaXQoJy4nKTtcbiAgICAgIHZhbHVlID0gbnM7XG4gICAgICBucyA9IHBhdGhbMV07XG4gICAgfVxuXG4gICAgdGhpcy5hZGROYW1lc3BhY2VzKG5zKTtcblxuICAgIHV0aWxzLnNldFBhdGgodGhpcy5kYXRhLCBwYXRoLCB2YWx1ZSk7XG5cbiAgICBpZiAoIW9wdGlvbnMuc2lsZW50KSB0aGlzLmVtaXQoJ2FkZGVkJywgbG5nLCBucywga2V5LCB2YWx1ZSk7XG4gIH1cblxuICBhZGRSZXNvdXJjZXMobG5nLCBucywgcmVzb3VyY2VzLCBvcHRpb25zID0geyBzaWxlbnQ6IGZhbHNlIH0pIHtcbiAgICAvKiBlc2xpbnQgbm8tcmVzdHJpY3RlZC1zeW50YXg6IDAgKi9cbiAgICBmb3IgKGNvbnN0IG0gaW4gcmVzb3VyY2VzKSB7XG4gICAgICBpZiAoXG4gICAgICAgIHR5cGVvZiByZXNvdXJjZXNbbV0gPT09ICdzdHJpbmcnIHx8XG4gICAgICAgIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuYXBwbHkocmVzb3VyY2VzW21dKSA9PT0gJ1tvYmplY3QgQXJyYXldJ1xuICAgICAgKVxuICAgICAgICB0aGlzLmFkZFJlc291cmNlKGxuZywgbnMsIG0sIHJlc291cmNlc1ttXSwgeyBzaWxlbnQ6IHRydWUgfSk7XG4gICAgfVxuICAgIGlmICghb3B0aW9ucy5zaWxlbnQpIHRoaXMuZW1pdCgnYWRkZWQnLCBsbmcsIG5zLCByZXNvdXJjZXMpO1xuICB9XG5cbiAgYWRkUmVzb3VyY2VCdW5kbGUobG5nLCBucywgcmVzb3VyY2VzLCBkZWVwLCBvdmVyd3JpdGUsIG9wdGlvbnMgPSB7IHNpbGVudDogZmFsc2UgfSkge1xuICAgIGxldCBwYXRoID0gW2xuZywgbnNdO1xuICAgIGlmIChsbmcuaW5kZXhPZignLicpID4gLTEpIHtcbiAgICAgIHBhdGggPSBsbmcuc3BsaXQoJy4nKTtcbiAgICAgIGRlZXAgPSByZXNvdXJjZXM7XG4gICAgICByZXNvdXJjZXMgPSBucztcbiAgICAgIG5zID0gcGF0aFsxXTtcbiAgICB9XG5cbiAgICB0aGlzLmFkZE5hbWVzcGFjZXMobnMpO1xuXG4gICAgbGV0IHBhY2sgPSB1dGlscy5nZXRQYXRoKHRoaXMuZGF0YSwgcGF0aCkgfHwge307XG5cbiAgICBpZiAoZGVlcCkge1xuICAgICAgdXRpbHMuZGVlcEV4dGVuZChwYWNrLCByZXNvdXJjZXMsIG92ZXJ3cml0ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHBhY2sgPSB7IC4uLnBhY2ssIC4uLnJlc291cmNlcyB9O1xuICAgIH1cblxuICAgIHV0aWxzLnNldFBhdGgodGhpcy5kYXRhLCBwYXRoLCBwYWNrKTtcblxuICAgIGlmICghb3B0aW9ucy5zaWxlbnQpIHRoaXMuZW1pdCgnYWRkZWQnLCBsbmcsIG5zLCByZXNvdXJjZXMpO1xuICB9XG5cbiAgcmVtb3ZlUmVzb3VyY2VCdW5kbGUobG5nLCBucykge1xuICAgIGlmICh0aGlzLmhhc1Jlc291cmNlQnVuZGxlKGxuZywgbnMpKSB7XG4gICAgICBkZWxldGUgdGhpcy5kYXRhW2xuZ11bbnNdO1xuICAgIH1cbiAgICB0aGlzLnJlbW92ZU5hbWVzcGFjZXMobnMpO1xuXG4gICAgdGhpcy5lbWl0KCdyZW1vdmVkJywgbG5nLCBucyk7XG4gIH1cblxuICBoYXNSZXNvdXJjZUJ1bmRsZShsbmcsIG5zKSB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0UmVzb3VyY2UobG5nLCBucykgIT09IHVuZGVmaW5lZDtcbiAgfVxuXG4gIGdldFJlc291cmNlQnVuZGxlKGxuZywgbnMpIHtcbiAgICBpZiAoIW5zKSBucyA9IHRoaXMub3B0aW9ucy5kZWZhdWx0TlM7XG5cbiAgICAvLyBDT01QQVRJQklMSVRZOiByZW1vdmUgZXh0ZW5kIGluIHYyLjEuMFxuICAgIGlmICh0aGlzLm9wdGlvbnMuY29tcGF0aWJpbGl0eUFQSSA9PT0gJ3YxJykgcmV0dXJuIHsgLi4ue30sIC4uLnRoaXMuZ2V0UmVzb3VyY2UobG5nLCBucykgfTtcblxuICAgIHJldHVybiB0aGlzLmdldFJlc291cmNlKGxuZywgbnMpO1xuICB9XG5cbiAgZ2V0RGF0YUJ5TGFuZ3VhZ2UobG5nKSB7XG4gICAgcmV0dXJuIHRoaXMuZGF0YVtsbmddO1xuICB9XG5cbiAgdG9KU09OKCkge1xuICAgIHJldHVybiB0aGlzLmRhdGE7XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgUmVzb3VyY2VTdG9yZTtcbiIsImV4cG9ydCBkZWZhdWx0IHtcbiAgcHJvY2Vzc29yczoge30sXG5cbiAgYWRkUG9zdFByb2Nlc3Nvcihtb2R1bGUpIHtcbiAgICB0aGlzLnByb2Nlc3NvcnNbbW9kdWxlLm5hbWVdID0gbW9kdWxlO1xuICB9LFxuXG4gIGhhbmRsZShwcm9jZXNzb3JzLCB2YWx1ZSwga2V5LCBvcHRpb25zLCB0cmFuc2xhdG9yKSB7XG4gICAgcHJvY2Vzc29ycy5mb3JFYWNoKHByb2Nlc3NvciA9PiB7XG4gICAgICBpZiAodGhpcy5wcm9jZXNzb3JzW3Byb2Nlc3Nvcl0pXG4gICAgICAgIHZhbHVlID0gdGhpcy5wcm9jZXNzb3JzW3Byb2Nlc3Nvcl0ucHJvY2Vzcyh2YWx1ZSwga2V5LCBvcHRpb25zLCB0cmFuc2xhdG9yKTtcbiAgICB9KTtcblxuICAgIHJldHVybiB2YWx1ZTtcbiAgfSxcbn07XG4iLCJpbXBvcnQgYmFzZUxvZ2dlciBmcm9tICcuL2xvZ2dlci5qcyc7XG5pbXBvcnQgRXZlbnRFbWl0dGVyIGZyb20gJy4vRXZlbnRFbWl0dGVyLmpzJztcbmltcG9ydCBwb3N0UHJvY2Vzc29yIGZyb20gJy4vcG9zdFByb2Nlc3Nvci5qcyc7XG5pbXBvcnQgKiBhcyB1dGlscyBmcm9tICcuL3V0aWxzLmpzJztcblxuY29uc3QgY2hlY2tlZExvYWRlZEZvciA9IHt9O1xuXG5jbGFzcyBUcmFuc2xhdG9yIGV4dGVuZHMgRXZlbnRFbWl0dGVyIHtcbiAgY29uc3RydWN0b3Ioc2VydmljZXMsIG9wdGlvbnMgPSB7fSkge1xuICAgIHN1cGVyKCk7XG4gICAgaWYgKHV0aWxzLmlzSUUxMCkge1xuICAgICAgRXZlbnRFbWl0dGVyLmNhbGwodGhpcyk7IC8vIDw9SUUxMCBmaXggKHVuYWJsZSB0byBjYWxsIHBhcmVudCBjb25zdHJ1Y3RvcilcbiAgICB9XG5cbiAgICB1dGlscy5jb3B5KFxuICAgICAgW1xuICAgICAgICAncmVzb3VyY2VTdG9yZScsXG4gICAgICAgICdsYW5ndWFnZVV0aWxzJyxcbiAgICAgICAgJ3BsdXJhbFJlc29sdmVyJyxcbiAgICAgICAgJ2ludGVycG9sYXRvcicsXG4gICAgICAgICdiYWNrZW5kQ29ubmVjdG9yJyxcbiAgICAgICAgJ2kxOG5Gb3JtYXQnLFxuICAgICAgICAndXRpbHMnLFxuICAgICAgXSxcbiAgICAgIHNlcnZpY2VzLFxuICAgICAgdGhpcyxcbiAgICApO1xuXG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcbiAgICBpZiAodGhpcy5vcHRpb25zLmtleVNlcGFyYXRvciA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzLm9wdGlvbnMua2V5U2VwYXJhdG9yID0gJy4nO1xuICAgIH1cblxuICAgIHRoaXMubG9nZ2VyID0gYmFzZUxvZ2dlci5jcmVhdGUoJ3RyYW5zbGF0b3InKTtcbiAgfVxuXG4gIGNoYW5nZUxhbmd1YWdlKGxuZykge1xuICAgIGlmIChsbmcpIHRoaXMubGFuZ3VhZ2UgPSBsbmc7XG4gIH1cblxuICBleGlzdHMoa2V5LCBvcHRpb25zID0geyBpbnRlcnBvbGF0aW9uOiB7fSB9KSB7XG4gICAgY29uc3QgcmVzb2x2ZWQgPSB0aGlzLnJlc29sdmUoa2V5LCBvcHRpb25zKTtcbiAgICByZXR1cm4gcmVzb2x2ZWQgJiYgcmVzb2x2ZWQucmVzICE9PSB1bmRlZmluZWQ7XG4gIH1cblxuICBleHRyYWN0RnJvbUtleShrZXksIG9wdGlvbnMpIHtcbiAgICBsZXQgbnNTZXBhcmF0b3IgPSBvcHRpb25zLm5zU2VwYXJhdG9yIHx8IHRoaXMub3B0aW9ucy5uc1NlcGFyYXRvcjtcbiAgICBpZiAobnNTZXBhcmF0b3IgPT09IHVuZGVmaW5lZCkgbnNTZXBhcmF0b3IgPSAnOic7XG5cbiAgICBjb25zdCBrZXlTZXBhcmF0b3IgPVxuICAgICAgb3B0aW9ucy5rZXlTZXBhcmF0b3IgIT09IHVuZGVmaW5lZCA/IG9wdGlvbnMua2V5U2VwYXJhdG9yIDogdGhpcy5vcHRpb25zLmtleVNlcGFyYXRvcjtcblxuICAgIGxldCBuYW1lc3BhY2VzID0gb3B0aW9ucy5ucyB8fCB0aGlzLm9wdGlvbnMuZGVmYXVsdE5TO1xuICAgIGlmIChuc1NlcGFyYXRvciAmJiBrZXkuaW5kZXhPZihuc1NlcGFyYXRvcikgPiAtMSkge1xuICAgICAgY29uc3QgcGFydHMgPSBrZXkuc3BsaXQobnNTZXBhcmF0b3IpO1xuICAgICAgaWYgKFxuICAgICAgICBuc1NlcGFyYXRvciAhPT0ga2V5U2VwYXJhdG9yIHx8XG4gICAgICAgIChuc1NlcGFyYXRvciA9PT0ga2V5U2VwYXJhdG9yICYmIHRoaXMub3B0aW9ucy5ucy5pbmRleE9mKHBhcnRzWzBdKSA+IC0xKVxuICAgICAgKVxuICAgICAgICBuYW1lc3BhY2VzID0gcGFydHMuc2hpZnQoKTtcbiAgICAgIGtleSA9IHBhcnRzLmpvaW4oa2V5U2VwYXJhdG9yKTtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiBuYW1lc3BhY2VzID09PSAnc3RyaW5nJykgbmFtZXNwYWNlcyA9IFtuYW1lc3BhY2VzXTtcblxuICAgIHJldHVybiB7XG4gICAgICBrZXksXG4gICAgICBuYW1lc3BhY2VzLFxuICAgIH07XG4gIH1cblxuICB0cmFuc2xhdGUoa2V5cywgb3B0aW9ucykge1xuICAgIGlmICh0eXBlb2Ygb3B0aW9ucyAhPT0gJ29iamVjdCcgJiYgdGhpcy5vcHRpb25zLm92ZXJsb2FkVHJhbnNsYXRpb25PcHRpb25IYW5kbGVyKSB7XG4gICAgICAvKiBlc2xpbnQgcHJlZmVyLXJlc3QtcGFyYW1zOiAwICovXG4gICAgICBvcHRpb25zID0gdGhpcy5vcHRpb25zLm92ZXJsb2FkVHJhbnNsYXRpb25PcHRpb25IYW5kbGVyKGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIGlmICghb3B0aW9ucykgb3B0aW9ucyA9IHt9O1xuXG4gICAgLy8gbm9uIHZhbGlkIGtleXMgaGFuZGxpbmdcbiAgICBpZiAoa2V5cyA9PT0gdW5kZWZpbmVkIHx8IGtleXMgPT09IG51bGwgLyogfHwga2V5cyA9PT0gJycqLykgcmV0dXJuICcnO1xuICAgIGlmICghQXJyYXkuaXNBcnJheShrZXlzKSkga2V5cyA9IFtTdHJpbmcoa2V5cyldO1xuXG4gICAgLy8gc2VwYXJhdG9yc1xuICAgIGNvbnN0IGtleVNlcGFyYXRvciA9XG4gICAgICBvcHRpb25zLmtleVNlcGFyYXRvciAhPT0gdW5kZWZpbmVkID8gb3B0aW9ucy5rZXlTZXBhcmF0b3IgOiB0aGlzLm9wdGlvbnMua2V5U2VwYXJhdG9yO1xuXG4gICAgLy8gZ2V0IG5hbWVzcGFjZShzKVxuICAgIGNvbnN0IHsga2V5LCBuYW1lc3BhY2VzIH0gPSB0aGlzLmV4dHJhY3RGcm9tS2V5KGtleXNba2V5cy5sZW5ndGggLSAxXSwgb3B0aW9ucyk7XG4gICAgY29uc3QgbmFtZXNwYWNlID0gbmFtZXNwYWNlc1tuYW1lc3BhY2VzLmxlbmd0aCAtIDFdO1xuXG4gICAgLy8gcmV0dXJuIGtleSBvbiBDSU1vZGVcbiAgICBjb25zdCBsbmcgPSBvcHRpb25zLmxuZyB8fCB0aGlzLmxhbmd1YWdlO1xuICAgIGNvbnN0IGFwcGVuZE5hbWVzcGFjZVRvQ0lNb2RlID1cbiAgICAgIG9wdGlvbnMuYXBwZW5kTmFtZXNwYWNlVG9DSU1vZGUgfHwgdGhpcy5vcHRpb25zLmFwcGVuZE5hbWVzcGFjZVRvQ0lNb2RlO1xuICAgIGlmIChsbmcgJiYgbG5nLnRvTG93ZXJDYXNlKCkgPT09ICdjaW1vZGUnKSB7XG4gICAgICBpZiAoYXBwZW5kTmFtZXNwYWNlVG9DSU1vZGUpIHtcbiAgICAgICAgY29uc3QgbnNTZXBhcmF0b3IgPSBvcHRpb25zLm5zU2VwYXJhdG9yIHx8IHRoaXMub3B0aW9ucy5uc1NlcGFyYXRvcjtcbiAgICAgICAgcmV0dXJuIG5hbWVzcGFjZSArIG5zU2VwYXJhdG9yICsga2V5O1xuICAgICAgfVxuXG4gICAgICByZXR1cm4ga2V5O1xuICAgIH1cblxuICAgIC8vIHJlc29sdmUgZnJvbSBzdG9yZVxuICAgIGNvbnN0IHJlc29sdmVkID0gdGhpcy5yZXNvbHZlKGtleXMsIG9wdGlvbnMpO1xuICAgIGxldCByZXMgPSByZXNvbHZlZCAmJiByZXNvbHZlZC5yZXM7XG4gICAgY29uc3QgcmVzVXNlZEtleSA9IChyZXNvbHZlZCAmJiByZXNvbHZlZC51c2VkS2V5KSB8fCBrZXk7XG4gICAgY29uc3QgcmVzRXhhY3RVc2VkS2V5ID0gKHJlc29sdmVkICYmIHJlc29sdmVkLmV4YWN0VXNlZEtleSkgfHwga2V5O1xuXG4gICAgY29uc3QgcmVzVHlwZSA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuYXBwbHkocmVzKTtcbiAgICBjb25zdCBub09iamVjdCA9IFsnW29iamVjdCBOdW1iZXJdJywgJ1tvYmplY3QgRnVuY3Rpb25dJywgJ1tvYmplY3QgUmVnRXhwXSddO1xuICAgIGNvbnN0IGpvaW5BcnJheXMgPVxuICAgICAgb3B0aW9ucy5qb2luQXJyYXlzICE9PSB1bmRlZmluZWQgPyBvcHRpb25zLmpvaW5BcnJheXMgOiB0aGlzLm9wdGlvbnMuam9pbkFycmF5cztcblxuICAgIC8vIG9iamVjdFxuICAgIGNvbnN0IGhhbmRsZUFzT2JqZWN0SW5JMThuRm9ybWF0ID0gIXRoaXMuaTE4bkZvcm1hdCB8fCB0aGlzLmkxOG5Gb3JtYXQuaGFuZGxlQXNPYmplY3Q7XG4gICAgY29uc3QgaGFuZGxlQXNPYmplY3QgPVxuICAgICAgdHlwZW9mIHJlcyAhPT0gJ3N0cmluZycgJiYgdHlwZW9mIHJlcyAhPT0gJ2Jvb2xlYW4nICYmIHR5cGVvZiByZXMgIT09ICdudW1iZXInO1xuICAgIGlmIChcbiAgICAgIGhhbmRsZUFzT2JqZWN0SW5JMThuRm9ybWF0ICYmXG4gICAgICByZXMgJiZcbiAgICAgIGhhbmRsZUFzT2JqZWN0ICYmXG4gICAgICBub09iamVjdC5pbmRleE9mKHJlc1R5cGUpIDwgMCAmJlxuICAgICAgISh0eXBlb2Ygam9pbkFycmF5cyA9PT0gJ3N0cmluZycgJiYgcmVzVHlwZSA9PT0gJ1tvYmplY3QgQXJyYXldJylcbiAgICApIHtcbiAgICAgIGlmICghb3B0aW9ucy5yZXR1cm5PYmplY3RzICYmICF0aGlzLm9wdGlvbnMucmV0dXJuT2JqZWN0cykge1xuICAgICAgICB0aGlzLmxvZ2dlci53YXJuKCdhY2Nlc3NpbmcgYW4gb2JqZWN0IC0gYnV0IHJldHVybk9iamVjdHMgb3B0aW9ucyBpcyBub3QgZW5hYmxlZCEnKTtcbiAgICAgICAgcmV0dXJuIHRoaXMub3B0aW9ucy5yZXR1cm5lZE9iamVjdEhhbmRsZXJcbiAgICAgICAgICA/IHRoaXMub3B0aW9ucy5yZXR1cm5lZE9iamVjdEhhbmRsZXIocmVzVXNlZEtleSwgcmVzLCBvcHRpb25zKVxuICAgICAgICAgIDogYGtleSAnJHtrZXl9ICgke3RoaXMubGFuZ3VhZ2V9KScgcmV0dXJuZWQgYW4gb2JqZWN0IGluc3RlYWQgb2Ygc3RyaW5nLmA7XG4gICAgICB9XG5cbiAgICAgIC8vIGlmIHdlIGdvdCBhIHNlcGFyYXRvciB3ZSBsb29wIG92ZXIgY2hpbGRyZW4gLSBlbHNlIHdlIGp1c3QgcmV0dXJuIG9iamVjdCBhcyBpc1xuICAgICAgLy8gYXMgaGF2aW5nIGl0IHNldCB0byBmYWxzZSBtZWFucyBubyBoaWVyYXJjaHkgc28gbm8gbG9va3VwIGZvciBuZXN0ZWQgdmFsdWVzXG4gICAgICBpZiAoa2V5U2VwYXJhdG9yKSB7XG4gICAgICAgIGNvbnN0IHJlc1R5cGVJc0FycmF5ID0gcmVzVHlwZSA9PT0gJ1tvYmplY3QgQXJyYXldJztcbiAgICAgICAgY29uc3QgY29weSA9IHJlc1R5cGVJc0FycmF5ID8gW10gOiB7fTsgLy8gYXBwbHkgY2hpbGQgdHJhbnNsYXRpb24gb24gYSBjb3B5XG5cbiAgICAgICAgLyogZXNsaW50IG5vLXJlc3RyaWN0ZWQtc3ludGF4OiAwICovXG4gICAgICAgIGxldCBuZXdLZXlUb1VzZSA9IHJlc1R5cGVJc0FycmF5ID8gcmVzRXhhY3RVc2VkS2V5IDogcmVzVXNlZEtleTtcbiAgICAgICAgZm9yIChjb25zdCBtIGluIHJlcykge1xuICAgICAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwocmVzLCBtKSkge1xuICAgICAgICAgICAgY29uc3QgZGVlcEtleSA9IGAke25ld0tleVRvVXNlfSR7a2V5U2VwYXJhdG9yfSR7bX1gO1xuICAgICAgICAgICAgY29weVttXSA9IHRoaXMudHJhbnNsYXRlKGRlZXBLZXksIHtcbiAgICAgICAgICAgICAgLi4ub3B0aW9ucyxcbiAgICAgICAgICAgICAgLi4ueyBqb2luQXJyYXlzOiBmYWxzZSwgbnM6IG5hbWVzcGFjZXMgfSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKGNvcHlbbV0gPT09IGRlZXBLZXkpIGNvcHlbbV0gPSByZXNbbV07IC8vIGlmIG5vdGhpbmcgZm91bmQgdXNlIG9yZ2luYWwgdmFsdWUgYXMgZmFsbGJhY2tcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmVzID0gY29weTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKFxuICAgICAgaGFuZGxlQXNPYmplY3RJbkkxOG5Gb3JtYXQgJiZcbiAgICAgIHR5cGVvZiBqb2luQXJyYXlzID09PSAnc3RyaW5nJyAmJlxuICAgICAgcmVzVHlwZSA9PT0gJ1tvYmplY3QgQXJyYXldJ1xuICAgICkge1xuICAgICAgLy8gYXJyYXkgc3BlY2lhbCB0cmVhdG1lbnRcbiAgICAgIHJlcyA9IHJlcy5qb2luKGpvaW5BcnJheXMpO1xuICAgICAgaWYgKHJlcykgcmVzID0gdGhpcy5leHRlbmRUcmFuc2xhdGlvbihyZXMsIGtleXMsIG9wdGlvbnMpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBzdHJpbmcsIGVtcHR5IG9yIG51bGxcbiAgICAgIGxldCB1c2VkRGVmYXVsdCA9IGZhbHNlO1xuICAgICAgbGV0IHVzZWRLZXkgPSBmYWxzZTtcblxuICAgICAgLy8gZmFsbGJhY2sgdmFsdWVcbiAgICAgIGlmICghdGhpcy5pc1ZhbGlkTG9va3VwKHJlcykgJiYgb3B0aW9ucy5kZWZhdWx0VmFsdWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICB1c2VkRGVmYXVsdCA9IHRydWU7XG5cbiAgICAgICAgaWYgKG9wdGlvbnMuY291bnQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGNvbnN0IHN1ZmZpeCA9IHRoaXMucGx1cmFsUmVzb2x2ZXIuZ2V0U3VmZml4KGxuZywgb3B0aW9ucy5jb3VudCk7XG4gICAgICAgICAgcmVzID0gb3B0aW9uc1tgZGVmYXVsdFZhbHVlJHtzdWZmaXh9YF07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFyZXMpIHJlcyA9IG9wdGlvbnMuZGVmYXVsdFZhbHVlO1xuICAgICAgfVxuICAgICAgaWYgKCF0aGlzLmlzVmFsaWRMb29rdXAocmVzKSkge1xuICAgICAgICB1c2VkS2V5ID0gdHJ1ZTtcbiAgICAgICAgcmVzID0ga2V5O1xuICAgICAgfVxuXG4gICAgICAvLyBzYXZlIG1pc3NpbmdcbiAgICAgIGNvbnN0IHVwZGF0ZU1pc3NpbmcgPVxuICAgICAgICBvcHRpb25zLmRlZmF1bHRWYWx1ZSAmJiBvcHRpb25zLmRlZmF1bHRWYWx1ZSAhPT0gcmVzICYmIHRoaXMub3B0aW9ucy51cGRhdGVNaXNzaW5nO1xuICAgICAgaWYgKHVzZWRLZXkgfHwgdXNlZERlZmF1bHQgfHwgdXBkYXRlTWlzc2luZykge1xuICAgICAgICB0aGlzLmxvZ2dlci5sb2coXG4gICAgICAgICAgdXBkYXRlTWlzc2luZyA/ICd1cGRhdGVLZXknIDogJ21pc3NpbmdLZXknLFxuICAgICAgICAgIGxuZyxcbiAgICAgICAgICBuYW1lc3BhY2UsXG4gICAgICAgICAga2V5LFxuICAgICAgICAgIHVwZGF0ZU1pc3NpbmcgPyBvcHRpb25zLmRlZmF1bHRWYWx1ZSA6IHJlcyxcbiAgICAgICAgKTtcblxuICAgICAgICBsZXQgbG5ncyA9IFtdO1xuICAgICAgICBjb25zdCBmYWxsYmFja0xuZ3MgPSB0aGlzLmxhbmd1YWdlVXRpbHMuZ2V0RmFsbGJhY2tDb2RlcyhcbiAgICAgICAgICB0aGlzLm9wdGlvbnMuZmFsbGJhY2tMbmcsXG4gICAgICAgICAgb3B0aW9ucy5sbmcgfHwgdGhpcy5sYW5ndWFnZSxcbiAgICAgICAgKTtcbiAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5zYXZlTWlzc2luZ1RvID09PSAnZmFsbGJhY2snICYmIGZhbGxiYWNrTG5ncyAmJiBmYWxsYmFja0xuZ3NbMF0pIHtcbiAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGZhbGxiYWNrTG5ncy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgbG5ncy5wdXNoKGZhbGxiYWNrTG5nc1tpXSk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKHRoaXMub3B0aW9ucy5zYXZlTWlzc2luZ1RvID09PSAnYWxsJykge1xuICAgICAgICAgIGxuZ3MgPSB0aGlzLmxhbmd1YWdlVXRpbHMudG9SZXNvbHZlSGllcmFyY2h5KG9wdGlvbnMubG5nIHx8IHRoaXMubGFuZ3VhZ2UpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGxuZ3MucHVzaChvcHRpb25zLmxuZyB8fCB0aGlzLmxhbmd1YWdlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHNlbmQgPSAobCwgaykgPT4ge1xuICAgICAgICAgIGlmICh0aGlzLm9wdGlvbnMubWlzc2luZ0tleUhhbmRsZXIpIHtcbiAgICAgICAgICAgIHRoaXMub3B0aW9ucy5taXNzaW5nS2V5SGFuZGxlcihcbiAgICAgICAgICAgICAgbCxcbiAgICAgICAgICAgICAgbmFtZXNwYWNlLFxuICAgICAgICAgICAgICBrLFxuICAgICAgICAgICAgICB1cGRhdGVNaXNzaW5nID8gb3B0aW9ucy5kZWZhdWx0VmFsdWUgOiByZXMsXG4gICAgICAgICAgICAgIHVwZGF0ZU1pc3NpbmcsXG4gICAgICAgICAgICAgIG9wdGlvbnMsXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH0gZWxzZSBpZiAodGhpcy5iYWNrZW5kQ29ubmVjdG9yICYmIHRoaXMuYmFja2VuZENvbm5lY3Rvci5zYXZlTWlzc2luZykge1xuICAgICAgICAgICAgdGhpcy5iYWNrZW5kQ29ubmVjdG9yLnNhdmVNaXNzaW5nKFxuICAgICAgICAgICAgICBsLFxuICAgICAgICAgICAgICBuYW1lc3BhY2UsXG4gICAgICAgICAgICAgIGssXG4gICAgICAgICAgICAgIHVwZGF0ZU1pc3NpbmcgPyBvcHRpb25zLmRlZmF1bHRWYWx1ZSA6IHJlcyxcbiAgICAgICAgICAgICAgdXBkYXRlTWlzc2luZyxcbiAgICAgICAgICAgICAgb3B0aW9ucyxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHRoaXMuZW1pdCgnbWlzc2luZ0tleScsIGwsIG5hbWVzcGFjZSwgaywgcmVzKTtcbiAgICAgICAgfTtcblxuICAgICAgICBpZiAodGhpcy5vcHRpb25zLnNhdmVNaXNzaW5nKSB7XG4gICAgICAgICAgY29uc3QgbmVlZHNQbHVyYWxIYW5kbGluZyA9XG4gICAgICAgICAgICBvcHRpb25zLmNvdW50ICE9PSB1bmRlZmluZWQgJiYgdHlwZW9mIG9wdGlvbnMuY291bnQgIT09ICdzdHJpbmcnO1xuICAgICAgICAgIGlmICh0aGlzLm9wdGlvbnMuc2F2ZU1pc3NpbmdQbHVyYWxzICYmIG5lZWRzUGx1cmFsSGFuZGxpbmcpIHtcbiAgICAgICAgICAgIGxuZ3MuZm9yRWFjaChsID0+IHtcbiAgICAgICAgICAgICAgY29uc3QgcGx1cmFscyA9IHRoaXMucGx1cmFsUmVzb2x2ZXIuZ2V0UGx1cmFsRm9ybXNPZktleShsLCBrZXkpO1xuXG4gICAgICAgICAgICAgIHBsdXJhbHMuZm9yRWFjaChwID0+IHNlbmQoW2xdLCBwKSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc2VuZChsbmdzLCBrZXkpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBleHRlbmRcbiAgICAgIHJlcyA9IHRoaXMuZXh0ZW5kVHJhbnNsYXRpb24ocmVzLCBrZXlzLCBvcHRpb25zLCByZXNvbHZlZCk7XG5cbiAgICAgIC8vIGFwcGVuZCBuYW1lc3BhY2UgaWYgc3RpbGwga2V5XG4gICAgICBpZiAodXNlZEtleSAmJiByZXMgPT09IGtleSAmJiB0aGlzLm9wdGlvbnMuYXBwZW5kTmFtZXNwYWNlVG9NaXNzaW5nS2V5KVxuICAgICAgICByZXMgPSBgJHtuYW1lc3BhY2V9OiR7a2V5fWA7XG5cbiAgICAgIC8vIHBhcnNlTWlzc2luZ0tleUhhbmRsZXJcbiAgICAgIGlmICh1c2VkS2V5ICYmIHRoaXMub3B0aW9ucy5wYXJzZU1pc3NpbmdLZXlIYW5kbGVyKVxuICAgICAgICByZXMgPSB0aGlzLm9wdGlvbnMucGFyc2VNaXNzaW5nS2V5SGFuZGxlcihyZXMpO1xuICAgIH1cblxuICAgIC8vIHJldHVyblxuICAgIHJldHVybiByZXM7XG4gIH1cblxuICBleHRlbmRUcmFuc2xhdGlvbihyZXMsIGtleSwgb3B0aW9ucywgcmVzb2x2ZWQpIHtcbiAgICBpZiAodGhpcy5pMThuRm9ybWF0ICYmIHRoaXMuaTE4bkZvcm1hdC5wYXJzZSkge1xuICAgICAgcmVzID0gdGhpcy5pMThuRm9ybWF0LnBhcnNlKFxuICAgICAgICByZXMsXG4gICAgICAgIG9wdGlvbnMsXG4gICAgICAgIHJlc29sdmVkLnVzZWRMbmcsXG4gICAgICAgIHJlc29sdmVkLnVzZWROUyxcbiAgICAgICAgcmVzb2x2ZWQudXNlZEtleSxcbiAgICAgICAgeyByZXNvbHZlZCB9LFxuICAgICAgKTtcbiAgICB9IGVsc2UgaWYgKCFvcHRpb25zLnNraXBJbnRlcnBvbGF0aW9uKSB7XG4gICAgICAvLyBpMThuZXh0LnBhcnNpbmdcbiAgICAgIGlmIChvcHRpb25zLmludGVycG9sYXRpb24pXG4gICAgICAgIHRoaXMuaW50ZXJwb2xhdG9yLmluaXQoe1xuICAgICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICAgICAgLi4ueyBpbnRlcnBvbGF0aW9uOiB7IC4uLnRoaXMub3B0aW9ucy5pbnRlcnBvbGF0aW9uLCAuLi5vcHRpb25zLmludGVycG9sYXRpb24gfSB9LFxuICAgICAgICB9KTtcblxuICAgICAgLy8gaW50ZXJwb2xhdGVcbiAgICAgIGxldCBkYXRhID0gb3B0aW9ucy5yZXBsYWNlICYmIHR5cGVvZiBvcHRpb25zLnJlcGxhY2UgIT09ICdzdHJpbmcnID8gb3B0aW9ucy5yZXBsYWNlIDogb3B0aW9ucztcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMuaW50ZXJwb2xhdGlvbi5kZWZhdWx0VmFyaWFibGVzKVxuICAgICAgICBkYXRhID0geyAuLi50aGlzLm9wdGlvbnMuaW50ZXJwb2xhdGlvbi5kZWZhdWx0VmFyaWFibGVzLCAuLi5kYXRhIH07XG4gICAgICByZXMgPSB0aGlzLmludGVycG9sYXRvci5pbnRlcnBvbGF0ZShyZXMsIGRhdGEsIG9wdGlvbnMubG5nIHx8IHRoaXMubGFuZ3VhZ2UsIG9wdGlvbnMpO1xuXG4gICAgICAvLyBuZXN0aW5nXG4gICAgICBpZiAob3B0aW9ucy5uZXN0ICE9PSBmYWxzZSlcbiAgICAgICAgcmVzID0gdGhpcy5pbnRlcnBvbGF0b3IubmVzdChyZXMsICguLi5hcmdzKSA9PiB0aGlzLnRyYW5zbGF0ZSguLi5hcmdzKSwgb3B0aW9ucyk7XG5cbiAgICAgIGlmIChvcHRpb25zLmludGVycG9sYXRpb24pIHRoaXMuaW50ZXJwb2xhdG9yLnJlc2V0KCk7XG4gICAgfVxuXG4gICAgLy8gcG9zdCBwcm9jZXNzXG4gICAgY29uc3QgcG9zdFByb2Nlc3MgPSBvcHRpb25zLnBvc3RQcm9jZXNzIHx8IHRoaXMub3B0aW9ucy5wb3N0UHJvY2VzcztcbiAgICBjb25zdCBwb3N0UHJvY2Vzc29yTmFtZXMgPSB0eXBlb2YgcG9zdFByb2Nlc3MgPT09ICdzdHJpbmcnID8gW3Bvc3RQcm9jZXNzXSA6IHBvc3RQcm9jZXNzO1xuXG4gICAgaWYgKFxuICAgICAgcmVzICE9PSB1bmRlZmluZWQgJiZcbiAgICAgIHJlcyAhPT0gbnVsbCAmJlxuICAgICAgcG9zdFByb2Nlc3Nvck5hbWVzICYmXG4gICAgICBwb3N0UHJvY2Vzc29yTmFtZXMubGVuZ3RoICYmXG4gICAgICBvcHRpb25zLmFwcGx5UG9zdFByb2Nlc3NvciAhPT0gZmFsc2VcbiAgICApIHtcbiAgICAgIHJlcyA9IHBvc3RQcm9jZXNzb3IuaGFuZGxlKFxuICAgICAgICBwb3N0UHJvY2Vzc29yTmFtZXMsXG4gICAgICAgIHJlcyxcbiAgICAgICAga2V5LFxuICAgICAgICB0aGlzLm9wdGlvbnMgJiYgdGhpcy5vcHRpb25zLnBvc3RQcm9jZXNzUGFzc1Jlc29sdmVkXG4gICAgICAgICAgPyB7IGkxOG5SZXNvbHZlZDogcmVzb2x2ZWQsIC4uLm9wdGlvbnMgfVxuICAgICAgICAgIDogb3B0aW9ucyxcbiAgICAgICAgdGhpcyxcbiAgICAgICk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlcztcbiAgfVxuXG4gIHJlc29sdmUoa2V5cywgb3B0aW9ucyA9IHt9KSB7XG4gICAgbGV0IGZvdW5kO1xuICAgIGxldCB1c2VkS2V5OyAvLyBwbGFpbiBrZXlcbiAgICBsZXQgZXhhY3RVc2VkS2V5OyAvLyBrZXkgd2l0aCBjb250ZXh0IC8gcGx1cmFsXG4gICAgbGV0IHVzZWRMbmc7XG4gICAgbGV0IHVzZWROUztcblxuICAgIGlmICh0eXBlb2Yga2V5cyA9PT0gJ3N0cmluZycpIGtleXMgPSBba2V5c107XG5cbiAgICAvLyBmb3JFYWNoIHBvc3NpYmxlIGtleVxuICAgIGtleXMuZm9yRWFjaChrID0+IHtcbiAgICAgIGlmICh0aGlzLmlzVmFsaWRMb29rdXAoZm91bmQpKSByZXR1cm47XG4gICAgICBjb25zdCBleHRyYWN0ZWQgPSB0aGlzLmV4dHJhY3RGcm9tS2V5KGssIG9wdGlvbnMpO1xuICAgICAgY29uc3Qga2V5ID0gZXh0cmFjdGVkLmtleTtcbiAgICAgIHVzZWRLZXkgPSBrZXk7XG4gICAgICBsZXQgbmFtZXNwYWNlcyA9IGV4dHJhY3RlZC5uYW1lc3BhY2VzO1xuICAgICAgaWYgKHRoaXMub3B0aW9ucy5mYWxsYmFja05TKSBuYW1lc3BhY2VzID0gbmFtZXNwYWNlcy5jb25jYXQodGhpcy5vcHRpb25zLmZhbGxiYWNrTlMpO1xuXG4gICAgICBjb25zdCBuZWVkc1BsdXJhbEhhbmRsaW5nID0gb3B0aW9ucy5jb3VudCAhPT0gdW5kZWZpbmVkICYmIHR5cGVvZiBvcHRpb25zLmNvdW50ICE9PSAnc3RyaW5nJztcbiAgICAgIGNvbnN0IG5lZWRzQ29udGV4dEhhbmRsaW5nID1cbiAgICAgICAgb3B0aW9ucy5jb250ZXh0ICE9PSB1bmRlZmluZWQgJiZcbiAgICAgICAgdHlwZW9mIG9wdGlvbnMuY29udGV4dCA9PT0gJ3N0cmluZycgJiZcbiAgICAgICAgb3B0aW9ucy5jb250ZXh0ICE9PSAnJztcblxuICAgICAgY29uc3QgY29kZXMgPSBvcHRpb25zLmxuZ3NcbiAgICAgICAgPyBvcHRpb25zLmxuZ3NcbiAgICAgICAgOiB0aGlzLmxhbmd1YWdlVXRpbHMudG9SZXNvbHZlSGllcmFyY2h5KG9wdGlvbnMubG5nIHx8IHRoaXMubGFuZ3VhZ2UsIG9wdGlvbnMuZmFsbGJhY2tMbmcpO1xuXG4gICAgICBuYW1lc3BhY2VzLmZvckVhY2gobnMgPT4ge1xuICAgICAgICBpZiAodGhpcy5pc1ZhbGlkTG9va3VwKGZvdW5kKSkgcmV0dXJuO1xuICAgICAgICB1c2VkTlMgPSBucztcblxuICAgICAgICBpZiAoXG4gICAgICAgICAgIWNoZWNrZWRMb2FkZWRGb3JbYCR7Y29kZXNbMF19LSR7bnN9YF0gJiZcbiAgICAgICAgICB0aGlzLnV0aWxzICYmXG4gICAgICAgICAgdGhpcy51dGlscy5oYXNMb2FkZWROYW1lc3BhY2UgJiZcbiAgICAgICAgICAhdGhpcy51dGlscy5oYXNMb2FkZWROYW1lc3BhY2UodXNlZE5TKVxuICAgICAgICApIHtcbiAgICAgICAgICBjaGVja2VkTG9hZGVkRm9yW2Ake2NvZGVzWzBdfS0ke25zfWBdID0gdHJ1ZTtcbiAgICAgICAgICB0aGlzLmxvZ2dlci53YXJuKFxuICAgICAgICAgICAgYGtleSBcIiR7dXNlZEtleX1cIiBmb3IgbmFtZXNwYWNlIFwiJHt1c2VkTlN9XCIgZm9yIGxhbmd1YWdlcyBcIiR7Y29kZXMuam9pbihcbiAgICAgICAgICAgICAgJywgJyxcbiAgICAgICAgICAgICl9XCIgd29uJ3QgZ2V0IHJlc29sdmVkIGFzIG5hbWVzcGFjZSB3YXMgbm90IHlldCBsb2FkZWRgLFxuICAgICAgICAgICAgJ1RoaXMgbWVhbnMgc29tZXRoaW5nIElTIFdST05HIGluIHlvdXIgYXBwbGljYXRpb24gc2V0dXAuIFlvdSBhY2Nlc3MgdGhlIHQgZnVuY3Rpb24gYmVmb3JlIGkxOG5leHQuaW5pdCAvIGkxOG5leHQubG9hZE5hbWVzcGFjZSAvIGkxOG5leHQuY2hhbmdlTGFuZ3VhZ2Ugd2FzIGRvbmUuIFdhaXQgZm9yIHRoZSBjYWxsYmFjayBvciBQcm9taXNlIHRvIHJlc29sdmUgYmVmb3JlIGFjY2Vzc2luZyBpdCEhIScsXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvZGVzLmZvckVhY2goY29kZSA9PiB7XG4gICAgICAgICAgaWYgKHRoaXMuaXNWYWxpZExvb2t1cChmb3VuZCkpIHJldHVybjtcbiAgICAgICAgICB1c2VkTG5nID0gY29kZTtcblxuICAgICAgICAgIGxldCBmaW5hbEtleSA9IGtleTtcbiAgICAgICAgICBjb25zdCBmaW5hbEtleXMgPSBbZmluYWxLZXldO1xuXG4gICAgICAgICAgaWYgKHRoaXMuaTE4bkZvcm1hdCAmJiB0aGlzLmkxOG5Gb3JtYXQuYWRkTG9va3VwS2V5cykge1xuICAgICAgICAgICAgdGhpcy5pMThuRm9ybWF0LmFkZExvb2t1cEtleXMoZmluYWxLZXlzLCBrZXksIGNvZGUsIG5zLCBvcHRpb25zKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbGV0IHBsdXJhbFN1ZmZpeDtcbiAgICAgICAgICAgIGlmIChuZWVkc1BsdXJhbEhhbmRsaW5nKVxuICAgICAgICAgICAgICBwbHVyYWxTdWZmaXggPSB0aGlzLnBsdXJhbFJlc29sdmVyLmdldFN1ZmZpeChjb2RlLCBvcHRpb25zLmNvdW50KTtcblxuICAgICAgICAgICAgLy8gZmFsbGJhY2sgZm9yIHBsdXJhbCBpZiBjb250ZXh0IG5vdCBmb3VuZFxuICAgICAgICAgICAgaWYgKG5lZWRzUGx1cmFsSGFuZGxpbmcgJiYgbmVlZHNDb250ZXh0SGFuZGxpbmcpXG4gICAgICAgICAgICAgIGZpbmFsS2V5cy5wdXNoKGZpbmFsS2V5ICsgcGx1cmFsU3VmZml4KTtcblxuICAgICAgICAgICAgLy8gZ2V0IGtleSBmb3IgY29udGV4dCBpZiBuZWVkZWRcbiAgICAgICAgICAgIGlmIChuZWVkc0NvbnRleHRIYW5kbGluZylcbiAgICAgICAgICAgICAgZmluYWxLZXlzLnB1c2goKGZpbmFsS2V5ICs9IGAke3RoaXMub3B0aW9ucy5jb250ZXh0U2VwYXJhdG9yfSR7b3B0aW9ucy5jb250ZXh0fWApKTtcblxuICAgICAgICAgICAgLy8gZ2V0IGtleSBmb3IgcGx1cmFsIGlmIG5lZWRlZFxuICAgICAgICAgICAgaWYgKG5lZWRzUGx1cmFsSGFuZGxpbmcpIGZpbmFsS2V5cy5wdXNoKChmaW5hbEtleSArPSBwbHVyYWxTdWZmaXgpKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBpdGVyYXRlIG92ZXIgZmluYWxLZXlzIHN0YXJ0aW5nIHdpdGggbW9zdCBzcGVjaWZpYyBwbHVyYWxrZXkgKC0+IGNvbnRleHRrZXkgb25seSkgLT4gc2luZ3VsYXJrZXkgb25seVxuICAgICAgICAgIGxldCBwb3NzaWJsZUtleTtcbiAgICAgICAgICAvKiBlc2xpbnQgbm8tY29uZC1hc3NpZ246IDAgKi9cbiAgICAgICAgICB3aGlsZSAoKHBvc3NpYmxlS2V5ID0gZmluYWxLZXlzLnBvcCgpKSkge1xuICAgICAgICAgICAgaWYgKCF0aGlzLmlzVmFsaWRMb29rdXAoZm91bmQpKSB7XG4gICAgICAgICAgICAgIGV4YWN0VXNlZEtleSA9IHBvc3NpYmxlS2V5O1xuICAgICAgICAgICAgICBmb3VuZCA9IHRoaXMuZ2V0UmVzb3VyY2UoY29kZSwgbnMsIHBvc3NpYmxlS2V5LCBvcHRpb25zKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4geyByZXM6IGZvdW5kLCB1c2VkS2V5LCBleGFjdFVzZWRLZXksIHVzZWRMbmcsIHVzZWROUyB9O1xuICB9XG5cbiAgaXNWYWxpZExvb2t1cChyZXMpIHtcbiAgICByZXR1cm4gKFxuICAgICAgcmVzICE9PSB1bmRlZmluZWQgJiZcbiAgICAgICEoIXRoaXMub3B0aW9ucy5yZXR1cm5OdWxsICYmIHJlcyA9PT0gbnVsbCkgJiZcbiAgICAgICEoIXRoaXMub3B0aW9ucy5yZXR1cm5FbXB0eVN0cmluZyAmJiByZXMgPT09ICcnKVxuICAgICk7XG4gIH1cblxuICBnZXRSZXNvdXJjZShjb2RlLCBucywga2V5LCBvcHRpb25zID0ge30pIHtcbiAgICBpZiAodGhpcy5pMThuRm9ybWF0ICYmIHRoaXMuaTE4bkZvcm1hdC5nZXRSZXNvdXJjZSlcbiAgICAgIHJldHVybiB0aGlzLmkxOG5Gb3JtYXQuZ2V0UmVzb3VyY2UoY29kZSwgbnMsIGtleSwgb3B0aW9ucyk7XG4gICAgcmV0dXJuIHRoaXMucmVzb3VyY2VTdG9yZS5nZXRSZXNvdXJjZShjb2RlLCBucywga2V5LCBvcHRpb25zKTtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBUcmFuc2xhdG9yO1xuIiwiaW1wb3J0IGJhc2VMb2dnZXIgZnJvbSAnLi9sb2dnZXIuanMnO1xuXG5mdW5jdGlvbiBjYXBpdGFsaXplKHN0cmluZykge1xuICByZXR1cm4gc3RyaW5nLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgc3RyaW5nLnNsaWNlKDEpO1xufVxuXG5jbGFzcyBMYW5ndWFnZVV0aWwge1xuICBjb25zdHJ1Y3RvcihvcHRpb25zKSB7XG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcblxuICAgIHRoaXMud2hpdGVsaXN0ID0gdGhpcy5vcHRpb25zLndoaXRlbGlzdCB8fCBmYWxzZTtcbiAgICB0aGlzLmxvZ2dlciA9IGJhc2VMb2dnZXIuY3JlYXRlKCdsYW5ndWFnZVV0aWxzJyk7XG4gIH1cblxuICBnZXRTY3JpcHRQYXJ0RnJvbUNvZGUoY29kZSkge1xuICAgIGlmICghY29kZSB8fCBjb2RlLmluZGV4T2YoJy0nKSA8IDApIHJldHVybiBudWxsO1xuXG4gICAgY29uc3QgcCA9IGNvZGUuc3BsaXQoJy0nKTtcbiAgICBpZiAocC5sZW5ndGggPT09IDIpIHJldHVybiBudWxsO1xuICAgIHAucG9wKCk7XG4gICAgcmV0dXJuIHRoaXMuZm9ybWF0TGFuZ3VhZ2VDb2RlKHAuam9pbignLScpKTtcbiAgfVxuXG4gIGdldExhbmd1YWdlUGFydEZyb21Db2RlKGNvZGUpIHtcbiAgICBpZiAoIWNvZGUgfHwgY29kZS5pbmRleE9mKCctJykgPCAwKSByZXR1cm4gY29kZTtcblxuICAgIGNvbnN0IHAgPSBjb2RlLnNwbGl0KCctJyk7XG4gICAgcmV0dXJuIHRoaXMuZm9ybWF0TGFuZ3VhZ2VDb2RlKHBbMF0pO1xuICB9XG5cbiAgZm9ybWF0TGFuZ3VhZ2VDb2RlKGNvZGUpIHtcbiAgICAvLyBodHRwOi8vd3d3LmlhbmEub3JnL2Fzc2lnbm1lbnRzL2xhbmd1YWdlLXRhZ3MvbGFuZ3VhZ2UtdGFncy54aHRtbFxuICAgIGlmICh0eXBlb2YgY29kZSA9PT0gJ3N0cmluZycgJiYgY29kZS5pbmRleE9mKCctJykgPiAtMSkge1xuICAgICAgY29uc3Qgc3BlY2lhbENhc2VzID0gWydoYW5zJywgJ2hhbnQnLCAnbGF0bicsICdjeXJsJywgJ2NhbnMnLCAnbW9uZycsICdhcmFiJ107XG4gICAgICBsZXQgcCA9IGNvZGUuc3BsaXQoJy0nKTtcblxuICAgICAgaWYgKHRoaXMub3B0aW9ucy5sb3dlckNhc2VMbmcpIHtcbiAgICAgICAgcCA9IHAubWFwKHBhcnQgPT4gcGFydC50b0xvd2VyQ2FzZSgpKTtcbiAgICAgIH0gZWxzZSBpZiAocC5sZW5ndGggPT09IDIpIHtcbiAgICAgICAgcFswXSA9IHBbMF0udG9Mb3dlckNhc2UoKTtcbiAgICAgICAgcFsxXSA9IHBbMV0udG9VcHBlckNhc2UoKTtcblxuICAgICAgICBpZiAoc3BlY2lhbENhc2VzLmluZGV4T2YocFsxXS50b0xvd2VyQ2FzZSgpKSA+IC0xKSBwWzFdID0gY2FwaXRhbGl6ZShwWzFdLnRvTG93ZXJDYXNlKCkpO1xuICAgICAgfSBlbHNlIGlmIChwLmxlbmd0aCA9PT0gMykge1xuICAgICAgICBwWzBdID0gcFswXS50b0xvd2VyQ2FzZSgpO1xuXG4gICAgICAgIC8vIGlmIGxlbmdodCAyIGd1ZXNzIGl0J3MgYSBjb3VudHJ5XG4gICAgICAgIGlmIChwWzFdLmxlbmd0aCA9PT0gMikgcFsxXSA9IHBbMV0udG9VcHBlckNhc2UoKTtcbiAgICAgICAgaWYgKHBbMF0gIT09ICdzZ24nICYmIHBbMl0ubGVuZ3RoID09PSAyKSBwWzJdID0gcFsyXS50b1VwcGVyQ2FzZSgpO1xuXG4gICAgICAgIGlmIChzcGVjaWFsQ2FzZXMuaW5kZXhPZihwWzFdLnRvTG93ZXJDYXNlKCkpID4gLTEpIHBbMV0gPSBjYXBpdGFsaXplKHBbMV0udG9Mb3dlckNhc2UoKSk7XG4gICAgICAgIGlmIChzcGVjaWFsQ2FzZXMuaW5kZXhPZihwWzJdLnRvTG93ZXJDYXNlKCkpID4gLTEpIHBbMl0gPSBjYXBpdGFsaXplKHBbMl0udG9Mb3dlckNhc2UoKSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBwLmpvaW4oJy0nKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5vcHRpb25zLmNsZWFuQ29kZSB8fCB0aGlzLm9wdGlvbnMubG93ZXJDYXNlTG5nID8gY29kZS50b0xvd2VyQ2FzZSgpIDogY29kZTtcbiAgfVxuXG4gIGlzV2hpdGVsaXN0ZWQoY29kZSkge1xuICAgIGlmICh0aGlzLm9wdGlvbnMubG9hZCA9PT0gJ2xhbmd1YWdlT25seScgfHwgdGhpcy5vcHRpb25zLm5vbkV4cGxpY2l0V2hpdGVsaXN0KSB7XG4gICAgICBjb2RlID0gdGhpcy5nZXRMYW5ndWFnZVBhcnRGcm9tQ29kZShjb2RlKTtcbiAgICB9XG4gICAgcmV0dXJuICF0aGlzLndoaXRlbGlzdCB8fCAhdGhpcy53aGl0ZWxpc3QubGVuZ3RoIHx8IHRoaXMud2hpdGVsaXN0LmluZGV4T2YoY29kZSkgPiAtMTtcbiAgfVxuXG4gIGdldEZhbGxiYWNrQ29kZXMoZmFsbGJhY2tzLCBjb2RlKSB7XG4gICAgaWYgKCFmYWxsYmFja3MpIHJldHVybiBbXTtcbiAgICBpZiAodHlwZW9mIGZhbGxiYWNrcyA9PT0gJ3N0cmluZycpIGZhbGxiYWNrcyA9IFtmYWxsYmFja3NdO1xuICAgIGlmIChPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmFwcGx5KGZhbGxiYWNrcykgPT09ICdbb2JqZWN0IEFycmF5XScpIHJldHVybiBmYWxsYmFja3M7XG5cbiAgICBpZiAoIWNvZGUpIHJldHVybiBmYWxsYmFja3MuZGVmYXVsdCB8fCBbXTtcblxuICAgIC8vIGFzdW1lIHdlIGhhdmUgYW4gb2JqZWN0IGRlZmluaW5nIGZhbGxiYWNrc1xuICAgIGxldCBmb3VuZCA9IGZhbGxiYWNrc1tjb2RlXTtcbiAgICBpZiAoIWZvdW5kKSBmb3VuZCA9IGZhbGxiYWNrc1t0aGlzLmdldFNjcmlwdFBhcnRGcm9tQ29kZShjb2RlKV07XG4gICAgaWYgKCFmb3VuZCkgZm91bmQgPSBmYWxsYmFja3NbdGhpcy5mb3JtYXRMYW5ndWFnZUNvZGUoY29kZSldO1xuICAgIGlmICghZm91bmQpIGZvdW5kID0gZmFsbGJhY2tzW3RoaXMuZ2V0TGFuZ3VhZ2VQYXJ0RnJvbUNvZGUoY29kZSldO1xuICAgIGlmICghZm91bmQpIGZvdW5kID0gZmFsbGJhY2tzLmRlZmF1bHQ7XG5cbiAgICByZXR1cm4gZm91bmQgfHwgW107XG4gIH1cblxuICB0b1Jlc29sdmVIaWVyYXJjaHkoY29kZSwgZmFsbGJhY2tDb2RlKSB7XG4gICAgY29uc3QgZmFsbGJhY2tDb2RlcyA9IHRoaXMuZ2V0RmFsbGJhY2tDb2RlcyhcbiAgICAgIGZhbGxiYWNrQ29kZSB8fCB0aGlzLm9wdGlvbnMuZmFsbGJhY2tMbmcgfHwgW10sXG4gICAgICBjb2RlLFxuICAgICk7XG5cbiAgICBjb25zdCBjb2RlcyA9IFtdO1xuICAgIGNvbnN0IGFkZENvZGUgPSBjID0+IHtcbiAgICAgIGlmICghYykgcmV0dXJuO1xuICAgICAgaWYgKHRoaXMuaXNXaGl0ZWxpc3RlZChjKSkge1xuICAgICAgICBjb2Rlcy5wdXNoKGMpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5sb2dnZXIud2FybihgcmVqZWN0aW5nIG5vbi13aGl0ZWxpc3RlZCBsYW5ndWFnZSBjb2RlOiAke2N9YCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIGlmICh0eXBlb2YgY29kZSA9PT0gJ3N0cmluZycgJiYgY29kZS5pbmRleE9mKCctJykgPiAtMSkge1xuICAgICAgaWYgKHRoaXMub3B0aW9ucy5sb2FkICE9PSAnbGFuZ3VhZ2VPbmx5JykgYWRkQ29kZSh0aGlzLmZvcm1hdExhbmd1YWdlQ29kZShjb2RlKSk7XG4gICAgICBpZiAodGhpcy5vcHRpb25zLmxvYWQgIT09ICdsYW5ndWFnZU9ubHknICYmIHRoaXMub3B0aW9ucy5sb2FkICE9PSAnY3VycmVudE9ubHknKVxuICAgICAgICBhZGRDb2RlKHRoaXMuZ2V0U2NyaXB0UGFydEZyb21Db2RlKGNvZGUpKTtcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMubG9hZCAhPT0gJ2N1cnJlbnRPbmx5JykgYWRkQ29kZSh0aGlzLmdldExhbmd1YWdlUGFydEZyb21Db2RlKGNvZGUpKTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBjb2RlID09PSAnc3RyaW5nJykge1xuICAgICAgYWRkQ29kZSh0aGlzLmZvcm1hdExhbmd1YWdlQ29kZShjb2RlKSk7XG4gICAgfVxuXG4gICAgZmFsbGJhY2tDb2Rlcy5mb3JFYWNoKGZjID0+IHtcbiAgICAgIGlmIChjb2Rlcy5pbmRleE9mKGZjKSA8IDApIGFkZENvZGUodGhpcy5mb3JtYXRMYW5ndWFnZUNvZGUoZmMpKTtcbiAgICB9KTtcblxuICAgIHJldHVybiBjb2RlcztcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBMYW5ndWFnZVV0aWw7XG4iLCJpbXBvcnQgYmFzZUxvZ2dlciBmcm9tICcuL2xvZ2dlci5qcyc7XG5cbi8vIGRlZmluaXRpb24gaHR0cDovL3RyYW5zbGF0ZS5zb3VyY2Vmb3JnZS5uZXQvd2lraS9sMTBuL3BsdXJhbGZvcm1zXG4vKiBlc2xpbnQtZGlzYWJsZSAqL1xubGV0IHNldHMgPSBbXG4gIHsgbG5nczogWydhY2gnLCdhaycsJ2FtJywnYXJuJywnYnInLCdmaWwnLCdndW4nLCdsbicsJ21mZScsJ21nJywnbWknLCdvYycsICdwdCcsICdwdC1CUicsXG4gICAgJ3RnJywndGknLCd0cicsJ3V6Jywnd2EnXSwgbnI6IFsxLDJdLCBmYzogMSB9LFxuXG4gIHsgbG5nczogWydhZicsJ2FuJywnYXN0JywnYXonLCdiZycsJ2JuJywnY2EnLCdkYScsJ2RlJywnZGV2JywnZWwnLCdlbicsXG4gICAgJ2VvJywnZXMnLCdldCcsJ2V1JywnZmknLCdmbycsJ2Z1cicsJ2Z5JywnZ2wnLCdndScsJ2hhJywnaGknLFxuICAgICdodScsJ2h5JywnaWEnLCdpdCcsJ2tuJywna3UnLCdsYicsJ21haScsJ21sJywnbW4nLCdtcicsJ25haCcsJ25hcCcsJ25iJyxcbiAgICAnbmUnLCdubCcsJ25uJywnbm8nLCduc28nLCdwYScsJ3BhcCcsJ3BtcycsJ3BzJywncHQtUFQnLCdybScsJ3NjbycsXG4gICAgJ3NlJywnc2knLCdzbycsJ3NvbicsJ3NxJywnc3YnLCdzdycsJ3RhJywndGUnLCd0aycsJ3VyJywneW8nXSwgbnI6IFsxLDJdLCBmYzogMiB9LFxuXG4gIHsgbG5nczogWydheScsJ2JvJywnY2dnJywnZmEnLCdpZCcsJ2phJywnamJvJywna2EnLCdraycsJ2ttJywna28nLCdreScsJ2xvJyxcbiAgICAnbXMnLCdzYWgnLCdzdScsJ3RoJywndHQnLCd1ZycsJ3ZpJywnd28nLCd6aCddLCBucjogWzFdLCBmYzogMyB9LFxuXG4gIHsgbG5nczogWydiZScsJ2JzJywgJ2NucicsICdkeicsJ2hyJywncnUnLCdzcicsJ3VrJ10sIG5yOiBbMSwyLDVdLCBmYzogNCB9LFxuXG4gIHsgbG5nczogWydhciddLCBucjogWzAsMSwyLDMsMTEsMTAwXSwgZmM6IDUgfSxcbiAgeyBsbmdzOiBbJ2NzJywnc2snXSwgbnI6IFsxLDIsNV0sIGZjOiA2IH0sXG4gIHsgbG5nczogWydjc2InLCdwbCddLCBucjogWzEsMiw1XSwgZmM6IDcgfSxcbiAgeyBsbmdzOiBbJ2N5J10sIG5yOiBbMSwyLDMsOF0sIGZjOiA4IH0sXG4gIHsgbG5nczogWydmciddLCBucjogWzEsMl0sIGZjOiA5IH0sXG4gIHsgbG5nczogWydnYSddLCBucjogWzEsMiwzLDcsMTFdLCBmYzogMTAgfSxcbiAgeyBsbmdzOiBbJ2dkJ10sIG5yOiBbMSwyLDMsMjBdLCBmYzogMTEgfSxcbiAgeyBsbmdzOiBbJ2lzJ10sIG5yOiBbMSwyXSwgZmM6IDEyIH0sXG4gIHsgbG5nczogWydqdiddLCBucjogWzAsMV0sIGZjOiAxMyB9LFxuICB7IGxuZ3M6IFsna3cnXSwgbnI6IFsxLDIsMyw0XSwgZmM6IDE0IH0sXG4gIHsgbG5nczogWydsdCddLCBucjogWzEsMiwxMF0sIGZjOiAxNSB9LFxuICB7IGxuZ3M6IFsnbHYnXSwgbnI6IFsxLDIsMF0sIGZjOiAxNiB9LFxuICB7IGxuZ3M6IFsnbWsnXSwgbnI6IFsxLDJdLCBmYzogMTcgfSxcbiAgeyBsbmdzOiBbJ21uayddLCBucjogWzAsMSwyXSwgZmM6IDE4IH0sXG4gIHsgbG5nczogWydtdCddLCBucjogWzEsMiwxMSwyMF0sIGZjOiAxOSB9LFxuICB7IGxuZ3M6IFsnb3InXSwgbnI6IFsyLDFdLCBmYzogMiB9LFxuICB7IGxuZ3M6IFsncm8nXSwgbnI6IFsxLDIsMjBdLCBmYzogMjAgfSxcbiAgeyBsbmdzOiBbJ3NsJ10sIG5yOiBbNSwxLDIsM10sIGZjOiAyMSB9LFxuICB7IGxuZ3M6IFsnaGUnXSwgbnI6IFsxLDIsMjAsMjFdLCBmYzogMjIgfVxuXVxuXG5sZXQgX3J1bGVzUGx1cmFsc1R5cGVzID0ge1xuICAxOiBmdW5jdGlvbihuKSB7cmV0dXJuIE51bWJlcihuID4gMSk7fSxcbiAgMjogZnVuY3Rpb24obikge3JldHVybiBOdW1iZXIobiAhPSAxKTt9LFxuICAzOiBmdW5jdGlvbihuKSB7cmV0dXJuIDA7fSxcbiAgNDogZnVuY3Rpb24obikge3JldHVybiBOdW1iZXIobiUxMD09MSAmJiBuJTEwMCE9MTEgPyAwIDogbiUxMD49MiAmJiBuJTEwPD00ICYmIChuJTEwMDwxMCB8fCBuJTEwMD49MjApID8gMSA6IDIpO30sXG4gIDU6IGZ1bmN0aW9uKG4pIHtyZXR1cm4gTnVtYmVyKG49PT0wID8gMCA6IG49PTEgPyAxIDogbj09MiA/IDIgOiBuJTEwMD49MyAmJiBuJTEwMDw9MTAgPyAzIDogbiUxMDA+PTExID8gNCA6IDUpO30sXG4gIDY6IGZ1bmN0aW9uKG4pIHtyZXR1cm4gTnVtYmVyKChuPT0xKSA/IDAgOiAobj49MiAmJiBuPD00KSA/IDEgOiAyKTt9LFxuICA3OiBmdW5jdGlvbihuKSB7cmV0dXJuIE51bWJlcihuPT0xID8gMCA6IG4lMTA+PTIgJiYgbiUxMDw9NCAmJiAobiUxMDA8MTAgfHwgbiUxMDA+PTIwKSA/IDEgOiAyKTt9LFxuICA4OiBmdW5jdGlvbihuKSB7cmV0dXJuIE51bWJlcigobj09MSkgPyAwIDogKG49PTIpID8gMSA6IChuICE9IDggJiYgbiAhPSAxMSkgPyAyIDogMyk7fSxcbiAgOTogZnVuY3Rpb24obikge3JldHVybiBOdW1iZXIobiA+PSAyKTt9LFxuICAxMDogZnVuY3Rpb24obikge3JldHVybiBOdW1iZXIobj09MSA/IDAgOiBuPT0yID8gMSA6IG48NyA/IDIgOiBuPDExID8gMyA6IDQpIDt9LFxuICAxMTogZnVuY3Rpb24obikge3JldHVybiBOdW1iZXIoKG49PTEgfHwgbj09MTEpID8gMCA6IChuPT0yIHx8IG49PTEyKSA/IDEgOiAobiA+IDIgJiYgbiA8IDIwKSA/IDIgOiAzKTt9LFxuICAxMjogZnVuY3Rpb24obikge3JldHVybiBOdW1iZXIobiUxMCE9MSB8fCBuJTEwMD09MTEpO30sXG4gIDEzOiBmdW5jdGlvbihuKSB7cmV0dXJuIE51bWJlcihuICE9PSAwKTt9LFxuICAxNDogZnVuY3Rpb24obikge3JldHVybiBOdW1iZXIoKG49PTEpID8gMCA6IChuPT0yKSA/IDEgOiAobiA9PSAzKSA/IDIgOiAzKTt9LFxuICAxNTogZnVuY3Rpb24obikge3JldHVybiBOdW1iZXIobiUxMD09MSAmJiBuJTEwMCE9MTEgPyAwIDogbiUxMD49MiAmJiAobiUxMDA8MTAgfHwgbiUxMDA+PTIwKSA/IDEgOiAyKTt9LFxuICAxNjogZnVuY3Rpb24obikge3JldHVybiBOdW1iZXIobiUxMD09MSAmJiBuJTEwMCE9MTEgPyAwIDogbiAhPT0gMCA/IDEgOiAyKTt9LFxuICAxNzogZnVuY3Rpb24obikge3JldHVybiBOdW1iZXIobj09MSB8fCBuJTEwPT0xID8gMCA6IDEpO30sXG4gIDE4OiBmdW5jdGlvbihuKSB7cmV0dXJuIE51bWJlcihuPT0wID8gMCA6IG49PTEgPyAxIDogMik7fSxcbiAgMTk6IGZ1bmN0aW9uKG4pIHtyZXR1cm4gTnVtYmVyKG49PTEgPyAwIDogbj09PTAgfHwgKCBuJTEwMD4xICYmIG4lMTAwPDExKSA/IDEgOiAobiUxMDA+MTAgJiYgbiUxMDA8MjAgKSA/IDIgOiAzKTt9LFxuICAyMDogZnVuY3Rpb24obikge3JldHVybiBOdW1iZXIobj09MSA/IDAgOiAobj09PTAgfHwgKG4lMTAwID4gMCAmJiBuJTEwMCA8IDIwKSkgPyAxIDogMik7fSxcbiAgMjE6IGZ1bmN0aW9uKG4pIHtyZXR1cm4gTnVtYmVyKG4lMTAwPT0xID8gMSA6IG4lMTAwPT0yID8gMiA6IG4lMTAwPT0zIHx8IG4lMTAwPT00ID8gMyA6IDApOyB9LFxuICAyMjogZnVuY3Rpb24obikge3JldHVybiBOdW1iZXIobj09PTEgPyAwIDogbj09PTIgPyAxIDogKG48MCB8fCBuPjEwKSAmJiBuJTEwPT0wID8gMiA6IDMpOyB9XG59O1xuLyogZXNsaW50LWVuYWJsZSAqL1xuXG5mdW5jdGlvbiBjcmVhdGVSdWxlcygpIHtcbiAgY29uc3QgcnVsZXMgPSB7fTtcbiAgc2V0cy5mb3JFYWNoKChzZXQpID0+IHtcbiAgICBzZXQubG5ncy5mb3JFYWNoKChsKSA9PiB7XG4gICAgICBydWxlc1tsXSA9IHtcbiAgICAgICAgbnVtYmVyczogc2V0Lm5yLFxuICAgICAgICBwbHVyYWxzOiBfcnVsZXNQbHVyYWxzVHlwZXNbc2V0LmZjXVxuICAgICAgfTtcbiAgICB9KTtcbiAgfSk7XG4gIHJldHVybiBydWxlcztcbn1cblxuY2xhc3MgUGx1cmFsUmVzb2x2ZXIge1xuICBjb25zdHJ1Y3RvcihsYW5ndWFnZVV0aWxzLCBvcHRpb25zID0ge30pIHtcbiAgICB0aGlzLmxhbmd1YWdlVXRpbHMgPSBsYW5ndWFnZVV0aWxzO1xuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG5cbiAgICB0aGlzLmxvZ2dlciA9IGJhc2VMb2dnZXIuY3JlYXRlKCdwbHVyYWxSZXNvbHZlcicpO1xuXG4gICAgdGhpcy5ydWxlcyA9IGNyZWF0ZVJ1bGVzKCk7XG4gIH1cblxuICBhZGRSdWxlKGxuZywgb2JqKSB7XG4gICAgdGhpcy5ydWxlc1tsbmddID0gb2JqO1xuICB9XG5cbiAgZ2V0UnVsZShjb2RlKSB7XG4gICAgcmV0dXJuIHRoaXMucnVsZXNbY29kZV0gfHwgdGhpcy5ydWxlc1t0aGlzLmxhbmd1YWdlVXRpbHMuZ2V0TGFuZ3VhZ2VQYXJ0RnJvbUNvZGUoY29kZSldO1xuICB9XG5cbiAgbmVlZHNQbHVyYWwoY29kZSkge1xuICAgIGNvbnN0IHJ1bGUgPSB0aGlzLmdldFJ1bGUoY29kZSk7XG5cbiAgICByZXR1cm4gcnVsZSAmJiBydWxlLm51bWJlcnMubGVuZ3RoID4gMTtcbiAgfVxuXG4gIGdldFBsdXJhbEZvcm1zT2ZLZXkoY29kZSwga2V5KSB7XG4gICAgY29uc3QgcmV0ID0gW107XG5cbiAgICBjb25zdCBydWxlID0gdGhpcy5nZXRSdWxlKGNvZGUpO1xuXG4gICAgaWYgKCFydWxlKSByZXR1cm4gcmV0O1xuXG4gICAgcnVsZS5udW1iZXJzLmZvckVhY2goKG4pID0+IHtcbiAgICAgIGNvbnN0IHN1ZmZpeCA9IHRoaXMuZ2V0U3VmZml4KGNvZGUsIG4pO1xuICAgICAgcmV0LnB1c2goYCR7a2V5fSR7c3VmZml4fWApO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHJldDtcbiAgfVxuXG4gIGdldFN1ZmZpeChjb2RlLCBjb3VudCkge1xuICAgIGNvbnN0IHJ1bGUgPSB0aGlzLmdldFJ1bGUoY29kZSk7XG5cbiAgICBpZiAocnVsZSkge1xuICAgICAgLy8gaWYgKHJ1bGUubnVtYmVycy5sZW5ndGggPT09IDEpIHJldHVybiAnJzsgLy8gb25seSBzaW5ndWxhclxuXG4gICAgICBjb25zdCBpZHggPSBydWxlLm5vQWJzID8gcnVsZS5wbHVyYWxzKGNvdW50KSA6IHJ1bGUucGx1cmFscyhNYXRoLmFicyhjb3VudCkpO1xuICAgICAgbGV0IHN1ZmZpeCA9IHJ1bGUubnVtYmVyc1tpZHhdO1xuXG4gICAgICAvLyBzcGVjaWFsIHRyZWF0bWVudCBmb3IgbG5ncyBvbmx5IGhhdmluZyBzaW5ndWxhciBhbmQgcGx1cmFsXG4gICAgICBpZiAodGhpcy5vcHRpb25zLnNpbXBsaWZ5UGx1cmFsU3VmZml4ICYmIHJ1bGUubnVtYmVycy5sZW5ndGggPT09IDIgJiYgcnVsZS5udW1iZXJzWzBdID09PSAxKSB7XG4gICAgICAgIGlmIChzdWZmaXggPT09IDIpIHtcbiAgICAgICAgICBzdWZmaXggPSAncGx1cmFsJztcbiAgICAgICAgfSBlbHNlIGlmIChzdWZmaXggPT09IDEpIHtcbiAgICAgICAgICBzdWZmaXggPSAnJztcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBjb25zdCByZXR1cm5TdWZmaXggPSAoKSA9PiAoXG4gICAgICAgIHRoaXMub3B0aW9ucy5wcmVwZW5kICYmIHN1ZmZpeC50b1N0cmluZygpID8gdGhpcy5vcHRpb25zLnByZXBlbmQgKyBzdWZmaXgudG9TdHJpbmcoKSA6IHN1ZmZpeC50b1N0cmluZygpXG4gICAgICApO1xuXG4gICAgICAvLyBDT01QQVRJQklMSVRZIEpTT05cbiAgICAgIC8vIHYxXG4gICAgICBpZiAodGhpcy5vcHRpb25zLmNvbXBhdGliaWxpdHlKU09OID09PSAndjEnKSB7XG4gICAgICAgIGlmIChzdWZmaXggPT09IDEpIHJldHVybiAnJztcbiAgICAgICAgaWYgKHR5cGVvZiBzdWZmaXggPT09ICdudW1iZXInKSByZXR1cm4gYF9wbHVyYWxfJHtzdWZmaXgudG9TdHJpbmcoKX1gO1xuICAgICAgICByZXR1cm4gcmV0dXJuU3VmZml4KCk7XG4gICAgICB9IGVsc2UgaWYgKC8qIHYyICovIHRoaXMub3B0aW9ucy5jb21wYXRpYmlsaXR5SlNPTiA9PT0gJ3YyJykge1xuICAgICAgICByZXR1cm4gcmV0dXJuU3VmZml4KCk7XG4gICAgICB9IGVsc2UgaWYgKC8qIHYzIC0gZ2V0dGV4dCBpbmRleCAqLyB0aGlzLm9wdGlvbnMuc2ltcGxpZnlQbHVyYWxTdWZmaXggJiYgcnVsZS5udW1iZXJzLmxlbmd0aCA9PT0gMiAmJiBydWxlLm51bWJlcnNbMF0gPT09IDEpIHtcbiAgICAgICAgcmV0dXJuIHJldHVyblN1ZmZpeCgpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXMub3B0aW9ucy5wcmVwZW5kICYmIGlkeC50b1N0cmluZygpID8gdGhpcy5vcHRpb25zLnByZXBlbmQgKyBpZHgudG9TdHJpbmcoKSA6IGlkeC50b1N0cmluZygpO1xuICAgIH1cblxuICAgIHRoaXMubG9nZ2VyLndhcm4oYG5vIHBsdXJhbCBydWxlIGZvdW5kIGZvcjogJHtjb2RlfWApO1xuICAgIHJldHVybiAnJztcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBQbHVyYWxSZXNvbHZlcjtcbiIsImltcG9ydCAqIGFzIHV0aWxzIGZyb20gJy4vdXRpbHMuanMnO1xuaW1wb3J0IGJhc2VMb2dnZXIgZnJvbSAnLi9sb2dnZXIuanMnO1xuXG5jbGFzcyBJbnRlcnBvbGF0b3Ige1xuICBjb25zdHJ1Y3RvcihvcHRpb25zID0ge30pIHtcbiAgICB0aGlzLmxvZ2dlciA9IGJhc2VMb2dnZXIuY3JlYXRlKCdpbnRlcnBvbGF0b3InKTtcblxuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG4gICAgdGhpcy5mb3JtYXQgPSAob3B0aW9ucy5pbnRlcnBvbGF0aW9uICYmIG9wdGlvbnMuaW50ZXJwb2xhdGlvbi5mb3JtYXQpIHx8ICh2YWx1ZSA9PiB2YWx1ZSk7XG4gICAgdGhpcy5pbml0KG9wdGlvbnMpO1xuICB9XG5cbiAgLyogZXNsaW50IG5vLXBhcmFtLXJlYXNzaWduOiAwICovXG4gIGluaXQob3B0aW9ucyA9IHt9KSB7XG4gICAgaWYgKCFvcHRpb25zLmludGVycG9sYXRpb24pIG9wdGlvbnMuaW50ZXJwb2xhdGlvbiA9IHsgZXNjYXBlVmFsdWU6IHRydWUgfTtcblxuICAgIGNvbnN0IGlPcHRzID0gb3B0aW9ucy5pbnRlcnBvbGF0aW9uO1xuXG4gICAgdGhpcy5lc2NhcGUgPSBpT3B0cy5lc2NhcGUgIT09IHVuZGVmaW5lZCA/IGlPcHRzLmVzY2FwZSA6IHV0aWxzLmVzY2FwZTtcbiAgICB0aGlzLmVzY2FwZVZhbHVlID0gaU9wdHMuZXNjYXBlVmFsdWUgIT09IHVuZGVmaW5lZCA/IGlPcHRzLmVzY2FwZVZhbHVlIDogdHJ1ZTtcbiAgICB0aGlzLnVzZVJhd1ZhbHVlVG9Fc2NhcGUgPVxuICAgICAgaU9wdHMudXNlUmF3VmFsdWVUb0VzY2FwZSAhPT0gdW5kZWZpbmVkID8gaU9wdHMudXNlUmF3VmFsdWVUb0VzY2FwZSA6IGZhbHNlO1xuXG4gICAgdGhpcy5wcmVmaXggPSBpT3B0cy5wcmVmaXggPyB1dGlscy5yZWdleEVzY2FwZShpT3B0cy5wcmVmaXgpIDogaU9wdHMucHJlZml4RXNjYXBlZCB8fCAne3snO1xuICAgIHRoaXMuc3VmZml4ID0gaU9wdHMuc3VmZml4ID8gdXRpbHMucmVnZXhFc2NhcGUoaU9wdHMuc3VmZml4KSA6IGlPcHRzLnN1ZmZpeEVzY2FwZWQgfHwgJ319JztcblxuICAgIHRoaXMuZm9ybWF0U2VwYXJhdG9yID0gaU9wdHMuZm9ybWF0U2VwYXJhdG9yXG4gICAgICA/IGlPcHRzLmZvcm1hdFNlcGFyYXRvclxuICAgICAgOiBpT3B0cy5mb3JtYXRTZXBhcmF0b3IgfHwgJywnO1xuXG4gICAgdGhpcy51bmVzY2FwZVByZWZpeCA9IGlPcHRzLnVuZXNjYXBlU3VmZml4ID8gJycgOiBpT3B0cy51bmVzY2FwZVByZWZpeCB8fCAnLSc7XG4gICAgdGhpcy51bmVzY2FwZVN1ZmZpeCA9IHRoaXMudW5lc2NhcGVQcmVmaXggPyAnJyA6IGlPcHRzLnVuZXNjYXBlU3VmZml4IHx8ICcnO1xuXG4gICAgdGhpcy5uZXN0aW5nUHJlZml4ID0gaU9wdHMubmVzdGluZ1ByZWZpeFxuICAgICAgPyB1dGlscy5yZWdleEVzY2FwZShpT3B0cy5uZXN0aW5nUHJlZml4KVxuICAgICAgOiBpT3B0cy5uZXN0aW5nUHJlZml4RXNjYXBlZCB8fCB1dGlscy5yZWdleEVzY2FwZSgnJHQoJyk7XG4gICAgdGhpcy5uZXN0aW5nU3VmZml4ID0gaU9wdHMubmVzdGluZ1N1ZmZpeFxuICAgICAgPyB1dGlscy5yZWdleEVzY2FwZShpT3B0cy5uZXN0aW5nU3VmZml4KVxuICAgICAgOiBpT3B0cy5uZXN0aW5nU3VmZml4RXNjYXBlZCB8fCB1dGlscy5yZWdleEVzY2FwZSgnKScpO1xuXG4gICAgdGhpcy5uZXN0aW5nT3B0aW9uc1NlcGFyYXRvciA9IGlPcHRzLm5lc3RpbmdPcHRpb25zU2VwYXJhdG9yXG4gICAgICA/IGlPcHRzLm5lc3RpbmdPcHRpb25zU2VwYXJhdG9yXG4gICAgICA6IGlPcHRzLm5lc3RpbmdPcHRpb25zU2VwYXJhdG9yIHx8ICcsJztcblxuICAgIHRoaXMubWF4UmVwbGFjZXMgPSBpT3B0cy5tYXhSZXBsYWNlcyA/IGlPcHRzLm1heFJlcGxhY2VzIDogMTAwMDtcblxuICAgIHRoaXMuYWx3YXlzRm9ybWF0ID0gaU9wdHMuYWx3YXlzRm9ybWF0ICE9PSB1bmRlZmluZWQgPyBpT3B0cy5hbHdheXNGb3JtYXQgOiBmYWxzZTtcblxuICAgIC8vIHRoZSByZWdleHBcbiAgICB0aGlzLnJlc2V0UmVnRXhwKCk7XG4gIH1cblxuICByZXNldCgpIHtcbiAgICBpZiAodGhpcy5vcHRpb25zKSB0aGlzLmluaXQodGhpcy5vcHRpb25zKTtcbiAgfVxuXG4gIHJlc2V0UmVnRXhwKCkge1xuICAgIC8vIHRoZSByZWdleHBcbiAgICBjb25zdCByZWdleHBTdHIgPSBgJHt0aGlzLnByZWZpeH0oLis/KSR7dGhpcy5zdWZmaXh9YDtcbiAgICB0aGlzLnJlZ2V4cCA9IG5ldyBSZWdFeHAocmVnZXhwU3RyLCAnZycpO1xuXG4gICAgY29uc3QgcmVnZXhwVW5lc2NhcGVTdHIgPSBgJHt0aGlzLnByZWZpeH0ke3RoaXMudW5lc2NhcGVQcmVmaXh9KC4rPykke3RoaXMudW5lc2NhcGVTdWZmaXh9JHtcbiAgICAgIHRoaXMuc3VmZml4XG4gICAgfWA7XG4gICAgdGhpcy5yZWdleHBVbmVzY2FwZSA9IG5ldyBSZWdFeHAocmVnZXhwVW5lc2NhcGVTdHIsICdnJyk7XG5cbiAgICBjb25zdCBuZXN0aW5nUmVnZXhwU3RyID0gYCR7dGhpcy5uZXN0aW5nUHJlZml4fSguKz8pJHt0aGlzLm5lc3RpbmdTdWZmaXh9YDtcbiAgICB0aGlzLm5lc3RpbmdSZWdleHAgPSBuZXcgUmVnRXhwKG5lc3RpbmdSZWdleHBTdHIsICdnJyk7XG4gIH1cblxuICBpbnRlcnBvbGF0ZShzdHIsIGRhdGEsIGxuZywgb3B0aW9ucykge1xuICAgIGxldCBtYXRjaDtcbiAgICBsZXQgdmFsdWU7XG4gICAgbGV0IHJlcGxhY2VzO1xuXG4gICAgY29uc3QgZGVmYXVsdERhdGEgPVxuICAgICAgKHRoaXMub3B0aW9ucyAmJiB0aGlzLm9wdGlvbnMuaW50ZXJwb2xhdGlvbiAmJiB0aGlzLm9wdGlvbnMuaW50ZXJwb2xhdGlvbi5kZWZhdWx0VmFyaWFibGVzKSB8fFxuICAgICAge307XG5cbiAgICBmdW5jdGlvbiByZWdleFNhZmUodmFsKSB7XG4gICAgICByZXR1cm4gdmFsLnJlcGxhY2UoL1xcJC9nLCAnJCQkJCcpO1xuICAgIH1cblxuICAgIGNvbnN0IGhhbmRsZUZvcm1hdCA9IGtleSA9PiB7XG4gICAgICBpZiAoa2V5LmluZGV4T2YodGhpcy5mb3JtYXRTZXBhcmF0b3IpIDwgMCkge1xuICAgICAgICBjb25zdCBwYXRoID0gdXRpbHMuZ2V0UGF0aFdpdGhEZWZhdWx0cyhkYXRhLCBkZWZhdWx0RGF0YSwga2V5KTtcbiAgICAgICAgcmV0dXJuIHRoaXMuYWx3YXlzRm9ybWF0ID8gdGhpcy5mb3JtYXQocGF0aCwgdW5kZWZpbmVkLCBsbmcpIDogcGF0aDtcbiAgICAgIH1cblxuICAgICAgY29uc3QgcCA9IGtleS5zcGxpdCh0aGlzLmZvcm1hdFNlcGFyYXRvcik7XG4gICAgICBjb25zdCBrID0gcC5zaGlmdCgpLnRyaW0oKTtcbiAgICAgIGNvbnN0IGYgPSBwLmpvaW4odGhpcy5mb3JtYXRTZXBhcmF0b3IpLnRyaW0oKTtcblxuICAgICAgcmV0dXJuIHRoaXMuZm9ybWF0KHV0aWxzLmdldFBhdGhXaXRoRGVmYXVsdHMoZGF0YSwgZGVmYXVsdERhdGEsIGspLCBmLCBsbmcsIG9wdGlvbnMpO1xuICAgIH07XG5cbiAgICB0aGlzLnJlc2V0UmVnRXhwKCk7XG5cbiAgICBjb25zdCBtaXNzaW5nSW50ZXJwb2xhdGlvbkhhbmRsZXIgPVxuICAgICAgKG9wdGlvbnMgJiYgb3B0aW9ucy5taXNzaW5nSW50ZXJwb2xhdGlvbkhhbmRsZXIpIHx8IHRoaXMub3B0aW9ucy5taXNzaW5nSW50ZXJwb2xhdGlvbkhhbmRsZXI7XG5cbiAgICByZXBsYWNlcyA9IDA7XG4gICAgLy8gdW5lc2NhcGUgaWYgaGFzIHVuZXNjYXBlUHJlZml4L1N1ZmZpeFxuICAgIC8qIGVzbGludCBuby1jb25kLWFzc2lnbjogMCAqL1xuICAgIHdoaWxlICgobWF0Y2ggPSB0aGlzLnJlZ2V4cFVuZXNjYXBlLmV4ZWMoc3RyKSkpIHtcbiAgICAgIHZhbHVlID0gaGFuZGxlRm9ybWF0KG1hdGNoWzFdLnRyaW0oKSk7XG4gICAgICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAodHlwZW9mIG1pc3NpbmdJbnRlcnBvbGF0aW9uSGFuZGxlciA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgIGNvbnN0IHRlbXAgPSBtaXNzaW5nSW50ZXJwb2xhdGlvbkhhbmRsZXIoc3RyLCBtYXRjaCwgb3B0aW9ucyk7XG4gICAgICAgICAgdmFsdWUgPSB0eXBlb2YgdGVtcCA9PT0gJ3N0cmluZycgPyB0ZW1wIDogJyc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5sb2dnZXIud2FybihgbWlzc2VkIHRvIHBhc3MgaW4gdmFyaWFibGUgJHttYXRjaFsxXX0gZm9yIGludGVycG9sYXRpbmcgJHtzdHJ9YCk7XG4gICAgICAgICAgdmFsdWUgPSAnJztcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmICh0eXBlb2YgdmFsdWUgIT09ICdzdHJpbmcnICYmICF0aGlzLnVzZVJhd1ZhbHVlVG9Fc2NhcGUpIHtcbiAgICAgICAgdmFsdWUgPSB1dGlscy5tYWtlU3RyaW5nKHZhbHVlKTtcbiAgICAgIH1cbiAgICAgIHN0ciA9IHN0ci5yZXBsYWNlKG1hdGNoWzBdLCByZWdleFNhZmUodmFsdWUpKTtcbiAgICAgIHRoaXMucmVnZXhwVW5lc2NhcGUubGFzdEluZGV4ID0gMDtcbiAgICAgIHJlcGxhY2VzKys7XG4gICAgICBpZiAocmVwbGFjZXMgPj0gdGhpcy5tYXhSZXBsYWNlcykge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXBsYWNlcyA9IDA7XG4gICAgLy8gcmVndWxhciBlc2NhcGUgb24gZGVtYW5kXG4gICAgd2hpbGUgKChtYXRjaCA9IHRoaXMucmVnZXhwLmV4ZWMoc3RyKSkpIHtcbiAgICAgIHZhbHVlID0gaGFuZGxlRm9ybWF0KG1hdGNoWzFdLnRyaW0oKSk7XG4gICAgICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAodHlwZW9mIG1pc3NpbmdJbnRlcnBvbGF0aW9uSGFuZGxlciA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgIGNvbnN0IHRlbXAgPSBtaXNzaW5nSW50ZXJwb2xhdGlvbkhhbmRsZXIoc3RyLCBtYXRjaCwgb3B0aW9ucyk7XG4gICAgICAgICAgdmFsdWUgPSB0eXBlb2YgdGVtcCA9PT0gJ3N0cmluZycgPyB0ZW1wIDogJyc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5sb2dnZXIud2FybihgbWlzc2VkIHRvIHBhc3MgaW4gdmFyaWFibGUgJHttYXRjaFsxXX0gZm9yIGludGVycG9sYXRpbmcgJHtzdHJ9YCk7XG4gICAgICAgICAgdmFsdWUgPSAnJztcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmICh0eXBlb2YgdmFsdWUgIT09ICdzdHJpbmcnICYmICF0aGlzLnVzZVJhd1ZhbHVlVG9Fc2NhcGUpIHtcbiAgICAgICAgdmFsdWUgPSB1dGlscy5tYWtlU3RyaW5nKHZhbHVlKTtcbiAgICAgIH1cbiAgICAgIHZhbHVlID0gdGhpcy5lc2NhcGVWYWx1ZSA/IHJlZ2V4U2FmZSh0aGlzLmVzY2FwZSh2YWx1ZSkpIDogcmVnZXhTYWZlKHZhbHVlKTtcbiAgICAgIHN0ciA9IHN0ci5yZXBsYWNlKG1hdGNoWzBdLCB2YWx1ZSk7XG4gICAgICB0aGlzLnJlZ2V4cC5sYXN0SW5kZXggPSAwO1xuICAgICAgcmVwbGFjZXMrKztcbiAgICAgIGlmIChyZXBsYWNlcyA+PSB0aGlzLm1heFJlcGxhY2VzKSB7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gc3RyO1xuICB9XG5cbiAgbmVzdChzdHIsIGZjLCBvcHRpb25zID0ge30pIHtcbiAgICBsZXQgbWF0Y2g7XG4gICAgbGV0IHZhbHVlO1xuXG4gICAgbGV0IGNsb25lZE9wdGlvbnMgPSB7IC4uLm9wdGlvbnMgfTtcbiAgICBjbG9uZWRPcHRpb25zLmFwcGx5UG9zdFByb2Nlc3NvciA9IGZhbHNlOyAvLyBhdm9pZCBwb3N0IHByb2Nlc3Npbmcgb24gbmVzdGVkIGxvb2t1cFxuICAgIGRlbGV0ZSBjbG9uZWRPcHRpb25zLmRlZmF1bHRWYWx1ZTsgLy8gYXNzZXJ0IHdlIGRvIG5vdCBnZXQgYSBlbmRsZXNzIGxvb3Agb24gaW50ZXJwb2xhdGluZyBkZWZhdWx0VmFsdWUgYWdhaW4gYW5kIGFnYWluXG5cbiAgICAvLyBpZiB2YWx1ZSBpcyBzb21ldGhpbmcgbGlrZSBcIm15S2V5XCI6IFwibG9yZW0gJChhbm90aGVyS2V5LCB7IFwiY291bnRcIjoge3thVmFsdWVJbk9wdGlvbnN9fSB9KVwiXG4gICAgZnVuY3Rpb24gaGFuZGxlSGFzT3B0aW9ucyhrZXksIGluaGVyaXRlZE9wdGlvbnMpIHtcbiAgICAgIGNvbnN0IHNlcCA9IHRoaXMubmVzdGluZ09wdGlvbnNTZXBhcmF0b3I7XG4gICAgICBpZiAoa2V5LmluZGV4T2Yoc2VwKSA8IDApIHJldHVybiBrZXk7XG5cbiAgICAgIGNvbnN0IGMgPSBrZXkuc3BsaXQobmV3IFJlZ0V4cChgJHtzZXB9WyBdKntgKSk7XG5cbiAgICAgIGxldCBvcHRpb25zU3RyaW5nID0gYHske2NbMV19YDtcbiAgICAgIGtleSA9IGNbMF07XG4gICAgICBvcHRpb25zU3RyaW5nID0gdGhpcy5pbnRlcnBvbGF0ZShvcHRpb25zU3RyaW5nLCBjbG9uZWRPcHRpb25zKTtcbiAgICAgIG9wdGlvbnNTdHJpbmcgPSBvcHRpb25zU3RyaW5nLnJlcGxhY2UoLycvZywgJ1wiJyk7XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIGNsb25lZE9wdGlvbnMgPSBKU09OLnBhcnNlKG9wdGlvbnNTdHJpbmcpO1xuXG4gICAgICAgIGlmIChpbmhlcml0ZWRPcHRpb25zKSBjbG9uZWRPcHRpb25zID0geyAuLi5pbmhlcml0ZWRPcHRpb25zLCAuLi5jbG9uZWRPcHRpb25zIH07XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHRoaXMubG9nZ2VyLndhcm4oYGZhaWxlZCBwYXJzaW5nIG9wdGlvbnMgc3RyaW5nIGluIG5lc3RpbmcgZm9yIGtleSAke2tleX1gLCBlKTtcbiAgICAgICAgcmV0dXJuIGAke2tleX0ke3NlcH0ke29wdGlvbnNTdHJpbmd9YDtcbiAgICAgIH1cblxuICAgICAgLy8gYXNzZXJ0IHdlIGRvIG5vdCBnZXQgYSBlbmRsZXNzIGxvb3Agb24gaW50ZXJwb2xhdGluZyBkZWZhdWx0VmFsdWUgYWdhaW4gYW5kIGFnYWluXG4gICAgICBkZWxldGUgY2xvbmVkT3B0aW9ucy5kZWZhdWx0VmFsdWU7XG4gICAgICByZXR1cm4ga2V5O1xuICAgIH1cblxuICAgIC8vIHJlZ3VsYXIgZXNjYXBlIG9uIGRlbWFuZFxuICAgIHdoaWxlICgobWF0Y2ggPSB0aGlzLm5lc3RpbmdSZWdleHAuZXhlYyhzdHIpKSkge1xuICAgICAgbGV0IGZvcm1hdHRlcnMgPSBbXTtcblxuICAgICAgLyoqXG4gICAgICAgKiBJZiB0aGVyZSBpcyBtb3JlIHRoYW4gb25lIHBhcmFtZXRlciAoY29udGFpbnMgdGhlIGZvcm1hdCBzZXBhcmF0b3IpLiBFLmcuOlxuICAgICAgICogICAtIHQoYSwgYilcbiAgICAgICAqICAgLSB0KGEsIGIsIGMpXG4gICAgICAgKlxuICAgICAgICogQW5kIHRob3NlIHBhcmFtZXRlcnMgYXJlIG5vdCBkeW5hbWljIHZhbHVlcyAocGFyYW1ldGVycyBkbyBub3QgaW5jbHVkZSBjdXJseSBicmFjZXMpLiBFLmcuOlxuICAgICAgICogICAtIE5vdCB0KGEsIHsgXCJrZXlcIjogXCJ7e3ZhcmlhYmxlfX1cIiB9KVxuICAgICAgICogICAtIE5vdCB0KGEsIGIsIHtcImtleUFcIjogXCJ2YWx1ZUFcIiwgXCJrZXlCXCI6IFwidmFsdWVCXCJ9KVxuICAgICAgICovXG4gICAgICBsZXQgZG9SZWR1Y2UgPSBmYWxzZTtcbiAgICAgIGlmIChtYXRjaFswXS5pbmNsdWRlcyh0aGlzLmZvcm1hdFNlcGFyYXRvcikgJiYgIS97Lip9Ly50ZXN0KG1hdGNoWzFdKSkge1xuICAgICAgICBbbWF0Y2hbMV0sIC4uLmZvcm1hdHRlcnNdID0gbWF0Y2hbMV0uc3BsaXQodGhpcy5mb3JtYXRTZXBhcmF0b3IpLm1hcChlbGVtID0+IGVsZW0udHJpbSgpKTtcbiAgICAgICAgZG9SZWR1Y2UgPSB0cnVlO1xuICAgICAgfVxuXG4gICAgICB2YWx1ZSA9IGZjKGhhbmRsZUhhc09wdGlvbnMuY2FsbCh0aGlzLCBtYXRjaFsxXS50cmltKCksIGNsb25lZE9wdGlvbnMpLCBjbG9uZWRPcHRpb25zKTtcblxuICAgICAgLy8gaXMgb25seSB0aGUgbmVzdGluZyBrZXkgKGtleTEgPSAnJChrZXkyKScpIHJldHVybiB0aGUgdmFsdWUgd2l0aG91dCBzdHJpbmdpZnlcbiAgICAgIGlmICh2YWx1ZSAmJiBtYXRjaFswXSA9PT0gc3RyICYmIHR5cGVvZiB2YWx1ZSAhPT0gJ3N0cmluZycpIHJldHVybiB2YWx1ZTtcblxuICAgICAgLy8gbm8gc3RyaW5nIHRvIGluY2x1ZGUgb3IgZW1wdHlcbiAgICAgIGlmICh0eXBlb2YgdmFsdWUgIT09ICdzdHJpbmcnKSB2YWx1ZSA9IHV0aWxzLm1ha2VTdHJpbmcodmFsdWUpO1xuICAgICAgaWYgKCF2YWx1ZSkge1xuICAgICAgICB0aGlzLmxvZ2dlci53YXJuKGBtaXNzZWQgdG8gcmVzb2x2ZSAke21hdGNoWzFdfSBmb3IgbmVzdGluZyAke3N0cn1gKTtcbiAgICAgICAgdmFsdWUgPSAnJztcbiAgICAgIH1cblxuICAgICAgaWYgKGRvUmVkdWNlKSB7XG4gICAgICAgIHZhbHVlID0gZm9ybWF0dGVycy5yZWR1Y2UoKHYsIGYpID0+IHRoaXMuZm9ybWF0KHYsIGYsIG9wdGlvbnMubG5nLCBvcHRpb25zKSwgdmFsdWUudHJpbSgpKTtcbiAgICAgIH1cblxuICAgICAgLy8gTmVzdGVkIGtleXMgc2hvdWxkIG5vdCBiZSBlc2NhcGVkIGJ5IGRlZmF1bHQgIzg1NFxuICAgICAgLy8gdmFsdWUgPSB0aGlzLmVzY2FwZVZhbHVlID8gcmVnZXhTYWZlKHV0aWxzLmVzY2FwZSh2YWx1ZSkpIDogcmVnZXhTYWZlKHZhbHVlKTtcbiAgICAgIHN0ciA9IHN0ci5yZXBsYWNlKG1hdGNoWzBdLCB2YWx1ZSk7XG4gICAgICB0aGlzLnJlZ2V4cC5sYXN0SW5kZXggPSAwO1xuICAgIH1cbiAgICByZXR1cm4gc3RyO1xuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IEludGVycG9sYXRvcjtcbiIsImltcG9ydCAqIGFzIHV0aWxzIGZyb20gJy4vdXRpbHMuanMnO1xuaW1wb3J0IGJhc2VMb2dnZXIgZnJvbSAnLi9sb2dnZXIuanMnO1xuaW1wb3J0IEV2ZW50RW1pdHRlciBmcm9tICcuL0V2ZW50RW1pdHRlci5qcyc7XG5cbmZ1bmN0aW9uIHJlbW92ZShhcnIsIHdoYXQpIHtcbiAgbGV0IGZvdW5kID0gYXJyLmluZGV4T2Yod2hhdCk7XG5cbiAgd2hpbGUgKGZvdW5kICE9PSAtMSkge1xuICAgIGFyci5zcGxpY2UoZm91bmQsIDEpO1xuICAgIGZvdW5kID0gYXJyLmluZGV4T2Yod2hhdCk7XG4gIH1cbn1cblxuY2xhc3MgQ29ubmVjdG9yIGV4dGVuZHMgRXZlbnRFbWl0dGVyIHtcbiAgY29uc3RydWN0b3IoYmFja2VuZCwgc3RvcmUsIHNlcnZpY2VzLCBvcHRpb25zID0ge30pIHtcbiAgICBzdXBlcigpO1xuICAgIGlmICh1dGlscy5pc0lFMTApIHtcbiAgICAgIEV2ZW50RW1pdHRlci5jYWxsKHRoaXMpOyAvLyA8PUlFMTAgZml4ICh1bmFibGUgdG8gY2FsbCBwYXJlbnQgY29uc3RydWN0b3IpXG4gICAgfVxuXG4gICAgdGhpcy5iYWNrZW5kID0gYmFja2VuZDtcbiAgICB0aGlzLnN0b3JlID0gc3RvcmU7XG4gICAgdGhpcy5zZXJ2aWNlcyA9IHNlcnZpY2VzO1xuICAgIHRoaXMubGFuZ3VhZ2VVdGlscyA9IHNlcnZpY2VzLmxhbmd1YWdlVXRpbHM7XG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcbiAgICB0aGlzLmxvZ2dlciA9IGJhc2VMb2dnZXIuY3JlYXRlKCdiYWNrZW5kQ29ubmVjdG9yJyk7XG5cbiAgICB0aGlzLnN0YXRlID0ge307XG4gICAgdGhpcy5xdWV1ZSA9IFtdO1xuXG4gICAgaWYgKHRoaXMuYmFja2VuZCAmJiB0aGlzLmJhY2tlbmQuaW5pdCkge1xuICAgICAgdGhpcy5iYWNrZW5kLmluaXQoc2VydmljZXMsIG9wdGlvbnMuYmFja2VuZCwgb3B0aW9ucyk7XG4gICAgfVxuICB9XG5cbiAgcXVldWVMb2FkKGxhbmd1YWdlcywgbmFtZXNwYWNlcywgb3B0aW9ucywgY2FsbGJhY2spIHtcbiAgICAvLyBmaW5kIHdoYXQgbmVlZHMgdG8gYmUgbG9hZGVkXG4gICAgY29uc3QgdG9Mb2FkID0gW107XG4gICAgY29uc3QgcGVuZGluZyA9IFtdO1xuICAgIGNvbnN0IHRvTG9hZExhbmd1YWdlcyA9IFtdO1xuICAgIGNvbnN0IHRvTG9hZE5hbWVzcGFjZXMgPSBbXTtcblxuICAgIGxhbmd1YWdlcy5mb3JFYWNoKGxuZyA9PiB7XG4gICAgICBsZXQgaGFzQWxsTmFtZXNwYWNlcyA9IHRydWU7XG5cbiAgICAgIG5hbWVzcGFjZXMuZm9yRWFjaChucyA9PiB7XG4gICAgICAgIGNvbnN0IG5hbWUgPSBgJHtsbmd9fCR7bnN9YDtcblxuICAgICAgICBpZiAoIW9wdGlvbnMucmVsb2FkICYmIHRoaXMuc3RvcmUuaGFzUmVzb3VyY2VCdW5kbGUobG5nLCBucykpIHtcbiAgICAgICAgICB0aGlzLnN0YXRlW25hbWVdID0gMjsgLy8gbG9hZGVkXG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5zdGF0ZVtuYW1lXSA8IDApIHtcbiAgICAgICAgICAvLyBub3RoaW5nIHRvIGRvIGZvciBlcnJcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLnN0YXRlW25hbWVdID09PSAxKSB7XG4gICAgICAgICAgaWYgKHBlbmRpbmcuaW5kZXhPZihuYW1lKSA8IDApIHBlbmRpbmcucHVzaChuYW1lKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLnN0YXRlW25hbWVdID0gMTsgLy8gcGVuZGluZ1xuXG4gICAgICAgICAgaGFzQWxsTmFtZXNwYWNlcyA9IGZhbHNlO1xuXG4gICAgICAgICAgaWYgKHBlbmRpbmcuaW5kZXhPZihuYW1lKSA8IDApIHBlbmRpbmcucHVzaChuYW1lKTtcbiAgICAgICAgICBpZiAodG9Mb2FkLmluZGV4T2YobmFtZSkgPCAwKSB0b0xvYWQucHVzaChuYW1lKTtcbiAgICAgICAgICBpZiAodG9Mb2FkTmFtZXNwYWNlcy5pbmRleE9mKG5zKSA8IDApIHRvTG9hZE5hbWVzcGFjZXMucHVzaChucyk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICBpZiAoIWhhc0FsbE5hbWVzcGFjZXMpIHRvTG9hZExhbmd1YWdlcy5wdXNoKGxuZyk7XG4gICAgfSk7XG5cbiAgICBpZiAodG9Mb2FkLmxlbmd0aCB8fCBwZW5kaW5nLmxlbmd0aCkge1xuICAgICAgdGhpcy5xdWV1ZS5wdXNoKHtcbiAgICAgICAgcGVuZGluZyxcbiAgICAgICAgbG9hZGVkOiB7fSxcbiAgICAgICAgZXJyb3JzOiBbXSxcbiAgICAgICAgY2FsbGJhY2ssXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgdG9Mb2FkLFxuICAgICAgcGVuZGluZyxcbiAgICAgIHRvTG9hZExhbmd1YWdlcyxcbiAgICAgIHRvTG9hZE5hbWVzcGFjZXMsXG4gICAgfTtcbiAgfVxuXG4gIGxvYWRlZChuYW1lLCBlcnIsIGRhdGEpIHtcbiAgICBjb25zdCBbbG5nLCBuc10gPSBuYW1lLnNwbGl0KCd8Jyk7XG5cbiAgICBpZiAoZXJyKSB0aGlzLmVtaXQoJ2ZhaWxlZExvYWRpbmcnLCBsbmcsIG5zLCBlcnIpO1xuXG4gICAgaWYgKGRhdGEpIHtcbiAgICAgIHRoaXMuc3RvcmUuYWRkUmVzb3VyY2VCdW5kbGUobG5nLCBucywgZGF0YSk7XG4gICAgfVxuXG4gICAgLy8gc2V0IGxvYWRlZFxuICAgIHRoaXMuc3RhdGVbbmFtZV0gPSBlcnIgPyAtMSA6IDI7XG5cbiAgICAvLyBjb25zb2xpZGF0ZWQgbG9hZGluZyBkb25lIGluIHRoaXMgcnVuIC0gb25seSBlbWl0IG9uY2UgZm9yIGEgbG9hZGVkIG5hbWVzcGFjZVxuICAgIGNvbnN0IGxvYWRlZCA9IHt9O1xuXG4gICAgLy8gY2FsbGJhY2sgaWYgcmVhZHlcbiAgICB0aGlzLnF1ZXVlLmZvckVhY2gocSA9PiB7XG4gICAgICB1dGlscy5wdXNoUGF0aChxLmxvYWRlZCwgW2xuZ10sIG5zKTtcbiAgICAgIHJlbW92ZShxLnBlbmRpbmcsIG5hbWUpO1xuXG4gICAgICBpZiAoZXJyKSBxLmVycm9ycy5wdXNoKGVycik7XG5cbiAgICAgIGlmIChxLnBlbmRpbmcubGVuZ3RoID09PSAwICYmICFxLmRvbmUpIHtcbiAgICAgICAgLy8gb25seSBkbyBvbmNlIHBlciBsb2FkZWQgLT4gdGhpcy5lbWl0KCdsb2FkZWQnLCBxLmxvYWRlZCk7XG4gICAgICAgIE9iamVjdC5rZXlzKHEubG9hZGVkKS5mb3JFYWNoKGwgPT4ge1xuICAgICAgICAgIGlmICghbG9hZGVkW2xdKSBsb2FkZWRbbF0gPSBbXTtcbiAgICAgICAgICBpZiAocS5sb2FkZWRbbF0ubGVuZ3RoKSB7XG4gICAgICAgICAgICBxLmxvYWRlZFtsXS5mb3JFYWNoKG5zID0+IHtcbiAgICAgICAgICAgICAgaWYgKGxvYWRlZFtsXS5pbmRleE9mKG5zKSA8IDApIGxvYWRlZFtsXS5wdXNoKG5zKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLyogZXNsaW50IG5vLXBhcmFtLXJlYXNzaWduOiAwICovXG4gICAgICAgIHEuZG9uZSA9IHRydWU7XG4gICAgICAgIGlmIChxLmVycm9ycy5sZW5ndGgpIHtcbiAgICAgICAgICBxLmNhbGxiYWNrKHEuZXJyb3JzKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBxLmNhbGxiYWNrKCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIGVtaXQgY29uc29saWRhdGVkIGxvYWRlZCBldmVudFxuICAgIHRoaXMuZW1pdCgnbG9hZGVkJywgbG9hZGVkKTtcblxuICAgIC8vIHJlbW92ZSBkb25lIGxvYWQgcmVxdWVzdHNcbiAgICB0aGlzLnF1ZXVlID0gdGhpcy5xdWV1ZS5maWx0ZXIocSA9PiAhcS5kb25lKTtcbiAgfVxuXG4gIHJlYWQobG5nLCBucywgZmNOYW1lLCB0cmllZCA9IDAsIHdhaXQgPSAzNTAsIGNhbGxiYWNrKSB7XG4gICAgaWYgKCFsbmcubGVuZ3RoKSByZXR1cm4gY2FsbGJhY2sobnVsbCwge30pOyAvLyBub3RpbmcgdG8gbG9hZFxuXG4gICAgcmV0dXJuIHRoaXMuYmFja2VuZFtmY05hbWVdKGxuZywgbnMsIChlcnIsIGRhdGEpID0+IHtcbiAgICAgIGlmIChlcnIgJiYgZGF0YSAvKiA9IHJldHJ5RmxhZyAqLyAmJiB0cmllZCA8IDUpIHtcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgdGhpcy5yZWFkLmNhbGwodGhpcywgbG5nLCBucywgZmNOYW1lLCB0cmllZCArIDEsIHdhaXQgKiAyLCBjYWxsYmFjayk7XG4gICAgICAgIH0sIHdhaXQpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjYWxsYmFjayhlcnIsIGRhdGEpO1xuICAgIH0pO1xuICB9XG5cbiAgLyogZXNsaW50IGNvbnNpc3RlbnQtcmV0dXJuOiAwICovXG4gIHByZXBhcmVMb2FkaW5nKGxhbmd1YWdlcywgbmFtZXNwYWNlcywgb3B0aW9ucyA9IHt9LCBjYWxsYmFjaykge1xuICAgIGlmICghdGhpcy5iYWNrZW5kKSB7XG4gICAgICB0aGlzLmxvZ2dlci53YXJuKCdObyBiYWNrZW5kIHdhcyBhZGRlZCB2aWEgaTE4bmV4dC51c2UuIFdpbGwgbm90IGxvYWQgcmVzb3VyY2VzLicpO1xuICAgICAgcmV0dXJuIGNhbGxiYWNrICYmIGNhbGxiYWNrKCk7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBsYW5ndWFnZXMgPT09ICdzdHJpbmcnKSBsYW5ndWFnZXMgPSB0aGlzLmxhbmd1YWdlVXRpbHMudG9SZXNvbHZlSGllcmFyY2h5KGxhbmd1YWdlcyk7XG4gICAgaWYgKHR5cGVvZiBuYW1lc3BhY2VzID09PSAnc3RyaW5nJykgbmFtZXNwYWNlcyA9IFtuYW1lc3BhY2VzXTtcblxuICAgIGNvbnN0IHRvTG9hZCA9IHRoaXMucXVldWVMb2FkKGxhbmd1YWdlcywgbmFtZXNwYWNlcywgb3B0aW9ucywgY2FsbGJhY2spO1xuICAgIGlmICghdG9Mb2FkLnRvTG9hZC5sZW5ndGgpIHtcbiAgICAgIGlmICghdG9Mb2FkLnBlbmRpbmcubGVuZ3RoKSBjYWxsYmFjaygpOyAvLyBub3RoaW5nIHRvIGxvYWQgYW5kIG5vIHBlbmRpbmdzLi4uY2FsbGJhY2sgbm93XG4gICAgICByZXR1cm4gbnVsbDsgLy8gcGVuZGluZ3Mgd2lsbCB0cmlnZ2VyIGNhbGxiYWNrXG4gICAgfVxuXG4gICAgdG9Mb2FkLnRvTG9hZC5mb3JFYWNoKG5hbWUgPT4ge1xuICAgICAgdGhpcy5sb2FkT25lKG5hbWUpO1xuICAgIH0pO1xuICB9XG5cbiAgbG9hZChsYW5ndWFnZXMsIG5hbWVzcGFjZXMsIGNhbGxiYWNrKSB7XG4gICAgdGhpcy5wcmVwYXJlTG9hZGluZyhsYW5ndWFnZXMsIG5hbWVzcGFjZXMsIHt9LCBjYWxsYmFjayk7XG4gIH1cblxuICByZWxvYWQobGFuZ3VhZ2VzLCBuYW1lc3BhY2VzLCBjYWxsYmFjaykge1xuICAgIHRoaXMucHJlcGFyZUxvYWRpbmcobGFuZ3VhZ2VzLCBuYW1lc3BhY2VzLCB7IHJlbG9hZDogdHJ1ZSB9LCBjYWxsYmFjayk7XG4gIH1cblxuICBsb2FkT25lKG5hbWUsIHByZWZpeCA9ICcnKSB7XG4gICAgY29uc3QgW2xuZywgbnNdID0gbmFtZS5zcGxpdCgnfCcpO1xuXG4gICAgdGhpcy5yZWFkKGxuZywgbnMsICdyZWFkJywgdW5kZWZpbmVkLCB1bmRlZmluZWQsIChlcnIsIGRhdGEpID0+IHtcbiAgICAgIGlmIChlcnIpIHRoaXMubG9nZ2VyLndhcm4oYCR7cHJlZml4fWxvYWRpbmcgbmFtZXNwYWNlICR7bnN9IGZvciBsYW5ndWFnZSAke2xuZ30gZmFpbGVkYCwgZXJyKTtcbiAgICAgIGlmICghZXJyICYmIGRhdGEpXG4gICAgICAgIHRoaXMubG9nZ2VyLmxvZyhgJHtwcmVmaXh9bG9hZGVkIG5hbWVzcGFjZSAke25zfSBmb3IgbGFuZ3VhZ2UgJHtsbmd9YCwgZGF0YSk7XG5cbiAgICAgIHRoaXMubG9hZGVkKG5hbWUsIGVyciwgZGF0YSk7XG4gICAgfSk7XG4gIH1cblxuICBzYXZlTWlzc2luZyhsYW5ndWFnZXMsIG5hbWVzcGFjZSwga2V5LCBmYWxsYmFja1ZhbHVlLCBpc1VwZGF0ZSwgb3B0aW9ucyA9IHt9KSB7XG4gICAgaWYgKFxuICAgICAgdGhpcy5zZXJ2aWNlcy51dGlscyAmJlxuICAgICAgdGhpcy5zZXJ2aWNlcy51dGlscy5oYXNMb2FkZWROYW1lc3BhY2UgJiZcbiAgICAgICF0aGlzLnNlcnZpY2VzLnV0aWxzLmhhc0xvYWRlZE5hbWVzcGFjZShuYW1lc3BhY2UpXG4gICAgKSB7XG4gICAgICB0aGlzLmxvZ2dlci53YXJuKFxuICAgICAgICBgZGlkIG5vdCBzYXZlIGtleSBcIiR7a2V5fVwiIGZvciBuYW1lc3BhY2UgXCIke25hbWVzcGFjZX1cIiBhcyB0aGUgbmFtZXNwYWNlIHdhcyBub3QgeWV0IGxvYWRlZGAsXG4gICAgICAgICdUaGlzIG1lYW5zIHNvbWV0aGluZyBJUyBXUk9ORyBpbiB5b3VyIGFwcGxpY2F0aW9uIHNldHVwLiBZb3UgYWNjZXNzIHRoZSB0IGZ1bmN0aW9uIGJlZm9yZSBpMThuZXh0LmluaXQgLyBpMThuZXh0LmxvYWROYW1lc3BhY2UgLyBpMThuZXh0LmNoYW5nZUxhbmd1YWdlIHdhcyBkb25lLiBXYWl0IGZvciB0aGUgY2FsbGJhY2sgb3IgUHJvbWlzZSB0byByZXNvbHZlIGJlZm9yZSBhY2Nlc3NpbmcgaXQhISEnLFxuICAgICAgKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBpZ25vcmUgbm9uIHZhbGlkIGtleXNcbiAgICBpZiAoa2V5ID09PSB1bmRlZmluZWQgfHwga2V5ID09PSBudWxsIHx8IGtleSA9PT0gJycpIHJldHVybjtcblxuICAgIGlmICh0aGlzLmJhY2tlbmQgJiYgdGhpcy5iYWNrZW5kLmNyZWF0ZSkge1xuICAgICAgdGhpcy5iYWNrZW5kLmNyZWF0ZShsYW5ndWFnZXMsIG5hbWVzcGFjZSwga2V5LCBmYWxsYmFja1ZhbHVlLCBudWxsIC8qIHVudXNlZCBjYWxsYmFjayAqLywge1xuICAgICAgICAuLi5vcHRpb25zLFxuICAgICAgICBpc1VwZGF0ZSxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIHdyaXRlIHRvIHN0b3JlIHRvIGF2b2lkIHJlc2VuZGluZ1xuICAgIGlmICghbGFuZ3VhZ2VzIHx8ICFsYW5ndWFnZXNbMF0pIHJldHVybjtcbiAgICB0aGlzLnN0b3JlLmFkZFJlc291cmNlKGxhbmd1YWdlc1swXSwgbmFtZXNwYWNlLCBrZXksIGZhbGxiYWNrVmFsdWUpO1xuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IENvbm5lY3RvcjtcbiIsImV4cG9ydCBmdW5jdGlvbiBnZXQoKSB7XG4gIHJldHVybiB7XG4gICAgZGVidWc6IGZhbHNlLFxuICAgIGluaXRJbW1lZGlhdGU6IHRydWUsXG5cbiAgICBuczogWyd0cmFuc2xhdGlvbiddLFxuICAgIGRlZmF1bHROUzogWyd0cmFuc2xhdGlvbiddLFxuICAgIGZhbGxiYWNrTG5nOiBbJ2RldiddLFxuICAgIGZhbGxiYWNrTlM6IGZhbHNlLCAvLyBzdHJpbmcgb3IgYXJyYXkgb2YgbmFtZXNwYWNlc1xuXG4gICAgd2hpdGVsaXN0OiBmYWxzZSwgLy8gYXJyYXkgd2l0aCB3aGl0ZWxpc3RlZCBsYW5ndWFnZXNcbiAgICBub25FeHBsaWNpdFdoaXRlbGlzdDogZmFsc2UsXG4gICAgbG9hZDogJ2FsbCcsIC8vIHwgY3VycmVudE9ubHkgfCBsYW5ndWFnZU9ubHlcbiAgICBwcmVsb2FkOiBmYWxzZSwgLy8gYXJyYXkgd2l0aCBwcmVsb2FkIGxhbmd1YWdlc1xuXG4gICAgc2ltcGxpZnlQbHVyYWxTdWZmaXg6IHRydWUsXG4gICAga2V5U2VwYXJhdG9yOiAnLicsXG4gICAgbnNTZXBhcmF0b3I6ICc6JyxcbiAgICBwbHVyYWxTZXBhcmF0b3I6ICdfJyxcbiAgICBjb250ZXh0U2VwYXJhdG9yOiAnXycsXG5cbiAgICBwYXJ0aWFsQnVuZGxlZExhbmd1YWdlczogZmFsc2UsIC8vIGFsbG93IGJ1bmRsaW5nIGNlcnRhaW4gbGFuZ3VhZ2VzIHRoYXQgYXJlIG5vdCByZW1vdGVseSBmZXRjaGVkXG4gICAgc2F2ZU1pc3Npbmc6IGZhbHNlLCAvLyBlbmFibGUgdG8gc2VuZCBtaXNzaW5nIHZhbHVlc1xuICAgIHVwZGF0ZU1pc3Npbmc6IGZhbHNlLCAvLyBlbmFibGUgdG8gdXBkYXRlIGRlZmF1bHQgdmFsdWVzIGlmIGRpZmZlcmVudCBmcm9tIHRyYW5zbGF0ZWQgdmFsdWUgKG9ubHkgdXNlZnVsIG9uIGluaXRpYWwgZGV2ZWxvcG1lbnQsIG9yIHdoZW4ga2VlcGluZyBjb2RlIGFzIHNvdXJjZSBvZiB0cnV0aClcbiAgICBzYXZlTWlzc2luZ1RvOiAnZmFsbGJhY2snLCAvLyAnY3VycmVudCcgfHwgJ2FsbCdcbiAgICBzYXZlTWlzc2luZ1BsdXJhbHM6IHRydWUsIC8vIHdpbGwgc2F2ZSBhbGwgZm9ybXMgbm90IG9ubHkgc2luZ3VsYXIga2V5XG4gICAgbWlzc2luZ0tleUhhbmRsZXI6IGZhbHNlLCAvLyBmdW5jdGlvbihsbmcsIG5zLCBrZXksIGZhbGxiYWNrVmFsdWUpIC0+IG92ZXJyaWRlIGlmIHByZWZlciBvbiBoYW5kbGluZ1xuICAgIG1pc3NpbmdJbnRlcnBvbGF0aW9uSGFuZGxlcjogZmFsc2UsIC8vIGZ1bmN0aW9uKHN0ciwgbWF0Y2gpXG5cbiAgICBwb3N0UHJvY2VzczogZmFsc2UsIC8vIHN0cmluZyBvciBhcnJheSBvZiBwb3N0UHJvY2Vzc29yIG5hbWVzXG4gICAgcG9zdFByb2Nlc3NQYXNzUmVzb2x2ZWQ6IGZhbHNlLCAvLyBwYXNzIHJlc29sdmVkIG9iamVjdCBpbnRvICdvcHRpb25zLmkxOG5SZXNvbHZlZCcgZm9yIHBvc3Rwcm9jZXNzb3JcbiAgICByZXR1cm5OdWxsOiB0cnVlLCAvLyBhbGxvd3MgbnVsbCB2YWx1ZSBhcyB2YWxpZCB0cmFuc2xhdGlvblxuICAgIHJldHVybkVtcHR5U3RyaW5nOiB0cnVlLCAvLyBhbGxvd3MgZW1wdHkgc3RyaW5nIHZhbHVlIGFzIHZhbGlkIHRyYW5zbGF0aW9uXG4gICAgcmV0dXJuT2JqZWN0czogZmFsc2UsXG4gICAgam9pbkFycmF5czogZmFsc2UsIC8vIG9yIHN0cmluZyB0byBqb2luIGFycmF5XG4gICAgcmV0dXJuZWRPYmplY3RIYW5kbGVyOiBmYWxzZSwgLy8gZnVuY3Rpb24oa2V5LCB2YWx1ZSwgb3B0aW9ucykgdHJpZ2dlcmVkIGlmIGtleSByZXR1cm5zIG9iamVjdCBidXQgcmV0dXJuT2JqZWN0cyBpcyBzZXQgdG8gZmFsc2VcbiAgICBwYXJzZU1pc3NpbmdLZXlIYW5kbGVyOiBmYWxzZSwgLy8gZnVuY3Rpb24oa2V5KSBwYXJzZWQgYSBrZXkgdGhhdCB3YXMgbm90IGZvdW5kIGluIHQoKSBiZWZvcmUgcmV0dXJuaW5nXG4gICAgYXBwZW5kTmFtZXNwYWNlVG9NaXNzaW5nS2V5OiBmYWxzZSxcbiAgICBhcHBlbmROYW1lc3BhY2VUb0NJTW9kZTogZmFsc2UsXG4gICAgb3ZlcmxvYWRUcmFuc2xhdGlvbk9wdGlvbkhhbmRsZXI6IGZ1bmN0aW9uIGhhbmRsZShhcmdzKSB7XG4gICAgICB2YXIgcmV0ID0ge307XG4gICAgICBpZiAodHlwZW9mIGFyZ3NbMV0gPT09ICdvYmplY3QnKSByZXQgPSBhcmdzWzFdO1xuICAgICAgaWYgKHR5cGVvZiBhcmdzWzFdID09PSAnc3RyaW5nJykgcmV0LmRlZmF1bHRWYWx1ZSA9IGFyZ3NbMV07XG4gICAgICBpZiAodHlwZW9mIGFyZ3NbMl0gPT09ICdzdHJpbmcnKSByZXQudERlc2NyaXB0aW9uID0gYXJnc1syXTtcbiAgICAgIGlmICh0eXBlb2YgYXJnc1syXSA9PT0gJ29iamVjdCcgfHwgdHlwZW9mIGFyZ3NbM10gPT09ICdvYmplY3QnKSB7XG4gICAgICAgIHZhciBvcHRpb25zID0gYXJnc1szXSB8fCBhcmdzWzJdO1xuICAgICAgICBPYmplY3Qua2V5cyhvcHRpb25zKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgICAgICAgIHJldFtrZXldID0gb3B0aW9uc1trZXldO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXQ7XG4gICAgfSxcbiAgICBpbnRlcnBvbGF0aW9uOiB7XG4gICAgICBlc2NhcGVWYWx1ZTogdHJ1ZSxcbiAgICAgIGZvcm1hdDogKHZhbHVlLCBmb3JtYXQsIGxuZywgb3B0aW9ucykgPT4gdmFsdWUsXG4gICAgICBwcmVmaXg6ICd7eycsXG4gICAgICBzdWZmaXg6ICd9fScsXG4gICAgICBmb3JtYXRTZXBhcmF0b3I6ICcsJyxcbiAgICAgIC8vIHByZWZpeEVzY2FwZWQ6ICd7eycsXG4gICAgICAvLyBzdWZmaXhFc2NhcGVkOiAnfX0nLFxuICAgICAgLy8gdW5lc2NhcGVTdWZmaXg6ICcnLFxuICAgICAgdW5lc2NhcGVQcmVmaXg6ICctJyxcblxuICAgICAgbmVzdGluZ1ByZWZpeDogJyR0KCcsXG4gICAgICBuZXN0aW5nU3VmZml4OiAnKScsXG4gICAgICBuZXN0aW5nT3B0aW9uc1NlcGFyYXRvcjogJywnLFxuICAgICAgLy8gbmVzdGluZ1ByZWZpeEVzY2FwZWQ6ICckdCgnLFxuICAgICAgLy8gbmVzdGluZ1N1ZmZpeEVzY2FwZWQ6ICcpJyxcbiAgICAgIC8vIGRlZmF1bHRWYXJpYWJsZXM6IHVuZGVmaW5lZCAvLyBvYmplY3QgdGhhdCBjYW4gaGF2ZSB2YWx1ZXMgdG8gaW50ZXJwb2xhdGUgb24gLSBleHRlbmRzIHBhc3NlZCBpbiBpbnRlcnBvbGF0aW9uIGRhdGFcbiAgICAgIG1heFJlcGxhY2VzOiAxMDAwLCAvLyBtYXggcmVwbGFjZXMgdG8gcHJldmVudCBlbmRsZXNzIGxvb3BcbiAgICB9LFxuICB9O1xufVxuXG4vKiBlc2xpbnQgbm8tcGFyYW0tcmVhc3NpZ246IDAgKi9cbmV4cG9ydCBmdW5jdGlvbiB0cmFuc2Zvcm1PcHRpb25zKG9wdGlvbnMpIHtcbiAgLy8gY3JlYXRlIG5hbWVzcGFjZSBvYmplY3QgaWYgbmFtZXNwYWNlIGlzIHBhc3NlZCBpbiBhcyBzdHJpbmdcbiAgaWYgKHR5cGVvZiBvcHRpb25zLm5zID09PSAnc3RyaW5nJykgb3B0aW9ucy5ucyA9IFtvcHRpb25zLm5zXTtcbiAgaWYgKHR5cGVvZiBvcHRpb25zLmZhbGxiYWNrTG5nID09PSAnc3RyaW5nJykgb3B0aW9ucy5mYWxsYmFja0xuZyA9IFtvcHRpb25zLmZhbGxiYWNrTG5nXTtcbiAgaWYgKHR5cGVvZiBvcHRpb25zLmZhbGxiYWNrTlMgPT09ICdzdHJpbmcnKSBvcHRpb25zLmZhbGxiYWNrTlMgPSBbb3B0aW9ucy5mYWxsYmFja05TXTtcblxuICAvLyBleHRlbmQgd2hpdGVsaXN0IHdpdGggY2ltb2RlXG4gIGlmIChvcHRpb25zLndoaXRlbGlzdCAmJiBvcHRpb25zLndoaXRlbGlzdC5pbmRleE9mKCdjaW1vZGUnKSA8IDApIHtcbiAgICBvcHRpb25zLndoaXRlbGlzdCA9IG9wdGlvbnMud2hpdGVsaXN0LmNvbmNhdChbJ2NpbW9kZSddKTtcbiAgfVxuXG4gIHJldHVybiBvcHRpb25zO1xufVxuIiwiaW1wb3J0IGJhc2VMb2dnZXIgZnJvbSAnLi9sb2dnZXIuanMnO1xuaW1wb3J0IEV2ZW50RW1pdHRlciBmcm9tICcuL0V2ZW50RW1pdHRlci5qcyc7XG5pbXBvcnQgUmVzb3VyY2VTdG9yZSBmcm9tICcuL1Jlc291cmNlU3RvcmUuanMnO1xuaW1wb3J0IFRyYW5zbGF0b3IgZnJvbSAnLi9UcmFuc2xhdG9yLmpzJztcbmltcG9ydCBMYW5ndWFnZVV0aWxzIGZyb20gJy4vTGFuZ3VhZ2VVdGlscy5qcyc7XG5pbXBvcnQgUGx1cmFsUmVzb2x2ZXIgZnJvbSAnLi9QbHVyYWxSZXNvbHZlci5qcyc7XG5pbXBvcnQgSW50ZXJwb2xhdG9yIGZyb20gJy4vSW50ZXJwb2xhdG9yLmpzJztcbmltcG9ydCBCYWNrZW5kQ29ubmVjdG9yIGZyb20gJy4vQmFja2VuZENvbm5lY3Rvci5qcyc7XG5pbXBvcnQgeyBnZXQgYXMgZ2V0RGVmYXVsdHMsIHRyYW5zZm9ybU9wdGlvbnMgfSBmcm9tICcuL2RlZmF1bHRzLmpzJztcbmltcG9ydCBwb3N0UHJvY2Vzc29yIGZyb20gJy4vcG9zdFByb2Nlc3Nvci5qcyc7XG5pbXBvcnQgeyBkZWZlciwgaXNJRTEwIH0gZnJvbSAnLi91dGlscy5qcyc7XG5cbmZ1bmN0aW9uIG5vb3AoKSB7IH1cblxuY2xhc3MgSTE4biBleHRlbmRzIEV2ZW50RW1pdHRlciB7XG4gIGNvbnN0cnVjdG9yKG9wdGlvbnMgPSB7fSwgY2FsbGJhY2spIHtcbiAgICBzdXBlcigpO1xuICAgIGlmIChpc0lFMTApIHtcbiAgICAgIEV2ZW50RW1pdHRlci5jYWxsKHRoaXMpIC8vIDw9SUUxMCBmaXggKHVuYWJsZSB0byBjYWxsIHBhcmVudCBjb25zdHJ1Y3RvcilcbiAgICB9XG5cbiAgICB0aGlzLm9wdGlvbnMgPSB0cmFuc2Zvcm1PcHRpb25zKG9wdGlvbnMpO1xuICAgIHRoaXMuc2VydmljZXMgPSB7fTtcbiAgICB0aGlzLmxvZ2dlciA9IGJhc2VMb2dnZXI7XG4gICAgdGhpcy5tb2R1bGVzID0geyBleHRlcm5hbDogW10gfTtcblxuICAgIGlmIChjYWxsYmFjayAmJiAhdGhpcy5pc0luaXRpYWxpemVkICYmICFvcHRpb25zLmlzQ2xvbmUpIHtcbiAgICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9pMThuZXh0L2kxOG5leHQvaXNzdWVzLzg3OVxuICAgICAgaWYgKCF0aGlzLm9wdGlvbnMuaW5pdEltbWVkaWF0ZSkge1xuICAgICAgICB0aGlzLmluaXQob3B0aW9ucywgY2FsbGJhY2spO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgIH1cbiAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICB0aGlzLmluaXQob3B0aW9ucywgY2FsbGJhY2spO1xuICAgICAgfSwgMCk7XG4gICAgfVxuICB9XG5cbiAgaW5pdChvcHRpb25zID0ge30sIGNhbGxiYWNrKSB7XG4gICAgaWYgKHR5cGVvZiBvcHRpb25zID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBjYWxsYmFjayA9IG9wdGlvbnM7XG4gICAgICBvcHRpb25zID0ge307XG4gICAgfVxuICAgIHRoaXMub3B0aW9ucyA9IHsgLi4uZ2V0RGVmYXVsdHMoKSwgLi4udGhpcy5vcHRpb25zLCAuLi50cmFuc2Zvcm1PcHRpb25zKG9wdGlvbnMpIH07XG5cbiAgICB0aGlzLmZvcm1hdCA9IHRoaXMub3B0aW9ucy5pbnRlcnBvbGF0aW9uLmZvcm1hdDtcbiAgICBpZiAoIWNhbGxiYWNrKSBjYWxsYmFjayA9IG5vb3A7XG5cbiAgICBmdW5jdGlvbiBjcmVhdGVDbGFzc09uRGVtYW5kKENsYXNzT3JPYmplY3QpIHtcbiAgICAgIGlmICghQ2xhc3NPck9iamVjdCkgcmV0dXJuIG51bGw7XG4gICAgICBpZiAodHlwZW9mIENsYXNzT3JPYmplY3QgPT09ICdmdW5jdGlvbicpIHJldHVybiBuZXcgQ2xhc3NPck9iamVjdCgpO1xuICAgICAgcmV0dXJuIENsYXNzT3JPYmplY3Q7XG4gICAgfVxuXG4gICAgLy8gaW5pdCBzZXJ2aWNlc1xuICAgIGlmICghdGhpcy5vcHRpb25zLmlzQ2xvbmUpIHtcbiAgICAgIGlmICh0aGlzLm1vZHVsZXMubG9nZ2VyKSB7XG4gICAgICAgIGJhc2VMb2dnZXIuaW5pdChjcmVhdGVDbGFzc09uRGVtYW5kKHRoaXMubW9kdWxlcy5sb2dnZXIpLCB0aGlzLm9wdGlvbnMpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYmFzZUxvZ2dlci5pbml0KG51bGwsIHRoaXMub3B0aW9ucyk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGx1ID0gbmV3IExhbmd1YWdlVXRpbHModGhpcy5vcHRpb25zKTtcbiAgICAgIHRoaXMuc3RvcmUgPSBuZXcgUmVzb3VyY2VTdG9yZSh0aGlzLm9wdGlvbnMucmVzb3VyY2VzLCB0aGlzLm9wdGlvbnMpO1xuXG4gICAgICBjb25zdCBzID0gdGhpcy5zZXJ2aWNlcztcbiAgICAgIHMubG9nZ2VyID0gYmFzZUxvZ2dlcjtcbiAgICAgIHMucmVzb3VyY2VTdG9yZSA9IHRoaXMuc3RvcmU7XG4gICAgICBzLmxhbmd1YWdlVXRpbHMgPSBsdTtcbiAgICAgIHMucGx1cmFsUmVzb2x2ZXIgPSBuZXcgUGx1cmFsUmVzb2x2ZXIobHUsIHtcbiAgICAgICAgcHJlcGVuZDogdGhpcy5vcHRpb25zLnBsdXJhbFNlcGFyYXRvcixcbiAgICAgICAgY29tcGF0aWJpbGl0eUpTT046IHRoaXMub3B0aW9ucy5jb21wYXRpYmlsaXR5SlNPTixcbiAgICAgICAgc2ltcGxpZnlQbHVyYWxTdWZmaXg6IHRoaXMub3B0aW9ucy5zaW1wbGlmeVBsdXJhbFN1ZmZpeCxcbiAgICAgIH0pO1xuICAgICAgcy5pbnRlcnBvbGF0b3IgPSBuZXcgSW50ZXJwb2xhdG9yKHRoaXMub3B0aW9ucyk7XG4gICAgICBzLnV0aWxzID0ge1xuICAgICAgICBoYXNMb2FkZWROYW1lc3BhY2U6IHRoaXMuaGFzTG9hZGVkTmFtZXNwYWNlLmJpbmQodGhpcylcbiAgICAgIH1cblxuICAgICAgcy5iYWNrZW5kQ29ubmVjdG9yID0gbmV3IEJhY2tlbmRDb25uZWN0b3IoXG4gICAgICAgIGNyZWF0ZUNsYXNzT25EZW1hbmQodGhpcy5tb2R1bGVzLmJhY2tlbmQpLFxuICAgICAgICBzLnJlc291cmNlU3RvcmUsXG4gICAgICAgIHMsXG4gICAgICAgIHRoaXMub3B0aW9ucyxcbiAgICAgICk7XG4gICAgICAvLyBwaXBlIGV2ZW50cyBmcm9tIGJhY2tlbmRDb25uZWN0b3JcbiAgICAgIHMuYmFja2VuZENvbm5lY3Rvci5vbignKicsIChldmVudCwgLi4uYXJncykgPT4ge1xuICAgICAgICB0aGlzLmVtaXQoZXZlbnQsIC4uLmFyZ3MpO1xuICAgICAgfSk7XG5cbiAgICAgIGlmICh0aGlzLm1vZHVsZXMubGFuZ3VhZ2VEZXRlY3Rvcikge1xuICAgICAgICBzLmxhbmd1YWdlRGV0ZWN0b3IgPSBjcmVhdGVDbGFzc09uRGVtYW5kKHRoaXMubW9kdWxlcy5sYW5ndWFnZURldGVjdG9yKTtcbiAgICAgICAgcy5sYW5ndWFnZURldGVjdG9yLmluaXQocywgdGhpcy5vcHRpb25zLmRldGVjdGlvbiwgdGhpcy5vcHRpb25zKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMubW9kdWxlcy5pMThuRm9ybWF0KSB7XG4gICAgICAgIHMuaTE4bkZvcm1hdCA9IGNyZWF0ZUNsYXNzT25EZW1hbmQodGhpcy5tb2R1bGVzLmkxOG5Gb3JtYXQpO1xuICAgICAgICBpZiAocy5pMThuRm9ybWF0LmluaXQpIHMuaTE4bkZvcm1hdC5pbml0KHRoaXMpO1xuICAgICAgfVxuXG4gICAgICB0aGlzLnRyYW5zbGF0b3IgPSBuZXcgVHJhbnNsYXRvcih0aGlzLnNlcnZpY2VzLCB0aGlzLm9wdGlvbnMpO1xuICAgICAgLy8gcGlwZSBldmVudHMgZnJvbSB0cmFuc2xhdG9yXG4gICAgICB0aGlzLnRyYW5zbGF0b3Iub24oJyonLCAoZXZlbnQsIC4uLmFyZ3MpID0+IHtcbiAgICAgICAgdGhpcy5lbWl0KGV2ZW50LCAuLi5hcmdzKTtcbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLm1vZHVsZXMuZXh0ZXJuYWwuZm9yRWFjaChtID0+IHtcbiAgICAgICAgaWYgKG0uaW5pdCkgbS5pbml0KHRoaXMpO1xuICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIGlmICghdGhpcy5tb2R1bGVzLmxhbmd1YWdlRGV0ZWN0b3IgJiYgIXRoaXMub3B0aW9ucy5sbmcpIHtcbiAgICAgIHRoaXMubG9nZ2VyLndhcm4oJ2luaXQ6IG5vIGxhbmd1YWdlRGV0ZWN0b3IgaXMgdXNlZCBhbmQgbm8gbG5nIGlzIGRlZmluZWQnKTtcbiAgICB9XG5cbiAgICAvLyBhcHBlbmQgYXBpXG4gICAgY29uc3Qgc3RvcmVBcGkgPSBbXG4gICAgICAnZ2V0UmVzb3VyY2UnLFxuICAgICAgJ2FkZFJlc291cmNlJyxcbiAgICAgICdhZGRSZXNvdXJjZXMnLFxuICAgICAgJ2FkZFJlc291cmNlQnVuZGxlJyxcbiAgICAgICdyZW1vdmVSZXNvdXJjZUJ1bmRsZScsXG4gICAgICAnaGFzUmVzb3VyY2VCdW5kbGUnLFxuICAgICAgJ2dldFJlc291cmNlQnVuZGxlJyxcbiAgICAgICdnZXREYXRhQnlMYW5ndWFnZScsXG4gICAgXTtcbiAgICBzdG9yZUFwaS5mb3JFYWNoKGZjTmFtZSA9PiB7XG4gICAgICB0aGlzW2ZjTmFtZV0gPSAoLi4uYXJncykgPT4gdGhpcy5zdG9yZVtmY05hbWVdKC4uLmFyZ3MpO1xuICAgIH0pO1xuXG4gICAgY29uc3QgZGVmZXJyZWQgPSBkZWZlcigpO1xuXG4gICAgY29uc3QgbG9hZCA9ICgpID0+IHtcbiAgICAgIHRoaXMuY2hhbmdlTGFuZ3VhZ2UodGhpcy5vcHRpb25zLmxuZywgKGVyciwgdCkgPT4ge1xuICAgICAgICB0aGlzLmlzSW5pdGlhbGl6ZWQgPSB0cnVlO1xuICAgICAgICB0aGlzLmxvZ2dlci5sb2coJ2luaXRpYWxpemVkJywgdGhpcy5vcHRpb25zKTtcbiAgICAgICAgdGhpcy5lbWl0KCdpbml0aWFsaXplZCcsIHRoaXMub3B0aW9ucyk7XG5cbiAgICAgICAgZGVmZXJyZWQucmVzb2x2ZSh0KTsgLy8gbm90IHJlamVjdGluZyBvbiBlcnIgKGFzIGVyciBpcyBvbmx5IGEgbG9hZGluZyB0cmFuc2xhdGlvbiBmYWlsZWQgd2FybmluZylcbiAgICAgICAgY2FsbGJhY2soZXJyLCB0KTtcbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLnJlc291cmNlcyB8fCAhdGhpcy5vcHRpb25zLmluaXRJbW1lZGlhdGUpIHtcbiAgICAgIGxvYWQoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgc2V0VGltZW91dChsb2FkLCAwKTtcbiAgICB9XG5cbiAgICByZXR1cm4gZGVmZXJyZWQ7XG4gIH1cblxuICAvKiBlc2xpbnQgY29uc2lzdGVudC1yZXR1cm46IDAgKi9cbiAgbG9hZFJlc291cmNlcyhsYW5ndWFnZSwgY2FsbGJhY2sgPSBub29wKSB7XG4gICAgbGV0IHVzZWRDYWxsYmFjayA9IGNhbGxiYWNrO1xuICAgIGxldCB1c2VkTG5nID0gdHlwZW9mIGxhbmd1YWdlID09PSAnc3RyaW5nJyA/IGxhbmd1YWdlIDogdGhpcy5sYW5ndWFnZTtcbiAgICBpZiAodHlwZW9mIGxhbmd1YWdlID09PSAnZnVuY3Rpb24nKSB1c2VkQ2FsbGJhY2sgPSBsYW5ndWFnZTtcblxuICAgIGlmICghdGhpcy5vcHRpb25zLnJlc291cmNlcyB8fCB0aGlzLm9wdGlvbnMucGFydGlhbEJ1bmRsZWRMYW5ndWFnZXMpIHtcbiAgICAgIGlmICh1c2VkTG5nICYmIHVzZWRMbmcudG9Mb3dlckNhc2UoKSA9PT0gJ2NpbW9kZScpIHJldHVybiB1c2VkQ2FsbGJhY2soKTsgLy8gYXZvaWQgbG9hZGluZyByZXNvdXJjZXMgZm9yIGNpbW9kZVxuXG4gICAgICBjb25zdCB0b0xvYWQgPSBbXTtcblxuICAgICAgY29uc3QgYXBwZW5kID0gbG5nID0+IHtcbiAgICAgICAgaWYgKCFsbmcpIHJldHVybjtcbiAgICAgICAgY29uc3QgbG5ncyA9IHRoaXMuc2VydmljZXMubGFuZ3VhZ2VVdGlscy50b1Jlc29sdmVIaWVyYXJjaHkobG5nKTtcbiAgICAgICAgbG5ncy5mb3JFYWNoKGwgPT4ge1xuICAgICAgICAgIGlmICh0b0xvYWQuaW5kZXhPZihsKSA8IDApIHRvTG9hZC5wdXNoKGwpO1xuICAgICAgICB9KTtcbiAgICAgIH07XG5cbiAgICAgIGlmICghdXNlZExuZykge1xuICAgICAgICAvLyBhdCBsZWFzdCBsb2FkIGZhbGxiYWNrcyBpbiB0aGlzIGNhc2VcbiAgICAgICAgY29uc3QgZmFsbGJhY2tzID0gdGhpcy5zZXJ2aWNlcy5sYW5ndWFnZVV0aWxzLmdldEZhbGxiYWNrQ29kZXModGhpcy5vcHRpb25zLmZhbGxiYWNrTG5nKTtcbiAgICAgICAgZmFsbGJhY2tzLmZvckVhY2gobCA9PiBhcHBlbmQobCkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYXBwZW5kKHVzZWRMbmcpO1xuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5vcHRpb25zLnByZWxvYWQpIHtcbiAgICAgICAgdGhpcy5vcHRpb25zLnByZWxvYWQuZm9yRWFjaChsID0+IGFwcGVuZChsKSk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMuc2VydmljZXMuYmFja2VuZENvbm5lY3Rvci5sb2FkKHRvTG9hZCwgdGhpcy5vcHRpb25zLm5zLCB1c2VkQ2FsbGJhY2spO1xuICAgIH0gZWxzZSB7XG4gICAgICB1c2VkQ2FsbGJhY2sobnVsbCk7XG4gICAgfVxuICB9XG5cbiAgcmVsb2FkUmVzb3VyY2VzKGxuZ3MsIG5zLCBjYWxsYmFjaykge1xuICAgIGNvbnN0IGRlZmVycmVkID0gZGVmZXIoKTtcbiAgICBpZiAoIWxuZ3MpIGxuZ3MgPSB0aGlzLmxhbmd1YWdlcztcbiAgICBpZiAoIW5zKSBucyA9IHRoaXMub3B0aW9ucy5ucztcbiAgICBpZiAoIWNhbGxiYWNrKSBjYWxsYmFjayA9IG5vb3A7XG4gICAgdGhpcy5zZXJ2aWNlcy5iYWNrZW5kQ29ubmVjdG9yLnJlbG9hZChsbmdzLCBucywgZXJyID0+IHtcbiAgICAgIGRlZmVycmVkLnJlc29sdmUoKTsgLy8gbm90IHJlamVjdGluZyBvbiBlcnIgKGFzIGVyciBpcyBvbmx5IGEgbG9hZGluZyB0cmFuc2xhdGlvbiBmYWlsZWQgd2FybmluZylcbiAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgfSk7XG4gICAgcmV0dXJuIGRlZmVycmVkO1xuICB9XG5cbiAgdXNlKG1vZHVsZSkge1xuICAgIGlmICghbW9kdWxlKSB0aHJvdyBuZXcgRXJyb3IoJ1lvdSBhcmUgcGFzc2luZyBhbiB1bmRlZmluZWQgbW9kdWxlISBQbGVhc2UgY2hlY2sgdGhlIG9iamVjdCB5b3UgYXJlIHBhc3NpbmcgdG8gaTE4bmV4dC51c2UoKScpXG4gICAgaWYgKCFtb2R1bGUudHlwZSkgdGhyb3cgbmV3IEVycm9yKCdZb3UgYXJlIHBhc3NpbmcgYSB3cm9uZyBtb2R1bGUhIFBsZWFzZSBjaGVjayB0aGUgb2JqZWN0IHlvdSBhcmUgcGFzc2luZyB0byBpMThuZXh0LnVzZSgpJylcblxuICAgIGlmIChtb2R1bGUudHlwZSA9PT0gJ2JhY2tlbmQnKSB7XG4gICAgICB0aGlzLm1vZHVsZXMuYmFja2VuZCA9IG1vZHVsZTtcbiAgICB9XG5cbiAgICBpZiAobW9kdWxlLnR5cGUgPT09ICdsb2dnZXInIHx8IChtb2R1bGUubG9nICYmIG1vZHVsZS53YXJuICYmIG1vZHVsZS5lcnJvcikpIHtcbiAgICAgIHRoaXMubW9kdWxlcy5sb2dnZXIgPSBtb2R1bGU7XG4gICAgfVxuXG4gICAgaWYgKG1vZHVsZS50eXBlID09PSAnbGFuZ3VhZ2VEZXRlY3RvcicpIHtcbiAgICAgIHRoaXMubW9kdWxlcy5sYW5ndWFnZURldGVjdG9yID0gbW9kdWxlO1xuICAgIH1cblxuICAgIGlmIChtb2R1bGUudHlwZSA9PT0gJ2kxOG5Gb3JtYXQnKSB7XG4gICAgICB0aGlzLm1vZHVsZXMuaTE4bkZvcm1hdCA9IG1vZHVsZTtcbiAgICB9XG5cbiAgICBpZiAobW9kdWxlLnR5cGUgPT09ICdwb3N0UHJvY2Vzc29yJykge1xuICAgICAgcG9zdFByb2Nlc3Nvci5hZGRQb3N0UHJvY2Vzc29yKG1vZHVsZSk7XG4gICAgfVxuXG4gICAgaWYgKG1vZHVsZS50eXBlID09PSAnM3JkUGFydHknKSB7XG4gICAgICB0aGlzLm1vZHVsZXMuZXh0ZXJuYWwucHVzaChtb2R1bGUpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgY2hhbmdlTGFuZ3VhZ2UobG5nLCBjYWxsYmFjaykge1xuICAgIHRoaXMuaXNMYW5ndWFnZUNoYW5naW5nVG8gPSBsbmc7XG4gICAgY29uc3QgZGVmZXJyZWQgPSBkZWZlcigpO1xuICAgIHRoaXMuZW1pdCgnbGFuZ3VhZ2VDaGFuZ2luZycsIGxuZyk7XG5cbiAgICBjb25zdCBkb25lID0gKGVyciwgbCkgPT4ge1xuICAgICAgaWYgKGwpIHtcbiAgICAgICAgdGhpcy5sYW5ndWFnZSA9IGw7XG4gICAgICAgIHRoaXMubGFuZ3VhZ2VzID0gdGhpcy5zZXJ2aWNlcy5sYW5ndWFnZVV0aWxzLnRvUmVzb2x2ZUhpZXJhcmNoeShsKTtcbiAgICAgICAgdGhpcy50cmFuc2xhdG9yLmNoYW5nZUxhbmd1YWdlKGwpO1xuICAgICAgICB0aGlzLmlzTGFuZ3VhZ2VDaGFuZ2luZ1RvID0gdW5kZWZpbmVkO1xuICAgICAgICB0aGlzLmVtaXQoJ2xhbmd1YWdlQ2hhbmdlZCcsIGwpO1xuICAgICAgICB0aGlzLmxvZ2dlci5sb2coJ2xhbmd1YWdlQ2hhbmdlZCcsIGwpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5pc0xhbmd1YWdlQ2hhbmdpbmdUbyA9IHVuZGVmaW5lZDtcbiAgICAgIH1cblxuICAgICAgZGVmZXJyZWQucmVzb2x2ZSgoLi4uYXJncykgPT4gdGhpcy50KC4uLmFyZ3MpKTtcbiAgICAgIGlmIChjYWxsYmFjaykgY2FsbGJhY2soZXJyLCAoLi4uYXJncykgPT4gdGhpcy50KC4uLmFyZ3MpKTtcbiAgICB9O1xuXG4gICAgY29uc3Qgc2V0TG5nID0gbCA9PiB7XG4gICAgICBpZiAobCkge1xuICAgICAgICBpZiAoIXRoaXMubGFuZ3VhZ2UpIHtcbiAgICAgICAgICB0aGlzLmxhbmd1YWdlID0gbDtcbiAgICAgICAgICB0aGlzLmxhbmd1YWdlcyA9IHRoaXMuc2VydmljZXMubGFuZ3VhZ2VVdGlscy50b1Jlc29sdmVIaWVyYXJjaHkobCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCF0aGlzLnRyYW5zbGF0b3IubGFuZ3VhZ2UpIHRoaXMudHJhbnNsYXRvci5jaGFuZ2VMYW5ndWFnZShsKTtcblxuICAgICAgICBpZiAodGhpcy5zZXJ2aWNlcy5sYW5ndWFnZURldGVjdG9yKSB0aGlzLnNlcnZpY2VzLmxhbmd1YWdlRGV0ZWN0b3IuY2FjaGVVc2VyTGFuZ3VhZ2UobCk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMubG9hZFJlc291cmNlcyhsLCBlcnIgPT4ge1xuICAgICAgICBkb25lKGVyciwgbCk7XG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgaWYgKCFsbmcgJiYgdGhpcy5zZXJ2aWNlcy5sYW5ndWFnZURldGVjdG9yICYmICF0aGlzLnNlcnZpY2VzLmxhbmd1YWdlRGV0ZWN0b3IuYXN5bmMpIHtcbiAgICAgIHNldExuZyh0aGlzLnNlcnZpY2VzLmxhbmd1YWdlRGV0ZWN0b3IuZGV0ZWN0KCkpO1xuICAgIH0gZWxzZSBpZiAoIWxuZyAmJiB0aGlzLnNlcnZpY2VzLmxhbmd1YWdlRGV0ZWN0b3IgJiYgdGhpcy5zZXJ2aWNlcy5sYW5ndWFnZURldGVjdG9yLmFzeW5jKSB7XG4gICAgICB0aGlzLnNlcnZpY2VzLmxhbmd1YWdlRGV0ZWN0b3IuZGV0ZWN0KHNldExuZyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHNldExuZyhsbmcpO1xuICAgIH1cblxuICAgIHJldHVybiBkZWZlcnJlZDtcbiAgfVxuXG4gIGdldEZpeGVkVChsbmcsIG5zKSB7XG4gICAgY29uc3QgZml4ZWRUID0gKGtleSwgb3B0cywgLi4ucmVzdCkgPT4ge1xuICAgICAgbGV0IG9wdGlvbnM7XG4gICAgICBpZiAodHlwZW9mIG9wdHMgIT09ICdvYmplY3QnKSB7XG4gICAgICAgIG9wdGlvbnMgPSB0aGlzLm9wdGlvbnMub3ZlcmxvYWRUcmFuc2xhdGlvbk9wdGlvbkhhbmRsZXIoW2tleSwgb3B0c10uY29uY2F0KHJlc3QpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG9wdGlvbnMgPSB7IC4uLm9wdHMgfTtcbiAgICAgIH1cblxuICAgICAgb3B0aW9ucy5sbmcgPSBvcHRpb25zLmxuZyB8fCBmaXhlZFQubG5nO1xuICAgICAgb3B0aW9ucy5sbmdzID0gb3B0aW9ucy5sbmdzIHx8IGZpeGVkVC5sbmdzO1xuICAgICAgb3B0aW9ucy5ucyA9IG9wdGlvbnMubnMgfHwgZml4ZWRULm5zO1xuICAgICAgcmV0dXJuIHRoaXMudChrZXksIG9wdGlvbnMpO1xuICAgIH07XG4gICAgaWYgKHR5cGVvZiBsbmcgPT09ICdzdHJpbmcnKSB7XG4gICAgICBmaXhlZFQubG5nID0gbG5nO1xuICAgIH0gZWxzZSB7XG4gICAgICBmaXhlZFQubG5ncyA9IGxuZztcbiAgICB9XG4gICAgZml4ZWRULm5zID0gbnM7XG4gICAgcmV0dXJuIGZpeGVkVDtcbiAgfVxuXG4gIHQoLi4uYXJncykge1xuICAgIHJldHVybiB0aGlzLnRyYW5zbGF0b3IgJiYgdGhpcy50cmFuc2xhdG9yLnRyYW5zbGF0ZSguLi5hcmdzKTtcbiAgfVxuXG4gIGV4aXN0cyguLi5hcmdzKSB7XG4gICAgcmV0dXJuIHRoaXMudHJhbnNsYXRvciAmJiB0aGlzLnRyYW5zbGF0b3IuZXhpc3RzKC4uLmFyZ3MpO1xuICB9XG5cbiAgc2V0RGVmYXVsdE5hbWVzcGFjZShucykge1xuICAgIHRoaXMub3B0aW9ucy5kZWZhdWx0TlMgPSBucztcbiAgfVxuXG4gIGhhc0xvYWRlZE5hbWVzcGFjZShucykge1xuICAgIGlmICghdGhpcy5pc0luaXRpYWxpemVkKSB7XG4gICAgICB0aGlzLmxvZ2dlci53YXJuKCdoYXNMb2FkZWROYW1lc3BhY2U6IGkxOG5leHQgd2FzIG5vdCBpbml0aWFsaXplZCcsIHRoaXMubGFuZ3VhZ2VzKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgaWYgKCF0aGlzLmxhbmd1YWdlcyB8fCAhdGhpcy5sYW5ndWFnZXMubGVuZ3RoKSB7XG4gICAgICB0aGlzLmxvZ2dlci53YXJuKCdoYXNMb2FkZWROYW1lc3BhY2U6IGkxOG4ubGFuZ3VhZ2VzIHdlcmUgdW5kZWZpbmVkIG9yIGVtcHR5JywgdGhpcy5sYW5ndWFnZXMpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGNvbnN0IGxuZyA9IHRoaXMubGFuZ3VhZ2VzWzBdO1xuICAgIGNvbnN0IGZhbGxiYWNrTG5nID0gdGhpcy5vcHRpb25zID8gdGhpcy5vcHRpb25zLmZhbGxiYWNrTG5nIDogZmFsc2U7XG4gICAgY29uc3QgbGFzdExuZyA9IHRoaXMubGFuZ3VhZ2VzW3RoaXMubGFuZ3VhZ2VzLmxlbmd0aCAtIDFdO1xuXG4gICAgLy8gd2UncmUgaW4gY2ltb2RlIHNvIHRoaXMgc2hhbGwgcGFzc1xuICAgIGlmIChsbmcudG9Mb3dlckNhc2UoKSA9PT0gJ2NpbW9kZScpIHJldHVybiB0cnVlO1xuXG4gICAgY29uc3QgbG9hZE5vdFBlbmRpbmcgPSAobCwgbikgPT4ge1xuICAgICAgY29uc3QgbG9hZFN0YXRlID0gdGhpcy5zZXJ2aWNlcy5iYWNrZW5kQ29ubmVjdG9yLnN0YXRlW2Ake2x9fCR7bn1gXTtcbiAgICAgIHJldHVybiBsb2FkU3RhdGUgPT09IC0xIHx8IGxvYWRTdGF0ZSA9PT0gMjtcbiAgICB9O1xuXG4gICAgLy8gbG9hZGVkIC0+IFNVQ0NFU1NcbiAgICBpZiAodGhpcy5oYXNSZXNvdXJjZUJ1bmRsZShsbmcsIG5zKSkgcmV0dXJuIHRydWU7XG5cbiAgICAvLyB3ZXJlIG5vdCBsb2FkaW5nIGF0IGFsbCAtPiBTRU1JIFNVQ0NFU1NcbiAgICBpZiAoIXRoaXMuc2VydmljZXMuYmFja2VuZENvbm5lY3Rvci5iYWNrZW5kKSByZXR1cm4gdHJ1ZTtcblxuICAgIC8vIGZhaWxlZCBsb2FkaW5nIG5zIC0gYnV0IGF0IGxlYXN0IGZhbGxiYWNrIGlzIG5vdCBwZW5kaW5nIC0+IFNFTUkgU1VDQ0VTU1xuICAgIGlmIChsb2FkTm90UGVuZGluZyhsbmcsIG5zKSAmJiAoIWZhbGxiYWNrTG5nIHx8IGxvYWROb3RQZW5kaW5nKGxhc3RMbmcsIG5zKSkpIHJldHVybiB0cnVlO1xuXG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgbG9hZE5hbWVzcGFjZXMobnMsIGNhbGxiYWNrKSB7XG4gICAgY29uc3QgZGVmZXJyZWQgPSBkZWZlcigpO1xuXG4gICAgaWYgKCF0aGlzLm9wdGlvbnMubnMpIHtcbiAgICAgIGNhbGxiYWNrICYmIGNhbGxiYWNrKCk7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgfVxuICAgIGlmICh0eXBlb2YgbnMgPT09ICdzdHJpbmcnKSBucyA9IFtuc107XG5cbiAgICBucy5mb3JFYWNoKG4gPT4ge1xuICAgICAgaWYgKHRoaXMub3B0aW9ucy5ucy5pbmRleE9mKG4pIDwgMCkgdGhpcy5vcHRpb25zLm5zLnB1c2gobik7XG4gICAgfSk7XG5cbiAgICB0aGlzLmxvYWRSZXNvdXJjZXMoZXJyID0+IHtcbiAgICAgIGRlZmVycmVkLnJlc29sdmUoKTtcbiAgICAgIGlmIChjYWxsYmFjaykgY2FsbGJhY2soZXJyKTtcbiAgICB9KTtcblxuICAgIHJldHVybiBkZWZlcnJlZDtcbiAgfVxuXG4gIGxvYWRMYW5ndWFnZXMobG5ncywgY2FsbGJhY2spIHtcbiAgICBjb25zdCBkZWZlcnJlZCA9IGRlZmVyKCk7XG5cbiAgICBpZiAodHlwZW9mIGxuZ3MgPT09ICdzdHJpbmcnKSBsbmdzID0gW2xuZ3NdO1xuICAgIGNvbnN0IHByZWxvYWRlZCA9IHRoaXMub3B0aW9ucy5wcmVsb2FkIHx8IFtdO1xuXG4gICAgY29uc3QgbmV3TG5ncyA9IGxuZ3MuZmlsdGVyKGxuZyA9PiBwcmVsb2FkZWQuaW5kZXhPZihsbmcpIDwgMCk7XG4gICAgLy8gRXhpdCBlYXJseSBpZiBhbGwgZ2l2ZW4gbGFuZ3VhZ2VzIGFyZSBhbHJlYWR5IHByZWxvYWRlZFxuICAgIGlmICghbmV3TG5ncy5sZW5ndGgpIHtcbiAgICAgIGlmIChjYWxsYmFjaykgY2FsbGJhY2soKTtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcbiAgICB9XG5cbiAgICB0aGlzLm9wdGlvbnMucHJlbG9hZCA9IHByZWxvYWRlZC5jb25jYXQobmV3TG5ncyk7XG4gICAgdGhpcy5sb2FkUmVzb3VyY2VzKGVyciA9PiB7XG4gICAgICBkZWZlcnJlZC5yZXNvbHZlKCk7XG4gICAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrKGVycik7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gZGVmZXJyZWQ7XG4gIH1cblxuICBkaXIobG5nKSB7XG4gICAgaWYgKCFsbmcpIGxuZyA9IHRoaXMubGFuZ3VhZ2VzICYmIHRoaXMubGFuZ3VhZ2VzLmxlbmd0aCA+IDAgPyB0aGlzLmxhbmd1YWdlc1swXSA6IHRoaXMubGFuZ3VhZ2U7XG4gICAgaWYgKCFsbmcpIHJldHVybiAncnRsJztcblxuICAgIGNvbnN0IHJ0bExuZ3MgPSBbXG4gICAgICAnYXInLFxuICAgICAgJ3NodScsXG4gICAgICAnc3FyJyxcbiAgICAgICdzc2gnLFxuICAgICAgJ3hhYScsXG4gICAgICAneWhkJyxcbiAgICAgICd5dWQnLFxuICAgICAgJ2FhbycsXG4gICAgICAnYWJoJyxcbiAgICAgICdhYnYnLFxuICAgICAgJ2FjbScsXG4gICAgICAnYWNxJyxcbiAgICAgICdhY3cnLFxuICAgICAgJ2FjeCcsXG4gICAgICAnYWN5JyxcbiAgICAgICdhZGYnLFxuICAgICAgJ2FkcycsXG4gICAgICAnYWViJyxcbiAgICAgICdhZWMnLFxuICAgICAgJ2FmYicsXG4gICAgICAnYWpwJyxcbiAgICAgICdhcGMnLFxuICAgICAgJ2FwZCcsXG4gICAgICAnYXJiJyxcbiAgICAgICdhcnEnLFxuICAgICAgJ2FycycsXG4gICAgICAnYXJ5JyxcbiAgICAgICdhcnonLFxuICAgICAgJ2F1eicsXG4gICAgICAnYXZsJyxcbiAgICAgICdheWgnLFxuICAgICAgJ2F5bCcsXG4gICAgICAnYXluJyxcbiAgICAgICdheXAnLFxuICAgICAgJ2JieicsXG4gICAgICAncGdhJyxcbiAgICAgICdoZScsXG4gICAgICAnaXcnLFxuICAgICAgJ3BzJyxcbiAgICAgICdwYnQnLFxuICAgICAgJ3BidScsXG4gICAgICAncHN0JyxcbiAgICAgICdwcnAnLFxuICAgICAgJ3ByZCcsXG4gICAgICAndXInLFxuICAgICAgJ3lkZCcsXG4gICAgICAneWRzJyxcbiAgICAgICd5aWgnLFxuICAgICAgJ2ppJyxcbiAgICAgICd5aScsXG4gICAgICAnaGJvJyxcbiAgICAgICdtZW4nLFxuICAgICAgJ3htbicsXG4gICAgICAnZmEnLFxuICAgICAgJ2pwcicsXG4gICAgICAncGVvJyxcbiAgICAgICdwZXMnLFxuICAgICAgJ3BycycsXG4gICAgICAnZHYnLFxuICAgICAgJ3NhbScsXG4gICAgXTtcblxuICAgIHJldHVybiBydGxMbmdzLmluZGV4T2YodGhpcy5zZXJ2aWNlcy5sYW5ndWFnZVV0aWxzLmdldExhbmd1YWdlUGFydEZyb21Db2RlKGxuZykpID49IDBcbiAgICAgID8gJ3J0bCdcbiAgICAgIDogJ2x0cic7XG4gIH1cblxuICAvKiBlc2xpbnQgY2xhc3MtbWV0aG9kcy11c2UtdGhpczogMCAqL1xuICBjcmVhdGVJbnN0YW5jZShvcHRpb25zID0ge30sIGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIG5ldyBJMThuKG9wdGlvbnMsIGNhbGxiYWNrKTtcbiAgfVxuXG4gIGNsb25lSW5zdGFuY2Uob3B0aW9ucyA9IHt9LCBjYWxsYmFjayA9IG5vb3ApIHtcbiAgICBjb25zdCBtZXJnZWRPcHRpb25zID0geyAuLi50aGlzLm9wdGlvbnMsIC4uLm9wdGlvbnMsIC4uLnsgaXNDbG9uZTogdHJ1ZSB9IH07XG4gICAgY29uc3QgY2xvbmUgPSBuZXcgSTE4bihtZXJnZWRPcHRpb25zKTtcbiAgICBjb25zdCBtZW1iZXJzVG9Db3B5ID0gWydzdG9yZScsICdzZXJ2aWNlcycsICdsYW5ndWFnZSddO1xuICAgIG1lbWJlcnNUb0NvcHkuZm9yRWFjaChtID0+IHtcbiAgICAgIGNsb25lW21dID0gdGhpc1ttXTtcbiAgICB9KTtcbiAgICBjbG9uZS5zZXJ2aWNlcyA9IHsgLi4udGhpcy5zZXJ2aWNlcyB9O1xuICAgIGNsb25lLnNlcnZpY2VzLnV0aWxzID0ge1xuICAgICAgaGFzTG9hZGVkTmFtZXNwYWNlOiBjbG9uZS5oYXNMb2FkZWROYW1lc3BhY2UuYmluZChjbG9uZSlcbiAgICB9O1xuICAgIGNsb25lLnRyYW5zbGF0b3IgPSBuZXcgVHJhbnNsYXRvcihjbG9uZS5zZXJ2aWNlcywgY2xvbmUub3B0aW9ucyk7XG4gICAgY2xvbmUudHJhbnNsYXRvci5vbignKicsIChldmVudCwgLi4uYXJncykgPT4ge1xuICAgICAgY2xvbmUuZW1pdChldmVudCwgLi4uYXJncyk7XG4gICAgfSk7XG4gICAgY2xvbmUuaW5pdChtZXJnZWRPcHRpb25zLCBjYWxsYmFjayk7XG4gICAgY2xvbmUudHJhbnNsYXRvci5vcHRpb25zID0gY2xvbmUub3B0aW9uczsgLy8gc3luYyBvcHRpb25zXG4gICAgY2xvbmUudHJhbnNsYXRvci5iYWNrZW5kQ29ubmVjdG9yLnNlcnZpY2VzLnV0aWxzID0ge1xuICAgICAgaGFzTG9hZGVkTmFtZXNwYWNlOiBjbG9uZS5oYXNMb2FkZWROYW1lc3BhY2UuYmluZChjbG9uZSlcbiAgICB9O1xuXG4gICAgcmV0dXJuIGNsb25lO1xuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IG5ldyBJMThuKCk7XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5hbWVzcGFjZVxuICovXG5cbmltcG9ydCB7XG4gICAgZGVmYXVsdCBhcyBpMThuZXh0LFxuICAgIGkxOG4gYXMgaTE4bmV4dEluc3RhbmNlLFxuICAgIEZhbGxiYWNrTG5nT2JqTGlzdCBhcyBpMThuZXh0RmFsbGJhY2tMbmdPYmpMaXN0LFxuICAgIEZhbGxiYWNrTG5nIGFzIGkxOG5leHRGYWxsYmFja0xuZyxcbiAgICBGb3JtYXRGdW5jdGlvbiBhcyBpMThuZXh0Rm9ybWF0RnVuY3Rpb24sXG4gICAgSW50ZXJwb2xhdGlvbk9wdGlvbnMgYXMgaTE4bmV4dEludGVycG9sYXRpb25PcHRpb25zLFxuICAgIFJlYWN0T3B0aW9ucyBhcyBpMThuZXh0UmVhY3RPcHRpb25zLFxuICAgIEluaXRPcHRpb25zIGFzIGkxOG5leHRJbml0T3B0aW9ucyxcbiAgICBUT3B0aW9uc0Jhc2UgYXMgaTE4bmV4dFRPcHRpb25zQmFzZSxcbiAgICBTdHJpbmdNYXAgYXMgaTE4bmV4dFN0cmluZ01hcCxcbiAgICBUT3B0aW9ucyBhcyBpMThuZXh0VE9wdGlvbnMsXG4gICAgQ2FsbGJhY2sgYXMgaTE4bmV4dENhbGxiYWNrLFxuICAgIEV4aXN0c0Z1bmN0aW9uIGFzIGkxOG5leHRFeGlzdHNGdW5jdGlvbixcbiAgICBXaXRoVCBhcyBpMThuZXh0V2l0aFQsXG4gICAgVEZ1bmN0aW9uUmVzdWx0IGFzIGkxOG5leHRURnVuY3Rpb25SZXN1bHQsXG4gICAgVEZ1bmN0aW9uS2V5cyBhcyBpMThuZXh0VEZ1bmN0aW9uS2V5cyxcbiAgICBURnVuY3Rpb24gYXMgaTE4bmV4dFRGdW5jdGlvbixcbiAgICBSZXNvdXJjZSBhcyBpMThuZXh0UmVzb3VyY2UsXG4gICAgUmVzb3VyY2VMYW5ndWFnZSBhcyBpMThuZXh0UmVzb3VyY2VMYW5ndWFnZSxcbiAgICBSZXNvdXJjZUtleSBhcyBpMThuZXh0UmVzb3VyY2VLZXksXG4gICAgSW50ZXJwb2xhdG9yIGFzIGkxOG5leHRJbnRlcnBvbGF0b3IsXG4gICAgUmVzb3VyY2VTdG9yZSBhcyBpMThuZXh0UmVzb3VyY2VTdG9yZSxcbiAgICBTZXJ2aWNlcyBhcyBpMThuZXh0U2VydmljZXMsXG4gICAgTW9kdWxlIGFzIGkxOG5leHRNb2R1bGUsXG4gICAgQ2FsbGJhY2tFcnJvciBhcyBpMThuZXh0Q2FsbGJhY2tFcnJvcixcbiAgICBSZWFkQ2FsbGJhY2sgYXMgaTE4bmV4dFJlYWRDYWxsYmFjayxcbiAgICBNdWx0aVJlYWRDYWxsYmFjayBhcyBpMThuZXh0TXVsdGlSZWFkQ2FsbGJhY2ssXG4gICAgQmFja2VuZE1vZHVsZSBhcyBpMThuZXh0QmFja2VuZE1vZHVsZSxcbiAgICBMYW5ndWFnZURldGVjdG9yTW9kdWxlIGFzIGkxOG5leHRMYW5ndWFnZURldGVjdG9yTW9kdWxlLFxuICAgIExhbmd1YWdlRGV0ZWN0b3JBc3luY01vZHVsZSBhcyBpMThuZXh0TGFuZ3VhZ2VEZXRlY3RvckFzeW5jTW9kdWxlLFxuICAgIFBvc3RQcm9jZXNzb3JNb2R1bGUgYXMgaTE4bmV4dFBvc3RQcm9jZXNzb3JNb2R1bGUsXG4gICAgTG9nZ2VyTW9kdWxlIGFzIGkxOG5leHRMb2dnZXJNb2R1bGUsXG4gICAgSTE4bkZvcm1hdE1vZHVsZSBhcyBpMThuZXh0STE4bkZvcm1hdE1vZHVsZSxcbiAgICBUaGlyZFBhcnR5TW9kdWxlIGFzIGkxOG5leHRUaGlyZFBhcnR5TW9kdWxlLFxuICAgIE1vZHVsZXMgYXMgaTE4bmV4dE1vZHVsZXMsXG4gICAgTmV3YWJsZSBhcyBpMThuZXh0TmV3YWJsZSxcbn0gZnJvbSAnaTE4bmV4dCc7XG5cbmNvbnN0IGkxOG46IGkxOG4uaTE4biA9IGkxOG5leHQ7XG5cbmRlY2xhcmUgbmFtZXNwYWNlIGkxOG4ge1xuICAgIGV4cG9ydCB0eXBlIGkxOG4gPSBpMThuZXh0SW5zdGFuY2U7XG4gICAgZXhwb3J0IHR5cGUgRmFsbGJhY2tMbmdPYmpMaXN0ID0gaTE4bmV4dEZhbGxiYWNrTG5nT2JqTGlzdDtcbiAgICBleHBvcnQgdHlwZSBGYWxsYmFja0xuZyA9IGkxOG5leHRGYWxsYmFja0xuZztcbiAgICBleHBvcnQgdHlwZSBGb3JtYXRGdW5jdGlvbiA9IGkxOG5leHRGb3JtYXRGdW5jdGlvbjtcbiAgICBleHBvcnQgdHlwZSBJbnRlcnBvbGF0aW9uT3B0aW9ucyA9IGkxOG5leHRJbnRlcnBvbGF0aW9uT3B0aW9ucztcbiAgICBleHBvcnQgdHlwZSBSZWFjdE9wdGlvbnMgPSBpMThuZXh0UmVhY3RPcHRpb25zO1xuICAgIGV4cG9ydCB0eXBlIEluaXRPcHRpb25zID0gaTE4bmV4dEluaXRPcHRpb25zO1xuICAgIGV4cG9ydCB0eXBlIFRPcHRpb25zQmFzZSA9IGkxOG5leHRUT3B0aW9uc0Jhc2U7XG4gICAgZXhwb3J0IHR5cGUgU3RyaW5nTWFwID0gaTE4bmV4dFN0cmluZ01hcDtcbiAgICBleHBvcnQgdHlwZSBUT3B0aW9uczxUIGV4dGVuZHMgb2JqZWN0ID0gU3RyaW5nTWFwPiA9IGkxOG5leHRUT3B0aW9uczxUPjtcbiAgICBleHBvcnQgdHlwZSBDYWxsYmFjayA9IGkxOG5leHRDYWxsYmFjaztcbiAgICBleHBvcnQgdHlwZSBFeGlzdHNGdW5jdGlvbjxLIGV4dGVuZHMgc3RyaW5nID0gc3RyaW5nLCBUIGV4dGVuZHMgb2JqZWN0ID0gU3RyaW5nTWFwPiA9IGkxOG5leHRFeGlzdHNGdW5jdGlvbjxLLCBUPjtcbiAgICBleHBvcnQgdHlwZSBXaXRoVCA9IGkxOG5leHRXaXRoVDtcbiAgICBleHBvcnQgdHlwZSBURnVuY3Rpb25SZXN1bHQgPSBpMThuZXh0VEZ1bmN0aW9uUmVzdWx0O1xuICAgIGV4cG9ydCB0eXBlIFRGdW5jdGlvbktleXMgPSBpMThuZXh0VEZ1bmN0aW9uS2V5cztcbiAgICBleHBvcnQgdHlwZSBURnVuY3Rpb24gPSBpMThuZXh0VEZ1bmN0aW9uO1xuICAgIGV4cG9ydCB0eXBlIFJlc291cmNlID0gaTE4bmV4dFJlc291cmNlO1xuICAgIGV4cG9ydCB0eXBlIFJlc291cmNlTGFuZ3VhZ2UgPSBpMThuZXh0UmVzb3VyY2VMYW5ndWFnZTtcbiAgICBleHBvcnQgdHlwZSBSZXNvdXJjZUtleSA9IGkxOG5leHRSZXNvdXJjZUtleTtcbiAgICBleHBvcnQgdHlwZSBJbnRlcnBvbGF0b3IgPSBpMThuZXh0SW50ZXJwb2xhdG9yO1xuICAgIGV4cG9ydCB0eXBlIFJlc291cmNlU3RvcmUgPSBpMThuZXh0UmVzb3VyY2VTdG9yZTtcbiAgICBleHBvcnQgdHlwZSBTZXJ2aWNlcyA9IGkxOG5leHRTZXJ2aWNlcztcbiAgICBleHBvcnQgdHlwZSBNb2R1bGUgPSBpMThuZXh0TW9kdWxlO1xuICAgIGV4cG9ydCB0eXBlIENhbGxiYWNrRXJyb3IgPSBpMThuZXh0Q2FsbGJhY2tFcnJvcjtcbiAgICBleHBvcnQgdHlwZSBSZWFkQ2FsbGJhY2sgPSBpMThuZXh0UmVhZENhbGxiYWNrO1xuICAgIGV4cG9ydCB0eXBlIE11bHRpUmVhZENhbGxiYWNrID0gaTE4bmV4dE11bHRpUmVhZENhbGxiYWNrO1xuICAgIGV4cG9ydCB0eXBlIEJhY2tlbmRNb2R1bGU8VCA9IG9iamVjdD4gPSBpMThuZXh0QmFja2VuZE1vZHVsZTxUPjtcbiAgICBleHBvcnQgdHlwZSBMYW5ndWFnZURldGVjdG9yTW9kdWxlID0gaTE4bmV4dExhbmd1YWdlRGV0ZWN0b3JNb2R1bGU7XG4gICAgZXhwb3J0IHR5cGUgTGFuZ3VhZ2VEZXRlY3RvckFzeW5jTW9kdWxlID0gaTE4bmV4dExhbmd1YWdlRGV0ZWN0b3JBc3luY01vZHVsZTtcbiAgICBleHBvcnQgdHlwZSBQb3N0UHJvY2Vzc29yTW9kdWxlID0gaTE4bmV4dFBvc3RQcm9jZXNzb3JNb2R1bGU7XG4gICAgZXhwb3J0IHR5cGUgTG9nZ2VyTW9kdWxlID0gaTE4bmV4dExvZ2dlck1vZHVsZTtcbiAgICBleHBvcnQgdHlwZSBJMThuRm9ybWF0TW9kdWxlID0gaTE4bmV4dEkxOG5Gb3JtYXRNb2R1bGU7XG4gICAgZXhwb3J0IHR5cGUgVGhpcmRQYXJ0eU1vZHVsZSA9IGkxOG5leHRUaGlyZFBhcnR5TW9kdWxlO1xuICAgIGV4cG9ydCB0eXBlIE1vZHVsZXMgPSBpMThuZXh0TW9kdWxlcztcbiAgICBleHBvcnQgdHlwZSBOZXdhYmxlPFQ+ID0gaTE4bmV4dE5ld2FibGU8VD47XG59XG5cbmV4cG9ydCB7IGkxOG4gfTtcbiJdLCJuYW1lcyI6WyJ1dGlscy5nZXRQYXRoIiwidXRpbHMuc2V0UGF0aCIsInV0aWxzLmRlZXBFeHRlbmQiLCJ1dGlscy5jb3B5IiwidXRpbHMuZXNjYXBlIiwidXRpbHMucmVnZXhFc2NhcGUiLCJ1dGlscy5nZXRQYXRoV2l0aERlZmF1bHRzIiwidXRpbHMubWFrZVN0cmluZyIsInV0aWxzLnB1c2hQYXRoIiwiZ2V0RGVmYXVsdHMiLCJMYW5ndWFnZVV0aWxzIiwiQmFja2VuZENvbm5lY3RvciJdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFBQSxNQUFNLGFBQWEsR0FBRztBQUN0QixFQUFFLElBQUksRUFBRSxRQUFRO0FBQ2hCO0FBQ0EsRUFBRSxHQUFHLENBQUMsSUFBSSxFQUFFO0FBQ1osSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQztBQUM3QixHQUFHO0FBQ0g7QUFDQSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUU7QUFDYixJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO0FBQzlCLEdBQUc7QUFDSDtBQUNBLEVBQUUsS0FBSyxDQUFDLElBQUksRUFBRTtBQUNkLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDL0IsR0FBRztBQUNIO0FBQ0EsRUFBRSxNQUFNLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRTtBQUNyQjtBQUNBLElBQUksSUFBSSxPQUFPLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLE9B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LElBQUksSUFBSSxDQUFDLFNBQVMsR0FBRyxFQUFFLENBQUM7QUFDeEIsR0FBRztBQUNIO0FBQ0EsRUFBRSxFQUFFLENBQUMsTUFBTSxFQUFFLFFBQVEsRUFBRTtBQUN2QixJQUFJLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssSUFBSTtBQUN2QyxNQUFNLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUM7QUFDMUQsTUFBTSxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUMzQyxLQUFLLENBQUMsQ0FBQztBQUNQLElBQUksT0FBTyxJQUFJLENBQUM7QUFDaEIsR0FBRztBQUNIO0FBQ0EsRUFBRSxHQUFHLENBQUMsS0FBSyxFQUFFLFFBQVEsRUFBRTtBQUN2QixJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxFQUFFLE9BQU87QUFDdkMsSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFO0FBQ25CLE1BQU0sT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQ25DLE1BQU0sT0FBTztBQUNiLEtBQUs7QUFDTDtBQUNBLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLFFBQVEsQ0FBQyxDQUFDO0FBQzlFLEdBQUc7QUFDSDtBQUNBLEVBQUUsSUFBSSxDQUFDLEtBQUssRUFBRSxHQUFHLElBQUksRUFBRTtBQUN2QixJQUFJLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsRUFBRTtBQUMvQixNQUFNLE1BQU0sTUFBTSxHQUFHLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxL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QUNBLElBQUksSUFBSSxPQUFPLElBQUksS0FBSyxRQUFRLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRTtBQUM1RCxNQUFNLE1BQU0sWUFBWSxHQUFHLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUM7QUFDcEYsTUFBTSxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQzlCO0FBQ0EsTUFBTSxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxFQUFFO0FBQ3JDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDO0FBQzlDLE9BQU8sTUFBTSxJQUFJLENBQUMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO0FBQ2pDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQztBQUNsQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUM7QUFDbEM7QUFDQSxRQUFRLElBQUksWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDO0FBQ2pHLE9BQU8sTUFBTSxJQUFJLENBQUMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO0FBQ2pDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQztBQUNsQztBQUNBO0FBQ0EsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUM7QUFDekQsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxLQUFLLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQztBQUMzRTtBQUNBLFFBQVEsSUFBSSxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUM7QUFDakcsUUFBUSxJQUFJLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQztBQUNqRyxPQUFPO0FBQ1A7QUFDQSxNQUFNLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUN6QixLQUFLO0FBQ0w7QUFDQSxJQUFJLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDLFdBQVcsRUFBRSxHQUFHLElBQUksQ0FBQztBQUMzRixHQUFHO0FBQ0g7QUFDQSxFQUFFLGFBQWEsQ0FBQyxJQUFJLEVBQUU7QUFDdEIsSUFBSSxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxLQUFLLGNBQWMsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLG9CQUFvQixFQUFFO0FBQ25GLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUNoRCxLQUFLO0FBQ0wsSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDLFNBQVMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBQzFGLEdBQUc7QUFDSDtBQUNBLEVBQUUsZ0JBQWdCLENBQUMsU0FBUyxFQUFFLElBQUksRUFBRTtBQUNwQyxJQUFJLElBQUksQ0FBQyxTQUFTLEVBQUUsT0FBTyxFQUFFLENBQUM7QUFDOUIsSUFBSSxJQUFJLE9BQU8sU0FBUyxLQUFLLFFBQVEsRUFBRSxTQUFTLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUMvRCxJQUFJLElBQUksTUFBTSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxLQUFLLGdCQUFnQixFQUFFLE9BQU8sU0FBUyxDQUFDO0FBQzFGO0FBQ0EsSUFBSSxJQUFJLENBQUMsSUFBSSxFQUFFLE9BQU8sU0FBUyxDQUFDLE9BQU8sSUFBSSxFQUFFLENBQUM7QUFDOUM7QUFDQTtBQUNBLElBQUksSUFBSSxLQUFLLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ2hDLElBQUksSUFBSSxDQUFDLEtBQUssRUFBRSxLQUFLLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0FBQ3BFLElBQUksSUFBSSxDQUFDLEtBQUssRUFBRSxLQUFLLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0FBQ2pFLElBQUksSUFBSSxDQUFDLEtBQUssRUFBRSxLQUFLLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0FBQ3RFLElBQUksSUFBSSxDQUFDLEtBQUssRUFBRSxLQUFLLEdBQUcsU0FBUyxDQUFDLE9BQU8sQ0FBQztBQUMxQztBQUNBLElBQUksT0FBTyxLQUFLLElBQUksRUFBRSxDQUFDO0FBQ3ZCLEdBQUc7QUFDSDtBQUNBLEVBQUUsa0JBQWtCLENBQUMsSUFBSSxFQUFFLFlBQVksRUFBRTtBQUN6QyxJQUFJLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxnQkFBZ0I7QUFDL0MsTUFBTSxZQUFZLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLElBQUksRUFBRTtBQUNwRCxNQUFNLElBQUk7QUFDVixLQUFLLENBQUM7QUFDTjtBQUNBLElBQUksTUFBTSxLQUFLLEdBQUcsRUFBRSxDQUFDO0FBQ3JCLElBQUksTUFBTSxPQUFPLEdBQUcsQ0FBQyxJQUFJO0FBQ3pCLE1BQU0sSUFBSSxDQUFDLENBQUMsRUFBRSxPQUFPO0FBQ3JCLE1BQU0sSUFBSSxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxFQUFFO0FBQ2pDLFFBQVEsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN0QixPQUFPLE1BQU07QUFDYixRQUFRLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMseUNBQXlDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzFFLE9BQU87QUFDUCxLQUFLLENBQUM7QUFDTjtBQUNBLElBQUksSUFBSSxPQUFPLElBQUksS0FBSyxRQUFRLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRTtBQUM1RCxNQUFNLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEtBQUssY0FBYyxFQUFFLE9BQU8sQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztBQUN2RixNQUFNLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEtBQUssY0FBYyxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxLQUFLLGFBQWE7QUFDckYsUUFBUSxPQUFPLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDbEQsTUFBTSxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxLQUFLLGFBQWEsRUFBRSxPQUFPLENBQUMsSUFBSSxDQUFDLHVCQUF1QixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDM0YsS0FBSyxNQUFNLElBQUksT0FBTyxJQUFJLEtBQUssUUFBUSxFQUFFO0FBQ3pDLE1BQU0sT0FBTyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0FBQzdDLEtBQUs7QUFDTDtBQUNBLElBQUksYUFBYSxDQUFDLE9BQU8sQ0FBQyxFQUFFLElBQUk7QUFDaEMsTUFBTSxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztBQUN0RSxLQUFLLENBQUMsQ0FBQztBQUNQO0FBQ0EsSUFBSSxPQUFPLEtBQUssQ0FBQztBQUNqQixHQUFHO0FBQ0g7O0FDakhBO0FBQ0E7QUFDQSxJQUFJLElBQUksR0FBRztBQUNYLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsT0FBTztBQUMxRixJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRTtBQUNqRDtBQUNBLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUk7QUFDeEUsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUk7QUFDaEUsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSTtBQUM1RSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSztBQUN0RSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUU7QUFDckY7QUFDQSxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSTtBQUM3RSxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRTtBQUNwRTtBQUNBLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFO0FBQzVFO0FBQ0EsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRTtBQUMvQyxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRTtBQUMzQyxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRTtBQUM1QyxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRTtBQUN4QyxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUU7QUFDcEMsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFO0FBQzVDLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFO0FBQzFDLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRTtBQUNyQyxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUU7QUFDckMsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUU7QUFDekMsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRTtBQUN4QyxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFO0FBQ3ZDLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRTtBQUNyQyxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsS0FBSyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFO0FBQ3hDLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFO0FBQzNDLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRTtBQUNwQyxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFO0FBQ3hDLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFO0FBQ3pDLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFO0FBQzNDLEVBQUM7QUFDRDtBQUNBLElBQUksa0JBQWtCLEdBQUc7QUFDekIsRUFBRSxDQUFDLEVBQUUsU0FBUyxDQUFDLEVBQUUsQ0FBQyxPQUFPLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN4QyxFQUFFLENBQUMsRUFBRSxTQUFTLENBQUMsRUFBRSxDQUFDLE9BQU8sTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3pDLEVBQUUsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztBQUM1QixFQUFFLENBQUMsRUFBRSxTQUFTLENBQUMsRUFBRSxDQUFDLE9BQU8sTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ25ILEVBQUUsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxFQUFFLENBQUMsT0FBTyxNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2xILEVBQUUsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxFQUFFLENBQUMsT0FBTyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN0RSxFQUFFLENBQUMsRUFBRSxTQUFTLENBQUMsRUFBRSxDQUFDLE9BQU8sTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbkcsRUFBRSxDQUFDLEVBQUUsU0FBUyxDQUFDLEVBQUUsQ0FBQyxPQUFPLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDeEYsRUFBRSxDQUFDLEVBQUUsU0FBUyxDQUFDLEVBQUUsQ0FBQyxPQUFPLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN6QyxFQUFFLEVBQUUsRUFBRSxTQUFTLENBQUMsRUFBRSxDQUFDLE9BQU8sTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUM7QUFDakYsRUFBRSxFQUFFLEVBQUUsU0FBUyxDQUFDLEVBQUUsQ0FBQyxPQUFPLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3pHLEVBQUUsRUFBRSxFQUFFLFNBQVMsQ0FBQyxFQUFFLENBQUMsT0FBTyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQ3hELEVBQUUsRUFBRSxFQUFFLFNBQVMsQ0FBQyxFQUFFLENBQUMsT0FBTyxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDM0MsRUFBRSxFQUFFLEVBQUUsU0FBUyxDQUFDLEVBQUUsQ0FBQyxPQUFPLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzlFLEVBQUUsRUFBRSxFQUFFLFNBQVMsQ0FBQyxFQUFFLENBQUMsT0FBTyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDekcsRUFBRSxFQUFFLEVBQUUsU0FBUyxDQUFDLEVBQUUsQ0FBQyxPQUFPLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM5RSxFQUFFLEVBQUUsRUFBRSxTQUFTLENBQUMsRUFBRSxDQUFDLE9BQU8sTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDM0QsRUFBRSxFQUFFLEVBQUUsU0FBUyxDQUFDLEVBQUUsQ0FBQyxPQUFPLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzNELEVBQUUsRUFBRSxFQUFFLFNBQVMsQ0FBQyxFQUFFLENBQUMsT0FBTyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3BILEVBQUUsRUFBRSxFQUFFLFNBQVMsQ0FBQyxFQUFFLENBQUMsT0FBTyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDM0YsRUFBRSxFQUFFLEVBQUUsU0FBUyxDQUFDLEVBQUUsQ0FBQyxPQUFPLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxD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O0FBQ1gsTUFBTSxLQUFLO0FBQ1gsTUFBTSxLQUFLO0FBQ1gsTUFBTSxLQUFLO0FBQ1gsTUFBTSxLQUFLO0FBQ1gsTUFBTSxLQUFLO0FBQ1gsTUFBTSxLQUFLO0FBQ1gsTUFBTSxLQUFLO0FBQ1gsTUFBTSxLQUFLO0FBQ1gsTUFBTSxLQUFLO0FBQ1gsTUFBTSxLQUFLO0FBQ1gsTUFBTSxLQUFLO0FBQ1gsTUFBTSxLQUFLO0FBQ1gsTUFBTSxLQUFLO0FBQ1gsTUFBTSxLQUFLO0FBQ1gsTUFBTSxLQUFLO0FBQ1gsTUFBTSxLQUFLO0FBQ1gsTUFBTSxLQUFLO0FBQ1gsTUFBTSxLQUFLO0FBQ1gsTUFBTSxLQUFLO0FBQ1gsTUFBTSxLQUFLO0FBQ1gsTUFBTSxLQUFLO0FBQ1gsTUFBTSxLQUFLO0FBQ1gsTUFBTSxLQUFLO0FBQ1gsTUFBTSxLQUFLO0FBQ1gsTUFBTSxLQUFLO0FBQ1gsTUFBTSxLQUFLO0FBQ1gsTUFBTSxLQUFLO0FBQ1gsTUFBTSxLQUFLO0FBQ1gsTUFBTSxLQUFLO0FBQ1gsTUFBTSxLQUFLO0FBQ1gsTUFBTSxLQUFLO0FBQ1gsTUFBTSxLQUFLO0FBQ1gsTUFBTSxJQUFJO0FBQ1YsTUFBTSxJQUFJO0FBQ1YsTUFBTSxJQUFJO0FBQ1YsTUFBTSxLQUFLO0FBQ1gsTUFBTSxLQUFLO0FBQ1gsTUFBTSxLQUFLO0FBQ1gsTUFBTSxLQUFLO0FBQ1gsTUFBTSxLQUFLO0FBQ1gsTUFBTSxJQUFJO0FBQ1YsTUFBTSxLQUFLO0FBQ1gsTUFBTSxLQUFLO0FBQ1gsTUFBTSxLQUFLO0FBQ1gsTUFBTSxJQUFJO0FBQ1YsTUFBTSxJQUFJO0FBQ1YsTUFBTSxLQUFLO0FBQ1gsTUFBTSxLQUFLO0FBQ1gsTUFBTSxLQUFLO0FBQ1gsTUFBTSxJQUFJO0FBQ1YsTUFBTSxLQUFLO0FBQ1gsTUFBTSxLQUFLO0FBQ1gsTUFBTSxLQUFLO0FBQ1gsTUFBTSxLQUFLO0FBQ1gsTUFBTSxJQUFJO0FBQ1YsTUFBTSxLQUFLO0FBQ1gsS0FBSyxDQUFDO0FBQ047QUFDQSxJQUFJLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJ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
