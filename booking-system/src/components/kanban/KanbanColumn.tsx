import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { KanbanCard, BookingType } from './KanbanCard';

interface Props {
  id: string;
  title: string;
  items: BookingType[];
}

export function KanbanColumn({ id, title, items }: Props) {
  const { setNodeRef, isOver } = useDroppable({
    id: id,
  });

  const getHeaderColor = (statusId: string) => {
    switch(statusId) {
      case 'inquiry': return 'bg-gray-100 text-gray-800 border-b-gray-200';
      case 'consultation_scheduled': return 'bg-purple-50 text-purple-800 border-b-purple-100';
      case 'pending_deposit': return 'bg-yellow-50 text-yellow-800 border-b-yellow-100';
      case 'confirmed': return 'bg-blue-50 text-blue-800 border-b-blue-100';
      case 'completed': return 'bg-green-50 text-green-800 border-b-green-100';
      default: return 'bg-white text-gray-800 border-b-gray-200';
    }
  };

  const getBadgeColor = (statusId: string) => {
    switch(statusId) {
      case 'inquiry': return 'bg-gray-200 text-gray-700';
      case 'consultation_scheduled': return 'bg-purple-100 text-purple-700';
      case 'pending_deposit': return 'bg-yellow-100 text-yellow-700';
      case 'confirmed': return 'bg-blue-100 text-blue-700';
      case 'completed': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="flex flex-col flex-shrink-0 w-80 bg-gray-50/80 rounded-xl border border-gray-200 shadow-sm">
      <div className={`p-4 border-b rounded-t-xl flex justify-between items-center ${getHeaderColor(id)}`}>
        <h3 className="font-semibold text-sm">{title}</h3>
        <span className={`text-xs py-0.5 px-2.5 rounded-full font-bold ${getBadgeColor(id)}`}>
          {items.length}
        </span>
      </div>
      
      <div 
        ref={setNodeRef} 
        className={`flex-1 p-3 overflow-y-auto space-y-3 min-h-[150px] transition-colors ${isOver ? 'bg-blue-50/50' : ''}`}
      >
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          {items.map((item) => (
            <KanbanCard key={item.id} id={item.id} item={item} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}
