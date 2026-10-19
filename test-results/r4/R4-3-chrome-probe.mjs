// Evidence-only probe (not a release test): node R4-3-chrome-probe.mjs <deps-prefix> <focus-screen.mjs> <label>. Uses the box Chrome, not a reviewed pin.
import { createRequire } from 'node:module';
const [deps, mod, label] = process.argv.slice(2); const require = createRequire(deps + '/node_modules/');
const { chromium } = require('playwright-core');
const m = await import(mod); const settle = m.focusSettle;
const pages = {
  staticShadowNoOutline: [`<style>button{outline:none;box-shadow:0 0 0 3px #888}</style><button>A</button>`, false],
  backgroundOnlyStrong: [`<style>button{outline:none}button:focus{background:#000;color:#fff}</style><button>A</button>`, true],
  noIndicator: [`<style>button{outline:none}</style><button>A</button>`, false],
  defaultUA: [`<button>A</button>`, true],
  animatedAncestorNoIndicator: [`<style>@keyframes p{from{background:#fff}to{background:#eee}} body{animation:p 1s infinite alternate} button{outline:none}</style><button>A</button>`, false],
  transition2s: [`<style>button{outline:none;transition:background 2s}button:focus{background:#000}</style><button>A</button>`, true],
  transition150: [`<style>button{outline:none;transition:box-shadow .15s ease}button:focus-visible{box-shadow:0 0 0 3px #00f}</style><button>A</button>`, true],
  outlineTransition: [`<style>button:focus-visible{outline:3px solid #00f;transition:outline-color .2s}</style><button>A</button>`, true],
  colorTiny: [`<style>button{outline:none;color:#000}button:focus{color:#010101}</style><button>A</button>`, false],
  wrapperFocusWithin: [`<style>input{outline:none;border:0}label:focus-within{box-shadow:0 0 0 2px #00f}</style><label><input></label>`, true],
  pseudoRing: [`<style>a{outline:none;position:relative}a:focus-visible::after{content:"";position:absolute;inset:-3px;border:2px solid #00f}</style><a href="#x">L</a>`, true],
  lightGrayBg: [`<style>button{outline:none;background:#fff;border:0}button:focus{background:#eee}</style><button>A</button>`, 'weak (<3:1)'],
};
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--headless=new'] });
console.log(`# ${label}`);
for (const [n, [html, want]] of Object.entries(pages)) {
  const p = await b.newPage(); await p.setContent(html);
  await p.evaluate(m.focusStyleProbe, { capture: true }); await p.keyboard.press('Tab');
  if (settle) await p.evaluate(settle);
  const v = await p.evaluate(m.focusStyleProbe);
  console.log(n.padEnd(30), 'focusVisible=', String(v).padEnd(6), 'expected=', want); await p.close();
}
await b.close();
