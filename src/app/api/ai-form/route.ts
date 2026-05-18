import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Clé API IA non configurée.' },
      { status: 500 }
    );
  }

  const { description } = await req.json();
  if (!description?.trim()) {
    return NextResponse.json({ error: 'Description vide' }, { status: 400 });
  }

  const prompt = `Génère un formulaire pour: "${description}"

Réponds UNIQUEMENT avec un objet JSON valide (pas de markdown, pas de \`\`\`):
{
  "title": "Titre du formulaire",
  "description": "Courte description d'accueil",
  "fields": [
    {
      "type": "text|email|phone|textarea|select|radio|checkbox|event_date|info_block|payment",
      "label": "La question",
      "description": "Sous-titre optionnel",
      "placeholder": "Placeholder (pour text/email/phone/textarea uniquement)",
      "required": true,
      "options": [{"label": "Option 1"}, {"label": "Option 2"}],
      "amount": 50,
      "presetValue": "Valeur (pour event_date et info_block uniquement)"
    }
  ]
}

Règles strictes:
- phone: 1 seul maximum, pas de options
- email: 1 seul, pas de options
- event_date: utilise presetValue pour la date lisible
- info_block: utilise presetValue pour le texte informatif
- payment: utilise amount (nombre entier en euros), pas de options
- select et radio: utilise options array
- checkbox: pas de options
- Maximum 10 champs
- Réponds UNIQUEMENT avec le JSON, rien d'autre`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      throw new Error(err);
    }

    const data = await response.json();
    const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("L'IA n'a pas retourné un JSON valide");

    const form = JSON.parse(jsonMatch[0]);
    return NextResponse.json(form);
  } catch (err) {
    console.error('AI form generation error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erreur de génération' },
      { status: 500 }
    );
  }
}
