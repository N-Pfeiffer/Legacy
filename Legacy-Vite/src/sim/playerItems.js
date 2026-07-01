/** @deprecated Import from personItems.js — re-exports for backward compatibility. */
export {
  ensureItemsArray,
  ensureInventoryStores,
  hasItem,
  ownedItemIds,
  grantItem,
  removeItem,
  itemIsSingleUse,
  consumeSingleUseItem,
  clearItems,
  addMaterial,
  removeMaterial,
  materialCount,
  addEquipment,
  removeEquipmentByUid,
  listEquipment,
  migratePersonInventory,
} from './personItems.js';

export {
  equipItem,
  unequipItem,
  equippedUids,
  equippedItems,
  isEquipped,
  slotForItem,
  EQUIPPED_SLOT_DEFAULTS,
} from './equipment.js';
