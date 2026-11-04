const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = ['bank','concepts','engine','blueprint'].map(file=>fs.readFileSync('dist/'+file+'.js','utf8')).join('\n');
vm.runInNewContext(source+`
  assert.equal(bank.length,73);
  for (const [id,q] of bank.entries()) {
    assert.equal(q.id,id);
    assert.equal(new Set(q.options).size,4);
    if (q.concept) assert(concepts[q.concept]);
  }
  assert.equal(bank[4].concept,'action-place');
  assert.equal(chooseQuestion([],()=>0).level,3);
  const attempt = (id,choice)=>({id,choice,seconds:5});
  const domainRows = assessmentCoverage([attempt(0,0),attempt(1,null)],bank);
  const knowledge = domainRows.find(domain=>domain.id==='knowledge');
  assert.equal(knowledge.skills[0].status,'needs-evidence');
  assert.equal(knowledge.skills[0].answers,1);
  assert.equal(assessmentCoverage([attempt(0,0),attempt(1,1)],bank)[1].skills[0].status,'sampled');
  assert(domainRows.find(domain=>domain.id==='listening').skills.every(row=>row.status==='unavailable'));
  const skillIds = assessmentBlueprint.domains.flatMap(domain=>domain.skills.map(row=>row[0]));
  assert.equal(new Set(skillIds).size,skillIds.length);
  const seen = [attempt(4,1)];
  const initial = assess(seen);
  const practiced = assess([...seen,attempt(60,0)]);
  assert.deepEqual(practiced.overall,initial.overall);
  assert.equal(practiced.practice.length,1);
  assert.equal(studyPriority(practiced),null);
  const repeated = assess([...seen,attempt(60,1)]);
  assert.equal(studyPriority(repeated).concept,'action-place');
  assert.equal(studyPriority(repeated).repeated,true);
  const regular = assess([attempt(0,0),attempt(1,0)]);
  const advanced = assess([attempt(48,0),attempt(49,0)]);
  assert(advanced.skill[0].readiness>=0 && advanced.skill[0].readiness<=1);
  assert(advanced.overall.weights[5]>regular.overall.weights[5]);
  assert.deepEqual(credibleRange([.01,.03,.12,.7,.12,.02]),[2,3]);
  assert.equal(information([.5,.5],[.7,.7]),0);
  assert(information([.5,.5],[.3,.9])>information([.5,.5],[.5,.7]));
  const skip = assess([attempt(0,null)]);
  const wrong = assess([attempt(0,1)]);
  assert(skip.overall.weights[0]<wrong.overall.weights[0]);
  for (const distribution of [advanced.overall.weights,...advanced.skill.map(s=>s.weights)]) {
    assert(Math.abs(distribution.reduce((sum,w)=>sum+w,0)-1)<1e-10);
  }
  for (const [choice,expected] of [[0,5],[null,0]]) {
    const answers=[];
    const ids=new Set();
    while (answers.length<bank.length) {
      const question=chooseQuestion(answers,()=>0);
      assert(!ids.has(question.id));
      ids.add(question.id);
      answers.push(attempt(question.id,choice));
      if (answers.length===12) assert.equal(assess(answers).overall.band,expected);
    }
    assert.equal(chooseQuestion(answers),undefined);
    assert.equal(assess(answers).overall.band,expected);
  }
  console.log('Engine checks passed');
`,{assert,console});
