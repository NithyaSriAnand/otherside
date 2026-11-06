
// Demo-only role sign-in. This is a front-end prototype, not secure authentication.
(() => {
  const loginScreen = document.getElementById('login-screen');
  const loginForm = document.getElementById('login-form');
  const roleInput = document.getElementById('login-role');
  const idInput = document.getElementById('login-id');
  const passInput = document.getElementById('login-password');
  const error = document.getElementById('login-error');
  const accounts = {
    student: {id:'CRUMB-STU-01', password:'Student@123', label:'STUDENT'},
    staff: {id:'CRUMB-CAN-01', password:'Kitchen@123', label:'CANTEEN STAFF'}
  };
  let chosenRole = 'student';

  function setRole(role) {
    chosenRole = role;
    roleInput.value = role;
    document.querySelectorAll('.role-option').forEach(btn => btn.classList.toggle('active', btn.dataset.role === role));
    idInput.placeholder = role === 'student' ? 'Enter your student ID' : 'Enter your staff ID';
    error.textContent = '';
  }
  document.querySelectorAll('.role-option').forEach(btn => btn.addEventListener('click', () => setRole(btn.dataset.role)));
  document.getElementById('toggle-password').addEventListener('click', () => {
    const show = passInput.type === 'password';
    passInput.type = show ? 'text' : 'password';
    document.getElementById('toggle-password').textContent = show ? 'HIDE' : 'SHOW';
  });

  function enter(role, id) {
    sessionStorage.setItem('noCrumbsRole', role);
    document.body.classList.remove('logged-out', 'role-student', 'role-staff');
    document.body.classList.add('role-' + role);
    loginScreen.hidden = true;
    document.getElementById('account-chip').textContent = (role === 'student' ? 'STUDENT' : 'CANTEEN STAFF') + ' · ' + id;
    document.getElementById('logout-btn').hidden = false;
  }
  loginForm.addEventListener('submit', event => {
    event.preventDefault();
    const account = accounts[chosenRole];
    if (idInput.value.trim().toUpperCase() !== account.id || passInput.value !== account.password) {
      error.textContent = 'That ID and password do not match this demo ' + (chosenRole === 'student' ? 'student' : 'staff') + ' account.';
      return;
    }
    enter(chosenRole, account.id);
  });
  document.getElementById('logout-btn').addEventListener('click', () => {
    sessionStorage.removeItem('noCrumbsRole');
    document.body.classList.remove('role-student', 'role-staff');
    document.body.classList.add('logged-out');
    loginScreen.hidden = false;
    passInput.value = '';
    error.textContent = '';
    setRole('student');
    window.scrollTo({top:0,behavior:'smooth'});
  });

  const savedRole = sessionStorage.getItem('noCrumbsRole');
  if (savedRole === 'student' || savedRole === 'staff') {
    enter(savedRole, accounts[savedRole].id);
  } else {
    document.body.classList.add('logged-out');
    document.getElementById('logout-btn').hidden = true;
  }
})();

const menuToggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.nav-links');
menuToggle.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.textContent = open ? '×' : '☰';
});
nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  nav.classList.remove('open');
  menuToggle.setAttribute('aria-expanded', 'false');
  menuToggle.textContent = '☰';
}));

const scenarios = {
  cancel: {title:'An event gets cancelled.', planned:500, attendance:350, prepared:500, note:'A campus event cancellation reduces expected attendance after the original forecast.'},
  weather: {title:'Heavy rain changes attendance.', planned:420, attendance:290, prepared:420, note:'Unexpected weather affects the number of students arriving for lunch.'},
  booking: {title:'Bookings do not match arrivals.', planned:460, attendance:390, prepared:460, note:'Meal bookings overstate actual arrivals, leaving the kitchen with a mismatch.'}
};
let activeScenario = 'cancel';
const $ = id => document.getElementById(id);
function chooseScenario(key) {
  activeScenario = key;
  const s = scenarios[key];
  $('scenario-title').textContent = s.title;
  $('planned').textContent = s.planned;
  $('attendance').textContent = s.attendance;
  $('prepared').textContent = s.prepared;
  $('prep-range').max = Math.max(s.planned, s.attendance + 150);
  $('prep-range').min = Math.max(100, s.attendance - 100);
  $('prep-range').value = Math.round((s.attendance + s.planned) / 2 / 25) * 25;
  $('prep-output').textContent = $('prep-range').value;
  $('simulation-result').innerHTML = '<div class="result-icon">✳</div><div><b>Scenario loaded.</b><p>' + s.note + ' Adjust the preparation quantity and run the alternate scenario.</p></div>';
  document.querySelectorAll('.scenario-btn').forEach(b => b.classList.toggle('active', b.dataset.scenario === key));
}
document.querySelectorAll('.scenario-btn').forEach(btn => btn.addEventListener('click', () => chooseScenario(btn.dataset.scenario)));
$('prep-range').addEventListener('input', e => $('prep-output').textContent = e.target.value);
$('simulate-btn').addEventListener('click', () => {
  const s = scenarios[activeScenario];
  const proposed = Number($('prep-range').value);
  const gap = proposed - s.attendance;
  const currentGap = s.prepared - s.attendance;
  const improvement = currentGap - gap;
  let heading, detail;
  if (gap < 0) {
    heading = 'Your plan may fall short.';
    detail = `The illustrative plan prepares ${Math.abs(gap)} fewer meals than the ${s.attendance} expected attendees. Consider a buffer or another batch.`;
  } else if (improvement > 0) {
    heading = `${improvement} fewer excess portions in this scenario.`;
    detail = `Compared with the original ${s.prepared}-meal plan, preparing ${proposed} meals brings the plan closer to expected attendance. A real kitchen would still use a safety buffer and food-safety procedures.`;
  } else if (gap === 0) {
    heading = 'Preparation matches expected attendance.';
    detail = `The plan is aligned with the ${s.attendance} expected attendees in this simplified example. Actual demand can still vary.`;
  } else {
    heading = 'The plan still has a surplus buffer.';
    detail = `The plan has ${gap} portions above expected attendance. This may be intentional as a buffer; actual outcomes must be measured.`;
  }
  $('simulation-result').innerHTML = `<div class="result-icon">↗</div><div><b>${heading}</b><p>${detail}</p></div>`;
});
chooseScenario('cancel');


// Local-first working product playground. Data stays in this browser only.
const STORE_KEY = 'no-crumbs-demo-v1';
const loadStore = () => { try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {batches:[],waste:[],surplus:[]}; } catch { return {batches:[],waste:[],surplus:[]}; } };
let demoData = loadStore();
const saveStore = () => localStorage.setItem(STORE_KEY, JSON.stringify(demoData));
const safeText = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dateValue = id => $(id).value ? new Date($(id).value) : null;
function updateLedger(){
  $('ledger-waste').textContent = demoData.waste.reduce((n,x)=>n+x.kg,0).toFixed(2)+' kg';
  $('ledger-batches').textContent = demoData.batches.length;
  $('ledger-claimed').textContent = demoData.surplus.filter(x=>x.claimed).reduce((n,x)=>n+x.count,0);
}
$('forecast-btn').addEventListener('click',()=>{
 const students=Number($('demand-students').value), buffer=Number($('demand-buffer').value);
 if(!Number.isFinite(students)||students<0||students>10000||!Number.isFinite(buffer)||buffer<0||buffer>50){$('forecast-output').textContent='Enter attendance from 0–10,000 and a buffer from 0–50%.';return;}
 const target=Math.ceil(students*(1+buffer/100)); $('forecast-output').innerHTML=`<b>Suggested planning quantity: ${target} meals</b><br>${students} expected students + ${buffer}% buffer (${target-students} meals). Illustrative estimate only; review actual demand and food-safety requirements.`;
});
$('batch-btn').addEventListener('click',()=>{
 const food=$('batch-food').value.trim(), prepared=dateValue('batch-time'), deadline=dateValue('batch-deadline'), checked=$('batch-checked').checked;
 if(!food||!prepared||!deadline){$('batch-output').textContent='Complete the food name, preparation time and deadline.';return;}
 if(deadline<=prepared){$('batch-output').textContent='The deadline must be later than the preparation time.';return;}
 const item={id:Date.now(),food,prepared:prepared.toISOString(),deadline:deadline.toISOString(),checked};demoData.batches.push(item);saveStore();updateLedger();$('batch-output').innerHTML=`<b>Batch ${demoData.batches.length} saved.</b><br>${safeText(food)} · ${checked?'Safety check marked complete':'Safety check still pending'}<br>Deadline: ${deadline.toLocaleString()}. This record does not certify food as safe.`;
});
$('waste-photo').addEventListener('change',e=>{const file=e.target.files[0];if(!file){$('waste-preview').hidden=true;return;}if(!file.type.startsWith('image/'))return;const reader=new FileReader();reader.onload=()=>{$('waste-preview').src=reader.result;$('waste-preview').hidden=false;};reader.readAsDataURL(file);});
$('waste-btn').addEventListener('click',()=>{const kg=Number($('waste-weight').value),type=$('waste-type').value.trim()||'Unspecified food';if(!Number.isFinite(kg)||kg<=0||kg>1000){$('waste-output').textContent='Enter a measured weight greater than 0 and no more than 1,000 kg.';return;}demoData.waste.push({kg,type,at:new Date().toISOString()});saveStore();updateLedger();$('waste-output').innerHTML=`<b>${kg.toFixed(2)} kg logged.</b><br>${safeText(type)} · Measurement saved locally. Photo preview is not analysed by AI.`;});
function renderSurplus(){const host=$('surplus-list');if(!demoData.surplus.length){host.innerHTML='<p>No surplus listings yet.</p>';return;}host.innerHTML=demoData.surplus.map(x=>`<div class="surplus-item"><div><b>${safeText(x.food)}</b><small>${x.count} portions · Collect by ${new Date(x.deadline).toLocaleString()}</small><small>${x.claimed?'Marked as claimed in demo':'Available · demo listing'}</small></div>${x.claimed?'<b>✓</b>':`<button data-claim="${x.id}">Mark claimed</button>`}</div>`).join('');host.querySelectorAll('[data-claim]').forEach(btn=>btn.addEventListener('click',()=>{const item=demoData.surplus.find(x=>x.id===Number(btn.dataset.claim));if(item){item.claimed=true;saveStore();renderSurplus();updateLedger();}}));}
$('surplus-btn').addEventListener('click',()=>{const food=$('surplus-food').value.trim(),count=Number($('surplus-count').value),deadline=dateValue('surplus-deadline');if(!food||!Number.isInteger(count)||count<1||count>10000||!deadline||deadline<=new Date()){$('surplus-list').innerHTML='<p>Enter a food name, 1–10,000 portions and a future collection deadline.</p>';return;}demoData.surplus.push({id:Date.now(),food,count,deadline:deadline.toISOString(),claimed:false});saveStore();renderSurplus();$('surplus-food').value='';});
$('export-btn').addEventListener('click',()=>{const rows=[['type','item','quantity','timestamp','status'],...demoData.waste.map(x=>['waste',x.type,x.kg+' kg',x.at,'logged']),...demoData.batches.map(x=>['batch',x.food,'',x.prepared,x.checked?'safety check marked':'pending']),...demoData.surplus.map(x=>['surplus',x.food,x.count,x.deadline,x.claimed?'claimed':'available'])];const csv=rows.map(r=>r.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\n');const blob=new Blob([csv],{type:'text/csv'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='no-crumbs-demo-data.csv';a.click();URL.revokeObjectURL(url);});
$('reset-demo').addEventListener('click',()=>{if(!confirm('Clear all NO CRUMBS demo entries saved in this browser?'))return;demoData={batches:[],waste:[],surplus:[]};saveStore();renderSurplus();updateLedger();$('batch-output').textContent='No batch recorded yet.';$('waste-output').textContent='No measurements logged.';$('forecast-output').textContent='Your forecast will appear here.';});
renderSurplus();updateLedger();
