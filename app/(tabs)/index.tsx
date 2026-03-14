import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Dimensions, Image, Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useBaby } from '../../context/BabyContext';
import { calculateBabyAges } from '../../lib/babyLogic';
import { supabase } from '../../lib/supabase';
import { ensureWeeklyPlanExists } from '../../lib/weeklyPlanner';

const { width } = Dimensions.get('window');

// Mapeo preciso de colores del diseño original para las tarjetas
const AREA_COLORS = {
  Motor: { bg: '#FFE4cc', text: '#5D4037', highlight: '#F57C00' }, // Naranja pastel
  Language: { bg: '#E4F4D0', text: '#33691E', highlight: '#558B2F' }, // Verde pastel
  Cognitive: { bg: '#E0F7FA', text: '#006064', highlight: '#00838F' }, // Cyan pastel
  Social: { bg: '#E8EAF6', text: '#283593', highlight: '#3949AB' }, // Morado pastel
};

const getExactAgeString = (birthDateString: string) => {
  const start = new Date(birthDateString);
  const end = new Date();

  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  let days = end.getDate() - start.getDate();

  if (days < 0) {
    months--;
    const previousMonth = new Date(end.getFullYear(), end.getMonth(), 0);
    days += previousMonth.getDate();
  }
  if (months < 0) {
    years--;
    months += 12;
  }

  let result = '';
  if (years > 0) result += `${years} año${years > 1 ? 's' : ''}, `;
  if (months > 0) result += `${months} mes${months > 1 ? 'es' : ''}, `;
  if (days > 0 || result === '') result += `${days} día${days !== 1 ? 's' : ''}`;

  // Clean up trailing comma
  if (result.endsWith(', ')) result = result.substring(0, result.length - 2);
  return result;
};

export default function HomeScreen() {
  const { user, loading: authLoading } = useAuth();
  const { babies, selectedBaby, setSelectedBaby, loadingBabies } = useBaby();
  const [tutorName, setTutorName] = useState<string>('Mom');
  const [loadingProgress, setLoadingProgress] = useState(false);
  const [showBabySelector, setShowBabySelector] = useState(false);
  const [showBabyDetailsModal, setShowBabyDetailsModal] = useState(false);
  const router = useRouter();

  // Progress State
  const [globalProgress, setGlobalProgress] = useState({ completed: 0, total: 0 });
  const [areaProgress, setAreaProgress] = useState({
    Motor: { completed: 0, total: 0 },
    Lenguaje: { completed: 0, total: 0 },
    Cognitivo: { completed: 0, total: 0 },
    Social: { completed: 0, total: 0 }
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login' as any);
    }
  }, [user, authLoading]);

  const fetchProgressAndTutor = async () => {
    if (!user) return;
    setLoadingProgress(true);
    try {
      // 1. Fetch tutor data
      const { data: tutorData } = await supabase
        .from('tutor')
        .select('full_name')
        .eq('tutor_id', user?.id)
        .single();

      if (tutorData?.full_name) {
        const firstName = tutorData.full_name.split(' ')[0];
        setTutorName(firstName);
      }

      // 2. Fetch progress for selected baby
      if (selectedBaby) {
        setAreaProgress({ Motor: { completed: 0, total: 0 }, Lenguaje: { completed: 0, total: 0 }, Cognitivo: { completed: 0, total: 0 }, Social: { completed: 0, total: 0 } });
        setGlobalProgress({ completed: 0, total: 0 });

        const { cronological, corrected, isPremature } = calculateBabyAges(
          selectedBaby.birth_date,
          selectedBaby.weeks_gestation || 40
        );
        const targetAgeInMonths = Math.floor(isPremature ? corrected : cronological);

        // Get range for baby
        let { data: rangeData } = await supabase
          .from('age_range')
          .select('range_id')
          .lte('min_months', targetAgeInMonths)
          .gte('max_months', targetAgeInMonths)
          .limit(1);

        if (!rangeData || rangeData.length === 0) {
          const { data: fallbackRange } = await supabase
            .from('age_range')
            .select('range_id')
            .order('min_months', { ascending: true })
            .limit(1);
          rangeData = fallbackRange;
        }

        if (rangeData && rangeData.length > 0) {
          const activeRangeId = rangeData[0].range_id;
          await ensureWeeklyPlanExists(selectedBaby.baby_id, activeRangeId, isPremature);

          const offset = new Date().getTimezoneOffset();
          const now = new Date();
          const todayStr = new Date(now.getTime() - (offset * 60 * 1000)).toISOString().split('T')[0];

          const startOfWeek = new Date(now);
          const day = startOfWeek.getDay();
          const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
          startOfWeek.setDate(diff);
          startOfWeek.setHours(0, 0, 0, 0);

          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(endOfWeek.getDate() + 6);

          const startStr = new Date(startOfWeek.getTime() - (offset * 60 * 1000)).toISOString().split('T')[0];
          const endStr = new Date(endOfWeek.getTime() - (offset * 60 * 1000)).toISOString().split('T')[0];

          const { data: planData } = await supabase
            .from('planned_activity')
            .select('activity_id, assigned_date')
            .eq('baby_id', selectedBaby.baby_id)
            .gte('assigned_date', startStr)
            .lte('assigned_date', endStr);

          if (planData && planData.length > 0) {
            const plannedIds = planData.map(p => p.activity_id);
            const { data: activityData } = await supabase
              .from('activity')
              .select(`*, stimulation_area ( name )`)
              .in('activity_id', plannedIds);

            const { data: logData } = await supabase
              .from('activity_log')
              .select('activity_id')
              .eq('baby_id', selectedBaby.baby_id)
              .in('activity_id', plannedIds)
              .not('end_time', 'is', null);

            if (activityData) {
              const logsSet = new Set(logData?.map(log => log.activity_id) || []);
              let globalTotal = activityData.length;
              let globalCompleted = logsSet.size;

              const progressMap = { Motor: { completed: 0, total: 0 }, Lenguaje: { completed: 0, total: 0 }, Cognitivo: { completed: 0, total: 0 }, Social: { completed: 0, total: 0 } };

              activityData.forEach(act => {
                const planMatch = planData.find(p => p.activity_id === act.activity_id);
                const isCompleted = logsSet.has(act.activity_id);
                const isForToday = planMatch && planMatch.assigned_date === todayStr;

                if (isForToday) {
                  const areaName = (act.stimulation_area as any)?.name?.toLowerCase() || '';

                  let targetArea = 'Cognitivo';
                  if (areaName.includes('motor')) targetArea = 'Motor';
                  if (areaName.includes('lenguaje') || areaName.includes('language') || areaName.includes('auditory')) targetArea = 'Lenguaje';
                  if (areaName.includes('social') || areaName.includes('emocional')) targetArea = 'Social';
                  if (areaName.includes('cognitiv') || areaName.includes('sensory')) targetArea = 'Cognitivo';

                  progressMap[targetArea as keyof typeof progressMap].total++;
                  if (isCompleted) {
                    progressMap[targetArea as keyof typeof progressMap].completed++;
                  }
                }
              });

              setGlobalProgress({ completed: globalCompleted, total: globalTotal });
              setAreaProgress(progressMap);
            }
          }
        }
      } else {
        // Clear progress if no baby
        setGlobalProgress({ completed: 0, total: 0 });
        setAreaProgress({ Motor: { completed: 0, total: 0 }, Lenguaje: { completed: 0, total: 0 }, Cognitivo: { completed: 0, total: 0 }, Social: { completed: 0, total: 0 } });
      }
    } catch (err) {
      console.error('Error fetching progress for home screen:', err);
    } finally {
      setLoadingProgress(false);
    }
  };

  useEffect(() => {
    if (user && !loadingBabies) {
      fetchProgressAndTutor();
    }
  }, [user, selectedBaby, loadingBabies]);

  if (authLoading || loadingBabies) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (!user) return null;

  // Percentages Calculation
  const globalPercentage = globalProgress.total > 0 ? Math.round((globalProgress.completed / globalProgress.total) * 100) : 0;

  const getAreaPercentage = (areaKey: 'Motor' | 'Lenguaje' | 'Cognitivo' | 'Social') => {
    const areaStats = areaProgress[areaKey];
    if (areaStats.total === 0) return 0;
    return Math.round((areaStats.completed / areaStats.total) * 100);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8F9FB' }}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* TOP HEADER (Avatar + Welcome) */}
        <View style={styles.topHeader}>
          <View style={[styles.profileRow, { padding: 0 }]}>
            <TouchableOpacity style={styles.avatarContainer} onPress={() => setShowBabyDetailsModal(true)}>
              <Image
                source={require('../../assets/images/profile_baby.png')}
                style={styles.avatarImage}
                defaultSource={require('../../assets/images/profile_baby.png')}
              />
              <View style={styles.onlineBadge} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.greetingBox} onPress={() => setShowBabySelector(true)}>
              <Text style={styles.goodMorning}>Buenos días,</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.username}>
                  {selectedBaby ? `${selectedBaby.name} & ${tutorName}` : `Hola, ${tutorName}`}
                </Text>
                <MaterialCommunityIcons name="chevron-down" size={24} color="#0f172a" style={{ marginTop: 2, marginLeft: 4 }} />
              </View>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.bellIcon} onPress={() => supabase.auth.signOut()}>
            <MaterialCommunityIcons name="logout" size={24} color="#ef4444" />
          </TouchableOpacity>
        </View>

        {/* BABY DETAILS MODAL */}
        {selectedBaby && (
          <Modal visible={showBabyDetailsModal} transparent={true} animationType="fade" onRequestClose={() => setShowBabyDetailsModal(false)}>
            <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowBabyDetailsModal(false)} activeOpacity={1}>
              <View style={styles.modalContent}>
                <View style={{ alignItems: 'center', marginBottom: 16 }}>
                  <Image
                    source={require('../../assets/images/profile_baby.png')}
                    style={{ width: 80, height: 80, borderRadius: 40, marginBottom: 12 }}
                  />
                  <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#0f172a' }}>{selectedBaby.name}</Text>
                  <Text style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>
                    Edad: {Math.floor(calculateBabyAges(selectedBaby.birth_date, selectedBaby.weeks_gestation || 40).cronological)} meses
                  </Text>
                </View>

                <View style={{ backgroundColor: '#f8fafc', padding: 16, borderRadius: 12, width: '100%', marginBottom: 20 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                    <Text style={{ fontSize: 14, color: '#64748b', fontWeight: '500' }}>Nacimiento</Text>
                    <Text style={{ fontSize: 14, color: '#0f172a', fontWeight: 'bold' }}>{selectedBaby.birth_date}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                    <Text style={{ fontSize: 14, color: '#64748b', fontWeight: '500' }}>Edad Exacta</Text>
                    <Text style={{ fontSize: 14, color: '#0f172a', fontWeight: 'bold' }}>{getExactAgeString(selectedBaby.birth_date)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 14, color: '#64748b', fontWeight: '500' }}>¿Prematuro?</Text>
                    <Text style={{ fontSize: 14, color: '#0f172a', fontWeight: 'bold' }}>{selectedBaby.is_premature ? 'Sí' : 'No'}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.continueBtn, { width: '100%', marginTop: 0 }]}
                  onPress={() => setShowBabyDetailsModal(false)}
                >
                  <Text style={styles.continueBtnText}>Cerrar Detalles</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Modal>
        )}

        {/* BABY SELECTOR MODAL */}
        <Modal visible={showBabySelector} transparent={true} animationType="fade" onRequestClose={() => setShowBabySelector(false)}>
          <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowBabySelector(false)} activeOpacity={1}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Seleccionar Bebé</Text>
              {babies.map((baby) => (
                <TouchableOpacity
                  key={baby.baby_id}
                  style={[styles.babyOption, selectedBaby?.baby_id === baby.baby_id && styles.babyOptionSelected]}
                  onPress={() => {
                    setSelectedBaby(baby);
                    setShowBabySelector(false);
                  }}
                >
                  <MaterialCommunityIcons name="face-man-profile" size={24} color={selectedBaby?.baby_id === baby.baby_id ? '#3b82f6' : '#64748b'} />
                  <Text style={[styles.babyOptionText, selectedBaby?.baby_id === baby.baby_id && { color: '#3b82f6', fontWeight: 'bold' }]}>
                    {baby.name}
                  </Text>
                  {selectedBaby?.baby_id === baby.baby_id && <MaterialCommunityIcons name="check" size={20} color="#3b82f6" />}
                </TouchableOpacity>
              ))}

              {babies.length < 2 && (
                <TouchableOpacity
                  style={styles.addBabyOption}
                  onPress={() => {
                    setShowBabySelector(false);
                    router.push('/register-baby' as any);
                  }}
                >
                  <MaterialCommunityIcons name="plus-circle-outline" size={24} color="#10b981" />
                  <Text style={styles.addBabyText}>Registrar otro bebé</Text>
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>
        </Modal>

        {/* MAIN CARD: CURRENT MILESTONE */}
        {selectedBaby ? (
          <View style={styles.mainCard}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.milestoneLabel}>PLAN SEMANAL 🚀</Text>
              <View style={styles.monthBadge}>
                <Text style={styles.monthBadgeText}>{globalProgress.completed}/{globalProgress.total} Completadas</Text>
              </View>
            </View>

            <Text style={styles.levelTitle}>{selectedBaby.name}'s Plan</Text>

            <View style={styles.illustrationRow}>
              <Image
                source={require('../../assets/images/baby_activity.png')}
                style={styles.babyActivityImage}
                resizeMode="contain"
              />

              <View style={styles.nextStepBox}>
                <Text style={styles.nextStepLabel}>Progreso Semanal</Text>
                <Text style={styles.nextStepValue}>{globalPercentage}%</Text>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${globalPercentage}%` }]} />
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={styles.continueBtn}
              onPress={() => router.push({ pathname: '/daily-plan', params: { baby_id: selectedBaby.baby_id } })}
              activeOpacity={0.8}
            >
              <Text style={styles.continueBtnText}>Ver Plan Diario</Text>
              <MaterialCommunityIcons name="calendar-check" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.welcomeInfo}>No se encontró ningún perfil de bebé.</Text>
            <TouchableOpacity
              style={[styles.continueBtn, { width: '80%', alignSelf: 'center' }]}
              onPress={() => router.push('/register-baby' as any)}
              activeOpacity={0.8}
            >
              <Text style={styles.continueBtnText}>Registrar Bebé</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.devAreasHeader}>
          <Text style={styles.devAreasTitle}>Áreas de Desarrollo</Text>
          <Text style={styles.viewReportText}>Ver Reportes</Text>
        </View>

        <View style={styles.devGrid}>
          {[
            { key: 'Motor', title: 'Motor', icon: 'run', colors: AREA_COLORS.Motor, paramId: 'Motor' },
            { key: 'Lenguaje', title: 'Lenguaje', icon: 'chart-bar', colors: AREA_COLORS.Language, paramId: 'Lenguaje' },
            { key: 'Cognitivo', title: 'Cognitivo', icon: 'head-lightbulb-outline', colors: AREA_COLORS.Cognitive, paramId: 'Cognitivo' },
            { key: 'Social', title: 'Social', icon: 'heart', colors: AREA_COLORS.Social, paramId: 'Social' }
          ].map((area) => {
            const pct = getAreaPercentage(area.key as any);
            const isPlannedToday = areaProgress[area.key as keyof typeof areaProgress].total > 0;

            const bgColor = isPlannedToday ? area.colors.bg : '#F1F5F9';
            const iconBg = isPlannedToday ? `${area.colors.bg}80` : '#E2E8F0';
            const iconColor = isPlannedToday ? area.colors.highlight : '#94A3B8';
            const textColor = isPlannedToday ? area.colors.text : '#94A3B8';
            const subtitleText = isPlannedToday ? 'Reporte Diario' : 'Sin plan hoy';

            return (
              <TouchableOpacity
                key={area.key}
                style={[styles.devCard, { backgroundColor: bgColor }]}
                onPress={() => {
                  if (selectedBaby && isPlannedToday) {
                    router.push({ pathname: '/area-report', params: { baby_id: selectedBaby.baby_id, area: area.paramId } });
                  }
                }}
                activeOpacity={isPlannedToday ? 0.7 : 1}
              >
                <View style={styles.devCardHeader}>
                  <View style={[styles.devIconWrapper, { backgroundColor: iconBg }]}>
                    <MaterialCommunityIcons name={area.icon as any} size={24} color={iconColor} />
                  </View>
                  <Text style={[styles.devPercentage, { color: textColor }]}>
                    {isPlannedToday ? `${pct}%` : '-'}
                  </Text>
                </View>
                <Text style={[styles.devCardTitle, { color: textColor }]}>{area.title}</Text>
                <Text style={[styles.devCardSubtitle, { color: isPlannedToday ? area.colors.highlight : textColor }]}>{subtitleText}</Text>
              </TouchableOpacity>
            )
          })}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#F8F9FB',
    paddingBottom: 110
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FB'
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 10
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  avatarContainer: {
    marginRight: 12,
    position: 'relative'
  },
  avatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#e2e8f0',
    borderWidth: 2,
    borderColor: '#ffffff'
  },
  onlineBadge: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#4ade80',
    position: 'absolute',
    bottom: 2,
    right: 2,
    borderWidth: 2,
    borderColor: '#ffffff'
  },
  greetingBox: {
    justifyContent: 'center'
  },
  goodMorning: {
    color: '#64748b',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2
  },
  username: {
    fontWeight: '800',
    color: '#0f172a',
    fontSize: 22,
    letterSpacing: -0.5
  },
  bellIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Main Card
  mainCard: {
    backgroundColor: '#ffffff',
    borderRadius: 36,
    padding: 24,
    marginBottom: 30,
    shadowColor: '#e2e8f0',
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 3
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  milestoneLabel: {
    color: '#3b82f6',
    fontWeight: 'bold',
    fontSize: 12,
    letterSpacing: 1
  },
  monthBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16
  },
  monthBadgeText: {
    color: '#3b82f6',
    fontWeight: 'bold',
    fontSize: 13
  },
  levelTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 24,
    letterSpacing: -0.5
  },

  illustrationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24
  },
  babyActivityImage: {
    width: 130,
    height: 130,
    marginRight: 16,
  },
  nextStepBox: {
    flex: 1,
    justifyContent: 'center'
  },
  nextStepLabel: {
    color: '#64748b',
    fontSize: 15,
    marginBottom: 4,
    fontWeight: '500'
  },
  nextStepValue: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12
  },
  progressBarBg: {
    height: 10,
    backgroundColor: '#f1f5f9',
    borderRadius: 5,
    overflow: 'hidden',
    width: '100%'
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 5
  },
  continueBtn: {
    backgroundColor: '#438FFF',
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
  },
  continueBtnText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 8
  },
  emptyState: {
    backgroundColor: '#ffffff',
    padding: 30,
    borderRadius: 36,
    alignItems: 'center',
    marginBottom: 30
  },
  welcomeInfo: {
    color: '#64748b',
    marginBottom: 20,
    textAlign: 'center',
    fontSize: 16
  },

  // Development Areas Headers
  devAreasHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 16,
    paddingHorizontal: 4
  },
  devAreasTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a'
  },
  viewReportText: {
    color: '#3b82f6',
    fontWeight: 'bold',
    fontSize: 15
  },

  // 2x2 Grid specific styles
  devGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  devCard: {
    width: (width - 40 - 15) / 2, // Accounting for paddings and spacing
    borderRadius: 24,
    padding: 20,
    marginBottom: 15
  },
  devCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24
  },
  devIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center'
  },
  devPercentage: {
    fontSize: 22,
    fontWeight: '900'
  },
  devCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4
  },
  devCardSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    opacity: 0.8
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    width: '85%',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 5
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 20,
    textAlign: 'center'
  },
  babyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  babyOptionSelected: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe'
  },
  babyOptionText: {
    flex: 1,
    fontSize: 16,
    marginLeft: 12,
    color: '#475569',
    fontWeight: '500'
  },
  addBabyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginTop: 8,
    borderRadius: 16,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0'
  },
  addBabyText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#059669'
  }
});