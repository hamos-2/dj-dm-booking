export interface InstagramMessage {
  id: string;
  instagram_user_id: string;
  message: string;
  received_at: string;
  status: 'unread' | 'read' | 'booked';
}
