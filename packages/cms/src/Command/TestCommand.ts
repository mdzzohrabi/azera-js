import { Cli, Command, EntityManager, Inject, MessageManager, Container, WorkflowManager, Workflow, EventManager, TransitionEvent } from '@azera/stack';
import { Project } from '../entity/Project';
import { CrawlMessage } from '../message/CrawlMessage';
import { Post } from '../model/Post';
import { mongoose } from '@azera/stack';
import { MongoBook, Category, Company } from '../model/MongoBook';

export class TestCommand extends Command {
    
    description: string = 'development test codes';
    name: string = 'test <name>';

    @Inject() async run(container: Container, cli: Cli, name: string) {
        cli.print("Test codes: " + name);

        switch (name) {
            case 'workflow': {
                let manager = container.invoke(WorkflowManager);
                let post = new Post();

                console.log(post);
                manager.apply(post, 'blog_post', 'post');
                console.log(post);
                
                break;
            }
            case 'message': {
                process.stdin.resume();
                let messageManager = await container.invokeAsync(MessageManager);
                messageManager.dispatch(new CrawlMessage({ url: 'http://google.com' }));
                
                setTimeout(() => {
                    messageManager.dispatch(new CrawlMessage({ url: 'http://googles.com' }));
                }, 2000);
    
                for await (let message of messageManager.waitForMessage(CrawlMessage as any)) {
                    console.log(message.content);
    
                }
    
                console.log('Complete');
                break;
            }
            case 'orm': {
                let em = await container.invokeAsync(EntityManager);
                cli.print(await em.find(Project, { relations: ['Configs'] }));
                break;
            }
            case 'mongoose': {
                container.invoke(mongoose.Connection);

                // let c1 = new Category({ name: 'Test Category' });
                // let c2 = new Category({ name: 'Sub Category' });
                // let c = new Company({ name: 'Company 1' });

                // let product = new MongoBook();
                // product.name = 'Product 2';
                // product.categories = [ c1 ];
                // product.subCategory = c2;
                // product.company = c;
                // await c1.save();
                // await c2.save();
                // await c.save();
                // await product.save();

                console.log(await MongoBook.find().limit(3)
                    .select('name')
                    .populate('categories','name')
                    .populate('subCategory', 'name')
                    .populate('company', 'name'));
                console.log('OK');
                
                
                // console.log(await db.model('Book').create({ name: 'Jungle book 1' }));
                // console.log(await db.model('Book').find());
                break;
            }
        }
    }
}