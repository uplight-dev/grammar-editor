import * as CodeMirror from 'codemirror';
import { NodeType } from 'lezer';
import { debounce } from 'lodash-es';
import { FunctionalComponent, h } from "preact";
import { Ref, useRef, useState } from "preact/hooks";
import { useEffect } from "react";
import { Stack } from 'stack-typescript';
import { useStore } from '../ctx/ctx';
import { evaluate, parse } from '../util/index';
import CodeMirrorExt from './codemirrorext';
import { Node, TreeNode } from './treenode';

const GrammarInspector: FunctionalComponent<any> = () => {
  const [storeState, storeActions] = useStore();

  if (!storeState.grammar) {
    return (<div>Loading ...</div>);
  }

  const codeEditor = useRef<CodeMirror.Editor>(null);
  const contextEditor = useRef<CodeMirror.Editor>(null);
  const grammarTagSelect: Ref<HTMLSelectElement> = useRef();


  const tags = storeState.grammar.getEditorInfo().getGrammarTags();
  if (!tags || tags.length == 0) {
    alert('Invalid grammar provided!')
    throw "Invalid grammar provided!";
  }

  const [state, setState] = useState<State>({
    syntaxHighlight: true,
    treeRoot: new Node(storeState.grammarTag, 0, 0, []),
    treeSelection: null,
    output: null,
    outputError: null,
    contextParseError: null,
    treeTokens : [],
    syntaxMarks : [],
    oldSelectionMark: null,
    selectionMark: null,
    context : null
    });

  function _(fn: (s: State) => any) {
    setState(s => ({ ...s, ...fn(s) } as State));
  }

  function mark(editor: CodeMirror.Editor, node: Node, className?: string): CMMark {

    const doc = editor.getDoc();

    let start = node.start;
    let end = node.end;

    let type = '';

    if (start === end) {

      if (start > 0) {
        start--;
        type = '-after';
      } else {
        end++;
        type = '-before';
      }
    }

    const startCoords = doc.posFromIndex(start);

    const endCoords = doc.posFromIndex(end);

    return editor.markText(
      startCoords,
      endCoords,
      { className: `mark-${className}${type}` }
    );
  }

  function selectExpression(node: Node) {
    _(s => ({ treeSelection: node }));
  }

  function clearMark(mark: CMMark) {
    mark.clear();
  }

  function renderSyntax(editor: CodeMirror.Editor, treeTokens: Node[]) {

    console.time('renderSyntax');

    state.syntaxMarks.forEach(clearMark);

    if (editor) {
      let syntaxMarks = [];
      treeTokens.forEach(n => {
        let m: CMMark = mark(editor, n, n.tokenType);
        syntaxMarks.push(m);
      });
      _(s => ({ syntaxMarks: syntaxMarks }))
    }

    console.timeEnd('renderSyntax');
  }

  const renderSelection = debounce(function renderSelection(editor: CodeMirror.Editor, node: Node | null) {
    //console.time('renderSelection');
    let markEl;

    if (node && editor) {
      markEl = mark(editor, node, 'selection');
    }

    _(s => ({selectionMark: markEl}));

    //console.timeEnd('renderSelection');
  })

  const handleEditorOver = function (editor: CodeMirror.Editor, event: MouseEvent) {
    const position = editor.coordsChar({
      left: event.clientX,
      top: event.clientY
    }, 'window');

    const index = editor.getDoc().indexFromPos(position);

    const selectedNode = findTreeNode(index, state.treeRoot);

    if (selectedNode !== state.treeSelection) {
      _(s => ({ treeSelection: selectedNode }));
    }
  }

  function findTreeNode(index: number, treeRoot: Node): Node | null {

    if (index >= treeRoot.end || index <= treeRoot.start) {
      return null;
    }

    let node = treeRoot;

    outer: for (; ;) {

      // find child that matches node
      for (const child of node.children) {

        if (child.start <= index && child.end > index) {
          if (!child.children.length) {
            return child;
          }

          node = child;

          continue outer;
        }
      }

      // no child found, must be myself
      return node;
    }

  }

  const updateStack = debounce(function updateStack(grammarTag: string, expression: string, rawContext: Object, syntaxHighlight: boolean) {
    rawContext = rawContext || {};

    console.time('updateStack');

    const stack: Stack<Node> = new Stack();
    stack.push(new Node('', 0, 0, []));

    const tokens: Node[] = [];

    const {
      tree,
      parsedInput
    } = parse(storeState.grammar, grammarTag, expression, rawContext);

    let txt = '';

    let indent = 0;

    if (tree != null) {
      tree.iterate({
        enter(node: NodeType, start: number, end: number) {

          const {
            name
          } = node;

          const parent = stack.tail;

          const skip = name === parsedInput.slice(start, end);

          const error = node.isError

          const _node = {
            name,
            start,
            end,
            children: [],
            error,
            skip
          };

          stack.push(new Node(name, start, end, [], storeState.grammar.getEditorInfo().getTokenType(node)!));

        },

        leave(node: NodeType, start: number, end: number) {

          const current = stack.pop();

          if (current.skip) {
            return;
          }

          const parent = stack.top;

          parent.children.push(current);

          if (syntaxHighlight && current.tokenType || current.error) {
            tokens.push(current);
          }
        }
      });
    }

    _(s => ({ treeRoot: stack.top.children[stack.top.children.length - 1], treeTokens: tokens }))

    console.timeEnd('updateStack');
  }, 300);

  const parseContext = debounce(function parseContext(contextString: string) {
    try {
      let context = JSON.parse(contextString);

      if (typeof context !== 'object') {
        context = {};
        throw new Error('expected Object literal');
      }
      _(s => ({ contextParseError: null, context: context }))
    } catch (err) {
      _(s => ({ contextParseError: err, context: null }))
    }
  }, 300);

  const evaluateExpression = debounce(function evaluateExpression(grammarTag: string, expression: string, context: any) {
    console.log('evaluateExpression')
    context = context || {};

    try {
      let output = evaluate(storeState.grammar, grammarTag, expression, context);
      if (!output) {
        throw Error(`Cannot evaluate expression: ${expression}.`);
      }
      _(s => ({ output: output, outputError: null }));
    } catch (err) {
      console.error(err);
      _(s => ({ output: null, outputError: err }));
    }
  }, 300);

  const updateExpression = (val) => {
    storeActions.setExpression(val)
  };

  const updateContext = (val) => {
    storeActions.setContextStr(val)
  };

  //
  //
  // ============================================================== EFFECTS
  //
  //

  useEffect(() => {

  }, []);

  useEffect(() => {
    evaluateExpression(storeState.grammarTag, storeState.expression, state.context);
    codeEditor && renderSyntax(codeEditor?.current, state.treeTokens);

    return () => {
      evaluateExpression.cancel();
    }
  }, [state.treeRoot])

  useEffect(() => {
    evaluateExpression(storeState.grammarTag, storeState.expression, state.context);

    return () => {
      evaluateExpression.cancel();
    }
  }, [state.context])

  useEffect(() => {
    codeEditor && renderSelection(codeEditor?.current, state.treeSelection);

    return () => {
      renderSelection.cancel();
    }
  }, [state.treeSelection]);

  useEffect(() => {
    console.log('expression, contextStr or grammarTag changed')
    if (storeState.expression == undefined) {
      return;
    }
    updateStack(storeState.grammarTag, storeState.expression, state.context, state.syntaxHighlight);

    return () => {
      updateStack.cancel();
    }
  }, [storeState.expression, storeState.contextStr, storeState.grammarTag]);

  useEffect(() => {
    let markEl = state.oldSelectionMark;

    if (markEl) {
      clearMark(markEl);
    }
    _(s => ({oldSelectionMark: s.selectionMark}))
  }, [state.selectionMark])

  useEffect(() => {
    console.log('Grammar changed!')
    updateStack(storeState.grammarTag, storeState.expression, state.context, state.syntaxHighlight);
  }, [storeState.grammar])

  return (
    <div style={{height: '100%', padding: '20px'}}>

      <div className="hcontainer flex-vcenter" style={{ height: '30px'}}>
        <label>
          Root
          <select className="typeselect" name="grammarTag" ref={grammarTagSelect} value={storeState.grammarTag} onChange={(e: Event) => _(s => ({ grammarTag: (e.target as HTMLSelectElement).value }))}>
            {storeState?.grammarTags?.map((tag) => {
              return (<option value={tag}>{tag}</option>);
            }
            )};
          </select>
        </label>
      </div>

      <div className="hcontainer" style={{height: 'calc(100% - 60px)'}}>

        <div className="vcontainer" style="flex: .6">
          <div className="container code-editor">
            <CodeMirrorExt ref={codeEditor} value={storeState.expression} onChange={updateExpression} onEditorOver={handleEditorOver}
              opts={{lineNumbers: true, mode: null}}></CodeMirrorExt>
          </div>

          <div className="hcontainer">
            <div className="container context-editor">

              <h3 className="legend">Input</h3>

              <CodeMirrorExt ref={contextEditor} value={storeState.contextStr} onChange={updateContext}
                opts={{mode: { name: 'javascript', json: true }, theme: 'default'}}></CodeMirrorExt>

              <div className="note">
                {state.contextParseError && (
                  <div>Failed to parse as JSON.</div>
                )}
                {!state.contextParseError && (
                  <div>Enter JSON object literal.</div>
                )}
              </div>
            </div>

            <div className="container output">

              <h3 className="legend">Output</h3>

              <div className="content">{state.output && JSON.stringify(state.output) || ''}</div>

              <div className="note err">
                {state.outputError && (
                  <div>Evaluation failed: { state.outputError.message}</div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="container tree" style="flex: .4">
          <div className="content">
            <TreeNode node={state.treeRoot} onSelect={selectExpression} selection={state.treeSelection} />
          </div>
        </div>

      </div>

    </div>
  );
};

interface State {
  syntaxHighlight: boolean;
  treeRoot: Node;
  treeSelection: Node | null;
  outputError: Error | null;
  output: string | null;
  contextParseError: string | null;
  treeTokens : Node[];
  syntaxMarks : CMMark[];
  oldSelectionMark: CMMark;
  selectionMark: CMMark;
  context : any;
}

interface CMMark {
  clear(): void;
}

export default GrammarInspector;
