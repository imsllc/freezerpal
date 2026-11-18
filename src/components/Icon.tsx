import React from "react";
import Svg, { Path } from "react-native-svg";

const paths = {
  camera: "M3 7h4l2-3h6l2 3h4v13H3z M16 13a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  calendar:
    "M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2z M7 2v4 M17 2v4 M3 9h18 M7 13h2 M12 13h2 M7 17h2 M12 17h2",
  edit: "M15 5l4 4 M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15z",
  trash: "M3 6h18 M9 6V3h6v3 M5 6l1 15h12l1-15 M10 10v7 M14 10v7",
  filter: "M4 6h16 M4 12h16 M4 18h16 M8 3v6 M16 9v6 M10 15v6",
  chevron: "M6 9l6 6 6-6",
  check: "M5 12l4 4L19 6",
  plus: "M12 5v14 M5 12h14",
  minus: "M5 12h14",
  close: "M6 6l12 12 M6 18L18 6",
  search: "M21 21l-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
  settings:
    "M9.98 4.47L10.57 1.85 13.43 1.85 14.02 4.47 15.9 5.25 18.17 3.81 20.19 5.83 18.75 8.1 19.53 9.98 22.15 10.57 22.15 13.43 19.53 14.02 18.75 15.9 20.19 18.17 18.17 20.19 15.9 18.75 14.02 19.53 13.43 22.15 10.57 22.15 9.98 19.53 8.1 18.75 5.83 20.19 3.81 18.17 5.25 15.9 4.47 14.02 1.85 13.43 1.85 10.57 4.47 9.98 5.25 8.1 3.81 5.83 5.83 3.81 8.1 5.25Z M15.2 12a3.2 3.2 0 1 1-6.4 0 3.2 3.2 0 0 1 6.4 0Z",
  freezer: "M5 2h14v20H5z M5 9h14 M8 5v1 M8 13v4",
} as const;
export type IconName = keyof typeof paths;
export function Icon({
  name,
  color,
  size = 22,
}: {
  name: IconName;
  color: string;
  size?: number;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      accessible={false}
    >
      <Path d={paths[name]} />
    </Svg>
  );
}
