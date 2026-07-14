
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Phone, MessageSquare, Calendar, User, CheckCircle } from 'lucide-react';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export default function VoiceMemoryHUD() {
  const [callState, setCallState] = useState('idle'); // idle, active, summary
  const [currentCall, setCurrentCall] = useState(null);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    // Listen for real-time updates on the voice_calls table
    const channel = supabase
      .channel('call-status-changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'voice_calls' }, (payload) => {
        const newStatus = payload.new.status;
        if (newStatus === 'in_progress') setCallState('active');
        if (newStatus === 'ready') setCallState('summary');
        setCurrentCall(payload.new);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  // Fetch summary when state becomes 'summary'
  useEffect(() => {
    if (callState === 'summary' && currentCall) {
      supabase.from('voice_summaries')
        .select('*')
        .eq('call_id', currentCall.id)
        .single()
        .then(({ data }) => setSummary(data));
    }
  }, [callState, currentCall]);

  if (callState === 'active') {
    return (
      <div className="min-h-screen bg-black text-white p-6 flex flex-col justify-center items-center text-center">
        <div className="absolute top-10 animate-pulse text-brand-accent font-mono text-xs tracking-widest uppercase">
          ● Live Bridge Active
        </div>
        <Phone size={64} className="text-brand-accent mb-6 animate-bounce" />
        <h1 className="text-4xl font-bold mb-2">{currentCall?.from_number || 'Incoming Call...'}</h1>
        <div className="bg-brand-gray p-6 rounded-2xl border border-brand-accent/30 w-full max-w-md">
          <p className="text-gray-400 text-sm uppercase tracking-tight mb-4">AI Intelligence HUD</p>
          <div className="text-left space-y-4">
            <div className="flex items-start gap-3">
              <User className="text-brand-accent shrink-0" size={20} />
              <p className="text-lg font-medium">Loading contact memory...</p>
            </div>
            <div className="flex items-start gap-3">
              <MessageSquare className="text-brand-accent shrink-0" size={20} />
              <p className="text-gray-300 italic">"Search for a connection point. Refer to the V2 project budget."</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (callState === 'summary') {
    return (
      <div className="min-h-screen bg-black text-white p-6 flex flex-col">
        <div className="flex items-center gap-2 mb-8 text-brand-accent">
          <CheckCircle size={20} />
          <span className="font-mono text-sm uppercase">Call Processed</span>
        </div>
        <h1 className="text-3xl font-bold mb-6">Instant Summary</h1>
        <div className="bg-brand-gray p-6 rounded-3xl border border-gray-800 space-y-6">
          <div>
            <p className="text-gray-500 text-xs uppercase mb-2">The Gist</p>
            <p className="text-xl leading-relaxed">{summary?.summary || 'Analyzing transcript...'}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-black rounded-xl border border-gray-800">
              <p className="text-gray-500 text-xs uppercase mb-1">Sentiment</p>
              <p className="font-medium">{summary?.sentiment || 'Analyzing...'}</p>
            </div>
            <div className="p-4 bg-black rounded-xl border border-gray-800">
              <p className="text-gray-500 text-xs uppercase mb-1">Topics</p>
              <p className="font-medium">{summary?.topics?.join(', ') || 'Analyzing...'}</p>
            </div>
          </div>
        </div>
        <button 
          onClick={() => setCallState('idle')}
          className="mt-8 w-full py-4 bg-brand-accent text-black font-bold rounded-2xl transition-transform active:scale-95"
        >
          Back to Vault
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <header className="flex justify-between items-center mb-12">
        <h1 className="text-2xl font-bold tracking-tighter">VoiceMemory</h1>
        <div className="w-10 h-10 rounded-full bg-brand-accent animate-pulse" />
      </header>
      <div className="space-y-6">
        <h2 className="text-gray-500 text-sm uppercase tracking-widest">Recent Relationships</h2>
        <div className="text-center py-20 text-gray-600 italic">
          No active calls. The AI is waiting.
        </div>
      </div>
    </div>
  );
}
