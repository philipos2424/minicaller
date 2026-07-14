
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// --- HELPER: LLM Summary Logic ---
async function generateCallIntelligence(transcript) {
  const prompt = `You are a high-level executive assistant. Analyze this phone call transcript.
  1. Provide a concise summary of the outcome.
  2. Detect the sentiment.
  3. Extract specific topics discussed.
  4. Identify Action Items (Calendar events or Tasks).
  
  Format output as JSON:
  {
    "summary": "...",
    "sentiment": "...",
    "topics": ["...", "..."],
    "suggestions": [
      {"kind": "event", "payload": {"title": "...", "start": "ISO date", "end": "ISO date"}},
      {"kind": "task", "payload": {"text": "..."}}
    ]
  }
  
  Transcript: ${transcript}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" }
  });

  return JSON.parse(response.choices[0].message.content);
}

// --- WEBHOOK: Call Started (HUD Trigger) ---
app.post('/webhooks/call-started', async (req, res) => {
  const { callId, customerNumber, userId } = req.body;
  console.log(`Call started: ${callId} from ${customerNumber}`);

  // Look up the contact for the HUD
  const { data: contact } = await supabase
    .from('voice_contacts')
    .select('*')
    .eq('phone', customerNumber)
    .eq('user_id', userId)
    .maybeSingle();

  // This response is sent back to Vapi or pushed to the App via WebSocket/Push
  res.json({
    hud: {
      name: contact?.name || 'Unknown Caller',
      context: contact?.notes || 'No previous notes available.',
      last_seen: contact?.last_seen || 'First time calling'
    }
  });
});

// --- WEBHOOK: Call Ended (The Instant Drop) ---
app.post('/webhooks/call-ended', async (req, res) => {
  const { callId, transcript, customerNumber, userId } = req.body;
  console.log(`Call ended: ${callId}. Processing summary...`);

  try {
    // 1. Save transcript
    await supabase.from('voice_transcripts').upsert({
      call_id: callId,
      text: transcript,
      model: 'vapi-deepgram'
    });

    // 2. Generate AI Intelligence
    const intel = await generateCallIntelligence(transcript);

    // 3. Save Summary
    await supabase.from('voice_summaries').upsert({
      call_id: callId,
      summary: intel.summary,
      sentiment: intel.sentiment,
      topics: intel.topics,
      model: 'gpt-4o'
    });

    // 4. Save Suggestions (Tasks/Events)
    if (intel.suggestions && intel.suggestions.length > 0) {
      const sugRows = intel.suggestions.map(s => ({
        call_id: callId,
        user_id: userId,
        kind: s.kind,
        payload: s.payload,
        status: 'pending'
      }));
      await supabase.from('voice_suggestions').insert(sugRows);
    }

    // 5. Update Contact 'last_seen'
    await supabase.from('voice_contacts')
      .update({ last_seen: new Date().toISOString() })
      .eq('phone', customerNumber)
      .eq('user_id', userId);

    res.json({ success: true });
  } catch (err) {
    console.error('Processing error:', err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`VoiceMemory Engine running on port ${PORT}`));
