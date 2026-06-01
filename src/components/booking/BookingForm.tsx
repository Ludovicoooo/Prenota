// src/components/booking/BookingForm.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  restaurantSlug: string;
  defaultDate?: string;
  defaultPartySize?: number;
  onSuccess?: (confirmation: { id: string; code: string }) => void;
}

export function BookingForm({ 
  restaurantSlug, 
  defaultDate, 
  defaultPartySize, 
  onSuccess 
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ id: string; code: string } | null>(null);

  const today = new Date().toISOString().split('T')[0];
  const maxDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    try {
      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantSlug,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          partySize: parseInt(data.partySize as string),
          date: data.date,
          time: data.time,
          notes: data.notes,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 409 && result.suggestedTimes?.length) {
          setError(`⏰ Slot occupato. Prova: ${result.suggestedTimes.join(', ')}`);
          return;
        }
        throw new Error(result.error || 'Errore nella prenotazione');
      }

      setSuccess(result.reservation);
      onSuccess?.(result.reservation);
      
      // Reset form ma mantieni email per eventuali nuove prenotazioni
      e.currentTarget.reset();
      
    } catch (err: any) {
      console.error('Booking error:', err);
      setError(err.message || 'Qualcosa è andato storto. Riprova.');
    } finally {
      setLoading(false);
    }
  };

  // Se prenotazione riuscita, mostra conferma
  if (success) {
    return (
      <div className="text-center py-6">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">✅</span>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Prenotazione confermata!
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Riceverai una email di conferma a breve.
        </p>
        <div className="bg-gray-50 rounded-lg p-3 mb-4">
          <p className="text-xs text-gray-500">Codice conferma</p>
          <p className="text-lg font-mono font-bold text-primary-600" data-testid="confirmation-code">
            {success.code}
          </p>
        </div>
        <button
          onClick={() => {
            setSuccess(null);
            router.refresh();
          }}
          className="text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          Nuova prenotazione →
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Nome e Cognome - riga singola su mobile */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="firstName">Nome</label>
          <input
            id="firstName"
            name="firstName"
            type="text"
            required
            minLength={2}
            className="input"
            placeholder="Mario"
          />
        </div>
        <div>
          <label className="label" htmlFor="lastName">Cognome</label>
          <input
            id="lastName"
            name="lastName"
            type="text"
            required
            minLength={2}
            className="input"
            placeholder="Rossi"
          />
        </div>
      </div>

      {/* Contatti */}
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="input"
          placeholder="mario@email.com"
        />
      </div>

      <div>
        <label className="label" htmlFor="phone">Telefono</label>
        <input
          id="phone"
          name="phone"
          type="tel"
          required
          pattern="[0-9+\s\-]{8,}"
          className="input"
          placeholder="+39 333 1234567"
        />
      </div>

      {/* Dettagli prenotazione */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="partySize">Persone</label>
          <select
            id="partySize"
            name="partySize"
            required
            defaultValue={defaultPartySize || 2}
            className="input"
          >
            {[1,2,3,4,5,6,7,8,9,10].map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="date">Data</label>
          <input
            id="date"
            name="date"
            type="date"
            required
            min={today}
            max={maxDate}
            defaultValue={defaultDate}
            className="input"
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="time">Orario</label>
        <input
          id="time"
          name="time"
          type="time"
          required
          step="1800" // Step di 30 minuti
          className="input"
          defaultValue="20:00"
        />
      </div>

      <div>
        <label className="label" htmlFor="notes">Note (opzionale)</label>
        <textarea
          id="notes"
          name="notes"
          maxLength={200}
          rows={2}
          className="input resize-none"
          placeholder="Allergie, occasioni speciali, ecc."
        />
        <p className="text-xs text-gray-400 mt-1 text-right">200 caratteri max</p>
      </div>

      {/* Messaggi di errore/successo */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Bottone submit */}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-primary-600 text-white py-3 px-4 rounded-xl font-medium
                   hover:bg-primary-700 active:scale-[0.98] transition-all
                   disabled:opacity-50 disabled:cursor-not-allowed
                   flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Verifica...
          </>
        ) : (
          'Prenota ora'
        )}
      </button>

      <p className="text-xs text-gray-400 text-center">
        Prenotando accetti la nostra privacy policy
      </p>
    </form>
  );
}