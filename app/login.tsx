import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet } from 'react-native';
import { Button, Card, TextInput } from 'react-native-paper';
import { supabase } from '../lib/supabase';

export default function LoginScreen() {

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    async function signInWithEmail() {
        if (!email || !password) return Alert.alert('Error', 'Completa los campos');
        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            Alert.alert('Error', error.message);
            setLoading(false);
        } else {
            router.replace('/(tabs)' as any);
        }
    }

    async function signUpWithEmail() {
        if (!email || !password) return Alert.alert('Error', 'Completa los campos');
        setLoading(true);
        // Al desactivar "Confirm Email" en Supabase, esto loguea al usuario automáticamente
        const { data, error } = await supabase.auth.signUp({ email, password });

        if (error) {
            Alert.alert('Error', error.message);
        } else if (data.session) {
            Alert.alert('Éxito', 'Cuenta creada e inicio de sesión automático.');
            router.replace('/(tabs)' as any);
        } else {
            Alert.alert('Nota', 'Usuario registrado. Intenta iniciar sesión.');
        }
        setLoading(false);
    }



    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Card style={styles.card}>
                <Card.Title title="Nido stimulation" subtitle="Acompañando su crecimiento" titleStyle={styles.title} />
                <Card.Content>
                    <TextInput
                        label="Correo Electrónico"
                        value={email}
                        onChangeText={setEmail}
                        mode="outlined"
                        style={styles.input}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        disabled={loading}
                    />
                    <TextInput
                        label="Contraseña"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        mode="outlined"
                        style={styles.input}
                        disabled={loading}
                    />
                    <Button
                        mode="contained"
                        onPress={signInWithEmail}
                        loading={loading}
                        style={styles.button}

                    >
                        Entrar
                    </Button>
                    <Button
                        mode="text"
                        onPress={signUpWithEmail}
                        disabled={loading && !email.includes('@')}
                        style={styles.mainBtn}
                    >
                        Iniciar Sesión
                    </Button>
                    <Button
                        mode="text"
                        onPress={signUpWithEmail}
                        disabled={loading}
                        style={styles.txtBtn}
                    >
                        ¿Eres nuevo? Regístrate aquí
                    </Button>
                </Card.Content>
            </Card>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 20,
        backgroundColor: '#f5f5f5'
    },
    card: {
        borderRadius: 20,
        padding: 10,
        elevation: 4
    },
    title: {
        textAlign: 'center',
        fontWeight: 'bold'
    },
    input: {
        marginBottom: 15
    },
    mainBtn: {
        marginTop: 10,
        paddingVertical: 6,
        borderRadius: 12,
    },
    txtBtn: {
        marginBottom: 4,
    },
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 20
    },
    button: {
        marginTop: 10,
        paddingVertical: 5
    },
    divider: {
        marginVertical: 20
    },
    orText: {
        textAlign: 'center',
        marginBottom: 10,
        color: '#666',
        fontSize: 12
    },
    googleBtn: {
        borderColor: '#4285F4',
        borderWidth: 1.5
    }
});
