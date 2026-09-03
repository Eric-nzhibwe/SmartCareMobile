import 'react-native-gesture-handler';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import * as SecureStore from 'expo-secure-store';

import LoginScreen           from './src/screens/LoginScreen';
import DashboardScreen       from './src/screens/DashboardScreen';
import AdminDashboardScreen  from './src/screens/AdminDashboardScreen';
import DoctorDashboardScreen from './src/screens/DoctorDashboardScreen';
import NurseDashboardScreen  from './src/screens/NurseDashboardScreen';
import RegisterPatientScreen from './src/screens/RegisterPatientScreen';
import AIAssistantScreen     from './src/screens/AIAssistantScreen';
import { colors, font }      from './src/theme';
import { api, authEvents, SESSION_EXPIRED, isTokenExpired, clearSession } from './src/api';

export type RootStackParamList = {
  Login:           undefined;
  Dashboard:       undefined;
  AdminDashboard:  undefined;
  DoctorDashboard: undefined;
  NurseDashboard:  undefined;
  RegisterPatient: undefined;
  AIAssistant:     { role: 'doctor' | 'nurse' | 'admin' };
};

const Stack = createStackNavigator<RootStackParamList>();
type InitialRoute = 'Login' | 'Dashboard' | 'AdminDashboard' | 'DoctorDashboard' | 'NurseDashboard';

export default function App() {
  const [initialRoute, setInitialRoute] = useState<InitialRoute | null>(null);
  const navRef = useRef<NavigationContainerRef<RootStackParamList>>(null);

  // ── Resolve initial route ──────────────────────────────────────────────
  const resolveRoute = useCallback(async () => {
    const [token, userRaw] = await Promise.all([
      SecureStore.getItemAsync('token'),
      SecureStore.getItemAsync('user'),
    ]);

    if (!token) {
      setInitialRoute('Login');
      return;
    }

    // Fast path: token is already expired locally — no network needed
    if (isTokenExpired(token)) {
      // Try a silent refresh before giving up
      const refreshToken = await SecureStore.getItemAsync('refresh_token');
      if (refreshToken) {
        try {
          const res = await api.post('/api/token/refresh', { refresh: refreshToken });
          await SecureStore.setItemAsync('token',         res.data.token);
          await SecureStore.setItemAsync('refresh_token', res.data.refresh);
        } catch {
          await clearSession();
          setInitialRoute('Login');
          return;
        }
      } else {
        await clearSession();
        setInitialRoute('Login');
        return;
      }
    }

    // Confirm the token is valid server-side (also fetches the latest user role)
    try {
      const meRes = await api.get('/api/me');
      const user  = meRes.data;
      // Persist the fresh user object
      await SecureStore.setItemAsync('user', JSON.stringify(user));
      routeByRole(user.role);
    } catch {
      // /api/me failed — network issue or truly invalid token
      // Fall back to the locally-stored role so the app still opens offline
      if (userRaw) {
        try {
          routeByRole(JSON.parse(userRaw).role);
          return;
        } catch { /* ignore parse errors */ }
      }
      await clearSession();
      setInitialRoute('Login');
    }
  }, []);

  function routeByRole(role: string) {
    if (role === 'admin')        setInitialRoute('AdminDashboard');
    else if (role === 'doctor')  setInitialRoute('DoctorDashboard');
    else if (role === 'nurse')   setInitialRoute('NurseDashboard');
    else                         setInitialRoute('Dashboard');
  }

  useEffect(() => {
    resolveRoute();
  }, [resolveRoute]);

  // ── Listen for session expiry triggered by the axios interceptor ───────
  useEffect(() => {
    const handler = () => {
      // Navigate to Login from anywhere in the app
      navRef.current?.reset({ index: 0, routes: [{ name: 'Login' }] });
    };
    authEvents.on(SESSION_EXPIRED, handler);
    return () => { authEvents.off(SESSION_EXPIRED, handler); };
  }, []);

  // ── Splash while resolving ─────────────────────────────────────────────
  if (!initialRoute) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const headerOptions = {
    headerStyle: {
      backgroundColor:  colors.surface,
      elevation:        0,
      shadowOpacity:    0,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitleStyle: {
      fontSize:     16,
      fontWeight:   font.semibold,
      color:        colors.text,
      letterSpacing: -0.2,
    },
    headerTintColor:      colors.primary,
    headerBackTitleVisible: false,
    cardStyle: { backgroundColor: colors.bg },
  };

  return (
    <NavigationContainer ref={navRef}>
      <Stack.Navigator initialRouteName={initialRoute} screenOptions={headerOptions}>
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
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
        <Stack.Screen
          name="AIAssistant"
          component={AIAssistantScreen}
          options={{ title: 'SmartCare AI', headerShown: false }}
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
