const BASE = '/api';

function getToken(): string | null {
  try {
    const raw = localStorage.getItem('survivor_auth');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { token: string };
    return parsed.token;
  } catch {
    return null;
  }
}

let onUnauthorized: (() => void) | null = null;

export function setOnUnauthorized(fn: (() => void) | null) {
  onUnauthorized = fn;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  isFormData = false
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {};

  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!isFormData && body) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: isFormData ? (body as FormData) : body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    if (res.status === 401 && !path.startsWith('/auth/')) {
      onUnauthorized?.();
    }
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error((err as { error: string }).error || 'Request failed');
  }

  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
  postForm: <T>(path: string, formData: FormData) =>
    request<T>('POST', path, formData, true),
  patchForm: <T>(path: string, formData: FormData) =>
    request<T>('PATCH', path, formData, true),
};

export type Season = {
  id: number;
  name: string;
  is_current: number;
  weekly_pick_points: number;
  winner_pick_points: number;
  created_at: string;
};

export type Contestant = {
  id: number;
  name: string;
  headshot_url: string | null;
  display_order: number;
  season_id: number;
  created_at: string;
  is_eliminated?: number;
  eliminated_episode?: number | null;
  eliminated_episode_id?: number | null;
};

export type Episode = {
  id: number;
  episode_number: number;
  air_date: string | null;
  num_eliminations: number;
  deadline: string | null;
  is_locked: number;
  season_id: number;
  created_at: string;
  elimination_count?: number;
};

export type Elimination = {
  id: number;
  episode_id: number;
  contestant_id: number;
  contestant_name: string;
  headshot_url: string | null;
  created_at: string;
};

export type Prediction = {
  id: number;
  user_id: number;
  episode_id: number;
  contestant_id: number;
  contestant_name: string;
  headshot_url: string | null;
  created_at: string;
  username?: string;
  is_correct?: number;
  episode_number?: number;
  is_locked?: number;
  deadline?: string | null;
  elimination_count?: number;
};

export type PreseasonPick = {
  id: number;
  user_id: number;
  contestant_id: number;
  contestant_name: string;
  headshot_url: string | null;
  season_id: number;
  created_at: string;
  username?: string;
};

export type LeaderboardEntry = {
  user_id: number;
  username: string;
  weekly_points: number;
  correct_picks: number;
  total_picks: number;
  preseason_bonus: number;
  total_points: number;
  preseason_pick_name: string | null;
  preseason_pick_eliminated: number;
};

export type ShowStatus = {
  season: Season | null;
  contestants: Contestant[];
  currentEpisode: Episode | null;
  latestEpisode: Episode | null;
  leaderboard: LeaderboardEntry[];
};

export type User = {
  id: number;
  username: string;
  created_at: string;
  is_admin?: boolean;
};
