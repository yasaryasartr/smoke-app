import React, { useState } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Input, Button, Card, Text } from '@rneui/themed';
import { useRouter } from 'expo-router';
import api from '@/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ForgotScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [password, setPassword] = useState('');
  const [passwordRepeat, setPasswordRepeat] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState('');

  const handleContinue = async () => {
    setError('');

    console.log('handleContinue');

    if (!email) {
      setError('Eposta zorunludur!');
      return;
    }

    if (step == 'verification') {
      if (!verificationCode) {
        setError('Doğrulama kodu zorunludur!');
        return;
      }
    }

    if (step == 'reset_password') {
      if (!password) {
        setError('Yeni Parola zorunludur!');
        return;
      }

      if (!passwordRepeat) {
        setError('Parola tekrarı zorunludur!');
        return;
      }

      const passwordValid =
        password.length >= 8 && // en az 8 karakter
        /[a-z]/.test(password) && // küçük harf
        /[A-Z]/.test(password) && // büyük harf
        /[^a-zA-Z0-9]/.test(password); //sembol

      if (!passwordValid) {
        setError(
          'Parola en az 8 karakter, küçük büyük harf ve sembol olmalıdır!'
        );
        return;
      }

      if (password !== passwordRepeat) {
        setError('Parola ve tekrar parola uyuşmuyor!');
        return;
      }
    }

    let forgot;

    try {
      forgot = await api.post('/users/forgot', {
        step,
        email,
        verificationCode,
        password,
        passwordRepeat,
      });

      console.log('forgot :>> ', forgot);

      if (forgot.status == 200) {
        if (step == '' && forgot.data?.message == 'mail sended') {
          setStep('verification');
        } else if (
          step == 'verification' &&
          forgot.data?.message == 'verified'
        ) {
          setStep('reset_password');
        } else if (
          step == 'reset_password' &&
          forgot.data?.message == 'password reset'
        ) {
          setStep('reset_success');
        } else {
          setError('İşleminiz Yapılamadı');
        }
      }
    } catch (error: any) {
      if (error?.status === 404) {
        setError('Kayıtlı E-posta Bulunamadı');
      } else if (error?.status === 500) {
        setError('Sunucu hatası! Lütfen daha sonra tekrar deneyin.');
      } else if (error?.response?.data?.error == 'verificationCode wrong') {
        setError('Doğrulama Kodu hatalı');
      } else {
        setError('İşleminiz Yapılamadı');
      }
    }

    // if (login?.data?.token) {
    //   const user = login?.data;
    //   await AsyncStorage.setItem("user", JSON.stringify(user));
    //   router.replace("/(tabs)");
    // } else {
    //   setError("Geçersiz kullanıcı adı veya şifre!");
    // }
  };

  return (
    <View style={styles.container}>
      <Card containerStyle={styles.card}>
        <Text h3 style={styles.title}>
          Parolamı Unuttum
        </Text>

        {step == '' && (
          <Input
            placeholder="E-posta"
            leftIcon={{ type: 'material', name: 'person' }}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
          />
        )}

        {step == 'verification' && (
          <>
            <Text>Lütfen mail adresinize gönderilen kodu yazınız</Text>
            <Input
              placeholder="Doğrulama Kodu"
              leftIcon={{ type: 'material', name: 'key' }}
              value={verificationCode}
              onChangeText={setVerificationCode}
            />
          </>
        )}

        {step == 'reset_password' && (
          <>
            <Text style={{ textAlign: 'center' }}>Yeni Parolanızı yazınız</Text>
            <Text style={{ textAlign: 'center' }}>
              (küçük-büyük harf sembol ve min.8 karakter)
            </Text>
            <Input
              placeholder="Parola"
              leftIcon={{ type: 'material', name: 'lock' }}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            <Input
              placeholder="Parola Tekrarı"
              leftIcon={{ type: 'material', name: 'lock' }}
              secureTextEntry
              value={passwordRepeat}
              onChangeText={setPasswordRepeat}
            />
          </>
        )}

        {step == 'reset_success' && (
          <>
            <Text
              style={{
                marginBottom: 20,
                fontSize: 20,
                color: '#059b50',
                textAlign: 'center',
              }}
            >
              ✅ Parolanız Sıfırlandı
            </Text>
            <Button
              title="Yeni Parola ile Giriş Yap"
              onPress={() => router.push('/login')}
              containerStyle={styles.button}
            />
          </>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {step != 'reset_success' && (
          <>
            <Button
              title="Devam"
              onPress={handleContinue}
              containerStyle={styles.button}
            />
            <Button
              title="Zaten hesabım var, giriş yap"
              type="clear"
              onPress={() => router.push('/login')}
            />
          </>
        )}
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
