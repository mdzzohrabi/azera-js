import { assert } from 'chai';
import { Workflow, WorkflowManager } from "../src/workflow";

describe('Workflow', () => {

    it('Manager should works ok', () => {
        
        class Post { status = "progress" }
        class Book { status = "progress" }

        let manager = new WorkflowManager();

        manager.addWorkflow(new Workflow('accept', ['progress', 'rejected', 'accepted'], 'progress', [ Post ], {
            accept: { from: 'progress', to: 'accepted' },
            reject: { from: 'progress', to: 'rejected' }
        }, 'status'));

        let post = new Post();
        let book = new Book();

        assert.isTrue( manager.can(post, 'accept', 'accept') );
        assert.isTrue( manager.can(post, 'accept', 'reject') );
        assert.throws(() => manager.can(post, 'accept', 'progress'), /not found/, 'Workflow manager can() must throw error for non-exists transitions' );
        assert.throws(() => manager.can(post, 'post', 'send'), /not found/, 'WorkFlow manager can() must throw error for non-exists workflows' );
        
        assert.throws(() => manager.apply(post, 'accept', 'progress'), /not found/, 'Workflow manager apply() must throw error for non-exists transitions');
        assert.throws(() => manager.apply(post, 'post', 'send'), /not found/, 'Workflow manager apply() must throw error for non-exists workflows');
        
        assert.sameMembers( manager.allowedTransitions(post, 'accept'), ['accept', 'reject'] );
        manager.apply(post, 'accept', 'accept');
        assert.equal(post.status, 'accepted', 'Post must transition from `progress` to `accepted` after apply transition');
        assert.throws(() => manager.apply(post, 'accept', 'reject'), /Cannot apply/, 'Workflow manager apply() must throw error for invalid transition state' );

        assert.throws(() => manager.can(book, 'accept', 'accept'), /not accept/, 'Workflow manager can() must throw error for unsupported targets' );
        assert.throws(() => manager.apply(book, 'accept', 'accept'), /not accept/, 'Workflow manager apply() must throw error for unsupported targets' );

        assert.sameMembers( manager.allowedTransitions(post, 'accept'), [] );
        assert.throws(() => manager.allowedTransitions(post, 'post'), /not found/ );
        assert.throws(() => manager.allowedTransitions(book, 'accept'), /doest not accept/);
    });


});