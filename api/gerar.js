module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { prompt, lead } = req.body || {};
  if (!prompt) return res.status(400).json({ error: 'Prompt é obrigatório' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Chave de API não configurada' });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1200,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(500).json({ error: `Erro ${response.status}: ${errText.slice(0, 200)}` });
    }

    const data = await response.json();

    if (data.error) {
      return res.status(500).json({ error: data.error.message });
    }

    const text = data.content?.[0]?.text || '';

    // Salvar lead na planilha pelo servidor (evita CORS)
    if (lead) {
      const SHEETS_URL = 'https://script.google.com/macros/s/AKfycbwzuJkrIauNWllDv7o_dsNNVSoz2-dlVAOuJZ6duHgm0RMtX-cceVB--IiwnFR281k0/exec';
      try {
        await fetch(SHEETS_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            data: new Date().toISOString(),
            nome: lead.nome || '',
            whatsapp: lead.whatsapp || '',
            loja: lead.loja || '',
            segmento: lead.segmento || '',
            canal: lead.canal || '',
            objetivo: lead.objetivo || '',
            instagram: lead.instagram || ''
          })
        });
      } catch(e) {
        console.error('Sheets error:', e.message);
      }
    }

    return res.status(200).json({ result: text });

  } catch (err) {
    console.error('Fetch error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
