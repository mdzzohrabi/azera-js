import { Component } from "preact";
import { State } from '..';
import { equal, ok } from 'assert';

describe('State()', () => {
    it('should works', () => {
        class Test1 extends Component<any, any> {
            @State() title: string;

            // @State() set limit(value) {
            //     return 12;
            // }

            render() { return null; }
        }

        let test1 = new Test1({}, {});
        // test1.limit;
        test1.title = "Hello World";
        equal(test1.state['title'], 'Hello World');
    });
});

// describe('onUpdate()', () => {
//     it('should works', () => {
//         let updated = false;
//         let willUpdate = false;

//         class Test1 extends Component<any, any> {
//             @onUpdate('title') onUpdateChange() {
//                 updated = true;
//             }

//             componentWillUpdate(State) {
//                 willUpdate = true;
//                 console.log(State,' UPdate');
//             }

//             render() { return null; }
//         }

//         let test1 = new Test1({}, {});
//         test1.setState({ title: 'Hello World' });
//         equal(test1.state['title'], 'Hello World');
//         ok(willUpdate, `componentWillUpdate() not triggered`);
//         ok(updated);
//     });
// });