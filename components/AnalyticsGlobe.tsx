import RotatingGlobe from "@/components/RotatingGlobe";

export default function AnalyticsGlobe() {
  return <div className="rl-globe-art" aria-hidden="true">
    <RotatingGlobe className="rl-rotating-globe" mode="setup" />
  </div>;
}
