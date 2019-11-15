import './MainComponent.scss';
import { Portal } from '../lib/Portal';

const { React, React: { Component }, hook, HOOKS: { ROUTES }, Router: {BrowserRouter, Route, Switch} } = Portal;

/**
 * Portal main component
 * 
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export class MainComponent extends Component {

    routes = hook('routes.main', {});

    render() {

        return <BrowserRouter basename="/portal">
            <Switch>
                { Object.keys(this.routes).map((route, index) => {
                    return <Route key={index} path={route}>{ this.routes[route] }</Route>
                }) }
            </Switch>
        </BrowserRouter>
    }
}