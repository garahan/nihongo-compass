// Run from the repo root. Optional argument is an earlier engine.js for comparison.
const fs = require('node:fs');
const vm = require('node:vm');
const files = [...fs.readFileSync('dist/index.html','utf8').matchAll(/<script defer src="([^"]+)"/g)]
  .map(match=>match[1]).filter(name=>name!=='app.js');
const simulation = `
function rng(seed) {
  return ()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
}
for (const scenario of ['even','uneven','noisy']) {
  const checkpoints = [{n:12,error:0,covered:0,skills:0},{n:24,error:0,covered:0,skills:0}];
  for (const ability of bands) {
    for (let trial=0;trial<60;trial++) {
      const random = rng(10231+ability*101+trial*19);
      const chooseRandom = rng(51917+ability*109+trial*23);
      const answers = [];
      for (let i=1;i<=24;i++) {
        const q = chooseQuestion(answers,chooseRandom);
        const variation = scenario==='uneven' ? [-1,1,-.75,.75,-.5,.5][(q.skill+trial)%6] : 0;
        const abilityForSkill = Math.max(0,Math.min(5,ability+variation));
        const difficultyNoise = scenario==='noisy' ? (random()-.5)*1.3 : 0;
        const probability = chanceOfCorrect(abilityForSkill,difficulty(q)+(q.offset??0)+difficultyNoise);
        const skipped = random()<(scenario==='noisy'?.12:.03);
        answers.push({id:q.id,choice:skipped?null:random()<probability?0:1,seconds:null});
        const point = checkpoints.find(row=>row.n===i);
        if (!point) continue;
        const result = assess(answers);
        point.error += Math.abs(result.overall.band-ability);
        point.covered += ability>=result.overall.range[0] && ability<=result.overall.range[1];
        point.skills += result.skill.filter(row=>row.n>=2).length;
      }
    }
  }
  console.log(scenario,checkpoints.map(point=>({
    questions:point.n,meanBandError:(point.error/360).toFixed(2),
    modelRangeCoverage:(point.covered/360).toFixed(2),sampledSkills:(point.skills/360).toFixed(2)
  })));
}
`;
for (const [name,override] of process.argv[2]?[['baseline',process.argv[2]],['current']]:[['current']]) {
  console.log(name);
  const source = files.map(file=>fs.readFileSync(file==='engine.js'&&override?override:'dist/'+file,'utf8')).join('\n');
  vm.runInNewContext(source+'\n'+simulation,{console});
}
