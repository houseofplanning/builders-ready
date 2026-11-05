// Scheduling lives in its own area now (see app/[slug]/schedule). The panel
// that assigns people to a job and shows who's on it moved to a shared
// component; re-exported here only so any stale import keeps resolving.
export {
  ProjectSchedulePanel,
  type AssignableResource,
  type BookingRow,
  type StageOpt,
} from '@/components/scheduling/project-schedule-panel';
