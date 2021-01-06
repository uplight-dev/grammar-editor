import { ASTIterator, ASTIterators, HydratedASTNode, HydratedASTNodeImpl, JSONMapping, CompileStatus, SimpleValue, GrammarEndpoint, GrammarAdapter } from '@lezer-editor/lezer-editor-common';
import jsext from '../jsext';

const DEFAULT_JSON_MAPPING : JSONMapping = {
  name: "name",
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
    const v = await this.grammarAdapter.eval(this.clientId, rootTag, input, ctx);
    return v;
  }

  async parse(rootTag: string, input: string): Promise<ASTIterator<HydratedASTNode>> {
    if (!this.grammarAdapter.parse) {
      return null;
    }
    const v = await this.grammarAdapter.parse(this.clientId, rootTag, input);
    if (!v) {
      throw Error(`Error parsing. ${jsext.toStr({input})}`);
    }
    const r = this.mapValue(v, this.jsonMapping);
    return r;
  }

  async getOption(key: string): Promise<any> {
    if (!this.grammarAdapter.getOption) {
      return null;
    }
    return await this.grammarAdapter.getOption(this.clientId, key);
  }

  private mapValue(v: any, jsonMapping: JSONMapping): ASTIterator<HydratedASTNode> {
    return this.switchType<ASTIterator<HydratedASTNode>>(v, {
      
      Primitive: (value) => {
        const node = new HydratedASTNodeImpl({name: 'value', value: value, start: 0, end: value.toString().length, children: []});
        return ASTIterators.fromIdentity<HydratedASTNode>(node);
      },

      JSON: (value) => {
        if (jsonMapping) {
          const dontDehydrate = false;//in GrammarEditor, we work with hydrated nodes
          jsonMapping = jsonMapping || DEFAULT_JSON_MAPPING;
          return ASTIterators.fromJson(value, jsonMapping, dontDehydrate);
        }
        return null;
      }

    });
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
