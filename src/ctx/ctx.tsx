import { createHook, createStore } from 'react-sweet-state';
import { Repo } from '../components/reposelect';
import GrammarLoader from '../util/grammarloader/grammarloader';
import store from 'store'

export const DEMO_GITHUB_URL = 'https://github.com/lezer-editor/lezer-example-grammar';
const DEMO_DEPLOY_URL = 'https://cdn.jsdelivr.net/npm/@lezer-editor/lezer-example-grammar@1.0.1/dist';
const DEMO_REPLIT_URL = 'https://repl.it/@lezereditor/lezer-example-grammar';

const Store = createStore({
    initialState: {
        grammar: null,
        grammarLoader: new GrammarLoader(),
        repos: [new Repo(DEMO_GITHUB_URL, DEMO_DEPLOY_URL, DEMO_REPLIT_URL)],
        repoIdx: 0
    },
    actions: {
        init: () => async ({setState, getState}) => {
            let repos = store.get('repos');
            if (repos == null) {
                repos = getState().repos
            }
            //load from local storage ...
            let repoIdx = store.get('repoIdx');
            if (repoIdx == null) {
                repoIdx = getState().repoIdx
            }

            const grammar = await getState().grammarLoader.load(repos[repoIdx].deployUrl);

            setState({
                ...getState(),
                grammar,
                repos,
                repoIdx
            })
        },

        setGrammar: (grammar) => ({setState, getState}) => {
            setState({
                ...getState(),
                grammar: grammar
            })
        },

        setRepos: (repos) => ({setState, getState}) => {
            setState({
                ...getState(),
                repos: repos
            });
            store.set('repos', repos)
        },

        setRepoIdx: (idx) => ({setState, getState}) => {
            setState({
                ...getState(),
                repoIdx: idx
            });
            store.set('repoIdx', idx)
        }
    },
    name: 'store'
});

export const useStore = createHook(Store);
