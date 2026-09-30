import StatusBanner from './StatusBanner.jsx';

// Shows whether the team's saved bot passed the helpfulness test, in beginner-friendly words.
export default function HelpfulnessResult({ check, unsaved }) {
  if (unsaved) {
    return (
      <StatusBanner tone="warn">
        <strong>You have changes that aren't saved.</strong> Click "Save & test my bot" so they count.
      </StatusBanner>
    );
  }
  if (!check) {
    return (
      <StatusBanner tone="warn">
        <strong>Not tested yet.</strong> Your bot must pass the test before time runs out, or it counts as broken.
      </StatusBanner>
    );
  }
  if (check.passed) {
    return (
      <StatusBanner tone="good">
        <strong>Passed the test!</strong> {check.reason}
      </StatusBanner>
    );
  }
  return (
    <StatusBanner tone="bad">
      <strong>Failed the test.</strong> {check.reason} Change your rules so your bot answers normal questions about its
      job, then test again.
    </StatusBanner>
  );
}
