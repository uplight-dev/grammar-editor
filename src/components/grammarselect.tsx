import { JSONMapping, SUPPORTS_EXT_EDITOR, SUPPORTS_FORK, SUPPORTS_MAPPING } from "@lezer-editor/lezer-editor-common";
import { Fragment, h } from "preact";
import { ForwardFn, forwardRef } from 'preact/compat';
import { useEffect, useImperativeHandle, useRef, useState } from 'preact/hooks';
import Modal from 'react-modal';
import { EditorGrammar, EditorGrammarUtils } from "../util/editorgrammar";
import Button from "./button";
import Dock from "react-osx-dock";
import jsext from "../util/jsext";
import { PopupManager } from "react-popup-manager";

const OPT_NEW = "new";

export interface Handles {
    openGrammarDetails(grammarIdx: number) : void
}

//code style: https://www.robinwieruch.de/react-function-component
const GrammarSelect: ForwardFn<{ 
    grammars: EditorGrammar[], 
    style: any, 
    onSelect?: (idx: number) => void, 
    onSave?: (grammars: EditorGrammar[], grammarIdx: number) => void,
    popupManager?: any}, Handles> = ({ grammars, style, onSelect, onSave, popupManager }, ref) => {

    const grammarEd = useRef<HTMLInputElement>(null);
    const sel = useRef<HTMLSelectElement>(null);
    let detailsPopup = null;

    // ### PRIVATE METHODS

    const openGrammarDetails = (grammarIdx) => {
        if (detailsPopup) {
            jsext.showAlert(popupManager, 'Error', 'Already editing ...')
            return;
        }
        
        detailsPopup = popupManager.open(GrammarPopup, {
            title: 'Grammar',
            popupManager,
            grammars,
            grammarIdx,
            onSave: (grammars: EditorGrammar[], grammarIdx: number) => {
                onSave(grammars, grammarIdx);
                onSelect(grammarIdx);
            },
            onClose:() => {
                detailsPopup = null;
            }
        });
    }

    const onSelect0 = ({ target }) => {
        const grammarIdx = sel.current.selectedIndex;
        switch (target.value) {
            case OPT_NEW:
                openGrammarDetails(-1);
                break;
            default:
                onSelect(grammarIdx);
                break;
        }
    }

    useEffect(() => {
        if (grammarEd.current)
            grammarEd.current.focus();
    }, [])

    // useEffect(() => {
    //     if (sel.current) {
    //         sel.current.selectedIndex = EditorGrammarUtils.findIdx(grammar, grammars);
    //     }
    // }, [grammar])

    // ### PUBLIC METHODS
    useImperativeHandle(ref, () => ({
        openGrammarDetails
      }));

    // ### UI

    return (
        <Fragment>
            <select style={style} onChange={onSelect0} ref={sel} >
                {grammars.map(g => {
                    return (
                        <option data-value={g}>{g.url}</option>
                    );
                })}
                <option value={OPT_NEW}>New ...</option>
            </select>)
        </Fragment>
    );
}

const GrammarPopup : (props: GrammarPopupProps) => h.JSX.Element = ({isOpen, onClose, title, popupManager, grammars, grammarIdx, onSave}) => {
    const [state, setState] = useState({
        grammars,
        grammarIdx,
        grammar: grammars[grammarIdx]
    });

    const refGrammarUrl = useRef<HTMLInputElement>(null);
    const refGrammarName = useRef<HTMLInputElement>(null);
    const refExtEditorEnabled = useRef<HTMLInputElement>(null);
    const refMapping = useRef<HTMLTextAreaElement>(null);

    const doClose = () => {
        onClose();
    }

    useEffect(() => {
        if (refGrammarUrl.current)
        refGrammarUrl.current.focus();
    })

    const saveSelectedGrammar = () => {
        const editedGrammar = EditorGrammarUtils.clone(state.grammars[state.grammarIdx]);
        editedGrammar.name = refGrammarName.current.value;
        editedGrammar.url = refGrammarUrl.current.value;
        editedGrammar.externalEditorEnabled = refExtEditorEnabled.current.checked;
        editedGrammar.jsonMapping = JSON.parse(refMapping.current.value);

        const copy = [...grammars];
        copy[state.grammarIdx] = editedGrammar;

        setState((oldState) => {
            return {
                grammars: copy,
                grammar: editedGrammar,
                grammarIdx: oldState.grammarIdx
            }
        })
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} onRequestClose={doClose} className="Modal" overlayClassName="Overlay" closeTimeoutMS={200} shouldFocusAfterRender={false}>
            <div className="modal-title">{title}</div>
            <div className="grid1x">
                <Dock width={800} magnification={2} magnifyDirection="up">
                    {state.grammars.map((grammar, index) => (
                        <Dock.Item key={index} className={state.grammarIdx == index ? 'grammar-button-selected' : 'grammar-button'} onClick={() => {
                            saveSelectedGrammar();
                            setState(s => { return {...s, grammarIdx: index, grammar: s.grammars[index]};});
                        }}>
                            <button>{grammar.name}</button>
                        </Dock.Item>
                    ))}
                </Dock>

                <label style={{color:'red', fontWeight: 'bolder'}}>* Grammar Name:</label>
                <input ref={refGrammarName} value={state.grammar.name}></input>
       
                <label style={{color:'red', fontWeight: 'bolder'}}>* Grammar URL:</label>
                <input ref={refGrammarUrl} value={state.grammar.url}></input>
                {(() => {
                    if (state.grammar.supports(SUPPORTS_FORK)) {
                        return (<button>Fork</button>);
                    } else {
                        return (<span></span>);
                    }
                })()}
                {(() => {
                    if (state.grammar.supports(SUPPORTS_EXT_EDITOR)) {
                        return (<input ref={refExtEditorEnabled} type='checkbox' checked={state.grammar.externalEditorEnabled} />);
                    } else {
                        return (<span></span>);
                    }
                })()}
                {(() => {
                    if (state.grammar.supports(SUPPORTS_MAPPING)) {
                        return (<textarea ref={refMapping} value={JSON.stringify(state.grammar.jsonMapping)} />);
                    } else {
                        return (<span></span>);
                    }
                })()}
            </div>
            <div className="button-bar">
                <Button onClick={() => {doClose()}}>Cancel</Button>
                <Button onClick={() => {
                    saveSelectedGrammar();
                    setState(s => {
                        const copy = EditorGrammarUtils.clone(state.grammar);
                        return {
                            ...s,
                            grammars: [...grammars, copy],
                            grammarIdx: s.grammars.length,
                            grammar: copy
                        }
                    })
                }}>Duplicate</Button>
                <Button onClick={() => {
                    if (state.grammar.isPredefined) {
                        jsext.showAlert(popupManager, 'Error', 'Cannot delete predefined grammar ...')
                    }
                    setState(s => {
                        const newGrammars = [...s.grammars].splice(s.grammarIdx, 1);
                        return {
                            ...s,
                            grammars: newGrammars,
                            grammar: newGrammars[s.grammarIdx]
                        }
                    })
                }}>Delete</Button>
                <Button onClick={() => {
                    saveSelectedGrammar();
                    onSave(state.grammars, state.grammarIdx);
                    doClose()
                }}>Save</Button>
            </div>
        </Modal>
    );
}

interface GrammarPopupProps {
    isOpen: string;
    onClose: () => void;
    title: string;
    popupManager: PopupManager;
    grammars: EditorGrammar[];
    grammarIdx: number;
    onSave: (grammars: EditorGrammar[], grammarIdx: number) => void;
}

export default forwardRef(GrammarSelect);