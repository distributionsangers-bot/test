
import { supabase } from '../../services/supabase.js';

export const DashboardService = {

    /**
     * Fetches global statistics for Admin Dashboard.
     * Replicates original logic from index.html
     */
    async getAdminStats() {
        try {
            // 1. General Stats (Volunteers, Hours, Pending)
            // We fetch all profiles to aggregate client-side as in the original code
            // Optimization (later): use count() query or SQL view
            const { data: profiles, error: profileError } = await supabase
                .from('profiles')
                .select('total_hours, status');

            if (profileError) throw profileError;

            const totalHours = profiles.reduce((acc, curr) => acc + (curr.total_hours || 0), 0);
            const pendingCount = profiles.filter(u => u.status === 'pending').length;
            const volunteersCount = profiles.filter(u => u.status === 'approved').length;

            // 2. Urgent Shifts (Next 7 days)
            const today = new Date();
            const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            const nextWeek = new Date();
            nextWeek.setDate(today.getDate() + 7);
            const nextWeekStr = `${nextWeek.getFullYear()}-${String(nextWeek.getMonth() + 1).padStart(2, '0')}-${String(nextWeek.getDate()).padStart(2, '0')}`;

            const { data: events, error: eventError } = await supabase
                .from('events')
                .select('*, shifts(*, registrations(count))')
                .gte('date', todayStr)
                .lte('date', nextWeekStr)
                .order('date');

            if (eventError) throw eventError;

            return {
                data: {
                    totalHours: Math.round(totalHours),
                    pendingCount,
                    volunteersCount,
                    events // Will be processed in view to find urgencies
                },
                error: null
            };
        } catch (error) {
            console.error("Dashboard Service Error:", error);
            return { data: null, error };
        }
    },

    /**
     * Fetches personal stats and next mission for User Dashboard.
     */
    async getUserStats(userId) {
        try {
            // 1. Get detailed Profile for hours
            const { data: profile, error: profError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (profError) throw profError;

            // 2. Get Next Mission
            // We look for registrations where the associated shift is in the future
            const now = new Date().toISOString();

            const { data: registrations, error: regError } = await supabase
                .from('registrations')
                .select(`
                    id,
                    shifts (
                        id,
                        title,
                        start_time,
                        end_time,
                        date: events (
                            date,
                            location,
                            title
                        )
                    )
                `)
                .eq('user_id', userId)
                // We cannot easily filter joined tables by date in one go with simple query if structure is deep
                // So we'll fetch recent/future ones and filter in JS or use a better query
                // Let's try to fetch all (usually not too many) and filter, OR use a custom RPC if performance needed.
                // For now: fetch generic and sort JS.
                .limit(10); // Check last 10 just to be safe, ideally we want future.

            if (regError) throw regError;

            // Manual Filter for Next Mission
            // We need to flatten and find the first one after NOW
            let nextMission = null;
            if (registrations && registrations.length > 0) {
                const futureMissions = registrations
                    .map(r => {
                        const s = r.shifts;
                        // Determine full date
                        const eventDate = s.date?.date; // events.date
                        if (!eventDate) return null;
                        const fullStart = new Date(`${eventDate}T${s.start_time}`);
                        return { ...s, fullStart, eventTitle: s.date.title, location: s.date.location };
                    })
                    .filter(m => m && m.fullStart > new Date()) // Only future
                    .sort((a, b) => a.fullStart - b.fullStart); // Closest first

                if (futureMissions.length > 0) {
                    nextMission = futureMissions[0];
                }
            }

            return {
                data: {
                    totalHours: profile.total_hours || 0,
                    status: profile.status,
                    nextMission
                },
                error: null
            };

        } catch (error) {
            console.error("User Dashboard Error:", error);
            return { data: null, error };
        }
    }
};
