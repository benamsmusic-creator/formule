'use client';
import { useState, useCallback } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { createForm, saveForm, getForm } from '@/lib/store';
import { FormField, FieldType, Form, FieldOption } from '@/lib/types';
import { generateId } from '@/lib/utils';
import Image from 'next/image';

const FIELD_TYPES: { type: FieldType; label: string; icon: string; desc: string }[] = [
  { type: 'event_date', label: 'Date de l\'événement', icon: '📅', desc: 'Date affichée (vous la fixez)' },
  { type: 'people_count', label: 'Nombre de personnes', icon: '👥', desc: 'Sélecteur 1 à 8 personnes' },
  { type: 'info_block', label: 'Bloc de texte libre', icon: '✍', desc: 'Message, info, don…' },
  { type: 'text', label: 'Texte court', icon: 'T', desc: 'Une ligne de texte' },
  { type: 'textarea', label: 'Texte long', icon: '¶', desc: 'Paragraphe de texte' },
  { type: 'email', label: 'Email', icon: '@', desc: 'Adresse email' },
  { type: 'phone', label: 'Téléphone', icon: '✆', desc: 'Numéro de téléphone' },
  { type: 'select', label: 'Choix (avec images)', icon: '▾', desc: 'Sélection + images' },
  { type: 'radio', label: 'Choix unique (avec images)', icon: '◉', desc: 'Boutons + images' },
  { type: 'checkbox', label: 'Case à cocher', icon: '☑', desc: 'Oui / Non' },
  { type: 'payment', label: 'Paiement Stripe', icon: '◆', desc: 'Collecte un paiement' },
];

function OptionEditor({
  option,
  onChange,
  onDelete,
}: {
  option: FieldOption;
  onChange: (o: FieldOption) => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex gap-2 items-start">
      <div className="flex-1 space-y-2">
        <input
          className="w-full px-3 py-2 rounded-lg bg-beige-50 border border-beige-200 text-sm text-brown-900 focus:outline-none focus:border-gold-400"
          placeholder="Label de l'option"
          value={option.label}
          onChange={(e) => onChange({ ...option, label: e.target.value })}
        />
        <div className="flex items-center gap-2">
          <input
            className="flex-1 px-3 py-1.5 rounded-lg bg-beige-50 border border-beige-200 text-xs text-brown-600 focus:outline-none focus:border-gold-400"
            placeholder="URL image (optionnel)"
            value={option.imageUrl ?? ''}
            onChange={(e) => onChange({ ...option, imageUrl: e.target.value || undefined })}
          />
          {option.imageUrl && (
            <div className="w-10 h-8 rounded-md overflow-hidden flex-shrink-0 border border-beige-200">
              <Image src={option.imageUrl} alt="" width={40} height={32} className="w-full h-full object-cover" unoptimized />
            </div>
          )}
        </div>
      </div>
      <button
        onClick={onDelete}
        className="mt-1 text-brown-300 hover:text-red-400 transition-colors text-lg leading-none flex-shrink-0"
      >
        ×
      </button>
    </div>
  );
}

function FieldEditor({
  field,
  onChange,
  onDelete,
}: {
  field: FormField;
  onChange: (f: FormField) => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);

  const addOption = () => {
    onChange({ ...field, options: [...(field.options ?? []), { label: `Option ${(field.options?.length ?? 0) + 1}` }] });
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: -40, scale: 0.95 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="bg-beige-50 border border-beige-200 rounded-2xl overflow-hidden hover:border-gold-400/40 transition-colors"
    >
      <div className="flex items-center gap-3 px-5 py-4 cursor-pointer select-none" onClick={() => setOpen((o) => !o)}>
        <div className="w-7 h-7 rounded-lg bg-gold-400/10 border border-gold-400/20 flex items-center justify-center text-gold-600 text-sm font-bold flex-shrink-0">
          {FIELD_TYPES.find((f) => f.type === field.type)?.icon ?? 'F'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-brown-900 truncate">{field.label || 'Champ sans titre'}</p>
          <p className="text-xs text-brown-400">{FIELD_TYPES.find((f) => f.type === field.type)?.label}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {field.required && <span className="text-xs px-2 py-0.5 rounded-full bg-gold-400/10 text-gold-600 border border-gold-400/20">Requis</span>}
          {field.imageUrl && <span className="text-xs text-brown-300">🖼</span>}
          <motion.span animate={{ rotate: open ? 180 : 0 }} className="text-brown-400 text-xs">▾</motion.span>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden border-t border-beige-200"
          >
            <div className="p-5 space-y-4">
              {/* Label */}
              <div>
                <label className="text-xs text-brown-500 uppercase tracking-wide font-medium">Libellé de la question</label>
                <input
                  className="mt-1 w-full px-3 py-2.5 rounded-xl bg-beige-100 border border-beige-200 text-brown-900 text-sm focus:outline-none focus:border-gold-400 transition-colors"
                  value={field.label}
                  onChange={(e) => onChange({ ...field, label: e.target.value })}
                  placeholder="Ex: Quel est votre prénom ?"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-xs text-brown-500 uppercase tracking-wide font-medium">Description (optionnel)</label>
                <input
                  className="mt-1 w-full px-3 py-2.5 rounded-xl bg-beige-100 border border-beige-200 text-brown-700 text-sm focus:outline-none focus:border-gold-400 transition-colors"
                  value={field.description ?? ''}
                  onChange={(e) => onChange({ ...field, description: e.target.value || undefined })}
                  placeholder="Sous-titre ou aide sous la question"
                />
              </div>

              {/* EVENT DATE — preset value */}
              {field.type === 'event_date' && (
                <div>
                  <label className="text-xs text-brown-500 uppercase tracking-wide font-medium">Date de l'événement (affichée aux participants)</label>
                  <input
                    className="mt-1 w-full px-3 py-2.5 rounded-xl bg-gold-400/10 border border-gold-400/30 text-brown-900 text-sm focus:outline-none focus:border-gold-500 transition-colors font-medium"
                    value={field.presetValue ?? ''}
                    onChange={(e) => onChange({ ...field, presetValue: e.target.value })}
                    placeholder="Ex: Samedi 14 juin 2025 — 20h00"
                  />
                  <p className="mt-1 text-xs text-brown-300">Ce champ est affiché comme info, le participant ne peut pas le modifier.</p>
                </div>
              )}

              {/* INFO BLOCK — free text content */}
              {field.type === 'info_block' && (
                <div>
                  <label className="text-xs text-brown-500 uppercase tracking-wide font-medium">Contenu du bloc</label>
                  <textarea
                    className="mt-1 w-full px-3 py-2.5 rounded-xl bg-beige-100 border border-beige-200 text-brown-800 text-sm focus:outline-none focus:border-gold-400 transition-colors resize-none"
                    rows={5}
                    value={field.presetValue ?? ''}
                    onChange={(e) => onChange({ ...field, presetValue: e.target.value })}
                    placeholder={"Si vous souhaitez faire un don, vous pouvez verser ce que vous voulez.\n\nMerci pour votre générosité 🙏"}
                  />
                  <p className="mt-1 text-xs text-brown-300">Ce texte est affiché comme message informatif. Pas de saisie requise.</p>
                </div>
              )}

              {/* PEOPLE COUNT — max */}
              {field.type === 'people_count' && (
                <div>
                  <label className="text-xs text-brown-500 uppercase tracking-wide font-medium">Nombre maximum de personnes</label>
                  <input
                    type="number"
                    min={1} max={20}
                    className="mt-1 w-full px-3 py-2.5 rounded-xl bg-beige-100 border border-beige-200 text-brown-900 text-sm focus:outline-none focus:border-gold-400 transition-colors"
                    value={field.maxPeople ?? 8}
                    onChange={(e) => onChange({ ...field, maxPeople: parseInt(e.target.value) || 8 })}
                  />
                </div>
              )}

              {/* Image URL for the field itself */}
              {field.type !== 'payment' && field.type !== 'checkbox' && field.type !== 'event_date' && (
                <div>
                  <label className="text-xs text-brown-500 uppercase tracking-wide font-medium">Image au-dessus de la question (URL)</label>
                  <div className="flex gap-2 mt-1">
                    <input
                      className="flex-1 px-3 py-2.5 rounded-xl bg-beige-100 border border-beige-200 text-brown-700 text-sm focus:outline-none focus:border-gold-400 transition-colors"
                      value={field.imageUrl ?? ''}
                      onChange={(e) => onChange({ ...field, imageUrl: e.target.value || undefined })}
                      placeholder="https://images.unsplash.com/..."
                    />
                    {field.imageUrl && (
                      <div className="w-14 h-10 rounded-xl overflow-hidden flex-shrink-0 border border-beige-200">
                        <Image src={field.imageUrl} alt="" width={56} height={40} className="w-full h-full object-cover" unoptimized />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Placeholder */}
              {field.type !== 'checkbox' && field.type !== 'payment' && field.type !== 'radio' && field.type !== 'select' && field.type !== 'event_date' && field.type !== 'people_count' && field.type !== 'info_block' && (
                <div>
                  <label className="text-xs text-brown-500 uppercase tracking-wide font-medium">Placeholder</label>
                  <input
                    className="mt-1 w-full px-3 py-2.5 rounded-xl bg-beige-100 border border-beige-200 text-brown-900 text-sm focus:outline-none focus:border-gold-400 transition-colors"
                    value={field.placeholder ?? ''}
                    onChange={(e) => onChange({ ...field, placeholder: e.target.value })}
                    placeholder="Ex: Votre réponse ici…"
                  />
                </div>
              )}

              {/* Payment amount */}
              {field.type === 'payment' && (
                <div>
                  <label className="text-xs text-brown-500 uppercase tracking-wide font-medium">Montant (€)</label>
                  <input
                    type="number"
                    className="mt-1 w-full px-3 py-2.5 rounded-xl bg-beige-100 border border-beige-200 text-brown-900 text-sm focus:outline-none focus:border-gold-400 transition-colors"
                    value={field.amount ?? ''}
                    onChange={(e) => onChange({ ...field, amount: parseFloat(e.target.value) || 0 })}
                    placeholder="50"
                  />
                </div>
              )}

              {/* Options with images */}
              {(field.type === 'select' || field.type === 'radio') && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs text-brown-500 uppercase tracking-wide font-medium">Options</label>
                    <button
                      onClick={addOption}
                      className="text-xs text-gold-600 hover:text-gold-500 font-medium flex items-center gap-1"
                    >
                      + Ajouter
                    </button>
                  </div>
                  <div className="space-y-3">
                    {(field.options ?? []).map((opt, i) => (
                      <OptionEditor
                        key={i}
                        option={opt}
                        onChange={(updated) => {
                          const newOpts = [...(field.options ?? [])];
                          newOpts[i] = updated;
                          onChange({ ...field, options: newOpts });
                        }}
                        onDelete={() => {
                          const newOpts = (field.options ?? []).filter((_, idx) => idx !== i);
                          onChange({ ...field, options: newOpts });
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Required toggle */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-sm text-brown-700 select-none cursor-pointer">
                  <div
                    className={`relative w-9 h-5 rounded-full transition-colors ${field.required ? 'bg-gold-500' : 'bg-beige-300'}`}
                    onClick={() => onChange({ ...field, required: !field.required })}
                  >
                    <motion.div
                      className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm"
                      animate={{ left: field.required ? '18px' : '2px' }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  </div>
                  Obligatoire
                </label>
                <button onClick={onDelete} className="text-xs text-brown-400 hover:text-red-500 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50">
                  Supprimer
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function BuilderPage() {
  const router = useRouter();
  const [title, setTitle] = useState('Mon formulaire');
  const [description, setDescription] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [fields, setFields] = useState<FormField[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [formId, setFormId] = useState<string | null>(null);

  const addField = useCallback((type: FieldType) => {
    const newField: FormField = {
      id: generateId(),
      type,
      label: FIELD_TYPES.find((f) => f.type === type)?.label ?? 'Nouveau champ',
      required: false,
      ...(type === 'select' || type === 'radio'
        ? { options: [{ label: 'Option 1' }, { label: 'Option 2' }, { label: 'Option 3' }] as FieldOption[] }
        : {}),
      ...(type === 'payment' ? { amount: 50, currency: 'eur' } : {}),
      ...(type === 'event_date' ? { presetValue: 'Samedi 14 juin 2025 — 20h00', label: 'Date de l\'événement' } : {}),
      ...(type === 'people_count' ? { label: 'Vous êtes combien ?', maxPeople: 8 } : {}),
      ...(type === 'info_block' ? { label: 'À savoir', presetValue: 'Si vous souhaitez faire un don, vous pouvez verser le montant de votre choix.\n\nMerci pour votre générosité 🙏' } : {}),
    };
    setFields((prev) => [...prev, newField]);
  }, []);

  const handleSave = async (): Promise<Form> => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 400));
    let form: Form;
    const existing = formId ? getForm(formId) : null;
    if (existing) {
      form = { ...existing, title, description, coverImage: coverImage || undefined, fields, updatedAt: new Date().toISOString() };
    } else {
      form = createForm(title);
      form.description = description;
      form.coverImage = coverImage || undefined;
      form.fields = fields;
      setFormId(form.id);
    }
    saveForm(form);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    return form;
  };

  const handlePublish = async () => {
    const form = await handleSave();
    router.push(`/forms/${form.id}`);
  };

  return (
    <div className="min-h-screen pt-20">
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <motion.div className="mb-10" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <h1 className="text-5xl font-light text-brown-900 mb-2" style={{ fontFamily: 'var(--font-cormorant)' }}>
            <em className="gradient-text">Créer</em> votre formulaire
          </h1>
          <p className="text-brown-500">Une question à la fois. Une expérience inoubliable.</p>
        </motion.div>

        <div className="grid lg:grid-cols-[320px_1fr] gap-8">
          {/* LEFT: Field palette */}
          <motion.aside initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.1 }}>
            <div className="p-6 rounded-3xl bg-beige-100 border border-beige-200 sticky top-24">
              <h2 className="text-lg font-medium text-brown-900 mb-4" style={{ fontFamily: 'var(--font-cormorant)' }}>
                Types de champs
              </h2>
              <div className="space-y-1.5">
                {FIELD_TYPES.map((ft, i) => (
                  <motion.button
                    key={ft.type}
                    onClick={() => addField(ft.type)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-beige-50 border border-beige-200 hover:border-gold-400/50 text-left transition-all group"
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors ${
                      ft.type === 'payment'
                        ? 'bg-gold-400/20 text-gold-600 border border-gold-400/30'
                        : 'bg-beige-200 text-brown-600 border border-beige-300 group-hover:bg-gold-400/10 group-hover:text-gold-600 group-hover:border-gold-400/20'
                    }`}>
                      {ft.icon}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-brown-800 truncate">{ft.label}</p>
                      <p className="text-[10px] text-brown-400 truncate">{ft.desc}</p>
                    </div>
                    <span className="ml-auto text-gold-400 opacity-0 group-hover:opacity-100 transition-opacity">+</span>
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.aside>

          {/* RIGHT: Editor */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="space-y-6">
            {/* Form settings */}
            <div className="relative p-8 rounded-3xl bg-beige-50 border border-beige-200 overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-gold-400 to-gold-300" />
              <h2 className="text-sm text-brown-500 uppercase tracking-widest mb-5 font-medium">Paramètres généraux</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-brown-500 uppercase tracking-wide font-medium">Titre</label>
                  <input
                    className="mt-1 w-full px-4 py-3 rounded-xl bg-beige-100 border border-beige-200 text-brown-900 focus:outline-none focus:border-gold-400 transition-colors"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Réservation VIP"
                    style={{ fontFamily: 'var(--font-cormorant)', fontSize: '1.25rem' }}
                  />
                </div>
                <div>
                  <label className="text-xs text-brown-500 uppercase tracking-wide font-medium">Description (optionnel)</label>
                  <textarea
                    className="mt-1 w-full px-4 py-3 rounded-xl bg-beige-100 border border-beige-200 text-brown-700 text-sm focus:outline-none focus:border-gold-400 transition-colors resize-none"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    placeholder="Un texte d'introduction pour vos visiteurs…"
                  />
                </div>

                {/* Cover image */}
                <div>
                  <label className="text-xs text-brown-500 uppercase tracking-wide font-medium">
                    Image de couverture (URL) — affiché plein écran au départ
                  </label>
                  <div className="flex gap-3 mt-1">
                    <input
                      className="flex-1 px-4 py-3 rounded-xl bg-beige-100 border border-beige-200 text-brown-700 text-sm focus:outline-none focus:border-gold-400 transition-colors"
                      value={coverImage}
                      onChange={(e) => setCoverImage(e.target.value)}
                      placeholder="https://images.unsplash.com/photo-…"
                    />
                    {coverImage && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-20 h-12 rounded-xl overflow-hidden flex-shrink-0 border border-beige-200"
                      >
                        <Image src={coverImage} alt="Cover preview" width={80} height={48} className="w-full h-full object-cover" unoptimized />
                      </motion.div>
                    )}
                  </div>
                  <p className="mt-1.5 text-xs text-brown-300">
                    Conseil : utilisez des images depuis <span className="text-gold-600">unsplash.com</span> — copiez le lien direct
                  </p>
                </div>
              </div>
            </div>

            {/* Fields list */}
            <div className="p-8 rounded-3xl bg-beige-50 border border-beige-200 min-h-[200px]">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-sm text-brown-500 uppercase tracking-widest font-medium">
                  Questions ({fields.length})
                </h2>
                {fields.length === 0 && (
                  <span className="text-xs text-brown-300">← Ajoutez depuis le panneau gauche</span>
                )}
              </div>

              <AnimatePresence mode="popLayout">
                {fields.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center py-16 text-center"
                  >
                    <div className="text-5xl text-beige-300 mb-4 float-1">◈</div>
                    <p className="text-brown-400 text-sm">Votre formulaire est vide.</p>
                    <p className="text-brown-300 text-xs mt-1">Cliquez sur un type de champ à gauche pour commencer.</p>
                  </motion.div>
                ) : (
                  <Reorder.Group axis="y" values={fields} onReorder={setFields} className="space-y-3">
                    {fields.map((field) => (
                      <Reorder.Item key={field.id} value={field} className="list-none">
                        <FieldEditor
                          field={field}
                          onChange={(updated) => setFields((prev) => prev.map((f) => (f.id === updated.id ? updated : f)))}
                          onDelete={() => setFields((prev) => prev.filter((f) => f.id !== field.id))}
                        />
                      </Reorder.Item>
                    ))}
                  </Reorder.Group>
                )}
              </AnimatePresence>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs text-brown-400">
                {fields.length} question{fields.length !== 1 ? 's' : ''} · Glissez pour réorganiser
              </p>
              <div className="flex gap-3">
                <motion.button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-3 rounded-xl gold-border text-brown-800 text-sm font-medium disabled:opacity-50"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <AnimatePresence mode="wait">
                    {saving ? (
                      <motion.span key="saving" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>Sauvegarde…</motion.span>
                    ) : saved ? (
                      <motion.span key="saved" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-gold-600">✓ Sauvegardé</motion.span>
                    ) : (
                      <motion.span key="save" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>Sauvegarder</motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>

                <motion.button
                  onClick={handlePublish}
                  disabled={fields.length === 0 || saving}
                  className="btn-liquid px-6 py-3 bg-brown-900 text-beige-50 rounded-xl text-sm font-medium overflow-hidden disabled:opacity-40"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <span className="relative z-10">Publier & Voir →</span>
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
