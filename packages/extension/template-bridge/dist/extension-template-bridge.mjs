/*!
 * @cdp/extension-template-bridge 0.9.21
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uLXRlbXBsYXRlLWJyaWRnZS5tanMiLCJzb3VyY2VzIjpbImxpdC10cmFuc2Zvcm1lci9zcmMvbGl0LXRyYW5zZm9ybWVyLmpzIiwibGl0LXRyYW5zZm9ybWVyL3NyYy9oZWxwZXIvZGF0YUhlbHBlci5qcyIsImxpdC10cmFuc2Zvcm1lci9zcmMvdHJhbnNmb3JtZXJzL3ZhcmlhYmxlVHJhbnNmb3JtZXIuanMiLCJsaXQtdHJhbnNmb3JtZXIvc3JjL3RyYW5zZm9ybWVycy91bnNhZmVWYXJpYWJsZS5qcyIsImxpdC10cmFuc2Zvcm1lci9zcmMvaGVscGVyL2lzTXVzdGFjaGVGYWxzeS5qcyIsImxpdC10cmFuc2Zvcm1lci9zcmMvaGVscGVyL3NlY3Rpb25IZWxwZXIuanMiLCJsaXQtdHJhbnNmb3JtZXIvc3JjL3RyYW5zZm9ybWVycy9zZWN0aW9uLmpzIiwibGl0LXRyYW5zZm9ybWVyL3NyYy90cmFuc2Zvcm1lcnMvaW52ZXJ0ZWRTZWN0aW9uLmpzIiwibGl0LXRyYW5zZm9ybWVyL3NyYy90cmFuc2Zvcm1lcnMvY29tbWVudC5qcyIsImxpdC10cmFuc2Zvcm1lci9zcmMvdHJhbnNmb3JtZXJzL2N1c3RvbURlbGltaXRlci5qcyIsImxpdC10cmFuc2Zvcm1lci9zcmMvbGl0LXRyYW5zZm9ybWVyLWNvbmZpZ3VyZWRPdXRPZlRoZUJveC5qcyIsImJyaWRnZS1tdXN0YWNoZS50cyIsImpleHByL3NyYy9saWIvY29uc3RhbnRzLnRzIiwiamV4cHIvc3JjL2xpYi90b2tlbml6ZXIudHMiLCJqZXhwci9zcmMvbGliL3BhcnNlci50cyIsImpleHByL3NyYy9saWIvZXZhbC50cyIsInN0YW1waW5vL3NyYy9zdGFtcGluby50cyIsImJyaWRnZS1zdGFtcGluby50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKiogXHJcbiAqIEBwYXJhbSB7b2JqZWN0fSBjb25maWcgPSB7XHJcbiAqICBodG1sOiBsaXQtaHRtbC5odG1sLFxyXG4gKiAgZGVsaW1pdGVyOiB7IHN0YXJ0OiAne3snLCBlbmQ6ICd9fScgfSxcclxuICogIHRyYW5zZm9ybWVyczogeyAvLyBub3RlIHRoYXQgdHJhbnNmb3JtVmFyaWFibGUgaXMgbm90IGhlcmUuIEl0IGdldHMgYXBwbGllZCB3aGVuIG5vIHRyYW5zZm9ybWVyLnRlc3QgaGFzIHBhc3NlZFxyXG4gKiAgICBuYW1lOiB7XHJcbiAqICAgICAgdGVzdDogKHN0ciwgY29uZmlnKSA9PiBib29sLFxyXG4gKiAgICAgIHRyYW5zZm9ybTogKHN0ciwgY29uZmlnKSA9PiAoe1xyXG4gKiAgICAgICAgcmVtYWluaW5nVG1wbFN0cjogc3RyLFxyXG4gKiAgICAgICAgaW5zZXJ0aW9uUG9pbnQ6IGN0eCA9PiBsaXQtaHRtbC5UZW1wbGF0ZVJlc3VsdCB8IHVuZGVmaW5lZCwgLy8gaWYgdW5kZWZpbmVkIHJlbWFpbmluZ1RtcGxTdHIgd2lsbCBiZSBtZXJnZWQgd2l0aCBsYXN0IHN0YXRpYyBwYXJ0IFxyXG4gKiAgICAgIH0pLFxyXG4gKiAgICB9LFxyXG4gKiAgfSxcclxuICogIHRyYW5zZm9ybVZhcmlhYmxlLCBcclxuICogfVxyXG4gKiBAcmV0dXJucyB7ZnVuY3Rpb259IHN0clRlbXBsYXRlID0+IGN0eCA9PiBsaXQtaHRtbC5UZW1wbGF0ZVJlc3VsdFxyXG4gKi9cclxuZXhwb3J0IGRlZmF1bHQgY29uZmlnID0+IHN0clRlbXBsYXRlID0+IHRyYW5zZm9ybShzdHJUZW1wbGF0ZSwgY29uZmlnKVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHRyYW5zZm9ybSh0bXBsMlBhcnNlLCBjb25maWcpIHtcclxuICBjb25zdCBzdGF0aWNQYXJ0cyA9IFtdXHJcbiAgY29uc3QgaW5zZXJ0aW9uUG9pbnRzID0gW11cclxuXHJcbiAgbGV0IHJlbWFpbmluZ1RtcGxTdHIgPSB0bXBsMlBhcnNlXHJcbiAgbGV0IHN0YXJ0SW5kZXhPZklQID0gcmVtYWluaW5nVG1wbFN0ci5pbmRleE9mKGNvbmZpZy5kZWxpbWl0ZXIuc3RhcnQpXHJcbiAgd2hpbGUgKHN0YXJ0SW5kZXhPZklQID49IDApIHtcclxuICAgIGlmIChyZW1haW5pbmdUbXBsU3RyLmluZGV4T2YoY29uZmlnLmRlbGltaXRlci5lbmQsIHN0YXJ0SW5kZXhPZklQKSA8IDApXHJcbiAgICAgIHRocm93IG5ldyBFcnJvcihgbWlzc2luZyBlbmQgZGVsaW1pdGVyIGF0OiAnJHtyZW1haW5pbmdUbXBsU3RyfSdgKVxyXG5cclxuICAgIHN0YXRpY1BhcnRzLnB1c2gocmVtYWluaW5nVG1wbFN0ci5zdWJzdHJpbmcoMCwgc3RhcnRJbmRleE9mSVApKVxyXG5cclxuICAgIGNvbnN0IGlQVHJhbnNmb3JtUmVzdWx0ID0gdHJhbnNmb3JtSVAoXHJcbiAgICAgIHJlbWFpbmluZ1RtcGxTdHIuc3Vic3RyaW5nKHN0YXJ0SW5kZXhPZklQICsgY29uZmlnLmRlbGltaXRlci5zdGFydC5sZW5ndGgpLFxyXG4gICAgICBjb25maWdcclxuICAgIClcclxuXHJcbiAgICBpZiAoaVBUcmFuc2Zvcm1SZXN1bHQuaW5zZXJ0aW9uUG9pbnQpIHtcclxuICAgICAgcmVtYWluaW5nVG1wbFN0ciA9IGlQVHJhbnNmb3JtUmVzdWx0LnJlbWFpbmluZ1RtcGxTdHJcclxuICAgICAgaW5zZXJ0aW9uUG9pbnRzLnB1c2goaVBUcmFuc2Zvcm1SZXN1bHQuaW5zZXJ0aW9uUG9pbnQpXHJcbiAgICAgIHN0YXJ0SW5kZXhPZklQID0gcmVtYWluaW5nVG1wbFN0ci5pbmRleE9mKGNvbmZpZy5kZWxpbWl0ZXIuc3RhcnQpXHJcbiAgICB9IGVsc2UgeyAvLyBlLmcuIGNvbW1lbnQgb3IgY3VzdG9tRGVsaW1ldGVyXHJcbiAgICAgIGNvbnN0IGxhc3RTdGF0aWNQYXJ0ID0gc3RhdGljUGFydHMucG9wKClcclxuICAgICAgcmVtYWluaW5nVG1wbFN0ciA9IGxhc3RTdGF0aWNQYXJ0ICsgaVBUcmFuc2Zvcm1SZXN1bHQucmVtYWluaW5nVG1wbFN0clxyXG4gICAgICBzdGFydEluZGV4T2ZJUCA9IHJlbWFpbmluZ1RtcGxTdHIuaW5kZXhPZihjb25maWcuZGVsaW1pdGVyLnN0YXJ0LCBsYXN0U3RhdGljUGFydC5sZW5ndGgpXHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBzdGF0aWNQYXJ0cy5wdXNoKHJlbWFpbmluZ1RtcGxTdHIpXHJcblxyXG4gIHJldHVybiBjdHggPT5cclxuICAgIGNvbmZpZy5odG1sKHN0YXRpY1BhcnRzLCAuLi5pbnNlcnRpb25Qb2ludHMubWFwKGlQID0+IGlQKGN0eCkpKVxyXG59XHJcblxyXG5mdW5jdGlvbiB0cmFuc2Zvcm1JUChyZW1haW5pbmdUbXBsU3RyLCBjb25maWcpIHtcclxuICBjb25zdCB0cmFuc2Zvcm1lciA9IE9iamVjdC52YWx1ZXMoY29uZmlnLnRyYW5zZm9ybWVycykuZmluZCh0ID0+IHQudGVzdChyZW1haW5pbmdUbXBsU3RyLCBjb25maWcpKVxyXG4gIGNvbnN0IHRyYW5zZm9ybUZ1bmN0aW9uID0gdHJhbnNmb3JtZXJcclxuICAgID8gdHJhbnNmb3JtZXIudHJhbnNmb3JtXHJcbiAgICA6IGNvbmZpZy50cmFuc2Zvcm1WYXJpYWJsZVxyXG4gIHJldHVybiB0cmFuc2Zvcm1GdW5jdGlvbihyZW1haW5pbmdUbXBsU3RyLCBjb25maWcpXHJcbn0iLCJleHBvcnQgZnVuY3Rpb24gY3R4MlZhbHVlKGN0eCwga2V5KSB7XHJcbiAgaWYgKGtleSA9PT0gJy4nKVxyXG4gICAgcmV0dXJuIGN0eFxyXG5cclxuICBsZXQgcmVzdWx0ID0gY3R4XHJcbiAgZm9yIChsZXQgayBvZiBrZXkuc3BsaXQoJy4nKSkge1xyXG4gICAgaWYgKCFyZXN1bHQuaGFzT3duUHJvcGVydHkoaykpXHJcbiAgICAgIHJldHVybiAnJ1xyXG5cclxuICAgIHJlc3VsdCA9IHJlc3VsdFtrXVxyXG4gIH1cclxuXHJcbiAgcmV0dXJuIHJlc3VsdFxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY3R4Mk11c3RhY2hlU3RyaW5nKGN0eCwga2V5KSB7XHJcbiAgcmV0dXJuIG11c3RhY2hlU3RyaW5neWZ5KGN0eDJWYWx1ZShjdHgsIGtleSkpXHJcbn1cclxuXHJcbmZ1bmN0aW9uIG11c3RhY2hlU3RyaW5neWZ5KHZhbHVlKSB7XHJcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09IG51bGwpXHJcbiAgICByZXR1cm4gJydcclxuXHJcbiAgcmV0dXJuICcnICsgdmFsdWVcclxufSIsImltcG9ydCB7IGN0eDJNdXN0YWNoZVN0cmluZyB9IGZyb20gJy4uL2hlbHBlci9kYXRhSGVscGVyLmpzJ1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgKHJlbWFpbmluZ1RtcGxTdHIsIHsgZGVsaW1pdGVyIH0pID0+IHtcclxuICBjb25zdCBpbmRleE9mRW5kRGVsaW1pdGVyID0gcmVtYWluaW5nVG1wbFN0ci5pbmRleE9mKGRlbGltaXRlci5lbmQpXHJcbiAgY29uc3QgZGF0YUtleSA9IHJlbWFpbmluZ1RtcGxTdHIuc3Vic3RyaW5nKDAsIGluZGV4T2ZFbmREZWxpbWl0ZXIpXHJcbiAgcmV0dXJuIHtcclxuICAgIHJlbWFpbmluZ1RtcGxTdHI6IHJlbWFpbmluZ1RtcGxTdHIuc3Vic3RyaW5nKGluZGV4T2ZFbmREZWxpbWl0ZXIgKyBkZWxpbWl0ZXIuZW5kLmxlbmd0aCksXHJcbiAgICBpbnNlcnRpb25Qb2ludDogY3R4ID0+IGN0eDJNdXN0YWNoZVN0cmluZyhjdHgsIGRhdGFLZXkpXHJcbiAgfVxyXG59IiwiaW1wb3J0IHsgY3R4Mk11c3RhY2hlU3RyaW5nIH0gZnJvbSAnLi4vaGVscGVyL2RhdGFIZWxwZXIuanMnXHJcblxyXG4vKiogTm90ZSwgdGhpcyBpcyB1bnNhZmUgdG8gdXNlLCBiZWNhdXNlIHRoZSByZW5kZXJlZCBvdXRwdXQgY291bGQgYmUgYW55IEphdmFTY3JpcHQhICovXHJcbmV4cG9ydCBkZWZhdWx0IHVuc2FmZUhUTUwgPT4gKHtcclxuICB0ZXN0OiByZW1haW5pbmdUbXBsU3RyID0+IHJlbWFpbmluZ1RtcGxTdHJbMF0gPT09ICd7JyxcclxuICB0cmFuc2Zvcm06IChyZW1haW5pbmdUbXBsU3RyLCB7IGRlbGltaXRlciB9KSA9PiB7XHJcbiAgICBjb25zdCBpbmRleE9mRW5kRGVsaW1pdGVyID0gcmVtYWluaW5nVG1wbFN0ci5pbmRleE9mKCd9JyArIGRlbGltaXRlci5lbmQpXHJcbiAgICBpZiAoaW5kZXhPZkVuZERlbGltaXRlciA8IDApXHJcbiAgICAgIHRocm93IG5ldyBFcnJvcihgbWlzc2luZyBlbmQgZGVsaW1pdGVyIGF0OiAnJHtkZWxpbWl0ZXIuc3RhcnR9JHtyZW1haW5pbmdUbXBsU3RyfSdgKVxyXG4gIFxyXG4gICAgY29uc3QgZGF0YUtleSA9IHJlbWFpbmluZ1RtcGxTdHIuc3Vic3RyaW5nKDEsIGluZGV4T2ZFbmREZWxpbWl0ZXIpXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICByZW1haW5pbmdUbXBsU3RyOiByZW1haW5pbmdUbXBsU3RyLnN1YnN0cmluZyhpbmRleE9mRW5kRGVsaW1pdGVyICsgMSArIGRlbGltaXRlci5lbmQubGVuZ3RoKSxcclxuICAgICAgaW5zZXJ0aW9uUG9pbnQ6IGN0eCA9PiB1bnNhZmVIVE1MKGN0eDJNdXN0YWNoZVN0cmluZyhjdHgsIGRhdGFLZXkpKSxcclxuICAgIH1cclxuICB9XHJcbn0pIiwiZXhwb3J0IGZ1bmN0aW9uIGlzTXVzdGFjaGVGYWxzeSh2YWx1ZSkge1xyXG4gIHJldHVybiBbbnVsbCwgdW5kZWZpbmVkLCBmYWxzZSwgMCwgTmFOLCAnJ11cclxuICAgIC5zb21lKGZhbHN5ID0+IGZhbHN5ID09PSB2YWx1ZSlcclxuICAgIHx8ICh2YWx1ZS5sZW5ndGggJiYgdmFsdWUubGVuZ3RoID09PSAwKVxyXG59IiwiZXhwb3J0IGZ1bmN0aW9uIHBhcnNlU2VjdGlvbih0bXBsU3RyLCBkZWxpbWl0ZXIpIHtcclxuICBjb25zdCBpbmRleE9mU3RhcnRUYWdFbmQgPSB0bXBsU3RyLmluZGV4T2YoZGVsaW1pdGVyLmVuZClcclxuICBjb25zdCBkYXRhS2V5ID0gdG1wbFN0ci5zdWJzdHJpbmcoMSwgaW5kZXhPZlN0YXJ0VGFnRW5kKVxyXG4gIGNvbnN0IGVuZFRhZyA9IGAke2RlbGltaXRlci5zdGFydH0vJHtkYXRhS2V5fSR7ZGVsaW1pdGVyLmVuZH1gXHJcbiAgY29uc3QgaW5kZXhPZkVuZFRhZ1N0YXJ0ID0gdG1wbFN0ci5pbmRleE9mKGVuZFRhZylcclxuICBpZiAoaW5kZXhPZkVuZFRhZ1N0YXJ0IDwgMClcclxuICAgIHRocm93IG5ldyBFcnJvcihgbWlzc2luZyBlbmQgZGVsaW1pdGVyIGF0OiAnJHtkZWxpbWl0ZXIuc3RhcnR9JHt0bXBsU3RyfSdgKVxyXG4gIFxyXG4gIHJldHVybiB7XHJcbiAgICBkYXRhS2V5LFxyXG4gICAgaW5uZXJUbXBsOiB0bXBsU3RyLnN1YnN0cmluZyhpbmRleE9mU3RhcnRUYWdFbmQgKyBkZWxpbWl0ZXIuc3RhcnQubGVuZ3RoLCBpbmRleE9mRW5kVGFnU3RhcnQpLFxyXG4gICAgcmVtYWluaW5nVG1wbFN0cjogdG1wbFN0ci5zdWJzdHJpbmcoaW5kZXhPZkVuZFRhZ1N0YXJ0ICsgZW5kVGFnLmxlbmd0aCksXHJcbiAgfVxyXG59IiwiaW1wb3J0IHsgdHJhbnNmb3JtIH0gZnJvbSAnLi4vbGl0LXRyYW5zZm9ybWVyLmpzJ1xyXG5pbXBvcnQgeyBjdHgyVmFsdWUgfSBmcm9tICcuLi9oZWxwZXIvZGF0YUhlbHBlci5qcydcclxuaW1wb3J0IHsgaXNNdXN0YWNoZUZhbHN5IH0gZnJvbSAnLi4vaGVscGVyL2lzTXVzdGFjaGVGYWxzeS5qcydcclxuaW1wb3J0IHsgcGFyc2VTZWN0aW9uIH0gZnJvbSAnLi4vaGVscGVyL3NlY3Rpb25IZWxwZXIuanMnXHJcblxyXG4vKiogTm90ZSwgdW5saWtlIHdpdGhpbiBtdXN0YWNoZSBmdW5jdGlvbnMgYXMgZGF0YSB2YWx1ZXMgYXJlIG5vdCBzdXBwb3J0ZWQgb3V0IG9mIHRoZSBib3ggKi9cclxuZXhwb3J0IGRlZmF1bHQgKCkgPT4gKHtcclxuICB0ZXN0OiByZW1haW5pbmdUbXBsU3RyID0+IHJlbWFpbmluZ1RtcGxTdHJbMF0gPT09ICcjJyxcclxuICB0cmFuc2Zvcm06IChyZW1haW5pbmdUbXBsU3RyLCBjb25maWcpID0+IHtcclxuICAgIGNvbnN0IHBhcnNlZFNlY3Rpb24gPSBwYXJzZVNlY3Rpb24ocmVtYWluaW5nVG1wbFN0ciwgY29uZmlnLmRlbGltaXRlcilcclxuICAgIGNvbnN0IHRyYW5zZm9ybWVkSW5uZXJUbXBsID0gdHJhbnNmb3JtKHBhcnNlZFNlY3Rpb24uaW5uZXJUbXBsLCBjb25maWcpXHJcbiAgICBcclxuICAgIHJldHVybiB7XHJcbiAgICAgIHJlbWFpbmluZ1RtcGxTdHI6IHBhcnNlZFNlY3Rpb24ucmVtYWluaW5nVG1wbFN0cixcclxuICAgICAgaW5zZXJ0aW9uUG9pbnQ6IGN0eCA9PiB7XHJcbiAgICAgICAgY29uc3Qgc2VjdGlvbkRhdGEgPSBjdHgyVmFsdWUoY3R4LCBwYXJzZWRTZWN0aW9uLmRhdGFLZXkpXHJcbiAgICAgICAgXHJcbiAgICAgICAgaWYgKGlzTXVzdGFjaGVGYWxzeShzZWN0aW9uRGF0YSkpXHJcbiAgICAgICAgICByZXR1cm4gJyc7XHJcblxyXG4gICAgICAgIHJldHVybiBzZWN0aW9uRGF0YS5tYXBcclxuICAgICAgICAgID8gc2VjdGlvbkRhdGEubWFwKGlubmVyQ3R4ID0+IHRyYW5zZm9ybWVkSW5uZXJUbXBsKGlubmVyQ3R4KSlcclxuICAgICAgICAgIDogdHJhbnNmb3JtZWRJbm5lclRtcGwoY3R4KVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG59KSIsImltcG9ydCB7IGN0eDJWYWx1ZSB9IGZyb20gJy4uL2hlbHBlci9kYXRhSGVscGVyLmpzJ1xyXG5pbXBvcnQgeyBpc011c3RhY2hlRmFsc3kgfSBmcm9tICcuLi9oZWxwZXIvaXNNdXN0YWNoZUZhbHN5LmpzJ1xyXG5pbXBvcnQgeyBwYXJzZVNlY3Rpb24gfSBmcm9tICcuLi9oZWxwZXIvc2VjdGlvbkhlbHBlci5qcydcclxuXHJcbmV4cG9ydCBkZWZhdWx0ICgpID0+ICh7XHJcbiAgdGVzdDogcmVtYWluaW5nVG1wbFN0ciA9PiByZW1haW5pbmdUbXBsU3RyWzBdID09PSAnXicsXHJcbiAgdHJhbnNmb3JtOiAocmVtYWluaW5nVG1wbFN0ciwgeyBkZWxpbWl0ZXIgfSkgPT4ge1xyXG4gICAgY29uc3QgcGFyc2VkU2VjdGlvbiA9IHBhcnNlU2VjdGlvbihyZW1haW5pbmdUbXBsU3RyLCBkZWxpbWl0ZXIpXHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgcmVtYWluaW5nVG1wbFN0cjogcGFyc2VkU2VjdGlvbi5yZW1haW5pbmdUbXBsU3RyLFxyXG4gICAgICBpbnNlcnRpb25Qb2ludDogY3R4ID0+XHJcbiAgICAgICAgaXNNdXN0YWNoZUZhbHN5KGN0eDJWYWx1ZShjdHgsIHBhcnNlZFNlY3Rpb24uZGF0YUtleSkpXHJcbiAgICAgICAgICA/IHBhcnNlZFNlY3Rpb24uaW5uZXJUbXBsXHJcbiAgICAgICAgICA6ICcnLFxyXG4gICAgfVxyXG4gIH1cclxufSkiLCJleHBvcnQgZGVmYXVsdCAoKSA9PiAoe1xyXG4gIHRlc3Q6IHJlbWFpbmluZ1RtcGxTdHIgPT4gcmVtYWluaW5nVG1wbFN0clswXSA9PT0gJyEnLFxyXG4gIHRyYW5zZm9ybTogKHJlbWFpbmluZ1RtcGxTdHIsIHsgZGVsaW1pdGVyIH0pID0+ICh7XHJcbiAgICByZW1haW5pbmdUbXBsU3RyOiByZW1haW5pbmdUbXBsU3RyLnN1YnN0cmluZyhyZW1haW5pbmdUbXBsU3RyLmluZGV4T2YoZGVsaW1pdGVyLmVuZCkgKyBkZWxpbWl0ZXIuZW5kLmxlbmd0aCksXHJcbiAgICBpbnNlcnRpb25Qb2ludDogdW5kZWZpbmVkLFxyXG4gIH0pXHJcbn0pIiwiZXhwb3J0IGRlZmF1bHQgKCkgPT4gKHtcclxuICB0ZXN0OiByZW1haW5pbmdUbXBsU3RyID0+IHJlbWFpbmluZ1RtcGxTdHJbMF0gPT09ICc9JyxcclxuICB0cmFuc2Zvcm06IChyZW1haW5pbmdUbXBsU3RyLCBjb25maWcpID0+IHtcclxuICAgIGNvbnN0IG9yaWdpbmFsRW5kRGVsaUxlbmd0aCA9IGNvbmZpZy5kZWxpbWl0ZXIuZW5kLmxlbmd0aFxyXG4gICAgY29uc3QgaW5kZXhPZkVuZFRhZyA9IHJlbWFpbmluZ1RtcGxTdHIuaW5kZXhPZignPScgKyBjb25maWcuZGVsaW1pdGVyLmVuZClcclxuICAgIGlmIChpbmRleE9mRW5kVGFnIDwgMCApXHJcbiAgICAgIHRocm93IG5ldyBFcnJvcihgbWlzc2luZyBlbmQgZGVsaW1pdGVyIGF0OiAnJHtyZW1haW5pbmdUbXBsU3RyfSdgKVxyXG5cclxuICAgIGNvbnN0IFsgbmV3U3RhcnREZWxpLCBuZXdFbmREZWxpIF0gPSByZW1haW5pbmdUbXBsU3RyLnN1YnN0cmluZygxLCBpbmRleE9mRW5kVGFnKS5zcGxpdCgnICcpXHJcblxyXG4gICAgY29uZmlnLmRlbGltaXRlci5zdGFydCA9IG5ld1N0YXJ0RGVsaVxyXG4gICAgY29uZmlnLmRlbGltaXRlci5lbmQgPSBuZXdFbmREZWxpXHJcbiAgICBcclxuICAgIHJldHVybiB7XHJcbiAgICAgIHJlbWFpbmluZ1RtcGxTdHI6IHJlbWFpbmluZ1RtcGxTdHIuc3Vic3RyaW5nKGluZGV4T2ZFbmRUYWcgKyAxICsgb3JpZ2luYWxFbmREZWxpTGVuZ3RoKSxcclxuICAgICAgaW5zZXJ0aW9uUG9pbnQ6IHVuZGVmaW5lZCwgIFxyXG4gICAgfVxyXG4gIH1cclxufSkiLCJpbXBvcnQgY3JlYXRlVHJhbnNmb3JtIGZyb20gJy4vbGl0LXRyYW5zZm9ybWVyLmpzJ1xyXG5pbXBvcnQgdHJhbnNmb3JtVmFyaWFibGUgZnJvbSAnLi90cmFuc2Zvcm1lcnMvdmFyaWFibGVUcmFuc2Zvcm1lci5qcydcclxuaW1wb3J0IHVuc2FmZVZhcmlhYmxlVHJhbnNmb3JtZXIgZnJvbSAnLi90cmFuc2Zvcm1lcnMvdW5zYWZlVmFyaWFibGUuanMnXHJcbmltcG9ydCBzZWN0aW9uVHJhbnNmb3JtZXIgZnJvbSAnLi90cmFuc2Zvcm1lcnMvc2VjdGlvbi5qcydcclxuaW1wb3J0IGludmVydGVkU2VjdGlvblRyYW5zZm9ybWVyIGZyb20gJy4vdHJhbnNmb3JtZXJzL2ludmVydGVkU2VjdGlvbi5qcydcclxuaW1wb3J0IGNvbW1lbnRUcmFuc2Zvcm1lciBmcm9tICcuL3RyYW5zZm9ybWVycy9jb21tZW50LmpzJ1xyXG5pbXBvcnQgY3VzdG9tRGVsaW1pdGVyVHJhbnNmb3JtZXIgZnJvbSAnLi90cmFuc2Zvcm1lcnMvY3VzdG9tRGVsaW1pdGVyLmpzJ1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgKGh0bWwsIHVuc2FmZUhUTUwpID0+XHJcbiAgY3JlYXRlVHJhbnNmb3JtKHtcclxuICAgIGh0bWwsXHJcbiAgICBkZWxpbWl0ZXI6IHsgc3RhcnQ6ICd7eycsIGVuZDogJ319JyB9LFxyXG4gICAgdHJhbnNmb3JtVmFyaWFibGUsXHJcbiAgICB0cmFuc2Zvcm1lcnM6IHtcclxuICAgICAgdW5zYWZlVmFyaWFibGU6IHVuc2FmZVZhcmlhYmxlVHJhbnNmb3JtZXIodW5zYWZlSFRNTCksXHJcbiAgICAgIHNlY3Rpb246IHNlY3Rpb25UcmFuc2Zvcm1lcigpLFxyXG4gICAgICBpbnZlcnRlZFNlY3Rpb246IGludmVydGVkU2VjdGlvblRyYW5zZm9ybWVyKCksXHJcbiAgICAgIGNvbW1lbnQ6IGNvbW1lbnRUcmFuc2Zvcm1lcigpLFxyXG4gICAgICBjdXN0b21EZWxpbWl0ZXJUcmFuc2Zvcm1lcjogY3VzdG9tRGVsaW1pdGVyVHJhbnNmb3JtZXIoKSxcclxuICAgIH0sXHJcbiAgfSkiLCJpbXBvcnQgeyB0b1RlbXBsYXRlU3RyaW5nc0FycmF5IH0gZnJvbSAnQGNkcC9leHRlbnNpb24tdGVtcGxhdGUnO1xuaW1wb3J0IHR5cGUgeyBUZW1wbGF0ZUJyaWRnZUVuZGluZSwgVGVtcGxhdGVUcmFuc2Zvcm1lciB9IGZyb20gJ0BicmlkZ2UvaW50ZXJmYWNlcyc7XG5pbXBvcnQgdHlwZSB7XG4gICAgTXVzdGFjaGVUcmFuc2Zvcm1lcixcbiAgICBUZW1wbGF0ZVRhZyxcbiAgICBUcmFuc2Zvcm1EaXJlY3RpdmUsXG4gICAgVHJhbnNmb3JtVGVzdGVyLFxuICAgIFRyYW5zZm9ybUV4ZWN1dG9yLFxuICAgIFRyYW5zZm9ybWVDb250ZXh0LFxuICAgIFRyYW5zZm9ybUNvbmZpZyxcbn0gZnJvbSAnbGl0LXRyYW5zZm9ybWVyL3NyYy9pbnRlcmZhY2VzJztcblxuaW1wb3J0IGNyZWF0ZURlZmF1bHQgZnJvbSAnbGl0LXRyYW5zZm9ybWVyJztcbmltcG9ydCBjcmVhdGVDdXN0b20gZnJvbSAnbGl0LXRyYW5zZm9ybWVyL3NyYy9saXQtdHJhbnNmb3JtZXInO1xuXG5pbXBvcnQgdmFyaWFibGUgZnJvbSAnbGl0LXRyYW5zZm9ybWVyL3NyYy90cmFuc2Zvcm1lcnMvdmFyaWFibGVUcmFuc2Zvcm1lcic7XG5pbXBvcnQgdW5zYWZlVmFyaWFibGUgZnJvbSAnbGl0LXRyYW5zZm9ybWVyL3NyYy90cmFuc2Zvcm1lcnMvdW5zYWZlVmFyaWFibGUnO1xuaW1wb3J0IHNlY3Rpb24gZnJvbSAnbGl0LXRyYW5zZm9ybWVyL3NyYy90cmFuc2Zvcm1lcnMvc2VjdGlvbic7XG5pbXBvcnQgaW52ZXJ0ZWRTZWN0aW9uIGZyb20gJ2xpdC10cmFuc2Zvcm1lci9zcmMvdHJhbnNmb3JtZXJzL2ludmVydGVkU2VjdGlvbic7XG5pbXBvcnQgY29tbWVudCBmcm9tICdsaXQtdHJhbnNmb3JtZXIvc3JjL3RyYW5zZm9ybWVycy9jb21tZW50JztcbmltcG9ydCBjdXN0b21EZWxpbWl0ZXIgZnJvbSAnbGl0LXRyYW5zZm9ybWVyL3NyYy90cmFuc2Zvcm1lcnMvY3VzdG9tRGVsaW1pdGVyJztcblxuLyoqIEBpbnRlcm5hbCAqL1xudHlwZSBNdXN0YWNoZVRyYW5zZm9ybWVyQ29udGV4dCA9IE11c3RhY2hlVHJhbnNmb3JtZXIgJiB7IGRlbGltaXRlcjogeyBzdGFydDogc3RyaW5nOyBlbmQ6IHN0cmluZzsgfTsgfTtcblxuY29uc3QgeGZvcm0gPSAobXVzdGFjaGU6IE11c3RhY2hlVHJhbnNmb3JtZXJDb250ZXh0KTogVGVtcGxhdGVUcmFuc2Zvcm1lciA9PiB7XG4gICAgcmV0dXJuICh0ZW1wbGF0ZTogSFRNTFRlbXBsYXRlRWxlbWVudCB8IHN0cmluZyk6IFRlbXBsYXRlQnJpZGdlRW5kaW5lID0+IHtcbiAgICAgICAgY29uc3QgeyBzdGFydCwgZW5kIH0gPSBtdXN0YWNoZS5kZWxpbWl0ZXI7XG5cbiAgICAgICAgLy8g44Kz44Oh44Oz44OI44OW44Ot44OD44Kv5YaF44GuIGRlbGltaXRlciDmir3lh7pcbiAgICAgICAgY29uc3QgcmVnQ29tbWVudFJlbW92ZVN0YXJ0ID0gbmV3IFJlZ0V4cChgPCEtLVxcXFxzKiR7c3RhcnR9YCwgJ2cnKTtcbiAgICAgICAgY29uc3QgcmVnQ29tbWVudFJlbW92ZUVuZCAgID0gbmV3IFJlZ0V4cChgJHtlbmR9XFxcXHMqLS0+YCwgJ2cnKTtcbiAgICAgICAgLy8gZGVsaW1pdGVyIOWJjeW+jOOBriB0cmltIOeUqOato+imj+ihqOePvlxuICAgICAgICBjb25zdCByZWdUcmltID0gbmV3IFJlZ0V4cChgKCR7c3RhcnR9WyNeL10/KVxcXFxzKihbXFxcXHdcXFxcLl0rKVxcXFxzKigke2VuZH0pYCwgJ2cnKTtcblxuICAgICAgICBjb25zdCBib2R5ID0gKHRlbXBsYXRlIGluc3RhbmNlb2YgSFRNTFRlbXBsYXRlRWxlbWVudCA/IHRlbXBsYXRlLmlubmVySFRNTCA6IHRlbXBsYXRlKVxuICAgICAgICAgICAgLnJlcGxhY2UocmVnQ29tbWVudFJlbW92ZVN0YXJ0LCBzdGFydClcbiAgICAgICAgICAgIC5yZXBsYWNlKHJlZ0NvbW1lbnRSZW1vdmVFbmQsIGVuZClcbiAgICAgICAgICAgIC5yZXBsYWNlKHJlZ1RyaW0sICckMSQyJDMnKVxuICAgICAgICA7XG5cbiAgICAgICAgcmV0dXJuIG11c3RhY2hlKGJvZHkpO1xuICAgIH07XG59O1xuXG4vKlxuICogbGl0LWh0bWwgdjIuMS4wK1xuICogVGVtcGxhdGVTdHJpbmdzQXJyYXkg44KS5Y6z5a+G44Gr44OB44Kn44OD44Kv44GZ44KL44KI44GG44Gr44Gq44Gj44Gf44Gf44KBIHBhdGNoIOOCkuOBguOBpuOCi1xuICogaHR0cHM6Ly9naXRodWIuY29tL2xpdC9saXQvcHVsbC8yMzA3XG4gKlxuICog5bCG5p2lIGBBcnJheS5pc1RlbXBsYXRlT2JqZWN0KClgIOOCkuS9v+eUqOOBleOCjOOCi+WgtOWQiCwg5pys5a++5b+c44KC6KaL55u044GZ5b+F6KaB44GC44KKXG4gKiBodHRwczovL3RjMzkuZXMvcHJvcG9zYWwtYXJyYXktaXMtdGVtcGxhdGUtb2JqZWN0L1xuICovXG5jb25zdCBwYXRjaCA9IChodG1sOiBUZW1wbGF0ZVRhZyk6IFRlbXBsYXRlVGFnID0+IHtcbiAgICByZXR1cm4gKHRlbXBsYXRlOiBUZW1wbGF0ZVN0cmluZ3NBcnJheSwgLi4udmFsdWVzOiB1bmtub3duW10pID0+IHtcbiAgICAgICAgcmV0dXJuIGh0bWwodG9UZW1wbGF0ZVN0cmluZ3NBcnJheSh0ZW1wbGF0ZSksIC4uLnZhbHVlcyk7XG4gICAgfTtcbn07XG5cbmZ1bmN0aW9uIGNyZWF0ZU11c3RhY2hlVHJhbnNmb3JtZXIoaHRtbDogVGVtcGxhdGVUYWcsIHVuc2FmZUhUTUw6IFRyYW5zZm9ybURpcmVjdGl2ZSk6IFRlbXBsYXRlVHJhbnNmb3JtZXI7XG5mdW5jdGlvbiBjcmVhdGVNdXN0YWNoZVRyYW5zZm9ybWVyKGNvbmZpZzogVHJhbnNmb3JtQ29uZmlnKTogVGVtcGxhdGVUcmFuc2Zvcm1lcjtcbmZ1bmN0aW9uIGNyZWF0ZU11c3RhY2hlVHJhbnNmb3JtZXIoYXJnMTogdW5rbm93biwgYXJnMj86IHVua25vd24pOiBUZW1wbGF0ZVRyYW5zZm9ybWVyIHtcbiAgICBjb25zdCBkZWxpbWl0ZXIgPSB7IHN0YXJ0OiAne3snLCBlbmQ6ICd9fScgfTtcbiAgICBsZXQgdHJhbnNmb3JtZXI6IE11c3RhY2hlVHJhbnNmb3JtZXJDb250ZXh0O1xuICAgIGlmICgnZnVuY3Rpb24nID09PSB0eXBlb2YgYXJnMSkge1xuICAgICAgICB0cmFuc2Zvcm1lciA9IGNyZWF0ZURlZmF1bHQocGF0Y2goYXJnMSBhcyBUZW1wbGF0ZVRhZyksIGFyZzIgYXMgVHJhbnNmb3JtRGlyZWN0aXZlKSBhcyBNdXN0YWNoZVRyYW5zZm9ybWVyQ29udGV4dDtcbiAgICAgICAgdHJhbnNmb3JtZXIuZGVsaW1pdGVyID0gZGVsaW1pdGVyO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IHsgaHRtbCB9ID0gYXJnMSBhcyB7IGh0bWw6IFRlbXBsYXRlVGFnOyB9O1xuICAgICAgICBjb25zdCBjb25maWcgPSBPYmplY3QuYXNzaWduKHtcbiAgICAgICAgICAgIGRlbGltaXRlcixcbiAgICAgICAgICAgIHRyYW5zZm9ybWVyczoge30sXG4gICAgICAgIH0sIGFyZzEsIHsgaHRtbDogcGF0Y2goaHRtbCkgfSkgYXMgVHJhbnNmb3JtQ29uZmlnO1xuICAgICAgICB0cmFuc2Zvcm1lciA9IGNyZWF0ZUN1c3RvbShjb25maWcpIGFzIE11c3RhY2hlVHJhbnNmb3JtZXJDb250ZXh0O1xuICAgICAgICB0cmFuc2Zvcm1lci5kZWxpbWl0ZXIgPSBjb25maWcuZGVsaW1pdGVyITtcbiAgICB9XG4gICAgcmV0dXJuIHhmb3JtKHRyYW5zZm9ybWVyKTtcbn1cblxuY29uc3QgdHJhbnNmb3JtZXI6IHtcbiAgICB2YXJpYWJsZTogVHJhbnNmb3JtRXhlY3V0b3I7XG4gICAgdW5zYWZlVmFyaWFibGU6ICh1bnNhZmVIVE1MOiBUcmFuc2Zvcm1EaXJlY3RpdmUpID0+IFRyYW5zZm9ybWVDb250ZXh0O1xuICAgIHNlY3Rpb246ICgpID0+IFRyYW5zZm9ybWVDb250ZXh0O1xuICAgIGludmVydGVkU2VjdGlvbjogKCkgPT4gVHJhbnNmb3JtZUNvbnRleHQ7XG4gICAgY29tbWVudDogKCkgPT4gVHJhbnNmb3JtZUNvbnRleHQ7XG4gICAgY3VzdG9tRGVsaW1pdGVyOiAoKSA9PiBUcmFuc2Zvcm1lQ29udGV4dDtcbn0gPSB7XG4gICAgdmFyaWFibGUsXG4gICAgdW5zYWZlVmFyaWFibGUsXG4gICAgc2VjdGlvbixcbiAgICBpbnZlcnRlZFNlY3Rpb24sXG4gICAgY29tbWVudCxcbiAgICBjdXN0b21EZWxpbWl0ZXIsXG59O1xuXG5leHBvcnQge1xuICAgIFRlbXBsYXRlVGFnLFxuICAgIFRyYW5zZm9ybURpcmVjdGl2ZSxcbiAgICBUZW1wbGF0ZVRyYW5zZm9ybWVyLFxuICAgIFRyYW5zZm9ybVRlc3RlcixcbiAgICBUcmFuc2Zvcm1FeGVjdXRvcixcbiAgICBUcmFuc2Zvcm1lQ29udGV4dCxcbiAgICBUcmFuc2Zvcm1Db25maWcsXG4gICAgY3JlYXRlTXVzdGFjaGVUcmFuc2Zvcm1lcixcbiAgICB0cmFuc2Zvcm1lcixcbn07XG4iLG51bGwsbnVsbCxudWxsLG51bGwsbnVsbCwiaW1wb3J0IHR5cGUge1xuICAgIFRlbXBsYXRlQnJpZGdlQXJnLFxuICAgIFRlbXBsYXRlVHJhbnNmb3JtZXIsXG59IGZyb20gJ0BicmlkZ2UvaW50ZXJmYWNlcyc7XG5pbXBvcnQge1xuICAgIFRlbXBsYXRlSGFuZGxlcixcbiAgICBUZW1wbGF0ZUhhbmRsZXJzLFxuICAgIFRlbXBsYXRlUmVuZGVyZXJzLFxuICAgIEV2YWx1YXRlVGVtcGxhdGVSZXN1bHQsXG4gICAgcHJlcGFyZVRlbXBsYXRlLFxuICAgIGV2YWx1YXRlVGVtcGxhdGUsXG59IGZyb20gJ3N0YW1waW5vJztcblxuZXhwb3J0IGludGVyZmFjZSBDcmVhdGVTdGFtcGlub1RlbXBsYXRlT3B0aW9ucyB7XG4gICAgaGFuZGxlcnM/OiBUZW1wbGF0ZUhhbmRsZXJzO1xuICAgIHJlbmRlcmVycz86IFRlbXBsYXRlUmVuZGVyZXJzO1xuICAgIHN1cGVyVGVtcGxhdGU/OiBIVE1MVGVtcGxhdGVFbGVtZW50IHwgdW5kZWZpbmVkO1xufVxuXG5mdW5jdGlvbiBlbnN1cmUodGVtcGxhdGU6IEhUTUxUZW1wbGF0ZUVsZW1lbnQgfCBzdHJpbmcpOiBIVE1MVGVtcGxhdGVFbGVtZW50IHtcbiAgICBpZiAodGVtcGxhdGUgaW5zdGFuY2VvZiBIVE1MVGVtcGxhdGVFbGVtZW50KSB7XG4gICAgICAgIHJldHVybiB0ZW1wbGF0ZTtcbiAgICB9IGVsc2UgaWYgKCdzdHJpbmcnID09PSB0eXBlb2YgdGVtcGxhdGUpIHtcbiAgICAgICAgY29uc3QgZWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3RlbXBsYXRlJyk7XG4gICAgICAgIGVsZW1lbnQuaW5uZXJIVE1MID0gdGVtcGxhdGU7XG4gICAgICAgIHJldHVybiBlbGVtZW50O1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoYFR5cGUgb2YgdGVtcGxhdGUgaXMgbm90IGEgdmFsaWQuIFt0eXBlb2Y6ICR7dHlwZW9mIHRlbXBsYXRlfV1gKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZVN0YW1waW5vVHJhbnNmb3JtZXIob3B0aW9ucz86IENyZWF0ZVN0YW1waW5vVGVtcGxhdGVPcHRpb25zKTogVGVtcGxhdGVUcmFuc2Zvcm1lciB7XG4gICAgY29uc3QgeyBoYW5kbGVycywgcmVuZGVyZXJzLCBzdXBlclRlbXBsYXRlIH0gPSBvcHRpb25zID8/IHt9O1xuICAgIHJldHVybiAodGVtcGxhdGU6IEhUTUxUZW1wbGF0ZUVsZW1lbnQgfCBzdHJpbmcpID0+IHtcbiAgICAgICAgcmV0dXJuIHByZXBhcmVUZW1wbGF0ZShlbnN1cmUodGVtcGxhdGUpLCBoYW5kbGVycywgcmVuZGVyZXJzLCBzdXBlclRlbXBsYXRlKTtcbiAgICB9O1xufVxuXG5leHBvcnQge1xuICAgIFRlbXBsYXRlQnJpZGdlQXJnLFxuICAgIFRlbXBsYXRlSGFuZGxlcixcbiAgICBUZW1wbGF0ZUhhbmRsZXJzLFxuICAgIFRlbXBsYXRlUmVuZGVyZXJzLFxuICAgIEV2YWx1YXRlVGVtcGxhdGVSZXN1bHQsXG4gICAgY3JlYXRlU3RhbXBpbm9UcmFuc2Zvcm1lcixcbiAgICBwcmVwYXJlVGVtcGxhdGUsXG4gICAgZXZhbHVhdGVUZW1wbGF0ZSxcbn07XG4iXSwibmFtZXMiOlsiY3JlYXRlVHJhbnNmb3JtIiwidHJhbnNmb3JtVmFyaWFibGUiLCJ1bnNhZmVWYXJpYWJsZVRyYW5zZm9ybWVyIiwic2VjdGlvblRyYW5zZm9ybWVyIiwiaW52ZXJ0ZWRTZWN0aW9uVHJhbnNmb3JtZXIiLCJjb21tZW50VHJhbnNmb3JtZXIiLCJjdXN0b21EZWxpbWl0ZXJUcmFuc2Zvcm1lciJdLCJtYXBwaW5ncyI6Ijs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxxQkFBZSxNQUFNLElBQUksV0FBVyxJQUFJLFNBQVMsQ0FBQyxXQUFXLEVBQUUsTUFBTSxFQUFDO0FBQ3RFO0FBQ08sU0FBUyxTQUFTLENBQUMsVUFBVSxFQUFFLE1BQU0sRUFBRTtBQUM5QyxFQUFFLE1BQU0sV0FBVyxHQUFHLEdBQUU7QUFDeEIsRUFBRSxNQUFNLGVBQWUsR0FBRyxHQUFFO0FBQzVCO0FBQ0EsRUFBRSxJQUFJLGdCQUFnQixHQUFHLFdBQVU7QUFDbkMsRUFBRSxJQUFJLGNBQWMsR0FBRyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUM7QUFDdkUsRUFBRSxPQUFPLGNBQWMsSUFBSSxDQUFDLEVBQUU7QUFDOUIsSUFBSSxJQUFJLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDO0FBQzFFLE1BQU0sTUFBTSxJQUFJLEtBQUssQ0FBQyxDQUFDLDJCQUEyQixFQUFFLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3hFO0FBQ0EsSUFBSSxXQUFXLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsY0FBYyxDQUFDLEVBQUM7QUFDbkU7QUFDQSxJQUFJLE1BQU0saUJBQWlCLEdBQUcsV0FBVztBQUN6QyxNQUFNLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxjQUFjLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDO0FBQ2hGLE1BQU0sTUFBTTtBQUNaLE1BQUs7QUFDTDtBQUNBLElBQUksSUFBSSxpQkFBaUIsQ0FBQyxjQUFjLEVBQUU7QUFDMUMsTUFBTSxnQkFBZ0IsR0FBRyxpQkFBaUIsQ0FBQyxpQkFBZ0I7QUFDM0QsTUFBTSxlQUFlLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLGNBQWMsRUFBQztBQUM1RCxNQUFNLGNBQWMsR0FBRyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUM7QUFDdkUsSUFBSSxDQUFDLE1BQU07QUFDWCxNQUFNLE1BQU0sY0FBYyxHQUFHLFdBQVcsQ0FBQyxHQUFHLEdBQUU7QUFDOUMsTUFBTSxnQkFBZ0IsR0FBRyxjQUFjLEdBQUcsaUJBQWlCLENBQUMsaUJBQWdCO0FBQzVFLE1BQU0sY0FBYyxHQUFHLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxjQUFjLENBQUMsTUFBTSxFQUFDO0FBQzlGLElBQUksQ0FBQztBQUNMLEVBQUUsQ0FBQztBQUNIO0FBQ0EsRUFBRSxXQUFXLENBQUMsSUFBSSxDQUFDLGdCQUFnQixFQUFDO0FBQ3BDO0FBQ0EsRUFBRSxPQUFPLEdBQUc7QUFDWixJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLEdBQUcsZUFBZSxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7QUFDbkUsQ0FBQztBQUNEO0FBQ0EsU0FBUyxXQUFXLENBQUMsZ0JBQWdCLEVBQUUsTUFBTSxFQUFFO0FBQy9DLEVBQUUsTUFBTSxXQUFXLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLGdCQUFnQixFQUFFLE1BQU0sQ0FBQyxFQUFDO0FBQ3BHLEVBQUUsTUFBTSxpQkFBaUIsR0FBRyxXQUFXO0FBQ3ZDLE1BQU0sV0FBVyxDQUFDLFNBQVM7QUFDM0IsTUFBTSxNQUFNLENBQUMsa0JBQWlCO0FBQzlCLEVBQUUsT0FBTyxpQkFBaUIsQ0FBQyxnQkFBZ0IsRUFBRSxNQUFNLENBQUM7QUFDcEQ7O0FDM0RPLFNBQVMsU0FBUyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUU7QUFDcEMsRUFBRSxJQUFJLEdBQUcsS0FBSyxHQUFHO0FBQ2pCLElBQUksT0FBTyxHQUFHO0FBQ2Q7QUFDQSxFQUFFLElBQUksTUFBTSxHQUFHLElBQUc7QUFDbEIsRUFBRSxLQUFLLElBQUksQ0FBQyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUU7QUFDaEMsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUM7QUFDakMsTUFBTSxPQUFPLEVBQUU7QUFDZjtBQUNBLElBQUksTUFBTSxHQUFHLE1BQU0sQ0FBQyxDQUFDLEVBQUM7QUFDdEIsRUFBRSxDQUFDO0FBQ0g7QUFDQSxFQUFFLE9BQU8sTUFBTTtBQUNmLENBQUM7QUFDRDtBQUNPLFNBQVMsa0JBQWtCLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRTtBQUM3QyxFQUFFLE9BQU8saUJBQWlCLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQztBQUMvQyxDQUFDO0FBQ0Q7QUFDQSxTQUFTLGlCQUFpQixDQUFDLEtBQUssRUFBRTtBQUNsQyxFQUFFLElBQUksS0FBSyxLQUFLLFNBQVMsSUFBSSxLQUFLLEtBQUssSUFBSTtBQUMzQyxJQUFJLE9BQU8sRUFBRTtBQUNiO0FBQ0EsRUFBRSxPQUFPLEVBQUUsR0FBRyxLQUFLO0FBQ25COztBQ3RCQSxpQkFBZSxDQUFDLGdCQUFnQixFQUFFLEVBQUUsU0FBUyxFQUFFLEtBQUs7QUFDcEQsRUFBRSxNQUFNLG1CQUFtQixHQUFHLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFDO0FBQ3JFLEVBQUUsTUFBTSxPQUFPLEdBQUcsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxtQkFBbUIsRUFBQztBQUNwRSxFQUFFLE9BQU87QUFDVCxJQUFJLGdCQUFnQixFQUFFLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxtQkFBbUIsR0FBRyxTQUFTLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQztBQUM1RixJQUFJLGNBQWMsRUFBRSxHQUFHLElBQUksa0JBQWtCLENBQUMsR0FBRyxFQUFFLE9BQU8sQ0FBQztBQUMzRCxHQUFHO0FBQ0g7O0FDUEE7QUFDQSx1QkFBZSxVQUFVLEtBQUs7QUFDOUIsRUFBRSxJQUFJLEVBQUUsZ0JBQWdCLElBQUksZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRztBQUN2RCxFQUFFLFNBQVMsRUFBRSxDQUFDLGdCQUFnQixFQUFFLEVBQUUsU0FBUyxFQUFFLEtBQUs7QUFDbEQsSUFBSSxNQUFNLG1CQUFtQixHQUFHLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxHQUFHLEdBQUcsU0FBUyxDQUFDLEdBQUcsRUFBQztBQUM3RSxJQUFJLElBQUksbUJBQW1CLEdBQUcsQ0FBQztBQUMvQixNQUFNLE1BQU0sSUFBSSxLQUFLLENBQUMsQ0FBQywyQkFBMkIsRUFBRSxTQUFTLENBQUMsS0FBSyxDQUFDLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDMUY7QUFDQSxJQUFJLE1BQU0sT0FBTyxHQUFHLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsbUJBQW1CLEVBQUM7QUFDdEUsSUFBSSxPQUFPO0FBQ1gsTUFBTSxnQkFBZ0IsRUFBRSxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsbUJBQW1CLEdBQUcsQ0FBQyxHQUFHLFNBQVMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDO0FBQ2xHLE1BQU0sY0FBYyxFQUFFLEdBQUcsSUFBSSxVQUFVLENBQUMsa0JBQWtCLENBQUMsR0FBRyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0FBQ3pFLEtBQUs7QUFDTCxFQUFFLENBQUM7QUFDSCxDQUFDOztBQ2hCTSxTQUFTLGVBQWUsQ0FBQyxLQUFLLEVBQUU7QUFDdkMsRUFBRSxPQUFPLENBQUMsSUFBSSxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxFQUFFLENBQUM7QUFDN0MsS0FBSyxJQUFJLENBQUMsS0FBSyxJQUFJLEtBQUssS0FBSyxLQUFLLENBQUM7QUFDbkMsUUFBUSxLQUFLLENBQUMsTUFBTSxJQUFJLEtBQUssQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDO0FBQzNDOztBQ0pPLFNBQVMsWUFBWSxDQUFDLE9BQU8sRUFBRSxTQUFTLEVBQUU7QUFDakQsRUFBRSxNQUFNLGtCQUFrQixHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBQztBQUMzRCxFQUFFLE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLGtCQUFrQixFQUFDO0FBQzFELEVBQUUsTUFBTSxNQUFNLEdBQUcsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxFQUFFLFNBQVMsQ0FBQyxHQUFHLENBQUMsRUFBQztBQUNoRSxFQUFFLE1BQU0sa0JBQWtCLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUM7QUFDcEQsRUFBRSxJQUFJLGtCQUFrQixHQUFHLENBQUM7QUFDNUIsSUFBSSxNQUFNLElBQUksS0FBSyxDQUFDLENBQUMsMkJBQTJCLEVBQUUsU0FBUyxDQUFDLEtBQUssQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMvRTtBQUNBLEVBQUUsT0FBTztBQUNULElBQUksT0FBTztBQUNYLElBQUksU0FBUyxFQUFFLE9BQU8sQ0FBQyxTQUFTLENBQUMsa0JBQWtCLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsa0JBQWtCLENBQUM7QUFDakcsSUFBSSxnQkFBZ0IsRUFBRSxPQUFPLENBQUMsU0FBUyxDQUFDLGtCQUFrQixHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUM7QUFDM0UsR0FBRztBQUNIOztBQ1JBO0FBQ0EsZ0JBQWUsT0FBTztBQUN0QixFQUFFLElBQUksRUFBRSxnQkFBZ0IsSUFBSSxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHO0FBQ3ZELEVBQUUsU0FBUyxFQUFFLENBQUMsZ0JBQWdCLEVBQUUsTUFBTSxLQUFLO0FBQzNDLElBQUksTUFBTSxhQUFhLEdBQUcsWUFBWSxDQUFDLGdCQUFnQixFQUFFLE1BQU0sQ0FBQyxTQUFTLEVBQUM7QUFDMUUsSUFBSSxNQUFNLG9CQUFvQixHQUFHLFNBQVMsQ0FBQyxhQUFhLENBQUMsU0FBUyxFQUFFLE1BQU0sRUFBQztBQUMzRTtBQUNBLElBQUksT0FBTztBQUNYLE1BQU0sZ0JBQWdCLEVBQUUsYUFBYSxDQUFDLGdCQUFnQjtBQUN0RCxNQUFNLGNBQWMsRUFBRSxHQUFHLElBQUk7QUFDN0IsUUFBUSxNQUFNLFdBQVcsR0FBRyxTQUFTLENBQUMsR0FBRyxFQUFFLGFBQWEsQ0FBQyxPQUFPLEVBQUM7QUFDakU7QUFDQSxRQUFRLElBQUksZUFBZSxDQUFDLFdBQVcsQ0FBQztBQUN4QyxVQUFVLE9BQU8sRUFBRSxDQUFDO0FBQ3BCO0FBQ0EsUUFBUSxPQUFPLFdBQVcsQ0FBQyxHQUFHO0FBQzlCLFlBQVksV0FBVyxDQUFDLEdBQUcsQ0FBQyxRQUFRLElBQUksb0JBQW9CLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDdkUsWUFBWSxvQkFBb0IsQ0FBQyxHQUFHLENBQUM7QUFDckMsTUFBTSxDQUFDO0FBQ1AsS0FBSztBQUNMLEVBQUUsQ0FBQztBQUNILENBQUM7O0FDdEJELHdCQUFlLE9BQU87QUFDdEIsRUFBRSxJQUFJLEVBQUUsZ0JBQWdCLElBQUksZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRztBQUN2RCxFQUFFLFNBQVMsRUFBRSxDQUFDLGdCQUFnQixFQUFFLEVBQUUsU0FBUyxFQUFFLEtBQUs7QUFDbEQsSUFBSSxNQUFNLGFBQWEsR0FBRyxZQUFZLENBQUMsZ0JBQWdCLEVBQUUsU0FBUyxFQUFDO0FBQ25FO0FBQ0EsSUFBSSxPQUFPO0FBQ1gsTUFBTSxnQkFBZ0IsRUFBRSxhQUFhLENBQUMsZ0JBQWdCO0FBQ3RELE1BQU0sY0FBYyxFQUFFLEdBQUc7QUFDekIsUUFBUSxlQUFlLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBRSxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDOUQsWUFBWSxhQUFhLENBQUMsU0FBUztBQUNuQyxZQUFZLEVBQUU7QUFDZCxLQUFLO0FBQ0wsRUFBRSxDQUFDO0FBQ0gsQ0FBQzs7QUNqQkQsZ0JBQWUsT0FBTztBQUN0QixFQUFFLElBQUksRUFBRSxnQkFBZ0IsSUFBSSxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHO0FBQ3ZELEVBQUUsU0FBUyxFQUFFLENBQUMsZ0JBQWdCLEVBQUUsRUFBRSxTQUFTLEVBQUUsTUFBTTtBQUNuRCxJQUFJLGdCQUFnQixFQUFFLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxHQUFHLFNBQVMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDO0FBQ2hILElBQUksY0FBYyxFQUFFLFNBQVM7QUFDN0IsR0FBRyxDQUFDO0FBQ0osQ0FBQzs7QUNORCx3QkFBZSxPQUFPO0FBQ3RCLEVBQUUsSUFBSSxFQUFFLGdCQUFnQixJQUFJLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUc7QUFDdkQsRUFBRSxTQUFTLEVBQUUsQ0FBQyxnQkFBZ0IsRUFBRSxNQUFNLEtBQUs7QUFDM0MsSUFBSSxNQUFNLHFCQUFxQixHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLE9BQU07QUFDN0QsSUFBSSxNQUFNLGFBQWEsR0FBRyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsR0FBRyxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFDO0FBQzlFLElBQUksSUFBSSxhQUFhLEdBQUcsQ0FBQztBQUN6QixNQUFNLE1BQU0sSUFBSSxLQUFLLENBQUMsQ0FBQywyQkFBMkIsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN4RTtBQUNBLElBQUksTUFBTSxFQUFFLFlBQVksRUFBRSxVQUFVLEVBQUUsR0FBRyxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLGFBQWEsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUM7QUFDaEc7QUFDQSxJQUFJLE1BQU0sQ0FBQyxTQUFTLENBQUMsS0FBSyxHQUFHLGFBQVk7QUFDekMsSUFBSSxNQUFNLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBRyxXQUFVO0FBQ3JDO0FBQ0EsSUFBSSxPQUFPO0FBQ1gsTUFBTSxnQkFBZ0IsRUFBRSxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsYUFBYSxHQUFHLENBQUMsR0FBRyxxQkFBcUIsQ0FBQztBQUM3RixNQUFNLGNBQWMsRUFBRSxTQUFTO0FBQy9CLEtBQUs7QUFDTCxFQUFFLENBQUM7QUFDSCxDQUFDOztBQ1ZELHNCQUFlLENBQUMsSUFBSSxFQUFFLFVBQVU7QUFDaEMsRUFBRUEsWUFBZSxDQUFDO0FBQ2xCLElBQUksSUFBSTtBQUNSLElBQUksU0FBUyxFQUFFLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFO0FBQ3pDLHVCQUFJQyxRQUFpQjtBQUNyQixJQUFJLFlBQVksRUFBRTtBQUNsQixNQUFNLGNBQWMsRUFBRUMsY0FBeUIsQ0FBQyxVQUFVLENBQUM7QUFDM0QsTUFBTSxPQUFPLEVBQUVDLE9BQWtCLEVBQUU7QUFDbkMsTUFBTSxlQUFlLEVBQUVDLGVBQTBCLEVBQUU7QUFDbkQsTUFBTSxPQUFPLEVBQUVDLE9BQWtCLEVBQUU7QUFDbkMsTUFBTSwwQkFBMEIsRUFBRUMsZUFBMEIsRUFBRTtBQUM5RCxLQUFLO0FBQ0wsR0FBRzs7QUNLSCxNQUFNLEtBQUssR0FBRyxDQUFDLFFBQW9DLEtBQXlCO0lBQ3hFLE9BQU8sQ0FBQyxRQUFzQyxLQUEwQjtRQUNwRSxNQUFNLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxHQUFHLFFBQVEsQ0FBQyxTQUFTOztRQUd6QyxNQUFNLHFCQUFxQixHQUFHLElBQUksTUFBTSxDQUFDLENBQUEsUUFBQSxFQUFXLEtBQUssQ0FBQSxDQUFFLEVBQUUsR0FBRyxDQUFDO1FBQ2pFLE1BQU0sbUJBQW1CLEdBQUssSUFBSSxNQUFNLENBQUMsQ0FBQSxFQUFHLEdBQUcsQ0FBQSxPQUFBLENBQVMsRUFBRSxHQUFHLENBQUM7O0FBRTlELFFBQUEsTUFBTSxPQUFPLEdBQUcsSUFBSSxNQUFNLENBQUMsQ0FBQSxDQUFBLEVBQUksS0FBSyxDQUFBLDJCQUFBLEVBQThCLEdBQUcsQ0FBQSxDQUFBLENBQUcsRUFBRSxHQUFHLENBQUM7QUFFOUUsUUFBQSxNQUFNLElBQUksR0FBRyxDQUFDLFFBQVEsWUFBWSxtQkFBbUIsR0FBRyxRQUFRLENBQUMsU0FBUyxHQUFHLFFBQVE7QUFDaEYsYUFBQSxPQUFPLENBQUMscUJBQXFCLEVBQUUsS0FBSztBQUNwQyxhQUFBLE9BQU8sQ0FBQyxtQkFBbUIsRUFBRSxHQUFHO0FBQ2hDLGFBQUEsT0FBTyxDQUFDLE9BQU8sRUFBRSxRQUFRLENBQUM7QUFHL0IsUUFBQSxPQUFPLFFBQVEsQ0FBQyxJQUFJLENBQUM7QUFDekIsSUFBQSxDQUFDO0FBQ0wsQ0FBQztBQUVEOzs7Ozs7O0FBT0c7QUFDSCxNQUFNLEtBQUssR0FBRyxDQUFDLElBQWlCLEtBQWlCO0FBQzdDLElBQUEsT0FBTyxDQUFDLFFBQThCLEVBQUUsR0FBRyxNQUFpQixLQUFJO1FBQzVELE9BQU8sSUFBSSxDQUFDLHNCQUFzQixDQUFDLFFBQVEsQ0FBQyxFQUFFLEdBQUcsTUFBTSxDQUFDO0FBQzVELElBQUEsQ0FBQztBQUNMLENBQUM7QUFJRCxTQUFTLHlCQUF5QixDQUFDLElBQWEsRUFBRSxJQUFjLEVBQUE7SUFDNUQsTUFBTSxTQUFTLEdBQUcsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUU7QUFDNUMsSUFBQSxJQUFJLFdBQXVDO0FBQzNDLElBQUEsSUFBSSxVQUFVLEtBQUssT0FBTyxJQUFJLEVBQUU7UUFDNUIsV0FBVyxHQUFHLGFBQWEsQ0FBQyxLQUFLLENBQUMsSUFBbUIsQ0FBQyxFQUFFLElBQTBCLENBQStCO0FBQ2pILFFBQUEsV0FBVyxDQUFDLFNBQVMsR0FBRyxTQUFTO0lBQ3JDO1NBQU87QUFDSCxRQUFBLE1BQU0sRUFBRSxJQUFJLEVBQUUsR0FBRyxJQUE4QjtBQUMvQyxRQUFBLE1BQU0sTUFBTSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUM7WUFDekIsU0FBUztBQUNULFlBQUEsWUFBWSxFQUFFLEVBQUU7U0FDbkIsRUFBRSxJQUFJLEVBQUUsRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQW9CO0FBQ2xELFFBQUEsV0FBVyxHQUFHLFlBQVksQ0FBQyxNQUFNLENBQStCO0FBQ2hFLFFBQUEsV0FBVyxDQUFDLFNBQVMsR0FBRyxNQUFNLENBQUMsU0FBVTtJQUM3QztBQUNBLElBQUEsT0FBTyxLQUFLLENBQUMsV0FBVyxDQUFDO0FBQzdCO0FBRUEsTUFBTSxXQUFXLEdBT2I7SUFDQSxRQUFRO0lBQ1IsY0FBYztJQUNkLE9BQU87SUFDUCxlQUFlO0lBQ2YsT0FBTztJQUNQLGVBQWU7OztBQzVGbkI7OztBQUdHO0FBRUksTUFBTSxRQUFRLEdBQUcsQ0FBQyxNQUFNLENBQUM7QUFDekIsTUFBTSxlQUFlLEdBQUcsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQztBQUN2QyxNQUFNLGdCQUFnQixHQUFHO0lBQzlCLEdBQUc7SUFDSCxHQUFHO0lBQ0gsR0FBRztJQUNILEdBQUc7SUFDSCxHQUFHO0lBQ0gsR0FBRztJQUNILEdBQUc7SUFDSCxJQUFJO0lBQ0osSUFBSTtJQUNKLEdBQUc7SUFDSCxHQUFHO0lBQ0gsSUFBSTtJQUNKLElBQUk7SUFDSixJQUFJO0lBQ0osSUFBSTtJQUNKLElBQUk7SUFDSixHQUFHO0lBQ0gsS0FBSztJQUNMLEtBQUs7SUFDTCxHQUFHO0lBQ0gsSUFBSTtDQUNMO0FBRU0sTUFBTSxVQUFVLEdBQTJCO0FBQ2hELElBQUEsR0FBRyxFQUFFLENBQUM7QUFDTixJQUFBLEdBQUcsRUFBRSxDQUFDO0FBQ04sSUFBQSxHQUFHLEVBQUUsQ0FBQztBQUNOLElBQUEsR0FBRyxFQUFFLENBQUM7QUFDTixJQUFBLEdBQUcsRUFBRSxDQUFDO0FBQ04sSUFBQSxHQUFHLEVBQUUsQ0FBQztBQUVOLElBQUEsSUFBSSxFQUFFLENBQUM7QUFDUCxJQUFBLEdBQUcsRUFBRSxDQUFDO0FBQ04sSUFBQSxJQUFJLEVBQUUsQ0FBQztBQUNQLElBQUEsSUFBSSxFQUFFLENBQUM7QUFDUCxJQUFBLElBQUksRUFBRSxDQUFDO0FBQ1AsSUFBQSxHQUFHLEVBQUUsQ0FBQztBQUNOLElBQUEsR0FBRyxFQUFFLENBQUM7QUFDTixJQUFBLEdBQUcsRUFBRSxDQUFDOztBQUdOLElBQUEsSUFBSSxFQUFFLENBQUM7QUFDUCxJQUFBLElBQUksRUFBRSxDQUFDO0FBQ1AsSUFBQSxLQUFLLEVBQUUsQ0FBQztBQUNSLElBQUEsS0FBSyxFQUFFLENBQUM7O0FBR1IsSUFBQSxJQUFJLEVBQUUsRUFBRTtBQUNSLElBQUEsR0FBRyxFQUFFLEVBQUU7QUFDUCxJQUFBLElBQUksRUFBRSxFQUFFO0FBQ1IsSUFBQSxHQUFHLEVBQUUsRUFBRTs7QUFHUCxJQUFBLEdBQUcsRUFBRSxFQUFFO0FBQ1AsSUFBQSxHQUFHLEVBQUUsRUFBRTs7QUFHUCxJQUFBLEdBQUcsRUFBRSxFQUFFO0FBQ1AsSUFBQSxHQUFHLEVBQUUsRUFBRTtBQUNQLElBQUEsR0FBRyxFQUFFLEVBQUU7O0FBR1AsSUFBQSxHQUFHLEVBQUUsRUFBRTtBQUNQLElBQUEsR0FBRyxFQUFFLEVBQUU7QUFDUCxJQUFBLEdBQUcsRUFBRSxFQUFFO0lBQ1AsR0FBRyxFQUFFLEVBQUU7Q0FDUjtBQUVNLE1BQU0sa0JBQWtCLEdBQUcsRUFBRTs7QUM1RXBDOzs7QUFHRztBQUlILE1BQU0sYUFBYSxHQUFHLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztBQUN0RSxNQUFNLGVBQWUsR0FBRyxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUM7QUFRdEMsSUFBWSxJQVlYO0FBWkQsQ0FBQSxVQUFZLElBQUksRUFBQTtBQUNkLElBQUEsSUFBQSxDQUFBLElBQUEsQ0FBQSxRQUFBLENBQUEsR0FBQSxDQUFBLENBQUEsR0FBQSxRQUFVO0FBQ1YsSUFBQSxJQUFBLENBQUEsSUFBQSxDQUFBLFlBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQSxHQUFBLFlBQWM7QUFDZCxJQUFBLElBQUEsQ0FBQSxJQUFBLENBQUEsS0FBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBLEdBQUEsS0FBTztBQUNQLElBQUEsSUFBQSxDQUFBLElBQUEsQ0FBQSxPQUFBLENBQUEsR0FBQSxDQUFBLENBQUEsR0FBQSxPQUFTO0FBQ1QsSUFBQSxJQUFBLENBQUEsSUFBQSxDQUFBLE9BQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQSxHQUFBLE9BQVM7QUFDVCxJQUFBLElBQUEsQ0FBQSxJQUFBLENBQUEsU0FBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBLEdBQUEsU0FBVztBQUNYLElBQUEsSUFBQSxDQUFBLElBQUEsQ0FBQSxTQUFBLENBQUEsR0FBQSxDQUFBLENBQUEsR0FBQSxTQUFXO0FBQ1gsSUFBQSxJQUFBLENBQUEsSUFBQSxDQUFBLFVBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQSxHQUFBLFVBQVk7QUFDWixJQUFBLElBQUEsQ0FBQSxJQUFBLENBQUEsU0FBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBLEdBQUEsU0FBVztBQUNYLElBQUEsSUFBQSxDQUFBLElBQUEsQ0FBQSxTQUFBLENBQUEsR0FBQSxFQUFBLENBQUEsR0FBQSxTQUFZO0FBQ1osSUFBQSxJQUFBLENBQUEsSUFBQSxDQUFBLE9BQUEsQ0FBQSxHQUFBLEVBQUEsQ0FBQSxHQUFBLE9BQVU7QUFDWixDQUFDLEVBWlcsSUFBSSxLQUFKLElBQUksR0FBQSxFQUFBLENBQUEsQ0FBQTtBQWNULE1BQU0sS0FBSyxHQUFHLENBQUMsSUFBVSxFQUFFLEtBQWEsRUFBRSxVQUFBLEdBQXFCLENBQUMsTUFBTTtJQUMzRSxJQUFJO0lBQ0osS0FBSztJQUNMLFVBQVU7QUFDWCxDQUFBLENBQUM7QUFFRixNQUFNLGFBQWEsR0FBRyxDQUFDLEVBQVUsS0FDL0IsRUFBRSxLQUFLLENBQUM7SUFDUixFQUFFLEtBQUssRUFBRTtJQUNULEVBQUUsS0FBSyxFQUFFO0FBQ1QsSUFBQSxFQUFFLEtBQUssRUFBRSxDQUFDO0FBRVo7QUFDQSxNQUFNLHNCQUFzQixHQUFHLENBQUMsRUFBVSxLQUN4QyxFQUFFLEtBQUssRUFBRTtJQUNULEVBQUUsS0FBSyxFQUFFOzs7O0FBSVQsS0FBQyxDQUFDLEVBQUUsSUFBSSxHQUFHLEdBQUcsRUFBRSxZQUFZLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7QUFFOUM7QUFDQSxNQUFNLGFBQWEsR0FBRyxDQUFDLEVBQVUsS0FDL0Isc0JBQXNCLENBQUMsRUFBRSxDQUFDLElBQUksU0FBUyxDQUFDLEVBQUUsQ0FBQztBQUU3QyxNQUFNLFVBQVUsR0FBRyxDQUFDLEdBQVcsS0FBSyxRQUFRLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUU7QUFFaEUsTUFBTSxRQUFRLEdBQUcsQ0FBQyxFQUFVLEtBQUssRUFBRSxLQUFLLEVBQUUsWUFBWSxFQUFFLEtBQUssRUFBRSxDQUFDO0FBRWhFLE1BQU0sU0FBUyxHQUFHLENBQUMsRUFBVSxLQUFLLEVBQUUsWUFBWSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsQ0FBQztBQUUvRCxNQUFNLFdBQVcsR0FBRyxDQUFDLEVBQVUsS0FDN0IsRUFBRSxLQUFLLEVBQUU7SUFDVCxFQUFFLEtBQUssRUFBRTtJQUNULEVBQUUsS0FBSyxFQUFFO0lBQ1QsRUFBRSxLQUFLLEVBQUU7SUFDVCxFQUFFLEtBQUssRUFBRTtJQUNULEVBQUUsS0FBSyxFQUFFO0lBQ1QsRUFBRSxLQUFLLEVBQUU7SUFDVCxFQUFFLEtBQUssRUFBRTtJQUNULEVBQUUsS0FBSyxFQUFFO0lBQ1QsRUFBRSxLQUFLLEVBQUU7SUFDVCxFQUFFLEtBQUssRUFBRTtJQUNULEVBQUUsS0FBSyxFQUFFO0FBQ1QsSUFBQSxFQUFFLEtBQUssR0FBRyxDQUFDO0FBRWIsTUFBTSxVQUFVLEdBQUcsQ0FBQyxFQUFVLEtBQzVCLEVBQUUsS0FBSyxFQUFFO0lBQ1QsRUFBRSxLQUFLLEVBQUU7SUFDVCxFQUFFLEtBQUssRUFBRTtJQUNULEVBQUUsS0FBSyxFQUFFO0lBQ1QsRUFBRSxLQUFLLEdBQUc7QUFDVixJQUFBLEVBQUUsS0FBSyxHQUFHLENBQUM7QUFFYixNQUFNLGFBQWEsR0FBRyxDQUFDLEdBQVcsS0FDaEMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQyxNQUFNLEVBQUUsS0FBSyxLQUFJO0lBQ3RDLFFBQVEsS0FBSztBQUNYLFFBQUEsS0FBSyxHQUFHO0FBQ04sWUFBQSxPQUFPLElBQUk7QUFDYixRQUFBLEtBQUssR0FBRztBQUNOLFlBQUEsT0FBTyxJQUFJO0FBQ2IsUUFBQSxLQUFLLEdBQUc7QUFDTixZQUFBLE9BQU8sSUFBSTtBQUNiLFFBQUEsS0FBSyxHQUFHO0FBQ04sWUFBQSxPQUFPLElBQUk7QUFDYixRQUFBLEtBQUssR0FBRztBQUNOLFlBQUEsT0FBTyxJQUFJO0FBQ2IsUUFBQTtBQUNFLFlBQUEsT0FBTyxLQUFLOztBQUVsQixDQUFDLENBQUM7TUFFUyxTQUFTLENBQUE7QUFDWixJQUFBLE1BQU07SUFDTixNQUFNLEdBQUcsRUFBRTtJQUNYLFdBQVcsR0FBRyxDQUFDO0FBQ2YsSUFBQSxLQUFLO0FBRWIsSUFBQSxXQUFBLENBQVksS0FBYSxFQUFBO0FBQ3ZCLFFBQUEsSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFLO1FBQ25CLElBQUksQ0FBQyxRQUFRLEVBQUU7SUFDakI7SUFFQSxTQUFTLEdBQUE7QUFDUCxRQUFBLE9BQU8sYUFBYSxDQUFDLElBQUksQ0FBQyxLQUFNLENBQUMsRUFBRTtBQUNqQyxZQUFBLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDO1FBQ3JCO0FBQ0EsUUFBQSxJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBTSxDQUFDO0FBQUUsWUFBQSxPQUFPLElBQUksQ0FBQyxlQUFlLEVBQUU7QUFDeEQsUUFBQSxJQUFJLHNCQUFzQixDQUFDLElBQUksQ0FBQyxLQUFNLENBQUMsRUFBRTtBQUN2QyxZQUFBLE9BQU8sSUFBSSxDQUFDLHVCQUF1QixFQUFFO1FBQ3ZDO0FBQ0EsUUFBQSxJQUFJLFNBQVMsQ0FBQyxJQUFJLENBQUMsS0FBTSxDQUFDO0FBQUUsWUFBQSxPQUFPLElBQUksQ0FBQyxlQUFlLEVBQUU7QUFDekQsUUFBQSxJQUFJLElBQUksQ0FBQyxLQUFLLEtBQUssRUFBRTtBQUFVLFlBQUEsT0FBTyxJQUFJLENBQUMsWUFBWSxFQUFFO0FBQ3pELFFBQUEsSUFBSSxJQUFJLENBQUMsS0FBSyxLQUFLLEVBQUU7QUFBVSxZQUFBLE9BQU8sSUFBSSxDQUFDLGNBQWMsRUFBRTtBQUMzRCxRQUFBLElBQUksSUFBSSxDQUFDLEtBQUssS0FBSyxFQUFFO0FBQVUsWUFBQSxPQUFPLElBQUksQ0FBQyxjQUFjLEVBQUU7QUFDM0QsUUFBQSxJQUFJLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBTSxDQUFDO0FBQUUsWUFBQSxPQUFPLElBQUksQ0FBQyxpQkFBaUIsRUFBRTtBQUM3RCxRQUFBLElBQUksVUFBVSxDQUFDLElBQUksQ0FBQyxLQUFNLENBQUM7QUFBRSxZQUFBLE9BQU8sSUFBSSxDQUFDLGdCQUFnQixFQUFFOztRQUUzRCxJQUFJLENBQUMsUUFBUSxFQUFFO0FBQ2YsUUFBQSxJQUFJLElBQUksQ0FBQyxLQUFLLEtBQUssU0FBUyxFQUFFO1lBQzVCLE1BQU0sSUFBSSxLQUFLLENBQUMsQ0FBQSwyQkFBQSxFQUE4QixJQUFJLENBQUMsS0FBSyxDQUFBLENBQUUsQ0FBQztRQUM3RDtBQUNBLFFBQUEsT0FBTyxTQUFTO0lBQ2xCO0FBRVEsSUFBQSxRQUFRLENBQUMsZUFBeUIsRUFBQTtRQUN4QyxJQUFJLENBQUMsTUFBTSxFQUFFO1FBQ2IsSUFBSSxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFO0FBQ3BDLFlBQUEsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDO0FBQ2hELFlBQUEsSUFBSSxlQUFlLEtBQUssSUFBSSxFQUFFO0FBQzVCLGdCQUFBLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLE1BQU07WUFDaEM7UUFDRjthQUFPO0FBQ0wsWUFBQSxJQUFJLENBQUMsS0FBSyxHQUFHLFNBQVM7UUFDeEI7SUFDRjtJQUVRLFNBQVMsQ0FBQyxZQUFvQixDQUFDLEVBQUE7QUFDckMsUUFBQSxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxNQUFNLEdBQUcsU0FBUyxDQUFDO0FBQzFFLFFBQUEsSUFBSSxTQUFTLEtBQUssQ0FBQyxFQUFFO1lBQ25CLElBQUksQ0FBQyxXQUFXLEVBQUU7UUFDcEI7QUFDQSxRQUFBLE9BQU8sQ0FBQztJQUNWO0lBRVEsV0FBVyxHQUFBO0FBQ2pCLFFBQUEsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsTUFBTTtJQUNoQztJQUVRLGVBQWUsR0FBQTtRQUNyQixNQUFNLEdBQUcsR0FBRyxxQkFBcUI7QUFDakMsUUFBQSxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsS0FBSztBQUM1QixRQUFBLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDO0FBQ25CLFFBQUEsT0FBTyxJQUFJLENBQUMsS0FBSyxLQUFLLFNBQVMsRUFBRTtBQUMvQixZQUFBLElBQUksSUFBSSxDQUFDLEtBQUssS0FBSyxTQUFTO0FBQUUsZ0JBQUEsTUFBTSxJQUFJLEtBQUssQ0FBQyxHQUFHLENBQUM7WUFDbEQsSUFBSSxJQUFJLENBQUMsS0FBSyxLQUFLLEVBQUUsVUFBVTtnQkFDN0IsSUFBSSxDQUFDLFFBQVEsRUFBRTtBQUNmLGdCQUFBLElBQUksSUFBSSxDQUFDLEtBQUssS0FBSyxTQUFTO0FBQUUsb0JBQUEsTUFBTSxJQUFJLEtBQUssQ0FBQyxHQUFHLENBQUM7WUFDcEQ7WUFDQSxJQUFJLENBQUMsUUFBUSxFQUFFO1FBQ2pCO0FBQ0EsUUFBQSxNQUFNLENBQUMsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxhQUFhLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUM7UUFDN0QsSUFBSSxDQUFDLFFBQVEsRUFBRTtBQUNmLFFBQUEsT0FBTyxDQUFDO0lBQ1Y7SUFFUSx1QkFBdUIsR0FBQTs7O0FBRzdCLFFBQUEsR0FBRztZQUNELElBQUksQ0FBQyxRQUFRLEVBQUU7QUFDakIsUUFBQSxDQUFDLFFBQVEsYUFBYSxDQUFDLElBQUksQ0FBQyxLQUFNLENBQUM7QUFDbkMsUUFBQSxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsU0FBUyxFQUFFO0FBQzlCLFFBQUEsTUFBTSxJQUFJLEdBQUcsVUFBVSxDQUFDLEtBQUssQ0FBQyxHQUFHLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLFVBQVU7QUFDL0QsUUFBQSxPQUFPLEtBQUssQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDO0lBQzNCO0lBRVEsZUFBZSxHQUFBOzs7QUFHckIsUUFBQSxHQUFHO1lBQ0QsSUFBSSxDQUFDLFFBQVEsRUFBRTtBQUNqQixRQUFBLENBQUMsUUFBUSxTQUFTLENBQUMsSUFBSSxDQUFDLEtBQU0sQ0FBQztBQUMvQixRQUFBLElBQUksSUFBSSxDQUFDLEtBQUssS0FBSyxFQUFFO0FBQVUsWUFBQSxPQUFPLElBQUksQ0FBQyxZQUFZLEVBQUU7UUFDekQsT0FBTyxLQUFLLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7SUFDOUM7SUFFUSxZQUFZLEdBQUE7UUFDbEIsSUFBSSxDQUFDLFFBQVEsRUFBRTtBQUNmLFFBQUEsSUFBSSxTQUFTLENBQUMsSUFBSSxDQUFDLEtBQU0sQ0FBQztBQUFFLFlBQUEsT0FBTyxJQUFJLENBQUMsaUJBQWlCLEVBQUU7UUFDM0QsSUFBSSxDQUFDLFdBQVcsRUFBRTtRQUNsQixPQUFPLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxrQkFBa0IsQ0FBQztJQUNqRDtJQUVRLGNBQWMsR0FBQTtBQUNwQixRQUFBLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDO1FBQ25CLE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDO0lBQy9CO0lBRVEsY0FBYyxHQUFBO0FBQ3BCLFFBQUEsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUM7UUFDbkIsT0FBTyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUM7SUFDL0I7SUFFUSxpQkFBaUIsR0FBQTs7O0FBR3ZCLFFBQUEsR0FBRztZQUNELElBQUksQ0FBQyxRQUFRLEVBQUU7QUFDakIsUUFBQSxDQUFDLFFBQVEsU0FBUyxDQUFDLElBQUksQ0FBQyxLQUFNLENBQUM7UUFDL0IsT0FBTyxLQUFLLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7SUFDOUM7SUFFUSxpQkFBaUIsR0FBQTtRQUN2QixJQUFJLENBQUMsUUFBUSxFQUFFO1FBQ2YsSUFBSSxFQUFFLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7UUFFMUIsSUFBSSxlQUFlLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxLQUFLLEVBQUUsRUFBRTtZQUN0QyxJQUFJLENBQUMsUUFBUSxFQUFFO1lBQ2YsSUFBSSxDQUFDLFFBQVEsRUFBRTtRQUNqQjthQUFPO0FBQ0wsWUFBQSxFQUFFLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7QUFDdEIsWUFBQSxJQUFJLEVBQUUsS0FBSyxJQUFJLEVBQUU7Z0JBQ2YsSUFBSSxDQUFDLFFBQVEsRUFBRTtnQkFDZixPQUFPLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQztZQUM5QjtZQUNBLElBQUksYUFBYSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsS0FBSyxFQUFFLEVBQUU7Z0JBQ3BDLElBQUksQ0FBQyxRQUFRLEVBQUU7WUFDakI7UUFDRjtBQUNBLFFBQUEsRUFBRSxHQUFHLElBQUksQ0FBQyxTQUFTLEVBQUU7QUFDckIsUUFBQSxPQUFPLEtBQUssQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLEVBQUUsRUFBRSxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDakQ7SUFFUSxnQkFBZ0IsR0FBQTtRQUN0QixNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxLQUFNLENBQUM7QUFDOUMsUUFBQSxNQUFNLENBQUMsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxLQUFLLEVBQUUsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQ3ZELFFBQUEsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUM7QUFDbkIsUUFBQSxPQUFPLENBQUM7SUFDVjtBQUNEOztBQzFQRDs7O0FBR0c7QUFZSSxNQUFNLEtBQUssR0FBRyxDQUNuQixJQUFZLEVBQ1osVUFBeUIsS0FDUCxJQUFJLE1BQU0sQ0FBSSxJQUFJLEVBQUUsVUFBVSxDQUFDLENBQUMsS0FBSyxFQUFFO01BRTlDLE1BQU0sQ0FBQTtBQUNULElBQUEsS0FBSztBQUNMLElBQUEsVUFBVTtBQUNWLElBQUEsSUFBSTtBQUNKLElBQUEsTUFBTTtBQUNOLElBQUEsTUFBTTtJQUVkLFdBQUEsQ0FBWSxLQUFhLEVBQUUsVUFBeUIsRUFBQTtRQUNsRCxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksU0FBUyxDQUFDLEtBQUssQ0FBQztBQUN0QyxRQUFBLElBQUksQ0FBQyxJQUFJLEdBQUcsVUFBVTtJQUN4QjtJQUVBLEtBQUssR0FBQTtRQUNILElBQUksQ0FBQyxRQUFRLEVBQUU7QUFDZixRQUFBLE9BQU8sSUFBSSxDQUFDLGdCQUFnQixFQUFFO0lBQ2hDO0lBRVEsUUFBUSxDQUFDLElBQVcsRUFBRSxLQUFjLEVBQUE7UUFDMUMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxFQUFFO1lBQy9CLE1BQU0sSUFBSSxLQUFLLENBQ2IsQ0FBQSxjQUFBLEVBQWlCLElBQUksQ0FBQSxFQUFBLEVBQUssS0FBSyxVQUFVLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxLQUFLLElBQUksQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFBLENBQUEsQ0FBRyxDQUNyRjtRQUNIO1FBQ0EsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxTQUFTLEVBQUU7QUFDckMsUUFBQSxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUM7QUFDZixRQUFBLElBQUksQ0FBQyxLQUFLLEdBQUcsQ0FBQyxFQUFFLElBQUk7QUFDcEIsUUFBQSxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxLQUFLO0lBQ3hCO0lBRUEsUUFBUSxDQUFDLElBQVcsRUFBRSxLQUFjLEVBQUE7UUFDbEMsT0FBTyxFQUFFLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxLQUFLLEtBQUssSUFBSSxNQUFNLEtBQUssSUFBSSxJQUFJLENBQUMsTUFBTSxLQUFLLEtBQUssQ0FBQyxDQUFDO0lBQzdFO0lBRVEsZ0JBQWdCLEdBQUE7UUFDdEIsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNO0FBQUUsWUFBQSxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFO0FBQzFDLFFBQUEsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLFdBQVcsRUFBRTtBQUMvQixRQUFBLE9BQU8sSUFBSSxLQUFLLFNBQVMsR0FBRyxTQUFTLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7SUFDeEU7Ozs7SUFLUSxnQkFBZ0IsQ0FBQyxJQUFtQixFQUFFLFVBQWtCLEVBQUE7QUFDOUQsUUFBQSxJQUFJLElBQUksS0FBSyxTQUFTLEVBQUU7QUFDdEIsWUFBQSxNQUFNLElBQUksS0FBSyxDQUFDLDhCQUE4QixDQUFDO1FBQ2pEO0FBQ0EsUUFBQSxPQUFPLElBQUksQ0FBQyxNQUFNLEVBQUU7WUFDbEIsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLEVBQUU7QUFDcEMsZ0JBQUEsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLGVBQWUsRUFBRTtBQUNuQyxnQkFBQSxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUM7WUFDaEQ7aUJBQU8sSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLEVBQUU7QUFDM0MsZ0JBQUEsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFdBQVcsRUFBRTtnQkFDcEMsSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxTQUFTLENBQUM7WUFDekM7aUJBQU8sSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRTtnQkFDbEMsSUFBSSxDQUFDLFFBQVEsRUFBRTtBQUNmLGdCQUFBLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxXQUFXLEVBQUU7Z0JBQ2hDLElBQUksR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQztZQUM5QztpQkFBTyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFO2dCQUN0QztZQUNGO0FBQU8saUJBQUEsSUFDTCxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUM7QUFDNUIsZ0JBQUEsSUFBSSxDQUFDLE1BQU0sQ0FBQyxVQUFVLElBQUksVUFBVSxFQUNwQztnQkFDQSxJQUFJO29CQUNGLElBQUksQ0FBQyxNQUFNLEtBQUs7QUFDZCwwQkFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUk7MEJBQ3ZCLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUM7WUFDNUM7aUJBQU87Z0JBQ0w7WUFDRjtRQUNGO0FBQ0EsUUFBQSxPQUFPLElBQUk7SUFDYjtJQUVRLG1CQUFtQixDQUFDLElBQU8sRUFBRSxLQUFvQixFQUFBO0FBQ3ZELFFBQUEsSUFBSSxLQUFLLEtBQUssU0FBUyxFQUFFO0FBQ3ZCLFlBQUEsTUFBTSxJQUFJLEtBQUssQ0FBQyxxQkFBcUIsQ0FBQztRQUN4QztBQUNBLFFBQUEsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLElBQUksRUFBRTtBQUN2QixZQUFBLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFHLEtBQVksQ0FBQyxLQUFLLENBQUM7UUFDcEQ7QUFBTyxhQUFBLElBQ0wsS0FBSyxDQUFDLElBQUksS0FBSyxRQUFRO0FBQ3RCLFlBQUEsS0FBZ0IsQ0FBQyxRQUFRLENBQUMsSUFBSSxLQUFLLElBQUksRUFDeEM7QUFDQSxZQUFBLE1BQU0sTUFBTSxHQUFJLEtBQWdCLENBQUMsUUFBYztBQUMvQyxZQUFBLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQ3JCLElBQUksRUFDSixNQUFNLENBQUMsS0FBSyxFQUNYLEtBQWdCLENBQUMsU0FBZ0IsQ0FDbkM7UUFDSDthQUFPO0FBQ0wsWUFBQSxNQUFNLElBQUksS0FBSyxDQUFDLHdCQUF3QixLQUFLLENBQUEsQ0FBRSxDQUFDO1FBQ2xEO0lBQ0Y7SUFFUSxZQUFZLENBQUMsSUFBTyxFQUFFLEVBQVMsRUFBQTtBQUNyQyxRQUFBLElBQUksZ0JBQWdCLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUU7WUFDN0MsTUFBTSxJQUFJLEtBQUssQ0FBQyxDQUFBLGtCQUFBLEVBQXFCLEVBQUUsQ0FBQyxLQUFLLENBQUEsQ0FBRSxDQUFDO1FBQ2xEO1FBQ0EsSUFBSSxDQUFDLFFBQVEsRUFBRTtBQUNmLFFBQUEsSUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDLFdBQVcsRUFBRTtBQUM5QixRQUFBLE9BQ0UsQ0FBQyxJQUFJLENBQUMsS0FBSyxLQUFLLElBQUksQ0FBQyxRQUFRO0FBQzNCLFlBQUEsSUFBSSxDQUFDLEtBQUssS0FBSyxJQUFJLENBQUMsR0FBRztBQUN2QixZQUFBLElBQUksQ0FBQyxLQUFLLEtBQUssSUFBSSxDQUFDLE9BQU87WUFDN0IsSUFBSSxDQUFDLE1BQU8sQ0FBQyxVQUFVLEdBQUcsRUFBRSxDQUFDLFVBQVUsRUFDdkM7QUFDQSxZQUFBLEtBQUssR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxNQUFPLENBQUMsVUFBVSxDQUFDO1FBQy9EO0FBQ0EsUUFBQSxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQztJQUNoRDtJQUVRLFdBQVcsR0FBQTtRQUNqQixJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFO0FBQ2hDLFlBQUEsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLE1BQU07WUFDekIsSUFBSSxDQUFDLFFBQVEsRUFBRTs7O1lBR2YsSUFBSSxLQUFLLEtBQUssR0FBRyxJQUFJLEtBQUssS0FBSyxHQUFHLEVBQUU7Z0JBQ2xDLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUU7QUFDL0Isb0JBQUEsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQztnQkFDbEM7cUJBQU8sSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRTtBQUN0QyxvQkFBQSxPQUFPLElBQUksQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDO2dCQUNsQztZQUNGO1lBQ0EsSUFBSSxlQUFlLENBQUMsT0FBTyxDQUFDLEtBQU0sQ0FBQyxLQUFLLEVBQUU7QUFDeEMsZ0JBQUEsTUFBTSxJQUFJLEtBQUssQ0FBQyxxQkFBcUIsS0FBSyxDQUFBLENBQUUsQ0FBQztBQUMvQyxZQUFBLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FDaEMsSUFBSSxDQUFDLGFBQWEsRUFBRSxFQUNwQixrQkFBa0IsQ0FDbkI7WUFDRCxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQU0sRUFBRSxJQUFJLENBQUM7UUFDdEM7QUFDQSxRQUFBLE9BQU8sSUFBSSxDQUFDLGFBQWEsRUFBRTtJQUM3QjtBQUVRLElBQUEsYUFBYSxDQUFDLFNBQVksRUFBQTtRQUNoQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDO0FBQ2pDLFFBQUEsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixFQUFFO0FBQ3hDLFFBQUEsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDO0FBQ3pCLFFBQUEsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixFQUFFO0FBQ3pDLFFBQUEsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsUUFBUSxFQUFFLFNBQVMsQ0FBQztJQUMxRDtJQUVRLGFBQWEsR0FBQTtBQUNuQixRQUFBLFFBQVEsSUFBSSxDQUFDLEtBQUs7WUFDaEIsS0FBSyxJQUFJLENBQUMsT0FBTztBQUNmLGdCQUFBLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxNQUFPO0FBQzVCLGdCQUFBLElBQUksT0FBTyxLQUFLLE1BQU0sRUFBRTtvQkFDdEIsSUFBSSxDQUFDLFFBQVEsRUFBRTs7b0JBRWYsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUM7Z0JBQzlCO3FCQUFPLElBQUksUUFBUSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEVBQUU7QUFDM0Msb0JBQUEsTUFBTSxJQUFJLEtBQUssQ0FBQyx1QkFBdUIsT0FBTyxDQUFBLENBQUUsQ0FBQztnQkFDbkQ7QUFDQSxnQkFBQSxNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixPQUFPLENBQUEsQ0FBRSxDQUFDO1lBQ3JELEtBQUssSUFBSSxDQUFDLFVBQVU7QUFDbEIsZ0JBQUEsT0FBTyxJQUFJLENBQUMsd0JBQXdCLEVBQUU7WUFDeEMsS0FBSyxJQUFJLENBQUMsTUFBTTtBQUNkLGdCQUFBLE9BQU8sSUFBSSxDQUFDLFlBQVksRUFBRTtZQUM1QixLQUFLLElBQUksQ0FBQyxPQUFPO0FBQ2YsZ0JBQUEsT0FBTyxJQUFJLENBQUMsYUFBYSxFQUFFO1lBQzdCLEtBQUssSUFBSSxDQUFDLE9BQU87QUFDZixnQkFBQSxPQUFPLElBQUksQ0FBQyxhQUFhLEVBQUU7WUFDN0IsS0FBSyxJQUFJLENBQUMsT0FBTztBQUNmLGdCQUFBLElBQUksSUFBSSxDQUFDLE1BQU0sS0FBSyxHQUFHLEVBQUU7QUFDdkIsb0JBQUEsT0FBTyxJQUFJLENBQUMscUJBQXFCLEVBQUU7Z0JBQ3JDO0FBQU8scUJBQUEsSUFBSSxJQUFJLENBQUMsTUFBTSxLQUFLLEdBQUcsRUFBRTtBQUM5QixvQkFBQSxPQUFPLElBQUksQ0FBQyxTQUFTLEVBQUU7Z0JBQ3pCO0FBQU8scUJBQUEsSUFBSSxJQUFJLENBQUMsTUFBTSxLQUFLLEdBQUcsRUFBRTtBQUM5QixvQkFBQSxPQUFPLElBQUksQ0FBQyxVQUFVLEVBQUU7Z0JBQzFCO0FBQ0EsZ0JBQUEsT0FBTyxTQUFTO1lBQ2xCLEtBQUssSUFBSSxDQUFDLEtBQUs7QUFDYixnQkFBQSxNQUFNLElBQUksS0FBSyxDQUFDLHNCQUFzQixDQUFDO0FBQ3pDLFlBQUE7QUFDRSxnQkFBQSxPQUFPLFNBQVM7O0lBRXRCO0lBRVEsVUFBVSxHQUFBO1FBQ2hCLE1BQU0sS0FBSyxHQUFzQixFQUFFO0FBQ25DLFFBQUEsR0FBRztZQUNELElBQUksQ0FBQyxRQUFRLEVBQUU7WUFDZixJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUM7Z0JBQUU7WUFDdEMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztRQUNyQyxDQUFDLFFBQVEsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDO1FBQ2xDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUM7UUFDaEMsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUM7SUFDOUI7SUFFUSxTQUFTLEdBQUE7UUFDZixNQUFNLE9BQU8sR0FBbUMsRUFBRTtBQUNsRCxRQUFBLEdBQUc7WUFDRCxJQUFJLENBQUMsUUFBUSxFQUFFO1lBQ2YsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDO2dCQUFFO0FBQ3RDLFlBQUEsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLE1BQU87QUFDeEIsWUFBQSxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxFQUFFO2dCQUNoRSxJQUFJLENBQUMsUUFBUSxFQUFFO1lBQ2pCO0FBQ0EsWUFBQSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUM7WUFDekIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsRUFBRTtRQUN4QyxDQUFDLFFBQVEsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDO1FBQ2xDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUM7UUFDaEMsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUM7SUFDL0I7SUFFUSx3QkFBd0IsR0FBQTtBQUM5QixRQUFBLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFNO0FBQ3pCLFFBQUEsSUFBSSxLQUFLLEtBQUssTUFBTSxFQUFFO1lBQ3BCLElBQUksQ0FBQyxRQUFRLEVBQUU7WUFDZixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQztRQUNoQztBQUNBLFFBQUEsSUFBSSxLQUFLLEtBQUssT0FBTyxFQUFFO1lBQ3JCLElBQUksQ0FBQyxRQUFRLEVBQUU7WUFDZixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQztRQUNqQztBQUNBLFFBQUEsSUFBSSxLQUFLLEtBQUssTUFBTSxFQUFFO1lBQ3BCLElBQUksQ0FBQyxRQUFRLEVBQUU7WUFDZixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQztRQUNoQztBQUNBLFFBQUEsSUFBSSxLQUFLLEtBQUssV0FBVyxFQUFFO1lBQ3pCLElBQUksQ0FBQyxRQUFRLEVBQUU7WUFDZixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQztRQUNyQztBQUNBLFFBQUEsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixFQUFFO0FBQzFDLFFBQUEsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLGVBQWUsRUFBRTtRQUNuQyxPQUFPLENBQUMsSUFBSSxHQUFHLFVBQVUsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxVQUFVLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQztJQUMzRTtJQUVRLGdCQUFnQixHQUFBO1FBQ3RCLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsRUFBRTtZQUNuQyxNQUFNLElBQUksS0FBSyxDQUFDLENBQUEscUJBQUEsRUFBd0IsSUFBSSxDQUFDLE1BQU0sQ0FBQSxDQUFFLENBQUM7UUFDeEQ7QUFDQSxRQUFBLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFNO1FBQ3pCLElBQUksQ0FBQyxRQUFRLEVBQUU7UUFDZixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEtBQU0sQ0FBQztJQUM3QjtJQUVRLGVBQWUsR0FBQTtBQUNyQixRQUFBLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLEVBQUU7QUFDckMsWUFBQSxPQUFPLFNBQVM7UUFDbEI7UUFDQSxNQUFNLElBQUksR0FBeUIsRUFBRTtBQUNyQyxRQUFBLEdBQUc7WUFDRCxJQUFJLENBQUMsUUFBUSxFQUFFO1lBQ2YsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLEVBQUU7Z0JBQ3BDO1lBQ0Y7QUFDQSxZQUFBLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsRUFBRTtBQUNwQyxZQUFBLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO1FBQ2pCLENBQUMsUUFBUSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUM7UUFDbEMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQztBQUNoQyxRQUFBLE9BQU8sSUFBSTtJQUNiO0lBRVEsV0FBVyxHQUFBOztRQUVqQixJQUFJLENBQUMsUUFBUSxFQUFFO0FBQ2YsUUFBQSxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsZ0JBQWdCLEVBQUU7UUFDcEMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQztBQUNoQyxRQUFBLE9BQU8sSUFBSTtJQUNiO0lBRVEscUJBQXFCLEdBQUE7QUFDM0IsUUFBQSxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsZUFBZSxFQUFFO1FBQzFDLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUU7WUFDN0IsSUFBSSxDQUFDLFFBQVEsRUFBRTtBQUNmLFlBQUEsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixFQUFFO0FBQ3BDLFlBQUEsTUFBTSxNQUFNLEdBQUcsV0FBVyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBTSxDQUFRLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRTtZQUM3RCxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUM7UUFDOUM7YUFBTztZQUNMLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBWSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3pDO0lBQ0Y7SUFFUSxZQUFZLEdBQUE7QUFDbEIsUUFBQSxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTyxDQUFDO1FBQzdDLElBQUksQ0FBQyxRQUFRLEVBQUU7QUFDZixRQUFBLE9BQU8sS0FBSztJQUNkO0lBRVEsYUFBYSxDQUFDLFNBQWlCLEVBQUUsRUFBQTtRQUN2QyxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsR0FBRyxNQUFNLENBQUEsRUFBRyxJQUFJLENBQUMsTUFBTSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDeEUsSUFBSSxDQUFDLFFBQVEsRUFBRTtBQUNmLFFBQUEsT0FBTyxLQUFLO0lBQ2Q7SUFFUSxhQUFhLENBQUMsU0FBaUIsRUFBRSxFQUFBO0FBQ3ZDLFFBQUEsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUEsRUFBRyxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQSxDQUFFLENBQUMsQ0FBQztRQUN0RSxJQUFJLENBQUMsUUFBUSxFQUFFO0FBQ2YsUUFBQSxPQUFPLEtBQUs7SUFDZDtBQUNEOztBQ3pURDs7O0FBR0c7QUFLSCxNQUFNLGlCQUFpQixHQUE0QztJQUNqRSxHQUFHLEVBQUUsQ0FBQyxDQUFNLEVBQUUsQ0FBTSxLQUFLLENBQUMsR0FBRyxDQUFDO0lBQzlCLEdBQUcsRUFBRSxDQUFDLENBQU0sRUFBRSxDQUFNLEtBQUssQ0FBQyxHQUFHLENBQUM7SUFDOUIsR0FBRyxFQUFFLENBQUMsQ0FBTSxFQUFFLENBQU0sS0FBSyxDQUFDLEdBQUcsQ0FBQztJQUM5QixHQUFHLEVBQUUsQ0FBQyxDQUFNLEVBQUUsQ0FBTSxLQUFLLENBQUMsR0FBRyxDQUFDO0lBQzlCLEdBQUcsRUFBRSxDQUFDLENBQU0sRUFBRSxDQUFNLEtBQUssQ0FBQyxHQUFHLENBQUM7SUFDOUIsSUFBSSxFQUFFLENBQUMsQ0FBTSxFQUFFLENBQU0sS0FBSyxDQUFDLElBQUksQ0FBQztJQUNoQyxJQUFJLEVBQUUsQ0FBQyxDQUFNLEVBQUUsQ0FBTSxLQUFLLENBQUMsSUFBSSxDQUFDO0lBQ2hDLEtBQUssRUFBRSxDQUFDLENBQU0sRUFBRSxDQUFNLEtBQUssQ0FBQyxLQUFLLENBQUM7SUFDbEMsS0FBSyxFQUFFLENBQUMsQ0FBTSxFQUFFLENBQU0sS0FBSyxDQUFDLEtBQUssQ0FBQztJQUNsQyxHQUFHLEVBQUUsQ0FBQyxDQUFNLEVBQUUsQ0FBTSxLQUFLLENBQUMsR0FBRyxDQUFDO0lBQzlCLElBQUksRUFBRSxDQUFDLENBQU0sRUFBRSxDQUFNLEtBQUssQ0FBQyxJQUFJLENBQUM7SUFDaEMsR0FBRyxFQUFFLENBQUMsQ0FBTSxFQUFFLENBQU0sS0FBSyxDQUFDLEdBQUcsQ0FBQztJQUM5QixJQUFJLEVBQUUsQ0FBQyxDQUFNLEVBQUUsQ0FBTSxLQUFLLENBQUMsSUFBSSxDQUFDO0lBQ2hDLElBQUksRUFBRSxDQUFDLENBQU0sRUFBRSxDQUFNLEtBQUssQ0FBQyxJQUFJLENBQUM7SUFDaEMsSUFBSSxFQUFFLENBQUMsQ0FBTSxFQUFFLENBQU0sS0FBSyxDQUFDLElBQUksQ0FBQztJQUNoQyxJQUFJLEVBQUUsQ0FBQyxDQUFNLEVBQUUsQ0FBTSxLQUFLLENBQUMsSUFBSSxDQUFDO0lBQ2hDLEdBQUcsRUFBRSxDQUFDLENBQU0sRUFBRSxDQUFrQixLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDekMsSUFBSSxFQUFFLENBQUMsQ0FBTSxFQUFFLENBQWtCLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztDQUMzQztBQUVELE1BQU0sZ0JBQWdCLEdBQW9DO0FBQ3hELElBQUEsR0FBRyxFQUFFLENBQUMsQ0FBTSxLQUFLLENBQUM7QUFDbEIsSUFBQSxHQUFHLEVBQUUsQ0FBQyxDQUFNLEtBQUssQ0FBQyxDQUFDO0FBQ25CLElBQUEsR0FBRyxFQUFFLENBQUMsQ0FBTSxLQUFLLENBQUMsQ0FBQztDQUNwQjtNQW1GWSxjQUFjLENBQUE7SUFDekIsS0FBSyxHQUFBOztRQUVILE9BQU87QUFDTCxZQUFBLElBQUksRUFBRSxPQUFPO0FBQ2IsWUFBQSxRQUFRLENBQUMsS0FBSyxFQUFBO0FBQ1osZ0JBQUEsT0FBTyxLQUFLO1lBQ2QsQ0FBQztBQUNELFlBQUEsTUFBTSxDQUFDLE1BQU0sRUFBQTtBQUNYLGdCQUFBLE9BQU8sTUFBTTtZQUNmLENBQUM7U0FDRjtJQUNIOztBQUdBLElBQUEsT0FBTyxDQUFDLENBQVMsRUFBQTtRQUNmLE9BQU87QUFDTCxZQUFBLElBQUksRUFBRSxTQUFTO0FBQ2YsWUFBQSxLQUFLLEVBQUUsQ0FBQztBQUNSLFlBQUEsUUFBUSxDQUFDLE1BQU0sRUFBQTtnQkFDYixPQUFPLElBQUksQ0FBQyxLQUFLO1lBQ25CLENBQUM7QUFDRCxZQUFBLE1BQU0sQ0FBQyxNQUFNLEVBQUE7QUFDWCxnQkFBQSxPQUFPLE1BQU07WUFDZixDQUFDO1NBQ0Y7SUFDSDtBQUVBLElBQUEsRUFBRSxDQUFDLENBQVMsRUFBQTtRQUNWLE9BQU87QUFDTCxZQUFBLElBQUksRUFBRSxJQUFJO0FBQ1YsWUFBQSxLQUFLLEVBQUUsQ0FBQztBQUNSLFlBQUEsUUFBUSxDQUFDLEtBQUssRUFBQTs7QUFFWixnQkFBQSxJQUFJLElBQUksQ0FBQyxLQUFLLEtBQUssTUFBTTtBQUFFLG9CQUFBLE9BQU8sS0FBSztBQUN2QyxnQkFBQSxPQUFPLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDO1lBQzVCLENBQUM7QUFDRCxZQUFBLE1BQU0sQ0FBQyxNQUFNLEVBQUE7QUFDWCxnQkFBQSxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUM7QUFDdkIsZ0JBQUEsT0FBTyxNQUFNO1lBQ2YsQ0FBQztTQUNGO0lBQ0g7SUFFQSxLQUFLLENBQUMsRUFBVSxFQUFFLElBQWdCLEVBQUE7QUFDaEMsUUFBQSxNQUFNLENBQUMsR0FBRyxnQkFBZ0IsQ0FBQyxFQUFFLENBQUM7UUFDOUIsT0FBTztBQUNMLFlBQUEsSUFBSSxFQUFFLE9BQU87QUFDYixZQUFBLFFBQVEsRUFBRSxFQUFFO0FBQ1osWUFBQSxLQUFLLEVBQUUsSUFBSTtBQUNYLFlBQUEsUUFBUSxDQUFDLEtBQUssRUFBQTtnQkFDWixPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUN0QyxDQUFDO0FBQ0QsWUFBQSxNQUFNLENBQUMsTUFBTSxFQUFBO2dCQUNYLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDO1lBQ2xDLENBQUM7U0FDRjtJQUNIO0FBRUEsSUFBQSxNQUFNLENBQUMsQ0FBYSxFQUFFLEVBQVUsRUFBRSxDQUFhLEVBQUE7QUFDN0MsUUFBQSxNQUFNLENBQUMsR0FBRyxpQkFBaUIsQ0FBQyxFQUFFLENBQUM7UUFDL0IsT0FBTztBQUNMLFlBQUEsSUFBSSxFQUFFLFFBQVE7QUFDZCxZQUFBLFFBQVEsRUFBRSxFQUFFO0FBQ1osWUFBQSxJQUFJLEVBQUUsQ0FBQztBQUNQLFlBQUEsS0FBSyxFQUFFLENBQUM7QUFDUixZQUFBLFFBQVEsQ0FBQyxLQUFLLEVBQUE7QUFDWixnQkFBQSxJQUFJLElBQUksQ0FBQyxRQUFRLEtBQUssR0FBRyxFQUFFO0FBQ3pCLG9CQUFBLElBQ0UsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEtBQUssSUFBSTtBQUN2Qix3QkFBQSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksS0FBSyxRQUFRO0FBQzNCLHdCQUFBLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxLQUFLLE9BQU8sRUFDMUI7d0JBQ0EsTUFBTSxJQUFJLEtBQUssQ0FBQyxDQUFBLDJCQUFBLEVBQThCLElBQUksQ0FBQyxJQUFJLENBQUEsQ0FBRSxDQUFDO29CQUM1RDtvQkFDQSxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUM7b0JBQ3hDLElBQUksUUFBUSxHQUF1QixTQUFTO0FBQzVDLG9CQUFBLElBQUksUUFBaUI7b0JBQ3JCLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEtBQUssUUFBUSxFQUFFO3dCQUMvQixRQUFRLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQztBQUM3Qyx3QkFBQSxRQUFRLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJO29CQUMzQjt5QkFBTyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxLQUFLLE9BQU8sRUFBRTt3QkFDckMsUUFBUSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUM7d0JBQzdDLFFBQVEsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDO29CQUMvQzt5QkFBTyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxLQUFLLElBQUksRUFBRTs7d0JBRWxDLFFBQVEsR0FBRyxLQUFLO0FBQ2hCLHdCQUFBLFFBQVEsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUs7b0JBQzVCO29CQUNBLE9BQU8sUUFBUSxLQUFLO0FBQ2xCLDBCQUFFOzJCQUNFLFFBQWdCLENBQUMsUUFBUSxDQUFDLEdBQUcsS0FBSyxDQUFDO2dCQUMzQztnQkFDQSxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUNqRSxDQUFDO0FBQ0QsWUFBQSxNQUFNLENBQUMsTUFBTSxFQUFBO0FBQ1gsZ0JBQUEsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDO0FBQ3hCLGdCQUFBLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQztBQUN6QixnQkFBQSxPQUFPLE1BQU07WUFDZixDQUFDO1NBQ0Y7SUFDSDtJQUVBLE1BQU0sQ0FBQyxDQUFhLEVBQUUsQ0FBUyxFQUFBO1FBQzdCLE9BQU87QUFDTCxZQUFBLElBQUksRUFBRSxRQUFRO0FBQ2QsWUFBQSxRQUFRLEVBQUUsQ0FBQztBQUNYLFlBQUEsSUFBSSxFQUFFLENBQUM7QUFDUCxZQUFBLFFBQVEsQ0FBQyxLQUFLLEVBQUE7QUFDWixnQkFBQSxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUM7WUFDbkQsQ0FBQztBQUNELFlBQUEsTUFBTSxDQUFDLE1BQU0sRUFBQTtBQUNYLGdCQUFBLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQztBQUM1QixnQkFBQSxPQUFPLE1BQU07WUFDZixDQUFDO1NBQ0Y7SUFDSDtBQUVBLElBQUEsTUFBTSxDQUFDLFFBQW9CLEVBQUUsTUFBYyxFQUFFLElBQWtCLEVBQUE7UUFDN0QsSUFBSSxNQUFNLElBQUksSUFBSSxJQUFJLE9BQU8sTUFBTSxLQUFLLFFBQVEsRUFBRTtBQUNoRCxZQUFBLE1BQU0sSUFBSSxLQUFLLENBQUMscUJBQXFCLENBQUM7UUFDeEM7UUFDQSxPQUFPO0FBQ0wsWUFBQSxJQUFJLEVBQUUsUUFBUTtBQUNkLFlBQUEsUUFBUSxFQUFFLFFBQVE7QUFDbEIsWUFBQSxNQUFNLEVBQUUsTUFBTTtBQUNkLFlBQUEsU0FBUyxFQUFFLElBQUk7QUFDZixZQUFBLFFBQVEsQ0FBQyxLQUFLLEVBQUE7Z0JBQ1osTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDOzs7O0FBSTlDLGdCQUFBLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFNLEdBQUcsUUFBUSxHQUFHLEtBQUssR0FBRyxNQUFNLENBQUMsSUFBSSxLQUFLO0FBQy9ELGdCQUFBLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLEdBQUcsUUFBUSxHQUFHLE1BQU0sQ0FBQyxHQUFHLFFBQVE7QUFDckQsZ0JBQUEsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLFNBQVMsSUFBSSxFQUFFO0FBQ2pDLGdCQUFBLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFDckQsT0FBTyxDQUFDLEVBQUUsS0FBSyxHQUFHLEtBQUssRUFBRSxTQUFTLENBQUM7WUFDckMsQ0FBQztBQUNELFlBQUEsTUFBTSxDQUFDLE1BQU0sRUFBQTtBQUNYLGdCQUFBLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQztBQUM1QixnQkFBQSxJQUFJLENBQUMsU0FBUyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQ2pELGdCQUFBLE9BQU8sTUFBTTtZQUNmLENBQUM7U0FDRjtJQUNIO0FBRUEsSUFBQSxLQUFLLENBQUMsQ0FBYSxFQUFBO0FBQ2pCLFFBQUEsT0FBTyxDQUFDO0lBQ1Y7SUFFQSxLQUFLLENBQUMsQ0FBYSxFQUFFLENBQWEsRUFBQTtRQUNoQyxPQUFPO0FBQ0wsWUFBQSxJQUFJLEVBQUUsT0FBTztBQUNiLFlBQUEsUUFBUSxFQUFFLENBQUM7QUFDWCxZQUFBLFFBQVEsRUFBRSxDQUFDO0FBQ1gsWUFBQSxRQUFRLENBQUMsS0FBSyxFQUFBO0FBQ1osZ0JBQUEsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUN2RSxDQUFDO0FBQ0QsWUFBQSxNQUFNLENBQUMsTUFBTSxFQUFBO0FBQ1gsZ0JBQUEsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDO0FBQzVCLGdCQUFBLE9BQU8sTUFBTTtZQUNmLENBQUM7U0FDRjtJQUNIO0FBRUEsSUFBQSxPQUFPLENBQUMsQ0FBYSxFQUFFLENBQWEsRUFBRSxDQUFhLEVBQUE7UUFDakQsT0FBTztBQUNMLFlBQUEsSUFBSSxFQUFFLFNBQVM7QUFDZixZQUFBLFNBQVMsRUFBRSxDQUFDO0FBQ1osWUFBQSxRQUFRLEVBQUUsQ0FBQztBQUNYLFlBQUEsU0FBUyxFQUFFLENBQUM7QUFDWixZQUFBLFFBQVEsQ0FBQyxLQUFLLEVBQUE7Z0JBQ1osTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDO2dCQUN4QyxJQUFJLENBQUMsRUFBRTtvQkFDTCxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQztnQkFDdEM7cUJBQU87b0JBQ0wsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUM7Z0JBQ3ZDO1lBQ0YsQ0FBQztBQUNELFlBQUEsTUFBTSxDQUFDLE1BQU0sRUFBQTtBQUNYLGdCQUFBLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQztBQUM3QixnQkFBQSxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUM7QUFDNUIsZ0JBQUEsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDO0FBQzdCLGdCQUFBLE9BQU8sTUFBTTtZQUNmLENBQUM7U0FDRjtJQUNIO0FBRUEsSUFBQSxHQUFHLENBQUMsT0FBZ0QsRUFBQTtRQUNsRCxPQUFPO0FBQ0wsWUFBQSxJQUFJLEVBQUUsS0FBSztBQUNYLFlBQUEsT0FBTyxFQUFFLE9BQU87QUFDaEIsWUFBQSxRQUFRLENBQUMsS0FBSyxFQUFBO2dCQUNaLE1BQU0sR0FBRyxHQUFHLEVBQUU7QUFDZCxnQkFBQSxJQUFJLE9BQU8sSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFO0FBQzNCLG9CQUFBLEtBQUssTUFBTSxHQUFHLElBQUksT0FBTyxFQUFFO3dCQUN6QixNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQzt3QkFDN0IsSUFBSSxHQUFHLEVBQUU7NEJBQ04sR0FBVyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDO3dCQUN6QztvQkFDRjtnQkFDRjtBQUNBLGdCQUFBLE9BQU8sR0FBRztZQUNaLENBQUM7QUFDRCxZQUFBLE1BQU0sQ0FBQyxNQUFNLEVBQUE7QUFDWCxnQkFBQSxJQUFJLE9BQU8sSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFO0FBQzNCLG9CQUFBLEtBQUssTUFBTSxHQUFHLElBQUksT0FBTyxFQUFFO3dCQUN6QixNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQzt3QkFDN0IsSUFBSSxHQUFHLEVBQUU7QUFDUCw0QkFBQSxHQUFHLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQzt3QkFDcEI7b0JBQ0Y7Z0JBQ0Y7QUFDQSxnQkFBQSxPQUFPLE1BQU07WUFDZixDQUFDO1NBQ0Y7SUFDSDs7QUFHQSxJQUFBLElBQUksQ0FBQyxDQUFnQyxFQUFBO1FBQ25DLE9BQU87QUFDTCxZQUFBLElBQUksRUFBRSxNQUFNO0FBQ1osWUFBQSxLQUFLLEVBQUUsQ0FBQztBQUNSLFlBQUEsUUFBUSxDQUFDLEtBQUssRUFBQTtBQUNaLGdCQUFBLE9BQU8sSUFBSSxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUNuRCxDQUFDO0FBQ0QsWUFBQSxNQUFNLENBQUMsTUFBTSxFQUFBO0FBQ1gsZ0JBQUEsSUFBSSxDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUM3QyxnQkFBQSxPQUFPLE1BQU07WUFDZixDQUFDO1NBQ0Y7SUFDSDtJQUVBLGFBQWEsQ0FBQyxNQUFnQixFQUFFLElBQWdCLEVBQUE7UUFDOUMsT0FBTztBQUNMLFlBQUEsSUFBSSxFQUFFLGVBQWU7WUFDckIsTUFBTTtZQUNOLElBQUk7QUFDSixZQUFBLFFBQVEsQ0FBQyxLQUFLLEVBQUE7QUFDWixnQkFBQSxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTTtBQUMxQixnQkFBQSxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSTtnQkFDdEIsT0FBTyxVQUFVLEdBQUcsSUFBVyxFQUFBOzs7O29CQUk3QixNQUFNLFNBQVMsR0FBRyxNQUFNLENBQUMsV0FBVyxDQUNsQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUNuQztvQkFDRCxNQUFNLFFBQVEsR0FBRyxJQUFJLEtBQUssQ0FBQyxLQUFLLElBQUksRUFBRSxFQUFFO0FBQ3RDLHdCQUFBLEdBQUcsQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBQTtBQUNyQiw0QkFBQSxJQUFJLFNBQVMsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLEVBQUU7QUFDbEMsZ0NBQUEsU0FBUyxDQUFDLElBQWMsQ0FBQyxHQUFHLEtBQUs7NEJBQ25DOzRCQUNBLFFBQVEsTUFBTSxDQUFDLElBQWMsQ0FBQyxHQUFHLEtBQUs7d0JBQ3hDLENBQUM7d0JBQ0QsR0FBRyxDQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUE7QUFDZCw0QkFBQSxJQUFJLFNBQVMsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLEVBQUU7QUFDbEMsZ0NBQUEsT0FBTyxTQUFTLENBQUMsSUFBYyxDQUFDOzRCQUNsQztBQUNBLDRCQUFBLE9BQU8sTUFBTSxDQUFDLElBQWMsQ0FBQzt3QkFDL0IsQ0FBQztBQUNGLHFCQUFBLENBQUM7QUFDRixvQkFBQSxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDO0FBQ2hDLGdCQUFBLENBQUM7WUFDSCxDQUFDO0FBQ0QsWUFBQSxNQUFNLENBQUMsTUFBTSxFQUFBOzs7O2dCQUlYLE9BQU8sSUFBSSxDQUFDO3FCQUNULE1BQU0sQ0FBQyxNQUFNO0FBQ2IscUJBQUEsTUFBTSxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDOUMsQ0FBQztTQUNGO0lBQ0g7QUFDRDs7QUNoWUQsTUFBTSxFQUFDLGFBQWEsRUFBRSxZQUFZLEVBQUUsb0JBQW9CLEVBQUUsU0FBUyxFQUFDLEdBQUcsSUFBSTtBQUUzRSxNQUFNLFVBQVUsR0FBRyxJQUFJLGNBQWMsRUFBRTtBQUN2QyxNQUFNLGVBQWUsR0FBRyxJQUFJLEdBQUcsRUFBa0M7QUFFakUsTUFBTSxXQUFXLEdBQUcsQ0FBQyxDQUFTLEtBQzVCLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQVUsS0FBSyxFQUFFLENBQUMsV0FBVyxFQUFFLENBQUM7QUFFNUQ7O0FBRUc7QUFDSCxNQUFNLGNBQWMsR0FBRyxDQUFDLENBQVMsRUFBRSxLQUFVLEtBQUk7SUFDL0MsSUFBSSxHQUFHLEdBQUcsZUFBZSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7QUFDaEMsSUFBQSxJQUFJLEdBQUcsS0FBSyxTQUFTLEVBQUU7QUFDckIsUUFBQSxJQUFJLGVBQWUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUU7QUFDMUIsWUFBQSxPQUFPLFNBQVM7UUFDbEI7QUFDQSxRQUFBLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFO0FBQ1osUUFBQSxJQUFJLENBQUMsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRTtBQUMxQyxZQUFBLE1BQU0sVUFBVSxHQUFHLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFO1lBQ3RELEdBQUcsR0FBRyxJQUFJLE1BQU0sQ0FBQyxVQUFVLEVBQUUsVUFBVSxDQUFDLENBQUMsS0FBSyxFQUFFO0FBQ2hELFlBQUEsZUFBZSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDO1FBQzdCO0lBQ0Y7QUFDQSxJQUFBLE9BQU8sR0FBRyxFQUFFLFFBQVEsQ0FBQyxLQUFLLENBQUM7QUFDN0IsQ0FBQztBQWtDTSxNQUFNLFNBQVMsR0FBb0IsQ0FDeEMsUUFBNkIsRUFDN0IsS0FBYSxFQUNiLFFBQTBCLEVBQzFCLFNBQW9CLEtBQ2xCO0lBQ0YsTUFBTSxXQUFXLEdBQUcsUUFBUSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUM7SUFDL0MsSUFBSSxXQUFXLEtBQUssSUFBSSxJQUFJLGNBQWMsQ0FBQyxXQUFXLEVBQUUsS0FBSyxDQUFDLEVBQUU7UUFDOUQsT0FBTyxnQkFBZ0IsQ0FBQyxRQUFRLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxTQUFTLENBQUM7SUFDL0Q7QUFDQSxJQUFBLE9BQU8sU0FBUztBQUNsQixDQUFDO0FBRUQsTUFBTSxZQUFZLEdBQUcsOEJBQThCO0FBRW5ELE1BQU0sd0JBQXdCLEdBQUcsQ0FBQyxDQUFTLEtBQUssb0JBQW9CLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztBQUU1RSxNQUFNLHNCQUFzQixHQUFHLENBQUMsQ0FBUyxLQUN2QyxDQUFDLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQztBQUU3QyxNQUFNLGFBQWEsR0FBb0IsQ0FDNUMsUUFBNkIsRUFDN0IsS0FBZ0MsRUFDaEMsUUFBMEIsRUFDMUIsU0FBb0IsS0FDbEI7SUFDRixNQUFNLGVBQWUsR0FBRyxRQUFRLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQztBQUN2RCxJQUFBLElBQUksZUFBZSxLQUFLLElBQUksRUFBRTtRQUM1QixNQUFNLEtBQUssR0FBRyxjQUFjLENBQUMsZUFBZSxFQUFFLEtBQUssQ0FBQztRQUNwRCxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsRUFBRTtBQUMzQixZQUFBLE9BQU8sT0FBTztRQUNoQjtBQUNBLFFBQUEsTUFBTSxXQUFXLEdBQUcsY0FBYyxDQUFDLFFBQVEsQ0FBQztBQUU1QyxRQUFBLElBQUksS0FBSyxHQUFHLEVBQUU7UUFDZCxNQUFNLE1BQU0sR0FBRyxFQUFFO0FBQ2pCLFFBQUEsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLEVBQUU7QUFDeEIsWUFBQSxLQUFLLEVBQUU7WUFDUCxNQUFNLFNBQVMsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQztBQUN0QyxZQUFBLFNBQVMsQ0FBQyxJQUFJLEdBQUcsSUFBSTtBQUNyQixZQUFBLFNBQVMsQ0FBQyxLQUFLLEdBQUcsS0FBSztZQUN2QixTQUFTLENBQUMsTUFBTSxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUs7WUFFMUMsTUFBTSxNQUFNLEdBQUcsRUFBRTtBQUNqQixZQUFBLEtBQUssTUFBTSxJQUFJLElBQUksV0FBVyxDQUFDLEtBQUssRUFBRTtBQUNwQyxnQkFBQSxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxRQUFRLEVBQUUsU0FBUyxDQUFDO0FBQ3pELGdCQUFBLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDLEVBQUU7QUFDbkIsb0JBQUEsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFJLEtBQTJCLENBQUM7Z0JBQzlDO3FCQUFPO0FBQ0wsb0JBQUEsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUM7Z0JBQ3BCO1lBQ0Y7QUFDQSxZQUFBLE1BQU0sY0FBYyxHQUEyQjtBQUM3QyxnQkFBQSxVQUFVLEVBQUUsV0FBVztnQkFDdkIsTUFBTTthQUNQO0FBQ0QsWUFBQSxNQUFNLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQztRQUM3QjtBQUNBLFFBQUEsT0FBTyxNQUFNO0lBQ2Y7QUFDQSxJQUFBLE9BQU8sU0FBUztBQUNsQixDQUFDO0FBRU0sTUFBTSxlQUFlLEdBQXFCO0FBQy9DLElBQUEsRUFBRSxFQUFFLFNBQVM7QUFDYixJQUFBLE1BQU0sRUFBRSxhQUFhO0NBQ3RCO0FBRUQ7O0FBRUc7QUFDSSxNQUFNLGVBQWUsR0FBRyxDQUM3QixRQUE2QixFQUM3QixRQUFBLEdBQTZCLGVBQWUsRUFDNUMsU0FBQSxHQUF1QixFQUFFLEVBQ3pCLGFBQW1DLEtBQ2Y7QUFDcEIsSUFBQSxNQUFNLFdBQVcsR0FBRyxjQUFjLENBQUMsUUFBUSxDQUFDO0FBQzVDLElBQUEsTUFBTSxpQkFBaUIsR0FBRyxXQUFXLENBQUMsU0FBUztJQUMvQyxJQUFJLGFBQWEsRUFBRTtBQUNqQixRQUFBLE1BQU0sZ0JBQWdCLEdBQUcsY0FBYyxDQUFDLGFBQWEsQ0FBQztBQUN0RCxRQUFBLE1BQU0sY0FBYyxHQUFHLGdCQUFnQixDQUFDLFNBQVM7QUFDakQsUUFBQSxNQUFNLGlCQUFpQixHQUFHLGlCQUFpQixDQUFDLE9BQU8sQ0FBQztBQUVwRCxRQUFBLElBQUksaUJBQWlCLEtBQUssU0FBUyxFQUFFOzs7QUFJbkMsWUFBQSxTQUFTLEdBQUc7O0FBRVYsZ0JBQUEsR0FBRyxpQkFBaUI7O0FBRXBCLGdCQUFBLEdBQUcsU0FBUzs7Z0JBRVosS0FBSyxFQUFFLENBQUMsS0FBSyxFQUFFLFFBQVEsRUFBRSxTQUFTLEtBQUk7Ozs7O0FBS3BDLG9CQUFBLFNBQVMsR0FBRzs7QUFFVix3QkFBQSxHQUFHLGNBQWM7O0FBRWpCLHdCQUFBLEdBQUcsU0FBUzs7d0JBRVosS0FBSyxFQUFFLENBQUMsS0FBSyxFQUFFLFFBQVEsRUFBRSxTQUFTLEtBQUk7NEJBQ3BDLE9BQU8sZ0JBQWdCLENBQ3JCLGFBQWEsRUFDYixLQUFLLEVBQ0wsUUFBUSxFQUNSLFNBQVMsQ0FDVjt3QkFDSCxDQUFDO3FCQUNGO29CQUNELE9BQU8saUJBQWlCLENBQUMsS0FBSyxFQUFFLFFBQVEsRUFBRSxTQUFTLENBQUM7Z0JBQ3RELENBQUM7YUFDRjtRQUNIO2FBQU87Ozs7O0FBTUwsWUFBQSxTQUFTLEdBQUc7O0FBRVYsZ0JBQUEsR0FBRyxjQUFjOztBQUVqQixnQkFBQSxHQUFHLGlCQUFpQjs7QUFFcEIsZ0JBQUEsR0FBRyxTQUFTO2FBQ2I7WUFDRCxRQUFRLEdBQUcsYUFBYTtRQUMxQjtJQUNGO1NBQU87O0FBRUwsUUFBQSxTQUFTLEdBQUc7O0FBRVYsWUFBQSxHQUFHLGlCQUFpQjs7QUFFcEIsWUFBQSxHQUFHLFNBQVM7U0FDYjtJQUNIO0FBQ0EsSUFBQSxPQUFPLENBQUMsS0FBSyxLQUFLLGdCQUFnQixDQUFDLFFBQVEsRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLFNBQVMsQ0FBQztBQUMxRTtBQTRCQTs7Ozs7Ozs7QUFRRztBQUNJLE1BQU0sZ0JBQWdCLEdBQUcsQ0FDOUIsUUFBNkIsRUFDN0IsS0FBVSxFQUNWLFdBQTZCLGVBQWUsRUFDNUMsU0FBQSxHQUF1QixFQUFFLEtBQ3ZCO0FBQ0YsSUFBQSxNQUFNLFdBQVcsR0FBRyxjQUFjLENBQUMsUUFBUSxDQUFDO0lBQzVDLE1BQU0sTUFBTSxHQUFtQixFQUFFO0FBQ2pDLElBQUEsS0FBSyxNQUFNLElBQUksSUFBSSxXQUFXLENBQUMsS0FBSyxFQUFFO0FBQ3BDLFFBQUEsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsUUFBUSxFQUFFLFNBQVMsQ0FBQztBQUNyRCxRQUFBLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDLEVBQUU7QUFDbkIsWUFBQSxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUksS0FBMkIsQ0FBQztRQUM5QzthQUFPO0FBQ0wsWUFBQSxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQztRQUNwQjtJQUNGO0FBQ0EsSUFBQSxNQUFNLGNBQWMsR0FBMkI7QUFDN0MsUUFBQSxVQUFVLEVBQUUsV0FBVztRQUN2QixNQUFNO0tBQ1A7QUFDRCxJQUFBLE9BQU8sY0FBYztBQUN2QjtBQW1CQSxNQUFNLGdCQUFnQixHQUFHLElBQUksR0FBRyxFQUF5QztBQUVsRSxNQUFNLGNBQWMsR0FBRyxDQUM1QixRQUE2QixLQUNUO0lBQ3BCLElBQUksV0FBVyxHQUFHLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUM7QUFDaEQsSUFBQSxJQUFJLFdBQVcsS0FBSyxTQUFTLEVBQUU7QUFDN0IsUUFBQSxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsUUFBUSxHQUFHLFdBQVcsR0FBRyxlQUFlLENBQUMsUUFBUSxDQUFDLEVBQUU7SUFDM0U7QUFDQSxJQUFBLE9BQU8sV0FBVztBQUNwQixDQUFDO0FBRUQsTUFBTSxlQUFlLEdBQUcsQ0FBQyxRQUE2QixLQUFzQjtBQUMxRSxJQUFBLE1BQU0sV0FBVyxHQUFxQjtBQUNwQyxRQUFBLENBQUMsRUFBRSxTQUE0QztBQUMvQyxRQUFBLEVBQUUsRUFBRSxRQUFRLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBd0I7QUFDbkQsUUFBQSxLQUFLLEVBQUUsRUFBRTtBQUNULFFBQUEsU0FBUyxFQUFFLEVBQUU7S0FDZDtJQUNELE1BQU0sTUFBTSxHQUFHLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FDdEMsV0FBVyxDQUFDLEVBQUcsQ0FBQyxPQUFPLEVBQ3ZCLFVBQVUsQ0FBQyxZQUFZLEdBQUcsVUFBVSxDQUFDLFNBQVMsR0FBRyxVQUFVLENBQUMsWUFBWSxDQUN6RTtBQUNELElBQUEsSUFBSSxJQUFJLEdBQWdCLE1BQU0sQ0FBQyxXQUFXO0FBQzFDLElBQUEsSUFBSSxTQUFTLEdBQUcsRUFBRTtJQUNsQixNQUFNLGdCQUFnQixHQUFHLEVBQUU7SUFFM0IsT0FBTyxDQUFDLElBQUksR0FBRyxNQUFNLENBQUMsUUFBUSxFQUFFLE1BQU0sSUFBSSxFQUFFO1FBQzFDLElBQUksSUFBSSxDQUFDLFFBQVEsS0FBSyxJQUFJLENBQUMsWUFBWSxFQUFFO0FBQ3ZDLFlBQUEsU0FBUyxFQUFFO1lBQ1gsTUFBTSxPQUFPLEdBQUcsSUFBZTtBQUMvQixZQUFBLElBQUksT0FBTyxDQUFDLE9BQU8sS0FBSyxVQUFVLEVBQUU7Z0JBQ2xDLE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDO2dCQUN6QyxNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQztnQkFDekMsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUM7QUFFekMsZ0JBQUEsSUFBSSxJQUFJLEtBQUssSUFBSSxJQUFJLElBQUksS0FBSyxJQUFJLElBQUksSUFBSSxLQUFLLElBQUksRUFBRTtBQUNuRCxvQkFBQSxPQUFPLENBQUMsVUFBVyxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLEVBQUUsQ0FBQyxFQUFFLE9BQU8sQ0FBQztBQUNyRSxvQkFBQSxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDO0FBQzlCLG9CQUFBLElBQUksTUFBbUI7QUFFdkIsb0JBQUEsSUFBSSxJQUFJLEtBQUssSUFBSSxFQUFFOztBQUVqQix3QkFBQSxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsSUFBSSxFQUFFO0FBQ2hDLHdCQUFBLE1BQU0sd0JBQXdCLEdBQzVCLFlBQVksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksWUFBWSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUM7d0JBRTlELE1BQU0sR0FBRyxDQUNQLEtBQWEsRUFDYixRQUEwQixFQUMxQixTQUFvQixLQUNsQjs0QkFDRixNQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQztBQUM3Qyw0QkFBQSxNQUFNLElBQUksR0FDUixRQUFRLEtBQUssSUFBSSxHQUFHLFNBQVMsR0FBRyxjQUFjLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQzs0QkFFakUsTUFBTSxRQUFRLEdBQUc7QUFDZixrQ0FBRSxjQUFjLENBQUMsWUFBWSxFQUFFLEtBQUs7QUFDcEMsa0NBQUUsU0FBUyxDQUFDLElBQUksQ0FBQzs0QkFDbkIsT0FBTyxRQUFRLEdBQUcsSUFBSSxFQUFFLFFBQVEsRUFBRSxTQUFTLENBQUM7QUFDOUMsd0JBQUEsQ0FBQztvQkFDSDtBQUFPLHlCQUFBLElBQUksSUFBSSxLQUFLLElBQUksRUFBRTs7d0JBRXhCLE1BQU0sR0FBRyxDQUNQLEtBQWEsRUFDYixRQUEwQixFQUMxQixTQUFvQixLQUNsQjtBQUNGLDRCQUFBLE1BQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUM7NEJBQzlCLE9BQU8sT0FBTyxHQUNaLE9BQThCLEVBQzlCLEtBQUssRUFDTCxRQUFRLEVBQ1IsU0FBUyxDQUNWO0FBQ0gsd0JBQUEsQ0FBQztvQkFDSDt5QkFBTzs7QUFFTCx3QkFBQSxJQUFJLElBQUksS0FBSyxPQUFPLEVBQUU7QUFDcEIsNEJBQUEsV0FBVyxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUMvQixLQUFVLEVBQ1YsUUFBMEIsRUFDMUIsU0FBb0IsS0FDbEI7Ozs7O0FBS0YsZ0NBQUEsTUFBTSxhQUFhLEdBQUcsU0FBUyxDQUFDLE9BQU8sQ0FBQztBQUN4QyxnQ0FBQSxNQUFNLGlCQUFpQixHQUFHLGNBQWMsQ0FDdEMsT0FBOEIsQ0FDL0I7QUFDRCxnQ0FBQSxTQUFTLEdBQUc7QUFDVixvQ0FBQSxHQUFHLFNBQVM7b0NBQ1osR0FBRyxpQkFBaUIsQ0FBQyxTQUFTO2lDQUMvQjtnQ0FDRCxPQUFPLGFBQWEsQ0FBQyxLQUFLLEVBQUUsUUFBUSxFQUFFLFNBQVMsQ0FBQztBQUNsRCw0QkFBQSxDQUFDO3dCQUNIOzZCQUFPOztBQUVMLDRCQUFBLFdBQVcsQ0FBQyxTQUFTLENBQUMsSUFBSyxDQUFDLEdBQUcsQ0FDN0IsS0FBVSxFQUNWLFFBQTBCLEVBQzFCLFNBQW9CLEtBQ2xCO2dDQUNGLE9BQU8sZ0JBQWdCLENBQ3JCLE9BQThCLEVBQzlCLEtBQUssRUFDTCxRQUFRLEVBQ1IsU0FBUyxDQUNWO0FBQ0gsNEJBQUEsQ0FBQzt3QkFDSDs7Ozt3QkFJQSxNQUFNLEdBQUcsQ0FDUCxLQUFhLEVBQ2IsUUFBMEIsRUFDMUIsU0FBb0IsS0FDbEI7QUFDRiw0QkFBQSxNQUFNLFFBQVEsR0FBRyxTQUFTLENBQUMsSUFBSyxDQUFDOzRCQUNqQyxPQUFPLFFBQVEsR0FBRyxLQUFLLEVBQUUsUUFBUSxFQUFFLFNBQVMsQ0FBQztBQUMvQyx3QkFBQSxDQUFDO29CQUNIO0FBQ0Esb0JBQUEsV0FBVyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUM7d0JBQ3JCLElBQUksRUFBRSxDQUFDO0FBQ1Asd0JBQUEsS0FBSyxFQUFFLFNBQVM7d0JBQ2hCLE1BQU07QUFDUCxxQkFBQSxDQUFDOzs7b0JBR0Y7Z0JBQ0Y7WUFDRjtBQUNBLFlBQUEsTUFBTSxjQUFjLEdBQUcsT0FBTyxDQUFDLGlCQUFpQixFQUFFO0FBQ2xELFlBQUEsS0FBSyxNQUFNLGFBQWEsSUFBSSxjQUFjLEVBQUU7Z0JBQzFDLE1BQU0sY0FBYyxHQUFHLE9BQU8sQ0FBQyxZQUFZLENBQUMsYUFBYSxDQUFFOzs7Z0JBRzNELE1BQU0sVUFBVSxHQUFHLGNBQWMsQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDO0FBQ3JELGdCQUFBLElBQUksVUFBVSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7QUFDM0Isb0JBQUEsSUFBSSx3QkFBd0IsQ0FBQyxjQUFjLENBQUMsRUFBRTt3QkFDNUMsT0FBTyxDQUFDLFlBQVksQ0FDbEIsYUFBYSxFQUNiLHNCQUFzQixDQUFDLGNBQWMsQ0FBQyxDQUN2QztvQkFDSDtvQkFDQTtnQkFDRjtBQUNBLGdCQUFBLE9BQU8sQ0FBQyxlQUFlLENBQUMsYUFBYSxDQUFDO2dCQUN0QyxJQUFJLElBQUksR0FBRyxhQUFhO2dCQUN4QixJQUFJLElBQUksR0FBRyxhQUFhO0FBQ3hCLGdCQUFBLE1BQU0sTUFBTSxHQUFHLGFBQWEsQ0FBQyxDQUFDLENBQUM7QUFDL0IsZ0JBQUEsSUFBSSxNQUFNLEtBQUssR0FBRyxFQUFFO29CQUNsQixJQUFJLEdBQUcsV0FBVyxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQzlDLElBQUksR0FBRyxZQUFZO2dCQUNyQjtBQUFPLHFCQUFBLElBQUksTUFBTSxLQUFLLEdBQUcsRUFBRTtBQUN6QixvQkFBQSxJQUFJLEdBQUcsYUFBYSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7b0JBQ2pDLElBQUksR0FBRyxvQkFBb0I7Z0JBQzdCO0FBQU8scUJBQUEsSUFBSSxNQUFNLEtBQUssR0FBRyxFQUFFO29CQUN6QixJQUFJLEdBQUcsV0FBVyxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQzlDLElBQUksR0FBRyxTQUFTO2dCQUNsQjtnQkFFQSxNQUFNLE9BQU8sR0FBRyxDQUFDLHNCQUFzQixDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUN2RCxNQUFNLEtBQUssR0FBc0IsRUFBRTtBQUNuQyxnQkFBQSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsVUFBVSxDQUFDLE1BQU0sRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFO0FBQzdDLG9CQUFBLE1BQU0sUUFBUSxHQUFHLFVBQVUsQ0FBQyxDQUFDLENBQUM7b0JBQzlCLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxVQUFVLENBQWUsQ0FBQztBQUNyRCxvQkFBQSxPQUFPLENBQUMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLFVBQVUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDekQ7QUFFQSxnQkFBQSxXQUFXLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQztvQkFDckIsSUFBSSxFQUFFLENBQUM7QUFDUCxvQkFBQSxLQUFLLEVBQUUsU0FBUztvQkFDaEIsSUFBSTtvQkFDSixPQUFPO29CQUNQLElBQUk7b0JBQ0osTUFBTSxFQUFFLENBQ04sS0FBYSxFQUNiLFNBQTJCLEVBQzNCLFVBQXFCLEtBQ25CO0FBQ0Ysd0JBQUEsT0FBTyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxLQUFLLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7b0JBQ2xELENBQUM7QUFDRixpQkFBQSxDQUFDO1lBQ0o7UUFDRjthQUFPLElBQUksSUFBSSxDQUFDLFFBQVEsS0FBSyxJQUFJLENBQUMsU0FBUyxFQUFFO1lBQzNDLElBQUksUUFBUSxHQUFHLElBQVk7QUFDM0IsWUFBQSxNQUFNLElBQUksR0FBRyxRQUFRLENBQUMsV0FBWTtZQUNsQyxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQztBQUN4QyxZQUFBLElBQUksT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7Z0JBQ3RCLFFBQVEsQ0FBQyxXQUFXLEdBQUcsc0JBQXNCLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzNEO0FBQU8saUJBQUEsSUFBSSx3QkFBd0IsQ0FBQyxJQUFJLENBQUMsRUFBRTtBQUN6QyxnQkFBQSxRQUFRLENBQUMsV0FBVyxHQUFHLHNCQUFzQixDQUFDLElBQUksQ0FBQztZQUNyRDtBQUNBLFlBQUEsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRTtBQUMxQyxnQkFBQSxNQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDO2dCQUMzQixNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsUUFBUSxFQUFFLFVBQVUsQ0FBZTtBQUN0RCxnQkFBQSxXQUFXLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQztBQUNyQixvQkFBQSxJQUFJLEVBQUUsQ0FBQztvQkFDUCxLQUFLLEVBQUUsRUFBRSxTQUFTO0FBQ2xCLG9CQUFBLE1BQU0sRUFBRSxDQUFDLEtBQWMsRUFBRSxTQUEyQixLQUNsRCxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQWMsQ0FBQztBQUNoQyxpQkFBQSxDQUFDO0FBQ0YsZ0JBQUEsTUFBTSxXQUFXLEdBQUcsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUNsRSxRQUFRLENBQUMsVUFBVyxDQUFDLFlBQVksQ0FBQyxXQUFXLEVBQUUsUUFBUSxDQUFDLFdBQVcsQ0FBQztBQUNwRSxnQkFBQSxRQUFRLENBQUMsVUFBVyxDQUFDLFlBQVksQ0FDL0IsUUFBUSxDQUFDLGFBQWEsQ0FBQyxFQUFFLENBQUMsRUFDMUIsUUFBUSxDQUFDLFdBQVcsQ0FDckI7Z0JBQ0QsUUFBUSxHQUFHLFdBQVc7Ozs7O0FBS3RCLGdCQUFBLE1BQU0sQ0FBQyxXQUFXLEdBQUcsV0FBVztZQUNsQztRQUNGO0lBQ0Y7QUFDQSxJQUFBLEtBQUssTUFBTSxDQUFDLElBQUksZ0JBQWdCLEVBQUU7UUFDaEMsQ0FBQyxDQUFDLE1BQU0sRUFBRTtJQUNaO0FBQ0EsSUFBQSxPQUFPLFdBQVc7QUFDcEIsQ0FBQzs7QUM1ZUQsU0FBUyxNQUFNLENBQUMsUUFBc0MsRUFBQTtBQUNsRCxJQUFBLElBQUksUUFBUSxZQUFZLG1CQUFtQixFQUFFO0FBQ3pDLFFBQUEsT0FBTyxRQUFRO0lBQ25CO0FBQU8sU0FBQSxJQUFJLFFBQVEsS0FBSyxPQUFPLFFBQVEsRUFBRTtRQUNyQyxNQUFNLE9BQU8sR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQztBQUNsRCxRQUFBLE9BQU8sQ0FBQyxTQUFTLEdBQUcsUUFBUTtBQUM1QixRQUFBLE9BQU8sT0FBTztJQUNsQjtTQUFPO1FBQ0gsTUFBTSxJQUFJLFNBQVMsQ0FBQyxDQUFBLDBDQUFBLEVBQTZDLE9BQU8sUUFBUSxDQUFBLENBQUEsQ0FBRyxDQUFDO0lBQ3hGO0FBQ0o7QUFFQSxTQUFTLHlCQUF5QixDQUFDLE9BQXVDLEVBQUE7SUFDdEUsTUFBTSxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsYUFBYSxFQUFFLEdBQUcsT0FBTyxJQUFJLEVBQUU7SUFDNUQsT0FBTyxDQUFDLFFBQXNDLEtBQUk7QUFDOUMsUUFBQSxPQUFPLGVBQWUsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxhQUFhLENBQUM7QUFDaEYsSUFBQSxDQUFDO0FBQ0w7Ozs7IiwieF9nb29nbGVfaWdub3JlTGlzdCI6WzAsMSwyLDMsNCw1LDYsNyw4LDksMTAsMTIsMTMsMTQsMTUsMTZdLCJzb3VyY2VSb290IjoiY2RwOi8vL0BjZHAvZXh0ZW5zaW9uLXRlbXBsYXRlLWJyaWRnZS8ifQ==