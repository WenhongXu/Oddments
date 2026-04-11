import { useState } from 'react';
import { login, saveSession, createUser } from '../api/auth';

export default function LoginPage({ onLogin }) {
  const [mode, setMode] = useState('login'); // login | setup
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    if (!username.trim() || !pin.trim()) return;
    setError('');
    setLoading(true);

    try {
      const { token, user } = await login(username.trim(), pin.trim());
      saveSession(token, user);
      onLogin(user);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSetup(e) {
    e.preventDefault();
    if (!name.trim() || !username.trim() || pin.length < 4) return;
    setError('');
    setLoading(true);

    try {
      await createUser(name.trim(), username.trim(), pin.trim());
      // Now login
      const { token, user } = await login(username.trim(), pin.trim());
      saveSession(token, user);
      onLogin(user);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-6">
      {/* Ambient glow */}
      <div
        className="fixed top-0 left-0 right-0 h-64 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(232,168,73,0.08) 0%, transparent 70%)' }}
      />

      <div className="w-full max-w-sm relative">
        {/* Logo */}
        <div className="text-center mb-10">
          <h1 className="font-serif text-gold text-5xl glow-text mb-2">守明</h1>
          <p className="text-textMuted text-sm tracking-wider">个人生命管理系统</p>
        </div>

        {mode === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-sm text-textMuted block mb-1.5">用户名</label>
              <input
                className="input-field text-base"
                type="text"
                autoComplete="username"
                placeholder="输入你的用户名"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoFocus
              />
            </div>

            <div>
              <label className="text-sm text-textMuted block mb-1.5">PIN 码</label>
              <PinInput value={pin} onChange={setPin} />
            </div>

            {error && (
              <p className="text-red-400 text-sm text-center bg-red-900/20 rounded-lg py-2 px-3">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="btn-primary w-full mt-2"
              disabled={loading || !username.trim() || pin.length < 4}
              style={{ opacity: loading || !username.trim() || pin.length < 4 ? 0.5 : 1 }}
            >
              {loading ? '登录中...' : '进入'}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                className="text-textMuted text-sm active:text-gold"
                onClick={() => { setMode('setup'); setError(''); }}
              >
                首次使用？创建账户
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSetup} className="space-y-4">
            <div className="text-center mb-6">
              <p className="text-text text-sm">创建你的守明账户</p>
              <p className="text-textMuted text-xs mt-1">首次创建无需管理员权限</p>
            </div>

            <div>
              <label className="text-sm text-textMuted block mb-1.5">你的名字</label>
              <input
                className="input-field"
                type="text"
                placeholder="例：守明"
                value={name}
                onChange={e => setName(e.target.value)}
                autoFocus
              />
            </div>

            <div>
              <label className="text-sm text-textMuted block mb-1.5">用户名（登录用）</label>
              <input
                className="input-field"
                type="text"
                autoComplete="username"
                placeholder="英文或拼音，如：shoumingw"
                value={username}
                onChange={e => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
              />
            </div>

            <div>
              <label className="text-sm text-textMuted block mb-1.5">设置 PIN 码（4-6位数字）</label>
              <PinInput value={pin} onChange={setPin} />
            </div>

            {error && (
              <p className="text-red-400 text-sm text-center bg-red-900/20 rounded-lg py-2 px-3">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="btn-primary w-full mt-2"
              disabled={loading || !name.trim() || !username.trim() || pin.length < 4}
              style={{ opacity: loading || !name.trim() || !username.trim() || pin.length < 4 ? 0.5 : 1 }}
            >
              {loading ? '创建中...' : '创建并登录'}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                className="text-textMuted text-sm active:text-gold"
                onClick={() => { setMode('login'); setError(''); }}
              >
                已有账户？返回登录
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function PinInput({ value, onChange }) {
  return (
    <div className="relative">
      <input
        type="password"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={6}
        value={value}
        onChange={e => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
        className="input-field text-center text-2xl tracking-[0.5em] font-bold"
        placeholder="••••"
        autoComplete="current-password"
      />
      <div className="flex gap-2 justify-center mt-2 pointer-events-none">
        {[0, 1, 2, 3, 4, 5].map(i => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full transition-all ${
              i < value.length ? 'bg-gold scale-110' : 'bg-border'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
