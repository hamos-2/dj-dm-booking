'use client';

import { useState, useEffect } from 'react';

export default function AdminFlashbookPage() {
  const [designs, setDesigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  
  const [formData, setFormData] = useState({
    id: '',
    title: '',
    description: '',
    price: '',
    size: '',
    body_placement_suggestion: '',
    tags: '',
    is_available: true,
  });
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState('');

  useEffect(() => {
    fetchDesigns();
  }, []);

  async function fetchDesigns() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/flashbook?all=true');
      const data = await res.json();
      if (!data.error) {
        setDesigns(data.flash_designs || []);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  const handleEdit = (design: any) => {
    setFormData({
      id: design.id,
      title: design.title || '',
      description: design.description || '',
      price: design.price || '',
      size: design.size || '',
      body_placement_suggestion: design.body_placement_suggestion || '',
      tags: design.tags ? design.tags.join(', ') : '',
      is_available: design.is_available ?? true,
    });
    setExistingImageUrl(design.image_url);
    setUploadFile(null);
    setShowForm(true);
  };

  const handleCreateNew = () => {
    setFormData({
      id: '',
      title: '',
      description: '',
      price: '',
      size: '',
      body_placement_suggestion: '',
      tags: '',
      is_available: true,
    });
    setExistingImageUrl('');
    setUploadFile(null);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말로 삭제하시겠습니까?')) return;
    setIsProcessing(true);
    try {
      await fetch(`/api/admin/flashbook/${id}`, { method: 'DELETE' });
      await fetchDesigns();
    } catch (e) {
      console.error(e);
    }
    setIsProcessing(false);
  };

  const toggleAvailability = async (id: string, currentStatus: boolean) => {
    setIsProcessing(true);
    try {
      await fetch(`/api/admin/flashbook/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_available: !currentStatus }),
      });
      await fetchDesigns();
    } catch (e) {
      console.error(e);
    }
    setIsProcessing(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return alert('제목(Title)은 필수입니다.');
    if (!uploadFile && !existingImageUrl) return alert('이미지 파일은 필수입니다.');

    setIsProcessing(true);
    try {
      let finalImageUrl = existingImageUrl;
      
      // Upload new image if provided
      if (uploadFile) {
        const uploadForm = new FormData();
        uploadForm.append('file', uploadFile);
        const uploadRes = await fetch('/api/admin/flashbook/upload', {
          method: 'POST',
          body: uploadForm
        });
        const uploadData = await uploadRes.json();
        
        if (uploadData.error) {
          throw new Error(uploadData.error);
        }
        finalImageUrl = uploadData.url;
      }

      const tagsArray = formData.tags
        ? formData.tags.split(',').map(t => t.trim()).filter(Boolean)
        : [];

      const payload = {
        title: formData.title,
        description: formData.description,
        price: formData.price ? Number(formData.price) : null,
        size: formData.size,
        body_placement_suggestion: formData.body_placement_suggestion,
        tags: tagsArray,
        is_available: formData.is_available,
        image_url: finalImageUrl
      };

      if (formData.id) {
        // Update
        await fetch(`/api/admin/flashbook/${formData.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        // Create
        await fetch('/api/admin/flashbook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      setShowForm(false);
      await fetchDesigns();
    } catch (error: any) {
      console.error(error);
      alert('오류 발생: ' + error.message);
    }
    setIsProcessing(false);
  };

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center border-b border-gray-100 pb-4">
        <h1 className="text-2xl font-bold text-gray-800">Flashbook 관리</h1>
        {!showForm && (
          <button 
            onClick={handleCreateNew}
            className="bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            + 새 디자인 추가
          </button>
        )}
      </div>

      {showForm ? (
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm max-w-2xl">
          <h2 className="text-xl font-bold mb-6">{formData.id ? '디자인 수정' : '새 디자인 등록'}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">제목 (Title) *</label>
              <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500/20" />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">설명 (Description)</label>
              <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm h-24 focus:ring-2 focus:ring-blue-500/20"></textarea>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">가격 (Price)</label>
                <input type="number" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500/20" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">크기 (Size)</label>
                <input type="text" placeholder="ex) 5x5 cm" value={formData.size} onChange={e => setFormData({...formData, size: e.target.value})} className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500/20" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">추천 부위 (Placement)</label>
              <input type="text" value={formData.body_placement_suggestion} onChange={e => setFormData({...formData, body_placement_suggestion: e.target.value})} className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500/20" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">태그 (Tags) - 쉼표로 구분</label>
              <input type="text" placeholder="floral, blackwork, mini" value={formData.tags} onChange={e => setFormData({...formData, tags: e.target.value})} className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500/20" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">예약 상태 (Status)</label>
              <select 
                value={formData.is_available ? 'true' : 'false'} 
                onChange={e => setFormData({...formData, is_available: e.target.value === 'true'})}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
              >
                <option value="true">예약 가능 (Available)</option>
                <option value="false">예약 완료됨 (Sold Out)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">이미지 파일 *</label>
              {existingImageUrl && (
                <div className="mb-2">
                  <img src={existingImageUrl} alt="Current" className="h-32 object-contain rounded border border-gray-200" />
                </div>
              )}
              <input type="file" accept="image/*" onChange={e => setUploadFile(e.target.files?.[0] || null)} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100" />
            </div>

            <div className="pt-4 flex gap-3">
              <button disabled={isProcessing} type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
                {isProcessing ? '저장 중...' : '저장'}
              </button>
              <button disabled={isProcessing} type="button" onClick={() => setShowForm(false)} className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg font-medium hover:bg-gray-200 disabled:opacity-50">
                취소
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {loading ? (
            <p className="text-gray-500">로딩 중...</p>
          ) : designs.length === 0 ? (
            <p className="text-gray-500 col-span-full">표시할 도안이 없습니다.</p>
          ) : (
            designs.map((design) => (
              <div key={design.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div className="aspect-square relative bg-gray-50">
                  <img src={design.image_url} alt={design.title} className="w-full h-full object-cover" />
                  <div className="absolute top-2 right-2">
                    <button 
                      onClick={() => toggleAvailability(design.id, design.is_available)}
                      className={`px-2 py-1 text-xs font-bold rounded-full ${design.is_available ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'}`}
                    >
                      {design.is_available ? '예약 가능' : '예약 완료'}
                    </button>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-lg mb-1">{design.title}</h3>
                  <div className="text-sm text-gray-500 mb-3 space-y-1">
                    {design.price && <p>💰 {design.price.toLocaleString()} 원</p>}
                    {design.size && <p>📏 {design.size}</p>}
                    {design.body_placement_suggestion && <p>📍 {design.body_placement_suggestion}</p>}
                  </div>
                  <div className="flex gap-2 mb-4 flex-wrap">
                    {design.tags && design.tags.map((tag: string) => (
                      <span key={tag} className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md text-xs">#{tag}</span>
                    ))}
                  </div>
                  <div className="flex gap-2 pt-4 border-t border-gray-100">
                    <button onClick={() => handleEdit(design)} className="flex-1 text-sm font-medium text-blue-600 bg-blue-50 py-2 rounded-lg hover:bg-blue-100">수정</button>
                    <button onClick={() => handleDelete(design.id)} className="flex-1 text-sm font-medium text-red-600 bg-red-50 py-2 rounded-lg hover:bg-red-100">삭제</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
