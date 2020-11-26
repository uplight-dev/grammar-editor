import {h} from 'preact'
import { useEffect, useRef, useState } from 'preact/hooks';
import * as CodeMirror from 'codemirror'
import { forwardRef } from 'preact/compat';

const CodeMirrorExt = forwardRef((props: {opts?, value?, onChange?, onEditorOver?}, ref) => {
    const {opts, value, onChange, onEditorOver} = props;
    const elRef = useRef<HTMLTextAreaElement>();
    const [cm, setCm] = useState(null);
    const [changing, setChanging] = useState(false);
    
    useEffect(() => {
        const cm = CodeMirror.fromTextArea(elRef.current, opts);
        setCm(cm);

        cm.on('beforeChange', () => {
            setChanging(true);
        });

        onChange && cm.on('change', () => {
            onChange(cm.getDoc().getValue())
            setTimeout(() => {
                setChanging(false);
            }, 100);
        });

        return () => {
            cm.toTextArea();
        }
    }, []);

    useEffect(() => {
        if (!changing) {
            cm && cm.getDoc().setValue(value);
        }
    }, [value]);

    useEffect(() => {
        ref && (ref.current = cm);
    }, [cm])
    
    return (
        <div className="cm-content" onMouseMove={(e) => {onEditorOver && cm && onEditorOver(cm, e)}}>
            <textarea name="expression" ref={elRef} value={value}></textarea>
        </div>
    )
});

export default CodeMirrorExt;