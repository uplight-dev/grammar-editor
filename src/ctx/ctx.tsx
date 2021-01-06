import { JSONMapping, OPTION_ROOT_TAGS } from '@lezer-editor/lezer-editor-common';
import { createHook, createStore, Store } from 'react-sweet-state';
import store from 'store';
import uuid from 'uuid/v4';
import { EditorGrammar, EditorGrammarUtils } from '../util/editorgrammar';
import jsext from '../util/jsext';
import GrammarLoader from '../util/parserplugin/loader';

const DEMO_GRAMMAR_URL = 'https://cdn.jsdelivr.net/npm/@lezer-editor/lezer-example-grammar@1.0.1/dist';

export const DEF_LAYOUT = [
    {
      "x": 0,
      "y": 0,
      "width": 12,
      "height": 1,
      "minWidth": 3,
      "maxHeight": 1,
      "id": "grid-cfg"
    },
    {
      "x": 0,
      "y": 1,
      "width": 6,
      "height": 2,
      "id": "grid-codeEditor"
    },
    {
      "x": 6,
      "y": 1,
      "width": 6,
      "height": 11,
      "id": "grid-tree"
    },
    {
      "x": 0,
      "y": 3,
      "width": 6,
      "height": 11,
      "id": "grid-context"
    },
    {
      "x": 6,
      "y": 12,
      "width": 2,
      "height": 2,
      "id": "grid-output"
    },
    {
      "x": 8,
      "y": 12,
      "width": 4,
      "height": 2,
      "id": "grid-outputErr"
    }
  ];

function filterPersistentState(state: any) {
    return {
        clientId: state.clientId,
        expression: state.expression,
        contextStr: state.contextStr,
        grammarTag: state.grammarTag,
        repos: state.repos,
        repoIdx: state.repoIdx,
        layout: state.layout
    }
}

function filterSharableState(state: any) {
    return {
        expression: state.expression,
        contextStr: state.contextStr,
        grammarTag: state.grammarTag,
        repos: state.repos,
        repoIdx: state.repoIdx,
        layout: state.layout
    }
}

function mergeData(state, data) {
    data = filterPersistentState(data);
    state = {...state, ...data}
    return state;
}

async function localStorageReload(props: StoreProps) {
    const {setState, getState, dispatch} = props;
    let dataObj = store.get('dataStr');
    let data = null;
    let state = {...getState()};

    console.log(`localStorageReload: ${jsext.toStr(dataObj)}`)
    if (dataObj){
        if (typeof dataObj === 'string') {
            data = JSON.parse(dataObj);
        } else {
            data = dataObj;
        }
        state = mergeData(state, data);
    }

    await activeGrammarChanged(state.grammarIdx, {...props, getState: () => state});
}

async function activeGrammarChanged(grammarIdx: number, props: StoreProps) {
    const {setState, getState, dispatch} = props;

    const grammar = getState().grammars[grammarIdx];
    //attempt to load plugin ...
    if (!grammar.plugin) {
        const grammarPlugin = await getState().grammarLoader.load(grammar.url, grammar.jsonMapping);
        grammar.plugin = grammarPlugin;
    }
    const grammarTags = [...await grammar.plugin.getOption(OPTION_ROOT_TAGS)];
    
    setState({
        ...getState(),
        grammarIdx,
        grammar,
        grammarTags,
        grammarTag: grammarTags?.length > 0 && grammarTags[0]
    })
    dispatch(actions.stateToStorage())
}

const actions = {
    init: () => async (props: StoreProps) => {
        const {setState, getState, dispatch} = props;

        //init
        const clientId = uuid();
        setState({
            ...getState(),
            clientId,
            grammarLoader: new GrammarLoader(clientId)
        });

        //load grammar
        localStorageReload({setState, getState, dispatch});
    },

    addGrammarByUrl: (url: string, jsonMapping: JSONMapping) => async (props: StoreProps) => {
        const {getState, dispatch} = props;
        const grammarPlugin = await getState().grammarLoader.load(url, jsonMapping);
        const grammar = await EditorGrammarUtils.from(url, grammarPlugin);
        const grammars = [grammar, ...getState().grammars];

        dispatch(actions.setGrammars(grammars))
        dispatch(actions.setGrammarIdx(0));
    },

    setGrammars: (grammars) => async (props: StoreProps) => {
        const {setState, getState, dispatch} = props;
        setState({
            ...getState(),
            grammars
        });
        dispatch(actions.stateToStorage())
    },

    // setGrammarByUrl: async (url: string) => async (props: StoreProps) => {
    //     const {setState, getState, dispatch} = props;
    //     const grammar = await getState().grammarLoader.load(url, getState().);
    
    //     await grammarChanged(grammar, props)
    // },

    addGrammar: (grammar: EditorGrammar) => async (props: StoreProps) => {
        const {setState, getState, dispatch} = props;
        const ret = [grammar, ...getState().grammars];

        dispatch(actions.setGrammars(ret));
        dispatch(actions.setGrammarIdx(0));
    },

    updateGrammar: (idx: number, grammar : EditorGrammar) => async (props: StoreProps) => {
        const {setState, getState, dispatch} = props;
        const grammars = [...getState().grammars];
        grammars[idx] = grammar;

        setState({
            ...getState(),
            grammars
        })
        if (idx == getState().grammarIdx) {
            await activeGrammarChanged(idx, props);
        }
        dispatch(actions.stateToStorage())
    },

    setGrammarIdx: (idx: number) => async (props: StoreProps) => {
        const {dispatch} = props;
        
        await activeGrammarChanged(idx, props);
        dispatch(actions.stateToStorage())
    },

    setExpression: (expr) => (props: StoreProps) => {
        const {setState, getState, dispatch} = props;
        setState({
            ...getState(),
            expression: expr
        });
        dispatch(actions.stateToStorage())
    },
    
    setContextStr: (contextStr) => (props: StoreProps) => {
        const {setState, getState, dispatch} = props;
        setState({
            ...getState(),
            contextStr: contextStr
        });
        dispatch(actions.stateToStorage())
    },

    setLayout: (layout) => (props: StoreProps) => {
        const {setState, getState, dispatch} = props;
        setState({
            ...getState(),
            layout
        });
        dispatch(actions.stateToStorage())
        getState().notifyShow('Layout saved!', 'success')
    },

    setNotifyShow: (notifyShow) => (props: StoreProps) => {
        const {setState, getState, dispatch} = props;
        setState({
            ...getState(),
            notifyShow: notifyShow
        });
    },

    import: (dataStr, includeLayout) => (props: StoreProps) => {
        try {
            let data = JSON.parse(dataStr);
            data = filterSharableState(data);
            if (!includeLayout) {
                data.layout = null;
            }
            localStorage.setItem('dataStr', JSON.stringify(data))
            localStorageReload(props)
            props.getState().notifyShow('Import successfull', 'success')
        } catch (e) {
            console.log('Cannot import! ' + e)
        }
    },

    export: () => (props: StoreProps) => {
        const {setState, getState, dispatch} = props;
        let data = filterSharableState(getState());
        let dump = JSON.stringify(data, null, 2)
        return dump;
    },
    
    stateToStorage: () => (props: StoreProps) => {
        const {setState, getState, dispatch} = props;
        let data = filterPersistentState(getState());
        store.set('dataStr', JSON.stringify(data));
    }
}

const Store = createStore({
    initialState: {
        clientId: null,
        shareStr: null,
        expression: 'var1 = "hello world";\nprint(var1)',
        contextStr: JSON.stringify({person: {name: 'John', surname: 'Doe'}}),
        grammars: [],
        grammarIdx: 0,
        grammar: null,
        grammarTag: null,
        grammarTags: [],
        grammarLoader: null,
        notifyShow: (...args) => {console.warn('Notify not inited yet ...')},
        layout: DEF_LAYOUT
    } as StoreType,
    actions,
    name: 'store'
});

interface StoreType {
    clientId: string,
    shareStr: string,
    expression: string,
    contextStr: string,
    grammars: EditorGrammar[],
    grammarIdx: number,
    grammar: EditorGrammar,
    grammarTag: string,
    grammarTags: string[],
    grammarLoader: GrammarLoader,
    notifyShow: (...args : any) => void,
    layout: []
}

interface StoreProps {
    setState: (state: StoreType) => void;
    getState: () => StoreType;
    dispatch: any;
}

export const useStore = createHook(Store);
