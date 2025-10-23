import React, { useState } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Input, Button, Card, Text } from '@rneui/themed';
import { useRouter } from 'expo-router';
import api from '@/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Logo from '@/assets/images/logo.jpg';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Eposta ve parola zorunludur!');
      return;
    }

    let login;

    try {
      login = await api.post('/users/login', { email, password });
    } catch (error: any) {
      if (error?.status === 500) {
        setError('Sunucu hatası! Lütfen daha sonra tekrar deneyin.');
      }
    }

    if (login?.data?.token) {
      const user = login?.data;
      await AsyncStorage.setItem('user', JSON.stringify(user));
      router.replace('/(tabs)');
    } else {
      setError('Geçersiz eposta veya parola!');
    }
  };

  return (
    <View style={styles.container}>
      <Card containerStyle={styles.card}>
        <Image source={Logo} style={styles.logo} />

        <Text h3 style={styles.title}>
          Hoşgeldiniz
        </Text>

        <Input
          placeholder="E-posta"
          leftIcon={{ type: 'material', name: 'person' }}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
        />

        <Input
          placeholder="Parola"
          leftIcon={{ type: 'material', name: 'lock' }}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button
          title="Giriş Yap"
          onPress={handleLogin}
          containerStyle={styles.button}
        />
        <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
          <Button
            title="Hesap Oluştur"
            type="clear"
            onPress={() => router.push('/register')}
          />
          <Button
            title="Parolamı Unuttum"
            type="clear"
            onPress={() => router.push('/forgot')}
          />
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f4f4f4',
  },
  card: {
    width: '90%',
    padding: 20,
    borderRadius: 10,
  },
  logo: {
    width: 325,
    height: 180,
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    textAlign: 'center',
    marginBottom: 20,
  },
  error: {
    color: 'red',
    textAlign: 'center',
    marginBottom: 10,
  },
  button: {
    marginTop: 10,
  },
});
