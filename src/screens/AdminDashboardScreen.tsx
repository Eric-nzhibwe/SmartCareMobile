import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  RefreshControl, Alert, StatusBar, ActivityIndicator,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { DrawerScreenProps } from '@react-navigation/drawer';
import { colors, radius, shadow, font } from '../theme';
import { api, clearSession } from '../api';

import { API_BASE } from '../config';

type Props = DrawerScreenProps<any, any>;

type AdminStats = {
  total_patients: number;
  total_encounters: number;
  today_encounters: number;
  monthly_encounters: number;
  total_users: number;
  new_this_week: number;
};

type BarItem = { label: string; cnt: number; color?: string };

type RecentPatient = {
  id: number;
  first_name: string;
  last_name: string;
  smart_id: string;
  facility: string;
  registered_at: string;
};

type RecentEncounter = {
  patient_name: string;
  encounter_type: string;
  facility: string;
  visit_date: string;
};

type DashData = {
  stats: AdminStats;
  gender_dist: { gender: string; cnt: number }[];
  facility_patients: { facility: string; cnt: number }[];
  facility_encounters: { facility: string; cnt: number }[];
  enc_types: { encounter_type: string; cnt: number }[];
  top_diagnoses: { diagnosis: string; cnt: number }[];
  recent_patients: RecentPatient[];
  recent_encounters: RecentEncounter[];
  data_quality: { no_phone: number; no_nrc: number; no_vitals: number };
};

function fmtDate(d: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getInitials(name: string) {
  return (name || '').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

export default function AdminDashboardScreen({ navigation }: Props) {
  const [data, setData]         = useState<DashData | null>(null);
  const [username, setUsername] = useState('Admin');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading]   = useState(true);

  const load = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const userRaw = await SecureStore.getItemAsync('user');
      if (userRaw) {
        const u = JSON.parse(userRaw);
        setUsername(u.username || 'Admin');
      }
      const res = await api.get('/api/dashboard');
      setData(res.data);
    } catch {
      Alert.alert('Error', 'Unable to load dashboard. Please check your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleLogout = async () => {
    await clearSession();
    navigation.getParent()?.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const s = data?.stats;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => load(true)}
          tintColor={colors.primary} colors={[colors.primary]} />
      }
    >
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />

      {/* ── Banner ── */}
      <View style={[styles.banner, { borderLeftColor: colors.warn }]}>
        <View style={[styles.bannerIcon, { backgroundColor: colors.warnLight }]}>
          <FontAwesome5 name="shield-alt" size={20} color={colors.warn} />
        </View>
        <View style={styles.bannerBody}>
          <Text style={styles.bannerName}>System Administration</Text>
          <Text style={styles.bannerMeta}>
            Ministry of Health · {username} · Full Access
          </Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <FontAwesome5 name="sign-out-alt" size={12} color={colors.text2} />
          <Text style={styles.logoutText}> Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* ── Stat Cards ── */}
      <View style={styles.statsGrid}>
        <StatCard icon="users" iconColor={colors.primary} iconBg={colors.primaryGhost}
          label="Total Patients" value={String(s?.total_patients ?? 0)}
          sub={`+${s?.new_this_week ?? 0} this week`} accent={colors.primary} />
        <StatCard icon="stethoscope" iconColor={colors.accent} iconBg={colors.accentLight}
          label="Total Encounters" value={String(s?.total_encounters ?? 0)}
          sub="All clinical visits" accent={colors.accent} />
      </View>
      <View style={styles.statsGrid}>
        <StatCard icon="calendar-alt" iconColor={colors.warn} iconBg={colors.warnLight}
          label="This Month" value={String(s?.monthly_encounters ?? 0)}
          sub="Encounters recorded" accent={colors.warn} />
        <StatCard icon="clock" iconColor={colors.danger} iconBg={colors.dangerLight}
          label="Today" value={String(s?.today_encounters ?? 0)}
          sub={`${s?.total_users ?? 0} system users`} accent={colors.danger} />
      </View>

      {/* ── Facility Patients ── */}
      <BarChartCard
        title="Patients by Facility"
        icon="hospital"
        iconColor={colors.primary}
        items={(data?.facility_patients || []).map(f => ({ label: f.facility || 'Unknown', cnt: f.cnt }))}
        barColor={colors.primary}
      />

      {/* ── Facility Encounters ── */}
      <BarChartCard
        title="Encounters by Facility"
        icon="chart-bar"
        iconColor={colors.accent}
        items={(data?.facility_encounters || []).map(f => ({ label: f.facility || 'Unknown', cnt: f.cnt }))}
        barColor={colors.accent}
      />

      {/* ── Encounter Types ── */}
      <BarChartCard
        title="Encounter Types — System-wide"
        icon="clipboard-list"
        iconColor={colors.primary}
        items={(data?.enc_types || []).map(e => ({ label: e.encounter_type, cnt: e.cnt }))}
        barColor={colors.primary}
      />

      {/* ── Top Diagnoses ── */}
      <BarChartCard
        title="Top Diagnoses"
        icon="disease"
        iconColor={colors.warn}
        items={(data?.top_diagnoses || []).map(d => ({ label: d.diagnosis, cnt: d.cnt }))}
        barColor={colors.warn}
      />

      {/* ── Gender Distribution ── */}
      <BarChartCard
        title="Gender Distribution"
        icon="venus-mars"
        iconColor={colors.accent}
        items={(data?.gender_dist || []).map(g => ({ label: g.gender || 'Unknown', cnt: g.cnt }))}
        barColor={colors.accent}
      />

      {/* ── Recent Patients ── */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <FontAwesome5 name="user-plus" size={13} color={colors.primary} />
          <Text style={styles.cardTitle}> Recent Registrations</Text>
        </View>
        {(data?.recent_patients || []).length === 0 ? (
          <EmptyState label="No recent patients" />
        ) : (
          (data?.recent_patients || []).map((p, i) => (
            <View key={p.id} style={[styles.listRow, i > 0 && styles.listRowBorder]}>
              <View style={[styles.avatar, { backgroundColor: colors.primaryGhost }]}>
                <Text style={[styles.avatarText, { color: colors.primary }]}>
                  {getInitials(`${p.first_name} ${p.last_name}`)}
                </Text>
              </View>
              <View style={styles.listBody}>
                <Text style={styles.listName}>{p.first_name} {p.last_name}</Text>
                <Text style={styles.listSub}>{p.smart_id} · {p.facility || '—'}</Text>
              </View>
              <Text style={styles.listDate}>{fmtDate(p.registered_at)}</Text>
            </View>
          ))
        )}
      </View>

      {/* ── Recent Encounters ── */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <FontAwesome5 name="history" size={13} color={colors.accent} />
          <Text style={styles.cardTitle}> Recent Encounters</Text>
        </View>
        {(data?.recent_encounters || []).length === 0 ? (
          <EmptyState label="No recent encounters" />
        ) : (
          (data?.recent_encounters || []).map((e, i) => (
            <View key={i} style={[styles.listRow, i > 0 && styles.listRowBorder]}>
              <View style={[styles.avatar, { backgroundColor: colors.accentLight }]}>
                <Text style={[styles.avatarText, { color: colors.accent }]}>
                  {getInitials(e.patient_name)}
                </Text>
              </View>
              <View style={styles.listBody}>
                <Text style={styles.listName}>{e.patient_name}</Text>
                <Text style={styles.listSub}>{e.facility || '—'}</Text>
              </View>
              <View style={styles.rightCol}>
                <EncTypeBadge type={e.encounter_type} />
                <Text style={styles.listDate}>{fmtDate(e.visit_date)}</Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* ── Data Quality ── */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <FontAwesome5 name="exclamation-circle" size={13} color={colors.warn} />
          <Text style={styles.cardTitle}> Data Quality Indicators</Text>
          <View style={styles.badge}><Text style={styles.badgeText}>System-wide</Text></View>
        </View>
        <DQRow
          icon="phone-slash"
          iconColor={colors.danger}
          title="Missing phone numbers"
          desc="Patients with no contact number"
          count={data?.data_quality?.no_phone ?? 0}
          countColor={colors.danger}
        />
        <DQRow
          icon="heartbeat"
          iconColor={colors.warn}
          title="Encounters with no vitals"
          desc="Nursing triage vitals not entered"
          count={data?.data_quality?.no_vitals ?? 0}
          countColor={colors.warn}
        />
        <DQRow
          icon="id-card"
          iconColor={colors.primary}
          title="Patients missing NRC"
          desc="Incomplete demographic records"
          count={data?.data_quality?.no_nrc ?? 0}
          countColor={colors.primary}
          last
        />
      </View>
    </ScrollView>
  );
}

/* ── Sub-components ── */

function StatCard({ icon, iconColor, iconBg, label, value, sub, accent }: {
  icon: string; iconColor: string; iconBg: string;
  label: string; value: string; sub: string; accent: string;
}) {
  return (
    <View style={[statStyles.card, { borderLeftColor: accent }]}>
      <View style={[statStyles.iconWrap, { backgroundColor: iconBg }]}>
        <FontAwesome5 name={icon} size={16} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={statStyles.label}>{label}</Text>
        <Text style={[statStyles.value, { color: accent }]}>{value}</Text>
        <Text style={statStyles.sub}>{sub}</Text>
      </View>
    </View>
  );
}

function BarChartCard({ title, icon, iconColor, items, barColor }: {
  title: string; icon: string; iconColor: string;
  items: BarItem[]; barColor: string;
}) {
  const max = Math.max(...items.map(i => i.cnt), 1);
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <FontAwesome5 name={icon} size={13} color={iconColor} />
        <Text style={styles.cardTitle}> {title}</Text>
      </View>
      {items.length === 0 ? (
        <EmptyState label="No data yet" />
      ) : (
        items.map((item, i) => (
          <View key={i} style={barStyles.row}>
            <Text style={barStyles.label} numberOfLines={1}>{item.label}</Text>
            <View style={barStyles.track}>
              <View style={[barStyles.fill, {
                width: `${Math.max(4, Math.round((item.cnt / max) * 100))}%`,
                backgroundColor: barColor,
              }]} />
            </View>
            <Text style={barStyles.val}>{item.cnt}</Text>
          </View>
        ))
      )}
    </View>
  );
}

function DQRow({ icon, iconColor, title, desc, count, countColor, last }: {
  icon: string; iconColor: string; title: string; desc: string;
  count: number; countColor: string; last?: boolean;
}) {
  return (
    <View style={[dqStyles.row, last && { borderBottomWidth: 0 }]}>
      <View style={[dqStyles.icon, { backgroundColor: `${iconColor}18` }]}>
        <FontAwesome5 name={icon} size={14} color={iconColor} />
      </View>
      <View style={dqStyles.body}>
        <Text style={dqStyles.title}>{title}</Text>
        <Text style={dqStyles.desc}>{desc}</Text>
      </View>
      <Text style={[dqStyles.count, { color: countColor }]}>{count}</Text>
    </View>
  );
}

function EncTypeBadge({ type }: { type: string }) {
  const colorMap: Record<string, { bg: string; text: string }> = {
    OPD:       { bg: colors.primaryGhost, text: colors.primary },
    Inpatient: { bg: colors.accentLight,  text: colors.accent },
    Emergency: { bg: colors.dangerLight,  text: colors.danger },
    ANC:       { bg: colors.warnLight,    text: colors.warn },
  };
  const c = colorMap[type] || { bg: '#f1f5f9', text: colors.text2 };
  return (
    <View style={[encStyles.badge, { backgroundColor: c.bg }]}>
      <Text style={[encStyles.text, { color: c.text }]}>{type}</Text>
    </View>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyText}>{label}</Text>
    </View>
  );
}

/* ── Styles ── */

const statStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 14,
    borderLeftWidth: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    ...shadow.sm,
  },
  iconWrap: {
    width: 38, height: 38, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  label: { fontSize: 10, color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: font.semibold },
  value: { fontSize: 22, fontWeight: font.bold, letterSpacing: -0.5, marginTop: 1 },
  sub:   { fontSize: 10, color: colors.text3, marginTop: 1 },
});

const barStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 6 },
  label: { width: 90, fontSize: 11, color: colors.text2, fontWeight: font.medium },
  track: { flex: 1, height: 7, backgroundColor: '#f1f5f9', borderRadius: 4, overflow: 'hidden' },
  fill:  { height: '100%', borderRadius: 4 },
  val:   { width: 28, fontSize: 11, color: colors.text2, textAlign: 'right', fontWeight: font.semibold },
});

const dqStyles = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 10 },
  icon:  { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  body:  { flex: 1 },
  title: { fontSize: 12, fontWeight: font.semibold, color: colors.text },
  desc:  { fontSize: 11, color: colors.text3, marginTop: 1 },
  count: { fontSize: 20, fontWeight: font.bold },
});

const encStyles = StyleSheet.create({
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginBottom: 2 },
  text:  { fontSize: 10, fontWeight: font.semibold },
});

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: colors.bg },
  content:    { padding: 16, paddingBottom: 40 },
  center:     { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  statsGrid:  { flexDirection: 'row', gap: 10, marginBottom: 10 },

  // Banner
  banner: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    ...shadow.sm,
  },
  bannerIcon: {
    width: 44, height: 44, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  bannerBody:  { flex: 1 },
  bannerName:  { fontSize: 15, fontWeight: font.semibold, color: colors.text, letterSpacing: -0.2 },
  bannerMeta:  { fontSize: 11, color: colors.text3, marginTop: 2 },
  logoutBtn:   {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 9, paddingVertical: 6,
    borderRadius: radius.sm, borderWidth: 1,
    borderColor: colors.border2, backgroundColor: colors.surface2,
  },
  logoutText:  { fontSize: 11, color: colors.text2, fontWeight: font.medium },

  // Card
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.sm,
  },
  cardHeader:  { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  cardTitle:   { fontSize: 13, fontWeight: font.semibold, color: colors.text, flex: 1 },
  badge:       { backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  badgeText:   { fontSize: 10, color: colors.text2, fontWeight: font.medium },

  // List rows
  listRow:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 10 },
  listRowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  avatar:      { width: 34, height: 34, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  avatarText:  { fontSize: 11, fontWeight: font.semibold },
  listBody:    { flex: 1 },
  listName:    { fontSize: 13, fontWeight: font.semibold, color: colors.text },
  listSub:     { fontSize: 11, color: colors.text3, marginTop: 1 },
  listDate:    { fontSize: 11, color: colors.text3 },
  rightCol:    { alignItems: 'flex-end', gap: 2 },

  // Empty
  emptyState:  { paddingVertical: 16, alignItems: 'center' },
  emptyText:   { fontSize: 12, color: colors.text3 },
});
