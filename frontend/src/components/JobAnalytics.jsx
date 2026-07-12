import PropTypes from 'prop-types';

export default function JobAnalytics({ analytics }) {
  if (!analytics) {
    return null;
  }

  return (
    <section className="grid gap-4 md:grid-cols-3 mb-8">
      {/* Velocity */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl">
        <p className="text-sm text-white/50">Weekly Velocity</p>

        <div className="mt-3 flex items-end gap-2">
          <h3 className="text-4xl font-semibold text-white">
            {analytics.velocity}
          </h3>

          <span className="pb-1 text-sm text-white/40">apps</span>
        </div>

        <p className="mt-2 text-sm text-white/40">
          Interested → Applied (7 days)
        </p>
      </div>

      {/* Conversion */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl">
        <p className="text-sm text-white/50">Stage Conversion</p>

        <h3 className="mt-3 text-4xl font-semibold text-white">
          {Math.round(analytics.stageConversion * 100)}%
        </h3>

        <p className="mt-2 text-sm text-white/40">
          Applied → Interview (14 days)
        </p>
      </div>

      {/* Time in Stage */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl">
        <p className="text-sm text-white/50">Time in Stage</p>

        <div className="mt-3 space-y-2 max-h-24 overflow-y-auto">
          {Object.entries(analytics.timeInStage ?? {}).length > 0 ? (
            Object.entries(analytics.timeInStage).map(([stage, days]) => (
              <div key={stage} className="flex justify-between text-sm">
                <span className="text-white/70">{stage}</span>

                <span className="text-white font-medium">
                  {days.toFixed(1)} days
                </span>
              </div>
            ))
          ) : (
            <p className="text-sm text-white/40">No stage data yet</p>
          )}
        </div>
      </div>
    </section>
  );
}

JobAnalytics.propTypes = {
  analytics: PropTypes.shape({
    velocity: PropTypes.number.isRequired,
    stageConversion: PropTypes.number.isRequired,
    timeInStage: PropTypes.objectOf(PropTypes.number).isRequired,
  }),
};
