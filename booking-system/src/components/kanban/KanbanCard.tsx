import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export interface BookingType {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  status: string;
  start_time: string;
  end_time: string;
  source: string;
  tattoo_placement?: string;
  estimated_size?: string;
  quoted_price?: number;
  deposit_amount?: number;
}

interface Props {
  id: string;
  item: BookingType;
  isOverlay?: boolean;
}

export function KanbanCard({ id, item, isOverlay }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  if (isDragging) {
    return (
      <div 
        ref={setNodeRef} 
        style={style} 
        className="bg-gray-100 border border-blue-200 rounded-lg p-4 opacity-50 shadow-sm"
      >
        <div className="text-gray-400 font-medium">Dragging...</div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`bg-white border rounded-lg p-4 shadow-sm cursor-grab active:cursor-grabbing hover:border-blue-300 transition-colors ${isOverlay ? 'shadow-lg ring-2 ring-blue-500 rotate-2' : 'border-gray-200'}`}
    >
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-semibold text-gray-900">{item.customer_name}</h4>
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
          {item.source === 'instagram' ? 'INSTA' : 'WEB'}
        </span>
      </div>
      <p className="text-sm text-gray-500 mb-1">{item.customer_phone || item.customer_email}</p>
      
      {(item.tattoo_placement || item.estimated_size) && (
        <div className="mt-3 text-xs text-gray-600 bg-gray-50 p-2 rounded border border-gray-100">
          {item.tattoo_placement && <div><span className="font-medium">부위:</span> {item.tattoo_placement}</div>}
          {item.estimated_size && <div><span className="font-medium">크기:</span> {item.estimated_size}</div>}
        </div>
      )}

      {item.deposit_amount && (
         <div className="mt-2 text-xs font-medium text-blue-600">
            예약금: {item.deposit_amount.toLocaleString()}원
         </div>
      )}
    </div>
  );
}
