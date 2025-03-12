import {
    type Token,
    TokenAddress as $,
    type Delimiters,
    globalSettings,
} from './internal';
import {
    isString,
    isArray,
    isWhitespace,
    escapeTemplateExp,
} from './utils';
import { Scanner } from './scanner';

/** @internal */
const _regexp = {
    white: /\s*/,
    space: /\s+/,
    equals: /\s*=/,
    curly: /\s*\}/,
    tag: /#|\^|\/|>|\{|&|=|!/,
};

/**
 * @internal
 * Combines the values of consecutive text tokens in the given `tokens` array to a single token.
 */
function squashTokens(tokens: Token[]): Token[] {
    const squashedTokens: Token[] = [];

    let lastToken!: Token;
    for (const token of tokens) {
        if (token) {
            if ('text' === token[$.TYPE] && lastToken && 'text' === lastToken[$.TYPE]) {
                lastToken[$.VALUE] += token[$.VALUE];
                lastToken[$.END] = token[$.END];
            } else {
                squashedTokens.push(token);
                lastToken = token;
            }
        }
    }

    return squashedTokens;
}

/**
 * @internal
 * Forms the given array of `tokens` into a nested tree structure where
 * tokens that represent a section have two additional items: 1) an array of
 * all tokens that appear in that section and 2) the index in the original
 * template that represents the end of that section.
 */
function nestTokens(tokens: Token[]): Token[] {
    const nestedTokens: Token[] = [];
    let collector = nestedTokens;
    const sections: Token[] = [];

    let section!: Token;
    for (const token of tokens) {
        switch (token[$.TYPE]) {
            case '#':
            case '^':
                collector.push(token);
                sections.push(token);
                collector = token[$.TOKEN_LIST] = [];
                break;
            case '/':
                section = sections.pop()!;
                section[$.TAG_INDEX] = token[$.START];
                collector = sections.length > 0 ? sections[sections.length - 1][$.TOKEN_LIST] as Token[] : nestedTokens;
                break;
            default:
                collector.push(token);
                break;
        }
    }
    return nestedTokens;
}

/**
 * Breaks up the given `template` string into a tree of tokens. If the `tags`
 * argument is given here it must be an array with two string values: the
 * opening and closing tags used in the template (e.g. [ "<%", "%>" ]). Of
 * course, the default is to use mustaches (i.e. mustache.tags).
 *
 * A token is an array with at least 4 elements. The first element is the
 * mustache symbol that was used inside the tag, e.g. "#" or "&". If the tag
 * did not contain a symbol (i.e. {{myValue}}) this element is "name". For
 * all text that appears outside a symbol this element is "text".
 *
 * The second element of a token is its "value". For mustache tags this is
 * whatever else was inside the tag besides the opening symbol. For text tokens
 * this is the text itself.
 *
 * The third and fourth elements of the token are the start and end indices,
 * respectively, of the token in the original template.
 *
 * Tokens that are the root node of a subtree contain two more elements: 1) an
 * array of tokens in the subtree and 2) the index in the original template at
 * which the closing tag for that section begins.
 *
 * Tokens for partials also contain two more elements: 1) a string value of
 * indendation prior to that tag and 2) the index of that tag on that line -
 * eg a value of 2 indicates the partial is the third tag on this line.
 *
 * @param template template string
 * @param tags delimiters ex) ['{{','}}'] or '{{ }}'
 */
export function parseTemplate(template: string, tags?: Delimiters): Token[] {
    if (!template) {
        return [];
    }

    let lineHasNonSpace     = false;
    const sections: Token[] = [];       // Stack to hold section tokens
    const tokens: Token[]   = [];       // Buffer to hold the tokens
    const spaces: number[]  = [];       // Indices of whitespace tokens on the current line
    let hasTag              = false;    // Is there a {{tag}} on the current line?
    let nonSpace            = false;    // Is there a non-space char on the current line?
    let indentation         = '';       // Tracks indentation for tags that use it
    let tagIndex            = 0;        // Stores a count of number of tags encountered on a line

    // Strips all whitespace tokens array for the current line
    // if there was a {{#tag}} on it and otherwise only space.
    const stripSpace = (): void => {
        if (hasTag && !nonSpace) {
            while (spaces.length) {
                delete tokens[spaces.pop()!];   // eslint-disable-line @typescript-eslint/no-array-delete
            }
        } else {
            spaces.length = 0;
        }
        hasTag = false;
        nonSpace = false;
    };

    const compileTags = (tagsToCompile: string | string[]): { openingTag: RegExp; closingTag: RegExp; closingCurly: RegExp; } => {
        const enum Tag {
            OPEN = 0,
            CLOSE,
        }
        if (isString(tagsToCompile)) {
            tagsToCompile = tagsToCompile.split(_regexp.space, 2);
        }

        if (!isArray(tagsToCompile) || 2 !== tagsToCompile.length) {
            throw new Error(`Invalid tags: ${JSON.stringify(tagsToCompile)}`);
        }
        return {
            openingTag:   new RegExp(`${escapeTemplateExp(tagsToCompile[Tag.OPEN])}\\s*`),
            closingTag:   new RegExp(`\\s*${escapeTemplateExp(tagsToCompile[Tag.CLOSE])}`),
            closingCurly: new RegExp(`\\s*${escapeTemplateExp(`}${tagsToCompile[Tag.CLOSE]}`)}`),
        };
    };

    const { tag: reTag, white: reWhite, equals: reEquals, curly: reCurly } = _regexp;
    let _regxpTags = compileTags(tags ?? globalSettings.tags);

    const scanner = new Scanner(template);

    let openSection: Token | undefined;
    while (!scanner.eos) {
        const { openingTag: reOpeningTag, closingTag: reClosingTag, closingCurly: reClosingCurly } = _regxpTags;
        let token: Token;
        let start = scanner.pos;
        // Match any text between tags.
        let value = scanner.scanUntil(reOpeningTag);
        if (value) {
            for (let i = 0, valueLength = value.length; i < valueLength; ++i) {
                const chr = value.charAt(i);

                if (isWhitespace(chr)) {
                    spaces.push(tokens.length);
                    indentation += chr;
                } else {
                    nonSpace = true;
                    lineHasNonSpace = true;
                    indentation += ' ';
                }

                tokens.push(['text', chr, start, start + 1]);
                start += 1;

                // Check for whitespace on the current line.
                if ('\n' === chr) {
                    stripSpace();
                    indentation = '';
                    tagIndex = 0;
                    lineHasNonSpace = false;
                }
            }
        }

        // Match the opening tag.
        if (!scanner.scan(reOpeningTag)) {
            break;
        }

        hasTag = true;

        // Get the tag type.
        let type = scanner.scan(reTag) || 'name';
        scanner.scan(reWhite);

        // Get the tag value.
        if ('=' === type) {
            value = scanner.scanUntil(reEquals);
            scanner.scan(reEquals);
            scanner.scanUntil(reClosingTag);
        } else if ('{' === type) {
            value = scanner.scanUntil(reClosingCurly);
            scanner.scan(reCurly);
            scanner.scanUntil(reClosingTag);
            type = '&';
        } else {
            value = scanner.scanUntil(reClosingTag);
        }

        // Match the closing tag.
        if (!scanner.scan(reClosingTag)) {
            throw new Error(`Unclosed tag at ${scanner.pos}`);
        }

        if ('>' === type) {
            token = [type, value, start, scanner.pos, indentation, tagIndex, lineHasNonSpace];
        } else {
            token = [type, value, start, scanner.pos];
        }
        tagIndex++;
        tokens.push(token);

        if ('#' === type || '^' === type) {
            sections.push(token);
        } else if ('/' === type) {
            // Check section nesting.
            openSection = sections.pop();
            if (!openSection) {
                throw new Error(`Unopened section "${value}" at ${start}`);
            }
            if (openSection[1] !== value) {
                throw new Error(`Unclosed section "${openSection[$.VALUE]}" at ${start}`);
            }
        } else if ('name' === type || '{' === type || '&' === type) {
            nonSpace = true;
        } else if ('=' === type) {
            // Set the tags for the next time around.
            _regxpTags = compileTags(value);
        }
    }

    stripSpace();

    // Make sure there are no open sections when we're done.
    openSection = sections.pop();

    if (openSection) {
        throw new Error(`Unclosed section "${openSection[$.VALUE]}" at ${scanner.pos}`);
    }

    return nestTokens(squashTokens(tokens));
}
