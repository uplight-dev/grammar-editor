import { h } from "preact";

export default ({msg}) => {
    return (
        <div style="width: 100%; height: 100%; display:flex; justify-content:center; align-items: center; font-size: 2em">
        <span style="background-color: yellow">{msg}</span>
    </div>);
}