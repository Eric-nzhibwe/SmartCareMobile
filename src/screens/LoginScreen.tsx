import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5 } from '@expo/vector-icons';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { StackScreenProps } from '@react-navigation/stack';

import { auth, db }           from '../firebase';
import { storeSession }        from '../api';
import { RootStackParamList }  from '../../App';
import { colors, radius, shadow, font } from '../theme';

type Props = StackScreenProps<RootStackParamList, 'Login'>;

/**
 * Username → Firebase email mapping.
 * Each role account has a fixed email in Firebase Auth (username@smartcare.app).
 */
const USERNAME_TO_EMAIL: Record<string, string> = {
  doctor: 'doctor@smartcare.app',
  nurse:  'nurse@smartcare.app',
  admin:  'admin@smartcare.app',
};

export default function LoginScreen({ navigation }: Props) {
  const [username, setUsername]       = useState('');
  const [password, setPassword]       = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');

  const handleLogin = async () => {
    setError('');
    const trimmed = username.trim().toLowerCase();

    if (!trimmed || !password) {
      setError('Please enter your username and password.');
      return;
    }

    const email = USERNAME_TO_EMAIL[trimmed];
    if (!email) {
      setError('Username not recognised. Please check and try again.');
      return;
    }

    setLoading(true);
    try {
      // 1. Sign in with Firebase Auth
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const { uid } = credential.user;

      // 2. Fetch the user profile from Firestore
      const snap = await getDoc(doc(db, 'users', uid));
      if (!snap.exists()) {
        setError('User profile not found. Please contact your administrator.');
        return;
      }

      const profile = snap.data();
      const user = {
        uid,
        username: profile.username,
        role:     profile.role,
        facility: profile.facility ?? 'Ministry of Health',
        email:    profile.email,
      };

      // 3. Cache the profile locally
      await storeSession({ user });

      // 4. Route to the correct dashboard
      if (user.role === 'admin')       navigation.replace('AdminDashboard');
      else if (user.role === 'doctor') navigation.replace('DoctorDashboard');
      else if (user.role === 'nurse')  navigation.replace('NurseDashboard');
      else                             navigation.replace('Dashboard');

    } catch (err: any) {
      // Log the real error code to Metro console for debugging
      console.error('[Login] Firebase error code:', err?.code, '| message:', err?.message);

      // Map Firebase error codes to friendly messages
      const code: string = err?.code ?? '';
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setError('Incorrect password. Please try again.');
      } else if (code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please wait a moment and try again.');
      } else if (code === 'auth/network-request-failed') {
        setError('No network connection. Please check your internet and retry.');
      } else if (code === 'auth/user-not-found') {
        setError('No account found for this username.');
      } else if (code === 'auth/invalid-api-key') {
        setError('App configuration error. Please contact support.');
      } else {
        setError(`Sign in failed (${code || 'unknown'}). Please try again.`);
      }
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

            {/* ── Logo ── */}
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
                placeholder="doctor / nurse / admin"
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
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.inputWithToggle}
                  placeholder="Enter password"
                  placeholderTextColor={colors.text3}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowPassword(prev => !prev)}
                  activeOpacity={0.7}
                >
                  <FontAwesome5
                    name={showPassword ? 'eye-slash' : 'eye'}
                    size={14}
                    color={colors.text3}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* ── Error ── */}
            {!!error && (
              <View style={styles.errorBox}>
                <FontAwesome5 name="exclamation-circle" size={12} color={colors.danger} />
                <Text style={styles.errorText}> {error}</Text>
              </View>
            )}

            {/* ── Sign In ── */}
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
  gradient: { flex: 1 },
  kav:      { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 28,
    width: '100%',
    maxWidth: 420,
    ...shadow.lg,
  },
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
  field: { marginBottom: 14 },
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
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border2,
    borderWidth: 1,
    borderRadius: radius.sm,
  },
  inputWithToggle: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    color: colors.text,
  },
  eyeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
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
  btn: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.7 },
  btnText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: font.semibold,
  },
});
