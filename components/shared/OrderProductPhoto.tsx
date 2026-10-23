import { Image } from "react-native";
import { BASE_URL } from "@/api/base-url";

export function OrderProductPhoto({
  foto,
  name,
}: {
  foto?: string;
  name: string;
}) {
  const photo = foto && foto !== "default.png" ? foto : "default.png";
  return (
    <Image
      accessibilityLabel={name}
      source={{
        uri: photo.startsWith("http")
          ? photo
          : `${BASE_URL}/api/images/products/${encodeURIComponent(photo)}`,
      }}
      style={{ width: 52, height: 52, borderRadius: 10 }}
      resizeMode="cover"
    />
  );
}
