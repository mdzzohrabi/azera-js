import * as jsonWebToken from 'jsonwebtoken';
import { Request, Response } from '../http';
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
    async authenticate(request: Request, response: Response, provider?: string): Promise<any> {
        if (!request.headers.authorization) return false;

        let jwt = request.headers.authorization.substr('Bearer '.length);
    
        try {
            return response.locals.securityContext = this.verifyJwt(jwt);
        } catch (err) {
            return false;
        }
    }

    /**
     * Login client and create a security context with jwt
     * @param request Http Request
     * @param response Http Reponse
     * @param provider Authentication provider
     */
    async login(request: Request, response: Response, provider?: string): Promise<{ jwt: string, context: any } | null> {
        var provider = provider ?? this.defaultProvider;
        if (!provider) throw Error(`No security provider`);
        let context = await this.getProviderByName(provider)?.authenticate(request);
        if (!context) return null;
        response.locals.securityContext = context;

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