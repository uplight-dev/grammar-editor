import { EndpointType, GrammarAdapter, GrammarEndpoint, ParseResult, EvalMode, OPTION_ENDPOINT_TYPE, OPTION_SUPPORTS, LiveEndpointPath, CompileStatus, OPTION_ROOT_TAGS } from "@grammar-editor/grammar-editor-api";
import JSExt from "../jsext";

enum MediaTypes {
    JSON = "application/json",
    JS = "application/javascript"
}

interface SniffResult {
    type: EndpointType;
    supports: string[];
    url: string
}

export class GrammarAdapters {
    static async sniff(clientId: string, url: string) : Promise<SniffResult> {
        let ep = url;
        let r = await JSExt.fetch(ep + LiveEndpointPath.OPT, {clientId, key: `${OPTION_ENDPOINT_TYPE},${OPTION_SUPPORTS}`}, {
            method: 'GET'
        });
        if (r && r.status == 200) {
            const rs = await r.json();
            if (rs.endpointType == EndpointType.LIVE) {
                return {type: EndpointType.LIVE, supports: rs.supports, url: ep};
            }
        }

        //STATIC GRAMMAR ...
        ep = url + '/index.js';
        r = await JSExt.fetch(ep, {clientId}, {
            method: 'HEAD'//HEAD is just GET without returning BODY
        });
        if (!r || r.status == 404) {
            ep = url + '/index.es.js';
            r = await JSExt.fetch(ep, {clientId}, {
                method: 'HEAD'
            });
        }
        if (r && r.status == 200 && r.headers['Content-Type']?.includes(MediaTypes.JS)) {
            return {type: EndpointType.STATICJS, supports: [], url: ep};
        }

        console.log('Invalid grammar endpoint: ' + url);
        throw Error('Invalid grammar endpoint: ' + url);
    }

    static liveEndpoint(url: string, supportsRecompile: boolean) {
        return new LiveEndpoint(url, supportsRecompile);
    }

    static staticEndpoint(url: string, supportsRecompile: boolean) {
        return new StaticEndpoint(url, supportsRecompile);
    }

    
}

class LiveEndpoint implements GrammarEndpoint {
    constructor(protected url: string, protected supportsRecompile: boolean) {

    }

    async recompile(clientId: string, grammar: string) {
        if (!this.supportsRecompile) {
            throw Error('Attempt to call unsupported recompile.');
        }
        const r = await JSExt.fetch(this.url + LiveEndpointPath.RECOMPILE, {
            clientId
        }, {
            body: grammar,
            method: 'POST'
        });
        if (r.status == 200) {
            return await r.json();
        }
        if (r.status == 404) {//not available, skip
            return null;
        }
        console.error(r.statusText);
        throw Error('Recompile failed');
    }

    async adapter(clientId: string) : Promise<GrammarAdapter> {
        const url = this.url;
        return new class implements GrammarAdapter {
            async eval(clientId: string, rootTag: string, input: string, mode: EvalMode, ctx: any): Promise<ParseResult> {
                const r = await JSExt.fetch(url + LiveEndpointPath.EVAL, {
                    clientId, rootTag, mode: String(mode)
                }, {
                    body: input,
                    method: 'POST'
                });
                if (r.status == 200) {
                    const ret = await r.json();
                    return ret;
                }
                if (r.status == 404) {//not available, skip
                    return null;
                }
                console.error(r.statusText);
                throw Error('Parse cannot be executed');
            }
            
            async getOption(clientId: string, key: string): Promise<any> {
                const r = await JSExt.fetch(url + LiveEndpointPath.OPT, {
                    clientId, key
                }, {
                    method: 'GET'
                });
                if (r.status == 200) {
                    const json = await r.json();
                    return json[OPTION_ROOT_TAGS];
                }
                if (r.status == 404) {//not available, skip
                    return null;
                }
                throw Error('Option cannot be retrieved: ' + key);
            }
        }
    }
}

class StaticEndpoint implements GrammarEndpoint {
    constructor (protected url: string, protected supportsRecompile: boolean) {
        
    }

    async recompile(clientId: string, grammar: string) : Promise<CompileStatus> {
        throw Error('Attempt to call unsupported recompile.');
    }

    async adapter(clientId: string) {
        const url = this.url;
        const module = await import(
            /* webpackIgnore: true */
            url
            );
        if (module === null) {    
            throw Error('Error loading grammar: ' + url);
        }
        interface GrammarAdapterCtor {
            new () : GrammarAdapter;
        }
        const {GrammarAdapterImpl} : {GrammarAdapterImpl : GrammarAdapterCtor} = module;
        console.log('GrammarLoader: Grammar loaded');
        return Promise.resolve(new GrammarAdapterImpl());
    }
}
