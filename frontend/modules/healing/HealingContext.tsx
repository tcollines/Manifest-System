import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { HealingStore, HealingReport, HealingTestimony } from '../../database/HealingStore';
import { Soul } from '../../types';
import { useNotification } from '../../components/ui/NotificationSystem';
import { useAuth } from '@/context/AuthContext';

interface FormDataType {
    date: string;
    hospital_name: string;
    labourers_count: number | '';
    people_reached: number | '';
    notes: string;
}

interface HealingContextType {
    reports: HealingReport[];
    allSouls: Soul[];
    allTestimonies: HealingTestimony[];
    stats: { totalReports: number; totalTestimonies: number; totalSouls: number };
    loading: boolean;
    
    editingReport: HealingReport | null;
    editingSoul: Soul | null;
    editingTestimony: HealingTestimony | null;
    setEditingReport: (r: HealingReport | null) => void;
    setEditingSoul: (s: Soul | null) => void;
    setEditingTestimony: (t: HealingTestimony | null) => void;
    
    // Draft form state for NewReportTab
    formData: FormDataType;
    setFormData: React.Dispatch<React.SetStateAction<FormDataType>>;
    soulsList: Partial<Soul>[];
    setSoulsList: React.Dispatch<React.SetStateAction<Partial<Soul>[]>>;
    testimoniesList: any[];
    setTestimoniesList: React.Dispatch<React.SetStateAction<any[]>>;
    tempSoul: any;
    setTempSoul: React.Dispatch<React.SetStateAction<any>>;
    tempTestimony: any;
    setTempTestimony: React.Dispatch<React.SetStateAction<any>>;
    
    loadData: () => Promise<void>;
    handleDeleteReport: (id: string) => Promise<void>;
    handleDeleteSoul: (id: string) => Promise<void>;
    handleDeleteTestimony: (id: string) => Promise<void>;
}

const HealingContext = createContext<HealingContextType | undefined>(undefined);

export const HealingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { showToast, confirm } = useNotification();
    
    const [reports, setReports] = useState<HealingReport[]>([]);
    const [allSouls, setAllSouls] = useState<Soul[]>([]);
    const [allTestimonies, setAllTestimonies] = useState<HealingTestimony[]>([]);
    const [stats, setStats] = useState({ totalReports: 0, totalTestimonies: 0, totalSouls: 0 });
    const [loading, setLoading] = useState(true);

    const [editingReport, setEditingReport] = useState<HealingReport | null>(null);
    const [editingSoul, setEditingSoul] = useState<Soul | null>(null);
    const [editingTestimony, setEditingTestimony] = useState<HealingTestimony | null>(null);

    // Form state
    const [formData, setFormData] = useState<FormDataType>({
        date: new Date().toISOString().split('T')[0],
        hospital_name: '',
        labourers_count: '',
        people_reached: '',
        notes: ''
    });

    const [soulsList, setSoulsList] = useState<Partial<Soul>[]>([]);
    const [testimoniesList, setTestimoniesList] = useState<{ content: string; testifier_name: string; testifier_contact: string }[]>([]);

    const [tempSoul, setTempSoul] = useState({
        fullName: '',
        phone: '',
        gender: 'Male',
        residence: '',
        nextOfKinName: '',
        nextOfKinContact: ''
    });
    const [tempTestimony, setTempTestimony] = useState({ content: '', testifier_name: '', testifier_contact: '' });

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [reportsData, statsData, soulsData, testimoniesData] = await Promise.all([
                HealingStore.getAllReports(),
                HealingStore.getStats(),
                HealingStore.getSouls(),
                HealingStore.getTestimonies()
            ]);
            setReports(reportsData);
            setStats(statsData);
            setAllSouls(soulsData);
            setAllTestimonies(testimoniesData);
        } catch (error) {
            showToast('Failed to load healing data', 'error');
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleDeleteReport = async (id: string) => {
        if (await confirm('Are you sure you want to delete this report? This action cannot be undone and may affect linked records.', {
            title: 'Delete Report',
            isDestructive: true
        })) {
            try {
                await HealingStore.deleteReport(id);
                setReports(prev => prev.filter(r => r.id !== id));
                showToast('Report deleted successfully', 'success');
                loadData();
            } catch (error) {
                showToast('Failed to delete report', 'error');
            }
        }
    };

    const handleDeleteSoul = async (id: string) => {
        if (await confirm('Are you sure you want to delete this soul? This action cannot be undone.', {
            title: 'Delete Soul',
            isDestructive: true
        })) {
            try {
                await HealingStore.deleteSoul(id);
                setAllSouls(prev => prev.filter(s => s.id !== id));
                showToast('Soul deleted successfully', 'success');
                loadData();
            } catch (error) {
                showToast('Failed to delete soul', 'error');
            }
        }
    };

    const handleDeleteTestimony = async (id: string) => {
        if (await confirm('Are you sure you want to delete this testimony? This action cannot be undone.', {
            title: 'Delete Testimony',
            isDestructive: true
        })) {
            try {
                await HealingStore.deleteTestimony(id);
                setAllTestimonies(prev => prev.filter(t => t.id !== id));
                showToast('Testimony deleted successfully', 'success');
                loadData();
            } catch (error) {
                showToast('Failed to delete testimony', 'error');
            }
        }
    };

    // Auto-populate when editingReport changes
    useEffect(() => {
        if (editingReport) {
            setFormData({
                date: editingReport.date.split('T')[0],
                hospital_name: editingReport.hospital_name,
                labourers_count: editingReport.labourers_count || '',
                people_reached: editingReport.people_reached || '',
                notes: editingReport.notes || ''
            });
            setSoulsList([]);
            setTestimoniesList([]);
        }
    }, [editingReport]);

    return (
        <HealingContext.Provider value={{
            reports, allSouls, allTestimonies, stats, loading,
            editingReport, editingSoul, editingTestimony,
            setEditingReport, setEditingSoul, setEditingTestimony,
            formData, setFormData, soulsList, setSoulsList, 
            testimoniesList, setTestimoniesList, tempSoul, setTempSoul, 
            tempTestimony, setTempTestimony,
            loadData, handleDeleteReport, handleDeleteSoul, handleDeleteTestimony
        }}>
            {children}
        </HealingContext.Provider>
    );
};

export const useHealing = () => {
    const context = useContext(HealingContext);
    if (context === undefined) {
        throw new Error('useHealing must be used within a HealingProvider');
    }
    return context;
};
