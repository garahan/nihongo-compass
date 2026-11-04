const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = ['bank','concepts','items-n5','items-n4','items-n3','items-n2','items-n1','mahym-items','mahym-errata','mahym-bank','transfer','engine','blueprint','session','report-analytics'].map(file=>fs.readFileSync('dist/'+file+'.js','utf8')).join('\n');
vm.runInNewContext(source+`
  assert.equal(bank.length,273+mahymItems.length);
  assert.equal(mahymItems.length,2104);
  assert.equal(new Set(mahymItems.map(q=>q.sourceId)).size,mahymItems.length);
  assert.equal(availableForPlacement(bank.find(q=>q.sourceId==='L33q7')),false);
  assert.equal(assess([{id:bank.find(q=>q.sourceId==='L33q7').id,choice:1}]).placement.length,0);
  const linked = bank.find(q=>q.lessonId);
  assert.equal(mahymRecommendation([{id:linked.id,choice:1}],difficulty(linked)),linked.lessonId);
  assert.equal(mahymRecommendation([{id:linked.id,choice:0}],difficulty(linked)),null);
  const first = bank.find(q=>q.sourceId && q.family && availableForPlacement(q) &&
    bank.some(other=>other.id!==q.id && other.family===q.family && availableForPlacement(other)));
  const related = bank.find(q=>q.id!==first.id && q.family===first.family && availableForPlacement(q));
  const one = assess([{id:first.id,choice:0}]);
  const two = assess([{id:first.id,choice:0},{id:related.id,choice:0}]);
  assert.deepEqual(two.overall,one.overall);
  assert.equal(two.practice.length,1);
  assert.equal(new Set(bank.slice(0,273).map(q=>q.prompt)).size,273);
  for (const level of [1,2,3,4,5]) {
    const items = bank.filter(q=>q.level===level && !isTransferItem(q.id));
    assert(items.length>=50);
    for (let skill=0;skill<skills.length;skill++) {
      assert(items.filter(q=>q.skill===skill).length>=6);
    }
  }
  for (const [id,q] of bank.entries()) {
    assert.equal(q.id,id);
    assert.equal(new Set(q.options).size,4);
    assert(q.why.length>0 && q.options.every(option=>option.trim().length>0));
    if (q.concept) assert(concepts[q.concept]);
  }
  for (const curve of itemCurves) {
    assert(curve.every((p,i)=>p>.25 && p<.95 && (i===0 || p>curve[i-1])));
  }
  assert.equal(bank[4].concept,'action-place');
  assert.equal(chooseQuestion([],()=>0).level,3);
  const attempt = (id,choice)=>({id,choice,seconds:5});
  const data = new Map([[legacySessionKey,JSON.stringify([attempt(4,0)])]]);
  const storage = {getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};
  const firstTab = createSessionStore(storage,bank);
  const staleTab = createSessionStore(storage,bank);
  assert.equal(firstTab.load().attempts[0].id,4);
  staleTab.load();
  const active = {id:5,options:[3,0,2,1],graded:false};
  assert.equal(firstTab.save([attempt(4,0)],active).status,'saved');
  assert.equal(staleTab.save([],null).status,'conflict');
  assert.deepEqual(staleTab.load().active,active);
  const graded = {...active,graded:true};
  assert.equal(firstTab.save([attempt(4,0),attempt(5,2)],graded).status,'saved');
  assert.deepEqual(createSessionStore(storage,bank).load().active,graded);
  assert.equal(validSession({version:2,attempts:[attempt(5,2)],active},bank),false);
  assert.equal(validSession({version:2,attempts:[],active:{...active,options:[0,0,1,2]}},bank),false);
  const misdiagnosed = assess([attempt(4,2),attempt(60,1)]);
  assert.equal(locationDiagnosis(misdiagnosed).confirmed,false);
  assert.equal(locationDiagnosis(assess([attempt(4,1),attempt(62,1)])).confirmed,true);
  assert.equal(locationDiagnosis(assess([attempt(4,1),attempt(60,0)])).confirmed,false);
  assert.equal(locationDiagnosis(assess([attempt(4,1),attempt(60,1)])).practice,1);
  const checkpoint = {id:transferProbe.id,readyAt:100,answers:[]};
  assert.equal(transferState(checkpoint,99),'waiting');
  assert.equal(transferState(checkpoint,100),'ready');
  assert.equal(transferState({...checkpoint,answers:[attempt(64,0)]},100),'none');
  assert.equal(transferState({...checkpoint,answers:[attempt(61,0),attempt(64,0)]},100),'complete');
  assert.equal(transferEvidence([attempt(61,0),attempt(64,0)]).aboveHalf,.875);
  assert.equal(transferEvidence([attempt(61,1),attempt(64,0)]).aboveHalf,.5);
  assert.equal(transferEvidence([attempt(61,1),attempt(64,1)]).aboveHalf,.125);
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
  assert.equal(medianBand([.40,.21,.20,.19,0,0]),1);
  assert.equal(bandRiskReduction([.5,.5,0,0,0,0],[.6,.6,.6,.6,.6,.6],.5),0);
  assert(bandRiskReduction([.5,.5,0,0,0,0],[.25,.9,.9,.9,.9,.9],.5)>.25);
  const skip = assess([attempt(0,null)]);
  assert(summarizeReport(skip).categories.every(row=>row.readiness===null));
  const grammar = summarizeReport(assess([attempt(4,1),attempt(5,1)]));
  assert.equal(grammar.focus.id,2);
  assert.equal(grammar.categories.find(row=>row.name==='Grammar').measured.length,1);
  assert.equal(grammar.levels.filter(row=>row.selected).length,1);
  assert.equal(grammar.levels.reduce((sum,row)=>sum+row.percent,0),100);
  const wrong = assess([attempt(0,1)]);
  assert.deepEqual(skip.overall,assess([]).overall);
  assert(assess([attempt(0,null)],true).overall.weights[0]>skip.overall.weights[0]);
  assert(skip.overall.weights[0]<wrong.overall.weights[0]);
  assert.equal(skip.quality.sufficient,false);
  for (const distribution of [advanced.overall.weights,...advanced.skill.map(s=>s.weights)]) {
    assert(Math.abs(distribution.reduce((sum,w)=>sum+w,0)-1)<1e-10);
  }
  for (const [choice,expected] of [[0,5],[null,0]]) {
    const answers=[];
    const ids=new Set();
    while (answers.length<80) {
      const question=chooseQuestion(answers,()=>0);
      assert(!ids.has(question.id));
      assert(availableForPlacement(question));
      ids.add(question.id);
      answers.push(attempt(question.id,choice));
      if (answers.length===12) assert.equal(assess(answers,true).overall.band,expected);
    }
    assert.equal(chooseQuestion(bank.map(q=>attempt(q.id,choice))),undefined);
    assert.equal(assess(answers,true).overall.band,expected);
    if (choice===null) assert.equal(assess(answers).quality.chosen,0);
  }
  console.log('Engine checks passed');
`,{assert,console});
