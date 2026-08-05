export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  role: "warehouse" | "admin";
  created_at: string;
  updated_at: string;
}

export interface InviteUserInput {
  email: string;
  role: "warehouse" | "admin";
}