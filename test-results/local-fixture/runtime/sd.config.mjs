export function config(tokens) {
  return { tokens, usesDtcg: true, platforms: { css: { transformGroup: 'css', files: [{ destination: 'variables.css', format: 'css/variables' }] } }, log: { verbosity: 'silent', warnings: 'error' } };
}
