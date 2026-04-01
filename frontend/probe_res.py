import sys
import re

filepath = r"d:\Manifest System\frontend\components\ResidentDashboard.tsx"

with open(filepath, "r", encoding="utf-8") as f:
    text = f.read()

# I will just write a new file instead of trying to perfectly regex string match, because it's too risky.
# No, regex matching the known boundaries is safer than overwriting the whole file.

# 1. Overview Tab
overview_start = text.find("            {/* Tab Content: Overview */}\n            {activeTab === 'overview' && (")
overview_end = text.find("            {/* Tab Content: Residences */}\n")

# 2. Residences Tab
residences_start = text.find("            {/* Tab Content: Residences */}\n            {activeTab === 'residences' && (")
residences_end = text.find("            {/* Tab Content: Reports */}\n")

# 3. Reports Tab
reports_start = text.find("            {/* Tab Content: Reports */}\n            {\n                activeTab === 'reports' && (")
if reports_start == -1:
    reports_start = text.find("            {/* Tab Content: Reports */}\n            {activeTab === 'reports' && (")
reports_end = text.find("        </div >\n    );\n};\n")


if overview_start != -1 and residences_start != -1 and reports_start != -1:
    print("Found all boundaries!")
else:
    print(f"Error: {overview_start}, {residences_start}, {reports_start}")
    sys.exit(1)

# Now what are the state variables to extract?
# For ResidencesTab:
res_states = """
    const [showAddResidence, setShowAddResidence] = useState(false);
    const [addStep, setAddStep] = useState<1 | 2>(1);
    const [exactMatches, setExactMatches] = useState<Member[]>([]);
    const [similarMatches, setSimilarMatches] = useState<Member[]>([]);
    const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
    const [memberSearchQuery, setMemberSearchQuery] = useState('');
    const [memberSearchResults, setMemberSearchResults] = useState<Member[]>([]);
    const [isSearchingMembers, setIsSearchingMembers] = useState(false);
    const [isCreatingResidence, setIsCreatingResidence] = useState(false);
    const [isScanningMatches, setIsScanningMatches] = useState(false);
    const [newResidence, setNewResidence] = useState<Partial<Residence>>({
        name: '', coordinator_name: '', coordinator_email: '', coordinator_contact: ''
    });
    const [selectedResidenceForDetails, setSelectedResidenceForDetails] = useState<Residence | null>(null);
    const [residenceMembers, setResidenceMembers] = useState<Member[]>([]);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);

    // Handlers
    const handleViewResidence = async (residence: Residence) => {
        if (selectedResidenceForDetails?.id === residence.id) {
            setSelectedResidenceForDetails(null);
            return;
        }
        setSelectedResidenceForDetails(residence);
        setIsLoadingDetails(true);
        try {
            const members = await fetchResidenceMembers(residence.id as string);
            setResidenceMembers(members);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoadingDetails(false);
        }
    };

    const handleDeleteResidence = async (residence: Residence) => {
        if (window.confirm(`Are you sure you want to delete ${residence.name}? This action cannot be undone.`)) {
            const success = await deleteResidence(residence.id as string);
            if (success && selectedResidenceForDetails?.id === residence.id) {
                setSelectedResidenceForDetails(null);
                setResidenceMembers([]);
            }
        }
    };

    const handleNextStep = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newResidence.name) return;
        setAddStep(2);
        setIsScanningMatches(true);
        try {
            const matches = await MemberStore.searchMembersByResidency(newResidence.name);
            const targetName = newResidence.name?.toLowerCase().trim() || '';
            const exact = matches.filter(m => m.residency?.toLowerCase().trim() === targetName);
            const autoSelectIds = new Set(exact.filter(m => m.attendedServiceIds && m.attendedServiceIds.length > 0).map(m => m.id as string));
            const exactIds = new Set(exact.map(m => m.id as string));
            const similar = matches.filter(m => !exactIds.has(m.id as string));
            setExactMatches(exact);
            setSimilarMatches(similar);
            setSelectedMemberIds(autoSelectIds);
        } catch (err) {
            console.error(err);
        } finally {
            setIsScanningMatches(false);
        }
    };

    const handleSearchMembers = async () => {
        if (!memberSearchQuery.trim()) return;
        setIsSearchingMembers(true);
        try {
            const res = await MemberStore.getMembers(1, 10, memberSearchQuery);
            if (res.status === 'success') {
                const allMatchedIds = new Set([...exactMatches, ...similarMatches].map(m => m.id as string));
                setMemberSearchResults(res.data.filter(m => !allMatchedIds.has(m.id as string)));
            }
        } catch (err) { } finally { setIsSearchingMembers(false); }
    };

    const toggleMemberSelection = (id: string) => {
        const next = new Set(selectedMemberIds);
        if (next.has(id)) next.delete(id); else next.add(id);
        setSelectedMemberIds(next);
    };

    const handleCreateResidence = async () => {
        if (!newResidence.name) return;
        setIsCreatingResidence(true);
        try {
            const success = await addResidence(newResidence as any);
            if (!success) throw new Error("Failed");
            const memberIds = Array.from(selectedMemberIds) as string[];
            if (memberIds.length > 0) await MemberStore.bulkUpdateResidency(memberIds, newResidence.name);
            setShowAddResidence(false); setAddStep(1); setNewResidence({ name: '', coordinator_name: '', coordinator_email: '', coordinator_contact: '' });
            setSelectedMemberIds(new Set()); setExactMatches([]); setSimilarMatches([]); setMemberSearchQuery(''); setMemberSearchResults([]);
        } catch (err) { } finally { setIsCreatingResidence(false); }
    };
"""

# The script does logic decoupling but leaves the file a bit messy if done purely in string manipulation.
print("Check passed. Script ready to be finished.")
