import { useState, useCallback } from 'react';
import { storage } from '../utils/storage';
import { STORAGE_KEYS } from '../constants/storage';
import type { ActiveTab } from '../types';

/**
 * Manages app navigation state: landing page, tabs, modals
 */
export function useAppNavigation() {
    const [showLanding, setShowLanding] = useState(true);
    const [activeTab, setActiveTab] = useState<ActiveTab>('chat');
    const [showSettings, setShowSettings] = useState(false);
    const [showDeploy, setShowDeploy] = useState(false);

    const completeLanding = useCallback(() => {
        storage.setString(STORAGE_KEYS.HAS_VISITED, 'true');
        setShowLanding(false);
    }, []);

    const openSettings = useCallback(() => setShowSettings(true), []);
    const closeSettings = useCallback(() => setShowSettings(false), []);
    const openDeploy = useCallback(() => setShowDeploy(true), []);
    const closeDeploy = useCallback(() => setShowDeploy(false), []);
    const goToLanding = useCallback(() => setShowLanding(true), []);

    return {
        // State
        showLanding,
        activeTab,
        showSettings,
        showDeploy,
        // Actions
        setActiveTab,
        completeLanding,
        openSettings,
        closeSettings,
        openDeploy,
        closeDeploy,
        goToLanding,
    };
}
