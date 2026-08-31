import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getOverview, getAllManifests } from '../services/adminApi';
import StatsGrid from '../components/StatsGrid';
import ManifestsTable from '../components/ManifestsTable';
import CreateManifestModal from '../components/CreateManifestModal';

interface OverviewData {
    totalManifests: number;
    totalUsers: number;
    totalMembers: number;
    totalEvents: number;
}

interface ManifestData {
    id: string;
    name: string;
    region: string;
    logoUrl?: string;
    contact: string;
    address: string;
    description: string;
    currency: string;
    createdAt: string;
    stats: {
        users: number;
        members: number;
        events: number;
        souls: number;
        children: number;
        passengers: number;
        totalRecords: number;
    };
}

const AdminDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [overview, setOverview] = useState<OverviewData | null>(null);
    const [manifests, setManifests] = useState<ManifestData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [overviewData, manifestsData] = await Promise.all([
                getOverview(),
                getAllManifests(),
            ]);
            setOverview(overviewData);
            setManifests(manifestsData || []);
        } catch (err: any) {
            console.error('[AdminDashboard] Fetch error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const filteredManifests = useMemo(() => {
        if (!searchQuery.trim()) return manifests;
        const q = searchQuery.toLowerCase();
        return manifests.filter(m =>
            m.name?.toLowerCase().includes(q) ||
            m.region?.toLowerCase().includes(q) ||
            m.address?.toLowerCase().includes(q)
        );
    }, [manifests, searchQuery]);

    if (isLoading) {
        return (
            <div className="ac-loading">
                <div className="ac-spinner"></div>
            </div>
        );
    }

    return (
        <>
            <StatsGrid
                items={[
                    { label: 'Total Manifests', value: overview?.totalManifests || 0, color: 'blue' },
                    { label: 'Total Users', value: overview?.totalUsers || 0, color: 'emerald' },
                    { label: 'Total Members', value: overview?.totalMembers || 0, color: 'amber' },
                    { label: 'Total Events', value: overview?.totalEvents || 0, color: 'rose' },
                ]}
            />

            <ManifestsTable
                manifests={filteredManifests}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onCreateClick={() => setShowCreateModal(true)}
                onRowClick={(id) => navigate(`/manifests/${id}`)}
            />

            {showCreateModal && (
                <CreateManifestModal
                    onClose={() => setShowCreateModal(false)}
                    onCreated={() => {
                        setShowCreateModal(false);
                        fetchData();
                    }}
                />
            )}
        </>
    );
};

export default AdminDashboard;
