import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { LoginRequest } from '@luna/shared';
import { authApi, userMessage } from '../../api';
import { Button, TextField } from '../../components';
import { fieldErrors } from '../../lib/forms';
import type { AuthStackParams } from '../../navigation/types';
import { useAuthStore } from '../../store/auth';
import { AuthForm } from './AuthForm';

export function LoginScreen({ navigation }: NativeStackScreenProps<AuthStackParams, 'Login'>) {
  const signIn = useAuthStore((s) => s.signIn);
  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const set = (key: keyof typeof values) => (text: string) =>
    setValues((v) => ({ ...v, [key]: text }));

  async function submit() {
    if (pending) return;
    const parsed = LoginRequest.safeParse(values);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setFormError(null);
    setPending(true);
    try {
      const { token, user } = await authApi.login(parsed.data);
      await signIn(token, user);
    } catch (e) {
      setFormError(userMessage(e));
      setPending(false);
    }
  }

  return (
    <AuthForm
      title="Welcome back"
      submitLabel="Log in"
      pending={pending}
      formError={formError}
      onSubmit={submit}
      footer={
        <Button
          label="Create an account"
          variant="ghost"
          onPress={() => navigation.replace('Register')}
        />
      }
    >
      <TextField
        label="Email"
        value={values.email}
        onChangeText={set('email')}
        error={errors.email}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        textContentType="emailAddress"
      />
      <TextField
        label="Password"
        value={values.password}
        onChangeText={set('password')}
        error={errors.password}
        secureTextEntry
        textContentType="password"
      />
    </AuthForm>
  );
}
