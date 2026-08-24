import WebSocket from 'ws';
const TOKEN=process.argv[2],BOOK=process.argv[3];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const list=await (await fetch('http://127.0.0.1:9222/json/list')).json();
const page=list.find(t=>t.type==='page');
const ws=new WebSocket(page.webSocketDebuggerUrl,{maxPayload:256*1024*1024});
await new Promise(r=>ws.on('open',r));
let id=0;const pending=new Map();
ws.on('message',m=>{const g=JSON.parse(m);if(g.id&&pending.has(g.id)){pending.get(g.id)(g);pending.delete(g.id);}});
const send=(m,p={})=>new Promise(res=>{const i=++id;pending.set(i,res);ws.send(JSON.stringify({id:i,method:m,params:p}));});
const evalJs=async e=>{const r=await send('Runtime.evaluate',{expression:e,returnByValue:true});return r.result?.result?.value ?? r.result?.exceptionDetails?.text;};
await send('Runtime.enable');await send('Page.enable');
await send('Page.navigate',{url:'http://127.0.0.1:5173/login'});await sleep(2000);
await evalJs(`localStorage.setItem('access_token','${TOKEN}');localStorage.setItem('refresh_token','p');1`);
await send('Page.navigate',{url:`http://127.0.0.1:5173/books/${BOOK}`});await sleep(40000);
console.log('RESULT:', await evalJs(`(() => {
  const f=document.querySelector('iframe[title="chapter-editor"]');
  if(!f||!f.contentDocument) return 'no iframe';
  const d=f.contentDocument;
  return JSON.stringify({ blocks: d.querySelectorAll('[data-block-id]').length,
    pages: d.querySelectorAll('.page').length,
    mode: document.body.innerText.includes('paginated') ? 'paginated' : 'flow',
    rail: (document.body.innerText.match(/पेज · (\\d+)/)||[])[1] || null });
})()`));
ws.close();
