'use client';

import React, { useState, useEffect } from 'react';
import { 
  DndContext, 
  DragOverlay, 
  closestCorners, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import { 
  SortableContext, 
  arrayMove, 
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { format } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard, BookingType } from './KanbanCard';

interface KanbanBoardProps {
  bookings: any[];
  onStatusChange?: (id: string, newStatus: string) => Promise<void>;
}

const COLUMNS = [
  { id: 'inquiry', title: '문의 (Inquiry)' },
  { id: 'consultation_scheduled', title: '상담 예정 (Consultation)' },
  { id: 'pending_deposit', title: '입금 대기 (Pending Deposit)' },
  { id: 'confirmed', title: '예약 확정 (Confirmed)' },
  { id: 'completed', title: '작업 완료 (Completed)' },
];

export function KanbanBoard({ bookings, onStatusChange }: KanbanBoardProps) {
  const [items, setItems] = useState<Record<string, BookingType[]>>({
    inquiry: [],
    consultation_scheduled: [],
    pending_deposit: [],
    confirmed: [],
    completed: [],
  });
  
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeItem, setActiveItem] = useState<BookingType | null>(null);
  const supabase = createClient();

  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    const newItems: Record<string, BookingType[]> = {
      inquiry: [],
      consultation_scheduled: [],
      pending_deposit: [],
      confirmed: [],
      completed: [],
    };

    bookings.forEach((b: any) => {
      // Allow canceled bookings to be mapped if needed, mostly Kanban hides them but if filtered in, decide column mapping. Usually excluded.
      if (b.status === 'canceled') return;

      const s = COLUMNS.find(c => c.id === b.status) ? b.status : 'inquiry';
      newItems[s].push({
        id: b.id,
        customer_name: b.clients?.name || b.customer_name, // Fallback to old field
        customer_email: b.customer_email,
        customer_phone: b.clients?.phone || b.customer_phone,
        status: b.status,
        start_time: b.start_time,
        end_time: b.end_time,
        source: b.source,
        tattoo_placement: b.tattoo_placement,
        estimated_size: b.estimated_size,
        quoted_price: b.quoted_price,
        deposit_amount: b.deposit_amount,
      });
    });

    setItems(newItems);
  }, [bookings]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const id = active.id as string;
    setActiveId(id);
    
    // Find item
    let foundItem = null;
    for (const col of Object.keys(items)) {
      const match = items[col].find(i => i.id === id);
      if (match) {
        foundItem = match;
        break;
      }
    }
    setActiveItem(foundItem);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;
    
    const activeId = active.id;
    const overId = over.id;

    // Find containers
    const activeContainer = Object.keys(items).find(key => items[key].some(i => i.id === activeId));
    const overContainer = Object.keys(items).find(key => items[key].some(i => i.id === overId)) || (COLUMNS.find(c => c.id === overId)?.id);

    if (!activeContainer || !overContainer || activeContainer === overContainer) {
      return;
    }

    setItems((prev) => {
      const activeItems = prev[activeContainer];
      const overItems = prev[overContainer];

      const activeIndex = activeItems.findIndex(i => i.id === activeId);
      const overIndex = overItems.findIndex(i => i.id === overId);

      let newIndex = overIndex >= 0 ? overIndex : overItems.length;

      return {
        ...prev,
        [activeContainer]: [
          ...prev[activeContainer].filter(item => item.id !== activeId)
        ],
        [overContainer]: [
          ...prev[overContainer].slice(0, newIndex),
          items[activeContainer][activeIndex],
          ...prev[overContainer].slice(newIndex)
        ]
      };
    });
  };

  const updateBookingStatus = async (bookingId: string, newStatus: string) => {
    if (onStatusChange) {
       // Let the parent component handle the DB update & sync so it reflects in parent's "bookings" state naturally
       await onStatusChange(bookingId, newStatus);
    } else {
      // Fallback if not provided
      const { error } = await supabase
        .from('bookings')
        .update({ status: newStatus })
        .eq('id', bookingId);
        
      if (error) {
        console.error('Failed to update status:', error);
        alert('상태 업데이트에 실패했습니다.');
      } else {
         console.log(`Booking ${bookingId} status changed to ${newStatus}`);
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || !activeItem) {
      setActiveId(null);
      setActiveItem(null);
      return;
    }

    const id = active.id as string;
    const overId = over.id as string;

    const overContainer = Object.keys(items).find(key => items[key].some(i => i.id === overId)) || (COLUMNS.find(c => c.id === overId)?.id);

    if (overContainer) {
      // Check if the container it landed in is different from its original status
      if (activeItem.status !== overContainer) {
        // Optimistically update the local activeItem status
        activeItem.status = overContainer;
        // Save to DB
        updateBookingStatus(id, overContainer);
      } else {
        // Same column, handle reordering logic
        const activeIndex = items[overContainer].findIndex(i => i.id === id);
        const overIndex = items[overContainer].findIndex(i => i.id === overId);
        
        if (activeIndex !== -1 && overIndex !== -1 && activeIndex !== overIndex) {
           setItems((prev) => ({
             ...prev,
             [overContainer]: arrayMove(prev[overContainer], activeIndex, overIndex)
           }));
        }
      }
    }

    setActiveId(null);
    setActiveItem(null);
  };

  const dropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.5' } } }),
  };

  return (
    <div className="flex h-[calc(100vh-12rem)] overflow-x-auto gap-4 pb-4 snap-x snap-mandatory">
      <DndContext 
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        {COLUMNS.map(col => (
          <KanbanColumn 
            key={col.id} 
            id={col.id} 
            title={col.title} 
            items={items[col.id]} 
          />
        ))}

        <DragOverlay dropAnimation={dropAnimation}>
          {activeId && activeItem ? (
             <KanbanCard id={activeId} item={activeItem} isOverlay />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
