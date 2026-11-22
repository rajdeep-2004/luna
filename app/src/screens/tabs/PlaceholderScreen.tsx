import { StyleSheet, View } from 'react-native';
import { AppText, Button, EmptyState, Lantern, Screen, YokaiAvatar } from '../../components';
import { useAuthStore } from '../../store/auth';
import { spacing } from '../../theme';

type Props = { title: string; message: string };

/** Stand-in for tabs built in later phases. Shows who is signed in, so P2 auth can be verified by eye. */
export function PlaceholderScreen({ title, message }: Props) {
  const user = useAuthStore((s) => s.user);
  return (
    <Screen>
      <View style={styles.header}>
        {user ? <YokaiAvatar id={user.avatarId} size={40} /> : null}
        <AppText color="textSoft" style={styles.name}>
          {user?.username}
        </AppText>
        <Lantern streak={user?.currentStreak ?? 0} />
      </View>
      <View style={styles.center}>
        <EmptyState title={title} message={message} />
      </View>
    </Screen>
  );
}

/** Profile tab placeholder: includes Log out, the one real action until P5. */
export function ProfilePlaceholder() {
  const signOut = useAuthStore((s) => s.signOut);
  return (
    <Screen>
      <View style={styles.center}>
        <EmptyState
          title="Profile"
          message="Rank, stats and achievements arrive in a later phase."
        />
      </View>
      <View style={styles.logout}>
        <Button label="Log out" variant="ghost" onPress={() => void signOut()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  name: { flex: 1 },
  center: { flex: 1, justifyContent: 'center' },
  logout: { paddingBottom: spacing.lg },
});
