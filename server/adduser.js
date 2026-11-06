// Usage: node server/adduser.js <id> <password> <student|staff>
const path=require('path'),{hash,makeDB}=require('./server.js'),[id,pw,role]=process.argv.slice(2);
if(!id||!pw||!['student','staff'].includes(role)||pw.length<8){console.log('Usage: node server/adduser.js <id> <password (8+ chars)> <student|staff>');process.exit(1)}
const db=makeDB(process.env.NC_DATA||path.join(__dirname,'data')),u=db.get('users',[]).filter(x=>x.id!==id);u.push({id,role,h:hash(pw)});db.set('users',u);db.flush();console.log('Saved',role,id);
