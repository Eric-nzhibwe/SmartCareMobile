import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  RefreshControl, Alert, StatusBar,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';
import { colors, radius, shadow, font } from '../theme';

import { API_BASE } from '../config';

type Props = StackScreenProps<RootStackParamList, 'Dashboard'>;

type Patient = {
  id: number;
  first_name: string;
  last_name: string;
  smart_id: string;
  phone: string;
  gender?: string;
  date_of_birth?: string;
  allergies?: string;
};

type User = {
  username: string;
  role: string;
  facility: string;
};

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

function avatarBg(hasAllergy: boolean): string {
  return hasAllergy ? colors.dangerLight : colors.primaryGhost;
}

function avatarColor(hasAllergy: boolean): string {
  return hasAllergy ? colors.danger : colors.primary;
}

export default function DashboardScreen({ navigation }: Props) {
  const [patients, setPatients]   = useState<Patient[]>([]);
  const [user, setUser]           = useState<User | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading]     = useState(true);

  const loadData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const [tokenRaw, userRaw] = await Promise.all([
        SecureStore.getItemAsync('token'),
        SecureStore.getItemAsync('user'),
      ]);
      if (userRaw) setUser(JSON.parse(userRaw));
      const response = await axios.get(`${API_BASE}/api/patients`, {
        headers: { Authorization: `Bearer ${tokenRaw}` },
      });
      setPatients(response.data);
    } catch {
      Alert.alert('Error', 'Unable to load patients. Please check your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync('token');
    await SecureStore.deleteItemAsync('user');
    navigation.replace('Login');
  };

  const roleBannerIcon = () => {
    switch (user?.role) {
      case 'doctor': return 'user-md';
      case 'nurse':  return 'user-nurse';
      default:       return 'shield-alt';
    }
  };

  const roleBannerAccent = () => {
    switch (user?.role) {
      case 'nurse': return colors.accent;
      case 'admin': return colors.warn;
      default:      return colors.primary;
    }
  };

  const roleBannerBg = () => {
    switch (user?.role) {
      case 'nurse': return colors.accentLight;
      case 'admin': return colors.warnLight;
      default:      return colors.primaryGhost;
    }
  };

  const renderHeader = () => (
    <View>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />

      {/* ── Banner ── */}
      <View style={styles.banner}>
        <View style={[styles.bannerIcon, { backgroundColor: roleBannerBg() }]}>
          <FontAwesome5 name={roleBannerIcon()} size={20} color={roleBannerAccent()} />
        </View>
        <View style={styles.bannerBody}>
          <Text style={styles.bannerName}>{user?.username ?? 'User'}</Text>
          <Text style={styles.bannerMeta}>
            {user?.facility ?? '—'} · {user?.role ?? '—'}
          </Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <FontAwesome5 name="sign-out-alt" size={13} color={colors.text2} />
          <Text style={styles.logoutText}> Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* ── Stats row ── */}
      <View style={styles.statsRow}>
        <StatCard
          icon="users"
          iconColor={colors.primary}
          iconBg={colors.primaryGhost}
          label="Patients"
          value={String(patients.length)}
          accentColor={colors.primary}
        />
        <StatCard
          icon="hospital"
          iconColor={colors.accent}
          iconBg={colors.accentLight}
          label="Facility"
          value={user?.facility?.split(' ')[0] ?? '—'}
          accentColor={colors.accent}
        />
      </View>

      {/* ── Toolbar ── */}
      <View style={styles.toolbar}>
        <Text style={styles.sectionTitle}>
          <FontAwesome5 name="clipboard-list" size={13} color={colors.primary} /> Patient List
        </Text>
        <TouchableOpacity
          style={styles.registerBtn}
          onPress={() => navigation.navigate('RegisterPatient')}
          activeOpacity={0.85}
        >
          <FontAwesome5 name="user-plus" size={13} color={colors.white} />
          <Text style={styles.registerBtnText}> Register</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <FontAwesome5 name="user-injured" size={36} color={colors.text3} />
      <Text style={styles.emptyText}>No patients registered yet</Text>
      <TouchableOpacity
        style={styles.emptyBtn}
        onPress={() => navigation.navigate('RegisterPatient')}
        activeOpacity={0.85}
      >
        <FontAwesome5 name="user-plus" size={13} color={colors.white} />
        <Text style={styles.emptyBtnText}> Register first patient</Text>
      </TouchableOpacity>
    </View>
  );

  const renderPatient = ({ item }: { item: Patient }) => {
    const hasAllergy = !!(item.allergies && item.allergies !== 'None' && item.allergies !== '');
    const fullName   = `${item.first_name} ${item.last_name}`;

    return (
      <TouchableOpacity style={styles.card} activeOpacity={0.75}>
        {/* Avatar */}
        <View style={[styles.avatar, { backgroundColor: avatarBg(hasAllergy) }]}>
          <Text style={[styles.avatarText, { color: avatarColor(hasAllergy) }]}>
            {getInitials(fullName)}
          </Text>
        </View>

        {/* Info */}
        <View style={styles.cardBody}>
          <Text style={styles.patientName}>{fullName}</Text>
          <Text style={styles.smartId}>{item.smart_id}</Text>
          <Text style={styles.metaText}>
            {item.phone ? item.phone : 'No phone on file'}
          </Text>
        </View>

        {/* Allergy badge */}
        {hasAllergy && (
          <View style={styles.allergyBadge}>
            <FontAwesome5 name="exclamation-triangle" size={9} color="#92400e" />
            <Text style={styles.allergyText}> Allergy</Text>
          </View>
        )}

        {/* Chevron */}
        <FontAwesome5 name="chevron-right" size={12} color={colors.text3} style={styles.chevron} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={patients}
        keyExtractor={(item: Patient) => item.id.toString()}
        renderItem={renderPatient}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={loading ? null : renderEmpty}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(true)}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      />
    </View>
  );
}

/* ── StatCard sub-component ── */
type StatCardProps = {
  icon: string;
  iconColor: string;
  iconBg: string;
  label: string;
  value: string;
  accentColor: string;
};

function StatCard({ icon, iconColor, iconBg, label, value, accentColor }: StatCardProps) {
  return (
    <View style={[statStyles.card, { borderLeftColor: accentColor }]}>
      <View style={[statStyles.iconWrap, { backgroundColor: iconBg }]}>
        <FontAwesome5 name={icon} size={16} color={iconColor} />
      </View>
      <View>
        <Text style={statStyles.label}>{label}</Text>
        <Text style={statStyles.value}>{value}</Text>
      </View>
    </View>
  );
}

const statStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 14,
    borderLeftWidth: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...shadow.sm,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 10,
    color: colors.text3,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: font.semibold,
  },
  value: {
    fontSize: 22,
    fontWeight: font.bold,
    color: colors.text,
    letterSpacing: -0.5,
    marginTop: 1,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },

  // Banner
  banner: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.sm,
  },
  bannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  bannerBody: { flex: 1 },
  bannerName: {
    fontSize: 15,
    fontWeight: font.semibold,
    color: colors.text,
    letterSpacing: -0.2,
    textTransform: 'capitalize',
  },
  bannerMeta: {
    fontSize: 11,
    color: colors.text3,
    marginTop: 2,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border2,
    backgroundColor: colors.surface2,
  },
  logoutText: {
    fontSize: 12,
    color: colors.text2,
    fontWeight: font.medium,
  },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },

  // Toolbar
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: font.semibold,
    color: colors.text,
  },
  registerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.sm,
  },
  registerBtnText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: font.medium,
  },

  // Patient card
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 13,
    fontWeight: font.semibold,
  },
  cardBody: { flex: 1 },
  patientName: {
    fontSize: 14,
    fontWeight: font.semibold,
    color: colors.text,
  },
  smartId: {
    fontSize: 11,
    color: colors.primary,
    backgroundColor: colors.primaryGhost,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 2,
    marginBottom: 2,
    fontWeight: font.medium,
  },
  metaText: {
    fontSize: 12,
    color: colors.text3,
  },
  allergyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warnLight,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radius.full,
    marginRight: 8,
  },
  allergyText: {
    fontSize: 10,
    fontWeight: font.semibold,
    color: '#92400e',
  },
  chevron: { marginLeft: 2 },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 14,
    color: colors.text3,
    marginTop: 12,
    marginBottom: 20,
    textAlign: 'center',
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: radius.sm,
  },
  emptyBtnText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: font.medium,
  },
});
