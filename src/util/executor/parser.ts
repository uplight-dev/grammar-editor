import {IGrammar} from '@lezer-editor/lezer-editor-common';
import { ParseOptions, Tree } from 'lezer';

type NameDefinition = {
  name: string,
  replacement: string,
  replacer: RegExp
};

type ParseContext = Record<string, any>;

type ParseResult = {
  parsedContext: ParseContext
  parsedInput: string
  tree: Tree
};


/**
 * A feel parser for a specific grammar (expressions)
 */
class Parser {
  constructor() {

  }

  parse(grammar: IGrammar, grammarTag: string, rawInput: string, rawContext: ParseContext): ParseResult {
    return this._parse(grammar, rawInput, rawContext, grammarTag ? { top: grammarTag } : {});
  }

  _parse(grammar: IGrammar, rawInput: string, rawContext: ParseContext, parseOptions: ParseOptions): ParseResult {

    const names = this._findNames(rawContext);

    const {
      context: parsedContext,
      input: parsedInput
    } = this._replaceNames(rawInput, rawContext, names);

    let tree = null;
    try {
      tree = grammar.LezerParser.parse(parsedInput, parseOptions);
    } catch (e) {
      console.log('error parsing: ' + parsedInput);
    }

    return {
      parsedContext,
      parsedInput,
      tree
    };
  }

  _parseName(name: string) {

    let match;

    const pattern = /([./\-'+*]+)|([^\s./\-'+*]+)/g;

    const tokens = [];

    let lastName = false;

    while ((match = pattern.exec(name))) {

      const [, additionalPart, namePart] = match;

      if (additionalPart) {
        lastName = false;

        if (tokens.length) {
          tokens.push('\\s*');
        }

        tokens.push(additionalPart.replace(/[+*]/g, '\\$&'));
      } else {
        if (tokens.length) {
          if (lastName) {
            tokens.push('\\s+');
          } else {
            tokens.push('\\s*');
          }
        }

        lastName = true;

        tokens.push(namePart);
      }
    }

    return tokens;
  }

  _findNames(context: ParseContext): NameDefinition[] {

    let uid = 0;

    return Object.keys(context).filter(key => /[\s./\-'+*]/.test(key)).map(name => {

      const replacement = '_' + uid.toString(36);
      const tokens = this._parseName(name);

      const replacer = new RegExp(tokens.join(''), 'g');

      return {
        name,
        replacement,
        replacer
      };
    });
  }

  _replaceNames(input: string, context: ParseContext, names: NameDefinition[]) {

    for (const { name, replacement, replacer } of names) {

      input = input.replace(replacer, function (match) {

        const placeholder = replacement.padEnd(match.length, '_');

        if (!context[placeholder]) {
          context = {
            ...context,
            [match]: context[name]
          };
        }

        return placeholder;
      });
    }

    return {
      input,
      context
    };
  }

}

const parser = new Parser();

export default function parse(grammar: IGrammar, grammarTag: string, expression: string, context: ParseContext = {}): ParseResult {
  return parser.parse(grammar, grammarTag, expression, context);
}
