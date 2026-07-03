export const possessionsPanelState = {
  activeFilters: [],
  sortMode: 'recent',
  highlightItemId: null,
  highlightEquipmentUid: null,
};

export function setInventoryItemHighlight(itemId, equipmentUid = null) {
  possessionsPanelState.highlightItemId = itemId || null;
  possessionsPanelState.highlightEquipmentUid = equipmentUid || null;
}

export function clearInventoryItemHighlight() {
  possessionsPanelState.highlightItemId = null;
  possessionsPanelState.highlightEquipmentUid = null;
}

export function isEntryHighlighted(entry) {
  const { highlightItemId, highlightEquipmentUid } = possessionsPanelState;
  if (!highlightItemId || entry.itemId !== highlightItemId) return false;
  if (highlightEquipmentUid) {
    return entry.uid === highlightEquipmentUid;
  }
  return !entry.uid;
}
export function resetInventoryFiltersOnEnter() {
  possessionsPanelState.activeFilters = [];
}
