/*!
 * @cdp/extension-template-bridge 0.9.17
 *   extension for HTML templates bridge.
 */

import { toTemplateStringsArray, _Σ, nothing } from '@cdp/extension-template';

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

const { AttributePart, PropertyPart, BooleanAttributePart, EventPart } = _Σ;
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

export { createMustacheTransformer, createStampinoTransformer, evaluateTemplate, prepareTemplate, transformer };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uLXRlbXBsYXRlLWJyaWRnZS5tanMiLCJzb3VyY2VzIjpbImxpdC10cmFuc2Zvcm1lci9zcmMvbGl0LXRyYW5zZm9ybWVyLmpzIiwibGl0LXRyYW5zZm9ybWVyL3NyYy9oZWxwZXIvZGF0YUhlbHBlci5qcyIsImxpdC10cmFuc2Zvcm1lci9zcmMvdHJhbnNmb3JtZXJzL3ZhcmlhYmxlVHJhbnNmb3JtZXIuanMiLCJsaXQtdHJhbnNmb3JtZXIvc3JjL3RyYW5zZm9ybWVycy91bnNhZmVWYXJpYWJsZS5qcyIsImxpdC10cmFuc2Zvcm1lci9zcmMvaGVscGVyL2lzTXVzdGFjaGVGYWxzeS5qcyIsImxpdC10cmFuc2Zvcm1lci9zcmMvaGVscGVyL3NlY3Rpb25IZWxwZXIuanMiLCJsaXQtdHJhbnNmb3JtZXIvc3JjL3RyYW5zZm9ybWVycy9zZWN0aW9uLmpzIiwibGl0LXRyYW5zZm9ybWVyL3NyYy90cmFuc2Zvcm1lcnMvaW52ZXJ0ZWRTZWN0aW9uLmpzIiwibGl0LXRyYW5zZm9ybWVyL3NyYy90cmFuc2Zvcm1lcnMvY29tbWVudC5qcyIsImxpdC10cmFuc2Zvcm1lci9zcmMvdHJhbnNmb3JtZXJzL2N1c3RvbURlbGltaXRlci5qcyIsImxpdC10cmFuc2Zvcm1lci9zcmMvbGl0LXRyYW5zZm9ybWVyLWNvbmZpZ3VyZWRPdXRPZlRoZUJveC5qcyIsImJyaWRnZS1tdXN0YWNoZS50cyIsImpleHByL3NyYy9saWIvY29uc3RhbnRzLnRzIiwiamV4cHIvc3JjL2xpYi90b2tlbml6ZXIudHMiLCJqZXhwci9zcmMvbGliL3BhcnNlci50cyIsImpleHByL3NyYy9saWIvZXZhbC50cyIsInN0YW1waW5vL3NyYy9zdGFtcGluby50cyIsImJyaWRnZS1zdGFtcGluby50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKiogXHJcbiAqIEBwYXJhbSB7b2JqZWN0fSBjb25maWcgPSB7XHJcbiAqICBodG1sOiBsaXQtaHRtbC5odG1sLFxyXG4gKiAgZGVsaW1pdGVyOiB7IHN0YXJ0OiAne3snLCBlbmQ6ICd9fScgfSxcclxuICogIHRyYW5zZm9ybWVyczogeyAvLyBub3RlIHRoYXQgdHJhbnNmb3JtVmFyaWFibGUgaXMgbm90IGhlcmUuIEl0IGdldHMgYXBwbGllZCB3aGVuIG5vIHRyYW5zZm9ybWVyLnRlc3QgaGFzIHBhc3NlZFxyXG4gKiAgICBuYW1lOiB7XHJcbiAqICAgICAgdGVzdDogKHN0ciwgY29uZmlnKSA9PiBib29sLFxyXG4gKiAgICAgIHRyYW5zZm9ybTogKHN0ciwgY29uZmlnKSA9PiAoe1xyXG4gKiAgICAgICAgcmVtYWluaW5nVG1wbFN0cjogc3RyLFxyXG4gKiAgICAgICAgaW5zZXJ0aW9uUG9pbnQ6IGN0eCA9PiBsaXQtaHRtbC5UZW1wbGF0ZVJlc3VsdCB8IHVuZGVmaW5lZCwgLy8gaWYgdW5kZWZpbmVkIHJlbWFpbmluZ1RtcGxTdHIgd2lsbCBiZSBtZXJnZWQgd2l0aCBsYXN0IHN0YXRpYyBwYXJ0IFxyXG4gKiAgICAgIH0pLFxyXG4gKiAgICB9LFxyXG4gKiAgfSxcclxuICogIHRyYW5zZm9ybVZhcmlhYmxlLCBcclxuICogfVxyXG4gKiBAcmV0dXJucyB7ZnVuY3Rpb259IHN0clRlbXBsYXRlID0+IGN0eCA9PiBsaXQtaHRtbC5UZW1wbGF0ZVJlc3VsdFxyXG4gKi9cclxuZXhwb3J0IGRlZmF1bHQgY29uZmlnID0+IHN0clRlbXBsYXRlID0+IHRyYW5zZm9ybShzdHJUZW1wbGF0ZSwgY29uZmlnKVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHRyYW5zZm9ybSh0bXBsMlBhcnNlLCBjb25maWcpIHtcclxuICBjb25zdCBzdGF0aWNQYXJ0cyA9IFtdXHJcbiAgY29uc3QgaW5zZXJ0aW9uUG9pbnRzID0gW11cclxuXHJcbiAgbGV0IHJlbWFpbmluZ1RtcGxTdHIgPSB0bXBsMlBhcnNlXHJcbiAgbGV0IHN0YXJ0SW5kZXhPZklQID0gcmVtYWluaW5nVG1wbFN0ci5pbmRleE9mKGNvbmZpZy5kZWxpbWl0ZXIuc3RhcnQpXHJcbiAgd2hpbGUgKHN0YXJ0SW5kZXhPZklQID49IDApIHtcclxuICAgIGlmIChyZW1haW5pbmdUbXBsU3RyLmluZGV4T2YoY29uZmlnLmRlbGltaXRlci5lbmQsIHN0YXJ0SW5kZXhPZklQKSA8IDApXHJcbiAgICAgIHRocm93IG5ldyBFcnJvcihgbWlzc2luZyBlbmQgZGVsaW1pdGVyIGF0OiAnJHtyZW1haW5pbmdUbXBsU3RyfSdgKVxyXG5cclxuICAgIHN0YXRpY1BhcnRzLnB1c2gocmVtYWluaW5nVG1wbFN0ci5zdWJzdHJpbmcoMCwgc3RhcnRJbmRleE9mSVApKVxyXG5cclxuICAgIGNvbnN0IGlQVHJhbnNmb3JtUmVzdWx0ID0gdHJhbnNmb3JtSVAoXHJcbiAgICAgIHJlbWFpbmluZ1RtcGxTdHIuc3Vic3RyaW5nKHN0YXJ0SW5kZXhPZklQICsgY29uZmlnLmRlbGltaXRlci5zdGFydC5sZW5ndGgpLFxyXG4gICAgICBjb25maWdcclxuICAgIClcclxuXHJcbiAgICBpZiAoaVBUcmFuc2Zvcm1SZXN1bHQuaW5zZXJ0aW9uUG9pbnQpIHtcclxuICAgICAgcmVtYWluaW5nVG1wbFN0ciA9IGlQVHJhbnNmb3JtUmVzdWx0LnJlbWFpbmluZ1RtcGxTdHJcclxuICAgICAgaW5zZXJ0aW9uUG9pbnRzLnB1c2goaVBUcmFuc2Zvcm1SZXN1bHQuaW5zZXJ0aW9uUG9pbnQpXHJcbiAgICAgIHN0YXJ0SW5kZXhPZklQID0gcmVtYWluaW5nVG1wbFN0ci5pbmRleE9mKGNvbmZpZy5kZWxpbWl0ZXIuc3RhcnQpXHJcbiAgICB9IGVsc2UgeyAvLyBlLmcuIGNvbW1lbnQgb3IgY3VzdG9tRGVsaW1ldGVyXHJcbiAgICAgIGNvbnN0IGxhc3RTdGF0aWNQYXJ0ID0gc3RhdGljUGFydHMucG9wKClcclxuICAgICAgcmVtYWluaW5nVG1wbFN0ciA9IGxhc3RTdGF0aWNQYXJ0ICsgaVBUcmFuc2Zvcm1SZXN1bHQucmVtYWluaW5nVG1wbFN0clxyXG4gICAgICBzdGFydEluZGV4T2ZJUCA9IHJlbWFpbmluZ1RtcGxTdHIuaW5kZXhPZihjb25maWcuZGVsaW1pdGVyLnN0YXJ0LCBsYXN0U3RhdGljUGFydC5sZW5ndGgpXHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBzdGF0aWNQYXJ0cy5wdXNoKHJlbWFpbmluZ1RtcGxTdHIpXHJcblxyXG4gIHJldHVybiBjdHggPT5cclxuICAgIGNvbmZpZy5odG1sKHN0YXRpY1BhcnRzLCAuLi5pbnNlcnRpb25Qb2ludHMubWFwKGlQID0+IGlQKGN0eCkpKVxyXG59XHJcblxyXG5mdW5jdGlvbiB0cmFuc2Zvcm1JUChyZW1haW5pbmdUbXBsU3RyLCBjb25maWcpIHtcclxuICBjb25zdCB0cmFuc2Zvcm1lciA9IE9iamVjdC52YWx1ZXMoY29uZmlnLnRyYW5zZm9ybWVycykuZmluZCh0ID0+IHQudGVzdChyZW1haW5pbmdUbXBsU3RyLCBjb25maWcpKVxyXG4gIGNvbnN0IHRyYW5zZm9ybUZ1bmN0aW9uID0gdHJhbnNmb3JtZXJcclxuICAgID8gdHJhbnNmb3JtZXIudHJhbnNmb3JtXHJcbiAgICA6IGNvbmZpZy50cmFuc2Zvcm1WYXJpYWJsZVxyXG4gIHJldHVybiB0cmFuc2Zvcm1GdW5jdGlvbihyZW1haW5pbmdUbXBsU3RyLCBjb25maWcpXHJcbn0iLCJleHBvcnQgZnVuY3Rpb24gY3R4MlZhbHVlKGN0eCwga2V5KSB7XHJcbiAgaWYgKGtleSA9PT0gJy4nKVxyXG4gICAgcmV0dXJuIGN0eFxyXG5cclxuICBsZXQgcmVzdWx0ID0gY3R4XHJcbiAgZm9yIChsZXQgayBvZiBrZXkuc3BsaXQoJy4nKSkge1xyXG4gICAgaWYgKCFyZXN1bHQuaGFzT3duUHJvcGVydHkoaykpXHJcbiAgICAgIHJldHVybiAnJ1xyXG5cclxuICAgIHJlc3VsdCA9IHJlc3VsdFtrXVxyXG4gIH1cclxuXHJcbiAgcmV0dXJuIHJlc3VsdFxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY3R4Mk11c3RhY2hlU3RyaW5nKGN0eCwga2V5KSB7XHJcbiAgcmV0dXJuIG11c3RhY2hlU3RyaW5neWZ5KGN0eDJWYWx1ZShjdHgsIGtleSkpXHJcbn1cclxuXHJcbmZ1bmN0aW9uIG11c3RhY2hlU3RyaW5neWZ5KHZhbHVlKSB7XHJcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09IG51bGwpXHJcbiAgICByZXR1cm4gJydcclxuXHJcbiAgcmV0dXJuICcnICsgdmFsdWVcclxufSIsImltcG9ydCB7IGN0eDJNdXN0YWNoZVN0cmluZyB9IGZyb20gJy4uL2hlbHBlci9kYXRhSGVscGVyLmpzJ1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgKHJlbWFpbmluZ1RtcGxTdHIsIHsgZGVsaW1pdGVyIH0pID0+IHtcclxuICBjb25zdCBpbmRleE9mRW5kRGVsaW1pdGVyID0gcmVtYWluaW5nVG1wbFN0ci5pbmRleE9mKGRlbGltaXRlci5lbmQpXHJcbiAgY29uc3QgZGF0YUtleSA9IHJlbWFpbmluZ1RtcGxTdHIuc3Vic3RyaW5nKDAsIGluZGV4T2ZFbmREZWxpbWl0ZXIpXHJcbiAgcmV0dXJuIHtcclxuICAgIHJlbWFpbmluZ1RtcGxTdHI6IHJlbWFpbmluZ1RtcGxTdHIuc3Vic3RyaW5nKGluZGV4T2ZFbmREZWxpbWl0ZXIgKyBkZWxpbWl0ZXIuZW5kLmxlbmd0aCksXHJcbiAgICBpbnNlcnRpb25Qb2ludDogY3R4ID0+IGN0eDJNdXN0YWNoZVN0cmluZyhjdHgsIGRhdGFLZXkpXHJcbiAgfVxyXG59IiwiaW1wb3J0IHsgY3R4Mk11c3RhY2hlU3RyaW5nIH0gZnJvbSAnLi4vaGVscGVyL2RhdGFIZWxwZXIuanMnXHJcblxyXG4vKiogTm90ZSwgdGhpcyBpcyB1bnNhZmUgdG8gdXNlLCBiZWNhdXNlIHRoZSByZW5kZXJlZCBvdXRwdXQgY291bGQgYmUgYW55IEphdmFTY3JpcHQhICovXHJcbmV4cG9ydCBkZWZhdWx0IHVuc2FmZUhUTUwgPT4gKHtcclxuICB0ZXN0OiByZW1haW5pbmdUbXBsU3RyID0+IHJlbWFpbmluZ1RtcGxTdHJbMF0gPT09ICd7JyxcclxuICB0cmFuc2Zvcm06IChyZW1haW5pbmdUbXBsU3RyLCB7IGRlbGltaXRlciB9KSA9PiB7XHJcbiAgICBjb25zdCBpbmRleE9mRW5kRGVsaW1pdGVyID0gcmVtYWluaW5nVG1wbFN0ci5pbmRleE9mKCd9JyArIGRlbGltaXRlci5lbmQpXHJcbiAgICBpZiAoaW5kZXhPZkVuZERlbGltaXRlciA8IDApXHJcbiAgICAgIHRocm93IG5ldyBFcnJvcihgbWlzc2luZyBlbmQgZGVsaW1pdGVyIGF0OiAnJHtkZWxpbWl0ZXIuc3RhcnR9JHtyZW1haW5pbmdUbXBsU3RyfSdgKVxyXG4gIFxyXG4gICAgY29uc3QgZGF0YUtleSA9IHJlbWFpbmluZ1RtcGxTdHIuc3Vic3RyaW5nKDEsIGluZGV4T2ZFbmREZWxpbWl0ZXIpXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICByZW1haW5pbmdUbXBsU3RyOiByZW1haW5pbmdUbXBsU3RyLnN1YnN0cmluZyhpbmRleE9mRW5kRGVsaW1pdGVyICsgMSArIGRlbGltaXRlci5lbmQubGVuZ3RoKSxcclxuICAgICAgaW5zZXJ0aW9uUG9pbnQ6IGN0eCA9PiB1bnNhZmVIVE1MKGN0eDJNdXN0YWNoZVN0cmluZyhjdHgsIGRhdGFLZXkpKSxcclxuICAgIH1cclxuICB9XHJcbn0pIiwiZXhwb3J0IGZ1bmN0aW9uIGlzTXVzdGFjaGVGYWxzeSh2YWx1ZSkge1xyXG4gIHJldHVybiBbbnVsbCwgdW5kZWZpbmVkLCBmYWxzZSwgMCwgTmFOLCAnJ11cclxuICAgIC5zb21lKGZhbHN5ID0+IGZhbHN5ID09PSB2YWx1ZSlcclxuICAgIHx8ICh2YWx1ZS5sZW5ndGggJiYgdmFsdWUubGVuZ3RoID09PSAwKVxyXG59IiwiZXhwb3J0IGZ1bmN0aW9uIHBhcnNlU2VjdGlvbih0bXBsU3RyLCBkZWxpbWl0ZXIpIHtcclxuICBjb25zdCBpbmRleE9mU3RhcnRUYWdFbmQgPSB0bXBsU3RyLmluZGV4T2YoZGVsaW1pdGVyLmVuZClcclxuICBjb25zdCBkYXRhS2V5ID0gdG1wbFN0ci5zdWJzdHJpbmcoMSwgaW5kZXhPZlN0YXJ0VGFnRW5kKVxyXG4gIGNvbnN0IGVuZFRhZyA9IGAke2RlbGltaXRlci5zdGFydH0vJHtkYXRhS2V5fSR7ZGVsaW1pdGVyLmVuZH1gXHJcbiAgY29uc3QgaW5kZXhPZkVuZFRhZ1N0YXJ0ID0gdG1wbFN0ci5pbmRleE9mKGVuZFRhZylcclxuICBpZiAoaW5kZXhPZkVuZFRhZ1N0YXJ0IDwgMClcclxuICAgIHRocm93IG5ldyBFcnJvcihgbWlzc2luZyBlbmQgZGVsaW1pdGVyIGF0OiAnJHtkZWxpbWl0ZXIuc3RhcnR9JHt0bXBsU3RyfSdgKVxyXG4gIFxyXG4gIHJldHVybiB7XHJcbiAgICBkYXRhS2V5LFxyXG4gICAgaW5uZXJUbXBsOiB0bXBsU3RyLnN1YnN0cmluZyhpbmRleE9mU3RhcnRUYWdFbmQgKyBkZWxpbWl0ZXIuc3RhcnQubGVuZ3RoLCBpbmRleE9mRW5kVGFnU3RhcnQpLFxyXG4gICAgcmVtYWluaW5nVG1wbFN0cjogdG1wbFN0ci5zdWJzdHJpbmcoaW5kZXhPZkVuZFRhZ1N0YXJ0ICsgZW5kVGFnLmxlbmd0aCksXHJcbiAgfVxyXG59IiwiaW1wb3J0IHsgdHJhbnNmb3JtIH0gZnJvbSAnLi4vbGl0LXRyYW5zZm9ybWVyLmpzJ1xyXG5pbXBvcnQgeyBjdHgyVmFsdWUgfSBmcm9tICcuLi9oZWxwZXIvZGF0YUhlbHBlci5qcydcclxuaW1wb3J0IHsgaXNNdXN0YWNoZUZhbHN5IH0gZnJvbSAnLi4vaGVscGVyL2lzTXVzdGFjaGVGYWxzeS5qcydcclxuaW1wb3J0IHsgcGFyc2VTZWN0aW9uIH0gZnJvbSAnLi4vaGVscGVyL3NlY3Rpb25IZWxwZXIuanMnXHJcblxyXG4vKiogTm90ZSwgdW5saWtlIHdpdGhpbiBtdXN0YWNoZSBmdW5jdGlvbnMgYXMgZGF0YSB2YWx1ZXMgYXJlIG5vdCBzdXBwb3J0ZWQgb3V0IG9mIHRoZSBib3ggKi9cclxuZXhwb3J0IGRlZmF1bHQgKCkgPT4gKHtcclxuICB0ZXN0OiByZW1haW5pbmdUbXBsU3RyID0+IHJlbWFpbmluZ1RtcGxTdHJbMF0gPT09ICcjJyxcclxuICB0cmFuc2Zvcm06IChyZW1haW5pbmdUbXBsU3RyLCBjb25maWcpID0+IHtcclxuICAgIGNvbnN0IHBhcnNlZFNlY3Rpb24gPSBwYXJzZVNlY3Rpb24ocmVtYWluaW5nVG1wbFN0ciwgY29uZmlnLmRlbGltaXRlcilcclxuICAgIGNvbnN0IHRyYW5zZm9ybWVkSW5uZXJUbXBsID0gdHJhbnNmb3JtKHBhcnNlZFNlY3Rpb24uaW5uZXJUbXBsLCBjb25maWcpXHJcbiAgICBcclxuICAgIHJldHVybiB7XHJcbiAgICAgIHJlbWFpbmluZ1RtcGxTdHI6IHBhcnNlZFNlY3Rpb24ucmVtYWluaW5nVG1wbFN0cixcclxuICAgICAgaW5zZXJ0aW9uUG9pbnQ6IGN0eCA9PiB7XHJcbiAgICAgICAgY29uc3Qgc2VjdGlvbkRhdGEgPSBjdHgyVmFsdWUoY3R4LCBwYXJzZWRTZWN0aW9uLmRhdGFLZXkpXHJcbiAgICAgICAgXHJcbiAgICAgICAgaWYgKGlzTXVzdGFjaGVGYWxzeShzZWN0aW9uRGF0YSkpXHJcbiAgICAgICAgICByZXR1cm4gJyc7XHJcblxyXG4gICAgICAgIHJldHVybiBzZWN0aW9uRGF0YS5tYXBcclxuICAgICAgICAgID8gc2VjdGlvbkRhdGEubWFwKGlubmVyQ3R4ID0+IHRyYW5zZm9ybWVkSW5uZXJUbXBsKGlubmVyQ3R4KSlcclxuICAgICAgICAgIDogdHJhbnNmb3JtZWRJbm5lclRtcGwoY3R4KVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG59KSIsImltcG9ydCB7IHRyYW5zZm9ybSB9IGZyb20gJy4uL2xpdC10cmFuc2Zvcm1lci5qcydcbmltcG9ydCB7IGN0eDJWYWx1ZSB9IGZyb20gJy4uL2hlbHBlci9kYXRhSGVscGVyLmpzJ1xuaW1wb3J0IHsgaXNNdXN0YWNoZUZhbHN5IH0gZnJvbSAnLi4vaGVscGVyL2lzTXVzdGFjaGVGYWxzeS5qcydcbmltcG9ydCB7IHBhcnNlU2VjdGlvbiB9IGZyb20gJy4uL2hlbHBlci9zZWN0aW9uSGVscGVyLmpzJ1xuXG5leHBvcnQgZGVmYXVsdCAoKSA9PiAoe1xuICB0ZXN0OiByZW1haW5pbmdUbXBsU3RyID0+IHJlbWFpbmluZ1RtcGxTdHJbMF0gPT09ICdeJyxcbiAgLypcbiAgICogcGF0Y2ggZm9yIHYuMS4wLjJcbiAgICogYXBwbHkgdHJhbnNmb3JtZWRJbm5lclRtcGwoKVxuICAgKi9cbiAgdHJhbnNmb3JtOiAocmVtYWluaW5nVG1wbFN0ciwgY29uZmlnKSA9PiB7XG4gICAgY29uc3QgcGFyc2VkU2VjdGlvbiA9IHBhcnNlU2VjdGlvbihyZW1haW5pbmdUbXBsU3RyLCBjb25maWcuZGVsaW1pdGVyKVxuICAgIGNvbnN0IHRyYW5zZm9ybWVkSW5uZXJUbXBsID0gdHJhbnNmb3JtKHBhcnNlZFNlY3Rpb24uaW5uZXJUbXBsLCBjb25maWcpXG4gICAgXG4gICAgcmV0dXJuIHtcbiAgICAgIHJlbWFpbmluZ1RtcGxTdHI6IHBhcnNlZFNlY3Rpb24ucmVtYWluaW5nVG1wbFN0cixcbiAgICAgIGluc2VydGlvblBvaW50OiBjdHggPT4ge1xuICAgICAgICBjb25zdCBzZWN0aW9uRGF0YSA9IGN0eDJWYWx1ZShjdHgsIHBhcnNlZFNlY3Rpb24uZGF0YUtleSlcbiAgICAgICAgXG4gICAgICAgIGlmIChpc011c3RhY2hlRmFsc3koc2VjdGlvbkRhdGEpKVxuICAgICAgICAgIHJldHVybiBzZWN0aW9uRGF0YS5tYXBcbiAgICAgICAgICAgID8gc2VjdGlvbkRhdGEubWFwKGlubmVyQ3R4ID0+IHRyYW5zZm9ybWVkSW5uZXJUbXBsKGlubmVyQ3R4KSlcbiAgICAgICAgICAgIDogdHJhbnNmb3JtZWRJbm5lclRtcGwoY3R4KVxuICAgICAgICByZXR1cm4gJyc7XG4gICAgICB9XG4gICAgfVxuICB9XG59KVxuIiwiZXhwb3J0IGRlZmF1bHQgKCkgPT4gKHtcclxuICB0ZXN0OiByZW1haW5pbmdUbXBsU3RyID0+IHJlbWFpbmluZ1RtcGxTdHJbMF0gPT09ICchJyxcclxuICB0cmFuc2Zvcm06IChyZW1haW5pbmdUbXBsU3RyLCB7IGRlbGltaXRlciB9KSA9PiAoe1xyXG4gICAgcmVtYWluaW5nVG1wbFN0cjogcmVtYWluaW5nVG1wbFN0ci5zdWJzdHJpbmcocmVtYWluaW5nVG1wbFN0ci5pbmRleE9mKGRlbGltaXRlci5lbmQpICsgZGVsaW1pdGVyLmVuZC5sZW5ndGgpLFxyXG4gICAgaW5zZXJ0aW9uUG9pbnQ6IHVuZGVmaW5lZCxcclxuICB9KVxyXG59KSIsImV4cG9ydCBkZWZhdWx0ICgpID0+ICh7XHJcbiAgdGVzdDogcmVtYWluaW5nVG1wbFN0ciA9PiByZW1haW5pbmdUbXBsU3RyWzBdID09PSAnPScsXHJcbiAgdHJhbnNmb3JtOiAocmVtYWluaW5nVG1wbFN0ciwgY29uZmlnKSA9PiB7XHJcbiAgICBjb25zdCBvcmlnaW5hbEVuZERlbGlMZW5ndGggPSBjb25maWcuZGVsaW1pdGVyLmVuZC5sZW5ndGhcclxuICAgIGNvbnN0IGluZGV4T2ZFbmRUYWcgPSByZW1haW5pbmdUbXBsU3RyLmluZGV4T2YoJz0nICsgY29uZmlnLmRlbGltaXRlci5lbmQpXHJcbiAgICBpZiAoaW5kZXhPZkVuZFRhZyA8IDAgKVxyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYG1pc3NpbmcgZW5kIGRlbGltaXRlciBhdDogJyR7cmVtYWluaW5nVG1wbFN0cn0nYClcclxuXHJcbiAgICBjb25zdCBbIG5ld1N0YXJ0RGVsaSwgbmV3RW5kRGVsaSBdID0gcmVtYWluaW5nVG1wbFN0ci5zdWJzdHJpbmcoMSwgaW5kZXhPZkVuZFRhZykuc3BsaXQoJyAnKVxyXG5cclxuICAgIGNvbmZpZy5kZWxpbWl0ZXIuc3RhcnQgPSBuZXdTdGFydERlbGlcclxuICAgIGNvbmZpZy5kZWxpbWl0ZXIuZW5kID0gbmV3RW5kRGVsaVxyXG4gICAgXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICByZW1haW5pbmdUbXBsU3RyOiByZW1haW5pbmdUbXBsU3RyLnN1YnN0cmluZyhpbmRleE9mRW5kVGFnICsgMSArIG9yaWdpbmFsRW5kRGVsaUxlbmd0aCksXHJcbiAgICAgIGluc2VydGlvblBvaW50OiB1bmRlZmluZWQsICBcclxuICAgIH1cclxuICB9XHJcbn0pIiwiaW1wb3J0IGNyZWF0ZVRyYW5zZm9ybSBmcm9tICcuL2xpdC10cmFuc2Zvcm1lci5qcydcclxuaW1wb3J0IHRyYW5zZm9ybVZhcmlhYmxlIGZyb20gJy4vdHJhbnNmb3JtZXJzL3ZhcmlhYmxlVHJhbnNmb3JtZXIuanMnXHJcbmltcG9ydCB1bnNhZmVWYXJpYWJsZVRyYW5zZm9ybWVyIGZyb20gJy4vdHJhbnNmb3JtZXJzL3Vuc2FmZVZhcmlhYmxlLmpzJ1xyXG5pbXBvcnQgc2VjdGlvblRyYW5zZm9ybWVyIGZyb20gJy4vdHJhbnNmb3JtZXJzL3NlY3Rpb24uanMnXHJcbmltcG9ydCBpbnZlcnRlZFNlY3Rpb25UcmFuc2Zvcm1lciBmcm9tICcuL3RyYW5zZm9ybWVycy9pbnZlcnRlZFNlY3Rpb24uanMnXHJcbmltcG9ydCBjb21tZW50VHJhbnNmb3JtZXIgZnJvbSAnLi90cmFuc2Zvcm1lcnMvY29tbWVudC5qcydcclxuaW1wb3J0IGN1c3RvbURlbGltaXRlclRyYW5zZm9ybWVyIGZyb20gJy4vdHJhbnNmb3JtZXJzL2N1c3RvbURlbGltaXRlci5qcydcclxuXHJcbmV4cG9ydCBkZWZhdWx0IChodG1sLCB1bnNhZmVIVE1MKSA9PlxyXG4gIGNyZWF0ZVRyYW5zZm9ybSh7XHJcbiAgICBodG1sLFxyXG4gICAgZGVsaW1pdGVyOiB7IHN0YXJ0OiAne3snLCBlbmQ6ICd9fScgfSxcclxuICAgIHRyYW5zZm9ybVZhcmlhYmxlLFxyXG4gICAgdHJhbnNmb3JtZXJzOiB7XHJcbiAgICAgIHVuc2FmZVZhcmlhYmxlOiB1bnNhZmVWYXJpYWJsZVRyYW5zZm9ybWVyKHVuc2FmZUhUTUwpLFxyXG4gICAgICBzZWN0aW9uOiBzZWN0aW9uVHJhbnNmb3JtZXIoKSxcclxuICAgICAgaW52ZXJ0ZWRTZWN0aW9uOiBpbnZlcnRlZFNlY3Rpb25UcmFuc2Zvcm1lcigpLFxyXG4gICAgICBjb21tZW50OiBjb21tZW50VHJhbnNmb3JtZXIoKSxcclxuICAgICAgY3VzdG9tRGVsaW1pdGVyVHJhbnNmb3JtZXI6IGN1c3RvbURlbGltaXRlclRyYW5zZm9ybWVyKCksXHJcbiAgICB9LFxyXG4gIH0pIiwiaW1wb3J0IHsgdG9UZW1wbGF0ZVN0cmluZ3NBcnJheSB9IGZyb20gJ0BjZHAvZXh0ZW5zaW9uLXRlbXBsYXRlJztcbmltcG9ydCB0eXBlIHsgVGVtcGxhdGVCcmlkZ2VFbmRpbmUsIFRlbXBsYXRlVHJhbnNmb3JtZXIgfSBmcm9tICdAYnJpZGdlL2ludGVyZmFjZXMnO1xuaW1wb3J0IHR5cGUge1xuICAgIE11c3RhY2hlVHJhbnNmb3JtZXIsXG4gICAgVGVtcGxhdGVUYWcsXG4gICAgVHJhbnNmb3JtRGlyZWN0aXZlLFxuICAgIFRyYW5zZm9ybVRlc3RlcixcbiAgICBUcmFuc2Zvcm1FeGVjdXRvcixcbiAgICBUcmFuc2Zvcm1lQ29udGV4dCxcbiAgICBUcmFuc2Zvcm1Db25maWcsXG59IGZyb20gJ2xpdC10cmFuc2Zvcm1lci9zcmMvaW50ZXJmYWNlcyc7XG5cbmltcG9ydCBjcmVhdGVEZWZhdWx0IGZyb20gJ2xpdC10cmFuc2Zvcm1lcic7XG5pbXBvcnQgY3JlYXRlQ3VzdG9tIGZyb20gJ2xpdC10cmFuc2Zvcm1lci9zcmMvbGl0LXRyYW5zZm9ybWVyJztcblxuaW1wb3J0IHZhcmlhYmxlIGZyb20gJ2xpdC10cmFuc2Zvcm1lci9zcmMvdHJhbnNmb3JtZXJzL3ZhcmlhYmxlVHJhbnNmb3JtZXInO1xuaW1wb3J0IHVuc2FmZVZhcmlhYmxlIGZyb20gJ2xpdC10cmFuc2Zvcm1lci9zcmMvdHJhbnNmb3JtZXJzL3Vuc2FmZVZhcmlhYmxlJztcbmltcG9ydCBzZWN0aW9uIGZyb20gJ2xpdC10cmFuc2Zvcm1lci9zcmMvdHJhbnNmb3JtZXJzL3NlY3Rpb24nO1xuaW1wb3J0IGludmVydGVkU2VjdGlvbiBmcm9tICdsaXQtdHJhbnNmb3JtZXIvc3JjL3RyYW5zZm9ybWVycy9pbnZlcnRlZFNlY3Rpb24nO1xuaW1wb3J0IGNvbW1lbnQgZnJvbSAnbGl0LXRyYW5zZm9ybWVyL3NyYy90cmFuc2Zvcm1lcnMvY29tbWVudCc7XG5pbXBvcnQgY3VzdG9tRGVsaW1pdGVyIGZyb20gJ2xpdC10cmFuc2Zvcm1lci9zcmMvdHJhbnNmb3JtZXJzL2N1c3RvbURlbGltaXRlcic7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbnR5cGUgTXVzdGFjaGVUcmFuc2Zvcm1lckNvbnRleHQgPSBNdXN0YWNoZVRyYW5zZm9ybWVyICYgeyBkZWxpbWl0ZXI6IHsgc3RhcnQ6IHN0cmluZzsgZW5kOiBzdHJpbmc7IH07IH07XG5cbmNvbnN0IHhmb3JtID0gKG11c3RhY2hlOiBNdXN0YWNoZVRyYW5zZm9ybWVyQ29udGV4dCk6IFRlbXBsYXRlVHJhbnNmb3JtZXIgPT4ge1xuICAgIHJldHVybiAodGVtcGxhdGU6IEhUTUxUZW1wbGF0ZUVsZW1lbnQgfCBzdHJpbmcpOiBUZW1wbGF0ZUJyaWRnZUVuZGluZSA9PiB7XG4gICAgICAgIGNvbnN0IHsgc3RhcnQsIGVuZCB9ID0gbXVzdGFjaGUuZGVsaW1pdGVyO1xuXG4gICAgICAgIC8vIOOCs+ODoeODs+ODiOODluODreODg+OCr+WGheOBriBkZWxpbWl0ZXIg5oq95Ye6XG4gICAgICAgIGNvbnN0IHJlZ0NvbW1lbnRSZW1vdmVTdGFydCA9IG5ldyBSZWdFeHAoYDwhLS1cXFxccyoke3N0YXJ0fWAsICdnJyk7XG4gICAgICAgIGNvbnN0IHJlZ0NvbW1lbnRSZW1vdmVFbmQgICA9IG5ldyBSZWdFeHAoYCR7ZW5kfVxcXFxzKi0tPmAsICdnJyk7XG4gICAgICAgIC8vIGRlbGltaXRlciDliY3lvozjga4gdHJpbSDnlKjmraPopo/ooajnj75cbiAgICAgICAgY29uc3QgcmVnVHJpbSA9IG5ldyBSZWdFeHAoYCgke3N0YXJ0fVsjXi9dPylcXFxccyooW1xcXFx3XFxcXC5dKylcXFxccyooJHtlbmR9KWAsICdnJyk7XG5cbiAgICAgICAgY29uc3QgYm9keSA9ICh0ZW1wbGF0ZSBpbnN0YW5jZW9mIEhUTUxUZW1wbGF0ZUVsZW1lbnQgPyB0ZW1wbGF0ZS5pbm5lckhUTUwgOiB0ZW1wbGF0ZSlcbiAgICAgICAgICAgIC5yZXBsYWNlKHJlZ0NvbW1lbnRSZW1vdmVTdGFydCwgc3RhcnQpXG4gICAgICAgICAgICAucmVwbGFjZShyZWdDb21tZW50UmVtb3ZlRW5kLCBlbmQpXG4gICAgICAgICAgICAucmVwbGFjZShyZWdUcmltLCAnJDEkMiQzJylcbiAgICAgICAgO1xuXG4gICAgICAgIHJldHVybiBtdXN0YWNoZShib2R5KTtcbiAgICB9O1xufTtcblxuLypcbiAqIGxpdC1odG1sIHYyLjEuMCtcbiAqIFRlbXBsYXRlU3RyaW5nc0FycmF5IOOCkuWOs+WvhuOBq+ODgeOCp+ODg+OCr+OBmeOCi+OCiOOBhuOBq+OBquOBo+OBn+OBn+OCgSBwYXRjaCDjgpLjgYLjgabjgotcbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9saXQvbGl0L3B1bGwvMjMwN1xuICpcbiAqIOWwhuadpSBgQXJyYXkuaXNUZW1wbGF0ZU9iamVjdCgpYCDjgpLkvb/nlKjjgZXjgozjgovloLTlkIgsIOacrOWvvuW/nOOCguimi+ebtOOBmeW/heimgeOBguOCilxuICogaHR0cHM6Ly90YzM5LmVzL3Byb3Bvc2FsLWFycmF5LWlzLXRlbXBsYXRlLW9iamVjdC9cbiAqL1xuY29uc3QgcGF0Y2ggPSAoaHRtbDogVGVtcGxhdGVUYWcpOiBUZW1wbGF0ZVRhZyA9PiB7XG4gICAgcmV0dXJuICh0ZW1wbGF0ZTogVGVtcGxhdGVTdHJpbmdzQXJyYXksIC4uLnZhbHVlczogdW5rbm93bltdKSA9PiB7XG4gICAgICAgIHJldHVybiBodG1sKHRvVGVtcGxhdGVTdHJpbmdzQXJyYXkodGVtcGxhdGUpLCAuLi52YWx1ZXMpO1xuICAgIH07XG59O1xuXG5mdW5jdGlvbiBjcmVhdGVNdXN0YWNoZVRyYW5zZm9ybWVyKGh0bWw6IFRlbXBsYXRlVGFnLCB1bnNhZmVIVE1MOiBUcmFuc2Zvcm1EaXJlY3RpdmUpOiBUZW1wbGF0ZVRyYW5zZm9ybWVyO1xuZnVuY3Rpb24gY3JlYXRlTXVzdGFjaGVUcmFuc2Zvcm1lcihjb25maWc6IFRyYW5zZm9ybUNvbmZpZyk6IFRlbXBsYXRlVHJhbnNmb3JtZXI7XG5mdW5jdGlvbiBjcmVhdGVNdXN0YWNoZVRyYW5zZm9ybWVyKGFyZzE6IHVua25vd24sIGFyZzI/OiB1bmtub3duKTogVGVtcGxhdGVUcmFuc2Zvcm1lciB7XG4gICAgY29uc3QgZGVsaW1pdGVyID0geyBzdGFydDogJ3t7JywgZW5kOiAnfX0nIH07XG4gICAgbGV0IHRyYW5zZm9ybWVyOiBNdXN0YWNoZVRyYW5zZm9ybWVyQ29udGV4dDtcbiAgICBpZiAoJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIGFyZzEpIHtcbiAgICAgICAgdHJhbnNmb3JtZXIgPSBjcmVhdGVEZWZhdWx0KHBhdGNoKGFyZzEgYXMgVGVtcGxhdGVUYWcpLCBhcmcyIGFzIFRyYW5zZm9ybURpcmVjdGl2ZSkgYXMgTXVzdGFjaGVUcmFuc2Zvcm1lckNvbnRleHQ7XG4gICAgICAgIHRyYW5zZm9ybWVyLmRlbGltaXRlciA9IGRlbGltaXRlcjtcbiAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCB7IGh0bWwgfSA9IGFyZzEgYXMgeyBodG1sOiBUZW1wbGF0ZVRhZzsgfTtcbiAgICAgICAgY29uc3QgY29uZmlnID0gT2JqZWN0LmFzc2lnbih7XG4gICAgICAgICAgICBkZWxpbWl0ZXIsXG4gICAgICAgICAgICB0cmFuc2Zvcm1lcnM6IHt9LFxuICAgICAgICB9LCBhcmcxLCB7IGh0bWw6IHBhdGNoKGh0bWwpIH0pIGFzIFRyYW5zZm9ybUNvbmZpZztcbiAgICAgICAgdHJhbnNmb3JtZXIgPSBjcmVhdGVDdXN0b20oY29uZmlnKSBhcyBNdXN0YWNoZVRyYW5zZm9ybWVyQ29udGV4dDtcbiAgICAgICAgdHJhbnNmb3JtZXIuZGVsaW1pdGVyID0gY29uZmlnLmRlbGltaXRlciE7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5vbi1udWxsLWFzc2VydGlvblxuICAgIH1cbiAgICByZXR1cm4geGZvcm0odHJhbnNmb3JtZXIpO1xufVxuXG5jb25zdCB0cmFuc2Zvcm1lcjoge1xuICAgIHZhcmlhYmxlOiBUcmFuc2Zvcm1FeGVjdXRvcjtcbiAgICB1bnNhZmVWYXJpYWJsZTogKHVuc2FmZUhUTUw6IFRyYW5zZm9ybURpcmVjdGl2ZSkgPT4gVHJhbnNmb3JtZUNvbnRleHQ7XG4gICAgc2VjdGlvbjogKCkgPT4gVHJhbnNmb3JtZUNvbnRleHQ7XG4gICAgaW52ZXJ0ZWRTZWN0aW9uOiAoKSA9PiBUcmFuc2Zvcm1lQ29udGV4dDtcbiAgICBjb21tZW50OiAoKSA9PiBUcmFuc2Zvcm1lQ29udGV4dDtcbiAgICBjdXN0b21EZWxpbWl0ZXI6ICgpID0+IFRyYW5zZm9ybWVDb250ZXh0O1xufSA9IHtcbiAgICB2YXJpYWJsZSxcbiAgICB1bnNhZmVWYXJpYWJsZSxcbiAgICBzZWN0aW9uLFxuICAgIGludmVydGVkU2VjdGlvbixcbiAgICBjb21tZW50LFxuICAgIGN1c3RvbURlbGltaXRlcixcbn07XG5cbmV4cG9ydCB7XG4gICAgVGVtcGxhdGVUYWcsXG4gICAgVHJhbnNmb3JtRGlyZWN0aXZlLFxuICAgIFRlbXBsYXRlVHJhbnNmb3JtZXIsXG4gICAgVHJhbnNmb3JtVGVzdGVyLFxuICAgIFRyYW5zZm9ybUV4ZWN1dG9yLFxuICAgIFRyYW5zZm9ybWVDb250ZXh0LFxuICAgIFRyYW5zZm9ybUNvbmZpZyxcbiAgICBjcmVhdGVNdXN0YWNoZVRyYW5zZm9ybWVyLFxuICAgIHRyYW5zZm9ybWVyLFxufTtcbiIsbnVsbCxudWxsLG51bGwsbnVsbCxudWxsLCJpbXBvcnQgdHlwZSB7XG4gICAgVGVtcGxhdGVCcmlkZ2VBcmcsXG4gICAgVGVtcGxhdGVUcmFuc2Zvcm1lcixcbn0gZnJvbSAnQGJyaWRnZS9pbnRlcmZhY2VzJztcbmltcG9ydCB7XG4gICAgVGVtcGxhdGVIYW5kbGVyLFxuICAgIFRlbXBsYXRlSGFuZGxlcnMsXG4gICAgVGVtcGxhdGVSZW5kZXJlcnMsXG4gICAgRXZhbHVhdGVUZW1wbGF0ZVJlc3VsdCxcbiAgICBwcmVwYXJlVGVtcGxhdGUsXG4gICAgZXZhbHVhdGVUZW1wbGF0ZSxcbn0gZnJvbSAnc3RhbXBpbm8nO1xuXG5leHBvcnQgaW50ZXJmYWNlIENyZWF0ZVN0YW1waW5vVGVtcGxhdGVPcHRpb25zIHtcbiAgICBoYW5kbGVycz86IFRlbXBsYXRlSGFuZGxlcnM7XG4gICAgcmVuZGVyZXJzPzogVGVtcGxhdGVSZW5kZXJlcnM7XG4gICAgc3VwZXJUZW1wbGF0ZT86IEhUTUxUZW1wbGF0ZUVsZW1lbnQgfCB1bmRlZmluZWQ7XG59XG5cbmZ1bmN0aW9uIGVuc3VyZSh0ZW1wbGF0ZTogSFRNTFRlbXBsYXRlRWxlbWVudCB8IHN0cmluZyk6IEhUTUxUZW1wbGF0ZUVsZW1lbnQge1xuICAgIGlmICh0ZW1wbGF0ZSBpbnN0YW5jZW9mIEhUTUxUZW1wbGF0ZUVsZW1lbnQpIHtcbiAgICAgICAgcmV0dXJuIHRlbXBsYXRlO1xuICAgIH0gZWxzZSBpZiAoJ3N0cmluZycgPT09IHR5cGVvZiB0ZW1wbGF0ZSkge1xuICAgICAgICBjb25zdCBlbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndGVtcGxhdGUnKTtcbiAgICAgICAgZWxlbWVudC5pbm5lckhUTUwgPSB0ZW1wbGF0ZTtcbiAgICAgICAgcmV0dXJuIGVsZW1lbnQ7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgVHlwZSBvZiB0ZW1wbGF0ZSBpcyBub3QgYSB2YWxpZC4gW3R5cGVvZjogJHt0eXBlb2YgdGVtcGxhdGV9XWApO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gY3JlYXRlU3RhbXBpbm9UcmFuc2Zvcm1lcihvcHRpb25zPzogQ3JlYXRlU3RhbXBpbm9UZW1wbGF0ZU9wdGlvbnMpOiBUZW1wbGF0ZVRyYW5zZm9ybWVyIHtcbiAgICBjb25zdCB7IGhhbmRsZXJzLCByZW5kZXJlcnMsIHN1cGVyVGVtcGxhdGUgfSA9IG9wdGlvbnMgfHwge307XG4gICAgcmV0dXJuICh0ZW1wbGF0ZTogSFRNTFRlbXBsYXRlRWxlbWVudCB8IHN0cmluZykgPT4ge1xuICAgICAgICByZXR1cm4gcHJlcGFyZVRlbXBsYXRlKGVuc3VyZSh0ZW1wbGF0ZSksIGhhbmRsZXJzLCByZW5kZXJlcnMsIHN1cGVyVGVtcGxhdGUpO1xuICAgIH07XG59XG5cbmV4cG9ydCB7XG4gICAgVGVtcGxhdGVCcmlkZ2VBcmcsXG4gICAgVGVtcGxhdGVIYW5kbGVyLFxuICAgIFRlbXBsYXRlSGFuZGxlcnMsXG4gICAgVGVtcGxhdGVSZW5kZXJlcnMsXG4gICAgRXZhbHVhdGVUZW1wbGF0ZVJlc3VsdCxcbiAgICBjcmVhdGVTdGFtcGlub1RyYW5zZm9ybWVyLFxuICAgIHByZXBhcmVUZW1wbGF0ZSxcbiAgICBldmFsdWF0ZVRlbXBsYXRlLFxufTtcbiJdLCJuYW1lcyI6WyJjcmVhdGVUcmFuc2Zvcm0iLCJ0cmFuc2Zvcm1WYXJpYWJsZSIsInVuc2FmZVZhcmlhYmxlVHJhbnNmb3JtZXIiLCJzZWN0aW9uVHJhbnNmb3JtZXIiLCJpbnZlcnRlZFNlY3Rpb25UcmFuc2Zvcm1lciIsImNvbW1lbnRUcmFuc2Zvcm1lciIsImN1c3RvbURlbGltaXRlclRyYW5zZm9ybWVyIl0sIm1hcHBpbmdzIjoiOzs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLHFCQUFlLE1BQU0sSUFBSSxXQUFXLElBQUksU0FBUyxDQUFDLFdBQVcsRUFBRSxNQUFNLEVBQUM7QUFDdEU7QUFDTyxTQUFTLFNBQVMsQ0FBQyxVQUFVLEVBQUUsTUFBTSxFQUFFO0FBQzlDLEVBQUUsTUFBTSxXQUFXLEdBQUcsR0FBRTtBQUN4QixFQUFFLE1BQU0sZUFBZSxHQUFHLEdBQUU7QUFDNUI7QUFDQSxFQUFFLElBQUksZ0JBQWdCLEdBQUcsV0FBVTtBQUNuQyxFQUFFLElBQUksY0FBYyxHQUFHLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBQztBQUN2RSxFQUFFLE9BQU8sY0FBYyxJQUFJLENBQUMsRUFBRTtBQUM5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O0FBQ1AsSUFBQSxJQUFJLEVBQUUsQ0FBQztBQUNQLElBQUEsR0FBRyxFQUFFLENBQUM7QUFDTixJQUFBLEdBQUcsRUFBRSxDQUFDO0FBQ04sSUFBQSxHQUFHLEVBQUUsQ0FBQzs7QUFHTixJQUFBLElBQUksRUFBRSxDQUFDO0FBQ1AsSUFBQSxJQUFJLEVBQUUsQ0FBQztBQUNQLElBQUEsS0FBSyxFQUFFLENBQUM7QUFDUixJQUFBLEtBQUssRUFBRSxDQUFDOztBQUdSLElBQUEsSUFBSSxFQUFFLEVBQUU7QUFDUixJQUFBLEdBQUcsRUFBRSxFQUFFO0FBQ1AsSUFBQSxJQUFJLEVBQUUsRUFBRTtBQUNSLElBQUEsR0FBRyxFQUFFLEVBQUU7O0FBR1AsSUFBQSxHQUFHLEVBQUUsRUFBRTtBQUNQLElBQUEsR0FBRyxFQUFFLEVBQUU7O0FBR1AsSUFBQSxHQUFHLEVBQUUsRUFBRTtBQUNQLElBQUEsR0FBRyxFQUFFLEVBQUU7QUFDUCxJQUFBLEdBQUcsRUFBRSxFQUFFOztBQUdQLElBQUEsR0FBRyxFQUFFLEVBQUU7QUFDUCxJQUFBLEdBQUcsRUFBRSxFQUFFO0FBQ1AsSUFBQSxHQUFHLEVBQUUsRUFBRTtJQUNQLEdBQUcsRUFBRSxFQUFFO0NBQ1IsQ0FBQztBQUVLLE1BQU0sa0JBQWtCLEdBQUcsRUFBRTs7QUMzRXBDOzs7QUFHRztBQUlILE1BQU0sYUFBYSxHQUFHLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO0FBQ3ZFLE1BQU0sZUFBZSxHQUFHLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDO0FBUXZDLElBQVksSUFXWCxDQUFBO0FBWEQsQ0FBQSxVQUFZLElBQUksRUFBQTtBQUNkLElBQUEsSUFBQSxDQUFBLElBQUEsQ0FBQSxRQUFBLENBQUEsR0FBQSxDQUFBLENBQUEsR0FBQSxRQUFVLENBQUE7QUFDVixJQUFBLElBQUEsQ0FBQSxJQUFBLENBQUEsWUFBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBLEdBQUEsWUFBYyxDQUFBO0FBQ2QsSUFBQSxJQUFBLENBQUEsSUFBQSxDQUFBLEtBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQSxHQUFBLEtBQU8sQ0FBQTtBQUNQLElBQUEsSUFBQSxDQUFBLElBQUEsQ0FBQSxPQUFBLENBQUEsR0FBQSxDQUFBLENBQUEsR0FBQSxPQUFTLENBQUE7QUFDVCxJQUFBLElBQUEsQ0FBQSxJQUFBLENBQUEsT0FBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBLEdBQUEsT0FBUyxDQUFBO0FBQ1QsSUFBQSxJQUFBLENBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQSxHQUFBLFNBQVcsQ0FBQTtBQUNYLElBQUEsSUFBQSxDQUFBLElBQUEsQ0FBQSxTQUFBLENBQUEsR0FBQSxDQUFBLENBQUEsR0FBQSxTQUFXLENBQUE7QUFDWCxJQUFBLElBQUEsQ0FBQSxJQUFBLENBQUEsVUFBQSxDQUFBLEdBQUEsQ0FBQSxDQUFBLEdBQUEsVUFBWSxDQUFBO0FBQ1osSUFBQSxJQUFBLENBQUEsSUFBQSxDQUFBLFNBQUEsQ0FBQSxHQUFBLENBQUEsQ0FBQSxHQUFBLFNBQVcsQ0FBQTtBQUNYLElBQUEsSUFBQSxDQUFBLElBQUEsQ0FBQSxTQUFBLENBQUEsR0FBQSxFQUFBLENBQUEsR0FBQSxTQUFZLENBQUE7QUFDZCxDQUFDLEVBWFcsSUFBSSxLQUFKLElBQUksR0FXZixFQUFBLENBQUEsQ0FBQSxDQUFBO0FBRU0sTUFBTSxLQUFLLEdBQUcsQ0FBQyxJQUFVLEVBQUUsS0FBYSxFQUFFLFVBQXFCLEdBQUEsQ0FBQyxNQUFNO0lBQzNFLElBQUk7SUFDSixLQUFLO0lBQ0wsVUFBVTtBQUNYLENBQUEsQ0FBQyxDQUFDO0FBRUgsTUFBTSxhQUFhLEdBQUcsQ0FBQyxFQUFVLEtBQy9CLEVBQUUsS0FBSyxDQUFDO0lBQ1IsRUFBRSxLQUFLLEVBQUU7SUFDVCxFQUFFLEtBQUssRUFBRTtBQUNULElBQUEsRUFBRSxLQUFLLEVBQUUsQ0FBQztBQUVaO0FBQ0EsTUFBTSxzQkFBc0IsR0FBRyxDQUFDLEVBQVUsS0FDeEMsRUFBRSxLQUFLLEVBQUU7SUFDVCxFQUFFLEtBQUssRUFBRTs7OztBQUlULEtBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxFQUFFLEdBQUcsRUFBRSxZQUFZLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7QUFFOUM7QUFDQSxNQUFNLGFBQWEsR0FBRyxDQUFDLEVBQVUsS0FDL0Isc0JBQXNCLENBQUMsRUFBRSxDQUFDLElBQUksU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBRTlDLE1BQU0sVUFBVSxHQUFHLENBQUMsR0FBVyxLQUFLLFFBQVEsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7QUFFakUsTUFBTSxRQUFRLEdBQUcsQ0FBQyxFQUFVLEtBQUssRUFBRSxLQUFLLEVBQUUsWUFBWSxFQUFFLEtBQUssRUFBRSxDQUFDO0FBRWhFLE1BQU0sU0FBUyxHQUFHLENBQUMsRUFBVSxLQUFLLEVBQUUsWUFBWSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsQ0FBQztBQUUvRCxNQUFNLFdBQVcsR0FBRyxDQUFDLEVBQVUsS0FDN0IsRUFBRSxLQUFLLEVBQUU7SUFDVCxFQUFFLEtBQUssRUFBRTtJQUNULEVBQUUsS0FBSyxFQUFFO0lBQ1QsRUFBRSxLQUFLLEVBQUU7SUFDVCxFQUFFLEtBQUssRUFBRTtJQUNULEVBQUUsS0FBSyxFQUFFO0lBQ1QsRUFBRSxLQUFLLEVBQUU7SUFDVCxFQUFFLEtBQUssRUFBRTtJQUNULEVBQUUsS0FBSyxFQUFFO0lBQ1QsRUFBRSxLQUFLLEVBQUU7SUFDVCxFQUFFLEtBQUssRUFBRTtJQUNULEVBQUUsS0FBSyxFQUFFO0FBQ1QsSUFBQSxFQUFFLEtBQUssR0FBRyxDQUFDO0FBRWIsTUFBTSxVQUFVLEdBQUcsQ0FBQyxFQUFVLEtBQzVCLEVBQUUsS0FBSyxFQUFFO0lBQ1QsRUFBRSxLQUFLLEVBQUU7SUFDVCxFQUFFLEtBQUssRUFBRTtJQUNULEVBQUUsS0FBSyxFQUFFO0lBQ1QsRUFBRSxL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O0FBS0YsZ0JBQUEsTUFBTSxDQUFDLFdBQVcsR0FBRyxXQUFXLENBQUM7QUFDbEMsYUFBQTtBQUNGLFNBQUE7QUFDRixLQUFBO0FBQ0QsSUFBQSxLQUFLLE1BQU0sQ0FBQyxJQUFJLGdCQUFnQixFQUFFO1FBQ2hDLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQztBQUNaLEtBQUE7QUFDRCxJQUFBLE9BQU8sV0FBVyxDQUFDO0FBQ3JCLENBQUM7O0FDamNELFNBQVMsTUFBTSxDQUFDLFFBQXNDLEVBQUE7SUFDbEQsSUFBSSxRQUFRLFlBQVksbUJBQW1CLEVBQUU7QUFDekMsUUFBQSxPQUFPLFFBQVEsQ0FBQztBQUNuQixLQUFBO0FBQU0sU0FBQSxJQUFJLFFBQVEsS0FBSyxPQUFPLFFBQVEsRUFBRTtRQUNyQyxNQUFNLE9BQU8sR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ25ELFFBQUEsT0FBTyxDQUFDLFNBQVMsR0FBRyxRQUFRLENBQUM7QUFDN0IsUUFBQSxPQUFPLE9BQU8sQ0FBQztBQUNsQixLQUFBO0FBQU0sU0FBQTtRQUNILE1BQU0sSUFBSSxTQUFTLENBQUMsQ0FBQSwwQ0FBQSxFQUE2QyxPQUFPLFFBQVEsQ0FBQSxDQUFBLENBQUcsQ0FBQyxDQUFDO0FBQ3hGLEtBQUE7QUFDTCxDQUFDO0FBRUQsU0FBUyx5QkFBeUIsQ0FBQyxPQUF1QyxFQUFBO0lBQ3RFLE1BQU0sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLGFBQWEsRUFBRSxHQUFHLE9BQU8sSUFBSSxFQUFFLENBQUM7SUFDN0QsT0FBTyxDQUFDLFFBQXNDLEtBQUk7QUFDOUMsUUFBQSxPQUFPLGVBQWUsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxhQUFhLENBQUMsQ0FBQztBQUNqRixLQUFDLENBQUM7QUFDTjs7OzsiLCJ4X2dvb2dsZV9pZ25vcmVMaXN0IjpbMCwxLDIsMyw0LDUsNiw3LDgsOSwxMCwxMiwxMywxNCwxNSwxNl0sInNvdXJjZVJvb3QiOiJjZHA6Ly8vQGNkcC9leHRlbnNpb24tdGVtcGxhdGUtYnJpZGdlLyJ9