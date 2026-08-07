import { useMemo } from "react";
import { View } from "react-native";
import { Image } from "expo-image";
import { StyleSheet } from "react-native-unistyles";
import { useCustomBackground } from "./context";

interface CustomBackgroundLayerProps {
  opacity: number;
  blur: number;
}

export function CustomBackgroundLayer({ opacity, blur }: CustomBackgroundLayerProps) {
  const { url } = useCustomBackground();
  const imageSource = useMemo(() => (url ? { uri: url } : null), [url]);
  const imageStyle = useMemo(
    () => [
      imageFillStyle,
      blur > 0 ? { top: -blur * 2, right: -blur * 2, bottom: -blur * 2, left: -blur * 2 } : null,
      { opacity },
    ],
    [blur, opacity],
  );

  if (!imageSource) {
    return null;
  }

  return (
    <View pointerEvents="none" style={styles.container}>
      <Image
        source={imageSource}
        style={imageStyle}
        contentFit="cover"
        contentPosition="center"
        blurRadius={blur}
        transition={180}
      />
    </View>
  );
}

const styles = StyleSheet.create(() => ({
  container: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    overflow: "hidden",
  },
}));

const imageFillStyle = {
  position: "absolute",
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
} as const;
