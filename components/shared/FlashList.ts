/**
 * Shared list component.
 * Uses React Native's FlatList instead of @shopify/flash-list.
 * FlatList is the correct choice for lists with < 20 items
 * and avoids the ~243 KB @shopify/flash-list dependency.
 *
 * Props are intentionally typed as `any` so this can be a
 * drop-in replacement for `import { FlashList } from "@shopify/flash-list"`
 * without generics compatibility issues.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { FlatList } from "react-native";

export default FlatList as any;
