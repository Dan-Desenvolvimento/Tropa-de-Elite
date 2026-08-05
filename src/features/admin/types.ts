export type EventSummary = {
  event_id: string;
  event_name: string;
  event_slug: string;
  event_status:
    | "draft"
    | "open"
    | "closed"
    | "sold_out"
    | "finished"
    | "cancelled";
  start_at: string;
  is_future: boolean;
  capacity: number | null;
  confirmed_count: number;
  waitlist_count: number;
  cancelled_count: number;
  checkin_count: number;
  email_sent_count: number;
  email_failed_count: number;
  can_edit_event: boolean;
  can_checkin: boolean;
  can_view_registrations: boolean;
  can_manage_registrations: boolean;
  can_anonymize_registrations: boolean;
  can_view_reports: boolean;
  can_view_logs: boolean;
};
