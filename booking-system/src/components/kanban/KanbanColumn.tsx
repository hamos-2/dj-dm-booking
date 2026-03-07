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

  return (
    <div className="flex flex-col flex-shrink-0 w-80 bg-gray-50/80 rounded-xl border border-gray-200">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-white rounded-t-xl">
        <h3 className="font-semibold text-gray-800 text-sm">{title}</h3>
        <span className="bg-gray-100 text-gray-600 text-xs py-0.5 px-2 rounded-full font-medium">
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
