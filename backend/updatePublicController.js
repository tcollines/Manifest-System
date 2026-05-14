const fs = require('fs');
const path = 'src/controllers/publicController.ts';
let content = fs.readFileSync(path, 'utf8');

const getPublicReplacement = `export const getPublicSchedule = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);
        
        let query = supabase.from('service_schedules').select(\`*, departments(name)\`);
        if (isUuid) {
            query = query.eq('id', id);
        } else {
            query = query.eq('public_slug', id);
        }

        // 1. Fetch schedule
        const { data: schedule, error: scheduleError } = await query.single();
            
        if (scheduleError || !schedule) {
            return res.status(404).json({ error: 'Schedule not found' });
        }

        const resolvedScheduleId = schedule.id;

        // 2. Fetch sessions
        const { data: sessions, error: sessionsError } = await supabase
            .from('schedule_sessions')
            .select('*')
            .eq('schedule_id', resolvedScheduleId)
            .order('sequence', { ascending: true });`;

content = content.replace(/export const getPublicSchedule = async \(req: Request, res: Response\) => \{[\s\S]*?\.order\('sequence', \{ ascending: true \}\);/, getPublicReplacement);

const submitReplacement = `export const submitPublicScheduleAvailability = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { selectedMemberId, selections } = req.body;
    
    if (!id || !selectedMemberId || !selections) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);
        
        let query = supabase.from('service_schedules').select('id, manifest_id, department_id');
        if (isUuid) {
            query = query.eq('id', id);
        } else {
            query = query.eq('public_slug', id);
        }

        const { data: schedule, error: scheduleError } = await query.single();
            
        if (scheduleError || !schedule) {
            return res.status(404).json({ error: 'Schedule not found' });
        }
        
        const scheduleId = schedule.id;`;

content = content.replace(/export const submitPublicScheduleAvailability = async \(req: Request, res: Response\) => \{[\s\S]*?if \(scheduleError \|\| !schedule\) \{\s*return res\.status\(404\)\.json\(\{ error: 'Schedule not found' \}\);\s*\}/, submitReplacement);

fs.writeFileSync(path, content);
console.log('Successfully updated publicController.ts');
