import {h} from "preact";
// import "./paginator.scss";

export interface IAttributes {
    onSelect: (page: number) => void;
    pages: number;
    currentPage?: number;
}

export function Paginator({ onSelect, pages, currentPage, ...props }: IAttributes & JSX.HTMLAttributes) {

    props['className'] = props['className'] || "paginator";

    let items = [];

    for (let page = 1; page <= pages; page++) {
        items.push(<span onClick={onSelect.bind(this, page)} class={`paginator-item ${ currentPage == page ? 'selected' : '' }`}>{ page }</span>);
    }

    return <div { ...props }>
        { ...items }
    </div>;

}