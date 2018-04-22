import { Component, h } from "preact";
import __ from "./translate";
// import "./tabs.scss";

export class Tab extends Component<{ label: string, active?: boolean }, any> {

    render({ children, active, label }) {
        return <div className={"tab" + ( active ? ' tab-active': '' )}>
            { children }
        </div>;
    }
}

/**
 * Tabs
 * @component
 */
export class Tabs extends Component<{ children?: JSX.Element[] }, { selectedTab: JSX.Element }> {

    constructor() {
        super();
        this.state = {
            selectedTab: null
        };
    }

    selectTab(tab: JSX.Element) {
        this.setState({ selectedTab: tab });
    }

    renderTabs() {
        return <ul className="tab-selector">
            { this.props.children.map( tab => <li className={ tab == this.state.selectedTab ? 'tab-active' : '' } onClick={this.selectTab.bind(this, tab)}>{ __(tab.attributes.label) }</li>) }
        </ul>;
    }

    render() {

        if ( !this.state.selectedTab && this.props.children.length > 0 )
            this.selectTab( this.props.children[0] );

        return <div className={"tabs"}>
            { this.renderTabs() }
            { this.props.children.map(tab => {
                tab.attributes.active = (tab == this.state.selectedTab);
                return tab;
            }) }
        </div>;
    }
}