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
}

export const useTestAutoSave = (permalink: string) => {
  const { user } = useAuth();
  const [isRestoring, setIsRestoring] = useState(false);

  const saveTestState = async (state: SavedTestState) => {
    if (!user || !permalink) return;

    try {
      const { error } = await supabase
        .from('test_states')
        .upsert({
          user_id: user.id,
          test_permalink: permalink,
          state: {
            ...state,
            flaggedQuestions: Array.from(state.flaggedQuestions),
            testStartTime: state.testStartTime.toISOString(),
            currentModuleStartTime: state.currentModuleStartTime.toISOString()
          },
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving test state:', error);
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

  const clearTestState = async () => {
    if (!user || !permalink) return;

    try {
      const { error } = await supabase
        .from('test_states')
        .delete()
        .eq('user_id', user.id)
        .eq('test_permalink', permalink);

      if (error) throw error;
    } catch (error) {
      console.error('Error clearing test state:', error);
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