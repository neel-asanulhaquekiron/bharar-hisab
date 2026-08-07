import React from "react";
import { type ScrollView, type StyleProp, type ViewStyle } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

/**
 * Keyboard-safe scrollable form container. Uses react-native-keyboard-controller
 * (bundled in Expo Go SDK 54), which handles Android edge-to-edge correctly and
 * keeps the focused input visible above the keyboard.
 */
export function FormScreen({
  children,
  contentStyle,
  scrollRef,
}: {
  children: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  scrollRef?: React.RefObject<ScrollView | null>;
}) {
  return (
    <KeyboardAwareScrollView
      ref={scrollRef as React.RefObject<never>}
      bottomOffset={24}
      contentContainerStyle={contentStyle}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </KeyboardAwareScrollView>
  );
}
