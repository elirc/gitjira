export function applyIssuePatch(issue,patch) {
  const result={...issue};
  for(const [key,value] of Object.entries(patch)) {
    if(key==='title') {if(typeof value!=='string'||!value.trim())throw new TypeError('Invalid title');result.title=value.trim();}
    else if(key==='assigneeId') {if(value!==null&&(typeof value!=='string'||!value.length))throw new TypeError('Invalid assignee');result.assigneeId=value;}
    else if(key==='storyPoints') {if(value!==null&&(!Number.isInteger(value)||value<0||value>100))throw new TypeError('Invalid points');result.storyPoints=value;}
    else throw new TypeError('Unknown field');
  }
  return result;
}
