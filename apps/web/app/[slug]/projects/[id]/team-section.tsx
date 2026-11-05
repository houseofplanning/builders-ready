// Scheduling lives in its own area now (see app/[slug]/schedule). Re-exported
// here only so any stale import keeps resolving.
export {
  WhosOnJob,
  type AssignableResource,
  type BookingRow,
  type StageOpt,
} from '@/components/scheduling/project-schedule-panel';
