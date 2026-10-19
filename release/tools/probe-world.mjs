// R11 (Asad panel C3): run probes and axe where page JavaScript cannot reach them. A CDP isolated world shares the
// page's DOM and CSS but has its own globals and prototypes, so a page script that patches getComputedStyle,
// querySelectorAll, Array methods or pins a fake `axe` changes nothing the probes see. One world is created per
// document (after each navigation) and reused, so probe state such as the focus baseline survives between calls.
// Chromium only (the reviewed browser). Page JavaScript can still change the DOM or CSS itself; that is what the
// probes measure, not a bypass.
export async function isolatedPage(page) {
  const session = await page.context().newCDPSession(page);
  let contextId = null;
  page.on('framenavigated', frame => { if (frame === page.mainFrame()) contextId = null; });
  const world = async () => {
    if (contextId === null) {
      const { frameTree } = await session.send('Page.getFrameTree');
      ({ executionContextId: contextId } = await session.send('Page.createIsolatedWorld', { frameId: frameTree.frame.id, worldName: 'fannan-probe', grantUniveralAccess: false }));
    }
    return contextId;
  };
  const run = async (expression, retry = true) => {
    let reply;
    try { reply = await session.send('Runtime.evaluate', { expression, contextId: await world(), returnByValue: true, awaitPromise: true }); }
    catch (e) { if (retry && /context/i.test(e.message)) { contextId = null; return run(expression, false); } throw e; }
    if (reply.exceptionDetails) throw Error('probe world: ' + (reply.exceptionDetails.exception?.description || reply.exceptionDetails.text));
    return reply.result.value;
  };
  const evaluate = (fn, arg) => run(`(${fn.toString()})(${arg === undefined ? '' : JSON.stringify(arg)})`);
  const addScriptTag = async ({ content }) => { await run(`${content}\n;undefined`); };
  return new Proxy(page, { get(target, key) {
    if (key === 'evaluate') return evaluate;
    if (key === 'addScriptTag') return addScriptTag;
    const value = Reflect.get(target, key);
    return typeof value === 'function' ? value.bind(target) : value;
  } });
}
