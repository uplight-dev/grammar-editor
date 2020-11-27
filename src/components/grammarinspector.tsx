import * as CodeMirror from 'codemirror';
import { NodeType } from 'lezer';
import { debounce, first } from 'lodash-es';
import { FunctionalComponent, h } from "preact";
import { Ref, useRef, useState, useEffect } from "preact/hooks";
import { Stack } from 'stack-typescript';
import { DEF_LAYOUT, useStore } from '../ctx/ctx';
import { evaluate, parse } from '../util/index';
import CodeMirrorExt from './codemirrorext';
import { Node, TreeNode } from './treenode';
import {GridStack} from 'gridstack';
import 'gridstack/dist/gridstack.min.css';
import Toggle from 'react-toggle'
import Button from './button';

const GrammarInspector: FunctionalComponent<any> = () => {
  const [storeState, storeActions] = useStore();

  if (!storeState.grammar) {
    return (<div>Loading ...</div>);
  }

  const codeEditor = useRef<CodeMirror.Editor>(null);
  const contextEditor = useRef<CodeMirror.Editor>(null);
  const grammarTagSelect: Ref<HTMLSelectElement> = useRef();

  let layoutSaving = false;

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
    grid: null,
    layouting: false,
    layoutingClassName: '',
    layoutSaving: false
    });

  function _(fn: (s: State) => any) {
    setState(s => {
      const newState = ({ ...s, ...fn(s) } as State);
      return newState;
    });
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
    let s0 = {};

    if (node && editor) {
      markEl = mark(editor, node, 'selection');

      if (node.error) {
        s0 = {outputError : node.error};
      }
    }

    _(s => ({...s0, selectionMark: markEl}));

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
    let firstErr = null;

    const {
      tree,
      parsedInput
    } = parse(storeState.grammar, grammarTag, expression, rawContext);

    if (tree != null) {
      tree.iterate({
        enter(node: NodeType, start: number, end: number) {

          const {
            name
          } = node;

          const input = parsedInput.slice(start, end);

          const error = node.isError ? `Statement unparseable at [${start}, ${end}] for '${input}'` : null;
          if (error && !firstErr) {
            firstErr = error;
          }

          const n = new Node(name, start, end, [], storeState.grammar.getEditorInfo().getTokenType(node)!, node.isSkipped, error);

          stack.push(n);

        },

        leave(node: NodeType, start: number, end: number) {

          const current = stack.pop();

          // if (current.skip) {
          //   return;
          // }

          const parent = stack.top;

          parent.children.push(current);

          if (syntaxHighlight && current.tokenType || current.error) {
            tokens.push(current);
          }
        }
      });
    }

    _(s => {
      let r : any = { treeRoot: stack.top.children[stack.top.children.length - 1], treeTokens: tokens};
      r = {...r, outputError: firstErr};
      return r;
    })

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
      _(s => ({ output: output }));
    } catch (err) {
      console.error(err);
      _(s => ({ output: null }));
    }
  }, 300);

  const updateExpression = (val) => {
    storeActions.setExpression(val)
  };

  const updateContext = (val) => {
    storeActions.setContextStr(val)
  };

  const onLayoutChange = (grid) => {
    console.log('Layout changed!')
    if (!grid) {
      return;
    }
    _(s => ({layoutSaving : true}));
    const layout = grid.save(false);
    storeActions.setLayout(layout)
    setTimeout(() => {
      _(s => ({layoutSaving : false}));
    }, 500);
  }

  //
  //
  // ============================================================== EFFECTS
  //
  //

  useEffect(() => {
    const grid = GridStack.init({column: 12, minRow: 1, cellHeight: 64, disableOneColumnMode: false, animate: false, staticGrid: true});
    if (storeState && storeState.layout) {
      grid.load(storeState.layout);
    }
    _(s => ({grid: grid}));

    grid.on('change', () => onLayoutChange(grid));
  }, []);

  useEffect(() => {
    if (state.grid)
      state.grid.setStatic(!state.layouting);
  }, [state.layouting]);

  useEffect(() => {
    if (state.grid && storeState.layout) {
      if (state.layoutSaving) {
        console.log('grid not reloaded: layout saving is in progress')
      } else {
        console.log('grid reloaded')
        state.grid.load(storeState.layout);
      }
    }
  }, [storeState.layout]);

  useEffect(() => {
    evaluateExpression(storeState.grammarTag, storeState.expression, storeState.contextStr);
    codeEditor && renderSyntax(codeEditor?.current, state.treeTokens);

    return () => {
      evaluateExpression.cancel();
    }
  }, [state.treeRoot])

  useEffect(() => {
    evaluateExpression(storeState.grammarTag, storeState.expression, storeState.contextStr);
    parseContext(storeState.contextStr)

    return () => {
      evaluateExpression.cancel();
      parseContext.cancel();
    }
  }, [storeState.contextStr])

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
    updateStack(storeState.grammarTag, storeState.expression, storeState.contextStr, state.syntaxHighlight);

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
    updateStack(storeState.grammarTag, storeState.expression, storeState.contextStr, state.syntaxHighlight);
  }, [storeState.grammar])

  return (
    <div style={{overflowX:'hidden', overflowY: 'auto', height: '100%'}}>
    <div class="grid-stack" style={{width:'100%'}}>

        <div data-gs-id="grid-cfg" className={"grid-stack-item content " + state.layoutingClassName}>
          <div className="grid-stack-item-content flex-vcenter hcontainer toolbar">
            <label>
              Root Node
              <select className="typeselect" name="grammarTag" ref={grammarTagSelect} value={storeState.grammarTag} onChange={(e: Event) => _(s => ({ grammarTag: (e.target as HTMLSelectElement).value }))}>
                {storeState?.grammarTags?.map((tag) => {
                  return (<option value={tag}>{tag}</option>);
                }
                )};
              </select>
            </label>

            <label>Layout: </label>

            <div style={{display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '10px', border: '1px solid grey', padding: '5px'}}>
              <Toggle
                id="layouting-toggle"
                checked={state.layouting}
                onChange={() => {_(s => ({layouting: !s.layouting, layoutingClassName: !s.layouting ? 'layouting': ''}))}} />
              <label htmlFor='layouting-toggle'>{state.layouting ? "Editable" : "Static"}</label>
              <Button className="orange" onClick={() => {storeActions.setLayout(DEF_LAYOUT)}}>Reset</Button>
            </div>

          </div>
        </div>

        <div data-gs-id="grid-codeEditor" className={"grid-stack-item content " + state.layoutingClassName} >
          <div className="grid-stack-item-content">
            <CodeMirrorExt ref={codeEditor} value={storeState.expression} onChange={updateExpression} onEditorOver={handleEditorOver}
              opts={{lineNumbers: true, mode: null}}></CodeMirrorExt>
          </div>
        </div>

        <div data-gs-id="grid-tree" className={"grid-stack-item content " + state.layoutingClassName}>
          <div className="grid-stack-item-content">
            <TreeNode node={state.treeRoot} onSelect={selectExpression} selection={state.treeSelection} />
          </div>
        </div>

        <div data-gs-id="grid-context" className={"grid-stack-item context-editor content " + state.layoutingClassName}>
          <div className="grid-stack-item-content vcontainer">
            <h3 className="input-label caption">Input</h3>
            <CodeMirrorExt ref={contextEditor} value={storeState.contextStr} onChange={updateContext}
              opts={{mode: { name: 'javascript', json: true }, theme: 'default'}}></CodeMirrorExt>
            <div className="info-block hcontainer" style={{minHeight: '50px', alignItems: 'center'}}>
              <span>
                {state.contextParseError && (
                  <div className="err">JSON parsing failed. Please check your input.</div>
                )}
                {!state.contextParseError && (
                  <div>JSON parsed OK</div>
                )}
              </span>
            </div>
          </div>
        </div>
                
        <div data-gs-id="grid-output" className={"grid-stack-item content " + state.layoutingClassName}>
          <div className="grid-stack-item-content">
            <h3 className="output-label caption">Output</h3>
            <div className="output-result info-block">{state.output && JSON.stringify(state.output) || ''}</div>
          </div>
        </div>

        <div data-gs-id="grid-outputErr" className={"grid-stack-item content " + state.layoutingClassName}>
          <div className="grid-stack-item-content">
            <h3 className="output-label caption">Errors</h3>
            <div className="grid-stack-item-content info-block">
              {!state.outputError && (
                <div>None</div>
              )}
              {state.outputError && (
                <div className="err">{ state.outputError}</div>
              )}
            </div>
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
  grid: any;
  layouting: boolean;
  layoutingClassName: string;
  layoutSaving: boolean;
}

interface CMMark {
  clear(): void;
}

export default GrammarInspector;
