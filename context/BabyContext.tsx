import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface Baby {
    baby_id: string;
    tutor_id: string;
    name: string;
    birth_date: string;
    weeks_gestation: number;
    is_premature: boolean;
    sex: string;
    created_at: string;
}

interface BabyContextType {
    babies: Baby[];
    selectedBaby: Baby | null;
    loadingBabies: boolean;
    setSelectedBaby: (baby: Baby) => void;
    refreshBabies: () => Promise<void>;
}

const BabyContext = createContext<BabyContextType>({
    babies: [],
    selectedBaby: null,
    loadingBabies: true,
    setSelectedBaby: () => { },
    refreshBabies: async () => { }
});

export const BabyProvider = ({ children }: { children: React.ReactNode }) => {
    const { user, loading: authLoading } = useAuth();
    const [babies, setBabies] = useState<Baby[]>([]);
    const [selectedBaby, setSelectedBabyState] = useState<Baby | null>(null);
    const [loadingBabies, setLoadingBabies] = useState(true);

    const fetchBabies = async () => {
        if (!user) {
            setBabies([]);
            setSelectedBabyState(null);
            setLoadingBabies(false);
            return;
        }

        try {
            const { data, error } = await supabase
                .from('baby')
                .select('*')
                .eq('tutor_id', user.id)
                .order('created_at', { ascending: true }); // Original registered baby first

            if (!error && data) {
                setBabies(data);

                // Keep the previously selected baby if it still exists, otherwise select the first one
                if (data.length > 0) {
                    const currentSelectedId = selectedBaby?.baby_id;
                    const stillExists = data.find(b => b.baby_id === currentSelectedId);
                    if (!stillExists) {
                        setSelectedBabyState(data[0]);
                    }
                } else {
                    setSelectedBabyState(null);
                }
            }
        } catch (err) {
            console.error("Error fetching babies in Context:", err);
        } finally {
            setLoadingBabies(false);
        }
    };

    useEffect(() => {
        if (!authLoading) {
            setLoadingBabies(true);
            fetchBabies();
        }
    }, [user, authLoading]);

    return (
        <BabyContext.Provider value={{
            babies,
            selectedBaby,
            loadingBabies,
            setSelectedBaby: setSelectedBabyState,
            refreshBabies: fetchBabies
        }}>
            {children}
        </BabyContext.Provider>
    );
};

export const useBaby = () => useContext(BabyContext);
