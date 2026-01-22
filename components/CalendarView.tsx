
import React, { useState, useCallback } from 'react';
import { CalendarEvent } from '../types';
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon, TrashIcon, ExternalLinkIcon, DownloadIcon } from './Icons';

interface CalendarViewProps {
  events: CalendarEvent[];
  onAddEvent: (event: CalendarEvent) => void;
  onDeleteEvent: (id: string) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ events, onAddEvent, onDeleteEvent }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(currentDate);

  const days = [];
  const totalDays = daysInMonth(year, month);
  const startDay = firstDayOfMonth(year, month);

  for (let i = 0; i < startDay; i++) {
    days.push(<div key={`pad-${i}`} className="h-16 sm:h-24 border border-transparent opacity-0"></div>);
  }

  for (let d = 1; d <= totalDays; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isSelected = selectedDate === dateStr;
    const hasEvents = events.some(e => e.date === dateStr);
    const isToday = new Date().toISOString().split('T')[0] === dateStr;

    days.push(
      <button
        key={d}
        onClick={() => setSelectedDate(dateStr)}
        className={`h-16 sm:h-24 border relative flex flex-col items-center justify-center transition-all duration-300 ${
          isSelected ? 'z-10 ring-4 ring-white shadow-xl' : ''
        }`}
        style={{ 
          backgroundColor: isSelected ? 'var(--secondary)' : 'var(--card-bg)',
          borderColor: isSelected ? 'var(--primary)' : 'rgba(0,0,0,0.03)'
        }}
      >
        <span className={`text-base sm:text-xl font-bold ${isToday ? 'underline decoration-2' : ''}`} style={{ color: isSelected ? 'var(--primary)' : 'var(--font-main)' }}>
          {d}
        </span>
        {hasEvents && (
          <div className="absolute bottom-3 flex gap-1">
            <div className="w-2 h-2 rounded-full animate-pulse shadow-sm" style={{ backgroundColor: 'var(--primary)' }}></div>
          </div>
        )}
      </button>
    );
  }

  const selectedDayEvents = events.filter(e => e.date === selectedDate);

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle.trim()) return;
    onAddEvent({ id: crypto.randomUUID(), title: newEventTitle, date: selectedDate });
    setNewEventTitle('');
    setShowAddForm(false);
  };

  const getGoogleCalendarUrl = useCallback((event: CalendarEvent) => {
    const title = encodeURIComponent(event.title);
    const dateFormatted = event.date.replace(/-/g, '');
    const nextDay = new Date(event.date + 'T12:00:00');
    nextDay.setDate(nextDay.getDate() + 1);
    const nextDayFormatted = nextDay.toISOString().split('T')[0].replace(/-/g, '');
    return `https://calendar.google.com/calendar/u/0/r/eventedit?text=${title}&dates=${dateFormatted}/${nextDayFormatted}&details=Marcado+no+CoupleGoals`;
  }, []);

  const getOutlookCalendarUrl = useCallback((event: CalendarEvent) => {
    const title = encodeURIComponent(event.title);
    // Outlook uses ISO format for dates in deep links
    const startDate = `${event.date}T00:00:00Z`;
    const nextDay = new Date(event.date + 'T12:00:00');
    nextDay.setDate(nextDay.getDate() + 1);
    const endDate = `${nextDay.toISOString().split('T')[0]}T00:00:00Z`;
    
    return `https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&subject=${title}&startdt=${startDate}&enddt=${endDate}&allday=true&body=Planejado+no+CoupleGoals`;
  }, []);

  const exportAllToICS = useCallback(() => {
    if (events.length === 0) return;

    let icsContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//CoupleGoals//NONSGML v1.0//BR\nCALSCALE:GREGORIAN\nMETHOD:PUBLISH\n";

    events.forEach(event => {
      const dateFormatted = event.date.replace(/-/g, '');
      const nextDay = new Date(event.date + 'T12:00:00');
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDayFormatted = nextDay.toISOString().split('T')[0].replace(/-/g, '');

      icsContent += "BEGIN:VEVENT\n";
      icsContent += `UID:${event.id}@couplegoals.app\n`;
      icsContent += `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z\n`;
      icsContent += `DTSTART;VALUE=DATE:${dateFormatted}\n`;
      icsContent += `DTEND;VALUE=DATE:${nextDayFormatted}\n`;
      icsContent += `SUMMARY:${event.title}\n`;
      icsContent += "DESCRIPTION:Planejado no nosso portal de sonhos CoupleGoals\n";
      icsContent += "END:VEVENT\n";
    });

    icsContent += "END:VCALENDAR";

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', 'nossos-sonhos.ics');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [events]);

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="bg-white/90 backdrop-blur-md rounded-[2.5rem] shadow-2xl border border-white/50 overflow-hidden">
        <div className="p-8 text-white flex justify-between items-center" style={{ backgroundColor: 'var(--primary)' }}>
          <button onClick={handlePrevMonth} className="hover:bg-white/20 p-3 rounded-full transition-colors"><ChevronLeftIcon className="w-8 h-8" /></button>
          <div className="text-center">
            <h2 className="text-3xl font-cursive capitalize">{monthName} {year}</h2>
            {events.length > 0 && (
              <button 
                onClick={exportAllToICS}
                className="mt-1 text-[10px] font-black uppercase tracking-widest bg-white/10 hover:bg-white/25 px-3 py-1 rounded-full transition-colors flex items-center gap-2 mx-auto"
              >
                <DownloadIcon className="w-3 h-3" /> Exportar Tudo (.ics)
              </button>
            )}
          </div>
          <button onClick={handleNextMonth} className="hover:bg-white/20 p-3 rounded-full transition-colors"><ChevronRightIcon className="w-8 h-8" /></button>
        </div>
        <div className="grid grid-cols-7 text-center border-b border-gray-100 bg-gray-50/50">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
            <div key={d} className="py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">{days}</div>
      </div>

      <div className="bg-white/95 backdrop-blur-sm p-10 rounded-[2.5rem] shadow-xl border border-white/50">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-2xl font-bold" style={{ color: 'var(--font-main)' }}>
            {new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', weekday: 'long' })}
          </h3>
          <button 
            onClick={() => setShowAddForm(!showAddForm)}
            className="p-3 rounded-full hover:scale-110 transition-transform shadow-md"
            style={{ backgroundColor: 'var(--secondary)', color: 'var(--primary)' }}
          >
            <PlusIcon className="w-7 h-7" />
          </button>
        </div>

        {showAddForm && (
          <form onSubmit={handleAddEvent} className="mb-10 flex gap-3">
            <input 
              type="text" autoFocus placeholder="O que temos planejado?" value={newEventTitle}
              onChange={(e) => setNewEventTitle(e.target.value)}
              className="flex-1 px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-pink-300 rounded-2xl outline-none transition-all text-gray-800 text-lg"
            />
            <button 
              type="submit" 
              className="px-8 py-4 font-bold rounded-2xl shadow-lg transition-all active:scale-95 text-white" 
              style={{ backgroundColor: 'var(--action-btn)' }}
            >
                Salvar
            </button>
          </form>
        )}

        <div className="space-y-4">
          {selectedDayEvents.length === 0 ? (
            <div className="text-center py-10"><p className="text-gray-300 italic text-lg">Nada marcado ainda...</p></div>
          ) : (
            selectedDayEvents.map(event => (
              <div key={event.id} className="flex justify-between items-center p-5 rounded-2xl group transition-all hover:translate-x-1" style={{ backgroundColor: 'var(--secondary)', opacity: 0.8 }}>
                <span className="font-bold text-lg" style={{ color: 'var(--font-main)' }}>{event.title}</span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                  <a 
                    href={getGoogleCalendarUrl(event)} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    title="Adicionar ao Google Agenda"
                    className="text-gray-400 hover:text-pink-500 p-2 transition-colors"
                  >
                    <div className="flex flex-col items-center">
                      <ExternalLinkIcon className="w-5 h-5" />
                      <span className="text-[8px] font-black uppercase mt-0.5">Google</span>
                    </div>
                  </a>
                  <a 
                    href={getOutlookCalendarUrl(event)} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    title="Adicionar ao Outlook"
                    className="text-gray-400 hover:text-blue-500 p-2 transition-colors"
                  >
                    <div className="flex flex-col items-center">
                      <ExternalLinkIcon className="w-5 h-5" />
                      <span className="text-[8px] font-black uppercase mt-0.5">Outlook</span>
                    </div>
                  </a>
                  <button 
                    onClick={() => onDeleteEvent(event.id)} 
                    title="Excluir"
                    className="text-gray-400 hover:text-red-500 p-2 transition-colors"
                  >
                    <div className="flex flex-col items-center">
                      <TrashIcon className="w-5 h-5" />
                      <span className="text-[8px] font-black uppercase mt-0.5">Apagar</span>
                    </div>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default CalendarView;
