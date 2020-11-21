import { FunctionalComponent, h, Ref } from "preact";
import { useRef } from "preact/hooks";
import { withPopups } from "react-popup-manager";
import { useStore } from "../ctx/ctx";
import Button from './button';
import RepoSelect, { Handles as RepoSelectHandles, Repo } from './reposelect';


const GrammarEditor: FunctionalComponent<any> = ({popupManager}) => {
  const refRepos : Ref<RepoSelectHandles> = useRef(null);
  const [storeState, storeActions] = useStore();

  console.table(storeState.repos)

  const onNew = (repo: Repo) => {
    const newRepos = [repo, ...storeState.repos];
    console.table(newRepos)
    storeActions.setRepos(newRepos)
    storeActions.setRepoIdx(0);
  }

  const onSelect = async (idx: number) => {
    if (storeState.repos[idx].deployUrl) {
      const grammar = await storeState.grammarLoader.load(storeState.repos[idx].deployUrl);
      storeActions.setGrammar(grammar)
    }

    storeActions.setRepoIdx(idx);
  }
  
  const onEdit = (repo: Repo, idx: number) => {
    console.log({repo, idx})
    const newRepos = [...storeState.repos];
    newRepos[idx] = repo;
    console.log(newRepos);
    storeActions.setRepos(newRepos)
  }

  return (
    <div style={{height: '100%', padding: '20px'}}>
      <div className="hcontainer flex-vcenter" style={{ height: '30px'}}>
          <span>Grammar</span>
          <RepoSelect style={{ width: '1000px' }} ref={refRepos} popupManager={popupManager} 
            repos={storeState.repos} repoIdx={storeState.repoIdx}
            onSelect={onSelect} onEdit={onEdit} onNew={onNew} />
          <Button onClick={() => {if (refRepos.current) refRepos.current.editRepo(null)}}>Edit</Button>
      </div>
      {storeState.repos[storeState.repoIdx].replitUrl && (<iframe height="100%" width="100%" 
          src={storeState.repos[storeState.repoIdx].replitUrl + '?lite=true'} scrolling="no" frameBorder={0} allowTransparency={true} allowFullScreen={true} sandbox="allow-forms allow-pointer-lock allow-popups allow-same-origin allow-scripts allow-modals"></iframe>
      )}
    </div>
  );
};

export default withPopups()(GrammarEditor);
