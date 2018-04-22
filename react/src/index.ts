interface IComponent {
    componentWillUpdate?;
}

function getOrInit <T>(obj, key, init: T): T {
    return obj[key] || ( obj[key] = init );
}

function assertComponent(target) {
    if ( !('setState' in target) ) {
        throw Error(`State decorator only works on React/Preact components`);
    }
}

export function State(): PropertyDecorator {
    return (target, prop) => {
        assertComponent(target);

        return {
            enumerable: false,
            set: function (value) {
                this.setState({ [prop]: value });
            },
            get: function () {
                return this['state'][prop];
            }
        };
    };
}

// let StateCaller = function (nextState) {
//     console.log('asd');
//     let listeners = this[ON_STATE] || {};
//     Object.keys(listeners).forEach( key => {
//         if ( this.state[key] !== nextState[key] ) {
//             ( listeners[ key ] || []).forEach( func => func( nextState[key] ) );
//         }
//     });
// };

// let ON_STATE = Symbol('OnState');

// export function onUpdate(name: string): MethodDecorator {
//     return (target: IComponent, method, desc) => {
//         assertComponent(target);
//         target.componentWillUpdate = StateCaller;
//         getOrInit( getOrInit(target, ON_STATE, {}) , name , [] ).push( target[method].bind( target ) );
//     };
// }