
import React, { memo, useCallback } from 'react';
import { ChecklistItem, ItemStatus } from '../types';
import { TrashIcon, CheckIcon, ExternalLinkIcon, ImageIcon } from './Icons';

interface ChecklistItemListRowProps {
  item: ChecklistItem;
  onUpdateItem: (id: string, updates: Partial<ChecklistItem>) => void;
  onDelete: () => void;
}

const ChecklistItemListRow: React.FC<ChecklistItemListRowProps> = memo(({ item, onUpdateItem, onDelete }) => {
  const isDone = item.progress === 100;
  
  const handleProgressChange = useCallback((newProgress: number) => {
    let newStatus = ItemStatus.IN_PROGRESS;
    if (newProgress === 0) newStatus = ItemStatus.PENDING;
    else if (newProgress === 100) newStatus = ItemStatus.DONE;
    else if (newProgress >= 80) newStatus = ItemStatus.ALMOST_THERE;

    onUpdateItem(item.id, { progress: newProgress, status: newStatus });
  }, [item.id, onUpdateItem]);

  return (
    <div className={`group flex items-center p-3 rounded-[1.5rem] transition-all duration-300 border-2 border-white shadow-sm hover:shadow-lg hover:-translate-y-1 mb-3
      ${isDone ? 'bg-green-50/80' : 'bg-white/90 backdrop-blur-sm'}`}>
      
      {/* Thumbnail */}
      <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 bg-gray-50 border border-gray-100 relative">
        {item.image ? (
          <img 
            src={item.image} 
            alt={item.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
             <ImageIcon className="w-6 h-6 text-gray-200" />
          </div>
        )}
        {isDone && (
          <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
            <CheckIcon className="w-6 h-6 text-white drop-shadow-md" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 px-4 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className={`text-sm font-bold truncate ${isDone ? 'text-gray-500 line-through decoration-green-500/50' : 'text-gray-800'}`}>
            {item.title}
          </h3>
          {item.link && (
            <a 
              href={item.link} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-gray-400 hover:text-[var(--primary)] transition-colors"
            >
              <ExternalLinkIcon className="w-3 h-3" />
            </a>
          )}
        </div>
        <p className="text-xs font-black" style={{ color: isDone ? undefined : 'var(--primary)' }}>
           {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price)}
        </p>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        {/* Compact Progress */}
        <div className="flex flex-col items-end w-24 sm:w-32">
          <div className="flex justify-between w-full mb-1">
             <span className="text-[9px] font-black text-gray-300 uppercase">{item.progress}%</span>
          </div>
          <div className="relative w-full h-2 bg-gray-100 rounded-full overflow-hidden">
             <div 
               className={`absolute top-0 left-0 h-full rounded-full transition-all duration-300 ${isDone ? 'bg-green-500' : ''}`}
               style={{ width: `${item.progress}%`, backgroundColor: isDone ? undefined : 'var(--primary)' }}
             />
             <input 
               type="range"
               min="0" max="100"
               value={item.progress}
               onChange={(e) => handleProgressChange(parseInt(e.target.value))}
               className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
             />
          </div>
        </div>

        {/* Actions */}
        <button 
          onClick={onDelete}
          className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
        >
          <TrashIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
});

export default ChecklistItemListRow;
