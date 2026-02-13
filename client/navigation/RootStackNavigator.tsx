import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MainTabNavigator from "@/navigation/MainTabNavigator";
import SplashScreen from "@/screens/SplashScreen";
import IdentifyScreen from "@/screens/IdentifyScreen";
import ResultsScreen from "@/screens/ResultsScreen";
import PaywallScreen from "@/screens/PaywallScreen";
import ExploreScreen from "@/screens/ExploreScreen";
import StratigraphicColumnScreen from "@/screens/StratigraphicColumnScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type RootStackParamList = {
  Splash: undefined;
  Main: undefined;
  Identify: undefined;
  Results: { identification: any };
  Paywall: undefined;
  Explore: undefined;
  StratigraphicColumn: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{
        ...screenOptions,
        headerShown: false,
      }}
    >
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Main" component={MainTabNavigator} />
      <Stack.Screen
        name="Identify"
        component={IdentifyScreen}
        options={{
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen
        name="Results"
        component={ResultsScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="Paywall"
        component={PaywallScreen}
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen
        name="Explore"
        component={ExploreScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="StratigraphicColumn"
        component={StratigraphicColumnScreen}
        options={{
          animation: 'slide_from_bottom',
        }}
      />
    </Stack.Navigator>
  );
}
