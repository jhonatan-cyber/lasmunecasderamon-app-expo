// React Native 0.88 dejó de publicar `@react-native/assets-registry`, pero el
// build web de react-native-svg sigue importando
// `@react-native/assets-registry/registry`. Este shim reexpone el registro de
// react-native-web con ese nombre, y con el que espera Expo Image.
// Ver el alias en metro.config.js.

import { getAssetByID, registerAsset } from 'react-native-web/dist/modules/AssetRegistry';

export const AssetRegistry = {
  getAssetByID,
  registerAsset,
};

export { getAssetByID, registerAsset };
export default AssetRegistry;
