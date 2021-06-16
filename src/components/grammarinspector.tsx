import { ASTIterator, ASTNode, ASTNodeVisitor, HydratedASTNode, HydratedASTNodeImpl, OPTION_ROOT_TAGS } from '@grammar-editor/grammar-editor-api';
import * as CodeMirror from 'codemirror';
import { GridStack } from 'gridstack';
import 'gridstack/dist/gridstack.min.css';
import { debounce } from 'lodash-es';
import { FunctionalComponent, h } from "preact";
import { Ref, useEffect, useRef, useState } from "preact/hooks";
import Toggle from 'react-toggle';
import { Stack } from 'stack-typescript';
import { DEF_LAYOUT, useStore } from '../store/store';
import StyledButton from './styledbutton';
import CodeMirrorExt from './codemirrorext';
import { TreeNode } from './treenode';
import BigMessage from './bigmessage';

const GrammarInspector: FunctionalComponent<any> = () => {
  const [storeState, storeActions] = useStore();

  const tags = storeState.grammarTags;
  if (!storeState.editorGrammar || !tags || tags.length == 0) {
    return (<BigMessage msg="Invalid Grammar ..."></BigMessage>);
  }

  const codeEditor = useRef<CodeMirror.Editor>(null);
  const contextEditor = useRef<CodeMirror.Editor>(null);
  const grammarTagSelect: Ref<HTMLSelectElement> = useRef();

  const [state, setState] = useState<State>({
    syntaxHighlight: true,
    tree: null,
    treeRoot: new HydratedASTNodeImpl({name: storeState.grammarTag, start: 0, end: 0, children: []}),
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

  function mark(editor: CodeMirror.Editor, node: ASTNode, className?: string): CMMark {

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

  function renderSyntax(editor: CodeMirror.Editor, treeTokens: ASTNode[]) {

    console.time('renderSyntax');

    state.syntaxMarks.forEach(clearMark);

    if (editor) {
      let syntaxMarks = [];
      treeTokens.forEach(n => {
        let m: CMMark = mark(editor, n, !n.error ? 'builtin' : 'error');
        syntaxMarks.push(m);
      });
      _(s => ({ syntaxMarks: syntaxMarks }))
    }

    console.timeEnd('renderSyntax');
  }

  const renderSelection = debounce(function renderSelection(editor: CodeMirror.Editor, node: ASTNode | null) {
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

  function findTreeNode(index: number, treeRoot: HydratedASTNode): ASTNode | null {

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

  const updateStack = debounce(async function updateStack(grammarTag: string, expression: string, rawContext: Object, syntaxHighlight: boolean) {
    rawContext = rawContext || {};

    console.time('updateStack');

    const stack: Stack<HydratedASTNode> = new Stack();
    stack.push(new HydratedASTNodeImpl({name: '', start: 0, end: 0, children: []}));

    const tokens: ASTNode[] = [];
    let firstErr = null;

    const tree = await storeState.editorGrammar.plugin.parse(grammarTag, expression, storeState.editorGrammar.grammar.jsonMapping);

    if (tree != null) {
      tree.traverse({//hydrate the ASTNode even further with errors, etc.
        enter(node: HydratedASTNode) {

          const {
            name,
            start,
            end
          } = node;

          const input = expression.slice(start, end);

          const error = node.error ? `Statement unparseable at [${start}, ${end}] for '${input}'` : null;
          if (error && !firstErr) {
            firstErr = error;
          }

          const n = new HydratedASTNodeImpl({name, start, end, children: [], skip: node.skip, error});

          stack.push(n);

        },

        leave(node: HydratedASTNode) {

          const current = stack.pop();

          // if (current.skip) {
          //   return;
          // }

          const parent = stack.top;

          parent.children.push(current);

          if (syntaxHighlight && current.error) {
            tokens.push(current);
          }
        }
      });
    }

    _(s => {
      let r : any = { treeRoot: stack.top.children[stack.top.children.length - 1], treeTokens: tokens, tree};
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
      if (!state.tree) {
        return;
      }
      let output = storeState.editorGrammar.plugin.eval(grammarTag, expression, context);
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
      //why?! need to clone spread arr otherwise err: Cannot assign to read only property '0' of object '[object Array]'
      grid.load([...storeState.layout]);
    }
    _(s => ({grid}));

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
  }, [storeState.editorGrammar])

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

            <div className="option-set">
              <Toggle
                id="layouting-toggle"
                checked={state.layouting}
                onChange={() => {_(s => ({layouting: !s.layouting, layoutingClassName: !s.layouting ? 'layouting': ''}))}} />
              <label htmlFor='layouting-toggle'>{state.layouting ? "Editable" : "Static"}</label>
              <StyledButton className="orange" onClick={() => {storeState.notifyShow('Layout reset to default values!', 'success');storeActions.setLayout(DEF_LAYOUT);}}>Reset</StyledButton>
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
  tree: ASTIterator<HydratedASTNode>;
  treeRoot: HydratedASTNode;
  treeSelection: HydratedASTNode | null;
  outputError: Error | null;
  output: string | null;
  contextParseError: string | null;
  treeTokens : HydratedASTNode[];
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
