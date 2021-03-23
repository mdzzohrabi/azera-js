import { expect } from "chai";
import { AuthenticationManager, AuthenticationProvider, Kernel, Request, SecurityBundle } from "../../src";

describe('Security', () => {

    it('Bundle', async () => {

        class MuCustomAuthProvider extends AuthenticationProvider<string> {
            authenticationName: string = 'custom';
            async verify(context: string): Promise<boolean> {
                return context == 'masoud';
            }

            async authenticate(request: Request): Promise<string | null> {
                return request.params.user;
            }
        }

        let kernel = new Kernel('test', [ new SecurityBundle ]);
        
        await kernel.bootAndRun({
            security: {
                secret: 'custom_secret'
            },
            services: [MuCustomAuthProvider]
        });

        let security = kernel.container.invoke(AuthenticationManager);

        expect(security['authenticationProviders'].length).eq(1);
        expect(security['secretKey']).eq('custom_secret');
        expect(await security.attemptRequest({ params: { user: 'Masoud' } } as any, { locals: {} } as any)).not.null;
        expect(await security.attemptRequest({ params: { user: 'Masoud' } } as any, { locals: {} } as any)).property('context', 'Masoud');
    });

    it('AuthenticationManager', async () => {

        class User {
            constructor(public isAdmin: boolean) {}
        }

        let authManager = new AuthenticationManager([
            {
                authenticationName: 'test',
                async authenticate(request: any) {
                    if (request instanceof User && request.isAdmin) return { ...request };
                    return null;
                },
                async verify() { return true; }
            }
        ]);

        expect(await authManager.attempt({ name: 12 })).to.null;
        expect(await authManager.attempt({ isAdmin: true })).to.null;
        expect(await authManager.attempt(new User(true))).to.nested.property('context.isAdmin', true);

        let { jwt } = (await authManager.attempt(new User(true)))!;
        expect(authManager.verifyJwt(jwt)).nested.property('isAdmin', true);

    });

})