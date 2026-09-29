import type { NativeStackNavigationOptions } from "@react-navigation/native-stack";
import { ThemeProvider, useTheme } from "@react-navigation/native";
import { Stack } from "expo-router";
import { isValidElement, type ReactElement, type ReactNode, useCallback, useMemo } from "react";
import { withUnistyles } from "react-native-unistyles";
import { AppearanceStyleBoundary } from "@/components/appearance-style-boundary";

interface ThemedStackBaseProps {
  backgroundColor: string;
  children?: ReactNode;
  navigationBackgroundColor?: string;
  screenOptions?: NativeStackNavigationOptions;
  // Screens whose content is another navigator. That navigator owns its own screens' appearance
  // boundary; wrapping it here would remount it.
  nestedNavigatorScreens?: readonly string[];
}

interface ScreenContent {
  route: { name: string };
  children: ReactNode;
}

function ThemedStackBase({
  backgroundColor,
  children,
  navigationBackgroundColor,
  screenOptions,
  nestedNavigatorScreens,
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
  // Appearance changes remount each screen's content below the native stack, so the navigator
  // and its screen containers keep their identity. See docs/unistyles.md.
  const screenLayout = useCallback(
    ({ route, children: content }: ScreenContent): ReactElement => {
      if (nestedNavigatorScreens?.includes(route.name) && isValidElement(content)) return content;
      return <AppearanceStyleBoundary>{content}</AppearanceStyleBoundary>;
    },
    [nestedNavigatorScreens],
  );

  return (
    <ThemeProvider value={themedNavigationTheme}>
      <Stack screenOptions={themedScreenOptions} screenLayout={screenLayout}>
        {children}
      </Stack>
    </ThemeProvider>
  );
}

export const ThemedStack = withUnistyles(ThemedStackBase, (theme) => ({
  backgroundColor: theme.colors.surface0,
}));
