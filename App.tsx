import 'react-native-gesture-handler';
import React, { useEffect, useState, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { FontAwesome5 } from '@expo/vector-icons';

import LoginScreen            from './src/screens/LoginScreen';
import DashboardScreen        from './src/screens/DashboardScreen';
import AdminDashboardScreen   from './src/screens/AdminDashboardScreen';
import DoctorDashboardScreen  from './src/screens/DoctorDashboardScreen';
import NurseDashboardScreen   from './src/screens/NurseDashboardScreen';
import RegisterPatientScreen  from './src/screens/RegisterPatientScreen';
import AIAssistantScreen      from './src/screens/AIAssistantScreen';
import AppDrawer              from './src/components/AppDrawer';
import { auth, db }           from './src/firebase';
import { storeSession, clearSession, authEvents, SESSION_EXPIRED } from './src/api';
import { colors, font }       from './src/theme';

// ── Param lists ───────────────────────────────────────────────────────────

export type RootStackParamList = {
  Login:          undefined;
  DoctorDrawer:   undefined;
  NurseDrawer:    undefined;
  AdminDrawer:    undefined;
  Dashboard:      undefined;
  RegisterPatient:undefined;
  AIAssistant:    { role: 'doctor' | 'nurse' | 'admin' };
};

type DoctorDrawerParamList = {
  DoctorHome: undefined;
  RegisterPatient: undefined;
  AIAssistant: { role: 'doctor' };
};

type NurseDrawerParamList = {
  NurseHome: undefined;
  RegisterPatient: undefined;
  AIAssistant: { role: 'nurse' };
};

type AdminDrawerParamList = {
  AdminHome: undefined;
  RegisterPatient: undefined;
  AIAssistant: { role: 'admin' };
};

// ── Navigators ────────────────────────────────────────────────────────────

const Stack        = createStackNavigator<RootStackParamList>();
const DoctorDrawer = createDrawerNavigator<DoctorDrawerParamList>();
const NurseDrawer  = createDrawerNavigator<NurseDrawerParamList>();
const AdminDrawer  = createDrawerNavigator<AdminDrawerParamList>();

// ── Shared header options ─────────────────────────────────────────────────

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

// ── Hamburger button helper ───────────────────────────────────────────────

function HamburgerButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={{ marginLeft: 16 }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
      <FontAwesome5 name="bars" size={16} color={colors.primary} />
    </TouchableOpacity>
  );
}

// ── Role Drawer Navigators ────────────────────────────────────────────────

function DoctorDrawerNavigator() {
  return (
    <DoctorDrawer.Navigator
      drawerContent={(props) => <AppDrawer {...props} />}
      screenOptions={({ navigation }) => ({
        ...headerOptions,
        headerLeft: () => <HamburgerButton onPress={() => navigation.toggleDrawer()} />,
        drawerType: 'slide',
        overlayColor: 'rgba(0,0,0,0.4)',
        drawerStyle: { width: 280 },
      })}
    >
      <DoctorDrawer.Screen
        name="DoctorHome"
        component={DoctorDashboardScreen}
        options={{ title: 'SmartCare — Doctor' }}
      />
      <DoctorDrawer.Screen
        name="RegisterPatient"
        component={RegisterPatientScreen}
        options={{ title: 'Register Patient' }}
      />
      <DoctorDrawer.Screen
        name="AIAssistant"
        component={AIAssistantScreen}
        options={{ headerShown: false }}
        initialParams={{ role: 'doctor' }}
      />
    </DoctorDrawer.Navigator>
  );
}

function NurseDrawerNavigator() {
  return (
    <NurseDrawer.Navigator
      drawerContent={(props) => <AppDrawer {...props} />}
      screenOptions={({ navigation }) => ({
        ...headerOptions,
        headerLeft: () => <HamburgerButton onPress={() => navigation.toggleDrawer()} />,
        drawerType: 'slide',
        overlayColor: 'rgba(0,0,0,0.4)',
        drawerStyle: { width: 280 },
      })}
    >
      <NurseDrawer.Screen
        name="NurseHome"
        component={NurseDashboardScreen}
        options={{ title: 'SmartCare — Nurse' }}
      />
      <NurseDrawer.Screen
        name="RegisterPatient"
        component={RegisterPatientScreen}
        options={{ title: 'Register Patient' }}
      />
      <NurseDrawer.Screen
        name="AIAssistant"
        component={AIAssistantScreen}
        options={{ headerShown: false }}
        initialParams={{ role: 'nurse' }}
      />
    </NurseDrawer.Navigator>
  );
}

function AdminDrawerNavigator() {
  return (
    <AdminDrawer.Navigator
      drawerContent={(props) => <AppDrawer {...props} />}
      screenOptions={({ navigation }) => ({
        ...headerOptions,
        headerLeft: () => <HamburgerButton onPress={() => navigation.toggleDrawer()} />,
        drawerType: 'slide',
        overlayColor: 'rgba(0,0,0,0.4)',
        drawerStyle: { width: 280 },
      })}
    >
      <AdminDrawer.Screen
        name="AdminHome"
        component={AdminDashboardScreen}
        options={{ title: 'SmartCare — Admin' }}
      />
      <AdminDrawer.Screen
        name="RegisterPatient"
        component={RegisterPatientScreen}
        options={{ title: 'Register Patient' }}
      />
      <AdminDrawer.Screen
        name="AIAssistant"
        component={AIAssistantScreen}
        options={{ headerShown: false }}
        initialParams={{ role: 'admin' }}
      />
    </AdminDrawer.Navigator>
  );
}

// ── Root App ──────────────────────────────────────────────────────────────

type InitialRoute = 'Login' | 'DoctorDrawer' | 'NurseDrawer' | 'AdminDrawer' | 'Dashboard';

export default function App() {
  const [initialRoute, setInitialRoute] = useState<InitialRoute | null>(null);
  const navRef = useRef<NavigationContainerRef<RootStackParamList>>(null);

  function routeByRole(role: string) {
    if (role === 'admin')        setInitialRoute('AdminDrawer');
    else if (role === 'doctor')  setInitialRoute('DoctorDrawer');
    else if (role === 'nurse')   setInitialRoute('NurseDrawer');
    else                         setInitialRoute('Dashboard');
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        await clearSession();
        setInitialRoute('Login');
        return;
      }
      try {
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
        await clearSession();
        setInitialRoute('Login');
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const handler = () => {
      navRef.current?.reset({ index: 0, routes: [{ name: 'Login' }] });
    };
    authEvents.on(SESSION_EXPIRED, handler);
    return () => { authEvents.off(SESSION_EXPIRED, handler); };
  }, []);

  if (!initialRoute) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navRef}>
      <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login"         component={LoginScreen} />
        <Stack.Screen name="DoctorDrawer"  component={DoctorDrawerNavigator} />
        <Stack.Screen name="NurseDrawer"   component={NurseDrawerNavigator} />
        <Stack.Screen name="AdminDrawer"   component={AdminDrawerNavigator} />
        <Stack.Screen name="Dashboard"     component={DashboardScreen}
          options={{ ...headerOptions, headerShown: true, title: 'SmartCare EMR' }} />
        <Stack.Screen name="RegisterPatient" component={RegisterPatientScreen}
          options={{ ...headerOptions, headerShown: true, title: 'Register Patient' }} />
        <Stack.Screen name="AIAssistant"   component={AIAssistantScreen} />
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
