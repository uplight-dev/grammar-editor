import { FunctionalComponent, h } from "preact";
import { useEffect, useState } from "preact/hooks";
import Modal from 'react-modal';
import { PopupProvider } from 'react-popup-manager';
import { Tab, TabPanel, Tabs } from 'react-tabs';
import { useStore } from "../ctx/ctx";
import GrammarEditor from "./grammareditor";
import TabListExt from './tablistext';
import GrammarComponent from "./grammarinspector";
import icon from '../assets/icons/lezer.png'

const App: FunctionalComponent = () => {
    // let currentUrl: string;
    let [grammarShown, setGrammarShown] = useState(false);
    const [storeState, storeActions] = useStore();

    useEffect(() => {
        Modal.setAppElement('#app')
    }, []);

    useEffect(() => {
        if (!storeState.grammar) {
            storeActions.init();
        }
    }, [storeState, storeActions]);

    return (
        <PopupProvider>
            <div id="app" className="vcontainer">
                <div style={{ height: '100%' }}>
                    <Tabs forceRenderTabPanel={true} onSelect={(idx) => {
                        console.log('IDX='+idx)
                        if (!grammarShown && idx == 1) {
                            setGrammarShown(true);
                        }
                        return true;
                    }}>
                        <TabListExt title={(<span className="title hcontainer flex-vcenter" style={{gap: 5}}><img src={icon} style={{width:32, height:32}} /><span>Lezer Editor </span><a target="_blank" href={storeState.repos[storeState.repoIdx].repoUrl}>{storeState.repos[storeState.repoIdx].repoUrl}</a></span>)}>
                            <Tab>Inspect</Tab>
                            <Tab>Grammar</Tab>
                        </TabListExt>

                        <TabPanel>
                            <GrammarComponent grammar={storeState.grammar}></GrammarComponent>
                        </TabPanel>
                        <TabPanel>
                            {grammarShown && (
                                <GrammarEditor></GrammarEditor>
                            )}
                        </TabPanel>
                    </Tabs>
                </div>
            </div>
        </PopupProvider>
    );
};

export default App;
