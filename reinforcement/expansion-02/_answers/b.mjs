export function createGate(loader) {
  const pending=new Map();
  return key=>{
    if(pending.has(key))return pending.get(key);
    const promise=Promise.resolve().then(()=>loader(key)).finally(()=>pending.delete(key));
    pending.set(key,promise);
    return promise;
  };
}
