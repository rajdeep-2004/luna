import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { RegisterRequest } from '@luna/shared';
import { authApi, userMessage } from '../../api';
import { Button, TextField } from '../../components';
import { fieldErrors } from '../../lib/forms';
import type { AuthStackParams } from '../../navigation/types';
import { useAuthStore } from '../../store/auth';
import { AuthForm } from './AuthForm';

export function RegisterScreen({
  navigation,
}: NativeStackScreenProps<AuthStackParams, 'Register'>) {
  const signIn = useAuthStore((s) => s.signIn);
  const [values, setValues] = useState({ username: '', email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const set = (key: keyof typeof values) => (text: string) =>
    setValues((v) => ({ ...v, [key]: text }));

  async function submit() {
    if (pending) return;
    const parsed = RegisterRequest.safeParse(values);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setFormError(null);
    setPending(true);
    try {
      const { token, user } = await authApi.register(parsed.data);
      await signIn(token, user);
    } catch (e) {
      setFormError(userMessage(e));
      setPending(false);
    }
  }

  return (
    <AuthForm
      title="Create your account"
      submitLabel="Create account"
      pending={pending}
      formError={formError}
      onSubmit={submit}
      footer={
        <Button
          label="I already have an account"
          variant="ghost"
          onPress={() => navigation.replace('Login')}
        />
      }
    >
      <TextField
        label="Username"
        value={values.username}
        onChangeText={set('username')}
        error={errors.username}
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="username"
      />
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
        textContentType="newPassword"
      />
    </AuthForm>
  );
}
