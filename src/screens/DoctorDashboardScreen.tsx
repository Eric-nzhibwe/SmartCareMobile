import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  RefreshControl, Alert, StatusBar, ActivityIndicator,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';
import { colors, radius, shadow, font } from '../theme';

import { API_BASE } from '../config';

type Props = StackScreenProps<RootStackParamList, 'DoctorDashboard'>;

type DoctorStats = {
  total_my_patients: number;
  total_my_encounters: number;
  today_my_encounters: number;
  monthly_my_encounters: number;
  upcoming_followups: number;
  overdue_followups: number;
};

type Followup = {
  patient_name: string;
  patient_id: number;
  smart_id: string;
  follow_up_date: string;
  last_diagnosis: string;
  days_away?: number;
  days_overdue?: number;
};

type RecentEncounter = {
  patient_name: string;
  patient: number;
  encounter_type: string;
  diagnosis: string;
  chief_complaint: string;
  visit_date: string;
};

type RecentPatient = {
  id: number;
  first_name: string;
  last_name: string;
  smart_id: string;
  date_of_birth: string;
  gender: string;
  registered_at: string;
};

type DashData = {
  clinician_name: string;
  facility: string;
  stats: DoctorStats;
  upcoming_followups: Followup[];
  overdue_followups: Followup[];
  recent_encounters: RecentEncounter[];
  recent_patients: RecentPatient[];
  top_diagnoses: { diagnosis: string; cnt: number }[];
  enc_types: { encounter_type: string; cnt: number }[];
  monthly_trend: { month: string; cnt: number }[];
};

function fmtDate(d: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function getInitials(name: string) {
  return (name || '').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

function calcAge(dob: string) {
  if (!dob) return '?';
  return String(Math.floor((Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365)));
}

export default function DoctorDashboardScreen({ navigation }: Props) {
  const [data, setData]         = useState<DashData | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading]   = useState(true);

  const load = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const tokenRaw = await SecureStore.getItemAsync('token');
      const res = await axios.get(`${API_BASE}/api/dashboard`, {
        headers: { Authorization: `Bearer ${tokenRaw}` },
      });
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
    await SecureStore.deleteItemAsync('token');
    await SecureStore.deleteItemAsync('user');
    navigation.replace('Login');
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const s = data?.stats;
  const hasOverdue = (data?.overdue_followups?.length ?? 0) > 0;

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
      <View style={[styles.banner, { borderLeftColor: colors.primary }]}>
        <View style={[styles.bannerIcon, { backgroundColor: colors.primaryGhost }]}>
          <FontAwesome5 name="user-md" size={20} color={colors.primary} />
        </View>
        <View style={styles.bannerBody}>
          <Text style={styles.bannerName}>{data?.clinician_name ?? 'Doctor'}</Text>
          <Text style={styles.bannerMeta}>
            {data?.facility ?? '—'} · Clinical Workstation
          </Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <FontAwesome5 name="sign-out-alt" size={12} color={colors.text2} />
          <Text style={styles.logoutText}> Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* ── AI Assistant CTA ── */}
      <TouchableOpacity
        style={styles.aiBtn}
        onPress={() => navigation.navigate('AIAssistant', { role: 'doctor' })}
        activeOpacity={0.85}
      >
        <View style={styles.aiBtnLeft}>
          <View style={styles.aiBtnIcon}>
            <FontAwesome5 name="robot" size={15} color={colors.white} />
          </View>
          <View>
            <Text style={styles.aiBtnTitle}>Clinical AI Assistant</Text>
            <Text style={styles.aiBtnSub}>Differential diagnoses · Decision support</Text>
          </View>
        </View>
        <FontAwesome5 name="chevron-right" size={12} color="rgba(255,255,255,0.7)" />
      </TouchableOpacity>

      {/* ── Stat Cards ── */}
      <View style={styles.statsGrid}>
        <StatCard icon="users" iconColor={colors.primary} iconBg={colors.primaryGhost}
          label="My Patients" value={String(s?.total_my_patients ?? 0)}
          sub="Unique patients seen" accent={colors.primary} />
        <StatCard icon="stethoscope" iconColor={colors.accent} iconBg={colors.accentLight}
          label="My Encounters" value={String(s?.total_my_encounters ?? 0)}
          sub={`${s?.today_my_encounters ?? 0} today`} accent={colors.accent} />
      </View>
      <View style={styles.statsGrid}>
        <StatCard icon="calendar-check" iconColor={colors.warn} iconBg={colors.warnLight}
          label="Upcoming Follow-ups" value={String(s?.upcoming_followups ?? 0)}
          sub="Next 14 days" accent={colors.warn} />
        <StatCard icon="exclamation-circle" iconColor={colors.danger} iconBg={colors.dangerLight}
          label="Overdue Follow-ups" value={String(s?.overdue_followups ?? 0)}
          sub={hasOverdue ? 'Needs attention' : 'All on schedule'} accent={colors.danger} />
      </View>

      {/* ── Overdue Alert ── */}
      {hasOverdue && (
        <View style={[styles.card, styles.cardDanger]}>
          <View style={styles.cardHeader}>
            <FontAwesome5 name="exclamation-triangle" size={13} color={colors.danger} />
            <Text style={[styles.cardTitle, { color: colors.danger }]}>
              {' '}Overdue Follow-ups — Action Required
            </Text>
            <View style={[styles.badge, { backgroundColor: colors.dangerLight }]}>
              <Text style={[styles.badgeText, { color: colors.danger }]}>
                {data!.overdue_followups.length} patient{data!.overdue_followups.length !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>
          {data!.overdue_followups.map((f, i) => (
            <View key={i} style={[styles.listRow, i > 0 && styles.listRowBorder]}>
              <View style={[styles.avatar, { backgroundColor: '#fecaca' }]}>
                <Text style={[styles.avatarText, { color: colors.danger }]}>
                  {getInitials(f.patient_name)}
                </Text>
              </View>
              <View style={styles.listBody}>
                <Text style={styles.listName}>{f.patient_name}</Text>
                <Text style={styles.listSub}>{f.smart_id}</Text>
                {f.last_diagnosis ? <Text style={styles.listSub2}>{f.last_diagnosis}</Text> : null}
              </View>
              <View style={[styles.badge, { backgroundColor: colors.dangerLight }]}>
                <Text style={[styles.badgeText, { color: colors.danger }]}>
                  {f.days_overdue}d overdue
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* ── Upcoming Follow-ups ── */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <FontAwesome5 name="calendar-check" size={13} color={colors.accent} />
          <Text style={styles.cardTitle}> Upcoming Follow-ups</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{s?.upcoming_followups ?? 0} in 14 days</Text>
          </View>
        </View>
        {(data?.upcoming_followups?.length ?? 0) === 0 ? (
          <EmptyState label="No upcoming follow-ups in the next 14 days" />
        ) : (
          data!.upcoming_followups.map((f, i) => (
            <View key={i} style={[styles.listRow, i > 0 && styles.listRowBorder]}>
              <View style={[styles.avatar, { backgroundColor: colors.accentLight }]}>
                <Text style={[styles.avatarText, { color: colors.accent }]}>
                  {getInitials(f.patient_name)}
                </Text>
              </View>
              <View style={styles.listBody}>
                <Text style={styles.listName}>{f.patient_name}</Text>
                <Text style={styles.listSub}>{f.smart_id}</Text>
              </View>
              <View style={styles.rightCol}>
                <View style={[styles.badge, {
                  backgroundColor: f.days_away! <= 1 ? colors.warnLight : colors.primaryGhost,
                }]}>
                  <Text style={[styles.badgeText, {
                    color: f.days_away! <= 1 ? colors.warn : colors.primary,
                  }]}>
                    {f.days_away === 0 ? 'Today' : f.days_away === 1 ? 'Tomorrow' : `In ${f.days_away}d`}
                  </Text>
                </View>
                <Text style={styles.listDate}>{fmtDate(f.follow_up_date)}</Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* ── Monthly Trend ── */}
      {(data?.monthly_trend?.length ?? 0) > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <FontAwesome5 name="chart-line" size={13} color={colors.primary} />
            <Text style={styles.cardTitle}> My 6-Month Workload</Text>
          </View>
          <TrendChart data={data!.monthly_trend} />
        </View>
      )}

      {/* ── Top Diagnoses ── */}
      <BarChartCard
        title="My Top Diagnoses"
        icon="disease"
        iconColor={colors.warn}
        items={(data?.top_diagnoses || []).map(d => ({ label: d.diagnosis, cnt: d.cnt }))}
        barColor={colors.warn}
        emptyLabel="No diagnoses recorded yet"
      />

      {/* ── Encounter Types ── */}
      <BarChartCard
        title="My Encounter Breakdown"
        icon="clipboard-list"
        iconColor={colors.primary}
        items={(data?.enc_types || []).map(e => ({ label: e.encounter_type, cnt: e.cnt }))}
        barColor={colors.primary}
        emptyLabel="No encounters yet"
      />

      {/* ── Recent Encounters ── */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <FontAwesome5 name="history" size={13} color={colors.accent} />
          <Text style={styles.cardTitle}> My Recent Encounters</Text>
        </View>
        {(data?.recent_encounters?.length ?? 0) === 0 ? (
          <EmptyState label="No encounters recorded yet" />
        ) : (
          data!.recent_encounters.map((e, i) => (
            <View key={i} style={[styles.listRow, i > 0 && styles.listRowBorder]}>
              <View style={[styles.avatar, { backgroundColor: colors.primaryGhost }]}>
                <Text style={[styles.avatarText, { color: colors.primary }]}>
                  {getInitials(e.patient_name)}
                </Text>
              </View>
              <View style={styles.listBody}>
                <Text style={styles.listName}>{e.patient_name}</Text>
                <Text style={styles.listSub2} numberOfLines={1}>
                  {e.diagnosis || e.chief_complaint || '—'}
                </Text>
              </View>
              <View style={styles.rightCol}>
                <EncTypeBadge type={e.encounter_type} />
                <Text style={styles.listDate}>{fmtDate(e.visit_date)}</Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* ── Recent Patients at Facility ── */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <FontAwesome5 name="user-plus" size={13} color={colors.primary} />
          <Text style={styles.cardTitle}> Recent Patients at {data?.facility}</Text>
        </View>
        {(data?.recent_patients?.length ?? 0) === 0 ? (
          <EmptyState label="No recent registrations" />
        ) : (
          data!.recent_patients.map((p, i) => (
            <View key={p.id} style={[styles.listRow, i > 0 && styles.listRowBorder]}>
              <View style={[styles.avatar, { backgroundColor: colors.primaryGhost }]}>
                <Text style={[styles.avatarText, { color: colors.primary }]}>
                  {getInitials(`${p.first_name} ${p.last_name}`)}
                </Text>
              </View>
              <View style={styles.listBody}>
                <Text style={styles.listName}>{p.first_name} {p.last_name}</Text>
                <Text style={styles.listSub}>{p.smart_id}</Text>
              </View>
              <View style={styles.rightCol}>
                <Text style={styles.listSub}>{calcAge(p.date_of_birth)}y · {p.gender === 'Male' ? 'M' : 'F'}</Text>
                <Text style={styles.listDate}>{fmtDate(p.registered_at)}</Text>
              </View>
            </View>
          ))
        )}
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

function TrendChart({ data }: { data: { month: string; cnt: number }[] }) {
  const max = Math.max(...data.map(d => d.cnt), 1);
  return (
    <View>
      <View style={trendStyles.bars}>
        {data.map((m, i) => (
          <View key={i} style={trendStyles.barWrap}>
            <View style={[trendStyles.bar, { height: Math.max(6, Math.round((m.cnt / max) * 60)) }]} />
          </View>
        ))}
      </View>
      <View style={trendStyles.labels}>
        {data.map((m, i) => (
          <View key={i} style={trendStyles.labelWrap}>
            <Text style={trendStyles.labelMonth}>{m.month.slice(5)}</Text>
            <Text style={trendStyles.labelVal}>{m.cnt}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function BarChartCard({ title, icon, iconColor, items, barColor, emptyLabel }: {
  title: string; icon: string; iconColor: string;
  items: { label: string; cnt: number }[]; barColor: string; emptyLabel?: string;
}) {
  const max = Math.max(...items.map(i => i.cnt), 1);
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <FontAwesome5 name={icon} size={13} color={iconColor} />
        <Text style={styles.cardTitle}> {title}</Text>
      </View>
      {items.length === 0 ? (
        <EmptyState label={emptyLabel || 'No data yet'} />
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
    flex: 1, backgroundColor: colors.surface, borderRadius: radius.md,
    padding: 14, borderLeftWidth: 3, flexDirection: 'row', alignItems: 'center', gap: 10, ...shadow.sm,
  },
  iconWrap: { width: 38, height: 38, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 10, color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: font.semibold },
  value: { fontSize: 22, fontWeight: font.bold, letterSpacing: -0.5, marginTop: 1 },
  sub:   { fontSize: 10, color: colors.text3, marginTop: 1 },
});

const barStyles = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 6 },
  label: { width: 90, fontSize: 11, color: colors.text2, fontWeight: font.medium },
  track: { flex: 1, height: 7, backgroundColor: '#f1f5f9', borderRadius: 4, overflow: 'hidden' },
  fill:  { height: '100%', borderRadius: 4 },
  val:   { width: 28, fontSize: 11, color: colors.text2, textAlign: 'right', fontWeight: font.semibold },
});

const trendStyles = StyleSheet.create({
  bars:      { flexDirection: 'row', alignItems: 'flex-end', height: 68, gap: 4, paddingHorizontal: 4 },
  barWrap:   { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar:       { width: '80%', backgroundColor: colors.primary, borderRadius: 3, opacity: 0.8 },
  labels:    { flexDirection: 'row', marginTop: 6 },
  labelWrap: { flex: 1, alignItems: 'center' },
  labelMonth:{ fontSize: 9, color: colors.text3 },
  labelVal:  { fontSize: 9, color: colors.text3 },
});

const encStyles = StyleSheet.create({
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginBottom: 2 },
  text:  { fontSize: 10, fontWeight: font.semibold },
});

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: colors.bg },
  content:     { padding: 16, paddingBottom: 40 },
  center:      { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  statsGrid:   { flexDirection: 'row', gap: 10, marginBottom: 10 },
  banner: {
    backgroundColor: colors.surface, borderRadius: radius.md, padding: 14,
    flexDirection: 'row', alignItems: 'center', marginBottom: 14,
    borderWidth: 1, borderColor: colors.border, borderLeftWidth: 4, ...shadow.sm,
  },
  bannerIcon:  { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  bannerBody:  { flex: 1 },
  bannerName:  { fontSize: 15, fontWeight: font.semibold, color: colors.text, letterSpacing: -0.2 },
  bannerMeta:  { fontSize: 11, color: colors.text3, marginTop: 2 },
  logoutBtn:   {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 9, paddingVertical: 6,
    borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border2, backgroundColor: colors.surface2,
  },
  logoutText:  { fontSize: 11, color: colors.text2, fontWeight: font.medium },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.md, padding: 14,
    marginBottom: 12, borderWidth: 1, borderColor: colors.border, ...shadow.sm,
  },
  cardDanger:  { borderLeftWidth: 3, borderLeftColor: colors.danger },
  cardHeader:  { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  cardTitle:   { fontSize: 13, fontWeight: font.semibold, color: colors.text, flex: 1 },
  badge:       { backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  badgeText:   { fontSize: 10, color: colors.text2, fontWeight: font.medium },
  listRow:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 10 },
  listRowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  avatar:      { width: 34, height: 34, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  avatarText:  { fontSize: 11, fontWeight: font.semibold },
  listBody:    { flex: 1 },
  listName:    { fontSize: 13, fontWeight: font.semibold, color: colors.text },
  listSub:     { fontSize: 11, color: colors.text3, marginTop: 1 },
  listSub2:    { fontSize: 11, color: colors.text2, marginTop: 1 },
  listDate:    { fontSize: 10, color: colors.text3 },
  rightCol:    { alignItems: 'flex-end', gap: 2 },
  emptyState:  { paddingVertical: 16, alignItems: 'center' },
  emptyText:   { fontSize: 12, color: colors.text3 },
  aiBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.primary, borderRadius: radius.md,
    padding: 14, marginBottom: 14, ...shadow.md,
  },
  aiBtnLeft:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  aiBtnIcon:   { width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  aiBtnTitle:  { fontSize: 14, fontWeight: font.semibold, color: colors.white },
  aiBtnSub:    { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 1 },
});
