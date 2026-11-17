// react-native-web 0.21 movió `AssetRegistry` de `dist/exports` a
// `dist/modules`, pero el transform web de expo-image todavía importa la ruta
// vieja (`react-native-web/dist/exports/AssetRegistry`) y el bundle web falla.
// Este shim reexpone la misma API con el nombre que espera expo-image.
// Ver el alias en metro.config.js.

import { getAssetByID, registerAsset } from 'react-native-web/dist/modules/AssetRegistry';

export const AssetRegistry = {
  getAssetByID,
  registerAsset,
};

export { getAssetByID, registerAsset };
export default AssetRegistry;
