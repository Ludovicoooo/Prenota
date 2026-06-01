// src/app/api/restaurants/[slug]/availability/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { startOfDay, addMinutes, format, parse } from "date-fns";

export async function GET(
  req: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');
    const partySize = searchParams.get('partySize');
    const time = searchParams.get('time');

    if (!date || !partySize) {
      return NextResponse.json(
        { error: "Date e partySize richiesti" }, 
        { status: 400 }
      );
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { slug: params.slug, isActive: true },
      include: { tables: { where: { isActive: true } } }
    });

    if (!restaurant) {
      return NextResponse.json(
        { error: "Ristorante non trovato" }, 
        { status: 404 }
      );
    }

    const targetDate = new Date(date);
    const slots = await generateAvailableSlots({
      restaurant,
      date: targetDate,
      partySize: parseInt(partySize),
      preferredTime: time || undefined
    });

    return NextResponse.json({ slots });

  } catch (error) {
    console.error("Availability check error:", error);
    return NextResponse.json(
      { error: "Errore nel controllo disponibilità" }, 
      { status: 500 }
    );
  }
}

// Genera slot orari con controllo disponibilità
async function generateAvailableSlots({
  restaurant,
  date,
  partySize,
  preferredTime
}: {
  restaurant: any;
  date: Date;
  partySize: number;
  preferredTime?: string;
}) {
  const openingHours = restaurant.openingHours as Record<string, any>;
  const dayKey = date.toLocaleDateString('en-US', { weekday: 'lowercase' });
  const hours = openingHours[dayKey];

  // Se chiuso oggi
  if (!hours || hours === 'closed') {
    return [];
  }

  const slots: Array<{ time: string; available: boolean; seatsLeft?: number }> = [];
  
  // Orari di apertura (semplificato per MVP)
  const openTime = parse(hours.open || '18:00', 'HH:mm', date);
  const closeTime = parse(hours.close || '23:00', 'HH:mm', date);
  const slotDuration = 120; // 2 ore per prenotazione

  let currentTime = openTime;
  while (addMinutes(currentTime, slotDuration) <= closeTime) {
    const timeStr = format(currentTime, 'HH:mm');
    const endTime = format(addMinutes(currentTime, slotDuration), 'HH:mm');
    
    // Conta posti già prenotati in questo slot
    const booked = await prisma.reservation.count({
      where: {
        restaurantId: restaurant.id,
        date: startOfDay(date),
        status: { in: ['CONFIRMED', 'PENDING'] },
        OR: [
          { startTime: { lte: timeStr }, endTime: { gt: timeStr } },
          { startTime: { lt: endTime }, endTime: { gte: endTime } }
        ]
      }
    });

    // Capacità totale (semplificata: tavoli * posti)
    const totalCapacity = restaurant.tables.reduce((sum: number, t: any) => sum + t.seats, 0);
    const availableSeats = totalCapacity - (booked * restaurant.seatsPerTable);
    
    const isAvailable = availableSeats >= partySize;
    
    slots.push({
      time: timeStr,
      available: isAvailable,
      seatsLeft: isAvailable ? availableSeats : 0
    });

    currentTime = addMinutes(currentTime, 30); // Step di 30 minuti
  }

  return slots;
}