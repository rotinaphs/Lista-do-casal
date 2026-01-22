
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ChecklistItem, ItemStatus, CalendarEvent, AppTheme, BudgetLevel } from './types';
import ChecklistItemCard from './components/ChecklistItemCard';
import ChecklistItemListRow from './components/ChecklistItemListRow';
import StatsBoard from './components/StatsBoard';
import CalendarView from './components/CalendarView';
import ConfirmationModal from './components/ConfirmationModal';
import { HeartIcon, GearIcon, UploadIcon, LogOutIcon, LockIcon, UserIcon, GoogleIcon, MicrosoftIcon, ImageIcon, LayoutGridIcon, ListIcon } from './components/Icons';
import { resizeImage, safeLocalStorageSet } from './utils';

const DEFAULT_THEME: AppTheme = {
  primaryColor: '#ec4899', secondaryColor: '#fce7f3', 
  portalTitle: 'Nossos Sonhos', portalTitleColor: '#1f2937',
  portalSubtitle: 'Planejando a vida', portalSubtitleColor: '#6b7280',
  backgroundImage: 'https://images.unsplash.com/photo-1502481851512-e9e2529bbbf9?q=80&w=2070&auto=format&fit=crop', 
  cardColor: '#ffffff', fontColor: '#374151',
  bgGradientStart: '#fff5f5', bgGradientEnd: '#fed7e2', actionButtonColor: '#ec4899',
  objectAnimation: 'animate-pulse',
};

const DEFAULT_LEVELS: BudgetLevel[] = [
  { id: '1', label: 'Primeiros Passos', target: 1000 },
  { id: '2', label: 'Conquista Média', target: 5000 },
  { id: '3', label: 'Grande Marco', target: 15000 },
];

const PALETTES = [
  { name: 'Padrão (Rosa)', primary: '#ec4899', secondary: '#fce7f3', start: '#fff5f5', end: '#fed7e2' },
  { name: 'Oceano', primary: '#0ea5e9', secondary: '#e0f2fe', start: '#f0f9ff', end: '#bae6fd' },
  { name: 'Natureza', primary: '#10b981', secondary: '#ecfdf5', start: '#f0fdf4', end: '#bbf7d0' },
  { name: 'Crepúsculo', primary: '#8b5cf6', secondary: '#f5f3ff', start: '#faf5ff', end: '#e9d5ff' },
  { name: 'Rose sRGB', primary: '#f43f5e', secondary: '#ffe4e6', start: '#fff1f2', end: '#fecdd3' },
  { name: 'Laranja Solar', primary: '#f97316', secondary: '#ffedd5', start: '#fff7ed', end: '#fed7aa' },
  { name: 'Menta Fresca', primary: '#14b8a6', secondary: '#ccfbf1', start: '#f0fdfa', end: '#99f6e4' },
  { name: 'Noite Estrelada', primary: '#6366f1', secondary: '#e0e7ff', start: '#eef2ff', end: '#c7d2fe' },
];

const ANIMATIONS = [
  { id: 'animate-pulse', name: 'Pulsar' },
  { id: 'animate-float', name: 'Flutuar' },
  { id: 'animate-beat', name: 'Batida' },
  { id: 'animate-jump', name: 'Saltar' },
  { id: 'animate-wiggle', name: 'Balançar' },
  { id: 'animate-spin-slow', name: 'Girar' },
  { id: 'none', name: 'Parado' },
];

const App: React.FC = () => {
  // Auth States
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authView, setAuthView] = useState<'login' | 'signup'>('login');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authData, setAuthData] = useState(() => {
    try {
      const stored = localStorage.getItem('couple_auth_v2');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });
  
  const [fields, setFields] = useState({ email: '', password: '', confirmPassword: '' });
  const [authError, setAuthError] = useState('');

  // Main Data States
  const [items, setItems] = useState<ChecklistItem[]>(() => {
    try {
      const stored = localStorage.getItem('couple_checklist');
      const parsed = stored ? JSON.parse(stored) : [];
      return parsed.map((i: any) => ({
        ...i,
        progress: typeof i.progress === 'number' ? i.progress : 
                  (i.status === 'DONE' ? 100 : 
                   i.status === 'ALMOST_THERE' ? 80 : 
                   i.status === 'IN_PROGRESS' ? 30 : 0),
        link: i.link || ''
      }));
    } catch { return []; }
  });

  const [events, setEvents] = useState<CalendarEvent[]>(() => {
    try {
      const stored = localStorage.getItem('couple_events');
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });

  const [budgetLevels, setBudgetLevels] = useState<BudgetLevel[]>(() => {
    try {
      const stored = localStorage.getItem('couple_budget_levels');
      return stored ? JSON.parse(stored) : DEFAULT_LEVELS;
    } catch { return DEFAULT_LEVELS; }
  });

  const [initialSavings, setInitialSavings] = useState<number>(() => {
    try {
      const stored = localStorage.getItem('couple_initial_savings');
      return stored ? parseFloat(stored) : 0;
    } catch { return 0; }
  });

  const [theme, setTheme] = useState<AppTheme>(() => {
    try {
      const stored = localStorage.getItem('couple_theme');
      return stored ? JSON.parse(stored) : DEFAULT_THEME;
    } catch { return DEFAULT_THEME; }
  });

  const [viewMode, setViewMode] = useState<'checklist' | 'calendar'>('checklist');
  const [checklistLayout, setChecklistLayout] = useState<'grid' | 'list'>(() => {
    try {
      return (localStorage.getItem('couple_layout_mode') as 'grid' | 'list') || 'grid';
    } catch { return 'grid'; }
  });

  const [sortBy, setSortBy] = useState('newest');
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<ChecklistItem | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);

  const [formData, setFormData] = useState({
    title: '', price: '', link: '', image: undefined as string | undefined, 
    fit: 'cover' as 'cover' | 'contain', scale: 1, x: 50, y: 50, adjusting: false
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    safeLocalStorageSet('couple_checklist', items);
    safeLocalStorageSet('couple_events', events);
    safeLocalStorageSet('couple_theme', theme);
    safeLocalStorageSet('couple_budget_levels', budgetLevels);
    localStorage.setItem('couple_initial_savings', initialSavings.toString());
    localStorage.setItem('couple_layout_mode', checklistLayout);

    const root = document.documentElement;
    root.style.setProperty('--primary', theme.primaryColor);
    root.style.setProperty('--secondary', theme.secondaryColor);
    root.style.setProperty('--bg-gradient-start', theme.bgGradientStart);
    root.style.setProperty('--bg-gradient-end', theme.bgGradientEnd);
    root.style.setProperty('--action-btn', theme.actionButtonColor);
    
    const body = document.getElementById('app-body');
    if (body) {
      body.style.backgroundImage = theme.backgroundImage 
        ? `url(${theme.backgroundImage})` 
        : `linear-gradient(135deg, ${theme.bgGradientStart} 0%, ${theme.bgGradientEnd} 100%)`;
      body.style.backgroundSize = 'cover';
      body.style.backgroundPosition = 'center';
      body.style.backgroundAttachment = 'fixed';
    }
  }, [items, events, theme, budgetLevels, initialSavings, isAuthenticated, checklistLayout]);

  // Auth Handlers
  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsAuthenticating(true);

    setTimeout(() => {
      if (authView === 'signup') {
        if (!fields.email || !fields.password) {
          setAuthError('Preencha todos os campos.');
        } else if (fields.password !== fields.confirmPassword) {
          setAuthError('As senhas não coincidem.');
        } else {
          const newAuth = { email: fields.email, password: fields.password, provider: 'local' };
          localStorage.setItem('couple_auth_v2', JSON.stringify(newAuth));
          setAuthData(newAuth);
          setIsAuthenticated(true);
        }
      } else {
        if (authData && fields.email === authData.email && fields.password === authData.password) {
          setIsAuthenticated(true);
        } else {
          setAuthError('E-mail ou senha incorretos.');
        }
      }
      setIsAuthenticating(false);
    }, 800);
  };

  const handleSocialAuth = (provider: 'google' | 'microsoft') => {
    setIsAuthenticating(true);
    setAuthError('');
    
    // Simulate OAuth Delay
    setTimeout(() => {
      const socialAuth = { 
        email: `${provider}@exemplo.com`, 
        provider, 
        name: provider === 'google' ? 'Usuário Google' : 'Usuário Microsoft' 
      };
      localStorage.setItem('couple_auth_v2', JSON.stringify(socialAuth));
      setAuthData(socialAuth);
      setIsAuthenticated(true);
      setIsAuthenticating(false);
    }, 1500);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setFields({ email: '', password: '', confirmPassword: '' });
  };

  // Checklist Handlers
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsProcessingImage(true);
      try {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const result = await resizeImage(reader.result as string);
          setFormData(prev => ({ ...prev, image: result }));
          setIsProcessingImage(false);
        };
        reader.readAsDataURL(file);
      } catch (err) {
        console.error('Erro ao processar imagem:', err);
        setIsProcessingImage(false);
      }
    }
  };

  const addItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    const newItem: ChecklistItem = {
      id: crypto.randomUUID(), title: formData.title.trim(), 
      price: parseFloat(formData.price) || 0, 
      link: formData.link.trim(),
      status: ItemStatus.PENDING, 
      progress: 0,
      createdAt: Date.now(), image: formData.image,
      imageFit: formData.fit, imageScale: formData.scale, 
      imagePositionX: formData.x, imagePositionY: formData.y
    };

    setItems(prev => [newItem, ...prev]);
    setFormData({ title: '', price: '', link: '', image: undefined, fit: 'cover', scale: 1, x: 50, y: 50, adjusting: false });
    setIsFormVisible(false);
  };

  const updateItem = useCallback((id: string, updates: Partial<ChecklistItem>) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
  }, []);

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      if (sortBy === 'priceHigh') return b.price - a.price;
      if (sortBy === 'priceLow') return a.price - b.price;
      if (sortBy === 'oldest') return a.createdAt - b.createdAt;
      return b.createdAt - a.createdAt;
    });
  }, [items, sortBy]);

  // Auth Screens
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center p-6 bg-cover bg-center" style={{ backgroundImage: `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3)), url(${DEFAULT_THEME.backgroundImage})` }}>
        <div className="bg-white/80 backdrop-blur-3xl p-8 sm:p-12 rounded-[3.5rem] shadow-3xl w-full max-w-lg border-2 border-white/50 animate-in zoom-in-95 duration-500 overflow-hidden relative">
          {isAuthenticating && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-4">
              <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-black text-pink-500 uppercase tracking-widest">Validando Acesso...</p>
            </div>
          )}

          <header className="text-center mb-10">
            <div className="inline-block p-4 bg-pink-100 rounded-full mb-4 animate-beat">
              <HeartIcon className="w-8 h-8 text-pink-500" />
            </div>
            <h1 className="text-4xl font-cursive text-gray-800 mb-2">Portal do Casal</h1>
            <div className="flex bg-gray-100 p-1.5 rounded-2xl w-fit mx-auto">
              <button onClick={() => setAuthView('login')} className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${authView === 'login' ? 'bg-white shadow-sm text-pink-500' : 'text-gray-400'}`}>Entrar</button>
              <button onClick={() => setAuthView('signup')} className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${authView === 'signup' ? 'bg-white shadow-sm text-pink-500' : 'text-gray-400'}`}>Criar Conta</button>
            </div>
          </header>

          <form onSubmit={handleAuth} className="space-y-4">
            <div className="relative group">
              <UserIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-pink-400 transition-colors" />
              <input required type="email" placeholder="E-mail" value={fields.email} onChange={e => setFields({...fields, email: e.target.value})} className="w-full bg-white border-2 border-transparent rounded-[1.5rem] p-5 pl-14 font-bold outline-none focus:border-pink-200 focus:shadow-lg transition-all" />
            </div>
            <div className="relative group">
              <LockIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-pink-400 transition-colors" />
              <input required type="password" placeholder="Senha" value={fields.password} onChange={e => setFields({...fields, password: e.target.value})} className="w-full bg-white border-2 border-transparent rounded-[1.5rem] p-5 pl-14 font-bold outline-none focus:border-pink-200 focus:shadow-lg transition-all" />
            </div>
            {authView === 'signup' && (
              <div className="relative group animate-in slide-in-from-top-2 duration-300">
                <LockIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-pink-400 transition-colors" />
                <input required type="password" placeholder="Confirmar Senha" value={fields.confirmPassword} onChange={e => setFields({...fields, confirmPassword: e.target.value})} className="w-full bg-white border-2 border-transparent rounded-[1.5rem] p-5 pl-14 font-bold outline-none focus:border-pink-200 focus:shadow-lg transition-all" />
              </div>
            )}
            {authError && <p className="text-red-500 text-[10px] font-black text-center uppercase tracking-widest animate-pulse">{authError}</p>}
            
            <button type="submit" className="w-full py-5 bg-pink-500 text-white rounded-[1.5rem] font-black uppercase tracking-[0.2em] shadow-xl shadow-pink-200 hover:bg-gray-900 active:scale-95 transition-all text-sm">
              {authView === 'login' ? 'Acessar Sonhos' : 'Começar Jornada'}
            </button>
          </form>

          <div className="mt-8">
            <div className="flex items-center gap-4 mb-8">
              <div className="h-px bg-gray-200 flex-1" />
              <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Ou acesse com</span>
              <div className="h-px bg-gray-200 flex-1" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => handleSocialAuth('google')} className="flex items-center justify-center gap-3 py-4 bg-white border-2 border-gray-50 rounded-2xl hover:border-pink-100 hover:shadow-md transition-all active:scale-95">
                <GoogleIcon className="w-5 h-5" />
                <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Google</span>
              </button>
              <button onClick={() => handleSocialAuth('microsoft')} className="flex items-center justify-center gap-3 py-4 bg-white border-2 border-gray-50 rounded-2xl hover:border-blue-100 hover:shadow-md transition-all active:scale-95">
                <MicrosoftIcon className="w-5 h-5" />
                <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Microsoft</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main App Screen
  return (
    <div className="max-w-6xl mx-auto px-6 py-10 relative min-h-screen">
      {isProcessingImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-[3rem] shadow-2xl flex flex-col items-center gap-4 animate-in zoom-in-95">
             <div className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: theme.primaryColor, borderTopColor: 'transparent' }} />
             <span className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-500">Otimizando Imagem...</span>
          </div>
        </div>
      )}

      <button onClick={() => setIsSettingsVisible(true)} className="fixed top-8 right-8 z-40 p-4 bg-white/90 backdrop-blur-md shadow-2xl rounded-full hover:scale-110 transition-transform border border-white">
        <GearIcon className="w-6 h-6" style={{ color: theme.primaryColor }} />
      </button>

      {isSettingsVisible && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setIsSettingsVisible(false)} />
          <div className="relative w-96 bg-white h-full p-8 sm:p-10 shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300">
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-3xl font-black text-gray-800">Ajustes</h2>
              <button onClick={handleLogout} className="p-3 bg-rose-50 text-rose-500 rounded-2xl hover:bg-rose-500 hover:text-white transition-all shadow-sm" title="Sair do Portal">
                <LogOutIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-10">
              <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-4">
                <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Conta Conectada</p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-gray-500">
                    {authData?.provider === 'google' ? <GoogleIcon className="w-6 h-6" /> : authData?.provider === 'microsoft' ? <MicrosoftIcon className="w-6 h-6" /> : <UserIcon className="w-6 h-6" style={{ color: theme.primaryColor }} />}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-gray-800">{authData?.email}</span>
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-0.5">Provedor: {authData?.provider}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest block mb-4">Cabeçalho</label>
                <div className="space-y-4">
                  <div className="relative group">
                    <input 
                      type="text" 
                      placeholder="Título" 
                      value={theme.portalTitle} 
                      onChange={e => setTheme({ ...theme, portalTitle: e.target.value })} 
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-5 pr-16 font-bold outline-none focus:bg-white focus:border-[var(--secondary)] transition-all text-gray-800 placeholder:text-gray-300" 
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <div className="relative w-10 h-10 rounded-xl overflow-hidden border-2 border-white shadow-md ring-1 ring-gray-100 group cursor-pointer transition-transform hover:scale-105">
                        <input type="color" value={theme.portalTitleColor} onChange={e => setTheme({ ...theme, portalTitleColor: e.target.value })} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                        <div className="w-full h-full" style={{ backgroundColor: theme.portalTitleColor }} />
                      </div>
                    </div>
                  </div>
                  
                  <div className="relative group">
                    <input 
                      type="text" 
                      placeholder="Subtítulo" 
                      value={theme.portalSubtitle} 
                      onChange={e => setTheme({ ...theme, portalSubtitle: e.target.value })} 
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-5 pr-16 font-bold outline-none focus:bg-white focus:border-[var(--secondary)] transition-all text-gray-800 placeholder:text-gray-300" 
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <div className="relative w-10 h-10 rounded-xl overflow-hidden border-2 border-white shadow-md ring-1 ring-gray-100 group cursor-pointer transition-transform hover:scale-105">
                        <input type="color" value={theme.portalSubtitleColor} onChange={e => setTheme({ ...theme, portalSubtitleColor: e.target.value })} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                        <div className="w-full h-full" style={{ backgroundColor: theme.portalSubtitleColor }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest block mb-4">Plano de Fundo</label>
                <input 
                  type="text" 
                  placeholder="URL da Imagem de Fundo (https://...)" 
                  value={theme.backgroundImage} 
                  onChange={e => setTheme({ ...theme, backgroundImage: e.target.value })} 
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-5 font-bold outline-none focus:bg-white focus:border-[var(--secondary)] transition-all text-gray-800 placeholder:text-gray-300" 
                />
              </div>

              <div>
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest block mb-6">Paletas</label>
                <div className="grid grid-cols-2 gap-3">
                  {PALETTES.map(p => (
                    <button key={p.name} onClick={() => setTheme({ ...theme, primaryColor: p.primary, secondaryColor: p.secondary, bgGradientStart: p.start, bgGradientEnd: p.end, actionButtonColor: p.primary })} className="group relative">
                      <div className={`w-full h-14 rounded-2xl transition-all shadow-sm border-4 ${theme.primaryColor === p.primary ? 'scale-[1.02] ring-4' : 'border-white hover:scale-[1.02]'}`} style={{ background: p.primary, borderColor: theme.primaryColor === p.primary ? p.primary : 'white', boxShadow: theme.primaryColor === p.primary ? `0 0 0 2px ${p.secondary}` : 'none' }} /> 
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest block mb-6">Animação do Coração</label>
                <div className="grid grid-cols-2 gap-3">
                  {ANIMATIONS.map(anim => (
                    <button 
                      key={anim.id}
                      onClick={() => setTheme({ ...theme, objectAnimation: anim.id })}
                      className={`py-3 px-4 rounded-xl text-xs font-bold transition-all border-2 ${
                        theme.objectAnimation === anim.id 
                          ? 'bg-pink-50 border-pink-500 text-pink-500' 
                          : 'bg-gray-50 border-transparent text-gray-500 hover:bg-white hover:border-gray-200'
                      }`}
                      style={theme.objectAnimation === anim.id ? { color: theme.primaryColor, borderColor: theme.primaryColor, backgroundColor: theme.secondaryColor } : {}}
                    >
                      {anim.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <button onClick={() => { if(confirm('Resetar dados?')) { localStorage.clear(); window.location.reload(); } }} className="mt-16 w-full py-5 text-[11px] font-black text-rose-500 bg-rose-50 rounded-[2rem] uppercase tracking-widest hover:bg-rose-100 transition-colors">Zerar Dados</button>
          </div>
        </div>
      )}

      <header className="text-center mb-16 space-y-4">
        <div className={`inline-block p-6 bg-white/90 backdrop-blur shadow-2xl rounded-full border-4 border-white ${theme.objectAnimation !== 'none' ? theme.objectAnimation : ''}`}>
          <HeartIcon className="w-12 h-12" style={{ color: theme.primaryColor }} />
        </div>
        <h1 className="text-7xl font-cursive" style={{ color: theme.portalTitleColor }}>{theme.portalTitle}</h1>
        <p className="text-xl font-medium max-w-md mx-auto" style={{ color: theme.portalSubtitleColor }}>{theme.portalSubtitle}</p>
      </header>

      <div className="flex bg-white/30 backdrop-blur-xl p-2 rounded-[2.5rem] mb-16 shadow-2xl max-w-sm mx-auto border-4 border-white/50">
        {(['checklist', 'calendar'] as const).map(mode => (
          <button key={mode} onClick={() => setViewMode(mode)} className={`flex-1 py-4 rounded-[2rem] text-sm font-black uppercase tracking-widest transition-all duration-500 ${viewMode === mode ? 'bg-white shadow-xl scale-[1.02]' : 'text-gray-400 hover:text-gray-600'}`} style={{ color: viewMode === mode ? theme.primaryColor : undefined }}>
            {mode === 'checklist' ? 'Lista' : 'Calendário'}
          </button>
        ))}
      </div>

      {viewMode === 'checklist' ? (
        <div className="animate-in fade-in slide-in-from-bottom-6 duration-1000">
          <StatsBoard items={items} budgetLevels={budgetLevels} onUpdateLevels={setBudgetLevels} initialSavings={initialSavings} onUpdateInitialSavings={setInitialSavings} />
          
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-12">
            <div className="flex items-center gap-2 bg-white/90 backdrop-blur-md rounded-[2.5rem] p-2 shadow-xl border border-white">
               <div className="px-6 border-r border-gray-100">
                  <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="bg-transparent border-none text-[12px] font-black text-gray-500 uppercase tracking-widest outline-none cursor-pointer py-2">
                    <option value="newest">Mais Novos</option>
                    <option value="oldest">Mais Antigos</option>
                    <option value="priceHigh">Maior Preço</option>
                    <option value="priceLow">Menor Preço</option>
                  </select>
               </div>
               <div className="flex gap-1 pr-1">
                 <button 
                    onClick={() => setChecklistLayout('grid')}
                    className={`p-2 rounded-full transition-all ${checklistLayout === 'grid' ? 'shadow-inner' : 'text-gray-400 hover:bg-gray-50'}`}
                    style={checklistLayout === 'grid' ? { backgroundColor: theme.secondaryColor, color: theme.primaryColor } : {}}
                    title="Visualização em Grade"
                 >
                    <LayoutGridIcon className="w-5 h-5" />
                 </button>
                 <button 
                    onClick={() => setChecklistLayout('list')}
                    className={`p-2 rounded-full transition-all ${checklistLayout === 'list' ? 'shadow-inner' : 'text-gray-400 hover:bg-gray-50'}`}
                    style={checklistLayout === 'list' ? { backgroundColor: theme.secondaryColor, color: theme.primaryColor } : {}}
                    title="Visualização em Lista"
                 >
                    <ListIcon className="w-5 h-5" />
                 </button>
               </div>
            </div>

            <button onClick={() => setIsFormVisible(!isFormVisible)} className="px-12 py-5 text-white rounded-[2.5rem] font-black text-[13px] uppercase tracking-[0.2em] hover:scale-105 active:scale-95 transition-all" style={{ backgroundColor: theme.primaryColor, boxShadow: `0 20px 40px -10px ${theme.primaryColor}80` }}>
              {isFormVisible ? 'Fechar Painel' : '+ Novo Sonho'}
            </button>
          </div>

          {isFormVisible && (
            <form onSubmit={addItem} className="bg-white/95 backdrop-blur-2xl p-12 rounded-[4rem] border-4 border-white shadow-3xl mb-16 animate-in zoom-in-95 duration-500">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-10">
                  <div className="group">
                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.25em] mb-4 block ml-2">Título do Sonho</label>
                    <input required placeholder="Ex: Viagem para Paris" value={formData.title} onChange={e => setFormData(d => ({ ...d, title: e.target.value }))} className="w-full border-none bg-gray-50/50 rounded-3xl p-6 text-lg font-bold focus:ring-4 outline-none shadow-inner transition-all" style={{ '--tw-ring-color': theme.secondaryColor } as React.CSSProperties} />
                  </div>
                  <div className="group">
                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.25em] mb-4 block ml-2">Link do Produto</label>
                    <input type="url" placeholder="https://..." value={formData.link} onChange={e => setFormData(d => ({ ...d, link: e.target.value }))} className="w-full border-none bg-gray-50/50 rounded-3xl p-6 text-sm font-bold text-gray-600 focus:ring-4 outline-none shadow-inner transition-all" style={{ '--tw-ring-color': theme.secondaryColor } as React.CSSProperties} />
                  </div>
                  <div className="group">
                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.25em] mb-4 block ml-2">Investimento (R$)</label>
                    <input type="number" step="0.01" placeholder="0,00" value={formData.price} onChange={e => setFormData(d => ({ ...d, price: e.target.value }))} className="w-full border-none bg-gray-50/50 rounded-3xl p-6 text-3xl font-black focus:ring-4 outline-none shadow-inner transition-all" style={{ color: theme.primaryColor, '--tw-ring-color': theme.secondaryColor } as React.CSSProperties} />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.25em] mb-4 block ml-2">Imagem de Referência</label>
                  <div className="relative aspect-video bg-gray-50/50 rounded-[3rem] border-4 border-dashed border-white flex flex-col items-center justify-center overflow-hidden cursor-pointer shadow-inner group/upload" onClick={() => fileInputRef.current?.click()}>
                    {formData.image ? ( <img src={formData.image} className="w-full h-full object-cover" /> ) : (
                      <div className="text-center p-10 opacity-30 group-hover/upload:opacity-60 transition-opacity">
                        <ImageIcon className="w-12 h-12 mx-auto mb-4" />
                        <span className="text-[11px] font-black uppercase tracking-widest">Adicionar Foto</span>
                      </div>
                    )}
                  </div>
                  <input type="file" hidden ref={fileInputRef} onChange={handleFileChange} accept="image/*" />
                </div>
              </div>
              <button type="submit" disabled={isProcessingImage} className="w-full mt-12 py-7 bg-gray-900 text-white rounded-[3rem] font-black text-xl shadow-2xl hover:opacity-90 active:scale-[0.98] transition-all uppercase tracking-[0.3em] disabled:opacity-50">Salvar Sonho</button>
            </form>
          )}

          {checklistLayout === 'grid' ? (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
               {items.length === 0 ? (
                 <div className="col-span-full text-center py-32 opacity-10">
                   <HeartIcon className="w-24 h-24 mx-auto mb-8" />
                   <p className="font-black text-2xl uppercase tracking-[0.3em]">Nenhum sonho cadastrado</p>
                 </div>
               ) : ( sortedItems.map(item => ( <ChecklistItemCard key={item.id} item={item} onUpdateItem={updateItem} onDelete={() => setItemToDelete(item)} /> )) )}
             </div>
          ) : (
             <div className="flex flex-col space-y-2">
               {items.length === 0 ? (
                 <div className="text-center py-32 opacity-10">
                   <HeartIcon className="w-24 h-24 mx-auto mb-8" />
                   <p className="font-black text-2xl uppercase tracking-[0.3em]">Nenhum sonho cadastrado</p>
                 </div>
               ) : ( sortedItems.map(item => ( <ChecklistItemListRow key={item.id} item={item} onUpdateItem={updateItem} onDelete={() => setItemToDelete(item)} /> )) )}
             </div>
          )}
        </div>
      ) : (
        <CalendarView events={events} onAddEvent={e => setEvents(prev => [...prev, e])} onDeleteEvent={id => setEvents(prev => prev.filter(e => e.id !== id))} />
      )}

      <ConfirmationModal isOpen={!!itemToDelete} onClose={() => setItemToDelete(null)} onConfirm={() => { setItems(prev => prev.filter(i => i.id !== itemToDelete!.id)); setItemToDelete(null); }} itemTitle={itemToDelete?.title || ''} />
      
      <footer className="mt-32 text-center pb-20 opacity-20 text-[11px] font-black uppercase tracking-[0.4em]">
        Portal de Sonhos &bull; {new Date().getFullYear()}
      </footer>
    </div>
  );
};

export default App;
