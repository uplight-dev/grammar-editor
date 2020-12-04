import { ASTNode } from "@lezer-editor/lezer-editor-common";
import { FunctionalComponent, h } from "preact";
import { useRef } from "react";
import * as style from "./treenode.css";
export interface Props {
  node: ASTNode;
  onSelect: Function;
  selection?: ASTNode;
}

export const TreeNode: FunctionalComponent<Props> = ({ node, onSelect, selection }: Props) => {
  let selected: boolean = false;
  let el = useRef<HTMLDivElement>();

  selected = node === selection

  function handleSelect(e: Event) {
    e.stopPropagation();

    onSelect(node);
  }

  function afterUpdate() {
    return () => {
      if (selected) {
        el.current?.scrollIntoView();
      }
    };
  }

  if (node == null) {
    return (<div />);
  }

  return (
    <div ref={el} class={selected ? style.selected : style.node} onMouseOver={handleSelect} >

      <div class={style.description}>
        <span class={node.error ? style.error : style.name}>{node.error ? 'ERROR' : node.name}</span> [ {node.start}, {node.end} ]
      </div>

      {node.children.length > 0 && (
        <div class={style.children}>
          {node.children.map((child: ASTNode) => {
            //console.log('xxx=' + child.name);
            return (
              <div>
                <TreeNode node={child} onSelect={onSelect} selection={selection}></TreeNode>
              </div>
            )
          })}
        </div>
      )}

    </div>
  )
};

export default TreeNode;