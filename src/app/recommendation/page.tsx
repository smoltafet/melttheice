'use client';

import { useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

export default function RecommendationPage() {
  const [recommendation, setRecommendation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recommendation.trim()) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'recommendations'), {
        content: recommendation,
        timestamp: serverTimestamp(),
        userAgent: window.navigator.userAgent,
      });
      setIsSuccess(true);
      setRecommendation('');
      // Optional: Redirect after success or keep them there to submit another
      setTimeout(() => {
        setIsSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Error submitting recommendation:', error);
      alert('Failed to submit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-center p-4 relative overflow-hidden bg-black text-white">
      {/* Background decoration to match app theme */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-[#1c1c1e] to-black opacity-80 z-0"></div>
      
      {/* Content */}
      <div className="z-10 w-full max-w-md">
        <div className="glass p-8 rounded-2xl border border-[var(--color-border)] shadow-2xl backdrop-blur-xl">
          <h1 className="text-3xl font-bold mb-2 text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
            Make a Recommendation
          </h1>
          <p className="text-[var(--color-text-secondary)] text-center mb-8">
            Tell us how we can improve Melt the ICE. Your feedback is anonymous and valuable.
          </p>

          {isSuccess ? (
            <div className="flex flex-col items-center justify-center py-8 text-green-400 animate-in fade-in zoom-in duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xl font-medium">Thank you!</p>
              <p className="text-[var(--color-text-secondary)] mt-2">Your recommendation has been sent.</p>
              <button 
                onClick={() => setIsSuccess(false)}
                className="mt-6 text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                Send another
              </button>
              <button
                onClick={() => router.push('/')}
                className="mt-2 text-sm text-[var(--color-text-secondary)] hover:text-white transition-colors"
              >
                Back to Map
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label 
                  htmlFor="recommendation" 
                  className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2"
                >
                  Your suggestion
                </label>
                <textarea
                  id="recommendation"
                  rows={5}
                  className="w-full px-4 py-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none text-white placeholder-gray-500"
                  placeholder="I think you should add..."
                  value={recommendation}
                  onChange={(e) => setRecommendation(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>

              <div className="flex gap-4">
                 <button
                  type="button"
                  onClick={() => router.push('/')}
                  className="flex-1 py-3 px-4 rounded-xl border border-[var(--color-border)] hover:bg-[var(--color-surface)] transition-all font-medium text-[var(--color-text-secondary)]"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !recommendation.trim()}
                  className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium text-white shadow-lg shadow-blue-500/20"
                >
                  {isSubmitting ? 'Sending...' : 'Send Recommendation'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
