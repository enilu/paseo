import type { NativeStackNavigationOptions } from "@react-navigation/native-stack";
import { ThemeProvider, useTheme } from "@react-navigation/native";
import { Stack } from "expo-router";
import { type ReactNode, useMemo } from "react";
import { withUnistyles } from "react-native-unistyles";

interface ThemedStackBaseProps {
  backgroundColor: string;
  children?: ReactNode;
  navigationBackgroundColor?: string;
  screenOptions?: NativeStackNavigationOptions;
}

function ThemedStackBase({
  backgroundColor,
  children,
  navigationBackgroundColor,
  screenOptions,
}: ThemedStackBaseProps) {
  const navigationTheme = useTheme();
  const resolvedBackgroundColor = navigationBackgroundColor ?? backgroundColor;
  const themedScreenOptions = useMemo<NativeStackNavigationOptions>(
    () => ({
      ...screenOptions,
      contentStyle: [{ backgroundColor: resolvedBackgroundColor }, screenOptions?.contentStyle],
    }),
    [resolvedBackgroundColor, screenOptions],
  );
  const themedNavigationTheme = useMemo(
    () => ({
      ...navigationTheme,
      colors: {
        ...navigationTheme.colors,
        background: resolvedBackgroundColor,
      },
    }),
    [navigationTheme, resolvedBackgroundColor],
  );

  return (
    <ThemeProvider value={themedNavigationTheme}>
      <Stack screenOptions={themedScreenOptions}>{children}</Stack>
    </ThemeProvider>
  );
}

export const ThemedStack = withUnistyles(ThemedStackBase, (theme) => ({
  backgroundColor: theme.colors.surface0,
}));
