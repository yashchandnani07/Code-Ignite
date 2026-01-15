import { getPrisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  // Gracefull fallback if database is not configured (common in new clones)
  try {
    const prisma = getPrisma();

    // Explicit connection attempt to catch auth/net errors early
    await prisma.$connect();


    const count = await prisma.chat.count();

    if (process.env.NODE_ENV === 'development') {
      console.log(`Project count fetched: ${count}`);
    }

    const response = NextResponse.json({
      count,
      timestamp: new Date().toISOString(),
      source: 'database'
    });

    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;
  } catch (error) {
    console.warn('Database error in project-count (likely misconfiguration):', error);

    // Return 0 instead of 500 to keep the UI functional
    const errorResponse = NextResponse.json({
      count: 0,
      error: error instanceof Error ? error.message : 'Database error',
      timestamp: new Date().toISOString(),
      note: 'Returning 0 to prevent UI crash'
    }, { status: 200 }); // Return 200 OK with 0 count even on error

    errorResponse.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    return errorResponse;
  } finally {
    // Only attempt disconnect if we actually have a DB url
    if (process.env.DATABASE_URL) {
      try {
        const prisma = getPrisma();
        await prisma.$disconnect();
      } catch (e) {
        // ignore disconnect errors
      }
    }
  }
} 