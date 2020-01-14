import * as React from 'react';
import { useState, useEffect } from 'react';
import { humanize } from './Strings';
import { classNames } from './Util';

/**
 * Table
 * @param props Component properties
 */
export function TableComponent<T>(props: TableComponentProps<T>) {

    let { dataSource, loading: propLoading, columns: propColumns, mergeColumns = false , allowAdd = false, allowSort = true, renderEditor, ...attrs } = props;

    let [data, setData] = useState<T[]>([]);
    let [loading, setLoading] = useState(false);
    let [columns, setColumns] = useState<TableColumn<T, keyof T>[]>([]);
    let [newRow, setNewRow] = useState({});
    let [sortBy, setSortBy] = useState<{ column: TableColumn<T, keyof T>, asc: boolean }[]>([]);

    // Loading
    useEffect(() => setLoading(propLoading), [propLoading]);

    // DataSource
    useEffect(() => {
        if (typeof dataSource == 'string') {
            setLoading(true);
            fetch(dataSource).then(res => {
                res.json().then(data => {
                    setLoading(false);
                    setData(data);
                    setColumns(populateColumns(data));
                })
            })
        }
    }, [dataSource]);

    // Sort
    useEffect(() => {
        setData(data.sort((a, b) => {
            let result = 0;
            sortBy.forEach(sort => result = sort.column.sort(a, b, sort.asc));
            return result;
        }));
    }, [sortBy]);

    // Populate columns
    function populateColumns<T extends TableDataRow> (data: T[]) {
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
                    dataIndex: name,
                    sort: (a, b, asc) => a[name] < b[name] ? (asc ? 1 : -1) : a[name] > b[name] ? (asc ? -1 : 1) : 0,
                    allowSort: true
                }
            });
        }
        return columns;
    }

    function setSort(column: TableColumn<any, any>) {
        let sorted = sortBy.find(a => a.column.name == column.name) ?? { column, asc: false };
        sorted.asc = !sorted.asc;
        setSortBy([sorted]);
    }

    attrs.className = attrs.className || classNames({
        'data-grid': true,
        'sortable': allowSort,
        'allow-add': allowAdd
    });

    return <table { ...attrs }>
        <Head allowSort={allowSort} columns={columns} sortBy={sortBy} setSort={setSort}/>
        <tbody>
            { data.map((row, index) => {
                return <tr key={index}>
                    { columns.map(column => <td key={column.name}>{ column.render ? column.render(row[column.dataIndex], row) : String(row[column.dataIndex]) }</td>)}
                </tr>;
            })}
            { allowAdd ? <tr>
                { columns.map(column => <td key={column.name}>{ renderEditor(column, newRow, setNewRow) }</td>)}
            </tr> : null }
        </tbody>
    </table>;
}

let Head = (({columns, sortBy, allowSort, setSort}: any) => {
    return <thead>
        <tr>
            { columns.map(column => <th onClick={e => setSort(column)} key={column.name} className={classNames({
                'sortable': allowSort && column.allowSort,
                'sorted': sortBy.findIndex(a => a.column.name == column.name) >= 0,
                'desc': sortBy.find(a => a.column.name == column.name)?.asc === false
            })}>{ column.title }</th>) }
        </tr>
    </thead>;
})

export interface TableDataRow { [name: string]: any }

export interface TableComponentProps<T extends TableDataRow> extends React.HTMLAttributes<HTMLTableElement> {
    dataSource?: string | Promise<T[]> | T[]
    loading?: boolean
    columns?: TableColumn<T, keyof T>[]
    mergeColumns?: boolean
    allowAdd?: boolean
    allowSort?: boolean
    renderEditor?: (column: TableColumn<T, keyof T>, state: any, setState: (data: any) => void) => JSX.Element
}

export interface TableColumn<T extends TableDataRow, K extends keyof T> {
    name: string
    title: string
    dataIndex?: K
    allowSort?: boolean
    sort?: (prev: T, curr: T, asc: boolean) => number
    render?: (value: T[K], data: T) => JSX.Element
}