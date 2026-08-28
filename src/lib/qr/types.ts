export interface QrRow {
  id: string;
  code: string;
  title: string;
  description: string | null;
  target_url: string;
  is_active: boolean;
  scan_count: number;
  last_scan_at: string | null;
  created_at: string;
  updated_at: string;
  created_by_name: string | null;
}

export interface QrList {
  rows: QrRow[];
  total: number;
  total_scans: number;
  active: number;
}
