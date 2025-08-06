import { useState, useEffect } from 'react';
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
}

export const useTestAutoSave = (permalink: string) => {
  const { user } = useAuth();
  const [isRestoring, setIsRestoring] = useState(false);

  const saveTestState = async (state: SavedTestState): Promise<void> => {
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
    } catch (error) {
      console.error('Error saving test state:', error);
      throw error;
    }
  };

  const loadTestState = async (): Promise<SavedTestState | null> => {
    if (!user || !permalink) return null;

    try {
      const { data, error } = await supabase
        .from('test_states')
        .select('state')
        .eq('user_id', user.id)
        .eq('test_permalink', permalink)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;

      if (data?.state) {
        return {
          ...data.state,
          flaggedQuestions: new Set(data.state.flaggedQuestions),
          completedModules: new Set(data.state.completedModules),
          testStartTime: new Date(data.state.testStartTime),
          currentModuleStartTime: new Date(data.state.currentModuleStartTime)
        };
      }

      return null;
    } catch (error) {
      console.error('Error loading test state:', error);
      return null;
    }
  };

  const clearTestState = async (): Promise<void> => {
    if (!user || !permalink) return;

    try {
      const { error } = await supabase
        .from('test_states')
        .delete()
        .eq('user_id', user.id)
        .eq('test_permalink', permalink);

      if (error) throw error;
      console.log('Test state cleared successfully');
    } catch (error) {
      console.error('Error clearing test state:', error);
      throw error; // Re-throw the error so the caller can handle it
    }
  };

  return {
    saveTestState,
    loadTestState,
    clearTestState,
    isRestoring,
    setIsRestoring
  };
}; 