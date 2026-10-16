import 'react-native-gesture-handler';
import React, { useEffect, useState, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

import LoginScreen           from './src/screens/LoginScreen';
import DashboardScreen       from './src/screens/DashboardScreen';
import AdminDashboardScreen  from './src/screens/AdminDashboardScreen';
import DoctorDashboardScreen from './src/screens/DoctorDashboardScreen';
import NurseDashboardScreen  from './src/screens/NurseDashboardScreen';
import RegisterPatientScreen from './src/screens/RegisterPatientScreen';
import AIAssistantScreen     from './src/screens/AIAssistantScreen';
import { auth, db }          from './src/firebase';
import { storeSession, clearSession, authEvents, SESSION_EXPIRED } from './src/api';
import { colors, font }      from './src/theme';

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

  function routeByRole(role: string) {
    if (role === 'admin')        setInitialRoute('AdminDashboard');
    else if (role === 'doctor')  setInitialRoute('DoctorDashboard');
    else if (role === 'nurse')   setInitialRoute('NurseDashboard');
    else                         setInitialRoute('Dashboard');
  }

  // ── Firebase Auth state listener ──────────────────────────────────────
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        await clearSession();
        setInitialRoute('Login');
        return;
      }

      try {
        // Fetch role from Firestore
        const snap = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (!snap.exists()) {
          await clearSession();
          setInitialRoute('Login');
          return;
        }
        const profile = snap.data();
        await storeSession({
          user: {
            uid:      firebaseUser.uid,
            username: profile.username,
            role:     profile.role,
            facility: profile.facility ?? 'Ministry of Health',
            email:    profile.email,
          },
        });
        routeByRole(profile.role);
      } catch {
        // Firestore unreachable — fall back to Login
        await clearSession();
        setInitialRoute('Login');
      }
    });

    return unsubscribe;
  }, []);

  // ── Listen for session expiry from the axios interceptor ──────────────
  useEffect(() => {
    const handler = () => {
      navRef.current?.reset({ index: 0, routes: [{ name: 'Login' }] });
    };
    authEvents.on(SESSION_EXPIRED, handler);
    return () => { authEvents.off(SESSION_EXPIRED, handler); };
  }, []);

  // ── Splash while Firebase resolves the auth state ─────────────────────
  if (!initialRoute) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const headerOptions = {
    headerStyle: {
      backgroundColor:   colors.surface,
      elevation:         0,
      shadowOpacity:     0,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitleStyle: {
      fontSize:      16,
      fontWeight:    font.semibold,
      color:         colors.text,
      letterSpacing: -0.2,
    },
    headerTintColor:        colors.primary,
    headerBackTitleVisible: false,
    cardStyle: { backgroundColor: colors.bg },
  };

  return (
    <NavigationContainer ref={navRef}>
      <Stack.Navigator initialRouteName={initialRoute} screenOptions={headerOptions}>
        <Stack.Screen name="Login"           component={LoginScreen}           options={{ headerShown: false }} />
        <Stack.Screen name="Dashboard"       component={DashboardScreen}       options={{ title: 'SmartCare EMR' }} />
        <Stack.Screen name="AdminDashboard"  component={AdminDashboardScreen}  options={{ title: 'SmartCare EMR — Admin' }} />
        <Stack.Screen name="DoctorDashboard" component={DoctorDashboardScreen} options={{ title: 'SmartCare EMR — Doctor' }} />
        <Stack.Screen name="NurseDashboard"  component={NurseDashboardScreen}  options={{ title: 'SmartCare EMR — Nurse' }} />
        <Stack.Screen name="RegisterPatient" component={RegisterPatientScreen} options={{ title: 'Register Patient' }} />
        <Stack.Screen name="AIAssistant"     component={AIAssistantScreen}     options={{ title: 'SmartCare AI', headerShown: false }} />
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
