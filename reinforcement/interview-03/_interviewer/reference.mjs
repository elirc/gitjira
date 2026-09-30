export function orderIssues(issues) {
  const ids=new Set(issues.map(x=>x.id));
  const remaining=new Map();
  for(const issue of issues) {
    const deps=new Set(issue.dependsOn);
    for(const id of deps)if(!ids.has(id))throw new RangeError('Missing dependency');
    remaining.set(issue.id,deps);
  }
  const result=[];
  while(remaining.size) {
    const ready=[...remaining.keys()].filter(id=>remaining.get(id).size===0).sort();
    if(!ready.length)throw new RangeError('Cycle');
    const id=ready[0];result.push(id);remaining.delete(id);
    for(const deps of remaining.values())deps.delete(id);
  }
  return result;
}
