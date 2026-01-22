
import React, { memo } from 'react';

interface StatusBadgeProps {
  progress: number;
  onChange: (newProgress: number) => void;
}

const StatusBadge: React.FC<StatusBadgeProps> = memo(({ progress, onChange }) => {
  const getStatusLabel = (p: number) => {
    if (p === 0) return 'PENDENTE';
    if (p === 100) return 'REALIZADO';
    if (p >= 80) return 'QUASE LÁ';
    return 'EM PROCESSO';
  };

  const currentLabel = getStatusLabel(progress);
  const isDone = progress === 100;

  return (
    <div className="w-full mt-6 select-none">
      <div className="flex justify-between items-end mb-3 px-1">
        <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">
          PROGRESSO
        </span>
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest mb-1 transition-all">
            {currentLabel}
          </span>
          <span className={`text-3xl font-black uppercase tracking-tighter transition-all ${isDone ? 'text-green-500' : ''}`} style={!isDone ? { color: 'var(--primary)' } : {}}>
            {progress}%
          </span>
        </div>
      </div>
      
      <div className="relative h-10 flex items-center justify-center mb-6">
        {/* Background Track */}
        <div className="absolute left-0 right-0 h-4 bg-gray-100/80 rounded-full overflow-hidden shadow-inner">
          {/* Active Fill */}
          <div 
            className={`absolute left-0 top-0 bottom-0 transition-all duration-100 ease-out ${isDone ? 'bg-gradient-to-r from-green-400 to-green-500' : ''}`}
            style={{ width: `${progress}%`, backgroundColor: isDone ? undefined : 'var(--primary)' }}
          />
        </div>

        {/* Input Range - The interaction layer */}
        <input 
          type="range" 
          min="0" 
          max="100" 
          step="1"
          value={progress}
          onChange={(e) => onChange(parseInt(e.target.value, 10))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30"
          style={{ margin: 0 }}
        />
        
        {/* Markers on Track */}
        <div className="absolute left-0 right-0 h-4 pointer-events-none z-10">
          {[0, 30, 80, 100].map(mark => {
            const isActive = progress >= mark;
            return (
              <div 
                key={mark}
                className={`absolute top-1/2 -translate-y-1/2 transform -translate-x-1/2 w-4 h-4 rounded-full border-[3px] border-white transition-all duration-300 shadow-sm
                  ${isActive ? (isDone ? 'bg-green-500 scale-110' : 'scale-110') : 'bg-gray-200'}
                `}
                style={{ left: `${mark}%`, backgroundColor: isActive && !isDone ? 'var(--primary)' : undefined }}
              />
            );
          })}
        </div>

        {/* Floating Thumb - Visual Feedback */}
        <div 
          className={`absolute h-7 w-7 border-[4px] border-white rounded-full shadow-lg transition-transform duration-75 pointer-events-none z-20 
            ${isDone ? 'bg-green-500' : ''}
          `}
          style={{ 
            left: `${progress}%`,
            transform: 'translateX(-50%)',
            backgroundColor: isDone ? undefined : 'var(--primary)'
          }}
        />
      </div>

       <div className="flex justify-between px-1 relative h-4">
          <span className="text-[10px] font-bold text-gray-300 absolute left-0 transform -translate-x-1/2" style={{ left: '0%' }}>0%</span>
          <span className="text-[10px] font-bold text-gray-300 absolute left-0 transform -translate-x-1/2" style={{ left: '30%' }}>30%</span>
          <span className="text-[10px] font-bold text-gray-300 absolute left-0 transform -translate-x-1/2" style={{ left: '80%' }}>80%</span>
          <span className="text-[10px] font-bold text-gray-300 absolute right-0 transform translate-x-1/2" style={{ right: '0%' }}>100%</span>
       </div>
    </div>
  );
});

export default StatusBadge;
