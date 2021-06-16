import { SUPPORTS_EXT_EDITOR, SUPPORTS_FORK, SUPPORTS_RECOMPILE, SUPPORTS_ROOT_TAGS } from "@grammar-editor/grammar-editor-api";
import React, {useCallback} from 'react';
import { Fragment, FunctionalComponent, h } from "preact";
import { useEffect, useRef } from "preact/hooks";
import { AwesomeButton } from "react-awesome-button";
import 'react-awesome-button/dist/themes/theme-c137.css';
import ReactList from 'react-list';
import { withPopups } from "react-popup-manager";
import { useStore } from "../store/store";
import { UserDisplayUtils } from "../util/userdisplayutils";
import StyledButton from './styledbutton';
import { FullScreen, useFullScreenHandle } from "react-full-screen";

const GrammarEditor: FunctionalComponent<any> = ({ popupManager }) => {
    const [storeState, storeActions] = useStore();
    const fsHandle = useFullScreenHandle();    
    const refGrammarUrl = useRef<HTMLInputElement>(null);
    const refGrammarName = useRef<HTMLInputElement>(null);
    const refRootTags = useRef<HTMLInputElement>(null);
    const refExtEditorEnabled = useRef<HTMLInputElement>(null);
    const refMapping = useRef<HTMLTextAreaElement>(null);
    const refEditorArea = useRef<HTMLTextAreaElement>(null);
    const refEditorFrame = useRef<HTMLIFrameElement>(null);

    const saveOnChange = [refGrammarName, refGrammarUrl, refMapping, refEditorArea, refRootTags, refExtEditorEnabled];

    useEffect(() => {
        if (refGrammarName.current)
            refGrammarName.current.focus();
    })

    useEffect(() => {
        const self = this;
        saveOnChange.forEach((el) => {
            if (el.current) {
                el.current.onchange = onEdit.bind(self);
            }
        })
    }, []);

    const onEdit = () => {
        saveSelectedGrammar();
    }

    const saveSelectedGrammar = () => {
        if (!refGrammarName.current) {
            return;
        }

        storeActions.updateCurrentGrammar((eg) => {
            eg.grammar.name = refGrammarName.current.value;
            eg.grammar.url = refGrammarUrl.current.value;
            if (refExtEditorEnabled.current) {
                eg.externalEditorEnabled = refExtEditorEnabled.current.checked;
            }
            if (refMapping.current && refMapping.current.value) {
                eg.grammar.jsonMapping = JSON.parse(refMapping.current.value);
            }
        })

        storeState.notifyShow('Grammar Saved!', 'success')
    }

    return (
        <div className="vcontainer" style={{ height: '100%', padding: '10px', overflowY: 'auto' }}>
            <div style={{ width: '100%', maxHeight: '100px', minHeight: '100px', overflowX: 'auto', overflowY: 'auto'}}>
                <ReactList
                    axis='x'
                    itemRenderer={(index, key) => {
                        return (
                            <div style={{display: 'inline-block', lineHeight: '80px', width: '220px'}}>
                                <AwesomeButton type={'secondary'} action={(c) => {
                                //saveSelectedGrammar();
                                storeActions.setGrammarIdx(index);
                                }}
                                active={storeState.editorGrammarIdx == index}
                                ripple={false}
                                style={{
                                    width: '200px',
                                    '--button-hover-pressure': '2',
                                    'transform-speed': '0.2',
                                    '--button-secondary-color-light': 'black',
                                    '--button-secondary-color': storeState.editorGrammarIdx == index ? '#fda25c' : '#aaaaff',
                                    '--button-secondary-color-active': storeState.editorGrammarIdx == index ? '#fda25c' : '#aaaaff'
                                }}>
                                {UserDisplayUtils.editorGrammarTitle(storeState.editorGrammars[index])}
                            </AwesomeButton>
                            </div>
                        )
                    }
                    }
                    length={storeState.editorGrammars.length}
                    type='uniform'
                ></ReactList>
            </div>

            <div>
                <label style={{ }}>Grammar Name:</label>
                <input ref={refGrammarName} value={storeState.editorGrammar.grammar.name}></input>
            </div>

            <div>
                <label style={{ }}>Grammar URL:</label>
                <input ref={refGrammarUrl} value={storeState.editorGrammar.grammar.url}></input>

                {(() => {
                    if (storeState.editorGrammar.supports(SUPPORTS_FORK)) {
                        return (<button>Fork</button>);
                    } else {
                        return (<span></span>);
                    }
                })()}


                {(() => {
                    if (storeState.editorGrammar.supports(SUPPORTS_ROOT_TAGS)) {
                        return (<div>
                            <label>Root Tags (comma separated):</label>
                            <input ref={refRootTags} value={storeState.editorGrammar.grammar.rootTags}></input>
                        </div>);
                    } else {
                        return (<span></span>);
                    }
                })()}
            </div>

            {(() => {
                if (storeState.editorGrammar.supports(SUPPORTS_EXT_EDITOR)) {
                    return (
                        <div>
                            <label>External Editor Enabled:</label>
                            <input ref={refExtEditorEnabled} type='checkbox' checked={storeState.editorGrammar.externalEditorEnabled} />
                        </div>
                    );
                } else {
                    return (<span></span>);
                }
            })()}

            {(() => {
                return (
                    <div>
                        <label>JSON Mapping:</label>
                        <textarea ref={refMapping} style={{ width: '100%', height: '200px', resize: 'none' }} value={storeState.editorGrammar.grammar.jsonMapping ? JSON.stringify(storeState.editorGrammar.grammar.jsonMapping, null, 2) : ''} />
                    </div>);
                // if (state.grammar.supports(SUPPORTS_MAPPING)) {

                // } else {
                //     return (<span></span>);
                // }
            })()}

            {(() => {
                if (!storeState.editorGrammar.supports(SUPPORTS_RECOMPILE)) {
                    return (<Fragment></Fragment>);
                }
                return (
                    <Fragment>
                        <div>
                            <label>Grammar Editor:</label>
                            <button onClick={()=> {
                                fsHandle.enter(); 
                                refEditorArea.current && refEditorArea.current.focus();
                                refEditorFrame.current && refEditorFrame.current.focus();
                                }}>Edit in fullscreen</button>
                        </div>
                        <FullScreen handle={fsHandle}>
                        {
                            storeState.editorGrammar.externalEditorEnabled &&
                            (
                                <iframe ref={refEditorFrame} height="100%" width="100%"
                                    src={storeState.editorGrammar.externalEditorUrl + '?lite=true'}
                                    scrolling="no"
                                    frameBorder={0}
                                    allowTransparency={true}
                                    allowFullScreen={true}
                                    sandbox="allow-forms allow-pointer-lock allow-popups allow-same-origin allow-scripts allow-modals"></iframe>
                            )
                        }
                        {
                            !storeState.editorGrammar.externalEditorEnabled &&
                            (
                                <textarea ref={refEditorArea} style={{ width: '100%', height: '100%', resize: 'none' }} />
                            )
                        }
                        </FullScreen>
                    </Fragment>
                )
            })()}

            <div className="button-bar" style={{ marginTop: 'auto', marginBottom: '0' }}>
                <StyledButton onClick={() => {
                    saveSelectedGrammar();
                    storeActions.duplicateGrammar(storeState.editorGrammarIdx);
                }}>Duplicate</StyledButton>
                <StyledButton onClick={() => {
                    storeActions.deleteGrammar(storeState.editorGrammarIdx);
                }}>Delete</StyledButton>
                {storeState.editorGrammar.supports(SUPPORTS_RECOMPILE) && (
                    <StyledButton onClick={() => {
                        saveSelectedGrammar();
                    }}>Compile</StyledButton>
                )
                }
                <StyledButton onClick={async () => { storeActions.reloadGrammar(storeState.editorGrammarIdx) }}>Reload</StyledButton>
            </div>

        </div>
    );
};

export default withPopups()(GrammarEditor);
