import { NextResponse } from 'next/server';
import { fetchDashboardMetrics } from '@/lib/sheets';

// This ensures the data is always fresh and not cached
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Call the "Keyword Hunter" function we added to lib/sheets.ts
    const metrics = await fetchDashboardMetrics();
    
    return NextResponse.json({ 
      success: true, 
      metrics 
    });
  } catch (error) {
    console.error("Dashboard API Error:", error);
    return NextResponse.json({ error: 'Failed to fetch dashboard metrics' }, { status: 500 });
  }
}