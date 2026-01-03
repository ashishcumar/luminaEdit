import type { Plugin } from 'vite';

export function injectCrossOriginHeaders(): Plugin {
    return {
        name: 'inject-cross-origin-headers',
        transformIndexHtml(html) {
            return html.replace(
                '<head>',
                `<head>
    <meta http-equiv="Cross-Origin-Embedder-Policy" content="require-corp">
    <meta http-equiv="Cross-Origin-Opener-Policy" content="same-origin">`
            );
        },
    };
}
