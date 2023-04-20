/*!
 * @cdp/extension-template-bridge 0.9.17
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
          transformer.delimiter = config.delimiter; // eslint-disable-line @typescript-eslint/no-non-null-assertion
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

  Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uLXRlbXBsYXRlLWJyaWRnZS5qcyIsInNvdXJjZXMiOlsibGl0LXRyYW5zZm9ybWVyL3NyYy9saXQtdHJhbnNmb3JtZXIuanMiLCJsaXQtdHJhbnNmb3JtZXIvc3JjL2hlbHBlci9kYXRhSGVscGVyLmpzIiwibGl0LXRyYW5zZm9ybWVyL3NyYy90cmFuc2Zvcm1lcnMvdmFyaWFibGVUcmFuc2Zvcm1lci5qcyIsImxpdC10cmFuc2Zvcm1lci9zcmMvdHJhbnNmb3JtZXJzL3Vuc2FmZVZhcmlhYmxlLmpzIiwibGl0LXRyYW5zZm9ybWVyL3NyYy9oZWxwZXIvaXNNdXN0YWNoZUZhbHN5LmpzIiwibGl0LXRyYW5zZm9ybWVyL3NyYy9oZWxwZXIvc2VjdGlvbkhlbHBlci5qcyIsImxpdC10cmFuc2Zvcm1lci9zcmMvdHJhbnNmb3JtZXJzL3NlY3Rpb24uanMiLCJsaXQtdHJhbnNmb3JtZXIvc3JjL3RyYW5zZm9ybWVycy9pbnZlcnRlZFNlY3Rpb24uanMiLCJsaXQtdHJhbnNmb3JtZXIvc3JjL3RyYW5zZm9ybWVycy9jb21tZW50LmpzIiwibGl0LXRyYW5zZm9ybWVyL3NyYy90cmFuc2Zvcm1lcnMvY3VzdG9tRGVsaW1pdGVyLmpzIiwibGl0LXRyYW5zZm9ybWVyL3NyYy9saXQtdHJhbnNmb3JtZXItY29uZmlndXJlZE91dE9mVGhlQm94LmpzIiwiYnJpZGdlLW11c3RhY2hlLnRzIiwiamV4cHIvc3JjL2xpYi9jb25zdGFudHMudHMiLCJqZXhwci9zcmMvbGliL3Rva2VuaXplci50cyIsImpleHByL3NyYy9saWIvcGFyc2VyLnRzIiwiamV4cHIvc3JjL2xpYi9ldmFsLnRzIiwic3RhbXBpbm8vc3JjL3N0YW1waW5vLnRzIiwiYnJpZGdlLXN0YW1waW5vLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qKiBcclxuICogQHBhcmFtIHtvYmplY3R9IGNvbmZpZyA9IHtcclxuICogIGh0bWw6IGxpdC1odG1sLmh0bWwsXHJcbiAqICBkZWxpbWl0ZXI6IHsgc3RhcnQ6ICd7eycsIGVuZDogJ319JyB9LFxyXG4gKiAgdHJhbnNmb3JtZXJzOiB7IC8vIG5vdGUgdGhhdCB0cmFuc2Zvcm1WYXJpYWJsZSBpcyBub3QgaGVyZS4gSXQgZ2V0cyBhcHBsaWVkIHdoZW4gbm8gdHJhbnNmb3JtZXIudGVzdCBoYXMgcGFzc2VkXHJcbiAqICAgIG5hbWU6IHtcclxuICogICAgICB0ZXN0OiAoc3RyLCBjb25maWcpID0+IGJvb2wsXHJcbiAqICAgICAgdHJhbnNmb3JtOiAoc3RyLCBjb25maWcpID0+ICh7XHJcbiAqICAgICAgICByZW1haW5pbmdUbXBsU3RyOiBzdHIsXHJcbiAqICAgICAgICBpbnNlcnRpb25Qb2ludDogY3R4ID0+IGxpdC1odG1sLlRlbXBsYXRlUmVzdWx0IHwgdW5kZWZpbmVkLCAvLyBpZiB1bmRlZmluZWQgcmVtYWluaW5nVG1wbFN0ciB3aWxsIGJlIG1lcmdlZCB3aXRoIGxhc3Qgc3RhdGljIHBhcnQgXHJcbiAqICAgICAgfSksXHJcbiAqICAgIH0sXHJcbiAqICB9LFxyXG4gKiAgdHJhbnNmb3JtVmFyaWFibGUsIFxyXG4gKiB9XHJcbiAqIEByZXR1cm5zIHtmdW5jdGlvbn0gc3RyVGVtcGxhdGUgPT4gY3R4ID0+IGxpdC1odG1sLlRlbXBsYXRlUmVzdWx0XHJcbiAqL1xyXG5leHBvcnQgZGVmYXVsdCBjb25maWcgPT4gc3RyVGVtcGxhdGUgPT4gdHJhbnNmb3JtKHN0clRlbXBsYXRlLCBjb25maWcpXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gdHJhbnNmb3JtKHRtcGwyUGFyc2UsIGNvbmZpZykge1xyXG4gIGNvbnN0IHN0YXRpY1BhcnRzID0gW11cclxuICBjb25zdCBpbnNlcnRpb25Qb2ludHMgPSBbXVxyXG5cclxuICBsZXQgcmVtYWluaW5nVG1wbFN0ciA9IHRtcGwyUGFyc2VcclxuICBsZXQgc3RhcnRJbmRleE9mSVAgPSByZW1haW5pbmdUbXBsU3RyLmluZGV4T2YoY29uZmlnLmRlbGltaXRlci5zdGFydClcclxuICB3aGlsZSAoc3RhcnRJbmRleE9mSVAgPj0gMCkge1xyXG4gICAgaWYgKHJlbWFpbmluZ1RtcGxTdHIuaW5kZXhPZihjb25maWcuZGVsaW1pdGVyLmVuZCwgc3RhcnRJbmRleE9mSVApIDwgMClcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBtaXNzaW5nIGVuZCBkZWxpbWl0ZXIgYXQ6ICcke3JlbWFpbmluZ1RtcGxTdHJ9J2ApXHJcblxyXG4gICAgc3RhdGljUGFydHMucHVzaChyZW1haW5pbmdUbXBsU3RyLnN1YnN0cmluZygwLCBzdGFydEluZGV4T2ZJUCkpXHJcblxyXG4gICAgY29uc3QgaVBUcmFuc2Zvcm1SZXN1bHQgPSB0cmFuc2Zvcm1JUChcclxuICAgICAgcmVtYWluaW5nVG1wbFN0ci5zdWJzdHJpbmcoc3RhcnRJbmRleE9mSVAgKyBjb25maWcuZGVsaW1pdGVyLnN0YXJ0Lmxlbmd0aCksXHJcbiAgICAgIGNvbmZpZ1xyXG4gICAgKVxyXG5cclxuICAgIGlmIChpUFRyYW5zZm9ybVJlc3VsdC5pbnNlcnRpb25Qb2ludCkge1xyXG4gICAgICByZW1haW5pbmdUbXBsU3RyID0gaVBUcmFuc2Zvcm1SZXN1bHQucmVtYWluaW5nVG1wbFN0clxyXG4gICAgICBpbnNlcnRpb25Qb2ludHMucHVzaChpUFRyYW5zZm9ybVJlc3VsdC5pbnNlcnRpb25Qb2ludClcclxuICAgICAgc3RhcnRJbmRleE9mSVAgPSByZW1haW5pbmdUbXBsU3RyLmluZGV4T2YoY29uZmlnLmRlbGltaXRlci5zdGFydClcclxuICAgIH0gZWxzZSB7IC8vIGUuZy4gY29tbWVudCBvciBjdXN0b21EZWxpbWV0ZXJcclxuICAgICAgY29uc3QgbGFzdFN0YXRpY1BhcnQgPSBzdGF0aWNQYXJ0cy5wb3AoKVxyXG4gICAgICByZW1haW5pbmdUbXBsU3RyID0gbGFzdFN0YXRpY1BhcnQgKyBpUFRyYW5zZm9ybVJlc3VsdC5yZW1haW5pbmdUbXBsU3RyXHJcbiAgICAgIHN0YXJ0SW5kZXhPZklQID0gcmVtYWluaW5nVG1wbFN0ci5pbmRleE9mKGNvbmZpZy5kZWxpbWl0ZXIuc3RhcnQsIGxhc3RTdGF0aWNQYXJ0Lmxlbmd0aClcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHN0YXRpY1BhcnRzLnB1c2gocmVtYWluaW5nVG1wbFN0cilcclxuXHJcbiAgcmV0dXJuIGN0eCA9PlxyXG4gICAgY29uZmlnLmh0bWwoc3RhdGljUGFydHMsIC4uLmluc2VydGlvblBvaW50cy5tYXAoaVAgPT4gaVAoY3R4KSkpXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHRyYW5zZm9ybUlQKHJlbWFpbmluZ1RtcGxTdHIsIGNvbmZpZykge1xyXG4gIGNvbnN0IHRyYW5zZm9ybWVyID0gT2JqZWN0LnZhbHVlcyhjb25maWcudHJhbnNmb3JtZXJzKS5maW5kKHQgPT4gdC50ZXN0KHJlbWFpbmluZ1RtcGxTdHIsIGNvbmZpZykpXHJcbiAgY29uc3QgdHJhbnNmb3JtRnVuY3Rpb24gPSB0cmFuc2Zvcm1lclxyXG4gICAgPyB0cmFuc2Zvcm1lci50cmFuc2Zvcm1cclxuICAgIDogY29uZmlnLnRyYW5zZm9ybVZhcmlhYmxlXHJcbiAgcmV0dXJuIHRyYW5zZm9ybUZ1bmN0aW9uKHJlbWFpbmluZ1RtcGxTdHIsIGNvbmZpZylcclxufSIsImV4cG9ydCBmdW5jdGlvbiBjdHgyVmFsdWUoY3R4LCBrZXkpIHtcclxuICBpZiAoa2V5ID09PSAnLicpXHJcbiAgICByZXR1cm4gY3R4XHJcblxyXG4gIGxldCByZXN1bHQgPSBjdHhcclxuICBmb3IgKGxldCBrIG9mIGtleS5zcGxpdCgnLicpKSB7XHJcbiAgICBpZiAoIXJlc3VsdC5oYXNPd25Qcm9wZXJ0eShrKSlcclxuICAgICAgcmV0dXJuICcnXHJcblxyXG4gICAgcmVzdWx0ID0gcmVzdWx0W2tdXHJcbiAgfVxyXG5cclxuICByZXR1cm4gcmVzdWx0XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBjdHgyTXVzdGFjaGVTdHJpbmcoY3R4LCBrZXkpIHtcclxuICByZXR1cm4gbXVzdGFjaGVTdHJpbmd5ZnkoY3R4MlZhbHVlKGN0eCwga2V5KSlcclxufVxyXG5cclxuZnVuY3Rpb24gbXVzdGFjaGVTdHJpbmd5ZnkodmFsdWUpIHtcclxuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gbnVsbClcclxuICAgIHJldHVybiAnJ1xyXG5cclxuICByZXR1cm4gJycgKyB2YWx1ZVxyXG59IiwiaW1wb3J0IHsgY3R4Mk11c3RhY2hlU3RyaW5nIH0gZnJvbSAnLi4vaGVscGVyL2RhdGFIZWxwZXIuanMnXHJcblxyXG5leHBvcnQgZGVmYXVsdCAocmVtYWluaW5nVG1wbFN0ciwgeyBkZWxpbWl0ZXIgfSkgPT4ge1xyXG4gIGNvbnN0IGluZGV4T2ZFbmREZWxpbWl0ZXIgPSByZW1haW5pbmdUbXBsU3RyLmluZGV4T2YoZGVsaW1pdGVyLmVuZClcclxuICBjb25zdCBkYXRhS2V5ID0gcmVtYWluaW5nVG1wbFN0ci5zdWJzdHJpbmcoMCwgaW5kZXhPZkVuZERlbGltaXRlcilcclxuICByZXR1cm4ge1xyXG4gICAgcmVtYWluaW5nVG1wbFN0cjogcmVtYWluaW5nVG1wbFN0ci5zdWJzdHJpbmcoaW5kZXhPZkVuZERlbGltaXRlciArIGRlbGltaXRlci5lbmQubGVuZ3RoKSxcclxuICAgIGluc2VydGlvblBvaW50OiBjdHggPT4gY3R4Mk11c3RhY2hlU3RyaW5nKGN0eCwgZGF0YUtleSlcclxuICB9XHJcbn0iLCJpbXBvcnQgeyBjdHgyTXVzdGFjaGVTdHJpbmcgfSBmcm9tICcuLi9oZWxwZXIvZGF0YUhlbHBlci5qcydcclxuXHJcbi8qKiBOb3RlLCB0aGlzIGlzIHVuc2FmZSB0byB1c2UsIGJlY2F1c2UgdGhlIHJlbmRlcmVkIG91dHB1dCBjb3VsZCBiZSBhbnkgSmF2YVNjcmlwdCEgKi9cclxuZXhwb3J0IGRlZmF1bHQgdW5zYWZlSFRNTCA9PiAoe1xyXG4gIHRlc3Q6IHJlbWFpbmluZ1RtcGxTdHIgPT4gcmVtYWluaW5nVG1wbFN0clswXSA9PT0gJ3snLFxyXG4gIHRyYW5zZm9ybTogKHJlbWFpbmluZ1RtcGxTdHIsIHsgZGVsaW1pdGVyIH0pID0+IHtcclxuICAgIGNvbnN0IGluZGV4T2ZFbmREZWxpbWl0ZXIgPSByZW1haW5pbmdUbXBsU3RyLmluZGV4T2YoJ30nICsgZGVsaW1pdGVyLmVuZClcclxuICAgIGlmIChpbmRleE9mRW5kRGVsaW1pdGVyIDwgMClcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBtaXNzaW5nIGVuZCBkZWxpbWl0ZXIgYXQ6ICcke2RlbGltaXRlci5zdGFydH0ke3JlbWFpbmluZ1RtcGxTdHJ9J2ApXHJcbiAgXHJcbiAgICBjb25zdCBkYXRhS2V5ID0gcmVtYWluaW5nVG1wbFN0ci5zdWJzdHJpbmcoMSwgaW5kZXhPZkVuZERlbGltaXRlcilcclxuICAgIHJldHVybiB7XHJcbiAgICAgIHJlbWFpbmluZ1RtcGxTdHI6IHJlbWFpbmluZ1RtcGxTdHIuc3Vic3RyaW5nKGluZGV4T2ZFbmREZWxpbWl0ZXIgKyAxICsgZGVsaW1pdGVyLmVuZC5sZW5ndGgpLFxyXG4gICAgICBpbnNlcnRpb25Qb2ludDogY3R4ID0+IHVuc2FmZUhUTUwoY3R4Mk11c3RhY2hlU3RyaW5nKGN0eCwgZGF0YUtleSkpLFxyXG4gICAgfVxyXG4gIH1cclxufSkiLCJleHBvcnQgZnVuY3Rpb24gaXNNdXN0YWNoZUZhbHN5KHZhbHVlKSB7XHJcbiAgcmV0dXJuIFtudWxsLCB1bmRlZmluZWQsIGZhbHNlLCAwLCBOYU4sICcnXVxyXG4gICAgLnNvbWUoZmFsc3kgPT4gZmFsc3kgPT09IHZhbHVlKVxyXG4gICAgfHwgKHZhbHVlLmxlbmd0aCAmJiB2YWx1ZS5sZW5ndGggPT09IDApXHJcbn0iLCJleHBvcnQgZnVuY3Rpb24gcGFyc2VTZWN0aW9uKHRtcGxTdHIsIGRlbGltaXRlcikge1xyXG4gIGNvbnN0IGluZGV4T2ZTdGFydFRhZ0VuZCA9IHRtcGxTdHIuaW5kZXhPZihkZWxpbWl0ZXIuZW5kKVxyXG4gIGNvbnN0IGRhdGFLZXkgPSB0bXBsU3RyLnN1YnN0cmluZygxLCBpbmRleE9mU3RhcnRUYWdFbmQpXHJcbiAgY29uc3QgZW5kVGFnID0gYCR7ZGVsaW1pdGVyLnN0YXJ0fS8ke2RhdGFLZXl9JHtkZWxpbWl0ZXIuZW5kfWBcclxuICBjb25zdCBpbmRleE9mRW5kVGFnU3RhcnQgPSB0bXBsU3RyLmluZGV4T2YoZW5kVGFnKVxyXG4gIGlmIChpbmRleE9mRW5kVGFnU3RhcnQgPCAwKVxyXG4gICAgdGhyb3cgbmV3IEVycm9yKGBtaXNzaW5nIGVuZCBkZWxpbWl0ZXIgYXQ6ICcke2RlbGltaXRlci5zdGFydH0ke3RtcGxTdHJ9J2ApXHJcbiAgXHJcbiAgcmV0dXJuIHtcclxuICAgIGRhdGFLZXksXHJcbiAgICBpbm5lclRtcGw6IHRtcGxTdHIuc3Vic3RyaW5nKGluZGV4T2ZTdGFydFRhZ0VuZCArIGRlbGltaXRlci5zdGFydC5sZW5ndGgsIGluZGV4T2ZFbmRUYWdTdGFydCksXHJcbiAgICByZW1haW5pbmdUbXBsU3RyOiB0bXBsU3RyLnN1YnN0cmluZyhpbmRleE9mRW5kVGFnU3RhcnQgKyBlbmRUYWcubGVuZ3RoKSxcclxuICB9XHJcbn0iLCJpbXBvcnQgeyB0cmFuc2Zvcm0gfSBmcm9tICcuLi9saXQtdHJhbnNmb3JtZXIuanMnXHJcbmltcG9ydCB7IGN0eDJWYWx1ZSB9IGZyb20gJy4uL2hlbHBlci9kYXRhSGVscGVyLmpzJ1xyXG5pbXBvcnQgeyBpc011c3RhY2hlRmFsc3kgfSBmcm9tICcuLi9oZWxwZXIvaXNNdXN0YWNoZUZhbHN5LmpzJ1xyXG5pbXBvcnQgeyBwYXJzZVNlY3Rpb24gfSBmcm9tICcuLi9oZWxwZXIvc2VjdGlvbkhlbHBlci5qcydcclxuXHJcbi8qKiBOb3RlLCB1bmxpa2Ugd2l0aGluIG11c3RhY2hlIGZ1bmN0aW9ucyBhcyBkYXRhIHZhbHVlcyBhcmUgbm90IHN1cHBvcnRlZCBvdXQgb2YgdGhlIGJveCAqL1xyXG5leHBvcnQgZGVmYXVsdCAoKSA9PiAoe1xyXG4gIHRlc3Q6IHJlbWFpbmluZ1RtcGxTdHIgPT4gcmVtYWluaW5nVG1wbFN0clswXSA9PT0gJyMnLFxyXG4gIHRyYW5zZm9ybTogKHJlbWFpbmluZ1RtcGxTdHIsIGNvbmZpZykgPT4ge1xyXG4gICAgY29uc3QgcGFyc2VkU2VjdGlvbiA9IHBhcnNlU2VjdGlvbihyZW1haW5pbmdUbXBsU3RyLCBjb25maWcuZGVsaW1pdGVyKVxyXG4gICAgY29uc3QgdHJhbnNmb3JtZWRJbm5lclRtcGwgPSB0cmFuc2Zvcm0ocGFyc2VkU2VjdGlvbi5pbm5lclRtcGwsIGNvbmZpZylcclxuICAgIFxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgcmVtYWluaW5nVG1wbFN0cjogcGFyc2VkU2VjdGlvbi5yZW1haW5pbmdUbXBsU3RyLFxyXG4gICAgICBpbnNlcnRpb25Qb2ludDogY3R4ID0+IHtcclxuICAgICAgICBjb25zdCBzZWN0aW9uRGF0YSA9IGN0eDJWYWx1ZShjdHgsIHBhcnNlZFNlY3Rpb24uZGF0YUtleSlcclxuICAgICAgICBcclxuICAgICAgICBpZiAoaXNNdXN0YWNoZUZhbHN5KHNlY3Rpb25EYXRhKSlcclxuICAgICAgICAgIHJldHVybiAnJztcclxuXHJcbiAgICAgICAgcmV0dXJuIHNlY3Rpb25EYXRhLm1hcFxyXG4gICAgICAgICAgPyBzZWN0aW9uRGF0YS5tYXAoaW5uZXJDdHggPT4gdHJhbnNmb3JtZWRJbm5lclRtcGwoaW5uZXJDdHgpKVxyXG4gICAgICAgICAgOiB0cmFuc2Zvcm1lZElubmVyVG1wbChjdHgpXHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcbn0pIiwiaW1wb3J0IHsgdHJhbnNmb3JtIH0gZnJvbSAnLi4vbGl0LXRyYW5zZm9ybWVyLmpzJ1xuaW1wb3J0IHsgY3R4MlZhbHVlIH0gZnJvbSAnLi4vaGVscGVyL2RhdGFIZWxwZXIuanMnXG5pbXBvcnQgeyBpc011c3RhY2hlRmFsc3kgfSBmcm9tICcuLi9oZWxwZXIvaXNNdXN0YWNoZUZhbHN5LmpzJ1xuaW1wb3J0IHsgcGFyc2VTZWN0aW9uIH0gZnJvbSAnLi4vaGVscGVyL3NlY3Rpb25IZWxwZXIuanMnXG5cbmV4cG9ydCBkZWZhdWx0ICgpID0+ICh7XG4gIHRlc3Q6IHJlbWFpbmluZ1RtcGxTdHIgPT4gcmVtYWluaW5nVG1wbFN0clswXSA9PT0gJ14nLFxuICAvKlxuICAgKiBwYXRjaCBmb3Igdi4xLjAuMlxuICAgKiBhcHBseSB0cmFuc2Zvcm1lZElubmVyVG1wbCgpXG4gICAqL1xuICB0cmFuc2Zvcm06IChyZW1haW5pbmdUbXBsU3RyLCBjb25maWcpID0+IHtcbiAgICBjb25zdCBwYXJzZWRTZWN0aW9uID0gcGFyc2VTZWN0aW9uKHJlbWFpbmluZ1RtcGxTdHIsIGNvbmZpZy5kZWxpbWl0ZXIpXG4gICAgY29uc3QgdHJhbnNmb3JtZWRJbm5lclRtcGwgPSB0cmFuc2Zvcm0ocGFyc2VkU2VjdGlvbi5pbm5lclRtcGwsIGNvbmZpZylcbiAgICBcbiAgICByZXR1cm4ge1xuICAgICAgcmVtYWluaW5nVG1wbFN0cjogcGFyc2VkU2VjdGlvbi5yZW1haW5pbmdUbXBsU3RyLFxuICAgICAgaW5zZXJ0aW9uUG9pbnQ6IGN0eCA9PiB7XG4gICAgICAgIGNvbnN0IHNlY3Rpb25EYXRhID0gY3R4MlZhbHVlKGN0eCwgcGFyc2VkU2VjdGlvbi5kYXRhS2V5KVxuICAgICAgICBcbiAgICAgICAgaWYgKGlzTXVzdGFjaGVGYWxzeShzZWN0aW9uRGF0YSkpXG4gICAgICAgICAgcmV0dXJuIHNlY3Rpb25EYXRhLm1hcFxuICAgICAgICAgICAgPyBzZWN0aW9uRGF0YS5tYXAoaW5uZXJDdHggPT4gdHJhbnNmb3JtZWRJbm5lclRtcGwoaW5uZXJDdHgpKVxuICAgICAgICAgICAgOiB0cmFuc2Zvcm1lZElubmVyVG1wbChjdHgpXG4gICAgICAgIHJldHVybiAnJztcbiAgICAgIH1cbiAgICB9XG4gIH1cbn0pXG4iLCJleHBvcnQgZGVmYXVsdCAoKSA9PiAoe1xyXG4gIHRlc3Q6IHJlbWFpbmluZ1RtcGxTdHIgPT4gcmVtYWluaW5nVG1wbFN0clswXSA9PT0gJyEnLFxyXG4gIHRyYW5zZm9ybTogKHJlbWFpbmluZ1RtcGxTdHIsIHsgZGVsaW1pdGVyIH0pID0+ICh7XHJcbiAgICByZW1haW5pbmdUbXBsU3RyOiByZW1haW5pbmdUbXBsU3RyLnN1YnN0cmluZyhyZW1haW5pbmdUbXBsU3RyLmluZGV4T2YoZGVsaW1pdGVyLmVuZCkgKyBkZWxpbWl0ZXIuZW5kLmxlbmd0aCksXHJcbiAgICBpbnNlcnRpb25Qb2ludDogdW5kZWZpbmVkLFxyXG4gIH0pXHJcbn0pIiwiZXhwb3J0IGRlZmF1bHQgKCkgPT4gKHtcclxuICB0ZXN0OiByZW1haW5pbmdUbXBsU3RyID0+IHJlbWFpbmluZ1RtcGxTdHJbMF0gPT09ICc9JyxcclxuICB0cmFuc2Zvcm06IChyZW1haW5pbmdUbXBsU3RyLCBjb25maWcpID0+IHtcclxuICAgIGNvbnN0IG9yaWdpbmFsRW5kRGVsaUxlbmd0aCA9IGNvbmZpZy5kZWxpbWl0ZXIuZW5kLmxlbmd0aFxyXG4gICAgY29uc3QgaW5kZXhPZkVuZFRhZyA9IHJlbWFpbmluZ1RtcGxTdHIuaW5kZXhPZignPScgKyBjb25maWcuZGVsaW1pdGVyLmVuZClcclxuICAgIGlmIChpbmRleE9mRW5kVGFnIDwgMCApXHJcbiAgICAgIHRocm93IG5ldyBFcnJvcihgbWlzc2luZyBlbmQgZGVsaW1pdGVyIGF0OiAnJHtyZW1haW5pbmdUbXBsU3RyfSdgKVxyXG5cclxuICAgIGNvbnN0IFsgbmV3U3RhcnREZWxpLCBuZXdFbmREZWxpIF0gPSByZW1haW5pbmdUbXBsU3RyLnN1YnN0cmluZygxLCBpbmRleE9mRW5kVGFnKS5zcGxpdCgnICcpXHJcblxyXG4gICAgY29uZmlnLmRlbGltaXRlci5zdGFydCA9IG5ld1N0YXJ0RGVsaVxyXG4gICAgY29uZmlnLmRlbGltaXRlci5lbmQgPSBuZXdFbmREZWxpXHJcbiAgICBcclxuICAgIHJldHVybiB7XHJcbiAgICAgIHJlbWFpbmluZ1RtcGxTdHI6IHJlbWFpbmluZ1RtcGxTdHIuc3Vic3RyaW5nKGluZGV4T2ZFbmRUYWcgKyAxICsgb3JpZ2luYWxFbmREZWxpTGVuZ3RoKSxcclxuICAgICAgaW5zZXJ0aW9uUG9pbnQ6IHVuZGVmaW5lZCwgIFxyXG4gICAgfVxyXG4gIH1cclxufSkiLCJpbXBvcnQgY3JlYXRlVHJhbnNmb3JtIGZyb20gJy4vbGl0LXRyYW5zZm9ybWVyLmpzJ1xyXG5pbXBvcnQgdHJhbnNmb3JtVmFyaWFibGUgZnJvbSAnLi90cmFuc2Zvcm1lcnMvdmFyaWFibGVUcmFuc2Zvcm1lci5qcydcclxuaW1wb3J0IHVuc2FmZVZhcmlhYmxlVHJhbnNmb3JtZXIgZnJvbSAnLi90cmFuc2Zvcm1lcnMvdW5zYWZlVmFyaWFibGUuanMnXHJcbmltcG9ydCBzZWN0aW9uVHJhbnNmb3JtZXIgZnJvbSAnLi90cmFuc2Zvcm1lcnMvc2VjdGlvbi5qcydcclxuaW1wb3J0IGludmVydGVkU2VjdGlvblRyYW5zZm9ybWVyIGZyb20gJy4vdHJhbnNmb3JtZXJzL2ludmVydGVkU2VjdGlvbi5qcydcclxuaW1wb3J0IGNvbW1lbnRUcmFuc2Zvcm1lciBmcm9tICcuL3RyYW5zZm9ybWVycy9jb21tZW50LmpzJ1xyXG5pbXBvcnQgY3VzdG9tRGVsaW1pdGVyVHJhbnNmb3JtZXIgZnJvbSAnLi90cmFuc2Zvcm1lcnMvY3VzdG9tRGVsaW1pdGVyLmpzJ1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgKGh0bWwsIHVuc2FmZUhUTUwpID0+XHJcbiAgY3JlYXRlVHJhbnNmb3JtKHtcclxuICAgIGh0bWwsXHJcbiAgICBkZWxpbWl0ZXI6IHsgc3RhcnQ6ICd7eycsIGVuZDogJ319JyB9LFxyXG4gICAgdHJhbnNmb3JtVmFyaWFibGUsXHJcbiAgICB0cmFuc2Zvcm1lcnM6IHtcclxuICAgICAgdW5zYWZlVmFyaWFibGU6IHVuc2FmZVZhcmlhYmxlVHJhbnNmb3JtZXIodW5zYWZlSFRNTCksXHJcbiAgICAgIHNlY3Rpb246IHNlY3Rpb25UcmFuc2Zvcm1lcigpLFxyXG4gICAgICBpbnZlcnRlZFNlY3Rpb246IGludmVydGVkU2VjdGlvblRyYW5zZm9ybWVyKCksXHJcbiAgICAgIGNvbW1lbnQ6IGNvbW1lbnRUcmFuc2Zvcm1lcigpLFxyXG4gICAgICBjdXN0b21EZWxpbWl0ZXJUcmFuc2Zvcm1lcjogY3VzdG9tRGVsaW1pdGVyVHJhbnNmb3JtZXIoKSxcclxuICAgIH0sXHJcbiAgfSkiLCJpbXBvcnQgeyB0b1RlbXBsYXRlU3RyaW5nc0FycmF5IH0gZnJvbSAnQGNkcC9leHRlbnNpb24tdGVtcGxhdGUnO1xuaW1wb3J0IHR5cGUgeyBUZW1wbGF0ZUJyaWRnZUVuZGluZSwgVGVtcGxhdGVUcmFuc2Zvcm1lciB9IGZyb20gJ0BicmlkZ2UvaW50ZXJmYWNlcyc7XG5pbXBvcnQgdHlwZSB7XG4gICAgTXVzdGFjaGVUcmFuc2Zvcm1lcixcbiAgICBUZW1wbGF0ZVRhZyxcbiAgICBUcmFuc2Zvcm1EaXJlY3RpdmUsXG4gICAgVHJhbnNmb3JtVGVzdGVyLFxuICAgIFRyYW5zZm9ybUV4ZWN1dG9yLFxuICAgIFRyYW5zZm9ybWVDb250ZXh0LFxuICAgIFRyYW5zZm9ybUNvbmZpZyxcbn0gZnJvbSAnbGl0LXRyYW5zZm9ybWVyL3NyYy9pbnRlcmZhY2VzJztcblxuaW1wb3J0IGNyZWF0ZURlZmF1bHQgZnJvbSAnbGl0LXRyYW5zZm9ybWVyJztcbmltcG9ydCBjcmVhdGVDdXN0b20gZnJvbSAnbGl0LXRyYW5zZm9ybWVyL3NyYy9saXQtdHJhbnNmb3JtZXInO1xuXG5pbXBvcnQgdmFyaWFibGUgZnJvbSAnbGl0LXRyYW5zZm9ybWVyL3NyYy90cmFuc2Zvcm1lcnMvdmFyaWFibGVUcmFuc2Zvcm1lcic7XG5pbXBvcnQgdW5zYWZlVmFyaWFibGUgZnJvbSAnbGl0LXRyYW5zZm9ybWVyL3NyYy90cmFuc2Zvcm1lcnMvdW5zYWZlVmFyaWFibGUnO1xuaW1wb3J0IHNlY3Rpb24gZnJvbSAnbGl0LXRyYW5zZm9ybWVyL3NyYy90cmFuc2Zvcm1lcnMvc2VjdGlvbic7XG5pbXBvcnQgaW52ZXJ0ZWRTZWN0aW9uIGZyb20gJ2xpdC10cmFuc2Zvcm1lci9zcmMvdHJhbnNmb3JtZXJzL2ludmVydGVkU2VjdGlvbic7XG5pbXBvcnQgY29tbWVudCBmcm9tICdsaXQtdHJhbnNmb3JtZXIvc3JjL3RyYW5zZm9ybWVycy9jb21tZW50JztcbmltcG9ydCBjdXN0b21EZWxpbWl0ZXIgZnJvbSAnbGl0LXRyYW5zZm9ybWVyL3NyYy90cmFuc2Zvcm1lcnMvY3VzdG9tRGVsaW1pdGVyJztcblxuLyoqIEBpbnRlcm5hbCAqL1xudHlwZSBNdXN0YWNoZVRyYW5zZm9ybWVyQ29udGV4dCA9IE11c3RhY2hlVHJhbnNmb3JtZXIgJiB7IGRlbGltaXRlcjogeyBzdGFydDogc3RyaW5nOyBlbmQ6IHN0cmluZzsgfTsgfTtcblxuY29uc3QgeGZvcm0gPSAobXVzdGFjaGU6IE11c3RhY2hlVHJhbnNmb3JtZXJDb250ZXh0KTogVGVtcGxhdGVUcmFuc2Zvcm1lciA9PiB7XG4gICAgcmV0dXJuICh0ZW1wbGF0ZTogSFRNTFRlbXBsYXRlRWxlbWVudCB8IHN0cmluZyk6IFRlbXBsYXRlQnJpZGdlRW5kaW5lID0+IHtcbiAgICAgICAgY29uc3QgeyBzdGFydCwgZW5kIH0gPSBtdXN0YWNoZS5kZWxpbWl0ZXI7XG5cbiAgICAgICAgLy8g44Kz44Oh44Oz44OI44OW44Ot44OD44Kv5YaF44GuIGRlbGltaXRlciDmir3lh7pcbiAgICAgICAgY29uc3QgcmVnQ29tbWVudFJlbW92ZVN0YXJ0ID0gbmV3IFJlZ0V4cChgPCEtLVxcXFxzKiR7c3RhcnR9YCwgJ2cnKTtcbiAgICAgICAgY29uc3QgcmVnQ29tbWVudFJlbW92ZUVuZCAgID0gbmV3IFJlZ0V4cChgJHtlbmR9XFxcXHMqLS0+YCwgJ2cnKTtcbiAgICAgICAgLy8gZGVsaW1pdGVyIOWJjeW+jOOBriB0cmltIOeUqOato+imj+ihqOePvlxuICAgICAgICBjb25zdCByZWdUcmltID0gbmV3IFJlZ0V4cChgKCR7c3RhcnR9WyNeL10/KVxcXFxzKihbXFxcXHdcXFxcLl0rKVxcXFxzKigke2VuZH0pYCwgJ2cnKTtcblxuICAgICAgICBjb25zdCBib2R5ID0gKHRlbXBsYXRlIGluc3RhbmNlb2YgSFRNTFRlbXBsYXRlRWxlbWVudCA/IHRlbXBsYXRlLmlubmVySFRNTCA6IHRlbXBsYXRlKVxuICAgICAgICAgICAgLnJlcGxhY2UocmVnQ29tbWVudFJlbW92ZVN0YXJ0LCBzdGFydClcbiAgICAgICAgICAgIC5yZXBsYWNlKHJlZ0NvbW1lbnRSZW1vdmVFbmQsIGVuZClcbiAgICAgICAgICAgIC5yZXBsYWNlKHJlZ1RyaW0sICckMSQyJDMnKVxuICAgICAgICA7XG5cbiAgICAgICAgcmV0dXJuIG11c3RhY2hlKGJvZHkpO1xuICAgIH07XG59O1xuXG4vKlxuICogbGl0LWh0bWwgdjIuMS4wK1xuICogVGVtcGxhdGVTdHJpbmdzQXJyYXkg44KS5Y6z5a+G44Gr44OB44Kn44OD44Kv44GZ44KL44KI44GG44Gr44Gq44Gj44Gf44Gf44KBIHBhdGNoIOOCkuOBguOBpuOCi1xuICogaHR0cHM6Ly9naXRodWIuY29tL2xpdC9saXQvcHVsbC8yMzA3XG4gKlxuICog5bCG5p2lIGBBcnJheS5pc1RlbXBsYXRlT2JqZWN0KClgIOOCkuS9v+eUqOOBleOCjOOCi+WgtOWQiCwg5pys5a++5b+c44KC6KaL55u044GZ5b+F6KaB44GC44KKXG4gKiBodHRwczovL3RjMzkuZXMvcHJvcG9zYWwtYXJyYXktaXMtdGVtcGxhdGUtb2JqZWN0L1xuICovXG5jb25zdCBwYXRjaCA9IChodG1sOiBUZW1wbGF0ZVRhZyk6IFRlbXBsYXRlVGFnID0+IHtcbiAgICByZXR1cm4gKHRlbXBsYXRlOiBUZW1wbGF0ZVN0cmluZ3NBcnJheSwgLi4udmFsdWVzOiB1bmtub3duW10pID0+IHtcbiAgICAgICAgcmV0dXJuIGh0bWwodG9UZW1wbGF0ZVN0cmluZ3NBcnJheSh0ZW1wbGF0ZSksIC4uLnZhbHVlcyk7XG4gICAgfTtcbn07XG5cbmZ1bmN0aW9uIGNyZWF0ZU11c3RhY2hlVHJhbnNmb3JtZXIoaHRtbDogVGVtcGxhdGVUYWcsIHVuc2FmZUhUTUw6IFRyYW5zZm9ybURpcmVjdGl2ZSk6IFRlbXBsYXRlVHJhbnNmb3JtZXI7XG5mdW5jdGlvbiBjcmVhdGVNdXN0YWNoZVRyYW5zZm9ybWVyKGNvbmZpZzogVHJhbnNmb3JtQ29uZmlnKTogVGVtcGxhdGVUcmFuc2Zvcm1lcjtcbmZ1bmN0aW9uIGNyZWF0ZU11c3RhY2hlVHJhbnNmb3JtZXIoYXJnMTogdW5rbm93biwgYXJnMj86IHVua25vd24pOiBUZW1wbGF0ZVRyYW5zZm9ybWVyIHtcbiAgICBjb25zdCBkZWxpbWl0ZXIgPSB7IHN0YXJ0OiAne3snLCBlbmQ6ICd9fScgfTtcbiAgICBsZXQgdHJhbnNmb3JtZXI6IE11c3RhY2hlVHJhbnNmb3JtZXJDb250ZXh0O1xuICAgIGlmICgnZnVuY3Rpb24nID09PSB0eXBlb2YgYXJnMSkge1xuICAgICAgICB0cmFuc2Zvcm1lciA9IGNyZWF0ZURlZmF1bHQocGF0Y2goYXJnMSBhcyBUZW1wbGF0ZVRhZyksIGFyZzIgYXMgVHJhbnNmb3JtRGlyZWN0aXZlKSBhcyBNdXN0YWNoZVRyYW5zZm9ybWVyQ29udGV4dDtcbiAgICAgICAgdHJhbnNmb3JtZXIuZGVsaW1pdGVyID0gZGVsaW1pdGVyO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IHsgaHRtbCB9ID0gYXJnMSBhcyB7IGh0bWw6IFRlbXBsYXRlVGFnOyB9O1xuICAgICAgICBjb25zdCBjb25maWcgPSBPYmplY3QuYXNzaWduKHtcbiAgICAgICAgICAgIGRlbGltaXRlcixcbiAgICAgICAgICAgIHRyYW5zZm9ybWVyczoge30sXG4gICAgICAgIH0sIGFyZzEsIHsgaHRtbDogcGF0Y2goaHRtbCkgfSkgYXMgVHJhbnNmb3JtQ29uZmlnO1xuICAgICAgICB0cmFuc2Zvcm1lciA9IGNyZWF0ZUN1c3RvbShjb25maWcpIGFzIE11c3RhY2hlVHJhbnNmb3JtZXJDb250ZXh0O1xuICAgICAgICB0cmFuc2Zvcm1lci5kZWxpbWl0ZXIgPSBjb25maWcuZGVsaW1pdGVyITsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbm9uLW51bGwtYXNzZXJ0aW9uXG4gICAgfVxuICAgIHJldHVybiB4Zm9ybSh0cmFuc2Zvcm1lcik7XG59XG5cbmNvbnN0IHRyYW5zZm9ybWVyOiB7XG4gICAgdmFyaWFibGU6IFRyYW5zZm9ybUV4ZWN1dG9yO1xuICAgIHVuc2FmZVZhcmlhYmxlOiAodW5zYWZlSFRNTDogVHJhbnNmb3JtRGlyZWN0aXZlKSA9PiBUcmFuc2Zvcm1lQ29udGV4dDtcbiAgICBzZWN0aW9uOiAoKSA9PiBUcmFuc2Zvcm1lQ29udGV4dDtcbiAgICBpbnZlcnRlZFNlY3Rpb246ICgpID0+IFRyYW5zZm9ybWVDb250ZXh0O1xuICAgIGNvbW1lbnQ6ICgpID0+IFRyYW5zZm9ybWVDb250ZXh0O1xuICAgIGN1c3RvbURlbGltaXRlcjogKCkgPT4gVHJhbnNmb3JtZUNvbnRleHQ7XG59ID0ge1xuICAgIHZhcmlhYmxlLFxuICAgIHVuc2FmZVZhcmlhYmxlLFxuICAgIHNlY3Rpb24sXG4gICAgaW52ZXJ0ZWRTZWN0aW9uLFxuICAgIGNvbW1lbnQsXG4gICAgY3VzdG9tRGVsaW1pdGVyLFxufTtcblxuZXhwb3J0IHtcbiAgICBUZW1wbGF0ZVRhZyxcbiAgICBUcmFuc2Zvcm1EaXJlY3RpdmUsXG4gICAgVGVtcGxhdGVUcmFuc2Zvcm1lcixcbiAgICBUcmFuc2Zvcm1UZXN0ZXIsXG4gICAgVHJhbnNmb3JtRXhlY3V0b3IsXG4gICAgVHJhbnNmb3JtZUNvbnRleHQsXG4gICAgVHJhbnNmb3JtQ29uZmlnLFxuICAgIGNyZWF0ZU11c3RhY2hlVHJhbnNmb3JtZXIsXG4gICAgdHJhbnNmb3JtZXIsXG59O1xuIixudWxsLG51bGwsbnVsbCxudWxsLG51bGwsImltcG9ydCB0eXBlIHtcbiAgICBUZW1wbGF0ZUJyaWRnZUFyZyxcbiAgICBUZW1wbGF0ZVRyYW5zZm9ybWVyLFxufSBmcm9tICdAYnJpZGdlL2ludGVyZmFjZXMnO1xuaW1wb3J0IHtcbiAgICBUZW1wbGF0ZUhhbmRsZXIsXG4gICAgVGVtcGxhdGVIYW5kbGVycyxcbiAgICBUZW1wbGF0ZVJlbmRlcmVycyxcbiAgICBFdmFsdWF0ZVRlbXBsYXRlUmVzdWx0LFxuICAgIHByZXBhcmVUZW1wbGF0ZSxcbiAgICBldmFsdWF0ZVRlbXBsYXRlLFxufSBmcm9tICdzdGFtcGlubyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ3JlYXRlU3RhbXBpbm9UZW1wbGF0ZU9wdGlvbnMge1xuICAgIGhhbmRsZXJzPzogVGVtcGxhdGVIYW5kbGVycztcbiAgICByZW5kZXJlcnM/OiBUZW1wbGF0ZVJlbmRlcmVycztcbiAgICBzdXBlclRlbXBsYXRlPzogSFRNTFRlbXBsYXRlRWxlbWVudCB8IHVuZGVmaW5lZDtcbn1cblxuZnVuY3Rpb24gZW5zdXJlKHRlbXBsYXRlOiBIVE1MVGVtcGxhdGVFbGVtZW50IHwgc3RyaW5nKTogSFRNTFRlbXBsYXRlRWxlbWVudCB7XG4gICAgaWYgKHRlbXBsYXRlIGluc3RhbmNlb2YgSFRNTFRlbXBsYXRlRWxlbWVudCkge1xuICAgICAgICByZXR1cm4gdGVtcGxhdGU7XG4gICAgfSBlbHNlIGlmICgnc3RyaW5nJyA9PT0gdHlwZW9mIHRlbXBsYXRlKSB7XG4gICAgICAgIGNvbnN0IGVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0ZW1wbGF0ZScpO1xuICAgICAgICBlbGVtZW50LmlubmVySFRNTCA9IHRlbXBsYXRlO1xuICAgICAgICByZXR1cm4gZWxlbWVudDtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBUeXBlIG9mIHRlbXBsYXRlIGlzIG5vdCBhIHZhbGlkLiBbdHlwZW9mOiAke3R5cGVvZiB0ZW1wbGF0ZX1dYCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBjcmVhdGVTdGFtcGlub1RyYW5zZm9ybWVyKG9wdGlvbnM/OiBDcmVhdGVTdGFtcGlub1RlbXBsYXRlT3B0aW9ucyk6IFRlbXBsYXRlVHJhbnNmb3JtZXIge1xuICAgIGNvbnN0IHsgaGFuZGxlcnMsIHJlbmRlcmVycywgc3VwZXJUZW1wbGF0ZSB9ID0gb3B0aW9ucyB8fCB7fTtcbiAgICByZXR1cm4gKHRlbXBsYXRlOiBIVE1MVGVtcGxhdGVFbGVtZW50IHwgc3RyaW5nKSA9PiB7XG4gICAgICAgIHJldHVybiBwcmVwYXJlVGVtcGxhdGUoZW5zdXJlKHRlbXBsYXRlKSwgaGFuZGxlcnMsIHJlbmRlcmVycywgc3VwZXJUZW1wbGF0ZSk7XG4gICAgfTtcbn1cblxuZXhwb3J0IHtcbiAgICBUZW1wbGF0ZUJyaWRnZUFyZyxcbiAgICBUZW1wbGF0ZUhhbmRsZXIsXG4gICAgVGVtcGxhdGVIYW5kbGVycyxcbiAgICBUZW1wbGF0ZVJlbmRlcmVycyxcbiAgICBFdmFsdWF0ZVRlbXBsYXRlUmVzdWx0LFxuICAgIGNyZWF0ZVN0YW1waW5vVHJhbnNmb3JtZXIsXG4gICAgcHJlcGFyZVRlbXBsYXRlLFxuICAgIGV2YWx1YXRlVGVtcGxhdGUsXG59O1xuIl0sIm5hbWVzIjpbImNyZWF0ZVRyYW5zZm9ybSIsInRyYW5zZm9ybVZhcmlhYmxlIiwidW5zYWZlVmFyaWFibGVUcmFuc2Zvcm1lciIsInNlY3Rpb25UcmFuc2Zvcm1lciIsImludmVydGVkU2VjdGlvblRyYW5zZm9ybWVyIiwiY29tbWVudFRyYW5zZm9ybWVyIiwiY3VzdG9tRGVsaW1pdGVyVHJhbnNmb3JtZXIiLCJ0b1RlbXBsYXRlU3RyaW5nc0FycmF5IiwiX86jIiwibm90aGluZyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7RUFBQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0FBQ0EsdUJBQWUsTUFBTSxJQUFJLFdBQVcsSUFBSSxTQUFTLENBQUMsV0FBVyxFQUFFLE1BQU0sRUFBQztBQUN0RTtFQUNPLFNBQVMsU0FBUyxDQUFDLFVBQVUsRUFBRSxNQUFNLEVBQUU7RUFDOUMsRUFBRSxNQUFNLFdBQVcsR0FBRyxHQUFFO0VBQ3hCLEVBQUUsTUFBTSxlQUFlLEdBQUcsR0FBRTtBQUM1QjtFQUNBLEVBQUUsSUFBSSxnQkFBZ0IsR0FBRyxXQUFVO0VBQ25DLEVBQUUsSUFBSSxjQUFjLEdBQUcsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsS0FBSyxF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LElBQUEsSUFBSSxFQUFFLENBQUM7RUFDUCxJQUFBLElBQUksRUFBRSxDQUFDO0VBQ1AsSUFBQSxJQUFJLEVBQUUsQ0FBQztFQUNQLElBQUEsR0FBRyxFQUFFLENBQUM7RUFDTixJQUFBLEdBQUcsRUFBRSxDQUFDO0VBQ04sSUFBQSxHQUFHLEVBQUUsQ0FBQzs7RUFHTixJQUFBLElBQUksRUFBRSxDQUFDO0VBQ1AsSUFBQSxJQUFJLEVBQUUsQ0FBQztFQUNQLElBQUEsS0FBSyxFQUFFLENBQUM7RUFDUixJQUFBLEtBQUssRUFBRSxDQUFDOztFQUdSLElBQUEsSUFBSSxFQUFFLEVBQUU7RUFDUixJQUFBLEdBQUcsRUFBRSxFQUFFO0VBQ1AsSUFBQSxJQUFJLEVBQUUsRUFBRTtFQUNSLElBQUEsR0FBRyxFQUFFLEVBQUU7O0VBR1AsSUFBQSxHQUFHLEVBQUUsRUFBRTtFQUNQLElBQUEsR0FBRyxFQUFFLEVBQUU7O0VBR1AsSUFBQSxHQUFHLEVBQUUsRUFBRTtFQUNQLElBQUEsR0FBRyxFQUFFLEVBQUU7RUFDUCxJQUFBLEdBQUcsRUFBRSxFQUFFOztFQUdQLElBQUEsR0FBRyxFQUFFLEVBQUU7RUFDUCxJQUFBLEdBQUcsRUFBRSxFQUFFO0VBQ1AsSUFBQSxHQUFHLEVBQUUsRUFBRTtNQUNQLEdBQUcsRUFBRSxFQUFFO0dBQ1IsQ0FBQztFQUVLLE1BQU0sa0JBQWtCLEdBQUcsRUFBRTs7RUMzRXBDOzs7RUFHRztFQUlILE1BQU0sYUFBYSxHQUFHLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO0VBQ3ZFLE1BQU0sZUFBZSxHQUFHLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDO0VBUXZDLElBQVksSUFXWCxDQUFBO0VBWEQsQ0FBQSxVQUFZLElBQUksRUFBQTtFQUNkLElBQUEsSUFBQSxDQUFBLElBQUEsQ0FBQSxRQUFBLENBQUEsR0FBQSxDQUFBLENBQUEsR0FBQSxRQUFVLENBQUE7RUFDVixJQUFBLElBQUEsQ0FBQSxJQUFBLENBQUEsWUFBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBLEdBQUEsWUFBYyxDQUFBO0VBQ2QsSUFBQSxJQUFBLENBQUEsSUFBQSxDQUFBLEtBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQSxHQUFBLEtBQU8sQ0FBQTtFQUNQLElBQUEsSUFBQSxDQUFBLElBQUEsQ0FBQSxPQUFBLENBQUEsR0FBQSxDQUFBLENBQUEsR0FBQSxPQUFTLENBQUE7RUFDVCxJQUFBLElBQUEsQ0FBQSxJQUFBLENBQUEsT0FBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBLEdBQUEsT0FBUyxDQUFBO0VBQ1QsSUFBQSxJQUFBLENBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQSxHQUFBLFNBQVcsQ0FBQTtFQUNYLElBQUEsSUFBQSxDQUFBLElBQUEsQ0FBQSxTQUFBLENBQUEsR0FBQSxDQUFBLENBQUEsR0FBQSxTQUFXLENBQUE7RUFDWCxJQUFBLElBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBLEdBQUEsVUFBWSxDQUFBO0VBQ1osSUFBQSxJQUFBLENBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQSxHQUFBLFNBQVcsQ0FBQTtFQUNYLElBQUEsSUFBQSxDQUFBLElBQUEsQ0FBQSxTQUFBLENBQUEsR0FBQSxFQUFBLENBQUEsR0FBQSxTQUFZLENBQUE7RUFDZCxDQUFDLEVBWFcsSUFBSSxLQUFKLElBQUksR0FXZixFQUFBLENBQUEsQ0FBQSxDQUFBO0VBRU0sTUFBTSxLQUFLLEdBQUcsQ0FBQyxJQUFVLEVBQUUsS0FBYSxFQUFFLFVBQXFCLEdBQUEsQ0FBQyxNQUFNO01BQzNFLElBQUk7TUFDSixLQUFLO01BQ0wsVUFBVTtFQUNYLENBQUEsQ0FBQyxDQUFDO0VBRUgsTUFBTSxhQUFhLEdBQUcsQ0FBQyxFQUFVLEtBQy9CLEVBQUUsS0FBSyxDQUFDO01BQ1IsRUFBRSxLQUFLLEVBQUU7TUFDVCxFQUFFLEtBQUssRUFBRTtFQUNULElBQUEsRUFBRSxLQUFLLEVBQUUsQ0FBQztFQUVaO0VBQ0EsTUFBTSxzQkFBc0IsR0FBRyxDQUFDLEVBQVUsS0FDeEMsRUFBRSxLQUFLLEVBQUU7TUFDVCxFQUFFLEtBQUssRUFBRTs7OztFQUlULEtBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxFQUFFLEdBQUcsRUFBRSxZQUFZLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7RUFFOUM7RUFDQSxNQUFNLGFBQWEsR0FBRyxDQUFDLEVBQVUsS0FDL0Isc0JBQXNCLENBQUMsRUFBRSxDQUFDLElBQUksU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0VBRTlDLE1BQU0sVUFBVSxHQUFHLENBQUMsR0FBVyxLQUFLLFFBQVEsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7RUFFakUsTUFBTSxRQUFRLEdBQUcsQ0FBQyxFQUFVLEtBQUssRUFBRSxLQUFLLEVBQUUsWUFBWSxFQUFFLEtBQUssRUFBRSxDQUFDO0VBRWhFLE1BQU0sU0FBUyxHQUFHLENBQUMsRUFBVSxLQUFLLEVBQUUsWUFBWSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsQ0FBQztFQUUvRCxNQUFNLFdBQVcsR0FBRyxDQUFDLEVBQVUsS0FDN0IsRUFBRSxLQUFLLEVBQUU7TUFDVCxFQUFFLEtBQUssRUFBRTtNQUNULEVBQUUsS0FBSyxFQUFFO01BQ1QsRUFBRSxLQUFLLEVBQUU7TUFDVCxFQUFFLEtBQUssRUFBRTtNQUNULEVBQUUsS0FBSyxFQUFFO01BQ1QsRUFBRSxLQUFLLEVBQUU7TUFDVCxFQUFFLEtBQUssRUFBRTtNQUNULEVBQUUsS0FBSyxFQUFFO01BQ1QsRUFBRSxLQUFLLEVBQUU7TUFDVCxFQUFFLEtBQUssRUFBRTtNQUNULEVBQUUsS0FBSyxFQUFFO0VBQ1QsSUFBQSxFQUFFLEtBQUssR0FBRyxDQUFDO0VBRWIsTUFBTSxVQUFVLEdBQUcsQ0FBQyxFQUFVLEtBQzVCLEVBQUUsS0FBSyxFQUFFO01BQ1QsRUFBRSxLQUFLLEVBQUU7TUFDVCxFQUFFLEtBQUssRUFBRTtNQUNULEVBQUUsS0FBSyxFQUFFO01BQ1QsRUFBRSxLQUFLLEdBQUc7RUFDVixJQUFBLEVBQUUsS0FBSyxHQUFHLENBQUM7RUFFYixNQUFNLGFBQWEsR0FBRyxDQUFDLEdBQVcsS0FDaEMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQyxNQUFNLEVBQUUsS0FBSyxLQUFJO0VBQ3RDLElBQUEsUUFBUSxLQUFLO0VBQ1gsUUFBQSxLQUFLLEdBQUc7RUFDTixZQUFBLE9BQU8sSUFBSSxDQUFDO0VBQ2QsUUFBQSxLQUFLLEdBQUc7RUFDTixZQUFBLE9BQU8sSUFBSSxDQUFDO0VBQ2QsUUFBQSxLQUFLLEdBQUc7RUFDTixZQUFBLE9BQU8sSUFBSSxDQUFDO0VBQ2QsUUFBQSxLQUFLLEdBQUc7RUFDTixZQUFBLE9BQU8sSUFBSSxDQUFDO0VBQ2QsUUFBQSxLQUFLLEdBQUc7RUFDTixZQUFBLE9BQU8sSUFBSSxDQUFDO0VBQ2QsUUFBQTtFQUNFLFlBQUEsT0FBTyxLQUFLLENBQUM7RUFDaEIsS0FBQTtFQUNILENBQUMsQ0FBQyxDQUFDO1FBRVEsU0FBUyxDQUFBO0VBTXBCLElBQUEsV0FBQSxDQUFZLEtBQWEsRUFBQTtVQUpqQixJQUFNLENBQUEsTUFBQSxHQUFHLENBQUMsQ0FBQyxDQUFDO1VBQ1osSUFBVyxDQUFBLFdBQUEsR0FBRyxDQUFDLENBQUM7RUFJdEIsUUFBQSxJQUFJLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQztVQUNwQixJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7T0FDakI7TUFFRCxTQUFTLEdBQUE7RUFDUCxRQUFBLE9BQU8sYUFBYSxDQUFDLElBQUksQ0FBQyxLQUFNLENBQUMsRUFBRTtFQUNqQyxZQUFBLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7RUFDckIsU0FBQTtFQUNELFFBQUEsSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQU0sQ0FBQztFQUFFLFlBQUEsT0FBTyxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7RUFDekQsUUFBQSxJQUFJLHNCQUFzQixDQUFDLElBQUksQ0FBQyxLQUFNLENBQUMsRUFBRTtFQUN2QyxZQUFBLE9BQU8sSUFBSSxDQUFDLHVCQUF1QixFQUFFLENBQUM7RUFDdkMsU0FBQTtFQUNELFFBQUEsSUFBSSxTQUFTLENBQUMsSUFBSSxDQUFDLEtBQU0sQ0FBQztFQUFFLFlBQUEsT0FBTyxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7RUFDMUQsUUFBQSxJQUFJLElBQUksQ0FBQyxLQUFLLEtBQUssRUFBRTtFQUFVLFlBQUEsT0FBTyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7RUFDMUQsUUFBQSxJQUFJLElBQUksQ0FBQyxLQUFLLEtBQUssRUFBRTtFQUFVLFlBQUEsT0FBTyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7RUFDNUQsUUFBQSxJQUFJLElBQUksQ0FBQyxLQUFLLEtBQUssRUFBRTtFQUFVLFlBQUEsT0FBTyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7RUFDNUQsUUFBQSxJQUFJLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBTSxDQUFDO0VBQUUsWUFBQSxPQUFPLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO0VBQzlELFFBQUEsSUFBSSxVQUFVLENBQUMsSUFBSSxDQUFDLEtBQU0sQ0FBQztFQUFFLFlBQUEsT0FBTyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQzs7VUFFNUQsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO0VBQ2hCLFFBQUEsSUFBSSxJQUFJLENBQUMsS0FBSyxLQUFLLFNBQVMsRUFBRTtjQUM1QixNQUFNLElBQUksS0FBSyxDQUFDLENBQUEsMkJBQUEsRUFBOEIsSUFBSSxDQUFDLEtBQUssQ0FBRSxDQUFBLENBQUMsQ0FBQztFQUM3RCxTQUFBO0VBQ0QsUUFBQSxPQUFPLFNBQVMsQ0FBQztPQUNsQjtFQUVPLElBQUEsUUFBUSxDQUFDLGVBQXlCLEVBQUE7VUFDeEMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1VBQ2QsSUFBSSxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFO0VBQ3BDLFlBQUEsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7Y0FDakQsSUFBSSxlQUFlLEtBQUssSUFBSSxFQUFFO0VBQzVCLGdCQUFBLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQztFQUNoQyxhQUFBO0VBQ0YsU0FBQTtFQUFNLGFBQUE7RUFDTCxZQUFBLElBQUksQ0FBQyxLQUFLLEdBQUcsU0FBUyxDQUFDO0VBQ3hCLFNBQUE7T0FDRjtNQUVPLFNBQVMsQ0FBQyxZQUFvQixDQUFDLEVBQUE7RUFDckMsUUFBQSxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxNQUFNLEdBQUcsU0FBUyxDQUFDLENBQUM7VUFDM0UsSUFBSSxTQUFTLEtBQUssQ0FBQyxFQUFFO2NBQ25CLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztFQUNwQixTQUFBO0VBQ0QsUUFBQSxPQUFPLENBQUMsQ0FBQztPQUNWO01BRU8sV0FBVyxHQUFBO0VBQ2pCLFFBQUEsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDO09BQ2hDO01BRU8sZUFBZSxHQUFBO1VBQ3JCLE1BQU0sR0FBRyxHQUFHLHFCQUFxQixDQUFDO0VBQ2xDLFFBQUEsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQztFQUM3QixRQUFBLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7RUFDcEIsUUFBQSxPQUFPLElBQUksQ0FBQyxLQUFLLEtBQUssU0FBUyxFQUFFO0VBQy9CLFlBQUEsSUFBSSxJQUFJLENBQUMsS0FBSyxLQUFLLFNBQVM7RUFBRSxnQkFBQSxNQUFNLElBQUksS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0VBQ25ELFlBQUEsSUFBSSxJQUFJLENBQUMsS0FBSyxLQUFLLEVBQUUsVUFBVTtrQkFDN0IsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO0VBQ2hCLGdCQUFBLElBQUksSUFBSSxDQUFDLEtBQUssS0FBSyxTQUFTO0VBQUUsb0JBQUEsTUFBTSxJQUFJLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztFQUNwRCxhQUFBO2NBQ0QsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO0VBQ2pCLFNBQUE7RUFDRCxRQUFBLE1BQU0sQ0FBQyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLGFBQWEsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDO1VBQzlELElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztFQUNoQixRQUFBLE9BQU8sQ0FBQyxDQUFDO09BQ1Y7TUFFTyx1QkFBdUIsR0FBQTs7O1VBRzdCLEdBQUc7Y0FDRCxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7RUFDakIsU0FBQSxRQUFRLGFBQWEsQ0FBQyxJQUFJLENBQUMsS0FBTSxDQUFDLEVBQUU7RUFDckMsUUFBQSxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7RUFDL0IsUUFBQSxNQUFNLElBQUksR0FBRyxVQUFVLENBQUMsS0FBSyxDQUFDLEdBQUcsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDO0VBQ2hFLFFBQUEsT0FBTyxLQUFLLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO09BQzNCO01BRU8sZUFBZSxHQUFBOzs7VUFHckIsR0FBRztjQUNELElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztFQUNqQixTQUFBLFFBQVEsU0FBUyxDQUFDLElBQUksQ0FBQyxLQUFNLENBQUMsRUFBRTtFQUNqQyxRQUFBLElBQUksSUFBSSxDQUFDLEtBQUssS0FBSyxFQUFFO0VBQVUsWUFBQSxPQUFPLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztVQUMxRCxPQUFPLEtBQUssQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDO09BQzlDO01BRU8sWUFBWSxHQUFBO1VBQ2xCLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztFQUNoQixRQUFBLElBQUksU0FBUyxDQUFDLElBQUksQ0FBQyxLQUFNLENBQUM7RUFBRSxZQUFBLE9BQU8sSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7VUFDNUQsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1VBQ25CLE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLGtCQUFrQixDQUFDLENBQUM7T0FDakQ7TUFFTyxjQUFjLEdBQUE7RUFDcEIsUUFBQSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO1VBQ3BCLE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7T0FDL0I7TUFFTyxjQUFjLEdBQUE7RUFDcEIsUUFBQSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO1VBQ3BCLE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7T0FDL0I7TUFFTyxpQkFBaUIsR0FBQTs7O1VBR3ZCLEdBQUc7Y0FDRCxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7RUFDakIsU0FBQSxRQUFRLFNBQVMsQ0FBQyxJQUFJLENBQUMsS0FBTSxDQUFDLEVBQUU7VUFDakMsT0FBTyxLQUFLLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQztPQUM5QztNQUVPLGlCQUFpQixHQUFBO1VBQ3ZCLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztVQUNoQixJQUFJLEVBQUUsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO1VBRTNCLElBQUksZUFBZSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRTtjQUN0QyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7Y0FDaEIsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO0VBQ2pCLFNBQUE7RUFBTSxhQUFBO0VBQ0wsWUFBQSxFQUFFLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztjQUN2QixJQUFJLGFBQWEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUU7a0JBQ3BDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztFQUNqQixhQUFBO0VBQ0YsU0FBQTtFQUNELFFBQUEsRUFBRSxHQUFHLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztFQUN0QixRQUFBLE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsRUFBRSxFQUFFLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO09BQ2pEO01BRU8sZ0JBQWdCLEdBQUE7VUFDdEIsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsS0FBTSxDQUFDLENBQUM7RUFDL0MsUUFBQSxNQUFNLENBQUMsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxLQUFLLEVBQUUsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7RUFDeEQsUUFBQSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO0VBQ3BCLFFBQUEsT0FBTyxDQUFDLENBQUM7T0FDVjtFQUNGOztFQ3JQRDs7O0VBR0c7RUFZSSxNQUFNLEtBQUssR0FBRyxDQUNuQixJQUFZLEVBQ1osVUFBeUIsS0FDUCxJQUFJLE1BQU0sQ0FBSSxJQUFJLEVBQUUsVUFBVSxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUM7UUFFL0MsTUFBTSxDQUFBO01BT2pCLFdBQVksQ0FBQSxLQUFhLEVBQUUsVUFBeUIsRUFBQTtVQUNsRCxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDO0VBQ3ZDLFFBQUEsSUFBSSxDQUFDLElBQUksR0FBRyxVQUFVLENBQUM7T0FDeEI7TUFFRCxLQUFLLEdBQUE7VUFDSCxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7RUFDaEIsUUFBQSxPQUFPLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO09BQ2hDO01BRU8sUUFBUSxDQUFDLElBQVcsRUFBRSxLQUFjLEVBQUE7VUFDMUMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxFQUFFO0VBQy9CLFlBQUEsTUFBTSxJQUFJLEtBQUssQ0FBQyxDQUFBLGNBQUEsRUFBaUIsSUFBSSxDQUFBLEVBQUEsRUFBSyxLQUFLLENBQUEsT0FBQSxFQUFVLElBQUksQ0FBQyxNQUFNLENBQUEsQ0FBRSxDQUFDLENBQUM7RUFDekUsU0FBQTtVQUNELE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsU0FBUyxFQUFFLENBQUM7RUFDdEMsUUFBQSxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztVQUNoQixJQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsS0FBQSxJQUFBLElBQUQsQ0FBQyxLQUFELEtBQUEsQ0FBQSxHQUFBLEtBQUEsQ0FBQSxHQUFBLENBQUMsQ0FBRSxJQUFJLENBQUM7VUFDckIsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLEtBQUEsSUFBQSxJQUFELENBQUMsS0FBRCxLQUFBLENBQUEsR0FBQSxLQUFBLENBQUEsR0FBQSxDQUFDLENBQUUsS0FBSyxDQUFDO09BQ3hCO01BRUQsUUFBUSxDQUFDLElBQVcsRUFBRSxLQUFjLEVBQUE7VUFDbEMsT0FBTyxFQUFFLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxLQUFLLEtBQUssSUFBSSxNQUFNLEtBQUssSUFBSSxJQUFJLENBQUMsTUFBTSxLQUFLLEtBQUssQ0FBQyxDQUFDLENBQUM7T0FDN0U7TUFFTyxnQkFBZ0IsR0FBQTtVQUN0QixJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU07RUFBRSxZQUFBLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztFQUMzQyxRQUFBLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztFQUNoQyxRQUFBLE9BQU8sSUFBSSxLQUFLLFNBQVMsR0FBRyxTQUFTLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztPQUN4RTs7OztNQUtPLGdCQUFnQixDQUFDLElBQW1CLEVBQUUsVUFBa0IsRUFBQTtVQUM5RCxJQUFJLElBQUksS0FBSyxTQUFTLEVBQUU7RUFDdEIsWUFBQSxNQUFNLElBQUksS0FBSyxDQUFDLDhCQUE4QixDQUFDLENBQUM7RUFDakQsU0FBQTtVQUNELE9BQU8sSUFBSSxDQUFDLE1BQU0sRUFBRTtjQUNsQixJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsRUFBRTtFQUNwQyxnQkFBQSxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7RUFDcEMsZ0JBQUEsSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUM7RUFDaEQsYUFBQTttQkFBTSxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsRUFBRTtFQUMzQyxnQkFBQSxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7a0JBQ3JDLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLENBQUM7RUFDekMsYUFBQTttQkFBTSxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFO2tCQUNsQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7RUFDaEIsZ0JBQUEsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO2tCQUNqQyxJQUFJLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQztFQUM5QyxhQUFBO21CQUFNLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUU7a0JBQ3RDLE1BQU07RUFDUCxhQUFBO0VBQU0saUJBQUEsSUFDTCxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUM7RUFDNUIsZ0JBQUEsSUFBSSxDQUFDLE1BQU0sQ0FBQyxVQUFVLElBQUksVUFBVSxFQUNwQztrQkFDQSxJQUFJO3NCQUNGLElBQUksQ0FBQyxNQUFNLEtBQUssR0FBRztFQUNqQiwwQkFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQzs0QkFDeEIsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0VBQzVDLGFBQUE7RUFBTSxpQkFBQTtrQkFDTCxNQUFNO0VBQ1AsYUFBQTtFQUNGLFNBQUE7RUFDRCxRQUFBLE9BQU8sSUFBSSxDQUFDO09BQ2I7TUFFTyxtQkFBbUIsQ0FBQyxJQUFPLEVBQUUsS0FBb0IsRUFBQTtVQUN2RCxJQUFJLEtBQUssS0FBSyxTQUFTLEVBQUU7RUFDdkIsWUFBQSxNQUFNLElBQUksS0FBSyxDQUFDLHFCQUFxQixDQUFDLENBQUM7RUFDeEMsU0FBQTtFQUNELFFBQUEsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLElBQUksRUFBRTtFQUN2QixZQUFBLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFHLEtBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQztFQUNwRCxTQUFBO0VBQU0sYUFBQSxJQUNMLEtBQUssQ0FBQyxJQUFJLEtBQUssUUFBUTtFQUN0QixZQUFBLEtBQWdCLENBQUMsUUFBUSxDQUFDLElBQUksS0FBSyxJQUFJLEVBQ3hDO0VBQ0EsWUFBQSxNQUFNLE1BQU0sR0FBSSxLQUFnQixDQUFDLFFBQWMsQ0FBQztFQUNoRCxZQUFBLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQ3JCLElBQUksRUFDSixNQUFNLENBQUMsS0FBSyxFQUNYLEtBQWdCLENBQUMsU0FBZ0IsQ0FDbkMsQ0FBQztFQUNILFNBQUE7RUFBTSxhQUFBO0VBQ0wsWUFBQSxNQUFNLElBQUksS0FBSyxDQUFDLHdCQUF3QixLQUFLLENBQUEsQ0FBRSxDQUFDLENBQUM7RUFDbEQsU0FBQTtPQUNGO01BRU8sWUFBWSxDQUFDLElBQU8sRUFBRSxFQUFTLEVBQUE7VUFDckMsSUFBSSxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFO2NBQzdDLE1BQU0sSUFBSSxLQUFLLENBQUMsQ0FBQSxrQkFBQSxFQUFxQixFQUFFLENBQUMsS0FBSyxDQUFFLENBQUEsQ0FBQyxDQUFDO0VBQ2xELFNBQUE7VUFDRCxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7RUFDaEIsUUFBQSxJQUFJLEtBQUssR0FBRyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7RUFDL0IsUUFBQSxPQUNFLENBQUMsSUFBSSxDQUFDLEtBQUssS0FBSyxJQUFJLENBQUMsUUFBUTtFQUMzQixZQUFBLElBQUksQ0FBQyxLQUFLLEtBQUssSUFBSSxDQUFDLEdBQUc7RUFDdkIsWUFBQSxJQUFJLENBQUMsS0FBSyxLQUFLLElBQUksQ0FBQyxPQUFPO2NBQzdCLElBQUksQ0FBQyxNQUFPLENBQUMsVUFBVSxHQUFHLEVBQUUsQ0FBQyxVQUFVLEVBQ3ZDO0VBQ0EsWUFBQSxLQUFLLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsTUFBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0VBQy9ELFNBQUE7RUFDRCxRQUFBLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUM7T0FDaEQ7TUFFTyxXQUFXLEdBQUE7VUFDakIsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRTtFQUNoQyxZQUFBLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7Y0FDMUIsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDOzs7RUFHaEIsWUFBQSxJQUFJLEtBQUssS0FBSyxHQUFHLElBQUksS0FBSyxLQUFLLEdBQUcsRUFBRTtrQkFDbEMsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRTtFQUMvQixvQkFBQSxPQUFPLElBQUksQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUM7RUFDbEMsaUJBQUE7dUJBQU0sSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRTtFQUN0QyxvQkFBQSxPQUFPLElBQUksQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUM7RUFDbEMsaUJBQUE7RUFDRixhQUFBO2NBQ0QsSUFBSSxlQUFlLENBQUMsT0FBTyxDQUFDLEtBQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztFQUN4QyxnQkFBQSxNQUFNLElBQUksS0FBSyxDQUFDLHFCQUFxQixLQUFLLENBQUEsQ0FBRSxDQUFDLENBQUM7RUFDaEQsWUFBQSxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQ2hDLElBQUksQ0FBQyxhQUFhLEVBQUUsRUFDcEIsa0JBQWtCLENBQ25CLENBQUM7Y0FDRixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztFQUN0QyxTQUFBO0VBQ0QsUUFBQSxPQUFPLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztPQUM3QjtFQUVPLElBQUEsYUFBYSxDQUFDLFNBQVksRUFBQTtVQUNoQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDLENBQUM7RUFDbEMsUUFBQSxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztFQUN6QyxRQUFBLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO0VBQzFCLFFBQUEsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7RUFDMUMsUUFBQSxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxRQUFRLEVBQUUsU0FBUyxDQUFDLENBQUM7T0FDMUQ7TUFFTyxhQUFhLEdBQUE7VUFDbkIsUUFBUSxJQUFJLENBQUMsS0FBSztjQUNoQixLQUFLLElBQUksQ0FBQyxPQUFPO0VBQ2YsZ0JBQUEsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLE1BQU8sQ0FBQztrQkFDN0IsSUFBSSxPQUFPLEtBQUssTUFBTSxFQUFFO3NCQUN0QixJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7O3NCQUVoQixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0VBQzlCLGlCQUFBO3VCQUFNLElBQUksUUFBUSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRTtFQUMzQyxvQkFBQSxNQUFNLElBQUksS0FBSyxDQUFDLHVCQUF1QixPQUFPLENBQUEsQ0FBRSxDQUFDLENBQUM7RUFDbkQsaUJBQUE7RUFDRCxnQkFBQSxNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixPQUFPLENBQUEsQ0FBRSxDQUFDLENBQUM7Y0FDdEQsS0FBSyxJQUFJLENBQUMsVUFBVTtFQUNsQixnQkFBQSxPQUFPLElBQUksQ0FBQyx3QkFBd0IsRUFBRSxDQUFDO2NBQ3pDLEtBQUssSUFBSSxDQUFDLE1BQU07RUFDZCxnQkFBQSxPQUFPLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztjQUM3QixLQUFLLElBQUksQ0FBQyxPQUFPO0VBQ2YsZ0JBQUEsT0FBTyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7Y0FDOUIsS0FBSyxJQUFJLENBQUMsT0FBTztFQUNmLGdCQUFBLE9BQU8sSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO2NBQzlCLEtBQUssSUFBSSxDQUFDLE9BQU87RUFDZixnQkFBQSxJQUFJLElBQUksQ0FBQyxNQUFNLEtBQUssR0FBRyxFQUFFO0VBQ3ZCLG9CQUFBLE9BQU8sSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO0VBQzNCLGlCQUFBO0VBQU0scUJBQUEsSUFBSSxJQUFJLENBQUMsTUFBTSxLQUFLLEdBQUcsRUFBRTtFQUM5QixvQkFBQSxPQUFPLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztFQUN6QixpQkFBQTtFQUFNLHFCQUFBLElBQUksSUFBSSxDQUFDLE1BQU0sS0FBSyxHQUFHLEVBQUU7RUFDOUIsb0JBQUEsT0FBTyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7RUFDMUIsaUJBQUE7RUFDRCxnQkFBQSxPQUFPLFNBQVMsQ0FBQztjQUNuQixLQUFLLElBQUksQ0FBQyxLQUFLO0VBQ2IsZ0JBQUEsTUFBTSxJQUFJLEtBQUssQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO0VBQzFDLFlBQUE7RUFDRSxnQkFBQSxPQUFPLFNBQVMsQ0FBQztFQUNwQixTQUFBO09BQ0Y7TUFFTyxVQUFVLEdBQUE7VUFDaEIsTUFBTSxLQUFLLEdBQXNCLEVBQUUsQ0FBQztVQUNwQyxHQUFHO2NBQ0QsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO2NBQ2hCLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQztrQkFBRSxNQUFNO2NBQzVDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUMsQ0FBQztXQUNyQyxRQUFRLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFO1VBQ3BDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsQ0FBQztVQUNqQyxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO09BQzlCO01BRU8sU0FBUyxHQUFBO1VBQ2YsTUFBTSxPQUFPLEdBQW1DLEVBQUUsQ0FBQztVQUNuRCxHQUFHO2NBQ0QsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO2NBQ2hCLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQztrQkFBRSxNQUFNO0VBQzVDLFlBQUEsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLE1BQU8sQ0FBQztFQUN6QixZQUFBLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0VBQzNCLFlBQUEsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7Y0FDMUIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1dBQ3hDLFFBQVEsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUU7VUFDcEMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1VBQ2pDLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7T0FDL0I7TUFFTyx3QkFBd0IsR0FBQTtFQUM5QixRQUFBLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7VUFDMUIsSUFBSSxLQUFLLEtBQUssTUFBTSxFQUFFO2NBQ3BCLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztjQUNoQixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0VBQ2hDLFNBQUE7VUFDRCxJQUFJLEtBQUssS0FBSyxPQUFPLEVBQUU7Y0FDckIsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO2NBQ2hCLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7RUFDakMsU0FBQTtVQUNELElBQUksS0FBSyxLQUFLLE1BQU0sRUFBRTtjQUNwQixJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7Y0FDaEIsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztFQUNoQyxTQUFBO1VBQ0QsSUFBSSxLQUFLLEtBQUssV0FBVyxFQUFFO2NBQ3pCLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztjQUNoQixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0VBQ3JDLFNBQUE7RUFDRCxRQUFBLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO0VBQzNDLFFBQUEsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO1VBQ3BDLE9BQU8sQ0FBQyxJQUFJLEdBQUcsVUFBVSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUM7T0FDM0U7TUFFTyxnQkFBZ0IsR0FBQTtVQUN0QixJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEVBQUU7Y0FDbkMsTUFBTSxJQUFJLEtBQUssQ0FBQyxDQUFBLHFCQUFBLEVBQXdCLElBQUksQ0FBQyxNQUFNLENBQUUsQ0FBQSxDQUFDLENBQUM7RUFDeEQsU0FBQTtFQUNELFFBQUEsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQztVQUMxQixJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7VUFDaEIsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxLQUFNLENBQUMsQ0FBQztPQUM3QjtNQUVPLGVBQWUsR0FBQTtVQUNyQixJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxFQUFFO0VBQ3JDLFlBQUEsT0FBTyxTQUFTLENBQUM7RUFDbEIsU0FBQTtVQUNELE1BQU0sSUFBSSxHQUF5QixFQUFFLENBQUM7VUFDdEMsR0FBRztjQUNELElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztjQUNoQixJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsRUFBRTtrQkFDcEMsTUFBTTtFQUNQLGFBQUE7RUFDRCxZQUFBLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO0VBQ3JDLFlBQUEsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztXQUNqQixRQUFRLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFO1VBQ3BDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsQ0FBQztFQUNqQyxRQUFBLE9BQU8sSUFBSSxDQUFDO09BQ2I7TUFFTyxXQUFXLEdBQUE7O1VBRWpCLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztFQUNoQixRQUFBLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1VBQ3JDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsQ0FBQztFQUNqQyxRQUFBLE9BQU8sSUFBSSxDQUFDO09BQ2I7TUFFTyxXQUFXLEdBQUE7VUFDakIsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO0VBQ2hCLFFBQUEsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7VUFDckMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1VBQ2pDLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7T0FDOUI7TUFFTyxZQUFZLEdBQUE7RUFDbEIsUUFBQSxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTyxDQUFDLENBQUM7VUFDOUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO0VBQ2hCLFFBQUEsT0FBTyxLQUFLLENBQUM7T0FDZDtNQUVPLGFBQWEsQ0FBQyxTQUFpQixFQUFFLEVBQUE7VUFDdkMsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEdBQUcsTUFBTSxDQUFBLEVBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7VUFDekUsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO0VBQ2hCLFFBQUEsT0FBTyxLQUFLLENBQUM7T0FDZDtNQUVPLGFBQWEsQ0FBQyxTQUFpQixFQUFFLEVBQUE7RUFDdkMsUUFBQSxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBRyxFQUFBLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFFLENBQUEsQ0FBQyxDQUFDLENBQUM7VUFDdkUsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO0VBQ2hCLFFBQUEsT0FBTyxLQUFLLENBQUM7T0FDZDtFQUNGOztFQ2hURDs7O0VBR0c7RUFLSCxNQUFNLGlCQUFpQixHQUFHO01BQ3hCLEdBQUcsRUFBRSxDQUFDLENBQU0sRUFBRSxDQUFNLEtBQUssQ0FBQyxHQUFHLENBQUM7TUFDOUIsR0FBRyxFQUFFLENBQUMsQ0FBTSxFQUFFLENBQU0sS0FBSyxDQUFDLEdBQUcsQ0FBQztNQUM5QixHQUFHLEVBQUUsQ0FBQyxDQUFNLEVBQUUsQ0FBTSxLQUFLLENBQUMsR0FBRyxDQUFDO01BQzlCLEdBQUcsRUFBRSxDQUFDLENBQU0sRUFBRSxDQUFNLEtBQUssQ0FBQyxHQUFHLENBQUM7TUFDOUIsR0FBRyxFQUFFLENBQUMsQ0FBTSxFQUFFLENBQU0sS0FBSyxDQUFDLEdBQUcsQ0FBQztNQUM5QixJQUFJLEVBQUUsQ0FBQyxDQUFNLEVBQUUsQ0FBTSxLQUFLLENBQUMsSUFBSSxDQUFDO01BQ2hDLElBQUksRUFBRSxDQUFDLENBQU0sRUFBRSxDQUFNLEtBQUssQ0FBQyxJQUFJLENBQUM7TUFDaEMsS0FBSyxFQUFFLENBQUMsQ0FBTSxFQUFFLENBQU0sS0FBSyxDQUFDLEtBQUssQ0FBQztNQUNsQyxLQUFLLEVBQUUsQ0FBQyxDQUFNLEVBQUUsQ0FBTSxLQUFLLENBQUMsS0FBSyxDQUFDO01BQ2xDLEdBQUcsRUFBRSxDQUFDLENBQU0sRUFBRSxDQUFNLEtBQUssQ0FBQyxHQUFHLENBQUM7TUFDOUIsSUFBSSxFQUFFLENBQUMsQ0FBTSxFQUFFLENBQU0sS0FBSyxDQUFDLElBQUksQ0FBQztNQUNoQyxHQUFHLEVBQUUsQ0FBQyxDQUFNLEVBQUUsQ0FBTSxLQUFLLENBQUMsR0FBRyxDQUFDO01BQzlCLElBQUksRUFBRSxDQUFDLENBQU0sRUFBRSxDQUFNLEtBQUssQ0FBQyxJQUFJLENBQUM7TUFDaEMsSUFBSSxFQUFFLENBQUMsQ0FBTSxFQUFFLENBQU0sS0FBSyxDQUFDLElBQUksQ0FBQztNQUNoQyxJQUFJLEVBQUUsQ0FBQyxDQUFNLEVBQUUsQ0FBTSxLQUFLLENBQUMsSUFBSSxDQUFDO0VBQ2hDLElBQUEsSUFBSSxFQUFFLENBQUMsQ0FBTSxFQUFFLENBQU0sS0FBSyxDQUFDLEtBQUQsSUFBQSxJQUFBLENBQUMsS0FBRCxLQUFBLENBQUEsR0FBQSxDQUFDLEdBQUksQ0FBQztNQUNoQyxHQUFHLEVBQUUsQ0FBQyxDQUFNLEVBQUUsQ0FBa0IsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO01BQ3pDLElBQUksRUFBRSxDQUFDLENBQU0sRUFBRSxDQUFrQixLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7R0FDM0MsQ0FBQztFQUVGLE1BQU0sZ0JBQWdCLEdBQUc7RUFDdkIsSUFBQSxHQUFHLEVBQUUsQ0FBQyxDQUFNLEtBQUssQ0FBQztFQUNsQixJQUFBLEdBQUcsRUFBRSxDQUFDLENBQU0sS0FBSyxDQUFDLENBQUM7RUFDbkIsSUFBQSxHQUFHLEVBQUUsQ0FBQyxDQUFNLEtBQUssQ0FBQyxDQUFDO0dBQ3BCLENBQUM7UUE2RVcsY0FBYyxDQUFBO01BQ3pCLEtBQUssR0FBQTs7VUFFSCxPQUFPO0VBQ0wsWUFBQSxJQUFJLEVBQUUsT0FBTztFQUNiLFlBQUEsUUFBUSxDQUFDLEtBQUssRUFBQTtFQUNaLGdCQUFBLE9BQU8sS0FBSyxDQUFDO2VBQ2Q7RUFDRCxZQUFBLE1BQU0sQ0FBQyxNQUFNLEVBQUE7RUFDWCxnQkFBQSxPQUFPLE1BQU0sQ0FBQztlQUNmO1dBQ0YsQ0FBQztPQUNIOztFQUdELElBQUEsT0FBTyxDQUFDLENBQVMsRUFBQTtVQUNmLE9BQU87RUFDTCxZQUFBLElBQUksRUFBRSxTQUFTO0VBQ2YsWUFBQSxLQUFLLEVBQUUsQ0FBQztFQUNSLFlBQUEsUUFBUSxDQUFDLE1BQU0sRUFBQTtrQkFDYixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUM7ZUFDbkI7RUFDRCxZQUFBLE1BQU0sQ0FBQyxNQUFNLEVBQUE7RUFDWCxnQkFBQSxPQUFPLE1BQU0sQ0FBQztlQUNmO1dBQ0YsQ0FBQztPQUNIO0VBRUQsSUFBQSxFQUFFLENBQUMsQ0FBUyxFQUFBO1VBQ1YsT0FBTztFQUNMLFlBQUEsSUFBSSxFQUFFLElBQUk7RUFDVixZQUFBLEtBQUssRUFBRSxDQUFDO0VBQ1IsWUFBQSxRQUFRLENBQUMsS0FBSyxFQUFBOztFQUVaLGdCQUFBLElBQUksSUFBSSxDQUFDLEtBQUssS0FBSyxNQUFNO0VBQUUsb0JBQUEsT0FBTyxLQUFLLENBQUM7a0JBQ3hDLE9BQU8sS0FBSyxLQUFMLElBQUEsSUFBQSxLQUFLLEtBQUwsS0FBQSxDQUFBLEdBQUEsS0FBQSxDQUFBLEdBQUEsS0FBSyxDQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztlQUM1QjtFQUNELFlBQUEsTUFBTSxDQUFDLE1BQU0sRUFBQTtFQUNYLGdCQUFBLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO0VBQ3hCLGdCQUFBLE9BQU8sTUFBTSxDQUFDO2VBQ2Y7V0FDRixDQUFDO09BQ0g7TUFFRCxLQUFLLENBQUMsRUFBVSxFQUFFLElBQWdCLEVBQUE7RUFDaEMsUUFBQSxNQUFNLENBQUMsR0FBRyxnQkFBZ0IsQ0FBQyxFQUFFLENBQUMsQ0FBQztVQUMvQixPQUFPO0VBQ0wsWUFBQSxJQUFJLEVBQUUsT0FBTztFQUNiLFlBQUEsUUFBUSxFQUFFLEVBQUU7RUFDWixZQUFBLEtBQUssRUFBRSxJQUFJO0VBQ1gsWUFBQSxRQUFRLENBQUMsS0FBSyxFQUFBO2tCQUNaLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7ZUFDdEM7RUFDRCxZQUFBLE1BQU0sQ0FBQyxNQUFNLEVBQUE7a0JBQ1gsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQztlQUNsQztXQUNGLENBQUM7T0FDSDtFQUVELElBQUEsTUFBTSxDQUFDLENBQWEsRUFBRSxFQUFVLEVBQUUsQ0FBYSxFQUFBO0VBQzdDLFFBQUEsTUFBTSxDQUFDLEdBQUcsaUJBQWlCLENBQUMsRUFBRSxDQUFDLENBQUM7VUFDaEMsT0FBTztFQUNMLFlBQUEsSUFBSSxFQUFFLFFBQVE7RUFDZCxZQUFBLFFBQVEsRUFBRSxFQUFFO0VBQ1osWUFBQSxJQUFJLEVBQUUsQ0FBQztFQUNQLFlBQUEsS0FBSyxFQUFFLENBQUM7RUFDUixZQUFBLFFBQVEsQ0FBQyxLQUFLLEVBQUE7a0JBQ1osT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztlQUNqRTtFQUNELFlBQUEsTUFBTSxDQUFDLE1BQU0sRUFBQTtFQUNYLGdCQUFBLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0VBQ3pCLGdCQUFBLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0VBQzFCLGdCQUFBLE9BQU8sTUFBTSxDQUFDO2VBQ2Y7V0FDRixDQUFDO09BQ0g7TUFFRCxNQUFNLENBQUMsQ0FBYSxFQUFFLENBQVMsRUFBQTtVQUM3QixPQUFPO0VBQ0wsWUFBQSxJQUFJLEVBQUUsUUFBUTtFQUNkLFlBQUEsUUFBUSxFQUFFLENBQUM7RUFDWCxZQUFBLElBQUksRUFBRSxDQUFDO0VBQ1AsWUFBQSxRQUFRLENBQUMsS0FBSyxFQUFBOztFQUNaLGdCQUFBLE9BQU8sQ0FBQSxFQUFBLEdBQUEsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLE1BQUcsSUFBQSxJQUFBLEVBQUEsS0FBQSxLQUFBLENBQUEsR0FBQSxLQUFBLENBQUEsR0FBQSxFQUFBLENBQUEsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO2VBQ25EO0VBQ0QsWUFBQSxNQUFNLENBQUMsTUFBTSxFQUFBO0VBQ1gsZ0JBQUEsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7RUFDN0IsZ0JBQUEsT0FBTyxNQUFNLENBQUM7ZUFDZjtXQUNGLENBQUM7T0FDSDtFQUVELElBQUEsTUFBTSxDQUFDLFFBQW9CLEVBQUUsTUFBYyxFQUFFLElBQWtCLEVBQUE7VUFDN0QsSUFBSSxNQUFNLElBQUksSUFBSSxJQUFJLE9BQU8sTUFBTSxLQUFLLFFBQVEsRUFBRTtFQUNoRCxZQUFBLE1BQU0sSUFBSSxLQUFLLENBQUMscUJBQXFCLENBQUMsQ0FBQztFQUN4QyxTQUFBO1VBQ0QsT0FBTztFQUNMLFlBQUEsSUFBSSxFQUFFLFFBQVE7RUFDZCxZQUFBLFFBQVEsRUFBRSxRQUFRO0VBQ2xCLFlBQUEsTUFBTSxFQUFFLE1BQU07RUFDZCxZQUFBLFNBQVMsRUFBRSxJQUFJO0VBQ2YsWUFBQSxRQUFRLENBQUMsS0FBSyxFQUFBOztrQkFDWixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQzs7OztFQUkvQyxnQkFBQSxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsTUFBTSxHQUFHLFFBQVEsR0FBRyxNQUFBLEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBQSxJQUFBLElBQUEsRUFBQSxLQUFBLEtBQUEsQ0FBQSxHQUFBLEVBQUEsR0FBSSxLQUFLLENBQUM7RUFDOUQsZ0JBQUEsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDLEdBQUcsUUFBUSxDQUFDO2tCQUNwRCxNQUFNLElBQUksR0FBRyxDQUFBLEVBQUEsR0FBQSxJQUFJLENBQUMsU0FBUyxNQUFBLElBQUEsSUFBQSxFQUFBLEtBQUEsS0FBQSxDQUFBLEdBQUEsRUFBQSxHQUFJLEVBQUUsQ0FBQztrQkFDbEMsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUQsSUFBQSxJQUFBLENBQUMsdUJBQUQsQ0FBQyxDQUFFLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO2tCQUN0RCxPQUFPLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUFDO2VBQ2xDO0VBQ0QsWUFBQSxNQUFNLENBQUMsTUFBTSxFQUFBOztFQUNYLGdCQUFBLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2tCQUM3QixDQUFBLEVBQUEsR0FBQSxJQUFJLENBQUMsU0FBUyxNQUFBLElBQUEsSUFBQSxFQUFBLEtBQUEsS0FBQSxDQUFBLEdBQUEsS0FBQSxDQUFBLEdBQUEsRUFBQSxDQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUQsSUFBQSxJQUFBLENBQUMsdUJBQUQsQ0FBQyxDQUFFLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO0VBQ2xELGdCQUFBLE9BQU8sTUFBTSxDQUFDO2VBQ2Y7V0FDRixDQUFDO09BQ0g7RUFFRCxJQUFBLEtBQUssQ0FBQyxDQUFhLEVBQUE7RUFDakIsUUFBQSxPQUFPLENBQUMsQ0FBQztPQUNWO01BRUQsS0FBSyxDQUFDLENBQWEsRUFBRSxDQUFhLEVBQUE7VUFDaEMsT0FBTztFQUNMLFlBQUEsSUFBSSxFQUFFLE9BQU87RUFDYixZQUFBLFFBQVEsRUFBRSxDQUFDO0VBQ1gsWUFBQSxRQUFRLEVBQUUsQ0FBQztFQUNYLFlBQUEsUUFBUSxDQUFDLEtBQUssRUFBQTs7RUFDWixnQkFBQSxPQUFPLE1BQUEsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLDBDQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7ZUFDdkU7RUFDRCxZQUFBLE1BQU0sQ0FBQyxNQUFNLEVBQUE7RUFDWCxnQkFBQSxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQztFQUM3QixnQkFBQSxPQUFPLE1BQU0sQ0FBQztlQUNmO1dBQ0YsQ0FBQztPQUNIO0VBRUQsSUFBQSxPQUFPLENBQUMsQ0FBYSxFQUFFLENBQWEsRUFBRSxDQUFhLEVBQUE7VUFDakQsT0FBTztFQUNMLFlBQUEsSUFBSSxFQUFFLFNBQVM7RUFDZixZQUFBLFNBQVMsRUFBRSxDQUFDO0VBQ1osWUFBQSxRQUFRLEVBQUUsQ0FBQztFQUNYLFlBQUEsU0FBUyxFQUFFLENBQUM7RUFDWixZQUFBLFFBQVEsQ0FBQyxLQUFLLEVBQUE7a0JBQ1osTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7RUFDekMsZ0JBQUEsSUFBSSxDQUFDLEVBQUU7c0JBQ0wsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztFQUN0QyxpQkFBQTtFQUFNLHFCQUFBO3NCQUNMLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7RUFDdkMsaUJBQUE7ZUFDRjtFQUNELFlBQUEsTUFBTSxDQUFDLE1BQU0sRUFBQTtFQUNYLGdCQUFBLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0VBQzlCLGdCQUFBLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0VBQzdCLGdCQUFBLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0VBQzlCLGdCQUFBLE9BQU8sTUFBTSxDQUFDO2VBQ2Y7V0FDRixDQUFDO09BQ0g7RUFFRCxJQUFBLEdBQUcsQ0FBQyxPQUFnRCxFQUFBO1VBQ2xELE9BQU87RUFDTCxZQUFBLElBQUksRUFBRSxLQUFLO0VBQ1gsWUFBQSxPQUFPLEVBQUUsT0FBTztFQUNoQixZQUFBLFFBQVEsQ0FBQyxLQUFLLEVBQUE7a0JBQ1osTUFBTSxHQUFHLEdBQUcsRUFBRSxDQUFDO0VBQ2YsZ0JBQUEsSUFBSSxPQUFPLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRTtFQUMzQixvQkFBQSxLQUFLLE1BQU0sR0FBRyxJQUFJLE9BQU8sRUFBRTswQkFDekIsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztFQUM5Qix3QkFBQSxJQUFJLEdBQUcsRUFBRTs4QkFDUCxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztFQUNoQyx5QkFBQTtFQUNGLHFCQUFBO0VBQ0YsaUJBQUE7RUFDRCxnQkFBQSxPQUFPLEdBQUcsQ0FBQztlQUNaO0VBQ0QsWUFBQSxNQUFNLENBQUMsTUFBTSxFQUFBO0VBQ1gsZ0JBQUEsSUFBSSxPQUFPLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRTtFQUMzQixvQkFBQSxLQUFLLE1BQU0sR0FBRyxJQUFJLE9BQU8sRUFBRTswQkFDekIsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztFQUM5Qix3QkFBQSxJQUFJLEdBQUcsRUFBRTtFQUNQLDRCQUFBLEdBQUcsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7RUFDcEIseUJBQUE7RUFDRixxQkFBQTtFQUNGLGlCQUFBO0VBQ0QsZ0JBQUEsT0FBTyxNQUFNLENBQUM7ZUFDZjtXQUNGLENBQUM7T0FDSDs7RUFHRCxJQUFBLElBQUksQ0FBQyxDQUFnQyxFQUFBO1VBQ25DLE9BQU87RUFDTCxZQUFBLElBQUksRUFBRSxNQUFNO0VBQ1osWUFBQSxLQUFLLEVBQUUsQ0FBQztFQUNSLFlBQUEsUUFBUSxDQUFDLEtBQUssRUFBQTs7a0JBQ1osT0FBTyxDQUFBLEVBQUEsR0FBQSxJQUFJLENBQUMsS0FBSywwQ0FBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFBLElBQUEsSUFBRCxDQUFDLEtBQUEsS0FBQSxDQUFBLEdBQUEsS0FBQSxDQUFBLEdBQUQsQ0FBQyxDQUFFLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO2VBQ25EO0VBQ0QsWUFBQSxNQUFNLENBQUMsTUFBTSxFQUFBOztrQkFDWCxDQUFBLEVBQUEsR0FBQSxJQUFJLENBQUMsS0FBSyxNQUFBLElBQUEsSUFBQSxFQUFBLEtBQUEsS0FBQSxDQUFBLEdBQUEsS0FBQSxDQUFBLEdBQUEsRUFBQSxDQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUQsSUFBQSxJQUFBLENBQUMsdUJBQUQsQ0FBQyxDQUFFLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO0VBQzlDLGdCQUFBLE9BQU8sTUFBTSxDQUFDO2VBQ2Y7V0FDRixDQUFDO09BQ0g7RUFDRjs7RUNyVEQsTUFBTSxFQUFDLGFBQWEsRUFBRSxZQUFZLEVBQUUsb0JBQW9CLEVBQUUsU0FBUyxFQUFDLEdBQUdDLHVCQUFFLENBQUM7RUFFMUUsTUFBTSxVQUFVLEdBQUcsSUFBSSxjQUFjLEVBQUUsQ0FBQztFQUN4QyxNQUFNLGVBQWUsR0FBRyxJQUFJLEdBQUcsRUFBa0MsQ0FBQztFQUVsRSxNQUFNLFdBQVcsR0FBRyxDQUFDLENBQVMsS0FDNUIsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBVSxLQUFLLEVBQUUsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDO0VBRTdEOztFQUVHO0VBQ0gsTUFBTSxjQUFjLEdBQUcsQ0FBQyxDQUFTLEVBQUUsS0FBVSxLQUFJO01BQy9DLElBQUksR0FBRyxHQUFHLGVBQWUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7TUFDakMsSUFBSSxHQUFHLEtBQUssU0FBUyxFQUFFO0VBQ3JCLFFBQUEsSUFBSSxlQUFlLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFO0VBQzFCLFlBQUEsT0FBTyxTQUFTLENBQUM7RUFDbEIsU0FBQTtFQUNELFFBQUEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztFQUNiLFFBQUEsSUFBSSxDQUFDLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUU7RUFDMUMsWUFBQSxNQUFNLFVBQVUsR0FBRyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO2NBQ3ZELEdBQUcsR0FBRyxJQUFJLE1BQU0sQ0FBQyxVQUFVLEVBQUUsVUFBVSxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUM7RUFDakQsWUFBQSxlQUFlLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztFQUM3QixTQUFBO0VBQ0YsS0FBQTtFQUNELElBQUEsT0FBTyxHQUFHLEVBQUUsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO0VBQzlCLENBQUMsQ0FBQztFQWtDSyxNQUFNLFNBQVMsR0FBb0IsQ0FDeEMsUUFBNkIsRUFDN0IsS0FBYSxFQUNiLFFBQTBCLEVBQzFCLFNBQW9CLEtBQ2xCO01BQ0YsTUFBTSxXQUFXLEdBQUcsUUFBUSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQztNQUNoRCxJQUFJLFdBQVcsS0FBSyxJQUFJLElBQUksY0FBYyxDQUFDLFdBQVcsRUFBRSxLQUFLLENBQUMsRUFBRTtVQUM5RCxPQUFPLGdCQUFnQixDQUFDLFFBQVEsRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLFNBQVMsQ0FBQyxDQUFDO0VBQy9ELEtBQUE7RUFDRCxJQUFBLE9BQU8sU0FBUyxDQUFDO0VBQ25CLENBQUMsQ0FBQztFQUVLLE1BQU0sYUFBYSxHQUFvQixDQUM1QyxRQUE2QixFQUM3QixLQUFhLEVBQ2IsUUFBMEIsRUFDMUIsU0FBb0IsS0FDbEI7TUFDRixNQUFNLGVBQWUsR0FBRyxRQUFRLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxDQUFDO01BQ3hELElBQUksZUFBZSxLQUFLLElBQUksRUFBRTtVQUM1QixNQUFNLEtBQUssR0FBRyxjQUFjLENBQUMsZUFBZSxFQUFFLEtBQUssQ0FBQyxDQUFDO0VBQ3JELFFBQUEsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEVBQUU7RUFDM0IsWUFBQSxPQUFPQyx5QkFBTyxDQUFDO0VBQ2hCLFNBQUE7RUFDRCxRQUFBLE1BQU0sV0FBVyxHQUFHLGNBQWMsQ0FBQyxRQUFRLENBQUMsQ0FBQztFQUU3QyxRQUFBLElBQUksS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDO1VBQ2YsTUFBTSxNQUFNLEdBQUcsRUFBRSxDQUFDO0VBQ2xCLFFBQUEsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLEVBQUU7RUFDeEIsWUFBQSxLQUFLLEVBQUUsQ0FBQztjQUNSLE1BQU0sU0FBUyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7RUFDdkMsWUFBQSxTQUFTLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztFQUN0QixZQUFBLFNBQVMsQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDO2NBQ3hCLFNBQVMsQ0FBQyxNQUFNLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLElBQUksS0FBSyxDQUFDO2NBRTNDLE1BQU0sTUFBTSxHQUFHLFdBQVcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxLQUN4QyxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxRQUFRLEVBQUUsU0FBUyxDQUFDLENBQzVDLENBQUM7RUFDRixZQUFBLE1BQU0sY0FBYyxHQUEyQjtFQUM3QyxnQkFBQSxVQUFVLEVBQUUsV0FBVztrQkFDdkIsTUFBTTtlQUNQLENBQUM7RUFDRixZQUFBLE1BQU0sQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUM7RUFDN0IsU0FBQTtFQUNELFFBQUEsT0FBTyxNQUFNLENBQUM7RUFDZixLQUFBO0VBQ0QsSUFBQSxPQUFPLFNBQVMsQ0FBQztFQUNuQixDQUFDLENBQUM7RUFFSyxNQUFNLGVBQWUsR0FBcUI7RUFDL0MsSUFBQSxFQUFFLEVBQUUsU0FBUztFQUNiLElBQUEsTUFBTSxFQUFFLGFBQWE7R0FDdEIsQ0FBQztFQUVGOztFQUVHO0FBQ0ksUUFBTSxlQUFlLEdBQUcsQ0FDN0IsUUFBNkIsRUFDN0IsUUFBNkIsR0FBQSxlQUFlLEVBQzVDLFNBQXVCLEdBQUEsRUFBRSxFQUN6QixhQUFtQyxLQUNmO0VBQ3BCLElBQUEsTUFBTSxXQUFXLEdBQUcsY0FBYyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0VBQzdDLElBQUEsTUFBTSxpQkFBaUIsR0FBRyxXQUFXLENBQUMsU0FBUyxDQUFDO0VBQ2hELElBQUEsSUFBSSxhQUFhLEVBQUU7RUFDakIsUUFBQSxNQUFNLGdCQUFnQixHQUFHLGNBQWMsQ0FBQyxhQUFhLENBQUMsQ0FBQztFQUN2RCxRQUFBLE1BQU0sY0FBYyxHQUFHLGdCQUFnQixDQUFDLFNBQVMsQ0FBQztFQUNsRCxRQUFBLE1BQU0saUJBQWlCLEdBQUcsaUJBQWlCLENBQUMsT0FBTyxDQUFDLENBQUM7VUFFckQsSUFBSSxpQkFBaUIsS0FBSyxTQUFTLEVBQUU7OztFQUluQyxZQUFBLFNBQVMsR0FBRzs7RUFFVixnQkFBQSxHQUFHLGlCQUFpQjs7RUFFcEIsZ0JBQUEsR0FBRyxTQUFTOztrQkFFWixLQUFLLEVBQUUsQ0FBQyxLQUFLLEVBQUUsUUFBUSxFQUFFLFNBQVMsS0FBSTs7Ozs7RUFLcEMsb0JBQUEsU0FBUyxHQUFHOztFQUVWLHdCQUFBLEdBQUcsY0FBYzs7RUFFakIsd0JBQUEsR0FBRyxTQUFTOzswQkFFWixLQUFLLEVBQUUsQ0FBQyxLQUFLLEVBQUUsUUFBUSxFQUFFLFNBQVMsS0FBSTs4QkFDcEMsT0FBTyxnQkFBZ0IsQ0FDckIsYUFBYSxFQUNiLEtBQUssRUFDTCxRQUFRLEVBQ1IsU0FBUyxDQUNWLENBQUM7MkJBQ0g7dUJBQ0YsQ0FBQztzQkFDRixPQUFPLGlCQUFpQixDQUFDLEtBQUssRUFBRSxRQUFRLEVBQUUsU0FBUyxDQUFDLENBQUM7bUJBQ3REO2VBQ0YsQ0FBQztFQUNILFNBQUE7RUFBTSxhQUFBOzs7OztFQU1MLFlBQUEsU0FBUyxHQUFHOztFQUVWLGdCQUFBLEdBQUcsY0FBYzs7RUFFakIsZ0JBQUEsR0FBRyxpQkFBaUI7O0VBRXBCLGdCQUFBLEdBQUcsU0FBUztlQUNiLENBQUM7Y0FDRixRQUFRLEdBQUcsYUFBYSxDQUFDO0VBQzFCLFNBQUE7RUFDRixLQUFBO0VBQU0sU0FBQTs7RUFFTCxRQUFBLFNBQVMsR0FBRztFQUNWLFlBQUEsR0FBRyxTQUFTO0VBQ1osWUFBQSxHQUFHLGlCQUFpQjtXQUNyQixDQUFDO0VBQ0gsS0FBQTtFQUNELElBQUEsT0FBTyxDQUFDLEtBQUssS0FBSyxnQkFBZ0IsQ0FBQyxRQUFRLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxTQUFTLENBQUMsQ0FBQztFQUMzRSxFQUFFO0VBNEJGOzs7Ozs7OztFQVFHO0FBQ0ksUUFBTSxnQkFBZ0IsR0FBRyxDQUM5QixRQUE2QixFQUM3QixLQUFVLEVBQ1YsV0FBNkIsZUFBZSxFQUM1QyxTQUF1QixHQUFBLEVBQUUsS0FDdkI7RUFDRixJQUFBLE1BQU0sV0FBVyxHQUFHLGNBQWMsQ0FBQyxRQUFRLENBQUMsQ0FBQztNQUM3QyxNQUFNLE1BQU0sR0FBbUIsRUFBRSxDQUFDO0VBQ2xDLElBQUEsS0FBSyxNQUFNLElBQUksSUFBSSxXQUFXLENBQUMsS0FBSyxFQUFFO0VBQ3BDLFFBQUEsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsUUFBUSxFQUFFLFNBQVMsQ0FBQyxDQUFDO0VBQ3RELFFBQUEsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLENBQUMsRUFBRTtFQUNuQixZQUFBLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBSSxLQUEyQixDQUFDLENBQUM7RUFDOUMsU0FBQTtFQUFNLGFBQUE7RUFDTCxZQUFBLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7RUFDcEIsU0FBQTtFQUNGLEtBQUE7RUFDRCxJQUFBLE1BQU0sY0FBYyxHQUEyQjtFQUM3QyxRQUFBLFVBQVUsRUFBRSxXQUFXO1VBQ3ZCLE1BQU07T0FDUCxDQUFDO0VBQ0YsSUFBQSxPQUFPLGNBQWMsQ0FBQztFQUN4QixFQUFFO0VBbUJGLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxHQUFHLEVBQXlDLENBQUM7RUFFbkUsTUFBTSxjQUFjLEdBQUcsQ0FDNUIsUUFBNkIsS0FDVDtNQUNwQixJQUFJLFdBQVcsR0FBRyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7TUFDakQsSUFBSSxXQUFXLEtBQUssU0FBUyxFQUFFO0VBQzdCLFFBQUEsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLFFBQVEsR0FBRyxXQUFXLEdBQUcsZUFBZSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7RUFDM0UsS0FBQTtFQUNELElBQUEsT0FBTyxXQUFXLENBQUM7RUFDckIsQ0FBQyxDQUFDO0VBRUYsTUFBTSxlQUFlLEdBQUcsQ0FBQyxRQUE2QixLQUFzQjtFQUMxRSxJQUFBLE1BQU0sV0FBVyxHQUFxQjtFQUNwQyxRQUFBLENBQUMsRUFBRyxTQUFvQztFQUN4QyxRQUFBLEVBQUUsRUFBRSxRQUFRLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBd0I7RUFDbkQsUUFBQSxLQUFLLEVBQUUsRUFBRTtFQUNULFFBQUEsU0FBUyxFQUFFLEVBQUU7T0FDZCxDQUFDO01BQ0YsTUFBTSxNQUFNLEdBQUcsUUFBUSxDQUFDLGdCQUFnQixDQUN0QyxXQUFXLENBQUMsRUFBRyxDQUFDLE9BQU8sRUFDdkIsVUFBVSxDQUFDLFlBQVksR0FBRyxVQUFVLENBQUMsU0FBUyxHQUFHLFVBQVUsQ0FBQyxZQUFZLENBQ3pFLENBQUM7RUFDRixJQUFBLElBQUksSUFBSSxHQUFnQixNQUFNLENBQUMsV0FBVyxDQUFDO0VBQzNDLElBQUEsSUFBSSxTQUFTLEdBQUcsQ0FBQyxDQUFDLENBQUM7TUFDbkIsTUFBTSxnQkFBZ0IsR0FBRyxFQUFFLENBQUM7TUFFNUIsT0FBTyxDQUFDLElBQUksR0FBRyxNQUFNLENBQUMsUUFBUSxFQUFFLE1BQU0sSUFBSSxFQUFFO0VBQzFDLFFBQUEsSUFBSSxJQUFJLENBQUMsUUFBUSxLQUFLLElBQUksQ0FBQyxZQUFZLEVBQUU7RUFDdkMsWUFBQSxTQUFTLEVBQUUsQ0FBQztjQUNaLE1BQU0sT0FBTyxHQUFHLElBQWUsQ0FBQztFQUNoQyxZQUFBLElBQUksT0FBTyxDQUFDLE9BQU8sS0FBSyxVQUFVLEVBQUU7a0JBQ2xDLE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUM7a0JBQzFDLE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUM7RUFFMUMsZ0JBQUEsSUFBSSxJQUFJLEtBQUssSUFBSSxJQUFJLElBQUksS0FBSyxJQUFJLEVBQUU7RUFDbEMsb0JBQUEsT0FBTyxDQUFDLFVBQVcsQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxFQUFFLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQztFQUN0RSxvQkFBQSxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7RUFDL0Isb0JBQUEsSUFBSSxNQUFtQixDQUFDO3NCQUN4QixJQUFJLElBQUksS0FBSyxJQUFJLEVBQUU7OzBCQUVqQixNQUFNLEdBQUcsQ0FDUCxLQUFhLEVBQ2IsUUFBMEIsRUFDMUIsU0FBb0IsS0FDbEI7RUFDRiw0QkFBQSxNQUFNLE9BQU8sR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7OEJBQy9CLE9BQU8sT0FBTyxHQUNaLE9BQThCLEVBQzlCLEtBQUssRUFDTCxRQUFRLEVBQ1IsU0FBUyxDQUNWLENBQUM7RUFDSix5QkFBQyxDQUFDO0VBQ0gscUJBQUE7RUFBTSx5QkFBQTs7MEJBRUwsSUFBSSxJQUFJLEtBQUssT0FBTyxFQUFFO0VBQ3BCLDRCQUFBLFdBQVcsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FDL0IsS0FBVSxFQUNWLFFBQTBCLEVBQzFCLFNBQW9CLEtBQ2xCOzs7OztFQUtGLGdDQUFBLE1BQU0sYUFBYSxHQUFHLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQztFQUN6QyxnQ0FBQSxNQUFNLGlCQUFpQixHQUFHLGNBQWMsQ0FDdEMsT0FBOEIsQ0FDL0IsQ0FBQztFQUNGLGdDQUFBLFNBQVMsR0FBRztFQUNWLG9DQUFBLEdBQUcsU0FBUztzQ0FDWixHQUFHLGlCQUFpQixDQUFDLFNBQVM7bUNBQy9CLENBQUM7a0NBQ0YsT0FBTyxhQUFhLENBQUMsS0FBSyxFQUFFLFFBQVEsRUFBRSxTQUFTLENBQUMsQ0FBQztFQUNuRCw2QkFBQyxDQUFDO0VBQ0gseUJBQUE7RUFBTSw2QkFBQTs7RUFFTCw0QkFBQSxXQUFXLENBQUMsU0FBUyxDQUFDLElBQUssQ0FBQyxHQUFHLENBQzdCLEtBQVUsRUFDVixRQUEwQixFQUMxQixTQUFvQixLQUNsQjtrQ0FDRixPQUFPLGdCQUFnQixDQUNyQixPQUE4QixFQUM5QixLQUFLLEVBQ0wsUUFBUSxFQUNSLFNBQVMsQ0FDVixDQUFDO0VBQ0osNkJBQUMsQ0FBQztFQUNILHlCQUFBOzs7OzBCQUlELE1BQU0sR0FBRyxDQUNQLEtBQWEsRUFDYixRQUEwQixFQUMxQixTQUFvQixLQUNsQjtFQUNGLDRCQUFBLE1BQU0sUUFBUSxHQUFHLFNBQVMsQ0FBQyxJQUFLLENBQUMsQ0FBQzs4QkFDbEMsT0FBTyxRQUFRLEdBQUcsS0FBSyxFQUFFLFFBQVEsRUFBRSxTQUFTLENBQUMsQ0FBQztFQUNoRCx5QkFBQyxDQUFDO0VBQ0gscUJBQUE7RUFDRCxvQkFBQSxXQUFXLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQztFQUNyQix3QkFBQSxJQUFJLEVBQUUsQ0FBQztFQUNQLHdCQUFBLEtBQUssRUFBRSxTQUFTOzBCQUNoQixNQUFNO0VBQ1AscUJBQUEsQ0FBQyxDQUFDO0VBQ0osaUJBQUE7RUFDRixhQUFBO0VBQU0saUJBQUE7RUFDTCxnQkFBQSxNQUFNLGNBQWMsR0FBRyxPQUFPLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztFQUNuRCxnQkFBQSxLQUFLLE1BQU0sYUFBYSxJQUFJLGNBQWMsRUFBRTtzQkFDMUMsTUFBTSxjQUFjLEdBQUcsT0FBTyxDQUFDLFlBQVksQ0FBQyxhQUFhLENBQUUsQ0FBQzs7O3NCQUc1RCxNQUFNLFVBQVUsR0FBRyxjQUFjLENBQUMsS0FBSyxDQUNyQyw4QkFBOEIsQ0FDL0IsQ0FBQztFQUNGLG9CQUFBLElBQUksVUFBVSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7MEJBQzNCLFNBQVM7RUFDVixxQkFBQTtFQUNELG9CQUFBLE9BQU8sQ0FBQyxlQUFlLENBQUMsYUFBYSxDQUFDLENBQUM7c0JBQ3ZDLElBQUksSUFBSSxHQUFHLGFBQWEsQ0FBQztzQkFDekIsSUFBSSxJQUFJLEdBQUcsYUFBYSxDQUFDO0VBQ3pCLG9CQUFBLE1BQU0sTUFBTSxHQUFHLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQztzQkFDaEMsSUFBSSxNQUFNLEtBQUssR0FBRyxFQUFFOzBCQUNsQixJQUFJLEdBQUcsV0FBVyxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzswQkFDL0MsSUFBSSxHQUFHLFlBQVksQ0FBQztFQUNyQixxQkFBQTsyQkFBTSxJQUFJLE1BQU0sS0FBSyxHQUFHLEVBQUU7RUFDekIsd0JBQUEsSUFBSSxHQUFHLGFBQWEsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7MEJBQ2xDLElBQUksR0FBRyxvQkFBb0IsQ0FBQztFQUM3QixxQkFBQTsyQkFBTSxJQUFJLE1BQU0sS0FBSyxHQUFHLEVBQUU7MEJBQ3pCLElBQUksR0FBRyxXQUFXLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDOzBCQUMvQyxJQUFJLEdBQUcsU0FBUyxDQUFDO0VBQ2xCLHFCQUFBO3NCQUVELE1BQU0sT0FBTyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7c0JBQ2hDLE1BQU0sS0FBSyxHQUFzQixFQUFFLENBQUM7RUFDcEMsb0JBQUEsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRTtFQUM3Qyx3QkFBQSxNQUFNLFFBQVEsR0FBRyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7MEJBQy9CLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxVQUFVLENBQWUsQ0FBQyxDQUFDOzBCQUN0RCxPQUFPLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztFQUNqQyxxQkFBQTtFQUVELG9CQUFBLFdBQVcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDO0VBQ3JCLHdCQUFBLElBQUksRUFBRSxDQUFDO0VBQ1Asd0JBQUEsS0FBSyxFQUFFLFNBQVM7MEJBQ2hCLElBQUk7MEJBQ0osT0FBTzswQkFDUCxJQUFJOzBCQUNKLE1BQU0sRUFBRSxDQUNOLEtBQWEsRUFDYixTQUEyQixFQUMzQixVQUFxQixLQUNuQjtFQUNGLDRCQUFBLE9BQU8sS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksS0FBSyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7MkJBQ2xEO0VBQ0YscUJBQUEsQ0FBQyxDQUFDO0VBQ0osaUJBQUE7RUFDRixhQUFBO0VBQ0YsU0FBQTtFQUFNLGFBQUEsSUFBSSxJQUFJLENBQUMsUUFBUSxLQUFLLElBQUksQ0FBQyxTQUFTLEVBQUU7Y0FDM0MsTUFBTSxRQUFRLEdBQUcsSUFBWSxDQUFDO0VBQzlCLFlBQUEsTUFBTSxJQUFJLEdBQUcsUUFBUSxDQUFDLFdBQVksQ0FBQztjQUNuQyxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLDhCQUE4QixDQUFDLENBQUM7RUFDM0QsWUFBQSxJQUFJLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO0VBQ3RCLGdCQUFBLFFBQVEsQ0FBQyxXQUFXLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7RUFDekQsYUFBQTtFQUFNLGlCQUFBOztrQkFFTCxRQUFRLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO0VBQ25ELGFBQUE7RUFDRCxZQUFBLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUU7RUFDMUMsZ0JBQUEsTUFBTSxRQUFRLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO2tCQUM1QixNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsUUFBUSxFQUFFLFVBQVUsQ0FBZSxDQUFDO0VBQ3ZELGdCQUFBLFdBQVcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDO0VBQ3JCLG9CQUFBLElBQUksRUFBRSxDQUFDO3NCQUNQLEtBQUssRUFBRSxFQUFFLFNBQVM7RUFDbEIsb0JBQUEsTUFBTSxFQUFFLENBQUMsS0FBYyxFQUFFLFNBQTJCLEtBQ2xELElBQUksQ0FBQyxRQUFRLENBQUMsS0FBYyxDQUFDO0VBQ2hDLGlCQUFBLENBQUMsQ0FBQztFQUNILGdCQUFBLE1BQU0sV0FBVyxHQUFHLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO2tCQUNuRSxRQUFRLENBQUMsVUFBVyxDQUFDLFlBQVksQ0FBQyxXQUFXLEVBQUUsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDO0VBQ3JFLGdCQUFBLFFBQVEsQ0FBQyxVQUFXLENBQUMsWUFBWSxDQUMvQixRQUFRLENBQUMsYUFBYSxDQUFDLEVBQUUsQ0FBQyxFQUMxQixRQUFRLENBQUMsV0FBVyxDQUNyQixDQUFDOzs7OztFQUtGLGdCQUFBLE1BQU0sQ0FBQyxXQUFXLEdBQUcsV0FBVyxDQUFDO0VBQ2xDLGFBQUE7RUFDRixTQUFBO0VBQ0YsS0FBQTtFQUNELElBQUEsS0FBSyxNQUFNLENBQUMsSUFBSSxnQkFBZ0IsRUFBRTtVQUNoQyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUM7RUFDWixLQUFBO0VBQ0QsSUFBQSxPQUFPLFdBQVcsQ0FBQztFQUNyQixDQUFDOztFQ2pjRCxTQUFTLE1BQU0sQ0FBQyxRQUFzQyxFQUFBO01BQ2xELElBQUksUUFBUSxZQUFZLG1CQUFtQixFQUFFO0VBQ3pDLFFBQUEsT0FBTyxRQUFRLENBQUM7RUFDbkIsS0FBQTtFQUFNLFNBQUEsSUFBSSxRQUFRLEtBQUssT0FBTyxRQUFRLEVBQUU7VUFDckMsTUFBTSxPQUFPLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxVQUFVLENBQUMsQ0FBQztFQUNuRCxRQUFBLE9BQU8sQ0FBQyxTQUFTLEdBQUcsUUFBUSxDQUFDO0VBQzdCLFFBQUEsT0FBTyxPQUFPLENBQUM7RUFDbEIsS0FBQTtFQUFNLFNBQUE7VUFDSCxNQUFNLElBQUksU0FBUyxDQUFDLENBQUEsMENBQUEsRUFBNkMsT0FBTyxRQUFRLENBQUEsQ0FBQSxDQUFHLENBQUMsQ0FBQztFQUN4RixLQUFBO0VBQ0wsQ0FBQztFQUVELFNBQVMseUJBQXlCLENBQUMsT0FBdUMsRUFBQTtNQUN0RSxNQUFNLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxhQUFhLEVBQUUsR0FBRyxPQUFPLElBQUksRUFBRSxDQUFDO01BQzdELE9BQU8sQ0FBQyxRQUFzQyxLQUFJO0VBQzlDLFFBQUEsT0FBTyxlQUFlLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsYUFBYSxDQUFDLENBQUM7RUFDakYsS0FBQyxDQUFDO0VBQ047Ozs7Ozs7Ozs7Ozs7OyIsInhfZ29vZ2xlX2lnbm9yZUxpc3QiOlswLDEsMiwzLDQsNSw2LDcsOCw5LDEwLDEyLDEzLDE0LDE1LDE2XSwic291cmNlUm9vdCI6ImNkcDovLy9AY2RwL2V4dGVuc2lvbi10ZW1wbGF0ZS1icmlkZ2UvIn0=