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

            let grammarObj = await import(
                /* webpackIgnore: true */
                deployURL + '/index.es.js'
                );
            if (grammarObj === null) {
                console.error('Error loading grammar ...')
                this.grammar = null;
            }
            grammarObj = {...grammarObj};//prevent shallow equality issue when loading same URL again
            console.log('GrammarLoader: Grammar loaded');
            console.log('Old equals: '+ (this.grammar === grammarObj))
            this.grammar = grammarObj as IGrammar;
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
