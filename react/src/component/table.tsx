import { map } from "@azera/util";
import { Component, h } from "preact";
import { ClickLink } from "./click_link";
import { Paginator } from "./paginator";
import __ from "./translate";
// import { __ } from "../lib/translation";
// import { IUser } from "../model/interfaces";

export interface IAction<T> {
    name: string;
    action: (row: T) => void;
    decide?: (row: T) => boolean;
}

export type IColumn = string | IColumnObject;

export interface IColumnObject {
    name: string;
    title?: string;
    width?: string | number;
    render?: (value?: any, row?: any) => any;
    params?: (value?: any, row?: any) => any;
    priority?: number;
    head?: (column: IColumn) => string | JSX.Element | null;
    sortable?: boolean;
}

export interface ITableProps <T> {
    columns: IColumn[];
    data: T[];
    defaultSort: string;
    desc?: boolean;
    limit: number;
    className?: string;
    responsive?: boolean;
    pages?: number;
    actions?: IAction<T> [];
    loading?: boolean;
}

export interface ITableState {
    orderBy: string;
    orderAsc: boolean;
    sortable: boolean;
    mini: boolean;
    page: number;
}

export let classNames = (classList: { [name: string]: boolean }, arrays = []) => {
    return map(classList, (pass, name) => {
        return pass ? name : null;
    }).filter( name => !!name ).concat(arrays).join(" ");
};

export let Render = {
    YesNo: value => __( value ? 'Yes' : 'No' ),
    ActiveDeActive: value => __( value ? 'Active' : 'DeActive' ),
    Date: value => {
        return value && value.date ? value.date : value;
    },
    Percent: value => `${value}%`,
    // User: ({ firstName, lastName }: IUser) => `${firstName} ${lastName}`
};

/**
 * Table react component
 * @author Masoud Zohrabi <mdzzohrbi@gmail.com>
 */
export class Table <T> extends Component<ITableProps<T> , ITableState> {

    // State
    state: ITableState = {
        orderAsc: false,
        orderBy: null,
        sortable: true,
        mini: false,
        page: 1
    };

    // Root element
    element: Element = null;

    get orderBy() { return this.state.orderBy || this.props.defaultSort; }

    // Columns
    private getColumns = () => this.props.columns as IColumnObject[];

    // Available table rows
    private getRows = () => {
        let {orderAsc, page} = this.state;
        let orderBy = this.orderBy;
        let {data, limit} = this.props;

        if ( orderBy )
            data = data.sort((a, b) => {
                return ( orderAsc ? a[orderBy] > b[orderBy] : a[orderBy] < b[orderBy] ) ? 1 : -1;
            });

        if ( limit ) {
            let start = (page - 1) * limit;
            data = data.slice(start, start + limit);
        }

        return data;
    }

    private checkResponsive() {
        let width = window.innerWidth;
        if (width <= 840) {
            this.setState({ mini: true });
        } else {
            this.setState({ mini: false });
        }
    }

    componentDidMount() {
        if (this.props.responsive || true) {
            this.checkResponsive();
            window.addEventListener('resize', this.checkResponsive.bind(this));
        }
    }

    /**
     * Get table cell attributes
     * @return {Object}
     */
    private getCellProps = (row, column: IColumnObject, base = {}) => {
        let { name, params } = column;
        let extraParams = params ? params(row[name], row) : {};
        let classNames = (extraParams['className'] || ( extraParams['className'] = [] ));
        classNames.push(`column-${column.name}`);
        if ( column.name == this.orderBy )
            classNames.push("sorted");
        extraParams['className'] = base['className'] + ' ' + extraParams['className'].join(" ");
        return extraParams;
    }

    /**
     * Render cell content
     * @return {any}
     */
    private getCellContent = (row, column: IColumnObject) => {
        return column.render ? column.render( row[column.name], row ) : row[column.name];
    }


    // Set table sort column
    private sortBy = (orderBy: string) => {
        if ( !this.state.sortable ) return;
        let { orderAsc } = this.state;
        orderAsc = orderBy == this.state.orderBy ? !orderAsc : orderAsc;
        this.setState({ orderBy, orderAsc });
    }


    // Render column
    private renderColumn = (column: IColumnObject) => {
        let {orderAsc, sortable} = this.state;
        let classNames = [ "column", `column-${ column.name }` ];
        if ( sortable && column.sortable ) {
            classNames.push("sortable");
        }
        if ( column.name == this.orderBy ) classNames.push( orderAsc ? 'sorted asc' : 'sorted desc' );
        return <th className={classNames.join(" ")} onClick={ column.sortable ? this.sortBy.bind(this, column.name) : null }>
            { column.head ? column.head(column) : __(column.title) }
        </th>;
    }

    // Render table row
    private renderRow = (row) => {
        return <tr key={ row.id }>
            { map(this.getColumns(), column => <td { ...this.getCellProps(row, column, { className: 'column' }) }>{ this.getCellContent(row, column) }</td>) }
        </tr>;
    }

    // Render table head
    private renderHead = () => {
        return <thead>
            { map(this.getColumns(), this.renderColumn) }
            {/*<tr>*/}
                {/*<th colSpan={ this.getColumns().length }>*/}
                    {/*{ this.renderPaginator() }*/}
                {/*</th>*/}
            {/*</tr>*/}
        </thead>;
    }

    // Render table body
    private renderBody = () => {
        return <tbody>
            { this.getRows().length == 0 ? <tr><td className={"empty"} colSpan={this.getColumns().length}>{ __( this.props.loading === true ? 'Loading...' : 'No data' ) }</td></tr> : null }
            { this.getRows().map(this.renderRow) }
        </tbody>;
    }

    get pagesCount() {
        return this.props.pages ? this.props.pages : ( this.props.data.length / this.props.limit );
    }

    private renderPaginator = () => {
        return <Paginator currentPage={this.state.page} onSelect={ this.pageSelect } pages={ this.pagesCount }/>;
    }

    pageSelect = page => this.setState({ page });

    renderMini = () => {
        let {className} = this.props;
        return <div>
            { this.renderPaginator() }
            <div class={ `table table-mini ${className}` }>
                { this.getRows().map(row => {
                    return <div class={"table-row container-fluid align-items-center"}>
                        { this.getColumns().map(column => {
                            return <p className={"table-column row"}>
                                <b className={"column-name col-sm-4 no-wrap"}>{ __(column.title) }</b>
                                <span className={"col"}>{ this.getCellContent(row, column) }</span>
                            </p>;
                        }) }
                    </div>;
                }) }
            </div>
            { this.renderPaginator() }
        </div>;
    }

    renderDiv() {
        let { className } = this.props;
        return <div className={`table ${ className }`} ref={table => this.element = table}>
            { this.getRows().map( row => {
                return <div className="row">
                    { this.getColumns().map(column => <div { ... this.getCellProps(row, column, { className: column.width ? `col-${column.width}` : 'col' }) }>{ this.getCellContent(row, column) }</div>) }
                </div>;
            }) }
        </div>;
    }

    actionsCell = (_, row) => {
        return <span className={"row-actions"}>
            { this.props.actions.map( action => {
                if ( action.decide && !action.decide(row) ) return;
                return <ClickLink onClick={action.action.bind(this, row)}>{ __(action.name) }</ClickLink>;
            }) }
        </span>;
    }

    static renderByName(name) {
        return {
            active: Render.ActiveDeActive,
            enable: Render.ActiveDeActive,
            show_in_list: Render.YesNo
        }[name];
    }

    componentWillMount() {
        this.initializeProps(this.props);
    }

    componentWillReceiveProps(props) { this.initializeProps(props); }

    initializeProps(props: ITableProps<T>) {
        let { columns } = props;

        props.columns = Object.assign(columns).map(column => {
            if ( typeof column == 'string' ) column = { name: column };
            column.title = column.title || column.name;// || S(column.name).humanize().toString();
            column.render = column.render || Table.renderByName(column.name);
            return column;
        });

        if ( props.actions && props.columns.filter((column: IColumnObject) => column.name == 'action').length <= 0 ) {
            props.columns.push({
                name: 'action',
                render: this.actionsCell,
                title: 'Action'
            });
        }
    }

    // Main render function
    render() {

        // return this.renderDiv();

        if ( this.state.mini ) return this.renderMini();

        let {className} = this.props;
        return <div className={"table-container"}>
            <table ref={table => this.element = table} className={className}>
                { this.renderHead() }
                { this.renderBody() }
            </table>
            { this.renderPaginator() }
        </div>;
    }

}