/*!
 * @cdp/extension-template-bridge 0.9.20
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uLXRlbXBsYXRlLWJyaWRnZS5qcyIsInNvdXJjZXMiOlsibGl0LXRyYW5zZm9ybWVyL3NyYy9saXQtdHJhbnNmb3JtZXIuanMiLCJsaXQtdHJhbnNmb3JtZXIvc3JjL2hlbHBlci9kYXRhSGVscGVyLmpzIiwibGl0LXRyYW5zZm9ybWVyL3NyYy90cmFuc2Zvcm1lcnMvdmFyaWFibGVUcmFuc2Zvcm1lci5qcyIsImxpdC10cmFuc2Zvcm1lci9zcmMvdHJhbnNmb3JtZXJzL3Vuc2FmZVZhcmlhYmxlLmpzIiwibGl0LXRyYW5zZm9ybWVyL3NyYy9oZWxwZXIvaXNNdXN0YWNoZUZhbHN5LmpzIiwibGl0LXRyYW5zZm9ybWVyL3NyYy9oZWxwZXIvc2VjdGlvbkhlbHBlci5qcyIsImxpdC10cmFuc2Zvcm1lci9zcmMvdHJhbnNmb3JtZXJzL3NlY3Rpb24uanMiLCJsaXQtdHJhbnNmb3JtZXIvc3JjL3RyYW5zZm9ybWVycy9pbnZlcnRlZFNlY3Rpb24uanMiLCJsaXQtdHJhbnNmb3JtZXIvc3JjL3RyYW5zZm9ybWVycy9jb21tZW50LmpzIiwibGl0LXRyYW5zZm9ybWVyL3NyYy90cmFuc2Zvcm1lcnMvY3VzdG9tRGVsaW1pdGVyLmpzIiwibGl0LXRyYW5zZm9ybWVyL3NyYy9saXQtdHJhbnNmb3JtZXItY29uZmlndXJlZE91dE9mVGhlQm94LmpzIiwiYnJpZGdlLW11c3RhY2hlLnRzIiwiamV4cHIvc3JjL2xpYi9jb25zdGFudHMudHMiLCJqZXhwci9zcmMvbGliL3Rva2VuaXplci50cyIsImpleHByL3NyYy9saWIvcGFyc2VyLnRzIiwiamV4cHIvc3JjL2xpYi9ldmFsLnRzIiwic3RhbXBpbm8vc3JjL3N0YW1waW5vLnRzIiwiYnJpZGdlLXN0YW1waW5vLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qKiBcclxuICogQHBhcmFtIHtvYmplY3R9IGNvbmZpZyA9IHtcclxuICogIGh0bWw6IGxpdC1odG1sLmh0bWwsXHJcbiAqICBkZWxpbWl0ZXI6IHsgc3RhcnQ6ICd7eycsIGVuZDogJ319JyB9LFxyXG4gKiAgdHJhbnNmb3JtZXJzOiB7IC8vIG5vdGUgdGhhdCB0cmFuc2Zvcm1WYXJpYWJsZSBpcyBub3QgaGVyZS4gSXQgZ2V0cyBhcHBsaWVkIHdoZW4gbm8gdHJhbnNmb3JtZXIudGVzdCBoYXMgcGFzc2VkXHJcbiAqICAgIG5hbWU6IHtcclxuICogICAgICB0ZXN0OiAoc3RyLCBjb25maWcpID0+IGJvb2wsXHJcbiAqICAgICAgdHJhbnNmb3JtOiAoc3RyLCBjb25maWcpID0+ICh7XHJcbiAqICAgICAgICByZW1haW5pbmdUbXBsU3RyOiBzdHIsXHJcbiAqICAgICAgICBpbnNlcnRpb25Qb2ludDogY3R4ID0+IGxpdC1odG1sLlRlbXBsYXRlUmVzdWx0IHwgdW5kZWZpbmVkLCAvLyBpZiB1bmRlZmluZWQgcmVtYWluaW5nVG1wbFN0ciB3aWxsIGJlIG1lcmdlZCB3aXRoIGxhc3Qgc3RhdGljIHBhcnQgXHJcbiAqICAgICAgfSksXHJcbiAqICAgIH0sXHJcbiAqICB9LFxyXG4gKiAgdHJhbnNmb3JtVmFyaWFibGUsIFxyXG4gKiB9XHJcbiAqIEByZXR1cm5zIHtmdW5jdGlvbn0gc3RyVGVtcGxhdGUgPT4gY3R4ID0+IGxpdC1odG1sLlRlbXBsYXRlUmVzdWx0XHJcbiAqL1xyXG5leHBvcnQgZGVmYXVsdCBjb25maWcgPT4gc3RyVGVtcGxhdGUgPT4gdHJhbnNmb3JtKHN0clRlbXBsYXRlLCBjb25maWcpXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gdHJhbnNmb3JtKHRtcGwyUGFyc2UsIGNvbmZpZykge1xyXG4gIGNvbnN0IHN0YXRpY1BhcnRzID0gW11cclxuICBjb25zdCBpbnNlcnRpb25Qb2ludHMgPSBbXVxyXG5cclxuICBsZXQgcmVtYWluaW5nVG1wbFN0ciA9IHRtcGwyUGFyc2VcclxuICBsZXQgc3RhcnRJbmRleE9mSVAgPSByZW1haW5pbmdUbXBsU3RyLmluZGV4T2YoY29uZmlnLmRlbGltaXRlci5zdGFydClcclxuICB3aGlsZSAoc3RhcnRJbmRleE9mSVAgPj0gMCkge1xyXG4gICAgaWYgKHJlbWFpbmluZ1RtcGxTdHIuaW5kZXhPZihjb25maWcuZGVsaW1pdGVyLmVuZCwgc3RhcnRJbmRleE9mSVApIDwgMClcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBtaXNzaW5nIGVuZCBkZWxpbWl0ZXIgYXQ6ICcke3JlbWFpbmluZ1RtcGxTdHJ9J2ApXHJcblxyXG4gICAgc3RhdGljUGFydHMucHVzaChyZW1haW5pbmdUbXBsU3RyLnN1YnN0cmluZygwLCBzdGFydEluZGV4T2ZJUCkpXHJcblxyXG4gICAgY29uc3QgaVBUcmFuc2Zvcm1SZXN1bHQgPSB0cmFuc2Zvcm1JUChcclxuICAgICAgcmVtYWluaW5nVG1wbFN0ci5zdWJzdHJpbmcoc3RhcnRJbmRleE9mSVAgKyBjb25maWcuZGVsaW1pdGVyLnN0YXJ0Lmxlbmd0aCksXHJcbiAgICAgIGNvbmZpZ1xyXG4gICAgKVxyXG5cclxuICAgIGlmIChpUFRyYW5zZm9ybVJlc3VsdC5pbnNlcnRpb25Qb2ludCkge1xyXG4gICAgICByZW1haW5pbmdUbXBsU3RyID0gaVBUcmFuc2Zvcm1SZXN1bHQucmVtYWluaW5nVG1wbFN0clxyXG4gICAgICBpbnNlcnRpb25Qb2ludHMucHVzaChpUFRyYW5zZm9ybVJlc3VsdC5pbnNlcnRpb25Qb2ludClcclxuICAgICAgc3RhcnRJbmRleE9mSVAgPSByZW1haW5pbmdUbXBsU3RyLmluZGV4T2YoY29uZmlnLmRlbGltaXRlci5zdGFydClcclxuICAgIH0gZWxzZSB7IC8vIGUuZy4gY29tbWVudCBvciBjdXN0b21EZWxpbWV0ZXJcclxuICAgICAgY29uc3QgbGFzdFN0YXRpY1BhcnQgPSBzdGF0aWNQYXJ0cy5wb3AoKVxyXG4gICAgICByZW1haW5pbmdUbXBsU3RyID0gbGFzdFN0YXRpY1BhcnQgKyBpUFRyYW5zZm9ybVJlc3VsdC5yZW1haW5pbmdUbXBsU3RyXHJcbiAgICAgIHN0YXJ0SW5kZXhPZklQID0gcmVtYWluaW5nVG1wbFN0ci5pbmRleE9mKGNvbmZpZy5kZWxpbWl0ZXIuc3RhcnQsIGxhc3RTdGF0aWNQYXJ0Lmxlbmd0aClcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHN0YXRpY1BhcnRzLnB1c2gocmVtYWluaW5nVG1wbFN0cilcclxuXHJcbiAgcmV0dXJuIGN0eCA9PlxyXG4gICAgY29uZmlnLmh0bWwoc3RhdGljUGFydHMsIC4uLmluc2VydGlvblBvaW50cy5tYXAoaVAgPT4gaVAoY3R4KSkpXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHRyYW5zZm9ybUlQKHJlbWFpbmluZ1RtcGxTdHIsIGNvbmZpZykge1xyXG4gIGNvbnN0IHRyYW5zZm9ybWVyID0gT2JqZWN0LnZhbHVlcyhjb25maWcudHJhbnNmb3JtZXJzKS5maW5kKHQgPT4gdC50ZXN0KHJlbWFpbmluZ1RtcGxTdHIsIGNvbmZpZykpXHJcbiAgY29uc3QgdHJhbnNmb3JtRnVuY3Rpb24gPSB0cmFuc2Zvcm1lclxyXG4gICAgPyB0cmFuc2Zvcm1lci50cmFuc2Zvcm1cclxuICAgIDogY29uZmlnLnRyYW5zZm9ybVZhcmlhYmxlXHJcbiAgcmV0dXJuIHRyYW5zZm9ybUZ1bmN0aW9uKHJlbWFpbmluZ1RtcGxTdHIsIGNvbmZpZylcclxufSIsImV4cG9ydCBmdW5jdGlvbiBjdHgyVmFsdWUoY3R4LCBrZXkpIHtcclxuICBpZiAoa2V5ID09PSAnLicpXHJcbiAgICByZXR1cm4gY3R4XHJcblxyXG4gIGxldCByZXN1bHQgPSBjdHhcclxuICBmb3IgKGxldCBrIG9mIGtleS5zcGxpdCgnLicpKSB7XHJcbiAgICBpZiAoIXJlc3VsdC5oYXNPd25Qcm9wZXJ0eShrKSlcclxuICAgICAgcmV0dXJuICcnXHJcblxyXG4gICAgcmVzdWx0ID0gcmVzdWx0W2tdXHJcbiAgfVxyXG5cclxuICByZXR1cm4gcmVzdWx0XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBjdHgyTXVzdGFjaGVTdHJpbmcoY3R4LCBrZXkpIHtcclxuICByZXR1cm4gbXVzdGFjaGVTdHJpbmd5ZnkoY3R4MlZhbHVlKGN0eCwga2V5KSlcclxufVxyXG5cclxuZnVuY3Rpb24gbXVzdGFjaGVTdHJpbmd5ZnkodmFsdWUpIHtcclxuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gbnVsbClcclxuICAgIHJldHVybiAnJ1xyXG5cclxuICByZXR1cm4gJycgKyB2YWx1ZVxyXG59IiwiaW1wb3J0IHsgY3R4Mk11c3RhY2hlU3RyaW5nIH0gZnJvbSAnLi4vaGVscGVyL2RhdGFIZWxwZXIuanMnXHJcblxyXG5leHBvcnQgZGVmYXVsdCAocmVtYWluaW5nVG1wbFN0ciwgeyBkZWxpbWl0ZXIgfSkgPT4ge1xyXG4gIGNvbnN0IGluZGV4T2ZFbmREZWxpbWl0ZXIgPSByZW1haW5pbmdUbXBsU3RyLmluZGV4T2YoZGVsaW1pdGVyLmVuZClcclxuICBjb25zdCBkYXRhS2V5ID0gcmVtYWluaW5nVG1wbFN0ci5zdWJzdHJpbmcoMCwgaW5kZXhPZkVuZERlbGltaXRlcilcclxuICByZXR1cm4ge1xyXG4gICAgcmVtYWluaW5nVG1wbFN0cjogcmVtYWluaW5nVG1wbFN0ci5zdWJzdHJpbmcoaW5kZXhPZkVuZERlbGltaXRlciArIGRlbGltaXRlci5lbmQubGVuZ3RoKSxcclxuICAgIGluc2VydGlvblBvaW50OiBjdHggPT4gY3R4Mk11c3RhY2hlU3RyaW5nKGN0eCwgZGF0YUtleSlcclxuICB9XHJcbn0iLCJpbXBvcnQgeyBjdHgyTXVzdGFjaGVTdHJpbmcgfSBmcm9tICcuLi9oZWxwZXIvZGF0YUhlbHBlci5qcydcclxuXHJcbi8qKiBOb3RlLCB0aGlzIGlzIHVuc2FmZSB0byB1c2UsIGJlY2F1c2UgdGhlIHJlbmRlcmVkIG91dHB1dCBjb3VsZCBiZSBhbnkgSmF2YVNjcmlwdCEgKi9cclxuZXhwb3J0IGRlZmF1bHQgdW5zYWZlSFRNTCA9PiAoe1xyXG4gIHRlc3Q6IHJlbWFpbmluZ1RtcGxTdHIgPT4gcmVtYWluaW5nVG1wbFN0clswXSA9PT0gJ3snLFxyXG4gIHRyYW5zZm9ybTogKHJlbWFpbmluZ1RtcGxTdHIsIHsgZGVsaW1pdGVyIH0pID0+IHtcclxuICAgIGNvbnN0IGluZGV4T2ZFbmREZWxpbWl0ZXIgPSByZW1haW5pbmdUbXBsU3RyLmluZGV4T2YoJ30nICsgZGVsaW1pdGVyLmVuZClcclxuICAgIGlmIChpbmRleE9mRW5kRGVsaW1pdGVyIDwgMClcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBtaXNzaW5nIGVuZCBkZWxpbWl0ZXIgYXQ6ICcke2RlbGltaXRlci5zdGFydH0ke3JlbWFpbmluZ1RtcGxTdHJ9J2ApXHJcbiAgXHJcbiAgICBjb25zdCBkYXRhS2V5ID0gcmVtYWluaW5nVG1wbFN0ci5zdWJzdHJpbmcoMSwgaW5kZXhPZkVuZERlbGltaXRlcilcclxuICAgIHJldHVybiB7XHJcbiAgICAgIHJlbWFpbmluZ1RtcGxTdHI6IHJlbWFpbmluZ1RtcGxTdHIuc3Vic3RyaW5nKGluZGV4T2ZFbmREZWxpbWl0ZXIgKyAxICsgZGVsaW1pdGVyLmVuZC5sZW5ndGgpLFxyXG4gICAgICBpbnNlcnRpb25Qb2ludDogY3R4ID0+IHVuc2FmZUhUTUwoY3R4Mk11c3RhY2hlU3RyaW5nKGN0eCwgZGF0YUtleSkpLFxyXG4gICAgfVxyXG4gIH1cclxufSkiLCJleHBvcnQgZnVuY3Rpb24gaXNNdXN0YWNoZUZhbHN5KHZhbHVlKSB7XHJcbiAgcmV0dXJuIFtudWxsLCB1bmRlZmluZWQsIGZhbHNlLCAwLCBOYU4sICcnXVxyXG4gICAgLnNvbWUoZmFsc3kgPT4gZmFsc3kgPT09IHZhbHVlKVxyXG4gICAgfHwgKHZhbHVlLmxlbmd0aCAmJiB2YWx1ZS5sZW5ndGggPT09IDApXHJcbn0iLCJleHBvcnQgZnVuY3Rpb24gcGFyc2VTZWN0aW9uKHRtcGxTdHIsIGRlbGltaXRlcikge1xyXG4gIGNvbnN0IGluZGV4T2ZTdGFydFRhZ0VuZCA9IHRtcGxTdHIuaW5kZXhPZihkZWxpbWl0ZXIuZW5kKVxyXG4gIGNvbnN0IGRhdGFLZXkgPSB0bXBsU3RyLnN1YnN0cmluZygxLCBpbmRleE9mU3RhcnRUYWdFbmQpXHJcbiAgY29uc3QgZW5kVGFnID0gYCR7ZGVsaW1pdGVyLnN0YXJ0fS8ke2RhdGFLZXl9JHtkZWxpbWl0ZXIuZW5kfWBcclxuICBjb25zdCBpbmRleE9mRW5kVGFnU3RhcnQgPSB0bXBsU3RyLmluZGV4T2YoZW5kVGFnKVxyXG4gIGlmIChpbmRleE9mRW5kVGFnU3RhcnQgPCAwKVxyXG4gICAgdGhyb3cgbmV3IEVycm9yKGBtaXNzaW5nIGVuZCBkZWxpbWl0ZXIgYXQ6ICcke2RlbGltaXRlci5zdGFydH0ke3RtcGxTdHJ9J2ApXHJcbiAgXHJcbiAgcmV0dXJuIHtcclxuICAgIGRhdGFLZXksXHJcbiAgICBpbm5lclRtcGw6IHRtcGxTdHIuc3Vic3RyaW5nKGluZGV4T2ZTdGFydFRhZ0VuZCArIGRlbGltaXRlci5zdGFydC5sZW5ndGgsIGluZGV4T2ZFbmRUYWdTdGFydCksXHJcbiAgICByZW1haW5pbmdUbXBsU3RyOiB0bXBsU3RyLnN1YnN0cmluZyhpbmRleE9mRW5kVGFnU3RhcnQgKyBlbmRUYWcubGVuZ3RoKSxcclxuICB9XHJcbn0iLCJpbXBvcnQgeyB0cmFuc2Zvcm0gfSBmcm9tICcuLi9saXQtdHJhbnNmb3JtZXIuanMnXHJcbmltcG9ydCB7IGN0eDJWYWx1ZSB9IGZyb20gJy4uL2hlbHBlci9kYXRhSGVscGVyLmpzJ1xyXG5pbXBvcnQgeyBpc011c3RhY2hlRmFsc3kgfSBmcm9tICcuLi9oZWxwZXIvaXNNdXN0YWNoZUZhbHN5LmpzJ1xyXG5pbXBvcnQgeyBwYXJzZVNlY3Rpb24gfSBmcm9tICcuLi9oZWxwZXIvc2VjdGlvbkhlbHBlci5qcydcclxuXHJcbi8qKiBOb3RlLCB1bmxpa2Ugd2l0aGluIG11c3RhY2hlIGZ1bmN0aW9ucyBhcyBkYXRhIHZhbHVlcyBhcmUgbm90IHN1cHBvcnRlZCBvdXQgb2YgdGhlIGJveCAqL1xyXG5leHBvcnQgZGVmYXVsdCAoKSA9PiAoe1xyXG4gIHRlc3Q6IHJlbWFpbmluZ1RtcGxTdHIgPT4gcmVtYWluaW5nVG1wbFN0clswXSA9PT0gJyMnLFxyXG4gIHRyYW5zZm9ybTogKHJlbWFpbmluZ1RtcGxTdHIsIGNvbmZpZykgPT4ge1xyXG4gICAgY29uc3QgcGFyc2VkU2VjdGlvbiA9IHBhcnNlU2VjdGlvbihyZW1haW5pbmdUbXBsU3RyLCBjb25maWcuZGVsaW1pdGVyKVxyXG4gICAgY29uc3QgdHJhbnNmb3JtZWRJbm5lclRtcGwgPSB0cmFuc2Zvcm0ocGFyc2VkU2VjdGlvbi5pbm5lclRtcGwsIGNvbmZpZylcclxuICAgIFxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgcmVtYWluaW5nVG1wbFN0cjogcGFyc2VkU2VjdGlvbi5yZW1haW5pbmdUbXBsU3RyLFxyXG4gICAgICBpbnNlcnRpb25Qb2ludDogY3R4ID0+IHtcclxuICAgICAgICBjb25zdCBzZWN0aW9uRGF0YSA9IGN0eDJWYWx1ZShjdHgsIHBhcnNlZFNlY3Rpb24uZGF0YUtleSlcclxuICAgICAgICBcclxuICAgICAgICBpZiAoaXNNdXN0YWNoZUZhbHN5KHNlY3Rpb25EYXRhKSlcclxuICAgICAgICAgIHJldHVybiAnJztcclxuXHJcbiAgICAgICAgcmV0dXJuIHNlY3Rpb25EYXRhLm1hcFxyXG4gICAgICAgICAgPyBzZWN0aW9uRGF0YS5tYXAoaW5uZXJDdHggPT4gdHJhbnNmb3JtZWRJbm5lclRtcGwoaW5uZXJDdHgpKVxyXG4gICAgICAgICAgOiB0cmFuc2Zvcm1lZElubmVyVG1wbChjdHgpXHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcbn0pIiwiaW1wb3J0IHsgdHJhbnNmb3JtIH0gZnJvbSAnLi4vbGl0LXRyYW5zZm9ybWVyLmpzJ1xuaW1wb3J0IHsgY3R4MlZhbHVlIH0gZnJvbSAnLi4vaGVscGVyL2RhdGFIZWxwZXIuanMnXG5pbXBvcnQgeyBpc011c3RhY2hlRmFsc3kgfSBmcm9tICcuLi9oZWxwZXIvaXNNdXN0YWNoZUZhbHN5LmpzJ1xuaW1wb3J0IHsgcGFyc2VTZWN0aW9uIH0gZnJvbSAnLi4vaGVscGVyL3NlY3Rpb25IZWxwZXIuanMnXG5cbmV4cG9ydCBkZWZhdWx0ICgpID0+ICh7XG4gIHRlc3Q6IHJlbWFpbmluZ1RtcGxTdHIgPT4gcmVtYWluaW5nVG1wbFN0clswXSA9PT0gJ14nLFxuICAvKlxuICAgKiBwYXRjaCBmb3Igdi4xLjAuMlxuICAgKiBhcHBseSB0cmFuc2Zvcm1lZElubmVyVG1wbCgpXG4gICAqL1xuICB0cmFuc2Zvcm06IChyZW1haW5pbmdUbXBsU3RyLCBjb25maWcpID0+IHtcbiAgICBjb25zdCBwYXJzZWRTZWN0aW9uID0gcGFyc2VTZWN0aW9uKHJlbWFpbmluZ1RtcGxTdHIsIGNvbmZpZy5kZWxpbWl0ZXIpXG4gICAgY29uc3QgdHJhbnNmb3JtZWRJbm5lclRtcGwgPSB0cmFuc2Zvcm0ocGFyc2VkU2VjdGlvbi5pbm5lclRtcGwsIGNvbmZpZylcbiAgICBcbiAgICByZXR1cm4ge1xuICAgICAgcmVtYWluaW5nVG1wbFN0cjogcGFyc2VkU2VjdGlvbi5yZW1haW5pbmdUbXBsU3RyLFxuICAgICAgaW5zZXJ0aW9uUG9pbnQ6IGN0eCA9PiB7XG4gICAgICAgIGNvbnN0IHNlY3Rpb25EYXRhID0gY3R4MlZhbHVlKGN0eCwgcGFyc2VkU2VjdGlvbi5kYXRhS2V5KVxuICAgICAgICBcbiAgICAgICAgaWYgKGlzTXVzdGFjaGVGYWxzeShzZWN0aW9uRGF0YSkpXG4gICAgICAgICAgcmV0dXJuIHNlY3Rpb25EYXRhLm1hcFxuICAgICAgICAgICAgPyBzZWN0aW9uRGF0YS5tYXAoaW5uZXJDdHggPT4gdHJhbnNmb3JtZWRJbm5lclRtcGwoaW5uZXJDdHgpKVxuICAgICAgICAgICAgOiB0cmFuc2Zvcm1lZElubmVyVG1wbChjdHgpXG4gICAgICAgIHJldHVybiAnJztcbiAgICAgIH1cbiAgICB9XG4gIH1cbn0pXG4iLCJleHBvcnQgZGVmYXVsdCAoKSA9PiAoe1xyXG4gIHRlc3Q6IHJlbWFpbmluZ1RtcGxTdHIgPT4gcmVtYWluaW5nVG1wbFN0clswXSA9PT0gJyEnLFxyXG4gIHRyYW5zZm9ybTogKHJlbWFpbmluZ1RtcGxTdHIsIHsgZGVsaW1pdGVyIH0pID0+ICh7XHJcbiAgICByZW1haW5pbmdUbXBsU3RyOiByZW1haW5pbmdUbXBsU3RyLnN1YnN0cmluZyhyZW1haW5pbmdUbXBsU3RyLmluZGV4T2YoZGVsaW1pdGVyLmVuZCkgKyBkZWxpbWl0ZXIuZW5kLmxlbmd0aCksXHJcbiAgICBpbnNlcnRpb25Qb2ludDogdW5kZWZpbmVkLFxyXG4gIH0pXHJcbn0pIiwiZXhwb3J0IGRlZmF1bHQgKCkgPT4gKHtcclxuICB0ZXN0OiByZW1haW5pbmdUbXBsU3RyID0+IHJlbWFpbmluZ1RtcGxTdHJbMF0gPT09ICc9JyxcclxuICB0cmFuc2Zvcm06IChyZW1haW5pbmdUbXBsU3RyLCBjb25maWcpID0+IHtcclxuICAgIGNvbnN0IG9yaWdpbmFsRW5kRGVsaUxlbmd0aCA9IGNvbmZpZy5kZWxpbWl0ZXIuZW5kLmxlbmd0aFxyXG4gICAgY29uc3QgaW5kZXhPZkVuZFRhZyA9IHJlbWFpbmluZ1RtcGxTdHIuaW5kZXhPZignPScgKyBjb25maWcuZGVsaW1pdGVyLmVuZClcclxuICAgIGlmIChpbmRleE9mRW5kVGFnIDwgMCApXHJcbiAgICAgIHRocm93IG5ldyBFcnJvcihgbWlzc2luZyBlbmQgZGVsaW1pdGVyIGF0OiAnJHtyZW1haW5pbmdUbXBsU3RyfSdgKVxyXG5cclxuICAgIGNvbnN0IFsgbmV3U3RhcnREZWxpLCBuZXdFbmREZWxpIF0gPSByZW1haW5pbmdUbXBsU3RyLnN1YnN0cmluZygxLCBpbmRleE9mRW5kVGFnKS5zcGxpdCgnICcpXHJcblxyXG4gICAgY29uZmlnLmRlbGltaXRlci5zdGFydCA9IG5ld1N0YXJ0RGVsaVxyXG4gICAgY29uZmlnLmRlbGltaXRlci5lbmQgPSBuZXdFbmREZWxpXHJcbiAgICBcclxuICAgIHJldHVybiB7XHJcbiAgICAgIHJlbWFpbmluZ1RtcGxTdHI6IHJlbWFpbmluZ1RtcGxTdHIuc3Vic3RyaW5nKGluZGV4T2ZFbmRUYWcgKyAxICsgb3JpZ2luYWxFbmREZWxpTGVuZ3RoKSxcclxuICAgICAgaW5zZXJ0aW9uUG9pbnQ6IHVuZGVmaW5lZCwgIFxyXG4gICAgfVxyXG4gIH1cclxufSkiLCJpbXBvcnQgY3JlYXRlVHJhbnNmb3JtIGZyb20gJy4vbGl0LXRyYW5zZm9ybWVyLmpzJ1xyXG5pbXBvcnQgdHJhbnNmb3JtVmFyaWFibGUgZnJvbSAnLi90cmFuc2Zvcm1lcnMvdmFyaWFibGVUcmFuc2Zvcm1lci5qcydcclxuaW1wb3J0IHVuc2FmZVZhcmlhYmxlVHJhbnNmb3JtZXIgZnJvbSAnLi90cmFuc2Zvcm1lcnMvdW5zYWZlVmFyaWFibGUuanMnXHJcbmltcG9ydCBzZWN0aW9uVHJhbnNmb3JtZXIgZnJvbSAnLi90cmFuc2Zvcm1lcnMvc2VjdGlvbi5qcydcclxuaW1wb3J0IGludmVydGVkU2VjdGlvblRyYW5zZm9ybWVyIGZyb20gJy4vdHJhbnNmb3JtZXJzL2ludmVydGVkU2VjdGlvbi5qcydcclxuaW1wb3J0IGNvbW1lbnRUcmFuc2Zvcm1lciBmcm9tICcuL3RyYW5zZm9ybWVycy9jb21tZW50LmpzJ1xyXG5pbXBvcnQgY3VzdG9tRGVsaW1pdGVyVHJhbnNmb3JtZXIgZnJvbSAnLi90cmFuc2Zvcm1lcnMvY3VzdG9tRGVsaW1pdGVyLmpzJ1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgKGh0bWwsIHVuc2FmZUhUTUwpID0+XHJcbiAgY3JlYXRlVHJhbnNmb3JtKHtcclxuICAgIGh0bWwsXHJcbiAgICBkZWxpbWl0ZXI6IHsgc3RhcnQ6ICd7eycsIGVuZDogJ319JyB9LFxyXG4gICAgdHJhbnNmb3JtVmFyaWFibGUsXHJcbiAgICB0cmFuc2Zvcm1lcnM6IHtcclxuICAgICAgdW5zYWZlVmFyaWFibGU6IHVuc2FmZVZhcmlhYmxlVHJhbnNmb3JtZXIodW5zYWZlSFRNTCksXHJcbiAgICAgIHNlY3Rpb246IHNlY3Rpb25UcmFuc2Zvcm1lcigpLFxyXG4gICAgICBpbnZlcnRlZFNlY3Rpb246IGludmVydGVkU2VjdGlvblRyYW5zZm9ybWVyKCksXHJcbiAgICAgIGNvbW1lbnQ6IGNvbW1lbnRUcmFuc2Zvcm1lcigpLFxyXG4gICAgICBjdXN0b21EZWxpbWl0ZXJUcmFuc2Zvcm1lcjogY3VzdG9tRGVsaW1pdGVyVHJhbnNmb3JtZXIoKSxcclxuICAgIH0sXHJcbiAgfSkiLCJpbXBvcnQgeyB0b1RlbXBsYXRlU3RyaW5nc0FycmF5IH0gZnJvbSAnQGNkcC9leHRlbnNpb24tdGVtcGxhdGUnO1xuaW1wb3J0IHR5cGUgeyBUZW1wbGF0ZUJyaWRnZUVuZGluZSwgVGVtcGxhdGVUcmFuc2Zvcm1lciB9IGZyb20gJ0BicmlkZ2UvaW50ZXJmYWNlcyc7XG5pbXBvcnQgdHlwZSB7XG4gICAgTXVzdGFjaGVUcmFuc2Zvcm1lcixcbiAgICBUZW1wbGF0ZVRhZyxcbiAgICBUcmFuc2Zvcm1EaXJlY3RpdmUsXG4gICAgVHJhbnNmb3JtVGVzdGVyLFxuICAgIFRyYW5zZm9ybUV4ZWN1dG9yLFxuICAgIFRyYW5zZm9ybWVDb250ZXh0LFxuICAgIFRyYW5zZm9ybUNvbmZpZyxcbn0gZnJvbSAnbGl0LXRyYW5zZm9ybWVyL3NyYy9pbnRlcmZhY2VzJztcblxuaW1wb3J0IGNyZWF0ZURlZmF1bHQgZnJvbSAnbGl0LXRyYW5zZm9ybWVyJztcbmltcG9ydCBjcmVhdGVDdXN0b20gZnJvbSAnbGl0LXRyYW5zZm9ybWVyL3NyYy9saXQtdHJhbnNmb3JtZXInO1xuXG5pbXBvcnQgdmFyaWFibGUgZnJvbSAnbGl0LXRyYW5zZm9ybWVyL3NyYy90cmFuc2Zvcm1lcnMvdmFyaWFibGVUcmFuc2Zvcm1lcic7XG5pbXBvcnQgdW5zYWZlVmFyaWFibGUgZnJvbSAnbGl0LXRyYW5zZm9ybWVyL3NyYy90cmFuc2Zvcm1lcnMvdW5zYWZlVmFyaWFibGUnO1xuaW1wb3J0IHNlY3Rpb24gZnJvbSAnbGl0LXRyYW5zZm9ybWVyL3NyYy90cmFuc2Zvcm1lcnMvc2VjdGlvbic7XG5pbXBvcnQgaW52ZXJ0ZWRTZWN0aW9uIGZyb20gJ2xpdC10cmFuc2Zvcm1lci9zcmMvdHJhbnNmb3JtZXJzL2ludmVydGVkU2VjdGlvbic7XG5pbXBvcnQgY29tbWVudCBmcm9tICdsaXQtdHJhbnNmb3JtZXIvc3JjL3RyYW5zZm9ybWVycy9jb21tZW50JztcbmltcG9ydCBjdXN0b21EZWxpbWl0ZXIgZnJvbSAnbGl0LXRyYW5zZm9ybWVyL3NyYy90cmFuc2Zvcm1lcnMvY3VzdG9tRGVsaW1pdGVyJztcblxuLyoqIEBpbnRlcm5hbCAqL1xudHlwZSBNdXN0YWNoZVRyYW5zZm9ybWVyQ29udGV4dCA9IE11c3RhY2hlVHJhbnNmb3JtZXIgJiB7IGRlbGltaXRlcjogeyBzdGFydDogc3RyaW5nOyBlbmQ6IHN0cmluZzsgfTsgfTtcblxuY29uc3QgeGZvcm0gPSAobXVzdGFjaGU6IE11c3RhY2hlVHJhbnNmb3JtZXJDb250ZXh0KTogVGVtcGxhdGVUcmFuc2Zvcm1lciA9PiB7XG4gICAgcmV0dXJuICh0ZW1wbGF0ZTogSFRNTFRlbXBsYXRlRWxlbWVudCB8IHN0cmluZyk6IFRlbXBsYXRlQnJpZGdlRW5kaW5lID0+IHtcbiAgICAgICAgY29uc3QgeyBzdGFydCwgZW5kIH0gPSBtdXN0YWNoZS5kZWxpbWl0ZXI7XG5cbiAgICAgICAgLy8g44Kz44Oh44Oz44OI44OW44Ot44OD44Kv5YaF44GuIGRlbGltaXRlciDmir3lh7pcbiAgICAgICAgY29uc3QgcmVnQ29tbWVudFJlbW92ZVN0YXJ0ID0gbmV3IFJlZ0V4cChgPCEtLVxcXFxzKiR7c3RhcnR9YCwgJ2cnKTtcbiAgICAgICAgY29uc3QgcmVnQ29tbWVudFJlbW92ZUVuZCAgID0gbmV3IFJlZ0V4cChgJHtlbmR9XFxcXHMqLS0+YCwgJ2cnKTtcbiAgICAgICAgLy8gZGVsaW1pdGVyIOWJjeW+jOOBriB0cmltIOeUqOato+imj+ihqOePvlxuICAgICAgICBjb25zdCByZWdUcmltID0gbmV3IFJlZ0V4cChgKCR7c3RhcnR9WyNeL10/KVxcXFxzKihbXFxcXHdcXFxcLl0rKVxcXFxzKigke2VuZH0pYCwgJ2cnKTtcblxuICAgICAgICBjb25zdCBib2R5ID0gKHRlbXBsYXRlIGluc3RhbmNlb2YgSFRNTFRlbXBsYXRlRWxlbWVudCA/IHRlbXBsYXRlLmlubmVySFRNTCA6IHRlbXBsYXRlKVxuICAgICAgICAgICAgLnJlcGxhY2UocmVnQ29tbWVudFJlbW92ZVN0YXJ0LCBzdGFydClcbiAgICAgICAgICAgIC5yZXBsYWNlKHJlZ0NvbW1lbnRSZW1vdmVFbmQsIGVuZClcbiAgICAgICAgICAgIC5yZXBsYWNlKHJlZ1RyaW0sICckMSQyJDMnKVxuICAgICAgICA7XG5cbiAgICAgICAgcmV0dXJuIG11c3RhY2hlKGJvZHkpO1xuICAgIH07XG59O1xuXG4vKlxuICogbGl0LWh0bWwgdjIuMS4wK1xuICogVGVtcGxhdGVTdHJpbmdzQXJyYXkg44KS5Y6z5a+G44Gr44OB44Kn44OD44Kv44GZ44KL44KI44GG44Gr44Gq44Gj44Gf44Gf44KBIHBhdGNoIOOCkuOBguOBpuOCi1xuICogaHR0cHM6Ly9naXRodWIuY29tL2xpdC9saXQvcHVsbC8yMzA3XG4gKlxuICog5bCG5p2lIGBBcnJheS5pc1RlbXBsYXRlT2JqZWN0KClgIOOCkuS9v+eUqOOBleOCjOOCi+WgtOWQiCwg5pys5a++5b+c44KC6KaL55u044GZ5b+F6KaB44GC44KKXG4gKiBodHRwczovL3RjMzkuZXMvcHJvcG9zYWwtYXJyYXktaXMtdGVtcGxhdGUtb2JqZWN0L1xuICovXG5jb25zdCBwYXRjaCA9IChodG1sOiBUZW1wbGF0ZVRhZyk6IFRlbXBsYXRlVGFnID0+IHtcbiAgICByZXR1cm4gKHRlbXBsYXRlOiBUZW1wbGF0ZVN0cmluZ3NBcnJheSwgLi4udmFsdWVzOiB1bmtub3duW10pID0+IHtcbiAgICAgICAgcmV0dXJuIGh0bWwodG9UZW1wbGF0ZVN0cmluZ3NBcnJheSh0ZW1wbGF0ZSksIC4uLnZhbHVlcyk7XG4gICAgfTtcbn07XG5cbmZ1bmN0aW9uIGNyZWF0ZU11c3RhY2hlVHJhbnNmb3JtZXIoaHRtbDogVGVtcGxhdGVUYWcsIHVuc2FmZUhUTUw6IFRyYW5zZm9ybURpcmVjdGl2ZSk6IFRlbXBsYXRlVHJhbnNmb3JtZXI7XG5mdW5jdGlvbiBjcmVhdGVNdXN0YWNoZVRyYW5zZm9ybWVyKGNvbmZpZzogVHJhbnNmb3JtQ29uZmlnKTogVGVtcGxhdGVUcmFuc2Zvcm1lcjtcbmZ1bmN0aW9uIGNyZWF0ZU11c3RhY2hlVHJhbnNmb3JtZXIoYXJnMTogdW5rbm93biwgYXJnMj86IHVua25vd24pOiBUZW1wbGF0ZVRyYW5zZm9ybWVyIHtcbiAgICBjb25zdCBkZWxpbWl0ZXIgPSB7IHN0YXJ0OiAne3snLCBlbmQ6ICd9fScgfTtcbiAgICBsZXQgdHJhbnNmb3JtZXI6IE11c3RhY2hlVHJhbnNmb3JtZXJDb250ZXh0O1xuICAgIGlmICgnZnVuY3Rpb24nID09PSB0eXBlb2YgYXJnMSkge1xuICAgICAgICB0cmFuc2Zvcm1lciA9IGNyZWF0ZURlZmF1bHQocGF0Y2goYXJnMSBhcyBUZW1wbGF0ZVRhZyksIGFyZzIgYXMgVHJhbnNmb3JtRGlyZWN0aXZlKSBhcyBNdXN0YWNoZVRyYW5zZm9ybWVyQ29udGV4dDtcbiAgICAgICAgdHJhbnNmb3JtZXIuZGVsaW1pdGVyID0gZGVsaW1pdGVyO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IHsgaHRtbCB9ID0gYXJnMSBhcyB7IGh0bWw6IFRlbXBsYXRlVGFnOyB9O1xuICAgICAgICBjb25zdCBjb25maWcgPSBPYmplY3QuYXNzaWduKHtcbiAgICAgICAgICAgIGRlbGltaXRlcixcbiAgICAgICAgICAgIHRyYW5zZm9ybWVyczoge30sXG4gICAgICAgIH0sIGFyZzEsIHsgaHRtbDogcGF0Y2goaHRtbCkgfSkgYXMgVHJhbnNmb3JtQ29uZmlnO1xuICAgICAgICB0cmFuc2Zvcm1lciA9IGNyZWF0ZUN1c3RvbShjb25maWcpIGFzIE11c3RhY2hlVHJhbnNmb3JtZXJDb250ZXh0O1xuICAgICAgICB0cmFuc2Zvcm1lci5kZWxpbWl0ZXIgPSBjb25maWcuZGVsaW1pdGVyITtcbiAgICB9XG4gICAgcmV0dXJuIHhmb3JtKHRyYW5zZm9ybWVyKTtcbn1cblxuY29uc3QgdHJhbnNmb3JtZXI6IHtcbiAgICB2YXJpYWJsZTogVHJhbnNmb3JtRXhlY3V0b3I7XG4gICAgdW5zYWZlVmFyaWFibGU6ICh1bnNhZmVIVE1MOiBUcmFuc2Zvcm1EaXJlY3RpdmUpID0+IFRyYW5zZm9ybWVDb250ZXh0O1xuICAgIHNlY3Rpb246ICgpID0+IFRyYW5zZm9ybWVDb250ZXh0O1xuICAgIGludmVydGVkU2VjdGlvbjogKCkgPT4gVHJhbnNmb3JtZUNvbnRleHQ7XG4gICAgY29tbWVudDogKCkgPT4gVHJhbnNmb3JtZUNvbnRleHQ7XG4gICAgY3VzdG9tRGVsaW1pdGVyOiAoKSA9PiBUcmFuc2Zvcm1lQ29udGV4dDtcbn0gPSB7XG4gICAgdmFyaWFibGUsXG4gICAgdW5zYWZlVmFyaWFibGUsXG4gICAgc2VjdGlvbixcbiAgICBpbnZlcnRlZFNlY3Rpb24sXG4gICAgY29tbWVudCxcbiAgICBjdXN0b21EZWxpbWl0ZXIsXG59O1xuXG5leHBvcnQge1xuICAgIFRlbXBsYXRlVGFnLFxuICAgIFRyYW5zZm9ybURpcmVjdGl2ZSxcbiAgICBUZW1wbGF0ZVRyYW5zZm9ybWVyLFxuICAgIFRyYW5zZm9ybVRlc3RlcixcbiAgICBUcmFuc2Zvcm1FeGVjdXRvcixcbiAgICBUcmFuc2Zvcm1lQ29udGV4dCxcbiAgICBUcmFuc2Zvcm1Db25maWcsXG4gICAgY3JlYXRlTXVzdGFjaGVUcmFuc2Zvcm1lcixcbiAgICB0cmFuc2Zvcm1lcixcbn07XG4iLG51bGwsbnVsbCxudWxsLG51bGwsbnVsbCwiaW1wb3J0IHR5cGUge1xuICAgIFRlbXBsYXRlQnJpZGdlQXJnLFxuICAgIFRlbXBsYXRlVHJhbnNmb3JtZXIsXG59IGZyb20gJ0BicmlkZ2UvaW50ZXJmYWNlcyc7XG5pbXBvcnQge1xuICAgIFRlbXBsYXRlSGFuZGxlcixcbiAgICBUZW1wbGF0ZUhhbmRsZXJzLFxuICAgIFRlbXBsYXRlUmVuZGVyZXJzLFxuICAgIEV2YWx1YXRlVGVtcGxhdGVSZXN1bHQsXG4gICAgcHJlcGFyZVRlbXBsYXRlLFxuICAgIGV2YWx1YXRlVGVtcGxhdGUsXG59IGZyb20gJ3N0YW1waW5vJztcblxuZXhwb3J0IGludGVyZmFjZSBDcmVhdGVTdGFtcGlub1RlbXBsYXRlT3B0aW9ucyB7XG4gICAgaGFuZGxlcnM/OiBUZW1wbGF0ZUhhbmRsZXJzO1xuICAgIHJlbmRlcmVycz86IFRlbXBsYXRlUmVuZGVyZXJzO1xuICAgIHN1cGVyVGVtcGxhdGU/OiBIVE1MVGVtcGxhdGVFbGVtZW50IHwgdW5kZWZpbmVkO1xufVxuXG5mdW5jdGlvbiBlbnN1cmUodGVtcGxhdGU6IEhUTUxUZW1wbGF0ZUVsZW1lbnQgfCBzdHJpbmcpOiBIVE1MVGVtcGxhdGVFbGVtZW50IHtcbiAgICBpZiAodGVtcGxhdGUgaW5zdGFuY2VvZiBIVE1MVGVtcGxhdGVFbGVtZW50KSB7XG4gICAgICAgIHJldHVybiB0ZW1wbGF0ZTtcbiAgICB9IGVsc2UgaWYgKCdzdHJpbmcnID09PSB0eXBlb2YgdGVtcGxhdGUpIHtcbiAgICAgICAgY29uc3QgZWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3RlbXBsYXRlJyk7XG4gICAgICAgIGVsZW1lbnQuaW5uZXJIVE1MID0gdGVtcGxhdGU7XG4gICAgICAgIHJldHVybiBlbGVtZW50O1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYFR5cGUgb2YgdGVtcGxhdGUgaXMgbm90IGEgdmFsaWQuIFt0eXBlb2Y6ICR7dHlwZW9mIHRlbXBsYXRlfV1gKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZVN0YW1waW5vVHJhbnNmb3JtZXIob3B0aW9ucz86IENyZWF0ZVN0YW1waW5vVGVtcGxhdGVPcHRpb25zKTogVGVtcGxhdGVUcmFuc2Zvcm1lciB7XG4gICAgY29uc3QgeyBoYW5kbGVycywgcmVuZGVyZXJzLCBzdXBlclRlbXBsYXRlIH0gPSBvcHRpb25zID8/IHt9O1xuICAgIHJldHVybiAodGVtcGxhdGU6IEhUTUxUZW1wbGF0ZUVsZW1lbnQgfCBzdHJpbmcpID0+IHtcbiAgICAgICAgcmV0dXJuIHByZXBhcmVUZW1wbGF0ZShlbnN1cmUodGVtcGxhdGUpLCBoYW5kbGVycywgcmVuZGVyZXJzLCBzdXBlclRlbXBsYXRlKTtcbiAgICB9O1xufVxuXG5leHBvcnQge1xuICAgIFRlbXBsYXRlQnJpZGdlQXJnLFxuICAgIFRlbXBsYXRlSGFuZGxlcixcbiAgICBUZW1wbGF0ZUhhbmRsZXJzLFxuICAgIFRlbXBsYXRlUmVuZGVyZXJzLFxuICAgIEV2YWx1YXRlVGVtcGxhdGVSZXN1bHQsXG4gICAgY3JlYXRlU3RhbXBpbm9UcmFuc2Zvcm1lcixcbiAgICBwcmVwYXJlVGVtcGxhdGUsXG4gICAgZXZhbHVhdGVUZW1wbGF0ZSxcbn07XG4iXSwibmFtZXMiOlsiY3JlYXRlVHJhbnNmb3JtIiwidHJhbnNmb3JtVmFyaWFibGUiLCJ1bnNhZmVWYXJpYWJsZVRyYW5zZm9ybWVyIiwic2VjdGlvblRyYW5zZm9ybWVyIiwiaW52ZXJ0ZWRTZWN0aW9uVHJhbnNmb3JtZXIiLCJjb21tZW50VHJhbnNmb3JtZXIiLCJjdXN0b21EZWxpbWl0ZXJUcmFuc2Zvcm1lciIsInRvVGVtcGxhdGVTdHJpbmdzQXJyYXkiLCJfJExIIiwibm90aGluZyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7RUFBQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0FBQ0EsdUJBQWUsTUFBTSxJQUFJLFdBQVcsSUFBSSxTQUFTLENBQUMsV0FBVyxFQUFFLE1BQU0sRUFBQztBQUN0RTtFQUNPLFNBQVMsU0FBUyxDQUFDLFVBQVUsRUFBRSxNQUFNLEVBQUU7RUFDOUMsRUFBRSxNQUFNLFdBQVcsR0FBRyxHQUFFO0VBQ3hCLEVBQUUsTUFBTSxlQUFlLEdBQUcsR0FBRTtBQUM1QjtFQUNBLEVBQUUsSUFBSSxnQkFBZ0IsR0FBRyxXQUFVO0VBQ25DLEVBQUUsSUFBSSxjQUFjLEdBQUcsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFDO0VBQ3ZFLEVBQUUsT0FBTyxjQUFjLElBQUksQ0FBQyxFQUFFO0VBQzlCLElBQUksSUFBSSxnQkFBZ0Is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QU0sS0FBSyxDQUFDLEdBQUcsQ0FBQztNQUM5QixHQUFHLEVBQUUsQ0FBQyxDQUFNLEVBQUUsQ0FBTSxLQUFLLENBQUMsR0FBRyxDQUFDO01BQzlCLEdBQUcsRUFBRSxDQUFDLENBQU0sRUFBRSxDQUFNLEtBQUssQ0FBQyxHQUFHLENBQUM7TUFDOUIsR0FBRyxFQUFFLENBQUMsQ0FBTSxFQUFFLENBQU0sS0FBSyxDQUFDLEdBQUcsQ0FBQztNQUM5QixHQUFHLEVBQUUsQ0FBQyxDQUFNLEVBQUUsQ0FBTSxLQUFLLENBQUMsR0FBRyxDQUFDO01BQzlCLElBQUksRUFBRSxDQUFDLENBQU0sRUFBRSxDQUFNLEtBQUssQ0FBQyxJQUFJLENBQUM7TUFDaEMsSUFBSSxFQUFFLENBQUMsQ0FBTSxFQUFFLENBQU0sS0FBSyxDQUFDLElBQUksQ0FBQztNQUNoQyxLQUFLLEVBQUUsQ0FBQyxDQUFNLEVBQUUsQ0FBTSxLQUFLLENBQUMsS0FBSyxDQUFDO01BQ2xDLEtBQUssRUFBRSxDQUFDLENBQU0sRUFBRSxDQUFNLEtBQUssQ0FBQyxLQUFLLENBQUM7TUFDbEMsR0FBRyxFQUFFLENBQUMsQ0FBTSxFQUFFLENBQU0sS0FBSyxDQUFDLEdBQUcsQ0FBQztNQUM5QixJQUFJLEVBQUUsQ0FBQyxDQUFNLEVBQUUsQ0FBTSxLQUFLLENBQUMsSUFBSSxDQUFDO01BQ2hDLEdBQUcsRUFBRSxDQUFDLENBQU0sRUFBRSxDQUFNLEtBQUssQ0FBQyxHQUFHLENBQUM7TUFDOUIsSUFBSSxFQUFFLENBQUMsQ0FBTSxFQUFFLENBQU0sS0FBSyxDQUFDLElBQUksQ0FBQztNQUNoQyxJQUFJLEVBQUUsQ0FBQyxDQUFNLEVBQUUsQ0FBTSxLQUFLLENBQUMsSUFBSSxDQUFDO01BQ2hDLElBQUksRUFBRSxDQUFDLENBQU0sRUFBRSxDQUFNLEtBQUssQ0FBQyxJQUFJLENBQUM7TUFDaEMsSUFBSSxFQUFFLENBQUMsQ0FBTSxFQUFFLENBQU0sS0FBSyxDQUFDLElBQUksQ0FBQztNQUNoQyxHQUFHLEVBQUUsQ0FBQyxDQUFNLEVBQUUsQ0FBa0IsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO01BQ3pDLElBQUksRUFBRSxDQUFDLENBQU0sRUFBRSxDQUFrQixLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7R0FDM0M7RUFFRCxNQUFNLGdCQUFnQixHQUFvQztFQUN4RCxJQUFBLEdBQUcsRUFBRSxDQUFDLENBQU0sS0FBSyxDQUFDO0VBQ2xCLElBQUEsR0FBRyxFQUFFLENBQUMsQ0FBTSxLQUFLLENBQUMsQ0FBQztFQUNuQixJQUFBLEdBQUcsRUFBRSxDQUFDLENBQU0sS0FBSyxDQUFDLENBQUM7R0FDcEI7UUFtRlksY0FBYyxDQUFBO01BQ3pCLEtBQUssR0FBQTs7VUFFSCxPQUFPO0VBQ0wsWUFBQSxJQUFJLEVBQUUsT0FBTztFQUNiLFlBQUEsUUFBUSxDQUFDLEtBQUssRUFBQTtFQUNaLGdCQUFBLE9BQU8sS0FBSztlQUNiO0VBQ0QsWUFBQSxNQUFNLENBQUMsTUFBTSxFQUFBO0VBQ1gsZ0JBQUEsT0FBTyxNQUFNO2VBQ2Q7V0FDRjs7O0VBSUgsSUFBQSxPQUFPLENBQUMsQ0FBUyxFQUFBO1VBQ2YsT0FBTztFQUNMLFlBQUEsSUFBSSxFQUFFLFNBQVM7RUFDZixZQUFBLEtBQUssRUFBRSxDQUFDO0VBQ1IsWUFBQSxRQUFRLENBQUMsTUFBTSxFQUFBO2tCQUNiLE9BQU8sSUFBSSxDQUFDLEtBQUs7ZUFDbEI7RUFDRCxZQUFBLE1BQU0sQ0FBQyxNQUFNLEVBQUE7RUFDWCxnQkFBQSxPQUFPLE1BQU07ZUFDZDtXQUNGOztFQUdILElBQUEsRUFBRSxDQUFDLENBQVMsRUFBQTtVQUNWLE9BQU87RUFDTCxZQUFBLElBQUksRUFBRSxJQUFJO0VBQ1YsWUFBQSxLQUFLLEVBQUUsQ0FBQztFQUNSLFlBQUEsUUFBUSxDQUFDLEtBQUssRUFBQTs7RUFFWixnQkFBQSxJQUFJLElBQUksQ0FBQyxLQUFLLEtBQUssTUFBTTtFQUFFLG9CQUFBLE9BQU8sS0FBSztFQUN2QyxnQkFBQSxPQUFPLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDO2VBQzNCO0VBQ0QsWUFBQSxNQUFNLENBQUMsTUFBTSxFQUFBO0VBQ1gsZ0JBQUEsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDO0VBQ3ZCLGdCQUFBLE9BQU8sTUFBTTtlQUNkO1dBQ0Y7O01BR0gsS0FBSyxDQUFDLEVBQVUsRUFBRSxJQUFnQixFQUFBO0VBQ2hDLFFBQUEsTUFBTSxDQUFDLEdBQUcsZ0JBQWdCLENBQUMsRUFBRSxDQUFDO1VBQzlCLE9BQU87RUFDTCxZQUFBLElBQUksRUFBRSxPQUFPO0VBQ2IsWUFBQSxRQUFRLEVBQUUsRUFBRTtFQUNaLFlBQUEsS0FBSyxFQUFFLElBQUk7RUFDWCxZQUFBLFFBQVEsQ0FBQyxLQUFLLEVBQUE7a0JBQ1osT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7ZUFDckM7RUFDRCxZQUFBLE1BQU0sQ0FBQyxNQUFNLEVBQUE7a0JBQ1gsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUM7ZUFDakM7V0FDRjs7RUFHSCxJQUFBLE1BQU0sQ0FBQyxDQUFhLEVBQUUsRUFBVSxFQUFFLENBQWEsRUFBQTtFQUM3QyxRQUFBLE1BQU0sQ0FBQyxHQUFHLGlCQUFpQixDQUFDLEVBQUUsQ0FBQztVQUMvQixPQUFPO0VBQ0wsWUFBQSxJQUFJLEVBQUUsUUFBUTtFQUNkLFlBQUEsUUFBUSxFQUFFLEVBQUU7RUFDWixZQUFBLElBQUksRUFBRSxDQUFDO0VBQ1AsWUFBQSxLQUFLLEVBQUUsQ0FBQztFQUNSLFlBQUEsUUFBUSxDQUFDLEtBQUssRUFBQTtFQUNaLGdCQUFBLElBQUksSUFBSSxDQUFDLFFBQVEsS0FBSyxHQUFHLEVBQUU7RUFDekIsb0JBQUEsSUFDRSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksS0FBSyxJQUFJO0VBQ3ZCLHdCQUFBLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxLQUFLLFFBQVE7RUFDM0Isd0JBQUEsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEtBQUssT0FBTyxFQUMxQjswQkFDQSxNQUFNLElBQUksS0FBSyxDQUFDLENBQUEsMkJBQUEsRUFBOEIsSUFBSSxDQUFDLElBQUksQ0FBQSxDQUFFLENBQUM7O3NCQUU1RCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUM7c0JBQ3hDLElBQUksUUFBUSxHQUF1QixTQUFTO0VBQzVDLG9CQUFBLElBQUksUUFBaUI7c0JBQ3JCLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEtBQUssUUFBUSxFQUFFOzBCQUMvQixRQUFRLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQztFQUM3Qyx3QkFBQSxRQUFRLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJOzsyQkFDcEIsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksS0FBSyxPQUFPLEVBQUU7MEJBQ3JDLFFBQVEsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDOzBCQUM3QyxRQUFRLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQzs7MkJBQ3hDLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEtBQUssSUFBSSxFQUFFOzswQkFFbEMsUUFBUSxHQUFHLEtBQUs7RUFDaEIsd0JBQUEsUUFBUSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSzs7c0JBRTVCLE9BQU8sUUFBUSxLQUFLO0VBQ2xCLDBCQUFFOzZCQUNFLFFBQWdCLENBQUMsUUFBUSxDQUFDLEdBQUcsS0FBSyxDQUFDOztrQkFFM0MsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7ZUFDaEU7RUFDRCxZQUFBLE1BQU0sQ0FBQyxNQUFNLEVBQUE7RUFDWCxnQkFBQSxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUM7RUFDeEIsZ0JBQUEsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDO0VBQ3pCLGdCQUFBLE9BQU8sTUFBTTtlQUNkO1dBQ0Y7O01BR0gsTUFBTSxDQUFDLENBQWEsRUFBRSxDQUFTLEVBQUE7VUFDN0IsT0FBTztFQUNMLFlBQUEsSUFBSSxFQUFFLFFBQVE7RUFDZCxZQUFBLFFBQVEsRUFBRSxDQUFDO0VBQ1gsWUFBQSxJQUFJLEVBQUUsQ0FBQztFQUNQLFlBQUEsUUFBUSxDQUFDLEtBQUssRUFBQTtFQUNaLGdCQUFBLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQztlQUNsRDtFQUNELFlBQUEsTUFBTSxDQUFDLE1BQU0sRUFBQTtFQUNYLGdCQUFBLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQztFQUM1QixnQkFBQSxPQUFPLE1BQU07ZUFDZDtXQUNGOztFQUdILElBQUEsTUFBTSxDQUFDLFFBQW9CLEVBQUUsTUFBYyxFQUFFLElBQWtCLEVBQUE7VUFDN0QsSUFBSSxNQUFNLElBQUksSUFBSSxJQUFJLE9BQU8sTUFBTSxLQUFLLFFBQVEsRUFBRTtFQUNoRCxZQUFBLE1BQU0sSUFBSSxLQUFLLENBQUMscUJBQXFCLENBQUM7O1VBRXhDLE9BQU87RUFDTCxZQUFBLElBQUksRUFBRSxRQUFRO0VBQ2QsWUFBQSxRQUFRLEVBQUUsUUFBUTtFQUNsQixZQUFBLE1BQU0sRUFBRSxNQUFNO0VBQ2QsWUFBQSxTQUFTLEVBQUUsSUFBSTtFQUNmLFlBQUEsUUFBUSxDQUFDLEtBQUssRUFBQTtrQkFDWixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUM7Ozs7RUFJOUMsZ0JBQUEsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLE1BQU0sR0FBRyxRQUFRLEdBQUcsS0FBSyxHQUFHLE1BQU0sQ0FBQyxJQUFJLEtBQUs7RUFDL0QsZ0JBQUEsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sR0FBRyxRQUFRLEdBQUcsTUFBTSxDQUFDLEdBQUcsUUFBUTtFQUNyRCxnQkFBQSxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsU0FBUyxJQUFJLEVBQUU7RUFDakMsZ0JBQUEsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO2tCQUNyRCxPQUFPLENBQUMsRUFBRSxLQUFLLEdBQUcsS0FBSyxFQUFFLFNBQVMsQ0FBQztlQUNwQztFQUNELFlBQUEsTUFBTSxDQUFDLE1BQU0sRUFBQTtFQUNYLGdCQUFBLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQztFQUM1QixnQkFBQSxJQUFJLENBQUMsU0FBUyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0VBQ2pELGdCQUFBLE9BQU8sTUFBTTtlQUNkO1dBQ0Y7O0VBR0gsSUFBQSxLQUFLLENBQUMsQ0FBYSxFQUFBO0VBQ2pCLFFBQUEsT0FBTyxDQUFDOztNQUdWLEtBQUssQ0FBQyxDQUFhLEVBQUUsQ0FBYSxFQUFBO1VBQ2hDLE9BQU87RUFDTCxZQUFBLElBQUksRUFBRSxPQUFPO0VBQ2IsWUFBQSxRQUFRLEVBQUUsQ0FBQztFQUNYLFlBQUEsUUFBUSxFQUFFLENBQUM7RUFDWCxZQUFBLFFBQVEsQ0FBQyxLQUFLLEVBQUE7RUFDWixnQkFBQSxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO2VBQ3RFO0VBQ0QsWUFBQSxNQUFNLENBQUMsTUFBTSxFQUFBO0VBQ1gsZ0JBQUEsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDO0VBQzVCLGdCQUFBLE9BQU8sTUFBTTtlQUNkO1dBQ0Y7O0VBR0gsSUFBQSxPQUFPLENBQUMsQ0FBYSxFQUFFLENBQWEsRUFBRSxDQUFhLEVBQUE7VUFDakQsT0FBTztFQUNMLFlBQUEsSUFBSSxFQUFFLFNBQVM7RUFDZixZQUFBLFNBQVMsRUFBRSxDQUFDO0VBQ1osWUFBQSxRQUFRLEVBQUUsQ0FBQztFQUNYLFlBQUEsU0FBUyxFQUFFLENBQUM7RUFDWixZQUFBLFFBQVEsQ0FBQyxLQUFLLEVBQUE7a0JBQ1osTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDO2tCQUN4QyxJQUFJLENBQUMsRUFBRTtzQkFDTCxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQzs7dUJBQy9CO3NCQUNMLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDOztlQUV4QztFQUNELFlBQUEsTUFBTSxDQUFDLE1BQU0sRUFBQTtFQUNYLGdCQUFBLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQztFQUM3QixnQkFBQSxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUM7RUFDNUIsZ0JBQUEsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDO0VBQzdCLGdCQUFBLE9BQU8sTUFBTTtlQUNkO1dBQ0Y7O0VBR0gsSUFBQSxHQUFHLENBQUMsT0FBZ0QsRUFBQTtVQUNsRCxPQUFPO0VBQ0wsWUFBQSxJQUFJLEVBQUUsS0FBSztFQUNYLFlBQUEsT0FBTyxFQUFFLE9BQU87RUFDaEIsWUFBQSxRQUFRLENBQUMsS0FBSyxFQUFBO2tCQUNaLE1BQU0sR0FBRyxHQUFHLEVBQUU7RUFDZCxnQkFBQSxJQUFJLE9BQU8sSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFO0VBQzNCLG9CQUFBLEtBQUssTUFBTSxHQUFHLElBQUksT0FBTyxFQUFFOzBCQUN6QixNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQzswQkFDN0IsSUFBSSxHQUFHLEVBQUU7OEJBQ04sR0FBVyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDOzs7O0VBSTdDLGdCQUFBLE9BQU8sR0FBRztlQUNYO0VBQ0QsWUFBQSxNQUFNLENBQUMsTUFBTSxFQUFBO0VBQ1gsZ0JBQUEsSUFBSSxPQUFPLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRTtFQUMzQixvQkFBQSxLQUFLLE1BQU0sR0FBRyxJQUFJLE9BQU8sRUFBRTswQkFDekIsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUM7MEJBQzdCLElBQUksR0FBRyxFQUFFO0VBQ1AsNEJBQUEsR0FBRyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUM7Ozs7RUFJeEIsZ0JBQUEsT0FBTyxNQUFNO2VBQ2Q7V0FDRjs7O0VBSUgsSUFBQSxJQUFJLENBQUMsQ0FBZ0MsRUFBQTtVQUNuQyxPQUFPO0VBQ0wsWUFBQSxJQUFJLEVBQUUsTUFBTTtFQUNaLFlBQUEsS0FBSyxFQUFFLENBQUM7RUFDUixZQUFBLFFBQVEsQ0FBQyxLQUFLLEVBQUE7RUFDWixnQkFBQSxPQUFPLElBQUksQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7ZUFDbEQ7RUFDRCxZQUFBLE1BQU0sQ0FBQyxNQUFNLEVBQUE7RUFDWCxnQkFBQSxJQUFJLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0VBQzdDLGdCQUFBLE9BQU8sTUFBTTtlQUNkO1dBQ0Y7O01BR0gsYUFBYSxDQUFDLE1BQWdCLEVBQUUsSUFBZ0IsRUFBQTtVQUM5QyxPQUFPO0VBQ0wsWUFBQSxJQUFJLEVBQUUsZUFBZTtjQUNyQixNQUFNO2NBQ04sSUFBSTtFQUNKLFlBQUEsUUFBUSxDQUFDLEtBQUssRUFBQTtFQUNaLGdCQUFBLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNO0VBQzFCLGdCQUFBLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJO2tCQUN0QixPQUFPLFVBQVUsR0FBRyxJQUFXLEVBQUE7Ozs7c0JBSTdCLE1BQU0sU0FBUyxHQUFHLE1BQU0sQ0FBQyxXQUFXLENBQ2xDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQ25DO3NCQUNELE1BQU0sUUFBUSxHQUFHLElBQUksS0FBSyxDQUFDLEtBQUssSUFBSSxFQUFFLEVBQUU7RUFDdEMsd0JBQUEsR0FBRyxDQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFBO0VBQ3JCLDRCQUFBLElBQUksU0FBUyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsRUFBRTtFQUNsQyxnQ0FBQSxTQUFTLENBQUMsSUFBYyxDQUFDLEdBQUcsS0FBSzs7OEJBRW5DLFFBQVEsTUFBTSxDQUFDLElBQWMsQ0FBQyxHQUFHLEtBQUs7MkJBQ3ZDOzBCQUNELEdBQUcsQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUFBO0VBQ2QsNEJBQUEsSUFBSSxTQUFTLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxFQUFFO0VBQ2xDLGdDQUFBLE9BQU8sU0FBUyxDQUFDLElBQWMsQ0FBQzs7RUFFbEMsNEJBQUEsT0FBTyxNQUFNLENBQUMsSUFBYyxDQUFDOzJCQUM5QjtFQUNGLHFCQUFBLENBQUM7RUFDRixvQkFBQSxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDO0VBQ2hDLGlCQUFDO2VBQ0Y7RUFDRCxZQUFBLE1BQU0sQ0FBQyxNQUFNLEVBQUE7Ozs7a0JBSVgsT0FBTyxJQUFJLENBQUM7dUJBQ1QsTUFBTSxDQUFDLE1BQU07RUFDYixxQkFBQSxNQUFNLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQztlQUM3QztXQUNGOztFQUVKOztFQ2hZRCxNQUFNLEVBQUMsYUFBYSxFQUFFLFlBQVksRUFBRSxvQkFBb0IsRUFBRSxTQUFTLEVBQUMsR0FBR0Msc0JBQUk7RUFFM0UsTUFBTSxVQUFVLEdBQUcsSUFBSSxjQUFjLEVBQUU7RUFDdkMsTUFBTSxlQUFlLEdBQUcsSUFBSSxHQUFHLEVBQWtDO0VBRWpFLE1BQU0sV0FBVyxHQUFHLENBQUMsQ0FBUyxLQUM1QixDQUFDLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFVLEtBQUssRUFBRSxDQUFDLFdBQVcsRUFBRSxDQUFDO0VBRTVEOztFQUVHO0VBQ0gsTUFBTSxjQUFjLEdBQUcsQ0FBQyxDQUFTLEVBQUUsS0FBVSxLQUFJO01BQy9DLElBQUksR0FBRyxHQUFHLGVBQWUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0VBQ2hDLElBQUEsSUFBSSxHQUFHLEtBQUssU0FBUyxFQUFFO0VBQ3JCLFFBQUEsSUFBSSxlQUFlLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFO0VBQzFCLFlBQUEsT0FBTyxTQUFTOztFQUVsQixRQUFBLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFO0VBQ1osUUFBQSxJQUFJLENBQUMsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRTtFQUMxQyxZQUFBLE1BQU0sVUFBVSxHQUFHLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFO2NBQ3RELEdBQUcsR0FBRyxJQUFJLE1BQU0sQ0FBQyxVQUFVLEVBQUUsVUFBVSxDQUFDLENBQUMsS0FBSyxFQUFFO0VBQ2hELFlBQUEsZUFBZSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDOzs7RUFHL0IsSUFBQSxPQUFPLEdBQUcsRUFBRSxRQUFRLENBQUMsS0FBSyxDQUFDO0VBQzdCLENBQUM7RUFrQ00sTUFBTSxTQUFTLEdBQW9CLENBQ3hDLFFBQTZCLEVBQzdCLEtBQWEsRUFDYixRQUEwQixFQUMxQixTQUFvQixLQUNsQjtNQUNGLE1BQU0sV0FBVyxHQUFHLFFBQVEsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDO01BQy9DLElBQUksV0FBVyxLQUFLLElBQUksSUFBSSxjQUFjLENBQUMsV0FBVyxFQUFFLEtBQUssQ0FBQyxFQUFFO1VBQzlELE9BQU8sZ0JBQWdCLENBQUMsUUFBUSxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsU0FBUyxDQUFDOztFQUUvRCxJQUFBLE9BQU8sU0FBUztFQUNsQixDQUFDO0VBRUQsTUFBTSxZQUFZLEdBQUcsOEJBQThCO0VBRW5ELE1BQU0sd0JBQXdCLEdBQUcsQ0FBQyxDQUFTLEtBQUssb0JBQW9CLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztFQUU1RSxNQUFNLHNCQUFzQixHQUFHLENBQUMsQ0FBUyxLQUN2QyxDQUFDLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQztFQUU3QyxNQUFNLGFBQWEsR0FBb0IsQ0FDNUMsUUFBNkIsRUFDN0IsS0FBZ0MsRUFDaEMsUUFBMEIsRUFDMUIsU0FBb0IsS0FDbEI7TUFDRixNQUFNLGVBQWUsR0FBRyxRQUFRLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQztFQUN2RCxJQUFBLElBQUksZUFBZSxLQUFLLElBQUksRUFBRTtVQUM1QixNQUFNLEtBQUssR0FBRyxjQUFjLENBQUMsZUFBZSxFQUFFLEtBQUssQ0FBQztVQUNwRCxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsRUFBRTtFQUMzQixZQUFBLE9BQU9DLHlCQUFPOztFQUVoQixRQUFBLE1BQU0sV0FBVyxHQUFHLGNBQWMsQ0FBQyxRQUFRLENBQUM7RUFFNUMsUUFBQSxJQUFJLEtBQUssR0FBRyxFQUFFO1VBQ2QsTUFBTSxNQUFNLEdBQUcsRUFBRTtFQUNqQixRQUFBLEtBQUssTUFBTSxJQUFJLElBQUksS0FBSyxFQUFFO0VBQ3hCLFlBQUEsS0FBSyxFQUFFO2NBQ1AsTUFBTSxTQUFTLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUM7RUFDdEMsWUFBQSxTQUFTLENBQUMsSUFBSSxHQUFHLElBQUk7RUFDckIsWUFBQSxTQUFTLENBQUMsS0FBSyxHQUFHLEtBQUs7Y0FDdkIsU0FBUyxDQUFDLE1BQU0sQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxLQUFLO2NBRTFDLE1BQU0sTUFBTSxHQUFHLEVBQUU7RUFDakIsWUFBQSxLQUFLLE1BQU0sSUFBSSxJQUFJLFdBQVcsQ0FBQyxLQUFLLEVBQUU7RUFDcEMsZ0JBQUEsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsUUFBUSxFQUFFLFNBQVMsQ0FBQztFQUN6RCxnQkFBQSxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssQ0FBQyxFQUFFO0VBQ25CLG9CQUFBLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBSSxLQUEyQixDQUFDOzt1QkFDdkM7RUFDTCxvQkFBQSxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQzs7O0VBR3RCLFlBQUEsTUFBTSxjQUFjLEdBQTJCO0VBQzdDLGdCQUFBLFVBQVUsRUFBRSxXQUFXO2tCQUN2QixNQUFNO2VBQ1A7RUFDRCxZQUFBLE1BQU0sQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDOztFQUU3QixRQUFBLE9BQU8sTUFBTTs7RUFFZixJQUFBLE9BQU8sU0FBUztFQUNsQixDQUFDO0VBRU0sTUFBTSxlQUFlLEdBQXFCO0VBQy9DLElBQUEsRUFBRSxFQUFFLFNBQVM7RUFDYixJQUFBLE1BQU0sRUFBRSxhQUFhO0dBQ3RCO0VBRUQ7O0VBRUc7QUFDSSxRQUFNLGVBQWUsR0FBRyxDQUM3QixRQUE2QixFQUM3QixRQUFBLEdBQTZCLGVBQWUsRUFDNUMsU0FBQSxHQUF1QixFQUFFLEVBQ3pCLGFBQW1DLEtBQ2Y7RUFDcEIsSUFBQSxNQUFNLFdBQVcsR0FBRyxjQUFjLENBQUMsUUFBUSxDQUFDO0VBQzVDLElBQUEsTUFBTSxpQkFBaUIsR0FBRyxXQUFXLENBQUMsU0FBUztNQUMvQyxJQUFJLGFBQWEsRUFBRTtFQUNqQixRQUFBLE1BQU0sZ0JBQWdCLEdBQUcsY0FBYyxDQUFDLGFBQWEsQ0FBQztFQUN0RCxRQUFBLE1BQU0sY0FBYyxHQUFHLGdCQUFnQixDQUFDLFNBQVM7RUFDakQsUUFBQSxNQUFNLGlCQUFpQixHQUFHLGlCQUFpQixDQUFDLE9BQU8sQ0FBQztFQUVwRCxRQUFBLElBQUksaUJBQWlCLEtBQUssU0FBUyxFQUFFOzs7RUFJbkMsWUFBQSxTQUFTLEdBQUc7O0VBRVYsZ0JBQUEsR0FBRyxpQkFBaUI7O0VBRXBCLGdCQUFBLEdBQUcsU0FBUzs7a0JBRVosS0FBSyxFQUFFLENBQUMsS0FBSyxFQUFFLFFBQVEsRUFBRSxTQUFTLEtBQUk7Ozs7O0VBS3BDLG9CQUFBLFNBQVMsR0FBRzs7RUFFVix3QkFBQSxHQUFHLGNBQWM7O0VBRWpCLHdCQUFBLEdBQUcsU0FBUzs7MEJBRVosS0FBSyxFQUFFLENBQUMsS0FBSyxFQUFFLFFBQVEsRUFBRSxTQUFTLEtBQUk7OEJBQ3BDLE9BQU8sZ0JBQWdCLENBQ3JCLGFBQWEsRUFDYixLQUFLLEVBQ0wsUUFBUSxFQUNSLFNBQVMsQ0FDVjsyQkFDRjt1QkFDRjtzQkFDRCxPQUFPLGlCQUFpQixDQUFDLEtBQUssRUFBRSxRQUFRLEVBQUUsU0FBUyxDQUFDO21CQUNyRDtlQUNGOztlQUNJOzs7OztFQU1MLFlBQUEsU0FBUyxHQUFHOztFQUVWLGdCQUFBLEdBQUcsY0FBYzs7RUFFakIsZ0JBQUEsR0FBRyxpQkFBaUI7O0VBRXBCLGdCQUFBLEdBQUcsU0FBUztlQUNiO2NBQ0QsUUFBUSxHQUFHLGFBQWE7OztXQUVyQjs7RUFFTCxRQUFBLFNBQVMsR0FBRzs7RUFFVixZQUFBLEdBQUcsaUJBQWlCOztFQUVwQixZQUFBLEdBQUcsU0FBUztXQUNiOztFQUVILElBQUEsT0FBTyxDQUFDLEtBQUssS0FBSyxnQkFBZ0IsQ0FBQyxRQUFRLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxTQUFTLENBQUM7RUFDMUU7RUE0QkE7Ozs7Ozs7O0VBUUc7QUFDSSxRQUFNLGdCQUFnQixHQUFHLENBQzlCLFFBQTZCLEVBQzdCLEtBQVUsRUFDVixXQUE2QixlQUFlLEVBQzVDLFNBQUEsR0FBdUIsRUFBRSxLQUN2QjtFQUNGLElBQUEsTUFBTSxXQUFXLEdBQUcsY0FBYyxDQUFDLFFBQVEsQ0FBQztNQUM1QyxNQUFNLE1BQU0sR0FBbUIsRUFBRTtFQUNqQyxJQUFBLEtBQUssTUFBTSxJQUFJLElBQUksV0FBVyxDQUFDLEtBQUssRUFBRTtFQUNwQyxRQUFBLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLFFBQVEsRUFBRSxTQUFTLENBQUM7RUFDckQsUUFBQSxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssQ0FBQyxFQUFFO0VBQ25CLFlBQUEsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFJLEtBQTJCLENBQUM7O2VBQ3ZDO0VBQ0wsWUFBQSxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQzs7O0VBR3RCLElBQUEsTUFBTSxjQUFjLEdBQTJCO0VBQzdDLFFBQUEsVUFBVSxFQUFFLFdBQVc7VUFDdkIsTUFBTTtPQUNQO0VBQ0QsSUFBQSxPQUFPLGNBQWM7RUFDdkI7RUFtQkEsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLEdBQUcsRUFBeUM7RUFFbEUsTUFBTSxjQUFjLEdBQUcsQ0FDNUIsUUFBNkIsS0FDVDtNQUNwQixJQUFJLFdBQVcsR0FBRyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDO0VBQ2hELElBQUEsSUFBSSxXQUFXLEtBQUssU0FBUyxFQUFFO0VBQzdCLFFBQUEsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLFFBQVEsR0FBRyxXQUFXLEdBQUcsZUFBZSxDQUFDLFFBQVEsQ0FBQyxFQUFFOztFQUUzRSxJQUFBLE9BQU8sV0FBVztFQUNwQixDQUFDO0VBRUQsTUFBTSxlQUFlLEdBQUcsQ0FBQyxRQUE2QixLQUFzQjtFQUMxRSxJQUFBLE1BQU0sV0FBVyxHQUFxQjtFQUNwQyxRQUFBLENBQUMsRUFBRSxTQUE0QztFQUMvQyxRQUFBLEVBQUUsRUFBRSxRQUFRLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBd0I7RUFDbkQsUUFBQSxLQUFLLEVBQUUsRUFBRTtFQUNULFFBQUEsU0FBUyxFQUFFLEVBQUU7T0FDZDtNQUNELE1BQU0sTUFBTSxHQUFHLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FDdEMsV0FBVyxDQUFDLEVBQUcsQ0FBQyxPQUFPLEVBQ3ZCLFVBQVUsQ0FBQyxZQUFZLEdBQUcsVUFBVSxDQUFDLFNBQVMsR0FBRyxVQUFVLENBQUMsWUFBWSxDQUN6RTtFQUNELElBQUEsSUFBSSxJQUFJLEdBQWdCLE1BQU0sQ0FBQyxXQUFXO0VBQzFDLElBQUEsSUFBSSxTQUFTLEdBQUcsRUFBRTtNQUNsQixNQUFNLGdCQUFnQixHQUFHLEVBQUU7TUFFM0IsT0FBTyxDQUFDLElBQUksR0FBRyxNQUFNLENBQUMsUUFBUSxFQUFFLE1BQU0sSUFBSSxFQUFFO1VBQzFDLElBQUksSUFBSSxDQUFDLFFBQVEsS0FBSyxJQUFJLENBQUMsWUFBWSxFQUFFO0VBQ3ZDLFlBQUEsU0FBUyxFQUFFO2NBQ1gsTUFBTSxPQUFPLEdBQUcsSUFBZTtFQUMvQixZQUFBLElBQUksT0FBTyxDQUFDLE9BQU8sS0FBSyxVQUFVLEVBQUU7a0JBQ2xDLE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDO2tCQUN6QyxNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQztrQkFDekMsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUM7RUFFekMsZ0JBQUEsSUFBSSxJQUFJLEtBQUssSUFBSSxJQUFJLElBQUksS0FBSyxJQUFJLElBQUksSUFBSSxLQUFLLElBQUksRUFBRTtFQUNuRCxvQkFBQSxPQUFPLENBQUMsVUFBVyxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLEVBQUUsQ0FBQyxFQUFFLE9BQU8sQ0FBQztFQUNyRSxvQkFBQSxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDO0VBQzlCLG9CQUFBLElBQUksTUFBbUI7RUFFdkIsb0JBQUEsSUFBSSxJQUFJLEtBQUssSUFBSSxFQUFFOztFQUVqQix3QkFBQSxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsSUFBSSxFQUFFO0VBQ2hDLHdCQUFBLE1BQU0sd0JBQXdCLEdBQzVCLFlBQVksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksWUFBWSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUM7MEJBRTlELE1BQU0sR0FBRyxDQUNQLEtBQWEsRUFDYixRQUEwQixFQUMxQixTQUFvQixLQUNsQjs4QkFDRixNQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQztFQUM3Qyw0QkFBQSxNQUFNLElBQUksR0FDUixRQUFRLEtBQUssSUFBSSxHQUFHLFNBQVMsR0FBRyxjQUFjLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQzs4QkFFakUsTUFBTSxRQUFRLEdBQUc7RUFDZixrQ0FBRSxjQUFjLENBQUMsWUFBWSxFQUFFLEtBQUs7RUFDcEMsa0NBQUUsU0FBUyxDQUFDLElBQUksQ0FBQzs4QkFDbkIsT0FBTyxRQUFRLEdBQUcsSUFBSSxFQUFFLFFBQVEsRUFBRSxTQUFTLENBQUM7RUFDOUMseUJBQUM7O0VBQ0kseUJBQUEsSUFBSSxJQUFJLEtBQUssSUFBSSxFQUFFOzswQkFFeEIsTUFBTSxHQUFHLENBQ1AsS0FBYSxFQUNiLFFBQTBCLEVBQzFCLFNBQW9CLEtBQ2xCO0VBQ0YsNEJBQUEsTUFBTSxPQUFPLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQzs4QkFDOUIsT0FBTyxPQUFPLEdBQ1osT0FBOEIsRUFDOUIsS0FBSyxFQUNMLFFBQVEsRUFDUixTQUFTLENBQ1Y7RUFDSCx5QkFBQzs7MkJBQ0k7O0VBRUwsd0JBQUEsSUFBSSxJQUFJLEtBQUssT0FBTyxFQUFFO0VBQ3BCLDRCQUFBLFdBQVcsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FDL0IsS0FBVSxFQUNWLFFBQTBCLEVBQzFCLFNBQW9CLEtBQ2xCOzs7OztFQUtGLGdDQUFBLE1BQU0sYUFBYSxHQUFHLFNBQVMsQ0FBQyxPQUFPLENBQUM7RUFDeEMsZ0NBQUEsTUFBTSxpQkFBaUIsR0FBRyxjQUFjLENBQ3RDLE9BQThCLENBQy9CO0VBQ0QsZ0NBQUEsU0FBUyxHQUFHO0VBQ1Ysb0NBQUEsR0FBRyxTQUFTO3NDQUNaLEdBQUcsaUJBQWlCLENBQUMsU0FBUzttQ0FDL0I7a0NBQ0QsT0FBTyxhQUFhLENBQUMsS0FBSyxFQUFFLFFBQVEsRUFBRSxTQUFTLENBQUM7RUFDbEQsNkJBQUM7OytCQUNJOztFQUVMLDRCQUFBLFdBQVcsQ0FBQyxTQUFTLENBQUMsSUFBSyxDQUFDLEdBQUcsQ0FDN0IsS0FBVSxFQUNWLFFBQTBCLEVBQzFCLFNBQW9CLEtBQ2xCO2tDQUNGLE9BQU8sZ0JBQWdCLENBQ3JCLE9BQThCLEVBQzlCLEtBQUssRUFDTCxRQUFRLEVBQ1IsU0FBUyxDQUNWO0VBQ0gsNkJBQUM7Ozs7OzBCQUtILE1BQU0sR0FBRyxDQUNQLEtBQWEsRUFDYixRQUEwQixFQUMxQixTQUFvQixLQUNsQjtFQUNGLDRCQUFBLE1BQU0sUUFBUSxHQUFHLFNBQVMsQ0FBQyxJQUFLLENBQUM7OEJBQ2pDLE9BQU8sUUFBUSxHQUFHLEtBQUssRUFBRSxRQUFRLEVBQUUsU0FBUyxDQUFDO0VBQy9DLHlCQUFDOztFQUVILG9CQUFBLFdBQVcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDOzBCQUNyQixJQUFJLEVBQUUsQ0FBQztFQUNQLHdCQUFBLEtBQUssRUFBRSxTQUFTOzBCQUNoQixNQUFNO0VBQ1AscUJBQUEsQ0FBQzs7O3NCQUdGOzs7RUFHSixZQUFBLE1BQU0sY0FBYyxHQUFHLE9BQU8sQ0FBQyxpQkFBaUIsRUFBRTtFQUNsRCxZQUFBLEtBQUssTUFBTSxhQUFhLElBQUksY0FBYyxFQUFFO2tCQUMxQyxNQUFNLGNBQWMsR0FBRyxPQUFPLENBQUMsWUFBWSxDQUFDLGFBQWEsQ0FBRTs7O2tCQUczRCxNQUFNLFVBQVUsR0FBRyxjQUFjLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQztFQUNyRCxnQkFBQSxJQUFJLFVBQVUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO0VBQzNCLG9CQUFBLElBQUksd0JBQXdCLENBQUMsY0FBYyxDQUFDLEVBQUU7MEJBQzVDLE9BQU8sQ0FBQyxZQUFZLENBQ2xCLGFBQWEsRUFDYixzQkFBc0IsQ0FBQyxjQUFjLENBQUMsQ0FDdkM7O3NCQUVIOztFQUVGLGdCQUFBLE9BQU8sQ0FBQyxlQUFlLENBQUMsYUFBYSxDQUFDO2tCQUN0QyxJQUFJLElBQUksR0FBRyxhQUFhO2tCQUN4QixJQUFJLElBQUksR0FBRyxhQUFhO0VBQ3hCLGdCQUFBLE1BQU0sTUFBTSxHQUFHLGFBQWEsQ0FBQyxDQUFDLENBQUM7RUFDL0IsZ0JBQUEsSUFBSSxNQUFNLEtBQUssR0FBRyxFQUFFO3NCQUNsQixJQUFJLEdBQUcsV0FBVyxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7c0JBQzlDLElBQUksR0FBRyxZQUFZOztFQUNkLHFCQUFBLElBQUksTUFBTSxLQUFLLEdBQUcsRUFBRTtFQUN6QixvQkFBQSxJQUFJLEdBQUcsYUFBYSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7c0JBQ2pDLElBQUksR0FBRyxvQkFBb0I7O0VBQ3RCLHFCQUFBLElBQUksTUFBTSxLQUFLLEdBQUcsRUFBRTtzQkFDekIsSUFBSSxHQUFHLFdBQVcsQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO3NCQUM5QyxJQUFJLEdBQUcsU0FBUzs7a0JBR2xCLE1BQU0sT0FBTyxHQUFHLENBQUMsc0JBQXNCLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7a0JBQ3ZELE1BQU0sS0FBSyxHQUFzQixFQUFFO0VBQ25DLGdCQUFBLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxVQUFVLENBQUMsTUFBTSxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUU7RUFDN0Msb0JBQUEsTUFBTSxRQUFRLEdBQUcsVUFBVSxDQUFDLENBQUMsQ0FBQztzQkFDOUIsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLFVBQVUsQ0FBZSxDQUFDO0VBQ3JELG9CQUFBLE9BQU8sQ0FBQyxJQUFJLENBQUMsc0JBQXNCLENBQUMsVUFBVSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDOztFQUd6RCxnQkFBQSxXQUFXLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQztzQkFDckIsSUFBSSxFQUFFLENBQUM7RUFDUCxvQkFBQSxLQUFLLEVBQUUsU0FBUztzQkFDaEIsSUFBSTtzQkFDSixPQUFPO3NCQUNQLElBQUk7c0JBQ0osTUFBTSxFQUFFLENBQ04sS0FBYSxFQUNiLFNBQTJCLEVBQzNCLFVBQXFCLEtBQ25CO0VBQ0Ysd0JBQUEsT0FBTyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxLQUFLLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7dUJBQ2pEO0VBQ0YsaUJBQUEsQ0FBQzs7O2VBRUMsSUFBSSxJQUFJLENBQUMsUUFBUSxLQUFLLElBQUksQ0FBQyxTQUFTLEVBQUU7Y0FDM0MsSUFBSSxRQUFRLEdBQUcsSUFBWTtFQUMzQixZQUFBLE1BQU0sSUFBSSxHQUFHLFFBQVEsQ0FBQyxXQUFZO2NBQ2xDLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDO0VBQ3hDLFlBQUEsSUFBSSxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtrQkFDdEIsUUFBUSxDQUFDLFdBQVcsR0FBRyxzQkFBc0IsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7O0VBQ3BELGlCQUFBLElBQUksd0JBQXdCLENBQUMsSUFBSSxDQUFDLEVBQUU7RUFDekMsZ0JBQUEsUUFBUSxDQUFDLFdBQVcsR0FBRyxzQkFBc0IsQ0FBQyxJQUFJLENBQUM7O0VBRXJELFlBQUEsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRTtFQUMxQyxnQkFBQSxNQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDO2tCQUMzQixNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsUUFBUSxFQUFFLFVBQVUsQ0FBZTtFQUN0RCxnQkFBQSxXQUFXLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQztFQUNyQixvQkFBQSxJQUFJLEVBQUUsQ0FBQztzQkFDUCxLQUFLLEVBQUUsRUFBRSxTQUFTO0VBQ2xCLG9CQUFBLE1BQU0sRUFBRSxDQUFDLEtBQWMsRUFBRSxTQUEyQixLQUNsRCxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQWMsQ0FBQztFQUNoQyxpQkFBQSxDQUFDO0VBQ0YsZ0JBQUEsTUFBTSxXQUFXLEdBQUcsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO2tCQUNsRSxRQUFRLENBQUMsVUFBVyxDQUFDLFlBQVksQ0FBQyxXQUFXLEVBQUUsUUFBUSxDQUFDLFdBQVcsQ0FBQztFQUNwRSxnQkFBQSxRQUFRLENBQUMsVUFBVyxDQUFDLFlBQVksQ0FDL0IsUUFBUSxDQUFDLGFBQWEsQ0FBQyxFQUFFLENBQUMsRUFDMUIsUUFBUSxDQUFDLFdBQVcsQ0FDckI7a0JBQ0QsUUFBUSxHQUFHLFdBQVc7Ozs7O0VBS3RCLGdCQUFBLE1BQU0sQ0FBQyxXQUFXLEdBQUcsV0FBVzs7OztFQUl0QyxJQUFBLEtBQUssTUFBTSxDQUFDLElBQUksZ0JBQWdCLEVBQUU7VUFDaEMsQ0FBQyxDQUFDLE1BQU0sRUFBRTs7RUFFWixJQUFBLE9BQU8sV0FBVztFQUNwQixDQUFDOztFQzVlRCxTQUFTLE1BQU0sQ0FBQyxRQUFzQyxFQUFBO0VBQ2xELElBQUEsSUFBSSxRQUFRLFlBQVksbUJBQW1CLEVBQUU7RUFDekMsUUFBQSxPQUFPLFFBQVE7O0VBQ1osU0FBQSxJQUFJLFFBQVEsS0FBSyxPQUFPLFFBQVEsRUFBRTtVQUNyQyxNQUFNLE9BQU8sR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQztFQUNsRCxRQUFBLE9BQU8sQ0FBQyxTQUFTLEdBQUcsUUFBUTtFQUM1QixRQUFBLE9BQU8sT0FBTzs7V0FDWDtVQUNILE1BQU0sSUFBSSxTQUFTLENBQUMsQ0FBQSwwQ0FBQSxFQUE2QyxPQUFPLFFBQVEsQ0FBQSxDQUFBLENBQUcsQ0FBQzs7RUFFNUY7RUFFQSxTQUFTLHlCQUF5QixDQUFDLE9BQXVDLEVBQUE7TUFDdEUsTUFBTSxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsYUFBYSxFQUFFLEdBQUcsT0FBTyxJQUFJLEVBQUU7TUFDNUQsT0FBTyxDQUFDLFFBQXNDLEtBQUk7RUFDOUMsUUFBQSxPQUFPLGVBQWUsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxhQUFhLENBQUM7RUFDaEYsS0FBQztFQUNMOzs7Ozs7Ozs7Ozs7OzsiLCJ4X2dvb2dsZV9pZ25vcmVMaXN0IjpbMCwxLDIsMyw0LDUsNiw3LDgsOSwxMCwxMiwxMywxNCwxNSwxNl0sInNvdXJjZVJvb3QiOiJjZHA6Ly8vQGNkcC9leHRlbnNpb24tdGVtcGxhdGUtYnJpZGdlLyJ9