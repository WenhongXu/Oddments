import db from './database.js';

// Only seed if question pool is empty
const count = db.prepare('SELECT COUNT(*) as cnt FROM question_pool').get();
if (count.cnt > 0) {
  console.log('Question pool already seeded, skipping.');
  process.exit(0);
}

const questions = [
  // BODY - 身体 (12 questions)
  { dimension: 'BODY', question_text: '今天的身体整体状态如何？', question_type: 'scale', config: { min: 1, max: 5, label: '1=很差, 5=极好' } },
  { dimension: 'BODY', question_text: '昨晚睡了多少小时？', question_type: 'number', config: { unit: '小时', min: 0, max: 12 } },
  { dimension: 'BODY', question_text: '今天有没有进行身体活动或锻炼？', question_type: 'yesno', config: {} },
  { dimension: 'BODY', question_text: '今天锻炼持续了多长时间？', question_type: 'number', config: { unit: '分钟', min: 0, max: 300 } },
  { dimension: 'BODY', question_text: '今天身体有哪些值得关注的感受？', question_type: 'text', config: { placeholder: '简单描述一下...' } },
  { dimension: 'BODY', question_text: '这周整体体能水平如何？', question_type: 'scale', config: { min: 1, max: 5, label: '1=很差, 5=极好' } },
  { dimension: 'BODY', question_text: '今天醒来的第一感受是？', question_type: 'choice', config: { options: ['精力充沛', '还可以', '有点疲倦', '很疲倦'] } },
  { dimension: 'BODY', question_text: '今天有没有做拉伸或放松运动？', question_type: 'yesno', config: {} },
  { dimension: 'BODY', question_text: '你有没有注意到身体发出的某个信号或变化？', question_type: 'text', config: { placeholder: '如有请描述...' } },
  { dimension: 'BODY', question_text: '这周运动了几次？', question_type: 'number', config: { unit: '次', min: 0, max: 14 } },
  { dimension: 'BODY', question_text: '你对当前体能状态满意吗？', question_type: 'scale', config: { min: 1, max: 5, label: '1=很不满意, 5=非常满意' } },
  { dimension: 'BODY', question_text: '这周睡眠质量的整体评价？', question_type: 'scale', config: { min: 1, max: 5, label: '1=很差, 5=极好' } },

  // DIET - 饮食 (12 questions)
  { dimension: 'DIET', question_text: '今天吃了几餐正餐？', question_type: 'number', config: { unit: '餐', min: 0, max: 5 } },
  { dimension: 'DIET', question_text: '今天三餐是否按时进行？', question_type: 'scale', config: { min: 1, max: 5, label: '1=完全无规律, 5=非常规律' } },
  { dimension: 'DIET', question_text: '今天吃了多少温热的食物？', question_type: 'choice', config: { options: ['全部温热', '大部分温热', '冷热各半', '大部分冷食', '全部冷食'] } },
  { dimension: 'DIET', question_text: '今天喝水量足够吗？', question_type: 'scale', config: { min: 1, max: 5, label: '1=完全不够, 5=非常充足' } },
  { dimension: 'DIET', question_text: '今天有没有吃蔬菜和水果？', question_type: 'yesno', config: {} },
  { dimension: 'DIET', question_text: '今天早餐的质量如何？', question_type: 'scale', config: { min: 1, max: 5, label: '1=没吃/很差, 5=很好' } },
  { dimension: 'DIET', question_text: '这周有没有暴饮暴食的情况？', question_type: 'yesno', config: {} },
  { dimension: 'DIET', question_text: '今天有没有吃夜宵（晚10点后）？', question_type: 'yesno', config: {} },
  { dimension: 'DIET', question_text: '这周饮食规律的整体评价？', question_type: 'scale', config: { min: 1, max: 5, label: '1=很差, 5=极好' } },
  { dimension: 'DIET', question_text: '今天最满意的一餐是什么？', question_type: 'text', config: { placeholder: '简单描述...' } },
  { dimension: 'DIET', question_text: '今天有没有饮酒？', question_type: 'yesno', config: {} },
  { dimension: 'DIET', question_text: '这周有没有为自己准备过一顿健康的饭菜？', question_type: 'yesno', config: {} },

  // MIND - 心理 (12 questions)
  { dimension: 'MIND', question_text: '今天的情绪整体状态如何？', question_type: 'scale', config: { min: 1, max: 5, label: '1=很糟糕, 5=非常好' } },
  { dimension: 'MIND', question_text: '今天有没有感到焦虑或担忧？', question_type: 'yesno', config: {} },
  { dimension: 'MIND', question_text: '你今天的压力水平如何？', question_type: 'scale', config: { min: 1, max: 5, label: '1=压力极大, 5=非常轻松' } },
  { dimension: 'MIND', question_text: '今天有没有发现自己在反复想同一件事？', question_type: 'yesno_text', config: { placeholder: '是什么事？' } },
  { dimension: 'MIND', question_text: '这周你对自己的整体满意度？', question_type: 'scale', config: { min: 1, max: 5, label: '1=很不满意, 5=非常满意' } },
  { dimension: 'MIND', question_text: '今天有没有感受到"心流"状态（全神贯注、时间飞逝）？', question_type: 'yesno', config: {} },
  { dimension: 'MIND', question_text: '今天面对的最大挑战是什么，你是如何处理的？', question_type: 'text', config: { placeholder: '简单描述...' } },
  { dimension: 'MIND', question_text: '你觉得今天的自己和真实的自己有多接近？', question_type: 'scale', config: { min: 1, max: 5, label: '1=完全不像, 5=高度一致' } },
  { dimension: 'MIND', question_text: '写下一个你今天做出的正确判断或决定', question_type: 'text', config: { placeholder: '写下来...', is_confidence: true } },
  { dimension: 'MIND', question_text: '今天有没有刻意进行积极自我对话？', question_type: 'yesno', config: {} },
  { dimension: 'MIND', question_text: '你今天的专注力如何？', question_type: 'scale', config: { min: 1, max: 5, label: '1=完全无法专注, 5=高度专注' } },
  { dimension: 'MIND', question_text: '这周整体心理状态评价？', question_type: 'scale', config: { min: 1, max: 5, label: '1=很差, 5=极好' } },

  // CAREER - 职业 (12 questions)
  { dimension: 'CAREER', question_text: '今天的工作效率如何？', question_type: 'scale', config: { min: 1, max: 5, label: '1=很低, 5=极高' } },
  { dimension: 'CAREER', question_text: '今天完成了哪些有价值的工作成果？', question_type: 'text', config: { placeholder: '列举1-3项...', is_confidence: true } },
  { dimension: 'CAREER', question_text: '今天有没有学到新知识或技能？', question_type: 'yesno', config: {} },
  { dimension: 'CAREER', question_text: '这周对工作的满意度如何？', question_type: 'scale', config: { min: 1, max: 5, label: '1=很不满意, 5=非常满意' } },
  { dimension: 'CAREER', question_text: '今天有没有拖延重要的事情？', question_type: 'yesno', config: {} },
  { dimension: 'CAREER', question_text: '今天花了多少时间在学习或能力提升上？', question_type: 'number', config: { unit: '分钟', min: 0, max: 480 } },
  { dimension: 'CAREER', question_text: '这周有没有推进长期职业目标？', question_type: 'yesno', config: {} },
  { dimension: 'CAREER', question_text: '你对现在的职业方向清晰程度如何？', question_type: 'scale', config: { min: 1, max: 5, label: '1=完全迷茫, 5=非常清晰' } },
  { dimension: 'CAREER', question_text: '今天工作中最大的挑战是什么？', question_type: 'text', config: { placeholder: '描述一下...' } },
  { dimension: 'CAREER', question_text: '这周的工作状态整体评价？', question_type: 'scale', config: { min: 1, max: 5, label: '1=很差, 5=极好' } },
  { dimension: 'CAREER', question_text: '今天有没有完成一件之前一直拖着的事？', question_type: 'yesno', config: {} },
  { dimension: 'CAREER', question_text: '你对未来三个月职业规划的清晰程度？', question_type: 'scale', config: { min: 1, max: 5, label: '1=完全模糊, 5=非常清晰' } },

  // RELATION - 关系 (12 questions)
  { dimension: 'RELATION', question_text: '今天和谁有过深度对话？', question_type: 'text', config: { placeholder: '描述一下（或填"无"）...' } },
  { dimension: 'RELATION', question_text: '这周社交质量整体评价？', question_type: 'scale', config: { min: 1, max: 5, label: '1=很差, 5=极好' } },
  { dimension: 'RELATION', question_text: '今天有没有主动联系朋友或关心他人？', question_type: 'yesno', config: {} },
  { dimension: 'RELATION', question_text: '你现在的友情让你感到满足吗？', question_type: 'scale', config: { min: 1, max: 5, label: '1=很不满足, 5=非常满足' } },
  { dimension: 'RELATION', question_text: '今天有没有感受到被人理解或支持？', question_type: 'yesno', config: {} },
  { dimension: 'RELATION', question_text: '这周有没有一段让你感觉充电而非消耗的对话？', question_type: 'yesno', config: {} },
  { dimension: 'RELATION', question_text: '你对当前亲密关系的满意度如何？', question_type: 'scale', config: { min: 1, max: 5, label: '1=很不满意, 5=非常满意' } },
  { dimension: 'RELATION', question_text: '今天有没有主动表达感谢或肯定别人？', question_type: 'yesno', config: {} },
  { dimension: 'RELATION', question_text: '这周你有没有做过界限清晰的沟通？', question_type: 'yesno', config: {} },
  { dimension: 'RELATION', question_text: '你觉得身边的人了解真实的你吗？', question_type: 'scale', config: { min: 1, max: 5, label: '1=完全不了解, 5=深度了解' } },
  { dimension: 'RELATION', question_text: '今天有没有发生让你感动的人际互动？', question_type: 'text', config: { placeholder: '描述一下...' } },
  { dimension: 'RELATION', question_text: '这周的社交能量整体评价？', question_type: 'scale', config: { min: 1, max: 5, label: '1=耗尽, 5=充满活力' } },

  // FAMILY - 家庭 (12 questions)
  { dimension: 'FAMILY', question_text: '这周有没有联系家人？', question_type: 'yesno', config: {} },
  { dimension: 'FAMILY', question_text: '今天和家人关系的感受如何？', question_type: 'scale', config: { min: 1, max: 5, label: '1=很紧张, 5=非常和谐' } },
  { dimension: 'FAMILY', question_text: '这周有没有尽到你认为重要的家庭责任？', question_type: 'yesno', config: {} },
  { dimension: 'FAMILY', question_text: '你现在和原生家庭的关系让你感到和谐吗？', question_type: 'scale', config: { min: 1, max: 5, label: '1=很不和谐, 5=非常和谐' } },
  { dimension: 'FAMILY', question_text: '这周在家庭关系上，你做了哪件让自己满意的事？', question_type: 'text', config: { placeholder: '描述一下...', is_confidence: true } },
  { dimension: 'FAMILY', question_text: '今天有没有和家人进行深度交流？', question_type: 'yesno', config: {} },
  { dimension: 'FAMILY', question_text: '你对当前家庭生活状态的整体满意度？', question_type: 'scale', config: { min: 1, max: 5, label: '1=很不满意, 5=非常满意' } },
  { dimension: 'FAMILY', question_text: '这周家庭责任和个人空间的平衡感如何？', question_type: 'scale', config: { min: 1, max: 5, label: '1=严重失衡, 5=非常平衡' } },
  { dimension: 'FAMILY', question_text: '有没有积压的家庭事务需要处理？', question_type: 'yesno_text', config: { placeholder: '是什么事务？' } },
  { dimension: 'FAMILY', question_text: '这周你有没有主动为家人做一件小事？', question_type: 'yesno', config: {} },
  { dimension: 'FAMILY', question_text: '你觉得家人了解并支持你目前的生活方向吗？', question_type: 'scale', config: { min: 1, max: 5, label: '1=完全不支持, 5=非常支持' } },
  { dimension: 'FAMILY', question_text: '今天家庭给你带来了什么感受？', question_type: 'text', config: { placeholder: '一两句话...' } },

  // FINANCE - 财务 (12 questions)
  { dimension: 'FINANCE', question_text: '今天有没有记账？', question_type: 'yesno', config: {} },
  { dimension: 'FINANCE', question_text: '这周有没有冲动消费？', question_type: 'yesno', config: {} },
  { dimension: 'FINANCE', question_text: '这个月的财务安全感如何？', question_type: 'scale', config: { min: 1, max: 5, label: '1=很焦虑, 5=非常安心' } },
  { dimension: 'FINANCE', question_text: '今天的支出在预算范围内吗？', question_type: 'yesno', config: {} },
  { dimension: 'FINANCE', question_text: '这周有没有为储蓄或投资做出行动？', question_type: 'yesno', config: {} },
  { dimension: 'FINANCE', question_text: '你对当前财务状况整体满意吗？', question_type: 'scale', config: { min: 1, max: 5, label: '1=很不满意, 5=非常满意' } },
  { dimension: 'FINANCE', question_text: '这周消费结构是否健康（必要消费为主）？', question_type: 'scale', config: { min: 1, max: 5, label: '1=很不健康, 5=非常健康' } },
  { dimension: 'FINANCE', question_text: '你有没有清晰的月度预算计划？', question_type: 'yesno', config: {} },
  { dimension: 'FINANCE', question_text: '这周有没有因为花钱而感到后悔？', question_type: 'yesno', config: {} },
  { dimension: 'FINANCE', question_text: '你对财务目标的达成进度如何评价？', question_type: 'scale', config: { min: 1, max: 5, label: '1=完全没进展, 5=进展顺利' } },
  { dimension: 'FINANCE', question_text: '今天有没有主动思考过提高收入或减少支出的方式？', question_type: 'yesno', config: {} },
  { dimension: 'FINANCE', question_text: '这个月整体财务状态评价？', question_type: 'scale', config: { min: 1, max: 5, label: '1=很差, 5=极好' } },

  // INNER - 内修 (12 questions)
  { dimension: 'INNER', question_text: '今天有没有练习呼吸或冥想？', question_type: 'yesno_number', config: { unit: '分钟', placeholder: '练习了多少分钟？' } },
  { dimension: 'INNER', question_text: '今天的内心平静程度如何？', question_type: 'scale', config: { min: 1, max: 5, label: '1=非常躁动, 5=非常平静' } },
  { dimension: 'INNER', question_text: '今天有没有花时间独处和自省？', question_type: 'yesno', config: {} },
  { dimension: 'INNER', question_text: '这周内修练习的整体质量如何？', question_type: 'scale', config: { min: 1, max: 5, label: '1=很差, 5=极好' } },
  { dimension: 'INNER', question_text: '今天有没有感受到身心的流动和通畅？', question_type: 'yesno', config: {} },
  { dimension: 'INNER', question_text: '今天有没有做站桩或其他内修练习？', question_type: 'yesno_number', config: { unit: '分钟', placeholder: '练习了多少分钟？' } },
  { dimension: 'INNER', question_text: '这周内修练习的频率如何？', question_type: 'scale', config: { min: 1, max: 5, label: '1=完全没有, 5=每天坚持' } },
  { dimension: 'INNER', question_text: '今天有没有一刻感到真正的宁静？', question_type: 'yesno', config: {} },
  { dimension: 'INNER', question_text: '你觉得自己目前的内在觉察力在提升吗？', question_type: 'scale', config: { min: 1, max: 5, label: '1=退步了, 5=明显提升' } },
  { dimension: 'INNER', question_text: '今天在日常生活中有没有保持觉知状态？', question_type: 'scale', config: { min: 1, max: 5, label: '1=完全忘记, 5=持续觉知' } },
  { dimension: 'INNER', question_text: '这周有没有内在的突破或顿悟？', question_type: 'text', config: { placeholder: '如有，请记录下来...' } },
  { dimension: 'INNER', question_text: '今天的内修练习总时长？', question_type: 'number', config: { unit: '分钟', min: 0, max: 120 } },
];

const insert = db.prepare(`
  INSERT INTO question_pool (dimension, question_text, question_type, config)
  VALUES (?, ?, ?, ?)
`);

const insertMany = db.transaction((qs) => {
  for (const q of qs) {
    insert.run(q.dimension, q.question_text, q.question_type, JSON.stringify(q.config));
  }
});

insertMany(questions);
console.log(`Seeded ${questions.length} questions into question_pool.`);
