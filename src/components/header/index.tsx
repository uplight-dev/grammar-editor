import { FunctionalComponent, h } from "preact";
import { Link } from "preact-router/match";
import * as style from "./style.css";

const Header: FunctionalComponent = () => {
    return (
        <header class={style.header}>
            <h1><i>Lezer Editor</i></h1>
            <nav>
                <Link activeClassName={style.active} href="/">
                    Inspect
                </Link>
                <Link activeClassName={style.active} href="/grammar">
                    Grammar
                </Link>
            </nav>
        </header>
    );
};

export default Header;
