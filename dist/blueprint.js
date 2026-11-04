// The reporting taxonomy is independent of the question and resource catalogs.
const assessmentBlueprint = {
  version: 1,
  bands: [
    {id:'foundation',label:'Foundations',scale:'foundation'},
    ...[5,4,3,2,1].map(level=>({id:'n'+level,label:'N'+level,scale:'jlpt-aligned'})),
    {id:'advanced',label:'Beyond the N1 boundary',scale:'extension'}
  ],
  domains: [
    {id:'foundations',label:'Foundations',scale:'foundation',skills:[
      ['hiragana','Hiragana'],['katakana','Katakana'],['sound-spelling','Sound and spelling']
    ]},
    {id:'knowledge',label:'Language knowledge',scale:'jlpt-aligned',skills:[
      ['vocabulary','Vocabulary',0],['kanji-reading','Kanji readings',1],
      ['particles','Particles',2],['word-forms','Word forms',3],
      ['sentence-patterns','Sentence patterns',4],['expressions','Expressions',5],
      ['orthography','Orthography'],['word-formation','Word formation'],
      ['lexical-usage','Vocabulary in context'],['paraphrase','Paraphrase'],
      ['sentence-composition','Sentence composition'],['text-grammar','Text grammar']
    ]},
    {id:'reading',label:'Reading',scale:'jlpt-aligned',skills:[
      ['reading-detail','Explicit information'],['reading-gist','Main idea'],
      ['reading-inference','Inference and intent'],['reading-retrieval','Information retrieval'],
      ['reading-integration','Integrating sources']
    ]},
    {id:'listening',label:'Listening',scale:'jlpt-aligned',skills:[
      ['listening-task','Task and next action'],['listening-detail','Key details'],
      ['listening-gist','Main idea'],['listening-response','Appropriate response'],
      ['listening-integration','Integrating information']
    ]},
    {id:'speaking',label:'Speaking',scale:'extension',skills:[
      ['speaking-interaction','Interaction'],['speaking-production','Spoken production'],
      ['pronunciation','Pronunciation and intelligibility']
    ]},
    {id:'writing',label:'Writing',scale:'extension',skills:[
      ['writing-task','Task completion'],['writing-coherence','Coherence'],
      ['writing-register','Register and accuracy']
    ]}
  ]
};

function assessmentCoverage(placement, bank) {
  const observed = new Map();
  for (const entry of placement) {
    const q = bank[entry.id];
    if (!q || entry.choice===null) continue;
    observed.set(q.skill,(observed.get(q.skill)??0)+1);
  }
  const supported = new Set(bank.map(q=>q.skill));
  return assessmentBlueprint.domains.map(domain=>({
    ...domain,
    skills: domain.skills.map(([id,label,legacy])=>{
      const answers = observed.get(legacy)??0;
      return {
        id,label,answers,
        status:!supported.has(legacy)?'unavailable':answers<2?'needs-evidence':'sampled'
      };
    })
  }));
}
