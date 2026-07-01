/** Whether a situation instance should show the unread pulse indicator. */
export function isSituationUnread(inst) {
  return inst?.unread === true;
}

/** Clear the unread pulse after the player opens the situation once. */
export function markSituationRead(inst) {
  if (inst) inst.unread = false;
}

export function hasUnreadSituations(player) {
  return (player?.situations || []).some(isSituationUnread);
}

export function unreadSituationCount(player) {
  return (player?.situations || []).filter(isSituationUnread).length;
}

/** Unread panel-listed situations (excludes immersive and auto-open templates). */
export function unreadPanelSituations(player, registry, { isImmersiveTemplate, isAutoOpenTemplate }) {
  if (!player?.situations?.length) return [];
  return player.situations.filter((inst) => {
    if (!isSituationUnread(inst)) return false;
    const tpl = registry[inst.templateId];
    return tpl && !isImmersiveTemplate(tpl) && !isAutoOpenTemplate(tpl);
  });
}
