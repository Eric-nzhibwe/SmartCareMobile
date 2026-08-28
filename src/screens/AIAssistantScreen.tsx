import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator, StatusBar,
  Animated, Easing,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';
import { colors, radius, shadow, font } from '../theme';
import { API_BASE } from '../config';

type Props = StackScreenProps<RootStackParamList, 'AIAssistant'>;

type MessageRole = 'user' | 'assistant' | 'system';

interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  isLoading?: boolean;
}

interface InsightCard {
  title: string;
  content: string;
  type: 'clinical' | 'triage' | 'admin';
  loading: boolean;
  error?: string;
}

const ROLE_CONFIG = {
  doctor: {
    title:      'Clinical AI Assistant',
    subtitle:   'Decision support & differential diagnoses',
    icon:       'user-md',
    color:      colors.primary,
    colorLight: colors.primaryGhost,
    insightLabel: 'Clinical Insights',
    insightIcon:  'stethoscope',
    suggestions: [
      'What are the common causes of chest pain in adults?',
      'Summarise management of hypertensive urgency',
      'What investigations should I order for suspected TB?',
      'Differential diagnosis for acute abdominal pain',
    ],
  },
  nurse: {
    title:      'Triage AI Assistant',
    subtitle:   'Patient care coordination & triage support',
    icon:       'user-nurse',
    color:      colors.accent,
    colorLight: colors.accentLight,
    insightLabel: 'Triage Summary',
    insightIcon:  'clipboard-list',
    suggestions: [
      'What are normal vital sign ranges for adults?',
      'When should I escalate a patient urgently?',
      'How do I manage a patient with SpO₂ below 92%?',
      'Signs of sepsis to watch for during triage',
    ],
  },
  admin: {
    title:      'Health Analytics AI',
    subtitle:   'Operational insights & system performance',
    icon:       'shield-alt',
    color:      colors.warn,
    colorLight: colors.warnLight,
    insightLabel: 'System Insights',
    insightIcon:  'chart-line',
    suggestions: [
      'How can I improve data quality in the EMR?',
      'What metrics indicate a well-functioning health facility?',
      'Best practices for patient follow-up compliance',
      'How to interpret encounter volume trends?',
    ],
  },
};

function PulsingDot({ color }: { color: string }) {
  const anim = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 600, easing: Easing.ease, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.3, duration: 600, easing: Easing.ease, useNativeDriver: true }),
      ])
    ).start();
  }, [anim]);
  return (
    <View style={{ flexDirection: 'row', gap: 4, paddingVertical: 6, paddingHorizontal: 4 }}>
      {[0, 200, 400].map(delay => {
        const dotAnim = useRef(new Animated.Value(0.3)).current;
        useEffect(() => {
          Animated.loop(
            Animated.sequence([
              Animated.delay(delay),
              Animated.timing(dotAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
              Animated.timing(dotAnim, { toValue: 0.3, duration: 500, useNativeDriver: true }),
            ])
          ).start();
        }, [dotAnim]);
        return (
          <Animated.View
            key={delay}
            style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: color, opacity: dotAnim }}
          />
        );
      })}
    </View>
  );
}

function MessageBubble({ msg, roleColor, roleColorLight }: {
  msg: Message; roleColor: string; roleColorLight: string;
}) {
  const isUser = msg.role === 'user';
  const fadeIn  = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn,  { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  const timeStr = msg.timestamp.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  if (msg.isLoading) {
    return (
      <Animated.View style={[styles.bubbleRow, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
        <View style={[styles.aiBubble, { backgroundColor: roleColorLight }]}>
          <PulsingDot color={roleColor} />
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[
      styles.bubbleRow,
      isUser ? styles.bubbleRowUser : styles.bubbleRowAI,
      { opacity: fadeIn, transform: [{ translateY: slideUp }] },
    ]}>
      {!isUser && (
        <View style={[styles.aiAvatar, { backgroundColor: roleColorLight }]}>
          <FontAwesome5 name="robot" size={12} color={roleColor} />
        </View>
      )}
      <View style={[
        styles.bubble,
        isUser
          ? [styles.userBubble, { backgroundColor: roleColor }]
          : [styles.aiBubble, { backgroundColor: colors.surface, borderColor: colors.border }],
      ]}>
        <Text style={[
          styles.bubbleText,
          isUser ? styles.userBubbleText : styles.aiBubbleText,
        ]}>
          {msg.content}
        </Text>
        <Text style={[styles.bubbleTime, isUser && { color: 'rgba(255,255,255,0.65)' }]}>
          {timeStr}
        </Text>
      </View>
      {isUser && (
        <View style={[styles.userAvatar, { backgroundColor: roleColor }]}>
          <FontAwesome5 name="user" size={11} color={colors.white} />
        </View>
      )}
    </Animated.View>
  );
}

function InsightPanel({ card, onRefresh }: { card: InsightCard; onRefresh: () => void }) {
  const cfg = ROLE_CONFIG[card.type] || ROLE_CONFIG.doctor;
  return (
    <View style={[insightStyles.card, { borderLeftColor: cfg.color }]}>
      <View style={insightStyles.header}>
        <View style={[insightStyles.iconWrap, { backgroundColor: cfg.colorLight }]}>
          <FontAwesome5 name={cfg.insightIcon} size={14} color={cfg.color} />
        </View>
        <Text style={insightStyles.title}>{card.title}</Text>
        <TouchableOpacity onPress={onRefresh} style={insightStyles.refreshBtn} activeOpacity={0.7}>
          <FontAwesome5 name="sync-alt" size={11} color={colors.text3} />
        </TouchableOpacity>
      </View>
      {card.loading ? (
        <View style={insightStyles.loadingRow}>
          <ActivityIndicator size="small" color={cfg.color} />
          <Text style={insightStyles.loadingText}>Analysing data…</Text>
        </View>
      ) : card.error ? (
        <View style={insightStyles.errorRow}>
          <FontAwesome5 name="exclamation-circle" size={13} color={colors.danger} />
          <Text style={insightStyles.errorText}>{card.error}</Text>
        </View>
      ) : (
        <Text style={insightStyles.body}>{card.content}</Text>
      )}
    </View>
  );
}

function SuggestionChip({ label, onPress, color }: {
  label: string; onPress: () => void; color: string;
}) {
  return (
    <TouchableOpacity style={[chipStyles.chip, { borderColor: color + '40' }]}
      onPress={onPress} activeOpacity={0.75}>
      <Text style={[chipStyles.text, { color }]} numberOfLines={2}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function AIAssistantScreen({ navigation, route }: Props) {
  const params        = (route.params || {}) as any;
  const userRole      = (params.role || 'doctor') as 'doctor' | 'nurse' | 'admin';
  const cfg           = ROLE_CONFIG[userRole] || ROLE_CONFIG.doctor;

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending]     = useState(false);
  const [token, setToken]         = useState('');
  const [insightCard, setInsightCard] = useState<InsightCard>({
    title:   cfg.insightLabel,
    content: '',
    type:    userRole as any,
    loading: false,
  });
  const [showInsight, setShowInsight] = useState(false);
  const [activeTab, setActiveTab]     = useState<'chat' | 'insights'>('chat');

  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    SecureStore.getItemAsync('token').then(t => { if (t) setToken(t); });
    // Welcome message
    setMessages([{
      id:        '0',
      role:      'assistant',
      content:   `Hello! I'm SmartCare AI, your ${cfg.subtitle.toLowerCase()}. How can I help you today?`,
      timestamp: new Date(),
    }]);
  }, []);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  const sendMessage = useCallback(async (text?: string) => {
    const content = (text ?? inputText).trim();
    if (!content || sending) return;

    const userMsg: Message = {
      id: Date.now().toString(), role: 'user', content, timestamp: new Date(),
    };
    const loadingMsg: Message = {
      id: 'loading', role: 'assistant', content: '', timestamp: new Date(), isLoading: true,
    };

    setMessages(prev => [...prev, userMsg, loadingMsg]);
    setInputText('');
    setSending(true);
    scrollToBottom();

    // Build history for API (exclude loading placeholder)
    const history = [...messages, userMsg]
      .filter(m => !m.isLoading && m.role !== 'system')
      .map(m => ({ role: m.role, content: m.content }));

    try {
      const res = await axios.post(
        `${API_BASE}/api/ai/chat`,
        { messages: history },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const reply: Message = {
        id:        (Date.now() + 1).toString(),
        role:      'assistant',
        content:   res.data.reply,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev.filter(m => m.id !== 'loading'), reply]);
    } catch (err: any) {
      const errMsg = err?.response?.data?.error || 'Unable to reach AI. Check your connection.';
      setMessages(prev => [...prev.filter(m => m.id !== 'loading'), {
        id: 'err-' + Date.now(), role: 'assistant',
        content: `⚠ ${errMsg}`, timestamp: new Date(),
      }]);
    } finally {
      setSending(false);
      scrollToBottom();
    }
  }, [inputText, messages, sending, token, scrollToBottom]);

  const loadInsight = useCallback(async () => {
    setInsightCard(c => ({ ...c, loading: true, error: undefined }));
    const endpointMap: Record<string, string> = {
      doctor: 'doctor-insights',
      nurse:  'triage',
      admin:  'admin',
    };
    const endpoint = endpointMap[userRole] || 'doctor-insights';
    try {
      const res = await axios.get(
        `${API_BASE}/api/ai/${endpoint}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const content = res.data.insights || res.data.summary || '';
      setInsightCard(c => ({ ...c, loading: false, content }));
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Could not load insights';
      setInsightCard(c => ({ ...c, loading: false, error: msg }));
    }
  }, [token, userRole]);

  useEffect(() => {
    if (activeTab === 'insights' && !insightCard.content && !insightCard.loading) {
      loadInsight();
    }
  }, [activeTab]);

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />

      {/* ── Header ── */}
      <View style={[styles.header, { borderBottomColor: cfg.color + '30' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <FontAwesome5 name="arrow-left" size={14} color={colors.text2} />
        </TouchableOpacity>
        <View style={[styles.headerIcon, { backgroundColor: cfg.colorLight }]}>
          <FontAwesome5 name="robot" size={18} color={cfg.color} />
        </View>
        <View style={styles.headerBody}>
          <Text style={styles.headerTitle}>{cfg.title}</Text>
          <View style={styles.headerStatus}>
            <View style={[styles.statusDot, { backgroundColor: '#22c55e' }]} />
            <Text style={styles.headerSubtitle}>Powered by Groq · LLaMA 3.3</Text>
          </View>
        </View>
      </View>

      {/* ── Tab Bar ── */}
      <View style={styles.tabBar}>
        {(['chat', 'insights'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && [styles.tabActive, { borderBottomColor: cfg.color }]]}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.8}
          >
            <FontAwesome5
              name={tab === 'chat' ? 'comments' : cfg.insightIcon}
              size={12}
              color={activeTab === tab ? cfg.color : colors.text3}
            />
            <Text style={[styles.tabText, activeTab === tab && { color: cfg.color }]}>
              {tab === 'chat' ? 'AI Chat' : cfg.insightLabel}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Chat Tab ── */}
      {activeTab === 'chat' && (
        <>
          <ScrollView
            ref={scrollRef}
            style={styles.messageList}
            contentContainerStyle={styles.messageContent}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={scrollToBottom}
          >
            {/* Suggestion chips — show only when chat is fresh */}
            {messages.length <= 1 && (
              <View style={styles.suggestionsWrap}>
                <Text style={styles.suggestionsLabel}>Suggested questions</Text>
                <View style={styles.chips}>
                  {cfg.suggestions.map((s, i) => (
                    <SuggestionChip key={i} label={s} color={cfg.color}
                      onPress={() => sendMessage(s)} />
                  ))}
                </View>
              </View>
            )}

            {messages.map(msg => (
              <MessageBubble key={msg.id} msg={msg}
                roleColor={cfg.color} roleColorLight={cfg.colorLight} />
            ))}
          </ScrollView>

          {/* ── Input Bar ── */}
          <View style={styles.inputBar}>
            <View style={[styles.inputWrap, { borderColor: cfg.color + '50' }]}>
              <TextInput
                style={styles.input}
                value={inputText}
                onChangeText={setInputText}
                placeholder="Ask SmartCare AI…"
                placeholderTextColor={colors.text3}
                multiline
                maxLength={1000}
                onSubmitEditing={() => sendMessage()}
                returnKeyType="send"
                blurOnSubmit
              />
              <TouchableOpacity
                style={[
                  styles.sendBtn,
                  { backgroundColor: inputText.trim() && !sending ? cfg.color : colors.border2 },
                ]}
                onPress={() => sendMessage()}
                disabled={!inputText.trim() || sending}
                activeOpacity={0.85}
              >
                {sending
                  ? <ActivityIndicator size="small" color={colors.white} />
                  : <FontAwesome5 name="paper-plane" size={13} color={colors.white} />
                }
              </TouchableOpacity>
            </View>
            <Text style={styles.disclaimer}>
              AI responses are for clinical support only — not a substitute for professional judgement.
            </Text>
          </View>
        </>
      )}

      {/* ── Insights Tab ── */}
      {activeTab === 'insights' && (
        <ScrollView style={styles.messageList} contentContainerStyle={styles.insightsContent}
          showsVerticalScrollIndicator={false}>
          <View style={styles.insightsBanner}>
            <View style={[styles.insightsBannerIcon, { backgroundColor: cfg.colorLight }]}>
              <FontAwesome5 name={cfg.insightIcon} size={22} color={cfg.color} />
            </View>
            <Text style={styles.insightsBannerTitle}>{cfg.insightLabel}</Text>
            <Text style={styles.insightsBannerSub}>
              AI-generated from live system data
            </Text>
          </View>
          <InsightPanel card={insightCard} onRefresh={loadInsight} />
          <View style={styles.insightsFooter}>
            <FontAwesome5 name="info-circle" size={11} color={colors.text3} />
            <Text style={styles.insightsFooterText}>
              Insights are generated from aggregate, de-identified data. Refreshed on demand.
            </Text>
          </View>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

/* ── Styles ──────────────────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  root:             { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingVertical: 12, backgroundColor: colors.surface,
    borderBottomWidth: 2, ...shadow.sm,
  },
  backBtn:          { padding: 6, marginRight: 8 },
  headerIcon:       { width: 42, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  headerBody:       { flex: 1 },
  headerTitle:      { fontSize: 15, fontWeight: font.semibold, color: colors.text, letterSpacing: -0.2 },
  headerStatus:     { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  statusDot:        { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
  headerSubtitle:   { fontSize: 11, color: colors.text3 },
  tabBar:           { flexDirection: 'row', backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  tab:              { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 11, gap: 6, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive:        {},
  tabText:          { fontSize: 12, fontWeight: font.medium, color: colors.text3 },
  messageList:      { flex: 1 },
  messageContent:   { padding: 16, paddingBottom: 8 },
  suggestionsWrap:  { marginBottom: 20 },
  suggestionsLabel: { fontSize: 11, color: colors.text3, fontWeight: font.medium, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  chips:            { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  bubbleRow:        { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 12, gap: 8 },
  bubbleRowUser:    { justifyContent: 'flex-end' },
  bubbleRowAI:      { justifyContent: 'flex-start' },
  aiAvatar:         { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  userAvatar:       { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  bubble:           { maxWidth: '75%', borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 10 },
  userBubble:       { borderBottomRightRadius: 4 },
  aiBubble:         { borderBottomLeftRadius: 4, borderWidth: 1, ...shadow.sm },
  bubbleText:       { fontSize: 14, lineHeight: 21 },
  userBubbleText:   { color: colors.white },
  aiBubbleText:     { color: colors.text },
  bubbleTime:       { fontSize: 10, color: colors.text3, marginTop: 5, alignSelf: 'flex-end' },
  inputBar:         { padding: 12, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  inputWrap:        { flexDirection: 'row', alignItems: 'flex-end', borderWidth: 1.5, borderRadius: radius.lg, backgroundColor: colors.bg, paddingLeft: 14, paddingRight: 6, paddingVertical: 6 },
  input:            { flex: 1, fontSize: 14, color: colors.text, maxHeight: 100, paddingVertical: 4 },
  sendBtn:          { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginLeft: 6 },
  disclaimer:       { fontSize: 10, color: colors.text3, textAlign: 'center', marginTop: 8, lineHeight: 14 },
  insightsContent:  { padding: 16, paddingBottom: 40 },
  insightsBanner: {
    alignItems: 'center', paddingVertical: 24,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    marginBottom: 16, borderWidth: 1, borderColor: colors.border, ...shadow.sm,
  },
  insightsBannerIcon: { width: 56, height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  insightsBannerTitle:{ fontSize: 18, fontWeight: font.bold, color: colors.text, letterSpacing: -0.3 },
  insightsBannerSub:  { fontSize: 12, color: colors.text3, marginTop: 4 },
  insightsFooter:     { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 8, paddingHorizontal: 4 },
  insightsFooterText: { flex: 1, fontSize: 11, color: colors.text3, lineHeight: 16 },
});

const insightStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface, borderRadius: radius.md, padding: 16,
    borderWidth: 1, borderColor: colors.border, borderLeftWidth: 3, ...shadow.sm,
  },
  header:      { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  iconWrap:    { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  title:       { flex: 1, fontSize: 13, fontWeight: font.semibold, color: colors.text },
  refreshBtn:  { padding: 6 },
  loadingRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  loadingText: { fontSize: 13, color: colors.text3 },
  errorRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  errorText:   { flex: 1, fontSize: 13, color: colors.danger },
  body:        { fontSize: 13, color: colors.text2, lineHeight: 21 },
});

const chipStyles = StyleSheet.create({
  chip: {
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: radius.full, borderWidth: 1.5,
    backgroundColor: colors.surface, ...shadow.sm,
    maxWidth: '48%',
  },
  text: { fontSize: 12, fontWeight: font.medium, lineHeight: 17 },
});
