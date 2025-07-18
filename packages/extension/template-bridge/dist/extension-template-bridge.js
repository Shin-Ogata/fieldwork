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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uLXRlbXBsYXRlLWJyaWRnZS5qcyIsInNvdXJjZXMiOlsibGl0LXRyYW5zZm9ybWVyL3NyYy9saXQtdHJhbnNmb3JtZXIuanMiLCJsaXQtdHJhbnNmb3JtZXIvc3JjL2hlbHBlci9kYXRhSGVscGVyLmpzIiwibGl0LXRyYW5zZm9ybWVyL3NyYy90cmFuc2Zvcm1lcnMvdmFyaWFibGVUcmFuc2Zvcm1lci5qcyIsImxpdC10cmFuc2Zvcm1lci9zcmMvdHJhbnNmb3JtZXJzL3Vuc2FmZVZhcmlhYmxlLmpzIiwibGl0LXRyYW5zZm9ybWVyL3NyYy9oZWxwZXIvaXNNdXN0YWNoZUZhbHN5LmpzIiwibGl0LXRyYW5zZm9ybWVyL3NyYy9oZWxwZXIvc2VjdGlvbkhlbHBlci5qcyIsImxpdC10cmFuc2Zvcm1lci9zcmMvdHJhbnNmb3JtZXJzL3NlY3Rpb24uanMiLCJsaXQtdHJhbnNmb3JtZXIvc3JjL3RyYW5zZm9ybWVycy9pbnZlcnRlZFNlY3Rpb24uanMiLCJsaXQtdHJhbnNmb3JtZXIvc3JjL3RyYW5zZm9ybWVycy9jb21tZW50LmpzIiwibGl0LXRyYW5zZm9ybWVyL3NyYy90cmFuc2Zvcm1lcnMvY3VzdG9tRGVsaW1pdGVyLmpzIiwibGl0LXRyYW5zZm9ybWVyL3NyYy9saXQtdHJhbnNmb3JtZXItY29uZmlndXJlZE91dE9mVGhlQm94LmpzIiwiYnJpZGdlLW11c3RhY2hlLnRzIiwiamV4cHIvc3JjL2xpYi9jb25zdGFudHMudHMiLCJqZXhwci9zcmMvbGliL3Rva2VuaXplci50cyIsImpleHByL3NyYy9saWIvcGFyc2VyLnRzIiwiamV4cHIvc3JjL2xpYi9ldmFsLnRzIiwic3RhbXBpbm8vc3JjL3N0YW1waW5vLnRzIiwiYnJpZGdlLXN0YW1waW5vLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qKiBcclxuICogQHBhcmFtIHtvYmplY3R9IGNvbmZpZyA9IHtcclxuICogIGh0bWw6IGxpdC1odG1sLmh0bWwsXHJcbiAqICBkZWxpbWl0ZXI6IHsgc3RhcnQ6ICd7eycsIGVuZDogJ319JyB9LFxyXG4gKiAgdHJhbnNmb3JtZXJzOiB7IC8vIG5vdGUgdGhhdCB0cmFuc2Zvcm1WYXJpYWJsZSBpcyBub3QgaGVyZS4gSXQgZ2V0cyBhcHBsaWVkIHdoZW4gbm8gdHJhbnNmb3JtZXIudGVzdCBoYXMgcGFzc2VkXHJcbiAqICAgIG5hbWU6IHtcclxuICogICAgICB0ZXN0OiAoc3RyLCBjb25maWcpID0+IGJvb2wsXHJcbiAqICAgICAgdHJhbnNmb3JtOiAoc3RyLCBjb25maWcpID0+ICh7XHJcbiAqICAgICAgICByZW1haW5pbmdUbXBsU3RyOiBzdHIsXHJcbiAqICAgICAgICBpbnNlcnRpb25Qb2ludDogY3R4ID0+IGxpdC1odG1sLlRlbXBsYXRlUmVzdWx0IHwgdW5kZWZpbmVkLCAvLyBpZiB1bmRlZmluZWQgcmVtYWluaW5nVG1wbFN0ciB3aWxsIGJlIG1lcmdlZCB3aXRoIGxhc3Qgc3RhdGljIHBhcnQgXHJcbiAqICAgICAgfSksXHJcbiAqICAgIH0sXHJcbiAqICB9LFxyXG4gKiAgdHJhbnNmb3JtVmFyaWFibGUsIFxyXG4gKiB9XHJcbiAqIEByZXR1cm5zIHtmdW5jdGlvbn0gc3RyVGVtcGxhdGUgPT4gY3R4ID0+IGxpdC1odG1sLlRlbXBsYXRlUmVzdWx0XHJcbiAqL1xyXG5leHBvcnQgZGVmYXVsdCBjb25maWcgPT4gc3RyVGVtcGxhdGUgPT4gdHJhbnNmb3JtKHN0clRlbXBsYXRlLCBjb25maWcpXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gdHJhbnNmb3JtKHRtcGwyUGFyc2UsIGNvbmZpZykge1xyXG4gIGNvbnN0IHN0YXRpY1BhcnRzID0gW11cclxuICBjb25zdCBpbnNlcnRpb25Qb2ludHMgPSBbXVxyXG5cclxuICBsZXQgcmVtYWluaW5nVG1wbFN0ciA9IHRtcGwyUGFyc2VcclxuICBsZXQgc3RhcnRJbmRleE9mSVAgPSByZW1haW5pbmdUbXBsU3RyLmluZGV4T2YoY29uZmlnLmRlbGltaXRlci5zdGFydClcclxuICB3aGlsZSAoc3RhcnRJbmRleE9mSVAgPj0gMCkge1xyXG4gICAgaWYgKHJlbWFpbmluZ1RtcGxTdHIuaW5kZXhPZihjb25maWcuZGVsaW1pdGVyLmVuZCwgc3RhcnRJbmRleE9mSVApIDwgMClcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBtaXNzaW5nIGVuZCBkZWxpbWl0ZXIgYXQ6ICcke3JlbWFpbmluZ1RtcGxTdHJ9J2ApXHJcblxyXG4gICAgc3RhdGljUGFydHMucHVzaChyZW1haW5pbmdUbXBsU3RyLnN1YnN0cmluZygwLCBzdGFydEluZGV4T2ZJUCkpXHJcblxyXG4gICAgY29uc3QgaVBUcmFuc2Zvcm1SZXN1bHQgPSB0cmFuc2Zvcm1JUChcclxuICAgICAgcmVtYWluaW5nVG1wbFN0ci5zdWJzdHJpbmcoc3RhcnRJbmRleE9mSVAgKyBjb25maWcuZGVsaW1pdGVyLnN0YXJ0Lmxlbmd0aCksXHJcbiAgICAgIGNvbmZpZ1xyXG4gICAgKVxyXG5cclxuICAgIGlmIChpUFRyYW5zZm9ybVJlc3VsdC5pbnNlcnRpb25Qb2ludCkge1xyXG4gICAgICByZW1haW5pbmdUbXBsU3RyID0gaVBUcmFuc2Zvcm1SZXN1bHQucmVtYWluaW5nVG1wbFN0clxyXG4gICAgICBpbnNlcnRpb25Qb2ludHMucHVzaChpUFRyYW5zZm9ybVJlc3VsdC5pbnNlcnRpb25Qb2ludClcclxuICAgICAgc3RhcnRJbmRleE9mSVAgPSByZW1haW5pbmdUbXBsU3RyLmluZGV4T2YoY29uZmlnLmRlbGltaXRlci5zdGFydClcclxuICAgIH0gZWxzZSB7IC8vIGUuZy4gY29tbWVudCBvciBjdXN0b21EZWxpbWV0ZXJcclxuICAgICAgY29uc3QgbGFzdFN0YXRpY1BhcnQgPSBzdGF0aWNQYXJ0cy5wb3AoKVxyXG4gICAgICByZW1haW5pbmdUbXBsU3RyID0gbGFzdFN0YXRpY1BhcnQgKyBpUFRyYW5zZm9ybVJlc3VsdC5yZW1haW5pbmdUbXBsU3RyXHJcbiAgICAgIHN0YXJ0SW5kZXhPZklQID0gcmVtYWluaW5nVG1wbFN0ci5pbmRleE9mKGNvbmZpZy5kZWxpbWl0ZXIuc3RhcnQsIGxhc3RTdGF0aWNQYXJ0Lmxlbmd0aClcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHN0YXRpY1BhcnRzLnB1c2gocmVtYWluaW5nVG1wbFN0cilcclxuXHJcbiAgcmV0dXJuIGN0eCA9PlxyXG4gICAgY29uZmlnLmh0bWwoc3RhdGljUGFydHMsIC4uLmluc2VydGlvblBvaW50cy5tYXAoaVAgPT4gaVAoY3R4KSkpXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHRyYW5zZm9ybUlQKHJlbWFpbmluZ1RtcGxTdHIsIGNvbmZpZykge1xyXG4gIGNvbnN0IHRyYW5zZm9ybWVyID0gT2JqZWN0LnZhbHVlcyhjb25maWcudHJhbnNmb3JtZXJzKS5maW5kKHQgPT4gdC50ZXN0KHJlbWFpbmluZ1RtcGxTdHIsIGNvbmZpZykpXHJcbiAgY29uc3QgdHJhbnNmb3JtRnVuY3Rpb24gPSB0cmFuc2Zvcm1lclxyXG4gICAgPyB0cmFuc2Zvcm1lci50cmFuc2Zvcm1cclxuICAgIDogY29uZmlnLnRyYW5zZm9ybVZhcmlhYmxlXHJcbiAgcmV0dXJuIHRyYW5zZm9ybUZ1bmN0aW9uKHJlbWFpbmluZ1RtcGxTdHIsIGNvbmZpZylcclxufSIsImV4cG9ydCBmdW5jdGlvbiBjdHgyVmFsdWUoY3R4LCBrZXkpIHtcclxuICBpZiAoa2V5ID09PSAnLicpXHJcbiAgICByZXR1cm4gY3R4XHJcblxyXG4gIGxldCByZXN1bHQgPSBjdHhcclxuICBmb3IgKGxldCBrIG9mIGtleS5zcGxpdCgnLicpKSB7XHJcbiAgICBpZiAoIXJlc3VsdC5oYXNPd25Qcm9wZXJ0eShrKSlcclxuICAgICAgcmV0dXJuICcnXHJcblxyXG4gICAgcmVzdWx0ID0gcmVzdWx0W2tdXHJcbiAgfVxyXG5cclxuICByZXR1cm4gcmVzdWx0XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBjdHgyTXVzdGFjaGVTdHJpbmcoY3R4LCBrZXkpIHtcclxuICByZXR1cm4gbXVzdGFjaGVTdHJpbmd5ZnkoY3R4MlZhbHVlKGN0eCwga2V5KSlcclxufVxyXG5cclxuZnVuY3Rpb24gbXVzdGFjaGVTdHJpbmd5ZnkodmFsdWUpIHtcclxuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gbnVsbClcclxuICAgIHJldHVybiAnJ1xyXG5cclxuICByZXR1cm4gJycgKyB2YWx1ZVxyXG59IiwiaW1wb3J0IHsgY3R4Mk11c3RhY2hlU3RyaW5nIH0gZnJvbSAnLi4vaGVscGVyL2RhdGFIZWxwZXIuanMnXHJcblxyXG5leHBvcnQgZGVmYXVsdCAocmVtYWluaW5nVG1wbFN0ciwgeyBkZWxpbWl0ZXIgfSkgPT4ge1xyXG4gIGNvbnN0IGluZGV4T2ZFbmREZWxpbWl0ZXIgPSByZW1haW5pbmdUbXBsU3RyLmluZGV4T2YoZGVsaW1pdGVyLmVuZClcclxuICBjb25zdCBkYXRhS2V5ID0gcmVtYWluaW5nVG1wbFN0ci5zdWJzdHJpbmcoMCwgaW5kZXhPZkVuZERlbGltaXRlcilcclxuICByZXR1cm4ge1xyXG4gICAgcmVtYWluaW5nVG1wbFN0cjogcmVtYWluaW5nVG1wbFN0ci5zdWJzdHJpbmcoaW5kZXhPZkVuZERlbGltaXRlciArIGRlbGltaXRlci5lbmQubGVuZ3RoKSxcclxuICAgIGluc2VydGlvblBvaW50OiBjdHggPT4gY3R4Mk11c3RhY2hlU3RyaW5nKGN0eCwgZGF0YUtleSlcclxuICB9XHJcbn0iLCJpbXBvcnQgeyBjdHgyTXVzdGFjaGVTdHJpbmcgfSBmcm9tICcuLi9oZWxwZXIvZGF0YUhlbHBlci5qcydcclxuXHJcbi8qKiBOb3RlLCB0aGlzIGlzIHVuc2FmZSB0byB1c2UsIGJlY2F1c2UgdGhlIHJlbmRlcmVkIG91dHB1dCBjb3VsZCBiZSBhbnkgSmF2YVNjcmlwdCEgKi9cclxuZXhwb3J0IGRlZmF1bHQgdW5zYWZlSFRNTCA9PiAoe1xyXG4gIHRlc3Q6IHJlbWFpbmluZ1RtcGxTdHIgPT4gcmVtYWluaW5nVG1wbFN0clswXSA9PT0gJ3snLFxyXG4gIHRyYW5zZm9ybTogKHJlbWFpbmluZ1RtcGxTdHIsIHsgZGVsaW1pdGVyIH0pID0+IHtcclxuICAgIGNvbnN0IGluZGV4T2ZFbmREZWxpbWl0ZXIgPSByZW1haW5pbmdUbXBsU3RyLmluZGV4T2YoJ30nICsgZGVsaW1pdGVyLmVuZClcclxuICAgIGlmIChpbmRleE9mRW5kRGVsaW1pdGVyIDwgMClcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBtaXNzaW5nIGVuZCBkZWxpbWl0ZXIgYXQ6ICcke2RlbGltaXRlci5zdGFydH0ke3JlbWFpbmluZ1RtcGxTdHJ9J2ApXHJcbiAgXHJcbiAgICBjb25zdCBkYXRhS2V5ID0gcmVtYWluaW5nVG1wbFN0ci5zdWJzdHJpbmcoMSwgaW5kZXhPZkVuZERlbGltaXRlcilcclxuICAgIHJldHVybiB7XHJcbiAgICAgIHJlbWFpbmluZ1RtcGxTdHI6IHJlbWFpbmluZ1RtcGxTdHIuc3Vic3RyaW5nKGluZGV4T2ZFbmREZWxpbWl0ZXIgKyAxICsgZGVsaW1pdGVyLmVuZC5sZW5ndGgpLFxyXG4gICAgICBpbnNlcnRpb25Qb2ludDogY3R4ID0+IHVuc2FmZUhUTUwoY3R4Mk11c3RhY2hlU3RyaW5nKGN0eCwgZGF0YUtleSkpLFxyXG4gICAgfVxyXG4gIH1cclxufSkiLCJleHBvcnQgZnVuY3Rpb24gaXNNdXN0YWNoZUZhbHN5KHZhbHVlKSB7XHJcbiAgcmV0dXJuIFtudWxsLCB1bmRlZmluZWQsIGZhbHNlLCAwLCBOYU4sICcnXVxyXG4gICAgLnNvbWUoZmFsc3kgPT4gZmFsc3kgPT09IHZhbHVlKVxyXG4gICAgfHwgKHZhbHVlLmxlbmd0aCAmJiB2YWx1ZS5sZW5ndGggPT09IDApXHJcbn0iLCJleHBvcnQgZnVuY3Rpb24gcGFyc2VTZWN0aW9uKHRtcGxTdHIsIGRlbGltaXRlcikge1xyXG4gIGNvbnN0IGluZGV4T2ZTdGFydFRhZ0VuZCA9IHRtcGxTdHIuaW5kZXhPZihkZWxpbWl0ZXIuZW5kKVxyXG4gIGNvbnN0IGRhdGFLZXkgPSB0bXBsU3RyLnN1YnN0cmluZygxLCBpbmRleE9mU3RhcnRUYWdFbmQpXHJcbiAgY29uc3QgZW5kVGFnID0gYCR7ZGVsaW1pdGVyLnN0YXJ0fS8ke2RhdGFLZXl9JHtkZWxpbWl0ZXIuZW5kfWBcclxuICBjb25zdCBpbmRleE9mRW5kVGFnU3RhcnQgPSB0bXBsU3RyLmluZGV4T2YoZW5kVGFnKVxyXG4gIGlmIChpbmRleE9mRW5kVGFnU3RhcnQgPCAwKVxyXG4gICAgdGhyb3cgbmV3IEVycm9yKGBtaXNzaW5nIGVuZCBkZWxpbWl0ZXIgYXQ6ICcke2RlbGltaXRlci5zdGFydH0ke3RtcGxTdHJ9J2ApXHJcbiAgXHJcbiAgcmV0dXJuIHtcclxuICAgIGRhdGFLZXksXHJcbiAgICBpbm5lclRtcGw6IHRtcGxTdHIuc3Vic3RyaW5nKGluZGV4T2ZTdGFydFRhZ0VuZCArIGRlbGltaXRlci5zdGFydC5sZW5ndGgsIGluZGV4T2ZFbmRUYWdTdGFydCksXHJcbiAgICByZW1haW5pbmdUbXBsU3RyOiB0bXBsU3RyLnN1YnN0cmluZyhpbmRleE9mRW5kVGFnU3RhcnQgKyBlbmRUYWcubGVuZ3RoKSxcclxuICB9XHJcbn0iLCJpbXBvcnQgeyB0cmFuc2Zvcm0gfSBmcm9tICcuLi9saXQtdHJhbnNmb3JtZXIuanMnXHJcbmltcG9ydCB7IGN0eDJWYWx1ZSB9IGZyb20gJy4uL2hlbHBlci9kYXRhSGVscGVyLmpzJ1xyXG5pbXBvcnQgeyBpc011c3RhY2hlRmFsc3kgfSBmcm9tICcuLi9oZWxwZXIvaXNNdXN0YWNoZUZhbHN5LmpzJ1xyXG5pbXBvcnQgeyBwYXJzZVNlY3Rpb24gfSBmcm9tICcuLi9oZWxwZXIvc2VjdGlvbkhlbHBlci5qcydcclxuXHJcbi8qKiBOb3RlLCB1bmxpa2Ugd2l0aGluIG11c3RhY2hlIGZ1bmN0aW9ucyBhcyBkYXRhIHZhbHVlcyBhcmUgbm90IHN1cHBvcnRlZCBvdXQgb2YgdGhlIGJveCAqL1xyXG5leHBvcnQgZGVmYXVsdCAoKSA9PiAoe1xyXG4gIHRlc3Q6IHJlbWFpbmluZ1RtcGxTdHIgPT4gcmVtYWluaW5nVG1wbFN0clswXSA9PT0gJyMnLFxyXG4gIHRyYW5zZm9ybTogKHJlbWFpbmluZ1RtcGxTdHIsIGNvbmZpZykgPT4ge1xyXG4gICAgY29uc3QgcGFyc2VkU2VjdGlvbiA9IHBhcnNlU2VjdGlvbihyZW1haW5pbmdUbXBsU3RyLCBjb25maWcuZGVsaW1pdGVyKVxyXG4gICAgY29uc3QgdHJhbnNmb3JtZWRJbm5lclRtcGwgPSB0cmFuc2Zvcm0ocGFyc2VkU2VjdGlvbi5pbm5lclRtcGwsIGNvbmZpZylcclxuICAgIFxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgcmVtYWluaW5nVG1wbFN0cjogcGFyc2VkU2VjdGlvbi5yZW1haW5pbmdUbXBsU3RyLFxyXG4gICAgICBpbnNlcnRpb25Qb2ludDogY3R4ID0+IHtcclxuICAgICAgICBjb25zdCBzZWN0aW9uRGF0YSA9IGN0eDJWYWx1ZShjdHgsIHBhcnNlZFNlY3Rpb24uZGF0YUtleSlcclxuICAgICAgICBcclxuICAgICAgICBpZiAoaXNNdXN0YWNoZUZhbHN5KHNlY3Rpb25EYXRhKSlcclxuICAgICAgICAgIHJldHVybiAnJztcclxuXHJcbiAgICAgICAgcmV0dXJuIHNlY3Rpb25EYXRhLm1hcFxyXG4gICAgICAgICAgPyBzZWN0aW9uRGF0YS5tYXAoaW5uZXJDdHggPT4gdHJhbnNmb3JtZWRJbm5lclRtcGwoaW5uZXJDdHgpKVxyXG4gICAgICAgICAgOiB0cmFuc2Zvcm1lZElubmVyVG1wbChjdHgpXHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcbn0pIiwiaW1wb3J0IHsgdHJhbnNmb3JtIH0gZnJvbSAnLi4vbGl0LXRyYW5zZm9ybWVyLmpzJ1xuaW1wb3J0IHsgY3R4MlZhbHVlIH0gZnJvbSAnLi4vaGVscGVyL2RhdGFIZWxwZXIuanMnXG5pbXBvcnQgeyBpc011c3RhY2hlRmFsc3kgfSBmcm9tICcuLi9oZWxwZXIvaXNNdXN0YWNoZUZhbHN5LmpzJ1xuaW1wb3J0IHsgcGFyc2VTZWN0aW9uIH0gZnJvbSAnLi4vaGVscGVyL3NlY3Rpb25IZWxwZXIuanMnXG5cbmV4cG9ydCBkZWZhdWx0ICgpID0+ICh7XG4gIHRlc3Q6IHJlbWFpbmluZ1RtcGxTdHIgPT4gcmVtYWluaW5nVG1wbFN0clswXSA9PT0gJ14nLFxuICAvKlxuICAgKiBwYXRjaCBmb3Igdi4xLjAuMlxuICAgKiBhcHBseSB0cmFuc2Zvcm1lZElubmVyVG1wbCgpXG4gICAqL1xuICB0cmFuc2Zvcm06IChyZW1haW5pbmdUbXBsU3RyLCBjb25maWcpID0+IHtcbiAgICBjb25zdCBwYXJzZWRTZWN0aW9uID0gcGFyc2VTZWN0aW9uKHJlbWFpbmluZ1RtcGxTdHIsIGNvbmZpZy5kZWxpbWl0ZXIpXG4gICAgY29uc3QgdHJhbnNmb3JtZWRJbm5lclRtcGwgPSB0cmFuc2Zvcm0ocGFyc2VkU2VjdGlvbi5pbm5lclRtcGwsIGNvbmZpZylcbiAgICBcbiAgICByZXR1cm4ge1xuICAgICAgcmVtYWluaW5nVG1wbFN0cjogcGFyc2VkU2VjdGlvbi5yZW1haW5pbmdUbXBsU3RyLFxuICAgICAgaW5zZXJ0aW9uUG9pbnQ6IGN0eCA9PiB7XG4gICAgICAgIGNvbnN0IHNlY3Rpb25EYXRhID0gY3R4MlZhbHVlKGN0eCwgcGFyc2VkU2VjdGlvbi5kYXRhS2V5KVxuICAgICAgICBcbiAgICAgICAgaWYgKGlzTXVzdGFjaGVGYWxzeShzZWN0aW9uRGF0YSkpXG4gICAgICAgICAgcmV0dXJuIHNlY3Rpb25EYXRhLm1hcFxuICAgICAgICAgICAgPyBzZWN0aW9uRGF0YS5tYXAoaW5uZXJDdHggPT4gdHJhbnNmb3JtZWRJbm5lclRtcGwoaW5uZXJDdHgpKVxuICAgICAgICAgICAgOiB0cmFuc2Zvcm1lZElubmVyVG1wbChjdHgpXG4gICAgICAgIHJldHVybiAnJztcbiAgICAgIH1cbiAgICB9XG4gIH1cbn0pXG4iLCJleHBvcnQgZGVmYXVsdCAoKSA9PiAoe1xyXG4gIHRlc3Q6IHJlbWFpbmluZ1RtcGxTdHIgPT4gcmVtYWluaW5nVG1wbFN0clswXSA9PT0gJyEnLFxyXG4gIHRyYW5zZm9ybTogKHJlbWFpbmluZ1RtcGxTdHIsIHsgZGVsaW1pdGVyIH0pID0+ICh7XHJcbiAgICByZW1haW5pbmdUbXBsU3RyOiByZW1haW5pbmdUbXBsU3RyLnN1YnN0cmluZyhyZW1haW5pbmdUbXBsU3RyLmluZGV4T2YoZGVsaW1pdGVyLmVuZCkgKyBkZWxpbWl0ZXIuZW5kLmxlbmd0aCksXHJcbiAgICBpbnNlcnRpb25Qb2ludDogdW5kZWZpbmVkLFxyXG4gIH0pXHJcbn0pIiwiZXhwb3J0IGRlZmF1bHQgKCkgPT4gKHtcclxuICB0ZXN0OiByZW1haW5pbmdUbXBsU3RyID0+IHJlbWFpbmluZ1RtcGxTdHJbMF0gPT09ICc9JyxcclxuICB0cmFuc2Zvcm06IChyZW1haW5pbmdUbXBsU3RyLCBjb25maWcpID0+IHtcclxuICAgIGNvbnN0IG9yaWdpbmFsRW5kRGVsaUxlbmd0aCA9IGNvbmZpZy5kZWxpbWl0ZXIuZW5kLmxlbmd0aFxyXG4gICAgY29uc3QgaW5kZXhPZkVuZFRhZyA9IHJlbWFpbmluZ1RtcGxTdHIuaW5kZXhPZignPScgKyBjb25maWcuZGVsaW1pdGVyLmVuZClcclxuICAgIGlmIChpbmRleE9mRW5kVGFnIDwgMCApXHJcbiAgICAgIHRocm93IG5ldyBFcnJvcihgbWlzc2luZyBlbmQgZGVsaW1pdGVyIGF0OiAnJHtyZW1haW5pbmdUbXBsU3RyfSdgKVxyXG5cclxuICAgIGNvbnN0IFsgbmV3U3RhcnREZWxpLCBuZXdFbmREZWxpIF0gPSByZW1haW5pbmdUbXBsU3RyLnN1YnN0cmluZygxLCBpbmRleE9mRW5kVGFnKS5zcGxpdCgnICcpXHJcblxyXG4gICAgY29uZmlnLmRlbGltaXRlci5zdGFydCA9IG5ld1N0YXJ0RGVsaVxyXG4gICAgY29uZmlnLmRlbGltaXRlci5lbmQgPSBuZXdFbmREZWxpXHJcbiAgICBcclxuICAgIHJldHVybiB7XHJcbiAgICAgIHJlbWFpbmluZ1RtcGxTdHI6IHJlbWFpbmluZ1RtcGxTdHIuc3Vic3RyaW5nKGluZGV4T2ZFbmRUYWcgKyAxICsgb3JpZ2luYWxFbmREZWxpTGVuZ3RoKSxcclxuICAgICAgaW5zZXJ0aW9uUG9pbnQ6IHVuZGVmaW5lZCwgIFxyXG4gICAgfVxyXG4gIH1cclxufSkiLCJpbXBvcnQgY3JlYXRlVHJhbnNmb3JtIGZyb20gJy4vbGl0LXRyYW5zZm9ybWVyLmpzJ1xyXG5pbXBvcnQgdHJhbnNmb3JtVmFyaWFibGUgZnJvbSAnLi90cmFuc2Zvcm1lcnMvdmFyaWFibGVUcmFuc2Zvcm1lci5qcydcclxuaW1wb3J0IHVuc2FmZVZhcmlhYmxlVHJhbnNmb3JtZXIgZnJvbSAnLi90cmFuc2Zvcm1lcnMvdW5zYWZlVmFyaWFibGUuanMnXHJcbmltcG9ydCBzZWN0aW9uVHJhbnNmb3JtZXIgZnJvbSAnLi90cmFuc2Zvcm1lcnMvc2VjdGlvbi5qcydcclxuaW1wb3J0IGludmVydGVkU2VjdGlvblRyYW5zZm9ybWVyIGZyb20gJy4vdHJhbnNmb3JtZXJzL2ludmVydGVkU2VjdGlvbi5qcydcclxuaW1wb3J0IGNvbW1lbnRUcmFuc2Zvcm1lciBmcm9tICcuL3RyYW5zZm9ybWVycy9jb21tZW50LmpzJ1xyXG5pbXBvcnQgY3VzdG9tRGVsaW1pdGVyVHJhbnNmb3JtZXIgZnJvbSAnLi90cmFuc2Zvcm1lcnMvY3VzdG9tRGVsaW1pdGVyLmpzJ1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgKGh0bWwsIHVuc2FmZUhUTUwpID0+XHJcbiAgY3JlYXRlVHJhbnNmb3JtKHtcclxuICAgIGh0bWwsXHJcbiAgICBkZWxpbWl0ZXI6IHsgc3RhcnQ6ICd7eycsIGVuZDogJ319JyB9LFxyXG4gICAgdHJhbnNmb3JtVmFyaWFibGUsXHJcbiAgICB0cmFuc2Zvcm1lcnM6IHtcclxuICAgICAgdW5zYWZlVmFyaWFibGU6IHVuc2FmZVZhcmlhYmxlVHJhbnNmb3JtZXIodW5zYWZlSFRNTCksXHJcbiAgICAgIHNlY3Rpb246IHNlY3Rpb25UcmFuc2Zvcm1lcigpLFxyXG4gICAgICBpbnZlcnRlZFNlY3Rpb246IGludmVydGVkU2VjdGlvblRyYW5zZm9ybWVyKCksXHJcbiAgICAgIGNvbW1lbnQ6IGNvbW1lbnRUcmFuc2Zvcm1lcigpLFxyXG4gICAgICBjdXN0b21EZWxpbWl0ZXJUcmFuc2Zvcm1lcjogY3VzdG9tRGVsaW1pdGVyVHJhbnNmb3JtZXIoKSxcclxuICAgIH0sXHJcbiAgfSkiLCJpbXBvcnQgeyB0b1RlbXBsYXRlU3RyaW5nc0FycmF5IH0gZnJvbSAnQGNkcC9leHRlbnNpb24tdGVtcGxhdGUnO1xuaW1wb3J0IHR5cGUgeyBUZW1wbGF0ZUJyaWRnZUVuZGluZSwgVGVtcGxhdGVUcmFuc2Zvcm1lciB9IGZyb20gJ0BicmlkZ2UvaW50ZXJmYWNlcyc7XG5pbXBvcnQgdHlwZSB7XG4gICAgTXVzdGFjaGVUcmFuc2Zvcm1lcixcbiAgICBUZW1wbGF0ZVRhZyxcbiAgICBUcmFuc2Zvcm1EaXJlY3RpdmUsXG4gICAgVHJhbnNmb3JtVGVzdGVyLFxuICAgIFRyYW5zZm9ybUV4ZWN1dG9yLFxuICAgIFRyYW5zZm9ybWVDb250ZXh0LFxuICAgIFRyYW5zZm9ybUNvbmZpZyxcbn0gZnJvbSAnbGl0LXRyYW5zZm9ybWVyL3NyYy9pbnRlcmZhY2VzJztcblxuaW1wb3J0IGNyZWF0ZURlZmF1bHQgZnJvbSAnbGl0LXRyYW5zZm9ybWVyJztcbmltcG9ydCBjcmVhdGVDdXN0b20gZnJvbSAnbGl0LXRyYW5zZm9ybWVyL3NyYy9saXQtdHJhbnNmb3JtZXInO1xuXG5pbXBvcnQgdmFyaWFibGUgZnJvbSAnbGl0LXRyYW5zZm9ybWVyL3NyYy90cmFuc2Zvcm1lcnMvdmFyaWFibGVUcmFuc2Zvcm1lcic7XG5pbXBvcnQgdW5zYWZlVmFyaWFibGUgZnJvbSAnbGl0LXRyYW5zZm9ybWVyL3NyYy90cmFuc2Zvcm1lcnMvdW5zYWZlVmFyaWFibGUnO1xuaW1wb3J0IHNlY3Rpb24gZnJvbSAnbGl0LXRyYW5zZm9ybWVyL3NyYy90cmFuc2Zvcm1lcnMvc2VjdGlvbic7XG5pbXBvcnQgaW52ZXJ0ZWRTZWN0aW9uIGZyb20gJ2xpdC10cmFuc2Zvcm1lci9zcmMvdHJhbnNmb3JtZXJzL2ludmVydGVkU2VjdGlvbic7XG5pbXBvcnQgY29tbWVudCBmcm9tICdsaXQtdHJhbnNmb3JtZXIvc3JjL3RyYW5zZm9ybWVycy9jb21tZW50JztcbmltcG9ydCBjdXN0b21EZWxpbWl0ZXIgZnJvbSAnbGl0LXRyYW5zZm9ybWVyL3NyYy90cmFuc2Zvcm1lcnMvY3VzdG9tRGVsaW1pdGVyJztcblxuLyoqIEBpbnRlcm5hbCAqL1xudHlwZSBNdXN0YWNoZVRyYW5zZm9ybWVyQ29udGV4dCA9IE11c3RhY2hlVHJhbnNmb3JtZXIgJiB7IGRlbGltaXRlcjogeyBzdGFydDogc3RyaW5nOyBlbmQ6IHN0cmluZzsgfTsgfTtcblxuY29uc3QgeGZvcm0gPSAobXVzdGFjaGU6IE11c3RhY2hlVHJhbnNmb3JtZXJDb250ZXh0KTogVGVtcGxhdGVUcmFuc2Zvcm1lciA9PiB7XG4gICAgcmV0dXJuICh0ZW1wbGF0ZTogSFRNTFRlbXBsYXRlRWxlbWVudCB8IHN0cmluZyk6IFRlbXBsYXRlQnJpZGdlRW5kaW5lID0+IHtcbiAgICAgICAgY29uc3QgeyBzdGFydCwgZW5kIH0gPSBtdXN0YWNoZS5kZWxpbWl0ZXI7XG5cbiAgICAgICAgLy8g44Kz44Oh44Oz44OI44OW44Ot44OD44Kv5YaF44GuIGRlbGltaXRlciDmir3lh7pcbiAgICAgICAgY29uc3QgcmVnQ29tbWVudFJlbW92ZVN0YXJ0ID0gbmV3IFJlZ0V4cChgPCEtLVxcXFxzKiR7c3RhcnR9YCwgJ2cnKTtcbiAgICAgICAgY29uc3QgcmVnQ29tbWVudFJlbW92ZUVuZCAgID0gbmV3IFJlZ0V4cChgJHtlbmR9XFxcXHMqLS0+YCwgJ2cnKTtcbiAgICAgICAgLy8gZGVsaW1pdGVyIOWJjeW+jOOBriB0cmltIOeUqOato+imj+ihqOePvlxuICAgICAgICBjb25zdCByZWdUcmltID0gbmV3IFJlZ0V4cChgKCR7c3RhcnR9WyNeL10/KVxcXFxzKihbXFxcXHdcXFxcLl0rKVxcXFxzKigke2VuZH0pYCwgJ2cnKTtcblxuICAgICAgICBjb25zdCBib2R5ID0gKHRlbXBsYXRlIGluc3RhbmNlb2YgSFRNTFRlbXBsYXRlRWxlbWVudCA/IHRlbXBsYXRlLmlubmVySFRNTCA6IHRlbXBsYXRlKVxuICAgICAgICAgICAgLnJlcGxhY2UocmVnQ29tbWVudFJlbW92ZVN0YXJ0LCBzdGFydClcbiAgICAgICAgICAgIC5yZXBsYWNlKHJlZ0NvbW1lbnRSZW1vdmVFbmQsIGVuZClcbiAgICAgICAgICAgIC5yZXBsYWNlKHJlZ1RyaW0sICckMSQyJDMnKVxuICAgICAgICA7XG5cbiAgICAgICAgcmV0dXJuIG11c3RhY2hlKGJvZHkpO1xuICAgIH07XG59O1xuXG4vKlxuICogbGl0LWh0bWwgdjIuMS4wK1xuICogVGVtcGxhdGVTdHJpbmdzQXJyYXkg44KS5Y6z5a+G44Gr44OB44Kn44OD44Kv44GZ44KL44KI44GG44Gr44Gq44Gj44Gf44Gf44KBIHBhdGNoIOOCkuOBguOBpuOCi1xuICogaHR0cHM6Ly9naXRodWIuY29tL2xpdC9saXQvcHVsbC8yMzA3XG4gKlxuICog5bCG5p2lIGBBcnJheS5pc1RlbXBsYXRlT2JqZWN0KClgIOOCkuS9v+eUqOOBleOCjOOCi+WgtOWQiCwg5pys5a++5b+c44KC6KaL55u044GZ5b+F6KaB44GC44KKXG4gKiBodHRwczovL3RjMzkuZXMvcHJvcG9zYWwtYXJyYXktaXMtdGVtcGxhdGUtb2JqZWN0L1xuICovXG5jb25zdCBwYXRjaCA9IChodG1sOiBUZW1wbGF0ZVRhZyk6IFRlbXBsYXRlVGFnID0+IHtcbiAgICByZXR1cm4gKHRlbXBsYXRlOiBUZW1wbGF0ZVN0cmluZ3NBcnJheSwgLi4udmFsdWVzOiB1bmtub3duW10pID0+IHtcbiAgICAgICAgcmV0dXJuIGh0bWwodG9UZW1wbGF0ZVN0cmluZ3NBcnJheSh0ZW1wbGF0ZSksIC4uLnZhbHVlcyk7XG4gICAgfTtcbn07XG5cbmZ1bmN0aW9uIGNyZWF0ZU11c3RhY2hlVHJhbnNmb3JtZXIoaHRtbDogVGVtcGxhdGVUYWcsIHVuc2FmZUhUTUw6IFRyYW5zZm9ybURpcmVjdGl2ZSk6IFRlbXBsYXRlVHJhbnNmb3JtZXI7XG5mdW5jdGlvbiBjcmVhdGVNdXN0YWNoZVRyYW5zZm9ybWVyKGNvbmZpZzogVHJhbnNmb3JtQ29uZmlnKTogVGVtcGxhdGVUcmFuc2Zvcm1lcjtcbmZ1bmN0aW9uIGNyZWF0ZU11c3RhY2hlVHJhbnNmb3JtZXIoYXJnMTogdW5rbm93biwgYXJnMj86IHVua25vd24pOiBUZW1wbGF0ZVRyYW5zZm9ybWVyIHtcbiAgICBjb25zdCBkZWxpbWl0ZXIgPSB7IHN0YXJ0OiAne3snLCBlbmQ6ICd9fScgfTtcbiAgICBsZXQgdHJhbnNmb3JtZXI6IE11c3RhY2hlVHJhbnNmb3JtZXJDb250ZXh0O1xuICAgIGlmICgnZnVuY3Rpb24nID09PSB0eXBlb2YgYXJnMSkge1xuICAgICAgICB0cmFuc2Zvcm1lciA9IGNyZWF0ZURlZmF1bHQocGF0Y2goYXJnMSBhcyBUZW1wbGF0ZVRhZyksIGFyZzIgYXMgVHJhbnNmb3JtRGlyZWN0aXZlKSBhcyBNdXN0YWNoZVRyYW5zZm9ybWVyQ29udGV4dDtcbiAgICAgICAgdHJhbnNmb3JtZXIuZGVsaW1pdGVyID0gZGVsaW1pdGVyO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IHsgaHRtbCB9ID0gYXJnMSBhcyB7IGh0bWw6IFRlbXBsYXRlVGFnOyB9O1xuICAgICAgICBjb25zdCBjb25maWcgPSBPYmplY3QuYXNzaWduKHtcbiAgICAgICAgICAgIGRlbGltaXRlcixcbiAgICAgICAgICAgIHRyYW5zZm9ybWVyczoge30sXG4gICAgICAgIH0sIGFyZzEsIHsgaHRtbDogcGF0Y2goaHRtbCkgfSkgYXMgVHJhbnNmb3JtQ29uZmlnO1xuICAgICAgICB0cmFuc2Zvcm1lciA9IGNyZWF0ZUN1c3RvbShjb25maWcpIGFzIE11c3RhY2hlVHJhbnNmb3JtZXJDb250ZXh0O1xuICAgICAgICB0cmFuc2Zvcm1lci5kZWxpbWl0ZXIgPSBjb25maWcuZGVsaW1pdGVyITtcbiAgICB9XG4gICAgcmV0dXJuIHhmb3JtKHRyYW5zZm9ybWVyKTtcbn1cblxuY29uc3QgdHJhbnNmb3JtZXI6IHtcbiAgICB2YXJpYWJsZTogVHJhbnNmb3JtRXhlY3V0b3I7XG4gICAgdW5zYWZlVmFyaWFibGU6ICh1bnNhZmVIVE1MOiBUcmFuc2Zvcm1EaXJlY3RpdmUpID0+IFRyYW5zZm9ybWVDb250ZXh0O1xuICAgIHNlY3Rpb246ICgpID0+IFRyYW5zZm9ybWVDb250ZXh0O1xuICAgIGludmVydGVkU2VjdGlvbjogKCkgPT4gVHJhbnNmb3JtZUNvbnRleHQ7XG4gICAgY29tbWVudDogKCkgPT4gVHJhbnNmb3JtZUNvbnRleHQ7XG4gICAgY3VzdG9tRGVsaW1pdGVyOiAoKSA9PiBUcmFuc2Zvcm1lQ29udGV4dDtcbn0gPSB7XG4gICAgdmFyaWFibGUsXG4gICAgdW5zYWZlVmFyaWFibGUsXG4gICAgc2VjdGlvbixcbiAgICBpbnZlcnRlZFNlY3Rpb24sXG4gICAgY29tbWVudCxcbiAgICBjdXN0b21EZWxpbWl0ZXIsXG59O1xuXG5leHBvcnQge1xuICAgIFRlbXBsYXRlVGFnLFxuICAgIFRyYW5zZm9ybURpcmVjdGl2ZSxcbiAgICBUZW1wbGF0ZVRyYW5zZm9ybWVyLFxuICAgIFRyYW5zZm9ybVRlc3RlcixcbiAgICBUcmFuc2Zvcm1FeGVjdXRvcixcbiAgICBUcmFuc2Zvcm1lQ29udGV4dCxcbiAgICBUcmFuc2Zvcm1Db25maWcsXG4gICAgY3JlYXRlTXVzdGFjaGVUcmFuc2Zvcm1lcixcbiAgICB0cmFuc2Zvcm1lcixcbn07XG4iLG51bGwsbnVsbCxudWxsLG51bGwsbnVsbCwiaW1wb3J0IHR5cGUge1xuICAgIFRlbXBsYXRlQnJpZGdlQXJnLFxuICAgIFRlbXBsYXRlVHJhbnNmb3JtZXIsXG59IGZyb20gJ0BicmlkZ2UvaW50ZXJmYWNlcyc7XG5pbXBvcnQge1xuICAgIFRlbXBsYXRlSGFuZGxlcixcbiAgICBUZW1wbGF0ZUhhbmRsZXJzLFxuICAgIFRlbXBsYXRlUmVuZGVyZXJzLFxuICAgIEV2YWx1YXRlVGVtcGxhdGVSZXN1bHQsXG4gICAgcHJlcGFyZVRlbXBsYXRlLFxuICAgIGV2YWx1YXRlVGVtcGxhdGUsXG59IGZyb20gJ3N0YW1waW5vJztcblxuZXhwb3J0IGludGVyZmFjZSBDcmVhdGVTdGFtcGlub1RlbXBsYXRlT3B0aW9ucyB7XG4gICAgaGFuZGxlcnM/OiBUZW1wbGF0ZUhhbmRsZXJzO1xuICAgIHJlbmRlcmVycz86IFRlbXBsYXRlUmVuZGVyZXJzO1xuICAgIHN1cGVyVGVtcGxhdGU/OiBIVE1MVGVtcGxhdGVFbGVtZW50IHwgdW5kZWZpbmVkO1xufVxuXG5mdW5jdGlvbiBlbnN1cmUodGVtcGxhdGU6IEhUTUxUZW1wbGF0ZUVsZW1lbnQgfCBzdHJpbmcpOiBIVE1MVGVtcGxhdGVFbGVtZW50IHtcbiAgICBpZiAodGVtcGxhdGUgaW5zdGFuY2VvZiBIVE1MVGVtcGxhdGVFbGVtZW50KSB7XG4gICAgICAgIHJldHVybiB0ZW1wbGF0ZTtcbiAgICB9IGVsc2UgaWYgKCdzdHJpbmcnID09PSB0eXBlb2YgdGVtcGxhdGUpIHtcbiAgICAgICAgY29uc3QgZWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3RlbXBsYXRlJyk7XG4gICAgICAgIGVsZW1lbnQuaW5uZXJIVE1MID0gdGVtcGxhdGU7XG4gICAgICAgIHJldHVybiBlbGVtZW50O1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYFR5cGUgb2YgdGVtcGxhdGUgaXMgbm90IGEgdmFsaWQuIFt0eXBlb2Y6ICR7dHlwZW9mIHRlbXBsYXRlfV1gKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZVN0YW1waW5vVHJhbnNmb3JtZXIob3B0aW9ucz86IENyZWF0ZVN0YW1waW5vVGVtcGxhdGVPcHRpb25zKTogVGVtcGxhdGVUcmFuc2Zvcm1lciB7XG4gICAgY29uc3QgeyBoYW5kbGVycywgcmVuZGVyZXJzLCBzdXBlclRlbXBsYXRlIH0gPSBvcHRpb25zID8/IHt9O1xuICAgIHJldHVybiAodGVtcGxhdGU6IEhUTUxUZW1wbGF0ZUVsZW1lbnQgfCBzdHJpbmcpID0+IHtcbiAgICAgICAgcmV0dXJuIHByZXBhcmVUZW1wbGF0ZShlbnN1cmUodGVtcGxhdGUpLCBoYW5kbGVycywgcmVuZGVyZXJzLCBzdXBlclRlbXBsYXRlKTtcbiAgICB9O1xufVxuXG5leHBvcnQge1xuICAgIFRlbXBsYXRlQnJpZGdlQXJnLFxuICAgIFRlbXBsYXRlSGFuZGxlcixcbiAgICBUZW1wbGF0ZUhhbmRsZXJzLFxuICAgIFRlbXBsYXRlUmVuZGVyZXJzLFxuICAgIEV2YWx1YXRlVGVtcGxhdGVSZXN1bHQsXG4gICAgY3JlYXRlU3RhbXBpbm9UcmFuc2Zvcm1lcixcbiAgICBwcmVwYXJlVGVtcGxhdGUsXG4gICAgZXZhbHVhdGVUZW1wbGF0ZSxcbn07XG4iXSwibmFtZXMiOlsiY3JlYXRlVHJhbnNmb3JtIiwidHJhbnNmb3JtVmFyaWFibGUiLCJ1bnNhZmVWYXJpYWJsZVRyYW5zZm9ybWVyIiwic2VjdGlvblRyYW5zZm9ybWVyIiwiaW52ZXJ0ZWRTZWN0aW9uVHJhbnNmb3JtZXIiLCJjb21tZW50VHJhbnNmb3JtZXIiLCJjdXN0b21EZWxpbWl0ZXJUcmFuc2Zvcm1lciIsInRvVGVtcGxhdGVTdHJpbmdzQXJyYXkiLCJfJExIIiwibm90aGluZyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7RUFBQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0FBQ0EsdUJBQWUsTUFBTSxJQUFJLFdBQVcsSUFBSSxTQUFTLENBQUMsV0FBVyxFQUFFLE1BQU0sRUFBQztBQUN0RTtFQUNPLFNBQVMsU0FBUyxDQUFDLFVBQVUsRUFBRSxNQUFNLEVBQUU7RUFDOUMsRUFBRSxNQUFNLFdBQVcsR0FBRyxHQUFFO0VBQ3hCLEVBQUUsTUFBTSxlQUFlLEdBQUcsR0FBRTtBQUM1QjtFQUNBLEVBQUUsSUFBSSxnQkFBZ0IsR0FBRyxXQUFVO0VBQ25DLEVBQUUsSUFBSSxjQUFjLEdBQUcsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFDO0VBQ3ZFLEVBQUUsT0FBTyxjQUFjLElBQUksQ0FBQyxFQUFFO0VBQzlCLElBQUksSUFBSSxnQkFBZ0Is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RUFBQTtFQUNsRCxJQUFBLElBQUksUUFBUSxZQUFZLG1CQUFtQixFQUFFO0VBQ3pDLFFBQUEsT0FBTyxRQUFRO01BQ25CO0VBQU8sU0FBQSxJQUFJLFFBQVEsS0FBSyxPQUFPLFFBQVEsRUFBRTtVQUNyQyxNQUFNLE9BQU8sR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQztFQUNsRCxRQUFBLE9BQU8sQ0FBQyxTQUFTLEdBQUcsUUFBUTtFQUM1QixRQUFBLE9BQU8sT0FBTztNQUNsQjtXQUFPO1VBQ0gsTUFBTSxJQUFJLFNBQVMsQ0FBQyxDQUFBLDBDQUFBLEVBQTZDLE9BQU8sUUFBUSxDQUFBLENBQUEsQ0FBRyxDQUFDO01BQ3hGO0VBQ0o7RUFFQSxTQUFTLHlCQUF5QixDQUFDLE9BQXVDLEVBQUE7TUFDdEUsTUFBTSxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsYUFBYSxFQUFFLEdBQUcsT0FBTyxJQUFJLEVBQUU7TUFDNUQsT0FBTyxDQUFDLFFBQXNDLEtBQUk7RUFDOUMsUUFBQSxPQUFPLGVBQWUsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxhQUFhLENBQUM7RUFDaEYsSUFBQSxDQUFDO0VBQ0w7Ozs7Ozs7Ozs7Ozs7OyIsInhfZ29vZ2xlX2lnbm9yZUxpc3QiOlswLDEsMiwzLDQsNSw2LDcsOCw5LDEwLDEyLDEzLDE0LDE1LDE2XSwic291cmNlUm9vdCI6ImNkcDovLy9AY2RwL2V4dGVuc2lvbi10ZW1wbGF0ZS1icmlkZ2UvIn0=