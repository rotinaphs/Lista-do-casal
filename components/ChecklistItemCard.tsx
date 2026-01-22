
import React, { useRef, useState, memo, useCallback, useEffect } from 'react';
import { ChecklistItem, ItemStatus } from '../types';
import { TrashIcon, CheckIcon, PencilIcon, ImageIcon, CropIcon, RefreshIcon, ExternalLinkIcon } from './Icons';
import StatusBadge from './StatusBadge';
import { resizeImage } from '../utils';

interface ChecklistItemCardProps {
  item: ChecklistItem;
  onUpdateItem: (id: string, updates: Partial<ChecklistItem>) => void;
  onDelete: () => void;
}

const ChecklistItemCard: React.FC<ChecklistItemCardProps> = memo(({ item, onUpdateItem, onDelete }) => {
  const isDone = item.progress === 100;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  
  const [isEditing, setIsEditing] = useState(false);
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, initialX: 50, initialY: 50 });
  const [editValues, setEditValues] = useState({ 
    title: item.title, 
    price: item.price.toString(),
    link: item.link || ''
  });

  useEffect(() => {
    if (isEditing) setEditValues({ 
      title: item.title, 
      price: item.price.toString(),
      link: item.link || ''
    });
  }, [isEditing, item.title, item.price, item.link]);

  const { 
    imageFit = 'cover', 
    imageScale = 1, 
    imagePositionX = 50, 
    imagePositionY = 50 
  } = item;

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const result = await resizeImage(reader.result as string);
          onUpdateItem(item.id, { 
            image: result,
            imageScale: 1, 
            imagePositionX: 50, 
            imagePositionY: 50,
            imageFit: 'cover'
          });
          setIsAdjusting(true);
        };
        reader.readAsDataURL(file);
      } catch (err) {
        console.error('Falha ao atualizar imagem do item:', err);
      }
    }
  };

  const saveEdits = useCallback(() => {
    onUpdateItem(item.id, { 
      title: editValues.title, 
      price: parseFloat(editValues.price) || 0,
      link: editValues.link
    });
    setIsEditing(false);
  }, [editValues, item.id, onUpdateItem]);

  const handleStart = (clientX: number, clientY: number) => {
    if (!isAdjusting) return;
    setIsDragging(true);
    setDragStart({ 
      x: clientX, 
      y: clientY, 
      initialX: imagePositionX, 
      initialY: imagePositionY 
    });
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!isDragging || !imageContainerRef.current) return;

    const rect = imageContainerRef.current.getBoundingClientRect();
    const deltaX = ((clientX - dragStart.x) / rect.width) * 100;
    const deltaY = ((clientY - dragStart.y) / rect.height) * 100;

    onUpdateItem(item.id, {
      imagePositionX: Math.max(0, Math.min(100, dragStart.initialX + deltaX)),
      imagePositionY: Math.max(0, Math.min(100, dragStart.initialY + deltaY))
    });
  };

  const handleEnd = () => {
    setIsDragging(false);
  };

  const handleScaleChange = (newScale: number) => {
    onUpdateItem(item.id, { imageScale: newScale });
  };

  const toggleFit = () => {
    onUpdateItem(item.id, { imageFit: imageFit === 'cover' ? 'contain' : 'cover' });
  };

  const resetAdjustments = () => {
    onUpdateItem(item.id, {
      imageScale: 1,
      imagePositionX: 50,
      imagePositionY: 50,
      imageFit: 'cover'
    });
  };

  const handleProgressChange = useCallback((newProgress: number) => {
    let newStatus = ItemStatus.IN_PROGRESS;
    if (newProgress === 0) newStatus = ItemStatus.PENDING;
    else if (newProgress === 100) newStatus = ItemStatus.DONE;
    else if (newProgress >= 80) newStatus = ItemStatus.ALMOST_THERE;

    onUpdateItem(item.id, { progress: newProgress, status: newStatus });
  }, [item.id, onUpdateItem]);

  return (
    <div className={`group relative rounded-[3.5rem] transition-all duration-700 overflow-hidden border-4 border-white shadow-[0_20px_60px_rgba(0,0,0,0.05)] hover:shadow-[0_40px_100px_rgba(0,0,0,0.1)] hover:-translate-y-2
      ${isDone ? 'bg-green-50/20 shadow-green-100/50' : 'bg-white/90 backdrop-blur-sm'}`}>
      
      {/* Imagem do Item */}
      <div 
        ref={imageContainerRef}
        className={`w-full h-80 overflow-hidden relative bg-gray-50/50 ${isAdjusting ? 'cursor-move ring-inset ring-8' : ''}`}
        style={isAdjusting ? { '--tw-ring-color': 'var(--secondary)' } as React.CSSProperties : {}}
        onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
        onMouseMove={(e) => handleMove(e.clientX, e.clientY)}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={(e) => handleStart(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchMove={(e) => handleMove(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchEnd={handleEnd}
      >
        {item.image ? (
          <img 
            src={item.image} 
            alt={item.title} 
            draggable={false}
            className={`w-full h-full transition-transform duration-75 pointer-events-none select-none ${imageFit === 'contain' ? 'object-contain p-8' : 'object-cover'}`}
            style={{ 
              transform: `scale(${imageScale}) translate(${imagePositionX - 50}%, ${imagePositionY - 50}%)`,
              backgroundColor: imageFit === 'contain' ? 'var(--secondary)' : 'transparent'
            }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-200">
            <ImageIcon className="w-16 h-16 mb-4 opacity-10" />
            <span className="text-[11px] font-black uppercase tracking-[0.3em] opacity-20">Inspirar Sonho</span>
          </div>
        )}

        {isAdjusting && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-white/95 backdrop-blur-xl px-6 py-3 rounded-full shadow-2xl border border-gray-100 animate-in slide-in-from-bottom-4 duration-300 z-30">
            <div className="flex items-center gap-3">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Zoom</span>
              <input 
                type="range" 
                min="0.5" 
                max="5" 
                step="0.05" 
                value={imageScale} 
                onChange={(e) => handleScaleChange(parseFloat(e.target.value))}
                className="w-24 h-1.5 bg-gray-100 rounded-full appearance-none cursor-pointer"
                style={{ accentColor: 'var(--primary)' }}
              />
            </div>
            <div className="h-4 w-px bg-gray-200" />
            <button 
              onClick={(e) => { e.stopPropagation(); toggleFit(); }}
              className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-lg transition-colors ${imageFit === 'contain' ? 'bg-[var(--secondary)] text-[var(--primary)]' : 'bg-gray-100 text-gray-500'}`}
              style={imageFit === 'contain' ? { backgroundColor: 'var(--secondary)', color: 'var(--primary)' } : {}}
            >
              {imageFit === 'cover' ? 'Cortar' : 'Ajustar'}
            </button>
            <div className="h-4 w-px bg-gray-200" />
            <button 
              onClick={(e) => { e.stopPropagation(); resetAdjustments(); }}
              className="group/reset flex items-center gap-2 text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            >
              <RefreshIcon className="w-3 h-3" />
              Reset
            </button>
            <div className="h-4 w-px bg-gray-200" />
            <button 
              onClick={(e) => { e.stopPropagation(); setIsAdjusting(false); }}
              className="text-[9px] font-black uppercase tracking-widest bg-gray-900 text-white px-4 py-1.5 rounded-full"
            >
              Ok
            </button>
          </div>
        )}

        <div className="absolute top-6 right-6 flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity z-20">
          {item.image && (
            <button 
              onClick={(e) => { e.stopPropagation(); setIsAdjusting(!isAdjusting); }} 
              className={`p-4 backdrop-blur rounded-full shadow-xl transition-all ${isAdjusting ? 'text-white' : 'bg-white/90 text-gray-400 hover:text-[var(--primary)]'}`}
              style={isAdjusting ? { backgroundColor: 'var(--primary)' } : {}}
              title="Ajustar Imagem"
            >
              <CropIcon className="w-5 h-5" />
            </button>
          )}
          <button onClick={(e) => { e.stopPropagation(); setIsEditing(true); }} className="p-4 bg-white/90 backdrop-blur rounded-full shadow-xl text-gray-400 hover:text-[var(--primary)] transition-all" style={{ '--tw-text-opacity': 1 } as React.CSSProperties} title="Editar"><PencilIcon className="w-5 h-5" /></button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-4 bg-white/90 backdrop-blur rounded-full shadow-xl text-gray-400 hover:text-red-500 transition-all" title="Remover"><TrashIcon className="w-5 h-5" /></button>
        </div>

        <button 
          onClick={() => fileInputRef.current?.click()}
          className="absolute bottom-6 left-6 p-4 bg-white/90 backdrop-blur rounded-full shadow-xl text-gray-400 hover:text-[var(--primary)] opacity-0 group-hover:opacity-100 transition-opacity z-20"
        >
          <ImageIcon className="w-5 h-5" />
        </button>
        <input type="file" hidden ref={fileInputRef} accept="image/*" onChange={handleImageChange} />
      </div>

      {/* Conteúdo do Card */}
      <div className="p-10">
        {isEditing ? (
          <div className="space-y-4">
            <input value={editValues.title} onChange={e => setEditValues(v => ({ ...v, title: e.target.value }))} className="w-full px-6 py-4 text-lg font-bold border-2 rounded-3xl outline-none" style={{ borderColor: 'var(--secondary)' }} placeholder="Título do Sonho" />
            <input value={editValues.link} onChange={e => setEditValues(v => ({ ...v, link: e.target.value }))} className="w-full px-6 py-4 text-sm font-bold text-gray-600 border-2 rounded-3xl outline-none" style={{ borderColor: 'var(--secondary)' }} placeholder="Link do produto (https://...)" />
            <input type="number" value={editValues.price} onChange={e => setEditValues(v => ({ ...v, price: e.target.value }))} className="w-full px-6 py-4 text-2xl font-black border-2 rounded-3xl outline-none" style={{ borderColor: 'var(--secondary)', color: 'var(--primary)' }} placeholder="Preço" />
            <div className="flex gap-4">
              <button onClick={saveEdits} className="flex-1 py-4 text-white font-black rounded-3xl uppercase tracking-widest text-[11px]" style={{ backgroundColor: 'var(--primary)' }}>Salvar</button>
              <button onClick={() => setIsEditing(false)} className="px-8 py-4 bg-gray-100 text-gray-400 font-black rounded-3xl uppercase tracking-widest text-[11px]">Sair</button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-start mb-2">
              <h3 className={`text-3xl font-bold tracking-tight truncate transition-colors ${isDone ? 'text-gray-400' : 'text-gray-800'} flex-1`}>{item.title}</h3>
              {item.link && (
                <a 
                  href={item.link} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="ml-2 p-2 rounded-full transition-colors shadow-sm"
                  style={{ backgroundColor: 'var(--secondary)', color: 'var(--primary)' }}
                  title="Ver Produto"
                  onClick={e => e.stopPropagation()}
                >
                  <ExternalLinkIcon className="w-5 h-5" />
                </a>
              )}
            </div>
            <p className="text-4xl font-black tracking-tighter" style={isDone ? { color: '#10b981', opacity: 0.6 } : { color: 'var(--primary)' }}>
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price)}
            </p>
          </>
        )}
        
        <StatusBadge 
          progress={item.progress}
          onChange={handleProgressChange}
        />
      </div>

      {isDone && (
        <div className="absolute top-8 left-8 bg-[#22c55e] rounded-full p-4 border-[6px] border-white shadow-2xl animate-check-pop z-10">
          <CheckIcon className="w-10 h-10 text-white" pathClassName="animate-check-draw" />
        </div>
      )}
    </div>
  );
});

export default ChecklistItemCard;
