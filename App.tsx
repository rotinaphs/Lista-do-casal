
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ChecklistItem, ItemStatus, CalendarEvent, AppTheme, BudgetLevel } from './types';
import ChecklistItemCard from './components/ChecklistItemCard';
import ChecklistItemListRow from './components/ChecklistItemListRow';
import StatsBoard from './components/StatsBoard';
import CalendarView from './components/CalendarView';
import ConfirmationModal from './components/ConfirmationModal';
import { HeartIcon, GearIcon, SlidersIcon, LogOutIcon, UserIcon, GoogleIcon, MicrosoftIcon, ImageIcon, LayoutGridIcon, ListIcon, LockIcon, UploadIcon, TrashIcon, ChevronLeftIcon } from './components/Icons';
import { resizeImage, uploadToSupabase } from './utils';
import { supabase } from './supabaseClient';

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

const mapDbItem = (i: any): ChecklistItem => ({
   id: i.id,
   title: i.title || 'Sem título',
   price: Number(i.price) || 0,
   status: i.status || ItemStatus.PENDING,
   progress: Number(i.progress) || 0,
   link: i.link || '',
   createdAt: i.created_at ? (typeof i.created_at === 'number' ? i.created_at : new Date(i.created_at).getTime()) : Date.now(),
   image: i.image || undefined,
   imageFit: i.image_fit || 'cover',
   imageScale: Number(i.image_scale) || 1,
   imagePositionX: Number(i.image_position_x) || 50,
   imagePositionY: Number(i.image_position_y) || 50
});

const mapDbEvent = (e: any): CalendarEvent => ({
    id: e.id, 
    title: e.title || 'Evento', 
    date: e.date || new Date().toISOString().split('T')[0], 
    description: e.description || ''
});

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [authView, setAuthView] = useState<'login' | 'signup' | 'reset'>('login');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [fields, setFields] = useState({ email: '', password: '', confirmPassword: '' });
  const [authError, setAuthError] = useState('');

  // Estados de inicialização e conexão
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const [isLoadingData, setIsLoadingData] = useState(false);
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [budgetLevels, setBudgetLevels] = useState<BudgetLevel[]>(DEFAULT_LEVELS);
  const [initialSavings, setInitialSavings] = useState<number>(0);
  const [theme, setTheme] = useState<AppTheme>(DEFAULT_THEME);

  const [viewMode, setViewMode] = useState<'checklist' | 'calendar'>('checklist');
  const [checklistLayout, setChecklistLayout] = useState<'grid' | 'list'>('grid');

  const [sortBy, setSortBy] = useState('newest');
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<ChecklistItem | null>(null);
  const [isDeleteAccountModalOpen, setIsDeleteAccountModalOpen] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const [formData, setFormData] = useState({
    title: '', price: '', link: '', image: undefined as string | undefined, 
    fit: 'cover' as 'cover' | 'contain', scale: 1, x: 50, y: 50, adjusting: false
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
        try {
            // Verifica sessão inicial
            const { data, error } = await supabase.auth.getSession();
            if (error) throw error;
            
            if (mounted) {
                setSession(data.session);
                // Se houver sessão, tenta buscar os dados. Se falhar, captura o erro para exibir tela de erro.
                if (data.session) {
                    await fetchData(data.session.user.id, data.session.user.email, true);
                }
            }
        } catch (err: any) {
            const errorMessage = err?.message || JSON.stringify(err);
            
            // Trata erros de Refresh Token forçando o logout em vez de travar a tela
            if (
              errorMessage.includes('Refresh Token') || 
              errorMessage.includes('refresh_token') ||
              errorMessage.includes('Invalid Refresh Token')
            ) {
                console.warn('Sessão inválida detectada. Limpando dados locais.');
                await supabase.auth.signOut();
                if (mounted) setSession(null);
            } else {
                console.error('Erro de inicialização/conexão:', err);
                if (mounted) {
                  setConnectionError(errorMessage || 'Falha ao conectar com o serviço.');
                }
            }
        } finally {
            if (mounted) setIsCheckingSession(false);
        }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (mounted) {
            setSession(session);
            if (session) {
                // Em mudanças subsequentes, não tratamos o erro como crítico de "conexão inicial"
                fetchData(session.user.id, session.user.email);
            } else {
                setItems([]);
                setEvents([]);
                setTheme(DEFAULT_THEME);
            }
        }
    });

    return () => {
        mounted = false;
        subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session) return;

    const channel = supabase.channel('couple_sync')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'checklist_items', filter: `user_id=eq.${session.user.id}` }, 
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setItems(prev => {
               if (prev.some(p => p.id === payload.new.id)) return prev;
               return [mapDbItem(payload.new), ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            setItems(prev => prev.map(i => i.id === payload.new.id ? mapDbItem(payload.new) : i));
          } else if (payload.eventType === 'DELETE') {
            setItems(prev => prev.filter(i => i.id !== payload.old.id));
          }
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'calendar_events', filter: `user_id=eq.${session.user.id}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setEvents(prev => [...prev, mapDbEvent(payload.new)]);
          } else if (payload.eventType === 'DELETE') {
            setEvents(prev => prev.filter(e => e.id !== payload.old.id));
          }
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${session.user.id}` },
        (payload) => {
          const newProfile = payload.new;
          if (newProfile.theme) setTheme(prev => ({ ...prev, ...newProfile.theme }));
          if (newProfile.budget_levels) setBudgetLevels(newProfile.budget_levels);
          if (newProfile.initial_savings !== null) setInitialSavings(Number(newProfile.initial_savings));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  const fetchData = async (userId: string, userEmail?: string, isInitialLoad = false) => {
    setIsLoadingData(true);
    try {
      let { data: profile, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
      
      if (error && (error.code === 'PGRST116' || error.message.includes('JSON'))) {
         const { data: newProfile, error: createError } = await supabase.from('profiles').insert({
           id: userId,
           email: userEmail,
           theme: DEFAULT_THEME,
           budget_levels: DEFAULT_LEVELS,
           initial_savings: 0
         }).select().single();
         
         if (!createError) {
           profile = newProfile;
         } else {
           throw createError; // Lança erro se falhar ao criar perfil
         }
      } else if (error) {
        throw error; // Lança erro de busca de perfil
      }

      if (profile) {
        if (profile.theme && Object.keys(profile.theme).length > 0) {
          setTheme(prev => ({ ...prev, ...profile.theme }));
        }
        if (profile.budget_levels && Array.isArray(profile.budget_levels) && profile.budget_levels.length > 0) {
          setBudgetLevels(profile.budget_levels);
        }
        if (profile.initial_savings !== null) {
          setInitialSavings(Number(profile.initial_savings));
        }
      }

      const { data: dbItems, error: itemsError } = await supabase.from('checklist_items')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
        
      if (itemsError) throw itemsError;

      if (dbItems) {
        setItems(dbItems.map(mapDbItem));
      }

      const { data: dbEvents, error: eventsError } = await supabase.from('calendar_events')
        .select('*')
        .eq('user_id', userId);

      if (eventsError) throw eventsError;

      if (dbEvents) {
        setEvents(dbEvents.map(mapDbEvent));
      }

    } catch (error) {
      console.error('Error fetching data:', error);
      if (isInitialLoad) throw error; // Repassa o erro para o init tratar
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
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
  }, [theme]);

  // Resto das funções mantidas sem alterações
  const updateProfileData = async (updates: any) => {
    if (!session) return;
    try {
      const { error } = await supabase.from('profiles').upsert({
        id: session.user.id,
        email: session.user.email,
        ...updates
      }, { onConflict: 'id' });
      
      if (error) throw error;
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const handleThemeChange = (newTheme: AppTheme) => {
    setTheme(newTheme);
    updateProfileData({ theme: newTheme });
  };

  const handleSavingsChange = (newSavings: number) => {
    setInitialSavings(newSavings);
    updateProfileData({ initial_savings: newSavings });
  };

  const handleLevelsChange = (newLevels: BudgetLevel[]) => {
    setBudgetLevels(newLevels);
    updateProfileData({ budget_levels: newLevels });
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsAuthenticating(true);

    try {
      if (authView === 'signup') {
        if (!fields.email || !fields.password) throw new Error('Preencha todos os campos.');
        if (fields.password !== fields.confirmPassword) throw new Error('As senhas não coincidem.');
        const { error } = await supabase.auth.signUp({
          email: fields.email,
          password: fields.password,
        });
        if (error) throw error;
        alert('Conta criada! Verifique seu e-mail.');
        setAuthView('login');
      } else if (authView === 'reset') {
        if (!fields.email) throw new Error('Informe seu e-mail para recuperação.');
        const { error } = await supabase.auth.resetPasswordForEmail(fields.email, {
            redirectTo: window.location.href,
        });
        if (error) throw error;
        alert('Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha.');
        setAuthView('login');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: fields.email,
          password: fields.password,
        });
        if (error) throw error;
      }
    } catch (error: any) {
      setAuthError(error.message || 'Erro na autenticação.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleDeleteAccount = async () => {
    if (!session) return;
    setIsDeletingAccount(true);

    try {
        const userId = session.user.id;

        // 1. Limpar Arquivos do Storage
        // Como o Supabase não tem "delete folder", listamos e deletamos os arquivos
        const folders = ['items', 'portal'];
        for (const folder of folders) {
             const { data: files } = await supabase.storage.from('couple_assets').list(`${userId}/${folder}`);
             if (files && files.length > 0) {
                 const filesToRemove = files.map(f => `${userId}/${folder}/${f.name}`);
                 await supabase.storage.from('couple_assets').remove(filesToRemove);
             }
        }
        
        // 2. Limpar Dados do Banco
        // A ordem pode importar dependendo das foreign keys, mas se estiver cascade no Supabase, deletar profile basta.
        // Por segurança, deletamos tudo manualmente.
        await supabase.from('checklist_items').delete().eq('user_id', userId);
        await supabase.from('calendar_events').delete().eq('user_id', userId);
        
        // Deletar o perfil (Gatilho principal)
        const { error: profileError } = await supabase.from('profiles').delete().eq('id', userId);
        if (profileError) throw profileError;

        // 3. Logout (O usuário Auth ainda existe no Supabase a menos que seja deletado via Edge Function/Admin API, 
        // mas para a aplicação ele deixa de existir pois os dados foram apagados).
        await supabase.auth.signOut();
        
        setIsSettingsVisible(false);
        setIsDeleteAccountModalOpen(false);
        window.location.reload();

    } catch (error: any) {
        console.error('Erro ao excluir conta:', error);
        alert('Ocorreu um erro ao excluir os dados. Tente novamente.');
    } finally {
        setIsDeletingAccount(false);
    }
  };

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

  const handlePortalBgChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && session) {
      setIsProcessingImage(true);
      try {
        const reader = new FileReader();
        reader.onloadend = async () => {
          try {
            const resized = await resizeImage(reader.result as string);
            const publicUrl = await uploadToSupabase(session.user.id, 'portal', resized);
            handleThemeChange({ ...theme, backgroundImage: publicUrl });
          } catch (err) {
            console.error('Erro ao subir fundo do portal:', err);
          } finally {
            setIsProcessingImage(false);
          }
        };
        reader.readAsDataURL(file);
      } catch (err) {
        console.error('Erro ao ler arquivo:', err);
        setIsProcessingImage(false);
      }
    }
  };

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !session) return;

    setIsProcessingImage(true);
    try {
      let finalImageUrl = formData.image;
      
      if (formData.image && formData.image.startsWith('data:image')) {
        finalImageUrl = await uploadToSupabase(session.user.id, 'items', formData.image);
      }

      const newItemData = {
        user_id: session.user.id,
        title: formData.title.trim(), 
        price: parseFloat(formData.price) || 0, 
        link: formData.link.trim(),
        status: ItemStatus.PENDING, 
        progress: 0,
        created_at: Date.now(),
        image: finalImageUrl,
        image_fit: formData.fit, 
        image_scale: formData.scale, 
        image_position_x: formData.x, 
        image_position_y: formData.y
      };

      const { error } = await supabase.from('checklist_items').insert(newItemData);
      if (error) throw error;
      
      setFormData({ title: '', price: '', link: '', image: undefined, fit: 'cover', scale: 1, x: 50, y: 50, adjusting: false });
      setIsFormVisible(false);
    } catch (error) {
      console.error('Error adding item:', error);
      alert('Erro ao salvar item.');
    } finally {
      setIsProcessingImage(false);
    }
  };

  const updateItem = useCallback(async (id: string, updates: Partial<ChecklistItem>) => {
    if (!session) return;
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));

    const dbUpdates: any = {};
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.price !== undefined) dbUpdates.price = updates.price;
    if (updates.link !== undefined) dbUpdates.link = updates.link;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.progress !== undefined) dbUpdates.progress = updates.progress;
    if (updates.image !== undefined) dbUpdates.image = updates.image;
    if (updates.imageFit !== undefined) dbUpdates.image_fit = updates.imageFit;
    if (updates.imageScale !== undefined) dbUpdates.image_scale = updates.imageScale;
    if (updates.imagePositionX !== undefined) dbUpdates.image_position_x = updates.imagePositionX;
    if (updates.imagePositionY !== undefined) dbUpdates.image_position_y = updates.imagePositionY;

    try {
      await supabase.from('checklist_items')
        .update(dbUpdates)
        .eq('id', id)
        .eq('user_id', session.user.id);
    } catch (error) {
      console.error('Error updating item:', error);
    }
  }, [session]);

  const deleteItem = async () => {
    if (!itemToDelete || !session) return;
    const id = itemToDelete.id;
    setItems(prev => prev.filter(i => i.id !== id));
    setItemToDelete(null);

    try {
      await supabase.from('checklist_items')
        .delete()
        .eq('id', id)
        .eq('user_id', session.user.id);
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const addEvent = async (event: CalendarEvent) => {
    if(!session) return;
    try {
        await supabase.from('calendar_events').insert({
            user_id: session.user.id,
            title: event.title,
            date: event.date,
            description: event.description
        });
    } catch (e) {
        console.error('Error adding event', e);
    }
  };

  const deleteEvent = async (id: string) => {
    if (!session) return;
    setEvents(prev => prev.filter(e => e.id !== id));
    try {
        await supabase.from('calendar_events')
          .delete()
          .eq('id', id)
          .eq('user_id', session.user.id);
    } catch (e) {
        console.error('Error deleting event', e);
    }
  };

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      if (sortBy === 'priceHigh') return b.price - a.price;
      if (sortBy === 'priceLow') return a.price - b.price;
      if (sortBy === 'oldest') return a.createdAt - b.createdAt;
      return b.createdAt - a.createdAt;
    });
  }, [items, sortBy]);

  // Exibição de Loading Inicial
  if (isCheckingSession) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-pink-50">
        <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-pink-500 font-bold uppercase tracking-widest text-xs">Carregando Portal...</p>
      </div>
    );
  }

  // Exibição de Erro de Conexão
  if (connectionError) {
    return (
       <div className="min-h-screen flex items-center justify-center bg-red-50 p-6">
         <div className="bg-white p-10 rounded-[2rem] shadow-xl max-w-md w-full text-center border-2 border-red-100">
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <TrashIcon className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Erro de Conexão</h2>
            <p className="text-gray-500 mb-8 text-sm leading-relaxed">{connectionError}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="w-full py-4 bg-red-500 text-white rounded-xl font-bold uppercase tracking-widest hover:bg-red-600 transition-colors shadow-lg shadow-red-200"
            >
              Tentar Novamente
            </button>
         </div>
       </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center p-6 bg-cover bg-center" style={{ backgroundImage: `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3)), url(${DEFAULT_THEME.backgroundImage})` }}>
        <div className="bg-white/80 backdrop-blur-3xl p-8 sm:p-12 rounded-[3.5rem] shadow-3xl w-full max-w-lg border-2 border-white/50 animate-in zoom-in-95 duration-500 overflow-hidden relative">
          {isAuthenticating && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-4">
              <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-black text-pink-500 uppercase tracking-widest">Conectando...</p>
            </div>
          )}

          <header className="text-center mb-10">
            <div className="inline-block p-4 bg-pink-100 rounded-full mb-4 animate-beat">
              <HeartIcon className="w-8 h-8 text-pink-500" />
            </div>
            <h1 className="text-4xl font-cursive text-gray-800 mb-2">Portal do Casal</h1>
            
            {authView !== 'reset' ? (
                <div className="flex bg-gray-100 p-1.5 rounded-2xl w-fit mx-auto">
                    <button onClick={() => setAuthView('login')} className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${authView === 'login' ? 'bg-white shadow-sm text-pink-500' : 'text-gray-400'}`}>Entrar</button>
                    <button onClick={() => setAuthView('signup')} className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${authView === 'signup' ? 'bg-white shadow-sm text-pink-500' : 'text-gray-400'}`}>Criar Conta</button>
                </div>
            ) : (
                <div className="flex bg-gray-100 p-1.5 rounded-2xl w-fit mx-auto">
                    <span className="px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest bg-white shadow-sm text-pink-500">Recuperação</span>
                </div>
            )}
          </header>

          <form onSubmit={handleAuth} className="space-y-4 mb-8">
            <div className="relative group">
              <UserIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-pink-400 transition-colors" />
              <input required type="email" placeholder="E-mail" value={fields.email} onChange={e => setFields({...fields, email: e.target.value})} className="w-full bg-white border-2 border-transparent rounded-[1.5rem] p-5 pl-14 font-bold outline-none focus:border-pink-200 focus:shadow-lg transition-all" />
            </div>
            
            {authView !== 'reset' && (
                <div className="relative group">
                    <LockIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-pink-400 transition-colors" />
                    <input required type="password" placeholder="Senha" value={fields.password} onChange={e => setFields({...fields, password: e.target.value})} className="w-full bg-white border-2 border-transparent rounded-[1.5rem] p-5 pl-14 font-bold outline-none focus:border-pink-200 focus:shadow-lg transition-all" />
                </div>
            )}
            
            {authView === 'signup' && (
              <div className="relative group animate-in slide-in-from-top-2 duration-300">
                <LockIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-pink-400 transition-colors" />
                <input required type="password" placeholder="Confirmar Senha" value={fields.confirmPassword} onChange={e => setFields({...fields, confirmPassword: e.target.value})} className="w-full bg-white border-2 border-transparent rounded-[1.5rem] p-5 pl-14 font-bold outline-none focus:border-pink-200 focus:shadow-lg transition-all" />
              </div>
            )}

            {authView === 'login' && (
                <div className="flex justify-end">
                    <button type="button" onClick={() => setAuthView('reset')} className="text-[10px] font-bold text-gray-400 hover:text-pink-500 uppercase tracking-widest transition-colors">
                        Esqueceu a senha?
                    </button>
                </div>
            )}

            {authError && <p className="text-red-500 text-[10px] font-black text-center uppercase tracking-widest animate-pulse">{authError}</p>}
            
            <button type="submit" className="w-full py-5 bg-pink-500 text-white rounded-[1.5rem] font-black uppercase tracking-[0.2em] shadow-xl shadow-pink-200 hover:bg-gray-900 active:scale-95 transition-all text-sm">
              {authView === 'login' ? 'Acessar Sonhos' : authView === 'signup' ? 'Começar Jornada' : 'Enviar Link'}
            </button>

            {authView === 'reset' && (
                <button type="button" onClick={() => setAuthView('login')} className="w-full py-3 text-gray-400 font-bold uppercase tracking-widest text-[10px] hover:text-gray-600 transition-colors">
                    Voltar para Login
                </button>
            )}
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 relative min-h-screen">
      {(isProcessingImage || isLoadingData || isDeletingAccount) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-[3rem] shadow-2xl flex flex-col items-center gap-4 animate-in zoom-in-95">
             <div className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin" style={{ borderTopColor: 'transparent', borderRightColor: theme.primaryColor, borderBottomColor: theme.primaryColor, borderLeftColor: theme.primaryColor }} />
             <span className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-500">
                {isDeletingAccount ? 'Excluindo dados...' : (isLoadingData ? 'Sincronizando...' : 'Otimizando Imagem...')}
             </span>
          </div>
        </div>
      )}

      <button onClick={() => setIsSettingsVisible(true)} className="fixed top-8 right-8 z-40 p-4 bg-white/90 backdrop-blur-md shadow-2xl rounded-full hover:scale-110 transition-transform border border-white">
        <SlidersIcon className="w-6 h-6" style={{ color: theme.primaryColor }} />
      </button>

      {isSettingsVisible && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setIsSettingsVisible(false)} />
          <div className="relative w-full sm:w-96 bg-white h-full p-6 sm:p-10 shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300">
            <div className="flex justify-between items-center mb-8 sm:mb-10">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsSettingsVisible(false)}
                  className="p-2 -ml-2 rounded-full hover:bg-gray-50 text-gray-400 sm:hidden transition-all"
                >
                  <ChevronLeftIcon className="w-6 h-6" />
                </button>
                <h2 className="text-2xl sm:text-3xl font-black text-gray-800">Ajustes</h2>
              </div>
              <button onClick={handleLogout} className="p-3 bg-rose-50 text-rose-500 rounded-2xl hover:bg-rose-500 hover:text-white transition-all shadow-sm" title="Sair do Portal">
                <LogOutIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-10 pb-20">
              <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-4">
                <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Conta Conectada</p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-gray-500">
                    <UserIcon className="w-6 h-6" style={{ color: theme.primaryColor }} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-gray-800 break-all">{session.user.email}</span>
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-0.5">Provedor: {session.user.app_metadata.provider || 'Local'}</span>
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
                      onChange={e => handleThemeChange({ ...theme, portalTitle: e.target.value })} 
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-5 pr-16 font-bold outline-none focus:bg-white focus:border-[var(--secondary)] transition-all text-gray-800 placeholder:text-gray-300" 
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <div className="relative w-10 h-10 rounded-xl overflow-hidden border-2 border-white shadow-md ring-1 ring-gray-100 group cursor-pointer transition-transform hover:scale-105">
                        <input type="color" value={theme.portalTitleColor} onChange={e => handleThemeChange({ ...theme, portalTitleColor: e.target.value })} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                        <div className="w-full h-full" style={{ backgroundColor: theme.portalTitleColor }} />
                      </div>
                    </div>
                  </div>
                  
                  <div className="relative group">
                    <input 
                      type="text" 
                      placeholder="Subtítulo" 
                      value={theme.portalSubtitle} 
                      onChange={e => handleThemeChange({ ...theme, portalSubtitle: e.target.value })} 
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-5 pr-16 font-bold outline-none focus:bg-white focus:border-[var(--secondary)] transition-all text-gray-800 placeholder:text-gray-300" 
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <div className="relative w-10 h-10 rounded-xl overflow-hidden border-2 border-white shadow-md ring-1 ring-gray-100 group cursor-pointer transition-transform hover:scale-105">
                        <input type="color" value={theme.portalSubtitleColor} onChange={e => handleThemeChange({ ...theme, portalSubtitleColor: e.target.value })} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                        <div className="w-full h-full" style={{ backgroundColor: theme.portalSubtitleColor }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest block mb-4">Plano de Fundo</label>
                <div className="space-y-4">
                  <div 
                    className="relative w-full aspect-video rounded-3xl overflow-hidden bg-gray-100 border-2 border-dashed border-gray-200 flex items-center justify-center group cursor-pointer shadow-inner"
                    onClick={() => bgInputRef.current?.click()}
                  >
                    {theme.backgroundImage ? (
                      <>
                        <img src={theme.backgroundImage} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                           <UploadIcon className="w-8 h-8 text-white" />
                        </div>
                      </>
                    ) : (
                      <div className="text-center text-gray-300">
                        <ImageIcon className="w-8 h-8 mx-auto mb-2" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Subir Foto</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Ou cole a URL aqui..." 
                      value={theme.backgroundImage} 
                      onChange={e => handleThemeChange({ ...theme, backgroundImage: e.target.value })} 
                      className="flex-1 bg-gray-50 border border-gray-100 rounded-2xl p-5 font-bold outline-none focus:bg-white focus:border-[var(--secondary)] transition-all text-gray-800 placeholder:text-gray-300" 
                    />
                    {theme.backgroundImage && (
                      <button 
                        onClick={() => handleThemeChange({ ...theme, backgroundImage: '' })}
                        className="p-5 bg-rose-50 text-rose-500 rounded-2xl hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                        title="Remover imagem"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                  <input type="file" hidden ref={bgInputRef} onChange={handlePortalBgChange} accept="image/*" />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest block mb-6">Paletas</label>
                <div className="grid grid-cols-2 gap-3">
                  {PALETTES.map(p => (
                    <button key={p.name} onClick={() => handleThemeChange({ ...theme, primaryColor: p.primary, secondaryColor: p.secondary, bgGradientStart: p.start, bgGradientEnd: p.end, actionButtonColor: p.primary })} className="group relative">
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
                      onClick={() => handleThemeChange({ ...theme, objectAnimation: anim.id })}
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

              <div className="pt-8 border-t border-gray-100">
                  <button 
                    onClick={() => setIsDeleteAccountModalOpen(true)}
                    className="w-full py-4 text-red-500 font-bold uppercase tracking-widest text-[10px] hover:bg-red-50 rounded-2xl transition-all"
                  >
                    Excluir minha conta
                  </button>
              </div>
            </div>
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
          <StatsBoard 
            items={items} 
            budgetLevels={budgetLevels} 
            onUpdateLevels={handleLevelsChange} 
            initialSavings={initialSavings} 
            onUpdateInitialSavings={handleSavingsChange} 
          />
          
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
              <button type="submit" disabled={isProcessingImage} className="w-full mt-12 py-7 bg-gray-900 text-white rounded-[3rem] font-black text-xl shadow-2xl hover:opacity-90 active:scale-[0.98] transition-all uppercase tracking-[0.3em] disabled:opacity-50">
                {isProcessingImage ? 'Processando Sonho...' : 'Salvar Sonho'}
              </button>
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
        <CalendarView events={events} onAddEvent={addEvent} onDeleteEvent={deleteEvent} />
      )}

      {/* Modal para excluir item */}
      <ConfirmationModal isOpen={!!itemToDelete} onClose={() => setItemToDelete(null)} onConfirm={deleteItem} itemTitle={itemToDelete?.title || ''} />

      {/* Modal para excluir conta */}
      <ConfirmationModal 
        isOpen={isDeleteAccountModalOpen} 
        onClose={() => setIsDeleteAccountModalOpen(false)} 
        onConfirm={handleDeleteAccount}
        title="Excluir Conta Permanentemente?"
        description="Esta ação removerá todos os seus sonhos, eventos e configurações. Não é possível desfazer."
        confirmLabel="Sim, excluir tudo"
        isDanger={true}
      />
      
      <footer className="mt-32 text-center pb-20 opacity-20 text-[11px] font-black uppercase tracking-[0.4em]">
        Portal de Sonhos &bull; {new Date().getFullYear()}
      </footer>
    </div>
  );
};

export default App;
