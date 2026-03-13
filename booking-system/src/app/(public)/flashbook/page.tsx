import { Suspense } from 'react';
import FlashbookGallery from './FlashbookGallery';

export const metadata = {
  title: 'Flash Designs - DJ-DM Booking',
  description: 'Available flash tattoo designs ready to be booked.',
};

export default function FlashbookPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl mb-4">
          Flash Designs
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Explore our collection of pre-designed tattoos. Found something you love? Book it directly!
        </p>
      </div>
      
      <Suspense fallback={<div className="text-center py-20 text-gray-500">Loading designs...</div>}>
        <FlashbookGallery />
      </Suspense>
    </div>
  );
}
