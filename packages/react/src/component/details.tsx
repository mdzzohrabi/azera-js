import { IMap } from "@azera/util/enumerable";
import { map } from "@azera/util/map";
import { h } from "preact";
import __ from "./translate";
// import "./details.scss";

export let Details = ({ details, className }: { details: IMap<any>, className?: string }) => {
    return <div className={"container-fluid details " + (className || '')}>
        { map(details, (value, name) => {
            return <p class="row">
                <b className="col-4 nowrap">{ __(name) }</b>
                <span className="col nowrap">{ value }</span>
            </p>;
        }) }
    </div>;
};