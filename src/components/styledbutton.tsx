import { HTMLAttributes } from 'enzyme';
import {FunctionalComponent, h} from 'preact'

const StyledButton : FunctionalComponent<{
    onClick?: h.JSX.MouseEventHandler<HTMLButtonElement>, 
    style?: string | { [key: string]: string | number }, 
    className?: string, 
    children: string}> = ({onClick, className, style, children}) => {
    return (
        <button onClick={onClick} class={className ? 'styledButton '+className : 'styledButton blue'} style={style}>{children}</button>
    )
}

export default StyledButton;