import GrammarPlugin from './grammarplugin';
import { EndpointType, GrammarAdapters } from './grammaradapters';
import { CompileStatus, GrammarAdapter, GrammarEndpoint, JSONMapping } from '@lezer-editor/lezer-editor-common';
export default class GrammarLoader {

    private parserPlugin : GrammarPlugin = null;

    constructor(private clientId: string) {

    }

    async load(endpointURL: string, jsonMapping: JSONMapping) : Promise<GrammarPlugin> {
        try {
            this.parserPlugin = null;

            if (endpointURL.indexOf('github.com') > -1) {
                endpointURL = 'https://cors-anywhere.herokuapp.com/' + endpointURL;
            }

            const sniffResult = await GrammarAdapters.sniff(endpointURL);

            if (sniffResult.type == EndpointType.STATICJS) {
                this.parserPlugin = await GrammarPlugin.build(
                    GrammarAdapters.staticEndpoint(sniffResult.url, sniffResult.supportsRecompile),
                    this.clientId, jsonMapping);
            } else if (sniffResult.type == EndpointType.LIVE) {
                this.parserPlugin = await GrammarPlugin.build(
                    GrammarAdapters.liveEndpoint(sniffResult.url, sniffResult.supportsRecompile),
                    this.clientId, jsonMapping);
            }
            return this.parserPlugin;
        } catch (e) {
            console.error('Error loading grammar: ' + e)
            this.parserPlugin = null;
        }
    }

    get() : GrammarPlugin {
        return this.parserPlugin;
    }

    

}
