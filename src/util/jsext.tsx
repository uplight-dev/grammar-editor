import Modal from 'react-modal';
import { Fragment, h } from "preact";
import FingerprintJS from '@fingerprintjs/fingerprintjs';

const SEARCH_PARAM_SEP : string = '?';
export default class JSExt {

    static fingerprintJS = null;

    static toMap(k, v) {
        const r = {};
        r[k] = v;
        return r;
    }

    static toStr(o: any) {
        return JSON.stringify(o, null, 2);
    }

    static copy(text: string) {
        var input = document.createElement('textarea');
        input.innerHTML = text;
        document.body.appendChild(input);
        input.select();
        var result = document.execCommand('copy');
        document.body.removeChild(input);
        return result;
    }

    static async getFingerprintID() {
        if (!JSExt.fingerprintJS) {
            JSExt.fingerprintJS = await FingerprintJS.load();
        }
        console.time('Fingerprinting')
        const id = (await JSExt.fingerprintJS.get()).visitorId;
        console.timeLog('Fingerprinting')
        return id;
    }

    static showAlert(popupManager, title, children) {
        if (typeof children === 'string') {
            children = (<span>{children}</span>);
        }
        popupManager.open(({isOpen, onClose}) => (
            <Modal isOpen={isOpen} onRequestClose={onClose} className="Modal" overlayClassName="Overlay" contentLabel={title}>
                {children}
            </Modal>
        ), {title: title})
    }

    static async fetch(url: string, params: any, opt: any): Promise<Response> {
        var nUrl = new URL(url)
        nUrl.search = new URLSearchParams(params).toString();
        let r = await fetch(nUrl.toString(), opt);
        return Promise.resolve(r);
    }
}
