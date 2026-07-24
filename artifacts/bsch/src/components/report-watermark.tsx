import { CSSProperties, ReactNode } from "react";

export function reportWatermarkStyle(
  watermarkEnabled: boolean,
  logoBase64: string | null | undefined,
): CSSProperties {
  if (!watermarkEnabled || !logoBase64) return {};
  return {
    "--report-watermark-image": `url("${logoBase64}")`,
  } as CSSProperties;
}

export function ReportWatermark({
  children,
  enabled,
  logo,
  className = "",
}: {
  children: ReactNode;
  enabled: boolean;
  logo: string | null | undefined;
  className?: string;
}) {
  return (
    <div
      className={`report-watermark ${className}`}
      style={reportWatermarkStyle(enabled, logo)}
    >
      {children}
    </div>
  );
}