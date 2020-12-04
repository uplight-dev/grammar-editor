import ParserPlugin from './parserplugin';

export default class GrammarLoader {
    private parserPlugin : ParserPlugin = null;

    constructor() {

    }

    async load(deployURL: string) : Promise<ParserPlugin> {
        try {
            if (deployURL.indexOf('github.com') > -1) {
                deployURL = 'https://cors-anywhere.herokuapp.com/' + deployURL;
            }

            let parserAdapter = await import(
                /* webpackIgnore: true */
                deployURL + '/index.es.js'
                );
            if (parserAdapter === null) {
                console.error('Error loading grammar ...')
                this.parserPlugin = null;
            }
            //parserAdapter = {...parserAdapter};//prevent shallow equality issue when loading same URL again
            console.log('GrammarLoader: Grammar loaded');
            const ret = new ParserPlugin(parserAdapter);
            console.log('Old equals: '+ (this.parserPlugin === ret))
            return ret;
        } catch (e) {
            console.error('Error loading grammar: ' + e)
            this.parserPlugin = null;
        }
    }

    get() : ParserPlugin {
        return this.parserPlugin;
    }

}
