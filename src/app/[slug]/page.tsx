// src/app/[slug]/page.tsx
import { prisma } from "@/lib/db";
import { BookingForm } from "@/components/booking/BookingForm";
import { notFound } from "next/navigation";

interface PageProps {
  params: { slug: string };
  searchParams: { date?: string; partySize?: string };
}

export default async function RestaurantPage({ params, searchParams }: PageProps) {
  // Fetch dati ristorante (Server Component - automatico caching)
  const restaurant = await prisma.restaurant.findUnique({
    where: { slug: params.slug, isActive: true },
    include: { tables: { where: { isActive: true } } }
  });

  if (!restaurant) {
    notFound();
  }

  // Formatta orari di apertura
  const openingHours = formatOpeningHours(restaurant.openingHours as any);

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header con info ristorante */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 py-5">
          <div className="flex items-center gap-4">
            {/* Logo/Immagine */}
            <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center text-white text-2xl font-bold">
              {restaurant.name.charAt(0)}
            </div>
            
            {/* Info */}
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-gray-900 truncate">
                {restaurant.name}
              </h1>
              <p className="text-sm text-gray-600 mt-0.5 line-clamp-1">
                {restaurant.description || "Prenota il tuo tavolo"}
              </p>
              {openingHours && (
                <p className="text-xs text-gray-500 mt-1">
                  🕒 {openingHours}
                </p>
              )}
            </div>
          </div>
          
          {/* Indirizzo e contatti */}
          {(restaurant.address || restaurant.phone) && (
            <div className="mt-4 pt-4 border-t border-gray-100 text-sm text-gray-600 space-y-1">
              {restaurant.address && (
                <p>📍 {restaurant.address}</p>
              )}
              {restaurant.phone && (
                <p>
                  📞 <a href={`tel:${restaurant.phone}`} className="text-primary-600 hover:underline">
                    {restaurant.phone}
                  </a>
                </p>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Form prenotazione */}
      <section className="max-w-lg mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            Prenota un tavolo
          </h2>
          <p className="text-sm text-gray-600 mb-5">
            Compila il form in meno di 30 secondi. Conferma immediata via email.
          </p>
          
          <BookingForm 
            restaurantSlug={params.slug}
            defaultDate={searchParams.date}
            defaultPartySize={searchParams.partySize ? parseInt(searchParams.partySize) : undefined}
          />
        </div>
      </section>

      {/* Info utili */}
      <section className="max-w-lg mx-auto px-4 pb-8">
        <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-900">
          <p className="font-medium mb-2">💡 Info utili</p>
          <ul className="space-y-1 text-blue-800">
            <li>• Arriva puntuale: il tavolo ti aspetta per 15 minuti</li>
            <li>• Per gruppi &gt;10 persone, chiama direttamente</li>
            <li>• Cancellazione gratuita fino a 2 ore prima</li>
          </ul>
        </div>
      </section>
    </main>
  );
}

// Helper: formatta orari di apertura per display
function formatOpeningHours(hours: Record<string, any>): string | null {
  if (!hours) return null;
  
  const today = new Date().toLocaleDateString('en-US', { weekday: 'lowercase' });
  const todayHours = hours[today];
  
  if (!todayHours || todayHours === 'closed') return 'Chiuso oggi';
  
  if (todayHours.open2) {
    // Orari spezzati (es. pranzo e cena)
    return `${todayHours.open}-${todayHours.close} / ${todayHours.open2}-${todayHours.close2}`;
  }
  
  return `${todayHours.open}-${todayHours.close}`;
}