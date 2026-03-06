'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { useSearchParams } from 'next/navigation';

export default function BookingConfirmationPage() {
  const searchParams = useSearchParams();
  const name = searchParams.get('name') || 'Guest';
  const time = searchParams.get('time') || 'Selected Time';

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden p-8 text-center animate-in zoom-in-95 duration-500">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Booking Confirmed!</h1>
        <p className="text-gray-500 mb-8">
          A calendar invitation has been sent to your email address with the appointment details.
        </p>

        <div className="bg-gray-50 rounded-xl p-4 mb-8 text-left border border-gray-100">
          <div className="mb-2">
            <span className="text-sm text-gray-500 block">Date & Time</span>
            <span className="font-medium text-gray-900">{time}</span>
          </div>
          <div>
            <span className="text-sm text-gray-500 block">Name</span>
            <span className="font-medium text-gray-900">{name}</span>
          </div>
        </div>

        <Link href="/">
          <Button fullWidth variant="secondary">Return to Home</Button>
        </Link>
      </div>
    </main>
  );
}
