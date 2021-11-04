import { EditorGrammar } from "./editorgrammar";

export class UserDisplayUtils {
    static editorGrammarTitle(eg: EditorGrammar) {
        return eg.grammar.predefined ? '[P] ' + eg.grammar.name : eg.grammar.name;
    }
}