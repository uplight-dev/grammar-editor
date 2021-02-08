import { FunctionalComponent, h, Ref } from "preact";
import { useEffect, useRef } from "preact/hooks";
import { withPopups } from "react-popup-manager";
import { useStore } from "../ctx/ctx";
import { EditorGrammar } from "../util/editorgrammar";
import StyledButton from './styledbutton';
import GrammarSelect, { Handles as GrammarSelectHandles } from './grammarselect';

const GrammarEditor: FunctionalComponent<any> = ({popupManager}) => {
  const refGrammars : Ref<GrammarSelectHandles> = useRef(null);
  const [storeState, storeActions] = useStore();

  const onSelect = async (idx: number) => {
    storeActions.setGrammarIdx(idx)
  }
  
  const onSave = (grammars: EditorGrammar[], grammarIdx: number) => {
    storeActions.setGrammars(grammars)
    storeActions.setGrammarIdx(grammarIdx);
  }

  return (
    <div style={{height: '100%', padding: '20px'}}>
      <div className="hcontainer flex-vcenter" style={{ height: '30px'}}>
          <span>Grammar</span>
          <GrammarSelect style={{ width: '1000px' }} ref={refGrammars} popupManager={popupManager} 
            editorGrammarIdx={storeState.editorGrammarIdx}
            editorGrammars={storeState.editorGrammars}
            onSelect={onSelect} onSave={onSave} />
            <span className="styled-buttons">
              <StyledButton onClick={() => {if (refGrammars.current) refGrammars.current.openGrammarDetails(storeState.editorGrammarIdx)}}>Edit</StyledButton>
              <StyledButton onClick={async () => {await onSelect(storeState.editorGrammarIdx)}}>Reload</StyledButton>
            </span>
      </div>
      {
        storeState.editorGrammar && storeState.editorGrammar.externalEditorEnabled && 
        (<iframe height="100%" width="100%" 
          src={storeState.editorGrammar.externalEditorUrl + '?lite=true'} scrolling="no" frameBorder={0} allowTransparency={true} allowFullScreen={true} sandbox="allow-forms allow-pointer-lock allow-popups allow-same-origin allow-scripts allow-modals"></iframe>
        )
      }
      {
        storeState.editorGrammar && !storeState.editorGrammar.externalEditorEnabled &&
        (
          <textarea style={{width: '100%', height: '100%'}} />
        )
      }
    </div>
  );
};

export default withPopups()(GrammarEditor);
