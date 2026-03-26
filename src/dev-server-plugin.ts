import type { Plugin, ViteDevServer } from 'vite';
// @ts-ignore
import expressApp from '../api/deploy.js';
// @ts-ignore
import sttApp from '../api/stt.js';
// @ts-ignore
import validateAiApp from '../api/ai-validate.js';
// @ts-ignore
import proxyApp from '../api/proxy.js';

export function expressDevServerPlugin(): Plugin {
    return {
        name: 'express-dev-server',
        configureServer(server: ViteDevServer) {
            server.middlewares.use(expressApp);
            server.middlewares.use(sttApp);
            server.middlewares.use(validateAiApp);
            server.middlewares.use(proxyApp);
        }
    }
}
