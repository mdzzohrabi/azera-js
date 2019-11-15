import * as React from 'react';
import { Component } from 'react';
import { humanize } from './Strings';

export interface TableDataRow { [name: string]: any }

export interface TableComponentProps<T extends TableDataRow> {
    dataSource?: string | Promise<T[]> | T[]
    loading?: boolean
    columns?: TableColumn<T, keyof T>[]
}

export interface TableComponentState<T extends TableDataRow> {
    dataSource: T[]
    loading: boolean
    columns: TableColumn<T, keyof T>[]
}

export interface TableColumn<T extends TableDataRow, K extends keyof T> {
    name: string
    title: string
    dataIndex?: K
    render?: (value: T[K], data: T) => JSX.Element
}

export class TableConmponent<T> extends Component<TableComponentProps<T>, TableComponentState<T>> {

    constructor(props) {
        super(props);
        this.state = {
            dataSource: [],
            loading: false,
            columns: []
        }
    }

    static getDerivedStateFromProps(props: TableComponentProps<any>, state: TableComponentState<any>) {
        if (props.loading && props.loading != state.loading) {
            return {
                loading: props.loading
            }
        }
        return null;
    }

    static estimateColumns<T extends TableDataRow>(data: T[]) {
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

    componentDidMount() {
        let {
            props: {
                dataSource
            }
        } = this;

        if (typeof dataSource == 'string') {
            this.setState({ loading: true });
            fetch(dataSource).then(res => {
                res.json().then(data => {
                    this.setState({
                        dataSource: data,
                        columns: TableConmponent.estimateColumns(data),
                        loading: false
                    })
                })
            })
        }
    }

    renderTableView() {
        let { columns, dataSource } = this.state;

        return <table>
            <thead>
                <tr>
                    { columns.map(column => <th key={column.name}>{ column.title }</th>) }
                </tr>
            </thead>
            <tbody>
                { dataSource.map((row, index) => {
                    return <tr key={index}>
                        { columns.map(column => <td key={column.name}>{ String(row[column.dataIndex]) }</td>)}
                    </tr>;
                })}
            </tbody>
        </table>
    }

    render() {
        return this.renderTableView();
    }

}