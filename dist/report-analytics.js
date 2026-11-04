const reportCategories = [
  {name:'Vocabulary',ids:[0]},
  {name:'Kanji readings',ids:[1]},
  {name:'Grammar',ids:[2,3,4]},
  {name:'Expressions',ids:[5]}
];

function summarizeReport(state) {
  const {skill,reference,overall,placement} = state;
  const categories = reportCategories.map(category=>{
    const measured = category.ids.filter(id=>skill[id].n>=2);
    const answers = category.ids.reduce((sum,id)=>sum+skill[id].n,0);
    const readiness = measured.length ?
      measured.reduce((sum,id)=>sum+skill[id].readiness,0)/measured.length : null;
    return {...category,measured,answers,readiness};
  });
  const target = chanceOfCorrect(reference,reference);
  const focus = skill.map((row,id)=>{
    const attempts = placement.filter(entry=>entry.choice!==null && bank[entry.id].skill===id);
    const nearby = attempts.filter(entry=>Math.abs(difficulty(bank[entry.id])-reference)<=1);
    const missed = nearby.filter(entry=>entry.choice!==0).length;
    const score = (missed/(nearby.length+2)) *
      (1+Math.max(0,target-row.readiness));
    return {id,attempted:nearby.length,missed,score};
  }).filter(row=>row.attempted>=2 && row.missed>0)
    .sort((a,b)=>b.score-a.score || b.missed-a.missed || a.id-b.id)[0]??null;
  const levels = bands.map(band=>{
    const exact = overall.weights[band]*100;
    return {band,percent:Math.floor(exact),remainder:exact%1,selected:overall.band===band};
  });
  const missing = 100-levels.reduce((sum,row)=>sum+row.percent,0);
  // Allocate rounding remainders so the displayed distribution adds to 100%.
  for (const row of [...levels].sort((a,b)=>b.remainder-a.remainder).slice(0,missing)) row.percent++;
  return {categories,focus,levels};
}
