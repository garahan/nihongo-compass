const fs = require('node:fs');
const topics = require('../seeds/compass-n3.cjs');

function choices(encoded,rotation) {
  const options = encoded.split('|');
  if (options.length!==4 || new Set(options).size!==4 || options.some(x=>!x.trim())) {
    throw new Error('Expected four distinct choices: '+encoded);
  }
  return {o:[...options.slice(rotation),...options.slice(0,rotation)],c:(4-rotation)%4,a:options[0]};
}

const bankRows = [];
const lessons = topics.map(([topic,topicEn,explanation,examples,vocab,first,second,reading,listening,extraVocabulary],index)=>{
  const lesson = 'compass-n3-'+(index+1);
  const grammarId = lesson+'-grammar';
  const questions = [first,second].map(([s,encoded],position)=>{
    const id = lesson+'-q'+(position+1);
    const answer = choices(encoded,(index+position+1)%4);
    bankRows.push({
      sourceId:id,level:3,skill:topic==='ようとする'?3:4,prompt:s,
      options:[answer.a,...answer.o.filter((_,i)=>i!==answer.c)],
      why:explanation,offset:.12,family:grammarId,lessonId:lesson,topicId:grammarId
    });
    return {id,s,...answer,exp:explanation,linksTo:grammarId};
  });
  const [passage,readingQuestion,readingChoices] = reading;
  const [audioText,listeningQuestion,listeningChoices] = listening;
  return {
    lesson,topic,topicEn,level:'N3',
    vocabulary:[vocab,...extraVocabulary].map(([word,reading,meaning],i)=>({id:lesson+'-v'+(i+1),word,reading,meaning})),
    grammar:[{id:grammarId,point:topic,explanation,examples,production:'Write an original sentence using '+topic+' and check whether it fits the intended meaning.'}],
    kanji:[],
    reading:{title:'Short passage',passage,questions:[{
      id:lesson+'-reading',q:readingQuestion,...choices(readingChoices,index%4),
      exp:'The passage supports this answer. Reread the sentence that provides the evidence.'
    }]},
    listening:[{
      id:lesson+'-listening',audioText,q:listeningQuestion,...choices(listeningChoices,(index+2)%4),
      exp:'The answer follows from the dialogue. Check the speaker’s second line.'
    }],
    questions
  };
});
fs.writeFileSync('dist/compass-n3-lessons.json',JSON.stringify(lessons)+'\n');
fs.writeFileSync('dist/compass-n3-bank.js',
  'const compassN3Topics = '+JSON.stringify(Object.fromEntries(lessons.map(l=>[l.lesson,l.topicEn])))+';\n'+
  'const compassN3Bank = '+JSON.stringify(bankRows)+';\n'+
  'for (const row of compassN3Bank) bank.push({...row,id:bank.length});\n');
console.log(lessons.length+' N3 lessons, '+bankRows.length+' linked placement items');
