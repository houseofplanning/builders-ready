import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  Project,
  ProjectStage,
  ProjectFinance,
  Profile,
} from '@br/shared';
import { supabase } from './supabase';
import { useTenant } from './tenant-provider';

const SELECTED_KEY = 'br.current_project.v1';

export interface ProjectListItem {
  id: string;
  name: string;
  status: Project['status'];
  progress_percent: number;
  city: string;
  postcode: string;
}

export interface ResolvedProject {
  project: Project & {
    client: Pick<Profile, 'id' | 'full_name' | 'email' | 'phone'>;
    pm: Pick<Profile, 'id' | 'full_name' | 'email' | 'phone'>;
  };
  stages: ProjectStage[];
  finance: ProjectFinance;
  currentStage: ProjectStage | null;
}

interface CurrentProjectContextValue {
  // The full list of projects the user can see (for the picker).
  projects: ProjectListItem[];
  // The currently-selected project's id.
  selectedId: string | null;
  // The fully-hydrated current project (or null if not yet loaded).
  current: ResolvedProject | null;
  loading: boolean;
  error: string | null;
  /** Switch the active project. Persists to AsyncStorage. */
  setSelectedId: (id: string) => void;
  /** Refetch everything for the current project. */
  refresh: () => Promise<void>;
}

const CurrentProjectContext = createContext<CurrentProjectContextValue>({
  projects: [],
  selectedId: null,
  current: null,
  loading: true,
  error: null,
  setSelectedId: () => {},
  refresh: async () => {},
});

export function useCurrentProject() {
  return useContext(CurrentProjectContext);
}

export function CurrentProjectProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { tenant } = useTenant();
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [selectedId, setSelectedIdState] = useState<string | null>(null);
  const [current, setCurrent] = useState<ResolvedProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initialisedFor = useRef<string | null>(null);

  // --- Step 1: load the project list whenever tenant changes ---------------
  useEffect(() => {
    if (!tenant) {
      setProjects([]);
      setSelectedIdState(null);
      setCurrent(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error: fetchErr } = await supabase
        .from('projects')
        .select('id, name, status, progress_percent, city, postcode')
        .neq('status', 'archived')
        .order('updated_at', { ascending: false });
      if (cancelled) return;
      if (fetchErr) {
        setError(fetchErr.message);
        setLoading(false);
        return;
      }
      const list = (data ?? []) as ProjectListItem[];
      setProjects(list);

      // Pick a selected id: cached → first active → none.
      const cachedId = await AsyncStorage.getItem(
        `${SELECTED_KEY}.${tenant.id}`,
      );
      const validCached = cachedId && list.some((p) => p.id === cachedId);
      const next = validCached
        ? cachedId
        : (list.find((p) => p.status === 'active') ?? list[0])?.id ?? null;
      setSelectedIdState(next);
      initialisedFor.current = tenant.id;
      if (!next) {
        setCurrent(null);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tenant]);

  // --- Step 2: when selection changes, fetch full project payload ---------
  const fetchCurrent = useCallback(
    async (projectId: string) => {
      setError(null);
      const [{ data: project, error: projErr }, { data: stages }, { data: finance }] =
        await Promise.all([
          supabase
            .from('projects')
            .select(
              `*,
               client:profiles!projects_client_id_fkey(id, full_name, email, phone),
               pm:profiles!projects_pm_id_fkey(id, full_name, email, phone)`,
            )
            .eq('id', projectId)
            .maybeSingle(),
          supabase
            .from('project_stages')
            .select('*')
            .eq('project_id', projectId)
            .order('position'),
          supabase
            .from('project_finance')
            .select('*')
            .eq('project_id', projectId)
            .maybeSingle(),
        ]);
      if (projErr) {
        setError(projErr.message);
        setCurrent(null);
        setLoading(false);
        return;
      }
      if (!project) {
        setCurrent(null);
        setLoading(false);
        return;
      }
      // Supabase may hand back joined relations as arrays; flatten.
      const client = Array.isArray((project as { client: unknown }).client)
        ? (project as { client: Profile[] }).client[0]
        : ((project as { client: Profile }).client as Profile);
      const pm = Array.isArray((project as { pm: unknown }).pm)
        ? (project as { pm: Profile[] }).pm[0]
        : ((project as { pm: Profile }).pm as Profile);
      const allStages = (stages ?? []) as ProjectStage[];
      const currentStage =
        allStages.find((s) => s.id === project.current_stage_id) ?? null;
      setCurrent({
        project: { ...project, client, pm } as ResolvedProject['project'],
        stages: allStages,
        finance: (finance ?? {
          project_id: projectId,
          tenant_id: project.tenant_id,
          variations_pence: 0,
          invoiced_pence: 0,
          paid_pence: 0,
          open_decisions: 0,
        }) as ProjectFinance,
        currentStage,
      });
      setLoading(false);
    },
    [],
  );

  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    fetchCurrent(selectedId);
  }, [selectedId, fetchCurrent]);

  // --- Setter persists to AsyncStorage -------------------------------------
  const setSelectedId = useCallback(
    (id: string) => {
      setSelectedIdState(id);
      if (tenant) {
        AsyncStorage.setItem(`${SELECTED_KEY}.${tenant.id}`, id).catch(
          () => null,
        );
      }
    },
    [tenant],
  );

  const refresh = useCallback(async () => {
    if (!tenant) return;
    const { data } = await supabase
      .from('projects')
      .select('id, name, status, progress_percent, city, postcode')
      .neq('status', 'archived')
      .order('updated_at', { ascending: false });
    setProjects((data ?? []) as ProjectListItem[]);
    if (selectedId) await fetchCurrent(selectedId);
  }, [tenant, selectedId, fetchCurrent]);

  const value = useMemo<CurrentProjectContextValue>(
    () => ({
      projects,
      selectedId,
      current,
      loading,
      error,
      setSelectedId,
      refresh,
    }),
    [projects, selectedId, current, loading, error, setSelectedId, refresh],
  );

  return (
    <CurrentProjectContext.Provider value={value}>
      {children}
    </CurrentProjectContext.Provider>
  );
}
