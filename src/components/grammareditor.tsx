import { FunctionalComponent, h, Ref } from "preact";
import { useRef } from "preact/hooks";
import { withPopups } from "react-popup-manager";
import { useStore } from "../ctx/ctx";
import { EditorGrammar } from "../util/editorgrammar";
import Button from './button';
import GrammarSelect, { Handles as GrammarSelectHandles } from './grammarselect';

const GrammarEditor: FunctionalComponent<any> = ({popupManager}) => {
  const refGrammars : Ref<GrammarSelectHandles> = useRef(null);
  const [storeState, storeActions] = useStore();

  const onSelect = async (idx: number) => {
    storeActions.setGrammarIdx(idx)
  }
  
  const onSave = (grammars: EditorGrammar[], grammarIdx: number) => {
    storeActions.setGrammars(grammars)
  }

  return (
    <div style={{height: '100%', padding: '20px'}}>
      <div className="hcontainer flex-vcenter" style={{ height: '30px'}}>
          <span>Grammar</span>
          <GrammarSelect style={{ width: '1000px' }} ref={refGrammars} popupManager={popupManager} 
            grammars={storeState.grammars}
            onSelect={onSelect} onSave={onSave} />
          <Button onClick={() => {if (refGrammars.current) refGrammars.current.openGrammarDetails(storeState.grammarIdx)}}>Edit</Button>
          <Button onClick={async () => {await onSelect(storeState.grammarIdx)}}>Reload</Button>
      </div>
      {
        storeState.grammar.externalEditorEnabled && 
        (<iframe height="100%" width="100%" 
          src={storeState.grammar.externalEditorUrl + '?lite=true'} scrolling="no" frameBorder={0} allowTransparency={true} allowFullScreen={true} sandbox="allow-forms allow-pointer-lock allow-popups allow-same-origin allow-scripts allow-modals"></iframe>
        )
      }
      {
        !storeState.grammar.externalEditorEnabled &&
        (
          <textarea height="100%" width="100%" />
        )
      }
    </div>
  );
};

export default withPopups()(GrammarEditor);
