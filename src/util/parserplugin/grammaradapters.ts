import { GrammarAdapter, GrammarEndpoint } from "@lezer-editor/lezer-editor-common";

export enum EndpointType {
    LIVE,
    STATICJS
}

enum MediaTypes {
    JSON = "application/json",
    JS = "application/javascript"
}

enum EndpointPath {
    RECOMPILE = '/recompile',
    EVAL = '/eval',
    PARSE = '/parse',
    GETOPTION = '/getOption'
}

interface SniffResult {
    type: EndpointType;
    supportsRecompile: boolean;
    url: string
}

export class GrammarAdapters {
    static async sniff(url: string) : Promise<SniffResult> {
        let supportsRecompile = false;
        let r = await fetch(url + EndpointPath.RECOMPILE, {
            method: 'HEAD'
        });
        supportsRecompile = r.status == 200;

        let ep = url + '/index.js';
        r = await fetch(ep, {
            method: 'HEAD'
        });
        if (r.status == 404) {
            ep = url + '/index.es.js';
            r = await fetch(ep, {
                method: 'HEAD'
            });
        }
        if (r.status == 200) {
            if (r.headers['Content-Type'].includes(MediaTypes.JS)) {
                return {type: EndpointType.STATICJS, supportsRecompile, url: ep};
            }
        } else if (r.status == 404) {//maybe a live grammar?
            ep = url + '/';
            r = await fetch(ep, {
                method: 'HEAD'
            });
            if (r.headers['Content-Type'].includes(MediaTypes.JSON)) {
                return {type: EndpointType.LIVE,  supportsRecompile, url: ep};
            }
        } 
        throw Error('Invalid grammar endpoint: ' + ep);
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
        const r = await fetch(this.url + EndpointPath.RECOMPILE, {
            body: JSON.stringify({
                clientId, grammar
            }),
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
            async eval(clientId: string, rootTag: string, input: string, ctx: any): Promise<any> {
                const r = await fetch(url + EndpointPath.EVAL, {
                    body: JSON.stringify({
                        clientId, rootTag, input, ctx
                    }),
                    method: 'POST'
                });
                if (r.status == 200) {
                    return await r.json();
                }
                if (r.status == 404) {//not available, skip
                    return null;
                }
                console.error(r.statusText);
                throw Error('Parse cannot be executed');
            }

            async parse(clientId: string, rootTag: string, input: string): Promise<any> {
                const r = await fetch(url + EndpointPath.PARSE, {
                    body: JSON.stringify({
                        clientId, rootTag, input
                    }),
                    method: 'POST'
                });
                if (r.status == 200) {
                    return await r.json();
                }
                console.error(r.statusText);
                throw Error('Parse cannot be executed');
            }
            
            async getOption(clientId: string, key: string): Promise<any> {
                const r = await fetch(url + EndpointPath.GETOPTION, {
                    headers: {
                        'clientId': clientId,
                        'key': key
                    },
                    method: 'HEAD'
                });
                if (r.status == 200) {
                    return r.headers['result'];
                }
                if (r.status == 404) {//not available, skip
                    return null;
                }
                console.error(r.statusText);
                throw Error('Option cannot be retrieved: ' + key);
            }
        }
    }
}

class StaticEndpoint extends LiveEndpoint {
    constructor (url: string, supportsRecompile: boolean) {
        super(url, supportsRecompile);
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
