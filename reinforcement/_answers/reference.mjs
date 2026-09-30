export function affectedKeys(keys,projectKey,issueNumber) {
  return keys.filter(key => {
    if (!Array.isArray(key) || key[0] !== 'projects' || key[1] !== projectKey || key[2] !== 'issues') return false;
    const tail=key[3];
    return (tail !== null && typeof tail === 'object' && !Array.isArray(tail)) || (typeof tail === 'number' && tail === issueNumber);
  });
}
