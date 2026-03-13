'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function FlashbookGallery() {
  const router = useRouter();
  const [designs, setDesigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [tagFilter, setTagFilter] = useState<string>('All');
  const [sizeFilter, setSizeFilter] = useState<string>('All');
  
  // Extract unique filters from designs
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [availableSizes, setAvailableSizes] = useState<string[]>([]);

  useEffect(() => {
    async function fetchPublicDesigns() {
      try {
        const res = await fetch('/api/admin/flashbook?all=true');
        const data = await res.json();
        const items = data.flash_designs || [];
        setDesigns(items);
        
        // Compute available filters
        const tags = new Set<string>();
        const sizes = new Set<string>();
        items.forEach((item: any) => {
          if (item.tags) item.tags.forEach((t: string) => tags.add(t));
          if (item.size) sizes.add(item.size);
        });
        setAvailableTags(Array.from(tags).sort());
        setAvailableSizes(Array.from(sizes).sort());
        
      } catch (err) {
        console.error('Failed to load flash designs', err);
      }
      setLoading(false);
    }
    fetchPublicDesigns();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-12 h-12 border-4 border-gray-200 border-t-black rounded-full animate-spin"></div>
      </div>
    );
  }

  if (designs.length === 0) {
    return (
      <div className="text-center py-20 bg-gray-50 rounded-2xl border border-gray-100">
        <h3 className="text-xl font-medium text-gray-900 mb-2">No flash designs found</h3>
        <p className="text-gray-500">Check back later for new available designs!</p>
      </div>
    );
  }

  const filteredDesigns = designs.filter(design => {
    let matchesTag = tagFilter === 'All' || (design.tags && design.tags.includes(tagFilter));
    let matchesSize = sizeFilter === 'All' || design.size === sizeFilter;
    return matchesTag && matchesSize;
  });

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-1">Filter by Tag</label>
          <select 
            className="border-gray-300 rounded-lg shadow-sm focus:border-black focus:ring-black sm:text-sm px-4 py-2 bg-white"
            value={tagFilter}
            onChange={e => setTagFilter(e.target.value)}
          >
            <option value="All">All Tags</option>
            {availableTags.map(tag => <option key={tag} value={tag}>{tag}</option>)}
          </select>
        </div>
        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-1">Filter by Size</label>
          <select 
            className="border-gray-300 rounded-lg shadow-sm focus:border-black focus:ring-black sm:text-sm px-4 py-2 bg-white"
            value={sizeFilter}
            onChange={e => setSizeFilter(e.target.value)}
          >
            <option value="All">All Sizes</option>
            {availableSizes.map(sz => <option key={sz} value={sz}>{sz}</option>)}
          </select>
        </div>
      </div>

      {/* Grid */}
      {filteredDesigns.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No designs match the selected filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredDesigns.map(design => (
            <div key={design.id} className={`group relative bg-white border border-gray-200 rounded-2xl overflow-hidden transition-all duration-300 ${!design.is_available ? 'opacity-80' : 'hover:shadow-xl'}`}>
              <div className="aspect-[4/5] bg-gray-100 relative overflow-hidden">
                <img 
                  src={design.image_url} 
                  alt={design.title} 
                  className={`w-full h-full object-cover transition-transform duration-500 ${design.is_available ? 'group-hover:scale-105' : 'grayscale-[50%]'}`} 
                />
                {!design.is_available && (
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                    <span className="bg-black text-white px-5 py-2.5 font-bold tracking-widest text-sm rounded-lg shadow-xl transform -rotate-12 border border-white/20">SOLD OUT</span>
                  </div>
                )}
                {design.price && (
                  <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-bold shadow-sm">
                    ₩{design.price.toLocaleString()}
                  </div>
                )}
              </div>
              <div className="p-5">
                <h3 className="text-lg font-bold text-gray-900 mb-1">{design.title}</h3>
                
                <div className="text-sm text-gray-600 mb-4 space-y-1">
                  {design.size && <p className="flex items-center gap-2">📏 {design.size}</p>}
                  {design.body_placement_suggestion && <p className="flex items-center gap-2">📍 {design.body_placement_suggestion}</p>}
                </div>
                
                <div className="flex flex-wrap gap-2 mb-6">
                  {design.tags?.map((tag: string) => (
                    <span key={tag} className="bg-gray-100 text-gray-600 px-2.5 py-1 rounded-md text-xs font-medium">
                      #{tag}
                    </span>
                  ))}
                </div>

                {design.is_available ? (
                  <button 
                    onClick={() => router.push(`/booking?flash_id=${design.id}`)}
                    className="w-full bg-black text-white py-3 rounded-xl font-medium hover:bg-gray-800 transition-colors shadow-sm"
                  >
                    Book This Design
                  </button>
                ) : (
                  <button 
                    disabled
                    className="w-full bg-gray-100 text-gray-400 py-3 rounded-xl font-medium cursor-not-allowed border border-gray-200"
                  >
                    예약 완료됨
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
