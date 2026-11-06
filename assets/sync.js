// Optional backend bridge. If /api is reachable (node server/server.js) the app uses the server for login, orders and staff data;
// otherwise (GitHub Pages, double-click) everything keeps working in local mode.
(()=>{
const OK='nc-orders-v2',KEYS={'no-crumbs-demo-v1':'demo','nc-ml-v2':'ml','nc-decisions':'decisions'},ls=localStorage,ss=sessionStorage,rawSet=Storage.prototype.setItem,rawDel=Storage.prototype.removeItem;
let on=false;const tok=()=>ss.getItem('nc-token'),role=()=>ss.getItem('noCrumbsRole');
const toast=m=>{const t=document.getElementById('toast');if(t){t.textContent=m;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),3000)}};
async function api(m,u,b){try{const r=await fetch(u,{method:m,headers:{'Content-Type':'application/json',...(tok()?{Authorization:'Bearer '+tok()}:{})},body:b?JSON.stringify(b):undefined});return{ok:r.ok,s:r.status,j:await r.json().catch(()=>({}))}}catch{return{ok:false,s:0,j:{}}}}
const emit=(k,v)=>{rawSet.call(ls,k,v);dispatchEvent(new StorageEvent('storage',{key:k,newValue:v,storageArea:ls}))};
async function pull(){const r=await api('GET','api/orders');if(r.s===401){ss.removeItem('nc-token');rawDel.call(ss,'noCrumbsRole');location.reload();return}if(r.ok){const v=JSON.stringify(r.j.orders);if(v!==ls.getItem(OK))emit(OK,v)}}
async function push(o,n){const om=new Map(o.map(x=>[x.id,x]));let ch=false;for(const x of n){const p=om.get(x.id);let r;
 if(!p){if(role()!=='student')continue;r=await api('POST','api/orders',{name:x.name,items:x.items.map(i=>({id:i.id,q:i.q})),slot:x.slot,alg:x.alg,algn:x.algn});ch=true}
 else if(!p.cancelled&&x.cancelled){r=await api('PATCH','api/orders/'+x.id+'/cancel');ch=true}
 else if((x.st||0)>(p.st||0)){r=await api('PATCH','api/orders/'+x.id+'/status',{st:x.st});ch=true}
 if(r&&!r.ok)toast('Server: '+(r.j.error||'request rejected'))}if(ch)pull()}
Storage.prototype.setItem=function(k,v){const old=this===ls&&k===OK?ls.getItem(k):null;rawSet.call(this,k,v);if(this!==ls||!on)return;if(k===OK)push(JSON.parse(old||'[]'),JSON.parse(v));else if(KEYS[k]&&role()==='staff')api('PUT','api/data/'+KEYS[k],{value:JSON.parse(v)})};
Storage.prototype.removeItem=function(k){if(this===ss&&k==='noCrumbsRole'&&on){api('POST','api/logout');rawDel.call(ss,'nc-token')}rawDel.call(this,k)};
const ready=api('GET','api/health').then(r=>on=!!(r.ok&&r.j.ok));
const form=document.getElementById('login-form');
if(form){let pass=false;form.addEventListener('submit',async e=>{if(pass)return;e.preventDefault();e.stopImmediatePropagation();await ready;
 if(!on){pass=true;form.requestSubmit();return}
 const r=await api('POST','api/login',{id:document.getElementById('login-id').value.trim(),password:document.getElementById('login-password').value,role:document.getElementById('login-role').value});
 if(r.ok){ss.setItem('nc-token',r.j.token);rawSet.call(ss,'noCrumbsRole',r.j.role);location.reload()}else document.getElementById('login-error').textContent=r.j.error||'Login failed'},true)}
ready.then(async()=>{if(!on)return;if(role()&&!tok()){rawDel.call(ss,'noCrumbsRole');location.reload();return}if(!tok())return;
 await pull();toast('Connected to the canteen server');
 if(role()==='staff'&&!ss.getItem('nc-synced')){let ch=false;for(const[k,n]of Object.entries(KEYS)){const r=await api('GET','api/data/'+n);if(r.ok&&r.j.value!=null){const v=JSON.stringify(r.j.value);if(v!==ls.getItem(k)){rawSet.call(ls,k,v);ch=true}}else if(ls.getItem(k))api('PUT','api/data/'+n,{value:JSON.parse(ls.getItem(k))})}ss.setItem('nc-synced','1');if(ch)location.reload()}
 const es=new EventSource('api/events?token='+tok());es.addEventListener('orders',pull);setInterval(pull,20000)});
})();
