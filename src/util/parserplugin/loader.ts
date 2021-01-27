import GrammarPlugin from './grammarplugin';
import { GrammarAdapters } from './grammaradapters';
import { JSONMapping, EndpointType, SUPPORTS_RECOMPILE } from '@grammar-editor/grammar-editor-api';
export default class GrammarLoader {

    private parserPlugin : GrammarPlugin = null;

    constructor(private clientId: string) {

    }

    async load(endpointURL: string) : Promise<GrammarPlugin> {
        try {
            this.parserPlugin = null;

            if (endpointURL.indexOf('github.com') > -1) {
                endpointURL = 'https://cors-anywhere.herokuapp.com/' + endpointURL;
            }

            const sniffResult = await GrammarAdapters.sniff(this.clientId, endpointURL);

            if (sniffResult.type == EndpointType.STATICJS) {
                this.parserPlugin = await GrammarPlugin.build(
                    GrammarAdapters.staticEndpoint(sniffResult.url, sniffResult.supports.includes(SUPPORTS_RECOMPILE)),
                    this.clientId);
            } else if (sniffResult.type == EndpointType.LIVE) {
                this.parserPlugin = await GrammarPlugin.build(
                    GrammarAdapters.liveEndpoint(sniffResult.url, sniffResult.supports.includes(SUPPORTS_RECOMPILE)),
                    this.clientId);
            }
            return this.parserPlugin;
        } catch (e) {
            console.error('Error loading grammar: ' + e)
            throw e;
        }
    }

    get() : GrammarPlugin {
        return this.parserPlugin;
    }

    

}
