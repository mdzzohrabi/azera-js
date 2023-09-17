import { Container, Inject } from '@azera/container';
import { describe, it } from 'mocha';
import { expect } from 'chai';

describe('ViTest Test', () => {
    it('should be ok', () => {
        expect(true).to.eq(true);
    });
});

describe('Container', () => {
    it('should be ok with decorators', async () => {
        class DbContext {
            public connect() {
                return true;
            }
        }

        class BookService {
            public constructor(
                @Inject() public dbContext: DbContext
            ) {}
        }

        const container = new Container();
        const service = await container.invokeAsync(BookService);

        expect(service.dbContext.connect()).to.eq(true);
    });
})