const bands = [0,1,2,3,4,5];
const difficulty = question => 6-question.level;
const label = band => band === 0 ? 'Below N5' : 'N' + (6-band);
const availableForPlacement = question => !question.practiceOnly && !isTransferItem(question.id);

function chanceOfCorrect(ability, level) {
  return .25 + .70 / (1 + Math.exp((level-ability)*1.8));
}

// Six overall bands and six possible ability bands per skill. Conditional on
// overall ability, the skill likelihoods factor, so no 6^6 grid is needed.
const mean = (weights,values) => weights.reduce((sum,w,i)=>sum+w*values[i],0);
const normalize = values => {
  const sum = values.reduce((a,b)=>a+b,0);
  return values.map(value=>value/sum);
};
function medianBand(weights) {
  let cumulative = 0;
  return bands.find(band=>(cumulative+=weights[band])>=.5) ?? bands.at(-1);
}

function bandRisk(weights) {
  const center = medianBand(weights);
  return mean(weights,bands.map(band=>Math.abs(band-center)));
}

function bandRiskReduction(weights, probabilities, priorRisk) {
  const correct = weights.map((weight,band)=>weight*probabilities[band]);
  const wrong = weights.map((weight,band)=>weight*(1-probabilities[band]));
  const chance = correct.reduce((sum,weight)=>sum+weight,0);
  return Math.max(0,priorRisk-chance*bandRisk(normalize(correct))-
    (1-chance)*bandRisk(normalize(wrong)));
}
const skillPrior = bands.map(overall=>normalize(bands.map(skill=>
  Math.exp(-.5*((skill-overall)/1.15)**2))));
const predictions = bands.map(level=>bands.map(ability=>chanceOfCorrect(ability,level)));
const itemCurves = bank.map(question=>{
  const center = difficulty(question)+(question.offset??0);
  const uncertainty = question.sourceId ? .65 : .45;
  // Average over plausible difficulties because these items have editorial
  // level tags and no empirical calibration yet.
  return bands.map(ability=>mean([.25,.5,.25],[-uncertainty,0,uncertainty]
    .map(delta=>chanceOfCorrect(ability,center+delta))));
});

function credibleRange(weights, mass=.8) {
  let range = [0,bands.length-1];
  let bestMass = 0;
  for (const low of bands) {
    let sum = 0;
    for (let high=low; high<bands.length; high++) {
      sum += weights[high];
      if (sum<mass) continue;
      const span = high-low;
      const bestSpan = range[1]-range[0];
      if (span<bestSpan || (span===bestSpan && sum>bestMass)) {
        range = [low,high];
        bestMass = sum;
      }
      break;
    }
  }
  return range;
}

function assess(attempts, forRouting = false) {
  const taught = new Set();
  const taughtImported = new Set();
  const practice = [];
  const placement = [];
  const evidenceBySkill = skills.map(()=>[]);
  for (const entry of attempts) {
    const q = bank[entry.id];
    if (q.practiceOnly || (q.concept && taught.has(q.concept)) ||
        (q.sourceId && taughtImported.has(q.family))) practice.push(entry);
    else {
      placement.push(entry);
      evidenceBySkill[q.skill].push(entry);
    }
    if (q.concept) taught.add(q.concept);
    if (q.sourceId && q.family) taughtImported.add(q.family);
  }

  // Skips guide routing, but a missing answer cannot lower the reported level.
  const likelihoods = evidenceBySkill.map(evidence=>{
    const families = new Map();
    const weighted = evidence.filter(entry=>forRouting || entry.choice!==null).map(entry=>{
      const family = bank[entry.id].family;
      const count = family ? families.get(family)??0 : 0;
      if (family) families.set(family,count+1);
      // Later items sharing distractors contribute less independent evidence.
      return {entry,weight:(entry.choice===null?.55:1)/(1+count)};
    });
    const log = bands.map(ability=>weighted.reduce((sum,{entry,weight})=>{
      const p = itemCurves[entry.id][ability];
      return sum+weight*Math.log(entry.choice===0?p:1-p);
    },0));
    const max = Math.max(...log);
    return log.map(value=>Math.exp(value-max));
  });
  const evidenceByOverall = likelihoods.map(likelihood=>
    skillPrior.map(prior=>mean(prior,likelihood)));
  const weights = normalize(bands.map(band=>
    evidenceByOverall.reduce((product,evidence)=>product*evidence[band],1)));
  const band = medianBand(weights);
  const overall = {band,weights,range:credibleRange(weights)};
  const reference = Math.max(1,band);
  const skill = likelihoods.map((likelihood,id)=>{
    const conditional = skillPrior.map((prior,overallBand)=>prior.map((w,ability)=>
      w*likelihood[ability]/evidenceByOverall[id][overallBand]));
    const marginal = bands.map(ability=>mean(weights,conditional.map(row=>row[ability])));
    const evidence = evidenceBySkill[id];
    return {
      n:evidence.filter(entry=>entry.choice!==null).length,
      right:evidence.filter(entry=>entry.choice===0).length,
      readiness:mean(marginal,predictions[reference]),
      weights:marginal,
      conditional
    };
  });
  const chosen = placement.filter(entry=>entry.choice!==null);
  const covered = skill.filter(row=>row.n>=2).length;
  const near = chosen.filter(entry=>Math.abs(difficulty(bank[entry.id])-reference)<=1).length;
  const sufficient = chosen.length>=12 && covered>=4 && near>=4;
  const focused = sufficient && overall.range[0]===overall.range[1];
  const quality = {chosen:chosen.length,covered,near,sufficient,focused};
  return {overall,reference,placement,practice,taught,taughtImported,skill,quality};
}

function binaryEntropy(p) {
  return p>0 && p<1 ? -p*Math.log2(p)-(1-p)*Math.log2(1-p) : 0;
}

function information(weights, probabilities) {
  // Mutual information in bits: entropy of the predicted answer minus
  // expected answer entropy given the candidate ability.
  return Math.max(0,binaryEntropy(mean(weights,probabilities))-
    mean(weights,probabilities.map(binaryEntropy)));
}

function chooseQuestion(attempts, random = Math.random, reserved = new Set()) {
  const state = assess(attempts,true);
  const seen = new Set(attempts.map(entry=>entry.id));
  const last = attempts.at(-1);
  const previous = last ? difficulty(bank[last.id]) : 3;
  const recent = state.placement.slice(-3);
  const streak = recent.length===3 && recent.every(entry=>entry.choice===0);
  const misses = recent.filter(entry=>entry.choice!==0).length;
  const direction = streak ? previous+1 : misses>=2 ? previous-1 : state.reference;
  const target = attempts.length<2 ? 3 : Math.max(1,Math.min(5,previous+1,Math.max(previous-1,direction)));
  const lastQuestion = last && bank[last.id];
  const comparable = lastQuestion ? attempts.slice(-14,-1).filter(entry=>{
    const q = bank[entry.id];
    return q.skill===lastQuestion.skill && Math.abs(difficulty(q)-previous)<=1 && entry.seconds>0;
  }).map(entry=>entry.seconds).sort((a,b)=>a-b) : [];
  const median = comparable.length>=3 ? comparable[Math.floor(comparable.length/2)] : null;
  const hesitant = last?.choice===0 && median && last.seconds>Math.max(10,median*1.6);
  const quick = last?.choice===0 && streak && median && last.seconds>=1 && last.seconds<median*.7;
  const conceptMisses = lastQuestion?.concept ? attempts.filter(entry=>
    bank[entry.id].concept===lastQuestion.concept && entry.choice!==0).length : 0;
  const probeConcept = conceptMisses>=2 ? concepts[lastQuestion.concept].prerequisite : null;
  const allowProbe = attempts.length>=3 && !state.practice.includes(attempts.at(-2));
  const stable = state.quality.focused;
  const priorRisk = bandRisk(state.overall.weights);
  const recentFamilies = new Set(attempts.slice(-8).map(entry=>bank[entry.id].family).filter(Boolean));
  const gains = new Map();
  let best;
  let highest = -Infinity;
  for (const q of bank) {
    if (seen.has(q.id) || reserved.has(q.id) || !availableForPlacement(q)) continue;
    const level = difficulty(q);
    const isPractice = state.taught.has(q.concept) ||
      (q.sourceId && state.taughtImported.has(q.family));
    const gap = state.skill[q.skill];
    const curveKey = `${q.skill}:${level}:${q.offset??0}:${Boolean(q.sourceId)}`;
    if (!gains.has(curveKey)) {
      const p = itemCurves[q.id];
      const overallProbabilities = gap.conditional.map(row=>mean(row,p));
      gains.set(curveKey,{
        overall:information(state.overall.weights,overallProbabilities),
        decision:bandRiskReduction(state.overall.weights,overallProbabilities,priorRisk),
        skill:information(gap.weights,p)
      });
    }
    const gain = gains.get(curveKey);
    const sameConcept = q.concept && q.concept===lastQuestion?.concept;
    const probe = allowProbe && (last?.choice!==0 || hesitant) && level<=previous &&
      (q.concept===probeConcept || sameConcept);
    const contrast = last && locationMisconception(last) && locationConcepts.has(q.concept) &&
      q.concept!==lastQuestion.concept && !isPractice;
    const score = attempts.length<2 ? -2*Math.abs(level-3)-gap.n :
      (isPractice ? 0 : (stable?2:4)*gain.overall + (stable?3:1.5)*gain.skill +
        (stable?1:4)*gain.decision) +
      .42/(1+gap.n) - .22*Math.abs(level-target) -
      (recentFamilies.has(q.family) ? .8 : 0) -
      (q.sourceId ? .08 : 0) -
      (isPractice ? .7 : 0) + (probe ? 1.05 : 0) + (contrast ? 1.2 : 0) +
      (quick && level===previous+1 ? .15 : 0);
    const tieBroken = score+random()*.04;
    if (tieBroken>highest) {
      highest = tieBroken;
      best = q;
    }
  }
  return best;
}

function studyPriority(state) {
  const placementMisses = state.placement.filter(entry=>entry.choice!==0);
  const specific = placementMisses.filter(entry=>bank[entry.id].concept)
    .map(entry=>{
      const q = bank[entry.id];
      const related = state.practice.filter(next=>bank[next.id].concept===q.concept);
      const repeated = related.filter(next=>next.choice!==0).length;
      return {q,repeated,recovered:related.length>0 && repeated===0};
    })
    .filter(row=>!row.recovered)
    .sort((a,b)=>b.repeated-a.repeated || Math.abs(difficulty(a.q)-state.reference)-Math.abs(difficulty(b.q)-state.reference));
  const weakest = state.skill.map((row,id)=>({...row,id}))
    .filter(row=>row.n>=2 && row.right<row.n)
    .sort((a,b)=>a.readiness-b.readiness)[0];
  if (specific[0]?.repeated) return {concept:specific[0].q.concept,repeated:true};
  if (weakest) {
    const matching = specific.find(row=>row.q.skill===weakest.id);
    return matching ? {concept:matching.q.concept,repeated:false} : {skill:weakest.id};
  }
  if (specific.length) return {concept:specific[0].q.concept,repeated:false};
  return null;
}
