import { OPTION_ROOT_TAGS } from "@grammar-editor/grammar-editor-api";
import store from 'store';
import { EditorGrammar, EditorGrammarUtils } from '../util/editorgrammar';
import GrammarLoader from "../util/grammarplugin/loader";
import JSExt from "../util/jsext";
import { StoreProps } from './store';

const Actions = {
    init: () => async (props: StoreProps) => {
        const {setState, getState, dispatch} = props;

        //load grammar
        dispatch(Actions0.localStorageReload());
        //init
        const clientId = getState().clientId || await JSExt.getFingerprintID();
        setState(s => ({
             ...s,
             clientId,
             grammarLoader: new GrammarLoader(clientId)
        }));
        //notify updates
        dispatch(Actions0.grammarsLoaded());
    },

    addGrammarByUrl: (url: string) => async (props: StoreProps) => {
        const {getState, dispatch} = props;
        try {
            const grammarPlugin = await getState().grammarLoader.load(url);
            const editorGrammar = await EditorGrammarUtils.from(url, grammarPlugin);
            const editorGrammars = [editorGrammar, ...getState().editorGrammars];

            dispatch(Actions.setGrammars(editorGrammars))
            dispatch(Actions.setGrammarIdx(0));
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
        dispatch(Actions.stateToStorage())
    },

    // setGrammarByUrl: async (url: string) => async (props: StoreProps) => {
    //     const {setState, getState, dispatch} = props;
    //     const grammar = await getState().grammarLoader.load(url, getState().);
    
    //     await grammarChanged(grammar, props)
    // },

    addGrammar: (editorGrammar: EditorGrammar) => async (props: StoreProps) => {
        const {setState, getState, dispatch} = props;
        const ret = [...getState().editorGrammars, editorGrammar];

        dispatch(Actions.setGrammars(ret));
    },

    updateCurrentGrammar: (fn: (eg: EditorGrammar) => void) => async (props: StoreProps) => {
        const {setState, getState, dispatch} = props;

        setState(s => {
            const editorGrammars = [...getState().editorGrammars];
            fn(editorGrammars[s.editorGrammarIdx]);

            return {
            ...s,
            editorGrammars
            }
        })
        dispatch(Actions0.activeGrammarChanged());
        dispatch(Actions.stateToStorage())
    },

    setGrammarIdx: (editorGrammarIdx: number) => async (props: StoreProps) => {
        const {dispatch, setState} = props;

        setState(s => ({
            ...s,
            editorGrammarIdx
        }));
        
        dispatch(Actions0.activeGrammarChanged());
        dispatch(Actions.stateToStorage())
    },

    reloadGrammar: (editorGrammarIdx: number) => async (props: StoreProps) => {
        const {setState, getState, dispatch} = props;

        setState(s => {
            
            return {
                ...s
            }
        });
    },

    duplicateGrammar: (editorGrammarIdx: number) => async (props : StoreProps) => {
        const {setState, getState, dispatch} = props;
        
        const copy = EditorGrammarUtils.clone(getState().editorGrammars[editorGrammarIdx]);
        copy.grammar.predefined = false;
        dispatch(Actions.setGrammars([...getState().editorGrammars, copy]));
        dispatch(Actions.setGrammarIdx(getState().editorGrammars.length-1));
        getState().notifyShow('Grammar Duplicated!', 'success')
    },

    deleteGrammar: (editorGrammarIdx: number) => async (props : StoreProps) => {
        const {setState, getState, dispatch} = props;

        if (getState().editorGrammars.length == 1) {
            JSExt.showAlert(getState().popupManager, 'Error', 'At least a grammar needs to remain ...')
            return;
        }
        if (getState().editorGrammar.grammar.predefined) {
            JSExt.showAlert(getState().popupManager, 'Error', 'Cannot delete predefined grammar ...')
            return;
        }
        setState(s => {
            const newGrammars = [...s.editorGrammars];
            newGrammars.splice(editorGrammarIdx, 1);
            const idx = Math.max(0, getState().editorGrammarIdx - 1);
            
            getState().notifyShow('Grammar Deleted!', 'success')
            return {
                ...s,
                editorGrammarIdx: idx,
                editorGrammar: newGrammars[idx],
                editorGrammars: newGrammars,
            }
        })
    },

    setExpression: (expr) => (props: StoreProps) => {
        const {setState, getState, dispatch} = props;
        setState(s => ({
            ...s,
            expression: expr
        }));
        dispatch(Actions.stateToStorage())
    },
    
    setContextStr: (contextStr) => (props: StoreProps) => {
        const {setState, getState, dispatch} = props;
        setState(s => ({
            ...s,
            contextStr: contextStr
        }));
        dispatch(Actions.stateToStorage())
    },

    setLayout: (layout) => (props: StoreProps) => {
        const {setState, getState, dispatch} = props;
        setState(s => ({
            ...s,
            layout: [...layout]
        }));
        dispatch(Actions.stateToStorage())
        getState().notifyShow('Layout saved!', 'success')
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
            dispatch(Actions0.grammarsLoaded())
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
    },

    setNotifyShow: (notifyShow) => (props: StoreProps) => {
        const {setState, getState, dispatch} = props;
        setState( s => ({
            ...s,
            notifyShow
        }));
    },

    setPopupManager: (popupManager) => (props: StoreProps) => {
        const {setState, getState, dispatch} = props;
        setState( s => ({
            ...s,
            popupManager
        }));
    }
}

const Actions0 = {    
    localStorageReload: () => (props: StoreProps) => {
        const {setState, getState, dispatch} = props;
        
        let dataObj = store.get('dataStr');
        let data = null;
        let state = null;
    
        console.log(`localStorageReload: ${JSExt.toStr(dataObj)}`)
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
            let pd = [...getState().predefinedGrammars];
            [...pd].reverse().forEach(g => {
                const neg = EditorGrammarUtils.fromGrammar(g);
                editorGrammars.unshift(neg);
            })
        }
        setState(s => ({...s, editorGrammars}));

        dispatch(Actions0.activeGrammarChanged());
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
        let grammarTags = [];
        try {
            //attempt to load plugin ...
            if (!eg.plugin) {
                await EditorGrammarUtils.reload(eg, getState().grammarLoader);
            }
            grammarTags = [...await eg.plugin.getOption(OPTION_ROOT_TAGS)];
        } catch (e) {
            eg.loadError = true;
            getState().notifyShow(`Error loading grammar from: ${eg.grammar.url}`, 'error')
        }

        setState(s => {            
            return {
                ...s,
                editorGrammar: eg,
                grammarTags,
                grammarTag: grammarTags?.length > 0 && grammarTags[0]
            };
        });
        dispatch(Actions.stateToStorage())
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

export default Actions;