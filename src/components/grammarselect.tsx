import { JSONMapping, SUPPORTS_EXT_EDITOR, SUPPORTS_FORK, SUPPORTS_ROOT_TAGS } from "@grammar-editor/grammar-editor-api";
import { Fragment, h } from "preact";
import { ForwardFn, forwardRef } from 'preact/compat';
import { useEffect, useImperativeHandle, useRef, useState } from 'preact/hooks';
import Modal from 'react-modal';
import { EditorGrammar, EditorGrammarUtils } from "../util/editorgrammar";
import Button from "./styledbutton";
import ReactList from 'react-list';
import { PopupManager } from "react-popup-manager";
import JSExt from "../util/jsext";
import { AwesomeButton } from "react-awesome-button";
import 'react-awesome-button/dist/themes/theme-c137.css';
import { UserDisplayUtils } from "../util/userdisplayutils";

const OPT_NEW = "new";

export interface Handles {
    openGrammarDetails(grammarIdx: number) : void
}

//code style: https://www.robinwieruch.de/react-function-component
const GrammarSelect: ForwardFn<{
    editorGrammarIdx: number,
    editorGrammars: EditorGrammar[],
    style: any, 
    onSelect?: (idx: number) => void, 
    onSave?: (editorGrammars: EditorGrammar[], editorGrammarIdx: number) => void,
    popupManager?: any}, Handles> = ({ editorGrammarIdx, editorGrammars, style, onSelect, onSave, popupManager }, ref) => {

    const grammarEd = useRef<HTMLInputElement>(null);
    const sel = useRef<HTMLSelectElement>(null);
    let detailsPopup = null;

    const [editorGrammar, setEditorGrammar] = useState(editorGrammars[editorGrammarIdx]);

    useEffect(() => {
        sel.current.options[editorGrammarIdx].value = UserDisplayUtils.editorGrammarTitle(editorGrammar);
    }, [editorGrammar.loadError]);

    // ### PRIVATE METHODS

    const openGrammarDetails = (editorGrammarIdx) => {
        if (detailsPopup) {
            JSExt.showAlert(popupManager, 'Error', 'Already editing ...')
            return;
        }
        
        detailsPopup = popupManager.open(GrammarPopup, {
            title: 'Grammar',
            popupManager,
            editorGrammars,
            editorGrammarIdx,
            onSave: (editorGrammars: EditorGrammar[], editorGrammarIdx: number) => {
                onSave(editorGrammars, editorGrammarIdx);
                onSelect(editorGrammarIdx);
            },
            onClose:() => {
                detailsPopup = null;
            }
        });
    }

    const onSelect0 = ({ target }) => {
        const editorGrammarIdx = sel.current.selectedIndex;
        switch (target.value) {
            case OPT_NEW:
                openGrammarDetails(-1);
                break;
            default:
                onSelect(editorGrammarIdx);
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
                {editorGrammars.map((eg, idx) => {
                    return (
                        <option selected={idx == editorGrammarIdx} data-value={eg}>{UserDisplayUtils.editorGrammarTitle(eg)}</option>
                    );
                })}
                <option value={OPT_NEW}>New ...</option>
            </select>
        </Fragment>
    );
}

const GrammarPopup : (props: GrammarPopupProps) => h.JSX.Element = ({isOpen, onClose, title, popupManager, editorGrammars, editorGrammarIdx, onSave}) => {
    const [state, setState] = useState({
        editorGrammars: editorGrammars,
        editorGrammarIdx,
        editorGrammar: editorGrammars[editorGrammarIdx]
    });

    const refGrammarUrl = useRef<HTMLInputElement>(null);
    const refGrammarName = useRef<HTMLInputElement>(null);
    const refRootTags = useRef<HTMLInputElement>(null);
    const refExtEditorEnabled = useRef<HTMLInputElement>(null);
    const refMapping = useRef<HTMLTextAreaElement>(null);

    const doClose = () => {
        onClose();
    }

    useEffect(() => {
        if (refGrammarUrl.current)
            refGrammarUrl.current.focus();
    })

    useEffect(() => {
        saveSelectedGrammar();
    }, [state.editorGrammarIdx]);

    const saveSelectedGrammar = () => {
        if (!refGrammarName.current) {//initing ...
            return;
        }

        setState((s) => {
            const editedGrammar = s.editorGrammars[s.editorGrammarIdx];
            editedGrammar.grammar.name = refGrammarName.current.value;
            editedGrammar.grammar.url = refGrammarUrl.current.value;
            if (refExtEditorEnabled.current) {
                editedGrammar.externalEditorEnabled = refExtEditorEnabled.current.checked;
            }
            if (refMapping.current && refMapping.current.value) {
                editedGrammar.grammar.jsonMapping = JSON.parse(refMapping.current.value);
            }

            const copy = [...s.editorGrammars];
            copy[s.editorGrammarIdx] = editedGrammar;
            
            return {
                ...s,
                editorGrammars: copy,
                editorGrammar: editedGrammar,
                grammarIdx: s.editorGrammarIdx
            }
        })
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} onRequestClose={doClose} className="Modal" overlayClassName="Overlay" closeTimeoutMS={200} shouldFocusAfterRender={false}>
            <div className="modal-title">{title}</div>
            <div className="grid1x">
                <div style={{width:'500px', height: '200px', overflowY: 'scroll', overflowX: 'hidden'}}>
                    <ReactList
                        axis='y'
                        itemRenderer={(index, key) => {
                            return (
                                <AwesomeButton type={'secondary'} action={(c) => setState(s => {
                                    return {
                                        ...s,
                                        editorGrammarIdx: index,
                                        editorGrammar: EditorGrammarUtils.clone(s.editorGrammars[index])
                                    }
                                })} 
                                active={state.editorGrammarIdx == index} 
                                ripple={false} 
                                style={{width:'440px',height: '50px',margin:'5px 20px 5px 20px', '--button-secondary-color-active': state.editorGrammarIdx == index?'#00ff00':'#ffff00'}}>
                                    {UserDisplayUtils.editorGrammarTitle(state.editorGrammars[index])}
                                </AwesomeButton>
                            )
                        }
                        }
                        length={state.editorGrammars.length}
                        type='uniform'
                    ></ReactList>
                </div>

                <label style={{color:'red', fontWeight: 'bolder'}}>* Grammar Name:</label>
                <input ref={refGrammarName} value={state.editorGrammar.grammar.name}></input>
       
                <label style={{color:'red', fontWeight: 'bolder'}}>* Grammar URL:</label>
                <input ref={refGrammarUrl} value={state.editorGrammar.grammar.url}></input>
                {(() => {
                    if (state.editorGrammar.supports(SUPPORTS_ROOT_TAGS)) {
                        return (<div>
                            <label>Root Tags (comma separated):</label>
                            <input ref={refRootTags} value={state.editorGrammar.grammar.rootTags}></input>
                        </div>);
                    } else {
                        return (<span></span>);
                    }
                })()}
                {(() => {
                    if (state.editorGrammar.supports(SUPPORTS_FORK)) {
                        return (<button>Fork</button>);
                    } else {
                        return (<span></span>);
                    }
                })()}
                {(() => {
                    if (state.editorGrammar.supports(SUPPORTS_EXT_EDITOR)) {
                        return (<input ref={refExtEditorEnabled} type='checkbox' checked={state.editorGrammar.externalEditorEnabled} />);
                    } else {
                        return (<span></span>);
                    }
                })()}
                {(() => {
                    return (
                        <div>
                            <label>JSON Mapping:</label>
                            <textarea ref={refMapping} style={{width: 'calc(100% - 20px)', height:'200px'}} value={state.editorGrammar.grammar.jsonMapping ? JSON.stringify(state.editorGrammar.grammar.jsonMapping, null, 2): ''} />
                        </div>);
                    // if (state.grammar.supports(SUPPORTS_MAPPING)) {
                        
                    // } else {
                    //     return (<span></span>);
                    // }
                })()}
                
            </div>
            <div className="button-bar">
                <Button onClick={() => {doClose()}}>Cancel</Button>
                <Button onClick={() => {
                    saveSelectedGrammar();
                    setState(s => {
                        const copy = EditorGrammarUtils.clone(state.editorGrammar);
                        copy.grammar.predefined = false;
                        return {
                            ...s,
                            editorGrammars: [...s.editorGrammars, copy],
                            grammarIdx: s.editorGrammars.length,
                            editorGrammar: copy
                        }
                    })
                }}>Duplicate</Button>
                <Button onClick={() => {
                    if (state.editorGrammars.length == 1) {
                        JSExt.showAlert(popupManager, 'Error', 'At least a grammar needs to remain ...')
                        return;
                    }
                    if (state.editorGrammar.grammar.predefined) {
                        JSExt.showAlert(popupManager, 'Error', 'Cannot delete predefined grammar ...')
                        return;
                    }
                    setState(s => {
                        const newGrammars = [...s.editorGrammars];
                        newGrammars.splice(s.editorGrammarIdx, 1);
                        const idx = Math.max(0, s.editorGrammarIdx - 1);
                        return {
                            ...s,
                            grammarIdx: idx,
                            editorGrammar: newGrammars[idx],
                            editorGrammars: newGrammars,
                        }
                    })
                }}>Delete</Button>
                <Button onClick={() => {
                    saveSelectedGrammar();
                    onSave(state.editorGrammars, state.editorGrammarIdx);
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
    editorGrammars: EditorGrammar[];
    editorGrammarIdx: number;
    onSave: (editorGrammars: EditorGrammar[], editorGrammarIdx: number) => void;
}

export default forwardRef(GrammarSelect);