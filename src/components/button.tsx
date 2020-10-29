import { HTMLAttributes } from 'enzyme';
import {FunctionalComponent, h} from 'preact'

const Button : FunctionalComponent<{
    onClick?: h.JSX.MouseEventHandler<HTMLButtonElement>, 
    style?: string | { [key: string]: string | number }, 
    className?: string, 
    children: string}> = ({onClick, className, style, children}) => {
    return (
        <button onClick={onClick} class={className ? className : 'blue'} style={style}>{children}</button>
    )
}

export default Button;