
import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Play, Square, RefreshCcw } from 'lucide-react';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export default function SimulationPage() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('Idle');

  const triggerState = async (newState) => {
    setLoading(true);
    setStatus(`Triggering ${newState}...`);
    
    // We simulate a call by updating the most recent call or creating a dummy one
    // For simplicity, we'll update the status of a "dummy" call ID 
    // In a real scenario, this would be the current active call.
    
    // 1. First, ensure there is a record to update
    const { data: callData } = await supabase
      .from('voice_calls')
      .insert([{ status: newState, from_number: '+251-TEST-CALL', duration: 0 }])
      .select()
      .single();

    if (callData) {
      setStatus(`Success: State is now ${newState}`);
    } else {
      setStatus('Error updating Supabase');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-zinc-900 text-white p-8 flex flex-col items-center justify-center font-sans">
      <h1 className="text-3xl font-bold mb-2">VoiceMemory Simulator</h1>
      <p className="text-zinc-400 mb-8 text-center">Trigger the HUD states without using Vapi credits</p>
      
      <div className="grid grid-cols-1 gap-4 w-full max-w-xs">
        <button 
          onClick={() => triggerState('in_progress')}
          disabled={loading}
          className="flex items-center justify-center gap-3 bg-green-600 hover:bg-green-500 p-4 rounded-xl font-bold transition-all active:scale-95 disabled:opacity-50"
        >
          <Play size={20} /> Simulate Incoming Call
        </button>

        <button 
          onClick={() => triggerState('ready')}
          disabled={loading}
          className="flex items-center justify-center gap-3 bg-red-600 hover:bg-red-500 p-4 rounded-xl font-bold transition-all active:scale-95 disabled:opacity-50"
        >
          <Square size={20} /> Simulate Call End
        </button>

        <button 
          onClick={() => triggerState('idle')}
          disabled={loading}
          className="flex items-center justify-center gap-3 bg-zinc-700 hover:bg-zinc-600 p-4 rounded-xl font-bold transition-all active:scale-95 disabled:opacity-50"
        >
          <RefreshCcw size={20} /> Reset to Idle
        </button>
      </div>

      <div className="mt-8 p-4 bg-black rounded-lg border border-zinc-800 font-mono text-sm">
        Status: <span className="text-green-400">{status}</span>
      </div>
      
      <p className="mt-6 text-xs text-zinc-500 text-center">
        Keep your HUD page open in another tab to see the magic flip!
      </p>
    </div>
  );
}
