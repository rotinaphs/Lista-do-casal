
import React, { useState, useMemo } from 'react';
import { ChecklistItem, ItemStatus, BudgetLevel } from '../types';
import { TrashIcon, GearIcon, PencilIcon, CheckIcon, RefreshIcon, PlusIcon } from './Icons';

interface StatsBoardProps {
  items: ChecklistItem[];
  budgetLevels: BudgetLevel[];
  onUpdateLevels: (levels: BudgetLevel[]) => void;
  initialSavings: number;
  onUpdateInitialSavings: (value: number) => void;
}

const StatsBoard: React.FC<StatsBoardProps> = ({ items, budgetLevels, onUpdateLevels, initialSavings, onUpdateInitialSavings }) => {
  const [isManagingLevels, setIsManagingLevels] = useState(false);
  const [isEditingSavings, setIsEditingSavings] = useState(false);
  const [tempAddValue, setTempAddValue] = useState('');
  
  const [editingLevelId, setEditingLevelId] = useState<string | null>(null);
  const [editLevelLabel, setEditLevelLabel] = useState('');
  const [editLevelTarget, setEditLevelTarget] = useState('');

  const [newLevelLabel, setNewLevelLabel] = useState('');
  const [newLevelTarget, setNewLevelTarget] = useState('');

  const totalBudget = useMemo(() => items.reduce((acc, item) => acc + item.price, 0), [items]);
  
  const investedBudget = useMemo(() => {
    const fromItems = items.reduce((acc, item) => {
      // Uso da porcentagem exata de progresso (0-100)
      const progressFraction = (item.progress ?? 0) / 100;
      const itemPrice = item.price || 0;
      return acc + (itemPrice * progressFraction);
    }, 0);
    return fromItems + (initialSavings || 0);
  }, [items, initialSavings]);
  
  const progressPercent = totalBudget > 0 
    ? Math.round(Math.min((investedBudget / totalBudget) * 100, 100))
    : 0;

  const sortedLevels = useMemo(() => [...budgetLevels].sort((a, b) => a.target - b.target), [budgetLevels]);

  const currentLevel = useMemo(() => {
    return [...sortedLevels].reverse().find(level => investedBudget >= level.target) || null;
  }, [sortedLevels, investedBudget]);

  const nextLevel = useMemo(() => {
    return [...sortedLevels].sort((a, b) => a.target - b.target).find(level => investedBudget < level.target);
  }, [sortedLevels, investedBudget]);

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const handleSavingsAdd = () => {
    const toAdd = parseFloat(tempAddValue) || 0;
    if (toAdd > 0) {
      onUpdateInitialSavings(initialSavings + toAdd);
    }
    setTempAddValue('');
    setIsEditingSavings(false);
  };

  const handleResetSavings = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdateInitialSavings(0);
    setTempAddValue('');
  };

  const addLevel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLevelLabel.trim() || !newLevelTarget) return;
    const newLevel: BudgetLevel = {
      id: crypto.randomUUID(),
      label: newLevelLabel,
      target: parseFloat(newLevelTarget)
    };
    onUpdateLevels([...budgetLevels, newLevel]);
    setNewLevelLabel('');
    setNewLevelTarget('');
  };

  const removeLevel = (id: string) => {
    onUpdateLevels(budgetLevels.filter(l => l.id !== id));
  };

  const startEditingLevel = (level: BudgetLevel) => {
    setEditingLevelId(level.id);
    setEditLevelLabel(level.label);
    setEditLevelTarget(level.target.toString());
  };

  const saveEditedLevel = () => {
    if (!editingLevelId) return;
    onUpdateLevels(budgetLevels.map(l => 
      l.id === editingLevelId 
        ? { ...l, label: editLevelLabel, target: parseFloat(editLevelTarget) || 0 }
        : l
    ));
    setEditingLevelId(null);
  };

  return (
    <div className="space-y-8 mb-16">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Meta Total */}
        <div className="bg-white/10 backdrop-blur-md p-6 rounded-[3rem] border-2 border-white/40 shadow-xl flex items-center justify-center">
          <div className="bg-white/80 p-8 rounded-[2.5rem] w-full flex flex-col items-center justify-center">
            <span className="text-[10px] uppercase tracking-[0.2em] font-black mb-2" style={{ color: 'var(--primary)' }}>Meta dos Sonhos</span>
            <span className="text-3xl font-black text-gray-800 tracking-tighter">
              {formatCurrency(totalBudget)}
            </span>
          </div>
        </div>
        
        {/* Valor Acumulado */}
        <div className="bg-white/10 backdrop-blur-md p-6 rounded-[3rem] border-2 border-white/40 shadow-xl flex items-center justify-center">
          <div className="bg-white/80 p-8 rounded-[2.5rem] w-full flex flex-col items-center justify-center">
            <span className="text-[10px] uppercase tracking-[0.2em] font-black mb-2" style={{ color: 'var(--primary)' }}>Valor Acumulado</span>
            <span className="text-4xl font-black tracking-tighter mb-4" style={{ color: 'var(--primary)' }}>
              {formatCurrency(investedBudget)}
            </span>
            
            <div className="flex items-center gap-2">
              {isEditingSavings ? (
                <div className="flex items-center animate-in fade-in zoom-in-95 duration-200">
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-[10px]" style={{ color: 'var(--primary)' }}>+</span>
                    <input 
                      autoFocus
                      type="number" 
                      step="0.01" 
                      value={tempAddValue} 
                      onChange={e => setTempAddValue(e.target.value)} 
                      onBlur={handleSavingsAdd}
                      onKeyDown={e => e.key === 'Enter' && handleSavingsAdd()}
                      className="w-32 text-center pl-6 bg-gray-100/50 border border-gray-200 rounded-full py-2 text-xs font-black outline-none"
                      style={{ color: 'var(--primary)' }}
                      placeholder="Somar"
                    />
                  </div>
                </div>
              ) : (
                <>
                  <button 
                    onClick={() => { setTempAddValue(''); setIsEditingSavings(true); }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gray-200/60 hover:bg-gray-300/60 rounded-full transition-all duration-300 active:scale-95 group/reserva"
                  >
                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">
                      Reserva: {formatCurrency(initialSavings)} +
                    </span>
                  </button>
                  
                  <button 
                    onClick={handleResetSavings}
                    title="Zerar Reserva"
                    className="p-2.5 bg-rose-100 hover:bg-rose-500 hover:text-white rounded-full text-rose-500 transition-all duration-300 shadow-sm active:scale-90 flex items-center justify-center"
                  >
                    <RefreshIcon className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Progresso Geral */}
        <div className="bg-white/10 backdrop-blur-md p-6 rounded-[3rem] border-2 border-white/40 shadow-xl flex items-center justify-center">
          <div className="bg-white/80 p-8 rounded-[2.5rem] w-full flex flex-col justify-center">
            <div className="flex justify-between items-center mb-4">
              <span className="text-gray-400 text-[10px] uppercase tracking-[0.2em] font-black">Progresso Geral</span>
              <span className="font-black text-3xl" style={{ color: 'var(--primary)' }}>{progressPercent}%</span>
            </div>
            <div className="w-full bg-gray-200/50 rounded-full h-3 relative overflow-hidden shadow-inner">
              <div 
                className="h-full rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${progressPercent}%`, backgroundColor: 'var(--primary)' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Marcos de Conquista */}
      <div className="bg-white/70 backdrop-blur-xl p-10 rounded-[3.5rem] border-4 border-white shadow-2xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] mb-1" style={{ color: 'var(--primary)' }}>Marcos de Conquista</h4>
            <p className="text-2xl font-black text-gray-800 tracking-tight">
              {currentLevel ? `Nível Atual: ${currentLevel.label}` : 'Nível Atual: Começando a Jornada'}
            </p>
          </div>
          <button 
            onClick={() => setIsManagingLevels(!isManagingLevels)}
            className="flex items-center gap-2 px-6 py-3 bg-white/60 hover:bg-white rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all border border-gray-100 shadow-sm"
          >
            <GearIcon className="w-4 h-4" />
            Gerenciar Marcos
          </button>
        </div>

        {isManagingLevels && (
          <div className="mb-10 p-8 bg-white/40 rounded-[2.5rem] border-2 border-dashed border-gray-100 animate-in slide-in-from-top-4 duration-300">
            <form onSubmit={addLevel} className="flex flex-wrap gap-4 mb-8">
              <input 
                required placeholder="Nome do Marco" 
                value={newLevelLabel} onChange={e => setNewLevelLabel(e.target.value)}
                className="flex-1 min-w-[180px] px-5 py-3.5 bg-white rounded-xl border border-gray-100 font-bold outline-none text-sm"
              />
              <input 
                required type="number" placeholder="Valor (R$)" 
                value={newLevelTarget} onChange={e => setNewLevelTarget(e.target.value)}
                className="w-32 px-5 py-3.5 bg-white rounded-xl border border-gray-100 font-black outline-none text-sm"
                style={{ color: 'var(--primary)' }}
              />
              <button type="submit" className="px-8 py-3.5 bg-gray-900 text-white font-black rounded-xl uppercase tracking-widest text-[10px] hover:opacity-90 transition-all active:scale-95">
                ADICIONAR
              </button>
            </form>

            <div className="space-y-3">
              {[...budgetLevels].sort((a,b) => a.target - b.target).map(level => (
                <div key={level.id} className="flex justify-between items-center bg-white p-4 rounded-2xl border border-gray-50 shadow-sm">
                  {editingLevelId === level.id ? (
                    <div className="flex flex-1 gap-2">
                      <input className="flex-1 bg-gray-50 border-none p-2 rounded-lg font-bold text-xs" value={editLevelLabel} onChange={e => setEditLevelLabel(e.target.value)} />
                      <input className="w-24 bg-gray-50 border-none p-2 rounded-lg font-black text-xs" style={{ color: 'var(--primary)' }} type="number" value={editLevelTarget} onChange={e => setEditLevelTarget(e.target.value)} />
                      <button onClick={saveEditedLevel} className="p-2 text-white rounded-lg" style={{ backgroundColor: 'var(--primary)' }}><CheckIcon className="w-3 h-3" /></button>
                      <button onClick={() => setEditingLevelId(null)} className="p-2 bg-gray-100 text-gray-400 rounded-lg text-[10px] font-black">X</button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-4">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--primary)' }} />
                        <span className="font-bold text-gray-800 text-sm">{level.label}</span>
                        <span className="font-black text-[11px]" style={{ color: 'var(--primary)' }}>{formatCurrency(level.target)}</span>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => startEditingLevel(level)} className="p-2 text-gray-300 hover:text-gray-500 transition-all"><PencilIcon className="w-4 h-4" /></button>
                        <button onClick={() => removeLevel(level.id)} className="p-2 text-gray-300 hover:text-red-500 transition-all"><TrashIcon className="w-4 h-4" /></button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {budgetLevels.length > 0 ? (
          <div className="space-y-6">
            <div className="relative h-4 bg-gray-200/40 rounded-full shadow-inner p-0.5">
              {(() => {
                const maxTarget = Math.max(...budgetLevels.map(l => l.target), totalBudget, 1);
                const currentProgress = Math.min((investedBudget / maxTarget) * 100, 100);
                
                return (
                  <div 
                    className="absolute top-0.5 left-0.5 h-3 rounded-full transition-all duration-1000"
                    style={{ width: `calc(${currentProgress}% - 4px)`, backgroundColor: 'var(--primary)' }}
                  />
                );
              })()}

              {[...budgetLevels].sort((a,b) => a.target - b.target).map(level => {
                const maxTarget = Math.max(...budgetLevels.map(l => l.target), totalBudget, 1);
                const pos = (level.target / maxTarget) * 100;
                const isReached = investedBudget >= level.target;

                return (
                  <div 
                    key={level.id} 
                    className="absolute top-1/2 -translate-y-1/2"
                    style={{ left: `${pos}%` }}
                  >
                    <div className={`w-3.5 h-3.5 -ml-1.75 rounded-full border-2 border-white shadow-md transition-all duration-700 ${isReached ? '' : 'bg-white'}`} style={isReached ? { backgroundColor: 'var(--primary)' } : {}} />
                  </div>
                );
              })}
            </div>
            
            <div className="flex justify-between items-start pt-1">
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Estado Atual</span>
                <span className="font-black text-lg text-gray-700">{formatCurrency(investedBudget)}</span>
              </div>
              
              {nextLevel && (
                <div className="text-right flex flex-col items-end">
                  <span className="text-[9px] font-black uppercase tracking-widest mb-1" style={{ color: 'var(--primary)' }}>Próxima Conquista</span>
                  <p className="font-black text-lg text-gray-800">
                    {nextLevel.label} ({formatCurrency(nextLevel.target)})
                  </p>
                  <span className="text-[10px] font-bold text-gray-400 mt-0.5">
                    Faltam {formatCurrency(Math.max(0, nextLevel.target - investedBudget))}
                  </span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-10 opacity-30 border-2 border-dashed border-gray-100 rounded-[2.5rem]">
            <p className="text-[11px] font-black uppercase tracking-widest">Crie marcos para celebrar a jornada!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatsBoard;
