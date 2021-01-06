import { OPTION_EDITOR_URL, OPTION_SUPPORTS, SUPPORTS_MAPPING, JSONMapping } from '@lezer-editor/lezer-editor-common'
import { GrammarPlugin } from "../util";

export class EditorGrammar {
  public name: string = "New grammar";
  public isPredefined: boolean = false;
  public url: string;
  public supportsArr: string[] = [];
  public plugin: GrammarPlugin = null;
  public externalEditorEnabled: boolean = false;
  public externalEditorUrl: boolean = null;
  public jsonMapping: JSONMapping = null;

  constructor() {
  }

  public supports(opt: string) {
    return this.supportsArr.includes(opt);
  }

  public set(payload: Partial<EditorGrammar>) {
    for (const key in payload) {
      if (this.hasOwnProperty(key)) {
        this[key] = payload[key];
      }
    }
    return this;
  }

  public static build(payload: Partial<EditorGrammar>) {
    const copy = new EditorGrammar();
    copy.set(payload);
    return copy;
  }
}

export class EditorGrammarUtils {
  public static clone(eg: EditorGrammar) {
    const copy = new EditorGrammar();
    Object.assign(copy, eg);
    return copy;
  }

  static async from(url: string, grammarPlugin: GrammarPlugin): Promise<EditorGrammar> {
    const supportsArr = await grammarPlugin.getOption(OPTION_SUPPORTS) as string[];
    const extEditorUrl = await grammarPlugin.getOption(OPTION_EDITOR_URL);
    return EditorGrammar.build({ url, supportsArr, plugin: grammarPlugin, externalEditorUrl: extEditorUrl });
  }

  static findByUrl(url: string, grammars: EditorGrammar[]): EditorGrammar {
    return grammars.find(g => g.url == url);
  }

  static findIdx(grammar: EditorGrammar, grammars: EditorGrammar[]): number {
    return grammars.findIndex(g => g.url == grammar.url);
  }
}