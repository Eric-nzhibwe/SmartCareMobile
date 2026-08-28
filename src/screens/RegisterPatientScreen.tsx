import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';
import { colors, radius, shadow, font } from '../theme';

import { API_BASE } from '../config';

type Props = StackScreenProps<RootStackParamList, 'RegisterPatient'>;

type FieldConfig = {
  key: string;
  label: string;
  placeholder: string;
  icon: string;
  iconColor: string;
  keyboard?: 'default' | 'phone-pad' | 'email-address';
  required?: boolean;
  hint?: string;
};

const FIELDS: FieldConfig[] = [
  {
    key: 'firstName', label: 'First Name', placeholder: 'e.g. John',
    icon: 'user', iconColor: colors.primary, required: true,
  },
  {
    key: 'lastName', label: 'Last Name', placeholder: 'e.g. Banda',
    icon: 'user', iconColor: colors.primary, required: true,
  },
  {
    key: 'dob', label: 'Date of Birth', placeholder: 'YYYY-MM-DD',
    icon: 'calendar-alt', iconColor: colors.accent, required: true,
    hint: 'Format: 1990-06-15',
  },
  {
    key: 'phone', label: 'Phone Number', placeholder: 'e.g. 0977 123456',
    icon: 'phone', iconColor: colors.text2, keyboard: 'phone-pad',
  },
  {
    key: 'nrc', label: 'NRC Number', placeholder: 'e.g. 123456/78/9',
    icon: 'id-card', iconColor: colors.text2,
  },
  {
    key: 'facility', label: 'Facility', placeholder: 'e.g. UTH Lusaka',
    icon: 'hospital', iconColor: colors.primary,
  },
];

const GENDER_OPTIONS = ['Male', 'Female', 'Other'];

export default function RegisterPatientScreen({ navigation }: Props) {
  const [form, setForm] = useState<Record<string, string>>({
    firstName: '', lastName: '', dob: '', phone: '',
    nrc: '', facility: 'UTH Lusaka',
  });
  const [gender, setGender]   = useState('Male');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors]   = useState<Record<string, string>>({});

  const setField = (key: string, val: string) => {
    setForm(prev => ({ ...prev, [key]: val }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: '' }));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!form.lastName.trim())  newErrors.lastName  = 'Last name is required';
    if (!form.dob.trim())       newErrors.dob       = 'Date of birth is required';
    else if (!/^\d{4}-\d{2}-\d{2}$/.test(form.dob.trim()))
      newErrors.dob = 'Use format YYYY-MM-DD';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync('token');
      const response = await axios.post(`${API_BASE}/api/patients`, {
        first_name:    form.firstName.trim(),
        last_name:     form.lastName.trim(),
        date_of_birth: form.dob.trim(),
        gender,
        phone:         form.phone.trim() || undefined,
        nrc:           form.nrc.trim()   || undefined,
        facility:      form.facility.trim() || undefined,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data?.success) {
        Alert.alert(
          'Patient Registered',
          `SmartID: ${response.data.smart_id}`,
          [{ text: 'OK', onPress: () => navigation.goBack() }],
        );
      }
    } catch (err: any) {
      Alert.alert(
        'Registration Failed',
        err?.response?.data?.error || 'Unable to register patient. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >

          {/* ── Header card ── */}
          <View style={styles.headerCard}>
            <View style={styles.headerIconWrap}>
              <FontAwesome5 name="user-plus" size={20} color={colors.accent} />
            </View>
            <View>
              <Text style={styles.headerTitle}>New Patient</Text>
              <Text style={styles.headerSub}>Fill in the patient's details below</Text>
            </View>
          </View>

          {/* ── Section: Personal Info ── */}
          <SectionDivider label="Personal Information" />

          {FIELDS.slice(0, 3).map(f => (
            <FormField
              key={f.key}
              config={f}
              value={form[f.key]}
              error={errors[f.key]}
              onChange={v => setField(f.key, v)}
            />
          ))}

          {/* ── Gender selector ── */}
          <View style={styles.field}>
            <View style={styles.fieldLabel}>
              <FontAwesome5 name="venus-mars" size={11} color={colors.text2} />
              <Text style={styles.labelText}> Gender</Text>
            </View>
            <View style={styles.genderRow}>
              {GENDER_OPTIONS.map(g => (
                <TouchableOpacity
                  key={g}
                  style={[styles.genderOpt, gender === g && styles.genderOptActive]}
                  onPress={() => setGender(g)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.genderText, gender === g && styles.genderTextActive]}>
                    {g}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ── Section: Contact & Admin ── */}
          <SectionDivider label="Contact & Administrative" />

          {FIELDS.slice(3).map(f => (
            <FormField
              key={f.key}
              config={f}
              value={form[f.key]}
              error={errors[f.key]}
              onChange={v => setField(f.key, v)}
            />
          ))}

          {/* ── Buttons ── */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => navigation.goBack()}
              activeOpacity={0.8}
            >
              <FontAwesome5 name="times" size={13} color={colors.text2} />
              <Text style={styles.cancelBtnText}> Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.btnDisabled]}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <>
                  <FontAwesome5 name="save" size={13} color={colors.white} />
                  <Text style={styles.submitBtnText}> Register Patient</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

/* ── Sub-components ── */

function SectionDivider({ label }: { label: string }) {
  return (
    <View style={divStyles.wrap}>
      <Text style={divStyles.label}>{label}</Text>
      <View style={divStyles.line} />
    </View>
  );
}

const divStyles = StyleSheet.create({
  wrap:  { marginBottom: 12, marginTop: 4 },
  label: { fontSize: 10, fontWeight: font.semibold, color: colors.text3,
            textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  line:  { height: 1, backgroundColor: colors.border },
});

type FormFieldProps = {
  config: FieldConfig;
  value: string;
  error?: string;
  onChange: (val: string) => void;
};

function FormField({ config, value, error, onChange }: FormFieldProps) {
  return (
    <View style={styles.field}>
      <View style={styles.fieldLabel}>
        <FontAwesome5 name={config.icon} size={11} color={config.iconColor} />
        <Text style={styles.labelText}>
          {' '}{config.label}
          {config.required && <Text style={{ color: colors.danger }}> *</Text>}
        </Text>
      </View>
      <TextInput
        style={[styles.input, !!error && styles.inputError]}
        placeholder={config.placeholder}
        placeholderTextColor={colors.text3}
        value={value}
        onChangeText={onChange}
        keyboardType={config.keyboard ?? 'default'}
        autoCapitalize={config.key === 'firstName' || config.key === 'lastName' ? 'words' : 'none'}
      />
      {config.hint && !error && (
        <Text style={styles.hintText}>{config.hint}</Text>
      )}
      {!!error && (
        <View style={styles.errorRow}>
          <FontAwesome5 name="exclamation-circle" size={10} color={colors.danger} />
          <Text style={styles.errorText}> {error}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll:    { padding: 16, paddingBottom: 40 },

  // Header card
  headerCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.sm,
  },
  headerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: font.semibold,
    color: colors.text,
    letterSpacing: -0.2,
  },
  headerSub: {
    fontSize: 12,
    color: colors.text3,
    marginTop: 2,
  },

  // Fields
  field: { marginBottom: 12 },
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
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
  },
  inputError: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerLight,
  },
  hintText: {
    fontSize: 11,
    color: colors.text3,
    marginTop: 3,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  errorText: {
    fontSize: 11,
    color: colors.danger,
  },

  // Gender
  genderRow: {
    flexDirection: 'row',
    gap: 8,
  },
  genderOpt: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border2,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  genderOptActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryGhost,
  },
  genderText: {
    fontSize: 13,
    color: colors.text2,
    fontWeight: font.medium,
  },
  genderTextActive: {
    color: colors.primary,
    fontWeight: font.semibold,
  },

  // Actions
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border2,
    backgroundColor: colors.surface,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: font.medium,
    color: colors.text2,
  },
  submitBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
  },
  btnDisabled: { opacity: 0.7 },
  submitBtnText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: font.semibold,
  },
});
