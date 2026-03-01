import type { Plugin, ViteDevServer } from 'vite';
// @ts-ignore
import expressApp from '../api/deploy.js';
// @ts-ignore
import sttApp from '../api/stt.js';
// @ts-ignore
import freeAiApp from '../api/ai-free.js';
// @ts-ignore
import validateAiApp from '../api/ai-validate.js';

export function expressDevServerPlugin(): Plugin {
    return {
        name: 'express-dev-server',
        configureServer(server: ViteDevServer) {
            server.middlewares.use(expressApp);
            server.middlewares.use(sttApp);
            server.middlewares.use(freeAiApp);
            server.middlewares.use(validateAiApp);
        }
    }
}
