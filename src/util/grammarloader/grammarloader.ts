import {IGrammar} from '@lezer-editor/lezer-editor-common';
export default class GrammarLoader {
    private grammar : IGrammar = null;

    constructor() {

    }

    async load(deployURL: string) : Promise<IGrammar> {
        try {
            if (deployURL.indexOf('github.com') > -1) {
                deployURL = 'https://cors-anywhere.herokuapp.com/' + deployURL;
            }

            const grammmarObj = await import(
                /* webpackIgnore: true */
                deployURL + '/index.es.js'
                );
            if (grammmarObj === null) {
                console.error('Error loading grammar ...')
                this.grammar = null;
            }
            console.log('GrammarLoader: Grammar loaded');
            this.grammar = grammmarObj as IGrammar;
            return this.grammar;
        } catch (e) {
            console.error('Error loading grammar: ' + e)
            this.grammar = null;
        }
    }

    get() : IGrammar {
        return this.grammar;
    }

}
