import { FunctionalComponent, h } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import Modal from 'react-modal';
import { PopupProvider, withPopups } from 'react-popup-manager';
import { Tab, TabPanel, Tabs } from 'react-tabs';
import { useStore } from "../ctx/ctx";
import GrammarEditor from "./grammareditor";
import TabListExt from './tablistext';
import GrammarComponent from "./grammarinspector";
import icon from '../assets/icons/lezer.png'
import Button from "./button";
import Notifications, {notify} from 'react-notify-toast';
import jsext from "../util/jsext";

const App: FunctionalComponent<any> = ({popupManager}) => {
    // let currentUrl: string;
    let [grammarShown, setGrammarShown] = useState(false);
    const [storeState, storeActions] = useStore();
    const [state, setState] = useState({notifyShow: null})

    useEffect(() => {
        Modal.setAppElement('#app')
    }, []);

    useEffect(() => {
        storeActions.setNotifyShow(notify.createShowQueue());
    },[])

    useEffect(() => {
        if (!storeState.grammar) {
            storeActions.init();
        }
    }, [storeState, storeActions]);

    return (
        <div id="app" className="vcontainer">
            <Notifications options={{timeout: 2000, animationDuration: 100}} />
            <div style={{ height: '100%' }}>
                <Tabs forceRenderTabPanel={true} onSelect={(idx) => {
                    if (!grammarShown && idx == 1) {
                        setGrammarShown(true);
                    }
                    return true;
                }}>
                    <TabListExt title={(<Header popupManager={popupManager}></Header>)}>
                        <Tab>Inspect</Tab>
                        <Tab>Grammar</Tab>
                    </TabListExt>

                    <TabPanel>
                        <GrammarComponent></GrammarComponent>
                    </TabPanel>
                    <TabPanel>
                        {grammarShown && (
                            <GrammarEditor></GrammarEditor>
                        )}
                    </TabPanel>
                </Tabs>
            </div>
        </div>
    );
};

const Header = ({popupManager}) => {
    const [storeState, storeActions] = useStore();


    const copy = () => {
        var text = storeActions.export();
        jsext.copy(text);
        storeState.notifyShow('Export copied to clipboard!', 'success')
    }

    const ImportPopup = ({isOpen, onClose}) => {
        const txtRef = useRef<HTMLTextAreaElement>();
        const [state, setState] = useState({notifyShow: null})

        useEffect(() => {
            if (txtRef.current)
                txtRef.current.focus();
        });

        return (
            <Modal isOpen={isOpen} onRequestClose={onClose} className="Modal" overlayClassName="Overlay">
                <div style={{width: '800px', height: '400px'}}>
                    <textarea ref={txtRef} value={storeState.shareStr} style={{width: '100%', height: 'calc(100% - 50px)'}}></textarea>
                    <div className="button-bar" style={{height: '50px'}}>
                        <Button onClick={(e) => {storeActions.import(txtRef.current.value); onClose();}}>Import</Button>
                    </div>
                </div>
            </Modal>
        )
    }

    return (<span className="title hcontainer flex-vcenter" style={{gap: 5, width:'100%'}}>
        <img src={icon} style={{width:32, height:32}} />
        <span>Lezer Editor </span>
        <a target="_blank" 
            href={storeState.repos[storeState.repoIdx].repoUrl}>{storeState.repos[storeState.repoIdx].repoUrl}
        </a>
        <div style={{marginLeft:'auto', marginRight: '10px'}}>
            <Button onClick={() => {
                popupManager.open(ImportPopup);
            }
            }>Import</Button>
            <Button className="orange" onClick={copy}>Export</Button>
        </div>
    </span>)
}

const AppWithPopup = withPopups()(App);

const AppExported = () => {
    return (<PopupProvider><AppWithPopup></AppWithPopup></PopupProvider>)
}

export default AppExported;
