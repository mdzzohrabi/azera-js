import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { render } from 'react-dom';
import './style.scss';

addEventListener('DOMContentLoaded', function boot() {
    render(<ProfileViewer/>, document.querySelector('#viewer'));
});

function ProfileViewer() {

    let [profiles, setProfiles] = useState([]);
    let [max, setMax] = useState(0);
    let [startTime, setStartTime] = useState(0);
    let [endTime, setEndTime] = useState(0);
    let [timeScale, setTimeScale] = useState('ms');
    let [onlyTimeline, setOnlyTimeline] = useState(false);
    let [scale, setScale] = useState(1);

    function openFile(files: FileList) {
        if (files.length > 0) {
            let reader = new FileReader();
            reader.onload = ev => {
                try {
                    let result: any[] = Object.values( JSON.parse( ev.target.result as string ) );
                    result.forEach(profile => {
                        profile.duration = profile.times.map(t => t.end ? t.end - t.start : 0).reduce((p, c) => p + c);
                    });
                    setMax(result.find((value, index, arr) => !arr.find(a => a.duration! > value.duration!))?.duration);
                    setStartTime(result.find(profile => !result.find(a => a.firstStart < profile.firstStart))?.firstStart);
                    setEndTime(result.find(profile => !result.find(a => a.lastEnd! > profile.lastEnd!))?.lastEnd);
                    setProfiles(result);
                } catch (e) {
                    console.error(e);
                }
            }
            reader.readAsText(files.item(0));
        }
    }  

    return <div style={{ overflowX: 'auto' }}>
        <input type="file" onChange={event => openFile(event.target.files)}/>
        <table>
        <thead>
            <tr>
                { !onlyTimeline ? <th style={{ width: '15%' }}>Name</th> : null }
                { !onlyTimeline ? <th style={{ width: '5%' }}>Times</th> : null }
                { !onlyTimeline ? <th style={{ width: '10%' }} className="pointer" onClick={e => setTimeScale(timeScale == 'ms' ? 'ns' : 'ms')}>Duration</th> : null }
                <th>
                    Timeline&nbsp;
                    <select value={scale} onChange={e => setScale(Number(e.target.value))}>
                        <option value={1}>1x</option>
                        <option value={2}>2x</option>
                        <option value={4}>4x</option>
                        <option value={8}>8x</option>
                        <option value={10}>10x</option>
                        <option value={20}>20x</option>
                        <option value={50}>50x</option>
                    </select> 
                    &nbsp;<button onClick={e => setOnlyTimeline(!onlyTimeline)}>Toggle timeline</button>
                </th>
            </tr>
        </thead>
        <tbody>
            {profiles.map(profile => {
                return <tr key={profile.name}>
                    { !onlyTimeline ? <td>{profile.name}</td> : null }
                    { !onlyTimeline ? <td>{profile.times.length}</td> : null }
                    { !onlyTimeline ? <td>{timeScale == 'ms' ? profile.duration / 1000 + ' ms' : profile.duration + ' µs'}</td> : null }
                    <td>
                        {onlyTimeline ? <p>{profile.name}</p> : null }
                        <Timeline scale={scale} profile={profile} totalDuration={endTime - startTime} startTime={startTime}/>
                    </td>
                </tr>
            })}
        </tbody>
    </table>
    </div>
}

function Timeline({ profile, totalDuration, startTime, scale }) {
    return <div className="timeline" style={{ width: scale * 100 + '%' }}>
        { profile.times.map((time, index) => {
            return <div key={index} className="time" style={{
                left: ((time.start - startTime) * 100 / totalDuration) + '%',
                width: ((time.end - time.start) * 100 / totalDuration) + '%'
            }}>
            { time.detail ? <Tooltip>{
                typeof time.detail == 'string' ? time.detail : Object.keys(time.detail).map(name => {
                    return <p className="detail"><b>{name} : </b><span>{JSON.stringify(time.detail[name])}</span></p>
                })
            }</Tooltip> : null }
            </div>
        }) }
    </div>
}

function Tooltip({ children }) {
    return <div className="tooltip">{ children }</div>
}