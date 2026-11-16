/**
 * Shared virtualized list component.
 * Uses React Native's FlatList (renamed from FlashList for clarity).
 * FlatList is the correct choice for lists with < 20 items
 * and avoids the ~243 KB @shopify/flash-list dependency.
 *
 * The `as any` cast is kept for backward compatibility: some consumers
 * pass FlashList-specific props (estimatedItemSize, getItemType) that
 * FlatList ignores at runtime but TypeScript would reject.
 */

import { FlatList } from "react-native";

export default FlatList as any;
