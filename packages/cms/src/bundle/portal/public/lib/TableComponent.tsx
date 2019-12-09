import * as React from 'react';
import { humanize } from './Strings';

export interface TableDataRow { [name: string]: any }

export interface TableComponentProps<T extends TableDataRow> {
    dataSource?: string | Promise<T[]> | T[]
    loading?: boolean
    columns?: TableColumn<T, keyof T>[]
    mergeColumns?: boolean
    allowAdd?: boolean
    renderEditor?: (column: TableColumn<T, keyof T>, state: any, setState: (data: any) => void) => JSX.Element
}

export interface TableColumn<T extends TableDataRow, K extends keyof T> {
    name: string
    title: string
    dataIndex?: K
    render?: (value: T[K], data: T) => JSX.Element
}

export function TableComponent<T>(props: TableComponentProps<T>) {

    let [dataSource, setDataSource] = React.useState<T[]>([]);
    let [loading, setLoading] = React.useState(false);
    let [columns, setColumns] = React.useState<TableColumn<T, keyof T>[]>([]);
    let [newRow, setNewRow] = React.useState({});

    // Loading
    React.useEffect(() => setLoading(props.loading), [props.loading]);

    // DataSource
    React.useEffect(() => {
        if (typeof props.dataSource == 'string') {
            setLoading(true);
            fetch(props.dataSource).then(res => {
                res.json().then(data => {
                    setLoading(false);
                    setDataSource(data);
                    setColumns(populateColumns(data));
                })
            })
        }
    }, [props.dataSource]);

    function populateColumns<T extends TableDataRow> (data: T[]) {
        let { columns: propColumns, mergeColumns = false } = props;
        if ( columns && columns.length > 0 ) return columns;
        if ( propColumns && !mergeColumns ) return propColumns;

        return [ ...estimateColumns(data).filter(c => !(propColumns || []).find(a => a.name == c.name)) , ...(propColumns || []) ];
    }

    function estimateColumns<T extends TableDataRow>(data: T[]) {
        let columns: TableColumn<T, keyof T>[] = [];
        if (data.length > 0) {
            columns = Object.keys(data[0]).map(name => {
                return {
                    name,
                    title: humanize(name),
                    dataIndex: name
                }
            });
        }
        return columns;
    }

    return <table>
        <thead>
            <tr>
                { columns.map(column => <th key={column.name}>{ column.title }</th>) }
            </tr>
        </thead>
        <tbody>
            { dataSource.map((row, index) => {
                return <tr key={index}>
                    { columns.map(column => <td key={column.name}>{ column.render ? column.render(row[column.dataIndex], row) : String(row[column.dataIndex]) }</td>)}
                </tr>;
            })}
            { props.allowAdd ? <tr>
                { columns.map(column => <td key={column.name}>{ props.renderEditor(column, newRow, setNewRow) }</td>)}
            </tr> : null }
        </tbody>
    </table>

}