// Dimension layer assignments
export const LAYER_CONFIG = {
  base: ['BODY', 'DIET', 'INNER'],      // 基底层
  middle: ['MIND', 'CAREER', 'FINANCE'], // 中间层
  upper: ['RELATION', 'FAMILY'],         // 上层
};

// Score thresholds for status assignment
// C: 蓄势 (1-2.5), L: 流动 (2.5-3.8), Z: 绽放 (3.8-5)
export function scoreToStatus(score) {
  if (score >= 3.8) return 'Z';
  if (score >= 2.5) return 'L';
  return 'C';
}

// Get dominant status for a layer
export function getLayerStatus(dimensions, layer) {
  const layerDims = LAYER_CONFIG[layer];
  const statuses = layerDims.map(code => {
    const dim = dimensions.find(d => d.dimension_code === code);
    return dim ? dim.status : 'C';
  });

  const counts = { C: 0, L: 0, Z: 0 };
  statuses.forEach(s => counts[s]++);

  // Majority wins; tie goes to C < L < Z (ascending priority)
  const max = Math.max(...Object.values(counts));
  if (counts.Z === max) return 'Z';
  if (counts.L === max) return 'L';
  return 'C';
}

// All 27 pattern names
export const PATTERN_NAMES = {
  CCC: '种子期',
  CCL: '萌芽期',
  CCZ: '新芽期',
  CLC: '雨露期',
  CLL: '竹林期',
  CLZ: '花开期',
  CZC: '朝阳期',
  CZL: '晨光期',
  CZZ: '春晖期',
  LCC: '潜流期',
  LCL: '桥梁期',
  LCZ: '涌泉期',
  LLC: '山泉期',
  LLL: '和风期',
  LLZ: '花海期',
  LZC: '清风期',
  LZL: '云间期',
  LZZ: '秋收期',
  ZCC: '松柏期',
  ZCL: '巍峨期',
  ZCZ: '山巅期',
  ZLC: '沃土期',
  ZLL: '丰泽期',
  ZLZ: '丰收期',
  ZZC: '霞光期',
  ZZL: '金秋期',
  ZZZ: '盛放期',
};

// Pattern descriptions
export const PATTERN_DESCRIPTIONS = {
  CCC: '你正处于全面蓄势的阶段，所有层面都在积累能量。这是一个内敛的时期，如同种子在土壤中孕育生机，改变即将发生。',
  CCL: '基底与中层在积累，但上层关系已开始流动，如同种子萌发出第一片嫩芽，生命力正在显现。',
  CCZ: '基底与中层蓄势，而关系与家庭层面正在绽放，你的人际能量走在生命成长的前沿。',
  CLC: '基底蓄势，中层流动，上层积累。如春雨滋润，能量从中心向外扩展。',
  CLL: '基底积累能量，中层与上层已经流动如竹林清风，你的心理、工作与关系都处于良好状态。',
  CLZ: '基底蓄势，中层流动，关系绽放。花朵已经盛开，而根部正在深扎。',
  CZC: '基底蓄势，中层充盛，上层积累。如朝阳升起，内在资源正在向外层输送。',
  CZL: '基底积累，中层绽放，上层流动。如晨光初现，你的核心能量正在照亮周围。',
  CZZ: '基底蓄势，中层与上层全面绽放。如春晖普照，即便根基尚在积累，你已在多个层面展现光彩。',
  LCC: '基底流动，中层与上层蓄势。如地下潜流，身体与内修的能量正在稳定地向上滋养。',
  LCL: '基底流动，中层蓄势，上层流动。如桥梁连接两岸，你的能量在基底与关系间流畅传递。',
  LCZ: '基底流动，中层蓄势，上层绽放。如涌泉喷发，关系与家庭正在达到高峰状态。',
  LLC: '基底与中层流动，上层蓄势。如山间清泉，生命的大部分都在流动，关系正在积累新的能量。',
  LLL: '全面流动，均衡和谐。你正处于生命的和风状态，各个维度都在顺畅运行，宜保持与稳健推进。',
  LLZ: '基底与中层流动，上层绽放。如花海盛开，你的关系与家庭处于最美好的状态。',
  LZC: '基底流动，中层绽放，上层蓄势。如清风习习，你的核心能量正在积蓄关系层面的新可能。',
  LZL: '基底流动，中层绽放，上层流动。如云间漫步，你的生命轻盈而充实，多个层面都在良好运行。',
  LZZ: '基底流动，中层与上层绽放。如秋收丰盈，你正在多个维度同时收获生命的成果。',
  ZCC: '基底充盛，中层与上层蓄势。如松柏常青，身体与内修的能量极为充沛，正在滋养其他层面。',
  ZCL: '基底绽放，中层蓄势，上层流动。如山峰巍峨，你的根基强健，关系层面运行顺畅。',
  ZCZ: '基底与上层绽放，中层蓄势。如山巅之境，身心根基与关系都在高峰，职业财务正在积累新能量。',
  ZLC: '基底绽放，中层流动，上层蓄势。如沃土丰盈，身体与内修的能量滋养着事业，关系正在积累。',
  ZLL: '基底绽放，中层与上层流动。如雨露丰泽，你的生命能量充盛，各层面都在顺畅运行。',
  ZLZ: '基底绽放，中层流动，上层绽放。如大丰收之时，身心根基与人际关系都处于高峰状态。',
  ZZC: '基底与中层绽放，上层蓄势。如霞光满天，你的身体、事业、内修与财务都在高点，关系正在积累新阶段的能量。',
  ZZL: '基底与中层绽放，上层流动。如金秋时节，生命大部分维度都在丰收，关系层面也在平稳流动。',
  ZZZ: '全面绽放，生命力旺盛。你正处于最充沛的状态，所有维度都在高峰。宜把握时机，大步推进重要目标。',
};

// Calculate pattern from dimensions
export function calculatePattern(dimensions) {
  const baseStatus = getLayerStatus(dimensions, 'base');
  const middleStatus = getLayerStatus(dimensions, 'middle');
  const upperStatus = getLayerStatus(dimensions, 'upper');

  const code = `${baseStatus}${middleStatus}${upperStatus}`;
  const name = PATTERN_NAMES[code] || '和风期';
  const description = PATTERN_DESCRIPTIONS[code] || '';

  return { code, name, description };
}

// Dimension metadata
export const DIMENSION_META = {
  BODY:     { label: '身体', emoji: '🏃', color: '#e8a849', layer: 'base' },
  DIET:     { label: '饮食', emoji: '🍱', color: '#7ec8a4', layer: 'base' },
  MIND:     { label: '心理', emoji: '🧠', color: '#a49ee8', layer: 'middle' },
  CAREER:   { label: '职业', emoji: '💼', color: '#e87e7e', layer: 'middle' },
  RELATION: { label: '关系', emoji: '🤝', color: '#e8c87e', layer: 'upper' },
  FAMILY:   { label: '家庭', emoji: '🏠', color: '#7ec4e8', layer: 'upper' },
  FINANCE:  { label: '财务', emoji: '💰', color: '#a8e87e', layer: 'middle' },
  INNER:    { label: '内修', emoji: '🧘', color: '#e87ec4', layer: 'base' },
};
