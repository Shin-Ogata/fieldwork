/*!
 * @cdp/extension-template-bridge 0.9.18
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
    /*
     * patch for v.1.0.2
     * apply transformedInnerTmpl()
     */
    transform: (remainingTmplStr, config) => {
      const parsedSection = parseSection(remainingTmplStr, config.delimiter);
      const transformedInnerTmpl = transform(parsedSection.innerTmpl, config);
      
      return {
        remainingTmplStr: parsedSection.remainingTmplStr,
        insertionPoint: ctx => {
          const sectionData = ctx2Value(ctx, parsedSection.dataKey);
          
          if (isMustacheFalsy(sectionData))
            return sectionData.map
              ? sectionData.map(innerCtx => transformedInnerTmpl(innerCtx))
              : transformedInnerTmpl(ctx)
          return '';
        }
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

  const { AttributePart, PropertyPart, BooleanAttributePart, EventPart } = extensionTemplate._Σ;
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uLXRlbXBsYXRlLWJyaWRnZS5qcyIsInNvdXJjZXMiOlsibGl0LXRyYW5zZm9ybWVyL3NyYy9saXQtdHJhbnNmb3JtZXIuanMiLCJsaXQtdHJhbnNmb3JtZXIvc3JjL2hlbHBlci9kYXRhSGVscGVyLmpzIiwibGl0LXRyYW5zZm9ybWVyL3NyYy90cmFuc2Zvcm1lcnMvdmFyaWFibGVUcmFuc2Zvcm1lci5qcyIsImxpdC10cmFuc2Zvcm1lci9zcmMvdHJhbnNmb3JtZXJzL3Vuc2FmZVZhcmlhYmxlLmpzIiwibGl0LXRyYW5zZm9ybWVyL3NyYy9oZWxwZXIvaXNNdXN0YWNoZUZhbHN5LmpzIiwibGl0LXRyYW5zZm9ybWVyL3NyYy9oZWxwZXIvc2VjdGlvbkhlbHBlci5qcyIsImxpdC10cmFuc2Zvcm1lci9zcmMvdHJhbnNmb3JtZXJzL3NlY3Rpb24uanMiLCJsaXQtdHJhbnNmb3JtZXIvc3JjL3RyYW5zZm9ybWVycy9pbnZlcnRlZFNlY3Rpb24uanMiLCJsaXQtdHJhbnNmb3JtZXIvc3JjL3RyYW5zZm9ybWVycy9jb21tZW50LmpzIiwibGl0LXRyYW5zZm9ybWVyL3NyYy90cmFuc2Zvcm1lcnMvY3VzdG9tRGVsaW1pdGVyLmpzIiwibGl0LXRyYW5zZm9ybWVyL3NyYy9saXQtdHJhbnNmb3JtZXItY29uZmlndXJlZE91dE9mVGhlQm94LmpzIiwiYnJpZGdlLW11c3RhY2hlLnRzIiwiamV4cHIvc3JjL2xpYi9jb25zdGFudHMudHMiLCJqZXhwci9zcmMvbGliL3Rva2VuaXplci50cyIsImpleHByL3NyYy9saWIvcGFyc2VyLnRzIiwiamV4cHIvc3JjL2xpYi9ldmFsLnRzIiwic3RhbXBpbm8vc3JjL3N0YW1waW5vLnRzIiwiYnJpZGdlLXN0YW1waW5vLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qKiBcclxuICogQHBhcmFtIHtvYmplY3R9IGNvbmZpZyA9IHtcclxuICogIGh0bWw6IGxpdC1odG1sLmh0bWwsXHJcbiAqICBkZWxpbWl0ZXI6IHsgc3RhcnQ6ICd7eycsIGVuZDogJ319JyB9LFxyXG4gKiAgdHJhbnNmb3JtZXJzOiB7IC8vIG5vdGUgdGhhdCB0cmFuc2Zvcm1WYXJpYWJsZSBpcyBub3QgaGVyZS4gSXQgZ2V0cyBhcHBsaWVkIHdoZW4gbm8gdHJhbnNmb3JtZXIudGVzdCBoYXMgcGFzc2VkXHJcbiAqICAgIG5hbWU6IHtcclxuICogICAgICB0ZXN0OiAoc3RyLCBjb25maWcpID0+IGJvb2wsXHJcbiAqICAgICAgdHJhbnNmb3JtOiAoc3RyLCBjb25maWcpID0+ICh7XHJcbiAqICAgICAgICByZW1haW5pbmdUbXBsU3RyOiBzdHIsXHJcbiAqICAgICAgICBpbnNlcnRpb25Qb2ludDogY3R4ID0+IGxpdC1odG1sLlRlbXBsYXRlUmVzdWx0IHwgdW5kZWZpbmVkLCAvLyBpZiB1bmRlZmluZWQgcmVtYWluaW5nVG1wbFN0ciB3aWxsIGJlIG1lcmdlZCB3aXRoIGxhc3Qgc3RhdGljIHBhcnQgXHJcbiAqICAgICAgfSksXHJcbiAqICAgIH0sXHJcbiAqICB9LFxyXG4gKiAgdHJhbnNmb3JtVmFyaWFibGUsIFxyXG4gKiB9XHJcbiAqIEByZXR1cm5zIHtmdW5jdGlvbn0gc3RyVGVtcGxhdGUgPT4gY3R4ID0+IGxpdC1odG1sLlRlbXBsYXRlUmVzdWx0XHJcbiAqL1xyXG5leHBvcnQgZGVmYXVsdCBjb25maWcgPT4gc3RyVGVtcGxhdGUgPT4gdHJhbnNmb3JtKHN0clRlbXBsYXRlLCBjb25maWcpXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gdHJhbnNmb3JtKHRtcGwyUGFyc2UsIGNvbmZpZykge1xyXG4gIGNvbnN0IHN0YXRpY1BhcnRzID0gW11cclxuICBjb25zdCBpbnNlcnRpb25Qb2ludHMgPSBbXVxyXG5cclxuICBsZXQgcmVtYWluaW5nVG1wbFN0ciA9IHRtcGwyUGFyc2VcclxuICBsZXQgc3RhcnRJbmRleE9mSVAgPSByZW1haW5pbmdUbXBsU3RyLmluZGV4T2YoY29uZmlnLmRlbGltaXRlci5zdGFydClcclxuICB3aGlsZSAoc3RhcnRJbmRleE9mSVAgPj0gMCkge1xyXG4gICAgaWYgKHJlbWFpbmluZ1RtcGxTdHIuaW5kZXhPZihjb25maWcuZGVsaW1pdGVyLmVuZCwgc3RhcnRJbmRleE9mSVApIDwgMClcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBtaXNzaW5nIGVuZCBkZWxpbWl0ZXIgYXQ6ICcke3JlbWFpbmluZ1RtcGxTdHJ9J2ApXHJcblxyXG4gICAgc3RhdGljUGFydHMucHVzaChyZW1haW5pbmdUbXBsU3RyLnN1YnN0cmluZygwLCBzdGFydEluZGV4T2ZJUCkpXHJcblxyXG4gICAgY29uc3QgaVBUcmFuc2Zvcm1SZXN1bHQgPSB0cmFuc2Zvcm1JUChcclxuICAgICAgcmVtYWluaW5nVG1wbFN0ci5zdWJzdHJpbmcoc3RhcnRJbmRleE9mSVAgKyBjb25maWcuZGVsaW1pdGVyLnN0YXJ0Lmxlbmd0aCksXHJcbiAgICAgIGNvbmZpZ1xyXG4gICAgKVxyXG5cclxuICAgIGlmIChpUFRyYW5zZm9ybVJlc3VsdC5pbnNlcnRpb25Qb2ludCkge1xyXG4gICAgICByZW1haW5pbmdUbXBsU3RyID0gaVBUcmFuc2Zvcm1SZXN1bHQucmVtYWluaW5nVG1wbFN0clxyXG4gICAgICBpbnNlcnRpb25Qb2ludHMucHVzaChpUFRyYW5zZm9ybVJlc3VsdC5pbnNlcnRpb25Qb2ludClcclxuICAgICAgc3RhcnRJbmRleE9mSVAgPSByZW1haW5pbmdUbXBsU3RyLmluZGV4T2YoY29uZmlnLmRlbGltaXRlci5zdGFydClcclxuICAgIH0gZWxzZSB7IC8vIGUuZy4gY29tbWVudCBvciBjdXN0b21EZWxpbWV0ZXJcclxuICAgICAgY29uc3QgbGFzdFN0YXRpY1BhcnQgPSBzdGF0aWNQYXJ0cy5wb3AoKVxyXG4gICAgICByZW1haW5pbmdUbXBsU3RyID0gbGFzdFN0YXRpY1BhcnQgKyBpUFRyYW5zZm9ybVJlc3VsdC5yZW1haW5pbmdUbXBsU3RyXHJcbiAgICAgIHN0YXJ0SW5kZXhPZklQID0gcmVtYWluaW5nVG1wbFN0ci5pbmRleE9mKGNvbmZpZy5kZWxpbWl0ZXIuc3RhcnQsIGxhc3RTdGF0aWNQYXJ0Lmxlbmd0aClcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHN0YXRpY1BhcnRzLnB1c2gocmVtYWluaW5nVG1wbFN0cilcclxuXHJcbiAgcmV0dXJuIGN0eCA9PlxyXG4gICAgY29uZmlnLmh0bWwoc3RhdGljUGFydHMsIC4uLmluc2VydGlvblBvaW50cy5tYXAoaVAgPT4gaVAoY3R4KSkpXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHRyYW5zZm9ybUlQKHJlbWFpbmluZ1RtcGxTdHIsIGNvbmZpZykge1xyXG4gIGNvbnN0IHRyYW5zZm9ybWVyID0gT2JqZWN0LnZhbHVlcyhjb25maWcudHJhbnNmb3JtZXJzKS5maW5kKHQgPT4gdC50ZXN0KHJlbWFpbmluZ1RtcGxTdHIsIGNvbmZpZykpXHJcbiAgY29uc3QgdHJhbnNmb3JtRnVuY3Rpb24gPSB0cmFuc2Zvcm1lclxyXG4gICAgPyB0cmFuc2Zvcm1lci50cmFuc2Zvcm1cclxuICAgIDogY29uZmlnLnRyYW5zZm9ybVZhcmlhYmxlXHJcbiAgcmV0dXJuIHRyYW5zZm9ybUZ1bmN0aW9uKHJlbWFpbmluZ1RtcGxTdHIsIGNvbmZpZylcclxufSIsImV4cG9ydCBmdW5jdGlvbiBjdHgyVmFsdWUoY3R4LCBrZXkpIHtcclxuICBpZiAoa2V5ID09PSAnLicpXHJcbiAgICByZXR1cm4gY3R4XHJcblxyXG4gIGxldCByZXN1bHQgPSBjdHhcclxuICBmb3IgKGxldCBrIG9mIGtleS5zcGxpdCgnLicpKSB7XHJcbiAgICBpZiAoIXJlc3VsdC5oYXNPd25Qcm9wZXJ0eShrKSlcclxuICAgICAgcmV0dXJuICcnXHJcblxyXG4gICAgcmVzdWx0ID0gcmVzdWx0W2tdXHJcbiAgfVxyXG5cclxuICByZXR1cm4gcmVzdWx0XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBjdHgyTXVzdGFjaGVTdHJpbmcoY3R4LCBrZXkpIHtcclxuICByZXR1cm4gbXVzdGFjaGVTdHJpbmd5ZnkoY3R4MlZhbHVlKGN0eCwga2V5KSlcclxufVxyXG5cclxuZnVuY3Rpb24gbXVzdGFjaGVTdHJpbmd5ZnkodmFsdWUpIHtcclxuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gbnVsbClcclxuICAgIHJldHVybiAnJ1xyXG5cclxuICByZXR1cm4gJycgKyB2YWx1ZVxyXG59IiwiaW1wb3J0IHsgY3R4Mk11c3RhY2hlU3RyaW5nIH0gZnJvbSAnLi4vaGVscGVyL2RhdGFIZWxwZXIuanMnXHJcblxyXG5leHBvcnQgZGVmYXVsdCAocmVtYWluaW5nVG1wbFN0ciwgeyBkZWxpbWl0ZXIgfSkgPT4ge1xyXG4gIGNvbnN0IGluZGV4T2ZFbmREZWxpbWl0ZXIgPSByZW1haW5pbmdUbXBsU3RyLmluZGV4T2YoZGVsaW1pdGVyLmVuZClcclxuICBjb25zdCBkYXRhS2V5ID0gcmVtYWluaW5nVG1wbFN0ci5zdWJzdHJpbmcoMCwgaW5kZXhPZkVuZERlbGltaXRlcilcclxuICByZXR1cm4ge1xyXG4gICAgcmVtYWluaW5nVG1wbFN0cjogcmVtYWluaW5nVG1wbFN0ci5zdWJzdHJpbmcoaW5kZXhPZkVuZERlbGltaXRlciArIGRlbGltaXRlci5lbmQubGVuZ3RoKSxcclxuICAgIGluc2VydGlvblBvaW50OiBjdHggPT4gY3R4Mk11c3RhY2hlU3RyaW5nKGN0eCwgZGF0YUtleSlcclxuICB9XHJcbn0iLCJpbXBvcnQgeyBjdHgyTXVzdGFjaGVTdHJpbmcgfSBmcm9tICcuLi9oZWxwZXIvZGF0YUhlbHBlci5qcydcclxuXHJcbi8qKiBOb3RlLCB0aGlzIGlzIHVuc2FmZSB0byB1c2UsIGJlY2F1c2UgdGhlIHJlbmRlcmVkIG91dHB1dCBjb3VsZCBiZSBhbnkgSmF2YVNjcmlwdCEgKi9cclxuZXhwb3J0IGRlZmF1bHQgdW5zYWZlSFRNTCA9PiAoe1xyXG4gIHRlc3Q6IHJlbWFpbmluZ1RtcGxTdHIgPT4gcmVtYWluaW5nVG1wbFN0clswXSA9PT0gJ3snLFxyXG4gIHRyYW5zZm9ybTogKHJlbWFpbmluZ1RtcGxTdHIsIHsgZGVsaW1pdGVyIH0pID0+IHtcclxuICAgIGNvbnN0IGluZGV4T2ZFbmREZWxpbWl0ZXIgPSByZW1haW5pbmdUbXBsU3RyLmluZGV4T2YoJ30nICsgZGVsaW1pdGVyLmVuZClcclxuICAgIGlmIChpbmRleE9mRW5kRGVsaW1pdGVyIDwgMClcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBtaXNzaW5nIGVuZCBkZWxpbWl0ZXIgYXQ6ICcke2RlbGltaXRlci5zdGFydH0ke3JlbWFpbmluZ1RtcGxTdHJ9J2ApXHJcbiAgXHJcbiAgICBjb25zdCBkYXRhS2V5ID0gcmVtYWluaW5nVG1wbFN0ci5zdWJzdHJpbmcoMSwgaW5kZXhPZkVuZERlbGltaXRlcilcclxuICAgIHJldHVybiB7XHJcbiAgICAgIHJlbWFpbmluZ1RtcGxTdHI6IHJlbWFpbmluZ1RtcGxTdHIuc3Vic3RyaW5nKGluZGV4T2ZFbmREZWxpbWl0ZXIgKyAxICsgZGVsaW1pdGVyLmVuZC5sZW5ndGgpLFxyXG4gICAgICBpbnNlcnRpb25Qb2ludDogY3R4ID0+IHVuc2FmZUhUTUwoY3R4Mk11c3RhY2hlU3RyaW5nKGN0eCwgZGF0YUtleSkpLFxyXG4gICAgfVxyXG4gIH1cclxufSkiLCJleHBvcnQgZnVuY3Rpb24gaXNNdXN0YWNoZUZhbHN5KHZhbHVlKSB7XHJcbiAgcmV0dXJuIFtudWxsLCB1bmRlZmluZWQsIGZhbHNlLCAwLCBOYU4sICcnXVxyXG4gICAgLnNvbWUoZmFsc3kgPT4gZmFsc3kgPT09IHZhbHVlKVxyXG4gICAgfHwgKHZhbHVlLmxlbmd0aCAmJiB2YWx1ZS5sZW5ndGggPT09IDApXHJcbn0iLCJleHBvcnQgZnVuY3Rpb24gcGFyc2VTZWN0aW9uKHRtcGxTdHIsIGRlbGltaXRlcikge1xyXG4gIGNvbnN0IGluZGV4T2ZTdGFydFRhZ0VuZCA9IHRtcGxTdHIuaW5kZXhPZihkZWxpbWl0ZXIuZW5kKVxyXG4gIGNvbnN0IGRhdGFLZXkgPSB0bXBsU3RyLnN1YnN0cmluZygxLCBpbmRleE9mU3RhcnRUYWdFbmQpXHJcbiAgY29uc3QgZW5kVGFnID0gYCR7ZGVsaW1pdGVyLnN0YXJ0fS8ke2RhdGFLZXl9JHtkZWxpbWl0ZXIuZW5kfWBcclxuICBjb25zdCBpbmRleE9mRW5kVGFnU3RhcnQgPSB0bXBsU3RyLmluZGV4T2YoZW5kVGFnKVxyXG4gIGlmIChpbmRleE9mRW5kVGFnU3RhcnQgPCAwKVxyXG4gICAgdGhyb3cgbmV3IEVycm9yKGBtaXNzaW5nIGVuZCBkZWxpbWl0ZXIgYXQ6ICcke2RlbGltaXRlci5zdGFydH0ke3RtcGxTdHJ9J2ApXHJcbiAgXHJcbiAgcmV0dXJuIHtcclxuICAgIGRhdGFLZXksXHJcbiAgICBpbm5lclRtcGw6IHRtcGxTdHIuc3Vic3RyaW5nKGluZGV4T2ZTdGFydFRhZ0VuZCArIGRlbGltaXRlci5zdGFydC5sZW5ndGgsIGluZGV4T2ZFbmRUYWdTdGFydCksXHJcbiAgICByZW1haW5pbmdUbXBsU3RyOiB0bXBsU3RyLnN1YnN0cmluZyhpbmRleE9mRW5kVGFnU3RhcnQgKyBlbmRUYWcubGVuZ3RoKSxcclxuICB9XHJcbn0iLCJpbXBvcnQgeyB0cmFuc2Zvcm0gfSBmcm9tICcuLi9saXQtdHJhbnNmb3JtZXIuanMnXHJcbmltcG9ydCB7IGN0eDJWYWx1ZSB9IGZyb20gJy4uL2hlbHBlci9kYXRhSGVscGVyLmpzJ1xyXG5pbXBvcnQgeyBpc011c3RhY2hlRmFsc3kgfSBmcm9tICcuLi9oZWxwZXIvaXNNdXN0YWNoZUZhbHN5LmpzJ1xyXG5pbXBvcnQgeyBwYXJzZVNlY3Rpb24gfSBmcm9tICcuLi9oZWxwZXIvc2VjdGlvbkhlbHBlci5qcydcclxuXHJcbi8qKiBOb3RlLCB1bmxpa2Ugd2l0aGluIG11c3RhY2hlIGZ1bmN0aW9ucyBhcyBkYXRhIHZhbHVlcyBhcmUgbm90IHN1cHBvcnRlZCBvdXQgb2YgdGhlIGJveCAqL1xyXG5leHBvcnQgZGVmYXVsdCAoKSA9PiAoe1xyXG4gIHRlc3Q6IHJlbWFpbmluZ1RtcGxTdHIgPT4gcmVtYWluaW5nVG1wbFN0clswXSA9PT0gJyMnLFxyXG4gIHRyYW5zZm9ybTogKHJlbWFpbmluZ1RtcGxTdHIsIGNvbmZpZykgPT4ge1xyXG4gICAgY29uc3QgcGFyc2VkU2VjdGlvbiA9IHBhcnNlU2VjdGlvbihyZW1haW5pbmdUbXBsU3RyLCBjb25maWcuZGVsaW1pdGVyKVxyXG4gICAgY29uc3QgdHJhbnNmb3JtZWRJbm5lclRtcGwgPSB0cmFuc2Zvcm0ocGFyc2VkU2VjdGlvbi5pbm5lclRtcGwsIGNvbmZpZylcclxuICAgIFxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgcmVtYWluaW5nVG1wbFN0cjogcGFyc2VkU2VjdGlvbi5yZW1haW5pbmdUbXBsU3RyLFxyXG4gICAgICBpbnNlcnRpb25Qb2ludDogY3R4ID0+IHtcclxuICAgICAgICBjb25zdCBzZWN0aW9uRGF0YSA9IGN0eDJWYWx1ZShjdHgsIHBhcnNlZFNlY3Rpb24uZGF0YUtleSlcclxuICAgICAgICBcclxuICAgICAgICBpZiAoaXNNdXN0YWNoZUZhbHN5KHNlY3Rpb25EYXRhKSlcclxuICAgICAgICAgIHJldHVybiAnJztcclxuXHJcbiAgICAgICAgcmV0dXJuIHNlY3Rpb25EYXRhLm1hcFxyXG4gICAgICAgICAgPyBzZWN0aW9uRGF0YS5tYXAoaW5uZXJDdHggPT4gdHJhbnNmb3JtZWRJbm5lclRtcGwoaW5uZXJDdHgpKVxyXG4gICAgICAgICAgOiB0cmFuc2Zvcm1lZElubmVyVG1wbChjdHgpXHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcbn0pIiwiaW1wb3J0IHsgdHJhbnNmb3JtIH0gZnJvbSAnLi4vbGl0LXRyYW5zZm9ybWVyLmpzJ1xuaW1wb3J0IHsgY3R4MlZhbHVlIH0gZnJvbSAnLi4vaGVscGVyL2RhdGFIZWxwZXIuanMnXG5pbXBvcnQgeyBpc011c3RhY2hlRmFsc3kgfSBmcm9tICcuLi9oZWxwZXIvaXNNdXN0YWNoZUZhbHN5LmpzJ1xuaW1wb3J0IHsgcGFyc2VTZWN0aW9uIH0gZnJvbSAnLi4vaGVscGVyL3NlY3Rpb25IZWxwZXIuanMnXG5cbmV4cG9ydCBkZWZhdWx0ICgpID0+ICh7XG4gIHRlc3Q6IHJlbWFpbmluZ1RtcGxTdHIgPT4gcmVtYWluaW5nVG1wbFN0clswXSA9PT0gJ14nLFxuICAvKlxuICAgKiBwYXRjaCBmb3Igdi4xLjAuMlxuICAgKiBhcHBseSB0cmFuc2Zvcm1lZElubmVyVG1wbCgpXG4gICAqL1xuICB0cmFuc2Zvcm06IChyZW1haW5pbmdUbXBsU3RyLCBjb25maWcpID0+IHtcbiAgICBjb25zdCBwYXJzZWRTZWN0aW9uID0gcGFyc2VTZWN0aW9uKHJlbWFpbmluZ1RtcGxTdHIsIGNvbmZpZy5kZWxpbWl0ZXIpXG4gICAgY29uc3QgdHJhbnNmb3JtZWRJbm5lclRtcGwgPSB0cmFuc2Zvcm0ocGFyc2VkU2VjdGlvbi5pbm5lclRtcGwsIGNvbmZpZylcbiAgICBcbiAgICByZXR1cm4ge1xuICAgICAgcmVtYWluaW5nVG1wbFN0cjogcGFyc2VkU2VjdGlvbi5yZW1haW5pbmdUbXBsU3RyLFxuICAgICAgaW5zZXJ0aW9uUG9pbnQ6IGN0eCA9PiB7XG4gICAgICAgIGNvbnN0IHNlY3Rpb25EYXRhID0gY3R4MlZhbHVlKGN0eCwgcGFyc2VkU2VjdGlvbi5kYXRhS2V5KVxuICAgICAgICBcbiAgICAgICAgaWYgKGlzTXVzdGFjaGVGYWxzeShzZWN0aW9uRGF0YSkpXG4gICAgICAgICAgcmV0dXJuIHNlY3Rpb25EYXRhLm1hcFxuICAgICAgICAgICAgPyBzZWN0aW9uRGF0YS5tYXAoaW5uZXJDdHggPT4gdHJhbnNmb3JtZWRJbm5lclRtcGwoaW5uZXJDdHgpKVxuICAgICAgICAgICAgOiB0cmFuc2Zvcm1lZElubmVyVG1wbChjdHgpXG4gICAgICAgIHJldHVybiAnJztcbiAgICAgIH1cbiAgICB9XG4gIH1cbn0pXG4iLCJleHBvcnQgZGVmYXVsdCAoKSA9PiAoe1xyXG4gIHRlc3Q6IHJlbWFpbmluZ1RtcGxTdHIgPT4gcmVtYWluaW5nVG1wbFN0clswXSA9PT0gJyEnLFxyXG4gIHRyYW5zZm9ybTogKHJlbWFpbmluZ1RtcGxTdHIsIHsgZGVsaW1pdGVyIH0pID0+ICh7XHJcbiAgICByZW1haW5pbmdUbXBsU3RyOiByZW1haW5pbmdUbXBsU3RyLnN1YnN0cmluZyhyZW1haW5pbmdUbXBsU3RyLmluZGV4T2YoZGVsaW1pdGVyLmVuZCkgKyBkZWxpbWl0ZXIuZW5kLmxlbmd0aCksXHJcbiAgICBpbnNlcnRpb25Qb2ludDogdW5kZWZpbmVkLFxyXG4gIH0pXHJcbn0pIiwiZXhwb3J0IGRlZmF1bHQgKCkgPT4gKHtcclxuICB0ZXN0OiByZW1haW5pbmdUbXBsU3RyID0+IHJlbWFpbmluZ1RtcGxTdHJbMF0gPT09ICc9JyxcclxuICB0cmFuc2Zvcm06IChyZW1haW5pbmdUbXBsU3RyLCBjb25maWcpID0+IHtcclxuICAgIGNvbnN0IG9yaWdpbmFsRW5kRGVsaUxlbmd0aCA9IGNvbmZpZy5kZWxpbWl0ZXIuZW5kLmxlbmd0aFxyXG4gICAgY29uc3QgaW5kZXhPZkVuZFRhZyA9IHJlbWFpbmluZ1RtcGxTdHIuaW5kZXhPZignPScgKyBjb25maWcuZGVsaW1pdGVyLmVuZClcclxuICAgIGlmIChpbmRleE9mRW5kVGFnIDwgMCApXHJcbiAgICAgIHRocm93IG5ldyBFcnJvcihgbWlzc2luZyBlbmQgZGVsaW1pdGVyIGF0OiAnJHtyZW1haW5pbmdUbXBsU3RyfSdgKVxyXG5cclxuICAgIGNvbnN0IFsgbmV3U3RhcnREZWxpLCBuZXdFbmREZWxpIF0gPSByZW1haW5pbmdUbXBsU3RyLnN1YnN0cmluZygxLCBpbmRleE9mRW5kVGFnKS5zcGxpdCgnICcpXHJcblxyXG4gICAgY29uZmlnLmRlbGltaXRlci5zdGFydCA9IG5ld1N0YXJ0RGVsaVxyXG4gICAgY29uZmlnLmRlbGltaXRlci5lbmQgPSBuZXdFbmREZWxpXHJcbiAgICBcclxuICAgIHJldHVybiB7XHJcbiAgICAgIHJlbWFpbmluZ1RtcGxTdHI6IHJlbWFpbmluZ1RtcGxTdHIuc3Vic3RyaW5nKGluZGV4T2ZFbmRUYWcgKyAxICsgb3JpZ2luYWxFbmREZWxpTGVuZ3RoKSxcclxuICAgICAgaW5zZXJ0aW9uUG9pbnQ6IHVuZGVmaW5lZCwgIFxyXG4gICAgfVxyXG4gIH1cclxufSkiLCJpbXBvcnQgY3JlYXRlVHJhbnNmb3JtIGZyb20gJy4vbGl0LXRyYW5zZm9ybWVyLmpzJ1xyXG5pbXBvcnQgdHJhbnNmb3JtVmFyaWFibGUgZnJvbSAnLi90cmFuc2Zvcm1lcnMvdmFyaWFibGVUcmFuc2Zvcm1lci5qcydcclxuaW1wb3J0IHVuc2FmZVZhcmlhYmxlVHJhbnNmb3JtZXIgZnJvbSAnLi90cmFuc2Zvcm1lcnMvdW5zYWZlVmFyaWFibGUuanMnXHJcbmltcG9ydCBzZWN0aW9uVHJhbnNmb3JtZXIgZnJvbSAnLi90cmFuc2Zvcm1lcnMvc2VjdGlvbi5qcydcclxuaW1wb3J0IGludmVydGVkU2VjdGlvblRyYW5zZm9ybWVyIGZyb20gJy4vdHJhbnNmb3JtZXJzL2ludmVydGVkU2VjdGlvbi5qcydcclxuaW1wb3J0IGNvbW1lbnRUcmFuc2Zvcm1lciBmcm9tICcuL3RyYW5zZm9ybWVycy9jb21tZW50LmpzJ1xyXG5pbXBvcnQgY3VzdG9tRGVsaW1pdGVyVHJhbnNmb3JtZXIgZnJvbSAnLi90cmFuc2Zvcm1lcnMvY3VzdG9tRGVsaW1pdGVyLmpzJ1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgKGh0bWwsIHVuc2FmZUhUTUwpID0+XHJcbiAgY3JlYXRlVHJhbnNmb3JtKHtcclxuICAgIGh0bWwsXHJcbiAgICBkZWxpbWl0ZXI6IHsgc3RhcnQ6ICd7eycsIGVuZDogJ319JyB9LFxyXG4gICAgdHJhbnNmb3JtVmFyaWFibGUsXHJcbiAgICB0cmFuc2Zvcm1lcnM6IHtcclxuICAgICAgdW5zYWZlVmFyaWFibGU6IHVuc2FmZVZhcmlhYmxlVHJhbnNmb3JtZXIodW5zYWZlSFRNTCksXHJcbiAgICAgIHNlY3Rpb246IHNlY3Rpb25UcmFuc2Zvcm1lcigpLFxyXG4gICAgICBpbnZlcnRlZFNlY3Rpb246IGludmVydGVkU2VjdGlvblRyYW5zZm9ybWVyKCksXHJcbiAgICAgIGNvbW1lbnQ6IGNvbW1lbnRUcmFuc2Zvcm1lcigpLFxyXG4gICAgICBjdXN0b21EZWxpbWl0ZXJUcmFuc2Zvcm1lcjogY3VzdG9tRGVsaW1pdGVyVHJhbnNmb3JtZXIoKSxcclxuICAgIH0sXHJcbiAgfSkiLCJpbXBvcnQgeyB0b1RlbXBsYXRlU3RyaW5nc0FycmF5IH0gZnJvbSAnQGNkcC9leHRlbnNpb24tdGVtcGxhdGUnO1xuaW1wb3J0IHR5cGUgeyBUZW1wbGF0ZUJyaWRnZUVuZGluZSwgVGVtcGxhdGVUcmFuc2Zvcm1lciB9IGZyb20gJ0BicmlkZ2UvaW50ZXJmYWNlcyc7XG5pbXBvcnQgdHlwZSB7XG4gICAgTXVzdGFjaGVUcmFuc2Zvcm1lcixcbiAgICBUZW1wbGF0ZVRhZyxcbiAgICBUcmFuc2Zvcm1EaXJlY3RpdmUsXG4gICAgVHJhbnNmb3JtVGVzdGVyLFxuICAgIFRyYW5zZm9ybUV4ZWN1dG9yLFxuICAgIFRyYW5zZm9ybWVDb250ZXh0LFxuICAgIFRyYW5zZm9ybUNvbmZpZyxcbn0gZnJvbSAnbGl0LXRyYW5zZm9ybWVyL3NyYy9pbnRlcmZhY2VzJztcblxuaW1wb3J0IGNyZWF0ZURlZmF1bHQgZnJvbSAnbGl0LXRyYW5zZm9ybWVyJztcbmltcG9ydCBjcmVhdGVDdXN0b20gZnJvbSAnbGl0LXRyYW5zZm9ybWVyL3NyYy9saXQtdHJhbnNmb3JtZXInO1xuXG5pbXBvcnQgdmFyaWFibGUgZnJvbSAnbGl0LXRyYW5zZm9ybWVyL3NyYy90cmFuc2Zvcm1lcnMvdmFyaWFibGVUcmFuc2Zvcm1lcic7XG5pbXBvcnQgdW5zYWZlVmFyaWFibGUgZnJvbSAnbGl0LXRyYW5zZm9ybWVyL3NyYy90cmFuc2Zvcm1lcnMvdW5zYWZlVmFyaWFibGUnO1xuaW1wb3J0IHNlY3Rpb24gZnJvbSAnbGl0LXRyYW5zZm9ybWVyL3NyYy90cmFuc2Zvcm1lcnMvc2VjdGlvbic7XG5pbXBvcnQgaW52ZXJ0ZWRTZWN0aW9uIGZyb20gJ2xpdC10cmFuc2Zvcm1lci9zcmMvdHJhbnNmb3JtZXJzL2ludmVydGVkU2VjdGlvbic7XG5pbXBvcnQgY29tbWVudCBmcm9tICdsaXQtdHJhbnNmb3JtZXIvc3JjL3RyYW5zZm9ybWVycy9jb21tZW50JztcbmltcG9ydCBjdXN0b21EZWxpbWl0ZXIgZnJvbSAnbGl0LXRyYW5zZm9ybWVyL3NyYy90cmFuc2Zvcm1lcnMvY3VzdG9tRGVsaW1pdGVyJztcblxuLyoqIEBpbnRlcm5hbCAqL1xudHlwZSBNdXN0YWNoZVRyYW5zZm9ybWVyQ29udGV4dCA9IE11c3RhY2hlVHJhbnNmb3JtZXIgJiB7IGRlbGltaXRlcjogeyBzdGFydDogc3RyaW5nOyBlbmQ6IHN0cmluZzsgfTsgfTtcblxuY29uc3QgeGZvcm0gPSAobXVzdGFjaGU6IE11c3RhY2hlVHJhbnNmb3JtZXJDb250ZXh0KTogVGVtcGxhdGVUcmFuc2Zvcm1lciA9PiB7XG4gICAgcmV0dXJuICh0ZW1wbGF0ZTogSFRNTFRlbXBsYXRlRWxlbWVudCB8IHN0cmluZyk6IFRlbXBsYXRlQnJpZGdlRW5kaW5lID0+IHtcbiAgICAgICAgY29uc3QgeyBzdGFydCwgZW5kIH0gPSBtdXN0YWNoZS5kZWxpbWl0ZXI7XG5cbiAgICAgICAgLy8g44Kz44Oh44Oz44OI44OW44Ot44OD44Kv5YaF44GuIGRlbGltaXRlciDmir3lh7pcbiAgICAgICAgY29uc3QgcmVnQ29tbWVudFJlbW92ZVN0YXJ0ID0gbmV3IFJlZ0V4cChgPCEtLVxcXFxzKiR7c3RhcnR9YCwgJ2cnKTtcbiAgICAgICAgY29uc3QgcmVnQ29tbWVudFJlbW92ZUVuZCAgID0gbmV3IFJlZ0V4cChgJHtlbmR9XFxcXHMqLS0+YCwgJ2cnKTtcbiAgICAgICAgLy8gZGVsaW1pdGVyIOWJjeW+jOOBriB0cmltIOeUqOato+imj+ihqOePvlxuICAgICAgICBjb25zdCByZWdUcmltID0gbmV3IFJlZ0V4cChgKCR7c3RhcnR9WyNeL10/KVxcXFxzKihbXFxcXHdcXFxcLl0rKVxcXFxzKigke2VuZH0pYCwgJ2cnKTtcblxuICAgICAgICBjb25zdCBib2R5ID0gKHRlbXBsYXRlIGluc3RhbmNlb2YgSFRNTFRlbXBsYXRlRWxlbWVudCA/IHRlbXBsYXRlLmlubmVySFRNTCA6IHRlbXBsYXRlKVxuICAgICAgICAgICAgLnJlcGxhY2UocmVnQ29tbWVudFJlbW92ZVN0YXJ0LCBzdGFydClcbiAgICAgICAgICAgIC5yZXBsYWNlKHJlZ0NvbW1lbnRSZW1vdmVFbmQsIGVuZClcbiAgICAgICAgICAgIC5yZXBsYWNlKHJlZ1RyaW0sICckMSQyJDMnKVxuICAgICAgICA7XG5cbiAgICAgICAgcmV0dXJuIG11c3RhY2hlKGJvZHkpO1xuICAgIH07XG59O1xuXG4vKlxuICogbGl0LWh0bWwgdjIuMS4wK1xuICogVGVtcGxhdGVTdHJpbmdzQXJyYXkg44KS5Y6z5a+G44Gr44OB44Kn44OD44Kv44GZ44KL44KI44GG44Gr44Gq44Gj44Gf44Gf44KBIHBhdGNoIOOCkuOBguOBpuOCi1xuICogaHR0cHM6Ly9naXRodWIuY29tL2xpdC9saXQvcHVsbC8yMzA3XG4gKlxuICog5bCG5p2lIGBBcnJheS5pc1RlbXBsYXRlT2JqZWN0KClgIOOCkuS9v+eUqOOBleOCjOOCi+WgtOWQiCwg5pys5a++5b+c44KC6KaL55u044GZ5b+F6KaB44GC44KKXG4gKiBodHRwczovL3RjMzkuZXMvcHJvcG9zYWwtYXJyYXktaXMtdGVtcGxhdGUtb2JqZWN0L1xuICovXG5jb25zdCBwYXRjaCA9IChodG1sOiBUZW1wbGF0ZVRhZyk6IFRlbXBsYXRlVGFnID0+IHtcbiAgICByZXR1cm4gKHRlbXBsYXRlOiBUZW1wbGF0ZVN0cmluZ3NBcnJheSwgLi4udmFsdWVzOiB1bmtub3duW10pID0+IHtcbiAgICAgICAgcmV0dXJuIGh0bWwodG9UZW1wbGF0ZVN0cmluZ3NBcnJheSh0ZW1wbGF0ZSksIC4uLnZhbHVlcyk7XG4gICAgfTtcbn07XG5cbmZ1bmN0aW9uIGNyZWF0ZU11c3RhY2hlVHJhbnNmb3JtZXIoaHRtbDogVGVtcGxhdGVUYWcsIHVuc2FmZUhUTUw6IFRyYW5zZm9ybURpcmVjdGl2ZSk6IFRlbXBsYXRlVHJhbnNmb3JtZXI7XG5mdW5jdGlvbiBjcmVhdGVNdXN0YWNoZVRyYW5zZm9ybWVyKGNvbmZpZzogVHJhbnNmb3JtQ29uZmlnKTogVGVtcGxhdGVUcmFuc2Zvcm1lcjtcbmZ1bmN0aW9uIGNyZWF0ZU11c3RhY2hlVHJhbnNmb3JtZXIoYXJnMTogdW5rbm93biwgYXJnMj86IHVua25vd24pOiBUZW1wbGF0ZVRyYW5zZm9ybWVyIHtcbiAgICBjb25zdCBkZWxpbWl0ZXIgPSB7IHN0YXJ0OiAne3snLCBlbmQ6ICd9fScgfTtcbiAgICBsZXQgdHJhbnNmb3JtZXI6IE11c3RhY2hlVHJhbnNmb3JtZXJDb250ZXh0O1xuICAgIGlmICgnZnVuY3Rpb24nID09PSB0eXBlb2YgYXJnMSkge1xuICAgICAgICB0cmFuc2Zvcm1lciA9IGNyZWF0ZURlZmF1bHQocGF0Y2goYXJnMSBhcyBUZW1wbGF0ZVRhZyksIGFyZzIgYXMgVHJhbnNmb3JtRGlyZWN0aXZlKSBhcyBNdXN0YWNoZVRyYW5zZm9ybWVyQ29udGV4dDtcbiAgICAgICAgdHJhbnNmb3JtZXIuZGVsaW1pdGVyID0gZGVsaW1pdGVyO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IHsgaHRtbCB9ID0gYXJnMSBhcyB7IGh0bWw6IFRlbXBsYXRlVGFnOyB9O1xuICAgICAgICBjb25zdCBjb25maWcgPSBPYmplY3QuYXNzaWduKHtcbiAgICAgICAgICAgIGRlbGltaXRlcixcbiAgICAgICAgICAgIHRyYW5zZm9ybWVyczoge30sXG4gICAgICAgIH0sIGFyZzEsIHsgaHRtbDogcGF0Y2goaHRtbCkgfSkgYXMgVHJhbnNmb3JtQ29uZmlnO1xuICAgICAgICB0cmFuc2Zvcm1lciA9IGNyZWF0ZUN1c3RvbShjb25maWcpIGFzIE11c3RhY2hlVHJhbnNmb3JtZXJDb250ZXh0O1xuICAgICAgICB0cmFuc2Zvcm1lci5kZWxpbWl0ZXIgPSBjb25maWcuZGVsaW1pdGVyITtcbiAgICB9XG4gICAgcmV0dXJuIHhmb3JtKHRyYW5zZm9ybWVyKTtcbn1cblxuY29uc3QgdHJhbnNmb3JtZXI6IHtcbiAgICB2YXJpYWJsZTogVHJhbnNmb3JtRXhlY3V0b3I7XG4gICAgdW5zYWZlVmFyaWFibGU6ICh1bnNhZmVIVE1MOiBUcmFuc2Zvcm1EaXJlY3RpdmUpID0+IFRyYW5zZm9ybWVDb250ZXh0O1xuICAgIHNlY3Rpb246ICgpID0+IFRyYW5zZm9ybWVDb250ZXh0O1xuICAgIGludmVydGVkU2VjdGlvbjogKCkgPT4gVHJhbnNmb3JtZUNvbnRleHQ7XG4gICAgY29tbWVudDogKCkgPT4gVHJhbnNmb3JtZUNvbnRleHQ7XG4gICAgY3VzdG9tRGVsaW1pdGVyOiAoKSA9PiBUcmFuc2Zvcm1lQ29udGV4dDtcbn0gPSB7XG4gICAgdmFyaWFibGUsXG4gICAgdW5zYWZlVmFyaWFibGUsXG4gICAgc2VjdGlvbixcbiAgICBpbnZlcnRlZFNlY3Rpb24sXG4gICAgY29tbWVudCxcbiAgICBjdXN0b21EZWxpbWl0ZXIsXG59O1xuXG5leHBvcnQge1xuICAgIFRlbXBsYXRlVGFnLFxuICAgIFRyYW5zZm9ybURpcmVjdGl2ZSxcbiAgICBUZW1wbGF0ZVRyYW5zZm9ybWVyLFxuICAgIFRyYW5zZm9ybVRlc3RlcixcbiAgICBUcmFuc2Zvcm1FeGVjdXRvcixcbiAgICBUcmFuc2Zvcm1lQ29udGV4dCxcbiAgICBUcmFuc2Zvcm1Db25maWcsXG4gICAgY3JlYXRlTXVzdGFjaGVUcmFuc2Zvcm1lcixcbiAgICB0cmFuc2Zvcm1lcixcbn07XG4iLG51bGwsbnVsbCxudWxsLG51bGwsbnVsbCwiaW1wb3J0IHR5cGUge1xuICAgIFRlbXBsYXRlQnJpZGdlQXJnLFxuICAgIFRlbXBsYXRlVHJhbnNmb3JtZXIsXG59IGZyb20gJ0BicmlkZ2UvaW50ZXJmYWNlcyc7XG5pbXBvcnQge1xuICAgIFRlbXBsYXRlSGFuZGxlcixcbiAgICBUZW1wbGF0ZUhhbmRsZXJzLFxuICAgIFRlbXBsYXRlUmVuZGVyZXJzLFxuICAgIEV2YWx1YXRlVGVtcGxhdGVSZXN1bHQsXG4gICAgcHJlcGFyZVRlbXBsYXRlLFxuICAgIGV2YWx1YXRlVGVtcGxhdGUsXG59IGZyb20gJ3N0YW1waW5vJztcblxuZXhwb3J0IGludGVyZmFjZSBDcmVhdGVTdGFtcGlub1RlbXBsYXRlT3B0aW9ucyB7XG4gICAgaGFuZGxlcnM/OiBUZW1wbGF0ZUhhbmRsZXJzO1xuICAgIHJlbmRlcmVycz86IFRlbXBsYXRlUmVuZGVyZXJzO1xuICAgIHN1cGVyVGVtcGxhdGU/OiBIVE1MVGVtcGxhdGVFbGVtZW50IHwgdW5kZWZpbmVkO1xufVxuXG5mdW5jdGlvbiBlbnN1cmUodGVtcGxhdGU6IEhUTUxUZW1wbGF0ZUVsZW1lbnQgfCBzdHJpbmcpOiBIVE1MVGVtcGxhdGVFbGVtZW50IHtcbiAgICBpZiAodGVtcGxhdGUgaW5zdGFuY2VvZiBIVE1MVGVtcGxhdGVFbGVtZW50KSB7XG4gICAgICAgIHJldHVybiB0ZW1wbGF0ZTtcbiAgICB9IGVsc2UgaWYgKCdzdHJpbmcnID09PSB0eXBlb2YgdGVtcGxhdGUpIHtcbiAgICAgICAgY29uc3QgZWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3RlbXBsYXRlJyk7XG4gICAgICAgIGVsZW1lbnQuaW5uZXJIVE1MID0gdGVtcGxhdGU7XG4gICAgICAgIHJldHVybiBlbGVtZW50O1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYFR5cGUgb2YgdGVtcGxhdGUgaXMgbm90IGEgdmFsaWQuIFt0eXBlb2Y6ICR7dHlwZW9mIHRlbXBsYXRlfV1gKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZVN0YW1waW5vVHJhbnNmb3JtZXIob3B0aW9ucz86IENyZWF0ZVN0YW1waW5vVGVtcGxhdGVPcHRpb25zKTogVGVtcGxhdGVUcmFuc2Zvcm1lciB7XG4gICAgY29uc3QgeyBoYW5kbGVycywgcmVuZGVyZXJzLCBzdXBlclRlbXBsYXRlIH0gPSBvcHRpb25zID8/IHt9O1xuICAgIHJldHVybiAodGVtcGxhdGU6IEhUTUxUZW1wbGF0ZUVsZW1lbnQgfCBzdHJpbmcpID0+IHtcbiAgICAgICAgcmV0dXJuIHByZXBhcmVUZW1wbGF0ZShlbnN1cmUodGVtcGxhdGUpLCBoYW5kbGVycywgcmVuZGVyZXJzLCBzdXBlclRlbXBsYXRlKTtcbiAgICB9O1xufVxuXG5leHBvcnQge1xuICAgIFRlbXBsYXRlQnJpZGdlQXJnLFxuICAgIFRlbXBsYXRlSGFuZGxlcixcbiAgICBUZW1wbGF0ZUhhbmRsZXJzLFxuICAgIFRlbXBsYXRlUmVuZGVyZXJzLFxuICAgIEV2YWx1YXRlVGVtcGxhdGVSZXN1bHQsXG4gICAgY3JlYXRlU3RhbXBpbm9UcmFuc2Zvcm1lcixcbiAgICBwcmVwYXJlVGVtcGxhdGUsXG4gICAgZXZhbHVhdGVUZW1wbGF0ZSxcbn07XG4iXSwibmFtZXMiOlsiY3JlYXRlVHJhbnNmb3JtIiwidHJhbnNmb3JtVmFyaWFibGUiLCJ1bnNhZmVWYXJpYWJsZVRyYW5zZm9ybWVyIiwic2VjdGlvblRyYW5zZm9ybWVyIiwiaW52ZXJ0ZWRTZWN0aW9uVHJhbnNmb3JtZXIiLCJjb21tZW50VHJhbnNmb3JtZXIiLCJjdXN0b21EZWxpbWl0ZXJUcmFuc2Zvcm1lciIsInRvVGVtcGxhdGVTdHJpbmdzQXJyYXkiLCJfzqMiLCJub3RoaW5nIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztFQUFBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7QUFDQSx1QkFBZSxNQUFNLElBQUksV0FBVyxJQUFJLFNBQVMsQ0FBQyxXQUFXLEVBQUUsTUFBTSxFQUFDO0FBQ3RFO0VBQ08sU0FBUyxTQUFTLENBQUMsVUFBVSxFQUFFLE1BQU0sRUFBRTtFQUM5QyxFQUFFLE1BQU0sV0FBVyxHQUFHLEdBQUU7RUFDeEIsRUFBRSxNQUFNLGVBQWUsR0FBRyxHQUFFO0FBQzVCO0VBQ0EsRUFBRSxJQUFJLGdCQUFnQixHQUFHLFdBQVU7RUFDbkMsRUFBRSxJQUFJLGNBQWMsR0FBRyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUM7RUFDdkUsRUFBRSxPQUFPLGNBQWMsSUFBSSxDQUFDLEVBQUU7RUFDOUIsSUFBSSxJQUFJLGdCQUFnQixD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SyxFQUFFO01BQ1QsRUFBRSxLQUFLLEVBQUU7Ozs7RUFJVCxLQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsRUFBRSxHQUFHLEVBQUUsWUFBWSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO0VBRTlDO0VBQ0EsTUFBTSxhQUFhLEdBQUcsQ0FBQyxFQUFVLEtBQy9CLHNCQUFzQixDQUFDLEVBQUUsQ0FBQyxJQUFJLFNBQVMsQ0FBQyxFQUFFLENBQUMsQ0FBQztFQUU5QyxNQUFNLFVBQVUsR0FBRyxDQUFDLEdBQVcsS0FBSyxRQUFRLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0VBRWpFLE1BQU0sUUFBUSxHQUFHLENBQUMsRUFBVSxLQUFLLEVBQUUsS0FBSyxFQUFFLFlBQVksRUFBRSxLQUFLLEVBQUUsQ0FBQztFQUVoRSxNQUFNLFNBQVMsR0FBRyxDQUFDLEVBQVUsS0FBSyxFQUFFLFlBQVksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLENBQUM7RUFFL0QsTUFBTSxXQUFXLEdBQUcsQ0FBQyxFQUFVLEtBQzdCLEVBQUUsS0FBSyxFQUFFO01BQ1QsRUFBRSxLQUFLLEVBQUU7TUFDVCxFQUFFLEtBQUssRUFBRTtNQUNULEVBQUUsS0FBSyxFQUFFO01BQ1QsRUFBRSxLQUFLLEVBQUU7TUFDVCxFQUFFLEtBQUssRUFBRTtNQUNULEVBQUUsS0FBSyxFQUFFO01BQ1QsRUFBRSxLQUFLLEVBQUU7TUFDVCxFQUFFLEtBQUssRUFBRTtNQUNULEVBQUUsS0FBSyxFQUFFO01BQ1QsRUFBRSxLQUFLLEVBQUU7TUFDVCxFQUFFLEtBQUssRUFBRTtFQUNULElBQUEsRUFBRSxLQUFLLEdBQUcsQ0FBQztFQUViLE1BQU0sVUFBVSxHQUFHLENBQUMsRUFBVSxLQUM1QixFQUFFLEtBQUssRUFBRTtNQUNULEVBQUUsS0FBSyxFQUFFO01BQ1QsRUFBRSxLQUFLLEVBQUU7TUFDVCxFQUFFLEtBQUssRUFBRTtNQUNULEVBQUUsS0FBSyxHQUFHO0VBQ1YsSUFBQSxFQUFFLEtBQUss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VyxHQUFHLFdBQVcsQ0FBQztFQUNsQyxhQUFBO0VBQ0YsU0FBQTtFQUNGLEtBQUE7RUFDRCxJQUFBLEtBQUssTUFBTSxDQUFDLElBQUksZ0JBQWdCLEVBQUU7VUFDaEMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDO0VBQ1osS0FBQTtFQUNELElBQUEsT0FBTyxXQUFXLENBQUM7RUFDckIsQ0FBQzs7RUNqY0QsU0FBUyxNQUFNLENBQUMsUUFBc0MsRUFBQTtFQUNsRCxJQUFBLElBQUksUUFBUSxZQUFZLG1CQUFtQixFQUFFO0VBQ3pDLFFBQUEsT0FBTyxRQUFRLENBQUM7T0FDbkI7RUFBTSxTQUFBLElBQUksUUFBUSxLQUFLLE9BQU8sUUFBUSxFQUFFO1VBQ3JDLE1BQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLENBQUM7RUFDbkQsUUFBQSxPQUFPLENBQUMsU0FBUyxHQUFHLFFBQVEsQ0FBQztFQUM3QixRQUFBLE9BQU8sT0FBTyxDQUFDO09BQ2xCO1dBQU07VUFDSCxNQUFNLElBQUksU0FBUyxDQUFDLENBQUEsMENBQUEsRUFBNkMsT0FBTyxRQUFRLENBQUEsQ0FBQSxDQUFHLENBQUMsQ0FBQztPQUN4RjtFQUNMLENBQUM7RUFFRCxTQUFTLHlCQUF5QixDQUFDLE9BQXVDLEVBQUE7TUFDdEUsTUFBTSxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsYUFBYSxFQUFFLEdBQUcsT0FBTyxJQUFJLEVBQUUsQ0FBQztNQUM3RCxPQUFPLENBQUMsUUFBc0MsS0FBSTtFQUM5QyxRQUFBLE9BQU8sZUFBZSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLGFBQWEsQ0FBQyxDQUFDO0VBQ2pGLEtBQUMsQ0FBQztFQUNOOzs7Ozs7Ozs7Ozs7OzsiLCJ4X2dvb2dsZV9pZ25vcmVMaXN0IjpbMCwxLDIsMyw0LDUsNiw3LDgsOSwxMCwxMiwxMywxNCwxNSwxNl0sInNvdXJjZVJvb3QiOiJjZHA6Ly8vQGNkcC9leHRlbnNpb24tdGVtcGxhdGUtYnJpZGdlLyJ9