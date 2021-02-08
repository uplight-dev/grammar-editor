import { OPTION_ROOT_TAGS } from '@grammar-editor/grammar-editor-api';
import { produce } from 'immer';
import { createHook, createStore, defaults } from 'react-sweet-state';
import store from 'store';
import { EditorGrammar, EditorGrammarUtils, Grammar } from '../util/editorgrammar';
import { default as jsext, default as JSExt } from '../util/jsext';
import GrammarLoader from '../util/grammarplugin/loader';

defaults.mutator = (currentState, producer) => {
    const r = produce(currentState, producer);
    return r;
};
defaults.batchUpdates = true;

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
    }, null, true),
    new Grammar('Peg.js', 'http://localhost:3000', {
        name: "name",
        start: "start", end: "end",
        skip: "skip",
        error: "error",
        value: "value",
        children: "children"
    }, null, true),
    new Grammar('Chevrotain', 'https://cdn.jsdelivr.net/npm/@grammar-editor/lezer-example-grammar@1.0.1/dist', null, null, true),

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

    addGrammarByUrl: (url: string) => async (props: StoreProps) => {
        const {getState, dispatch} = props;
        try {
            const grammarPlugin = await getState().grammarLoader.load(url);
            const editorGrammar = await EditorGrammarUtils.from(url, grammarPlugin);
            const editorGrammars = [editorGrammar, ...getState().editorGrammars];

            dispatch(actions.setGrammars(editorGrammars))
            dispatch(actions.setGrammarIdx(0));
        } catch (e) {
            getState().notifyShow(`Error loading grammar from: ${url}`, 'error')
        }
    },

    setGrammars: (editorGrammars) => async (props: StoreProps) => {
        const {setState, getState, dispatch} = props;
        setState(s => ({
            ...s,
            editorGrammars
        }));
        dispatch(actions.stateToStorage())
    },

    // setGrammarByUrl: async (url: string) => async (props: StoreProps) => {
    //     const {setState, getState, dispatch} = props;
    //     const grammar = await getState().grammarLoader.load(url, getState().);
    
    //     await grammarChanged(grammar, props)
    // },

    addGrammar: (editorGrammar: EditorGrammar) => async (props: StoreProps) => {
        const {setState, getState, dispatch} = props;
        const ret = [...getState().editorGrammars, editorGrammar];

        dispatch(actions.setGrammars(ret));
    },

    updateGrammar: (editorGrammarIdx: number, editorGrammar : EditorGrammar) => async (props: StoreProps) => {
        const {setState, getState, dispatch} = props;
        const editorGrammars = [...getState().editorGrammars];
        editorGrammars[editorGrammarIdx] = editorGrammar;

        setState(s => ({
            ...s,
            editorGrammars
        }))
        if (editorGrammarIdx == getState().editorGrammarIdx) {
            dispatch(actions0.activeGrammarChanged());
        }
        dispatch(actions.stateToStorage())
    },

    setGrammarIdx: (editorGrammarIdx: number) => async (props: StoreProps) => {
        const {dispatch, setState} = props;

        setState(s => ({
            ...s,
            editorGrammarIdx
        }));
        
        dispatch(actions0.activeGrammarChanged());
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
            layout: [...layout]
        }));
        dispatch(actions.stateToStorage())
        getState().notifyShow('Layout saved!', 'success')
    },

    setNotifyShow: (notifyShow) => (props: StoreProps) => {
        const {setState, getState, dispatch} = props;
        setState( s => ({
            ...s,
            notifyShow
        }));
    },

    import: (dataStr, includeLayout) => (props: StoreProps) => {
        try {
            const {setState, getState, dispatch} = props;
            let data = JSON.parse(dataStr);
            data = mapSharableState(data, true);
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
        let data = mapSharableState(getState() , false);
        let dump = JSON.stringify(data, null, 2)
        return dump;
    },
    
    stateToStorage: () => (props: StoreProps) => {
        const {setState, getState, dispatch} = props;
        let data = mapPersistentState(getState(), false);
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
        editorGrammars: [],
        editorGrammarIdx: 0,
        editorGrammar: null,
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
            state = mapPersistentState(data, true);
        }
        setState(s => ({...s, ...state}));
    },

    grammarsLoaded: () => (props: StoreProps) => {
        const {getState, setState, dispatch} = props;

        let { editorGrammars } = getState();
        editorGrammars = [...editorGrammars];
        const hasPredefined = editorGrammars.find(eg => eg.grammar.predefined);
        if (!hasPredefined) {
            [...getState().predefinedGrammars].reverse().forEach(g => {
                const neg = EditorGrammarUtils.fromGrammar(g);
                editorGrammars.unshift(neg);
            })
        }
        setState(s => ({...s, editorGrammars}));

        dispatch(actions0.activeGrammarChanged());
    },
    
    activeGrammarChanged: () => async (props: StoreProps) => {
        const {setState, getState, dispatch} = props;

        if (getState().editorGrammars.length == 0) {
            setState(s => ({
                ...s,
                editorGrammar: null,
                grammarTags : [],
                grammarTag: null
            }))
            return;
        }

        const eg = getState().editorGrammars[getState().editorGrammarIdx];
        try {
            //attempt to load plugin ...
            if (!eg.plugin) {
                const grammarPlugin = await getState().grammarLoader.load(eg.grammar.url);
                eg.plugin = grammarPlugin;
            }
            const grammarTags = [...await eg.plugin.getOption(OPTION_ROOT_TAGS)];

            setState(s => {            
                return {
                    ...s,
                    editorGrammar: eg,
                    grammarTags,
                    grammarTag: grammarTags?.length > 0 && grammarTags[0]
                };
            });
            dispatch(actions.stateToStorage())
        } catch (e) {
            eg.loadError = true;
            getState().notifyShow(`Error loading grammar from: ${eg.grammar.url}`, 'error')
        }
    }    
}

function mapPersistentState(obj: any, isLoaded: boolean) {
    const editorGrammars = obj.editorGrammars.map(eg => {
        return isLoaded? EditorGrammarUtils.build({grammar: eg.grammar}) : {grammar: eg.grammar};
    });
    return {
        clientId: obj.clientId,
        expression: obj.expression,
        contextStr: obj.contextStr,
        grammarTag: obj.grammarTag,
        editorGrammars,
        editorGrammarIdx: obj.editorGrammarIdx,
        layout: obj.layout
    }
}

function mapSharableState(obj: any, isLoaded: boolean) {
    const editorGrammars = obj.editorGrammars.map(eg => {
        return isLoaded? EditorGrammarUtils.build({grammar: eg.grammar}) : {grammar: eg.grammar};
    });
    return {
        expression: obj.expression,
        contextStr: obj.contextStr,
        grammarTag: obj.grammarTag,
        editorGrammars,
        editorGrammarIdx: obj.editorGrammarIdx,
        layout: obj.layout
    }
}

interface StoreType {
    clientId: string,
    shareStr: string,
    expression: string,
    contextStr: string,
    predefinedGrammars: Grammar[],
    editorGrammars: EditorGrammar[],
    editorGrammarIdx: number,
    editorGrammar: EditorGrammar,
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
