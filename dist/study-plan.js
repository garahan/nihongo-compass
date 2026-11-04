const studyPlanKey = 'nihongo-compass-study-plan-v1';
const exposureKey = 'nihongo-compass-exposure-v1';
const studyCheckDelay = 24*60*60*1000;

function planCandidate(state,focus,lessonId,seen,excluded=new Set()) {
  if (!focus) return null;
  const baselineFamilies = new Set();
  const byLevel = bands.slice(1).map(band=>({
    band,baseline:state.placement.filter(entry=>{
      const q = bank[entry.id];
      if (entry.choice===null || q.skill!==focus.id || difficulty(q)!==band ||
          (q.family && baselineFamilies.has(q.family))) return false;
      if (q.family) baselineFamilies.add(q.family);
      return true;
    })
  })).filter(row=>row.baseline.length>=2 && Math.abs(row.band-state.reference)<=1)
    .sort((a,b)=>Math.min(b.baseline.length,4)-Math.min(a.baseline.length,4) ||
      Math.abs(a.band-state.reference)-Math.abs(b.band-state.reference));
  for (const {band,baseline} of byLevel) {
    const chosen = baseline.slice(-4);
    const averageCurve = bands.map(ability=>
      chosen.reduce((sum,entry)=>sum+itemCurves[entry.id][ability],0)/chosen.length);
    // Exclude terms/concepts already seen, and content shown by the linked lesson.
    const families = new Set([...seen].flatMap(id=>{
      const q = bank[id];
      return q ? [q.family,q.concept].filter(Boolean) : [];
    }));
    const fresh = [];
    const candidates = bank.filter(q=>{
      if (q.skill!==focus.id || difficulty(q)!==band || seen.has(q.id) ||
          excluded.has(q.id) || !availableForPlacement(q) || (lessonId && q.lessonId===lessonId) ||
          families.has(q.family) || families.has(q.concept)) return false;
      return true;
    }).map(q=>({q,distance:mean(skillPrior[band],itemCurves[q.id].map((p,i)=>(p-averageCurve[i])**2))}))
      .sort((a,b)=>a.distance-b.distance || a.q.id-b.q.id);
    for (const {q} of candidates) {
      if (families.has(q.family) || families.has(q.concept)) continue;
      fresh.push(q.id);
      if (q.family) families.add(q.family);
      if (q.concept) families.add(q.concept);
      if (fresh.length===4) break;
    }
    if (fresh.length===4) return {
      version:1,skill:focus.id,band,lessonId:lessonId??null,
      baseline:chosen.map(({id,choice})=>({id,choice})),
      itemIds:fresh,answers:[],stage:'review',readyAt:null
    };
  }
  return null;
}

function validStudyPlan(plan) {
  if (plan?.version!==1 || !Number.isInteger(plan.skill) || !skills[plan.skill] ||
      !bands.slice(1).includes(plan.band) || !['review','practice','check'].includes(plan.stage) ||
      (plan.lessonId!==null && (typeof plan.lessonId!=='string' || !Object.hasOwn(mahymTopics,plan.lessonId))) ||
      (plan.stage==='check' ? !Number.isFinite(plan.readyAt) : plan.readyAt!==null) ||
      !Array.isArray(plan.itemIds) || plan.itemIds.length!==4 ||
      !Array.isArray(plan.baseline) || plan.baseline.length<2 || plan.baseline.length>4 ||
      !Array.isArray(plan.answers) || plan.answers.length>4 ||
      (plan.stage!=='check' && plan.answers.length)) return false;
  const matches = id=>Number.isInteger(id) && bank[id]?.skill===plan.skill &&
    difficulty(bank[id])===plan.band;
  const choice = entry=>entry && [0,1,2,3].includes(entry.choice);
  return plan.itemIds.every(id=>matches(id) && availableForPlacement(bank[id])) &&
    plan.baseline.every(entry=>choice(entry) && matches(entry.id)) &&
    new Set([...plan.itemIds,...plan.baseline.map(entry=>entry.id)]).size===4+plan.baseline.length &&
    plan.answers.every((entry,index)=>choice(entry) && entry.id===plan.itemIds[index]);
}

function planStage(plan,now) {
  if (!plan) return 'none';
  if (plan.stage!=='check') return plan.stage;
  if (plan.answers.length===plan.itemIds.length) return 'complete';
  return now>=plan.readyAt?'ready':'waiting';
}

function advancePlan(plan,now) {
  if (plan?.stage==='review') return {...plan,stage:'practice'};
  if (plan?.stage==='practice') return {...plan,stage:'check',readyAt:now+studyCheckDelay};
  return plan;
}

function gradePlan(plan,id,choice,now) {
  if (planStage(plan,now)!=='ready' || id!==plan.itemIds[plan.answers.length] ||
      ![0,1,2,3].includes(choice)) return plan;
  return {...plan,answers:[...plan.answers,{id,choice}]};
}

function compareStudyPlan(plan) {
  const counts = list=>({correct:list.filter(entry=>entry.choice===0).length,total:list.length});
  return {before:counts(plan.baseline),after:counts(plan.answers)};
}
