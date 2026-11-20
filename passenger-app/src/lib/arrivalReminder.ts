export type ArrivalReminder = {
  busId: string;
  busLabel: string;
  stopIndex: number;
  stopName: string;
  latitude: number;
  longitude: number;
  createdAt: number;
};

export const ARRIVAL_REMINDER_RADIUS_METERS = 500;

export function distanceMeters(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
): number {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = radians(to.latitude - from.latitude);
  const longitudeDelta = radians(to.longitude - from.longitude);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(from.latitude)) *
      Math.cos(radians(to.latitude)) *
      Math.sin(longitudeDelta / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function isArrivalReminder(value: unknown): value is ArrivalReminder {
  if (!value || typeof value !== "object") return false;
  const reminder = value as Partial<ArrivalReminder>;
  return (
    typeof reminder.busId === "string" &&
    typeof reminder.busLabel === "string" &&
    Number.isInteger(reminder.stopIndex) &&
    typeof reminder.stopName === "string" &&
    Number.isFinite(reminder.latitude) &&
    Number.isFinite(reminder.longitude) &&
    Number.isFinite(reminder.createdAt)
  );
}
