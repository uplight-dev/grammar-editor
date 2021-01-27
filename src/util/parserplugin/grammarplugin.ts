import { EvalMode, ASTIterator, ASTIterators, HydratedASTNode, HydratedASTNodeImpl, JSONMapping, CompileStatus, SimpleValue, GrammarEndpoint, GrammarAdapter } from '@grammar-editor/grammar-editor-api';
import jsext from '../jsext';

const DEFAULT_JSON_MAPPING : JSONMapping = {
  name: "type.name",
  start: "start", end: "end",
  skip: "skip",
  error: "error",
  value: "value",
  children: "children"
};

export default class GrammarPlugin {
  private grammarEndpoint: GrammarEndpoint;
  private grammarAdapter: GrammarAdapter;
  private clientId: string;
  private jsonMapping: JSONMapping;

  private constructor() {
    
  }

  public static async build(grammarEndpoint: GrammarEndpoint, clientId: string, jsonMapping: JSONMapping) : Promise<GrammarPlugin> {
    let r = new GrammarPlugin();
    r.grammarEndpoint = grammarEndpoint;
    r.grammarAdapter = await grammarEndpoint.adapter(clientId);
    r.clientId = clientId;
    r.jsonMapping = jsonMapping;
    return r;
  }

  async recompile(grammar: string): Promise<CompileStatus> {
    if (!this.grammarEndpoint.recompile) {
      return null;
    }
    const v = await this.grammarEndpoint.recompile(this.clientId, grammar);
    return v;
  }

  async eval(rootTag: string, input: string, ctx: JSON): Promise< SimpleValue | JSON > {
    if (!this.grammarAdapter.eval) {
      return null;
    }
    const v = await this.grammarAdapter.eval(this.clientId, rootTag, input, EvalMode.RUN, ctx);
    return v;
  }

  async parse(rootTag: string, input: string): Promise<ASTIterator<HydratedASTNode>> {
    if (!this.grammarAdapter.eval) {
      return null;
    }
    const v = await this.grammarAdapter.eval(this.clientId, rootTag, input, EvalMode.PARSE, {});
    if (!v) {
      throw Error(`Error parsing. ${jsext.toStr({input})}`);
    }
    let r = v;
    r = this.mapValue(v, this.jsonMapping || DEFAULT_JSON_MAPPING);
    return r;
  }

  async getOption(key: string): Promise<any> {
    if (!this.grammarAdapter.getOption) {
      return null;
    }
    return await this.grammarAdapter.getOption(this.clientId, key);
  }

  private mapValue(v: any, jsonMapping: JSONMapping): ASTIterator<HydratedASTNode> {
    try {
      return this.switchType<ASTIterator<HydratedASTNode>>(v, {
        
        Primitive: (value) => {
          const node = new HydratedASTNodeImpl({name: 'value', value: value, start: 0, end: value.toString().length, children: []});
          return ASTIterators.fromIdentity<HydratedASTNode>(node);
        },

        JSON: (value) => {
          if (jsonMapping) {
            const dontDehydrate = false;//in GrammarEditor, we work with hydrated nodes
            return ASTIterators.fromJson(value, jsonMapping, dontDehydrate);
          }
          return null;
        }

      });
    } catch (e) {
      throw Error('Mapping of value failed.');
    }
  }

  private switchType<V>(v: any, 
    visitor: {Primitive: (val : SimpleValue) => V, JSON: (val : JSON) => V}
  ): V {
    switch (typeof v) {
      case 'string':
      case 'boolean':
      case 'number':
      case 'bigint':
        return visitor.Primitive(v as SimpleValue);
      case 'object': {
        return visitor.JSON(v);
      }
    }
    throw Error(`Error parsing. Unkown type for value: ${jsext.toStr({v})}`)
  }

}
