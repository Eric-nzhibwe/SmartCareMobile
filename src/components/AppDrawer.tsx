/**
 * AppDrawer — shared side navigation drawer for all role dashboards.
 *
 * Renders a custom drawer content with:
 *  - User profile header (avatar initials, name, role badge, facility)
 *  - Role-specific nav items
 *  - Sign out at the bottom
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
} from 'react-native';
import {
  DrawerContentScrollView,
  DrawerContentComponentProps,
} from '@react-navigation/drawer';
import { FontAwesome5 } from '@expo/vector-icons';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { clearSession, getStoredUser } from '../api';
import { colors, radius, shadow, font } from '../theme';
import { useEffect, useState } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────

type NavItem = {
  label:   string;
  icon:    string;
  screen:  string;
  color?:  string;
};

type RoleConfig = {
  accentColor: string;
  accentBg:    string;
  roleIcon:    string;
  roleLabel:   string;
  items:       NavItem[];
};

// ── Role-specific nav items ────────────────────────────────────────────────

const ROLE_CONFIG: Record<string, RoleConfig> = {
  doctor: {
    accentColor: colors.primary,
    accentBg:    colors.primaryGhost,
    roleIcon:    'user-md',
    roleLabel:   'Doctor',
    items: [
      { label: 'Dashboard',       icon: 'th-large',       screen: 'DoctorHome' },
      { label: 'AI Assistant',    icon: 'robot',          screen: 'AIAssistant', color: colors.primary },
      { label: 'Register Patient',icon: 'user-plus',      screen: 'RegisterPatient', color: colors.accent },
    ],
  },
  nurse: {
    accentColor: colors.accent,
    accentBg:    colors.accentLight,
    roleIcon:    'user-nurse',
    roleLabel:   'Nurse',
    items: [
      { label: 'Dashboard',       icon: 'th-large',       screen: 'NurseHome' },
      { label: 'AI Assistant',    icon: 'robot',          screen: 'AIAssistant', color: colors.accent },
      { label: 'Register Patient',icon: 'user-plus',      screen: 'RegisterPatient', color: colors.accent },
    ],
  },
  admin: {
    accentColor: colors.warn,
    accentBg:    colors.warnLight,
    roleIcon:    'shield-alt',
    roleLabel:   'Administrator',
    items: [
      { label: 'Dashboard',       icon: 'th-large',       screen: 'AdminHome' },
      { label: 'AI Assistant',    icon: 'robot',          screen: 'AIAssistant', color: colors.warn },
      { label: 'Register Patient',icon: 'user-plus',      screen: 'RegisterPatient', color: colors.accent },
    ],
  },
};

// ── Helper ────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return (name || 'U').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

// ── Component ─────────────────────────────────────────────────────────────

export default function AppDrawer(props: DrawerContentComponentProps) {
  const { navigation, state } = props;
  const [user, setUser] = useState<{ username: string; role: string; facility: string } | null>(null);

  useEffect(() => {
    getStoredUser().then(u => {
      if (u) setUser(u);
    });
  }, []);

  const role       = user?.role ?? 'doctor';
  const cfg        = ROLE_CONFIG[role] ?? ROLE_CONFIG.doctor;
  const activeRoute = state.routeNames[state.index];

  const handleSignOut = async () => {
    await signOut(auth);
    await clearSession();
    navigation.reset({ index: 0, routes: [{ name: 'Login' as never }] });
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={cfg.accentColor} />

      {/* ── Profile Header ── */}
      <View style={[styles.header, { backgroundColor: cfg.accentColor }]}>
        <View style={[styles.avatar, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
          <Text style={styles.avatarText}>{getInitials(user?.username ?? '')}</Text>
        </View>
        <View style={styles.headerBody}>
          <Text style={styles.headerName}>{user?.username ?? '—'}</Text>
          <View style={styles.rolePill}>
            <FontAwesome5 name={cfg.roleIcon} size={10} color={cfg.accentColor} />
            <Text style={[styles.roleText, { color: cfg.accentColor }]}> {cfg.roleLabel}</Text>
          </View>
          <Text style={styles.facilityText}>{user?.facility ?? '—'}</Text>
        </View>
      </View>

      {/* ── Nav Items ── */}
      <ScrollView style={styles.nav} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>NAVIGATION</Text>

        {cfg.items.map((item) => {
          const isActive = activeRoute === item.screen;
          const itemColor = item.color ?? cfg.accentColor;
          return (
            <TouchableOpacity
              key={item.screen}
              style={[styles.navItem, isActive && { backgroundColor: cfg.accentBg }]}
              onPress={() => navigation.navigate(item.screen as never)}
              activeOpacity={0.75}
            >
              <View style={[styles.navIconWrap, { backgroundColor: isActive ? cfg.accentColor : '#f1f5f9' }]}>
                <FontAwesome5
                  name={item.icon}
                  size={14}
                  color={isActive ? colors.white : itemColor}
                />
              </View>
              <Text style={[styles.navLabel, isActive && { color: cfg.accentColor, fontWeight: font.semibold }]}>
                {item.label}
              </Text>
              {isActive && (
                <View style={[styles.activeBar, { backgroundColor: cfg.accentColor }]} />
              )}
            </TouchableOpacity>
          );
        })}

        <View style={styles.divider} />
        <Text style={styles.sectionLabel}>ACCOUNT</Text>

        {/* ── Sign Out ── */}
        <TouchableOpacity style={styles.navItem} onPress={handleSignOut} activeOpacity={0.75}>
          <View style={[styles.navIconWrap, { backgroundColor: colors.dangerLight }]}>
            <FontAwesome5 name="sign-out-alt" size={14} color={colors.danger} />
          </View>
          <Text style={[styles.navLabel, { color: colors.danger }]}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ── Footer ── */}
      <View style={styles.footer}>
        <FontAwesome5 name="heartbeat" size={11} color={colors.text3} />
        <Text style={styles.footerText}> SmartCare EMR · v1.0.0</Text>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface,
  },

  // Header
  header: {
    paddingTop: 52,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: font.bold,
    color: colors.white,
  },
  headerBody: { flex: 1 },
  headerName: {
    fontSize: 16,
    fontWeight: font.semibold,
    color: colors.white,
    textTransform: 'capitalize',
    letterSpacing: -0.2,
  },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
    marginTop: 4,
    marginBottom: 3,
  },
  roleText: {
    fontSize: 10,
    fontWeight: font.semibold,
  },
  facilityText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
  },

  // Nav
  nav: {
    flex: 1,
    paddingTop: 8,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: font.semibold,
    color: colors.text3,
    letterSpacing: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 6,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 8,
    marginVertical: 1,
    borderRadius: radius.md,
    gap: 12,
    position: 'relative',
  },
  navIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navLabel: {
    fontSize: 14,
    color: colors.text2,
    fontWeight: font.medium,
    flex: 1,
  },
  activeBar: {
    position: 'absolute',
    right: 0,
    top: '20%',
    bottom: '20%',
    width: 3,
    borderRadius: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 20,
    marginVertical: 8,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerText: {
    fontSize: 11,
    color: colors.text3,
  },
});
