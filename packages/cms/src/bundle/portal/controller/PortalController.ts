import { Cache, Controller, HttpBundle, Inject, Middleware, WebClient } from '@azera/stack';
import { readFileSync } from 'fs';

@Controller('/portal')
@Middleware([
    HttpBundle.static(__dirname + '/../public'),
])
export class PortalController {
 
    indexHtml!: string

    @Cache('api-promote', 10 * 60 * 1000, 'temp') // Cache for 10 minutes
    @Inject()
    ['/homes'](client: WebClient) {
        return client.requestJson(`http://api.beshenas.com/graphql`, {
            method: 'POST',
            body: {
                operationName: 'Promote',
                query: `
                query Promote {
                    companies(sort: "startTime:DESC,createdAt:DESC", limit: 5, where:{ description_ne:"" }) {
                        id
                        name
                        type
                        logo { url }
                        description
                        }
                    
                    expos(sort: "startTime:DESC,createdAt:DESC", limit: 5) {
                        id
                        title
                        posterSquare { url }
                        poster { url }
                        country province city
                        startTime endTime
                    }
                    
                    stands(sort: "startTime:DESC,createdAt:DESC", limit: 5) {
                        id
                        company { id name logo {url} }
                        expo { id title }
                        medias { id file { url } likes visits }
                        images { id url }
                        standNo
                        description
                    }
                    }
                `,
                variables: {}
            }
        });
    }

    /**
     * Return Portal modules url
     */
    ['/api/modules'](@Inject('$$portal.module') modules: any[]) {
        return {
            modules: modules.filter(module => 'moduleAssetPath' in module).map(module => module.moduleAssetPath)
        }
    }


    @Cache('portal-home-index') ['/*']() {
        return readFileSync(__dirname + '/../public/index.html').toString('utf8');
    }

}