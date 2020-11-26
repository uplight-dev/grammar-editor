import { FunctionalComponent, h } from "preact";
import { useRef } from "react";
import * as style from "./treenode.css";

export interface INode {
  name: string,
  start: number,
  end: number,
  children: Node[],
  tokenType?: string,
  skip?: boolean,
  error?: boolean,
  prop(v: string): string;
}

export class Node implements INode {
  constructor(
    public name: string,
    public start: number,
    public end: number,
    public children: Node[],
    public tokenType?: string,
    public skip?: boolean,
    public error?: string
  ) {

  }

  prop(v: string): string {
    throw new Error("Not callable.");
  }

}

export interface Props {
  node: Node;
  onSelect: Function;
  selection?: Node;
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
          {node.children.map((child: Node) => {
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