import Modal from 'react-modal';
import { Fragment, h } from "preact";

export default {
    toMap: (k, v) => {
        const r = {};
        r[k] = v;
        return r;
    },

    toStr: (o) => {
        return JSON.stringify(o, null, 2);
    },

    copy: (text) => {
        var input = document.createElement('textarea');
        input.innerHTML = text;
        document.body.appendChild(input);
        input.select();
        var result = document.execCommand('copy');
        document.body.removeChild(input);
        return result;
    },

    showAlert: (popupManager, title, children) => {
        if (typeof children === 'string') {
            children = (<span>{children}</span>);
        }
        popupManager.open(({isOpen, onClose}) => (
            <Modal isOpen={isOpen} onRequestClose={onClose} className="Modal" overlayClassName="Overlay" contentLabel={title}>
                {children}
            </Modal>
        ), {title: title})
    }
}
