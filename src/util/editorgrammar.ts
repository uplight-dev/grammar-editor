import { OPTION_EDITOR_URL, OPTION_SUPPORTS, JSONMapping } from '@grammar-editor/grammar-editor-api'
import { GrammarPlugin } from "../util";
import GrammarLoader from './grammarplugin/loader';
import JSExt from './jsext';

export const DEFAULT_JSON_MAPPING : JSONMapping = {
  name: "name",
  start: "start", end: "end",
  skip: "skip",
  error: "error",
  value: "value",
  children: "children"
};

export class Grammar {
  constructor(public name?: string, public url?: string, public jsonMapping?: JSONMapping, public rootTags?: string[], public predefined?: boolean) {

  }

  public set(eg: Partial<Grammar>) {
    return JSExt.set(eg, this);
  }
}
export class EditorGrammar {
  public grammar: Grammar;
  public plugin: GrammarPlugin = null;
  //cached from the plugin ...
  public supportsArr: string[] = [];
  public externalEditorEnabled: boolean = false;
  public externalEditorUrl: boolean = null;
  public loadError: boolean = false;

  constructor() {
    this.grammar = new Grammar();
  }

  public supports(opt: string) {
    return this.supportsArr.includes(opt);
  }

  public set(eg: Partial<EditorGrammar>) {
    return JSExt.set(eg, this);
  }
}

export class EditorGrammarUtils {
  public static clone(eg: EditorGrammar) {
    const copy = new EditorGrammar();
    Object.assign(copy, eg);
    copy.grammar = Object.assign({}, eg.grammar);
    copy.plugin = eg.plugin;//plugin is stateless
    return copy;
  }

  public static build(eg: Partial<EditorGrammar>) {
    const copy = new EditorGrammar();
    copy.set(eg);
    return copy;
  }

  public static fromGrammar(grammar: Grammar) {
    const copy = new EditorGrammar();
    copy.set({grammar});
    return copy;
  }

  static async reload(eg: EditorGrammar, loader: GrammarLoader): Promise<EditorGrammar> {
    const grammarPlugin = await loader.load(eg.grammar.url);
    const supportsArr = await grammarPlugin.getOption(OPTION_SUPPORTS) as string[];
    const extEditorUrl = await grammarPlugin.getOption(OPTION_EDITOR_URL);
    eg.supportsArr = supportsArr;
    eg.plugin = grammarPlugin;
    eg.externalEditorUrl = extEditorUrl;
    return eg;
  }

  static async from(url: string, grammarPlugin: GrammarPlugin): Promise<EditorGrammar> {
    const supportsArr = await grammarPlugin.getOption(OPTION_SUPPORTS) as string[];
    const extEditorUrl = await grammarPlugin.getOption(OPTION_EDITOR_URL);
    return EditorGrammarUtils.build({ grammar: new Grammar(url), supportsArr, plugin: grammarPlugin, externalEditorUrl: extEditorUrl });
  }

  static findByUrl(url: string, egArr: EditorGrammar[]): EditorGrammar {
    return egArr.find(g => g.grammar.url == url);
  }

  static findIdx(editorGrammar: EditorGrammar, editorGrammars: EditorGrammar[]): number {
    return editorGrammars.findIndex(eg => eg.grammar.url == editorGrammar.grammar.url);
  }
}