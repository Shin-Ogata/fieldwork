/*!
 * @cdp/extension-template-bridge 0.9.18
 *   extension for HTML templates bridge.
 */

import { toTemplateStringsArray, _$LH, nothing } from '@cdp/extension-template';

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
        return html(toTemplateStringsArray(template), ...values);
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

const { AttributePart, PropertyPart, BooleanAttributePart, EventPart } = _$LH;
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
            return nothing;
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

export { createMustacheTransformer, createStampinoTransformer, evaluateTemplate, prepareTemplate, transformer };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uLXRlbXBsYXRlLWJyaWRnZS5tanMiLCJzb3VyY2VzIjpbImxpdC10cmFuc2Zvcm1lci9zcmMvbGl0LXRyYW5zZm9ybWVyLmpzIiwibGl0LXRyYW5zZm9ybWVyL3NyYy9oZWxwZXIvZGF0YUhlbHBlci5qcyIsImxpdC10cmFuc2Zvcm1lci9zcmMvdHJhbnNmb3JtZXJzL3ZhcmlhYmxlVHJhbnNmb3JtZXIuanMiLCJsaXQtdHJhbnNmb3JtZXIvc3JjL3RyYW5zZm9ybWVycy91bnNhZmVWYXJpYWJsZS5qcyIsImxpdC10cmFuc2Zvcm1lci9zcmMvaGVscGVyL2lzTXVzdGFjaGVGYWxzeS5qcyIsImxpdC10cmFuc2Zvcm1lci9zcmMvaGVscGVyL3NlY3Rpb25IZWxwZXIuanMiLCJsaXQtdHJhbnNmb3JtZXIvc3JjL3RyYW5zZm9ybWVycy9zZWN0aW9uLmpzIiwibGl0LXRyYW5zZm9ybWVyL3NyYy90cmFuc2Zvcm1lcnMvaW52ZXJ0ZWRTZWN0aW9uLmpzIiwibGl0LXRyYW5zZm9ybWVyL3NyYy90cmFuc2Zvcm1lcnMvY29tbWVudC5qcyIsImxpdC10cmFuc2Zvcm1lci9zcmMvdHJhbnNmb3JtZXJzL2N1c3RvbURlbGltaXRlci5qcyIsImxpdC10cmFuc2Zvcm1lci9zcmMvbGl0LXRyYW5zZm9ybWVyLWNvbmZpZ3VyZWRPdXRPZlRoZUJveC5qcyIsImJyaWRnZS1tdXN0YWNoZS50cyIsImpleHByL3NyYy9saWIvY29uc3RhbnRzLnRzIiwiamV4cHIvc3JjL2xpYi90b2tlbml6ZXIudHMiLCJqZXhwci9zcmMvbGliL3BhcnNlci50cyIsImpleHByL3NyYy9saWIvZXZhbC50cyIsInN0YW1waW5vL3NyYy9zdGFtcGluby50cyIsImJyaWRnZS1zdGFtcGluby50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKiogXHJcbiAqIEBwYXJhbSB7b2JqZWN0fSBjb25maWcgPSB7XHJcbiAqICBodG1sOiBsaXQtaHRtbC5odG1sLFxyXG4gKiAgZGVsaW1pdGVyOiB7IHN0YXJ0OiAne3snLCBlbmQ6ICd9fScgfSxcclxuICogIHRyYW5zZm9ybWVyczogeyAvLyBub3RlIHRoYXQgdHJhbnNmb3JtVmFyaWFibGUgaXMgbm90IGhlcmUuIEl0IGdldHMgYXBwbGllZCB3aGVuIG5vIHRyYW5zZm9ybWVyLnRlc3QgaGFzIHBhc3NlZFxyXG4gKiAgICBuYW1lOiB7XHJcbiAqICAgICAgdGVzdDogKHN0ciwgY29uZmlnKSA9PiBib29sLFxyXG4gKiAgICAgIHRyYW5zZm9ybTogKHN0ciwgY29uZmlnKSA9PiAoe1xyXG4gKiAgICAgICAgcmVtYWluaW5nVG1wbFN0cjogc3RyLFxyXG4gKiAgICAgICAgaW5zZXJ0aW9uUG9pbnQ6IGN0eCA9PiBsaXQtaHRtbC5UZW1wbGF0ZVJlc3VsdCB8IHVuZGVmaW5lZCwgLy8gaWYgdW5kZWZpbmVkIHJlbWFpbmluZ1RtcGxTdHIgd2lsbCBiZSBtZXJnZWQgd2l0aCBsYXN0IHN0YXRpYyBwYXJ0IFxyXG4gKiAgICAgIH0pLFxyXG4gKiAgICB9LFxyXG4gKiAgfSxcclxuICogIHRyYW5zZm9ybVZhcmlhYmxlLCBcclxuICogfVxyXG4gKiBAcmV0dXJucyB7ZnVuY3Rpb259IHN0clRlbXBsYXRlID0+IGN0eCA9PiBsaXQtaHRtbC5UZW1wbGF0ZVJlc3VsdFxyXG4gKi9cclxuZXhwb3J0IGRlZmF1bHQgY29uZmlnID0+IHN0clRlbXBsYXRlID0+IHRyYW5zZm9ybShzdHJUZW1wbGF0ZSwgY29uZmlnKVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHRyYW5zZm9ybSh0bXBsMlBhcnNlLCBjb25maWcpIHtcclxuICBjb25zdCBzdGF0aWNQYXJ0cyA9IFtdXHJcbiAgY29uc3QgaW5zZXJ0aW9uUG9pbnRzID0gW11cclxuXHJcbiAgbGV0IHJlbWFpbmluZ1RtcGxTdHIgPSB0bXBsMlBhcnNlXHJcbiAgbGV0IHN0YXJ0SW5kZXhPZklQID0gcmVtYWluaW5nVG1wbFN0ci5pbmRleE9mKGNvbmZpZy5kZWxpbWl0ZXIuc3RhcnQpXHJcbiAgd2hpbGUgKHN0YXJ0SW5kZXhPZklQID49IDApIHtcclxuICAgIGlmIChyZW1haW5pbmdUbXBsU3RyLmluZGV4T2YoY29uZmlnLmRlbGltaXRlci5lbmQsIHN0YXJ0SW5kZXhPZklQKSA8IDApXHJcbiAgICAgIHRocm93IG5ldyBFcnJvcihgbWlzc2luZyBlbmQgZGVsaW1pdGVyIGF0OiAnJHtyZW1haW5pbmdUbXBsU3RyfSdgKVxyXG5cclxuICAgIHN0YXRpY1BhcnRzLnB1c2gocmVtYWluaW5nVG1wbFN0ci5zdWJzdHJpbmcoMCwgc3RhcnRJbmRleE9mSVApKVxyXG5cclxuICAgIGNvbnN0IGlQVHJhbnNmb3JtUmVzdWx0ID0gdHJhbnNmb3JtSVAoXHJcbiAgICAgIHJlbWFpbmluZ1RtcGxTdHIuc3Vic3RyaW5nKHN0YXJ0SW5kZXhPZklQICsgY29uZmlnLmRlbGltaXRlci5zdGFydC5sZW5ndGgpLFxyXG4gICAgICBjb25maWdcclxuICAgIClcclxuXHJcbiAgICBpZiAoaVBUcmFuc2Zvcm1SZXN1bHQuaW5zZXJ0aW9uUG9pbnQpIHtcclxuICAgICAgcmVtYWluaW5nVG1wbFN0ciA9IGlQVHJhbnNmb3JtUmVzdWx0LnJlbWFpbmluZ1RtcGxTdHJcclxuICAgICAgaW5zZXJ0aW9uUG9pbnRzLnB1c2goaVBUcmFuc2Zvcm1SZXN1bHQuaW5zZXJ0aW9uUG9pbnQpXHJcbiAgICAgIHN0YXJ0SW5kZXhPZklQID0gcmVtYWluaW5nVG1wbFN0ci5pbmRleE9mKGNvbmZpZy5kZWxpbWl0ZXIuc3RhcnQpXHJcbiAgICB9IGVsc2UgeyAvLyBlLmcuIGNvbW1lbnQgb3IgY3VzdG9tRGVsaW1ldGVyXHJcbiAgICAgIGNvbnN0IGxhc3RTdGF0aWNQYXJ0ID0gc3RhdGljUGFydHMucG9wKClcclxuICAgICAgcmVtYWluaW5nVG1wbFN0ciA9IGxhc3RTdGF0aWNQYXJ0ICsgaVBUcmFuc2Zvcm1SZXN1bHQucmVtYWluaW5nVG1wbFN0clxyXG4gICAgICBzdGFydEluZGV4T2ZJUCA9IHJlbWFpbmluZ1RtcGxTdHIuaW5kZXhPZihjb25maWcuZGVsaW1pdGVyLnN0YXJ0LCBsYXN0U3RhdGljUGFydC5sZW5ndGgpXHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBzdGF0aWNQYXJ0cy5wdXNoKHJlbWFpbmluZ1RtcGxTdHIpXHJcblxyXG4gIHJldHVybiBjdHggPT5cclxuICAgIGNvbmZpZy5odG1sKHN0YXRpY1BhcnRzLCAuLi5pbnNlcnRpb25Qb2ludHMubWFwKGlQID0+IGlQKGN0eCkpKVxyXG59XHJcblxyXG5mdW5jdGlvbiB0cmFuc2Zvcm1JUChyZW1haW5pbmdUbXBsU3RyLCBjb25maWcpIHtcclxuICBjb25zdCB0cmFuc2Zvcm1lciA9IE9iamVjdC52YWx1ZXMoY29uZmlnLnRyYW5zZm9ybWVycykuZmluZCh0ID0+IHQudGVzdChyZW1haW5pbmdUbXBsU3RyLCBjb25maWcpKVxyXG4gIGNvbnN0IHRyYW5zZm9ybUZ1bmN0aW9uID0gdHJhbnNmb3JtZXJcclxuICAgID8gdHJhbnNmb3JtZXIudHJhbnNmb3JtXHJcbiAgICA6IGNvbmZpZy50cmFuc2Zvcm1WYXJpYWJsZVxyXG4gIHJldHVybiB0cmFuc2Zvcm1GdW5jdGlvbihyZW1haW5pbmdUbXBsU3RyLCBjb25maWcpXHJcbn0iLCJleHBvcnQgZnVuY3Rpb24gY3R4MlZhbHVlKGN0eCwga2V5KSB7XHJcbiAgaWYgKGtleSA9PT0gJy4nKVxyXG4gICAgcmV0dXJuIGN0eFxyXG5cclxuICBsZXQgcmVzdWx0ID0gY3R4XHJcbiAgZm9yIChsZXQgayBvZiBrZXkuc3BsaXQoJy4nKSkge1xyXG4gICAgaWYgKCFyZXN1bHQuaGFzT3duUHJvcGVydHkoaykpXHJcbiAgICAgIHJldHVybiAnJ1xyXG5cclxuICAgIHJlc3VsdCA9IHJlc3VsdFtrXVxyXG4gIH1cclxuXHJcbiAgcmV0dXJuIHJlc3VsdFxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY3R4Mk11c3RhY2hlU3RyaW5nKGN0eCwga2V5KSB7XHJcbiAgcmV0dXJuIG11c3RhY2hlU3RyaW5neWZ5KGN0eDJWYWx1ZShjdHgsIGtleSkpXHJcbn1cclxuXHJcbmZ1bmN0aW9uIG11c3RhY2hlU3RyaW5neWZ5KHZhbHVlKSB7XHJcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09IG51bGwpXHJcbiAgICByZXR1cm4gJydcclxuXHJcbiAgcmV0dXJuICcnICsgdmFsdWVcclxufSIsImltcG9ydCB7IGN0eDJNdXN0YWNoZVN0cmluZyB9IGZyb20gJy4uL2hlbHBlci9kYXRhSGVscGVyLmpzJ1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgKHJlbWFpbmluZ1RtcGxTdHIsIHsgZGVsaW1pdGVyIH0pID0+IHtcclxuICBjb25zdCBpbmRleE9mRW5kRGVsaW1pdGVyID0gcmVtYWluaW5nVG1wbFN0ci5pbmRleE9mKGRlbGltaXRlci5lbmQpXHJcbiAgY29uc3QgZGF0YUtleSA9IHJlbWFpbmluZ1RtcGxTdHIuc3Vic3RyaW5nKDAsIGluZGV4T2ZFbmREZWxpbWl0ZXIpXHJcbiAgcmV0dXJuIHtcclxuICAgIHJlbWFpbmluZ1RtcGxTdHI6IHJlbWFpbmluZ1RtcGxTdHIuc3Vic3RyaW5nKGluZGV4T2ZFbmREZWxpbWl0ZXIgKyBkZWxpbWl0ZXIuZW5kLmxlbmd0aCksXHJcbiAgICBpbnNlcnRpb25Qb2ludDogY3R4ID0+IGN0eDJNdXN0YWNoZVN0cmluZyhjdHgsIGRhdGFLZXkpXHJcbiAgfVxyXG59IiwiaW1wb3J0IHsgY3R4Mk11c3RhY2hlU3RyaW5nIH0gZnJvbSAnLi4vaGVscGVyL2RhdGFIZWxwZXIuanMnXHJcblxyXG4vKiogTm90ZSwgdGhpcyBpcyB1bnNhZmUgdG8gdXNlLCBiZWNhdXNlIHRoZSByZW5kZXJlZCBvdXRwdXQgY291bGQgYmUgYW55IEphdmFTY3JpcHQhICovXHJcbmV4cG9ydCBkZWZhdWx0IHVuc2FmZUhUTUwgPT4gKHtcclxuICB0ZXN0OiByZW1haW5pbmdUbXBsU3RyID0+IHJlbWFpbmluZ1RtcGxTdHJbMF0gPT09ICd7JyxcclxuICB0cmFuc2Zvcm06IChyZW1haW5pbmdUbXBsU3RyLCB7IGRlbGltaXRlciB9KSA9PiB7XHJcbiAgICBjb25zdCBpbmRleE9mRW5kRGVsaW1pdGVyID0gcmVtYWluaW5nVG1wbFN0ci5pbmRleE9mKCd9JyArIGRlbGltaXRlci5lbmQpXHJcbiAgICBpZiAoaW5kZXhPZkVuZERlbGltaXRlciA8IDApXHJcbiAgICAgIHRocm93IG5ldyBFcnJvcihgbWlzc2luZyBlbmQgZGVsaW1pdGVyIGF0OiAnJHtkZWxpbWl0ZXIuc3RhcnR9JHtyZW1haW5pbmdUbXBsU3RyfSdgKVxyXG4gIFxyXG4gICAgY29uc3QgZGF0YUtleSA9IHJlbWFpbmluZ1RtcGxTdHIuc3Vic3RyaW5nKDEsIGluZGV4T2ZFbmREZWxpbWl0ZXIpXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICByZW1haW5pbmdUbXBsU3RyOiByZW1haW5pbmdUbXBsU3RyLnN1YnN0cmluZyhpbmRleE9mRW5kRGVsaW1pdGVyICsgMSArIGRlbGltaXRlci5lbmQubGVuZ3RoKSxcclxuICAgICAgaW5zZXJ0aW9uUG9pbnQ6IGN0eCA9PiB1bnNhZmVIVE1MKGN0eDJNdXN0YWNoZVN0cmluZyhjdHgsIGRhdGFLZXkpKSxcclxuICAgIH1cclxuICB9XHJcbn0pIiwiZXhwb3J0IGZ1bmN0aW9uIGlzTXVzdGFjaGVGYWxzeSh2YWx1ZSkge1xyXG4gIHJldHVybiBbbnVsbCwgdW5kZWZpbmVkLCBmYWxzZSwgMCwgTmFOLCAnJ11cclxuICAgIC5zb21lKGZhbHN5ID0+IGZhbHN5ID09PSB2YWx1ZSlcclxuICAgIHx8ICh2YWx1ZS5sZW5ndGggJiYgdmFsdWUubGVuZ3RoID09PSAwKVxyXG59IiwiZXhwb3J0IGZ1bmN0aW9uIHBhcnNlU2VjdGlvbih0bXBsU3RyLCBkZWxpbWl0ZXIpIHtcclxuICBjb25zdCBpbmRleE9mU3RhcnRUYWdFbmQgPSB0bXBsU3RyLmluZGV4T2YoZGVsaW1pdGVyLmVuZClcclxuICBjb25zdCBkYXRhS2V5ID0gdG1wbFN0ci5zdWJzdHJpbmcoMSwgaW5kZXhPZlN0YXJ0VGFnRW5kKVxyXG4gIGNvbnN0IGVuZFRhZyA9IGAke2RlbGltaXRlci5zdGFydH0vJHtkYXRhS2V5fSR7ZGVsaW1pdGVyLmVuZH1gXHJcbiAgY29uc3QgaW5kZXhPZkVuZFRhZ1N0YXJ0ID0gdG1wbFN0ci5pbmRleE9mKGVuZFRhZylcclxuICBpZiAoaW5kZXhPZkVuZFRhZ1N0YXJ0IDwgMClcclxuICAgIHRocm93IG5ldyBFcnJvcihgbWlzc2luZyBlbmQgZGVsaW1pdGVyIGF0OiAnJHtkZWxpbWl0ZXIuc3RhcnR9JHt0bXBsU3RyfSdgKVxyXG4gIFxyXG4gIHJldHVybiB7XHJcbiAgICBkYXRhS2V5LFxyXG4gICAgaW5uZXJUbXBsOiB0bXBsU3RyLnN1YnN0cmluZyhpbmRleE9mU3RhcnRUYWdFbmQgKyBkZWxpbWl0ZXIuc3RhcnQubGVuZ3RoLCBpbmRleE9mRW5kVGFnU3RhcnQpLFxyXG4gICAgcmVtYWluaW5nVG1wbFN0cjogdG1wbFN0ci5zdWJzdHJpbmcoaW5kZXhPZkVuZFRhZ1N0YXJ0ICsgZW5kVGFnLmxlbmd0aCksXHJcbiAgfVxyXG59IiwiaW1wb3J0IHsgdHJhbnNmb3JtIH0gZnJvbSAnLi4vbGl0LXRyYW5zZm9ybWVyLmpzJ1xyXG5pbXBvcnQgeyBjdHgyVmFsdWUgfSBmcm9tICcuLi9oZWxwZXIvZGF0YUhlbHBlci5qcydcclxuaW1wb3J0IHsgaXNNdXN0YWNoZUZhbHN5IH0gZnJvbSAnLi4vaGVscGVyL2lzTXVzdGFjaGVGYWxzeS5qcydcclxuaW1wb3J0IHsgcGFyc2VTZWN0aW9uIH0gZnJvbSAnLi4vaGVscGVyL3NlY3Rpb25IZWxwZXIuanMnXHJcblxyXG4vKiogTm90ZSwgdW5saWtlIHdpdGhpbiBtdXN0YWNoZSBmdW5jdGlvbnMgYXMgZGF0YSB2YWx1ZXMgYXJlIG5vdCBzdXBwb3J0ZWQgb3V0IG9mIHRoZSBib3ggKi9cclxuZXhwb3J0IGRlZmF1bHQgKCkgPT4gKHtcclxuICB0ZXN0OiByZW1haW5pbmdUbXBsU3RyID0+IHJlbWFpbmluZ1RtcGxTdHJbMF0gPT09ICcjJyxcclxuICB0cmFuc2Zvcm06IChyZW1haW5pbmdUbXBsU3RyLCBjb25maWcpID0+IHtcclxuICAgIGNvbnN0IHBhcnNlZFNlY3Rpb24gPSBwYXJzZVNlY3Rpb24ocmVtYWluaW5nVG1wbFN0ciwgY29uZmlnLmRlbGltaXRlcilcclxuICAgIGNvbnN0IHRyYW5zZm9ybWVkSW5uZXJUbXBsID0gdHJhbnNmb3JtKHBhcnNlZFNlY3Rpb24uaW5uZXJUbXBsLCBjb25maWcpXHJcbiAgICBcclxuICAgIHJldHVybiB7XHJcbiAgICAgIHJlbWFpbmluZ1RtcGxTdHI6IHBhcnNlZFNlY3Rpb24ucmVtYWluaW5nVG1wbFN0cixcclxuICAgICAgaW5zZXJ0aW9uUG9pbnQ6IGN0eCA9PiB7XHJcbiAgICAgICAgY29uc3Qgc2VjdGlvbkRhdGEgPSBjdHgyVmFsdWUoY3R4LCBwYXJzZWRTZWN0aW9uLmRhdGFLZXkpXHJcbiAgICAgICAgXHJcbiAgICAgICAgaWYgKGlzTXVzdGFjaGVGYWxzeShzZWN0aW9uRGF0YSkpXHJcbiAgICAgICAgICByZXR1cm4gJyc7XHJcblxyXG4gICAgICAgIHJldHVybiBzZWN0aW9uRGF0YS5tYXBcclxuICAgICAgICAgID8gc2VjdGlvbkRhdGEubWFwKGlubmVyQ3R4ID0+IHRyYW5zZm9ybWVkSW5uZXJUbXBsKGlubmVyQ3R4KSlcclxuICAgICAgICAgIDogdHJhbnNmb3JtZWRJbm5lclRtcGwoY3R4KVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG59KSIsImltcG9ydCB7IHRyYW5zZm9ybSB9IGZyb20gJy4uL2xpdC10cmFuc2Zvcm1lci5qcydcbmltcG9ydCB7IGN0eDJWYWx1ZSB9IGZyb20gJy4uL2hlbHBlci9kYXRhSGVscGVyLmpzJ1xuaW1wb3J0IHsgaXNNdXN0YWNoZUZhbHN5IH0gZnJvbSAnLi4vaGVscGVyL2lzTXVzdGFjaGVGYWxzeS5qcydcbmltcG9ydCB7IHBhcnNlU2VjdGlvbiB9IGZyb20gJy4uL2hlbHBlci9zZWN0aW9uSGVscGVyLmpzJ1xuXG5leHBvcnQgZGVmYXVsdCAoKSA9PiAoe1xuICB0ZXN0OiByZW1haW5pbmdUbXBsU3RyID0+IHJlbWFpbmluZ1RtcGxTdHJbMF0gPT09ICdeJyxcbiAgLypcbiAgICogcGF0Y2ggZm9yIHYuMS4wLjJcbiAgICogYXBwbHkgdHJhbnNmb3JtZWRJbm5lclRtcGwoKVxuICAgKi9cbiAgdHJhbnNmb3JtOiAocmVtYWluaW5nVG1wbFN0ciwgY29uZmlnKSA9PiB7XG4gICAgY29uc3QgcGFyc2VkU2VjdGlvbiA9IHBhcnNlU2VjdGlvbihyZW1haW5pbmdUbXBsU3RyLCBjb25maWcuZGVsaW1pdGVyKVxuICAgIGNvbnN0IHRyYW5zZm9ybWVkSW5uZXJUbXBsID0gdHJhbnNmb3JtKHBhcnNlZFNlY3Rpb24uaW5uZXJUbXBsLCBjb25maWcpXG4gICAgXG4gICAgcmV0dXJuIHtcbiAgICAgIHJlbWFpbmluZ1RtcGxTdHI6IHBhcnNlZFNlY3Rpb24ucmVtYWluaW5nVG1wbFN0cixcbiAgICAgIGluc2VydGlvblBvaW50OiBjdHggPT4ge1xuICAgICAgICBjb25zdCBzZWN0aW9uRGF0YSA9IGN0eDJWYWx1ZShjdHgsIHBhcnNlZFNlY3Rpb24uZGF0YUtleSlcbiAgICAgICAgXG4gICAgICAgIGlmIChpc011c3RhY2hlRmFsc3koc2VjdGlvbkRhdGEpKVxuICAgICAgICAgIHJldHVybiBzZWN0aW9uRGF0YS5tYXBcbiAgICAgICAgICAgID8gc2VjdGlvbkRhdGEubWFwKGlubmVyQ3R4ID0+IHRyYW5zZm9ybWVkSW5uZXJUbXBsKGlubmVyQ3R4KSlcbiAgICAgICAgICAgIDogdHJhbnNmb3JtZWRJbm5lclRtcGwoY3R4KVxuICAgICAgICByZXR1cm4gJyc7XG4gICAgICB9XG4gICAgfVxuICB9XG59KVxuIiwiZXhwb3J0IGRlZmF1bHQgKCkgPT4gKHtcclxuICB0ZXN0OiByZW1haW5pbmdUbXBsU3RyID0+IHJlbWFpbmluZ1RtcGxTdHJbMF0gPT09ICchJyxcclxuICB0cmFuc2Zvcm06IChyZW1haW5pbmdUbXBsU3RyLCB7IGRlbGltaXRlciB9KSA9PiAoe1xyXG4gICAgcmVtYWluaW5nVG1wbFN0cjogcmVtYWluaW5nVG1wbFN0ci5zdWJzdHJpbmcocmVtYWluaW5nVG1wbFN0ci5pbmRleE9mKGRlbGltaXRlci5lbmQpICsgZGVsaW1pdGVyLmVuZC5sZW5ndGgpLFxyXG4gICAgaW5zZXJ0aW9uUG9pbnQ6IHVuZGVmaW5lZCxcclxuICB9KVxyXG59KSIsImV4cG9ydCBkZWZhdWx0ICgpID0+ICh7XHJcbiAgdGVzdDogcmVtYWluaW5nVG1wbFN0ciA9PiByZW1haW5pbmdUbXBsU3RyWzBdID09PSAnPScsXHJcbiAgdHJhbnNmb3JtOiAocmVtYWluaW5nVG1wbFN0ciwgY29uZmlnKSA9PiB7XHJcbiAgICBjb25zdCBvcmlnaW5hbEVuZERlbGlMZW5ndGggPSBjb25maWcuZGVsaW1pdGVyLmVuZC5sZW5ndGhcclxuICAgIGNvbnN0IGluZGV4T2ZFbmRUYWcgPSByZW1haW5pbmdUbXBsU3RyLmluZGV4T2YoJz0nICsgY29uZmlnLmRlbGltaXRlci5lbmQpXHJcbiAgICBpZiAoaW5kZXhPZkVuZFRhZyA8IDAgKVxyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYG1pc3NpbmcgZW5kIGRlbGltaXRlciBhdDogJyR7cmVtYWluaW5nVG1wbFN0cn0nYClcclxuXHJcbiAgICBjb25zdCBbIG5ld1N0YXJ0RGVsaSwgbmV3RW5kRGVsaSBdID0gcmVtYWluaW5nVG1wbFN0ci5zdWJzdHJpbmcoMSwgaW5kZXhPZkVuZFRhZykuc3BsaXQoJyAnKVxyXG5cclxuICAgIGNvbmZpZy5kZWxpbWl0ZXIuc3RhcnQgPSBuZXdTdGFydERlbGlcclxuICAgIGNvbmZpZy5kZWxpbWl0ZXIuZW5kID0gbmV3RW5kRGVsaVxyXG4gICAgXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICByZW1haW5pbmdUbXBsU3RyOiByZW1haW5pbmdUbXBsU3RyLnN1YnN0cmluZyhpbmRleE9mRW5kVGFnICsgMSArIG9yaWdpbmFsRW5kRGVsaUxlbmd0aCksXHJcbiAgICAgIGluc2VydGlvblBvaW50OiB1bmRlZmluZWQsICBcclxuICAgIH1cclxuICB9XHJcbn0pIiwiaW1wb3J0IGNyZWF0ZVRyYW5zZm9ybSBmcm9tICcuL2xpdC10cmFuc2Zvcm1lci5qcydcclxuaW1wb3J0IHRyYW5zZm9ybVZhcmlhYmxlIGZyb20gJy4vdHJhbnNmb3JtZXJzL3ZhcmlhYmxlVHJhbnNmb3JtZXIuanMnXHJcbmltcG9ydCB1bnNhZmVWYXJpYWJsZVRyYW5zZm9ybWVyIGZyb20gJy4vdHJhbnNmb3JtZXJzL3Vuc2FmZVZhcmlhYmxlLmpzJ1xyXG5pbXBvcnQgc2VjdGlvblRyYW5zZm9ybWVyIGZyb20gJy4vdHJhbnNmb3JtZXJzL3NlY3Rpb24uanMnXHJcbmltcG9ydCBpbnZlcnRlZFNlY3Rpb25UcmFuc2Zvcm1lciBmcm9tICcuL3RyYW5zZm9ybWVycy9pbnZlcnRlZFNlY3Rpb24uanMnXHJcbmltcG9ydCBjb21tZW50VHJhbnNmb3JtZXIgZnJvbSAnLi90cmFuc2Zvcm1lcnMvY29tbWVudC5qcydcclxuaW1wb3J0IGN1c3RvbURlbGltaXRlclRyYW5zZm9ybWVyIGZyb20gJy4vdHJhbnNmb3JtZXJzL2N1c3RvbURlbGltaXRlci5qcydcclxuXHJcbmV4cG9ydCBkZWZhdWx0IChodG1sLCB1bnNhZmVIVE1MKSA9PlxyXG4gIGNyZWF0ZVRyYW5zZm9ybSh7XHJcbiAgICBodG1sLFxyXG4gICAgZGVsaW1pdGVyOiB7IHN0YXJ0OiAne3snLCBlbmQ6ICd9fScgfSxcclxuICAgIHRyYW5zZm9ybVZhcmlhYmxlLFxyXG4gICAgdHJhbnNmb3JtZXJzOiB7XHJcbiAgICAgIHVuc2FmZVZhcmlhYmxlOiB1bnNhZmVWYXJpYWJsZVRyYW5zZm9ybWVyKHVuc2FmZUhUTUwpLFxyXG4gICAgICBzZWN0aW9uOiBzZWN0aW9uVHJhbnNmb3JtZXIoKSxcclxuICAgICAgaW52ZXJ0ZWRTZWN0aW9uOiBpbnZlcnRlZFNlY3Rpb25UcmFuc2Zvcm1lcigpLFxyXG4gICAgICBjb21tZW50OiBjb21tZW50VHJhbnNmb3JtZXIoKSxcclxuICAgICAgY3VzdG9tRGVsaW1pdGVyVHJhbnNmb3JtZXI6IGN1c3RvbURlbGltaXRlclRyYW5zZm9ybWVyKCksXHJcbiAgICB9LFxyXG4gIH0pIiwiaW1wb3J0IHsgdG9UZW1wbGF0ZVN0cmluZ3NBcnJheSB9IGZyb20gJ0BjZHAvZXh0ZW5zaW9uLXRlbXBsYXRlJztcbmltcG9ydCB0eXBlIHsgVGVtcGxhdGVCcmlkZ2VFbmRpbmUsIFRlbXBsYXRlVHJhbnNmb3JtZXIgfSBmcm9tICdAYnJpZGdlL2ludGVyZmFjZXMnO1xuaW1wb3J0IHR5cGUge1xuICAgIE11c3RhY2hlVHJhbnNmb3JtZXIsXG4gICAgVGVtcGxhdGVUYWcsXG4gICAgVHJhbnNmb3JtRGlyZWN0aXZlLFxuICAgIFRyYW5zZm9ybVRlc3RlcixcbiAgICBUcmFuc2Zvcm1FeGVjdXRvcixcbiAgICBUcmFuc2Zvcm1lQ29udGV4dCxcbiAgICBUcmFuc2Zvcm1Db25maWcsXG59IGZyb20gJ2xpdC10cmFuc2Zvcm1lci9zcmMvaW50ZXJmYWNlcyc7XG5cbmltcG9ydCBjcmVhdGVEZWZhdWx0IGZyb20gJ2xpdC10cmFuc2Zvcm1lcic7XG5pbXBvcnQgY3JlYXRlQ3VzdG9tIGZyb20gJ2xpdC10cmFuc2Zvcm1lci9zcmMvbGl0LXRyYW5zZm9ybWVyJztcblxuaW1wb3J0IHZhcmlhYmxlIGZyb20gJ2xpdC10cmFuc2Zvcm1lci9zcmMvdHJhbnNmb3JtZXJzL3ZhcmlhYmxlVHJhbnNmb3JtZXInO1xuaW1wb3J0IHVuc2FmZVZhcmlhYmxlIGZyb20gJ2xpdC10cmFuc2Zvcm1lci9zcmMvdHJhbnNmb3JtZXJzL3Vuc2FmZVZhcmlhYmxlJztcbmltcG9ydCBzZWN0aW9uIGZyb20gJ2xpdC10cmFuc2Zvcm1lci9zcmMvdHJhbnNmb3JtZXJzL3NlY3Rpb24nO1xuaW1wb3J0IGludmVydGVkU2VjdGlvbiBmcm9tICdsaXQtdHJhbnNmb3JtZXIvc3JjL3RyYW5zZm9ybWVycy9pbnZlcnRlZFNlY3Rpb24nO1xuaW1wb3J0IGNvbW1lbnQgZnJvbSAnbGl0LXRyYW5zZm9ybWVyL3NyYy90cmFuc2Zvcm1lcnMvY29tbWVudCc7XG5pbXBvcnQgY3VzdG9tRGVsaW1pdGVyIGZyb20gJ2xpdC10cmFuc2Zvcm1lci9zcmMvdHJhbnNmb3JtZXJzL2N1c3RvbURlbGltaXRlcic7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbnR5cGUgTXVzdGFjaGVUcmFuc2Zvcm1lckNvbnRleHQgPSBNdXN0YWNoZVRyYW5zZm9ybWVyICYgeyBkZWxpbWl0ZXI6IHsgc3RhcnQ6IHN0cmluZzsgZW5kOiBzdHJpbmc7IH07IH07XG5cbmNvbnN0IHhmb3JtID0gKG11c3RhY2hlOiBNdXN0YWNoZVRyYW5zZm9ybWVyQ29udGV4dCk6IFRlbXBsYXRlVHJhbnNmb3JtZXIgPT4ge1xuICAgIHJldHVybiAodGVtcGxhdGU6IEhUTUxUZW1wbGF0ZUVsZW1lbnQgfCBzdHJpbmcpOiBUZW1wbGF0ZUJyaWRnZUVuZGluZSA9PiB7XG4gICAgICAgIGNvbnN0IHsgc3RhcnQsIGVuZCB9ID0gbXVzdGFjaGUuZGVsaW1pdGVyO1xuXG4gICAgICAgIC8vIOOCs+ODoeODs+ODiOODluODreODg+OCr+WGheOBriBkZWxpbWl0ZXIg5oq95Ye6XG4gICAgICAgIGNvbnN0IHJlZ0NvbW1lbnRSZW1vdmVTdGFydCA9IG5ldyBSZWdFeHAoYDwhLS1cXFxccyoke3N0YXJ0fWAsICdnJyk7XG4gICAgICAgIGNvbnN0IHJlZ0NvbW1lbnRSZW1vdmVFbmQgICA9IG5ldyBSZWdFeHAoYCR7ZW5kfVxcXFxzKi0tPmAsICdnJyk7XG4gICAgICAgIC8vIGRlbGltaXRlciDliY3lvozjga4gdHJpbSDnlKjmraPopo/ooajnj75cbiAgICAgICAgY29uc3QgcmVnVHJpbSA9IG5ldyBSZWdFeHAoYCgke3N0YXJ0fVsjXi9dPylcXFxccyooW1xcXFx3XFxcXC5dKylcXFxccyooJHtlbmR9KWAsICdnJyk7XG5cbiAgICAgICAgY29uc3QgYm9keSA9ICh0ZW1wbGF0ZSBpbnN0YW5jZW9mIEhUTUxUZW1wbGF0ZUVsZW1lbnQgPyB0ZW1wbGF0ZS5pbm5lckhUTUwgOiB0ZW1wbGF0ZSlcbiAgICAgICAgICAgIC5yZXBsYWNlKHJlZ0NvbW1lbnRSZW1vdmVTdGFydCwgc3RhcnQpXG4gICAgICAgICAgICAucmVwbGFjZShyZWdDb21tZW50UmVtb3ZlRW5kLCBlbmQpXG4gICAgICAgICAgICAucmVwbGFjZShyZWdUcmltLCAnJDEkMiQzJylcbiAgICAgICAgO1xuXG4gICAgICAgIHJldHVybiBtdXN0YWNoZShib2R5KTtcbiAgICB9O1xufTtcblxuLypcbiAqIGxpdC1odG1sIHYyLjEuMCtcbiAqIFRlbXBsYXRlU3RyaW5nc0FycmF5IOOCkuWOs+WvhuOBq+ODgeOCp+ODg+OCr+OBmeOCi+OCiOOBhuOBq+OBquOBo+OBn+OBn+OCgSBwYXRjaCDjgpLjgYLjgabjgotcbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9saXQvbGl0L3B1bGwvMjMwN1xuICpcbiAqIOWwhuadpSBgQXJyYXkuaXNUZW1wbGF0ZU9iamVjdCgpYCDjgpLkvb/nlKjjgZXjgozjgovloLTlkIgsIOacrOWvvuW/nOOCguimi+ebtOOBmeW/heimgeOBguOCilxuICogaHR0cHM6Ly90YzM5LmVzL3Byb3Bvc2FsLWFycmF5LWlzLXRlbXBsYXRlLW9iamVjdC9cbiAqL1xuY29uc3QgcGF0Y2ggPSAoaHRtbDogVGVtcGxhdGVUYWcpOiBUZW1wbGF0ZVRhZyA9PiB7XG4gICAgcmV0dXJuICh0ZW1wbGF0ZTogVGVtcGxhdGVTdHJpbmdzQXJyYXksIC4uLnZhbHVlczogdW5rbm93bltdKSA9PiB7XG4gICAgICAgIHJldHVybiBodG1sKHRvVGVtcGxhdGVTdHJpbmdzQXJyYXkodGVtcGxhdGUpLCAuLi52YWx1ZXMpO1xuICAgIH07XG59O1xuXG5mdW5jdGlvbiBjcmVhdGVNdXN0YWNoZVRyYW5zZm9ybWVyKGh0bWw6IFRlbXBsYXRlVGFnLCB1bnNhZmVIVE1MOiBUcmFuc2Zvcm1EaXJlY3RpdmUpOiBUZW1wbGF0ZVRyYW5zZm9ybWVyO1xuZnVuY3Rpb24gY3JlYXRlTXVzdGFjaGVUcmFuc2Zvcm1lcihjb25maWc6IFRyYW5zZm9ybUNvbmZpZyk6IFRlbXBsYXRlVHJhbnNmb3JtZXI7XG5mdW5jdGlvbiBjcmVhdGVNdXN0YWNoZVRyYW5zZm9ybWVyKGFyZzE6IHVua25vd24sIGFyZzI/OiB1bmtub3duKTogVGVtcGxhdGVUcmFuc2Zvcm1lciB7XG4gICAgY29uc3QgZGVsaW1pdGVyID0geyBzdGFydDogJ3t7JywgZW5kOiAnfX0nIH07XG4gICAgbGV0IHRyYW5zZm9ybWVyOiBNdXN0YWNoZVRyYW5zZm9ybWVyQ29udGV4dDtcbiAgICBpZiAoJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIGFyZzEpIHtcbiAgICAgICAgdHJhbnNmb3JtZXIgPSBjcmVhdGVEZWZhdWx0KHBhdGNoKGFyZzEgYXMgVGVtcGxhdGVUYWcpLCBhcmcyIGFzIFRyYW5zZm9ybURpcmVjdGl2ZSkgYXMgTXVzdGFjaGVUcmFuc2Zvcm1lckNvbnRleHQ7XG4gICAgICAgIHRyYW5zZm9ybWVyLmRlbGltaXRlciA9IGRlbGltaXRlcjtcbiAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCB7IGh0bWwgfSA9IGFyZzEgYXMgeyBodG1sOiBUZW1wbGF0ZVRhZzsgfTtcbiAgICAgICAgY29uc3QgY29uZmlnID0gT2JqZWN0LmFzc2lnbih7XG4gICAgICAgICAgICBkZWxpbWl0ZXIsXG4gICAgICAgICAgICB0cmFuc2Zvcm1lcnM6IHt9LFxuICAgICAgICB9LCBhcmcxLCB7IGh0bWw6IHBhdGNoKGh0bWwpIH0pIGFzIFRyYW5zZm9ybUNvbmZpZztcbiAgICAgICAgdHJhbnNmb3JtZXIgPSBjcmVhdGVDdXN0b20oY29uZmlnKSBhcyBNdXN0YWNoZVRyYW5zZm9ybWVyQ29udGV4dDtcbiAgICAgICAgdHJhbnNmb3JtZXIuZGVsaW1pdGVyID0gY29uZmlnLmRlbGltaXRlciE7XG4gICAgfVxuICAgIHJldHVybiB4Zm9ybSh0cmFuc2Zvcm1lcik7XG59XG5cbmNvbnN0IHRyYW5zZm9ybWVyOiB7XG4gICAgdmFyaWFibGU6IFRyYW5zZm9ybUV4ZWN1dG9yO1xuICAgIHVuc2FmZVZhcmlhYmxlOiAodW5zYWZlSFRNTDogVHJhbnNmb3JtRGlyZWN0aXZlKSA9PiBUcmFuc2Zvcm1lQ29udGV4dDtcbiAgICBzZWN0aW9uOiAoKSA9PiBUcmFuc2Zvcm1lQ29udGV4dDtcbiAgICBpbnZlcnRlZFNlY3Rpb246ICgpID0+IFRyYW5zZm9ybWVDb250ZXh0O1xuICAgIGNvbW1lbnQ6ICgpID0+IFRyYW5zZm9ybWVDb250ZXh0O1xuICAgIGN1c3RvbURlbGltaXRlcjogKCkgPT4gVHJhbnNmb3JtZUNvbnRleHQ7XG59ID0ge1xuICAgIHZhcmlhYmxlLFxuICAgIHVuc2FmZVZhcmlhYmxlLFxuICAgIHNlY3Rpb24sXG4gICAgaW52ZXJ0ZWRTZWN0aW9uLFxuICAgIGNvbW1lbnQsXG4gICAgY3VzdG9tRGVsaW1pdGVyLFxufTtcblxuZXhwb3J0IHtcbiAgICBUZW1wbGF0ZVRhZyxcbiAgICBUcmFuc2Zvcm1EaXJlY3RpdmUsXG4gICAgVGVtcGxhdGVUcmFuc2Zvcm1lcixcbiAgICBUcmFuc2Zvcm1UZXN0ZXIsXG4gICAgVHJhbnNmb3JtRXhlY3V0b3IsXG4gICAgVHJhbnNmb3JtZUNvbnRleHQsXG4gICAgVHJhbnNmb3JtQ29uZmlnLFxuICAgIGNyZWF0ZU11c3RhY2hlVHJhbnNmb3JtZXIsXG4gICAgdHJhbnNmb3JtZXIsXG59O1xuIixudWxsLG51bGwsbnVsbCxudWxsLG51bGwsImltcG9ydCB0eXBlIHtcbiAgICBUZW1wbGF0ZUJyaWRnZUFyZyxcbiAgICBUZW1wbGF0ZVRyYW5zZm9ybWVyLFxufSBmcm9tICdAYnJpZGdlL2ludGVyZmFjZXMnO1xuaW1wb3J0IHtcbiAgICBUZW1wbGF0ZUhhbmRsZXIsXG4gICAgVGVtcGxhdGVIYW5kbGVycyxcbiAgICBUZW1wbGF0ZVJlbmRlcmVycyxcbiAgICBFdmFsdWF0ZVRlbXBsYXRlUmVzdWx0LFxuICAgIHByZXBhcmVUZW1wbGF0ZSxcbiAgICBldmFsdWF0ZVRlbXBsYXRlLFxufSBmcm9tICdzdGFtcGlubyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ3JlYXRlU3RhbXBpbm9UZW1wbGF0ZU9wdGlvbnMge1xuICAgIGhhbmRsZXJzPzogVGVtcGxhdGVIYW5kbGVycztcbiAgICByZW5kZXJlcnM/OiBUZW1wbGF0ZVJlbmRlcmVycztcbiAgICBzdXBlclRlbXBsYXRlPzogSFRNTFRlbXBsYXRlRWxlbWVudCB8IHVuZGVmaW5lZDtcbn1cblxuZnVuY3Rpb24gZW5zdXJlKHRlbXBsYXRlOiBIVE1MVGVtcGxhdGVFbGVtZW50IHwgc3RyaW5nKTogSFRNTFRlbXBsYXRlRWxlbWVudCB7XG4gICAgaWYgKHRlbXBsYXRlIGluc3RhbmNlb2YgSFRNTFRlbXBsYXRlRWxlbWVudCkge1xuICAgICAgICByZXR1cm4gdGVtcGxhdGU7XG4gICAgfSBlbHNlIGlmICgnc3RyaW5nJyA9PT0gdHlwZW9mIHRlbXBsYXRlKSB7XG4gICAgICAgIGNvbnN0IGVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0ZW1wbGF0ZScpO1xuICAgICAgICBlbGVtZW50LmlubmVySFRNTCA9IHRlbXBsYXRlO1xuICAgICAgICByZXR1cm4gZWxlbWVudDtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBUeXBlIG9mIHRlbXBsYXRlIGlzIG5vdCBhIHZhbGlkLiBbdHlwZW9mOiAke3R5cGVvZiB0ZW1wbGF0ZX1dYCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBjcmVhdGVTdGFtcGlub1RyYW5zZm9ybWVyKG9wdGlvbnM/OiBDcmVhdGVTdGFtcGlub1RlbXBsYXRlT3B0aW9ucyk6IFRlbXBsYXRlVHJhbnNmb3JtZXIge1xuICAgIGNvbnN0IHsgaGFuZGxlcnMsIHJlbmRlcmVycywgc3VwZXJUZW1wbGF0ZSB9ID0gb3B0aW9ucyA/PyB7fTtcbiAgICByZXR1cm4gKHRlbXBsYXRlOiBIVE1MVGVtcGxhdGVFbGVtZW50IHwgc3RyaW5nKSA9PiB7XG4gICAgICAgIHJldHVybiBwcmVwYXJlVGVtcGxhdGUoZW5zdXJlKHRlbXBsYXRlKSwgaGFuZGxlcnMsIHJlbmRlcmVycywgc3VwZXJUZW1wbGF0ZSk7XG4gICAgfTtcbn1cblxuZXhwb3J0IHtcbiAgICBUZW1wbGF0ZUJyaWRnZUFyZyxcbiAgICBUZW1wbGF0ZUhhbmRsZXIsXG4gICAgVGVtcGxhdGVIYW5kbGVycyxcbiAgICBUZW1wbGF0ZVJlbmRlcmVycyxcbiAgICBFdmFsdWF0ZVRlbXBsYXRlUmVzdWx0LFxuICAgIGNyZWF0ZVN0YW1waW5vVHJhbnNmb3JtZXIsXG4gICAgcHJlcGFyZVRlbXBsYXRlLFxuICAgIGV2YWx1YXRlVGVtcGxhdGUsXG59O1xuIl0sIm5hbWVzIjpbImNyZWF0ZVRyYW5zZm9ybSIsInRyYW5zZm9ybVZhcmlhYmxlIiwidW5zYWZlVmFyaWFibGVUcmFuc2Zvcm1lciIsInNlY3Rpb25UcmFuc2Zvcm1lciIsImludmVydGVkU2VjdGlvblRyYW5zZm9ybWVyIiwiY29tbWVudFRyYW5zZm9ybWVyIiwiY3VzdG9tRGVsaW1pdGVyVHJhbnNmb3JtZXIiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EscUJBQWUsTUFBTSxJQUFJLFdBQVcsSUFBSSxTQUFTLENBQUMsV0FBVyxFQUFFLE1BQU0sRUFBQztBQUN0RTtBQUNPLFNBQVMsU0FBUyxDQUFDLFVBQVUsRUFBRSxNQUFNLEVBQUU7QUFDOUMsRUFBRSxNQUFNLFdBQVcsR0FBRyxHQUFFO0FBQ3hCLEVBQUUsTUFBTSxlQUFlLEdBQUcsR0FBRTtBQUM1QjtBQUNBLEVBQUUsSUFBSSxnQkFBZ0IsR0FBRyxXQUFVO0FBQ25DLEVBQUUsSUFBSSxjQUFjLEdBQUcsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFDO0FBQ3ZFLEVBQUUsT0FBTyxjQUFjLElBQUksQ0FBQyxFQUFFO0FBQzlCLElBQUksSUFBSSxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FBQztBQUMxRSxNQUFNLE1BQU0sSUFBSSxLQUFLLENBQUMsQ0FBQywyQkFBMkIsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN4RTtBQUNBLElBQUksV0FBVyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLGNBQWMsQ0FBQyxFQUFDO0FBQ25FO0FBQ0EsSUFBSSxNQUFNLGlCQUFpQixHQUFHLFdBQVc7QUFDekMsTUFBTSxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsY0FBYyxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQztBQUNoRixNQUFNLE1BQU07QUFDWixNQUFLO0FBQ0w7QUFDQSxJQUFJLElBQUksaUJBQWlCLENBQUMsY0FBYyxFQUFFO0FBQzFDLE1BQU0sZ0JBQWdCLEdBQUcsaUJBQWlCLENBQUMsaUJBQWdCO0FBQzNELE1BQU0sZUFBZSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxjQUFjLEVBQUM7QUFDNUQsTUFBTSxjQUFjLEdBQUcsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFDO0FBQ3ZFLEtBQUssTUFBTTtBQUNYLE1BQU0sTUFBTSxjQUFjLEdBQUcsV0FBVyxDQUFDLEdBQUcsR0FBRTtBQUM5QyxNQUFNLGdCQUFnQixHQUFHLGNBQWMsR0FBRyxpQkFBaUIsQ0FBQyxpQkFBZ0I7QUFDNUUsTUFBTSxjQUFjLEdBQUcsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLGNBQWMsQ0FBQyxNQUFNLEVBQUM7QUFDOUYsS0FBSztBQUNMLEdBQUc7QUFDSDtBQUNBLEVBQUUsV0FBVyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsRUFBQztBQUNwQztBQUNBLEVBQUUsT0FBTyxHQUFHO0FBQ1osSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxHQUFHLGVBQWUsQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBQ25FLENBQUM7QUFDRDtBQUNBLFNBQVMsV0FBVyxDQUFDLGdCQUFnQixFQUFFLE1BQU0sRUFBRTtBQUMvQyxFQUFFLE1BQU0sV0FBVyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxNQUFNLENBQUMsRUFBQztBQUNwRyxFQUFFLE1BQU0saUJBQWlCLEdBQUcsV0FBVztBQUN2QyxNQUFNLFdBQVcsQ0FBQyxTQUFTO0FBQzNCLE1BQU0sTUFBTSxDQUFDLGtCQUFpQjtBQUM5QixFQUFFLE9BQU8saUJBQWlCLENBQUMsZ0JBQWdCLEVBQUUsTUFBTSxDQUFDO0FBQ3BEOztBQzNETyxTQUFTLFNBQVMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFO0FBQ3BDLEVBQUUsSUFBSSxHQUFHLEtBQUssR0FBRztBQUNqQixJQUFJLE9BQU8sR0FBRztBQUNkO0FBQ0EsRUFBRSxJQUFJLE1BQU0sR0FBRyxJQUFHO0FBQ2xCLEVBQUUsS0FBSyxJQUFJLENBQUMsSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFO0FBQ2hDLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDO0FBQ2pDLE1BQU0sT0FBTyxFQUFFO0FBQ2Y7QUFDQSxJQUFJLE1BQU0sR0FBRyxNQUFNLENBQUMsQ0FBQyxFQUFDO0FBQ3RCLEdBQUc7QUFDSDtBQUNBLEVBQUUsT0FBTyxNQUFNO0FBQ2YsQ0FBQztBQUNEO0FBQ08sU0FBUyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFO0FBQzdDLEVBQUUsT0FBTyxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0FBQy9DLENBQUM7QUFDRDtBQUNBLFNBQVMsaUJBQWlCLENBQUMsS0FBSyxFQUFFO0FBQ2xDLEVBQUUsSUFBSSxLQUFLLEtBQUssU0FBUyxJQUFJLEtBQUssS0FBSyxJQUFJO0FBQzNDLElBQUksT0FBTyxFQUFFO0FBQ2I7QUFDQSxFQUFFLE9BQU8sRUFBRSxHQUFHLEtBQUs7QUFDbkI7O0FDdEJBLGlCQUFlLENBQUMsZ0JBQWdCLEVBQUUsRUFBRSxTQUFTLEVBQUUsS0FBSztBQUNwRCxFQUFFLE1BQU0sbUJBQW1CLEdBQUcsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUM7QUFDckUsRUFBRSxNQUFNLE9BQU8sR0FBRyxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLG1CQUFtQixFQUFDO0FBQ3BFLEVBQUUsT0FBTztBQUNULElBQUksZ0JBQWdCLEVBQUUsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLG1CQUFtQixHQUFHLFNBQVMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDO0FBQzVGLElBQUksY0FBYyxFQUFFLEdBQUcsSUFBSSxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsT0FBTyxDQUFDO0FBQzNELEdBQUc7QUFDSDs7QUNQQTtBQUNBLHVCQUFlLFVBQVUsS0FBSztBQUM5QixFQUFFLElBQUksRUFBRSxnQkFBZ0IsSUFBSSxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHO0FBQ3ZELEVBQUUsU0FBUyxFQUFFLENBQUMsZ0JBQWdCLEVBQUUsRUFBRSxTQUFTLEVBQUUsS0FBSztBQUNsRCxJQUFJLE1BQU0sbUJBQW1CLEdBQUcsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLEdBQUcsR0FBRyxTQUFTLENBQUMsR0FBRyxFQUFDO0FBQzdFLElBQUksSUFBSSxtQkFBbUIsR0FBRyxDQUFDO0FBQy9CLE1BQU0sTUFBTSxJQUFJLEtBQUssQ0FBQyxDQUFDLDJCQUEyQixFQUFFLFNBQVMsQ0FBQyxLQUFLLENBQUMsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMxRjtBQUNBLElBQUksTUFBTSxPQUFPLEdBQUcsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxtQkFBbUIsRUFBQztBQUN0RSxJQUFJLE9BQU87QUFDWCxNQUFNLGdCQUFnQixFQUFFLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxtQkFBbUIsR0FBRyxDQUFDLEdBQUcsU0FBUyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUM7QUFDbEcsTUFBTSxjQUFjLEVBQUUsR0FBRyxJQUFJLFVBQVUsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsT0FBTyxDQUFDLENBQUM7QUFDekUsS0FBSztBQUNMLEdBQUc7QUFDSCxDQUFDOztBQ2hCTSxTQUFTLGVBQWUsQ0FBQyxLQUFLLEVBQUU7QUFDdkMsRUFBRSxPQUFPLENBQUMsSUFBSSxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxFQUFFLENBQUM7QUFDN0MsS0FBSyxJQUFJLENBQUMsS0FBSyxJQUFJLEtBQUssS0FBSyxLQUFLLENBQUM7QUFDbkMsUUFBUSxLQUFLLENBQUMsTUFBTSxJQUFJLEtBQUssQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDO0FBQzNDOztBQ0pPLFNBQVMsWUFBWSxDQUFDLE9BQU8sRUFBRSxTQUFTLEVBQUU7QUFDakQsRUFBRSxNQUFNLGtCQUFrQixHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBQztBQUMzRCxFQUFFLE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLGtCQUFrQixFQUFDO0FBQzFELEVBQUUsTUFBTSxNQUFNLEdBQUcsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxFQUFFLFNBQVMsQ0FBQyxHQUFHLENBQUMsRUFBQztBQUNoRSxFQUFFLE1BQU0sa0JBQWtCLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUM7QUFDcEQsRUFBRSxJQUFJLGtCQUFrQixHQUFHLENBQUM7QUFDNUIsSUFBSSxNQUFNLElBQUksS0FBSyxDQUFDLENBQUMsMkJBQTJCLEVBQUUsU0FBUyxDQUFDLEtBQUssQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMvRTtBQUNBLEVBQUUsT0FBTztBQUNULElBQUksT0FBTztBQUNYLElBQUksU0FBUyxFQUFFLE9BQU8sQ0FBQyxTQUFTLENBQUMsa0JBQWtCLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsa0JBQWtCLENBQUM7QUFDakcsSUFBSSxnQkFBZ0IsRUFBRSxPQUFPLENBQUMsU0FBUyxDQUFDLGtCQUFrQixHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUM7QUFDM0UsR0FBRztBQUNIOztBQ1JBO0FBQ0EsZ0JBQWUsT0FBTztBQUN0QixFQUFFLElBQUksRUFBRSxnQkFBZ0IsSUFBSSxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHO0FBQ3ZELEVBQUUsU0FBUyxFQUFFLENBQUMsZ0JBQWdCLEVBQUUsTUFBTSxLQUFLO0FBQzNDLElBQUksTUFBTSxhQUFhLEdBQUcsWUFBWSxDQUFDLGdCQUFnQixFQUFFLE1BQU0sQ0FBQyxTQUFTLEVBQUM7QUFDMUUsSUFBSSxNQUFNLG9CQUFvQixHQUFHLFNBQVMsQ0FBQyxhQUFhLENBQUMsU0FBUyxFQUFFLE1BQU0sRUFBQztBQUMzRTtBQUNBLElBQUksT0FBTztBQUNYLE1BQU0sZ0JBQWdCLEVBQUUsYUFBYSxDQUFDLGdCQUFnQjtBQUN0RCxNQUFNLGNBQWMsRUFBRSxHQUFHLElBQUk7QUFDN0IsUUFBUSxNQUFNLFdBQVcsR0FBRyxTQUFTLENBQUMsR0FBRyxFQUFFLGFBQWEsQ0FBQyxPQUFPLEVBQUM7QUFDakU7QUFDQSxRQUFRLElBQUksZUFBZSxDQUFDLFdBQVcsQ0FBQztBQUN4QyxVQUFVLE9BQU8sRUFBRSxDQUFDO0FBQ3BCO0FBQ0EsUUFBUSxPQUFPLFdBQVcsQ0FBQyxHQUFHO0FBQzlCLFlBQVksV0FBVyxDQUFDLEdBQUcsQ0FBQyxRQUFRLElBQUksb0JBQW9CLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDdkUsWUFBWSxvQkFBb0IsQ0FBQyxHQUFHLENBQUM7QUFDckMsT0FBTztBQUNQLEtBQUs7QUFDTCxHQUFHO0FBQ0gsQ0FBQzs7QUNyQkQsd0JBQWUsT0FBTztBQUN0QixFQUFFLElBQUksRUFBRSxnQkFBZ0IsSUFBSSxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHO0FBQ3ZEO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsRUFBRSxTQUFTLEVBQUUsQ0FBQyxnQkFBZ0IsRUFBRSxNQUFNLEtBQUs7QUFDM0MsSUFBSSxNQUFNLGFBQWEsR0FBRyxZQUFZLENBQUMsZ0JBQWdCLEVBQUUsTUFBTSxDQUFDLFNBQVMsRUFBQztBQUMxRSxJQUFJLE1BQU0sb0JBQW9CLEdBQUcsU0FBUyxDQUFDLGFBQWEsQ0FBQyxTQUFTLEVBQUUsTUFBTSxFQUFDO0FBQzNFO0FBQ0EsSUFBSSxPQUFPO0FBQ1gsTUFBTSxnQkFBZ0IsRUFBRSxhQUFhLENBQUMsZ0JBQWdCO0FBQ3RELE1BQU0sY0FBYyxFQUFFLEdBQUcsSUFBSTtBQUM3QixRQUFRLE1BQU0sV0FBVyxHQUFHLFNBQVMsQ0FBQyxHQUFHLEVBQUUsYUFBYSxDQUFDLE9BQU8sRUFBQztBQUNqRTtBQUNBLFFBQVEsSUFBSSxlQUFlLENBQUMsV0FBVyxDQUFDO0FBQ3hDLFVBQVUsT0FBTyxXQUFXLENBQUMsR0FBRztBQUNoQyxjQUFjLFdBQVcsQ0FBQyxHQUFHLENBQUMsUUFBUSxJQUFJLG9CQUFvQixDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQ3pFLGNBQWMsb0JBQW9CLENBQUMsR0FBRyxDQUFDO0FBQ3ZDLFFBQVEsT0FBTyxFQUFFLENBQUM7QUFDbEIsT0FBTztBQUNQLEtBQUs7QUFDTCxHQUFHO0FBQ0gsQ0FBQzs7QUM1QkQsZ0JBQWUsT0FBTztBQUN0QixFQUFFLElBQUksRUFBRSxnQkFBZ0IsSUFBSSxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHO0FBQ3ZELEVBQUUsU0FBUyxFQUFFLENBQUMsZ0JBQWdCLEVBQUUsRUFBRSxTQUFTLEVBQUUsTUFBTTtBQUNuRCxJQUFJLGdCQUFnQixFQUFFLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxHQUFHLFNBQVMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDO0FBQ2hILElBQUksY0FBYyxFQUFFLFNBQVM7QUFDN0IsR0FBRyxDQUFDO0FBQ0osQ0FBQzs7QUNORCx3QkFBZSxPQUFPO0FBQ3RCLEVBQUUsSUFBSSxFQUFFLGdCQUFnQixJQUFJLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUc7QUFDdkQsRUFBRSxTQUFTLEVBQUUsQ0FBQyxnQkFBZ0IsRUFBRSxNQUFNLEtBQUs7QUFDM0MsSUFBSSxNQUFNLHFCQUFxQixHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLE9BQU07QUFDN0QsSUFBSSxNQUFNLGFBQWEsR0FBRyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsR0FBRyxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFDO0FBQzlFLElBQUksSUFBSSxhQUFhLEdBQUcsQ0FBQztBQUN6QixNQUFNLE1BQU0sSUFBSSxLQUFLLENBQUMsQ0FBQywyQkFBMkIsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN4RTtBQUNBLElBQUksTUFBTSxFQUFFLFlBQVksRUFBRSxVQUFVLEVBQUUsR0FBRyxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLGFBQWEsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUM7QUFDaEc7QUFDQSxJQUFJLE1BQU0sQ0FBQyxTQUFTLENBQUMsS0FBSyxHQUFHLGFBQVk7QUFDekMsSUFBSSxNQUFNLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBRyxXQUFVO0FBQ3JDO0FBQ0EsSUFBSSxPQUFPO0FBQ1gsTUFBTSxnQkFBZ0IsRUFBRSxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsYUFBYSxHQUFHLENBQUMsR0FBRyxxQkFBcUIsQ0FBQztBQUM3RixNQUFNLGNBQWMsRUFBRSxTQUFTO0FBQy9CLEtBQUs7QUFDTCxHQUFHO0FBQ0gsQ0FBQzs7QUNWRCxzQkFBZSxDQUFDLElBQUksRUFBRSxVQUFVO0FBQ2hDLEVBQUVBLFlBQWUsQ0FBQztBQUNsQixJQUFJLElBQUk7QUFDUixJQUFJLFNBQVMsRUFBRSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRTtBQUN6Qyx1QkFBSUMsUUFBaUI7QUFDckIsSUFBSSxZQUFZLEVBQUU7QUFDbEIsTUFBTSxjQUFjLEVBQUVDLGNBQXlCLENBQUMsVUFBVSxDQUFDO0FBQzNELE1BQU0sT0FBTyxFQUFFQyxPQUFrQixFQUFFO0FBQ25DLE1BQU0sZUFBZSxFQUFFQyxlQUEwQixFQUFFO0FBQ25ELE1BQU0sT0FBTyxFQUFFQyxPQUFrQixFQUFFO0FBQ25DLE1BQU0sMEJBQTBCLEVBQUVDLGVBQTBCLEVBQUU7QUFDOUQsS0FBSztBQUNMLEdBQUc7O0FDS0gsTUFBTSxLQUFLLEdBQUcsQ0FBQyxRQUFvQyxLQUF5QjtJQUN4RSxPQUFPLENBQUMsUUFBc0MsS0FBMEI7UUFDcEUsTUFBTSxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsR0FBRyxRQUFRLENBQUMsU0FBUyxDQUFDOztRQUcxQyxNQUFNLHFCQUFxQixHQUFHLElBQUksTUFBTSxDQUFDLENBQVcsUUFBQSxFQUFBLEtBQUssQ0FBRSxDQUFBLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDbEUsTUFBTSxtQkFBbUIsR0FBSyxJQUFJLE1BQU0sQ0FBQyxDQUFHLEVBQUEsR0FBRyxDQUFTLE9BQUEsQ0FBQSxFQUFFLEdBQUcsQ0FBQyxDQUFDOztBQUUvRCxRQUFBLE1BQU0sT0FBTyxHQUFHLElBQUksTUFBTSxDQUFDLENBQUEsQ0FBQSxFQUFJLEtBQUssQ0FBQSwyQkFBQSxFQUE4QixHQUFHLENBQUEsQ0FBQSxDQUFHLEVBQUUsR0FBRyxDQUFDLENBQUM7QUFFL0UsUUFBQSxNQUFNLElBQUksR0FBRyxDQUFDLFFBQVEsWUFBWSxtQkFBbUIsR0FBRyxRQUFRLENBQUMsU0FBUyxHQUFHLFFBQVE7QUFDaEYsYUFBQSxPQUFPLENBQUMscUJBQXFCLEVBQUUsS0FBSyxDQUFDO0FBQ3JDLGFBQUEsT0FBTyxDQUFDLG1CQUFtQixFQUFFLEdBQUcsQ0FBQztBQUNqQyxhQUFBLE9BQU8sQ0FBQyxPQUFPLEVBQUUsUUFBUSxDQUFDLENBQzlCO0FBRUQsUUFBQSxPQUFPLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUMxQixLQUFDLENBQUM7QUFDTixDQUFDLENBQUM7QUFFRjs7Ozs7OztBQU9HO0FBQ0gsTUFBTSxLQUFLLEdBQUcsQ0FBQyxJQUFpQixLQUFpQjtBQUM3QyxJQUFBLE9BQU8sQ0FBQyxRQUE4QixFQUFFLEdBQUcsTUFBaUIsS0FBSTtRQUM1RCxPQUFPLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxRQUFRLENBQUMsRUFBRSxHQUFHLE1BQU0sQ0FBQyxDQUFDO0FBQzdELEtBQUMsQ0FBQztBQUNOLENBQUMsQ0FBQztBQUlGLFNBQVMseUJBQXlCLENBQUMsSUFBYSxFQUFFLElBQWMsRUFBQTtJQUM1RCxNQUFNLFNBQVMsR0FBRyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxDQUFDO0FBQzdDLElBQUEsSUFBSSxXQUF1QyxDQUFDO0FBQzVDLElBQUEsSUFBSSxVQUFVLEtBQUssT0FBTyxJQUFJLEVBQUU7UUFDNUIsV0FBVyxHQUFHLGFBQWEsQ0FBQyxLQUFLLENBQUMsSUFBbUIsQ0FBQyxFQUFFLElBQTBCLENBQStCLENBQUM7QUFDbEgsUUFBQSxXQUFXLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQztLQUNyQztTQUFNO0FBQ0gsUUFBQSxNQUFNLEVBQUUsSUFBSSxFQUFFLEdBQUcsSUFBOEIsQ0FBQztBQUNoRCxRQUFBLE1BQU0sTUFBTSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUM7WUFDekIsU0FBUztBQUNULFlBQUEsWUFBWSxFQUFFLEVBQUU7U0FDbkIsRUFBRSxJQUFJLEVBQUUsRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQW9CLENBQUM7QUFDbkQsUUFBQSxXQUFXLEdBQUcsWUFBWSxDQUFDLE1BQU0sQ0FBK0IsQ0FBQztBQUNqRSxRQUFBLFdBQVcsQ0FBQyxTQUFTLEdBQUcsTUFBTSxDQUFDLFNBQVUsQ0FBQztLQUM3QztBQUNELElBQUEsT0FBTyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUM7QUFDOUIsQ0FBQztBQUVELE1BQU0sV0FBVyxHQU9iO0lBQ0EsUUFBUTtJQUNSLGNBQWM7SUFDZCxPQUFPO0lBQ1AsZUFBZTtJQUNmLE9BQU87SUFDUCxlQUFlOzs7QUM1Rm5COzs7QUFHRztBQUVJLE1BQU0sUUFBUSxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDMUIsTUFBTSxlQUFlLEdBQUcsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0FBQ3hDLE1BQU0sZ0JBQWdCLEdBQUc7SUFDOUIsR0FBRztJQUNILEdBQUc7SUFDSCxHQUFHO0lBQ0gsR0FBRztJQUNILEdBQUc7SUFDSCxHQUFHO0lBQ0gsR0FBRztJQUNILElBQUk7SUFDSixJQUFJO0lBQ0osR0FBRztJQUNILEdBQUc7SUFDSCxJQUFJO0lBQ0osSUFBSTtJQUNKLElBQUk7SUFDSixJQUFJO0lBQ0osSUFBSTtJQUNKLEdBQUc7SUFDSCxLQUFLO0lBQ0wsS0FBSztJQUNMLEdBQUc7SUFDSCxJQUFJO0NBQ0wsQ0FBQztBQUVLLE1BQU0sVUFBVSxHQUEyQjtBQUNoRCxJQUFBLEdBQUcsRUFBRSxDQUFDO0FBQ04sSUFBQSxHQUFHLEVBQUUsQ0FBQztBQUNOLElBQUEsR0FBRyxFQUFFLENBQUM7QUFDTixJQUFBLEdBQUcsRUFBRSxDQUFDO0FBQ04sSUFBQSxHQUFHLEVBQUUsQ0FBQztBQUNOLElBQUEsR0FBRyxFQUFFLENBQUM7QUFFTixJQUFBLElBQUksRUFBRSxDQUFDO0FBQ1AsSUFBQSxHQUFHLEVBQUUsQ0FBQztBQUNOLElBQUEsSUFBSSxFQUFFLENBQUM7QUFDUCxJQUFBLElBQUksRUFBRSxDQUFDO0FBQ1AsSUFBQSxJQUFJLEVBQUUsQ0FBQztBQUNQLElBQUEsR0FBRyxFQUFFLENBQUM7QUFDTixJQUFBLEdBQUcsRUFBRSxDQUFDO0FBQ04sSUFBQSxHQUFHLEVBQUUsQ0FBQzs7QUFHTixJQUFBLElBQUksRUFBRSxDQUFDO0FBQ1AsSUFBQSxJQUFJLEVBQUUsQ0FBQztBQUNQLElBQUEsS0FBSyxFQUFFLENBQUM7QUFDUixJQUFBLEtBQUssRUFBRSxDQUFDOztBQUdSLElBQUEsSUFBSSxFQUFFLEVBQUU7QUFDUixJQUFBLEdBQUcsRUFBRSxFQUFFO0FBQ1AsSUFBQSxJQUFJLEVBQUUsRUFBRTtBQUNSLElBQUEsR0FBRyxFQUFFLEVBQUU7O0FBR1AsSUFBQSxHQUFHLEVBQUUsRUFBRTtBQUNQLElBQUEsR0FBRyxFQUFFLEVBQUU7O0FBR1AsSUFBQSxHQUFHLEVBQUUsRUFBRTtBQUNQLElBQUEsR0FBRyxFQUFFLEVBQUU7QUFDUCxJQUFBLEdBQUcsRUFBRSxFQUFFOztBQUdQLElBQUEsR0FBRyxFQUFFLEVBQUU7QUFDUCxJQUFBLEdBQUcsRUFBRSxFQUFFO0FBQ1AsSUFBQSxHQUFHLEVBQUUsRUFBRTtJQUNQLEdBQUcsRUFBRSxFQUFFO0NBQ1IsQ0FBQztBQUVLLE1BQU0sa0JBQWtCLEdBQUcsRUFBRTs7QUM1RXBDOzs7QUFHRztBQUlILE1BQU0sYUFBYSxHQUFHLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO0FBQ3ZFLE1BQU0sZUFBZSxHQUFHLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDO0FBUXZDLElBQVksSUFZWCxDQUFBO0FBWkQsQ0FBQSxVQUFZLElBQUksRUFBQTtBQUNkLElBQUEsSUFBQSxDQUFBLElBQUEsQ0FBQSxRQUFBLENBQUEsR0FBQSxDQUFBLENBQUEsR0FBQSxRQUFVLENBQUE7QUFDVixJQUFBLElBQUEsQ0FBQSxJQUFBLENBQUEsWUFBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBLEdBQUEsWUFBYyxDQUFBO0FBQ2QsSUFBQSxJQUFBLENBQUEsSUFBQSxDQUFBLEtBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQSxHQUFBLEtBQU8sQ0FBQTtBQUNQLElBQUEsSUFBQSxDQUFBLElBQUEsQ0FBQSxPQUFBLENBQUEsR0FBQSxDQUFBLENBQUEsR0FBQSxPQUFTLENBQUE7QUFDVCxJQUFBLElBQUEsQ0FBQSxJQUFBLENBQUEsT0FBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBLEdBQUEsT0FBUyxDQUFBO0FBQ1QsSUFBQSxJQUFBLENBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQSxHQUFBLFNBQVcsQ0FBQTtBQUNYLElBQUEsSUFBQSxDQUFBLElBQUEsQ0FBQSxTQUFBLENBQUEsR0FBQSxDQUFBLENBQUEsR0FBQSxTQUFXLENBQUE7QUFDWCxJQUFBLElBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBLEdBQUEsVUFBWSxDQUFBO0FBQ1osSUFBQSxJQUFBLENBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQSxHQUFBLFNBQVcsQ0FBQTtBQUNYLElBQUEsSUFBQSxDQUFBLElBQUEsQ0FBQSxTQUFBLENBQUEsR0FBQSxFQUFBLENBQUEsR0FBQSxTQUFZLENBQUE7QUFDWixJQUFBLElBQUEsQ0FBQSxJQUFBLENBQUEsT0FBQSxDQUFBLEdBQUEsRUFBQSxDQUFBLEdBQUEsT0FBVSxDQUFBO0FBQ1osQ0FBQyxFQVpXLElBQUksS0FBSixJQUFJLEdBWWYsRUFBQSxDQUFBLENBQUEsQ0FBQTtBQUVNLE1BQU0sS0FBSyxHQUFHLENBQUMsSUFBVSxFQUFFLEtBQWEsRUFBRSxVQUFxQixHQUFBLENBQUMsTUFBTTtJQUMzRSxJQUFJO0lBQ0osS0FBSztJQUNMLFVBQVU7QUFDWCxDQUFBLENBQUMsQ0FBQztBQUVILE1BQU0sYUFBYSxHQUFHLENBQUMsRUFBVSxLQUMvQixFQUFFLEtBQUssQ0FBQztJQUNSLEVBQUUsS0FBSyxFQUFFO0lBQ1QsRUFBRSxLQUFLLEVBQUU7QUFDVCxJQUFBLEVBQUUsS0FBSyxFQUFFLENBQUM7QUFFWjtBQUNBLE1BQU0sc0JBQXNCLEdBQUcsQ0FBQyxFQUFVLEtBQ3hDLEVBQUUsS0FBSyxFQUFFO0lBQ1QsRUFBRSxLQUFLLEVBQUU7Ozs7QUFJVCxLQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsRUFBRSxHQUFHLEVBQUUsWUFBWSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO0FBRTlDO0FBQ0EsTUFBTSxhQUFhLEdBQUcsQ0FBQyxFQUFVLEtBQy9CLHNCQUFzQixDQUFDLEVBQUUsQ0FBQyxJQUFJLFNBQVMsQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUU5QyxNQUFNLFVBQVUsR0FBRyxDQUFDLEdBQVcsS0FBSyxRQUFRLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0FBRWpFLE1BQU0sUUFBUSxHQUFHLENBQUMsRUFBVSxLQUFLLEVBQUUsS0FBSyxFQUFFLFlBQVksRUFBRSxLQUFLLEVBQUUsQ0FBQztBQUVoRSxNQUFNLFNBQVMsR0FBRyxDQUFDLEVBQVUsS0FBSyxFQUFFLFlBQVksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLENBQUM7QUFFL0QsTUFBTSxXQUFXLEdBQUcsQ0FBQyxFQUFVLEtBQzdCLEVBQUUsS0FBSyxFQUFFO0lBQ1QsRUFBRSxLQUFLLEVBQUU7SUFDVCxFQUFFLEtBQUssRUFBRTtJQUNULEVBQUUsS0FBSyxFQUFFO0lBQ1QsRUFBRSxLQUFLLEVBQUU7SUFDVCxFQUFFLEtBQUssRUFBRTtJQUNULEVBQUUsS0FBSyxFQUFFO0lBQ1QsRUFBRSxLQUFLLEVBQUU7SUFDVCxFQUFFLEtBQUssRUFBRTtJQUNULEVBQUUsS0FBSyxFQUFFO0lBQ1QsRUFBRSxLQUFLLEVBQUU7SUFDVCxFQUFFLEtBQUssRUFBRTtBQUNULElBQUEsRUFBRSxLQUFLLEdBQUcsQ0FBQztBQUViLE1BQU0sVUFBVSxHQUFHLENBQUMsRUFBVSxLQUM1QixFQUFFLEtBQUssRUFBRTtJQUNULEVBQUUsS0FBSyxFQUFFO0lBQ1QsRUFBRSxLQUFLLEVBQUU7SUFDVCxFQUFFLEtBQUssRUFBRTtJQUNULEVBQUUsS0FBSyxHQUFHO0FBQ1YsSUFBQSxFQUFFLEtBQUssR0FBRyxDQUFDO0FBRWIsTUFBTSxhQUFhLEdBQUcsQ0FBQyxHQUFXLEtBQ2hDLEdBQUcsQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUMsTUFBTSxFQUFFLEtBQUssS0FBSTtJQUN0QyxRQUFRLEtBQUs7QUFDWCxRQUFBLEtBQUssR0FBRztBQUNOLFlBQUEsT0FBTyxJQUFJLENBQUM7QUFDZCxRQUFBLEtBQUssR0FBRztBQUNOLFlBQUEsT0FBTyxJQUFJLENBQUM7QUFDZCxRQUFBLEtBQUssR0FBRztBQUNOLFlBQUEsT0FBTyxJQUFJLENBQUM7QUFDZCxRQUFBLEtBQUssR0FBRztBQUNOLFlBQUEsT0FBTyxJQUFJLENBQUM7QUFDZCxRQUFBLEtBQUssR0FBRztBQUNOLFlBQUEsT0FBTyxJQUFJLENBQUM7QUFDZCxRQUFBO0FBQ0UsWUFBQSxPQUFPLEtBQUssQ0FBQztLQUNoQjtBQUNILENBQUMsQ0FBQyxDQUFDO01BRVEsU0FBUyxDQUFBO0FBQ1osSUFBQSxNQUFNLENBQVM7SUFDZixNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDWixXQUFXLEdBQUcsQ0FBQyxDQUFDO0FBQ2hCLElBQUEsS0FBSyxDQUFVO0FBRXZCLElBQUEsV0FBQSxDQUFZLEtBQWEsRUFBQTtBQUN2QixRQUFBLElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDO1FBQ3BCLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztLQUNqQjtJQUVELFNBQVMsR0FBQTtBQUNQLFFBQUEsT0FBTyxhQUFhLENBQUMsSUFBSSxDQUFDLEtBQU0sQ0FBQyxFQUFFO0FBQ2pDLFlBQUEsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUNyQjtBQUNELFFBQUEsSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQU0sQ0FBQztBQUFFLFlBQUEsT0FBTyxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7QUFDekQsUUFBQSxJQUFJLHNCQUFzQixDQUFDLElBQUksQ0FBQyxLQUFNLENBQUMsRUFBRTtBQUN2QyxZQUFBLE9BQU8sSUFBSSxDQUFDLHVCQUF1QixFQUFFLENBQUM7U0FDdkM7QUFDRCxRQUFBLElBQUksU0FBUyxDQUFDLElBQUksQ0FBQyxLQUFNLENBQUM7QUFBRSxZQUFBLE9BQU8sSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO0FBQzFELFFBQUEsSUFBSSxJQUFJLENBQUMsS0FBSyxLQUFLLEVBQUU7QUFBVSxZQUFBLE9BQU8sSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO0FBQzFELFFBQUEsSUFBSSxJQUFJLENBQUMsS0FBSyxLQUFLLEVBQUU7QUFBVSxZQUFBLE9BQU8sSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO0FBQzVELFFBQUEsSUFBSSxJQUFJLENBQUMsS0FBSyxLQUFLLEVBQUU7QUFBVSxZQUFBLE9BQU8sSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO0FBQzVELFFBQUEsSUFBSSxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQU0sQ0FBQztBQUFFLFlBQUEsT0FBTyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztBQUM5RCxRQUFBLElBQUksVUFBVSxDQUFDLElBQUksQ0FBQyxLQUFNLENBQUM7QUFBRSxZQUFBLE9BQU8sSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7O1FBRTVELElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztBQUNoQixRQUFBLElBQUksSUFBSSxDQUFDLEtBQUssS0FBSyxTQUFTLEVBQUU7WUFDNUIsTUFBTSxJQUFJLEtBQUssQ0FBQyxDQUFBLDJCQUFBLEVBQThCLElBQUksQ0FBQyxLQUFLLENBQUUsQ0FBQSxDQUFDLENBQUM7U0FDN0Q7QUFDRCxRQUFBLE9BQU8sU0FBUyxDQUFDO0tBQ2xCO0FBRU8sSUFBQSxRQUFRLENBQUMsZUFBeUIsRUFBQTtRQUN4QyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDZCxJQUFJLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUU7QUFDcEMsWUFBQSxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUNqRCxZQUFBLElBQUksZUFBZSxLQUFLLElBQUksRUFBRTtBQUM1QixnQkFBQSxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7YUFDaEM7U0FDRjthQUFNO0FBQ0wsWUFBQSxJQUFJLENBQUMsS0FBSyxHQUFHLFNBQVMsQ0FBQztTQUN4QjtLQUNGO0lBRU8sU0FBUyxDQUFDLFlBQW9CLENBQUMsRUFBQTtBQUNyQyxRQUFBLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLE1BQU0sR0FBRyxTQUFTLENBQUMsQ0FBQztBQUMzRSxRQUFBLElBQUksU0FBUyxLQUFLLENBQUMsRUFBRTtZQUNuQixJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7U0FDcEI7QUFDRCxRQUFBLE9BQU8sQ0FBQyxDQUFDO0tBQ1Y7SUFFTyxXQUFXLEdBQUE7QUFDakIsUUFBQSxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7S0FDaEM7SUFFTyxlQUFlLEdBQUE7UUFDckIsTUFBTSxHQUFHLEdBQUcscUJBQXFCLENBQUM7QUFDbEMsUUFBQSxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDO0FBQzdCLFFBQUEsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUNwQixRQUFBLE9BQU8sSUFBSSxDQUFDLEtBQUssS0FBSyxTQUFTLEVBQUU7QUFDL0IsWUFBQSxJQUFJLElBQUksQ0FBQyxLQUFLLEtBQUssU0FBUztBQUFFLGdCQUFBLE1BQU0sSUFBSSxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDbkQsSUFBSSxJQUFJLENBQUMsS0FBSyxLQUFLLEVBQUUsVUFBVTtnQkFDN0IsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO0FBQ2hCLGdCQUFBLElBQUksSUFBSSxDQUFDLEtBQUssS0FBSyxTQUFTO0FBQUUsb0JBQUEsTUFBTSxJQUFJLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQzthQUNwRDtZQUNELElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztTQUNqQjtBQUNELFFBQUEsTUFBTSxDQUFDLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsYUFBYSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDOUQsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO0FBQ2hCLFFBQUEsT0FBTyxDQUFDLENBQUM7S0FDVjtJQUVPLHVCQUF1QixHQUFBOzs7QUFHN0IsUUFBQSxHQUFHO1lBQ0QsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO0FBQ2xCLFNBQUMsUUFBUSxhQUFhLENBQUMsSUFBSSxDQUFDLEtBQU0sQ0FBQyxFQUFFO0FBQ3JDLFFBQUEsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO0FBQy9CLFFBQUEsTUFBTSxJQUFJLEdBQUcsVUFBVSxDQUFDLEtBQUssQ0FBQyxHQUFHLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQztBQUNoRSxRQUFBLE9BQU8sS0FBSyxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQztLQUMzQjtJQUVPLGVBQWUsR0FBQTs7O0FBR3JCLFFBQUEsR0FBRztZQUNELElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztBQUNsQixTQUFDLFFBQVEsU0FBUyxDQUFDLElBQUksQ0FBQyxLQUFNLENBQUMsRUFBRTtBQUNqQyxRQUFBLElBQUksSUFBSSxDQUFDLEtBQUssS0FBSyxFQUFFO0FBQVUsWUFBQSxPQUFPLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztRQUMxRCxPQUFPLEtBQUssQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDO0tBQzlDO0lBRU8sWUFBWSxHQUFBO1FBQ2xCLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztBQUNoQixRQUFBLElBQUksU0FBUyxDQUFDLElBQUksQ0FBQyxLQUFNLENBQUM7QUFBRSxZQUFBLE9BQU8sSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7UUFDNUQsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQ25CLE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLGtCQUFrQixDQUFDLENBQUM7S0FDakQ7SUFFTyxjQUFjLEdBQUE7QUFDcEIsUUFBQSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3BCLE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7S0FDL0I7SUFFTyxjQUFjLEdBQUE7QUFDcEIsUUFBQSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3BCLE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7S0FDL0I7SUFFTyxpQkFBaUIsR0FBQTs7O0FBR3ZCLFFBQUEsR0FBRztZQUNELElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztBQUNsQixTQUFDLFFBQVEsU0FBUyxDQUFDLElBQUksQ0FBQyxLQUFNLENBQUMsRUFBRTtRQUNqQyxPQUFPLEtBQUssQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDO0tBQzlDO0lBRU8saUJBQWlCLEdBQUE7UUFDdkIsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ2hCLElBQUksRUFBRSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFM0IsSUFBSSxlQUFlLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFO1lBQ3RDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNoQixJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7U0FDakI7YUFBTTtBQUNMLFlBQUEsRUFBRSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDdkIsWUFBQSxJQUFJLEVBQUUsS0FBSyxJQUFJLEVBQUU7Z0JBQ2YsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO2dCQUNoQixPQUFPLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO2FBQzlCO1lBQ0QsSUFBSSxhQUFhLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFO2dCQUNwQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7YUFDakI7U0FDRjtBQUNELFFBQUEsRUFBRSxHQUFHLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztBQUN0QixRQUFBLE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsRUFBRSxFQUFFLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0tBQ2pEO0lBRU8sZ0JBQWdCLEdBQUE7UUFDdEIsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsS0FBTSxDQUFDLENBQUM7QUFDL0MsUUFBQSxNQUFNLENBQUMsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxLQUFLLEVBQUUsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7QUFDeEQsUUFBQSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ3BCLFFBQUEsT0FBTyxDQUFDLENBQUM7S0FDVjtBQUNGOztBQzFQRDs7O0FBR0c7QUFZSSxNQUFNLEtBQUssR0FBRyxDQUNuQixJQUFZLEVBQ1osVUFBeUIsS0FDUCxJQUFJLE1BQU0sQ0FBSSxJQUFJLEVBQUUsVUFBVSxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUM7TUFFL0MsTUFBTSxDQUFBO0FBQ1QsSUFBQSxLQUFLLENBQVE7QUFDYixJQUFBLFVBQVUsQ0FBWTtBQUN0QixJQUFBLElBQUksQ0FBZ0I7QUFDcEIsSUFBQSxNQUFNLENBQVM7QUFDZixJQUFBLE1BQU0sQ0FBVTtJQUV4QixXQUFZLENBQUEsS0FBYSxFQUFFLFVBQXlCLEVBQUE7UUFDbEQsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUN2QyxRQUFBLElBQUksQ0FBQyxJQUFJLEdBQUcsVUFBVSxDQUFDO0tBQ3hCO0lBRUQsS0FBSyxHQUFBO1FBQ0gsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO0FBQ2hCLFFBQUEsT0FBTyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztLQUNoQztJQUVPLFFBQVEsQ0FBQyxJQUFXLEVBQUUsS0FBYyxFQUFBO1FBQzFDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsRUFBRTtZQUMvQixNQUFNLElBQUksS0FBSyxDQUNiLENBQUEsY0FBQSxFQUFpQixJQUFJLENBQUssRUFBQSxFQUFBLEtBQUssVUFBVSxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksS0FBSyxJQUFJLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBRyxDQUFBLENBQUEsQ0FDckYsQ0FBQztTQUNIO1FBQ0QsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxTQUFTLEVBQUUsQ0FBQztBQUN0QyxRQUFBLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO0FBQ2hCLFFBQUEsSUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDO0FBQ3JCLFFBQUEsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsS0FBSyxDQUFDO0tBQ3hCO0lBRUQsUUFBUSxDQUFDLElBQVcsRUFBRSxLQUFjLEVBQUE7UUFDbEMsT0FBTyxFQUFFLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxLQUFLLEtBQUssSUFBSSxNQUFNLEtBQUssSUFBSSxJQUFJLENBQUMsTUFBTSxLQUFLLEtBQUssQ0FBQyxDQUFDLENBQUM7S0FDN0U7SUFFTyxnQkFBZ0IsR0FBQTtRQUN0QixJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU07QUFBRSxZQUFBLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztBQUMzQyxRQUFBLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztBQUNoQyxRQUFBLE9BQU8sSUFBSSxLQUFLLFNBQVMsR0FBRyxTQUFTLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztLQUN4RTs7OztJQUtPLGdCQUFnQixDQUFDLElBQW1CLEVBQUUsVUFBa0IsRUFBQTtBQUM5RCxRQUFBLElBQUksSUFBSSxLQUFLLFNBQVMsRUFBRTtBQUN0QixZQUFBLE1BQU0sSUFBSSxLQUFLLENBQUMsOEJBQThCLENBQUMsQ0FBQztTQUNqRDtBQUNELFFBQUEsT0FBTyxJQUFJLENBQUMsTUFBTSxFQUFFO1lBQ2xCLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxFQUFFO0FBQ3BDLGdCQUFBLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztBQUNwQyxnQkFBQSxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQzthQUNoRDtpQkFBTSxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsRUFBRTtBQUMzQyxnQkFBQSxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7Z0JBQ3JDLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLENBQUM7YUFDekM7aUJBQU0sSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRTtnQkFDbEMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO0FBQ2hCLGdCQUFBLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztnQkFDakMsSUFBSSxHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7YUFDOUM7aUJBQU0sSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRTtnQkFDdEMsTUFBTTthQUNQO0FBQU0saUJBQUEsSUFDTCxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUM7QUFDNUIsZ0JBQUEsSUFBSSxDQUFDLE1BQU0sQ0FBQyxVQUFVLElBQUksVUFBVSxFQUNwQztnQkFDQSxJQUFJO29CQUNGLElBQUksQ0FBQyxNQUFNLEtBQUssR0FBRztBQUNqQiwwQkFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQzswQkFDeEIsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2FBQzVDO2lCQUFNO2dCQUNMLE1BQU07YUFDUDtTQUNGO0FBQ0QsUUFBQSxPQUFPLElBQUksQ0FBQztLQUNiO0lBRU8sbUJBQW1CLENBQUMsSUFBTyxFQUFFLEtBQW9CLEVBQUE7QUFDdkQsUUFBQSxJQUFJLEtBQUssS0FBSyxTQUFTLEVBQUU7QUFDdkIsWUFBQSxNQUFNLElBQUksS0FBSyxDQUFDLHFCQUFxQixDQUFDLENBQUM7U0FDeEM7QUFDRCxRQUFBLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxJQUFJLEVBQUU7QUFDdkIsWUFBQSxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRyxLQUFZLENBQUMsS0FBSyxDQUFDLENBQUM7U0FDcEQ7QUFBTSxhQUFBLElBQ0wsS0FBSyxDQUFDLElBQUksS0FBSyxRQUFRO0FBQ3RCLFlBQUEsS0FBZ0IsQ0FBQyxRQUFRLENBQUMsSUFBSSxLQUFLLElBQUksRUFDeEM7QUFDQSxZQUFBLE1BQU0sTUFBTSxHQUFJLEtBQWdCLENBQUMsUUFBYyxDQUFDO0FBQ2hELFlBQUEsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FDckIsSUFBSSxFQUNKLE1BQU0sQ0FBQyxLQUFLLEVBQ1gsS0FBZ0IsQ0FBQyxTQUFnQixDQUNuQyxDQUFDO1NBQ0g7YUFBTTtBQUNMLFlBQUEsTUFBTSxJQUFJLEtBQUssQ0FBQyx3QkFBd0IsS0FBSyxDQUFBLENBQUUsQ0FBQyxDQUFDO1NBQ2xEO0tBQ0Y7SUFFTyxZQUFZLENBQUMsSUFBTyxFQUFFLEVBQVMsRUFBQTtBQUNyQyxRQUFBLElBQUksZ0JBQWdCLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRTtZQUM3QyxNQUFNLElBQUksS0FBSyxDQUFDLENBQUEsa0JBQUEsRUFBcUIsRUFBRSxDQUFDLEtBQUssQ0FBRSxDQUFBLENBQUMsQ0FBQztTQUNsRDtRQUNELElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztBQUNoQixRQUFBLElBQUksS0FBSyxHQUFHLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztBQUMvQixRQUFBLE9BQ0UsQ0FBQyxJQUFJLENBQUMsS0FBSyxLQUFLLElBQUksQ0FBQyxRQUFRO0FBQzNCLFlBQUEsSUFBSSxDQUFDLEtBQUssS0FBSyxJQUFJLENBQUMsR0FBRztBQUN2QixZQUFBLElBQUksQ0FBQyxLQUFLLEtBQUssSUFBSSxDQUFDLE9BQU87WUFDN0IsSUFBSSxDQUFDLE1BQU8sQ0FBQyxVQUFVLEdBQUcsRUFBRSxDQUFDLFVBQVUsRUFDdkM7QUFDQSxZQUFBLEtBQUssR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxNQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7U0FDL0Q7QUFDRCxRQUFBLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUM7S0FDaEQ7SUFFTyxXQUFXLEdBQUE7UUFDakIsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRTtBQUNoQyxZQUFBLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7WUFDMUIsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDOzs7WUFHaEIsSUFBSSxLQUFLLEtBQUssR0FBRyxJQUFJLEtBQUssS0FBSyxHQUFHLEVBQUU7Z0JBQ2xDLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUU7QUFDL0Isb0JBQUEsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDO2lCQUNsQztxQkFBTSxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFO0FBQ3RDLG9CQUFBLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQztpQkFDbEM7YUFDRjtZQUNELElBQUksZUFBZSxDQUFDLE9BQU8sQ0FBQyxLQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDeEMsZ0JBQUEsTUFBTSxJQUFJLEtBQUssQ0FBQyxxQkFBcUIsS0FBSyxDQUFBLENBQUUsQ0FBQyxDQUFDO0FBQ2hELFlBQUEsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUNoQyxJQUFJLENBQUMsYUFBYSxFQUFFLEVBQ3BCLGtCQUFrQixDQUNuQixDQUFDO1lBQ0YsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7U0FDdEM7QUFDRCxRQUFBLE9BQU8sSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO0tBQzdCO0FBRU8sSUFBQSxhQUFhLENBQUMsU0FBWSxFQUFBO1FBQ2hDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUMsQ0FBQztBQUNsQyxRQUFBLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO0FBQ3pDLFFBQUEsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDMUIsUUFBQSxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztBQUMxQyxRQUFBLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLFFBQVEsRUFBRSxTQUFTLENBQUMsQ0FBQztLQUMxRDtJQUVPLGFBQWEsR0FBQTtBQUNuQixRQUFBLFFBQVEsSUFBSSxDQUFDLEtBQUs7WUFDaEIsS0FBSyxJQUFJLENBQUMsT0FBTztBQUNmLGdCQUFBLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxNQUFPLENBQUM7QUFDN0IsZ0JBQUEsSUFBSSxPQUFPLEtBQUssTUFBTSxFQUFFO29CQUN0QixJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7O29CQUVoQixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDO2lCQUM5QjtxQkFBTSxJQUFJLFFBQVEsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUU7QUFDM0Msb0JBQUEsTUFBTSxJQUFJLEtBQUssQ0FBQyx1QkFBdUIsT0FBTyxDQUFBLENBQUUsQ0FBQyxDQUFDO2lCQUNuRDtBQUNELGdCQUFBLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLE9BQU8sQ0FBQSxDQUFFLENBQUMsQ0FBQztZQUN0RCxLQUFLLElBQUksQ0FBQyxVQUFVO0FBQ2xCLGdCQUFBLE9BQU8sSUFBSSxDQUFDLHdCQUF3QixFQUFFLENBQUM7WUFDekMsS0FBSyxJQUFJLENBQUMsTUFBTTtBQUNkLGdCQUFBLE9BQU8sSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQzdCLEtBQUssSUFBSSxDQUFDLE9BQU87QUFDZixnQkFBQSxPQUFPLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUM5QixLQUFLLElBQUksQ0FBQyxPQUFPO0FBQ2YsZ0JBQUEsT0FBTyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDOUIsS0FBSyxJQUFJLENBQUMsT0FBTztBQUNmLGdCQUFBLElBQUksSUFBSSxDQUFDLE1BQU0sS0FBSyxHQUFHLEVBQUU7QUFDdkIsb0JBQUEsT0FBTyxJQUFJLENBQUMscUJBQXFCLEVBQUUsQ0FBQztpQkFDckM7QUFBTSxxQkFBQSxJQUFJLElBQUksQ0FBQyxNQUFNLEtBQUssR0FBRyxFQUFFO0FBQzlCLG9CQUFBLE9BQU8sSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO2lCQUN6QjtBQUFNLHFCQUFBLElBQUksSUFBSSxDQUFDLE1BQU0sS0FBSyxHQUFHLEVBQUU7QUFDOUIsb0JBQUEsT0FBTyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7aUJBQzFCO0FBQ0QsZ0JBQUEsT0FBTyxTQUFTLENBQUM7WUFDbkIsS0FBSyxJQUFJLENBQUMsS0FBSztBQUNiLGdCQUFBLE1BQU0sSUFBSSxLQUFLLENBQUMsc0JBQXNCLENBQUMsQ0FBQztBQUMxQyxZQUFBO0FBQ0UsZ0JBQUEsT0FBTyxTQUFTLENBQUM7U0FDcEI7S0FDRjtJQUVPLFVBQVUsR0FBQTtRQUNoQixNQUFNLEtBQUssR0FBc0IsRUFBRSxDQUFDO0FBQ3BDLFFBQUEsR0FBRztZQUNELElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNoQixJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUM7Z0JBQUUsTUFBTTtZQUM1QyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLENBQUM7U0FDckMsUUFBUSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRTtRQUNwQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDakMsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztLQUM5QjtJQUVPLFNBQVMsR0FBQTtRQUNmLE1BQU0sT0FBTyxHQUFtQyxFQUFFLENBQUM7QUFDbkQsUUFBQSxHQUFHO1lBQ0QsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ2hCLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQztnQkFBRSxNQUFNO0FBQzVDLFlBQUEsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLE1BQU8sQ0FBQztBQUN6QixZQUFBLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEVBQUU7Z0JBQ2hFLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQzthQUNqQjtBQUNELFlBQUEsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDMUIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1NBQ3hDLFFBQVEsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUU7UUFDcEMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ2pDLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7S0FDL0I7SUFFTyx3QkFBd0IsR0FBQTtBQUM5QixRQUFBLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7QUFDMUIsUUFBQSxJQUFJLEtBQUssS0FBSyxNQUFNLEVBQUU7WUFDcEIsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ2hCLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDaEM7QUFDRCxRQUFBLElBQUksS0FBSyxLQUFLLE9BQU8sRUFBRTtZQUNyQixJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDaEIsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztTQUNqQztBQUNELFFBQUEsSUFBSSxLQUFLLEtBQUssTUFBTSxFQUFFO1lBQ3BCLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNoQixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQ2hDO0FBQ0QsUUFBQSxJQUFJLEtBQUssS0FBSyxXQUFXLEVBQUU7WUFDekIsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ2hCLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7U0FDckM7QUFDRCxRQUFBLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO0FBQzNDLFFBQUEsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO1FBQ3BDLE9BQU8sQ0FBQyxJQUFJLEdBQUcsVUFBVSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUM7S0FDM0U7SUFFTyxnQkFBZ0IsR0FBQTtRQUN0QixJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEVBQUU7WUFDbkMsTUFBTSxJQUFJLEtBQUssQ0FBQyxDQUFBLHFCQUFBLEVBQXdCLElBQUksQ0FBQyxNQUFNLENBQUUsQ0FBQSxDQUFDLENBQUM7U0FDeEQ7QUFDRCxRQUFBLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7UUFDMUIsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ2hCLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsS0FBTSxDQUFDLENBQUM7S0FDN0I7SUFFTyxlQUFlLEdBQUE7QUFDckIsUUFBQSxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxFQUFFO0FBQ3JDLFlBQUEsT0FBTyxTQUFTLENBQUM7U0FDbEI7UUFDRCxNQUFNLElBQUksR0FBeUIsRUFBRSxDQUFDO0FBQ3RDLFFBQUEsR0FBRztZQUNELElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNoQixJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsRUFBRTtnQkFDcEMsTUFBTTthQUNQO0FBQ0QsWUFBQSxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztBQUNyQyxZQUFBLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDakIsUUFBUSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRTtRQUNwQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLENBQUM7QUFDakMsUUFBQSxPQUFPLElBQUksQ0FBQztLQUNiO0lBRU8sV0FBVyxHQUFBOztRQUVqQixJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7QUFDaEIsUUFBQSxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztRQUNyQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLENBQUM7QUFDakMsUUFBQSxPQUFPLElBQUksQ0FBQztLQUNiO0lBRU8scUJBQXFCLEdBQUE7QUFDM0IsUUFBQSxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7UUFDM0MsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRTtZQUM3QixJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7QUFDaEIsWUFBQSxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztBQUNyQyxZQUFBLE1BQU0sTUFBTSxHQUFHLFdBQVcsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQU0sQ0FBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUM5RCxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztTQUM5QzthQUFNO1lBQ0wsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUN6QztLQUNGO0lBRU8sWUFBWSxHQUFBO0FBQ2xCLFFBQUEsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU8sQ0FBQyxDQUFDO1FBQzlDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztBQUNoQixRQUFBLE9BQU8sS0FBSyxDQUFDO0tBQ2Q7SUFFTyxhQUFhLENBQUMsU0FBaUIsRUFBRSxFQUFBO1FBQ3ZDLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxHQUFHLE1BQU0sQ0FBQSxFQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3pFLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztBQUNoQixRQUFBLE9BQU8sS0FBSyxDQUFDO0tBQ2Q7SUFFTyxhQUFhLENBQUMsU0FBaUIsRUFBRSxFQUFBO0FBQ3ZDLFFBQUEsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUcsRUFBQSxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBRSxDQUFBLENBQUMsQ0FBQyxDQUFDO1FBQ3ZFLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztBQUNoQixRQUFBLE9BQU8sS0FBSyxDQUFDO0tBQ2Q7QUFDRjs7QUN6VEQ7OztBQUdHO0FBS0gsTUFBTSxpQkFBaUIsR0FBNEM7SUFDakUsR0FBRyxFQUFFLENBQUMsQ0FBTSxFQUFFLENBQU0sS0FBSyxDQUFDLEdBQUcsQ0FBQztJQUM5QixHQUFHLEVBQUUsQ0FBQyxDQUFNLEVBQUUsQ0FBTSxLQUFLLENBQUMsR0FBRyxDQUFDO0lBQzlCLEdBQUcsRUFBRSxDQUFDLENBQU0sRUFBRSxDQUFNLEtBQUssQ0FBQyxHQUFHLENBQUM7SUFDOUIsR0FBRyxFQUFFLENBQUMsQ0FBTSxFQUFFLENBQU0sS0FBSyxDQUFDLEdBQUcsQ0FBQztJQUM5QixHQUFHLEVBQUUsQ0FBQyxDQUFNLEVBQUUsQ0FBTSxLQUFLLENBQUMsR0FBRyxDQUFDO0lBQzlCLElBQUksRUFBRSxDQUFDLENBQU0sRUFBRSxDQUFNLEtBQUssQ0FBQyxJQUFJLENBQUM7SUFDaEMsSUFBSSxFQUFFLENBQUMsQ0FBTSxFQUFFLENBQU0sS0FBSyxDQUFDLElBQUksQ0FBQztJQUNoQyxLQUFLLEVBQUUsQ0FBQyxDQUFNLEVBQUUsQ0FBTSxLQUFLLENBQUMsS0FBSyxDQUFDO0lBQ2xDLEtBQUssRUFBRSxDQUFDLENBQU0sRUFBRSxDQUFNLEtBQUssQ0FBQyxLQUFLLENBQUM7SUFDbEMsR0FBRyxFQUFFLENBQUMsQ0FBTSxFQUFFLENBQU0sS0FBSyxDQUFDLEdBQUcsQ0FBQztJQUM5QixJQUFJLEVBQUUsQ0FBQyxDQUFNLEVBQUUsQ0FBTSxLQUFLLENBQUMsSUFBSSxDQUFDO0lBQ2hDLEdBQUcsRUFBRSxDQUFDLENBQU0sRUFBRSxDQUFNLEtBQUssQ0FBQyxHQUFHLENBQUM7SUFDOUIsSUFBSSxFQUFFLENBQUMsQ0FBTSxFQUFFLENBQU0sS0FBSyxDQUFDLElBQUksQ0FBQztJQUNoQyxJQUFJLEVBQUUsQ0FBQyxDQUFNLEVBQUUsQ0FBTSxLQUFLLENBQUMsSUFBSSxDQUFDO0lBQ2hDLElBQUksRUFBRSxDQUFDLENBQU0sRUFBRSxDQUFNLEtBQUssQ0FBQyxJQUFJLENBQUM7SUFDaEMsSUFBSSxFQUFFLENBQUMsQ0FBTSxFQUFFLENBQU0sS0FBSyxDQUFDLElBQUksQ0FBQztJQUNoQyxHQUFHLEVBQUUsQ0FBQyxDQUFNLEVBQUUsQ0FBa0IsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3pDLElBQUksRUFBRSxDQUFDLENBQU0sRUFBRSxDQUFrQixLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7Q0FDM0MsQ0FBQztB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QyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztnQkFDbkUsUUFBUSxDQUFDLFVBQVcsQ0FBQyxZQUFZLENBQUMsV0FBVyxFQUFFLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUNyRSxnQkFBQSxRQUFRLENBQUMsVUFBVyxDQUFDLFlBQVksQ0FDL0IsUUFBUSxDQUFDLGFBQWEsQ0FBQyxFQUFFLENBQUMsRUFDMUIsUUFBUSxDQUFDLFdBQVcsQ0FDckIsQ0FBQztnQkFDRixRQUFRLEdBQUcsV0FBVyxDQUFDOzs7OztBQUt2QixnQkFBQSxNQUFNLENBQUMsV0FBVyxHQUFHLFdBQVcsQ0FBQzthQUNsQztTQUNGO0tBQ0Y7QUFDRCxJQUFBLEtBQUssTUFBTSxDQUFDLElBQUksZ0JBQWdCLEVBQUU7UUFDaEMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDO0tBQ1o7QUFDRCxJQUFBLE9BQU8sV0FBVyxDQUFDO0FBQ3JCLENBQUM7O0FDNWVELFNBQVMsTUFBTSxDQUFDLFFBQXNDLEVBQUE7QUFDbEQsSUFBQSxJQUFJLFFBQVEsWUFBWSxtQkFBbUIsRUFBRTtBQUN6QyxRQUFBLE9BQU8sUUFBUSxDQUFDO0tBQ25CO0FBQU0sU0FBQSxJQUFJLFFBQVEsS0FBSyxPQUFPLFFBQVEsRUFBRTtRQUNyQyxNQUFNLE9BQU8sR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ25ELFFBQUEsT0FBTyxDQUFDLFNBQVMsR0FBRyxRQUFRLENBQUM7QUFDN0IsUUFBQSxPQUFPLE9BQU8sQ0FBQztLQUNsQjtTQUFNO1FBQ0gsTUFBTSxJQUFJLFNBQVMsQ0FBQyxDQUFBLDBDQUFBLEVBQTZDLE9BQU8sUUFBUSxDQUFBLENBQUEsQ0FBRyxDQUFDLENBQUM7S0FDeEY7QUFDTCxDQUFDO0FBRUQsU0FBUyx5QkFBeUIsQ0FBQyxPQUF1QyxFQUFBO0lBQ3RFLE1BQU0sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLGFBQWEsRUFBRSxHQUFHLE9BQU8sSUFBSSxFQUFFLENBQUM7SUFDN0QsT0FBTyxDQUFDLFFBQXNDLEtBQUk7QUFDOUMsUUFBQSxPQUFPLGVBQWUsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxhQUFhLENBQUMsQ0FBQztBQUNqRixLQUFDLENBQUM7QUFDTjs7OzsiLCJ4X2dvb2dsZV9pZ25vcmVMaXN0IjpbMCwxLDIsMyw0LDUsNiw3LDgsOSwxMCwxMiwxMywxNCwxNSwxNl0sInNvdXJjZVJvb3QiOiJjZHA6Ly8vQGNkcC9leHRlbnNpb24tdGVtcGxhdGUtYnJpZGdlLyJ9