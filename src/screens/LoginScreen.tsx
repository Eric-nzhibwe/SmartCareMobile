import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5 } from '@expo/vector-icons';
import axios from 'axios';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';
import { colors, radius, shadow, font } from '../theme';
import { storeSession } from '../api';

import { API_BASE } from '../config';

type Props = StackScreenProps<RootStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleLogin = async () => {
    setError('');
    if (!username.trim() || !password) {
      setError('Please enter your username and password.');
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE}/api/login`, {
        username: username.trim(),
        password,
      });
      const { token, refresh, user } = response.data;
      await storeSession({ token, refresh, user });
      // Route to the correct role-specific dashboard
      if (user.role === 'admin') navigation.replace('AdminDashboard');
      else if (user.role === 'doctor') navigation.replace('DoctorDashboard');
      else if (user.role === 'nurse') navigation.replace('NurseDashboard');
      else navigation.replace('Dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={[colors.gradientStart, colors.gradientMid, colors.gradientEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Card ── */}
          <View style={styles.card}>

            {/* ── Logo / Header ── */}
            <View style={styles.logoBlock}>
              <View style={styles.logoIconWrap}>
                <FontAwesome5 name="hospital" size={32} color={colors.primary} />
              </View>
              <View style={styles.logoTitleRow}>
                <FontAwesome5 name="heartbeat" size={18} color={colors.primary} />
                <Text style={styles.logoTitle}> SmartCare EMR</Text>
              </View>
              <Text style={styles.logoSub}>Ministry of Health · Republic of Zambia</Text>
            </View>

            {/* ── Username ── */}
            <View style={styles.field}>
              <View style={styles.fieldLabel}>
                <FontAwesome5 name="user" size={11} color={colors.text2} />
                <Text style={styles.labelText}> Username</Text>
              </View>
              <TextInput
                style={styles.input}
                placeholder="Enter username"
                placeholderTextColor={colors.text3}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
              />
            </View>

            {/* ── Password ── */}
            <View style={styles.field}>
              <View style={styles.fieldLabel}>
                <FontAwesome5 name="lock" size={11} color={colors.text2} />
                <Text style={styles.labelText}> Password</Text>
              </View>
              <TextInput
                style={styles.input}
                placeholder="Enter password"
                placeholderTextColor={colors.text3}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
            </View>

            {/* ── Error ── */}
            {!!error && (
              <View style={styles.errorBox}>
                <FontAwesome5 name="exclamation-circle" size={12} color={colors.danger} />
                <Text style={styles.errorText}> {error}</Text>
              </View>
            )}

            {/* ── Sign In button ── */}
            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <>
                  <FontAwesome5 name="sign-in-alt" size={14} color={colors.white} />
                  <Text style={styles.btnText}> Sign In</Text>
                </>
              )}
            </TouchableOpacity>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  kav: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  // Card
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 28,
    width: '100%',
    maxWidth: 420,
    ...shadow.lg,
  },

  // Logo
  logoBlock: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: colors.primaryGhost,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoTitle: {
    fontSize: 20,
    fontWeight: font.semibold,
    color: colors.primary,
    letterSpacing: -0.3,
  },
  logoSub: {
    fontSize: 12,
    color: colors.text3,
    marginTop: 4,
  },

  // Fields
  field: {
    marginBottom: 14,
  },
  fieldLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  labelText: {
    fontSize: 12,
    fontWeight: font.medium,
    color: colors.text2,
    letterSpacing: 0.1,
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border2,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    color: colors.text,
  },

  // Error
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    padding: 10,
    backgroundColor: colors.dangerLight,
    borderRadius: radius.sm,
  },
  errorText: {
    fontSize: 12,
    color: colors.danger,
    flexShrink: 1,
    lineHeight: 16,
  },

  // Button
  btn: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  btnText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: font.semibold,
  },
});
