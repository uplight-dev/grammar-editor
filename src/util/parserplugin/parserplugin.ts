import { ASTIterator, ASTIterators, ASTNodeImpl, Context, HydratedASTNode, JSONMapping, JSONWithMapping, OPTION_JSON_MAPPING, ParserAdapter, SimpleValue, HydratedOrASTNode, HydratedASTNodeImpl } from '@lezer-editor/lezer-editor-common';
import jsext from '../jsext';

const DEFAULT_JSON_MAPPING : JSONMapping = {
  name: "name",
  start: "start", end: "end",
  children: "children",
  skip: "skip",
  error: "error",
  value: "value"
};

export default class ParserPlugin {

  constructor(private parserAdapter: ParserAdapter) {

  }

  eval(input: string, ctx: Context): ASTIterator<HydratedASTNode> {
    return this.parse0(input, {...ctx, mode: 'EVAL'});
  }

  parse(input: string, ctx: Context): ASTIterator<HydratedASTNode> {
    return this.parse0(input, {...ctx, mode: 'PARSE'});
  }

  getOption(key : string) : any {
    return this.parserAdapter.getOption(key);
  }

  private parse0(input: string, ctx: Context): ASTIterator<HydratedASTNode> {
    const v = this.parserAdapter.parse(input, ctx);
    if (!v) {
      throw Error(`Error parsing. ${jsext.toStr({input})}`);
    }
    const jsonMapping = this.getJsonMapping();
    const r = this.mapValue(v, jsonMapping);
    return r;
  }

  private getJsonMapping() : JSONMapping {
    return (this.parserAdapter.getOption && this.parserAdapter.getOption(OPTION_JSON_MAPPING)) || DEFAULT_JSON_MAPPING;
  }

  private mapValue(v: any, jsonMapping: JSONMapping): ASTIterator<HydratedASTNode> {
    return this.switchType<ASTIterator<HydratedASTNode>>(v, {
      
      Primitive: (value) => {
        const node = new HydratedASTNodeImpl({name: 'value', start: 0, end: value.toString().length});
        return ASTIterators.fromIdentity<HydratedASTNode>(node);
      },

      JSON: (value) => {
        if (jsonMapping) {
          const noDehydrate = false;//in GrammarEditor, we work with hydrated nodes
          return ASTIterators.fromHydratedJson(value, jsonMapping, noDehydrate);
        }
        return null;
      },

      JSONWithMapping: (value) => {  
        if (!value.mapping) {
          throw Error(`No mapping provided. API error? - ${jsext.toStr({value})}`)
        }
        const noDehydrate = false;//in GrammarEditor, we work with hydrated nodes
        return ASTIterators.fromHydratedJson(value.json, value.mapping, noDehydrate);
      },

      ASTIterator: value => {
        return value.hydrate();//ensure to hydrate the result ...
      }

    });
  }

  private switchType<V>(v: any, 
    visitor: {Primitive: (val : SimpleValue) => V, JSON: (val : JSON) => V, JSONWithMapping: (val : JSONWithMapping) => V, ASTIterator : (val : ASTIterator<HydratedOrASTNode>) => V}
  ): V {
    switch (typeof v) {
      case 'string':
      case 'boolean':
      case 'number':
      case 'bigint':
        return visitor.Primitive(v as SimpleValue);
      case 'object': {
        if (this.isJSONWithMapping(v)) {
          return visitor.JSONWithMapping(v);
        } 
        else if (this.isTreeVisitor(v)) {
          return visitor.ASTIterator(v);
        } else {
          return visitor.JSON(v);
        }
      }
    }
    throw Error(`Error parsing. Unkown type for value: ${jsext.toStr({v})}`)
  }

  private isJSONWithMapping(v: any) : v is JSONWithMapping {
    const v1 = (v as JSONWithMapping);
    return v1.mapping !== undefined && v1.json !== undefined;
  }

  private isTreeVisitor(v: any) : v is ASTIterator<HydratedOrASTNode> {
    return (v as ASTIterator<HydratedOrASTNode>).traverse !== undefined;
  }

}


// parse(grammar: IGrammar, grammarTag: string, expression: string): any {
  //   const parseOptions = { top: grammarTag };
  //   try {
  //     return grammar.LezerParser.parse(expression, parseOptions);
  //   } catch (e) {
  //     throw Error(`Error parsing. ${jsext.toStr({expression, parseOptions})}`)
  //   }
  // }

  // _buildExecutionTree(grammarTag: string, tree: Tree, input: string) {

  //   type StackEntry = { args: any[], nodeInput: string };

  //   const root = { args: [], nodeInput: input };

  //   const stack: StackEntry[] = [root];
    
  //   const self = this;

  //   tree.iterate({
  //     enter(node, start, end) {

  //       // if (node.isError) {
  //       //   throw SyntaxError(`Statement unparseable at [${start}, ${end}] for ${input}`);
  //       // }

  //       if (node.isSkipped) {
  //         return false;
  //       }

  //       const nodeInput = input.slice(start, end);

  //       stack.push({
  //         nodeInput,
  //         args: []
  //       });
  //     },

  //     leave(node, start, end) {

  //       if (node.isSkipped) {
  //         return;
  //       }

  //       const {
  //         nodeInput,
  //         args
  //       } = stack.pop() as StackEntry;

  //       const parent = stack[stack.length - 1];

  //       const interpreter: IInterpreter = self.grammar.getEditorInfo().getInterpreter(grammarTag);
  //       const expr = interpreter.evaluate(node, nodeInput, args);

  //       parent.args.push(expr);
  //     }
  //   });

  //   return root.args[root.args.length - 1];
  // }

  // eval(grammarTag: string, expression: string, context: Record<string, any> = {}) {
  //   const {
  //     tree: parseTree,
  //     parsedContext
  //   } = parse(this.grammar, grammarTag, expression, context);

  //   const root = this._buildExecutionTree(grammarTag, parseTree, expression);
  //   const results = root(parsedContext);

  //   if (results.length === 1) {
  //     return results[0];
  //   } else {
  //     return results;
  //   }
  // }