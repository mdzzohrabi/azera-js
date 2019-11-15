import { MdDone } from 'react-icons/md';
import './DesktopComponent.scss';
import { Portal } from "../lib/Portal";
const { React, Component, Router: { Link, NavLink, Route, Switch }, i18n: { trans }, hook } = Portal;

/**
 * Desktop
 * 
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export class DesktopComponent extends Component {

    // Hook desktop routes
    routes = hook('routes.desktop', {});

    // Hook desktop panel menu
    menu = hook('panel.menu', {
        title: 'Panel menu',
        children: []
    });  

    render() {
        return <div className="root">
            <div id="toolbar" className="toolbar">

            </div>
            <div className="container">
                <div className="panel">
                    { this.menu.children.map((menu, index) => {
                        return <NavLink activeClassName="active" key={index} to={menu.link} className="menu-item"><MdDone/>{ trans(menu.title) }</NavLink>
                    }) }
                </div>
                <div className="content">
                    <Switch>
                        {Object.keys(this.routes).map((route, index) => <Route key={index} path={route}>{this.routes[route]}</Route>)}
                    </Switch>
                </div>
            </div>
        </div>;
    }
}