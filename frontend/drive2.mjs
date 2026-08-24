import WebSocket from 'ws';
const TOKEN=process.argv[2],BOOK=process.argv[3];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const list=await (await fetch('http://127.0.0.1:9222/json/list')).json();
const page=list.find(t=>t.type==='page');
const ws=new WebSocket(page.webSocketDebuggerUrl,{maxPayload:64*1024*1024});
await new Promise(r=>ws.on('open',r));
let id=0;const pending=new Map();
ws.on('message',m=>{const g=JSON.parse(m);if(g.id&&pending.has(g.id)){pending.get(g.id)(g);pending.delete(g.id);}});
const send=(m,p={})=>new Promise(res=>{const i=++id;pending.set(i,res);ws.send(JSON.stringify({id:i,method:m,params:p}));});
const evalJs=async e=>{const r=await send('Runtime.evaluate',{expression:e,returnByValue:true});return r.result?.result?.value ?? r.result?.exceptionDetails?.text;};
await send('Runtime.enable');await send('Page.enable');
await send('Page.navigate',{url:'http://127.0.0.1:5173/login'});await sleep(1800);
await evalJs(`localStorage.setItem('access_token','${TOKEN}');localStorage.setItem('refresh_token','p');1`);
await send('Page.navigate',{url:`http://127.0.0.1:5173/books/${BOOK}`});await sleep(8000);

const target = await evalJs(`(() => {
  const f=document.querySelector('iframe[title="chapter-editor"]');
  const d=f.contentDocument, fr=f.getBoundingClientRect();
  const sc=(f.style.transform.match(/scale\\(([\\d.]+)\\)/)||[0,1])[1]*1;
  const b=[...d.querySelectorAll('[data-block-id]')].find(e=>(e.textContent||'').trim().length>25 && e.tagName!=='SVG');
  if(!b) return null;
  const r=b.getBoundingClientRect();
  return { tag:b.tagName, text:(b.textContent||'').trim().slice(0,45),
           x: fr.left + (r.left + 12)*sc, y: fr.top + (r.top + r.height/2)*sc };
})()`);
console.log('TARGET BLOCK:', JSON.stringify(target));
if(!target){ ws.close(); process.exit(1); }

for(const type of ['mousePressed','mouseReleased']){
  await send('Input.dispatchMouseEvent',{type,x:target.x,y:target.y,button:'left',clickCount:1});
  await sleep(150);
}
await sleep(900);
console.log('AFTER CLICK:', await evalJs(`(() => {
  const d=document.querySelector('iframe[title="chapter-editor"]').contentDocument;
  const ed=d.querySelectorAll('[contenteditable="true"]');
  return JSON.stringify({ editableCount: ed.length, activeTag: d.activeElement && d.activeElement.tagName,
    activeIsEditable: d.activeElement ? d.activeElement.isContentEditable : null,
    editableText: ed[0] ? (ed[0].textContent||'').trim().slice(0,40) : null });
})()`));

await send('Input.insertText',{text:'HELLO '});
await sleep(700);
console.log('AFTER TYPING:', await evalJs(`(() => {
  const d=document.querySelector('iframe[title="chapter-editor"]').contentDocument;
  const ed=d.querySelector('[contenteditable="true"]');
  const t = ed ? (ed.textContent||'') : (d.body.textContent||'');
  return JSON.stringify({ landed: t.includes('HELLO'), sample: t.trim().slice(0,55) });
})()`));

// Enter should split the block
const before = await evalJs(`document.querySelector('iframe[title="chapter-editor"]').contentDocument.querySelectorAll('[data-block-id]').length`);
await send('Input.dispatchKeyEvent',{type:'keyDown',windowsVirtualKeyCode:13,nativeVirtualKeyCode:13,key:'Enter',code:'Enter',text:'\r'});
await send('Input.dispatchKeyEvent',{type:'keyUp',windowsVirtualKeyCode:13,nativeVirtualKeyCode:13,key:'Enter',code:'Enter'});
await sleep(1200);
const after = await evalJs(`document.querySelector('iframe[title="chapter-editor"]').contentDocument.querySelectorAll('[data-block-id]').length`);
console.log(`ENTER: blocks ${before} -> ${after}  ${after>before?'(SPLIT WORKED)':'(no split)'}`);

console.log('DIRTY FLAG:', await evalJs(`document.body.innerText.includes('Unsaved changes')`));
ws.close();
