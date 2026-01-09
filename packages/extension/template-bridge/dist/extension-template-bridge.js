/*!
 * @cdp/extension-template-bridge 0.9.21
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
          const { start, end } = mustache.delimiter;
          // コメントブロック内の delimiter 抽出
          const regCommentRemoveStart = new RegExp(`<!--\\s*${start}`, 'g');
          const regCommentRemoveEnd = new RegExp(`${end}\\s*-->`, 'g');
          // delimiter 前後の trim 用正規表現
          const regTrim = new RegExp(`(${start}[#^/]?)\\s*([\\w\\.]+)\\s*(${end})`, 'g');
          const body = (template instanceof HTMLTemplateElement ? template.innerHTML : template)
              .replace(regCommentRemoveStart, start)
              .replace(regCommentRemoveEnd, end)
              .replace(regTrim, '$1$2$3');
          return mustache(body);
      };
  };
  /*
   * lit-html v2.1.0+
   * TemplateStringsArray を厳密にチェックするようになったため patch をあてる
   * https://github.com/lit/lit/pull/2307
   *
   * 将来 `Array.isTemplateObject()` を使用される場合, 本対応も見直す必要あり
   * https://tc39.es/proposal-array-is-template-object/
   */
  const patch = (html) => {
      return (template, ...values) => {
          return html(extensionTemplate.toTemplateStringsArray(template), ...values);
      };
  };
  function createMustacheTransformer(arg1, arg2) {
      const delimiter = { start: '{{', end: '}}' };
      let transformer;
      if ('function' === typeof arg1) {
          transformer = createDefault(patch(arg1), arg2);
          transformer.delimiter = delimiter;
      }
      else {
          const { html } = arg1;
          const config = Object.assign({
              delimiter,
              transformers: {},
          }, arg1, { html: patch(html) });
          transformer = createCustom(config);
          transformer.delimiter = config.delimiter;
      }
      return xform(transformer);
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
      '=',
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
      Kind[Kind["ARROW"] = 11] = "ARROW";
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
      ((ch &= -33), 65 /* A */ <= ch && ch <= 90); /* Z */
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
      _input;
      _index = -1;
      _tokenStart = 0;
      _next;
      constructor(input) {
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
              if (op === '=>') {
                  this._advance();
                  return token(Kind.ARROW, op);
              }
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
      _kind;
      _tokenizer;
      _ast;
      _token;
      _value;
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
              throw new Error(`Expected kind ${kind} (${value}), was ${this._token?.kind} (${this._token?.value})`);
          }
          const t = this._tokenizer.nextToken();
          this._token = t;
          this._kind = t?.kind;
          this._value = t?.value;
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
                      return this._parseParenOrFunction();
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
              if (this._matches(Kind.STRING) || this._matches(Kind.IDENTIFIER)) {
                  this._advance();
              }
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
      _parseParenOrFunction() {
          const expressions = this._parseArguments();
          if (this._matches(Kind.ARROW)) {
              this._advance();
              const body = this._parseExpression();
              const params = expressions?.map((e) => e.value) ?? [];
              return this._ast.arrowFunction(params, body);
          }
          else {
              return this._ast.paren(expressions[0]);
          }
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
      '??': (a, b) => a ?? b,
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
                  return scope?.[this.value];
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
                  if (this.operator === '=') {
                      if (this.left.type !== 'ID' &&
                          this.left.type !== 'Getter' &&
                          this.left.type !== 'Index') {
                          throw new Error(`Invalid assignment target: ${this.left}`);
                      }
                      const value = this.right.evaluate(scope);
                      let receiver = undefined;
                      let property;
                      if (this.left.type === 'Getter') {
                          receiver = this.left.receiver.evaluate(scope);
                          property = this.left.name;
                      }
                      else if (this.left.type === 'Index') {
                          receiver = this.left.receiver.evaluate(scope);
                          property = this.left.argument.evaluate(scope);
                      }
                      else if (this.left.type === 'ID') {
                          // TODO: the id could be a parameter
                          receiver = scope;
                          property = this.left.value;
                      }
                      return receiver === undefined
                          ? undefined
                          : (receiver[property] = value);
                  }
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
                  return this.receiver.evaluate(scope)?.[this.name];
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
                  const receiver = this.receiver.evaluate(scope);
                  // TODO(justinfagnani): this might be wrong in cases where we're
                  // invoking a top-level function rather than a method. If method is
                  // defined on a nested scope, then we should probably set _this to null.
                  const _this = this.method ? receiver : scope?.['this'] ?? scope;
                  const f = this.method ? receiver?.[method] : receiver;
                  const args = this.arguments ?? [];
                  const argValues = args.map((a) => a?.evaluate(scope));
                  return f?.apply?.(_this, argValues);
              },
              getIds(idents) {
                  this.receiver.getIds(idents);
                  this.arguments?.forEach((a) => a?.getIds(idents));
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
                  return this.receiver.evaluate(scope)?.[this.argument.evaluate(scope)];
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
                  return this.items?.map((a) => a?.evaluate(scope));
              },
              getIds(idents) {
                  this.items?.forEach((i) => i?.getIds(idents));
                  return idents;
              },
          };
      }
      arrowFunction(params, body) {
          return {
              type: 'ArrowFunction',
              params,
              body,
              evaluate(scope) {
                  const params = this.params;
                  const body = this.body;
                  return function (...args) {
                      // TODO: this isn't correct for assignments to variables in outer
                      // scopes
                      // const newScope = Object.create(scope ?? null);
                      const paramsObj = Object.fromEntries(params.map((p, i) => [p, args[i]]));
                      const newScope = new Proxy(scope ?? {}, {
                          set(target, prop, value) {
                              if (paramsObj.hasOwnProperty(prop)) {
                                  paramsObj[prop] = value;
                              }
                              return (target[prop] = value);
                          },
                          get(target, prop) {
                              if (paramsObj.hasOwnProperty(prop)) {
                                  return paramsObj[prop];
                              }
                              return target[prop];
                          },
                      });
                      return body.evaluate(newScope);
                  };
              },
              getIds(idents) {
                  // Only return the _free_ variables in the body. Since arrow function
                  // parameters are the only way to introduce new variable names, we can
                  // assume that any variable in the body that isn't a parameter is free.
                  return this.body
                      .getIds(idents)
                      .filter((id) => !this.params.includes(id));
              },
          };
      }
  }

  const { AttributePart, PropertyPart, BooleanAttributePart, EventPart } = extensionTemplate._$LH;
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
  const bindingRegex = /(?<!\\){{(.*?)(?:(?<!\\)}})/g;
  const hasEscapedBindingMarkers = (s) => /(?:\\{{)|(?:\\}})/g.test(s);
  const unescapeBindingMarkers = (s) => s.replaceAll(/\\{{/g, '{{').replace(/\\}}/g, '}}');
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
              const values = [];
              for (const part of litTemplate.parts) {
                  const value = part.update(itemModel, handlers, renderers);
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
              // template's named blocks
              ...templateRenderers,
              // passed-in renderers
              ...renderers,
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
                  const call = element.getAttribute('call');
                  if (call !== null || type !== null || name !== null) {
                      element.parentNode.insertBefore(document.createComment(''), element);
                      elementsToRemove.push(element);
                      let update;
                      if (call !== null) {
                          // This is a sub-template call, like <template call="foo">
                          const templateName = call.trim();
                          const templateNameIsExpression = templateName.startsWith('{{') && templateName.endsWith('}}');
                          update = (model, handlers, renderers) => {
                              const dataAttr = element.getAttribute('data');
                              const data = dataAttr === null ? undefined : getSingleValue(dataAttr, model);
                              const renderer = templateNameIsExpression
                                  ? getSingleValue(templateName, model)
                                  : renderers[call];
                              return renderer?.(data, handlers, renderers);
                          };
                      }
                      else if (type !== null) {
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
                          type: 2, // text binding
                          index: nodeIndex,
                          update,
                      });
                      // Template with call, type, or name attributes are removed from the
                      // DOM, so they can't have attribute bindings.
                      continue;
                  }
              }
              const attributeNames = element.getAttributeNames();
              for (const attributeName of attributeNames) {
                  const attributeValue = element.getAttribute(attributeName);
                  // TODO: use alternative to negative lookbehind
                  // (but it's so convenient!)
                  const splitValue = attributeValue.split(bindingRegex);
                  if (splitValue.length === 1) {
                      if (hasEscapedBindingMarkers(attributeValue)) {
                          element.setAttribute(attributeName, unescapeBindingMarkers(attributeValue));
                      }
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
                  const strings = [unescapeBindingMarkers(splitValue[0])];
                  const exprs = [];
                  for (let i = 1; i < splitValue.length; i += 2) {
                      const exprText = splitValue[i];
                      exprs.push(parse(exprText, astFactory));
                      strings.push(unescapeBindingMarkers(splitValue[i + 1]));
                  }
                  litTemplate.parts.push({
                      type: 1, // attribute binding
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
          else if (node.nodeType === Node.TEXT_NODE) {
              let textNode = node;
              const text = textNode.textContent;
              const strings = text.split(bindingRegex);
              if (strings.length > 1) {
                  textNode.textContent = unescapeBindingMarkers(strings[0]);
              }
              else if (hasEscapedBindingMarkers(text)) {
                  textNode.textContent = unescapeBindingMarkers(text);
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
                  textNode = newTextNode;
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
      const { handlers, renderers, superTemplate } = options ?? {};
      return (template) => {
          return prepareTemplate(ensure(template), handlers, renderers, superTemplate);
      };
  }

  exports.createMustacheTransformer = createMustacheTransformer;
  exports.createStampinoTransformer = createStampinoTransformer;
  exports.evaluateTemplate = evaluateTemplate;
  exports.prepareTemplate = prepareTemplate;
  exports.transformer = transformer;

  Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uLXRlbXBsYXRlLWJyaWRnZS5qcyIsInNvdXJjZXMiOlsibGl0LXRyYW5zZm9ybWVyL3NyYy9saXQtdHJhbnNmb3JtZXIuanMiLCJsaXQtdHJhbnNmb3JtZXIvc3JjL2hlbHBlci9kYXRhSGVscGVyLmpzIiwibGl0LXRyYW5zZm9ybWVyL3NyYy90cmFuc2Zvcm1lcnMvdmFyaWFibGVUcmFuc2Zvcm1lci5qcyIsImxpdC10cmFuc2Zvcm1lci9zcmMvdHJhbnNmb3JtZXJzL3Vuc2FmZVZhcmlhYmxlLmpzIiwibGl0LXRyYW5zZm9ybWVyL3NyYy9oZWxwZXIvaXNNdXN0YWNoZUZhbHN5LmpzIiwibGl0LXRyYW5zZm9ybWVyL3NyYy9oZWxwZXIvc2VjdGlvbkhlbHBlci5qcyIsImxpdC10cmFuc2Zvcm1lci9zcmMvdHJhbnNmb3JtZXJzL3NlY3Rpb24uanMiLCJsaXQtdHJhbnNmb3JtZXIvc3JjL3RyYW5zZm9ybWVycy9pbnZlcnRlZFNlY3Rpb24uanMiLCJsaXQtdHJhbnNmb3JtZXIvc3JjL3RyYW5zZm9ybWVycy9jb21tZW50LmpzIiwibGl0LXRyYW5zZm9ybWVyL3NyYy90cmFuc2Zvcm1lcnMvY3VzdG9tRGVsaW1pdGVyLmpzIiwibGl0LXRyYW5zZm9ybWVyL3NyYy9saXQtdHJhbnNmb3JtZXItY29uZmlndXJlZE91dE9mVGhlQm94LmpzIiwiYnJpZGdlLW11c3RhY2hlLnRzIiwiamV4cHIvc3JjL2xpYi9jb25zdGFudHMudHMiLCJqZXhwci9zcmMvbGliL3Rva2VuaXplci50cyIsImpleHByL3NyYy9saWIvcGFyc2VyLnRzIiwiamV4cHIvc3JjL2xpYi9ldmFsLnRzIiwic3RhbXBpbm8vc3JjL3N0YW1waW5vLnRzIiwiYnJpZGdlLXN0YW1waW5vLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qKiBcclxuICogQHBhcmFtIHtvYmplY3R9IGNvbmZpZyA9IHtcclxuICogIGh0bWw6IGxpdC1odG1sLmh0bWwsXHJcbiAqICBkZWxpbWl0ZXI6IHsgc3RhcnQ6ICd7eycsIGVuZDogJ319JyB9LFxyXG4gKiAgdHJhbnNmb3JtZXJzOiB7IC8vIG5vdGUgdGhhdCB0cmFuc2Zvcm1WYXJpYWJsZSBpcyBub3QgaGVyZS4gSXQgZ2V0cyBhcHBsaWVkIHdoZW4gbm8gdHJhbnNmb3JtZXIudGVzdCBoYXMgcGFzc2VkXHJcbiAqICAgIG5hbWU6IHtcclxuICogICAgICB0ZXN0OiAoc3RyLCBjb25maWcpID0+IGJvb2wsXHJcbiAqICAgICAgdHJhbnNmb3JtOiAoc3RyLCBjb25maWcpID0+ICh7XHJcbiAqICAgICAgICByZW1haW5pbmdUbXBsU3RyOiBzdHIsXHJcbiAqICAgICAgICBpbnNlcnRpb25Qb2ludDogY3R4ID0+IGxpdC1odG1sLlRlbXBsYXRlUmVzdWx0IHwgdW5kZWZpbmVkLCAvLyBpZiB1bmRlZmluZWQgcmVtYWluaW5nVG1wbFN0ciB3aWxsIGJlIG1lcmdlZCB3aXRoIGxhc3Qgc3RhdGljIHBhcnQgXHJcbiAqICAgICAgfSksXHJcbiAqICAgIH0sXHJcbiAqICB9LFxyXG4gKiAgdHJhbnNmb3JtVmFyaWFibGUsIFxyXG4gKiB9XHJcbiAqIEByZXR1cm5zIHtmdW5jdGlvbn0gc3RyVGVtcGxhdGUgPT4gY3R4ID0+IGxpdC1odG1sLlRlbXBsYXRlUmVzdWx0XHJcbiAqL1xyXG5leHBvcnQgZGVmYXVsdCBjb25maWcgPT4gc3RyVGVtcGxhdGUgPT4gdHJhbnNmb3JtKHN0clRlbXBsYXRlLCBjb25maWcpXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gdHJhbnNmb3JtKHRtcGwyUGFyc2UsIGNvbmZpZykge1xyXG4gIGNvbnN0IHN0YXRpY1BhcnRzID0gW11cclxuICBjb25zdCBpbnNlcnRpb25Qb2ludHMgPSBbXVxyXG5cclxuICBsZXQgcmVtYWluaW5nVG1wbFN0ciA9IHRtcGwyUGFyc2VcclxuICBsZXQgc3RhcnRJbmRleE9mSVAgPSByZW1haW5pbmdUbXBsU3RyLmluZGV4T2YoY29uZmlnLmRlbGltaXRlci5zdGFydClcclxuICB3aGlsZSAoc3RhcnRJbmRleE9mSVAgPj0gMCkge1xyXG4gICAgaWYgKHJlbWFpbmluZ1RtcGxTdHIuaW5kZXhPZihjb25maWcuZGVsaW1pdGVyLmVuZCwgc3RhcnRJbmRleE9mSVApIDwgMClcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBtaXNzaW5nIGVuZCBkZWxpbWl0ZXIgYXQ6ICcke3JlbWFpbmluZ1RtcGxTdHJ9J2ApXHJcblxyXG4gICAgc3RhdGljUGFydHMucHVzaChyZW1haW5pbmdUbXBsU3RyLnN1YnN0cmluZygwLCBzdGFydEluZGV4T2ZJUCkpXHJcblxyXG4gICAgY29uc3QgaVBUcmFuc2Zvcm1SZXN1bHQgPSB0cmFuc2Zvcm1JUChcclxuICAgICAgcmVtYWluaW5nVG1wbFN0ci5zdWJzdHJpbmcoc3RhcnRJbmRleE9mSVAgKyBjb25maWcuZGVsaW1pdGVyLnN0YXJ0Lmxlbmd0aCksXHJcbiAgICAgIGNvbmZpZ1xyXG4gICAgKVxyXG5cclxuICAgIGlmIChpUFRyYW5zZm9ybVJlc3VsdC5pbnNlcnRpb25Qb2ludCkge1xyXG4gICAgICByZW1haW5pbmdUbXBsU3RyID0gaVBUcmFuc2Zvcm1SZXN1bHQucmVtYWluaW5nVG1wbFN0clxyXG4gICAgICBpbnNlcnRpb25Qb2ludHMucHVzaChpUFRyYW5zZm9ybVJlc3VsdC5pbnNlcnRpb25Qb2ludClcclxuICAgICAgc3RhcnRJbmRleE9mSVAgPSByZW1haW5pbmdUbXBsU3RyLmluZGV4T2YoY29uZmlnLmRlbGltaXRlci5zdGFydClcclxuICAgIH0gZWxzZSB7IC8vIGUuZy4gY29tbWVudCBvciBjdXN0b21EZWxpbWV0ZXJcclxuICAgICAgY29uc3QgbGFzdFN0YXRpY1BhcnQgPSBzdGF0aWNQYXJ0cy5wb3AoKVxyXG4gICAgICByZW1haW5pbmdUbXBsU3RyID0gbGFzdFN0YXRpY1BhcnQgKyBpUFRyYW5zZm9ybVJlc3VsdC5yZW1haW5pbmdUbXBsU3RyXHJcbiAgICAgIHN0YXJ0SW5kZXhPZklQID0gcmVtYWluaW5nVG1wbFN0ci5pbmRleE9mKGNvbmZpZy5kZWxpbWl0ZXIuc3RhcnQsIGxhc3RTdGF0aWNQYXJ0Lmxlbmd0aClcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHN0YXRpY1BhcnRzLnB1c2gocmVtYWluaW5nVG1wbFN0cilcclxuXHJcbiAgcmV0dXJuIGN0eCA9PlxyXG4gICAgY29uZmlnLmh0bWwoc3RhdGljUGFydHMsIC4uLmluc2VydGlvblBvaW50cy5tYXAoaVAgPT4gaVAoY3R4KSkpXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHRyYW5zZm9ybUlQKHJlbWFpbmluZ1RtcGxTdHIsIGNvbmZpZykge1xyXG4gIGNvbnN0IHRyYW5zZm9ybWVyID0gT2JqZWN0LnZhbHVlcyhjb25maWcudHJhbnNmb3JtZXJzKS5maW5kKHQgPT4gdC50ZXN0KHJlbWFpbmluZ1RtcGxTdHIsIGNvbmZpZykpXHJcbiAgY29uc3QgdHJhbnNmb3JtRnVuY3Rpb24gPSB0cmFuc2Zvcm1lclxyXG4gICAgPyB0cmFuc2Zvcm1lci50cmFuc2Zvcm1cclxuICAgIDogY29uZmlnLnRyYW5zZm9ybVZhcmlhYmxlXHJcbiAgcmV0dXJuIHRyYW5zZm9ybUZ1bmN0aW9uKHJlbWFpbmluZ1RtcGxTdHIsIGNvbmZpZylcclxufSIsImV4cG9ydCBmdW5jdGlvbiBjdHgyVmFsdWUoY3R4LCBrZXkpIHtcclxuICBpZiAoa2V5ID09PSAnLicpXHJcbiAgICByZXR1cm4gY3R4XHJcblxyXG4gIGxldCByZXN1bHQgPSBjdHhcclxuICBmb3IgKGxldCBrIG9mIGtleS5zcGxpdCgnLicpKSB7XHJcbiAgICBpZiAoIXJlc3VsdC5oYXNPd25Qcm9wZXJ0eShrKSlcclxuICAgICAgcmV0dXJuICcnXHJcblxyXG4gICAgcmVzdWx0ID0gcmVzdWx0W2tdXHJcbiAgfVxyXG5cclxuICByZXR1cm4gcmVzdWx0XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBjdHgyTXVzdGFjaGVTdHJpbmcoY3R4LCBrZXkpIHtcclxuICByZXR1cm4gbXVzdGFjaGVTdHJpbmd5ZnkoY3R4MlZhbHVlKGN0eCwga2V5KSlcclxufVxyXG5cclxuZnVuY3Rpb24gbXVzdGFjaGVTdHJpbmd5ZnkodmFsdWUpIHtcclxuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gbnVsbClcclxuICAgIHJldHVybiAnJ1xyXG5cclxuICByZXR1cm4gJycgKyB2YWx1ZVxyXG59IiwiaW1wb3J0IHsgY3R4Mk11c3RhY2hlU3RyaW5nIH0gZnJvbSAnLi4vaGVscGVyL2RhdGFIZWxwZXIuanMnXHJcblxyXG5leHBvcnQgZGVmYXVsdCAocmVtYWluaW5nVG1wbFN0ciwgeyBkZWxpbWl0ZXIgfSkgPT4ge1xyXG4gIGNvbnN0IGluZGV4T2ZFbmREZWxpbWl0ZXIgPSByZW1haW5pbmdUbXBsU3RyLmluZGV4T2YoZGVsaW1pdGVyLmVuZClcclxuICBjb25zdCBkYXRhS2V5ID0gcmVtYWluaW5nVG1wbFN0ci5zdWJzdHJpbmcoMCwgaW5kZXhPZkVuZERlbGltaXRlcilcclxuICByZXR1cm4ge1xyXG4gICAgcmVtYWluaW5nVG1wbFN0cjogcmVtYWluaW5nVG1wbFN0ci5zdWJzdHJpbmcoaW5kZXhPZkVuZERlbGltaXRlciArIGRlbGltaXRlci5lbmQubGVuZ3RoKSxcclxuICAgIGluc2VydGlvblBvaW50OiBjdHggPT4gY3R4Mk11c3RhY2hlU3RyaW5nKGN0eCwgZGF0YUtleSlcclxuICB9XHJcbn0iLCJpbXBvcnQgeyBjdHgyTXVzdGFjaGVTdHJpbmcgfSBmcm9tICcuLi9oZWxwZXIvZGF0YUhlbHBlci5qcydcclxuXHJcbi8qKiBOb3RlLCB0aGlzIGlzIHVuc2FmZSB0byB1c2UsIGJlY2F1c2UgdGhlIHJlbmRlcmVkIG91dHB1dCBjb3VsZCBiZSBhbnkgSmF2YVNjcmlwdCEgKi9cclxuZXhwb3J0IGRlZmF1bHQgdW5zYWZlSFRNTCA9PiAoe1xyXG4gIHRlc3Q6IHJlbWFpbmluZ1RtcGxTdHIgPT4gcmVtYWluaW5nVG1wbFN0clswXSA9PT0gJ3snLFxyXG4gIHRyYW5zZm9ybTogKHJlbWFpbmluZ1RtcGxTdHIsIHsgZGVsaW1pdGVyIH0pID0+IHtcclxuICAgIGNvbnN0IGluZGV4T2ZFbmREZWxpbWl0ZXIgPSByZW1haW5pbmdUbXBsU3RyLmluZGV4T2YoJ30nICsgZGVsaW1pdGVyLmVuZClcclxuICAgIGlmIChpbmRleE9mRW5kRGVsaW1pdGVyIDwgMClcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBtaXNzaW5nIGVuZCBkZWxpbWl0ZXIgYXQ6ICcke2RlbGltaXRlci5zdGFydH0ke3JlbWFpbmluZ1RtcGxTdHJ9J2ApXHJcbiAgXHJcbiAgICBjb25zdCBkYXRhS2V5ID0gcmVtYWluaW5nVG1wbFN0ci5zdWJzdHJpbmcoMSwgaW5kZXhPZkVuZERlbGltaXRlcilcclxuICAgIHJldHVybiB7XHJcbiAgICAgIHJlbWFpbmluZ1RtcGxTdHI6IHJlbWFpbmluZ1RtcGxTdHIuc3Vic3RyaW5nKGluZGV4T2ZFbmREZWxpbWl0ZXIgKyAxICsgZGVsaW1pdGVyLmVuZC5sZW5ndGgpLFxyXG4gICAgICBpbnNlcnRpb25Qb2ludDogY3R4ID0+IHVuc2FmZUhUTUwoY3R4Mk11c3RhY2hlU3RyaW5nKGN0eCwgZGF0YUtleSkpLFxyXG4gICAgfVxyXG4gIH1cclxufSkiLCJleHBvcnQgZnVuY3Rpb24gaXNNdXN0YWNoZUZhbHN5KHZhbHVlKSB7XHJcbiAgcmV0dXJuIFtudWxsLCB1bmRlZmluZWQsIGZhbHNlLCAwLCBOYU4sICcnXVxyXG4gICAgLnNvbWUoZmFsc3kgPT4gZmFsc3kgPT09IHZhbHVlKVxyXG4gICAgfHwgKHZhbHVlLmxlbmd0aCAmJiB2YWx1ZS5sZW5ndGggPT09IDApXHJcbn0iLCJleHBvcnQgZnVuY3Rpb24gcGFyc2VTZWN0aW9uKHRtcGxTdHIsIGRlbGltaXRlcikge1xyXG4gIGNvbnN0IGluZGV4T2ZTdGFydFRhZ0VuZCA9IHRtcGxTdHIuaW5kZXhPZihkZWxpbWl0ZXIuZW5kKVxyXG4gIGNvbnN0IGRhdGFLZXkgPSB0bXBsU3RyLnN1YnN0cmluZygxLCBpbmRleE9mU3RhcnRUYWdFbmQpXHJcbiAgY29uc3QgZW5kVGFnID0gYCR7ZGVsaW1pdGVyLnN0YXJ0fS8ke2RhdGFLZXl9JHtkZWxpbWl0ZXIuZW5kfWBcclxuICBjb25zdCBpbmRleE9mRW5kVGFnU3RhcnQgPSB0bXBsU3RyLmluZGV4T2YoZW5kVGFnKVxyXG4gIGlmIChpbmRleE9mRW5kVGFnU3RhcnQgPCAwKVxyXG4gICAgdGhyb3cgbmV3IEVycm9yKGBtaXNzaW5nIGVuZCBkZWxpbWl0ZXIgYXQ6ICcke2RlbGltaXRlci5zdGFydH0ke3RtcGxTdHJ9J2ApXHJcbiAgXHJcbiAgcmV0dXJuIHtcclxuICAgIGRhdGFLZXksXHJcbiAgICBpbm5lclRtcGw6IHRtcGxTdHIuc3Vic3RyaW5nKGluZGV4T2ZTdGFydFRhZ0VuZCArIGRlbGltaXRlci5zdGFydC5sZW5ndGgsIGluZGV4T2ZFbmRUYWdTdGFydCksXHJcbiAgICByZW1haW5pbmdUbXBsU3RyOiB0bXBsU3RyLnN1YnN0cmluZyhpbmRleE9mRW5kVGFnU3RhcnQgKyBlbmRUYWcubGVuZ3RoKSxcclxuICB9XHJcbn0iLCJpbXBvcnQgeyB0cmFuc2Zvcm0gfSBmcm9tICcuLi9saXQtdHJhbnNmb3JtZXIuanMnXHJcbmltcG9ydCB7IGN0eDJWYWx1ZSB9IGZyb20gJy4uL2hlbHBlci9kYXRhSGVscGVyLmpzJ1xyXG5pbXBvcnQgeyBpc011c3RhY2hlRmFsc3kgfSBmcm9tICcuLi9oZWxwZXIvaXNNdXN0YWNoZUZhbHN5LmpzJ1xyXG5pbXBvcnQgeyBwYXJzZVNlY3Rpb24gfSBmcm9tICcuLi9oZWxwZXIvc2VjdGlvbkhlbHBlci5qcydcclxuXHJcbi8qKiBOb3RlLCB1bmxpa2Ugd2l0aGluIG11c3RhY2hlIGZ1bmN0aW9ucyBhcyBkYXRhIHZhbHVlcyBhcmUgbm90IHN1cHBvcnRlZCBvdXQgb2YgdGhlIGJveCAqL1xyXG5leHBvcnQgZGVmYXVsdCAoKSA9PiAoe1xyXG4gIHRlc3Q6IHJlbWFpbmluZ1RtcGxTdHIgPT4gcmVtYWluaW5nVG1wbFN0clswXSA9PT0gJyMnLFxyXG4gIHRyYW5zZm9ybTogKHJlbWFpbmluZ1RtcGxTdHIsIGNvbmZpZykgPT4ge1xyXG4gICAgY29uc3QgcGFyc2VkU2VjdGlvbiA9IHBhcnNlU2VjdGlvbihyZW1haW5pbmdUbXBsU3RyLCBjb25maWcuZGVsaW1pdGVyKVxyXG4gICAgY29uc3QgdHJhbnNmb3JtZWRJbm5lclRtcGwgPSB0cmFuc2Zvcm0ocGFyc2VkU2VjdGlvbi5pbm5lclRtcGwsIGNvbmZpZylcclxuICAgIFxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgcmVtYWluaW5nVG1wbFN0cjogcGFyc2VkU2VjdGlvbi5yZW1haW5pbmdUbXBsU3RyLFxyXG4gICAgICBpbnNlcnRpb25Qb2ludDogY3R4ID0+IHtcclxuICAgICAgICBjb25zdCBzZWN0aW9uRGF0YSA9IGN0eDJWYWx1ZShjdHgsIHBhcnNlZFNlY3Rpb24uZGF0YUtleSlcclxuICAgICAgICBcclxuICAgICAgICBpZiAoaXNNdXN0YWNoZUZhbHN5KHNlY3Rpb25EYXRhKSlcclxuICAgICAgICAgIHJldHVybiAnJztcclxuXHJcbiAgICAgICAgcmV0dXJuIHNlY3Rpb25EYXRhLm1hcFxyXG4gICAgICAgICAgPyBzZWN0aW9uRGF0YS5tYXAoaW5uZXJDdHggPT4gdHJhbnNmb3JtZWRJbm5lclRtcGwoaW5uZXJDdHgpKVxyXG4gICAgICAgICAgOiB0cmFuc2Zvcm1lZElubmVyVG1wbChjdHgpXHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcbn0pIiwiaW1wb3J0IHsgY3R4MlZhbHVlIH0gZnJvbSAnLi4vaGVscGVyL2RhdGFIZWxwZXIuanMnXHJcbmltcG9ydCB7IGlzTXVzdGFjaGVGYWxzeSB9IGZyb20gJy4uL2hlbHBlci9pc011c3RhY2hlRmFsc3kuanMnXHJcbmltcG9ydCB7IHBhcnNlU2VjdGlvbiB9IGZyb20gJy4uL2hlbHBlci9zZWN0aW9uSGVscGVyLmpzJ1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgKCkgPT4gKHtcclxuICB0ZXN0OiByZW1haW5pbmdUbXBsU3RyID0+IHJlbWFpbmluZ1RtcGxTdHJbMF0gPT09ICdeJyxcclxuICB0cmFuc2Zvcm06IChyZW1haW5pbmdUbXBsU3RyLCB7IGRlbGltaXRlciB9KSA9PiB7XHJcbiAgICBjb25zdCBwYXJzZWRTZWN0aW9uID0gcGFyc2VTZWN0aW9uKHJlbWFpbmluZ1RtcGxTdHIsIGRlbGltaXRlcilcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICByZW1haW5pbmdUbXBsU3RyOiBwYXJzZWRTZWN0aW9uLnJlbWFpbmluZ1RtcGxTdHIsXHJcbiAgICAgIGluc2VydGlvblBvaW50OiBjdHggPT5cclxuICAgICAgICBpc011c3RhY2hlRmFsc3koY3R4MlZhbHVlKGN0eCwgcGFyc2VkU2VjdGlvbi5kYXRhS2V5KSlcclxuICAgICAgICAgID8gcGFyc2VkU2VjdGlvbi5pbm5lclRtcGxcclxuICAgICAgICAgIDogJycsXHJcbiAgICB9XHJcbiAgfVxyXG59KSIsImV4cG9ydCBkZWZhdWx0ICgpID0+ICh7XHJcbiAgdGVzdDogcmVtYWluaW5nVG1wbFN0ciA9PiByZW1haW5pbmdUbXBsU3RyWzBdID09PSAnIScsXHJcbiAgdHJhbnNmb3JtOiAocmVtYWluaW5nVG1wbFN0ciwgeyBkZWxpbWl0ZXIgfSkgPT4gKHtcclxuICAgIHJlbWFpbmluZ1RtcGxTdHI6IHJlbWFpbmluZ1RtcGxTdHIuc3Vic3RyaW5nKHJlbWFpbmluZ1RtcGxTdHIuaW5kZXhPZihkZWxpbWl0ZXIuZW5kKSArIGRlbGltaXRlci5lbmQubGVuZ3RoKSxcclxuICAgIGluc2VydGlvblBvaW50OiB1bmRlZmluZWQsXHJcbiAgfSlcclxufSkiLCJleHBvcnQgZGVmYXVsdCAoKSA9PiAoe1xyXG4gIHRlc3Q6IHJlbWFpbmluZ1RtcGxTdHIgPT4gcmVtYWluaW5nVG1wbFN0clswXSA9PT0gJz0nLFxyXG4gIHRyYW5zZm9ybTogKHJlbWFpbmluZ1RtcGxTdHIsIGNvbmZpZykgPT4ge1xyXG4gICAgY29uc3Qgb3JpZ2luYWxFbmREZWxpTGVuZ3RoID0gY29uZmlnLmRlbGltaXRlci5lbmQubGVuZ3RoXHJcbiAgICBjb25zdCBpbmRleE9mRW5kVGFnID0gcmVtYWluaW5nVG1wbFN0ci5pbmRleE9mKCc9JyArIGNvbmZpZy5kZWxpbWl0ZXIuZW5kKVxyXG4gICAgaWYgKGluZGV4T2ZFbmRUYWcgPCAwIClcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBtaXNzaW5nIGVuZCBkZWxpbWl0ZXIgYXQ6ICcke3JlbWFpbmluZ1RtcGxTdHJ9J2ApXHJcblxyXG4gICAgY29uc3QgWyBuZXdTdGFydERlbGksIG5ld0VuZERlbGkgXSA9IHJlbWFpbmluZ1RtcGxTdHIuc3Vic3RyaW5nKDEsIGluZGV4T2ZFbmRUYWcpLnNwbGl0KCcgJylcclxuXHJcbiAgICBjb25maWcuZGVsaW1pdGVyLnN0YXJ0ID0gbmV3U3RhcnREZWxpXHJcbiAgICBjb25maWcuZGVsaW1pdGVyLmVuZCA9IG5ld0VuZERlbGlcclxuICAgIFxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgcmVtYWluaW5nVG1wbFN0cjogcmVtYWluaW5nVG1wbFN0ci5zdWJzdHJpbmcoaW5kZXhPZkVuZFRhZyArIDEgKyBvcmlnaW5hbEVuZERlbGlMZW5ndGgpLFxyXG4gICAgICBpbnNlcnRpb25Qb2ludDogdW5kZWZpbmVkLCAgXHJcbiAgICB9XHJcbiAgfVxyXG59KSIsImltcG9ydCBjcmVhdGVUcmFuc2Zvcm0gZnJvbSAnLi9saXQtdHJhbnNmb3JtZXIuanMnXHJcbmltcG9ydCB0cmFuc2Zvcm1WYXJpYWJsZSBmcm9tICcuL3RyYW5zZm9ybWVycy92YXJpYWJsZVRyYW5zZm9ybWVyLmpzJ1xyXG5pbXBvcnQgdW5zYWZlVmFyaWFibGVUcmFuc2Zvcm1lciBmcm9tICcuL3RyYW5zZm9ybWVycy91bnNhZmVWYXJpYWJsZS5qcydcclxuaW1wb3J0IHNlY3Rpb25UcmFuc2Zvcm1lciBmcm9tICcuL3RyYW5zZm9ybWVycy9zZWN0aW9uLmpzJ1xyXG5pbXBvcnQgaW52ZXJ0ZWRTZWN0aW9uVHJhbnNmb3JtZXIgZnJvbSAnLi90cmFuc2Zvcm1lcnMvaW52ZXJ0ZWRTZWN0aW9uLmpzJ1xyXG5pbXBvcnQgY29tbWVudFRyYW5zZm9ybWVyIGZyb20gJy4vdHJhbnNmb3JtZXJzL2NvbW1lbnQuanMnXHJcbmltcG9ydCBjdXN0b21EZWxpbWl0ZXJUcmFuc2Zvcm1lciBmcm9tICcuL3RyYW5zZm9ybWVycy9jdXN0b21EZWxpbWl0ZXIuanMnXHJcblxyXG5leHBvcnQgZGVmYXVsdCAoaHRtbCwgdW5zYWZlSFRNTCkgPT5cclxuICBjcmVhdGVUcmFuc2Zvcm0oe1xyXG4gICAgaHRtbCxcclxuICAgIGRlbGltaXRlcjogeyBzdGFydDogJ3t7JywgZW5kOiAnfX0nIH0sXHJcbiAgICB0cmFuc2Zvcm1WYXJpYWJsZSxcclxuICAgIHRyYW5zZm9ybWVyczoge1xyXG4gICAgICB1bnNhZmVWYXJpYWJsZTogdW5zYWZlVmFyaWFibGVUcmFuc2Zvcm1lcih1bnNhZmVIVE1MKSxcclxuICAgICAgc2VjdGlvbjogc2VjdGlvblRyYW5zZm9ybWVyKCksXHJcbiAgICAgIGludmVydGVkU2VjdGlvbjogaW52ZXJ0ZWRTZWN0aW9uVHJhbnNmb3JtZXIoKSxcclxuICAgICAgY29tbWVudDogY29tbWVudFRyYW5zZm9ybWVyKCksXHJcbiAgICAgIGN1c3RvbURlbGltaXRlclRyYW5zZm9ybWVyOiBjdXN0b21EZWxpbWl0ZXJUcmFuc2Zvcm1lcigpLFxyXG4gICAgfSxcclxuICB9KSIsImltcG9ydCB7IHRvVGVtcGxhdGVTdHJpbmdzQXJyYXkgfSBmcm9tICdAY2RwL2V4dGVuc2lvbi10ZW1wbGF0ZSc7XG5pbXBvcnQgdHlwZSB7IFRlbXBsYXRlQnJpZGdlRW5kaW5lLCBUZW1wbGF0ZVRyYW5zZm9ybWVyIH0gZnJvbSAnQGJyaWRnZS9pbnRlcmZhY2VzJztcbmltcG9ydCB0eXBlIHtcbiAgICBNdXN0YWNoZVRyYW5zZm9ybWVyLFxuICAgIFRlbXBsYXRlVGFnLFxuICAgIFRyYW5zZm9ybURpcmVjdGl2ZSxcbiAgICBUcmFuc2Zvcm1UZXN0ZXIsXG4gICAgVHJhbnNmb3JtRXhlY3V0b3IsXG4gICAgVHJhbnNmb3JtZUNvbnRleHQsXG4gICAgVHJhbnNmb3JtQ29uZmlnLFxufSBmcm9tICdsaXQtdHJhbnNmb3JtZXIvc3JjL2ludGVyZmFjZXMnO1xuXG5pbXBvcnQgY3JlYXRlRGVmYXVsdCBmcm9tICdsaXQtdHJhbnNmb3JtZXInO1xuaW1wb3J0IGNyZWF0ZUN1c3RvbSBmcm9tICdsaXQtdHJhbnNmb3JtZXIvc3JjL2xpdC10cmFuc2Zvcm1lcic7XG5cbmltcG9ydCB2YXJpYWJsZSBmcm9tICdsaXQtdHJhbnNmb3JtZXIvc3JjL3RyYW5zZm9ybWVycy92YXJpYWJsZVRyYW5zZm9ybWVyJztcbmltcG9ydCB1bnNhZmVWYXJpYWJsZSBmcm9tICdsaXQtdHJhbnNmb3JtZXIvc3JjL3RyYW5zZm9ybWVycy91bnNhZmVWYXJpYWJsZSc7XG5pbXBvcnQgc2VjdGlvbiBmcm9tICdsaXQtdHJhbnNmb3JtZXIvc3JjL3RyYW5zZm9ybWVycy9zZWN0aW9uJztcbmltcG9ydCBpbnZlcnRlZFNlY3Rpb24gZnJvbSAnbGl0LXRyYW5zZm9ybWVyL3NyYy90cmFuc2Zvcm1lcnMvaW52ZXJ0ZWRTZWN0aW9uJztcbmltcG9ydCBjb21tZW50IGZyb20gJ2xpdC10cmFuc2Zvcm1lci9zcmMvdHJhbnNmb3JtZXJzL2NvbW1lbnQnO1xuaW1wb3J0IGN1c3RvbURlbGltaXRlciBmcm9tICdsaXQtdHJhbnNmb3JtZXIvc3JjL3RyYW5zZm9ybWVycy9jdXN0b21EZWxpbWl0ZXInO1xuXG4vKiogQGludGVybmFsICovXG50eXBlIE11c3RhY2hlVHJhbnNmb3JtZXJDb250ZXh0ID0gTXVzdGFjaGVUcmFuc2Zvcm1lciAmIHsgZGVsaW1pdGVyOiB7IHN0YXJ0OiBzdHJpbmc7IGVuZDogc3RyaW5nOyB9OyB9O1xuXG5jb25zdCB4Zm9ybSA9IChtdXN0YWNoZTogTXVzdGFjaGVUcmFuc2Zvcm1lckNvbnRleHQpOiBUZW1wbGF0ZVRyYW5zZm9ybWVyID0+IHtcbiAgICByZXR1cm4gKHRlbXBsYXRlOiBIVE1MVGVtcGxhdGVFbGVtZW50IHwgc3RyaW5nKTogVGVtcGxhdGVCcmlkZ2VFbmRpbmUgPT4ge1xuICAgICAgICBjb25zdCB7IHN0YXJ0LCBlbmQgfSA9IG11c3RhY2hlLmRlbGltaXRlcjtcblxuICAgICAgICAvLyDjgrPjg6Hjg7Pjg4jjg5bjg63jg4Pjgq/lhoXjga4gZGVsaW1pdGVyIOaKveWHulxuICAgICAgICBjb25zdCByZWdDb21tZW50UmVtb3ZlU3RhcnQgPSBuZXcgUmVnRXhwKGA8IS0tXFxcXHMqJHtzdGFydH1gLCAnZycpO1xuICAgICAgICBjb25zdCByZWdDb21tZW50UmVtb3ZlRW5kICAgPSBuZXcgUmVnRXhwKGAke2VuZH1cXFxccyotLT5gLCAnZycpO1xuICAgICAgICAvLyBkZWxpbWl0ZXIg5YmN5b6M44GuIHRyaW0g55So5q2j6KaP6KGo54++XG4gICAgICAgIGNvbnN0IHJlZ1RyaW0gPSBuZXcgUmVnRXhwKGAoJHtzdGFydH1bI14vXT8pXFxcXHMqKFtcXFxcd1xcXFwuXSspXFxcXHMqKCR7ZW5kfSlgLCAnZycpO1xuXG4gICAgICAgIGNvbnN0IGJvZHkgPSAodGVtcGxhdGUgaW5zdGFuY2VvZiBIVE1MVGVtcGxhdGVFbGVtZW50ID8gdGVtcGxhdGUuaW5uZXJIVE1MIDogdGVtcGxhdGUpXG4gICAgICAgICAgICAucmVwbGFjZShyZWdDb21tZW50UmVtb3ZlU3RhcnQsIHN0YXJ0KVxuICAgICAgICAgICAgLnJlcGxhY2UocmVnQ29tbWVudFJlbW92ZUVuZCwgZW5kKVxuICAgICAgICAgICAgLnJlcGxhY2UocmVnVHJpbSwgJyQxJDIkMycpXG4gICAgICAgIDtcblxuICAgICAgICByZXR1cm4gbXVzdGFjaGUoYm9keSk7XG4gICAgfTtcbn07XG5cbi8qXG4gKiBsaXQtaHRtbCB2Mi4xLjArXG4gKiBUZW1wbGF0ZVN0cmluZ3NBcnJheSDjgpLljrPlr4bjgavjg4Hjgqfjg4Pjgq/jgZnjgovjgojjgYbjgavjgarjgaPjgZ/jgZ/jgoEgcGF0Y2gg44KS44GC44Gm44KLXG4gKiBodHRwczovL2dpdGh1Yi5jb20vbGl0L2xpdC9wdWxsLzIzMDdcbiAqXG4gKiDlsIbmnaUgYEFycmF5LmlzVGVtcGxhdGVPYmplY3QoKWAg44KS5L2/55So44GV44KM44KL5aC05ZCILCDmnKzlr77lv5zjgoLopovnm7TjgZnlv4XopoHjgYLjgopcbiAqIGh0dHBzOi8vdGMzOS5lcy9wcm9wb3NhbC1hcnJheS1pcy10ZW1wbGF0ZS1vYmplY3QvXG4gKi9cbmNvbnN0IHBhdGNoID0gKGh0bWw6IFRlbXBsYXRlVGFnKTogVGVtcGxhdGVUYWcgPT4ge1xuICAgIHJldHVybiAodGVtcGxhdGU6IFRlbXBsYXRlU3RyaW5nc0FycmF5LCAuLi52YWx1ZXM6IHVua25vd25bXSkgPT4ge1xuICAgICAgICByZXR1cm4gaHRtbCh0b1RlbXBsYXRlU3RyaW5nc0FycmF5KHRlbXBsYXRlKSwgLi4udmFsdWVzKTtcbiAgICB9O1xufTtcblxuZnVuY3Rpb24gY3JlYXRlTXVzdGFjaGVUcmFuc2Zvcm1lcihodG1sOiBUZW1wbGF0ZVRhZywgdW5zYWZlSFRNTDogVHJhbnNmb3JtRGlyZWN0aXZlKTogVGVtcGxhdGVUcmFuc2Zvcm1lcjtcbmZ1bmN0aW9uIGNyZWF0ZU11c3RhY2hlVHJhbnNmb3JtZXIoY29uZmlnOiBUcmFuc2Zvcm1Db25maWcpOiBUZW1wbGF0ZVRyYW5zZm9ybWVyO1xuZnVuY3Rpb24gY3JlYXRlTXVzdGFjaGVUcmFuc2Zvcm1lcihhcmcxOiB1bmtub3duLCBhcmcyPzogdW5rbm93bik6IFRlbXBsYXRlVHJhbnNmb3JtZXIge1xuICAgIGNvbnN0IGRlbGltaXRlciA9IHsgc3RhcnQ6ICd7eycsIGVuZDogJ319JyB9O1xuICAgIGxldCB0cmFuc2Zvcm1lcjogTXVzdGFjaGVUcmFuc2Zvcm1lckNvbnRleHQ7XG4gICAgaWYgKCdmdW5jdGlvbicgPT09IHR5cGVvZiBhcmcxKSB7XG4gICAgICAgIHRyYW5zZm9ybWVyID0gY3JlYXRlRGVmYXVsdChwYXRjaChhcmcxIGFzIFRlbXBsYXRlVGFnKSwgYXJnMiBhcyBUcmFuc2Zvcm1EaXJlY3RpdmUpIGFzIE11c3RhY2hlVHJhbnNmb3JtZXJDb250ZXh0O1xuICAgICAgICB0cmFuc2Zvcm1lci5kZWxpbWl0ZXIgPSBkZWxpbWl0ZXI7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgeyBodG1sIH0gPSBhcmcxIGFzIHsgaHRtbDogVGVtcGxhdGVUYWc7IH07XG4gICAgICAgIGNvbnN0IGNvbmZpZyA9IE9iamVjdC5hc3NpZ24oe1xuICAgICAgICAgICAgZGVsaW1pdGVyLFxuICAgICAgICAgICAgdHJhbnNmb3JtZXJzOiB7fSxcbiAgICAgICAgfSwgYXJnMSwgeyBodG1sOiBwYXRjaChodG1sKSB9KSBhcyBUcmFuc2Zvcm1Db25maWc7XG4gICAgICAgIHRyYW5zZm9ybWVyID0gY3JlYXRlQ3VzdG9tKGNvbmZpZykgYXMgTXVzdGFjaGVUcmFuc2Zvcm1lckNvbnRleHQ7XG4gICAgICAgIHRyYW5zZm9ybWVyLmRlbGltaXRlciA9IGNvbmZpZy5kZWxpbWl0ZXIhO1xuICAgIH1cbiAgICByZXR1cm4geGZvcm0odHJhbnNmb3JtZXIpO1xufVxuXG5jb25zdCB0cmFuc2Zvcm1lcjoge1xuICAgIHZhcmlhYmxlOiBUcmFuc2Zvcm1FeGVjdXRvcjtcbiAgICB1bnNhZmVWYXJpYWJsZTogKHVuc2FmZUhUTUw6IFRyYW5zZm9ybURpcmVjdGl2ZSkgPT4gVHJhbnNmb3JtZUNvbnRleHQ7XG4gICAgc2VjdGlvbjogKCkgPT4gVHJhbnNmb3JtZUNvbnRleHQ7XG4gICAgaW52ZXJ0ZWRTZWN0aW9uOiAoKSA9PiBUcmFuc2Zvcm1lQ29udGV4dDtcbiAgICBjb21tZW50OiAoKSA9PiBUcmFuc2Zvcm1lQ29udGV4dDtcbiAgICBjdXN0b21EZWxpbWl0ZXI6ICgpID0+IFRyYW5zZm9ybWVDb250ZXh0O1xufSA9IHtcbiAgICB2YXJpYWJsZSxcbiAgICB1bnNhZmVWYXJpYWJsZSxcbiAgICBzZWN0aW9uLFxuICAgIGludmVydGVkU2VjdGlvbixcbiAgICBjb21tZW50LFxuICAgIGN1c3RvbURlbGltaXRlcixcbn07XG5cbmV4cG9ydCB7XG4gICAgVGVtcGxhdGVUYWcsXG4gICAgVHJhbnNmb3JtRGlyZWN0aXZlLFxuICAgIFRlbXBsYXRlVHJhbnNmb3JtZXIsXG4gICAgVHJhbnNmb3JtVGVzdGVyLFxuICAgIFRyYW5zZm9ybUV4ZWN1dG9yLFxuICAgIFRyYW5zZm9ybWVDb250ZXh0LFxuICAgIFRyYW5zZm9ybUNvbmZpZyxcbiAgICBjcmVhdGVNdXN0YWNoZVRyYW5zZm9ybWVyLFxuICAgIHRyYW5zZm9ybWVyLFxufTtcbiIsbnVsbCxudWxsLG51bGwsbnVsbCxudWxsLCJpbXBvcnQgdHlwZSB7XG4gICAgVGVtcGxhdGVCcmlkZ2VBcmcsXG4gICAgVGVtcGxhdGVUcmFuc2Zvcm1lcixcbn0gZnJvbSAnQGJyaWRnZS9pbnRlcmZhY2VzJztcbmltcG9ydCB7XG4gICAgVGVtcGxhdGVIYW5kbGVyLFxuICAgIFRlbXBsYXRlSGFuZGxlcnMsXG4gICAgVGVtcGxhdGVSZW5kZXJlcnMsXG4gICAgRXZhbHVhdGVUZW1wbGF0ZVJlc3VsdCxcbiAgICBwcmVwYXJlVGVtcGxhdGUsXG4gICAgZXZhbHVhdGVUZW1wbGF0ZSxcbn0gZnJvbSAnc3RhbXBpbm8nO1xuXG5leHBvcnQgaW50ZXJmYWNlIENyZWF0ZVN0YW1waW5vVGVtcGxhdGVPcHRpb25zIHtcbiAgICBoYW5kbGVycz86IFRlbXBsYXRlSGFuZGxlcnM7XG4gICAgcmVuZGVyZXJzPzogVGVtcGxhdGVSZW5kZXJlcnM7XG4gICAgc3VwZXJUZW1wbGF0ZT86IEhUTUxUZW1wbGF0ZUVsZW1lbnQgfCB1bmRlZmluZWQ7XG59XG5cbmZ1bmN0aW9uIGVuc3VyZSh0ZW1wbGF0ZTogSFRNTFRlbXBsYXRlRWxlbWVudCB8IHN0cmluZyk6IEhUTUxUZW1wbGF0ZUVsZW1lbnQge1xuICAgIGlmICh0ZW1wbGF0ZSBpbnN0YW5jZW9mIEhUTUxUZW1wbGF0ZUVsZW1lbnQpIHtcbiAgICAgICAgcmV0dXJuIHRlbXBsYXRlO1xuICAgIH0gZWxzZSBpZiAoJ3N0cmluZycgPT09IHR5cGVvZiB0ZW1wbGF0ZSkge1xuICAgICAgICBjb25zdCBlbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndGVtcGxhdGUnKTtcbiAgICAgICAgZWxlbWVudC5pbm5lckhUTUwgPSB0ZW1wbGF0ZTtcbiAgICAgICAgcmV0dXJuIGVsZW1lbnQ7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgVHlwZSBvZiB0ZW1wbGF0ZSBpcyBub3QgYSB2YWxpZC4gW3R5cGVvZjogJHt0eXBlb2YgdGVtcGxhdGV9XWApO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gY3JlYXRlU3RhbXBpbm9UcmFuc2Zvcm1lcihvcHRpb25zPzogQ3JlYXRlU3RhbXBpbm9UZW1wbGF0ZU9wdGlvbnMpOiBUZW1wbGF0ZVRyYW5zZm9ybWVyIHtcbiAgICBjb25zdCB7IGhhbmRsZXJzLCByZW5kZXJlcnMsIHN1cGVyVGVtcGxhdGUgfSA9IG9wdGlvbnMgPz8ge307XG4gICAgcmV0dXJuICh0ZW1wbGF0ZTogSFRNTFRlbXBsYXRlRWxlbWVudCB8IHN0cmluZykgPT4ge1xuICAgICAgICByZXR1cm4gcHJlcGFyZVRlbXBsYXRlKGVuc3VyZSh0ZW1wbGF0ZSksIGhhbmRsZXJzLCByZW5kZXJlcnMsIHN1cGVyVGVtcGxhdGUpO1xuICAgIH07XG59XG5cbmV4cG9ydCB7XG4gICAgVGVtcGxhdGVCcmlkZ2VBcmcsXG4gICAgVGVtcGxhdGVIYW5kbGVyLFxuICAgIFRlbXBsYXRlSGFuZGxlcnMsXG4gICAgVGVtcGxhdGVSZW5kZXJlcnMsXG4gICAgRXZhbHVhdGVUZW1wbGF0ZVJlc3VsdCxcbiAgICBjcmVhdGVTdGFtcGlub1RyYW5zZm9ybWVyLFxuICAgIHByZXBhcmVUZW1wbGF0ZSxcbiAgICBldmFsdWF0ZVRlbXBsYXRlLFxufTtcbiJdLCJuYW1lcyI6WyJjcmVhdGVUcmFuc2Zvcm0iLCJ0cmFuc2Zvcm1WYXJpYWJsZSIsInVuc2FmZVZhcmlhYmxlVHJhbnNmb3JtZXIiLCJzZWN0aW9uVHJhbnNmb3JtZXIiLCJpbnZlcnRlZFNlY3Rpb25UcmFuc2Zvcm1lciIsImNvbW1lbnRUcmFuc2Zvcm1lciIsImN1c3RvbURlbGltaXRlclRyYW5zZm9ybWVyIiwidG9UZW1wbGF0ZVN0cmluZ3NBcnJheSIsIl8kTEgiLCJub3RoaW5nIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztFQUFBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7QUFDQSx1QkFBZSxNQUFNLElBQUksV0FBVyxJQUFJLFNBQVMsQ0FBQyxXQUFXLEVBQUUsTUFBTSxFQUFDO0FBQ3RFO0VBQ08sU0FBUyxTQUFTLENBQUMsVUFBVSxFQUFFLE1BQU0sRUFBRTtFQUM5QyxFQUFFLE1BQU0sV0FBVyxHQUFHLEdBQUU7RUFDeEIsRUFBRSxNQUFNLGVBQWUsR0FBRyxHQUFFO0FBQzVCO0VBQ0EsRUFBRSxJQUFJLGdCQUFnQixHQUFHLFdBQVU7RUFDbkMsRUFBRSxJQUFJLGNBQWMsR0FBRyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUM7RUFDdkUsRUFBRSxPQUFPLGNBQWMsSUFBSSxDQUFDLEVBQUU7RUFDOUIsSUFBSSxJQUFJLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDO0VBQzFFLE1BQU0sTUFBTSxJQUFJLEtBQUssQ0FBQyxDQUFDLDJCQUEyQixFQUFFLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3hFO0VBQ0EsSUFBSSxXQUFXLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsY0FBYyxDQUFDLEVBQUM7QUFDbkU7RUFDQSxJQUFJLE1BQU0saUJBQWlCLEdBQUcsV0FBVztFQUN6QyxNQUFNLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxjQUFjLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDO0VBQ2hGLE1BQU0sTUFBTTtFQUNaLE1BQUs7QUFDTDtFQUNBLElBQUksSUFBSSxpQkFBaUIsQ0FBQyxjQUFjLEVBQUU7RUFDMUMsTUFBTSxnQkFBZ0IsR0FBRyxpQkFBaUIsQ0FBQyxpQkFBZ0I7RUFDM0QsTUFBTSxlQUFlLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLGNBQWMsRUFBQztFQUM1RCxNQUFNLGNBQWMsR0FBRyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUM7RUFDdkUsSUFBSSxDQUFDLE1BQU07RUFDWCxNQUFNLE1BQU0sY0FBYyxHQUFHLFdBQVcsQ0FBQyxHQUFHLEdBQUU7RUFDOUMsTUFBTSxnQkFBZ0IsR0FBRyxjQUFjLEdBQUcsaUJBQWlCLENBQUMsaUJBQWdCO0VBQzVFLE1BQU0sY0FBYyxHQUFHLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxjQUFjLENBQUMsTUFBTSxFQUFDO0VBQzlGLElBQUksQ0FBQztFQUNMLEVBQUUsQ0FBQztBQUNIO0VBQ0EsRUFBRSxXQUFXLENBQUMsSUFBSSxDQUFDLGdCQUFnQixFQUFDO0FBQ3BDO0VBQ0EsRUFBRSxPQUFPLEdBQUc7RUFDWixJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLEdBQUcsZUFBZSxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7RUFDbkUsQ0FBQztBQUNEO0VBQ0EsU0FBUyxXQUFXLENBQUMsZ0JBQWdCLEVBQUUsTUFBTSxFQUFFO0VBQy9DLEVBQUUsTUFBTSxXQUFXLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLGdCQUFnQixFQUFFLE1BQU0sQ0FBQyxFQUFDO0VBQ3BHLEVBQUUsTUFBTSxpQkFBaUIsR0FBRyxXQUFXO0VBQ3ZDLE1BQU0sV0FBVyxDQUFDLFNBQVM7RUFDM0IsTUFBTSxNQUFNLENBQUMsa0JBQWlCO0VBQzlCLEVBQUUsT0FBTyxpQkFBaUIsQ0FBQyxnQkFBZ0IsRUFBRSxNQUFNLENBQUM7RUFDcEQ7O0VDM0RPLFNBQVMsU0FBUyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUU7RUFDcEMsRUFBRSxJQUFJLEdBQUcsS0FBSyxHQUFHO0VBQ2pCLElBQUksT0FBTyxHQUFHO0FBQ2Q7RUFDQSxFQUFFLElBQUksTUFBTSxHQUFHLElBQUc7RUFDbEIsRUFBRSxLQUFLLElBQUksQ0FBQyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUU7RUFDaEMsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUM7RUFDakMsTUFBTSxPQUFPLEVBQUU7QUFDZjtFQUNBLElBQUksTUFBTSxHQUFHLE1BQU0sQ0FBQyxDQUFDLEVBQUM7RUFDdEIsRUFBRSxDQUFDO0FBQ0g7RUFDQSxFQUFFLE9BQU8sTUFBTTtFQUNmLENBQUM7QUFDRDtFQUNPLFNBQVMsa0JBQWtCLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRTtFQUM3QyxFQUFFLE9BQU8saUJBQWlCLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQztFQUMvQyxDQUFDO0FBQ0Q7RUFDQSxTQUFTLGlCQUFpQixDQUFDLEtBQUssRUFBRTtFQUNsQyxFQUFFLElBQUksS0FBSyxLQUFLLFNBQVMsSUFBSSxLQUFLLEtBQUssSUFBSTtFQUMzQyxJQUFJLE9BQU8sRUFBRTtBQUNiO0VBQ0EsRUFBRSxPQUFPLEVBQUUsR0FBRyxLQUFLO0VBQ25COztBQ3RCQSxtQkFBZSxDQUFDLGdCQUFnQixFQUFFLEVBQUUsU0FBUyxFQUFFLEtBQUs7RUFDcEQsRUFBRSxNQUFNLG1CQUFtQixHQUFHLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFDO0VBQ3JFLEVBQUUsTUFBTSxPQUFPLEdBQUcsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxtQkFBbUIsRUFBQztFQUNwRSxFQUFFLE9BQU87RUFDVCxJQUFJLGdCQUFnQixFQUFFLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxtQkFBbUIsR0FBRyxTQUFTLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQztFQUM1RixJQUFJLGNBQWMsRUFBRSxHQUFHLElBQUksa0JBQWtCLENBQUMsR0FBRyxFQUFFLE9BQU8sQ0FBQztFQUMzRCxHQUFHO0VBQ0g7O0VDUEE7QUFDQSx5QkFBZSxVQUFVLEtBQUs7RUFDOUIsRUFBRSxJQUFJLEVBQUUsZ0JBQWdCLElBQUksZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRztFQUN2RCxFQUFFLFNBQVMsRUFBRSxDQUFDLGdCQUFnQixFQUFFLEVBQUUsU0FBUyxFQUFFLEtBQUs7RUFDbEQsSUFBSSxNQUFNLG1CQUFtQixHQUFHLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxHQUFHLEdBQUcsU0FBUyxDQUFDLEdBQUcsRUFBQztFQUM3RSxJQUFJLElBQUksbUJBQW1CLEdBQUcsQ0FBQztFQUMvQixNQUFNLE1BQU0sSUFBSSxLQUFLLENBQUMsQ0FBQywyQkFBMkIsRUFBRSxTQUFTLENBQUMsS0FBSyxDQUFDLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLENBQUM7RUFDMUY7RUFDQSxJQUFJLE1BQU0sT0FBTyxHQUFHLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsbUJBQW1CLEVBQUM7RUFDdEUsSUFBSSxPQUFPO0VBQ1gsTUFBTSxnQkFBZ0IsRUFBRSxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsbUJBQW1CLEdBQUcsQ0FBQyxHQUFHLFNBQVMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDO0VBQ2xHLE1BQU0sY0FBYyxFQUFFLEdBQUcsSUFBSSxVQUFVLENBQUMsa0JBQWtCLENBQUMsR0FBRyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0VBQ3pFLEtBQUs7RUFDTCxFQUFFLENBQUM7RUFDSCxDQUFDOztFQ2hCTSxTQUFTLGVBQWUsQ0FBQyxLQUFLLEVBQUU7RUFDdkMsRUFBRSxPQUFPLENBQUMsSUFBSSxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxFQUFFLENBQUM7RUFDN0MsS0FBSyxJQUFJLENBQUMsS0FBSyxJQUFJLEtBQUssS0FBSyxLQUFLLENBQUM7RUFDbkMsUUFBUSxLQUFLLENBQUMsTUFBTSxJQUFJLEtBQUssQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDO0VBQzNDOztFQ0pPLFNBQVMsWUFBWSxDQUFDLE9BQU8sRUFBRSxTQUFTLEVBQUU7RUFDakQsRUFBRSxNQUFNLGtCQUFrQixHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBQztFQUMzRCxFQUFFLE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLGtCQUFrQixFQUFDO0VBQzFELEVBQUUsTUFBTSxNQUFNLEdBQUcsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxFQUFFLFNBQVMsQ0FBQyxHQUFHLENBQUMsRUFBQztFQUNoRSxFQUFFLE1BQU0sa0JBQWtCLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUM7RUFDcEQsRUFBRSxJQUFJLGtCQUFrQixHQUFHLENBQUM7RUFDNUIsSUFBSSxNQUFNLElBQUksS0FBSyxDQUFDLENBQUMsMkJBQTJCLEVBQUUsU0FBUyxDQUFDLEtBQUssQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztFQUMvRTtFQUNBLEVBQUUsT0FBTztFQUNULElBQUksT0FBTztFQUNYLElBQUksU0FBUyxFQUFFLE9BQU8sQ0FBQyxTQUFTLENBQUMsa0JBQWtCLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsa0JBQWtCLENBQUM7RUFDakcsSUFBSSxnQkFBZ0IsRUFBRSxPQUFPLENBQUMsU0FBUyxDQUFDLGtCQUFrQixHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUM7RUFDM0UsR0FBRztFQUNIOztFQ1JBO0FBQ0Esa0JBQWUsT0FBTztFQUN0QixFQUFFLElBQUksRUFBRSxnQkFBZ0IsSUFBSSxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHO0VBQ3ZELEVBQUUsU0FBUyxFQUFFLENBQUMsZ0JBQWdCLEVBQUUsTUFBTSxLQUFLO0VBQzNDLElBQUksTUFBTSxhQUFhLEdBQUcsWUFBWSxDQUFDLGdCQUFnQixFQUFFLE1BQU0sQ0FBQyxTQUFTLEVBQUM7RUFDMUUsSUFBSSxNQUFNLG9CQUFvQixHQUFHLFNBQVMsQ0FBQyxhQUFhLENBQUMsU0FBUyxFQUFFLE1BQU0sRUFBQztFQUMzRTtFQUNBLElBQUksT0FBTztFQUNYLE1BQU0sZ0JBQWdCLEVBQUUsYUFBYSxDQUFDLGdCQUFnQjtFQUN0RCxNQUFNLGNBQWMsRUFBRSxHQUFHLElBQUk7RUFDN0IsUUFBUSxNQUFNLFdBQVcsR0FBRyxTQUFTLENBQUMsR0FBRyxFQUFFLGFBQWEsQ0FBQyxPQUFPLEVBQUM7RUFDakU7RUFDQSxRQUFRLElBQUksZUFBZSxDQUFDLFdBQVcsQ0FBQztFQUN4QyxVQUFVLE9BQU8sRUFBRSxDQUFDO0FBQ3BCO0VBQ0EsUUFBUSxPQUFPLFdBQVcsQ0FBQyxHQUFHO0VBQzlCLFlBQVksV0FBVyxDQUFDLEdBQUcsQ0FBQyxRQUFRLElBQUksb0JBQW9CLENBQUMsUUFBUSxDQUFDLENBQUM7RUFDdkUsWUFBWSxvQkFBb0IsQ0FBQyxHQUFHLENBQUM7RUFDckMsTUFBTSxDQUFDO0VBQ1AsS0FBSztFQUNMLEVBQUUsQ0FBQztFQUNILENBQUM7O0FDdEJELDBCQUFlLE9BQU87RUFDdEIsRUFBRSxJQUFJLEVBQUUsZ0JBQWdCLElBQUksZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRztFQUN2RCxFQUFFLFNBQVMsRUFBRSxDQUFDLGdCQUFnQixFQUFFLEVBQUUsU0FBUyxFQUFFLEtBQUs7RUFDbEQsSUFBSSxNQUFNLGFBQWEsR0FBRyxZQUFZLENBQUMsZ0JBQWdCLEVBQUUsU0FBUyxFQUFDO0FBQ25FO0VBQ0EsSUFBSSxPQUFPO0VBQ1gsTUFBTSxnQkFBZ0IsRUFBRSxhQUFhLENBQUMsZ0JBQWdCO0VBQ3RELE1BQU0sY0FBYyxFQUFFLEdBQUc7RUFDekIsUUFBUSxlQUFlLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBRSxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUM7RUFDOUQsWUFBWSxhQUFhLENBQUMsU0FBUztFQUNuQyxZQUFZLEVBQUU7RUFDZCxLQUFLO0VBQ0wsRUFBRSxDQUFDO0VBQ0gsQ0FBQzs7QUNqQkQsa0JBQWUsT0FBTztFQUN0QixFQUFFLElBQUksRUFBRSxnQkFBZ0IsSUFBSSxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHO0VBQ3ZELEVBQUUsU0FBUyxFQUFFLENBQUMsZ0JBQWdCLEVBQUUsRUFBRSxTQUFTLEVBQUUsTUFBTTtFQUNuRCxJQUFJLGdCQUFnQixFQUFFLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxHQUFHLFNBQVMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDO0VBQ2hILElBQUksY0FBYyxFQUFFLFNBQVM7RUFDN0IsR0FBRyxDQUFDO0VBQ0osQ0FBQzs7QUNORCwwQkFBZSxPQUFPO0VBQ3RCLEVBQUUsSUFBSSxFQUFFLGdCQUFnQixJQUFJLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUc7RUFDdkQsRUFBRSxTQUFTLEVBQUUsQ0FBQyxnQkFBZ0IsRUFBRSxNQUFNLEtBQUs7RUFDM0MsSUFBSSxNQUFNLHFCQUFxQixHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLE9BQU07RUFDN0QsSUFBSSxNQUFNLGFBQWEsR0FBRyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsR0FBRyxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFDO0VBQzlFLElBQUksSUFBSSxhQUFhLEdBQUcsQ0FBQztFQUN6QixNQUFNLE1BQU0sSUFBSSxLQUFLLENBQUMsQ0FBQywyQkFBMkIsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN4RTtFQUNBLElBQUksTUFBTSxFQUFFLFlBQVksRUFBRSxVQUFVLEVBQUUsR0FBRyxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLGFBQWEsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUM7QUFDaEc7RUFDQSxJQUFJLE1BQU0sQ0FBQyxTQUFTLENBQUMsS0FBSyxHQUFHLGFBQVk7RUFDekMsSUFBSSxNQUFNLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBRyxXQUFVO0VBQ3JDO0VBQ0EsSUFBSSxPQUFPO0VBQ1gsTUFBTSxnQkFBZ0IsRUFBRSxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsYUFBYSxHQUFHLENBQUMsR0FBRyxxQkFBcUIsQ0FBQztFQUM3RixNQUFNLGNBQWMsRUFBRSxTQUFTO0VBQy9CLEtBQUs7RUFDTCxFQUFFLENBQUM7RUFDSCxDQUFDOztBQ1ZELHdCQUFlLENBQUMsSUFBSSxFQUFFLFVBQVU7RUFDaEMsRUFBRUEsWUFBZSxDQUFDO0VBQ2xCLElBQUksSUFBSTtFQUNSLElBQUksU0FBUyxFQUFFLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFO0VBQ3pDLHVCQUFJQyxRQUFpQjtFQUNyQixJQUFJLFlBQVksRUFBRTtFQUNsQixNQUFNLGNBQWMsRUFBRUMsY0FBeUIsQ0FBQyxVQUFVLENBQUM7RUFDM0QsTUFBTSxPQUFPLEVBQUVDLE9BQWtCLEVBQUU7RUFDbkMsTUFBTSxlQUFlLEVBQUVDLGVBQTBCLEVBQUU7RUFDbkQsTUFBTSxPQUFPLEVBQUVDLE9BQWtCLEVBQUU7RUFDbkMsTUFBTSwwQkFBMEIsRUFBRUMsZUFBMEIsRUFBRTtFQUM5RCxLQUFLO0VBQ0wsR0FBRzs7RUNLSCxNQUFNLEtBQUssR0FBRyxDQUFDLFFBQW9DLEtBQXlCO01BQ3hFLE9BQU8sQ0FBQyxRQUFzQyxLQUEwQjtVQUNwRSxNQUFNLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxHQUFHLFFBQVEsQ0FBQyxTQUFTOztVQUd6QyxNQUFNLHFCQUFxQixHQUFHLElBQUksTUFBTSxDQUFDLENBQUEsUUFBQSxFQUFXLEtBQUssQ0FBQSxDQUFFLEVBQUUsR0FBRyxDQUFDO1VBQ2pFLE1BQU0sbUJBQW1CLEdBQUssSUFBSSxNQUFNLENBQUMsQ0FBQSxFQUFHLEdBQUcsQ0FBQSxPQUFBLENBQVMsRUFBRSxHQUFHLENBQUM7O0VBRTlELFFBQUEsTUFBTSxPQUFPLEdBQUcsSUFBSSxNQUFNLENBQUMsQ0FBQSxDQUFBLEVBQUksS0FBSyxDQUFBLDJCQUFBLEVBQThCLEdBQUcsQ0FBQSxDQUFBLENBQUcsRUFBRSxHQUFHLENBQUM7RUFFOUUsUUFBQSxNQUFNLElBQUksR0FBRyxDQUFDLFFBQVEsWUFBWSxtQkFBbUIsR0FBRyxRQUFRLENBQUMsU0FBUyxHQUFHLFFBQVE7RUFDaEYsYUFBQSxPQUFPLENBQUMscUJBQXFCLEVBQUUsS0FBSztFQUNwQyxhQUFBLE9BQU8sQ0FBQyxtQkFBbUIsRUFBRSxHQUFHO0VBQ2hDLGFBQUEsT0FBTyxDQUFDLE9BQU8sRUFBRSxRQUFRLENBQUM7RUFHL0IsUUFBQSxPQUFPLFFBQVEsQ0FBQyxJQUFJLENBQUM7RUFDekIsSUFBQSxDQUFDO0VBQ0wsQ0FBQztFQUVEOzs7Ozs7O0VBT0c7RUFDSCxNQUFNLEtBQUssR0FBRyxDQUFDLElBQWlCLEtBQWlCO0VBQzdDLElBQUEsT0FBTyxDQUFDLFFBQThCLEVBQUUsR0FBRyxNQUFpQixLQUFJO1VBQzVELE9BQU8sSUFBSSxDQUFDQyx3Q0FBc0IsQ0FBQyxRQUFRLENBQUMsRUFBRSxHQUFHLE1BQU0sQ0FBQztFQUM1RCxJQUFBLENBQUM7RUFDTCxDQUFDO0VBSUQsU0FBUyx5QkFBeUIsQ0FBQyxJQUFhLEVBQUUsSUFBYyxFQUFBO01BQzVELE1BQU0sU0FBUyxHQUFHLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFO0VBQzVDLElBQUEsSUFBSSxXQUF1QztFQUMzQyxJQUFBLElBQUksVUFBVSxLQUFLLE9BQU8sSUFBSSxFQUFFO1VBQzVCLFdBQVcsR0FBRyxhQUFhLENBQUMsS0FBSyxDQUFDLElBQW1CLENBQUMsRUFBRSxJQUEwQixDQUErQjtFQUNqSCxRQUFBLFdBQVcsQ0FBQyxTQUFTLEdBQUcsU0FBUztNQUNyQztXQUFPO0VBQ0gsUUFBQSxNQUFNLEVBQUUsSUFBSSxFQUFFLEdBQUcsSUFBOEI7RUFDL0MsUUFBQSxNQUFNLE1BQU0sR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDO2NBQ3pCLFNBQVM7RUFDVCxZQUFBLFlBQVksRUFBRSxFQUFFO1dBQ25CLEVBQUUsSUFBSSxFQUFFLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFvQjtFQUNsRCxRQUFBLFdBQVcsR0FBRyxZQUFZLENBQUMsTUFBTSxDQUErQjtFQUNoRSxRQUFBLFdBQVcsQ0FBQyxTQUFTLEdBQUcsTUFBTSxDQUFDLFNBQVU7TUFDN0M7RUFDQSxJQUFBLE9BQU8sS0FBSyxDQUFDLFdBQVcsQ0FBQztFQUM3QjtBQUVBLFFBQU0sV0FBVyxHQU9iO01BQ0EsUUFBUTtNQUNSLGNBQWM7TUFDZCxPQUFPO01BQ1AsZUFBZTtNQUNmLE9BQU87TUFDUCxlQUFlOzs7RUM1Rm5COzs7RUFHRztFQUVJLE1BQU0sUUFBUSxHQUFHLENBQUMsTUFBTSxDQUFDO0VBQ3pCLE1BQU0sZUFBZSxHQUFHLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUM7RUFDdkMsTUFBTSxnQkFBZ0IsR0FBRztNQUM5QixHQUFHO01BQ0gsR0FBRztNQUNILEdBQUc7TUFDSCxHQUFHO01BQ0gsR0FBRztNQUNILEdBQUc7TUFDSCxHQUFHO01BQ0gsSUFBSTtNQUNKLElBQUk7TUFDSixHQUFHO01BQ0gsR0FBRztNQUNILElBQUk7TUFDSixJQUFJO01BQ0osSUFBSTtNQUNKLElBQUk7TUFDSixJQUFJO01BQ0osR0FBRztNQUNILEtBQUs7TUFDTCxLQUFLO01BQ0wsR0FBRztNQUNILElBQUk7R0FDTDtFQUVNLE1BQU0sVUFBVSxHQUEyQjtFQUNoRCxJQUFBLEdBQUcsRUFBRSxDQUFDO0VBQ04sSUFBQSxHQUFHLEVBQUUsQ0FBQztFQUNOLElBQUEsR0FBRyxFQUFFLENBQUM7RUFDTixJQUFBLEdBQUcsRUFBRSxDQUFDO0VBQ04sSUFBQSxHQUFHLEVBQUUsQ0FBQztFQUNOLElBQUEsR0FBRyxFQUFFLENBQUM7RUFFTixJQUFBLElBQUksRUFBRSxDQUFDO0VBQ1AsSUFBQSxHQUFHLEVBQUUsQ0FBQztFQUNOLElBQUEsSUFBSSxFQUFFLENBQUM7RUFDUCxJQUFBLElBQUksRUFBRSxDQUFDO0VBQ1AsSUFBQSxJQUFJLEVBQUUsQ0FBQztFQUNQLElBQUEsR0FBRyxFQUFFLENBQUM7RUFDTixJQUFBLEdBQUcsRUFBRSxDQUFDO0VBQ04sSUFBQSxHQUFHLEVBQUUsQ0FBQzs7RUFHTixJQUFBLElBQUksRUFBRSxDQUFDO0VBQ1AsSUFBQSxJQUFJLEVBQUUsQ0FBQztFQUNQLElBQUEsS0FBSyxFQUFFLENBQUM7RUFDUixJQUFBLEtBQUssRUFBRSxDQUFDOztFQUdSLElBQUEsSUFBSSxFQUFFLEVBQUU7RUFDUixJQUFBLEdBQUcsRUFBRSxFQUFFO0VBQ1AsSUFBQSxJQUFJLEVBQUUsRUFBRTtFQUNSLElBQUEsR0FBRyxFQUFFLEVBQUU7O0VBR1AsSUFBQSxHQUFHLEVBQUUsRUFBRTtFQUNQLElBQUEsR0FBRyxFQUFFLEVBQUU7O0VBR1AsSUFBQSxHQUFHLEVBQUUsRUFBRTtFQUNQLElBQUEsR0FBRyxFQUFFLEVBQUU7RUFDUCxJQUFBLEdBQUcsRUFBRSxFQUFFOztFQUdQLElBQUEsR0FBRyxFQUFFLEVBQUU7RUFDUCxJQUFBLEdBQUcsRUFBRSxFQUFFO0VBQ1AsSUFBQSxHQUFHLEVBQUUsRUFBRTtNQUNQLEdBQUcsRUFBRSxFQUFFO0dBQ1I7RUFFTSxNQUFNLGtCQUFrQixHQUFHLEVBQUU7O0VDNUVwQzs7O0VBR0c7RUFJSCxNQUFNLGFBQWEsR0FBRyxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7RUFDdEUsTUFBTSxlQUFlLEdBQUcsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDO0VBUXRDLElBQVksSUFZWDtFQVpELENBQUEsVUFBWSxJQUFJLEVBQUE7RUFDZCxJQUFBLElBQUEsQ0FBQSxJQUFBLENBQUEsUUFBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBLEdBQUEsUUFBVTtFQUNWLElBQUEsSUFBQSxDQUFBLElBQUEsQ0FBQSxZQUFBLENBQUEsR0FBQSxDQUFBLENBQUEsR0FBQSxZQUFjO0VBQ2QsSUFBQSxJQUFBLENBQUEsSUFBQSxDQUFBLEtBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQSxHQUFBLEtBQU87RUFDUCxJQUFBLElBQUEsQ0FBQSxJQUFBLENBQUEsT0FBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBLEdBQUEsT0FBUztFQUNULElBQUEsSUFBQSxDQUFBLElBQUEsQ0FBQSxPQUFBLENBQUEsR0FBQSxDQUFBLENBQUEsR0FBQSxPQUFTO0VBQ1QsSUFBQSxJQUFBLENBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQSxHQUFBLFNBQVc7RUFDWCxJQUFBLElBQUEsQ0FBQSxJQUFBLENBQUEsU0FBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBLEdBQUEsU0FBVztFQUNYLElBQUEsSUFBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLENBQUEsR0FBQSxDQUFBLENBQUEsR0FBQSxVQUFZO0VBQ1osSUFBQSxJQUFBLENBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQSxHQUFBLFNBQVc7RUFDWCxJQUFBLElBQUEsQ0FBQSxJQUFBLENBQUEsU0FBQSxDQUFBLEdBQUEsRUFBQSxDQUFBLEdBQUEsU0FBWTtFQUNaLElBQUEsSUFBQSxDQUFBLElBQUEsQ0FBQSxPQUFBLENBQUEsR0FBQSxFQUFBLENBQUEsR0FBQSxPQUFVO0VBQ1osQ0FBQyxFQVpXLElBQUksS0FBSixJQUFJLEdBQUEsRUFBQSxDQUFBLENBQUE7RUFjVCxNQUFNLEtBQUssR0FBRyxDQUFDLElBQVUsRUFBRSxLQUFhLEVBQUUsVUFBQSxHQUFxQixDQUFDLE1BQU07TUFDM0UsSUFBSTtNQUNKLEtBQUs7TUFDTCxVQUFVO0VBQ1gsQ0FBQSxDQUFDO0VBRUYsTUFBTSxhQUFhLEdBQUcsQ0FBQyxFQUFVLEtBQy9CLEVBQUUsS0FBSyxDQUFDO01BQ1IsRUFBRSxLQUFLLEVBQUU7TUFDVCxFQUFFLEtBQUssRUFBRTtFQUNULElBQUEsRUFBRSxLQUFLLEVBQUUsQ0FBQztFQUVaO0VBQ0EsTUFBTSxzQkFBc0IsR0FBRyxDQUFDLEVBQVUsS0FDeEMsRUFBRSxLQUFLLEVBQUU7TUFDVCxFQUFFLEtBQUssRUFBRTs7OztFQUlULEtBQUMsQ0FBQyxFQUFFLElBQUksR0FBRyxHQUFHLEVBQUUsWUFBWSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO0VBRTlDO0VBQ0EsTUFBTSxhQUFhLEdBQUcsQ0FBQyxFQUFVLEtBQy9CLHNCQUFzQixDQUFDLEVBQUUsQ0FBQyxJQUFJLFNBQVMsQ0FBQyxFQUFFLENBQUM7RUFFN0MsTUFBTSxVQUFVLEdBQUcsQ0FBQyxHQUFXLEtBQUssUUFBUSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFO0VBRWhFLE1BQU0sUUFBUSxHQUFHLENBQUMsRUFBVSxLQUFLLEVBQUUsS0FBSyxFQUFFLFlBQVksRUFBRSxLQUFLLEVBQUUsQ0FBQztFQUVoRSxNQUFNLFNBQVMsR0FBRyxDQUFDLEVBQVUsS0FBSyxFQUFFLFlBQVksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLENBQUM7RUFFL0QsTUFBTSxXQUFXLEdBQUcsQ0FBQyxFQUFVLEtBQzdCLEVBQUUsS0FBSyxFQUFFO01BQ1QsRUFBRSxLQUFLLEVBQUU7TUFDVCxFQUFFLEtBQUssRUFBRTtNQUNULEVBQUUsS0FBSyxFQUFFO01BQ1QsRUFBRSxLQUFLLEVBQUU7TUFDVCxFQUFFLEtBQUssRUFBRTtNQUNULEVBQUUsS0FBSyxFQUFFO01BQ1QsRUFBRSxLQUFLLEVBQUU7TUFDVCxFQUFFLEtBQUssRUFBRTtNQUNULEVBQUUsS0FBSyxFQUFFO01BQ1QsRUFBRSxLQUFLLEVBQUU7TUFDVCxFQUFFLEtBQUssRUFBRTtFQUNULElBQUEsRUFBRSxLQUFLLEdBQUcsQ0FBQztFQUViLE1BQU0sVUFBVSxHQUFHLENBQUMsRUFBVSxLQUM1QixFQUFFLEtBQUssRUFBRTtNQUNULEVBQUUsS0FBSyxFQUFFO01BQ1QsRUFBRSxLQUFLLEVBQUU7TUFDVCxFQUFFLEtBQUssRUFBRTtNQUNULEVBQUUsS0FBSyxHQUFHO0VBQ1YsSUFBQSxFQUFFLEtBQUssR0FBRyxDQUFDO0VBRWIsTUFBTSxhQUFhLEdBQUcsQ0FBQyxHQUFXLEtBQ2hDLEdBQUcsQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUMsTUFBTSxFQUFFLEtBQUssS0FBSTtNQUN0QyxRQUFRLEtBQUs7RUFDWCxRQUFBLEtBQUssR0FBRztFQUNOLFlBQUEsT0FBTyxJQUFJO0VBQ2IsUUFBQSxLQUFLLEdBQUc7RUFDTixZQUFBLE9BQU8sSUFBSTtFQUNiLFFBQUEsS0FBSyxHQUFHO0VBQ04sWUFBQSxPQUFPLElBQUk7RUFDYixRQUFBLEtBQUssR0FBRztFQUNOLFlBQUEsT0FBTyxJQUFJO0VBQ2IsUUFBQSxLQUFLLEdBQUc7RUFDTixZQUFBLE9BQU8sSUFBSTtFQUNiLFFBQUE7RUFDRSxZQUFBLE9BQU8sS0FBSzs7RUFFbEIsQ0FBQyxDQUFDO1FBRVMsU0FBUyxDQUFBO0VBQ1osSUFBQSxNQUFNO01BQ04sTUFBTSxHQUFHLEVBQUU7TUFDWCxXQUFXLEdBQUcsQ0FBQztFQUNmLElBQUEsS0FBSztFQUViLElBQUEsV0FBQSxDQUFZLEtBQWEsRUFBQTtFQUN2QixRQUFBLElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSztVQUNuQixJQUFJLENBQUMsUUFBUSxFQUFFO01BQ2pCO01BRUEsU0FBUyxHQUFBO0VBQ1AsUUFBQSxPQUFPLGFBQWEsQ0FBQyxJQUFJLENBQUMsS0FBTSxDQUFDLEVBQUU7RUFDakMsWUFBQSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQztVQUNyQjtFQUNBLFFBQUEsSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQU0sQ0FBQztFQUFFLFlBQUEsT0FBTyxJQUFJLENBQUMsZUFBZSxFQUFFO0VBQ3hELFFBQUEsSUFBSSxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsS0FBTSxDQUFDLEVBQUU7RUFDdkMsWUFBQSxPQUFPLElBQUksQ0FBQyx1QkFBdUIsRUFBRTtVQUN2QztFQUNBLFFBQUEsSUFBSSxTQUFTLENBQUMsSUFBSSxDQUFDLEtBQU0sQ0FBQztFQUFFLFlBQUEsT0FBTyxJQUFJLENBQUMsZUFBZSxFQUFFO0VBQ3pELFFBQUEsSUFBSSxJQUFJLENBQUMsS0FBSyxLQUFLLEVBQUU7RUFBVSxZQUFBLE9BQU8sSUFBSSxDQUFDLFlBQVksRUFBRTtFQUN6RCxRQUFBLElBQUksSUFBSSxDQUFDLEtBQUssS0FBSyxFQUFFO0VBQVUsWUFBQSxPQUFPLElBQUksQ0FBQyxjQUFjLEVBQUU7RUFDM0QsUUFBQSxJQUFJLElBQUksQ0FBQyxLQUFLLEtBQUssRUFBRTtFQUFVLFlBQUEsT0FBTyxJQUFJLENBQUMsY0FBYyxFQUFFO0VBQzNELFFBQUEsSUFBSSxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQU0sQ0FBQztFQUFFLFlBQUEsT0FBTyxJQUFJLENBQUMsaUJBQWlCLEVBQUU7RUFDN0QsUUFBQSxJQUFJLFVBQVUsQ0FBQyxJQUFJLENBQUMsS0FBTSxDQUFDO0VBQUUsWUFBQSxPQUFPLElBQUksQ0FBQyxnQkFBZ0IsRUFBRTs7VUFFM0QsSUFBSSxDQUFDLFFBQVEsRUFBRTtFQUNmLFFBQUEsSUFBSSxJQUFJLENBQUMsS0FBSyxLQUFLLFNBQVMsRUFBRTtjQUM1QixNQUFNLElBQUksS0FBSyxDQUFDLENBQUEsMkJBQUEsRUFBOEIsSUFBSSxDQUFDLEtBQUssQ0FBQSxDQUFFLENBQUM7VUFDN0Q7RUFDQSxRQUFBLE9BQU8sU0FBUztNQUNsQjtFQUVRLElBQUEsUUFBUSxDQUFDLGVBQXlCLEVBQUE7VUFDeEMsSUFBSSxDQUFDLE1BQU0sRUFBRTtVQUNiLElBQUksSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRTtFQUNwQyxZQUFBLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQztFQUNoRCxZQUFBLElBQUksZUFBZSxLQUFLLElBQUksRUFBRTtFQUM1QixnQkFBQSxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxNQUFNO2NBQ2hDO1VBQ0Y7ZUFBTztFQUNMLFlBQUEsSUFBSSxDQUFDLEtBQUssR0FBRyxTQUFTO1VBQ3hCO01BQ0Y7TUFFUSxTQUFTLENBQUMsWUFBb0IsQ0FBQyxFQUFBO0VBQ3JDLFFBQUEsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsTUFBTSxHQUFHLFNBQVMsQ0FBQztFQUMxRSxRQUFBLElBQUksU0FBUyxLQUFLLENBQUMsRUFBRTtjQUNuQixJQUFJLENBQUMsV0FBVyxFQUFFO1VBQ3BCO0VBQ0EsUUFBQSxPQUFPLENBQUM7TUFDVjtNQUVRLFdBQVcsR0FBQTtFQUNqQixRQUFBLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLE1BQU07TUFDaEM7TUFFUSxlQUFlLEdBQUE7VUFDckIsTUFBTSxHQUFHLEdBQUcscUJBQXFCO0VBQ2pDLFFBQUEsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLEtBQUs7RUFDNUIsUUFBQSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQztFQUNuQixRQUFBLE9BQU8sSUFBSSxDQUFDLEtBQUssS0FBSyxTQUFTLEVBQUU7RUFDL0IsWUFBQSxJQUFJLElBQUksQ0FBQyxLQUFLLEtBQUssU0FBUztFQUFFLGdCQUFBLE1BQU0sSUFBSSxLQUFLLENBQUMsR0FBRyxDQUFDO2NBQ2xELElBQUksSUFBSSxDQUFDLEtBQUssS0FBSyxFQUFFLFVBQVU7a0JBQzdCLElBQUksQ0FBQyxRQUFRLEVBQUU7RUFDZixnQkFBQSxJQUFJLElBQUksQ0FBQyxLQUFLLEtBQUssU0FBUztFQUFFLG9CQUFBLE1BQU0sSUFBSSxLQUFLLENBQUMsR0FBRyxDQUFDO2NBQ3BEO2NBQ0EsSUFBSSxDQUFDLFFBQVEsRUFBRTtVQUNqQjtFQUNBLFFBQUEsTUFBTSxDQUFDLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsYUFBYSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDO1VBQzdELElBQUksQ0FBQyxRQUFRLEVBQUU7RUFDZixRQUFBLE9BQU8sQ0FBQztNQUNWO01BRVEsdUJBQXVCLEdBQUE7OztFQUc3QixRQUFBLEdBQUc7Y0FDRCxJQUFJLENBQUMsUUFBUSxFQUFFO0VBQ2pCLFFBQUEsQ0FBQyxRQUFRLGFBQWEsQ0FBQyxJQUFJLENBQUMsS0FBTSxDQUFDO0VBQ25DLFFBQUEsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFNBQVMsRUFBRTtFQUM5QixRQUFBLE1BQU0sSUFBSSxHQUFHLFVBQVUsQ0FBQyxLQUFLLENBQUMsR0FBRyxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxVQUFVO0VBQy9ELFFBQUEsT0FBTyxLQUFLLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQztNQUMzQjtNQUVRLGVBQWUsR0FBQTs7O0VBR3JCLFFBQUEsR0FBRztjQUNELElBQUksQ0FBQyxRQUFRLEVBQUU7RUFDakIsUUFBQSxDQUFDLFFBQVEsU0FBUyxDQUFDLElBQUksQ0FBQyxLQUFNLENBQUM7RUFDL0IsUUFBQSxJQUFJLElBQUksQ0FBQyxLQUFLLEtBQUssRUFBRTtFQUFVLFlBQUEsT0FBTyxJQUFJLENBQUMsWUFBWSxFQUFFO1VBQ3pELE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO01BQzlDO01BRVEsWUFBWSxHQUFBO1VBQ2xCLElBQUksQ0FBQyxRQUFRLEVBQUU7RUFDZixRQUFBLElBQUksU0FBUyxDQUFDLElBQUksQ0FBQyxLQUFNLENBQUM7RUFBRSxZQUFBLE9BQU8sSUFBSSxDQUFDLGlCQUFpQixFQUFFO1VBQzNELElBQUksQ0FBQyxXQUFXLEVBQUU7VUFDbEIsT0FBTyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsa0JBQWtCLENBQUM7TUFDakQ7TUFFUSxjQUFjLEdBQUE7RUFDcEIsUUFBQSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQztVQUNuQixPQUFPLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQztNQUMvQjtNQUVRLGNBQWMsR0FBQTtFQUNwQixRQUFBLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDO1VBQ25CLE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDO01BQy9CO01BRVEsaUJBQWlCLEdBQUE7OztFQUd2QixRQUFBLEdBQUc7Y0FDRCxJQUFJLENBQUMsUUFBUSxFQUFFO0VBQ2pCLFFBQUEsQ0FBQyxRQUFRLFNBQVMsQ0FBQyxJQUFJLENBQUMsS0FBTSxDQUFDO1VBQy9CLE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO01BQzlDO01BRVEsaUJBQWlCLEdBQUE7VUFDdkIsSUFBSSxDQUFDLFFBQVEsRUFBRTtVQUNmLElBQUksRUFBRSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1VBRTFCLElBQUksZUFBZSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsS0FBSyxFQUFFLEVBQUU7Y0FDdEMsSUFBSSxDQUFDLFFBQVEsRUFBRTtjQUNmLElBQUksQ0FBQyxRQUFRLEVBQUU7VUFDakI7ZUFBTztFQUNMLFlBQUEsRUFBRSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO0VBQ3RCLFlBQUEsSUFBSSxFQUFFLEtBQUssSUFBSSxFQUFFO2tCQUNmLElBQUksQ0FBQyxRQUFRLEVBQUU7a0JBQ2YsT0FBTyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUM7Y0FDOUI7Y0FDQSxJQUFJLGFBQWEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLEtBQUssRUFBRSxFQUFFO2tCQUNwQyxJQUFJLENBQUMsUUFBUSxFQUFFO2NBQ2pCO1VBQ0Y7RUFDQSxRQUFBLEVBQUUsR0FBRyxJQUFJLENBQUMsU0FBUyxFQUFFO0VBQ3JCLFFBQUEsT0FBTyxLQUFLLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxFQUFFLEVBQUUsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDO01BQ2pEO01BRVEsZ0JBQWdCLEdBQUE7VUFDdEIsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsS0FBTSxDQUFDO0VBQzlDLFFBQUEsTUFBTSxDQUFDLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsS0FBSyxFQUFFLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQztFQUN2RCxRQUFBLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDO0VBQ25CLFFBQUEsT0FBTyxDQUFDO01BQ1Y7RUFDRDs7RUMxUEQ7OztFQUdHO0VBWUksTUFBTSxLQUFLLEdBQUcsQ0FDbkIsSUFBWSxFQUNaLFVBQXlCLEtBQ1AsSUFBSSxNQUFNLENBQUksSUFBSSxFQUFFLFVBQVUsQ0FBQyxDQUFDLEtBQUssRUFBRTtRQUU5QyxNQUFNLENBQUE7RUFDVCxJQUFBLEtBQUs7RUFDTCxJQUFBLFVBQVU7RUFDVixJQUFBLElBQUk7RUFDSixJQUFBLE1BQU07RUFDTixJQUFBLE1BQU07TUFFZCxXQUFBLENBQVksS0FBYSxFQUFFLFVBQXlCLEVBQUE7VUFDbEQsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLFNBQVMsQ0FBQyxLQUFLLENBQUM7RUFDdEMsUUFBQSxJQUFJLENBQUMsSUFBSSxHQUFHLFVBQVU7TUFDeEI7TUFFQSxLQUFLLEdBQUE7VUFDSCxJQUFJLENBQUMsUUFBUSxFQUFFO0VBQ2YsUUFBQSxPQUFPLElBQUksQ0FBQyxnQkFBZ0IsRUFBRTtNQUNoQztNQUVRLFFBQVEsQ0FBQyxJQUFXLEVBQUUsS0FBYyxFQUFBO1VBQzFDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsRUFBRTtjQUMvQixNQUFNLElBQUksS0FBSyxDQUNiLENBQUEsY0FBQSxFQUFpQixJQUFJLENBQUEsRUFBQSxFQUFLLEtBQUssVUFBVSxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksS0FBSyxJQUFJLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQSxDQUFBLENBQUcsQ0FDckY7VUFDSDtVQUNBLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsU0FBUyxFQUFFO0VBQ3JDLFFBQUEsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDO0VBQ2YsUUFBQSxJQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsRUFBRSxJQUFJO0VBQ3BCLFFBQUEsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsS0FBSztNQUN4QjtNQUVBLFFBQVEsQ0FBQyxJQUFXLEVBQUUsS0FBYyxFQUFBO1VBQ2xDLE9BQU8sRUFBRSxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsS0FBSyxLQUFLLElBQUksTUFBTSxLQUFLLElBQUksSUFBSSxDQUFDLE1BQU0sS0FBSyxLQUFLLENBQUMsQ0FBQztNQUM3RTtNQUVRLGdCQUFnQixHQUFBO1VBQ3RCLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTTtFQUFFLFlBQUEsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRTtFQUMxQyxRQUFBLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxXQUFXLEVBQUU7RUFDL0IsUUFBQSxPQUFPLElBQUksS0FBSyxTQUFTLEdBQUcsU0FBUyxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO01BQ3hFOzs7O01BS1EsZ0JBQWdCLENBQUMsSUFBbUIsRUFBRSxVQUFrQixFQUFBO0VBQzlELFFBQUEsSUFBSSxJQUFJLEtBQUssU0FBUyxFQUFFO0VBQ3RCLFlBQUEsTUFBTSxJQUFJLEtBQUssQ0FBQyw4QkFBOEIsQ0FBQztVQUNqRDtFQUNBLFFBQUEsT0FBTyxJQUFJLENBQUMsTUFBTSxFQUFFO2NBQ2xCLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxFQUFFO0VBQ3BDLGdCQUFBLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxlQUFlLEVBQUU7RUFDbkMsZ0JBQUEsSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDO2NBQ2hEO21CQUFPLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxFQUFFO0VBQzNDLGdCQUFBLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxXQUFXLEVBQUU7a0JBQ3BDLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDO2NBQ3pDO21CQUFPLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUU7a0JBQ2xDLElBQUksQ0FBQyxRQUFRLEVBQUU7RUFDZixnQkFBQSxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsV0FBVyxFQUFFO2tCQUNoQyxJQUFJLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksRUFBRSxLQUFLLENBQUM7Y0FDOUM7bUJBQU8sSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRTtrQkFDdEM7Y0FDRjtFQUFPLGlCQUFBLElBQ0wsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDO0VBQzVCLGdCQUFBLElBQUksQ0FBQyxNQUFNLENBQUMsVUFBVSxJQUFJLFVBQVUsRUFDcEM7a0JBQ0EsSUFBSTtzQkFDRixJQUFJLENBQUMsTUFBTSxLQUFLO0VBQ2QsMEJBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJOzRCQUN2QixJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDO2NBQzVDO21CQUFPO2tCQUNMO2NBQ0Y7VUFDRjtFQUNBLFFBQUEsT0FBTyxJQUFJO01BQ2I7TUFFUSxtQkFBbUIsQ0FBQyxJQUFPLEVBQUUsS0FBb0IsRUFBQTtFQUN2RCxRQUFBLElBQUksS0FBSyxLQUFLLFNBQVMsRUFBRTtFQUN2QixZQUFBLE1BQU0sSUFBSSxLQUFLLENBQUMscUJBQXFCLENBQUM7VUFDeEM7RUFDQSxRQUFBLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxJQUFJLEVBQUU7RUFDdkIsWUFBQSxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRyxLQUFZLENBQUMsS0FBSyxDQUFDO1VBQ3BEO0VBQU8sYUFBQSxJQUNMLEtBQUssQ0FBQyxJQUFJLEtBQUssUUFBUTtFQUN0QixZQUFBLEtBQWdCLENBQUMsUUFBUSxDQUFDLElBQUksS0FBSyxJQUFJLEVBQ3hDO0VBQ0EsWUFBQSxNQUFNLE1BQU0sR0FBSSxLQUFnQixDQUFDLFFBQWM7RUFDL0MsWUFBQSxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUNyQixJQUFJLEVBQ0osTUFBTSxDQUFDLEtBQUssRUFDWCxLQUFnQixDQUFDLFNBQWdCLENBQ25DO1VBQ0g7ZUFBTztFQUNMLFlBQUEsTUFBTSxJQUFJLEtBQUssQ0FBQyx3QkFBd0IsS0FBSyxDQUFBLENBQUUsQ0FBQztVQUNsRDtNQUNGO01BRVEsWUFBWSxDQUFDLElBQU8sRUFBRSxFQUFTLEVBQUE7RUFDckMsUUFBQSxJQUFJLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFO2NBQzdDLE1BQU0sSUFBSSxLQUFLLENBQUMsQ0FBQSxrQkFBQSxFQUFxQixFQUFFLENBQUMsS0FBSyxDQUFBLENBQUUsQ0FBQztVQUNsRDtVQUNBLElBQUksQ0FBQyxRQUFRLEVBQUU7RUFDZixRQUFBLElBQUksS0FBSyxHQUFHLElBQUksQ0FBQyxXQUFXLEVBQUU7RUFDOUIsUUFBQSxPQUNFLENBQUMsSUFBSSxDQUFDLEtBQUssS0FBSyxJQUFJLENBQUMsUUFBUTtFQUMzQixZQUFBLElBQUksQ0FBQyxLQUFLLEtBQUssSUFBSSxDQUFDLEdBQUc7RUFDdkIsWUFBQSxJQUFJLENBQUMsS0FBSyxLQUFLLElBQUksQ0FBQyxPQUFPO2NBQzdCLElBQUksQ0FBQyxNQUFPLENBQUMsVUFBVSxHQUFHLEVBQUUsQ0FBQyxVQUFVLEVBQ3ZDO0VBQ0EsWUFBQSxLQUFLLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsTUFBTyxDQUFDLFVBQVUsQ0FBQztVQUMvRDtFQUNBLFFBQUEsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUM7TUFDaEQ7TUFFUSxXQUFXLEdBQUE7VUFDakIsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRTtFQUNoQyxZQUFBLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFNO2NBQ3pCLElBQUksQ0FBQyxRQUFRLEVBQUU7OztjQUdmLElBQUksS0FBSyxLQUFLLEdBQUcsSUFBSSxLQUFLLEtBQUssR0FBRyxFQUFFO2tCQUNsQyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFO0VBQy9CLG9CQUFBLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUM7a0JBQ2xDO3VCQUFPLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUU7RUFDdEMsb0JBQUEsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQztrQkFDbEM7Y0FDRjtjQUNBLElBQUksZUFBZSxDQUFDLE9BQU8sQ0FBQyxLQUFNLENBQUMsS0FBSyxFQUFFO0VBQ3hDLGdCQUFBLE1BQU0sSUFBSSxLQUFLLENBQUMscUJBQXFCLEtBQUssQ0FBQSxDQUFFLENBQUM7RUFDL0MsWUFBQSxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQ2hDLElBQUksQ0FBQyxhQUFhLEVBQUUsRUFDcEIsa0JBQWtCLENBQ25CO2NBQ0QsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFNLEVBQUUsSUFBSSxDQUFDO1VBQ3RDO0VBQ0EsUUFBQSxPQUFPLElBQUksQ0FBQyxhQUFhLEVBQUU7TUFDN0I7RUFFUSxJQUFBLGFBQWEsQ0FBQyxTQUFZLEVBQUE7VUFDaEMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQztFQUNqQyxRQUFBLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsRUFBRTtFQUN4QyxRQUFBLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQztFQUN6QixRQUFBLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsRUFBRTtFQUN6QyxRQUFBLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLFFBQVEsRUFBRSxTQUFTLENBQUM7TUFDMUQ7TUFFUSxhQUFhLEdBQUE7RUFDbkIsUUFBQSxRQUFRLElBQUksQ0FBQyxLQUFLO2NBQ2hCLEtBQUssSUFBSSxDQUFDLE9BQU87RUFDZixnQkFBQSxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsTUFBTztFQUM1QixnQkFBQSxJQUFJLE9BQU8sS0FBSyxNQUFNLEVBQUU7c0JBQ3RCLElBQUksQ0FBQyxRQUFRLEVBQUU7O3NCQUVmLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDO2tCQUM5Qjt1QkFBTyxJQUFJLFFBQVEsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxFQUFFO0VBQzNDLG9CQUFBLE1BQU0sSUFBSSxLQUFLLENBQUMsdUJBQXVCLE9BQU8sQ0FBQSxDQUFFLENBQUM7a0JBQ25EO0VBQ0EsZ0JBQUEsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsT0FBTyxDQUFBLENBQUUsQ0FBQztjQUNyRCxLQUFLLElBQUksQ0FBQyxVQUFVO0VBQ2xCLGdCQUFBLE9BQU8sSUFBSSxDQUFDLHdCQUF3QixFQUFFO2NBQ3hDLEtBQUssSUFBSSxDQUFDLE1BQU07RUFDZCxnQkFBQSxPQUFPLElBQUksQ0FBQyxZQUFZLEVBQUU7Y0FDNUIsS0FBSyxJQUFJLENBQUMsT0FBTztFQUNmLGdCQUFBLE9BQU8sSUFBSSxDQUFDLGFBQWEsRUFBRTtjQUM3QixLQUFLLElBQUksQ0FBQyxPQUFPO0VBQ2YsZ0JBQUEsT0FBTyxJQUFJLENBQUMsYUFBYSxFQUFFO2NBQzdCLEtBQUssSUFBSSxDQUFDLE9BQU87RUFDZixnQkFBQSxJQUFJLElBQUksQ0FBQyxNQUFNLEtBQUssR0FBRyxFQUFFO0VBQ3ZCLG9CQUFBLE9BQU8sSUFBSSxDQUFDLHFCQUFxQixFQUFFO2tCQUNyQztFQUFPLHFCQUFBLElBQUksSUFBSSxDQUFDLE1BQU0sS0FBSyxHQUFHLEVBQUU7RUFDOUIsb0JBQUEsT0FBTyxJQUFJLENBQUMsU0FBUyxFQUFFO2tCQUN6QjtFQUFPLHFCQUFBLElBQUksSUFBSSxDQUFDLE1BQU0sS0FBSyxHQUFHLEVBQUU7RUFDOUIsb0JBQUEsT0FBTyxJQUFJLENBQUMsVUFBVSxFQUFFO2tCQUMxQjtFQUNBLGdCQUFBLE9BQU8sU0FBUztjQUNsQixLQUFLLElBQUksQ0FBQyxLQUFLO0VBQ2IsZ0JBQUEsTUFBTSxJQUFJLEtBQUssQ0FBQyxzQkFBc0IsQ0FBQztFQUN6QyxZQUFBO0VBQ0UsZ0JBQUEsT0FBTyxTQUFTOztNQUV0QjtNQUVRLFVBQVUsR0FBQTtVQUNoQixNQUFNLEtBQUssR0FBc0IsRUFBRTtFQUNuQyxRQUFBLEdBQUc7Y0FDRCxJQUFJLENBQUMsUUFBUSxFQUFFO2NBQ2YsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDO2tCQUFFO2NBQ3RDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7VUFDckMsQ0FBQyxRQUFRLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQztVQUNsQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDO1VBQ2hDLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDO01BQzlCO01BRVEsU0FBUyxHQUFBO1VBQ2YsTUFBTSxPQUFPLEdBQW1DLEVBQUU7RUFDbEQsUUFBQSxHQUFHO2NBQ0QsSUFBSSxDQUFDLFFBQVEsRUFBRTtjQUNmLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQztrQkFBRTtFQUN0QyxZQUFBLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxNQUFPO0VBQ3hCLFlBQUEsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsRUFBRTtrQkFDaEUsSUFBSSxDQUFDLFFBQVEsRUFBRTtjQUNqQjtFQUNBLFlBQUEsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDO2NBQ3pCLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLEVBQUU7VUFDeEMsQ0FBQyxRQUFRLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQztVQUNsQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDO1VBQ2hDLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDO01BQy9CO01BRVEsd0JBQXdCLEdBQUE7RUFDOUIsUUFBQSxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsTUFBTTtFQUN6QixRQUFBLElBQUksS0FBSyxLQUFLLE1BQU0sRUFBRTtjQUNwQixJQUFJLENBQUMsUUFBUSxFQUFFO2NBQ2YsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUM7VUFDaEM7RUFDQSxRQUFBLElBQUksS0FBSyxLQUFLLE9BQU8sRUFBRTtjQUNyQixJQUFJLENBQUMsUUFBUSxFQUFFO2NBQ2YsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUM7VUFDakM7RUFDQSxRQUFBLElBQUksS0FBSyxLQUFLLE1BQU0sRUFBRTtjQUNwQixJQUFJLENBQUMsUUFBUSxFQUFFO2NBQ2YsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUM7VUFDaEM7RUFDQSxRQUFBLElBQUksS0FBSyxLQUFLLFdBQVcsRUFBRTtjQUN6QixJQUFJLENBQUMsUUFBUSxFQUFFO2NBQ2YsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUM7VUFDckM7RUFDQSxRQUFBLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsRUFBRTtFQUMxQyxRQUFBLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxlQUFlLEVBQUU7VUFDbkMsT0FBTyxDQUFDLElBQUksR0FBRyxVQUFVLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsVUFBVSxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUM7TUFDM0U7TUFFUSxnQkFBZ0IsR0FBQTtVQUN0QixJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEVBQUU7Y0FDbkMsTUFBTSxJQUFJLEtBQUssQ0FBQyxDQUFBLHFCQUFBLEVBQXdCLElBQUksQ0FBQyxNQUFNLENBQUEsQ0FBRSxDQUFDO1VBQ3hEO0VBQ0EsUUFBQSxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsTUFBTTtVQUN6QixJQUFJLENBQUMsUUFBUSxFQUFFO1VBQ2YsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxLQUFNLENBQUM7TUFDN0I7TUFFUSxlQUFlLEdBQUE7RUFDckIsUUFBQSxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxFQUFFO0VBQ3JDLFlBQUEsT0FBTyxTQUFTO1VBQ2xCO1VBQ0EsTUFBTSxJQUFJLEdBQXlCLEVBQUU7RUFDckMsUUFBQSxHQUFHO2NBQ0QsSUFBSSxDQUFDLFFBQVEsRUFBRTtjQUNmLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxFQUFFO2tCQUNwQztjQUNGO0VBQ0EsWUFBQSxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsZ0JBQWdCLEVBQUU7RUFDcEMsWUFBQSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztVQUNqQixDQUFDLFFBQVEsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDO1VBQ2xDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUM7RUFDaEMsUUFBQSxPQUFPLElBQUk7TUFDYjtNQUVRLFdBQVcsR0FBQTs7VUFFakIsSUFBSSxDQUFDLFFBQVEsRUFBRTtFQUNmLFFBQUEsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixFQUFFO1VBQ3BDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUM7RUFDaEMsUUFBQSxPQUFPLElBQUk7TUFDYjtNQUVRLHFCQUFxQixHQUFBO0VBQzNCLFFBQUEsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLGVBQWUsRUFBRTtVQUMxQyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFO2NBQzdCLElBQUksQ0FBQyxRQUFRLEVBQUU7RUFDZixZQUFBLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsRUFBRTtFQUNwQyxZQUFBLE1BQU0sTUFBTSxHQUFHLFdBQVcsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQU0sQ0FBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUU7Y0FDN0QsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDO1VBQzlDO2VBQU87Y0FDTCxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQztVQUN6QztNQUNGO01BRVEsWUFBWSxHQUFBO0VBQ2xCLFFBQUEsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU8sQ0FBQztVQUM3QyxJQUFJLENBQUMsUUFBUSxFQUFFO0VBQ2YsUUFBQSxPQUFPLEtBQUs7TUFDZDtNQUVRLGFBQWEsQ0FBQyxTQUFpQixFQUFFLEVBQUE7VUFDdkMsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEdBQUcsTUFBTSxDQUFBLEVBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1VBQ3hFLElBQUksQ0FBQyxRQUFRLEVBQUU7RUFDZixRQUFBLE9BQU8sS0FBSztNQUNkO01BRVEsYUFBYSxDQUFDLFNBQWlCLEVBQUUsRUFBQTtFQUN2QyxRQUFBLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFBLEVBQUcsTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUEsQ0FBRSxDQUFDLENBQUM7VUFDdEUsSUFBSSxDQUFDLFFBQVEsRUFBRTtFQUNmLFFBQUEsT0FBTyxLQUFLO01BQ2Q7RUFDRDs7RUN6VEQ7OztFQUdHO0VBS0gsTUFBTSxpQkFBaUIsR0FBNEM7TUFDakUsR0FBRyxFQUFFLENBQUMsQ0FBTSxFQUFFLENBQU0sS0FBSyxDQUFDLEdBQUcsQ0FBQztNQUM5QixHQUFHLEVBQUUsQ0FBQyxDQUFNLEVBQUUsQ0FBTSxLQUFLLENBQUMsR0FBRyxDQUFDO01BQzlCLEdBQUcsRUFBRSxDQUFDLENBQU0sRUFBRSxDQUFNLEtBQUssQ0FBQyxHQUFHLENBQUM7TUFDOUIsR0FBRyxFQUFFLENBQUMsQ0FBTSxFQUFFLENBQU0sS0FBSyxDQUFDLEdBQUcsQ0FBQztNQUM5QixHQUFHLEVBQUUsQ0FBQyxDQUFNLEVBQUUsQ0FBTSxLQUFLLENBQUMsR0FBRyxDQUFDO01BQzlCLElBQUksRUFBRSxDQUFDLENBQU0sRUFBRSxDQUFNLEtBQUssQ0FBQyxJQUFJLENBQUM7TUFDaEMsSUFBSSxFQUFFLENBQUMsQ0FBTSxFQUFFLENBQU0sS0FBSyxDQUFDLElBQUksQ0FBQztNQUNoQyxLQUFLLEVBQUUsQ0FBQyxDQUFNLEVBQUUsQ0FBTSxLQUFLLENBQUMsS0FBSyxDQUFDO01BQ2xDLEtBQUssRUFBRSxDQUFDLENBQU0sRUFBRSxDQUFNLEtBQUssQ0FBQyxLQUFLLENBQUM7TUFDbEMsR0FBRyxFQUFFLENBQUMsQ0FBTSxFQUFFLENBQU0sS0FBSyxDQUFDLEdBQUcsQ0FBQztNQUM5QixJQUFJLEVBQUUsQ0FBQyxDQUFNLEVBQUUsQ0FBTSxLQUFLLENBQUMsSUFBSSxDQUFDO01BQ2hDLEdBQUcsRUFBRSxDQUFDLENBQU0sRUFBRSxDQUFNLEtBQUssQ0FBQyxHQUFHLENBQUM7TUFDOUIsSUFBSSxFQUFFLENBQUMsQ0FBTSxFQUFFLENBQU0sS0FBSyxDQUFDLElBQUksQ0FBQztNQUNoQyxJQUFJLEVBQUUsQ0FBQyxDQUFNLEVBQUUsQ0FBTSxLQUFLLENBQUMsSUFBSSxDQUFDO01BQ2hDLElBQUksRUFBRSxDQUFDLENBQU0sRUFBRSxDQUFNLEtBQUssQ0FBQyxJQUFJLENBQUM7TUFDaEMsSUFBSSxFQUFFLENBQUMsQ0FBTSxFQUFFLENBQU0sS0FBSyxDQUFDLElBQUksQ0FBQztNQUNoQyxHQUFHLEVBQUUsQ0FBQyxDQUFNLEVBQUUsQ0FBa0IsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO01BQ3pDLElBQUksRUFBRSxDQUFDLENBQU0sRUFBRSxDQUFrQixLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7R0FDM0M7RUFFRCxNQUFNLGdCQUFnQixHQUFvQztFQUN4RCxJQUFBLEdBQUcsRUFBRSxDQUFDLENBQU0sS0FBSyxDQUFDO0VBQ2xCLElBQUEsR0FBRyxFQUFFLENBQUMsQ0FBTSxLQUFLLENBQUMsQ0FBQztFQUNuQixJQUFBLEdBQUcsRUFBRSxDQUFDLENBQU0sS0FBSyxDQUFDLENBQUM7R0FDcEI7UUFtRlksY0FBYyxDQUFBO01BQ3pCLEtBQUssR0FBQTs7VUFFSCxPQUFPO0VBQ0wsWUFBQSxJQUFJLEVBQUUsT0FBTztFQUNiLFlBQUEsUUFBUSxDQUFDLEtBQUssRUFBQTtFQUNaLGdCQUFBLE9BQU8sS0FBSztjQUNkLENBQUM7RUFDRCxZQUFBLE1BQU0sQ0FBQyxNQUFNLEVBQUE7RUFDWCxnQkFBQSxPQUFPLE1BQU07Y0FDZixDQUFDO1dBQ0Y7TUFDSDs7RUFHQSxJQUFBLE9BQU8sQ0FBQyxDQUFTLEVBQUE7VUFDZixPQUFPO0VBQ0wsWUFBQSxJQUFJLEVBQUUsU0FBUztFQUNmLFlBQUEsS0FBSyxFQUFFLENBQUM7RUFDUixZQUFBLFFBQVEsQ0FBQyxNQUFNLEVBQUE7a0JBQ2IsT0FBTyxJQUFJLENBQUMsS0FBSztjQUNuQixDQUFDO0VBQ0QsWUFBQSxNQUFNLENBQUMsTUFBTSxFQUFBO0VBQ1gsZ0JBQUEsT0FBTyxNQUFNO2NBQ2YsQ0FBQztXQUNGO01BQ0g7RUFFQSxJQUFBLEVBQUUsQ0FBQyxDQUFTLEVBQUE7VUFDVixPQUFPO0VBQ0wsWUFBQSxJQUFJLEVBQUUsSUFBSTtFQUNWLFlBQUEsS0FBSyxFQUFFLENBQUM7RUFDUixZQUFBLFFBQVEsQ0FBQyxLQUFLLEVBQUE7O0VBRVosZ0JBQUEsSUFBSSxJQUFJLENBQUMsS0FBSyxLQUFLLE1BQU07RUFBRSxvQkFBQSxPQUFPLEtBQUs7RUFDdkMsZ0JBQUEsT0FBTyxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQztjQUM1QixDQUFDO0VBQ0QsWUFBQSxNQUFNLENBQUMsTUFBTSxFQUFBO0VBQ1gsZ0JBQUEsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDO0VBQ3ZCLGdCQUFBLE9BQU8sTUFBTTtjQUNmLENBQUM7V0FDRjtNQUNIO01BRUEsS0FBSyxDQUFDLEVBQVUsRUFBRSxJQUFnQixFQUFBO0VBQ2hDLFFBQUEsTUFBTSxDQUFDLEdBQUcsZ0JBQWdCLENBQUMsRUFBRSxDQUFDO1VBQzlCLE9BQU87RUFDTCxZQUFBLElBQUksRUFBRSxPQUFPO0VBQ2IsWUFBQSxRQUFRLEVBQUUsRUFBRTtFQUNaLFlBQUEsS0FBSyxFQUFFLElBQUk7RUFDWCxZQUFBLFFBQVEsQ0FBQyxLQUFLLEVBQUE7a0JBQ1osT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7Y0FDdEMsQ0FBQztFQUNELFlBQUEsTUFBTSxDQUFDLE1BQU0sRUFBQTtrQkFDWCxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQztjQUNsQyxDQUFDO1dBQ0Y7TUFDSDtFQUVBLElBQUEsTUFBTSxDQUFDLENBQWEsRUFBRSxFQUFVLEVBQUUsQ0FBYSxFQUFBO0VBQzdDLFFBQUEsTUFBTSxDQUFDLEdBQUcsaUJBQWlCLENBQUMsRUFBRSxDQUFDO1VBQy9CLE9BQU87RUFDTCxZQUFBLElBQUksRUFBRSxRQUFRO0VBQ2QsWUFBQSxRQUFRLEVBQUUsRUFBRTtFQUNaLFlBQUEsSUFBSSxFQUFFLENBQUM7RUFDUCxZQUFBLEtBQUssRUFBRSxDQUFDO0VBQ1IsWUFBQSxRQUFRLENBQUMsS0FBSyxFQUFBO0VBQ1osZ0JBQUEsSUFBSSxJQUFJLENBQUMsUUFBUSxLQUFLLEdBQUcsRUFBRTtFQUN6QixvQkFBQSxJQUNFLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxLQUFLLElBQUk7RUFDdkIsd0JBQUEsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEtBQUssUUFBUTtFQUMzQix3QkFBQSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksS0FBSyxPQUFPLEVBQzFCOzBCQUNBLE1BQU0sSUFBSSxLQUFLLENBQUMsQ0FBQSwyQkFBQSxFQUE4QixJQUFJLENBQUMsSUFBSSxDQUFBLENBQUUsQ0FBQztzQkFDNUQ7c0JBQ0EsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDO3NCQUN4QyxJQUFJLFFBQVEsR0FBdUIsU0FBUztFQUM1QyxvQkFBQSxJQUFJLFFBQWlCO3NCQUNyQixJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxLQUFLLFFBQVEsRUFBRTswQkFDL0IsUUFBUSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUM7RUFDN0Msd0JBQUEsUUFBUSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSTtzQkFDM0I7MkJBQU8sSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksS0FBSyxPQUFPLEVBQUU7MEJBQ3JDLFFBQVEsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDOzBCQUM3QyxRQUFRLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQztzQkFDL0M7MkJBQU8sSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksS0FBSyxJQUFJLEVBQUU7OzBCQUVsQyxRQUFRLEdBQUcsS0FBSztFQUNoQix3QkFBQSxRQUFRLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLO3NCQUM1QjtzQkFDQSxPQUFPLFFBQVEsS0FBSztFQUNsQiwwQkFBRTs2QkFDRSxRQUFnQixDQUFDLFFBQVEsQ0FBQyxHQUFHLEtBQUssQ0FBQztrQkFDM0M7a0JBQ0EsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7Y0FDakUsQ0FBQztFQUNELFlBQUEsTUFBTSxDQUFDLE1BQU0sRUFBQTtFQUNYLGdCQUFBLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQztFQUN4QixnQkFBQSxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUM7RUFDekIsZ0JBQUEsT0FBTyxNQUFNO2NBQ2YsQ0FBQztXQUNGO01BQ0g7TUFFQSxNQUFNLENBQUMsQ0FBYSxFQUFFLENBQVMsRUFBQTtVQUM3QixPQUFPO0VBQ0wsWUFBQSxJQUFJLEVBQUUsUUFBUTtFQUNkLFlBQUEsUUFBUSxFQUFFLENBQUM7RUFDWCxZQUFBLElBQUksRUFBRSxDQUFDO0VBQ1AsWUFBQSxRQUFRLENBQUMsS0FBSyxFQUFBO0VBQ1osZ0JBQUEsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDO2NBQ25ELENBQUM7RUFDRCxZQUFBLE1BQU0sQ0FBQyxNQUFNLEVBQUE7RUFDWCxnQkFBQSxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUM7RUFDNUIsZ0JBQUEsT0FBTyxNQUFNO2NBQ2YsQ0FBQztXQUNGO01BQ0g7RUFFQSxJQUFBLE1BQU0sQ0FBQyxRQUFvQixFQUFFLE1BQWMsRUFBRSxJQUFrQixFQUFBO1VBQzdELElBQUksTUFBTSxJQUFJLElBQUksSUFBSSxPQUFPLE1BQU0sS0FBSyxRQUFRLEVBQUU7RUFDaEQsWUFBQSxNQUFNLElBQUksS0FBSyxDQUFDLHFCQUFxQixDQUFDO1VBQ3hDO1VBQ0EsT0FBTztFQUNMLFlBQUEsSUFBSSxFQUFFLFFBQVE7RUFDZCxZQUFBLFFBQVEsRUFBRSxRQUFRO0VBQ2xCLFlBQUEsTUFBTSxFQUFFLE1BQU07RUFDZCxZQUFBLFNBQVMsRUFBRSxJQUFJO0VBQ2YsWUFBQSxRQUFRLENBQUMsS0FBSyxFQUFBO2tCQUNaLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQzs7OztFQUk5QyxnQkFBQSxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsTUFBTSxHQUFHLFFBQVEsR0FBRyxLQUFLLEdBQUcsTUFBTSxDQUFDLElBQUksS0FBSztFQUMvRCxnQkFBQSxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxHQUFHLFFBQVEsR0FBRyxNQUFNLENBQUMsR0FBRyxRQUFRO0VBQ3JELGdCQUFBLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxTQUFTLElBQUksRUFBRTtFQUNqQyxnQkFBQSxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7a0JBQ3JELE9BQU8sQ0FBQyxFQUFFLEtBQUssR0FBRyxLQUFLLEVBQUUsU0FBUyxDQUFDO2NBQ3JDLENBQUM7RUFDRCxZQUFBLE1BQU0sQ0FBQyxNQUFNLEVBQUE7RUFDWCxnQkFBQSxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUM7RUFDNUIsZ0JBQUEsSUFBSSxDQUFDLFNBQVMsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQztFQUNqRCxnQkFBQSxPQUFPLE1BQU07Y0FDZixDQUFDO1dBQ0Y7TUFDSDtFQUVBLElBQUEsS0FBSyxDQUFDLENBQWEsRUFBQTtFQUNqQixRQUFBLE9BQU8sQ0FBQztNQUNWO01BRUEsS0FBSyxDQUFDLENBQWEsRUFBRSxDQUFhLEVBQUE7VUFDaEMsT0FBTztFQUNMLFlBQUEsSUFBSSxFQUFFLE9BQU87RUFDYixZQUFBLFFBQVEsRUFBRSxDQUFDO0VBQ1gsWUFBQSxRQUFRLEVBQUUsQ0FBQztFQUNYLFlBQUEsUUFBUSxDQUFDLEtBQUssRUFBQTtFQUNaLGdCQUFBLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7Y0FDdkUsQ0FBQztFQUNELFlBQUEsTUFBTSxDQUFDLE1BQU0sRUFBQTtFQUNYLGdCQUFBLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQztFQUM1QixnQkFBQSxPQUFPLE1BQU07Y0FDZixDQUFDO1dBQ0Y7TUFDSDtFQUVBLElBQUEsT0FBTyxDQUFDLENBQWEsRUFBRSxDQUFhLEVBQUUsQ0FBYSxFQUFBO1VBQ2pELE9BQU87RUFDTCxZQUFBLElBQUksRUFBRSxTQUFTO0VBQ2YsWUFBQSxTQUFTLEVBQUUsQ0FBQztFQUNaLFlBQUEsUUFBUSxFQUFFLENBQUM7RUFDWCxZQUFBLFNBQVMsRUFBRSxDQUFDO0VBQ1osWUFBQSxRQUFRLENBQUMsS0FBSyxFQUFBO2tCQUNaLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQztrQkFDeEMsSUFBSSxDQUFDLEVBQUU7c0JBQ0wsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUM7a0JBQ3RDO3VCQUFPO3NCQUNMLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDO2tCQUN2QztjQUNGLENBQUM7RUFDRCxZQUFBLE1BQU0sQ0FBQyxNQUFNLEVBQUE7RUFDWCxnQkFBQSxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUM7RUFDN0IsZ0JBQUEsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDO0VBQzVCLGdCQUFBLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQztFQUM3QixnQkFBQSxPQUFPLE1BQU07Y0FDZixDQUFDO1dBQ0Y7TUFDSDtFQUVBLElBQUEsR0FBRyxDQUFDLE9BQWdELEVBQUE7VUFDbEQsT0FBTztFQUNMLFlBQUEsSUFBSSxFQUFFLEtBQUs7RUFDWCxZQUFBLE9BQU8sRUFBRSxPQUFPO0VBQ2hCLFlBQUEsUUFBUSxDQUFDLEtBQUssRUFBQTtrQkFDWixNQUFNLEdBQUcsR0FBRyxFQUFFO0VBQ2QsZ0JBQUEsSUFBSSxPQUFPLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRTtFQUMzQixvQkFBQSxLQUFLLE1BQU0sR0FBRyxJQUFJLE9BQU8sRUFBRTswQkFDekIsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUM7MEJBQzdCLElBQUksR0FBRyxFQUFFOzhCQUNOLEdBQVcsQ0FBQyxHQUFHLENBQUMsR0FBRyxHQUFHLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQzswQkFDekM7c0JBQ0Y7a0JBQ0Y7RUFDQSxnQkFBQSxPQUFPLEdBQUc7Y0FDWixDQUFDO0VBQ0QsWUFBQSxNQUFNLENBQUMsTUFBTSxFQUFBO0VBQ1gsZ0JBQUEsSUFBSSxPQUFPLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRTtFQUMzQixvQkFBQSxLQUFLLE1BQU0sR0FBRyxJQUFJLE9BQU8sRUFBRTswQkFDekIsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUM7MEJBQzdCLElBQUksR0FBRyxFQUFFO0VBQ1AsNEJBQUEsR0FBRyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUM7MEJBQ3BCO3NCQUNGO2tCQUNGO0VBQ0EsZ0JBQUEsT0FBTyxNQUFNO2NBQ2YsQ0FBQztXQUNGO01BQ0g7O0VBR0EsSUFBQSxJQUFJLENBQUMsQ0FBZ0MsRUFBQTtVQUNuQyxPQUFPO0VBQ0wsWUFBQSxJQUFJLEVBQUUsTUFBTTtFQUNaLFlBQUEsS0FBSyxFQUFFLENBQUM7RUFDUixZQUFBLFFBQVEsQ0FBQyxLQUFLLEVBQUE7RUFDWixnQkFBQSxPQUFPLElBQUksQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7Y0FDbkQsQ0FBQztFQUNELFlBQUEsTUFBTSxDQUFDLE1BQU0sRUFBQTtFQUNYLGdCQUFBLElBQUksQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7RUFDN0MsZ0JBQUEsT0FBTyxNQUFNO2NBQ2YsQ0FBQztXQUNGO01BQ0g7TUFFQSxhQUFhLENBQUMsTUFBZ0IsRUFBRSxJQUFnQixFQUFBO1VBQzlDLE9BQU87RUFDTCxZQUFBLElBQUksRUFBRSxlQUFlO2NBQ3JCLE1BQU07Y0FDTixJQUFJO0VBQ0osWUFBQSxRQUFRLENBQUMsS0FBSyxFQUFBO0VBQ1osZ0JBQUEsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU07RUFDMUIsZ0JBQUEsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUk7a0JBQ3RCLE9BQU8sVUFBVSxHQUFHLElBQVcsRUFBQTs7OztzQkFJN0IsTUFBTSxTQUFTLEdBQUcsTUFBTSxDQUFDLFdBQVcsQ0FDbEMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FDbkM7c0JBQ0QsTUFBTSxRQUFRLEdBQUcsSUFBSSxLQUFLLENBQUMsS0FBSyxJQUFJLEVBQUUsRUFBRTtFQUN0Qyx3QkFBQSxHQUFHLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUE7RUFDckIsNEJBQUEsSUFBSSxTQUFTLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxFQUFFO0VBQ2xDLGdDQUFBLFNBQVMsQ0FBQyxJQUFjLENBQUMsR0FBRyxLQUFLOzhCQUNuQzs4QkFDQSxRQUFRLE1BQU0sQ0FBQyxJQUFjLENBQUMsR0FBRyxLQUFLOzBCQUN4QyxDQUFDOzBCQUNELEdBQUcsQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUFBO0VBQ2QsNEJBQUEsSUFBSSxTQUFTLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxFQUFFO0VBQ2xDLGdDQUFBLE9BQU8sU0FBUyxDQUFDLElBQWMsQ0FBQzs4QkFDbEM7RUFDQSw0QkFBQSxPQUFPLE1BQU0sQ0FBQyxJQUFjLENBQUM7MEJBQy9CLENBQUM7RUFDRixxQkFBQSxDQUFDO0VBQ0Ysb0JBQUEsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQztFQUNoQyxnQkFBQSxDQUFDO2NBQ0gsQ0FBQztFQUNELFlBQUEsTUFBTSxDQUFDLE1BQU0sRUFBQTs7OztrQkFJWCxPQUFPLElBQUksQ0FBQzt1QkFDVCxNQUFNLENBQUMsTUFBTTtFQUNiLHFCQUFBLE1BQU0sQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2NBQzlDLENBQUM7V0FDRjtNQUNIO0VBQ0Q7O0VDaFlELE1BQU0sRUFBQyxhQUFhLEVBQUUsWUFBWSxFQUFFLG9CQUFvQixFQUFFLFNBQVMsRUFBQyxHQUFHQyxzQkFBSTtFQUUzRSxNQUFNLFVBQVUsR0FBRyxJQUFJLGNBQWMsRUFBRTtFQUN2QyxNQUFNLGVBQWUsR0FBRyxJQUFJLEdBQUcsRUFBa0M7RUFFakUsTUFBTSxXQUFXLEdBQUcsQ0FBQyxDQUFTLEtBQzVCLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQVUsS0FBSyxFQUFFLENBQUMsV0FBVyxFQUFFLENBQUM7RUFFNUQ7O0VBRUc7RUFDSCxNQUFNLGNBQWMsR0FBRyxDQUFDLENBQVMsRUFBRSxLQUFVLEtBQUk7TUFDL0MsSUFBSSxHQUFHLEdBQUcsZUFBZSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7RUFDaEMsSUFBQSxJQUFJLEdBQUcsS0FBSyxTQUFTLEVBQUU7RUFDckIsUUFBQSxJQUFJLGVBQWUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUU7RUFDMUIsWUFBQSxPQUFPLFNBQVM7VUFDbEI7RUFDQSxRQUFBLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFO0VBQ1osUUFBQSxJQUFJLENBQUMsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRTtFQUMxQyxZQUFBLE1BQU0sVUFBVSxHQUFHLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFO2NBQ3RELEdBQUcsR0FBRyxJQUFJLE1BQU0sQ0FBQyxVQUFVLEVBQUUsVUFBVSxDQUFDLENBQUMsS0FBSyxFQUFFO0VBQ2hELFlBQUEsZUFBZSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDO1VBQzdCO01BQ0Y7RUFDQSxJQUFBLE9BQU8sR0FBRyxFQUFFLFFBQVEsQ0FBQyxLQUFLLENBQUM7RUFDN0IsQ0FBQztFQWtDTSxNQUFNLFNBQVMsR0FBb0IsQ0FDeEMsUUFBNkIsRUFDN0IsS0FBYSxFQUNiLFFBQTBCLEVBQzFCLFNBQW9CLEtBQ2xCO01BQ0YsTUFBTSxXQUFXLEdBQUcsUUFBUSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUM7TUFDL0MsSUFBSSxXQUFXLEtBQUssSUFBSSxJQUFJLGNBQWMsQ0FBQyxXQUFXLEVBQUUsS0FBSyxDQUFDLEVBQUU7VUFDOUQsT0FBTyxnQkFBZ0IsQ0FBQyxRQUFRLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxTQUFTLENBQUM7TUFDL0Q7RUFDQSxJQUFBLE9BQU8sU0FBUztFQUNsQixDQUFDO0VBRUQsTUFBTSxZQUFZLEdBQUcsOEJBQThCO0VBRW5ELE1BQU0sd0JBQXdCLEdBQUcsQ0FBQyxDQUFTLEtBQUssb0JBQW9CLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztFQUU1RSxNQUFNLHNCQUFzQixHQUFHLENBQUMsQ0FBUyxLQUN2QyxDQUFDLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQztFQUU3QyxNQUFNLGFBQWEsR0FBb0IsQ0FDNUMsUUFBNkIsRUFDN0IsS0FBZ0MsRUFDaEMsUUFBMEIsRUFDMUIsU0FBb0IsS0FDbEI7TUFDRixNQUFNLGVBQWUsR0FBRyxRQUFRLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQztFQUN2RCxJQUFBLElBQUksZUFBZSxLQUFLLElBQUksRUFBRTtVQUM1QixNQUFNLEtBQUssR0FBRyxjQUFjLENBQUMsZUFBZSxFQUFFLEtBQUssQ0FBQztVQUNwRCxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsRUFBRTtFQUMzQixZQUFBLE9BQU9DLHlCQUFPO1VBQ2hCO0VBQ0EsUUFBQSxNQUFNLFdBQVcsR0FBRyxjQUFjLENBQUMsUUFBUSxDQUFDO0VBRTVDLFFBQUEsSUFBSSxLQUFLLEdBQUcsRUFBRTtVQUNkLE1BQU0sTUFBTSxHQUFHLEVBQUU7RUFDakIsUUFBQSxLQUFLLE1BQU0sSUFBSSxJQUFJLEtBQUssRUFBRTtFQUN4QixZQUFBLEtBQUssRUFBRTtjQUNQLE1BQU0sU0FBUyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDO0VBQ3RDLFlBQUEsU0FBUyxDQUFDLElBQUksR0FBRyxJQUFJO0VBQ3JCLFlBQUEsU0FBUyxDQUFDLEtBQUssR0FBRyxLQUFLO2NBQ3ZCLFNBQVMsQ0FBQyxNQUFNLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLElBQUksS0FBSztjQUUxQyxNQUFNLE1BQU0sR0FBRyxFQUFFO0VBQ2pCLFlBQUEsS0FBSyxNQUFNLElBQUksSUFBSSxXQUFXLENBQUMsS0FBSyxFQUFFO0VBQ3BDLGdCQUFBLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLFFBQVEsRUFBRSxTQUFTLENBQUM7RUFDekQsZ0JBQUEsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLENBQUMsRUFBRTtFQUNuQixvQkFBQSxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUksS0FBMkIsQ0FBQztrQkFDOUM7dUJBQU87RUFDTCxvQkFBQSxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQztrQkFDcEI7Y0FDRjtFQUNBLFlBQUEsTUFBTSxjQUFjLEdBQTJCO0VBQzdDLGdCQUFBLFVBQVUsRUFBRSxXQUFXO2tCQUN2QixNQUFNO2VBQ1A7RUFDRCxZQUFBLE1BQU0sQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDO1VBQzdCO0VBQ0EsUUFBQSxPQUFPLE1BQU07TUFDZjtFQUNBLElBQUEsT0FBTyxTQUFTO0VBQ2xCLENBQUM7RUFFTSxNQUFNLGVBQWUsR0FBcUI7RUFDL0MsSUFBQSxFQUFFLEVBQUUsU0FBUztFQUNiLElBQUEsTUFBTSxFQUFFLGFBQWE7R0FDdEI7RUFFRDs7RUFFRztBQUNJLFFBQU0sZUFBZSxHQUFHLENBQzdCLFFBQTZCLEVBQzdCLFFBQUEsR0FBNkIsZUFBZSxFQUM1QyxTQUFBLEdBQXVCLEVBQUUsRUFDekIsYUFBbUMsS0FDZjtFQUNwQixJQUFBLE1BQU0sV0FBVyxHQUFHLGNBQWMsQ0FBQyxRQUFRLENBQUM7RUFDNUMsSUFBQSxNQUFNLGlCQUFpQixHQUFHLFdBQVcsQ0FBQyxTQUFTO01BQy9DLElBQUksYUFBYSxFQUFFO0VBQ2pCLFFBQUEsTUFBTSxnQkFBZ0IsR0FBRyxjQUFjLENBQUMsYUFBYSxDQUFDO0VBQ3RELFFBQUEsTUFBTSxjQUFjLEdBQUcsZ0JBQWdCLENBQUMsU0FBUztFQUNqRCxRQUFBLE1BQU0saUJBQWlCLEdBQUcsaUJBQWlCLENBQUMsT0FBTyxDQUFDO0VBRXBELFFBQUEsSUFBSSxpQkFBaUIsS0FBSyxTQUFTLEVBQUU7OztFQUluQyxZQUFBLFNBQVMsR0FBRzs7RUFFVixnQkFBQSxHQUFHLGlCQUFpQjs7RUFFcEIsZ0JBQUEsR0FBRyxTQUFTOztrQkFFWixLQUFLLEVBQUUsQ0FBQyxLQUFLLEVBQUUsUUFBUSxFQUFFLFNBQVMsS0FBSTs7Ozs7RUFLcEMsb0JBQUEsU0FBUyxHQUFHOztFQUVWLHdCQUFBLEdBQUcsY0FBYzs7RUFFakIsd0JBQUEsR0FBRyxTQUFTOzswQkFFWixLQUFLLEVBQUUsQ0FBQyxLQUFLLEVBQUUsUUFBUSxFQUFFLFNBQVMsS0FBSTs4QkFDcEMsT0FBTyxnQkFBZ0IsQ0FDckIsYUFBYSxFQUNiLEtBQUssRUFDTCxRQUFRLEVBQ1IsU0FBUyxDQUNWOzBCQUNILENBQUM7dUJBQ0Y7c0JBQ0QsT0FBTyxpQkFBaUIsQ0FBQyxLQUFLLEVBQUUsUUFBUSxFQUFFLFNBQVMsQ0FBQztrQkFDdEQsQ0FBQztlQUNGO1VBQ0g7ZUFBTzs7Ozs7RUFNTCxZQUFBLFNBQVMsR0FBRzs7RUFFVixnQkFBQSxHQUFHLGNBQWM7O0VBRWpCLGdCQUFBLEdBQUcsaUJBQWlCOztFQUVwQixnQkFBQSxHQUFHLFNBQVM7ZUFDYjtjQUNELFFBQVEsR0FBRyxhQUFhO1VBQzFCO01BQ0Y7V0FBTzs7RUFFTCxRQUFBLFNBQVMsR0FBRzs7RUFFVixZQUFBLEdBQUcsaUJBQWlCOztFQUVwQixZQUFBLEdBQUcsU0FBUztXQUNiO01BQ0g7RUFDQSxJQUFBLE9BQU8sQ0FBQyxLQUFLLEtBQUssZ0JBQWdCLENBQUMsUUFBUSxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsU0FBUyxDQUFDO0VBQzFFO0VBNEJBOzs7Ozs7OztFQVFHO0FBQ0ksUUFBTSxnQkFBZ0IsR0FBRyxDQUM5QixRQUE2QixFQUM3QixLQUFVLEVBQ1YsV0FBNkIsZUFBZSxFQUM1QyxTQUFBLEdBQXVCLEVBQUUsS0FDdkI7RUFDRixJQUFBLE1BQU0sV0FBVyxHQUFHLGNBQWMsQ0FBQyxRQUFRLENBQUM7TUFDNUMsTUFBTSxNQUFNLEdBQW1CLEVBQUU7RUFDakMsSUFBQSxLQUFLLE1BQU0sSUFBSSxJQUFJLFdBQVcsQ0FBQyxLQUFLLEVBQUU7RUFDcEMsUUFBQSxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxRQUFRLEVBQUUsU0FBUyxDQUFDO0VBQ3JELFFBQUEsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLENBQUMsRUFBRTtFQUNuQixZQUFBLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBSSxLQUEyQixDQUFDO1VBQzlDO2VBQU87RUFDTCxZQUFBLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDO1VBQ3BCO01BQ0Y7RUFDQSxJQUFBLE1BQU0sY0FBYyxHQUEyQjtFQUM3QyxRQUFBLFVBQVUsRUFBRSxXQUFXO1VBQ3ZCLE1BQU07T0FDUDtFQUNELElBQUEsT0FBTyxjQUFjO0VBQ3ZCO0VBbUJBLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxHQUFHLEVBQXlDO0VBRWxFLE1BQU0sY0FBYyxHQUFHLENBQzVCLFFBQTZCLEtBQ1Q7TUFDcEIsSUFBSSxXQUFXLEdBQUcsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQztFQUNoRCxJQUFBLElBQUksV0FBVyxLQUFLLFNBQVMsRUFBRTtFQUM3QixRQUFBLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxRQUFRLEdBQUcsV0FBVyxHQUFHLGVBQWUsQ0FBQyxRQUFRLENBQUMsRUFBRTtNQUMzRTtFQUNBLElBQUEsT0FBTyxXQUFXO0VBQ3BCLENBQUM7RUFFRCxNQUFNLGVBQWUsR0FBRyxDQUFDLFFBQTZCLEtBQXNCO0VBQzFFLElBQUEsTUFBTSxXQUFXLEdBQXFCO0VBQ3BDLFFBQUEsQ0FBQyxFQUFFLFNBQTRDO0VBQy9DLFFBQUEsRUFBRSxFQUFFLFFBQVEsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUF3QjtFQUNuRCxRQUFBLEtBQUssRUFBRSxFQUFFO0VBQ1QsUUFBQSxTQUFTLEVBQUUsRUFBRTtPQUNkO01BQ0QsTUFBTSxNQUFNLEdBQUcsUUFBUSxDQUFDLGdCQUFnQixDQUN0QyxXQUFXLENBQUMsRUFBRyxDQUFDLE9BQU8sRUFDdkIsVUFBVSxDQUFDLFlBQVksR0FBRyxVQUFVLENBQUMsU0FBUyxHQUFHLFVBQVUsQ0FBQyxZQUFZLENBQ3pFO0VBQ0QsSUFBQSxJQUFJLElBQUksR0FBZ0IsTUFBTSxDQUFDLFdBQVc7RUFDMUMsSUFBQSxJQUFJLFNBQVMsR0FBRyxFQUFFO01BQ2xCLE1BQU0sZ0JBQWdCLEdBQUcsRUFBRTtNQUUzQixPQUFPLENBQUMsSUFBSSxHQUFHLE1BQU0sQ0FBQyxRQUFRLEVBQUUsTUFBTSxJQUFJLEVBQUU7VUFDMUMsSUFBSSxJQUFJLENBQUMsUUFBUSxLQUFLLElBQUksQ0FBQyxZQUFZLEVBQUU7RUFDdkMsWUFBQSxTQUFTLEVBQUU7Y0FDWCxNQUFNLE9BQU8sR0FBRyxJQUFlO0VBQy9CLFlBQUEsSUFBSSxPQUFPLENBQUMsT0FBTyxLQUFLLFVBQVUsRUFBRTtrQkFDbEMsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUM7a0JBQ3pDLE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDO2tCQUN6QyxNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQztFQUV6QyxnQkFBQSxJQUFJLElBQUksS0FBSyxJQUFJLElBQUksSUFBSSxLQUFLLElBQUksSUFBSSxJQUFJLEtBQUssSUFBSSxFQUFFO0VBQ25ELG9CQUFBLE9BQU8sQ0FBQyxVQUFXLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsRUFBRSxDQUFDLEVBQUUsT0FBTyxDQUFDO0VBQ3JFLG9CQUFBLGdCQUFnQixDQUFDLElBQUksQ0FBQyxPQUFPLENBQUM7RUFDOUIsb0JBQUEsSUFBSSxNQUFtQjtFQUV2QixvQkFBQSxJQUFJLElBQUksS0FBSyxJQUFJLEVBQUU7O0VBRWpCLHdCQUFBLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxJQUFJLEVBQUU7RUFDaEMsd0JBQUEsTUFBTSx3QkFBd0IsR0FDNUIsWUFBWSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxZQUFZLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQzswQkFFOUQsTUFBTSxHQUFHLENBQ1AsS0FBYSxFQUNiLFFBQTBCLEVBQzFCLFNBQW9CLEtBQ2xCOzhCQUNGLE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDO0VBQzdDLDRCQUFBLE1BQU0sSUFBSSxHQUNSLFFBQVEsS0FBSyxJQUFJLEdBQUcsU0FBUyxHQUFHLGNBQWMsQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDOzhCQUVqRSxNQUFNLFFBQVEsR0FBRztFQUNmLGtDQUFFLGNBQWMsQ0FBQyxZQUFZLEVBQUUsS0FBSztFQUNwQyxrQ0FBRSxTQUFTLENBQUMsSUFBSSxDQUFDOzhCQUNuQixPQUFPLFFBQVEsR0FBRyxJQUFJLEVBQUUsUUFBUSxFQUFFLFNBQVMsQ0FBQztFQUM5Qyx3QkFBQSxDQUFDO3NCQUNIO0VBQU8seUJBQUEsSUFBSSxJQUFJLEtBQUssSUFBSSxFQUFFOzswQkFFeEIsTUFBTSxHQUFHLENBQ1AsS0FBYSxFQUNiLFFBQTBCLEVBQzFCLFNBQW9CLEtBQ2xCO0VBQ0YsNEJBQUEsTUFBTSxPQUFPLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQzs4QkFDOUIsT0FBTyxPQUFPLEdBQ1osT0FBOEIsRUFDOUIsS0FBSyxFQUNMLFFBQVEsRUFDUixTQUFTLENBQ1Y7RUFDSCx3QkFBQSxDQUFDO3NCQUNIOzJCQUFPOztFQUVMLHdCQUFBLElBQUksSUFBSSxLQUFLLE9BQU8sRUFBRTtFQUNwQiw0QkFBQSxXQUFXLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQy9CLEtBQVUsRUFDVixRQUEwQixFQUMxQixTQUFvQixLQUNsQjs7Ozs7RUFLRixnQ0FBQSxNQUFNLGFBQWEsR0FBRyxTQUFTLENBQUMsT0FBTyxDQUFDO0VBQ3hDLGdDQUFBLE1BQU0saUJBQWlCLEdBQUcsY0FBYyxDQUN0QyxPQUE4QixDQUMvQjtFQUNELGdDQUFBLFNBQVMsR0FBRztFQUNWLG9DQUFBLEdBQUcsU0FBUztzQ0FDWixHQUFHLGlCQUFpQixDQUFDLFNBQVM7bUNBQy9CO2tDQUNELE9BQU8sYUFBYSxDQUFDLEtBQUssRUFBRSxRQUFRLEVBQUUsU0FBUyxDQUFDO0VBQ2xELDRCQUFBLENBQUM7MEJBQ0g7K0JBQU87O0VBRUwsNEJBQUEsV0FBVyxDQUFDLFNBQVMsQ0FBQyxJQUFLLENBQUMsR0FBRyxDQUM3QixLQUFVLEVBQ1YsUUFBMEIsRUFDMUIsU0FBb0IsS0FDbEI7a0NBQ0YsT0FBTyxnQkFBZ0IsQ0FDckIsT0FBOEIsRUFDOUIsS0FBSyxFQUNMLFFBQVEsRUFDUixTQUFTLENBQ1Y7RUFDSCw0QkFBQSxDQUFDOzBCQUNIOzs7OzBCQUlBLE1BQU0sR0FBRyxDQUNQLEtBQWEsRUFDYixRQUEwQixFQUMxQixTQUFvQixLQUNsQjtFQUNGLDRCQUFBLE1BQU0sUUFBUSxHQUFHLFNBQVMsQ0FBQyxJQUFLLENBQUM7OEJBQ2pDLE9BQU8sUUFBUSxHQUFHLEtBQUssRUFBRSxRQUFRLEVBQUUsU0FBUyxDQUFDO0VBQy9DLHdCQUFBLENBQUM7c0JBQ0g7RUFDQSxvQkFBQSxXQUFXLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQzswQkFDckIsSUFBSSxFQUFFLENBQUM7RUFDUCx3QkFBQSxLQUFLLEVBQUUsU0FBUzswQkFDaEIsTUFBTTtFQUNQLHFCQUFBLENBQUM7OztzQkFHRjtrQkFDRjtjQUNGO0VBQ0EsWUFBQSxNQUFNLGNBQWMsR0FBRyxPQUFPLENBQUMsaUJBQWlCLEVBQUU7RUFDbEQsWUFBQSxLQUFLLE1BQU0sYUFBYSxJQUFJLGNBQWMsRUFBRTtrQkFDMUMsTUFBTSxjQUFjLEdBQUcsT0FBTyxDQUFDLFlBQVksQ0FBQyxhQUFhLENBQUU7OztrQkFHM0QsTUFBTSxVQUFVLEdBQUcsY0FBYyxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUM7RUFDckQsZ0JBQUEsSUFBSSxVQUFVLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtFQUMzQixvQkFBQSxJQUFJLHdCQUF3QixDQUFDLGNBQWMsQ0FBQyxFQUFFOzBCQUM1QyxPQUFPLENBQUMsWUFBWSxDQUNsQixhQUFhLEVBQ2Isc0JBQXNCLENBQUMsY0FBYyxDQUFDLENBQ3ZDO3NCQUNIO3NCQUNBO2tCQUNGO0VBQ0EsZ0JBQUEsT0FBTyxDQUFDLGVBQWUsQ0FBQyxhQUFhLENBQUM7a0JBQ3RDLElBQUksSUFBSSxHQUFHLGFBQWE7a0JBQ3hCLElBQUksSUFBSSxHQUFHLGFBQWE7RUFDeEIsZ0JBQUEsTUFBTSxNQUFNLEdBQUcsYUFBYSxDQUFDLENBQUMsQ0FBQztFQUMvQixnQkFBQSxJQUFJLE1BQU0sS0FBSyxHQUFHLEVBQUU7c0JBQ2xCLElBQUksR0FBRyxXQUFXLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztzQkFDOUMsSUFBSSxHQUFHLFlBQVk7a0JBQ3JCO0VBQU8scUJBQUEsSUFBSSxNQUFNLEtBQUssR0FBRyxFQUFFO0VBQ3pCLG9CQUFBLElBQUksR0FBRyxhQUFhLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztzQkFDakMsSUFBSSxHQUFHLG9CQUFvQjtrQkFDN0I7RUFBTyxxQkFBQSxJQUFJLE1BQU0sS0FBSyxHQUFHLEVBQUU7c0JBQ3pCLElBQUksR0FBRyxXQUFXLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztzQkFDOUMsSUFBSSxHQUFHLFNBQVM7a0JBQ2xCO2tCQUVBLE1BQU0sT0FBTyxHQUFHLENBQUMsc0JBQXNCLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7a0JBQ3ZELE1BQU0sS0FBSyxHQUFzQixFQUFFO0VBQ25DLGdCQUFBLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxVQUFVLENBQUMsTUFBTSxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUU7RUFDN0Msb0JBQUEsTUFBTSxRQUFRLEdBQUcsVUFBVSxDQUFDLENBQUMsQ0FBQztzQkFDOUIsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLFVBQVUsQ0FBZSxDQUFDO0VBQ3JELG9CQUFBLE9BQU8sQ0FBQyxJQUFJLENBQUMsc0JBQXNCLENBQUMsVUFBVSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO2tCQUN6RDtFQUVBLGdCQUFBLFdBQVcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDO3NCQUNyQixJQUFJLEVBQUUsQ0FBQztFQUNQLG9CQUFBLEtBQUssRUFBRSxTQUFTO3NCQUNoQixJQUFJO3NCQUNKLE9BQU87c0JBQ1AsSUFBSTtzQkFDSixNQUFNLEVBQUUsQ0FDTixLQUFhLEVBQ2IsU0FBMkIsRUFDM0IsVUFBcUIsS0FDbkI7RUFDRix3QkFBQSxPQUFPLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztzQkFDbEQsQ0FBQztFQUNGLGlCQUFBLENBQUM7Y0FDSjtVQUNGO2VBQU8sSUFBSSxJQUFJLENBQUMsUUFBUSxLQUFLLElBQUksQ0FBQyxTQUFTLEVBQUU7Y0FDM0MsSUFBSSxRQUFRLEdBQUcsSUFBWTtFQUMzQixZQUFBLE1BQU0sSUFBSSxHQUFHLFFBQVEsQ0FBQyxXQUFZO2NBQ2xDLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDO0VBQ3hDLFlBQUEsSUFBSSxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtrQkFDdEIsUUFBUSxDQUFDLFdBQVcsR0FBRyxzQkFBc0IsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7Y0FDM0Q7RUFBTyxpQkFBQSxJQUFJLHdCQUF3QixDQUFDLElBQUksQ0FBQyxFQUFFO0VBQ3pDLGdCQUFBLFFBQVEsQ0FBQyxXQUFXLEdBQUcsc0JBQXNCLENBQUMsSUFBSSxDQUFDO2NBQ3JEO0VBQ0EsWUFBQSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFO0VBQzFDLGdCQUFBLE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUM7a0JBQzNCLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxRQUFRLEVBQUUsVUFBVSxDQUFlO0VBQ3RELGdCQUFBLFdBQVcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDO0VBQ3JCLG9CQUFBLElBQUksRUFBRSxDQUFDO3NCQUNQLEtBQUssRUFBRSxFQUFFLFNBQVM7RUFDbEIsb0JBQUEsTUFBTSxFQUFFLENBQUMsS0FBYyxFQUFFLFNBQTJCLEtBQ2xELElBQUksQ0FBQyxRQUFRLENBQUMsS0FBYyxDQUFDO0VBQ2hDLGlCQUFBLENBQUM7RUFDRixnQkFBQSxNQUFNLFdBQVcsR0FBRyxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7a0JBQ2xFLFFBQVEsQ0FBQyxVQUFXLENBQUMsWUFBWSxDQUFDLFdBQVcsRUFBRSxRQUFRLENBQUMsV0FBVyxDQUFDO0VBQ3BFLGdCQUFBLFFBQVEsQ0FBQyxVQUFXLENBQUMsWUFBWSxDQUMvQixRQUFRLENBQUMsYUFBYSxDQUFDLEVBQUUsQ0FBQyxFQUMxQixRQUFRLENBQUMsV0FBVyxDQUNyQjtrQkFDRCxRQUFRLEdBQUcsV0FBVzs7Ozs7RUFLdEIsZ0JBQUEsTUFBTSxDQUFDLFdBQVcsR0FBRyxXQUFXO2NBQ2xDO1VBQ0Y7TUFDRjtFQUNBLElBQUEsS0FBSyxNQUFNLENBQUMsSUFBSSxnQkFBZ0IsRUFBRTtVQUNoQyxDQUFDLENBQUMsTUFBTSxFQUFFO01BQ1o7RUFDQSxJQUFBLE9BQU8sV0FBVztFQUNwQixDQUFDOztFQzVlRCxTQUFTLE1BQU0sQ0FBQyxRQUFzQyxFQUFBO0VBQ2xELElBQUEsSUFBSSxRQUFRLFlBQVksbUJBQW1CLEVBQUU7RUFDekMsUUFBQSxPQUFPLFFBQVE7TUFDbkI7RUFBTyxTQUFBLElBQUksUUFBUSxLQUFLLE9BQU8sUUFBUSxFQUFFO1VBQ3JDLE1BQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDO0VBQ2xELFFBQUEsT0FBTyxDQUFDLFNBQVMsR0FBRyxRQUFRO0VBQzVCLFFBQUEsT0FBTyxPQUFPO01BQ2xCO1dBQU87VUFDSCxNQUFNLElBQUksU0FBUyxDQUFDLENBQUEsMENBQUEsRUFBNkMsT0FBTyxRQUFRLENBQUEsQ0FBQSxDQUFHLENBQUM7TUFDeEY7RUFDSjtFQUVBLFNBQVMseUJBQXlCLENBQUMsT0FBdUMsRUFBQTtNQUN0RSxNQUFNLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxhQUFhLEVBQUUsR0FBRyxPQUFPLElBQUksRUFBRTtNQUM1RCxPQUFPLENBQUMsUUFBc0MsS0FBSTtFQUM5QyxRQUFBLE9BQU8sZUFBZSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLGFBQWEsQ0FBQztFQUNoRixJQUFBLENBQUM7RUFDTDs7Ozs7Ozs7Ozs7Ozs7IiwieF9nb29nbGVfaWdub3JlTGlzdCI6WzAsMSwyLDMsNCw1LDYsNyw4LDksMTAsMTIsMTMsMTQsMTUsMTZdLCJzb3VyY2VSb290IjoiY2RwOi8vL0BjZHAvZXh0ZW5zaW9uLXRlbXBsYXRlLWJyaWRnZS8ifQ==