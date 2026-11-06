// Constraint 1: the app never needs the internet. This pill shows connection state; TEST OFFLINE simulates a blackout.
(()=>{const b=document.createElement('div');b.id='net-bar';document.body.prepend(b);let sim=false;const u=()=>{const off=sim||!navigator.onLine;b.className=off?'off':'on';b.innerHTML=(off?'📴 OFFLINE MODE · ordering, cart, status, forecasting &amp; vision run on local data':'● LOCAL-FIRST · works with no internet')+' <button id="net-test" type="button">'+(sim?'END TEST':'TEST OFFLINE')+'</button>';document.getElementById('net-test').onclick=()=>{sim=!sim;u()}};addEventListener('online',u);addEventListener('offline',u);u()})();

if('serviceWorker' in navigator&&/^https?:/.test(location.protocol))navigator.serviceWorker.register('sw.js').catch(()=>{});
