import { OPTION_ROOT_TAGS } from '@grammar-editor/grammar-editor-api';
import { produce } from 'immer';
import { createHook, createStore, defaults } from 'react-sweet-state';
import { EditorGrammar, EditorGrammarUtils, Grammar } from '../util/editorgrammar';
import GrammarLoader from '../util/grammarplugin/loader';
import Actions from './actions';

defaults.mutator = (currentState, producer) => {
    const r = produce(currentState, producer);
    return r;
};
defaults.batchUpdates = true;

export const DEF_LAYOUT = [
    {
      "x": 0,
      "y": 0,
      "width": 12,
      "height": 1,
      "minWidth": 3,
      "maxHeight": 1,
      "id": "grid-cfg"
    },
    {
      "x": 0,
      "y": 1,
      "width": 6,
      "height": 2,
      "id": "grid-codeEditor"
    },
    {
      "x": 6,
      "y": 1,
      "width": 6,
      "height": 11,
      "id": "grid-tree"
    },
    {
      "x": 0,
      "y": 3,
      "width": 6,
      "height": 11,
      "id": "grid-context"
    },
    {
      "x": 6,
      "y": 12,
      "width": 2,
      "height": 2,
      "id": "grid-output"
    },
    {
      "x": 8,
      "y": 12,
      "width": 4,
      "height": 2,
      "id": "grid-outputErr"
    }
  ];

export const PREDEFINED_GRAMMARS : Grammar[] = [
    new Grammar('Lezer', 'http://localhost:3000', {
        name: "name",
        start: "start", end: "end",
        skip: "skip",
        error: "error",
        value: "value",
        children: "children"
    }, null, true),
    new Grammar('Peg.js', 'http://localhost:3000', {
        name: "name",
        start: "start", end: "end",
        skip: "skip",
        error: "error",
        value: "value",
        children: "children"
    }, null, true),
    new Grammar('Chevrotain', 'https://cdn.jsdelivr.net/npm/@grammar-editor/lezer-example-grammar@1.0.1/dist', null, null, true),

];

export const Store = createStore({
    initialState: {
        clientId: null,
        shareStr: null,
        expression: '',
        contextStr: JSON.stringify({person: {name: 'John', surname: 'Doe'}}),
        predefinedGrammars: PREDEFINED_GRAMMARS,
        editorGrammars: [],
        editorGrammarIdx: 0,
        editorGrammar: null,
        grammarTag: null,
        grammarTags: [],
        grammarLoader: null,
        notifyShow: (...args) => {console.warn('Notify not inited yet ...')},
        popupManager: null,
        layout: DEF_LAYOUT
    } as StoreType,
    actions: Actions,
    name: 'store'
});

interface StoreType {
    clientId: string,
    shareStr: string,
    expression: string,
    contextStr: string,
    predefinedGrammars: Grammar[],
    editorGrammars: EditorGrammar[],
    editorGrammarIdx: number,
    editorGrammar: EditorGrammar,
    grammarTag: string,
    grammarTags: string[],
    grammarLoader: GrammarLoader,
    notifyShow: (...args : any) => void,
    popupManager: any,
    layout: []
}

export interface StoreProps {
    setState: (producer: (draftState: StoreType) => void) => void;
    getState: () => StoreType;
    dispatch: any;
}

export const useStore = createHook(Store);
