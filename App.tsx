import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import * as SecureStore from 'expo-secure-store';
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import AdminDashboardScreen from './src/screens/AdminDashboardScreen';
import DoctorDashboardScreen from './src/screens/DoctorDashboardScreen';
import NurseDashboardScreen from './src/screens/NurseDashboardScreen';
import RegisterPatientScreen from './src/screens/RegisterPatientScreen';
import { colors, font } from './src/theme';

export type RootStackParamList = {
  Login: undefined;
  Dashboard: undefined;
  AdminDashboard: undefined;
  DoctorDashboard: undefined;
  NurseDashboard: undefined;
  RegisterPatient: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

type InitialRoute = 'Login' | 'Dashboard' | 'AdminDashboard' | 'DoctorDashboard' | 'NurseDashboard';

export default function App() {
  const [initialRoute, setInitialRoute] = useState<InitialRoute | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const [token, userRaw] = await Promise.all([
        SecureStore.getItemAsync('token'),
        SecureStore.getItemAsync('user'),
      ]);
      if (!token) {
        setInitialRoute('Login');
        return;
      }
      if (userRaw) {
        const user = JSON.parse(userRaw);
        if (user.role === 'admin') setInitialRoute('AdminDashboard');
        else if (user.role === 'doctor') setInitialRoute('DoctorDashboard');
        else if (user.role === 'nurse') setInitialRoute('NurseDashboard');
        else setInitialRoute('Dashboard');
      } else {
        setInitialRoute('Dashboard');
      }
    };
    checkAuth();
  }, []);

  if (!initialRoute) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const headerOptions = {
    headerStyle: {
      backgroundColor: colors.surface,
      elevation: 0,
      shadowOpacity: 0,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitleStyle: {
      fontSize: 16,
      fontWeight: font.semibold,
      color: colors.text,
      letterSpacing: -0.2,
    },
    headerTintColor: colors.primary,
    headerBackTitleVisible: false,
    cardStyle: { backgroundColor: colors.bg },
  };

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={initialRoute} screenOptions={headerOptions}>
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
        {/* Legacy fallback route — used for unknown roles */}
        <Stack.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{ title: 'SmartCare EMR' }}
        />
        <Stack.Screen
          name="AdminDashboard"
          component={AdminDashboardScreen}
          options={{ title: 'SmartCare EMR — Admin' }}
        />
        <Stack.Screen
          name="DoctorDashboard"
          component={DoctorDashboardScreen}
          options={{ title: 'SmartCare EMR — Doctor' }}
        />
        <Stack.Screen
          name="NurseDashboard"
          component={NurseDashboardScreen}
          options={{ title: 'SmartCare EMR — Nurse' }}
        />
        <Stack.Screen
          name="RegisterPatient"
          component={RegisterPatientScreen}
          options={{ title: 'Register Patient' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg,
  },
});
