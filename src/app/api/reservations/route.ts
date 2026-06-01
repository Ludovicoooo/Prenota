// src/app/api/reservations/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { startOfDay, addMinutes, format, parse } from "date-fns";
import { z } from "zod";

const bookingSchema = z.object({
  restaurantSlug: z.string().min(1),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(8),
  partySize: z.number().int().positive().max(20),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  notes: z.string().max(500).optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validated = bookingSchema.parse(body);
    
    const restaurant = await prisma.restaurant.findUnique({
      where: { slug: validated.restaurantSlug, isActive: true }
    });
    
    if (!restaurant) {
      return NextResponse.json({ error: "Ristorante non trovato" }, { status: 404 });
    }
    
    // Controllo disponibilità semplificato (MVP)
    const targetDate = new Date(validated.date);
    const startTime = validated.time;
    const duration = 120; // 2 ore
    const endTime = format(addMinutes(parse(startTime, 'HH:mm', targetDate), duration), 'HH:mm');
    
    // Verifica prenotazioni sovrapposte
    const overlapping = await prisma.reservation.findFirst({
      where: {
        restaurantId: restaurant.id,
        date: startOfDay(targetDate),
        status: { in: ['CONFIRMED', 'PENDING'] },
        OR: [
          { startTime: { lte: startTime }, endTime: { gt: startTime } },
          { startTime: { lt: endTime }, endTime: { gte: endTime } },
          { startTime: { gte: startTime }, endTime: { lte: endTime } }
        ]
      }
    });
    
    if (overlapping) {
      // Trova orari alternativi
      const alternatives = await findAlternativeSlots(restaurant.id, targetDate, validated.partySize);
      return NextResponse.json({
        error: "Slot non disponibile",
        suggestedTimes: alternatives
      }, { status: 409 });
    }
    
    // Crea prenotazione
    const reservation = await prisma.reservation.create({
      data: {
        restaurantId: restaurant.id,
        firstName: validated.firstName,
        lastName: validated.lastName,
        email: validated.email,
        phone: validated.phone,
        partySize: validated.partySize,
        date: startOfDay(targetDate),
        startTime,
        endTime,
        notes: validated.notes,
        status: 'CONFIRMED', // Auto-confirm per MVP
        source: 'web'
      }
    });
    
    // TODO: Invia email di conferma (richiede Resend API key reale)
    
    return NextResponse.json({
      success: true,
      reservation: {
        id: reservation.id,
        confirmationCode: reservation.id.slice(-6).toUpperCase()
      }
    }, { status: 201 });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dati non validi", details: error.errors }, { status: 400 });
    }
    console.error("Booking error:", error);
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }
}

// Helper: trova slot alternativi disponibili
async function findAlternativeSlots(
  restaurantId: string,
  date: Date,
  partySize: number
): Promise<string[]> {
  const slots: string[] = [];
  const openingTime = parse('18:00', 'HH:mm', date); // Semplificato
  const closingTime = parse('23:00', 'HH:mm', date);
  
  let currentTime = openingTime;
  while (currentTime < closingTime) {
    const timeStr = format(currentTime, 'HH:mm');
    const endTime = format(addMinutes(currentTime, 120), 'HH:mm');
    
    const conflict = await prisma.reservation.findFirst({
      where: {
        restaurantId,
        date: startOfDay(date),
        status: { in: ['CONFIRMED', 'PENDING'] },
        OR: [
          { startTime: { lte: timeStr }, endTime: { gt: timeStr } },
          { startTime: { lt: endTime }, endTime: { gte: endTime } }
        ]
      }
    });
    
    if (!conflict) {
      slots.push(timeStr);
      if (slots.length >= 3) break; // Basta trovare 3 alternative
    }
    
    currentTime = addMinutes(currentTime, 30);
  }
  
  return slots;
}