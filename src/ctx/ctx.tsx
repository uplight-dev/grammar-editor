import { JSONMapping, OPTION_ROOT_TAGS } from '@grammar-editor/grammar-editor-api';
import { defaults, createHook, createStore } from 'react-sweet-state';
import store from 'store';
import uuid from 'uuid/v4';
import { DEFAULT_JSON_MAPPING, EditorGrammar, EditorGrammarUtils, Grammar } from '../util/editorgrammar';
import jsext from '../util/jsext';
import GrammarLoader from '../util/parserplugin/loader';
import {produce} from 'immer';
import JSExt from '../util/jsext';

defaults.mutator = (currentState, producer) => {
    const r = produce(currentState, producer);
    return r;
};
defaults.batchUpdates = false;

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

const PREDEFINED_GRAMMARS : Grammar[] = [
    new Grammar('Lezer', 'http://localhost:3000', {
        name: "name",
        start: "start", end: "end",
        skip: "skip",
        error: "error",
        value: "value",
        children: "children"
    }, [], true),
    new Grammar('Peg.js', 'https://cdn.jsdelivr.net/npm/@grammar-editor/lezer-example-grammar@1.0.1/dist', true),
    new Grammar('Chevrotain', 'https://cdn.jsdelivr.net/npm/@grammar-editor/lezer-example-grammar@1.0.1/dist', true)
];

const actions = {
    init: () => async (props: StoreProps) => {
        const {setState, getState, dispatch} = props;

        //load grammar
        dispatch(actions0.localStorageReload());
        //init
        const clientId = getState().clientId || await JSExt.getFingerprintID();
        setState(s => ({
             ...s,
             clientId,
             grammarLoader: new GrammarLoader(clientId)
        }));
        //notify updates
        dispatch(actions0.grammarsLoaded());
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
        setState(s => ({
            ...s,
            grammars
        }));
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

        setState(s => ({
            ...s,
            grammars
        }))
        if (idx == getState().grammarIdx) {
            //dispatch(actions0.activeGrammarChanged(idx));
        }
        dispatch(actions.stateToStorage())
    },

    setGrammarIdx: (idx: number) => async (props: StoreProps) => {
        const {dispatch} = props;
        
        dispatch(actions0.activeGrammarChanged(idx));
        dispatch(actions.stateToStorage())
    },

    setExpression: (expr) => (props: StoreProps) => {
        const {setState, getState, dispatch} = props;
        setState(s => ({
            ...s,
            expression: expr
        }));
        dispatch(actions.stateToStorage())
    },
    
    setContextStr: (contextStr) => (props: StoreProps) => {
        const {setState, getState, dispatch} = props;
        setState(s => ({
            ...s,
            contextStr: contextStr
        }));
        dispatch(actions.stateToStorage())
    },

    setLayout: (layout) => (props: StoreProps) => {
        const {setState, getState, dispatch} = props;
        setState(s => ({
            ...s,
            layout
        }));
        dispatch(actions.stateToStorage())
        getState().notifyShow('Layout saved!', 'success')
    },

    setNotifyShow: (notifyShow) => (props: StoreProps) => {
        const {setState, getState, dispatch} = props;
        setState( s => ({
            ...s,
            notifyShow: notifyShow
        }));
    },

    import: (dataStr, includeLayout) => (props: StoreProps) => {
        try {
            const {setState, getState, dispatch} = props;
            let data = JSON.parse(dataStr);
            data = filterSharableState(data);
            if (!includeLayout) {
                data.layout = null;
            }
            localStorage.setItem('dataStr', JSON.stringify(data))
            dispatch(actions0.grammarsLoaded())
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
        predefinedGrammars: PREDEFINED_GRAMMARS,
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

const actions0 = {    
    localStorageReload: () => (props: StoreProps) => {
        const {setState, getState, dispatch} = props;
    
        let dataObj = store.get('dataStr');
        let data = null;
        let state = null;
    
        console.log(`localStorageReload: ${jsext.toStr(dataObj)}`)
        if (dataObj){
            if (typeof dataObj === 'string') {
                data = JSON.parse(dataObj);
            } else {
                data = dataObj;
            }
            state = data;
        }
        setState(s => ({...s, ...state}));
    },

    grammarsLoaded: () => (props: StoreProps) => {
        const {getState, setState, dispatch} = props;

        let { grammars } = getState();
        grammars = [...grammars];
        const hasPredefined = grammars.find(g => g.isPredefined);
        if (!hasPredefined) {
            [...getState().predefinedGrammars].reverse().forEach(g => {
                const ng = EditorGrammar.build(g).set({isPredefined : false});
                grammars.unshift(ng);
            })
        }
        setState(s => ({...s, grammars}));

        dispatch(actions0.activeGrammarChanged(getState().grammarIdx));
    },
    
    activeGrammarChanged: (grammarIdx: number) => async (props: StoreProps) => {
        const {setState, getState, dispatch} = props;

        if (getState().grammars.length == 0) {
            setState(s => ({
                ...s,
                grammar: null,
                grammarTags : [],
                grammarTag: null
            }))
            return;
        }
    
        const grammar = getState().grammars[grammarIdx];
        //attempt to load plugin ...
        if (!grammar.plugin) {
            const grammarPlugin = await getState().grammarLoader.load(grammar.url, grammar.jsonMapping);
            grammar.plugin = grammarPlugin;
        }
        const grammarTags = [...await grammar.plugin.getOption(OPTION_ROOT_TAGS)];
        
        setState(s => ({
            ...s,
            grammar,
            grammarTags,
            grammarTag: grammarTags?.length > 0 && grammarTags[0]
        }))
        dispatch(actions.stateToStorage())
    }    
}

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

interface StoreType {
    clientId: string,
    shareStr: string,
    expression: string,
    contextStr: string,
    predefinedGrammars: Grammar[],
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
    setState: (producer: (draftState: StoreType) => void) => void;
    getState: () => StoreType;
    dispatch: any;
}

export const useStore = createHook(Store);
