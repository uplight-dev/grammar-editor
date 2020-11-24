import { Fragment, h } from "preact";
import { ForwardFn, forwardRef } from 'preact/compat';
import { useEffect, useImperativeHandle, useRef, useState } from 'preact/hooks';
import Modal from 'react-modal';
import { DEMO_GITHUB_URL } from "../ctx/ctx";
import Button from "./button";

const OPT_NEW = "new";
const OPT_FORK = "fork";

const GITHUB_URL_RX = /https?:\/\/(www\.)?github.com\/\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g;

export interface Handles {
    editRepo(repo : Repo) : void
}

//code style: https://www.robinwieruch.de/react-function-component
const RepoSelect: ForwardFn<{ 
    repos: Repo[], 
    repoIdx: number,
    style: any, 
    onFork?: Function, 
    onNew?: (repo:Repo) => void, 
    onSelect?: (idx) => void, 
    onEdit?: (repo, idx) => void,
    popupManager?: any}, Handles> = ({ repos, repoIdx, style, onFork, onNew, onSelect, onEdit, popupManager }, ref) => {
    interface State {
        adding?: boolean;
    }

    const [state, setState] = useState<State>({
        adding: false
    });

    const repoEd = useRef<HTMLInputElement>(null);
    const sel = useRef<HTMLSelectElement>(null);
    let forkPopup = null;
    let editPopup = null;

    // ### PRIVATE METHODS

    const editRepo = (repo) => {
        repo = repo || repos[repoIdx];
        if (editPopup) {
            showAlert('Error', 'Already editing ...')
            return;
        }
        
        editPopup = popupManager.open(EditPopup, {
            title: 'Edit Repo',
            repo: repo,
            onEdit: (repo) => {
                onEdit(repo, repoIdx);
            },
            onClose:() => {
                editPopup = null;
            }
        });
    }

    const onSelect0 = ({ target }) => {
        const repoIdx = sel.current.selectedIndex;
        switch (target.value) {
            case OPT_NEW:
                handleNew();
                break;
            case OPT_FORK:
                handleFork();
                break;
            default:
                onSelect(repoIdx);
                break;
        }
    }

    const handleNew = () => {
        setState(s => ({ ...s, adding: true }))
    }

    const handleFork = () => {
        forkPopup = popupManager.open(ForkPopup, {title: 'Fork Popup', onNewRepo: (url) => onNewRepo(url)});
    }

    const onNewRepo = (repoURL, after?: (repo) => void) => {
        forkPopup && forkPopup.close();
        if (!repoURL.match(GITHUB_URL_RX)) {
            showAlert('Invalid repo URL', (<div>Invalid repository URL: {repoURL}<br/><br/>Please use a GitHub based URL.</div>));
            return;
        }
        if (repos.find(r => r.repoUrl === repoURL)) {
            showAlert('Already exists', 'Repo URL already exists');
            return;
        }
        const r = new Repo(repoURL, null);
        console.log('new repo: ' + JSON.stringify(r));
        onNew(r)
        setState(s => ({ ...s, adding: false }))
        after && after(r);
    }

    const showAlert = (title, children) => {
        if (typeof children === 'string') {
            children = (<span>{children}</span>);
        }
        popupManager.open(({isOpen, onClose}) => (
            <Modal isOpen={isOpen} onRequestClose={onClose} className="Modal" overlayClassName="Overlay" contentLabel={title}>
                {children}
            </Modal>
        ), {title: title})
    }

    useEffect(() => {
        if (repoEd.current)
            repoEd.current.focus();
    }, [state.adding])

    useEffect(() => {
        if (sel.current) {
            sel.current.selectedIndex = repoIdx;
        }
    }, [repoIdx])

    // ### PUBLIC METHODS
    useImperativeHandle(ref, () => ({
        editRepo: editRepo
      }));

    // ### UI

    return (
        <Fragment>
            {!state.adding && (
                <select style={style} onChange={onSelect0} ref={sel} >
                    {repos.map(r => {
                        return (
                            <option data-value={r}>{r.repoUrl}</option>
                        );
                    })}
                    <option value={OPT_NEW}>Load existing grammar ...</option>
                    <option value={OPT_FORK}>Fork example grammar ...</option>
                </select>)
            }

            {state.adding && (
                <input ref={repoEd} style={style} placeholder="Type grammar repo URL" onKeyDown={(e) => {
                    if (e.keyCode == 13) {
                        onNewRepo((e.target as HTMLInputElement).value, (repo) => editRepo(repo));
                    } else if (e.keyCode == 27) {
                        setState(s => ({ ...s, adding: false }));
                    }
                }} onBlur={() => setState(s => ({ ...s, adding: false }))} />
            )}

        </Fragment>
    );
}

const ForkPopup = ({isOpen, onClose, onNewRepo}) => {
    const repoTxt = useRef<HTMLInputElement>(null);

    const doClose = () => {
        onClose();
    }

    useEffect(() => {
        if (repoTxt.current)
            repoTxt.current.focus();
    })

    return (
        <Modal isOpen={isOpen} onClose={onClose} onRequestClose={doClose} className="Modal" overlayClassName="Overlay" >
            <div className="modal-title">Fork Repo</div>
            <ol className="rounded-list">
                <li><span>Please fork this <a target="_blank" href={DEMO_GITHUB_URL}>Git Repo</a></span></li>
                <li>Paste forked repo url here: <input ref={repoTxt} onKeyDown={(e) => e.keyCode == 13 ? onNewRepo(repoTxt.current.value) : ""} style={{ width: '300px' }} placeholder="Forked Git repo URL ..." /></li>
            </ol>

            <div className="button-bar">
                <Button onClick={() => onNewRepo(repoTxt.current.value)}>Add</Button>
            </div>
        </Modal>
    );
}

export class Repo {
    constructor(public repoUrl: string, public deployUrl?: string, public replitUrl?: string) {

    }
}

const EditPopup : (props: {isOpen: string, onClose: () => void, title: string, repo: Repo, onEdit: (repo: Repo) => void}) => h.JSX.Element = ({isOpen, onClose, title, repo, onEdit}) => {
    const refRepoUrl = useRef<HTMLInputElement>(null);
    const refDeployUrl = useRef<HTMLInputElement>(null);
    const refReplitUrl = useRef<HTMLInputElement>(null);

    const doClose = () => {
        onClose();
    }

    useEffect(() => {
        if (refRepoUrl.current)
            refRepoUrl.current.focus();
    })

    return (
        <Modal isOpen={isOpen} onClose={onClose} onRequestClose={doClose} className="Modal" overlayClassName="Overlay" closeTimeoutMS={200} shouldFocusAfterRender={false}>
            <div className="modal-title">{title}</div>
            <div className="grid1x">
                <label style={{color:'red', fontWeight: 'bolder'}}>* Grammar Deploy URL:</label>
                <input ref={refDeployUrl} value={repo.deployUrl} ></input>
                <label>Grammar GitHub URL:</label>
                <input ref={refRepoUrl} value={repo.repoUrl} className="repo-url"></input>
                <label>Repl.it URL:</label>
                <input ref={refReplitUrl} value={repo.replitUrl}></input>
            </div>
            <div className="button-bar">
                <Button onClick={() => {onEdit(
                    new Repo(refRepoUrl.current.value, refDeployUrl.current.value, refReplitUrl.current.value)
                    ); doClose()}}>Save</Button>
            </div>
        </Modal>
    );
}

export default forwardRef(RepoSelect);