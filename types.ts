
export enum ItemStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  ALMOST_THERE = 'ALMOST_THERE',
  DONE = 'DONE'
}

export interface ChecklistItem {
  id: string;
  title: string;
  price: number;
  status: ItemStatus;
  progress: number;
  link?: string;
  createdAt: number;
  image?: string;
  imageFit?: 'cover' | 'contain';
  imageScale?: number;
  imagePositionX?: number;
  imagePositionY?: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // Formato YYYY-MM-DD
  description?: string;
}

export interface BudgetLevel {
  id: string;
  label: string;
  target: number;
}

export interface AppTheme {
  primaryColor: string;
  secondaryColor: string;
  portalTitle: string;
  portalTitleColor: string;
  portalSubtitle: string;
  portalSubtitleColor: string;
  backgroundImage: string;
  cardColor: string;
  fontColor: string;
  bgGradientStart: string;
  bgGradientEnd: string;
  actionButtonColor: string;
  objectAnimation: string;
}

export interface AppState {
  items: ChecklistItem[];
  events: CalendarEvent[];
  theme: AppTheme;
  budgetLevels: BudgetLevel[];
}
