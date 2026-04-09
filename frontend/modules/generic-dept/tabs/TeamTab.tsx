import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Department, DeptChurchMember, User, ModalType } from '../../../types';
import { DeptRole } from '../../../shared/enums';
import { DeptChurchMemberStore } from '../../../database/deptChurchMemberStore';
import { MemberStore } from '../../../database/memberStore';
import { UserStore } from '../../../database/userStore';
import { canEditInTab } from '../../../domain/deptAccessRules';
import { useNotification } from '../../../components/ui/NotificationSystem';
import DataTable, { TableColumn } from '../../../components/ui/DataTable';
import { useDebounce } from '../../../hooks/useDebounce';
import { formatDate } from '../../../shared/formatters';
import { UserPlus, Trash2, CheckCircle2, Search, Link, Plus, Edit2 } from 'lucide-react';

interface Props {
    department: Department;
    user: User | null;
    deptRole: DeptRole | null;
    systemRole: any;
    openModal?: (type: any) => void;
    onEditUser?: (u: User) => void;
}

interface MemberSuggestion { id: string; name: string; phone?: string; }

const TeamTab: React.FC<Props> = ({ department, user, deptRole, systemRole, openModal, onEditUser }) => {
    const { showToast, confirm } = useNotification();
    const canEdit = canEditInTab(deptRole, systemRole, 'team');

    const [activeSubTab, setActiveSubTab] = useState<'members' | 'system_users'>('members');
    
    // Member State
    const [members, setMembers]               = useState<DeptChurchMember[]>([]);
    const [loading, setLoading]               = useState(true);
    const [search, setSearch]                 = useState('');
    const [servingRole, setServingRole]       = useState('');
    const [suggestions, setSuggestions]       = useState<MemberSuggestion[]>([]);
    const [selectedMember, setSelectedMember] = useState<MemberSuggestion | null>(null);
    const [searchLoading, setSearchLoading]   = useState(false);
    const [adding, setAdding]                 = useState(false);
    const [showAddForm, setShowAddForm]       = useState(false);
    const [dropdownOpen, setDropdownOpen]     = useState(false);
    const dropdownRef                         = useRef<HTMLDivElement>(null);
    const searchInputRef                      = useRef<HTMLInputElement>(null);
    const [dropPos, setDropPos]               = useState<{ top: number; left: number; width: number } | null>(null);

    // Linking states
    const [linkingMember, setLinkingMember]   = useState<DeptChurchMember | null>(null);
    const [userSearch, setUserSearch]         = useState('');
    const [userSuggestions, setUserSuggestions] = useState<any[]>([]);
    const [searchingUsers, setSearchingUsers] = useState(false);

    // Add-form account linking states
    const [addUserSearch, setAddUserSearch]         = useState('');
    const [addUserSuggestions, setAddUserSuggestions] = useState<any[]>([]);
    const [addSelectedUser, setAddSelectedUser]     = useState<{ id: string; name: string; email: string } | null>(null);
    const [searchingAddUsers, setSearchingAddUsers] = useState(false);

    // System Users State
    const [systemUsers, setSystemUsers] = useState<User[]>([]);
    const [loadingSystemUsers, setLoadingSystemUsers] = useState(false);

    const debouncedSearch    = useDebounce(search, 350);
    const debouncedUserSearch    = useDebounce(userSearch, 350);
    const debouncedAddUserSearch = useDebounce(addUserSearch, 350);

    const load = useCallback(async () => {
        setLoading(true);
        const res = await DeptChurchMemberStore.getByDepartment(department.id);
        if (res.status === 'success') setMembers(res.data);
        setLoading(false);
    }, [department.id]);

    const loadSystemUsers = useCallback(async () => {
        setLoadingSystemUsers(true);
        const res = await UserStore.getAll();
        if (res.status === 'success' && res.data) {
            const isAdmin = systemRole === 'Administrator' || systemRole === 'Super Admin' || systemRole === 'TeamLeader';
            let usersToShow = isAdmin ? res.data : res.data.filter(u => u.departmentId === user?.departmentId);
            setSystemUsers(usersToShow);
        }
        setLoadingSystemUsers(false);
    }, [user?.departmentId, systemRole]);

    useEffect(() => { 
        if (activeSubTab === 'members') load(); 
        else loadSystemUsers();
    }, [activeSubTab, load, loadSystemUsers]);

    // ── Member autocomplete ──────────────────────────────────────────────────
    useEffect(() => {
        if (debouncedSearch.length < 2 || selectedMember) {
            setSuggestions([]);
            setDropdownOpen(false);
            return;
        }
        let cancelled = false;
        setSearchLoading(true);
        MemberStore.getMembers(1, 8, debouncedSearch)
            .then(res => {
                if (cancelled) return;
                if (res.status === 'success') {
                    const mapped = res.data.map(m => ({ id: m.id!, name: m.name, phone: m.phone }));
                    setSuggestions(mapped);
                    setDropdownOpen(mapped.length > 0);
                } else {
                    setSuggestions([]);
                    setDropdownOpen(false);
                }
            })
            .catch(() => { if (!cancelled) { setSuggestions([]); setDropdownOpen(false); } })
            .finally(() => { if (!cancelled) setSearchLoading(false); });
        return () => { cancelled = true; };
    }, [debouncedSearch, selectedMember]);

    // ── User account link autocomplete (link panel) ──────────────────────────
    useEffect(() => {
        if (!linkingMember || debouncedUserSearch.length < 2) {
            setUserSuggestions([]);
            return;
        }
        let cancelled = false;
        setSearchingUsers(true);
        DeptChurchMemberStore.searchLinkableUsers(department.id, debouncedUserSearch)
            .then(res => {
                if (cancelled) return;
                if (res.status === 'success') setUserSuggestions(res.data);
                else setUserSuggestions([]);
            })
            .catch(() => { if (!cancelled) setUserSuggestions([]); })
            .finally(() => { if (!cancelled) setSearchingUsers(false); });
        return () => { cancelled = true; };
    }, [debouncedUserSearch, linkingMember, department.id]);

    // ── User account search for Add form ─────────────────────────────────────
    useEffect(() => {
        if (debouncedAddUserSearch.length < 2 || addSelectedUser) {
            setAddUserSuggestions([]);
            return;
        }
        let cancelled = false;
        setSearchingAddUsers(true);
        DeptChurchMemberStore.searchLinkableUsers(department.id, debouncedAddUserSearch)
            .then(res => {
                if (cancelled) return;
                if (res.status === 'success') setAddUserSuggestions(res.data);
                else setAddUserSuggestions([]);
            })
            .catch(() => { if (!cancelled) setAddUserSuggestions([]); })
            .finally(() => { if (!cancelled) setSearchingAddUsers(false); });
        return () => { cancelled = true; };
    }, [debouncedAddUserSearch, addSelectedUser, department.id]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handle = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handle);
        return () => document.removeEventListener('mousedown', handle);
    }, []);

    const selectSuggestion = (s: MemberSuggestion) => {
        setSelectedMember(s);
        setSearch(s.name);
        setSuggestions([]);
        setDropdownOpen(false);
    };

    const clearSelection = () => {
        setSelectedMember(null);
        setSearch('');
        setSuggestions([]);
        setDropdownOpen(false);
    };

    const handleAdd = async () => {
        if (!selectedMember) {
            showToast('Select a member from the suggestions list.', 'error');
            return;
        }
        if (!servingRole.trim()) {
            showToast('Please enter a serving role.', 'error');
            return;
        }
        setAdding(true);
        const res = await DeptChurchMemberStore.add(department.id, {
            memberId:    selectedMember.id,
            servingRole: servingRole.trim(),
            userId:      addSelectedUser?.id ?? undefined,
        });
        setAdding(false);
        if (res.status === 'success') {
            showToast('Member added!', 'success');
            setShowAddForm(false);
            clearSelection();
            setServingRole('');
            setAddUserSearch('');
            setAddSelectedUser(null);
            setAddUserSuggestions([]);
            load();
        } else {
            showToast(res.message, 'error');
        }
    };

    const handleRemove = async (m: DeptChurchMember) => {
        const ok = await confirm(`Remove ${m.memberName ?? 'this member'} from the team?`);
        if (!ok) return;
        const res = await DeptChurchMemberStore.remove(department.id, m.memberId);
        if (res.status === 'success') { showToast('Member removed', 'success'); load(); }
        else showToast(res.message, 'error');
    };

    const handleLinkUser = async (userId: string | null) => {
        if (!linkingMember) return;
        const msg = userId ? 'Link this account to member?' : 'Unlink account from this member?';
        if (!await confirm(msg)) return;
        
        const res = await DeptChurchMemberStore.linkToUser(department.id, linkingMember.id, userId);
        if (res.status === 'success') {
            showToast(userId ? 'Account linked successfully!' : 'Account unlinked.', 'success');
            setLinkingMember(null);
            load();
        } else {
            showToast(res.message, 'error');
        }
    };

    const openLinkModal = (m: DeptChurchMember) => {
        setLinkingMember(m);
        setUserSearch('');
        setUserSuggestions([]);
        setShowAddForm(false);
    };

    const columns: TableColumn<DeptChurchMember>[] = [
        { key: 'memberName',  header: 'Name',        sortable: true },
        { key: 'servingRole', header: 'Serving Role', sortable: true },
        {
            key: 'userId' as any,
            header: 'System Login',
            render: (m) => m.userId ? (
                <div className="flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full w-fit cursor-help" title={m.linkedUserEmail}>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{m.linkedUserName || 'Linked'}</span>
                </div>
            ) : canEdit ? (
                <button 
                  onClick={() => openLinkModal(m)} 
                  className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-ministry-orange hover:bg-orange-50 transition-colors px-2.5 py-1 rounded-md"
                >
                    <Link className="w-3.5 h-3.5" />
                    <span>Link Account</span>
                </button>
            ) : (
                 <span className="text-gray-400 text-xs italic">No login</span>
            )
        },
        { key: 'phoneNumber', header: 'Phone',        hideOnMobile: true },
        { key: 'joinedDate',  header: 'Joined',       sortable: true, render: m => formatDate(m.joinedDate ?? null), hideOnMobile: true },
        ...(canEdit ? [{
            key: '_actions' as any,
            header: '',
            align: 'right' as const,
            render: (m: DeptChurchMember) => (
                <button onClick={() => handleRemove(m)} className="text-red-400 hover:text-red-600 p-1 rounded">
                    <Trash2 className="w-4 h-4" />
                </button>
            ),
        }] : []),
    ];

    const handleDeleteSystemUser = async (id: string, name: string) => {
        if (await confirm(`Delete system user ${name}? This action cannot be undone.`)) {
            const response = await UserStore.remove(id);
            if (response.status === 'success') {
                showToast("User deleted successfully.", 'success');
                loadSystemUsers();
            } else {
                showToast(response.message || 'Failed to delete user.', 'error');
            }
        }
    };

    return (
        <div className="flex flex-col gap-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-2">
                <div className="flex gap-6">
                    <button 
                        onClick={() => setActiveSubTab('members')}
                        className={`text-sm font-bold pb-2 border-b-2 transition-colors ${activeSubTab === 'members' ? 'border-ministry-orange text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        Team Members
                    </button>
                    <button 
                        onClick={() => setActiveSubTab('system_users')}
                        className={`text-sm font-bold pb-2 border-b-2 transition-colors ${activeSubTab === 'system_users' ? 'border-ministry-orange text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        System Users
                    </button>
                </div>
                {canEdit && activeSubTab === 'members' && (
                    <button
                        onClick={() => { setShowAddForm(f => !f); clearSelection(); setServingRole(''); setLinkingMember(null); setAddUserSearch(''); setAddSelectedUser(null); setAddUserSuggestions([]); }}
                        className="inline-flex items-center gap-2 bg-ministry-text text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-ministry-orange transition-colors"
                    >
                        <UserPlus className="w-4 h-4" /> Add Member
                    </button>
                )}
                {openModal && activeSubTab === 'system_users' && (
                    <button
                        onClick={() => openModal(ModalType.CREATE_USER)}
                        className="inline-flex items-center gap-2 bg-ministry-text text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-ministry-orange transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4" /> Add System User
                    </button>
                )}
            </div>

            {activeSubTab === 'members' ? (
                <>
                    {/* ── Link Account Form ──────────────────────────────────────── */}
            {canEdit && linkingMember && (
                <div className="bg-white rounded-2xl border-2 border-ministry-orange/20 p-5 shadow-sm flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-semibold text-gray-800 text-sm">
                                Link Account <span className="font-normal text-gray-500 text-xs pl-1">— {linkingMember.memberName}</span>
                            </p>
                            <p className="text-xs text-gray-500 mt-1">Select an active system account to link to this team member.</p>
                        </div>
                        <button onClick={() => setLinkingMember(null)} className="text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 p-1.5 rounded-full transition-colors">✕</button>
                    </div>

                    {linkingMember.userId && (
                        <div className="bg-green-50 text-green-800 p-3 rounded-xl border border-green-100 flex items-center justify-between text-sm">
                            <div className="flex flex-col">
                                <span className="font-semibold">Currently Linked To:</span>
                                <span>{linkingMember.linkedUserName} ({linkingMember.linkedUserEmail})</span>
                            </div>
                            <button
                                onClick={() => handleLinkUser(null)}
                                className="text-red-600 hover:text-red-800 font-medium px-3 py-1.5 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-200"
                            >
                                Unlink
                            </button>
                        </div>
                    )}

                    <div className="flex flex-col gap-2">
                        <div className="relative">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                {searchingUsers ? (
                                    <span className="w-4 h-4 border-2 border-gray-300 border-t-ministry-orange rounded-full animate-spin inline-block" />
                                ) : (
                                    <Search className="w-4 h-4 text-gray-400" />
                                )}
                            </div>
                            <input
                                type="text"
                                value={userSearch}
                                onChange={e => setUserSearch(e.target.value)}
                                placeholder="Search users by name or email..."
                                className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ministry-orange/20"
                            />
                        </div>

                        {userSearch.length >= 2 && (
                            <div className="flex flex-col max-h-60 overflow-y-auto border border-gray-100 rounded-xl mt-1 shadow-inner bg-gray-50/50">
                                {userSuggestions.length === 0 && !searchingUsers ? (
                                    <div className="p-5 text-sm text-center text-gray-500 italic">No matching users found</div>
                                ) : (
                                    userSuggestions.map(u => (
                                        <div key={u.id} className="flex flex-wrap items-center justify-between p-3 gap-3 border-b last:border-b-0 border-gray-100 hover:bg-white transition-colors">
                                            <div className="flex flex-col">
                                                <span className="font-medium text-sm text-gray-800">{u.name}</span>
                                                <span className="text-xs text-gray-500">{u.email} • {u.role}</span>
                                            </div>
                                            <button
                                                onClick={() => handleLinkUser(u.id)}
                                                disabled={linkingMember.userId === u.id}
                                                className="text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed border-ministry-orange bg-ministry-orange/5 text-ministry-orange hover:bg-ministry-orange hover:text-white"
                                            >
                                                {linkingMember.userId === u.id ? 'Already Linked' : 'Link Account'}
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Add Form ───────────────────────────────────────────────── */}
            {canEdit && showAddForm && (
                <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col gap-4">
                    <p className="font-semibold text-gray-800 text-sm">Add a Church Member to Team</p>

                    {/* Member search */}
                    <div className="flex flex-col gap-1" ref={dropdownRef}>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Search member</label>
                        <div className="relative">
                            {/* Leading icon */}
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                {searchLoading ? (
                                    <span className="w-4 h-4 border-2 border-gray-300 border-t-ministry-orange rounded-full animate-spin inline-block" />
                                ) : selectedMember ? (
                                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                                ) : (
                                    <Search className="w-4 h-4 text-gray-400" />
                                )}
                            </div>

                            <input
                                ref={searchInputRef}
                                type="text"
                                value={search}
                                autoComplete="off"
                                onChange={e => {
                                    setSearch(e.target.value);
                                    setSelectedMember(null);
                                    if (searchInputRef.current) {
                                        const r = searchInputRef.current.getBoundingClientRect();
                                        setDropPos({ top: r.bottom + 4, left: r.left, width: r.width });
                                    }
                                }}
                                onFocus={() => {
                                    if (searchInputRef.current) {
                                        const r = searchInputRef.current.getBoundingClientRect();
                                        setDropPos({ top: r.bottom + 4, left: r.left, width: r.width });
                                    }
                                    if (suggestions.length > 0) setDropdownOpen(true);
                                }}
                                placeholder="Type at least 2 characters…"
                                className={`w-full border rounded-xl pl-9 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 transition-colors ${
                                    selectedMember
                                        ? 'border-green-400 bg-green-50 focus:ring-green-200'
                                        : 'border-gray-200 focus:ring-ministry-orange/20'
                                }`}
                            />

                            {/* Clear button when member selected */}
                            {selectedMember && (
                                <button
                                    type="button"
                                    onClick={clearSelection}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 text-base leading-none"
                                >
                                    ✕
                                </button>
                            )}

                            {/* Suggestions dropdown — fixed position to escape overflow-hidden parents */}
                            {dropdownOpen && suggestions.length > 0 && dropPos && (
                                <ul style={{ position: 'fixed', top: dropPos.top, left: dropPos.left, width: dropPos.width, zIndex: 9999 }}
                                    className="bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden max-h-56 overflow-y-auto">
                                    {suggestions.map(s => (
                                        <li
                                            key={s.id}
                                            onMouseDown={e => { e.preventDefault(); selectSuggestion(s); }}
                                            className="flex items-center justify-between px-4 py-2.5 text-sm hover:bg-gray-50 cursor-pointer"
                                        >
                                            <span className="font-medium text-gray-800">{s.name}</span>
                                            {s.phone && <span className="text-gray-400 text-xs ml-2">{s.phone}</span>}
                                        </li>
                                    ))}
                                </ul>
                            )}

                            {/* No results */}
                            {dropdownOpen && suggestions.length === 0 && !searchLoading && debouncedSearch.length >= 2 && !selectedMember && dropPos && (
                                <div style={{ position: 'fixed', top: dropPos.top, left: dropPos.left, width: dropPos.width, zIndex: 9999 }}
                                    className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-sm text-gray-500">
                                    No members found for "<strong>{debouncedSearch}</strong>"
                                </div>
                            )}
                        </div>

                        {/* Warning if user has typed but not selected */}
                        {!selectedMember && search.length >= 2 && !searchLoading && (
                            <p className="text-xs text-amber-600 mt-0.5">
                                ⚠ You must select a member from the list — free-text names are not accepted
                            </p>
                        )}
                    </div>

                    {/* Serving role */}
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Serving Role</label>
                        <input
                            type="text"
                            value={servingRole}
                            onChange={e => setServingRole(e.target.value)}
                            placeholder="e.g. Instrumentalist, Vocalist"
                            className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ministry-orange/20"
                        />
                    </div>

                    {/* System Login (optional) */}
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            System Login <span className="text-gray-400 font-normal normal-case">(optional)</span>
                        </label>
                        {addSelectedUser ? (
                            <div className="flex items-center justify-between border border-green-300 bg-green-50 rounded-xl px-4 py-2.5">
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium text-green-800">{addSelectedUser.name}</span>
                                    <span className="text-xs text-green-600">{addSelectedUser.email}</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => { setAddSelectedUser(null); setAddUserSearch(''); setAddUserSuggestions([]); }}
                                    className="text-gray-400 hover:text-gray-600 ml-3"
                                >✕</button>
                            </div>
                        ) : (
                            <div className="relative">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                    {searchingAddUsers
                                        ? <span className="w-4 h-4 border-2 border-gray-300 border-t-ministry-orange rounded-full animate-spin inline-block" />
                                        : <Search className="w-4 h-4 text-gray-400" />}
                                </div>
                                <input
                                    type="text"
                                    value={addUserSearch}
                                    onChange={e => { setAddUserSearch(e.target.value); setAddSelectedUser(null); }}
                                    placeholder="Search system users to link…"
                                    className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ministry-orange/20"
                                />
                                {addUserSearch.length >= 2 && !addSelectedUser && (
                                    <div className="absolute z-50 mt-1 w-full bg-white border border-gray-100 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                                        {addUserSuggestions.length === 0 && !searchingAddUsers ? (
                                            <div className="px-4 py-3 text-sm text-gray-500 italic">No matching users found</div>
                                        ) : (
                                            addUserSuggestions.map(u => (
                                                <div
                                                    key={u.id}
                                                    onMouseDown={e => { e.preventDefault(); setAddSelectedUser(u); setAddUserSearch(u.name); setAddUserSuggestions([]); }}
                                                    className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 border-gray-50"
                                                >
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-medium text-gray-800">{u.name}</span>
                                                        <span className="text-xs text-gray-500">{u.email} • {u.role}</span>
                                                    </div>
                                                    <CheckCircle2 className="w-4 h-4 text-ministry-orange opacity-60" />
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3 pt-1">
                        <button
                            onClick={handleAdd}
                            disabled={adding || !selectedMember || !servingRole.trim()}
                            className="bg-ministry-text text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-ministry-orange transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {adding ? 'Adding…' : 'Add'}
                        </button>
                        <button
                            onClick={() => { setShowAddForm(false); clearSelection(); setServingRole(''); }}
                            className="text-gray-500 px-4 py-2 rounded-xl text-sm hover:bg-gray-100"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            <DataTable
                columns={columns}
                data={members}
                keyExtractor={m => m.id}
                loading={loading}
                emptyVariant="members"
            />
            </>
            ) : (
                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm min-h-[400px]">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Name</th>
                                    <th className="px-6 py-4">Role</th>
                                    <th className="px-6 py-4">Username</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loadingSystemUsers ? (
                                    <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">Loading users...</td></tr>
                                ) : systemUsers.length === 0 ? (
                                    <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">No system users found.</td></tr>
                                ) : (
                                    systemUsers.map(u => (
                                        <tr key={u.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4">
                                                <span className="font-bold text-gray-900">{u.name}</span>
                                                {u.email && <div className="text-xs text-gray-400">{u.email}</div>}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${u.role === 'Administrator' ? 'bg-purple-100 text-purple-700' :
                                                    u.role === 'Head of Dept' ? 'bg-blue-100 text-blue-700' :
                                                    u.role === 'TeamLeader' ? 'bg-orange-100 text-orange-700' :
                                                    u.role === 'Reg. Admin' ? 'bg-indigo-100 text-indigo-700' :
                                                    u.role === 'Member' ? 'bg-green-100 text-green-700' :
                                                    'bg-gray-100 text-gray-600'
                                                }`}>{u.role}</span>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-mono text-gray-500">{u.username}</td>
                                            <td className="px-6 py-4 text-right flex justify-end gap-2 text-gray-400">
                                                <button 
                                                    onClick={() => onEditUser && onEditUser(u)} 
                                                    className="hover:text-ministry-orange hover:bg-orange-50 p-2 rounded-lg transition-colors"
                                                    title="Edit User"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                {canEdit && (
                                                    <button 
                                                        onClick={() => handleDeleteSystemUser(u.id, u.name)} 
                                                        className="hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                                                        title="Delete User"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeamTab;
