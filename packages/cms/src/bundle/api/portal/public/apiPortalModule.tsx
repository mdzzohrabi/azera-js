/// <reference path="../../../portal/public/lib/Portal.ts" />

/**
 * Api Module
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
defineModule('api', ({ hook, log, HOOKS, React, React: { Component, createRef, useRef, useState, useEffect, useMemo }, Router: { Link }, ReactDOM: {render}, setTitle, Table }) => {
    // let Editor = require('@monaco-editor/react').default;
    log(`Api Module loaded`);

    // Menu
    hook('panel.menu', menu => {
        menu.children.push({
            title: 'Api Management',
            link: '/api'
        });
    });

    hook('routes.desktop', routes => {
        routes['/api/:name'] = (router) => {
            // return <Editor language="typescript"/>
            return <ScriptEditor name={router.match.params.name}/>;
        }

        routes['/api'] = () => <ApiMethodList/>
    });

    // @ts-ignore
    self.MonacoEnvironment = {
        getWorkerUrl: function(moduleId, label) {
            log(moduleId, label)
            if (label === 'json') {
                return './json.worker.js';
            }
            if (label === 'css') {
                return './css.worker.js';
            }
            if (label === 'html') {
                return './html.worker.js';
            }
            if (label === 'typescript' || label === 'javascript') {
                return './ts.worker.js';
            }
            return './editor.worker.js';
        },
    };

    function ApiMethodList() {
        let [dataSource, setDataSource] = useState('/portal/api/methods');

        let addMethod = (method) => {
            fetch('/portal/api/methods', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(method)
            }).then(() => setDataSource('/portal/api/methods?' + Date.now()));
        }

        return <Table 
        allowAdd={true} 
        dataSource={dataSource}
        renderEditor={(column, data, setData) => {
            if (column.name == 'lastRun' || column.name == 'lastRunDelay') return <span>-</span>;
            if (column.name == 'edit') return <button onClick={() => {
                addMethod(data);
                setData({});
            }}>Add</button>
            if (column.name == 'published') return <input type="checkbox" checked={data[column.dataIndex] || false} onChange={e => setData({ ...data, published: e.target.checked })}/>
            return <input type="text" value={data[column.dataIndex] || ''} onChange={e => setData({ ...data, [column.dataIndex]: e.target.value })} />;
        }}
        columns={[
            { name: 'lastRunDelay', dataIndex: 'lastRunDelay', title: 'Last run delay', render: time => <p>{time} ms</p> },
            { name: 'lastRun', dataIndex: 'lastRun', title: 'Last run', render: time => <p>{new Date(time).toLocaleString()}</p> },
            { name: 'edit', title: 'Edit', dataIndex: 'name', render: (name) => <Link to={'/api/' + name}>Edit</Link> }
        ]} 
        mergeColumns={true}></Table>
    }

    function ScriptEditor({ name }: { name: string }) {

        let editorDiv = useRef();
        let [method, setMethod] = useState();
        let [error, setError] = useState();
        let [model, setModel] = useState<import('monaco-editor').editor.ITextModel>();
        let [editor, setEditor] = useState<import('monaco-editor').editor.IStandaloneCodeEditor>();

        useEffect(() => {
            if (name) {
                import('monaco-editor').then((monaco) => {
                    let ts = monaco.languages.typescript;
                    // Core type-definitions
                    fetch('/portal/api/type-definitions').then(res => res.text()).then(res => {
                        ts.typescriptDefaults.addExtraLib(res, 'file://core.d.ts');
                        ts.javascriptDefaults.addExtraLib(res, 'file://core.d.ts');
                    }).catch(console.error);
                
                    fetch('/portal/api/methods/' + name).then(res => res.json()).then(method => {
                        if (method.error) {
                            setError(method.error);
                        } else {
                            setMethod(method);
                        }
                    }).catch(console.error);
                });
            }
        }, [ name ]);

        useEffect(() => {
            if (editor) {
                editor.addAction({ label: 'My Action', id: 'my-action', run() {
                    console.log('My Action')
                } })
            }
        }, [editor]);

        useEffect(() => {
            if (method && (!editor || method.name != name)) {
                import('monaco-editor').then((monaco) => {
                    // monaco.editor.setTheme()
                    let model = monaco.editor.createModel(method.script, 'javascript');
                    if (!editor) {
                        setEditor(monaco.editor.create(editorDiv.current, {
                            colorDecorators: true,
                            model, 
                            // value: method.script,
                            // language: 'typescript',
                            automaticLayout: true,
                            theme: 'vs-dark',
                            codeLens: true,
                            cursorBlinking: 'blink',
                            suggest: {
                                showIcons: true
                            },
                            lineNumbers: 'on',
                            minimap: {
                                enabled: false
                            }
                        }));
                        
                    } else {
                        editor.setModel(model);
                    }
                    setModel(model);
                }).catch(console.error);
            }
        }, [ method ]);

        let save = () => {
            if (!model) {
                alert(`Error: No model loaded`);
                return;
            }

            fetch(`/portal/api/methods/${ method.name }`, {
                method: 'PUT',
                body: JSON.stringify({ script: model.getValue(), endPoint: method.endPoint }),
                headers: { 'content-type': 'application/json' }
            }).then(res => {
                if (res.ok) {
                    res.json().then(r => alert(r.message));
                } else {
                    alert(`Issue during save`);
                }
            });
        }

        if (error) return <div><b>Error:</b> { error }</div>;
        if (!method) return <div>Loading ...</div>

        return <div className="api-method-editor" style={{ height: '90%' }}>
            <div className="actions">
                <button onClick={save}>Save changes</button>
            </div>
            <div className="properties">
                <label htmlFor="endPoint">endPoint</label>
                <input type="text" id="endPoint" defaultValue={method.endPoint} onChange={e => setMethod({ ...method, endPoint: e.target.value })}/>
            </div>
            { !editor ? <p>Editor loading in progress ...</p> : null }
            <div style={{ height: '100%', direction: 'ltr', position: 'relative' }} ref={editorDiv}>
            </div>
        </div> ;

    }

    // class ScriptEditor extends Component {
    //     constructor(props) {
    //         super(props);
    //         this.editorDiv = createRef();
    //         this.state = { method: undefined, error: undefined };
    //         /** @type {import('monaco-editor').editor.ITextModel} */
    //         this.model = null;
    //     }

    //     componentDidMount() {
            
    //         import('monaco-editor').then((monaco) => {
    //             let ts = monaco.languages.typescript;
    //             // Core type-definitions
    //             fetch('/portal/api/type-definitions').then(res => res.text()).then(res => {
    //                 ts.typescriptDefaults.addExtraLib(res, '/core.d.ts');
    //             });
            
    //             fetch('/portal/api/methods/' + this.props.name).then(res => res.json()).then(method => {
    //                 if (method.error) {
    //                     this.setState({ error: method.error })
    //                 } else {
    //                     this.setState({ method }, () => {
    //                         this.model = monaco.editor.createModel(method.script, 'typescript');
    //                         monaco.editor.create(this.editorDiv.current, {
    //                             model: this.model, 
    //                             // value: method.script,
    //                             // language: 'typescript',
    //                             automaticLayout: true,
    //                             theme: 'vs-dark',
    //                             codeLens: true,
    //                             cursorBlinking: 'blink',
    //                             suggest: {
    //                                 showIcons: true
    //                             },
    //                             lineNumbers: 'on',
    //                             minimap: {
    //                                 enabled: false
    //                             }
    //                         });
    //                     });
    //                 }
    //             });
    //         });
    //     }

    //     save() {
    //         if (!this.model) {
    //             alert(`Error: No model loaded`);
    //             return;
    //         }

    //         fetch(`/portal/api/methods/${ this.state.method.name }`, {
    //             method: 'PUT',
    //             body: JSON.stringify({ script: this.model.getValue() }),
    //             headers: { 'content-type': 'application/json' }
    //         }).then(res => {
    //             if (res.ok) {
    //                 res.json().then(r => alert(r.message));
    //             } else {
    //                 alert(`Issue during save`);
    //             }
    //         });
    //     }

    //     render() {
    //         if (this.state.error) return <div><b>Error:</b> { this.state.error }</div>
    //         if (!this.state.method) return <div>Loading ...</div>
    //         return <div className="api-method-editor" style={{ height: '90%' }}>
    //             <div className="actions">
    //                 <button onClick={this.save.bind(this)}>Save changes</button>
    //             </div>
    //             <div className="properties">
    //                 <label htmlFor="endPoint">endPoint</label>
    //                 <input type="text" id="endPoint" defaultValue={}/>
    //             </div>
    //             <div style={{ height: '100%', direction: 'ltr', position: 'relative' }} ref={this.editorDiv}></div>
    //         </div> 
    //     }
    // }

    class FunctionsTable extends Component {
        render() {
            return <Table
                dataSource="/portal/api/functions"
            />
        }
    }

});
