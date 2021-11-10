/*!
 * @cdp/extension-template-bridge 0.9.9
 *   extension for HTML templates bridge.
 */

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@cdp/extension-template')) :
  typeof define === 'function' && define.amd ? define(['exports', '@cdp/extension-template'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory((global.CDP = global.CDP || {}, global.CDP.Exension = global.CDP.Exension || {}), global.CDP.Exension));
})(this, (function (exports, extensionTemplate) { 'use strict';

  /** 
   * @param {object} config = {
   *  html: lit-html.html,
   *  delimiter: { start: '{{', end: '}}' },
   *  transformers: { // note that transformVariable is not here. It gets applied when no transformer.test has passed
   *    name: {
   *      test: (str, config) => bool,
   *      transform: (str, config) => ({
   *        remainingTmplStr: str,
   *        insertionPoint: ctx => lit-html.TemplateResult | undefined, // if undefined remainingTmplStr will be merged with last static part 
   *      }),
   *    },
   *  },
   *  transformVariable, 
   * }
   * @returns {function} strTemplate => ctx => lit-html.TemplateResult
   */
  const createCustom = config => strTemplate => transform(strTemplate, config);

  function transform(tmpl2Parse, config) {
    const staticParts = [];
    const insertionPoints = [];

    let remainingTmplStr = tmpl2Parse;
    let startIndexOfIP = remainingTmplStr.indexOf(config.delimiter.start);
    while (startIndexOfIP >= 0) {
      if (remainingTmplStr.indexOf(config.delimiter.end, startIndexOfIP) < 0)
        throw new Error(`missing end delimiter at: '${remainingTmplStr}'`)

      staticParts.push(remainingTmplStr.substring(0, startIndexOfIP));

      const iPTransformResult = transformIP(
        remainingTmplStr.substring(startIndexOfIP + config.delimiter.start.length),
        config
      );

      if (iPTransformResult.insertionPoint) {
        remainingTmplStr = iPTransformResult.remainingTmplStr;
        insertionPoints.push(iPTransformResult.insertionPoint);
        startIndexOfIP = remainingTmplStr.indexOf(config.delimiter.start);
      } else { // e.g. comment or customDelimeter
        const lastStaticPart = staticParts.pop();
        remainingTmplStr = lastStaticPart + iPTransformResult.remainingTmplStr;
        startIndexOfIP = remainingTmplStr.indexOf(config.delimiter.start, lastStaticPart.length);
      }
    }

    staticParts.push(remainingTmplStr);

    return ctx =>
      config.html(staticParts, ...insertionPoints.map(iP => iP(ctx)))
  }

  function transformIP(remainingTmplStr, config) {
    const transformer = Object.values(config.transformers).find(t => t.test(remainingTmplStr, config));
    const transformFunction = transformer
      ? transformer.transform
      : config.transformVariable;
    return transformFunction(remainingTmplStr, config)
  }

  function ctx2Value(ctx, key) {
    if (key === '.')
      return ctx

    let result = ctx;
    for (let k of key.split('.')) {
      if (!result.hasOwnProperty(k))
        return ''

      result = result[k];
    }

    return result
  }

  function ctx2MustacheString(ctx, key) {
    return mustacheStringyfy(ctx2Value(ctx, key))
  }

  function mustacheStringyfy(value) {
    if (value === undefined || value === null)
      return ''

    return '' + value
  }

  const variable = (remainingTmplStr, { delimiter }) => {
    const indexOfEndDelimiter = remainingTmplStr.indexOf(delimiter.end);
    const dataKey = remainingTmplStr.substring(0, indexOfEndDelimiter);
    return {
      remainingTmplStr: remainingTmplStr.substring(indexOfEndDelimiter + delimiter.end.length),
      insertionPoint: ctx => ctx2MustacheString(ctx, dataKey)
    }
  };

  /** Note, this is unsafe to use, because the rendered output could be any JavaScript! */
  const unsafeVariable = unsafeHTML => ({
    test: remainingTmplStr => remainingTmplStr[0] === '{',
    transform: (remainingTmplStr, { delimiter }) => {
      const indexOfEndDelimiter = remainingTmplStr.indexOf('}' + delimiter.end);
      if (indexOfEndDelimiter < 0)
        throw new Error(`missing end delimiter at: '${delimiter.start}${remainingTmplStr}'`)
    
      const dataKey = remainingTmplStr.substring(1, indexOfEndDelimiter);
      return {
        remainingTmplStr: remainingTmplStr.substring(indexOfEndDelimiter + 1 + delimiter.end.length),
        insertionPoint: ctx => unsafeHTML(ctx2MustacheString(ctx, dataKey)),
      }
    }
  });

  function isMustacheFalsy(value) {
    return [null, undefined, false, 0, NaN, '']
      .some(falsy => falsy === value)
      || (value.length && value.length === 0)
  }

  function parseSection(tmplStr, delimiter) {
    const indexOfStartTagEnd = tmplStr.indexOf(delimiter.end);
    const dataKey = tmplStr.substring(1, indexOfStartTagEnd);
    const endTag = `${delimiter.start}/${dataKey}${delimiter.end}`;
    const indexOfEndTagStart = tmplStr.indexOf(endTag);
    if (indexOfEndTagStart < 0)
      throw new Error(`missing end delimiter at: '${delimiter.start}${tmplStr}'`)
    
    return {
      dataKey,
      innerTmpl: tmplStr.substring(indexOfStartTagEnd + delimiter.start.length, indexOfEndTagStart),
      remainingTmplStr: tmplStr.substring(indexOfEndTagStart + endTag.length),
    }
  }

  /** Note, unlike within mustache functions as data values are not supported out of the box */
  const section = () => ({
    test: remainingTmplStr => remainingTmplStr[0] === '#',
    transform: (remainingTmplStr, config) => {
      const parsedSection = parseSection(remainingTmplStr, config.delimiter);
      const transformedInnerTmpl = transform(parsedSection.innerTmpl, config);
      
      return {
        remainingTmplStr: parsedSection.remainingTmplStr,
        insertionPoint: ctx => {
          const sectionData = ctx2Value(ctx, parsedSection.dataKey);
          
          if (isMustacheFalsy(sectionData))
            return '';

          return sectionData.map
            ? sectionData.map(innerCtx => transformedInnerTmpl(innerCtx))
            : transformedInnerTmpl(ctx)
        }
      }
    }
  });

  const invertedSection = () => ({
    test: remainingTmplStr => remainingTmplStr[0] === '^',
    transform: (remainingTmplStr, { delimiter }) => {
      const parsedSection = parseSection(remainingTmplStr, delimiter);

      return {
        remainingTmplStr: parsedSection.remainingTmplStr,
        insertionPoint: ctx =>
          isMustacheFalsy(ctx2Value(ctx, parsedSection.dataKey))
            ? parsedSection.innerTmpl
            : '',
      }
    }
  });

  const comment = () => ({
    test: remainingTmplStr => remainingTmplStr[0] === '!',
    transform: (remainingTmplStr, { delimiter }) => ({
      remainingTmplStr: remainingTmplStr.substring(remainingTmplStr.indexOf(delimiter.end) + delimiter.end.length),
      insertionPoint: undefined,
    })
  });

  const customDelimiter = () => ({
    test: remainingTmplStr => remainingTmplStr[0] === '=',
    transform: (remainingTmplStr, config) => {
      const originalEndDeliLength = config.delimiter.end.length;
      const indexOfEndTag = remainingTmplStr.indexOf('=' + config.delimiter.end);
      if (indexOfEndTag < 0 )
        throw new Error(`missing end delimiter at: '${remainingTmplStr}'`)

      const [ newStartDeli, newEndDeli ] = remainingTmplStr.substring(1, indexOfEndTag).split(' ');

      config.delimiter.start = newStartDeli;
      config.delimiter.end = newEndDeli;
      
      return {
        remainingTmplStr: remainingTmplStr.substring(indexOfEndTag + 1 + originalEndDeliLength),
        insertionPoint: undefined,  
      }
    }
  });

  const createDefault = (html, unsafeHTML) =>
    createCustom({
      html,
      delimiter: { start: '{{', end: '}}' },
      transformVariable: variable,
      transformers: {
        unsafeVariable: unsafeVariable(unsafeHTML),
        section: section(),
        invertedSection: invertedSection(),
        comment: comment(),
        customDelimiterTransformer: customDelimiter(),
      },
    });

  const xform = (mustache) => {
      return (template) => {
          return mustache(template instanceof HTMLTemplateElement ? template.innerHTML : template);
      };
  };
  function createMustacheTransformer(arg1, arg2) {
      if ('function' === typeof arg1) {
          return xform(createDefault(arg1, arg2));
      }
      else {
          return xform(createCustom(Object.assign({
              delimiter: { start: '{{', end: '}}' },
              transformers: {},
          }, arg1)));
      }
  }
  const transformer = {
      variable,
      unsafeVariable,
      section,
      invertedSection,
      comment,
      customDelimiter,
  };

  /*
   * @license
   * Portions Copyright (c) 2013, the Dart project authors.
   */
  const KEYWORDS = ['this'];
  const UNARY_OPERATORS = ['+', '-', '!'];
  const BINARY_OPERATORS = [
      '+',
      '-',
      '*',
      '/',
      '%',
      '^',
      '==',
      '!=',
      '>',
      '<',
      '>=',
      '<=',
      '||',
      '&&',
      '??',
      '&',
      '===',
      '!==',
      '|',
      '|>',
  ];
  const PRECEDENCE = {
      '!': 0,
      ':': 0,
      ',': 0,
      ')': 0,
      ']': 0,
      '}': 0,
      '|>': 1,
      '?': 2,
      '??': 3,
      '||': 4,
      '&&': 5,
      '|': 6,
      '^': 7,
      '&': 8,
      // equality
      '!=': 9,
      '==': 9,
      '!==': 9,
      '===': 9,
      // relational
      '>=': 10,
      '>': 10,
      '<=': 10,
      '<': 10,
      // additive
      '+': 11,
      '-': 11,
      // multiplicative
      '%': 12,
      '/': 12,
      '*': 12,
      // postfix
      '(': 13,
      '[': 13,
      '.': 13,
      '{': 13, // not sure this is correct
  };
  const POSTFIX_PRECEDENCE = 13;

  /*
   * @license
   * Portions Copyright (c) 2013, the Dart project authors.
   */
  const _TWO_CHAR_OPS = ['==', '!=', '<=', '>=', '||', '&&', '??', '|>'];
  const _THREE_CHAR_OPS = ['===', '!=='];
  var Kind;
  (function (Kind) {
      Kind[Kind["STRING"] = 1] = "STRING";
      Kind[Kind["IDENTIFIER"] = 2] = "IDENTIFIER";
      Kind[Kind["DOT"] = 3] = "DOT";
      Kind[Kind["COMMA"] = 4] = "COMMA";
      Kind[Kind["COLON"] = 5] = "COLON";
      Kind[Kind["INTEGER"] = 6] = "INTEGER";
      Kind[Kind["DECIMAL"] = 7] = "DECIMAL";
      Kind[Kind["OPERATOR"] = 8] = "OPERATOR";
      Kind[Kind["GROUPER"] = 9] = "GROUPER";
      Kind[Kind["KEYWORD"] = 10] = "KEYWORD";
  })(Kind || (Kind = {}));
  const token = (kind, value, precedence = 0) => ({
      kind,
      value,
      precedence,
  });
  const _isWhitespace = (ch) => ch === 9 /* \t */ ||
      ch === 10 /* \n */ ||
      ch === 13 /* \r */ ||
      ch === 32; /* space */
  // TODO(justinfagnani): allow code points > 127
  const _isIdentOrKeywordStart = (ch) => ch === 95 /* _ */ ||
      ch === 36 /* $ */ ||
      // ch &= ~32 puts ch into the range [65,90] [A-Z] only if ch was already in
      // the that range or in the range [97,122] [a-z]. We must mutate ch only after
      // checking other characters, thus the comma operator.
      ((ch &= ~32), 65 /* A */ <= ch && ch <= 90); /* Z */
  // TODO(justinfagnani): allow code points > 127
  const _isIdentifier = (ch) => _isIdentOrKeywordStart(ch) || _isNumber(ch);
  const _isKeyword = (str) => KEYWORDS.indexOf(str) !== -1;
  const _isQuote = (ch) => ch === 34 /* " */ || ch === 39; /* ' */
  const _isNumber = (ch) => 48 /* 0 */ <= ch && ch <= 57; /* 9 */
  const _isOperator = (ch) => ch === 43 /* + */ ||
      ch === 45 /* - */ ||
      ch === 42 /* * */ ||
      ch === 47 /* / */ ||
      ch === 33 /* ! */ ||
      ch === 38 /* & */ ||
      ch === 37 /* % */ ||
      ch === 60 /* < */ ||
      ch === 61 /* = */ ||
      ch === 62 /* > */ ||
      ch === 63 /* ? */ ||
      ch === 94 /* ^ */ ||
      ch === 124; /* | */
  const _isGrouper = (ch) => ch === 40 /* ( */ ||
      ch === 41 /* ) */ ||
      ch === 91 /* [ */ ||
      ch === 93 /* ] */ ||
      ch === 123 /* { */ ||
      ch === 125; /* } */
  const _escapeString = (str) => str.replace(/\\(.)/g, (_match, group) => {
      switch (group) {
          case 'n':
              return '\n';
          case 'r':
              return '\r';
          case 't':
              return '\t';
          case 'b':
              return '\b';
          case 'f':
              return '\f';
          default:
              return group;
      }
  });
  class Tokenizer {
      constructor(input) {
          this._index = -1;
          this._tokenStart = 0;
          this._input = input;
          this._advance();
      }
      nextToken() {
          while (_isWhitespace(this._next)) {
              this._advance(true);
          }
          if (_isQuote(this._next))
              return this._tokenizeString();
          if (_isIdentOrKeywordStart(this._next)) {
              return this._tokenizeIdentOrKeyword();
          }
          if (_isNumber(this._next))
              return this._tokenizeNumber();
          if (this._next === 46 /* . */)
              return this._tokenizeDot();
          if (this._next === 44 /* , */)
              return this._tokenizeComma();
          if (this._next === 58 /* : */)
              return this._tokenizeColon();
          if (_isOperator(this._next))
              return this._tokenizeOperator();
          if (_isGrouper(this._next))
              return this._tokenizeGrouper();
          // no match, should be end of input
          this._advance();
          if (this._next !== undefined) {
              throw new Error(`Expected end of input, got ${this._next}`);
          }
          return undefined;
      }
      _advance(resetTokenStart) {
          this._index++;
          if (this._index < this._input.length) {
              this._next = this._input.charCodeAt(this._index);
              if (resetTokenStart === true) {
                  this._tokenStart = this._index;
              }
          }
          else {
              this._next = undefined;
          }
      }
      _getValue(lookahead = 0) {
          const v = this._input.substring(this._tokenStart, this._index + lookahead);
          if (lookahead === 0) {
              this._clearValue();
          }
          return v;
      }
      _clearValue() {
          this._tokenStart = this._index;
      }
      _tokenizeString() {
          const _us = 'unterminated string';
          const quoteChar = this._next;
          this._advance(true);
          while (this._next !== quoteChar) {
              if (this._next === undefined)
                  throw new Error(_us);
              if (this._next === 92 /* \ */) {
                  this._advance();
                  if (this._next === undefined)
                      throw new Error(_us);
              }
              this._advance();
          }
          const t = token(Kind.STRING, _escapeString(this._getValue()));
          this._advance();
          return t;
      }
      _tokenizeIdentOrKeyword() {
          // This do/while loops assumes _isIdentifier(this._next!), so it must only
          // be called if _isIdentOrKeywordStart(this._next!) has returned true.
          do {
              this._advance();
          } while (_isIdentifier(this._next));
          const value = this._getValue();
          const kind = _isKeyword(value) ? Kind.KEYWORD : Kind.IDENTIFIER;
          return token(kind, value);
      }
      _tokenizeNumber() {
          // This do/while loops assumes _isNumber(this._next!), so it must only
          // be called if _isNumber(this._next!) has returned true.
          do {
              this._advance();
          } while (_isNumber(this._next));
          if (this._next === 46 /* . */)
              return this._tokenizeDot();
          return token(Kind.INTEGER, this._getValue());
      }
      _tokenizeDot() {
          this._advance();
          if (_isNumber(this._next))
              return this._tokenizeFraction();
          this._clearValue();
          return token(Kind.DOT, '.', POSTFIX_PRECEDENCE);
      }
      _tokenizeComma() {
          this._advance(true);
          return token(Kind.COMMA, ',');
      }
      _tokenizeColon() {
          this._advance(true);
          return token(Kind.COLON, ':');
      }
      _tokenizeFraction() {
          // This do/while loops assumes _isNumber(this._next!), so it must only
          // be called if _isNumber(this._next!) has returned true.
          do {
              this._advance();
          } while (_isNumber(this._next));
          return token(Kind.DECIMAL, this._getValue());
      }
      _tokenizeOperator() {
          this._advance();
          let op = this._getValue(2);
          if (_THREE_CHAR_OPS.indexOf(op) !== -1) {
              this._advance();
              this._advance();
          }
          else {
              op = this._getValue(1);
              if (_TWO_CHAR_OPS.indexOf(op) !== -1) {
                  this._advance();
              }
          }
          op = this._getValue();
          return token(Kind.OPERATOR, op, PRECEDENCE[op]);
      }
      _tokenizeGrouper() {
          const value = String.fromCharCode(this._next);
          const t = token(Kind.GROUPER, value, PRECEDENCE[value]);
          this._advance(true);
          return t;
      }
  }

  /*
   * @license
   * Portions Copyright (c) 2013, the Dart project authors.
   */
  const parse = (expr, astFactory) => new Parser(expr, astFactory).parse();
  class Parser {
      constructor(input, astFactory) {
          this._tokenizer = new Tokenizer(input);
          this._ast = astFactory;
      }
      parse() {
          this._advance();
          return this._parseExpression();
      }
      _advance(kind, value) {
          if (!this._matches(kind, value)) {
              throw new Error(`Expected kind ${kind} (${value}), was ${this._token}`);
          }
          const t = this._tokenizer.nextToken();
          this._token = t;
          this._kind = t === null || t === void 0 ? void 0 : t.kind;
          this._value = t === null || t === void 0 ? void 0 : t.value;
      }
      _matches(kind, value) {
          return !((kind && this._kind !== kind) || (value && this._value !== value));
      }
      _parseExpression() {
          if (!this._token)
              return this._ast.empty();
          const expr = this._parseUnary();
          return expr === undefined ? undefined : this._parsePrecedence(expr, 0);
      }
      // _parsePrecedence and _parseBinary implement the precedence climbing
      // algorithm as described in:
      // http://en.wikipedia.org/wiki/Operator-precedence_parser#Precedence_climbing_method
      _parsePrecedence(left, precedence) {
          if (left === undefined) {
              throw new Error('Expected left to be defined.');
          }
          while (this._token) {
              if (this._matches(Kind.GROUPER, '(')) {
                  const args = this._parseArguments();
                  left = this._ast.invoke(left, undefined, args);
              }
              else if (this._matches(Kind.GROUPER, '[')) {
                  const indexExpr = this._parseIndex();
                  left = this._ast.index(left, indexExpr);
              }
              else if (this._matches(Kind.DOT)) {
                  this._advance();
                  const right = this._parseUnary();
                  left = this._makeInvokeOrGetter(left, right);
              }
              else if (this._matches(Kind.KEYWORD)) {
                  break;
              }
              else if (this._matches(Kind.OPERATOR) &&
                  this._token.precedence >= precedence) {
                  left =
                      this._value === '?'
                          ? this._parseTernary(left)
                          : this._parseBinary(left, this._token);
              }
              else {
                  break;
              }
          }
          return left;
      }
      _makeInvokeOrGetter(left, right) {
          if (right === undefined) {
              throw new Error('expected identifier');
          }
          if (right.type === 'ID') {
              return this._ast.getter(left, right.value);
          }
          else if (right.type === 'Invoke' &&
              right.receiver.type === 'ID') {
              const method = right.receiver;
              return this._ast.invoke(left, method.value, right.arguments);
          }
          else {
              throw new Error(`expected identifier: ${right}`);
          }
      }
      _parseBinary(left, op) {
          if (BINARY_OPERATORS.indexOf(op.value) === -1) {
              throw new Error(`unknown operator: ${op.value}`);
          }
          this._advance();
          let right = this._parseUnary();
          while ((this._kind === Kind.OPERATOR ||
              this._kind === Kind.DOT ||
              this._kind === Kind.GROUPER) &&
              this._token.precedence > op.precedence) {
              right = this._parsePrecedence(right, this._token.precedence);
          }
          return this._ast.binary(left, op.value, right);
      }
      _parseUnary() {
          if (this._matches(Kind.OPERATOR)) {
              const value = this._value;
              this._advance();
              // handle unary + and - on numbers as part of the literal, not as a
              // unary operator
              if (value === '+' || value === '-') {
                  if (this._matches(Kind.INTEGER)) {
                      return this._parseInteger(value);
                  }
                  else if (this._matches(Kind.DECIMAL)) {
                      return this._parseDecimal(value);
                  }
              }
              if (UNARY_OPERATORS.indexOf(value) === -1)
                  throw new Error(`unexpected token: ${value}`);
              const expr = this._parsePrecedence(this._parsePrimary(), POSTFIX_PRECEDENCE);
              return this._ast.unary(value, expr);
          }
          return this._parsePrimary();
      }
      _parseTernary(condition) {
          this._advance(Kind.OPERATOR, '?');
          const trueExpr = this._parseExpression();
          this._advance(Kind.COLON);
          const falseExpr = this._parseExpression();
          return this._ast.ternary(condition, trueExpr, falseExpr);
      }
      _parsePrimary() {
          switch (this._kind) {
              case Kind.KEYWORD:
                  const keyword = this._value;
                  if (keyword === 'this') {
                      this._advance();
                      // TODO(justin): return keyword node
                      return this._ast.id(keyword);
                  }
                  else if (KEYWORDS.indexOf(keyword) !== -1) {
                      throw new Error(`unexpected keyword: ${keyword}`);
                  }
                  throw new Error(`unrecognized keyword: ${keyword}`);
              case Kind.IDENTIFIER:
                  return this._parseInvokeOrIdentifier();
              case Kind.STRING:
                  return this._parseString();
              case Kind.INTEGER:
                  return this._parseInteger();
              case Kind.DECIMAL:
                  return this._parseDecimal();
              case Kind.GROUPER:
                  if (this._value === '(') {
                      return this._parseParen();
                  }
                  else if (this._value === '{') {
                      return this._parseMap();
                  }
                  else if (this._value === '[') {
                      return this._parseList();
                  }
                  return undefined;
              case Kind.COLON:
                  throw new Error('unexpected token ":"');
              default:
                  return undefined;
          }
      }
      _parseList() {
          const items = [];
          do {
              this._advance();
              if (this._matches(Kind.GROUPER, ']'))
                  break;
              items.push(this._parseExpression());
          } while (this._matches(Kind.COMMA));
          this._advance(Kind.GROUPER, ']');
          return this._ast.list(items);
      }
      _parseMap() {
          const entries = {};
          do {
              this._advance();
              if (this._matches(Kind.GROUPER, '}'))
                  break;
              const key = this._value;
              this._advance(Kind.STRING);
              this._advance(Kind.COLON);
              entries[key] = this._parseExpression();
          } while (this._matches(Kind.COMMA));
          this._advance(Kind.GROUPER, '}');
          return this._ast.map(entries);
      }
      _parseInvokeOrIdentifier() {
          const value = this._value;
          if (value === 'true') {
              this._advance();
              return this._ast.literal(true);
          }
          if (value === 'false') {
              this._advance();
              return this._ast.literal(false);
          }
          if (value === 'null') {
              this._advance();
              return this._ast.literal(null);
          }
          if (value === 'undefined') {
              this._advance();
              return this._ast.literal(undefined);
          }
          const identifier = this._parseIdentifier();
          const args = this._parseArguments();
          return !args ? identifier : this._ast.invoke(identifier, undefined, args);
      }
      _parseIdentifier() {
          if (!this._matches(Kind.IDENTIFIER)) {
              throw new Error(`expected identifier: ${this._value}`);
          }
          const value = this._value;
          this._advance();
          return this._ast.id(value);
      }
      _parseArguments() {
          if (!this._matches(Kind.GROUPER, '(')) {
              return undefined;
          }
          const args = [];
          do {
              this._advance();
              if (this._matches(Kind.GROUPER, ')')) {
                  break;
              }
              const expr = this._parseExpression();
              args.push(expr);
          } while (this._matches(Kind.COMMA));
          this._advance(Kind.GROUPER, ')');
          return args;
      }
      _parseIndex() {
          // console.assert(this._matches(Kind.GROUPER, '['));
          this._advance();
          const expr = this._parseExpression();
          this._advance(Kind.GROUPER, ']');
          return expr;
      }
      _parseParen() {
          this._advance();
          const expr = this._parseExpression();
          this._advance(Kind.GROUPER, ')');
          return this._ast.paren(expr);
      }
      _parseString() {
          const value = this._ast.literal(this._value);
          this._advance();
          return value;
      }
      _parseInteger(prefix = '') {
          const value = this._ast.literal(parseInt(`${prefix}${this._value}`, 10));
          this._advance();
          return value;
      }
      _parseDecimal(prefix = '') {
          const value = this._ast.literal(parseFloat(`${prefix}${this._value}`));
          this._advance();
          return value;
      }
  }

  /*
   * @license
   * Portions Copyright (c) 2013, the Dart project authors.
   */
  const _BINARY_OPERATORS = {
      '+': (a, b) => a + b,
      '-': (a, b) => a - b,
      '*': (a, b) => a * b,
      '/': (a, b) => a / b,
      '%': (a, b) => a % b,
      '==': (a, b) => a == b,
      '!=': (a, b) => a != b,
      '===': (a, b) => a === b,
      '!==': (a, b) => a !== b,
      '>': (a, b) => a > b,
      '>=': (a, b) => a >= b,
      '<': (a, b) => a < b,
      '<=': (a, b) => a <= b,
      '||': (a, b) => a || b,
      '&&': (a, b) => a && b,
      '??': (a, b) => a !== null && a !== void 0 ? a : b,
      '|': (a, f) => f(a),
      '|>': (a, f) => f(a),
  };
  const _UNARY_OPERATORS = {
      '+': (a) => a,
      '-': (a) => -a,
      '!': (a) => !a,
  };
  class EvalAstFactory {
      empty() {
          // TODO(justinfagnani): return null instead?
          return {
              type: 'Empty',
              evaluate(scope) {
                  return scope;
              },
              getIds(idents) {
                  return idents;
              },
          };
      }
      // TODO(justinfagnani): just use a JS literal?
      literal(v) {
          return {
              type: 'Literal',
              value: v,
              evaluate(_scope) {
                  return this.value;
              },
              getIds(idents) {
                  return idents;
              },
          };
      }
      id(v) {
          return {
              type: 'ID',
              value: v,
              evaluate(scope) {
                  // TODO(justinfagnani): this prevents access to properties named 'this'
                  if (this.value === 'this')
                      return scope;
                  return scope === null || scope === void 0 ? void 0 : scope[this.value];
              },
              getIds(idents) {
                  idents.push(this.value);
                  return idents;
              },
          };
      }
      unary(op, expr) {
          const f = _UNARY_OPERATORS[op];
          return {
              type: 'Unary',
              operator: op,
              child: expr,
              evaluate(scope) {
                  return f(this.child.evaluate(scope));
              },
              getIds(idents) {
                  return this.child.getIds(idents);
              },
          };
      }
      binary(l, op, r) {
          const f = _BINARY_OPERATORS[op];
          return {
              type: 'Binary',
              operator: op,
              left: l,
              right: r,
              evaluate(scope) {
                  return f(this.left.evaluate(scope), this.right.evaluate(scope));
              },
              getIds(idents) {
                  this.left.getIds(idents);
                  this.right.getIds(idents);
                  return idents;
              },
          };
      }
      getter(g, n) {
          return {
              type: 'Getter',
              receiver: g,
              name: n,
              evaluate(scope) {
                  var _a;
                  return (_a = this.receiver.evaluate(scope)) === null || _a === void 0 ? void 0 : _a[this.name];
              },
              getIds(idents) {
                  this.receiver.getIds(idents);
                  return idents;
              },
          };
      }
      invoke(receiver, method, args) {
          if (method != null && typeof method !== 'string') {
              throw new Error('method not a string');
          }
          return {
              type: 'Invoke',
              receiver: receiver,
              method: method,
              arguments: args,
              evaluate(scope) {
                  var _a, _b;
                  const receiver = this.receiver.evaluate(scope);
                  // TODO(justinfagnani): this might be wrong in cases where we're
                  // invoking a top-level function rather than a method. If method is
                  // defined on a nested scope, then we should probably set _this to null.
                  const _this = this.method ? receiver : (_a = scope['this']) !== null && _a !== void 0 ? _a : scope;
                  const f = this.method ? receiver[method] : receiver;
                  const args = (_b = this.arguments) !== null && _b !== void 0 ? _b : [];
                  const argValues = args.map((a) => a === null || a === void 0 ? void 0 : a.evaluate(scope));
                  return f.apply(_this, argValues);
              },
              getIds(idents) {
                  var _a;
                  this.receiver.getIds(idents);
                  (_a = this.arguments) === null || _a === void 0 ? void 0 : _a.forEach((a) => a === null || a === void 0 ? void 0 : a.getIds(idents));
                  return idents;
              },
          };
      }
      paren(e) {
          return e;
      }
      index(e, a) {
          return {
              type: 'Index',
              receiver: e,
              argument: a,
              evaluate(scope) {
                  var _a;
                  return (_a = this.receiver.evaluate(scope)) === null || _a === void 0 ? void 0 : _a[this.argument.evaluate(scope)];
              },
              getIds(idents) {
                  this.receiver.getIds(idents);
                  return idents;
              },
          };
      }
      ternary(c, t, f) {
          return {
              type: 'Ternary',
              condition: c,
              trueExpr: t,
              falseExpr: f,
              evaluate(scope) {
                  const c = this.condition.evaluate(scope);
                  if (c) {
                      return this.trueExpr.evaluate(scope);
                  }
                  else {
                      return this.falseExpr.evaluate(scope);
                  }
              },
              getIds(idents) {
                  this.condition.getIds(idents);
                  this.trueExpr.getIds(idents);
                  this.falseExpr.getIds(idents);
                  return idents;
              },
          };
      }
      map(entries) {
          return {
              type: 'Map',
              entries: entries,
              evaluate(scope) {
                  const map = {};
                  if (entries && this.entries) {
                      for (const key in entries) {
                          const val = this.entries[key];
                          if (val) {
                              map[key] = val.evaluate(scope);
                          }
                      }
                  }
                  return map;
              },
              getIds(idents) {
                  if (entries && this.entries) {
                      for (const key in entries) {
                          const val = this.entries[key];
                          if (val) {
                              val.getIds(idents);
                          }
                      }
                  }
                  return idents;
              },
          };
      }
      // TODO(justinfagnani): if the list is deeply literal
      list(l) {
          return {
              type: 'List',
              items: l,
              evaluate(scope) {
                  var _a;
                  return (_a = this.items) === null || _a === void 0 ? void 0 : _a.map((a) => a === null || a === void 0 ? void 0 : a.evaluate(scope));
              },
              getIds(idents) {
                  var _a;
                  (_a = this.items) === null || _a === void 0 ? void 0 : _a.forEach((i) => i === null || i === void 0 ? void 0 : i.getIds(idents));
                  return idents;
              },
          };
      }
  }

  const { AttributePart, PropertyPart, BooleanAttributePart, EventPart } = extensionTemplate["_Σ"];
  const astFactory = new EvalAstFactory();
  const expressionCache = new Map();
  const toCamelCase = (s) => s.replace(/-(-|\w)/g, (_, p1) => p1.toUpperCase());
  /**
   * Gets the value from a string that contains a delimted expression: {{ ... }}
   */
  const getSingleValue = (s, model) => {
      let ast = expressionCache.get(s);
      if (ast === undefined) {
          if (expressionCache.has(s)) {
              return undefined;
          }
          s = s.trim();
          if (s.startsWith('{{') && s.endsWith('}}')) {
              const expression = s.substring(2, s.length - 2).trim();
              ast = new Parser(expression, astFactory).parse();
              expressionCache.set(s, ast);
          }
      }
      return ast?.evaluate(model);
  };
  const ifHandler = (template, model, handlers, renderers) => {
      const ifAttribute = template.getAttribute('if');
      if (ifAttribute !== null && getSingleValue(ifAttribute, model)) {
          return evaluateTemplate(template, model, handlers, renderers);
      }
      return undefined;
  };
  const repeatHandler = (template, model, handlers, renderers) => {
      const repeatAttribute = template.getAttribute('repeat');
      if (repeatAttribute !== null) {
          const items = getSingleValue(repeatAttribute, model);
          if (!items[Symbol.iterator]) {
              return extensionTemplate.nothing;
          }
          const litTemplate = getLitTemplate(template);
          let index = -1;
          const result = [];
          for (const item of items) {
              index++;
              const itemModel = Object.create(model);
              itemModel.item = item;
              itemModel.index = index;
              itemModel['this'] = model['this'] ?? model;
              const values = litTemplate.parts.map((part) => part.update(itemModel, handlers, renderers));
              const templateResult = {
                  _$litType$: litTemplate,
                  values,
              };
              result.push(templateResult);
          }
          return result;
      }
      return undefined;
  };
  const defaultHandlers = {
      if: ifHandler,
      repeat: repeatHandler,
  };
  /**
   * @returns {Function} a template function of the form (model) => TemplateResult
   */
  const prepareTemplate = (template, handlers = defaultHandlers, renderers = {}, superTemplate) => {
      const litTemplate = getLitTemplate(template);
      const templateRenderers = litTemplate.renderers;
      if (superTemplate) {
          const superLitTemplate = getLitTemplate(superTemplate);
          const superRenderers = superLitTemplate.renderers;
          const superCallRenderer = templateRenderers['super'];
          if (superCallRenderer !== undefined) {
              // Explicit super call
              // render the sub template with:
              renderers = {
                  // sub template's own renderes
                  ...templateRenderers,
                  // passed-in renderers
                  ...renderers,
                  // a super call renderer
                  super: (model, handlers, renderers) => {
                      // This renderer delegates to the super block in the sub template,
                      // which in turn delegates back to the super renderer below, but with
                      // the inner blocks of the super call.
                      // when the super call goes, render with:
                      renderers = {
                          // super template's own blocks
                          ...superRenderers,
                          // passed-in renderers
                          ...renderers,
                          // sub template's overrides will be added by the inner super call
                          super: (model, handlers, renderers) => {
                              return evaluateTemplate(superTemplate, model, handlers, renderers);
                          },
                      };
                      return superCallRenderer(model, handlers, renderers);
                  },
              };
          }
          else {
              // Implicit super call
              // Wrap the whole template in an implicit super call by rendering the
              // super template first, but using the block renderers from this template.
              // Render the super template with:
              renderers = {
                  // super template's own blocks
                  ...superRenderers,
                  // sub template's overrides
                  ...templateRenderers,
                  // passed-in renderers
                  ...renderers,
              };
              template = superTemplate;
          }
      }
      else {
          // No super call
          renderers = {
              ...renderers,
              ...templateRenderers,
          };
      }
      return (model) => evaluateTemplate(template, model, handlers, renderers);
  };
  /**
   * Evaluates the given template and returns its result
   *
   * @param template
   * @param model
   * @param handlers
   * @param renderers
   * @returns
   */
  const evaluateTemplate = (template, model, handlers = defaultHandlers, renderers = {}) => {
      const litTemplate = getLitTemplate(template);
      const values = [];
      for (const part of litTemplate.parts) {
          const value = part.update(model, handlers, renderers);
          if (part.type === 1) {
              values.push(...value);
          }
          else {
              values.push(value);
          }
      }
      const templateResult = {
          _$litType$: litTemplate,
          values,
      };
      return templateResult;
  };
  const litTemplateCache = new Map();
  const getLitTemplate = (template) => {
      let litTemplate = litTemplateCache.get(template);
      if (litTemplate === undefined) {
          litTemplateCache.set(template, (litTemplate = makeLitTemplate(template)));
      }
      return litTemplate;
  };
  const makeLitTemplate = (template) => {
      const litTemplate = {
          h: undefined,
          el: template.cloneNode(true),
          parts: [],
          renderers: {},
      };
      const walker = document.createTreeWalker(litTemplate.el.content, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT | NodeFilter.SHOW_COMMENT);
      let node = walker.currentNode;
      let nodeIndex = -1;
      const elementsToRemove = [];
      while ((node = walker.nextNode()) !== null) {
          if (node.nodeType === Node.ELEMENT_NODE) {
              nodeIndex++;
              const element = node;
              if (element.tagName === 'TEMPLATE') {
                  const type = element.getAttribute('type');
                  const name = element.getAttribute('name');
                  if (type !== null || name !== null) {
                      element.parentNode.insertBefore(document.createComment(''), element);
                      elementsToRemove.push(element);
                      let update;
                      if (type !== null) {
                          // This is a control-flow call, like if/repeat
                          update = (model, handlers, renderers) => {
                              const handler = handlers[type];
                              return handler?.(element, model, handlers, renderers);
                          };
                      }
                      else {
                          // This is a named block
                          if (name === 'super') {
                              litTemplate.renderers['super'] = (model, handlers, renderers) => {
                                  // Instead of rendering this block, delegate to a passed in
                                  // 'super' renderer which will actually render the late-bound
                                  // super template. We pass that renderer the child blocks from
                                  // this block for block overrides.
                                  const superRenderer = renderers['super'];
                                  const superCallTemplate = getLitTemplate(element);
                                  renderers = {
                                      ...renderers,
                                      ...superCallTemplate.renderers,
                                  };
                                  return superRenderer(model, handlers, renderers);
                              };
                          }
                          else {
                              // The renderer renders the contents of the named block
                              litTemplate.renderers[name] = (model, handlers, renderers) => {
                                  return evaluateTemplate(element, model, handlers, renderers);
                              };
                          }
                          // The updater runs when the template is evaluated and functions as
                          // a template _call_. It looks for a named renderer, which might be
                          // the renderer function above if the block is not overridden.
                          update = (model, handlers, renderers) => {
                              const renderer = renderers[name];
                              return renderer?.(model, handlers, renderers);
                          };
                      }
                      litTemplate.parts.push({
                          type: 2,
                          index: nodeIndex,
                          update,
                      });
                  }
              }
              else {
                  const attributeNames = element.getAttributeNames();
                  for (const attributeName of attributeNames) {
                      const attributeValue = element.getAttribute(attributeName);
                      // TODO: use alternative to negative lookbehind
                      // (but it's so convenient!)
                      const splitValue = attributeValue.split(/(?<!\\){{(.*?)(?:(?<!\\)}})/g);
                      if (splitValue.length === 1) {
                          continue;
                      }
                      element.removeAttribute(attributeName);
                      let name = attributeName;
                      let ctor = AttributePart;
                      const prefix = attributeName[0];
                      if (prefix === '.') {
                          name = toCamelCase(attributeName.substring(1));
                          ctor = PropertyPart;
                      }
                      else if (prefix === '?') {
                          name = attributeName.substring(1);
                          ctor = BooleanAttributePart;
                      }
                      else if (prefix === '@') {
                          name = toCamelCase(attributeName.substring(1));
                          ctor = EventPart;
                      }
                      const strings = [splitValue[0]];
                      const exprs = [];
                      for (let i = 1; i < splitValue.length; i += 2) {
                          const exprText = splitValue[i];
                          exprs.push(parse(exprText, astFactory));
                          strings.push(splitValue[i + 1]);
                      }
                      litTemplate.parts.push({
                          type: 1,
                          index: nodeIndex,
                          name,
                          strings,
                          ctor,
                          update: (model, _handlers, _renderers) => {
                              return exprs.map((expr) => expr.evaluate(model));
                          },
                      });
                  }
              }
          }
          else if (node.nodeType === Node.TEXT_NODE) {
              const textNode = node;
              const text = textNode.textContent;
              const strings = text.split(/(?<!\\){{(.*?)(?:(?<!\\)}})/g);
              if (strings.length > 1) {
                  textNode.textContent = strings[0].replace('\\{{', '{{');
              }
              else {
                  // TODO: do this better
                  textNode.textContent = text.replace('\\{{', '{{');
              }
              for (let i = 1; i < strings.length; i += 2) {
                  const exprText = strings[i];
                  const expr = parse(exprText, astFactory);
                  litTemplate.parts.push({
                      type: 2,
                      index: ++nodeIndex,
                      update: (model, _handlers) => expr.evaluate(model),
                  });
                  const newTextNode = new Text(strings[i + 1].replace('\\{{', '{{'));
                  textNode.parentNode.insertBefore(newTextNode, textNode.nextSibling);
                  textNode.parentNode.insertBefore(document.createComment(''), textNode.nextSibling);
                  // This TreeWalker isn't configured to walk comment nodes, but this
                  // node will be returned next time through the loop. This is the easiest
                  // way to get the walker to proceed to the next successor after the
                  // marker, even when the marker doesn't have a nextSibling
                  walker.currentNode = newTextNode;
              }
          }
      }
      for (const e of elementsToRemove) {
          e.remove();
      }
      return litTemplate;
  };

  function ensure(template) {
      if (template instanceof HTMLTemplateElement) {
          return template;
      }
      else if ('string' === typeof template) {
          const element = document.createElement('template');
          element.innerHTML = template;
          return element;
      }
      else {
          throw new TypeError(`Type of template is not a valid. [typeof: ${typeof template}]`);
      }
  }
  function createStampinoTransformer(options) {
      const { handlers, renderers, superTemplate } = options || {};
      return (template) => {
          return prepareTemplate(ensure(template), handlers, renderers, superTemplate);
      };
  }

  exports.createMustacheTransformer = createMustacheTransformer;
  exports.createStampinoTransformer = createStampinoTransformer;
  exports.evaluateTemplate = evaluateTemplate;
  exports.prepareTemplate = prepareTemplate;
  exports.transformer = transformer;

  Object.defineProperty(exports, '__esModule', { value: true });

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uLXRlbXBsYXRlLWJyaWRnZS5qcyIsInNvdXJjZXMiOlsibGl0LXRyYW5zZm9ybWVyL3NyYy9saXQtdHJhbnNmb3JtZXIuanMiLCJsaXQtdHJhbnNmb3JtZXIvc3JjL2hlbHBlci9kYXRhSGVscGVyLmpzIiwibGl0LXRyYW5zZm9ybWVyL3NyYy90cmFuc2Zvcm1lcnMvdmFyaWFibGVUcmFuc2Zvcm1lci5qcyIsImxpdC10cmFuc2Zvcm1lci9zcmMvdHJhbnNmb3JtZXJzL3Vuc2FmZVZhcmlhYmxlLmpzIiwibGl0LXRyYW5zZm9ybWVyL3NyYy9oZWxwZXIvaXNNdXN0YWNoZUZhbHN5LmpzIiwibGl0LXRyYW5zZm9ybWVyL3NyYy9oZWxwZXIvc2VjdGlvbkhlbHBlci5qcyIsImxpdC10cmFuc2Zvcm1lci9zcmMvdHJhbnNmb3JtZXJzL3NlY3Rpb24uanMiLCJsaXQtdHJhbnNmb3JtZXIvc3JjL3RyYW5zZm9ybWVycy9pbnZlcnRlZFNlY3Rpb24uanMiLCJsaXQtdHJhbnNmb3JtZXIvc3JjL3RyYW5zZm9ybWVycy9jb21tZW50LmpzIiwibGl0LXRyYW5zZm9ybWVyL3NyYy90cmFuc2Zvcm1lcnMvY3VzdG9tRGVsaW1pdGVyLmpzIiwibGl0LXRyYW5zZm9ybWVyL3NyYy9saXQtdHJhbnNmb3JtZXItY29uZmlndXJlZE91dE9mVGhlQm94LmpzIiwiYnJpZGdlLW11c3RhY2hlLnRzIiwiamV4cHIvc3JjL2xpYi9jb25zdGFudHMudHMiLCJqZXhwci9zcmMvbGliL3Rva2VuaXplci50cyIsImpleHByL3NyYy9saWIvcGFyc2VyLnRzIiwiamV4cHIvc3JjL2xpYi9ldmFsLnRzIiwic3RhbXBpbm8vc3JjL3N0YW1waW5vLnRzIiwiYnJpZGdlLXN0YW1waW5vLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qKiBcclxuICogQHBhcmFtIHtvYmplY3R9IGNvbmZpZyA9IHtcclxuICogIGh0bWw6IGxpdC1odG1sLmh0bWwsXHJcbiAqICBkZWxpbWl0ZXI6IHsgc3RhcnQ6ICd7eycsIGVuZDogJ319JyB9LFxyXG4gKiAgdHJhbnNmb3JtZXJzOiB7IC8vIG5vdGUgdGhhdCB0cmFuc2Zvcm1WYXJpYWJsZSBpcyBub3QgaGVyZS4gSXQgZ2V0cyBhcHBsaWVkIHdoZW4gbm8gdHJhbnNmb3JtZXIudGVzdCBoYXMgcGFzc2VkXHJcbiAqICAgIG5hbWU6IHtcclxuICogICAgICB0ZXN0OiAoc3RyLCBjb25maWcpID0+IGJvb2wsXHJcbiAqICAgICAgdHJhbnNmb3JtOiAoc3RyLCBjb25maWcpID0+ICh7XHJcbiAqICAgICAgICByZW1haW5pbmdUbXBsU3RyOiBzdHIsXHJcbiAqICAgICAgICBpbnNlcnRpb25Qb2ludDogY3R4ID0+IGxpdC1odG1sLlRlbXBsYXRlUmVzdWx0IHwgdW5kZWZpbmVkLCAvLyBpZiB1bmRlZmluZWQgcmVtYWluaW5nVG1wbFN0ciB3aWxsIGJlIG1lcmdlZCB3aXRoIGxhc3Qgc3RhdGljIHBhcnQgXHJcbiAqICAgICAgfSksXHJcbiAqICAgIH0sXHJcbiAqICB9LFxyXG4gKiAgdHJhbnNmb3JtVmFyaWFibGUsIFxyXG4gKiB9XHJcbiAqIEByZXR1cm5zIHtmdW5jdGlvbn0gc3RyVGVtcGxhdGUgPT4gY3R4ID0+IGxpdC1odG1sLlRlbXBsYXRlUmVzdWx0XHJcbiAqL1xyXG5leHBvcnQgZGVmYXVsdCBjb25maWcgPT4gc3RyVGVtcGxhdGUgPT4gdHJhbnNmb3JtKHN0clRlbXBsYXRlLCBjb25maWcpXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gdHJhbnNmb3JtKHRtcGwyUGFyc2UsIGNvbmZpZykge1xyXG4gIGNvbnN0IHN0YXRpY1BhcnRzID0gW11cclxuICBjb25zdCBpbnNlcnRpb25Qb2ludHMgPSBbXVxyXG5cclxuICBsZXQgcmVtYWluaW5nVG1wbFN0ciA9IHRtcGwyUGFyc2VcclxuICBsZXQgc3RhcnRJbmRleE9mSVAgPSByZW1haW5pbmdUbXBsU3RyLmluZGV4T2YoY29uZmlnLmRlbGltaXRlci5zdGFydClcclxuICB3aGlsZSAoc3RhcnRJbmRleE9mSVAgPj0gMCkge1xyXG4gICAgaWYgKHJlbWFpbmluZ1RtcGxTdHIuaW5kZXhPZihjb25maWcuZGVsaW1pdGVyLmVuZCwgc3RhcnRJbmRleE9mSVApIDwgMClcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBtaXNzaW5nIGVuZCBkZWxpbWl0ZXIgYXQ6ICcke3JlbWFpbmluZ1RtcGxTdHJ9J2ApXHJcblxyXG4gICAgc3RhdGljUGFydHMucHVzaChyZW1haW5pbmdUbXBsU3RyLnN1YnN0cmluZygwLCBzdGFydEluZGV4T2ZJUCkpXHJcblxyXG4gICAgY29uc3QgaVBUcmFuc2Zvcm1SZXN1bHQgPSB0cmFuc2Zvcm1JUChcclxuICAgICAgcmVtYWluaW5nVG1wbFN0ci5zdWJzdHJpbmcoc3RhcnRJbmRleE9mSVAgKyBjb25maWcuZGVsaW1pdGVyLnN0YXJ0Lmxlbmd0aCksXHJcbiAgICAgIGNvbmZpZ1xyXG4gICAgKVxyXG5cclxuICAgIGlmIChpUFRyYW5zZm9ybVJlc3VsdC5pbnNlcnRpb25Qb2ludCkge1xyXG4gICAgICByZW1haW5pbmdUbXBsU3RyID0gaVBUcmFuc2Zvcm1SZXN1bHQucmVtYWluaW5nVG1wbFN0clxyXG4gICAgICBpbnNlcnRpb25Qb2ludHMucHVzaChpUFRyYW5zZm9ybVJlc3VsdC5pbnNlcnRpb25Qb2ludClcclxuICAgICAgc3RhcnRJbmRleE9mSVAgPSByZW1haW5pbmdUbXBsU3RyLmluZGV4T2YoY29uZmlnLmRlbGltaXRlci5zdGFydClcclxuICAgIH0gZWxzZSB7IC8vIGUuZy4gY29tbWVudCBvciBjdXN0b21EZWxpbWV0ZXJcclxuICAgICAgY29uc3QgbGFzdFN0YXRpY1BhcnQgPSBzdGF0aWNQYXJ0cy5wb3AoKVxyXG4gICAgICByZW1haW5pbmdUbXBsU3RyID0gbGFzdFN0YXRpY1BhcnQgKyBpUFRyYW5zZm9ybVJlc3VsdC5yZW1haW5pbmdUbXBsU3RyXHJcbiAgICAgIHN0YXJ0SW5kZXhPZklQID0gcmVtYWluaW5nVG1wbFN0ci5pbmRleE9mKGNvbmZpZy5kZWxpbWl0ZXIuc3RhcnQsIGxhc3RTdGF0aWNQYXJ0Lmxlbmd0aClcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHN0YXRpY1BhcnRzLnB1c2gocmVtYWluaW5nVG1wbFN0cilcclxuXHJcbiAgcmV0dXJuIGN0eCA9PlxyXG4gICAgY29uZmlnLmh0bWwoc3RhdGljUGFydHMsIC4uLmluc2VydGlvblBvaW50cy5tYXAoaVAgPT4gaVAoY3R4KSkpXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHRyYW5zZm9ybUlQKHJlbWFpbmluZ1RtcGxTdHIsIGNvbmZpZykge1xyXG4gIGNvbnN0IHRyYW5zZm9ybWVyID0gT2JqZWN0LnZhbHVlcyhjb25maWcudHJhbnNmb3JtZXJzKS5maW5kKHQgPT4gdC50ZXN0KHJlbWFpbmluZ1RtcGxTdHIsIGNvbmZpZykpXHJcbiAgY29uc3QgdHJhbnNmb3JtRnVuY3Rpb24gPSB0cmFuc2Zvcm1lclxyXG4gICAgPyB0cmFuc2Zvcm1lci50cmFuc2Zvcm1cclxuICAgIDogY29uZmlnLnRyYW5zZm9ybVZhcmlhYmxlXHJcbiAgcmV0dXJuIHRyYW5zZm9ybUZ1bmN0aW9uKHJlbWFpbmluZ1RtcGxTdHIsIGNvbmZpZylcclxufSIsImV4cG9ydCBmdW5jdGlvbiBjdHgyVmFsdWUoY3R4LCBrZXkpIHtcclxuICBpZiAoa2V5ID09PSAnLicpXHJcbiAgICByZXR1cm4gY3R4XHJcblxyXG4gIGxldCByZXN1bHQgPSBjdHhcclxuICBmb3IgKGxldCBrIG9mIGtleS5zcGxpdCgnLicpKSB7XHJcbiAgICBpZiAoIXJlc3VsdC5oYXNPd25Qcm9wZXJ0eShrKSlcclxuICAgICAgcmV0dXJuICcnXHJcblxyXG4gICAgcmVzdWx0ID0gcmVzdWx0W2tdXHJcbiAgfVxyXG5cclxuICByZXR1cm4gcmVzdWx0XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBjdHgyTXVzdGFjaGVTdHJpbmcoY3R4LCBrZXkpIHtcclxuICByZXR1cm4gbXVzdGFjaGVTdHJpbmd5ZnkoY3R4MlZhbHVlKGN0eCwga2V5KSlcclxufVxyXG5cclxuZnVuY3Rpb24gbXVzdGFjaGVTdHJpbmd5ZnkodmFsdWUpIHtcclxuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gbnVsbClcclxuICAgIHJldHVybiAnJ1xyXG5cclxuICByZXR1cm4gJycgKyB2YWx1ZVxyXG59IiwiaW1wb3J0IHsgY3R4Mk11c3RhY2hlU3RyaW5nIH0gZnJvbSAnLi4vaGVscGVyL2RhdGFIZWxwZXIuanMnXHJcblxyXG5leHBvcnQgZGVmYXVsdCAocmVtYWluaW5nVG1wbFN0ciwgeyBkZWxpbWl0ZXIgfSkgPT4ge1xyXG4gIGNvbnN0IGluZGV4T2ZFbmREZWxpbWl0ZXIgPSByZW1haW5pbmdUbXBsU3RyLmluZGV4T2YoZGVsaW1pdGVyLmVuZClcclxuICBjb25zdCBkYXRhS2V5ID0gcmVtYWluaW5nVG1wbFN0ci5zdWJzdHJpbmcoMCwgaW5kZXhPZkVuZERlbGltaXRlcilcclxuICByZXR1cm4ge1xyXG4gICAgcmVtYWluaW5nVG1wbFN0cjogcmVtYWluaW5nVG1wbFN0ci5zdWJzdHJpbmcoaW5kZXhPZkVuZERlbGltaXRlciArIGRlbGltaXRlci5lbmQubGVuZ3RoKSxcclxuICAgIGluc2VydGlvblBvaW50OiBjdHggPT4gY3R4Mk11c3RhY2hlU3RyaW5nKGN0eCwgZGF0YUtleSlcclxuICB9XHJcbn0iLCJpbXBvcnQgeyBjdHgyTXVzdGFjaGVTdHJpbmcgfSBmcm9tICcuLi9oZWxwZXIvZGF0YUhlbHBlci5qcydcclxuXHJcbi8qKiBOb3RlLCB0aGlzIGlzIHVuc2FmZSB0byB1c2UsIGJlY2F1c2UgdGhlIHJlbmRlcmVkIG91dHB1dCBjb3VsZCBiZSBhbnkgSmF2YVNjcmlwdCEgKi9cclxuZXhwb3J0IGRlZmF1bHQgdW5zYWZlSFRNTCA9PiAoe1xyXG4gIHRlc3Q6IHJlbWFpbmluZ1RtcGxTdHIgPT4gcmVtYWluaW5nVG1wbFN0clswXSA9PT0gJ3snLFxyXG4gIHRyYW5zZm9ybTogKHJlbWFpbmluZ1RtcGxTdHIsIHsgZGVsaW1pdGVyIH0pID0+IHtcclxuICAgIGNvbnN0IGluZGV4T2ZFbmREZWxpbWl0ZXIgPSByZW1haW5pbmdUbXBsU3RyLmluZGV4T2YoJ30nICsgZGVsaW1pdGVyLmVuZClcclxuICAgIGlmIChpbmRleE9mRW5kRGVsaW1pdGVyIDwgMClcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBtaXNzaW5nIGVuZCBkZWxpbWl0ZXIgYXQ6ICcke2RlbGltaXRlci5zdGFydH0ke3JlbWFpbmluZ1RtcGxTdHJ9J2ApXHJcbiAgXHJcbiAgICBjb25zdCBkYXRhS2V5ID0gcmVtYWluaW5nVG1wbFN0ci5zdWJzdHJpbmcoMSwgaW5kZXhPZkVuZERlbGltaXRlcilcclxuICAgIHJldHVybiB7XHJcbiAgICAgIHJlbWFpbmluZ1RtcGxTdHI6IHJlbWFpbmluZ1RtcGxTdHIuc3Vic3RyaW5nKGluZGV4T2ZFbmREZWxpbWl0ZXIgKyAxICsgZGVsaW1pdGVyLmVuZC5sZW5ndGgpLFxyXG4gICAgICBpbnNlcnRpb25Qb2ludDogY3R4ID0+IHVuc2FmZUhUTUwoY3R4Mk11c3RhY2hlU3RyaW5nKGN0eCwgZGF0YUtleSkpLFxyXG4gICAgfVxyXG4gIH1cclxufSkiLCJleHBvcnQgZnVuY3Rpb24gaXNNdXN0YWNoZUZhbHN5KHZhbHVlKSB7XHJcbiAgcmV0dXJuIFtudWxsLCB1bmRlZmluZWQsIGZhbHNlLCAwLCBOYU4sICcnXVxyXG4gICAgLnNvbWUoZmFsc3kgPT4gZmFsc3kgPT09IHZhbHVlKVxyXG4gICAgfHwgKHZhbHVlLmxlbmd0aCAmJiB2YWx1ZS5sZW5ndGggPT09IDApXHJcbn0iLCJleHBvcnQgZnVuY3Rpb24gcGFyc2VTZWN0aW9uKHRtcGxTdHIsIGRlbGltaXRlcikge1xyXG4gIGNvbnN0IGluZGV4T2ZTdGFydFRhZ0VuZCA9IHRtcGxTdHIuaW5kZXhPZihkZWxpbWl0ZXIuZW5kKVxyXG4gIGNvbnN0IGRhdGFLZXkgPSB0bXBsU3RyLnN1YnN0cmluZygxLCBpbmRleE9mU3RhcnRUYWdFbmQpXHJcbiAgY29uc3QgZW5kVGFnID0gYCR7ZGVsaW1pdGVyLnN0YXJ0fS8ke2RhdGFLZXl9JHtkZWxpbWl0ZXIuZW5kfWBcclxuICBjb25zdCBpbmRleE9mRW5kVGFnU3RhcnQgPSB0bXBsU3RyLmluZGV4T2YoZW5kVGFnKVxyXG4gIGlmIChpbmRleE9mRW5kVGFnU3RhcnQgPCAwKVxyXG4gICAgdGhyb3cgbmV3IEVycm9yKGBtaXNzaW5nIGVuZCBkZWxpbWl0ZXIgYXQ6ICcke2RlbGltaXRlci5zdGFydH0ke3RtcGxTdHJ9J2ApXHJcbiAgXHJcbiAgcmV0dXJuIHtcclxuICAgIGRhdGFLZXksXHJcbiAgICBpbm5lclRtcGw6IHRtcGxTdHIuc3Vic3RyaW5nKGluZGV4T2ZTdGFydFRhZ0VuZCArIGRlbGltaXRlci5zdGFydC5sZW5ndGgsIGluZGV4T2ZFbmRUYWdTdGFydCksXHJcbiAgICByZW1haW5pbmdUbXBsU3RyOiB0bXBsU3RyLnN1YnN0cmluZyhpbmRleE9mRW5kVGFnU3RhcnQgKyBlbmRUYWcubGVuZ3RoKSxcclxuICB9XHJcbn0iLCJpbXBvcnQgeyB0cmFuc2Zvcm0gfSBmcm9tICcuLi9saXQtdHJhbnNmb3JtZXIuanMnXHJcbmltcG9ydCB7IGN0eDJWYWx1ZSB9IGZyb20gJy4uL2hlbHBlci9kYXRhSGVscGVyLmpzJ1xyXG5pbXBvcnQgeyBpc011c3RhY2hlRmFsc3kgfSBmcm9tICcuLi9oZWxwZXIvaXNNdXN0YWNoZUZhbHN5LmpzJ1xyXG5pbXBvcnQgeyBwYXJzZVNlY3Rpb24gfSBmcm9tICcuLi9oZWxwZXIvc2VjdGlvbkhlbHBlci5qcydcclxuXHJcbi8qKiBOb3RlLCB1bmxpa2Ugd2l0aGluIG11c3RhY2hlIGZ1bmN0aW9ucyBhcyBkYXRhIHZhbHVlcyBhcmUgbm90IHN1cHBvcnRlZCBvdXQgb2YgdGhlIGJveCAqL1xyXG5leHBvcnQgZGVmYXVsdCAoKSA9PiAoe1xyXG4gIHRlc3Q6IHJlbWFpbmluZ1RtcGxTdHIgPT4gcmVtYWluaW5nVG1wbFN0clswXSA9PT0gJyMnLFxyXG4gIHRyYW5zZm9ybTogKHJlbWFpbmluZ1RtcGxTdHIsIGNvbmZpZykgPT4ge1xyXG4gICAgY29uc3QgcGFyc2VkU2VjdGlvbiA9IHBhcnNlU2VjdGlvbihyZW1haW5pbmdUbXBsU3RyLCBjb25maWcuZGVsaW1pdGVyKVxyXG4gICAgY29uc3QgdHJhbnNmb3JtZWRJbm5lclRtcGwgPSB0cmFuc2Zvcm0ocGFyc2VkU2VjdGlvbi5pbm5lclRtcGwsIGNvbmZpZylcclxuICAgIFxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgcmVtYWluaW5nVG1wbFN0cjogcGFyc2VkU2VjdGlvbi5yZW1haW5pbmdUbXBsU3RyLFxyXG4gICAgICBpbnNlcnRpb25Qb2ludDogY3R4ID0+IHtcclxuICAgICAgICBjb25zdCBzZWN0aW9uRGF0YSA9IGN0eDJWYWx1ZShjdHgsIHBhcnNlZFNlY3Rpb24uZGF0YUtleSlcclxuICAgICAgICBcclxuICAgICAgICBpZiAoaXNNdXN0YWNoZUZhbHN5KHNlY3Rpb25EYXRhKSlcclxuICAgICAgICAgIHJldHVybiAnJztcclxuXHJcbiAgICAgICAgcmV0dXJuIHNlY3Rpb25EYXRhLm1hcFxyXG4gICAgICAgICAgPyBzZWN0aW9uRGF0YS5tYXAoaW5uZXJDdHggPT4gdHJhbnNmb3JtZWRJbm5lclRtcGwoaW5uZXJDdHgpKVxyXG4gICAgICAgICAgOiB0cmFuc2Zvcm1lZElubmVyVG1wbChjdHgpXHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcbn0pIiwiaW1wb3J0IHsgY3R4MlZhbHVlIH0gZnJvbSAnLi4vaGVscGVyL2RhdGFIZWxwZXIuanMnXHJcbmltcG9ydCB7IGlzTXVzdGFjaGVGYWxzeSB9IGZyb20gJy4uL2hlbHBlci9pc011c3RhY2hlRmFsc3kuanMnXHJcbmltcG9ydCB7IHBhcnNlU2VjdGlvbiB9IGZyb20gJy4uL2hlbHBlci9zZWN0aW9uSGVscGVyLmpzJ1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgKCkgPT4gKHtcclxuICB0ZXN0OiByZW1haW5pbmdUbXBsU3RyID0+IHJlbWFpbmluZ1RtcGxTdHJbMF0gPT09ICdeJyxcclxuICB0cmFuc2Zvcm06IChyZW1haW5pbmdUbXBsU3RyLCB7IGRlbGltaXRlciB9KSA9PiB7XHJcbiAgICBjb25zdCBwYXJzZWRTZWN0aW9uID0gcGFyc2VTZWN0aW9uKHJlbWFpbmluZ1RtcGxTdHIsIGRlbGltaXRlcilcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICByZW1haW5pbmdUbXBsU3RyOiBwYXJzZWRTZWN0aW9uLnJlbWFpbmluZ1RtcGxTdHIsXHJcbiAgICAgIGluc2VydGlvblBvaW50OiBjdHggPT5cclxuICAgICAgICBpc011c3RhY2hlRmFsc3koY3R4MlZhbHVlKGN0eCwgcGFyc2VkU2VjdGlvbi5kYXRhS2V5KSlcclxuICAgICAgICAgID8gcGFyc2VkU2VjdGlvbi5pbm5lclRtcGxcclxuICAgICAgICAgIDogJycsXHJcbiAgICB9XHJcbiAgfVxyXG59KSIsImV4cG9ydCBkZWZhdWx0ICgpID0+ICh7XHJcbiAgdGVzdDogcmVtYWluaW5nVG1wbFN0ciA9PiByZW1haW5pbmdUbXBsU3RyWzBdID09PSAnIScsXHJcbiAgdHJhbnNmb3JtOiAocmVtYWluaW5nVG1wbFN0ciwgeyBkZWxpbWl0ZXIgfSkgPT4gKHtcclxuICAgIHJlbWFpbmluZ1RtcGxTdHI6IHJlbWFpbmluZ1RtcGxTdHIuc3Vic3RyaW5nKHJlbWFpbmluZ1RtcGxTdHIuaW5kZXhPZihkZWxpbWl0ZXIuZW5kKSArIGRlbGltaXRlci5lbmQubGVuZ3RoKSxcclxuICAgIGluc2VydGlvblBvaW50OiB1bmRlZmluZWQsXHJcbiAgfSlcclxufSkiLCJleHBvcnQgZGVmYXVsdCAoKSA9PiAoe1xyXG4gIHRlc3Q6IHJlbWFpbmluZ1RtcGxTdHIgPT4gcmVtYWluaW5nVG1wbFN0clswXSA9PT0gJz0nLFxyXG4gIHRyYW5zZm9ybTogKHJlbWFpbmluZ1RtcGxTdHIsIGNvbmZpZykgPT4ge1xyXG4gICAgY29uc3Qgb3JpZ2luYWxFbmREZWxpTGVuZ3RoID0gY29uZmlnLmRlbGltaXRlci5lbmQubGVuZ3RoXHJcbiAgICBjb25zdCBpbmRleE9mRW5kVGFnID0gcmVtYWluaW5nVG1wbFN0ci5pbmRleE9mKCc9JyArIGNvbmZpZy5kZWxpbWl0ZXIuZW5kKVxyXG4gICAgaWYgKGluZGV4T2ZFbmRUYWcgPCAwIClcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBtaXNzaW5nIGVuZCBkZWxpbWl0ZXIgYXQ6ICcke3JlbWFpbmluZ1RtcGxTdHJ9J2ApXHJcblxyXG4gICAgY29uc3QgWyBuZXdTdGFydERlbGksIG5ld0VuZERlbGkgXSA9IHJlbWFpbmluZ1RtcGxTdHIuc3Vic3RyaW5nKDEsIGluZGV4T2ZFbmRUYWcpLnNwbGl0KCcgJylcclxuXHJcbiAgICBjb25maWcuZGVsaW1pdGVyLnN0YXJ0ID0gbmV3U3RhcnREZWxpXHJcbiAgICBjb25maWcuZGVsaW1pdGVyLmVuZCA9IG5ld0VuZERlbGlcclxuICAgIFxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgcmVtYWluaW5nVG1wbFN0cjogcmVtYWluaW5nVG1wbFN0ci5zdWJzdHJpbmcoaW5kZXhPZkVuZFRhZyArIDEgKyBvcmlnaW5hbEVuZERlbGlMZW5ndGgpLFxyXG4gICAgICBpbnNlcnRpb25Qb2ludDogdW5kZWZpbmVkLCAgXHJcbiAgICB9XHJcbiAgfVxyXG59KSIsImltcG9ydCBjcmVhdGVUcmFuc2Zvcm0gZnJvbSAnLi9saXQtdHJhbnNmb3JtZXIuanMnXHJcbmltcG9ydCB0cmFuc2Zvcm1WYXJpYWJsZSBmcm9tICcuL3RyYW5zZm9ybWVycy92YXJpYWJsZVRyYW5zZm9ybWVyLmpzJ1xyXG5pbXBvcnQgdW5zYWZlVmFyaWFibGVUcmFuc2Zvcm1lciBmcm9tICcuL3RyYW5zZm9ybWVycy91bnNhZmVWYXJpYWJsZS5qcydcclxuaW1wb3J0IHNlY3Rpb25UcmFuc2Zvcm1lciBmcm9tICcuL3RyYW5zZm9ybWVycy9zZWN0aW9uLmpzJ1xyXG5pbXBvcnQgaW52ZXJ0ZWRTZWN0aW9uVHJhbnNmb3JtZXIgZnJvbSAnLi90cmFuc2Zvcm1lcnMvaW52ZXJ0ZWRTZWN0aW9uLmpzJ1xyXG5pbXBvcnQgY29tbWVudFRyYW5zZm9ybWVyIGZyb20gJy4vdHJhbnNmb3JtZXJzL2NvbW1lbnQuanMnXHJcbmltcG9ydCBjdXN0b21EZWxpbWl0ZXJUcmFuc2Zvcm1lciBmcm9tICcuL3RyYW5zZm9ybWVycy9jdXN0b21EZWxpbWl0ZXIuanMnXHJcblxyXG5leHBvcnQgZGVmYXVsdCAoaHRtbCwgdW5zYWZlSFRNTCkgPT5cclxuICBjcmVhdGVUcmFuc2Zvcm0oe1xyXG4gICAgaHRtbCxcclxuICAgIGRlbGltaXRlcjogeyBzdGFydDogJ3t7JywgZW5kOiAnfX0nIH0sXHJcbiAgICB0cmFuc2Zvcm1WYXJpYWJsZSxcclxuICAgIHRyYW5zZm9ybWVyczoge1xyXG4gICAgICB1bnNhZmVWYXJpYWJsZTogdW5zYWZlVmFyaWFibGVUcmFuc2Zvcm1lcih1bnNhZmVIVE1MKSxcclxuICAgICAgc2VjdGlvbjogc2VjdGlvblRyYW5zZm9ybWVyKCksXHJcbiAgICAgIGludmVydGVkU2VjdGlvbjogaW52ZXJ0ZWRTZWN0aW9uVHJhbnNmb3JtZXIoKSxcclxuICAgICAgY29tbWVudDogY29tbWVudFRyYW5zZm9ybWVyKCksXHJcbiAgICAgIGN1c3RvbURlbGltaXRlclRyYW5zZm9ybWVyOiBjdXN0b21EZWxpbWl0ZXJUcmFuc2Zvcm1lcigpLFxyXG4gICAgfSxcclxuICB9KSIsImltcG9ydCB0eXBlIHsgVGVtcGxhdGVCcmlkZ2VFbmRpbmUsIFRlbXBsYXRlVHJhbnNmb3JtZXIgfSBmcm9tICdAYnJpZGdlL2ludGVyZmFjZXMnO1xuaW1wb3J0IHR5cGUge1xuICAgIE11c3RhY2hlVHJhbnNmb3JtZXIsXG4gICAgVGVtcGxhdGVUYWcsXG4gICAgVHJhbnNmb3JtRGlyZWN0aXZlLFxuICAgIFRyYW5zZm9ybVRlc3RlcixcbiAgICBUcmFuc2Zvcm1FeGVjdXRvcixcbiAgICBUcmFuc2Zvcm1lQ29udGV4dCxcbiAgICBUcmFuc2Zvcm1Db25maWcsXG59IGZyb20gJ2xpdC10cmFuc2Zvcm1lci9zcmMvaW50ZXJmYWNlcyc7XG5cbmltcG9ydCBjcmVhdGVEZWZhdWx0IGZyb20gJ2xpdC10cmFuc2Zvcm1lcic7XG5pbXBvcnQgY3JlYXRlQ3VzdG9tIGZyb20gJ2xpdC10cmFuc2Zvcm1lci9zcmMvbGl0LXRyYW5zZm9ybWVyJztcblxuaW1wb3J0IHZhcmlhYmxlIGZyb20gJ2xpdC10cmFuc2Zvcm1lci9zcmMvdHJhbnNmb3JtZXJzL3ZhcmlhYmxlVHJhbnNmb3JtZXInO1xuaW1wb3J0IHVuc2FmZVZhcmlhYmxlIGZyb20gJ2xpdC10cmFuc2Zvcm1lci9zcmMvdHJhbnNmb3JtZXJzL3Vuc2FmZVZhcmlhYmxlJztcbmltcG9ydCBzZWN0aW9uIGZyb20gJ2xpdC10cmFuc2Zvcm1lci9zcmMvdHJhbnNmb3JtZXJzL3NlY3Rpb24nO1xuaW1wb3J0IGludmVydGVkU2VjdGlvbiBmcm9tICdsaXQtdHJhbnNmb3JtZXIvc3JjL3RyYW5zZm9ybWVycy9pbnZlcnRlZFNlY3Rpb24nO1xuaW1wb3J0IGNvbW1lbnQgZnJvbSAnbGl0LXRyYW5zZm9ybWVyL3NyYy90cmFuc2Zvcm1lcnMvY29tbWVudCc7XG5pbXBvcnQgY3VzdG9tRGVsaW1pdGVyIGZyb20gJ2xpdC10cmFuc2Zvcm1lci9zcmMvdHJhbnNmb3JtZXJzL2N1c3RvbURlbGltaXRlcic7XG5cbmNvbnN0IHhmb3JtID0gKG11c3RhY2hlOiBNdXN0YWNoZVRyYW5zZm9ybWVyKTogVGVtcGxhdGVUcmFuc2Zvcm1lciA9PiB7XG4gICAgcmV0dXJuICh0ZW1wbGF0ZTogSFRNTFRlbXBsYXRlRWxlbWVudCB8IHN0cmluZyk6IFRlbXBsYXRlQnJpZGdlRW5kaW5lID0+IHtcbiAgICAgICAgcmV0dXJuIG11c3RhY2hlKHRlbXBsYXRlIGluc3RhbmNlb2YgSFRNTFRlbXBsYXRlRWxlbWVudCA/IHRlbXBsYXRlLmlubmVySFRNTCA6IHRlbXBsYXRlKTtcbiAgICB9O1xufTtcblxuZnVuY3Rpb24gY3JlYXRlTXVzdGFjaGVUcmFuc2Zvcm1lcihodG1sOiBUZW1wbGF0ZVRhZywgdW5zYWZlSFRNTDogVHJhbnNmb3JtRGlyZWN0aXZlKTogVGVtcGxhdGVUcmFuc2Zvcm1lcjtcbmZ1bmN0aW9uIGNyZWF0ZU11c3RhY2hlVHJhbnNmb3JtZXIoY29uZmlnOiBUcmFuc2Zvcm1Db25maWcpOiBUZW1wbGF0ZVRyYW5zZm9ybWVyO1xuZnVuY3Rpb24gY3JlYXRlTXVzdGFjaGVUcmFuc2Zvcm1lcihhcmcxOiB1bmtub3duLCBhcmcyPzogdW5rbm93bik6IFRlbXBsYXRlVHJhbnNmb3JtZXIge1xuICAgIGlmICgnZnVuY3Rpb24nID09PSB0eXBlb2YgYXJnMSkge1xuICAgICAgICByZXR1cm4geGZvcm0oY3JlYXRlRGVmYXVsdChhcmcxIGFzIFRlbXBsYXRlVGFnLCBhcmcyIGFzIFRyYW5zZm9ybURpcmVjdGl2ZSkpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB4Zm9ybShcbiAgICAgICAgICAgIGNyZWF0ZUN1c3RvbShPYmplY3QuYXNzaWduKHtcbiAgICAgICAgICAgICAgICBkZWxpbWl0ZXI6IHsgc3RhcnQ6ICd7eycsIGVuZDogJ319JyB9LFxuICAgICAgICAgICAgICAgIHRyYW5zZm9ybWVyczoge30sXG4gICAgICAgICAgICB9LCBhcmcxKSBhcyBUcmFuc2Zvcm1Db25maWcpXG4gICAgICAgICk7XG4gICAgfVxufVxuXG5jb25zdCB0cmFuc2Zvcm1lcjoge1xuICAgIHZhcmlhYmxlOiBUcmFuc2Zvcm1FeGVjdXRvcjtcbiAgICB1bnNhZmVWYXJpYWJsZTogKHVuc2FmZUhUTUw6IFRyYW5zZm9ybURpcmVjdGl2ZSkgPT4gVHJhbnNmb3JtZUNvbnRleHQ7XG4gICAgc2VjdGlvbjogKCkgPT4gVHJhbnNmb3JtZUNvbnRleHQ7XG4gICAgaW52ZXJ0ZWRTZWN0aW9uOiAoKSA9PiBUcmFuc2Zvcm1lQ29udGV4dDtcbiAgICBjb21tZW50OiAoKSA9PiBUcmFuc2Zvcm1lQ29udGV4dDtcbiAgICBjdXN0b21EZWxpbWl0ZXI6ICgpID0+IFRyYW5zZm9ybWVDb250ZXh0O1xufSA9IHtcbiAgICB2YXJpYWJsZSxcbiAgICB1bnNhZmVWYXJpYWJsZSxcbiAgICBzZWN0aW9uLFxuICAgIGludmVydGVkU2VjdGlvbixcbiAgICBjb21tZW50LFxuICAgIGN1c3RvbURlbGltaXRlcixcbn07XG5cbmV4cG9ydCB7XG4gICAgVGVtcGxhdGVUYWcsXG4gICAgVHJhbnNmb3JtRGlyZWN0aXZlLFxuICAgIFRlbXBsYXRlVHJhbnNmb3JtZXIsXG4gICAgVHJhbnNmb3JtVGVzdGVyLFxuICAgIFRyYW5zZm9ybUV4ZWN1dG9yLFxuICAgIFRyYW5zZm9ybWVDb250ZXh0LFxuICAgIFRyYW5zZm9ybUNvbmZpZyxcbiAgICBjcmVhdGVNdXN0YWNoZVRyYW5zZm9ybWVyLFxuICAgIHRyYW5zZm9ybWVyLFxufTtcbiIsbnVsbCxudWxsLG51bGwsbnVsbCxudWxsLCJpbXBvcnQgdHlwZSB7XG4gICAgVGVtcGxhdGVCcmlkZ2VBcmcsXG4gICAgVGVtcGxhdGVUcmFuc2Zvcm1lcixcbn0gZnJvbSAnQGJyaWRnZS9pbnRlcmZhY2VzJztcbmltcG9ydCB7XG4gICAgVGVtcGxhdGVIYW5kbGVyLFxuICAgIFRlbXBsYXRlSGFuZGxlcnMsXG4gICAgVGVtcGxhdGVSZW5kZXJlcnMsXG4gICAgRXZhbHVhdGVUZW1wbGF0ZVJlc3VsdCxcbiAgICBwcmVwYXJlVGVtcGxhdGUsXG4gICAgZXZhbHVhdGVUZW1wbGF0ZSxcbn0gZnJvbSAnc3RhbXBpbm8nO1xuXG5leHBvcnQgaW50ZXJmYWNlIENyZWF0ZVN0YW1waW5vVGVtcGxhdGVPcHRpb25zIHtcbiAgICBoYW5kbGVycz86IFRlbXBsYXRlSGFuZGxlcnM7XG4gICAgcmVuZGVyZXJzPzogVGVtcGxhdGVSZW5kZXJlcnM7XG4gICAgc3VwZXJUZW1wbGF0ZT86IEhUTUxUZW1wbGF0ZUVsZW1lbnQgfCB1bmRlZmluZWQ7XG59XG5cbmZ1bmN0aW9uIGVuc3VyZSh0ZW1wbGF0ZTogSFRNTFRlbXBsYXRlRWxlbWVudCB8IHN0cmluZyk6IEhUTUxUZW1wbGF0ZUVsZW1lbnQge1xuICAgIGlmICh0ZW1wbGF0ZSBpbnN0YW5jZW9mIEhUTUxUZW1wbGF0ZUVsZW1lbnQpIHtcbiAgICAgICAgcmV0dXJuIHRlbXBsYXRlO1xuICAgIH0gZWxzZSBpZiAoJ3N0cmluZycgPT09IHR5cGVvZiB0ZW1wbGF0ZSkge1xuICAgICAgICBjb25zdCBlbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndGVtcGxhdGUnKTtcbiAgICAgICAgZWxlbWVudC5pbm5lckhUTUwgPSB0ZW1wbGF0ZTtcbiAgICAgICAgcmV0dXJuIGVsZW1lbnQ7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgVHlwZSBvZiB0ZW1wbGF0ZSBpcyBub3QgYSB2YWxpZC4gW3R5cGVvZjogJHt0eXBlb2YgdGVtcGxhdGV9XWApO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gY3JlYXRlU3RhbXBpbm9UcmFuc2Zvcm1lcihvcHRpb25zPzogQ3JlYXRlU3RhbXBpbm9UZW1wbGF0ZU9wdGlvbnMpOiBUZW1wbGF0ZVRyYW5zZm9ybWVyIHtcbiAgICBjb25zdCB7IGhhbmRsZXJzLCByZW5kZXJlcnMsIHN1cGVyVGVtcGxhdGUgfSA9IG9wdGlvbnMgfHwge307XG4gICAgcmV0dXJuICh0ZW1wbGF0ZTogSFRNTFRlbXBsYXRlRWxlbWVudCB8IHN0cmluZykgPT4ge1xuICAgICAgICByZXR1cm4gcHJlcGFyZVRlbXBsYXRlKGVuc3VyZSh0ZW1wbGF0ZSksIGhhbmRsZXJzLCByZW5kZXJlcnMsIHN1cGVyVGVtcGxhdGUpO1xuICAgIH07XG59XG5cbmV4cG9ydCB7XG4gICAgVGVtcGxhdGVCcmlkZ2VBcmcsXG4gICAgVGVtcGxhdGVIYW5kbGVyLFxuICAgIFRlbXBsYXRlSGFuZGxlcnMsXG4gICAgVGVtcGxhdGVSZW5kZXJlcnMsXG4gICAgRXZhbHVhdGVUZW1wbGF0ZVJlc3VsdCxcbiAgICBjcmVhdGVTdGFtcGlub1RyYW5zZm9ybWVyLFxuICAgIHByZXBhcmVUZW1wbGF0ZSxcbiAgICBldmFsdWF0ZVRlbXBsYXRlLFxufTtcbiJdLCJuYW1lcyI6WyJjcmVhdGVUcmFuc2Zvcm0iLCJ0cmFuc2Zvcm1WYXJpYWJsZSIsInVuc2FmZVZhcmlhYmxlVHJhbnNmb3JtZXIiLCJzZWN0aW9uVHJhbnNmb3JtZXIiLCJpbnZlcnRlZFNlY3Rpb25UcmFuc2Zvcm1lciIsImNvbW1lbnRUcmFuc2Zvcm1lciIsImN1c3RvbURlbGltaXRlclRyYW5zZm9ybWVyIiwiX86jIiwibm90aGluZyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7RUFBQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0FBQ0EsdUJBQWUsTUFBTSxJQUFJLFdBQVcsSUFBSSxTQUFTLENBQUMsV0FBVyxFQUFFLE1BQU0sRUFBQztBQUN0RTtFQUNPLFNBQVMsU0FBUyxDQUFDLFVBQVUsRUFBRSxNQUFNLEVBQUU7RUFDOUMsRUFBRSxNQUFNLFdBQVcsR0FBRyxHQUFFO0VBQ3hCLEVBQUUsTUFBTSxlQUFlLEdBQUcsR0FBRTtBQUM1QjtFQUNBLEVBQUUsSUFBSSxnQkFBZ0IsR0FBRyxXQUFVO0VBQ25DLEVBQUUsSUFBSSxjQUFjLEdBQUcsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFDO0VBQ3ZFLEVBQUUsT0FBTyxjQUFjLElBQUksQ0FBQyxFQUFFO0VBQzlCLElBQUksSUFBSSxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FBQztFQUMxRSxNQUFNLE1BQU0sSUFBSSxLQUFLLENBQUMsQ0FBQywyQkFBMkIsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN4RTtFQUNBLElBQUksV0FBVyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLGNBQWMsQ0FBQyxFQUFDO0FBQ25FO0VBQ0EsSUFBSSxNQUFNLGlCQUFpQixHQUFHLFdBQVc7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QUM7a0JBQ3ZELFdBQVcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDO3NCQUNyQixJQUFJLEVBQUUsQ0FBQztzQkFDUCxLQUFLLEVBQUUsRUFBRSxTQUFTO3NCQUNsQixNQUFNLEVBQUUsQ0FBQyxLQUFjLEVBQUUsU0FBMkIsS0FDbEQsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFjLENBQUM7bUJBQ2hDLENBQUMsQ0FBQztrQkFDSCxNQUFNLFdBQVcsR0FBRyxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztrQkFDbkUsUUFBUSxDQUFDLFVBQVcsQ0FBQyxZQUFZLENBQUMsV0FBVyxFQUFFLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQztrQkFDckUsUUFBUSxDQUFDLFVBQVcsQ0FBQyxZQUFZLENBQy9CLFFBQVEsQ0FBQyxhQUFhLENBQUMsRUFBRSxDQUFDLEVBQzFCLFFBQVEsQ0FBQyxXQUFXLENBQ3JCLENBQUM7Ozs7O2tCQUtGLE1BQU0sQ0FBQyxXQUFXLEdBQUcsV0FBVyxDQUFDO2VBQ2xDO1dBQ0Y7T0FDRjtNQUNELEtBQUssTUFBTSxDQUFDLElBQUksZ0JBQWdCLEVBQUU7VUFDaEMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDO09BQ1o7TUFDRCxPQUFPLFdBQVcsQ0FBQztFQUNyQixDQUFDOztFQ2pjRCxTQUFTLE1BQU0sQ0FBQyxRQUFzQztNQUNsRCxJQUFJLFFBQVEsWUFBWSxtQkFBbUIsRUFBRTtVQUN6QyxPQUFPLFFBQVEsQ0FBQztPQUNuQjtXQUFNLElBQUksUUFBUSxLQUFLLE9BQU8sUUFBUSxFQUFFO1VBQ3JDLE1BQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLENBQUM7VUFDbkQsT0FBTyxDQUFDLFNBQVMsR0FBRyxRQUFRLENBQUM7VUFDN0IsT0FBTyxPQUFPLENBQUM7T0FDbEI7V0FBTTtVQUNILE1BQU0sSUFBSSxTQUFTLENBQUMsNkNBQTZDLE9BQU8sUUFBUSxHQUFHLENBQUMsQ0FBQztPQUN4RjtFQUNMLENBQUM7RUFFRCxTQUFTLHlCQUF5QixDQUFDLE9BQXVDO01BQ3RFLE1BQU0sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLGFBQWEsRUFBRSxHQUFHLE9BQU8sSUFBSSxFQUFFLENBQUM7TUFDN0QsT0FBTyxDQUFDLFFBQXNDO1VBQzFDLE9BQU8sZUFBZSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLGFBQWEsQ0FBQyxDQUFDO09BQ2hGLENBQUM7RUFDTjs7Ozs7Ozs7Ozs7Ozs7Iiwic291cmNlUm9vdCI6ImNkcDovLy9AY2RwL2V4dGVuc2lvbi10ZW1wbGF0ZS1icmlkZ2UvIn0=
