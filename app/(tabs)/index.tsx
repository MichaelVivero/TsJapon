import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Avatar, Button, Card, Text } from 'react-native-paper';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

export default function HomeScreen() {
  const { user, loading: authLoading } = useAuth();
  const [dbLoading, setDbLoading] = useState(true);
  const [dbMessage, setDbMessage] = useState('');
  const router = useRouter();

  // 1. Proteger la ruta
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login' as any);
    }
  }, [user, authLoading]);

  // 2. Probar conexión a la DB
  const testConnection = async () => {
    setDbLoading(true);
    try {
      const { data, error } = await supabase.from('test_connection').select('*').single();
      if (error) setDbMessage('Error DB: ' + error.message);
      else setDbMessage(data.message);
    } catch (err) {
      setDbMessage('Error de red');
    } finally {
      setDbLoading(false);
    }
  };

  useEffect(() => {
    if (user) testConnection();
  }, [user]);

  if (authLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#a78bfa" />
      </View>
    );
  }

  if (!user) return null;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Card style={styles.card}>
        <Card.Title
          title="Dashboard Nido"
          subtitle={user?.email}
          left={(props) => <Avatar.Icon {...props} icon="account" />}
        />
        <Card.Content>
          <Text variant="bodyLarge" style={styles.welcome}>¡Hola de nuevo, Tutor!</Text>
          <View style={styles.statusBox}>
            <Text variant="labelLarge">Estado de Conexión:</Text>
            {dbLoading ? (
              <ActivityIndicator animating={true} style={{ marginTop: 10 }} />
            ) : (
              <Text style={styles.dbText}>{dbMessage}</Text>
            )}
          </View>
          <Button mode="contained-tonal" onPress={() => supabase.auth.signOut()} style={styles.btn}>
            Cerrar Sesión
          </Button>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#f0f2f5',
    justifyContent: 'center'
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  card: {
    borderRadius: 20,
    elevation: 5
  },
  welcome: {
    marginVertical: 15,
    fontWeight: 'bold'
  },
  statusBox: {
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0'
  },
  dbText: {
    color: '#10b981',
    marginTop: 5,
    fontWeight: '600'
  },
  btn: {
    marginTop: 20
  },
});