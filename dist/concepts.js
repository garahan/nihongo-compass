const concepts = {
  'action-place': { title:'Where an action happens', lesson:'Use で for the location of an action. Contrast it with に for the location of something that exists.', route:'grammar' },
  'existence-place': { title:'Where something exists', lesson:'Use に for the location with ある or いる. Use が to mark the thing or person that exists.', route:'grammar' },
  'te-form': { title:'Verb て-form', lesson:'Group verbs by their dictionary-form endings and practice the corresponding て-form sound changes.', route:'conjugation' },
  'permission': { title:'Permission with てもいい', lesson:'Use the verb’s て-form plus もいい for permission. Review て-form first if the verb ending is the problem.', route:'grammar', prerequisite:'te-form' },
  'causative': { title:'Causative forms', lesson:'Practice forming the causative, then use it in sentences where someone makes or lets another person act.', route:'conjugation' },
  'expectation': { title:'Expectation with はず', lesson:'Use はず when you expect a result based on evidence. Contrast it with つもり for an intention.', route:'grammar' }
};

const tags = {4:'action-place',18:'te-form',20:'permission',30:'causative',33:'expectation'};
for (const [id,concept] of Object.entries(tags)) bank[id].concept = concept;

// Append items so previously saved question IDs keep their meaning.
const followups = [
  [5,2,'action-place','公園 ___ サッカーをします。 (I play soccer in the park.)','で|に|を|の','で marks where an activity takes place.'],
  [5,2,'action-place','台所 ___ 晩ご飯を作ります。 (I make dinner in the kitchen.)','で|に|へ|が','Use で for the place where you make dinner.'],
  [5,2,'existence-place','机の下 ___ 猫がいます。 (There is a cat under the desk.)','に|で|を|と','The place where the cat exists is marked by に.'],
  [5,2,'existence-place','かばんの中 ___ 財布があります。 (There is a wallet in the bag.)','に|で|を|は','The location of something that exists is marked by に.'],
  [5,2,'existence-place','駅の前 ___ 銀行があります。 (There is a bank in front of the station.)','に|で|を|と','に marks the location with あります.'],
  [4,3,'te-form','Choose the て-form of 待つ.','待って|待いて|待んで|待つて','Godan verbs ending in つ take って.'],
  [4,3,'te-form','Choose the て-form of 遊ぶ.','遊んで|遊びて|遊って|遊いで','Godan verbs ending in ぶ take んで.'],
  [4,4,'permission','Choose “May I sit here?”','ここに座ってもいいですか|ここに座ってはいけませんか|ここに座らなくてもいいですか|ここに座ったことがありますか','〜てもいいですか asks for permission.'],
  [4,4,'permission','この辞書を使っ ___。 (You can use this dictionary.)','てもいいですよ|てはいけません|たことがあります|たばかりです','〜てもいい gives permission.'],
  [3,3,'causative','Choose the causative form of 飲む.','飲ませる|飲まれる|飲める|飲んでいる','For a godan verb, use the a-row stem plus せる.'],
  [3,3,'causative','Choose the causative form of 起きる.','起きさせる|起きられる|起こされる|起きている','For an ichidan verb, replace る with させる.'],
  [3,4,'expectation','もう発送したので、明日届く ___ です。 (It has shipped, so it should arrive tomorrow.)','はず|つもり|たび|ため','はず expresses an expectation based on evidence.'],
  [3,4,'expectation','彼女は地図を持っているから、道が分かる ___ だ。 (She has a map, so she should know the way.)','はず|つもり|こと|ため','はず signals a reasonable expectation.']
];
for (const [level,skill,concept,prompt,options,why] of followups) {
  bank.push({id:bank.length,level,skill,concept,prompt,options:options.split('|'),why});
}
