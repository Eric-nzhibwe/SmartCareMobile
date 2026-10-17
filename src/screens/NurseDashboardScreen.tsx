import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  RefreshControl, Alert, StatusBar, ActivityIndicator,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { DrawerScreenProps } from '@react-navigation/drawer';
import { colors, radius, shadow, font } from '../theme';
import { api, clearSession } from '../api';

import { API_BASE } from '../config';

type Props = DrawerScreenProps<any, any>;

type NurseStats = {
  total_patients: number;
  registered_today: number;
  registered_week: number;
  encounters_today: number;
  encounters_month: number;
  vitals_pending: number;
  upcoming_followups: number;
  overdue_followups: number;
  allergy_count: number;
};

type QueueItem = {
  encounter_id: number;
  patient_name: string;
  patient_id: number;
  smart_id: string;
  age: number;
  gender: string;
  encounter_type: string;
  chief_complaint: string;
  clinician_name: string;
  has_vitals: boolean;
  vitals_summary: string;
  has_allergy: boolean;
  allergies: string;
};

type Followup = {
  patient_name: string;
  patient_id: number;
  smart_id: string;
  follow_up_date: string;
  encounter_type: string;
  last_diagnosis: string;
  clinician_name: string;
  days_away?: number;
  days_overdue?: number;
};

type AllergyPatient = {
  patient_id: number;
  patient_name: string;
  smart_id: string;
  allergies: string;
  blood_group: string;
};

type RecentPatient = {
  id: number;
  first_name: string;
  last_name: string;
  smart_id: string;
  date_of_birth: string;
  gender: string;
  phone: string;
  allergies: string;
  registered_at: string;
};

type DashData = {
  nurse_name: string;
  facility: string;
  stats: NurseStats;
  todays_queue: QueueItem[];
  upcoming_followups: Followup[];
  overdue_followups: Followup[];
  allergy_patients: AllergyPatient[];
  enc_types: { encounter_type: string; cnt: number }[];
  recent_patients: RecentPatient[];
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

export default function NurseDashboardScreen({ navigation }: Props) {
  const [data, setData]           = useState<DashData | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading]     = useState(true);

  const load = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const res = await api.get('/api/dashboard');
      setData(res.data);
    } catch {
      Alert.alert('Error', 'Unable to load dashboard.');
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
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  const s = data?.stats;
  const vitPct = (s?.encounters_today ?? 0) > 0
    ? Math.round(((( s!.encounters_today) - (s!.vitals_pending)) / s!.encounters_today) * 100)
    : 100;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => load(true)}
          tintColor={colors.accent} colors={[colors.accent]} />
      }
    >
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />

      {/* ── Banner ── */}
      <View style={[styles.banner, { borderLeftColor: colors.accent }]}>
        <View style={[styles.bannerIcon, { backgroundColor: colors.accentLight }]}>
          <FontAwesome5 name="user-nurse" size={20} color={colors.accent} />
        </View>
        <View style={styles.bannerBody}>
          <Text style={styles.bannerName}>{data?.nurse_name ?? 'Nurse'}</Text>
          <Text style={styles.bannerMeta}>{data?.facility ?? '—'} · Nursing Station</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <FontAwesome5 name="sign-out-alt" size={12} color={colors.text2} />
          <Text style={styles.logoutText}> Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* ── Register Patient CTA ── */}
      <TouchableOpacity
        style={styles.ctaBtn}
        onPress={() => navigation.navigate('RegisterPatient')}
        activeOpacity={0.85}
      >
        <FontAwesome5 name="user-plus" size={14} color={colors.white} />
        <Text style={styles.ctaBtnText}> Register New Patient</Text>
      </TouchableOpacity>

      {/* ── Stat Cards ── */}
      <View style={styles.statsGrid}>
        <StatCard icon="users" iconColor={colors.primary} iconBg={colors.primaryGhost}
          label="Facility Patients" value={String(s?.total_patients ?? 0)}
          sub={`+${s?.registered_week ?? 0} this week · ${s?.registered_today ?? 0} today`}
          accent={colors.primary} />
        <StatCard icon="stethoscope" iconColor={colors.accent} iconBg={colors.accentLight}
          label="Encounters Today" value={String(s?.encounters_today ?? 0)}
          sub={`${s?.encounters_month ?? 0} this month`} accent={colors.accent} />
      </View>
      <View style={styles.statsGrid}>
        <StatCard icon="heartbeat" iconColor={colors.warn} iconBg={colors.warnLight}
          label="Vitals Pending" value={String(s?.vitals_pending ?? 0)}
          sub={`${vitPct}% triaged`} accent={colors.warn} />
        <StatCard icon="exclamation-triangle" iconColor={colors.danger} iconBg={colors.dangerLight}
          label="Allergy Alerts" value={String(s?.allergy_count ?? 0)}
          sub="Known allergies on file" accent={colors.danger} />
      </View>

      {/* ── Today's Triage Queue ── */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <FontAwesome5 name="clipboard-list" size={13} color={colors.primary} />
          <Text style={styles.cardTitle}> Today's Triage Queue</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{s?.encounters_today ?? 0} total</Text>
          </View>
          {(s?.vitals_pending ?? 0) > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.warnLight, marginLeft: 4 }]}>
              <Text style={[styles.badgeText, { color: colors.warn }]}>
                {s!.vitals_pending} pending
              </Text>
            </View>
          )}
        </View>
        {(data?.todays_queue?.length ?? 0) === 0 ? (
          <EmptyState icon="circle-check" iconColor={colors.accent} label="No encounters recorded today yet" />
        ) : (
          data!.todays_queue.map((e, i) => (
            <View key={e.encounter_id} style={[styles.queueRow, i > 0 && styles.listRowBorder]}>
              <View style={[styles.avatar, {
                backgroundColor: e.has_allergy ? '#fecaca' : colors.primaryGhost,
              }]}>
                <Text style={[styles.avatarText, {
                  color: e.has_allergy ? colors.danger : colors.primary,
                }]}>
                  {getInitials(e.patient_name)}
                </Text>
              </View>
              <View style={styles.listBody}>
                <Text style={styles.listName}>{e.patient_name}</Text>
                <Text style={styles.listSub}>{e.smart_id} · {e.age}y {e.gender === 'Male' ? 'M' : 'F'}</Text>
                {e.chief_complaint ? <Text style={styles.listSub2} numberOfLines={1}>{e.chief_complaint}</Text> : null}
              </View>
              <View style={styles.rightCol}>
                <EncTypeBadge type={e.encounter_type} />
                {e.has_vitals
                  ? <View style={[styles.miniBadge, { backgroundColor: colors.accentLight }]}>
                      <Text style={[styles.miniBadgeText, { color: colors.accent }]}>✓ {e.vitals_summary}</Text>
                    </View>
                  : <View style={[styles.miniBadge, { backgroundColor: colors.warnLight }]}>
                      <Text style={[styles.miniBadgeText, { color: colors.warn }]}>Pending</Text>
                    </View>
                }
                {e.has_allergy && (
                  <View style={[styles.miniBadge, { backgroundColor: colors.dangerLight }]}>
                    <Text style={[styles.miniBadgeText, { color: colors.danger }]}>⚠ Allergy</Text>
                  </View>
                )}
              </View>
            </View>
          ))
        )}
      </View>

      {/* ── Follow-ups This Week ── */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <FontAwesome5 name="calendar-check" size={13} color={colors.accent} />
          <Text style={styles.cardTitle}> Follow-ups This Week</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{s?.upcoming_followups ?? 0}</Text>
          </View>
        </View>
        {(data?.upcoming_followups?.length ?? 0) === 0 ? (
          <EmptyState icon="calendar-check" iconColor={colors.accent} label="No follow-ups this week" />
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
                <Text style={styles.listSub}>{f.clinician_name}</Text>
              </View>
              <View style={styles.rightCol}>
                <View style={[styles.miniBadge, {
                  backgroundColor: (f.days_away ?? 0) <= 1 ? colors.warnLight : colors.primaryGhost,
                }]}>
                  <Text style={[styles.miniBadgeText, {
                    color: (f.days_away ?? 0) <= 1 ? colors.warn : colors.primary,
                  }]}>
                    {f.days_away === 0 ? 'Today' : f.days_away === 1 ? 'Tomorrow' : fmtDate(f.follow_up_date)}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}
      </View>

      {/* ── Overdue Follow-ups ── */}
      {(data?.overdue_followups?.length ?? 0) > 0 && (
        <View style={[styles.card, styles.cardDanger]}>
          <View style={styles.cardHeader}>
            <FontAwesome5 name="history" size={13} color={colors.danger} />
            <Text style={[styles.cardTitle, { color: colors.danger }]}> Overdue Follow-ups</Text>
            <View style={[styles.badge, { backgroundColor: colors.dangerLight }]}>
              <Text style={[styles.badgeText, { color: colors.danger }]}>
                {data!.overdue_followups.length} overdue
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
              </View>
              <View style={[styles.miniBadge, { backgroundColor: colors.dangerLight }]}>
                <Text style={[styles.miniBadgeText, { color: colors.danger }]}>
                  {f.days_overdue}d late
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* ── Allergy Alert Register ── */}
      {(data?.allergy_patients?.length ?? 0) > 0 && (
        <View style={[styles.card, { borderLeftWidth: 3, borderLeftColor: colors.warn }]}>
          <View style={styles.cardHeader}>
            <FontAwesome5 name="shield-virus" size={13} color={colors.warn} />
            <Text style={styles.cardTitle}> Allergy Alert Register</Text>
            <View style={[styles.badge, { backgroundColor: colors.warnLight }]}>
              <Text style={[styles.badgeText, { color: colors.warn }]}>
                {s?.allergy_count} patient{(s?.allergy_count ?? 0) !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>
          {data!.allergy_patients.map((p, i) => (
            <View key={p.patient_id} style={[styles.listRow, i > 0 && styles.listRowBorder]}>
              <View style={[styles.avatar, { backgroundColor: '#fef9c3' }]}>
                <Text style={[styles.avatarText, { color: colors.warn }]}>
                  {getInitials(p.patient_name)}
                </Text>
              </View>
              <View style={styles.listBody}>
                <Text style={styles.listName}>{p.patient_name}</Text>
                <Text style={styles.listSub}>{p.smart_id}</Text>
              </View>
              <View style={styles.rightCol}>
                <View style={[styles.miniBadge, { backgroundColor: colors.warnLight }]}>
                  <Text style={[styles.miniBadgeText, { color: colors.warn }]} numberOfLines={1}>
                    ⚠ {p.allergies}
                  </Text>
                </View>
                {p.blood_group ? (
                  <Text style={styles.listSub}>{p.blood_group}</Text>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* ── Encounter Types ── */}
      <BarChartCard
        title={`Encounter Types — ${data?.facility ?? ''}`}
        icon="chart-pie"
        iconColor={colors.primary}
        items={(data?.enc_types || []).map(e => ({ label: e.encounter_type, cnt: e.cnt }))}
        barColor={colors.accent}
      />

      {/* ── Recently Registered Patients ── */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <FontAwesome5 name="user-plus" size={13} color={colors.primary} />
          <Text style={styles.cardTitle}> Recently Registered Patients</Text>
        </View>
        {(data?.recent_patients?.length ?? 0) === 0 ? (
          <EmptyState icon="users" iconColor={colors.text3} label="No patients registered yet" />
        ) : (
          data!.recent_patients.map((p, i) => {
            const ha = p.allergies && p.allergies !== 'None' && p.allergies !== '';
            return (
              <View key={p.id} style={[styles.listRow, i > 0 && styles.listRowBorder]}>
                <View style={[styles.avatar, { backgroundColor: colors.primaryGhost }]}>
                  <Text style={[styles.avatarText, { color: colors.primary }]}>
                    {getInitials(`${p.first_name} ${p.last_name}`)}
                  </Text>
                </View>
                <View style={styles.listBody}>
                  <Text style={styles.listName}>{p.first_name} {p.last_name}</Text>
                  <Text style={styles.listSub}>{p.smart_id} · {calcAge(p.date_of_birth)}y · {p.phone || 'No phone'}</Text>
                </View>
                <View style={styles.rightCol}>
                  {ha && (
                    <View style={[styles.miniBadge, { backgroundColor: colors.warnLight }]}>
                      <Text style={[styles.miniBadgeText, { color: colors.warn }]}>⚠ Allergy</Text>
                    </View>
                  )}
                  <Text style={styles.listDate}>{fmtDate(p.registered_at)}</Text>
                </View>
              </View>
            );
          })
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

function BarChartCard({ title, icon, iconColor, items, barColor }: {
  title: string; icon: string; iconColor: string;
  items: { label: string; cnt: number }[]; barColor: string;
}) {
  const max = Math.max(...items.map(i => i.cnt), 1);
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <FontAwesome5 name={icon} size={13} color={iconColor} />
        <Text style={styles.cardTitle}> {title}</Text>
      </View>
      {items.length === 0 ? (
        <EmptyState icon="clipboard-list" iconColor={colors.text3} label="No encounters recorded yet" />
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

function EmptyState({ icon, iconColor, label }: { icon: string; iconColor: string; label: string }) {
  return (
    <View style={styles.emptyState}>
      <FontAwesome5 name={icon} size={24} color={iconColor} />
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

const encStyles = StyleSheet.create({
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  text:  { fontSize: 10, fontWeight: font.semibold },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content:   { padding: 16, paddingBottom: 40 },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
  statsGrid: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  banner: {
    backgroundColor: colors.surface, borderRadius: radius.md, padding: 14,
    flexDirection: 'row', alignItems: 'center', marginBottom: 14,
    borderWidth: 1, borderColor: colors.border, borderLeftWidth: 4, ...shadow.sm,
  },
  bannerIcon:     { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  bannerBody:     { flex: 1 },
  bannerName:     { fontSize: 15, fontWeight: font.semibold, color: colors.text, letterSpacing: -0.2 },
  bannerMeta:     { fontSize: 11, color: colors.text3, marginTop: 2 },
  logoutBtn:      {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 9, paddingVertical: 6,
    borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border2, backgroundColor: colors.surface2,
  },
  logoutText:     { fontSize: 11, color: colors.text2, fontWeight: font.medium },
  ctaBtn:         {
    backgroundColor: colors.accent, borderRadius: radius.sm, paddingVertical: 13,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginBottom: 14, ...shadow.sm,
  },
  ctaBtnText:     { color: colors.white, fontSize: 14, fontWeight: font.semibold },
  card:           {
    backgroundColor: colors.surface, borderRadius: radius.md, padding: 14,
    marginBottom: 12, borderWidth: 1, borderColor: colors.border, ...shadow.sm,
  },
  cardDanger:     { borderLeftWidth: 3, borderLeftColor: colors.danger },
  cardHeader:     { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  cardTitle:      { fontSize: 13, fontWeight: font.semibold, color: colors.text, flex: 1 },
  badge:          { backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  badgeText:      { fontSize: 10, color: colors.text2, fontWeight: font.medium },
  listRow:        { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 10 },
  queueRow:       { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10, gap: 10 },
  listRowBorder:  { borderTopWidth: 1, borderTopColor: colors.border },
  avatar:         { width: 34, height: 34, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  avatarText:     { fontSize: 11, fontWeight: font.semibold },
  listBody:       { flex: 1 },
  listName:       { fontSize: 13, fontWeight: font.semibold, color: colors.text },
  listSub:        { fontSize: 11, color: colors.text3, marginTop: 1 },
  listSub2:       { fontSize: 11, color: colors.text2, marginTop: 1 },
  listDate:       { fontSize: 10, color: colors.text3 },
  rightCol:       { alignItems: 'flex-end', gap: 3, maxWidth: 110 },
  miniBadge:      { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  miniBadgeText:  { fontSize: 10, fontWeight: font.semibold },
  emptyState:     { paddingVertical: 20, alignItems: 'center', gap: 8 },
  emptyText:      { fontSize: 12, color: colors.text3, textAlign: 'center' },
});
