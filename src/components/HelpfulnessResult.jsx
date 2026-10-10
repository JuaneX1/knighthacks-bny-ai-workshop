import StatusBanner from './StatusBanner.jsx';

// Shows whether the team's saved bot passed the helpfulness test, in beginner-friendly words.
export default function HelpfulnessResult({ check, unsaved }) {
  if (unsaved) {
    return (
      <StatusBanner tone="warn">
        <strong>Unsaved changes.</strong> Hit "Save & test my bot" or they don't count.
      </StatusBanner>
    );
  }
  if (!check) {
    return (
      <StatusBanner tone="warn">
        <strong>Untested.</strong> Pass the test before time runs out, or your bot counts as broken.
      </StatusBanner>
    );
  }
  if (check.passed) {
    return (
      <StatusBanner tone="good">
        <strong className="mr-1 inline-block rounded border-2 border-current px-1.5 uppercase tracking-widest motion-safe:animate-stamp">
          Passed
        </strong>{' '}
        {check.reason}
      </StatusBanner>
    );
  }
  return (
    <StatusBanner tone="bad">
      <strong>Test failed.</strong> {check.reason} Loosen your rules so the bot still answers normal questions about its
      job, then test again.
    </StatusBanner>
  );
}
