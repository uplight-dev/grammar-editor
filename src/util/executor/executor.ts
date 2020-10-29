import { IGrammar, IInterpreter } from '@lezer-editor/lezer-editor-common';
import { Tree } from 'lezer';
import { default as parse } from './parser';

class GrammarExecutor {
  constructor(private grammar: IGrammar) {

  }

  _buildExecutionTree(grammarTag: string, tree: Tree, input: string) {

    type StackEntry = { args: any[], nodeInput: string };

    const root = { args: [], nodeInput: input };

    const stack: StackEntry[] = [root];
    
    const self = this;

    try {
      tree.iterate({
        enter(node, start, end) {

          if (node.isSkipped) {
            return false;
          }

          if (node.isError) {
            throw new Error(`Statement unparseable at [${start}, ${end}] for ${input}`);
          }

          const nodeInput = input.slice(start, end);

          stack.push({
            nodeInput,
            args: []
          });
        },

        leave(node, start, end) {

          if (node.isSkipped) {
            return;
          }

          const {
            nodeInput,
            args
          } = stack.pop() as StackEntry;

          const parent = stack[stack.length - 1];

          const interpreter: IInterpreter = self.grammar.getEditorInfo().getInterpreter(grammarTag);
          const expr = interpreter.evaluate(node, nodeInput, args);

          parent.args.push(expr);
        }
      });
    } catch (e) {
      console.log('err = ' + e);
    }

    return root.args[root.args.length - 1];
  }

  evaluate(grammarTag: string, expression: string, context: Record<string, any> = {}) {

    const {
      tree: parseTree,
      parsedContext
    } = parse(this.grammar, grammarTag, expression, context);

    const root = this._buildExecutionTree(grammarTag, parseTree, expression);
    const results = root(parsedContext);

    if (results.length === 1) {
      return results[0];
    } else {
      return results;
    }
  }

}

export default function evaluate(grammar: IGrammar, grammarTag: string, expression: string, context: Record<string, any> = {}) {
  const executor = new GrammarExecutor(grammar);

  return executor.evaluate(grammarTag, expression, context);
}