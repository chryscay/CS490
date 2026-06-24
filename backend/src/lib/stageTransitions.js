export const STAGES = [
    'Interested', 'Applied', 'Interview', 'Offer', 'Rejected', 'Archived',
  ];
  
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