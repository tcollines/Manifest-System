import React from 'react';
import PhoneInput from '../../../components/PhoneInput';
import {
  Plus,
  FileSpreadsheet,
  Download,
  Search,
  Loader2,
  Trash2,
  Eye,
  ArrowLeft,
  Users,
  CalendarCheck,
  BarChart3,
  UserIcon,
  History,
  CheckCircle,
  Calendar
} from 'lucide-react';
import { useRegistration } from '../RegistrationContext';
import AddMemberForm from '../components/AddMemberForm';
import BulkImportForm from '../components/BulkImportForm';

export default function DatabaseTab() {
  const {
    viewMode,
    isSearching,
    searchQuery,
    selectedMemberIds,
    currentPage,
    itemsPerPage,
    totalMembers,
    filteredMembers,
    selectedMemberDetails,
    isEditingMember,
    formData,
    setViewMode,
    setSelectedService,
    handleExportMembers,
    setSearchQuery,
    setCurrentPage,
    handleDeleteSelected,
    handleSelectAll,
    handleSelectOne,
    handleViewMember,
    setIsEditingMember,
    handleUpdateMember,
    handleInputChange,
    setFormData
  } = useRegistration();

  return (
    <>
      <div className="space-y-6">
        {viewMode === 'list' && (
          <div className="space-y-6 p-4 md:p-0">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <h3 className="text-lg font-bold text-gray-800">Member Database</h3>
              <div className="flex gap-2 w-full md:w-auto">
                <button
                  onClick={() => { setSelectedService(null); setViewMode('register-new'); }}
                  className="flex-1 md:flex-none flex items-center justify-center space-x-2 bg-ministry-text text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Member</span>
                </button>
                <button
                  onClick={() => setViewMode('bulk-import-members')}
                  className="flex-1 md:flex-none flex items-center justify-center space-x-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors shadow-sm font-medium"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Bulk Import</span>
                </button>
                <button
                  onClick={handleExportMembers}
                  className="flex-1 md:flex-none flex items-center justify-center space-x-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors shadow-sm font-medium"
                >
                  <Download className="w-4 h-4" />
                  <span>Export</span>
                </button>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-center">
              {/* Search */}
              <div className="relative flex-1 w-full">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isSearching ? 'text-ministry-orange animate-pulse' : 'text-gray-400'}`} />
                {isSearching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="w-4 h-4 text-ministry-orange animate-spin" />
                  </div>
                )}
                <input
                  type="text"
                  placeholder="Search database..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1); // Reset to page 1 on search
                  }}
                  className="w-full pl-9 pr-4 py-2 bg-gray-100 border-none rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ministry-orange transition-all"
                />
              </div>
              {selectedMemberIds.size > 0 && (
                <div className="flex items-center space-x-2 bg-gray-100 px-3 py-1 rounded-lg">
                  <span className="text-xs font-bold text-gray-600">{selectedMemberIds.size} Selected</span>
                  <button
                    onClick={handleDeleteSelected}
                    className="flex items-center space-x-1 text-red-600 hover:text-red-800 text-xs font-bold"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              )}
            </div>

            {/* LEVEL 1: DATABASE LIST */}
            <div className="animate-in fade-in space-y-4">
              {/* PAGINATION CONTROLS */}
              <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-200 shadow-sm sticky top-0 z-10">
                <div>
                  <span className="text-sm text-gray-600">Showing </span>
                  <span className="font-bold text-gray-900">
                    {totalMembers > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} - {Math.min(currentPage * itemsPerPage, totalMembers)}
                  </span>
                  <span className="text-sm text-gray-600"> of {totalMembers} members</span>
                </div>
                <div className="flex space-x-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-sm text-gray-700 transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    disabled={currentPage * itemsPerPage >= totalMembers}
                    onClick={() => setCurrentPage(p => p + 1)}
                    className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-sm text-gray-700 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex flex-col max-h-[70vh]">
                <div className="overflow-y-auto flex-1">
                  <table className="w-full text-left relative">
                    <thead className="bg-gray-50 border-b border-gray-100 sticky top-0 z-20 shadow-sm">
                      <tr>
                        <th className="p-4 w-10"><input type="checkbox" onChange={handleSelectAll} checked={selectedMemberIds.size === filteredMembers.length && filteredMembers.length > 0} className="rounded border-gray-300" /></th>
                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">Name</th>
                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">Category</th>
                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">Phone</th>
                        <th className="p-4 text-xs font-bold text-gray-500 uppercase">Status</th>
                        <th className="p-4 text-xs font-bold text-gray-500 uppercase text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredMembers.map((member) => (
                        <tr key={member.id} className="hover:bg-gray-50 transition-colors group">
                          <td className="p-4"><input type="checkbox" checked={selectedMemberIds.has(member.id)} onChange={() => handleSelectOne(member.id)} className="rounded border-gray-300" /></td>
                          <td className="p-4 font-bold text-gray-900">{member.name}</td>
                          <td className="p-4 text-sm text-gray-600">{member.category}</td>
                          <td className="p-4 text-sm font-mono text-gray-600">{member.phone}</td>
                          <td className="p-4">
                            <span className={`text-xs px-2 py-1 rounded-full font-bold ${member.status === 'Checked In' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                              {member.status}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <button onClick={() => handleViewMember(member.id)} className="text-ministry-blue font-bold text-xs hover:underline bg-blue-50 px-3 py-1.5 rounded-lg flex items-center gap-1 ml-auto">
                              <Eye className="w-3 h-3" /> View
                            </button>
                          </td>
                        </tr>
                      ))}
                      {filteredMembers.length === 0 && (
                        <tr><td colSpan={6} className="p-12 text-center text-gray-400">No members found matching your search.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {/* Bottom Pagination Info */}
                <div className="flex justify-center mt-4 pb-4">
                  <div className="text-xs text-gray-500">
                    Page {currentPage} of {Math.max(1, Math.ceil(totalMembers / itemsPerPage))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- MEMBER DETAIL VIEW --- */}
        {viewMode === 'member-detail' && selectedMemberDetails && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <button onClick={() => setViewMode('list')} className="flex items-center space-x-2 text-gray-500 hover:text-gray-800">
                <ArrowLeft className="w-5 h-5" />
                <span className="font-bold">Back to Database</span>
              </button>
            </div>

            {/* Top Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex items-center gap-4">
                <div className="p-3 bg-blue-50 rounded-full"><Users className="w-8 h-8 text-blue-600" /></div>
                <div>
                  <p className="text-xs uppercase font-bold text-gray-400">Total Attended</p>
                  <p className="text-2xl font-black text-gray-900">{selectedMemberDetails.attendedCount} Services</p>
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex items-center gap-4">
                <div className="p-3 bg-purple-50 rounded-full"><CalendarCheck className="w-8 h-8 text-purple-600" /></div>
                <div>
                  <p className="text-xs uppercase font-bold text-gray-400">Expected Services</p>
                  <p className="text-2xl font-black text-gray-900">{selectedMemberDetails.totalServices} Held</p>
                  <p className="text-xs text-gray-500">Since Joined ({new Date(selectedMemberDetails.member.joinedDate || '').toLocaleDateString()})</p>
                </div>
              </div>
              <div className="bg-ministry-text text-white p-6 rounded-2xl shadow-lg border-l-4 border-ministry-neon flex items-center gap-4">
                <div className="p-3 bg-white/10 rounded-full"><BarChart3 className="w-8 h-8 text-white" /></div>
                <div>
                  <p className="text-xs uppercase font-bold text-gray-400">Attendance Score</p>
                  <p className="text-3xl font-black">
                    {selectedMemberDetails.totalServices > 0
                      ? Math.round((selectedMemberDetails.attendedCount / selectedMemberDetails.totalServices) * 100)
                      : 0}%
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
              {/* LEFT: Profile Details */}
              <div className="flex-1 bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                  <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2"><UserIcon className="w-5 h-5" /> Member Profile</h3>
                  <button
                    onClick={() => setIsEditingMember(!isEditingMember)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${isEditingMember ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}
                  >
                    {isEditingMember ? 'Cancel Editing' : 'Edit Details'}
                  </button>
                </div>

                <form onSubmit={handleUpdateMember} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500">Full Name</label>
                      <input disabled={!isEditingMember} value={formData.name || ''} onChange={handleInputChange} name="name" className={`w-full p-2 border rounded-lg ${!isEditingMember ? 'bg-gray-50 border-transparent' : 'bg-white border-gray-200'}`} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500">Phone</label>
                      <PhoneInput
                        disabled={!isEditingMember}
                        value={formData.phone || ''}
                        onChange={(val) => setFormData({ ...formData, phone: val })}
                        className={`w-full ${!isEditingMember ? 'bg-gray-50' : 'bg-white'}`}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500">Category</label>
                      <select disabled={!isEditingMember} value={formData.category || ''} onChange={handleInputChange as any} name="category" className={`w-full p-2 border rounded-lg ${!isEditingMember ? 'bg-gray-50 border-transparent' : 'bg-white border-gray-200'}`}>
                        <option>First Timer</option>
                        <option>Member</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500">Residence</label>
                      <input disabled={!isEditingMember} value={formData.residence || ''} onChange={handleInputChange} name="residence" className={`w-full p-2 border rounded-lg ${!isEditingMember ? 'bg-gray-50 border-transparent' : 'bg-white border-gray-200'}`} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500">Occupation</label>
                      <input disabled={!isEditingMember} value={formData.occupation || ''} onChange={handleInputChange} name="occupation" className={`w-full p-2 border rounded-lg ${!isEditingMember ? 'bg-gray-50 border-transparent' : 'bg-white border-gray-200'}`} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500">Place of Work</label>
                      <input disabled={!isEditingMember} value={formData.placeOfWork || ''} onChange={handleInputChange} name="placeOfWork" className={`w-full p-2 border rounded-lg ${!isEditingMember ? 'bg-gray-50 border-transparent' : 'bg-white border-gray-200'}`} />
                    </div>
                  </div>

                  {isEditingMember && (
                    <div className="pt-4 flex justify-end">
                      <button type="submit" className="bg-ministry-text text-white px-6 py-2 rounded-xl font-bold hover:bg-ministry-orange transition-colors">Save Changes</button>
                    </div>
                  )}
                </form>
              </div>

              {/* RIGHT: Attendance History */}
              <div className="w-full lg:w-1/3 bg-white border border-gray-200 rounded-xl p-6 shadow-sm h-fit">
                <h3 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2"><History className="w-5 h-5" /> Recent Activity</h3>
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {selectedMemberDetails.history.map((record: any, idx: number) => (
                    <div key={idx} className="flex items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <div className={`p-2 rounded-full mr-3 ${record.type === 'Service' || !record.type ? 'bg-green-100' : 'bg-purple-100'}`}>
                        {record.type === 'Service' || !record.type ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <Calendar className="w-4 h-4 text-purple-600" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900 flex items-center gap-2">
                          {record.title}
                          {record.type && record.type !== 'Service' && (
                            <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-bold border border-purple-200">
                              {record.type}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500">{record.date} at {record.checkInTime}</p>
                      </div>
                    </div>
                  ))}
                  {selectedMemberDetails.history.length === 0 && (
                    <p className="text-center text-gray-400 py-8 text-sm">No attendance records found yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <AddMemberForm />
        <BulkImportForm />
      </div>
    </>
  );
}
