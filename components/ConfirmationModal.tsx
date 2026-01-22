
import React from 'react';
import { TrashIcon } from './Icons';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemTitle: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onClose, onConfirm, itemTitle }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity animate-in fade-in duration-300" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-pink-50">
        <div className="p-8 text-center">
          <div className="mx-auto w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
            <TrashIcon className="w-8 h-8" />
          </div>
          
          <h3 className="text-2xl font-bold text-gray-800 mb-3">Tem certeza?</h3>
          <p className="text-gray-500 mb-8 leading-relaxed">
            Você está prestes a remover <span className="font-bold text-gray-700">"{itemTitle}"</span> da nossa lista de sonhos. Essa ação não pode ser desfeita.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <button 
              onClick={onClose}
              className="flex-1 px-6 py-4 rounded-2xl font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
            <button 
              onClick={onConfirm}
              className="flex-1 px-6 py-4 rounded-2xl font-bold text-white bg-gradient-to-r from-red-500 to-rose-600 hover:shadow-lg hover:shadow-red-200 transition-all transform active:scale-95"
            >
              Sim, remover
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
