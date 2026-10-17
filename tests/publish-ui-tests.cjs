const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
const source = process.argv.includes('--baseline')
  ? execFileSync('git', ['show', 'HEAD:public/assets/admin.js'], {encoding:'utf8'})
  : fs.readFileSync('public/assets/admin.js', 'utf8');
function node() {
  return {hidden:false, disabled:false, value:'2026-10', checked:true, files:[],
    classList:{toggle(){}, contains(){return false;}}, setAttribute(){}, removeAttribute(){},
    append(){}, scrollIntoView(){}, getAnimations(){return [];}, querySelectorAll(){return [];}};
}
async function scenario(fail) {
  const elements = new Map();
  const get = id => {if (!elements.has(id)) elements.set(id,node()); return elements.get(id);};
  const editable = node(), alreadyDisabled = node(); alreadyDisabled.disabled = true;
  get('workspace').querySelectorAll = () => [editable, alreadyDisabled, get('publish')];
  const context = {document:{getElementById:get,createElement:node},
    window:{addEventListener(){}}, location:{reload(){}}, Date, Set, URL,
    matchMedia:()=>({matches:true}), fetch:async()=>({ok:true,json:async()=>({owner:false,csrf:'test'})})};
  vm.createContext(context); vm.runInContext(source,context);
  await new Promise(resolve=>setImmediate(resolve));
  let complete, reject;
  context.api = async(action) => action==='publish' ? new Promise((resolve,fail)=>{complete=resolve;reject=fail;}) : {};
  context.confirmAction = async()=>true;
  vm.runInContext("rows=[{employee:'001',date:'2026-10-01',code:'E'}];selectedIds=new Set(['001']);draftMonth='2026-10';dirty=true;",context);
  const pending = get('publish').onclick({preventDefault(){}});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(editable.disabled,true,'Draft controls must be disabled while publishing');
  assert.equal(get('logout').disabled,true,'Logout must be disabled while publishing');
  if(fail) reject(new Error('Test network failure')); else complete({ok:true});
  await pending;
  assert.equal(editable.disabled,false,'Draft editing must be restored');
  assert.equal(alreadyDisabled.disabled,true,'Originally disabled controls must stay disabled');
  assert.equal(get('logout').disabled,false,'Logout must be restored');
  assert.equal(vm.runInContext('dirty',context),fail,'Failed publishing must retain unsaved changes');
}
(async()=>{await scenario(false);await scenario(true);console.log('PASS: publication locks editing and restores controls on success and failure');})().catch(error=>{console.error(error.message);process.exitCode=1;});
