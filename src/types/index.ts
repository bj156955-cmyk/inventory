export interface Product {
  id: string;
  name: string;
  category: string;
  item_type?: string | null;
  stock: number;
  target: number;
  price: number;
  edit_user?: string | null;
  edit_date?: string | null;
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
