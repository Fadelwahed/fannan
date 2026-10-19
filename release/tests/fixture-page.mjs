// The bundled local-fixture page (test-only). OPUS-R2-10 follow-up: it loads the built token CSS, resets the
// browser default margins and paddings, and spaces everything from the built --spacing-* scale, so it passes the
// handoff spacing check without weakening it.
export const fixturePage = cssHref => '<!doctype html><html lang="en" dir="ltr"><head><title>Fixture</title>'
  + `<link rel="stylesheet" href="${cssHref}">`
  + '<style>:root{--accent:rgb(11,61,145)}*{margin:0;padding:0;box-sizing:border-box}'
  + 'body{font:16px Arial;color:#111;background:white}'
  + 'main{padding:var(--spacing-lg);display:grid;justify-items:start;row-gap:var(--spacing-md)}'
  + 'button{outline:none;border:0;padding:0 var(--spacing-md);min-width:48px;min-height:48px;background:rgb(11,61,145);color:white;font:inherit}'
  + 'button:focus{outline:2px solid black;outline-offset:2px}</style></head>'
  + '<body><main><h1 data-copy-slot="headline">Specific service</h1><p data-copy-slot="description">A service for residents.</p><button data-copy-slot="button">Start</button></main></body></html>';
