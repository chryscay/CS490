export const STAGES = [
    'Interested', 'Applied', 'Interview', 'Offer', 'Rejected', 'Archived',
  ];

  // S2-013: the resolution stages. A note captured on a transition INTO one of
// these is the job's outcome reason and must persist (BR-004 stage canon).
export const OUTCOME_STAGES = ['Offer', 'Rejected', 'Archived'];

export function isOutcomeStage(stage) {
  return OUTCOME_STAGES.includes(stage);
}
  
  // S2-BR-005 forward matrix. Archived/Rejected have no forward moves —
  // leaving either requires an override (restore is the separate SCRUM-51 workflow).
  const FORWARD_TRANSITIONS = {
    Interested: ['Applied', 'Rejected'],
    Applied: ['Interview', 'Rejected'],
    Interview: ['Offer', 'Rejected'],
    Offer: ['Archived', 'Rejected'],
    Rejected: [],
    Archived: [],
  };
  
  export function isValidStage(stage) {
    return STAGES.includes(stage);
  }
  
  export function isForwardTransition(fromStage, toStage) {
    return FORWARD_TRANSITIONS[fromStage]?.includes(toStage) ?? false;
  }