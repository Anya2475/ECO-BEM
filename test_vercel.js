const fs = require('fs');
const { JSDOM } = require('jsdom');

let html = fs.readFileSync('C:\\Users\\chatt\\Desktop\\ECO-BEM-Clean\\index.html', 'utf-8');
const appjs = fs.readFileSync('C:\\Users\\chatt\\Desktop\\ECO-BEM-Clean\\app.js', 'utf-8');
const lessonsjs = fs.readFileSync('C:\\Users\\chatt\\Desktop\\ECO-BEM-Clean\\lessonsData.js', 'utf-8');
const annalsjs = fs.readFileSync('C:\\Users\\chatt\\Desktop\\ECO-BEM-Clean\\annalsData.js', 'utf-8');

html = html.replace('<script src="./app.js"></script>', `<script>${appjs}</script>`);
html = html.replace('<script defer src="./lessonsData.js"></script>', `<script>${lessonsjs}</script>`);
html = html.replace('<script defer src="./annalsData.js"></script>', `<script>${annalsjs}</script>`);

const dom = new JSDOM(html, {
  url: 'http://localhost',
  runScripts: 'dangerously',
  resources: 'usable'
});

dom.window.localStorage = {
  getItem: () => null,
  setItem: () => {}
};

dom.window.AudioContext = class {
    resume() {}
};
dom.window.webkitAudioContext = dom.window.AudioContext;

dom.window.addEventListener('load', () => {
    console.log('DOM loaded');
    try {
        console.log('Is enterApp defined?', typeof dom.window.enterApp);
        dom.window.enterApp();
        console.log('enterApp called successfully');
        const splash = dom.window.document.getElementById('splash');
        console.log('Splash has gone class:', splash.classList.contains('gone'));
        console.log('Auth Overlay display:', dom.window.document.getElementById('ov-auth').style.display);
    } catch(e) {
        console.error('Error calling enterApp:', e);
    }
});
