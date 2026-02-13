import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet, View } from "react-native";
import HomeScreen from "@/screens/HomeScreen";
import IdentifyScreen from "@/screens/IdentifyScreen";
import CollectionScreen from "@/screens/CollectionScreen";
import ExploreScreen from "@/screens/ExploreScreen";
import ProfileScreen from "@/screens/ProfileScreen";
import { COLORS, BORDER_RADIUS } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";

export type MainTabParamList = {
  Home: undefined;
  Identify: undefined;
  Collection: undefined;
  Explore: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabNavigator() {
  const { isDark } = useTheme();

  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.mediumGray,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: Platform.select({
            ios: "transparent",
            android: COLORS.white,
            web: COLORS.white,
          }),
          borderTopWidth: 0,
          elevation: 8,
          height: 80,
          paddingBottom: 16,
          paddingTop: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
        },
        tabBarBackground: () =>
          Platform.OS === "ios" ? (
            <BlurView
              intensity={100}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : null,
        headerShown: false,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Feather name="home" size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Identify"
        component={IdentifyScreen}
        options={{
          title: "Identify",
          tabBarIcon: ({ color, size }) => (
            <View style={styles.identifyIconContainer}>
              <Feather name="camera" size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Collection"
        component={CollectionScreen}
        options={{
          title: "Collection",
          tabBarIcon: ({ color, size }) => (
            <Feather name="layers" size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Explore"
        component={ExploreScreen}
        options={{
          title: "Explore",
          tabBarIcon: ({ color, size }) => (
            <Feather name="map" size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Feather name="user" size={22} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  identifyIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
