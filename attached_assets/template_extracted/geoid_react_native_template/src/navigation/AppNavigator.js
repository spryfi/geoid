import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../utils/theme';

// Screens
import SplashScreen from '../screens/SplashScreen';
import HomeScreen from '../screens/HomeScreen';
import IdentifyScreen from '../screens/IdentifyScreen';
import ResultsScreen from '../screens/ResultsScreen';
import CollectionScreen from '../screens/CollectionScreen';
import ExploreScreen from '../screens/ExploreScreen';
import PaywallScreen from '../screens/PaywallScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Bottom Tab Navigator
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Collection') {
            iconName = focused ? 'layers' : 'layers-outline';
          } else if (route.name === 'Explore') {
            iconName = focused ? 'map' : 'map-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.terracottaOrange,
        tabBarInactiveTintColor: COLORS.mediumGray,
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopWidth: 1,
          borderTopColor: COLORS.lightGray,
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Collection" component={CollectionScreen} />
      <Tab.Screen name="Explore" component={ExploreScreen} />
    </Tab.Navigator>
  );
}

// Main Stack Navigator
export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen name="Identify" component={IdentifyScreen} />
        <Stack.Screen name="Results" component={ResultsScreen} />
        <Stack.Screen
          name="Paywall"
          component={PaywallScreen}
          options={{
            presentation: 'modal',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
