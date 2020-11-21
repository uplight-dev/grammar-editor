import * as CodeMirror from 'codemirror';
import { NodeType } from 'lezer';
import { IGrammar } from '@lezer-editor/lezer-editor-common';
import { debounce, entries } from 'lodash-es';
import { FunctionalComponent, h } from "preact";
import { Ref, useRef, useState } from "preact/hooks";
import { useEffect } from "react";
import { Stack } from 'stack-typescript';
import { Node, TreeNode } from './treenode';
import { evaluate, parse } from '../util/index';
import jsext from '../util/jsext';
import { useStore } from '../ctx/ctx';

const GrammarInspector: FunctionalComponent<any> = () => {
  const [storeState, storeActions] = useStore();

  if (!storeState.grammar) {
    return (<div>Loading ...</div>);
  }

  const codeEditorElement = useRef<HTMLTextAreaElement>(null);
  const contextEditorElement = useRef<HTMLTextAreaElement>(null);
  const grammarTagSelect: Ref<HTMLSelectElement> = useRef();


  const tags = storeState.grammar.getEditorInfo().getGrammarTags();
  if (!tags || tags.length == 0) {
    alert('Invalid grammar provided!')
    throw "Invalid grammar provided!";
  }
  const tag = tags[0]

  const [state, setState] = useState<State>({
    syntaxHighlight: true,
    grammarTags: storeState.grammar.getEditorInfo().getGrammarTags(),
    grammarTag: tag,
    treeRoot: new Node(tag, 0, 0, []),
    treeSelection: null,
    output: null,
    outputError: null,
    contextParseError: null,
    treeTokens : [],
    syntaxMarks : [],
    oldSelectionMark: null,
    selectionMark: null,
    context : null,
    codeEditor: null,
    contextEditor: null
    });

  function _(fn: (s: State) => any) {
    setState(s => ({ ...s, ...fn(s) } as State));
  }

  function parseParams(): { [k: string]: string } {
    const hash = window.location.hash;
    console.log('location=' + hash)

    const [expression, contextString, syntaxHighlight, grammarTag] = hash.slice(1).split(';').filter(v => {
      return v && v !== '';
    }).map(decodeURIComponent);

    return {
      expression,
      contextString,
      syntaxHighlight,
      grammarTag
    };
  }

  function mapParamsToState(params: Record<string, string>) {
    _(s => {
      return entries(params).reduce((p, [k, v]) => {
        let r = v || s[k];
        console.log(`mapParamsToState: ${jsext.toStr({k,r})}`);
        return jsext.toMap(k, r);
      }, {});
    })
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

  const handleEditorOver = function (event: MouseEvent) {
    if (!state.codeEditor) {
      return;
    }

    const position = state.codeEditor.coordsChar({
      left: event.clientX,
      top: event.clientY
    }, 'window');

    const index = state.codeEditor.getDoc().indexFromPos(position);

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

  //
  //
  // ============================================================== EFFECTS
  //
  //

  useEffect(() => {
    let codeEditor = CodeMirror.fromTextArea(codeEditorElement.current, {
      lineNumbers: true,
      mode: null
    });

    const updateExpression = () => {
      _(s => ({ expression: codeEditor.getDoc().getValue() }));
    };

    codeEditor.on('change', updateExpression);

    let contextEditor = CodeMirror.fromTextArea(contextEditorElement.current, {
      mode: { name: 'javascript', json: true },
      theme: 'default'
    });

    const updateContext = () => {
      _(s => ({ contextString: contextEditor.getDoc().getValue() }));
    };

    contextEditor.on('change', updateContext);

    _(s => ({codeEditor, contextEditor}));

    //=========================

    return () => {
      codeEditor.toTextArea();
      contextEditor.toTextArea();
      parseContext.cancel();
    }
  }, []);

  useEffect(() => {
    evaluateExpression(state.grammarTag, storeState.expression, state.context);
    renderSyntax(state.codeEditor, state.treeTokens);

    return () => {
      evaluateExpression.cancel();
    }
  }, [state.treeRoot])

  useEffect(() => {
    evaluateExpression(state.grammarTag, storeState.expression, state.context);

    return () => {
      evaluateExpression.cancel();
    }
  }, [state.context])

  useEffect(() => {
    renderSelection(state.codeEditor, state.treeSelection);

    return () => {
      renderSelection.cancel();
    }
  }, [state.treeSelection]);

  useEffect(() => {
    if (storeState.expression == undefined) {
      return;
    }
    updateStack(state.grammarTag, storeState.expression, state.context, state.syntaxHighlight);

    return () => {
      updateStack.cancel();
    }
  }, [storeState.expression, storeState.contextStr, state.grammarTag]);

  useEffect(() => {
    let markEl = state.oldSelectionMark;

    if (markEl) {
      clearMark(markEl);
    }
    _(s => ({oldSelectionMark: s.selectionMark}))
  }, [state.selectionMark])

  useEffect(() => {
    console.log('Grammar changed!')
    updateStack(state.grammarTag, storeState.expression, state.context, state.syntaxHighlight);
    state.grammarTags = storeState.grammar.getEditorInfo().getGrammarTags();
  }, [storeState.grammar])

  return (
    <div style={{height: '100%', padding: '20px'}}>

      <div className="hcontainer flex-vcenter" style={{ height: '30px'}}>
        <label>
          Root
          <select className="typeselect" name="grammarTag" ref={grammarTagSelect} value={state.grammarTag} onChange={(e: Event) => _(s => ({ grammarTag: (e.target as HTMLSelectElement).value }))}>
            {state?.grammarTags?.map((tag) => {
              return (<option value={tag}>{tag}</option>);
            }
            )};
          </select>
        </label>
      </div>

      <div className="hcontainer" style={{height: 'calc(100% - 60px)'}}>

        <div className="vcontainer" style="flex: .6">
          <div className="container code-editor">
            <div className="content" onMouseMove={handleEditorOver.bind(this)}>
              <textarea name="expression" ref={codeEditorElement} value={storeState.expression}></textarea>
            </div>

          </div>

          <div className="hcontainer">
            <div className="container context-editor">

              <h3 className="legend">Input</h3>

              <div className="content">
                <textarea name="contextString" ref={contextEditorElement} value={storeState.contextStr}></textarea>
              </div>

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
  // expression: string;
  // contextString: string;
  syntaxHighlight: boolean;
  grammarTag: string;
  grammarTags: string[];
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
  codeEditor: CodeMirror.Editor;
  contextEditor: CodeMirror.Editor;
}

interface CMMark {
  clear(): void;
}


// const Home = () => {
//   const [state, actions] = useStore();

//   return <GrammarComponent grammar={state.grammar}></GrammarComponent>
// }

export default GrammarInspector;
