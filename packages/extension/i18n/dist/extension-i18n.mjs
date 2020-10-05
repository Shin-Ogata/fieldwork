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
    if (prop !== '__proto__') {
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
    let nsSeparator =
      options.nsSeparator !== undefined ? options.nsSeparator : this.options.nsSeparator;
    if (nsSeparator === undefined) nsSeparator = ':';

    const keySeparator =
      options.keySeparator !== undefined ? options.keySeparator : this.options.keySeparator;

    let namespaces = options.ns || this.options.defaultNS;
    if (nsSeparator && key.indexOf(nsSeparator) > -1) {
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
      if (res) res = this.extendTranslation(res, keys, options, lastKey);
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
      res = this.extendTranslation(res, keys, options, resolved, lastKey);

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

  extendTranslation(res, key, options, resolved, lastKey) {
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
      const skipOnVariables =
        (options.interpolation && options.interpolation.skipOnVariables) ||
        this.options.interpolation.skipOnVariables;
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
      if (options.nest !== false)
        res = this.interpolator.nest(
          res,
          (...args) => {
            if (lastKey && lastKey[0] === args[0]) {
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
            `key "${usedKey}" for languages "${codes.join(
              ', ',
            )}" won't get resolved as namespace "${usedNS}" was not yet loaded`,
            'This means something IS WRONG in your setup. You access the t function before i18next.init / i18next.loadNamespace / i18next.changeLanguage was done. Wait for the callback or Promise to resolve before accessing it!!!',
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

    // temporal backwards compatibility WHITELIST REMOVAL
    this.whitelist = this.options.supportedLngs || false;
    // end temporal backwards compatibility WHITELIST REMOVAL

    this.supportedLngs = this.options.supportedLngs || false;
    this.logger = baseLogger.create('languageUtils');
  }

  getScriptPartFromCode(code) {
    if (!code || code.indexOf('-') < 0) return null;

    const p = code.split('-');
    if (p.length === 2) return null;
    p.pop();
    if (p[p.length - 1].toLowerCase() === 'x') return null;
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

  // temporal backwards compatibility WHITELIST REMOVAL
  isWhitelisted(code) {
    this.logger.deprecate(
      'languageUtils.isWhitelisted',
      'function "isWhitelisted" will be renamed to "isSupportedCode" in the next major - please make sure to rename it\'s usage asap.',
    );

    return this.isSupportedCode(code);
  }
  // end temporal backwards compatibility WHITELIST REMOVAL

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
    codes.forEach(code => {
      if (found) return;
      let cleanedLng = this.formatLanguageCode(code);
      if (!this.options.supportedLngs || this.isSupportedCode(cleanedLng)) found = cleanedLng;
    });

    // if we got no match in supportedLngs yet - check for similar locales
    // first  de-CH --> de
    // second de-CH --> de-DE
    if (!found && this.options.supportedLngs) {
      codes.forEach(code => {
        if (found) return;

        let lngOnly = this.getLanguagePartFromCode(code);
        if (this.isSupportedCode(lngOnly)) return (found = lngOnly);

        found = this.options.supportedLngs.find(supportedLng => {
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
    const addCode = c => {
      if (!c) return;
      if (this.isSupportedCode(c)) {
        codes.push(c);
      } else {
        this.logger.warn(`rejecting language code not found in supportedLngs: ${c}`);
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

  { lngs: ['ay','bo','cgg','fa','ht','id','ja','jbo','ka','kk','km','ko','ky','lo',
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

    const skipOnVariables =
      (options && options.interpolation && options.interpolation.skipOnVariables) ||
      this.options.interpolation.skipOnVariables;

    const todos = [
      {
        // unescape if has unescapePrefix/Suffix
        regex: this.regexpUnescape,
        safeValue: val => regexSafe(val),
      },
      {
        // regular escape on demand
        regex: this.regexp,
        safeValue: val => (this.escapeValue ? regexSafe(this.escape(val)) : regexSafe(val)),
      },
    ];
    todos.forEach(todo => {
      replaces = 0;
      /* eslint no-cond-assign: 0 */
      while ((match = todo.regex.exec(str))) {
        value = handleFormat(match[1].trim());
        if (value === undefined) {
          if (typeof missingInterpolationHandler === 'function') {
            const temp = missingInterpolationHandler(str, match, options);
            value = typeof temp === 'string' ? temp : '';
          } else if (skipOnVariables) {
            value = match[0];
            continue; // this makes sure it continues to detect others
          } else {
            this.logger.warn(`missed to pass in variable ${match[1]} for interpolating ${str}`);
            value = '';
          }
        } else if (typeof value !== 'string' && !this.useRawValueToEscape) {
          value = makeString(value);
        }
        str = str.replace(match[0], todo.safeValue(value));
        todo.regex.lastIndex = 0;
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
        const r = match[1].split(this.formatSeparator).map(elem => elem.trim());
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

  saveMissing(languages, namespace, key, fallbackValue, isUpdate, options = {}) {
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

    // temporal backwards compatibility WHITELIST REMOVAL
    whitelist: false, // array with supported languages
    nonExplicitWhitelist: false,
    // end temporal backwards compatibility WHITELIST REMOVAL

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
      skipOnVariables: false,
    },
  };
}

/* eslint no-param-reassign: 0 */
function transformOptions(options) {
  // create namespace object if namespace is passed in as string
  if (typeof options.ns === 'string') options.ns = [options.ns];
  if (typeof options.fallbackLng === 'string') options.fallbackLng = [options.fallbackLng];
  if (typeof options.fallbackNS === 'string') options.fallbackNS = [options.fallbackNS];

  // temporal backwards compatibility WHITELIST REMOVAL
  if (options.whitelist) {
    if (options.whitelist && options.whitelist.indexOf('cimode') < 0) {
      options.whitelist = options.whitelist.concat(['cimode']);
    }

    options.supportedLngs = options.whitelist;
  }

  if (options.nonExplicitWhitelist) {
    options.nonExplicitSupportedLngs = options.nonExplicitWhitelist;
  }
  // end temporal backwards compatibility WHITELIST REMOVAL

  // extend supportedLngs with cimode
  if (options.supportedLngs && options.supportedLngs.indexOf('cimode') < 0) {
    options.supportedLngs = options.supportedLngs.concat(['cimode']);
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

    // temporal backwards compatibility WHITELIST REMOVAL
    if (options.whitelist && !options.supportedLngs) {
      this.logger.deprecate('whitelist', 'option "whitelist" will be renamed to "supportedLngs" in the next major - please make sure to rename this option asap.');
    }
    if (options.nonExplicitWhitelist && !options.nonExplicitSupportedLngs) {
      this.logger.deprecate('whitelist', 'options "nonExplicitWhitelist" will be renamed to "nonExplicitSupportedLngs" in the next major - please make sure to rename this option asap.');
    }
    // end temporal backwards compatibility WHITELIST REMOVAL


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
      this.changeLanguage(this.options.lng, (err, t) => {
        this.isInitialized = true;
        if (!this.options.isClone) this.logger.log('initialized', this.options);
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

    const setLng = lngs => {
      // depending on API in detector lng can be a string (old) or an array of languages ordered in priority
      const l = typeof lngs === 'string' ? lngs : this.services.languageUtils.getBestMatchFromCodes(lngs);

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

  hasLoadedNamespace(ns, options = {}) {
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

    // optional injected check
    if (options.precheck) {
      const preResult = options.precheck(this, loadNotPending);
      if (preResult !== undefined) return preResult;
    }

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uLWkxOG4ubWpzIiwic291cmNlcyI6WyJpMThuZXh0L3NyYy9sb2dnZXIuanMiLCJpMThuZXh0L3NyYy9FdmVudEVtaXR0ZXIuanMiLCJpMThuZXh0L3NyYy91dGlscy5qcyIsImkxOG5leHQvc3JjL1Jlc291cmNlU3RvcmUuanMiLCJpMThuZXh0L3NyYy9wb3N0UHJvY2Vzc29yLmpzIiwiaTE4bmV4dC9zcmMvVHJhbnNsYXRvci5qcyIsImkxOG5leHQvc3JjL0xhbmd1YWdlVXRpbHMuanMiLCJpMThuZXh0L3NyYy9QbHVyYWxSZXNvbHZlci5qcyIsImkxOG5leHQvc3JjL0ludGVycG9sYXRvci5qcyIsImkxOG5leHQvc3JjL0JhY2tlbmRDb25uZWN0b3IuanMiLCJpMThuZXh0L3NyYy9kZWZhdWx0cy5qcyIsImkxOG5leHQvc3JjL2kxOG5leHQuanMiLCJpbmRleC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJjb25zdCBjb25zb2xlTG9nZ2VyID0ge1xuICB0eXBlOiAnbG9nZ2VyJyxcblxuICBsb2coYXJncykge1xuICAgIHRoaXMub3V0cHV0KCdsb2cnLCBhcmdzKTtcbiAgfSxcblxuICB3YXJuKGFyZ3MpIHtcbiAgICB0aGlzLm91dHB1dCgnd2FybicsIGFyZ3MpO1xuICB9LFxuXG4gIGVycm9yKGFyZ3MpIHtcbiAgICB0aGlzLm91dHB1dCgnZXJyb3InLCBhcmdzKTtcbiAgfSxcblxuICBvdXRwdXQodHlwZSwgYXJncykge1xuICAgIC8qIGVzbGludCBuby1jb25zb2xlOiAwICovXG4gICAgaWYgKGNvbnNvbGUgJiYgY29uc29sZVt0eXBlXSkgY29uc29sZVt0eXBlXS5hcHBseShjb25zb2xlLCBhcmdzKTtcbiAgfSxcbn07XG5cbmNsYXNzIExvZ2dlciB7XG4gIGNvbnN0cnVjdG9yKGNvbmNyZXRlTG9nZ2VyLCBvcHRpb25zID0ge30pIHtcbiAgICB0aGlzLmluaXQoY29uY3JldGVMb2dnZXIsIG9wdGlvbnMpO1xuICB9XG5cbiAgaW5pdChjb25jcmV0ZUxvZ2dlciwgb3B0aW9ucyA9IHt9KSB7XG4gICAgdGhpcy5wcmVmaXggPSBvcHRpb25zLnByZWZpeCB8fCAnaTE4bmV4dDonO1xuICAgIHRoaXMubG9nZ2VyID0gY29uY3JldGVMb2dnZXIgfHwgY29uc29sZUxvZ2dlcjtcbiAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuICAgIHRoaXMuZGVidWcgPSBvcHRpb25zLmRlYnVnO1xuICB9XG5cbiAgc2V0RGVidWcoYm9vbCkge1xuICAgIHRoaXMuZGVidWcgPSBib29sO1xuICB9XG5cbiAgbG9nKC4uLmFyZ3MpIHtcbiAgICByZXR1cm4gdGhpcy5mb3J3YXJkKGFyZ3MsICdsb2cnLCAnJywgdHJ1ZSk7XG4gIH1cblxuICB3YXJuKC4uLmFyZ3MpIHtcbiAgICByZXR1cm4gdGhpcy5mb3J3YXJkKGFyZ3MsICd3YXJuJywgJycsIHRydWUpO1xuICB9XG5cbiAgZXJyb3IoLi4uYXJncykge1xuICAgIHJldHVybiB0aGlzLmZvcndhcmQoYXJncywgJ2Vycm9yJywgJycpO1xuICB9XG5cbiAgZGVwcmVjYXRlKC4uLmFyZ3MpIHtcbiAgICByZXR1cm4gdGhpcy5mb3J3YXJkKGFyZ3MsICd3YXJuJywgJ1dBUk5JTkcgREVQUkVDQVRFRDogJywgdHJ1ZSk7XG4gIH1cblxuICBmb3J3YXJkKGFyZ3MsIGx2bCwgcHJlZml4LCBkZWJ1Z09ubHkpIHtcbiAgICBpZiAoZGVidWdPbmx5ICYmICF0aGlzLmRlYnVnKSByZXR1cm4gbnVsbDtcbiAgICBpZiAodHlwZW9mIGFyZ3NbMF0gPT09ICdzdHJpbmcnKSBhcmdzWzBdID0gYCR7cHJlZml4fSR7dGhpcy5wcmVmaXh9ICR7YXJnc1swXX1gO1xuICAgIHJldHVybiB0aGlzLmxvZ2dlcltsdmxdKGFyZ3MpO1xuICB9XG5cbiAgY3JlYXRlKG1vZHVsZU5hbWUpIHtcbiAgICByZXR1cm4gbmV3IExvZ2dlcih0aGlzLmxvZ2dlciwge1xuICAgICAgLi4ueyBwcmVmaXg6IGAke3RoaXMucHJlZml4fToke21vZHVsZU5hbWV9OmAgfSxcbiAgICAgIC4uLnRoaXMub3B0aW9ucyxcbiAgICB9KTtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBuZXcgTG9nZ2VyKCk7XG4iLCJjbGFzcyBFdmVudEVtaXR0ZXIge1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICB0aGlzLm9ic2VydmVycyA9IHt9O1xuICB9XG5cbiAgb24oZXZlbnRzLCBsaXN0ZW5lcikge1xuICAgIGV2ZW50cy5zcGxpdCgnICcpLmZvckVhY2goZXZlbnQgPT4ge1xuICAgICAgdGhpcy5vYnNlcnZlcnNbZXZlbnRdID0gdGhpcy5vYnNlcnZlcnNbZXZlbnRdIHx8IFtdO1xuICAgICAgdGhpcy5vYnNlcnZlcnNbZXZlbnRdLnB1c2gobGlzdGVuZXIpO1xuICAgIH0pO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgb2ZmKGV2ZW50LCBsaXN0ZW5lcikge1xuICAgIGlmICghdGhpcy5vYnNlcnZlcnNbZXZlbnRdKSByZXR1cm47XG4gICAgaWYgKCFsaXN0ZW5lcikge1xuICAgICAgZGVsZXRlIHRoaXMub2JzZXJ2ZXJzW2V2ZW50XTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLm9ic2VydmVyc1tldmVudF0gPSB0aGlzLm9ic2VydmVyc1tldmVudF0uZmlsdGVyKGwgPT4gbCAhPT0gbGlzdGVuZXIpO1xuICB9XG5cbiAgZW1pdChldmVudCwgLi4uYXJncykge1xuICAgIGlmICh0aGlzLm9ic2VydmVyc1tldmVudF0pIHtcbiAgICAgIGNvbnN0IGNsb25lZCA9IFtdLmNvbmNhdCh0aGlzLm9ic2VydmVyc1tldmVudF0pO1xuICAgICAgY2xvbmVkLmZvckVhY2gob2JzZXJ2ZXIgPT4ge1xuICAgICAgICBvYnNlcnZlciguLi5hcmdzKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm9ic2VydmVyc1snKiddKSB7XG4gICAgICBjb25zdCBjbG9uZWQgPSBbXS5jb25jYXQodGhpcy5vYnNlcnZlcnNbJyonXSk7XG4gICAgICBjbG9uZWQuZm9yRWFjaChvYnNlcnZlciA9PiB7XG4gICAgICAgIG9ic2VydmVyLmFwcGx5KG9ic2VydmVyLCBbZXZlbnQsIC4uLmFyZ3NdKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBFdmVudEVtaXR0ZXI7XG4iLCIvLyBodHRwOi8vbGVhLnZlcm91Lm1lLzIwMTYvMTIvcmVzb2x2ZS1wcm9taXNlcy1leHRlcm5hbGx5LXdpdGgtdGhpcy1vbmUtd2VpcmQtdHJpY2svXG5leHBvcnQgZnVuY3Rpb24gZGVmZXIoKSB7XG4gIGxldCByZXM7XG4gIGxldCByZWo7XG5cbiAgY29uc3QgcHJvbWlzZSA9IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICByZXMgPSByZXNvbHZlO1xuICAgIHJlaiA9IHJlamVjdDtcbiAgfSk7XG5cbiAgcHJvbWlzZS5yZXNvbHZlID0gcmVzO1xuICBwcm9taXNlLnJlamVjdCA9IHJlajtcblxuICByZXR1cm4gcHJvbWlzZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG1ha2VTdHJpbmcob2JqZWN0KSB7XG4gIGlmIChvYmplY3QgPT0gbnVsbCkgcmV0dXJuICcnO1xuICAvKiBlc2xpbnQgcHJlZmVyLXRlbXBsYXRlOiAwICovXG4gIHJldHVybiAnJyArIG9iamVjdDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNvcHkoYSwgcywgdCkge1xuICBhLmZvckVhY2gobSA9PiB7XG4gICAgaWYgKHNbbV0pIHRbbV0gPSBzW21dO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gZ2V0TGFzdE9mUGF0aChvYmplY3QsIHBhdGgsIEVtcHR5KSB7XG4gIGZ1bmN0aW9uIGNsZWFuS2V5KGtleSkge1xuICAgIHJldHVybiBrZXkgJiYga2V5LmluZGV4T2YoJyMjIycpID4gLTEgPyBrZXkucmVwbGFjZSgvIyMjL2csICcuJykgOiBrZXk7XG4gIH1cblxuICBmdW5jdGlvbiBjYW5Ob3RUcmF2ZXJzZURlZXBlcigpIHtcbiAgICByZXR1cm4gIW9iamVjdCB8fCB0eXBlb2Ygb2JqZWN0ID09PSAnc3RyaW5nJztcbiAgfVxuXG4gIGNvbnN0IHN0YWNrID0gdHlwZW9mIHBhdGggIT09ICdzdHJpbmcnID8gW10uY29uY2F0KHBhdGgpIDogcGF0aC5zcGxpdCgnLicpO1xuICB3aGlsZSAoc3RhY2subGVuZ3RoID4gMSkge1xuICAgIGlmIChjYW5Ob3RUcmF2ZXJzZURlZXBlcigpKSByZXR1cm4ge307XG5cbiAgICBjb25zdCBrZXkgPSBjbGVhbktleShzdGFjay5zaGlmdCgpKTtcbiAgICBpZiAoIW9iamVjdFtrZXldICYmIEVtcHR5KSBvYmplY3Rba2V5XSA9IG5ldyBFbXB0eSgpO1xuICAgIG9iamVjdCA9IG9iamVjdFtrZXldO1xuICB9XG5cbiAgaWYgKGNhbk5vdFRyYXZlcnNlRGVlcGVyKCkpIHJldHVybiB7fTtcbiAgcmV0dXJuIHtcbiAgICBvYmo6IG9iamVjdCxcbiAgICBrOiBjbGVhbktleShzdGFjay5zaGlmdCgpKSxcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNldFBhdGgob2JqZWN0LCBwYXRoLCBuZXdWYWx1ZSkge1xuICBjb25zdCB7IG9iaiwgayB9ID0gZ2V0TGFzdE9mUGF0aChvYmplY3QsIHBhdGgsIE9iamVjdCk7XG5cbiAgb2JqW2tdID0gbmV3VmFsdWU7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwdXNoUGF0aChvYmplY3QsIHBhdGgsIG5ld1ZhbHVlLCBjb25jYXQpIHtcbiAgY29uc3QgeyBvYmosIGsgfSA9IGdldExhc3RPZlBhdGgob2JqZWN0LCBwYXRoLCBPYmplY3QpO1xuXG4gIG9ialtrXSA9IG9ialtrXSB8fCBbXTtcbiAgaWYgKGNvbmNhdCkgb2JqW2tdID0gb2JqW2tdLmNvbmNhdChuZXdWYWx1ZSk7XG4gIGlmICghY29uY2F0KSBvYmpba10ucHVzaChuZXdWYWx1ZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRQYXRoKG9iamVjdCwgcGF0aCkge1xuICBjb25zdCB7IG9iaiwgayB9ID0gZ2V0TGFzdE9mUGF0aChvYmplY3QsIHBhdGgpO1xuXG4gIGlmICghb2JqKSByZXR1cm4gdW5kZWZpbmVkO1xuICByZXR1cm4gb2JqW2tdO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0UGF0aFdpdGhEZWZhdWx0cyhkYXRhLCBkZWZhdWx0RGF0YSwga2V5KSB7XG4gIGNvbnN0IHZhbHVlID0gZ2V0UGF0aChkYXRhLCBrZXkpO1xuICBpZiAodmFsdWUgIT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiB2YWx1ZTtcbiAgfVxuICAvLyBGYWxsYmFjayB0byBkZWZhdWx0IHZhbHVlc1xuICByZXR1cm4gZ2V0UGF0aChkZWZhdWx0RGF0YSwga2V5KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRlZXBFeHRlbmQodGFyZ2V0LCBzb3VyY2UsIG92ZXJ3cml0ZSkge1xuICAvKiBlc2xpbnQgbm8tcmVzdHJpY3RlZC1zeW50YXg6IDAgKi9cbiAgZm9yIChjb25zdCBwcm9wIGluIHNvdXJjZSkge1xuICAgIGlmIChwcm9wICE9PSAnX19wcm90b19fJykge1xuICAgICAgaWYgKHByb3AgaW4gdGFyZ2V0KSB7XG4gICAgICAgIC8vIElmIHdlIHJlYWNoZWQgYSBsZWFmIHN0cmluZyBpbiB0YXJnZXQgb3Igc291cmNlIHRoZW4gcmVwbGFjZSB3aXRoIHNvdXJjZSBvciBza2lwIGRlcGVuZGluZyBvbiB0aGUgJ292ZXJ3cml0ZScgc3dpdGNoXG4gICAgICAgIGlmIChcbiAgICAgICAgICB0eXBlb2YgdGFyZ2V0W3Byb3BdID09PSAnc3RyaW5nJyB8fFxuICAgICAgICAgIHRhcmdldFtwcm9wXSBpbnN0YW5jZW9mIFN0cmluZyB8fFxuICAgICAgICAgIHR5cGVvZiBzb3VyY2VbcHJvcF0gPT09ICdzdHJpbmcnIHx8XG4gICAgICAgICAgc291cmNlW3Byb3BdIGluc3RhbmNlb2YgU3RyaW5nXG4gICAgICAgICkge1xuICAgICAgICAgIGlmIChvdmVyd3JpdGUpIHRhcmdldFtwcm9wXSA9IHNvdXJjZVtwcm9wXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBkZWVwRXh0ZW5kKHRhcmdldFtwcm9wXSwgc291cmNlW3Byb3BdLCBvdmVyd3JpdGUpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0YXJnZXRbcHJvcF0gPSBzb3VyY2VbcHJvcF07XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiB0YXJnZXQ7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZWdleEVzY2FwZShzdHIpIHtcbiAgLyogZXNsaW50IG5vLXVzZWxlc3MtZXNjYXBlOiAwICovXG4gIHJldHVybiBzdHIucmVwbGFjZSgvW1xcLVxcW1xcXVxcL1xce1xcfVxcKFxcKVxcKlxcK1xcP1xcLlxcXFxcXF5cXCRcXHxdL2csICdcXFxcJCYnKTtcbn1cblxuLyogZXNsaW50LWRpc2FibGUgKi9cbnZhciBfZW50aXR5TWFwID0ge1xuICAnJic6ICcmYW1wOycsXG4gICc8JzogJyZsdDsnLFxuICAnPic6ICcmZ3Q7JyxcbiAgJ1wiJzogJyZxdW90OycsXG4gIFwiJ1wiOiAnJiMzOTsnLFxuICAnLyc6ICcmI3gyRjsnLFxufTtcbi8qIGVzbGludC1lbmFibGUgKi9cblxuZXhwb3J0IGZ1bmN0aW9uIGVzY2FwZShkYXRhKSB7XG4gIGlmICh0eXBlb2YgZGF0YSA9PT0gJ3N0cmluZycpIHtcbiAgICByZXR1cm4gZGF0YS5yZXBsYWNlKC9bJjw+XCInXFwvXS9nLCBzID0+IF9lbnRpdHlNYXBbc10pO1xuICB9XG5cbiAgcmV0dXJuIGRhdGE7XG59XG5cbmV4cG9ydCBjb25zdCBpc0lFMTAgPVxuICB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyAmJlxuICB3aW5kb3cubmF2aWdhdG9yICYmXG4gIHdpbmRvdy5uYXZpZ2F0b3IudXNlckFnZW50ICYmXG4gIHdpbmRvdy5uYXZpZ2F0b3IudXNlckFnZW50LmluZGV4T2YoJ01TSUUnKSA+IC0xO1xuIiwiaW1wb3J0IEV2ZW50RW1pdHRlciBmcm9tICcuL0V2ZW50RW1pdHRlci5qcyc7XG5pbXBvcnQgKiBhcyB1dGlscyBmcm9tICcuL3V0aWxzLmpzJztcblxuY2xhc3MgUmVzb3VyY2VTdG9yZSBleHRlbmRzIEV2ZW50RW1pdHRlciB7XG4gIGNvbnN0cnVjdG9yKGRhdGEsIG9wdGlvbnMgPSB7IG5zOiBbJ3RyYW5zbGF0aW9uJ10sIGRlZmF1bHROUzogJ3RyYW5zbGF0aW9uJyB9KSB7XG4gICAgc3VwZXIoKTtcbiAgICBpZiAodXRpbHMuaXNJRTEwKSB7XG4gICAgICBFdmVudEVtaXR0ZXIuY2FsbCh0aGlzKTsgLy8gPD1JRTEwIGZpeCAodW5hYmxlIHRvIGNhbGwgcGFyZW50IGNvbnN0cnVjdG9yKVxuICAgIH1cblxuICAgIHRoaXMuZGF0YSA9IGRhdGEgfHwge307XG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcbiAgICBpZiAodGhpcy5vcHRpb25zLmtleVNlcGFyYXRvciA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzLm9wdGlvbnMua2V5U2VwYXJhdG9yID0gJy4nO1xuICAgIH1cbiAgfVxuXG4gIGFkZE5hbWVzcGFjZXMobnMpIHtcbiAgICBpZiAodGhpcy5vcHRpb25zLm5zLmluZGV4T2YobnMpIDwgMCkge1xuICAgICAgdGhpcy5vcHRpb25zLm5zLnB1c2gobnMpO1xuICAgIH1cbiAgfVxuXG4gIHJlbW92ZU5hbWVzcGFjZXMobnMpIHtcbiAgICBjb25zdCBpbmRleCA9IHRoaXMub3B0aW9ucy5ucy5pbmRleE9mKG5zKTtcbiAgICBpZiAoaW5kZXggPiAtMSkge1xuICAgICAgdGhpcy5vcHRpb25zLm5zLnNwbGljZShpbmRleCwgMSk7XG4gICAgfVxuICB9XG5cbiAgZ2V0UmVzb3VyY2UobG5nLCBucywga2V5LCBvcHRpb25zID0ge30pIHtcbiAgICBjb25zdCBrZXlTZXBhcmF0b3IgPVxuICAgICAgb3B0aW9ucy5rZXlTZXBhcmF0b3IgIT09IHVuZGVmaW5lZCA/IG9wdGlvbnMua2V5U2VwYXJhdG9yIDogdGhpcy5vcHRpb25zLmtleVNlcGFyYXRvcjtcblxuICAgIGxldCBwYXRoID0gW2xuZywgbnNdO1xuICAgIGlmIChrZXkgJiYgdHlwZW9mIGtleSAhPT0gJ3N0cmluZycpIHBhdGggPSBwYXRoLmNvbmNhdChrZXkpO1xuICAgIGlmIChrZXkgJiYgdHlwZW9mIGtleSA9PT0gJ3N0cmluZycpXG4gICAgICBwYXRoID0gcGF0aC5jb25jYXQoa2V5U2VwYXJhdG9yID8ga2V5LnNwbGl0KGtleVNlcGFyYXRvcikgOiBrZXkpO1xuXG4gICAgaWYgKGxuZy5pbmRleE9mKCcuJykgPiAtMSkge1xuICAgICAgcGF0aCA9IGxuZy5zcGxpdCgnLicpO1xuICAgIH1cblxuICAgIHJldHVybiB1dGlscy5nZXRQYXRoKHRoaXMuZGF0YSwgcGF0aCk7XG4gIH1cblxuICBhZGRSZXNvdXJjZShsbmcsIG5zLCBrZXksIHZhbHVlLCBvcHRpb25zID0geyBzaWxlbnQ6IGZhbHNlIH0pIHtcbiAgICBsZXQga2V5U2VwYXJhdG9yID0gdGhpcy5vcHRpb25zLmtleVNlcGFyYXRvcjtcbiAgICBpZiAoa2V5U2VwYXJhdG9yID09PSB1bmRlZmluZWQpIGtleVNlcGFyYXRvciA9ICcuJztcblxuICAgIGxldCBwYXRoID0gW2xuZywgbnNdO1xuICAgIGlmIChrZXkpIHBhdGggPSBwYXRoLmNvbmNhdChrZXlTZXBhcmF0b3IgPyBrZXkuc3BsaXQoa2V5U2VwYXJhdG9yKSA6IGtleSk7XG5cbiAgICBpZiAobG5nLmluZGV4T2YoJy4nKSA+IC0xKSB7XG4gICAgICBwYXRoID0gbG5nLnNwbGl0KCcuJyk7XG4gICAgICB2YWx1ZSA9IG5zO1xuICAgICAgbnMgPSBwYXRoWzFdO1xuICAgIH1cblxuICAgIHRoaXMuYWRkTmFtZXNwYWNlcyhucyk7XG5cbiAgICB1dGlscy5zZXRQYXRoKHRoaXMuZGF0YSwgcGF0aCwgdmFsdWUpO1xuXG4gICAgaWYgKCFvcHRpb25zLnNpbGVudCkgdGhpcy5lbWl0KCdhZGRlZCcsIGxuZywgbnMsIGtleSwgdmFsdWUpO1xuICB9XG5cbiAgYWRkUmVzb3VyY2VzKGxuZywgbnMsIHJlc291cmNlcywgb3B0aW9ucyA9IHsgc2lsZW50OiBmYWxzZSB9KSB7XG4gICAgLyogZXNsaW50IG5vLXJlc3RyaWN0ZWQtc3ludGF4OiAwICovXG4gICAgZm9yIChjb25zdCBtIGluIHJlc291cmNlcykge1xuICAgICAgaWYgKFxuICAgICAgICB0eXBlb2YgcmVzb3VyY2VzW21dID09PSAnc3RyaW5nJyB8fFxuICAgICAgICBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmFwcGx5KHJlc291cmNlc1ttXSkgPT09ICdbb2JqZWN0IEFycmF5XSdcbiAgICAgIClcbiAgICAgICAgdGhpcy5hZGRSZXNvdXJjZShsbmcsIG5zLCBtLCByZXNvdXJjZXNbbV0sIHsgc2lsZW50OiB0cnVlIH0pO1xuICAgIH1cbiAgICBpZiAoIW9wdGlvbnMuc2lsZW50KSB0aGlzLmVtaXQoJ2FkZGVkJywgbG5nLCBucywgcmVzb3VyY2VzKTtcbiAgfVxuXG4gIGFkZFJlc291cmNlQnVuZGxlKGxuZywgbnMsIHJlc291cmNlcywgZGVlcCwgb3ZlcndyaXRlLCBvcHRpb25zID0geyBzaWxlbnQ6IGZhbHNlIH0pIHtcbiAgICBsZXQgcGF0aCA9IFtsbmcsIG5zXTtcbiAgICBpZiAobG5nLmluZGV4T2YoJy4nKSA+IC0xKSB7XG4gICAgICBwYXRoID0gbG5nLnNwbGl0KCcuJyk7XG4gICAgICBkZWVwID0gcmVzb3VyY2VzO1xuICAgICAgcmVzb3VyY2VzID0gbnM7XG4gICAgICBucyA9IHBhdGhbMV07XG4gICAgfVxuXG4gICAgdGhpcy5hZGROYW1lc3BhY2VzKG5zKTtcblxuICAgIGxldCBwYWNrID0gdXRpbHMuZ2V0UGF0aCh0aGlzLmRhdGEsIHBhdGgpIHx8IHt9O1xuXG4gICAgaWYgKGRlZXApIHtcbiAgICAgIHV0aWxzLmRlZXBFeHRlbmQocGFjaywgcmVzb3VyY2VzLCBvdmVyd3JpdGUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBwYWNrID0geyAuLi5wYWNrLCAuLi5yZXNvdXJjZXMgfTtcbiAgICB9XG5cbiAgICB1dGlscy5zZXRQYXRoKHRoaXMuZGF0YSwgcGF0aCwgcGFjayk7XG5cbiAgICBpZiAoIW9wdGlvbnMuc2lsZW50KSB0aGlzLmVtaXQoJ2FkZGVkJywgbG5nLCBucywgcmVzb3VyY2VzKTtcbiAgfVxuXG4gIHJlbW92ZVJlc291cmNlQnVuZGxlKGxuZywgbnMpIHtcbiAgICBpZiAodGhpcy5oYXNSZXNvdXJjZUJ1bmRsZShsbmcsIG5zKSkge1xuICAgICAgZGVsZXRlIHRoaXMuZGF0YVtsbmddW25zXTtcbiAgICB9XG4gICAgdGhpcy5yZW1vdmVOYW1lc3BhY2VzKG5zKTtcblxuICAgIHRoaXMuZW1pdCgncmVtb3ZlZCcsIGxuZywgbnMpO1xuICB9XG5cbiAgaGFzUmVzb3VyY2VCdW5kbGUobG5nLCBucykge1xuICAgIHJldHVybiB0aGlzLmdldFJlc291cmNlKGxuZywgbnMpICE9PSB1bmRlZmluZWQ7XG4gIH1cblxuICBnZXRSZXNvdXJjZUJ1bmRsZShsbmcsIG5zKSB7XG4gICAgaWYgKCFucykgbnMgPSB0aGlzLm9wdGlvbnMuZGVmYXVsdE5TO1xuXG4gICAgLy8gQ09NUEFUSUJJTElUWTogcmVtb3ZlIGV4dGVuZCBpbiB2Mi4xLjBcbiAgICBpZiAodGhpcy5vcHRpb25zLmNvbXBhdGliaWxpdHlBUEkgPT09ICd2MScpIHJldHVybiB7IC4uLnt9LCAuLi50aGlzLmdldFJlc291cmNlKGxuZywgbnMpIH07XG5cbiAgICByZXR1cm4gdGhpcy5nZXRSZXNvdXJjZShsbmcsIG5zKTtcbiAgfVxuXG4gIGdldERhdGFCeUxhbmd1YWdlKGxuZykge1xuICAgIHJldHVybiB0aGlzLmRhdGFbbG5nXTtcbiAgfVxuXG4gIHRvSlNPTigpIHtcbiAgICByZXR1cm4gdGhpcy5kYXRhO1xuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IFJlc291cmNlU3RvcmU7XG4iLCJleHBvcnQgZGVmYXVsdCB7XG4gIHByb2Nlc3NvcnM6IHt9LFxuXG4gIGFkZFBvc3RQcm9jZXNzb3IobW9kdWxlKSB7XG4gICAgdGhpcy5wcm9jZXNzb3JzW21vZHVsZS5uYW1lXSA9IG1vZHVsZTtcbiAgfSxcblxuICBoYW5kbGUocHJvY2Vzc29ycywgdmFsdWUsIGtleSwgb3B0aW9ucywgdHJhbnNsYXRvcikge1xuICAgIHByb2Nlc3NvcnMuZm9yRWFjaChwcm9jZXNzb3IgPT4ge1xuICAgICAgaWYgKHRoaXMucHJvY2Vzc29yc1twcm9jZXNzb3JdKVxuICAgICAgICB2YWx1ZSA9IHRoaXMucHJvY2Vzc29yc1twcm9jZXNzb3JdLnByb2Nlc3ModmFsdWUsIGtleSwgb3B0aW9ucywgdHJhbnNsYXRvcik7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gdmFsdWU7XG4gIH0sXG59O1xuIiwiaW1wb3J0IGJhc2VMb2dnZXIgZnJvbSAnLi9sb2dnZXIuanMnO1xuaW1wb3J0IEV2ZW50RW1pdHRlciBmcm9tICcuL0V2ZW50RW1pdHRlci5qcyc7XG5pbXBvcnQgcG9zdFByb2Nlc3NvciBmcm9tICcuL3Bvc3RQcm9jZXNzb3IuanMnO1xuaW1wb3J0ICogYXMgdXRpbHMgZnJvbSAnLi91dGlscy5qcyc7XG5cbmNvbnN0IGNoZWNrZWRMb2FkZWRGb3IgPSB7fTtcblxuY2xhc3MgVHJhbnNsYXRvciBleHRlbmRzIEV2ZW50RW1pdHRlciB7XG4gIGNvbnN0cnVjdG9yKHNlcnZpY2VzLCBvcHRpb25zID0ge30pIHtcbiAgICBzdXBlcigpO1xuICAgIGlmICh1dGlscy5pc0lFMTApIHtcbiAgICAgIEV2ZW50RW1pdHRlci5jYWxsKHRoaXMpOyAvLyA8PUlFMTAgZml4ICh1bmFibGUgdG8gY2FsbCBwYXJlbnQgY29uc3RydWN0b3IpXG4gICAgfVxuXG4gICAgdXRpbHMuY29weShcbiAgICAgIFtcbiAgICAgICAgJ3Jlc291cmNlU3RvcmUnLFxuICAgICAgICAnbGFuZ3VhZ2VVdGlscycsXG4gICAgICAgICdwbHVyYWxSZXNvbHZlcicsXG4gICAgICAgICdpbnRlcnBvbGF0b3InLFxuICAgICAgICAnYmFja2VuZENvbm5lY3RvcicsXG4gICAgICAgICdpMThuRm9ybWF0JyxcbiAgICAgICAgJ3V0aWxzJyxcbiAgICAgIF0sXG4gICAgICBzZXJ2aWNlcyxcbiAgICAgIHRoaXMsXG4gICAgKTtcblxuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG4gICAgaWYgKHRoaXMub3B0aW9ucy5rZXlTZXBhcmF0b3IgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5vcHRpb25zLmtleVNlcGFyYXRvciA9ICcuJztcbiAgICB9XG5cbiAgICB0aGlzLmxvZ2dlciA9IGJhc2VMb2dnZXIuY3JlYXRlKCd0cmFuc2xhdG9yJyk7XG4gIH1cblxuICBjaGFuZ2VMYW5ndWFnZShsbmcpIHtcbiAgICBpZiAobG5nKSB0aGlzLmxhbmd1YWdlID0gbG5nO1xuICB9XG5cbiAgZXhpc3RzKGtleSwgb3B0aW9ucyA9IHsgaW50ZXJwb2xhdGlvbjoge30gfSkge1xuICAgIGNvbnN0IHJlc29sdmVkID0gdGhpcy5yZXNvbHZlKGtleSwgb3B0aW9ucyk7XG4gICAgcmV0dXJuIHJlc29sdmVkICYmIHJlc29sdmVkLnJlcyAhPT0gdW5kZWZpbmVkO1xuICB9XG5cbiAgZXh0cmFjdEZyb21LZXkoa2V5LCBvcHRpb25zKSB7XG4gICAgbGV0IG5zU2VwYXJhdG9yID1cbiAgICAgIG9wdGlvbnMubnNTZXBhcmF0b3IgIT09IHVuZGVmaW5lZCA/IG9wdGlvbnMubnNTZXBhcmF0b3IgOiB0aGlzLm9wdGlvbnMubnNTZXBhcmF0b3I7XG4gICAgaWYgKG5zU2VwYXJhdG9yID09PSB1bmRlZmluZWQpIG5zU2VwYXJhdG9yID0gJzonO1xuXG4gICAgY29uc3Qga2V5U2VwYXJhdG9yID1cbiAgICAgIG9wdGlvbnMua2V5U2VwYXJhdG9yICE9PSB1bmRlZmluZWQgPyBvcHRpb25zLmtleVNlcGFyYXRvciA6IHRoaXMub3B0aW9ucy5rZXlTZXBhcmF0b3I7XG5cbiAgICBsZXQgbmFtZXNwYWNlcyA9IG9wdGlvbnMubnMgfHwgdGhpcy5vcHRpb25zLmRlZmF1bHROUztcbiAgICBpZiAobnNTZXBhcmF0b3IgJiYga2V5LmluZGV4T2YobnNTZXBhcmF0b3IpID4gLTEpIHtcbiAgICAgIGNvbnN0IG0gPSBrZXkubWF0Y2godGhpcy5pbnRlcnBvbGF0b3IubmVzdGluZ1JlZ2V4cCk7XG4gICAgICBpZiAobSAmJiBtLmxlbmd0aCA+IDApIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBrZXksXG4gICAgICAgICAgbmFtZXNwYWNlcyxcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHBhcnRzID0ga2V5LnNwbGl0KG5zU2VwYXJhdG9yKTtcbiAgICAgIGlmIChcbiAgICAgICAgbnNTZXBhcmF0b3IgIT09IGtleVNlcGFyYXRvciB8fFxuICAgICAgICAobnNTZXBhcmF0b3IgPT09IGtleVNlcGFyYXRvciAmJiB0aGlzLm9wdGlvbnMubnMuaW5kZXhPZihwYXJ0c1swXSkgPiAtMSlcbiAgICAgIClcbiAgICAgICAgbmFtZXNwYWNlcyA9IHBhcnRzLnNoaWZ0KCk7XG4gICAgICBrZXkgPSBwYXJ0cy5qb2luKGtleVNlcGFyYXRvcik7XG4gICAgfVxuICAgIGlmICh0eXBlb2YgbmFtZXNwYWNlcyA9PT0gJ3N0cmluZycpIG5hbWVzcGFjZXMgPSBbbmFtZXNwYWNlc107XG5cbiAgICByZXR1cm4ge1xuICAgICAga2V5LFxuICAgICAgbmFtZXNwYWNlcyxcbiAgICB9O1xuICB9XG5cbiAgdHJhbnNsYXRlKGtleXMsIG9wdGlvbnMsIGxhc3RLZXkpIHtcbiAgICBpZiAodHlwZW9mIG9wdGlvbnMgIT09ICdvYmplY3QnICYmIHRoaXMub3B0aW9ucy5vdmVybG9hZFRyYW5zbGF0aW9uT3B0aW9uSGFuZGxlcikge1xuICAgICAgLyogZXNsaW50IHByZWZlci1yZXN0LXBhcmFtczogMCAqL1xuICAgICAgb3B0aW9ucyA9IHRoaXMub3B0aW9ucy5vdmVybG9hZFRyYW5zbGF0aW9uT3B0aW9uSGFuZGxlcihhcmd1bWVudHMpO1xuICAgIH1cbiAgICBpZiAoIW9wdGlvbnMpIG9wdGlvbnMgPSB7fTtcblxuICAgIC8vIG5vbiB2YWxpZCBrZXlzIGhhbmRsaW5nXG4gICAgaWYgKGtleXMgPT09IHVuZGVmaW5lZCB8fCBrZXlzID09PSBudWxsIC8qIHx8IGtleXMgPT09ICcnKi8pIHJldHVybiAnJztcbiAgICBpZiAoIUFycmF5LmlzQXJyYXkoa2V5cykpIGtleXMgPSBbU3RyaW5nKGtleXMpXTtcblxuICAgIC8vIHNlcGFyYXRvcnNcbiAgICBjb25zdCBrZXlTZXBhcmF0b3IgPVxuICAgICAgb3B0aW9ucy5rZXlTZXBhcmF0b3IgIT09IHVuZGVmaW5lZCA/IG9wdGlvbnMua2V5U2VwYXJhdG9yIDogdGhpcy5vcHRpb25zLmtleVNlcGFyYXRvcjtcblxuICAgIC8vIGdldCBuYW1lc3BhY2UocylcbiAgICBjb25zdCB7IGtleSwgbmFtZXNwYWNlcyB9ID0gdGhpcy5leHRyYWN0RnJvbUtleShrZXlzW2tleXMubGVuZ3RoIC0gMV0sIG9wdGlvbnMpO1xuICAgIGNvbnN0IG5hbWVzcGFjZSA9IG5hbWVzcGFjZXNbbmFtZXNwYWNlcy5sZW5ndGggLSAxXTtcblxuICAgIC8vIHJldHVybiBrZXkgb24gQ0lNb2RlXG4gICAgY29uc3QgbG5nID0gb3B0aW9ucy5sbmcgfHwgdGhpcy5sYW5ndWFnZTtcbiAgICBjb25zdCBhcHBlbmROYW1lc3BhY2VUb0NJTW9kZSA9XG4gICAgICBvcHRpb25zLmFwcGVuZE5hbWVzcGFjZVRvQ0lNb2RlIHx8IHRoaXMub3B0aW9ucy5hcHBlbmROYW1lc3BhY2VUb0NJTW9kZTtcbiAgICBpZiAobG5nICYmIGxuZy50b0xvd2VyQ2FzZSgpID09PSAnY2ltb2RlJykge1xuICAgICAgaWYgKGFwcGVuZE5hbWVzcGFjZVRvQ0lNb2RlKSB7XG4gICAgICAgIGNvbnN0IG5zU2VwYXJhdG9yID0gb3B0aW9ucy5uc1NlcGFyYXRvciB8fCB0aGlzLm9wdGlvbnMubnNTZXBhcmF0b3I7XG4gICAgICAgIHJldHVybiBuYW1lc3BhY2UgKyBuc1NlcGFyYXRvciArIGtleTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGtleTtcbiAgICB9XG5cbiAgICAvLyByZXNvbHZlIGZyb20gc3RvcmVcbiAgICBjb25zdCByZXNvbHZlZCA9IHRoaXMucmVzb2x2ZShrZXlzLCBvcHRpb25zKTtcbiAgICBsZXQgcmVzID0gcmVzb2x2ZWQgJiYgcmVzb2x2ZWQucmVzO1xuICAgIGNvbnN0IHJlc1VzZWRLZXkgPSAocmVzb2x2ZWQgJiYgcmVzb2x2ZWQudXNlZEtleSkgfHwga2V5O1xuICAgIGNvbnN0IHJlc0V4YWN0VXNlZEtleSA9IChyZXNvbHZlZCAmJiByZXNvbHZlZC5leGFjdFVzZWRLZXkpIHx8IGtleTtcblxuICAgIGNvbnN0IHJlc1R5cGUgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmFwcGx5KHJlcyk7XG4gICAgY29uc3Qgbm9PYmplY3QgPSBbJ1tvYmplY3QgTnVtYmVyXScsICdbb2JqZWN0IEZ1bmN0aW9uXScsICdbb2JqZWN0IFJlZ0V4cF0nXTtcbiAgICBjb25zdCBqb2luQXJyYXlzID1cbiAgICAgIG9wdGlvbnMuam9pbkFycmF5cyAhPT0gdW5kZWZpbmVkID8gb3B0aW9ucy5qb2luQXJyYXlzIDogdGhpcy5vcHRpb25zLmpvaW5BcnJheXM7XG5cbiAgICAvLyBvYmplY3RcbiAgICBjb25zdCBoYW5kbGVBc09iamVjdEluSTE4bkZvcm1hdCA9ICF0aGlzLmkxOG5Gb3JtYXQgfHwgdGhpcy5pMThuRm9ybWF0LmhhbmRsZUFzT2JqZWN0O1xuICAgIGNvbnN0IGhhbmRsZUFzT2JqZWN0ID1cbiAgICAgIHR5cGVvZiByZXMgIT09ICdzdHJpbmcnICYmIHR5cGVvZiByZXMgIT09ICdib29sZWFuJyAmJiB0eXBlb2YgcmVzICE9PSAnbnVtYmVyJztcbiAgICBpZiAoXG4gICAgICBoYW5kbGVBc09iamVjdEluSTE4bkZvcm1hdCAmJlxuICAgICAgcmVzICYmXG4gICAgICBoYW5kbGVBc09iamVjdCAmJlxuICAgICAgbm9PYmplY3QuaW5kZXhPZihyZXNUeXBlKSA8IDAgJiZcbiAgICAgICEodHlwZW9mIGpvaW5BcnJheXMgPT09ICdzdHJpbmcnICYmIHJlc1R5cGUgPT09ICdbb2JqZWN0IEFycmF5XScpXG4gICAgKSB7XG4gICAgICBpZiAoIW9wdGlvbnMucmV0dXJuT2JqZWN0cyAmJiAhdGhpcy5vcHRpb25zLnJldHVybk9iamVjdHMpIHtcbiAgICAgICAgdGhpcy5sb2dnZXIud2FybignYWNjZXNzaW5nIGFuIG9iamVjdCAtIGJ1dCByZXR1cm5PYmplY3RzIG9wdGlvbnMgaXMgbm90IGVuYWJsZWQhJyk7XG4gICAgICAgIHJldHVybiB0aGlzLm9wdGlvbnMucmV0dXJuZWRPYmplY3RIYW5kbGVyXG4gICAgICAgICAgPyB0aGlzLm9wdGlvbnMucmV0dXJuZWRPYmplY3RIYW5kbGVyKHJlc1VzZWRLZXksIHJlcywgb3B0aW9ucylcbiAgICAgICAgICA6IGBrZXkgJyR7a2V5fSAoJHt0aGlzLmxhbmd1YWdlfSknIHJldHVybmVkIGFuIG9iamVjdCBpbnN0ZWFkIG9mIHN0cmluZy5gO1xuICAgICAgfVxuXG4gICAgICAvLyBpZiB3ZSBnb3QgYSBzZXBhcmF0b3Igd2UgbG9vcCBvdmVyIGNoaWxkcmVuIC0gZWxzZSB3ZSBqdXN0IHJldHVybiBvYmplY3QgYXMgaXNcbiAgICAgIC8vIGFzIGhhdmluZyBpdCBzZXQgdG8gZmFsc2UgbWVhbnMgbm8gaGllcmFyY2h5IHNvIG5vIGxvb2t1cCBmb3IgbmVzdGVkIHZhbHVlc1xuICAgICAgaWYgKGtleVNlcGFyYXRvcikge1xuICAgICAgICBjb25zdCByZXNUeXBlSXNBcnJheSA9IHJlc1R5cGUgPT09ICdbb2JqZWN0IEFycmF5XSc7XG4gICAgICAgIGNvbnN0IGNvcHkgPSByZXNUeXBlSXNBcnJheSA/IFtdIDoge307IC8vIGFwcGx5IGNoaWxkIHRyYW5zbGF0aW9uIG9uIGEgY29weVxuXG4gICAgICAgIC8qIGVzbGludCBuby1yZXN0cmljdGVkLXN5bnRheDogMCAqL1xuICAgICAgICBsZXQgbmV3S2V5VG9Vc2UgPSByZXNUeXBlSXNBcnJheSA/IHJlc0V4YWN0VXNlZEtleSA6IHJlc1VzZWRLZXk7XG4gICAgICAgIGZvciAoY29uc3QgbSBpbiByZXMpIHtcbiAgICAgICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHJlcywgbSkpIHtcbiAgICAgICAgICAgIGNvbnN0IGRlZXBLZXkgPSBgJHtuZXdLZXlUb1VzZX0ke2tleVNlcGFyYXRvcn0ke219YDtcbiAgICAgICAgICAgIGNvcHlbbV0gPSB0aGlzLnRyYW5zbGF0ZShkZWVwS2V5LCB7XG4gICAgICAgICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICAgICAgICAgIC4uLnsgam9pbkFycmF5czogZmFsc2UsIG5zOiBuYW1lc3BhY2VzIH0sXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmIChjb3B5W21dID09PSBkZWVwS2V5KSBjb3B5W21dID0gcmVzW21dOyAvLyBpZiBub3RoaW5nIGZvdW5kIHVzZSBvcmdpbmFsIHZhbHVlIGFzIGZhbGxiYWNrXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJlcyA9IGNvcHk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChcbiAgICAgIGhhbmRsZUFzT2JqZWN0SW5JMThuRm9ybWF0ICYmXG4gICAgICB0eXBlb2Ygam9pbkFycmF5cyA9PT0gJ3N0cmluZycgJiZcbiAgICAgIHJlc1R5cGUgPT09ICdbb2JqZWN0IEFycmF5XSdcbiAgICApIHtcbiAgICAgIC8vIGFycmF5IHNwZWNpYWwgdHJlYXRtZW50XG4gICAgICByZXMgPSByZXMuam9pbihqb2luQXJyYXlzKTtcbiAgICAgIGlmIChyZXMpIHJlcyA9IHRoaXMuZXh0ZW5kVHJhbnNsYXRpb24ocmVzLCBrZXlzLCBvcHRpb25zLCBsYXN0S2V5KTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gc3RyaW5nLCBlbXB0eSBvciBudWxsXG4gICAgICBsZXQgdXNlZERlZmF1bHQgPSBmYWxzZTtcbiAgICAgIGxldCB1c2VkS2V5ID0gZmFsc2U7XG5cbiAgICAgIC8vIGZhbGxiYWNrIHZhbHVlXG4gICAgICBpZiAoIXRoaXMuaXNWYWxpZExvb2t1cChyZXMpICYmIG9wdGlvbnMuZGVmYXVsdFZhbHVlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdXNlZERlZmF1bHQgPSB0cnVlO1xuXG4gICAgICAgIGlmIChvcHRpb25zLmNvdW50ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBjb25zdCBzdWZmaXggPSB0aGlzLnBsdXJhbFJlc29sdmVyLmdldFN1ZmZpeChsbmcsIG9wdGlvbnMuY291bnQpO1xuICAgICAgICAgIHJlcyA9IG9wdGlvbnNbYGRlZmF1bHRWYWx1ZSR7c3VmZml4fWBdO1xuICAgICAgICB9XG4gICAgICAgIGlmICghcmVzKSByZXMgPSBvcHRpb25zLmRlZmF1bHRWYWx1ZTtcbiAgICAgIH1cbiAgICAgIGlmICghdGhpcy5pc1ZhbGlkTG9va3VwKHJlcykpIHtcbiAgICAgICAgdXNlZEtleSA9IHRydWU7XG4gICAgICAgIHJlcyA9IGtleTtcbiAgICAgIH1cblxuICAgICAgLy8gc2F2ZSBtaXNzaW5nXG4gICAgICBjb25zdCB1cGRhdGVNaXNzaW5nID1cbiAgICAgICAgb3B0aW9ucy5kZWZhdWx0VmFsdWUgJiYgb3B0aW9ucy5kZWZhdWx0VmFsdWUgIT09IHJlcyAmJiB0aGlzLm9wdGlvbnMudXBkYXRlTWlzc2luZztcbiAgICAgIGlmICh1c2VkS2V5IHx8IHVzZWREZWZhdWx0IHx8IHVwZGF0ZU1pc3NpbmcpIHtcbiAgICAgICAgdGhpcy5sb2dnZXIubG9nKFxuICAgICAgICAgIHVwZGF0ZU1pc3NpbmcgPyAndXBkYXRlS2V5JyA6ICdtaXNzaW5nS2V5JyxcbiAgICAgICAgICBsbmcsXG4gICAgICAgICAgbmFtZXNwYWNlLFxuICAgICAgICAgIGtleSxcbiAgICAgICAgICB1cGRhdGVNaXNzaW5nID8gb3B0aW9ucy5kZWZhdWx0VmFsdWUgOiByZXMsXG4gICAgICAgICk7XG4gICAgICAgIGlmIChrZXlTZXBhcmF0b3IpIHtcbiAgICAgICAgICBjb25zdCBmayA9IHRoaXMucmVzb2x2ZShrZXksIHsgLi4ub3B0aW9ucywga2V5U2VwYXJhdG9yOiBmYWxzZSB9KTtcbiAgICAgICAgICBpZiAoZmsgJiYgZmsucmVzKVxuICAgICAgICAgICAgdGhpcy5sb2dnZXIud2FybihcbiAgICAgICAgICAgICAgJ1NlZW1zIHRoZSBsb2FkZWQgdHJhbnNsYXRpb25zIHdlcmUgaW4gZmxhdCBKU09OIGZvcm1hdCBpbnN0ZWFkIG9mIG5lc3RlZC4gRWl0aGVyIHNldCBrZXlTZXBhcmF0b3I6IGZhbHNlIG9uIGluaXQgb3IgbWFrZSBzdXJlIHlvdXIgdHJhbnNsYXRpb25zIGFyZSBwdWJsaXNoZWQgaW4gbmVzdGVkIGZvcm1hdC4nLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBsbmdzID0gW107XG4gICAgICAgIGNvbnN0IGZhbGxiYWNrTG5ncyA9IHRoaXMubGFuZ3VhZ2VVdGlscy5nZXRGYWxsYmFja0NvZGVzKFxuICAgICAgICAgIHRoaXMub3B0aW9ucy5mYWxsYmFja0xuZyxcbiAgICAgICAgICBvcHRpb25zLmxuZyB8fCB0aGlzLmxhbmd1YWdlLFxuICAgICAgICApO1xuICAgICAgICBpZiAodGhpcy5vcHRpb25zLnNhdmVNaXNzaW5nVG8gPT09ICdmYWxsYmFjaycgJiYgZmFsbGJhY2tMbmdzICYmIGZhbGxiYWNrTG5nc1swXSkge1xuICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZmFsbGJhY2tMbmdzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBsbmdzLnB1c2goZmFsbGJhY2tMbmdzW2ldKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5vcHRpb25zLnNhdmVNaXNzaW5nVG8gPT09ICdhbGwnKSB7XG4gICAgICAgICAgbG5ncyA9IHRoaXMubGFuZ3VhZ2VVdGlscy50b1Jlc29sdmVIaWVyYXJjaHkob3B0aW9ucy5sbmcgfHwgdGhpcy5sYW5ndWFnZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbG5ncy5wdXNoKG9wdGlvbnMubG5nIHx8IHRoaXMubGFuZ3VhZ2UpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgc2VuZCA9IChsLCBrKSA9PiB7XG4gICAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5taXNzaW5nS2V5SGFuZGxlcikge1xuICAgICAgICAgICAgdGhpcy5vcHRpb25zLm1pc3NpbmdLZXlIYW5kbGVyKFxuICAgICAgICAgICAgICBsLFxuICAgICAgICAgICAgICBuYW1lc3BhY2UsXG4gICAgICAgICAgICAgIGssXG4gICAgICAgICAgICAgIHVwZGF0ZU1pc3NpbmcgPyBvcHRpb25zLmRlZmF1bHRWYWx1ZSA6IHJlcyxcbiAgICAgICAgICAgICAgdXBkYXRlTWlzc2luZyxcbiAgICAgICAgICAgICAgb3B0aW9ucyxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfSBlbHNlIGlmICh0aGlzLmJhY2tlbmRDb25uZWN0b3IgJiYgdGhpcy5iYWNrZW5kQ29ubmVjdG9yLnNhdmVNaXNzaW5nKSB7XG4gICAgICAgICAgICB0aGlzLmJhY2tlbmRDb25uZWN0b3Iuc2F2ZU1pc3NpbmcoXG4gICAgICAgICAgICAgIGwsXG4gICAgICAgICAgICAgIG5hbWVzcGFjZSxcbiAgICAgICAgICAgICAgayxcbiAgICAgICAgICAgICAgdXBkYXRlTWlzc2luZyA/IG9wdGlvbnMuZGVmYXVsdFZhbHVlIDogcmVzLFxuICAgICAgICAgICAgICB1cGRhdGVNaXNzaW5nLFxuICAgICAgICAgICAgICBvcHRpb25zLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdGhpcy5lbWl0KCdtaXNzaW5nS2V5JywgbCwgbmFtZXNwYWNlLCBrLCByZXMpO1xuICAgICAgICB9O1xuXG4gICAgICAgIGlmICh0aGlzLm9wdGlvbnMuc2F2ZU1pc3NpbmcpIHtcbiAgICAgICAgICBjb25zdCBuZWVkc1BsdXJhbEhhbmRsaW5nID1cbiAgICAgICAgICAgIG9wdGlvbnMuY291bnQgIT09IHVuZGVmaW5lZCAmJiB0eXBlb2Ygb3B0aW9ucy5jb3VudCAhPT0gJ3N0cmluZyc7XG4gICAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5zYXZlTWlzc2luZ1BsdXJhbHMgJiYgbmVlZHNQbHVyYWxIYW5kbGluZykge1xuICAgICAgICAgICAgbG5ncy5mb3JFYWNoKGwgPT4ge1xuICAgICAgICAgICAgICBjb25zdCBwbHVyYWxzID0gdGhpcy5wbHVyYWxSZXNvbHZlci5nZXRQbHVyYWxGb3Jtc09mS2V5KGwsIGtleSk7XG5cbiAgICAgICAgICAgICAgcGx1cmFscy5mb3JFYWNoKHAgPT4gc2VuZChbbF0sIHApKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzZW5kKGxuZ3MsIGtleSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIGV4dGVuZFxuICAgICAgcmVzID0gdGhpcy5leHRlbmRUcmFuc2xhdGlvbihyZXMsIGtleXMsIG9wdGlvbnMsIHJlc29sdmVkLCBsYXN0S2V5KTtcblxuICAgICAgLy8gYXBwZW5kIG5hbWVzcGFjZSBpZiBzdGlsbCBrZXlcbiAgICAgIGlmICh1c2VkS2V5ICYmIHJlcyA9PT0ga2V5ICYmIHRoaXMub3B0aW9ucy5hcHBlbmROYW1lc3BhY2VUb01pc3NpbmdLZXkpXG4gICAgICAgIHJlcyA9IGAke25hbWVzcGFjZX06JHtrZXl9YDtcblxuICAgICAgLy8gcGFyc2VNaXNzaW5nS2V5SGFuZGxlclxuICAgICAgaWYgKHVzZWRLZXkgJiYgdGhpcy5vcHRpb25zLnBhcnNlTWlzc2luZ0tleUhhbmRsZXIpXG4gICAgICAgIHJlcyA9IHRoaXMub3B0aW9ucy5wYXJzZU1pc3NpbmdLZXlIYW5kbGVyKHJlcyk7XG4gICAgfVxuXG4gICAgLy8gcmV0dXJuXG4gICAgcmV0dXJuIHJlcztcbiAgfVxuXG4gIGV4dGVuZFRyYW5zbGF0aW9uKHJlcywga2V5LCBvcHRpb25zLCByZXNvbHZlZCwgbGFzdEtleSkge1xuICAgIGlmICh0aGlzLmkxOG5Gb3JtYXQgJiYgdGhpcy5pMThuRm9ybWF0LnBhcnNlKSB7XG4gICAgICByZXMgPSB0aGlzLmkxOG5Gb3JtYXQucGFyc2UoXG4gICAgICAgIHJlcyxcbiAgICAgICAgb3B0aW9ucyxcbiAgICAgICAgcmVzb2x2ZWQudXNlZExuZyxcbiAgICAgICAgcmVzb2x2ZWQudXNlZE5TLFxuICAgICAgICByZXNvbHZlZC51c2VkS2V5LFxuICAgICAgICB7IHJlc29sdmVkIH0sXG4gICAgICApO1xuICAgIH0gZWxzZSBpZiAoIW9wdGlvbnMuc2tpcEludGVycG9sYXRpb24pIHtcbiAgICAgIC8vIGkxOG5leHQucGFyc2luZ1xuICAgICAgaWYgKG9wdGlvbnMuaW50ZXJwb2xhdGlvbilcbiAgICAgICAgdGhpcy5pbnRlcnBvbGF0b3IuaW5pdCh7XG4gICAgICAgICAgLi4ub3B0aW9ucyxcbiAgICAgICAgICAuLi57IGludGVycG9sYXRpb246IHsgLi4udGhpcy5vcHRpb25zLmludGVycG9sYXRpb24sIC4uLm9wdGlvbnMuaW50ZXJwb2xhdGlvbiB9IH0sXG4gICAgICAgIH0pO1xuICAgICAgY29uc3Qgc2tpcE9uVmFyaWFibGVzID1cbiAgICAgICAgKG9wdGlvbnMuaW50ZXJwb2xhdGlvbiAmJiBvcHRpb25zLmludGVycG9sYXRpb24uc2tpcE9uVmFyaWFibGVzKSB8fFxuICAgICAgICB0aGlzLm9wdGlvbnMuaW50ZXJwb2xhdGlvbi5za2lwT25WYXJpYWJsZXM7XG4gICAgICBsZXQgbmVzdEJlZjtcbiAgICAgIGlmIChza2lwT25WYXJpYWJsZXMpIHtcbiAgICAgICAgY29uc3QgbmIgPSByZXMubWF0Y2godGhpcy5pbnRlcnBvbGF0b3IubmVzdGluZ1JlZ2V4cCk7XG4gICAgICAgIC8vIGhhcyBuZXN0aW5nIGFmdGJlZm9yZWVyIGludGVycG9sYXRpb25cbiAgICAgICAgbmVzdEJlZiA9IG5iICYmIG5iLmxlbmd0aDtcbiAgICAgIH1cblxuICAgICAgLy8gaW50ZXJwb2xhdGVcbiAgICAgIGxldCBkYXRhID0gb3B0aW9ucy5yZXBsYWNlICYmIHR5cGVvZiBvcHRpb25zLnJlcGxhY2UgIT09ICdzdHJpbmcnID8gb3B0aW9ucy5yZXBsYWNlIDogb3B0aW9ucztcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMuaW50ZXJwb2xhdGlvbi5kZWZhdWx0VmFyaWFibGVzKVxuICAgICAgICBkYXRhID0geyAuLi50aGlzLm9wdGlvbnMuaW50ZXJwb2xhdGlvbi5kZWZhdWx0VmFyaWFibGVzLCAuLi5kYXRhIH07XG4gICAgICByZXMgPSB0aGlzLmludGVycG9sYXRvci5pbnRlcnBvbGF0ZShyZXMsIGRhdGEsIG9wdGlvbnMubG5nIHx8IHRoaXMubGFuZ3VhZ2UsIG9wdGlvbnMpO1xuXG4gICAgICAvLyBuZXN0aW5nXG4gICAgICBpZiAoc2tpcE9uVmFyaWFibGVzKSB7XG4gICAgICAgIGNvbnN0IG5hID0gcmVzLm1hdGNoKHRoaXMuaW50ZXJwb2xhdG9yLm5lc3RpbmdSZWdleHApO1xuICAgICAgICAvLyBoYXMgbmVzdGluZyBhZnRlciBpbnRlcnBvbGF0aW9uXG4gICAgICAgIGNvbnN0IG5lc3RBZnQgPSBuYSAmJiBuYS5sZW5ndGg7XG4gICAgICAgIGlmIChuZXN0QmVmIDwgbmVzdEFmdCkgb3B0aW9ucy5uZXN0ID0gZmFsc2U7XG4gICAgICB9XG4gICAgICBpZiAob3B0aW9ucy5uZXN0ICE9PSBmYWxzZSlcbiAgICAgICAgcmVzID0gdGhpcy5pbnRlcnBvbGF0b3IubmVzdChcbiAgICAgICAgICByZXMsXG4gICAgICAgICAgKC4uLmFyZ3MpID0+IHtcbiAgICAgICAgICAgIGlmIChsYXN0S2V5ICYmIGxhc3RLZXlbMF0gPT09IGFyZ3NbMF0pIHtcbiAgICAgICAgICAgICAgdGhpcy5sb2dnZXIud2FybihcbiAgICAgICAgICAgICAgICBgSXQgc2VlbXMgeW91IGFyZSBuZXN0aW5nIHJlY3Vyc2l2ZWx5IGtleTogJHthcmdzWzBdfSBpbiBrZXk6ICR7a2V5WzBdfWAsXG4gICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMudHJhbnNsYXRlKC4uLmFyZ3MsIGtleSk7XG4gICAgICAgICAgfSxcbiAgICAgICAgICBvcHRpb25zLFxuICAgICAgICApO1xuXG4gICAgICBpZiAob3B0aW9ucy5pbnRlcnBvbGF0aW9uKSB0aGlzLmludGVycG9sYXRvci5yZXNldCgpO1xuICAgIH1cblxuICAgIC8vIHBvc3QgcHJvY2Vzc1xuICAgIGNvbnN0IHBvc3RQcm9jZXNzID0gb3B0aW9ucy5wb3N0UHJvY2VzcyB8fCB0aGlzLm9wdGlvbnMucG9zdFByb2Nlc3M7XG4gICAgY29uc3QgcG9zdFByb2Nlc3Nvck5hbWVzID0gdHlwZW9mIHBvc3RQcm9jZXNzID09PSAnc3RyaW5nJyA/IFtwb3N0UHJvY2Vzc10gOiBwb3N0UHJvY2VzcztcblxuICAgIGlmIChcbiAgICAgIHJlcyAhPT0gdW5kZWZpbmVkICYmXG4gICAgICByZXMgIT09IG51bGwgJiZcbiAgICAgIHBvc3RQcm9jZXNzb3JOYW1lcyAmJlxuICAgICAgcG9zdFByb2Nlc3Nvck5hbWVzLmxlbmd0aCAmJlxuICAgICAgb3B0aW9ucy5hcHBseVBvc3RQcm9jZXNzb3IgIT09IGZhbHNlXG4gICAgKSB7XG4gICAgICByZXMgPSBwb3N0UHJvY2Vzc29yLmhhbmRsZShcbiAgICAgICAgcG9zdFByb2Nlc3Nvck5hbWVzLFxuICAgICAgICByZXMsXG4gICAgICAgIGtleSxcbiAgICAgICAgdGhpcy5vcHRpb25zICYmIHRoaXMub3B0aW9ucy5wb3N0UHJvY2Vzc1Bhc3NSZXNvbHZlZFxuICAgICAgICAgID8geyBpMThuUmVzb2x2ZWQ6IHJlc29sdmVkLCAuLi5vcHRpb25zIH1cbiAgICAgICAgICA6IG9wdGlvbnMsXG4gICAgICAgIHRoaXMsXG4gICAgICApO1xuICAgIH1cblxuICAgIHJldHVybiByZXM7XG4gIH1cblxuICByZXNvbHZlKGtleXMsIG9wdGlvbnMgPSB7fSkge1xuICAgIGxldCBmb3VuZDtcbiAgICBsZXQgdXNlZEtleTsgLy8gcGxhaW4ga2V5XG4gICAgbGV0IGV4YWN0VXNlZEtleTsgLy8ga2V5IHdpdGggY29udGV4dCAvIHBsdXJhbFxuICAgIGxldCB1c2VkTG5nO1xuICAgIGxldCB1c2VkTlM7XG5cbiAgICBpZiAodHlwZW9mIGtleXMgPT09ICdzdHJpbmcnKSBrZXlzID0gW2tleXNdO1xuXG4gICAgLy8gZm9yRWFjaCBwb3NzaWJsZSBrZXlcbiAgICBrZXlzLmZvckVhY2goayA9PiB7XG4gICAgICBpZiAodGhpcy5pc1ZhbGlkTG9va3VwKGZvdW5kKSkgcmV0dXJuO1xuICAgICAgY29uc3QgZXh0cmFjdGVkID0gdGhpcy5leHRyYWN0RnJvbUtleShrLCBvcHRpb25zKTtcbiAgICAgIGNvbnN0IGtleSA9IGV4dHJhY3RlZC5rZXk7XG4gICAgICB1c2VkS2V5ID0ga2V5O1xuICAgICAgbGV0IG5hbWVzcGFjZXMgPSBleHRyYWN0ZWQubmFtZXNwYWNlcztcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMuZmFsbGJhY2tOUykgbmFtZXNwYWNlcyA9IG5hbWVzcGFjZXMuY29uY2F0KHRoaXMub3B0aW9ucy5mYWxsYmFja05TKTtcblxuICAgICAgY29uc3QgbmVlZHNQbHVyYWxIYW5kbGluZyA9IG9wdGlvbnMuY291bnQgIT09IHVuZGVmaW5lZCAmJiB0eXBlb2Ygb3B0aW9ucy5jb3VudCAhPT0gJ3N0cmluZyc7XG4gICAgICBjb25zdCBuZWVkc0NvbnRleHRIYW5kbGluZyA9XG4gICAgICAgIG9wdGlvbnMuY29udGV4dCAhPT0gdW5kZWZpbmVkICYmXG4gICAgICAgIHR5cGVvZiBvcHRpb25zLmNvbnRleHQgPT09ICdzdHJpbmcnICYmXG4gICAgICAgIG9wdGlvbnMuY29udGV4dCAhPT0gJyc7XG5cbiAgICAgIGNvbnN0IGNvZGVzID0gb3B0aW9ucy5sbmdzXG4gICAgICAgID8gb3B0aW9ucy5sbmdzXG4gICAgICAgIDogdGhpcy5sYW5ndWFnZVV0aWxzLnRvUmVzb2x2ZUhpZXJhcmNoeShvcHRpb25zLmxuZyB8fCB0aGlzLmxhbmd1YWdlLCBvcHRpb25zLmZhbGxiYWNrTG5nKTtcblxuICAgICAgbmFtZXNwYWNlcy5mb3JFYWNoKG5zID0+IHtcbiAgICAgICAgaWYgKHRoaXMuaXNWYWxpZExvb2t1cChmb3VuZCkpIHJldHVybjtcbiAgICAgICAgdXNlZE5TID0gbnM7XG5cbiAgICAgICAgaWYgKFxuICAgICAgICAgICFjaGVja2VkTG9hZGVkRm9yW2Ake2NvZGVzWzBdfS0ke25zfWBdICYmXG4gICAgICAgICAgdGhpcy51dGlscyAmJlxuICAgICAgICAgIHRoaXMudXRpbHMuaGFzTG9hZGVkTmFtZXNwYWNlICYmXG4gICAgICAgICAgIXRoaXMudXRpbHMuaGFzTG9hZGVkTmFtZXNwYWNlKHVzZWROUylcbiAgICAgICAgKSB7XG4gICAgICAgICAgY2hlY2tlZExvYWRlZEZvcltgJHtjb2Rlc1swXX0tJHtuc31gXSA9IHRydWU7XG4gICAgICAgICAgdGhpcy5sb2dnZXIud2FybihcbiAgICAgICAgICAgIGBrZXkgXCIke3VzZWRLZXl9XCIgZm9yIGxhbmd1YWdlcyBcIiR7Y29kZXMuam9pbihcbiAgICAgICAgICAgICAgJywgJyxcbiAgICAgICAgICAgICl9XCIgd29uJ3QgZ2V0IHJlc29sdmVkIGFzIG5hbWVzcGFjZSBcIiR7dXNlZE5TfVwiIHdhcyBub3QgeWV0IGxvYWRlZGAsXG4gICAgICAgICAgICAnVGhpcyBtZWFucyBzb21ldGhpbmcgSVMgV1JPTkcgaW4geW91ciBzZXR1cC4gWW91IGFjY2VzcyB0aGUgdCBmdW5jdGlvbiBiZWZvcmUgaTE4bmV4dC5pbml0IC8gaTE4bmV4dC5sb2FkTmFtZXNwYWNlIC8gaTE4bmV4dC5jaGFuZ2VMYW5ndWFnZSB3YXMgZG9uZS4gV2FpdCBmb3IgdGhlIGNhbGxiYWNrIG9yIFByb21pc2UgdG8gcmVzb2x2ZSBiZWZvcmUgYWNjZXNzaW5nIGl0ISEhJyxcbiAgICAgICAgICApO1xuICAgICAgICB9XG5cbiAgICAgICAgY29kZXMuZm9yRWFjaChjb2RlID0+IHtcbiAgICAgICAgICBpZiAodGhpcy5pc1ZhbGlkTG9va3VwKGZvdW5kKSkgcmV0dXJuO1xuICAgICAgICAgIHVzZWRMbmcgPSBjb2RlO1xuXG4gICAgICAgICAgbGV0IGZpbmFsS2V5ID0ga2V5O1xuICAgICAgICAgIGNvbnN0IGZpbmFsS2V5cyA9IFtmaW5hbEtleV07XG5cbiAgICAgICAgICBpZiAodGhpcy5pMThuRm9ybWF0ICYmIHRoaXMuaTE4bkZvcm1hdC5hZGRMb29rdXBLZXlzKSB7XG4gICAgICAgICAgICB0aGlzLmkxOG5Gb3JtYXQuYWRkTG9va3VwS2V5cyhmaW5hbEtleXMsIGtleSwgY29kZSwgbnMsIG9wdGlvbnMpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsZXQgcGx1cmFsU3VmZml4O1xuICAgICAgICAgICAgaWYgKG5lZWRzUGx1cmFsSGFuZGxpbmcpXG4gICAgICAgICAgICAgIHBsdXJhbFN1ZmZpeCA9IHRoaXMucGx1cmFsUmVzb2x2ZXIuZ2V0U3VmZml4KGNvZGUsIG9wdGlvbnMuY291bnQpO1xuXG4gICAgICAgICAgICAvLyBmYWxsYmFjayBmb3IgcGx1cmFsIGlmIGNvbnRleHQgbm90IGZvdW5kXG4gICAgICAgICAgICBpZiAobmVlZHNQbHVyYWxIYW5kbGluZyAmJiBuZWVkc0NvbnRleHRIYW5kbGluZylcbiAgICAgICAgICAgICAgZmluYWxLZXlzLnB1c2goZmluYWxLZXkgKyBwbHVyYWxTdWZmaXgpO1xuXG4gICAgICAgICAgICAvLyBnZXQga2V5IGZvciBjb250ZXh0IGlmIG5lZWRlZFxuICAgICAgICAgICAgaWYgKG5lZWRzQ29udGV4dEhhbmRsaW5nKVxuICAgICAgICAgICAgICBmaW5hbEtleXMucHVzaCgoZmluYWxLZXkgKz0gYCR7dGhpcy5vcHRpb25zLmNvbnRleHRTZXBhcmF0b3J9JHtvcHRpb25zLmNvbnRleHR9YCkpO1xuXG4gICAgICAgICAgICAvLyBnZXQga2V5IGZvciBwbHVyYWwgaWYgbmVlZGVkXG4gICAgICAgICAgICBpZiAobmVlZHNQbHVyYWxIYW5kbGluZykgZmluYWxLZXlzLnB1c2goKGZpbmFsS2V5ICs9IHBsdXJhbFN1ZmZpeCkpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIGl0ZXJhdGUgb3ZlciBmaW5hbEtleXMgc3RhcnRpbmcgd2l0aCBtb3N0IHNwZWNpZmljIHBsdXJhbGtleSAoLT4gY29udGV4dGtleSBvbmx5KSAtPiBzaW5ndWxhcmtleSBvbmx5XG4gICAgICAgICAgbGV0IHBvc3NpYmxlS2V5O1xuICAgICAgICAgIC8qIGVzbGludCBuby1jb25kLWFzc2lnbjogMCAqL1xuICAgICAgICAgIHdoaWxlICgocG9zc2libGVLZXkgPSBmaW5hbEtleXMucG9wKCkpKSB7XG4gICAgICAgICAgICBpZiAoIXRoaXMuaXNWYWxpZExvb2t1cChmb3VuZCkpIHtcbiAgICAgICAgICAgICAgZXhhY3RVc2VkS2V5ID0gcG9zc2libGVLZXk7XG4gICAgICAgICAgICAgIGZvdW5kID0gdGhpcy5nZXRSZXNvdXJjZShjb2RlLCBucywgcG9zc2libGVLZXksIG9wdGlvbnMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIHJldHVybiB7IHJlczogZm91bmQsIHVzZWRLZXksIGV4YWN0VXNlZEtleSwgdXNlZExuZywgdXNlZE5TIH07XG4gIH1cblxuICBpc1ZhbGlkTG9va3VwKHJlcykge1xuICAgIHJldHVybiAoXG4gICAgICByZXMgIT09IHVuZGVmaW5lZCAmJlxuICAgICAgISghdGhpcy5vcHRpb25zLnJldHVybk51bGwgJiYgcmVzID09PSBudWxsKSAmJlxuICAgICAgISghdGhpcy5vcHRpb25zLnJldHVybkVtcHR5U3RyaW5nICYmIHJlcyA9PT0gJycpXG4gICAgKTtcbiAgfVxuXG4gIGdldFJlc291cmNlKGNvZGUsIG5zLCBrZXksIG9wdGlvbnMgPSB7fSkge1xuICAgIGlmICh0aGlzLmkxOG5Gb3JtYXQgJiYgdGhpcy5pMThuRm9ybWF0LmdldFJlc291cmNlKVxuICAgICAgcmV0dXJuIHRoaXMuaTE4bkZvcm1hdC5nZXRSZXNvdXJjZShjb2RlLCBucywga2V5LCBvcHRpb25zKTtcbiAgICByZXR1cm4gdGhpcy5yZXNvdXJjZVN0b3JlLmdldFJlc291cmNlKGNvZGUsIG5zLCBrZXksIG9wdGlvbnMpO1xuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IFRyYW5zbGF0b3I7XG4iLCJpbXBvcnQgYmFzZUxvZ2dlciBmcm9tICcuL2xvZ2dlci5qcyc7XG5cbmZ1bmN0aW9uIGNhcGl0YWxpemUoc3RyaW5nKSB7XG4gIHJldHVybiBzdHJpbmcuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBzdHJpbmcuc2xpY2UoMSk7XG59XG5cbmNsYXNzIExhbmd1YWdlVXRpbCB7XG4gIGNvbnN0cnVjdG9yKG9wdGlvbnMpIHtcbiAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuXG4gICAgLy8gdGVtcG9yYWwgYmFja3dhcmRzIGNvbXBhdGliaWxpdHkgV0hJVEVMSVNUIFJFTU9WQUxcbiAgICB0aGlzLndoaXRlbGlzdCA9IHRoaXMub3B0aW9ucy5zdXBwb3J0ZWRMbmdzIHx8IGZhbHNlO1xuICAgIC8vIGVuZCB0ZW1wb3JhbCBiYWNrd2FyZHMgY29tcGF0aWJpbGl0eSBXSElURUxJU1QgUkVNT1ZBTFxuXG4gICAgdGhpcy5zdXBwb3J0ZWRMbmdzID0gdGhpcy5vcHRpb25zLnN1cHBvcnRlZExuZ3MgfHwgZmFsc2U7XG4gICAgdGhpcy5sb2dnZXIgPSBiYXNlTG9nZ2VyLmNyZWF0ZSgnbGFuZ3VhZ2VVdGlscycpO1xuICB9XG5cbiAgZ2V0U2NyaXB0UGFydEZyb21Db2RlKGNvZGUpIHtcbiAgICBpZiAoIWNvZGUgfHwgY29kZS5pbmRleE9mKCctJykgPCAwKSByZXR1cm4gbnVsbDtcblxuICAgIGNvbnN0IHAgPSBjb2RlLnNwbGl0KCctJyk7XG4gICAgaWYgKHAubGVuZ3RoID09PSAyKSByZXR1cm4gbnVsbDtcbiAgICBwLnBvcCgpO1xuICAgIGlmIChwW3AubGVuZ3RoIC0gMV0udG9Mb3dlckNhc2UoKSA9PT0gJ3gnKSByZXR1cm4gbnVsbDtcbiAgICByZXR1cm4gdGhpcy5mb3JtYXRMYW5ndWFnZUNvZGUocC5qb2luKCctJykpO1xuICB9XG5cbiAgZ2V0TGFuZ3VhZ2VQYXJ0RnJvbUNvZGUoY29kZSkge1xuICAgIGlmICghY29kZSB8fCBjb2RlLmluZGV4T2YoJy0nKSA8IDApIHJldHVybiBjb2RlO1xuXG4gICAgY29uc3QgcCA9IGNvZGUuc3BsaXQoJy0nKTtcbiAgICByZXR1cm4gdGhpcy5mb3JtYXRMYW5ndWFnZUNvZGUocFswXSk7XG4gIH1cblxuICBmb3JtYXRMYW5ndWFnZUNvZGUoY29kZSkge1xuICAgIC8vIGh0dHA6Ly93d3cuaWFuYS5vcmcvYXNzaWdubWVudHMvbGFuZ3VhZ2UtdGFncy9sYW5ndWFnZS10YWdzLnhodG1sXG4gICAgaWYgKHR5cGVvZiBjb2RlID09PSAnc3RyaW5nJyAmJiBjb2RlLmluZGV4T2YoJy0nKSA+IC0xKSB7XG4gICAgICBjb25zdCBzcGVjaWFsQ2FzZXMgPSBbJ2hhbnMnLCAnaGFudCcsICdsYXRuJywgJ2N5cmwnLCAnY2FucycsICdtb25nJywgJ2FyYWInXTtcbiAgICAgIGxldCBwID0gY29kZS5zcGxpdCgnLScpO1xuXG4gICAgICBpZiAodGhpcy5vcHRpb25zLmxvd2VyQ2FzZUxuZykge1xuICAgICAgICBwID0gcC5tYXAocGFydCA9PiBwYXJ0LnRvTG93ZXJDYXNlKCkpO1xuICAgICAgfSBlbHNlIGlmIChwLmxlbmd0aCA9PT0gMikge1xuICAgICAgICBwWzBdID0gcFswXS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICBwWzFdID0gcFsxXS50b1VwcGVyQ2FzZSgpO1xuXG4gICAgICAgIGlmIChzcGVjaWFsQ2FzZXMuaW5kZXhPZihwWzFdLnRvTG93ZXJDYXNlKCkpID4gLTEpIHBbMV0gPSBjYXBpdGFsaXplKHBbMV0udG9Mb3dlckNhc2UoKSk7XG4gICAgICB9IGVsc2UgaWYgKHAubGVuZ3RoID09PSAzKSB7XG4gICAgICAgIHBbMF0gPSBwWzBdLnRvTG93ZXJDYXNlKCk7XG5cbiAgICAgICAgLy8gaWYgbGVuZ2h0IDIgZ3Vlc3MgaXQncyBhIGNvdW50cnlcbiAgICAgICAgaWYgKHBbMV0ubGVuZ3RoID09PSAyKSBwWzFdID0gcFsxXS50b1VwcGVyQ2FzZSgpO1xuICAgICAgICBpZiAocFswXSAhPT0gJ3NnbicgJiYgcFsyXS5sZW5ndGggPT09IDIpIHBbMl0gPSBwWzJdLnRvVXBwZXJDYXNlKCk7XG5cbiAgICAgICAgaWYgKHNwZWNpYWxDYXNlcy5pbmRleE9mKHBbMV0udG9Mb3dlckNhc2UoKSkgPiAtMSkgcFsxXSA9IGNhcGl0YWxpemUocFsxXS50b0xvd2VyQ2FzZSgpKTtcbiAgICAgICAgaWYgKHNwZWNpYWxDYXNlcy5pbmRleE9mKHBbMl0udG9Mb3dlckNhc2UoKSkgPiAtMSkgcFsyXSA9IGNhcGl0YWxpemUocFsyXS50b0xvd2VyQ2FzZSgpKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHAuam9pbignLScpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLm9wdGlvbnMuY2xlYW5Db2RlIHx8IHRoaXMub3B0aW9ucy5sb3dlckNhc2VMbmcgPyBjb2RlLnRvTG93ZXJDYXNlKCkgOiBjb2RlO1xuICB9XG5cbiAgLy8gdGVtcG9yYWwgYmFja3dhcmRzIGNvbXBhdGliaWxpdHkgV0hJVEVMSVNUIFJFTU9WQUxcbiAgaXNXaGl0ZWxpc3RlZChjb2RlKSB7XG4gICAgdGhpcy5sb2dnZXIuZGVwcmVjYXRlKFxuICAgICAgJ2xhbmd1YWdlVXRpbHMuaXNXaGl0ZWxpc3RlZCcsXG4gICAgICAnZnVuY3Rpb24gXCJpc1doaXRlbGlzdGVkXCIgd2lsbCBiZSByZW5hbWVkIHRvIFwiaXNTdXBwb3J0ZWRDb2RlXCIgaW4gdGhlIG5leHQgbWFqb3IgLSBwbGVhc2UgbWFrZSBzdXJlIHRvIHJlbmFtZSBpdFxcJ3MgdXNhZ2UgYXNhcC4nLFxuICAgICk7XG5cbiAgICByZXR1cm4gdGhpcy5pc1N1cHBvcnRlZENvZGUoY29kZSk7XG4gIH1cbiAgLy8gZW5kIHRlbXBvcmFsIGJhY2t3YXJkcyBjb21wYXRpYmlsaXR5IFdISVRFTElTVCBSRU1PVkFMXG5cbiAgaXNTdXBwb3J0ZWRDb2RlKGNvZGUpIHtcbiAgICBpZiAodGhpcy5vcHRpb25zLmxvYWQgPT09ICdsYW5ndWFnZU9ubHknIHx8IHRoaXMub3B0aW9ucy5ub25FeHBsaWNpdFN1cHBvcnRlZExuZ3MpIHtcbiAgICAgIGNvZGUgPSB0aGlzLmdldExhbmd1YWdlUGFydEZyb21Db2RlKGNvZGUpO1xuICAgIH1cbiAgICByZXR1cm4gKFxuICAgICAgIXRoaXMuc3VwcG9ydGVkTG5ncyB8fCAhdGhpcy5zdXBwb3J0ZWRMbmdzLmxlbmd0aCB8fCB0aGlzLnN1cHBvcnRlZExuZ3MuaW5kZXhPZihjb2RlKSA+IC0xXG4gICAgKTtcbiAgfVxuXG4gIGdldEJlc3RNYXRjaEZyb21Db2Rlcyhjb2Rlcykge1xuICAgIGlmICghY29kZXMpIHJldHVybiBudWxsO1xuXG4gICAgbGV0IGZvdW5kO1xuXG4gICAgLy8gcGljayBmaXJzdCBzdXBwb3J0ZWQgY29kZSBvciBpZiBubyByZXN0cmljdGlvbiBwaWNrIHRoZSBmaXJzdCBvbmUgKGhpZ2hlc3QgcHJpbylcbiAgICBjb2Rlcy5mb3JFYWNoKGNvZGUgPT4ge1xuICAgICAgaWYgKGZvdW5kKSByZXR1cm47XG4gICAgICBsZXQgY2xlYW5lZExuZyA9IHRoaXMuZm9ybWF0TGFuZ3VhZ2VDb2RlKGNvZGUpO1xuICAgICAgaWYgKCF0aGlzLm9wdGlvbnMuc3VwcG9ydGVkTG5ncyB8fCB0aGlzLmlzU3VwcG9ydGVkQ29kZShjbGVhbmVkTG5nKSkgZm91bmQgPSBjbGVhbmVkTG5nO1xuICAgIH0pO1xuXG4gICAgLy8gaWYgd2UgZ290IG5vIG1hdGNoIGluIHN1cHBvcnRlZExuZ3MgeWV0IC0gY2hlY2sgZm9yIHNpbWlsYXIgbG9jYWxlc1xuICAgIC8vIGZpcnN0ICBkZS1DSCAtLT4gZGVcbiAgICAvLyBzZWNvbmQgZGUtQ0ggLS0+IGRlLURFXG4gICAgaWYgKCFmb3VuZCAmJiB0aGlzLm9wdGlvbnMuc3VwcG9ydGVkTG5ncykge1xuICAgICAgY29kZXMuZm9yRWFjaChjb2RlID0+IHtcbiAgICAgICAgaWYgKGZvdW5kKSByZXR1cm47XG5cbiAgICAgICAgbGV0IGxuZ09ubHkgPSB0aGlzLmdldExhbmd1YWdlUGFydEZyb21Db2RlKGNvZGUpO1xuICAgICAgICBpZiAodGhpcy5pc1N1cHBvcnRlZENvZGUobG5nT25seSkpIHJldHVybiAoZm91bmQgPSBsbmdPbmx5KTtcblxuICAgICAgICBmb3VuZCA9IHRoaXMub3B0aW9ucy5zdXBwb3J0ZWRMbmdzLmZpbmQoc3VwcG9ydGVkTG5nID0+IHtcbiAgICAgICAgICBpZiAoc3VwcG9ydGVkTG5nLmluZGV4T2YobG5nT25seSkgPT09IDApIHJldHVybiBzdXBwb3J0ZWRMbmc7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gaWYgbm90aGluZyBmb3VuZCwgdXNlIGZhbGxiYWNrTG5nXG4gICAgaWYgKCFmb3VuZCkgZm91bmQgPSB0aGlzLmdldEZhbGxiYWNrQ29kZXModGhpcy5vcHRpb25zLmZhbGxiYWNrTG5nKVswXTtcblxuICAgIHJldHVybiBmb3VuZDtcbiAgfVxuXG4gIGdldEZhbGxiYWNrQ29kZXMoZmFsbGJhY2tzLCBjb2RlKSB7XG4gICAgaWYgKCFmYWxsYmFja3MpIHJldHVybiBbXTtcbiAgICBpZiAodHlwZW9mIGZhbGxiYWNrcyA9PT0gJ2Z1bmN0aW9uJykgZmFsbGJhY2tzID0gZmFsbGJhY2tzKGNvZGUpO1xuICAgIGlmICh0eXBlb2YgZmFsbGJhY2tzID09PSAnc3RyaW5nJykgZmFsbGJhY2tzID0gW2ZhbGxiYWNrc107XG4gICAgaWYgKE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuYXBwbHkoZmFsbGJhY2tzKSA9PT0gJ1tvYmplY3QgQXJyYXldJykgcmV0dXJuIGZhbGxiYWNrcztcblxuICAgIGlmICghY29kZSkgcmV0dXJuIGZhbGxiYWNrcy5kZWZhdWx0IHx8IFtdO1xuXG4gICAgLy8gYXN1bWUgd2UgaGF2ZSBhbiBvYmplY3QgZGVmaW5pbmcgZmFsbGJhY2tzXG4gICAgbGV0IGZvdW5kID0gZmFsbGJhY2tzW2NvZGVdO1xuICAgIGlmICghZm91bmQpIGZvdW5kID0gZmFsbGJhY2tzW3RoaXMuZ2V0U2NyaXB0UGFydEZyb21Db2RlKGNvZGUpXTtcbiAgICBpZiAoIWZvdW5kKSBmb3VuZCA9IGZhbGxiYWNrc1t0aGlzLmZvcm1hdExhbmd1YWdlQ29kZShjb2RlKV07XG4gICAgaWYgKCFmb3VuZCkgZm91bmQgPSBmYWxsYmFja3NbdGhpcy5nZXRMYW5ndWFnZVBhcnRGcm9tQ29kZShjb2RlKV07XG4gICAgaWYgKCFmb3VuZCkgZm91bmQgPSBmYWxsYmFja3MuZGVmYXVsdDtcblxuICAgIHJldHVybiBmb3VuZCB8fCBbXTtcbiAgfVxuXG4gIHRvUmVzb2x2ZUhpZXJhcmNoeShjb2RlLCBmYWxsYmFja0NvZGUpIHtcbiAgICBjb25zdCBmYWxsYmFja0NvZGVzID0gdGhpcy5nZXRGYWxsYmFja0NvZGVzKFxuICAgICAgZmFsbGJhY2tDb2RlIHx8IHRoaXMub3B0aW9ucy5mYWxsYmFja0xuZyB8fCBbXSxcbiAgICAgIGNvZGUsXG4gICAgKTtcblxuICAgIGNvbnN0IGNvZGVzID0gW107XG4gICAgY29uc3QgYWRkQ29kZSA9IGMgPT4ge1xuICAgICAgaWYgKCFjKSByZXR1cm47XG4gICAgICBpZiAodGhpcy5pc1N1cHBvcnRlZENvZGUoYykpIHtcbiAgICAgICAgY29kZXMucHVzaChjKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMubG9nZ2VyLndhcm4oYHJlamVjdGluZyBsYW5ndWFnZSBjb2RlIG5vdCBmb3VuZCBpbiBzdXBwb3J0ZWRMbmdzOiAke2N9YCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIGlmICh0eXBlb2YgY29kZSA9PT0gJ3N0cmluZycgJiYgY29kZS5pbmRleE9mKCctJykgPiAtMSkge1xuICAgICAgaWYgKHRoaXMub3B0aW9ucy5sb2FkICE9PSAnbGFuZ3VhZ2VPbmx5JykgYWRkQ29kZSh0aGlzLmZvcm1hdExhbmd1YWdlQ29kZShjb2RlKSk7XG4gICAgICBpZiAodGhpcy5vcHRpb25zLmxvYWQgIT09ICdsYW5ndWFnZU9ubHknICYmIHRoaXMub3B0aW9ucy5sb2FkICE9PSAnY3VycmVudE9ubHknKVxuICAgICAgICBhZGRDb2RlKHRoaXMuZ2V0U2NyaXB0UGFydEZyb21Db2RlKGNvZGUpKTtcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMubG9hZCAhPT0gJ2N1cnJlbnRPbmx5JykgYWRkQ29kZSh0aGlzLmdldExhbmd1YWdlUGFydEZyb21Db2RlKGNvZGUpKTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBjb2RlID09PSAnc3RyaW5nJykge1xuICAgICAgYWRkQ29kZSh0aGlzLmZvcm1hdExhbmd1YWdlQ29kZShjb2RlKSk7XG4gICAgfVxuXG4gICAgZmFsbGJhY2tDb2Rlcy5mb3JFYWNoKGZjID0+IHtcbiAgICAgIGlmIChjb2Rlcy5pbmRleE9mKGZjKSA8IDApIGFkZENvZGUodGhpcy5mb3JtYXRMYW5ndWFnZUNvZGUoZmMpKTtcbiAgICB9KTtcblxuICAgIHJldHVybiBjb2RlcztcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBMYW5ndWFnZVV0aWw7XG4iLCJpbXBvcnQgYmFzZUxvZ2dlciBmcm9tICcuL2xvZ2dlci5qcyc7XG5cbi8vIGRlZmluaXRpb24gaHR0cDovL3RyYW5zbGF0ZS5zb3VyY2Vmb3JnZS5uZXQvd2lraS9sMTBuL3BsdXJhbGZvcm1zXG4vKiBlc2xpbnQtZGlzYWJsZSAqL1xubGV0IHNldHMgPSBbXG4gIHsgbG5nczogWydhY2gnLCdhaycsJ2FtJywnYXJuJywnYnInLCdmaWwnLCdndW4nLCdsbicsJ21mZScsJ21nJywnbWknLCdvYycsICdwdCcsICdwdC1CUicsXG4gICAgJ3RnJywndGknLCd0cicsJ3V6Jywnd2EnXSwgbnI6IFsxLDJdLCBmYzogMSB9LFxuXG4gIHsgbG5nczogWydhZicsJ2FuJywnYXN0JywnYXonLCdiZycsJ2JuJywnY2EnLCdkYScsJ2RlJywnZGV2JywnZWwnLCdlbicsXG4gICAgJ2VvJywnZXMnLCdldCcsJ2V1JywnZmknLCdmbycsJ2Z1cicsJ2Z5JywnZ2wnLCdndScsJ2hhJywnaGknLFxuICAgICdodScsJ2h5JywnaWEnLCdpdCcsJ2tuJywna3UnLCdsYicsJ21haScsJ21sJywnbW4nLCdtcicsJ25haCcsJ25hcCcsJ25iJyxcbiAgICAnbmUnLCdubCcsJ25uJywnbm8nLCduc28nLCdwYScsJ3BhcCcsJ3BtcycsJ3BzJywncHQtUFQnLCdybScsJ3NjbycsXG4gICAgJ3NlJywnc2knLCdzbycsJ3NvbicsJ3NxJywnc3YnLCdzdycsJ3RhJywndGUnLCd0aycsJ3VyJywneW8nXSwgbnI6IFsxLDJdLCBmYzogMiB9LFxuXG4gIHsgbG5nczogWydheScsJ2JvJywnY2dnJywnZmEnLCdodCcsJ2lkJywnamEnLCdqYm8nLCdrYScsJ2trJywna20nLCdrbycsJ2t5JywnbG8nLFxuICAgICdtcycsJ3NhaCcsJ3N1JywndGgnLCd0dCcsJ3VnJywndmknLCd3bycsJ3poJ10sIG5yOiBbMV0sIGZjOiAzIH0sXG5cbiAgeyBsbmdzOiBbJ2JlJywnYnMnLCAnY25yJywgJ2R6JywnaHInLCdydScsJ3NyJywndWsnXSwgbnI6IFsxLDIsNV0sIGZjOiA0IH0sXG5cbiAgeyBsbmdzOiBbJ2FyJ10sIG5yOiBbMCwxLDIsMywxMSwxMDBdLCBmYzogNSB9LFxuICB7IGxuZ3M6IFsnY3MnLCdzayddLCBucjogWzEsMiw1XSwgZmM6IDYgfSxcbiAgeyBsbmdzOiBbJ2NzYicsJ3BsJ10sIG5yOiBbMSwyLDVdLCBmYzogNyB9LFxuICB7IGxuZ3M6IFsnY3knXSwgbnI6IFsxLDIsMyw4XSwgZmM6IDggfSxcbiAgeyBsbmdzOiBbJ2ZyJ10sIG5yOiBbMSwyXSwgZmM6IDkgfSxcbiAgeyBsbmdzOiBbJ2dhJ10sIG5yOiBbMSwyLDMsNywxMV0sIGZjOiAxMCB9LFxuICB7IGxuZ3M6IFsnZ2QnXSwgbnI6IFsxLDIsMywyMF0sIGZjOiAxMSB9LFxuICB7IGxuZ3M6IFsnaXMnXSwgbnI6IFsxLDJdLCBmYzogMTIgfSxcbiAgeyBsbmdzOiBbJ2p2J10sIG5yOiBbMCwxXSwgZmM6IDEzIH0sXG4gIHsgbG5nczogWydrdyddLCBucjogWzEsMiwzLDRdLCBmYzogMTQgfSxcbiAgeyBsbmdzOiBbJ2x0J10sIG5yOiBbMSwyLDEwXSwgZmM6IDE1IH0sXG4gIHsgbG5nczogWydsdiddLCBucjogWzEsMiwwXSwgZmM6IDE2IH0sXG4gIHsgbG5nczogWydtayddLCBucjogWzEsMl0sIGZjOiAxNyB9LFxuICB7IGxuZ3M6IFsnbW5rJ10sIG5yOiBbMCwxLDJdLCBmYzogMTggfSxcbiAgeyBsbmdzOiBbJ210J10sIG5yOiBbMSwyLDExLDIwXSwgZmM6IDE5IH0sXG4gIHsgbG5nczogWydvciddLCBucjogWzIsMV0sIGZjOiAyIH0sXG4gIHsgbG5nczogWydybyddLCBucjogWzEsMiwyMF0sIGZjOiAyMCB9LFxuICB7IGxuZ3M6IFsnc2wnXSwgbnI6IFs1LDEsMiwzXSwgZmM6IDIxIH0sXG4gIHsgbG5nczogWydoZScsJ2l3J10sIG5yOiBbMSwyLDIwLDIxXSwgZmM6IDIyIH1cbl1cblxubGV0IF9ydWxlc1BsdXJhbHNUeXBlcyA9IHtcbiAgMTogZnVuY3Rpb24obikge3JldHVybiBOdW1iZXIobiA+IDEpO30sXG4gIDI6IGZ1bmN0aW9uKG4pIHtyZXR1cm4gTnVtYmVyKG4gIT0gMSk7fSxcbiAgMzogZnVuY3Rpb24obikge3JldHVybiAwO30sXG4gIDQ6IGZ1bmN0aW9uKG4pIHtyZXR1cm4gTnVtYmVyKG4lMTA9PTEgJiYgbiUxMDAhPTExID8gMCA6IG4lMTA+PTIgJiYgbiUxMDw9NCAmJiAobiUxMDA8MTAgfHwgbiUxMDA+PTIwKSA/IDEgOiAyKTt9LFxuICA1OiBmdW5jdGlvbihuKSB7cmV0dXJuIE51bWJlcihuPT0wID8gMCA6IG49PTEgPyAxIDogbj09MiA/IDIgOiBuJTEwMD49MyAmJiBuJTEwMDw9MTAgPyAzIDogbiUxMDA+PTExID8gNCA6IDUpO30sXG4gIDY6IGZ1bmN0aW9uKG4pIHtyZXR1cm4gTnVtYmVyKChuPT0xKSA/IDAgOiAobj49MiAmJiBuPD00KSA/IDEgOiAyKTt9LFxuICA3OiBmdW5jdGlvbihuKSB7cmV0dXJuIE51bWJlcihuPT0xID8gMCA6IG4lMTA+PTIgJiYgbiUxMDw9NCAmJiAobiUxMDA8MTAgfHwgbiUxMDA+PTIwKSA/IDEgOiAyKTt9LFxuICA4OiBmdW5jdGlvbihuKSB7cmV0dXJuIE51bWJlcigobj09MSkgPyAwIDogKG49PTIpID8gMSA6IChuICE9IDggJiYgbiAhPSAxMSkgPyAyIDogMyk7fSxcbiAgOTogZnVuY3Rpb24obikge3JldHVybiBOdW1iZXIobiA+PSAyKTt9LFxuICAxMDogZnVuY3Rpb24obikge3JldHVybiBOdW1iZXIobj09MSA/IDAgOiBuPT0yID8gMSA6IG48NyA/IDIgOiBuPDExID8gMyA6IDQpIDt9LFxuICAxMTogZnVuY3Rpb24obikge3JldHVybiBOdW1iZXIoKG49PTEgfHwgbj09MTEpID8gMCA6IChuPT0yIHx8IG49PTEyKSA/IDEgOiAobiA+IDIgJiYgbiA8IDIwKSA/IDIgOiAzKTt9LFxuICAxMjogZnVuY3Rpb24obikge3JldHVybiBOdW1iZXIobiUxMCE9MSB8fCBuJTEwMD09MTEpO30sXG4gIDEzOiBmdW5jdGlvbihuKSB7cmV0dXJuIE51bWJlcihuICE9PSAwKTt9LFxuICAxNDogZnVuY3Rpb24obikge3JldHVybiBOdW1iZXIoKG49PTEpID8gMCA6IChuPT0yKSA/IDEgOiAobiA9PSAzKSA/IDIgOiAzKTt9LFxuICAxNTogZnVuY3Rpb24obikge3JldHVybiBOdW1iZXIobiUxMD09MSAmJiBuJTEwMCE9MTEgPyAwIDogbiUxMD49MiAmJiAobiUxMDA8MTAgfHwgbiUxMDA+PTIwKSA/IDEgOiAyKTt9LFxuICAxNjogZnVuY3Rpb24obikge3JldHVybiBOdW1iZXIobiUxMD09MSAmJiBuJTEwMCE9MTEgPyAwIDogbiAhPT0gMCA/IDEgOiAyKTt9LFxuICAxNzogZnVuY3Rpb24obikge3JldHVybiBOdW1iZXIobj09MSB8fCBuJTEwPT0xICYmIG4lMTAwIT0xMSA/IDAgOiAxKTt9LFxuICAxODogZnVuY3Rpb24obikge3JldHVybiBOdW1iZXIobj09MCA/IDAgOiBuPT0xID8gMSA6IDIpO30sXG4gIDE5OiBmdW5jdGlvbihuKSB7cmV0dXJuIE51bWJlcihuPT0xID8gMCA6IG49PTAgfHwgKCBuJTEwMD4xICYmIG4lMTAwPDExKSA/IDEgOiAobiUxMDA+MTAgJiYgbiUxMDA8MjAgKSA/IDIgOiAzKTt9LFxuICAyMDogZnVuY3Rpb24obikge3JldHVybiBOdW1iZXIobj09MSA/IDAgOiAobj09MCB8fCAobiUxMDAgPiAwICYmIG4lMTAwIDwgMjApKSA/IDEgOiAyKTt9LFxuICAyMTogZnVuY3Rpb24obikge3JldHVybiBOdW1iZXIobiUxMDA9PTEgPyAxIDogbiUxMDA9PTIgPyAyIDogbiUxMDA9PTMgfHwgbiUxMDA9PTQgPyAzIDogMCk7IH0sXG4gIDIyOiBmdW5jdGlvbihuKSB7cmV0dXJuIE51bWJlcihuPT0xID8gMCA6IG49PTIgPyAxIDogKG48MCB8fCBuPjEwKSAmJiBuJTEwPT0wID8gMiA6IDMpOyB9XG59O1xuLyogZXNsaW50LWVuYWJsZSAqL1xuXG5mdW5jdGlvbiBjcmVhdGVSdWxlcygpIHtcbiAgY29uc3QgcnVsZXMgPSB7fTtcbiAgc2V0cy5mb3JFYWNoKChzZXQpID0+IHtcbiAgICBzZXQubG5ncy5mb3JFYWNoKChsKSA9PiB7XG4gICAgICBydWxlc1tsXSA9IHtcbiAgICAgICAgbnVtYmVyczogc2V0Lm5yLFxuICAgICAgICBwbHVyYWxzOiBfcnVsZXNQbHVyYWxzVHlwZXNbc2V0LmZjXVxuICAgICAgfTtcbiAgICB9KTtcbiAgfSk7XG4gIHJldHVybiBydWxlcztcbn1cblxuY2xhc3MgUGx1cmFsUmVzb2x2ZXIge1xuICBjb25zdHJ1Y3RvcihsYW5ndWFnZVV0aWxzLCBvcHRpb25zID0ge30pIHtcbiAgICB0aGlzLmxhbmd1YWdlVXRpbHMgPSBsYW5ndWFnZVV0aWxzO1xuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG5cbiAgICB0aGlzLmxvZ2dlciA9IGJhc2VMb2dnZXIuY3JlYXRlKCdwbHVyYWxSZXNvbHZlcicpO1xuXG4gICAgdGhpcy5ydWxlcyA9IGNyZWF0ZVJ1bGVzKCk7XG4gIH1cblxuICBhZGRSdWxlKGxuZywgb2JqKSB7XG4gICAgdGhpcy5ydWxlc1tsbmddID0gb2JqO1xuICB9XG5cbiAgZ2V0UnVsZShjb2RlKSB7XG4gICAgcmV0dXJuIHRoaXMucnVsZXNbY29kZV0gfHwgdGhpcy5ydWxlc1t0aGlzLmxhbmd1YWdlVXRpbHMuZ2V0TGFuZ3VhZ2VQYXJ0RnJvbUNvZGUoY29kZSldO1xuICB9XG5cbiAgbmVlZHNQbHVyYWwoY29kZSkge1xuICAgIGNvbnN0IHJ1bGUgPSB0aGlzLmdldFJ1bGUoY29kZSk7XG5cbiAgICByZXR1cm4gcnVsZSAmJiBydWxlLm51bWJlcnMubGVuZ3RoID4gMTtcbiAgfVxuXG4gIGdldFBsdXJhbEZvcm1zT2ZLZXkoY29kZSwga2V5KSB7XG4gICAgY29uc3QgcmV0ID0gW107XG5cbiAgICBjb25zdCBydWxlID0gdGhpcy5nZXRSdWxlKGNvZGUpO1xuXG4gICAgaWYgKCFydWxlKSByZXR1cm4gcmV0O1xuXG4gICAgcnVsZS5udW1iZXJzLmZvckVhY2goKG4pID0+IHtcbiAgICAgIGNvbnN0IHN1ZmZpeCA9IHRoaXMuZ2V0U3VmZml4KGNvZGUsIG4pO1xuICAgICAgcmV0LnB1c2goYCR7a2V5fSR7c3VmZml4fWApO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHJldDtcbiAgfVxuXG4gIGdldFN1ZmZpeChjb2RlLCBjb3VudCkge1xuICAgIGNvbnN0IHJ1bGUgPSB0aGlzLmdldFJ1bGUoY29kZSk7XG5cbiAgICBpZiAocnVsZSkge1xuICAgICAgLy8gaWYgKHJ1bGUubnVtYmVycy5sZW5ndGggPT09IDEpIHJldHVybiAnJzsgLy8gb25seSBzaW5ndWxhclxuXG4gICAgICBjb25zdCBpZHggPSBydWxlLm5vQWJzID8gcnVsZS5wbHVyYWxzKGNvdW50KSA6IHJ1bGUucGx1cmFscyhNYXRoLmFicyhjb3VudCkpO1xuICAgICAgbGV0IHN1ZmZpeCA9IHJ1bGUubnVtYmVyc1tpZHhdO1xuXG4gICAgICAvLyBzcGVjaWFsIHRyZWF0bWVudCBmb3IgbG5ncyBvbmx5IGhhdmluZyBzaW5ndWxhciBhbmQgcGx1cmFsXG4gICAgICBpZiAodGhpcy5vcHRpb25zLnNpbXBsaWZ5UGx1cmFsU3VmZml4ICYmIHJ1bGUubnVtYmVycy5sZW5ndGggPT09IDIgJiYgcnVsZS5udW1iZXJzWzBdID09PSAxKSB7XG4gICAgICAgIGlmIChzdWZmaXggPT09IDIpIHtcbiAgICAgICAgICBzdWZmaXggPSAncGx1cmFsJztcbiAgICAgICAgfSBlbHNlIGlmIChzdWZmaXggPT09IDEpIHtcbiAgICAgICAgICBzdWZmaXggPSAnJztcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBjb25zdCByZXR1cm5TdWZmaXggPSAoKSA9PiAoXG4gICAgICAgIHRoaXMub3B0aW9ucy5wcmVwZW5kICYmIHN1ZmZpeC50b1N0cmluZygpID8gdGhpcy5vcHRpb25zLnByZXBlbmQgKyBzdWZmaXgudG9TdHJpbmcoKSA6IHN1ZmZpeC50b1N0cmluZygpXG4gICAgICApO1xuXG4gICAgICAvLyBDT01QQVRJQklMSVRZIEpTT05cbiAgICAgIC8vIHYxXG4gICAgICBpZiAodGhpcy5vcHRpb25zLmNvbXBhdGliaWxpdHlKU09OID09PSAndjEnKSB7XG4gICAgICAgIGlmIChzdWZmaXggPT09IDEpIHJldHVybiAnJztcbiAgICAgICAgaWYgKHR5cGVvZiBzdWZmaXggPT09ICdudW1iZXInKSByZXR1cm4gYF9wbHVyYWxfJHtzdWZmaXgudG9TdHJpbmcoKX1gO1xuICAgICAgICByZXR1cm4gcmV0dXJuU3VmZml4KCk7XG4gICAgICB9IGVsc2UgaWYgKC8qIHYyICovIHRoaXMub3B0aW9ucy5jb21wYXRpYmlsaXR5SlNPTiA9PT0gJ3YyJykge1xuICAgICAgICByZXR1cm4gcmV0dXJuU3VmZml4KCk7XG4gICAgICB9IGVsc2UgaWYgKC8qIHYzIC0gZ2V0dGV4dCBpbmRleCAqLyB0aGlzLm9wdGlvbnMuc2ltcGxpZnlQbHVyYWxTdWZmaXggJiYgcnVsZS5udW1iZXJzLmxlbmd0aCA9PT0gMiAmJiBydWxlLm51bWJlcnNbMF0gPT09IDEpIHtcbiAgICAgICAgcmV0dXJuIHJldHVyblN1ZmZpeCgpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXMub3B0aW9ucy5wcmVwZW5kICYmIGlkeC50b1N0cmluZygpID8gdGhpcy5vcHRpb25zLnByZXBlbmQgKyBpZHgudG9TdHJpbmcoKSA6IGlkeC50b1N0cmluZygpO1xuICAgIH1cblxuICAgIHRoaXMubG9nZ2VyLndhcm4oYG5vIHBsdXJhbCBydWxlIGZvdW5kIGZvcjogJHtjb2RlfWApO1xuICAgIHJldHVybiAnJztcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBQbHVyYWxSZXNvbHZlcjtcbiIsImltcG9ydCAqIGFzIHV0aWxzIGZyb20gJy4vdXRpbHMuanMnO1xuaW1wb3J0IGJhc2VMb2dnZXIgZnJvbSAnLi9sb2dnZXIuanMnO1xuXG5jbGFzcyBJbnRlcnBvbGF0b3Ige1xuICBjb25zdHJ1Y3RvcihvcHRpb25zID0ge30pIHtcbiAgICB0aGlzLmxvZ2dlciA9IGJhc2VMb2dnZXIuY3JlYXRlKCdpbnRlcnBvbGF0b3InKTtcblxuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG4gICAgdGhpcy5mb3JtYXQgPSAob3B0aW9ucy5pbnRlcnBvbGF0aW9uICYmIG9wdGlvbnMuaW50ZXJwb2xhdGlvbi5mb3JtYXQpIHx8ICh2YWx1ZSA9PiB2YWx1ZSk7XG4gICAgdGhpcy5pbml0KG9wdGlvbnMpO1xuICB9XG5cbiAgLyogZXNsaW50IG5vLXBhcmFtLXJlYXNzaWduOiAwICovXG4gIGluaXQob3B0aW9ucyA9IHt9KSB7XG4gICAgaWYgKCFvcHRpb25zLmludGVycG9sYXRpb24pIG9wdGlvbnMuaW50ZXJwb2xhdGlvbiA9IHsgZXNjYXBlVmFsdWU6IHRydWUgfTtcblxuICAgIGNvbnN0IGlPcHRzID0gb3B0aW9ucy5pbnRlcnBvbGF0aW9uO1xuXG4gICAgdGhpcy5lc2NhcGUgPSBpT3B0cy5lc2NhcGUgIT09IHVuZGVmaW5lZCA/IGlPcHRzLmVzY2FwZSA6IHV0aWxzLmVzY2FwZTtcbiAgICB0aGlzLmVzY2FwZVZhbHVlID0gaU9wdHMuZXNjYXBlVmFsdWUgIT09IHVuZGVmaW5lZCA/IGlPcHRzLmVzY2FwZVZhbHVlIDogdHJ1ZTtcbiAgICB0aGlzLnVzZVJhd1ZhbHVlVG9Fc2NhcGUgPVxuICAgICAgaU9wdHMudXNlUmF3VmFsdWVUb0VzY2FwZSAhPT0gdW5kZWZpbmVkID8gaU9wdHMudXNlUmF3VmFsdWVUb0VzY2FwZSA6IGZhbHNlO1xuXG4gICAgdGhpcy5wcmVmaXggPSBpT3B0cy5wcmVmaXggPyB1dGlscy5yZWdleEVzY2FwZShpT3B0cy5wcmVmaXgpIDogaU9wdHMucHJlZml4RXNjYXBlZCB8fCAne3snO1xuICAgIHRoaXMuc3VmZml4ID0gaU9wdHMuc3VmZml4ID8gdXRpbHMucmVnZXhFc2NhcGUoaU9wdHMuc3VmZml4KSA6IGlPcHRzLnN1ZmZpeEVzY2FwZWQgfHwgJ319JztcblxuICAgIHRoaXMuZm9ybWF0U2VwYXJhdG9yID0gaU9wdHMuZm9ybWF0U2VwYXJhdG9yXG4gICAgICA/IGlPcHRzLmZvcm1hdFNlcGFyYXRvclxuICAgICAgOiBpT3B0cy5mb3JtYXRTZXBhcmF0b3IgfHwgJywnO1xuXG4gICAgdGhpcy51bmVzY2FwZVByZWZpeCA9IGlPcHRzLnVuZXNjYXBlU3VmZml4ID8gJycgOiBpT3B0cy51bmVzY2FwZVByZWZpeCB8fCAnLSc7XG4gICAgdGhpcy51bmVzY2FwZVN1ZmZpeCA9IHRoaXMudW5lc2NhcGVQcmVmaXggPyAnJyA6IGlPcHRzLnVuZXNjYXBlU3VmZml4IHx8ICcnO1xuXG4gICAgdGhpcy5uZXN0aW5nUHJlZml4ID0gaU9wdHMubmVzdGluZ1ByZWZpeFxuICAgICAgPyB1dGlscy5yZWdleEVzY2FwZShpT3B0cy5uZXN0aW5nUHJlZml4KVxuICAgICAgOiBpT3B0cy5uZXN0aW5nUHJlZml4RXNjYXBlZCB8fCB1dGlscy5yZWdleEVzY2FwZSgnJHQoJyk7XG4gICAgdGhpcy5uZXN0aW5nU3VmZml4ID0gaU9wdHMubmVzdGluZ1N1ZmZpeFxuICAgICAgPyB1dGlscy5yZWdleEVzY2FwZShpT3B0cy5uZXN0aW5nU3VmZml4KVxuICAgICAgOiBpT3B0cy5uZXN0aW5nU3VmZml4RXNjYXBlZCB8fCB1dGlscy5yZWdleEVzY2FwZSgnKScpO1xuXG4gICAgdGhpcy5uZXN0aW5nT3B0aW9uc1NlcGFyYXRvciA9IGlPcHRzLm5lc3RpbmdPcHRpb25zU2VwYXJhdG9yXG4gICAgICA/IGlPcHRzLm5lc3RpbmdPcHRpb25zU2VwYXJhdG9yXG4gICAgICA6IGlPcHRzLm5lc3RpbmdPcHRpb25zU2VwYXJhdG9yIHx8ICcsJztcblxuICAgIHRoaXMubWF4UmVwbGFjZXMgPSBpT3B0cy5tYXhSZXBsYWNlcyA/IGlPcHRzLm1heFJlcGxhY2VzIDogMTAwMDtcblxuICAgIHRoaXMuYWx3YXlzRm9ybWF0ID0gaU9wdHMuYWx3YXlzRm9ybWF0ICE9PSB1bmRlZmluZWQgPyBpT3B0cy5hbHdheXNGb3JtYXQgOiBmYWxzZTtcblxuICAgIC8vIHRoZSByZWdleHBcbiAgICB0aGlzLnJlc2V0UmVnRXhwKCk7XG4gIH1cblxuICByZXNldCgpIHtcbiAgICBpZiAodGhpcy5vcHRpb25zKSB0aGlzLmluaXQodGhpcy5vcHRpb25zKTtcbiAgfVxuXG4gIHJlc2V0UmVnRXhwKCkge1xuICAgIC8vIHRoZSByZWdleHBcbiAgICBjb25zdCByZWdleHBTdHIgPSBgJHt0aGlzLnByZWZpeH0oLis/KSR7dGhpcy5zdWZmaXh9YDtcbiAgICB0aGlzLnJlZ2V4cCA9IG5ldyBSZWdFeHAocmVnZXhwU3RyLCAnZycpO1xuXG4gICAgY29uc3QgcmVnZXhwVW5lc2NhcGVTdHIgPSBgJHt0aGlzLnByZWZpeH0ke3RoaXMudW5lc2NhcGVQcmVmaXh9KC4rPykke3RoaXMudW5lc2NhcGVTdWZmaXh9JHtcbiAgICAgIHRoaXMuc3VmZml4XG4gICAgfWA7XG4gICAgdGhpcy5yZWdleHBVbmVzY2FwZSA9IG5ldyBSZWdFeHAocmVnZXhwVW5lc2NhcGVTdHIsICdnJyk7XG5cbiAgICBjb25zdCBuZXN0aW5nUmVnZXhwU3RyID0gYCR7dGhpcy5uZXN0aW5nUHJlZml4fSguKz8pJHt0aGlzLm5lc3RpbmdTdWZmaXh9YDtcbiAgICB0aGlzLm5lc3RpbmdSZWdleHAgPSBuZXcgUmVnRXhwKG5lc3RpbmdSZWdleHBTdHIsICdnJyk7XG4gIH1cblxuICBpbnRlcnBvbGF0ZShzdHIsIGRhdGEsIGxuZywgb3B0aW9ucykge1xuICAgIGxldCBtYXRjaDtcbiAgICBsZXQgdmFsdWU7XG4gICAgbGV0IHJlcGxhY2VzO1xuXG4gICAgY29uc3QgZGVmYXVsdERhdGEgPVxuICAgICAgKHRoaXMub3B0aW9ucyAmJiB0aGlzLm9wdGlvbnMuaW50ZXJwb2xhdGlvbiAmJiB0aGlzLm9wdGlvbnMuaW50ZXJwb2xhdGlvbi5kZWZhdWx0VmFyaWFibGVzKSB8fFxuICAgICAge307XG5cbiAgICBmdW5jdGlvbiByZWdleFNhZmUodmFsKSB7XG4gICAgICByZXR1cm4gdmFsLnJlcGxhY2UoL1xcJC9nLCAnJCQkJCcpO1xuICAgIH1cblxuICAgIGNvbnN0IGhhbmRsZUZvcm1hdCA9IGtleSA9PiB7XG4gICAgICBpZiAoa2V5LmluZGV4T2YodGhpcy5mb3JtYXRTZXBhcmF0b3IpIDwgMCkge1xuICAgICAgICBjb25zdCBwYXRoID0gdXRpbHMuZ2V0UGF0aFdpdGhEZWZhdWx0cyhkYXRhLCBkZWZhdWx0RGF0YSwga2V5KTtcbiAgICAgICAgcmV0dXJuIHRoaXMuYWx3YXlzRm9ybWF0ID8gdGhpcy5mb3JtYXQocGF0aCwgdW5kZWZpbmVkLCBsbmcpIDogcGF0aDtcbiAgICAgIH1cblxuICAgICAgY29uc3QgcCA9IGtleS5zcGxpdCh0aGlzLmZvcm1hdFNlcGFyYXRvcik7XG4gICAgICBjb25zdCBrID0gcC5zaGlmdCgpLnRyaW0oKTtcbiAgICAgIGNvbnN0IGYgPSBwLmpvaW4odGhpcy5mb3JtYXRTZXBhcmF0b3IpLnRyaW0oKTtcblxuICAgICAgcmV0dXJuIHRoaXMuZm9ybWF0KHV0aWxzLmdldFBhdGhXaXRoRGVmYXVsdHMoZGF0YSwgZGVmYXVsdERhdGEsIGspLCBmLCBsbmcsIG9wdGlvbnMpO1xuICAgIH07XG5cbiAgICB0aGlzLnJlc2V0UmVnRXhwKCk7XG5cbiAgICBjb25zdCBtaXNzaW5nSW50ZXJwb2xhdGlvbkhhbmRsZXIgPVxuICAgICAgKG9wdGlvbnMgJiYgb3B0aW9ucy5taXNzaW5nSW50ZXJwb2xhdGlvbkhhbmRsZXIpIHx8IHRoaXMub3B0aW9ucy5taXNzaW5nSW50ZXJwb2xhdGlvbkhhbmRsZXI7XG5cbiAgICBjb25zdCBza2lwT25WYXJpYWJsZXMgPVxuICAgICAgKG9wdGlvbnMgJiYgb3B0aW9ucy5pbnRlcnBvbGF0aW9uICYmIG9wdGlvbnMuaW50ZXJwb2xhdGlvbi5za2lwT25WYXJpYWJsZXMpIHx8XG4gICAgICB0aGlzLm9wdGlvbnMuaW50ZXJwb2xhdGlvbi5za2lwT25WYXJpYWJsZXM7XG5cbiAgICBjb25zdCB0b2RvcyA9IFtcbiAgICAgIHtcbiAgICAgICAgLy8gdW5lc2NhcGUgaWYgaGFzIHVuZXNjYXBlUHJlZml4L1N1ZmZpeFxuICAgICAgICByZWdleDogdGhpcy5yZWdleHBVbmVzY2FwZSxcbiAgICAgICAgc2FmZVZhbHVlOiB2YWwgPT4gcmVnZXhTYWZlKHZhbCksXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICAvLyByZWd1bGFyIGVzY2FwZSBvbiBkZW1hbmRcbiAgICAgICAgcmVnZXg6IHRoaXMucmVnZXhwLFxuICAgICAgICBzYWZlVmFsdWU6IHZhbCA9PiAodGhpcy5lc2NhcGVWYWx1ZSA/IHJlZ2V4U2FmZSh0aGlzLmVzY2FwZSh2YWwpKSA6IHJlZ2V4U2FmZSh2YWwpKSxcbiAgICAgIH0sXG4gICAgXTtcbiAgICB0b2Rvcy5mb3JFYWNoKHRvZG8gPT4ge1xuICAgICAgcmVwbGFjZXMgPSAwO1xuICAgICAgLyogZXNsaW50IG5vLWNvbmQtYXNzaWduOiAwICovXG4gICAgICB3aGlsZSAoKG1hdGNoID0gdG9kby5yZWdleC5leGVjKHN0cikpKSB7XG4gICAgICAgIHZhbHVlID0gaGFuZGxlRm9ybWF0KG1hdGNoWzFdLnRyaW0oKSk7XG4gICAgICAgIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgaWYgKHR5cGVvZiBtaXNzaW5nSW50ZXJwb2xhdGlvbkhhbmRsZXIgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNvbnN0IHRlbXAgPSBtaXNzaW5nSW50ZXJwb2xhdGlvbkhhbmRsZXIoc3RyLCBtYXRjaCwgb3B0aW9ucyk7XG4gICAgICAgICAgICB2YWx1ZSA9IHR5cGVvZiB0ZW1wID09PSAnc3RyaW5nJyA/IHRlbXAgOiAnJztcbiAgICAgICAgICB9IGVsc2UgaWYgKHNraXBPblZhcmlhYmxlcykge1xuICAgICAgICAgICAgdmFsdWUgPSBtYXRjaFswXTtcbiAgICAgICAgICAgIGNvbnRpbnVlOyAvLyB0aGlzIG1ha2VzIHN1cmUgaXQgY29udGludWVzIHRvIGRldGVjdCBvdGhlcnNcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5sb2dnZXIud2FybihgbWlzc2VkIHRvIHBhc3MgaW4gdmFyaWFibGUgJHttYXRjaFsxXX0gZm9yIGludGVycG9sYXRpbmcgJHtzdHJ9YCk7XG4gICAgICAgICAgICB2YWx1ZSA9ICcnO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgdmFsdWUgIT09ICdzdHJpbmcnICYmICF0aGlzLnVzZVJhd1ZhbHVlVG9Fc2NhcGUpIHtcbiAgICAgICAgICB2YWx1ZSA9IHV0aWxzLm1ha2VTdHJpbmcodmFsdWUpO1xuICAgICAgICB9XG4gICAgICAgIHN0ciA9IHN0ci5yZXBsYWNlKG1hdGNoWzBdLCB0b2RvLnNhZmVWYWx1ZSh2YWx1ZSkpO1xuICAgICAgICB0b2RvLnJlZ2V4Lmxhc3RJbmRleCA9IDA7XG4gICAgICAgIHJlcGxhY2VzKys7XG4gICAgICAgIGlmIChyZXBsYWNlcyA+PSB0aGlzLm1heFJlcGxhY2VzKSB7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gc3RyO1xuICB9XG5cbiAgbmVzdChzdHIsIGZjLCBvcHRpb25zID0ge30pIHtcbiAgICBsZXQgbWF0Y2g7XG4gICAgbGV0IHZhbHVlO1xuXG4gICAgbGV0IGNsb25lZE9wdGlvbnMgPSB7IC4uLm9wdGlvbnMgfTtcbiAgICBjbG9uZWRPcHRpb25zLmFwcGx5UG9zdFByb2Nlc3NvciA9IGZhbHNlOyAvLyBhdm9pZCBwb3N0IHByb2Nlc3Npbmcgb24gbmVzdGVkIGxvb2t1cFxuICAgIGRlbGV0ZSBjbG9uZWRPcHRpb25zLmRlZmF1bHRWYWx1ZTsgLy8gYXNzZXJ0IHdlIGRvIG5vdCBnZXQgYSBlbmRsZXNzIGxvb3Agb24gaW50ZXJwb2xhdGluZyBkZWZhdWx0VmFsdWUgYWdhaW4gYW5kIGFnYWluXG5cbiAgICAvLyBpZiB2YWx1ZSBpcyBzb21ldGhpbmcgbGlrZSBcIm15S2V5XCI6IFwibG9yZW0gJChhbm90aGVyS2V5LCB7IFwiY291bnRcIjoge3thVmFsdWVJbk9wdGlvbnN9fSB9KVwiXG4gICAgZnVuY3Rpb24gaGFuZGxlSGFzT3B0aW9ucyhrZXksIGluaGVyaXRlZE9wdGlvbnMpIHtcbiAgICAgIGNvbnN0IHNlcCA9IHRoaXMubmVzdGluZ09wdGlvbnNTZXBhcmF0b3I7XG4gICAgICBpZiAoa2V5LmluZGV4T2Yoc2VwKSA8IDApIHJldHVybiBrZXk7XG5cbiAgICAgIGNvbnN0IGMgPSBrZXkuc3BsaXQobmV3IFJlZ0V4cChgJHtzZXB9WyBdKntgKSk7XG5cbiAgICAgIGxldCBvcHRpb25zU3RyaW5nID0gYHske2NbMV19YDtcbiAgICAgIGtleSA9IGNbMF07XG4gICAgICBvcHRpb25zU3RyaW5nID0gdGhpcy5pbnRlcnBvbGF0ZShvcHRpb25zU3RyaW5nLCBjbG9uZWRPcHRpb25zKTtcbiAgICAgIG9wdGlvbnNTdHJpbmcgPSBvcHRpb25zU3RyaW5nLnJlcGxhY2UoLycvZywgJ1wiJyk7XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIGNsb25lZE9wdGlvbnMgPSBKU09OLnBhcnNlKG9wdGlvbnNTdHJpbmcpO1xuXG4gICAgICAgIGlmIChpbmhlcml0ZWRPcHRpb25zKSBjbG9uZWRPcHRpb25zID0geyAuLi5pbmhlcml0ZWRPcHRpb25zLCAuLi5jbG9uZWRPcHRpb25zIH07XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHRoaXMubG9nZ2VyLndhcm4oYGZhaWxlZCBwYXJzaW5nIG9wdGlvbnMgc3RyaW5nIGluIG5lc3RpbmcgZm9yIGtleSAke2tleX1gLCBlKTtcbiAgICAgICAgcmV0dXJuIGAke2tleX0ke3NlcH0ke29wdGlvbnNTdHJpbmd9YDtcbiAgICAgIH1cblxuICAgICAgLy8gYXNzZXJ0IHdlIGRvIG5vdCBnZXQgYSBlbmRsZXNzIGxvb3Agb24gaW50ZXJwb2xhdGluZyBkZWZhdWx0VmFsdWUgYWdhaW4gYW5kIGFnYWluXG4gICAgICBkZWxldGUgY2xvbmVkT3B0aW9ucy5kZWZhdWx0VmFsdWU7XG4gICAgICByZXR1cm4ga2V5O1xuICAgIH1cblxuICAgIC8vIHJlZ3VsYXIgZXNjYXBlIG9uIGRlbWFuZFxuICAgIHdoaWxlICgobWF0Y2ggPSB0aGlzLm5lc3RpbmdSZWdleHAuZXhlYyhzdHIpKSkge1xuICAgICAgbGV0IGZvcm1hdHRlcnMgPSBbXTtcblxuICAgICAgLyoqXG4gICAgICAgKiBJZiB0aGVyZSBpcyBtb3JlIHRoYW4gb25lIHBhcmFtZXRlciAoY29udGFpbnMgdGhlIGZvcm1hdCBzZXBhcmF0b3IpLiBFLmcuOlxuICAgICAgICogICAtIHQoYSwgYilcbiAgICAgICAqICAgLSB0KGEsIGIsIGMpXG4gICAgICAgKlxuICAgICAgICogQW5kIHRob3NlIHBhcmFtZXRlcnMgYXJlIG5vdCBkeW5hbWljIHZhbHVlcyAocGFyYW1ldGVycyBkbyBub3QgaW5jbHVkZSBjdXJseSBicmFjZXMpLiBFLmcuOlxuICAgICAgICogICAtIE5vdCB0KGEsIHsgXCJrZXlcIjogXCJ7e3ZhcmlhYmxlfX1cIiB9KVxuICAgICAgICogICAtIE5vdCB0KGEsIGIsIHtcImtleUFcIjogXCJ2YWx1ZUFcIiwgXCJrZXlCXCI6IFwidmFsdWVCXCJ9KVxuICAgICAgICovXG4gICAgICBsZXQgZG9SZWR1Y2UgPSBmYWxzZTtcbiAgICAgIGlmIChtYXRjaFswXS5pbmNsdWRlcyh0aGlzLmZvcm1hdFNlcGFyYXRvcikgJiYgIS97Lip9Ly50ZXN0KG1hdGNoWzFdKSkge1xuICAgICAgICBjb25zdCByID0gbWF0Y2hbMV0uc3BsaXQodGhpcy5mb3JtYXRTZXBhcmF0b3IpLm1hcChlbGVtID0+IGVsZW0udHJpbSgpKTtcbiAgICAgICAgbWF0Y2hbMV0gPSByLnNoaWZ0KCk7XG4gICAgICAgIGZvcm1hdHRlcnMgPSByO1xuICAgICAgICBkb1JlZHVjZSA9IHRydWU7XG4gICAgICB9XG5cbiAgICAgIHZhbHVlID0gZmMoaGFuZGxlSGFzT3B0aW9ucy5jYWxsKHRoaXMsIG1hdGNoWzFdLnRyaW0oKSwgY2xvbmVkT3B0aW9ucyksIGNsb25lZE9wdGlvbnMpO1xuXG4gICAgICAvLyBpcyBvbmx5IHRoZSBuZXN0aW5nIGtleSAoa2V5MSA9ICckKGtleTIpJykgcmV0dXJuIHRoZSB2YWx1ZSB3aXRob3V0IHN0cmluZ2lmeVxuICAgICAgaWYgKHZhbHVlICYmIG1hdGNoWzBdID09PSBzdHIgJiYgdHlwZW9mIHZhbHVlICE9PSAnc3RyaW5nJykgcmV0dXJuIHZhbHVlO1xuXG4gICAgICAvLyBubyBzdHJpbmcgdG8gaW5jbHVkZSBvciBlbXB0eVxuICAgICAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gJ3N0cmluZycpIHZhbHVlID0gdXRpbHMubWFrZVN0cmluZyh2YWx1ZSk7XG4gICAgICBpZiAoIXZhbHVlKSB7XG4gICAgICAgIHRoaXMubG9nZ2VyLndhcm4oYG1pc3NlZCB0byByZXNvbHZlICR7bWF0Y2hbMV19IGZvciBuZXN0aW5nICR7c3RyfWApO1xuICAgICAgICB2YWx1ZSA9ICcnO1xuICAgICAgfVxuXG4gICAgICBpZiAoZG9SZWR1Y2UpIHtcbiAgICAgICAgdmFsdWUgPSBmb3JtYXR0ZXJzLnJlZHVjZSgodiwgZikgPT4gdGhpcy5mb3JtYXQodiwgZiwgb3B0aW9ucy5sbmcsIG9wdGlvbnMpLCB2YWx1ZS50cmltKCkpO1xuICAgICAgfVxuXG4gICAgICAvLyBOZXN0ZWQga2V5cyBzaG91bGQgbm90IGJlIGVzY2FwZWQgYnkgZGVmYXVsdCAjODU0XG4gICAgICAvLyB2YWx1ZSA9IHRoaXMuZXNjYXBlVmFsdWUgPyByZWdleFNhZmUodXRpbHMuZXNjYXBlKHZhbHVlKSkgOiByZWdleFNhZmUodmFsdWUpO1xuICAgICAgc3RyID0gc3RyLnJlcGxhY2UobWF0Y2hbMF0sIHZhbHVlKTtcbiAgICAgIHRoaXMucmVnZXhwLmxhc3RJbmRleCA9IDA7XG4gICAgfVxuICAgIHJldHVybiBzdHI7XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgSW50ZXJwb2xhdG9yO1xuIiwiaW1wb3J0ICogYXMgdXRpbHMgZnJvbSAnLi91dGlscy5qcyc7XG5pbXBvcnQgYmFzZUxvZ2dlciBmcm9tICcuL2xvZ2dlci5qcyc7XG5pbXBvcnQgRXZlbnRFbWl0dGVyIGZyb20gJy4vRXZlbnRFbWl0dGVyLmpzJztcblxuZnVuY3Rpb24gcmVtb3ZlKGFyciwgd2hhdCkge1xuICBsZXQgZm91bmQgPSBhcnIuaW5kZXhPZih3aGF0KTtcblxuICB3aGlsZSAoZm91bmQgIT09IC0xKSB7XG4gICAgYXJyLnNwbGljZShmb3VuZCwgMSk7XG4gICAgZm91bmQgPSBhcnIuaW5kZXhPZih3aGF0KTtcbiAgfVxufVxuXG5jbGFzcyBDb25uZWN0b3IgZXh0ZW5kcyBFdmVudEVtaXR0ZXIge1xuICBjb25zdHJ1Y3RvcihiYWNrZW5kLCBzdG9yZSwgc2VydmljZXMsIG9wdGlvbnMgPSB7fSkge1xuICAgIHN1cGVyKCk7XG4gICAgaWYgKHV0aWxzLmlzSUUxMCkge1xuICAgICAgRXZlbnRFbWl0dGVyLmNhbGwodGhpcyk7IC8vIDw9SUUxMCBmaXggKHVuYWJsZSB0byBjYWxsIHBhcmVudCBjb25zdHJ1Y3RvcilcbiAgICB9XG5cbiAgICB0aGlzLmJhY2tlbmQgPSBiYWNrZW5kO1xuICAgIHRoaXMuc3RvcmUgPSBzdG9yZTtcbiAgICB0aGlzLnNlcnZpY2VzID0gc2VydmljZXM7XG4gICAgdGhpcy5sYW5ndWFnZVV0aWxzID0gc2VydmljZXMubGFuZ3VhZ2VVdGlscztcbiAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xuICAgIHRoaXMubG9nZ2VyID0gYmFzZUxvZ2dlci5jcmVhdGUoJ2JhY2tlbmRDb25uZWN0b3InKTtcblxuICAgIHRoaXMuc3RhdGUgPSB7fTtcbiAgICB0aGlzLnF1ZXVlID0gW107XG5cbiAgICBpZiAodGhpcy5iYWNrZW5kICYmIHRoaXMuYmFja2VuZC5pbml0KSB7XG4gICAgICB0aGlzLmJhY2tlbmQuaW5pdChzZXJ2aWNlcywgb3B0aW9ucy5iYWNrZW5kLCBvcHRpb25zKTtcbiAgICB9XG4gIH1cblxuICBxdWV1ZUxvYWQobGFuZ3VhZ2VzLCBuYW1lc3BhY2VzLCBvcHRpb25zLCBjYWxsYmFjaykge1xuICAgIC8vIGZpbmQgd2hhdCBuZWVkcyB0byBiZSBsb2FkZWRcbiAgICBjb25zdCB0b0xvYWQgPSBbXTtcbiAgICBjb25zdCBwZW5kaW5nID0gW107XG4gICAgY29uc3QgdG9Mb2FkTGFuZ3VhZ2VzID0gW107XG4gICAgY29uc3QgdG9Mb2FkTmFtZXNwYWNlcyA9IFtdO1xuXG4gICAgbGFuZ3VhZ2VzLmZvckVhY2gobG5nID0+IHtcbiAgICAgIGxldCBoYXNBbGxOYW1lc3BhY2VzID0gdHJ1ZTtcblxuICAgICAgbmFtZXNwYWNlcy5mb3JFYWNoKG5zID0+IHtcbiAgICAgICAgY29uc3QgbmFtZSA9IGAke2xuZ318JHtuc31gO1xuXG4gICAgICAgIGlmICghb3B0aW9ucy5yZWxvYWQgJiYgdGhpcy5zdG9yZS5oYXNSZXNvdXJjZUJ1bmRsZShsbmcsIG5zKSkge1xuICAgICAgICAgIHRoaXMuc3RhdGVbbmFtZV0gPSAyOyAvLyBsb2FkZWRcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLnN0YXRlW25hbWVdIDwgMCkge1xuICAgICAgICAgIC8vIG5vdGhpbmcgdG8gZG8gZm9yIGVyclxuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuc3RhdGVbbmFtZV0gPT09IDEpIHtcbiAgICAgICAgICBpZiAocGVuZGluZy5pbmRleE9mKG5hbWUpIDwgMCkgcGVuZGluZy5wdXNoKG5hbWUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMuc3RhdGVbbmFtZV0gPSAxOyAvLyBwZW5kaW5nXG5cbiAgICAgICAgICBoYXNBbGxOYW1lc3BhY2VzID0gZmFsc2U7XG5cbiAgICAgICAgICBpZiAocGVuZGluZy5pbmRleE9mKG5hbWUpIDwgMCkgcGVuZGluZy5wdXNoKG5hbWUpO1xuICAgICAgICAgIGlmICh0b0xvYWQuaW5kZXhPZihuYW1lKSA8IDApIHRvTG9hZC5wdXNoKG5hbWUpO1xuICAgICAgICAgIGlmICh0b0xvYWROYW1lc3BhY2VzLmluZGV4T2YobnMpIDwgMCkgdG9Mb2FkTmFtZXNwYWNlcy5wdXNoKG5zKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIGlmICghaGFzQWxsTmFtZXNwYWNlcykgdG9Mb2FkTGFuZ3VhZ2VzLnB1c2gobG5nKTtcbiAgICB9KTtcblxuICAgIGlmICh0b0xvYWQubGVuZ3RoIHx8IHBlbmRpbmcubGVuZ3RoKSB7XG4gICAgICB0aGlzLnF1ZXVlLnB1c2goe1xuICAgICAgICBwZW5kaW5nLFxuICAgICAgICBsb2FkZWQ6IHt9LFxuICAgICAgICBlcnJvcnM6IFtdLFxuICAgICAgICBjYWxsYmFjayxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICB0b0xvYWQsXG4gICAgICBwZW5kaW5nLFxuICAgICAgdG9Mb2FkTGFuZ3VhZ2VzLFxuICAgICAgdG9Mb2FkTmFtZXNwYWNlcyxcbiAgICB9O1xuICB9XG5cbiAgbG9hZGVkKG5hbWUsIGVyciwgZGF0YSkge1xuICAgIGNvbnN0IHMgPSBuYW1lLnNwbGl0KCd8Jyk7XG4gICAgY29uc3QgbG5nID0gc1swXTtcbiAgICBjb25zdCBucyA9IHNbMV07XG5cbiAgICBpZiAoZXJyKSB0aGlzLmVtaXQoJ2ZhaWxlZExvYWRpbmcnLCBsbmcsIG5zLCBlcnIpO1xuXG4gICAgaWYgKGRhdGEpIHtcbiAgICAgIHRoaXMuc3RvcmUuYWRkUmVzb3VyY2VCdW5kbGUobG5nLCBucywgZGF0YSk7XG4gICAgfVxuXG4gICAgLy8gc2V0IGxvYWRlZFxuICAgIHRoaXMuc3RhdGVbbmFtZV0gPSBlcnIgPyAtMSA6IDI7XG5cbiAgICAvLyBjb25zb2xpZGF0ZWQgbG9hZGluZyBkb25lIGluIHRoaXMgcnVuIC0gb25seSBlbWl0IG9uY2UgZm9yIGEgbG9hZGVkIG5hbWVzcGFjZVxuICAgIGNvbnN0IGxvYWRlZCA9IHt9O1xuXG4gICAgLy8gY2FsbGJhY2sgaWYgcmVhZHlcbiAgICB0aGlzLnF1ZXVlLmZvckVhY2gocSA9PiB7XG4gICAgICB1dGlscy5wdXNoUGF0aChxLmxvYWRlZCwgW2xuZ10sIG5zKTtcbiAgICAgIHJlbW92ZShxLnBlbmRpbmcsIG5hbWUpO1xuXG4gICAgICBpZiAoZXJyKSBxLmVycm9ycy5wdXNoKGVycik7XG5cbiAgICAgIGlmIChxLnBlbmRpbmcubGVuZ3RoID09PSAwICYmICFxLmRvbmUpIHtcbiAgICAgICAgLy8gb25seSBkbyBvbmNlIHBlciBsb2FkZWQgLT4gdGhpcy5lbWl0KCdsb2FkZWQnLCBxLmxvYWRlZCk7XG4gICAgICAgIE9iamVjdC5rZXlzKHEubG9hZGVkKS5mb3JFYWNoKGwgPT4ge1xuICAgICAgICAgIGlmICghbG9hZGVkW2xdKSBsb2FkZWRbbF0gPSBbXTtcbiAgICAgICAgICBpZiAocS5sb2FkZWRbbF0ubGVuZ3RoKSB7XG4gICAgICAgICAgICBxLmxvYWRlZFtsXS5mb3JFYWNoKG5zID0+IHtcbiAgICAgICAgICAgICAgaWYgKGxvYWRlZFtsXS5pbmRleE9mKG5zKSA8IDApIGxvYWRlZFtsXS5wdXNoKG5zKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLyogZXNsaW50IG5vLXBhcmFtLXJlYXNzaWduOiAwICovXG4gICAgICAgIHEuZG9uZSA9IHRydWU7XG4gICAgICAgIGlmIChxLmVycm9ycy5sZW5ndGgpIHtcbiAgICAgICAgICBxLmNhbGxiYWNrKHEuZXJyb3JzKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBxLmNhbGxiYWNrKCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIGVtaXQgY29uc29saWRhdGVkIGxvYWRlZCBldmVudFxuICAgIHRoaXMuZW1pdCgnbG9hZGVkJywgbG9hZGVkKTtcblxuICAgIC8vIHJlbW92ZSBkb25lIGxvYWQgcmVxdWVzdHNcbiAgICB0aGlzLnF1ZXVlID0gdGhpcy5xdWV1ZS5maWx0ZXIocSA9PiAhcS5kb25lKTtcbiAgfVxuXG4gIHJlYWQobG5nLCBucywgZmNOYW1lLCB0cmllZCA9IDAsIHdhaXQgPSAzNTAsIGNhbGxiYWNrKSB7XG4gICAgaWYgKCFsbmcubGVuZ3RoKSByZXR1cm4gY2FsbGJhY2sobnVsbCwge30pOyAvLyBub3RpbmcgdG8gbG9hZFxuXG4gICAgcmV0dXJuIHRoaXMuYmFja2VuZFtmY05hbWVdKGxuZywgbnMsIChlcnIsIGRhdGEpID0+IHtcbiAgICAgIGlmIChlcnIgJiYgZGF0YSAvKiA9IHJldHJ5RmxhZyAqLyAmJiB0cmllZCA8IDUpIHtcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgdGhpcy5yZWFkLmNhbGwodGhpcywgbG5nLCBucywgZmNOYW1lLCB0cmllZCArIDEsIHdhaXQgKiAyLCBjYWxsYmFjayk7XG4gICAgICAgIH0sIHdhaXQpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjYWxsYmFjayhlcnIsIGRhdGEpO1xuICAgIH0pO1xuICB9XG5cbiAgLyogZXNsaW50IGNvbnNpc3RlbnQtcmV0dXJuOiAwICovXG4gIHByZXBhcmVMb2FkaW5nKGxhbmd1YWdlcywgbmFtZXNwYWNlcywgb3B0aW9ucyA9IHt9LCBjYWxsYmFjaykge1xuICAgIGlmICghdGhpcy5iYWNrZW5kKSB7XG4gICAgICB0aGlzLmxvZ2dlci53YXJuKCdObyBiYWNrZW5kIHdhcyBhZGRlZCB2aWEgaTE4bmV4dC51c2UuIFdpbGwgbm90IGxvYWQgcmVzb3VyY2VzLicpO1xuICAgICAgcmV0dXJuIGNhbGxiYWNrICYmIGNhbGxiYWNrKCk7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBsYW5ndWFnZXMgPT09ICdzdHJpbmcnKSBsYW5ndWFnZXMgPSB0aGlzLmxhbmd1YWdlVXRpbHMudG9SZXNvbHZlSGllcmFyY2h5KGxhbmd1YWdlcyk7XG4gICAgaWYgKHR5cGVvZiBuYW1lc3BhY2VzID09PSAnc3RyaW5nJykgbmFtZXNwYWNlcyA9IFtuYW1lc3BhY2VzXTtcblxuICAgIGNvbnN0IHRvTG9hZCA9IHRoaXMucXVldWVMb2FkKGxhbmd1YWdlcywgbmFtZXNwYWNlcywgb3B0aW9ucywgY2FsbGJhY2spO1xuICAgIGlmICghdG9Mb2FkLnRvTG9hZC5sZW5ndGgpIHtcbiAgICAgIGlmICghdG9Mb2FkLnBlbmRpbmcubGVuZ3RoKSBjYWxsYmFjaygpOyAvLyBub3RoaW5nIHRvIGxvYWQgYW5kIG5vIHBlbmRpbmdzLi4uY2FsbGJhY2sgbm93XG4gICAgICByZXR1cm4gbnVsbDsgLy8gcGVuZGluZ3Mgd2lsbCB0cmlnZ2VyIGNhbGxiYWNrXG4gICAgfVxuXG4gICAgdG9Mb2FkLnRvTG9hZC5mb3JFYWNoKG5hbWUgPT4ge1xuICAgICAgdGhpcy5sb2FkT25lKG5hbWUpO1xuICAgIH0pO1xuICB9XG5cbiAgbG9hZChsYW5ndWFnZXMsIG5hbWVzcGFjZXMsIGNhbGxiYWNrKSB7XG4gICAgdGhpcy5wcmVwYXJlTG9hZGluZyhsYW5ndWFnZXMsIG5hbWVzcGFjZXMsIHt9LCBjYWxsYmFjayk7XG4gIH1cblxuICByZWxvYWQobGFuZ3VhZ2VzLCBuYW1lc3BhY2VzLCBjYWxsYmFjaykge1xuICAgIHRoaXMucHJlcGFyZUxvYWRpbmcobGFuZ3VhZ2VzLCBuYW1lc3BhY2VzLCB7IHJlbG9hZDogdHJ1ZSB9LCBjYWxsYmFjayk7XG4gIH1cblxuICBsb2FkT25lKG5hbWUsIHByZWZpeCA9ICcnKSB7XG4gICAgY29uc3QgcyA9IG5hbWUuc3BsaXQoJ3wnKTtcbiAgICBjb25zdCBsbmcgPSBzWzBdO1xuICAgIGNvbnN0IG5zID0gc1sxXTtcblxuICAgIHRoaXMucmVhZChsbmcsIG5zLCAncmVhZCcsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICBpZiAoZXJyKSB0aGlzLmxvZ2dlci53YXJuKGAke3ByZWZpeH1sb2FkaW5nIG5hbWVzcGFjZSAke25zfSBmb3IgbGFuZ3VhZ2UgJHtsbmd9IGZhaWxlZGAsIGVycik7XG4gICAgICBpZiAoIWVyciAmJiBkYXRhKVxuICAgICAgICB0aGlzLmxvZ2dlci5sb2coYCR7cHJlZml4fWxvYWRlZCBuYW1lc3BhY2UgJHtuc30gZm9yIGxhbmd1YWdlICR7bG5nfWAsIGRhdGEpO1xuXG4gICAgICB0aGlzLmxvYWRlZChuYW1lLCBlcnIsIGRhdGEpO1xuICAgIH0pO1xuICB9XG5cbiAgc2F2ZU1pc3NpbmcobGFuZ3VhZ2VzLCBuYW1lc3BhY2UsIGtleSwgZmFsbGJhY2tWYWx1ZSwgaXNVcGRhdGUsIG9wdGlvbnMgPSB7fSkge1xuICAgIGlmIChcbiAgICAgIHRoaXMuc2VydmljZXMudXRpbHMgJiZcbiAgICAgIHRoaXMuc2VydmljZXMudXRpbHMuaGFzTG9hZGVkTmFtZXNwYWNlICYmXG4gICAgICAhdGhpcy5zZXJ2aWNlcy51dGlscy5oYXNMb2FkZWROYW1lc3BhY2UobmFtZXNwYWNlKVxuICAgICkge1xuICAgICAgdGhpcy5sb2dnZXIud2FybihcbiAgICAgICAgYGRpZCBub3Qgc2F2ZSBrZXkgXCIke2tleX1cIiBhcyB0aGUgbmFtZXNwYWNlIFwiJHtuYW1lc3BhY2V9XCIgd2FzIG5vdCB5ZXQgbG9hZGVkYCxcbiAgICAgICAgJ1RoaXMgbWVhbnMgc29tZXRoaW5nIElTIFdST05HIGluIHlvdXIgc2V0dXAuIFlvdSBhY2Nlc3MgdGhlIHQgZnVuY3Rpb24gYmVmb3JlIGkxOG5leHQuaW5pdCAvIGkxOG5leHQubG9hZE5hbWVzcGFjZSAvIGkxOG5leHQuY2hhbmdlTGFuZ3VhZ2Ugd2FzIGRvbmUuIFdhaXQgZm9yIHRoZSBjYWxsYmFjayBvciBQcm9taXNlIHRvIHJlc29sdmUgYmVmb3JlIGFjY2Vzc2luZyBpdCEhIScsXG4gICAgICApO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIGlnbm9yZSBub24gdmFsaWQga2V5c1xuICAgIGlmIChrZXkgPT09IHVuZGVmaW5lZCB8fCBrZXkgPT09IG51bGwgfHwga2V5ID09PSAnJykgcmV0dXJuO1xuXG4gICAgaWYgKHRoaXMuYmFja2VuZCAmJiB0aGlzLmJhY2tlbmQuY3JlYXRlKSB7XG4gICAgICB0aGlzLmJhY2tlbmQuY3JlYXRlKGxhbmd1YWdlcywgbmFtZXNwYWNlLCBrZXksIGZhbGxiYWNrVmFsdWUsIG51bGwgLyogdW51c2VkIGNhbGxiYWNrICovLCB7XG4gICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICAgIGlzVXBkYXRlLFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gd3JpdGUgdG8gc3RvcmUgdG8gYXZvaWQgcmVzZW5kaW5nXG4gICAgaWYgKCFsYW5ndWFnZXMgfHwgIWxhbmd1YWdlc1swXSkgcmV0dXJuO1xuICAgIHRoaXMuc3RvcmUuYWRkUmVzb3VyY2UobGFuZ3VhZ2VzWzBdLCBuYW1lc3BhY2UsIGtleSwgZmFsbGJhY2tWYWx1ZSk7XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgQ29ubmVjdG9yO1xuIiwiZXhwb3J0IGZ1bmN0aW9uIGdldCgpIHtcbiAgcmV0dXJuIHtcbiAgICBkZWJ1ZzogZmFsc2UsXG4gICAgaW5pdEltbWVkaWF0ZTogdHJ1ZSxcblxuICAgIG5zOiBbJ3RyYW5zbGF0aW9uJ10sXG4gICAgZGVmYXVsdE5TOiBbJ3RyYW5zbGF0aW9uJ10sXG4gICAgZmFsbGJhY2tMbmc6IFsnZGV2J10sXG4gICAgZmFsbGJhY2tOUzogZmFsc2UsIC8vIHN0cmluZyBvciBhcnJheSBvZiBuYW1lc3BhY2VzXG5cbiAgICAvLyB0ZW1wb3JhbCBiYWNrd2FyZHMgY29tcGF0aWJpbGl0eSBXSElURUxJU1QgUkVNT1ZBTFxuICAgIHdoaXRlbGlzdDogZmFsc2UsIC8vIGFycmF5IHdpdGggc3VwcG9ydGVkIGxhbmd1YWdlc1xuICAgIG5vbkV4cGxpY2l0V2hpdGVsaXN0OiBmYWxzZSxcbiAgICAvLyBlbmQgdGVtcG9yYWwgYmFja3dhcmRzIGNvbXBhdGliaWxpdHkgV0hJVEVMSVNUIFJFTU9WQUxcblxuICAgIHN1cHBvcnRlZExuZ3M6IGZhbHNlLCAvLyBhcnJheSB3aXRoIHN1cHBvcnRlZCBsYW5ndWFnZXNcbiAgICBub25FeHBsaWNpdFN1cHBvcnRlZExuZ3M6IGZhbHNlLFxuICAgIGxvYWQ6ICdhbGwnLCAvLyB8IGN1cnJlbnRPbmx5IHwgbGFuZ3VhZ2VPbmx5XG4gICAgcHJlbG9hZDogZmFsc2UsIC8vIGFycmF5IHdpdGggcHJlbG9hZCBsYW5ndWFnZXNcblxuICAgIHNpbXBsaWZ5UGx1cmFsU3VmZml4OiB0cnVlLFxuICAgIGtleVNlcGFyYXRvcjogJy4nLFxuICAgIG5zU2VwYXJhdG9yOiAnOicsXG4gICAgcGx1cmFsU2VwYXJhdG9yOiAnXycsXG4gICAgY29udGV4dFNlcGFyYXRvcjogJ18nLFxuXG4gICAgcGFydGlhbEJ1bmRsZWRMYW5ndWFnZXM6IGZhbHNlLCAvLyBhbGxvdyBidW5kbGluZyBjZXJ0YWluIGxhbmd1YWdlcyB0aGF0IGFyZSBub3QgcmVtb3RlbHkgZmV0Y2hlZFxuICAgIHNhdmVNaXNzaW5nOiBmYWxzZSwgLy8gZW5hYmxlIHRvIHNlbmQgbWlzc2luZyB2YWx1ZXNcbiAgICB1cGRhdGVNaXNzaW5nOiBmYWxzZSwgLy8gZW5hYmxlIHRvIHVwZGF0ZSBkZWZhdWx0IHZhbHVlcyBpZiBkaWZmZXJlbnQgZnJvbSB0cmFuc2xhdGVkIHZhbHVlIChvbmx5IHVzZWZ1bCBvbiBpbml0aWFsIGRldmVsb3BtZW50LCBvciB3aGVuIGtlZXBpbmcgY29kZSBhcyBzb3VyY2Ugb2YgdHJ1dGgpXG4gICAgc2F2ZU1pc3NpbmdUbzogJ2ZhbGxiYWNrJywgLy8gJ2N1cnJlbnQnIHx8ICdhbGwnXG4gICAgc2F2ZU1pc3NpbmdQbHVyYWxzOiB0cnVlLCAvLyB3aWxsIHNhdmUgYWxsIGZvcm1zIG5vdCBvbmx5IHNpbmd1bGFyIGtleVxuICAgIG1pc3NpbmdLZXlIYW5kbGVyOiBmYWxzZSwgLy8gZnVuY3Rpb24obG5nLCBucywga2V5LCBmYWxsYmFja1ZhbHVlKSAtPiBvdmVycmlkZSBpZiBwcmVmZXIgb24gaGFuZGxpbmdcbiAgICBtaXNzaW5nSW50ZXJwb2xhdGlvbkhhbmRsZXI6IGZhbHNlLCAvLyBmdW5jdGlvbihzdHIsIG1hdGNoKVxuXG4gICAgcG9zdFByb2Nlc3M6IGZhbHNlLCAvLyBzdHJpbmcgb3IgYXJyYXkgb2YgcG9zdFByb2Nlc3NvciBuYW1lc1xuICAgIHBvc3RQcm9jZXNzUGFzc1Jlc29sdmVkOiBmYWxzZSwgLy8gcGFzcyByZXNvbHZlZCBvYmplY3QgaW50byAnb3B0aW9ucy5pMThuUmVzb2x2ZWQnIGZvciBwb3N0cHJvY2Vzc29yXG4gICAgcmV0dXJuTnVsbDogdHJ1ZSwgLy8gYWxsb3dzIG51bGwgdmFsdWUgYXMgdmFsaWQgdHJhbnNsYXRpb25cbiAgICByZXR1cm5FbXB0eVN0cmluZzogdHJ1ZSwgLy8gYWxsb3dzIGVtcHR5IHN0cmluZyB2YWx1ZSBhcyB2YWxpZCB0cmFuc2xhdGlvblxuICAgIHJldHVybk9iamVjdHM6IGZhbHNlLFxuICAgIGpvaW5BcnJheXM6IGZhbHNlLCAvLyBvciBzdHJpbmcgdG8gam9pbiBhcnJheVxuICAgIHJldHVybmVkT2JqZWN0SGFuZGxlcjogZmFsc2UsIC8vIGZ1bmN0aW9uKGtleSwgdmFsdWUsIG9wdGlvbnMpIHRyaWdnZXJlZCBpZiBrZXkgcmV0dXJucyBvYmplY3QgYnV0IHJldHVybk9iamVjdHMgaXMgc2V0IHRvIGZhbHNlXG4gICAgcGFyc2VNaXNzaW5nS2V5SGFuZGxlcjogZmFsc2UsIC8vIGZ1bmN0aW9uKGtleSkgcGFyc2VkIGEga2V5IHRoYXQgd2FzIG5vdCBmb3VuZCBpbiB0KCkgYmVmb3JlIHJldHVybmluZ1xuICAgIGFwcGVuZE5hbWVzcGFjZVRvTWlzc2luZ0tleTogZmFsc2UsXG4gICAgYXBwZW5kTmFtZXNwYWNlVG9DSU1vZGU6IGZhbHNlLFxuICAgIG92ZXJsb2FkVHJhbnNsYXRpb25PcHRpb25IYW5kbGVyOiBmdW5jdGlvbiBoYW5kbGUoYXJncykge1xuICAgICAgdmFyIHJldCA9IHt9O1xuICAgICAgaWYgKHR5cGVvZiBhcmdzWzFdID09PSAnb2JqZWN0JykgcmV0ID0gYXJnc1sxXTtcbiAgICAgIGlmICh0eXBlb2YgYXJnc1sxXSA9PT0gJ3N0cmluZycpIHJldC5kZWZhdWx0VmFsdWUgPSBhcmdzWzFdO1xuICAgICAgaWYgKHR5cGVvZiBhcmdzWzJdID09PSAnc3RyaW5nJykgcmV0LnREZXNjcmlwdGlvbiA9IGFyZ3NbMl07XG4gICAgICBpZiAodHlwZW9mIGFyZ3NbMl0gPT09ICdvYmplY3QnIHx8IHR5cGVvZiBhcmdzWzNdID09PSAnb2JqZWN0Jykge1xuICAgICAgICB2YXIgb3B0aW9ucyA9IGFyZ3NbM10gfHwgYXJnc1syXTtcbiAgICAgICAgT2JqZWN0LmtleXMob3B0aW9ucykuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgICByZXRba2V5XSA9IG9wdGlvbnNba2V5XTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmV0O1xuICAgIH0sXG4gICAgaW50ZXJwb2xhdGlvbjoge1xuICAgICAgZXNjYXBlVmFsdWU6IHRydWUsXG4gICAgICBmb3JtYXQ6ICh2YWx1ZSwgZm9ybWF0LCBsbmcsIG9wdGlvbnMpID0+IHZhbHVlLFxuICAgICAgcHJlZml4OiAne3snLFxuICAgICAgc3VmZml4OiAnfX0nLFxuICAgICAgZm9ybWF0U2VwYXJhdG9yOiAnLCcsXG4gICAgICAvLyBwcmVmaXhFc2NhcGVkOiAne3snLFxuICAgICAgLy8gc3VmZml4RXNjYXBlZDogJ319JyxcbiAgICAgIC8vIHVuZXNjYXBlU3VmZml4OiAnJyxcbiAgICAgIHVuZXNjYXBlUHJlZml4OiAnLScsXG5cbiAgICAgIG5lc3RpbmdQcmVmaXg6ICckdCgnLFxuICAgICAgbmVzdGluZ1N1ZmZpeDogJyknLFxuICAgICAgbmVzdGluZ09wdGlvbnNTZXBhcmF0b3I6ICcsJyxcbiAgICAgIC8vIG5lc3RpbmdQcmVmaXhFc2NhcGVkOiAnJHQoJyxcbiAgICAgIC8vIG5lc3RpbmdTdWZmaXhFc2NhcGVkOiAnKScsXG4gICAgICAvLyBkZWZhdWx0VmFyaWFibGVzOiB1bmRlZmluZWQgLy8gb2JqZWN0IHRoYXQgY2FuIGhhdmUgdmFsdWVzIHRvIGludGVycG9sYXRlIG9uIC0gZXh0ZW5kcyBwYXNzZWQgaW4gaW50ZXJwb2xhdGlvbiBkYXRhXG4gICAgICBtYXhSZXBsYWNlczogMTAwMCwgLy8gbWF4IHJlcGxhY2VzIHRvIHByZXZlbnQgZW5kbGVzcyBsb29wXG4gICAgICBza2lwT25WYXJpYWJsZXM6IGZhbHNlLFxuICAgIH0sXG4gIH07XG59XG5cbi8qIGVzbGludCBuby1wYXJhbS1yZWFzc2lnbjogMCAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRyYW5zZm9ybU9wdGlvbnMob3B0aW9ucykge1xuICAvLyBjcmVhdGUgbmFtZXNwYWNlIG9iamVjdCBpZiBuYW1lc3BhY2UgaXMgcGFzc2VkIGluIGFzIHN0cmluZ1xuICBpZiAodHlwZW9mIG9wdGlvbnMubnMgPT09ICdzdHJpbmcnKSBvcHRpb25zLm5zID0gW29wdGlvbnMubnNdO1xuICBpZiAodHlwZW9mIG9wdGlvbnMuZmFsbGJhY2tMbmcgPT09ICdzdHJpbmcnKSBvcHRpb25zLmZhbGxiYWNrTG5nID0gW29wdGlvbnMuZmFsbGJhY2tMbmddO1xuICBpZiAodHlwZW9mIG9wdGlvbnMuZmFsbGJhY2tOUyA9PT0gJ3N0cmluZycpIG9wdGlvbnMuZmFsbGJhY2tOUyA9IFtvcHRpb25zLmZhbGxiYWNrTlNdO1xuXG4gIC8vIHRlbXBvcmFsIGJhY2t3YXJkcyBjb21wYXRpYmlsaXR5IFdISVRFTElTVCBSRU1PVkFMXG4gIGlmIChvcHRpb25zLndoaXRlbGlzdCkge1xuICAgIGlmIChvcHRpb25zLndoaXRlbGlzdCAmJiBvcHRpb25zLndoaXRlbGlzdC5pbmRleE9mKCdjaW1vZGUnKSA8IDApIHtcbiAgICAgIG9wdGlvbnMud2hpdGVsaXN0ID0gb3B0aW9ucy53aGl0ZWxpc3QuY29uY2F0KFsnY2ltb2RlJ10pO1xuICAgIH1cblxuICAgIG9wdGlvbnMuc3VwcG9ydGVkTG5ncyA9IG9wdGlvbnMud2hpdGVsaXN0O1xuICB9XG5cbiAgaWYgKG9wdGlvbnMubm9uRXhwbGljaXRXaGl0ZWxpc3QpIHtcbiAgICBvcHRpb25zLm5vbkV4cGxpY2l0U3VwcG9ydGVkTG5ncyA9IG9wdGlvbnMubm9uRXhwbGljaXRXaGl0ZWxpc3Q7XG4gIH1cbiAgLy8gZW5kIHRlbXBvcmFsIGJhY2t3YXJkcyBjb21wYXRpYmlsaXR5IFdISVRFTElTVCBSRU1PVkFMXG5cbiAgLy8gZXh0ZW5kIHN1cHBvcnRlZExuZ3Mgd2l0aCBjaW1vZGVcbiAgaWYgKG9wdGlvbnMuc3VwcG9ydGVkTG5ncyAmJiBvcHRpb25zLnN1cHBvcnRlZExuZ3MuaW5kZXhPZignY2ltb2RlJykgPCAwKSB7XG4gICAgb3B0aW9ucy5zdXBwb3J0ZWRMbmdzID0gb3B0aW9ucy5zdXBwb3J0ZWRMbmdzLmNvbmNhdChbJ2NpbW9kZSddKTtcbiAgfVxuXG4gIHJldHVybiBvcHRpb25zO1xufVxuIiwiaW1wb3J0IGJhc2VMb2dnZXIgZnJvbSAnLi9sb2dnZXIuanMnO1xuaW1wb3J0IEV2ZW50RW1pdHRlciBmcm9tICcuL0V2ZW50RW1pdHRlci5qcyc7XG5pbXBvcnQgUmVzb3VyY2VTdG9yZSBmcm9tICcuL1Jlc291cmNlU3RvcmUuanMnO1xuaW1wb3J0IFRyYW5zbGF0b3IgZnJvbSAnLi9UcmFuc2xhdG9yLmpzJztcbmltcG9ydCBMYW5ndWFnZVV0aWxzIGZyb20gJy4vTGFuZ3VhZ2VVdGlscy5qcyc7XG5pbXBvcnQgUGx1cmFsUmVzb2x2ZXIgZnJvbSAnLi9QbHVyYWxSZXNvbHZlci5qcyc7XG5pbXBvcnQgSW50ZXJwb2xhdG9yIGZyb20gJy4vSW50ZXJwb2xhdG9yLmpzJztcbmltcG9ydCBCYWNrZW5kQ29ubmVjdG9yIGZyb20gJy4vQmFja2VuZENvbm5lY3Rvci5qcyc7XG5pbXBvcnQgeyBnZXQgYXMgZ2V0RGVmYXVsdHMsIHRyYW5zZm9ybU9wdGlvbnMgfSBmcm9tICcuL2RlZmF1bHRzLmpzJztcbmltcG9ydCBwb3N0UHJvY2Vzc29yIGZyb20gJy4vcG9zdFByb2Nlc3Nvci5qcyc7XG5pbXBvcnQgeyBkZWZlciwgaXNJRTEwIH0gZnJvbSAnLi91dGlscy5qcyc7XG5cbmZ1bmN0aW9uIG5vb3AoKSB7IH1cblxuY2xhc3MgSTE4biBleHRlbmRzIEV2ZW50RW1pdHRlciB7XG4gIGNvbnN0cnVjdG9yKG9wdGlvbnMgPSB7fSwgY2FsbGJhY2spIHtcbiAgICBzdXBlcigpO1xuICAgIGlmIChpc0lFMTApIHtcbiAgICAgIEV2ZW50RW1pdHRlci5jYWxsKHRoaXMpIC8vIDw9SUUxMCBmaXggKHVuYWJsZSB0byBjYWxsIHBhcmVudCBjb25zdHJ1Y3RvcilcbiAgICB9XG5cbiAgICB0aGlzLm9wdGlvbnMgPSB0cmFuc2Zvcm1PcHRpb25zKG9wdGlvbnMpO1xuICAgIHRoaXMuc2VydmljZXMgPSB7fTtcbiAgICB0aGlzLmxvZ2dlciA9IGJhc2VMb2dnZXI7XG4gICAgdGhpcy5tb2R1bGVzID0geyBleHRlcm5hbDogW10gfTtcblxuICAgIGlmIChjYWxsYmFjayAmJiAhdGhpcy5pc0luaXRpYWxpemVkICYmICFvcHRpb25zLmlzQ2xvbmUpIHtcbiAgICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9pMThuZXh0L2kxOG5leHQvaXNzdWVzLzg3OVxuICAgICAgaWYgKCF0aGlzLm9wdGlvbnMuaW5pdEltbWVkaWF0ZSkge1xuICAgICAgICB0aGlzLmluaXQob3B0aW9ucywgY2FsbGJhY2spO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgIH1cbiAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICB0aGlzLmluaXQob3B0aW9ucywgY2FsbGJhY2spO1xuICAgICAgfSwgMCk7XG4gICAgfVxuICB9XG5cbiAgaW5pdChvcHRpb25zID0ge30sIGNhbGxiYWNrKSB7XG4gICAgaWYgKHR5cGVvZiBvcHRpb25zID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBjYWxsYmFjayA9IG9wdGlvbnM7XG4gICAgICBvcHRpb25zID0ge307XG4gICAgfVxuXG4gICAgLy8gdGVtcG9yYWwgYmFja3dhcmRzIGNvbXBhdGliaWxpdHkgV0hJVEVMSVNUIFJFTU9WQUxcbiAgICBpZiAob3B0aW9ucy53aGl0ZWxpc3QgJiYgIW9wdGlvbnMuc3VwcG9ydGVkTG5ncykge1xuICAgICAgdGhpcy5sb2dnZXIuZGVwcmVjYXRlKCd3aGl0ZWxpc3QnLCAnb3B0aW9uIFwid2hpdGVsaXN0XCIgd2lsbCBiZSByZW5hbWVkIHRvIFwic3VwcG9ydGVkTG5nc1wiIGluIHRoZSBuZXh0IG1ham9yIC0gcGxlYXNlIG1ha2Ugc3VyZSB0byByZW5hbWUgdGhpcyBvcHRpb24gYXNhcC4nKTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMubm9uRXhwbGljaXRXaGl0ZWxpc3QgJiYgIW9wdGlvbnMubm9uRXhwbGljaXRTdXBwb3J0ZWRMbmdzKSB7XG4gICAgICB0aGlzLmxvZ2dlci5kZXByZWNhdGUoJ3doaXRlbGlzdCcsICdvcHRpb25zIFwibm9uRXhwbGljaXRXaGl0ZWxpc3RcIiB3aWxsIGJlIHJlbmFtZWQgdG8gXCJub25FeHBsaWNpdFN1cHBvcnRlZExuZ3NcIiBpbiB0aGUgbmV4dCBtYWpvciAtIHBsZWFzZSBtYWtlIHN1cmUgdG8gcmVuYW1lIHRoaXMgb3B0aW9uIGFzYXAuJyk7XG4gICAgfVxuICAgIC8vIGVuZCB0ZW1wb3JhbCBiYWNrd2FyZHMgY29tcGF0aWJpbGl0eSBXSElURUxJU1QgUkVNT1ZBTFxuXG5cbiAgICB0aGlzLm9wdGlvbnMgPSB7IC4uLmdldERlZmF1bHRzKCksIC4uLnRoaXMub3B0aW9ucywgLi4udHJhbnNmb3JtT3B0aW9ucyhvcHRpb25zKSB9O1xuXG4gICAgdGhpcy5mb3JtYXQgPSB0aGlzLm9wdGlvbnMuaW50ZXJwb2xhdGlvbi5mb3JtYXQ7XG4gICAgaWYgKCFjYWxsYmFjaykgY2FsbGJhY2sgPSBub29wO1xuXG4gICAgZnVuY3Rpb24gY3JlYXRlQ2xhc3NPbkRlbWFuZChDbGFzc09yT2JqZWN0KSB7XG4gICAgICBpZiAoIUNsYXNzT3JPYmplY3QpIHJldHVybiBudWxsO1xuICAgICAgaWYgKHR5cGVvZiBDbGFzc09yT2JqZWN0ID09PSAnZnVuY3Rpb24nKSByZXR1cm4gbmV3IENsYXNzT3JPYmplY3QoKTtcbiAgICAgIHJldHVybiBDbGFzc09yT2JqZWN0O1xuICAgIH1cblxuICAgIC8vIGluaXQgc2VydmljZXNcbiAgICBpZiAoIXRoaXMub3B0aW9ucy5pc0Nsb25lKSB7XG4gICAgICBpZiAodGhpcy5tb2R1bGVzLmxvZ2dlcikge1xuICAgICAgICBiYXNlTG9nZ2VyLmluaXQoY3JlYXRlQ2xhc3NPbkRlbWFuZCh0aGlzLm1vZHVsZXMubG9nZ2VyKSwgdGhpcy5vcHRpb25zKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGJhc2VMb2dnZXIuaW5pdChudWxsLCB0aGlzLm9wdGlvbnMpO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBsdSA9IG5ldyBMYW5ndWFnZVV0aWxzKHRoaXMub3B0aW9ucyk7XG4gICAgICB0aGlzLnN0b3JlID0gbmV3IFJlc291cmNlU3RvcmUodGhpcy5vcHRpb25zLnJlc291cmNlcywgdGhpcy5vcHRpb25zKTtcblxuICAgICAgY29uc3QgcyA9IHRoaXMuc2VydmljZXM7XG4gICAgICBzLmxvZ2dlciA9IGJhc2VMb2dnZXI7XG4gICAgICBzLnJlc291cmNlU3RvcmUgPSB0aGlzLnN0b3JlO1xuICAgICAgcy5sYW5ndWFnZVV0aWxzID0gbHU7XG4gICAgICBzLnBsdXJhbFJlc29sdmVyID0gbmV3IFBsdXJhbFJlc29sdmVyKGx1LCB7XG4gICAgICAgIHByZXBlbmQ6IHRoaXMub3B0aW9ucy5wbHVyYWxTZXBhcmF0b3IsXG4gICAgICAgIGNvbXBhdGliaWxpdHlKU09OOiB0aGlzLm9wdGlvbnMuY29tcGF0aWJpbGl0eUpTT04sXG4gICAgICAgIHNpbXBsaWZ5UGx1cmFsU3VmZml4OiB0aGlzLm9wdGlvbnMuc2ltcGxpZnlQbHVyYWxTdWZmaXgsXG4gICAgICB9KTtcbiAgICAgIHMuaW50ZXJwb2xhdG9yID0gbmV3IEludGVycG9sYXRvcih0aGlzLm9wdGlvbnMpO1xuICAgICAgcy51dGlscyA9IHtcbiAgICAgICAgaGFzTG9hZGVkTmFtZXNwYWNlOiB0aGlzLmhhc0xvYWRlZE5hbWVzcGFjZS5iaW5kKHRoaXMpXG4gICAgICB9XG5cbiAgICAgIHMuYmFja2VuZENvbm5lY3RvciA9IG5ldyBCYWNrZW5kQ29ubmVjdG9yKFxuICAgICAgICBjcmVhdGVDbGFzc09uRGVtYW5kKHRoaXMubW9kdWxlcy5iYWNrZW5kKSxcbiAgICAgICAgcy5yZXNvdXJjZVN0b3JlLFxuICAgICAgICBzLFxuICAgICAgICB0aGlzLm9wdGlvbnMsXG4gICAgICApO1xuICAgICAgLy8gcGlwZSBldmVudHMgZnJvbSBiYWNrZW5kQ29ubmVjdG9yXG4gICAgICBzLmJhY2tlbmRDb25uZWN0b3Iub24oJyonLCAoZXZlbnQsIC4uLmFyZ3MpID0+IHtcbiAgICAgICAgdGhpcy5lbWl0KGV2ZW50LCAuLi5hcmdzKTtcbiAgICAgIH0pO1xuXG4gICAgICBpZiAodGhpcy5tb2R1bGVzLmxhbmd1YWdlRGV0ZWN0b3IpIHtcbiAgICAgICAgcy5sYW5ndWFnZURldGVjdG9yID0gY3JlYXRlQ2xhc3NPbkRlbWFuZCh0aGlzLm1vZHVsZXMubGFuZ3VhZ2VEZXRlY3Rvcik7XG4gICAgICAgIHMubGFuZ3VhZ2VEZXRlY3Rvci5pbml0KHMsIHRoaXMub3B0aW9ucy5kZXRlY3Rpb24sIHRoaXMub3B0aW9ucyk7XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLm1vZHVsZXMuaTE4bkZvcm1hdCkge1xuICAgICAgICBzLmkxOG5Gb3JtYXQgPSBjcmVhdGVDbGFzc09uRGVtYW5kKHRoaXMubW9kdWxlcy5pMThuRm9ybWF0KTtcbiAgICAgICAgaWYgKHMuaTE4bkZvcm1hdC5pbml0KSBzLmkxOG5Gb3JtYXQuaW5pdCh0aGlzKTtcbiAgICAgIH1cblxuICAgICAgdGhpcy50cmFuc2xhdG9yID0gbmV3IFRyYW5zbGF0b3IodGhpcy5zZXJ2aWNlcywgdGhpcy5vcHRpb25zKTtcbiAgICAgIC8vIHBpcGUgZXZlbnRzIGZyb20gdHJhbnNsYXRvclxuICAgICAgdGhpcy50cmFuc2xhdG9yLm9uKCcqJywgKGV2ZW50LCAuLi5hcmdzKSA9PiB7XG4gICAgICAgIHRoaXMuZW1pdChldmVudCwgLi4uYXJncyk7XG4gICAgICB9KTtcblxuICAgICAgdGhpcy5tb2R1bGVzLmV4dGVybmFsLmZvckVhY2gobSA9PiB7XG4gICAgICAgIGlmIChtLmluaXQpIG0uaW5pdCh0aGlzKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5zZXJ2aWNlcy5sYW5ndWFnZURldGVjdG9yICYmICF0aGlzLm9wdGlvbnMubG5nKSB7XG4gICAgICB0aGlzLmxvZ2dlci53YXJuKCdpbml0OiBubyBsYW5ndWFnZURldGVjdG9yIGlzIHVzZWQgYW5kIG5vIGxuZyBpcyBkZWZpbmVkJyk7XG4gICAgfVxuXG4gICAgLy8gYXBwZW5kIGFwaVxuICAgIGNvbnN0IHN0b3JlQXBpID0gW1xuICAgICAgJ2dldFJlc291cmNlJyxcbiAgICAgICdoYXNSZXNvdXJjZUJ1bmRsZScsXG4gICAgICAnZ2V0UmVzb3VyY2VCdW5kbGUnLFxuICAgICAgJ2dldERhdGFCeUxhbmd1YWdlJyxcbiAgICBdO1xuICAgIHN0b3JlQXBpLmZvckVhY2goZmNOYW1lID0+IHtcbiAgICAgIHRoaXNbZmNOYW1lXSA9ICguLi5hcmdzKSA9PiB0aGlzLnN0b3JlW2ZjTmFtZV0oLi4uYXJncyk7XG4gICAgfSk7XG4gICAgY29uc3Qgc3RvcmVBcGlDaGFpbmVkID0gW1xuICAgICAgJ2FkZFJlc291cmNlJyxcbiAgICAgICdhZGRSZXNvdXJjZXMnLFxuICAgICAgJ2FkZFJlc291cmNlQnVuZGxlJyxcbiAgICAgICdyZW1vdmVSZXNvdXJjZUJ1bmRsZScsXG4gICAgXTtcbiAgICBzdG9yZUFwaUNoYWluZWQuZm9yRWFjaChmY05hbWUgPT4ge1xuICAgICAgdGhpc1tmY05hbWVdID0gKC4uLmFyZ3MpID0+IHtcbiAgICAgICAgdGhpcy5zdG9yZVtmY05hbWVdKC4uLmFyZ3MpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgIH07XG4gICAgfSk7XG5cbiAgICBjb25zdCBkZWZlcnJlZCA9IGRlZmVyKCk7XG5cbiAgICBjb25zdCBsb2FkID0gKCkgPT4ge1xuICAgICAgdGhpcy5jaGFuZ2VMYW5ndWFnZSh0aGlzLm9wdGlvbnMubG5nLCAoZXJyLCB0KSA9PiB7XG4gICAgICAgIHRoaXMuaXNJbml0aWFsaXplZCA9IHRydWU7XG4gICAgICAgIGlmICghdGhpcy5vcHRpb25zLmlzQ2xvbmUpIHRoaXMubG9nZ2VyLmxvZygnaW5pdGlhbGl6ZWQnLCB0aGlzLm9wdGlvbnMpO1xuICAgICAgICB0aGlzLmVtaXQoJ2luaXRpYWxpemVkJywgdGhpcy5vcHRpb25zKTtcblxuICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKHQpOyAvLyBub3QgcmVqZWN0aW5nIG9uIGVyciAoYXMgZXJyIGlzIG9ubHkgYSBsb2FkaW5nIHRyYW5zbGF0aW9uIGZhaWxlZCB3YXJuaW5nKVxuICAgICAgICBjYWxsYmFjayhlcnIsIHQpO1xuICAgICAgfSk7XG4gICAgfTtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMucmVzb3VyY2VzIHx8ICF0aGlzLm9wdGlvbnMuaW5pdEltbWVkaWF0ZSkge1xuICAgICAgbG9hZCgpO1xuICAgIH0gZWxzZSB7XG4gICAgICBzZXRUaW1lb3V0KGxvYWQsIDApO1xuICAgIH1cblxuICAgIHJldHVybiBkZWZlcnJlZDtcbiAgfVxuXG4gIC8qIGVzbGludCBjb25zaXN0ZW50LXJldHVybjogMCAqL1xuICBsb2FkUmVzb3VyY2VzKGxhbmd1YWdlLCBjYWxsYmFjayA9IG5vb3ApIHtcbiAgICBsZXQgdXNlZENhbGxiYWNrID0gY2FsbGJhY2s7XG4gICAgbGV0IHVzZWRMbmcgPSB0eXBlb2YgbGFuZ3VhZ2UgPT09ICdzdHJpbmcnID8gbGFuZ3VhZ2UgOiB0aGlzLmxhbmd1YWdlO1xuICAgIGlmICh0eXBlb2YgbGFuZ3VhZ2UgPT09ICdmdW5jdGlvbicpIHVzZWRDYWxsYmFjayA9IGxhbmd1YWdlO1xuXG4gICAgaWYgKCF0aGlzLm9wdGlvbnMucmVzb3VyY2VzIHx8IHRoaXMub3B0aW9ucy5wYXJ0aWFsQnVuZGxlZExhbmd1YWdlcykge1xuICAgICAgaWYgKHVzZWRMbmcgJiYgdXNlZExuZy50b0xvd2VyQ2FzZSgpID09PSAnY2ltb2RlJykgcmV0dXJuIHVzZWRDYWxsYmFjaygpOyAvLyBhdm9pZCBsb2FkaW5nIHJlc291cmNlcyBmb3IgY2ltb2RlXG5cbiAgICAgIGNvbnN0IHRvTG9hZCA9IFtdO1xuXG4gICAgICBjb25zdCBhcHBlbmQgPSBsbmcgPT4ge1xuICAgICAgICBpZiAoIWxuZykgcmV0dXJuO1xuICAgICAgICBjb25zdCBsbmdzID0gdGhpcy5zZXJ2aWNlcy5sYW5ndWFnZVV0aWxzLnRvUmVzb2x2ZUhpZXJhcmNoeShsbmcpO1xuICAgICAgICBsbmdzLmZvckVhY2gobCA9PiB7XG4gICAgICAgICAgaWYgKHRvTG9hZC5pbmRleE9mKGwpIDwgMCkgdG9Mb2FkLnB1c2gobCk7XG4gICAgICAgIH0pO1xuICAgICAgfTtcblxuICAgICAgaWYgKCF1c2VkTG5nKSB7XG4gICAgICAgIC8vIGF0IGxlYXN0IGxvYWQgZmFsbGJhY2tzIGluIHRoaXMgY2FzZVxuICAgICAgICBjb25zdCBmYWxsYmFja3MgPSB0aGlzLnNlcnZpY2VzLmxhbmd1YWdlVXRpbHMuZ2V0RmFsbGJhY2tDb2Rlcyh0aGlzLm9wdGlvbnMuZmFsbGJhY2tMbmcpO1xuICAgICAgICBmYWxsYmFja3MuZm9yRWFjaChsID0+IGFwcGVuZChsKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBhcHBlbmQodXNlZExuZyk7XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLm9wdGlvbnMucHJlbG9hZCkge1xuICAgICAgICB0aGlzLm9wdGlvbnMucHJlbG9hZC5mb3JFYWNoKGwgPT4gYXBwZW5kKGwpKTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5zZXJ2aWNlcy5iYWNrZW5kQ29ubmVjdG9yLmxvYWQodG9Mb2FkLCB0aGlzLm9wdGlvbnMubnMsIHVzZWRDYWxsYmFjayk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHVzZWRDYWxsYmFjayhudWxsKTtcbiAgICB9XG4gIH1cblxuICByZWxvYWRSZXNvdXJjZXMobG5ncywgbnMsIGNhbGxiYWNrKSB7XG4gICAgY29uc3QgZGVmZXJyZWQgPSBkZWZlcigpO1xuICAgIGlmICghbG5ncykgbG5ncyA9IHRoaXMubGFuZ3VhZ2VzO1xuICAgIGlmICghbnMpIG5zID0gdGhpcy5vcHRpb25zLm5zO1xuICAgIGlmICghY2FsbGJhY2spIGNhbGxiYWNrID0gbm9vcDtcbiAgICB0aGlzLnNlcnZpY2VzLmJhY2tlbmRDb25uZWN0b3IucmVsb2FkKGxuZ3MsIG5zLCBlcnIgPT4ge1xuICAgICAgZGVmZXJyZWQucmVzb2x2ZSgpOyAvLyBub3QgcmVqZWN0aW5nIG9uIGVyciAoYXMgZXJyIGlzIG9ubHkgYSBsb2FkaW5nIHRyYW5zbGF0aW9uIGZhaWxlZCB3YXJuaW5nKVxuICAgICAgY2FsbGJhY2soZXJyKTtcbiAgICB9KTtcbiAgICByZXR1cm4gZGVmZXJyZWQ7XG4gIH1cblxuICB1c2UobW9kdWxlKSB7XG4gICAgaWYgKCFtb2R1bGUpIHRocm93IG5ldyBFcnJvcignWW91IGFyZSBwYXNzaW5nIGFuIHVuZGVmaW5lZCBtb2R1bGUhIFBsZWFzZSBjaGVjayB0aGUgb2JqZWN0IHlvdSBhcmUgcGFzc2luZyB0byBpMThuZXh0LnVzZSgpJylcbiAgICBpZiAoIW1vZHVsZS50eXBlKSB0aHJvdyBuZXcgRXJyb3IoJ1lvdSBhcmUgcGFzc2luZyBhIHdyb25nIG1vZHVsZSEgUGxlYXNlIGNoZWNrIHRoZSBvYmplY3QgeW91IGFyZSBwYXNzaW5nIHRvIGkxOG5leHQudXNlKCknKVxuXG4gICAgaWYgKG1vZHVsZS50eXBlID09PSAnYmFja2VuZCcpIHtcbiAgICAgIHRoaXMubW9kdWxlcy5iYWNrZW5kID0gbW9kdWxlO1xuICAgIH1cblxuICAgIGlmIChtb2R1bGUudHlwZSA9PT0gJ2xvZ2dlcicgfHwgKG1vZHVsZS5sb2cgJiYgbW9kdWxlLndhcm4gJiYgbW9kdWxlLmVycm9yKSkge1xuICAgICAgdGhpcy5tb2R1bGVzLmxvZ2dlciA9IG1vZHVsZTtcbiAgICB9XG5cbiAgICBpZiAobW9kdWxlLnR5cGUgPT09ICdsYW5ndWFnZURldGVjdG9yJykge1xuICAgICAgdGhpcy5tb2R1bGVzLmxhbmd1YWdlRGV0ZWN0b3IgPSBtb2R1bGU7XG4gICAgfVxuXG4gICAgaWYgKG1vZHVsZS50eXBlID09PSAnaTE4bkZvcm1hdCcpIHtcbiAgICAgIHRoaXMubW9kdWxlcy5pMThuRm9ybWF0ID0gbW9kdWxlO1xuICAgIH1cblxuICAgIGlmIChtb2R1bGUudHlwZSA9PT0gJ3Bvc3RQcm9jZXNzb3InKSB7XG4gICAgICBwb3N0UHJvY2Vzc29yLmFkZFBvc3RQcm9jZXNzb3IobW9kdWxlKTtcbiAgICB9XG5cbiAgICBpZiAobW9kdWxlLnR5cGUgPT09ICczcmRQYXJ0eScpIHtcbiAgICAgIHRoaXMubW9kdWxlcy5leHRlcm5hbC5wdXNoKG1vZHVsZSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBjaGFuZ2VMYW5ndWFnZShsbmcsIGNhbGxiYWNrKSB7XG4gICAgdGhpcy5pc0xhbmd1YWdlQ2hhbmdpbmdUbyA9IGxuZztcbiAgICBjb25zdCBkZWZlcnJlZCA9IGRlZmVyKCk7XG4gICAgdGhpcy5lbWl0KCdsYW5ndWFnZUNoYW5naW5nJywgbG5nKTtcblxuICAgIGNvbnN0IGRvbmUgPSAoZXJyLCBsKSA9PiB7XG4gICAgICBpZiAobCkge1xuICAgICAgICB0aGlzLmxhbmd1YWdlID0gbDtcbiAgICAgICAgdGhpcy5sYW5ndWFnZXMgPSB0aGlzLnNlcnZpY2VzLmxhbmd1YWdlVXRpbHMudG9SZXNvbHZlSGllcmFyY2h5KGwpO1xuICAgICAgICB0aGlzLnRyYW5zbGF0b3IuY2hhbmdlTGFuZ3VhZ2UobCk7XG4gICAgICAgIHRoaXMuaXNMYW5ndWFnZUNoYW5naW5nVG8gPSB1bmRlZmluZWQ7XG4gICAgICAgIHRoaXMuZW1pdCgnbGFuZ3VhZ2VDaGFuZ2VkJywgbCk7XG4gICAgICAgIHRoaXMubG9nZ2VyLmxvZygnbGFuZ3VhZ2VDaGFuZ2VkJywgbCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmlzTGFuZ3VhZ2VDaGFuZ2luZ1RvID0gdW5kZWZpbmVkO1xuICAgICAgfVxuXG4gICAgICBkZWZlcnJlZC5yZXNvbHZlKCguLi5hcmdzKSA9PiB0aGlzLnQoLi4uYXJncykpO1xuICAgICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjayhlcnIsICguLi5hcmdzKSA9PiB0aGlzLnQoLi4uYXJncykpO1xuICAgIH07XG5cbiAgICBjb25zdCBzZXRMbmcgPSBsbmdzID0+IHtcbiAgICAgIC8vIGRlcGVuZGluZyBvbiBBUEkgaW4gZGV0ZWN0b3IgbG5nIGNhbiBiZSBhIHN0cmluZyAob2xkKSBvciBhbiBhcnJheSBvZiBsYW5ndWFnZXMgb3JkZXJlZCBpbiBwcmlvcml0eVxuICAgICAgY29uc3QgbCA9IHR5cGVvZiBsbmdzID09PSAnc3RyaW5nJyA/IGxuZ3MgOiB0aGlzLnNlcnZpY2VzLmxhbmd1YWdlVXRpbHMuZ2V0QmVzdE1hdGNoRnJvbUNvZGVzKGxuZ3MpO1xuXG4gICAgICBpZiAobCkge1xuICAgICAgICBpZiAoIXRoaXMubGFuZ3VhZ2UpIHtcbiAgICAgICAgICB0aGlzLmxhbmd1YWdlID0gbDtcbiAgICAgICAgICB0aGlzLmxhbmd1YWdlcyA9IHRoaXMuc2VydmljZXMubGFuZ3VhZ2VVdGlscy50b1Jlc29sdmVIaWVyYXJjaHkobCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCF0aGlzLnRyYW5zbGF0b3IubGFuZ3VhZ2UpIHRoaXMudHJhbnNsYXRvci5jaGFuZ2VMYW5ndWFnZShsKTtcblxuICAgICAgICBpZiAodGhpcy5zZXJ2aWNlcy5sYW5ndWFnZURldGVjdG9yKSB0aGlzLnNlcnZpY2VzLmxhbmd1YWdlRGV0ZWN0b3IuY2FjaGVVc2VyTGFuZ3VhZ2UobCk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMubG9hZFJlc291cmNlcyhsLCBlcnIgPT4ge1xuICAgICAgICBkb25lKGVyciwgbCk7XG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgaWYgKCFsbmcgJiYgdGhpcy5zZXJ2aWNlcy5sYW5ndWFnZURldGVjdG9yICYmICF0aGlzLnNlcnZpY2VzLmxhbmd1YWdlRGV0ZWN0b3IuYXN5bmMpIHtcbiAgICAgIHNldExuZyh0aGlzLnNlcnZpY2VzLmxhbmd1YWdlRGV0ZWN0b3IuZGV0ZWN0KCkpO1xuICAgIH0gZWxzZSBpZiAoIWxuZyAmJiB0aGlzLnNlcnZpY2VzLmxhbmd1YWdlRGV0ZWN0b3IgJiYgdGhpcy5zZXJ2aWNlcy5sYW5ndWFnZURldGVjdG9yLmFzeW5jKSB7XG4gICAgICB0aGlzLnNlcnZpY2VzLmxhbmd1YWdlRGV0ZWN0b3IuZGV0ZWN0KHNldExuZyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHNldExuZyhsbmcpO1xuICAgIH1cblxuICAgIHJldHVybiBkZWZlcnJlZDtcbiAgfVxuXG4gIGdldEZpeGVkVChsbmcsIG5zKSB7XG4gICAgY29uc3QgZml4ZWRUID0gKGtleSwgb3B0cywgLi4ucmVzdCkgPT4ge1xuICAgICAgbGV0IG9wdGlvbnM7XG4gICAgICBpZiAodHlwZW9mIG9wdHMgIT09ICdvYmplY3QnKSB7XG4gICAgICAgIG9wdGlvbnMgPSB0aGlzLm9wdGlvbnMub3ZlcmxvYWRUcmFuc2xhdGlvbk9wdGlvbkhhbmRsZXIoW2tleSwgb3B0c10uY29uY2F0KHJlc3QpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG9wdGlvbnMgPSB7IC4uLm9wdHMgfTtcbiAgICAgIH1cblxuICAgICAgb3B0aW9ucy5sbmcgPSBvcHRpb25zLmxuZyB8fCBmaXhlZFQubG5nO1xuICAgICAgb3B0aW9ucy5sbmdzID0gb3B0aW9ucy5sbmdzIHx8IGZpeGVkVC5sbmdzO1xuICAgICAgb3B0aW9ucy5ucyA9IG9wdGlvbnMubnMgfHwgZml4ZWRULm5zO1xuICAgICAgcmV0dXJuIHRoaXMudChrZXksIG9wdGlvbnMpO1xuICAgIH07XG4gICAgaWYgKHR5cGVvZiBsbmcgPT09ICdzdHJpbmcnKSB7XG4gICAgICBmaXhlZFQubG5nID0gbG5nO1xuICAgIH0gZWxzZSB7XG4gICAgICBmaXhlZFQubG5ncyA9IGxuZztcbiAgICB9XG4gICAgZml4ZWRULm5zID0gbnM7XG4gICAgcmV0dXJuIGZpeGVkVDtcbiAgfVxuXG4gIHQoLi4uYXJncykge1xuICAgIHJldHVybiB0aGlzLnRyYW5zbGF0b3IgJiYgdGhpcy50cmFuc2xhdG9yLnRyYW5zbGF0ZSguLi5hcmdzKTtcbiAgfVxuXG4gIGV4aXN0cyguLi5hcmdzKSB7XG4gICAgcmV0dXJuIHRoaXMudHJhbnNsYXRvciAmJiB0aGlzLnRyYW5zbGF0b3IuZXhpc3RzKC4uLmFyZ3MpO1xuICB9XG5cbiAgc2V0RGVmYXVsdE5hbWVzcGFjZShucykge1xuICAgIHRoaXMub3B0aW9ucy5kZWZhdWx0TlMgPSBucztcbiAgfVxuXG4gIGhhc0xvYWRlZE5hbWVzcGFjZShucywgb3B0aW9ucyA9IHt9KSB7XG4gICAgaWYgKCF0aGlzLmlzSW5pdGlhbGl6ZWQpIHtcbiAgICAgIHRoaXMubG9nZ2VyLndhcm4oJ2hhc0xvYWRlZE5hbWVzcGFjZTogaTE4bmV4dCB3YXMgbm90IGluaXRpYWxpemVkJywgdGhpcy5sYW5ndWFnZXMpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBpZiAoIXRoaXMubGFuZ3VhZ2VzIHx8ICF0aGlzLmxhbmd1YWdlcy5sZW5ndGgpIHtcbiAgICAgIHRoaXMubG9nZ2VyLndhcm4oJ2hhc0xvYWRlZE5hbWVzcGFjZTogaTE4bi5sYW5ndWFnZXMgd2VyZSB1bmRlZmluZWQgb3IgZW1wdHknLCB0aGlzLmxhbmd1YWdlcyk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgY29uc3QgbG5nID0gdGhpcy5sYW5ndWFnZXNbMF07XG4gICAgY29uc3QgZmFsbGJhY2tMbmcgPSB0aGlzLm9wdGlvbnMgPyB0aGlzLm9wdGlvbnMuZmFsbGJhY2tMbmcgOiBmYWxzZTtcbiAgICBjb25zdCBsYXN0TG5nID0gdGhpcy5sYW5ndWFnZXNbdGhpcy5sYW5ndWFnZXMubGVuZ3RoIC0gMV07XG5cbiAgICAvLyB3ZSdyZSBpbiBjaW1vZGUgc28gdGhpcyBzaGFsbCBwYXNzXG4gICAgaWYgKGxuZy50b0xvd2VyQ2FzZSgpID09PSAnY2ltb2RlJykgcmV0dXJuIHRydWU7XG5cbiAgICBjb25zdCBsb2FkTm90UGVuZGluZyA9IChsLCBuKSA9PiB7XG4gICAgICBjb25zdCBsb2FkU3RhdGUgPSB0aGlzLnNlcnZpY2VzLmJhY2tlbmRDb25uZWN0b3Iuc3RhdGVbYCR7bH18JHtufWBdO1xuICAgICAgcmV0dXJuIGxvYWRTdGF0ZSA9PT0gLTEgfHwgbG9hZFN0YXRlID09PSAyO1xuICAgIH07XG5cbiAgICAvLyBvcHRpb25hbCBpbmplY3RlZCBjaGVja1xuICAgIGlmIChvcHRpb25zLnByZWNoZWNrKSB7XG4gICAgICBjb25zdCBwcmVSZXN1bHQgPSBvcHRpb25zLnByZWNoZWNrKHRoaXMsIGxvYWROb3RQZW5kaW5nKTtcbiAgICAgIGlmIChwcmVSZXN1bHQgIT09IHVuZGVmaW5lZCkgcmV0dXJuIHByZVJlc3VsdDtcbiAgICB9XG5cbiAgICAvLyBsb2FkZWQgLT4gU1VDQ0VTU1xuICAgIGlmICh0aGlzLmhhc1Jlc291cmNlQnVuZGxlKGxuZywgbnMpKSByZXR1cm4gdHJ1ZTtcblxuICAgIC8vIHdlcmUgbm90IGxvYWRpbmcgYXQgYWxsIC0+IFNFTUkgU1VDQ0VTU1xuICAgIGlmICghdGhpcy5zZXJ2aWNlcy5iYWNrZW5kQ29ubmVjdG9yLmJhY2tlbmQpIHJldHVybiB0cnVlO1xuXG4gICAgLy8gZmFpbGVkIGxvYWRpbmcgbnMgLSBidXQgYXQgbGVhc3QgZmFsbGJhY2sgaXMgbm90IHBlbmRpbmcgLT4gU0VNSSBTVUNDRVNTXG4gICAgaWYgKGxvYWROb3RQZW5kaW5nKGxuZywgbnMpICYmICghZmFsbGJhY2tMbmcgfHwgbG9hZE5vdFBlbmRpbmcobGFzdExuZywgbnMpKSkgcmV0dXJuIHRydWU7XG5cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBsb2FkTmFtZXNwYWNlcyhucywgY2FsbGJhY2spIHtcbiAgICBjb25zdCBkZWZlcnJlZCA9IGRlZmVyKCk7XG5cbiAgICBpZiAoIXRoaXMub3B0aW9ucy5ucykge1xuICAgICAgY2FsbGJhY2sgJiYgY2FsbGJhY2soKTtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiBucyA9PT0gJ3N0cmluZycpIG5zID0gW25zXTtcblxuICAgIG5zLmZvckVhY2gobiA9PiB7XG4gICAgICBpZiAodGhpcy5vcHRpb25zLm5zLmluZGV4T2YobikgPCAwKSB0aGlzLm9wdGlvbnMubnMucHVzaChuKTtcbiAgICB9KTtcblxuICAgIHRoaXMubG9hZFJlc291cmNlcyhlcnIgPT4ge1xuICAgICAgZGVmZXJyZWQucmVzb2x2ZSgpO1xuICAgICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjayhlcnIpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIGRlZmVycmVkO1xuICB9XG5cbiAgbG9hZExhbmd1YWdlcyhsbmdzLCBjYWxsYmFjaykge1xuICAgIGNvbnN0IGRlZmVycmVkID0gZGVmZXIoKTtcblxuICAgIGlmICh0eXBlb2YgbG5ncyA9PT0gJ3N0cmluZycpIGxuZ3MgPSBbbG5nc107XG4gICAgY29uc3QgcHJlbG9hZGVkID0gdGhpcy5vcHRpb25zLnByZWxvYWQgfHwgW107XG5cbiAgICBjb25zdCBuZXdMbmdzID0gbG5ncy5maWx0ZXIobG5nID0+IHByZWxvYWRlZC5pbmRleE9mKGxuZykgPCAwKTtcbiAgICAvLyBFeGl0IGVhcmx5IGlmIGFsbCBnaXZlbiBsYW5ndWFnZXMgYXJlIGFscmVhZHkgcHJlbG9hZGVkXG4gICAgaWYgKCFuZXdMbmdzLmxlbmd0aCkge1xuICAgICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjaygpO1xuICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICAgIH1cblxuICAgIHRoaXMub3B0aW9ucy5wcmVsb2FkID0gcHJlbG9hZGVkLmNvbmNhdChuZXdMbmdzKTtcbiAgICB0aGlzLmxvYWRSZXNvdXJjZXMoZXJyID0+IHtcbiAgICAgIGRlZmVycmVkLnJlc29sdmUoKTtcbiAgICAgIGlmIChjYWxsYmFjaykgY2FsbGJhY2soZXJyKTtcbiAgICB9KTtcblxuICAgIHJldHVybiBkZWZlcnJlZDtcbiAgfVxuXG4gIGRpcihsbmcpIHtcbiAgICBpZiAoIWxuZykgbG5nID0gdGhpcy5sYW5ndWFnZXMgJiYgdGhpcy5sYW5ndWFnZXMubGVuZ3RoID4gMCA/IHRoaXMubGFuZ3VhZ2VzWzBdIDogdGhpcy5sYW5ndWFnZTtcbiAgICBpZiAoIWxuZykgcmV0dXJuICdydGwnO1xuXG4gICAgY29uc3QgcnRsTG5ncyA9IFtcbiAgICAgICdhcicsXG4gICAgICAnc2h1JyxcbiAgICAgICdzcXInLFxuICAgICAgJ3NzaCcsXG4gICAgICAneGFhJyxcbiAgICAgICd5aGQnLFxuICAgICAgJ3l1ZCcsXG4gICAgICAnYWFvJyxcbiAgICAgICdhYmgnLFxuICAgICAgJ2FidicsXG4gICAgICAnYWNtJyxcbiAgICAgICdhY3EnLFxuICAgICAgJ2FjdycsXG4gICAgICAnYWN4JyxcbiAgICAgICdhY3knLFxuICAgICAgJ2FkZicsXG4gICAgICAnYWRzJyxcbiAgICAgICdhZWInLFxuICAgICAgJ2FlYycsXG4gICAgICAnYWZiJyxcbiAgICAgICdhanAnLFxuICAgICAgJ2FwYycsXG4gICAgICAnYXBkJyxcbiAgICAgICdhcmInLFxuICAgICAgJ2FycScsXG4gICAgICAnYXJzJyxcbiAgICAgICdhcnknLFxuICAgICAgJ2FyeicsXG4gICAgICAnYXV6JyxcbiAgICAgICdhdmwnLFxuICAgICAgJ2F5aCcsXG4gICAgICAnYXlsJyxcbiAgICAgICdheW4nLFxuICAgICAgJ2F5cCcsXG4gICAgICAnYmJ6JyxcbiAgICAgICdwZ2EnLFxuICAgICAgJ2hlJyxcbiAgICAgICdpdycsXG4gICAgICAncHMnLFxuICAgICAgJ3BidCcsXG4gICAgICAncGJ1JyxcbiAgICAgICdwc3QnLFxuICAgICAgJ3BycCcsXG4gICAgICAncHJkJyxcbiAgICAgICd1ZycsXG4gICAgICAndXInLFxuICAgICAgJ3lkZCcsXG4gICAgICAneWRzJyxcbiAgICAgICd5aWgnLFxuICAgICAgJ2ppJyxcbiAgICAgICd5aScsXG4gICAgICAnaGJvJyxcbiAgICAgICdtZW4nLFxuICAgICAgJ3htbicsXG4gICAgICAnZmEnLFxuICAgICAgJ2pwcicsXG4gICAgICAncGVvJyxcbiAgICAgICdwZXMnLFxuICAgICAgJ3BycycsXG4gICAgICAnZHYnLFxuICAgICAgJ3NhbScsXG4gICAgXTtcblxuICAgIHJldHVybiBydGxMbmdzLmluZGV4T2YodGhpcy5zZXJ2aWNlcy5sYW5ndWFnZVV0aWxzLmdldExhbmd1YWdlUGFydEZyb21Db2RlKGxuZykpID49IDBcbiAgICAgID8gJ3J0bCdcbiAgICAgIDogJ2x0cic7XG4gIH1cblxuICAvKiBlc2xpbnQgY2xhc3MtbWV0aG9kcy11c2UtdGhpczogMCAqL1xuICBjcmVhdGVJbnN0YW5jZShvcHRpb25zID0ge30sIGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIG5ldyBJMThuKG9wdGlvbnMsIGNhbGxiYWNrKTtcbiAgfVxuXG4gIGNsb25lSW5zdGFuY2Uob3B0aW9ucyA9IHt9LCBjYWxsYmFjayA9IG5vb3ApIHtcbiAgICBjb25zdCBtZXJnZWRPcHRpb25zID0geyAuLi50aGlzLm9wdGlvbnMsIC4uLm9wdGlvbnMsIC4uLnsgaXNDbG9uZTogdHJ1ZSB9IH07XG4gICAgY29uc3QgY2xvbmUgPSBuZXcgSTE4bihtZXJnZWRPcHRpb25zKTtcbiAgICBjb25zdCBtZW1iZXJzVG9Db3B5ID0gWydzdG9yZScsICdzZXJ2aWNlcycsICdsYW5ndWFnZSddO1xuICAgIG1lbWJlcnNUb0NvcHkuZm9yRWFjaChtID0+IHtcbiAgICAgIGNsb25lW21dID0gdGhpc1ttXTtcbiAgICB9KTtcbiAgICBjbG9uZS5zZXJ2aWNlcyA9IHsgLi4udGhpcy5zZXJ2aWNlcyB9O1xuICAgIGNsb25lLnNlcnZpY2VzLnV0aWxzID0ge1xuICAgICAgaGFzTG9hZGVkTmFtZXNwYWNlOiBjbG9uZS5oYXNMb2FkZWROYW1lc3BhY2UuYmluZChjbG9uZSlcbiAgICB9O1xuICAgIGNsb25lLnRyYW5zbGF0b3IgPSBuZXcgVHJhbnNsYXRvcihjbG9uZS5zZXJ2aWNlcywgY2xvbmUub3B0aW9ucyk7XG4gICAgY2xvbmUudHJhbnNsYXRvci5vbignKicsIChldmVudCwgLi4uYXJncykgPT4ge1xuICAgICAgY2xvbmUuZW1pdChldmVudCwgLi4uYXJncyk7XG4gICAgfSk7XG4gICAgY2xvbmUuaW5pdChtZXJnZWRPcHRpb25zLCBjYWxsYmFjayk7XG4gICAgY2xvbmUudHJhbnNsYXRvci5vcHRpb25zID0gY2xvbmUub3B0aW9uczsgLy8gc3luYyBvcHRpb25zXG4gICAgY2xvbmUudHJhbnNsYXRvci5iYWNrZW5kQ29ubmVjdG9yLnNlcnZpY2VzLnV0aWxzID0ge1xuICAgICAgaGFzTG9hZGVkTmFtZXNwYWNlOiBjbG9uZS5oYXNMb2FkZWROYW1lc3BhY2UuYmluZChjbG9uZSlcbiAgICB9O1xuXG4gICAgcmV0dXJuIGNsb25lO1xuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IG5ldyBJMThuKCk7XG4iLCIvKiBlc2xpbnQtZGlzYWJsZVxuICAgIEB0eXBlc2NyaXB0LWVzbGludC9uby1uYW1lc3BhY2VcbiAqL1xuXG5pbXBvcnQge1xuICAgIGRlZmF1bHQgYXMgaTE4bmV4dCxcbiAgICBpMThuIGFzIGkxOG5leHRJbnN0YW5jZSxcbiAgICBGYWxsYmFja0xuZ09iakxpc3QgYXMgaTE4bmV4dEZhbGxiYWNrTG5nT2JqTGlzdCxcbiAgICBGYWxsYmFja0xuZyBhcyBpMThuZXh0RmFsbGJhY2tMbmcsXG4gICAgRm9ybWF0RnVuY3Rpb24gYXMgaTE4bmV4dEZvcm1hdEZ1bmN0aW9uLFxuICAgIEludGVycG9sYXRpb25PcHRpb25zIGFzIGkxOG5leHRJbnRlcnBvbGF0aW9uT3B0aW9ucyxcbiAgICBSZWFjdE9wdGlvbnMgYXMgaTE4bmV4dFJlYWN0T3B0aW9ucyxcbiAgICBJbml0T3B0aW9ucyBhcyBpMThuZXh0SW5pdE9wdGlvbnMsXG4gICAgVE9wdGlvbnNCYXNlIGFzIGkxOG5leHRUT3B0aW9uc0Jhc2UsXG4gICAgU3RyaW5nTWFwIGFzIGkxOG5leHRTdHJpbmdNYXAsXG4gICAgVE9wdGlvbnMgYXMgaTE4bmV4dFRPcHRpb25zLFxuICAgIENhbGxiYWNrIGFzIGkxOG5leHRDYWxsYmFjayxcbiAgICBFeGlzdHNGdW5jdGlvbiBhcyBpMThuZXh0RXhpc3RzRnVuY3Rpb24sXG4gICAgV2l0aFQgYXMgaTE4bmV4dFdpdGhULFxuICAgIFRGdW5jdGlvblJlc3VsdCBhcyBpMThuZXh0VEZ1bmN0aW9uUmVzdWx0LFxuICAgIFRGdW5jdGlvbktleXMgYXMgaTE4bmV4dFRGdW5jdGlvbktleXMsXG4gICAgVEZ1bmN0aW9uIGFzIGkxOG5leHRURnVuY3Rpb24sXG4gICAgUmVzb3VyY2UgYXMgaTE4bmV4dFJlc291cmNlLFxuICAgIFJlc291cmNlTGFuZ3VhZ2UgYXMgaTE4bmV4dFJlc291cmNlTGFuZ3VhZ2UsXG4gICAgUmVzb3VyY2VLZXkgYXMgaTE4bmV4dFJlc291cmNlS2V5LFxuICAgIEludGVycG9sYXRvciBhcyBpMThuZXh0SW50ZXJwb2xhdG9yLFxuICAgIFJlc291cmNlU3RvcmUgYXMgaTE4bmV4dFJlc291cmNlU3RvcmUsXG4gICAgU2VydmljZXMgYXMgaTE4bmV4dFNlcnZpY2VzLFxuICAgIE1vZHVsZSBhcyBpMThuZXh0TW9kdWxlLFxuICAgIENhbGxiYWNrRXJyb3IgYXMgaTE4bmV4dENhbGxiYWNrRXJyb3IsXG4gICAgUmVhZENhbGxiYWNrIGFzIGkxOG5leHRSZWFkQ2FsbGJhY2ssXG4gICAgTXVsdGlSZWFkQ2FsbGJhY2sgYXMgaTE4bmV4dE11bHRpUmVhZENhbGxiYWNrLFxuICAgIEJhY2tlbmRNb2R1bGUgYXMgaTE4bmV4dEJhY2tlbmRNb2R1bGUsXG4gICAgTGFuZ3VhZ2VEZXRlY3Rvck1vZHVsZSBhcyBpMThuZXh0TGFuZ3VhZ2VEZXRlY3Rvck1vZHVsZSxcbiAgICBMYW5ndWFnZURldGVjdG9yQXN5bmNNb2R1bGUgYXMgaTE4bmV4dExhbmd1YWdlRGV0ZWN0b3JBc3luY01vZHVsZSxcbiAgICBQb3N0UHJvY2Vzc29yTW9kdWxlIGFzIGkxOG5leHRQb3N0UHJvY2Vzc29yTW9kdWxlLFxuICAgIExvZ2dlck1vZHVsZSBhcyBpMThuZXh0TG9nZ2VyTW9kdWxlLFxuICAgIEkxOG5Gb3JtYXRNb2R1bGUgYXMgaTE4bmV4dEkxOG5Gb3JtYXRNb2R1bGUsXG4gICAgVGhpcmRQYXJ0eU1vZHVsZSBhcyBpMThuZXh0VGhpcmRQYXJ0eU1vZHVsZSxcbiAgICBNb2R1bGVzIGFzIGkxOG5leHRNb2R1bGVzLFxuICAgIE5ld2FibGUgYXMgaTE4bmV4dE5ld2FibGUsXG59IGZyb20gJ2kxOG5leHQnO1xuXG5jb25zdCBpMThuOiBpMThuLmkxOG4gPSBpMThuZXh0O1xuXG5kZWNsYXJlIG5hbWVzcGFjZSBpMThuIHtcbiAgICBleHBvcnQgdHlwZSBpMThuID0gaTE4bmV4dEluc3RhbmNlO1xuICAgIGV4cG9ydCB0eXBlIEZhbGxiYWNrTG5nT2JqTGlzdCA9IGkxOG5leHRGYWxsYmFja0xuZ09iakxpc3Q7XG4gICAgZXhwb3J0IHR5cGUgRmFsbGJhY2tMbmcgPSBpMThuZXh0RmFsbGJhY2tMbmc7XG4gICAgZXhwb3J0IHR5cGUgRm9ybWF0RnVuY3Rpb24gPSBpMThuZXh0Rm9ybWF0RnVuY3Rpb247XG4gICAgZXhwb3J0IHR5cGUgSW50ZXJwb2xhdGlvbk9wdGlvbnMgPSBpMThuZXh0SW50ZXJwb2xhdGlvbk9wdGlvbnM7XG4gICAgZXhwb3J0IHR5cGUgUmVhY3RPcHRpb25zID0gaTE4bmV4dFJlYWN0T3B0aW9ucztcbiAgICBleHBvcnQgdHlwZSBJbml0T3B0aW9ucyA9IGkxOG5leHRJbml0T3B0aW9ucztcbiAgICBleHBvcnQgdHlwZSBUT3B0aW9uc0Jhc2UgPSBpMThuZXh0VE9wdGlvbnNCYXNlO1xuICAgIGV4cG9ydCB0eXBlIFN0cmluZ01hcCA9IGkxOG5leHRTdHJpbmdNYXA7XG4gICAgZXhwb3J0IHR5cGUgVE9wdGlvbnM8VCBleHRlbmRzIFJlY29yZDxzdHJpbmcsIHVua25vd24+ID0gU3RyaW5nTWFwPiA9IGkxOG5leHRUT3B0aW9uczxUPjtcbiAgICBleHBvcnQgdHlwZSBDYWxsYmFjayA9IGkxOG5leHRDYWxsYmFjaztcbiAgICBleHBvcnQgdHlwZSBFeGlzdHNGdW5jdGlvbjxLIGV4dGVuZHMgc3RyaW5nID0gc3RyaW5nLCBUIGV4dGVuZHMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4gPSBTdHJpbmdNYXA+ID0gaTE4bmV4dEV4aXN0c0Z1bmN0aW9uPEssIFQ+O1xuICAgIGV4cG9ydCB0eXBlIFdpdGhUID0gaTE4bmV4dFdpdGhUO1xuICAgIGV4cG9ydCB0eXBlIFRGdW5jdGlvblJlc3VsdCA9IGkxOG5leHRURnVuY3Rpb25SZXN1bHQ7XG4gICAgZXhwb3J0IHR5cGUgVEZ1bmN0aW9uS2V5cyA9IGkxOG5leHRURnVuY3Rpb25LZXlzO1xuICAgIGV4cG9ydCB0eXBlIFRGdW5jdGlvbiA9IGkxOG5leHRURnVuY3Rpb247XG4gICAgZXhwb3J0IHR5cGUgUmVzb3VyY2UgPSBpMThuZXh0UmVzb3VyY2U7XG4gICAgZXhwb3J0IHR5cGUgUmVzb3VyY2VMYW5ndWFnZSA9IGkxOG5leHRSZXNvdXJjZUxhbmd1YWdlO1xuICAgIGV4cG9ydCB0eXBlIFJlc291cmNlS2V5ID0gaTE4bmV4dFJlc291cmNlS2V5O1xuICAgIGV4cG9ydCB0eXBlIEludGVycG9sYXRvciA9IGkxOG5leHRJbnRlcnBvbGF0b3I7XG4gICAgZXhwb3J0IHR5cGUgUmVzb3VyY2VTdG9yZSA9IGkxOG5leHRSZXNvdXJjZVN0b3JlO1xuICAgIGV4cG9ydCB0eXBlIFNlcnZpY2VzID0gaTE4bmV4dFNlcnZpY2VzO1xuICAgIGV4cG9ydCB0eXBlIE1vZHVsZSA9IGkxOG5leHRNb2R1bGU7XG4gICAgZXhwb3J0IHR5cGUgQ2FsbGJhY2tFcnJvciA9IGkxOG5leHRDYWxsYmFja0Vycm9yO1xuICAgIGV4cG9ydCB0eXBlIFJlYWRDYWxsYmFjayA9IGkxOG5leHRSZWFkQ2FsbGJhY2s7XG4gICAgZXhwb3J0IHR5cGUgTXVsdGlSZWFkQ2FsbGJhY2sgPSBpMThuZXh0TXVsdGlSZWFkQ2FsbGJhY2s7XG4gICAgZXhwb3J0IHR5cGUgQmFja2VuZE1vZHVsZTxUID0gUmVjb3JkPHN0cmluZywgdW5rbm93bj4+ID0gaTE4bmV4dEJhY2tlbmRNb2R1bGU8VD47XG4gICAgZXhwb3J0IHR5cGUgTGFuZ3VhZ2VEZXRlY3Rvck1vZHVsZSA9IGkxOG5leHRMYW5ndWFnZURldGVjdG9yTW9kdWxlO1xuICAgIGV4cG9ydCB0eXBlIExhbmd1YWdlRGV0ZWN0b3JBc3luY01vZHVsZSA9IGkxOG5leHRMYW5ndWFnZURldGVjdG9yQXN5bmNNb2R1bGU7XG4gICAgZXhwb3J0IHR5cGUgUG9zdFByb2Nlc3Nvck1vZHVsZSA9IGkxOG5leHRQb3N0UHJvY2Vzc29yTW9kdWxlO1xuICAgIGV4cG9ydCB0eXBlIExvZ2dlck1vZHVsZSA9IGkxOG5leHRMb2dnZXJNb2R1bGU7XG4gICAgZXhwb3J0IHR5cGUgSTE4bkZvcm1hdE1vZHVsZSA9IGkxOG5leHRJMThuRm9ybWF0TW9kdWxlO1xuICAgIGV4cG9ydCB0eXBlIFRoaXJkUGFydHlNb2R1bGUgPSBpMThuZXh0VGhpcmRQYXJ0eU1vZHVsZTtcbiAgICBleHBvcnQgdHlwZSBNb2R1bGVzID0gaTE4bmV4dE1vZHVsZXM7XG4gICAgZXhwb3J0IHR5cGUgTmV3YWJsZTxUPiA9IGkxOG5leHROZXdhYmxlPFQ+O1xufVxuXG5leHBvcnQgeyBpMThuIH07XG4iXSwibmFtZXMiOlsidXRpbHMuZ2V0UGF0aCIsInV0aWxzLnNldFBhdGgiLCJ1dGlscy5kZWVwRXh0ZW5kIiwidXRpbHMuY29weSIsInV0aWxzLmVzY2FwZSIsInV0aWxzLnJlZ2V4RXNjYXBlIiwidXRpbHMuZ2V0UGF0aFdpdGhEZWZhdWx0cyIsInV0aWxzLm1ha2VTdHJpbmciLCJ1dGlscy5wdXNoUGF0aCIsImdldERlZmF1bHRzIiwiTGFuZ3VhZ2VVdGlscyIsIkJhY2tlbmRDb25uZWN0b3IiXSwibWFwcGluZ3MiOiI7Ozs7O0FBQUEsTUFBTSxhQUFhLEdBQUc7QUFDdEIsRUFBRSxJQUFJLEVBQUUsUUFBUTtBQUNoQjtBQUNBLEVBQUUsR0FBRyxDQUFDLElBQUksRUFBRTtBQUNaLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDN0IsR0FBRztBQUNIO0FBQ0EsRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFO0FBQ2IsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztBQUM5QixHQUFHO0FBQ0g7QUFDQSxFQUFFLEtBQUssQ0FBQyxJQUFJLEVBQUU7QUFDZCxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDO0FBQy9CLEdBQUc7QUFDSDtBQUNBLEVBQUUsTUFBTSxDQUFDLElBQUksRUFBRSxJ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QU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRTtBQUM1RCxNQUFNLE1BQU0sWUFBWSxHQUFHLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUM7QUFDcEYsTUFBTSxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQzlCO0FBQ0EsTUFBTSxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxFQUFFO0FBQ3JDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDO0FBQzlDLE9BQU8sTUFBTSxJQUFJLENBQUMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO0FBQ2pDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQztBQUNsQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUM7QUFDbEM7QUFDQSxRQUFRLElBQUksWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDO0FBQ2pHLE9BQU8sTUFBTSxJQUFJLENBQUMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO0FBQ2pDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQztBQUNsQztBQUNBO0FBQ0EsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUM7QUFDekQsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxLQUFLLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQztBQUMzRTtBQUNBLFFBQVEsSUFBSSxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUM7QUFDakcsUUFBUSxJQUFJLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQztBQUNqRyxPQUFPO0FBQ1A7QUFDQSxNQUFNLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUN6QixLQUFLO0FBQ0w7QUFDQSxJQUFJLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDLFdBQVcsRUFBRSxHQUFHLElBQUksQ0FBQztBQUMzRixHQUFHO0FBQ0g7QUFDQTtBQUNBLEVBQUUsYUFBYSxDQUFDLElBQUksRUFBRTtBQUN0QixJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUztBQUN6QixNQUFNLDZCQUE2QjtBQUNuQyxNQUFNLGdJQUFnSTtBQUN0SSxLQUFLLENBQUM7QUFDTjtBQUNBLElBQUksT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ3RDLEdBQUc7QUFDSDtBQUNBO0FBQ0EsRUFBRSxlQUFlLENBQUMsSUFBSSxFQUFFO0FBQ3hCLElBQUksSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksS0FBSyxjQUFjLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyx3QkFBd0IsRUFBRTtBQUN2RixNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsdUJBQXVCLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDaEQsS0FBSztBQUNMLElBQUk7QUFDSixNQUFNLENBQUMsSUFBSSxDQUFDLGFBQWEsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxJQUFJLElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUNoRyxNQUFNO0FBQ04sR0FBRztBQUNIO0FBQ0EsRUFBRSxxQkFBcUIsQ0FBQyxLQUFLLEVBQUU7QUFDL0IsSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFLE9BQU8sSUFBSSxDQUFDO0FBQzVCO0FBQ0EsSUFBSSxJQUFJLEtBQUssQ0FBQztBQUNkO0FBQ0E7QUFDQSxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxJQUFJO0FBQzFCLE1BQU0sSUFBSSxLQUFLLEVBQUUsT0FBTztBQUN4QixNQUFNLElBQUksVUFBVSxHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUNyRCxNQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLGFBQWEsSUFBSSxJQUFJLENBQUMsZUFBZSxDQUFDLFVBQVUsQ0FBQyxFQUFFLEtBQUssR0FBRyxVQUFVLENBQUM7QUFDOUYsS0FBSyxDQUFDLENBQUM7QUFDUDtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQUksSUFBSSxDQUFDLEtBQUssSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLGFBQWEsRUFBRTtBQUM5QyxNQUFNLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxJQUFJO0FBQzVCLFFBQVEsSUFBSSxLQUFLLEVBQUUsT0FBTztBQUMxQjtBQUNBLFFBQVEsSUFBSSxPQUFPLEdBQUcsSUFBSSxDQUFDLHVCQUF1QixDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ3pELFFBQVEsSUFBSSxJQUFJLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxFQUFFLFFBQVEsS0FBSyxHQUFHLE9BQU8sRUFBRTtBQUNwRTtBQUNBLFFBQVEsS0FBSyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxZQUFZLElBQUk7QUFDaEUsVUFBVSxJQUFJLFlBQVksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFFLE9BQU8sWUFBWSxDQUFDO0FBQ3ZFLFNBQVMsQ0FBQyxDQUFDO0FBQ1gsT0FBTyxDQUFDLENBQUM7QUFDVCxLQUFLO0FBQ0w7QUFDQTtBQUNBLElBQUksSUFBSSxDQUFDLEtBQUssRUFBRSxLQUFLLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDM0U7QUFDQSxJQUFJLE9BQU8sS0FBSyxDQUFDO0FBQ2pCLEdBQUc7QUFDSDtBQUNBLEVBQUUsZ0JBQWdCLENBQUMsU0FBUyxFQUFFLElBQUksRUFBRTtBQUNwQyxJQUFJLElBQUksQ0FBQyxTQUFTLEVBQUUsT0FBTyxFQUFFLENBQUM7QUFDOUIsSUFBSSxJQUFJLE9BQU8sU0FBUyxLQUFLLFVBQVUsRUFBRSxTQUFTLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ3JFLElBQUksSUFBSSxPQUFPLFNBQVMsS0FBSyxRQUFRLEVBQUUsU0FBUyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDL0QsSUFBSSxJQUFJLE1BQU0sQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsS0FBSyxnQkFBZ0IsRUFBRSxPQUFPLFNBQVMsQ0FBQztBQUMxRjtBQUNBLElBQUksSUFBSSxDQUFDLElBQUksRUFBRSxPQUFPLFNBQVMsQ0FBQyxPQUFPLElBQUksRUFBRSxDQUFDO0FBQzlDO0FBQ0E7QUFDQSxJQUFJLElBQUksS0FBSyxHQUFHLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUNoQyxJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUUsS0FBSyxHQUFHLFNBQVMsQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztBQUNwRSxJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUUsS0FBSyxHQUFHLFNBQVMsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztBQUNqRSxJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUUsS0FBSyxHQUFHLFNBQVMsQ0FBQyxJQUFJLENBQUMsdUJBQXVCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztBQUN0RSxJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUUsS0FBSyxHQUFHLFNBQVMsQ0FBQyxPQUFPLENBQUM7QUFDMUM7QUFDQSxJQUFJLE9BQU8sS0FBSyxJQUFJLEVBQUUsQ0FBQztBQUN2QixHQUFHO0FBQ0g7QUFDQSxFQUFFLGtCQUFrQixDQUFDLElBQUksRUFBRSxZQUFZLEVBQUU7QUFDekMsSUFBSSxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsZ0JBQWdCO0FBQy9DLE1BQU0sWUFBWSxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxJQUFJLEVBQUU7QUFDcEQsTUFBTSxJQUFJO0FBQ1YsS0FBSyxDQUFDO0FBQ047QUFDQSxJQUFJLE1BQU0sS0FBSyxHQUFHLEVBQUUsQ0FBQztBQUNyQixJQUFJLE1BQU0sT0FBTyxHQUFHLENBQUMsSUFBSTtBQUN6QixNQUFNLElBQUksQ0FBQyxDQUFDLEVBQUUsT0FBTztBQUNyQixNQUFNLElBQUksSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsRUFBRTtBQUNuQyxRQUFRLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDdEIsT0FBTyxNQUFNO0FBQ2IsUUFBUSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLG9EQUFvRCxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNyRixPQUFPO0FBQ1AsS0FBSyxDQUFDO0FBQ047QUFDQSxJQUFJLElBQUksT0FBTyxJQUFJLEtBQUssUUFBUSxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUU7QUFDNUQsTUFBTSxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxLQUFLLGNBQWMsRUFBRSxPQUFPLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDdkYsTUFBTSxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxLQUFLLGNBQWMsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksS0FBSyxhQUFhO0FBQ3JGLFFBQVEsT0FBTyxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0FBQ2xELE1BQU0sSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksS0FBSyxhQUFhLEVBQUUsT0FBTyxDQUFDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0FBQzNGLEtBQUssTUFBTSxJQUFJLE9BQU8sSUFBSSxLQUFLLFFBQVEsRUFBRTtBQUN6QyxNQUFNLE9BQU8sQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztBQUM3QyxLQUFLO0FBQ0w7QUFDQSxJQUFJLGFBQWEsQ0FBQyxPQUFPLENBQUMsRUFBRSxJQUFJO0FBQ2hDLE1BQU0sSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxPQUFPLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDdEUsS0FBSyxDQUFDLENBQUM7QUFDUDtBQUNBLElBQUksT0FBTyxLQUFLLENBQUM7QUFDakIsR0FBRztBQUNIOztBQ3RLQTtBQUNBO0FBQ0EsSUFBSSxJQUFJLEdBQUc7QUFDWCxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLE9BQU87QUFDMUYsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUU7QUFDakQ7QUFDQSxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJO0FBQ3hFLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJO0FBQ2hFLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUk7QUFDNUUsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUs7QUFDdEUsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFO0FBQ3JGO0FBQ0EsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJO0FBQ2xGLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFO0FBQ3BFO0FBQ0EsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUU7QUFDNUU7QUFDQSxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFO0FBQy9DLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFO0FBQzNDLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFO0FBQzVDLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFO0FBQ3hDLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRTtBQUNwQyxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUU7QUFDNUMsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUU7QUFDMUMsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFO0FBQ3JDLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRTtBQUNyQyxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRTtBQUN6QyxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFO0FBQ3hDLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUU7QUFDdkMsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFO0FBQ3JDLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxLQUFLLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUU7QUFDeEMsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUU7QUFDM0MsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFO0FBQ3BDLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUU7QUFDeEMsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUU7QUFDekMsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFO0FBQ2hELEVBQUM7QUFDRDtBQUNBLElBQUksa0JBQWtCLEdBQUc7QUFDekIsRUFBRSxDQUFDLEVBQUUsU0FBUyxDQUFDLEVBQUUsQ0FBQyxPQUFPLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN4QyxFQUFFLENBQUMsRUFBRSxTQUFTLENBQUMsRUFBRSxDQUFDLE9BQU8sTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3pDLEVBQUUsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztBQUM1QixFQUFFLENBQUMsRUFBRSxTQUFTLENBQUMsRUFBRSxDQUFDLE9BQU8sTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ25ILEVBQUUsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxFQUFFLENBQUMsT0FBTyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2pILEVBQUUsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxFQUFFLENBQUMsT0FBTyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN0RSxFQUFFLENBQUMsRUFBRSxTQUFTLENBQUMsRUFBRSxDQUFDLE9BQU8sTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbkcsRUFBRSxDQUFDLEVBQUUsU0FBUyxDQUFDLEVBQUUsQ0FBQyxPQUFPLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDeEYsRUFBRSxDQUFDLEVBQUUsU0FBUyxDQUFDLEVBQUUsQ0FBQyxPQUFPLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN6QyxFQUFFLEVBQUUsRUFBRSxTQUFTLENBQUMsRUFBRSxDQUFDLE9BQU8sTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUM7QUFDakYsRUFBRSxFQUFFLEVBQUUsU0FBUyxDQUFDLEVBQUUsQ0FBQyxPQUFPLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3pHLEVBQUUsRUFBRSxFQUFFLFNBQVMsQ0FBQyxFQUFFLENBQUMsT0FBTyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQ3hELEVBQUUsRUFBRSxFQUFFLFNBQVMsQ0FBQyxFQUFFLENBQUMsT0FBTyxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDM0MsRUFBRSxFQUFFLEVBQUUsU0FBUyxDQUFDLEVBQUUsQ0FBQyxPQUFPLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzlFLEVBQUUsRUFBRSxFQUFFLFNBQVMsQ0FBQyxFQUFFLENBQUMsT0FBTyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDekcsRUFBRSxFQUFFLEVBQUUsU0FBUyxDQUFDLEVBQUUsQ0FBQyxPQUFPLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM5RSxFQUFFLEVBQUUsRUFBRSxTQUFTLENBQUMsRUFBRSxDQUFDLE9BQU8sTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDeEUsRUFBRSxFQUFFLEVBQUUsU0FBUyxDQUFDLEVBQUUsQ0FBQyxPQUFPLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzNELEVBQUUsRUFBRSxFQUFFLFNBQVMsQ0FBQyxFQUFFLENBQUMsT0FBTyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ25ILEVBQUUsRUFBRSxFQUFFLFNBQVMsQ0FBQyxFQUFFLENBQUMsT0FBTyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDMUYsRUFBRSxFQUFFLEVBQUUsU0FBUyxDQUFDLEVBQUUsQ0FBQyxPQUFPLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFO0FBQy9GLEVBQUUsRUFBRSxFQUFFLFNBQVMsQ0FBQyxFQUFFLENBQUMsT0FBTyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUU7QUFDM0YsQ0FBQyxDQUFDO0FBQ0Y7QUFDQTtBQUNBLFNBQVMsV0FBVyxHQUFHO0FBQ3ZCLEVBQUUsTUFBTSxLQUFLLEdBQUcsRUFBRSxDQUFDO0FBQ25CLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUcs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QUFDWCxNQUFNLEtBQUs7QUFDWCxNQUFNLEtBQUs7QUFDWCxNQUFNLEtBQUs7QUFDWCxNQUFNLEtBQUs7QUFDWCxNQUFNLEtBQUs7QUFDWCxNQUFNLEtBQUs7QUFDWCxNQUFNLEtBQUs7QUFDWCxNQUFNLEtBQUs7QUFDWCxNQUFNLEtBQUs7QUFDWCxNQUFNLEtBQUs7QUFDWCxNQUFNLEtBQUs7QUFDWCxNQUFNLEtBQUs7QUFDWCxNQUFNLEtBQUs7QUFDWCxNQUFNLEtBQUs7QUFDWCxNQUFNLEtBQUs7QUFDWCxNQUFNLEtBQUs7QUFDWCxNQUFNLEtBQUs7QUFDWCxNQUFNLEtBQUs7QUFDWCxNQUFNLEtBQUs7QUFDWCxNQUFNLEtBQUs7QUFDWCxNQUFNLEtBQUs7QUFDWCxNQUFNLEtBQUs7QUFDWCxNQUFNLEtBQUs7QUFDWCxNQUFNLEtBQUs7QUFDWCxNQUFNLElBQUk7QUFDVixNQUFNLElBQUk7QUFDVixNQUFNLElBQUk7QUFDVixNQUFNLEtBQUs7QUFDWCxNQUFNLEtBQUs7QUFDWCxNQUFNLEtBQUs7QUFDWCxNQUFNLEtBQUs7QUFDWCxNQUFNLEtBQUs7QUFDWCxNQUFNLElBQUk7QUFDVixNQUFNLElBQUk7QUFDVixNQUFNLEtBQUs7QUFDWCxNQUFNLEtBQUs7QUFDWCxNQUFNLEtBQUs7QUFDWCxNQUFNLElBQUk7QUFDVixNQUFNLElBQUk7QUFDVixNQUFNLEtBQUs7QUFDWCxNQUFNLEtBQUs7QUFDWCxNQUFNLEtBQUs7QUFDWCxNQUFNLElBQUk7QUFDVixNQUFNLEtBQUs7QUFDWCxNQUFNLEtBQUs7QUFDWCxNQUFNLEtBQUs7QUFDWCxNQUFNLEtBQUs7QUFDWCxNQUFNLElBQUk7QUFDVixNQUFNLEtBQUs7QUFDWCxLQUFLLENBQUM7QUFDTjtBQUNBLElBQUksT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLHVCQUF1QixDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQztBQUN6RixRQUFRLEtBQUs7QUFDYixRQUFRLEtBQUssQ0FBQztBQUNkLEdBQUc7QUFDSDtBQUNBO0FBQ0EsRUFBRSxjQUFjLENBQUMsT0FBTyxHQUFHLEVBQUUsRUFBRSxRQUFRLEVBQUU7QUFDekMsSUFBSSxPQUFPLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRSxRQUFRLENBQUMsQ0FBQztBQUN2QyxHQUFHO0FBQ0g7QUFDQSxFQUFFLGFBQWEsQ0FBQyxPQUFPLEdBQUcsRUFBRSxFQUFFLFFBQVEsR0FBRyxJQUFJLEVBQUU7QUFDL0MsSUFBSSxNQUFNLGFBQWEsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLE9BQU8sRUFBRSxHQUFHLE9BQU8sRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxFQUFFLENBQUM7QUFDaEYsSUFBSSxNQUFNLEtBQUssR0FBRyxJQUFJLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQztBQUMxQyxJQUFJLE1BQU0sYUFBYSxHQUFHLENBQUMsT0FBTyxFQUFFLFVBQVUsRUFBRSxVQUFVLENBQUMsQ0FBQztBQUM1RCxJQUFJLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJO0FBQy9CLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN6QixLQUFLLENBQUMsQ0FBQztBQUNQLElBQUksS0FBSyxDQUFDLFFBQVEsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO0FBQzFDLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEdBQUc7QUFDM0IsTUFBTSxrQkFBa0IsRUFBRSxLQUFLLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQztBQUM5RCxLQUFLLENBQUM7QUFDTixJQUFJLEtBQUssQ0FBQyxVQUFVLEdBQUcsSUFBSSxVQUFVLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDckUsSUFBSSxLQUFLLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxLQUFLLEVBQUUsR0FBRyxJQUFJLEtBQUs7QUFDakQsTUFBTSxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDO0FBQ2pDLEtBQUssQ0FBQyxDQUFDO0FBQ1AsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxRQUFRLENBQUMsQ0FBQztBQUN4QyxJQUFJLEtBQUssQ0FBQyxVQUFVLENBQUMsT0FBTyxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUM7QUFDN0MsSUFBSSxLQUFLLENBQUMsVUFBVSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxLQUFLLEdBQUc7QUFDdkQsTUFBTSxrQkFBa0IsRUFBRSxLQUFLLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQztBQUM5RCxLQUFLLENBQUM7QUFDTjtBQUNBLElBQUksT0FBTyxLQUFLLENBQUM7QUFDakIsR0FBRztBQUNILENBQUM7QUFDRDtBQUNBLGdCQUFlLElBQUksSUFBSSxFQUFFOztBQzNnQnpCOzs7TUEyQ00sSUFBSSxHQUFjOzsiLCJzb3VyY2VSb290IjoiY2RwOi8vL0BjZHAvZXh0ZW5zaW9uLWkxOG4vIn0=
