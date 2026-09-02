export interface Product {
  id: string;
  name: string;
  sku?: string | null;
  category: string;
  item_type?: string | null;
  unit?: string | null;
  stock_quantity?: number;
  stock: number;
  target_quantity?: number;
  target: number;
  price: number;
  updated_by?: string | null;
  edit_user?: string | null;
  updated_at?: string | null;
  edit_date?: string | null;
  locations?: string[];
  locationCount?: number;
}

export interface Activity {
  id: string;
  type: "ORDER" | "RECEIVE" | "SYSTEM" | "CREATE" | "UPDATE" | "DELETE";
  message: string;
  user_email: string;
  created_at: string;
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  created_by: string;
  created_at: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  created_by: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  message: string;
  user_id: string;
  user_name: string;
  created_at: string;
}

export interface PublicHoliday {
  date: string;
  localName: string;
  name: string;
  countryCode: string;
}

export interface AllowedUser {
  id?: string;
  username: string;
  created_by?: string;
  created_at?: string;
}

export interface PresencePayload {
  initials?: string;
  user?: string;
  online_at?: string;
}

export interface CleaningAssignment {
  member: string;
  cleaning: boolean;
  waste: boolean;
}

export interface CleaningState {
  assignments: CleaningAssignment[];
  baseWeek: number;
}

export interface LabOrder {
  id: string;
  itemName: string;
  requestedBy: string;
  status: "REQUESTED" | "ORDERED" | "RECEIVED";
  createdAt: string;
  orderedAt?: string;
  orderedBy?: string;
  receivedAt?: string;
  receivedBy?: string;
}
