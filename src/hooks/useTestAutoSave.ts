import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface SavedTestState {
  currentQuestionIndex: number;
  userAnswers: Record<string, string>;
  flaggedQuestions: Set<string>;
  crossedOutOptions: Record<string, string[]>;
  testStartTime: Date;
  currentModuleStartTime: Date;
  currentModuleTimeLeft: number;
  // Timer-related states
  currentPartTimeLeft: number;
  timerRunning: boolean;
  timerVisible: boolean;
  currentPart: { [moduleType: string]: 1 | 2 };
  selectedModule: string | null;
  partTimes: { [moduleType: string]: number };
  // Module-related states
  showModuleSelection: boolean;
  completedModules: Set<string>;
  showModuleScores: boolean;
  showPartTransition: boolean;
  // Track last saved question for each module/part
  lastSavedQuestions?: { [key: string]: number };
  // Track saved timer per module/part (test-specific)
  savedPartTimes?: { [key: string]: number };
}

// Module-level cache for test states (persists across component remounts)
const testStateCache = (() => {
  if (!(window as any).__testStateCache) {
    (window as any).__testStateCache = new Map<string, { data: SavedTestState | null, timestamp: number }>();
  }
  return (window as any).__testStateCache;
})();

const TEST_STATE_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes (test states don't change frequently)

export const useTestAutoSave = (permalink: string) => {
  const { user } = useAuth();
  const [isRestoring, setIsRestoring] = useState(false);

  const saveTestState = useCallback(async (state: SavedTestState): Promise<void> => {
    console.log('saveTestState called with state:', state);
    if (!user || !permalink) {
      console.log('No user or permalink, returning early');
      return;
    }

    try {
      console.log('Preparing to save state to database...');
      const stateToSave = {
        ...state,
        flaggedQuestions: Array.from(state.flaggedQuestions),
        completedModules: Array.from(state.completedModules),
        testStartTime: state.testStartTime.toISOString(),
        currentModuleStartTime: state.currentModuleStartTime.toISOString()
      };
      console.log('State prepared for database:', stateToSave);
      
      const { error } = await supabase
        .from('test_states')
        .upsert({
          user_id: user.id,
          test_permalink: permalink,
          state: stateToSave,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error from supabase:', error);
        throw error;
      }
      console.log('State saved successfully to database');
      
      // Invalidate cache after save to ensure fresh data on next load
      const key = `${user.id}:${permalink}`;
      testStateCache.delete(key);
    } catch (error) {
      console.error('Error saving test state:', error);
      throw error;
    }
  }, [user, permalink]);

  const loadTestState = useCallback(async (): Promise<SavedTestState | null> => {
    if (!user || !permalink) return null;

    const key = `${user.id}:${permalink}`;
    const now = Date.now();

    // Check cache first
    const cached = testStateCache.get(key);
    if (cached && now - cached.timestamp < TEST_STATE_CACHE_DURATION) {
      console.log('✅ Using cached test state for:', permalink);
      return cached.data;
    }

    try {
      const { data, error } = await supabase
        .from('test_states')
        .select('state')
        .eq('user_id', user.id)
        .eq('test_permalink', permalink)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        // Handle specific CORS or network errors
        if (error.message?.includes('NetworkError') || error.message?.includes('CORS')) {
          console.warn('CORS/Network error loading test state, will use sessionStorage fallback:', error.message);
          // Cache null result to avoid repeated failed requests
          testStateCache.set(key, { data: null, timestamp: now });
          return null;
        }
        throw error;
      }

      let result: SavedTestState | null = null;
      if (data?.state) {
        result = {
          ...data.state,
          flaggedQuestions: new Set(data.state.flaggedQuestions),
          completedModules: new Set(data.state.completedModules),
          testStartTime: new Date(data.state.testStartTime),
          currentModuleStartTime: new Date(data.state.currentModuleStartTime)
        };
      }

      // Cache the result (even if null)
      testStateCache.set(key, { data: result, timestamp: now });

      // Clean up old cache entries
      if (testStateCache.size > 200) {
        for (const [k, v] of testStateCache.entries()) {
          if (now - v.timestamp > TEST_STATE_CACHE_DURATION) {
            testStateCache.delete(k);
          }
        }
      }

      return result;
    } catch (error) {
      console.error('Error loading test state:', error);
      // Cache null result to avoid repeated failed requests
      testStateCache.set(key, { data: null, timestamp: now });
      return null;
    }
  }, [user, permalink]);

  const clearTestState = useCallback(async (): Promise<void> => {
    if (!user || !permalink) return;

    try {
      const { error } = await supabase
        .from('test_states')
        .delete()
        .eq('user_id', user.id)
        .eq('test_permalink', permalink);

      if (error) throw error;
      console.log('Test state cleared successfully');
      
      // Clear cache after deletion
      const key = `${user.id}:${permalink}`;
      testStateCache.delete(key);
    } catch (error) {
      console.error('Error clearing test state:', error);
      throw error; // Re-throw the error so the caller can handle it
    }
  }, [user, permalink]);

  return {
    saveTestState,
    loadTestState,
    clearTestState,
    isRestoring,
    setIsRestoring
  };
}; 