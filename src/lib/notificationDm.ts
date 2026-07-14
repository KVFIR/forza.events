/** Profile bell shows on only when prefs allow and Discord can DM (mutual guild with bot). */
export function notificationToggleActive(
  prefEnabled: boolean,
  checked: boolean,
  reachable: boolean,
): boolean {
  return prefEnabled && checked && reachable;
}

/** Block enable + show Add bot when reachability was verified and failed. */
export function shouldPromptBotInstallForNotifications(
  checked: boolean,
  reachable: boolean,
): boolean {
  return checked && !reachable;
}
