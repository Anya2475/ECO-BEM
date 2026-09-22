const fs = require('fs');
const vm = require('vm');

const appJsCode = fs.readFileSync('C:\\Users\\chatt\\Desktop\\ECO-BEM\\app.v9.js', 'utf-8');

const sandbox = {
  window: { AudioContext: class {}, webkitAudioContext: class {} },
  document: {
    getElementById: () => ({ style: {}, classList: { add: () => {} } }),
    addEventListener: () => {},
    querySelector: () => null,
    querySelectorAll: () => []
  },
  localStorage: { getItem: () => null, setItem: () => {} },
  console: console,
  setTimeout: setTimeout,
  setInterval: setInterval
};

try {
  vm.createContext(sandbox);
  vm.runInContext(appJsCode, sandbox);
  console.log('No top-level runtime error!');
} catch (e) {
  console.error('ERROR ON LOAD:', e);
}
