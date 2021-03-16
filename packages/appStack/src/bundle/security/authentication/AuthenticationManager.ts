import * as jsonWebToken from 'jsonwebtoken';
import { Request, Response } from '../../http';
import { AuthenticationProvider } from './AuthenticationProvider';

/**
 * Authentication manager
 * 
 * @author Masoud Zohrabi <mdzzohrabi@gmail.com>
 */
export class AuthenticationManager {

    constructor(
        protected authenticationProviders: AuthenticationProvider<any>[] = [],

        private secretKey: string = 'no_secret',
        
        private defaultProvider?: string
    ) {
        // Set first provider as default provider
        if (!this.defaultProvider && authenticationProviders.length > 0) {
            this.defaultProvider = authenticationProviders[0].authenticationName;
        }
    }

    /**
     * Get authentication provider by name
     * @param name Authentication provider
     */
    getProviderByName(name: string) {
        for (let provider of this.authenticationProviders) {
            if (provider.authenticationName == name) return provider;
        }
        throw Error(`Authentication provider ${name} not found`);
    }

    /**
     * Authenticate client by Authorization header
     * @param request Http Request
     * @param response Http Response
     * @param provider Authentication provider name
     */
    async verifyRequest(request: Request, response: Response, provider?: string, options?: any): Promise<any> {
        try {
            provider = provider ?? this.defaultProvider;
            if (!provider || !request.headers.authorization) return false;
            let jwt = request.headers.authorization.substr('Bearer '.length);
            let context = this.verifyJwt(jwt);
            if (!this.getProviderByName(provider)?.verify(context, options)) return false;
            return response.locals.securityContext = context;
        } catch (err) {
            return false;
        }
    }

    /**
     * Try to authenticate http request and get context and jwt
     * @param request Http Request
     * @param response Http Reponse
     * @param provider Authentication provider
     */
    async attemptRequest(request: Request, response: Response, provider?: string, options?: any): Promise<{ jwt: string, context: any } | null> {
        let result = await this.attempt(request, provider, options);
        if (result) {
            let { jwt, context } = result;
            response.locals.securityContext = context;
            return { jwt, context };
        }
        return null;
    }

    /**
     * Try to authenticate request and get context and jwt
     * @param request Request object
     * @param provider Authentication provider name
     * @returns 
     */
    async attempt<R, C>(request: R, provider?: string, options?: any): Promise<{ jwt: string, context: C } | null> {
        provider = provider ?? this.defaultProvider;
        if (!provider) throw Error(`No security provider`);
        let context = await this.getProviderByName(provider)?.authenticate(request, options);
        if (!context) return null;
        return { jwt: this.signJwt(context), context };
    }

    /**
     * Verify an JWT
     * @param jwt Token
     */
    verifyJwt(jwt: string) {
        return jsonWebToken.verify(jwt, this.secretKey);
    }
    
    /**
     * Sign a payload data with JWT
     * @param payload Payload data
     */
    signJwt(payload: any) {
        return jsonWebToken.sign(payload, this.secretKey);
    }
}