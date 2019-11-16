/// <reference path="../../../portal/public/lib/Portal.ts" />

/**
 * Api Module
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
defineModule('api', ({ hook, log, HOOKS, React, React: { Component, createRef }, Router: { Link }, ReactDOM: {render}, setTitle, Table }) => {

    let monaco = require('monaco-editor');
    // let Editor = require('@monaco-editor/react').default;

    log(`Api Module loaded`);

    // Menu
    hook(HOOKS.PANEL_MENU, menu => {
        menu.children.push({
            title: 'Api Management',
            link: '/api'
        });
    });

    hook(HOOKS.ROUTES_DESKTOP, routes => {
        routes['/api/:name'] = (router) => {
            // return <Editor language="typescript"/>
            return <ScriptEditor name={router.match.params.name}/>;
        }

        routes['/api'] = () => {
            return <Table dataSource="/portal/api/methods" columns={[
                { name: 'edit', title: 'Edit', dataIndex: 'name', render: (name) => <Link to={'/api/' + name}>Edit</Link> }
            ]} mergeColumns={true}></Table>
        };
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

    let ts = monaco.languages.typescript;

    // Core type-definitions
    fetch('/portal/api/type-definitions').then(res => res.text()).then(res => {
        ts.typescriptDefaults.addExtraLib(res, '/core.d.ts');
    });

    class ScriptEditor extends Component {

        constructor(props) {
            super(props);
            this.editorDiv = createRef();
            this.state = { method: undefined, error: undefined };
        }

        componentDidMount() {
            fetch('/portal/api/methods/' + this.props.name).then(res => res.json()).then(method => {
                if (method.error) {
                    this.setState({ error: method.error })
                } else {
                    this.setState({ method }, () => {
                        monaco.editor.create(this.editorDiv.current, {
                            value: method.script,
                            language: 'typescript',
                            automaticLayout: true,
                            theme: 'vs-dark',
                            codeLens: true,
                            cursorBlinking: 'blink',
                            suggest: {
                                showIcons: true
                            },
                            lineNumbers: 'relative',
                            minimap: {
                                enabled: false
                            }
                        });
                    });
                }
            })
        }

        render() {
            if (this.state.error) return <div><b>Error:</b> { this.state.error }</div>
            if (!this.state.method) return <div>Loading ...</div>
            return <div style={{ height: '100%', direction: 'ltr', position: 'relative' }} ref={this.editorDiv}></div>
        }
    }

    class FunctionsTable extends Component {
        render() {
            return <Table
                dataSource="/portal/api/functions"
            />
        }
    }

});
