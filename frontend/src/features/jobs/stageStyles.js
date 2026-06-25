export const STAGES = [
    'Interested',
    'Applied',
    'Interview',
    'Offer',
    'Rejected',
    'Archived',
  ];
  
  const STAGE_STYLES = {
    Interested: 'bg-white/10 text-white/70 border border-white/10',
    Applied: 'bg-blue-500/20 text-blue-300 border border-blue-500/20',
    Interview: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/20',
    Offer: 'bg-green-500/20 text-green-300 border border-green-500/20',
    Rejected: 'bg-red-500/20 text-red-300 border border-red-500/20',
    Archived: 'bg-white/5 text-white/40 border border-white/10',
  };
  
  export function getStageStyles(stage) {
    return STAGE_STYLES[stage] ?? STAGE_STYLES.Interested;
  }

  // S2-013: the resolution stages. Mirrors OUTCOME_STAGES in the backend
// stageTransitions lib. Frontend keys off this set only — never the forward
// matrix, which stays server-authoritative.
export const OUTCOME_STAGES = ['Offer', 'Rejected', 'Archived'];

export function isOutcomeStage(stage) {
  return OUTCOME_STAGES.includes(stage);
}