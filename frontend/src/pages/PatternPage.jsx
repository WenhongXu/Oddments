import { useState, useEffect } from 'react';
import { api } from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';

const DIM_COLORS = {
  BODY: '#e8a849', DIET: '#7ec8a4', MIND: '#a49ee8', CAREER: '#e87e7e',
  RELATION: '#e8c87e', FAMILY: '#7ec4e8', FINANCE: '#a8e87e', INNER: '#e87ec4',
};

const STATUS_CONFIG = {
  C: { label: '蓄势', desc: '积累能量', cls: 'status-C', icon: '🌱' },
  L: { label: '流动', desc: '顺畅运行', cls: 'status-L', icon: '🌊' },
  Z: { label: '绽放', desc: '充沛输出', cls: 'status-Z', icon: '✨' },
};

const LAYER_LABELS = {
  base: '基底层',
  middle: '中间层',
  upper: '上层',
};

const LAYER_DESC = {
  base: '身体 · 饮食 · 内修',
  middle: '心理 · 职业 · 财务',
  upper: '关系 · 家庭',
};

export default function PatternPage() {
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    Promise.all([
      api.getCurrentPattern(),
      api.getPatternHistory(),
    ]).then(([patData, hist]) => {
      setData(patData);
      setHistory(hist);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-container"><LoadingSpinner text="分析当前状态..." /></div>;
  if (!data) return null;

  const { pattern, dimensions } = data;

  // Group dimensions by layer
  const layers = {
    base: dimensions.filter(d => d.layer === 'base'),
    middle: dimensions.filter(d => d.layer === 'middle'),
    upper: dimensions.filter(d => d.layer === 'upper'),
  };

  return (
    <div className="page-container">
      <h1 className="font-serif text-gold text-xl glow-text mb-6">生命模式</h1>

      {/* Main pattern display */}
      <div className="card mb-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            background: 'radial-gradient(circle at 50% 50%, #e8a849 0%, transparent 70%)'
          }} />
        </div>
        <div className="relative">
          <div className="text-xs text-textMuted mb-2 tracking-widest uppercase">当前模式</div>
          <div className="font-serif text-4xl text-gold glow-text mb-1">{pattern.name}</div>
          <div className="text-textMuted text-sm mb-3">模式码：{pattern.code}</div>
          <div className="flex justify-center gap-3 mb-4">
            {pattern.code.split('').map((s, i) => {
              const layerName = ['基底', '中间', '上层'][i];
              const sc = STATUS_CONFIG[s];
              return (
                <div key={i} className="text-center">
                  <span className="text-lg">{sc?.icon}</span>
                  <div className="text-xs text-textMuted">{layerName}</div>
                  <span className={`status-badge ${sc?.cls} text-xs`}>{sc?.label}</span>
                </div>
              );
            })}
          </div>
          <p className="text-sm text-text/80 leading-relaxed px-2">{pattern.description}</p>
        </div>
      </div>

      {/* Dimension layers */}
      {Object.entries(layers).map(([layerKey, dims]) => (
        <div key={layerKey} className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="text-sm font-medium text-text">{LAYER_LABELS[layerKey]}</span>
              <span className="text-textMuted text-xs ml-2">{LAYER_DESC[layerKey]}</span>
            </div>
          </div>
          <div className="space-y-2">
            {dims.map(d => (
              <DimensionBar key={d.dimension_code} dim={d} />
            ))}
          </div>
        </div>
      ))}

      {/* Eight dimensions radar view */}
      <div className="card mb-4">
        <h3 className="section-title text-base mb-4">八维状态总览</h3>
        <OctagonChart dimensions={dimensions} />
      </div>

      {/* Pattern history */}
      <div className="card mb-4">
        <button
          className="flex items-center justify-between w-full"
          onClick={() => setShowHistory(!showHistory)}
        >
          <span className="section-title text-base">模式历史</span>
          <span className="text-textMuted text-sm">{showHistory ? '收起' : '展开'}</span>
        </button>
        {showHistory && history.length > 0 && (
          <div className="mt-3 space-y-2">
            {history.map((h, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <span className="text-sm text-text">{h.pattern_name}</span>
                  <span className="text-textMuted text-xs ml-2">{h.pattern_code}</span>
                </div>
                <span className="text-xs text-textMuted">
                  {new Date(h.evaluated_at).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Status legend */}
      <div className="card">
        <h3 className="text-sm font-medium text-textMuted mb-3">状态说明</h3>
        <div className="space-y-2">
          {Object.entries(STATUS_CONFIG).map(([code, cfg]) => (
            <div key={code} className="flex items-start gap-3">
              <span className="text-lg flex-shrink-0">{cfg.icon}</span>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`status-badge ${cfg.cls}`}>{cfg.label}</span>
                  <span className="text-xs text-textMuted">{cfg.desc}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DimensionBar({ dim }) {
  const color = DIM_COLORS[dim.dimension_code] || '#e8a849';
  const pct = ((dim.score - 1) / 4) * 100;
  const sc = STATUS_CONFIG[dim.status] || STATUS_CONFIG.C;

  return (
    <div className="bg-surfaceHover rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-base">{dim.emoji}</span>
          <span className="text-sm font-medium text-text">{dim.label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold" style={{ color }}>{dim.score?.toFixed(1)}</span>
          <span className={`status-badge ${sc.cls}`}>{sc.label}</span>
        </div>
      </div>
      <div className="h-1.5 bg-border rounded-full">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function OctagonChart({ dimensions }) {
  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size / 2 - 20;

  const order = ['BODY', 'DIET', 'MIND', 'CAREER', 'RELATION', 'FAMILY', 'FINANCE', 'INNER'];
  const dimMap = {};
  dimensions.forEach(d => { dimMap[d.dimension_code] = d; });

  const points = order.map((code, i) => {
    const angle = (i / order.length) * 2 * Math.PI - Math.PI / 2;
    const dim = dimMap[code];
    const score = dim?.score || 1;
    const r = ((score - 1) / 4) * maxR;
    return {
      code,
      label: dim?.label || code,
      color: DIM_COLORS[code],
      score,
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
      lx: cx + (maxR + 16) * Math.cos(angle),
      ly: cy + (maxR + 16) * Math.sin(angle),
    };
  });

  const polyPoints = points.map(p => `${p.x},${p.y}`).join(' ');

  // Grid rings
  const rings = [1, 2, 3, 4, 5].map(level => {
    const r = (level / 5) * maxR;
    const gridPts = order.map((_, i) => {
      const angle = (i / order.length) * 2 * Math.PI - Math.PI / 2;
      return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
    });
    return gridPts.join(' ');
  });

  return (
    <div className="flex justify-center">
      <svg width={size + 60} height={size + 40} viewBox={`-30 -20 ${size + 60} ${size + 40}`}>
        {/* Grid */}
        {rings.map((pts, i) => (
          <polygon
            key={i}
            points={pts}
            fill="none"
            stroke="#2a2d3e"
            strokeWidth="0.5"
          />
        ))}

        {/* Axes */}
        {order.map((code, i) => {
          const angle = (i / order.length) * 2 * Math.PI - Math.PI / 2;
          const ex = cx + maxR * Math.cos(angle);
          const ey = cy + maxR * Math.sin(angle);
          return (
            <line key={code} x1={cx} y1={cy} x2={ex} y2={ey} stroke="#2a2d3e" strokeWidth="0.5" />
          );
        })}

        {/* Data polygon */}
        <polygon
          points={polyPoints}
          fill="rgba(232,168,73,0.15)"
          stroke="#e8a849"
          strokeWidth="1.5"
        />

        {/* Data points */}
        {points.map(p => (
          <circle key={p.code} cx={p.x} cy={p.y} r={3} fill={p.color} />
        ))}

        {/* Labels */}
        {points.map(p => (
          <text
            key={p.code}
            x={p.lx}
            y={p.ly}
            textAnchor="middle"
            dominantBaseline="middle"
            fill={p.color}
            fontSize="9"
            fontFamily="Noto Sans SC, sans-serif"
          >
            {p.label}
          </text>
        ))}
      </svg>
    </div>
  );
}
