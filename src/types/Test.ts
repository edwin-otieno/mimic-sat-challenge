export interface Test {
  id: string;
  title: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  modules?: any[];
  scaled_scoring?: any;
  permalink?: string;
} 