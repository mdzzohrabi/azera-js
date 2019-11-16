import 'regenerator-runtime/runtime';
import { MainComponent } from './component/MainComonent';
import { Portal } from './lib/Portal';
import { DesktopComponent } from './component/DesktopComponent';

const { hook, log, loadPortal, React, ReactDOM: { render }, i18n: {trans} } = Portal;

window.addEventListener('DOMContentLoaded', () => {
    log(`Portal version: ${ Portal.VERSION }`);

    loadPortal().then(() => {
        // HTML direction
        document.querySelector('html').classList.add(trans('direction') || 'ltr');

        hook('panel.menu', menu => {
            menu.children.push({
                title: 'Models',
                link: '/models'
            })
        });
           
        hook('routes.main', routes => {
            routes['/'] = () => <DesktopComponent/>;
        });

        hook('routes.desktop', routes => {
            routes['/models'] = () => <div>
                Hello Models
                <Portal.Table dataSource="/api/models"></Portal.Table>
            </div>;
        });
    

        // Render app
        render(<MainComponent/>, document.querySelector('#app'));
    });
})