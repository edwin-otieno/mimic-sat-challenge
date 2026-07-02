export interface Test {
  id: string;
  title: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  test_category?: 'SAT' | 'ACT';
  test_variant?: 'full' | 'mini';
  source_test_id?: string | null;
  modules?: any[];
  scaled_scoring?: any;
  permalink?: string;
} 