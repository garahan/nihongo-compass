// Corrections keyed by the upstream question ID. Raw seed files retain provenance.
const mahymErrata = {
  N5L5q7:{distractors:['しいです','しくないです','しくなかったです'], prompt:'旅行は楽___。(polite affirmative past)'},
  N5L6q3:{prompt:'今日は勉強し___。(Use the です form to say “I don’t want to study today.”)',correct:'たくないです',distractors:['たいです','たかったです','たくありません']},
  L26q5:{correct:'to break down (machine)'},
  L28q3:{prompt:'貿易の会社で働い___。(Use 〜ている for an ongoing occupation.)'},
  L28q7:{prompt:'毎朝ジョギングを___。(Use 〜ている for an ongoing habit.)'},
  L29q8:{prompt:'宿題を全部___。(Use 〜てしまう to emphasize completion.)'},
  L31q8:{prompt:'毎日30分歩く___。(Express a personal intention with つもり.)'},
  L32q3:{prompt:'あした、晴れる___。(Use でしょう to express a stronger guess than かもしれません.)'},
  L33q7:{prompt:'Choose the everyday imperative form of する.',distractors:['しよう','すれ','しえ']},
  L34q4:{distractors:['ないのに','たあとで','ながら']},
  L34q7:{distractors:['ないのに','たあとで','とおりに']},
  L35q8:{prompt:'暇___、手伝ってください。(Use the なら conditional.)'},
  L36q8:{prompt:'お酒を飲ま___なりました。(I stopped drinking.)',correct:'なく',distractors:['ない','なかった','なければ']},
  L37q8:{distractors:['降りました','降らせました','降りませんでした']},
  L38q1:{prompt:'本を読む___が好きです。(Use the nominalizer の for “I like reading.”)',distractors:['まで','だけで','ために']},
  L38q4:{distractors:['のを','のに','ので']},
  L38q7:{distractors:['のを','のに','ので']},
  L39q1:{prompt:'ニュースを聞い___、びっくりしました。(Use the て-form to link the reaction.)'},
  L40q1:{distractors:['かが','ことが','ように']},
  L41q8:{prompt:'毎朝、犬を散歩に連れて行っ___。(Use やる as the familiar benefactive form.)',distractors:['てもらいます','てくれます','ていただきます']},
  L42q3:{prompt:'このはさみは布を切る___使います。(Use 〜のに to describe what the tool is used for.)',distractors:['ようで','そうで','ので']},
  L43q8:{distractors:['ないそう','なそう','なかろう']},
  L47q3:{prompt:'電気がついているから、家にいる___。(Use ようだ for an inference from the light.)'},
  L47q7:{prompt:'道がぬれている。雨が降った___。(Use ようだ for an inference from evidence.)'},
  L49q7:{prompt:'Choose the special honorific verb なさる in its polite form.',distractors:['いたします','されます','なされました']},
  L50q4:{prompt:'ロビーでお待ちし___。(Use the humble form of 〜ている.)'},
  L50q8:{prompt:'こちらが受付___。(Use ございます for the formal copula.)'},
  L56q5:{distractors:['たっせん','とうせん','しょうせん']},
  L59q5:{distractors:['とうせつ','じかせつ','ちょくぜつ']}
};

function correctMahym(id,prompt,options,correctIndex) {
  const fix = mahymErrata[id];
  if (!fix) return {prompt,options,correctIndex};
  const correct = fix.correct??options[correctIndex];
  return {
    prompt:fix.prompt??prompt,
    options:[correct,...(fix.distractors??options.filter((_,index)=>index!==correctIndex))],
    correctIndex:0
  };
}
