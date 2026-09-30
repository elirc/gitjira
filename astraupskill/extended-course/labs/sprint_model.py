"""Sequential specification model; not a Prisma/PostgreSQL concurrency test."""
from dataclasses import dataclass

def next_version(stored, clock): return max(clock, stored+1)

@dataclass
class Issue:
    sprint: str | None = None
    version: int = 10
    done: bool = False

def assign(issue, target, states, expected, clock):
    if target is not None and states[target]=='COMPLETED': return False
    if expected is not None and issue.version!=expected: return False
    issue.sprint=target
    issue.version=next_version(issue.version,clock)
    return True

def complete(source, issues, states):
    if states[source]!='ACTIVE': return False
    states[source]='COMPLETED'
    for issue in issues:
        if issue.sprint==source and not issue.done: issue.sprint=None
    return True

def checks():
    assert next_version(20,10)==21, 'future token still advances'
    states={'S':'ACTIVE','D':'PLANNED'}; i=Issue()
    assert assign(i,'S',states,10,11)
    assert not assign(i,'D',states,10,12), 'stale token cannot overwrite'
    assert i.sprint=='S' and i.version==11
    assert complete('S',[i],states) and i.sprint is None, 'assignment then completion'
    states={'S':'ACTIVE'}; i=Issue()
    assert complete('S',[i],states)
    assert not assign(i,'S',states,10,11) and i.sprint is None, 'completion then assignment'
    states={'S':'ACTIVE'}; done=Issue('S',done=True); unfinished=Issue('S')
    assert complete('S',[done,unfinished],states)
    assert done.sprint=='S' and unfinished.sprint is None, 'only unfinished move'
    assert not complete('S',[done,unfinished],states), 'completion has one lifecycle winner'
    print('7 sprint-model properties passed; no database or application execution')

if __name__=='__main__': checks()
