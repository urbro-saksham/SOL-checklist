import { NextResponse } from 'next/server';
import { getLeaderboardData, DEPARTMENTS } from '@/lib/sheets';
import { parse, isSameWeek, isSameMonth, isValid } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rawData = await getLeaderboardData();

    // 1. SETUP DATE REFERENCES (IST)
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const todayIST = new Date(now.getTime() + istOffset);

    // Format for "Today" string matching
    const todayStr = todayIST.toLocaleDateString('en-IN', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric' 
    }); 

    // Helper: Calculate points
    const calculatePoints = (timeStr: string) => {
        if (!timeStr) return 0;
        const cleanTime = timeStr.replace('🔴 LATE', '').trim().toLowerCase();
        const parts = cleanTime.split(' ');
        const [hours, minutes] = parts[0].split(':').map(n => parseInt(n) || 0);
        let h = hours;
        if (parts[1]?.includes('pm') && h !== 12) h += 12;
        if (parts[1]?.includes('am') && h === 12) h = 0;
        const minutesOfDay = (h * 60) + minutes;
        return Math.max(0, 2000 - minutesOfDay);
    };

    // 2. INITIALIZE
    const scores: Record<string, any> = {};
    DEPARTMENTS.forEach(d => {
        if (d.id !== 'it_check') {
            scores[d.name] = { 
                id: d.id, 
                name: d.name, 
                supervisor: 'Pending...', 
                todayTime: null, 
                points: 0, 
                weeklyScore: 0, 
                monthlyScore: 0 
            };
        }
    });

    // 3. PROCESS DATA
    rawData.forEach(row => {
        const dateStr = row[0];
        if (!dateStr) return;
        const rowDate = parse(dateStr, 'd MMM yyyy', new Date());
        if (!isValid(rowDate)) return;

        DEPARTMENTS.forEach(dept => {
            if (dept.id === 'it_check') return;
            const supervisor = row[dept.startCol + 1];
            const timestamp = row[dept.startCol + 2];
            
            if (timestamp && scores[dept.name]) {
                const pts = calculatePoints(timestamp);
                if (supervisor) scores[dept.name].supervisor = supervisor;

                // Weekly Accumulation (Current Week Only)
                if (isSameWeek(rowDate, todayIST, { weekStartsOn: 1 })) {
                    scores[dept.name].weeklyScore += Math.round(pts / 10);
                }
                // Monthly Accumulation (Current Month Only)
                if (isSameMonth(rowDate, todayIST)) {
                    scores[dept.name].monthlyScore += Math.round(pts / 10);
                }
                // Today's Score
                if (dateStr.trim() === todayStr) {
                     scores[dept.name].todayTime = timestamp;
                     scores[dept.name].points = pts;
                }
            }
        });
    });

    // 4. DETERMINE CHAMPIONS
    const values = Object.values(scores);
    
    // Weekly Champion (Highest Weekly Score > 0)
    const weeklySorted = [...values].sort((a, b) => b.weeklyScore - a.weeklyScore);
    const weeklyChamp = weeklySorted[0]?.weeklyScore > 0 ? weeklySorted[0].id : null;

    // Monthly Champion (Highest Monthly Score > 0)
    const monthlySorted = [...values].sort((a, b) => b.monthlyScore - a.monthlyScore);
    const monthlyChamp = monthlySorted[0]?.monthlyScore > 0 ? monthlySorted[0].id : null;

    // Daily Leaderboard (Sorted by Today's Points)
    const leaderboard = values.sort((a: any, b: any) => b.points - a.points);

    return NextResponse.json({ 
        leaderboard,
        champions: {
            weekly: weeklyChamp,
            monthly: monthlyChamp
        }
    });

  } catch (error) {
    console.error("Leaderboard Error:", error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}