/*!
 * @cdp/extension-template-bridge 0.9.19
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uLXRlbXBsYXRlLWJyaWRnZS5tanMiLCJzb3VyY2VzIjpbImxpdC10cmFuc2Zvcm1lci9zcmMvbGl0LXRyYW5zZm9ybWVyLmpzIiwibGl0LXRyYW5zZm9ybWVyL3NyYy9oZWxwZXIvZGF0YUhlbHBlci5qcyIsImxpdC10cmFuc2Zvcm1lci9zcmMvdHJhbnNmb3JtZXJzL3ZhcmlhYmxlVHJhbnNmb3JtZXIuanMiLCJsaXQtdHJhbnNmb3JtZXIvc3JjL3RyYW5zZm9ybWVycy91bnNhZmVWYXJpYWJsZS5qcyIsImxpdC10cmFuc2Zvcm1lci9zcmMvaGVscGVyL2lzTXVzdGFjaGVGYWxzeS5qcyIsImxpdC10cmFuc2Zvcm1lci9zcmMvaGVscGVyL3NlY3Rpb25IZWxwZXIuanMiLCJsaXQtdHJhbnNmb3JtZXIvc3JjL3RyYW5zZm9ybWVycy9zZWN0aW9uLmpzIiwibGl0LXRyYW5zZm9ybWVyL3NyYy90cmFuc2Zvcm1lcnMvaW52ZXJ0ZWRTZWN0aW9uLmpzIiwibGl0LXRyYW5zZm9ybWVyL3NyYy90cmFuc2Zvcm1lcnMvY29tbWVudC5qcyIsImxpdC10cmFuc2Zvcm1lci9zcmMvdHJhbnNmb3JtZXJzL2N1c3RvbURlbGltaXRlci5qcyIsImxpdC10cmFuc2Zvcm1lci9zcmMvbGl0LXRyYW5zZm9ybWVyLWNvbmZpZ3VyZWRPdXRPZlRoZUJveC5qcyIsImJyaWRnZS1tdXN0YWNoZS50cyIsImpleHByL3NyYy9saWIvY29uc3RhbnRzLnRzIiwiamV4cHIvc3JjL2xpYi90b2tlbml6ZXIudHMiLCJqZXhwci9zcmMvbGliL3BhcnNlci50cyIsImpleHByL3NyYy9saWIvZXZhbC50cyIsInN0YW1waW5vL3NyYy9zdGFtcGluby50cyIsImJyaWRnZS1zdGFtcGluby50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKiogXHJcbiAqIEBwYXJhbSB7b2JqZWN0fSBjb25maWcgPSB7XHJcbiAqICBodG1sOiBsaXQtaHRtbC5odG1sLFxyXG4gKiAgZGVsaW1pdGVyOiB7IHN0YXJ0OiAne3snLCBlbmQ6ICd9fScgfSxcclxuICogIHRyYW5zZm9ybWVyczogeyAvLyBub3RlIHRoYXQgdHJhbnNmb3JtVmFyaWFibGUgaXMgbm90IGhlcmUuIEl0IGdldHMgYXBwbGllZCB3aGVuIG5vIHRyYW5zZm9ybWVyLnRlc3QgaGFzIHBhc3NlZFxyXG4gKiAgICBuYW1lOiB7XHJcbiAqICAgICAgdGVzdDogKHN0ciwgY29uZmlnKSA9PiBib29sLFxyXG4gKiAgICAgIHRyYW5zZm9ybTogKHN0ciwgY29uZmlnKSA9PiAoe1xyXG4gKiAgICAgICAgcmVtYWluaW5nVG1wbFN0cjogc3RyLFxyXG4gKiAgICAgICAgaW5zZXJ0aW9uUG9pbnQ6IGN0eCA9PiBsaXQtaHRtbC5UZW1wbGF0ZVJlc3VsdCB8IHVuZGVmaW5lZCwgLy8gaWYgdW5kZWZpbmVkIHJlbWFpbmluZ1RtcGxTdHIgd2lsbCBiZSBtZXJnZWQgd2l0aCBsYXN0IHN0YXRpYyBwYXJ0IFxyXG4gKiAgICAgIH0pLFxyXG4gKiAgICB9LFxyXG4gKiAgfSxcclxuICogIHRyYW5zZm9ybVZhcmlhYmxlLCBcclxuICogfVxyXG4gKiBAcmV0dXJucyB7ZnVuY3Rpb259IHN0clRlbXBsYXRlID0+IGN0eCA9PiBsaXQtaHRtbC5UZW1wbGF0ZVJlc3VsdFxyXG4gKi9cclxuZXhwb3J0IGRlZmF1bHQgY29uZmlnID0+IHN0clRlbXBsYXRlID0+IHRyYW5zZm9ybShzdHJUZW1wbGF0ZSwgY29uZmlnKVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHRyYW5zZm9ybSh0bXBsMlBhcnNlLCBjb25maWcpIHtcclxuICBjb25zdCBzdGF0aWNQYXJ0cyA9IFtdXHJcbiAgY29uc3QgaW5zZXJ0aW9uUG9pbnRzID0gW11cclxuXHJcbiAgbGV0IHJlbWFpbmluZ1RtcGxTdHIgPSB0bXBsMlBhcnNlXHJcbiAgbGV0IHN0YXJ0SW5kZXhPZklQID0gcmVtYWluaW5nVG1wbFN0ci5pbmRleE9mKGNvbmZpZy5kZWxpbWl0ZXIuc3RhcnQpXHJcbiAgd2hpbGUgKHN0YXJ0SW5kZXhPZklQID49IDApIHtcclxuICAgIGlmIChyZW1haW5pbmdUbXBsU3RyLmluZGV4T2YoY29uZmlnLmRlbGltaXRlci5lbmQsIHN0YXJ0SW5kZXhPZklQKSA8IDApXHJcbiAgICAgIHRocm93IG5ldyBFcnJvcihgbWlzc2luZyBlbmQgZGVsaW1pdGVyIGF0OiAnJHtyZW1haW5pbmdUbXBsU3RyfSdgKVxyXG5cclxuICAgIHN0YXRpY1BhcnRzLnB1c2gocmVtYWluaW5nVG1wbFN0ci5zdWJzdHJpbmcoMCwgc3RhcnRJbmRleE9mSVApKVxyXG5cclxuICAgIGNvbnN0IGlQVHJhbnNmb3JtUmVzdWx0ID0gdHJhbnNmb3JtSVAoXHJcbiAgICAgIHJlbWFpbmluZ1RtcGxTdHIuc3Vic3RyaW5nKHN0YXJ0SW5kZXhPZklQICsgY29uZmlnLmRlbGltaXRlci5zdGFydC5sZW5ndGgpLFxyXG4gICAgICBjb25maWdcclxuICAgIClcclxuXHJcbiAgICBpZiAoaVBUcmFuc2Zvcm1SZXN1bHQuaW5zZXJ0aW9uUG9pbnQpIHtcclxuICAgICAgcmVtYWluaW5nVG1wbFN0ciA9IGlQVHJhbnNmb3JtUmVzdWx0LnJlbWFpbmluZ1RtcGxTdHJcclxuICAgICAgaW5zZXJ0aW9uUG9pbnRzLnB1c2goaVBUcmFuc2Zvcm1SZXN1bHQuaW5zZXJ0aW9uUG9pbnQpXHJcbiAgICAgIHN0YXJ0SW5kZXhPZklQID0gcmVtYWluaW5nVG1wbFN0ci5pbmRleE9mKGNvbmZpZy5kZWxpbWl0ZXIuc3RhcnQpXHJcbiAgICB9IGVsc2UgeyAvLyBlLmcuIGNvbW1lbnQgb3IgY3VzdG9tRGVsaW1ldGVyXHJcbiAgICAgIGNvbnN0IGxhc3RTdGF0aWNQYXJ0ID0gc3RhdGljUGFydHMucG9wKClcclxuICAgICAgcmVtYWluaW5nVG1wbFN0ciA9IGxhc3RTdGF0aWNQYXJ0ICsgaVBUcmFuc2Zvcm1SZXN1bHQucmVtYWluaW5nVG1wbFN0clxyXG4gICAgICBzdGFydEluZGV4T2ZJUCA9IHJlbWFpbmluZ1RtcGxTdHIuaW5kZXhPZihjb25maWcuZGVsaW1pdGVyLnN0YXJ0LCBsYXN0U3RhdGljUGFydC5sZW5ndGgpXHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBzdGF0aWNQYXJ0cy5wdXNoKHJlbWFpbmluZ1RtcGxTdHIpXHJcblxyXG4gIHJldHVybiBjdHggPT5cclxuICAgIGNvbmZpZy5odG1sKHN0YXRpY1BhcnRzLCAuLi5pbnNlcnRpb25Qb2ludHMubWFwKGlQID0+IGlQKGN0eCkpKVxyXG59XHJcblxyXG5mdW5jdGlvbiB0cmFuc2Zvcm1JUChyZW1haW5pbmdUbXBsU3RyLCBjb25maWcpIHtcclxuICBjb25zdCB0cmFuc2Zvcm1lciA9IE9iamVjdC52YWx1ZXMoY29uZmlnLnRyYW5zZm9ybWVycykuZmluZCh0ID0+IHQudGVzdChyZW1haW5pbmdUbXBsU3RyLCBjb25maWcpKVxyXG4gIGNvbnN0IHRyYW5zZm9ybUZ1bmN0aW9uID0gdHJhbnNmb3JtZXJcclxuICAgID8gdHJhbnNmb3JtZXIudHJhbnNmb3JtXHJcbiAgICA6IGNvbmZpZy50cmFuc2Zvcm1WYXJpYWJsZVxyXG4gIHJldHVybiB0cmFuc2Zvcm1GdW5jdGlvbihyZW1haW5pbmdUbXBsU3RyLCBjb25maWcpXHJcbn0iLCJleHBvcnQgZnVuY3Rpb24gY3R4MlZhbHVlKGN0eCwga2V5KSB7XHJcbiAgaWYgKGtleSA9PT0gJy4nKVxyXG4gICAgcmV0dXJuIGN0eFxyXG5cclxuICBsZXQgcmVzdWx0ID0gY3R4XHJcbiAgZm9yIChsZXQgayBvZiBrZXkuc3BsaXQoJy4nKSkge1xyXG4gICAgaWYgKCFyZXN1bHQuaGFzT3duUHJvcGVydHkoaykpXHJcbiAgICAgIHJldHVybiAnJ1xyXG5cclxuICAgIHJlc3VsdCA9IHJlc3VsdFtrXVxyXG4gIH1cclxuXHJcbiAgcmV0dXJuIHJlc3VsdFxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY3R4Mk11c3RhY2hlU3RyaW5nKGN0eCwga2V5KSB7XHJcbiAgcmV0dXJuIG11c3RhY2hlU3RyaW5neWZ5KGN0eDJWYWx1ZShjdHgsIGtleSkpXHJcbn1cclxuXHJcbmZ1bmN0aW9uIG11c3RhY2hlU3RyaW5neWZ5KHZhbHVlKSB7XHJcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09IG51bGwpXHJcbiAgICByZXR1cm4gJydcclxuXHJcbiAgcmV0dXJuICcnICsgdmFsdWVcclxufSIsImltcG9ydCB7IGN0eDJNdXN0YWNoZVN0cmluZyB9IGZyb20gJy4uL2hlbHBlci9kYXRhSGVscGVyLmpzJ1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgKHJlbWFpbmluZ1RtcGxTdHIsIHsgZGVsaW1pdGVyIH0pID0+IHtcclxuICBjb25zdCBpbmRleE9mRW5kRGVsaW1pdGVyID0gcmVtYWluaW5nVG1wbFN0ci5pbmRleE9mKGRlbGltaXRlci5lbmQpXHJcbiAgY29uc3QgZGF0YUtleSA9IHJlbWFpbmluZ1RtcGxTdHIuc3Vic3RyaW5nKDAsIGluZGV4T2ZFbmREZWxpbWl0ZXIpXHJcbiAgcmV0dXJuIHtcclxuICAgIHJlbWFpbmluZ1RtcGxTdHI6IHJlbWFpbmluZ1RtcGxTdHIuc3Vic3RyaW5nKGluZGV4T2ZFbmREZWxpbWl0ZXIgKyBkZWxpbWl0ZXIuZW5kLmxlbmd0aCksXHJcbiAgICBpbnNlcnRpb25Qb2ludDogY3R4ID0+IGN0eDJNdXN0YWNoZVN0cmluZyhjdHgsIGRhdGFLZXkpXHJcbiAgfVxyXG59IiwiaW1wb3J0IHsgY3R4Mk11c3RhY2hlU3RyaW5nIH0gZnJvbSAnLi4vaGVscGVyL2RhdGFIZWxwZXIuanMnXHJcblxyXG4vKiogTm90ZSwgdGhpcyBpcyB1bnNhZmUgdG8gdXNlLCBiZWNhdXNlIHRoZSByZW5kZXJlZCBvdXRwdXQgY291bGQgYmUgYW55IEphdmFTY3JpcHQhICovXHJcbmV4cG9ydCBkZWZhdWx0IHVuc2FmZUhUTUwgPT4gKHtcclxuICB0ZXN0OiByZW1haW5pbmdUbXBsU3RyID0+IHJlbWFpbmluZ1RtcGxTdHJbMF0gPT09ICd7JyxcclxuICB0cmFuc2Zvcm06IChyZW1haW5pbmdUbXBsU3RyLCB7IGRlbGltaXRlciB9KSA9PiB7XHJcbiAgICBjb25zdCBpbmRleE9mRW5kRGVsaW1pdGVyID0gcmVtYWluaW5nVG1wbFN0ci5pbmRleE9mKCd9JyArIGRlbGltaXRlci5lbmQpXHJcbiAgICBpZiAoaW5kZXhPZkVuZERlbGltaXRlciA8IDApXHJcbiAgICAgIHRocm93IG5ldyBFcnJvcihgbWlzc2luZyBlbmQgZGVsaW1pdGVyIGF0OiAnJHtkZWxpbWl0ZXIuc3RhcnR9JHtyZW1haW5pbmdUbXBsU3RyfSdgKVxyXG4gIFxyXG4gICAgY29uc3QgZGF0YUtleSA9IHJlbWFpbmluZ1RtcGxTdHIuc3Vic3RyaW5nKDEsIGluZGV4T2ZFbmREZWxpbWl0ZXIpXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICByZW1haW5pbmdUbXBsU3RyOiByZW1haW5pbmdUbXBsU3RyLnN1YnN0cmluZyhpbmRleE9mRW5kRGVsaW1pdGVyICsgMSArIGRlbGltaXRlci5lbmQubGVuZ3RoKSxcclxuICAgICAgaW5zZXJ0aW9uUG9pbnQ6IGN0eCA9PiB1bnNhZmVIVE1MKGN0eDJNdXN0YWNoZVN0cmluZyhjdHgsIGRhdGFLZXkpKSxcclxuICAgIH1cclxuICB9XHJcbn0pIiwiZXhwb3J0IGZ1bmN0aW9uIGlzTXVzdGFjaGVGYWxzeSh2YWx1ZSkge1xyXG4gIHJldHVybiBbbnVsbCwgdW5kZWZpbmVkLCBmYWxzZSwgMCwgTmFOLCAnJ11cclxuICAgIC5zb21lKGZhbHN5ID0+IGZhbHN5ID09PSB2YWx1ZSlcclxuICAgIHx8ICh2YWx1ZS5sZW5ndGggJiYgdmFsdWUubGVuZ3RoID09PSAwKVxyXG59IiwiZXhwb3J0IGZ1bmN0aW9uIHBhcnNlU2VjdGlvbih0bXBsU3RyLCBkZWxpbWl0ZXIpIHtcclxuICBjb25zdCBpbmRleE9mU3RhcnRUYWdFbmQgPSB0bXBsU3RyLmluZGV4T2YoZGVsaW1pdGVyLmVuZClcclxuICBjb25zdCBkYXRhS2V5ID0gdG1wbFN0ci5zdWJzdHJpbmcoMSwgaW5kZXhPZlN0YXJ0VGFnRW5kKVxyXG4gIGNvbnN0IGVuZFRhZyA9IGAke2RlbGltaXRlci5zdGFydH0vJHtkYXRhS2V5fSR7ZGVsaW1pdGVyLmVuZH1gXHJcbiAgY29uc3QgaW5kZXhPZkVuZFRhZ1N0YXJ0ID0gdG1wbFN0ci5pbmRleE9mKGVuZFRhZylcclxuICBpZiAoaW5kZXhPZkVuZFRhZ1N0YXJ0IDwgMClcclxuICAgIHRocm93IG5ldyBFcnJvcihgbWlzc2luZyBlbmQgZGVsaW1pdGVyIGF0OiAnJHtkZWxpbWl0ZXIuc3RhcnR9JHt0bXBsU3RyfSdgKVxyXG4gIFxyXG4gIHJldHVybiB7XHJcbiAgICBkYXRhS2V5LFxyXG4gICAgaW5uZXJUbXBsOiB0bXBsU3RyLnN1YnN0cmluZyhpbmRleE9mU3RhcnRUYWdFbmQgKyBkZWxpbWl0ZXIuc3RhcnQubGVuZ3RoLCBpbmRleE9mRW5kVGFnU3RhcnQpLFxyXG4gICAgcmVtYWluaW5nVG1wbFN0cjogdG1wbFN0ci5zdWJzdHJpbmcoaW5kZXhPZkVuZFRhZ1N0YXJ0ICsgZW5kVGFnLmxlbmd0aCksXHJcbiAgfVxyXG59IiwiaW1wb3J0IHsgdHJhbnNmb3JtIH0gZnJvbSAnLi4vbGl0LXRyYW5zZm9ybWVyLmpzJ1xyXG5pbXBvcnQgeyBjdHgyVmFsdWUgfSBmcm9tICcuLi9oZWxwZXIvZGF0YUhlbHBlci5qcydcclxuaW1wb3J0IHsgaXNNdXN0YWNoZUZhbHN5IH0gZnJvbSAnLi4vaGVscGVyL2lzTXVzdGFjaGVGYWxzeS5qcydcclxuaW1wb3J0IHsgcGFyc2VTZWN0aW9uIH0gZnJvbSAnLi4vaGVscGVyL3NlY3Rpb25IZWxwZXIuanMnXHJcblxyXG4vKiogTm90ZSwgdW5saWtlIHdpdGhpbiBtdXN0YWNoZSBmdW5jdGlvbnMgYXMgZGF0YSB2YWx1ZXMgYXJlIG5vdCBzdXBwb3J0ZWQgb3V0IG9mIHRoZSBib3ggKi9cclxuZXhwb3J0IGRlZmF1bHQgKCkgPT4gKHtcclxuICB0ZXN0OiByZW1haW5pbmdUbXBsU3RyID0+IHJlbWFpbmluZ1RtcGxTdHJbMF0gPT09ICcjJyxcclxuICB0cmFuc2Zvcm06IChyZW1haW5pbmdUbXBsU3RyLCBjb25maWcpID0+IHtcclxuICAgIGNvbnN0IHBhcnNlZFNlY3Rpb24gPSBwYXJzZVNlY3Rpb24ocmVtYWluaW5nVG1wbFN0ciwgY29uZmlnLmRlbGltaXRlcilcclxuICAgIGNvbnN0IHRyYW5zZm9ybWVkSW5uZXJUbXBsID0gdHJhbnNmb3JtKHBhcnNlZFNlY3Rpb24uaW5uZXJUbXBsLCBjb25maWcpXHJcbiAgICBcclxuICAgIHJldHVybiB7XHJcbiAgICAgIHJlbWFpbmluZ1RtcGxTdHI6IHBhcnNlZFNlY3Rpb24ucmVtYWluaW5nVG1wbFN0cixcclxuICAgICAgaW5zZXJ0aW9uUG9pbnQ6IGN0eCA9PiB7XHJcbiAgICAgICAgY29uc3Qgc2VjdGlvbkRhdGEgPSBjdHgyVmFsdWUoY3R4LCBwYXJzZWRTZWN0aW9uLmRhdGFLZXkpXHJcbiAgICAgICAgXHJcbiAgICAgICAgaWYgKGlzTXVzdGFjaGVGYWxzeShzZWN0aW9uRGF0YSkpXHJcbiAgICAgICAgICByZXR1cm4gJyc7XHJcblxyXG4gICAgICAgIHJldHVybiBzZWN0aW9uRGF0YS5tYXBcclxuICAgICAgICAgID8gc2VjdGlvbkRhdGEubWFwKGlubmVyQ3R4ID0+IHRyYW5zZm9ybWVkSW5uZXJUbXBsKGlubmVyQ3R4KSlcclxuICAgICAgICAgIDogdHJhbnNmb3JtZWRJbm5lclRtcGwoY3R4KVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG59KSIsImltcG9ydCB7IHRyYW5zZm9ybSB9IGZyb20gJy4uL2xpdC10cmFuc2Zvcm1lci5qcydcbmltcG9ydCB7IGN0eDJWYWx1ZSB9IGZyb20gJy4uL2hlbHBlci9kYXRhSGVscGVyLmpzJ1xuaW1wb3J0IHsgaXNNdXN0YWNoZUZhbHN5IH0gZnJvbSAnLi4vaGVscGVyL2lzTXVzdGFjaGVGYWxzeS5qcydcbmltcG9ydCB7IHBhcnNlU2VjdGlvbiB9IGZyb20gJy4uL2hlbHBlci9zZWN0aW9uSGVscGVyLmpzJ1xuXG5leHBvcnQgZGVmYXVsdCAoKSA9PiAoe1xuICB0ZXN0OiByZW1haW5pbmdUbXBsU3RyID0+IHJlbWFpbmluZ1RtcGxTdHJbMF0gPT09ICdeJyxcbiAgLypcbiAgICogcGF0Y2ggZm9yIHYuMS4wLjJcbiAgICogYXBwbHkgdHJhbnNmb3JtZWRJbm5lclRtcGwoKVxuICAgKi9cbiAgdHJhbnNmb3JtOiAocmVtYWluaW5nVG1wbFN0ciwgY29uZmlnKSA9PiB7XG4gICAgY29uc3QgcGFyc2VkU2VjdGlvbiA9IHBhcnNlU2VjdGlvbihyZW1haW5pbmdUbXBsU3RyLCBjb25maWcuZGVsaW1pdGVyKVxuICAgIGNvbnN0IHRyYW5zZm9ybWVkSW5uZXJUbXBsID0gdHJhbnNmb3JtKHBhcnNlZFNlY3Rpb24uaW5uZXJUbXBsLCBjb25maWcpXG4gICAgXG4gICAgcmV0dXJuIHtcbiAgICAgIHJlbWFpbmluZ1RtcGxTdHI6IHBhcnNlZFNlY3Rpb24ucmVtYWluaW5nVG1wbFN0cixcbiAgICAgIGluc2VydGlvblBvaW50OiBjdHggPT4ge1xuICAgICAgICBjb25zdCBzZWN0aW9uRGF0YSA9IGN0eDJWYWx1ZShjdHgsIHBhcnNlZFNlY3Rpb24uZGF0YUtleSlcbiAgICAgICAgXG4gICAgICAgIGlmIChpc011c3RhY2hlRmFsc3koc2VjdGlvbkRhdGEpKVxuICAgICAgICAgIHJldHVybiBzZWN0aW9uRGF0YS5tYXBcbiAgICAgICAgICAgID8gc2VjdGlvbkRhdGEubWFwKGlubmVyQ3R4ID0+IHRyYW5zZm9ybWVkSW5uZXJUbXBsKGlubmVyQ3R4KSlcbiAgICAgICAgICAgIDogdHJhbnNmb3JtZWRJbm5lclRtcGwoY3R4KVxuICAgICAgICByZXR1cm4gJyc7XG4gICAgICB9XG4gICAgfVxuICB9XG59KVxuIiwiZXhwb3J0IGRlZmF1bHQgKCkgPT4gKHtcclxuICB0ZXN0OiByZW1haW5pbmdUbXBsU3RyID0+IHJlbWFpbmluZ1RtcGxTdHJbMF0gPT09ICchJyxcclxuICB0cmFuc2Zvcm06IChyZW1haW5pbmdUbXBsU3RyLCB7IGRlbGltaXRlciB9KSA9PiAoe1xyXG4gICAgcmVtYWluaW5nVG1wbFN0cjogcmVtYWluaW5nVG1wbFN0ci5zdWJzdHJpbmcocmVtYWluaW5nVG1wbFN0ci5pbmRleE9mKGRlbGltaXRlci5lbmQpICsgZGVsaW1pdGVyLmVuZC5sZW5ndGgpLFxyXG4gICAgaW5zZXJ0aW9uUG9pbnQ6IHVuZGVmaW5lZCxcclxuICB9KVxyXG59KSIsImV4cG9ydCBkZWZhdWx0ICgpID0+ICh7XHJcbiAgdGVzdDogcmVtYWluaW5nVG1wbFN0ciA9PiByZW1haW5pbmdUbXBsU3RyWzBdID09PSAnPScsXHJcbiAgdHJhbnNmb3JtOiAocmVtYWluaW5nVG1wbFN0ciwgY29uZmlnKSA9PiB7XHJcbiAgICBjb25zdCBvcmlnaW5hbEVuZERlbGlMZW5ndGggPSBjb25maWcuZGVsaW1pdGVyLmVuZC5sZW5ndGhcclxuICAgIGNvbnN0IGluZGV4T2ZFbmRUYWcgPSByZW1haW5pbmdUbXBsU3RyLmluZGV4T2YoJz0nICsgY29uZmlnLmRlbGltaXRlci5lbmQpXHJcbiAgICBpZiAoaW5kZXhPZkVuZFRhZyA8IDAgKVxyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYG1pc3NpbmcgZW5kIGRlbGltaXRlciBhdDogJyR7cmVtYWluaW5nVG1wbFN0cn0nYClcclxuXHJcbiAgICBjb25zdCBbIG5ld1N0YXJ0RGVsaSwgbmV3RW5kRGVsaSBdID0gcmVtYWluaW5nVG1wbFN0ci5zdWJzdHJpbmcoMSwgaW5kZXhPZkVuZFRhZykuc3BsaXQoJyAnKVxyXG5cclxuICAgIGNvbmZpZy5kZWxpbWl0ZXIuc3RhcnQgPSBuZXdTdGFydERlbGlcclxuICAgIGNvbmZpZy5kZWxpbWl0ZXIuZW5kID0gbmV3RW5kRGVsaVxyXG4gICAgXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICByZW1haW5pbmdUbXBsU3RyOiByZW1haW5pbmdUbXBsU3RyLnN1YnN0cmluZyhpbmRleE9mRW5kVGFnICsgMSArIG9yaWdpbmFsRW5kRGVsaUxlbmd0aCksXHJcbiAgICAgIGluc2VydGlvblBvaW50OiB1bmRlZmluZWQsICBcclxuICAgIH1cclxuICB9XHJcbn0pIiwiaW1wb3J0IGNyZWF0ZVRyYW5zZm9ybSBmcm9tICcuL2xpdC10cmFuc2Zvcm1lci5qcydcclxuaW1wb3J0IHRyYW5zZm9ybVZhcmlhYmxlIGZyb20gJy4vdHJhbnNmb3JtZXJzL3ZhcmlhYmxlVHJhbnNmb3JtZXIuanMnXHJcbmltcG9ydCB1bnNhZmVWYXJpYWJsZVRyYW5zZm9ybWVyIGZyb20gJy4vdHJhbnNmb3JtZXJzL3Vuc2FmZVZhcmlhYmxlLmpzJ1xyXG5pbXBvcnQgc2VjdGlvblRyYW5zZm9ybWVyIGZyb20gJy4vdHJhbnNmb3JtZXJzL3NlY3Rpb24uanMnXHJcbmltcG9ydCBpbnZlcnRlZFNlY3Rpb25UcmFuc2Zvcm1lciBmcm9tICcuL3RyYW5zZm9ybWVycy9pbnZlcnRlZFNlY3Rpb24uanMnXHJcbmltcG9ydCBjb21tZW50VHJhbnNmb3JtZXIgZnJvbSAnLi90cmFuc2Zvcm1lcnMvY29tbWVudC5qcydcclxuaW1wb3J0IGN1c3RvbURlbGltaXRlclRyYW5zZm9ybWVyIGZyb20gJy4vdHJhbnNmb3JtZXJzL2N1c3RvbURlbGltaXRlci5qcydcclxuXHJcbmV4cG9ydCBkZWZhdWx0IChodG1sLCB1bnNhZmVIVE1MKSA9PlxyXG4gIGNyZWF0ZVRyYW5zZm9ybSh7XHJcbiAgICBodG1sLFxyXG4gICAgZGVsaW1pdGVyOiB7IHN0YXJ0OiAne3snLCBlbmQ6ICd9fScgfSxcclxuICAgIHRyYW5zZm9ybVZhcmlhYmxlLFxyXG4gICAgdHJhbnNmb3JtZXJzOiB7XHJcbiAgICAgIHVuc2FmZVZhcmlhYmxlOiB1bnNhZmVWYXJpYWJsZVRyYW5zZm9ybWVyKHVuc2FmZUhUTUwpLFxyXG4gICAgICBzZWN0aW9uOiBzZWN0aW9uVHJhbnNmb3JtZXIoKSxcclxuICAgICAgaW52ZXJ0ZWRTZWN0aW9uOiBpbnZlcnRlZFNlY3Rpb25UcmFuc2Zvcm1lcigpLFxyXG4gICAgICBjb21tZW50OiBjb21tZW50VHJhbnNmb3JtZXIoKSxcclxuICAgICAgY3VzdG9tRGVsaW1pdGVyVHJhbnNmb3JtZXI6IGN1c3RvbURlbGltaXRlclRyYW5zZm9ybWVyKCksXHJcbiAgICB9LFxyXG4gIH0pIiwiaW1wb3J0IHsgdG9UZW1wbGF0ZVN0cmluZ3NBcnJheSB9IGZyb20gJ0BjZHAvZXh0ZW5zaW9uLXRlbXBsYXRlJztcbmltcG9ydCB0eXBlIHsgVGVtcGxhdGVCcmlkZ2VFbmRpbmUsIFRlbXBsYXRlVHJhbnNmb3JtZXIgfSBmcm9tICdAYnJpZGdlL2ludGVyZmFjZXMnO1xuaW1wb3J0IHR5cGUge1xuICAgIE11c3RhY2hlVHJhbnNmb3JtZXIsXG4gICAgVGVtcGxhdGVUYWcsXG4gICAgVHJhbnNmb3JtRGlyZWN0aXZlLFxuICAgIFRyYW5zZm9ybVRlc3RlcixcbiAgICBUcmFuc2Zvcm1FeGVjdXRvcixcbiAgICBUcmFuc2Zvcm1lQ29udGV4dCxcbiAgICBUcmFuc2Zvcm1Db25maWcsXG59IGZyb20gJ2xpdC10cmFuc2Zvcm1lci9zcmMvaW50ZXJmYWNlcyc7XG5cbmltcG9ydCBjcmVhdGVEZWZhdWx0IGZyb20gJ2xpdC10cmFuc2Zvcm1lcic7XG5pbXBvcnQgY3JlYXRlQ3VzdG9tIGZyb20gJ2xpdC10cmFuc2Zvcm1lci9zcmMvbGl0LXRyYW5zZm9ybWVyJztcblxuaW1wb3J0IHZhcmlhYmxlIGZyb20gJ2xpdC10cmFuc2Zvcm1lci9zcmMvdHJhbnNmb3JtZXJzL3ZhcmlhYmxlVHJhbnNmb3JtZXInO1xuaW1wb3J0IHVuc2FmZVZhcmlhYmxlIGZyb20gJ2xpdC10cmFuc2Zvcm1lci9zcmMvdHJhbnNmb3JtZXJzL3Vuc2FmZVZhcmlhYmxlJztcbmltcG9ydCBzZWN0aW9uIGZyb20gJ2xpdC10cmFuc2Zvcm1lci9zcmMvdHJhbnNmb3JtZXJzL3NlY3Rpb24nO1xuaW1wb3J0IGludmVydGVkU2VjdGlvbiBmcm9tICdsaXQtdHJhbnNmb3JtZXIvc3JjL3RyYW5zZm9ybWVycy9pbnZlcnRlZFNlY3Rpb24nO1xuaW1wb3J0IGNvbW1lbnQgZnJvbSAnbGl0LXRyYW5zZm9ybWVyL3NyYy90cmFuc2Zvcm1lcnMvY29tbWVudCc7XG5pbXBvcnQgY3VzdG9tRGVsaW1pdGVyIGZyb20gJ2xpdC10cmFuc2Zvcm1lci9zcmMvdHJhbnNmb3JtZXJzL2N1c3RvbURlbGltaXRlcic7XG5cbi8qKiBAaW50ZXJuYWwgKi9cbnR5cGUgTXVzdGFjaGVUcmFuc2Zvcm1lckNvbnRleHQgPSBNdXN0YWNoZVRyYW5zZm9ybWVyICYgeyBkZWxpbWl0ZXI6IHsgc3RhcnQ6IHN0cmluZzsgZW5kOiBzdHJpbmc7IH07IH07XG5cbmNvbnN0IHhmb3JtID0gKG11c3RhY2hlOiBNdXN0YWNoZVRyYW5zZm9ybWVyQ29udGV4dCk6IFRlbXBsYXRlVHJhbnNmb3JtZXIgPT4ge1xuICAgIHJldHVybiAodGVtcGxhdGU6IEhUTUxUZW1wbGF0ZUVsZW1lbnQgfCBzdHJpbmcpOiBUZW1wbGF0ZUJyaWRnZUVuZGluZSA9PiB7XG4gICAgICAgIGNvbnN0IHsgc3RhcnQsIGVuZCB9ID0gbXVzdGFjaGUuZGVsaW1pdGVyO1xuXG4gICAgICAgIC8vIOOCs+ODoeODs+ODiOODluODreODg+OCr+WGheOBriBkZWxpbWl0ZXIg5oq95Ye6XG4gICAgICAgIGNvbnN0IHJlZ0NvbW1lbnRSZW1vdmVTdGFydCA9IG5ldyBSZWdFeHAoYDwhLS1cXFxccyoke3N0YXJ0fWAsICdnJyk7XG4gICAgICAgIGNvbnN0IHJlZ0NvbW1lbnRSZW1vdmVFbmQgICA9IG5ldyBSZWdFeHAoYCR7ZW5kfVxcXFxzKi0tPmAsICdnJyk7XG4gICAgICAgIC8vIGRlbGltaXRlciDliY3lvozjga4gdHJpbSDnlKjmraPopo/ooajnj75cbiAgICAgICAgY29uc3QgcmVnVHJpbSA9IG5ldyBSZWdFeHAoYCgke3N0YXJ0fVsjXi9dPylcXFxccyooW1xcXFx3XFxcXC5dKylcXFxccyooJHtlbmR9KWAsICdnJyk7XG5cbiAgICAgICAgY29uc3QgYm9keSA9ICh0ZW1wbGF0ZSBpbnN0YW5jZW9mIEhUTUxUZW1wbGF0ZUVsZW1lbnQgPyB0ZW1wbGF0ZS5pbm5lckhUTUwgOiB0ZW1wbGF0ZSlcbiAgICAgICAgICAgIC5yZXBsYWNlKHJlZ0NvbW1lbnRSZW1vdmVTdGFydCwgc3RhcnQpXG4gICAgICAgICAgICAucmVwbGFjZShyZWdDb21tZW50UmVtb3ZlRW5kLCBlbmQpXG4gICAgICAgICAgICAucmVwbGFjZShyZWdUcmltLCAnJDEkMiQzJylcbiAgICAgICAgO1xuXG4gICAgICAgIHJldHVybiBtdXN0YWNoZShib2R5KTtcbiAgICB9O1xufTtcblxuLypcbiAqIGxpdC1odG1sIHYyLjEuMCtcbiAqIFRlbXBsYXRlU3RyaW5nc0FycmF5IOOCkuWOs+WvhuOBq+ODgeOCp+ODg+OCr+OBmeOCi+OCiOOBhuOBq+OBquOBo+OBn+OBn+OCgSBwYXRjaCDjgpLjgYLjgabjgotcbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9saXQvbGl0L3B1bGwvMjMwN1xuICpcbiAqIOWwhuadpSBgQXJyYXkuaXNUZW1wbGF0ZU9iamVjdCgpYCDjgpLkvb/nlKjjgZXjgozjgovloLTlkIgsIOacrOWvvuW/nOOCguimi+ebtOOBmeW/heimgeOBguOCilxuICogaHR0cHM6Ly90YzM5LmVzL3Byb3Bvc2FsLWFycmF5LWlzLXRlbXBsYXRlLW9iamVjdC9cbiAqL1xuY29uc3QgcGF0Y2ggPSAoaHRtbDogVGVtcGxhdGVUYWcpOiBUZW1wbGF0ZVRhZyA9PiB7XG4gICAgcmV0dXJuICh0ZW1wbGF0ZTogVGVtcGxhdGVTdHJpbmdzQXJyYXksIC4uLnZhbHVlczogdW5rbm93bltdKSA9PiB7XG4gICAgICAgIHJldHVybiBodG1sKHRvVGVtcGxhdGVTdHJpbmdzQXJyYXkodGVtcGxhdGUpLCAuLi52YWx1ZXMpO1xuICAgIH07XG59O1xuXG5mdW5jdGlvbiBjcmVhdGVNdXN0YWNoZVRyYW5zZm9ybWVyKGh0bWw6IFRlbXBsYXRlVGFnLCB1bnNhZmVIVE1MOiBUcmFuc2Zvcm1EaXJlY3RpdmUpOiBUZW1wbGF0ZVRyYW5zZm9ybWVyO1xuZnVuY3Rpb24gY3JlYXRlTXVzdGFjaGVUcmFuc2Zvcm1lcihjb25maWc6IFRyYW5zZm9ybUNvbmZpZyk6IFRlbXBsYXRlVHJhbnNmb3JtZXI7XG5mdW5jdGlvbiBjcmVhdGVNdXN0YWNoZVRyYW5zZm9ybWVyKGFyZzE6IHVua25vd24sIGFyZzI/OiB1bmtub3duKTogVGVtcGxhdGVUcmFuc2Zvcm1lciB7XG4gICAgY29uc3QgZGVsaW1pdGVyID0geyBzdGFydDogJ3t7JywgZW5kOiAnfX0nIH07XG4gICAgbGV0IHRyYW5zZm9ybWVyOiBNdXN0YWNoZVRyYW5zZm9ybWVyQ29udGV4dDtcbiAgICBpZiAoJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIGFyZzEpIHtcbiAgICAgICAgdHJhbnNmb3JtZXIgPSBjcmVhdGVEZWZhdWx0KHBhdGNoKGFyZzEgYXMgVGVtcGxhdGVUYWcpLCBhcmcyIGFzIFRyYW5zZm9ybURpcmVjdGl2ZSkgYXMgTXVzdGFjaGVUcmFuc2Zvcm1lckNvbnRleHQ7XG4gICAgICAgIHRyYW5zZm9ybWVyLmRlbGltaXRlciA9IGRlbGltaXRlcjtcbiAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCB7IGh0bWwgfSA9IGFyZzEgYXMgeyBodG1sOiBUZW1wbGF0ZVRhZzsgfTtcbiAgICAgICAgY29uc3QgY29uZmlnID0gT2JqZWN0LmFzc2lnbih7XG4gICAgICAgICAgICBkZWxpbWl0ZXIsXG4gICAgICAgICAgICB0cmFuc2Zvcm1lcnM6IHt9LFxuICAgICAgICB9LCBhcmcxLCB7IGh0bWw6IHBhdGNoKGh0bWwpIH0pIGFzIFRyYW5zZm9ybUNvbmZpZztcbiAgICAgICAgdHJhbnNmb3JtZXIgPSBjcmVhdGVDdXN0b20oY29uZmlnKSBhcyBNdXN0YWNoZVRyYW5zZm9ybWVyQ29udGV4dDtcbiAgICAgICAgdHJhbnNmb3JtZXIuZGVsaW1pdGVyID0gY29uZmlnLmRlbGltaXRlciE7XG4gICAgfVxuICAgIHJldHVybiB4Zm9ybSh0cmFuc2Zvcm1lcik7XG59XG5cbmNvbnN0IHRyYW5zZm9ybWVyOiB7XG4gICAgdmFyaWFibGU6IFRyYW5zZm9ybUV4ZWN1dG9yO1xuICAgIHVuc2FmZVZhcmlhYmxlOiAodW5zYWZlSFRNTDogVHJhbnNmb3JtRGlyZWN0aXZlKSA9PiBUcmFuc2Zvcm1lQ29udGV4dDtcbiAgICBzZWN0aW9uOiAoKSA9PiBUcmFuc2Zvcm1lQ29udGV4dDtcbiAgICBpbnZlcnRlZFNlY3Rpb246ICgpID0+IFRyYW5zZm9ybWVDb250ZXh0O1xuICAgIGNvbW1lbnQ6ICgpID0+IFRyYW5zZm9ybWVDb250ZXh0O1xuICAgIGN1c3RvbURlbGltaXRlcjogKCkgPT4gVHJhbnNmb3JtZUNvbnRleHQ7XG59ID0ge1xuICAgIHZhcmlhYmxlLFxuICAgIHVuc2FmZVZhcmlhYmxlLFxuICAgIHNlY3Rpb24sXG4gICAgaW52ZXJ0ZWRTZWN0aW9uLFxuICAgIGNvbW1lbnQsXG4gICAgY3VzdG9tRGVsaW1pdGVyLFxufTtcblxuZXhwb3J0IHtcbiAgICBUZW1wbGF0ZVRhZyxcbiAgICBUcmFuc2Zvcm1EaXJlY3RpdmUsXG4gICAgVGVtcGxhdGVUcmFuc2Zvcm1lcixcbiAgICBUcmFuc2Zvcm1UZXN0ZXIsXG4gICAgVHJhbnNmb3JtRXhlY3V0b3IsXG4gICAgVHJhbnNmb3JtZUNvbnRleHQsXG4gICAgVHJhbnNmb3JtQ29uZmlnLFxuICAgIGNyZWF0ZU11c3RhY2hlVHJhbnNmb3JtZXIsXG4gICAgdHJhbnNmb3JtZXIsXG59O1xuIixudWxsLG51bGwsbnVsbCxudWxsLG51bGwsImltcG9ydCB0eXBlIHtcbiAgICBUZW1wbGF0ZUJyaWRnZUFyZyxcbiAgICBUZW1wbGF0ZVRyYW5zZm9ybWVyLFxufSBmcm9tICdAYnJpZGdlL2ludGVyZmFjZXMnO1xuaW1wb3J0IHtcbiAgICBUZW1wbGF0ZUhhbmRsZXIsXG4gICAgVGVtcGxhdGVIYW5kbGVycyxcbiAgICBUZW1wbGF0ZVJlbmRlcmVycyxcbiAgICBFdmFsdWF0ZVRlbXBsYXRlUmVzdWx0LFxuICAgIHByZXBhcmVUZW1wbGF0ZSxcbiAgICBldmFsdWF0ZVRlbXBsYXRlLFxufSBmcm9tICdzdGFtcGlubyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ3JlYXRlU3RhbXBpbm9UZW1wbGF0ZU9wdGlvbnMge1xuICAgIGhhbmRsZXJzPzogVGVtcGxhdGVIYW5kbGVycztcbiAgICByZW5kZXJlcnM/OiBUZW1wbGF0ZVJlbmRlcmVycztcbiAgICBzdXBlclRlbXBsYXRlPzogSFRNTFRlbXBsYXRlRWxlbWVudCB8IHVuZGVmaW5lZDtcbn1cblxuZnVuY3Rpb24gZW5zdXJlKHRlbXBsYXRlOiBIVE1MVGVtcGxhdGVFbGVtZW50IHwgc3RyaW5nKTogSFRNTFRlbXBsYXRlRWxlbWVudCB7XG4gICAgaWYgKHRlbXBsYXRlIGluc3RhbmNlb2YgSFRNTFRlbXBsYXRlRWxlbWVudCkge1xuICAgICAgICByZXR1cm4gdGVtcGxhdGU7XG4gICAgfSBlbHNlIGlmICgnc3RyaW5nJyA9PT0gdHlwZW9mIHRlbXBsYXRlKSB7XG4gICAgICAgIGNvbnN0IGVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0ZW1wbGF0ZScpO1xuICAgICAgICBlbGVtZW50LmlubmVySFRNTCA9IHRlbXBsYXRlO1xuICAgICAgICByZXR1cm4gZWxlbWVudDtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGBUeXBlIG9mIHRlbXBsYXRlIGlzIG5vdCBhIHZhbGlkLiBbdHlwZW9mOiAke3R5cGVvZiB0ZW1wbGF0ZX1dYCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBjcmVhdGVTdGFtcGlub1RyYW5zZm9ybWVyKG9wdGlvbnM/OiBDcmVhdGVTdGFtcGlub1RlbXBsYXRlT3B0aW9ucyk6IFRlbXBsYXRlVHJhbnNmb3JtZXIge1xuICAgIGNvbnN0IHsgaGFuZGxlcnMsIHJlbmRlcmVycywgc3VwZXJUZW1wbGF0ZSB9ID0gb3B0aW9ucyA/PyB7fTtcbiAgICByZXR1cm4gKHRlbXBsYXRlOiBIVE1MVGVtcGxhdGVFbGVtZW50IHwgc3RyaW5nKSA9PiB7XG4gICAgICAgIHJldHVybiBwcmVwYXJlVGVtcGxhdGUoZW5zdXJlKHRlbXBsYXRlKSwgaGFuZGxlcnMsIHJlbmRlcmVycywgc3VwZXJUZW1wbGF0ZSk7XG4gICAgfTtcbn1cblxuZXhwb3J0IHtcbiAgICBUZW1wbGF0ZUJyaWRnZUFyZyxcbiAgICBUZW1wbGF0ZUhhbmRsZXIsXG4gICAgVGVtcGxhdGVIYW5kbGVycyxcbiAgICBUZW1wbGF0ZVJlbmRlcmVycyxcbiAgICBFdmFsdWF0ZVRlbXBsYXRlUmVzdWx0LFxuICAgIGNyZWF0ZVN0YW1waW5vVHJhbnNmb3JtZXIsXG4gICAgcHJlcGFyZVRlbXBsYXRlLFxuICAgIGV2YWx1YXRlVGVtcGxhdGUsXG59O1xuIl0sIm5hbWVzIjpbImNyZWF0ZVRyYW5zZm9ybSIsInRyYW5zZm9ybVZhcmlhYmxlIiwidW5zYWZlVmFyaWFibGVUcmFuc2Zvcm1lciIsInNlY3Rpb25UcmFuc2Zvcm1lciIsImludmVydGVkU2VjdGlvblRyYW5zZm9ybWVyIiwiY29tbWVudFRyYW5zZm9ybWVyIiwiY3VzdG9tRGVsaW1pdGVyVHJhbnNmb3JtZXIiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EscUJBQWUsTUFBTSxJQUFJLFdBQVcsSUFBSSxTQUFTLENBQUMsV0FBVyxFQUFFLE1BQU0sRUFBQztBQUN0RTtBQUNPLFNBQVMsU0FBUyxDQUFDLFVBQVUsRUFBRSxNQUFNLEVBQUU7QUFDOUMsRUFBRSxNQUFNLFdBQVcsR0FBRyxHQUFFO0FBQ3hCLEVBQUUsTUFBTSxlQUFlLEdBQUcsR0FBRTtBQUM1QjtBQUNBLEVBQUUsSUFBSSxnQkFBZ0IsR0FBRyxXQUFVO0FBQ25DLEVBQUUsSUFBSSxjQUFjLEdBQUcsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFDO0FBQ3ZFLEVBQUUsT0FBTyxjQUFjLElBQUksQ0FBQyxFQUFFO0FBQzlCLElBQUksSUFBSSxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUs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QU0sRUFBRSxDQUFNLEtBQUssQ0FBQyxHQUFHLENBQUM7SUFDOUIsR0FBRyxFQUFFLENBQUMsQ0FBTSxFQUFFLENBQU0sS0FBSyxDQUFDLEdBQUcsQ0FBQztJQUM5QixHQUFHLEVBQUUsQ0FBQyxDQUFNLEVBQUUsQ0FBTSxLQUFLLENBQUMsR0FBRyxDQUFDO0lBQzlCLEdBQUcsRUFBRSxDQUFDLENBQU0sRUFBRSxDQUFNLEtBQUssQ0FBQyxHQUFHLENBQUM7SUFDOUIsSUFBSSxFQUFFLENBQUMsQ0FBTSxFQUFFLENBQU0sS0FBSyxDQUFDLElBQUksQ0FBQztJQUNoQyxJQUFJLEVBQUUsQ0FBQyxDQUFNLEVBQUUsQ0FBTSxLQUFLLENBQUMsSUFBSSxDQUFDO0lBQ2hDLEtBQUssRUFBRSxDQUFDLENBQU0sRUFBRSxDQUFNLEtBQUssQ0FBQyxLQUFLLENBQUM7SUFDbEMsS0FBSyxFQUFFLENBQUMsQ0FBTSxFQUFFLENBQU0sS0FBSyxDQUFDLEtBQUssQ0FBQztJQUNsQyxHQUFHLEVBQUUsQ0FBQyxDQUFNLEVBQUUsQ0FBTSxLQUFLLENBQUMsR0FBRyxDQUFDO0lBQzlCLElBQUksRUFBRSxDQUFDLENBQU0sRUFBRSxDQUFNLEtBQUssQ0FBQyxJQUFJLENBQUM7SUFDaEMsR0FBRyxFQUFFLENBQUMsQ0FBTSxFQUFFLENBQU0sS0FBSyxDQUFDLEdBQUcsQ0FBQztJQUM5QixJQUFJLEVBQUUsQ0FBQyxDQUFNLEVBQUUsQ0FBTSxLQUFLLENBQUMsSUFBSSxDQUFDO0lBQ2hDLElBQUksRUFBRSxDQUFDLENBQU0sRUFBRSxDQUFNLEtBQUssQ0FBQyxJQUFJLENBQUM7SUFDaEMsSUFBSSxFQUFFLENBQUMsQ0FBTSxFQUFFLENBQU0sS0FBSyxDQUFDLElBQUksQ0FBQztJQUNoQyxJQUFJLEVBQUUsQ0FBQyxDQUFNLEVBQUUsQ0FBTSxLQUFLLENBQUMsSUFBSSxDQUFDO0lBQ2hDLEdBQUcsRUFBRSxDQUFDLENBQU0sRUFBRSxDQUFrQixLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDekMsSUFBSSxFQUFFLENBQUMs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OztBQUNaLFNBQUEsSUFBSSxRQUFRLEtBQUssT0FBTyxRQUFRLEVBQUU7UUFDckMsTUFBTSxPQUFPLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxVQUFVLENBQUM7QUFDbEQsUUFBQSxPQUFPLENBQUMsU0FBUyxHQUFHLFFBQVE7QUFDNUIsUUFBQSxPQUFPLE9BQU87O1NBQ1g7UUFDSCxNQUFNLElBQUksU0FBUyxDQUFDLENBQUEsMENBQUEsRUFBNkMsT0FBTyxRQUFRLENBQUEsQ0FBQSxDQUFHLENBQUM7O0FBRTVGO0FBRUEsU0FBUyx5QkFBeUIsQ0FBQyxPQUF1QyxFQUFBO0lBQ3RFLE1BQU0sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLGFBQWEsRUFBRSxHQUFHLE9BQU8sSUFBSSxFQUFFO0lBQzVELE9BQU8sQ0FBQyxRQUFzQyxLQUFJO0FBQzlDLFFBQUEsT0FBTyxlQUFlLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsYUFBYSxDQUFDO0FBQ2hGLEtBQUM7QUFDTDs7OzsiLCJ4X2dvb2dsZV9pZ25vcmVMaXN0IjpbMCwxLDIsMyw0LDUsNiw3LDgsOSwxMCwxMiwxMywxNCwxNSwxNl0sInNvdXJjZVJvb3QiOiJjZHA6Ly8vQGNkcC9leHRlbnNpb24tdGVtcGxhdGUtYnJpZGdlLyJ9