import { FlashList as ShopifyFlashList } from "@shopify/flash-list";

/**
 * Shared re-export of @shopify/flash-list FlashList.
 * Using `as any` once here instead of in every consumer file.
 * The FlashList from @shopify/flash-list has complex generic types that
 * cause compatibility issues with Expo/RN versions, so we cast once centrally.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const FlashList = ShopifyFlashList as any;

export default FlashList;
