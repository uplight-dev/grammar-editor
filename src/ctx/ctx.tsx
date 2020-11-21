import { createHook, createStore } from 'react-sweet-state';
import { Repo } from '../components/reposelect';
import GrammarLoader from '../util/grammarloader/grammarloader';
import store from 'store'
import dump from 'store/plugins/dump';

export const DEMO_GITHUB_URL = 'https://github.com/lezer-editor/lezer-example-grammar';
const DEMO_DEPLOY_URL = 'https://cdn.jsdelivr.net/npm/@lezer-editor/lezer-example-grammar@1.0.1/dist';
const DEMO_REPLIT_URL = 'https://repl.it/@lezereditor/lezer-example-grammar';

function storedState(state: any) {
    return {
        expression: state.expression,
        contextStr: state.contextStr,
        repos: state.repos,
        repoIdx: state.repoIdx,
    }
}

function mergeData(state, data) {
    data = storedState(data);
    state = {...state, ...data}
    return state;
}

async function localStorageReload({setState, getState}) {
    let dataStr = store.get('dataStr');
    let data = null;
    let state = {...getState()}

    if (dataStr && typeof dataStr === 'string'){
        data = JSON.parse(dataStr);
        state = mergeData(state, data);
    }

    const grammar = await getState().grammarLoader.load(state.repos[state.repoIdx].deployUrl);
    setState({
        ...getState(),
        ...state,
        grammar
    })
}

const actions = {
    init: () => async (props: {setState, getState, dispatch}) => {
        localStorageReload(props);
    },

    setGrammar: (grammar) => ({setState, getState}) => {
        setState({
            ...getState(),
            grammar: grammar
        })
    },

    setRepos: (repos) => ({setState, getState, dispatch}) => {
        setState({
            ...getState(),
            repos: repos
        });
        dispatch(actions.stateToStorage())
    },

    setRepoIdx: (idx) => ({setState, getState, dispatch}) => {
        setState({
            ...getState(),
            repoIdx: idx
        });
        dispatch(actions.stateToStorage())
    },

    setExpression: (expr) => ({setState, getState, dispatch}) => {
        setState({
            ...getState(),
            expression: expr
        });
        dispatch(actions.stateToStorage())
    },
    
    setContextStr: (contextStr) => ({setState, getState, dispatch}) => {
        setState({
            ...getState(),
            contextStr: contextStr
        });
        dispatch(actions.stateToStorage())
    },

    setNotifyShow: (notifyShow) => ({setState, getState}) => {
        setState({
            ...getState(),
            notifyShow: notifyShow
        });
    },

    // notify: (notifyObj: {txt: string, type?: string}) => ({setState, getState}) => {
    //     setState({
    //         ...getState(),
    //         notifyQueue: [...getState().notifyQueue, notifyObj]
    //     });
    // },

    // popNotify: (cb: (notifyObj) => void) => ({setState, getState}) => {
    //     let queue = [...getState().notifyQueue];
    //     let ret = queue.splice(0, 1)
    //     setState({
    //         ...getState(),
    //         notifyQueue: queue
    //     });
    //     cb(ret);
    // },

    import: (dataStr) => (props:{setState, getState}) => {
        try {
            let data = JSON.parse(dataStr);
            data = storedState(data);
            localStorage.setItem('dataStr', JSON.stringify(data))
            localStorageReload(props)
            props.getState().notifyShow('Import successfull', 'success')
        } catch (e) {
            console.log('Cannot import! ' + e)
        }
    },

    export: () => ({setState, getState}) => {
        let data = storedState(getState());
        let dump = JSON.stringify(data, null, 2)
        return dump;
    },
    
    stateToStorage: () => ({setState, getState}) => {
        let data = storedState(getState());
        store.set('dataStr', JSON.stringify(data));
    }
}

const Store = createStore({
    initialState: {
        shareStr: null,
        expression: 'var1 = "hello world";\nprint(var1)',
        contextStr: JSON.stringify({person: {name: 'John', surname: 'Doe'}}),
        grammar: null,
        grammarLoader: new GrammarLoader(),
        repos: [new Repo(DEMO_GITHUB_URL, DEMO_DEPLOY_URL, DEMO_REPLIT_URL)],
        repoIdx: 0,
        notifyShow: (...args) => {console.warn('Notify not inited yet ...')}
    },
    actions,
    name: 'store'
});

export const useStore = createHook(Store);
