import os

path = r'd:\Manifest System\frontend\modules\generic-dept\tabs\ScheduleTab.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Imports
content = content.replace(
    """    Plus, Send, Trash2, ChevronDown, ChevronUp,
    Users, CheckCircle2, Search, X, Calendar, Clock, Pencil
} from 'lucide-react';
import SubmissionStatusWidget from '../../../components/SubmissionStatusWidget';""",
    """    Plus, Send, Trash2, ChevronDown, ChevronUp,
    Users, CheckCircle2, Search, X, Calendar, Clock, Pencil,
    Settings, Share2
} from 'lucide-react';
import { createPortal } from 'react-dom';
import RolesTab from './RolesTab';
import SubmissionStatusWidget from '../../../components/SubmissionStatusWidget';"""
)

# 2. State
content = content.replace(
    """    const [expanded, setExpanded] = useState<string | null>(null);""",
    """    const [expanded, setExpanded] = useState<string | null>(null);
    const [showRoles, setShowRoles] = useState(false);"""
)

# 3. ShareLink
content = content.replace(
    """    const handleDelete = async (id: string) => {
        const ok = await confirm('Delete this schedule and all its sessions?');
        if (!ok) return;
        const res = await ServiceScheduleStore.delete(id);
        if (res.status === 'success') { showToast('Schedule deleted', 'success'); load(); }
        else showToast(res.message, 'error');
    };""",
    """    const handleShareLink = (scheduleId: string, publicSlug?: string) => {
        const url = `${window.location.origin}/schedule/${publicSlug || scheduleId}`;
        navigator.clipboard.writeText(url)
            .then(() => showToast('Availability link copied to clipboard!', 'success'))
            .catch(() => showToast('Failed to copy link', 'error'));
    };"""
)

# 4. Manage Roles & Modal
header_old = """            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-bold text-gray-800">Service Schedules</h2>
                    {teamMembers.length > 0 && (
                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                            <Users className="w-3.5 h-3.5" />
                            {teamMembers.length} team member{teamMembers.length !== 1 ? 's' : ''} available
                        </p>
                    )}
                </div>
            </div>"""

header_new = """            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-bold text-gray-800">Service Schedules</h2>
                    {teamMembers.length > 0 && (
                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                            <Users className="w-3.5 h-3.5" />
                            {teamMembers.length} team member{teamMembers.length !== 1 ? 's' : ''} available
                        </p>
                    )}
                </div>
                {canEdit && (
                    <button 
                        onClick={() => setShowRoles(true)} 
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 shadow-sm transition-all"
                    >
                        <Settings className="w-4 h-4 text-gray-500" />
                        Manage Roles
                    </button>
                )}
            </div>

            {showRoles && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
                            <div>
                                <h3 className="font-bold text-gray-900 text-lg">Manage Roles</h3>
                                <p className="text-sm text-gray-500 mt-0.5">Define operational roles for scheduling assignments.</p>
                            </div>
                            <button 
                                onClick={() => {
                                    setShowRoles(false);
                                    load();
                                }} 
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto">
                            <RolesTab department={department} user={user!} deptRole={deptRole} />
                        </div>
                    </div>
                </div>,
                document.body
            )}

            <SubmissionStatusWidget type="schedule" periodId={schedules[0]?.weekStart ?? ''} />"""

content = content.replace(header_old, header_new)

# 5. ShareLink button
share_old = """                                <div className="flex items-center gap-2">
                                    {canPublish && schedule.status === 'Draft' && (
                                        <button onClick={e => { e.stopPropagation(); handlePublish(schedule.id, schedule.sessions ?? []); }}
                                            className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-lg font-semibold hover:bg-green-200 flex items-center gap-1">
                                            <Send className="w-3.5 h-3.5" /> Publish
                                        </button>
                                    )}"""

share_new = """                                <div className="flex items-center gap-2">
                                    {canPublish && schedule.status === 'Draft' && (
                                        <button onClick={e => { e.stopPropagation(); handleShareLink(schedule.id, schedule.publicSlug); }}
                                            className="text-xs border border-blue-200 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg font-semibold hover:bg-blue-100 flex items-center gap-1">
                                            <Share2 className="w-3.5 h-3.5" /> Share Link
                                        </button>
                                    )}
                                    {canPublish && schedule.status === 'Draft' && (
                                        <button onClick={e => { e.stopPropagation(); handlePublish(schedule.id, schedule.sessions ?? []); }}
                                            className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-lg font-semibold hover:bg-green-200 flex items-center gap-1">
                                            <Send className="w-3.5 h-3.5" /> Publish
                                        </button>
                                    )}"""

content = content.replace(share_old, share_new)

# 6. Delete Button
delete_old = """                                    {canEdit && (
                                        <button onClick={e => { e.stopPropagation(); handleDelete(schedule.id); }}
                                            className="text-red-400 hover:text-red-600 p-1.5 rounded-lg">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                    {expanded === schedule.id"""

delete_new = """                                    {expanded === schedule.id"""

content = content.replace(delete_old, delete_new)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Restoration successful")
